import { describe, it, expect } from 'vitest';
import { hexToRgba, formatZScore, getZScoreColorClass, formatPercentile } from './utils.js';

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
