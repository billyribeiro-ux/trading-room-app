#!/usr/bin/env node

/**
 * Destructive only to one randomly named scratch SOURCE database and randomly identified target
 * rows. The target must already carry the Rust migrations. The verifier imports, reconciles,
 * verifies, rolls back, proves both target rows disappeared, then drops the source database.
 */

import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import postgres from 'postgres';
import { MIGRATIONS, MIGRATIONS_TABLE } from '../src/lib/server/db/migrations/index.js';
import { runMigrations } from '../src/lib/server/db/migrator.js';
import { CutoverRefusal, runCutover } from './cutover-profile-authority.mjs';

const targetUrl = process.env.CUTOVER_TARGET_DATABASE_URL ?? process.env.MIGRATE_DATABASE_URL;
if (!targetUrl) throw new Error('CUTOVER_TARGET_DATABASE_URL or MIGRATE_DATABASE_URL is required');

const parsed = new URL(targetUrl);
const adminDatabase = parsed.pathname.slice(1);
if (!adminDatabase) throw new Error('the target URL must name a database');
const suffix = randomBytes(8).toString('hex');
const sourceDatabase = `cutover_profile_${suffix}`;
const sourceLabel = `e2e-profile-${suffix}`;
const sourceUrl = new URL(targetUrl);
sourceUrl.pathname = `/${sourceDatabase}`;

const options = {
  max: 1,
  prepare: false,
  idle_timeout: 5,
  connect_timeout: 10,
  // Controller migrations intentionally use IF EXISTS/IF NOT EXISTS for heterogeneous historic
  // estates. Their expected PostgreSQL notices add no evidence to this bounded verifier.
  onnotice: () => undefined
};
const admin = postgres(targetUrl, options);
let source;

async function expectRefusal(code, operation) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof CutoverRefusal && error.code === code) return;
    throw error;
  }
  throw new Error(`expected cutover refusal ${code}`);
}

try {
  await admin`CREATE DATABASE ${admin(sourceDatabase)}`;
  source = postgres(sourceUrl.toString(), options);
  await source.begin(async (tx) => {
    await tx.unsafe(MIGRATIONS_TABLE);
    await runMigrations(tx);
  });

  const password = `cutover-${suffix}-password`;
  const salt = randomBytes(16).toString('hex');
  const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  const email = `cutover-${suffix}@example.test`;
  const inserted = await source.begin(async (tx) => {
    const account = await tx`
      INSERT INTO accounts (name, owner_email, status, created_at)
      VALUES ('Cutover Fixture', ${email}, 'active', now())
      RETURNING id::text AS id
    `;
    const user = await tx`
      INSERT INTO users (account_id, email, display_name, password_hash, email_verified_at, created_at)
      VALUES (${account[0].id}::integer, ${email}, 'Cutover Owner', ${passwordHash}, now(), now())
      RETURNING id::text AS id
    `;
    return { accountId: account[0].id, userId: user[0].id };
  });

  // A source UUID alone is not ownership evidence. Prove the planner refuses to adopt or later
  // delete a pre-existing canonical identity without its target-side ledger mapping.
  const unprovenTargetId = randomUUID();
  await admin`
    INSERT INTO users (id, email, email_hash, display_name)
    VALUES (${unprovenTargetId}::uuid, ${email}, md5(lower(${email})), 'Pre-existing Identity')
  `;
  await source`
    UPDATE users SET authority_user_id = ${unprovenTargetId}::uuid WHERE id = ${inserted.userId}::integer
  `;
  await expectRefusal('unproven-existing-target', () =>
    runCutover({ command: 'plan', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await admin`DELETE FROM users WHERE id = ${unprovenTargetId}::uuid`;
  await source`UPDATE users SET authority_user_id = NULL WHERE id = ${inserted.userId}::integer`;

  const plan = await runCutover({
    command: 'plan',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (plan.status !== 'planned' || plan.counts.accounts !== 1 || plan.counts.users !== 1) {
    throw new Error('plan did not see the exact source snapshot');
  }

  const applied = await runCutover({
    command: 'apply',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  const verified = await runCutover({
    command: 'verify',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (applied.status !== 'verified' || verified.status !== 'verified' || applied.runId !== verified.runId) {
    throw new Error('apply and independent verify did not converge on one run');
  }

  const sourceMappings = await source`
    SELECT authority_enterprise_id::text AS enterprise, authority_reconciled_at AS "enterpriseAt"
      FROM accounts WHERE id = ${inserted.accountId}::integer
  `;
  const userMappings = await source`
    SELECT authority_user_id::text AS "userId", authority_reconciled_at AS "userAt"
      FROM users WHERE id = ${inserted.userId}::integer
  `;
  if (
    !sourceMappings[0]?.enterprise ||
    !sourceMappings[0]?.enterpriseAt ||
    !userMappings[0]?.userId ||
    !userMappings[0]?.userAt
  ) {
    throw new Error('source mapping columns were not committed');
  }

  const targetRows = await admin`
    SELECT
      (SELECT count(*)::integer FROM enterprises WHERE id = ${sourceMappings[0].enterprise}::uuid) AS enterprises,
      (SELECT count(*)::integer FROM users WHERE id = ${userMappings[0].userId}::uuid) AS users,
      (SELECT count(*)::integer FROM enterprise_memberships
        WHERE enterprise_id = ${sourceMappings[0].enterprise}::uuid
          AND user_id = ${userMappings[0].userId}::uuid AND role = 'owner') AS memberships
  `;
  if (targetRows[0].enterprises !== 1 || targetRows[0].users !== 1 || targetRows[0].memberships !== 1) {
    throw new Error('target profile graph is incomplete');
  }

  await source`UPDATE users SET display_name = 'Source Drift' WHERE id = ${inserted.userId}::integer`;
  await expectRefusal('source-changed-since-target-commit', () =>
    runCutover({ command: 'verify', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await source`UPDATE users SET display_name = 'Cutover Owner' WHERE id = ${inserted.userId}::integer`;

  const rolledBack = await runCutover({
    command: 'rollback',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (rolledBack.status !== 'rolled-back') throw new Error('rollback did not report completion');

  const residue = await admin`
    SELECT
      (SELECT count(*)::integer FROM enterprises WHERE id = ${sourceMappings[0].enterprise}::uuid) AS enterprises,
      (SELECT count(*)::integer FROM users WHERE id = ${userMappings[0].userId}::uuid) AS users
  `;
  const cleared = await source`
    SELECT
      (SELECT authority_enterprise_id IS NULL FROM accounts WHERE id = ${inserted.accountId}::integer) AS enterprise,
      (SELECT authority_user_id IS NULL FROM users WHERE id = ${inserted.userId}::integer) AS "user"
  `;
  if (residue[0].enterprises !== 0 || residue[0].users !== 0 || !cleared[0].enterprise || !cleared[0].user) {
    throw new Error('rollback left source mappings or target authority rows behind');
  }

  process.stdout.write(
    `[cutover:profile:e2e] PASS ownership-refusal/plan/apply/verify/drift-refusal/rollback; migrations=${MIGRATIONS.length}; sourceDigest=${applied.sourceDigest}; targetDigest=${applied.targetDigest}\n`
  );
} finally {
  if (source) await source.end({ timeout: 2 }).catch(() => undefined);
  await admin`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ${sourceDatabase}`.catch(
    () => undefined
  );
  await admin`DROP DATABASE IF EXISTS ${admin(sourceDatabase)}`.catch(() => undefined);
  await admin.end({ timeout: 2 }).catch(() => undefined);
}
