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
 * Sign in anonymously
 * Creates a new anonymous user that can later be linked to a real account
 */
export async function signInAnonymously() {
  authState.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) throw error;

    authState.set({
      user: data.user,
      session: data.session,
      loading: false,
      error: null
    });

    return data;
  } catch (err) {
    authState.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Sign in with Google OAuth
 * For anonymous users, this links their account; for new users, creates an account
 */
export async function signInWithGoogle() {
  authState.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) throw error;
    return data;
  } catch (err) {
    authState.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Link anonymous account to Google
 * Preserves all data when claiming an anonymous account
 */
export async function linkWithGoogle() {
  authState.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) throw error;
    return data;
  } catch (err) {
    authState.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  authState.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    authState.set({
      user: null,
      session: null,
      loading: false,
      error: null
    });
  } catch (err) {
    authState.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Clear any auth error
 */
export function clearError() {
  authState.update((s) => ({ ...s, error: null }));
}
