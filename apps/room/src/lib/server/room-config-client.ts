/**
 * Reading this room's own configuration from the controller.
 *
 * `sessData` was a hardcoded literal in `src/routes/+page.server.ts` — one global constant
 * standing in for state that belongs to a room, in a product where you create as many rooms as you
 * like and set each one's options yourself. Every gate that read it was therefore reading my
 * guess, not the owner's choice.
 *
 * The controller owns those options. `GET {control}/internal/room-config/{shortCode}` returns them,
 * already narrowed there to the ones this room has a consumer for — a room's `webinarPW`,
 * `ssoJWTSecret`, `s3KeySecret` and the rest never cross, because this room serialises what it is
 * given into SSR HTML on every load.
 *
 * ## No silent fallback
 *
 * If the controller cannot be reached, this throws. Serving defaults instead would put the room
 * straight back into inventing values — the exact defect being removed — and it would do it
 * invisibly, at the moment the two halves of the product had stopped agreeing.
 */
import { createHmac } from 'node:crypto';
import { env as privateEnv } from '$env/dynamic/private';
import { controlPlaneOrigin, mobilePinUrl, roomConfigUrl, roomSettingUrl } from './control-plane';

/**
 * What the controller will send. Named here so a reader can see the surface at a glance.
 *
 * The authority is `ROOM_VISIBLE_SETTINGS` in the controller, not this interface: adding a field
 * here does not make it arrive. Everything is optional because absent means unset, and unset means
 * off — a newly created room has no settings row at all.
 */
export interface RoomSessionSettings {
  rosterVisibleToViewers?: boolean;
  onlyPresentersVisibleToViewers?: boolean;
  rosterCountVisibleToViewers?: boolean;
  simUserCount?: number;
  showArchivesToUsers?: boolean;
  showArchivesToSpecificPresenters?: string[] | null;
  hideRecs?: boolean;
  hideChatLog?: boolean;
  userUploads?: boolean;
  /* Mobile App Info. */
  hideAppInfo?: boolean;
  ptrMobileAppEnabled?: boolean;
  customMobileAppEnabled?: boolean;
  customMobileAppAndroidUrl?: string | null;
  customMobileAppIOSUrl?: string | null;
  freeTrialsGetApp?: boolean;
  hideMobileCredentials?: boolean;
  /* Benzinga. */
  hasBenzingaNews?: boolean;
  altBenzingaLogoURL?: string | null;
  altBenzingaLinkURL?: string | null;
  /** The fallback branch of the user-info modal's O(9): a member renaming themselves. */
  allowUsersToChangeUsername?: boolean;
  userPM?: boolean;
  userToPresenterPM?: boolean;
  disablePMForTrials?: boolean;
  /**
   * "Sound alert when a new message is posted?" — the room-wide chat ding.
   *
   * `app-chat.compiled.js:135` reads it as `sessData.dingOnNewMessage`, behind
   * `!doNotDisturbOn && chatSoundOn`, and plays the sound named `followed`. A user who is
   * explicitly FOLLOWED outranks it and gets `pling` instead.
   */
  dingOnNewMessage?: boolean;
  /**
   * "Hide Files Section?" — the Files main tab and the `#files` pane.
   *
   * The reference binds both to `hideFiles || globals.videoOnlyMode`. Only the first half is a
   * setting; the second is the recording-bot client global, which this room has no equivalent of.
   */
  hideFiles?: boolean;
  /**
   * "Individual Volume Controls?" — one volume slider per talking presenter.
   *
   * The reference gates const 115 on it inside `room-sound-options`, in BOTH copies of the volume
   * dropdown (`app-presentationarea.render-helpers.js:383`,
   * `app-room.render-helpers.js:1100`). Read by `ScreenVolumeControl.svelte`.
   */
  individualVolumeControls?: boolean;
  /**
   * "Hide Alerts/Chat Section?" — the room-wide half of `hideChatAlerts`.
   *
   * Upstream that flag has five writers and this is the only one that is a setting
   * (`app-room.full.js:1893`); the rest are runtime conditions the room computes. It gates the whole
   * chat/alerts column at `O(1, e.hideChatAlerts ? -1 : 1)`
   * (`app-room.render-helpers.js:1650`) and the extra chat column at `:1652-1660`.
   *
   * `recordChat` is deliberately absent beside it: it appears only inside the `videoOnlyMode`
   * writer, and `videoOnlyMode` is the `r` query parameter this room does not model — the same
   * honest gap recorded for {@link hideFiles}.
   */
  hideChatAlerts?: boolean;
  /**
   * "User Join and Leave Popup?" — the room half of the join/leave TOAST
   * (`app-room.full.js:2137-2138`, `:2148-2149`).
   *
   * Paired with the per-viewer `popupOnUserJoin` / `popupOnUserLeave`, so the owner turns the
   * feature off for the room and a presenter can still turn it off for themselves. Presenter-only
   * in effect — the client refuses it for a member.
   */
  userJoinAndLeavePopup?: boolean;
  /**
   * "Beep On User Join?" — the room half of the join/leave SOUND (`:2140-2143`, `:2151-2154`).
   *
   * Covers BOTH directions: the leave beep reads this same flag upstream and only the viewer
   * preference is per-direction. There is no `beepOnUserLeave` room setting to carry.
   */
  beepOnUserJoin?: boolean;
  /**
   * "Chat Only Room?" — the room-wide half of `hidePresentation`.
   *
   * `(chatOnlyMode || sessData.isChatOnlyRoom) && (this.hidePresentation = !0, …)`
   * (`app-room.full.js:1903-1904`), gating the presentation column at
   * `app-room.render-helpers.js:1662`. The other half is the `co` query parameter, which the room
   * reads for itself — `?co=1` is one reader popping the chat out, while this is the owner
   * declaring the room has no presentation area for anybody.
   */
  isChatOnlyRoom?: boolean;
  /**
   * "Disable Copy?" — content protection for NON-presenters only.
   *
   * Three host bindings carrying one two-term gate (`app-room.full.js:3011-3026`, `:2227-2229`):
   * `contextmenu` suppressed, Ctrl+C / Ctrl+U / Ctrl+S and F12 suppressed, and `noselect` added to
   * `document.body`. The presenter exemption is deliberate upstream and kept here — the person
   * running the room is not restricted from their own screen.
   */
  disableCopy?: boolean;
  /**
   * "Overwrite Cash Register Sound" — the url of the mp3 that replaces `chash.mp3` for alerts.
   *
   * Also the ONE setting this room writes back, through {@link writeRoomSetting}. `''` and `null`
   * both mean no override: the controller's `saveSetting` stores an empty string as null.
   */
  overwriteCashRegisterSound?: string | null;
}

/** The connected member's per-room standing, which is per room and not per account. */
export interface RoomMembership {
  displayName: string;
  email: string;
  /** 0 Owner · 1 Presenter (or Admin with `nonPresenter`) · 2 Participant · 3 muted · 4 banned. */
  role: number;
  nonPresenter: boolean;
  isP: boolean;
  isNonPresenterAdmin: boolean;
  isFT: boolean;
  denyArchivesAccess: boolean;
  restrictPmUser: boolean;
  muted: boolean;
  banned: boolean;
  permissions: {
    hasMic: boolean;
    hasScreen: boolean;
    hasCam: boolean;
    hasAdminChat: boolean;
    canEditNotes: boolean;
  };
}

export interface RoomConfig {
  room: {
    shortCode: string;
    name: string;
    state: string;
    logoUrl: string | null;
    publicId: string | null;
    maxUsers: number;
  };
  settings: RoomSessionSettings;
  /** Settings the owner is enforcing; the in-room panel must not offer these as toggles. */
  locked: string[];
  member: RoomMembership | null;
}

export class RoomConfigUnavailable extends Error {
  constructor(reason: string, options?: { cause?: unknown }) {
    super(`The room's configuration could not be read from the controller: ${reason}`, options);
    this.name = 'RoomConfigUnavailable';
  }
}

/**
 * How long to wait for the controller.
 *
 * A page load blocks on this, so it cannot be generous. The controller is doing one indexed read
 * of a local database; if it has not answered in two seconds it is not going to.
 */
const TIMEOUT_MS = 2_000;

/** Mirrors `verifyConfigReadToken` on the controller: `<ts>.<hmac("config-read:<code>.<ts>")>`. */
function configReadToken(secret: string, shortCode: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', secret)
    .update(`config-read:${shortCode}.${issuedAt}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${issuedAt}.${signature}`;
}

/**
 * A per-request cache.
 *
 * `load` and the form actions can each want the configuration during one request, and the
 * controller's answer cannot change mid-request in any way the room should react to. Keyed by the
 * request's own object so nothing outlives it — a module-level cache would serve one room's
 * settings to the next request for a different room.
 */
const perRequest = new WeakMap<object, Map<string, Promise<RoomConfig>>>();

export async function readRoomConfig(
  requestKey: object,
  shortCode: string,
  memberEmail?: string
): Promise<RoomConfig> {
  const cacheKey = `${shortCode}\u0000${memberEmail ?? ''}`;
  let byRoom = perRequest.get(requestKey);
  if (!byRoom) {
    byRoom = new Map();
    perRequest.set(requestKey, byRoom);
  }
  const cached = byRoom.get(cacheKey);
  if (cached) return cached;

  const pending = fetchRoomConfig(shortCode, memberEmail);
  byRoom.set(cacheKey, pending);
  // A failed read must not be cached as a failure for the rest of the request: the next caller
  // should get its own attempt rather than a rethrow of somebody else's timeout.
  pending.catch(() => byRoom.delete(cacheKey));
  return pending;
}

async function fetchRoomConfig(shortCode: string, memberEmail?: string): Promise<RoomConfig> {
  const secret = privateEnv.ROOM_JWT_SECRET;
  if (!secret) throw new RoomConfigUnavailable('ROOM_JWT_SECRET is not configured');
  if (!controlPlaneOrigin()) throw new RoomConfigUnavailable('CONTROL_BASE_URL is not configured');

  const base = roomConfigUrl(shortCode);
  if (!base) throw new RoomConfigUnavailable('CONTROL_BASE_URL is not configured');

  const url = new URL(base);
  if (memberEmail) url.searchParams.set('email', memberEmail);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { authorization: `Bearer ${configReadToken(secret, shortCode)}` },
      // Both halves of a timeout: `AbortSignal.timeout` bounds the whole exchange, including a
      // controller that accepts the connection and then never answers.
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (cause) {
    throw new RoomConfigUnavailable(`the request failed or timed out after ${TIMEOUT_MS}ms`, {
      cause
    });
  }

  if (!response.ok) {
    throw new RoomConfigUnavailable(`the controller answered ${response.status}`);
  }

  const payload = (await response.json()) as RoomConfig;
  if (!payload || typeof payload !== 'object' || typeof payload.settings !== 'object') {
    throw new RoomConfigUnavailable('the controller returned an unexpected shape');
  }
  return payload;
}

/**
 * `getMyMobilePin` — asks the controller to issue this member's app pair code.
 *
 * Not cached, and deliberately: the controller mints a NEW code on every call and moves the expiry
 * with it, which is what "Get App PIN" does on the Manage page. Caching would hand back a code
 * whose expiry had already moved on.
 */
export async function requestMobilePin(shortCode: string, memberEmail: string): Promise<string> {
  const secret = privateEnv.ROOM_JWT_SECRET;
  if (!secret) throw new RoomConfigUnavailable('ROOM_JWT_SECRET is not configured');

  const base = mobilePinUrl(shortCode);
  if (!base) throw new RoomConfigUnavailable('CONTROL_BASE_URL is not configured');

  const url = new URL(base);
  url.searchParams.set('email', memberEmail);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${configReadToken(secret, shortCode)}` },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (cause) {
    throw new RoomConfigUnavailable(`the pin request failed or timed out after ${TIMEOUT_MS}ms`, {
      cause
    });
  }

  if (!response.ok) throw new RoomConfigUnavailable(`the controller answered ${response.status}`);

  const payload = (await response.json()) as { pin?: unknown };
  if (typeof payload.pin !== 'string' || payload.pin.length === 0) {
    throw new RoomConfigUnavailable('the controller returned no pin');
  }
  return payload.pin;
}

/**
 * Writing one setting back: `POST {control}/internal/room-setting/{shortCode}`.
 *
 * The module docblock above says this room READS its configuration, and for 268 of the 269
 * settings that is still the whole story. `overwriteCashRegisterSound` is the exception because the
 * reference edits it from inside the room — see `roomSettingUrl` in `./control-plane` for why it
 * cannot be a broadcast.
 *
 * ## What this does NOT decide
 *
 * Not the allow-list: the controller's `ROOM_WRITABLE_SETTINGS` decides what may be written, and it
 * is narrower than the read list. Not the authorization either: the endpoint re-checks that
 * `memberEmail` names an owner or presenter of this room. Both are re-stated there on purpose — the
 * caller in `+page.server.ts` gates on the connected member's role as well, and a hidden button is
 * not a check.
 *
 * ## No silent failure
 *
 * Throws on every non-2xx, exactly like the read. A write that quietly did nothing would leave the
 * presenter looking at a button whose label had changed and a room whose sound had not.
 */
export async function writeRoomSetting(
  shortCode: string,
  memberEmail: string,
  name: string,
  value: string
): Promise<void> {
  const secret = privateEnv.ROOM_JWT_SECRET;
  if (!secret) throw new RoomConfigUnavailable('ROOM_JWT_SECRET is not configured');

  const base = roomSettingUrl(shortCode);
  if (!base) throw new RoomConfigUnavailable('CONTROL_BASE_URL is not configured');

  const url = new URL(base);
  url.searchParams.set('email', memberEmail);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${configReadToken(secret, shortCode)}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ name, value }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (cause) {
    throw new RoomConfigUnavailable(`the write failed or timed out after ${TIMEOUT_MS}ms`, {
      cause
    });
  }

  if (!response.ok) throw new RoomConfigUnavailable(`the controller answered ${response.status}`);
}
