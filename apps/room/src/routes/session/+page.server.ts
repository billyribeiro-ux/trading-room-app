import { error, fail, redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { db, ensureDatabase } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { createSessionFor } from '$lib/server/auth';
import { isBannedFromRoom, isShutOutByRoomState, roomRoleFor } from '$lib/server/room-role';
import { verifyHandoffToken } from '$lib/server/handoff-token';
import { hashEmail } from '$lib/server/connection';
import {
  decideRoomEntryRemotely,
  readRoomConfig,
  type RoomConfig,
  type RoomMembership
} from '$lib/server/room-config-client';
import type { Actions, PageServerLoad } from './$types';

/**
 * `/session?id=<shortCode>&jwtSite=<HS256 JWT>` — the room's own login page.
 *
 * ## Why this is a PAGE, where it used to be a redirect
 *
 * The reference ALWAYS renders `app-session-login`, and nothing auto-submits it:
 * `doLoginCheck()` has exactly four callers in that component and every one is a click or submit
 * binding (`app-session-login.full.js:408, 451, 908, 948`). A member arriving with a token sees
 * their name and email already filled in, adjusts the name if the room allows it, and presses
 * `Login`. This redirected straight into the room instead, which was reported as the difference it
 * is.
 *
 * ## This is NOT the room's old login
 *
 * `ROOM-STATE-2026-08-06.md` row 78 deleted an email-and-password identity system — a second place
 * to authenticate an account, for a product whose front door is the controller. None of it returns.
 * **The signed handoff still decides who you are.** This page confirms a display name and collects
 * the room's own entry rules; it cannot promote anybody, and the role still comes from the
 * controller's membership.
 *
 * ## Where the password is checked, and why not here
 *
 * `webinarPW` appears NOWHERE in the reference's 2.9 MB bundle. Its `loginToRoom()` builds
 * `{cver, nick, email}`, adds `i.pw` when one was typed, and posts it — its SERVER decides. So does
 * ours: `decideRoomEntryRemotely` asks the controller, which runs the same `decideRoomEntry` the
 * guest door uses. The credential never reaches this application, which is also what
 * `room-config-boundary.test.ts` requires of every credential-shaped setting.
 */

/** What the reference prefills before it renders the form. */
type Prefill = {
  token: string;
  shortCode: string;
  name: string;
  email: string;
  /** `this.email && e && (this.readOnlyEmail = !0)` — the token supplied it, so it is not editable. */
  readOnlyEmail: boolean;
  /** `'a' !== decodedPassedToken.perms && sessData.disableEditingUsername`. */
  disableEditingUsername: boolean;
  /** `sessData.usernameInstructions`, byte 1189881. */
  usernameInstructions: string;
  /** `showPresenter = sessData.showPasswordField`, byte 1189804. */
  showPasswordField: boolean;
  /** `sessData.hasRequiredPhoneInLogin`, byte 1189964. */
  hasRequiredPhoneInLogin: boolean;
  /** `sessData.customEnterDisclosure`, byte 1190048. */
  customEnterDisclosure: string;
  /** `?dlf=1` — `globals.disableLoginForm`, bundle byte 2595200ff. */
  disableLoginForm: boolean;
  roomTitle: string;
  avatarUrl: string;
};

/**
 * Verifies the handoff and reads the room, or throws the refusals the redirect used to throw.
 *
 * Shared by `load` and the action, because a POST is a fresh request that may carry anything: the
 * submit re-runs every one of these rather than trusting a form that says it already passed them.
 */
async function verifyEntry(request: Request, token: string | null, shortCode: string | undefined) {
  // `$env/dynamic/private`, not `process.env` — SvelteKit never copies `.env` into the latter.
  const secret = privateEnv.ROOM_JWT_SECRET;
  if (!secret) {
    // No fallback: a default secret here would let anyone who can read this file mint entry.
    console.error('[session] ROOM_JWT_SECRET is not configured; refusing every handoff');
    error(500, 'This room is not configured to accept sign-ins.');
  }

  const verified = verifyHandoffToken(secret, token);
  if (!verified.ok) {
    // One message for every rejection; which check failed is for the log, not the caller.
    console.warn('[session] handoff rejected', { room: shortCode, reason: verified.reason });
    error(403, 'This sign-in link is not valid. Open the room from your account page again.');
  }

  let roomConfig: RoomConfig | null = null;
  let membership: RoomMembership | null = null;
  if (shortCode) {
    try {
      roomConfig = await readRoomConfig(request, shortCode, verified.claims.email);
      membership = roomConfig.member;
    } catch (cause) {
      // Fail CLOSED. `roomRoleFor(null)` is `member`, the safe answer to "cannot tell".
      console.error('[session] could not read the membership; entering as a member', cause);
    }
  }

  if (isBannedFromRoom(membership)) {
    console.warn('[session] refused a banned member', {
      room: shortCode,
      email: verified.claims.email
    });
    error(403, 'You do not have access to this room.');
  }

  if (roomConfig && isShutOutByRoomState(roomConfig.room.state, membership)) {
    console.warn('[session] refused entry to a closed room', { room: shortCode });
    error(403, 'This room is closed.');
  }

  return { claims: verified.claims, roomConfig, membership };
}

export const load: PageServerLoad = async ({ url, request }) => {
  ensureDatabase();

  const shortCode = url.searchParams.get('id')?.trim();
  const token = url.searchParams.get('jwtSite');
  const { claims, roomConfig, membership } = await verifyEntry(request, token, shortCode);
  const settings = roomConfig?.settings ?? {};

  /*
    The reference's prefill, in its own order:

      globals.loginNick  -> this.nick     (`?name=`)
      globals.loginEmail -> this.email    (`?email=`)
      …then on the token path:
      this.nick  = preferences.savedNick || decodedPassedToken.name
      this.email = this.email            || decodedPassedToken.email
      this.email && e && (this.readOnlyEmail = !0)

    `?name=` and `?email=` win over the token because that is the order it assigns them in.
  */
  const prefill: Prefill = {
    token: token ?? '',
    shortCode: shortCode ?? '',
    name: (url.searchParams.get('name') ?? claims.name ?? '').trim(),
    email: (url.searchParams.get('email') ?? claims.email ?? '').trim(),
    readOnlyEmail: Boolean(claims.email),
    /*
      `'a' !== decodedPassedToken.perms && sessData.disableEditingUsername`. `'a'` is the presenter
      permission and that is not a guess — `loginToRoom` sets `isPresenter: 'a' === o.perms` from
      the same claim, and this room maps that membership to `staff`.
    */
    disableEditingUsername:
      roomRoleFor(membership) !== 'staff' && settings.disableEditingUsername === true,
    usernameInstructions: String(settings.usernameInstructions ?? ''),
    showPasswordField: settings.showPasswordField === true,
    hasRequiredPhoneInLogin: settings.hasRequiredPhoneInLogin === true,
    customEnterDisclosure: String(settings.customEnterDisclosure ?? ''),
    disableLoginForm: url.searchParams.get('dlf') === '1',
    roomTitle: roomConfig?.room.name ?? '',
    // The same derivation the roster uses, so the face here is the face in the room.
    avatarUrl: `https://www.gravatar.com/avatar/${hashEmail(claims.email)}?d=mm`
  };

  return prefill;
};

export const actions: Actions = {
  /** `doLoginCheck()` -> `loginToRoom()` — the Login button, and the only way in. */
  default: async ({ request, cookies, getClientAddress }) => {
    ensureDatabase();

    const form = await request.formData();
    const token = String(form.get('jwtSite') ?? '');
    const shortCode = String(form.get('id') ?? '').trim() || undefined;

    const { claims, roomConfig, membership } = await verifyEntry(request, token, shortCode);
    const settings = roomConfig?.settings ?? {};

    const name = String(form.get('name') ?? '').trim();
    const phone = String(form.get('phone') ?? '').trim();

    /*
      THE DECISION IS THE CONTROLLER'S, and there is exactly one of it.

      `decideRoomEntry` already covers `isLocked`, `banIPList`, `nickFilter`, the three room
      passwords, the free-trial password, `secTok` and `customEnterDisclosure`, and the guest door
      calls the same function. Re-implementing any of it here is how two doors end up disagreeing
      about who may enter — and half of it is impossible here anyway, because the credentials it
      reads are the ones that may never cross to this application.

      The page has already applied the reference's own CLIENT-side checks with the reference's own
      messages. This is the authoritative pass.
    */
    let decision;
    try {
      decision = await decideRoomEntryRemotely(shortCode ?? '', {
        name,
        email: claims.email,
        phone,
        password: String(form.get('password') ?? ''),
        secretToken: String(form.get('secTok') ?? ''),
        agreedToDisclosure: form.get('disclosure') === 'on',
        // The room is the only party that saw the browser; this request is server-to-server.
        remoteIp: getClientAddress()
      });
    } catch (cause) {
      /*
        FAILS CLOSED. A controller that cannot be reached means the room cannot know whether this
        person may enter, and "cannot know" is not "yes". Admitting somebody because a network call
        timed out is the one outcome that must never happen.
      */
      console.error('[session] entry check unavailable; refusing', cause);
      return fail(503, { message: 'This room cannot be reached right now. Please try again.' });
    }

    if (!decision.ok) {
      // A room that sets `loginErrorURL` wants its own page, not ours.
      if (decision.redirectTo) redirect(303, decision.redirectTo);
      return fail(400, { message: decision.message });
    }

    /*
      `disableEditingUsername` is enforced HERE as well as disabled in the form. A disabled input is
      a UI state, not an authorization check, and this is where the difference lands: the name
      reaches the roster and rides on every message this member sends.
    */
    const mayRename =
      roomRoleFor(membership) === 'staff' || settings.disableEditingUsername !== true;
    const displayName = mayRename && name ? name : claims.name;

    const role = roomRoleFor(membership);
    const now = new Date();
    const existing = db.select().from(users).where(eq(users.email, claims.email)).get();

    const account = existing
      ? (db
          .update(users)
          /*
            The controller is where a rename and a role change happen, so the local copy follows it
            on every entry, in both directions. An earlier version promoted on a `site` token and
            refused to demote on a `guest` one — reasoning about the DOOR when the question is about
            the MEMBERSHIP.
          */
          .set({ displayName, status: 'online', role })
          .where(eq(users.id, existing.id))
          .returning()
          .get() ?? existing)
      : db
          .insert(users)
          .values({
            displayName,
            email: claims.email,
            avatarUrl: `https://www.gravatar.com/avatar/${hashEmail(claims.email)}?d=mm`,
            role,
            status: 'online',
            // No password hash, and `authSource: 'handoff'` to say so on purpose.
            passwordHash: null,
            authSource: 'handoff',
            createdAt: now
          })
          .returning()
          .get();

    // The room goes on the session, so a reload does not need the query string to remember it.
    createSessionFor(cookies, account.id, false, shortCode ?? null);
    redirect(303, shortCode ? `/?room=${encodeURIComponent(shortCode)}` : '/');
  }
};
