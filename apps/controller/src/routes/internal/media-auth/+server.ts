import { json, text } from '@sveltejs/kit';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { decideIngestAuth, tokenFromAuthRequest } from '#lib/server/stream-ingest.js';
import type { RequestHandler } from './$types';

/**
 * `POST /internal/media-auth` — the media server asking "may this publish?".
 *
 * This is MediaMTX's `authMethod: http` hook. Its contract, from
 * https://mediamtx.org/docs/usage/authentication, is one JSON document per attempt:
 *
 * ```json
 * { "user": "", "password": "", "token": "", "ip": "", "action": "publish|read|playback|api|metrics|pprof",
 *   "path": "", "protocol": "rtsp|rtmp|hls|webrtc|srt", "id": "", "query": "", "userAgent": "" }
 * ```
 *
 * and one rule for the answer: **a 2xx status means allow, anything else means deny.**
 *
 * ## Why this endpoint is not itself authenticated
 *
 * Every other `/internal/*` route carries a `config-read` MAC, and this one deliberately does not.
 * The reasoning, rather than the omission:
 *
 * The only thing an unauthenticated caller can do here is present a token and be told whether it
 * works — which is precisely what they could learn by attempting to publish with it. No new
 * information is available through this door, so a second credential in front of it would protect
 * nothing while adding a value that has to be rotated in two places.
 *
 * What DOES matter is that a flood of guesses must not become a flood of queries, and it does not:
 * `decideIngestAuth` verifies the HMAC in memory first, so a token this application did not sign is
 * refused without a database round trip.
 *
 * ## Two rights, both checked, nothing exempted
 *
 * `publish` and `read` are both authorised here, against tokens carrying an explicit `scope`.
 * `api`, `metrics` and `pprof` are refused outright — those are operator surfaces and no token this
 * application mints should ever open them.
 *
 * **Reads were briefly refused here, and that was a defect.** The reasoning was that the playback
 * half had not been designed; the actual reason was that `app-streaming-view.full.js` had not been
 * READ. It plays `https://{streamServerMTX}/{path}/index.m3u8?jwt={mtxToken}` (line 116) and every
 * session is handed an `mtxToken` at login (byte 994430), so playback in the reference is
 * authenticated for everyone. Excluding reads in MediaMTX's config — which this endpoint's own
 * documentation previously recommended — would have left every room's video readable by anyone who
 * could guess a path.
 */
export const POST: RequestHandler = async ({ request }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) {
    // No signer means no valid token can exist. Refuse rather than 500 — to the media server a 500
    // and a 401 are both "deny", and a deployment with no secret should deny quietly and log.
    console.warn('[media-auth] refused: no signing secret configured');
    return text('Unauthorized.', { status: 401 });
  }

  let body: { token?: unknown; query?: unknown; path?: unknown; action?: unknown; protocol?: unknown; ip?: unknown };
  try {
    body = await request.json();
  } catch {
    return text('Unauthorized.', { status: 401 });
  }

  const path = typeof body.path === 'string' ? body.path : '';
  const action = typeof body.action === 'string' ? body.action : '';
  const protocol = typeof body.protocol === 'string' ? body.protocol : '';

  /*
    Deny by default on the action, as an allow-list.

    `api`, `metrics` and `pprof` are MediaMTX's own operator surfaces. No token minted by this
    application should ever open one, so they are refused before the token is even looked at.
  */
  if (action !== 'publish' && action !== 'read' && action !== 'playback') {
    console.warn('[media-auth] refused: action not permitted', { action, path, protocol });
    return text('Unauthorized.', { status: 401 });
  }

  const decision = await decideIngestAuth(secret, {
    token: tokenFromAuthRequest(body),
    path,
    action
  });

  if (!decision.allowed) {
    /*
      One status for every reason, and the reason only in the log.

      Distinguishing "expired" from "revoked" from "wrong path" tells whoever is holding a stale
      credential exactly which part to work on. MediaMTX does not read the body of a refusal, so
      there is nothing lost by keeping it uniform.
    */
    console.warn('[media-auth] refused', { reason: decision.reason, path, protocol });
    return text('Unauthorized.', { status: 401 });
  }

  /*
    Logged at INFO for publish, and not at all for read.

    A publish is a rare, consequential event worth a line each. A read is one HLS segment — several
    per second per viewer — and logging those would bury the publishes it matters to find.
  */
  if (decision.scope === 'publish') {
    console.info('[media-auth] publish allowed', { path, protocol, roomId: decision.roomId, userId: decision.userId });
  }
  return json({ ok: true });
};
