#!/usr/bin/env node

/**
 * Master analysis runner — executes all code quality tools and generates reports.
 * Reports are written to the reports/ directory.
 *
 * Usage:
 *   node scripts/analyze.js           # run all analyses
 *   node scripts/analyze.js --open    # run all and open HTML reports in browser
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const REPORTS = resolve(ROOT, 'reports');
const open = process.argv.includes('--open');

if (!existsSync(REPORTS)) mkdirSync(REPORTS, { recursive: true });

const results = [];

function run(name, cmd, { optional = false } = {}) {
  const start = performance.now();
  process.stdout.write(`\n${'─'.repeat(60)}\n  ${name}\n${'─'.repeat(60)}\n`);
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: { ...process.env } });
    const ms = Math.round(performance.now() - start);
    results.push({ name, status: '✅', ms });
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    if (optional) {
      results.push({ name, status: '⚠️', ms, note: 'issues found (see above)' });
    } else {
      results.push({ name, status: '❌', ms, note: `exit code ${err.status}` });
    }
  }
}

// 1. ESLint with sonarjs
run('ESLint + SonarJS', 'npx eslint src/ --format stylish', { optional: true });

// 2. Test coverage
run('Test Coverage', 'npx vitest run --exclude "**/*.integration.test.js" --coverage', {
  optional: true
});

// 3. Copy/paste detection
run('Copy/Paste Detection (jscpd)', 'npx jscpd src/', { optional: true });

// 4. Bundle analysis (build with visualizer)
run('Bundle Analysis', 'ANALYZE=true npx vite build');

// 5. Circular dependency detection
run('Circular Dependencies (madge)', 'npx madge --circular --extensions js src/');

// 6. Dependency graph
try {
  execSync('which dot', { stdio: 'ignore' });
  run(
    'Dependency Graph (madge)',
    'npx madge --extensions js --image reports/dependency-graph.svg src/main.js'
  );
} catch {
  results.push({
    name: 'Dependency Graph',
    status: '⏭️',
    note: 'skipped (install graphviz: brew install graphviz)'
  });
}

// 7. Dead code detection (knip)
run('Dead Code Detection (knip)', 'npx knip', { optional: true });

// Summary
console.log(`\n${'═'.repeat(60)}`);
console.log('  ANALYSIS SUMMARY');
console.log(`${'═'.repeat(60)}`);

const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
for (const r of results) {
  const line = `  ${r.status}  ${pad(r.name, 35)} ${r.ms ? r.ms + 'ms' : ''}`;
  console.log(r.note ? `${line}  (${r.note})` : line);
}

console.log(`\n  Reports directory: ${REPORTS}/`);

const reportFiles = [
  ['Coverage (HTML)', 'reports/coverage/index.html'],
  ['Coverage (lcov)', 'reports/coverage/lcov.info'],
  ['Coverage (JSON)', 'reports/coverage/coverage-summary.json'],
  ['Duplication', 'reports/duplication/html/index.html'],
  ['Bundle Treemap', 'reports/bundle.html'],
  ['Dependency Graph', 'reports/dependency-graph.svg']
];

let hasReports = false;
for (const [label, path] of reportFiles) {
  if (existsSync(resolve(ROOT, path))) {
    if (!hasReports) {
      console.log('');
      hasReports = true;
    }
    console.log(`  📄 ${pad(label, 25)} ${path}`);
  }
}

console.log(`\n${'═'.repeat(60)}\n`);

// Optionally open HTML reports
if (open) {
  for (const [_label, path] of reportFiles) {
    const full = resolve(ROOT, path);
    if (existsSync(full) && path.endsWith('.html')) {
      execSync(`open "${full}"`);
    }
  }
}
