import { describe, expect, it } from 'vitest';
import { auditSettingCoverage } from '../../gate/audit-setting-coverage.mjs';

/**
 * The room settings the REFERENCE reads in its browser and this room does not.
 *
 * ## What this pins, and why it is names
 *
 * `room-settings-schema.ts` declares 269 settings and marks 202 of them `wired: false` — nothing in
 * this room reads them. That number alone says nothing, because most were never meant to reach a
 * room. The answerable question is narrower: which of the 202 does the reference's own room client
 * read? Fifty-eight, measured against the pinned v4 bundle.
 *
 * Pinned by NAME rather than by count, for the reason the command audit gives about itself: wiring
 * one setting while another quietly stops being read leaves the total unchanged, and the silent
 * direction is the one that has cost this repository three separate discoveries.
 *
 * ## ⚠️ NOT A BACKLOG — and here it is sharper than usual ⚠️
 *
 * **Five of these are CREDENTIALS the reference ships to every member's browser**, and this room
 * refuses to: `deleteAlertPW`, `banIPList`, `obsStreamKey`, `twillioApiSID` and `modAdminLoginList`.
 * `room-config-boundary.test.ts` asserts that no room-visible setting reads like a credential, and
 * `internal/room-entry` is the shape used instead — the credential stays on the controller and the
 * QUESTION travels. **Wiring any of those five would be a regression wearing an enumeration's
 * clothes**, and this paragraph exists so that the next person to read this list top-to-bottom knows
 * it before they start.
 *
 * Others are honoured under another mechanism, which is the false-gap rate that killed 7 of 34 claims
 * in the command triage. Only the rest are unbuilt work.
 *
 * ## How to change this list
 *
 * Remove a name when the room genuinely reads the setting — which is what wiring it does, and what
 * flips `wired` to `true` in the schema this reads. **Adding one is a conversation**: it means a
 * setting the room used to read no longer is.
 */
const REFERENCE_READS_AND_WE_DO_NOT: readonly string[] = [
  'deleteAlertPW',
  'enableQAReactions',
  'positionsIframe',
  'altChatRender',
  'smallerImagePreview',
  'tipMeBtnTxt',
  'allRoomsWelcomeMatPW',
  'autoRecord',
  'isNewIndicatorOn',
  'openLoginLink',
  'positionsIframeUrl',
  'authMode',
  'chatTabsWithBadges',
  'copyTrades',
  'darkThemeAsDefault',
  'enableDiscord',
  'hasAlertScheduler',
  'hasQAOnAlerts',
  'name',
  'playChatMessageSoundFor',
  'tipMeBtnUrl',
  'alertsOverlayOnScreenshare',
  'alwaysShowRoster',
  'autoSwitchToOfftopics',
  'chatDisabledForTrials',
  'customCSS',
  'customFaviconURL',
  'customPlayerURL',
  'description',
  'dontStopRecOnMicMute',
  'hasSpeechRecognitionDisabled',
  'hasTypingIndicator',
  'hideNotes',
  'isLocked',
  'needPasswordForUserNotes',
  'obsStreamKey',
  'recordChat',
  'recsInRoom',
  'restreamToURL',
  'advancedSearchAlerts',
  'alertsChatOnBottom',
  'alertSoundOff',
  'backupClusterID',
  'banIPList',
  'blinkingRec',
  'dontShowRecInfoToUsers',
  'enablePrivateMessageHistory',
  'h264Enabled',
  'hideWebcamForRoom',
  'linkedRoomAlerts',
  'modAdminLoginList',
  'modMessage',
  'showOnlyUsernames',
  'simplifiedEditor',
  'styckyNonTradeAlert',
  'tipMeBtnEnabled',
  'twillioApiSID',
  'usersCanDeleteOwnMsgs'
];

/*
  The five that must NEVER leave this list by being wired.

  Named separately from the list above so that removing one is two edits and a visible one, rather
  than a single line disappearing from a long alphabetical block. `room-config-boundary.test.ts`
  would fail if one reached `ROOM_VISIBLE_SETTINGS`; this is the earlier warning, at the place
  somebody reads while deciding what to build next.
*/
const CREDENTIALS_THE_REFERENCE_LEAKS: readonly string[] = [
  'banIPList',
  'deleteAlertPW',
  'modAdminLoginList',
  'obsStreamKey',
  'twillioApiSID'
];

describe('room settings the reference reads and this room does not', () => {
  const report = auditSettingCoverage();

  /*
    The guard on the guard. The schema pattern is a regex over a 269-entry file; a change that made
    it match nothing would leave every assertion below passing over an empty universe, which is the
    vacuous-test failure this repository has met four times.
  */
  it('parses the schema at all', () => {
    expect(report.declared).toBeGreaterThan(200);
    expect(report.wired).toBeGreaterThan(50);
    expect(report.wired + report.unwired).toBe(report.declared);
  });

  it('verifies the bundle against its committed pin before measuring', () => {
    expect(report.evidence.sha256).toBe(
      '40796ca83dba809bb966dad0d020ee5170b33aa4556c691957cb65f0bab87524'
    );
  });

  it('names exactly the settings the reference reads and we do not', () => {
    expect(report.unwiredButReferenceReads.map((setting) => setting.name)).toEqual([
      ...REFERENCE_READS_AND_WE_DO_NOT
    ]);
  });

  it('still lists every credential the reference leaks, because wiring one is a REGRESSION', () => {
    /*
      If one of these five leaves the list it means the room started reading it, which is the exact
      thing `room-config-boundary.test.ts` refuses one layer down. Asserted here as well because this
      is the file somebody reads while choosing what to build, and the boundary test is the file they
      read after it has already gone wrong.
    */
    for (const credential of CREDENTIALS_THE_REFERENCE_LEAKS) {
      expect(REFERENCE_READS_AND_WE_DO_NOT).toContain(credential);
    }
  });
});
