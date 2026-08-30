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
  /**
   * When this account last became a session — the reference's `userXref.lastLogin`.
   *
   * ## Why a column and not `MAX(sessions.created_at)`
   *
   * `sessions` cannot answer this. `createSessionFor` deletes every prior row for the account
   * before inserting (one account, one active session), and `logout` deletes the row outright, so
   * the table holds at most one row per person and nothing at all once they sign out. Deriving a
   * last login from it would show a date only for people who are still signed in — which is the
   * one case the Last Login row does not need, since their presence already says it.
   *
   * ## Why on `users` and not on a membership
   *
   * Signing in is an act of the ACCOUNT. The four per-room flags removed from this table above were
   * removed because a column here can only answer the same way in every room; this one is SUPPOSED
   * to, because there is one login whichever room it leads to.
   *
   * Null for every row that predates the column and for any account that has never logged in. The
   * modal renders `n/a` for null, which is what the reference renders for a missing `lastLogin`.
   */
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
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

/**
 * ONE SWEEP of the chat log into the archive — the thing `archiveLogs` creates and `unarchiveLogs`
 * restores.
 *
 * ## The capture, read whole rather than inferred from the command name
 *
 * `archiveOptions()` at bundle byte 1,444,182 is a four-button dialog titled "Archive Chat
 * Messages", and reading it is what settles the data model:
 *
 * ```js
 * all:       confirm("Are you sure you want to archive the chats for everyone?")
 *              -> archiveChatDate(new Date)
 * dateRange: const o = new Date($("#date-archive-chat").val());
 *            if (isNaN(o.getTime())) return bootbox.alert("Please select a date."), !1;
 *            confirm("Are you sure you want to archive the chats older than selected date?")
 *              -> archiveChatDate(o)
 * ```
 *
 * and `archiveChatDate(e)` sends `{type:"chat", date:e, channel:this.channel}`.
 *
 * **"Archive All" is not a second operation.** It passes `new Date()` — everything older than NOW —
 * so ONE predicate serves both buttons, and `olderThan` below is the only parameter the sweep has.
 * Modelling them separately would have been two code paths for one rule.
 *
 * ## `channel`, because the reference scopes by it and this room has more than one
 *
 * The send carries `this.channel`, which is the chat COLUMN — `main`, the off-topic tab, the extra
 * column. Archiving the main log must not sweep the off-topic one, and a sweep that ignored the
 * channel would be discovered by whoever lost the wrong log.
 *
 * ## What is stored beyond the identity, and why each has a reader
 *
 * `messageCount` is the archive browser's own label: the reference lists archives by DATE
 * (`loadLogs()` sets `logDates` from `getArchiveList`), and a list of bare dates gives a presenter
 * no way to tell a sweep of four messages from a sweep of four thousand before restoring it.
 * `archivedByUserId` is who did it — an administrative act on everybody's data, and the one
 * question an incident asks first.
 */
export const chatArchives = sqliteTable(
  'chat_archives',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    roomShortCode: text('room_short_code').notNull(),
    /** The chat column this sweep took, `messages.room` — NOT the room. */
    channel: text('channel').notNull(),
    /** Everything strictly older than this was swept. "Archive All" passes the moment it was run. */
    olderThan: integer('older_than', { mode: 'timestamp' }).notNull(),
    archivedAt: integer('archived_at', { mode: 'timestamp' }).notNull(),
    archivedByUserId: integer('archived_by_user_id')
      .notNull()
      .references(() => users.id),
    messageCount: integer('message_count').notNull()
  },
  (table) => [
    /* Every read is "the archives of room R", newest first. Nothing ever reads across rooms. */
    index('chat_archives_room_idx').on(table.roomShortCode, table.archivedAt)
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
  /**
   * The archive this message was swept into, or null while it is LIVE.
   *
   * ## Why a nullable pointer and not a `deleted_at`-style flag
   *
   * Because the reference restores. `unarchiveLogs {type, roomID, archiveID}` puts a whole archive
   * back into the live log, so the archive has to be a THING with an identity, not a state each row
   * remembers separately — otherwise "restore the sweep from the 14th" means finding every row
   * whose timestamp falls in a window, which is a different and lossier question.
   *
   * NULL is the live state, so every existing row is live without a backfill and every insert stays
   * a live insert without naming this column. That is deliberate: an archive is a rare
   * administrative act, and the common path should not have to know it exists.
   *
   * **The exclusion lives in `chatRows()`, and it is the load-bearing half.** A pointer nothing
   * filters on is a column that archives nothing; `chat-archive-contract.test.ts` asserts the
   * predicate is there, because forgetting it would leave the whole feature green and inert.
   */
  archiveId: integer('archive_id').references(() => chatArchives.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

/**
 * `hasAlertScheduler` — an alert a presenter wrote now and the server posts later.
 *
 * ## Durable rows, an ephemeral timer, and why that split is the whole design
 *
 * The ROW is the schedule. `send_on` is an absolute instant, so a restart loses nothing: the sweep
 * comes back and asks the same question it always asks — what is due and unclaimed. Nothing about
 * when an alert fires lives in a process. That is the difference between this and
 * `server/room-events.ts`, whose state is live connections and is ephemeral by nature.
 *
 * ## `claimed_at` is a claim, not a status
 *
 * It is set by an atomic conditional `UPDATE … WHERE claimed_at IS NULL … RETURNING`, which is the
 * pattern `CLAUDE.md` names for exactly this shape: a SELECT-then-UPDATE is a TOCTOU, and two
 * sweeps that both read a due row would both post it. Zero rows back means another sweep won, and
 * losing that race is the normal path rather than an error.
 *
 * The room runs one node process today (`docs/NEXT-SESSION.md` §"The room cannot deploy to Vercel"
 * — a WAL SQLite file and long-lived SSE), so the race cannot currently happen. The claim is here
 * anyway because the day it can, nothing else would say so: a duplicate alert to every member of a
 * trading room is not a defect anyone would trace back to a missing WHERE clause.
 *
 * ## What is NOT stored, and why
 *
 * `sendTxt`, `sendEmail`, `sendTweet`, `sendLaterAsNick`, `sendLaterAsEmail` and `dontCrossPost`
 * all travel on the reference's `alertMsgLater` payload and are dropped here. Every one of them is
 * an instruction to a downstream this deployment does not have — SMS, the mailer's alert path,
 * Twitter, and the cross-post fan-out `linkedRoomAlerts` is itself blocked on. Storing a flag no
 * consumer reads is the thing this repository refuses by name, so they are refused at the boundary
 * and the refusal is recorded rather than the column being created empty.
 */
export const scheduledAlerts = sqliteTable('scheduled_alerts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** Same rule as `alerts.roomShortCode`: `.notNull()` with no default, so a forgotten write fails to compile. */
  roomShortCode: text('room_short_code').notNull(),
  senderId: integer('sender_id')
    .notNull()
    .references(() => users.id),
  /**
   * `n: globals.user.name` on the reference's own payload, stored rather than joined.
   *
   * The manage modal renders `alert.n`, and an alert posted weeks later must carry the name the
   * presenter had when they scheduled it — joining `users` would rewrite history on a rename, which
   * for a trade alert is a change to who appears to have called it.
   */
  senderName: text('sender_name').notNull(),
  body: text('body').notNull(),
  nonTrade: integer('non_trade', { mode: 'boolean' }).notNull().default(false),
  /** `''` | `'daily'` | `'weekly'` — `#lib/scheduled-alert.ts` owns the vocabulary and the advance. */
  repeatMode: text('repeat_mode').notNull().default(''),
  ignoreWeekends: integer('ignore_weekends', { mode: 'boolean' }).notNull().default(false),
  /**
   * `timestamp_ms`, and it is the ONLY table here that departs from the second-precision `timestamp`
   * every other column uses. The reason is that these three are COMPARED to decide an action, where
   * the rest are recorded to be displayed.
   *
   * Drizzle's `timestamp` mode stores whole seconds, so a `send_on` written from `Date.now()` loses
   * its milliseconds — and it truncates DOWNWARDS, which makes the row due up to 999ms EARLY. Found
   * by this feature's own contract test before it shipped: a sweep run at `sendOn - 1ms` fired an
   * alert it should not have, because the stored instant was already in the past.
   *
   * Harmless for one alert and not harmless as a rule: `nextSendOn` advances from the STORED value,
   * so a daily series would lose up to a second per occurrence and walk backwards through the day.
   * Milliseconds make the value round-trip exactly, and `claimed_at` and `created_at` follow it so
   * that no reader of this table has to remember which of its columns is in which unit.
   */
  sendOn: integer('send_on', { mode: 'timestamp_ms' }).notNull(),
  /** Non-null once a sweep has taken this row. See the docblock: a claim, not a status. */
  claimedAt: integer('claimed_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
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
    /*
      The room, held on the row rather than derived from `alerts`.

      REVERSES the argument in `alert-log.ts`, which held that the inner join to `alerts` applied
      the tenancy term for free. It does — for alerts that have a row. CAPTURED alerts carry
      negative ids and live in the fixture; `askQuestion` accepts them and writes the question, and
      the join then dropped every such row on the way back out. The write path accepted what the
      read path could not see, and those rows had no room anchor at all, so two rooms serving the
      same captured alert would have shared them the moment anything did read them.

      `.notNull()` with NO default, for the reason `shared_files.roomShortCode` gives: Drizzle then
      makes it a required field and a forgotten insert fails to COMPILE. The SQLite column carries a
      '' default only because ALTER TABLE ADD COLUMN demands one.
    */
    roomShortCode: text('room_short_code').notNull(),
    senderId: integer('sender_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    answeredAt: integer('answered_at', { mode: 'timestamp' }),
    /*
      Reactions on ONE question, keyed exactly as `messages.reactions_json` and `alerts.reactions_json`
      are, and read through the same `parseReactions` / `toggleReaction` pair.

      The reference keeps them on the alert and addresses them by ORDINAL — see the note in
      `db/index.ts`. A column on the row the reaction belongs to cannot be moved onto its neighbour
      by a concurrent delete.
    */
    reactionsJson: text('reactions_json').notNull().default('{}'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [
    index('alert_questions_alert_created_idx').on(table.alertId, table.createdAt),
    // The load reads one room's questions for a page of alert ids; the room is the leading term
    // because it is the one predicate every read of this table carries.
    index('alert_questions_room_alert_idx').on(table.roomShortCode, table.alertId)
  ]
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

/**
 * PER-MEMBER ADMIN NOTES — what a presenter writes ABOUT a member, on `#user-modal`'s notes tab.
 *
 * Not to be confused with `notes` above, which is the SESSION notes pane: shared documents with a
 * welcome mat, a position and a version history. These are one line each, about one person, and
 * nobody but a presenter ever sees them.
 *
 * ## The capture, read whole rather than guessed
 *
 * Found on 2026-08-29 by an orphan CSS class — `smallAvatarImg` had a rule in `app.css` and no
 * wearer, and the class turned out to be the avatar on a row of this list. `fTe` @ bundle byte
 * 2,064,959 is one row:
 *
 * ```
 * <img class="smallAvatarImg" [src]="e.pic || 'https://…/avatar/' + e.emailHash + '?d=mm&s=80'"
 *      [alt]="user.nick">
 * " [" (e.date | date:'short') "] " e.name ": " e.note " "
 * <button (click)="deleteNode(note, $index)"><i class="fas fa-minus-circle"></i></button>
 * ```
 *
 * and `mTe` wraps them in a `col` scrolling at `max-height:300px` with " Add Note " below. The two
 * commands are `addUserNote {user, note}` and `delUserNote {user, noteIDX}`, both answering with
 * the whole new array (byte 2,079,597).
 *
 * ## THREE DIVERGENCES, each deliberate and each recorded where it is made
 *
 * **1. Deletion is by ID, not by ordinal.** Upstream sends `noteIDX`, the row's position in the
 * array it happens to be rendering. Two presenters with the modal open delete different notes; the
 * second request arrives against a list that has already shifted and removes the wrong one. That is
 * the read-then-write race this repository refuses by name, and the reason the reference has to do
 * it is that its notes have no identity — the Q&A thread has the same constraint and the same
 * parent-plus-ordinal addressing. **Ours have identity because we own the table**, so there is no
 * reason to inherit the race.
 *
 * **2. The author is a FOREIGN KEY, not a snapshot.** Upstream's row carries `{pic, emailHash,
 * name}` copied in at write time. Joining instead means a presenter who changes their display name
 * changes it on their old notes too, which is a real behaviour difference and is the right one: one
 * source of truth for who somebody is, and no second copy of an email hash to keep in step.
 *
 * **3. `alt` is the SUBJECT and `src` is the AUTHOR, upstream.** That is not a transcription error
 * here — read the bindings above. It is upstream's own inconsistency, and it is preserved in the
 * comment rather than in the markup: the room labels each avatar with the person it is a picture
 * of, because a screen reader announcing the wrong name is a defect wherever it was copied from.
 *
 * ## The index is the read path
 *
 * Every read is *"the notes about member X in room R"*, so the index leads with both and carries
 * `createdAt` to serve the ordering without a sort. Without it this grows into a scan of every note
 * in every room — the unbounded read this repository asks about at 10,000 rows.
 */
export const userNotes = sqliteTable(
  'user_notes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /* Same reason as every other row here: a note about a member of room A is not room B's. */
    roomShortCode: text('room_short_code').notNull(),
    /** The member the note is ABOUT. */
    subjectUserId: integer('subject_user_id')
      .notNull()
      .references(() => users.id),
    /** The presenter who WROTE it. Joined for the name and avatar rather than copied — see above. */
    authorUserId: integer('author_user_id')
      .notNull()
      .references(() => users.id),
    note: text('note').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [
    index('user_notes_room_subject_idx').on(
      table.roomShortCode,
      table.subjectUserId,
      table.createdAt
    )
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

/**
 * One Swing Trade Alert.
 *
 * The log the `#swingAlerts` pane renders, decoded in `docs/decoded/swing-alerts.md`. Room-scoped
 * like every other room-content table — see the note on `messages.roomShortCode` — and every query
 * in `swing-alerts-repository.ts` carries the predicate, because this table is per-room trading
 * information and a missing predicate here is one room reading another room's positions.
 *
 * ## Why the three price columns are TEXT
 *
 * This repository's rule is that money is `i64` / `BIGINT` end to end, and that rule is not being
 * waived here — it does not reach these columns, because none of them is money that anything does
 * arithmetic on. The decode is unambiguous on both halves of that (spec §2 and §3):
 *
 *   - the inputs are `type="text"`, explicitly and deliberately, not `type="number"`;
 *   - the cells are bare interpolations — no pipe, no `toFixed`, no currency — so what is stored is
 *     what the presenter typed and what the table shows.
 *
 * There is no multiplication, no summing and no comparison anywhere on this path, including in the
 * CSV export. Storing cents would mean parsing a free-text field, rounding it, and rendering
 * something back that the presenter did not type. If a future feature ever computes with these —
 * a risk/reward ratio, say — that feature adds its own parsed column and leaves these verbatim.
 *
 * ## Why `senderName` is stored rather than joined
 *
 * The client supplies it on every create AND every edit, from `globals.user.nick || .name`
 * (spec §5c, byte 1,982,850), so an edit by a different presenter rewrites the row's sender — the
 * value is a property of the write, not of the account. A join to `users` would answer with the
 * current display name of the original author instead, which is a different fact. `senderId` is
 * kept beside it for the avatar and for an audit trail, and it is what `senderPic` / `senderAvt`
 * are derived from at read time; the client never writes either of those.
 */
export const swingAlerts = sqliteTable(
  'swing_alerts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /*
      The room this row belongs to — see the note on `messages.roomShortCode`. Every realtime
      channel in the original is namespaced by the session, and without this column a new room
      opened showing another room's content.
    */
    roomShortCode: text('room_short_code').notNull(),
    symbol: text('symbol').notNull(),
    /** `'long'` | `'short'`, the only two values the radio pair offers. */
    direction: text('direction', { enum: ['long', 'short'] }).notNull(),
    entryPrice: text('entry_price').notNull(),
    stop: text('stop').notNull(),
    target: text('target').notNull(),
    /** `''` for a row with no image, which is what leaves the image cell empty. */
    image: text('image').notNull().default(''),
    senderId: integer('sender_id')
      .notNull()
      .references(() => users.id),
    senderName: text('sender_name').notNull(),
    /**
     * The row's timestamp, named as the decode names it.
     *
     * `entryDate`, NOT `created` — the row templates and both CSV builders read `entryDate` and the
     * string `created` appears on no swing path. Keeping the reference's name here means the column,
     * the DTO and the template all say the same word.
     */
    entryDate: integer('entry_date', { mode: 'timestamp' }).notNull(),
    /**
     * The mirrored message this alert posted into the MAIN alerts feed.
     *
     * ## Why there is a mirror at all
     *
     * A swing submit sends TWO commands, not one — read at bundle byte 1,983,136 onwards:
     * `swingAlertMsg` writes the row, then `alertMsg` posts `formatSwingAlertTxt(h)` into the feed.
     * Editing sends `editSwingAlertMsg` and then `editAlertMessageSwing`; deleting removes both.
     * A rebuild that keeps only the row leaves the feed copy orphaned the first time somebody edits.
     *
     * ## Why a column instead of the reference's text scan
     *
     * The reference has no key to join on, so `editSwingAlert` walks `globals.alertsLog` comparing
     * `r.txt == formatSwingAlertTxt(row)` to recover the feed message's `_id`, and `deleteSwingAlert`
     * repeats that scan. That is a linear scan of the feed per edit, and it silently finds nothing
     * once anybody edits the feed copy by hand — `alertLogID` is then `""` and the second command is
     * a no-op against an empty id.
     *
     * This room owns both tables, so the association is recorded when it is created and the two
     * writes go in one transaction. The observable behaviour is the reference's; what changes is
     * that it cannot come apart. NULLABLE because a row that predates this column, or whose feed
     * copy a presenter deleted from the feed itself, still has to edit and delete cleanly.
     */
    alertId: integer('alert_id').references(() => alerts.id),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    deletedById: integer('deleted_by_id').references(() => users.id)
  },
  (table) => [
    /*
      The log query, whole: room equality first, then the sort the list is displayed in.

      `getSwingAlertsLog` reads one room's rows newer than a cutoff and shows them newest first
      (the reference reverses the server's oldest-first array and prepends new rows). This index
      answers the room predicate, the `entry_date` range and the ordering in one ordered walk, so
      the read touches the rows it returns rather than the room's whole history. `id` is last so
      the tie-break comes from the index instead of a sort of the ties.
    */
    index('swing_alerts_room_entry_idx').on(table.roomShortCode, table.entryDate, table.id)
  ]
);

/**
 * One Day Trade Alert.
 *
 * The log the `#dayTradeAlerts` pane renders, decoded in `docs/decoded/day-trade-alerts.md`. Room
 * scoped like every other room-content table — see the note on `messages.roomShortCode` — and every
 * query in `day-trade-alerts-repository.ts` carries the predicate, because this table is per-room
 * trading information and a missing predicate here is one room reading another room's positions.
 *
 * ## Why this is a SECOND table and not a `kind` column on `swing_alerts`
 *
 * Because upstream they are two collections behind two sets of commands, and the room's job is to
 * be that shape. Folding them together would mean every read of either feature carries a
 * discriminator predicate the reference does not have, every index gains a leading column, and a
 * bug in one feature's WHERE clause becomes a cross-FEATURE leak on top of the cross-room one.
 * They also do not stay identical: the two logs already differ in their windows (21 vs 42 days),
 * their month ranges (15 vs 20) and their conversions (`4 * m * 7` vs `30 * m`), and one shared
 * table is where those differences go to be forgotten.
 *
 * Everything else about it is `swing_alerts`, deliberately, down to the column order — the two
 * models are character-identical upstream (bytes 1,955,146 and 1,955,394), so an engineer who has
 * read one table has read both.
 *
 * ## Why the three price columns are TEXT
 *
 * This repository's rule is that money is `i64` / `BIGINT` end to end, and that rule is not being
 * waived here — it does not reach these columns, because none of them is money that anything does
 * arithmetic on:
 *
 *   - the inputs are `type="text"`, explicitly and deliberately (consts 224, 225, 226), not
 *     `type="number"`;
 *   - the cells are bare `Ze(x)` interpolations — no pipe, no `toFixed`, no currency — so what is
 *     stored is what the presenter typed and what the table shows.
 *
 * There is no multiplication, no summing and no comparison anywhere on this path, including in the
 * CSV export. Storing cents would mean parsing a free-text field, rounding it, and rendering
 * something back that the presenter did not type. If a future feature ever computes with these —
 * a risk/reward ratio, say — that feature adds its own parsed column and leaves these verbatim.
 *
 * ## Why `senderName` is stored rather than joined
 *
 * The client supplies it on every create AND every edit, from `globals.user.nick || .name` (read at
 * byte 1,986,885, inside the payload object `h` built at 1,986,780 — the body of the create command and the
 * `newDayTradeAlertMsg` field of the edit command), so an edit by a different presenter rewrites
 * the row's sender — the value is a property of the write, not of the account. A join to `users`
 * would answer with the current display name of the original author instead, which is a different
 * fact. `senderId` is kept beside it for the avatar and for an audit trail, and it is what
 * `senderPic` / `senderAvt` are derived from at read time; the client never writes either of those.
 */
export const dayTradeAlerts = sqliteTable(
  'day_trade_alerts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /*
      The room this row belongs to — see the note on `messages.roomShortCode`. Every realtime
      channel in the original is namespaced by the session, and without this column a new room
      opened showing another room's content.
    */
    roomShortCode: text('room_short_code').notNull(),
    symbol: text('symbol').notNull(),
    /** `'long'` | `'short'`, the only two values the radio pair offers (consts 228 and 230). */
    direction: text('direction', { enum: ['long', 'short'] }).notNull(),
    entryPrice: text('entry_price').notNull(),
    stop: text('stop').notNull(),
    target: text('target').notNull(),
    /** `''` for a row with no image, which is what leaves the image cell empty. */
    image: text('image').notNull().default(''),
    senderId: integer('sender_id')
      .notNull()
      .references(() => users.id),
    senderName: text('sender_name').notNull(),
    /**
     * The row's timestamp, named as the decode names it.
     *
     * `entryDate`, NOT `created` — the row template formats `e.entryDate` (byte 1,943,723) and the
     * CSV reads `l.entryDate` (byte 1,989,640), and the string `created` appears on no Day Trade
     * path. Keeping the reference's name here means the column, the DTO and the template all say
     * the same word.
     */
    entryDate: integer('entry_date', { mode: 'timestamp' }).notNull(),
    /**
     * The mirrored message this alert posted into the MAIN alerts feed.
     *
     * ## Why there is a mirror at all
     *
     * A Day Trade submit sends TWO commands, not one — read at byte 1,985,961 onwards:
     * `dayTradeAlertMsg` writes the row, then `alertMsg` posts `formatDayTradeAlertTxt(h)` into the
     * feed. Editing sends `editDayTradeAlertMsg` and then `editAlertMessageSwing`; deleting removes
     * both. A rebuild that keeps only the row leaves the feed copy orphaned the first time somebody
     * edits.
     *
     * ## Why a column instead of the reference's text scan
     *
     * The reference has no key to join on, so `editDayTradeAlert` walks `globals.alertsLog`
     * comparing `r.txt == formatDayTradeAlertTxt(row)` to recover the feed message's `_id`, and
     * `deleteDayTradeAlert` repeats that scan. Both loops are a linear walk of the feed, and
     * NEITHER of them breaks (bytes 1,988,461 and 1,988,885) — where the Swing equivalents stop at
     * the first match, these run to the end and the LAST match wins. Both also find nothing once
     * anybody edits the feed copy by hand, leaving `alertLogID` as `""` and the second command a
     * no-op against an empty id.
     *
     * This room owns both tables, so the association is recorded when it is created and the two
     * writes go in one transaction. The observable behaviour is the reference's; what changes is
     * that it cannot come apart. NULLABLE because a row whose feed copy a presenter deleted from
     * the feed itself still has to edit and delete cleanly.
     */
    alertId: integer('alert_id').references(() => alerts.id),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    deletedById: integer('deleted_by_id').references(() => users.id)
  },
  (table) => [
    /*
      The log query, whole: room equality first, then the sort the list is displayed in.

      `getDayTradeAlertsLog` reads one room's rows newer than a cutoff and shows them newest first
      (the reference reverses the server's oldest-first array and prepends new rows). This index
      answers the room predicate, the `entry_date` range and the ordering in one ordered walk, so
      the read touches the rows it returns rather than the room's whole history. `id` is last so
      the tie-break comes from the index instead of a sort of the ties.
    */
    index('day_trade_alerts_room_entry_idx').on(table.roomShortCode, table.entryDate, table.id)
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

/**
 * Who is behind a MediaMTX ingest path, so a stream tab can be labelled with a person's real name.
 *
 * ## The problem this exists to solve
 *
 * A path is `room__{roomKey}__{sanitizedName}`, and the controller's `ingestPathFor` replaces every
 * character outside `[a-zA-Z0-9_-]` with `_` before the name ever reaches the media server. So a
 * presenter called "Dana Vero" publishes to `…__Dana_Vero`, and the ONLY name recoverable from a
 * `/v3/paths/list` response is `Dana_Vero`. The underscores are the sanitiser's, not the person's.
 *
 * That is not reversible and must not be guessed at: turning `_` back into a space would rename
 * anybody who genuinely uses an underscore, which is inventing data to make a tab look tidy.
 *
 * ## Why the room can answer it without asking anybody
 *
 * `api/stream-ingest` is the room's own route, and it already holds BOTH halves at the moment a key
 * is minted — the connected member, and the `ingestPath` the controller answered with. Recording
 * that pairing here is writing down something the room already knew and was throwing away.
 *
 * The alternatives were both worse. Matching sanitised display names against the roster is a
 * heuristic that breaks on two members who sanitise alike and on a presenter whose session expired
 * while OBS kept streaming. Asking the controller per reconcile is a network round trip every five
 * seconds per room for a value that changes only when somebody presses "New Link".
 *
 * ## `userId`, not the name itself
 *
 * Storing the display name would freeze it at mint time. The user id keeps the label current when
 * somebody renames themselves, and the join is against a table the room already reads constantly.
 */
export const streamIngestNames = sqliteTable(
  'stream_ingest_names',
  {
    /** Room-scoped, like every other realtime row — see `messages.roomShortCode`. */
    roomShortCode: text('room_short_code').notNull(),
    /** The full MediaMTX path, exactly as the controller built it and as the media server reports it. */
    ingestPath: text('ingest_path').notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  /*
    The room is IN the key, not beside it. The same person in two rooms has two paths and two rows,
    and a path is only ever meaningful within the room it belongs to — the reconciler looks up by
    both, so a lookup can never cross a room boundary even if two rooms somehow produced one path.
  */
  (table) => [primaryKey({ columns: [table.roomShortCode, table.ingestPath] })]
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
    /**
     * When this session last cleared the room's user-notes password, or null.
     *
     * ## Why the grant is a COLUMN and not a boolean the client carries
     *
     * The reference keeps it in the component: `manageAdminNotes()` compares the typed value
     * against `sessData.needPasswordForUserNotes` and sets `this.allowToManageNotes = !0` (bundle
     * byte 2,081,768). Both halves live in the browser, so a presenter who wanted past the prompt
     * never needed the password — the flag is one assignment away in a console.
     *
     * That is tolerable upstream, where the notes it guards are on the same origin as the password
     * it compares. It is not tolerable here, and not for a subtle reason: **this repository's rule
     * is that an authority decision is made on the server from data the server owns**, and a
     * `canManageNotes` prop travelling from the client to `addUserNote` would be the 2026-08-07
     * privilege escalation arriving through a feature instead of a token.
     *
     * So the room's client still holds `canManageNotes` — it decides what to DRAW — and the server
     * holds this, which decides what may be WRITTEN. The two are never the same value and the
     * server never reads the client's.
     *
     * ## Why a timestamp rather than a boolean
     *
     * A boolean grant would last as long as the session row, which is up to thirty days. Upstream's
     * lasts as long as the component instance — one page view. A timestamp lets the grant expire
     * (`NOTES_ACCESS_TTL_MS`, beside the check in `server/user-notes.ts`), which is STRICTER than
     * the reference rather than looser, and it costs nothing: the column is written once per
     * successful prompt and read once per note write.
     */
    notesAccessAt: integer('notes_access_at', { mode: 'timestamp' }),
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
export type SwingAlert = typeof swingAlerts.$inferSelect;
export type DayTradeAlert = typeof dayTradeAlerts.$inferSelect;
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
  /**
   * What a member is told when the room is closed — the reference's `closedTxt`.
   *
   * NULL means "never set", which is different from an empty string: the refusal falls back to its
   * own sentence rather than showing a member a blank page. The distinction is why this is nullable
   * rather than `.notNull().default('')`.
   *
   * ## Where the reference keeps it is UNKNOWABLE from the capture, and this says so
   *
   * The bundle binds `closedTxt` into a Summernote host (`#summernoteClosedMsg`, byte 2154583) and
   * posts `closedMsg` back, and that is the whole of the evidence: the payload key and the round
   * trip. Its SERVER is not in the capture, so whether it lives per session or per room, and in
   * which column, cannot be read out of anything held here.
   *
   * Per ROOM is this room's choice and the reason is that `room_state` is already keyed that way —
   * one row per short code — and a close message that reset every time a session ended would be a
   * message the presenter has to rewrite on every close. Recorded as a decision, not a match.
   */
  closedMessage: text('closed_message'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

/**
 * `savePresenterColors` — one presenter's two message colours, for one room.
 *
 * ## A table rather than a column on `room_state`
 *
 * `room_state` is one row per room and this is one row per PRESENTER per room, so the values cannot
 * share it without becoming a JSON blob in a text column — which is what the reference does
 * (`sessData.presenterSettings` is a map keyed by hashed email) and what nothing here should copy.
 * A blob cannot be indexed, cannot be updated by one presenter without rewriting every other
 * presenter's entry, and turns a lost update into two presenters silently overwriting each other.
 *
 * ## Bounded by the room's presenters, not by its history
 *
 * The composite primary key is the read path: the page load asks for one room's whole map, which is
 * the primary key's leading column, so it is an index range scan whose size is the number of
 * presenters in that room — a handful — rather than something that grows with usage. That is the
 * question `CLAUDE.md` asks of every new read path, answered before the code was written.
 *
 * ## The key is the SENDER HASH, and the server is what puts it there
 *
 * `sender_email_hash` matches `messages.sender_email_hash`, which is what a rendered message is
 * looked up by. The reference's client sends this key itself; ours never accepts one — see
 * `presenter-colors.remote.ts`, and `presenter-colors.ts` for why that divergence exists.
 *
 * ## Cleared means ABSENT, not empty
 *
 * The reference clears a presenter's colours by sending the empty pair, and its renderer then tests
 * `o.color && o.bkgColor` to skip it. Here the command DELETES the row instead, so the two states
 * are one state: a row exists and both colours are valid, or there is no row. Both columns are
 * therefore `notNull()`, and a half-set entry is unrepresentable rather than merely unhandled.
 */
export const presenterColors = sqliteTable(
  'presenter_colors',
  {
    roomShortCode: text('room_short_code').notNull(),
    /** The presenter's hashed email — the same key a message carries as `senderEmailHash`. */
    senderEmailHash: text('sender_email_hash').notNull(),
    /** The message BODY colour, `#rrggbb`. The reference's `val.color`. */
    textColor: text('text_color').notNull(),
    /** The message BACKGROUND colour, `#rrggbb`. The reference's `val.bkgColor`. */
    backgroundColor: text('background_color').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [primaryKey({ columns: [table.roomShortCode, table.senderEmailHash] })]
);
