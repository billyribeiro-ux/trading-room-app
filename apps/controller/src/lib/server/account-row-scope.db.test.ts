import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Runtime proof that badge editing, the badge dark-theme toggle and room archiving cannot reach
 * another tenant's rows — and that editing a badge edits it rather than making a second one.
 *
 * None of this is provable purely. Every one of the three actions enforces ownership as part of the
 * UPDATE's own WHERE clause, so a stubbed Drizzle would prove only that the stub was called with a
 * shape somebody wrote down. The question these cases answer is what the DATABASE contains
 * afterwards.
 *
 * The harness is the one `bulk-scope.db.test.ts` and `room-rename.db.test.ts` already use: `initdb`
 * into a temp directory, a random high port bound to 127.0.0.1 only, then `pg_ctl stop` and delete.
 * It needs a local PostgreSQL binary, which CI does not have, so `vite.config.ts` excludes
 * `*.db.test.ts` from the default run and `pnpm test:db` invokes it on purpose.
 */

const CLUSTER = mkdtempSync(join(tmpdir(), 'proroom-rowscope-'));
const DATA = join(CLUSTER, 'data');
const PORT = 55_000 + Math.floor(Math.random() * 4_000);
const URL_ = `postgres://127.0.0.1:${PORT}/proroom_rowscope_test`;

/*
  The whole private-env surface the account page's import graph touches, not just the database URL.
  `vi.mock` replaces the module wholesale, so a name it omits is an import error rather than an
  undefined value — and the failure names the mock, not the missing variable.
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
  PROFILE_AUTHORITY_MODE: '',
  ROOM_AUTHORITY_MODE: '',
  ROOM_SETTINGS_AUTHORITY_MODE: '',
  TRADINGROOM_API_URL: '',
  FCM_SERVICE_ACCOUNT_JSON: ''
}));
vi.mock('$app/env/public', () => ({ PUBLIC_RECAPTCHA_SITE_KEY: '' }));

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
  run('createdb', ['-h', '127.0.0.1', '-p', String(PORT), 'proroom_rowscope_test']);
}, 120_000);

afterAll(() => {
  if (started) run('pg_ctl', ['-D', DATA, '-m', 'immediate', '-w', 'stop']);
  rmSync(CLUSTER, { recursive: true, force: true });
});

/** What a form action hands back, in the two shapes these cases care about. */
type ActionOutcome = { status?: number; data?: { message?: string } };

describe('account scoping of the account page row actions, against a real PostgreSQL', () => {
  /**
   * Two accounts, each with an owner, a room and a badge — the smallest world in which "somebody
   * else's row" is a thing that exists.
   */
  async function world() {
    const { getDb } = await import('./db');
    const { provisionRoom } = await import('./provision-room');
    const { accounts, badges, users } = await import('./db/schema');

    const db = getDb();
    const now = new Date();

    async function tenant(slug: string) {
      const [account] = await db
        .insert(accounts)
        .values({ name: slug, ownerEmail: `${slug}@example.test`, createdAt: now })
        .returning({ id: accounts.id });
      const [owner] = await db
        .insert(users)
        .values({
          accountId: account.id,
          email: `${slug}@example.test`,
          displayName: slug,
          emailVerifiedAt: now,
          createdAt: now
        })
        .returning({ id: users.id });
      const [badge] = await db
        .insert(badges)
        .values({
          accountId: account.id,
          label: `${slug} badge`,
          textColor: '#ffffff',
          backgroundColor: '#777777',
          emoji: '*',
          createdAt: now
        })
        .returning({ id: badges.id });
      const room = await provisionRoom(db, {
        accountId: account.id,
        ownerUserId: owner.id,
        name: `${slug} room`,
        now
      });
      return {
        accountId: account.id,
        badgeId: badge.id,
        roomId: room.id,
        locals: {
          user: {
            id: owner.id,
            email: `${slug}@example.test`,
            displayName: slug,
            accountId: account.id,
            emailVerifiedAt: now
          }
        } as App.Locals
      };
    }

    return {
      db,
      mine: await tenant(`mine${Date.now() % 100000}`),
      theirs: await tenant(`theirs${Date.now() % 100000}`)
    };
  }

  async function post(name: string, locals: App.Locals, fields: Record<string, string>) {
    const { actions } = await import('../../routes/(app)/account/+page.server');
    const action = actions[name];
    if (!action) throw new Error(`there is no ?/${name} action on the account page`);

    const body = new FormData();
    for (const [key, value] of Object.entries(fields)) body.set(key, value);
    const event = {
      request: new Request('http://127.0.0.1/account', { method: 'POST', body }),
      locals
    } as unknown as Parameters<typeof action>[0];
    return (await action(event)) as ActionOutcome;
  }

  beforeAll(async () => {
    const { ensureDatabase } = await import('./db');
    // Bootstrapped the way production is — through the migrator, so migration 2's two columns are
    // created by the same code path that will create them on a real deployment.
    await ensureDatabase();
  }, 120_000);

  it('updates a badge in place, and never inserts a second one', async () => {
    const { db, mine } = await world();
    const { badges } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');

    const before = await db.select().from(badges).where(eq(badges.accountId, mine.accountId));
    expect(before).toHaveLength(1);

    await post('updateBadge', mine.locals, {
      id: String(mine.badgeId),
      label: 'Renamed',
      textColor: '#000000',
      backgroundColor: '#ffcc00',
      emoji: '!'
    });

    const after = await db.select().from(badges).where(eq(badges.accountId, mine.accountId));
    expect(after, 'an edit that inserts is the exact defect this action replaced').toHaveLength(1);
    expect(after[0].id, 'the same row, not a replacement').toBe(mine.badgeId);
    expect(after[0].label).toBe('Renamed');
    expect(after[0].textColor).toBe('#000000');
    expect(after[0].backgroundColor).toBe('#ffcc00');
    expect(after[0].emoji).toBe('!');
  }, 60_000);

  it('refuses to update a badge belonging to another account, and changes nothing', async () => {
    const { db, mine, theirs } = await world();
    const { badges } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');

    const [before] = await db.select().from(badges).where(eq(badges.id, theirs.badgeId));

    const outcome = await post('updateBadge', mine.locals, {
      id: String(theirs.badgeId),
      label: 'Stolen',
      textColor: '#ff0000',
      backgroundColor: '#ff0000'
    });
    expect(outcome.status).toBe(404);

    const [after] = await db.select().from(badges).where(eq(badges.id, theirs.badgeId));
    expect(after).toEqual(before);
  }, 60_000);

  /*
    REWRITTEN 2026-08-15. These read `darkTheme` as a boolean and asserted "it is a toggle, not a
    setter" — which is what this repository believed until `$scope.addBadgeDarkTheme` was captured
    out of the live `app.min.js` and turned out to be a free-text field holding ANOTHER badge's id.
  */
  it('sets and clears the dark-theme badge for the owning account', async () => {
    const { db, mine } = await world();
    const { badges } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');

    // A second badge in the same account to nominate. A badge cannot be its own dark variant.
    const [other] = await db
      .insert(badges)
      .values({ accountId: mine.accountId, label: 'Dark VIP', createdAt: new Date() })
      .returning({ id: badges.id });

    const [initial] = await db.select().from(badges).where(eq(badges.id, mine.badgeId));
    expect(initial.darkThemeBadgeId, 'a new badge nominates nothing').toBeNull();

    await post('addBadgeDarkTheme', mine.locals, {
      id: String(mine.badgeId),
      darkThemeBadgeId: String(other.id)
    });
    const [set] = await db.select().from(badges).where(eq(badges.id, mine.badgeId));
    expect(set.darkThemeBadgeId).toBe(other.id);

    // An EMPTY field is how the captured dialog clears it — not a failure, and not a toggle back.
    await post('addBadgeDarkTheme', mine.locals, {
      id: String(mine.badgeId),
      darkThemeBadgeId: ''
    });
    const [cleared] = await db.select().from(badges).where(eq(badges.id, mine.badgeId));
    expect(cleared.darkThemeBadgeId).toBeNull();
  }, 60_000);

  it('refuses to write another account badge, and leaves it alone', async () => {
    const { db, mine, theirs } = await world();
    const { badges } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');

    const outcome = await post('addBadgeDarkTheme', mine.locals, {
      id: String(theirs.badgeId),
      darkThemeBadgeId: ''
    });
    expect(outcome.status).toBe(404);

    const [after] = await db.select().from(badges).where(eq(badges.id, theirs.badgeId));
    expect(after.darkThemeBadgeId).toBeNull();
  }, 60_000);

  it('refuses to POINT AT another account badge — the id is typed, so it is raw input', async () => {
    const { db, mine, theirs } = await world();
    const { badges } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');

    /*
      The cross-tenant case the write's own WHERE clause cannot catch: the row being written is
      mine, and only the TARGET belongs to someone else. Nothing stops an admin typing any integer
      into that box, so the subquery that resolves it carries the account as well.
    */
    const outcome = await post('addBadgeDarkTheme', mine.locals, {
      id: String(mine.badgeId),
      darkThemeBadgeId: String(theirs.badgeId)
    });
    expect(outcome.status).toBe(404);

    const [after] = await db.select().from(badges).where(eq(badges.id, mine.badgeId));
    expect(after.darkThemeBadgeId, 'it must not have stored the other tenant row').toBeNull();
  }, 60_000);

  it('refuses a badge that nominates itself', async () => {
    const { db, mine } = await world();
    const { badges } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');

    const outcome = await post('addBadgeDarkTheme', mine.locals, {
      id: String(mine.badgeId),
      darkThemeBadgeId: String(mine.badgeId)
    });
    expect(outcome.status).toBe(400);

    const [after] = await db.select().from(badges).where(eq(badges.id, mine.badgeId));
    expect(after.darkThemeBadgeId).toBeNull();
  }, 60_000);

  it('archives and unarchives the owning account own room', async () => {
    const { db, mine } = await world();
    const { rooms } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');

    const [fresh] = await db.select().from(rooms).where(eq(rooms.id, mine.roomId));
    expect(fresh.archivedAt, 'a new room is not archived').toBeNull();

    await post('setRoomArchived', mine.locals, { id: String(mine.roomId), archived: 'true' });
    const [archived] = await db.select().from(rooms).where(eq(rooms.id, mine.roomId));
    expect(archived.archivedAt).toBeInstanceOf(Date);

    await post('setRoomArchived', mine.locals, { id: String(mine.roomId), archived: 'false' });
    const [restored] = await db.select().from(rooms).where(eq(rooms.id, mine.roomId));
    expect(restored.archivedAt).toBeNull();
  }, 60_000);

  it('refuses to archive or unarchive another account room', async () => {
    const { db, mine, theirs } = await world();
    const { rooms } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');

    expect((await post('setRoomArchived', mine.locals, { id: String(theirs.roomId), archived: 'true' })).status).toBe(
      404
    );
    const [untouched] = await db.select().from(rooms).where(eq(rooms.id, theirs.roomId));
    expect(untouched.archivedAt).toBeNull();

    // And the other direction, against a room that really is archived.
    await post('setRoomArchived', theirs.locals, { id: String(theirs.roomId), archived: 'true' });
    expect((await post('setRoomArchived', mine.locals, { id: String(theirs.roomId), archived: 'false' })).status).toBe(
      404
    );
    const [stillArchived] = await db.select().from(rooms).where(eq(rooms.id, theirs.roomId));
    expect(stillArchived.archivedAt).toBeInstanceOf(Date);
  }, 60_000);

  it('fails loud on an unparseable archived flag rather than defaulting to unarchive', async () => {
    const { db, mine } = await world();
    const { rooms } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');

    await post('setRoomArchived', mine.locals, { id: String(mine.roomId), archived: 'true' });

    for (const bad of ['', 'TRUE', 'on', '1', 'yes']) {
      const outcome = await post('setRoomArchived', mine.locals, { id: String(mine.roomId), archived: bad });
      expect(outcome.status, `${JSON.stringify(bad)} must not be accepted`).toBe(400);
    }

    const [after] = await db.select().from(rooms).where(eq(rooms.id, mine.roomId));
    expect(after.archivedAt, 'a rejected request must not have silently unarchived it').toBeInstanceOf(Date);
  }, 60_000);

  it('rejects a missing or non-numeric row id instead of writing row 0', async () => {
    const { mine } = await world();
    for (const bad of ['', 'abc', '0', '-3', '1.5']) {
      expect((await post('updateBadge', mine.locals, { id: bad, label: 'x' })).status).toBe(400);
      expect((await post('addBadgeDarkTheme', mine.locals, { id: bad, darkThemeBadgeId: '' })).status).toBe(400);
      expect((await post('setRoomArchived', mine.locals, { id: bad, archived: 'true' })).status).toBe(400);
    }
  }, 60_000);
});
