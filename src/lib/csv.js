/**
 * CSV export/import for growth data
 *
 * Format:
 * Name,Birth Date,Sex,Date,Weight (g),Length (cm),Head Circumference (cm)
 * Baby Alice,2024-11-08,Female,2024-11-08,3400,50,35
 */

/**
 * Escape a value for CSV per RFC 4180.
 * Quotes the field if it contains commas, double quotes, or newlines.
 * @param {*} val
 * @returns {string}
 */
export function escapeCsvField(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Parse CSV text into an array of row arrays, handling quoted fields and BOM.
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsvRows(text) {
  // Strip BOM
  let input = text;
  if (input.charCodeAt(0) === 0xfeff) {
    input = input.slice(1);
  }
  // Normalize line endings
  input = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Remove trailing newline to avoid phantom empty row
  while (input.endsWith('\n')) {
    input = input.slice(0, -1);
  }

  if (input.length === 0) return [];

  const rows = [];
  let row = [];
  let i = 0;

  function readQuotedField() {
    let field = '';
    i++; // skip opening quote
    while (i < input.length) {
      if (input[i] === '"') {
        if (i + 1 < input.length && input[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          i++; // skip closing quote
          return field;
        }
      } else {
        field += input[i];
        i++;
      }
    }
    return field;
  }

  function readUnquotedField() {
    let field = '';
    while (i < input.length && input[i] !== ',' && input[i] !== '\n') {
      field += input[i];
      i++;
    }
    return field;
  }

  while (i < input.length) {
    // Read one field
    if (input[i] === '"') {
      row.push(readQuotedField());
    } else {
      row.push(readUnquotedField());
    }

    // After field: comma, newline, or end of input
    if (i < input.length && input[i] === ',') {
      i++;
      // If comma is at end of input, there's a trailing empty field
      if (i === input.length) {
        row.push('');
      }
    } else {
      // Newline or end of input — finish row
      rows.push(row);
      row = [];
      if (i < input.length) i++; // skip newline
    }
  }

  // If we ended with fields in the row (no trailing newline), push them
  if (row.length > 0) {
    rows.push(row);
  }

  return rows;
}

const SEX_TO_LABEL = { 1: 'Male', 2: 'Female' };
const LABEL_TO_SEX = { male: 1, female: 2 };

const HEADER = 'Name,Birth Date,Sex,Date,Weight (g),Length (cm),Head Circumference (cm)';

/**
 * Export children array to CSV string.
 * @param {Array} children
 * @returns {string}
 */
export function exportToCsv(children) {
  const lines = [HEADER];

  for (const child of children) {
    const name = child.profile?.name || '';
    const birthDate = child.profile?.birthDate || '';
    const sex = SEX_TO_LABEL[child.profile?.sex] || '';

    if (!child.measurements || child.measurements.length === 0) {
      lines.push(
        [escapeCsvField(name), escapeCsvField(birthDate), escapeCsvField(sex), '', '', '', ''].join(
          ','
        )
      );
    } else {
      for (const m of child.measurements) {
        lines.push(
          [
            escapeCsvField(name),
            escapeCsvField(birthDate),
            escapeCsvField(sex),
            escapeCsvField(m.date || ''),
            m.weight != null ? String(m.weight) : '',
            m.length != null ? String(m.length) : '',
            m.headCirc != null ? String(m.headCirc) : ''
          ].join(',')
        );
      }
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Import CSV string into children array with new UUIDs.
 * @param {string} csvString
 * @returns {{ children: Array }}
 */
export function importFromCsv(csvString) {
  const rows = parseCsvRows(csvString);
  if (rows.length < 1) {
    throw new Error('Empty CSV file');
  }

  // Validate header
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const expectedHeader = HEADER.toLowerCase().split(',');
  if (header.length !== expectedHeader.length || !header.every((h, i) => h === expectedHeader[i])) {
    throw new Error('Invalid CSV header');
  }

  // Group rows by (name, birthDate, sex) identity
  /** @type {Map<string, { profile: Object, measurements: Array }>} */
  const childMap = new Map();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 7) continue;

    const name = row[0].trim();
    const birthDate = row[1].trim();
    const sexLabel = row[2].trim().toLowerCase();
    const sex = LABEL_TO_SEX[sexLabel] || null;

    const key = `${name}\0${birthDate}\0${sexLabel}`;

    if (!childMap.has(key)) {
      childMap.set(key, {
        profile: {
          name: name || 'Child',
          birthDate: birthDate || null,
          sex
        },
        measurements: []
      });
    }

    const date = row[3].trim();
    const weight = row[4].trim();
    const length = row[5].trim();
    const headCirc = row[6].trim();

    // Only add measurement if there's at least a date
    if (date) {
      childMap.get(key).measurements.push({
        id: crypto.randomUUID(),
        date,
        weight: weight !== '' ? Number(weight) : null,
        length: length !== '' ? Number(length) : null,
        headCirc: headCirc !== '' ? Number(headCirc) : null
      });
    }
  }

  const children = [];
  for (const entry of childMap.values()) {
    children.push({
      id: crypto.randomUUID(),
      profile: entry.profile,
      measurements: entry.measurements
    });
  }

  return { children };
}
