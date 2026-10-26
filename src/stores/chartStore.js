import { writable, get } from 'svelte/store';

const STORAGE_KEY = 'crescere-chart-view';
// Pre-tabs format ({ chartOrder: [...] }); only its z-score/percentile choice is kept
const LEGACY_KEY = 'crescere-charts';

/**
 * Chart groups and the views each one offers, mapped to the metric key the
 * chart component takes. `score` is the percentile or z-score chart,
 * depending on the display mode.
 */
export const CHART_GROUPS = {
  weight: { growth: 'weight', score: 'waz', velocity: 'weight' },
  length: { growth: 'length', score: 'lhaz', velocity: 'length' },
  headCirc: { growth: 'headCirc', score: 'headcz' },
  wfl: { score: 'wflz' }
};

export const GROUP_IDS = Object.keys(CHART_GROUPS);
export const VIEW_IDS = ['growth', 'score', 'velocity'];

/**
 * Return a valid {group, view}: unknown groups fall back to the first group,
 * and a view the group doesn't offer falls back to the group's first view.
 * @param {string} group
 * @param {string} view
 */
export function resolveView(group, view) {
  const g = CHART_GROUPS[group] ? group : GROUP_IDS[0];
  const views = VIEW_IDS.filter((v) => CHART_GROUPS[g][v]);
  return { group: g, view: views.includes(view) ? view : views[0] };
}

/**
 * Read the display mode from the legacy chart settings, if any.
 * @param {string | null} raw - The legacy localStorage value
 * @returns {'percentile' | 'zscore' | null}
 */
export function legacyDisplayMode(raw) {
  try {
    const order = JSON.parse(raw || 'null')?.chartOrder;
    if (!Array.isArray(order)) return null;
    const charts = order.flatMap((entry) => entry.charts || [entry]);
    return charts.some((c) => c.type === 'zscore') ? 'zscore' : 'percentile';
  } catch (_err) {
    return null;
  }
}

function loadSettings() {
  const defaults = { group: 'weight', view: 'growth', mode: 'percentile' };
  if (typeof localStorage === 'undefined') return defaults;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (stored) {
      return {
        ...resolveView(stored.group, stored.view),
        mode: stored.mode === 'zscore' ? 'zscore' : 'percentile'
      };
    }
    const mode = legacyDisplayMode(localStorage.getItem(LEGACY_KEY));
    localStorage.removeItem(LEGACY_KEY);
    return { ...defaults, mode: mode || defaults.mode };
  } catch (_err) {
    return defaults;
  }
}

const initial = loadSettings();

/** The chart shown on screen */
export const chartView = writable(resolveView(initial.group, initial.view));
/** Whether score charts show percentiles or z-scores */
export const chartDisplayMode = writable(initial.mode);
/** Whether the current chart is shown full screen */
export const maximizedChart = writable(false);

function save() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...get(chartView), mode: get(chartDisplayMode) })
    );
  } catch (_err) {
    // Storage full or blocked: the choice just isn't remembered
  }
}

chartView.subscribe(save);
chartDisplayMode.subscribe(save);

/** Switch to another group, keeping the current view when that group has it */
export function selectChartGroup(group) {
  chartView.update((current) => resolveView(group, current.view));
}

export function selectChartView(view) {
  chartView.update((current) => resolveView(current.group, view));
}

export function toggleChartMode() {
  chartDisplayMode.update((mode) => (mode === 'percentile' ? 'zscore' : 'percentile'));
}

export function closeMaximize() {
  maximizedChart.set(false);
}
