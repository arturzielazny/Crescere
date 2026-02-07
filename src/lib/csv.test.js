import { describe, it, expect, beforeEach, vi } from 'vitest';
import { escapeCsvField, parseCsvRows, exportToCsv, importFromCsv } from './csv.js';

let uuidCounter = 0;
beforeEach(() => {
  uuidCounter = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => `test-uuid-${++uuidCounter}`
  });
});

describe('escapeCsvField', () => {
  it('returns empty string for null/undefined', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });

  it('returns plain string unchanged', () => {
    expect(escapeCsvField('hello')).toBe('hello');
    expect(escapeCsvField('123')).toBe('123');
  });

  it('quotes fields containing commas', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
  });

  it('quotes fields containing double quotes and escapes them', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes fields containing newlines', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('parseCsvRows', () => {
  it('parses simple CSV', () => {
    const rows = parseCsvRows('a,b,c\n1,2,3\n');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3']
    ]);
  });

  it('handles quoted fields', () => {
    const rows = parseCsvRows('"a,b",c\n');
    expect(rows).toEqual([['a,b', 'c']]);
  });

  it('handles escaped double quotes', () => {
    const rows = parseCsvRows('"say ""hi""",ok\n');
    expect(rows).toEqual([['say "hi"', 'ok']]);
  });

  it('strips BOM', () => {
    const rows = parseCsvRows('\uFEFFa,b\n1,2\n');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2']
    ]);
  });

  it('handles CRLF line endings', () => {
    const rows = parseCsvRows('a,b\r\n1,2\r\n');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2']
    ]);
  });

  it('handles empty fields', () => {
    const rows = parseCsvRows('a,,c\n');
    expect(rows).toEqual([['a', '', 'c']]);
  });
});

describe('exportToCsv', () => {
  it('exports children with measurements', () => {
    const children = [
      {
        id: 'c1',
        profile: { name: 'Alice', birthDate: '2024-01-01', sex: 2 },
        measurements: [
          { id: 'm1', date: '2024-01-01', weight: 3400, length: 50, headCirc: 35 },
          { id: 'm2', date: '2024-02-01', weight: 4200, length: 54, headCirc: 37 }
        ]
      }
    ];

    const csv = exportToCsv(children);
    const lines = csv.trim().split('\n');

    expect(lines[0]).toBe(
      'Name,Birth Date,Sex,Date,Weight (g),Length (cm),Head Circumference (cm)'
    );
    expect(lines[1]).toBe('Alice,2024-01-01,Female,2024-01-01,3400,50,35');
    expect(lines[2]).toBe('Alice,2024-01-01,Female,2024-02-01,4200,54,37');
  });

  it('exports child with no measurements as one row', () => {
    const children = [
      {
        id: 'c1',
        profile: { name: 'Bob', birthDate: '2024-06-15', sex: 1 },
        measurements: []
      }
    ];

    const csv = exportToCsv(children);
    const lines = csv.trim().split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('Bob,2024-06-15,Male,,,,');
  });

  it('handles null measurement values', () => {
    const children = [
      {
        id: 'c1',
        profile: { name: 'Test', birthDate: '2024-01-01', sex: 1 },
        measurements: [{ id: 'm1', date: '2024-01-01', weight: 3400, length: null, headCirc: null }]
      }
    ];

    const csv = exportToCsv(children);
    const lines = csv.trim().split('\n');

    expect(lines[1]).toBe('Test,2024-01-01,Male,2024-01-01,3400,,');
  });

  it('escapes names with commas', () => {
    const children = [
      {
        id: 'c1',
        profile: { name: 'Last, First', birthDate: '2024-01-01', sex: 1 },
        measurements: []
      }
    ];

    const csv = exportToCsv(children);
    const lines = csv.trim().split('\n');

    expect(lines[1]).toBe('"Last, First",2024-01-01,Male,,,,');
  });

  it('exports multiple children', () => {
    const children = [
      {
        id: 'c1',
        profile: { name: 'Alice', birthDate: '2024-01-01', sex: 2 },
        measurements: [{ id: 'm1', date: '2024-01-01', weight: 3400, length: 50, headCirc: 35 }]
      },
      {
        id: 'c2',
        profile: { name: 'Bob', birthDate: '2024-06-15', sex: 1 },
        measurements: [{ id: 'm2', date: '2024-06-15', weight: 3200, length: 49, headCirc: 34 }]
      }
    ];

    const csv = exportToCsv(children);
    const lines = csv.trim().split('\n');

    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toContain('Alice');
    expect(lines[2]).toContain('Bob');
  });
});

describe('importFromCsv', () => {
  it('imports basic CSV', () => {
    const csv =
      'Name,Birth Date,Sex,Date,Weight (g),Length (cm),Head Circumference (cm)\n' +
      'Alice,2024-01-01,Female,2024-01-01,3400,50,35\n';

    const result = importFromCsv(csv);

    expect(result.children).toHaveLength(1);
    expect(result.children[0].profile.name).toBe('Alice');
    expect(result.children[0].profile.birthDate).toBe('2024-01-01');
    expect(result.children[0].profile.sex).toBe(2);
    expect(result.children[0].measurements).toHaveLength(1);
    expect(result.children[0].measurements[0].weight).toBe(3400);
    expect(result.children[0].measurements[0].length).toBe(50);
    expect(result.children[0].measurements[0].headCirc).toBe(35);
  });

  it('groups rows by child identity', () => {
    const csv =
      'Name,Birth Date,Sex,Date,Weight (g),Length (cm),Head Circumference (cm)\n' +
      'Alice,2024-01-01,Female,2024-01-01,3400,50,35\n' +
      'Alice,2024-01-01,Female,2024-02-01,4200,54,37\n' +
      'Bob,2024-06-15,Male,2024-06-15,3200,49,34\n';

    const result = importFromCsv(csv);

    expect(result.children).toHaveLength(2);
    const alice = result.children.find((c) => c.profile.name === 'Alice');
    const bob = result.children.find((c) => c.profile.name === 'Bob');
    expect(alice.measurements).toHaveLength(2);
    expect(bob.measurements).toHaveLength(1);
  });

  it('handles null measurement values (empty cells)', () => {
    const csv =
      'Name,Birth Date,Sex,Date,Weight (g),Length (cm),Head Circumference (cm)\n' +
      'Test,2024-01-01,Male,2024-01-01,3400,,\n';

    const result = importFromCsv(csv);

    expect(result.children[0].measurements[0].weight).toBe(3400);
    expect(result.children[0].measurements[0].length).toBeNull();
    expect(result.children[0].measurements[0].headCirc).toBeNull();
  });

  it('handles child with no measurements (empty date)', () => {
    const csv =
      'Name,Birth Date,Sex,Date,Weight (g),Length (cm),Head Circumference (cm)\n' +
      'Empty,2024-01-01,Male,,,,\n';

    const result = importFromCsv(csv);

    expect(result.children).toHaveLength(1);
    expect(result.children[0].profile.name).toBe('Empty');
    expect(result.children[0].measurements).toHaveLength(0);
  });

  it('assigns new UUIDs', () => {
    const csv =
      'Name,Birth Date,Sex,Date,Weight (g),Length (cm),Head Circumference (cm)\n' +
      'Test,2024-01-01,Male,2024-01-01,3400,50,35\n';

    const result = importFromCsv(csv);

    expect(result.children[0].id).toMatch(/^test-uuid-/);
    expect(result.children[0].measurements[0].id).toMatch(/^test-uuid-/);
  });

  it('maps sex labels correctly', () => {
    const csv =
      'Name,Birth Date,Sex,Date,Weight (g),Length (cm),Head Circumference (cm)\n' +
      'Boy,2024-01-01,Male,2024-01-01,3400,50,35\n' +
      'Girl,2024-01-01,Female,2024-01-01,3200,49,34\n';

    const result = importFromCsv(csv);

    expect(result.children.find((c) => c.profile.name === 'Boy').profile.sex).toBe(1);
    expect(result.children.find((c) => c.profile.name === 'Girl').profile.sex).toBe(2);
  });

  it('defaults empty name to "Child"', () => {
    const csv =
      'Name,Birth Date,Sex,Date,Weight (g),Length (cm),Head Circumference (cm)\n' +
      ',2024-01-01,Male,2024-01-01,3400,50,35\n';

    const result = importFromCsv(csv);

    expect(result.children[0].profile.name).toBe('Child');
  });

  it('throws on invalid header', () => {
    const csv = 'Wrong,Headers\n1,2\n';
    expect(() => importFromCsv(csv)).toThrow('Invalid CSV header');
  });

  it('throws on empty CSV', () => {
    expect(() => importFromCsv('')).toThrow('Empty CSV file');
  });
});

describe('Round-trip fidelity', () => {
  it('export then import preserves data', () => {
    const original = [
      {
        id: 'c1',
        profile: { name: 'Alice', birthDate: '2024-01-01', sex: 2 },
        measurements: [
          { id: 'm1', date: '2024-01-01', weight: 3400, length: 50, headCirc: 35 },
          { id: 'm2', date: '2024-02-01', weight: 4200, length: 54, headCirc: 37 }
        ]
      },
      {
        id: 'c2',
        profile: { name: 'Bob', birthDate: '2024-06-15', sex: 1 },
        measurements: [{ id: 'm3', date: '2024-06-15', weight: 3200, length: null, headCirc: null }]
      }
    ];

    const csv = exportToCsv(original);
    const result = importFromCsv(csv);

    expect(result.children).toHaveLength(2);

    const alice = result.children.find((c) => c.profile.name === 'Alice');
    expect(alice.profile.birthDate).toBe('2024-01-01');
    expect(alice.profile.sex).toBe(2);
    expect(alice.measurements).toHaveLength(2);
    expect(alice.measurements[0].weight).toBe(3400);
    expect(alice.measurements[0].length).toBe(50);
    expect(alice.measurements[0].headCirc).toBe(35);
    expect(alice.measurements[1].weight).toBe(4200);

    const bob = result.children.find((c) => c.profile.name === 'Bob');
    expect(bob.profile.sex).toBe(1);
    expect(bob.measurements).toHaveLength(1);
    expect(bob.measurements[0].weight).toBe(3200);
    expect(bob.measurements[0].length).toBeNull();
    expect(bob.measurements[0].headCirc).toBeNull();
  });

  it('export then import preserves child with no measurements', () => {
    const original = [
      {
        id: 'c1',
        profile: { name: 'Empty', birthDate: '2024-01-01', sex: 1 },
        measurements: []
      }
    ];

    const csv = exportToCsv(original);
    const result = importFromCsv(csv);

    expect(result.children).toHaveLength(1);
    expect(result.children[0].profile.name).toBe('Empty');
    expect(result.children[0].measurements).toHaveLength(0);
  });
});
