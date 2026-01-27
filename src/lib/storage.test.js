/**
 * Tests for storage migrations
 *
 * These tests ensure that data from any historical schema version
 * can be successfully migrated to the current version.
 *
 * When adding a new schema version:
 * 1. Add test fixtures for the old format
 * 2. Add the migration function to storage.js
 * 3. Add tests to verify the migration works correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { migrateData, validateSchema, CURRENT_VERSION, migrations } from './storage.js';

// Mock crypto.randomUUID for consistent test results
let uuidCounter = 0;
beforeEach(() => {
  uuidCounter = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => `test-uuid-${++uuidCounter}`
  });
});

describe('Schema Migrations', () => {
  describe('Version 0 (no version field) -> Current', () => {
    it('should migrate single-child data without version field', () => {
      const v0Data = {
        profile: {
          name: 'Test Child',
          birthDate: '2024-01-01',
          sex: 1
        },
        measurements: [{ id: 'm1', date: '2024-01-01', weight: 3500, length: 50, headCirc: 35 }]
      };

      const migrated = migrateData(v0Data);
      const validation = validateSchema(migrated);

      expect(validation.valid).toBe(true);
      expect(migrated.version).toBe(CURRENT_VERSION);
      expect(migrated.children).toHaveLength(1);
      expect(migrated.children[0].profile.name).toBe('Test Child');
      expect(migrated.children[0].measurements).toHaveLength(1);
      expect(migrated.activeChildId).toBe(migrated.children[0].id);
    });

    it('should migrate empty data without version field', () => {
      const v0Data = {
        profile: { name: '', birthDate: null, sex: null },
        measurements: []
      };

      const migrated = migrateData(v0Data);
      const validation = validateSchema(migrated);

      expect(validation.valid).toBe(true);
      expect(migrated.version).toBe(CURRENT_VERSION);
      expect(migrated.children).toHaveLength(1);
    });
  });

  describe('Version 1 -> Current', () => {
    it('should migrate version 1 single-child data', () => {
      const v1Data = {
        version: 1,
        profile: {
          name: 'V1 Child',
          birthDate: '2023-06-15',
          sex: 2
        },
        measurements: [
          { id: 'm1', date: '2023-06-15', weight: 3200, length: 49, headCirc: 34 },
          { id: 'm2', date: '2023-07-15', weight: 4000, length: 52, headCirc: 36 }
        ]
      };

      const migrated = migrateData(v1Data);
      const validation = validateSchema(migrated);

      expect(validation.valid).toBe(true);
      expect(migrated.version).toBe(CURRENT_VERSION);
      expect(migrated.children).toHaveLength(1);
      expect(migrated.children[0].profile.name).toBe('V1 Child');
      expect(migrated.children[0].profile.sex).toBe(2);
      expect(migrated.children[0].measurements).toHaveLength(2);
    });

    it('should migrate version 1 data with children array but no activeChildId', () => {
      const v1Data = {
        version: 1,
        children: [
          {
            id: 'child-1',
            profile: { name: 'First Child', birthDate: '2023-01-01', sex: 1 },
            measurements: []
          },
          {
            id: 'child-2',
            profile: { name: 'Second Child', birthDate: '2024-01-01', sex: 2 },
            measurements: []
          }
        ]
      };

      const migrated = migrateData(v1Data);
      const validation = validateSchema(migrated);

      expect(validation.valid).toBe(true);
      expect(migrated.version).toBe(CURRENT_VERSION);
      expect(migrated.children).toHaveLength(2);
      expect(migrated.activeChildId).toBe('child-1');
    });
  });

  describe('Version 2 (Current)', () => {
    it('should not modify valid current version data', () => {
      const v2Data = {
        version: 2,
        children: [
          {
            id: 'child-123',
            profile: { name: 'Current Child', birthDate: '2024-06-01', sex: 1 },
            measurements: [{ id: 'm1', date: '2024-06-01', weight: 3400, length: 50, headCirc: 35 }]
          }
        ],
        activeChildId: 'child-123'
      };

      const migrated = migrateData(v2Data);
      const validation = validateSchema(migrated);

      expect(validation.valid).toBe(true);
      expect(migrated.version).toBe(2);
      expect(migrated.children[0].profile.name).toBe('Current Child');
    });
  });

  describe('Data Preservation', () => {
    it('should preserve all measurement fields during migration', () => {
      const oldData = {
        version: 0,
        profile: { name: 'Test', birthDate: '2024-01-01', sex: 1 },
        measurements: [
          {
            id: 'original-id',
            date: '2024-01-01',
            weight: 3500,
            length: 50,
            headCirc: 35
          },
          {
            id: 'partial-id',
            date: '2024-02-01',
            weight: 4000,
            length: null,
            headCirc: null
          }
        ]
      };

      const migrated = migrateData(oldData);

      expect(migrated.children[0].measurements[0]).toEqual({
        id: 'original-id',
        date: '2024-01-01',
        weight: 3500,
        length: 50,
        headCirc: 35
      });
      expect(migrated.children[0].measurements[1]).toEqual({
        id: 'partial-id',
        date: '2024-02-01',
        weight: 4000,
        length: null,
        headCirc: null
      });
    });

    it('should preserve all profile fields during migration', () => {
      const oldData = {
        profile: { name: 'Full Name', birthDate: '2023-12-25', sex: 2 },
        measurements: []
      };

      const migrated = migrateData(oldData);

      expect(migrated.children[0].profile).toEqual({
        name: 'Full Name',
        birthDate: '2023-12-25',
        sex: 2
      });
    });

    it('should preserve multiple children during migration', () => {
      const oldData = {
        version: 1,
        children: [
          {
            id: 'c1',
            profile: { name: 'Child One', birthDate: '2022-01-01', sex: 1 },
            measurements: [{ id: 'm1', date: '2022-01-01', weight: 3000, length: 48, headCirc: 33 }]
          },
          {
            id: 'c2',
            profile: { name: 'Child Two', birthDate: '2023-01-01', sex: 2 },
            measurements: [{ id: 'm2', date: '2023-01-01', weight: 3200, length: 49, headCirc: 34 }]
          },
          {
            id: 'c3',
            profile: { name: 'Child Three', birthDate: '2024-01-01', sex: 1 },
            measurements: []
          }
        ]
      };

      const migrated = migrateData(oldData);
      const validation = validateSchema(migrated);

      expect(validation.valid).toBe(true);
      expect(migrated.children).toHaveLength(3);
      expect(migrated.children[0].profile.name).toBe('Child One');
      expect(migrated.children[1].profile.name).toBe('Child Two');
      expect(migrated.children[2].profile.name).toBe('Child Three');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing profile gracefully', () => {
      const oldData = {
        measurements: [{ id: 'm1', date: '2024-01-01', weight: 3500, length: 50, headCirc: 35 }]
      };

      const migrated = migrateData(oldData);
      const validation = validateSchema(migrated);

      expect(validation.valid).toBe(true);
      expect(migrated.children[0].profile).toEqual({ name: '', birthDate: null, sex: null });
    });

    it('should handle missing measurements gracefully', () => {
      const oldData = {
        profile: { name: 'No Measurements', birthDate: '2024-01-01', sex: 1 }
      };

      const migrated = migrateData(oldData);
      const validation = validateSchema(migrated);

      expect(validation.valid).toBe(true);
      expect(migrated.children[0].measurements).toEqual([]);
    });

    it('should handle completely empty data', () => {
      const oldData = {};

      const migrated = migrateData(oldData);

      // Even empty data should produce valid structure
      expect(migrated.version).toBe(CURRENT_VERSION);
    });
  });

  describe('Schema Validation', () => {
    it('should reject data without children array', () => {
      const invalid = { version: 2, activeChildId: 'x' };
      const validation = validateSchema(invalid);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('children must be an array');
    });

    it('should reject child without id', () => {
      const invalid = {
        version: 2,
        children: [{ profile: {}, measurements: [] }],
        activeChildId: 'x'
      };
      const validation = validateSchema(invalid);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('id must be a string');
    });

    it('should reject child without profile', () => {
      const invalid = {
        version: 2,
        children: [{ id: 'x', measurements: [] }],
        activeChildId: 'x'
      };
      const validation = validateSchema(invalid);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('profile must be an object');
    });

    it('should reject child without measurements array', () => {
      const invalid = {
        version: 2,
        children: [{ id: 'x', profile: {} }],
        activeChildId: 'x'
      };
      const validation = validateSchema(invalid);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('measurements must be an array');
    });

    it('should reject missing activeChildId when children exist', () => {
      const invalid = {
        version: 2,
        children: [{ id: 'x', profile: {}, measurements: [] }]
      };
      const validation = validateSchema(invalid);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('activeChildId is required');
    });

    it('should accept valid current schema', () => {
      const valid = {
        version: 2,
        children: [{ id: 'child-1', profile: { name: 'Test' }, measurements: [] }],
        activeChildId: 'child-1'
      };
      const validation = validateSchema(valid);

      expect(validation.valid).toBe(true);
    });

    it('should accept empty children array', () => {
      const valid = {
        version: 2,
        children: [],
        activeChildId: null
      };
      const validation = validateSchema(valid);

      expect(validation.valid).toBe(true);
    });
  });

  describe('Migration Chain', () => {
    it('should have migrations for all versions up to current', () => {
      // Ensure we have a migration path for each version
      for (let v = 1; v < CURRENT_VERSION; v++) {
        expect(migrations[v]).toBeDefined();
        expect(typeof migrations[v]).toBe('function');
      }
    });

    it('should produce valid schema after migrating from any version', () => {
      const testCases = [
        // Version 0
        { profile: { name: 'V0', birthDate: '2024-01-01', sex: 1 }, measurements: [] },
        // Version 1 single-child
        { version: 1, profile: { name: 'V1', birthDate: '2024-01-01', sex: 1 }, measurements: [] },
        // Version 1 multi-child
        {
          version: 1,
          children: [
            {
              id: 'c1',
              profile: { name: 'V1 Multi', birthDate: '2024-01-01', sex: 1 },
              measurements: []
            }
          ]
        }
      ];

      for (const testData of testCases) {
        const migrated = migrateData(testData);
        const validation = validateSchema(migrated);

        expect(validation.valid).toBe(true);
        expect(migrated.version).toBe(CURRENT_VERSION);
      }
    });
  });
});
