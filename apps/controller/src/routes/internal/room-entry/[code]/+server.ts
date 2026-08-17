import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { getDb } from '#lib/server/db/index.js';
import { rooms } from '#lib/server/db/schema.js';
import { readSettings } from '#lib/server/rooms.js';
import { resolveRoomConfig } from '#lib/room-config.js';
import { decideRoomEntry, type RoomEntrySettings } from '#lib/room-entry.js';
import { verifyConfigReadToken } from '#lib/server/room-handoff.js';
import type { RequestHandler } from './$types';

/**
 * `POST /internal/room-entry/<shortCode>` — may this person into this room?
 *
 * ## Why the ROOM cannot answer this itself
 *
 * The reference's login page checks the room password in the BROWSER, because its room and its site
 * are one system: `sessData` already holds `webinarPW`, so comparing there costs nothing it has not
 * already given away.
 *
 * This reconstruction split them on purpose, and the split has a rule with a test behind it:
 * `room-config-boundary.test.ts` asserts that no entry in `ROOM_VISIBLE_SETTINGS` matches
 * `credentialShaped`, which `webinarPW` does (`PW$`) and `banIPList` does by name. That is not
 * pedantry — the room serialises its config into SSR HTML and into the `__sveltekit` payload, so a
 * room-visible setting reaches the browser, every cache in front of the room, and any HAR attached
 * to a support ticket.
 *
 * So the credential stays here and the QUESTION travels instead. The member sees the reference's
 * page and the reference's messages; what changed is which machine holds the password.
 *
 * ## One decision, not two
 *
 * `decideRoomEntry` is the same pure function the guest door at `/session/[code]` already calls. It
 * is not reimplemented for the room — a second copy of `isLocked`, `banIPList`, `secTok`, the three
 * room passwords, the free-trial password and `customEnterDisclosure` is how the two doors end up
 * disagreeing about who may enter.
 *
 * ## What this deliberately does NOT do
 *
 * It does not mint a session, set a cookie, or say who somebody IS. Identity arrives at the room on
 * the signed handoff and is verified there. This answers one question — may this attempt proceed —
 * and returns the reference's own refusal message when the answer is no.
 */
export const POST: RequestHandler = async ({ params, request }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) {
    // Same posture as `room-config`: fail loudly rather than accept an unauthenticated read, and do
    // not name the private configuration variable in a response body.
    error(500, 'Room entry is not available.');
  }

  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const verified = verifyConfigReadToken(secret, params.code, presented);
  if (!verified.ok) {
    /*
      One status and one message for every failure reason. Distinguishing "stale" from "bad
      signature" tells a caller which half of the credential they got right; the reason is computed
      for the log line, not for the response.
    */
    console.warn('[room-entry] rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }

  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');

  const attempt = (await request.json()) as {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    secretToken?: string;
    agreedToDisclosure?: boolean;
    remoteIp?: string;
  };

  const settings = resolveRoomConfig(await readSettings(room.id)).values as RoomEntrySettings;

  /*
    `remoteIp` comes from the ROOM, which is the only party that saw the browser: this request is
    server-to-server, so `getClientAddress()` here would be the room's own address and would make
    `banIPList` match nothing. It is accepted from the caller because the caller is authenticated by
    a MAC over this room's code — the same trust boundary the config read already uses.
  */
  const decision = decideRoomEntry(settings, {
    name: String(attempt.name ?? '').trim(),
    email: String(attempt.email ?? '')
      .trim()
      .toLowerCase(),
    phone: String(attempt.phone ?? '').trim(),
    password: String(attempt.password ?? ''),
    secretToken: String(attempt.secretToken ?? ''),
    agreedToDisclosure: attempt.agreedToDisclosure === true,
    remoteIp: String(attempt.remoteIp ?? ''),
    roomState: room.state
  });

  /*
    The refusal REASON is returned as well as the message.

    The room does not show it — it shows `message`, which is the room's own `loginErrorMsg` when one
    is configured. The reason is there so the room can log what happened without the controller
    having to parse its own prose back out of a sentence an owner may have rewritten.
  */
  return json(decision);
};
