#!/usr/bin/env node

/**
 * Reversible Gate 3 conversion of controller room_users into canonical Rust room_members.
 *
 * Profile and room conversion are hard prerequisites. The canonical transaction commits first;
 * its owner-only ledger then makes the unavoidable cross-database projection window resumable.
 * Rollback is permitted only while every imported membership is still at revision zero and has no
 * dependent activity. The room converter's pre-existing owner row is adopted and restored rather
 * than deleted.
 */

import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import postgres from 'postgres';

/** @typedef {import('postgres').Sql} Sql */
/** @typedef {import('postgres').TransactionSql} TransactionSql */
/** @typedef {Sql | TransactionSql} SqlHandle */
/** @typedef {'owner' | 'presenter' | 'moderator' | 'member'} MembershipRole */
/**
 * @typedef {object} MembershipPermissions
 * @property {boolean} hasMic
 * @property {boolean} hasScreen
 * @property {boolean} hasCam
 * @property {boolean} hasAdminChat
 * @property {boolean} canEditNotes
 */
/**
 * @typedef {object} MembershipRow
 * @property {string} legacyId
 * @property {string} legacyRoomId
 * @property {string} legacyUserId
 * @property {string | null} targetId
 * @property {string} roomId
 * @property {string} enterpriseId
 * @property {string} userId
 * @property {string} email
 * @property {string} displayName
 * @property {MembershipRole} role
 * @property {boolean} canPublishMic
 * @property {boolean} canPublishScreen
 * @property {boolean} canPublishCam
 * @property {boolean} canUseAdminChat
 * @property {boolean} canEditNotes
 * @property {boolean} canAccessFiles
 * @property {boolean} canAccessArchives
 * @property {boolean} isMuted
 * @property {boolean} isBanned
 * @property {boolean} isPmRestricted
 * @property {boolean} isTrial
 * @property {boolean} hidePersonalInfo
 * @property {boolean} hideUserCount
 * @property {boolean} isPaused
 * @property {string | null} adminNote
 * @property {'approved' | 'pending'} approvalStatus
 * @property {boolean} hasMobileApp
 * @property {boolean} hasPassword
 * @property {string | null} lastSeenAt
 * @property {string} createdAt
 * @property {number | null} authorityRevision
 * @property {string | null} authorityContentHash
 */
/**
 * @typedef {object} MappingRow
 * @property {string} legacyId
 * @property {string} targetId
 * @property {string} sourceDigest
 */
/**
 * @typedef {object} PlanItem
 * @property {MembershipRow} row
 * @property {string} targetId
 * @property {string} sourceDigest
 * @property {boolean} mapped
 */
/**
 * @typedef {object} TargetMember
 * @property {string} id
 * @property {string} roomId
 * @property {string} userId
 * @property {string} enterpriseId
 * @property {string} email
 * @property {string} displayName
 * @property {string} role
 * @property {number} revision
 * @property {unknown} badges
 * @property {boolean} canPublishMic
 * @property {boolean} canPublishScreen
 * @property {boolean} canPublishCam
 * @property {boolean} canUseAdminChat
 * @property {boolean} canEditNotes
 * @property {boolean} canAccessFiles
 * @property {boolean} canAccessArchives
 * @property {boolean} isMuted
 * @property {boolean} isBanned
 * @property {boolean} isPmRestricted
 * @property {boolean} isTrial
 * @property {boolean} hidePersonalInfo
 * @property {boolean} hideUserCount
 * @property {boolean} isPaused
 * @property {string | null} adminNote
 * @property {string} approvalStatus
 * @property {boolean} hasMobileApp
 * @property {boolean} hasPassword
 * @property {string | null} lastSeenAt
 * @property {string | null} invitedAt
 * @property {string | null} joinedAt
 * @property {string} createdAt
 */
/** @typedef {{ counts: { memberships: number }; digest: string }} MembershipSnapshot */
/**
 * @typedef {object} MembershipCutoverInput
 * @property {string | undefined} command
 * @property {string | undefined} sourceUrl
 * @property {string | undefined} targetUrl
 * @property {string | undefined} sourceLabel
 */

const SOURCE_SYSTEM = 'controller-postgres';
const SCOPE = 'membership';
const ENTITY_TYPE = 'membership';
const LOCK_KEY = 0x4355_5436;
const COMMANDS = new Set(['plan', 'apply', 'verify', 'rollback']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const PERMISSION_KEYS = ['hasMic', 'hasScreen', 'hasCam', 'hasAdminChat', 'canEditNotes'];

export class MembershipCutoverRefusal extends Error {
  /** @param {string} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.name = 'MembershipCutoverRefusal';
    this.code = code;
  }
}

/** @param {string} code @param {string} message @returns {never} */
function refuse(code, message) {
  throw new MembershipCutoverRefusal(code, message);
}

/** @param {unknown} value */
function digest(value) {
  return createHash('sha256')
    .update(JSON.stringify(value) ?? 'undefined')
    .digest('hex');
}

/** @param {string} value */
function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

/** @overload @param {unknown} value @param {string} code @param {true} nullable @returns {string | null} */
/** @overload @param {unknown} value @param {string} code @param {false | undefined} [nullable] @returns {string} */
/** @param {unknown} value @param {string} code @param {boolean} [nullable] */
function uuid(value, code, nullable = false) {
  if (nullable && value == null) return null;
  const normalized = String(value ?? '').toLowerCase();
  if (!UUID.test(normalized)) refuse(code, 'A required authority mapping is missing or invalid.');
  return normalized;
}

/** @param {unknown} value @param {string} code */
function legacyId(value, code) {
  const normalized = String(value ?? '');
  if (!/^[1-9][0-9]*$/.test(normalized)) refuse(code, 'A legacy identity is invalid.');
  return normalized;
}

/** @param {unknown} value @param {string} code @returns {string} */
function iso(value, code) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (typeof value !== 'string' && typeof value !== 'number') refuse(code, 'A timestamp is invalid.');
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) refuse(code, 'A timestamp is invalid.');
  return parsed.toISOString();
}

/** @param {unknown} value @param {string} code @returns {string | null} */
function optionalIso(value, code) {
  return value == null ? null : iso(value, code);
}

/** @overload @param {unknown} value @param {number} maxBytes @param {string} code @param {true} nullable @returns {string | null} */
/** @overload @param {unknown} value @param {number} maxBytes @param {string} code @param {false | undefined} [nullable] @returns {string} */
/** @param {unknown} value @param {number} maxBytes @param {string} code @param {boolean} [nullable] */
function boundedText(value, maxBytes, code, nullable = false) {
  if (nullable && value == null) return null;
  const normalized = String(value ?? '').trim();
  if (!normalized || Buffer.byteLength(normalized) > maxBytes) {
    refuse(code, 'A membership text field is empty or exceeds its byte limit.');
  }
  return normalized;
}

/** @param {string | undefined} label */
function sourceFingerprint(label) {
  const normalized = String(label ?? '').trim();
  if (normalized.length < 8 || normalized.length > 128) {
    refuse('invalid-source-label', 'CUTOVER_SOURCE_LABEL must contain 8 to 128 characters.');
  }
  return sha256(normalized);
}

/** @param {unknown} value @returns {MembershipPermissions} */
function permissions(value) {
  let raw = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      refuse('invalid-permissions-json', 'A membership permission document is not valid JSON.');
    }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    refuse('invalid-permissions-document', 'A membership permission document is not an object.');
  }
  const document = /** @type {Record<string, unknown>} */ (raw);
  return /** @type {MembershipPermissions} */ (
    Object.fromEntries(PERMISSION_KEYS.map((key) => [key, document[key] === true]))
  );
}

/**
 * @param {unknown} rawRole
 * @param {boolean} nonPresenter
 * @param {boolean} muted
 * @param {boolean} banned
 * @returns {MembershipRole}
 */
function role(rawRole, nonPresenter, muted, banned) {
  const legacyRole = Number(rawRole);
  if (!Number.isSafeInteger(legacyRole) || legacyRole < 0 || legacyRole > 4) {
    refuse('invalid-membership-role', 'A legacy membership role is unsupported.');
  }
  if ((legacyRole === 3) !== muted || (legacyRole === 4) !== banned) {
    refuse('legacy-role-state-disagreement', 'A legacy role disagrees with its durable ban or mute flag.');
  }
  if (nonPresenter && ![1, 3, 4].includes(legacyRole)) {
    refuse('invalid-moderator-discriminator', 'A moderator discriminator appears on an incompatible role.');
  }
  if (legacyRole === 0) return 'owner';
  if (nonPresenter) return 'moderator';
  return legacyRole === 1 ? 'presenter' : 'member';
}

/**
 * Normalize the exact membership-owned source surface; integration and badge fields stay local.
 * @param {Record<string, unknown>[]} rawRows
 * @returns {MembershipRow[]}
 */
export function normalizeMembershipRows(rawRows) {
  const rows = rawRows.map((raw) => {
    const muted = raw.muted === true;
    const banned = raw.banned === true;
    const memberRole = role(raw.role, raw.nonPresenter === true, muted, banned);
    const approvalStatus = String(raw.approvalStatus ?? '');
    if (!['approved', 'pending'].includes(approvalStatus)) {
      refuse('invalid-approval-status', 'A legacy membership approval state is unsupported.');
    }
    const paused = raw.paused === true;
    if (memberRole === 'owner' && (muted || banned || paused || approvalStatus !== 'approved')) {
      refuse('invalid-owner-state', 'A canonical owner must be approved, live, unmuted, and unbanned.');
    }
    const permission = permissions(raw.permissionsJson);
    /** @type {MembershipRow} */
    const row = {
      legacyId: legacyId(raw.legacyId, 'invalid-membership-id'),
      legacyRoomId: legacyId(raw.legacyRoomId, 'invalid-room-id'),
      legacyUserId: legacyId(raw.legacyUserId, 'invalid-user-id'),
      targetId: uuid(raw.targetId, 'invalid-membership-mapping', true),
      roomId: uuid(raw.roomId, 'missing-room-authority-mapping'),
      enterpriseId: uuid(raw.enterpriseId, 'missing-enterprise-authority-mapping'),
      userId: uuid(raw.userId, 'missing-user-authority-mapping'),
      email: boundedText(raw.email, 254, 'invalid-member-email').toLowerCase(),
      displayName: boundedText(raw.displayName, 160, 'invalid-member-name'),
      role: memberRole,
      canPublishMic: permission.hasMic,
      canPublishScreen: permission.hasScreen,
      canPublishCam: permission.hasCam,
      canUseAdminChat: permission.hasAdminChat,
      canEditNotes: permission.canEditNotes,
      canAccessFiles: raw.canAccessFiles === true,
      canAccessArchives: raw.denyArchivesAccess !== true,
      isMuted: muted,
      isBanned: banned,
      isPmRestricted: raw.isPmRestricted === true,
      isTrial: raw.isTrial === true,
      hidePersonalInfo: raw.hidePersonalInfo === true,
      hideUserCount: raw.hideUserCount === true,
      isPaused: paused,
      adminNote: boundedText(raw.adminNote, 2_000, 'invalid-admin-note', true),
      approvalStatus: /** @type {'approved' | 'pending'} */ (approvalStatus),
      hasMobileApp: raw.hasMobileApp === true,
      hasPassword: raw.hasPassword === true,
      lastSeenAt: optionalIso(raw.lastSeenAt, 'invalid-last-seen-time'),
      createdAt: iso(raw.createdAt, 'invalid-created-time'),
      authorityRevision: raw.authorityRevision == null ? null : Number(raw.authorityRevision),
      authorityContentHash: raw.authorityContentHash == null ? null : String(raw.authorityContentHash)
    };
    if (row.authorityRevision !== null && (!Number.isSafeInteger(row.authorityRevision) || row.authorityRevision < 0)) {
      refuse('invalid-authority-revision', 'A controller membership revision is invalid.');
    }
    if (row.authorityContentHash !== null && !SHA256.test(row.authorityContentHash)) {
      refuse('invalid-authority-content-hash', 'A controller membership proof hash is invalid.');
    }
    if (row.targetId === null && (row.authorityRevision !== null || row.authorityContentHash !== null)) {
      refuse('partial-source-proof', 'A controller membership has an incomplete authority proof.');
    }
    return row;
  });

  const legacyIds = new Set();
  const targetIds = new Set();
  const relations = new Set();
  const ownerCount = new Map();
  for (const row of rows) {
    if (legacyIds.has(row.legacyId)) refuse('duplicate-membership-id', 'The source contains duplicate memberships.');
    legacyIds.add(row.legacyId);
    if (row.targetId && targetIds.has(row.targetId)) {
      refuse('duplicate-target-membership', 'Two source memberships claim one canonical membership.');
    }
    if (row.targetId) targetIds.add(row.targetId);
    const relation = `${row.legacyRoomId}:${row.legacyUserId}`;
    if (relations.has(relation)) refuse('duplicate-room-user', 'The source repeats a room and user membership.');
    relations.add(relation);
    if (row.role === 'owner') ownerCount.set(row.legacyRoomId, (ownerCount.get(row.legacyRoomId) ?? 0) + 1);
  }
  const rooms = new Set(rows.map((row) => row.legacyRoomId));
  if ([...rooms].some((roomId) => ownerCount.get(roomId) !== 1)) {
    refuse('room-owner-cardinality', 'Every source room must contain exactly one owner membership.');
  }
  rows.sort((left, right) => (BigInt(left.legacyId) < BigInt(right.legacyId) ? -1 : 1));
  return rows;
}

/** @param {MembershipRow} row */
function sourceRecord(row) {
  const { targetId: _targetId, authorityRevision: _revision, authorityContentHash: _hash, ...record } = row;
  return record;
}

/** @param {MembershipRow} row */
function sourceRecordDigest(row) {
  return digest(sourceRecord(row));
}

/** @param {MembershipRow[]} rows @returns {MembershipSnapshot} */
function snapshot(rows) {
  return { counts: { memberships: rows.length }, digest: digest(rows.map(sourceRecordDigest)) };
}

/** @param {SqlHandle} sql @returns {Promise<MembershipRow[]>} */
async function readSource(sql) {
  const raw = /** @type {Record<string, unknown>[]} */ (
    await sql`
    SELECT member.id::text AS "legacyId", member.room_id::text AS "legacyRoomId",
           member.user_id::text AS "legacyUserId", member.authority_member_id::text AS "targetId",
           member.authority_revision::bigint AS "authorityRevision",
           member.authority_content_hash AS "authorityContentHash",
           room.authority_room_id::text AS "roomId", account.authority_enterprise_id::text AS "enterpriseId",
           identity.authority_user_id::text AS "userId", identity.email, identity.display_name AS "displayName",
           member.role, member.non_presenter AS "nonPresenter", member.muted, member.banned, member.paused,
           member.permissions_json AS "permissionsJson", member.has_file_access AS "canAccessFiles",
           member.deny_archives_access AS "denyArchivesAccess", member.restrict_pm_user AS "isPmRestricted",
           member.is_free_trial AS "isTrial", member.hide_pers_info AS "hidePersonalInfo",
           member.hide_user_count AS "hideUserCount", member.note AS "adminNote",
           member.invite_status AS "approvalStatus", member.has_mobile_app AS "hasMobileApp",
           (identity.password_hash IS NOT NULL) AS "hasPassword", member.last_login_at AS "lastSeenAt",
           CASE WHEN member.role = 0 THEN room.created_at ELSE member.created_at END AS "createdAt"
      FROM room_users AS member
      INNER JOIN rooms AS room ON room.id = member.room_id
      INNER JOIN accounts AS account ON account.id = room.account_id
      INNER JOIN users AS identity ON identity.id = member.user_id AND identity.account_id = account.id
     WHERE room.authority_room_id IS NOT NULL AND room.authority_reconciled_at IS NOT NULL
       AND account.authority_enterprise_id IS NOT NULL AND account.authority_reconciled_at IS NOT NULL
       AND identity.authority_user_id IS NOT NULL AND identity.authority_reconciled_at IS NOT NULL
     ORDER BY member.id
  `
  );
  const rows = normalizeMembershipRows(raw);
  const total = await sql`SELECT count(*)::integer AS count FROM room_users`;
  if (rows.length !== total[0].count) {
    refuse(
      'membership-prerequisites-incomplete',
      'Every membership requires reconciled account, room, and user mappings.'
    );
  }
  return rows;
}

/** @param {SqlHandle} sql @param {string} fingerprint @returns {Promise<MappingRow[]>} */
async function readMappings(sql, fingerprint) {
  return /** @type {Promise<MappingRow[]>} */ (
    sql`
    SELECT legacy_id AS "legacyId", target_id::text AS "targetId", source_digest AS "sourceDigest"
      FROM legacy_entity_mappings
     WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
       AND entity_type = ${ENTITY_TYPE}
     ORDER BY legacy_id
  `
  );
}

/**
 * Resolve stable ids from the target ledger, adopting only the room converter's owner row.
 * @param {MembershipRow[]} rows
 * @param {MappingRow[]} mappings
 * @param {(row: MembershipRow) => string} allocate
 * @returns {PlanItem[]}
 */
export function resolveMembershipPlan(rows, mappings, allocate) {
  const byLegacy = new Map(mappings.map((mapping) => [String(mapping.legacyId), mapping]));
  if (byLegacy.size !== mappings.length) refuse('duplicate-ledger-mapping', 'The membership ledger is ambiguous.');
  const sourceIds = new Set(rows.map((row) => row.legacyId));
  if (mappings.some((mapping) => !sourceIds.has(String(mapping.legacyId)))) {
    refuse('extra-target-mapping', 'The target maps a membership absent from the source.');
  }
  const targets = new Set();
  return rows.map((row) => {
    const ledger = byLegacy.get(row.legacyId);
    if (row.targetId && !ledger) {
      refuse('unproven-source-mapping', 'A source membership mapping has no target ownership ledger.');
    }
    const targetId = ledger ? uuid(ledger.targetId, 'invalid-ledger-target') : allocate(row);
    if (row.targetId && row.targetId !== targetId) {
      refuse('mapping-disagreement', 'Source and target membership mappings disagree.');
    }
    if (targets.has(targetId)) refuse('duplicate-target-membership', 'The target membership plan is not one to one.');
    targets.add(targetId);
    const sourceDigest = sourceRecordDigest(row);
    if (ledger && (!SHA256.test(ledger.sourceDigest) || ledger.sourceDigest !== sourceDigest)) {
      refuse('source-changed-since-target-commit', 'Source membership changed after the target commit.');
    }
    return { row, targetId, sourceDigest, mapped: Boolean(ledger) };
  });
}

/** @param {TargetMember} member */
function canonicalContentHash(member) {
  return digest([
    member.id,
    member.roomId,
    member.userId,
    member.email.trim().toLowerCase(),
    member.displayName,
    member.role,
    member.revision,
    member.badges,
    member.canPublishMic,
    member.canPublishScreen,
    member.canPublishCam,
    member.canUseAdminChat,
    member.canEditNotes,
    member.canAccessFiles,
    member.canAccessArchives,
    member.isMuted,
    member.isBanned,
    member.isPmRestricted,
    member.isTrial,
    member.hidePersonalInfo,
    member.hideUserCount,
    member.isPaused,
    member.adminNote,
    member.approvalStatus,
    member.hasMobileApp,
    member.hasPassword,
    optionalIso(member.lastSeenAt, 'invalid-last-seen-time'),
    optionalIso(member.invitedAt, 'invalid-invited-time'),
    optionalIso(member.joinedAt, 'invalid-joined-time'),
    iso(member.createdAt, 'invalid-created-time')
  ]);
}

/** @param {Record<string, unknown> | undefined} raw @returns {TargetMember | null} */
function targetMember(raw) {
  if (!raw) return null;
  return {
    id: uuid(raw.id, 'invalid-target-membership'),
    roomId: uuid(raw.roomId, 'invalid-target-room'),
    userId: uuid(raw.userId, 'invalid-target-user'),
    enterpriseId: uuid(raw.enterpriseId, 'invalid-target-enterprise'),
    email: String(raw.email).toLowerCase(),
    displayName: String(raw.displayName),
    role: String(raw.role),
    revision: Number(raw.revision),
    badges: raw.badges,
    canPublishMic: raw.canPublishMic === true,
    canPublishScreen: raw.canPublishScreen === true,
    canPublishCam: raw.canPublishCam === true,
    canUseAdminChat: raw.canUseAdminChat === true,
    canEditNotes: raw.canEditNotes === true,
    canAccessFiles: raw.canAccessFiles === true,
    canAccessArchives: raw.canAccessArchives === true,
    isMuted: raw.isMuted === true,
    isBanned: raw.isBanned === true,
    isPmRestricted: raw.isPmRestricted === true,
    isTrial: raw.isTrial === true,
    hidePersonalInfo: raw.hidePersonalInfo === true,
    hideUserCount: raw.hideUserCount === true,
    isPaused: raw.isPaused === true,
    adminNote: raw.adminNote == null ? null : String(raw.adminNote),
    approvalStatus: String(raw.approvalStatus),
    hasMobileApp: raw.hasMobileApp === true,
    hasPassword: raw.hasPassword === true,
    lastSeenAt: optionalIso(raw.lastSeenAt, 'invalid-last-seen-time'),
    invitedAt: optionalIso(raw.invitedAt, 'invalid-invited-time'),
    joinedAt: optionalIso(raw.joinedAt, 'invalid-joined-time'),
    createdAt: iso(raw.createdAt, 'invalid-created-time')
  };
}

/** @param {SqlHandle} sql @param {string} targetId @param {boolean} [lock] @returns {Promise<TargetMember | null>} */
async function targetState(sql, targetId, lock = false) {
  const suffix = lock ? sql` FOR UPDATE OF member` : sql``;
  const rows = await sql`
    SELECT member.id::text AS id, member.enterprise_id::text AS "enterpriseId",
           member.room_id::text AS "roomId", member.user_id::text AS "userId", identity.email::text AS email,
           COALESCE(member.display_name, identity.display_name) AS "displayName", member.role,
           member.revision::bigint AS revision, member.badges, member.can_publish_mic AS "canPublishMic",
           member.can_publish_screen AS "canPublishScreen", member.can_publish_cam AS "canPublishCam",
           member.can_use_admin_chat AS "canUseAdminChat", member.can_edit_notes AS "canEditNotes",
           member.can_access_files AS "canAccessFiles", member.can_access_archives AS "canAccessArchives",
           member.is_muted AS "isMuted", member.is_banned AS "isBanned",
           member.is_pm_restricted AS "isPmRestricted", member.is_trial AS "isTrial",
           member.hide_personal_info AS "hidePersonalInfo", member.hide_user_count AS "hideUserCount",
           member.is_paused AS "isPaused", member.admin_note AS "adminNote",
           member.approval_status AS "approvalStatus", member.has_mobile_app AS "hasMobileApp",
           (identity.password_hash IS NOT NULL) AS "hasPassword", member.last_seen_at AS "lastSeenAt",
           member.invited_at AS "invitedAt", member.joined_at AS "joinedAt", member.created_at AS "createdAt"
      FROM room_members AS member INNER JOIN users AS identity ON identity.id = member.user_id
     WHERE member.id = ${targetId}::uuid${suffix}
  `;
  return targetMember(/** @type {Record<string, unknown> | undefined} */ (rows[0]));
}

/** @param {MembershipRow} row @param {TargetMember | null} target */
function coreMatches(row, target) {
  return (
    target &&
    target.enterpriseId === row.enterpriseId &&
    target.roomId === row.roomId &&
    target.userId === row.userId &&
    target.email === row.email &&
    target.displayName === row.displayName &&
    target.role === row.role &&
    target.revision === 0 &&
    target.canPublishMic === row.canPublishMic &&
    target.canPublishScreen === row.canPublishScreen &&
    target.canPublishCam === row.canPublishCam &&
    target.canUseAdminChat === row.canUseAdminChat &&
    target.canEditNotes === row.canEditNotes &&
    target.canAccessFiles === row.canAccessFiles &&
    target.canAccessArchives === row.canAccessArchives &&
    target.isMuted === row.isMuted &&
    target.isBanned === row.isBanned &&
    target.isPmRestricted === row.isPmRestricted &&
    target.isTrial === row.isTrial &&
    target.hidePersonalInfo === row.hidePersonalInfo &&
    target.hideUserCount === row.hideUserCount &&
    target.isPaused === row.isPaused &&
    target.adminNote === row.adminNote &&
    target.approvalStatus === row.approvalStatus &&
    target.hasMobileApp === row.hasMobileApp &&
    target.hasPassword === row.hasPassword &&
    target.lastSeenAt === row.lastSeenAt &&
    target.invitedAt === null &&
    target.joinedAt === row.createdAt &&
    target.createdAt === row.createdAt
  );
}

/** @param {SqlHandle} sql @param {MembershipRow[]} rows @returns {Promise<Map<string, string>>} */
async function ownerTargets(sql, rows) {
  const result = new Map();
  for (const row of rows.filter((candidate) => candidate.role === 'owner')) {
    const found = await sql`
      SELECT member.id::text AS id
        FROM room_members AS member INNER JOIN rooms AS room ON room.id = member.room_id
       WHERE member.room_id = ${row.roomId}::uuid AND member.user_id = ${row.userId}::uuid
         AND member.role = 'owner' AND room.owner_id = ${row.userId}::uuid
    `;
    if (found.length !== 1) refuse('missing-target-owner', 'The room converter owner foundation is incomplete.');
    result.set(row.legacyId, found[0].id);
  }
  return result;
}

/** @param {SqlHandle} sql @param {string} fingerprint @param {MembershipRow} row */
async function assertDependencyLedgers(sql, fingerprint, row) {
  const proof = await sql`
    SELECT entity_type AS type, target_id::text AS id FROM legacy_entity_mappings
     WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
       AND ((entity_type = 'room' AND legacy_id = ${row.legacyRoomId})
         OR (entity_type = 'user' AND legacy_id = ${row.legacyUserId}))
  `;
  if (
    proof.length !== 2 ||
    !proof.some((item) => item.type === 'room' && item.id === row.roomId) ||
    !proof.some((item) => item.type === 'user' && item.id === row.userId)
  ) {
    refuse('dependency-ledger-disagreement', 'Membership authority requires matching profile and room ledgers.');
  }
}

/** @param {SqlHandle} sql @param {string} fingerprint */
async function activeRun(sql, fingerprint) {
  const rows = await sql`
    SELECT id::text AS id, source_digest AS "sourceDigest", source_counts AS "sourceCounts"
      FROM legacy_cutover_runs
     WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint} AND scope = ${SCOPE}
       AND status IN ('running', 'target-committed') ORDER BY started_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

/** @param {SqlHandle} sql @param {string} fingerprint @param {MembershipSnapshot} state */
async function beginRun(sql, fingerprint, state) {
  const active = await activeRun(sql, fingerprint);
  if (active) {
    if (active.sourceDigest !== state.digest || active.sourceCounts.memberships !== state.counts.memberships) {
      refuse('source-changed-during-resume', 'The source changed after an unfinished membership commit.');
    }
    return active.id;
  }
  const rows = await sql`
    INSERT INTO legacy_cutover_runs
      (source_system, source_fingerprint, scope, status, source_counts, target_counts, source_digest)
    VALUES (${SOURCE_SYSTEM}, ${fingerprint}, ${SCOPE}, 'running', ${sql.json(state.counts)}, '{}'::jsonb,
            ${state.digest}) RETURNING id::text AS id
  `;
  return rows[0].id;
}

/** @param {Sql} sourceSql @param {SqlHandle} targetSql @param {string} fingerprint */
async function planState(sourceSql, targetSql, fingerprint) {
  const rows = await readSource(sourceSql);
  const mappings = await readMappings(targetSql, fingerprint);
  const owners = await ownerTargets(targetSql, rows);
  const plan = resolveMembershipPlan(rows, mappings, (row) => owners.get(row.legacyId) ?? randomUUID());
  for (const item of plan) {
    await assertDependencyLedgers(targetSql, fingerprint, item.row);
    const relation = await targetSql`
      SELECT id::text AS id FROM room_members
       WHERE room_id = ${item.row.roomId}::uuid AND user_id = ${item.row.userId}::uuid
    `;
    if (item.mapped && (relation.length !== 1 || relation[0].id !== item.targetId)) {
      refuse('target-relation-disagreement', 'A mapped target membership relation is missing or ambiguous.');
    }
    if (!item.mapped && item.row.role !== 'owner' && relation.length !== 0) {
      refuse('unproven-existing-target', 'A canonical membership already exists without conversion ownership proof.');
    }
  }
  return { rows, plan, state: snapshot(rows) };
}

/**
 * @param {Sql} sourceSql
 * @param {SqlHandle} targetSql
 * @param {string} fingerprint
 * @param {string | null} [expectedRunId]
 * @param {boolean} [updateEvidence]
 */
async function verifyState(sourceSql, targetSql, fingerprint, expectedRunId = null, updateEvidence = true) {
  const { plan, state } = await planState(sourceSql, targetSql, fingerprint);
  if (plan.some((item) => !item.mapped)) refuse('missing-target-mapping', 'A source membership is not mapped.');
  for (const item of plan) {
    const target = await targetState(targetSql, item.targetId);
    if (!target || !coreMatches(item.row, target)) {
      refuse('membership-reconciliation-failed', 'A canonical membership differs from its source projection.');
    }
    if (
      item.row.targetId !== item.targetId ||
      item.row.authorityRevision !== 0 ||
      item.row.authorityContentHash !== canonicalContentHash(target)
    ) {
      refuse('source-projection-incomplete', 'A controller membership proof differs from canonical state.');
    }
  }
  const runs = expectedRunId
    ? await targetSql`SELECT id::text AS id, source_digest AS "sourceDigest", source_counts AS "sourceCounts"
                        FROM legacy_cutover_runs WHERE id = ${expectedRunId}::uuid`
    : await targetSql`SELECT id::text AS id, source_digest AS "sourceDigest", source_counts AS "sourceCounts"
                        FROM legacy_cutover_runs WHERE source_system = ${SOURCE_SYSTEM}
                         AND source_fingerprint = ${fingerprint} AND scope = ${SCOPE}
                         AND status IN ('running', 'target-committed', 'verified')
                         ORDER BY started_at DESC LIMIT 1`;
  if (
    runs.length !== 1 ||
    runs[0].sourceDigest !== state.digest ||
    runs[0].sourceCounts.memberships !== state.counts.memberships
  ) {
    refuse('source-changed-since-target-commit', 'The source snapshot differs from the committed run.');
  }
  const targetDigest = digest(
    await Promise.all(
      plan.map(async (item) => {
        const target = await targetState(targetSql, item.targetId);
        if (!target) refuse('missing-target-membership', 'A mapped canonical membership is missing.');
        return canonicalContentHash(target);
      })
    )
  );
  if (updateEvidence) {
    await targetSql`
      UPDATE legacy_entity_mappings SET verified_at = now()
       WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
         AND entity_type = ${ENTITY_TYPE}
    `;
    await targetSql`
      UPDATE legacy_cutover_runs SET status = 'verified', verified_at = now(),
             target_counts = ${targetSql.json(state.counts)}, target_digest = ${targetDigest}, failure_code = NULL
       WHERE id = ${runs[0].id}::uuid
    `;
  }
  return { status: 'verified', runId: runs[0].id, counts: state.counts, sourceDigest: state.digest, targetDigest };
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function planCommand(sourceSql, targetSql, fingerprint) {
  const { plan, state } = await planState(sourceSql, targetSql, fingerprint);
  return { status: 'planned', ...state, unmapped: plan.filter((item) => !item.mapped).length };
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function applyCommand(sourceSql, targetSql, fingerprint) {
  await sourceSql`SELECT pg_advisory_lock(${LOCK_KEY})`;
  let targetLocked = false;
  try {
    await targetSql`SELECT pg_advisory_lock(${LOCK_KEY})`;
    targetLocked = true;
    const initial = await planState(sourceSql, targetSql, fingerprint);
    const runId = await targetSql.begin('isolation level serializable', async (/** @type {TransactionSql} */ tx) => {
      const id = await beginRun(tx, fingerprint, initial.state);
      const owners = await ownerTargets(tx, initial.rows);
      const currentMappings = await readMappings(tx, fingerprint);
      const plan = resolveMembershipPlan(
        initial.rows,
        currentMappings,
        (row) => owners.get(row.legacyId) ?? randomUUID()
      );
      for (const item of plan) {
        await assertDependencyLedgers(tx, fingerprint, item.row);
        const relation = await tx`
          SELECT id::text AS id FROM room_members
           WHERE room_id = ${item.row.roomId}::uuid AND user_id = ${item.row.userId}::uuid FOR UPDATE
        `;
        if (item.mapped) {
          if (relation.length !== 1 || relation[0].id !== item.targetId) {
            refuse('target-relation-disagreement', 'A mapped target membership relation changed concurrently.');
          }
          const target = await targetState(tx, item.targetId, true);
          if (!coreMatches(item.row, target)) {
            refuse('target-changed-during-resume', 'Canonical membership changed after the import commit.');
          }
          await tx`
            UPDATE legacy_entity_mappings SET run_id = ${id}::uuid, verified_at = NULL
             WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
               AND entity_type = ${ENTITY_TYPE} AND legacy_id = ${item.row.legacyId}
               AND target_id = ${item.targetId}::uuid AND source_digest = ${item.sourceDigest}
          `;
          continue;
        }
        if (item.row.role === 'owner') {
          if (relation.length !== 1 || relation[0].id !== item.targetId) {
            refuse('missing-target-owner', 'The room converter owner foundation changed concurrently.');
          }
          const foundation = await targetState(tx, item.targetId, true);
          if (!foundation || foundation.role !== 'owner' || foundation.revision !== 0) {
            refuse('unproven-existing-target', 'The canonical owner membership has already been used.');
          }
          await tx`
            UPDATE room_members SET display_name = ${item.row.displayName}, role = ${item.row.role},
              can_publish_mic = ${item.row.canPublishMic}, can_publish_screen = ${item.row.canPublishScreen},
              can_publish_cam = ${item.row.canPublishCam}, can_use_admin_chat = ${item.row.canUseAdminChat},
              can_edit_notes = ${item.row.canEditNotes}, can_access_files = ${item.row.canAccessFiles},
              can_access_archives = ${item.row.canAccessArchives}, is_muted = ${item.row.isMuted},
              is_banned = ${item.row.isBanned}, is_pm_restricted = ${item.row.isPmRestricted},
              is_trial = ${item.row.isTrial}, hide_personal_info = ${item.row.hidePersonalInfo},
              hide_user_count = ${item.row.hideUserCount}, is_paused = ${item.row.isPaused},
              admin_note = ${item.row.adminNote}, approval_status = ${item.row.approvalStatus},
              has_mobile_app = ${item.row.hasMobileApp}, last_seen_at = ${item.row.lastSeenAt},
              invited_at = NULL, joined_at = ${item.row.createdAt}, created_at = ${item.row.createdAt}
             WHERE id = ${item.targetId}::uuid AND revision = 0
          `;
        } else {
          if (relation.length !== 0) {
            refuse('unproven-existing-target', 'A canonical membership already exists without ownership proof.');
          }
          const collision =
            await tx`SELECT EXISTS(SELECT 1 FROM room_members WHERE id = ${item.targetId}::uuid) AS found`;
          if (collision[0].found) refuse('target-id-collision', 'An allocated membership id already exists.');
          await tx`
            INSERT INTO room_members
              (id, enterprise_id, room_id, user_id, display_name, role, revision, can_publish_mic,
               can_publish_screen, can_publish_cam, can_use_admin_chat, can_edit_notes, can_access_files,
               can_access_archives, is_muted, is_banned, is_pm_restricted, is_trial, hide_personal_info,
               hide_user_count, is_paused, admin_note, approval_status, has_mobile_app, last_seen_at,
               invited_at, joined_at, created_at, updated_at)
            VALUES (${item.targetId}::uuid, ${item.row.enterpriseId}::uuid, ${item.row.roomId}::uuid,
                    ${item.row.userId}::uuid, ${item.row.displayName}, ${item.row.role}, 0,
                    ${item.row.canPublishMic}, ${item.row.canPublishScreen}, ${item.row.canPublishCam},
                    ${item.row.canUseAdminChat}, ${item.row.canEditNotes}, ${item.row.canAccessFiles},
                    ${item.row.canAccessArchives}, ${item.row.isMuted}, ${item.row.isBanned},
                    ${item.row.isPmRestricted}, ${item.row.isTrial}, ${item.row.hidePersonalInfo},
                    ${item.row.hideUserCount}, ${item.row.isPaused}, ${item.row.adminNote},
                    ${item.row.approvalStatus}, ${item.row.hasMobileApp}, ${item.row.lastSeenAt}, NULL,
                    ${item.row.createdAt}, ${item.row.createdAt}, ${item.row.createdAt})
          `;
        }
        const target = await targetState(tx, item.targetId, true);
        if (!coreMatches(item.row, target)) {
          refuse('target-write-disagreement', 'Canonical membership did not reproduce the source state.');
        }
        await tx`
          INSERT INTO legacy_entity_mappings
            (source_system, source_fingerprint, entity_type, legacy_id, target_id, run_id, source_digest)
          VALUES (${SOURCE_SYSTEM}, ${fingerprint}, ${ENTITY_TYPE}, ${item.row.legacyId},
                  ${item.targetId}::uuid, ${id}::uuid, ${item.sourceDigest})
        `;
      }
      await tx`
        UPDATE legacy_cutover_runs SET status = 'target-committed', target_committed_at = now(),
               target_counts = ${tx.json(initial.state.counts)} WHERE id = ${id}::uuid
      `;
      return id;
    });

    const mappings = await readMappings(targetSql, fingerprint);
    const owners = await ownerTargets(targetSql, initial.rows);
    const committedPlan = resolveMembershipPlan(
      initial.rows,
      mappings,
      (row) => owners.get(row.legacyId) ?? randomUUID()
    );
    const projection = new Map();
    for (const item of committedPlan) {
      const target = await targetState(targetSql, item.targetId);
      if (!target || !coreMatches(item.row, target))
        refuse('target-write-disagreement', 'Canonical target changed before projection.');
      projection.set(item.row.legacyId, { id: item.targetId, hash: canonicalContentHash(target) });
    }
    await sourceSql.begin('isolation level serializable', async (/** @type {TransactionSql} */ tx) => {
      const current = await readSource(tx);
      if (snapshot(current).digest !== initial.state.digest) {
        refuse('source-projection-race', 'Source membership changed during conversion.');
      }
      for (const item of committedPlan) {
        const proof = projection.get(item.row.legacyId);
        const updated = await tx`
          UPDATE room_users SET authority_member_id = ${proof.id}::uuid, authority_revision = 0,
                 authority_content_hash = ${proof.hash}, authority_reconciled_at = now()
           WHERE id = ${item.row.legacyId}::integer
             AND (authority_member_id IS NULL OR authority_member_id = ${proof.id}::uuid)
          RETURNING id
        `;
        if (updated.length !== 1) refuse('source-projection-race', 'Source membership proof changed concurrently.');
      }
    });
    return verifyState(sourceSql, targetSql, fingerprint, runId);
  } finally {
    if (targetLocked) await targetSql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
    await sourceSql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
  }
}

/** @param {SqlHandle} sql @param {PlanItem[]} plan */
async function rollbackSafe(sql, plan) {
  const references = await sql`
    SELECT source.relname AS "tableName", source_attribute.attname AS "columnName"
      FROM pg_catalog.pg_constraint AS constraint_row
      INNER JOIN pg_catalog.pg_class AS source ON source.oid = constraint_row.conrelid
      INNER JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = source.relnamespace
      CROSS JOIN LATERAL unnest(constraint_row.conkey, constraint_row.confkey)
        AS key_pair(source_number, target_number)
      INNER JOIN pg_catalog.pg_attribute AS source_attribute
        ON source_attribute.attrelid = source.oid AND source_attribute.attnum = key_pair.source_number
      INNER JOIN pg_catalog.pg_attribute AS target_attribute
        ON target_attribute.attrelid = constraint_row.confrelid AND target_attribute.attnum = key_pair.target_number
     WHERE constraint_row.contype = 'f' AND constraint_row.confrelid = 'public.room_members'::regclass
       AND namespace.nspname = 'public' AND target_attribute.attname = 'id'
     ORDER BY source.relname, source_attribute.attname
  `;
  for (const item of plan) {
    const target = await targetState(sql, item.targetId, true);
    if (!target || !coreMatches(item.row, target) || JSON.stringify(target.badges) !== '[]') {
      refuse('rollback-after-use', 'Membership authority changed after conversion; rollback is refused.');
    }
    for (const reference of references) {
      const rows = await sql`
        SELECT count(*)::integer AS count FROM ${sql(reference.tableName)}
         WHERE ${sql(reference.columnName)} = ${item.targetId}::uuid
      `;
      if (rows[0].count !== 0) {
        refuse('rollback-after-use', 'An imported membership has dependent canonical activity.');
      }
    }
  }
}

/** @param {SqlHandle} sql @param {PlanItem} item */
async function restoreOwnerFoundation(sql, item) {
  const restored = await sql`
    UPDATE room_members AS member SET display_name = identity.display_name, role = 'owner', revision = 0,
           can_publish_mic = false, can_publish_screen = false, can_publish_cam = false,
           can_use_admin_chat = false, can_edit_notes = false, can_access_files = false,
           can_access_archives = true, is_muted = false, is_banned = false, is_pm_restricted = false,
           is_trial = false, hide_personal_info = false, hide_user_count = false, is_paused = false,
           admin_note = NULL, approval_status = 'approved', has_mobile_app = false, last_seen_at = NULL,
           invited_at = NULL, joined_at = room.created_at, created_at = room.created_at,
           updated_at = room.created_at
      FROM users AS identity, rooms AS room
     WHERE member.id = ${item.targetId}::uuid AND identity.id = member.user_id
       AND room.id = member.room_id AND room.owner_id = member.user_id
    RETURNING member.id
  `;
  if (restored.length !== 1) refuse('owner-foundation-race', 'The canonical owner foundation could not be restored.');
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function rollbackCommand(sourceSql, targetSql, fingerprint) {
  await sourceSql`SELECT pg_advisory_lock(${LOCK_KEY})`;
  let targetLocked = false;
  try {
    await targetSql`SELECT pg_advisory_lock(${LOCK_KEY})`;
    targetLocked = true;
    const rows = await readSource(sourceSql);
    const mappings = await readMappings(targetSql, fingerprint);
    const latest = await targetSql`
      SELECT status FROM legacy_cutover_runs WHERE source_system = ${SOURCE_SYSTEM}
       AND source_fingerprint = ${fingerprint} AND scope = ${SCOPE} ORDER BY started_at DESC LIMIT 1
    `;
    if (latest[0]?.status === 'rolled-back') {
      if (
        mappings.length !== 0 ||
        rows.some((row) => row.targetId !== null || row.authorityRevision !== null || row.authorityContentHash !== null)
      ) {
        refuse('rollback-state-disagreement', 'A completed rollback still has membership ownership residue.');
      }
      return { status: 'rolled-back', counts: snapshot(rows).counts };
    }
    const owners = await ownerTargets(targetSql, rows);
    const plan = resolveMembershipPlan(rows, mappings, (row) => owners.get(row.legacyId) ?? randomUUID());
    if (plan.some((item) => !item.mapped)) refuse('missing-target-mapping', 'A source membership is not mapped.');
    await targetSql.begin('isolation level serializable', async (/** @type {TransactionSql} */ tx) => {
      await rollbackSafe(tx, plan);
      await sourceSql.begin('isolation level serializable', async (/** @type {TransactionSql} */ sourceTx) => {
        for (const item of plan) {
          const cleared = await sourceTx`
            UPDATE room_users SET authority_member_id = NULL, authority_revision = NULL,
                   authority_content_hash = NULL, authority_reconciled_at = NULL
             WHERE id = ${item.row.legacyId}::integer
               AND (authority_member_id IS NULL OR authority_member_id = ${item.targetId}::uuid)
            RETURNING id
          `;
          if (cleared.length !== 1)
            refuse('source-projection-race', 'Source membership proof changed during rollback.');
        }
      });
      for (const item of plan) {
        if (item.row.role === 'owner') await restoreOwnerFoundation(tx, item);
        else {
          const removed =
            await tx`DELETE FROM room_members WHERE id = ${item.targetId}::uuid AND revision = 0 RETURNING id`;
          if (removed.length !== 1) refuse('target-membership-race', 'Canonical membership changed during rollback.');
        }
      }
      await tx`
        DELETE FROM legacy_entity_mappings WHERE source_system = ${SOURCE_SYSTEM}
         AND source_fingerprint = ${fingerprint} AND entity_type = ${ENTITY_TYPE}
      `;
      await tx`
        UPDATE legacy_cutover_runs SET status = 'rolled-back', rolled_back_at = now()
         WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint} AND scope = ${SCOPE}
           AND status IN ('running', 'target-committed', 'verified')
      `;
    });
    return { status: 'rolled-back', counts: snapshot(rows).counts };
  } finally {
    if (targetLocked) await targetSql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
    await sourceSql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
  }
}

/** @param {MembershipCutoverInput} input */
export async function runMembershipCutover({ command, sourceUrl, targetUrl, sourceLabel }) {
  if (typeof command !== 'string' || !COMMANDS.has(command)) {
    refuse('invalid-command', 'Expected plan, apply, verify, or rollback.');
  }
  if (!sourceUrl || !targetUrl) {
    refuse('missing-database-url', 'Both CUTOVER_SOURCE_DATABASE_URL and CUTOVER_TARGET_DATABASE_URL are required.');
  }
  if (sourceUrl === targetUrl) refuse('same-database-url', 'Source and target database URLs must differ.');
  const fingerprint = sourceFingerprint(sourceLabel);
  const options = { max: 1, prepare: false, idle_timeout: 5, connect_timeout: 10 };
  const sourceSql = postgres(sourceUrl, options);
  const targetSql = postgres(targetUrl, options);
  try {
    if (command === 'plan') return await planCommand(sourceSql, targetSql, fingerprint);
    if (command === 'apply') return await applyCommand(sourceSql, targetSql, fingerprint);
    if (command === 'verify') return await verifyState(sourceSql, targetSql, fingerprint);
    return await rollbackCommand(sourceSql, targetSql, fingerprint);
  } finally {
    await Promise.allSettled([sourceSql.end({ timeout: 5 }), targetSql.end({ timeout: 5 })]);
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) {
  try {
    const result = await runMembershipCutover({
      command: process.argv[2],
      sourceUrl: process.env.CUTOVER_SOURCE_DATABASE_URL,
      targetUrl: process.env.CUTOVER_TARGET_DATABASE_URL,
      sourceLabel: process.env.CUTOVER_SOURCE_LABEL
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (cause) {
    const code = cause instanceof MembershipCutoverRefusal ? cause.code : 'internal';
    process.stderr.write(`[cutover:membership] ${code}\n`);
    process.exitCode = 1;
  }
}
