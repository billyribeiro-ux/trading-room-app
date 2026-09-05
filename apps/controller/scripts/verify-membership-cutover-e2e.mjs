#!/usr/bin/env node

/** Real-PostgreSQL proof of membership plan/apply/verify/refusal/resume/rollback semantics. */

import { randomBytes, scryptSync } from 'node:crypto';
import postgres from 'postgres';
import { MIGRATIONS, MIGRATIONS_TABLE } from '../src/lib/server/db/migrations/index.js';
import { runMigrations } from '../src/lib/server/db/migrator.js';
import { runCutover } from './cutover-profile-authority.mjs';
import { runRoomCutover } from './cutover-room-authority.mjs';
import { MembershipCutoverRefusal, runMembershipCutover } from './cutover-membership-authority.mjs';

const targetUrl = process.env.CUTOVER_TARGET_DATABASE_URL ?? process.env.MIGRATE_DATABASE_URL;
if (!targetUrl) throw new Error('CUTOVER_TARGET_DATABASE_URL or MIGRATE_DATABASE_URL is required');
const suffix = randomBytes(8).toString('hex');
const sourceDatabase = `cutover_membership_${suffix}`;
const sourceLabel = `e2e-membership-${suffix}`;
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
    if (error instanceof MembershipCutoverRefusal && error.code === code) return;
    throw error;
  }
  throw new Error(`expected membership cutover refusal ${code}`);
}

try {
  await admin`CREATE DATABASE ${admin(sourceDatabase)}`;
  source = postgres(sourceUrl.toString(), options);
  await source.begin(async (tx) => {
    await tx.unsafe(MIGRATIONS_TABLE);
    await runMigrations(tx);
  });

  const ownerEmail = `membership-owner-${suffix}@example.test`;
  const memberEmail = `membership-member-${suffix}@example.test`;
  const salt = randomBytes(16).toString('hex');
  const passwordHash = `${salt}:${scryptSync(`membership-${suffix}-password`, salt, 64).toString('hex')}`;
  const fixture = await source.begin(async (tx) => {
    const account = await tx`
      INSERT INTO accounts (name, owner_email, status, created_at)
      VALUES ('Membership Cutover Fixture', ${ownerEmail}, 'active', '2026-01-01T00:00:00Z')
      RETURNING id::text AS id
    `;
    const owner = await tx`
      INSERT INTO users (account_id, email, display_name, password_hash, email_verified_at, created_at)
      VALUES (${account[0].id}::integer, ${ownerEmail}, 'Membership Owner', ${passwordHash}, now(),
              '2026-01-01T00:00:00Z') RETURNING id::text AS id
    `;
    const member = await tx`
      INSERT INTO users (account_id, email, display_name, email_verified_at, created_at)
      VALUES (${account[0].id}::integer, ${memberEmail}, 'Membership Moderator', now(),
              '2026-01-03T00:00:00Z') RETURNING id::text AS id
    `;
    const room = await tx`
      INSERT INTO rooms (account_id, short_code, name, state, max_users, created_at)
      VALUES (${account[0].id}::integer, ${`7${suffix.slice(0, 7)}`}, 'Membership Room', 'open', 250,
              '2026-01-02T00:00:00Z') RETURNING id::text AS id
    `;
    const ownerMembership = await tx`
      INSERT INTO room_users
        (room_id, user_id, role, permissions_json, has_file_access, has_mobile_app, created_at)
      VALUES (${room[0].id}::integer, ${owner[0].id}::integer, 0,
              '{"hasMic":true,"hasScreen":false,"hasCam":true,"hasAdminChat":true,"canEditNotes":true}',
              true, true, '2026-08-01T00:00:00Z') RETURNING id::text AS id
    `;
    const memberMembership = await tx`
      INSERT INTO room_users
        (room_id, user_id, role, muted, non_presenter, note, is_free_trial, hide_user_count,
         hide_pers_info, deny_archives_access, restrict_pm_user, invite_status, last_login_at, created_at)
      VALUES (${room[0].id}::integer, ${member[0].id}::integer, 3, true, true, 'reviewed member', true,
              true, true, true, true, 'pending', '2026-02-02T03:04:05Z', '2026-01-03T00:00:00Z')
      RETURNING id::text AS id
    `;
    return {
      roomId: room[0].id,
      ownerMembershipId: ownerMembership[0].id,
      memberMembershipId: memberMembership[0].id
    };
  });

  await runCutover({ command: 'apply', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });
  await runRoomCutover({ command: 'apply', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });
  const planned = await runMembershipCutover({
    command: 'plan',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (planned.status !== 'planned' || planned.counts.memberships !== 2 || planned.unmapped !== 2) {
    throw new Error('membership plan did not see the exact two-row source snapshot');
  }
  const applied = await runMembershipCutover({
    command: 'apply',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  const verified = await runMembershipCutover({
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
    throw new Error('membership apply and independent verify did not converge');
  }

  const mappings = await source`
    SELECT member.id::text AS legacy, member.authority_member_id::text AS target,
           member.authority_revision::bigint AS revision, member.authority_content_hash AS hash,
           room.authority_room_id::text AS room
      FROM room_users AS member INNER JOIN rooms AS room ON room.id = member.room_id
     WHERE member.room_id = ${fixture.roomId}::integer ORDER BY member.id
  `;
  if (
    mappings.length !== 2 ||
    mappings.some((row) => !row.target || Number(row.revision) !== 0 || !/^[0-9a-f]{64}$/.test(row.hash))
  ) {
    throw new Error('controller membership projection proof is incomplete');
  }
  const memberMapping = mappings.find((row) => row.legacy === fixture.memberMembershipId);
  const ownerMapping = mappings.find((row) => row.legacy === fixture.ownerMembershipId);
  const canonical = await admin`
    SELECT role, is_muted AS muted, is_banned AS banned, approval_status AS approval,
           hide_user_count AS "hideCount", can_access_archives AS archives, revision::bigint AS revision
      FROM room_members WHERE id = ${memberMapping.target}::uuid
  `;
  if (
    canonical[0]?.role !== 'moderator' ||
    !canonical[0]?.muted ||
    canonical[0]?.banned ||
    canonical[0]?.approval !== 'pending' ||
    !canonical[0]?.hideCount ||
    canonical[0]?.archives ||
    Number(canonical[0]?.revision) !== 0
  ) {
    throw new Error('canonical membership did not preserve the reviewed legacy semantics');
  }

  await source`
    UPDATE room_users SET note = 'source drift' WHERE id = ${fixture.memberMembershipId}::integer
  `;
  await expectRefusal('source-changed-since-target-commit', () =>
    runMembershipCutover({ command: 'verify', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await source`
    UPDATE room_users SET note = 'reviewed member' WHERE id = ${fixture.memberMembershipId}::integer
  `;

  await admin`UPDATE room_members SET admin_note = 'target drift' WHERE id = ${memberMapping.target}::uuid`;
  await expectRefusal('target-changed-during-resume', () =>
    runMembershipCutover({ command: 'apply', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  const preserved = await admin`SELECT admin_note AS note FROM room_members WHERE id = ${memberMapping.target}::uuid`;
  if (preserved[0]?.note !== 'target drift') throw new Error('membership apply overwrote target drift');
  await admin`UPDATE room_members SET admin_note = 'reviewed member' WHERE id = ${memberMapping.target}::uuid`;

  await admin`UPDATE room_members SET revision = 1 WHERE id = ${memberMapping.target}::uuid`;
  await expectRefusal('rollback-after-use', () =>
    runMembershipCutover({ command: 'rollback', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await admin`UPDATE room_members SET revision = 0 WHERE id = ${memberMapping.target}::uuid`;

  // Simulate loss after clearing source proof but before the canonical rollback commits.
  await source`
    UPDATE room_users SET authority_member_id = NULL, authority_revision = NULL,
           authority_content_hash = NULL, authority_reconciled_at = NULL
     WHERE room_id = ${fixture.roomId}::integer
  `;
  const rolledBack = await runMembershipCutover({
    command: 'rollback',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (rolledBack.status !== 'rolled-back') throw new Error('membership rollback did not complete');
  const residue = await admin`
    SELECT
      (SELECT count(*)::integer FROM room_members WHERE id = ${memberMapping.target}::uuid) AS member,
      (SELECT count(*)::integer FROM room_members WHERE id = ${ownerMapping.target}::uuid AND role = 'owner'
        AND revision = 0 AND badges = '[]'::jsonb AND can_publish_mic = false) AS owner
  `;
  if (residue[0].member !== 0 || residue[0].owner !== 1) {
    throw new Error('membership rollback did not delete the member and restore the room owner');
  }
  const repeated = await runMembershipCutover({
    command: 'rollback',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (repeated.status !== 'rolled-back') throw new Error('membership rollback retry did not converge');

  await runRoomCutover({ command: 'rollback', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });
  await runCutover({ command: 'rollback', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });

  process.stdout.write(
    `[cutover:membership:e2e] PASS plan/apply/verify/source-drift-refusal/target-drift-no-overwrite/after-use-refusal/rollback-resume/idempotent-rollback; controllerMigrations=${MIGRATIONS.length}; sourceDigest=${applied.sourceDigest}; targetDigest=${applied.targetDigest}\n`
  );
} finally {
  if (source) await source.end({ timeout: 2 }).catch(() => undefined);
  await admin`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ${sourceDatabase}`.catch(
    () => undefined
  );
  await admin`DROP DATABASE IF EXISTS ${admin(sourceDatabase)}`.catch(() => undefined);
  await admin.end({ timeout: 2 }).catch(() => undefined);
}
