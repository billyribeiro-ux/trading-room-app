import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex
} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  displayName: text('display_name').notNull(),
  email: text('email').notNull().unique(),
  avatarUrl: text('avatar_url').notNull().default('/avatar.svg'),
  role: text('role').notNull().default('staff'),
  status: text('status').notNull().default('offline'),
  // Null for every row that predates password login, and for any account that is not meant to log
  // in with one. verifyPassword() treats null as "cannot authenticate" rather than as an error.
  passwordHash: text('password_hash'),
  /**
   * How this account is allowed to become a session. Provenance, stated rather than inferred.
   *
   * `getSessionUser` used to require a non-null `passwordHash`, which retired a real defect: every
   * visitor was once auto-provisioned a passwordless `staff` row from request headers, and those
   * sessions survived the switch to password login — an old cookie walked in as a presenter having
   * proved nothing.
   *
   * The password column was standing in for "something verified this account", and that proxy
   * stopped being true when the controller became the front door. A handoff account is
   * passwordless BY DESIGN: it cannot be logged into here at all, only handed off to with a
   * signed, single-use, unexpired token. Saying so explicitly keeps the original guard intact —
   * a row with `'password'` and no hash is still not a way in, which is exactly the legacy case.
   */
  authSource: text('auth_source', { enum: ['password', 'handoff'] })
    .notNull()
    .default('password'),
  /*
    The four per-room flags that used to live here are gone: `is_limited_presenter`,
    `has_admin_chat`, `is_free_trial` and `deny_archives_access`.

    All four are properties of a MEMBERSHIP, not of an account. The controller keeps them on
    `room_users` — somebody can be a trial in one room and not another, and admin chat is a
    permission granted for a room. A column here could only ever answer the same way everywhere,
    which is the wrong answer in every room but one. They arrive with the room's configuration now.

    `is_limited_presenter` is not stored anywhere at all, by anyone: `giveMicScreen` assigns it at
    runtime, so it is what a member becomes when a presenter hands them mic and screen.
  */
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

/**
 * One private message between two users.
 *
 * The capture keeps these per-peer in `globals.privChatLog[peerID]`, filled from a channel that
 * delivers to BOTH parties - the sender receives their own message back and decides which side it
 * belongs to with `isMine = te.uid == myUserID`, then buckets it under
 * `isMine ? te.recvdID : te.uid`. So one row here is one message with an explicit sender and
 * recipient, and each side derives its own view.
 *
 * `pairKey` is the two ids sorted and joined - the conversation this row belongs to, regardless of
 * direction. Without it, loading a thread means `(sender=a AND recipient=b) OR (sender=b AND
 * recipient=a)`, which no index can serve well; with it, one indexed equality lookup does.
 */
export const privateMessages = sqliteTable(
  'private_messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /*
      The room this row belongs to — see the note on `messages.roomShortCode`. Every realtime
      channel in the original is namespaced by the session, and without this column a new room
      opened showing another room's content.
    */
    roomShortCode: text('room_short_code').notNull(),
    pairKey: text('pair_key').notNull(),
    senderId: integer('sender_id')
      .notNull()
      .references(() => users.id),
    recipientId: integer('recipient_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [
    // The thread query: newest-first within one conversation, which is exactly how `getPCLog`
    // pages it.
    index('private_messages_pair_created_idx').on(table.pairKey, table.createdAt)
  ]
);

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /*
    Which room this row belongs to, as the controller's four-digit short code.

    The original namespaces EVERY realtime channel by the session — its word for a room — and the
    extraction of its own bundle proves it: `/sess/${sessionID}/alerts/`,
    `/sess/${sessionID}/chat/main/`, `/sess/${sessionID}/roster/` and seven more
    (docs/generated/realtime-protocol.json, from docs/source/main.d6d3c112b59b7d0d.js).

    Note the TWO segments in `chat/main/`: the session, then the channel. `messages.room` here is
    the second one — the channel name — which is why every row reads 'main'. This column is the
    first, and without it a freshly created room opened showing another room's messages, alerts,
    notes and files, because none of them were scoped to anything.

    `.notNull()` with NO default, deliberately. Drizzle then makes it a required field on every
    insert, so a forgotten write fails to COMPILE rather than silently landing in a room it does
    not belong to. The SQLite column carries a '' default only because ALTER TABLE ADD COLUMN
    demands one for an existing table; '' matches no real room, so a row that somehow escaped the
    type check is invisible everywhere rather than leaking into the reference room.
  */
  roomShortCode: text('room_short_code').notNull(),
  room: text('room').notNull().default('main'),
  senderId: integer('sender_id')
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  backgroundColor: text('background_color'),
  fontColor: text('font_color'),
  answered: integer('answered', { mode: 'boolean' }).notNull().default(false),
  replyToMessageId: integer('reply_to_message_id'),
  replyToName: text('reply_to_name'),
  replyToBody: text('reply_to_body'),
  reactionsJson: text('reactions_json').notNull().default('{}'),
  /**
   * Sanitised HTML for a message written with the rich text editor, or null for a plain one.
   *
   * Null is meaningful: it is what tells the renderer to use the plain-text segment parser rather
   * than `{@html}`. Sniffing tags out of `body` instead would render somebody's typed `<b>` as
   * bold, which is a different message from the one they sent.
   */
  bodyHtml: text('body_html'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const alerts = sqliteTable('alerts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /*
    Which room this row belongs to, as the controller's four-digit short code.

    The original namespaces EVERY realtime channel by the session — its word for a room — and the
    extraction of its own bundle proves it: `/sess/${sessionID}/alerts/`,
    `/sess/${sessionID}/chat/main/`, `/sess/${sessionID}/roster/` and seven more
    (docs/generated/realtime-protocol.json, from docs/source/main.d6d3c112b59b7d0d.js).

    Note the TWO segments in `chat/main/`: the session, then the channel. `messages.room` here is
    the second one — the channel name — which is why every row reads 'main'. This column is the
    first, and without it a freshly created room opened showing another room's messages, alerts,
    notes and files, because none of them were scoped to anything.

    `.notNull()` with NO default, deliberately. Drizzle then makes it a required field on every
    insert, so a forgotten write fails to COMPILE rather than silently landing in a room it does
    not belong to. The SQLite column carries a '' default only because ALTER TABLE ADD COLUMN
    demands one for an existing table; '' matches no real room, so a row that somehow escaped the
    type check is invisible everywhere rather than leaking into the reference room.
  */
  roomShortCode: text('room_short_code').notNull(),
  senderId: integer('sender_id')
    .notNull()
    .references(() => users.id),
  kind: text('kind').notNull().default('text'),
  body: text('body').notNull(),
  targetUrl: text('target_url'),
  nonTrade: integer('non_trade', { mode: 'boolean' }).notNull().default(false),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  backgroundColor: text('background_color'),
  fontColor: text('font_color'),
  questionCount: integer('question_count').notNull().default(0),
  questionAnswered: integer('question_answered', { mode: 'boolean' }).notNull().default(false),
  reactionsJson: text('reactions_json').notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

// The captured Q&A modal lists the questions asked against an alert ("There are no questions."
// when empty) and the alert row already carries questionCount/questionAnswered, but the question
// text itself had nowhere to live, so asking a question could not be persisted at all.
export const alertQuestions = sqliteTable(
  'alert_questions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    alertId: integer('alert_id').notNull(),
    senderId: integer('sender_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    answeredAt: integer('answered_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [index('alert_questions_alert_created_idx').on(table.alertId, table.createdAt)]
);

export const sharedFiles = sqliteTable('shared_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /*
    Which room this row belongs to, as the controller's four-digit short code.

    The original namespaces EVERY realtime channel by the session — its word for a room — and the
    extraction of its own bundle proves it: `/sess/${sessionID}/alerts/`,
    `/sess/${sessionID}/chat/main/`, `/sess/${sessionID}/roster/` and seven more
    (docs/generated/realtime-protocol.json, from docs/source/main.d6d3c112b59b7d0d.js).

    Note the TWO segments in `chat/main/`: the session, then the channel. `messages.room` here is
    the second one — the channel name — which is why every row reads 'main'. This column is the
    first, and without it a freshly created room opened showing another room's messages, alerts,
    notes and files, because none of them were scoped to anything.

    `.notNull()` with NO default, deliberately. Drizzle then makes it a required field on every
    insert, so a forgotten write fails to COMPILE rather than silently landing in a room it does
    not belong to. The SQLite column carries a '' default only because ALTER TABLE ADD COLUMN
    demands one for an existing table; '' matches no real room, so a row that somehow escaped the
    type check is invisible everywhere rather than leaking into the reference room.
  */
  roomShortCode: text('room_short_code').notNull(),
  name: text('name').notNull(),
  kind: text('kind').notNull(),
  url: text('url').notNull(),
  // Served back verbatim by `/uploads/[name]`, never sniffed from the bytes.
  contentType: text('content_type').notNull().default('application/octet-stream'),
  size: integer('size').notNull().default(0),
  uploadedBy: integer('uploaded_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const userSettings = sqliteTable('user_settings', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id),
  theme: text('theme').notNull().default('light'),
  roomLayout: text('room_layout').notNull().default('left'),
  chatTextSize: integer('chat_text_size').notNull().default(16),
  compactAlerts: integer('compact_alerts', { mode: 'boolean' }).notNull().default(false),
  compactChat: integer('compact_chat', { mode: 'boolean' }).notNull().default(false),
  doNotDisturb: integer('do_not_disturb', { mode: 'boolean' }).notNull().default(false),
  settingsJson: text('settings_json').notNull().default('{}'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const polls = sqliteTable(
  'polls',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /*
      The room this row belongs to — see the note on `messages.roomShortCode`. Every realtime
      channel in the original is namespaced by the session, and without this column a new room
      opened showing another room's content.
    */
    roomShortCode: text('room_short_code').notNull(),
    senderId: integer('sender_id')
      .notNull()
      .references(() => users.id),
    question: text('question').notNull(),
    choicesJson: text('choices_json').notNull(),
    status: text('status').notNull().default('active'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp' })
  },
  (table) => [index('polls_status_created_idx').on(table.status, table.createdAt)]
);

export const pollAnswers = sqliteTable(
  'poll_answers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    pollId: integer('poll_id')
      .notNull()
      .references(() => polls.id),
    senderId: integer('sender_id')
      .notNull()
      .references(() => users.id),
    choiceIndex: integer('choice_index').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [
    uniqueIndex('poll_answers_poll_sender_unique').on(table.pollId, table.senderId),
    index('poll_answers_poll_created_idx').on(table.pollId, table.createdAt)
  ]
);

export const savedPolls = sqliteTable('saved_polls', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /*
    Which room this row belongs to, as the controller's four-digit short code.

    The original namespaces EVERY realtime channel by the session — its word for a room — and the
    extraction of its own bundle proves it: `/sess/${sessionID}/alerts/`,
    `/sess/${sessionID}/chat/main/`, `/sess/${sessionID}/roster/` and seven more
    (docs/generated/realtime-protocol.json, from docs/source/main.d6d3c112b59b7d0d.js).

    Note the TWO segments in `chat/main/`: the session, then the channel. `messages.room` here is
    the second one — the channel name — which is why every row reads 'main'. This column is the
    first, and without it a freshly created room opened showing another room's messages, alerts,
    notes and files, because none of them were scoped to anything.

    `.notNull()` with NO default, deliberately. Drizzle then makes it a required field on every
    insert, so a forgotten write fails to COMPILE rather than silently landing in a room it does
    not belong to. The SQLite column carries a '' default only because ALTER TABLE ADD COLUMN
    demands one for an existing table; '' matches no real room, so a row that somehow escaped the
    type check is invisible everywhere rather than leaking into the reference room.
  */
  roomShortCode: text('room_short_code').notNull(),
  question: text('question').notNull(),
  choicesJson: text('choices_json').notNull(),
  createdByUserId: integer('created_by_user_id')
    .notNull()
    .references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const notes = sqliteTable(
  'notes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /*
      The room this row belongs to — see the note on `messages.roomShortCode`. Every realtime
      channel in the original is namespaced by the session, and without this column a new room
      opened showing another room's content.
    */
    roomShortCode: text('room_short_code').notNull(),
    name: text('name').notNull(),
    contentHtml: text('content_html'),
    isWelcomeMat: integer('is_welcome_mat', { mode: 'boolean' }).notNull().default(false),
    position: integer('position').notNull(),
    updatedById: integer('updated_by_id').references(() => users.id),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    deletedById: integer('deleted_by_id').references(() => users.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [
    index('notes_position_created_idx').on(table.position, table.createdAt),
    index('notes_deleted_position_idx').on(table.deletedAt, table.position)
  ]
);

export const noteVersions = sqliteTable(
  'note_versions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    noteId: integer('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    contentHtml: text('content_html'),
    updatedById: integer('updated_by_id').references(() => users.id),
    version: integer('version').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [
    uniqueIndex('note_versions_note_version_unique').on(table.noteId, table.version),
    index('note_versions_note_created_idx').on(table.noteId, table.createdAt)
  ]
);

export const chatMutes = sqliteTable(
  'chat_mutes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /*
      The room this row belongs to — see the note on `messages.roomShortCode`. Every realtime
      channel in the original is namespaced by the session, and without this column a new room
      opened showing another room's content.
    */
    roomShortCode: text('room_short_code').notNull(),
    targetUserId: integer('target_user_id')
      .notNull()
      .references(() => users.id),
    mutedByUserId: integer('muted_by_user_id')
      .notNull()
      .references(() => users.id),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [index('chat_mutes_target_expires_idx').on(table.targetUserId, table.expiresAt)]
);

/**
 * A presenter handing a member mic/screen at runtime — `giveMicScreen`.
 *
 * ## Why this exists at all, when `permissions_json` already holds mic/screen
 *
 * The reference has BOTH mechanisms and they are different things. `#permissionsModal` →
 * `saveCustomPerms()` sends `changeUserPerms` with `hasMic`/`hasScreen`/`hasCam`/`hasAdminChat`/
 * `canEditNotes`: durable, per-membership, and already ours on the controller. `giveMicScreen` is
 * the OTHER one — a live hand-over during a session, which the capture treats as transient and
 * explicitly does not store (`is_limited_presenter` was removed as a column for exactly that
 * reason).
 *
 * ## Why it is a server-side row rather than a client flag
 *
 * The reference makes this work by having the client re-join asserting its own `isP`:
 * `giveMicScreen` sets `globals.user.isPresenter = true`, then `disconnectAll()`, and the new join
 * payload computes `isP: isPresenter || hasCam || hasMic || hasScreen` from those client globals.
 *
 * **That is client-asserted authority, and it is precisely what was removed on 2026-08-07** — the
 * room used to map a token type to `staff` and it was a privilege escalation. Media admission comes
 * from the server now, so the elevation has to as well. This row is written by the `giveMicScreen`
 * action, which is already presenter-gated (`403` for anyone else), and read by
 * `/api/media/grant` when it mints. The client is told what happened; it never asserts it.
 *
 * ## The expiry, and the divergence it represents
 *
 * The capture's elevation dies with the browser's globals, so a reload silently takes the
 * microphone back. Ours survives a reload, deliberately: a member who refreshes mid-sentence should
 * not lose the ability to speak, and the server already knows the truth. The expiry bounds a grant
 * somebody forgot to revoke — {@link MEDIA_ELEVATION_TTL_MS}, a trading day rather than for ever.
 */
export const mediaElevations = sqliteTable(
  'media_elevations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Room-scoped, like every other realtime row — see `messages.roomShortCode`. */
    roomShortCode: text('room_short_code').notNull(),
    targetUserId: integer('target_user_id')
      .notNull()
      .references(() => users.id),
    /** Who handed it over. An audit trail needs the giver, not just the receiver. */
    grantedByUserId: integer('granted_by_user_id')
      .notNull()
      .references(() => users.id),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [
    index('media_elevations_lookup_idx').on(
      table.roomShortCode,
      table.targetUserId,
      table.expiresAt
    )
  ]
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    /**
     * Which room this session was handed off into, as the controller's four-digit short code.
     *
     * On the session rather than in the URL, because the room decides what configuration to load
     * from it. `/?room=3625` is a hint the browser can edit; a reload without it would lose the
     * room entirely, and a hand-typed one would ask the controller for somebody else's settings.
     *
     * Null for a session that predates the handoff.
     */
    roomShortCode: text('room_short_code'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [index('sessions_last_seen_idx').on(table.lastSeenAt)]
);

/**
 * Handoff tokens that have already been redeemed.
 *
 * **Currently unwritten.** On 2026-08-07 the handoff token was matched to the reference, which
 * mints no `jti` and issues a 360-day credential, so the single-use guard that filled this table
 * had nothing left to key on and was removed along with `handoff-redemption.ts`. The table is left
 * in place rather than dropped: migrations here are forward-only, an empty table costs nothing, and
 * restoring single use is a scheduled improvement that will want it back.
 *
 * The original reasoning, still the reason to restore it: a token that can be observed — a referrer
 * header, a shared screen, a proxy log, a browser history sync — can be presented again and let the
 * observer in as the person it names. A table rather than a Map, for the reason the SSE hub
 * documents about itself: module state does not survive a restart and does not span instances, and
 * both of those holes are a replay window.
 */
export const spentHandoffs = sqliteTable(
  'spent_handoffs',
  {
    /** The token's `jti`. Primary key, so a second redemption is a constraint violation. */
    jti: text('jti').primaryKey(),
    redeemedAt: integer('redeemed_at', { mode: 'timestamp' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [index('spent_handoffs_expires_idx').on(table.expiresAt)]
);

/**
 * Captured room items that have been deleted.
 *
 * Alerts and chat messages reproduced from the forensic capture are served from
 * `captured-message-fixture.json` on every load and have no row in `alerts` or `messages` - their
 * ids are negative for exactly that reason. So there is nothing for a DELETE to remove, and the
 * delete used to be recorded only in the deleting browser's memory: the presenter watched the
 * alert disappear while every other viewer kept being served it from the fixture, forever.
 *
 * Recording the deletion here instead makes it room-wide, which is how a delete behaves for a real
 * alert, while leaving the fixture itself untouched as evidence.
 */
export const hiddenRoomItems = sqliteTable(
  'hidden_room_items',
  {
    /** `evidenceKey`, e.g. "app-room-complete:app-st-message:7". Stable across fixture rebuilds. */
    evidenceKey: text('evidence_key').notNull(),
    /*
      The room this deletion applies to.

      Part of the PRIMARY KEY rather than an ordinary column: the same captured item is re-emitted
      from the fixture into every room, so "hidden" is a fact about one room's copy. Keyed on
      `evidence_key` alone, a presenter deleting an alert in their room deleted it in everybody's.
    */
    roomShortCode: text('room_short_code').notNull(),
    hiddenByUserId: integer('hidden_by_user_id')
      .notNull()
      .references(() => users.id),
    hiddenAt: integer('hidden_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [primaryKey({ columns: [table.evidenceKey, table.roomShortCode] })]
);

/**
 * Edits made to captured room items.
 *
 * The sibling of {@link hiddenRoomItems}, and it exists for the same reason: a captured item is
 * re-emitted from the fixture on every load, so any change to one has to be recorded or it is
 * discarded on the next poll. Deletion got its own table because a tombstone needs no value; this
 * one carries the values.
 *
 * Every column but the key is nullable and means "not overridden" when null - which is not the same
 * as "overridden to empty". A reader who removes their only reaction leaves `reactionsJson` as
 * `'{}'`, and that has to win over the fixture's reactions rather than fall back to them.
 *
 * The fixture itself is never written to. It stays in the repo exactly as captured, and this table
 * is the overlay applied on top of it at load time.
 */
export const capturedItemOverrides = sqliteTable(
  'captured_item_overrides',
  {
    /** `evidenceKey`, e.g. "app-room-complete:app-st-message:7". Stable across fixture rebuilds. */
    evidenceKey: text('evidence_key').notNull(),
    /** The room whose copy was edited — part of the key, for the reason on {@link hiddenRoomItems}. */
    roomShortCode: text('room_short_code').notNull(),
    /** `answered` - the ✅ marker. Null when nobody has marked it. */
    answered: integer('answered', { mode: 'boolean' }),
    /** The edited body. Null when the fixture's own body still stands. */
    body: text('body'),
    /** Serialised {@link MessageReactions}. Null when untouched; `'{}'` when emptied deliberately. */
    reactionsJson: text('reactions_json'),
    updatedByUserId: integer('updated_by_user_id')
      .notNull()
      .references(() => users.id),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [primaryKey({ columns: [table.evidenceKey, table.roomShortCode] })]
);

export type User = typeof users.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type AlertQuestion = typeof alertQuestions.$inferSelect;
export type SharedFile = typeof sharedFiles.$inferSelect;
export type PrivateMessage = typeof privateMessages.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type Poll = typeof polls.$inferSelect;
export type PollAnswer = typeof pollAnswers.$inferSelect;
export type SavedPoll = typeof savedPolls.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type NoteVersion = typeof noteVersions.$inferSelect;
export type ChatMute = typeof chatMutes.$inferSelect;
export type Session = typeof sessions.$inferSelect;

/**
 * Room-level state a PRESENTER changes at runtime, as opposed to what the owner configures on the
 * Manage page.
 *
 * `chatMode` is the first and, today, the only such value. Upstream keeps it on the session record
 * and the client reads it as `sessData.chatMode`; here the room owns its own database, so it lives
 * in a row keyed by the room. It has to PERSIST rather than merely broadcast — unlike the recording
 * state, which is genuinely momentary — because a member who joins after the presenter disabled
 * chat must find it disabled.
 */
export const roomState = sqliteTable('room_state', {
  /** One row per room. The short code is the key, so a room cannot hold two states. */
  roomShortCode: text('room_short_code').primaryKey(),
  /**
   * `g` group chat, `p` webinar mode, `d` disabled — the reference's own three letters, from
   * `changeChatMode(e, i)` and the `'p' == e` / `'d' != e` tests that read them back.
   */
  chatMode: text('chat_mode').notNull().default('g'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});
