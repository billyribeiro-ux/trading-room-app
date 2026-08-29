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
      room_short_code TEXT NOT NULL DEFAULT '',
      sender_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      answered_at INTEGER,
      reactions_json TEXT NOT NULL DEFAULT '{}',
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
    /*
      Swing Trade Alerts. Room-scoped from the first line rather than by a later ALTER, so it is
      deliberately NOT in the ROOM_SCOPED_TABLES backfill below: there is no pre-room row to
      rescue, and that loop's single-column index would only duplicate the leading column of the
      composite one created here.

      The three price columns are TEXT on purpose — see the swingAlerts comment in schema.ts.
      They are verbatim transcriptions of what a presenter typed into a text input, nothing
      computes with them, and rounding them into cents would change what the table shows.

      NO BACKTICKS ANYWHERE IN THIS COMMENT. It sits inside a template literal, so one backtick
      ends the SQL string and the rest of the schema becomes an expression — which is exactly what
      happened on the first draft, and svelte-check reported it as eight unrelated type errors.
      Same family as the rule about template syntax in a Svelte comment.
    */
    CREATE TABLE IF NOT EXISTS swing_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_short_code TEXT NOT NULL,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      entry_price TEXT NOT NULL,
      stop TEXT NOT NULL,
      target TEXT NOT NULL,
      image TEXT NOT NULL DEFAULT '',
      sender_id INTEGER NOT NULL REFERENCES users(id),
      sender_name TEXT NOT NULL,
      entry_date INTEGER NOT NULL,
      alert_id INTEGER REFERENCES alerts(id),
      deleted_at INTEGER,
      deleted_by_id INTEGER REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS swing_alerts_room_entry_idx
      ON swing_alerts(room_short_code, entry_date, id);
    /*
      Day Trade Alerts. The same shape as swing_alerts above and a SEPARATE table on purpose, for
      the reason the dayTradeAlerts comment in schema.ts gives: upstream they are two collections
      behind two sets of commands, they already differ in their windows and month ranges, and one
      shared table with a discriminator turns a WHERE-clause slip into a cross-feature leak on top
      of a cross-room one.

      Room-scoped from the first line rather than by a later ALTER, so it is deliberately NOT in
      the ROOM_SCOPED_TABLES backfill below: there is no pre-room row to rescue, and that loop's
      single-column index would only duplicate the leading column of the composite one created
      here.

      alert_id is declared here rather than added by a guarded ALTER the way swing_alerts needed
      one. That guard exists because the swing table shipped one step before its mirror did; this
      table ships with the mirror, so no database can exist that has it without the column.

      The three price columns are TEXT on purpose — see the dayTradeAlerts comment in schema.ts.
      They are verbatim transcriptions of what a presenter typed into a text input, nothing
      computes with them, and rounding them into cents would change what the table shows.

      NO BACKTICKS ANYWHERE IN THIS COMMENT. It sits inside a template literal, so one backtick
      ends the SQL string and the rest of the schema becomes an expression — which is exactly what
      happened on the first draft of the swing block above, and svelte-check reported it as eight
      unrelated type errors. Same family as the rule about template syntax in a Svelte comment.
    */
    CREATE TABLE IF NOT EXISTS day_trade_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_short_code TEXT NOT NULL,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      entry_price TEXT NOT NULL,
      stop TEXT NOT NULL,
      target TEXT NOT NULL,
      image TEXT NOT NULL DEFAULT '',
      sender_id INTEGER NOT NULL REFERENCES users(id),
      sender_name TEXT NOT NULL,
      entry_date INTEGER NOT NULL,
      alert_id INTEGER REFERENCES alerts(id),
      deleted_at INTEGER,
      deleted_by_id INTEGER REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS day_trade_alerts_room_entry_idx
      ON day_trade_alerts(room_short_code, entry_date, id);
    CREATE TABLE IF NOT EXISTS chat_mutes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_user_id INTEGER NOT NULL REFERENCES users(id),
      muted_by_user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS chat_mutes_target_expires_idx
      ON chat_mutes(target_user_id, expires_at);
    CREATE TABLE IF NOT EXISTS stream_ingest_names (
      room_short_code TEXT NOT NULL,
      ingest_path TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (room_short_code, ingest_path)
    );
    CREATE TABLE IF NOT EXISTS room_state (
      room_short_code TEXT PRIMARY KEY,
      chat_mode TEXT NOT NULL DEFAULT 'g',
      closed_message TEXT,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scheduled_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_short_code TEXT NOT NULL,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      sender_name TEXT NOT NULL,
      body TEXT NOT NULL,
      non_trade INTEGER NOT NULL DEFAULT 0,
      repeat_mode TEXT NOT NULL DEFAULT '',
      ignore_weekends INTEGER NOT NULL DEFAULT 0,
      send_on INTEGER NOT NULL,
      claimed_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_last_seen_idx ON sessions(last_seen_at);
    CREATE TABLE IF NOT EXISTS user_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_short_code TEXT NOT NULL,
      subject_user_id INTEGER NOT NULL REFERENCES users(id),
      author_user_id INTEGER NOT NULL REFERENCES users(id),
      note TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS user_notes_room_subject_idx
      ON user_notes(room_short_code, subject_user_id, created_at);
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

  /*
    `room_state.closed_message` — what a member is told when the room is closed.

    Guarded rather than assumed, for the reason the whole of this bootstrap is: it is forward-only,
    and a database created before this column existed has the table without it. `CREATE TABLE IF NOT
    EXISTS` above will not add a column to a table that already exists, which is exactly the trap
    this idiom is here for.
  */
  const roomStateColumns = new Set(
    (sqlite.pragma('table_info(room_state)') as Array<{ name: string }>).map(
      (column) => column.name
    )
  );
  if (!roomStateColumns.has('closed_message')) {
    sqlite.exec('ALTER TABLE room_state ADD COLUMN closed_message TEXT');
  }

  /*
    `swing_alerts.alert_id` — the mirrored feed message.

    Guarded rather than assumed, because the table shipped one step before the mirror did and this
    bootstrap is forward-only: a database created in between has the table without the column, and
    `CREATE TABLE IF NOT EXISTS` above will not add it.
  */
  const swingAlertColumns = new Set(
    (sqlite.pragma('table_info(swing_alerts)') as Array<{ name: string }>).map(
      (column) => column.name
    )
  );
  if (swingAlertColumns.size > 0 && !swingAlertColumns.has('alert_id')) {
    sqlite.exec('ALTER TABLE swing_alerts ADD COLUMN alert_id INTEGER REFERENCES alerts(id)');
  }

  // `sessions` predates the handoff, so the room a session belongs to is a late column.
  const sessionColumns = new Set(
    (sqlite.pragma('table_info(sessions)') as Array<{ name: string }>).map((column) => column.name)
  );
  if (!sessionColumns.has('room_short_code')) {
    sqlite.exec('ALTER TABLE sessions ADD COLUMN room_short_code TEXT');
  }
  /*
    The Admin Notes grant, 2026-08-29. A timestamp and not a boolean so it can EXPIRE — see
    `NOTES_ACCESS_TTL_MS` beside the check that reads it, and `schema.ts` for why the grant is on the
    server at all when upstream keeps it in a component field.
  */
  if (!sessionColumns.has('notes_access_at')) {
    sqlite.exec('ALTER TABLE sessions ADD COLUMN notes_access_at INTEGER');
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
    `alert_questions` gains the two columns the Q&A thread needs to be a real surface.

    ## `reactions_json` — where a Q&A reaction lives

    The reference stores it on the ALERT and addresses it by position:
    `manageChatReactions(this.isQAMsg ? this.qaMsgID : this.msg._id, ..., this.msgIndex)` at bundle
    byte 1,354,136, and the update comes back as the whole alert document, `qa` array included
    (`h[f] = o`, byte 1,410,683). That is a document store's shape, not a relational one, and
    reproducing it here would mean a JSON array indexed by ordinal — where deleting question 2 while
    somebody reacts to question 3 moves the reaction onto question 4.

    A column on the row the reaction belongs to has no such race, and the row already has the stable
    identity the reference's `qa` entries lack. **DIVERGENCE, deliberate**, and it is the reason the
    two commands in `alert-questions.remote.ts` take a question id rather than an alert id and an
    index.

    ## `room_short_code` — and this REVERSES a decision recorded in `alert-log.ts`

    That file argued the column was unnecessary: `alert_questions` reaches its room through
    `alert_id`, so an inner join to `alerts` applies the tenancy term without denormalising.

    **That is true only for alerts that have a row.** Captured alerts carry NEGATIVE ids and live in
    the fixture, and `askQuestion` accepts them — it resolves them through `capturedRoomItem` and
    writes the question. The inner join then dropped every one of those rows on the way back out, so
    a member could ask a question on a captured alert, be told nothing, and watch the thread go on
    saying "There are no questions." The row was written and unreachable.

    Worse than the loss: those rows had no room anchor at all. Two rooms both serving captured alert
    -5 would have shared its questions the moment anything did read them.

    So the fact is NOT derivable for every row, and a filter that silently drops what the write path
    accepted is not a denormalisation the schema can avoid. The column is the anchor.

    Backfilled from `alerts` for the rows that HAVE one, which is every row a room has ever
    displayed. Rows on captured alerts stay '' — their room is genuinely unknowable after the fact,
    and '' matches no room, so they remain exactly as invisible as they are today rather than
    surfacing in a room that may not be where they were asked.
  */
  const alertQuestionColumns = new Set(
    (sqlite.pragma('table_info(alert_questions)') as Array<{ name: string }>).map(
      (column) => column.name
    )
  );
  if (!alertQuestionColumns.has('reactions_json')) {
    sqlite.exec("ALTER TABLE alert_questions ADD COLUMN reactions_json TEXT NOT NULL DEFAULT '{}'");
  }
  if (!alertQuestionColumns.has('room_short_code')) {
    sqlite.exec("ALTER TABLE alert_questions ADD COLUMN room_short_code TEXT NOT NULL DEFAULT ''");
    sqlite.exec(`
      UPDATE alert_questions
         SET room_short_code = (
               SELECT alerts.room_short_code FROM alerts WHERE alerts.id = alert_questions.alert_id
             )
       WHERE room_short_code = ''
         AND EXISTS (SELECT 1 FROM alerts WHERE alerts.id = alert_questions.alert_id)
    `);
  }
  sqlite.exec(
    'CREATE INDEX IF NOT EXISTS alert_questions_room_alert_idx ON alert_questions (room_short_code, alert_id)'
  );

  /*
    The chat log's paging index.

    `loadChatPage` filters on (room_short_code, room) and orders by (created_at DESC, id DESC). The
    single-column `messages_room_idx` above narrows to the room and then leaves SQLite to sort what
    is left on every page request — which is the whole channel, every time, exactly the cost the
    paging was added to remove. This index answers the WHERE and supplies the ORDER BY in one
    ordered walk, so a page read touches the fifty rows it returns plus the offset it skips.

    Column order is the query's: equality columns first, then the sort. `id` is last so the tie
    break is served from the index rather than by a sort of the ties.
  */
  sqlite.exec(
    `CREATE INDEX IF NOT EXISTS messages_channel_paging_idx
       ON messages(room_short_code, room, created_at DESC, id DESC)`
  );

  /* The alerts log's paging index, for the same reason and in the same shape. Alerts have no
     channel, so the room is the only equality column. */
  sqlite.exec(
    `CREATE INDEX IF NOT EXISTS alerts_paging_idx
       ON alerts(room_short_code, created_at DESC, id DESC)`
  );

  /*
    THE SWEEP'S ONLY READ PATH, and the one query in this database that runs on a timer rather than
    on a request.

    `claimed_at IS NULL` first, then `send_on`: the sweep asks for the oldest UNCLAIMED row that is
    due, across every room, and the partial index means the scan is over pending rows only. Without
    it the sweep degrades with the number of alerts ever scheduled rather than with the number
    currently pending, which is the shape `CLAUDE.md` asks about every new read path — at 10,000
    delivered alerts a full scan every few seconds is the cost, and this bounds it to what is
    actually waiting.
  */
  sqlite.exec(
    `CREATE INDEX IF NOT EXISTS scheduled_alerts_due_idx
       ON scheduled_alerts(send_on) WHERE claimed_at IS NULL`
  );

  /* The manage modal's list: one room's pending alerts, soonest first. */
  sqlite.exec(
    `CREATE INDEX IF NOT EXISTS scheduled_alerts_room_idx
       ON scheduled_alerts(room_short_code, send_on)`
  );

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
