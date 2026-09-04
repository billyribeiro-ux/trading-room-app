import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

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
    const [account] = await db
      .insert(accounts)
      .values({
        name: `projection-${suffix}`,
        ownerEmail: `projection-${suffix}@example.test`,
        createdAt: now
      })
      .returning({ id: accounts.id });
    const [owner] = await db
      .insert(users)
      .values({
        accountId: account.id,
        email: `projection-${suffix}@example.test`,
        displayName: 'Projection Owner',
        emailVerifiedAt: now,
        createdAt: now
      })
      .returning({ id: users.id });
    return { db, accountId: account.id, ownerUserId: owner.id };
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
});
