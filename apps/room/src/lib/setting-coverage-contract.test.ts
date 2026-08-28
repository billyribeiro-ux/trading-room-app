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
 * **SEVEN of these are CREDENTIALS the reference ships to every member's browser**, and this room
 * refuses to: `deleteAlertPW`, `banIPList`, `obsStreamKey`, `twillioApiSID`, `modAdminLoginList`,
 * `allRoomsWelcomeMatPW` and `needPasswordForUserNotes`.
 * `room-config-boundary.test.ts` asserts that no room-visible setting reads like a credential, and
 * `internal/room-entry` is the shape used instead — the credential stays on the controller and the
 * QUESTION travels. **Wiring any of those seven would be a regression wearing an enumeration's
 * clothes**, and this paragraph exists so that the next person to read this list top-to-bottom knows
 * it before they start.
 *
 * It said FIVE until 2026-08-28. The two that joined were found by reading every entry in the bundle
 * for the triage document — `allRoomsWelcomeMatPW` at byte 1,474,192 and `needPasswordForUserNotes`
 * at byte 2,081,795, both the identical `bootbox.prompt` then `i.trim() === sessData.<pw>` shape as
 * `deleteAlertPW`. Neither name matches a `*PW`-style pattern that a heuristic would catch, which is
 * the argument for the explicit list below rather than a regex.
 *
 * Others are honoured under another mechanism, which is the false-gap rate that killed 7 of 34 claims
 * in the command triage. Only the rest are unbuilt work.
 *
 * ## How to change this list
 *
 * Remove a name when the room genuinely reads the setting — which is what wiring it does, and what
 * flips `wired` to `true` in the schema this reads. **Adding one is a conversation**: it means a
 * setting the room used to read no longer is.
 *
 * **`hideNotes` was the first removal, hours after the list was written**, and it is the case this
 * enumeration was built to find: `hideFiles` and `hideStreams` had crossed to the room since
 * `ROOM_VISIBLE_SETTINGS` was written, applied by the reference the same way, and nobody had noticed
 * the trio was a pair. An owner who ticked "Hide Notes Section?" got a room that still showed the
 * tab.
 *
 * **`darkThemeAsDefault`, `alertSoundOff` and `alertsChatOnBottom` left together**, on the same day,
 * and they are the second thing this list is for: not a gap somebody had missed, but a FEATURE that
 * was invisible as long as the question was asked one setting at a time. Read in isolation each is
 * a small owner preference; read together they are three consecutive clauses of one expression, a
 * per-viewer latch, and the rule that a default must never become an override. The list is what put
 * the three names next to each other. `#lib/room/room-defaults.ts`.
 *
 * **`dontShowRecInfoToUsers` left third, and it was never a missing feature at all.** The gate was
 * built, and `RoomNavbar.svelte` carried the correct transcription in a comment — but
 * `RoomGates.recordingTooltip` read it off `prefs.loaded` instead of `sessData`, a viewer
 * preference nothing writes. It compiled, it type-checked, and its own test passed because the test
 * handed it the same wrong source the code read. **Nothing but this list could have found it**: a
 * room setting implemented against a preference looks identical to a working one from every
 * direction except the one that asks the bundle what the reference reads.
 *
 * ## ⚠️ THIS LIST IS NOT A BACKLOG ⚠️
 *
 * Each entry is a QUESTION, and the answers are in `docs/decoded/missing-settings-triage.md` — that
 * document, not this list, is the tracker. All 53 were read in the bundle on 2026-08-28 and given a
 * disposition, and three classes of answer are NOT work:
 *
 * - **NEVER** — six of them are passwords the reference compares in the BROWSER. Wiring one is a
 *   regression wearing an enumeration's clothes, which is why `credentialShaped` below asserts they
 *   are still here.
 * - **NOT A GAP** — `h264Enabled` is `sessData.h264Enabled || !0`, unconditionally true upstream;
 *   `advancedSearchAlerts` is gated on one hard-coded owner id; `smallerImagePreview` seeds a
 *   preference whose only effect is a class with no rule in any of the 52 stylesheets we hold.
 * - **ENUMERATION ARTEFACT** — a read count is not a size. `name` sat near the top of this list with
 *   a count that was almost entirely `this.name` on unrelated error classes; its ONE real read was a
 *   document title, and building it took two lines. Rank this list by what a row turns out to be,
 *   never by the number beside it.
 *
 * Rows leave this list by being ANSWERED, and thirteen have: the newest are `name` (the browser tab,
 * `<svelte:head>` in `routes/+page.svelte`) and `modMessage` (the presenter-only bar,
 * `lib/components/ModeratorMessage.svelte`), both on 2026-08-28 with their own contract file.
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
  'enableDiscord',
  'hasAlertScheduler',
  'playChatMessageSoundFor',
  'tipMeBtnUrl',
  'alertsOverlayOnScreenshare',
  'customCSS',
  'customFaviconURL',
  'customPlayerURL',
  'description',
  'dontStopRecOnMicMute',
  'hasTypingIndicator',
  'isLocked',
  'needPasswordForUserNotes',
  'obsStreamKey',
  'recordChat',
  'recsInRoom',
  'restreamToURL',
  'advancedSearchAlerts',
  'backupClusterID',
  'banIPList',
  'enablePrivateMessageHistory',
  'h264Enabled',
  'linkedRoomAlerts',
  'modAdminLoginList',
  'showOnlyUsernames',
  'simplifiedEditor',
  'tipMeBtnEnabled',
  'twillioApiSID',
  'usersCanDeleteOwnMsgs'
];

/*
  The seven that must NEVER leave this list by being wired.

  Named separately from the list above so that removing one is two edits and a visible one, rather
  than a single line disappearing from a long alphabetical block. `room-config-boundary.test.ts`
  would fail if one reached `ROOM_VISIBLE_SETTINGS`; this is the earlier warning, at the place
  somebody reads while deciding what to build next.
*/
const CREDENTIALS_THE_REFERENCE_LEAKS: readonly string[] = [
  /*
    Both added 2026-08-28, by reading rather than by pattern. `allRoomsWelcomeMatPW` (byte 1,474,192)
    guards replacing every room's Welcome Mat and `needPasswordForUserNotes` (byte 2,081,795) guards
    a presenter reading a member's notes; each is `bootbox.prompt` then `i.trim() === sessData.<pw>`,
    the same client-side comparison `deleteAlertPW` uses five times over. Neither ends in `PW` in a
    way a heuristic would catch — `needPasswordForUserNotes` does not contain a credential suffix at
    all — which is precisely why this list is written out.
  */
  'allRoomsWelcomeMatPW',
  'banIPList',
  'deleteAlertPW',
  'modAdminLoginList',
  'needPasswordForUserNotes',
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
      If one of these seven leaves the list it means the room started reading it, which is the exact
      thing `room-config-boundary.test.ts` refuses one layer down. Asserted here as well because this
      is the file somebody reads while choosing what to build, and the boundary test is the file they
      read after it has already gone wrong.
    */
    for (const credential of CREDENTIALS_THE_REFERENCE_LEAKS) {
      expect(REFERENCE_READS_AND_WE_DO_NOT).toContain(credential);
    }
  });
});
