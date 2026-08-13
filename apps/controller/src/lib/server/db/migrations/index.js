import { DDL } from '../ddl.js';
import { sql as emailVerification } from './0001-email-verification.js';
import { sql as badgeDarkThemeAndRoomArchiving } from './0002-badge-dark-theme-and-room-archiving.js';
import { sql as roomShortCodeSequence } from './0003-room-short-code-sequence.js';
import { sql as backfillRoomPublicId } from './0004-backfill-room-public-id.js';
import { sql as openExistingRooms } from './0005-open-existing-rooms.js';
import { sql as mobilePairAttempts } from './0006-mobile-pair-attempts.js';
import { sql as roomSessions } from './0007-room-sessions.js';
import { sql as backfillOwnerMemberships } from './0008-backfill-owner-memberships.js';
import { sql as roomSessionsFkActions } from './0009-room-sessions-fk-actions.js';
import { sql as userRowReferenceFields } from './0010-user-row-reference-fields.js';

/**
 * Versioned, forward-only, apply-exactly-once migrations.
 *
 * ## What this replaces, and why it had to change
 *
 * The schema was stood up by one idempotent DDL string re-executed on every cold start. That is
 * correct only while every change is additive, and it cannot express the three things a real
 * product needs within its first year:
 *
 *   - a column RENAME (the idempotent form would add the new name and leave the old one);
 *   - a TYPE change (`ALTER TYPE` is not idempotent, and re-running it on a converted column
 *     fails or silently does nothing depending on the direction);
 *   - a BACKFILL that must run exactly once (re-running an `UPDATE … SET n = n + 1` is a bug that
 *     compounds every time an instance cold-starts).
 *
 * `docs/OUTSTANDING.md` §4.1 dated this "before real customer data exists". That clock has already
 * run out — there is a live registered account — so this lands now.
 *
 * ## Why plain `.js` modules and not `.sql` files
 *
 * These are imported by BOTH the SvelteKit app and plain node scripts (`scripts/seed.mjs`). A
 * `?raw` import is Vite-only and would fork the two into different code paths; a runtime
 * `readFile` cannot be bundled for a serverless deployment at all. A JS module exporting a string
 * is the one form that works unchanged in every caller, and the explicit array below means adding
 * a migration is one file plus one line, reviewable in a diff.
 *
 * ## Why version 0 is the existing DDL, verbatim
 *
 * The safest possible baseline for a database that ALREADY EXISTS. Every statement in it is
 * `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, so applying it to production is a
 * provable no-op, and applying it to an empty database produces exactly the schema production has.
 * The alternative — generating a fresh `CREATE TABLE` baseline and hand-marking it as already
 * applied — requires trusting that the generated file matches production, which nothing checks.
 *
 * From version 1 onward a migration is NOT required to be idempotent. That is the entire point:
 * `applied_migrations` records what has run, so each one runs once and may be destructive,
 * ordered, and irreversible.
 *
 * ## The rule this enforces mechanically
 *
 * **Never edit a shipped migration — add a new one.** Every entry is checksummed on first apply; a
 * later edit makes the checksum disagree and the boot fails loudly rather than leaving two
 * databases with the same version number and different shapes.
 */
export const MIGRATIONS = [
  {
    version: 0,
    name: 'baseline',
    /**
     * The idempotent bootstrap this system started with. Kept as the baseline rather than
     * rewritten, so an existing production database is provably unaffected by adopting migrations.
     */
    sql: DDL
  },
  {
    version: 1,
    name: 'email_verification',
    sql: emailVerification
  },
  {
    version: 2,
    name: 'badge_dark_theme_and_room_archiving',
    sql: badgeDarkThemeAndRoomArchiving
  },
  {
    version: 3,
    name: 'room_short_code_sequence',
    sql: roomShortCodeSequence
  },
  {
    version: 4,
    name: 'backfill_room_public_id',
    sql: backfillRoomPublicId
  },
  {
    version: 5,
    name: 'open_existing_rooms',
    sql: openExistingRooms
  },
  {
    version: 6,
    name: 'mobile_pair_attempts',
    sql: mobilePairAttempts
  },
  {
    version: 7,
    name: 'room_sessions',
    sql: roomSessions
  },
  {
    version: 8,
    name: 'backfill_owner_memberships',
    sql: backfillOwnerMemberships
  },
  {
    version: 9,
    name: 'room_sessions_fk_actions',
    sql: roomSessionsFkActions
  },
  {
    version: 10,
    name: 'user_row_reference_fields',
    sql: userRowReferenceFields
  }
];

/** The table recording what has run. Created by the migrator itself, before anything else. */
export const MIGRATIONS_TABLE = `
    CREATE TABLE IF NOT EXISTS applied_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL
    );
`;
