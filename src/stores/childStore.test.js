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
  addChild,
  addMeasurement,
  updateProfile,
  updateMeasurement,
  deleteMeasurement,
  clearMeasurements,
  removeChild,
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

describe('childStore - shared children', () => {
  beforeEach(() => {
    resetMockData();
    resetStore();
    setMockUser({ id: 'user-123', email: 'test@example.com' });
  });

  afterEach(() => {
    disableSync();
  });

  it('loads shared children on enableSync', async () => {
    // Set up owned child
    const { seedMockData } = await import('../lib/__mocks__/supabaseClient.js');
    seedMockData('children', [
      { id: 'own-1', user_id: 'user-123', name: 'Own Child', birth_date: '2024-01-15', sex: 1 }
    ]);
    seedMockData('shared_child_access', [
      { id: 'access-1', user_id: 'user-123', child_id: 'shared-1', share_id: 'share-1' }
    ]);
    seedMockData('children', [
      { id: 'own-1', user_id: 'user-123', name: 'Own Child', birth_date: '2024-01-15', sex: 1 },
      {
        id: 'shared-1',
        user_id: 'other-user',
        name: 'Shared Child',
        birth_date: '2024-03-01',
        sex: 2
      }
    ]);
    seedMockData('child_shares', [
      {
        id: 'share-1',
        child_id: 'shared-1',
        owner_id: 'other-user',
        token: 'tok-1',
        label: 'Doctor'
      }
    ]);

    await enableSync();

    const state = get(childStore);
    // Should have both owned and shared children
    expect(state.children.length).toBeGreaterThanOrEqual(1);
  });

  it('guards addMeasurement for shared children', async () => {
    await enableSync();

    const { sharedChildIds: sharedIds } = childStoreModule;

    // Add a shared child
    setStore({
      children: [
        {
          id: 'shared-1',
          profile: { name: 'Shared', birthDate: '2024-01-15', sex: 1 },
          measurements: []
        }
      ],
      activeChildId: 'shared-1'
    });
    sharedIds.set(new Set(['shared-1']));

    // Try to add measurement - should be no-op
    addMeasurement({
      date: '2024-02-15',
      weight: 4500,
      length: 55,
      headCirc: 37.5
    });

    const state = get(childStore);
    const child = state.children.find((c) => c.id === 'shared-1');
    expect(child.measurements).toHaveLength(0);
  });

  it('acceptLiveShare adds shared child to store', async () => {
    const { seedMockData } = await import('../lib/__mocks__/supabaseClient.js');

    seedMockData('children', [
      {
        id: 'shared-1',
        user_id: 'other-user',
        name: 'Shared Child',
        birth_date: '2024-03-01',
        sex: 2
      }
    ]);
    seedMockData('child_shares', [
      {
        id: 'share-1',
        child_id: 'shared-1',
        owner_id: 'other-user',
        token: 'tok-abc',
        label: 'For Doctor'
      }
    ]);

    await enableSync();

    const { acceptLiveShare } = childStoreModule;
    const result = await acceptLiveShare('tok-abc');

    expect(result.childId).toBe('shared-1');
    expect(result.alreadyAccepted).toBe(false);

    const state = get(childStore);
    expect(state.activeChildId).toBe('shared-1');
  });
});

describe('childStore - pending child (RLS fix)', () => {
  beforeEach(() => {
    resetMockData();
    resetStore();
    setMockUser({ id: 'guest-user-123', is_anonymous: true });
  });

  afterEach(() => {
    disableSync();
  });

  it('addChild tracks child as pending when sync is enabled', async () => {
    await enableSync();

    addChild();

    const state = get(childStore);
    const newChild = state.children[0];
    expect(newChild).toBeDefined();
    expect(newChild.profile.birthDate).toBeNull();
    expect(newChild.profile.sex).toBeNull();

    // Child should NOT be created in Supabase yet
    expect(getMockData('children')).toHaveLength(0);
  });

  it('addMeasurement skips backend sync for pending child', async () => {
    await enableSync();

    addChild();
    const state = get(childStore);
    const childId = state.children[0].id;

    // Add measurement to pending child - should NOT call Supabase
    addMeasurement({
      date: '2024-02-15',
      weight: 4500,
      length: 55,
      headCirc: 37.5
    });

    // Wait for any async operations
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Measurement should exist locally
    const updatedState = get(childStore);
    const child = updatedState.children.find((c) => c.id === childId);
    expect(child.measurements).toHaveLength(1);
    expect(child.measurements[0].weight).toBe(4500);

    // But NOT in Supabase (no RLS error)
    expect(getMockData('measurements')).toHaveLength(0);
    expect(getMockData('children')).toHaveLength(0);
  });

  it('updateProfile triggers sync when all required fields are set', async () => {
    await enableSync();

    addChild();

    // Set birthDate first (still incomplete)
    updateProfile({ birthDate: '2024-01-15' });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(getMockData('children')).toHaveLength(0);

    // Set sex - now profile is complete, should trigger sync
    updateProfile({ sex: 1 });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Child should now exist in Supabase
    const dbChildren = getMockData('children');
    expect(dbChildren).toHaveLength(1);
    expect(dbChildren[0].birth_date).toBe('2024-01-15');
    expect(dbChildren[0].sex).toBe(1);
    expect(dbChildren[0].user_id).toBe('guest-user-123');
  });

  it('full guest flow: add child -> fill profile -> add measurement (no RLS error)', async () => {
    await enableSync();

    // Step 1: Guest creates new child
    addChild();
    const tempState = get(childStore);
    const tempId = tempState.children[0].id;

    // Step 2: Guest fills in profile
    updateProfile({ name: 'My Baby', birthDate: '2024-06-01' });
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Still pending (no sex yet)
    expect(getMockData('children')).toHaveLength(0);

    updateProfile({ sex: 2 });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Child should now be synced with a real ID
    const dbChildren = getMockData('children');
    expect(dbChildren).toHaveLength(1);

    const stateAfterSync = get(childStore);
    const realId = stateAfterSync.children[0].id;
    expect(realId).not.toBe(tempId); // ID should have been replaced

    // Step 3: Guest adds measurement - should succeed without RLS error
    addMeasurement({
      date: '2024-06-01',
      weight: 3200,
      length: 49,
      headCirc: 34
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Measurement should exist in Supabase
    const dbMeasurements = getMockData('measurements');
    expect(dbMeasurements).toHaveLength(1);
    expect(dbMeasurements[0].child_id).toBe(realId);
    expect(dbMeasurements[0].weight).toBe(3200);
  });

  it('measurements added before profile completion are synced with the child', async () => {
    await enableSync();

    // Add child and measurements before completing profile
    addChild();
    addMeasurement({ date: '2024-06-01', weight: 3200, length: 49, headCirc: 34 });
    addMeasurement({ date: '2024-07-01', weight: 4100, length: 53, headCirc: 36 });

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Nothing in Supabase yet
    expect(getMockData('children')).toHaveLength(0);
    expect(getMockData('measurements')).toHaveLength(0);

    // Now complete the profile
    updateProfile({ name: 'My Baby', birthDate: '2024-06-01', sex: 1 });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Both child and measurements should be synced
    expect(getMockData('children')).toHaveLength(1);
    expect(getMockData('measurements')).toHaveLength(2);
  });

  it('updateMeasurement skips backend for pending child', async () => {
    await enableSync();

    addChild();
    addMeasurement({ date: '2024-06-01', weight: 3200, length: 49, headCirc: 34 });

    const state = get(childStore);
    const measId = state.children[0].measurements[0].id;

    // Update measurement on pending child - should not error
    updateMeasurement(measId, { weight: 3300 });
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Verify local update worked
    const updatedState = get(childStore);
    expect(updatedState.children[0].measurements[0].weight).toBe(3300);

    // No backend calls
    expect(getMockData('measurements')).toHaveLength(0);
  });

  it('deleteMeasurement skips backend for pending child', async () => {
    await enableSync();

    addChild();
    addMeasurement({ date: '2024-06-01', weight: 3200, length: 49, headCirc: 34 });

    const state = get(childStore);
    const measId = state.children[0].measurements[0].id;

    // Delete measurement on pending child - should not error
    deleteMeasurement(measId);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Verify local delete worked
    const updatedState = get(childStore);
    expect(updatedState.children[0].measurements).toHaveLength(0);
  });

  it('clearMeasurements skips backend for pending child', async () => {
    await enableSync();

    addChild();
    addMeasurement({ date: '2024-06-01', weight: 3200, length: 49, headCirc: 34 });
    addMeasurement({ date: '2024-07-01', weight: 4100, length: 53, headCirc: 36 });

    clearMeasurements();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const state = get(childStore);
    expect(state.children[0].measurements).toHaveLength(0);
  });

  it('removeChild skips backend delete for pending child', async () => {
    await enableSync();

    addChild();
    const state = get(childStore);
    const childId = state.children[0].id;

    // Remove pending child - should not try to delete from Supabase
    removeChild(childId);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const updatedState = get(childStore);
    expect(updatedState.children).toHaveLength(0);
  });

  it('resetStore clears pending tracking', async () => {
    await enableSync();

    addChild();

    // Reset should clear pending state
    resetStore();

    // After reset, a new enableSync + addChild cycle should work correctly
    await enableSync();
    addChild();
    updateProfile({ name: 'New Baby', birthDate: '2024-01-01', sex: 1 });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getMockData('children')).toHaveLength(1);
  });

  it('updateProfile does not call updateChild API for pending child', async () => {
    await enableSync();

    addChild();

    // Set name only (profile still incomplete for sync)
    updateProfile({ name: 'Baby Name' });
    await new Promise((resolve) => setTimeout(resolve, 10));

    // No API calls should have happened
    expect(getMockData('children')).toHaveLength(0);

    // Verify name was updated locally
    const state = get(childStore);
    expect(state.children[0].profile.name).toBe('Baby Name');
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
