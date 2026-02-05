/**
 * Auth store for managing authentication state
 */

import { writable, derived } from 'svelte/store';
import { supabase } from '../lib/supabaseClient.js';

// Auth state
const authState = writable({
  user: null,
  session: null,
  loading: true,
  error: null
});

// Derived stores for convenience
export const user = derived(authState, ($state) => $state.user);
export const session = derived(authState, ($state) => $state.session);
export const loading = derived(authState, ($state) => $state.loading);
export const error = derived(authState, ($state) => $state.error);
export const isAuthenticated = derived(authState, ($state) => !!$state.user);
export const isAnonymous = derived(
  authState,
  ($state) =>
    $state.user?.is_anonymous === true || $state.user?.app_metadata?.provider === 'anonymous'
);

/**
 * Initialize auth - call once on app load
 * Sets up session listener and restores existing session
 */
export async function initAuth() {
  authState.update((s) => ({ ...s, loading: true, error: null }));

  try {
    // Get initial session
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;

    authState.set({
      user: session?.user ?? null,
      session: session,
      loading: false,
      error: null
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      authState.set({
        user: session?.user ?? null,
        session: session,
        loading: false,
        error: null
      });
    });
  } catch (err) {
    authState.set({
      user: null,
      session: null,
      loading: false,
      error: err.message
    });
  }
}

/**
 * Wraps an auth operation with loading/error state management.
 * Sets loading=true before, loading=false after, captures errors.
 * @param {() => Promise<{data?: any, error?: any}>} fn - Supabase auth call
 * @param {(data: any) => void} [onSuccess] - Optional callback to set auth state on success
 */
async function withAuthLoading(fn, onSuccess) {
  authState.update((s) => ({ ...s, loading: true, error: null }));
  try {
    const result = await fn();
    const { data, error } = result;
    if (error) throw error;
    if (onSuccess) {
      onSuccess(data);
    } else {
      authState.update((s) => ({ ...s, loading: false }));
    }
    return data;
  } catch (err) {
    authState.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/** Set full auth state from a supabase response with user+session */
function setAuthSession(data) {
  authState.set({
    user: data.user,
    session: data.session,
    loading: false,
    error: null
  });
}

/** Sign in anonymously — creates a new anonymous user */
export function signInAnonymously() {
  return withAuthLoading(() => supabase.auth.signInAnonymously(), setAuthSession);
}

/** Sign in with email (magic link) */
export function signInWithEmail(email) {
  return withAuthLoading(() =>
    supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    })
  );
}

/** Sign in with email and password */
export function signInWithPassword(email, password) {
  return withAuthLoading(
    () => supabase.auth.signInWithPassword({ email, password }),
    setAuthSession
  );
}

/** Sign up with email and password */
export function signUpWithPassword(email, password) {
  return withAuthLoading(() =>
    supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    })
  );
}

/** Link anonymous account to email */
export function linkWithEmail(email) {
  return withAuthLoading(() => supabase.auth.updateUser({ email }));
}

/** Link anonymous account with email and password */
export function linkWithPassword(email, password) {
  return withAuthLoading(() => supabase.auth.updateUser({ email, password }));
}

/** Sign out the current user */
export function signOut() {
  return withAuthLoading(
    () => supabase.auth.signOut(),
    () => authState.set({ user: null, session: null, loading: false, error: null })
  );
}

/**
 * Clear any auth error
 */
export function clearError() {
  authState.update((s) => ({ ...s, error: null }));
}
