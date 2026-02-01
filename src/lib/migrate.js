/**
 * One-time migration from localStorage to Supabase
 * Runs on first load when user has local data but no remote data
 */

import { loadFromStorage, clearStorage } from './storage.js';
import { fetchChildren, importChild, setActiveChildId } from './api.js';

const MIGRATION_KEY = 'crescere-migrated';

/**
 * Check if migration has already been completed
 */
export function hasMigrated() {
  try {
    return localStorage.getItem(MIGRATION_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark migration as completed
 */
function markMigrated() {
  try {
    localStorage.setItem(MIGRATION_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if there's local data to migrate
 */
export function hasLocalData() {
  const data = loadFromStorage();
  return data?.children?.length > 0;
}

/**
 * Migrate localStorage data to Supabase
 * Only migrates if:
 * - User is authenticated
 * - There's local data
 * - User has no remote data (first time)
 *
 * @returns {Promise<{ migrated: boolean, count: number, error?: string }>}
 */
export async function migrateToSupabase() {
  // Check if already migrated
  if (hasMigrated()) {
    return { migrated: false, count: 0 };
  }

  // Load local data
  const localData = loadFromStorage();
  if (!localData?.children?.length) {
    markMigrated();
    return { migrated: false, count: 0 };
  }

  try {
    // Check if user already has remote data
    const remoteChildren = await fetchChildren();
    if (remoteChildren.length > 0) {
      // User has remote data, don't migrate (preserve remote)
      markMigrated();
      clearStorage();
      return { migrated: false, count: 0 };
    }

    // Migrate each child
    const idMapping = new Map(); // old ID -> new ID
    for (const child of localData.children) {
      const newId = await importChild(child);
      idMapping.set(child.id, newId);
    }

    // Set active child if one was selected
    if (localData.activeChildId && idMapping.has(localData.activeChildId)) {
      await setActiveChildId(idMapping.get(localData.activeChildId));
    }

    // Mark migration complete and clear local storage
    markMigrated();
    clearStorage();

    return { migrated: true, count: localData.children.length };
  } catch (err) {
    console.error('Migration failed:', err);
    return { migrated: false, count: 0, error: err.message };
  }
}

/**
 * Clear migration flag (for testing)
 */
export function resetMigrationFlag() {
  try {
    localStorage.removeItem(MIGRATION_KEY);
  } catch {
    // Ignore
  }
}
