/**
 * Password hashing with PBKDF2-SHA256 (WebCrypto).
 *
 * Stored format: pbkdf2-sha256$<iterations>$<salt base64>$<hash base64>
 * The iteration count is stored per hash, so it can change without breaking old hashes.
 * 100,000 is the maximum PBKDF2 iteration count the Workers runtime allows.
 */

export const MAX_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;
const PREFIX = 'pbkdf2-sha256';

const encoder = new TextEncoder();

function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(text) {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits'
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    HASH_BITS
  );
  return new Uint8Array(bits);
}

/** Constant-time comparison of two equal-length byte arrays */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  if (crypto.subtle.timingSafeEqual) return crypto.subtle.timingSafeEqual(a, b);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Hash a password for storage
 * @param {string} password
 * @param {number} [iterations]
 * @returns {Promise<string>}
 */
export async function hashPassword(password, iterations = MAX_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, iterations);
  return `${PREFIX}$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
}

/**
 * Check a password against a stored hash
 * @param {string} password
 * @param {string} stored
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, stored) {
  const [prefix, iterations, salt, hash] = stored.split('$');
  if (prefix !== PREFIX || !iterations || !salt || !hash) return false;
  const expected = fromBase64(hash);
  const actual = await derive(password, fromBase64(salt), Number(iterations));
  return timingSafeEqual(actual, expected);
}
