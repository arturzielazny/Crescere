import { writable, get } from 'svelte/store';

const STORAGE_KEY = 'crescere-charts';

/** Map each chart ID to its group */
const chartGroupMap = {
  weight: 'weight',
  waz: 'weight',
  weightVelocity: 'weight',
  length: 'length',
  lhaz: 'length',
  lengthVelocity: 'length',
  headCirc: 'headCirc',
  headcz: 'headCirc',
  wflz: 'wfl'
};

const defaultChartOrder = [
  {
    groupId: 'weight',
    charts: [
      { id: 'weight', type: 'growth' },
      { id: 'waz', type: 'percentile' },
      { id: 'weightVelocity', type: 'velocity' }
    ]
  },
  {
    groupId: 'length',
    charts: [
      { id: 'length', type: 'growth' },
      { id: 'lhaz', type: 'percentile' },
      { id: 'lengthVelocity', type: 'velocity' }
    ]
  },
  {
    groupId: 'headCirc',
    charts: [
      { id: 'headCirc', type: 'growth' },
      { id: 'headcz', type: 'percentile' }
    ]
  },
  {
    groupId: 'wfl',
    charts: [{ id: 'wflz', type: 'percentile' }]
  }
];

/**
 * Convert a flat chart order array to the grouped format.
 * Preserves group ordering by first appearance of any chart in that group.
 */
function convertFlatToGrouped(flatOrder) {
  const groups = new Map();

  for (const chart of flatOrder) {
    const groupId = chartGroupMap[chart.id];
    if (!groupId) continue;
    if (!groups.has(groupId)) {
      groups.set(groupId, []);
    }
    groups.get(groupId).push(chart);
  }

  // Add velocity charts if missing
  for (const [groupId, charts] of groups) {
    if (groupId === 'weight' && !charts.some((c) => c.id === 'weightVelocity')) {
      charts.push({ id: 'weightVelocity', type: 'velocity' });
    }
    if (groupId === 'length' && !charts.some((c) => c.id === 'lengthVelocity')) {
      charts.push({ id: 'lengthVelocity', type: 'velocity' });
    }
  }

  return Array.from(groups.entries()).map(([groupId, charts]) => ({ groupId, charts }));
}

/**
 * Migrate zscore chart types to percentile.
 */
function migrateZScoreToPercentile(chartOrder) {
  return chartOrder.map((group) => ({
    ...group,
    charts: group.charts.map((chart) =>
      chart.type === 'zscore' ? { ...chart, type: 'percentile' } : chart
    )
  }));
}

/**
 * Get the current display mode from the chart order.
 * Returns 'percentile' if any chart uses percentile, otherwise 'zscore'.
 */
function detectDisplayMode(chartOrder) {
  for (const group of chartOrder) {
    for (const chart of group.charts) {
      if (chart.type === 'percentile') return 'percentile';
      if (chart.type === 'zscore') return 'zscore';
    }
  }
  return 'percentile';
}

function loadChartSettings() {
  if (typeof localStorage === 'undefined') {
    return { chartOrder: defaultChartOrder };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate from old growthOrder/zscoreOrder format
      if (parsed.growthOrder || parsed.zscoreOrder) {
        return { chartOrder: defaultChartOrder };
      }

      let chartOrder = parsed.chartOrder || defaultChartOrder;

      // Detect flat format: first element has no groupId property
      if (chartOrder.length > 0 && !chartOrder[0].groupId) {
        chartOrder = convertFlatToGrouped(chartOrder);
      }

      // Migrate existing zscore charts to percentile
      chartOrder = migrateZScoreToPercentile(chartOrder);

      return { chartOrder };
    }
  } catch (_e) {
    // Ignore parse errors
  }

  return { chartOrder: defaultChartOrder };
}

function saveChartSettings(settings) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
}

const initial = loadChartSettings();

export const chartOrder = writable(initial.chartOrder);
export const chartDisplayMode = writable(detectDisplayMode(initial.chartOrder));
export const maximizedChart = writable(null);

export function closeMaximize() {
  maximizedChart.set(null);
}

// Auto-save on changes
chartOrder.subscribe((order) => {
  saveChartSettings({ chartOrder: order });
});

export function toggleChartMode() {
  const currentMode = get(chartDisplayMode);
  const newMode = currentMode === 'percentile' ? 'zscore' : 'percentile';
  chartDisplayMode.set(newMode);

  chartOrder.update((order) =>
    order.map((group) => ({
      ...group,
      charts: group.charts.map((chart) => {
        if (chart.type === 'zscore' && newMode === 'percentile') {
          return { ...chart, type: 'percentile' };
        }
        if (chart.type === 'percentile' && newMode === 'zscore') {
          return { ...chart, type: 'zscore' };
        }
        return chart;
      })
    }))
  );
}

export function reorderCharts(fromIndex, toIndex) {
  chartOrder.update((order) => {
    const newOrder = [...order];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    return newOrder;
  });
}
