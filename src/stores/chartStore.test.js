import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import {
  resolveView,
  legacyDisplayMode,
  chartView,
  selectChartGroup,
  selectChartView
} from './chartStore.js';

describe('resolveView', () => {
  it('keeps a view the group offers', () => {
    expect(resolveView('length', 'velocity')).toEqual({ group: 'length', view: 'velocity' });
  });

  it("falls back to the group's first view", () => {
    expect(resolveView('headCirc', 'velocity')).toEqual({ group: 'headCirc', view: 'growth' });
    expect(resolveView('wfl', 'growth')).toEqual({ group: 'wfl', view: 'score' });
  });

  it('falls back to the first group for unknown ids', () => {
    expect(resolveView('bmi', 'growth')).toEqual({ group: 'weight', view: 'growth' });
  });
});

describe('chart selection', () => {
  it('keeps the view when switching groups where possible', () => {
    chartView.set({ group: 'weight', view: 'score' });
    selectChartGroup('wfl');
    expect(get(chartView)).toEqual({ group: 'wfl', view: 'score' });

    selectChartGroup('length');
    selectChartView('velocity');
    selectChartGroup('headCirc');
    expect(get(chartView)).toEqual({ group: 'headCirc', view: 'growth' });
  });
});

describe('legacyDisplayMode', () => {
  it('reads z-score mode from grouped and flat legacy formats', () => {
    const grouped = {
      chartOrder: [{ groupId: 'weight', charts: [{ id: 'waz', type: 'zscore' }] }]
    };
    expect(legacyDisplayMode(JSON.stringify(grouped))).toBe('zscore');
    expect(
      legacyDisplayMode(JSON.stringify({ chartOrder: [{ id: 'waz', type: 'percentile' }] }))
    ).toBe('percentile');
  });

  it('ignores missing or broken values', () => {
    expect(legacyDisplayMode(null)).toBeNull();
    expect(legacyDisplayMode('{oops')).toBeNull();
  });
});
