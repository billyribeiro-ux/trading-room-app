import { redirect, type Cookies } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { sessions, users, type User } from './db/schema';
import { verifyPassword } from './password';
import { signedOutDestination } from './control-plane';

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
  if (!locals.user) redirect(303, signedOutDestination());
  return locals.user;
}

/** The session id behind requireUser's account, narrowed the same way and for the same reason. */
/**
 * The room this session belongs to, or a redirect back to the controller.
 *
 * A session created before the handoff existed has no room, and there is no sensible default: the
 * controller decides which room somebody is in, and guessing at one would load another room's
 * settings. Sending them back to the front door is the only correct answer.
 */
export function requireRoomShortCode(locals: App.Locals): string {
  if (!locals.roomShortCode) redirect(303, signedOutDestination());
  return locals.roomShortCode;
}

export function requireSessionId(locals: App.Locals): string {
  if (!locals.sessionId) redirect(303, signedOutDestination());
  return locals.sessionId;
}

export function requirePresenter(locals: App.Locals): User {
  const user = requireUser(locals);
  if (!isPresenterRole(user.role)) redirect(303, '/');
  return user;
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
 * Issues a session for an account whose identity has already been established.
 *
 * Split out of `login()` so the handoff receiver at `/session` can reuse the cookie policy rather
 * than re-implement it. The two callers differ only in how they came to trust the account: one
 * verified a password here, the other verified a signature the controller produced.
 *
 * There is deliberately no credential check inside this function. It is named for what it does,
 * so a future caller cannot mistake it for one that authenticates.
 */
export function createSessionFor(
  cookies: Cookies,
  userId: number,
  remember: boolean,
  roomShortCode: string | null = null
): string {
  const now = new Date();
  const sessionId = randomUUID();
  db.insert(sessions)
    .values({ id: sessionId, userId, roomShortCode, createdAt: now, lastSeenAt: now })
    .run();
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
