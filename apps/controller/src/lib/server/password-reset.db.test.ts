import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * The password reset, against a real PostgreSQL.
 *
 * ## Why the unit tests are not enough here
 *
 * `password-reset.test.ts` runs against a hand-written stub, so it proves the branch order and the
 * policy constants and nothing whatsoever about the SQL. Three of this flow's guarantees live
 * ENTIRELY in the SQL and are invisible to a stub:
 *
 *  - the single-use guarantee is a conditional `UPDATE … WHERE consumed_at IS NULL`, and whether it
 *    actually excludes a second concurrent redemption is a property of the database, not of a
 *    JavaScript predicate that a stub evaluates one call at a time;
 *  - the password write and the session revocation share a transaction, and whether a failure rolls
 *    BOTH back cannot be observed without a real one;
 *  - `resetRequestedRecently` orders by `created_at DESC` in SQL. The stub sorts in JavaScript, so
 *    it would pass an implementation whose `orderBy` was wrong in a way only Postgres would show.
 *
 * The registration case in `register-provisions-room.db.test.ts` exists because a feature shipped
 * broken with a green unit suite. This is the same category of risk, on the flow whose entire job
 * is to work on the worst day somebody has with this product.
 *
 * Same throwaway-cluster harness as the other `.db` cases: `initdb` into a temp directory, a random
 * high port bound to loopback only, `pg_ctl stop` and delete afterwards. `vite.config.ts` excludes
 * `*.db.test.ts` from the default run; `pnpm test:db` invokes it deliberately.
 */

const CLUSTER = mkdtempSync(join(tmpdir(), 'proroom-reset-'));
const DATA = join(CLUSTER, 'data');
const PORT = 55_000 + Math.floor(Math.random() * 4_000);
const URL = `postgres://127.0.0.1:${PORT}/proroom_reset_test`;

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
  run('createdb', ['-h', '127.0.0.1', '-p', String(PORT), 'proroom_reset_test']);
}, 120_000);

afterAll(() => {
  if (started) run('pg_ctl', ['-D', DATA, '-m', 'immediate', '-w', 'stop']);
  rmSync(CLUSTER, { recursive: true, force: true });
});

/** A fresh account per case, so no case depends on another's leftovers. */
async function makeUser(email: string) {
  const { getDb } = await import('./db');
  const { accounts, users } = await import('./db/schema');
  const { hashPassword } = await import('./auth');

  const db = getDb();
  const now = new Date();
  const [account] = await db
    .insert(accounts)
    .values({ name: 'Ada Lovelace', ownerEmail: email, createdAt: now })
    .returning({ id: accounts.id });
  const [user] = await db
    .insert(users)
    .values({
      accountId: account.id,
      email,
      displayName: 'Ada Lovelace',
      passwordHash: hashPassword('the-old-password-12'),
      createdAt: now
    })
    .returning({ id: users.id });
  return { accountId: account.id, userId: user.id, email };
}

async function sessionsFor(userId: number) {
  const { getDb } = await import('./db');
  const { loginSessions } = await import('./db/schema');
  const { eq } = await import('drizzle-orm');
  return getDb().select().from(loginSessions).where(eq(loginSessions.userId, userId));
}

async function userRow(userId: number) {
  const { getDb } = await import('./db');
  const { users } = await import('./db/schema');
  const { eq } = await import('drizzle-orm');
  const [row] = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
  return row;
}

beforeAll(async () => {
  const { ensureDatabase } = await import('./db');
  // Through the migrator, exactly as the application runs it — the baseline DDL alone builds a
  // schema this code cannot write to.
  await ensureDatabase();
}, 120_000);

describe('redeeming a reset token, against a real PostgreSQL', () => {
  it('is single-use under genuine concurrency, not merely in sequence', async () => {
    const { issueToken, redeemToken } = await import('./email-verification');
    const { RESET_TTL_MS } = await import('./password-reset');
    const user = await makeUser('race@example.test');

    const token = await issueToken({
      userId: user.userId,
      email: user.email,
      purpose: 'reset-password',
      ttlMs: RESET_TTL_MS
    });

    /*
      Both at once, on separate connections — the real thing the conditional UPDATE defends against.
      Mail clients and security appliances genuinely do prefetch and re-request links in parallel,
      which is why a SELECT-then-UPDATE would be a live race rather than a theoretical one.
    */
    const [a, b] = await Promise.all([redeemToken(token, 'reset-password'), redeemToken(token, 'reset-password')]);

    const winners = [a, b].filter((r) => r.ok);
    const losers = [a, b].filter((r) => !r.ok);
    expect(winners, 'exactly one redemption may succeed').toHaveLength(1);
    expect(losers, 'the other must be refused, not silently succeed').toHaveLength(1);
    expect(losers[0]).toEqual({ ok: false, reason: 'already-used' });
  }, 60_000);

  it('refuses a token whose purpose is verification, so the two cannot be swapped', async () => {
    const { issueToken, redeemToken } = await import('./email-verification');
    const user = await makeUser('purpose@example.test');

    const verify = await issueToken({ userId: user.userId, email: user.email, purpose: 'verify-email' });
    expect(await redeemToken(verify, 'reset-password')).toEqual({ ok: false, reason: 'unknown' });
  }, 60_000);

  it('writes the caller-supplied expiry, so a reset link really does last an hour', async () => {
    const { getDb } = await import('./db');
    const { emailVerificationTokens } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');
    const { hashToken, issueToken } = await import('./email-verification');
    const { RESET_TTL_MS } = await import('./password-reset');
    const user = await makeUser('ttl@example.test');

    const issuedAt = new Date();
    const token = await issueToken({
      userId: user.userId,
      email: user.email,
      purpose: 'reset-password',
      now: issuedAt,
      ttlMs: RESET_TTL_MS
    });

    const [row] = await getDb()
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenHash, hashToken(token)))
      .limit(1);

    expect(row.expiresAt.getTime() - issuedAt.getTime()).toBe(RESET_TTL_MS);
    // Round-tripped through `timestamptz`, which is where a naive column would have lost the zone.
    expect(row.tokenHash).toBe(hashToken(token));
  }, 60_000);
});

describe('setPasswordFromReset, against a real PostgreSQL', () => {
  it('changes the password, proves the address, and deletes EVERY session', async () => {
    const { createLoginSession, setPasswordFromReset, verifyPassword } = await import('./auth');
    const user = await makeUser('happy@example.test');

    /*
      Three sessions, as if the account were signed in on a laptop, a phone and a tablet — which is
      the situation the revocation exists for.
    */
    const jar = () => {
      const store = new Map<string, string>();
      return {
        get: (k: string) => store.get(k),
        set: (k: string, v: string) => store.set(k, v),
        delete: (k: string) => store.delete(k)
      };
    };
    await createLoginSession(user.userId, jar() as never);
    await createLoginSession(user.userId, jar() as never);
    await createLoginSession(user.userId, jar() as never);
    expect(await sessionsFor(user.userId)).toHaveLength(3);

    expect(
      await setPasswordFromReset({ userId: user.userId, email: user.email, password: 'a-brand-new-password' })
    ).toBe(true);

    const row = await userRow(user.userId);
    expect(verifyPassword('a-brand-new-password', row.passwordHash), 'the new password must work').toBe(true);
    expect(verifyPassword('the-old-password-12', row.passwordHash), 'the old password must not').toBe(false);
    /*
      Clicking a link in that mailbox is the same claim the verification link makes, so somebody who
      never confirmed at signup is not left blocked by `emailIsProved` after recovering the account.
    */
    expect(row.emailVerifiedAt, 'redeeming proves the address').not.toBeNull();

    expect(
      await sessionsFor(user.userId),
      'every session must go — the usual reason for a reset is that somebody else holds one'
    ).toHaveLength(0);
  }, 60_000);

  it('changes NOTHING when the address moved after the link was sent', async () => {
    const { createLoginSession, setPasswordFromReset, verifyPassword } = await import('./auth');
    const user = await makeUser('moved@example.test');

    const jar = () => {
      const store = new Map<string, string>();
      return {
        get: (k: string) => store.get(k),
        set: (k: string, v: string) => store.set(k, v),
        delete: (k: string) => store.delete(k)
      };
    };
    await createLoginSession(user.userId, jar() as never);

    // The token named an address this account no longer uses.
    expect(
      await setPasswordFromReset({ userId: user.userId, email: 'old@example.test', password: 'should-not-be-set' })
    ).toBe(false);

    const row = await userRow(user.userId);
    expect(verifyPassword('should-not-be-set', row.passwordHash), 'no password may be written').toBe(false);
    expect(verifyPassword('the-old-password-12', row.passwordHash), 'the original must survive').toBe(true);
    /*
      The half-applied state this transaction exists to prevent: sessions cleared without the
      password being written is a lockout, and it is what a two-statement version would produce.
    */
    expect(await sessionsFor(user.userId), 'and the sessions must survive with it').toHaveLength(1);
  }, 60_000);

  it("leaves another account's sessions alone", async () => {
    const { createLoginSession, setPasswordFromReset } = await import('./auth');
    const mine = await makeUser('mine@example.test');
    const theirs = await makeUser('theirs@example.test');

    const jar = () => {
      const store = new Map<string, string>();
      return {
        get: (k: string) => store.get(k),
        set: (k: string, v: string) => store.set(k, v),
        delete: (k: string) => store.delete(k)
      };
    };
    await createLoginSession(mine.userId, jar() as never);
    await createLoginSession(theirs.userId, jar() as never);

    await setPasswordFromReset({ userId: mine.userId, email: mine.email, password: 'a-brand-new-password' });

    expect(await sessionsFor(mine.userId)).toHaveLength(0);
    expect(await sessionsFor(theirs.userId), 'one reset must not sign the whole product out').toHaveLength(1);
  }, 60_000);
});

describe('resetRequestedRecently, against real SQL', () => {
  it('reads the newest unconsumed token when several exist', async () => {
    const { getDb } = await import('./db');
    const { emailVerificationTokens } = await import('./db/schema');
    const { RESET_COOLDOWN_MS, resetRequestedRecently } = await import('./password-reset');
    const user = await makeUser('cooldown@example.test');

    const old = new Date('2026-08-09T09:00:00Z');
    const fresh = new Date('2026-08-09T10:00:00Z');

    /*
      Inserted OLDEST FIRST, so physical row order and `created_at` order disagree. Inserted the
      other way round this case passes even without an ORDER BY, because Postgres would happen to
      return the right row — the same trap the unit test fell into and was corrected for.
    */
    await getDb()
      .insert(emailVerificationTokens)
      .values([
        {
          tokenHash: 'hash-old',
          userId: user.userId,
          email: user.email,
          purpose: 'reset-password',
          expiresAt: new Date(old.getTime() + 3_600_000),
          createdAt: old
        },
        {
          tokenHash: 'hash-fresh',
          userId: user.userId,
          email: user.email,
          purpose: 'reset-password',
          expiresAt: new Date(fresh.getTime() + 3_600_000),
          createdAt: fresh
        }
      ]);

    // Reading the OLD row would put this an hour outside the cooldown and answer false.
    expect(await resetRequestedRecently(user.userId, new Date(fresh.getTime() + 1_000))).toBe(true);
    expect(await resetRequestedRecently(user.userId, new Date(fresh.getTime() + RESET_COOLDOWN_MS))).toBe(false);
  }, 60_000);

  it('does not count a consumed token, so finishing one reset does not block the next', async () => {
    const { issueToken, redeemToken } = await import('./email-verification');
    const { resetRequestedRecently } = await import('./password-reset');
    const user = await makeUser('again@example.test');

    const token = await issueToken({ userId: user.userId, email: user.email, purpose: 'reset-password' });
    expect(await resetRequestedRecently(user.userId), 'the live token holds the door shut').toBe(true);

    await redeemToken(token, 'reset-password');
    expect(await resetRequestedRecently(user.userId), 'spending it opens it again').toBe(false);
  }, 60_000);
});
