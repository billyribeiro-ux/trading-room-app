#!/usr/bin/env node

/**
 * Reversible Gate 3 conversion of controller badges and badge assignments into canonical Rust
 * authority. Profile, room, and membership conversion are hard prerequisites. Target rows and the
 * owner-only mapping ledger commit atomically before controller projection proofs are recorded, so
 * the only cross-database window is explicit and resumable.
 */

import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import postgres from 'postgres';
import { canonicalMembershipContentHash, readCanonicalMembership } from './cutover-membership-authority.mjs';

/** @typedef {import('postgres').Sql} Sql */
/** @typedef {import('postgres').TransactionSql} TransactionSql */
/** @typedef {Sql | TransactionSql} SqlHandle */
/** @typedef {NonNullable<Awaited<ReturnType<typeof readCanonicalMembership>>>} TargetMember */
/**
 * @typedef {object} BadgeRow
 * @property {string} legacyId
 * @property {string} legacyAccountId
 * @property {string} enterpriseId
 * @property {string | null} targetId
 * @property {string} label
 * @property {string} textColor
 * @property {string} backgroundColor
 * @property {string | null} emoji
 * @property {string | null} imageDataUrl
 * @property {string | null} darkThemeLegacyId
 * @property {string[]} autoAssignRoles
 * @property {string} createdAt
 * @property {number | null} authorityRevision
 * @property {string | null} authorityContentHash
 */
/**
 * @typedef {object} MemberRow
 * @property {string} legacyId
 * @property {string} legacyAccountId
 * @property {string} targetId
 * @property {string} enterpriseId
 * @property {string} roomId
 * @property {string[]} badgeLegacyIds
 * @property {string} authorityContentHash
 */
/** @typedef {{ badges: BadgeRow[]; members: MemberRow[] }} BadgeSource */
/** @typedef {{ legacyId: string; targetId: string; sourceDigest: string }} MappingRow */
/** @typedef {{ row: BadgeRow; targetId: string; sourceDigest: string; mapped: boolean }} PlanItem */
/**
 * @typedef {object} TargetBadge
 * @property {string} id
 * @property {string} enterpriseId
 * @property {number} revision
 * @property {string} label
 * @property {string} textColor
 * @property {string} backgroundColor
 * @property {string | null} emoji
 * @property {string | null} imageDataUrl
 * @property {string | null} darkThemeBadgeId
 * @property {string[]} autoAssignRoles
 * @property {string} createdAt
 * @property {string} updatedAt
 */
/** @typedef {{ counts: { badges: number; assignments: number }; digest: string }} BadgeSnapshot */
/** @typedef {Map<string, string[]>} DesiredAssignments */
/** @typedef {{ id: string; sourceDigest: string; sourceCounts: { badges: number; assignments: number } }} RunRow */
/**
 * @typedef {object} BadgeCutoverInput
 * @property {string | undefined} command
 * @property {string | undefined} sourceUrl
 * @property {string | undefined} targetUrl
 * @property {string | undefined} sourceLabel
 */

const SOURCE_SYSTEM = 'controller-postgres';
const SCOPE = 'badges';
const ENTITY_TYPE = 'badge';
const LOCK_KEY = 0x4355_5437;
const COMMANDS = new Set(['plan', 'apply', 'verify', 'rollback']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const COLOR = /^#[0-9a-f]{6}$/i;
const IMAGE = /^data:image\/(png|jpeg|gif|webp);base64,([a-z0-9+/]+={0,2})$/i;

export class BadgeCutoverRefusal extends Error {
  /** @param {string} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.name = 'BadgeCutoverRefusal';
    this.code = code;
  }
}

/** @param {string} code @param {string} message @returns {never} */
function refuse(code, message) {
  throw new BadgeCutoverRefusal(code, message);
}

/** @param {unknown} value */
function digest(value) {
  return createHash('sha256')
    .update(JSON.stringify(value) ?? 'undefined')
    .digest('hex');
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

/** @overload @param {unknown} value @param {string} code @param {true} nullable @returns {string | null} */
/** @overload @param {unknown} value @param {string} code @param {false | undefined} [nullable] @returns {string} */
/** @param {unknown} value @param {string} code @param {boolean} [nullable] */
function legacyId(value, code, nullable = false) {
  if (nullable && value == null) return null;
  const normalized = String(value ?? '');
  if (!/^[1-9][0-9]*$/u.test(normalized)) refuse(code, 'A legacy row identity is invalid.');
  return normalized;
}

/** @param {unknown} value @param {string} code */
function iso(value, code) {
  const parsed = value instanceof Date ? value : new Date(/** @type {string | number} */ (value));
  if (!Number.isFinite(parsed.getTime())) refuse(code, 'A badge timestamp is invalid.');
  return parsed.toISOString();
}

/** @param {unknown} value @param {number} maxBytes @param {string} code @returns {string | null} */
function optionalText(value, maxBytes, code) {
  if (value == null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (Buffer.byteLength(normalized) > maxBytes) refuse(code, 'A badge field exceeds its byte limit.');
  return normalized;
}

/** @param {unknown} value @returns {string[]} */
function roles(value) {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      refuse('invalid-role-json', 'A badge role list is not valid JSON.');
    }
  }
  if (!Array.isArray(parsed) || parsed.length > 32) {
    refuse('invalid-role-list', 'A badge role list is not a bounded array.');
  }
  const normalized = [
    ...new Set(
      parsed.map((role) => {
        const item = String(role).trim().toLowerCase();
        if (!/^[a-z0-9_-]{1,64}$/u.test(item)) {
          refuse('invalid-role-slug', 'A badge role is not a valid role slug.');
        }
        return item;
      })
    )
  ].sort();
  return normalized;
}

/** @param {unknown} value @returns {string | null} */
function imageDataUrl(value) {
  const normalized = optionalText(value, 360_000, 'invalid-image-size');
  if (normalized === null) return null;
  const match = IMAGE.exec(normalized);
  if (!match) refuse('invalid-image-type', 'A badge image is not a supported base64 raster image.');
  const decoded = Buffer.from(match[2], 'base64');
  if (decoded.length === 0 || decoded.length > 256 * 1024) {
    refuse('invalid-image-size', 'A badge image is empty or exceeds 256 KiB.');
  }
  if (decoded.toString('base64').replace(/=+$/u, '') !== match[2].replace(/=+$/u, '')) {
    refuse('invalid-image-base64', 'A badge image contains non-canonical base64.');
  }
  return normalized;
}

/** @param {BadgeRow} row */
function badgeSourceRecord(row) {
  const {
    targetId: _targetId,
    authorityRevision: _authorityRevision,
    authorityContentHash: _authorityContentHash,
    ...record
  } = row;
  return record;
}

/** @param {BadgeRow} row */
function badgeSourceDigest(row) {
  return digest(badgeSourceRecord(row));
}

/** @param {Record<string, unknown>[]} rawBadges @param {Record<string, unknown>[]} rawMembers @returns {BadgeSource} */
export function normalizeBadgeSource(rawBadges, rawMembers) {
  const badges = rawBadges.map((raw) => {
    const label = String(raw.label ?? '').trim();
    if (Buffer.byteLength(label) > 160) refuse('invalid-label', 'A badge label exceeds 160 UTF-8 bytes.');
    const image = imageDataUrl(raw.imageDataUrl);
    if (!label && image === null) refuse('missing-badge-content', 'A badge requires a label or image.');
    const textColor = String(raw.textColor ?? '');
    const backgroundColor = String(raw.backgroundColor ?? '');
    if (!COLOR.test(textColor) || (!COLOR.test(backgroundColor) && backgroundColor !== 'rgba(1,0,0,0)')) {
      refuse('invalid-color', 'Badge colors do not use the canonical captured format.');
    }
    const targetId = uuid(raw.targetId, 'invalid-badge-mapping', true);
    const authorityRevision = raw.authorityRevision == null ? null : Number(raw.authorityRevision);
    const authorityContentHash = raw.authorityContentHash == null ? null : String(raw.authorityContentHash);
    if (authorityRevision !== null && (!Number.isSafeInteger(authorityRevision) || authorityRevision < 0)) {
      refuse('invalid-authority-revision', 'A controller badge revision is invalid.');
    }
    if (authorityContentHash !== null && !SHA256.test(authorityContentHash)) {
      refuse('invalid-authority-content-hash', 'A controller badge proof hash is invalid.');
    }
    const proofParts = [targetId, authorityRevision, authorityContentHash].filter((part) => part !== null).length;
    if (proofParts !== 0 && proofParts !== 3) {
      refuse('partial-source-proof', 'A controller badge has an incomplete authority proof.');
    }
    return {
      legacyId: legacyId(raw.legacyId, 'invalid-badge-id'),
      legacyAccountId: legacyId(raw.legacyAccountId, 'invalid-account-id'),
      enterpriseId: uuid(raw.enterpriseId, 'missing-enterprise-authority-mapping'),
      targetId,
      label,
      textColor,
      backgroundColor,
      emoji: optionalText(raw.emoji, 128, 'invalid-emoji'),
      imageDataUrl: image,
      darkThemeLegacyId: legacyId(raw.darkThemeLegacyId, 'invalid-dark-theme-id', true),
      autoAssignRoles: roles(raw.autoAssignRoles),
      createdAt: iso(raw.createdAt, 'invalid-created-time'),
      authorityRevision,
      authorityContentHash
    };
  });

  const byLegacy = new Map();
  const targetIds = new Set();
  for (const badge of badges) {
    if (byLegacy.has(badge.legacyId)) refuse('duplicate-badge-id', 'The source repeats a badge identity.');
    byLegacy.set(badge.legacyId, badge);
    if (badge.targetId && targetIds.has(badge.targetId)) {
      refuse('duplicate-target-badge', 'Two source badges claim one canonical badge.');
    }
    if (badge.targetId) targetIds.add(badge.targetId);
  }
  for (const badge of badges) {
    if (badge.darkThemeLegacyId === badge.legacyId) {
      refuse('self-dark-theme', 'A badge cannot be its own dark-theme target.');
    }
    if (badge.darkThemeLegacyId !== null) {
      const target = byLegacy.get(badge.darkThemeLegacyId);
      if (!target || target.legacyAccountId !== badge.legacyAccountId) {
        refuse('cross-account-dark-theme', 'A dark-theme badge target is missing or belongs to another account.');
      }
    }
  }

  const members = rawMembers.map((raw) => {
    let badgeIds;
    try {
      badgeIds = typeof raw.badgesJson === 'string' ? JSON.parse(raw.badgesJson) : raw.badgesJson;
    } catch {
      refuse('invalid-assignment-json', 'A member badge assignment is not valid JSON.');
    }
    if (!Array.isArray(badgeIds)) refuse('invalid-assignment-list', 'A member badge assignment is not an array.');
    const normalizedIds = [...new Set(badgeIds.map((id) => legacyId(id, 'invalid-assigned-badge-id')))].sort(
      (left, right) => (BigInt(left) < BigInt(right) ? -1 : 1)
    );
    if (raw.authorityRevision == null) {
      refuse('membership-prerequisite-incomplete', 'A canonical membership prerequisite has no revision proof.');
    }
    const authorityRevision = Number(raw.authorityRevision);
    if (!Number.isSafeInteger(authorityRevision) || authorityRevision !== 0) {
      refuse('membership-already-used', 'Badge conversion requires every canonical membership at revision zero.');
    }
    /** @type {MemberRow} */
    const row = {
      legacyId: legacyId(raw.legacyId, 'invalid-membership-id'),
      legacyAccountId: legacyId(raw.legacyAccountId, 'invalid-account-id'),
      targetId: uuid(raw.targetId, 'missing-membership-authority-mapping'),
      enterpriseId: uuid(raw.enterpriseId, 'missing-enterprise-authority-mapping'),
      roomId: uuid(raw.roomId, 'missing-room-authority-mapping'),
      badgeLegacyIds: normalizedIds,
      authorityContentHash: String(raw.authorityContentHash ?? '')
    };
    if (!SHA256.test(row.authorityContentHash)) {
      refuse('invalid-membership-content-hash', 'A membership prerequisite proof is missing or invalid.');
    }
    for (const badgeId of row.badgeLegacyIds) {
      const badge = byLegacy.get(badgeId);
      if (!badge || badge.legacyAccountId !== row.legacyAccountId || badge.enterpriseId !== row.enterpriseId) {
        refuse('cross-account-assignment', 'A member badge assignment is missing or crosses an account boundary.');
      }
    }
    return row;
  });
  const memberIds = new Set();
  for (const member of members) {
    if (memberIds.has(member.legacyId)) refuse('duplicate-membership-id', 'The source repeats a membership identity.');
    memberIds.add(member.legacyId);
  }
  badges.sort((left, right) => (BigInt(left.legacyId) < BigInt(right.legacyId) ? -1 : 1));
  members.sort((left, right) => (BigInt(left.legacyId) < BigInt(right.legacyId) ? -1 : 1));
  return { badges, members };
}

/** @param {BadgeSource} source @returns {BadgeSnapshot} */
function snapshot(source) {
  const assignments = source.members.reduce((count, member) => count + member.badgeLegacyIds.length, 0);
  return {
    counts: { badges: source.badges.length, assignments },
    digest: digest({
      badges: source.badges.map(badgeSourceDigest),
      assignments: source.members.flatMap((member) =>
        member.badgeLegacyIds.map((badgeId) => [member.legacyId, badgeId])
      )
    })
  };
}

/** @param {SqlHandle} sql @returns {Promise<BadgeSource>} */
async function readSource(sql) {
  const rawBadges = /** @type {Record<string, unknown>[]} */ (
    await sql`
    SELECT badge.id::text AS "legacyId", badge.account_id::text AS "legacyAccountId",
           account.authority_enterprise_id::text AS "enterpriseId",
           badge.authority_badge_id::text AS "targetId",
           badge.authority_revision::bigint AS "authorityRevision",
           badge.authority_content_hash AS "authorityContentHash", badge.label,
           badge.text_color AS "textColor", badge.background_color AS "backgroundColor",
           badge.emoji, badge.image_url AS "imageDataUrl",
           badge.dark_theme_badge_id::text AS "darkThemeLegacyId",
           badge.auto_assign_roles_json AS "autoAssignRoles", badge.created_at AS "createdAt"
      FROM badges AS badge INNER JOIN accounts AS account ON account.id = badge.account_id
     WHERE account.authority_enterprise_id IS NOT NULL AND account.authority_reconciled_at IS NOT NULL
     ORDER BY badge.id
  `
  );
  const rawMembers = /** @type {Record<string, unknown>[]} */ (
    await sql`
    SELECT member.id::text AS "legacyId", account.id::text AS "legacyAccountId",
           member.authority_member_id::text AS "targetId",
           member.authority_revision::bigint AS "authorityRevision",
           member.authority_content_hash AS "authorityContentHash",
           account.authority_enterprise_id::text AS "enterpriseId",
           room.authority_room_id::text AS "roomId", member.badges_json AS "badgesJson"
      FROM room_users AS member
      INNER JOIN rooms AS room ON room.id = member.room_id
      INNER JOIN accounts AS account ON account.id = room.account_id
     WHERE account.authority_enterprise_id IS NOT NULL AND account.authority_reconciled_at IS NOT NULL
       AND room.authority_room_id IS NOT NULL AND room.authority_reconciled_at IS NOT NULL
       AND member.authority_member_id IS NOT NULL AND member.authority_reconciled_at IS NOT NULL
     ORDER BY member.id
  `
  );
  const totals = await sql`
    SELECT (SELECT count(*)::integer FROM badges) AS badges,
           (SELECT count(*)::integer FROM room_users) AS members
  `;
  if (rawBadges.length !== totals[0].badges || rawMembers.length !== totals[0].members) {
    refuse(
      'badge-prerequisites-incomplete',
      'Every badge and membership requires reconciled account, room, and membership mappings.'
    );
  }
  return normalizeBadgeSource(rawBadges, rawMembers);
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
 * @param {BadgeRow[]} badges
 * @param {MappingRow[]} mappings
 * @param {(row: BadgeRow) => string} allocate
 * @returns {PlanItem[]}
 */
export function resolveBadgePlan(badges, mappings, allocate) {
  if (mappings.length !== 0 && mappings.length !== badges.length) {
    refuse('partial-target-commit', 'Badge mappings must commit atomically as a complete set.');
  }
  const byLegacy = new Map(mappings.map((mapping) => [String(mapping.legacyId), mapping]));
  if (byLegacy.size !== mappings.length) refuse('duplicate-ledger-mapping', 'The badge ledger is ambiguous.');
  const sourceIds = new Set(badges.map((badge) => badge.legacyId));
  if (mappings.some((mapping) => !sourceIds.has(String(mapping.legacyId)))) {
    refuse('extra-target-mapping', 'The target maps a badge absent from the source.');
  }
  const targets = new Set();
  return badges.map((row) => {
    const mapping = byLegacy.get(row.legacyId);
    if (row.targetId && !mapping) refuse('unproven-source-mapping', 'A source badge mapping has no target ledger.');
    const targetId = mapping ? uuid(mapping.targetId, 'invalid-ledger-target') : allocate(row);
    if (row.targetId && row.targetId !== targetId) {
      refuse('mapping-disagreement', 'Source and target badge mappings disagree.');
    }
    if (targets.has(targetId)) refuse('duplicate-target-badge', 'The badge target plan is not one to one.');
    targets.add(targetId);
    const sourceDigest = badgeSourceDigest(row);
    if (mapping && (!SHA256.test(mapping.sourceDigest) || mapping.sourceDigest !== sourceDigest)) {
      refuse('source-changed-since-target-commit', 'A badge source row changed after the target commit.');
    }
    return { row, targetId, sourceDigest, mapped: Boolean(mapping) };
  });
}

/** @param {TargetBadge} badge */
function canonicalBadgeHash(badge) {
  return digest([
    badge.id,
    badge.revision,
    badge.label,
    badge.textColor,
    badge.backgroundColor,
    badge.emoji,
    badge.imageDataUrl,
    badge.darkThemeBadgeId,
    badge.autoAssignRoles,
    iso(badge.createdAt, 'invalid-target-created-time'),
    iso(badge.updatedAt, 'invalid-target-updated-time')
  ]);
}

/** @param {SqlHandle} sql @param {string} targetId @param {boolean} [lock] @returns {Promise<TargetBadge | null>} */
async function readTargetBadge(sql, targetId, lock = false) {
  const suffix = lock ? sql` FOR UPDATE` : sql``;
  const rows = await sql`
    SELECT id::text AS id, enterprise_id::text AS "enterpriseId", revision::bigint AS revision,
           label, text_color AS "textColor", background_color AS "backgroundColor", emoji,
           image_data_url AS "imageDataUrl", dark_theme_badge_id::text AS "darkThemeBadgeId",
           auto_assign_roles AS "autoAssignRoles", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM enterprise_badges WHERE id = ${targetId}::uuid${suffix}
  `;
  if (!rows[0]) return null;
  const row = /** @type {TargetBadge} */ (/** @type {unknown} */ (rows[0]));
  return {
    ...row,
    revision: Number(row.revision),
    createdAt: iso(row.createdAt, 'invalid-target-created-time'),
    updatedAt: iso(row.updatedAt, 'invalid-target-updated-time')
  };
}

/** @param {PlanItem} item @param {TargetBadge | null} target @param {Map<string, PlanItem>} planByLegacy */
function targetBadgeMatches(item, target, planByLegacy) {
  const expectedDark = item.row.darkThemeLegacyId ? planByLegacy.get(item.row.darkThemeLegacyId)?.targetId : null;
  return (
    target &&
    target.id === item.targetId &&
    target.enterpriseId === item.row.enterpriseId &&
    target.revision === 0 &&
    target.label === item.row.label &&
    target.textColor === item.row.textColor &&
    target.backgroundColor === item.row.backgroundColor &&
    target.emoji === item.row.emoji &&
    target.imageDataUrl === item.row.imageDataUrl &&
    target.darkThemeBadgeId === expectedDark &&
    JSON.stringify(target.autoAssignRoles) === JSON.stringify(item.row.autoAssignRoles) &&
    target.createdAt === item.row.createdAt &&
    target.updatedAt === item.row.createdAt
  );
}

/** @param {SqlHandle} sql @param {string} fingerprint @param {BadgeSource} source */
async function assertDependencyLedgers(sql, fingerprint, source) {
  for (const badge of source.badges) {
    const proof = await sql`
      SELECT target_id::text AS id FROM legacy_entity_mappings
       WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
         AND entity_type = 'enterprise' AND legacy_id = ${badge.legacyAccountId}
    `;
    if (proof.length !== 1 || proof[0].id !== badge.enterpriseId) {
      refuse('dependency-ledger-disagreement', 'Badge authority requires the matching enterprise ledger.');
    }
  }
  for (const member of source.members) {
    const proof = await sql`
      SELECT target_id::text AS id FROM legacy_entity_mappings
       WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
         AND entity_type = 'membership' AND legacy_id = ${member.legacyId}
    `;
    if (proof.length !== 1 || proof[0].id !== member.targetId) {
      refuse('dependency-ledger-disagreement', 'Badge authority requires the matching membership ledger.');
    }
  }
}

/** @param {BadgeSource} source @param {PlanItem[]} plan @returns {DesiredAssignments} */
function desiredAssignments(source, plan) {
  const badgeByLegacy = new Map(plan.map((item) => [item.row.legacyId, item.targetId]));
  return new Map(
    source.members.map((member) => {
      const assigned = member.badgeLegacyIds.map((legacyBadgeId) => {
        const targetId = badgeByLegacy.get(legacyBadgeId);
        if (!targetId) refuse('missing-badge-plan', 'A badge assignment has no canonical badge plan.');
        return targetId;
      });
      return [member.targetId, assigned.sort()];
    })
  );
}

/**
 * @param {SqlHandle} sql
 * @param {BadgeSource} source
 * @param {DesiredAssignments} desired
 * @param {boolean} expectEmpty
 * @param {boolean} [lock]
 * @returns {Promise<Map<string, TargetMember>>}
 */
async function assertTargetMembers(sql, source, desired, expectEmpty, lock = false) {
  const states = new Map();
  for (const member of source.members) {
    const target = await readCanonicalMembership(sql, member.targetId, lock);
    if (
      !target ||
      target.enterpriseId !== member.enterpriseId ||
      target.roomId !== member.roomId ||
      target.revision !== 0
    ) {
      refuse('membership-prerequisite-changed', 'A canonical membership prerequisite changed or is missing.');
    }
    if (!Array.isArray(target.badges) || target.badges.some((badge) => typeof badge !== 'string')) {
      refuse('invalid-target-assignment-list', 'A canonical membership returned an invalid badge list.');
    }
    const actual = [...target.badges].sort();
    const wanted = expectEmpty ? [] : (desired.get(member.targetId) ?? []);
    if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
      refuse('target-assignment-disagreement', 'Canonical badge assignments differ from the conversion plan.');
    }
    states.set(member.targetId, target);
  }
  return states;
}

/** @param {Sql} sourceSql @param {SqlHandle} targetSql @param {string} fingerprint */
async function planState(sourceSql, targetSql, fingerprint) {
  const source = await readSource(sourceSql);
  const mappings = await readMappings(targetSql, fingerprint);
  const plan = resolveBadgePlan(source.badges, mappings, () => randomUUID());
  await assertDependencyLedgers(targetSql, fingerprint, source);
  const planByLegacy = new Map(plan.map((item) => [item.row.legacyId, item]));
  for (const item of plan) {
    const target = await readTargetBadge(targetSql, item.targetId);
    if (item.mapped && !targetBadgeMatches(item, target, planByLegacy)) {
      refuse('target-badge-disagreement', 'A mapped canonical badge differs from its source.');
    }
    if (!item.mapped && target) refuse('unproven-existing-target', 'An allocated badge id already exists.');
  }
  const desired = desiredAssignments(source, plan);
  await assertTargetMembers(targetSql, source, desired, mappings.length === 0);
  return { source, plan, state: snapshot(source), desired };
}

/** @param {SqlHandle} sql @param {string} fingerprint @returns {Promise<RunRow | null>} */
async function activeRun(sql, fingerprint) {
  const rows = /** @type {RunRow[]} */ (
    await sql`
    SELECT id::text AS id, source_digest AS "sourceDigest", source_counts AS "sourceCounts"
      FROM legacy_cutover_runs
     WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint} AND scope = ${SCOPE}
       AND status IN ('running', 'target-committed') ORDER BY started_at DESC LIMIT 1
  `
  );
  return rows[0] ?? null;
}

/** @param {SqlHandle} sql @param {string} fingerprint @param {BadgeSnapshot} state */
async function beginRun(sql, fingerprint, state) {
  const active = await activeRun(sql, fingerprint);
  if (active) {
    if (
      active.sourceDigest !== state.digest ||
      active.sourceCounts.badges !== state.counts.badges ||
      active.sourceCounts.assignments !== state.counts.assignments
    ) {
      refuse('source-changed-during-resume', 'The source changed after an unfinished badge commit.');
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

/** @param {SqlHandle} sql @param {BadgeSource} source @param {PlanItem[]} plan */
async function projectionFor(sql, source, plan) {
  const badgeProofs = new Map();
  const memberProofs = new Map();
  for (const item of plan) {
    const target = await readTargetBadge(sql, item.targetId);
    if (!target) refuse('missing-target-badge', 'A canonical badge is missing after commit.');
    badgeProofs.set(item.row.legacyId, canonicalBadgeHash(target));
  }
  for (const member of source.members) {
    const target = await readCanonicalMembership(sql, member.targetId);
    if (!target || target.revision !== 0) {
      refuse('membership-prerequisite-changed', 'A membership changed before badge projection completed.');
    }
    memberProofs.set(member.legacyId, canonicalMembershipContentHash(target));
  }
  return { badgeProofs, memberProofs };
}

/**
 * @param {Sql} sourceSql
 * @param {SqlHandle} targetSql
 * @param {string} fingerprint
 * @param {string | null} [expectedRunId]
 * @param {boolean} [updateEvidence]
 */
async function verifyState(sourceSql, targetSql, fingerprint, expectedRunId = null, updateEvidence = true) {
  const { source, plan, state, desired } = await planState(sourceSql, targetSql, fingerprint);
  if (plan.some((item) => !item.mapped)) refuse('missing-target-mapping', 'A source badge is not mapped.');
  const planByLegacy = new Map(plan.map((item) => [item.row.legacyId, item]));
  for (const item of plan) {
    const target = await readTargetBadge(targetSql, item.targetId);
    if (!targetBadgeMatches(item, target, planByLegacy)) {
      refuse('badge-reconciliation-failed', 'A canonical badge differs from its source projection.');
    }
    if (!target) refuse('missing-target-badge', 'A canonical badge disappeared during verification.');
    if (
      item.row.targetId !== item.targetId ||
      item.row.authorityRevision !== 0 ||
      item.row.authorityContentHash !== canonicalBadgeHash(target)
    ) {
      refuse('source-projection-incomplete', 'A controller badge proof differs from canonical state.');
    }
  }
  const targetMembers = await assertTargetMembers(targetSql, source, desired, false);
  for (const member of source.members) {
    const target = targetMembers.get(member.targetId);
    if (!target) refuse('missing-target-membership', 'A canonical membership disappeared during verification.');
    if (member.authorityContentHash !== canonicalMembershipContentHash(target)) {
      refuse('membership-projection-incomplete', 'A controller membership proof omits canonical badge assignments.');
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
    runs[0].sourceCounts.badges !== state.counts.badges ||
    runs[0].sourceCounts.assignments !== state.counts.assignments
  ) {
    refuse('source-changed-since-target-commit', 'The source snapshot differs from the committed badge run.');
  }
  const targetBadgeHashes = [];
  for (const item of plan) {
    const target = await readTargetBadge(targetSql, item.targetId);
    if (!target) refuse('missing-target-badge', 'A canonical badge is missing during verification.');
    targetBadgeHashes.push(canonicalBadgeHash(target));
  }
  const targetDigest = digest({
    badges: targetBadgeHashes,
    assignments: [...desired.entries()]
  });
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
      const mappings = await readMappings(tx, fingerprint);
      const plan = resolveBadgePlan(initial.source.badges, mappings, () => randomUUID());
      const planByLegacy = new Map(plan.map((item) => [item.row.legacyId, item]));
      const desired = desiredAssignments(initial.source, plan);
      await assertDependencyLedgers(tx, fingerprint, initial.source);
      await assertTargetMembers(tx, initial.source, desired, mappings.length === 0, true);
      if (mappings.length === 0) {
        for (const item of plan) {
          const collision =
            await tx`SELECT EXISTS(SELECT 1 FROM enterprise_badges WHERE id = ${item.targetId}::uuid) AS found`;
          if (collision[0].found) refuse('target-id-collision', 'An allocated badge id already exists.');
          await tx`
            INSERT INTO enterprise_badges
              (id, enterprise_id, revision, label, text_color, background_color, emoji, image_data_url,
               dark_theme_badge_id, auto_assign_roles, created_at, updated_at)
            VALUES (${item.targetId}::uuid, ${item.row.enterpriseId}::uuid, 0, ${item.row.label},
                    ${item.row.textColor}, ${item.row.backgroundColor}, ${item.row.emoji},
                    ${item.row.imageDataUrl}, NULL, ${item.row.autoAssignRoles},
                    ${item.row.createdAt}, ${item.row.createdAt})
          `;
        }
        for (const item of plan) {
          const darkTarget = item.row.darkThemeLegacyId ? planByLegacy.get(item.row.darkThemeLegacyId)?.targetId : null;
          if (darkTarget) {
            await tx`UPDATE enterprise_badges SET dark_theme_badge_id = ${darkTarget}::uuid
                       WHERE id = ${item.targetId}::uuid`;
          }
          await tx`
            INSERT INTO legacy_entity_mappings
              (source_system, source_fingerprint, entity_type, legacy_id, target_id, run_id, source_digest)
            VALUES (${SOURCE_SYSTEM}, ${fingerprint}, ${ENTITY_TYPE}, ${item.row.legacyId},
                    ${item.targetId}::uuid, ${id}::uuid, ${item.sourceDigest})
          `;
        }
        const ownerByEnterprise = new Map();
        for (const member of initial.source.members) {
          if (member.badgeLegacyIds.length === 0) continue;
          let owner = ownerByEnterprise.get(member.enterpriseId);
          if (!owner) {
            const owners = await tx`
              SELECT user_id::text AS id FROM enterprise_memberships
               WHERE enterprise_id = ${member.enterpriseId}::uuid AND role = 'owner'
            `;
            if (owners.length !== 1) refuse('missing-target-owner', 'A canonical enterprise owner is missing.');
            owner = owners[0].id;
            ownerByEnterprise.set(member.enterpriseId, owner);
          }
          for (const badgeId of desired.get(member.targetId) ?? []) {
            await tx`
              INSERT INTO room_member_badges
                (enterprise_id, room_id, member_id, badge_id, assigned_by_user_id, assigned_at)
              VALUES (${member.enterpriseId}::uuid, ${member.roomId}::uuid, ${member.targetId}::uuid,
                      ${badgeId}::uuid, ${owner}::uuid, ${initial.source.badges[0]?.createdAt ?? new Date().toISOString()})
            `;
          }
        }
      } else {
        for (const item of plan) {
          const target = await readTargetBadge(tx, item.targetId, true);
          if (!targetBadgeMatches(item, target, planByLegacy)) {
            refuse('target-changed-during-resume', 'Canonical badge state changed after target commit.');
          }
          await tx`
            UPDATE legacy_entity_mappings SET run_id = ${id}::uuid, verified_at = NULL
             WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
               AND entity_type = ${ENTITY_TYPE} AND legacy_id = ${item.row.legacyId}
               AND target_id = ${item.targetId}::uuid AND source_digest = ${item.sourceDigest}
          `;
        }
      }
      await assertTargetMembers(tx, initial.source, desired, false, true);
      await tx`
        UPDATE legacy_cutover_runs SET status = 'target-committed', target_committed_at = now(),
               target_counts = ${tx.json(initial.state.counts)} WHERE id = ${id}::uuid
      `;
      return id;
    });

    const mappings = await readMappings(targetSql, fingerprint);
    const committedPlan = resolveBadgePlan(initial.source.badges, mappings, () => randomUUID());
    const projection = await projectionFor(targetSql, initial.source, committedPlan);
    await sourceSql.begin('isolation level serializable', async (/** @type {TransactionSql} */ tx) => {
      if (snapshot(await readSource(tx)).digest !== initial.state.digest) {
        refuse('source-projection-race', 'Badge source state changed during conversion.');
      }
      for (const item of committedPlan) {
        const updated = await tx`
          UPDATE badges SET authority_badge_id = ${item.targetId}::uuid, authority_revision = 0,
                 authority_content_hash = ${projection.badgeProofs.get(item.row.legacyId)},
                 authority_reconciled_at = now()
           WHERE id = ${item.row.legacyId}::integer
             AND (authority_badge_id IS NULL OR authority_badge_id = ${item.targetId}::uuid)
          RETURNING id
        `;
        if (updated.length !== 1) refuse('source-projection-race', 'A badge proof changed concurrently.');
      }
      for (const member of initial.source.members) {
        const updated = await tx`
          UPDATE room_users SET authority_content_hash = ${projection.memberProofs.get(member.legacyId)},
                 authority_reconciled_at = now()
           WHERE id = ${member.legacyId}::integer AND authority_member_id = ${member.targetId}::uuid
             AND authority_revision = 0
          RETURNING id
        `;
        if (updated.length !== 1) refuse('source-projection-race', 'A membership proof changed concurrently.');
      }
    });
    return verifyState(sourceSql, targetSql, fingerprint, runId);
  } finally {
    if (targetLocked) await targetSql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
    await sourceSql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
  }
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function rollbackCommand(sourceSql, targetSql, fingerprint) {
  await sourceSql`SELECT pg_advisory_lock(${LOCK_KEY})`;
  let targetLocked = false;
  try {
    await targetSql`SELECT pg_advisory_lock(${LOCK_KEY})`;
    targetLocked = true;
    const source = await readSource(sourceSql);
    const mappings = await readMappings(targetSql, fingerprint);
    const latest = await targetSql`
      SELECT status FROM legacy_cutover_runs WHERE source_system = ${SOURCE_SYSTEM}
       AND source_fingerprint = ${fingerprint} AND scope = ${SCOPE} ORDER BY started_at DESC LIMIT 1
    `;
    if (latest[0]?.status === 'rolled-back') {
      if (
        mappings.length !== 0 ||
        source.badges.some(
          (badge) => badge.targetId !== null || badge.authorityRevision !== null || badge.authorityContentHash !== null
        )
      ) {
        refuse('rollback-state-disagreement', 'A completed badge rollback still has ownership residue.');
      }
      return { status: 'rolled-back', counts: snapshot(source).counts };
    }
    const plan = resolveBadgePlan(source.badges, mappings, () => randomUUID());
    if (plan.some((item) => !item.mapped)) refuse('missing-target-mapping', 'A source badge is not mapped.');
    const desired = desiredAssignments(source, plan);
    const planByLegacy = new Map(plan.map((item) => [item.row.legacyId, item]));
    /** @type {string[]} */
    const targetBadges = [];
    for (const item of plan) {
      const target = await readTargetBadge(targetSql, item.targetId);
      if (!targetBadgeMatches(item, target, planByLegacy)) {
        refuse('rollback-after-use', 'A canonical badge changed after conversion; rollback is refused.');
      }
      targetBadges.push(item.targetId);
    }
    const memberStates = await assertTargetMembers(targetSql, source, desired, false);
    const used = await targetSql`
      SELECT
        EXISTS(SELECT 1 FROM badge_mutations WHERE enterprise_id = ANY(${[...new Set(source.badges.map((badge) => badge.enterpriseId))]}::uuid[])) AS mutations,
        EXISTS(SELECT 1 FROM messages AS message, jsonb_array_elements_text(message.badges) AS item(value)
                WHERE item.value = ANY(${targetBadges}::text[])) AS messages,
        EXISTS(SELECT 1 FROM enterprise_badges WHERE dark_theme_badge_id = ANY(${targetBadges}::uuid[])
                AND id <> ALL(${targetBadges}::uuid[])) AS "externalReferences"
    `;
    if (used[0].mutations || used[0].messages || used[0].externalReferences) {
      refuse('rollback-after-use', 'Canonical badge authority has dependent activity; rollback is refused.');
    }
    /** @type {Map<string, string>} */
    const emptyMemberHashes = new Map();
    for (const member of source.members) {
      const target = memberStates.get(member.targetId);
      if (!target) refuse('missing-target-membership', 'A canonical membership disappeared during rollback.');
      emptyMemberHashes.set(member.legacyId, canonicalMembershipContentHash({ ...target, badges: [] }));
    }
    await sourceSql.begin('isolation level serializable', async (/** @type {TransactionSql} */ tx) => {
      for (const item of plan) {
        const cleared = await tx`
          UPDATE badges SET authority_badge_id = NULL, authority_revision = NULL,
                 authority_content_hash = NULL, authority_reconciled_at = NULL
           WHERE id = ${item.row.legacyId}::integer
             AND (authority_badge_id IS NULL OR authority_badge_id = ${item.targetId}::uuid)
          RETURNING id
        `;
        if (cleared.length !== 1) refuse('source-projection-race', 'A badge proof changed during rollback.');
      }
      for (const member of source.members) {
        const updated = await tx`
          UPDATE room_users SET authority_content_hash = ${emptyMemberHashes.get(member.legacyId)},
                 authority_reconciled_at = now()
           WHERE id = ${member.legacyId}::integer AND authority_member_id = ${member.targetId}::uuid
             AND authority_revision = 0
          RETURNING id
        `;
        if (updated.length !== 1) refuse('source-projection-race', 'A membership proof changed during rollback.');
      }
    });
    await targetSql.begin('isolation level serializable', async (/** @type {TransactionSql} */ tx) => {
      await tx`DELETE FROM room_member_badges WHERE badge_id = ANY(${targetBadges}::uuid[])`;
      await tx`UPDATE enterprise_badges SET dark_theme_badge_id = NULL WHERE id = ANY(${targetBadges}::uuid[])`;
      const deleted = await tx`DELETE FROM enterprise_badges WHERE id = ANY(${targetBadges}::uuid[]) RETURNING id`;
      if (deleted.length !== targetBadges.length)
        refuse('target-badge-race', 'Canonical badges changed during rollback.');
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
    return { status: 'rolled-back', counts: snapshot(source).counts };
  } finally {
    if (targetLocked) await targetSql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
    await sourceSql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
  }
}

/** @param {string | undefined} label */
function sourceFingerprint(label) {
  const normalized = String(label ?? '').trim();
  if (normalized.length < 8 || normalized.length > 128) {
    refuse('invalid-source-label', 'CUTOVER_SOURCE_LABEL must contain 8 to 128 characters.');
  }
  return createHash('sha256').update(normalized).digest('hex');
}

/** @param {BadgeCutoverInput} input */
export async function runBadgeCutover({ command, sourceUrl, targetUrl, sourceLabel }) {
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
    await sourceSql.end({ timeout: 2 }).catch(() => undefined);
    await targetSql.end({ timeout: 2 }).catch(() => undefined);
  }
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) {
  try {
    const result = await runBadgeCutover({
      command: process.argv[2],
      sourceUrl: process.env.CUTOVER_SOURCE_DATABASE_URL,
      targetUrl: process.env.CUTOVER_TARGET_DATABASE_URL ?? process.env.MIGRATE_DATABASE_URL,
      sourceLabel: process.env.CUTOVER_SOURCE_LABEL
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    const code = error instanceof BadgeCutoverRefusal ? error.code : 'unexpected';
    process.stderr.write(`[cutover:badges] ${code}: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
