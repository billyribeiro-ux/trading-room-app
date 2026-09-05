#!/usr/bin/env node

/**
 * Gate 3 room conversion from the transitional controller PostgreSQL store to Rust authority.
 *
 * Profile conversion is a prerequisite. Target rows and the owner-only target ledger commit
 * before source mappings, making the unavoidable cross-database failure window resumable. Output
 * contains only counts, digests, status, and run id; room names and database URLs are never logged.
 */

import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import postgres from 'postgres';

/** @typedef {import('postgres').Sql} Sql */
/** @typedef {import('postgres').TransactionSql} TransactionSql */
/** @typedef {Sql | TransactionSql} SqlHandle */
/**
 * @typedef {object} SourceRoom
 * @property {string} legacyId
 * @property {string} legacyAccountId
 * @property {string | null} targetId
 * @property {string} enterpriseId
 * @property {string} ownerUserId
 * @property {string} shortCode
 * @property {string} name
 * @property {'open' | 'closed' | 'locked'} state
 * @property {number} maxCapacity
 * @property {string | null} archivedAt
 * @property {string} createdAt
 */
/**
 * @typedef {object} MappingRow
 * @property {string} legacyId
 * @property {string} targetId
 * @property {string} sourceDigest
 */
/**
 * @typedef {object} ResolvedRoomMapping
 * @property {string} legacyId
 * @property {string} targetId
 * @property {string} sourceDigest
 * @property {string | undefined} ledgerSourceDigest
 * @property {boolean} sourceWasMapped
 * @property {boolean} ledgerWasMapped
 */
/** @typedef {{ row: SourceRoom; mapping: ResolvedRoomMapping }} RoomPlanItem */
/** @typedef {{ counts: { rooms: number }; digest: string }} SourceSnapshot */
/**
 * @typedef {object} RoomCutoverInput
 * @property {string | undefined} command
 * @property {string | undefined} sourceUrl
 * @property {string | undefined} targetUrl
 * @property {string | undefined} sourceLabel
 */

const SOURCE_SYSTEM = 'controller-postgres';
const SCOPE = 'rooms';
const LOCK_KEY = 0x4355_5434; // CUT4: distinct from the profile converter.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const COMMANDS = new Set(['plan', 'apply', 'verify', 'rollback']);

export class RoomCutoverRefusal extends Error {
  /** @param {string} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.name = 'RoomCutoverRefusal';
    this.code = code;
  }
}

/** @param {string} code @param {string} message @returns {never} */
function refuse(code, message) {
  throw new RoomCutoverRefusal(code, message);
}

/** @param {string} value */
function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

/** @param {unknown} value */
function digest(value) {
  return sha256(JSON.stringify(value) ?? 'undefined');
}

/** @param {unknown} value */
function iso(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (typeof value !== 'string' && typeof value !== 'number') refuse('invalid-timestamp', 'A timestamp is invalid.');
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) refuse('invalid-timestamp', 'A timestamp is invalid.');
  return parsed.toISOString();
}

/** @param {unknown} value */
function optionalIso(value) {
  return value == null ? null : iso(value);
}

/**
 * @overload
 * @param {unknown} value
 * @param {string} code
 * @param {true} nullable
 * @returns {string | null}
 */
/**
 * @overload
 * @param {unknown} value
 * @param {string} code
 * @param {false | undefined} [nullable]
 * @returns {string}
 */
/** @param {unknown} value @param {string} code @param {boolean} [nullable] */
function uuid(value, code, nullable = false) {
  if (nullable && value == null) return null;
  const parsed = String(value ?? '').toLowerCase();
  if (!UUID.test(parsed)) refuse(code, 'A required authority mapping is missing or invalid.');
  return parsed;
}

/** @param {string | undefined} label */
function sourceFingerprint(label) {
  const normalized = String(label ?? '').trim();
  if (normalized.length < 8 || normalized.length > 128) {
    refuse('invalid-source-label', 'CUTOVER_SOURCE_LABEL must contain 8 to 128 characters.');
  }
  return sha256(normalized);
}

/** @param {unknown} value @param {number} maxBytes @param {string} code */
function requiredText(value, maxBytes, code) {
  const text = String(value ?? '').trim();
  if (!text || Buffer.byteLength(text) > maxBytes) refuse(code, 'A required room field is invalid.');
  return text;
}

/** @param {Record<string, unknown>[]} rawRows @returns {SourceRoom[]} */
export function normalizeRoomRows(rawRows) {
  const rooms = rawRows.map((raw) => {
    const legacyId = String(raw.legacyId ?? '');
    const legacyAccountId = String(raw.legacyAccountId ?? '');
    if (!/^[1-9][0-9]*$/.test(legacyId) || !/^[1-9][0-9]*$/.test(legacyAccountId)) {
      refuse('invalid-legacy-id', 'A legacy room or account id is invalid.');
    }
    const state = String(raw.state);
    if (!['open', 'closed', 'locked'].includes(state)) refuse('invalid-room-state', 'A room state is unsupported.');
    const maxCapacity = Number(raw.maxCapacity);
    if (!Number.isSafeInteger(maxCapacity) || maxCapacity < 0 || maxCapacity > 1_000_000) {
      refuse('invalid-room-capacity', 'A room capacity is invalid.');
    }
    return {
      legacyId,
      legacyAccountId,
      targetId: uuid(raw.targetId, 'invalid-room-mapping', true),
      enterpriseId: uuid(raw.enterpriseId, 'missing-profile-enterprise-mapping'),
      ownerUserId: uuid(raw.ownerUserId, 'missing-profile-owner-mapping'),
      shortCode: requiredText(raw.shortCode, 128, 'invalid-room-short-code'),
      name: requiredText(raw.name, 160, 'invalid-room-name'),
      state: /** @type {'open' | 'closed' | 'locked'} */ (state),
      maxCapacity,
      archivedAt: optionalIso(raw.archivedAt),
      createdAt: iso(raw.createdAt)
    };
  });

  const legacyIds = new Set();
  const targetIds = new Set();
  const shortCodes = new Set();
  for (const room of rooms) {
    if (legacyIds.has(room.legacyId)) refuse('duplicate-room-id', 'The source contains duplicate room ids.');
    legacyIds.add(room.legacyId);
    if (room.targetId && targetIds.has(room.targetId)) {
      refuse('duplicate-target-id', 'Two source rooms claim one canonical room.');
    }
    if (room.targetId) targetIds.add(room.targetId);
    if (shortCodes.has(room.shortCode)) refuse('duplicate-short-code', 'The source contains duplicate room codes.');
    shortCodes.add(room.shortCode);
  }
  rooms.sort((a, b) => (BigInt(a.legacyId) < BigInt(b.legacyId) ? -1 : 1));
  return rooms;
}

/** @param {SqlHandle} sql @returns {Promise<SourceRoom[]>} */
async function readSource(sql) {
  const rows = /** @type {Record<string, unknown>[]} */ (
    await sql`
    SELECT room.id::text AS "legacyId", room.account_id::text AS "legacyAccountId",
           room.authority_room_id::text AS "targetId",
           account.authority_enterprise_id::text AS "enterpriseId",
           owner.authority_user_id::text AS "ownerUserId", room.short_code AS "shortCode",
           room.name, room.state, room.max_users AS "maxCapacity", room.archived_at AS "archivedAt",
           room.created_at AS "createdAt"
      FROM rooms AS room
      INNER JOIN accounts AS account ON account.id = room.account_id
      INNER JOIN users AS owner
        ON owner.account_id = account.id
       AND lower(owner.email) = lower(account.owner_email)
       AND owner.password_hash IS NOT NULL
     WHERE account.authority_enterprise_id IS NOT NULL
       AND account.authority_reconciled_at IS NOT NULL
       AND owner.authority_user_id IS NOT NULL
       AND owner.authority_reconciled_at IS NOT NULL
     ORDER BY room.id
  `
  );
  const normalized = normalizeRoomRows(rows);
  const totalRows = await sql`SELECT count(*)::integer AS count FROM rooms`;
  if (normalized.length !== totalRows[0].count) {
    refuse('profile-conversion-incomplete', 'Every room requires one reconciled account and owner mapping.');
  }
  return normalized;
}

/** @param {SourceRoom} room */
function sourceRecordDigest(room) {
  return digest({
    legacyId: room.legacyId,
    legacyAccountId: room.legacyAccountId,
    enterpriseId: room.enterpriseId,
    ownerUserId: room.ownerUserId,
    shortCode: room.shortCode,
    name: room.name,
    state: room.state,
    maxCapacity: room.maxCapacity,
    archivedAt: room.archivedAt,
    createdAt: room.createdAt
  });
}

/** @param {SourceRoom[]} rooms @returns {SourceSnapshot} */
function snapshot(rooms) {
  return {
    counts: { rooms: rooms.length },
    digest: digest(rooms.map(sourceRecordDigest))
  };
}

/** @param {SqlHandle} sql @param {string} fingerprint @returns {Promise<MappingRow[]>} */
async function readMappings(sql, fingerprint) {
  return /** @type {MappingRow[]} */ (
    await sql`
    SELECT legacy_id AS "legacyId", target_id::text AS "targetId", source_digest AS "sourceDigest"
      FROM legacy_entity_mappings
     WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
       AND entity_type = 'room'
     ORDER BY legacy_id
  `
  );
}

/**
 * @param {SourceRoom[]} rooms
 * @param {MappingRow[]} mappings
 * @param {() => string} [allocate]
 * @returns {RoomPlanItem[]}
 */
export function resolveRoomPlan(rooms, mappings, allocate = () => randomUUID()) {
  const byLegacy = new Map(mappings.map((mapping) => [String(mapping.legacyId), mapping]));
  if (byLegacy.size !== mappings.length) {
    refuse('duplicate-ledger-mapping', 'The target ledger contains duplicate source room mappings.');
  }
  const sourceLegacyIds = new Set(rooms.map((room) => room.legacyId));
  if (mappings.some((mapping) => !sourceLegacyIds.has(String(mapping.legacyId)))) {
    refuse('extra-target-mapping', 'The target has a room absent from the source.');
  }
  const used = new Set();
  return rooms.map((room) => {
    const ledger = byLegacy.get(room.legacyId);
    const ledgerId = ledger ? uuid(ledger.targetId, 'invalid-ledger-room-id') : null;
    if (room.targetId && ledgerId && room.targetId !== ledgerId) {
      refuse('mapping-disagreement', 'Source and target room mappings disagree.');
    }
    const sourceDigest = sourceRecordDigest(room);
    if (ledger && !SHA256.test(ledger.sourceDigest)) {
      refuse('invalid-ledger-source-digest', 'A target room mapping has an invalid source digest.');
    }
    if (ledger && ledger.sourceDigest !== sourceDigest) {
      refuse('source-changed-since-target-commit', 'A source room changed after target commit.');
    }
    const targetId = room.targetId ?? ledgerId ?? uuid(allocate(), 'invalid-generated-room-id');
    if (used.has(targetId)) refuse('duplicate-target-id', 'Two source rooms resolve to one canonical room.');
    used.add(targetId);
    return {
      row: room,
      mapping: {
        legacyId: room.legacyId,
        targetId,
        sourceDigest,
        ledgerSourceDigest: ledger?.sourceDigest,
        sourceWasMapped: room.targetId !== null,
        ledgerWasMapped: ledger !== undefined
      }
    };
  });
}

/**
 * @param {SqlHandle} sql
 * @param {SourceRoom} row
 * @param {ResolvedRoomMapping} mapping
 * @returns {Promise<boolean>}
 */
async function validateExistingTarget(sql, row, mapping) {
  const target = await sql`
    SELECT enterprise_id::text AS "enterpriseId", owner_id::text AS "ownerUserId",
           uuid_short AS "shortCode", name, state, max_capacity AS "maxCapacity",
           archived_at AS "archivedAt", creation_request_id AS "creationRequestId",
           created_at AS "createdAt"
      FROM rooms WHERE id = ${mapping.targetId}::uuid
  `;
  if (target.length === 0) return false;
  const actual = target[0];
  if (
    target.length !== 1 ||
    actual.enterpriseId !== row.enterpriseId ||
    actual.ownerUserId !== row.ownerUserId ||
    actual.shortCode !== row.shortCode ||
    actual.name !== row.name ||
    actual.state !== row.state ||
    actual.maxCapacity !== row.maxCapacity ||
    optionalIso(actual.archivedAt) !== row.archivedAt ||
    actual.creationRequestId !== null ||
    iso(actual.createdAt) !== row.createdAt
  ) {
    refuse('room-reconciliation-failed', 'A mapped canonical room differs from its source.');
  }
  const owner = await sql`
    SELECT count(*)::integer AS count FROM room_members
     WHERE enterprise_id = ${row.enterpriseId}::uuid AND room_id = ${mapping.targetId}::uuid
       AND user_id = ${row.ownerUserId}::uuid AND role = 'owner'
  `;
  const state = await sql`
    SELECT count(*)::integer AS count FROM room_state
     WHERE enterprise_id = ${row.enterpriseId}::uuid AND room_id = ${mapping.targetId}::uuid
  `;
  if (owner[0].count !== 1 || state[0].count !== 1) {
    refuse('room-foundation-incomplete', 'A room is missing its canonical owner or state row.');
  }
  return true;
}

/** @param {SqlHandle} sql @param {RoomPlanItem[]} plan @returns {Promise<Set<string>>} */
async function ensureNoTargetCollisions(sql, plan) {
  const existingTargets = new Set();
  for (const { row, mapping } of plan) {
    if (mapping.sourceWasMapped && !mapping.ledgerWasMapped) {
      refuse('unproven-source-mapping', 'A source room mapping has no target ownership ledger.');
    }
    const existing = await sql`
      SELECT EXISTS (SELECT 1 FROM rooms WHERE id = ${mapping.targetId}::uuid) AS found
    `;
    const targetExists = existing[0].found;
    if (targetExists && !mapping.ledgerWasMapped) {
      refuse('unproven-existing-target', 'A planned room id collides with an unowned target room.');
    }
    if (targetExists) {
      await validateExistingTarget(sql, row, mapping);
      existingTargets.add(mapping.targetId);
    }
    const collision = await sql`
      SELECT id::text AS id FROM rooms
       WHERE enterprise_id = ${row.enterpriseId}::uuid AND uuid_short = ${row.shortCode}
         AND id <> ${mapping.targetId}::uuid
       LIMIT 1
    `;
    if (collision.length) refuse('target-short-code-collision', 'A canonical room code is already in use.');
  }
  return existingTargets;
}

/** @param {SqlHandle} sql @param {string} fingerprint */
async function activeRun(sql, fingerprint) {
  const rows = await sql`
    SELECT id::text AS id, status, source_digest AS "sourceDigest", source_counts AS "sourceCounts"
      FROM legacy_cutover_runs
     WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
       AND scope = ${SCOPE} AND status IN ('running', 'target-committed')
     ORDER BY started_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

/** @param {SqlHandle} sql @param {string} fingerprint @param {SourceSnapshot} sourceSnapshot */
async function beginOrResume(sql, fingerprint, sourceSnapshot) {
  const active = await activeRun(sql, fingerprint);
  if (active) {
    if (active.sourceDigest !== sourceSnapshot.digest || active.sourceCounts.rooms !== sourceSnapshot.counts.rooms) {
      refuse('source-changed-during-resume', 'The source changed after an unfinished target commit.');
    }
    return active.id;
  }
  const inserted = await sql`
    INSERT INTO legacy_cutover_runs
      (source_system, source_fingerprint, scope, status, source_counts, target_counts, source_digest)
    VALUES (${SOURCE_SYSTEM}, ${fingerprint}, ${SCOPE}, 'running', ${sql.json(sourceSnapshot.counts)},
            '{}'::jsonb, ${sourceSnapshot.digest})
    RETURNING id::text AS id
  `;
  return inserted[0].id;
}

/**
 * @param {SqlHandle} sql
 * @param {string} fingerprint
 * @param {RoomPlanItem[]} plan
 * @param {SourceSnapshot} sourceSnapshot
 */
async function applyTarget(sql, fingerprint, plan, sourceSnapshot) {
  const runId = await beginOrResume(sql, fingerprint, sourceSnapshot);
  const existingTargets = await ensureNoTargetCollisions(sql, plan);
  for (const { row, mapping } of plan) {
    if (!existingTargets.has(mapping.targetId)) {
      await sql`
        INSERT INTO rooms
          (id, enterprise_id, owner_id, uuid_short, name, state, max_capacity, config,
           archived_at, creation_request_id, created_at, updated_at)
        VALUES (${mapping.targetId}::uuid, ${row.enterpriseId}::uuid, ${row.ownerUserId}::uuid,
                ${row.shortCode}, ${row.name}, ${row.state}, ${row.maxCapacity},
                '{"access":{"tiers":[]}}'::jsonb, ${row.archivedAt}, NULL, ${row.createdAt}, now())
      `;
      const owner = await sql`
        INSERT INTO room_members
          (enterprise_id, room_id, user_id, role, display_name, joined_at, created_at, updated_at)
        SELECT ${row.enterpriseId}::uuid, ${mapping.targetId}::uuid, user_row.id, 'owner',
               user_row.display_name, ${row.createdAt}, ${row.createdAt}, ${row.createdAt}
          FROM users AS user_row WHERE user_row.id = ${row.ownerUserId}::uuid
        RETURNING id
      `;
      if (owner.length !== 1) refuse('missing-target-owner', 'The canonical owner user is missing.');
      await sql`
        INSERT INTO room_state (enterprise_id, room_id, created_at, updated_at)
        VALUES (${row.enterpriseId}::uuid, ${mapping.targetId}::uuid, ${row.createdAt}, ${row.createdAt})
      `;
    }
    if (mapping.ledgerWasMapped) {
      const updated = await sql`
        UPDATE legacy_entity_mappings SET run_id = ${runId}::uuid, verified_at = NULL
         WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
           AND entity_type = 'room' AND legacy_id = ${row.legacyId}
           AND target_id = ${mapping.targetId}::uuid AND source_digest = ${mapping.sourceDigest}
        RETURNING legacy_id
      `;
      if (updated.length !== 1) refuse('target-ledger-race', 'A target room mapping changed concurrently.');
    } else {
      await sql`
        INSERT INTO legacy_entity_mappings
          (source_system, source_fingerprint, entity_type, legacy_id, target_id, run_id, source_digest)
        VALUES (${SOURCE_SYSTEM}, ${fingerprint}, 'room', ${row.legacyId}, ${mapping.targetId}::uuid,
                ${runId}::uuid, ${mapping.sourceDigest})
      `;
    }
  }
  await sql`
    UPDATE legacy_cutover_runs
       SET status = 'target-committed', target_committed_at = now(),
           target_counts = ${sql.json(sourceSnapshot.counts)}
     WHERE id = ${runId}::uuid
  `;
  return runId;
}

/** @param {SqlHandle} sql @param {RoomPlanItem[]} plan */
async function applySourceMappings(sql, plan) {
  for (const { row, mapping } of plan) {
    const changed = await sql`
      UPDATE rooms SET authority_room_id = ${mapping.targetId}::uuid, authority_reconciled_at = now()
       WHERE id = ${row.legacyId}::integer
         AND (authority_room_id IS NULL OR authority_room_id = ${mapping.targetId}::uuid)
      RETURNING id
    `;
    if (changed.length !== 1) refuse('source-room-mapping-race', 'A source room mapping changed concurrently.');
  }
}

/** @param {RoomPlanItem[]} plan */
function canonicalDigest(plan) {
  return digest(
    plan.map(({ row, mapping }) => ({
      targetId: mapping.targetId,
      enterpriseId: row.enterpriseId,
      ownerUserId: row.ownerUserId,
      shortCode: row.shortCode,
      name: row.name,
      state: row.state,
      maxCapacity: row.maxCapacity,
      archivedAt: row.archivedAt,
      createdAt: row.createdAt
    }))
  );
}

/**
 * @param {Sql} sourceSql
 * @param {SqlHandle} targetSql
 * @param {string} fingerprint
 * @param {{ expectedRunId?: string | null; allowClearedSourceLinks?: boolean; updateEvidence?: boolean }} [options]
 */
async function verifyState(sourceSql, targetSql, fingerprint, options = {}) {
  const { expectedRunId = null, allowClearedSourceLinks = false, updateEvidence = true } = options;
  const rooms = await readSource(sourceSql);
  const sourceSnapshot = snapshot(rooms);
  const mappings = await readMappings(targetSql, fingerprint);
  const plan = resolveRoomPlan(rooms, mappings, () => refuse('missing-target-mapping', 'A source room is not mapped.'));

  for (const { row, mapping } of plan) {
    if (row.targetId !== mapping.targetId && !(allowClearedSourceLinks && row.targetId === null)) {
      refuse('source-room-not-linked', 'A source room mapping is missing.');
    }
    if (mapping.ledgerSourceDigest !== mapping.sourceDigest) {
      refuse('source-changed-since-target-commit', 'A source room changed after target commit.');
    }
    if (!(await validateExistingTarget(targetSql, row, mapping))) {
      refuse('missing-target-room', 'A mapped canonical room is missing.');
    }
  }

  const runs = expectedRunId
    ? await targetSql`
        SELECT id::text AS id, source_digest AS "sourceDigest", source_counts AS "sourceCounts"
          FROM legacy_cutover_runs WHERE id = ${expectedRunId}::uuid
      `
    : await targetSql`
        SELECT id::text AS id, source_digest AS "sourceDigest", source_counts AS "sourceCounts"
          FROM legacy_cutover_runs
         WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
           AND scope = ${SCOPE} AND status IN ('running', 'target-committed', 'verified')
         ORDER BY started_at DESC LIMIT 1
      `;
  if (
    runs.length !== 1 ||
    runs[0].sourceDigest !== sourceSnapshot.digest ||
    runs[0].sourceCounts.rooms !== sourceSnapshot.counts.rooms
  ) {
    refuse('source-changed-since-target-commit', 'The source snapshot differs from the committed run.');
  }
  const targetDigest = canonicalDigest(plan);
  if (updateEvidence) {
    await targetSql`
      UPDATE legacy_entity_mappings SET verified_at = now()
       WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint} AND entity_type = 'room'
    `;
    await targetSql`
      UPDATE legacy_cutover_runs
         SET status = 'verified', verified_at = now(), source_counts = ${targetSql.json(sourceSnapshot.counts)},
             target_counts = ${targetSql.json(sourceSnapshot.counts)}, source_digest = ${sourceSnapshot.digest},
             target_digest = ${targetDigest}, failure_code = NULL
       WHERE id = ${runs[0].id}::uuid
    `;
  }
  return {
    runId: runs[0].id,
    status: 'verified',
    counts: sourceSnapshot.counts,
    sourceDigest: sourceSnapshot.digest,
    targetDigest
  };
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function planCommand(sourceSql, targetSql, fingerprint) {
  const rooms = await sourceSql.begin('read only, isolation level repeatable read', readSource);
  const mappings = await readMappings(targetSql, fingerprint);
  const serial = { value: 0 };
  const plan = resolveRoomPlan(
    rooms,
    mappings,
    () => `00000000-0000-8000-8000-${String(++serial.value).padStart(12, '0')}`
  );
  await ensureNoTargetCollisions(targetSql, plan);
  const sourceSnapshot = snapshot(rooms);
  return {
    status: 'planned',
    counts: sourceSnapshot.counts,
    sourceDigest: sourceSnapshot.digest,
    unmapped: plan.filter(({ mapping }) => !mapping.sourceWasMapped && !mapping.ledgerWasMapped).length
  };
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function applyCommand(sourceSql, targetSql, fingerprint) {
  /** @type {string | null} */
  let runId = null;
  await sourceSql.begin('isolation level repeatable read', async (sourceTx) => {
    await sourceTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    const rooms = await readSource(sourceTx);
    const sourceSnapshot = snapshot(rooms);
    await targetSql.begin('isolation level serializable', async (targetTx) => {
      await targetTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
      const mappings = await readMappings(targetTx, fingerprint);
      runId = await applyTarget(targetTx, fingerprint, resolveRoomPlan(rooms, mappings), sourceSnapshot);
    });
    const committedMappings = await readMappings(targetSql, fingerprint);
    const committedPlan = resolveRoomPlan(rooms, committedMappings, () =>
      refuse('target-commit-incomplete', 'The target commit did not persist every room mapping.')
    );
    await applySourceMappings(sourceTx, committedPlan);
  });
  if (runId === null) refuse('target-commit-incomplete', 'The target transaction returned no run id.');
  return targetSql.begin('isolation level serializable', async (targetTx) => {
    await targetTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    return verifyState(sourceSql, targetTx, fingerprint, { expectedRunId: runId });
  });
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function verifyCommand(sourceSql, targetSql, fingerprint) {
  return targetSql.begin('isolation level serializable', async (targetTx) => {
    await targetTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    return verifyState(sourceSql, targetTx, fingerprint);
  });
}

/** @param {SqlHandle} targetSql @param {RoomPlanItem[]} plan */
async function assertRollbackSafe(targetSql, plan) {
  const references = /** @type {{ tableName: string; columnName: string }[]} */ (
    await targetSql`
    SELECT source.relname AS "tableName", source_attribute.attname AS "columnName"
      FROM pg_catalog.pg_constraint AS constraint_row
      INNER JOIN pg_catalog.pg_class AS source ON source.oid = constraint_row.conrelid
      INNER JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = source.relnamespace
      CROSS JOIN LATERAL unnest(constraint_row.conkey, constraint_row.confkey)
        AS key_pair(source_number, target_number)
      INNER JOIN pg_catalog.pg_attribute AS source_attribute
        ON source_attribute.attrelid = source.oid AND source_attribute.attnum = key_pair.source_number
      INNER JOIN pg_catalog.pg_attribute AS target_attribute
        ON target_attribute.attrelid = constraint_row.confrelid
       AND target_attribute.attnum = key_pair.target_number
     WHERE constraint_row.contype = 'f' AND constraint_row.confrelid = 'public.rooms'::regclass
       AND namespace.nspname = 'public' AND target_attribute.attname = 'id'
     ORDER BY source.relname, source_attribute.attname
  `
  );
  for (const { row, mapping } of plan) {
    for (const { tableName, columnName } of references) {
      const count = await targetSql`
        SELECT count(*)::integer AS count FROM ${targetSql(tableName)}
         WHERE ${targetSql(columnName)} = ${mapping.targetId}::uuid
      `;
      const expected = tableName === 'room_members' || tableName === 'room_state' ? 1 : 0;
      if (count[0].count !== expected) {
        refuse('rollback-after-use', 'Rollback refused because a canonical room has dependent activity.');
      }
    }
    const owner = await targetSql`
      SELECT role, user_id::text AS "userId", revision::bigint AS revision, badges,
             can_publish_mic AS "canPublishMic", can_publish_screen AS "canPublishScreen",
             can_publish_cam AS "canPublishCam", can_use_admin_chat AS "canUseAdminChat",
             can_edit_notes AS "canEditNotes", can_access_files AS "canAccessFiles",
             can_access_archives AS "canAccessArchives", is_muted AS "isMuted",
             is_banned AS "isBanned", is_pm_restricted AS "isPmRestricted", is_trial AS "isTrial",
             hide_personal_info AS "hidePersonalInfo", hide_user_count AS "hideUserCount",
             is_paused AS "isPaused", admin_note AS "adminNote", approval_status AS "approvalStatus",
             has_mobile_app AS "hasMobileApp", last_seen_at AS "lastSeenAt", invited_at AS "invitedAt",
             joined_at AS "joinedAt", created_at AS "createdAt", updated_at AS "updatedAt"
        FROM room_members WHERE room_id = ${mapping.targetId}::uuid
    `;
    const state = await targetSql`
      SELECT roster_count AS "rosterCount", is_recording AS "isRecording",
             is_recording_paused AS "isRecordingPaused", recording_user_id AS "recordingUserId",
             media_playback AS "mediaPlayback", last_message_at AS "lastMessageAt",
             last_alert_at AS "lastAlertAt", global_mute_non_staff AS "globalMuteNonStaff",
             created_at AS "createdAt", updated_at AS "updatedAt"
        FROM room_state WHERE room_id = ${mapping.targetId}::uuid
    `;
    if (
      owner.length !== 1 ||
      owner[0].role !== 'owner' ||
      owner[0].userId !== row.ownerUserId ||
      Number(owner[0].revision) !== 0 ||
      JSON.stringify(owner[0].badges) !== '[]' ||
      owner[0].canPublishMic ||
      owner[0].canPublishScreen ||
      owner[0].canPublishCam ||
      owner[0].canUseAdminChat ||
      owner[0].canEditNotes ||
      owner[0].canAccessFiles ||
      !owner[0].canAccessArchives ||
      owner[0].isMuted ||
      owner[0].isBanned ||
      owner[0].isPmRestricted ||
      owner[0].isTrial ||
      owner[0].hidePersonalInfo ||
      owner[0].hideUserCount ||
      owner[0].isPaused ||
      owner[0].adminNote !== null ||
      owner[0].approvalStatus !== 'approved' ||
      owner[0].hasMobileApp ||
      owner[0].lastSeenAt !== null ||
      owner[0].invitedAt !== null ||
      iso(owner[0].joinedAt) !== row.createdAt ||
      iso(owner[0].createdAt) !== row.createdAt ||
      new Date(owner[0].updatedAt).getTime() < new Date(owner[0].createdAt).getTime() ||
      state.length !== 1 ||
      state[0].rosterCount !== 0 ||
      state[0].isRecording ||
      state[0].isRecordingPaused ||
      state[0].recordingUserId !== null ||
      JSON.stringify(state[0].mediaPlayback) !== '{}' ||
      state[0].lastMessageAt !== null ||
      state[0].lastAlertAt !== null ||
      state[0].globalMuteNonStaff ||
      iso(state[0].createdAt) !== row.createdAt ||
      iso(state[0].updatedAt) !== row.createdAt
    ) {
      refuse('rollback-after-use', 'Rollback refused because canonical room state changed.');
    }
  }
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function rollbackCommand(sourceSql, targetSql, fingerprint) {
  // Session locks span both database transactions. The source lock is always acquired first,
  // matching apply's source-then-target order and preventing a cross-database deadlock.
  await sourceSql`SELECT pg_advisory_lock(${LOCK_KEY})`;
  let targetLocked = false;
  try {
    await targetSql`SELECT pg_advisory_lock(${LOCK_KEY})`;
    targetLocked = true;
    const rooms = await readSource(sourceSql);
    const mappings = await readMappings(targetSql, fingerprint);
    const plan = resolveRoomPlan(rooms, mappings, () =>
      refuse('missing-target-mapping', 'A source room is not mapped.')
    );
    const latestRun = await targetSql`
      SELECT status FROM legacy_cutover_runs
       WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint} AND scope = ${SCOPE}
       ORDER BY started_at DESC LIMIT 1
    `;
    if (latestRun[0]?.status === 'rolled-back') {
      const targetCount = await targetSql`
        SELECT count(*)::integer AS count FROM rooms
         WHERE id = ANY(${plan.map(({ mapping }) => mapping.targetId)}::uuid[])
      `;
      if (rooms.every((room) => room.targetId === null) && targetCount[0].count === 0) {
        return { status: 'rolled-back', counts: snapshot(rooms).counts };
      }
      refuse('rollback-state-disagreement', 'A completed rollback still has source or target room residue.');
    }

    await targetSql.begin('isolation level serializable', async (targetTx) => {
      for (const { mapping } of plan) {
        const locked = await targetTx`
          SELECT id FROM rooms WHERE id = ${mapping.targetId}::uuid FOR UPDATE
        `;
        if (locked.length !== 1) refuse('missing-target-room', 'A mapped canonical room is missing.');
      }
      await verifyState(sourceSql, targetTx, fingerprint, {
        allowClearedSourceLinks: true,
        updateEvidence: false
      });
      await assertRollbackSafe(targetTx, plan);

      // Clear source pointers first. If the target commit later fails, the retained ledger makes
      // the next invocation reconstruct the plan and safely resume from this exact state.
      await sourceSql.begin('isolation level serializable', async (sourceTx) => {
        for (const { row, mapping } of plan) {
          const cleared = await sourceTx`
            UPDATE rooms SET authority_room_id = NULL, authority_reconciled_at = NULL
             WHERE id = ${row.legacyId}::integer
               AND (authority_room_id IS NULL OR authority_room_id = ${mapping.targetId}::uuid)
            RETURNING id
          `;
          if (cleared.length !== 1) {
            refuse('source-room-mapping-race', 'A source room mapping changed concurrently.');
          }
        }
      });

      for (const { mapping } of plan) {
        const deleted = await targetTx`
          DELETE FROM rooms WHERE id = ${mapping.targetId}::uuid RETURNING id
        `;
        if (deleted.length !== 1) refuse('target-room-race', 'A canonical room changed during rollback.');
      }
      await targetTx`
        UPDATE legacy_entity_mappings SET verified_at = NULL
         WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint} AND entity_type = 'room'
      `;
      await targetTx`
        UPDATE legacy_cutover_runs SET status = 'rolled-back', rolled_back_at = now()
         WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint} AND scope = ${SCOPE}
           AND status IN ('running', 'target-committed', 'verified')
      `;
    });
    return { status: 'rolled-back', counts: snapshot(rooms).counts };
  } finally {
    if (targetLocked) await targetSql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
    await sourceSql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
  }
}

/** @param {RoomCutoverInput} input */
export async function runRoomCutover({ command, sourceUrl, targetUrl, sourceLabel }) {
  if (typeof command !== 'string' || !COMMANDS.has(command)) {
    refuse('invalid-command', 'Expected plan, apply, verify, or rollback.');
  }
  if (!sourceUrl || !targetUrl) {
    refuse('missing-database-url', 'Both CUTOVER_SOURCE_DATABASE_URL and CUTOVER_TARGET_DATABASE_URL are required.');
  }
  if (sourceUrl === targetUrl) refuse('same-database-url', 'Source and target database URLs must differ.');
  const fingerprint = sourceFingerprint(sourceLabel);
  if (!SHA256.test(fingerprint)) refuse('invalid-source-fingerprint', 'Could not derive a source fingerprint.');
  const options = {
    max: 1,
    prepare: false,
    idle_timeout: 5,
    connect_timeout: 10
  };
  const sourceSql = postgres(sourceUrl, options);
  const targetSql = postgres(targetUrl, options);
  try {
    if (command === 'plan') return await planCommand(sourceSql, targetSql, fingerprint);
    if (command === 'apply') return await applyCommand(sourceSql, targetSql, fingerprint);
    if (command === 'verify') return await verifyCommand(sourceSql, targetSql, fingerprint);
    return await rollbackCommand(sourceSql, targetSql, fingerprint);
  } finally {
    await Promise.allSettled([sourceSql.end({ timeout: 5 }), targetSql.end({ timeout: 5 })]);
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) {
  try {
    const result = await runRoomCutover({
      command: process.argv[2],
      sourceUrl: process.env.CUTOVER_SOURCE_DATABASE_URL,
      targetUrl: process.env.CUTOVER_TARGET_DATABASE_URL,
      sourceLabel: process.env.CUTOVER_SOURCE_LABEL
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (cause) {
    const code = cause instanceof RoomCutoverRefusal ? cause.code : 'internal';
    process.stderr.write(`[cutover:rooms] ${code}\n`);
    process.exitCode = 1;
  }
}
