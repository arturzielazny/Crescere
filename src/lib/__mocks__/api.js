/**
 * In-memory mock of src/lib/api.js for unit tests.
 * Rows are stored in database format (snake_case) so tests can assert on them;
 * functions return app format, scoped to the mock user, like the Worker does.
 */

// In-memory storage for mock data
let mockData = {
  children: [],
  measurements: [],
  user_preferences: [],
  child_shares: [],
  shared_child_access: []
};

let mockUser = null;

/**
 * Reset all mock data - call in beforeEach
 */
export function resetMockData() {
  mockData = {
    children: [],
    measurements: [],
    user_preferences: [],
    child_shares: [],
    shared_child_access: []
  };
  mockUser = null;
}

/**
 * Set mock signed-in user: { id, email?, is_anonymous? }
 */
export function setMockUser(user) {
  mockUser = user
    ? { id: user.id, email: user.email ?? null, isAnonymous: user.is_anonymous === true }
    : null;
}

/**
 * Seed mock data for testing
 */
export function seedMockData(table, records) {
  mockData[table] = records;
}

/**
 * Get current mock data (for assertions)
 */
export function getMockData(table) {
  return mockData[table];
}

function requireUser() {
  if (!mockUser) throw Object.assign(new Error('Not authenticated'), { status: 401 });
  return mockUser;
}

function notFound(what) {
  return Object.assign(new Error(`${what} not found`), { status: 404 });
}

function toChild(row) {
  return {
    id: row.id,
    profile: { name: row.name, birthDate: row.birth_date, sex: row.sex },
    measurements: mockData.measurements
      .filter((m) => m.child_id === row.id)
      .map((m) => ({
        id: m.id,
        date: m.date,
        weight: m.weight ?? null,
        length: m.length ?? null,
        headCirc: m.head_circ ?? null
      }))
  };
}

function ownedChild(childId) {
  const user = requireUser();
  const child = mockData.children.find((c) => c.id === childId && c.user_id === user.id);
  if (!child) throw notFound('Child');
  return child;
}

function ownedMeasurement(id) {
  const user = requireUser();
  const m = mockData.measurements.find((row) => row.id === id);
  const child = m && mockData.children.find((c) => c.id === m.child_id);
  if (!child || child.user_id !== user.id) throw notFound('Measurement');
  return m;
}

// ============================================================================
// Auth
// ============================================================================

export async function getSessionUser() {
  return mockUser;
}

export async function signInAnonymously() {
  mockUser = { id: crypto.randomUUID(), email: null, isAnonymous: true };
  return mockUser;
}

export async function signInWithPassword(email) {
  mockUser = { id: crypto.randomUUID(), email, isAnonymous: false };
  return mockUser;
}

export async function claimAccount(email) {
  const user = requireUser();
  mockUser = { ...user, email, isAnonymous: false };
  return mockUser;
}

export async function changePassword() {
  requireUser();
}

export async function signOut() {
  mockUser = null;
}

// ============================================================================
// Children
// ============================================================================

export async function fetchChildren() {
  const user = requireUser();
  return mockData.children.filter((c) => c.user_id === user.id).map(toChild);
}

export async function createChild(profile) {
  const user = requireUser();
  const id = crypto.randomUUID();
  mockData.children.push({
    id,
    user_id: user.id,
    name: profile.name || '',
    birth_date: profile.birthDate,
    sex: profile.sex,
    created_at: new Date().toISOString()
  });
  return id;
}

export async function updateChild(id, profile) {
  const child = ownedChild(id);
  if (profile.name !== undefined) child.name = profile.name;
  if (profile.birthDate !== undefined) child.birth_date = profile.birthDate;
  if (profile.sex !== undefined) child.sex = profile.sex;
}

export async function deleteChild(id) {
  ownedChild(id);
  const shareIds = mockData.child_shares.filter((s) => s.child_id === id).map((s) => s.id);
  mockData.children = mockData.children.filter((c) => c.id !== id);
  mockData.measurements = mockData.measurements.filter((m) => m.child_id !== id);
  mockData.child_shares = mockData.child_shares.filter((s) => s.child_id !== id);
  mockData.shared_child_access = mockData.shared_child_access.filter(
    (a) => !shareIds.includes(a.share_id)
  );
}

// ============================================================================
// Measurements
// ============================================================================

export async function createMeasurement(childId, measurement) {
  ownedChild(childId);
  const id = crypto.randomUUID();
  mockData.measurements.push({
    id,
    child_id: childId,
    date: measurement.date,
    weight: measurement.weight ?? null,
    length: measurement.length ?? null,
    head_circ: measurement.headCirc ?? null,
    created_at: new Date().toISOString()
  });
  return id;
}

export async function updateMeasurement(id, updates) {
  const m = ownedMeasurement(id);
  if (updates.date !== undefined) m.date = updates.date;
  if (updates.weight !== undefined) m.weight = updates.weight;
  if (updates.length !== undefined) m.length = updates.length;
  if (updates.headCirc !== undefined) m.head_circ = updates.headCirc;
}

export async function deleteMeasurement(id) {
  ownedMeasurement(id);
  mockData.measurements = mockData.measurements.filter((m) => m.id !== id);
}

// ============================================================================
// User Preferences
// ============================================================================

export async function getActiveChildId() {
  const user = requireUser();
  return mockData.user_preferences.find((p) => p.user_id === user.id)?.active_child_id ?? null;
}

export async function setActiveChildId(childId) {
  const user = requireUser();
  const existing = mockData.user_preferences.find((p) => p.user_id === user.id);
  if (existing) {
    existing.active_child_id = childId;
  } else {
    mockData.user_preferences.push({ user_id: user.id, active_child_id: childId });
  }
}

// ============================================================================
// Sharing
// ============================================================================

export async function createShare(childId, label) {
  const user = requireUser();
  ownedChild(childId);
  const share = {
    id: crypto.randomUUID(),
    child_id: childId,
    owner_id: user.id,
    token: crypto.randomUUID().replace(/-/g, ''),
    label: label || '',
    created_at: new Date().toISOString()
  };
  mockData.child_shares.push(share);
  return { id: share.id, token: share.token, label: share.label, created_at: share.created_at };
}

export async function fetchShares(childId) {
  ownedChild(childId);
  return mockData.child_shares
    .filter((s) => s.child_id === childId)
    .map(({ id, token, label, created_at }) => ({ id, token, label, created_at }));
}

export async function revokeShare(shareId) {
  const user = requireUser();
  mockData.child_shares = mockData.child_shares.filter(
    (s) => !(s.id === shareId && s.owner_id === user.id)
  );
  mockData.shared_child_access = mockData.shared_child_access.filter((a) => a.share_id !== shareId);
}

export async function acceptShare(token) {
  const user = requireUser();
  const share = mockData.child_shares.find((s) => s.token === token);
  if (!share) throw notFound('Share');
  if (share.owner_id === user.id) throw new Error('Cannot accept your own share');

  const existing = mockData.shared_child_access.find(
    (a) => a.user_id === user.id && a.child_id === share.child_id
  );
  if (existing) return { childId: share.child_id, alreadyAccepted: true };

  mockData.shared_child_access.push({
    id: crypto.randomUUID(),
    user_id: user.id,
    child_id: share.child_id,
    share_id: share.id,
    accepted_at: new Date().toISOString()
  });
  return { childId: share.child_id, alreadyAccepted: false };
}

export async function fetchSharedChildren() {
  const user = requireUser();
  return mockData.shared_child_access
    .filter((a) => a.user_id === user.id)
    .map((a) => {
      const child = mockData.children.find((c) => c.id === a.child_id);
      if (!child) return null;
      const share = mockData.child_shares.find((s) => s.id === a.share_id);
      return { ...toChild(child), _shared: true, _shareLabel: share?.label || '' };
    })
    .filter(Boolean);
}

export async function removeSharedChild(childId) {
  const user = requireUser();
  mockData.shared_child_access = mockData.shared_child_access.filter(
    (a) => !(a.child_id === childId && a.user_id === user.id)
  );
}
