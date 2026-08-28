#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const GENERATOR = resolve(SCRIPT_DIR, 'extract-manage-schema.mjs');
const CANONICAL_SCHEMA = resolve(REPO_ROOT, 'src/lib/room-settings-schema.ts');

/*
  Eleven consumed by this repository's room-login page, SIXTY-NINE by the room application
  through `internal/room-config/[code]`, and six by the WordPress SSO door at `(public)/sso/[code]`.
  `allowUsersToChangeUsername` is on the first two lists, and so now are `showPasswordField`,
  `usernameInstructions` and `hasRequiredPhoneInLogin`, so the union is 82.

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
    non-presenters. Their manage-page neighbours, the two MediaMTX cluster ids, stay unwired.
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
  'usersPublicReply',
  'enableReactions',
  'enableEditMessage',
  'enableEditAlerts',
  'recordingReminder'
].sort();

const fail = (message) => {
  throw new Error(message);
};

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const tempDirectory = mkdtempSync(join(tmpdir(), 'proroom-schema-verify-'));

try {
  const firstPath = join(tempDirectory, 'first.ts');
  const secondPath = join(tempDirectory, 'second.ts');

  execFileSync(process.execPath, [GENERATOR, '--out', firstPath], {
    cwd: REPO_ROOT,
    stdio: 'pipe'
  });
  // Prove extraction is independent of the caller's working directory and of a
  // pre-existing generated output file.
  execFileSync(process.execPath, [GENERATOR, '--out', secondPath], {
    cwd: tempDirectory,
    stdio: 'pipe'
  });

  const first = readFileSync(firstPath);
  const second = readFileSync(secondPath);
  if (!first.equals(second)) {
    fail(`schema generation is nondeterministic (${digest(first)} != ${digest(second)})`);
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

  console.log(`room-settings schema verified: 268 extracted + 1 reviewed deviation = 269 total; ${wired.length} wired`);
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}
