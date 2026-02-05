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
 * Sign in with email (magic link)
 * Sends a passwordless login link to the user's email
 */
export async function signInWithEmail(email) {
  authState.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) throw error;
    authState.update((s) => ({ ...s, loading: false }));
    return data;
  } catch (err) {
    authState.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(email, password) {
  authState.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

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
 * Sign up with email and password
 */
export async function signUpWithPassword(email, password) {
  authState.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) throw error;
    authState.update((s) => ({ ...s, loading: false }));
    return data;
  } catch (err) {
    authState.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Link anonymous account to email
 * Uses updateUser to preserve the anonymous user's ID and data
 */
export async function linkWithEmail(email) {
  authState.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const { data, error } = await supabase.auth.updateUser({ email });

    if (error) throw error;
    authState.update((s) => ({ ...s, loading: false }));
    return data;
  } catch (err) {
    authState.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Link anonymous account with email and password
 * Uses updateUser to preserve the anonymous user's ID and data
 */
export async function linkWithPassword(email, password) {
  authState.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const { data, error } = await supabase.auth.updateUser({ email, password });

    if (error) throw error;
    authState.update((s) => ({ ...s, loading: false }));
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
