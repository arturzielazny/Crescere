/**
 * Shared utility functions
 */

import { getZScoreClass } from './zscore.js';

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
  if (cls === 'severe') return 'text-red-600 font-semibold';
  if (cls === 'warning') return 'text-amber-600';
  return 'text-green-600';
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
