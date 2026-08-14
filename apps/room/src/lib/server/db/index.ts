import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as schema from './schema';

const databasePath = resolve(process.env.DATABASE_URL ?? '.data/proroom.sqlite');
mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

let bootstrapped = false;

export function ensureDatabase() {
  if (bootstrapped) return;

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      avatar_url TEXT NOT NULL DEFAULT '/avatar.svg',
      role TEXT NOT NULL DEFAULT 'staff',
      status TEXT NOT NULL DEFAULT 'offline',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room TEXT NOT NULL DEFAULT 'main',
      sender_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      background_color TEXT,
      font_color TEXT,
      answered INTEGER NOT NULL DEFAULT 0,
      reply_to_message_id INTEGER,
      reply_to_name TEXT,
      reply_to_body TEXT,
      reactions_json TEXT NOT NULL DEFAULT '{}',
      body_html TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      kind TEXT NOT NULL DEFAULT 'text',
      body TEXT NOT NULL,
      target_url TEXT,
      non_trade INTEGER NOT NULL DEFAULT 0,
      is_admin INTEGER NOT NULL DEFAULT 0,
      background_color TEXT,
      font_color TEXT,
      question_count INTEGER NOT NULL DEFAULT 0,
      question_answered INTEGER NOT NULL DEFAULT 0,
      reactions_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS alert_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      answered_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS alert_questions_alert_created_idx
      ON alert_questions (alert_id, created_at);
    CREATE TABLE IF NOT EXISTS media_elevations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_short_code TEXT NOT NULL,
      target_user_id INTEGER NOT NULL REFERENCES users(id),
      granted_by_user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS media_elevations_lookup_idx
      ON media_elevations (room_short_code, target_user_id, expires_at);

    CREATE TABLE IF NOT EXISTS shared_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      url TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      size INTEGER NOT NULL DEFAULT 0,
      uploaded_by INTEGER REFERENCES users(id),
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS private_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pair_key TEXT NOT NULL,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      recipient_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS private_messages_pair_created_idx
      ON private_messages (pair_key, created_at);
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      theme TEXT NOT NULL DEFAULT 'light',
      room_layout TEXT NOT NULL DEFAULT 'left',
      chat_text_size INTEGER NOT NULL DEFAULT 16,
      compact_alerts INTEGER NOT NULL DEFAULT 0,
      compact_chat INTEGER NOT NULL DEFAULT 0,
      do_not_disturb INTEGER NOT NULL DEFAULT 0,
      settings_json TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      question TEXT NOT NULL,
      choices_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      ended_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS polls_status_created_idx
      ON polls(status, created_at);
    CREATE TABLE IF NOT EXISTS poll_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL REFERENCES polls(id),
      sender_id INTEGER NOT NULL REFERENCES users(id),
      choice_index INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS poll_answers_poll_sender_unique
      ON poll_answers(poll_id, sender_id);
    CREATE INDEX IF NOT EXISTS poll_answers_poll_created_idx
      ON poll_answers(poll_id, created_at);
    CREATE TABLE IF NOT EXISTS saved_polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      choices_json TEXT NOT NULL,
      created_by_user_id INTEGER NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      content_html TEXT,
      is_welcome_mat INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL,
      updated_by_id INTEGER REFERENCES users(id),
      deleted_at INTEGER,
      deleted_by_id INTEGER REFERENCES users(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS notes_position_created_idx
      ON notes(position, created_at);
    CREATE INDEX IF NOT EXISTS notes_deleted_position_idx
      ON notes(deleted_at, position);
    CREATE TABLE IF NOT EXISTS note_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      content_html TEXT,
      updated_by_id INTEGER REFERENCES users(id),
      version INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS note_versions_note_version_unique
      ON note_versions(note_id, version);
    CREATE INDEX IF NOT EXISTS note_versions_note_created_idx
      ON note_versions(note_id, created_at);
    CREATE TABLE IF NOT EXISTS chat_mutes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_user_id INTEGER NOT NULL REFERENCES users(id),
      muted_by_user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS chat_mutes_target_expires_idx
      ON chat_mutes(target_user_id, expires_at);
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_last_seen_idx ON sessions(last_seen_at);
    CREATE TABLE IF NOT EXISTS spent_handoffs (
      jti TEXT PRIMARY KEY,
      redeemed_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS spent_handoffs_expires_idx ON spent_handoffs(expires_at);
    CREATE TABLE IF NOT EXISTS hidden_room_items (
      evidence_key TEXT PRIMARY KEY,
      hidden_by_user_id INTEGER NOT NULL REFERENCES users(id),
      hidden_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS captured_item_overrides (
      evidence_key TEXT PRIMARY KEY,
      answered INTEGER,
      body TEXT,
      reactions_json TEXT,
      updated_by_user_id INTEGER NOT NULL REFERENCES users(id),
      updated_at INTEGER NOT NULL
    );
  `);

  /*
    Only `auth_source` is added here now.

    The four per-room flags this block also added — `is_limited_presenter`, `has_admin_chat`,
    `is_free_trial`, `deny_archives_access` — were the wrong scope and are gone. They belong to a
    membership, which the controller owns, and they arrive with the room's configuration.

    Existing databases keep the dead columns. SQLite can drop them, but a forward-only bootstrap
    that removes data is a different kind of operation than one that adds a default, and nothing
    reads them.
  */
  // `shared_files` predates uploads: it was read-only fixture data, so it has no content type and
  // no uploader. Both are needed now - the download route sets Content-Type from the row rather
  // than sniffing the bytes, and the capture's row filter branches on the content type.
  const sharedFileColumns = new Set(
    (sqlite.pragma('table_info(shared_files)') as Array<{ name: string }>).map(
      (column) => column.name
    )
  );
  if (!sharedFileColumns.has('content_type')) {
    sqlite.exec(
      "ALTER TABLE shared_files ADD COLUMN content_type TEXT NOT NULL DEFAULT 'application/octet-stream'"
    );
  }
  if (!sharedFileColumns.has('uploaded_by')) {
    sqlite.exec('ALTER TABLE shared_files ADD COLUMN uploaded_by INTEGER REFERENCES users(id)');
  }

  // `sessions` predates the handoff, so the room a session belongs to is a late column.
  const sessionColumns = new Set(
    (sqlite.pragma('table_info(sessions)') as Array<{ name: string }>).map((column) => column.name)
  );
  if (!sessionColumns.has('room_short_code')) {
    sqlite.exec('ALTER TABLE sessions ADD COLUMN room_short_code TEXT');
  }

  const messageColumns = new Set(
    (sqlite.pragma('table_info(messages)') as Array<{ name: string }>).map((column) => column.name)
  );
  if (!messageColumns.has('is_admin')) {
    sqlite.exec('ALTER TABLE messages ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
  }
  if (!messageColumns.has('background_color')) {
    sqlite.exec('ALTER TABLE messages ADD COLUMN background_color TEXT');
  }
  if (!messageColumns.has('font_color')) {
    sqlite.exec('ALTER TABLE messages ADD COLUMN font_color TEXT');
  }
  if (!messageColumns.has('answered')) {
    sqlite.exec('ALTER TABLE messages ADD COLUMN answered INTEGER NOT NULL DEFAULT 0');
  }
  if (!messageColumns.has('reply_to_message_id')) {
    sqlite.exec('ALTER TABLE messages ADD COLUMN reply_to_message_id INTEGER');
  }
  if (!messageColumns.has('reply_to_name')) {
    sqlite.exec('ALTER TABLE messages ADD COLUMN reply_to_name TEXT');
  }
  if (!messageColumns.has('reply_to_body')) {
    sqlite.exec('ALTER TABLE messages ADD COLUMN reply_to_body TEXT');
  }
  /*
    `body_html` — a message written with the rich text editor, sanitised on the way in.

    NULLABLE, and that is the design rather than a convenience. A message is EITHER plain text or
    RTE HTML, and which one it is has to be a fact the row carries — not something the renderer
    guesses from whether the body happens to contain angle brackets. Somebody typing `<b>` into the
    ordinary composer must render as the characters they typed.

    So: plain messages leave this null and keep rendering through the existing segment parser; RTE
    messages fill it and render as sanitised HTML. `body` is still written either way, holding the
    text with tags stripped, so search, notifications and any client that never learns about this
    column keep working.
  */
  if (!messageColumns.has('body_html')) {
    sqlite.exec('ALTER TABLE messages ADD COLUMN body_html TEXT');
  }
  if (!messageColumns.has('reactions_json')) {
    sqlite.exec("ALTER TABLE messages ADD COLUMN reactions_json TEXT NOT NULL DEFAULT '{}'");
  }

  const userColumns = new Set(
    (sqlite.pragma('table_info(users)') as Array<{ name: string }>).map((column) => column.name)
  );
  if (!userColumns.has('password_hash')) {
    sqlite.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
  }
  if (!userColumns.has('auth_source')) {
    sqlite.exec("ALTER TABLE users ADD COLUMN auth_source TEXT NOT NULL DEFAULT 'password'");
  }

  const alertColumns = new Set(
    (sqlite.pragma('table_info(alerts)') as Array<{ name: string }>).map((column) => column.name)
  );
  if (!alertColumns.has('question_count')) {
    sqlite.exec('ALTER TABLE alerts ADD COLUMN question_count INTEGER NOT NULL DEFAULT 0');
  }
  if (!alertColumns.has('question_answered')) {
    sqlite.exec('ALTER TABLE alerts ADD COLUMN question_answered INTEGER NOT NULL DEFAULT 0');
  }
  if (!alertColumns.has('is_admin')) {
    sqlite.exec('ALTER TABLE alerts ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
  }
  if (!alertColumns.has('background_color')) {
    sqlite.exec('ALTER TABLE alerts ADD COLUMN background_color TEXT');
  }
  if (!alertColumns.has('font_color')) {
    sqlite.exec('ALTER TABLE alerts ADD COLUMN font_color TEXT');
  }
  if (!alertColumns.has('reactions_json')) {
    sqlite.exec("ALTER TABLE alerts ADD COLUMN reactions_json TEXT NOT NULL DEFAULT '{}'");
  }

  /*
    The room dimension, added to every table that holds room content.

    ## Why

    The original namespaces every realtime channel by the session — its word for a room. Its own
    bundle proves it: `/sess/${sessionID}/alerts/`, `/sess/${sessionID}/chat/main/`,
    `/sess/${sessionID}/roster/` and seven more, extracted to
    `docs/generated/realtime-protocol.json` from `docs/source/main.d6d3c112b59b7d0d.js`.

    Note the two segments in `chat/main/`: session, then channel. `messages.room` is the SECOND —
    the channel, which is why every row reads 'main'. This column is the first. Without it a room
    created in the controller opened showing another room's messages, alerts, notes and files,
    because none of them were scoped to anything at all.

    ## Why '' and then a backfill, rather than a DEFAULT

    `ALTER TABLE ADD COLUMN` on a populated table demands a default. A default of the reference
    room would be worse than none: every future row that forgot to set the column would silently
    join the reference room. `''` matches no room, so such a row is invisible everywhere instead —
    and the Drizzle schema declares the column `.notNull()` with no default, which makes it a
    required field and turns a forgotten insert into a COMPILE error rather than a runtime one.

    Existing rows are then backfilled to the reference room, once.
  */
  const REFERENCE_ROOM = '3625';
  const ROOM_SCOPED_TABLES = [
    'messages',
    'alerts',
    'private_messages',
    'shared_files',
    'notes',
    'polls',
    'saved_polls',
    'chat_mutes'
  ];
  for (const table of ROOM_SCOPED_TABLES) {
    const columns = new Set(
      (sqlite.pragma(`table_info(${table})`) as Array<{ name: string }>).map((c) => c.name)
    );
    if (!columns.has('room_short_code')) {
      sqlite.exec(`ALTER TABLE ${table} ADD COLUMN room_short_code TEXT NOT NULL DEFAULT ''`);
      /*
        Every row that predates the column belongs to the room this reconstruction was captured
        from — session 3625, the one in the handoff token in `ptr1.json`. Scoped to it rather than
        deleted: it is the evidence the room was rebuilt against.
      */
      sqlite
        .prepare(`UPDATE ${table} SET room_short_code = ? WHERE room_short_code = ''`)
        .run(REFERENCE_ROOM);
    }
    sqlite.exec(`CREATE INDEX IF NOT EXISTS ${table}_room_idx ON ${table}(room_short_code)`);
  }

  /*
    The two captured-item tables need the room in their PRIMARY KEY, not beside it: the same
    fixture item is re-emitted into every room, so hiding or editing one is a fact about one room's
    copy. SQLite cannot add to a primary key in place, so the table is rebuilt — the only
    destructive-shaped step here, and it copies every row forward before dropping anything.
  */
  const rebuilds: Array<{ table: string; create: string; columns: string }> = [
    {
      table: 'hidden_room_items',
      create: `CREATE TABLE hidden_room_items_scoped (
        evidence_key TEXT NOT NULL,
        room_short_code TEXT NOT NULL,
        hidden_by_user_id INTEGER NOT NULL REFERENCES users(id),
        hidden_at INTEGER NOT NULL,
        PRIMARY KEY (evidence_key, room_short_code)
      )`,
      columns: 'evidence_key, hidden_by_user_id, hidden_at'
    },
    {
      table: 'captured_item_overrides',
      create: `CREATE TABLE captured_item_overrides_scoped (
        evidence_key TEXT NOT NULL,
        room_short_code TEXT NOT NULL,
        answered INTEGER,
        body TEXT,
        reactions_json TEXT,
        updated_by_user_id INTEGER NOT NULL REFERENCES users(id),
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (evidence_key, room_short_code)
      )`,
      columns: 'evidence_key, answered, body, reactions_json, updated_by_user_id, updated_at'
    }
  ];
  for (const { table, create, columns } of rebuilds) {
    const existing = new Set(
      (sqlite.pragma(`table_info(${table})`) as Array<{ name: string }>).map((c) => c.name)
    );
    if (existing.size === 0 || existing.has('room_short_code')) continue;
    sqlite.exec(create);
    sqlite
      .prepare(
        `INSERT INTO ${table}_scoped (${columns}, room_short_code)
         SELECT ${columns}, ? FROM ${table}`
      )
      .run(REFERENCE_ROOM);
    sqlite.exec(`DROP TABLE ${table}`);
    sqlite.exec(`ALTER TABLE ${table}_scoped RENAME TO ${table}`);
  }

  bootstrapped = true;
}
