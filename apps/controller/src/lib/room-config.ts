/**
 * The single seam between the controller and the room.
 *
 * Two things can change how the room behaves:
 *   1. the controller  — per-ROOM settings, written on #/page/manageSession
 *   2. the room itself — per-USER preferences, written from the in-room settings panel
 *
 * They are different scopes, so they only conflict on the 20 settings whose subject
 * matter overlaps. Rather than let each room component decide which source wins —
 * which is how this becomes unmaintainable — every read goes through
 * `resolveRoomConfig()` and precedence is decided in exactly one place.
 *
 * The precedence rule is not invented; the reference encodes it in its own naming:
 *
 *   POLICY   `hide*`, `disable*`, `allow*`, `*VisibleToViewers`, `*Disabled`
 *            The room owner decides and the user CANNOT override. Turning off
 *            "Hide notes Section?" is not a preference, it is a capability.
 *
 *   DEFAULT  `*AsDefault`
 *            The room seeds the initial value and the user MAY override it.
 *            `darkThemeAsDefault` help text: "If enabled, dark theme will be set
 *            as default" — i.e. a default, not a lock.
 *
 * Anything not matching either pattern is room-only: it has no per-user counterpart
 * and is read straight from the room settings.
 */

import { ROOM_SETTINGS, type RoomSettings } from './room-settings-schema';

export type SettingClass = 'policy' | 'default' | 'room-only';

/** Per-user preferences, as stored in `user_settings`. */
export interface UserPreferences {
  theme?: 'light' | 'dark';
  roomLayout?: string;
  chatTextSize?: number;
  compactAlerts?: boolean;
  compactChat?: boolean;
  doNotDisturb?: boolean;
}

const POLICY_PATTERN = /^(hide|disable|disalow|dont|no)|Disabled\??$|VisibleToViewers$|^allow/i;
const DEFAULT_PATTERN = /AsDefault$/;

export function classify(name: string): SettingClass {
  if (DEFAULT_PATTERN.test(name)) return 'default';
  if (POLICY_PATTERN.test(name)) return 'policy';
  return 'room-only';
}

/**
 * Settings the user is allowed to override, mapped to the preference that does it.
 * Kept explicit rather than derived: a wrong guess here silently hands a user
 * control over something the room owner meant to enforce.
 */
export const USER_OVERRIDABLE: ReadonlyMap<keyof RoomSettings, keyof UserPreferences> = new Map([
  ['darkThemeAsDefault', 'theme']
]);

export interface ResolvedRoomConfig {
  /** Effective value per setting, after precedence. */
  readonly values: Readonly<Record<string, unknown>>;
  /** Settings whose value the room owner is enforcing — the UI should show these as locked. */
  readonly locked: ReadonlySet<string>;
  /**
   * Settings the controller can store but nothing in the room reads yet.
   * Surfaced so the controller can mark them, rather than presenting a toggle
   * that silently does nothing.
   */
  readonly unwired: ReadonlySet<string>;
}

export function resolveRoomConfig(room: Partial<RoomSettings>, user: UserPreferences = {}): ResolvedRoomConfig {
  const values: Record<string, unknown> = {};
  const locked = new Set<string>();
  const unwired = new Set<string>();

  for (const def of ROOM_SETTINGS) {
    const name = def.name;
    const roomValue = (room as Record<string, unknown>)[name];

    if (!def.wired) unwired.add(name);

    switch (classify(name)) {
      case 'policy': {
        // Owner decides, full stop. A user preference never reaches here.
        values[name] = roomValue;
        if (roomValue !== undefined && roomValue !== null && roomValue !== false) locked.add(name);
        break;
      }
      case 'default': {
        const prefKey = USER_OVERRIDABLE.get(name as keyof RoomSettings);
        const pref = prefKey ? user[prefKey] : undefined;
        // The room's value is the seed; an explicit user preference replaces it.
        values[name] = pref !== undefined ? pref : roomValue;
        break;
      }
      default:
        values[name] = roomValue;
    }
  }

  return { values, locked, unwired };
}

/**
 * The settings the ROOM APPLICATION is allowed to receive. An allow-list, and deliberately so.
 *
 * ## Why this is not `wired`
 *
 * `wired` records settings consumed by THIS repository's room-login page, and `webinarPW` is one
 * of them — it is the room password that login checks. Reusing it as the transport filter would
 * hand the room password to the room. Two different questions, two different lists.
 *
 * ## Why an allow-list rather than a deny-list
 *
 * `resolveRoomConfig()` returns all 269 settings, and among them are `ssoJWTSecret`, `webinarPW`,
 * `apiSecret`, `secTok`, `s3KeySecret`, `vimeoClientSecret`, `twillioApiToken`,
 * `xuserAccessTokenSecret`, `pairSecretKey`, `obsStreamKey`, `restreamToURLKey`,
 * `customClientAlertPostSecret`, `slackPostURL`, `login_webhook_url`, `banIPList`, `reportEmail`
 * and `modAdminLoginList`. The room serialises its config into SSR HTML and into `__sveltekit`
 * data on every load, so anything sent reaches the browser, any cache in front of it, and any HAR
 * attached to a support ticket.
 *
 * A deny-list would have to be right about all 268 today and right again every time a setting is
 * added. This list fails closed instead: a new setting is invisible to the room until somebody
 * adds it here, and adding it is a decision rather than an oversight.
 *
 * Every entry below has a consumer in the room today. A setting with no consumer does not belong
 * here — it would be a value crossing a trust boundary for nothing.
 *
 */
export const ROOM_VISIBLE_SETTINGS = [
  // The sidebar's roster gates — `O(44)`, the per-row gate, and `O(6)` for the count badge.
  'onlyPresentersVisibleToViewers',
  'rosterCountVisibleToViewers',
  'rosterVisibleToViewers',
  // `simUserCount`, added to the real headcount in both places it is shown.
  'simUserCount',
  // `archivesAvailableTo()` and the three gates inside the Archives menu.
  'hideChatLog',
  'hideRecs',
  'showArchivesToSpecificPresenters',
  'showArchivesToUsers',
  // `canPostImages` in the composer, and `canPM` in the roster kebab.
  'disablePMForTrials',
  'userPM',
  /*
    "Sound alert when a new message is posted?" — the gate on the chat ding.

    Not a credential and not a policy the room could infer: it is a per-room preference the owner
    ticks, and the room is where the sound plays. The reference reads it as
    `sessData.dingOnNewMessage` in `app-chat.compiled.js:135`.
  */
  'dingOnNewMessage',
  'userToPresenterPM',
  'userUploads',
  /*
    "Individual Volume Controls?" — "Individual volume controls for each Presenter".

    The gate on the per-presenter slider inside the screen overlay's volume dropdown:
    `O(6, o.appService.globals.sessData.individualVolumeControls ? 6 : -1)`
    (`app-presentationarea.render-helpers.js:383`, and the identical gate on the navbar copy at
    `app-room.render-helpers.js:1100`). Without it the room cannot resolve that gate, and the row's
    volume slider is either always shown or never shown — both wrong for somebody.

    Not a credential and not a policy the room could infer: it is a per-room preference the owner
    ticks on the Manage page, and the room is where the sliders are drawn.
  */
  'individualVolumeControls',
  /*
    Mobile App Info — `O(12, hideAppInfo ? -1 : 12)` around the button, and inside it
    `O(1, !ptrMobileAppEnabled && !customMobileAppEnabled || user.isFT && !freeTrialsGetApp ? -1 : 1)`.
    The two URLs replace the default store links when `customMobileAppEnabled`, and
    `hideMobileCredentials` drops the email/pin block from the modal.

    None of these is a credential. The two URLs are public app-store listings; the pin itself never
    appears in room settings at all — the server answers `getMyMobilePin` per user, per request.
  */
  'customMobileAppAndroidUrl',
  'customMobileAppEnabled',
  'customMobileAppIOSUrl',
  'freeTrialsGetApp',
  'hideAppInfo',
  'hideMobileCredentials',
  'ptrMobileAppEnabled',
  /*
    Benzinga — `O(31, hasBenzingaNews ? 31 : -1)` in the sidebar and `O(15, …)` in the navbar.
    `altBenzingaLogoURL` swaps the image; a non-empty `altBenzingaLinkURL` replaces the whole
    destination, which is otherwise built from the session.
  */
  'altBenzingaLinkURL',
  'altBenzingaLogoURL',
  'hasBenzingaNews',
  /*
    `canEditUsername` in the user-info modal — the fallback branch of
    `O(9, isPresenter && !isLimitedPresenter ? 9 : canEditUsername ? 10 : -1)`, which lets a member
    rename themselves through `editUsernameByUser` rather than a presenter's `editUsername`.

    Already `wired` for this repository's login page; the room reads it too now.
  */
  'allowUsersToChangeUsername',
  /*
    "Hide Files Section?" — `z('hidden', o.hideFiles)`, applied by the reference to BOTH the Files
    main-tab `li` (`app-presentationarea.full.js:5375`) and the `#files` pane itself (5410-5413).

    The reference feeds that binding `sessData.hideFiles || globals.videoOnlyMode` (2289-2290).
    Only the first term is a setting; `videoOnlyMode` is a client global set from the `r` query
    parameter — the recording-bot mode — which the room application does not have. The room's gate
    therefore reads `hideFiles` alone, and says so where it is written.
  */
  'hideFiles',
  /*
    "Overwrite Cash Register Sound" — the url of the mp3 that replaces `chash.mp3` for alerts.

    It decides which of the two presenter-only row buttons a sound file shows: "Set as alert sound"
    when this file's url is NOT the current override, "Remove as alert sound" when it is
    (`app-presentationarea.full.js:1972-1991`). Without it the room cannot resolve the gate and
    renders both at once.

    Not a credential. It is a url the presenter picked from files this room already serves, and the
    room already serves every one of them to every member on the Files pane.

    This is also the only entry on this list the room may WRITE — see `ROOM_WRITABLE_SETTINGS`.
  */
  'overwriteCashRegisterSound',
  /*
    "Hide Alerts/Chat Section?" — "If enabled, the room will not have chat/alerts. Just media."

    The FIRST of the five writers of `hideChatAlerts`, and the only one that is a setting:
    `this.hideChatAlerts = this.appService.globals.sessData.hideChatAlerts`
    (`app-room.full.js:1893`). The other four are runtime conditions the room computes for itself —
    `isPlayer && isPresenter`, `videoOnlyMode && !recordChat`, `viewerOnlyMode`, and the `detachChat`
    event. That one flag then gates the entire chat/alerts column, at
    `O(1, e.hideChatAlerts ? -1 : 1)` (`app-room.render-helpers.js:1650`), and the extra chat column
    beside it at `:1652-1660`.

    Without it the room cannot resolve the gate at all, so an owner who ticks "Hide Alerts/Chat
    Section?" on the Manage page gets a room that still renders the chat and alerts — the setting is
    configurable and inert, which is the specific defect this repository calls dead scaffolding.

    Not a credential and not a policy the room could infer: it is a per-room preference the owner
    ticks, and the room is where the column is drawn.

    `recordChat` is deliberately NOT added beside it. It appears only inside the `videoOnlyMode`
    writer (`:1898-1900`), and `videoOnlyMode` is the `r` query parameter — the recording-bot mode —
    which this room does not model, the same honest gap recorded above for `hideFiles`. Sending
    `recordChat` would put a setting on the wire that nothing can read.
  */
  'hideChatAlerts',
  /*
    The two ROOM halves of the join/leave announcements (`app-room.full.js:2134-2155`).

    Each effect is gated twice, on a room setting AND a per-viewer preference:

      sessData.userJoinAndLeavePopup && preferences.popupOnUserJoin  -> the toast
      sessData.beepOnUserJoin        && preferences.beepOnUserJoin   -> the sound

    The preferences already live in the room; these two do not, so both gates evaluated `undefined`
    and a presenter was never told that anybody arrived or left however the room was configured.

    `beepOnUserJoin` covers BOTH directions upstream — the leave beep reads the same room flag
    (`:2151`) and only the viewer preference is per-direction. There is no `beepOnUserLeave` room
    setting to send, and inventing one would put a key on the wire that the reference never reads.

    Presenter-only in effect: the client refuses both for a member. Sending them to every room is
    still correct, because whether a given reader is a presenter is not a property of the room.
  */
  'userJoinAndLeavePopup',
  'beepOnUserJoin',
  /*
    "Chat Only Room?" — "The room will be only text based chat/alerts, no audio/video".

    The second term of `hidePresentation`:
    `(chatOnlyMode || sessData.isChatOnlyRoom) && (this.hidePresentation = !0, …)`
    (`app-room.full.js:1903-1904`), gating the presentation column at
    `app-room.render-helpers.js:1662`. The first term is the `co` query parameter, which the room
    already reads for itself; this one is the room-wide setting, and it is the half that cannot be
    inferred from the URL.

    The distinction matters: `?co=1` is one reader popping the chat out of one room, while
    `isChatOnlyRoom` is the owner declaring that this room has no presentation area for anybody.
    Without it a room configured as chat-only still renders a presentation area for every member.
  */
  'isChatOnlyRoom',
  /*
    "Disable Copy?" — "If enabled, it will disable right-click to prevent selecting and copying all
    text".

    Three host bindings on `app-room`, all three carrying the SAME two-term gate — the setting AND
    `!isPresenter` (`app-room.full.js:3011-3026`, and `ngAfterViewInit` at `:2227-2229`):
    `contextmenu` is suppressed, Ctrl+C / Ctrl+U / Ctrl+S and F12 are suppressed, and
    `document.body` gains `noselect`.

    A PRESENTER is exempt by construction, which is the part that makes this a content-protection
    setting rather than a kiosk mode: the person running the room keeps their own clipboard.

    Not a credential and not a policy the room could infer — it is a per-room preference the owner
    ticks, and the room is the only place the keystrokes happen. It is also the plainest example of
    what this list is for: the checkbox has existed on the Manage page all along, and until the
    bindings landed, ticking it protected nothing.
  */
  'disableCopy'
] as const satisfies readonly (keyof RoomSettings)[];

const ROOM_VISIBLE = new Set<string>(ROOM_VISIBLE_SETTINGS);

/**
 * The settings the ROOM APPLICATION may WRITE back, through `POST /internal/room-setting/{code}`.
 *
 * A second allow-list, and a strictly narrower one: reading a setting exposes it, writing one lets
 * the room change what the owner configured on the Manage page. `ROOM_VISIBLE_SETTINGS` is already
 * the transport filter, so this list only has to answer the second question — and it fails closed
 * the same way, by naming what is permitted rather than what is not.
 *
 * `overwriteCashRegisterSound` is here because the reference puts the control in the ROOM: the
 * Files pane's two `set-alert-sound-btn` buttons call `overwriteCashRegisterSound(url, bool)`,
 * which sends the admin command `overwriteCashRegisterSound` with `{url}`
 * (`app-presentationarea.full.js:3084-3086`). The value it writes is durable per-room state, which
 * is why it comes back here rather than being broadcast and forgotten.
 *
 * Nothing else belongs here today. `hideFiles`, for one, is edited on the Manage page and read by
 * the room; a room that could switch it off would be overriding its own owner.
 */
export const ROOM_WRITABLE_SETTINGS = ['overwriteCashRegisterSound'] as const satisfies readonly (keyof RoomSettings)[];

const ROOM_WRITABLE = new Set<string>(ROOM_WRITABLE_SETTINGS);

/**
 * Whether the room is allowed to write this setting.
 *
 * Deliberately also requires the setting to be visible: the room resolves its own gate from the
 * value it was sent, so a setting it may write but never read is one whose UI cannot show the
 * result of the write.
 */
export function isRoomWritableSetting(name: string): boolean {
  return ROOM_WRITABLE.has(name) && ROOM_VISIBLE.has(name);
}

/**
 * `resolveRoomConfig()` narrowed to what may cross into the room.
 *
 * `locked` is narrowed with it: telling the room a setting is enforced when it will never see the
 * setting is noise, and noise in a security boundary is how the boundary stops being read.
 */
export function roomVisibleConfig(
  room: Partial<RoomSettings>,
  user: UserPreferences = {}
): { values: Readonly<Record<string, unknown>>; locked: readonly string[] } {
  const resolved = resolveRoomConfig(room, user);
  const values: Record<string, unknown> = {};
  for (const name of ROOM_VISIBLE_SETTINGS) {
    const value = resolved.values[name];
    // Undefined means unset, and unset means off. Omit rather than serialise a null the room
    // would have to distinguish from false.
    if (value !== undefined) values[name] = value;
  }
  return { values, locked: [...resolved.locked].filter((name) => ROOM_VISIBLE.has(name)) };
}

/**
 * Whether the in-room settings panel should offer this control to the user at all.
 * A locked policy setting must not render as a toggle the user can flip and watch
 * snap back.
 */
export function isUserEditable(name: string, room: Partial<RoomSettings>): boolean {
  const cls = classify(name);
  if (cls === 'default') return true;
  if (cls === 'room-only') return false;
  const v = (room as Record<string, unknown>)[name];
  return v === undefined || v === null || v === false;
}
