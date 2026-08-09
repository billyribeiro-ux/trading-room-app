import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * A deleted room's code is never handed out again.
 *
 * The allocator used to pick a random 4-digit number and reject it only if a LIVE room held it, so
 * deleting a room returned its code to the pool. The owner created a room and it arrived wearing
 * the number of the room they had just deleted. A room code is what a member types to get in and
 * what sits inside a launch URL, so reissuing one aims an old link at a different room.
 *
 * Not provable purely. The fix IS a database object — `room_short_code_seq` — and a stubbed Drizzle
 * would only prove that somebody wrote `nextval` in a string. The question is what the database
 * hands out after a `DELETE`, so this asks a real one.
 *
 * Same harness the other `.db` cases use: `initdb` into a temp directory, a random high port bound
 * to 127.0.0.1 only, then stop and delete. It needs a local PostgreSQL binary, which CI does not
 * have, so `vite.config.ts` excludes `*.db.test.ts` from the default run and `pnpm test:db` invokes
 * it on purpose.
 */

const CLUSTER = mkdtempSync(join(tmpdir(), 'proroom-shortcode-'));
const DATA = join(CLUSTER, 'data');
const PORT = 55_000 + Math.floor(Math.random() * 4_000);
const URL_ = `postgres://127.0.0.1:${PORT}/proroom_shortcode_test`;

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
  run('createdb', ['-h', '127.0.0.1', '-p', String(PORT), 'proroom_shortcode_test']);
}, 120_000);

afterAll(() => {
  if (started) run('pg_ctl', ['-D', DATA, '-m', 'immediate', '-w', 'stop']);
  rmSync(CLUSTER, { recursive: true, force: true });
});

describe('room short codes, against a real PostgreSQL', () => {
  async function owner(slug: string) {
    const { ensureDatabase, getDb } = await import('./db');
    const { accounts, users } = await import('./db/schema');
    // migrations create the schema AND `room_short_code_seq`; without this the cluster is empty
    await ensureDatabase();
    const db = getDb();
    const now = new Date();
    const [account] = await db
      .insert(accounts)
      .values({ name: slug, ownerEmail: `${slug}@example.test`, createdAt: now })
      .returning({ id: accounts.id });
    const [user] = await db
      .insert(users)
      .values({
        accountId: account.id,
        email: `${slug}@example.test`,
        displayName: slug,
        emailVerifiedAt: now,
        createdAt: now
      })
      .returning({ id: users.id });
    return { db, accountId: account.id, ownerUserId: user.id };
  }

  it('does NOT reissue the code of a deleted room', async () => {
    const { provisionRoom } = await import('./provision-room');
    // the app's OWN deletion path. A raw `delete from rooms` trips the real foreign keys, so a
    // test that used one would be measuring its own shortcut rather than what deleting does here.
    const { deleteRoomCascade } = await import('./rooms');
    const { db, accountId, ownerUserId } = await owner(`del${Date.now() % 100000}`);

    const first = await provisionRoom(db, { accountId, ownerUserId });
    await deleteRoomCascade(first.id);

    // the exact sequence that produced the report: delete, then create again
    const second = await provisionRoom(db, { accountId, ownerUserId });

    expect(second.shortCode).not.toBe(first.shortCode);
  });

  it('keeps climbing across many rooms, reusing nothing', async () => {
    const { provisionRoom } = await import('./provision-room');
    const { deleteRoomCascade } = await import('./rooms');
    const { db, accountId, ownerUserId } = await owner(`climb${Date.now() % 100000}`);

    const seen: string[] = [];
    for (let i = 0; i < 5; i++) {
      const room = await provisionRoom(db, { accountId, ownerUserId });
      seen.push(room.shortCode);
      // delete every one, so a pool-based allocator would be free to hand them all back
      await deleteRoomCascade(room.id);
    }

    expect(new Set(seen).size).toBe(seen.length);
    // monotonic, which is what makes reuse impossible rather than merely unlikely
    const numeric = seen.map(Number);
    expect(numeric).toEqual([...numeric].sort((a, b) => a - b));
  });

  it('names an unnamed room after its own code', async () => {
    const { provisionRoom } = await import('./provision-room');
    const { db, accountId, ownerUserId } = await owner(`name${Date.now() % 100000}`);
    const room = await provisionRoom(db, { accountId, ownerUserId });
    // the reference's own convention: Session ID 3625 -> "Room 3625"
    expect(room.name).toBe(`Room ${room.shortCode}`);
  });

  it('issues codes of at least four digits, as every observed code is', async () => {
    const { provisionRoom } = await import('./provision-room');
    const { db, accountId, ownerUserId } = await owner(`width${Date.now() % 100000}`);
    const room = await provisionRoom(db, { accountId, ownerUserId });
    expect(room.shortCode).toMatch(/^[0-9]{4,}$/);
  });
});
