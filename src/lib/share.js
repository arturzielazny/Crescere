/**
 * Sharing utilities for child data via Supabase live share links
 */

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
