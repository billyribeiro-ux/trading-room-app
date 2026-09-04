#!/usr/bin/env node

/**
 * Real PostgreSQL proof for room conversion. Only a randomly named scratch controller database and
 * randomly identified canonical rows are mutated. Room rollback runs before profile rollback.
 */

import { randomBytes, scryptSync } from 'node:crypto';
import postgres from 'postgres';
import { MIGRATIONS, MIGRATIONS_TABLE } from '../src/lib/server/db/migrations/index.js';
import { runMigrations } from '../src/lib/server/db/migrator.js';
import { runCutover } from './cutover-profile-authority.mjs';
import { RoomCutoverRefusal, runRoomCutover } from './cutover-room-authority.mjs';

const targetUrl = process.env.CUTOVER_TARGET_DATABASE_URL ?? process.env.MIGRATE_DATABASE_URL;
if (!targetUrl) throw new Error('CUTOVER_TARGET_DATABASE_URL or MIGRATE_DATABASE_URL is required');
const suffix = randomBytes(8).toString('hex');
const sourceDatabase = `cutover_room_${suffix}`;
const sourceLabel = `e2e-room-${suffix}`;
const sourceUrl = new URL(targetUrl);
sourceUrl.pathname = `/${sourceDatabase}`;
const options = {
  max: 1,
  prepare: false,
  idle_timeout: 5,
  connect_timeout: 10,
  onnotice: () => undefined
};
const admin = postgres(targetUrl, options);
let source;

async function expectRefusal(code, operation) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof RoomCutoverRefusal && error.code === code) return;
    throw error;
  }
  throw new Error(`expected room cutover refusal ${code}`);
}

try {
  await admin`CREATE DATABASE ${admin(sourceDatabase)}`;
  source = postgres(sourceUrl.toString(), options);
  await source.begin(async (tx) => {
    await tx.unsafe(MIGRATIONS_TABLE);
    await runMigrations(tx);
  });

  const email = `room-cutover-${suffix}@example.test`;
  const salt = randomBytes(16).toString('hex');
  const passwordHash = `${salt}:${scryptSync(`room-${suffix}-password`, salt, 64).toString('hex')}`;
  const fixture = await source.begin(async (tx) => {
    const account = await tx`
      INSERT INTO accounts (name, owner_email, status, created_at)
      VALUES ('Room Cutover Fixture', ${email}, 'active', '2026-01-01T00:00:00Z')
      RETURNING id::text AS id
    `;
    const user = await tx`
      INSERT INTO users (account_id, email, display_name, password_hash, email_verified_at, created_at)
      VALUES (${account[0].id}::integer, ${email}, 'Room Owner', ${passwordHash}, now(), '2026-01-01T00:00:00Z')
      RETURNING id::text AS id
    `;
    const room = await tx`
      INSERT INTO rooms (account_id, short_code, name, state, max_users, archived_at, created_at)
      VALUES (${account[0].id}::integer, ${`9${suffix.slice(0, 7)}`}, 'Canonical Room', 'open', 250,
              '2026-02-01T00:00:00Z', '2026-01-02T00:00:00Z')
      RETURNING id::text AS id
    `;
    return { accountId: account[0].id, userId: user[0].id, roomId: room[0].id };
  });

  await runCutover({
    command: 'apply',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  const plan = await runRoomCutover({
    command: 'plan',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (plan.status !== 'planned' || plan.counts.rooms !== 1 || plan.unmapped !== 1) {
    throw new Error('room plan did not see the exact source snapshot');
  }
  const applied = await runRoomCutover({
    command: 'apply',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  const verified = await runRoomCutover({
    command: 'verify',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (applied.status !== 'verified' || verified.runId !== applied.runId) {
    throw new Error('room apply and independent verify did not converge');
  }

  const mapping = await source`
    SELECT room.authority_room_id::text AS room, room.authority_reconciled_at AS "roomAt",
           account.authority_enterprise_id::text AS enterprise,
           owner.authority_user_id::text AS "ownerUser"
      FROM rooms AS room
      INNER JOIN accounts AS account ON account.id = room.account_id
      INNER JOIN users AS owner ON owner.account_id = account.id AND owner.password_hash IS NOT NULL
     WHERE room.id = ${fixture.roomId}::integer
  `;
  if (!mapping[0]?.room || !mapping[0]?.roomAt) throw new Error('source room mapping was not committed');
  const graph = await admin`
    SELECT
      (SELECT count(*)::integer FROM rooms WHERE id = ${mapping[0].room}::uuid) AS rooms,
      (SELECT count(*)::integer FROM room_members WHERE room_id = ${mapping[0].room}::uuid
        AND user_id = ${mapping[0].ownerUser}::uuid AND role = 'owner') AS owners,
      (SELECT count(*)::integer FROM room_state WHERE room_id = ${mapping[0].room}::uuid) AS states
  `;
  if (graph[0].rooms !== 1 || graph[0].owners !== 1 || graph[0].states !== 1) {
    throw new Error('canonical room graph is incomplete');
  }

  await source`UPDATE rooms SET name = 'Source Drift' WHERE id = ${fixture.roomId}::integer`;
  await expectRefusal('source-changed-since-target-commit', () =>
    runRoomCutover({
      command: 'verify',
      sourceUrl: sourceUrl.toString(),
      targetUrl,
      sourceLabel
    })
  );
  await source`UPDATE rooms SET name = 'Canonical Room' WHERE id = ${fixture.roomId}::integer`;

  await admin`UPDATE rooms SET name = 'Target Drift' WHERE id = ${mapping[0].room}::uuid`;
  await expectRefusal('room-reconciliation-failed', () =>
    runRoomCutover({
      command: 'apply',
      sourceUrl: sourceUrl.toString(),
      targetUrl,
      sourceLabel
    })
  );
  const preservedDrift = await admin`
    SELECT name FROM rooms WHERE id = ${mapping[0].room}::uuid
  `;
  if (preservedDrift[0]?.name !== 'Target Drift') {
    throw new Error('room apply overwrote an owned target before refusing drift');
  }
  await admin`UPDATE rooms SET name = 'Canonical Room' WHERE id = ${mapping[0].room}::uuid`;

  await admin`
    INSERT INTO audit_log
      (enterprise_id, room_id, actor_user_id, actor_name, event_name, event_detail, target_type, target_id)
    VALUES (${mapping[0].enterprise}::uuid, ${mapping[0].room}::uuid, ${mapping[0].ownerUser}::uuid,
            'Room Owner', 'room.tested', 'negative rollback control', 'room', ${mapping[0].room}::uuid)
  `;
  await expectRefusal('rollback-after-use', () =>
    runRoomCutover({
      command: 'rollback',
      sourceUrl: sourceUrl.toString(),
      targetUrl,
      sourceLabel
    })
  );
  await admin`DELETE FROM audit_log WHERE room_id = ${mapping[0].room}::uuid`;

  // Simulate a process loss after the source-side commit but before the target-side delete. The
  // rollback must accept the already-cleared pointer and finish from its retained target ledger.
  await source`
    UPDATE rooms SET authority_room_id = NULL, authority_reconciled_at = NULL
     WHERE id = ${fixture.roomId}::integer
  `;

  const rolledBack = await runRoomCutover({
    command: 'rollback',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (rolledBack.status !== 'rolled-back') throw new Error('room rollback did not complete');
  const residue = await admin`SELECT count(*)::integer AS count FROM rooms WHERE id = ${mapping[0].room}::uuid`;
  const sourceCleared = await source`
    SELECT authority_room_id IS NULL AS cleared FROM rooms WHERE id = ${fixture.roomId}::integer
  `;
  if (residue[0].count !== 0 || !sourceCleared[0].cleared) throw new Error('room rollback left residue');
  const repeatedRollback = await runRoomCutover({
    command: 'rollback',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (repeatedRollback.status !== 'rolled-back') throw new Error('room rollback retry did not converge');

  const profileRollback = await runCutover({
    command: 'rollback',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (profileRollback.status !== 'rolled-back') throw new Error('profile rollback did not complete after rooms');

  process.stdout.write(
    `[cutover:rooms:e2e] PASS plan/apply/verify/source-drift-refusal/target-drift-no-overwrite/activity-refusal/rollback-resume/idempotent-rollback; migrations=${MIGRATIONS.length}; sourceDigest=${applied.sourceDigest}; targetDigest=${applied.targetDigest}\n`
  );
} finally {
  if (source) await source.end({ timeout: 2 }).catch(() => undefined);
  await admin`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ${sourceDatabase}`.catch(
    () => undefined
  );
  await admin`DROP DATABASE IF EXISTS ${admin(sourceDatabase)}`.catch(() => undefined);
  await admin.end({ timeout: 2 }).catch(() => undefined);
}
