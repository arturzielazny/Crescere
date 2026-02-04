/**
 * Sharing utilities for child data via URL
 * Uses LZ-String compression for compact, URL-safe data transfer
 */

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

/**
 * Convert child data to compact format for sharing
 * @param {Object} child - Child object with profile and measurements
 * @returns {Object} Compact representation
 */
export function toCompactFormat(child) {
  return {
    n: child.profile.name || '',
    b: child.profile.birthDate,
    s: child.profile.sex,
    m: child.measurements.map((m) => [m.date, m.weight, m.length, m.headCirc])
  };
}

/**
 * Expand compact format back to full child object with new UUIDs
 * @param {Object} compact - Compact child data
 * @returns {Object} Full child object
 */
export function fromCompactFormat(compact) {
  return {
    id: crypto.randomUUID(),
    profile: {
      name: compact.n || '',
      birthDate: compact.b || null,
      sex: compact.s || null
    },
    measurements: (compact.m || []).map((m) => ({
      id: crypto.randomUUID(),
      date: m[0],
      weight: m[1],
      length: m[2],
      headCirc: m[3]
    }))
  };
}

/**
 * Generate a shareable URL for a child's data
 * @param {Object} child - Child object to share
 * @returns {string} Full URL with compressed data in hash
 */
export function generateShareUrl(child) {
  const compact = toCompactFormat(child);
  const json = JSON.stringify(compact);
  const compressed = compressToEncodedURIComponent(json);

  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#share=${compressed}`;
}

/**
 * Parse child data from the current URL hash
 * @returns {Object|null} Child object if valid share URL, null otherwise
 */
export function parseShareUrl() {
  const hash = window.location.hash;
  if (!hash.startsWith('#share=')) {
    return null;
  }

  try {
    const compressed = hash.slice(7); // Remove '#share='
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) {
      return null;
    }

    const compact = JSON.parse(json);
    return fromCompactFormat(compact);
  } catch (e) {
    console.error('Failed to parse share URL:', e);
    return null;
  }
}

/**
 * Parse a live share token from the current URL hash
 * @returns {string|null} Token if valid live-share URL, null otherwise
 */
export function parseLiveShareUrl() {
  const hash = window.location.hash;
  if (!hash.startsWith('#live-share=')) {
    return null;
  }
  const token = hash.slice(12); // Remove '#live-share='
  return token || null;
}

/**
 * Generate a live share URL for a given token
 * @param {string} token - Share token
 * @returns {string} Full URL with token in hash
 */
export function generateLiveShareUrl(token) {
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#live-share=${token}`;
}

/**
 * Clear the share hash from URL without page reload
 */
export function clearShareHash() {
  const url = window.location.origin + window.location.pathname;
  window.history.replaceState(null, '', url);
}
