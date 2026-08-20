import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { and, eq, isNotNull } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { getDb } from './db';
import { ACCOUNT_ACTIVE, accounts, loginSessions, users } from './db/schema';
import { readImpersonation } from './impersonation';
import { verificationEnforced } from './email-verification';

const COOKIE = 'control_session';

/**
 * The minimum password length, in ONE place.
 *
 * Registration and password reset must agree, and they are in different files. A reset that accepts
 * ten characters where signup demands twelve is not a cosmetic inconsistency — it is a documented
 * rule that can be walked around by anybody who clicks "forgot password", which makes the rule
 * decorative. Both import this.
 */
export const MIN_PASSWORD = 12;

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
 * Sets a new password and signs every existing session out, atomically.
 *
 * ## Why the sessions go
 *
 * The commonest reason somebody resets a password is that they think somebody else has it. If the
 * old sessions survive, the reset achieves nothing against exactly the case it exists for: whoever
 * took the account keeps their cookie and stays signed in, while the owner congratulates themselves
 * on having fixed it. Every session dies, including the caller's — the reset route mints a fresh
 * one afterwards, so the person at the keyboard notices nothing and every other device is out.
 *
 * ## Why one transaction
 *
 * The two halves must not be separable. A password written without the sessions being cleared is
 * the failure above; sessions cleared without the password written is a lockout. Neither is a state
 * worth persisting, so neither is allowed to exist.
 *
 * ## Why `email` is a predicate and not just context
 *
 * Same reason as `markEmailVerified`: the reset token names the address it was issued to. If the
 * account's address changed after the link was sent, the link is stale and must not set a password
 * on whatever address is there now. Zero rows updated is reported back rather than assumed away.
 *
 * ## Why a null `passwordHash` is a predicate too — a privilege escalation, closed 2026-08-20
 *
 * A reset changes a password that EXISTS. It is not a way to grant one, and the difference is a
 * tenancy boundary rather than a nicety, because a row with no hash is not a dormant login — it is
 * somebody ELSE's member record filed inside the owner's account:
 *
 *  - `inviteRoomUser` (`rooms.ts`) creates invited members with `accountId: room.accountId` — the
 *    ROOM OWNER's tenant — and `passwordHash: null`.
 *  - `verifyPassword` refuses those rows in as many words, and `schema.ts` calls them "a member
 *    record, not a login". Both were true, and this function was the one place that made them false.
 *  - There is no per-user role: `requireOwnedRoom` admits any session whose `accountId` matches. So
 *    a member who obtained a session held the owner's ENTIRE account — every room, every setting.
 *
 * The path was: be invited to a room (or hold that room's `ptr_app/.../addUser` pair link, which
 * that endpoint's own docblock promises "can only ever create a plain member"), ask to reset the
 * address you already control, and arrive signed in as a peer of the owner. `forgot-password`
 * declines to issue the token as well, but THIS is the fence that matters — it is at the write, so
 * it holds for any caller that ever reaches here, including a future one.
 *
 * Nothing legitimate is refused: `register` is the only other writer of `users` and it always hashes
 * a password, so every row that can sign in has a non-null hash by construction.
 */
export async function setPasswordFromReset(input: {
  userId: number;
  email: string;
  password: string;
  now?: Date;
}): Promise<boolean> {
  const now = input.now ?? new Date();
  /*
    Hashed OUTSIDE the transaction. scrypt is deliberately slow, and holding a database transaction
    open across it would pin a connection for the duration for no benefit — the hash depends on
    nothing the transaction reads.
  */
  const passwordHash = hashPassword(input.password);

  return getDb().transaction(async (tx) => {
    const changed = await tx
      .update(users)
      .set({
        passwordHash,
        /*
          Redeeming a reset link proves control of the mailbox, which is the identical claim the
          verification link makes. Recording it here means somebody who registered, never clicked
          confirm, and later reset their password does not end up with a proved address still marked
          unproved — and then blocked by `emailIsProved` from creating a room.

          Only ever set, never cleared, and only for the address the token named.
        */
        emailVerifiedAt: now
      })
      .where(
        and(
          eq(users.id, input.userId),
          eq(users.email, input.email),
          // A member record has no password to reset. See the escalation note above.
          isNotNull(users.passwordHash)
        )
      )
      .returning({ id: users.id });

    if (changed.length === 0) return false;

    await tx.delete(loginSessions).where(eq(loginSessions.userId, input.userId));
    return true;
  });
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
