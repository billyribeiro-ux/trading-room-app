#!/usr/bin/env node

/**
 * Real PostgreSQL proof for room-settings conversion. The profile and room prerequisites are
 * created in a randomly named controller database, then rolled back in dependency order.
 */

import { randomBytes, scryptSync } from 'node:crypto';
import postgres from 'postgres';
import { MIGRATIONS, MIGRATIONS_TABLE } from '../src/lib/server/db/migrations/index.js';
import { runMigrations } from '../src/lib/server/db/migrator.js';
import { runCutover } from './cutover-profile-authority.mjs';
import { runRoomCutover } from './cutover-room-authority.mjs';
import {
  RoomSettingsCutoverRefusal,
  normalizeSettingsDocument,
  runRoomSettingsCutover
} from './cutover-room-settings-authority.mjs';

const targetUrl = process.env.CUTOVER_TARGET_DATABASE_URL ?? process.env.MIGRATE_DATABASE_URL;
if (!targetUrl) throw new Error('CUTOVER_TARGET_DATABASE_URL or MIGRATE_DATABASE_URL is required');
const suffix = randomBytes(8).toString('hex');
const sourceDatabase = `cutover_settings_${suffix}`;
const sourceLabel = `e2e-room-settings-${suffix}`;
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
    if (error instanceof RoomSettingsCutoverRefusal && error.code === code) return;
    throw error;
  }
  throw new Error(`expected room-settings cutover refusal ${code}`);
}

const settings = { isLocked: true, name: 'Settings Cutover Room', simUserCount: 7 };

try {
  await admin`CREATE DATABASE ${admin(sourceDatabase)}`;
  source = postgres(sourceUrl.toString(), options);
  await source.begin(async (tx) => {
    await tx.unsafe(MIGRATIONS_TABLE);
    await runMigrations(tx);
  });

  const email = `settings-cutover-${suffix}@example.test`;
  const salt = randomBytes(16).toString('hex');
  const passwordHash = `${salt}:${scryptSync(`settings-${suffix}-password`, salt, 64).toString('hex')}`;
  const fixture = await source.begin(async (tx) => {
    const account = await tx`
      INSERT INTO accounts (name, owner_email, status, created_at)
      VALUES ('Settings Cutover Fixture', ${email}, 'active', '2026-01-01T00:00:00Z')
      RETURNING id::text AS id
    `;
    await tx`
      INSERT INTO users (account_id, email, display_name, password_hash, email_verified_at, created_at)
      VALUES (${account[0].id}::integer, ${email}, 'Settings Owner', ${passwordHash}, now(),
              '2026-01-01T00:00:00Z')
    `;
    const room = await tx`
      INSERT INTO rooms (account_id, short_code, name, state, max_users, created_at)
      VALUES (${account[0].id}::integer, ${`8${suffix.slice(0, 7)}`}, ${settings.name}, 'open', 250,
              '2026-01-02T00:00:00Z')
      RETURNING id::text AS id
    `;
    await tx`
      INSERT INTO room_settings (room_id, settings_json, updated_at)
      VALUES (${room[0].id}::integer, ${JSON.stringify(settings)}, '2026-01-02T00:00:00Z')
    `;
    return { roomId: room[0].id };
  });

  await runCutover({ command: 'apply', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });
  await runRoomCutover({ command: 'apply', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });
  const plan = await runRoomSettingsCutover({
    command: 'plan',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (plan.status !== 'planned' || plan.counts.roomSettings !== 1 || plan.mapped !== 0) {
    throw new Error('settings plan did not see the exact source snapshot');
  }
  const applied = await runRoomSettingsCutover({
    command: 'apply',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  const verified = await runRoomSettingsCutover({
    command: 'verify',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (applied.status !== 'verified' || verified.digest !== applied.digest || verified.runId !== applied.runId) {
    throw new Error('settings apply and independent verify did not converge');
  }

  const mapping = await source`
    SELECT authority_room_id::text AS room FROM rooms WHERE id = ${fixture.roomId}::integer
  `;
  const authority = await admin`
    SELECT settings_revision AS revision, config -> 'settings' AS settings
      FROM rooms WHERE id = ${mapping[0].room}::uuid
  `;
  const projection = await source`
    SELECT authority_revision AS revision, authority_reconciled_at AS "reconciledAt"
      FROM room_settings WHERE room_id = ${fixture.roomId}::integer
  `;
  if (
    Number(authority[0]?.revision) !== 0 ||
    JSON.stringify(normalizeSettingsDocument(authority[0]?.settings)) !==
      JSON.stringify(normalizeSettingsDocument(settings)) ||
    Number(projection[0]?.revision) !== 0 ||
    !projection[0]?.reconciledAt
  ) {
    throw new Error('settings authority and controller projection are incomplete');
  }

  await source`
    UPDATE room_settings SET settings_json = ${JSON.stringify({ ...settings, isLocked: false })}
     WHERE room_id = ${fixture.roomId}::integer
  `;
  await expectRefusal('source-changed-since-target-commit', () =>
    runRoomSettingsCutover({ command: 'verify', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await source`
    UPDATE room_settings SET settings_json = ${JSON.stringify(settings)}
     WHERE room_id = ${fixture.roomId}::integer
  `;

  await admin`
    UPDATE rooms SET config = jsonb_set(config, '{settings,isLocked}', 'false'::jsonb)
     WHERE id = ${mapping[0].room}::uuid
  `;
  await expectRefusal('target-changed-during-resume', () =>
    runRoomSettingsCutover({ command: 'apply', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  const preserved = await admin`
    SELECT config #>> '{settings,isLocked}' AS value FROM rooms WHERE id = ${mapping[0].room}::uuid
  `;
  if (preserved[0]?.value !== 'false') throw new Error('settings apply overwrote target drift before refusing');
  await admin`
    UPDATE rooms SET config = jsonb_set(config, '{settings,isLocked}', 'true'::jsonb)
     WHERE id = ${mapping[0].room}::uuid
  `;

  await admin`UPDATE rooms SET settings_revision = 1 WHERE id = ${mapping[0].room}::uuid`;
  await expectRefusal('rollback-unsafe-after-use', () =>
    runRoomSettingsCutover({ command: 'rollback', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await admin`UPDATE rooms SET settings_revision = 0 WHERE id = ${mapping[0].room}::uuid`;

  // Simulate loss after source proof is cleared and before the target transaction commits.
  await source`
    UPDATE room_settings SET authority_revision = NULL, authority_reconciled_at = NULL
     WHERE room_id = ${fixture.roomId}::integer
  `;
  const rolledBack = await runRoomSettingsCutover({
    command: 'rollback',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (rolledBack.status !== 'rolled-back') throw new Error('settings rollback did not complete');
  const residue = await admin`
    SELECT config ? 'settings' AS settings FROM rooms WHERE id = ${mapping[0].room}::uuid
  `;
  if (residue[0]?.settings) throw new Error('settings rollback left target residue');
  const repeated = await runRoomSettingsCutover({
    command: 'rollback',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (repeated.status !== 'rolled-back') throw new Error('settings rollback retry did not converge');

  await runRoomCutover({ command: 'rollback', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });
  await runCutover({ command: 'rollback', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });

  process.stdout.write(
    `[cutover:room-settings:e2e] PASS plan/apply/verify/source-drift-refusal/target-drift-no-overwrite/after-use-refusal/rollback-resume/idempotent-rollback; controllerMigrations=${MIGRATIONS.length}; digest=${applied.digest}\n`
  );
} finally {
  if (source) await source.end({ timeout: 2 }).catch(() => undefined);
  await admin`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ${sourceDatabase}`.catch(
    () => undefined
  );
  await admin`DROP DATABASE IF EXISTS ${admin(sourceDatabase)}`.catch(() => undefined);
  await admin.end({ timeout: 2 }).catch(() => undefined);
}
