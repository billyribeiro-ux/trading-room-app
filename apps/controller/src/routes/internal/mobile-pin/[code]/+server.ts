import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { getDb } from '$lib/server/db';
import { rooms, roomUsers, users } from '$lib/server/db/schema';
import { issueMobilePairCode, readSettings } from '$lib/server/rooms';
import { verifyConfigReadToken } from '$lib/server/room-handoff';
import type { RequestHandler } from './$types';

/**
 * `POST /internal/mobile-pin/<shortCode>` — the room's `getMyMobilePin`.
 *
 * The reference's room sends `getMyMobilePin` on the command channel and the server answers with a
 * pin the member types into the mobile app. This is that server. The pin is
 * `room_users.mobile_pair_code`, issued by `issueMobilePairCode`, and its lifetime is the room's
 * own `ptrMobileAppExpirePairCodeDays`.
 *
 * ## Why this is not part of the config read
 *
 * A pair code is a live credential. `internal/room-config` is fetched on every page load and its
 * answer is serialised into the room's SSR HTML, so putting the pin there would print a working
 * app credential into every viewer's page source whether or not they asked for it. This is a
 * POST, on demand, for one member, and the room only calls it when somebody clicks the button.
 *
 * ## Why it issues rather than reads
 *
 * `issueMobilePairCode` mints a new six-digit code each time and moves the expiry with it, which
 * is what "Get App PIN" does on the Manage page. Returning a stored one would mean a code
 * displayed once stays valid until somebody notices — the reference treats it as short-lived by
 * design, and `ptrMobileAppExpirePairCodeDays` exists to say how short.
 */
export const POST: RequestHandler = async ({ params, request, url }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) error(500, 'Room configuration is not available.');

  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const verified = verifyConfigReadToken(secret, params.code, presented);
  if (!verified.ok) {
    console.warn('[mobile-pin] rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }

  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');

  const settings = await readSettings(room.id);

  /*
    The same gate the room applies, applied again here.

    The room's button is hidden when the room has no app, but a hidden button is not an
    authorization check — this endpoint is reachable with the shared secret and a URL, so the
    condition that decides whether a pin should exist at all belongs on this side too.
  */
  const appEnabled = settings.ptrMobileAppEnabled === true || settings.customMobileAppEnabled === true;
  if (!appEnabled) error(409, 'This room has no mobile app configured.');

  const email = url.searchParams.get('email')?.trim().toLowerCase();
  if (!email) error(400, 'A member is required.');

  const membership = (
    await getDb()
      .select({ roomUser: roomUsers, user: users })
      .from(roomUsers)
      .innerJoin(users, eq(roomUsers.userId, users.id))
      .where(eq(roomUsers.roomId, room.id))
  ).find((row) => row.user.email.trim().toLowerCase() === email);

  // A guest has no membership row and so no pair code. The reference has nothing to issue either:
  // the code lives on the membership, which is what the app signs in against.
  if (!membership) error(404, 'Not a member of this room.');

  if (membership.roomUser.isFreeTrial && settings.freeTrialsGetApp !== true) {
    error(403, 'Trial accounts cannot pair the app in this room.');
  }

  const { code, expiresAt } = await issueMobilePairCode(
    room.id,
    membership.roomUser.id,
    Number(settings.ptrMobileAppExpirePairCodeDays ?? 0)
  );

  return json({ pin: code, expiresAt: expiresAt.toISOString() });
};
