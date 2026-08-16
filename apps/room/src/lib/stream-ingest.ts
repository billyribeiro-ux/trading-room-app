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
 * MediaMTX's RTMPS listener — `rtmpsAddress: :1936` in its own default configuration.
 *
 * Named explicitly in the URL, unlike plain RTMP's 1935. 1935 is the registered default that every
 * encoder assumes when a scheme carries no port; 1936 is MediaMTX's choice for the TLS listener and
 * is not assumed by anything, so omitting it would produce a URL that silently never connects.
 */
export const MEDIAMTX_RTMPS_PORT = 1936;

/**
 * What the controller answers for `getRTMPToken`.
 *
 * Declared HERE rather than in `#lib/server/room-config-client.js`, even though that is the module
 * that fetches it, because the panel needs the type too. A `#lib/server` import in a component is
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
 *
 * ## `https`, and the reference says `http`
 *
 * This is a DELIBERATE DIVERGENCE, and the only one in this module. Byte 2157950 builds
 * `http://${streamServerMTX}:8889/…/whip`, in cleartext.
 *
 * The credential this URL is used with is a **publish** token: it authorises writing video into a
 * named room path, it is valid for thirty days, and anything on the network path between the
 * encoder and the media server can read an `Authorization: Bearer` header off an unencrypted
 * connection. A presenter streams from hotel Wi-Fi and a conference network as a matter of course.
 *
 * The rule this repository already applies to captured values is that a capture is reproduced
 * unless reproducing it locks a real person out — `ScreenTabs` diverges on `aria-selected` and
 * `tabindex` on exactly that basis. Handing a thirty-day write credential to whoever is listening
 * is the stronger case: this is a multi-tenant fintech application, and the failure mode is one
 * tenant publishing into another tenant's room.
 *
 * The cost is that MediaMTX must terminate TLS on 8889 — `webrtcEncryption: yes` with a certificate,
 * which `ops/mediamtx/mediamtx.yml.example` configures. A deployment that has not done that gets a
 * URL that fails to connect, which is the correct direction to fail: refusing to publish is
 * recoverable, publishing a credential in the clear is not.
 */
export function whipIngestUrl(host: string, ingestPath: string): string {
  return `https://${host}:${MEDIAMTX_WHIP_PORT}/${ingestPath}/whip`;
}

/**
 * The RTMP publish URL, token included.
 *
 * RTMP has no header to put a Bearer in, so the reference puts the token in the query string under
 * the name `jwt`. That name is load-bearing: the controller's media-auth check reads `jwt` and only
 * `jwt` out of the query MediaMTX forwards to it.
 *
 * ## `rtmps`, and the reference says `rtmp`
 *
 * The same deliberate divergence as {@link whipIngestUrl}, and a sharper one. Here the credential is
 * IN THE URL rather than in a header, so on plain RTMP it crosses the network as part of the
 * connection handshake — and RTMP has no upgrade path, no SNI and no certificate: an observer does
 * not need to do anything but watch.
 *
 * A thirty-day publish token read off the wire lets a stranger publish into that presenter's room
 * path until it is rotated, and the room renders whatever arrives on it.
 *
 * The port becomes explicit as a consequence: plain RTMP could omit 1935 because every encoder
 * assumes it, and nothing assumes MediaMTX's 1936 for the TLS listener. `rtmpEncryption: strict` in
 * `ops/mediamtx/mediamtx.yml.example` is the server half.
 */
export function rtmpIngestUrl(host: string, ingestPath: string, token: string): string {
  return `rtmps://${host}:${MEDIAMTX_RTMPS_PORT}/${ingestPath}?jwt=${token}`;
}
