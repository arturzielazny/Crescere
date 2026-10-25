/**
 * Test helper: a fake browser that talks to the Worker with its own cookie jar.
 * `use()` installs it as the global fetch, so the real client in src/lib/api.js
 * can be exercised against the Worker and a real D1 database.
 */

import { exports } from 'cloudflare:workers';
import { vi } from 'vitest';

export const ORIGIN = 'https://crescere.test';

let ipCounter = 0;

export function createBrowser() {
  let cookie = null;
  // Each browser gets its own client IP so rate limits don't leak between tests
  const ip = `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;

  async function browserFetch(input, init = {}) {
    const url = new URL(input, ORIGIN);
    const headers = new Headers(init.headers);
    if (cookie) headers.set('Cookie', cookie);
    headers.set('CF-Connecting-IP', ip);
    if (init.method && init.method !== 'GET') headers.set('Origin', ORIGIN);

    const response = await exports.default.fetch(new Request(url, { ...init, headers }));

    const setCookie = response.headers.get('Set-Cookie');
    if (setCookie) {
      const pair = setCookie.split(';')[0];
      cookie = pair.endsWith('=') ? null : pair;
    }
    return response;
  }

  return {
    fetch: browserFetch,
    /** Make this browser the one src/lib/api.js talks through */
    use() {
      vi.stubGlobal('fetch', browserFetch);
    },
    get cookie() {
      return cookie;
    },
    set cookie(value) {
      cookie = value;
    },
    /** JSON request helper returning { status, body, headers } */
    async json(method, path, body) {
      const response = await browserFetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      return { status: response.status, body: await response.json(), headers: response.headers };
    }
  };
}

let emailCounter = 0;

/** Unique email per call so tests don't collide in the shared database */
export function uniqueEmail(prefix = 'user') {
  return `${prefix}-${Date.now()}-${++emailCounter}@example.com`;
}
