import { writable } from 'svelte/store';

const STORAGE_KEY = 'crescere-charts';

// All charts in a single unified list
const defaultChartOrder = [
  { id: 'weight', type: 'growth' },
  { id: 'length', type: 'growth' },
  { id: 'headCirc', type: 'growth' },
  { id: 'waz', type: 'zscore' },
  { id: 'lhaz', type: 'zscore' },
  { id: 'headcz', type: 'zscore' },
  { id: 'wflz', type: 'zscore' }
];

function loadChartSettings() {
  if (typeof localStorage === 'undefined') {
    return { chartOrder: defaultChartOrder, columnsPerRow: 3 };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate from old format if needed
      if (parsed.growthOrder || parsed.zscoreOrder) {
        return { chartOrder: defaultChartOrder, columnsPerRow: parsed.columnsPerRow || 3 };
      }
      return {
        chartOrder: parsed.chartOrder || defaultChartOrder,
        columnsPerRow: parsed.columnsPerRow || 3
      };
    }
  } catch (_e) {
    // Ignore parse errors
  }

  return { chartOrder: defaultChartOrder, columnsPerRow: 3 };
}

function saveChartSettings(settings) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
}

const initial = loadChartSettings();

export const chartOrder = writable(initial.chartOrder);
export const columnsPerRow = writable(initial.columnsPerRow);
export const maximizedChart = writable(null);

// Auto-save on changes
chartOrder.subscribe((order) => {
  const current = loadChartSettings();
  saveChartSettings({ ...current, chartOrder: order });
});

columnsPerRow.subscribe((cols) => {
  const current = loadChartSettings();
  saveChartSettings({ ...current, columnsPerRow: cols });
});

export function reorderCharts(fromIndex, toIndex) {
  chartOrder.update((order) => {
    const newOrder = [...order];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    return newOrder;
  });
}

export function setColumnsPerRow(cols) {
  columnsPerRow.set(cols);
}

export function toggleMaximize(chartId) {
  maximizedChart.update((current) => (current === chartId ? null : chartId));
}

export function closeMaximize() {
  maximizedChart.set(null);
}
