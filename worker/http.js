/**
 * HTTP helpers and request-body validation for the Worker
 */

export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * JSON response
 * @param {unknown} data
 * @param {ResponseInit} [init]
 */
export function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}

/** Parse a JSON object request body, or throw 400 */
export async function readJson(request) {
  let body;
  try {
    body = await request.json();
  } catch (_err) {
    throw new HttpError(400, 'Invalid JSON body');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Expected a JSON object');
  }
  return body;
}

/** Current time as an ISO 8601 string, matching the database defaults */
export function nowIso() {
  return new Date().toISOString();
}

// ============================================================================
// Field validators — each throws HttpError(400) on bad input
// ============================================================================

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD string that is a real calendar date */
export function dateField(value, name) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    throw new HttpError(400, `${name} must be a YYYY-MM-DD date`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, `${name} must be a valid date`);
  }
  return value;
}

/** Sex: 1 (male) or 2 (female) */
export function sexField(value) {
  if (value !== 1 && value !== 2) {
    throw new HttpError(400, 'sex must be 1 or 2');
  }
  return value;
}

/** String with a maximum length; undefined/null become '' */
export function textField(value, name, maxLength) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw new HttpError(400, `${name} must be a string`);
  }
  if (value.length > maxLength) {
    throw new HttpError(400, `${name} must be at most ${maxLength} characters`);
  }
  return value;
}

/** Positive number or null; undefined becomes null. `integer` rounds to a whole number. */
export function measureField(value, name, { integer = false } = {}) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new HttpError(400, `${name} must be a positive number or null`);
  }
  return integer ? Math.round(value) : value;
}

/** Non-empty ID string */
export function idField(value, name) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) {
    throw new HttpError(400, `${name} must be an id`);
  }
  return value;
}
