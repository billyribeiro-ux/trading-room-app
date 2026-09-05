import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ManagedBadge, ManagedMember } from './tradingroom-api.generated.js';

const CLUSTER = mkdtempSync(join(tmpdir(), 'prab-'));
const DATA = join(CLUSTER, 'data');
const PORT = 55_000 + Math.floor(Math.random() * 4_000);
const URL_ = `postgres://127.0.0.1:${PORT}/proroom_badge_authority_projection_test`;

vi.mock('$app/env/private', () => ({
  get DATABASE_URL() {
    return URL_;
  },
  SUPERADMIN_EMAILS: '',
  RESEND_API_KEY: '',
  MAIL_FROM: '',
  API_KEY_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
  ROOM_BASE_URL: 'http://127.0.0.1:5174',
  ROOM_JWT_SECRET: 'test-secret-not-a-real-one',
  RECAPTCHA_SECRET_KEY: '',
  CONTROL_PLANE_MODE: '',
  PROFILE_AUTHORITY_MODE: '',
  ROOM_AUTHORITY_MODE: '',
  ROOM_SETTINGS_AUTHORITY_MODE: '',
  MEMBERSHIP_AUTHORITY_MODE: '',
  BADGE_AUTHORITY_MODE: '',
  TRADINGROOM_INTERNAL_SECRET: '',
  TRADINGROOM_API_URL: '',
  FCM_SERVICE_ACCOUNT_JSON: ''
}));

function run(binary: string, args: string[]) {
  const result = spawnSync(binary, args, { encoding: 'utf8' });
  if (result.status === 0) return;
  let serverLog = '(no server log was written)';
  try {
    serverLog = readFileSync(join(CLUSTER, 'log'), 'utf8');
  } catch {
    // The command stderr remains the primary diagnostic if PostgreSQL did not start.
  }
  throw new Error(
    `${binary} ${args.join(' ')} failed:\n${result.stderr || result.stdout}\n--- postgres log ---\n${serverLog}`
  );
}

let started = false;

beforeAll(() => {
  run('initdb', ['-D', DATA, '--auth=trust', '-E', 'UTF8']);
  run('pg_ctl', [
    '-D',
    DATA,
    '-o',
    `-p ${PORT} -c listen_addresses=127.0.0.1 -c unix_socket_directories=${CLUSTER}`,
    '-w',
    '-l',
    join(CLUSTER, 'log'),
    'start'
  ]);
  started = true;
  run('createdb', ['-h', '127.0.0.1', '-p', String(PORT), 'proroom_badge_authority_projection_test']);
}, 120_000);

afterAll(() => {
  if (started) run('pg_ctl', ['-D', DATA, '-m', 'immediate', '-w', 'stop']);
  rmSync(CLUSTER, { recursive: true, force: true });
});

const ROOM_ID = '20000000-0000-8000-8000-000000000001';
const MEMBER_ID = '40000000-0000-8000-8000-000000000001';
const LIGHT_ID = '50000000-0000-8000-8000-000000000001';
const DARK_ID = '50000000-0000-8000-8000-000000000002';

function badge(id: string, input: Partial<ManagedBadge> = {}): ManagedBadge {
  return {
    id,
    revision: 0,
    label: id === LIGHT_ID ? 'Desk' : 'Desk dark',
    textColor: '#ffffff',
    backgroundColor: '#123456',
    emoji: 'D',
    imageDataUrl: null,
    darkThemeBadgeId: null,
    autoAssignRoles: ['moderator'],
    createdAt: '2026-09-05T10:00:00Z',
    updatedAt: '2026-09-05T10:00:00Z',
    ...input
  };
}

function member(email: string, userId: string): ManagedMember {
  return {
    id: MEMBER_ID,
    roomId: ROOM_ID,
    userId,
    email,
    displayName: 'Projection Owner',
    role: 'owner',
    revision: 1,
    badges: [LIGHT_ID],
    canPublishMic: true,
    canPublishScreen: true,
    canPublishCam: true,
    canUseAdminChat: true,
    canEditNotes: true,
    canAccessFiles: true,
    canAccessArchives: true,
    isMuted: false,
    isBanned: false,
    isPmRestricted: false,
    isTrial: false,
    hidePersonalInfo: false,
    hideUserCount: false,
    isPaused: false,
    adminNote: null,
    approvalStatus: 'approved',
    hasMobileApp: false,
    hasPassword: false,
    lastSeenAt: null,
    invitedAt: null,
    joinedAt: '2026-09-05T10:00:00Z',
    createdAt: '2026-09-05T10:00:00Z'
  };
}

describe('canonical badge projection, against real PostgreSQL', () => {
  beforeAll(async () => {
    const { ensureDatabase } = await import('./db');
    await ensureDatabase();
  }, 120_000);

  async function tenant(suffix: string) {
    const { getDb } = await import('./db');
    const { accounts, users } = await import('./db/schema');
    const db = getDb();
    const email = `badge-projection-${suffix}@example.test`;
    const authorityUserId = randomUUID();
    const now = new Date('2026-09-05T12:00:00Z');
    const [account] = await db
      .insert(accounts)
      .values({ name: `badge-projection-${suffix}`, ownerEmail: email, createdAt: now })
      .returning({ id: accounts.id });
    const [owner] = await db
      .insert(users)
      .values({
        accountId: account.id,
        email,
        displayName: 'Projection Owner',
        authorityUserId,
        authorityReconciledAt: now,
        emailVerifiedAt: now,
        createdAt: now
      })
      .returning({ id: users.id });
    return { db, accountId: account.id, ownerUserId: owner.id, email, authorityUserId };
  }

  it('resolves forward dark-theme references and projects UUID assignments into local ids', async () => {
    const { projectAuthorityBadges } = await import('./badge-projection');
    const { projectAuthorityMemberships } = await import('./membership-projection');
    const { projectAuthorityRooms } = await import('./provision-room');
    const { badges, roomUsers } = await import('./db/schema');
    const world = await tenant(`forward-${Date.now()}`);
    const roomIds = await projectAuthorityRooms(world.db, {
      accountId: world.accountId,
      ownerUserId: world.ownerUserId,
      rooms: [
        {
          id: ROOM_ID,
          shortCode: `b${Date.now()}`,
          name: 'Badge Room',
          state: 'open',
          maxCapacity: 100,
          memberCount: 1,
          archivedAt: null,
          createdAt: '2026-09-05T10:00:00Z'
        }
      ]
    });
    const badgeIds = await projectAuthorityBadges({
      accountId: world.accountId,
      definitions: [badge(LIGHT_ID, { darkThemeBadgeId: DARK_ID }), badge(DARK_ID)]
    });
    const localLight = badgeIds.get(LIGHT_ID)!;
    const localDark = badgeIds.get(DARK_ID)!;
    const [projectedLight] = await world.db.select().from(badges).where(eq(badges.id, localLight));
    expect(projectedLight).toMatchObject({
      authorityBadgeId: LIGHT_ID,
      authorityRevision: 0,
      darkThemeBadgeId: localDark,
      autoAssignRolesJson: '["moderator"]'
    });

    await projectAuthorityMemberships({
      accountId: world.accountId,
      members: [member(world.email, world.authorityUserId)],
      projectBadges: true
    });
    const [projectedMember] = await world.db
      .select()
      .from(roomUsers)
      .where(eq(roomUsers.roomId, roomIds.get(ROOM_ID)!));
    expect(projectedMember.badgesJson).toBe(JSON.stringify([localLight]));
  });

  it('enforces monotonic revisions and equal-revision content identity', async () => {
    const { projectAuthorityBadges } = await import('./badge-projection');
    const world = await tenant(`revision-${Date.now()}`);
    const badgeId = randomUUID();
    await projectAuthorityBadges({ accountId: world.accountId, definitions: [badge(badgeId)] });
    await expect(
      projectAuthorityBadges({
        accountId: world.accountId,
        definitions: [badge(badgeId, { label: 'Different at revision zero' })]
      })
    ).rejects.toThrow('canonical-revision-content-mismatch');
    await projectAuthorityBadges({
      accountId: world.accountId,
      definitions: [
        badge(badgeId, {
          revision: 1,
          label: 'Revision one',
          updatedAt: '2026-09-05T11:00:00Z'
        })
      ]
    });
    await expect(projectAuthorityBadges({ accountId: world.accountId, definitions: [badge(badgeId)] })).rejects.toThrow(
      'stale-canonical-revision'
    );
  });

  it('fails a complete cutover while any legacy badge lacks canonical identity', async () => {
    const { projectAuthorityBadges } = await import('./badge-projection');
    const { badges } = await import('./db/schema');
    const world = await tenant(`legacy-${Date.now()}`);
    const badgeId = randomUUID();
    await world.db.insert(badges).values({
      accountId: world.accountId,
      label: 'Legacy only',
      createdAt: new Date('2026-09-05T10:00:00Z')
    });
    await expect(
      projectAuthorityBadges({ accountId: world.accountId, definitions: [badge(badgeId)], complete: true })
    ).rejects.toThrow('unreconciled-legacy-badge');
    expect(await world.db.select().from(badges).where(eq(badges.accountId, world.accountId))).toHaveLength(1);
  });

  it('never lets the same canonical badge identity cross tenant boundaries', async () => {
    const { projectAuthorityBadges } = await import('./badge-projection');
    const first = await tenant(`tenant-a-${Date.now()}`);
    const second = await tenant(`tenant-b-${Date.now()}`);
    const badgeId = randomUUID();
    await projectAuthorityBadges({ accountId: first.accountId, definitions: [badge(badgeId)] });
    await expect(
      projectAuthorityBadges({ accountId: second.accountId, definitions: [badge(badgeId)] })
    ).rejects.toThrow('badge-account-mismatch');
  });
});
