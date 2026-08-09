import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Runtime proof for the five buttons in the manage page's "DON'T TOUCH" block.
 *
 * `dont-touch-block.test.ts` proves the markup: the buttons exist, carry the reference's classes,
 * and post to actions the server exports. It cannot prove the actions DO anything — a handler that
 * returns `{ ok: true }` and writes nothing satisfies every one of those assertions, and "a button
 * whose only effect is changing its own label" is the exact failure this file exists to rule out.
 *
 * Two of the five write to EVERY room the account owns. That blast radius is not testable purely
 * either: the account is read from the room row through `accountRoomIds`, and the question worth
 * answering is what the DATABASE holds afterwards — specifically, whether the OTHER tenant's rooms
 * were touched.
 *
 * ## The harness
 *
 * The one `bulk-scope.db.test.ts` and `account-row-scope.db.test.ts` already use: `initdb` into a
 * temp directory, a random high port bound to 127.0.0.1 only, then `pg_ctl stop` and delete. It
 * needs a local PostgreSQL binary, which CI has not got, so `vite.config.ts` excludes
 * `*.db.test.ts` from the default run and `pnpm test:db` invokes it deliberately.
 */

const CLUSTER = mkdtempSync(join(tmpdir(), 'proroom-donttouch-'));
const DATA = join(CLUSTER, 'data');
const PORT = 55_000 + Math.floor(Math.random() * 4_000);
const URL_ = `postgres://127.0.0.1:${PORT}/proroom_donttouch_test`;

/*
  The whole private-env surface this page's import graph touches. `vi.mock` replaces the module
  wholesale, so a name it omits is an import error naming the mock rather than an undefined value
  surfacing somewhere unrelated.
*/
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

beforeAll(async () => {
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
  run('createdb', ['-h', '127.0.0.1', '-p', String(PORT), 'proroom_donttouch_test']);
  const { ensureDatabase } = await import('./db');
  // Bootstrapped through the migrator, the way production is — not the baseline DDL string.
  await ensureDatabase();
}, 120_000);

afterAll(() => {
  if (started) run('pg_ctl', ['-D', DATA, '-m', 'immediate', '-w', 'stop']);
  rmSync(CLUSTER, { recursive: true, force: true });
});

type Outcome = { status?: number; data?: { message?: string } } & Record<string, unknown>;

/** Two tenants, each with two rooms, so "the entire account" has an edge to fall off. */
async function world(tag: string) {
  const { getDb } = await import('./db');
  const { accounts, rooms, users } = await import('./db/schema');

  const db = getDb();
  const now = new Date();

  async function tenant(slug: string) {
    const [account] = await db
      .insert(accounts)
      .values({ name: slug, ownerEmail: `${slug}@example.test`, createdAt: now })
      .returning();
    const [owner] = await db
      .insert(users)
      .values({
        accountId: account.id,
        email: `${slug}@example.test`,
        displayName: slug,
        emailVerifiedAt: now,
        createdAt: now
      })
      .returning();
    const room = async (shortCode: string) =>
      (
        await db
          .insert(rooms)
          .values({ accountId: account.id, shortCode, name: shortCode, state: 'open', createdAt: now })
          .returning()
      )[0].id;

    return {
      accountId: account.id,
      first: await room(`${slug}-1`),
      second: await room(`${slug}-2`),
      locals: {
        user: {
          id: owner.id,
          email: owner.email,
          displayName: slug,
          accountId: account.id,
          emailVerifiedAt: now
        }
      } as App.Locals
    };
  }

  return { db, mine: await tenant(`mine${tag}`), theirs: await tenant(`theirs${tag}`) };
}

/**
 * Posts to a named action exactly as an enhanced form does: form data in, ActionResult out.
 *
 * The cases below identify rooms by their primary key, because that is what the database helpers
 * around them read and write. **The ROUTE does not** — `/account/rooms/<shortCode>` addresses a
 * room by its short code, so this translates one to the other before building the event.
 *
 * Doing that here rather than at every call site keeps the cases about the DON'T TOUCH actions,
 * which is what they are for. It is a real lookup, not a fabricated string: if a room's code and
 * its id ever stopped agreeing, this would fail rather than paper over it.
 */
async function post(name: string, roomId: number, locals: App.Locals, fields: Record<string, string> = {}) {
  const { actions } = await import('../../routes/(app)/account/rooms/[id]/[[tab]]/+page.server');
  const { getDb } = await import('./db');
  const { rooms } = await import('./db/schema');
  const { eq } = await import('drizzle-orm');
  const action = actions[name];
  if (!action) throw new Error(`there is no ?/${name} action on the manage page`);

  const [row] = await getDb()
    .select({ shortCode: rooms.shortCode })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (!row) throw new Error(`no room with id ${roomId} — the fixture did not create what it thinks`);

  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  const event = {
    request: new Request(`http://127.0.0.1/account/rooms/${row.shortCode}`, { method: 'POST', body }),
    params: { id: row.shortCode },
    locals
  } as unknown as Parameters<typeof action>[0];

  try {
    return (await action(event)) as Outcome;
  } catch (thrown) {
    // `error(404, …)` throws an HttpError; the page turns it into a response, and here it is the
    // answer under test, so it is returned rather than allowed to fail the case.
    return thrown as Outcome;
  }
}

const read = async (roomId: number) => (await import('./rooms')).readSettings(roomId);

describe('swapCLusterIDs', () => {
  it('really exchanges the two ids on this room, and touches no other room', async () => {
    const { mine } = await world('swap');
    const { saveSetting } = await import('./rooms');

    await saveSetting(mine.first, 'clusterID', 'main-1');
    await saveSetting(mine.first, 'backupClusterID', 'backup-1');
    await saveSetting(mine.second, 'clusterID', 'other-room');

    await post('swapClusterIds', mine.first, mine.locals);

    const after = await read(mine.first);
    expect(after.clusterID, 'the backup is now the main').toBe('backup-1');
    expect(after.backupClusterID, 'the main is now the backup').toBe('main-1');
    expect((await read(mine.second)).clusterID, 'a swap is one room only').toBe('other-room');
  }, 60_000);

  it('refuses when neither is set, rather than reporting a swap of nothing', async () => {
    const { mine } = await world('swapempty');
    const outcome = await post('swapClusterIds', mine.first, mine.locals);
    expect(outcome.status).toBe(400);
  }, 60_000);
});

describe('applyToAllSessions', () => {
  it('writes both ids into every room of THIS account and none of another', async () => {
    const { mine, theirs } = await world('apply');
    const { saveSetting } = await import('./rooms');

    await saveSetting(mine.first, 'clusterID', 'cluster-A');
    await saveSetting(mine.first, 'backupClusterID', 'cluster-B');
    await saveSetting(mine.second, 'clusterID', 'stale');
    await saveSetting(theirs.first, 'clusterID', 'not-yours');
    await saveSetting(theirs.second, 'clusterID', 'not-yours-either');

    const outcome = await post('applyToAllSessions', mine.first, mine.locals);
    expect(outcome.appliedClusterIds, 'both rooms of this account').toBe(2);

    for (const roomId of [mine.first, mine.second]) {
      const settings = await read(roomId);
      expect(settings.clusterID).toBe('cluster-A');
      expect(settings.backupClusterID).toBe('cluster-B');
    }

    /* The whole point: the other tenant is untouched, in BOTH of its rooms. */
    expect((await read(theirs.first)).clusterID).toBe('not-yours');
    expect((await read(theirs.second)).clusterID).toBe('not-yours-either');
  }, 60_000);

  it('cannot be aimed at another account by putting their room id in the URL', async () => {
    const { mine, theirs } = await world('applyforeign');
    const { saveSetting } = await import('./rooms');
    await saveSetting(theirs.first, 'clusterID', 'untouched');

    const outcome = await post('applyToAllSessions', theirs.first, mine.locals);
    expect(outcome.status, 'someone else’s room is a 404, not a fan-out').toBe(404);
    expect((await read(theirs.first)).clusterID).toBe('untouched');
    expect((await read(theirs.second)).clusterID ?? null).toBe(null);
  }, 60_000);
});

describe('applyRepeaterToAccount', () => {
  it('copies the repeater list across this account only', async () => {
    const { mine, theirs } = await world('repeat');
    const { saveSetting } = await import('./rooms');

    await saveSetting(mine.first, 'media_relays', 'localhost|127.0.0.1,two|10.0.0.2');
    await saveSetting(theirs.first, 'media_relays', 'theirs|10.9.9.9');

    const outcome = await post('applyRepeaterToAccount', mine.first, mine.locals);
    expect(outcome.appliedRepeaters).toBe(2);

    expect((await read(mine.second)).media_relays).toBe('localhost|127.0.0.1,two|10.0.0.2');
    expect((await read(theirs.first)).media_relays, 'another tenant keeps its own repeaters').toBe('theirs|10.9.9.9');
  }, 60_000);

  it('leaves clusterID alone — the documented honest gap in what "server" means', async () => {
    const { mine } = await world('repeatgap');
    const { saveSetting } = await import('./rooms');
    await saveSetting(mine.first, 'media_relays', 'a|1.1.1.1');
    await saveSetting(mine.first, 'clusterID', 'mine-cluster');
    await saveSetting(mine.second, 'clusterID', 'second-cluster');

    await post('applyRepeaterToAccount', mine.first, mine.locals);

    expect(
      (await read(mine.second)).clusterID,
      'guessing that "server" also meant clusterID would overwrite this'
    ).toBe('second-cluster');
  }, 60_000);
});

describe('addLiveServer / removeLiveServer', () => {
  it('adds one entry, removes one entry, and empties to null', async () => {
    const { mine } = await world('relays');

    await post('addLiveServer', mine.first, mine.locals, { server: 'one|10.0.0.1' });
    expect((await read(mine.first)).media_relays).toBe('one|10.0.0.1');

    await post('addLiveServer', mine.first, mine.locals, { server: 'two|10.0.0.2' });
    expect((await read(mine.first)).media_relays, 'appended, not replaced').toBe('one|10.0.0.1,two|10.0.0.2');

    await post('removeLiveServer', mine.first, mine.locals, { server: 'one|10.0.0.1' });
    expect((await read(mine.first)).media_relays).toBe('two|10.0.0.2');

    await post('removeLiveServer', mine.first, mine.locals, { server: 'two|10.0.0.2' });
    expect((await read(mine.first)).media_relays, 'an emptied list reads as unset, not ""').toBe(null);
  }, 60_000);

  it('fails loud on a blank box, a duplicate, a comma and an entry that is not there', async () => {
    const { mine } = await world('relaysbad');

    expect((await post('addLiveServer', mine.first, mine.locals, { server: '  ' })).status).toBe(400);
    expect((await post('addLiveServer', mine.first, mine.locals, { server: 'a|1,b|2' })).status).toBe(400);

    await post('addLiveServer', mine.first, mine.locals, { server: 'a|1.1.1.1' });
    expect(
      (await post('addLiveServer', mine.first, mine.locals, { server: 'a|1.1.1.1' })).status,
      'a duplicate is a 409, not a silent second copy'
    ).toBe(409);
    expect(
      (await post('removeLiveServer', mine.first, mine.locals, { server: 'nope|9.9.9.9' })).status,
      'removing something absent is a 404, not a green no-op'
    ).toBe(404);

    expect((await read(mine.first)).media_relays, 'nothing was written by any of the refusals').toBe('a|1.1.1.1');
  }, 60_000);

  it('cannot edit another account’s repeater list', async () => {
    const { mine, theirs } = await world('relaysforeign');
    const { saveSetting } = await import('./rooms');
    await saveSetting(theirs.first, 'media_relays', 'theirs|10.9.9.9');

    expect((await post('addLiveServer', theirs.first, mine.locals, { server: 'mine|1.2.3.4' })).status).toBe(404);
    expect((await read(theirs.first)).media_relays).toBe('theirs|10.9.9.9');
  }, 60_000);
});
