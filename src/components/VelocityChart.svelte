<script>
  import { onDestroy, onMount } from 'svelte';
  import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    Legend,
    Tooltip
  } from 'chart.js';
  import annotationPlugin from 'chartjs-plugin-annotation';
  import ChartDataLabels from 'chartjs-plugin-datalabels';
  import { activeChild } from '../stores/childStore.js';
  import { calculateAgeInDays } from '../lib/zscore.js';
  import { computeVelocity, isFutureDate, hexToRgba, findClosestToNowIndex } from '../lib/utils.js';
  import { t } from '../stores/i18n.js';

  Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    Legend,
    Tooltip,
    annotationPlugin,
    ChartDataLabels
  );

  export let metric = 'weight'; // weight | length
  export let title = '';
  export let maxAge = null;

  let canvas;
  let chart;

  const metricConfig = {
    weight: {
      dataKey: 'weight',
      color: '#2563eb',
      unit: 'g/day'
    },
    length: {
      dataKey: 'length',
      color: '#16a34a',
      unit: 'cm/day'
    }
  };

  // Returns clean data: {fromDate, toDate, fromValue, toValue} pairs.
  function getChartData() {
    const child = $activeChild;
    if (!child?.profile?.birthDate || !child?.profile?.sex) return [];
    return computeVelocity(child.measurements, metricConfig[metric].dataKey);
  }

  function getYRange(data) {
    if (data.length === 0) return { min: 0, max: 1 };
    const afterFirstWeek = data.filter((d) => d.x >= 7);
    const rangeData = afterFirstWeek.length > 0 ? afterFirstWeek : data;
    const values = rangeData.map((d) => d.y);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.15 || 0.5;
    return { min: min - padding, max: max + padding };
  }

  // Builds Chart.js datasets. Computes x/y from dates/values; derives display via callbacks.
  function buildDatasets(data) {
    const birthDate = $activeChild?.profile?.birthDate;
    const config = metricConfig[metric];

    const measurementData = data
      .map((point) => {
        const fromAge = calculateAgeInDays(birthDate, point.fromDate);
        const toAge = calculateAgeInDays(birthDate, point.toDate);
        const daysDiff = toAge - fromAge;
        if (daysDiff <= 0) return null;
        return {
          x: (fromAge + toAge) / 2,
          y: (point.toValue - point.fromValue) / daysDiff,
          fromDate: point.fromDate,
          toDate: point.toDate,
          fromValue: point.fromValue,
          toValue: point.toValue,
          fromAge,
          toAge
        };
      })
      .filter(Boolean);

    return [
      {
        label: title || $t('chart.measurement.label'),
        data: measurementData,
        borderColor: config.color,
        backgroundColor: config.color,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointStyle: (ctx) => (isFutureDate(ctx.raw?.toDate) ? 'triangle' : 'circle'),
        pointBackgroundColor: (ctx) =>
          isFutureDate(ctx.raw?.toDate) ? hexToRgba(config.color, 0.45) : config.color,
        pointBorderColor: (ctx) =>
          isFutureDate(ctx.raw?.toDate) ? hexToRgba(config.color, 0.45) : config.color,
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
    const config = metricConfig[metric];
    const unitLabel = config.unit;
    const isWeight = metric === 'weight';
    const decimals = isWeight ? 1 : 2;
    const nowAge = getCurrentAgeInDays();
    const measurementData = chart?.data?.datasets?.[0]?.data || [];
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
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const raw = items[0].raw;
              const ageLine = `${$t('chart.axis.age')}: ${Math.round(raw.fromAge)}–${Math.round(raw.toAge)}`;
              return raw.fromDate && raw.toDate
                ? [`${raw.fromDate} – ${raw.toDate}`, ageLine]
                : ageLine;
            },
            label: (context) => {
              const raw = context.raw;
              const rate = raw.y.toFixed(decimals);
              const diff = raw.toValue - raw.fromValue;
              if (isWeight) {
                const sign = diff >= 0 ? '+' : '';
                return `${rate} ${unitLabel} (${sign}${Math.round(diff)} g)`;
              }
              const sign = diff >= 0 ? '+' : '';
              return `${rate} ${unitLabel} (${sign}${diff.toFixed(1)} cm)`;
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
          color: config.color,
          formatter: (value) => {
            const v = value?.y;
            if (v == null) return '';
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
          min: range.min,
          max: range.max,
          ticks: {
            callback: (value) => Number(value).toFixed(decimals)
          }
        }
      }
    };
  }

  function createChart() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const datasets = buildDatasets(getChartData());

    chart = new Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: getChartOptions(getYRange(datasets[0]?.data ?? []))
    });
  }

  function updateChart() {
    if (!chart) return;
    const datasets = buildDatasets(getChartData());
    chart.data.datasets = datasets;
    chart.options = getChartOptions(getYRange(datasets[0]?.data ?? []));
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
