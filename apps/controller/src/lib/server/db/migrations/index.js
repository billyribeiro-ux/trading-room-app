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
import { sql as recordedMaxCapacity } from './0011-recorded-max-capacity.js';
import { sql as streamIngestKeys } from './0012-stream-ingest-keys.js';
import { sql as badgeDarkThemeBadgeId } from './0013-badge-dark-theme-badge-id.js';
import { sql as alertDeliveryLedger } from './0014-alert-delivery-ledger.js';
import { sql as discordOauth } from './0015-discord-oauth.js';
import { sql as alertDispatchLinks } from './0016-alert-dispatch-links.js';
import { sql as alertCrossPostSuppression } from './0017-alert-cross-post-suppression.js';
import { sql as authorityIdentityMappings } from './0018-authority-identity-mappings.js';
import { sql as authorityRoomMappings } from './0019-authority-room-mappings.js';
import { sql as authorityRoomSettingsProjection } from './0020-authority-room-settings-projection.js';
import { sql as authorityMembershipProjection } from './0021-authority-membership-projection.js';
import { sql as authorityBadgeProjection } from './0022-authority-badge-projection.js';
import { sql as authorityAdministratorProjection } from './0023-authority-administrator-projection.js';
import { sql as authorityCustomerApiKeyProjection } from './0024-authority-customer-api-key-projection.js';

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
  },
  {
    version: 11,
    name: 'recorded_max_capacity',
    sql: recordedMaxCapacity
  },
  {
    version: 12,
    name: 'stream_ingest_keys',
    sql: streamIngestKeys
  },
  {
    version: 13,
    name: 'badge_dark_theme_badge_id',
    sql: badgeDarkThemeBadgeId
  },
  {
    version: 14,
    name: 'alert_delivery_ledger',
    sql: alertDeliveryLedger
  },
  {
    version: 15,
    name: 'discord_oauth',
    sql: discordOauth
  },
  {
    version: 16,
    name: 'alert_dispatch_links',
    sql: alertDispatchLinks
  },
  {
    version: 17,
    name: 'alert_cross_post_suppression',
    sql: alertCrossPostSuppression
  },
  {
    version: 18,
    name: 'authority_identity_mappings',
    sql: authorityIdentityMappings
  },
  {
    version: 19,
    name: 'authority_room_mappings',
    sql: authorityRoomMappings
  },
  {
    version: 20,
    name: 'authority_room_settings_projection',
    sql: authorityRoomSettingsProjection
  },
  {
    version: 21,
    name: 'authority_membership_projection',
    sql: authorityMembershipProjection
  },
  {
    version: 22,
    name: 'authority_badge_projection',
    sql: authorityBadgeProjection
  },
  {
    version: 23,
    name: 'authority_administrator_projection',
    sql: authorityAdministratorProjection
  },
  {
    version: 24,
    name: 'authority_customer_api_key_projection',
    sql: authorityCustomerApiKeyProjection
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
