/**
 * localStorage operations for persisting child growth data
 */

const STORAGE_KEY = 'growth-tracker-data';
const CURRENT_VERSION = 2;

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
      } catch (err) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Migrate data from older schema versions
 */
function migrateData(data) {
  const version = data.version ?? 0;
  if (version < 2 && (data.profile || data.measurements)) {
    const id = crypto.randomUUID();
    return {
      version: CURRENT_VERSION,
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

  if (data.children && !data.activeChildId) {
    return {
      ...data,
      version: CURRENT_VERSION,
      activeChildId: data.children[0]?.id || null
    };
  }

  return { ...data, version: CURRENT_VERSION };
}
