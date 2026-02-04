/**
 * Svelte store for child growth data
 * Supports both local-only mode and Supabase-synced mode
 */

import { writable, derived, get } from 'svelte/store';
import { calculateZScores, calculateAgeInDays } from '../lib/zscore.js';
import * as api from '../lib/api.js';

// Initial state
const initialState = {
  children: [],
  activeChildId: null
};

// Main writable store
export const childStore = writable(initialState);

// Loading state for async operations
export const dataLoading = writable(true);

// Error state for async operations
export const dataError = writable(null);

// Track temporary (shared) child that hasn't been saved yet
export const temporaryChildId = writable(null);

// Track children shared with this user (read-only)
export const sharedChildIds = writable(new Set());

// Track if we're in sync mode (Supabase connected)
let syncEnabled = false;

// Track children currently being synced to prevent double-sync
const syncingChildIds = new Set();

const getActiveChild = (state) => {
  const activeId = state.activeChildId || state.children[0]?.id;
  if (!activeId) return null;
  return state.children.find((child) => child.id === activeId) || null;
};

const updateActiveChild = (state, updater) => {
  const activeChild = getActiveChild(state);
  if (!activeChild) return state;

  const updatedChild = updater(activeChild);
  return {
    ...state,
    activeChildId: activeChild.id,
    children: state.children.map((child) => (child.id === activeChild.id ? updatedChild : child))
  };
};

export const activeChild = derived(childStore, ($store) => {
  return getActiveChild($store);
});

// Whether the active child is shared (read-only)
export const isActiveChildReadOnly = derived(
  [childStore, sharedChildIds],
  ([$store, $sharedIds]) => {
    const active = getActiveChild($store);
    if (!active) return false;
    return $sharedIds.has(active.id);
  }
);

// Derived store for max age across all measurements (for consistent chart x-axis)
export const maxAgeInDays = derived(childStore, ($store) => {
  const active = getActiveChild($store);
  if (!active?.profile?.birthDate || !active?.measurements?.length) return 0;

  let maxAge = 0;
  for (const m of active.measurements) {
    const age = calculateAgeInDays(active.profile.birthDate, m.date);
    if (age > maxAge) maxAge = age;
  }
  return maxAge;
});

// Derived store with computed z-scores and age
export const measurementsWithZScores = derived(childStore, ($store) => {
  const active = getActiveChild($store);
  if (!active) return [];

  if (!active.profile.birthDate || !active.profile.sex) {
    return active.measurements.map((m) => ({
      ...m,
      zscores: null,
      ageInDays: null
    }));
  }

  return active.measurements
    .map((m) => {
      const ageInDays = calculateAgeInDays(active.profile.birthDate, m.date);
      const zscores = calculateZScores(m, active.profile.sex, ageInDays);
      return { ...m, ageInDays, zscores };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
});

// ============================================================================
// Initialization
// ============================================================================

/**
 * Enable sync mode and load data from Supabase
 */
export async function enableSync() {
  syncEnabled = true;
  dataLoading.set(true);
  dataError.set(null);

  try {
    const [ownChildren, activeChildId, shared] = await Promise.all([
      api.fetchChildren(),
      api.getActiveChildId(),
      api.fetchSharedChildren().catch(() => [])
    ]);

    // Track shared child IDs
    const sharedIds = new Set(shared.map((c) => c.id));
    sharedChildIds.set(sharedIds);

    // Merge owned + shared children (avoid duplicates)
    const ownIds = new Set(ownChildren.map((c) => c.id));
    const uniqueShared = shared.filter((c) => !ownIds.has(c.id));
    const allChildren = [...ownChildren, ...uniqueShared];

    childStore.set({
      children: allChildren,
      activeChildId: activeChildId || allChildren[0]?.id || null
    });
  } catch (err) {
    console.error('Failed to load data:', err);
    dataError.set(err.message);
  } finally {
    dataLoading.set(false);
  }
}

/**
 * Disable sync mode (for local-only usage)
 */
export function disableSync() {
  syncEnabled = false;
}

// ============================================================================
// Helper actions - these work synchronously for UI, then sync to backend
// ============================================================================

export function updateProfile(profile) {
  const state = get(childStore);
  const activeChild = getActiveChild(state);
  if (activeChild && get(sharedChildIds).has(activeChild.id)) return;

  // Optimistic update
  childStore.update((s) =>
    updateActiveChild(s, (child) => ({
      ...child,
      profile: { ...child.profile, ...profile }
    }))
  );

  // Sync to backend
  if (syncEnabled && activeChild && get(temporaryChildId) !== activeChild.id) {
    api.updateChild(activeChild.id, profile).catch((err) => {
      console.error('Failed to update profile:', err);
      // Rollback on error
      childStore.set(state);
      dataError.set(err.message);
    });
  }
}

export function addMeasurement(measurement) {
  const state = get(childStore);
  const activeChild = getActiveChild(state);
  if (!activeChild) return;
  if (get(sharedChildIds).has(activeChild.id)) return;

  const tempId = crypto.randomUUID();

  // Optimistic update
  childStore.update((s) =>
    updateActiveChild(s, (child) => ({
      ...child,
      measurements: [...child.measurements, { ...measurement, id: tempId }]
    }))
  );

  // Sync to backend
  if (syncEnabled && get(temporaryChildId) !== activeChild.id) {
    api
      .createMeasurement(activeChild.id, measurement)
      .then((realId) => {
        // Replace temp ID with real ID
        childStore.update((s) =>
          updateActiveChild(s, (child) => ({
            ...child,
            measurements: child.measurements.map((m) =>
              m.id === tempId ? { ...m, id: realId } : m
            )
          }))
        );
      })
      .catch((err) => {
        console.error('Failed to add measurement:', err);
        // Rollback
        childStore.set(state);
        dataError.set(err.message);
      });
  }
}

export function updateMeasurement(id, updates) {
  const state = get(childStore);
  const active = getActiveChild(state);
  if (active && get(sharedChildIds).has(active.id)) return;

  // Optimistic update
  childStore.update((s) =>
    updateActiveChild(s, (child) => ({
      ...child,
      measurements: child.measurements.map((m) => (m.id === id ? { ...m, ...updates } : m))
    }))
  );

  // Sync to backend
  if (syncEnabled) {
    api.updateMeasurement(id, updates).catch((err) => {
      console.error('Failed to update measurement:', err);
      childStore.set(state);
      dataError.set(err.message);
    });
  }
}

export function deleteMeasurement(id) {
  const state = get(childStore);
  const active = getActiveChild(state);
  if (active && get(sharedChildIds).has(active.id)) return;

  // Optimistic update
  childStore.update((s) =>
    updateActiveChild(s, (child) => ({
      ...child,
      measurements: child.measurements.filter((m) => m.id !== id)
    }))
  );

  // Sync to backend
  if (syncEnabled) {
    api.deleteMeasurement(id).catch((err) => {
      console.error('Failed to delete measurement:', err);
      childStore.set(state);
      dataError.set(err.message);
    });
  }
}

export function clearMeasurements() {
  const state = get(childStore);
  const activeChild = getActiveChild(state);
  if (!activeChild) return;
  if (get(sharedChildIds).has(activeChild.id)) return;

  const measurementIds = activeChild.measurements.map((m) => m.id);

  // Optimistic update
  childStore.update((s) =>
    updateActiveChild(s, (child) => ({
      ...child,
      measurements: []
    }))
  );

  // Sync to backend - delete each measurement
  if (syncEnabled) {
    Promise.all(measurementIds.map((id) => api.deleteMeasurement(id))).catch((err) => {
      console.error('Failed to clear measurements:', err);
      childStore.set(state);
      dataError.set(err.message);
    });
  }
}

export function setStore(data) {
  let normalized = data;
  if (!normalized.children && (normalized.profile || normalized.measurements)) {
    const id = crypto.randomUUID();
    normalized = {
      children: [
        {
          id,
          profile: normalized.profile || { name: '', birthDate: null, sex: null },
          measurements: normalized.measurements || []
        }
      ],
      activeChildId: id
    };
  }

  const activeChildId = normalized.activeChildId || normalized.children?.[0]?.id || null;
  childStore.set({ ...normalized, activeChildId });
}

export function resetStore() {
  childStore.set(initialState);
  dataLoading.set(true);
  dataError.set(null);
  temporaryChildId.set(null);
  sharedChildIds.set(new Set());
}

export function setActiveChild(childId) {
  const state = get(childStore);

  // Optimistic update
  childStore.update((s) => ({
    ...s,
    activeChildId: childId
  }));

  // Sync to backend
  if (syncEnabled) {
    api.setActiveChildId(childId).catch((err) => {
      console.error('Failed to set active child:', err);
      childStore.set(state);
    });
  }
}

export function removeChild(childId) {
  const state = get(childStore);
  const isShared = get(sharedChildIds).has(childId);

  // Optimistic update
  childStore.update((s) => {
    const remaining = s.children.filter((child) => child.id !== childId);
    const activeChildId = s.activeChildId === childId ? remaining[0]?.id || null : s.activeChildId;
    return {
      ...s,
      children: remaining,
      activeChildId
    };
  });

  // Remove from shared set if applicable
  if (isShared) {
    sharedChildIds.update((ids) => {
      const next = new Set(ids);
      next.delete(childId);
      return next;
    });
  }

  // Sync to backend
  if (syncEnabled) {
    const deleteOp = isShared ? api.removeSharedChild(childId) : api.deleteChild(childId);
    deleteOp.catch((err) => {
      console.error('Failed to delete child:', err);
      childStore.set(state);
      dataError.set(err.message);
    });
  }
}

export function addChild() {
  const tempId = crypto.randomUUID();
  const newChild = {
    id: tempId,
    profile: {
      name: '',
      birthDate: null,
      sex: null
    },
    measurements: []
  };

  // We can't create a child in DB without required fields (birthDate, sex)
  // So we add locally first, then sync when profile is complete
  childStore.update((state) => ({
    ...state,
    activeChildId: tempId,
    children: [...state.children, newChild]
  }));

  // Mark as pending creation - will be created on first profile update with required fields
  if (syncEnabled) {
    // Store a flag that this child needs to be created
    newChild._pendingCreate = true;
  }
}

/**
 * Sync a locally-created child to the backend
 * Called when a child has all required fields filled in
 */
export async function syncChildToBackend(childId) {
  if (!syncEnabled) return;
  if (syncingChildIds.has(childId)) return; // Prevent double-sync

  const state = get(childStore);
  const child = state.children.find((c) => c.id === childId);

  if (!child || !child.profile?.birthDate || !child.profile?.sex) {
    return; // Can't create without required fields
  }

  syncingChildIds.add(childId);
  try {
    const realId = await api.createChild(child.profile);

    // Update local ID to match backend
    childStore.update((s) => ({
      ...s,
      activeChildId: s.activeChildId === childId ? realId : s.activeChildId,
      children: s.children.map((c) => (c.id === childId ? { ...c, id: realId } : c))
    }));

    // Sync measurements if any
    if (child.measurements.length > 0) {
      for (const m of child.measurements) {
        await api.createMeasurement(realId, m);
      }
      // Reload to get real IDs
      const children = await api.fetchChildren();
      const updated = children.find((c) => c.id === realId);
      if (updated) {
        childStore.update((s) => ({
          ...s,
          children: s.children.map((c) => (c.id === realId ? updated : c))
        }));
      }
    }

    return realId;
  } catch (err) {
    console.error('Failed to sync child:', err);
    dataError.set(err.message);
    throw err;
  } finally {
    syncingChildIds.delete(childId);
  }
}

export function createExampleState(exampleName = 'Example Child') {
  const id = crypto.randomUUID();

  // Calculate dates relative to today (child is 90 days old)
  const today = new Date();
  const birthDate = new Date(today);
  birthDate.setDate(birthDate.getDate() - 90);

  const formatDate = (date) => date.toISOString().slice(0, 10);
  const dateAtAge = (days) => {
    const d = new Date(birthDate);
    d.setDate(d.getDate() + days);
    return formatDate(d);
  };

  const exampleChild = {
    id,
    profile: {
      name: exampleName,
      birthDate: formatDate(birthDate),
      sex: 1
    },
    measurements: [
      // Birth (day 0)
      { id: crypto.randomUUID(), date: dateAtAge(0), weight: 3400, length: 50, headCirc: 35 },
      // Day 14 - weight only (showing omitted values are OK)
      { id: crypto.randomUUID(), date: dateAtAge(14), weight: 3800, length: null, headCirc: null },
      // Day 30 - no head circumference
      { id: crypto.randomUUID(), date: dateAtAge(30), weight: 4400, length: 54, headCirc: null },
      // Day 45 - no length
      { id: crypto.randomUUID(), date: dateAtAge(45), weight: 5100, length: null, headCirc: 38 },
      // Day 60 - all values
      { id: crypto.randomUUID(), date: dateAtAge(60), weight: 5700, length: 58, headCirc: 39.5 },
      // Day 90 (today) - all values
      { id: crypto.randomUUID(), date: dateAtAge(90), weight: 6300, length: 61, headCirc: 41 },
      // Day 120 (future projection) - showing forecasting feature
      { id: crypto.randomUUID(), date: dateAtAge(120), weight: 6900, length: 64, headCirc: 42.5 }
    ]
  };

  return {
    children: [exampleChild],
    activeChildId: id
  };
}

// Add a shared child as temporary (not saved to localStorage yet)
export function addTemporaryChild(child) {
  temporaryChildId.set(child.id);
  childStore.update((state) => ({
    ...state,
    activeChildId: child.id,
    children: [...state.children, child]
  }));
}

// Save the temporary child (make it permanent)
export async function saveTemporaryChild() {
  const tempId = get(temporaryChildId);
  if (!tempId) return;

  if (syncEnabled) {
    try {
      const state = get(childStore);
      const child = state.children.find((c) => c.id === tempId);

      if (child?.profile?.birthDate && child?.profile?.sex) {
        const realId = await api.importChild(child);

        // Update local store with new ID
        childStore.update((s) => ({
          ...s,
          activeChildId: s.activeChildId === tempId ? realId : s.activeChildId,
          children: s.children.map((c) => (c.id === tempId ? { ...c, id: realId } : c))
        }));
      }
    } catch (err) {
      console.error('Failed to save temporary child:', err);
      dataError.set(err.message);
    }
  }

  temporaryChildId.set(null);
}

// Remove the temporary child without saving
export function discardTemporaryChild() {
  const tempId = get(temporaryChildId);

  if (tempId) {
    removeChild(tempId);
    temporaryChildId.set(null);
  }
}

/**
 * Accept a live share by token, reload shared children, switch to shared child
 * @param {string} token - Share token from URL
 * @returns {Promise<{childId: string, alreadyAccepted: boolean}>}
 */
export async function acceptLiveShare(token) {
  if (!syncEnabled) throw new Error('Sync not enabled');

  const result = await api.acceptShare(token);

  // Reload shared children
  const shared = await api.fetchSharedChildren();
  const sharedIds = new Set(shared.map((c) => c.id));
  sharedChildIds.set(sharedIds);

  // Merge into store (avoid duplicates)
  childStore.update((state) => {
    const ownChildren = state.children.filter((c) => !sharedIds.has(c.id));
    return {
      ...state,
      children: [...ownChildren, ...shared],
      activeChildId: result.child_id
    };
  });

  return { childId: result.child_id, alreadyAccepted: result.already_accepted };
}
