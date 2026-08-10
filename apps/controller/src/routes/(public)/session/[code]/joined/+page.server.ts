import { error, redirect } from '@sveltejs/kit';
import { ROOM_BASE_URL, ROOM_JWT_SECRET } from '$app/env/private';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { rooms } from '$lib/server/db/schema';
import { guestHandoffToken, handoffUrl } from '$lib/server/room-handoff';
import { recordVisit } from '$lib/server/room-visits';
import type { PageServerLoad } from './$types';

/**
 * The guest's door into the live room.
 *
 * `/session/[code]` already enforces everything the reference enforces before entry — a name, a
 * valid email, `hasRequiredPhoneInLogin`, `nickFilter`, `webinarPW`, and the room being open — and
 * then set a `room_identity` cookie and sent the guest here. This page said "the room itself is a
 * separate application" and stopped, which was honest at the time and is no longer necessary.
 *
 * It now mints the same handoff `launch/[id]` mints and redirects into the room, so both doors end
 * in the same place holding the same kind of credential.
 *
 * The token is `type: 'guest'` and carries no account id. A guest satisfied the room's login
 * rules; they did not authenticate as an account here, and the room must be able to tell the
 * difference rather than inferring authority from the URL somebody arrived on.
 *
 * When `ROOM_BASE_URL` is blank this repository is serving the room itself, so the confirmation
 * page still renders — it is the destination in that configuration, not a placeholder.
 */
export const load: PageServerLoad = async ({ params, cookies, request, getClientAddress }) => {
  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');

  const raw = cookies.get('room_identity');
  if (!raw) redirect(303, `/session/${params.code}`);

  /*
    The whole identity is re-read and re-validated, not just `name`.

    This previously destructured `name` alone and defaulted it to the string "guest", so a cookie
    holding `{}` produced a page addressed to a person called guest. An email is needed to mint a
    token at all, and neither field is trustworthy just because it parsed.
  */
  let name = '';
  let email = '';
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'name' in parsed && 'email' in parsed) {
      name = String(parsed.name).trim();
      email = String(parsed.email).trim().toLowerCase();
    }
  } catch {
    // A malformed cookie is not an identity; fall through to the redirect below.
  }

  if (!name || !email) {
    cookies.delete('room_identity', { path: '/' });
    redirect(303, `/session/${params.code}`);
  }

  /*
    Room state is re-checked here rather than trusted from the request that set the cookie.

    That cookie lives for 30 days. Without this, a guest who joined while the room was open could
    come back the next morning, land straight on this URL, and be handed a live token for a closed
    room having passed no check at all on this request.
  */
  if (room.state !== 'open') redirect(303, `/session/${params.code}`);

  /*
    The guest's visit. `roomUserId` is null and that is precisely true: a guest satisfied the room's
    own login rules without holding an account here, which is why `room_sessions` copies the name
    and email rather than only referencing a membership.
  */
  await recordVisit({
    roomId: room.id,
    roomUserId: null,
    displayName: name,
    email,
    ip: getClientAddress(),
    userAgent: request.headers.get('user-agent')
  });

  if (ROOM_BASE_URL?.trim()) {
    const secret = ROOM_JWT_SECRET;
    if (!secret) error(500, 'Room launch is not configured.');

    const target = handoffUrl(ROOM_BASE_URL, room.shortCode, guestHandoffToken(secret, { name, email }));
    if (target) redirect(303, target.toString());
  }

  return { roomName: room.name, name };
};
