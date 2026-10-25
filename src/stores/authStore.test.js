/**
 * Tests for auth store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock state: the user the fake backend considers signed in
let mockUser = null;
let mockPassword = 'correct';

function apiError(message, status) {
  return Object.assign(new Error(message), { status });
}

// Mock the API module
vi.mock('../lib/api.js', () => ({
  getSessionUser: () => Promise.resolve(mockUser),
  signInAnonymously: () => {
    mockUser = { id: 'anon-user-123', email: null, isAnonymous: true };
    return Promise.resolve(mockUser);
  },
  signInWithPassword: (email, password) => {
    if (password !== mockPassword) {
      return Promise.reject(apiError('Invalid email or password', 401));
    }
    mockUser = { id: 'user-pw-123', email, isAnonymous: false };
    return Promise.resolve(mockUser);
  },
  claimAccount: (email, password) => {
    if (!mockUser) return Promise.reject(apiError('Not authenticated', 401));
    if (password.length < 6) {
      return Promise.reject(apiError('Password must be at least 6 characters', 400));
    }
    if (email === 'taken@example.com') {
      return Promise.reject(apiError('An account with this email already exists', 409));
    }
    mockPassword = password;
    mockUser = { ...mockUser, email, isAnonymous: false };
    return Promise.resolve(mockUser);
  },
  changePassword: (currentPassword, newPassword) => {
    if (currentPassword !== mockPassword) {
      return Promise.reject(apiError('Current password is incorrect', 401));
    }
    mockPassword = newPassword;
    return Promise.resolve();
  },
  signOut: () => {
    mockUser = null;
    return Promise.resolve();
  }
}));

// Import after mocking
import {
  user,
  loading,
  error,
  isAuthenticated,
  isAnonymous,
  initAuth,
  signInAnonymously,
  signInWithPassword,
  claimAccount,
  changePassword,
  signOut,
  clearError,
  resetRateLimit
} from './authStore.js';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset mock state
    mockUser = null;
    mockPassword = 'correct';
    resetRateLimit();
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
      mockUser = { id: 'existing-user', email: 'test@example.com', isAnonymous: false };
      await initAuth();
      expect(get(user)).toEqual(mockUser);
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
      const promise = signInAnonymously();
      expect(get(loading)).toBe(true);
      await promise;
      expect(get(loading)).toBe(false);
    });
  });

  describe('signOut', () => {
    it('clears the user', async () => {
      await initAuth();
      await signInAnonymously();
      await signOut();
      expect(get(user)).toBeNull();
      expect(get(isAuthenticated)).toBe(false);
    });
  });

  describe('isAnonymous', () => {
    it('returns true for anonymous users', async () => {
      mockUser = { id: 'anon', email: null, isAnonymous: true };
      await initAuth();
      expect(get(isAnonymous)).toBe(true);
    });

    it('returns false for regular users', async () => {
      mockUser = { id: 'user', email: 'test@example.com', isAnonymous: false };
      await initAuth();
      expect(get(isAnonymous)).toBe(false);
    });
  });

  describe('signInWithPassword', () => {
    it('signs in with email and password', async () => {
      await initAuth();
      await signInWithPassword('test@example.com', 'correct');
      expect(get(isAuthenticated)).toBe(true);
      expect(get(isAnonymous)).toBe(false);
      expect(get(user)?.email).toBe('test@example.com');
    });

    it('sets error on invalid credentials', async () => {
      await initAuth();
      await expect(signInWithPassword('test@example.com', 'wrong')).rejects.toThrow();
      expect(get(error)).toBe('Invalid email or password');
      expect(get(isAuthenticated)).toBe(false);
    });
  });

  describe('claimAccount', () => {
    it('turns the guest into a saved account with the same id', async () => {
      await initAuth();
      await signInAnonymously();
      const guestId = get(user)?.id;

      await claimAccount('me@example.com', 'secret123');

      expect(get(user)?.id).toBe(guestId);
      expect(get(user)?.email).toBe('me@example.com');
      expect(get(isAnonymous)).toBe(false);
    });

    it('sets error when password is too short', async () => {
      await initAuth();
      await signInAnonymously();
      await expect(claimAccount('me@example.com', 'short')).rejects.toThrow();
      expect(get(error)).toBe('Password must be at least 6 characters');
      expect(get(isAnonymous)).toBe(true);
    });

    it('sets error when email is already taken', async () => {
      await initAuth();
      await signInAnonymously();
      await expect(claimAccount('taken@example.com', 'secret123')).rejects.toThrow();
      expect(get(error)).toBe('An account with this email already exists');
    });
  });

  describe('changePassword', () => {
    it('changes the password and keeps the session', async () => {
      await initAuth();
      await signInWithPassword('test@example.com', 'correct');

      await changePassword('correct', 'newsecret');

      expect(get(isAuthenticated)).toBe(true);
      expect(get(error)).toBeNull();
      expect(mockPassword).toBe('newsecret');
    });

    it('sets error when the current password is wrong', async () => {
      await initAuth();
      await signInWithPassword('test@example.com', 'correct');
      await expect(changePassword('nope', 'newsecret')).rejects.toThrow();
      expect(get(error)).toBe('Current password is incorrect');
      expect(get(isAuthenticated)).toBe(true);
    });
  });

  describe('full auth flows', () => {
    it('guest claims account, signs out, and signs back in with the new password', async () => {
      await initAuth();
      await signInAnonymously();
      await claimAccount('me@example.com', 'secret123');
      await signOut();
      expect(get(isAuthenticated)).toBe(false);

      await signInWithPassword('me@example.com', 'secret123');
      expect(get(isAuthenticated)).toBe(true);
      expect(get(user)?.email).toBe('me@example.com');
    });
  });

  describe('rate limiting', () => {
    it('blocks rapid duplicate calls after a successful action', async () => {
      await initAuth();
      await signInAnonymously();

      // Second call immediately after success should be blocked
      await expect(signInAnonymously()).rejects.toThrow('Please wait before trying again');
      expect(get(error)).toBe('Please wait before trying again');
    });

    it('allows retry after a failed action', async () => {
      await initAuth();

      // First call fails (wrong password)
      await expect(signInWithPassword('test@example.com', 'wrong')).rejects.toThrow();

      // Immediate retry should be allowed since the first call failed
      await signInWithPassword('test@example.com', 'correct');
      expect(get(isAuthenticated)).toBe(true);
    });

    it('allows calls to different actions in sequence', async () => {
      await initAuth();
      await signInAnonymously();

      // Different action should not be blocked
      await signOut();
      expect(get(isAuthenticated)).toBe(false);
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
