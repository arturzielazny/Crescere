/**
 * Crescere Worker: JSON API under /api/*, backed by D1.
 * Everything else is served from the static assets (the Svelte SPA).
 */

import { HttpError, json } from './http.js';
import * as auth from './auth.js';
import * as data from './data.js';

const ID = '([0-9a-f-]{36})';

/**
 * [method, path pattern, handler, requires a signed-in user]
 * Handlers receive (request, env, session, pathParams).
 */
const routes = [
  ['GET', '/api/auth/session', auth.handleGetSession, false],
  ['POST', '/api/auth/anonymous', auth.handleAnonymous, false],
  ['POST', '/api/auth/login', auth.handleLogin, false],
  ['POST', '/api/auth/claim', auth.handleClaim, false],
  ['POST', '/api/auth/password', auth.handleChangePassword, false],
  ['POST', '/api/auth/logout', auth.handleLogout, false],

  ['GET', '/api/children', data.listChildren, true],
  ['POST', '/api/children', data.createChild, true],
  ['PATCH', `/api/children/${ID}`, data.updateChild, true],
  ['DELETE', `/api/children/${ID}`, data.deleteChild, true],
  ['POST', `/api/children/${ID}/measurements`, data.createMeasurement, true],
  ['PATCH', `/api/measurements/${ID}`, data.updateMeasurement, true],
  ['DELETE', `/api/measurements/${ID}`, data.deleteMeasurement, true],

  ['GET', '/api/preferences', data.getPreferences, true],
  ['PUT', '/api/preferences', data.setPreferences, true],

  ['GET', `/api/children/${ID}/shares`, data.listShares, true],
  ['POST', `/api/children/${ID}/shares`, data.createShare, true],
  ['DELETE', `/api/shares/${ID}`, data.revokeShare, true],
  ['POST', '/api/shares/accept', data.acceptShare, true],
  ['GET', '/api/shared-children', data.listSharedChildren, true],
  ['DELETE', `/api/shared-children/${ID}`, data.removeSharedChild, true]
].map(([method, path, handler, needsUser]) => ({
  method,
  pattern: new RegExp(`^${path}$`),
  handler,
  needsUser
}));

/**
 * Reject cross-site writes. Cookies are SameSite=Lax already; this also covers
 * same-site subdomains and requires a JSON body so plain HTML forms can't post.
 */
function checkWriteRequest(request, url) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) throw new HttpError(403, 'Cross-origin request rejected');
  const type = request.headers.get('Content-Type') || '';
  if (!type.startsWith('application/json')) {
    throw new HttpError(415, 'Expected Content-Type: application/json');
  }
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const candidates = routes.filter((r) => r.pattern.test(url.pathname));
  if (candidates.length === 0) throw new HttpError(404, 'Not found');
  const route = candidates.find((r) => r.method === request.method);
  if (!route) throw new HttpError(405, 'Method not allowed');

  if (request.method !== 'GET') checkWriteRequest(request, url);

  const session = await auth.getSession(request, env);
  if (route.needsUser && !session) throw new HttpError(401, 'Not authenticated');

  const params = url.pathname.match(route.pattern).slice(1);
  const response = await route.handler(request, env, session, params);

  // Sliding session renewal, unless the handler already set or cleared the cookie
  if (session?.setCookie && !response.headers.has('Set-Cookie')) {
    response.headers.append('Set-Cookie', session.setCookie);
  }
  return response;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }
    try {
      return await handleApi(request, env);
    } catch (err) {
      if (err instanceof HttpError) {
        return json({ error: err.message }, { status: err.status });
      }
      console.error('Unhandled error:', err);
      return json({ error: 'Internal server error' }, { status: 500 });
    }
  },

  async scheduled(_controller, env) {
    const removed = await auth.cleanupExpired(env);
    console.log('Cleanup:', removed);
  }
};
