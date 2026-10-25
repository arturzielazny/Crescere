/**
 * Set a user's password directly in D1 — the only "forgot password" path,
 * since the app sends no email. Also signs that user out everywhere.
 *
 * Usage: node scripts/set-password.js <email> --remote|--local [--iterations N]
 */

import { execFileSync } from 'node:child_process';
import readline from 'node:readline';
import { hashPassword, MAX_ITERATIONS } from '../worker/password.js';

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith('--'))?.toLowerCase();
const target = args.find((a) => a === '--remote' || a === '--local');
const iterationsIndex = args.indexOf('--iterations');
const iterations = iterationsIndex >= 0 ? Number(args[iterationsIndex + 1]) : MAX_ITERATIONS;

if (!email || !target || !Number.isInteger(iterations) || iterations > MAX_ITERATIONS) {
  console.error(
    'Usage: node scripts/set-password.js <email> --remote|--local [--iterations N (max 100000)]'
  );
  process.exit(1);
}

/** Prompt twice without echoing what is typed */
async function askNewPassword() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl._writeToOutput = () => {};
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (question) => {
    process.stdout.write(question);
    const { value = '' } = await lines.next();
    process.stdout.write('\n');
    return value;
  };
  const first = await ask('New password: ');
  const second = await ask('Confirm password: ');
  rl.close();
  return [first, second];
}

const [password, confirmation] = await askNewPassword();
if (password.length < 6) {
  console.error('Password must be at least 6 characters');
  process.exit(1);
}
if (confirmation !== password) {
  console.error('Passwords do not match');
  process.exit(1);
}

const hash = await hashPassword(password, iterations);
const quotedEmail = `'${email.replace(/'/g, "''")}'`;
const sql = [
  `UPDATE users SET password_hash = '${hash}', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE email = ${quotedEmail};`,
  `DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = ${quotedEmail});`,
  `SELECT changes() AS sessions_removed, (SELECT COUNT(*) FROM users WHERE email = ${quotedEmail}) AS users_found;`
].join(' ');

execFileSync('npx', ['wrangler', 'd1', 'execute', 'crescere', target, '--command', sql], {
  stdio: 'inherit'
});
console.log('If users_found is 0, no saved account has that email.');
