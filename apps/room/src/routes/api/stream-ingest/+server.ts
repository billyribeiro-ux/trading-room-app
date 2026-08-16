/**
 * `getRTMPToken` — mints this presenter's OBS / XSplit publish credential.
 *
 * The reference sends this over its admin command channel
 * (`main.d6d3c112b59b7d0d.js` byte 2169850); here it is a POST for the same reasons
 * `api/media/grant` is one: what comes back is a bearer credential, and a GET is the shape
 * browsers, proxies and history stores are built to cache. `cache-control: no-store` says so
 * explicitly as well.
 *
 * ## Nothing is decided here
 *
 * Not who they are — `hooks.server.ts` already refuses every path but `/session` without a session,
 * and `requireUser` narrows that again. Not whether they may publish — the CONTROLLER re-derives
 * that from `room_users` and answers 403 if not, because a room asserting its own user's authority
 * is the 2026-08-07 escalation. Not the path, and not the host.
 *
 * This route's whole job is to carry the connected member's identity to the controller and hand
 * back the answer. Every call ROTATES, which is the reference's behaviour: the panel's first render
 * and its "New Link" button call the identical command.
 */

import { json } from '@sveltejs/kit';
import { requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import {
  RoomConfigUnavailable,
  StreamIngestForbidden,
  requestStreamIngestKey
} from '#lib/server/room-config-client.js';
import { recordStreamIngestName } from '#lib/server/stream-names.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
  const user = requireUser(locals);
  const room = requireRoomShortCode(locals);

  let minted;
  try {
    minted = await requestStreamIngestKey(room, user.email);
  } catch (error) {
    if (error instanceof StreamIngestForbidden) {
      // The controller's answer, passed through unchanged. Not logged as an error: a participant
      // opening the panel and being told no is the system working.
      return json(
        { message: error.message },
        { status: 403, headers: { 'cache-control': 'no-store' } }
      );
    }
    if (error instanceof RoomConfigUnavailable) {
      // A deployment or connectivity fault, not a client error. No fallback and no cached key: a
      // stream key the controller did not just issue is one it may already have replaced.
      console.error('[stream-ingest] cannot mint a publish credential:', error.message);
      return json(
        { message: 'The stream key could not be issued; the controller is unavailable.' },
        { status: 503, headers: { 'cache-control': 'no-store' } }
      );
    }
    throw error;
  }

  /*
    THE ONLY MOMENT the room can learn who a MediaMTX path belongs to.

    From here on the path travels alone: OBS publishes to it, and `/v3/paths/list` reports it back
    with no identity attached and only the SANITISED name inside it. `Dana Vero`, `Dana_Vero` and
    `Dana/Vero` all arrive as `…__Dana_Vero`, so the stream tab would be labelled with the
    sanitiser's underscores unless the pairing is written down here, where both halves are in hand.

    After the mint, deliberately. A record of a key that was never issued would label a tab for a
    presenter the controller had just refused.
  */
  recordStreamIngestName({
    ingestPath: minted.ingestPath,
    now: new Date(),
    room,
    userId: user.id
  });

  return json(minted, { headers: { 'cache-control': 'no-store' } });
};
