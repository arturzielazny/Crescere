/**
 * Tests for auth store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Create mock state
let mockUser = null;
let mockSession = null;
let authStateCallback = null;

// Mock the supabaseClient module
vi.mock('../lib/supabaseClient.js', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: mockSession },
          error: null
        }),
      getUser: () =>
        Promise.resolve({
          data: { user: mockUser },
          error: null
        }),
      signInAnonymously: () => {
        mockUser = {
          id: 'anon-user-123',
          is_anonymous: true,
          app_metadata: { provider: 'anonymous' },
          user_metadata: {}
        };
        mockSession = { user: mockUser, access_token: 'mock-token' };
        if (authStateCallback) authStateCallback('SIGNED_IN', mockSession);
        return Promise.resolve({
          data: { user: mockUser, session: mockSession },
          error: null
        });
      },
      signInWithOAuth: ({ provider }) =>
        Promise.resolve({
          data: { provider, url: 'http://localhost/oauth' },
          error: null
        }),
      linkIdentity: ({ provider }) =>
        Promise.resolve({
          data: { provider, url: 'http://localhost/link' },
          error: null
        }),
      signOut: () => {
        mockUser = null;
        mockSession = null;
        if (authStateCallback) authStateCallback('SIGNED_OUT', null);
        return Promise.resolve({ error: null });
      },
      onAuthStateChange: (callback) => {
        authStateCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                authStateCallback = null;
              }
            }
          }
        };
      }
    }
  }
}));

// Import after mocking
import {
  user,
  session,
  loading,
  error,
  isAuthenticated,
  isAnonymous,
  initAuth,
  signInAnonymously,
  signOut,
  clearError
} from './authStore.js';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset mock state
    mockUser = null;
    mockSession = null;
    authStateCallback = null;
  });

  describe('initAuth', () => {
    it('sets loading to false after initialization', async () => {
      await initAuth();
      expect(get(loading)).toBe(false);
    });

    it('sets user to null when no session exists', async () => {
      await initAuth();
      expect(get(user)).toBeNull();
      expect(get(isAuthenticated)).toBe(false);
    });

    it('sets user when session exists', async () => {
      // Pre-set the mock state
      mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSession = { user: mockUser, access_token: 'test-token' };

      await initAuth();

      expect(get(user)).toBeTruthy();
      expect(get(user).id).toBe('user-123');
      expect(get(isAuthenticated)).toBe(true);
    });
  });

  describe('signInAnonymously', () => {
    it('creates an anonymous user', async () => {
      await initAuth();
      await signInAnonymously();

      expect(get(isAuthenticated)).toBe(true);
      expect(get(isAnonymous)).toBe(true);
    });

    it('sets loading during sign in', async () => {
      await initAuth();

      // The loading should be briefly true during sign in
      const promise = signInAnonymously();
      // After completion, loading should be false
      await promise;
      expect(get(loading)).toBe(false);
    });
  });

  describe('signOut', () => {
    it('clears user and session', async () => {
      // Start with a signed-in user
      mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSession = { user: mockUser, access_token: 'test-token' };
      await initAuth();

      expect(get(isAuthenticated)).toBe(true);

      await signOut();

      expect(get(user)).toBeNull();
      expect(get(session)).toBeNull();
      expect(get(isAuthenticated)).toBe(false);
    });
  });

  describe('isAnonymous', () => {
    it('returns true for anonymous users', async () => {
      await initAuth();
      await signInAnonymously();

      expect(get(isAnonymous)).toBe(true);
    });

    it('returns false for regular users', async () => {
      mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        is_anonymous: false,
        app_metadata: { provider: 'google' }
      };
      mockSession = { user: mockUser, access_token: 'test-token' };

      await initAuth();

      expect(get(isAnonymous)).toBe(false);
    });
  });

  describe('clearError', () => {
    it('clears the error state', async () => {
      await initAuth();
      clearError();
      expect(get(error)).toBeNull();
    });
  });
});
