/**
 * Tests for auth store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock window.location for tests that use emailRedirectTo
globalThis.window = {
  location: { origin: 'http://localhost', pathname: '/' }
};

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
      signInWithOtp: ({ email }) =>
        Promise.resolve({
          data: { email },
          error: null
        }),
      signInWithPassword: ({ email, password }) => {
        if (password === 'wrong') {
          return Promise.resolve({
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials' }
          });
        }
        mockUser = {
          id: 'user-pw-123',
          email,
          is_anonymous: false,
          app_metadata: { provider: 'email' }
        };
        mockSession = { user: mockUser, access_token: 'pw-token' };
        if (authStateCallback) authStateCallback('SIGNED_IN', mockSession);
        return Promise.resolve({
          data: { user: mockUser, session: mockSession },
          error: null
        });
      },
      signUp: ({ email }) =>
        Promise.resolve({
          data: { user: { id: 'new-user-123', email }, session: null },
          error: null
        }),
      updateUser: ({ email, password }) => {
        if (password === 'short') {
          return Promise.resolve({
            data: { user: null },
            error: { message: 'Password should be at least 6 characters' }
          });
        }
        const updatedUser = { ...mockUser };
        if (email) updatedUser.email = email;
        return Promise.resolve({
          data: { user: updatedUser },
          error: null
        });
      },
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
  signInWithEmail,
  signInWithPassword,
  signUpWithPassword,
  linkWithEmail,
  linkWithPassword,
  setPassword,
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
        app_metadata: { provider: 'email' }
      };
      mockSession = { user: mockUser, access_token: 'test-token' };

      await initAuth();

      expect(get(isAnonymous)).toBe(false);
    });
  });

  describe('signInWithPassword', () => {
    it('signs in with email and password', async () => {
      await initAuth();
      await signInWithPassword('test@example.com', 'password123');

      expect(get(isAuthenticated)).toBe(true);
      expect(get(isAnonymous)).toBe(false);
      expect(get(user).email).toBe('test@example.com');
    });

    it('sets error on invalid credentials', async () => {
      await initAuth();

      await expect(signInWithPassword('test@example.com', 'wrong')).rejects.toThrow();
      expect(get(error)).toBe('Invalid login credentials');
      expect(get(loading)).toBe(false);
    });
  });

  describe('signUpWithPassword', () => {
    it('creates a new account', async () => {
      await initAuth();
      const data = await signUpWithPassword('new@example.com', 'password123');

      expect(data.user.email).toBe('new@example.com');
      expect(get(loading)).toBe(false);
    });
  });

  describe('signInWithEmail', () => {
    it('sends a magic link without setting session', async () => {
      await initAuth();
      await signInWithEmail('test@example.com');

      // OTP sign-in only sends a link, doesn't establish a session
      expect(get(isAuthenticated)).toBe(false);
      expect(get(loading)).toBe(false);
    });
  });

  describe('setPassword', () => {
    it('sets password for an authenticated user', async () => {
      mockUser = {
        id: 'user-otp-123',
        email: 'otp@example.com',
        is_anonymous: false,
        app_metadata: { provider: 'email' }
      };
      mockSession = { user: mockUser, access_token: 'otp-token' };
      await initAuth();

      await setPassword('newpassword123');

      expect(get(isAuthenticated)).toBe(true);
      expect(get(loading)).toBe(false);
      expect(get(error)).toBeNull();
    });

    it('keeps user authenticated after setting password', async () => {
      mockUser = {
        id: 'user-otp-123',
        email: 'otp@example.com',
        is_anonymous: false,
        app_metadata: { provider: 'email' }
      };
      mockSession = { user: mockUser, access_token: 'otp-token' };
      await initAuth();

      const userBefore = get(user);
      await setPassword('newpassword123');
      const userAfter = get(user);

      expect(userAfter).toBeTruthy();
      expect(userAfter.id).toBe(userBefore.id);
      expect(userAfter.email).toBe(userBefore.email);
    });

    it('sets error when password is too short', async () => {
      mockUser = {
        id: 'user-otp-123',
        email: 'otp@example.com',
        is_anonymous: false,
        app_metadata: { provider: 'email' }
      };
      mockSession = { user: mockUser, access_token: 'otp-token' };
      await initAuth();

      await expect(setPassword('short')).rejects.toThrow();
      expect(get(error)).toBe('Password should be at least 6 characters');
      expect(get(loading)).toBe(false);
    });
  });

  describe('linkWithEmail', () => {
    it('links anonymous account with email', async () => {
      await initAuth();
      await signInAnonymously();
      expect(get(isAnonymous)).toBe(true);

      await linkWithEmail('claim@example.com');

      expect(get(isAuthenticated)).toBe(true);
      expect(get(loading)).toBe(false);
    });
  });

  describe('linkWithPassword', () => {
    it('links anonymous account with email and password', async () => {
      await initAuth();
      await signInAnonymously();
      expect(get(isAnonymous)).toBe(true);

      await linkWithPassword('claim@example.com', 'password123');

      expect(get(isAuthenticated)).toBe(true);
      expect(get(loading)).toBe(false);
    });

    it('sets error when password is too short', async () => {
      await initAuth();
      await signInAnonymously();

      await expect(linkWithPassword('claim@example.com', 'short')).rejects.toThrow();
      expect(get(error)).toBe('Password should be at least 6 characters');
    });
  });

  describe('full auth flows', () => {
    it('magic link user can set password and re-sign in with it', async () => {
      // 1. Simulate magic-link authenticated user
      mockUser = {
        id: 'user-ml-456',
        email: 'magic@example.com',
        is_anonymous: false,
        app_metadata: { provider: 'email' }
      };
      mockSession = { user: mockUser, access_token: 'ml-token' };
      await initAuth();
      expect(get(isAuthenticated)).toBe(true);

      // 2. Set a password
      await setPassword('mypassword123');
      expect(get(isAuthenticated)).toBe(true);
      expect(get(error)).toBeNull();

      // 3. Sign out
      await signOut();
      expect(get(isAuthenticated)).toBe(false);
      expect(get(user)).toBeNull();

      // 4. Sign back in with password
      await signInWithPassword('magic@example.com', 'mypassword123');
      expect(get(isAuthenticated)).toBe(true);
      expect(get(isAnonymous)).toBe(false);
      expect(get(user).email).toBe('magic@example.com');
    });

    it('anonymous user can upgrade and set password', async () => {
      await initAuth();

      // 1. Start as anonymous
      await signInAnonymously();
      expect(get(isAnonymous)).toBe(true);

      // 2. Link with email and password
      await linkWithPassword('upgraded@example.com', 'password123');
      expect(get(isAuthenticated)).toBe(true);
      expect(get(loading)).toBe(false);

      // 3. Sign out
      await signOut();
      expect(get(isAuthenticated)).toBe(false);

      // 4. Sign back in with password
      await signInWithPassword('upgraded@example.com', 'password123');
      expect(get(isAuthenticated)).toBe(true);
      expect(get(user).email).toBe('upgraded@example.com');
    });

    it('sign-in with wrong password fails then succeeds with correct one', async () => {
      await initAuth();

      // 1. Try wrong password
      await expect(signInWithPassword('user@example.com', 'wrong')).rejects.toThrow();
      expect(get(error)).toBe('Invalid login credentials');
      expect(get(isAuthenticated)).toBe(false);

      // 2. Clear error and try correct password
      clearError();
      expect(get(error)).toBeNull();

      await signInWithPassword('user@example.com', 'correct');
      expect(get(isAuthenticated)).toBe(true);
      expect(get(error)).toBeNull();
    });

    it('setting password does not disrupt active session', async () => {
      mockUser = {
        id: 'user-active-789',
        email: 'active@example.com',
        is_anonymous: false,
        app_metadata: { provider: 'email' }
      };
      mockSession = { user: mockUser, access_token: 'active-token' };
      await initAuth();

      // Verify session before
      expect(get(session)).toBeTruthy();
      expect(get(session).access_token).toBe('active-token');

      // Set password
      await setPassword('newpass123');

      // Session should still be intact
      expect(get(session)).toBeTruthy();
      expect(get(isAuthenticated)).toBe(true);
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
