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
import { error, redirect } from '@sveltejs/kit';
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

/**
 * Send a signed-out visitor back to the controller.
 *
 * ## Why this exists rather than six bare `redirect` calls
 *
 * The destination is on ANOTHER ORIGIN — this room and the controller are two deployments — and
 * **SvelteKit refuses a cross-origin redirect** unless it is told to allow one:
 *
 * ```
 * Cannot redirect to external URL "…/account". To redirect to an external URL, pass
 * `{ external: true }` or an allowlist of permitted origins as the third argument to `redirect`
 * ```
 *
 * That is not a test detail. Six call sites redirect here — `requireUser`, `requireSessionId`,
 * `requireRoomShortCode`, two page loads and the logout action — so **every auth guard and the
 * logout button were throwing instead of redirecting.** Caught by
 * `notes-account-action-contract.test.ts`, which asserts the 303 rather than merely that something
 * was thrown.
 *
 * ## The allowlist, not `external: true`
 *
 * `{ external: true }` permits a redirect to ANY origin. This room only ever sends people to one
 * place, and that place is a value it already holds, so the allowlist names it and nothing else.
 * Deny-by-default is the house rule for every other boundary here and there is no reason to make
 * this one the exception — a redirect target is exactly the kind of value that later becomes
 * attacker-influenced by accident.
 *
 * When no controller is configured the destination is `/`, which is same-origin and needs no
 * permission at all, so the allowlist is empty and the call behaves as an ordinary redirect.
 */
export function redirectSignedOut(status: 303 | 307 = 303): never {
  const origin = controlPlaneOrigin();
  // `external` takes `boolean | string[]`. The array form IS the allowlist — passing the one origin
  // permits exactly that host and refuses every other, where `true` would permit any of them.
  redirect(status, signedOutDestination(), { external: origin ? [origin] : false });
}

/** Redirect to an owner-configured error page while permitting only its exact HTTP(S) origin. */
export function redirectToConfiguredLocation(location: string): never {
  let absolute: URL | null = null;
  try {
    absolute = new URL(location);
  } catch {
    if (location.startsWith('//')) error(500, 'Configured redirect is invalid.');
  }
  if (!absolute) redirect(303, location);
  if (absolute.protocol !== 'http:' && absolute.protocol !== 'https:') {
    error(500, 'Configured redirect is invalid.');
  }
  redirect(303, absolute, { external: [absolute.origin] });
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
 * `restoreMobileAppTokens`: `POST {control}/internal/mobile-restore/{shortCode}`.
 *
 * Beside the pin and separate from the config read for the same reason: it is asked for once, by one
 * member, when they press a button — and unlike the config read it has consequences, so it must not
 * be reachable as a side effect of loading a page.
 */
export function mobileRestoreUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/mobile-restore/${encodeURIComponent(shortCode)}` : null;
}

/** Durable alert push dispatch and its presenter-facing delivery report. */
export function alertDeliveryUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/alert-delivery/${encodeURIComponent(shortCode)}` : null;
}

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

/**
 * `POST {control}/internal/room-notes-auth/{shortCode}` — the second question-shaped read.
 *
 * A SIBLING of `roomEntryUrl`, not of the setting reads, and the shape is the argument: both send a
 * candidate the controller compares against a credential it holds and never returns. The room learns
 * one boolean and the password stays where it was configured.
 *
 * It exists because `needPasswordForUserNotes` is one of the seven credential-shaped settings that
 * may never appear in `ROOM_VISIBLE_SETTINGS`, and the reference compares it in the browser
 * (bundle byte 2,081,768) because its `sessData` already holds it. See the endpoint's own header.
 */
export function roomNotesAuthUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/room-notes-auth/${encodeURIComponent(shortCode)}` : null;
}

/**
 * `POST {control}/internal/room-alert-delete-auth/{shortCode}` — the FOURTH question-shaped read.
 *
 * A sibling of `roomNotesAuthUrl` directly above, and deliberately a separate URL rather than a
 * `credential` parameter on it. One endpoint taking a credential NAME would be an oracle: any holder
 * of a `config-read` token could ask "is this string the value of `obsStreamKey`" and walk all seven
 * credential-shaped settings a guess at a time. So each question gets its own door, each door names
 * its own setting in its own source, and the body carries nothing but the candidate.
 *
 * It exists because `deleteAlertPW` is one of those seven and the reference compares it in the
 * browser — `archiveChatDate` at bundle byte 2,048,641, and four more sites — because its `sessData`
 * already holds it. See the endpoint's own header for the transcription and the offsets.
 */
export function roomAlertDeleteAuthUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin
    ? `${origin}/internal/room-alert-delete-auth/${encodeURIComponent(shortCode)}`
    : null;
}

/**
 * `POST {control}/internal/room-welcome-mat-auth/{shortCode}` — the third question-shaped read, and
 * the only one that answers with data.
 *
 * The same shape as the two above: a candidate goes out, a credential the room never sees does the
 * comparing. What differs is that a YES also returns the short codes of the rooms the caller's
 * account owns, because "replace ALL the rooms' welcome mats" needs a list the room application does
 * not have.
 *
 * **The list is on this call and not on a second one, deliberately.** A separate list endpoint would
 * answer to a `config-read` token alone, so any holder of one could enumerate an account's rooms
 * without knowing the password. Here the gate and the data it unlocks are one round trip, and a
 * wrong answer returns nothing. The endpoint's own header carries the rest.
 */
export function roomWelcomeMatAuthUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin
    ? `${origin}/internal/room-welcome-mat-auth/${encodeURIComponent(shortCode)}`
    : null;
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
export function roomSettingUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/room-setting/${encodeURIComponent(shortCode)}` : null;
}

/**
 * Opening and closing the session: `POST {control}/internal/room-state/{shortCode}`.
 *
 * A route of its own rather than `roomSettingUrl` because `state` is a COLUMN on `rooms`, not a
 * setting: it is what `internal/room-config` projects as `room.state` and what `decideRoomEntry`
 * refuses entry on. The settings door writes `settings_json` through the generated schema, and
 * teaching it a second storage shape is how one handler comes to have two rules.
 *
 * `isLocked` went the other way on 2026-09-02 for the same reason read forwards — it IS a setting.
 */
export function roomStateUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/room-state/${encodeURIComponent(shortCode)}` : null;
}

/**
 * `saveCustomPerms`: `POST {control}/internal/room-permissions/{shortCode}`.
 *
 * The second thing this room writes back, and for the same reason as the first: the five permission
 * checkboxes live in `roomUsers.permissionsJson` on the CONTROLLER, which is what `readRoomConfig`
 * hands the room on every load. A room-side write would be a second answer to what a member may do,
 * and it would lose on the next page load.
 */
export function roomPermissionsUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/room-permissions/${encodeURIComponent(shortCode)}` : null;
}

/**
 * `kick-ban`: `POST {control}/internal/room-ban/{shortCode}`.
 *
 * A separate endpoint from `room-permissions` because it answers a different question — not what a
 * member may do, but whether they may be here at all — and writes a different column.
 */
export function roomBanUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/room-ban/${encodeURIComponent(shortCode)}` : null;
}

/**
 * *" Mute Chat indefinately "* — the reference's own spelling: `POST {control}/internal/room-mute/{shortCode}`.
 *
 * A THIRD endpoint rather than a flag on the ban, because it answers a third question — not what a
 * member may do, and not whether they may be here, but whether they may SPEAK — and it writes a
 * different opcode.
 *
 * It does not belong beside the room's own 24-hour mute either, and that is the part worth knowing
 * before touching it: the two durations live in two different stores. Twenty-four hours is a row in
 * the room's SQLite `chat_mutes`; indefinite is `roomUsers.role = 3, muted = true` here. Upstream
 * they are one command distinguished by `time` (`"24"` / `"0"`, bundle byte 2080089), and that
 * unification is not available without moving one of the two stores.
 */
export function roomMuteUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/room-mute/${encodeURIComponent(shortCode)}` : null;
}

/**
 * Peak simultaneous occupancy: `POST {control}/internal/room-occupancy/{shortCode}`.
 *
 * A MACHINE report, and the only one of these endpoints with no person behind it — which is why it
 * takes no `?email=` and the controller gates it on the write capability alone. See that endpoint's
 * header for the whole argument, and `T5-20` for why the reference's own bundle could not supply
 * this signal: it computes its user count in the browser and sends it nowhere.
 */
export function roomOccupancyUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/room-occupancy/${encodeURIComponent(shortCode)}` : null;
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

/** A five-minute MediaMTX read token for a locally validated public-player grant. */
export function publicStreamReadUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/public-stream-read/${encodeURIComponent(shortCode)}` : null;
}

/** Presenter-scoped Discord identity status, OAuth initiation, and unlinking. */
export function discordIntegrationUrl(shortCode: string): string | null {
  const origin = controlPlaneOrigin();
  return origin ? `${origin}/internal/discord/${encodeURIComponent(shortCode)}` : null;
}
