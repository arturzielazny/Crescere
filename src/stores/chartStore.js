import { writable } from 'svelte/store';

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
      { id: 'waz', type: 'zscore' },
      { id: 'weightVelocity', type: 'velocity' }
    ]
  },
  {
    groupId: 'length',
    charts: [
      { id: 'length', type: 'growth' },
      { id: 'lhaz', type: 'zscore' },
      { id: 'lengthVelocity', type: 'velocity' }
    ]
  },
  {
    groupId: 'headCirc',
    charts: [
      { id: 'headCirc', type: 'growth' },
      { id: 'headcz', type: 'zscore' }
    ]
  },
  {
    groupId: 'wfl',
    charts: [{ id: 'wflz', type: 'zscore' }]
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

// Auto-save on changes
chartOrder.subscribe((order) => {
  saveChartSettings({ chartOrder: order });
});

export function reorderCharts(fromIndex, toIndex) {
  chartOrder.update((order) => {
    const newOrder = [...order];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    return newOrder;
  });
}
