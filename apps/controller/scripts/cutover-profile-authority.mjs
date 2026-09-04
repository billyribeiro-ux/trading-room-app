#!/usr/bin/env node

/**
 * Gate 3 profile/identity conversion from the transitional controller PostgreSQL database to the
 * Rust authority database.
 *
 * Two databases cannot share an atomic transaction. The target ledger is therefore committed
 * first; only then are the source mapping columns committed. A retry recovers the exact target ids
 * from `legacy_entity_mappings`, making the failure window resumable instead of duplicating rows.
 *
 * Usage:
 *   CUTOVER_SOURCE_DATABASE_URL=... CUTOVER_TARGET_DATABASE_URL=... \
 *   CUTOVER_SOURCE_LABEL=production-controller-v1 \
 *     node scripts/cutover-profile-authority.mjs plan|apply|verify|rollback
 *
 * URLs and source data are never printed. Output contains only counts, digests, status, and a run
 * id. `rollback` refuses any identity whose password has already been upgraded or used.
 */

import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import postgres from 'postgres';

/** @typedef {import('postgres').Sql} Sql */
/** @typedef {import('postgres').TransactionSql} TransactionSql */
/** @typedef {Sql | TransactionSql} SqlHandle */
/** @typedef {'enterprise' | 'user'} EntityType */
/**
 * @typedef {object} SourceAccount
 * @property {string} legacyId
 * @property {string} name
 * @property {string} ownerEmail
 * @property {'active' | 'suspended'} status
 * @property {string | null} suspendedAt
 * @property {string | null} suspendedBy
 * @property {string | null} suspendedReason
 * @property {string} createdAt
 * @property {string | null} authorityId
 */
/**
 * @typedef {object} SourceUser
 * @property {string} legacyId
 * @property {string} legacyAccountId
 * @property {string} email
 * @property {string} displayName
 * @property {string | null} passwordHash
 * @property {string | null} emailVerifiedAt
 * @property {string} createdAt
 * @property {string | null} authorityId
 */
/** @typedef {{ accounts: SourceAccount[]; users: SourceUser[] }} SourceData */
/**
 * @typedef {object} MappingRow
 * @property {EntityType} entityType
 * @property {string} legacyId
 * @property {string} targetId
 * @property {string} [runId]
 * @property {string} [sourceDigest]
 * @property {Date | string | null} [verifiedAt]
 */
/**
 * @typedef {object} ResolvedMapping
 * @property {EntityType} entityType
 * @property {string} legacyId
 * @property {string} targetId
 * @property {string} sourceDigest
 * @property {string | undefined} ledgerSourceDigest
 * @property {boolean} sourceWasMapped
 * @property {boolean} ledgerWasMapped
 */
/**
 * @typedef {object} CutoverPlan
 * @property {{ row: SourceAccount; mapping: ResolvedMapping }[]} accounts
 * @property {{ row: SourceUser; mapping: ResolvedMapping }[]} users
 */
/** @typedef {{ counts: { accounts: number; users: number }; digest: string }} SourceSnapshot */
/** @typedef {{ fingerprint: string; users: Map<string, string> }} PasswordStates */
/**
 * @typedef {object} CutoverInput
 * @property {string | undefined} command
 * @property {string | undefined} sourceUrl
 * @property {string | undefined} targetUrl
 * @property {string | undefined} sourceLabel
 */

const SOURCE_SYSTEM = 'controller-postgres';
const SCOPE = 'profile';
const LOCK_KEY = 0x4355_5433; // "CUT3"
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const LEGACY_SCRYPT = /^[0-9a-f]{32}:[0-9a-f]{128}$/i;
const COMMANDS = new Set(['plan', 'apply', 'verify', 'rollback']);

export class CutoverRefusal extends Error {
  /** @param {string} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.name = 'CutoverRefusal';
    this.code = code;
  }
}

/** @param {string} code @param {string} message @returns {never} */
function refuse(code, message) {
  throw new CutoverRefusal(code, message);
}

/** @param {string} value */
function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

/** @param {unknown} value */
function jsonDigest(value) {
  return sha256(JSON.stringify(value));
}

/** @param {unknown} value @returns {string} */
function iso(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (typeof value !== 'string' && typeof value !== 'number') {
    refuse('invalid-source-timestamp', 'A source timestamp is invalid.');
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) refuse('invalid-source-timestamp', 'A source timestamp is invalid.');
  return parsed.toISOString();
}

/** @param {unknown} value @returns {string} */
function normalizedEmail(value) {
  const email = String(value).trim().toLowerCase();
  if (!email || email.length > 320 || !email.includes('@')) {
    refuse('invalid-source-email', 'A source identity has an unusable email address.');
  }
  return email;
}

/** @param {unknown} value @param {string} code @returns {string} */
function requiredText(value, code) {
  const text = String(value).trim();
  if (!text) refuse(code, 'A required source field is empty.');
  return text;
}

/** @param {unknown} value @param {string} code @returns {string | null} */
function mappedUuid(value, code) {
  if (value === null || value === undefined) return null;
  const id = String(value);
  if (!UUID.test(id)) refuse(code, 'A persisted authority mapping is not a UUID.');
  return id.toLowerCase();
}

/** @param {string | undefined} label @returns {string} */
function sourceFingerprint(label) {
  const normalized = String(label ?? '').trim();
  if (normalized.length < 8 || normalized.length > 128) {
    refuse('invalid-source-label', 'CUTOVER_SOURCE_LABEL must contain 8 to 128 characters.');
  }
  return sha256(normalized);
}

/** @param {EntityType} entityType @param {SourceAccount | SourceUser} row @returns {string} */
function sourceRecordDigest(entityType, row) {
  if (entityType === 'enterprise') {
    const account = /** @type {SourceAccount} */ (row);
    return jsonDigest({
      entityType,
      legacyId: account.legacyId,
      name: account.name,
      ownerEmail: account.ownerEmail,
      status: account.status,
      suspendedAt: account.suspendedAt,
      suspendedBy: account.suspendedBy,
      suspendedReason: account.suspendedReason,
      createdAt: account.createdAt
    });
  }
  const user = /** @type {SourceUser} */ (row);
  return jsonDigest({
    entityType,
    legacyId: user.legacyId,
    legacyAccountId: user.legacyAccountId,
    email: user.email,
    displayName: user.displayName,
    passwordHash: user.passwordHash,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt
  });
}

/** @param {Record<string, unknown>[]} rawAccounts @param {Record<string, unknown>[]} rawUsers @returns {SourceData} */
export function normalizeSourceRows(rawAccounts, rawUsers) {
  const accounts = rawAccounts.map((raw) => {
    const legacyId = String(raw.legacyId);
    if (!/^[1-9][0-9]*$/.test(legacyId)) refuse('invalid-account-id', 'A source account id is invalid.');
    const status = String(raw.status);
    if (status !== 'active' && status !== 'suspended') {
      refuse('invalid-account-status', 'A source account has an unknown status.');
    }
    /** @type {SourceAccount} */
    const account = {
      legacyId,
      name: requiredText(raw.name, 'empty-account-name'),
      ownerEmail: normalizedEmail(raw.ownerEmail),
      status,
      suspendedAt: raw.suspendedAt == null ? null : iso(raw.suspendedAt),
      suspendedBy: raw.suspendedBy == null ? null : String(raw.suspendedBy),
      suspendedReason: raw.suspendedReason == null ? null : String(raw.suspendedReason),
      createdAt: iso(raw.createdAt),
      authorityId: mappedUuid(raw.authorityId, 'invalid-enterprise-mapping')
    };
    return account;
  });
  const users = rawUsers.map((raw) => {
    const legacyId = String(raw.legacyId);
    const legacyAccountId = String(raw.legacyAccountId);
    if (!/^[1-9][0-9]*$/.test(legacyId) || !/^[1-9][0-9]*$/.test(legacyAccountId)) {
      refuse('invalid-user-id', 'A source user or account id is invalid.');
    }
    const passwordHash = raw.passwordHash == null ? null : String(raw.passwordHash);
    if (passwordHash !== null && !LEGACY_SCRYPT.test(passwordHash)) {
      refuse('invalid-legacy-password', 'A source credential is not the reviewed controller scrypt envelope.');
    }
    /** @type {SourceUser} */
    const user = {
      legacyId,
      legacyAccountId,
      email: normalizedEmail(raw.email),
      displayName: requiredText(raw.displayName, 'empty-display-name'),
      passwordHash,
      emailVerifiedAt: raw.emailVerifiedAt == null ? null : iso(raw.emailVerifiedAt),
      createdAt: iso(raw.createdAt),
      authorityId: mappedUuid(raw.authorityId, 'invalid-user-mapping')
    };
    return user;
  });

  const accountIds = new Set();
  const ownerEmails = new Set();
  for (const account of accounts) {
    if (accountIds.has(account.legacyId))
      refuse('duplicate-account-id', 'The source account snapshot has duplicate ids.');
    accountIds.add(account.legacyId);
    if (ownerEmails.has(account.ownerEmail)) {
      refuse('duplicate-owner-email', 'Two source accounts claim the same owner email.');
    }
    ownerEmails.add(account.ownerEmail);
  }

  const userIds = new Set();
  const userEmails = new Set();
  for (const user of users) {
    if (!accountIds.has(user.legacyAccountId)) refuse('orphan-user', 'A source user names a missing account.');
    if (userIds.has(user.legacyId)) refuse('duplicate-user-id', 'The source user snapshot has duplicate ids.');
    if (userEmails.has(user.email)) refuse('duplicate-user-email', 'The source user snapshot has duplicate emails.');
    userIds.add(user.legacyId);
    userEmails.add(user.email);
  }

  for (const account of accounts) {
    const owner = users.find(
      (user) =>
        user.legacyAccountId === account.legacyId && user.email === account.ownerEmail && user.passwordHash !== null
    );
    if (!owner) refuse('missing-account-owner', 'An account has no authenticating owner identity in its own tenant.');
  }

  accounts.sort((a, b) => (BigInt(a.legacyId) < BigInt(b.legacyId) ? -1 : 1));
  users.sort((a, b) => (BigInt(a.legacyId) < BigInt(b.legacyId) ? -1 : 1));
  return { accounts, users };
}

/** @param {SqlHandle} sql @returns {Promise<SourceData>} */
async function readSource(sql) {
  const rawAccounts = /** @type {Record<string, unknown>[]} */ (
    await sql`
    SELECT id::text AS "legacyId", name, owner_email AS "ownerEmail", status,
           suspended_at AS "suspendedAt", suspended_by AS "suspendedBy",
           suspended_reason AS "suspendedReason", created_at AS "createdAt",
           authority_enterprise_id::text AS "authorityId"
      FROM accounts
     ORDER BY id
  `
  );
  const rawUsers = /** @type {Record<string, unknown>[]} */ (
    await sql`
    SELECT id::text AS "legacyId", account_id::text AS "legacyAccountId", email,
           display_name AS "displayName", password_hash AS "passwordHash",
           email_verified_at AS "emailVerifiedAt", created_at AS "createdAt",
           authority_user_id::text AS "authorityId"
      FROM users
     ORDER BY id
  `
  );
  return normalizeSourceRows(rawAccounts, rawUsers);
}

/** @param {SourceData} source @returns {SourceSnapshot} */
function sourceSnapshot(source) {
  return {
    counts: { accounts: source.accounts.length, users: source.users.length },
    digest: jsonDigest({
      accounts: source.accounts.map((row) => sourceRecordDigest('enterprise', row)),
      users: source.users.map((row) => sourceRecordDigest('user', row))
    })
  };
}

/** @param {SqlHandle} sql @param {string} fingerprint @returns {Promise<MappingRow[]>} */
async function readMappings(sql, fingerprint) {
  return /** @type {MappingRow[]} */ (
    await sql`
    SELECT entity_type AS "entityType", legacy_id AS "legacyId", target_id::text AS "targetId",
           run_id::text AS "runId", source_digest AS "sourceDigest", verified_at AS "verifiedAt"
     FROM legacy_entity_mappings
     WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
       AND entity_type IN ('enterprise', 'user')
     ORDER BY entity_type, legacy_id
  `
  );
}

/**
 * @param {SourceData} source
 * @param {MappingRow[]} mappingRows
 * @param {() => string} [allocate]
 * @returns {CutoverPlan}
 */
export function resolvePlan(source, mappingRows, allocate = () => randomUUID()) {
  const existing = new Map(mappingRows.map((row) => [`${row.entityType}:${row.legacyId}`, row]));
  const targetIds = new Set();

  /** @param {EntityType} entityType @param {SourceAccount | SourceUser} row @returns {ResolvedMapping} */
  function resolve(entityType, row) {
    const ledger = existing.get(`${entityType}:${row.legacyId}`) ?? null;
    const ledgerTargetId = ledger === null ? null : String(ledger.targetId);
    const sourceId = row.authorityId;
    if (ledgerTargetId && sourceId && ledgerTargetId.toLowerCase() !== sourceId.toLowerCase()) {
      refuse('mapping-disagreement', 'Source and target mapping ledgers disagree.');
    }
    const targetId = (ledgerTargetId ?? sourceId ?? allocate()).toLowerCase();
    if (!UUID.test(targetId)) refuse('invalid-generated-id', 'The mapping allocator returned a non-UUID.');
    const key = `${entityType}:${targetId}`;
    if (targetIds.has(key)) refuse('duplicate-target-id', 'Two source rows resolve to one target id.');
    targetIds.add(key);
    return {
      entityType,
      legacyId: row.legacyId,
      targetId,
      sourceDigest: sourceRecordDigest(entityType, row),
      ledgerSourceDigest: ledger?.sourceDigest,
      sourceWasMapped: sourceId !== null,
      ledgerWasMapped: ledger !== null
    };
  }

  return {
    accounts: source.accounts.map((row) => ({
      row,
      mapping: resolve('enterprise', row)
    })),
    users: source.users.map((row) => ({ row, mapping: resolve('user', row) }))
  };
}

/** @param {string} fingerprint @param {string} legacyId */
function slugFor(fingerprint, legacyId) {
  return `legacy-${fingerprint.slice(0, 12)}-${legacyId}`;
}

/** @param {CutoverPlan} plan @param {PasswordStates} passwordStates */
function targetDigest(plan, passwordStates) {
  return jsonDigest({
    accounts: plan.accounts.map(({ row, mapping }) => ({
      targetId: mapping.targetId,
      name: row.name,
      slug: slugFor(passwordStates.fingerprint, row.legacyId),
      status: row.status,
      suspendedAt: row.suspendedAt,
      suspendedBy: row.suspendedBy,
      suspendedReason: row.suspendedReason
    })),
    users: plan.users.map(({ row, mapping }) => ({
      targetId: mapping.targetId,
      email: row.email,
      displayName: row.displayName,
      credentialState: passwordStates.users.get(row.legacyId) ?? 'missing'
    }))
  });
}

/** @param {SqlHandle} sql @param {string} fingerprint @param {CutoverPlan} plan */
async function ensureNoTargetCollisions(sql, fingerprint, plan) {
  for (const { row, mapping } of plan.users) {
    if (mapping.sourceWasMapped && !mapping.ledgerWasMapped) {
      const unproven = await sql`SELECT EXISTS (SELECT 1 FROM users WHERE id = ${mapping.targetId}::uuid) AS found`;
      if (unproven[0].found) {
        refuse(
          'unproven-existing-target',
          'A source mapping points at an existing identity that is not owned by the cutover ledger.'
        );
      }
    }
    const collisions = await sql`
      SELECT id::text AS id
        FROM users
       WHERE email = ${row.email} AND id <> ${mapping.targetId}::uuid
       LIMIT 1
    `;
    if (collisions.length !== 0) refuse('target-email-collision', 'A target email belongs to an unmapped identity.');
  }
  for (const { row, mapping } of plan.accounts) {
    if (mapping.sourceWasMapped && !mapping.ledgerWasMapped) {
      const unproven = await sql`
        SELECT EXISTS (SELECT 1 FROM enterprises WHERE id = ${mapping.targetId}::uuid) AS found
      `;
      if (unproven[0].found) {
        refuse(
          'unproven-existing-target',
          'A source mapping points at an existing enterprise that is not owned by the cutover ledger.'
        );
      }
    }
    const collisions = await sql`
      SELECT id::text AS id
        FROM enterprises
       WHERE slug = ${slugFor(fingerprint, row.legacyId)} AND id <> ${mapping.targetId}::uuid
       LIMIT 1
    `;
    if (collisions.length !== 0) refuse('target-slug-collision', 'A target slug belongs to an unmapped enterprise.');
  }
}

/** @param {SqlHandle} sql @param {string} fingerprint */
async function activeRun(sql, fingerprint) {
  const rows = await sql`
    SELECT id::text AS id, status
      FROM legacy_cutover_runs
     WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
       AND scope = ${SCOPE} AND status IN ('running', 'target-committed')
     ORDER BY started_at DESC
     LIMIT 1
  `;
  return rows[0] ?? null;
}

/** @param {SqlHandle} sql @param {string} fingerprint @param {SourceSnapshot} snapshot */
async function beginOrResumeRun(sql, fingerprint, snapshot) {
  const active = await activeRun(sql, fingerprint);
  if (active) {
    const rows = await sql`
      SELECT source_digest AS "sourceDigest", source_counts AS "sourceCounts"
        FROM legacy_cutover_runs WHERE id = ${active.id}::uuid
    `;
    if (
      rows[0].sourceDigest !== snapshot.digest ||
      JSON.stringify(rows[0].sourceCounts) !== JSON.stringify(snapshot.counts)
    ) {
      refuse('source-changed-during-resume', 'The source snapshot changed after an unfinished target commit.');
    }
    return active.id;
  }
  const inserted = await sql`
    INSERT INTO legacy_cutover_runs
      (source_system, source_fingerprint, scope, status, source_counts, target_counts, source_digest)
    VALUES (${SOURCE_SYSTEM}, ${fingerprint}, ${SCOPE}, 'running', ${sql.json(snapshot.counts)}, '{}'::jsonb,
            ${snapshot.digest})
    RETURNING id::text AS id
  `;
  return inserted[0].id;
}

/**
 * @param {SqlHandle} sql
 * @param {string} fingerprint
 * @param {CutoverPlan} plan
 * @param {SourceSnapshot} snapshot
 */
async function applyTarget(sql, fingerprint, plan, snapshot) {
  const runId = await beginOrResumeRun(sql, fingerprint, snapshot);
  await ensureNoTargetCollisions(sql, fingerprint, plan);

  for (const { row, mapping } of plan.accounts) {
    await sql`
      INSERT INTO enterprises
        (id, name, slug, status, suspended_at, suspended_by, suspended_reason, created_at, updated_at)
      VALUES (${mapping.targetId}::uuid, ${row.name}, ${slugFor(fingerprint, row.legacyId)}, ${row.status},
              ${row.suspendedAt}, ${row.suspendedBy}, ${row.suspendedReason}, ${row.createdAt}, now())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        suspended_at = EXCLUDED.suspended_at,
        suspended_by = EXCLUDED.suspended_by,
        suspended_reason = EXCLUDED.suspended_reason,
        updated_at = now()
    `;
    await sql`
      INSERT INTO legacy_entity_mappings
        (source_system, source_fingerprint, entity_type, legacy_id, target_id, run_id, source_digest)
      VALUES (${SOURCE_SYSTEM}, ${fingerprint}, 'enterprise', ${row.legacyId}, ${mapping.targetId}::uuid,
              ${runId}::uuid, ${mapping.sourceDigest})
      ON CONFLICT (source_system, source_fingerprint, entity_type, legacy_id) DO UPDATE SET
        run_id = EXCLUDED.run_id, source_digest = EXCLUDED.source_digest, verified_at = NULL
    `;
  }

  for (const { row, mapping } of plan.users) {
    await sql`
      INSERT INTO users
        (id, email, email_hash, password_hash, display_name, created_at, updated_at)
      VALUES (${mapping.targetId}::uuid, ${row.email}, md5(lower(${row.email})), ${row.passwordHash},
              ${row.displayName}, ${row.createdAt}, now())
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        email_hash = EXCLUDED.email_hash,
        password_hash = CASE
          WHEN users.password_hash LIKE '$argon2id$%' THEN users.password_hash
          ELSE EXCLUDED.password_hash
        END,
        display_name = EXCLUDED.display_name,
        updated_at = now()
    `;
    await sql`
      INSERT INTO legacy_entity_mappings
        (source_system, source_fingerprint, entity_type, legacy_id, target_id, run_id, source_digest)
      VALUES (${SOURCE_SYSTEM}, ${fingerprint}, 'user', ${row.legacyId}, ${mapping.targetId}::uuid,
              ${runId}::uuid, ${mapping.sourceDigest})
      ON CONFLICT (source_system, source_fingerprint, entity_type, legacy_id) DO UPDATE SET
        run_id = EXCLUDED.run_id, source_digest = EXCLUDED.source_digest, verified_at = NULL
    `;
  }

  for (const { row: account, mapping: enterpriseMapping } of plan.accounts) {
    const owner = plan.users.find(
      ({ row }) =>
        row.legacyAccountId === account.legacyId && row.email === account.ownerEmail && row.passwordHash !== null
    );
    if (!owner) refuse('missing-account-owner', 'An account owner disappeared from the validated plan.');
    await sql`
      INSERT INTO enterprise_memberships (enterprise_id, user_id, role)
      VALUES (${enterpriseMapping.targetId}::uuid, ${owner.mapping.targetId}::uuid, 'owner')
      ON CONFLICT (enterprise_id, user_id) DO UPDATE SET role = 'owner', updated_at = now()
    `;
  }

  await sql`
    UPDATE legacy_cutover_runs
       SET status = 'target-committed', target_committed_at = now(),
           target_counts = ${sql.json(snapshot.counts)}
     WHERE id = ${runId}::uuid
  `;
  return runId;
}

/** @param {SqlHandle} sql @param {CutoverPlan} plan */
async function applySourceMappings(sql, plan) {
  for (const { row, mapping } of plan.accounts) {
    const changed = await sql`
      UPDATE accounts
         SET authority_enterprise_id = ${mapping.targetId}::uuid, authority_reconciled_at = now()
       WHERE id = ${row.legacyId}::integer
         AND (authority_enterprise_id IS NULL OR authority_enterprise_id = ${mapping.targetId}::uuid)
      RETURNING id
    `;
    if (changed.length !== 1) refuse('source-account-mapping-race', 'A source account mapping changed concurrently.');
  }
  for (const { row, mapping } of plan.users) {
    const changed = await sql`
      UPDATE users
         SET authority_user_id = ${mapping.targetId}::uuid, authority_reconciled_at = now()
       WHERE id = ${row.legacyId}::integer
         AND (authority_user_id IS NULL OR authority_user_id = ${mapping.targetId}::uuid)
      RETURNING id
    `;
    if (changed.length !== 1) refuse('source-user-mapping-race', 'A source user mapping changed concurrently.');
  }
}

/**
 * @param {Sql} sourceSql
 * @param {SqlHandle} targetSql
 * @param {string} fingerprint
 * @param {string | null} [expectedRunId]
 */
async function verifyState(sourceSql, targetSql, fingerprint, expectedRunId = null) {
  const source = await readSource(sourceSql);
  const snapshot = sourceSnapshot(source);
  const mappings = await readMappings(targetSql, fingerprint);
  const plan = resolvePlan(source, mappings, () => refuse('missing-target-mapping', 'A source row is not mapped.'));
  if (mappings.length !== plan.accounts.length + plan.users.length) {
    refuse('extra-target-mapping', 'The target has mappings absent from the source snapshot.');
  }
  for (const { mapping } of [...plan.accounts, ...plan.users]) {
    if (mapping.ledgerSourceDigest !== mapping.sourceDigest) {
      refuse('source-changed-since-target-commit', 'The source row changed after its target mapping was committed.');
    }
  }

  const passwordStates = new Map();
  for (const { row, mapping } of plan.accounts) {
    if (row.authorityId !== mapping.targetId)
      refuse('source-account-not-linked', 'A source account mapping is missing.');
    const target = await targetSql`
      SELECT name, slug, status, suspended_at AS "suspendedAt", suspended_by AS "suspendedBy",
             suspended_reason AS "suspendedReason"
        FROM enterprises WHERE id = ${mapping.targetId}::uuid
    `;
    if (target.length !== 1) refuse('missing-target-enterprise', 'A mapped target enterprise is missing.');
    const actual = target[0];
    if (
      actual.name !== row.name ||
      actual.slug !== slugFor(fingerprint, row.legacyId) ||
      actual.status !== row.status ||
      (actual.suspendedAt == null ? null : iso(actual.suspendedAt)) !== row.suspendedAt ||
      (actual.suspendedBy ?? null) !== row.suspendedBy ||
      (actual.suspendedReason ?? null) !== row.suspendedReason
    ) {
      refuse('enterprise-reconciliation-failed', 'A mapped enterprise differs from its source.');
    }
  }

  for (const { row, mapping } of plan.users) {
    if (row.authorityId !== mapping.targetId) refuse('source-user-not-linked', 'A source user mapping is missing.');
    const target = await targetSql`
      SELECT email::text AS email, display_name AS "displayName", password_hash AS "passwordHash"
        FROM users WHERE id = ${mapping.targetId}::uuid
    `;
    if (target.length !== 1) refuse('missing-target-user', 'A mapped target identity is missing.');
    const actual = target[0];
    if (normalizedEmail(actual.email) !== row.email || actual.displayName !== row.displayName) {
      refuse('user-reconciliation-failed', 'A mapped target identity differs from its source.');
    }
    let credentialState;
    if (row.passwordHash === null && actual.passwordHash === null) credentialState = 'none';
    else if (actual.passwordHash === row.passwordHash) credentialState = 'legacy-equal';
    else if (typeof actual.passwordHash === 'string' && actual.passwordHash.startsWith('$argon2id$')) {
      credentialState = 'argon2-upgraded';
    } else refuse('credential-reconciliation-failed', 'A target credential is neither imported nor upgraded.');
    passwordStates.set(row.legacyId, credentialState);
  }

  for (const { row: account, mapping: enterpriseMapping } of plan.accounts) {
    const owner = plan.users.find(
      ({ row }) =>
        row.legacyAccountId === account.legacyId && row.email === account.ownerEmail && row.passwordHash !== null
    );
    if (!owner) refuse('missing-account-owner', 'An account owner disappeared from the validated plan.');
    const role = await targetSql`
      SELECT role FROM enterprise_memberships
       WHERE enterprise_id = ${enterpriseMapping.targetId}::uuid AND user_id = ${owner.mapping.targetId}::uuid
    `;
    if (role.length !== 1 || role[0].role !== 'owner') {
      refuse('owner-reconciliation-failed', 'A mapped enterprise has no matching canonical owner.');
    }
  }

  const runRows = expectedRunId
    ? await targetSql`
        SELECT id::text AS id, source_digest AS "sourceDigest", source_counts AS "sourceCounts"
          FROM legacy_cutover_runs WHERE id = ${expectedRunId}::uuid
      `
    : await targetSql`
        SELECT id::text AS id, source_digest AS "sourceDigest", source_counts AS "sourceCounts"
          FROM legacy_cutover_runs
         WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint} AND scope = ${SCOPE}
           AND status IN ('running', 'target-committed', 'verified')
         ORDER BY started_at DESC LIMIT 1
      `;
  if (runRows.length !== 1) refuse('missing-cutover-run', 'No matching cutover run can be verified.');
  if (
    runRows[0].sourceDigest !== snapshot.digest ||
    runRows[0].sourceCounts.accounts !== snapshot.counts.accounts ||
    runRows[0].sourceCounts.users !== snapshot.counts.users
  ) {
    refuse('source-changed-since-target-commit', 'The source snapshot changed after the target commit.');
  }
  const runId = runRows[0].id;
  const digest = targetDigest(plan, { fingerprint, users: passwordStates });
  await targetSql`
    UPDATE legacy_entity_mappings SET verified_at = now()
     WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
       AND entity_type IN ('enterprise', 'user')
  `;
  await targetSql`
    UPDATE legacy_cutover_runs
       SET status = 'verified', verified_at = now(), source_counts = ${targetSql.json(snapshot.counts)},
           target_counts = ${targetSql.json(snapshot.counts)}, source_digest = ${snapshot.digest}, target_digest = ${digest},
           failure_code = NULL
     WHERE id = ${runId}::uuid
  `;
  return {
    runId,
    status: 'verified',
    counts: snapshot.counts,
    sourceDigest: snapshot.digest,
    targetDigest: digest
  };
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function planCommand(sourceSql, targetSql, fingerprint) {
  const source = await sourceSql.begin('read only, isolation level repeatable read', async (sql) => readSource(sql));
  const mappings = await readMappings(targetSql, fingerprint);
  const serial = { next: 0 };
  const plan = resolvePlan(
    source,
    mappings,
    () => `00000000-0000-8000-8000-${String(++serial.next).padStart(12, '0')}`
  );
  await ensureNoTargetCollisions(targetSql, fingerprint, plan);
  const snapshot = sourceSnapshot(source);
  return {
    status: 'planned',
    counts: snapshot.counts,
    sourceDigest: snapshot.digest,
    unmapped: {
      accounts: plan.accounts.filter(({ mapping }) => !mapping.sourceWasMapped && !mapping.ledgerWasMapped).length,
      users: plan.users.filter(({ mapping }) => !mapping.sourceWasMapped && !mapping.ledgerWasMapped).length
    }
  };
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function applyCommand(sourceSql, targetSql, fingerprint) {
  /** @type {string | null} */
  let runId = null;
  await sourceSql.begin('isolation level repeatable read', async (sourceTx) => {
    await sourceTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    const source = await readSource(sourceTx);
    const snapshot = sourceSnapshot(source);

    await targetSql.begin('isolation level serializable', async (targetTx) => {
      await targetTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
      const mappings = await readMappings(targetTx, fingerprint);
      const plan = resolvePlan(source, mappings);
      runId = await applyTarget(targetTx, fingerprint, plan, snapshot);
    });

    const committedMappings = await readMappings(targetSql, fingerprint);
    const committedPlan = resolvePlan(source, committedMappings, () =>
      refuse('target-commit-incomplete', 'The target commit did not persist every mapping.')
    );
    await applySourceMappings(sourceTx, committedPlan);
  });

  if (runId === null) refuse('target-commit-incomplete', 'The target transaction returned no cutover run id.');
  return targetSql.begin('isolation level serializable', async (targetTx) => {
    await targetTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    return verifyState(sourceSql, targetTx, fingerprint, runId);
  });
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function verifyCommand(sourceSql, targetSql, fingerprint) {
  return targetSql.begin('isolation level serializable', async (targetTx) => {
    await targetTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    return verifyState(sourceSql, targetTx, fingerprint);
  });
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function rollbackCommand(sourceSql, targetSql, fingerprint) {
  const source = await readSource(sourceSql);
  const mappings = await readMappings(targetSql, fingerprint);
  const plan = resolvePlan(source, mappings, () => refuse('missing-target-mapping', 'A source row is not mapped.'));

  const dependentSlices = await targetSql`
    SELECT EXISTS (
      SELECT 1
        FROM legacy_entity_mappings AS mapping
        INNER JOIN legacy_cutover_runs AS run ON run.id = mapping.run_id
       WHERE mapping.source_system = ${SOURCE_SYSTEM}
         AND mapping.source_fingerprint = ${fingerprint}
         AND mapping.entity_type NOT IN ('enterprise', 'user')
         AND run.status IN ('running', 'target-committed', 'verified')
    ) AS found
  `;
  if (dependentSlices[0].found) {
    refuse('dependent-cutover-slice', 'Rollback later Gate 3 slices before profile authority.');
  }

  // Any upgraded credential or successful Rust login proves the target has carried live traffic.
  // Automated rollback would then destroy newer authority, so it must refuse.
  for (const { row, mapping } of plan.users) {
    const target = await targetSql`
      SELECT password_hash AS "passwordHash", last_login_at AS "lastLoginAt"
        FROM users WHERE id = ${mapping.targetId}::uuid
    `;
    if (target.length !== 1 || target[0].lastLoginAt !== null || target[0].passwordHash !== row.passwordHash) {
      refuse('rollback-after-use', 'Rollback refused because a canonical identity was used or changed.');
    }
  }

  await targetSql.begin('isolation level serializable', async (targetTx) => {
    await targetTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    for (const { mapping } of plan.accounts) {
      await targetTx`DELETE FROM enterprise_memberships WHERE enterprise_id = ${mapping.targetId}::uuid`;
    }
    for (const { mapping } of plan.users) {
      await targetTx`DELETE FROM users WHERE id = ${mapping.targetId}::uuid`;
    }
    for (const { mapping } of plan.accounts) {
      await targetTx`DELETE FROM enterprises WHERE id = ${mapping.targetId}::uuid`;
    }
    await targetTx`
      UPDATE legacy_cutover_runs SET status = 'rolled-back', rolled_back_at = now()
       WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint} AND scope = ${SCOPE}
         AND status IN ('running', 'target-committed', 'verified')
    `;
    await targetTx`
      UPDATE legacy_entity_mappings SET verified_at = NULL
       WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
         AND entity_type IN ('enterprise', 'user')
    `;
  });

  await sourceSql.begin('isolation level serializable', async (sourceTx) => {
    await sourceTx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    for (const { row, mapping } of plan.users) {
      await sourceTx`
        UPDATE users SET authority_user_id = NULL, authority_reconciled_at = NULL
         WHERE id = ${row.legacyId}::integer AND authority_user_id = ${mapping.targetId}::uuid
      `;
    }
    for (const { row, mapping } of plan.accounts) {
      await sourceTx`
        UPDATE accounts SET authority_enterprise_id = NULL, authority_reconciled_at = NULL
         WHERE id = ${row.legacyId}::integer AND authority_enterprise_id = ${mapping.targetId}::uuid
      `;
    }
  });

  return { status: 'rolled-back', counts: sourceSnapshot(source).counts };
}

/** @param {CutoverInput} input */
export async function runCutover({ command, sourceUrl, targetUrl, sourceLabel }) {
  if (typeof command !== 'string' || !COMMANDS.has(command)) {
    refuse('invalid-command', 'Expected plan, apply, verify, or rollback.');
  }
  if (!sourceUrl || !targetUrl) {
    refuse('missing-database-url', 'Both CUTOVER_SOURCE_DATABASE_URL and CUTOVER_TARGET_DATABASE_URL are required.');
  }
  if (sourceUrl === targetUrl) refuse('same-database-url', 'Source and target database URLs must differ.');
  const fingerprint = sourceFingerprint(sourceLabel);
  if (!SHA256.test(fingerprint)) refuse('invalid-source-fingerprint', 'Could not derive the source fingerprint.');

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
    await Promise.allSettled([sourceSql.end({ timeout: 2 }), targetSql.end({ timeout: 2 })]);
  }
}

async function main() {
  const command = process.argv[2];
  try {
    const result = await runCutover({
      command,
      sourceUrl: process.env.CUTOVER_SOURCE_DATABASE_URL,
      targetUrl: process.env.CUTOVER_TARGET_DATABASE_URL,
      sourceLabel: process.env.CUTOVER_SOURCE_LABEL
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    const code = error instanceof CutoverRefusal ? error.code : 'unexpected-cutover-failure';
    // Database errors may embed a conflicting email or other source value in `detail`; never print
    // them. The stable code plus server-side exit status is the operator-facing boundary.
    process.stderr.write(`[cutover:profile] ${code}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
