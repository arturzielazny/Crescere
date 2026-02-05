import { describe, it, expect } from 'vitest';
import {
  hexToRgba,
  formatZScore,
  getZScoreColorClass,
  formatPercentile,
  computeVelocity
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
    expect(getZScoreColorClass(1.1)).toContain('yellow');
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
  const birthDate = '2024-01-01';

  it('computes correct rate between two measurements', () => {
    const measurements = [
      { date: '2024-01-31', weight: 4000, length: 53 },
      { date: '2024-03-01', weight: 5200, length: 57 }
    ];
    const result = computeVelocity(measurements, 'weight', birthDate);
    expect(result).toHaveLength(1);
    // 30 days -> 60 days, weight 4000 -> 5200, rate = 1200/30 = 40
    expect(result[0].y).toBeCloseTo(40, 0);
    expect(result[0].x).toBeCloseTo(45, 0); // midpoint
    expect(result[0].fromAge).toBe(30);
    expect(result[0].toAge).toBe(60);
    expect(result[0].fromValue).toBe(4000);
    expect(result[0].toValue).toBe(5200);
  });

  it('computes correct rate for length in cm/day', () => {
    const measurements = [
      { date: '2024-01-31', weight: 4000, length: 53 },
      { date: '2024-03-01', weight: 5200, length: 57 }
    ];
    const result = computeVelocity(measurements, 'length', birthDate);
    expect(result).toHaveLength(1);
    // 30 days, length 53 -> 57, rate = 4/30 ≈ 0.133
    expect(result[0].y).toBeCloseTo(4 / 30, 3);
  });

  it('skips pairs where value is null', () => {
    const measurements = [
      { date: '2024-01-31', weight: 4000, length: null },
      { date: '2024-03-01', weight: 5200, length: 57 },
      { date: '2024-04-01', weight: null, length: 60 }
    ];
    const weightResult = computeVelocity(measurements, 'weight', birthDate);
    expect(weightResult).toHaveLength(1);
    expect(weightResult[0].fromValue).toBe(4000);
    expect(weightResult[0].toValue).toBe(5200);

    const lengthResult = computeVelocity(measurements, 'length', birthDate);
    expect(lengthResult).toHaveLength(1);
    expect(lengthResult[0].fromValue).toBe(57);
    expect(lengthResult[0].toValue).toBe(60);
  });

  it('returns empty array for single measurement', () => {
    const measurements = [{ date: '2024-01-31', weight: 4000, length: 53 }];
    expect(computeVelocity(measurements, 'weight', birthDate)).toEqual([]);
  });

  it('returns empty array for empty/null input', () => {
    expect(computeVelocity([], 'weight', birthDate)).toEqual([]);
    expect(computeVelocity(null, 'weight', birthDate)).toEqual([]);
    expect(computeVelocity(undefined, 'weight', birthDate)).toEqual([]);
  });

  it('returns empty array when birthDate is missing', () => {
    const measurements = [
      { date: '2024-01-31', weight: 4000 },
      { date: '2024-03-01', weight: 5200 }
    ];
    expect(computeVelocity(measurements, 'weight', null)).toEqual([]);
  });

  it('computes multiple velocity points for three measurements', () => {
    const measurements = [
      { date: '2024-01-31', weight: 4000 },
      { date: '2024-03-01', weight: 5200 },
      { date: '2024-04-30', weight: 6400 }
    ];
    const result = computeVelocity(measurements, 'weight', birthDate);
    expect(result).toHaveLength(2);
    expect(result[0].fromAge).toBe(30);
    expect(result[0].toAge).toBe(60);
    expect(result[1].fromAge).toBe(60);
    expect(result[1].toAge).toBe(120);
  });
});
