#!/usr/bin/env node

/**
 * Reversible conversion of the controller's legacy account administrators into canonical Rust
 * identity and enterprise-membership authority. Profile conversion is a hard prerequisite.
 *
 * Target identity, membership, and ownership-ledger rows commit atomically. Controller projection
 * proof commits second; an interrupted process resumes from the owned target ids. Output never
 * contains names, emails, credentials, database URLs, or source labels.
 */

import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import postgres from 'postgres';

/** @typedef {import('postgres').Sql} Sql */
/** @typedef {import('postgres').TransactionSql} TransactionSql */
/** @typedef {Sql | TransactionSql} SqlHandle */
/**
 * @typedef {object} AdministratorRow
 * @property {string} legacyId
 * @property {string} legacyAccountId
 * @property {string} enterpriseId
 * @property {string} name
 * @property {string} email
 * @property {string} passwordHash
 * @property {string} createdAt
 * @property {string | null} targetId
 * @property {number | null} authorityRevision
 * @property {string | null} authorityContentHash
 * @property {string | null} authorityReconciledAt
 */
/** @typedef {{ legacyId: string; targetId: string; sourceDigest: string; runId?: string }} MappingRow */
/** @typedef {{ row: AdministratorRow; targetId: string; sourceDigest: string; mapped: boolean }} PlanItem */
/** @typedef {{ counts: { administrators: number }; digest: string }} Snapshot */

const SOURCE_SYSTEM = 'controller-postgres';
const SCOPE = 'account-administrators';
const ENTITY_TYPE = 'account-administrator';
const LOCK_KEY = 0x4355_5438;
const COMMANDS = new Set(['plan', 'apply', 'verify', 'rollback']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const LEGACY_SCRYPT = /^[0-9a-f]{32}:[0-9a-f]{128}$/i;

export class AdministratorCutoverRefusal extends Error {
  /** @param {string} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.name = 'AdministratorCutoverRefusal';
    this.code = code;
  }
}

/** @param {string} code @param {string} message @returns {never} */
function refuse(code, message) {
  throw new AdministratorCutoverRefusal(code, message);
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

/** @param {unknown} value @param {string} code @returns {string | null} */
function optionalUuid(value, code) {
  return value == null ? null : uuid(value, code);
}

/** @param {unknown} value @param {string} code */
function legacyId(value, code) {
  const normalized = String(value ?? '');
  if (!/^[1-9][0-9]*$/u.test(normalized)) refuse(code, 'A legacy identity is invalid.');
  return normalized;
}

/** @param {unknown} value @param {string} code */
function iso(value, code) {
  const date = value instanceof Date ? value : new Date(/** @type {string | number} */ (value));
  if (!Number.isFinite(date.getTime())) refuse(code, 'A source timestamp is invalid.');
  return date.toISOString();
}

/** @param {unknown} value @param {string} code */
function requiredText(value, code) {
  const normalized = String(value ?? '').trim();
  if (!normalized || Buffer.byteLength(normalized) > 200) refuse(code, 'A source field is empty or oversized.');
  return normalized;
}

/** @param {unknown} value */
function email(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!normalized || normalized.length > 320 || !normalized.includes('@')) {
    refuse('invalid-administrator-email', 'A source administrator email is invalid.');
  }
  return normalized;
}

/** @param {string | undefined} label */
function sourceFingerprint(label) {
  const normalized = String(label ?? '').trim();
  if (normalized.length < 8 || normalized.length > 128) {
    refuse('invalid-source-label', 'CUTOVER_SOURCE_LABEL must contain 8 to 128 characters.');
  }
  return createHash('sha256').update(normalized).digest('hex');
}

/** @param {AdministratorRow} row */
function sourceRecord(row) {
  return {
    legacyId: row.legacyId,
    legacyAccountId: row.legacyAccountId,
    enterpriseId: row.enterpriseId,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt
  };
}

/** @param {AdministratorRow} row */
function sourceRecordDigest(row) {
  return digest(sourceRecord(row));
}

/** @param {{ userId: string; revision: number; displayName: string; email: string; createdAt: string; updatedAt: string }} row */
export function administratorContentHash(row) {
  return digest([
    row.userId,
    row.revision,
    row.displayName,
    row.email.trim().toLowerCase(),
    iso(row.createdAt, 'invalid-target-created-time'),
    iso(row.updatedAt, 'invalid-target-updated-time')
  ]);
}

/** @param {Record<string, unknown>[]} raw @returns {AdministratorRow[]} */
export function normalizeAdministratorSource(raw) {
  const rows = raw.map((value) => {
    const passwordHash = String(value.passwordHash ?? '');
    if (!LEGACY_SCRYPT.test(passwordHash)) {
      refuse('invalid-legacy-password', 'An administrator credential is not the reviewed scrypt envelope.');
    }
    const targetId = optionalUuid(value.targetId, 'invalid-administrator-mapping');
    const revision = value.authorityRevision == null ? null : Number(value.authorityRevision);
    if (revision !== null && (!Number.isSafeInteger(revision) || revision < 0)) {
      refuse('invalid-authority-revision', 'An administrator projection revision is invalid.');
    }
    const contentHash = value.authorityContentHash == null ? null : String(value.authorityContentHash);
    if (contentHash !== null && !SHA256.test(contentHash)) {
      refuse('invalid-authority-content-hash', 'An administrator projection hash is invalid.');
    }
    const reconciledAt =
      value.authorityReconciledAt == null ? null : iso(value.authorityReconciledAt, 'invalid-reconciled-time');
    const proofParts = [targetId, revision, contentHash, reconciledAt].filter((part) => part !== null).length;
    if (proofParts !== 0 && proofParts !== 4) {
      refuse('partial-source-proof', 'An administrator has an incomplete canonical proof.');
    }
    return {
      legacyId: legacyId(value.legacyId, 'invalid-administrator-id'),
      legacyAccountId: legacyId(value.legacyAccountId, 'invalid-account-id'),
      enterpriseId: uuid(value.enterpriseId, 'missing-enterprise-authority-mapping'),
      name: requiredText(value.name, 'invalid-administrator-name'),
      email: email(value.email),
      passwordHash,
      createdAt: iso(value.createdAt, 'invalid-created-time'),
      targetId,
      authorityRevision: revision,
      authorityContentHash: contentHash,
      authorityReconciledAt: reconciledAt
    };
  });
  const ids = new Set();
  const targetIds = new Set();
  const emails = new Set();
  for (const row of rows) {
    if (ids.has(row.legacyId)) refuse('duplicate-administrator-id', 'The source repeats an administrator id.');
    ids.add(row.legacyId);
    if (targetIds.has(row.targetId)) refuse('duplicate-target-identity', 'Two administrators claim one target id.');
    if (row.targetId) targetIds.add(row.targetId);
    if (emails.has(row.email)) {
      refuse('duplicate-administrator-email', 'Canonical identity requires globally unique administrator emails.');
    }
    emails.add(row.email);
  }
  rows.sort((a, b) => (BigInt(a.legacyId) < BigInt(b.legacyId) ? -1 : 1));
  return rows;
}

/** @param {SqlHandle} sql */
async function readSource(sql) {
  const raw = /** @type {Record<string, unknown>[]} */ (
    await sql`
    SELECT administrator.id::text AS "legacyId", administrator.account_id::text AS "legacyAccountId",
           account.authority_enterprise_id::text AS "enterpriseId", administrator.name,
           administrator.email, administrator.password_hash AS "passwordHash",
           administrator.created_at AS "createdAt", administrator.authority_user_id::text AS "targetId",
           administrator.authority_revision::bigint AS "authorityRevision",
           administrator.authority_content_hash AS "authorityContentHash",
           administrator.authority_reconciled_at AS "authorityReconciledAt"
      FROM admin_users AS administrator
      INNER JOIN accounts AS account ON account.id = administrator.account_id
     ORDER BY administrator.id
  `
  );
  return normalizeAdministratorSource(raw);
}

/** @param {AdministratorRow[]} rows @returns {Snapshot} */
function snapshot(rows) {
  return {
    counts: { administrators: rows.length },
    digest: digest(rows.map(sourceRecordDigest))
  };
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

/** @param {AdministratorRow[]} source @param {MappingRow[]} mappings @param {() => string} [allocate] */
export function resolveAdministratorPlan(source, mappings, allocate = () => randomUUID()) {
  const ledger = new Map(mappings.map((row) => [row.legacyId, row]));
  const targets = new Set();
  return source.map((row) => {
    const existing = ledger.get(row.legacyId);
    const ledgerTarget = existing ? uuid(existing.targetId, 'invalid-ledger-mapping') : null;
    if (ledgerTarget && row.targetId && ledgerTarget !== row.targetId) {
      refuse('mapping-disagreement', 'Source projection and ownership ledger disagree.');
    }
    const targetId = (ledgerTarget ?? row.targetId ?? uuid(allocate(), 'invalid-generated-id')).toLowerCase();
    if (targets.has(targetId)) refuse('duplicate-target-identity', 'Two source administrators resolve to one target.');
    targets.add(targetId);
    return { row, targetId, sourceDigest: sourceRecordDigest(row), mapped: Boolean(existing) };
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
  for (const item of plan) {
    const { row, targetId, mapped } = item;
    const enterpriseMapping = await sql`
      SELECT target_id::text AS id FROM legacy_entity_mappings
       WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
         AND entity_type = 'enterprise' AND legacy_id = ${row.legacyAccountId}
         AND target_id = ${row.enterpriseId}::uuid AND verified_at IS NOT NULL
    `;
    if (enterpriseMapping.length !== 1) {
      refuse('missing-enterprise-prerequisite', 'An administrator account lacks a verified enterprise mapping.');
    }
    const identity = await sql`
      SELECT id::text AS id, email::text AS email FROM users
       WHERE id = ${targetId}::uuid OR email = ${row.email}
    `;
    if (identity.some((value) => value.id !== targetId || email(value.email) !== row.email)) {
      refuse('target-email-collision', 'A target email belongs to an unowned identity.');
    }
    if (identity.length > 0 && !mapped) {
      refuse('unproven-existing-target', 'A target identity exists without cutover-ledger ownership.');
    }
    const membership = await sql`
      SELECT user_id::text AS "userId", role FROM enterprise_memberships
       WHERE enterprise_id = ${row.enterpriseId}::uuid AND user_id = ${targetId}::uuid
    `;
    if (membership.length > 0 && (!mapped || membership[0].role !== 'admin')) {
      refuse('target-membership-collision', 'An unowned or non-admin target membership occupies the mapping.');
    }
  }

  const enterprises = [...new Set(plan.map(({ row }) => row.enterpriseId))];
  for (const enterpriseId of enterprises) {
    const expected = new Set(
      plan.filter(({ row }) => row.enterpriseId === enterpriseId).map(({ targetId }) => targetId)
    );
    const actual = await sql`
      SELECT user_id::text AS id FROM enterprise_memberships
       WHERE enterprise_id = ${enterpriseId}::uuid AND role = 'admin'
    `;
    if (actual.some(({ id }) => !expected.has(id))) {
      refuse(
        'unowned-target-administrator',
        'Canonical authority has an administrator absent from the source snapshot.'
      );
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
      Number(active[0].sourceCounts.administrators) !== state.counts.administrators
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
  for (const { row, targetId, sourceDigest } of plan) {
    await sql`
      INSERT INTO users (id, email, email_hash, password_hash, display_name, is_guest, created_at, updated_at)
      VALUES (${targetId}::uuid, ${row.email}, md5(lower(${row.email})), ${row.passwordHash}, ${row.name}, false,
              ${row.createdAt}, ${row.createdAt})
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email, email_hash = EXCLUDED.email_hash,
        password_hash = CASE WHEN users.password_hash LIKE '$argon2id$%' THEN users.password_hash
                             ELSE EXCLUDED.password_hash END,
        display_name = EXCLUDED.display_name, updated_at = EXCLUDED.updated_at
    `;
    await sql`
      INSERT INTO enterprise_memberships (enterprise_id, user_id, role, revision, created_at, updated_at)
      VALUES (${row.enterpriseId}::uuid, ${targetId}::uuid, 'admin', 0, ${row.createdAt}, ${row.createdAt})
      ON CONFLICT (enterprise_id, user_id) DO UPDATE SET role = 'admin'
        WHERE enterprise_memberships.role <> 'admin'
    `;
    await sql`
      INSERT INTO legacy_entity_mappings
        (source_system, source_fingerprint, entity_type, legacy_id, target_id, run_id, source_digest)
      VALUES (${SOURCE_SYSTEM}, ${fingerprint}, ${ENTITY_TYPE}, ${row.legacyId}, ${targetId}::uuid,
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

/** @param {SqlHandle} sql @param {PlanItem[]} plan */
async function applySourceProof(sql, plan) {
  for (const { row, targetId } of plan) {
    const targetCreated = row.createdAt;
    const contentHash = administratorContentHash({
      userId: targetId,
      revision: 0,
      displayName: row.name,
      email: row.email,
      createdAt: targetCreated,
      updatedAt: targetCreated
    });
    const changed = await sql`
      UPDATE admin_users SET authority_user_id = ${targetId}::uuid, authority_revision = 0,
             authority_content_hash = ${contentHash}, authority_reconciled_at = now()
       WHERE id = ${row.legacyId}::integer
         AND (authority_user_id IS NULL OR authority_user_id = ${targetId}::uuid)
      RETURNING id
    `;
    if (changed.length !== 1) refuse('source-projection-race', 'An administrator mapping changed concurrently.');
  }
}

/** @param {Sql} sourceSql @param {SqlHandle} targetSql @param {string} fingerprint @param {string | null} runId */
async function verifyState(sourceSql, targetSql, fingerprint, runId = null) {
  const source = await readSource(sourceSql);
  const state = snapshot(source);
  const mappings = await readMappings(targetSql, fingerprint);
  const plan = resolveAdministratorPlan(source, mappings, () =>
    refuse('missing-target-mapping', 'A source administrator is absent from the target ledger.')
  );
  if (mappings.length !== plan.length) refuse('extra-target-mapping', 'The target ledger has an extra administrator.');
  const targetRecords = [];
  for (const item of plan) {
    if (item.sourceDigest !== mappings.find(({ legacyId: id }) => id === item.row.legacyId)?.sourceDigest) {
      refuse('source-changed-since-target-commit', 'An administrator changed after the target commit.');
    }
    if (item.row.targetId !== item.targetId) refuse('source-not-linked', 'The source projection is not linked.');
    const target = await targetSql`
      SELECT identity.id::text AS "userId", membership.revision::bigint AS revision,
             identity.display_name AS "displayName", identity.email::text AS email,
             membership.created_at AS "createdAt", membership.updated_at AS "updatedAt",
             identity.password_hash AS "passwordHash", identity.last_login_at AS "lastLoginAt"
        FROM enterprise_memberships AS membership
        INNER JOIN users AS identity ON identity.id = membership.user_id
       WHERE membership.enterprise_id = ${item.row.enterpriseId}::uuid
         AND membership.user_id = ${item.targetId}::uuid AND membership.role = 'admin'
    `;
    if (target.length !== 1) refuse('missing-target-administrator', 'A mapped target administrator is missing.');
    const actual = target[0];
    if (
      actual.displayName !== item.row.name ||
      email(actual.email) !== item.row.email ||
      Number(actual.revision) !== 0 ||
      (actual.passwordHash !== item.row.passwordHash && !String(actual.passwordHash).startsWith('$argon2id$'))
    ) {
      refuse('target-reconciliation-failed', 'A target administrator differs from its source.');
    }
    const hash = administratorContentHash({ ...actual, revision: Number(actual.revision) });
    if (item.row.authorityRevision !== 0 || item.row.authorityContentHash !== hash) {
      refuse('source-proof-disagreement', 'The controller projection does not prove the target row.');
    }
    targetRecords.push({
      userId: actual.userId,
      enterpriseId: item.row.enterpriseId,
      revision: Number(actual.revision),
      credentialState: actual.passwordHash === item.row.passwordHash ? 'legacy-equal' : 'argon2-upgraded'
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
  if (runs.length !== 1) refuse('missing-cutover-run', 'No matching administrator cutover run exists.');
  if (
    runs[0].sourceDigest !== state.digest ||
    Number(runs[0].sourceCounts.administrators) !== state.counts.administrators
  ) {
    refuse('source-changed-since-target-commit', 'The source snapshot changed after target commit.');
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
  const plan = resolveAdministratorPlan(
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
    unmapped: plan.filter(({ mapped, row }) => !mapped && row.targetId === null).length
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
      runId = await applyTarget(targetTx, fingerprint, resolveAdministratorPlan(source, mappings), state);
    });
    const committed = resolveAdministratorPlan(source, await readMappings(targetSql, fingerprint), () =>
      refuse('target-commit-incomplete', 'The target did not persist every mapping.')
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
  if (latest.length === 1 && latest[0].status === 'rolled-back') {
    const residue =
      await sourceSql`SELECT EXISTS (SELECT 1 FROM admin_users WHERE authority_user_id IS NOT NULL) AS found`;
    if (residue[0].found) refuse('rollback-state-disagreement', 'A completed rollback still has source proof.');
    return { status: 'rolled-back', counts: snapshot(await readSource(sourceSql)).counts };
  }
  const source = await readSource(sourceSql);
  const mappings = await readMappings(targetSql, fingerprint);
  const plan = resolveAdministratorPlan(source, mappings, () =>
    refuse('missing-target-mapping', 'A source administrator is absent from the target ledger.')
  );
  for (const { row, targetId } of plan) {
    const used = await targetSql`
      SELECT identity.password_hash AS "passwordHash", identity.last_login_at AS "lastLoginAt",
             membership.role, membership.revision::bigint AS revision,
             EXISTS (SELECT 1 FROM refresh_tokens WHERE user_id = ${targetId}::uuid) AS "hasRefresh",
             EXISTS (SELECT 1 FROM room_members WHERE user_id = ${targetId}::uuid) AS "hasRoomMembership",
             EXISTS (SELECT 1 FROM audit_log WHERE actor_user_id = ${targetId}::uuid) AS "hasAudit"
        FROM users AS identity
        INNER JOIN enterprise_memberships AS membership ON membership.user_id = identity.id
       WHERE identity.id = ${targetId}::uuid AND membership.enterprise_id = ${row.enterpriseId}::uuid
    `;
    if (
      used.length !== 1 ||
      used[0].role !== 'admin' ||
      Number(used[0].revision) !== 0 ||
      used[0].passwordHash !== row.passwordHash ||
      used[0].lastLoginAt !== null ||
      used[0].hasRefresh ||
      used[0].hasRoomMembership ||
      used[0].hasAudit
    ) {
      refuse('rollback-after-use', 'A canonical administrator was used or changed; rollback is refused.');
    }
  }
  await sourceSql.begin('isolation level serializable', async (sourceTx) => {
    await sourceTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    for (const { row, targetId } of plan) {
      const cleared = await sourceTx`
        UPDATE admin_users SET authority_user_id = NULL, authority_revision = NULL,
               authority_content_hash = NULL, authority_reconciled_at = NULL
         WHERE id = ${row.legacyId}::integer AND authority_user_id = ${targetId}::uuid
        RETURNING id
      `;
      if (cleared.length !== 1) refuse('source-projection-race', 'An administrator proof changed during rollback.');
    }
  });
  await targetSql.begin('isolation level serializable', async (targetTx) => {
    await targetTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    for (const { row, targetId } of plan) {
      const deleted = await targetTx`
        DELETE FROM enterprise_memberships
         WHERE enterprise_id = ${row.enterpriseId}::uuid AND user_id = ${targetId}::uuid
           AND role = 'admin' AND revision = 0 RETURNING user_id
      `;
      if (deleted.length !== 1) refuse('target-membership-race', 'An administrator changed during rollback.');
      const identity = await targetTx`DELETE FROM users WHERE id = ${targetId}::uuid RETURNING id`;
      if (identity.length !== 1) refuse('target-identity-race', 'An administrator identity changed during rollback.');
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

/**
 * @param {{ command?: string; sourceUrl?: string; targetUrl?: string; sourceLabel?: string }} input
 */
export async function runAdministratorCutover({ command, sourceUrl, targetUrl, sourceLabel }) {
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
    const result = await runAdministratorCutover({
      command: process.argv[2],
      sourceUrl: process.env.CUTOVER_SOURCE_DATABASE_URL,
      targetUrl: process.env.CUTOVER_TARGET_DATABASE_URL,
      sourceLabel: process.env.CUTOVER_SOURCE_LABEL
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    const code = error instanceof AdministratorCutoverRefusal ? error.code : 'unexpected-cutover-failure';
    process.stderr.write(`[cutover:account-administrators] ${code}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
