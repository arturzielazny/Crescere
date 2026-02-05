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
  import { activeChild } from '../stores/childStore.js';
  import { calculateAgeInDays } from '../lib/zscore.js';
  import { computeVelocity, isFutureDate, hexToRgba } from '../lib/utils.js';
  import { t } from '../stores/i18n.js';

  Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    Legend,
    Tooltip,
    annotationPlugin
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

  function getChartData() {
    const child = $activeChild;
    if (!child?.profile?.birthDate || !child?.profile?.sex) {
      return [];
    }

    const config = metricConfig[metric];
    const velocityData = computeVelocity(
      child.measurements,
      config.dataKey,
      child.profile.birthDate
    );

    return velocityData.map((point) => {
      const midDate = getMidpointDate(child.profile.birthDate, point.fromAge, point.toAge);
      const future = isFutureDate(midDate);
      return {
        ...point,
        pointStyle: future ? 'triangle' : 'circle',
        pointColor: future ? hexToRgba(config.color, 0.45) : config.color
      };
    });
  }

  function getMidpointDate(birthDate, fromAge, toAge) {
    const midAge = (fromAge + toAge) / 2;
    const birthMs = Date.parse(birthDate);
    const midMs = birthMs + Math.round(midAge) * 86400000;
    return new Date(midMs).toISOString().slice(0, 10);
  }

  function getYRange(data) {
    if (data.length === 0) return { min: 0, max: 1 };
    const values = data.map((d) => d.y);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.15 || 0.5;
    return { min: min - padding, max: max + padding };
  }

  function buildDatasets(data) {
    const config = metricConfig[metric];
    return [
      {
        label: title || $t('chart.measurement.label'),
        data: data.map((point) => ({
          x: point.x,
          y: point.y,
          pointStyle: point.pointStyle,
          pointColor: point.pointColor,
          fromAge: point.fromAge,
          toAge: point.toAge,
          fromValue: point.fromValue,
          toValue: point.toValue
        })),
        borderColor: config.color,
        backgroundColor: config.color,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointStyle: (ctx) => ctx.raw?.pointStyle ?? 'circle',
        pointBackgroundColor: (ctx) => ctx.raw?.pointColor ?? config.color,
        pointBorderColor: (ctx) => ctx.raw?.pointColor ?? config.color,
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
              return `${$t('chart.axis.age')}: ${Math.round(raw.fromAge)}–${Math.round(raw.toAge)}`;
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
    const data = getChartData();
    const range = getYRange(data);

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
    const range = getYRange(data);
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
