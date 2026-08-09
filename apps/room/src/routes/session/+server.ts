import { error, redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { db, ensureDatabase } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { createSessionFor } from '$lib/server/auth';
import { isBannedFromRoom, isShutOutByRoomState, roomRoleFor } from '$lib/server/room-role';
import { verifyHandoffToken } from '$lib/server/handoff-token';
import { hashEmail } from '$lib/server/connection';
import {
  readRoomConfig,
  type RoomConfig,
  type RoomMembership
} from '$lib/server/room-config-client';
import type { RequestHandler } from './$types';

/**
 * `GET /session?id=<shortCode>&jwtSite=<HS256 JWT>` — the only way into this room.
 *
 * The controller owns identity. It creates rooms, manages them, and runs both logins: an owner
 * launches from their account page, and a guest passes the room's own rules — name, email,
 * `hasRequiredPhoneInLogin`, `nickFilter`, `webinarPW`, the room being open — on
 * `/session/[code]`. Either way the controller mints a token and redirects here.
 *
 * This room previously had its own email-and-password login, which is a second identity system for
 * a product whose front door is somewhere else. It is gone; see `docs/ROOM-STATE-2026-08-06.md`.
 *
 * ## Why the room still keeps a `users` row
 *
 * Everything downstream — `locals.user`, the roster, `messages.sender_id`, `saved_polls`,
 * `alerts` — is keyed on a local numeric id. Upserting on arrival keeps that untouched while the
 * controller remains the authority for who may arrive at all. The room's copy is a projection, not
 * a source: `displayName` is refreshed from the token on every entry, because the controller is
 * where a rename happens.
 */
export const GET: RequestHandler = async ({ url, cookies, request }) => {
  ensureDatabase();

  // `$env/dynamic/private`, not `process.env` — SvelteKit never copies `.env` into the latter.
  // See the note in `src/lib/server/media-grant.ts`; this exact mistake once 503'd every grant.
  const secret = privateEnv.ROOM_JWT_SECRET;
  if (!secret) {
    /*
      No fallback, deliberately.

      A default secret here would mean anyone who can read this file can mint entry to any room. A
      room with no secret configured cannot be entered, which is the correct failure.
    */
    console.error('[session] ROOM_JWT_SECRET is not configured; refusing every handoff');
    error(500, 'This room is not configured to accept sign-ins.');
  }

  const shortCode = url.searchParams.get('id')?.trim();
  const verified = verifyHandoffToken(secret, url.searchParams.get('jwtSite'));

  if (!verified.ok) {
    // One message for every rejection. Which check failed is a hint worth withholding and worth
    // logging; the two are not the same audience.
    console.warn('[session] handoff rejected', { room: shortCode, reason: verified.reason });
    error(403, 'This sign-in link is not valid. Open the room from your account page again.');
  }

  const { claims } = verified;

  /*
    There is no single-use check here any more.

    It keyed on the token's `jti`, and the token was matched to the reference on 2026-08-07 — which
    mints no `jti` and issues a 360-day credential, so the same link legitimately works again. The
    guard could not be kept without inventing a claim the reference does not send.

    That is a real loss: a captured Launch URL is now replayable for a year. It is also a behaviour
    fix, because a user whose room failed to load could not previously retry. Restoring single use
    is a scheduled improvement — see `docs/OUTSTANDING.md`.
  */

  /*
    Role, from the CONTROLLER'S MEMBERSHIP. Never from the token type.

    This read `claims.type === 'site' ? 'staff' : 'user'`, and that was a privilege escalation.
    A token type says how somebody ARRIVED; a membership says what they ARE. `requireOwnedRoom`
    admits any user in the ACCOUNT to `/launch/[id]`, and `inviteRoomUser` puts an invited
    participant in that same account — so a role 2 Participant could launch, arrive as `staff`, and
    hold every presenter gate in a room the controller calls them a participant in. Measured, not
    argued: `scripts/role-authority-e2e.mjs` fails against the old mapping.

    The mapping itself lives in `$lib/server/room-role` because the page load derives the same
    thing, and two copies of it is how the room ends up with two answers again.
  */
  let roomConfig: RoomConfig | null = null;
  let membership: RoomMembership | null = null;
  if (shortCode) {
    try {
      roomConfig = await readRoomConfig(request, shortCode, claims.email);
      membership = roomConfig.member;
    } catch (cause) {
      // Fail CLOSED. `roomRoleFor(null)` is `member`, which is the safe answer to "cannot tell".
      console.error('[session] could not read the membership; entering as a member', cause);
    }
  }

  /*
    A banned member does not get in.

    Role 4 is the reference's BANNED. The mapping below sends it to `member`, which is right as a
    ROLE and wrong as an answer to whether the door opens — without this the room admitted a banned
    member as an ordinary one and nothing looked at the flag again.
  */
  if (isBannedFromRoom(membership)) {
    console.warn('[session] refused a banned member', { room: shortCode, email: claims.email });
    error(403, 'You do not have access to this room.');
  }

  /*
    A closed room turns a member away at the door.

    The config read above already carries `state`, so this costs nothing extra. A presenter is let
    through — see `isShutOutByRoomState` for why that half is a decision and not evidence.
  */
  if (roomConfig && isShutOutByRoomState(roomConfig.room.state, membership)) {
    console.warn('[session] refused entry to a closed room', { room: shortCode });
    error(403, 'This room is closed.');
  }

  const role = roomRoleFor(membership);

  const now = new Date();
  const existing = db.select().from(users).where(eq(users.email, claims.email)).get();

  const account = existing
    ? (db
        .update(users)
        /*
          The controller is where both a rename and a role change happen, so the local copy follows
          it on every entry — in both directions, with no one-way ratchet.

          An earlier version promoted on a `site` token and refused to demote on a `guest` one.
          That was reasoning about the DOOR when the question is about the MEMBERSHIP: with the
          controller as the authority, a demotion there has to reach the room, and the only way it
          can is here. Somebody stripped to Participant in the controller must stop being a
          presenter in the room the next time they enter it.
        */
        .set({ displayName: claims.name, status: 'online', role })
        .where(eq(users.id, existing.id))
        .returning()
        .get() ?? existing)
    : db
        .insert(users)
        .values({
          displayName: claims.name,
          email: claims.email,
          // Gravatar, the same derivation the roster uses, so a first-time arrival has the same
          // avatar as everyone else rather than a placeholder that changes on their second visit.
          avatarUrl: `https://www.gravatar.com/avatar/${hashEmail(claims.email)}?d=mm`,
          role,
          status: 'online',
          // No password hash, and `authSource: 'handoff'` to say so on purpose. `getSessionUser`
          // reads the latter: a passwordless row alone is still not a way in, which is what
          // retired the old auto-provisioned accounts.
          passwordHash: null,
          authSource: 'handoff',
          createdAt: now
        })
        .returning()
        .get();

  // The room goes on the session, so a reload does not need the query string to remember it.
  createSessionFor(cookies, account.id, false, shortCode ?? null);

  /*
    `id` rides along so the room knows which room it is, and so a launch into a different room from
    the same browser does not silently reuse the previous one. It is not a credential — the token
    is — so an absent or unknown code is not a reason to refuse an otherwise valid entry.
  */
  redirect(303, shortCode ? `/?room=${encodeURIComponent(shortCode)}` : '/');
};
