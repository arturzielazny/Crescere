/**
 * "At a glance" summary of a child's latest measurements, for the summary card.
 */

import { calculateAgeInDays } from './zscore.js';

/** Summary metrics: the measurement field (null for weight-for-length) and its z-score key */
export const SUMMARY_METRICS = [
  { id: 'weight', field: 'weight', z: 'waz' },
  { id: 'length', field: 'length', z: 'lhaz' },
  { id: 'headCirc', field: 'headCirc', z: 'headcz' },
  { id: 'wfl', field: null, z: 'wflz' }
];

const hasValue = (v) => v !== null && v !== undefined && !Number.isNaN(v);

/**
 * @typedef {{
 *   value: number | null,
 *   date: string,
 *   z: number | null,
 *   change: { value: number, days: number } | null
 * }} MetricSummary
 */

/**
 * Latest value per metric, ignoring planned (future) measurements.
 * @param {Array<{date: string, zscores?: Record<string, number|null>|null} & Record<string, any>>} measurements
 *   Measurements with z-scores (from `measurementsWithZScores`)
 * @param {string} today - YYYY-MM-DD
 * @returns {{ lastDate: string | null, daysSinceLast: number | null, metrics: Record<string, MetricSummary | null> }}
 */
export function summarizeGrowth(measurements, today) {
  const past = measurements
    .filter((m) => m.date && m.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const metrics = {};
  for (const { id, field, z } of SUMMARY_METRICS) {
    const withValue = past.filter((m) => (field ? hasValue(m[field]) : hasValue(m.zscores?.[z])));
    const latest = withValue.at(-1);
    const previous = withValue.at(-2);
    if (!latest) {
      metrics[id] = null;
      continue;
    }
    const days = previous ? calculateAgeInDays(previous.date, latest.date) : 0;
    metrics[id] = {
      value: field ? latest[field] : null,
      date: latest.date,
      z: hasValue(latest.zscores?.[z]) ? latest.zscores[z] : null,
      change:
        field && previous && days > 0 ? { value: latest[field] - previous[field], days } : null
    };
  }

  const lastDate = past.at(-1)?.date ?? null;
  return {
    lastDate,
    daysSinceLast: lastDate ? calculateAgeInDays(lastDate, today) : null,
    metrics
  };
}

/**
 * Where a z-score sits, as a direction and an SD range, so the meaning
 * doesn't rely on colour alone.
 * @param {number | null} z
 * @returns {{ direction: 'within' | 'above' | 'below', range: string } | null}
 */
export function describeZScore(z) {
  if (!hasValue(z)) return null;
  const abs = Math.abs(z);
  if (abs <= 1) return { direction: 'within', range: '1' };
  let range = '>3';
  if (abs <= 2) range = '1–2';
  else if (abs <= 3) range = '2–3';
  return { direction: z > 0 ? 'above' : 'below', range };
}
