#!/usr/bin/env node

/**
 * Reversible legacy-controller to canonical-Rust customer API-key conversion.
 * Only verifier metadata crosses the boundary; recoverable ciphertext remains in the controller.
 * Output excludes credentials, key ids, source labels, and database URLs.
 */

import { createHash, randomUUID } from 'node:crypto';
import { isIPv4 } from 'node:net';
import { pathToFileURL } from 'node:url';
import postgres from 'postgres';

/** @typedef {import('postgres').Sql} Sql */
/** @typedef {import('postgres').TransactionSql} TransactionSql */
/** @typedef {Sql | TransactionSql} SqlHandle */
/** @typedef {{ ips: string[]; scopes: string[]; sessions: string[] }} Restrictions */
/**
 * @typedef {object} CustomerApiKeyRow
 * @property {string} legacyId
 * @property {string} legacyAccountId
 * @property {string} enterpriseId
 * @property {string} secretHash
 * @property {string} lastFour
 * @property {string} secretCiphertext
 * @property {Restrictions} restrictions
 * @property {string} createdAt
 * @property {string | null} lastUsedAt
 * @property {number | null} authorityRevision
 * @property {string | null} authorityContentHash
 * @property {string | null} authorityReconciledAt
 */
/** @typedef {{ legacyId: string; targetId: string; sourceDigest: string; runId?: string }} MappingRow */
/** @typedef {{ row: CustomerApiKeyRow; ownershipId: string; sourceDigest: string; mapped: boolean }} PlanItem */
/** @typedef {{ counts: { customerApiKeys: number }; digest: string }} Snapshot */

const SOURCE_SYSTEM = 'controller-postgres';
const SCOPE = 'customer-api-keys';
const ENTITY_TYPE = 'customer-api-key';
const LOCK_KEY = 0x4355_5439;
const COMMANDS = new Set(['plan', 'apply', 'verify', 'rollback']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY_ID = /^[0-9a-f]{24}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const LAST_FOUR = /^[0-9a-f]{4}$/;
const SCOPES = new Set([
  'sessions/list',
  'sessions/users',
  'sessions/addUsers',
  'sessions/delUsers',
  'sessions/userstats',
  'sessions/chatlogs',
  'sessions/alertlogs',
  'sessions/deletedlogs',
  'sessions/archivedlogs',
  'sessions/recordings',
  'sessions/cloneSession'
]);

export class CustomerApiKeyCutoverRefusal extends Error {
  /** @param {string} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.name = 'CustomerApiKeyCutoverRefusal';
    this.code = code;
  }
}

/** @param {string} code @param {string} message @returns {never} */
function refuse(code, message) {
  throw new CustomerApiKeyCutoverRefusal(code, message);
}

/** @param {unknown} value */
function digest(value) {
  return createHash('sha256')
    .update(JSON.stringify(value) ?? 'undefined')
    .digest('hex');
}

/** @param {unknown} value @param {string} code */
function uuid(value, code) {
  if (value == null) refuse(code, 'A required canonical mapping is missing.');
  const normalized = String(value).toLowerCase();
  if (!UUID.test(normalized)) refuse(code, 'A canonical mapping is not a UUID.');
  return normalized;
}

/** @param {unknown} value @param {string} code */
function iso(value, code) {
  const date = value instanceof Date ? value : new Date(/** @type {string | number} */ (value));
  if (!Number.isFinite(date.getTime())) refuse(code, 'A timestamp is invalid.');
  return date.toISOString();
}

/** @param {unknown} value @param {string} code @returns {string | null} */
function optionalIso(value, code) {
  return value == null ? null : iso(value, code);
}

/** @param {string | undefined} label */
function sourceFingerprint(label) {
  const normalized = String(label ?? '').trim();
  if (normalized.length < 8 || normalized.length > 128) {
    refuse('invalid-source-label', 'CUTOVER_SOURCE_LABEL must contain 8 to 128 characters.');
  }
  return createHash('sha256').update(normalized).digest('hex');
}

/** @param {unknown} raw @param {Set<string>} ownedSessions */
function normalizeRestrictions(raw, ownedSessions) {
  let value;
  try {
    value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    refuse('invalid-restrictions-json', 'A customer API-key restriction document is not valid JSON.');
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    refuse('invalid-restrictions-shape', 'A customer API-key restriction document is not an object.');
  }
  const record = /** @type {Record<string, unknown>} */ (value);
  if (Object.keys(record).some((key) => !['ips', 'scopes', 'sessions'].includes(key))) {
    refuse('unknown-restriction-field', 'A customer API-key restriction document has an unknown field.');
  }
  /** @param {'ips' | 'scopes' | 'sessions'} field @param {number} maximum */
  const strings = (field, maximum) => {
    const input = record[field] ?? [];
    if (!Array.isArray(input) || input.some((entry) => typeof entry !== 'string') || input.length > maximum) {
      refuse('invalid-restrictions-shape', 'A customer API-key restriction list is invalid or oversized.');
    }
    return [...new Set(input.map((entry) => entry.trim()))].sort();
  };
  const ips = strings('ips', 64).map((entry) => {
    const [address, rawPrefix, ...extra] = entry.split('/');
    if (
      !isIPv4(address) ||
      extra.length > 0 ||
      (rawPrefix !== undefined && (!/^[0-9]{1,3}$/.test(rawPrefix) || Number(rawPrefix) > 32))
    ) {
      refuse('invalid-ip-restriction', 'A customer API-key IP restriction is not IPv4 or IPv4/CIDR.');
    }
    return rawPrefix === undefined ? address : `${address}/${Number(rawPrefix)}`;
  });
  const scopes = strings('scopes', SCOPES.size);
  if (scopes.some((scope) => !SCOPES.has(scope))) {
    refuse('unknown-scope-restriction', 'A customer API-key command restriction is unknown.');
  }
  const sessions = strings('sessions', 256);
  if (sessions.some((session) => !session || Buffer.byteLength(session) > 64 || !ownedSessions.has(session))) {
    refuse('unowned-session-restriction', 'A customer API-key room restriction is invalid or unowned.');
  }
  return { ips: [...new Set(ips)].sort(), scopes, sessions };
}

/** @param {CustomerApiKeyRow} row */
function sourceRecord(row) {
  return {
    legacyId: row.legacyId,
    legacyAccountId: row.legacyAccountId,
    enterpriseId: row.enterpriseId,
    secretHash: row.secretHash,
    lastFour: row.lastFour,
    restrictions: row.restrictions,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt
  };
}

/** @param {CustomerApiKeyRow} row */
function sourceRecordDigest(row) {
  return digest(sourceRecord(row));
}

/** @param {{ id: string; revision: number; lastFour: string; restrictions: Restrictions; createdAt: string; updatedAt: string; lastUsedAt: string | null }} row */
export function customerApiKeyContentHash(row) {
  const createdAt = iso(row.createdAt, 'invalid-target-created-time');
  // Validate observations, but do not bind them to a configuration revision. External use advances
  // these fields without changing key material or restrictions.
  iso(row.updatedAt, 'invalid-target-updated-time');
  optionalIso(row.lastUsedAt, 'invalid-target-last-used-time');
  return digest([row.id, row.revision, row.lastFour, row.restrictions, createdAt]);
}

/** @param {Record<string, unknown>[]} raw @returns {CustomerApiKeyRow[]} */
export function normalizeCustomerApiKeySource(raw) {
  const rows = raw.map((value) => {
    const id = String(value.legacyId ?? '');
    const accountId = String(value.legacyAccountId ?? '');
    const secretHash = String(value.secretHash ?? '');
    const lastFour = String(value.lastFour ?? '');
    const secretCiphertext = String(value.secretCiphertext ?? '');
    if (!KEY_ID.test(id)) refuse('invalid-customer-api-key-id', 'A customer API-key id is invalid.');
    if (!/^[1-9][0-9]*$/u.test(accountId)) refuse('invalid-account-id', 'A legacy account identity is invalid.');
    if (!SHA256.test(secretHash) || !LAST_FOUR.test(lastFour)) {
      refuse('invalid-verifier-metadata', 'Customer API-key verifier metadata is invalid.');
    }
    if (
      !secretCiphertext ||
      Buffer.byteLength(secretCiphertext) > 4096 ||
      !/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(secretCiphertext)
    ) {
      refuse('unrecoverable-legacy-secret', 'A legacy API key lacks a reviewed recoverable secret envelope.');
    }
    const revision = value.authorityRevision == null ? null : Number(value.authorityRevision);
    if (revision !== null && (!Number.isSafeInteger(revision) || revision < 0)) {
      refuse('invalid-authority-revision', 'A customer API-key projection revision is invalid.');
    }
    const contentHash = value.authorityContentHash == null ? null : String(value.authorityContentHash);
    if (contentHash !== null && !SHA256.test(contentHash)) {
      refuse('invalid-authority-content-hash', 'A customer API-key projection hash is invalid.');
    }
    const reconciledAt = optionalIso(value.authorityReconciledAt, 'invalid-reconciled-time');
    const proofParts = [revision, contentHash, reconciledAt].filter((part) => part !== null).length;
    if (proofParts !== 0 && proofParts !== 3) {
      refuse('partial-source-proof', 'A customer API key has an incomplete canonical proof.');
    }
    if (!Array.isArray(value.ownedSessions) || value.ownedSessions.some((session) => typeof session !== 'string')) {
      refuse('invalid-owned-session-set', 'The account room snapshot is invalid.');
    }
    return {
      legacyId: id,
      legacyAccountId: accountId,
      enterpriseId: uuid(value.enterpriseId, 'missing-enterprise-authority-mapping'),
      secretHash,
      lastFour,
      secretCiphertext,
      restrictions: normalizeRestrictions(
        value.restrictionsJson,
        new Set(/** @type {string[]} */ (value.ownedSessions))
      ),
      createdAt: iso(value.createdAt, 'invalid-created-time'),
      lastUsedAt: optionalIso(value.lastUsedAt, 'invalid-last-used-time'),
      authorityRevision: revision,
      authorityContentHash: contentHash,
      authorityReconciledAt: reconciledAt
    };
  });
  const ids = new Set();
  for (const row of rows) {
    if (ids.has(row.legacyId)) refuse('duplicate-customer-api-key-id', 'The source repeats a customer API-key id.');
    ids.add(row.legacyId);
  }
  rows.sort((a, b) => a.legacyId.localeCompare(b.legacyId));
  return rows;
}

/** @param {SqlHandle} sql */
async function readSource(sql) {
  const raw = /** @type {Record<string, unknown>[]} */ (
    await sql`
    SELECT api_key.id AS "legacyId", api_key.account_id::text AS "legacyAccountId",
           account.authority_enterprise_id::text AS "enterpriseId",
           api_key.secret_hash AS "secretHash", api_key.last_four AS "lastFour",
           api_key.secret_ciphertext AS "secretCiphertext", api_key.restrictions_json AS "restrictionsJson",
           api_key.created_at AS "createdAt", api_key.last_used_at AS "lastUsedAt",
           api_key.authority_revision::bigint AS "authorityRevision",
           api_key.authority_content_hash AS "authorityContentHash",
           api_key.authority_reconciled_at AS "authorityReconciledAt",
           COALESCE((SELECT json_agg(room.short_code ORDER BY room.short_code)
                       FROM rooms AS room WHERE room.account_id = api_key.account_id), '[]'::json) AS "ownedSessions"
      FROM api_keys AS api_key
      INNER JOIN accounts AS account ON account.id = api_key.account_id
     ORDER BY api_key.id
  `
  );
  return normalizeCustomerApiKeySource(raw);
}

/** @param {CustomerApiKeyRow[]} rows @returns {Snapshot} */
function snapshot(rows) {
  return { counts: { customerApiKeys: rows.length }, digest: digest(rows.map(sourceRecordDigest)) };
}

/** @param {SqlHandle} sql @param {string} fingerprint */
async function readMappings(sql, fingerprint) {
  return /** @type {MappingRow[]} */ (
    await sql`
    SELECT legacy_id AS "legacyId", target_id::text AS "targetId", source_digest AS "sourceDigest",
           run_id::text AS "runId"
      FROM legacy_entity_mappings
     WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
       AND entity_type = ${ENTITY_TYPE}
     ORDER BY legacy_id
  `
  );
}

/** @param {CustomerApiKeyRow[]} source @param {MappingRow[]} mappings @param {() => string} [allocate] */
export function resolveCustomerApiKeyPlan(source, mappings, allocate = () => randomUUID()) {
  const sourceIds = new Set(source.map((row) => row.legacyId));
  if (mappings.some((row) => !sourceIds.has(row.legacyId))) {
    refuse('extra-target-mapping', 'The target ledger has an extra customer API-key mapping.');
  }
  const ledger = new Map(mappings.map((row) => [row.legacyId, row]));
  const ownershipIds = new Set();
  return source.map((row) => {
    const existing = ledger.get(row.legacyId);
    if (!existing && row.authorityRevision !== null) {
      refuse('source-proof-without-ledger', 'Source canonical proof exists without target-ledger ownership.');
    }
    const ownershipId = uuid(existing?.targetId ?? allocate(), 'invalid-ledger-mapping');
    if (ownershipIds.has(ownershipId)) refuse('duplicate-ownership-id', 'Two API keys claim one ownership id.');
    ownershipIds.add(ownershipId);
    return { row, ownershipId, sourceDigest: sourceRecordDigest(row), mapped: Boolean(existing) };
  });
}

/** @param {SqlHandle} sql @param {string} fingerprint */
async function requireProfilePrerequisite(sql, fingerprint) {
  const runs = await sql`
    SELECT EXISTS (
      SELECT 1 FROM legacy_cutover_runs
       WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
         AND scope = 'profile' AND status = 'verified'
    ) AS verified
  `;
  if (!runs[0].verified) refuse('missing-profile-prerequisite', 'Profile conversion is not independently verified.');
}

/** @param {SqlHandle} sql @param {string} fingerprint @param {PlanItem[]} plan */
async function ensureNoTargetCollisions(sql, fingerprint, plan) {
  await requireProfilePrerequisite(sql, fingerprint);
  for (const { row, mapped } of plan) {
    const enterpriseMapping = await sql`
      SELECT target_id::text AS id FROM legacy_entity_mappings
       WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
         AND entity_type = 'enterprise' AND legacy_id = ${row.legacyAccountId}
         AND target_id = ${row.enterpriseId}::uuid AND verified_at IS NOT NULL
    `;
    if (enterpriseMapping.length !== 1) {
      refuse('missing-enterprise-prerequisite', 'An API-key account lacks a verified enterprise mapping.');
    }
    const target =
      await sql`SELECT enterprise_id::text AS "enterpriseId" FROM customer_api_keys WHERE id = ${row.legacyId}`;
    if (target.length > 0 && (!mapped || target[0].enterpriseId !== row.enterpriseId)) {
      refuse('target-key-collision', 'An unowned or cross-account canonical API key occupies the source id.');
    }
  }
  for (const enterpriseId of new Set(plan.map(({ row }) => row.enterpriseId))) {
    const expected = new Set(
      plan.filter(({ row }) => row.enterpriseId === enterpriseId).map(({ row }) => row.legacyId)
    );
    const actual = await sql`SELECT id FROM customer_api_keys WHERE enterprise_id = ${enterpriseId}::uuid`;
    if (actual.some(({ id }) => !expected.has(id))) {
      refuse('unowned-target-key', 'Canonical authority has an API key absent from the source snapshot.');
    }
  }
}

/** @param {SqlHandle} sql @param {string} fingerprint @param {Snapshot} state */
async function beginOrResumeRun(sql, fingerprint, state) {
  const active = await sql`
    SELECT id::text AS id, source_digest AS "sourceDigest", source_counts AS "sourceCounts"
      FROM legacy_cutover_runs
     WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint} AND scope = ${SCOPE}
       AND status IN ('running', 'target-committed')
     ORDER BY started_at DESC LIMIT 1
  `;
  if (active.length === 1) {
    if (
      active[0].sourceDigest !== state.digest ||
      Number(active[0].sourceCounts.customerApiKeys) !== state.counts.customerApiKeys
    ) {
      refuse('source-changed-during-resume', 'The source changed after an unfinished target commit.');
    }
    return active[0].id;
  }
  const created = await sql`
    INSERT INTO legacy_cutover_runs
      (source_system, source_fingerprint, scope, status, source_counts, target_counts, source_digest)
    VALUES (${SOURCE_SYSTEM}, ${fingerprint}, ${SCOPE}, 'running', ${sql.json(state.counts)}, '{}'::jsonb,
            ${state.digest}) RETURNING id::text AS id
  `;
  return created[0].id;
}

/** @param {SqlHandle} sql @param {string} fingerprint @param {PlanItem[]} plan @param {Snapshot} state */
async function applyTarget(sql, fingerprint, plan, state) {
  const runId = await beginOrResumeRun(sql, fingerprint, state);
  await ensureNoTargetCollisions(sql, fingerprint, plan);
  for (const { row, ownershipId, sourceDigest } of plan) {
    await sql`
      INSERT INTO customer_api_keys
        (enterprise_id, id, revision, secret_hash, last_four, restrictions, created_at, updated_at, last_used_at)
      VALUES (${row.enterpriseId}::uuid, ${row.legacyId}, 0, ${row.secretHash}, ${row.lastFour},
              ${sql.json(row.restrictions)}, ${row.createdAt}, ${row.createdAt}, ${row.lastUsedAt})
      ON CONFLICT (id) DO NOTHING
    `;
    const exact = await sql`
      SELECT enterprise_id::text AS "enterpriseId", revision::bigint AS revision,
             secret_hash::text AS "secretHash", last_four::text AS "lastFour", restrictions,
             created_at AS "createdAt", updated_at AS "updatedAt", last_used_at AS "lastUsedAt"
        FROM customer_api_keys WHERE id = ${row.legacyId}
    `;
    if (!targetMatches(exact[0], row)) {
      refuse('target-reconciliation-failed', 'A canonical API key differs from its source snapshot.');
    }
    await sql`
      INSERT INTO legacy_entity_mappings
        (source_system, source_fingerprint, entity_type, legacy_id, target_id, run_id, source_digest)
      VALUES (${SOURCE_SYSTEM}, ${fingerprint}, ${ENTITY_TYPE}, ${row.legacyId}, ${ownershipId}::uuid,
              ${runId}::uuid, ${sourceDigest})
      ON CONFLICT (source_system, source_fingerprint, entity_type, legacy_id) DO UPDATE SET
        target_id = EXCLUDED.target_id, run_id = EXCLUDED.run_id,
        source_digest = EXCLUDED.source_digest, verified_at = NULL
    `;
  }
  await sql`
    UPDATE legacy_cutover_runs SET status = 'target-committed', target_committed_at = now(),
      target_counts = ${sql.json(state.counts)} WHERE id = ${runId}::uuid
  `;
  return runId;
}

/** @param {Record<string, unknown> | undefined} target @param {CustomerApiKeyRow} row */
function targetMatches(target, row) {
  return Boolean(
    target &&
    target.enterpriseId === row.enterpriseId &&
    Number(target.revision) === 0 &&
    target.secretHash === row.secretHash &&
    target.lastFour === row.lastFour &&
    digest(target.restrictions) === digest(row.restrictions) &&
    iso(target.createdAt, 'invalid-target-created-time') === row.createdAt &&
    iso(target.updatedAt, 'invalid-target-updated-time') === row.createdAt &&
    optionalIso(target.lastUsedAt, 'invalid-target-last-used-time') === row.lastUsedAt
  );
}

/** @param {SqlHandle} sql @param {PlanItem[]} plan */
async function applySourceProof(sql, plan) {
  for (const { row } of plan) {
    const contentHash = customerApiKeyContentHash({
      id: row.legacyId,
      revision: 0,
      lastFour: row.lastFour,
      restrictions: row.restrictions,
      createdAt: row.createdAt,
      updatedAt: row.createdAt,
      lastUsedAt: row.lastUsedAt
    });
    const changed = await sql`
      UPDATE api_keys SET authority_revision = 0, authority_content_hash = ${contentHash},
             authority_reconciled_at = now()
       WHERE id = ${row.legacyId} AND account_id = ${row.legacyAccountId}::integer
         AND (authority_revision IS NULL OR
              (authority_revision = 0 AND authority_content_hash = ${contentHash}))
      RETURNING id
    `;
    if (changed.length !== 1) refuse('source-projection-race', 'An API-key proof changed concurrently.');
  }
}

/** @param {Sql} sourceSql @param {SqlHandle} targetSql @param {string} fingerprint @param {string | null} runId */
async function verifyState(sourceSql, targetSql, fingerprint, runId = null) {
  const source = await readSource(sourceSql);
  const state = snapshot(source);
  const mappings = await readMappings(targetSql, fingerprint);
  const plan = resolveCustomerApiKeyPlan(source, mappings, () =>
    refuse('missing-target-mapping', 'A source API key is absent from the target ledger.')
  );
  if (mappings.length !== plan.length) refuse('extra-target-mapping', 'The target ledger has an extra API key.');
  const targetRecords = [];
  for (const item of plan) {
    const mapping = mappings.find(({ legacyId }) => legacyId === item.row.legacyId);
    if (item.sourceDigest !== mapping?.sourceDigest) {
      refuse('source-changed-since-target-commit', 'An API key changed after the target commit.');
    }
    const target = await targetSql`
      SELECT id, enterprise_id::text AS "enterpriseId", revision::bigint AS revision,
             secret_hash::text AS "secretHash", last_four::text AS "lastFour", restrictions,
             created_at AS "createdAt", updated_at AS "updatedAt", last_used_at AS "lastUsedAt"
        FROM customer_api_keys
       WHERE enterprise_id = ${item.row.enterpriseId}::uuid AND id = ${item.row.legacyId}
    `;
    if (!targetMatches(target[0], item.row)) {
      refuse('target-reconciliation-failed', 'A canonical API key differs from its source snapshot.');
    }
    const actual = target[0];
    const contentHash = customerApiKeyContentHash({
      id: String(actual.id),
      revision: Number(actual.revision),
      lastFour: String(actual.lastFour),
      restrictions: /** @type {Restrictions} */ (actual.restrictions),
      createdAt: iso(actual.createdAt, 'invalid-target-created-time'),
      updatedAt: iso(actual.updatedAt, 'invalid-target-updated-time'),
      lastUsedAt: optionalIso(actual.lastUsedAt, 'invalid-target-last-used-time')
    });
    if (item.row.authorityRevision !== 0 || item.row.authorityContentHash !== contentHash) {
      refuse('source-proof-disagreement', 'The controller API-key projection does not prove the target row.');
    }
    targetRecords.push({
      ownershipId: item.ownershipId,
      enterpriseId: item.row.enterpriseId,
      idDigest: digest(item.row.legacyId),
      verifierDigest: digest(actual.secretHash),
      contentHash
    });
  }
  const runs = runId
    ? await targetSql`SELECT id::text AS id, source_digest AS "sourceDigest", source_counts AS "sourceCounts"
                        FROM legacy_cutover_runs WHERE id = ${runId}::uuid`
    : await targetSql`SELECT id::text AS id, source_digest AS "sourceDigest", source_counts AS "sourceCounts"
                        FROM legacy_cutover_runs
                       WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
                         AND scope = ${SCOPE} AND status IN ('running', 'target-committed', 'verified')
                       ORDER BY started_at DESC LIMIT 1`;
  if (runs.length !== 1) refuse('missing-cutover-run', 'No matching API-key cutover run exists.');
  if (
    runs[0].sourceDigest !== state.digest ||
    Number(runs[0].sourceCounts.customerApiKeys) !== state.counts.customerApiKeys
  ) {
    refuse('source-changed-since-target-commit', 'The API-key source snapshot changed after target commit.');
  }
  const targetDigest = digest(targetRecords);
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
  return { runId: runs[0].id, status: 'verified', counts: state.counts, sourceDigest: state.digest, targetDigest };
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function planCommand(sourceSql, targetSql, fingerprint) {
  const source = await sourceSql.begin('read only, isolation level repeatable read', readSource);
  const mappings = await readMappings(targetSql, fingerprint);
  let serial = 0;
  const plan = resolveCustomerApiKeyPlan(
    source,
    mappings,
    () => `00000000-0000-8000-8000-${String(++serial).padStart(12, '0')}`
  );
  await ensureNoTargetCollisions(targetSql, fingerprint, plan);
  const state = snapshot(source);
  return {
    status: 'planned',
    counts: state.counts,
    sourceDigest: state.digest,
    unmapped: plan.filter(({ mapped }) => !mapped).length
  };
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function applyCommand(sourceSql, targetSql, fingerprint) {
  /** @type {string | null} */
  let runId = null;
  await sourceSql.begin('isolation level repeatable read', async (sourceTx) => {
    await sourceTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    const source = await readSource(sourceTx);
    const state = snapshot(source);
    await targetSql.begin('isolation level serializable', async (targetTx) => {
      await targetTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
      const mappings = await readMappings(targetTx, fingerprint);
      runId = await applyTarget(targetTx, fingerprint, resolveCustomerApiKeyPlan(source, mappings), state);
    });
    const committed = resolveCustomerApiKeyPlan(source, await readMappings(targetSql, fingerprint), () =>
      refuse('target-commit-incomplete', 'The target did not persist every API-key mapping.')
    );
    await applySourceProof(sourceTx, committed);
  });
  if (runId === null) refuse('target-commit-incomplete', 'The target did not return a cutover run id.');
  return targetSql.begin('isolation level serializable', async (targetTx) => {
    await targetTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    return verifyState(sourceSql, targetTx, fingerprint, runId);
  });
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function rollbackCommand(sourceSql, targetSql, fingerprint) {
  const latest = await targetSql`
    SELECT id::text AS id, status FROM legacy_cutover_runs
     WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint} AND scope = ${SCOPE}
     ORDER BY started_at DESC LIMIT 1
  `;
  const source = await readSource(sourceSql);
  if (latest.length === 1 && latest[0].status === 'rolled-back') {
    if (source.some((row) => row.authorityRevision !== null)) {
      refuse('rollback-state-disagreement', 'A completed rollback still has API-key source proof.');
    }
    return { status: 'rolled-back', counts: snapshot(source).counts };
  }
  if (latest.length !== 1) refuse('missing-cutover-run', 'No matching API-key cutover run exists.');
  const mappings = await readMappings(targetSql, fingerprint);
  const plan = resolveCustomerApiKeyPlan(source, mappings, () =>
    refuse('missing-target-mapping', 'A source API key is absent from the target ledger.')
  );
  for (const { row } of plan) {
    const target = await targetSql`
      SELECT enterprise_id::text AS "enterpriseId", revision::bigint AS revision,
             secret_hash::text AS "secretHash", last_four::text AS "lastFour", restrictions,
             created_at AS "createdAt", updated_at AS "updatedAt", last_used_at AS "lastUsedAt",
             EXISTS (SELECT 1 FROM customer_api_key_mutations
                      WHERE enterprise_id = ${row.enterpriseId}::uuid) AS "hasMutations"
        FROM customer_api_keys
       WHERE enterprise_id = ${row.enterpriseId}::uuid AND id = ${row.legacyId}
    `;
    if (!targetMatches(target[0], row) || target[0].hasMutations) {
      refuse('rollback-after-use', 'A canonical API key was used or changed; rollback is refused.');
    }
  }
  await sourceSql.begin('isolation level serializable', async (sourceTx) => {
    await sourceTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    for (const { row } of plan) {
      const proof = await sourceTx`
        SELECT authority_revision AS revision, authority_content_hash AS hash,
               authority_reconciled_at AS "reconciledAt"
          FROM api_keys WHERE id = ${row.legacyId} AND account_id = ${row.legacyAccountId}::integer FOR UPDATE
      `;
      if (proof.length !== 1) refuse('source-projection-race', 'An API-key source row disappeared during rollback.');
      if (proof[0].revision === null && proof[0].hash === null && proof[0].reconciledAt === null) continue;
      const cleared = await sourceTx`
        UPDATE api_keys SET authority_revision = NULL, authority_content_hash = NULL,
               authority_reconciled_at = NULL
         WHERE id = ${row.legacyId} AND account_id = ${row.legacyAccountId}::integer
           AND authority_revision = 0 AND authority_content_hash = ${row.authorityContentHash}
        RETURNING id
      `;
      if (cleared.length !== 1) refuse('source-projection-race', 'An API-key proof changed during rollback.');
    }
  });
  await targetSql.begin('isolation level serializable', async (targetTx) => {
    await targetTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    for (const { row } of plan) {
      const deleted = await targetTx`
        DELETE FROM customer_api_keys
         WHERE enterprise_id = ${row.enterpriseId}::uuid AND id = ${row.legacyId}
           AND revision = 0 AND secret_hash = ${row.secretHash} AND last_four = ${row.lastFour}
           AND restrictions = ${targetTx.json(row.restrictions)}
           AND created_at = ${row.createdAt} AND updated_at = ${row.createdAt}
           AND last_used_at IS NOT DISTINCT FROM ${row.lastUsedAt}::timestamptz
        RETURNING id
      `;
      if (deleted.length !== 1) refuse('target-key-race', 'A canonical API key changed during rollback.');
    }
    await targetTx`
      UPDATE legacy_entity_mappings SET verified_at = NULL
       WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
         AND entity_type = ${ENTITY_TYPE}
    `;
    await targetTx`
      UPDATE legacy_cutover_runs SET status = 'rolled-back', rolled_back_at = now()
       WHERE id = ${latest[0].id}::uuid
    `;
  });
  return { status: 'rolled-back', counts: snapshot(source).counts };
}

/** @param {{ command?: string; sourceUrl?: string; targetUrl?: string; sourceLabel?: string }} input */
export async function runCustomerApiKeyCutover({ command, sourceUrl, targetUrl, sourceLabel }) {
  if (!command || !COMMANDS.has(command)) refuse('invalid-command', 'Expected plan, apply, verify, or rollback.');
  if (!sourceUrl || !targetUrl) refuse('missing-database-url', 'Both cutover database URLs are required.');
  if (sourceUrl === targetUrl) refuse('same-database-url', 'Source and target databases must differ.');
  const fingerprint = sourceFingerprint(sourceLabel);
  const options = { max: 1, prepare: false, idle_timeout: 5, connect_timeout: 10 };
  const sourceSql = postgres(sourceUrl, options);
  const targetSql = postgres(targetUrl, options);
  try {
    if (command !== 'rollback') await requireProfilePrerequisite(targetSql, fingerprint);
    if (command === 'plan') return await planCommand(sourceSql, targetSql, fingerprint);
    if (command === 'apply') return await applyCommand(sourceSql, targetSql, fingerprint);
    if (command === 'verify') {
      return await targetSql.begin('isolation level serializable', async (targetTx) => {
        await targetTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
        return verifyState(sourceSql, targetTx, fingerprint);
      });
    }
    return await rollbackCommand(sourceSql, targetSql, fingerprint);
  } finally {
    await Promise.allSettled([sourceSql.end({ timeout: 2 }), targetSql.end({ timeout: 2 })]);
  }
}

async function main() {
  try {
    const result = await runCustomerApiKeyCutover({
      command: process.argv[2],
      sourceUrl: process.env.CUTOVER_SOURCE_DATABASE_URL,
      targetUrl: process.env.CUTOVER_TARGET_DATABASE_URL,
      sourceLabel: process.env.CUTOVER_SOURCE_LABEL
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    const code = error instanceof CustomerApiKeyCutoverRefusal ? error.code : 'unexpected-cutover-failure';
    process.stderr.write(`[cutover:customer-api-keys] ${code}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
