-- Crescere database schema (Cloudflare D1 / SQLite)
-- Apply with: npx wrangler d1 migrations apply crescere --local|--remote
--
-- Timestamps are ISO 8601 UTC strings; dates are YYYY-MM-DD strings.
-- Authorization is enforced in the Worker (worker/data.js), not in the database.

-- Users. A guest (anonymous) user has no email and no password;
-- claiming the account sets both on the same row, so all data stays attached.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE COLLATE NOCASE,
  password_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK ((email IS NULL) = (password_hash IS NULL))
);

-- Sessions. Only the SHA-256 hash of the session token is stored.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE children (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  birth_date TEXT NOT NULL,
  sex INTEGER NOT NULL CHECK (sex IN (1, 2)), -- 1=male, 2=female
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE measurements (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  weight INTEGER,  -- grams, nullable
  length REAL,     -- cm, nullable
  head_circ REAL,  -- cm, nullable
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Active child selection
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active_child_id TEXT REFERENCES children(id) ON DELETE SET NULL
);

-- Named share links created by a parent
CREATE TABLE child_shares (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Which users accepted which share (read-only access)
CREATE TABLE shared_child_access (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  share_id TEXT NOT NULL REFERENCES child_shares(id) ON DELETE CASCADE,
  accepted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, child_id)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_children_user_id ON children(user_id);
CREATE INDEX idx_measurements_child_id ON measurements(child_id);
CREATE INDEX idx_user_preferences_active_child_id ON user_preferences(active_child_id);
CREATE INDEX idx_child_shares_child_id ON child_shares(child_id);
CREATE INDEX idx_child_shares_owner_id ON child_shares(owner_id);
CREATE INDEX idx_shared_child_access_child_id ON shared_child_access(child_id);
CREATE INDEX idx_shared_child_access_share_id ON shared_child_access(share_id);
