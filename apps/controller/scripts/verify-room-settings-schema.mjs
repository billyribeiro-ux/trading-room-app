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
  Eleven consumed by this repository's room-login page, FORTY-THREE by the room application
  through `internal/room-config/[code]`, and six by the WordPress SSO door at `(public)/sso/[code]`.
  `allowUsersToChangeUsername` is on the first two lists, and so now are `showPasswordField`,
  `usernameInstructions` and `hasRequiredPhoneInLogin`, so the union is 56.

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
  'overlayUserIdOnScreenshare'
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
