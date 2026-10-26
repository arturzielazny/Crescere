import { describe, it, expect } from 'vitest';
import { summarizeGrowth, describeZScore } from './summary.js';

const m = (date, values, zscores = {}) => ({
  id: date,
  date,
  weight: null,
  length: null,
  headCirc: null,
  ...values,
  zscores: { waz: null, lhaz: null, headcz: null, wflz: null, ...zscores }
});

describe('summarizeGrowth', () => {
  const today = '2025-03-10';

  it('returns the latest value per metric with the change since the previous one', () => {
    const summary = summarizeGrowth(
      [
        m('2025-02-01', { weight: 4000, length: 54 }, { waz: 0.1, lhaz: 0.2, wflz: -0.3 }),
        m('2025-03-01', { weight: 4600 }, { waz: 0.3 }),
        m('2025-03-04', { headCirc: 38 }, { headcz: 1.4 })
      ],
      today
    );

    expect(summary.lastDate).toBe('2025-03-04');
    expect(summary.daysSinceLast).toBe(6);
    expect(summary.metrics.weight).toEqual({
      value: 4600,
      date: '2025-03-01',
      z: 0.3,
      change: { value: 600, days: 28 }
    });
    expect(summary.metrics.length).toEqual({
      value: 54,
      date: '2025-02-01',
      z: 0.2,
      change: null
    });
    expect(summary.metrics.headCirc.z).toBe(1.4);
    expect(summary.metrics.wfl).toEqual({ value: null, date: '2025-02-01', z: -0.3, change: null });
  });

  it('ignores planned (future) measurements', () => {
    const summary = summarizeGrowth(
      [m('2025-03-01', { weight: 4600 }), m('2025-04-01', { weight: 5200 })],
      today
    );
    expect(summary.metrics.weight.value).toBe(4600);
    expect(summary.lastDate).toBe('2025-03-01');
  });

  it('handles no measurements', () => {
    const summary = summarizeGrowth([], today);
    expect(summary).toEqual({
      lastDate: null,
      daysSinceLast: null,
      metrics: { weight: null, length: null, headCirc: null, wfl: null }
    });
  });

  it('skips same-day pairs when computing the change', () => {
    const summary = summarizeGrowth(
      [m('2025-03-01', { weight: 4600 }), m('2025-03-01', { weight: 4650 })],
      today
    );
    expect(summary.metrics.weight.change).toBeNull();
  });
});

describe('describeZScore', () => {
  it('describes direction and SD range', () => {
    expect(describeZScore(0.4)).toEqual({ direction: 'within', range: '1' });
    expect(describeZScore(-1)).toEqual({ direction: 'within', range: '1' });
    expect(describeZScore(1.5)).toEqual({ direction: 'above', range: '1–2' });
    expect(describeZScore(-2.5)).toEqual({ direction: 'below', range: '2–3' });
    expect(describeZScore(-3.2)).toEqual({ direction: 'below', range: '>3' });
    expect(describeZScore(null)).toBeNull();
  });
});
