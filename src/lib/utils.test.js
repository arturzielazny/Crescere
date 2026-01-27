import { describe, it, expect } from 'vitest';
import { hexToRgba, formatZScore, getZScoreColorClass } from './utils.js';

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
});
