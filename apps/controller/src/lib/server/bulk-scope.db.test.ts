import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Runtime proof for "Apply to all rooms?" — the highest-blast-radius code in the controller.
 *
 * `resolveBulkTargets()` decides which membership rows a bulk action touches, and with that
 * checkbox on, one of those actions is `10 = Remove All` across an entire account. Every property
 * that makes it safe is enforced in SQL, so none of it is provable by a pure test:
 *
 *  1. expansion is by `user_id`, not `room_user_id` — a selection names PEOPLE, whose membership
 *     row differs per room;
 *  2. the account is read from the room being managed, never from the form, so a smuggled id
 *     cannot reach another tenant;
 *  3. role 0 is excluded in EVERY room, not just the managed one — somebody who is a participant
 *     here and the OWNER of another room must not be removed there.
 *
 * ## Why a throwaway cluster, and why this file is excluded by default
 *
 * `initdb` into a temp directory, a random high port bound to 127.0.0.1 only, then `pg_ctl stop`
 * and delete. No container runtime, no new dependency, nothing off this machine can reach it, and —
 * the point — no possible way to touch Neon: the cluster exists only for the life of this file.
 *
 * It needs a local PostgreSQL binary, which CI does not have, so `vite.config.ts` excludes
 * `*.db.test.ts` from the default run and `pnpm test:db` invokes it on purpose. A gate that
 * silently skips itself is worse than one you have to remember.
 */

const CLUSTER = mkdtempSync(join(tmpdir(), 'proroom-bulk-'));
const DATA = join(CLUSTER, 'data');
/**
 * A random high port on the LOOPBACK interface only.
 *
 * A Unix socket would be tidier, but postgres-js does not honour `?host=` from a connection URL in
 * either encoded or raw form — see below — and the application reads its connection as a URL, which
 * is the thing under test. `listen_addresses=127.0.0.1` keeps it off every other interface, and the
 * cluster exists for the life of this file.
 */
const PORT = 55_000 + Math.floor(Math.random() * 4_000);
/**
 * Unix socket, with an EMPTY host section.
 *
/**
 * Why not a Unix socket, which would be tidier still.
 *
 * Three attempts, all of which connect SUCCESSFULLY to the WRONG server and fail with a message
 * that points somewhere else entirely — worth writing down, because each looked like a cluster
 * problem and was a URL problem:
 *
 *  - `postgres://user@localhost/db?host=/sock` — the explicit `localhost` wins, postgres-js opens
 *    TCP to whatever real PostgreSQL is on the machine, and it fails with "role does not exist".
 *  - `postgres:///db?host=%2Fvar%2F…` — the percent-encoded path is not decoded, the parameter is
 *    discarded, and the driver falls back to the DEFAULT local socket. It finds the developer's own
 *    server and fails with "database proroom_test does not exist".
 *  - `postgres:///db?host=/var/…` — raw path, same fallback, same misleading error.
 *
 * The application reads its connection as a URL, and that is the thing under test, so the harness
 * has to express itself as one too. A loopback port does that unambiguously.
 */
const URL = `postgres://127.0.0.1:${PORT}/proroom_test`;

/**
 * `SUPERADMIN_EMAILS` as well as the database URL, because `impersonation.ts` asks
 * `isSuperadmin()` whether its target is an operator — which is the refusal that matters most.
 * Naming a real operator here is what lets that path be exercised rather than assumed.
 */
vi.mock('$app/env/private', () => ({
  get DATABASE_URL() {
    return URL;
  },
  get SUPERADMIN_EMAILS() {
    return 'imp-operator@example.test:full, imp-second-op@example.test:support';
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
  run('createdb', ['-h', '127.0.0.1', '-p', String(PORT), 'proroom_test']);
}, 120_000);

afterAll(() => {
  if (started) run('pg_ctl', ['-D', DATA, '-m', 'immediate', '-w', 'stop']);
  rmSync(CLUSTER, { recursive: true, force: true });
});

describe('bulk scope, against a real PostgreSQL', () => {
  it('expands by person, isolates the tenant, and never touches an owner', async () => {
    const { ensureDatabase, getDb } = await import('./db');
    const { applyManyOpcode } = await import('./rooms');
    const { accounts, roomUsers, rooms, users } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');

    /*
      Bootstrapped through `ensureDatabase`, which is what the application itself runs — the
      migrator, not the baseline DDL string.

      It used to apply `DDL` directly, and that silently rotted the moment migration 1 added
      `users.email_verified_at`: the Drizzle schema had the column, the baseline did not, and every
      insert into `users` failed with "column does not exist". Nothing caught it because
      `*.db.test.ts` is excluded from the default run. Bootstrapping the way production does means
      the next migration cannot reintroduce that gap.
    */
    await ensureDatabase();
    const db = getDb();

    const now = new Date();
    const account = async (name: string, email: string) =>
      (await db.insert(accounts).values({ name, ownerEmail: email, createdAt: now }).returning())[0].id;
    const user = async (accountId: number, email: string) =>
      (await db.insert(users).values({ accountId, email, displayName: email, createdAt: now }).returning())[0].id;
    const room = async (accountId: number, shortCode: string) =>
      (
        await db
          .insert(rooms)
          .values({ accountId, shortCode, name: shortCode, state: 'open', createdAt: now })
          .returning()
      )[0].id;
    const member = async (roomId: number, userId: number, role: number) =>
      (await db.insert(roomUsers).values({ roomId, userId, role, createdAt: now }).returning())[0].id;

    const tenantA = await account('Tenant A', 'a@example.test');
    const tenantB = await account('Tenant B', 'b@example.test');

    const roomOne = await room(tenantA, '1001');
    const roomTwo = await room(tenantA, '1002');
    const foreignRoom = await room(tenantB, '2001');

    const alice = await user(tenantA, 'alice@example.test');
    const owner = await user(tenantA, 'owner@example.test');
    const stranger = await user(tenantB, 'stranger@example.test');

    const aliceInOne = await member(roomOne, alice, 2);
    const aliceInTwo = await member(roomTwo, alice, 2);
    /* The pivotal fixture: a PARTICIPANT here who OWNS the other room. */
    const ownerInOne = await member(roomOne, owner, 2);
    await member(roomTwo, owner, 0);
    const strangerElsewhere = await member(foreignRoom, stranger, 2);

    const roleOf = async (id: number) => (await db.select().from(roomUsers).where(eq(roomUsers.id, id)))[0]?.role;
    const alive = async (id: number) => (await db.select().from(roomUsers).where(eq(roomUsers.id, id))).length === 1;

    /* 1. Scoped stays scoped. */
    await applyManyOpcode(roomOne, [aliceInOne], 1, { allRooms: false });
    expect(await roleOf(aliceInOne)).toBe(1);
    expect(await roleOf(aliceInTwo), 'the other room must be untouched').toBe(2);

    /* 2. All-rooms expands by user_id, reaching the same PERSON elsewhere. */
    await applyManyOpcode(roomOne, [aliceInOne], 1, { allRooms: true });
    expect(await roleOf(aliceInTwo), 'expansion reached room two via user_id').toBe(1);

    /* 3. Tenant isolation: an id from another account, smuggled in the form, is ignored. */
    await applyManyOpcode(roomOne, [aliceInOne, strangerElsewhere], 4, { allRooms: true });
    expect(await roleOf(strangerElsewhere), 'another tenant is unreachable').toBe(2);

    /* 4. The owner survives Remove All across the account. */
    await applyManyOpcode(roomOne, [ownerInOne], 10, { allRooms: true });
    const ownerRows = await db.select().from(roomUsers).where(eq(roomUsers.userId, owner));
    expect(
      ownerRows.some((row) => row.role === 0),
      'the role-0 row in room two survived Remove All'
    ).toBe(true);

    /* 5. …and Remove All really does remove, in every room. */
    await applyManyOpcode(roomOne, [aliceInOne], 10, { allRooms: true });
    expect(await alive(aliceInOne)).toBe(false);
    expect(await alive(aliceInTwo), 'removed in the other room too').toBe(false);
  }, 120_000);
});

/**
 * Account suspension, proven at the chokepoint rather than asserted in prose.
 *
 * §3.2's own words: "Needs a state column that EVERY auth path honours. Miss one and a suspended
 * owner keeps working, which is worse than no suspend because it reads as enforced." A pure test
 * cannot show that — `readUser` is a join across three tables, and the whole claim is that the join
 * refuses.
 */
describe('account suspension', () => {
  it('stops a session resolving at all, and resumes when reinstated', async () => {
    const { getDb } = await import('./db');
    const { createLoginSession, readUser } = await import('./auth');
    const { accounts, users } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');

    const db = getDb();
    const now = new Date();
    const [account] = await db
      .insert(accounts)
      .values({ name: 'Suspendable', ownerEmail: 'susp@example.test', createdAt: now })
      .returning();
    const [owner] = await db
      .insert(users)
      .values({
        accountId: account.id,
        email: 'susp-owner@example.test',
        displayName: 'Owner',
        createdAt: now
      })
      .returning();

    /* A cookie jar just real enough for createLoginSession/readUser. */
    const jar = new Map<string, string>();
    const cookies = {
      get: (name: string) => jar.get(name),
      set: (name: string, value: string) => jar.set(name, value),
      delete: (name: string) => void jar.delete(name)
    } as unknown as Parameters<typeof readUser>[0];

    await createLoginSession(owner.id, cookies);
    expect((await readUser(cookies))?.id, 'an active account resolves').toBe(owner.id);

    await db.update(accounts).set({ status: 'suspended' }).where(eq(accounts.id, account.id));
    expect(
      await readUser(cookies),
      'a suspended account must not resolve, even with a VALID session cookie'
    ).toBeUndefined();

    /*
      The session row is deliberately NOT deleted by suspension: reinstating must restore access
      without the owner having to sign in again, and destroying sessions would make suspension
      irreversible in practice.
    */
    await db.update(accounts).set({ status: 'active' }).where(eq(accounts.id, account.id));
    expect((await readUser(cookies))?.id, 'reinstating restores the same session').toBe(owner.id);

    /* An unrecognised status is refused, not treated as permission. */
    await db.update(accounts).set({ status: 'past-due' }).where(eq(accounts.id, account.id));
    expect(await readUser(cookies), 'a status this build does not define must not read as permission').toBeUndefined();
  }, 120_000);
});

/**
 * Impersonation — §3.2.5, the most dangerous capability here.
 *
 * Every one of these is a refusal, and every refusal is a property of `beginImpersonation` rather
 * than of the route that calls it, so a second caller added later inherits all of them.
 */
describe('operator impersonation', () => {
  it('refuses another operator, a suspended account, and itself; expires; and never extends', async () => {
    const { getDb } = await import('./db');
    const { accounts, users, impersonations, IMPERSONATION_TTL_MS } = await import('./db/schema');
    const { beginImpersonation, readImpersonation, endImpersonation } = await import('./impersonation');
    const { eq } = await import('drizzle-orm');

    const db = getDb();
    const now = new Date('2026-08-08T12:00:00.000Z');

    const mkAccount = async (name: string, email: string, status = 'active') =>
      (await db.insert(accounts).values({ name, ownerEmail: email, status, createdAt: now }).returning())[0];
    const mkUser = async (accountId: number, email: string) =>
      (await db.insert(users).values({ accountId, email, displayName: email, createdAt: now }).returning())[0];

    const opAccount = await mkAccount('Operator Co', 'imp-operator@example.test');
    const operator = await mkUser(opAccount.id, 'imp-operator@example.test');
    const custAccount = await mkAccount('Customer Co', 'imp-customer@example.test');
    const customer = await mkUser(custAccount.id, 'imp-customer@example.test');
    const suspAccount = await mkAccount('Suspended Co', 'imp-susp@example.test', 'suspended');
    const suspended = await mkUser(suspAccount.id, 'imp-susp@example.test');

    const jar = new Map<string, string>();
    const cookies = {
      get: (name: string) => jar.get(name),
      set: (name: string, value: string) => jar.set(name, value),
      delete: (name: string) => void jar.delete(name)
    } as unknown as Parameters<typeof endImpersonation>[0];

    /*
      THE refusal that matters: an operator may not impersonate another operator.

      Without it, one compromised operator credential becomes all of them — and there is no support
      scenario for it, because an operator can already see every account without pretending to be
      anybody.
    */
    const secondOpAccount = await mkAccount('Second Op Co', 'imp-second-op@example.test');
    const secondOperator = await mkUser(secondOpAccount.id, 'imp-second-op@example.test');
    await expect(
      beginImpersonation({
        operatorUserId: operator.id,
        targetUserId: secondOperator.id,
        reason: null,
        cookies,
        now
      })
    ).rejects.toThrow(/cannot impersonate another operator/);

    /* An operator cannot impersonate themselves. */
    await expect(
      beginImpersonation({
        operatorUserId: operator.id,
        targetUserId: operator.id,
        reason: null,
        cookies,
        now
      })
    ).rejects.toThrow(/already yourself/);

    /*
      A suspended account cannot be impersonated. Allowing it would produce a session `readUser`
      then refuses — an impersonation that silently does nothing reads as a broken feature.
    */
    await expect(
      beginImpersonation({
        operatorUserId: operator.id,
        targetUserId: suspended.id,
        reason: null,
        cookies,
        now
      })
    ).rejects.toThrow(/suspended/);

    /* The real one succeeds, and writes exactly one audit row. */
    const started = await beginImpersonation({
      operatorUserId: operator.id,
      targetUserId: customer.id,
      reason: 'ticket 41',
      cookies,
      now
    });
    expect(started.expiresAt.getTime() - now.getTime()).toBe(IMPERSONATION_TTL_MS);

    const rows = await db.select().from(impersonations).where(eq(impersonations.targetUserId, customer.id));
    expect(rows, 'one row per impersonation, and it IS the audit record').toHaveLength(1);
    expect(rows[0].reason).toBe('ticket 41');
    expect(rows[0].endedAt).toBe(null);

    /* It resolves inside its window… */
    expect((await readImpersonation(cookies, now))?.targetUserId).toBe(customer.id);

    /* …and stops the instant it lapses, without any cleanup job running. */
    const afterExpiry = new Date(started.expiresAt.getTime() + 1);
    expect(await readImpersonation(cookies, afterExpiry), 'a lapsed impersonation must stop working immediately').toBe(
      null
    );

    /* Ending it is recorded, and is idempotent. */
    await endImpersonation(cookies, new Date(now.getTime() + 60_000));
    const [ended] = await db.select().from(impersonations).where(eq(impersonations.id, started.id));
    expect(ended.endedAt, 'exiting is recorded, so "used briefly" differs from "left open"').not.toBe(null);
    await expect(endImpersonation(cookies)).resolves.toBeUndefined();
  }, 120_000);
});

/**
 * The migrator, against a real PostgreSQL.
 *
 * Two properties decide whether adopting versioned migrations was safe, and neither is provable
 * without a database: applying the baseline to a database that ALREADY HAS the schema must be a
 * no-op, and a migration that changed after being applied must refuse to boot.
 */
describe('the migrator', () => {
  it('is idempotent, records what ran, and refuses an edited migration', async () => {
    const { getDb } = await import('./db');
    const { runMigrations, checksum } = await import('./db/migrator.js');
    const { MIGRATIONS } = await import('./db/migrations/index.js');
    const { sql } = await import('drizzle-orm');

    const db = getDb();
    /*
      Called through a TRANSACTION, exactly as `ensureDatabase` does.

      The first version of this test passed the top-level client. That has `.begin`; a
      `TransactionSql` does not — so the migrator's per-migration `sql.begin` threw
      `sql.begin is not a function` in production while this test stayed green. The test has to
      make the same shape of call the real caller makes, or it is testing a different function.
    */
    const client = db.$client;
    /** @type {<T>(fn: (tx: unknown) => Promise<T>) => Promise<T>} */
    const inTransaction = (fn: (tx: unknown) => Promise<unknown>) => client.begin(fn);

    /*
      This test builds its own starting state rather than inheriting one.

      The scenario it exists to prove is ADOPTION: a live database that already has the schema and
      has never heard of `applied_migrations`. That is what production was. Reproducing it means
      the baseline DDL and nothing else — so the schema is torn down and rebuilt from `DDL` here,
      which is also what makes this test independent of whatever ran before it in this file.

      It briefly inherited a fully-migrated database instead, and then asserted that applying the
      baseline did something — which it cannot, because it had already been applied and recorded.
      The assertion was right and the fixture was wrong.
    */
    const { DDL } = await import('./db/ddl.js');
    await db.execute(sql`DROP SCHEMA public CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
    await db.execute(sql.raw(DDL));

    const first = (await inTransaction((tx) => runMigrations(tx))) as Awaited<ReturnType<typeof runMigrations>>;
    expect(first.applied, 'the baseline is recorded when adopted over an existing schema').toContain(0);
    /*
      And migration 1 really runs, because the baseline schema does not have
      `users.email_verified_at` — it is not idempotent and must not be skipped.
    */
    expect(first.applied, 'every later migration applies on adoption too').toEqual(MIGRATIONS.map((m) => m.version));

    const rows = await db.execute(sql`SELECT version, name, checksum FROM applied_migrations`);
    expect(rows.length).toBe(MIGRATIONS.length);

    /* Running again does nothing at all — the property every cold start depends on. */
    const second = (await inTransaction((tx) => runMigrations(tx))) as Awaited<ReturnType<typeof runMigrations>>;
    expect(second.applied, 'a second run must apply nothing').toEqual([]);
    expect(second.alreadyApplied).toEqual(MIGRATIONS.map((m) => m.version));

    /*
      "Never edit a shipped migration — add a new one", enforced.

      Two databases at the same version number with different shapes is the worst failure this
      system can have, because the NEXT migration assumes the version means something.
    */
    await expect(
      inTransaction((tx) => runMigrations(tx, [{ version: 0, name: 'baseline', sql: '-- tampered\nSELECT 1;' }]))
    ).rejects.toThrow(/has changed since it was applied/);

    /* And the message says what to do instead, not just that something is wrong. */
    await expect(runMigrations(client, [{ version: 0, name: 'baseline', sql: 'SELECT 2;' }])).rejects.toThrow(
      /add a new one/
    );

    /* An unedited list still boots after all that — the guard is not sticky. */
    await expect(inTransaction((tx) => runMigrations(tx))).resolves.toMatchObject({ applied: [] });
    expect(checksum(MIGRATIONS[0].sql)).toHaveLength(64);
  }, 120_000);
});
