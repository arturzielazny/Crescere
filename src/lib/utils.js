/**
 * Shared utility functions
 */

import { getZScoreClass, zToPercentile } from './zscore.js';

/**
 * Check if a date string is in the future
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {boolean}
 */
export function isFutureDate(dateStr) {
  if (!dateStr) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dateStr > today;
}

/**
 * Convert hex color to rgba
 * @param {string} hex - Hex color (e.g., '#2563eb')
 * @param {number} alpha - Alpha value 0-1
 * @returns {string} rgba color string
 */
export function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Get Tailwind CSS classes for z-score display
 * @param {number|null} z - Z-score value
 * @returns {string} Tailwind classes
 */
export function getZScoreColorClass(z) {
  const cls = getZScoreClass(z);
  if (cls === 'unknown') return 'text-gray-400';
  if (cls === 'severe') return 'text-red-600 font-semibold';
  if (cls === 'moderate') return 'text-red-600';
  if (cls === 'mild') return 'text-yellow-600';
  return 'text-green-600 font-semibold';
}

/**
 * Format z-score for display
 * @param {number|null} z - Z-score value
 * @returns {string} Formatted string
 */
export function formatZScore(z) {
  if (z === null || z === undefined || isNaN(z)) return '—';
  return z.toFixed(2);
}

/**
 * Format z-score as a percentile with ordinal suffix
 * @param {number|null} z - Z-score value
 * @param {string} [locale='en'] - Locale code ('en' or 'pl')
 * @returns {string} Formatted percentile string (e.g., "50th", "1st", "<1st", ">99th"; Polish: "50.", "<1.", ">99.")
 */
export function formatPercentile(z, locale = 'en') {
  const p = zToPercentile(z);
  if (p === null) return '—';

  const rounded = Math.round(p);

  if (locale === 'pl') {
    if (rounded < 1) return '<1.';
    if (rounded > 99) return '>99.';
    return `${rounded}.`;
  }

  if (rounded < 1) return '<1st';
  if (rounded > 99) return '>99th';

  const mod10 = rounded % 10;
  const mod100 = rounded % 100;
  let suffix = 'th';
  if (mod10 === 1 && mod100 !== 11) suffix = 'st';
  else if (mod10 === 2 && mod100 !== 12) suffix = 'nd';
  else if (mod10 === 3 && mod100 !== 13) suffix = 'rd';

  return `${rounded}${suffix}`;
}
