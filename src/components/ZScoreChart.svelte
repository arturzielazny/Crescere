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
  import { measurementsWithZScores, activeChild } from '../stores/childStore.js';
  import { calculateAgeInDays } from '../lib/zscore.js';
  import { isFutureDate, hexToRgba } from '../lib/utils.js';
  import { t } from '../stores/i18n.js';

  Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    Filler,
    Legend,
    Tooltip,
    annotationPlugin
  );

  export let metric = 'all'; // 'waz', 'lhaz', 'headcz', 'wflz', or 'all'
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
    waz: $t('chart.waz'),
    lhaz: $t('chart.lhaz'),
    headcz: $t('chart.headcz'),
    wflz: $t('chart.wflz')
  };

  $: referenceLabels = {
    median: $t('chart.reference.median'),
    sd2plus: $t('chart.reference.sd2plus'),
    sd2minus: $t('chart.reference.sd2minus')
  };

  $: resolvedTitle = title || $t('chart.title');

  const MAX_Z = 5;
  const DISPLAY_RANGE = 3;

  function clampZScore(z) {
    if (z === null || z === undefined || isNaN(z)) return z;
    return Math.max(-MAX_Z, Math.min(MAX_Z, z));
  }

  function getPointRadius(z) {
    if (z === null || z === undefined || isNaN(z)) return 0;
    const abs = Math.min(Math.abs(z), MAX_Z);
    if (abs <= DISPLAY_RANGE) return 3.5;
    return 3.5 + Math.round((abs - DISPLAY_RANGE) * 1.4);
  }

  function getMaxAbsZScore(measurements) {
    let maxAbs = 0;
    for (const measurement of measurements) {
      if (!measurement?.zscores) continue;
      for (const value of Object.values(measurement.zscores)) {
        if (value === null || value === undefined || isNaN(value)) continue;
        maxAbs = Math.max(maxAbs, Math.min(MAX_Z, Math.abs(value)));
      }
    }
    return maxAbs;
  }

  function getDatasets(measurements) {
    const metrics = metric === 'all'
      ? ['waz', 'lhaz', 'headcz', 'wflz']
      : [metric];

    const datasets = metrics.map(m => ({
      label: labels[m],
      data: measurements
        .filter(d => d.zscores?.[m] !== null && d.zscores?.[m] !== undefined)
        .map(d => {
          const rawValue = d.zscores[m];
          const future = isFutureDate(d.date);
          const pointColor = future
            ? hexToRgba(colors[m].border, 0.45)
            : colors[m].border;
          return {
            x: d.ageInDays,
            y: clampZScore(rawValue),
            rawValue,
            pointRadius: getPointRadius(rawValue),
            pointStyle: future ? 'triangle' : 'circle',
            pointColor
          };
        }),
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
    }));

    // Add reference lines
    if (metric !== 'all' && measurements.length > 0) {
      const maxAge = Math.max(...measurements.map(m => m.ageInDays || 0), 100);
      const refPoints = [0, maxAge];
      const bandColor = hexToRgba(colors[metric].border, 0.12);
      const bandColorWide = hexToRgba(colors[metric].border, 0.08);

      datasets.push(
        {
          label: '_sd2_lower',
          data: refPoints.map(x => ({ x, y: -2 })),
          borderWidth: 0,
          pointRadius: 0
        },
        {
          label: $t('chart.band.sd2'),
          data: refPoints.map(x => ({ x, y: 2 })),
          borderWidth: 0,
          pointRadius: 0,
          fill: '-1',
          backgroundColor: bandColorWide
        },
        {
          label: '_sd1_lower',
          data: refPoints.map(x => ({ x, y: -1 })),
          borderWidth: 0,
          pointRadius: 0
        },
        {
          label: $t('chart.band.sd1'),
          data: refPoints.map(x => ({ x, y: 1 })),
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

  function getChartOptions(maxAbs = DISPLAY_RANGE) {
    const range = Math.min(MAX_Z, Math.max(DISPLAY_RANGE, Math.ceil(maxAbs)));
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            filter: (item) => !item.text?.startsWith('_')
          }
        },
        tooltip: {
          callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const rawValue = context.raw?.rawValue;
                if (rawValue === null || rawValue === undefined || isNaN(rawValue)) {
                  return `${label}: —`;
                }
                const capped = Math.max(-MAX_Z, Math.min(MAX_Z, rawValue));
                const suffix = Math.abs(rawValue) > DISPLAY_RANGE
                  ? ` (${$t('chart.tooltip.capped')})`
                  : '';
                return `${label}: ${capped.toFixed(2)}${suffix}`;
              }
            }
          },
        annotation: {
          annotations: getNowAnnotation()
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
            text: $t('chart.axis.zscore')
          },
          min: -range,
          max: range,
          ticks: {
            stepSize: 1
          }
        }
      }
    };
  }

  function createChart() {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const maxAbs = getMaxAbsZScore($measurementsWithZScores);

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: getDatasets($measurementsWithZScores)
      },
      options: getChartOptions(maxAbs)
    });
  }

  function updateChart() {
    if (!chart) return;
    chart.data.datasets = getDatasets($measurementsWithZScores);
    chart.options = getChartOptions(getMaxAbsZScore($measurementsWithZScores));
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

  // Reactive update when measurements change
  $: if (chart && $measurementsWithZScores && $t) {
    updateChart();
  }
</script>

<div class="bg-white rounded-lg shadow p-6 mb-6">
  <h2 class="text-lg font-semibold text-gray-800 mb-4">{resolvedTitle}</h2>

  <div class="h-80" role="img" aria-label={resolvedTitle}>
    <canvas bind:this={canvas}></canvas>
  </div>
</div>
