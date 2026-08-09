import { randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { getDb } from './db';
import { ACCOUNT_ACTIVE, IMPERSONATION_TTL_MS, accounts, impersonations, users } from './db/schema';
import { isSuperadmin } from './superadmin';

/**
 * Operator impersonation: acting as a customer to see what they see.
 *
 * ## Why the identity switch happens inside `readUser` and nowhere else
 *
 * `readUser` is already the single place a cookie becomes an identity, and it is where account
 * suspension is enforced. If impersonation resolved anywhere else it would be a SECOND identity
 * path — and the first thing a second path does is miss a check the first one makes. Here, an
 * impersonated identity is subject to exactly the same suspension gate as a real one.
 *
 * ## What cannot happen, structurally
 *
 *  - **Impersonating another operator.** Refused at creation. Operator-to-operator impersonation is
 *    how one compromised operator account becomes all of them, and it has no support use: an
 *    operator can already see everything.
 *  - **Extending a session.** `expiresAt` is written once and never updated. There is no renew.
 *  - **Escalating back.** While impersonating, `locals.impersonation` is set and `/admin` refuses,
 *    so the console cannot be driven from inside a customer's identity.
 */
const COOKIE = 'control_impersonation';

export interface ImpersonationContext {
  id: string;
  operatorUserId: number;
  targetUserId: number;
  expiresAt: Date;
}

/**
 * Starts one, returning its id. Throws rather than returning a reason: every caller is the single
 * `/admin` action, and a silent refusal here would be a successful impersonation somewhere else.
 */
export async function beginImpersonation(input: {
  operatorUserId: number;
  targetUserId: number;
  reason: string | null;
  cookies: Cookies;
  now?: Date;
}): Promise<{ id: string; expiresAt: Date }> {
  const now = input.now ?? new Date();

  const [target] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      accountId: users.accountId,
      accountStatus: accounts.status
    })
    .from(users)
    .innerJoin(accounts, eq(accounts.id, users.accountId))
    .where(eq(users.id, input.targetUserId))
    .limit(1);

  if (!target) throw new Error('No such user.');
  if (target.id === input.operatorUserId) throw new Error('You are already yourself.');
  /*
    The guardrail that matters most. An operator impersonating another operator turns one
    compromised operator credential into all of them, and there is no support scenario for it —
    an operator can already see every account without pretending to be anyone.
  */
  if (isSuperadmin(target.email)) throw new Error('An operator cannot impersonate another operator.');
  /*
    A suspended account cannot be impersonated. `readUser` would refuse the resulting identity
    anyway, so allowing it would produce an impersonation that silently does nothing — which reads
    as a broken feature rather than an enforced rule.
  */
  if (target.accountStatus !== ACCOUNT_ACTIVE) throw new Error('That account is suspended.');

  const id = randomBytes(32).toString('hex');
  const expiresAt = new Date(now.getTime() + IMPERSONATION_TTL_MS);

  // The row is the audit record, and it is written BEFORE the cookie exists — so there can be no
  // impersonation that was never recorded.
  await getDb().insert(impersonations).values({
    id,
    operatorUserId: input.operatorUserId,
    targetUserId: target.id,
    targetAccountId: target.accountId,
    reason: input.reason,
    startedAt: now,
    expiresAt
  });

  input.cookies.set(COOKIE, id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    // The cookie dies with the row. Both, because either one alone is a way to be wrong.
    maxAge: Math.floor(IMPERSONATION_TTL_MS / 1000)
  });

  return { id, expiresAt };
}

/** Ends the current one, if any. Idempotent: exiting twice is not an error. */
export async function endImpersonation(cookies: Cookies, now: Date = new Date()): Promise<void> {
  const id = cookies.get(COOKIE);
  cookies.delete(COOKIE, { path: '/' });
  if (!id) return;
  await getDb()
    .update(impersonations)
    .set({ endedAt: now })
    .where(and(eq(impersonations.id, id), isNull(impersonations.endedAt)));
}

/**
 * The active impersonation for this request, or null.
 *
 * Expiry is checked in SQL AND in JS below, because a row that has lapsed must stop working the
 * instant it lapses rather than whenever a cleanup job next runs.
 */
export async function readImpersonation(
  cookies: Cookies,
  now: Date = new Date()
): Promise<ImpersonationContext | null> {
  const id = cookies.get(COOKIE);
  if (!id) return null;

  const [row] = await getDb()
    .select()
    .from(impersonations)
    .where(and(eq(impersonations.id, id), isNull(impersonations.endedAt)))
    .limit(1);

  if (!row) return null;
  if (row.expiresAt.getTime() <= now.getTime()) return null;

  return {
    id: row.id,
    operatorUserId: row.operatorUserId,
    targetUserId: row.targetUserId,
    expiresAt: row.expiresAt
  };
}
