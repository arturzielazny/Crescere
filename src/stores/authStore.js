/**
 * Auth store for managing authentication state
 */

import { writable, derived } from 'svelte/store';
import * as api from '../lib/api.js';

// Auth state
const authState = writable({
  user: null,
  loading: true,
  error: null
});

// Derived stores for convenience
export const user = derived(authState, ($state) => $state.user);
export const loading = derived(authState, ($state) => $state.loading);
export const error = derived(authState, ($state) => $state.error);
export const isAuthenticated = derived(authState, ($state) => !!$state.user);
export const isAnonymous = derived(authState, ($state) => $state.user?.isAnonymous === true);

/**
 * Initialize auth - call once on app load
 * Restores the existing session from the session cookie, if any
 */
export async function initAuth() {
  authState.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const currentUser = await api.getSessionUser();
    authState.set({ user: currentUser, loading: false, error: null });
  } catch (err) {
    authState.set({ user: null, loading: false, error: err.message });
  }
}

/** Rate limiting: track last call time per action to prevent rapid-fire requests */
const AUTH_COOLDOWN_MS = 2000;
const lastCallTime = new Map();

/**
 * Wraps an auth operation with loading/error state management and rate limiting.
 * Sets loading=true before, loading=false after, captures errors.
 * @param {() => Promise<any>} fn - API call
 * @param {(result: any) => void} [onSuccess] - Optional callback to set auth state on success
 * @param {{ key?: string, cooldown?: number }} [opts] - Rate limiting options
 */
async function withAuthLoading(fn, onSuccess, opts = {}) {
  const key = opts.key || fn.toString();
  const cooldown = opts.cooldown ?? AUTH_COOLDOWN_MS;
  const now = Date.now();
  const last = lastCallTime.get(key) || 0;

  if (now - last < cooldown) {
    const err = new Error('Please wait before trying again');
    authState.update((s) => ({ ...s, error: err.message }));
    throw err;
  }

  authState.update((s) => ({ ...s, loading: true, error: null }));
  try {
    const result = await fn();
    lastCallTime.set(key, now);
    if (onSuccess) {
      onSuccess(result);
    } else {
      authState.update((s) => ({ ...s, loading: false }));
    }
    return result;
  } catch (err) {
    authState.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/** Set the signed-in user from an API response */
function setAuthUser(newUser) {
  authState.set({ user: newUser, loading: false, error: null });
}

/** Sign in anonymously — creates a new guest user */
export function signInAnonymously() {
  return withAuthLoading(() => api.signInAnonymously(), setAuthUser, {
    key: 'signInAnonymously'
  });
}

/** Sign in with email and password */
export function signInWithPassword(email, password) {
  return withAuthLoading(() => api.signInWithPassword(email, password), setAuthUser, {
    key: 'signInWithPassword'
  });
}

/** Save the guest account with email and password (keeps all data) */
export function claimAccount(email, password) {
  return withAuthLoading(() => api.claimAccount(email, password), setAuthUser, {
    key: 'claimAccount'
  });
}

/** Change the password of a saved account */
export function changePassword(currentPassword, newPassword) {
  return withAuthLoading(() => api.changePassword(currentPassword, newPassword), null, {
    key: 'changePassword'
  });
}

/** Sign out the current user */
export function signOut() {
  return withAuthLoading(
    () => api.signOut(),
    () => authState.set({ user: null, loading: false, error: null }),
    { key: 'signOut' }
  );
}

/**
 * Clear any auth error
 */
export function clearError() {
  authState.update((s) => ({ ...s, error: null }));
}

/** Reset rate limit state (for testing) */
export function resetRateLimit() {
  lastCallTime.clear();
}
