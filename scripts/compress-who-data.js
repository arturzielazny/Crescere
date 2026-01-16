/**
 * Converts WHO data files from object format to compact array format.
 *
 * Before: {"1": {"0": {"l": 0.3487, "m": 3.3464, "s": 0.14602}, ...}}
 * After:  {"1": [[0.3487, 3.3464, 0.14602], ...]}
 *
 * The array index equals the day number (or length key for WFL data).
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../src/data');

const files = [
  { name: 'who-weight', varName: 'WHO_WEIGHT', isWfl: false },
  { name: 'who-length', varName: 'WHO_LENGTH', isWfl: false },
  { name: 'who-headc', varName: 'WHO_HEADC', isWfl: false },
  { name: 'who-wfl', varName: 'WHO_WFL', isWfl: true }
];

function roundTo(num, decimals) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

for (const file of files) {
  const filePath = join(dataDir, `${file.name}.js`);
  const content = readFileSync(filePath, 'utf-8');

  // Extract the data object
  const match = content.match(/export const \w+ = ({[\s\S]+});?\s*$/);
  if (!match) {
    console.error(`Could not parse ${file.name}`);
    continue;
  }

  const data = JSON.parse(match[1]);
  const compressed = {};

  for (const sex of Object.keys(data)) {
    if (file.isWfl) {
      // WFL uses length strings as keys (e.g., "45.0", "45.1")
      // Keep as object but with array values
      compressed[sex] = {};
      for (const lengthKey of Object.keys(data[sex])) {
        const { l, m, s } = data[sex][lengthKey];
        compressed[sex][lengthKey] = [
          roundTo(l, 4),
          roundTo(m, 4),
          roundTo(s, 5)
        ];
      }
    } else {
      // Age-based data uses day numbers as keys
      // Convert to array indexed by day
      const maxDay = Math.max(...Object.keys(data[sex]).map(Number));
      compressed[sex] = new Array(maxDay + 1);
      for (const dayStr of Object.keys(data[sex])) {
        const day = parseInt(dayStr, 10);
        const { l, m, s } = data[sex][dayStr];
        compressed[sex][day] = [
          roundTo(l, 4),
          roundTo(m, 4),
          roundTo(s, 5)
        ];
      }
    }
  }

  const output = `export const ${file.varName} = ${JSON.stringify(compressed)};\n`;
  writeFileSync(filePath, output);

  const oldSize = content.length;
  const newSize = output.length;
  const savings = ((oldSize - newSize) / oldSize * 100).toFixed(1);
  console.log(`${file.name}: ${oldSize} -> ${newSize} bytes (${savings}% smaller)`);
}

console.log('\nDone! Remember to update accessor functions in zscore.js');
