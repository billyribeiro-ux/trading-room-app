#!/usr/bin/env node

/** Real-PostgreSQL proof of badge plan/apply/verify/refusal/resume/rollback semantics. */

import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import postgres from 'postgres';
import { MIGRATIONS, MIGRATIONS_TABLE } from '../src/lib/server/db/migrations/index.js';
import { runMigrations } from '../src/lib/server/db/migrator.js';
import { BadgeCutoverRefusal, runBadgeCutover } from './cutover-badge-authority.mjs';
import { runMembershipCutover } from './cutover-membership-authority.mjs';
import { runCutover } from './cutover-profile-authority.mjs';
import { runRoomCutover } from './cutover-room-authority.mjs';
import { runRoomSettingsCutover } from './cutover-room-settings-authority.mjs';

const targetUrl = process.env.CUTOVER_TARGET_DATABASE_URL ?? process.env.MIGRATE_DATABASE_URL;
if (!targetUrl) throw new Error('CUTOVER_TARGET_DATABASE_URL or MIGRATE_DATABASE_URL is required');
const suffix = randomBytes(8).toString('hex');
const sourceDatabase = `cutover_badge_${suffix}`;
const sourceLabel = `e2e-badge-${suffix}`;
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
    if (error instanceof BadgeCutoverRefusal && error.code === code) return;
    throw error;
  }
  throw new Error(`expected badge cutover refusal ${code}`);
}

try {
  await admin`CREATE DATABASE ${admin(sourceDatabase)}`;
  source = postgres(sourceUrl.toString(), options);
  await source.begin(async (tx) => {
    await tx.unsafe(MIGRATIONS_TABLE);
    await runMigrations(tx);
  });

  const ownerEmail = `badge-owner-${suffix}@example.test`;
  const memberEmail = `badge-member-${suffix}@example.test`;
  const salt = randomBytes(16).toString('hex');
  const passwordHash = `${salt}:${scryptSync(`badge-${suffix}-password`, salt, 64).toString('hex')}`;
  const fixture = await source.begin(async (tx) => {
    const account = await tx`
      INSERT INTO accounts (name, owner_email, status, created_at)
      VALUES ('Badge Cutover Fixture', ${ownerEmail}, 'active', '2026-01-01T00:00:00Z')
      RETURNING id::text AS id
    `;
    const owner = await tx`
      INSERT INTO users (account_id, email, display_name, password_hash, email_verified_at, created_at)
      VALUES (${account[0].id}::integer, ${ownerEmail}, 'Badge Owner', ${passwordHash}, now(),
              '2026-01-01T00:00:00Z') RETURNING id::text AS id
    `;
    const member = await tx`
      INSERT INTO users (account_id, email, display_name, email_verified_at, created_at)
      VALUES (${account[0].id}::integer, ${memberEmail}, 'Badge Member', now(),
              '2026-01-03T00:00:00Z') RETURNING id::text AS id
    `;
    const room = await tx`
      INSERT INTO rooms (account_id, short_code, name, state, max_users, created_at)
      VALUES (${account[0].id}::integer, ${`6${suffix.slice(0, 7)}`}, 'Badge Room', 'open', 250,
              '2026-01-02T00:00:00Z') RETURNING id::text AS id
    `;
    await tx`
      INSERT INTO room_settings (room_id, settings_json, updated_at)
      VALUES (${room[0].id}::integer, '{"isLocked":false}', '2026-01-02T00:00:00Z')
    `;
    const ownerMembership = await tx`
      INSERT INTO room_users
        (room_id, user_id, role, permissions_json, has_file_access, has_mobile_app, created_at)
      VALUES (${room[0].id}::integer, ${owner[0].id}::integer, 0,
              '{"hasMic":true,"hasScreen":true,"hasCam":true,"hasAdminChat":true,"canEditNotes":true}',
              true, true, '2026-08-01T00:00:00Z') RETURNING id::text AS id
    `;
    const memberMembership = await tx`
      INSERT INTO room_users (room_id, user_id, role, permissions_json, created_at)
      VALUES (${room[0].id}::integer, ${member[0].id}::integer, 2,
              '{"hasMic":false,"hasScreen":false,"hasCam":false}', '2026-08-02T00:00:00Z')
      RETURNING id::text AS id
    `;
    const lightBadge = await tx`
      INSERT INTO badges
        (account_id, label, text_color, background_color, emoji, auto_assign_roles_json, created_at)
      VALUES (${account[0].id}::integer, 'Momentum', '#ffffff', '#102030', '🚀',
              '["member","presenter"]', '2026-02-01T00:00:00Z') RETURNING id::text AS id
    `;
    const darkBadge = await tx`
      INSERT INTO badges
        (account_id, label, text_color, background_color, image_url, auto_assign_roles_json, created_at)
      VALUES (${account[0].id}::integer, '', '#eeeeee', 'rgba(1,0,0,0)',
              'data:image/png;base64,AQ==', '[]', '2026-02-02T00:00:00Z') RETURNING id::text AS id
    `;
    await tx`
      UPDATE badges SET dark_theme_badge_id = ${darkBadge[0].id}::integer
       WHERE id = ${lightBadge[0].id}::integer
    `;
    await tx`
      UPDATE room_users
         SET badges_json = CASE WHEN id = ${ownerMembership[0].id}::integer
                                THEN ${JSON.stringify([Number(lightBadge[0].id)])}
                                ELSE ${JSON.stringify([Number(lightBadge[0].id), Number(darkBadge[0].id)])} END
       WHERE id IN (${ownerMembership[0].id}::integer, ${memberMembership[0].id}::integer)
    `;
    return {
      accountId: account[0].id,
      roomId: room[0].id,
      lightBadgeId: lightBadge[0].id,
      darkBadgeId: darkBadge[0].id,
      ownerMembershipId: ownerMembership[0].id,
      memberMembershipId: memberMembership[0].id
    };
  });

  await runCutover({ command: 'apply', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });
  await runRoomCutover({ command: 'apply', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });
  await runRoomSettingsCutover({ command: 'apply', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });
  await runMembershipCutover({ command: 'apply', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });

  const prerequisites = await source`
    SELECT account.authority_enterprise_id::text AS enterprise,
           owner.authority_member_id::text AS "ownerMember",
           member.authority_member_id::text AS "memberMember"
      FROM accounts AS account
      INNER JOIN room_users AS owner ON owner.id = ${fixture.ownerMembershipId}::integer
      INNER JOIN room_users AS member ON member.id = ${fixture.memberMembershipId}::integer
     WHERE account.id = ${fixture.accountId}::integer
  `;
  const ownerActor = await admin`
    SELECT user_id::text AS id FROM room_members
     WHERE id = ${prerequisites[0].ownerMember}::uuid AND role = 'owner'
  `;

  // A target relation with no badge ledger cannot be adopted by the initial plan.
  const outsiderBadgeId = randomUUID();
  await admin`
    INSERT INTO enterprise_badges (id, enterprise_id, label)
    VALUES (${outsiderBadgeId}::uuid, ${prerequisites[0].enterprise}::uuid, 'Unowned target')
  `;
  await admin`
    INSERT INTO room_member_badges
      (enterprise_id, room_id, member_id, badge_id, assigned_by_user_id)
    SELECT enterprise_id, room_id, id, ${outsiderBadgeId}::uuid, ${ownerActor[0].id}::uuid
      FROM room_members WHERE id = ${prerequisites[0].memberMember}::uuid
  `;
  await expectRefusal('target-assignment-disagreement', () =>
    runBadgeCutover({ command: 'plan', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await admin`DELETE FROM room_member_badges WHERE badge_id = ${outsiderBadgeId}::uuid`;
  await admin`DELETE FROM enterprise_badges WHERE id = ${outsiderBadgeId}::uuid`;

  const planned = await runBadgeCutover({
    command: 'plan',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (
    planned.status !== 'planned' ||
    planned.counts.badges !== 2 ||
    planned.counts.assignments !== 3 ||
    planned.unmapped !== 2
  ) {
    throw new Error('badge plan did not see the exact definition and assignment snapshot');
  }
  const applied = await runBadgeCutover({
    command: 'apply',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  const verified = await runBadgeCutover({
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
    throw new Error('badge apply and independent verify did not converge');
  }

  const sourceBadges = await source`
    SELECT id::text AS legacy, authority_badge_id::text AS target,
           authority_revision::bigint AS revision, authority_content_hash AS hash
      FROM badges WHERE account_id = ${fixture.accountId}::integer ORDER BY id
  `;
  const light = sourceBadges.find((row) => row.legacy === fixture.lightBadgeId);
  const dark = sourceBadges.find((row) => row.legacy === fixture.darkBadgeId);
  if (
    sourceBadges.length !== 2 ||
    sourceBadges.some((row) => !row.target || Number(row.revision) !== 0 || !/^[0-9a-f]{64}$/.test(row.hash))
  ) {
    throw new Error('controller badge projection proof is incomplete');
  }
  const canonicalBadges = await admin`
    SELECT id::text AS id, label, dark_theme_badge_id::text AS "darkTheme", auto_assign_roles AS roles,
           revision::bigint AS revision
      FROM enterprise_badges WHERE enterprise_id = ${prerequisites[0].enterprise}::uuid ORDER BY created_at, id
  `;
  if (
    canonicalBadges.length !== 2 ||
    canonicalBadges.find((row) => row.id === light.target)?.darkTheme !== dark.target ||
    JSON.stringify(canonicalBadges.find((row) => row.id === light.target)?.roles) !==
      JSON.stringify(['member', 'presenter']) ||
    canonicalBadges.some((row) => Number(row.revision) !== 0)
  ) {
    throw new Error('canonical definitions did not preserve dark-theme, role, and revision semantics');
  }
  const assignments = await admin`
    SELECT member_id::text AS member, array_agg(badge_id::text ORDER BY badge_id) AS badges,
           bool_and(assigned_by_user_id = ${ownerActor[0].id}::uuid) AS "ownerAttributed"
      FROM room_member_badges WHERE enterprise_id = ${prerequisites[0].enterprise}::uuid
     GROUP BY member_id ORDER BY member_id
  `;
  if (
    assignments.length !== 2 ||
    assignments.reduce((count, row) => count + row.badges.length, 0) !== 3 ||
    assignments.some((row) => !row.ownerAttributed)
  ) {
    throw new Error('canonical badge assignments are incomplete or lack owner attribution');
  }

  await source`UPDATE badges SET label = 'Source drift' WHERE id = ${fixture.lightBadgeId}::integer`;
  await expectRefusal('source-changed-since-target-commit', () =>
    runBadgeCutover({ command: 'verify', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await source`UPDATE badges SET label = 'Momentum' WHERE id = ${fixture.lightBadgeId}::integer`;

  await admin`UPDATE enterprise_badges SET label = 'Target drift' WHERE id = ${light.target}::uuid`;
  await expectRefusal('target-badge-disagreement', () =>
    runBadgeCutover({ command: 'apply', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  const preserved = await admin`SELECT label FROM enterprise_badges WHERE id = ${light.target}::uuid`;
  if (preserved[0]?.label !== 'Target drift') throw new Error('badge apply overwrote canonical target drift');
  await admin`UPDATE enterprise_badges SET label = 'Momentum' WHERE id = ${light.target}::uuid`;

  await admin`UPDATE enterprise_badges SET revision = 1 WHERE id = ${light.target}::uuid`;
  await expectRefusal('rollback-after-use', () =>
    runBadgeCutover({ command: 'rollback', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel })
  );
  await admin`UPDATE enterprise_badges SET revision = 0 WHERE id = ${light.target}::uuid`;

  // Resume the bounded cross-database rollback window after source badge proof was already cleared.
  await source`
    UPDATE badges SET authority_badge_id = NULL, authority_revision = NULL,
           authority_content_hash = NULL, authority_reconciled_at = NULL
     WHERE account_id = ${fixture.accountId}::integer
  `;
  const rolledBack = await runBadgeCutover({
    command: 'rollback',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (rolledBack.status !== 'rolled-back') throw new Error('badge rollback did not complete');
  const residue = await admin`
    SELECT
      (SELECT count(*)::integer FROM enterprise_badges
        WHERE enterprise_id = ${prerequisites[0].enterprise}::uuid) AS badges,
      (SELECT count(*)::integer FROM room_member_badges
        WHERE enterprise_id = ${prerequisites[0].enterprise}::uuid) AS assignments
  `;
  const sourceResidue = await source`
    SELECT
      (SELECT count(*)::integer FROM badges WHERE account_id = ${fixture.accountId}::integer
        AND (authority_badge_id IS NOT NULL OR authority_revision IS NOT NULL
          OR authority_content_hash IS NOT NULL OR authority_reconciled_at IS NOT NULL)) AS badges,
      (SELECT count(*)::integer FROM room_users WHERE room_id = ${fixture.roomId}::integer
        AND authority_content_hash IS NULL) AS "missingMemberProofs"
  `;
  if (
    residue[0].badges !== 0 ||
    residue[0].assignments !== 0 ||
    sourceResidue[0].badges !== 0 ||
    sourceResidue[0].missingMemberProofs !== 0
  ) {
    throw new Error('badge rollback left target ownership or source projection residue');
  }
  const repeated = await runBadgeCutover({
    command: 'rollback',
    sourceUrl: sourceUrl.toString(),
    targetUrl,
    sourceLabel
  });
  if (repeated.status !== 'rolled-back') throw new Error('badge rollback retry did not converge');

  await runMembershipCutover({ command: 'rollback', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });
  await runRoomSettingsCutover({ command: 'rollback', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });
  await runRoomCutover({ command: 'rollback', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });
  await runCutover({ command: 'rollback', sourceUrl: sourceUrl.toString(), targetUrl, sourceLabel });

  process.stdout.write(
    `[cutover:badge:e2e] PASS initial-target-refusal/plan/apply/verify/source-drift-refusal/target-drift-no-overwrite/after-use-refusal/rollback-resume/idempotent-rollback; controllerMigrations=${MIGRATIONS.length}; sourceDigest=${applied.sourceDigest}; targetDigest=${applied.targetDigest}\n`
  );
} finally {
  if (source) await source.end({ timeout: 2 }).catch(() => undefined);
  await admin`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ${sourceDatabase}`.catch(
    () => undefined
  );
  await admin`DROP DATABASE IF EXISTS ${admin(sourceDatabase)}`.catch(() => undefined);
  await admin.end({ timeout: 2 }).catch(() => undefined);
}
