import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Renaming a room has to change the name everywhere it is read.
 *
 * The name lives in two places and only one of them was being written. The settings blob got the
 * new title because the reference edits it with `saveSessField('name')` like any other field; the
 * `rooms.name` COLUMN kept the old one. Everything that matters reads the column — the Sessions
 * table on the account page, `otherRooms` for "Load Settings From Room", `internal/room-config`
 * (which is where the room itself gets its title) and the manage form's own value — so a rename
 * appeared to be discarded.
 *
 * A pure test could not catch this: both writes go through Drizzle, and a stubbed Drizzle proves
 * only that the stub was called. This asserts the state of a real database after the real call.
 */

const CLUSTER = mkdtempSync(join(tmpdir(), 'proroom-rename-'));
const DATA = join(CLUSTER, 'data');
const PORT = 55_000 + Math.floor(Math.random() * 4_000);
const URL = `postgres://127.0.0.1:${PORT}/proroom_rename_test`;

vi.mock('$app/env/private', () => ({
  get DATABASE_URL() {
    return URL;
  },
  get SUPERADMIN_EMAILS() {
    return '';
  },
  get RESEND_API_KEY() {
    return '';
  },
  get MAIL_FROM() {
    return '';
  }
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
  run('createdb', ['-h', '127.0.0.1', '-p', String(PORT), 'proroom_rename_test']);
}, 120_000);

afterAll(() => {
  if (started) run('pg_ctl', ['-D', DATA, '-m', 'immediate', '-w', 'stop']);
  rmSync(CLUSTER, { recursive: true, force: true });
});

describe('renaming a room, against a real PostgreSQL', () => {
  it('changes the column and the setting together', async () => {
    const { ensureDatabase, getDb } = await import('./db');
    const { provisionRoom } = await import('./provision-room');
    const { readSettings, saveSetting } = await import('./rooms');
    const { accounts, rooms, users } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');

    await ensureDatabase();
    const db = getDb();
    const now = new Date();

    const [account] = await db
      .insert(accounts)
      .values({ name: 'Acme', ownerEmail: 'owner@example.test', createdAt: now })
      .returning({ id: accounts.id });
    const [owner] = await db
      .insert(users)
      .values({
        accountId: account.id,
        email: 'owner@example.test',
        displayName: 'Owner',
        createdAt: now
      })
      .returning({ id: users.id });
    const room = await provisionRoom(db, {
      accountId: account.id,
      ownerUserId: owner.id,
      name: 'Before',
      now
    });

    await saveSetting(room.id, 'name', 'After');

    const [stored] = await db.select().from(rooms).where(eq(rooms.id, room.id));
    expect(stored.name, 'the column every reader uses must carry the new title').toBe('After');
    expect((await readSettings(room.id)).name, 'and so must the settings blob').toBe('After');
  }, 60_000);

  it('keeps the last real title when the field is cleared', async () => {
    const { getDb } = await import('./db');
    const { provisionRoom } = await import('./provision-room');
    const { saveSetting } = await import('./rooms');
    const { accounts, rooms, users } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');

    const db = getDb();
    const now = new Date();
    const [account] = await db
      .insert(accounts)
      .values({ name: 'Beta', ownerEmail: 'beta@example.test', createdAt: now })
      .returning({ id: accounts.id });
    const [owner] = await db
      .insert(users)
      .values({
        accountId: account.id,
        email: 'beta@example.test',
        displayName: 'Beta',
        createdAt: now
      })
      .returning({ id: users.id });
    const room = await provisionRoom(db, {
      accountId: account.id,
      ownerUserId: owner.id,
      name: 'Keep Me',
      now
    });

    /*
      An empty name coerces to null in the blob. The column must NOT follow it there: the Sessions
      table has no empty state and a nameless row renders as a blank, unclickable line.
    */
    await saveSetting(room.id, 'name', '');

    const [stored] = await db.select().from(rooms).where(eq(rooms.id, room.id));
    expect(stored.name).toBe('Keep Me');
  }, 60_000);
});
