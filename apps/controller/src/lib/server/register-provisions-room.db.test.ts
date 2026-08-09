import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Runtime proof that registering an account also creates its first room.
 *
 * ## Why this file exists
 *
 * It shipped broken and I did not catch it. The unit suite was green, `svelte-check` was clean, and
 * the feature still did nothing on the machine the owner was using — because the running server was
 * on a branch without it and nothing in the repository could tell the difference. A pure test could
 * not have caught that either: the three rows a room needs are written through Drizzle, and a
 * stubbed Drizzle proves only that the stub was called.
 *
 * So this asserts the thing that actually matters — after `provisionRoom` runs inside the
 * registration transaction, the database contains a room, an owner membership at role 0, and a
 * settings row — against a real PostgreSQL.
 *
 * ## Why it re-implements registration's transaction instead of invoking the action
 *
 * The action is a SvelteKit form action: it reads `formData()`, verifies reCAPTCHA, sets a cookie
 * and throws `redirect()`. Driving it needs a fabricated `RequestEvent`, and every part of that
 * fabrication is a place for the test to pass while the real thing fails.
 *
 * What is worth pinning is the invariant, not the plumbing: an account and its owner and its first
 * room are created in ONE transaction, and `provisionRoom` — the exact function the action calls —
 * writes all three rows. That is what is exercised here, with the same call shape the action uses.
 *
 * Throwaway cluster on a random loopback port, `initdb` to a temp directory, stopped and deleted
 * afterwards — see `bulk-scope.db.test.ts` for the reasoning, including why a Unix socket silently
 * connects to the WRONG server. `vite.config.ts` excludes `*.db.test.ts` from the default run;
 * `pnpm test:db` invokes it deliberately.
 */

const CLUSTER = mkdtempSync(join(tmpdir(), 'proroom-register-'));
const DATA = join(CLUSTER, 'data');
const PORT = 55_000 + Math.floor(Math.random() * 4_000);
const URL = `postgres://127.0.0.1:${PORT}/proroom_register_test`;

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
    /*
      `pg_ctl` reports only "could not start server / Examine the log output", and the log it means
      is the one this harness redirected into the cluster directory. Throwing without it makes every
      startup failure unexplainable — which is exactly what happened on CI, where the message said
      nothing and the real reason was sitting in a file nobody printed.
    */
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
  run('createdb', ['-h', '127.0.0.1', '-p', String(PORT), 'proroom_register_test']);
}, 120_000);

afterAll(() => {
  if (started) run('pg_ctl', ['-D', DATA, '-m', 'immediate', '-w', 'stop']);
  rmSync(CLUSTER, { recursive: true, force: true });
});

describe('registering an account, against a real PostgreSQL', () => {
  it('creates the room, seats the owner in it, and seeds its settings', async () => {
    const { ensureDatabase, getDb } = await import('./db');
    const { provisionRoom } = await import('./provision-room');
    const { accounts, roomSettings, roomUsers, rooms, users } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');

    /*
      Bootstrapped through `ensureDatabase` — the migrator, exactly as the application runs it —
      rather than the baseline DDL string. The baseline has no `users.email_verified_at`; migration
      1 adds it. A harness that applies only the baseline builds a schema the code cannot write to.
    */
    await ensureDatabase();
    const db = getDb();

    const now = new Date();
    /*
      A fabricated name, deliberately. `scripts/verify-privacy-boundary.mjs` rejects the captured
      owner's real display name anywhere in the tree, and it caught this file using it — the same
      boundary that caught `b.com` in the verification tests. Nothing here needs a real person.
    */
    const displayName = 'Ada Lovelace';

    // Exactly the shape `register/+page.server.ts` uses: one transaction, room included.
    const userId = await db.transaction(async (tx) => {
      const [account] = await tx
        .insert(accounts)
        .values({ name: displayName, ownerEmail: 'new@example.test', createdAt: now })
        .returning({ id: accounts.id });
      const [user] = await tx
        .insert(users)
        .values({
          accountId: account.id,
          email: 'new@example.test',
          displayName,
          passwordHash: 'irrelevant-to-this-assertion',
          createdAt: now
        })
        .returning({ id: users.id });

      // No name supplied, exactly as registration calls it.
      await provisionRoom(tx, { accountId: account.id, ownerUserId: user.id, now });

      return user.id;
    });

    const roomRows = await db.select().from(rooms);
    expect(roomRows, 'registering must leave exactly one room').toHaveLength(1);
    /*
      `open` — the only state ever observed, and now the only one creation produces.

      The captured room reads "open" while holding 0 of 2 users (`logged-in-page:465`), so an empty
      room is open; the word does not mean a session is live. Rooms used to be created `closed`, and
      since nothing in this app can move a room out of `closed` — there is no open/close control
      anywhere — every room ever registered wore a state the reference never shows.
    */
    expect(roomRows[0].state).toBe('open');
    /*
      At least four digits, mirroring the reference's Session ID. Codes come from a sequence now, so
      they widen past 9999 rather than wrapping — which is what makes reuse impossible rather than
      merely unlikely.
    */
    expect(roomRows[0].shortCode).toMatch(/^\d{4,}$/);
    /*
      The id every manage-page link is built from, and the one printed in its header:
      `Manage Room id: 3627 ( 6a6529b318781e20ed81947d )`. Left NULL by creation, that header
      rendered empty parentheses and every link fell through to a numeric-id fallback.
    */
    expect(roomRows[0].publicId, 'a new room must have a public id').toMatch(/^[0-9a-f]{24}$/);
    /*
      `Room <shortCode>`, which is what the reference calls a room: ptr2.json's Sessions table
      renders Name "Room 3625" beside Session ID "3625", and ptr1.json's Room Title editable renders
      the same string. Asserted against the row's OWN code so the test proves the rule, not a
      literal.
    */
    expect(roomRows[0].name).toBe(`Room ${roomRows[0].shortCode}`);

    /*
      The membership. Its absence is not cosmetic: `internal/mobile-pin` answered 404 to the very
      account that had just created the room, because a pair code lives on a membership row.
    */
    const membership = await db.select().from(roomUsers).where(eq(roomUsers.roomId, roomRows[0].id));
    expect(membership, 'the owner must be seated in their own room').toHaveLength(1);
    expect(membership[0].userId).toBe(userId);
    expect(membership[0].role, 'role 0 is Owner').toBe(0);

    /*
      The settings row. Without it a room resolves to `{}` and every feature is OFF, which is the
      emptiest possible product for somebody evaluating it.
    */
    const settings = await db.select().from(roomSettings).where(eq(roomSettings.roomId, roomRows[0].id));
    expect(settings, 'a room with no settings row has every feature off').toHaveLength(1);
    const seeded = JSON.parse(settings[0].settingsJson) as Record<string, unknown>;
    expect(Object.keys(seeded).length, 'the settings seed must not be empty').toBeGreaterThan(0);
  }, 60_000);

  it('rolls the account back when the room cannot be created', async () => {
    const { getDb } = await import('./db');
    const { accounts, users } = await import('./db/schema');

    const db = getDb();
    const before = (await db.select().from(accounts)).length;

    /*
      The reason the room is created INSIDE registration's transaction rather than after it.

      A failure here must not leave a login whose account has no room — that is the exact state the
      owner hit, and it reads as a working signup right up until the account page is empty.
    */
    await expect(
      db.transaction(async (tx) => {
        const [account] = await tx
          .insert(accounts)
          .values({ name: 'Doomed', ownerEmail: 'doomed@example.test', createdAt: new Date() })
          .returning({ id: accounts.id });
        await tx.insert(users).values({
          accountId: account.id,
          email: 'doomed@example.test',
          displayName: 'Doomed',
          createdAt: new Date()
        });
        throw new Error('room provisioning failed');
      })
    ).rejects.toThrow('room provisioning failed');

    expect(await db.select().from(accounts)).toHaveLength(before);
    const orphan = (await db.select().from(users)).filter((u) => u.email === 'doomed@example.test');
    expect(orphan, 'a failed signup must leave no login behind').toHaveLength(0);
  }, 60_000);
});
