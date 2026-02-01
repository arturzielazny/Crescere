/**
 * Tests for migration from localStorage to Supabase
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
    _getStore: () => store,
    _reset: () => {
      store = {};
      localStorageMock.getItem.mockClear();
      localStorageMock.setItem.mockClear();
      localStorageMock.removeItem.mockClear();
    }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock
});

// Mock api module directly
vi.mock('./api.js', () => ({
  fetchChildren: vi.fn(),
  importChild: vi.fn(),
  setActiveChildId: vi.fn()
}));

// Import after mocking
import { hasMigrated, hasLocalData, migrateToSupabase, resetMigrationFlag } from './migrate.js';
import * as api from './api.js';

describe('Migration', () => {
  beforeEach(() => {
    localStorageMock._reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('hasMigrated', () => {
    it('returns false when no migration flag exists', () => {
      expect(hasMigrated()).toBe(false);
    });

    it('returns true when migration flag is set', () => {
      localStorageMock.setItem('crescere-migrated', 'true');
      expect(hasMigrated()).toBe(true);
    });
  });

  describe('hasLocalData', () => {
    it('returns false when no local data exists', () => {
      expect(hasLocalData()).toBe(false);
    });

    it('returns true when local data exists', () => {
      const data = {
        version: 2,
        children: [{ id: 'child-1', profile: { name: 'Test', birthDate: '2024-01-01', sex: 1 } }],
        activeChildId: 'child-1'
      };
      localStorageMock.setItem('crescere-data', JSON.stringify(data));
      expect(hasLocalData()).toBe(true);
    });

    it('returns false when children array is empty', () => {
      const data = {
        version: 2,
        children: [],
        activeChildId: null
      };
      localStorageMock.setItem('crescere-data', JSON.stringify(data));
      expect(hasLocalData()).toBe(false);
    });
  });

  describe('migrateToSupabase', () => {
    it('returns early if already migrated', async () => {
      localStorageMock.setItem('crescere-migrated', 'true');

      const result = await migrateToSupabase();

      expect(result.migrated).toBe(false);
      expect(result.count).toBe(0);
      expect(api.fetchChildren).not.toHaveBeenCalled();
    });

    it('marks as migrated and returns early when no local data', async () => {
      const result = await migrateToSupabase();

      expect(result.migrated).toBe(false);
      expect(result.count).toBe(0);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('crescere-migrated', 'true');
    });

    it('skips migration when user already has remote data', async () => {
      // Set up local data
      const localData = {
        version: 2,
        children: [
          {
            id: 'local-child-1',
            profile: { name: 'Local Child', birthDate: '2024-01-01', sex: 1 },
            measurements: []
          }
        ],
        activeChildId: 'local-child-1'
      };
      localStorageMock.setItem('crescere-data', JSON.stringify(localData));

      // Set up existing remote data
      api.fetchChildren.mockResolvedValue([
        {
          id: 'remote-child-1',
          profile: { name: 'Remote Child', birthDate: '2024-02-01', sex: 2 },
          measurements: []
        }
      ]);

      const result = await migrateToSupabase();

      expect(result.migrated).toBe(false);
      expect(result.count).toBe(0);
      // Local data should be cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('crescere-data');
    });

    it('migrates local data when user has no remote data', async () => {
      const localData = {
        version: 2,
        children: [
          {
            id: 'local-child-1',
            profile: { name: 'Alice', birthDate: '2024-01-15', sex: 2 },
            measurements: [{ id: 'm1', date: '2024-02-15', weight: 4500, length: 55, headCirc: 37 }]
          },
          {
            id: 'local-child-2',
            profile: { name: 'Bob', birthDate: '2024-03-01', sex: 1 },
            measurements: []
          }
        ],
        activeChildId: 'local-child-1'
      };
      localStorageMock.setItem('crescere-data', JSON.stringify(localData));

      // No remote data
      api.fetchChildren.mockResolvedValue([]);
      api.importChild.mockResolvedValueOnce('new-child-1').mockResolvedValueOnce('new-child-2');
      api.setActiveChildId.mockResolvedValue(undefined);

      const result = await migrateToSupabase();

      expect(result.migrated).toBe(true);
      expect(result.count).toBe(2);

      // Verify importChild was called for each child
      expect(api.importChild).toHaveBeenCalledTimes(2);
      expect(api.importChild).toHaveBeenCalledWith(localData.children[0]);
      expect(api.importChild).toHaveBeenCalledWith(localData.children[1]);

      // Verify active child was set with the new ID
      expect(api.setActiveChildId).toHaveBeenCalledWith('new-child-1');

      // Verify local storage was cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('crescere-data');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('crescere-migrated', 'true');
    });

    it('returns error when migration fails', async () => {
      const localData = {
        version: 2,
        children: [
          {
            id: 'local-child-1',
            profile: { name: 'Alice', birthDate: '2024-01-15', sex: 2 },
            measurements: []
          }
        ],
        activeChildId: 'local-child-1'
      };
      localStorageMock.setItem('crescere-data', JSON.stringify(localData));

      api.fetchChildren.mockResolvedValue([]);
      api.importChild.mockRejectedValue(new Error('Database error'));

      const result = await migrateToSupabase();

      expect(result.migrated).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('resetMigrationFlag', () => {
    it('removes the migration flag', () => {
      localStorageMock.setItem('crescere-migrated', 'true');

      resetMigrationFlag();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('crescere-migrated');
    });
  });
});
