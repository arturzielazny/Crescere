/**
 * Svelte store for child growth data
 */

import { writable, derived } from 'svelte/store';
import { calculateZScores, calculateAgeInDays } from '../lib/zscore.js';

// Initial state
const initialState = {
  children: [],
  activeChildId: null
};

// Main writable store
export const childStore = writable(initialState);

const getActiveChild = (state) => {
  const activeId = state.activeChildId || state.children[0]?.id;
  if (!activeId) return null;
  return state.children.find(child => child.id === activeId) || null;
};

const updateActiveChild = (state, updater) => {
  const activeChild = getActiveChild(state);
  if (!activeChild) return state;

  const updatedChild = updater(activeChild);
  return {
    ...state,
    activeChildId: activeChild.id,
    children: state.children.map(child =>
      child.id === activeChild.id ? updatedChild : child
    )
  };
};

export const activeChild = derived(childStore, ($store) => {
  return getActiveChild($store);
});

// Derived store with computed z-scores and age
export const measurementsWithZScores = derived(childStore, ($store) => {
  const active = getActiveChild($store);
  if (!active) return [];

  if (!active.profile.birthDate || !active.profile.sex) {
    return active.measurements.map(m => ({
      ...m,
      zscores: null,
      ageInDays: null
    }));
  }

  return active.measurements
    .map(m => {
      const ageInDays = calculateAgeInDays(active.profile.birthDate, m.date);
      const zscores = calculateZScores(m, active.profile.sex, ageInDays);
      return { ...m, ageInDays, zscores };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
});

// Helper actions
export function updateProfile(profile) {
  childStore.update(state => updateActiveChild(state, (child) => ({
    ...child,
    profile: { ...child.profile, ...profile }
  })));
}

export function addMeasurement(measurement) {
  const id = crypto.randomUUID();
  childStore.update(state => updateActiveChild(state, (child) => ({
    ...child,
    measurements: [...child.measurements, { ...measurement, id }]
  })));
}

export function updateMeasurement(id, updates) {
  childStore.update(state => updateActiveChild(state, (child) => ({
    ...child,
    measurements: child.measurements.map(m =>
      m.id === id ? { ...m, ...updates } : m
    )
  })));
}

export function deleteMeasurement(id) {
  childStore.update(state => updateActiveChild(state, (child) => ({
    ...child,
    measurements: child.measurements.filter(m => m.id !== id)
  })));
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
}

export function setActiveChild(childId) {
  childStore.update(state => ({
    ...state,
    activeChildId: childId
  }));
}

export function removeChild(childId) {
  childStore.update(state => {
    const remaining = state.children.filter(child => child.id !== childId);
    const activeChildId = state.activeChildId === childId
      ? remaining[0]?.id || null
      : state.activeChildId;
    return {
      ...state,
      children: remaining,
      activeChildId
    };
  });
}

export function addChild() {
  const id = crypto.randomUUID();
  const newChild = {
    id,
    profile: {
      name: '',
      birthDate: null,
      sex: null
    },
    measurements: []
  };

  childStore.update(state => ({
    ...state,
    activeChildId: id,
    children: [...state.children, newChild]
  }));
}

export function createExampleState() {
  const id = crypto.randomUUID();
  const exampleChild = {
    id,
    profile: {
      name: 'Example Child',
      birthDate: '2023-01-15',
      sex: 1
    },
    measurements: [
      { id: crypto.randomUUID(), date: '2023-02-15', weight: 4500, length: 55, headCirc: 38 },
      { id: crypto.randomUUID(), date: '2023-04-15', weight: 6200, length: 61.5, headCirc: 40.5 },
      { id: crypto.randomUUID(), date: '2023-06-15', weight: 7400, length: 67, headCirc: 42.5 }
    ]
  };

  return {
    children: [exampleChild],
    activeChildId: id
  };
}
