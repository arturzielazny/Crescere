/**
 * Authentication: guest users, account claiming, email + password sign-in,
 * and cookie-based sessions stored in D1.
 */

import { HttpError, json, readJson, nowIso } from './http.js';
import { hashPassword, verifyPassword, MAX_ITERATIONS } from './password.js';

const COOKIE_NAME = 'crescere_session';
const SESSION_DAYS = 400; // browsers cap cookie lifetime at 400 days
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 256;

// Verified against when an email is unknown, so a failed sign-in takes the same time either way
const dummyHash = (iterations) =>
  `pbkdf2-sha256$${iterations}$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`;

// ============================================================================
// Session tokens and cookies
// ============================================================================

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function expiryFromNow() {
  return new Date(Date.now() + SESSION_DAYS * DAY_MS).toISOString();
}

function cookieAttributes(request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function sessionCookie(request, token) {
  return `${COOKIE_NAME}=${token}; Max-Age=${SESSION_DAYS * 24 * 60 * 60}; ${cookieAttributes(request)}`;
}

function clearedCookie(request) {
  return `${COOKIE_NAME}=; Max-Age=0; ${cookieAttributes(request)}`;
}

function readSessionToken(request) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE_NAME) return rest.join('=') || null;
  }
  return null;
}

/** Statement that inserts a new session row; returns the statement and the raw token */
async function newSessionStatement(env, userId) {
  const token = randomToken();
  const statement = env.DB.prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(await sha256Hex(token), userId, expiryFromNow());
  return { statement, token };
}

/** Public shape of a user */
function toUser(row) {
  return { id: row.id, email: row.email ?? null, isAnonymous: !row.email };
}

/**
 * Resolve the session cookie to a user.
 * Sessions slide: once a day the expiry is pushed forward and the cookie re-sent.
 * @returns {Promise<{user: {id: string, email: string|null, isAnonymous: boolean}, tokenHash: string, setCookie: string|null} | null>}
 */
export async function getSession(request, env) {
  const token = readSessionToken(request);
  if (!token) return null;

  const tokenHash = await sha256Hex(token);
  const now = nowIso();
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`
  )
    .bind(tokenHash, now)
    .first();
  if (!row) return null;

  let setCookie = null;
  if (Date.parse(row.expires_at) < Date.now() + (SESSION_DAYS - 1) * DAY_MS) {
    await env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?')
      .bind(expiryFromNow(), tokenHash)
      .run();
    setCookie = sessionCookie(request, token);
  }

  return { user: toUser(row), tokenHash, setCookie };
}

/** Throw 429 when the client exceeds the auth rate limit */
async function rateLimit(request, env, action) {
  if (!env.AUTH_LIMITER) return;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const { success } = await env.AUTH_LIMITER.limit({ key: `${action}:${ip}` });
  if (!success) throw new HttpError(429, 'Too many attempts. Please wait a minute and try again.');
}

/** local@domain.tld with no spaces — deliberately loose, since addresses are never mailed */
function looksLikeEmail(email) {
  const parts = email.split('@');
  if (parts.length !== 2 || /\s/.test(email)) return false;
  const [local, domain] = parts;
  const dot = domain.lastIndexOf('.');
  return local.length > 0 && dot > 0 && dot < domain.length - 1;
}

function validateEmail(value) {
  if (typeof value !== 'string') throw new HttpError(400, 'Email is required');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !looksLikeEmail(email)) {
    throw new HttpError(400, 'Please enter a valid email address');
  }
  return email;
}

function validatePassword(value) {
  if (typeof value !== 'string' || value.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`);
  }
  return value;
}

/**
 * PBKDF2 iterations for new hashes: the PASSWORD_ITERATIONS var (wrangler.jsonc), capped at
 * the runtime maximum. Lower it if sign-ins hit the Free plan's CPU limit (error 1102).
 */
function passwordIterations(env) {
  const configured = Number(env.PASSWORD_ITERATIONS);
  if (!Number.isInteger(configured) || configured < 10_000) return MAX_ITERATIONS;
  return Math.min(configured, MAX_ITERATIONS);
}

function requireSession(session) {
  if (!session) throw new HttpError(401, 'Not authenticated');
  return session;
}

// ============================================================================
// Route handlers
// ============================================================================

/** GET /api/auth/session — current user, or null */
export function handleGetSession(_request, _env, session) {
  return json({ user: session?.user ?? null });
}

/** POST /api/auth/anonymous — create a guest user and sign in as it */
export async function handleAnonymous(request, env, session) {
  if (session) return json({ user: session.user });
  await rateLimit(request, env, 'anonymous');

  const userId = crypto.randomUUID();
  const { statement, token } = await newSessionStatement(env, userId);
  await env.DB.batch([env.DB.prepare('INSERT INTO users (id) VALUES (?)').bind(userId), statement]);

  return json(
    { user: { id: userId, email: null, isAnonymous: true } },
    { status: 201, headers: { 'Set-Cookie': sessionCookie(request, token) } }
  );
}

/** POST /api/auth/login — sign in with email + password */
export async function handleLogin(request, env, session) {
  const body = await readJson(request);
  await rateLimit(request, env, 'login');
  const email = validateEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  const row = await env.DB.prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
    .bind(email)
    .first();
  const valid = await verifyPassword(
    password,
    row?.password_hash ?? dummyHash(passwordIterations(env))
  );
  if (!row || !valid) throw new HttpError(401, 'Invalid email or password');

  const { statement, token } = await newSessionStatement(env, row.id);
  const statements = [statement];
  // Signing in from a guest session: move the guest's children into the account,
  // otherwise they'd be stranded and deleted with the guest by the daily cleanup
  const moveFrom = session?.user.isAnonymous && session.user.id !== row.id ? session.user.id : null;
  if (moveFrom) statements.push(...moveGuestDataStatements(env, moveFrom, row.id));
  // Replace the current session (usually a guest one) rather than leaving it behind
  if (session) {
    statements.push(
      env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(session.tokenHash)
    );
  }
  const results = await env.DB.batch(statements);
  const movedChildren = moveFrom ? results[1].meta.changes : 0;

  return json(
    { user: toUser(row), movedChildren },
    { headers: { 'Set-Cookie': sessionCookie(request, token) } }
  );
}

/**
 * Hand a guest's data over to an account: their children (measurements follow the
 * child) and the children others shared with them. Guests can't make share links.
 * The first statement moves the children, so its change count is the number moved.
 */
function moveGuestDataStatements(env, guestId, accountId) {
  return [
    env.DB.prepare('UPDATE children SET user_id = ? WHERE user_id = ?').bind(accountId, guestId),
    // OR IGNORE: the account may already see that child; the guest's copy goes with the guest
    env.DB.prepare('UPDATE OR IGNORE shared_child_access SET user_id = ? WHERE user_id = ?').bind(
      accountId,
      guestId
    ),
    // Access the account had to children it now owns is pointless
    env.DB.prepare(
      `DELETE FROM shared_child_access
        WHERE user_id = ?
          AND child_id IN (SELECT id FROM children WHERE user_id = ?)`
    ).bind(accountId, accountId)
  ];
}

/** POST /api/auth/claim — turn the current guest user into a full account */
export async function handleClaim(request, env, session) {
  const { user } = requireSession(session);
  if (!user.isAnonymous) throw new HttpError(400, 'This account is already saved');

  const body = await readJson(request);
  await rateLimit(request, env, 'claim');
  const email = validateEmail(body.email);
  const password = validatePassword(body.password);
  const passwordHash = await hashPassword(password, passwordIterations(env));

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) throw new HttpError(409, 'An account with this email already exists');

  try {
    const result = await env.DB.prepare(
      'UPDATE users SET email = ?, password_hash = ?, updated_at = ? WHERE id = ? AND email IS NULL'
    )
      .bind(email, passwordHash, nowIso(), user.id)
      .run();
    if (result.meta.changes === 0) throw new HttpError(400, 'This account is already saved');
  } catch (err) {
    if (String(err?.message).includes('UNIQUE')) {
      throw new HttpError(409, 'An account with this email already exists');
    }
    throw err;
  }

  return json({ user: { id: user.id, email, isAnonymous: false } });
}

/** POST /api/auth/password — change the password (requires the current one) */
export async function handleChangePassword(request, env, session) {
  const { user, tokenHash } = requireSession(session);
  if (user.isAnonymous) throw new HttpError(400, 'Save your account before setting a password');

  const body = await readJson(request);
  await rateLimit(request, env, 'password');
  const newPassword = validatePassword(body.newPassword);

  const row = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?')
    .bind(user.id)
    .first();
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  if (!row || !(await verifyPassword(currentPassword, row.password_hash))) {
    throw new HttpError(401, 'Current password is incorrect');
  }

  // Set the new hash and sign out every other device
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').bind(
      await hashPassword(newPassword, passwordIterations(env)),
      nowIso(),
      user.id
    ),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(
      user.id,
      tokenHash
    )
  ]);

  return json({ ok: true });
}

/** POST /api/auth/logout — end the current session */
export async function handleLogout(request, env, session) {
  if (session) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(session.tokenHash).run();
  }
  return json({ ok: true }, { headers: { 'Set-Cookie': clearedCookie(request) } });
}

/**
 * Daily cleanup: drop expired sessions, then guest users nobody can sign in as any more.
 * @returns {Promise<{sessions: number, guests: number}>}
 */
export async function cleanupExpired(env) {
  const [sessions, guests] = await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(nowIso()),
    env.DB.prepare(
      `DELETE FROM users
        WHERE email IS NULL
          AND NOT EXISTS (SELECT 1 FROM sessions WHERE sessions.user_id = users.id)`
    )
  ]);
  return { sessions: sessions.meta.changes, guests: guests.meta.changes };
}
