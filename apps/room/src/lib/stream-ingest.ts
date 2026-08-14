/**
 * The two ingest URLs an external encoder publishes to, transcribed from `handleStreaming()`.
 *
 * `docs/source/main.d6d3c112b59b7d0d.js` byte 2157950, the MediaMTX branch, in full:
 *
 * ```js
 * e.streamingLinkRTMP = `rtmp://${globals.streamServerMTX}/room__${globals.sessionID}__${e.yourName}?jwt=${globals.mtxToken}`;
 * e.streamKey         = globals.mtxToken;
 * e.streamingLink     = `http://${globals.streamServerMTX}:8889/room__${globals.sessionID}__${e.yourName}/whip`;
 * ```
 *
 * and byte 2169850, `getNewToken()`, which rebuilds only the RTMP one.
 *
 * ## Why these are here and not composed in the component
 *
 * They are the exact strings a presenter copies into OBS. Getting one character wrong produces a
 * link that looks right and silently fails to connect, and a component is not a place a test can
 * reach that. Everything below is a pure function of the controller's answer.
 *
 * ## The path is NOT built here
 *
 * `ingestPath` arrives from the controller already assembled, because that is where the room's
 * identifier and the presenter's sanitised name both live and where the token is pinned to it. A
 * second implementation of `room__{id}__{name}` in the browser is a second thing that can disagree
 * with what the token actually authorises — and the browser's copy would be the one presenters see.
 */

/**
 * MediaMTX's WebRTC/WHIP port, from the reference's own URL. The RTMP URL carries no port, so it
 * uses RTMP's standard 1935 implicitly — which is why only this one is named.
 */
export const MEDIAMTX_WHIP_PORT = 8889;

/**
 * What the controller answers for `getRTMPToken`.
 *
 * Declared HERE rather than in `$lib/server/room-config-client`, even though that is the module
 * that fetches it, because the panel needs the type too. A `$lib/server` import in a component is
 * refused by SvelteKit's server-only module boundary, and a type-only import surviving that check
 * is a property of the preprocessor rather than a guarantee. This module is pure, so both sides can
 * name the same shape without either reaching across the boundary.
 */
export interface StreamIngestKey {
  /** The reference's own field name — `rc.rtmpToken` becomes `globals.mtxToken`. */
  rtmpToken: string;
  /** `room__{shortCode}__{name}`, built by the CONTROLLER. The room never composes this itself. */
  ingestPath: string;
  /** Host only, no scheme and no port. Empty when the deployment has no media server. */
  streamServerMTX: string;
  /** False means "no ingest server configured" — the panel says so instead of showing a dead link. */
  configured: boolean;
}

/**
 * The WHIP publish URL. The token is NOT in it — WHIP carries the credential as an HTTP Bearer, and
 * the panel shows it in a separate field whose label is literally `Bearer`.
 */
export function whipIngestUrl(host: string, ingestPath: string): string {
  return `http://${host}:${MEDIAMTX_WHIP_PORT}/${ingestPath}/whip`;
}

/**
 * The RTMP publish URL, token included.
 *
 * RTMP has no header to put a Bearer in, so the reference puts the token in the query string under
 * the name `jwt`. That name is load-bearing: the controller's media-auth check reads `jwt` and only
 * `jwt` out of the query MediaMTX forwards to it.
 */
export function rtmpIngestUrl(host: string, ingestPath: string, token: string): string {
  return `rtmp://${host}/${ingestPath}?jwt=${token}`;
}
