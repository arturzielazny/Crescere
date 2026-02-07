/**
 * Tests for Supabase API functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  resetMockData,
  setMockUser,
  seedMockData,
  getMockData
} from './__mocks__/supabaseClient.js';

// Mock the supabaseClient module
vi.mock('./supabaseClient.js', () => import('./__mocks__/supabaseClient.js'));

// Import after mocking
const api = await import('./api.js');

describe('API - Children', () => {
  beforeEach(() => {
    resetMockData();
    setMockUser({ id: 'user-123', email: 'test@example.com' });
  });

  describe('fetchChildren', () => {
    it('returns empty array when no children exist', async () => {
      const children = await api.fetchChildren();
      expect(children).toEqual([]);
    });

    it('returns children with measurements transformed to app format', async () => {
      seedMockData('children', [
        {
          id: 'child-1',
          user_id: 'user-123',
          name: 'Alice',
          birth_date: '2024-01-15',
          sex: 2
        }
      ]);
      seedMockData('measurements', [
        {
          id: 'meas-1',
          child_id: 'child-1',
          date: '2024-02-15',
          weight: 4500,
          length: 55,
          head_circ: 37.5
        }
      ]);

      const children = await api.fetchChildren();

      expect(children).toHaveLength(1);
      expect(children[0]).toEqual({
        id: 'child-1',
        profile: {
          name: 'Alice',
          birthDate: '2024-01-15',
          sex: 2
        },
        measurements: [
          {
            id: 'meas-1',
            date: '2024-02-15',
            weight: 4500,
            length: 55,
            headCirc: 37.5
          }
        ]
      });
    });
  });

  describe('createChild', () => {
    it('creates a child and returns the id', async () => {
      const profile = {
        name: 'Bob',
        birthDate: '2024-03-01',
        sex: 1
      };

      const id = await api.createChild(profile);

      expect(id).toBeDefined();
      const children = getMockData('children');
      expect(children).toHaveLength(1);
      expect(children[0].name).toBe('Bob');
      expect(children[0].birth_date).toBe('2024-03-01');
      expect(children[0].sex).toBe(1);
      expect(children[0].user_id).toBe('user-123');
    });

    it('throws when not authenticated', async () => {
      setMockUser(null);

      await expect(
        api.createChild({ name: 'Test', birthDate: '2024-01-01', sex: 1 })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('updateChild', () => {
    it('updates child profile fields', async () => {
      seedMockData('children', [
        {
          id: 'child-1',
          user_id: 'user-123',
          name: 'Alice',
          birth_date: '2024-01-15',
          sex: 2
        }
      ]);

      await api.updateChild('child-1', { name: 'Alice Updated' });

      const children = getMockData('children');
      expect(children[0].name).toBe('Alice Updated');
    });

    it('only updates provided fields', async () => {
      seedMockData('children', [
        {
          id: 'child-1',
          user_id: 'user-123',
          name: 'Alice',
          birth_date: '2024-01-15',
          sex: 2
        }
      ]);

      await api.updateChild('child-1', { name: 'Alice New' });

      const children = getMockData('children');
      expect(children[0].birth_date).toBe('2024-01-15');
      expect(children[0].sex).toBe(2);
    });
  });

  describe('deleteChild', () => {
    it('removes the child', async () => {
      seedMockData('children', [
        { id: 'child-1', user_id: 'user-123', name: 'Alice', birth_date: '2024-01-15', sex: 2 },
        { id: 'child-2', user_id: 'user-123', name: 'Bob', birth_date: '2024-02-15', sex: 1 }
      ]);

      await api.deleteChild('child-1');

      const children = getMockData('children');
      expect(children).toHaveLength(1);
      expect(children[0].id).toBe('child-2');
    });
  });
});

describe('API - Measurements', () => {
  beforeEach(() => {
    resetMockData();
    setMockUser({ id: 'user-123', email: 'test@example.com' });
    seedMockData('children', [
      { id: 'child-1', user_id: 'user-123', name: 'Test', birth_date: '2024-01-01', sex: 1 }
    ]);
  });

  describe('createMeasurement', () => {
    it('creates a measurement and returns the id', async () => {
      const measurement = {
        date: '2024-02-01',
        weight: 4200,
        length: 53,
        headCirc: 36
      };

      const id = await api.createMeasurement('child-1', measurement);

      expect(id).toBeDefined();
      const measurements = getMockData('measurements');
      expect(measurements).toHaveLength(1);
      expect(measurements[0].child_id).toBe('child-1');
      expect(measurements[0].weight).toBe(4200);
      expect(measurements[0].length).toBe(53);
      expect(measurements[0].head_circ).toBe(36);
    });

    it('handles null values for optional fields', async () => {
      const measurement = {
        date: '2024-02-01',
        weight: 4200,
        length: null,
        headCirc: null
      };

      await api.createMeasurement('child-1', measurement);

      const measurements = getMockData('measurements');
      expect(measurements[0].length).toBeNull();
      expect(measurements[0].head_circ).toBeNull();
    });
  });

  describe('updateMeasurement', () => {
    it('updates measurement fields', async () => {
      seedMockData('measurements', [
        { id: 'meas-1', child_id: 'child-1', date: '2024-02-01', weight: 4200, length: 53 }
      ]);

      await api.updateMeasurement('meas-1', { weight: 4300 });

      const measurements = getMockData('measurements');
      expect(measurements[0].weight).toBe(4300);
      expect(measurements[0].length).toBe(53); // unchanged
    });
  });

  describe('deleteMeasurement', () => {
    it('removes the measurement', async () => {
      seedMockData('measurements', [
        { id: 'meas-1', child_id: 'child-1', date: '2024-02-01', weight: 4200 },
        { id: 'meas-2', child_id: 'child-1', date: '2024-03-01', weight: 4800 }
      ]);

      await api.deleteMeasurement('meas-1');

      const measurements = getMockData('measurements');
      expect(measurements).toHaveLength(1);
      expect(measurements[0].id).toBe('meas-2');
    });
  });
});

describe('API - User Preferences', () => {
  beforeEach(() => {
    resetMockData();
    setMockUser({ id: 'user-123', email: 'test@example.com' });
  });

  describe('getActiveChildId', () => {
    it('returns null when no preference exists', async () => {
      const activeId = await api.getActiveChildId();
      expect(activeId).toBeNull();
    });

    it('returns the active child id when set', async () => {
      seedMockData('user_preferences', [{ user_id: 'user-123', active_child_id: 'child-1' }]);

      const activeId = await api.getActiveChildId();
      expect(activeId).toBe('child-1');
    });
  });

  describe('setActiveChildId', () => {
    it('creates preference when none exists', async () => {
      await api.setActiveChildId('child-1');

      const prefs = getMockData('user_preferences');
      expect(prefs).toHaveLength(1);
      expect(prefs[0].active_child_id).toBe('child-1');
    });

    it('updates existing preference', async () => {
      seedMockData('user_preferences', [{ user_id: 'user-123', active_child_id: 'child-1' }]);

      await api.setActiveChildId('child-2');

      const prefs = getMockData('user_preferences');
      expect(prefs).toHaveLength(1);
      expect(prefs[0].active_child_id).toBe('child-2');
    });
  });
});

describe('API - Sharing', () => {
  const owner = { id: 'owner-123', email: 'owner@example.com' };
  const recipient = { id: 'recipient-456', email: 'recipient@example.com' };

  beforeEach(() => {
    resetMockData();
    setMockUser(owner);
    // Seed a child owned by the owner
    seedMockData('children', [
      { id: 'child-1', user_id: 'owner-123', name: 'Alice', birth_date: '2024-01-15', sex: 2 }
    ]);
    seedMockData('measurements', [
      {
        id: 'meas-1',
        child_id: 'child-1',
        date: '2024-02-15',
        weight: 4500,
        length: 55,
        head_circ: 37.5
      }
    ]);
  });

  describe('createShare', () => {
    it('creates a share and returns share data', async () => {
      const share = await api.createShare('child-1', 'Doctor');

      expect(share.id).toBeDefined();
      expect(share.token).toBeDefined();
      expect(share.label).toBe('Doctor');
      expect(share.created_at).toBeDefined();

      const shares = getMockData('child_shares');
      expect(shares).toHaveLength(1);
      expect(shares[0].child_id).toBe('child-1');
      expect(shares[0].owner_id).toBe('owner-123');
    });

    it('throws when not authenticated', async () => {
      setMockUser(null);
      await expect(api.createShare('child-1', 'Doctor')).rejects.toThrow('Not authenticated');
    });
  });

  describe('fetchShares', () => {
    it('returns all shares for a child', async () => {
      seedMockData('child_shares', [
        {
          id: 'share-1',
          child_id: 'child-1',
          owner_id: 'owner-123',
          token: 'token-aaa',
          label: 'Doctor',
          created_at: '2024-06-01T00:00:00Z'
        },
        {
          id: 'share-2',
          child_id: 'child-1',
          owner_id: 'owner-123',
          token: 'token-bbb',
          label: 'Grandma',
          created_at: '2024-06-02T00:00:00Z'
        }
      ]);

      const shares = await api.fetchShares('child-1');
      expect(shares).toHaveLength(2);
      expect(shares[0].label).toBe('Doctor');
      expect(shares[1].label).toBe('Grandma');
    });

    it('returns empty array when no shares exist', async () => {
      const shares = await api.fetchShares('child-1');
      expect(shares).toEqual([]);
    });
  });

  describe('revokeShare', () => {
    it('deletes the share', async () => {
      seedMockData('child_shares', [
        {
          id: 'share-1',
          child_id: 'child-1',
          owner_id: 'owner-123',
          token: 'token-aaa',
          label: 'Doctor'
        }
      ]);

      await api.revokeShare('share-1');

      const shares = getMockData('child_shares');
      expect(shares).toHaveLength(0);
    });
  });

  describe('acceptShare', () => {
    it('creates access for recipient', async () => {
      seedMockData('child_shares', [
        {
          id: 'share-1',
          child_id: 'child-1',
          owner_id: 'owner-123',
          token: 'token-aaa',
          label: 'Doctor'
        }
      ]);

      // Switch to recipient user
      setMockUser(recipient);

      const result = await api.acceptShare('token-aaa');
      expect(result.child_id).toBe('child-1');
      expect(result.already_accepted).toBe(false);

      const access = getMockData('shared_child_access');
      expect(access).toHaveLength(1);
      expect(access[0].user_id).toBe('recipient-456');
      expect(access[0].child_id).toBe('child-1');
    });

    it('returns already_accepted when accepted again', async () => {
      seedMockData('child_shares', [
        {
          id: 'share-1',
          child_id: 'child-1',
          owner_id: 'owner-123',
          token: 'token-aaa',
          label: 'Doctor'
        }
      ]);

      setMockUser(recipient);

      await api.acceptShare('token-aaa');
      const result = await api.acceptShare('token-aaa');
      expect(result.already_accepted).toBe(true);

      const access = getMockData('shared_child_access');
      expect(access).toHaveLength(1);
    });

    it('throws for invalid token', async () => {
      setMockUser(recipient);

      await expect(api.acceptShare('invalid-token')).rejects.toThrow('Invalid share token');
    });

    it('throws when owner tries to accept own share', async () => {
      seedMockData('child_shares', [
        {
          id: 'share-1',
          child_id: 'child-1',
          owner_id: 'owner-123',
          token: 'token-aaa',
          label: 'Doctor'
        }
      ]);

      // Owner tries to accept their own share
      await expect(api.acceptShare('token-aaa')).rejects.toThrow('Cannot accept your own share');
    });
  });

  describe('fetchSharedChildren', () => {
    it('returns shared children with _shared flag and _shareLabel', async () => {
      seedMockData('child_shares', [
        {
          id: 'share-1',
          child_id: 'child-1',
          owner_id: 'owner-123',
          token: 'token-aaa',
          label: 'From Parent'
        }
      ]);
      seedMockData('shared_child_access', [
        {
          id: 'access-1',
          user_id: 'recipient-456',
          child_id: 'child-1',
          share_id: 'share-1'
        }
      ]);

      setMockUser(recipient);

      const shared = await api.fetchSharedChildren();
      expect(shared).toHaveLength(1);
      expect(shared[0].id).toBe('child-1');
      expect(shared[0]._shared).toBe(true);
      expect(shared[0]._shareLabel).toBe('From Parent');
      expect(shared[0].profile.name).toBe('Alice');
      expect(shared[0].measurements).toHaveLength(1);
    });

    it('returns empty array when no shared access', async () => {
      setMockUser(recipient);

      const shared = await api.fetchSharedChildren();
      expect(shared).toEqual([]);
    });
  });

  describe('removeSharedChild', () => {
    it('removes access for the current user', async () => {
      seedMockData('shared_child_access', [
        {
          id: 'access-1',
          user_id: 'recipient-456',
          child_id: 'child-1',
          share_id: 'share-1'
        }
      ]);

      setMockUser(recipient);

      await api.removeSharedChild('child-1');

      const access = getMockData('shared_child_access');
      expect(access).toHaveLength(0);
    });
  });

  describe('generateToken', () => {
    it('generates a URL-safe string', () => {
      const token = api.generateToken();
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
      // Should be URL-safe base64
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('generates unique tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(api.generateToken());
      }
      expect(tokens.size).toBe(100);
    });
  });
});
