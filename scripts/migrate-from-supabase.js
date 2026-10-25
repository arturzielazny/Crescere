/**
 * One-off export of one Supabase account's data into SQL for Cloudflare D1.
 *
 * The target account must already exist in D1: open the new app, then use
 * "Save account" with the same email. The generated SQL attaches the children,
 * measurements, active-child preference and share links to that account,
 * keeping their original IDs. It uses INSERT OR IGNORE, so re-running is safe.
 *
 * Usage:
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/migrate-from-supabase.js you@example.com [out.sql]
 *
 * Then: npx wrangler d1 execute crescere --remote --file supabase-export.sql
 *
 * The service role key is in the Supabase dashboard → Project Settings → API.
 * It bypasses row-level security, so never commit it or put it in the app.
 */

import { writeFileSync } from 'node:fs';

const [email, outFile = 'supabase-export.sql'] = process.argv.slice(2);
const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !baseUrl || !serviceKey) {
  console.error(
    'Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-from-supabase.js <email> [out.sql]'
  );
  process.exit(1);
}

const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

/** Find the Supabase auth user with this email (paging through the admin API) */
async function findUser() {
  for (let page = 1; ; page++) {
    const { users } = await get(`/auth/v1/admin/users?page=${page}&per_page=1000`);
    const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (users.length < 1000) return null;
  }
}

// ============================================================================
// SQL literals
// ============================================================================

function text(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function num(value) {
  if (value === null || value === undefined) return 'NULL';
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Not a number: ${value}`);
  return String(n);
}

/** Postgres timestamptz → ISO 8601 UTC string, matching the D1 defaults */
function timestamp(value) {
  return text(value ? new Date(value).toISOString() : new Date().toISOString());
}

function list(ids) {
  return ids.map((id) => `"${id}"`).join(',');
}

// ============================================================================
// Export
// ============================================================================

const user = await findUser();
if (!user) {
  console.error(`No Supabase user with email ${email}`);
  process.exit(1);
}

const children = await get(`/rest/v1/children?user_id=eq.${user.id}&select=*&order=created_at`);
const childIds = children.map((c) => c.id);
const measurements = childIds.length
  ? await get(`/rest/v1/measurements?child_id=in.(${list(childIds)})&select=*&order=date`)
  : [];
const [preference] = await get(`/rest/v1/user_preferences?user_id=eq.${user.id}&select=*`);
const shares = await get(`/rest/v1/child_shares?owner_id=eq.${user.id}&select=*&order=created_at`);

const target = `(SELECT id FROM users WHERE email = ${text(email.toLowerCase())})`;
const lines = [
  `-- Crescere: data for ${email} exported from Supabase on ${new Date().toISOString()}`,
  `-- ${children.length} children, ${measurements.length} measurements, ${shares.length} share links`,
  '-- Fails with "NOT NULL constraint failed" if the account has not been saved in the new app yet.',
  ''
];

for (const c of children) {
  lines.push(
    `INSERT OR IGNORE INTO children (id, user_id, name, birth_date, sex, created_at, updated_at) VALUES (${text(c.id)}, ${target}, ${text(c.name ?? '')}, ${text(c.birth_date)}, ${num(c.sex)}, ${timestamp(c.created_at)}, ${timestamp(c.updated_at)});`
  );
}
for (const m of measurements) {
  lines.push(
    `INSERT OR IGNORE INTO measurements (id, child_id, date, weight, length, head_circ, created_at) VALUES (${text(m.id)}, ${text(m.child_id)}, ${text(m.date)}, ${num(m.weight)}, ${num(m.length)}, ${num(m.head_circ)}, ${timestamp(m.created_at)});`
  );
}
for (const s of shares) {
  lines.push(
    `INSERT OR IGNORE INTO child_shares (id, child_id, owner_id, token, label, created_at) VALUES (${text(s.id)}, ${text(s.child_id)}, ${target}, ${text(s.token)}, ${text(s.label ?? '')}, ${timestamp(s.created_at)});`
  );
}
if (preference?.active_child_id && childIds.includes(preference.active_child_id)) {
  lines.push(
    `INSERT INTO user_preferences (user_id, active_child_id) VALUES (${target}, ${text(preference.active_child_id)}) ON CONFLICT (user_id) DO UPDATE SET active_child_id = excluded.active_child_id;`
  );
}

writeFileSync(outFile, lines.join('\n') + '\n');
console.log(lines[1].slice(3));
console.log(`Wrote ${outFile}. Apply it with:`);
console.log(`  npx wrangler d1 execute crescere --remote --file ${outFile}`);
