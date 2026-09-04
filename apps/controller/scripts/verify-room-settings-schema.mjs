#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
/**
 * The REPOSITORY root, distinct from `REPO_ROOT` above — which, despite its name, is this APP.
 *
 * Introduced 2026-08-29 after a duplication audit pointed at `verify-backend-provenance.mjs`, whose
 * sibling `DOCUMENTED_COUNT_SITES` list is the same mechanism as `COUNT_CLAIMS` below and whose
 * docblock records what that list cost: paths that resolved from `apps/controller/` "happened to
 * work for the wrong reason", and repairing one broke two others — *"the FOURTH instance of one
 * original bug, which is why every path in this file now resolves from a single explicit root."*
 *
 * `COUNT_CLAIMS` had exactly that shape: three entries app-relative, two escaping upward with
 * `../../`. It worked, and it produced error messages naming `../../docs/decoded/admin-surface.md`,
 * which is not a path anyone can paste. Every site is now written from the repository root, so the
 * list reads as locations rather than as directions.
 */
const REPOSITORY_ROOT = resolve(SCRIPT_DIR, '../../..');
const GENERATOR = resolve(SCRIPT_DIR, 'extract-manage-schema.mjs');
const CANONICAL_SCHEMA = resolve(REPO_ROOT, 'src/lib/room-settings-schema.ts');
const CANONICAL_AUTHORITY_MANIFEST = resolve(REPOSITORY_ROOT, 'services/api/src/room-settings-manifest.json');

/*
  Eleven consumed by this repository's room-login page, NINETY-THREE by the room application
  through `internal/room-config/[code]`, ONE by the room but only for a presenter, and six by the
  WordPress SSO door at `(public)/sso/[code]`. `allowUsersToChangeUsername` is on the first two
  lists, and so now are `showPasswordField`, `usernameInstructions` and `hasRequiredPhoneInLogin`,
  so the union is 120.

  113 -> 120 on 2026-09-03: `isNewIndicatorOn`, `recsInRoom`, `recordChat`, `enableDiscord`,
  `linkedRoomAlerts`, `clusterID` and `backupClusterID`. Each now has a server-side policy decision
  or deployment resolver and a visible consumer: the
  presenter-only New badge, authorized recording catalog/transcript, Discord account linking, and
  same-account linked-room alert dispatch respectively. Media-cluster selectors are control-plane
  consumers and never cross to an untrusted browser.

  112 -> 113 on 2026-09-03: openLoginLink, the operator's own page opened once as a member enters
  (bundle bytes 1,437,913 and 2,384,175). It came off `audit-setting-coverage.mjs`'s own list of
  nineteen settings the reference reads in its browser and this room did not, and it was the ONLY
  one of the nineteen that was work. Of the other eighteen: seven are the credentials that stay on
  the controller by design, four are blocked on a host or a service that does not exist here, three
  are answered by another mechanism, one is blocked on an owner answer, and THREE ARE UNREACHABLE
  UPSTREAM - advancedSearchAlerts is gated on a hardcoded owner id, h264Enabled is read as
  `sessData.h264Enabled || !0` so the setting cannot change the value it feeds, and
  playChatMessageSoundFor is a declared refusal (hashing happens server-side upstream, and shipping
  raw member emails to every browser to decide a sound is the wrong trade).

  111 -> 112 on 2026-09-02: isLocked, and it is a LIAR closed rather than a feature added. The room's
  Lock Session tab has three buttons that wrote sessionLocked and sessionLockKick into the clicking
  presenter's own settings blob - both keys with ZERO readers anywhere in apps/room/src - and raised
  the capture's "Session Locked" over a door that never closed. It is also the SECOND setting the
  room may write back; decideRoomEntry has enforced it at the guest door all along.

  106 -> 111 on 2026-09-02: altGenChannelName, altOffTopicChannelName, hasAdminOnlyChannel,
  extraAdminChannels and extraRegChannels — FIVE names and ONE find. They are the rest of the six
  settings that feed `processSessData`'s tab expression; `hasChannelTabs` crossed alone on 08-31
  because it was the one that was a live defect. A subset of the six describes a room the reference
  cannot be in, and building them was a channel-MODEL change rather than five more pushes: the
  reference gives every tab a type and has three where this room had one.

  105 -> 106 on 2026-09-02: smallerImagePreview, the last row of the settings enumeration that was
  answered NOT A GAP rather than built. The premise was re-measured and was wrong — the pair it
  seeds is a one-shot latch, not a dead duplicate — and the half that stood (a class with no rule
  anywhere) is answered by the `btn-ligth` precedent rather than by holding the row. `room-config.ts`
  carries the whole argument at the entry.

  103 -> 104 on 2026-08-30: restreamToURL, and it is the first entry that does NOT cross to every
  member. It rides a FOURTH generator list, ROOM_PRESENTER_CONSUMED, mirroring the third allow-list
  in src/lib/room-config.ts: an rtmp destination usually carries its own stream key inline, so it is
  projected only to a member internal/room-config has already decided is the owner or a true
  presenter. The reference reads it from globals.sessData.restreamToURL, which every viewer
  receives; the divergence is deliberate. It came from the room-surface audit rather than the
  settings enumeration - SC-12, the textarea that never seeded, and SC-13, the write that went to a
  per-viewer preference nothing read.

  89 -> 90 on 2026-08-28: hasAlertScheduler. The last buildable row of the settings enumeration, and
  the third blocker in a day that named the wrong obstacle: the scheduler does not need the Rust
  crate, it needs a long-lived process, and the room already is one because it cannot be serverless.

  87 -> 89 on 2026-08-28: autoRecord and dontStopRecOnMicMute. ONE feature and two settings, crossing
  together because the second is inert without the first - autoRecord gates the stop as well as both
  starts. Filed BLOCKED on a server-side recorder that this room deliberately does not have and does
  not need: it records in the browser, so the settings had something to drive all along.

  86 -> 87 on 2026-08-28: alertsOverlayOnScreenshare. The first on this list that changes the BYTES
  ON THE WIRE rather than the DOM: a canvas is spliced between the display capture and the producer,
  so the alerts are burned into the frames every member receives and into any recording of them. It
  is room policy for that reason - one presenter ticking it changes what everybody else sees.

  85 -> 86 on 2026-08-28: altChatRender. The compact log, and the room had no compact renderer at
  all — two of the setting's three behaviours had nothing to act on until one existed.

  84 -> 85 on 2026-08-28: chatTabsWithBadges. Extra chat channels behind badges. The room decides who
  sees which on the SERVER — the reference decides it in the browser against a list the browser holds
  — so the raw JSON crosses and the ENTITLEMENT never does.

  83 -> 84 on 2026-08-28: enableQAReactions. A CORRECTION rather than a new gate — the rule was
  already transcribed in `message-behavior.ts` and could never evaluate true, because the Q&A thread
  rendered its rows as chat behind an `onaction` that did nothing. Decided on the server too:
  `reactToQuestion` refuses when the room did not enable it.

  82 -> 83 on 2026-08-28: hasTypingIndicator. It gates the SEND as well as the display — a room
  without it must not have members broadcasting their keystroke state to each other, which a
  display-only gate would leave happening.

  81 -> 82 on 2026-08-28: usersCanDeleteOwnMsgs. The first setting on this list that crosses to CLOSE
  a hole rather than to draw a control — the room's delete endpoint already permitted a member to
  remove their own message and never asked whether the room allowed it.

  79 -> 81 on 2026-08-28: positionsIframe and positionsIframeUrl — ONE feature. The second pair here
  whose gate is a conjunction, after the tip button, and they cross together for the same reason: the
  switch without a URL draws a button that opens an empty panel.

  78 -> 79 on 2026-08-28: copyTrades, which turns a bracketed order inside an ALERT into one click
  to copy. It reaches the message through `buildMessageChrome` rather than per call site, because
  three components render a message and a setting handed to each separately is one that a component
  will stop being handed.

  77 -> 78 on 2026-08-28: customPlayerURL, which replaces the room's whole screens pane with an
  owner-supplied iframe. Checked in the room for scheme, which the reference explicitly is not — its
  binding runs through `bypassSecurityTrustResourceUrl`.

  75 -> 77 on 2026-08-28: customFaviconURL and customCSS. They cross together because the reference
  applies them on the same line, and the second is the first setting on this list whose value is
  CODE the owner writes and every member's browser runs.

  72 -> 75 on 2026-08-28: tipMeBtnEnabled, tipMeBtnUrl and tipMeBtnTxt — ONE feature. They cross as
  a group because the gate is their conjunction, and a settings list that lets them cross separately
  is a list that will one day let two of the three across.

  71 -> 72 on 2026-08-28: showOnlyUsernames, which decides the SHAPE of a roster row. It joins the
  other roster gates in `roster-gates.ts` rather than being an inline condition, for the reason that
  module's header gives: these are the predicates that decide what one member sees of another.

  70 -> 71 on 2026-08-28: enablePrivateMessageHistory. The first setting to cross that widens a READ
  rather than a rendering — a presenter sees one member's private conversations with everybody — so
  the room checks it on the SERVER, from the control plane, before selecting a row.

  69 -> 70 on 2026-08-28: simplifiedEditor, which picks one of two Summernote toolbar button names
  for the note editor's colour control. The FIRST setting to cross whose downstream vendor is not in
  the capture at all, so what crosses is the decision and not a transcription of markup; the room
  records that distinction at `notes/note-gates.ts` rather than letting it read as evidenced.

  55 -> 58 on 2026-08-28: darkThemeAsDefault, alertSoundOff and alertsChatOnBottom, the three room
  defaults that seed a member's own preferences once. Three clauses of one expression upstream, so
  they crossed together; the latch that keeps a default from becoming an override lives in the room.

  58 -> 59 on 2026-08-28: dontShowRecInfoToUsers, the room half of the [ REC ] tooltip. A correction
  rather than a feature — the gate existed and read a viewer preference nothing writes.

  54 -> 55 on 2026-08-28: hideNotes, the Notes tab's gate. Its two siblings `hideFiles` and
  `hideRecs` crossed on 2026-08-14 and this one did not; the settings enumeration found it, not a
  feature. See the note at the foot of the generator.

  53 -> 54 on 2026-08-15: recordingReminder, the POLICY half of the reminder banner. The name is
  shared upstream by a room setting and a local runtime flag, and the gate at bundle byte 2,477,770
  requires both. The room had the local flag and the banner already; without the setting an owner
  could not turn the reminder off at all.

  49 -> 53 on 2026-08-15: usersPublicReply, enableReactions, enableEditMessage and
  enableEditAlerts joined together. RoomMessage.svelte already implemented all four gates and the
  page never passed them, so each defaulted false and the feature was unreachable however the owner
  configured the room. Wiring the value was the whole fix.

  48 -> 49 on 2026-08-15: `alertLabels` joined with Alert Labels — the SECOND non-boolean entry, a
  string containing JSON holding name, hash, color and bgcolor objects, parsed at bundle byte
  1,147,290. Unlike the gate below it this one is a render input: every byte of the badge is a value
  the owner typed, so there is nothing to default from, and a room that configures none simply
  renders the hash as ordinary text.

  47 -> 48 on 2026-08-15: `modAlertFilterList` joined with the Alert Filter, and it is the FIRST
  entry on this list that is not a boolean gate — a string containing JSON, a list of username and
  avatar pairs, parsed at bundle byte 1,221,905. The reference gates the whole feature on it being
  truthy, so a room that configures no list has no entry point and no modal.

  This sentence is checked. `sso-boundary.test.ts` asserts the prose here states the same total the
  code computes, which is why the number appears in words and digits and both had to change. That
  guard exists because a comment claiming a count is exactly the kind of thing that goes stale
  silently and then gets quoted as fact.

  46 -> 47 on 2026-08-15: `hasDayTradeAlerts` joined with the Day Trade Alerts pane, one step after
  its Swing twin. One flag is the whole feature again — the nav item, the pane, the initial log
  fetch and all three mutations collapse to nothing without it. Its sibling
  `linkedRoomDayTradeAlertsOther` stays unwired for the same reason the Swing one does. Note the
  spelling: the Swing flag doubles the word and this one does not, which is upstream's asymmetry and
  is confirmed read at bundle bytes 1,009,430 and 1,009,503.

  45 -> 46 on 2026-08-15: `hasSwingTradeAlerts` joined with the Swing Trade Alerts pane. One flag is
  the whole feature — the nav item, the pane and the initial log fetch all collapse to nothing
  without it. Its sibling `linkedRoomSwingAlertsOther` stays unwired deliberately: it redirects the
  log fetch at another room, and the room takes its room from the session row so that nothing the
  browser can reach names the room being read.

  43 -> 45 on 2026-08-14: `useMediaMTX` and `overlayUserIdOnScreenshare` joined with the Streams
  pane. The first IS the Streams tab — the room derives `hideStreams` by negating it and hides both
  the tab and the pane on that one value — and the second gates the viewer id printed over the
  video for non-presenters.

  (Forty-three and 56 since 2026-08-14: the room gained its OWN login page — the reference always
  renders `app-session-login` and never auto-submits — and the five settings that drive it now
  cross: `showPasswordField`, `usernameInstructions`, `hasRequiredPhoneInLogin`,
  `customEnterDisclosure`, `disableEditingUsername`. Three were already on the login list, so the
  union moved by two while ROOM_CONSUMED moved by five. `webinarPW` is NOT among them and that is
  evidence, not caution: it appears nowhere in the room bundle, because the reference posts the
  typed password to its server. `banIPList` is not among them either, and that one IS a deliberate
  narrowing — the reference ships it and checks it in the browser.)

  (Thirty and 46 as of 2026-08-12: `hideChatAlerts`, `isChatOnlyRoom` and `disableCopy` reached the
  room when it gained the gates that read them — the chat/alerts column, the presentation column,
  and the copy/right-click restriction on non-presenters.)

  (Thirty-seven and 53 since 2026-08-14: `enableBadges`, `showBadgesToPresentersOnly` and
  `disableStarYears` reached the room in the same change that gave chat badges a SUPPLY. They had
  been held out on purpose while `item.badges` was empty, because `ROOM_VISIBLE_SETTINGS` requires a
  consumer and a gate with nothing to gate is not one.)

  (Thirty-eight and 54 since 2026-08-14: `enableRTE` reached the room with the chat rich text
  editor. It is the OWNER's term in a three-way gate — `sessData.enableRTE &&
  preferences.enableRTE && isPresenter` — so it is a genuine per-room policy rather than something
  the room could infer, and all FOUR edits were made in the same change again.)

  (Thirty-four and 50 since 2026-08-14: `presenterMsgsOnTheRight` reached the room when
  `RoomMessage.svelte` was finally fed the two consumers it had carried unused since it was written
  — `presenter-msg-right` and `presenter-reactions-right`. All FOUR edits were made in the same
  change this time, which is what the paragraph below was written to prevent being forgotten.
  Its three manage-page neighbours — `enableBadges`, `showBadgesToPresentersOnly`,
  `disableStarYears` — are deliberately NOT here: nothing populates `item.badges` or
  `item.membershipYears`, so they would cross the boundary for nothing.)

  (Thirty-three and 49 since 2026-08-13: `beepOnUserJoin`, `userJoinAndLeavePopup` and
  `tawkPresenterSupport` reached the room with the join/leave notification and Tawk support work.
  They were added to `ROOM_CONSUMED` and to `ROOM_VISIBLE_SETTINGS` at the time, but not to this
  note and not to the `consumers` map in `src/lib/room-config-boundary.test.ts` — so BOTH of those
  assertions sat RED until 2026-08-13, when the whole `src/lib` suite was run rather than just the
  tests touching the change in hand. Adding a setting is FOUR edits, not two: the two lists, this
  note, and the map that says why.)
  Kept as one flat list so a drift shows up as a diff here rather than as a category argument.

  (Two copies of this note used to sit here, one of them stale at "twelve". A count that appears
  twice is a count that goes wrong once. It went wrong a third time on 2026-08-10: the SSO door
  wired six settings and this list — a THIRD copy of the wired set, and the only one that cannot
  run in this repository because it needs `evidence-dumps/` — was left at 35. It was found by
  auditing rather than by failing, which is precisely the problem with a gate that cannot run.
  `sso-boundary.test.ts` now reads this list too, so the next omission fails in vitest instead.)
*/
const EXPECTED_WIRED_SETTINGS = [
  'presenterMsgsOnTheRight',
  'enableBadges',
  'showBadgesToPresentersOnly',
  'disableStarYears',
  'enableRTE',
  'customEnterDisclosure',
  'disableEditingUsername',
  'allowUsersToChangeUsername',
  'allowedMemberships',
  'allowedPerms',
  'allowedProducts',
  'altBenzingaLinkURL',
  'altBenzingaLogoURL',
  'claimNickName',
  'customMobileAppAndroidUrl',
  'customMobileAppEnabled',
  'customMobileAppIOSUrl',
  'dingOnNewMessage',
  'disableCopy',
  'disablePMForTrials',
  'freeTrialsGetApp',
  'beepOnUserJoin',
  'hasBenzingaNews',
  'hasRequiredPhoneInLogin',
  'hideAppInfo',
  'hideAvatars',
  'hideChatAlerts',
  'hideChatLog',
  'hideFiles',
  'hideMobileCredentials',
  'hideNotes',
  /*
    Added 2026-08-28: the three ROOM DEFAULTS, which cross together because upstream they are three
    consecutive clauses of one expression in `loadSessionData` (bytes 1,149,414 / 1,149,637 /
    1,149,866). Each seeds a per-viewer preference the FIRST time a member arrives and latches
    itself so it never becomes an override. The latch lives in the room — which member has already
    been given a default is a fact about that member, not about the room — in
    `apps/room/src/lib/room/room-defaults.ts`, with its negative controls beside it.
  */
  'darkThemeAsDefault',
  'alertSoundOff',
  'alertsChatOnBottom',
  /* Added 2026-08-28: the room half of the REC-indicator tooltip, which was reading a viewer
     preference nothing writes. See `room-config.ts`. No apostrophe and no closing square bracket in
     comments inside this array — `sso-boundary.test.ts` extracts these names the same way
     `room-config-boundary.test.ts` extracts the generator list, and either character breaks it. */
  'dontShowRecInfoToUsers',
  /* Added 2026-08-28: the third reason the chat composer is off. See `room-config.ts`. */
  'chatDisabledForTrials',
  /* Added 2026-08-28: the Q and A entitlement on alerts. See `room-config.ts`. */
  'hasQAOnAlerts',
  /* Added 2026-08-28: the sidebar seed and the captions entitlement. See `room-config.ts`. */
  'alwaysShowRoster',
  'hasSpeechRecognitionDisabled',
  /* Added 2026-08-28: the webcam OFF switch and the breathing REC badge. */
  'hideWebcamForRoom',
  'blinkingRec',
  /* Added 2026-08-28: the off-topic channel seed and the sticky non-trade checkbox. */
  'autoSwitchToOfftopics',
  'styckyNonTradeAlert',
  /* Added 2026-08-28: the room title and the presenter-only moderator bar. */
  'name',
  'modMessage',
  /* Added 2026-08-28: the note editor colour button. NO APOSTROPHES IN THIS BLOCK - the parser that
     reads this list is a single-quote regex, and one closes the string. */
  'simplifiedEditor',
  /* Added 2026-08-28: the moderation read behind the user-info modal. */
  'enablePrivateMessageHistory',
  /* Added 2026-08-28: which shape a roster row draws in. */
  'showOnlyUsernames',
  /* Added 2026-08-28: the tip button. Three settings, one conjunction. */
  'tipMeBtnEnabled',
  'tipMeBtnUrl',
  'tipMeBtnTxt',
  /* Added 2026-08-28: the room own favicon and stylesheet. */
  'customFaviconURL',
  'customCSS',
  /* Added 2026-08-28: the owner own iframe in place of the screens pane. */
  'customPlayerURL',
  /* Added 2026-08-28: the click-to-copy order marker in an alert. */
  'copyTrades',
  /* Added 2026-08-28: the positions panel and its URL. */
  'positionsIframe',
  'positionsIframeUrl',
  /* Added 2026-08-28: member self-delete, enforced on the server. */
  'usersCanDeleteOwnMsgs',
  /* Added 2026-08-28: the typing indicator, which gates the send too. */
  'hasTypingIndicator',
  'hidePoweredBy',
  'hideRecs',
  'hideWelcomeTo',
  'individualVolumeControls',
  'userJoinAndLeavePopup',
  'isChatOnlyRoom',
  'loginErrorMsg',
  'loginErrorURL',
  'nickFilter',
  'onlyPresentersVisibleToViewers',
  /* 2026-09-03 — the operator's own page, opened once as a member enters. Bundle bytes 1,437,913
     and 2,384,175; one consumer, `lib/room/open-login-link.ts`, from the page's onMount. */
  'openLoginLink',
  'overwriteCashRegisterSound',
  'ptrMobileAppEnabled',
  'rosterCountVisibleToViewers',
  'rosterVisibleToViewers',
  'showArchivesToSpecificPresenters',
  'showArchivesToUsers',
  'tawkPresenterSupport',
  'showPasswordField',
  'simUserCount',
  'ssoJWTSecret',
  'userPM',
  'userToPresenterPM',
  'userUploads',
  'tokenExpiresIn',
  'usernameInstructions',
  'webinarPW',
  /*
    Added 2026-08-14 with the Streams pane. `useMediaMTX` is the whole Streams tab — the reference
    derives `hideStreams` by negating it and hides both the main-tab item and the pane on that one
    value. `overlayUserIdOnScreenshare` gates the viewer id printed over the video for
    non-presenters. The two MediaMTX cluster ids are now consumed by the controller failover
    resolver and remain absent from the browser boundary.
  */
  'useMediaMTX',
  'overlayUserIdOnScreenshare',
  /*
    Added 2026-08-15 with the Swing Trade Alerts pane. One flag IS the feature: the nav item, the
    `#swingAlerts` pane, the initial `getSwingAlertsLog` read and all three mutations are gated on
    it, and a room without it renders no markup at all rather than hidden markup.

    `linkedRoomSwingAlertsOther` stays unwired beside it, deliberately: upstream it redirects the
    log fetch at ANOTHER room, and this room takes its room from the session row so that nothing the
    browser can reach names the room being read.
  */
  'hasSwingTradeAlerts',
  /*
    Added 2026-08-15 with the Day Trade Alerts pane, one step after the Swing one. One flag IS the
    feature again: the nav item, the `#dayTradeAlerts` pane, the initial `getDayTradeAlertsLog` read
    and all three mutations are gated on it, and a room without it renders no markup at all rather
    than hidden markup.

    Note the spelling. The Swing flag doubles the word and this one does not; both are read side by
    side in the reference bundle at bytes 1,009,430 and 1,009,503.

    `linkedRoomDayTradeAlertsOther` stays unwired beside it for the same reason its Swing twin does:
    upstream it redirects the log fetch at ANOTHER room, and this room takes its room from the
    session row so that nothing the browser can reach names the room being read.
  */
  /*
    Added 2026-08-31, and it is a DEFECT closed rather than a feature wired.

    The reference builds its whole tab strip in one expression (bundle bytes 1,146,625-1,147,200) and
    only `main` is unconditional there; Off Topic sits behind this flag. This room shipped both
    built-ins unconditionally, so a room whose owner had switched Off Topic off still showed it — a
    control nobody asked for, which is the mirror of the dead-control rule.

    Never argued, never noticed: zero occurrences anywhere in `apps/room/src`. Found by widening
    `audit-setting-coverage.mjs`, whose `sessData.<name>` rule returns zero for the six settings the
    reference reads inside `processSessData`, while the object is still the minifier's own local.

    ABSENT MEANS TRUE, decided once in `chat-tabs.ts`: the captured default is on, and reading
    absence as false would take the tab from every room that has never stored the setting.
  */
  'hasChannelTabs',
  'isLocked',
  'altGenChannelName',
  'altOffTopicChannelName',
  'hasAdminOnlyChannel',
  'extraAdminChannels',
  'extraRegChannels',
  'hasDayTradeAlerts',
  /*
    Added 2026-08-15 with the Alert Filter. Not a boolean gate like its neighbours: a STRING
    CONTAINING JSON, an array of {username, avatar}, which the reference parses at bundle byte
    1,221,905 with no try/catch. The whole feature is gated on it being truthy, so a room that
    configures no list has no entry point and no modal.
  */
  'modAlertFilterList',
  /*
    Added 2026-08-15 with Alert Labels. The fourth setting shipped as a string containing JSON,
    parsed by the room at bundle byte 1,147,290; the parseSymbols transform at byte 1,326,855 turns
    the first occurrence of each configured hash into a coloured badge, on the ALERTS log only.

    It crosses because every rendered byte of the badge - the text and both colours - is a value the
    owner typed, with nothing to default from.
  */
  'alertLabels',
  'alertsOverlayOnScreenshare',
  'hasAlertScheduler',
  'autoRecord',
  'dontStopRecOnMicMute',
  'altChatRender',
  'chatTabsWithBadges',
  'usersPublicReply',
  'enableReactions',
  'enableQAReactions',
  'enableEditMessage',
  'enableEditAlerts',
  'recordingReminder',
  /*
    Added 2026-09-02 with USM-18, the last row of the settings enumeration that had been answered
    NOT A GAP rather than built. `smallerImagePreview` is a one-shot seed: the room default is
    pushed into the member own `smallImagePreview` exactly once and a persisted latch stops it ever
    re-applying, so a member who turns the preview off is not overridden on their next load. The
    argument for crossing it, including why a class with no rule in any stylesheet is transcribed
    rather than corrected, is at its entry in `src/lib/room-config.ts`.
  */
  'smallerImagePreview',
  'clusterID',
  'backupClusterID',
  'linkedRoomAlerts',
  'enableDiscord',
  'recordChat',
  'recsInRoom',
  'isNewIndicatorOn',
  /*
    Added 2026-08-30 with SC-12 and SC-13 of the room-surface audit, and it is the FIRST wired
    setting that does not cross to every member.

    `restreamToURL` goes over ROOM_PRESENTER_SETTINGS — a third allow-list on `room-config.ts`,
    projected by the `internal/room-config` endpoint only for a member it has already decided is
    the owner or a true presenter. An rtmp destination usually carries its own stream key inline
    (rtmp://a.rtmp.youtube.com/live2/<KEY>) and the reference's own validator accepts exactly that
    string, so putting it on the list every viewer receives would have published it in the SSR
    payload of every page load. The reference does read it from `globals.sessData.restreamToURL`;
    the divergence is deliberate and argued where the list is defined.

    Also the SECOND setting the room WRITES back. Its pane's Set/Clear buttons called
    `onPreferenceChange('restreamToURL', ...)` — this viewer's own preference row — and nothing
    anywhere read it, so the room restreamed nowhere while the pane showed the value back.
  */
  'restreamToURL'
].sort();

const fail = (message) => {
  throw new Error(message);
};

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const tempDirectory = mkdtempSync(join(tmpdir(), 'proroom-schema-verify-'));

try {
  const firstPath = join(tempDirectory, 'first.ts');
  const secondPath = join(tempDirectory, 'second.ts');
  const firstManifestPath = join(tempDirectory, 'first.json');
  const secondManifestPath = join(tempDirectory, 'second.json');

  execFileSync(process.execPath, [GENERATOR, '--out', firstPath, '--manifest-out', firstManifestPath], {
    cwd: REPO_ROOT,
    stdio: 'pipe'
  });
  // Prove extraction is independent of the caller's working directory and of a
  // pre-existing generated output file.
  execFileSync(process.execPath, [GENERATOR, '--out', secondPath, '--manifest-out', secondManifestPath], {
    cwd: tempDirectory,
    stdio: 'pipe'
  });

  const first = readFileSync(firstPath);
  const second = readFileSync(secondPath);
  if (!first.equals(second)) {
    fail(`schema generation is nondeterministic (${digest(first)} != ${digest(second)})`);
  }
  const firstManifest = readFileSync(firstManifestPath);
  const secondManifest = readFileSync(secondManifestPath);
  if (!firstManifest.equals(secondManifest)) {
    fail(`authority manifest generation is nondeterministic (${digest(firstManifest)} != ${digest(secondManifest)})`);
  }

  const generated = first.toString('utf8');
  if (
    !generated.includes('// 268 room settings extracted from the reference controller.\n') ||
    !generated.includes('// 1 reviewed product deviation (roomType) is added; 269 settings total.\n')
  ) {
    fail('generated schema does not declare the 268 extracted + 1 reviewed = 269 contract');
  }

  const definitions = [...generated.matchAll(/^\s*\{ name: "([^"]+)".* wired: (true|false) \},?$/gm)].map((match) => ({
    name: match[1],
    wired: match[2] === 'true'
  }));
  if (definitions.length !== 269) {
    fail(`expected 269 generated definitions; found ${definitions.length}`);
  }

  const uniqueNames = new Set(definitions.map((definition) => definition.name));
  if (uniqueNames.size !== 269) {
    fail(`expected 269 unique setting names; found ${uniqueNames.size}`);
  }

  const wired = definitions
    .filter((definition) => definition.wired)
    .map((definition) => definition.name)
    .sort();
  if (JSON.stringify(wired) !== JSON.stringify(EXPECTED_WIRED_SETTINGS)) {
    fail(`wired settings drifted: ${wired.join(', ') || '(none)'}`);
  }

  const roomType = definitions.filter((definition) => definition.name === 'roomType');
  if (roomType.length !== 1) {
    fail(`reviewed roomType deviation must occur exactly once; found ${roomType.length}`);
  }

  const canonical = readFileSync(CANONICAL_SCHEMA);
  if (!canonical.equals(first)) {
    fail(`generated schema is stale (${digest(canonical)} != ${digest(first)}); run pnpm schema:extract`);
  }
  const canonicalManifest = readFileSync(CANONICAL_AUTHORITY_MANIFEST);
  if (!canonicalManifest.equals(firstManifest)) {
    fail(
      `generated authority manifest is stale (${digest(canonicalManifest)} != ${digest(firstManifest)}); ` +
        'run pnpm schema:extract'
    );
  }

  /*
    ── EVERY DOCUMENT THAT STATES THE WIRED COUNT STATES THE RIGHT ONE ─────────────────────────────

    ## What this is for

    `wired.length` is pinned above against `EXPECTED_WIRED_SETTINGS`, so the SCHEMA cannot drift
    unnoticed. Five documents also quote the number in prose, and on 2026-08-29 four of them were
    measured for the first time in months:

      apps/controller/README.md          "33 of 269 settings are wired … the other 257"
      apps/controller/docs/OUTSTANDING.md "only 33 of 269 settings have a consumer"
      apps/controller/docs/ARCHITECTURE.md "Current state: 33 of 269 wired; 236 unwired"
      docs/decoded/admin-surface.md       "58 of 269 are wired. 211 are not." + all 58 names
      v5.md                               quoting OUTSTANDING.md's 33

    The real number was 103. The README's was worse than stale — 33 + 257 is 290, so its arithmetic
    never described a 269-setting schema at all, on any day.

    The direction of the error is what makes it worth a gate rather than a correction: every one of
    them UNDERSTATED the work. A reader of the controller's own README was told a third of the
    shipped settings worked. "Current state:" in ARCHITECTURE.md is precisely the sentence that is
    read as current by definition, and precisely the one nothing was checking.

    ## Why here

    This script already computes `wired.length` and already fails on drift. Checking the prose costs
    one read per file and puts the assertion where the number is known, rather than in a test that
    would have to re-derive it — which is how two sources of one truth start disagreeing.
  */
  const COUNT_CLAIMS = [
    'apps/controller/README.md',
    'apps/controller/docs/OUTSTANDING.md',
    'apps/controller/docs/ARCHITECTURE.md',
    'docs/decoded/admin-surface.md',
    'v5.md',
    /*
      `TODO.md` joined on 2026-08-29, and how it was missed is the reason it is worth a note.

      The first pass of this check found five documents by searching for the phrasings it already
      knew — "N of 269", "N wired" — and corrected all five. `TODO.md:206` states the same property
      in a SIXTH phrasing, *"marks 170 of them `wired: false`"*, which none of those patterns match,
      and it was found only when a separate audit read the trackers by hand.

      That is the failure mode of a pinned list of sites: it grows by whoever notices, and what
      nobody notices stays unpinned. The list is still the right shape — the alternative is a
      repo-wide number hunt with a false-positive rate the "20 of 269" incident already measured —
      but it earns this paragraph, because the next stale count will be in a seventh file phrased a
      seventh way.
    */
    'TODO.md'
  ];

  /**
   * A document's LIVE text — every line that is not a Markdown blockquote.
   *
   * SUPERSEDED NUMBERS LIVE IN A BLOCKQUOTE, and that convention is load-bearing rather than
   * stylistic. Correcting these five documents also recorded what each had said before, and two of
   * those notes necessarily quote the old numbers — *"33 of 269 … the other 257"*, *"33 wired; 236
   * unwired"*. The checks below found them on their first run and failed, correctly by their own
   * rule and wrongly in substance: a history note is not a claim about today.
   *
   * The alternative was to loosen the checks until the old numbers slipped through, which would have
   * loosened them for a genuinely stale number too. A blockquote is instead a mark a READER also
   * sees — the sentence is visibly quoted as former — so one convention serves both audiences, and
   * the gate stays exact.
   */
  const liveText = (text) =>
    text
      .split('\n')
      .filter((line) => !/^\s*>/.test(line))
      .join('\n');

  /**
   * The same text with every run of whitespace collapsed to one space, for PHRASE matching only.
   *
   * These files wrap prose at 100 columns, so a phrase can straddle a newline: the controller
   * README's own sentence is `The other\n166 entries remain`. The phrase patterns below matched a
   * literal space, so that claim was invisible to them — found because its negative control FAILED
   * TO FIRE, which is the only reason the hole was caught rather than shipped. A phrase check over
   * wrapped Markdown must never depend on where the wrap happens to fall.
   *
   * Kept SEPARATE from `liveText` rather than replacing it: the roster parse below is anchored on
   * blank lines and a trailing `.\n`, and collapsing whitespace made it unparsable — which the run
   * after that change said in as many words. One transform per question.
   */
  const livePhrases = (text) => liveText(text).replace(/\s+/g, ' ');

  for (const relative of COUNT_CLAIMS) {
    const path = resolve(REPOSITORY_ROOT, relative);
    const text = livePhrases(readFileSync(path, 'utf8'));
    /*
      "<n> of 269" WHERE THE WORD `wired` IS NEARBY, and the narrowing was measured rather than
      chosen.

      A first version matched every "<n> of 269" in the file, on the argument that a claim added
      lower down should be covered on the day it is added. Its first run failed on
      `docs/ARCHITECTURE.md:88` — *"They overlap on 20 of 269 settings"* — which is a DIFFERENT
      statistic, about settings two components both write, and had nothing to do with wiring. A gate
      that reports a correct sentence as a defect is worse than no gate: it teaches whoever meets it
      to widen the exemption rather than read the finding.

      So the window is required to mention `wired`. The cost is stated rather than hidden: a wiring
      claim phrased without that word is not caught. That is the right side to err on here, because
      every one of the five real claims uses it, and a missed claim is a stale sentence while a false
      one is a broken build.
    */
    /*
      `Math.max(0, …)` AND NOT A BARE SUBTRACTION, because `String.prototype.slice` counts a negative
      start FROM THE END.

      A claim in the first 120 characters of a document — a title line, a lead sentence, a summary
      block someone moves to the top — gives `match.index - 120 < 0`, and `slice` then reads a window
      out of the document's TAIL. For every file in `COUNT_CLAIMS` today that tail window is shorter
      than the end offset, so the slice is the empty string, `/wired/` does not match it, and the
      claim is dropped from `claims` without a word. The gate would go green over a stale number
      because of where the sentence sits on the page.

      Nothing is in that window right now — all six documents were measured on 2026-09-01 and none
      has a `<n> of 269` inside its first 120 characters — so this is a hole rather than a live
      failure, and it is the kind that opens the day somebody reorganises a README. The control was
      run both ways: a stale `33 of 269 wired` inserted at the top of `apps/controller/README.md`
      passed under the bare subtraction and fails under this.
    */
    const claims = [...text.matchAll(/(\d+)(?: of| \/) 269/g)]
      .filter((match) => /wired|have a consumer/i.test(text.slice(Math.max(0, match.index - 120), match.index + 160)))
      .map((match) => Number(match[1]));
    const wrong = claims.filter((claimed) => claimed !== wired.length);
    if (wrong.length > 0) {
      fail(
        `${relative} states "${wrong.join(' of 269", "')} of 269" but ${wired.length} settings are wired. ` +
          `This paragraph is read as the current state; correct it rather than this check.`
      );
    }
  }

  /*
    THE UNWIRED HALF, AND THE ROSTER — both added 2026-08-29, in the same hour as the check above,
    because a duplication audit of that check found it had reproduced the defect it was fixing.

    Correcting the five documents wrote a SECOND number beside the first in four of them — "the other
    166 entries", "the remaining 166", "166 unwired", "166 are not" — and the check above matches only
    `<n> of 269`, so none of those was guarded. Wire a 104th setting and every one of them would read
    "104 of 269 … the other 166": the guarded half moves, the unguarded half does not, and the
    paragraph is wrong in a new way. That is the same shape as the drift being repaired, introduced by
    the repair.

    `docs/decoded/admin-surface.md` additionally lists every wired setting BY NAME. A count check
    forces that paragraph to be edited when the count moves, but nothing made the edit correct, so the
    roster is compared against `EXPECTED_WIRED_SETTINGS` element by element.
  */
  const unwired = 269 - wired.length;

  for (const relative of COUNT_CLAIMS) {
    const path = resolve(REPOSITORY_ROOT, relative);
    const text = livePhrases(readFileSync(path, 'utf8'));
    /*
      The four phrasings actually used, named rather than generalised. A loose "any number near the
      word unwired" would sweep in `hasSwingTradeAlerts`'s row number 1166 from the manage-page table
      in `admin-surface.md`, which is a row id and not a count — measured, on this check's first run.
    */
    const stated = [
      ...text.matchAll(/(?:the other|the remaining) (\d+) entries?/gi),
      ...text.matchAll(/(?:the other|the remaining) (\d+) are/gi),
      ...text.matchAll(/(\d+) unwired/gi),
      ...text.matchAll(/(\d+) are not\.\*\*/gi),
      // `TODO.md:206`'s phrasing: "marks **166** of them `wired: false`".
      ...text.matchAll(/marks \*?\*?(\d+)\*?\*? of them `?wired: false/gi)
    ].map((match) => Number(match[1]));
    /*
      CASE-INSENSITIVE, because prose starts sentences. Both surviving phrasings begin one — *"The
      other 166 entries remain"*, *"The remaining 166 are stored"* — and with `/g` alone neither
      matched, so two of this block's four patterns guarded nothing. Found the same way as the line
      break above: their negative controls did not fire. Two holes in one small block, both invisible
      to a run that passes, is the argument for controlling every pattern separately rather than
      once for the block.
    */

    const wrong = stated.filter((claimed) => claimed !== unwired);
    if (wrong.length > 0) {
      fail(
        `${relative} states ${wrong.join(', ')} unwired but 269 - ${wired.length} = ${unwired}. ` +
          `The wired half of this sentence is checked; this is the half beside it.`
      );
    }
  }

  /*
    The roster in `admin-surface.md`, compared name by name. Alphabetical because that is how it is
    written there, and because a roster in schema order would silently reorder on every regeneration.
  */
  const ROSTER_DOC = 'docs/decoded/admin-surface.md';
  const rosterText = liveText(readFileSync(resolve(REPOSITORY_ROOT, ROSTER_DOC), 'utf8'));
  const rosterBlock = /Wired \(\d+\), alphabetically:\n\n([\s\S]*?)\.\n/.exec(rosterText);
  if (!rosterBlock) {
    fail(`${ROSTER_DOC} no longer carries a parsable "Wired (n), alphabetically:" roster`);
  }
  const listed = [...rosterBlock[1].matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  const expected = [...EXPECTED_WIRED_SETTINGS].sort();
  if (JSON.stringify(listed) !== JSON.stringify(expected)) {
    const missing = expected.filter((name) => !listed.includes(name));
    const extra = listed.filter((name) => !expected.includes(name));
    fail(
      `${ROSTER_DOC}'s wired roster disagrees with EXPECTED_WIRED_SETTINGS` +
        (missing.length > 0 ? `; missing: ${missing.join(', ')}` : '') +
        (extra.length > 0 ? `; listed but not wired: ${extra.join(', ')}` : '') +
        (missing.length === 0 && extra.length === 0 ? '; same names, different order' : '')
    );
  }

  console.log(
    `wired-count prose verified in ${COUNT_CLAIMS.length} documents; ${unwired} unwired; roster of ${listed.length} names matches`
  );

  console.log(`room-settings schema verified: 268 extracted + 1 reviewed deviation = 269 total; ${wired.length} wired`);
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}
