import type { MessageBadge } from '#lib/types.js';
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
import { ROOM_JWT_SECRET } from '$app/env/private';
import {
  controlPlaneOrigin,
  mobilePinUrl,
  roomConfigUrl,
  roomEntryUrl,
  roomBanUrl,
  roomMuteUrl,
  roomPermissionsUrl,
  roomSettingUrl,
  streamIngestUrl,
  streamReadUrl
} from './control-plane';
/*
  The ingest-key shape lives in the PURE `#lib/stream-ingest.js` so the panel can name it too — a
  component importing `#lib/server` is refused by SvelteKit's server-only boundary. Re-exported here
  because this is the module that fetches it, and a caller should not have to know both places.
*/
import type { StreamIngestKey } from '#lib/stream-ingest.js';
export type { StreamIngestKey } from '#lib/stream-ingest.js';

/**
 * What the controller will send. Named here so a reader can see the surface at a glance.
 *
 * The authority is `ROOM_VISIBLE_SETTINGS` in the controller, not this interface: adding a field
 * here does not make it arrive. Everything is optional because absent means unset, and unset means
 * off — a newly created room has no settings row at all.
 */
export interface RoomSessionSettings {
  /**
   * The room's rich-text blurb, and the ONE value that picks the login page's layout.
   *
   * `yue`'s update block, read at bundle byte 1,188,490:
   * `O(3, e.appService.globals.sessData.description ? 3 : 4)` — slot 3 is `Wde`, the two-column
   * layout whose left column carries `h1.room-title` and `div.room-description`; slot 4 is `vue`,
   * a single column centred with `offset-md-3 offset-sm-3`. So a room WITH a description gets the
   * split view and a room WITHOUT one gets the centred form.
   *
   * HTML, not text: the const is
   * `[1,"room-description",2,"height","100%","overflow-x","hidden",3,"innerHtml"]` — bound through
   * `innerHtml`, and the component's CSS styles `.room-description img`, so images are expected.
   * It is owner-authored and reaches an unauthenticated page, so it is sanitised before render.
   */
  description?: string;
  /**
   * Presenter messages align right, and their reactions with them. Two consumers in
   * `RoomMessage.svelte` — `presenter-msg-right` on the body and `presenter-reactions-right` on the
   * reaction row — both of which existed unfed until 2026-08-14.
   *
   * Also the first term of the reference's chat-badge gate, so with it ON badges are suppressed
   * regardless of the other three gates. That coupling is upstream's, not ours.
   */
  presenterMsgsOnTheRight?: boolean;
  /** The owner's master switch for chat badges — the second term of the reference's gate chain. */
  enableBadges?: boolean;
  /** Narrows badges to presenters. The fourth term. */
  showBadgesToPresentersOnly?: boolean;
  /** Hides the membership-star. Its `item.membershipYears` supply does not exist yet. */
  disableStarYears?: boolean;
  /**
   * "Enable Rich Text Editor?" — the OWNER's term in the three-way gate on the chat rich text
   * editor. The room resolves it as `sessData.enableRTE && preferences.enableRTE && isPresenter`;
   * see `canUseRTE` in `room/composer.svelte.ts`. Absent means off, which matches the reference: `enableRTE`
   * is not among the 25 keys in its default preferences object either.
   */
  enableRTE?: boolean;
  /*
    The five the room's own login page reads, each at the byte offset named beside it in the decoded
    bundle. Added 2026-08-14 with that page.

    `webinarPW` is deliberately NOT here and never will be: it appears nowhere in the reference's
    bundle either — its `loginToRoom()` posts the typed password to its own server. Ours asks the
    controller through `decideRoomEntryRemotely` for the same reason, and
    `room-config-boundary.test.ts` forbids every credential-shaped name from crossing at all.
  */
  /** `showPresenter = sessData.showPasswordField` — whether the field is drawn. Byte 1189804. */
  showPasswordField?: boolean;
  /** The help text under the name field. Byte 1189881. */
  usernameInstructions?: string;
  /** Whether a phone number is collected AND required. Byte 1189964. */
  hasRequiredPhoneInLogin?: boolean;
  /** The disclosure dialog shown before entry. Byte 1190048. */
  customEnterDisclosure?: string;
  /** `'a' !== perms && sessData.disableEditingUsername` — a presenter may always rename. Byte 1192694. */
  disableEditingUsername?: boolean;
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
   * "Hide Notes Section?" — the room-wide half of the notes tab's `hidden` binding.
   *
   * The THIRD of the trio with `hideFiles` and `hideStreams`, and the one that was missing from
   * `ROOM_VISIBLE_SETTINGS` until 2026-08-28. Composed with viewer-only mode by `RoomGates.notesHidden`,
   * which is where the reference composes it too (bundle byte 1955694).
   */
  hideNotes?: boolean;
  /**
   * THE THREE ROOM DEFAULTS — settings that seed a NEW member's own preferences once and then stop.
   *
   * Three clauses of one expression in the reference's `loadSessionData`, bytes 1,149,414 /
   * 1,149,637 / 1,149,866, so they arrive together. Each is paired with a latch preference that
   * records this viewer has already had it, which is what makes it a default rather than an
   * override: without the latch, a room with `alertSoundOff` would re-silence a member's alerts on
   * every page load and their own switch would look broken.
   *
   * The rule, the latches and the two recorded divergences are in `#lib/room/room-defaults.js`.
   */
  darkThemeAsDefault?: boolean;
  /** See {@link RoomSessionSettings.darkThemeAsDefault} — seeds `alertSoundOn = false`. */
  alertSoundOff?: boolean;
  /** See {@link RoomSessionSettings.darkThemeAsDefault} — seeds `roomSplitDir = 'btt'`. */
  alertsChatOnBottom?: boolean;
  /**
   * "Don't show recording info to users" — the ROOM half of the REC-indicator tooltip.
   *
   * `(sessData.dontShowRecInfoToUsers && !isPresenter) || !roomState.recName` blanks the tooltip
   * (bundle byte 2,474,213). `RoomGates.recordingTooltip` implemented that shape against a viewer
   * PREFERENCE of the same name until 2026-08-28 — a key nothing writes — so the owner switch did
   * nothing and every member saw the recording file name.
   */
  dontShowRecInfoToUsers?: boolean;
  /**
   * "Chat disabled for trials?" — the THIRD reason the reference turns the chat composer off.
   *
   * `globals.user.isFT && sessData.chatDisabledForTrials && (this.chatEnabled = !1)`, bundle byte
   * 1,437,810. This room had the chat MODE and this viewer's own MUTE and no term for the owner
   * policy, so a room that had turned trial chat off served every trial a working composer.
   * `chatComposerAvailable` in `#lib/chat-mode.js` now holds all three.
   */
  chatDisabledForTrials?: boolean;
  /**
   * "Q&A on alerts?" — the entitlement behind the ask-a-question button on an alert.
   *
   * `O(1, !isQAMsg && sessData.hasQAOnAlerts ? 1 : -1)` at bundle byte 1,339,784, which is
   * `RoomMessage.svelte:774` here. That button has been drawn since the component was written,
   * gated on a prop that **defaulted to `true` and was never passed**, so it appeared on every alert
   * in every room whether or not the owner had bought Q&A.
   */
  hasQAOnAlerts?: boolean;
  /**
   * "Tawk Presenter Support?" — the room half of the support widget
   * (`app-room.render-helpers.js:1417-1422`, `full.js:2224`).
   *
   * The property id is NOT carried with it: the reference hardcodes its own, and reproducing that
   * would post presenters' names and email addresses into another company's inbox. See
   * `#lib/tawk-support.js`.
   */
  tawkPresenterSupport?: boolean;
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
  /**
   * "Use MediaMTX?" — whether this room has a MediaMTX tier, and therefore a Streams tab.
   *
   * `this.hideStreams = !this.appService.globals.sessData.useMediaMTX`
   * (`app-presentationarea.full.js:2293`). Note the NEGATION: the room setting says the feature is
   * ON, and the flag derived from it says the tab is HIDDEN. Absent means `!undefined` — true —
   * which is the correct default for a room with no MediaMTX behind it.
   *
   * That one flag gates the `#streams-tab` `li` (`:5357`) and the `#streams` pane (`:5388-5391`)
   * alike, so it is the whole feature's on-switch rather than a cosmetic hide.
   */
  useMediaMTX?: boolean;
  /**
   * "Enable Swing Trade Alerts Tab?" — whether this room has a Swing Alerts tab at all.
   *
   * The owner's label on the Manage page, verbatim, with the help text "If enabled, the room will
   * have swing alerts tab."
   *
   * `this.hasSwingTradeAlerts = this.appService.globals.sessData.hasSwingTradeAlerts` in `ngOnInit`
   * (bundle byte 1,955,884), and one flag gates three things: the nav `<li>`
   * (`O(26, o.hasSwingTradeAlerts ? 26 : -1)`), the `#swingAlerts` pane (`O(48, …)`) and the initial
   * fetch in `loadSessionLogs()`. `-1` is "instantiate nothing", so a room without the setting
   * emits no markup rather than hidden markup — see `swingAlertsTabVisible` in `#lib/swing-alerts.js`.
   *
   * NOT presenter status. Presenter status gates only the form and the row buttons, inside the pane.
   *
   * `linkedRoomSwingAlertsOther` is deliberately NOT here beside it, and that is an explicit
   * decision rather than an omission: upstream, a non-empty value makes both fetches ask for
   * ANOTHER room's log by substituting its `sessionID` (bytes 1,010,146 and 1,993,765). This room
   * takes the room from the session row precisely so that a client cannot name the room it reads,
   * and carrying a setting whose whole purpose is to redirect a read across rooms would reopen that
   * by configuration. If it is ever wanted, it has to arrive as a server-resolved room id with the
   * controller confirming the link, not as a string the room dereferences.
   */
  hasSwingTradeAlerts?: boolean;
  /**
   * "Enable Day Trade Alerts Tab?" — whether this room has a Day Trades tab at all.
   *
   * The owner's label on the Manage page, verbatim, with the help text "If enabled, the room will
   * have day trade alerts tab."
   *
   * `this.hasDayTradeAlerts = this.appService.globals.sessData.hasDayTradeAlerts` in `ngOnInit`
   * (bundle byte 1,955,967), and one flag gates three things: the nav `<li>`
   * (`O(27, o.hasDayTradeAlerts ? 27 : -1)`, byte 2,016,951), the `#dayTradeAlerts` pane
   * (`O(49, …)`, byte 2,017,748) and the initial fetch in `loadSessionLogs()` (byte 1,009,503).
   * `-1` is "instantiate nothing", so a room without the setting emits no markup rather than hidden
   * markup — see `dayTradeAlertsTabVisible` in `#lib/day-trade-alerts.js`.
   *
   * **Note the spelling against its sibling.** The Swing flag doubles the word — `hasSwingTradeAlerts`
   * — and this one does not. Both were read side by side in `loadSessionLogs()` at bytes 1,009,430
   * and 1,009,503; the asymmetry is upstream's and `hasDayTradeTradeAlerts` names nothing.
   *
   * NOT presenter status. Presenter status gates only the form and the row buttons, inside the pane.
   *
   * `linkedRoomDayTradeAlertsOther` is deliberately NOT here beside it, and that is an explicit
   * decision rather than an omission — the same one taken for its Swing twin. Upstream, a non-empty
   * value makes both fetches ask for ANOTHER room's log by substituting its `sessionID`: the key is
   * built by the template literal `` `linkedRoom${e}AlertsOther` `` at bytes 1,010,164 and
   * 1,993,783, which is why the full name appears NOWHERE in the bundle as a literal. This room
   * takes the room from the session row precisely so that a client cannot name the room it reads,
   * and carrying a setting whose whole purpose is to redirect a read across rooms would reopen that
   * by configuration. If it is ever wanted, it has to arrive as a server-resolved room id with the
   * controller confirming the link, not as a string the room dereferences.
   */
  hasDayTradeAlerts?: boolean;
  /**
   * "Overlay userID on screenshare?" — the viewer's own id printed over an MTX stream.
   *
   * Read by `StreamingView.svelte` and gated on this AND `!isPresenter`, which is `TCe` (main
   * bundle byte 1901148). A leak-tracing measure: a member who records the stream and reposts it
   * carries their own `userXrefID` in the frame, and the presenter is exempt because their copy is
   * the source.
   *
   * Despite the name it is read on the STREAM view, not on a screenshare — that is the reference's
   * naming, kept so the setting matches the label an owner ticks on the Manage page.
   */
  overlayUserIdOnScreenshare?: boolean;
  /**
   * "Alert filter list for mods:" — the people a viewer may filter their own alerts by.
   *
   * **A STRING CONTAINING JSON, not an array.** `syncModAlertFilterList()` at bundle byte 1,221,905
   * does `JSON.parse(sessData.modAlertFilterList) || []` — with **no try/catch**, unlike the filter
   * guard, which has one. That asymmetry is reproduced in `parseModAlertFilterList`: a malformed
   * setting throws when the modal opens and the room keeps running.
   *
   * The parsed shape is `{ username, avatar }`, proven by `selectAll()` at byte 1,220,674. It is the
   * third room setting shipped as a JSON string, after `alertLabels` and `chatTabsWithBadges`.
   *
   * **It gates the whole feature, not just the list.** The reference hangs its entry points on this
   * value being truthy — bytes 2,042,979 and 2,286,654 — so a room that configures nothing has no
   * button, no modal and no filtering. There is nothing to default from, which is why the room
   * cannot decide it locally.
   *
   * The avatars are gravatar hashes of emails the owner already administers, and every alert already
   * carries `senderAvt` so the feed can draw the avatar — so nothing crosses here that the alerts
   * feed does not already carry.
   *
   * Read by `#lib/alert-filter.js`.
   */
  modAlertFilterList?: string;
  /**
   * "Alert Labels" — `#DayTrade` inside an alert body renders as a coloured badge.
   *
   * **A STRING CONTAINING JSON**, the fourth one, and the one the note above already names. Entries
   * are `{ name, hash, color, bgcolor }` — proven by the transform at bundle byte 1,326,855, which
   * reads all four, and independently by the Manage page's own help text on this setting.
   *
   * Read at byte 1,147,290, which also stamps `checked = false` onto every entry. That field is the
   * post-alert composer's picker state, not a render input, and the composer branch is one of the
   * `hiddenCapabilityBranches` the capture never renders.
   *
   * **`JSON.parse` with no try/catch**, exactly as `modAlertFilterList` above — a malformed setting
   * throws rather than silently rendering no labels.
   *
   * Read by `#lib/alert-labels` and `RoomMessage.svelte`.
   */
  alertLabels?: string;
  /**
   * Four per-room gates that `RoomMessage.svelte` already implements.
   *
   * Each was a prop defaulting `false` that the page never passed, so the feature was unreachable.
   * Every occurrence of all four in the reference bundle is `sessData.<name>` — per-room policy,
   * never local state.
   */
  usersPublicReply?: boolean;
  enableReactions?: boolean;
  /** Chat and alerts are gated SEPARATELY upstream, which is why this is not one setting. */
  enableEditMessage?: boolean;
  enableEditAlerts?: boolean;
  /**
   * "Recording Reminder If Speaking?" — the ROOM POLICY half of the reminder banner.
   *
   * Not the same value as the room's own `recordingReminder` state, despite the shared name: the
   * gate at bundle byte 2,477,770 requires BOTH, and the local one is a runtime flag the recorder
   * raises. This is the owner's term, and it was the missing half.
   */
  recordingReminder?: boolean;
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

/**
 * The account's badges, and who wears which — the two halves `app-st-message.full.js` uses as
 * `sessData.badgesH` and `msg.b`.
 *
 * Keyed by **md5(email)** rather than by a user id, because the two databases share no key space.
 * It is the same hash `hashEmail()` computes here and that every message already carries as
 * `senderEmailHash`, so a sender resolves without the room ever receiving an address.
 *
 * `byEmailHash` holds only members who HAVE badges; a room where nobody does sends `{}`.
 */
export interface RoomBadges {
  definitions: Record<string, MessageBadge & { darkTheme?: number }>;
  byEmailHash: Record<string, number[]>;
}

export interface RoomConfig {
  badges?: RoomBadges;
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

/**
 * Mirrors the controller's verifiers: `<ts>.<hmac("<domain>:<code>.<ts>")>`.
 *
 * ## Two domains, and the difference is not cosmetic
 *
 * `config-read:` authorises reading a room's settings. `config-write:` authorises CHANGING them —
 * banning a member, rewriting the permission set, overwriting a setting, rotating an ingest
 * credential. Until 2026-08-27 there was one prefix and the four write endpoints accepted it, so a
 * capability minted to READ also authorised the ban. The controller's `configWriteToken` docblock
 * carries the full account, including why no "transition period" accepts both.
 *
 * The signing itself is shared rather than copied per domain: two implementations differing only in
 * a string literal is how one of them silently stops matching what the controller expects.
 */
function domainToken(
  domain: 'config-read' | 'config-write',
  secret: string,
  shortCode: string
): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', secret)
    .update(`${domain}:${shortCode}.${issuedAt}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${issuedAt}.${signature}`;
}

/** The capability to READ this room's configuration. Refused by every write endpoint. */
function configReadToken(secret: string, shortCode: string): string {
  return domainToken('config-read', secret, shortCode);
}

/** The capability to CHANGE this room's configuration. Refused by every read endpoint. */
function configWriteToken(secret: string, shortCode: string): string {
  return domainToken('config-write', secret, shortCode);
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
  const secret = ROOM_JWT_SECRET;
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
  const secret = ROOM_JWT_SECRET;
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
  const secret = ROOM_JWT_SECRET;
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
        authorization: `Bearer ${configWriteToken(secret, shortCode)}`,
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

/**
 * The five permission checkboxes: `POST {control}/internal/room-permissions/{shortCode}`.
 *
 * `saveCustomPerms` in the capture (byte 2077194) sends `changeUserPerms` and then reloads the
 * roster. Ours writes through the control plane instead, because that is where
 * `roomUsers.permissionsJson` lives and where every reader of it already looks.
 *
 * ## `granted` is the WHOLE state, not a diff
 *
 * The endpoint writes `false` for every key absent from the list, so this must be the full set of
 * ticked boxes. That matches what the modal has — five checkboxes it reads wholesale — and it means
 * a dropped key revokes rather than preserves, which is the safe direction for a permission.
 *
 * ## The refusal is DISTINGUISHED, and that is the point of the second error class
 *
 * A 403 here is a correct answer — not a presenter, or the target is not in this room — and retrying
 * will not change it, so it must not read to the caller as "the control plane is down". Same
 * reasoning `StreamIngestForbidden` records below.
 */
export async function writeRoomPermissions(
  shortCode: string,
  callerEmail: string,
  targetEmail: string,
  granted: readonly string[]
): Promise<void> {
  const secret = ROOM_JWT_SECRET;
  if (!secret) throw new RoomConfigUnavailable('ROOM_JWT_SECRET is not configured');

  const base = roomPermissionsUrl(shortCode);
  if (!base) throw new RoomConfigUnavailable('CONTROL_BASE_URL is not configured');

  const url = new URL(base);
  url.searchParams.set('email', callerEmail);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${configWriteToken(secret, shortCode)}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ targetEmail, granted }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (cause) {
    throw new RoomConfigUnavailable(`the write failed or timed out after ${TIMEOUT_MS}ms`, {
      cause
    });
  }

  if (response.status === 403 || response.status === 404) {
    throw new RoomPermissionsRefused(`the controller answered ${response.status}`);
  }
  if (!response.ok) throw new RoomConfigUnavailable(`the controller answered ${response.status}`);
}

/**
 * `kick-ban`: `POST {control}/internal/room-ban/{shortCode}`.
 *
 * The durable half of a ban. `kickUser` disconnects the socket — immediate, and the room's own — and
 * this is the half that is still true tomorrow, written where `internal/room-config` reads it on
 * every page load.
 *
 * Refusals are DISTINGUISHED from outages for the reason `writeRoomPermissions` gives directly
 * above: a 403 here is a correct answer that retrying will not change, and it must not reach the
 * presenter as "the control plane is down".
 */
export async function writeRoomBan(
  shortCode: string,
  callerEmail: string,
  targetEmail: string,
  banned: boolean
): Promise<void> {
  const secret = ROOM_JWT_SECRET;
  if (!secret) throw new RoomConfigUnavailable('ROOM_JWT_SECRET is not configured');

  const base = roomBanUrl(shortCode);
  if (!base) throw new RoomConfigUnavailable('CONTROL_BASE_URL is not configured');

  const url = new URL(base);
  url.searchParams.set('email', callerEmail);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${configWriteToken(secret, shortCode)}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ targetEmail, banned }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (cause) {
    throw new RoomConfigUnavailable(`the write failed or timed out after ${TIMEOUT_MS}ms`, {
      cause
    });
  }

  /*
    409 joins 403 and 404 as a REFUSAL rather than an outage. The endpoint returns it when the
    membership row moved between the authority read and the write — a correct answer about a race,
    not a control plane that is down, and one the presenter should see as "that did not apply".
  */
  if (response.status === 403 || response.status === 404 || response.status === 409) {
    throw new RoomPermissionsRefused(`the controller answered ${response.status}`);
  }
  if (!response.ok) throw new RoomConfigUnavailable(`the controller answered ${response.status}`);
}

/**
 * The indefinite chat mute: `POST {control}/internal/room-mute/{shortCode}`.
 *
 * `writeRoomBan`'s shape exactly, one opcode over. It is separate rather than a flag on that call
 * because the two answer different questions and write different roles, and because a single
 * function taking `banned` and `muted` would have a fourth state — both true — that the role column
 * cannot represent.
 *
 * The controller refuses a self-target and refuses the room's owner; see the endpoint for why the
 * second is stricter than anything the reference states. Refusals are DISTINGUISHED from outages for
 * the reason `writeRoomPermissions` gives: a 403 is a correct answer that retrying will not change.
 */
export async function writeRoomMute(
  shortCode: string,
  callerEmail: string,
  targetEmail: string,
  muted: boolean
): Promise<void> {
  const secret = ROOM_JWT_SECRET;
  if (!secret) throw new RoomConfigUnavailable('ROOM_JWT_SECRET is not configured');

  const base = roomMuteUrl(shortCode);
  if (!base) throw new RoomConfigUnavailable('CONTROL_BASE_URL is not configured');

  const url = new URL(base);
  url.searchParams.set('email', callerEmail);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${configWriteToken(secret, shortCode)}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ targetEmail, muted }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (cause) {
    throw new RoomConfigUnavailable(`the write failed or timed out after ${TIMEOUT_MS}ms`, {
      cause
    });
  }

  // 409 joins 403 and 404 as a REFUSAL rather than an outage — the membership moved between the
  // authority read and the write. See `writeRoomBan`.
  if (response.status === 403 || response.status === 404 || response.status === 409) {
    throw new RoomPermissionsRefused(`the controller answered ${response.status}`);
  }
  if (!response.ok) throw new RoomConfigUnavailable(`the controller answered ${response.status}`);
}

/**
 * The controller refused a permissions write: not a presenter, or the target is not in this room.
 *
 * Separate from {@link RoomConfigUnavailable} for the reason {@link StreamIngestForbidden} gives —
 * this is a correct answer to a question that was allowed to be asked, and it needs to reach the
 * presenter as a refusal rather than as an outage.
 */
export class RoomPermissionsRefused extends Error {
  constructor(detail: string) {
    super(`The control plane refused that permissions change (${detail}).`);
    this.name = 'RoomPermissionsRefused';
  }
}

/**
 * The controller refused: this member may not publish into this room.
 *
 * Distinct from {@link RoomConfigUnavailable} because the two need opposite handling — this one is
 * a correct answer to a question that was allowed to be asked, and retrying will not change it.
 */
export class StreamIngestForbidden extends Error {
  constructor() {
    super('This member is not permitted to publish into this room.');
    this.name = 'StreamIngestForbidden';
  }
}

/**
 * `getRTMPToken` — mint this presenter a fresh publish credential for OBS or XSplit.
 *
 * Not cached, and for the same reason `requestMobilePin` is not: the controller ROTATES on every
 * call, so a cached answer would hand back a key that had already been replaced. That is the
 * reference's behaviour too — `getNewToken()` and the panel's first render call the identical
 * command.
 *
 * The room asks and the controller decides. It sends only who is asking; whether that person may
 * publish is re-derived there from `room_users`, because a room asserting its own user's authority
 * is the escalation this codebase already had once.
 */
export async function requestStreamIngestKey(
  shortCode: string,
  memberEmail: string
): Promise<StreamIngestKey> {
  const secret = ROOM_JWT_SECRET;
  if (!secret) throw new RoomConfigUnavailable('ROOM_JWT_SECRET is not configured');

  const base = streamIngestUrl(shortCode);
  if (!base) throw new RoomConfigUnavailable('CONTROL_BASE_URL is not configured');

  let response: Response;
  try {
    response = await fetch(base, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${configWriteToken(secret, shortCode)}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ email: memberEmail }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (cause) {
    throw new RoomConfigUnavailable(
      `the stream-key request failed or timed out after ${TIMEOUT_MS}ms`,
      {
        cause
      }
    );
  }

  /*
    A REFUSAL is not an outage, and collapsing the two would be a real bug: a participant who is not
    allowed to publish would be told the controller is down, and the room would log an error for
    something working exactly as designed.
  */
  if (response.status === 403) throw new StreamIngestForbidden();
  if (!response.ok) throw new RoomConfigUnavailable(`the controller answered ${response.status}`);

  const payload = (await response.json()) as Partial<StreamIngestKey>;
  if (typeof payload.rtmpToken !== 'string' || !payload.rtmpToken) {
    throw new RoomConfigUnavailable('the controller returned no stream key');
  }
  if (typeof payload.ingestPath !== 'string' || !payload.ingestPath) {
    throw new RoomConfigUnavailable('the controller returned no ingest path');
  }
  return {
    rtmpToken: payload.rtmpToken,
    ingestPath: payload.ingestPath,
    streamServerMTX: typeof payload.streamServerMTX === 'string' ? payload.streamServerMTX : '',
    configured: payload.configured === true
  };
}

/** The viewer's playback credential, as `/internal/stream-read/{code}` returns it. */
export interface StreamReadToken {
  /** `globals.mtxToken` — spent as `?jwt=` on the HLS playlist. */
  mtxToken: string;
  /** Host only, no scheme and no port. Empty when the deployment has no media server. */
  streamServerMTX: string;
  /** False means no media server is configured, so the pane must not build a playlist URL. */
  configured: boolean;
  expiresInSeconds: number;
}

/**
 * The viewer's read credential, fetched with the page.
 *
 * ## Why this one is part of the load and the ingest key is not
 *
 * `userLoggedIn` (bundle byte 994430) copies `mtxToken` and `streamServerMTX` out of the login
 * response into globals for EVERY session, presenter or not, and `app-streaming-view` spends the
 * token the moment a stream tab renders. There is no on-demand request to reproduce.
 *
 * ## Why a failure here is not an error
 *
 * A room with no MediaMTX behind it is the normal case today, and a member who cannot get a
 * playback token still has a working room — chat, screens, notes and files are all unaffected. So
 * this returns `null` on any failure rather than throwing, and the pane reads that as "no
 * playback", which is the same state as `configured: false`.
 *
 * That is a deliberate exception to this file's fail-loud rule, and it is safe for one specific
 * reason: **`null` denies rather than grants.** The rule exists so that a network failure can never
 * be mistaken for permission — which is why {@link decideRoomEntryRemotely} fails closed and throws.
 * Here the failure mode is already closed, and throwing would take down the whole room load over a
 * feature most rooms do not use.
 */
export async function requestStreamReadToken(
  shortCode: string,
  memberEmail: string
): Promise<StreamReadToken | null> {
  const secret = ROOM_JWT_SECRET;
  if (!secret) return null;

  const base = streamReadUrl(shortCode);
  if (!base) return null;

  let response: Response;
  try {
    response = await fetch(base, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${configReadToken(secret, shortCode)}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ email: memberEmail }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (cause) {
    // Logged rather than swallowed: no `.catch(() => {})` here, the reason is recorded.
    console.warn('[stream-read] the controller could not be reached', { shortCode, cause });
    return null;
  }

  if (!response.ok) {
    /*
      403 is a correct answer — a banned member may not watch — and 404 means the room is gone. Both
      are logged at info rather than warn so a normal refusal does not read as an outage.
    */
    console.info('[stream-read] no playback token', { shortCode, status: response.status });
    return null;
  }

  const payload = (await response.json()) as Partial<StreamReadToken>;
  if (typeof payload.mtxToken !== 'string' || !payload.mtxToken) return null;

  return {
    mtxToken: payload.mtxToken,
    streamServerMTX: typeof payload.streamServerMTX === 'string' ? payload.streamServerMTX : '',
    configured: payload.configured === true,
    expiresInSeconds: typeof payload.expiresInSeconds === 'number' ? payload.expiresInSeconds : 0
  };
}

/** What the controller answers when asked whether an attempt may enter. */
export type RoomEntryDecision =
  | { ok: true; asFreeTrial: boolean }
  | { ok: false; reason: string; message: string; redirectTo: string | null };

/**
 * Asks the controller whether this attempt may enter — `decideRoomEntry`, run where the credentials
 * live.
 *
 * The room cannot answer this itself and should not want to. `webinarPW` and `banIPList` are
 * credential-shaped, so `room-config-boundary.test.ts` forbids them from `ROOM_VISIBLE_SETTINGS`,
 * and the room serialises its config into SSR HTML — a password sent here would reach the browser,
 * every cache in front of the room, and any HAR on a support ticket.
 *
 * The reference splits it the same way for the password: `loginToRoom()` builds `{cver, nick,
 * email}`, adds `i.pw` when one was typed, and posts it. `webinarPW` appears NOWHERE in its bundle.
 *
 * ## Fails CLOSED
 *
 * A controller that cannot be reached means the room cannot know whether this person may enter, and
 * "cannot know" is not "yes". The one thing it must never do is admit somebody because a network
 * call timed out.
 */
export async function decideRoomEntryRemotely(
  shortCode: string,
  attempt: {
    name: string;
    email: string;
    phone: string;
    password: string;
    secretToken: string;
    agreedToDisclosure: boolean;
    remoteIp: string;
  }
): Promise<RoomEntryDecision> {
  const secret = ROOM_JWT_SECRET;
  if (!secret) throw new RoomConfigUnavailable('ROOM_JWT_SECRET is not configured');

  const base = roomEntryUrl(shortCode);
  if (!base) throw new RoomConfigUnavailable('CONTROL_BASE_URL is not configured');

  let response: Response;
  try {
    response = await fetch(base, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${configReadToken(secret, shortCode)}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(attempt),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (cause) {
    throw new RoomConfigUnavailable(`the entry check failed or timed out after ${TIMEOUT_MS}ms`, {
      cause
    });
  }

  if (!response.ok) throw new RoomConfigUnavailable(`the controller answered ${response.status}`);
  return (await response.json()) as RoomEntryDecision;
}
