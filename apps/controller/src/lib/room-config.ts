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
  /*
    `presenterMsgsOnTheRight` — presenter messages align right, and their reactions with them.

    TWO consumers in `RoomMessage.svelte`, which is why it earns a place on a list whose rule is
    that every entry has one: `messageBodyClass` adds `presenter-msg-right`, and the reaction row
    takes `presenter-reactions-right`. Owner-configurable at
    `evidence-dumps/TIER1-fetched/views/page.manageSession.html:1108`.

    Its three neighbours on that page — `enableBadges`, `showBadgesToPresentersOnly` and
    `disableStarYears` — are deliberately NOT here yet. Each gates chat badges or star years, and
    neither renders: nothing populates `item.badges` or `item.membershipYears`, so sending those
    three would be exactly what the note below forbids, a value crossing a trust boundary for
    nothing. They belong here the day their supply exists, not before.
  */
  'presenterMsgsOnTheRight',
  /* The rest of the chat-badge gate. These were deliberately held OUT until 2026-08-14, when
     the badge supply landed — this list's rule is that every entry has a consumer, and until
     `item.badges` was populated they would have been values crossing a trust boundary for
     nothing. `disableStarYears` is the one exception still ahead of its data, and it is passed
     to the component's own gate rather than left unread. */
  'enableBadges',
  'showBadgesToPresentersOnly',
  'disableStarYears',
  /*
    "Enable Rich Text Editor?" — "If enabled, Presenter will be able to format their messages using
    the rich text editor".

    The owner's term in a THREE-way gate the room resolves as
    `sessData.enableRTE && preferences.enableRTE && isPresenter`. That expression is not inferred:
    it appears three times in the decoded bundle — on the composer button that opens the editor
    (byte 1426967), inside `loadRTE`, which will not construct the editor without it, and inside
    `retriveRTEContent`, which returns an empty string so a crafted click cannot post through a
    disabled editor either.

    Not a credential and not something the room could infer: it is a per-room policy the owner ticks
    on the Manage page, and the room is where the toolbar is drawn. The other two terms are the
    presenter's own preference and their role, and neither is the owner's to decide.
  */
  'enableRTE',
  /*
    The five settings the room's own LOGIN PAGE is driven by, each read from `sessData` in the
    decoded bundle at the byte offset named beside it. Added 2026-08-14 with that page.

    `app-session-login` is not a second identity system — the signed handoff still decides who
    somebody is. These five decide what the page SHOWS and which of the room's own entry rules it
    collects, and every one is read there:

      showPasswordField        1189804   `showPresenter = sessData.showPasswordField`
      usernameInstructions     1189881
      hasRequiredPhoneInLogin  1189964
      customEnterDisclosure    1190048
      disableEditingUsername   1192694   `'a' !== perms && sessData.disableEditingUsername`

    NOT here, and the distinction is the whole reason this list exists:

      `webinarPW`  — appears NOWHERE in the room bundle. The reference's room never holds the room
                     password: `loginToRoom()` builds `{cver, nick, email}`, adds `i.pw` when one
                     was typed, and its SERVER decides. Ours does the same through
                     `internal/room-entry/[code]`, so the credential stays in the controller.
      `banIPList`  — the reference DOES send this one and checks it in the browser
                     (`doLoginCheck`, byte 1194680). We deliberately do not: a client-side ban list
                     is a courtesy check that also hands every banned address to every visitor, and
                     the server-side decision is the authoritative one either way. Narrower than
                     the reference, and named rather than silent.

    Both are `credentialShaped`, which `room-config-boundary.test.ts` forbids from this list.
  */
  'showPasswordField',
  'usernameInstructions',
  'hasRequiredPhoneInLogin',
  'customEnterDisclosure',
  'disableEditingUsername',
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
  /*
    "Tawk Presenter Support?" — the gate on the navbar's support widget,
    `O(30, isPresenter && sessData.tawkPresenterSupport ? 30 : -1)`
    (`app-room.render-helpers.js:1417-1422`), which also decides whether the third-party script is
    injected at all (`full.js:2224`, `:2274-2283`).

    Presenter-only in effect, and the room enforces that a second time: a member never loads the
    script, so the tawk.to request is not made in their browser.

    The PROPERTY ID is deliberately not carried with it. The reference hardcodes its own
    (`5aecb59f227d3d7edc24f7c2`), and reproducing that would open every presenter's support chat
    into another company's inbox and post their name and email there. Ours comes from
    `PUBLIC_PTR_TAWK_PROPERTY_ID`, and with none configured the feature stays off — see
    `apps/room/src/lib/tawk-support.ts`.
  */
  'tawkPresenterSupport',
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
    "Hide Notes Section?" — the THIRD of a trio whose other two have been on this list since it was
    written, and the one that was missed.

    `hideFiles` and `hideStreams` both cross, and both are applied by the reference the same way: a
    `hidden` binding on the tab's `li` AND on the pane, so the tab and its content can never
    disagree. `hideNotes` is applied identically —

      this.hideNotes = sessData.hideNotes || globals.viewerOnlyMode          byte 1955694
      z('hidden', o.hideNotes)   on the notes `li`                          byte 2016630
      ('hidden', o.hideNotes)    on the notes pane                          byte 2017506

    — and it was not on this list, so an owner who ticked "Hide Notes Section?" on the Manage page
    got a room that still rendered the Notes tab. Configurable and inert, which is the specific
    defect this file's neighbours call dead scaffolding.

    FOUND BY ENUMERATION, not by looking: `gate/audit-setting-coverage.mjs` asks the pinned bundle
    which settings the reference reads in its own browser that this room does not, and `hideNotes`
    came back on that list beside 57 others. Nobody had noticed the trio was a pair.

    Not a credential, and not a policy the room could infer: a per-room preference an owner ticks,
    and the room is where the tab is drawn.

    **The `|| viewerOnlyMode` half is NOT sent**, and that is deliberate rather than an omission: the
    room already knows whether it is in viewer-only mode, so ORing it here would be the control plane
    answering a question the room answers better. The room composes the two, exactly as it already
    does for the reference's `hideFiles || videoOnlyMode`.
  */
  'hideNotes',
  /*
    THE THREE ROOM DEFAULTS — the settings that seed a new member's own preferences ONCE.

    They cross together because upstream they ARE one thing: three consecutive clauses of a single
    expression in `loadSessionData`, bytes 1,149,414 / 1,149,637 / 1,149,866 of the pinned v4
    bundle. Each has the same three parts — the room setting below, a per-viewer LATCH preference,
    and a write:

      darkThemeAsDefault && !preferences.defaultDarkTheme
        -> preferences.theme = "darkTheme",  setPreference("defaultDarkTheme", true)
      alertSoundOff && !preferences.defaultAlertSoundOff
        -> preferences.alertSoundOn = false, setPreference("defaultAlertSoundOff", true)
      alertsChatOnBottom && !preferences.defaultAlertsChatOnBottom
        -> preferences.roomSplitDir = "btt", setPreference("defaultAlertsChatOnBottom", true)

    **The latch is why these are DEFAULTS and not overrides**, and it is the reason they belong on
    this list rather than being folded into anything the controller decides. Which member has
    already been given the room's default is a fact about that member's preference blob, which lives
    on the room side; the controller only knows what the OWNER asked for. Send the setting, let the
    room own the once-ness — `#lib/room/room-defaults.ts` and its test.

    Found by `gate/audit-setting-coverage.mjs` on 2026-08-28, in the same pass that found
    `hideNotes`. Not credentials, not policy the room could infer.

    ONE THING THIS DOES NOT CHANGE, stated because the next reader will wonder. `classify()` above
    calls `darkThemeAsDefault` a `default` (it matches `AsDefault$`) and the other two `room-only`
    (they match neither pattern), even though the evidence says all three are defaults a member may
    override. That disagreement is real and it is also inert: `resolveRoomConfig` treats `default`
    and `room-only` identically unless the name is in `USER_OVERRIDABLE`, and neither of the two has
    a `UserPreferences` key to be overridden BY — the preferences they seed (`alertSoundOn`,
    `roomSplitDir`) live in the room's own blob, not in the controller's six-field model. Widening
    the pattern or the map would be adding a branch nothing reaches, which this repository treats as
    a defect in its own right. The once-ness lives in the room, where the latch is.
  */
  'darkThemeAsDefault',
  'alertSoundOff',
  'alertsChatOnBottom',
  /*
    "Don't show recording info to users" — the room half of the [ REC ] tooltip.

    `RoomNavbar.svelte` has carried the correct transcription in a comment since it was written,
    read at bundle byte 2,474,213:

      ngbTooltip = (sessData.dontShowRecInfoToUsers && !isPresenter) || !roomState.recName
        ? "" : "Recording to: " + decodedRecName()

    and `RoomGates.recordingTooltip` implemented that shape against `prefs.loaded` — a per-VIEWER
    preference key that nothing in this room has ever written. So the owner switch did nothing and
    every member saw the recording FILE NAME, which is the one thing the setting exists to hide.
    The comment was right and the code was reading the wrong side of the boundary; found by
    `gate/audit-setting-coverage.mjs` on 2026-08-28.

    Not a credential and not inferable: the owner decides whether members see the file name.
  */
  'dontShowRecInfoToUsers',
  /*
    "Chat disabled for trials?" — the THIRD reason the reference turns the composer off.

      globals.user.isFT && sessData.chatDisabledForTrials && (this.chatEnabled = !1)

    at bundle byte 1,437,810, the last of three assignments to one flag. This room had the other two
    — the chat mode and this viewer's own mute — and no term for the owner policy, so a room that
    had turned trial chat off served every trial a working composer. Wired 2026-08-28 with
    `chatComposerAvailable`, which now holds all three in one place because splitting them is how
    one goes missing.

    Not a credential. It is policy about a CLASS of member, which is exactly the kind of thing that
    belongs on this list: the room knows who is on a trial, and only the owner knows the policy.
  */
  'chatDisabledForTrials',
  /*
    "Q&A on alerts?" — the entitlement behind the ask-a-question button on every alert.

      O(1, !e.isQAMsg && sessData.hasQAOnAlerts ? 1 : -1)          byte 1,339,784
      if ("alerts" != this.logType || !sessData.hasQAOnAlerts) return;   byte 1,408,769

    `RoomMessage.svelte` has drawn that button since it was written, gated on a prop that
    **defaulted to `true` and was never passed** — so the affordance appeared on every alert in every
    room, bought or not, and pressing it opened the Q&A modal. An entitlement that defaults open is
    not an entitlement; this list is what closes it.

    The second reader has no counterpart here and that is recorded rather than approximated: the
    reference re-checks the flag inside `updateAlertMsg`, and this room has no such receiver — the
    Q&A counters arrive through the feed and the `unreadQa` set.
  */
  'hasQAOnAlerts',
  /*
    "Always show roster?" — the sidebar opens on arrival and stays open.

      sessData.alwaysShowRoster && (this.showSidebar = !0, this.alwaysShowRoster = !0,
        setTimeout(() => this.appService.loadRoster(), 500))

    at bundle bytes 1,499,261 and 2,566,991 — the room component and its popout, the same three
    statements in both. It is a SEED, not a lock: `toggleSideBarUsersCount` still closes the sidebar
    afterwards, so a member can put it away.

    ONE consumer here and one deliberate refusal. The seed is built. The reference ALSO adds the flag
    as a third OR-term to the mobile-app icon's slot (byte 2,487,668) so the slot stays occupied when
    no app is configured — while `getMyPinAndDoInfo` keeps the two-term gate (2,529,070). Reproducing
    that would put a button in this navbar that opens a modal reading `N/A` forever, which is a
    control that does nothing; the refusal is recorded at `RoomGates.mobileAppAvailable`.
  */
  'alwaysShowRoster',
  /*
    "Speech recognition disabled?" — the room half of the captions gate, and NOTE THE NEGATION.

      globals.hasSpeechRecognition = !sessData.hasSpeechRecognitionDisabled && !0     byte 1,147,900

    Unlike `h264Enabled`, whose `|| !0` makes it unconditionally true and dead, the `!` here makes
    this one live: an absent setting leaves recognition ON, which is the right default and is what
    every unset setting means everywhere else in this payload.

    Three consumers upstream and the first is the one that matters: `startSpeechRecognition()` returns
    early on `!preferences.doSpeechReco || !globals.hasSpeechRecognition` (byte 1,110,427). This
    room's `beginSpeechRecognition` has quoted that message — "disabled by preferences or session
    settings" — in its docblock since it was written while implementing only the PREFERENCES half.
  */
  'hasSpeechRecognitionDisabled',
  /*
    "Hide webcam for room?" — the webcam control disappears for everybody.

      O(27, sessData.hideWebcamForRoom
            || !(isPresenter || user.hasCam || isLimitedPresenter)
            || isNonPresenterAdmin || mediaService.camLaunching ? -1 : 27)      byte 2,489,228

    ONE term of five, and the only one this room could not evaluate. It is a room-wide OFF switch
    rather than a per-viewer capability, which is why it belongs on this list: the others are facts
    the room already holds about the viewer and their devices.
  */
  'hideWebcamForRoom',
  /*
    "Blinking REC?" — whether the recording badge breathes.

      z('ngClass', Kn(6, iPe, roomState.isRecording && sessData.blinkingRec, isRecordingStarting))
      iPe = (t, n) => ({ 'breathing-rec': t, recIndicatorStart: n })                byte 2,477,678

    `breathing-rec` is a REAL class with a real rule — a `50% { opacity: 0 }` keyframe, carried in
    `captured-runtime-components.css:4281`. Unlike `smallImagePreview`, whose class styles nothing in
    any of the 52 stylesheets and which is therefore answered as NOT A GAP, this one has somewhere
    to land.
  */
  'blinkingRec',
  /*
    "Auto switch to off-topic?" — the MAIN chat column opens on the off-topic channel.

      ngOnInit: sessData.autoSwitchToOfftopics && (this.channel = "offTopic",
        this.appEventBus.emit("switchChatChannel", this.channel))              byte 1,407,102

    A SEED, like `alwaysShowRoster`: the channel tabs still switch back. The EXTRA column has the
    same clause at 2,359,803, additionally gated on `preferences.extraChatColumn` — and it is a
    no-op there in both applications, because that column already defaults to off-topic.
  */
  'autoSwitchToOfftopics',
  /*
    "Sticky non-trade alert?" — the alert composer's Non-Trade checkbox starts ticked.

      this.nonTradeAlert = sessData.styckyNonTradeAlert || !1                  byte 2,124,407

    `styckyNonTradeAlert` is the reference's own spelling and is kept: the name has to match what
    the controller stores, and correcting it here would silently stop reading the setting an owner
    has already configured.

    It is re-applied on EVERY open of the modal, which is what "sticky" means — the reference sets it
    inside `doAlertsModal`, beside the other per-open resets, not once at construction.
  */
  'styckyNonTradeAlert',
  /*
    "Room Title" — the room's own name, and the document title.

      globals.sessionName = r.name                                   byte 1,149,312
      this.titleService.setTitle(this.appService.globals.sessionName)  byte 2,594,952

    The name reaches three places upstream: the browser tab, the transcript window's `&name=`
    parameter, and the private-chat notification flasher that alternates the tab between
    `"<sender> messaged you - <room>"` and the room name. The tab is built here; the other two are
    recorded as gaps rather than approximated.

    NOTE THE ENUMERATION ARTEFACT. `gate/audit-setting-coverage.mjs` reports a high read count for
    this name and almost all of it is noise — the bundle is full of unrelated `this.name` on
    `UnsubscriptionError`, `ObjectUnsubscribedError` and Angular's own reflection. The single real
    read is the assignment above. `docs/decoded/missing-settings-triage.md` records why the number is
    not evidence of anything.
  */
  'name',
  /*
    "Moderator message" — a bar only the PRESENTER sees, above the presentation area.

      O(2, e.modMessage && globals.isPresenter ? 2 : -1)              byte 2,493,284
      this.modMessage = this.appService.globals.sessData.modMessage    byte 2,498,699
      closeModMessage() { this.modMessage = "" }                       byte 2,532,005

    Dismissed LOCALLY and not persisted — the reference clears its own field and writes nothing back,
    so the bar returns on the next load. That is reproduced rather than improved: a dismissal that
    outlived the page would need a preference the reference does not have, and inventing one would be
    inventing a decision.

    Its three classes — `mod-msg-container`, `mod-msg-btn`, `mod-msg` — all carry real rules in
    `captured-runtime-components.css`, which is the check `blinkingRec` passed and
    `smallerImagePreview` failed.
  */
  'modMessage',
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
  'disableCopy',
  /*
    "Use MediaMTX?" — whether this room has a MediaMTX tier at all, and therefore whether the
    Streams main tab exists.

    `this.hideStreams = !this.appService.globals.sessData.useMediaMTX`
    (`app-presentationarea.full.js:2293`), feeding `z('hidden', o.hideStreams)` on BOTH the
    `#streams-tab` `li` (`:5357`) and the `#streams` pane itself (`:5388-5391`). Without it
    `hideStreams` evaluates `!undefined` — true — and the tab is hidden in every room, including the
    ones that have MediaMTX, which is the shape this row had until now: a placeholder `li` with a
    hardcoded `hidden`.

    Not a credential. It is a boolean saying which media tier the room uses, and the two values that
    ARE sensitive alongside it on the Manage page — `mediaMTXClusterID` and
    `backupMediaMTXClustterID` (the typo is upstream's) — are deliberately NOT here. They name
    infrastructure, the room bundle never reads either, and the room reaches its MediaMTX host
    through `STREAM_SERVER_MTX` on the server rather than through a cluster id in the browser.
  */
  /*
    "Enable Swing Trade Alerts Tab?" — "If enabled, the room will have swing alerts tab."

    The entitlement for the Swing Alerts feature, added 2026-08-15 with the pane that reads it. The
    room resolves it once as `sessData.hasSwingTradeAlerts` and gates three things on it: the nav
    `li`, the `#swingAlerts` pane, and the initial `getSwingAlertsLog` fetch. Absent means absent —
    the reference emits `-1`, so a room without it renders no markup at all rather than hidden
    markup, and the room's own load skips the table entirely.

    `linkedRoomSwingAlertsOther` is deliberately NOT here beside it. Upstream, a non-empty value
    makes the room fetch ANOTHER room's swing log by substituting that room's sessionID. The room
    takes its room from the session row so that no value the browser can reach names the room being
    read; allow-listing this one would put a cross-room read back behind a settings field.
  */
  'hasSwingTradeAlerts',
  /*
    "Enable Day Trade Alerts Tab?" — "If enabled, the room will have day trade alerts tab."

    The entitlement for the Day Trade Alerts feature, added 2026-08-15 with the pane that reads it,
    one step after its Swing twin. The room resolves it once as `sessData.hasDayTradeAlerts` and
    gates four things on it: the nav `li`, the `#dayTradeAlerts` pane, the initial
    `getDayTradeAlertsLog` read, and all three mutations. Absent means absent — the reference emits
    `-1`, so a room without it renders no markup at all rather than hidden markup, and the room's
    own load skips the table entirely.

    Note the spelling. The Swing flag doubles the word (`hasSwingTradeAlerts`) and this one does
    not. Both are read side by side in the reference at bundle bytes 1,009,430 and 1,009,503.

    `linkedRoomDayTradeAlertsOther` is deliberately NOT here beside it, exactly as
    `linkedRoomSwingAlertsOther` is not. Upstream, a non-empty value makes the room fetch ANOTHER
    room's day trade log by substituting that room's sessionID. The room takes its room from the
    session row so that no value the browser can reach names the room being read; allow-listing this
    one would put a cross-room read back behind a settings field.
  */
  'hasDayTradeAlerts',
  'useMediaMTX',
  /*
    "Overlay userID on screenshare?" — prints the VIEWER'S OWN `userXrefID` over the video.

    `TCe` (main bundle byte 1901148) renders `<span class="overlay-userID-container">` inside
    `app-streaming-view`, gated on the room setting AND `!isPresenter`. It is a leak-tracing measure:
    a member who screen-records the stream and reposts it carries their own id burned into the
    frame, and the presenter is exempt because their copy is the source.

    It identifies the person ALREADY WATCHING to themselves — the room hands each session its own
    `userXrefID` regardless — so it crosses no boundary this room does not already cross. Read by
    `StreamingView.svelte`; without it the gate evaluated `undefined` and the overlay could never
    appear however the owner configured the room.
  */
  'overlayUserIdOnScreenshare',
  /*
    "Alert filter list for mods:" — the people a viewer may filter their alerts by.

    Unlike every flag above it, this is not a boolean gate: it is a STRING CONTAINING JSON, an array
    of `{username, avatar}` parsed by `syncModAlertFilterList()` at main bundle byte 1,221,905. The
    third room setting shipped that way, after `alertLabels` and `chatTabsWithBadges`.

    It crosses because the reference gates the WHOLE feature on it being truthy — bytes 2,042,979 and
    2,286,654. No list configured means no entry point, no modal and no filtering, and there is
    nothing to default from. The room cannot decide that for itself.

    The avatars in it are gravatar hashes of emails the room owner already administers, and the room
    already receives `senderAvt` on every alert to render the avatar — so this crosses no boundary
    the alerts feed does not already cross.

    Read by `alert-filter.ts` and the `#alert-filter-modal` pane.
  */
  'modAlertFilterList',
  /*
    "Alert Labels" — a hash tag inside an alert body renders as a coloured badge.

    The FOURTH setting shipped as a string containing JSON, and the one the note above already
    names. Objects of name, hash, color and bgcolor, parsed by the room at bundle byte 1,147,290,
    which also stamps checked=false onto every entry for the composer picker that the capture never
    renders. The parseSymbols transform at byte 1,326,855 then swaps the FIRST occurrence of each
    hash for the badge.

    It crosses because every rendered byte of that badge is a value the owner typed. The label text,
    the background and the border colour have no defaults, and a room that configures none renders
    the hash as ordinary text - which is what the transform already does with an empty list, so the
    absent case needs nothing.

    ALERTS ONLY. The same transform runs over the chat log and substitutes nothing there.

    Read by alert-labels.ts and RoomMessage.svelte.
  */
  'alertLabels',
  /*
    FOUR gates the room already implemented and could never switch on.

    `RoomMessage.svelte` has carried all four props since it was written, each defaulting false,
    and `+page.svelte` never passed them - so public reply, reactions, edit-message and edit-alerts
    were dead in every room no matter what the owner ticked. Every occurrence of all four in the
    reference bundle is `sessData.<name>`, so they are per-room policy and nothing the room could
    infer for itself.

    `enableEditMessage` and `enableEditAlerts` are TWO settings because the reference gates the
    chat log and the alerts log separately; collapsing them would let a room that allows editing
    alerts also allow editing chat.
  */
  'usersPublicReply',
  'enableReactions',
  'enableEditMessage',
  'enableEditAlerts',
  /*
    "Recording Reminder If Speaking?" - the POLICY half of the reminder banner.

    TWO values share this name upstream and only one of them is a setting. The gate at bundle byte
    2,477,770 requires `sessData.recordingReminder` AND a local flag of the same name, plus mic and
    recording state. The room already carries the local flag and already renders the banner, so this
    is the missing term rather than a new feature - without it an owner cannot switch the reminder
    off at all.
  */
  'recordingReminder'
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
 * The settings the PUBLIC ROOM-LOGIN PAGE is allowed to receive. A second allow-list, and it has to
 * be a second one.
 *
 * ## The defect this closes, found 2026-08-20
 *
 * `routes/(public)/session/[code]/+page.server.ts` returned `resolveRoomConfig(...).values` — all
 * 269 settings — from a load on a `(public)` route. SvelteKit serialises a load's return into the
 * SSR payload, so every visitor who could reach a room's login URL received `webinarPW`
 * ("Room Password:"), `ssoJWTSecret` ("JWT Secret Key:"), `secTok` ("Secret Token:") and
 * `pairSecretKey` in the page data. Nothing rendered them; `RoomLogin.svelte` reads nine keys and
 * ignores the rest, so only the component's restraint kept them off the screen — never a filter.
 *
 * The docblock on {@link ROOM_VISIBLE_SETTINGS} had already written down this exact threat, naming
 * these exact credentials, and `room-config-boundary.test.ts` already proved the unfiltered call
 * leaks them. The boundary existed, was documented and was tested; ONE route did not use it.
 *
 * ## Why not simply reuse `roomVisibleConfig`
 *
 * Because it would ship a broken login page, and that was checked rather than assumed. Four of the
 * nine keys this page reads — `hideAvatars`, `hideWelcomeTo`, `hidePoweredBy`, `claimNickName` —
 * are NOT in `ROOM_VISIBLE_SETTINGS`, and correctly so: they gate this page's own chrome, and the
 * room application has no use for them. Two consumers, two questions, two lists — the same
 * reasoning that already separates `ROOM_VISIBLE_SETTINGS` from `wired`.
 *
 * ## Every entry has a consumer, and the consumer is named
 *
 * Each key below is read by `RoomLogin.svelte` through its `on()` / `str()` helpers. A key with no
 * reader does not belong here: it would be a value crossing a trust boundary for nothing.
 */
export const ROOM_LOGIN_SETTINGS = [
  /* The avatar block, the h1 and the footer — `showAvatar`, `showWelcome`, `showPoweredBy`. */
  'hideAvatars',
  'hideWelcomeTo',
  'hidePoweredBy',
  /* The two conditional fields — `showPhone` and `passwordPreOpen`. */
  'hasRequiredPhoneInLogin',
  'showPasswordField',
  /* The `nickHelpBlock` the reference's `aria-describedby` points at. */
  'usernameInstructions',
  /* `nameLocked` reads BOTH: a claimed nick that the user may not change. */
  'claimNickName',
  'allowUsersToChangeUsername',
  /* Rendered as TEXT, never as markup — the owner's words, and the server refuses without it. */
  'customEnterDisclosure'
] as const satisfies readonly (keyof RoomSettings)[];

const ROOM_LOGIN_VISIBLE = new Set<string>(ROOM_LOGIN_SETTINGS);

/**
 * `resolveRoomConfig()` narrowed to what may cross into the PUBLIC login page.
 *
 * Fails closed exactly as {@link roomVisibleConfig} does: a setting added to the schema tomorrow is
 * invisible here until somebody puts it on the list, and putting it there is a decision rather than
 * an oversight.
 */
export function roomLoginConfig(
  room: Partial<RoomSettings>,
  user: UserPreferences = {}
): { values: Readonly<Record<string, unknown>>; locked: readonly string[] } {
  const resolved = resolveRoomConfig(room, user);
  const values: Record<string, unknown> = {};
  for (const name of ROOM_LOGIN_SETTINGS) {
    const value = resolved.values[name];
    // Undefined means unset, and unset means off — omit rather than serialise a null.
    if (value !== undefined) values[name] = value;
  }
  return { values, locked: [...resolved.locked].filter((name) => ROOM_LOGIN_VISIBLE.has(name)) };
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
