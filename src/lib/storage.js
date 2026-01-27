/**
 * localStorage operations for persisting child growth data
 */

const STORAGE_KEY = 'crescere-data';
export const CURRENT_VERSION = 2;

/**
 * Migration functions for each version upgrade
 * Each function takes data at version N and returns data at version N+1
 */
export const migrations = {
  // Version 0/1 -> 2: Convert single-child to multi-child schema
  1: (data) => {
    // Handle old single-child format
    if (data.profile || data.measurements) {
      const id = crypto.randomUUID();
      return {
        version: 2,
        children: [
          {
            id,
            profile: data.profile || { name: '', birthDate: null, sex: null },
            measurements: data.measurements || []
          }
        ],
        activeChildId: id
      };
    }

    // Handle multi-child format without activeChildId
    if (data.children && !data.activeChildId) {
      return {
        ...data,
        version: 2,
        activeChildId: data.children[0]?.id || null
      };
    }

    // Already valid, just update version
    return { ...data, version: 2 };
  }
  // Future migrations go here:
  // 2: (data) => { ... return { ...data, version: 3 }; }
};

/**
 * Migrate data from any older version to current version
 * Applies migrations step-by-step through each version
 */
export function migrateData(data) {
  let current = { ...data };
  let version = current.version ?? 0;

  // Treat version 0 as version 1 (same schema)
  if (version === 0) version = 1;

  // Apply each migration in sequence
  while (version < CURRENT_VERSION) {
    const migrate = migrations[version];
    if (!migrate) {
      console.error(`No migration found for version ${version}`);
      break;
    }
    current = migrate(current);
    version = current.version;
  }

  return current;
}

/**
 * Validate that data has the expected current schema structure
 */
export function validateSchema(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data must be an object' };
  }

  if (data.version !== CURRENT_VERSION) {
    return {
      valid: false,
      error: `Invalid version: expected ${CURRENT_VERSION}, got ${data.version}`
    };
  }

  if (!Array.isArray(data.children)) {
    return { valid: false, error: 'children must be an array' };
  }

  for (let i = 0; i < data.children.length; i++) {
    const child = data.children[i];
    if (!child.id || typeof child.id !== 'string') {
      return { valid: false, error: `children[${i}].id must be a string` };
    }
    if (!child.profile || typeof child.profile !== 'object') {
      return { valid: false, error: `children[${i}].profile must be an object` };
    }
    if (!Array.isArray(child.measurements)) {
      return { valid: false, error: `children[${i}].measurements must be an array` };
    }
  }

  if (data.children.length > 0 && !data.activeChildId) {
    return { valid: false, error: 'activeChildId is required when children exist' };
  }

  return { valid: true };
}

/**
 * Load data from localStorage
 */
export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    const version = data.version ?? 0;

    // Handle schema migrations if needed
    if (version < CURRENT_VERSION) {
      return migrateData(data);
    }

    return data;
  } catch (e) {
    console.error('Failed to load from storage:', e);
    return null;
  }
}

/**
 * Save data to localStorage
 * @param {Object} data - Data to save
 * @returns {boolean} True if save succeeded
 */
export function saveToStorage(data) {
  try {
    if (!data.children || data.children.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    }

    const toSave = {
      ...data,
      version: CURRENT_VERSION,
      lastModified: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    return true;
  } catch (e) {
    // Handle quota exceeded specifically
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.error('Storage quota exceeded. Data may not be saved.');
    } else {
      console.error('Failed to save to storage:', e);
    }
    return false;
  }
}

/**
 * Clear all data from localStorage
 */
export function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export data as JSON download
 */
export function exportData() {
  const data = loadFromStorage();
  if (!data) return;

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `growth-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Import data from JSON file
 */
export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        saveToStorage(data);
        resolve(data);
      } catch (_err) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
