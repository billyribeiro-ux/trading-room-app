#!/usr/bin/env node

/** Real-PostgreSQL proof of API-key ownership, conversion, drift, resume, and rollback. */

import { createHash, randomBytes, scryptSync } from 'node:crypto';
import postgres from 'postgres';
import { MIGRATIONS, MIGRATIONS_TABLE } from '../src/lib/server/db/migrations/index.js';
import { runMigrations } from '../src/lib/server/db/migrator.js';
import { CustomerApiKeyCutoverRefusal, runCustomerApiKeyCutover } from './cutover-customer-api-key-authority.mjs';
import { runCutover } from './cutover-profile-authority.mjs';

const targetUrl = process.env.CUTOVER_TARGET_DATABASE_URL ?? process.env.MIGRATE_DATABASE_URL;
if (!targetUrl) throw new Error('CUTOVER_TARGET_DATABASE_URL or MIGRATE_DATABASE_URL is required');
const suffix = randomBytes(8).toString('hex');
const sourceDatabase = `cutover_customer_key_${suffix}`;
const sourceLabel = `e2e-customer-key-${suffix}`;
const sourceUrl = new URL(targetUrl);
sourceUrl.pathname = `/${sourceDatabase}`;
const options = { max: 1, prepare: false, idle_timeout: 5, connect_timeout: 10, onnotice: () => undefined };
const admin = postgres(targetUrl, options);
let source;

async function expectRefusal(code, operation) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof CustomerApiKeyCutoverRefusal && error.code === code) return;
    throw error;
  }
  throw new Error(`expected customer API-key cutover refusal ${code}`);
}

try {
  await admin`CREATE DATABASE ${admin(sourceDatabase)}`;
  source = postgres(sourceUrl.toString(), options);
  await source.begin(async (tx) => {
    await tx.unsafe(MIGRATIONS_TABLE);
    await runMigrations(tx);
  });

  const ownerEmail = `customer-key-owner-${suffix}@example.test`;
  const ownerSalt = randomBytes(16).toString('hex');
  const ownerHash = `${ownerSalt}:${scryptSync(`owner-${suffix}-password`, ownerSalt, 64).toString('hex')}`;
  const keyId = randomBytes(12).toString('hex');
  const secret = randomBytes(32).toString('hex');
  const secretHash = createHash('sha256').update(secret).digest('hex');
  const lastFour = secret.slice(-4);
  const secretCiphertext = `v1.${randomBytes(12).toString('base64url')}.${randomBytes(32).toString('base64url')}.${randomBytes(16).toString('base64url')}`;
  const roomCode = `key-room-${suffix}`;
  const fixture = await source.begin(async (tx) => {
    const account = await tx`
      INSERT INTO accounts (name, owner_email, status, created_at)
      VALUES ('Customer Key Cutover Fixture', ${ownerEmail}, 'active', '2026-01-01T00:00:00Z')
      RETURNING id::text AS id
    `;
    await tx`
      INSERT INTO users (account_id, email, display_name, password_hash, email_verified_at, created_at)
      VALUES (${account[0].id}::integer, ${ownerEmail}, 'Customer Key Owner', ${ownerHash}, now(),
              '2026-01-01T00:00:00Z')
    `;
    await tx`
      INSERT INTO rooms (account_id, short_code, name, created_at)
      VALUES (${account[0].id}::integer, ${roomCode}, 'Customer Key Room', '2026-01-15T00:00:00Z')
    `;
    await tx`
      INSERT INTO api_keys
        (id, account_id, secret_hash, last_four, secret_ciphertext, created_at, restrictions_json)
      VALUES (${keyId}, ${account[0].id}::integer, ${secretHash}, ${lastFour}, ${secretCiphertext},
              '2026-02-01T00:00:00Z',
              ${JSON.stringify({ ips: ['192.0.2.8/32'], scopes: ['sessions/list'], sessions: [roomCode] })})
    `;
    return { accountId: account[0].id };
  });

  await expectRefusal('missing-profile-prerequisite', () =>
    runCustomerApiKeyCutover({ command: 'plan', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await runCutover({ command: 'apply', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });

  await source`UPDATE api_keys SET secret_ciphertext = NULL WHERE id = ${keyId}`;
  await expectRefusal('unrecoverable-legacy-secret', () =>
    runCustomerApiKeyCutover({ command: 'plan', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await source`UPDATE api_keys SET secret_ciphertext = ${secretCiphertext} WHERE id = ${keyId}`;

  const mapping = await source`
    SELECT authority_enterprise_id::text AS enterprise FROM accounts WHERE id = ${fixture.accountId}::integer
  `;
  const enterpriseId = mapping[0].enterprise;
  await admin`
    INSERT INTO customer_api_keys
      (enterprise_id, id, secret_hash, last_four, created_at, updated_at)
    VALUES (${enterpriseId}::uuid, ${keyId}, ${'0'.repeat(64)}, '0000', now(), now())
  `;
  await expectRefusal('target-key-collision', () =>
    runCustomerApiKeyCutover({ command: 'plan', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await admin`DELETE FROM customer_api_keys WHERE enterprise_id = ${enterpriseId}::uuid AND id = ${keyId}`;

  const planned = await runCustomerApiKeyCutover({
    command: 'plan',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (planned.status !== 'planned' || planned.counts.customerApiKeys !== 1 || planned.unmapped !== 1) {
    throw new Error('customer API-key plan did not see the exact source snapshot');
  }
  const applied = await runCustomerApiKeyCutover({
    command: 'apply',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  const verified = await runCustomerApiKeyCutover({
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
    throw new Error('customer API-key apply and independent verify did not converge');
  }

  const sourceProof = await source`
    SELECT authority_revision::bigint AS revision, authority_content_hash AS hash,
           authority_reconciled_at AS "reconciledAt", secret_ciphertext AS "secretCiphertext"
      FROM api_keys WHERE id = ${keyId}
  `;
  if (
    Number(sourceProof[0].revision) !== 0 ||
    !/^[0-9a-f]{64}$/u.test(sourceProof[0].hash) ||
    !sourceProof[0].reconciledAt ||
    sourceProof[0].secretCiphertext !== secretCiphertext
  ) {
    throw new Error('controller API-key projection proof or retained ciphertext is incomplete');
  }
  const target = await admin`
    SELECT revision::bigint AS revision, secret_hash::text AS "secretHash", last_four::text AS "lastFour",
           restrictions, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM customer_api_keys WHERE enterprise_id = ${enterpriseId}::uuid AND id = ${keyId}
  `;
  if (
    target.length !== 1 ||
    Number(target[0].revision) !== 0 ||
    target[0].secretHash !== secretHash ||
    target[0].lastFour !== lastFour ||
    JSON.stringify(target[0].restrictions) !==
      JSON.stringify({ ips: ['192.0.2.8/32'], scopes: ['sessions/list'], sessions: [roomCode] }) ||
    target[0].createdAt.toISOString() !== '2026-02-01T00:00:00.000Z' ||
    target[0].updatedAt.toISOString() !== '2026-02-01T00:00:00.000Z'
  ) {
    throw new Error('canonical customer API-key verifier metadata is incomplete');
  }

  await source`UPDATE api_keys SET restrictions_json = '{}' WHERE id = ${keyId}`;
  await expectRefusal('source-changed-since-target-commit', () =>
    runCustomerApiKeyCutover({ command: 'verify', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await source`
    UPDATE api_keys SET restrictions_json = ${JSON.stringify({
      ips: ['192.0.2.8/32'],
      scopes: ['sessions/list'],
      sessions: [roomCode]
    })} WHERE id = ${keyId}
  `;

  await admin`
    UPDATE customer_api_keys SET last_used_at = now()
     WHERE enterprise_id = ${enterpriseId}::uuid AND id = ${keyId}
  `;
  await expectRefusal('rollback-after-use', () =>
    runCustomerApiKeyCutover({ command: 'rollback', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await admin`ALTER TABLE customer_api_keys DISABLE TRIGGER customer_api_keys_set_updated_at`;
  await admin`
    UPDATE customer_api_keys SET last_used_at = NULL, updated_at = created_at
     WHERE enterprise_id = ${enterpriseId}::uuid AND id = ${keyId}
  `;
  await admin`ALTER TABLE customer_api_keys ENABLE TRIGGER customer_api_keys_set_updated_at`;

  // Simulate process loss after target commit: target rows and ownership survive while source
  // proof does not. The retry must reuse that exact ownership and never duplicate the key.
  await source`
    UPDATE api_keys SET authority_revision = NULL, authority_content_hash = NULL,
           authority_reconciled_at = NULL WHERE id = ${keyId}
  `;
  await admin`
    UPDATE legacy_cutover_runs SET status = 'target-committed', verified_at = NULL
     WHERE id = ${applied.runId}::uuid
  `;
  await admin`
    UPDATE legacy_entity_mappings SET verified_at = NULL
     WHERE run_id = ${applied.runId}::uuid AND entity_type = 'customer-api-key'
  `;
  const resumed = await runCustomerApiKeyCutover({
    command: 'apply',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  const keyCount = await admin`
    SELECT count(*)::integer AS count FROM customer_api_keys
     WHERE enterprise_id = ${enterpriseId}::uuid AND id = ${keyId}
  `;
  if (resumed.runId !== applied.runId || resumed.status !== 'verified' || keyCount[0].count !== 1) {
    throw new Error('customer API-key target-commit/source-proof resume failed');
  }

  const rolledBack = await runCustomerApiKeyCutover({
    command: 'rollback',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  const repeated = await runCustomerApiKeyCutover({
    command: 'rollback',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  const residue = await admin`
    SELECT count(*)::integer AS count FROM customer_api_keys
     WHERE enterprise_id = ${enterpriseId}::uuid AND id = ${keyId}
  `;
  const cleared = await source`
    SELECT authority_revision AS "authorityRevision", authority_content_hash AS "authorityContentHash",
           authority_reconciled_at AS "authorityReconciledAt",
           secret_hash AS "secretHash", secret_ciphertext AS "secretCiphertext"
      FROM api_keys WHERE id = ${keyId}
  `;
  if (
    rolledBack.status !== 'rolled-back' ||
    repeated.status !== 'rolled-back' ||
    residue[0].count !== 0 ||
    cleared[0].authorityRevision !== null ||
    cleared[0].authorityContentHash !== null ||
    cleared[0].authorityReconciledAt !== null ||
    cleared[0].secretHash !== secretHash ||
    cleared[0].secretCiphertext !== secretCiphertext
  ) {
    throw new Error('customer API-key rollback left authority residue or damaged the source credential');
  }

  await runCutover({ command: 'rollback', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });
  process.stdout.write(
    `[cutover:customer-api-keys:e2e] PASS prerequisite/recoverability/collision/plan/apply/verify/drift/refusal/resume/rollback; migrations=${MIGRATIONS.length}; sourceDigest=${applied.sourceDigest}; targetDigest=${applied.targetDigest}\n`
  );
} finally {
  if (source) await source.end({ timeout: 2 }).catch(() => undefined);
  await admin`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ${sourceDatabase}`.catch(
    () => undefined
  );
  await admin`DROP DATABASE IF EXISTS ${admin(sourceDatabase)}`.catch(() => undefined);
  await admin.end({ timeout: 2 }).catch(() => undefined);
}
