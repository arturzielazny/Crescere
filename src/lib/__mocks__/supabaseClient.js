/**
 * Mock Supabase client for unit tests
 */

// In-memory storage for mock data
let mockData = {
  children: [],
  measurements: [],
  user_preferences: []
};

let mockUser = null;
let mockSession = null;
let authStateCallback = null;

/**
 * Reset all mock data - call in beforeEach
 */
export function resetMockData() {
  mockData = {
    children: [],
    measurements: [],
    user_preferences: []
  };
  mockUser = null;
  mockSession = null;
  authStateCallback = null;
}

/**
 * Set mock user for auth
 */
export function setMockUser(user) {
  mockUser = user;
  mockSession = user ? { user, access_token: 'mock-token' } : null;

  // Trigger auth state change if callback is registered
  if (authStateCallback) {
    authStateCallback('SIGNED_IN', mockSession);
  }
}

/**
 * Seed mock data for testing
 */
export function seedMockData(table, records) {
  mockData[table] = records;
}

/**
 * Get current mock data (for assertions)
 */
export function getMockData(table) {
  return mockData[table];
}

// Mock query builder
function createQueryBuilder(table) {
  let query = {
    table,
    filters: [],
    selectFields: '*',
    orderField: null,
    orderAsc: true,
    isSingle: false,
    upsertOptions: null,
    insertData: null,
    updateData: null,
    deleteMode: false
  };

  const builder = {
    select(fields = '*') {
      query.selectFields = fields;
      return builder;
    },

    insert(data) {
      query.insertData = Array.isArray(data) ? data : [data];
      return builder;
    },

    update(data) {
      query.updateData = data;
      return builder;
    },

    upsert(data, options) {
      query.insertData = Array.isArray(data) ? data : [data];
      query.upsertOptions = options;
      return builder;
    },

    delete() {
      query.deleteMode = true;
      return builder;
    },

    eq(field, value) {
      query.filters.push({ type: 'eq', field, value });
      return builder;
    },

    order(field, { ascending = true } = {}) {
      query.orderField = field;
      query.orderAsc = ascending;
      return builder;
    },

    single() {
      query.isSingle = true;
      return builder;
    },

    async then(resolve) {
      const result = await executeQuery(query);
      resolve(result);
    }
  };

  return builder;
}

async function executeQuery(query) {
  const { table, filters, isSingle, insertData, updateData, deleteMode, upsertOptions } = query;

  try {
    // Handle INSERT
    if (insertData && !upsertOptions) {
      const newRecords = insertData.map((record) => ({
        ...record,
        id: record.id || crypto.randomUUID(),
        created_at: new Date().toISOString()
      }));
      mockData[table].push(...newRecords);
      return { data: isSingle ? newRecords[0] : newRecords, error: null };
    }

    // Handle UPSERT
    if (insertData && upsertOptions) {
      const conflictField = upsertOptions.onConflict;
      insertData.forEach((record) => {
        const existingIndex = mockData[table].findIndex(
          (r) => r[conflictField] === record[conflictField]
        );
        if (existingIndex >= 0) {
          mockData[table][existingIndex] = { ...mockData[table][existingIndex], ...record };
        } else {
          mockData[table].push({ ...record, id: record.id || crypto.randomUUID() });
        }
      });
      return { data: insertData, error: null };
    }

    // Handle UPDATE
    if (updateData) {
      mockData[table] = mockData[table].map((record) => {
        if (matchesFilters(record, filters)) {
          return { ...record, ...updateData, updated_at: new Date().toISOString() };
        }
        return record;
      });
      return { data: null, error: null };
    }

    // Handle DELETE
    if (deleteMode) {
      mockData[table] = mockData[table].filter((record) => !matchesFilters(record, filters));
      return { data: null, error: null };
    }

    // Handle SELECT
    let results = mockData[table].filter((record) => matchesFilters(record, filters));

    // Handle joins for children -> measurements
    if (table === 'children' && query.selectFields.includes('measurements')) {
      results = results.map((child) => ({
        ...child,
        measurements: mockData.measurements.filter((m) => m.child_id === child.id)
      }));
    }

    if (isSingle) {
      if (results.length === 0) {
        return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
      }
      return { data: results[0], error: null };
    }

    return { data: results, error: null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

function matchesFilters(record, filters) {
  return filters.every((filter) => {
    if (filter.type === 'eq') {
      return record[filter.field] === filter.value;
    }
    return true;
  });
}

// Mock Supabase client
export const supabase = {
  from(table) {
    return createQueryBuilder(table);
  },

  auth: {
    getSession() {
      return Promise.resolve({
        data: { session: mockSession },
        error: null
      });
    },

    getUser() {
      return Promise.resolve({
        data: { user: mockUser },
        error: null
      });
    },

    signInAnonymously() {
      const user = {
        id: crypto.randomUUID(),
        is_anonymous: true,
        app_metadata: { provider: 'anonymous' },
        user_metadata: {}
      };
      setMockUser(user);
      return Promise.resolve({
        data: { user, session: mockSession },
        error: null
      });
    },

    signInWithOAuth({ provider }) {
      // OAuth redirects, so we just simulate success
      return Promise.resolve({
        data: { provider, url: 'http://localhost/oauth' },
        error: null
      });
    },

    linkIdentity({ provider }) {
      return Promise.resolve({
        data: { provider, url: 'http://localhost/link' },
        error: null
      });
    },

    signOut() {
      mockUser = null;
      mockSession = null;
      if (authStateCallback) {
        authStateCallback('SIGNED_OUT', null);
      }
      return Promise.resolve({ error: null });
    },

    onAuthStateChange(callback) {
      authStateCallback = callback;
      // Return unsubscribe function
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authStateCallback = null;
            }
          }
        }
      };
    }
  }
};
