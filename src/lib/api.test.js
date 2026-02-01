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

describe('API - Import (Migration)', () => {
  beforeEach(() => {
    resetMockData();
    setMockUser({ id: 'user-123', email: 'test@example.com' });
  });

  describe('importChild', () => {
    it('imports a complete child with measurements', async () => {
      const child = {
        id: 'old-id',
        profile: {
          name: 'Imported Child',
          birthDate: '2024-01-01',
          sex: 1
        },
        measurements: [
          { id: 'm1', date: '2024-01-15', weight: 3500, length: 51, headCirc: 35 },
          { id: 'm2', date: '2024-02-15', weight: 4200, length: 54, headCirc: 37 }
        ]
      };

      const newId = await api.importChild(child);

      expect(newId).toBeDefined();
      expect(newId).not.toBe('old-id'); // Should get a new UUID

      const children = getMockData('children');
      expect(children).toHaveLength(1);
      expect(children[0].name).toBe('Imported Child');

      const measurements = getMockData('measurements');
      expect(measurements).toHaveLength(2);
      expect(measurements[0].child_id).toBe(newId);
      expect(measurements[1].child_id).toBe(newId);
    });

    it('imports child without measurements', async () => {
      const child = {
        profile: {
          name: 'New Baby',
          birthDate: '2024-06-01',
          sex: 2
        },
        measurements: []
      };

      const newId = await api.importChild(child);
      expect(newId).toBeDefined();

      const children = getMockData('children');
      expect(children).toHaveLength(1);

      const measurements = getMockData('measurements');
      expect(measurements).toHaveLength(0);
    });
  });
});
