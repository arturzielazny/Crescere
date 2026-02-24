<script>
  import { onDestroy, onMount } from 'svelte';
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
  import { activeChild } from '../stores/childStore.js';
  import { calculateAgeInDays } from '../lib/zscore.js';
  import { isFutureDate, hexToRgba, findClosestToNowIndex } from '../lib/utils.js';
  import { WHO_WEIGHT } from '../data/who-weight.js';
  import { WHO_LENGTH } from '../data/who-length.js';
  import { WHO_HEADC } from '../data/who-headc.js';
  import { t } from '../stores/i18n.js';

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

  export let metric = 'weight'; // weight | length | headCirc
  export let title = '';
  export let unit = '';
  export let maxAge = null;

  let canvas;
  let chart;

  const metricConfig = {
    weight: {
      dataKey: 'weight',
      dataset: WHO_WEIGHT,
      color: '#2563eb',
      unit: 'g'
    },
    length: {
      dataKey: 'length',
      dataset: WHO_LENGTH,
      color: '#16a34a',
      unit: 'cm'
    },
    headCirc: {
      dataKey: 'headCirc',
      dataset: WHO_HEADC,
      color: '#ea580c',
      unit: 'cm'
    }
  };

  function valueAtZ(l, m, s, z) {
    if (Math.abs(l) < 0.001) {
      return m * Math.exp(s * z);
    }
    return m * Math.pow(1 + l * s * z, 1 / l);
  }

  function getReferenceForAge(dataset, sex, ageInDays) {
    if (!sex || ageInDays === null || ageInDays === undefined) return null;
    const age = Math.round(ageInDays);
    const sexKey = String(sex);
    return dataset?.[sexKey]?.[age] || null;
  }

  // Returns clean data: measurements as {date, value} pairs, band as reference points.
  function getChartData() {
    const child = $activeChild;
    if (!child?.profile?.birthDate || !child?.profile?.sex) {
      return { measurements: [], band: [] };
    }

    const config = metricConfig[metric];
    const measurements = child.measurements
      .map((m) => ({ date: m.date, value: m[config.dataKey] }))
      .filter((m) => m.value !== null && m.value !== undefined && !isNaN(m.value))
      .sort((a, b) => a.date.localeCompare(b.date));

    const maxMeasurementAge =
      measurements.length > 0
        ? calculateAgeInDays(child.profile.birthDate, measurements.at(-1).date)
        : 0;
    const maxBandAge =
      maxAge && maxAge > 0 ? Math.ceil(maxAge * 1.1) : Math.max(0, maxMeasurementAge);
    const maxReferenceAge = (config.dataset?.[String(child.profile.sex)]?.length || 1) - 1;
    const bandEndAge = Math.min(maxBandAge, maxReferenceAge);
    const scale = metric === 'weight' ? 1000 : 1;
    const band = [];

    for (let age = 0; age <= bandEndAge; age += 1) {
      const ref = getReferenceForAge(config.dataset, child.profile.sex, age);
      if (!ref) continue;
      const [l, m_, s] = ref;
      band.push({
        x: age,
        sd1Low: valueAtZ(l, m_, s, -1) * scale,
        sd1High: valueAtZ(l, m_, s, 1) * scale,
        sd2Low: valueAtZ(l, m_, s, -2) * scale,
        sd2High: valueAtZ(l, m_, s, 2) * scale
      });
    }

    return { measurements, band };
  }

  function getYRange(measurements, band) {
    const birthDate = $activeChild?.profile?.birthDate;
    const measurementAges = measurements.map((m) => calculateAgeInDays(birthDate, m.date));
    const minAge = Math.min(...measurementAges, 0);
    const maxMeasAge = Math.max(...measurementAges, 0);

    const ageBuffer = Math.max(30, (maxMeasAge - minAge) * 0.1);
    const bandForRange = band.filter(
      (point) => point.x >= Math.max(0, minAge - ageBuffer) && point.x <= maxMeasAge + ageBuffer
    );

    const bandValues = bandForRange
      .flatMap((point) => [point.sd2Low, point.sd2High])
      .filter((v) => v !== undefined && v !== null && !isNaN(v));

    const measurementValues = measurements
      .map((m) => m.value)
      .filter((v) => v !== undefined && v !== null && !isNaN(v));

    const values = [...bandValues, ...measurementValues];
    if (values.length === 0) return { min: 0, max: 1 };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || 1;
    return { min: Math.max(0, min - padding), max: max + padding };
  }

  function getStepSize(unitLabel, range) {
    const span = range.max - range.min;
    const target = span / 6;
    const candidates =
      unitLabel === 'g' ? [50, 100, 200, 500, 1000, 2000, 5000] : [0.5, 1, 2, 5, 10];

    let stepSize = candidates.find((step) => step >= target) || candidates.at(-1);

    if (range.min > 0 && stepSize > range.min) {
      const smaller = candidates.filter((s) => s <= range.min);
      if (smaller.length > 0) {
        stepSize = smaller.at(-1);
      }
    }

    return stepSize;
  }

  // Builds Chart.js datasets. Computes x from date; derives display from data via callbacks.
  function buildDatasets(data) {
    const birthDate = $activeChild?.profile?.birthDate;
    const config = metricConfig[metric];

    const measurementData = data.measurements.map((m) => ({
      x: calculateAgeInDays(birthDate, m.date),
      y: m.value,
      date: m.date
    }));

    const bandColor = hexToRgba(config.color, 0.12);

    return [
      {
        label: '_sd2_lower',
        data: data.band.map((point) => ({ x: point.x, y: point.sd2Low })),
        borderWidth: 0,
        pointRadius: 0
      },
      {
        label: $t('chart.band.sd2'),
        data: data.band.map((point) => ({ x: point.x, y: point.sd2High })),
        borderWidth: 0,
        pointRadius: 0,
        fill: '-1',
        backgroundColor: hexToRgba(config.color, 0.08)
      },
      {
        label: '_sd1_lower',
        data: data.band.map((point) => ({ x: point.x, y: point.sd1Low })),
        borderWidth: 0,
        pointRadius: 0
      },
      {
        label: $t('chart.band.sd1'),
        data: data.band.map((point) => ({ x: point.x, y: point.sd1High })),
        borderWidth: 0,
        pointRadius: 0,
        fill: '-1',
        backgroundColor: bandColor
      },
      {
        label: title || $t('chart.measurement.label'),
        data: measurementData,
        borderColor: config.color,
        backgroundColor: config.color,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 4,
        pointStyle: (ctx) => (isFutureDate(ctx.raw?.date) ? 'triangle' : 'circle'),
        pointBackgroundColor: (ctx) =>
          isFutureDate(ctx.raw?.date) ? hexToRgba(config.color, 0.45) : config.color,
        pointBorderColor: (ctx) =>
          isFutureDate(ctx.raw?.date) ? hexToRgba(config.color, 0.45) : config.color,
        tension: 0.1
      }
    ];
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

  function getChartOptions(range) {
    const unitLabel = unit || metricConfig[metric].unit;
    const stepSize = getStepSize(unitLabel, range);
    const nowAge = getCurrentAgeInDays();
    const datasets = chart?.data?.datasets;
    const measurementDatasetIndex = datasets ? datasets.length - 1 : 4;
    const measurementData = datasets?.[measurementDatasetIndex]?.data || [];
    const closestIndex = findClosestToNowIndex(measurementData, nowAge);
    const min = Math.round(range.min / stepSize) * stepSize;
    const max = Math.ceil(range.max / stepSize) * stepSize;
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
            const isLastDataset = item.datasetIndex === item.chart.data.datasets.length - 1;
            if (!isLastDataset) return false;
            const value = item.parsed?.y;
            return value !== null && value !== undefined && !isNaN(value);
          },
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const age = items[0].parsed.x;
              const date = items[0].raw?.date;
              const ageLine = `${$t('chart.axis.age')}: ${Math.round(age)}`;
              return date ? [date, ageLine] : ageLine;
            },
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              const decimals = unitLabel === 'g' ? 0 : stepSize < 1 ? 1 : 0;
              return `${label}: ${value.toFixed(decimals)} ${unitLabel}`;
            }
          }
        },
        annotation: {
          annotations: getNowAnnotation()
        },
        datalabels: {
          display: (ctx) => {
            return ctx.datasetIndex === measurementDatasetIndex && ctx.dataIndex === closestIndex;
          },
          anchor: 'end',
          align: 'top',
          offset: 4,
          font: { size: 11, weight: 'bold' },
          color: metricConfig[metric].color,
          formatter: (value) => {
            const v = value?.y;
            if (v == null) return '';
            const decimals = unitLabel === 'g' ? 0 : 1;
            return `${Number(v).toFixed(decimals)} ${unitLabel}`;
          }
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
            text: unitLabel
          },
          min,
          max,
          ticks: {
            stepSize,
            callback: (value) => {
              const decimals = unitLabel === 'g' ? 0 : stepSize < 1 ? 1 : 0;
              return Number(value).toFixed(decimals);
            }
          }
        }
      }
    };
  }

  function createChart() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const data = getChartData();
    const range = getYRange(data.measurements, data.band);

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: buildDatasets(data)
      },
      options: getChartOptions(range)
    });
  }

  function updateChart() {
    if (!chart) return;
    const data = getChartData();
    const range = getYRange(data.measurements, data.band);
    chart.data.datasets = buildDatasets(data);
    chart.options = getChartOptions(range);
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

  $: if (chart) {
    $activeChild;
    $t;
    updateChart();
  }
</script>

<div class="p-4">
  <h2 class="text-lg font-semibold text-gray-800 mb-4">{title}</h2>

  <div class="h-80" role="img" aria-label={title}>
    <canvas bind:this={canvas}></canvas>
  </div>
</div>
