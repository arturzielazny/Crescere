/**
 * Worker auth tests: guest users, claiming, sign-in, password change,
 * sessions and cleanup — against a real local D1 database.
 */

import { env } from 'cloudflare:test';
import { exports } from 'cloudflare:workers';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createBrowser, uniqueEmail, ORIGIN } from './browser.js';
import { hashPassword, verifyPassword } from '../password.js';
import { cleanupExpired } from '../auth.js';
import * as api from '../../src/lib/api.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Guest browser that has claimed an account; returns { browser, email, password, user } */
async function savedAccount(password = 'secret123') {
  const browser = createBrowser();
  browser.use();
  await api.signInAnonymously();
  const email = uniqueEmail();
  const user = await api.claimAccount(email, password);
  return { browser, email, password, user };
}

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const stored = await hashPassword('correct horse');
    expect(stored).toMatch(/^pbkdf2-sha256\$100000\$/);
    expect(await verifyPassword('correct horse', stored)).toBe(true);
    expect(await verifyPassword('wrong horse', stored)).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
  });
});

describe('guest users', () => {
  it('has no user without a session cookie', async () => {
    createBrowser().use();
    expect(await api.getSessionUser()).toBeNull();
  });

  it('creates a guest user and keeps it signed in', async () => {
    const browser = createBrowser();
    browser.use();

    const guest = await api.signInAnonymously();
    expect(guest).toMatchObject({ email: null, isAnonymous: true });
    expect(browser.cookie).toMatch(/^crescere_session=/);
    expect(await api.getSessionUser()).toEqual(guest);
  });

  it('sets an HttpOnly, SameSite=Lax, Secure cookie over HTTPS', async () => {
    const res = await createBrowser().json('POST', '/api/auth/anonymous');
    const cookie = res.headers.get('Set-Cookie');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('Path=/');
  });

  it('returns the existing user instead of creating another one', async () => {
    createBrowser().use();
    const first = await api.signInAnonymously();
    const second = await api.signInAnonymously();
    expect(second.id).toBe(first.id);
  });

  it('stores only a hash of the session token', async () => {
    const browser = createBrowser();
    browser.use();
    const guest = await api.signInAnonymously();
    const token = browser.cookie.split('=')[1];

    const row = await env.DB.prepare('SELECT token_hash FROM sessions WHERE user_id = ?')
      .bind(guest.id)
      .first();
    expect(row.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.token_hash).not.toBe(token);
  });
});

describe('claiming a guest account', () => {
  it('keeps the same user id and all data', async () => {
    createBrowser().use();
    const guest = await api.signInAnonymously();
    const childId = await api.createChild({ name: 'Zosia', birthDate: '2025-01-10', sex: 2 });
    await api.createMeasurement(childId, { date: '2025-02-10', weight: 4200 });

    const email = uniqueEmail('claim');
    const saved = await api.claimAccount(email, 'secret123');

    expect(saved).toEqual({ id: guest.id, email, isAnonymous: false });
    expect(await api.getSessionUser()).toEqual(saved);
    const children = await api.fetchChildren();
    expect(children).toHaveLength(1);
    expect(children[0].id).toBe(childId);
    expect(children[0].measurements).toHaveLength(1);
  });

  it('lets the claimed account sign in from another browser', async () => {
    const { email, password, user } = await savedAccount();

    createBrowser().use();
    const signedIn = await api.signInWithPassword(email, password);
    expect(signedIn.id).toBe(user.id);
  });

  it('normalizes the email to lower case', async () => {
    createBrowser().use();
    await api.signInAnonymously();
    const email = uniqueEmail('MiXeD');
    const saved = await api.claimAccount(`  ${email.toUpperCase()} `, 'secret123');
    expect(saved.email).toBe(email.toLowerCase());
  });

  it('rejects a short password', async () => {
    createBrowser().use();
    await api.signInAnonymously();
    await expect(api.claimAccount(uniqueEmail(), 'short')).rejects.toMatchObject({
      status: 400,
      message: 'Password must be at least 6 characters'
    });
    expect((await api.getSessionUser()).isAnonymous).toBe(true);
  });

  it('rejects an invalid email', async () => {
    createBrowser().use();
    await api.signInAnonymously();
    await expect(api.claimAccount('not-an-email', 'secret123')).rejects.toMatchObject({
      status: 400
    });
  });

  it('rejects an email that is already used, in any letter case', async () => {
    const { email } = await savedAccount();

    createBrowser().use();
    await api.signInAnonymously();
    await expect(api.claimAccount(email.toUpperCase(), 'secret123')).rejects.toMatchObject({
      status: 409
    });
  });

  it('rejects claiming an account that is already saved', async () => {
    await savedAccount();
    await expect(api.claimAccount(uniqueEmail(), 'secret123')).rejects.toMatchObject({
      status: 400
    });
  });

  it('requires a session', async () => {
    createBrowser().use();
    await expect(api.claimAccount(uniqueEmail(), 'secret123')).rejects.toMatchObject({
      status: 401
    });
  });
});

describe('signing in', () => {
  it('rejects a wrong password and an unknown email with the same message', async () => {
    const { email } = await savedAccount();
    createBrowser().use();

    await expect(api.signInWithPassword(email, 'wrong-password')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid email or password'
    });
    await expect(api.signInWithPassword(uniqueEmail('nobody'), 'secret123')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid email or password'
    });
  });

  it('accepts the email in any letter case', async () => {
    const { email, password, user } = await savedAccount();
    createBrowser().use();
    const signedIn = await api.signInWithPassword(email.toUpperCase(), password);
    expect(signedIn.id).toBe(user.id);
  });

  it('replaces the guest session it was started from', async () => {
    const { email, password } = await savedAccount();

    const browser = createBrowser();
    browser.use();
    await api.signInAnonymously();
    const guestCookie = browser.cookie;

    await api.signInWithPassword(email, password);
    expect(browser.cookie).not.toBe(guestCookie);

    // The old guest cookie no longer works
    browser.cookie = guestCookie;
    expect(await api.getSessionUser()).toBeNull();
  });

  it('rate limits repeated attempts from one client', async () => {
    const browser = createBrowser();
    const statuses = [];
    for (let i = 0; i < 12; i++) {
      const res = await browser.json('POST', '/api/auth/login', {
        email: 'nobody@example.com',
        password: 'whatever'
      });
      statuses.push(res.status);
    }
    expect(statuses).toContain(401);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe('changing the password', () => {
  it('requires the current password', async () => {
    await savedAccount();
    await expect(api.changePassword('wrong-current', 'newsecret')).rejects.toMatchObject({
      status: 401,
      message: 'Current password is incorrect'
    });
  });

  it('switches to the new password and signs out other devices', async () => {
    const { browser, email, password } = await savedAccount();

    const otherDevice = createBrowser();
    otherDevice.use();
    await api.signInWithPassword(email, password);

    browser.use();
    await api.changePassword(password, 'brand-new-secret');
    expect(await api.getSessionUser()).toMatchObject({ email });

    otherDevice.use();
    expect(await api.getSessionUser()).toBeNull();
    await expect(api.signInWithPassword(email, password)).rejects.toMatchObject({ status: 401 });
    expect(await api.signInWithPassword(email, 'brand-new-secret')).toMatchObject({ email });
  });

  it('is not available to guests', async () => {
    createBrowser().use();
    await api.signInAnonymously();
    await expect(api.changePassword('', 'newsecret')).rejects.toMatchObject({ status: 400 });
  });
});

describe('signing out', () => {
  it('ends the session and clears the cookie', async () => {
    const { browser } = await savedAccount();
    const cookie = browser.cookie;

    await api.signOut();
    expect(browser.cookie).toBeNull();
    expect(await api.getSessionUser()).toBeNull();

    browser.cookie = cookie;
    expect(await api.getSessionUser()).toBeNull();
  });
});

describe('sessions', () => {
  it('pushes the expiry forward and re-sends the cookie once a day', async () => {
    const browser = createBrowser();
    browser.use();
    const guest = await api.signInAnonymously();

    // Fresh session: no renewal
    const fresh = await browser.json('GET', '/api/auth/session');
    expect(fresh.headers.get('Set-Cookie')).toBeNull();

    // Pretend the session was last renewed 10 days ago
    const soon = new Date(Date.now() + 390 * 24 * 60 * 60 * 1000).toISOString();
    await env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE user_id = ?')
      .bind(soon, guest.id)
      .run();

    const renewed = await browser.json('GET', '/api/auth/session');
    expect(renewed.headers.get('Set-Cookie')).toMatch(/^crescere_session=/);
    const row = await env.DB.prepare('SELECT expires_at FROM sessions WHERE user_id = ?')
      .bind(guest.id)
      .first();
    expect(row.expires_at > soon).toBe(true);
  });

  it('rejects an expired session', async () => {
    const browser = createBrowser();
    browser.use();
    const guest = await api.signInAnonymously();
    await env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE user_id = ?')
      .bind('2000-01-01T00:00:00.000Z', guest.id)
      .run();
    expect(await api.getSessionUser()).toBeNull();
  });
});

describe('request checks', () => {
  it('rejects cross-origin writes', async () => {
    const res = await exports.default.fetch(
      new Request(`${ORIGIN}/api/auth/anonymous`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }
      })
    );
    expect(res.status).toBe(403);
  });

  it('rejects writes that are not JSON (e.g. HTML form posts)', async () => {
    const res = await exports.default.fetch(
      new Request(`${ORIGIN}/api/auth/anonymous`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: ORIGIN }
      })
    );
    expect(res.status).toBe(415);
  });

  it('requires a session for data routes', async () => {
    const res = await createBrowser().json('GET', '/api/children');
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown API routes and 405 for wrong methods', async () => {
    const browser = createBrowser();
    expect((await browser.json('GET', '/api/nope')).status).toBe(404);
    expect((await browser.json('DELETE', '/api/children')).status).toBe(405);
  });
});

describe('daily cleanup', () => {
  it('removes expired sessions and guests nobody can sign in as, keeping saved accounts', async () => {
    // Guest whose only session has expired, with a child
    createBrowser().use();
    const abandoned = await api.signInAnonymously();
    await api.createChild({ name: 'Gone', birthDate: '2025-01-01', sex: 1 });
    await env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE user_id = ?')
      .bind('2000-01-01T00:00:00.000Z', abandoned.id)
      .run();

    // Active guest
    createBrowser().use();
    const active = await api.signInAnonymously();

    // Saved account that is signed out everywhere
    const { user: saved } = await savedAccount();
    await api.signOut();

    await cleanupExpired(env);

    const ids = (await env.DB.prepare('SELECT id FROM users').all()).results.map((r) => r.id);
    expect(ids).not.toContain(abandoned.id);
    expect(ids).toContain(active.id);
    expect(ids).toContain(saved.id);
    const orphaned = await env.DB.prepare('SELECT COUNT(*) AS n FROM children WHERE user_id = ?')
      .bind(abandoned.id)
      .first();
    expect(orphaned.n).toBe(0);
  });
});
