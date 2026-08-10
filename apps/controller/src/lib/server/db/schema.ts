import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * The controller's data model, mirroring the two tiers the reference exposes:
 *
 *   account ─┬─ rooms ─┬─ room_settings   (269 keys, one JSON blob)
 *            │         └─ room_users      (membership + role)
 *            ├─ badges
 *            ├─ admin_users
 *            └─ api_keys
 *
 * Account-level things (badges, admin users, api keys) live on #/page/welcome;
 * room-level things live on #/page/manageSession/<id>. That split is not a guess —
 * it is where the reference puts each table.
 *
 * ## Why PostgreSQL, and what changed with it
 *
 * SQLite could not be deployed: the controller runs on Vercel, whose filesystem is
 * ephemeral and whose instances do not share one. Three column types stop being
 * approximations now that the database has real ones:
 *
 *   - identity columns replace `INTEGER PRIMARY KEY AUTOINCREMENT`. `GENERATED
 *     ALWAYS` rather than `serial`, which PostgreSQL treats as legacy, and rather
 *     than `BY DEFAULT`, so an explicit id cannot be written by accident.
 *   - `timestamptz` replaces an integer epoch. The SQLite build stored seconds
 *     through Drizzle and milliseconds through the one raw-SQL backfill, which is a
 *     thousandfold disagreement no type could catch; a real timestamp column makes
 *     that class of mistake impossible.
 *   - `boolean` replaces `INTEGER NOT NULL DEFAULT 0`.
 *
 * The `*_json` columns stay `text` deliberately. Moving them to `jsonb` changes
 * every read and write that currently calls `JSON.parse`, and doing that in the same
 * pass as the driver swap would make a failure impossible to attribute. It is worth
 * doing on its own afterwards.
 */

/** An account is a tenant: one business, one owner login. */
export const accounts = pgTable('accounts', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  ownerEmail: text('owner_email').notNull().unique(),
  /**
   * `'active'` or `'suspended'` — the operator console's first write.
   *
   * Suspension is only worth having if EVERY path honours it, so this is read at exactly one
   * chokepoint (`readUser`, which every cookie-authenticated request passes through) plus the two
   * that do not use a cookie: the login action, which must say WHY rather than pretending the
   * password is wrong, and `internal/room-config`, which is how the room asks whether a room is
   * live. Miss one and a suspended owner keeps working, which is worse than no suspend at all
   * because it reads as enforced.
   *
   * Not a boolean: "suspended" is one of several states an account will have once billing exists
   * (past-due, closed), and widening a boolean later means touching every one of those call sites
   * again.
   */
  status: text('status').notNull().default('active'),
  /** When it was suspended, and by which operator email — an audit trail needs both. */
  suspendedAt: timestamp('suspended_at', { withTimezone: true }),
  suspendedBy: text('suspended_by'),
  suspendedReason: text('suspended_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull()
});

/** The only account states this build recognises. Anything else is treated as suspended. */
export const ACCOUNT_ACTIVE = 'active';
export const ACCOUNT_SUSPENDED = 'suspended';

export const users = pgTable(
  'users',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    // Null means this row cannot authenticate — it is a member record, not a login.
    passwordHash: text('password_hash'),
    /**
     * When this address was proved to belong to whoever signed up. Null means unproved.
     *
     * A timestamp rather than a boolean, for the same reason `accounts.status` is not one: the
     * question that gets asked later is "how long has this been unverified" and "was it verified
     * before or after that incident", and a boolean answers neither.
     *
     * Nullable and NOT defaulted. A default would mark every future row verified, which is the
     * opposite of the point; rows that predate this column are backfilled once, in migration 1.
     */
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull()
  },
  (t) => [uniqueIndex('users_email_idx').on(t.email)]
);

/**
 * Single-use, hashed, expiring tokens for proving an address.
 *
 * Separate from `users` rather than a column on it, because there is more than one purpose
 * (verification and, next, password reset) and because a token row is short-lived rubbish that
 * gets deleted while a user row is not.
 */
export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    /**
     * The token's SHA-256, never the token. A database read — a backup, a leaked query, an
     * over-broad support view — must not yield anything that can be presented as a credential.
     * Same reasoning that keeps a password hash rather than a password.
     */
    tokenHash: text('token_hash').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    /**
     * The address being proved, captured when the token was issued rather than read back from
     * `users` at redemption time. If somebody changes their email in between, the old link proves
     * the OLD address and must not silently verify the new one.
     */
    email: text('email').notNull(),
    /** `verify-email` today, `reset-password` next. Domain separation: one cannot redeem as the other. */
    purpose: text('purpose').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /** Set on first redemption. The single-use guarantee is a WHERE clause on this being null. */
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull()
  },
  (t) => [
    index('email_verification_tokens_user_idx').on(t.userId),
    index('email_verification_tokens_expires_idx').on(t.expiresAt)
  ]
);

/** Login sessions. Distinct from `rooms`, which the reference confusingly calls sessions. */
export const loginSessions = pgTable(
  'login_sessions',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull()
  },
  (t) => [index('login_sessions_last_seen_idx').on(t.lastSeenAt)]
);

/**
 * Durable, non-secret UI state for the login page's evidence-backed CAPTCHA
 * threshold. Keeping this in the database prevents request/user state from leaking
 * through a module-scoped Map during SSR. It is not a substitute for an
 * infrastructure-level rate limiter.
 */
export const loginAttempts = pgTable('login_attempts', {
  identityHash: text('identity_hash').primaryKey(),
  failureCount: integer('failure_count').notNull().default(0),
  windowStartedAt: timestamp('window_started_at', { withTimezone: true }).notNull(),
  lastFailedAt: timestamp('last_failed_at', { withTimezone: true }).notNull()
});

/**
 * A room. The reference calls these "sessions" and shows them in a table with
 * columns Session ID / Name / State / Users / Actions.
 */
export const rooms = pgTable(
  'rooms',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id),
    /** The short numeric id the reference shows in the Session ID column, e.g. 3625. */
    shortCode: text('short_code').notNull(),
    name: text('name').notNull(),
    /** "open" / "closed" — the reference's State column. */
    state: text('state').notNull().default('closed'),
    maxUsers: integer('max_users').notNull().default(0),
    /**
     * The Text List tab. In the reference this is a raw <textarea id="textListTxt">
     * with no ng-model and its own saveTextList() handler — it is not a sess.*
     * setting, so it gets a column rather than being forced into the settings blob.
     */
    textList: text('text_list').notNull().default(''),
    /**
     * The opaque id the reference prints beside the short code —
     * "Manage Room id: 3627 ( 6a6529b318781e20ed81947d )" — and the one its
     * room, vanity and unique links are built from. Separate from the numeric
     * primary key so a link never leaks a row count, and separate from the
     * short code so the short code stays the human-facing name.
     */
    publicId: text('public_id'),
    /** /room/[slug] — the "Vanity Link" row. */
    vanitySlug: text('vanity_slug'),
    /** /room/[slug] — the "Unique Link" row, generated rather than chosen. */
    uniqueSlug: text('unique_slug'),
    /** Branding tab. Stored inline as a data URL, like badge images. */
    logoUrl: text('logo_url'),
    /** Set when this room was made by "Clone Room"; gates the Delete button. */
    clonedFromId: integer('cloned_from_id'),
    /**
     * When this room was archived. Null means it is not archived.
     *
     * A TIMESTAMP rather than a boolean, for exactly the reason `accounts.suspendedAt` and
     * `users.emailVerifiedAt` are timestamps: the question anybody asks afterwards is "how long has
     * this been archived" and "was it archived before or after that incident", and a boolean answers
     * neither. Nullable and NOT defaulted, so every room that predates the column reads as live —
     * the safe direction, since defaulting the other way would empty the Sessions table.
     *
     * ## Where the reference triggers archiving, which is NOT where we do
     *
     * Stated because it is a real divergence, not a gap. The reference's account page has no archive
     * control at all: its Sessions row Actions cell holds Launch, Manage and Marketplace and nothing
     * else (evidence-dumps/login-page/logged-in-page:471-479). Archiving is `sess.isArchivedRoom`,
     * an `editable-checkbox` labelled "Is Archived Room?" on the MANAGE page's Settings tab
     * (evidence-dumps/login-page/manage:1405-1408), and `$lib/room-settings-schema.ts:183` already
     * carries that key — with `wired: false`.
     *
     * The account page still needs a durable, queryable answer: its
     * `ng-hide="s.isArchivedRoom && !showArchivedRooms"` filter and its `label-warning` chip read
     * the flag on every row, and sourcing that from a per-room JSON blob would mean joining and
     * parsing `room_settings` for every room on every render. So the column is the store, and the
     * manage page's checkbox should be pointed at it when whoever owns that route wires
     * `isArchivedRoom`. Until then that setting key stays unwired, exactly as it was before.
     */
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull()
  },
  (t) => [uniqueIndex('rooms_short_code_idx').on(t.shortCode)]
);

/**
 * All 269 settings for one room, as a single JSON document.
 *
 * One column rather than 266: the key set is defined by
 * `$lib/room-settings-schema.ts`, which is generated from the reference capture,
 * so the shape can change with a regenerate instead of a migration each time.
 * Reads go through resolveRoomConfig(), never straight into this blob.
 */
/**
 * One row per ARRIVAL in a room — the table the participant stats CSV is built from.
 *
 * The reference calls these `statXrefs`, and an xref row is exactly what this is: a person crossing
 * into a room at a moment in time. A member who enters four times in a day is four rows, which is
 * what makes Duration a meaningful number rather than an average of nothing.
 *
 * `leftAt` is null while a visit is in progress. The reference renders `N/A` for both Out and
 * Duration in that case, so an open row is faithful rather than broken.
 *
 * Name and email are COPIED rather than only referenced. A guest has no membership row at all, and
 * a member who is later removed or renamed must not silently rewrite visits that already happened —
 * a stats export is evidence of who was present, and joining live rows would make last month's
 * report change when somebody edits their profile.
 */
export const roomSessions = pgTable(
  'room_sessions',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    roomId: integer('room_id')
      .notNull()
      .references(() => rooms.id),
    /** Null for a guest, who satisfied the room's own login without an account here. */
    roomUserId: integer('room_user_id').references(() => roomUsers.id),
    displayName: text('display_name').notNull(),
    email: text('email').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    isMobile: boolean('is_mobile').notNull().default(false),
    browser: text('browser'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull(),
    /** Null while the visit is open. */
    leftAt: timestamp('left_at', { withTimezone: true })
  },
  (t) => [index('room_sessions_room_joined_idx').on(t.roomId, t.joinedAt)]
);

export const roomSettings = pgTable('room_settings', {
  roomId: integer('room_id')
    .primaryKey()
    .references(() => rooms.id),
  settingsJson: text('settings_json').notNull().default('{}'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull()
});

/**
 * Membership of a room, with the role the row menus manipulate.
 *
 * `role` holds the reference's numeric model verbatim, because every menu action
 * is `updateUser(<opcode>, ...)` and translating at the boundary is what keeps the
 * controller's behaviour identical:
 *   0 owner · 1 presenter · 2 participant · 3 chat muted · 4 banned
 */
export const roomUsers = pgTable(
  'room_users',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    roomId: integer('room_id')
      .notNull()
      .references(() => rooms.id),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    role: integer('role').notNull().default(2),
    banned: boolean('banned').notNull().default(false),
    muted: boolean('muted').notNull().default(false),
    paused: boolean('paused').notNull().default(false),
    nonPresenter: boolean('non_presenter').notNull().default(false),
    note: text('note'),
    /**
     * Badges assigned to this member, as a JSON array of badge ids. The
     * reference's user list can add and remove them in bulk
     * (`updateManyUsersBadgePrompt`), and "Remove All User Badges" clears every
     * one in the room.
     */
    badgesJson: text('badges_json').notNull().default('[]'),
    /**
     * Per-user flags the reference's row renders, each read straight off
     * `user.*` in its ng-show expressions — they are row state, not room
     * settings, which is what opcodes 7/8, 10/11 and 13/14 toggle.
     */
    isFreeTrial: boolean('is_free_trial').notNull().default(false),
    hideUserCount: boolean('hide_user_count').notNull().default(false),
    hidePersInfo: boolean('hide_pers_info').notNull().default(false),
    denyArchivesAccess: boolean('deny_archives_access').notNull().default(false),
    restrictPmUser: boolean('restrict_pm_user').notNull().default(false),
    inactive: boolean('inactive').notNull().default(false),
    /** whether this member has a password set — the row shows "PW set" */
    hasPassword: boolean('has_password').notNull().default(false),
    /**
     * The mobile app. The reference's demo tenant disables all of this; a paying
     * owner gets it, so it is stored rather than stubbed.
     *
     * The pair code is what "Get App PIN" issues — short-lived by design, with
     * `ptrMobileAppExpirePairCodeDays` as the room's own expiry setting.
     */
    mobilePairCode: text('mobile_pair_code'),
    mobilePairCodeExpiresAt: timestamp('mobile_pair_code_expires_at', { withTimezone: true }),
    /**
     * Failed pairing attempts against the current code.
     *
     * Six digits is a million combinations and the pairing endpoint is public by necessity — a
     * phone that has never paired holds no credential. Five failures invalidates the code, so an
     * attacker gets five guesses and then the thing they were attacking no longer exists. Durable
     * rather than in-process because this controller is serverless: an instance-local counter would
     * look like protection and provide almost none. Reset on success.
     */
    mobilePairAttempts: integer('mobile_pair_attempts').notNull().default(0),
    /** push registrations, as a JSON array of { token, platform, addedAt } */
    pushTokensJson: text('push_tokens_json').notNull().default('[]'),
    /** 'active' | 'paused' | 'unsubscribed' — PAUSE / RESUME / Remove Mobile Notifs */
    notificationsState: text('notifications_state').notNull().default('active'),
    /**
     * 'approved' | 'pending' — the reference's `approveUser(name, id, index, status)`.
     *
     * Its row shows an APPROVE button under `ng-show="user.inviteStatus=='pending'"`,
     * and the row menu's last item, "Pause / Pending", sends `'pending'`. Only those
     * two values appear anywhere in the capture, so only those two are modelled.
     *
     * Defaults to 'approved'. All three rendered rows have the APPROVE button hidden,
     * and nothing in evidence says an invite lands pending — defaulting to pending
     * would lock every existing member out on the next deploy, which is a behaviour
     * change the reference does not license.
     */
    inviteStatus: text('invite_status').notNull().default('approved'),
    /**
     * The reference's row renders a phone icon and the number under
     * `ng-show="user.phone"`. Ours is collected: the room-login form asks for it when
     * `hasRequiredPhoneInLogin` is on, and `(public)/session/[code]` validates that it
     * is present — then discards it, because a guest does not get a membership row
     * until the guest-join handoff exists (§1.1/§1.2). Stored here so the field has
     * one home when that path lands, and recorded in `docs/OUTSTANDING.md` as having
     * no writer today.
     */
    phone: text('phone'),
    /**
     * Written by the room's Discord integration, which is gated on the `enableDiscord`
     * room setting and is not built here. The reference's row renders
     * "Discord Username: <id>" in red under `ng-show="user.discordUserId"`, so the
     * column exists and the row reads it; nothing in this application writes it yet.
     * That gap is recorded in `docs/OUTSTANDING.md` rather than left looking wired.
     */
    discordUserId: text('discord_user_id'),
    /** Per-user permission flags the #permissionsModal edits. */
    permissionsJson: text('permissions_json').notNull().default('{}'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull()
  },
  (t) => [uniqueIndex('room_users_unique_idx').on(t.roomId, t.userId)]
);

/**
 * Every reach across the tenant boundary, recorded durably.
 *
 * `/admin` is the one place a signed-in person sees data belonging to accounts that are not theirs.
 * That privilege needs a trail that survives a deployment, which a `console.warn` does not — logs
 * roll, and the refusals it wrote were the only thing captured. Both outcomes belong here: a
 * refusal is the more interesting event, because somebody found the URL.
 *
 * Deliberately append-only in practice. Nothing in this codebase updates or deletes a row here, and
 * an audit trail the application can rewrite is not one.
 */
export const adminAudit = pgTable(
  'admin_audit',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    /**
     * Nullable: an anonymous visitor probing `/admin` has no user, and that attempt is precisely
     * the one worth keeping.
     *
     * No foreign key to `users` on purpose. The trail must outlive the account it describes —
     * a cascade would erase the evidence exactly when somebody deletes themselves.
     */
    userId: integer('user_id'),
    /** `granted` or `refused`. */
    outcome: text('outcome').notNull(),
    /** The path reached for, so a future subroute is distinguishable from the console itself. */
    path: text('path').notNull(),
    /** Best-effort client address; a proxy can obscure it, so it is evidence and not proof. */
    remoteIp: text('remote_ip'),
    /**
     * The write half of the trail. Null for a read.
     *
     * A trail that records "something changed" without recording WHAT is not an audit trail — it
     * cannot answer the only question anybody asks it afterwards, which is what the value used to
     * be. `action` names the operation, the two value columns bracket it, and `reason` is the
     * operator's own words.
     */
    action: text('action'),
    targetAccountId: integer('target_account_id'),
    beforeValue: text('before_value'),
    afterValue: text('after_value'),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull()
  },
  (t) => [index('admin_audit_created_idx').on(t.createdAt)]
);

/**
 * Operator impersonation sessions — "sign in as this customer to see what they see".
 *
 * The most dangerous capability in the product, so every constraint is structural rather than
 * procedural:
 *
 *  - **`expiresAt` is set at creation and never extended.** An impersonation that can be renewed is
 *    an impersonation without a time limit. Fifteen minutes is enough to reproduce a support issue
 *    and short enough that a forgotten tab closes itself.
 *  - **One row per session, written before it starts.** The row IS the audit record; there is no
 *    separate "log the impersonation" step that could be skipped.
 *  - **`endedAt` is set on explicit exit**, so the trail distinguishes "used for two minutes" from
 *    "left open until it lapsed" — which is the difference a reviewer actually cares about.
 *
 * Deliberately NOT a column on `login_sessions`. Impersonation must not be able to mutate the
 * operator's own session, and keeping it in its own table means revoking every impersonation is one
 * `UPDATE` that cannot touch anybody's ability to log in.
 */
export const impersonations = pgTable(
  'impersonations',
  {
    id: text('id').primaryKey(),
    /** The operator. Never null — an impersonation with no author is not auditable. */
    operatorUserId: integer('operator_user_id').notNull(),
    /** Who they are acting as. */
    targetUserId: integer('target_user_id').notNull(),
    targetAccountId: integer('target_account_id').notNull(),
    reason: text('reason'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true })
  },
  (t) => [index('impersonations_expires_idx').on(t.expiresAt)]
);

/** How long an impersonation lasts. Not configurable: a limit somebody can raise is not a limit. */
export const IMPERSONATION_TTL_MS = 15 * 60 * 1000;

/** Account-level badges. The reference renders Badge / Actions columns. */
export const badges = pgTable('badges', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id),
  label: text('label').notNull(),
  textColor: text('text_color').notNull().default('#ffffff'),
  backgroundColor: text('background_color').notNull().default('#777777'),
  emoji: text('emoji'),
  /** An image badge, stored inline as a data URL — see the uploadImageBadge action. */
  imageUrl: text('image_url'),
  /**
   * The third of the reference's three badge row actions, "Dark Theme" —
   * `addBadgeDarkTheme(b._id, b.text, b.imgURL, b.darkTheme)` (#759/#760/#761). It hands the
   * badge's CURRENT value back to the handler, which is the shape of a toggle rather than a setter.
   *
   * NOT NULL with a `false` default, so every badge that predates the column is valid and reads as
   * "not marked", which is what a badge nobody has pressed the control on is.
   *
   * HONEST GAP, recorded rather than papered over. The reference's stylesheet carries
   * `.dark-theme-badge-id { font-size: 10px }` (evidence-dumps/NEXT-STEP/gaps/sheet-9.css:2564),
   * sitting in the same group as `.room-badge-id` and `.room-badge-name` — a class whose name is
   * about rendering an ID. That is consistent with `darkTheme` holding the id of a SEPARATE
   * dark-theme variant badge rather than a flag. It cannot be settled from what is here: the
   * account capture's badges `<tbody>` is empty (evidence-dumps/login-page/logged-in-page:604), so
   * the row markup #754–#761 is not in this repository at all. A boolean is the least the handler
   * signature supports and the most the evidence proves; if that markup is captured later and shows
   * an id, that is a new migration, not a rewrite.
   *
   * Equally honest: nothing here invents what a dark-theme badge LOOKS like. No CSS in our evidence
   * describes a dark-theme chip, so the flag is stored, round-tripped and surfaced as the control's
   * pressed state — and the chip renders exactly as it did before.
   *
   * It is NOT in Export Badges any more, and that changed on 2026-08-09. That export used to be a
   * JSON dump of these rows, so every column rode along. The reference's `exportBadges()` was then
   * captured and it writes CSV through a `convertToCSV` with ELEVEN fixed keys, none of them this
   * one. Matching that key list matters more than carrying an extra flag into a file whose purpose
   * is to interchange with the original's.
   */
  darkTheme: boolean('dark_theme').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull()
});

/** Account-level extra admins. Reference empty state: "No admin users added yet". */
export const adminUsers = pgTable('admin_users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id),
  name: text('name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull()
});

/**
 * Account-level API keys. The reference's columns are the raw Mongo field names
 * `_id` and `secret`; empty state "No API keys yet".
 *
 * The hash remains the credential-verification value. The encrypted copy exists
 * only because the first-party reference renders the complete secret in the
 * authenticated owner's table on every load; see ADR 0002.
 */
export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey(),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id),
  secretHash: text('secret_hash').notNull(),
  lastFour: text('last_four').notNull(),
  /** Versioned AES-256-GCM envelope. Null only for legacy hash-only rows. */
  secretCiphertext: text('secret_ciphertext'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  /**
   * The "restrictions" link beside each key. A JSON document of
   * `{ ips: string[], scopes: string[] }` — an empty object means unrestricted,
   * which is what an existing key keeps.
   */
  restrictionsJson: text('restrictions_json').notNull().default('{}')
});
