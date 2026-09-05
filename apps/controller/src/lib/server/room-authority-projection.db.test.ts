import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ManagedMember } from './tradingroom-api.generated.js';

// Keep the directory short: PostgreSQL's Unix-domain socket pathname is capped at 103 bytes on
// macOS, and the system temporary-directory prefix already consumes most of that budget.
const CLUSTER = mkdtempSync(join(tmpdir(), 'prap-'));
const DATA = join(CLUSTER, 'data');
const PORT = 55_000 + Math.floor(Math.random() * 4_000);
const URL_ = `postgres://127.0.0.1:${PORT}/proroom_room_authority_projection_test`;

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
  ADMINISTRATOR_AUTHORITY_MODE: '',
  CUSTOMER_API_KEY_AUTHORITY_MODE: '',
  ROOM_LAUNCH_AUTHORITY_MODE: '',
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
    // The command's own stderr remains the primary diagnostic when PostgreSQL never started.
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
  run('createdb', ['-h', '127.0.0.1', '-p', String(PORT), 'proroom_room_authority_projection_test']);
}, 120_000);

afterAll(() => {
  if (started) run('pg_ctl', ['-D', DATA, '-m', 'immediate', '-w', 'stop']);
  rmSync(CLUSTER, { recursive: true, force: true });
});

describe('canonical room projection, against real PostgreSQL', () => {
  beforeAll(async () => {
    const { ensureDatabase } = await import('./db');
    await ensureDatabase();
  }, 120_000);

  async function tenant() {
    const { getDb } = await import('./db');
    const { accounts, users } = await import('./db/schema');
    const db = getDb();
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
    const now = new Date('2026-09-04T12:00:00Z');
    const ownerEmail = `projection-${suffix}@example.test`;
    const [account] = await db
      .insert(accounts)
      .values({
        name: `projection-${suffix}`,
        ownerEmail,
        createdAt: now
      })
      .returning({ id: accounts.id });
    const [owner] = await db
      .insert(users)
      .values({
        accountId: account.id,
        email: ownerEmail,
        displayName: 'Projection Owner',
        emailVerifiedAt: now,
        createdAt: now
      })
      .returning({ id: users.id });
    return { db, accountId: account.id, ownerUserId: owner.id, ownerEmail };
  }

  function canonicalMember(input: {
    id: string;
    roomId: string;
    userId: string;
    email: string;
    displayName: string;
    role?: ManagedMember['role'];
    revision?: number;
  }): ManagedMember {
    return {
      id: input.id,
      roomId: input.roomId,
      userId: input.userId,
      email: input.email,
      displayName: input.displayName,
      role: input.role ?? 'member',
      revision: input.revision ?? 0,
      badges: [],
      canPublishMic: false,
      canPublishScreen: false,
      canPublishCam: false,
      canUseAdminChat: false,
      canEditNotes: false,
      canAccessFiles: false,
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
      joinedAt: '2026-09-04T10:00:00Z',
      createdAt: '2026-09-04T10:00:00Z'
    };
  }

  it('repairs, updates, and completes the full three-row legacy projection atomically', async () => {
    const { projectAuthorityRooms } = await import('./provision-room');
    const { rooms, roomSettings, roomUsers } = await import('./db/schema');
    const { db, accountId, ownerUserId } = await tenant();
    const authorityId = 'a0000000-0000-4000-8000-000000000001';
    const canonical = {
      id: authorityId,
      shortCode: 'canon-1',
      name: 'Canonical One',
      state: 'open' as const,
      maxCapacity: 125,
      memberCount: 1,
      archivedAt: null,
      createdAt: '2026-09-04T10:00:00Z'
    };

    const first = await projectAuthorityRooms(db, {
      accountId,
      ownerUserId,
      rooms: [canonical],
      complete: false,
      now: new Date('2026-09-04T12:30:00Z')
    });
    const localId = first.get(authorityId);
    expect(localId).toBeTypeOf('number');
    expect(await db.select().from(roomUsers).where(eq(roomUsers.roomId, localId!))).toHaveLength(1);
    expect(await db.select().from(roomSettings).where(eq(roomSettings.roomId, localId!))).toHaveLength(1);

    await projectAuthorityRooms(db, {
      accountId,
      ownerUserId,
      rooms: [
        {
          ...canonical,
          name: 'Canonical Updated',
          state: 'locked',
          archivedAt: '2026-09-04T13:00:00Z'
        }
      ],
      now: new Date('2026-09-04T13:30:00Z')
    });
    const projected = await db.select().from(rooms).where(eq(rooms.id, localId!));
    expect(projected).toHaveLength(1);
    expect(projected[0]).toMatchObject({
      authorityRoomId: authorityId,
      name: 'Canonical Updated',
      state: 'locked',
      maxUsers: 125
    });
    expect(projected[0].archivedAt?.toISOString()).toBe('2026-09-04T13:00:00.000Z');
  });

  it('fails closed on unmapped legacy rooms and missing canonical targets', async () => {
    const { projectAuthorityRooms, provisionRoom } = await import('./provision-room');
    const { db, accountId, ownerUserId } = await tenant();
    const canonical = {
      id: 'b0000000-0000-4000-8000-000000000001',
      shortCode: 'canon-2',
      name: 'Canonical Two',
      state: 'open' as const,
      maxCapacity: 100,
      memberCount: 1,
      archivedAt: null,
      createdAt: '2026-09-04T10:00:00Z'
    };
    await projectAuthorityRooms(db, {
      accountId,
      ownerUserId,
      rooms: [canonical],
      complete: false
    });

    await expect(projectAuthorityRooms(db, { accountId, ownerUserId, rooms: [] })).rejects.toMatchObject({
      code: 'legacy-room-missing-from-authority'
    });

    await provisionRoom(db, {
      accountId,
      ownerUserId,
      name: 'Unreconciled Legacy Room'
    });
    await expect(projectAuthorityRooms(db, { accountId, ownerUserId, rooms: [canonical] })).rejects.toMatchObject({
      code: 'unreconciled-legacy-room'
    });
  });

  it('converges simultaneous first projections without duplicating or exposing another account', async () => {
    const { projectAuthorityRooms } = await import('./provision-room');
    const { roomSettings, rooms, roomUsers } = await import('./db/schema');
    const { db, accountId, ownerUserId } = await tenant();
    const canonical = {
      id: 'c0000000-0000-4000-8000-000000000001',
      shortCode: 'canon-race',
      name: 'Concurrent Canonical Room',
      state: 'open' as const,
      maxCapacity: 100,
      memberCount: 1,
      archivedAt: null,
      createdAt: '2026-09-04T10:00:00Z'
    };

    const [first, second] = await Promise.all([
      projectAuthorityRooms(db, { accountId, ownerUserId, rooms: [canonical], complete: false }),
      projectAuthorityRooms(db, { accountId, ownerUserId, rooms: [canonical], complete: false })
    ]);
    expect(first.get(canonical.id)).toBe(second.get(canonical.id));
    const projected = await db.select().from(rooms).where(eq(rooms.authorityRoomId, canonical.id));
    expect(projected).toHaveLength(1);
    expect(await db.select().from(roomUsers).where(eq(roomUsers.roomId, projected[0].id))).toHaveLength(1);
    expect(await db.select().from(roomSettings).where(eq(roomSettings.roomId, projected[0].id))).toHaveLength(1);
  });

  it('refuses an owner identity from another local account', async () => {
    const { projectAuthorityRooms } = await import('./provision-room');
    const first = await tenant();
    const second = await tenant();
    await expect(
      projectAuthorityRooms(first.db, {
        accountId: first.accountId,
        ownerUserId: second.ownerUserId,
        rooms: [],
        complete: false
      })
    ).rejects.toMatchObject({ code: 'owner-account-mismatch' });
  });

  it('projects only monotonic, content-stable canonical settings revisions', async () => {
    const { projectAuthorityRooms } = await import('./provision-room');
    const { projectAuthoritySettings } = await import('./rooms');
    const { roomSettings, rooms } = await import('./db/schema');
    const { db, accountId, ownerUserId } = await tenant();
    const authorityId = 'd0000000-0000-4000-8000-000000000001';
    const mapping = await projectAuthorityRooms(db, {
      accountId,
      ownerUserId,
      rooms: [
        {
          id: authorityId,
          shortCode: 'settings-projection',
          name: 'Before',
          state: 'open',
          maxCapacity: 100,
          memberCount: 1,
          archivedAt: null,
          createdAt: '2026-09-04T10:00:00Z'
        }
      ],
      complete: false
    });
    const roomId = mapping.get(authorityId)!;

    await projectAuthoritySettings(roomId, authorityId, 4, { name: 'Canonical', isLocked: true });
    const [projected] = await db.select().from(roomSettings).where(eq(roomSettings.roomId, roomId));
    expect(projected.authorityRevision).toBe(4);
    expect(projected.authorityReconciledAt).toBeInstanceOf(Date);
    expect(JSON.parse(projected.settingsJson)).toEqual({ name: 'Canonical', isLocked: true });
    expect((await db.select().from(rooms).where(eq(rooms.id, roomId)))[0].name).toBe('Canonical');

    await expect(projectAuthoritySettings(roomId, authorityId, 3, { name: 'Old' })).rejects.toThrow(
      'stale authority settings response'
    );
    await expect(projectAuthoritySettings(roomId, authorityId, 4, { name: 'Different' })).rejects.toThrow(
      'authority settings revision content mismatch'
    );
    await expect(
      projectAuthoritySettings(roomId, 'e0000000-0000-4000-8000-000000000001', 5, { name: 'Wrong room' })
    ).rejects.toThrow('room authority mapping mismatch');
  });

  it('projects complete canonical membership monotonically while preserving later-slice fields', async () => {
    const { projectAuthorityRooms } = await import('./provision-room');
    const { projectAuthorityMemberships } = await import('./membership-projection');
    const { roomUsers, users } = await import('./db/schema');
    const { db, accountId, ownerUserId, ownerEmail } = await tenant();
    const authorityRoomId = 'f0000000-0000-4000-8000-000000000001';
    const [localRoomId] = (
      await projectAuthorityRooms(db, {
        accountId,
        ownerUserId,
        rooms: [
          {
            id: authorityRoomId,
            shortCode: 'member-projection',
            name: 'Member Projection',
            state: 'open',
            maxCapacity: 100,
            memberCount: 2,
            archivedAt: null,
            createdAt: '2026-09-04T10:00:00Z'
          }
        ],
        complete: false
      })
    ).values();
    const owner = canonicalMember({
      id: 'f1000000-0000-4000-8000-000000000001',
      roomId: authorityRoomId,
      userId: 'f2000000-0000-4000-8000-000000000001',
      email: ownerEmail,
      displayName: 'Canonical Owner',
      role: 'owner'
    });
    const member = canonicalMember({
      id: 'f1000000-0000-4000-8000-000000000002',
      roomId: authorityRoomId,
      userId: 'f2000000-0000-4000-8000-000000000002',
      email: 'canonical-member@example.test',
      displayName: 'Canonical Member'
    });

    const mapping = await projectAuthorityMemberships({
      accountId,
      members: [owner, member],
      completeAuthorityRoomId: authorityRoomId,
      now: new Date('2026-09-04T12:00:00Z')
    });
    expect(mapping.size).toBe(2);
    const [ownerIdentity] = await db.select().from(users).where(eq(users.id, ownerUserId));
    expect(ownerIdentity).toMatchObject({ authorityUserId: owner.userId, displayName: 'Canonical Owner' });

    const memberLocalId = mapping.get(member.id)!;
    await db
      .update(roomUsers)
      .set({
        badgesJson: '[7]',
        phone: '+15555550123',
        discordUserId: 'discord-1',
        pushTokensJson: '[{"token":"device-secret","platform":"ios","addedAt":1}]'
      })
      .where(eq(roomUsers.id, memberLocalId));
    const updated = {
      ...member,
      revision: 1,
      role: 'moderator' as const,
      isBanned: true,
      canPublishMic: true,
      canAccessArchives: false,
      adminNote: 'reviewed',
      lastSeenAt: '2026-09-04T13:00:00Z'
    };
    await projectAuthorityMemberships({ accountId, members: [updated] });
    const [projected] = await db.select().from(roomUsers).where(eq(roomUsers.id, memberLocalId));
    expect(projected).toMatchObject({
      authorityMemberId: member.id,
      authorityRevision: 1,
      role: 4,
      banned: true,
      nonPresenter: true,
      denyArchivesAccess: true,
      note: 'reviewed',
      badgesJson: '[7]',
      phone: '+15555550123',
      discordUserId: 'discord-1'
    });
    expect(projected.authorityContentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(projected.lastLoginAt?.toISOString()).toBe('2026-09-04T13:00:00.000Z');

    await expect(
      projectAuthorityMemberships({ accountId, members: [{ ...updated, revision: 0 }] })
    ).rejects.toMatchObject({
      code: 'stale-canonical-revision'
    });
    await expect(
      projectAuthorityMemberships({ accountId, members: [{ ...updated, displayName: 'Different' }] })
    ).rejects.toMatchObject({ code: 'canonical-revision-content-mismatch' });

    await projectAuthorityMemberships({
      accountId,
      members: [owner],
      completeAuthorityRoomId: authorityRoomId
    });
    expect(await db.select().from(roomUsers).where(eq(roomUsers.roomId, localRoomId!))).toHaveLength(1);
  });

  it('refuses a complete membership projection while any legacy row is unreconciled', async () => {
    const { projectAuthorityRooms } = await import('./provision-room');
    const { projectAuthorityMemberships } = await import('./membership-projection');
    const { roomUsers, users } = await import('./db/schema');
    const { db, accountId, ownerUserId, ownerEmail } = await tenant();
    const authorityRoomId = 'f3000000-0000-4000-8000-000000000001';
    const mapping = await projectAuthorityRooms(db, {
      accountId,
      ownerUserId,
      rooms: [
        {
          id: authorityRoomId,
          shortCode: 'member-unreconciled',
          name: 'Member Unreconciled',
          state: 'open',
          maxCapacity: 100,
          memberCount: 2,
          archivedAt: null,
          createdAt: '2026-09-04T10:00:00Z'
        }
      ],
      complete: false
    });
    const roomId = mapping.get(authorityRoomId)!;
    const [legacyUser] = await db
      .insert(users)
      .values({
        accountId,
        email: `legacy-${Date.now()}@example.test`,
        displayName: 'Legacy Only',
        createdAt: new Date()
      })
      .returning({ id: users.id });
    await db.insert(roomUsers).values({ roomId, userId: legacyUser.id, createdAt: new Date() });
    const owner = canonicalMember({
      id: 'f4000000-0000-4000-8000-000000000001',
      roomId: authorityRoomId,
      userId: 'f5000000-0000-4000-8000-000000000001',
      email: ownerEmail,
      displayName: 'Owner',
      role: 'owner'
    });
    await expect(
      projectAuthorityMemberships({ accountId, members: [owner], completeAuthorityRoomId: authorityRoomId })
    ).rejects.toMatchObject({ code: 'unreconciled-legacy-member' });
    expect(await db.select().from(roomUsers).where(eq(roomUsers.roomId, roomId))).toHaveLength(2);
  });
});
