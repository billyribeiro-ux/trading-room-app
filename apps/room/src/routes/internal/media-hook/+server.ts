/**
 * `POST /internal/media-hook` — MediaMTX telling the room a stream went live or stopped.
 *
 * ## Where the call comes from
 *
 * `runOnAvailable` and `runOnUnavailable` in `mediamtx.yml`, which MediaMTX runs as shell commands
 * when a path becomes readable and when it stops. Those are the CURRENT hook names: `runOnReady` and
 * `runOnNotReady` were renamed and no longer exist, confirmed against
 * https://mediamtx.org/docs/usage/hooks, which lists thirteen hooks and neither of the old two.
 *
 * The environment those two hooks receive is `MTX_PATH`, `MTX_QUERY`, `MTX_SOURCE_TYPE`,
 * `MTX_SOURCE_ID`, `RTSP_PORT` and the regex capture groups `G1, G2, …`. This route reads the path
 * and nothing else, because the path is what identifies the stream.
 *
 * ## This is the FAST path, not the correct one
 *
 * **Hooks for latency, reconciliation for truth.** A hook is a `curl` MediaMTX spawns: no retry, no
 * ordering, no delivery guarantee, and it reaches exactly one room process. `room-events.ts` states
 * in its own header that the SSE hub is process-local and "does not span instances", and the room
 * defaults to the Vercel adapter — so on a multi-instance deployment this notification reaches the
 * subscribers of whichever instance the platform routed it to, and no others.
 *
 * That is a real limitation and it is inherited rather than introduced: every existing realtime
 * feature here has it, including `focusOnScreen`. The durable fix is the same one `TODO.md` already
 * names — PostgreSQL `room_events`, which `services/api` already listens on.
 *
 * What makes the stream list correct in the meantime is `#lib/mtx-reconcile.js`, which every instance
 * runs against MediaMTX's own `/v3/paths/list` for its own subscribers. This route exists so a
 * stream appears in under a second instead of at the next reconcile; if it never arrives, nothing is
 * permanently wrong.
 *
 * ## Authentication
 *
 * A bearer, compared in constant time, from `MEDIA_HOOK_SECRET`. Unset means refuse everything —
 * without a secret there is no way to distinguish MediaMTX from anyone who found the URL, and an
 * unauthenticated caller here could inject arbitrary stream tabs into any room.
 *
 * It is deliberately NOT `ROOM_JWT_SECRET`: this value gets written into a shell command in a media
 * server's config file, and the room's session signer does not belong there.
 */

import { json, text } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
/*
  The NAMED form, not `env as privateEnv` from `$env/dynamic/private`.

  `src/env.ts` is the declaration file, and `$app/env/private` exports exactly what it declares — so
  a typo here is a build error rather than an `undefined` at runtime. That distinction is not
  theoretical in this repository: after the Kit 3 upgrade every `$env/dynamic/private` lookup in the
  room returned `undefined` while `process.env` held the real value, and every Launch answered 500
  until the build was rolled back. `src/env.ts` records that at length.
*/
import { MEDIA_HOOK_SECRET } from '$app/env/private';
import { mtxStreamFromPath } from '#lib/mtx-reconcile.js';
import { publishToRoom } from '#lib/server/room-events.js';
import type { RequestHandler } from './$types';

/**
 * Constant-time comparison that does not leak the secret's length through an early return.
 *
 * `timingSafeEqual` throws when the buffers differ in length, so the lengths are compared first and
 * a mismatch is answered from a comparison against the expected value with itself — same work, same
 * time, no information about how close a guess was.
 */
function secretMatches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export const POST: RequestHandler = async ({ request }) => {
  const secret = MEDIA_HOOK_SECRET;
  if (!secret) {
    // Named in the log, because a silent refusal here looks exactly like a broken media server.
    console.warn('[media-hook] MEDIA_HOOK_SECRET is not configured; refusing every hook');
    return text('Unauthorized.', { status: 401 });
  }

  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (!presented || !secretMatches(presented, secret)) {
    console.warn('[media-hook] rejected: bad or missing bearer');
    return text('Unauthorized.', { status: 401 });
  }

  let body: { event?: unknown; path?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return text('A JSON body is required.', { status: 400 });
  }

  const event = body.event;
  const path = body.path;
  if (typeof path !== 'string' || !path) return text('A path is required.', { status: 400 });
  if (event !== 'available' && event !== 'unavailable') {
    // Deny by default: only the two events this room models are accepted, so adding a third hook to
    // `mediamtx.yml` cannot quietly start publishing something the room does not understand.
    return text('Unknown event.', { status: 400 });
  }

  /*
    The room is derived FROM THE PATH, not taken from the request.

    `room__{roomKey}__{producerID}` is built by the controller's `ingestPathFor`, and MediaMTX only
    ever reports a path it actually served. Letting the caller name the room instead would mean a
    hook could publish a stream tab into any room it liked — and `parseMtxPath` compares the room key
    by equality, so `36250` cannot reach `3625`.
  */
  const parsed = mtxStreamFromPath(path, path.split('__')[1] ?? '');
  if (!parsed) {
    console.warn('[media-hook] ignored a path this room cannot parse', { path });
    return text('Unrecognised path.', { status: 400 });
  }
  const roomShortCode = parsed.sessionID;

  publishToRoom(roomShortCode, {
    channel: 'cmds',
    data:
      event === 'available'
        ? { cmd: 'mtxStartStream', muser: parsed }
        : { cmd: 'mtxStopStream', muser: parsed }
  });

  /*
    200 whether or not anybody was listening. A room with no connected members is not an error, and
    MediaMTX runs this as a shell command whose non-zero exit it logs as a failure — reporting "no
    subscribers" as one would fill the media server's log with noise about rooms working correctly.
  */
  return json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
};
