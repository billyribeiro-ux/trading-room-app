import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * The OBS / XSplit publish credential, against a real PostgreSQL.
 *
 * `stream-ingest.test.ts` covers the pure halves — the sanitiser, the signature, the claim checks
 * and which field the token is read from. None of those can prove the property the whole design
 * rests on, because it is a property of the DATABASE:
 *
 *   **Pressing "New Link" must make the previous key stop working, immediately and permanently.**
 *
 * That is enforced by `UNIQUE (room_id, user_id)` plus an upsert, so the successor replaces the
 * predecessor in one statement. A stub cannot show that: it would happily hold two rows, and the
 * bug — a revoked stream key that still publishes — would only appear in production, silently, to
 * whoever had a copy of the old one.
 *
 * Same harness as the other `.db` cases: `initdb` into a temp directory, a random high port bound
 * to 127.0.0.1 only, then stop and delete. It needs a local PostgreSQL binary, which CI does not
 * have, so `vite.config.ts` excludes `*.db.test.ts` from the default run and `pnpm test:db`
 * invokes it on purpose.
 */

const CLUSTER = mkdtempSync(join(tmpdir(), 'proroom-ingest-'));
const DATA = join(CLUSTER, 'data');
const PORT = 55_000 + Math.floor(Math.random() * 4_000);
const URL_ = `postgres://127.0.0.1:${PORT}/proroom_ingest_test`;
const SECRET = 'test-secret-not-a-real-one';

vi.mock('$app/env/private', () => ({
  get DATABASE_URL() {
    return URL_;
  },
  SUPERADMIN_EMAILS: '',
  RESEND_API_KEY: '',
  MAIL_FROM: '',
  API_KEY_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
  ROOM_BASE_URL: 'http://127.0.0.1:5174',
  ROOM_JWT_SECRET: SECRET,
  STREAM_SERVER_MTX: '',
  RECAPTCHA_SECRET_KEY: '',
  CONTROL_PLANE_MODE: '',
  FCM_SERVICE_ACCOUNT_JSON: ''
}));

function run(binary: string, args: string[]) {
  const result = spawnSync(binary, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    let serverLog: string;
    try {
      serverLog = readFileSync(join(CLUSTER, 'log'), 'utf8');
    } catch {
      serverLog = '(no server log was written)';
    }
    throw new Error(
      `${binary} ${args.join(' ')} failed:\n${result.stderr || result.stdout}\n--- postgres log ---\n${serverLog}`
    );
  }
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
  run('createdb', ['-h', '127.0.0.1', '-p', String(PORT), 'proroom_ingest_test']);
}, 120_000);

afterAll(() => {
  if (started) run('pg_ctl', ['-D', DATA, '-m', 'immediate', '-w', 'stop']);
  rmSync(CLUSTER, { recursive: true, force: true });
});

/** One account, one owner, one room, and the owner's membership in it. */
async function room(slug: string) {
  const { ensureDatabase, getDb } = await import('./db');
  const { accounts, users } = await import('./db/schema');
  const { provisionRoom } = await import('./provision-room');
  await ensureDatabase();
  const db = getDb();
  const now = new Date();
  const email = `${slug}@example.test`;

  const [account] = await db
    .insert(accounts)
    .values({ name: slug, ownerEmail: email, createdAt: now })
    .returning({ id: accounts.id });
  const [user] = await db
    .insert(users)
    .values({
      accountId: account.id,
      email,
      displayName: slug,
      emailVerifiedAt: now,
      createdAt: now
    })
    .returning({ id: users.id });

  const provisioned = await provisionRoom(db, { accountId: account.id, ownerUserId: user.id });
  return { db, userId: user.id, roomId: provisioned.id, shortCode: provisioned.shortCode };
}

describe('the stream ingest key, against a real database', () => {
  it('mints a key that authorises the path it was minted for', async () => {
    const { mintRoomIngestKey, decideIngestAuth, ingestPathFor } = await import('./stream-ingest');
    const { roomId, userId, shortCode } = await room('ingest-mint');

    const path = ingestPathFor(shortCode, 'Dana Vero');
    const minted = await mintRoomIngestKey(SECRET, { roomId, userId, ingestPath: path });

    expect(minted.ingestPath).toBe(path);
    await expect(decideIngestAuth(SECRET, { token: minted.rtmpToken, path, action: 'publish' })).resolves.toEqual({
      allowed: true,
      scope: 'publish',
      roomId,
      userId
    });
  });

  /*
    THE central property. Rotation is not "the old key expires soon" — it is gone the moment the
    new one exists.
  */
  it('makes the previous key stop working the instant a new one is minted', async () => {
    const { mintRoomIngestKey, decideIngestAuth, ingestPathFor } = await import('./stream-ingest');
    const { roomId, userId, shortCode } = await room('ingest-rotate');

    const path = ingestPathFor(shortCode, 'Dana');
    const first = await mintRoomIngestKey(SECRET, { roomId, userId, ingestPath: path });
    const second = await mintRoomIngestKey(SECRET, { roomId, userId, ingestPath: path });

    expect(second.rtmpToken).not.toBe(first.rtmpToken);

    await expect(decideIngestAuth(SECRET, { token: second.rtmpToken, path, action: 'publish' })).resolves.toMatchObject(
      { allowed: true }
    );
    await expect(decideIngestAuth(SECRET, { token: first.rtmpToken, path, action: 'publish' })).resolves.toEqual({
      allowed: false,
      reason: 'revoked'
    });
  });

  /* One live key per presenter per room — rotation UPDATES, it does not accumulate. */
  it('never leaves a second row behind for the same presenter', async () => {
    const { getDb } = await import('./db');
    const { streamIngestKeys } = await import('./db/schema');
    const { and, eq } = await import('drizzle-orm');
    const { mintRoomIngestKey, ingestPathFor } = await import('./stream-ingest');
    const { roomId, userId, shortCode } = await room('ingest-single');

    const path = ingestPathFor(shortCode, 'Dana');
    for (let i = 0; i < 4; i += 1) {
      await mintRoomIngestKey(SECRET, { roomId, userId, ingestPath: path });
    }

    const rows = await getDb()
      .select({ id: streamIngestKeys.id })
      .from(streamIngestKeys)
      .where(and(eq(streamIngestKeys.roomId, roomId), eq(streamIngestKeys.userId, userId)));

    expect(rows).toHaveLength(1);
  });

  /*
    A key minted for one path may not publish to another, even inside the same room. The token's
    `sub` is checked before the query, so this is refused without a database read at all.
  */
  it('refuses a key presented against a different path', async () => {
    const { mintRoomIngestKey, decideIngestAuth, ingestPathFor } = await import('./stream-ingest');
    const { roomId, userId, shortCode } = await room('ingest-path');

    const mine = ingestPathFor(shortCode, 'Dana');
    const minted = await mintRoomIngestKey(SECRET, { roomId, userId, ingestPath: mine });

    await expect(
      decideIngestAuth(SECRET, {
        token: minted.rtmpToken,
        path: ingestPathFor(shortCode, 'Someone Else'),
        action: 'publish'
      })
    ).resolves.toEqual({ allowed: false, reason: 'path-mismatch' });
  });

  /* Two rooms, two presenters: neither token may reach the other's path. */
  it('does not let one room’s key publish into another room', async () => {
    const { mintRoomIngestKey, decideIngestAuth, ingestPathFor } = await import('./stream-ingest');
    const a = await room('ingest-tenant-a');
    const b = await room('ingest-tenant-b');

    const pathA = ingestPathFor(a.shortCode, 'Dana');
    const pathB = ingestPathFor(b.shortCode, 'Dana');
    const keyA = await mintRoomIngestKey(SECRET, { roomId: a.roomId, userId: a.userId, ingestPath: pathA });

    await expect(decideIngestAuth(SECRET, { token: keyA.rtmpToken, path: pathB, action: 'publish' })).resolves.toEqual({
      allowed: false,
      reason: 'path-mismatch'
    });
  });

  /*
    Deleting the room takes its publish credentials with it — `ON DELETE CASCADE`.

    `room_settings` and `room_users` are cleared first because THEY do not cascade, so a bare
    `DELETE FROM rooms` is refused by their foreign keys. That is this repository's existing shape
    and not what is under test here; the point being proved is that `stream_ingest_keys` needs no
    such cleanup, because a credential outliving the room it opens is the failure mode that
    matters.
  */
  it('revokes every key when the room is deleted', async () => {
    const { getDb } = await import('./db');
    const { roomSettings, roomUsers, rooms } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');
    const { mintRoomIngestKey, decideIngestAuth, ingestPathFor } = await import('./stream-ingest');
    const { roomId, userId, shortCode } = await room('ingest-cascade');

    const path = ingestPathFor(shortCode, 'Dana');
    const minted = await mintRoomIngestKey(SECRET, { roomId, userId, ingestPath: path });
    await getDb().delete(roomSettings).where(eq(roomSettings.roomId, roomId));
    await getDb().delete(roomUsers).where(eq(roomUsers.roomId, roomId));
    await getDb().delete(rooms).where(eq(rooms.id, roomId));

    await expect(decideIngestAuth(SECRET, { token: minted.rtmpToken, path, action: 'publish' })).resolves.toEqual({
      allowed: false,
      reason: 'revoked'
    });
  });

  it('refuses an unsigned or absent token without consulting the database', async () => {
    const { decideIngestAuth } = await import('./stream-ingest');

    await expect(decideIngestAuth(SECRET, { token: null, path: 'room__x__y', action: 'publish' })).resolves.toEqual({
      allowed: false,
      reason: 'no-token'
    });
    await expect(decideIngestAuth(SECRET, { token: 'a.b.c', path: 'room__x__y', action: 'publish' })).resolves.toEqual({
      allowed: false,
      reason: 'bad-token'
    });
  });
});
