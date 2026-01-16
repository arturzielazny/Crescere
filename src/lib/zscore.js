/**
 * WHO Child Growth Standards z-score calculations
 * Implements the LMS method for calculating z-scores
 */

import { WHO_WEIGHT } from '../data/who-weight.js';
import { WHO_LENGTH } from '../data/who-length.js';
import { WHO_HEADC } from '../data/who-headc.js';
import { WHO_WFL } from '../data/who-wfl.js';

/**
 * Standard LMS z-score calculation
 * Used for: length-for-age, head circumference-for-age
 */
function calcZScoreStandard(value, l, m, s) {
  if (Math.abs(l) < 0.001) {
    return Math.log(value / m) / s;
  }
  return (Math.pow(value / m, l) - 1) / (l * s);
}

/**
 * Bounded LMS z-score with linear extrapolation for extreme values
 * Used for: weight-for-age, weight-for-length
 */
function calcZScoreBounded(value, l, m, s) {
  const z = (Math.pow(value / m, l) - 1) / (l * s);

  if (z >= -3 && z <= 3) {
    return z;
  }

  const invL = 1 / l;
  const sd2pos = m * Math.pow(1 + 2 * l * s, invL);
  const sd3pos = m * Math.pow(1 + 3 * l * s, invL);
  const sd2neg = m * Math.pow(1 - 2 * l * s, invL);
  const sd3neg = m * Math.pow(1 - 3 * l * s, invL);

  if (z > 3) {
    return 3 + (value - sd3pos) / (sd3pos - sd2pos);
  } else {
    return -3 - Math.abs((value - sd3neg) / (sd2neg - sd3neg));
  }
}

/**
 * Calculate age in days from birth date and measurement date
 */
export function calculateAgeInDays(birthDate, measurementDate) {
  const birth = new Date(birthDate);
  const measurement = new Date(measurementDate);
  const diffTime = measurement.getTime() - birth.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format age for display
 */
export function formatAge(
  ageInDays,
  labels = { invalid: 'Invalid', month: 'm', day: 'd' }
) {
  if (ageInDays < 0) return labels.invalid;

  const months = Math.floor(ageInDays / 30.4375);
  const days = Math.round(ageInDays % 30.4375);

  if (months === 0) {
    return `${days}${labels.day}`;
  } else if (days === 0) {
    return `${months}${labels.month}`;
  } else {
    return `${months}${labels.month} ${days}${labels.day}`;
  }
}

/**
 * Calculate all z-scores for a measurement
 */
export function calculateZScores(measurement, sex, ageInDays) {
  const result = {
    waz: null,
    lhaz: null,
    headcz: null,
    wflz: null
  };

  // Validate inputs
  if (sex !== 1 && sex !== 2) return result;
  if (ageInDays < 0 || ageInDays > 1826) return result;

  const age = Math.round(ageInDays);
  const sexKey = String(sex);

  // Weight-for-age (bounded)
  if (measurement.weight && WHO_WEIGHT[sexKey]?.[age]) {
    const [l, m, s] = WHO_WEIGHT[sexKey][age];
    const weightKg = measurement.weight / 1000;
    result.waz = calcZScoreBounded(weightKg, l, m, s);
  }

  // Length-for-age (standard)
  if (measurement.length && WHO_LENGTH[sexKey]?.[age]) {
    const [l, m, s] = WHO_LENGTH[sexKey][age];
    result.lhaz = calcZScoreStandard(measurement.length, l, m, s);
  }

  // Head circumference-for-age (standard)
  if (measurement.headCirc && WHO_HEADC[sexKey]?.[age]) {
    const [l, m, s] = WHO_HEADC[sexKey][age];
    result.headcz = calcZScoreStandard(measurement.headCirc, l, m, s);
  }

  // Weight-for-length (bounded) - only for age <= 730 days
  if (ageInDays <= 730 && measurement.weight && measurement.length) {
    const lengthKey = measurement.length.toFixed(1);
    if (WHO_WFL[sexKey]?.[lengthKey]) {
      const [l, m, s] = WHO_WFL[sexKey][lengthKey];
      const weightKg = measurement.weight / 1000;
      result.wflz = calcZScoreBounded(weightKg, l, m, s);
    }
  }

  return result;
}

/**
 * Get z-score classification for display
 */
export function getZScoreClass(z) {
  if (z === null || z === undefined || isNaN(z)) return 'unknown';
  const absZ = Math.abs(z);
  if (absZ > 3) return 'severe';
  if (absZ > 2) return 'moderate';
  if (absZ > 1) return 'mild';
  return 'normal';
}
