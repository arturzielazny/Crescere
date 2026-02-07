<script>
  import { onMount, onDestroy } from 'svelte';
  import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    Filler,
    Legend,
    Tooltip
  } from 'chart.js';
  import annotationPlugin from 'chartjs-plugin-annotation';
  import ChartDataLabels from 'chartjs-plugin-datalabels';
  import { measurementsWithZScores, activeChild } from '../stores/childStore.js';
  import { calculateAgeInDays, zToPercentile } from '../lib/zscore.js';
  import {
    isFutureDate,
    hexToRgba,
    formatPercentile,
    findClosestToNowIndex
  } from '../lib/utils.js';
  import { t, language } from '../stores/i18n.js';

  Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    Filler,
    Legend,
    Tooltip,
    annotationPlugin,
    ChartDataLabels
  );

  export let metric = 'waz';
  export let title = null;
  export let maxAge = null;

  let canvas;
  let chart;

  const colors = {
    waz: { border: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
    lhaz: { border: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' },
    headcz: { border: '#ea580c', bg: 'rgba(234, 88, 12, 0.1)' },
    wflz: { border: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' }
  };

  $: labels = {
    waz: $t('chart.waz.percentile'),
    lhaz: $t('chart.lhaz.percentile'),
    headcz: $t('chart.headcz.percentile'),
    wflz: $t('chart.wflz.percentile')
  };

  $: resolvedTitle = title || $t('chart.title');

  const MAX_Z = 5;
  const DISPLAY_RANGE = 3;

  // Percentile equivalents of SD bands
  const BAND_SD1_LOW = zToPercentile(-1); // ~15.87
  const BAND_SD1_HIGH = zToPercentile(1); // ~84.13
  const BAND_SD2_LOW = zToPercentile(-2); // ~2.28
  const BAND_SD2_HIGH = zToPercentile(2); // ~97.72

  function getPointRadius(z) {
    if (z === null || z === undefined || isNaN(z)) return 0;
    const abs = Math.min(Math.abs(z), MAX_Z);
    if (abs <= DISPLAY_RANGE) return 3.5;
    return 3.5 + Math.round((abs - DISPLAY_RANGE) * 1.4);
  }

  function getDatasets(measurements) {
    const m = metric;
    const measurementData = measurements
      .filter((d) => d.zscores?.[m] !== null && d.zscores?.[m] !== undefined)
      .map((d) => {
        const rawZ = d.zscores[m];
        const percentile = zToPercentile(rawZ);
        const future = isFutureDate(d.date);
        const pointColor = future ? hexToRgba(colors[m].border, 0.45) : colors[m].border;
        return {
          x: d.ageInDays,
          y: percentile,
          rawZ,
          date: d.date,
          pointRadius: getPointRadius(rawZ),
          pointStyle: future ? 'triangle' : 'circle',
          pointColor
        };
      });

    const datasets = [
      {
        label: labels[m],
        data: measurementData,
        borderColor: colors[m].border,
        backgroundColor: colors[m].bg,
        borderWidth: 2,
        pointRadius: (ctx) => ctx.raw?.pointRadius ?? 3.5,
        pointHoverRadius: (ctx) => (ctx.raw?.pointRadius ?? 3.5) + 1.5,
        pointStyle: (ctx) => ctx.raw?.pointStyle ?? 'circle',
        pointBackgroundColor: (ctx) => ctx.raw?.pointColor ?? colors[m].border,
        pointBorderColor: (ctx) => ctx.raw?.pointColor ?? colors[m].border,
        tension: 0.1,
        fill: false
      }
    ];

    // Add reference bands at percentile equivalents
    if (measurements.length > 0) {
      const measMaxAge = Math.max(...measurements.map((d) => d.ageInDays || 0), 100);
      const xEnd = maxAge ? Math.ceil(maxAge * 1.1) : measMaxAge;
      const refPoints = [0, xEnd];
      const bandColor = hexToRgba(colors[m].border, 0.12);
      const bandColorWide = hexToRgba(colors[m].border, 0.08);

      datasets.push(
        {
          label: '_sd2_lower',
          data: refPoints.map((x) => ({ x, y: BAND_SD2_LOW })),
          borderWidth: 0,
          pointRadius: 0
        },
        {
          label: $t('chart.band.sd2'),
          data: refPoints.map((x) => ({ x, y: BAND_SD2_HIGH })),
          borderWidth: 0,
          pointRadius: 0,
          fill: '-1',
          backgroundColor: bandColorWide
        },
        {
          label: '_sd1_lower',
          data: refPoints.map((x) => ({ x, y: BAND_SD1_LOW })),
          borderWidth: 0,
          pointRadius: 0
        },
        {
          label: $t('chart.band.sd1'),
          data: refPoints.map((x) => ({ x, y: BAND_SD1_HIGH })),
          borderWidth: 0,
          pointRadius: 0,
          fill: '-1',
          backgroundColor: bandColor
        }
      );
    }

    return datasets;
  }

  function getCurrentAgeInDays() {
    const child = $activeChild;
    if (!child?.profile?.birthDate) return null;
    const today = new Date().toISOString().slice(0, 10);
    return calculateAgeInDays(child.profile.birthDate, today);
  }

  function getNowAnnotation() {
    const nowAge = getCurrentAgeInDays();
    if (nowAge === null || nowAge < 0) return {};
    return {
      nowLine: {
        type: 'line',
        xMin: nowAge,
        xMax: nowAge,
        borderColor: 'rgba(107, 114, 128, 0.6)',
        borderWidth: 2,
        borderDash: [5, 5],
        label: {
          display: true,
          content: $t('chart.now'),
          position: 'start',
          backgroundColor: 'rgba(107, 114, 128, 0.8)',
          color: 'white',
          font: { size: 11 }
        }
      }
    };
  }

  function getChartOptions() {
    const nowAge = getCurrentAgeInDays();
    const datasets = chart?.data?.datasets;
    const measurementData = datasets?.[0]?.data || [];
    const closestIndex = findClosestToNowIndex(measurementData, nowAge);

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: true
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            filter: (item) => !item.text?.startsWith('_')
          }
        },
        tooltip: {
          filter: (item) => {
            if (item.dataset.label?.startsWith('_')) return false;
            const rawZ = item.raw?.rawZ;
            return rawZ !== null && rawZ !== undefined && !isNaN(rawZ);
          },
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const age = items[0].parsed.x;
              return `${$t('chart.axis.age')}: ${Math.round(age)}`;
            },
            label: (context) => {
              const label = context.dataset.label || '';
              const rawZ = context.raw?.rawZ;
              const percentileStr = formatPercentile(rawZ, $language);
              return `${label}: ${percentileStr} (z: ${rawZ.toFixed(2)})`;
            }
          }
        },
        annotation: {
          annotations: getNowAnnotation()
        },
        datalabels: {
          display: (ctx) => {
            return ctx.datasetIndex === 0 && ctx.dataIndex === closestIndex;
          },
          anchor: 'end',
          align: 'top',
          offset: 4,
          font: { size: 11, weight: 'bold' },
          color: colors[metric].border,
          formatter: (value) => formatPercentile(value.rawZ, $language)
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: $t('chart.axis.age')
          },
          min: 0,
          max: maxAge ? Math.ceil(maxAge * 1.1) : undefined
        },
        y: {
          title: {
            display: true,
            text: $t('chart.axis.percentile')
          },
          min: 0,
          max: 100,
          ticks: {
            stepSize: 10
          }
        }
      }
    };
  }

  function createChart() {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: getDatasets($measurementsWithZScores)
      },
      options: getChartOptions()
    });
  }

  function updateChart() {
    if (!chart) return;
    chart.data.datasets = getDatasets($measurementsWithZScores);
    chart.options = getChartOptions();
    chart.update();
  }

  onMount(() => {
    createChart();
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });

  // Reactive update when measurements or language change
  $: if (chart && $measurementsWithZScores) {
    $t;
    updateChart();
  }
</script>

<div class="p-4">
  <h2 class="text-lg font-semibold text-gray-800 mb-4">{resolvedTitle}</h2>

  <div class="h-80" role="img" aria-label={resolvedTitle}>
    <canvas bind:this={canvas}></canvas>
  </div>
</div>
