import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { getDb } from './db';
import { ACCOUNT_ACTIVE, accounts, loginSessions, users } from './db/schema';
import { readImpersonation } from './impersonation';
import { verificationEnforced } from './email-verification';

const COOKIE = 'control_session';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false; // null means "cannot authenticate", not an error
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const a = Buffer.from(key, 'hex');
  const b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createLoginSession(userId: number, cookies: Cookies): Promise<string> {
  const id = randomBytes(32).toString('hex');
  const now = new Date();
  await getDb().insert(loginSessions).values({ id, userId, createdAt: now, lastSeenAt: now });
  cookies.set(COOKIE, id, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });
  return id;
}

export async function destroyLoginSession(cookies: Cookies) {
  const id = cookies.get(COOKIE);
  if (id) await getDb().delete(loginSessions).where(eq(loginSessions.id, id));
  cookies.delete(COOKIE, { path: '/' });
}

/**
 * The one place a cookie becomes an identity — and therefore the one place account suspension has
 * to be enforced for every authenticated route.
 *
 * `hooks.server.ts` calls this once per request and puts the answer on `locals.user`, which
 * `requireUser` and `requireOwnedRoom` read. So a suspended account stops resolving here and every
 * `requireUser` path redirects to `/login` without any route needing to know why. The alternative —
 * a check per route — is how "a suspended owner keeps working" happens: it only takes one route
 * added later that forgets.
 *
 * The join to `accounts` is not free, but it replaces nothing: this query already joined `users`,
 * and one more indexed join on a primary key per request is the price of the guarantee.
 */
export async function readUser(cookies: Cookies) {
  const id = cookies.get(COOKIE);
  if (!id) return undefined;
  const [row] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      accountId: users.accountId,
      emailVerifiedAt: users.emailVerifiedAt,
      accountStatus: accounts.status
    })
    .from(loginSessions)
    .innerJoin(users, eq(users.id, loginSessions.userId))
    .innerJoin(accounts, eq(accounts.id, users.accountId))
    .where(eq(loginSessions.id, id))
    .limit(1);
  if (!row) return undefined;
  /*
    Anything that is not exactly 'active' is refused, rather than only 'suspended' being refused.
    A status this build does not recognise — one a later migration adds, or a typo written by hand —
    must not read as permission.
  */
  if (row.accountStatus !== ACCOUNT_ACTIVE) return undefined;
  const { accountStatus: _suspended, ...identity } = row;
  await getDb().update(loginSessions).set({ lastSeenAt: new Date() }).where(eq(loginSessions.id, id));

  /*
    Impersonation resolves HERE, inside the one function that turns a cookie into an identity.

    Doing it anywhere else would create a second identity path, and the first thing a second path
    does is miss a check the first one makes — the suspension gate immediately above, for instance.
    Because the swap happens before this function returns, an impersonated identity is subject to
    every rule a real one is: the target's account is re-read and re-checked below.
  */
  const impersonation = await readImpersonation(cookies);
  if (!impersonation) {
    // `accountStatus` was only ever a gate; it does not belong on `locals.user`, which is spread
    // into page payloads.
    return identity;
  }

  /*
    Only the operator who STARTED it may use it.

    Without this, an impersonation cookie lifted from an operator's browser would work in anybody
    else's — including the impersonated customer's, who would then be holding a credential minted
    for somebody with cross-tenant authority.
  */
  if (impersonation.operatorUserId !== identity.id) return identity;

  const [target] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      accountId: users.accountId,
      emailVerifiedAt: users.emailVerifiedAt,
      accountStatus: accounts.status
    })
    .from(users)
    .innerJoin(accounts, eq(accounts.id, users.accountId))
    .where(eq(users.id, impersonation.targetUserId))
    .limit(1);

  // Suspended mid-impersonation, or deleted: fall back to the operator's own identity rather than
  // to nothing, so they land on their own account page instead of being signed out.
  if (!target || target.accountStatus !== ACCOUNT_ACTIVE) return identity;

  const { accountStatus: _targetSuspended, ...impersonated } = target;
  return { ...impersonated, impersonatedBy: identity.id, impersonationExpiresAt: impersonation.expiresAt };
}

export function requireUser(locals: App.Locals) {
  if (!locals.user) redirect(303, '/login');
  return locals.user;
}

/**
 * Refuses an action until the address has been proved — but only where proving it is possible.
 *
 * Two conditions, and both matter:
 *
 *  - `verificationEnforced()` is false on a deployment with no mail transport, and this returns
 *    the user unchanged there. Gating on a link that can never be sent is a lockout, not security.
 *  - accounts created before verification existed carry a backfilled `emailVerifiedAt` (migration
 *    1), so this cannot retroactively shut out anybody who already had a working account.
 *
 * Returns rather than redirects, so a form action can `fail()` with a message the page renders
 * beside the button that was pressed.
 */
export function emailIsProved(user: { emailVerifiedAt: Date | null }): boolean {
  return !verificationEnforced() || user.emailVerifiedAt !== null;
}

/**
 * Every room read and write goes through this. The reference carries NO role gate
 * in its markup at all, which is survivable for a single-owner app and is not for
 * multi-tenant SaaS: without this, one account's room id is another account's data.
 */
export function requireOwnedRoom(locals: App.Locals, room: { accountId: number } | undefined) {
  const user = requireUser(locals);
  if (!room || room.accountId !== user.accountId) error(404, 'Room not found');
  return room;
}
