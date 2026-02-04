/**
 * Tests for childStore - specifically syncChildToBackend functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { resetMockData, setMockUser, getMockData } from '../lib/__mocks__/supabaseClient.js';

// Mock the supabaseClient module
vi.mock('../lib/supabaseClient.js', () => import('../lib/__mocks__/supabaseClient.js'));

// Import after mocking
const childStoreModule = await import('./childStore.js');
const {
  childStore,
  setStore,
  resetStore,
  createExampleState,
  syncChildToBackend,
  enableSync,
  disableSync,
  addMeasurement,
  dataError: _dataError
} = childStoreModule;

describe('childStore - syncChildToBackend', () => {
  beforeEach(() => {
    resetMockData();
    resetStore();
    setMockUser({ id: 'user-123', email: 'test@example.com' });
  });

  afterEach(() => {
    disableSync();
  });

  it('syncs locally created child to database', async () => {
    await enableSync();

    // Create a local child with all required fields
    const localChild = {
      id: 'local-child-id',
      profile: {
        name: 'Test Child',
        birthDate: '2024-01-15',
        sex: 1
      },
      measurements: []
    };

    setStore({
      children: [localChild],
      activeChildId: localChild.id
    });

    // Sync to backend
    const realId = await syncChildToBackend(localChild.id);

    // Verify child was created in database
    const dbChildren = getMockData('children');
    expect(dbChildren).toHaveLength(1);
    expect(dbChildren[0].name).toBe('Test Child');
    expect(dbChildren[0].birth_date).toBe('2024-01-15');
    expect(dbChildren[0].sex).toBe(1);
    expect(dbChildren[0].user_id).toBe('user-123');

    // Verify local store was updated with real ID
    const state = get(childStore);
    expect(state.children[0].id).toBe(realId);
    expect(state.activeChildId).toBe(realId);
  });

  it('syncs measurements along with child', async () => {
    await enableSync();

    // Create a local child with measurements
    const localChild = {
      id: 'local-child-id',
      profile: {
        name: 'Test Child',
        birthDate: '2024-01-15',
        sex: 1
      },
      measurements: [
        { id: 'local-m1', date: '2024-01-15', weight: 3400, length: 50, headCirc: 35 },
        { id: 'local-m2', date: '2024-02-15', weight: 4200, length: 54, headCirc: 37 }
      ]
    };

    setStore({
      children: [localChild],
      activeChildId: localChild.id
    });

    // Sync to backend
    await syncChildToBackend(localChild.id);

    // Verify measurements were created in database
    const dbMeasurements = getMockData('measurements');
    expect(dbMeasurements).toHaveLength(2);
    expect(dbMeasurements[0].weight).toBe(3400);
    expect(dbMeasurements[1].weight).toBe(4200);
  });

  it('prevents double-sync of same child', async () => {
    await enableSync();

    const localChild = {
      id: 'local-child-id',
      profile: {
        name: 'Test Child',
        birthDate: '2024-01-15',
        sex: 1
      },
      measurements: []
    };

    setStore({
      children: [localChild],
      activeChildId: localChild.id
    });

    // Start two concurrent syncs
    const promise1 = syncChildToBackend(localChild.id);
    const promise2 = syncChildToBackend(localChild.id);

    await Promise.all([promise1, promise2]);

    // Verify only one child was created
    const dbChildren = getMockData('children');
    expect(dbChildren).toHaveLength(1);
  });

  it('does nothing for child without required fields', async () => {
    await enableSync();

    // Child missing birthDate
    const incompleteChild = {
      id: 'incomplete-child-id',
      profile: {
        name: 'Incomplete Child',
        birthDate: null,
        sex: 1
      },
      measurements: []
    };

    setStore({
      children: [incompleteChild],
      activeChildId: incompleteChild.id
    });

    // Attempt to sync
    const result = await syncChildToBackend(incompleteChild.id);

    // Should return undefined (early return)
    expect(result).toBeUndefined();

    // Verify no child was created
    const dbChildren = getMockData('children');
    expect(dbChildren).toHaveLength(0);
  });

  it('does nothing for child missing sex', async () => {
    await enableSync();

    const incompleteChild = {
      id: 'incomplete-child-id',
      profile: {
        name: 'Incomplete Child',
        birthDate: '2024-01-15',
        sex: null
      },
      measurements: []
    };

    setStore({
      children: [incompleteChild],
      activeChildId: incompleteChild.id
    });

    const result = await syncChildToBackend(incompleteChild.id);

    expect(result).toBeUndefined();
    expect(getMockData('children')).toHaveLength(0);
  });

  it('does nothing when sync is disabled', async () => {
    // Don't call enableSync()
    disableSync();

    const localChild = {
      id: 'local-child-id',
      profile: {
        name: 'Test Child',
        birthDate: '2024-01-15',
        sex: 1
      },
      measurements: []
    };

    setStore({
      children: [localChild],
      activeChildId: localChild.id
    });

    const result = await syncChildToBackend(localChild.id);

    expect(result).toBeUndefined();
    expect(getMockData('children')).toHaveLength(0);
  });

  it('measurement can be added after child is synced', async () => {
    await enableSync();

    const localChild = {
      id: 'local-child-id',
      profile: {
        name: 'Test Child',
        birthDate: '2024-01-15',
        sex: 1
      },
      measurements: []
    };

    setStore({
      children: [localChild],
      activeChildId: localChild.id
    });

    // Sync child to backend first
    const realId = await syncChildToBackend(localChild.id);
    expect(realId).toBeDefined();

    // Now add a measurement - this should work without RLS error
    addMeasurement({
      date: '2024-02-15',
      weight: 4500,
      length: 55,
      headCirc: 37.5
    });

    // Wait for async operation
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Verify measurement was created in database
    const dbMeasurements = getMockData('measurements');
    expect(dbMeasurements).toHaveLength(1);
    expect(dbMeasurements[0].child_id).toBe(realId);
    expect(dbMeasurements[0].weight).toBe(4500);
  });
});

describe('childStore - createExampleState', () => {
  it('creates example child with valid profile', () => {
    const state = createExampleState('Example Child');

    expect(state.children).toHaveLength(1);
    expect(state.activeChildId).toBe(state.children[0].id);

    const child = state.children[0];
    expect(child.profile.name).toBe('Example Child');
    expect(child.profile.birthDate).toBeDefined();
    expect(child.profile.sex).toBe(1);
    expect(child.measurements.length).toBeGreaterThan(0);
  });

  it('creates child with all required fields for database sync', () => {
    const state = createExampleState();
    const child = state.children[0];

    // These are required by the database
    expect(child.profile.birthDate).toBeTruthy();
    expect(child.profile.sex).toBeTruthy();
    expect(typeof child.profile.sex).toBe('number');
  });
});
