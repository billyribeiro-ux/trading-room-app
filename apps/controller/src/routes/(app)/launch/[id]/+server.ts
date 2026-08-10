import { error, redirect } from '@sveltejs/kit';
import { ROOM_BASE_URL, ROOM_JWT_SECRET } from '$app/env/private';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { rooms } from '$lib/server/db/schema';
import { requireOwnedRoom, requireUser } from '$lib/server/auth';
import { handoffUrl, siteHandoffToken } from '$lib/server/room-handoff';
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
export const GET: RequestHandler = async ({ params, locals }) => {
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
