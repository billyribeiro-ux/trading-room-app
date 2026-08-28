import { describe, expect, it } from 'vitest';
import { auditSettingCoverage } from '../../gate/audit-setting-coverage.mjs';

/**
 * The room settings the REFERENCE reads in its browser and this room does not.
 *
 * ## What this pins, and why it is names
 *
 * `room-settings-schema.ts` declares 269 settings and marks most of them `wired: false` — nothing in
 * this room reads them. That number alone says nothing, because most were never meant to reach a
 * room. The answerable question is narrower: which of the unwired ones does the reference's own room
 * client read? It was FIFTY-EIGHT when this file was written, measured against the pinned v4 bundle,
 * and the list below is what is left.
 *
 * NO COUNTS IN THIS PARAGRAPH ANY MORE, corrected 2026-08-28. It said "202" twice and "fifty-eight"
 * once, in the present tense, and all three were stale within a day — the numbers move every time a
 * setting is wired, and prose beside a list it counts is the copy nobody updates. The LIST is the
 * fact, which is the same argument this file already makes for pinning names rather than a total.
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
 * `<svelte:head>` in `routes/+page.svelte`), `modMessage` (the presenter-only bar,
 * `lib/components/ModeratorMessage.svelte`), `simplifiedEditor` (foreground-only colour on the note
 * toolbar, `resolveNoteSurfaceGates`), `enablePrivateMessageHistory` (the moderation read behind the
 * user-info modal, refused on the SERVER), `showOnlyUsernames` (which SHAPE a roster row draws in —
 * per row, never per viewer), the `tipMeBtn*` trio (ONE feature, `tipButtonFor`) and
 * `customFaviconURL` + `customCSS` (`RoomBranding`) and `customPlayerURL` (`PresentationArea`'s
 * `#screens` pane) and `copyTrades` (the click-to-copy order marker, `copy-trades.ts`), all on
 * 2026-08-28, plus `positionsIframe` + `positionsIframeUrl` (ONE feature, `PresentationArea`), each
 * with its own contract file — and `usersCanDeleteOwnMsgs`, which crossed to CLOSE a hole rather
 * than to draw a control: the delete endpoint already let a member remove their own message without
 * asking whether the room allowed it. `hasTypingIndicator` joined on the same day and gates the SEND
 * as well as the display.
 *
 * `hasAlertScheduler` left last, and it is the LAST buildable row of this enumeration — what remains
 * is `enableDiscord`, which needs an application registration that does not exist. Its blocker named
 * the wrong process: *"a scheduler process in `services/api`, and the crate's TEST targets cannot
 * build here."* Both halves are true of that crate and neither is a reason to put the scheduler in
 * it. The reference's scheduler is its own Node server; this stack's long-lived Node process is the
 * ROOM, which `docs/NEXT-SESSION.md` establishes cannot be serverless on two independent grounds,
 * and which already owns the `alerts` table and the fan-out. Durable rows, an ephemeral sweep timer,
 * and one atomic conditional `UPDATE … WHERE claimed_at IS NULL … RETURNING` so a firing is
 * exactly-once. `scheduled-alert-contract.test.ts`.
 *
 * `autoRecord` and `dontStopRecOnMicMute` left before it, together, and they are the THIRD blocker in one
 * session to describe the wrong system. The row read "a server-side recorder, which does not exist",
 * which is a true statement about the reference and an irrelevant one here: upstream's `startRecLocal`
 * event is a misnomer that reaches `socket.emit("cmd", {cmd: "startRecord"})`, an opcode to a recorder
 * on the SFU, and this room deliberately records in the BROWSER instead. The settings had something
 * to drive all along. Two divergences follow from that and are written at the code: only this peer's
 * own share can be auto-recorded, and the start is guarded on not already recording, because a second
 * `MediaRecorder` would orphan the first and lose its chunks. `auto-record-contract.test.ts`.
 *
 * `alertsOverlayOnScreenshare` left before them, and it is the first row whose disposition in the triage
 * was WRONG rather than merely stale. It was filed as blocked on "a human at a screen picker", and
 * that is true of the only thing it blocks: nothing here can look at a composited frame. But the
 * risk in this feature is not the canvas, it is the WRAPPING — the reference packs the first line
 * against a width reduced by the sender prefix, spills what did not fit into a second pass at full
 * width, breaks an over-long word character by character and keeps the tail in the buffer, and
 * preserves an empty paragraph as a blank line. Four rules with edges, all of them arithmetic, and
 * every one is now measured against a stub text measurer with its negative control seen red.
 * The lesson is the one `altChatRender` taught on the same day: RE-MEASURE AN INHERITED BLOCKER.
 * `alert-overlay-contract.test.ts`, and what it cannot verify is said in its own header.
 *
 * `altChatRender` left before it, and it is the largest row the enumeration has produced: this room had
 * no compact display mode at ALL, so two of the setting's three behaviours had nothing to act on.
 * It needed `app-st-compactmessage` transcribed as a second layout, the twelve-gate kebab menu
 * shared out of `RoomMessage.svelte` rather than copied, and a preference-key collision handled —
 * upstream stores the display mode under `chatMode`, which is what this room's removed chat-policy
 * radio had been writing `'g'`/`'p'`/`'d'` into. `chat-display-mode-contract.test.ts`.
 *
 * `chatTabsWithBadges` left before it, and it is the only row so far that changed a TYPE: this room
 * had two hard-coded chat channels and a closed `ChatTab` union over them. An owner can configure
 * more, behind badges, so the set is per room and per member — and the reference decides it in the
 * BROWSER, which is why every read and write path here asks the server instead, and why the chat and
 * typing fan-outs became audience-aware. `chat-tabs-contract.test.ts`.
 *
 * `enableQAReactions` left before it, and it is the clearest case yet for READING a row before
 * sizing it.
 * It was filed as a one-line wire because `sourceMessageBehavior.react` already carried the rule
 * verbatim — and that rule could never evaluate true, because the Q&A thread rendered its entries as
 * `kind="chat"` behind `onaction={() => {}}`. What the setting needed underneath it was a thread
 * whose menu ACTS: two commands, a column to hold a reaction, and a room column on
 * `alert_questions` — which turned up a second defect on the way, questions asked on a CAPTURED
 * alert being written by one command and dropped by the read that should have returned them.
 * `qa-thread-contract.test.ts`.
 */
const REFERENCE_READS_AND_WE_DO_NOT: readonly string[] = [
  'deleteAlertPW',
  'smallerImagePreview',
  'allRoomsWelcomeMatPW',
  'isNewIndicatorOn',
  'openLoginLink',
  'authMode',
  'enableDiscord',
  'playChatMessageSoundFor',
  'description',
  'isLocked',
  'needPasswordForUserNotes',
  'obsStreamKey',
  'recordChat',
  'recsInRoom',
  'restreamToURL',
  'advancedSearchAlerts',
  'backupClusterID',
  'banIPList',
  'h264Enabled',
  'linkedRoomAlerts',
  'modAdminLoginList',
  'twillioApiSID'
];

/*
  ── ANSWERED BY DERIVATION, and this is a THIRD kind of answer ────────────────────────────────────

  A setting can be honoured without crossing. `playChatMessageSoundFor` holds member EMAIL ADDRESSES
  and the reference ships them to every browser to hash there (byte 2,595,225), then compares the
  result against `e.avt` — the sender's email hash — on every message (1,431,949). The room never
  needs the addresses: `internal/room-config/[code]` splits and hashes the list and sends
  `chatSoundForEmailHashes`, exactly as it already does for `badges.byEmailHash`.

  So the FEATURE is built and the SETTING is still `wired: false`, which means this name stays on the
  list above. That is correct rather than a bookkeeping problem — the list asks "does the raw value
  cross", and the honest answer here is no and should stay no.

  Named separately from the credentials below because the reason is different: those must never be
  wired at all, this one is DONE. `docs/decoded/missing-settings-triage.md` records which.
*/
const ANSWERED_BY_DERIVATION: readonly string[] = ['playChatMessageSoundFor'];

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

  /*
    …and the derived ones stay too, for the opposite reason: the feature is BUILT and the raw value
    still must not cross. A name leaving this list would mean somebody started sending the addresses.
  */
  it('keeps the settings answered by DERIVATION, whose raw value must still not cross', () => {
    for (const derived of ANSWERED_BY_DERIVATION) {
      expect(REFERENCE_READS_AND_WE_DO_NOT).toContain(derived);
    }
  });
});
