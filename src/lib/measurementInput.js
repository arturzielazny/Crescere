/**
 * Parsing for measurement values typed by parents: comma or dot decimals,
 * optional units, and weight in either grams or kilograms.
 */

/** Below this, a weight without a unit is read as kilograms (no child weighs under 100 g) */
const KG_THRESHOLD = 100;

function normalize(text) {
  return String(text ?? '')
    .trim()
    .toLowerCase()
    .replaceAll(' ', '')
    .replace(',', '.');
}

/**
 * @param {string | number | null | undefined} text - e.g. "6300", "6.3", "6,3 kg", "6 300 g"
 * @returns {{ grams: number | null, fromKg: boolean } | null} null when it isn't a valid weight;
 *   grams is null for an empty field
 */
export function parseWeight(text) {
  const s = normalize(text);
  if (s === '') return { grams: null, fromKg: false };
  let unit = null;
  if (s.endsWith('kg')) unit = 'kg';
  else if (s.endsWith('g')) unit = 'g';
  const num = Number(unit ? s.slice(0, -unit.length) : s);
  if (!Number.isFinite(num) || num <= 0) return null;
  const fromKg = unit === 'kg' || (unit === null && num < KG_THRESHOLD);
  return { grams: Math.round(fromKg ? num * 1000 : num), fromKg };
}

/**
 * @param {string | number | null | undefined} text - e.g. "61", "61,5", "61.5 cm"
 * @returns {{ value: number | null } | null} null when it isn't a valid length; value is null
 *   for an empty field
 */
export function parseCm(text) {
  let s = normalize(text);
  if (s === '') return { value: null };
  if (s.endsWith('cm')) s = s.slice(0, -2);
  const num = Number(s);
  if (!Number.isFinite(num) || num <= 0) return null;
  return { value: Math.round(num * 10) / 10 };
}
