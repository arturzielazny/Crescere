/**
 * Data routes: children, measurements, preferences and sharing.
 *
 * Every query is scoped to the signed-in user here — this replaces the
 * row-level security policies the Supabase schema used to have.
 */

import {
  HttpError,
  json,
  readJson,
  nowIso,
  dateField,
  sexField,
  textField,
  measureField,
  idField
} from './http.js';

const MAX_NAME_LENGTH = 100;
const MAX_LABEL_LENGTH = 100;
const CHILD_NOT_FOUND = 'Child not found';

// ============================================================================
// Row transforms (database → app format)
// ============================================================================

function toMeasurement(row) {
  return {
    id: row.id,
    date: row.date,
    weight: row.weight,
    length: row.length,
    headCirc: row.head_circ
  };
}

/** Group child rows with their measurement rows into app-format children */
function toChildren(childRows, measurementRows) {
  const byChild = new Map(childRows.map((c) => [c.id, []]));
  for (const m of measurementRows) {
    byChild.get(m.child_id)?.push(toMeasurement(m));
  }
  return childRows.map((c) => ({
    id: c.id,
    profile: { name: c.name, birthDate: c.birth_date, sex: c.sex },
    measurements: byChild.get(c.id)
  }));
}

// ============================================================================
// Access checks
// ============================================================================

async function requireOwnedChild(env, userId, childId) {
  const row = await env.DB.prepare('SELECT id FROM children WHERE id = ? AND user_id = ?')
    .bind(childId, userId)
    .first();
  if (!row) throw new HttpError(404, CHILD_NOT_FOUND);
}

/** Own child, or a child shared with the user */
async function requireReadableChild(env, userId, childId) {
  const row = await env.DB.prepare(
    `SELECT id FROM children WHERE id = ?1 AND user_id = ?2
     UNION
     SELECT child_id FROM shared_child_access WHERE child_id = ?1 AND user_id = ?2`
  )
    .bind(childId, userId)
    .first();
  if (!row) throw new HttpError(404, CHILD_NOT_FOUND);
}

function requireSavedAccount(user) {
  if (user.isAnonymous) throw new HttpError(403, 'Save your account to share');
}

// ============================================================================
// Children
// ============================================================================

/** GET /api/children — own children with measurements */
export async function listChildren(_request, env, { user }) {
  const [children, measurements] = await env.DB.batch([
    env.DB.prepare(
      `SELECT id, name, birth_date, sex FROM children
        WHERE user_id = ? ORDER BY created_at, rowid`
    ).bind(user.id),
    env.DB.prepare(
      `SELECT m.id, m.child_id, m.date, m.weight, m.length, m.head_circ
         FROM measurements m JOIN children c ON c.id = m.child_id
        WHERE c.user_id = ? ORDER BY m.date, m.rowid`
    ).bind(user.id)
  ]);
  return json(toChildren(children.results, measurements.results));
}

/** POST /api/children — { name, birthDate, sex } → { id } */
export async function createChild(request, env, { user }) {
  const body = await readJson(request);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO children (id, user_id, name, birth_date, sex) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(
      id,
      user.id,
      textField(body.name, 'name', MAX_NAME_LENGTH),
      dateField(body.birthDate, 'birthDate'),
      sexField(body.sex)
    )
    .run();
  return json({ id }, { status: 201 });
}

/** PATCH /api/children/:id — any of { name, birthDate, sex } */
export async function updateChild(request, env, { user }, [childId]) {
  const body = await readJson(request);
  const sets = [];
  const values = [];
  if (body.name !== undefined) {
    sets.push('name = ?');
    values.push(textField(body.name, 'name', MAX_NAME_LENGTH));
  }
  if (body.birthDate !== undefined) {
    sets.push('birth_date = ?');
    values.push(dateField(body.birthDate, 'birthDate'));
  }
  if (body.sex !== undefined) {
    sets.push('sex = ?');
    values.push(sexField(body.sex));
  }
  if (sets.length === 0) return json({ ok: true });

  const result = await env.DB.prepare(
    `UPDATE children SET ${sets.join(', ')}, updated_at = ? WHERE id = ? AND user_id = ?`
  )
    .bind(...values, nowIso(), childId, user.id)
    .run();
  if (result.meta.changes === 0) throw new HttpError(404, CHILD_NOT_FOUND);
  return json({ ok: true });
}

/** DELETE /api/children/:id — cascades to measurements and shares */
export async function deleteChild(_request, env, { user }, [childId]) {
  const result = await env.DB.prepare('DELETE FROM children WHERE id = ? AND user_id = ?')
    .bind(childId, user.id)
    .run();
  if (result.meta.changes === 0) throw new HttpError(404, CHILD_NOT_FOUND);
  return json({ ok: true });
}

// ============================================================================
// Measurements
// ============================================================================

function measurementValues(body) {
  return {
    weight: measureField(body.weight, 'weight', { integer: true }),
    length: measureField(body.length, 'length'),
    headCirc: measureField(body.headCirc, 'headCirc')
  };
}

/** POST /api/children/:id/measurements — { date, weight?, length?, headCirc? } → { id } */
export async function createMeasurement(request, env, { user }, [childId]) {
  const body = await readJson(request);
  await requireOwnedChild(env, user.id, childId);
  const values = measurementValues(body);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO measurements (id, child_id, date, weight, length, head_circ) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(id, childId, dateField(body.date, 'date'), values.weight, values.length, values.headCirc)
    .run();
  return json({ id }, { status: 201 });
}

/** PATCH /api/measurements/:id — any of { date, weight, length, headCirc } */
export async function updateMeasurement(request, env, { user }, [measurementId]) {
  const body = await readJson(request);
  const columns = { weight: 'weight', length: 'length', headCirc: 'head_circ' };
  const values = measurementValues(body);
  const sets = [];
  const params = [];
  if (body.date !== undefined) {
    sets.push('date = ?');
    params.push(dateField(body.date, 'date'));
  }
  for (const [field, column] of Object.entries(columns)) {
    if (body[field] !== undefined) {
      sets.push(`${column} = ?`);
      params.push(values[field]);
    }
  }
  if (sets.length === 0) return json({ ok: true });

  const result = await env.DB.prepare(
    `UPDATE measurements SET ${sets.join(', ')}
      WHERE id = ? AND child_id IN (SELECT id FROM children WHERE user_id = ?)`
  )
    .bind(...params, measurementId, user.id)
    .run();
  if (result.meta.changes === 0) throw new HttpError(404, 'Measurement not found');
  return json({ ok: true });
}

/** DELETE /api/measurements/:id */
export async function deleteMeasurement(_request, env, { user }, [measurementId]) {
  const result = await env.DB.prepare(
    `DELETE FROM measurements
      WHERE id = ? AND child_id IN (SELECT id FROM children WHERE user_id = ?)`
  )
    .bind(measurementId, user.id)
    .run();
  if (result.meta.changes === 0) throw new HttpError(404, 'Measurement not found');
  return json({ ok: true });
}

// ============================================================================
// Preferences
// ============================================================================

/** GET /api/preferences → { activeChildId } */
export async function getPreferences(_request, env, { user }) {
  const row = await env.DB.prepare('SELECT active_child_id FROM user_preferences WHERE user_id = ?')
    .bind(user.id)
    .first();
  return json({ activeChildId: row?.active_child_id ?? null });
}

/** PUT /api/preferences — { activeChildId: string|null } */
export async function setPreferences(request, env, { user }) {
  const body = await readJson(request);
  const childId = body.activeChildId === null ? null : idField(body.activeChildId, 'activeChildId');
  if (childId) await requireReadableChild(env, user.id, childId);

  await env.DB.prepare(
    `INSERT INTO user_preferences (user_id, active_child_id) VALUES (?, ?)
     ON CONFLICT (user_id) DO UPDATE SET active_child_id = excluded.active_child_id`
  )
    .bind(user.id, childId)
    .run();
  return json({ ok: true });
}

// ============================================================================
// Sharing
// ============================================================================

/** 128-bit random token as 32 hex characters */
function shareToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** GET /api/children/:id/shares — the owner's share links for a child */
export async function listShares(_request, env, { user }, [childId]) {
  await requireOwnedChild(env, user.id, childId);
  const { results } = await env.DB.prepare(
    `SELECT id, token, label, created_at FROM child_shares
      WHERE child_id = ? AND owner_id = ? ORDER BY created_at, rowid`
  )
    .bind(childId, user.id)
    .all();
  return json(results);
}

/** POST /api/children/:id/shares — { label } → share */
export async function createShare(request, env, { user }, [childId]) {
  requireSavedAccount(user);
  const body = await readJson(request);
  await requireOwnedChild(env, user.id, childId);
  const share = await env.DB.prepare(
    `INSERT INTO child_shares (id, child_id, owner_id, token, label) VALUES (?, ?, ?, ?, ?)
     RETURNING id, token, label, created_at`
  )
    .bind(
      crypto.randomUUID(),
      childId,
      user.id,
      shareToken(),
      textField(body.label, 'label', MAX_LABEL_LENGTH)
    )
    .first();
  return json(share, { status: 201 });
}

/** DELETE /api/shares/:id — revoke a share link (cascades to recipients' access) */
export async function revokeShare(_request, env, { user }, [shareId]) {
  const result = await env.DB.prepare('DELETE FROM child_shares WHERE id = ? AND owner_id = ?')
    .bind(shareId, user.id)
    .run();
  if (result.meta.changes === 0) throw new HttpError(404, 'Share not found');
  return json({ ok: true });
}

/** POST /api/shares/accept — { token } → { childId, alreadyAccepted } */
export async function acceptShare(request, env, { user }) {
  const body = await readJson(request);
  const token = typeof body.token === 'string' ? body.token : '';
  const share = await env.DB.prepare(
    'SELECT id, child_id, owner_id FROM child_shares WHERE token = ?'
  )
    .bind(token)
    .first();
  if (!share) throw new HttpError(404, 'Invalid share token');
  if (share.owner_id === user.id) throw new HttpError(400, 'Cannot accept your own share');

  const result = await env.DB.prepare(
    `INSERT INTO shared_child_access (id, user_id, child_id, share_id) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, child_id) DO NOTHING`
  )
    .bind(crypto.randomUUID(), user.id, share.child_id, share.id)
    .run();
  return json({ childId: share.child_id, alreadyAccepted: result.meta.changes === 0 });
}

/** GET /api/shared-children — children shared with the user, marked read-only */
export async function listSharedChildren(_request, env, { user }) {
  const [children, measurements] = await env.DB.batch([
    env.DB.prepare(
      `SELECT c.id, c.name, c.birth_date, c.sex, s.label
         FROM shared_child_access a
         JOIN children c ON c.id = a.child_id
         JOIN child_shares s ON s.id = a.share_id
        WHERE a.user_id = ? ORDER BY a.accepted_at, a.rowid`
    ).bind(user.id),
    env.DB.prepare(
      `SELECT m.id, m.child_id, m.date, m.weight, m.length, m.head_circ
         FROM measurements m JOIN shared_child_access a ON a.child_id = m.child_id
        WHERE a.user_id = ? ORDER BY m.date, m.rowid`
    ).bind(user.id)
  ]);
  const labels = new Map(children.results.map((c) => [c.id, c.label]));
  return json(
    toChildren(children.results, measurements.results).map((child) => ({
      ...child,
      _shared: true,
      _shareLabel: labels.get(child.id) || ''
    }))
  );
}

/** DELETE /api/shared-children/:childId — stop seeing a shared child */
export async function removeSharedChild(_request, env, { user }, [childId]) {
  await env.DB.prepare('DELETE FROM shared_child_access WHERE child_id = ? AND user_id = ?')
    .bind(childId, user.id)
    .run();
  return json({ ok: true });
}
