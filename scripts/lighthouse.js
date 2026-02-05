#!/usr/bin/env node

/**
 * Lighthouse performance audit runner.
 * Builds the app, starts a preview server, runs Lighthouse, then cleans up.
 *
 * Prerequisites:
 *   - Chrome/Chromium installed (macOS: Google Chrome.app)
 *   - lighthouse installed globally or will be fetched via npx
 *
 * Usage:
 *   node scripts/lighthouse.js           # run audit
 *   node scripts/lighthouse.js --open    # run and open report
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { createConnection } from 'net';

const ROOT = resolve(import.meta.dirname, '..');
const REPORTS = resolve(ROOT, 'reports');
const REPORT_PATH = resolve(REPORTS, 'lighthouse.html');
const PORT = 4173;
const URL = `http://localhost:${PORT}/Crescere/`;
const openReport = process.argv.includes('--open');

if (!existsSync(REPORTS)) mkdirSync(REPORTS, { recursive: true });

function waitForPort(port, timeout = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function tryConnect() {
      if (Date.now() - start > timeout) {
        reject(new Error(`Timed out waiting for port ${port}`));
        return;
      }
      const sock = createConnection({ port }, () => {
        sock.destroy();
        resolve();
      });
      sock.on('error', () => {
        setTimeout(tryConnect, 200);
      });
    }
    tryConnect();
  });
}

console.log('🔨 Building app...');
execSync('npx vite build', { cwd: ROOT, stdio: 'inherit' });

console.log(`\n🚀 Starting preview server on port ${PORT}...`);
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: ROOT,
  stdio: 'pipe',
  detached: false
});

let serverOutput = '';
server.stdout.on('data', (d) => {
  serverOutput += d;
});
server.stderr.on('data', (d) => {
  serverOutput += d;
});

try {
  await waitForPort(PORT);
  console.log(`✅ Server ready at ${URL}`);

  console.log('\n🔍 Running Lighthouse audit...\n');
  execSync(
    `npx lighthouse "${URL}" ` +
      `--output html ` +
      `--output-path "${REPORT_PATH}" ` +
      `--chrome-flags="--headless --no-sandbox --disable-gpu" ` +
      `--only-categories=performance,accessibility,best-practices,seo ` +
      `--quiet`,
    { cwd: ROOT, stdio: 'inherit', timeout: 120000 }
  );

  console.log(`\n✅ Lighthouse report saved to: ${REPORT_PATH}`);

  if (openReport) {
    execSync(`open "${REPORT_PATH}"`);
  }
} catch (err) {
  console.error('\n❌ Lighthouse audit failed:', err.message);
  if (serverOutput) {
    console.error('Server output:', serverOutput);
  }
  process.exitCode = 1;
} finally {
  server.kill('SIGTERM');
}
