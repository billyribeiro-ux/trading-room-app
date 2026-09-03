import type { Cookies } from '@sveltejs/kit';
import { createHash } from 'node:crypto';
import { and, eq, gt, isNotNull, or } from 'drizzle-orm';
import { db, ensureDatabase } from './db';
import { SESSION_ABSOLUTE_TTL_MS, SESSION_COOKIE } from './auth';
import { sessions, users, userSettings, type User } from './db/schema';

interface ConnectedIdentity {
  /** Null when the request carries no valid session: hooks.server.ts turns that into a 403. */
  user: User | null;
  sessionId: string | undefined;
  /**
   * Which room this session was handed off into, from the session row rather than the URL.
   *
   * The page load asks the controller for this room's configuration, so the answer has to come
   * from somewhere the browser cannot edit.
   */
  roomShortCode: string | null;
  /** Server-owned admission fact used by trial-specific room gates. */
  isFreeTrial: boolean;
}

export function gravatarUrl(identity: string) {
  const hash = createHash('md5').update(identity.trim().toLowerCase()).digest('hex');
  return `https://secure.gravatar.com/avatar/${hash}?d=mm&s=50`;
}

/*
  `SESSION_ABSOLUTE_TTL_MS` MOVED TO `auth.ts` on 2026-08-29, and the move is the point rather than
  tidying: `requireRoomMember` asks the same question this file's `getSessionUser` asks — is there a
  live session — and two copies of "live" is how one of them ends up meaning something else. The
  constant now lives with the other authority values, and both readers import it.

  The direction is the only one available: this file already imports `SESSION_COOKIE` from `auth.ts`,
  so defining it there and importing it here keeps the dependency one-way.
*/

function getSessionUser(sessionId: string | undefined) {
  if (!sessionId) return undefined;

  const oldestValidCreatedAt = new Date(Date.now() - SESSION_ABSOLUTE_TTL_MS);

  /*
    A session only counts if its account can actually authenticate.

    Every visitor used to be given an auto-provisioned `staff` account with no password, and those
    sessions survived the switch to password login - so an old cookie walked straight into the
    room, as a presenter, having proved nothing. The fix was to require a password hash.

    That fix is kept, and the test is now stated rather than inferred. `auth_source` says HOW an
    account may become a session: `'password'` still needs a hash, so every legacy passwordless row
    remains locked out. `'handoff'` is passwordless by design - the controller is the front door,
    and those accounts cannot be logged into here at all, only handed off to with a signed,
    single-use, unexpired token that `/session` has already verified.
  */
  return db
    .select({
      user: users,
      roomShortCode: sessions.roomShortCode,
      isFreeTrial: sessions.isFreeTrial
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.id, sessionId),
        or(eq(users.authSource, 'handoff'), isNotNull(users.passwordHash)),
        gt(sessions.createdAt, oldestValidCreatedAt)
      )
    )
    .get();
}

/**
 * A public, stable, one-way handle for a session.
 *
 * The page payload used to carry the raw `ptr_connection` value - the actual
 * authentication credential - and the client put it in a third-party upload URL
 * (`${uploadServer}/image/${sessionId}`) and in a popout window's query string. A
 * credential in a URL ends up in the receiving server's access logs, in any proxy or CDN
 * between here and there, in `Referer` headers, in browser history and in the SSR'd HTML
 * itself. None of the six client call sites needed the secret; every one of them only
 * needed something stable and unique per session.
 *
 * SHA-256 with no salt is sufficient here: the input is a `randomUUID`, so there are 122
 * bits of entropy behind the digest and nothing to enumerate.
 */
export function publicSessionHandle(sessionId: string): string {
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 32);
}

function ensureSettings(userId: number, now: Date) {
  const settings = db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .get();

  if (!settings) {
    db.insert(userSettings)
      .values({
        userId,
        theme: 'light',
        roomLayout: 'left',
        chatTextSize: 16,
        updatedAt: now
      })
      .run();
  }
}

/**
 * Does this session still exist and still authenticate?
 *
 * ## Why it delegates rather than re-querying
 *
 * "A session is valid" is three conditions — the row exists, the account can authenticate at all
 * (`auth_source` plus a password hash for password accounts), and it is inside the absolute TTL —
 * and `getSessionUser` is where all three live. A second query asking a narrower question would be a
 * second definition of validity, and the two would drift in the direction that matters: a check that
 * only asks "does the row exist" keeps a stream open on a session the ordinary request path has
 * already stopped accepting.
 *
 * So this is a boolean over the same query, and the only thing it adds is that it does NOT write
 * `lastSeenAt`. A liveness poll is not activity, and letting it count as activity would keep a
 * session looking fresh purely because a stream was open.
 *
 * The caller is `sess/[room]/events`, which asks once a minute for the life of a connection — see
 * `live-access.ts` for why an open stream has to ask about itself rather than be told.
 */
export function sessionStillAuthenticates(sessionId: string | undefined): boolean {
  if (!sessionId) return false;
  ensureDatabase();
  return getSessionUser(sessionId) !== undefined;
}

export function resolveConnectedIdentity(cookies: Cookies): ConnectedIdentity {
  ensureDatabase();

  const now = new Date();
  const sessionId = cookies.get(SESSION_COOKIE);
  const session = getSessionUser(sessionId);
  let user = session?.user;

  // Identity comes from the session cookie alone. This deliberately no longer provisions an account
  // from request headers, and no longer invents a guest user for anyone without a session: both
  // handed out a working `staff` identity to any caller, which made the role column meaningless and
  // left the room open to anyone who could reach it.
  if (!user || !sessionId)
    return { user: null, sessionId: undefined, roomShortCode: null, isFreeTrial: false };

  if (user.avatarUrl === '/avatar.svg') {
    user = db
      .update(users)
      .set({ avatarUrl: gravatarUrl(user.email) })
      .where(eq(users.id, user.id))
      .returning()
      .get();
  }

  // The row is guaranteed to exist: getSessionUser found this user by joining it. The cookie is
  // deliberately left alone rather than re-issued per request, so the lifetime chosen at login
  // ("Keep me logged in" or not) is the one that applies.
  db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, sessionId)).run();

  ensureSettings(user.id, now);

  return {
    user,
    sessionId,
    roomShortCode: session?.roomShortCode ?? null,
    isFreeTrial: session?.isFreeTrial === true
  };
}

/**
 * The Gravatar identifier for an address - `md5(trim(lowercase(email)))`.
 *
 * Shared rather than duplicated: the page load and the roster stream both build user entries, and
 * two copies of this would eventually disagree and give one person two avatars.
 */
export function hashEmail(email: string) {
  return createHash('md5').update(email.trim().toLowerCase()).digest('hex');
}
