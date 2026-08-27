import { error, redirect, type Cookies } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { sessions, users, type User } from './db/schema';
import { verifyPassword } from './password';
import { redirectSignedOut } from './control-plane';

export const SESSION_COOKIE = 'ptr_connection';
const THIRTY_DAYS = 60 * 60 * 24 * 30;
const ONE_DAY = 60 * 60 * 24;

/** The roles that may post alerts, run polls and edit notes. */
export function isPresenterRole(role: string) {
  return role === 'staff' || role === 'admin';
}

export function isAdminRole(role: string) {
  return role === 'admin';
}

/**
 * Narrows `locals.user` to a real account. hooks.server.ts already redirects unauthenticated
 * requests, so this never throws in practice - it is what lets every action use a non-null user
 * without asserting, and it is a second line of defence if a route is ever added outside the guard.
 */
export function requireUser(locals: App.Locals): User {
  // The room has no login of its own; the controller is the front door. `hooks.server.ts` refuses
  // an anonymous request before this is ever reached, so this is the second line of defence for a
  // route added outside the guard.
  if (!locals.user) redirectSignedOut();
  return locals.user;
}

/**
 * The room this session belongs to, or a redirect back to the controller.
 *
 * A session created before the handoff existed has no room, and there is no sensible default: the
 * controller decides which room somebody is in, and guessing at one would load another room's
 * settings. Sending them back to the front door is the only correct answer.
 */
export function requireRoomShortCode(locals: App.Locals): string {
  if (!locals.roomShortCode) redirectSignedOut();
  return locals.roomShortCode;
}

/** The session id behind requireUser's account, narrowed the same way and for the same reason. */
export function requireSessionId(locals: App.Locals): string {
  if (!locals.sessionId) redirectSignedOut();
  return locals.sessionId;
}

export function requirePresenter(locals: App.Locals): User {
  const user = requireUser(locals);
  if (!isPresenterRole(user.role)) redirect(303, '/');
  return user;
}

/**
 * The presenter gate and the caller's room, together, for REMOTE FUNCTIONS.
 *
 * Returns the room short code — from the SESSION. A `roomShortCode` on any remote function's
 * argument would let a presenter of room A command room B, so none of them has one, and this is the
 * only way any of them learns which room it is acting on.
 *
 * **Why the two are one call and not two.** Every presenter broadcast needs both: the authority to
 * send, and the tenant to send into. Handed out separately they can be applied separately, and the
 * failure mode of applying only the first is a presenter of one room reaching another — the
 * 2026-08-07 privilege escalation. Returning the room only after the role check makes "gated" and
 * "scoped" the same event.
 *
 * **Why it lives here rather than in a `.remote.ts`.** It began inside
 * `presenter-commands.remote.ts`, where it replaced the same role test inlined by hand in two
 * adjacent actions. The moment a second module needed it, keeping it there would have recreated the
 * duplication one level up. Authority helpers belong with the other authority helpers.
 *
 * `error(403)` and not `redirect` — unlike {@link requirePresenter} above, which serves page loads.
 * A redirect is not a thing a remote command can do (SvelteKit refuses it), and a rejected promise
 * is the failure a command's caller can actually see.
 */
export function presenterRoom(): string {
  const { locals } = getRequestEvent();
  if (!isPresenterRole(requireUser(locals).role)) error(403, 'Presenters only.');
  return requireRoomShortCode(locals);
}

function setSessionCookie(cookies: Cookies, sessionId: string, remember: boolean) {
  cookies.set(SESSION_COOKIE, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    // "Keep me logged in" is the only thing that survives the browser session; without it the
    // cookie still needs a lifetime, so it gets a day rather than a month.
    maxAge: remember ? THIRTY_DAYS : ONE_DAY
  });
}

/**
 * Issues a session for an account whose identity has already been established, and **ends every
 * other session that account holds.**
 *
 * Split out of `login()` so the handoff receiver at `/session` can reuse the cookie policy rather
 * than re-implement it. The two callers differ only in how they came to trust the account: one
 * verified a password here, the other verified a signature the controller produced.
 *
 * There is deliberately no credential check inside this function. It is named for what it does,
 * so a future caller cannot mistake it for one that authenticates.
 *
 * ## ONE ACCOUNT, ONE ACTIVE SESSION — a deliberate divergence from the original
 *
 * **We knowingly do not match the reference here, and this is why.** The original lets one login be
 * used from many devices at once, so customers share credentials and one subscription serves several
 * people. This function used to reproduce that exactly: a plain `INSERT` that deleted nothing, with
 * no per-user session limit anywhere in the room. `NEW-TODO.md` Part 1 records it as one of two
 * revenue leaks we are fixing rather than porting.
 *
 * **Newest login wins.** That is what streaming services do, and it is the self-service shape: the
 * real subscriber logs in again and evicts whoever they shared the password with, without a support
 * ticket. Oldest-holds would turn every shared password into one.
 *
 * **No exemption, for any role** — owner, presenter and participant alike. Confirmed by the owner on
 * 2026-08-27 when the alternative was put to them explicitly, so a presenter using a laptop and a
 * phone in the same room keeps only the newer of the two. Recorded because the cost is real and was
 * accepted knowingly, not overlooked: relaxing it later means adding a role test HERE, and nowhere
 * else.
 *
 * **Scope is the ACCOUNT, not the account-and-room.** One person cannot hold a session in two rooms
 * at once either. Same reasoning: per-room would let one shared login serve two rooms simultaneously,
 * which is the leak wearing a narrower hat.
 *
 * ## What the evicted device sees
 *
 * Its session row is gone, so its next ordinary request resolves to no user and it is redirected to
 * signed out — that half needs no new code, because `getSessionUser` already joins on the row. The
 * half that DID need code is the open realtime stream, which authenticates once at connect and would
 * otherwise keep delivering alerts to a browser whose session no longer exists: `sess/[room]/events`
 * re-checks and closes with a stated reason. `session-limit-contract.test.ts` covers this side and
 * `entitlement-recheck-contract.test.ts` the other.
 */
export function createSessionFor(
  cookies: Cookies,
  userId: number,
  remember: boolean,
  roomShortCode: string | null = null
): string {
  const now = new Date();
  const sessionId = randomUUID();
  /*
    ONE TRANSACTION, and the order inside it is the whole point.

    A delete followed by a separate insert has a window where the account has NO session at all. A
    request arriving in that window — the same browser's own next request, on a fast connection —
    resolves to no user and redirects to signed out, so the login that was supposed to succeed
    presents as a login that failed. `better-sqlite3` transactions are synchronous, so this is one
    atomic step with no `await` inside it and no lock held across one.

    The delete is FIRST rather than "delete every row except the new one", because the second shape
    needs the new id to exist before it can be excluded, which is the ordering that has the window.
  */
  db.transaction((transaction) => {
    transaction.delete(sessions).where(eq(sessions.userId, userId)).run();
    transaction
      .insert(sessions)
      .values({ id: sessionId, userId, roomShortCode, createdAt: now, lastSeenAt: now })
      .run();
  });
  setSessionCookie(cookies, sessionId, remember);
  return sessionId;
}

/**
 * Verifies the credentials and, only on success, issues a session. Returns null for both an unknown
 * email and a bad password so the caller cannot leak which accounts exist.
 */
export async function login(
  cookies: Cookies,
  email: string,
  password: string,
  remember: boolean
): Promise<User | null> {
  const normalisedEmail = email.trim().toLowerCase();
  if (!normalisedEmail || !password) return null;

  const user = db.select().from(users).where(eq(users.email, normalisedEmail)).get();
  // Still runs the derivation for an unknown email so the response time does not distinguish
  // "no such account" from "wrong password".
  const ok = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !ok) return null;

  createSessionFor(cookies, user.id, remember);
  return user;
}

export function logout(cookies: Cookies) {
  const sessionId = cookies.get(SESSION_COOKIE);
  if (sessionId) db.delete(sessions).where(eq(sessions.id, sessionId)).run();
  cookies.delete(SESSION_COOKIE, { path: '/' });
}
