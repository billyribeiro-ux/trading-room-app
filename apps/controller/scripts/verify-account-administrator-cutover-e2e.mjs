#!/usr/bin/env node

/** Real-PostgreSQL proof of administrator ownership, conversion, drift, resume, and rollback. */

import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import postgres from 'postgres';
import { MIGRATIONS, MIGRATIONS_TABLE } from '../src/lib/server/db/migrations/index.js';
import { runMigrations } from '../src/lib/server/db/migrator.js';
import { AdministratorCutoverRefusal, runAdministratorCutover } from './cutover-account-administrator-authority.mjs';
import { runCutover } from './cutover-profile-authority.mjs';

const targetUrl = process.env.CUTOVER_TARGET_DATABASE_URL ?? process.env.MIGRATE_DATABASE_URL;
if (!targetUrl) throw new Error('CUTOVER_TARGET_DATABASE_URL or MIGRATE_DATABASE_URL is required');
const suffix = randomBytes(8).toString('hex');
const sourceDatabase = `cutover_administrator_${suffix}`;
const sourceLabel = `e2e-administrator-${suffix}`;
const sourceUrl = new URL(targetUrl);
sourceUrl.pathname = `/${sourceDatabase}`;
const options = { max: 1, prepare: false, idle_timeout: 5, connect_timeout: 10, onnotice: () => undefined };
const admin = postgres(targetUrl, options);
let source;

async function expectRefusal(code, operation) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof AdministratorCutoverRefusal && error.code === code) return;
    throw error;
  }
  throw new Error(`expected administrator cutover refusal ${code}`);
}

try {
  await admin`CREATE DATABASE ${admin(sourceDatabase)}`;
  source = postgres(sourceUrl.toString(), options);
  await source.begin(async (tx) => {
    await tx.unsafe(MIGRATIONS_TABLE);
    await runMigrations(tx);
  });

  const ownerEmail = `administrator-owner-${suffix}@example.test`;
  const adminEmail = `administrator-${suffix}@example.test`;
  const ownerSalt = randomBytes(16).toString('hex');
  const ownerHash = `${ownerSalt}:${scryptSync(`owner-${suffix}-password`, ownerSalt, 64).toString('hex')}`;
  const administratorSalt = randomBytes(16).toString('hex');
  const administratorHash = `${administratorSalt}:${scryptSync(
    `administrator-${suffix}-password`,
    administratorSalt,
    64
  ).toString('hex')}`;
  const fixture = await source.begin(async (tx) => {
    const account = await tx`
      INSERT INTO accounts (name, owner_email, status, created_at)
      VALUES ('Administrator Cutover Fixture', ${ownerEmail}, 'active', '2026-01-01T00:00:00Z')
      RETURNING id::text AS id
    `;
    await tx`
      INSERT INTO users (account_id, email, display_name, password_hash, email_verified_at, created_at)
      VALUES (${account[0].id}::integer, ${ownerEmail}, 'Administrator Owner', ${ownerHash}, now(),
              '2026-01-01T00:00:00Z')
    `;
    const administrator = await tx`
      INSERT INTO admin_users (account_id, name, email, password_hash, created_at)
      VALUES (${account[0].id}::integer, 'Imported Administrator', ${adminEmail}, ${administratorHash},
              '2026-02-01T00:00:00Z') RETURNING id::text AS id
    `;
    return { accountId: account[0].id, administratorId: administrator[0].id };
  });

  await expectRefusal('missing-profile-prerequisite', () =>
    runAdministratorCutover({ command: 'plan', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await runCutover({ command: 'apply', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });

  const unownedId = randomUUID();
  await admin`
    INSERT INTO users (id, email, email_hash, display_name)
    VALUES (${unownedId}::uuid, ${adminEmail}, md5(lower(${adminEmail})), 'Unowned Collision')
  `;
  await expectRefusal('target-email-collision', () =>
    runAdministratorCutover({ command: 'plan', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await admin`DELETE FROM users WHERE id = ${unownedId}::uuid`;

  const planned = await runAdministratorCutover({
    command: 'plan',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (planned.status !== 'planned' || planned.counts.administrators !== 1 || planned.unmapped !== 1) {
    throw new Error('administrator plan did not see the exact source snapshot');
  }
  const applied = await runAdministratorCutover({
    command: 'apply',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  const verified = await runAdministratorCutover({
    command: 'verify',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (
    applied.status !== 'verified' ||
    verified.runId !== applied.runId ||
    verified.targetDigest !== applied.targetDigest
  ) {
    throw new Error('administrator apply and independent verify did not converge');
  }

  const sourceProof = await source`
    SELECT account.authority_enterprise_id::text AS enterprise,
           administrator.authority_user_id::text AS "userId",
           administrator.authority_revision::bigint AS revision,
           administrator.authority_content_hash AS hash,
           administrator.authority_reconciled_at AS "reconciledAt"
      FROM admin_users AS administrator
      INNER JOIN accounts AS account ON account.id = administrator.account_id
     WHERE administrator.id = ${fixture.administratorId}::integer
  `;
  if (
    !sourceProof[0].enterprise ||
    !sourceProof[0].userId ||
    Number(sourceProof[0].revision) !== 0 ||
    !/^[0-9a-f]{64}$/u.test(sourceProof[0].hash) ||
    !sourceProof[0].reconciledAt
  ) {
    throw new Error('controller administrator projection proof is incomplete');
  }
  const target = await admin`
    SELECT membership.role, membership.revision::bigint AS revision,
           identity.email::text AS email, identity.password_hash AS "passwordHash"
      FROM enterprise_memberships AS membership
      INNER JOIN users AS identity ON identity.id = membership.user_id
     WHERE membership.enterprise_id = ${sourceProof[0].enterprise}::uuid
       AND membership.user_id = ${sourceProof[0].userId}::uuid
  `;
  if (
    target.length !== 1 ||
    target[0].role !== 'admin' ||
    Number(target[0].revision) !== 0 ||
    target[0].email !== adminEmail ||
    target[0].passwordHash !== administratorHash
  ) {
    throw new Error('canonical administrator identity, credential, or membership is incomplete');
  }

  await source`
    UPDATE admin_users SET name = 'Source Drift' WHERE id = ${fixture.administratorId}::integer
  `;
  await expectRefusal('source-changed-since-target-commit', () =>
    runAdministratorCutover({ command: 'verify', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await source`
    UPDATE admin_users SET name = 'Imported Administrator' WHERE id = ${fixture.administratorId}::integer
  `;

  await admin`UPDATE users SET last_login_at = now() WHERE id = ${sourceProof[0].userId}::uuid`;
  await expectRefusal('rollback-after-use', () =>
    runAdministratorCutover({ command: 'rollback', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await admin`UPDATE users SET last_login_at = NULL WHERE id = ${sourceProof[0].userId}::uuid`;

  // Simulate process loss after target ownership commit by removing only the source proof. The
  // existing target mapping must be recovered, never adopted by email or duplicated.
  await source`
    UPDATE admin_users SET authority_user_id = NULL, authority_revision = NULL,
           authority_content_hash = NULL, authority_reconciled_at = NULL
     WHERE id = ${fixture.administratorId}::integer
  `;
  const resumed = await runAdministratorCutover({
    command: 'apply',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (resumed.status !== 'verified') throw new Error('administrator source-proof resume failed');
  const identities = await admin`
    SELECT count(*)::integer AS count FROM users WHERE email = ${adminEmail}
  `;
  if (identities[0].count !== 1) throw new Error('administrator resume duplicated the canonical identity');

  const rolledBack = await runAdministratorCutover({
    command: 'rollback',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  const repeated = await runAdministratorCutover({
    command: 'rollback',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (rolledBack.status !== 'rolled-back' || repeated.status !== 'rolled-back') {
    throw new Error('administrator rollback did not converge idempotently');
  }
  const residue = await admin`
    SELECT
      (SELECT count(*)::integer FROM users WHERE id = ${sourceProof[0].userId}::uuid) AS identities,
      (SELECT count(*)::integer FROM enterprise_memberships
        WHERE enterprise_id = ${sourceProof[0].enterprise}::uuid
          AND user_id = ${sourceProof[0].userId}::uuid) AS memberships
  `;
  const cleared = await source`
    SELECT authority_user_id, authority_revision, authority_content_hash, authority_reconciled_at
      FROM admin_users WHERE id = ${fixture.administratorId}::integer
  `;
  if (
    residue[0].identities !== 0 ||
    residue[0].memberships !== 0 ||
    Object.values(cleared[0]).some((value) => value !== null)
  ) {
    throw new Error('administrator rollback left target authority or source proof residue');
  }

  await runCutover({ command: 'rollback', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });
  process.stdout.write(
    `[cutover:account-administrators:e2e] PASS prerequisite/collision/plan/apply/verify/drift/refusal/resume/rollback; migrations=${MIGRATIONS.length}; sourceDigest=${applied.sourceDigest}; targetDigest=${applied.targetDigest}\n`
  );
} finally {
  if (source) await source.end({ timeout: 2 }).catch(() => undefined);
  await admin`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ${sourceDatabase}`.catch(
    () => undefined
  );
  await admin`DROP DATABASE IF EXISTS ${admin(sourceDatabase)}`.catch(() => undefined);
  await admin.end({ timeout: 2 }).catch(() => undefined);
}
