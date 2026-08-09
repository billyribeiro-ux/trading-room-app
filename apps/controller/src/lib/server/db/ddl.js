// Shared table definitions. Imported by the app AND by plain node scripts
// (scripts/seed.mjs), so there is exactly one copy of the schema DDL.
//
// Forward-only and idempotent in both halves. Every CREATE is IF NOT EXISTS, and
// every ALTER is ADD COLUMN IF NOT EXISTS — so a fresh database gets its columns
// from the CREATE and an existing one gets any it is missing from the ALTER.
// Neither path resets or deletes existing data.
//
// PostgreSQL supports ADD COLUMN IF NOT EXISTS, which SQLite does not. Under
// SQLite this file could only create tables, and a separate bootstrap had to read
// `PRAGMA table_info` for every column and issue a bare ALTER when it was absent.
// That introspection is gone: the additive block below is now the whole of it, and
// it is declarative rather than a sequence of imperative checks.
export const DDL = `
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name TEXT NOT NULL,
      owner_email TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      suspended_at TIMESTAMPTZ,
      suspended_by TEXT,
      suspended_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);
    CREATE TABLE IF NOT EXISTS login_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL,
      last_seen_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS login_sessions_last_seen_idx ON login_sessions(last_seen_at);
    CREATE TABLE IF NOT EXISTS login_attempts (
      identity_hash TEXT PRIMARY KEY,
      failure_count INTEGER NOT NULL DEFAULT 0,
      window_started_at TIMESTAMPTZ NOT NULL,
      last_failed_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      short_code TEXT NOT NULL,
      name TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'closed',
      max_users INTEGER NOT NULL DEFAULT 0,
      text_list TEXT NOT NULL DEFAULT '',
      public_id TEXT,
      vanity_slug TEXT,
      unique_slug TEXT,
      logo_url TEXT,
      cloned_from_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS rooms_short_code_idx ON rooms(short_code);
    CREATE TABLE IF NOT EXISTS room_settings (
      room_id INTEGER PRIMARY KEY REFERENCES rooms(id),
      settings_json TEXT NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS room_users (
      id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      room_id INTEGER NOT NULL REFERENCES rooms(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      role INTEGER NOT NULL DEFAULT 2,
      banned BOOLEAN NOT NULL DEFAULT FALSE,
      muted BOOLEAN NOT NULL DEFAULT FALSE,
      paused BOOLEAN NOT NULL DEFAULT FALSE,
      non_presenter BOOLEAN NOT NULL DEFAULT FALSE,
      badges_json TEXT NOT NULL DEFAULT '[]',
      is_free_trial BOOLEAN NOT NULL DEFAULT FALSE,
      hide_user_count BOOLEAN NOT NULL DEFAULT FALSE,
      hide_pers_info BOOLEAN NOT NULL DEFAULT FALSE,
      deny_archives_access BOOLEAN NOT NULL DEFAULT FALSE,
      restrict_pm_user BOOLEAN NOT NULL DEFAULT FALSE,
      inactive BOOLEAN NOT NULL DEFAULT FALSE,
      has_password BOOLEAN NOT NULL DEFAULT FALSE,
      mobile_pair_code TEXT,
      mobile_pair_code_expires_at TIMESTAMPTZ,
      push_tokens_json TEXT NOT NULL DEFAULT '[]',
      notifications_state TEXT NOT NULL DEFAULT 'active',
      invite_status TEXT NOT NULL DEFAULT 'approved',
      discord_user_id TEXT,
      phone TEXT,
      note TEXT,
      permissions_json TEXT NOT NULL DEFAULT '{}',
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS room_users_unique_idx ON room_users(room_id, user_id);
    CREATE TABLE IF NOT EXISTS admin_audit (
      id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      user_id INTEGER,
      outcome TEXT NOT NULL,
      path TEXT NOT NULL,
      remote_ip TEXT,
      action TEXT,
      target_account_id INTEGER,
      before_value TEXT,
      after_value TEXT,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit(created_at);
    CREATE TABLE IF NOT EXISTS impersonations (
      id TEXT PRIMARY KEY,
      operator_user_id INTEGER NOT NULL,
      target_user_id INTEGER NOT NULL,
      target_account_id INTEGER NOT NULL,
      reason TEXT,
      started_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      ended_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS impersonations_expires_idx ON impersonations(expires_at);
    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      label TEXT NOT NULL,
      text_color TEXT NOT NULL DEFAULT '#ffffff',
      background_color TEXT NOT NULL DEFAULT '#777777',
      emoji TEXT,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      secret_hash TEXT NOT NULL,
      last_four TEXT NOT NULL,
      secret_ciphertext TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      last_used_at TIMESTAMPTZ,
      restrictions_json TEXT NOT NULL DEFAULT '{}'
    );

    ALTER TABLE badges ADD COLUMN IF NOT EXISTS image_url TEXT;
    ALTER TABLE rooms ADD COLUMN IF NOT EXISTS public_id TEXT;
    ALTER TABLE rooms ADD COLUMN IF NOT EXISTS vanity_slug TEXT;
    ALTER TABLE rooms ADD COLUMN IF NOT EXISTS unique_slug TEXT;
    ALTER TABLE rooms ADD COLUMN IF NOT EXISTS logo_url TEXT;
    ALTER TABLE rooms ADD COLUMN IF NOT EXISTS cloned_from_id INTEGER;
    ALTER TABLE room_users ADD COLUMN IF NOT EXISTS badges_json TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE room_users ADD COLUMN IF NOT EXISTS is_free_trial BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE room_users ADD COLUMN IF NOT EXISTS hide_user_count BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE room_users ADD COLUMN IF NOT EXISTS hide_pers_info BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE room_users ADD COLUMN IF NOT EXISTS deny_archives_access BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE room_users ADD COLUMN IF NOT EXISTS restrict_pm_user BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE room_users ADD COLUMN IF NOT EXISTS inactive BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE room_users ADD COLUMN IF NOT EXISTS has_password BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE room_users ADD COLUMN IF NOT EXISTS mobile_pair_code TEXT;
    ALTER TABLE room_users ADD COLUMN IF NOT EXISTS mobile_pair_code_expires_at TIMESTAMPTZ;
    ALTER TABLE room_users ADD COLUMN IF NOT EXISTS push_tokens_json TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE room_users ADD COLUMN IF NOT EXISTS notifications_state TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE room_users ADD COLUMN IF NOT EXISTS invite_status TEXT NOT NULL DEFAULT 'approved';
    ALTER TABLE room_users ADD COLUMN IF NOT EXISTS discord_user_id TEXT;
    ALTER TABLE room_users ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS suspended_by TEXT;
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
    ALTER TABLE admin_audit ADD COLUMN IF NOT EXISTS action TEXT;
    ALTER TABLE admin_audit ADD COLUMN IF NOT EXISTS target_account_id INTEGER;
    ALTER TABLE admin_audit ADD COLUMN IF NOT EXISTS before_value TEXT;
    ALTER TABLE admin_audit ADD COLUMN IF NOT EXISTS after_value TEXT;
    ALTER TABLE admin_audit ADD COLUMN IF NOT EXISTS reason TEXT;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS restrictions_json TEXT NOT NULL DEFAULT '{}';
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS secret_ciphertext TEXT;
  `;
