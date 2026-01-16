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
