import { describe, it, expect } from 'vitest';
import { calculateAgeInDays, formatAge, calculateZScores } from './zscore.js';

describe('zscore helpers', () => {
  it('calculates age in days', () => {
    expect(calculateAgeInDays('2024-01-01', '2024-01-01')).toBe(0);
    expect(calculateAgeInDays('2024-01-01', '2024-01-02')).toBe(1);
  });

  it('formats age strings', () => {
    expect(formatAge(0, { invalid: 'Invalid', month: 'm', day: 'd' })).toBe('0d');
    expect(formatAge(31, { invalid: 'Invalid', month: 'm', day: 'd' })).toBe('1m 1d');
    expect(formatAge(-1, { invalid: 'Invalid', month: 'm', day: 'd' })).toBe('Invalid');
  });

  it('returns empty z-scores for invalid inputs', () => {
    const measurement = { weight: 3500, length: 50, headCirc: 35 };
    expect(calculateZScores(measurement, 3, 0)).toEqual({
      waz: null,
      lhaz: null,
      headcz: null,
      wflz: null
    });
    expect(calculateZScores(measurement, 1, 2000)).toEqual({
      waz: null,
      lhaz: null,
      headcz: null,
      wflz: null
    });
  });

  it('computes z-scores when inputs are valid', () => {
    const measurement = { weight: 3500, length: 50, headCirc: 35 };
    const result = calculateZScores(measurement, 1, 0);
    expect(result.waz).not.toBeNull();
    expect(result.lhaz).not.toBeNull();
    expect(result.headcz).not.toBeNull();
  });

  it('does not calculate WFL z-score after 730 days', () => {
    const measurement = { weight: 3500, length: 50, headCirc: 35 };
    const result = calculateZScores(measurement, 1, 731);
    expect(result.wflz).toBeNull();
  });
});
