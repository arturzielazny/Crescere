import { describe, it, expect } from 'vitest';
import {
  hexToRgba,
  formatZScore,
  getZScoreColorClass,
  formatPercentile,
  computeVelocity,
  niceRange
} from './utils.js';

describe('utils helpers', () => {
  it('converts hex to rgba', () => {
    expect(hexToRgba('#ffffff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
    expect(hexToRgba('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
  });

  it('formats z-scores', () => {
    expect(formatZScore(null)).toBe('—');
    expect(formatZScore(undefined)).toBe('—');
    expect(formatZScore(NaN)).toBe('—');
    expect(formatZScore(1.2345)).toBe('1.23');
  });

  it('maps z-scores to color classes', () => {
    expect(getZScoreColorClass(0)).toContain('green');
    expect(getZScoreColorClass(1.1)).toContain('amber');
    expect(getZScoreColorClass(2.2)).toContain('red');
    expect(getZScoreColorClass(3.5)).toContain('red');
    expect(getZScoreColorClass(null)).toContain('gray');
  });

  it('formats percentiles with ordinal suffix', () => {
    expect(formatPercentile(0)).toBe('50th');
    expect(formatPercentile(null)).toBe('—');
    expect(formatPercentile(NaN)).toBe('—');
  });

  it('formats 1st, 2nd, 3rd percentiles correctly', () => {
    // z=-2.326 ≈ 1st percentile
    expect(formatPercentile(-2.326)).toBe('1st');
  });

  it('clamps extreme percentiles', () => {
    // z=4 → >99th
    expect(formatPercentile(4)).toBe('>99th');
    // z=-4 → <1st
    expect(formatPercentile(-4)).toBe('<1st');
  });

  it('formats percentiles in Polish with dot notation', () => {
    expect(formatPercentile(0, 'pl')).toBe('50.');
    expect(formatPercentile(4, 'pl')).toBe('>99.');
    expect(formatPercentile(-4, 'pl')).toBe('<1.');
    expect(formatPercentile(null, 'pl')).toBe('—');
  });
});

describe('computeVelocity', () => {
  it('returns date pairs and values between two measurements', () => {
    const measurements = [
      { date: '2024-01-31', weight: 4000, length: 53 },
      { date: '2024-03-01', weight: 5200, length: 57 }
    ];
    const result = computeVelocity(measurements, 'weight');
    expect(result).toHaveLength(1);
    expect(result[0].fromDate).toBe('2024-01-31');
    expect(result[0].toDate).toBe('2024-03-01');
    expect(result[0].fromValue).toBe(4000);
    expect(result[0].toValue).toBe(5200);
  });

  it('returns correct date pairs for length', () => {
    const measurements = [
      { date: '2024-01-31', weight: 4000, length: 53 },
      { date: '2024-03-01', weight: 5200, length: 57 }
    ];
    const result = computeVelocity(measurements, 'length');
    expect(result).toHaveLength(1);
    expect(result[0].fromValue).toBe(53);
    expect(result[0].toValue).toBe(57);
  });

  it('skips pairs where value is null', () => {
    const measurements = [
      { date: '2024-01-31', weight: 4000, length: null },
      { date: '2024-03-01', weight: 5200, length: 57 },
      { date: '2024-04-01', weight: null, length: 60 }
    ];
    const weightResult = computeVelocity(measurements, 'weight');
    expect(weightResult).toHaveLength(1);
    expect(weightResult[0].fromValue).toBe(4000);
    expect(weightResult[0].toValue).toBe(5200);

    const lengthResult = computeVelocity(measurements, 'length');
    expect(lengthResult).toHaveLength(1);
    expect(lengthResult[0].fromValue).toBe(57);
    expect(lengthResult[0].toValue).toBe(60);
  });

  it('returns empty array for single measurement', () => {
    const measurements = [{ date: '2024-01-31', weight: 4000, length: 53 }];
    expect(computeVelocity(measurements, 'weight')).toEqual([]);
  });

  it('returns empty array for empty/null input', () => {
    expect(computeVelocity([], 'weight')).toEqual([]);
    expect(computeVelocity(null, 'weight')).toEqual([]);
    expect(computeVelocity(undefined, 'weight')).toEqual([]);
  });

  it('computes multiple pairs for three measurements', () => {
    const measurements = [
      { date: '2024-01-31', weight: 4000 },
      { date: '2024-03-01', weight: 5200 },
      { date: '2024-04-30', weight: 6400 }
    ];
    const result = computeVelocity(measurements, 'weight');
    expect(result).toHaveLength(2);
    expect(result[0].fromDate).toBe('2024-01-31');
    expect(result[0].toDate).toBe('2024-03-01');
    expect(result[1].fromDate).toBe('2024-03-01');
    expect(result[1].toDate).toBe('2024-04-30');
  });

  it('skips same-date pairs', () => {
    const measurements = [
      { date: '2024-01-31', weight: 4000 },
      { date: '2024-01-31', weight: 4100 },
      { date: '2024-03-01', weight: 5200 }
    ];
    const result = computeVelocity(measurements, 'weight');
    expect(result).toHaveLength(1);
    expect(result[0].fromDate).toBe('2024-01-31');
    expect(result[0].toDate).toBe('2024-03-01');
  });
});

describe('niceRange', () => {
  it('rounds out to steps of 1, 2 or 5', () => {
    expect(niceRange(0.093, 0.147)).toEqual({ min: 0.09, max: 0.15, step: 0.01, decimals: 2 });
    expect(niceRange(12.3, 47.9)).toEqual({ min: 10, max: 50, step: 10, decimals: 0 });
    expect(niceRange(2.1, 4.4)).toEqual({ min: 2, max: 4.5, step: 0.5, decimals: 1 });
  });

  it('never produces duplicate tick labels', () => {
    const { min, max, step, decimals } = niceRange(0.1312, 0.1427);
    const labels = [];
    for (let v = min; v <= max + step / 2; v += step) labels.push(v.toFixed(decimals));
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('handles a flat range', () => {
    const range = niceRange(5, 5);
    expect(range.max).toBeGreaterThan(range.min);
    expect(range.min).toBeLessThanOrEqual(5);
  });
});
