/**
 * Where the controller lives, from this room's point of view.
 *
 * `new-room-control` is the first part of the product: rooms are created there, managed there, and
 * logged into there. This room is what you land in afterwards. So it has exactly two things to say
 * about the controller — where to send someone who has no business being here yet, and where to
 * read this room's own configuration from.
 *
 * The mirror image of the controller's `ROOM_BASE_URL`, and blank by the same logic: a room that
 * has not been told where its controller is should say so rather than guess at a hostname.
 */
import { CONTROL_BASE_URL } from '$app/env/private';

/*
  `$app/env/private`, never `process.env`.

  SvelteKit does not copy `.env` into `process.env` — it loads the file with Vite's `loadEnv` and
  exposes the result only through its own env modules. `src/lib/server/media-grant.ts` documents
  this in detail because the same mistake there made every media grant 503 under `vite dev`. Read
  at runtime, so one built artefact still works across environments.

  This was `$env/dynamic/private` until 2026-08-15. Kit 3 makes that module a five-line shim over
  this one which logs "`$env/dynamic/private` is deprecated, use `$app/env/private` instead" in dev,
  and it stops emitting the ambient types, so `svelte-check` cannot resolve it at all. The variable
  must be declared in `src/env.ts` to exist here — see the note at the top of that file.
*/
const RAW = () => CONTROL_BASE_URL?.trim() ?? '';

/** The controller's origin, or null when this room has not been pointed at one. */
export function controlPlaneOrigin(): string | null {
  const raw = RAW();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    // A malformed value is a misconfiguration worth seeing rather than a reason to fall back to
    // some other host and send a signed request there.
    console.error('[control-plane] CONTROL_BASE_URL is not a valid URL; treating it as unset');
    return null;
  }
}

/**
 * Where to send someone who is signed out, or who arrived without a handoff.
 *
 * Falls back to `/` when no controller is configured. `hooks.server.ts` answers that with a 403
 * that says where to go, which is honest — the alternative is a login page this room no longer has
 * and cannot serve.
 */
export function signedOutDestination(): string {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/account` : '/';
}

/** The room's own configuration read: `GET {control}/internal/room-config/{shortCode}`. */
export function roomConfigUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/room-config/${encodeURIComponent(shortCode)}` : null;
}

/**
 * `getMyMobilePin`: `POST {control}/internal/mobile-pin/{shortCode}`.
 *
 * Separate from the config read on purpose. A pair code is a live credential and the config read
 * is serialised into every page; this is asked for once, when somebody clicks the button.
 */
export function mobilePinUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/mobile-pin/${encodeURIComponent(shortCode)}` : null;
}

/**
 * The one WRITE: `POST {control}/internal/room-setting/{shortCode}`.
 *
 * This module described the room's controller surface as two reads, and for every setting but one
 * that is still true — the Manage page owns them and the room only obeys. The exception is
 * `overwriteCashRegisterSound`, which the reference edits from inside the room: the Files pane's
 * two `set-alert-sound-btn` buttons call `overwriteCashRegisterSound(url, bool)`, which sends the
 * admin command with `{url}` (`app-presentationarea.full.js:3084-3086`).
 *
 * It has to go back to the controller rather than onto this room's event channel. A broadcast
 * changes what the browsers currently connected believe and stores nothing, so the next reload
 * would restore the previous sound with no record of why. The controller is where a room's settings
 * live, so that is where this one is written.
 *
 * The controller decides what may actually be written — `ROOM_WRITABLE_SETTINGS` there is a
 * narrower list than the read allow-list, and the endpoint re-checks that the named member is a
 * presenter of that room. Naming the URL here does not grant anything.
 */
/**
 * `internal/room-entry/<code>` — may this attempt into this room?
 *
 * The room asks rather than decides, because the answer needs `webinarPW`, `banIPList` and the
 * other credential-shaped settings that `ROOM_VISIBLE_SETTINGS` will never send here. The reference
 * has the same split for the password: it posts the typed value to its own server and never
 * compares it in the browser — `webinarPW` appears nowhere in its 2.9 MB bundle.
 */
export function roomEntryUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/room-entry/${encodeURIComponent(shortCode)}` : null;
}

export function roomSettingUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/room-setting/${encodeURIComponent(shortCode)}` : null;
}

/**
 * `getRTMPToken`: `POST {control}/internal/stream-ingest/{shortCode}`.
 *
 * The reference reaches this over its admin command channel
 * (`main.d6d3c112b59b7d0d.js` byte 2169850); here it is an authenticated server-to-server call for
 * the same reason the mobile pin is. What comes back is a live publish credential for this room, so
 * it is asked for when a presenter opens the OBS panel or presses "New Link" — never as part of the
 * page load, and never cached.
 */
export function streamIngestUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/stream-ingest/${encodeURIComponent(shortCode)}` : null;
}

/**
 * The VIEWER's playback credential: `POST {control}/internal/stream-read/{shortCode}`.
 *
 * Deliberately NOT {@link streamIngestUrl} with a flag. That route ROTATES the publish key on every
 * call, so a member merely opening a room would revoke the presenter's live stream — and the two
 * answer different questions anyway: ingest is presenter-only and path-scoped, this is every
 * non-banned member and room-scoped.
 *
 * Unlike the ingest key this one IS part of the page load, because the reference hands every session
 * an `mtxToken` at login (`userLoggedIn`, bundle byte 994430) rather than on demand.
 */
export function streamReadUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/stream-read/${encodeURIComponent(shortCode)}` : null;
}
