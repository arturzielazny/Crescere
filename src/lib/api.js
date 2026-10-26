/**
 * API client for the Crescere Worker (Cloudflare Workers + D1)
 * Handles auth, children, measurements, user preferences and sharing.
 * The session lives in an HttpOnly cookie set by the Worker.
 */

/**
 * Call a JSON endpoint; throws an Error carrying the server's message and HTTP status
 * @param {string} method
 * @param {string} path - Path under /api
 * @param {Object} [body]
 */
async function request(method, path, body) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_err) {
    // Non-JSON response (e.g. network proxy error page)
  }

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

// ============================================================================
// Auth
// ============================================================================

/**
 * Get the signed-in user, or null
 * @returns {Promise<{id: string, email: string|null, isAnonymous: boolean}|null>}
 */
export async function getSessionUser() {
  const { user } = await request('GET', '/auth/session');
  return user;
}

/** Create a guest user and sign in as it */
export async function signInAnonymously() {
  const { user } = await request('POST', '/auth/anonymous');
  return user;
}

/**
 * Sign in with email and password. Children added as a guest in this browser
 * move into the account; movedChildren says how many.
 * @returns {Promise<{user: {id: string, email: string|null, isAnonymous: boolean}, movedChildren: number}>}
 */
export async function signInWithPassword(email, password) {
  return request('POST', '/auth/login', { email, password });
}

/** Turn the current guest user into a saved account (keeps all data) */
export async function claimAccount(email, password) {
  const { user } = await request('POST', '/auth/claim', { email, password });
  return user;
}

/** Change the password of a saved account */
export async function changePassword(currentPassword, newPassword) {
  await request('POST', '/auth/password', { currentPassword, newPassword });
}

/** End the current session */
export async function signOut() {
  await request('POST', '/auth/logout');
}

// ============================================================================
// Children
// ============================================================================

/**
 * Fetch all children for the current user
 * @returns {Promise<Array>} Array of children with their measurements
 */
export function fetchChildren() {
  return request('GET', '/children');
}

/**
 * Create a new child
 * @param {Object} profile - { name, birthDate, sex }
 * @returns {Promise<string>} Created child ID
 */
export async function createChild(profile) {
  const { id } = await request('POST', '/children', {
    name: profile.name || '',
    birthDate: profile.birthDate,
    sex: profile.sex
  });
  return id;
}

/**
 * Update child profile
 * @param {string} id - Child ID
 * @param {Object} profile - { name?, birthDate?, sex? }
 */
export async function updateChild(id, profile) {
  const updates = {};
  if (profile.name !== undefined) updates.name = profile.name;
  if (profile.birthDate !== undefined) updates.birthDate = profile.birthDate;
  if (profile.sex !== undefined) updates.sex = profile.sex;

  if (Object.keys(updates).length === 0) return;

  await request('PATCH', `/children/${id}`, updates);
}

/**
 * Delete a child and all their measurements (cascade)
 * @param {string} id - Child ID
 */
export async function deleteChild(id) {
  await request('DELETE', `/children/${id}`);
}

// ============================================================================
// Measurements
// ============================================================================

/**
 * Create a measurement for a child
 * @param {string} childId - Child ID
 * @param {Object} measurement - { date, weight?, length?, headCirc? }
 * @returns {Promise<string>} Created measurement ID
 */
export async function createMeasurement(childId, measurement) {
  const { id } = await request('POST', `/children/${childId}/measurements`, {
    date: measurement.date,
    weight: measurement.weight ?? null,
    length: measurement.length ?? null,
    headCirc: measurement.headCirc ?? null
  });
  return id;
}

/**
 * Update a measurement
 * @param {string} id - Measurement ID
 * @param {Object} updates - { date?, weight?, length?, headCirc? }
 */
export async function updateMeasurement(id, updates) {
  const body = {};
  for (const field of ['date', 'weight', 'length', 'headCirc']) {
    if (updates[field] !== undefined) body[field] = updates[field];
  }

  if (Object.keys(body).length === 0) return;

  await request('PATCH', `/measurements/${id}`, body);
}

/**
 * Delete a measurement
 * @param {string} id - Measurement ID
 */
export async function deleteMeasurement(id) {
  await request('DELETE', `/measurements/${id}`);
}

// ============================================================================
// User Preferences
// ============================================================================

/**
 * Get the active child ID for current user
 * @returns {Promise<string|null>} Active child ID or null
 */
export async function getActiveChildId() {
  const { activeChildId } = await request('GET', '/preferences');
  return activeChildId;
}

/**
 * Set the active child ID for current user
 * @param {string|null} childId - Child ID or null to clear
 */
export async function setActiveChildId(childId) {
  await request('PUT', '/preferences', { activeChildId: childId });
}

// ============================================================================
// Sharing
// ============================================================================

/**
 * Create a named share link for a child
 * @param {string} childId - Child ID
 * @param {string} label - Human-readable label (e.g., "Doctor")
 * @returns {Promise<{id: string, token: string, label: string, created_at: string}>}
 */
export function createShare(childId, label) {
  return request('POST', `/children/${childId}/shares`, { label: label || '' });
}

/**
 * List all shares for a child (owner only)
 * @param {string} childId - Child ID
 * @returns {Promise<Array>}
 */
export function fetchShares(childId) {
  return request('GET', `/children/${childId}/shares`);
}

/**
 * Revoke a share (cascade deletes access rows)
 * @param {string} shareId - Share ID
 */
export async function revokeShare(shareId) {
  await request('DELETE', `/shares/${shareId}`);
}

/**
 * Accept a share via token
 * @param {string} token - Share token
 * @returns {Promise<{childId: string, alreadyAccepted: boolean}>}
 */
export function acceptShare(token) {
  return request('POST', '/shares/accept', { token });
}

/**
 * Fetch all children shared with the current user
 * Returns children in app format with _shared and _shareLabel markers
 * @returns {Promise<Array>}
 */
export function fetchSharedChildren() {
  return request('GET', '/shared-children');
}

/**
 * Remove the current user's access to a shared child
 * @param {string} childId - Child ID
 */
export async function removeSharedChild(childId) {
  await request('DELETE', `/shared-children/${childId}`);
}
