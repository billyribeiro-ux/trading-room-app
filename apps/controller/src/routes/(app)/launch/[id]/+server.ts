import { error, redirect } from '@sveltejs/kit';
import { ROOM_BASE_URL, ROOM_JWT_SECRET } from '$app/env/private';
import { and, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { roomUsers, rooms } from '$lib/server/db/schema';
import { requireOwnedRoom, requireUser } from '$lib/server/auth';
import { handoffUrl, siteHandoffToken } from '$lib/server/room-handoff';
import { recordVisit } from '$lib/server/room-visits';
import { isRoomPresenter } from '$lib/room-member-role';
import type { RequestHandler } from './$types';

/**
 * The owner's door into the live room.
 *
 * The token shape, its 60-second life and the reasoning behind both now live in
 * `$lib/server/room-handoff`, which the guest door (`/session/[code]/joined`) also uses. They were
 * about to become two implementations of one credential.
 */
/*
  `[id]` is the room's SHORT CODE, not its row id — the same identifier `/account/rooms/<code>` uses.

  This route was missed when the manage page moved off primary keys on 2026-08-09: it kept
  `eq(rooms.id, Number(params.id))`, so the one door that still spoke in row ids was the one nothing
  in the UI links to. Nothing linked to it, so nothing caught it.
*/
export const GET: RequestHandler = async ({ params, locals, request, getClientAddress }) => {
  const user = requireUser(locals);
  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.id)).limit(1);
  requireOwnedRoom(locals, room);
  if (!room) error(404, 'Room not found');

  /*
   * This standalone rebuild owns the evidence-backed room-login route, so its
   * default handoff remains same-origin. Setting ROOM_BASE_URL switches the
   * seam to the separate room application without changing the controller UI.
   */
  if (!ROOM_BASE_URL?.trim()) redirect(303, `/session/${encodeURIComponent(room.shortCode)}`);

  const secret = ROOM_JWT_SECRET;
  if (!secret) {
    // Failing loudly beats minting a token signed with a default nobody changed,
    // but an expected error body must not expose the private configuration name.
    error(500, 'Room launch is not configured.');
  }

  /*
    A visit, recorded here because this is the only place it can be.

    `TODO.md` item K: the participant stats export needs IP, In, Out, Duration, isMobile and
    Browser, and this request is the one moment we can see any of them — the room application runs
    behind a proxy on another host and sees neither the browser's original address nor our account
    context. Awaited, but it never throws into this handler: a stats row failing to write must not
    stop somebody entering a room they paid for.
  */
  // The owner is seated at role 0 by `createRoom`, but rooms predating that have no such row
  // (`apps/room/TODO.md` gap 31) — so this is a lookup with a null fallback rather than an
  // assumption. The export reads name and email regardless; the id is for joining later.
  const [membership] = await getDb()
    .select({ id: roomUsers.id, role: roomUsers.role, nonPresenter: roomUsers.nonPresenter })
    .from(roomUsers)
    .where(and(eq(roomUsers.roomId, room.id), eq(roomUsers.userId, user.id)))
    .limit(1);

  /*
    A CLOSED room admits its presenters and nobody else — `apps/room/TODO.md` gap 30.

    The guest door has always enforced this (`/session/[code]/joined` redirects when
    `room.state !== 'open'`) and the room's own `/session` enforces it through
    `isShutOutByRoomState`. This door did not, and it is the widest of the three:
    `requireOwnedRoom` admits **anyone in the ACCOUNT**, so a role-2 Participant could launch
    straight into a room their owner had deliberately closed — past a check the other two doors
    were making.

    The rule is copied from the room rather than invented, so the two cannot disagree: open lets
    everyone through; closed shuts out only those who are neither the owner nor a true presenter.
    Presenters keep their way in on purpose — closing a room is how you prepare it, and locking the
    person who has to open it out of it would be the obvious next bug.

    `isRoomPresenter` is the controller's own predicate, and role 1 counts only when the
    `nonPresenter` discriminator is false — the captured model, not a numeric guess.
  */
  const isOwnerOrPresenter =
    membership?.role === 0 || (membership ? isRoomPresenter({ ...membership, isFreeTrial: false }) : false);

  if (room.state !== 'open' && !isOwnerOrPresenter) {
    // The same destination the guest door uses, so a closed room looks identical whichever way you
    // arrived at it, rather than one door explaining more than another.
    redirect(303, `/session/${encodeURIComponent(room.shortCode)}`);
  }

  await recordVisit({
    roomId: room.id,
    roomUserId: membership?.id ?? null,
    displayName: user.displayName,
    email: user.email,
    ip: getClientAddress(),
    userAgent: request.headers.get('user-agent')
  });

  const target = handoffUrl(
    ROOM_BASE_URL,
    room.shortCode,
    siteHandoffToken(secret, {
      name: user.displayName,
      email: user.email,
      id: String(user.id)
    })
  );
  // Unreachable: the blank case redirected above. Narrowed rather than asserted.
  if (!target) redirect(303, `/session/${encodeURIComponent(room.shortCode)}`);
  redirect(303, target.toString());
};
