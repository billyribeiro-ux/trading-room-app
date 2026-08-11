import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Pairing a phone, against a real PostgreSQL.
 *
 * `mobile-pairing.test.ts` covers the pure halves — `validatePairRequest` and `addPushToken`.
 * `redeemPairCode` had no coverage at all, which the adversarial review of 2026-08-11 found the
 * hard way: two defects lived in it, and both are about what the DATABASE does under concurrency,
 * so neither is provable against a stub.
 *
 *  1. **The counter was never cleared by a reissue.** Five wrong guesses destroyed the code, and
 *     `issueMobilePairCode` wrote only the code and its expiry — so the next code was refused
 *     before its PIN was ever compared, and the member could never pair a phone in that room again
 *     through any interface.
 *  2. **The counter was a read-then-write.** Every request in a parallel burst read the same value
 *     and wrote the same value, so N simultaneous guesses advanced it by one. The five-guess cap
 *     was per ROUND, not per guess, against a one-in-a-million secret that lives for days with no
 *     rate limit in front of it.
 *
 * Same harness as the other `.db` cases: `initdb` into a temp directory, a random high port bound
 * to 127.0.0.1 only, then stop and delete. It needs a local PostgreSQL binary, which CI does not
 * have, so `vite.config.ts` excludes `*.db.test.ts` from the default run and `pnpm test:db`
 * invokes it on purpose.
 */

const CLUSTER = mkdtempSync(join(tmpdir(), 'proroom-pairing-'));
const DATA = join(CLUSTER, 'data');
const PORT = 55_000 + Math.floor(Math.random() * 4_000);
const URL_ = `postgres://127.0.0.1:${PORT}/proroom_pairing_test`;

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
  run('createdb', ['-h', '127.0.0.1', '-p', String(PORT), 'proroom_pairing_test']);
}, 120_000);

afterAll(() => {
  if (started) run('pg_ctl', ['-D', DATA, '-m', 'immediate', '-w', 'stop']);
  rmSync(CLUSTER, { recursive: true, force: true });
});

/** One account, one owner, one room, and the owner's membership in it. */
async function room(slug: string) {
  const { ensureDatabase, getDb } = await import('./db');
  const { accounts, users, roomUsers } = await import('./db/schema');
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
  const { eq, and } = await import('drizzle-orm');
  const [membership] = await db
    .select({ id: roomUsers.id, attempts: roomUsers.mobilePairAttempts })
    .from(roomUsers)
    .where(and(eq(roomUsers.roomId, provisioned.id), eq(roomUsers.userId, user.id)))
    .limit(1);

  return { db, email, roomId: provisioned.id, shortCode: provisioned.shortCode, membership };
}

async function attemptsOf(roomUserId: number) {
  const { getDb } = await import('./db');
  const { roomUsers } = await import('./db/schema');
  const { eq } = await import('drizzle-orm');
  const [row] = await getDb()
    .select({ attempts: roomUsers.mobilePairAttempts, code: roomUsers.mobilePairCode })
    .from(roomUsers)
    .where(eq(roomUsers.id, roomUserId))
    .limit(1);
  return row;
}

const WRONG = '000000';

describe('redeemPairCode, against a real PostgreSQL', () => {
  it('pairs a device when the PIN is right (positive control)', async () => {
    // Without this the failures below prove nothing - a function that always refuses would pass
    // every other case in this file.
    const { issueMobilePairCode } = await import('./rooms');
    const { redeemPairCode } = await import('./mobile-pairing');
    const r = await room(`ok${Date.now() % 100000}`);

    const { code } = await issueMobilePairCode(r.roomId, r.membership.id, 1);
    const result = await redeemPairCode({
      room: r.shortCode,
      email: r.email,
      pin: code,
      token: 'fcm-token-a',
      platform: 'ios'
    });

    expect(result.ok).toBe(true);
    // Consumed, and the counter is clean for the next one.
    const after = await attemptsOf(r.membership.id);
    expect(after.code).toBeNull();
    expect(after.attempts).toBe(0);
  });

  it('lets a reissued PIN work after the counter has been spent', async () => {
    /*
      THE test for defect 1. Five wrong guesses, then a fresh PIN, then the RIGHT one. This returned
      `ok: false` for ever: the refusal on `attempts >= MAX` runs before the PIN is compared, and
      the only other write to the counter is gated on the same condition, so nothing could lower it.
    */
    const { issueMobilePairCode } = await import('./rooms');
    const { redeemPairCode, MAX_PAIR_ATTEMPTS } = await import('./mobile-pairing');
    const r = await room(`brick${Date.now() % 100000}`);

    await issueMobilePairCode(r.roomId, r.membership.id, 1);
    for (let i = 0; i < MAX_PAIR_ATTEMPTS; i++) {
      await redeemPairCode({
        room: r.shortCode,
        email: r.email,
        pin: WRONG,
        token: 't',
        platform: 'ios'
      });
    }

    const spent = await attemptsOf(r.membership.id);
    expect(spent.attempts).toBe(MAX_PAIR_ATTEMPTS);
    // The code destroys itself on the last failure rather than lingering as a guessable secret.
    expect(spent.code).toBeNull();

    const { code } = await issueMobilePairCode(r.roomId, r.membership.id, 1);
    expect((await attemptsOf(r.membership.id)).attempts).toBe(0);

    const result = await redeemPairCode({
      room: r.shortCode,
      email: r.email,
      pin: code,
      token: 'fcm-token-b',
      platform: 'android'
    });
    expect(result.ok).toBe(true);
  });

  it('counts every guess in a concurrent burst, not one per round', async () => {
    /*
      THE test for defect 2. Twenty wrong PINs fired at once. Read-then-write reads 0 twenty times
      and writes 1 twenty times, so the counter lands on 1 and nineteen guesses were free. Counting
      in the database serialises them under the UPDATE's own row lock, so the counter stops at the
      cap and every request past it is refused.
    */
    const { issueMobilePairCode } = await import('./rooms');
    const { redeemPairCode, MAX_PAIR_ATTEMPTS } = await import('./mobile-pairing');
    const r = await room(`race${Date.now() % 100000}`);

    await issueMobilePairCode(r.roomId, r.membership.id, 1);
    await Promise.all(
      Array.from({ length: 20 }, () =>
        redeemPairCode({
          room: r.shortCode,
          email: r.email,
          pin: WRONG,
          token: 't',
          platform: 'ios'
        })
      )
    );

    const after = await attemptsOf(r.membership.id);
    // Never above the cap - the predicates refuse to count past it.
    expect(after.attempts).toBe(MAX_PAIR_ATTEMPTS);
    expect(after.code).toBeNull();
  });

  it('lets only one of two simultaneous correct redemptions win', async () => {
    // The PIN is single-use. Both requests passed the old check and both wrote, and the loser's
    // stale token list overwrote the winner's - quietly unpairing the device that got there first.
    const { issueMobilePairCode } = await import('./rooms');
    const { redeemPairCode } = await import('./mobile-pairing');
    const r = await room(`dup${Date.now() % 100000}`);

    const { code } = await issueMobilePairCode(r.roomId, r.membership.id, 1);
    const both = await Promise.all([
      redeemPairCode({
        room: r.shortCode,
        email: r.email,
        pin: code,
        token: 'device-1',
        platform: 'ios'
      }),
      redeemPairCode({
        room: r.shortCode,
        email: r.email,
        pin: code,
        token: 'device-2',
        platform: 'android'
      })
    ]);

    expect(both.filter((x) => x.ok)).toHaveLength(1);
  });
});

describe('migration 0009: deleting is possible once a room has been visited', () => {
  it('deletes a room that has recorded visits, through the app own path', async () => {
    /*
      Migration 0007 gave `room_sessions` two foreign keys with no ON DELETE, which defaults to NO
      ACTION - so every visit pinned both the room and the membership in place. `deleteRoomCascade`
      deletes memberships FIRST, so it failed on its opening statement for any room anybody had
      ever entered. 0009 adds the actions; this asks the real database.
    */
    const { getDb } = await import('./db');
    const { roomSessions } = await import('./db/schema');
    const { deleteRoomCascade } = await import('./rooms');
    const r = await room(`del${Date.now() % 100000}`);

    await getDb().insert(roomSessions).values({
      roomId: r.roomId,
      roomUserId: r.membership.id,
      displayName: 'Visitor',
      email: r.email,
      joinedAt: new Date()
    });

    await expect(deleteRoomCascade(r.roomId)).resolves.not.toThrow();
  });

  it('keeps the visit when only the MEMBERSHIP goes, with its identity intact', async () => {
    // 0007 docblock: a removed member "must not silently rewrite or erase visits that already
    // happened". SET NULL is what makes that true; CASCADE would delete the attendance record.
    const { getDb } = await import('./db');
    const { roomSessions, roomUsers } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');
    const r = await room(`keep${Date.now() % 100000}`);

    await getDb().insert(roomSessions).values({
      roomId: r.roomId,
      roomUserId: r.membership.id,
      displayName: 'Visitor',
      email: r.email,
      joinedAt: new Date()
    });

    await getDb().delete(roomUsers).where(eq(roomUsers.id, r.membership.id));

    const [visit] = await getDb()
      .select({
        roomUserId: roomSessions.roomUserId,
        displayName: roomSessions.displayName,
        email: roomSessions.email
      })
      .from(roomSessions)
      .where(eq(roomSessions.roomId, r.roomId));

    expect(visit).toBeTruthy();
    expect(visit.roomUserId).toBeNull();
    expect(visit.displayName).toBe('Visitor');
    expect(visit.email).toBe(r.email);
  });
});

describe('recordVisit is bounded on the public path', () => {
  /*
    `/session/[code]/joined` calls this on a page load that needs only a `room_identity` cookie, and
    `/session/[code]` writes that cookie with `httpOnly: false` as plain JSON — so both the row COUNT
    and the row WIDTH were attacker-controlled, with no rate limit in front of either. Found by the
    adversarial review of 2026-08-11.
  */
  async function visits(roomId: number) {
    const { getDb } = await import('./db');
    const { roomSessions } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');
    return getDb()
      .select({
        displayName: roomSessions.displayName,
        email: roomSessions.email,
        ip: roomSessions.ip
      })
      .from(roomSessions)
      .where(eq(roomSessions.roomId, roomId));
  }

  it('opens ONE visit however many times the endpoint is hit', async () => {
    const { recordVisit } = await import('./room-visits');
    const r = await room(`loop${Date.now() % 100000}`);

    // The loop an unauthenticated caller could run.
    for (let i = 0; i < 25; i++) {
      await recordVisit({
        roomId: r.roomId,
        roomUserId: null,
        displayName: 'Visitor',
        email: r.email,
        ip: '203.0.113.7',
        userAgent: 'Mozilla/5.0'
      });
    }

    expect(await visits(r.roomId)).toHaveLength(1);
  });

  it('lets a genuine re-entry open a new visit once the last one closed', async () => {
    // The bound must not break the data model: "one row per ARRIVAL" is the whole point of the table.
    const { recordVisit, closeVisit } = await import('./room-visits');
    const r = await room(`again${Date.now() % 100000}`);
    const entry = {
      roomId: r.roomId,
      roomUserId: null,
      displayName: 'Visitor',
      email: r.email,
      ip: '203.0.113.7',
      userAgent: 'Mozilla/5.0'
    };

    await recordVisit(entry);
    await closeVisit(r.roomId, r.email);
    await recordVisit(entry);

    expect(await visits(r.roomId)).toHaveLength(2);
  });

  it('truncates the three columns a visitor controls', async () => {
    const { recordVisit } = await import('./room-visits');
    const r = await room(`wide${Date.now() % 100000}`);

    await recordVisit({
      roomId: r.roomId,
      roomUserId: null,
      displayName: 'A'.repeat(64_000),
      email: `${'b'.repeat(32_000)}@example.test`,
      ip: 'c'.repeat(4_000),
      userAgent: 'd'.repeat(4_000)
    });

    const [row] = await visits(r.roomId);
    expect(row.displayName.length).toBe(200);
    expect(row.email.length).toBe(254);
    expect(row.ip?.length).toBe(45);
  });
});
