import { readFileSync } from 'node:fs';
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
 *   `advancedSearchAlerts` is gated on one hard-coded owner id. `smallerImagePreview` used to be
 *   the third name in this bullet and it was the wrong answer twice over: the premise it rested on
 *   (that the pair it seeds is one flag copied) was re-measured on 2026-09-02 and is false, and the
 *   half that survived — a class with no rule in any of the 52 stylesheets — is a transcription
 *   question this repository had already answered with `btn-ligth`. It was built on 2026-09-02.
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
 * `hasAlertScheduler` left last on 2026-08-28, and `smallerImagePreview` (USM-18) left on 2026-09-02
 * — which is why "the LAST buildable row" is a claim this file no longer makes about a date. What
 * remains is `enableDiscord`, and its blocker is TWO things rather than one, re-read 2026-09-02: a
 * Discord application registration (nothing to link accounts to until one exists) AND the
 * `/discord/v2/status` and `/discord/v2/auth/start` endpoints it would be reached through, at bundle
 * bytes 1,160,297 and 1,160,186. The client half alone is a presenter-only control whose single
 * action is a request that 404s. `hasAlertScheduler`'s own blocker named
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
 * had two hard-coded chat channels and a closed `ChatChannelName` union over them. An owner can configure
 * more, behind badges, so the set is per room and per member — and the reference decides it in the
 * BROWSER, which is why every read and write path here asks the server instead, and why the chat and
 * typing fan-outs became audience-aware. `chat-tabs-contract.test.ts`.
 *
 * `restreamToURL` left last, on 2026-08-30, and it is the only row here that did NOT come from this
 * enumeration. It came from the room-surface audit, as SC-12 and SC-13, and the setting turned out
 * to be the thing both halves were missing: SC-12 is a textarea that opened empty on a room with a
 * destination already configured, and SC-13 is what the Set/Clear buttons did instead —
 * `onPreferenceChange('restreamToURL', …)`, which is `prefs.save`, this VIEWER's own settings row.
 * Those two lines were the only occurrences of the name in `apps/room/src`. Nothing read it, so the
 * room republished nowhere while the pane showed the value back to the presenter who typed it,
 * which is the specific reason the defect could survive being looked at.
 *
 * It is also the first wired setting that does not cross to every member. An rtmp destination
 * usually carries its own stream key inline, so it goes over `ROOM_PRESENTER_SETTINGS` — a third
 * allow-list, projected only to a member the controller has already decided is a presenter. The
 * reference reads it from `globals.sessData.restreamToURL`, which every viewer receives; that
 * divergence is deliberate and argued where the list is defined. `restream-url-contract.test.ts`.
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
  'allRoomsWelcomeMatPW',
  'isNewIndicatorOn',
  'openLoginLink',
  'authMode',
  'enableDiscord',
  'isLocked',
  'playChatMessageSoundFor',
  /*
    THE CHANNEL CLUSTER LEFT THIS LIST ON 2026-09-02 — all five, together.

    They were added on 08-31 and were invisible to this list before then, and not because nobody
    looked: `referenceReads` counts `sessData.<name>` and these are read in `processSessData`,
    BEFORE the object is `sessData`, off the minifier's own local. Six settings, zero hits, for as
    long as the instrument had existed.

    `hasChannelTabs` was the first of the six to go, on 08-31, because it was a live defect — this
    room had been shipping an Off Topic tab to rooms whose owners had turned it off. The other five
    are `altGenChannelName`, `altOffTopicChannelName`, `hasAdminOnlyChannel`, `extraAdminChannels`
    and `extraRegChannels`, and they left together because a subset of the six describes a room the
    reference cannot be in.

    The row that sat here said they were *"not four more pushes onto a list; they are a channel-model
    change"*, and that was right: the reference gives every tab a TYPE and has three where this room
    had one.

      main          always               type "r"    renamable by altGenChannelName
      off-topic     hasChannelTabs       type "r"    renamable by altOffTopicChannelName
      adminChat     hasAdminOnlyChannel  type "po"   presenter or hasAdminChat, decided on the SERVER
      extraAdminChannels   comma-split   type "p"
      extraRegChannels     comma-split   type "r"

    Two things the triage recorded as undecoded turned out to be decodable by reading:

      `po`  gated at THREE sites — the subscription at 1,008,074 and both columns' render at
            1,437,340 and 2,383,602 — all on `isPresenter || user.hasAdminChat`.
      `p`   `type:"p"` occurs ONCE in the whole bundle and nothing compares against it, so a `p`
            channel is an `r` one in the reference's own client.

    `chat-tabs.ts` carries both findings and `chat-tabs-contract.test.ts` the thirteen cases,
    including the one divergence: an owner-typed name colliding with a reserved channel is REFUSED,
    because upstream's unchecked push would let `extraRegChannels: adminChat` alias the private
    channel with an ungated one.
  */
  'description',
  'needPasswordForUserNotes',
  'obsStreamKey',
  'recordChat',
  'recsInRoom',
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

/**
 * `PAM-02` — the one row the re-triage confirmed that this session did NOT act on, and why.
 *
 * The reference gates its "Send Text" alert control on `sessData.twillioApiSID` being set. The
 * proposal is the pattern this repository already has: derive a one-bit boolean on the CONTROLLER —
 * `hasTextAlerts: Boolean(settings.twillioApiSID)` — and send only that, so the credential stays
 * behind and the QUESTION travels. `playChatMessageSoundFor` → `chatSoundForEmailHashes` is exactly
 * that shape and is the single entry in `ANSWERED_BY_DERIVATION` above.
 *
 * **It is not built, and the reason is not that the pattern is wrong.** `twillioApiSID` is one of
 * the seven in `CREDENTIALS_THE_REFERENCE_LEAKS` below, whose comment says they *"must NEVER leave
 * this list by being wired"* — and a derived boolean is not wiring the setting, which is precisely
 * the distinction an owner should draw rather than an agent. The bit it would disclose to the room
 * is "text alerts are configured", which is what the reference's own UI already shows by drawing the
 * control; it says nothing about the credential's value.
 *
 * Recorded here, next to the list it turns on, so the decision is one sentence rather than a
 * re-derivation: **if the owner says a derived boolean over a credential is permitted, this is
 * `hasTextAlerts` on the controller, `hasTxt` on `room/gates.ts`, and the control's gate in
 * `PostAlertModal.svelte`.** Until then the seven stay untouched, which is the same standing that
 * refused `T5-24` four times.
 */
const CREDENTIAL_DERIVATION_AWAITING_THE_OWNER = 'PAM-02 — hasTextAlerts from twillioApiSID';

/**
 * THE ROW THAT WAS WAITING ON A SENTENCE, AND WHAT ACTUALLY SETTLED IT — USM-18, 2026-09-02.
 *
 * `smallerImagePreview` sat here as a conflict between two owner rules, and the conflict was not
 * real. Both halves of the case were re-measured; one collapsed and the other turned out to have
 * been decided long ago.
 *
 * **The premise that collapsed.** The row said the pair it feeds *"has no consumer"*.
 * `defaultImagePreview` occurs fifteen times in the bundle and is a ONE-SHOT LATCH, not a second
 * copy of the flag — `processSessData` at byte 1,436,631:
 *
 *   sessData.smallerImagePreview && !preferences.defaultImagePreview && (
 *     preferences.defaultImagePreview = sessData.smallerImagePreview,
 *     preferences.smallImagePreview   = sessData.smallerImagePreview,
 *     setPreference('defaultImagePreview', preferences.defaultImagePreview))
 *
 * The room's default is pushed into the member's own preference exactly once and the latch is
 * persisted, so a member who turned it off stays off against a room default that says on. That is a
 * real behaviour, and `RoomPrefs.latchRoomImagePreview` now carries it.
 *
 * **The half that stood, and why it was never this row's to decide.** `ngClass(B1e, smallImagePreview
 * && defaultImagePreview)` with `B1e = t => ({'chat-uploaded-img-sm': t})` is the pair's only visible
 * effect, and that class has no rule in any of the 52 stylesheets this repository holds — re-proved
 * against `css/complete-app-styles.css`, 688,687 bytes, where the search finds `.chat-uploaded-img`
 * with a real `max-height` rule and the `-sm` variant zero times.
 *
 * So the reference renders a class that styles nothing. `CLAUDE.md` forbids *"a `.flipped` class with
 * no CSS"*, and that rule governs classes this repository INVENTS. A class TRANSCRIBED from the
 * capture has its consumer in the capture, and this repository had already made that call and tested
 * it: `btn-ligth`, upstream's typo for `btn-light`, matches no rule anywhere and is rendered at
 * `components/ChatArchiveLogPane.svelte:139` with `chat-archive-log-contract.test.ts` asserting both
 * that it ships and that no stylesheet here defines it. Holding USM-18 for a sentence while
 * `btn-ligth` shipped was the inconsistency, not the class.
 *
 * The row is BUILT. `image-preview-latch-contract.test.ts` is its contract; the note that remains is
 * the one thing the capture in this checkout cannot answer, and it is recorded at the checkbox in
 * `ModalHost.svelte` rather than here: whether the toggle at byte 2,253,193 writes the latch as well
 * as the flag.
 *
 * With it built, `PAM-02` above is the ONLY row in this file still waiting on the owner.
 */

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

  it('and every one of them has an ANSWER in the document this list calls its tracker', () => {
    /*
      THE LIST NAMED ITS TRACKER AND NOTHING EVER OPENED IT. Closed 2026-08-30.

      The docblock above says it in as many words — *"Each entry is a QUESTION, and the answers are
      in `docs/decoded/missing-settings-triage.md` — that document, not this list, is the tracker."*
      Every assertion in this file was about the LIST: that it names exactly the right settings, that
      the credentials are still on it, that `TODO.md` does not restate its size. Not one of them
      opened the tracker.

      So the two could disagree silently, and the way they would is not hypothetical: the list
      changes when the SCHEMA changes or the bundle pin moves, and the assertion above fails with a
      diff. The obvious repair is to paste the new name into `REFERENCE_READS_AND_WE_DO_NOT` and go
      green — at which point a setting the reference reads and this room does not is pinned,
      counted, guarded against being wired by accident, and answered by nobody. It would look
      exactly like the twenty that ARE answered.

      A disposition is a `## ` section of that document, and the seven are the document's own —
      it declares them in a table under *"What the dispositions mean"*, which is why they are read
      from the headings rather than restated as a rule here.

      This asserts an ANSWER EXISTS, never that it is right. Three of the seven dispositions mean
      "do not build this" and one means "wiring it would be a regression", so a test that demanded
      work would be wrong about four sevenths of the document. What it refuses is silence.
    */
    const triage = readFileSync(
      new URL('../../../../docs/decoded/missing-settings-triage.md', import.meta.url),
      'utf8'
    );

    /*
      Split on `## ` and keep the sections whose heading opens with a disposition word. The headings
      carry an em-dash and a gloss after the word — `## NEVER — credentials the reference ships…` —
      so this matches the opening rather than the whole line.
    */
    const DISPOSITIONS = [
      'NEVER',
      'NOT A GAP',
      'ENUMERATION ARTEFACT',
      'WIRE',
      'FEATURE',
      'BLOCKED',
      'DERIVED'
    ];
    /*
      The heading must be the disposition word AND END THERE — followed by the em-dash gloss most of
      them carry, or by the newline that `## BLOCKED` ends on, and by nothing else.

      `startsWith(word)` was the first version, and its own negative control refused it for the same
      reason the backtick rule exists above: renaming `## DERIVED — …` to `## DERIVED-VALUES — …`
      left the floor GREEN, because the longer heading still starts with the shorter word. A test
      whose vacuity guard can itself be fooled by a rename is not a guard.
    */
    const sections = triage
      .split(/^## /m)
      .slice(1)
      .filter((section) =>
        DISPOSITIONS.some(
          (word) => section.startsWith(`${word} `) || section.startsWith(`${word}\n`)
        )
      );

    /*
      The vacuity floor, and this one is not decoration: every assertion below is a search over
      these sections, so a renamed heading would silently answer nothing and pass. Seven headings,
      seven dispositions.
    */
    expect(
      sections.length,
      'the triage’s disposition headings were renamed — this test now searches nothing'
    ).toBe(DISPOSITIONS.length);

    /*
      MATCHED IN BACKTICKS, and that is not a stylistic preference — a plain `includes` was the first
      version and its own negative control refused it.

      Renaming `h264Enabled` to `h264EnabledXX` in the triage left the test GREEN, because the longer
      string still CONTAINS the shorter one. A substring match answers a setting with any name that
      merely starts the same way, and it also answers `description` with the ordinary English word,
      which appears in this document dozens of times in prose that disposes of nothing.

      The document names every setting the same way — in backticks — so that is what is searched for.
      Measured before relying on it: all twenty-one appear as `` `name` `` inside a disposition
      section, so nothing is lost by requiring it.
    */
    const answered = sections.join('\n');
    const silent = REFERENCE_READS_AND_WE_DO_NOT.filter(
      (name) => !answered.includes(`\`${name}\``)
    );
    expect(
      silent,
      'these settings are on the pinned list and appear under no disposition in ' +
        '`docs/decoded/missing-settings-triage.md`. The list is the question; that document is ' +
        'the tracker. Give each one a disposition there — including "do not build this", which is ' +
        'four of the seven — rather than leaving it counted and unanswered.'
    ).toEqual([]);
  });

  it('keeps TODO.md pointing at this list rather than restating its size', () => {
    /*
      `TODO.md` carried this count twice and it was stale both times — "26 of the 170", then "26" when
      the measurement said 22. Neither was caught by `verify-room-settings-schema.mjs`, whose
      `COUNT_CLAIMS` checks the WIRED total: this is a different claim, phrased a way no pattern
      matched. That verifier's own docblock predicted it — *"the next stale count will be in a
      seventh file phrased a seventh way"* — and it turned out to be a seventh phrasing in a file
      already on the list.

      The fix is the doctrine this file states about its own prose: the LIST is the fact, and a
      number beside it is the copy nobody updates. So the assertion is that no such number is there,
      not that it is right.

      Deliberately narrow. It matches the sentence shape that went stale — a digit or a spelled
      number immediately before "read by the reference" — rather than hunting digits in a 900-line
      tracker, which is the false-positive rate the "20 of 269" incident already measured.
    */
    const todo = readFileSync(new URL('../../../../TODO.md', import.meta.url), 'utf8');
    const live = todo
      .split('\n')
      .filter((line) => !/^\s*>/.test(line))
      .join(' ')
      .replace(/\s+/g, ' ');

    const NUMBER = '(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|dozens?|\\w+ty)';
    /*
      TWO phrasings, because there were two sites and the second was found by a control that FAILED
      TO FIRE: deleting the pointer left this test green, since the pointer assertion below was
      being satisfied by a DIFFERENT line — one which itself read *"pins the 26 by NAME"*. Two stale
      copies of one number in one file, three phrasings between them.

      So the pattern covers the shape of both: a count before "read by the reference", and a count
      after "pins the". Not a general digit hunt — that is the false-positive rate the "20 of 269"
      incident already measured.
    */
    const restated = new RegExp(
      `${NUMBER}\\s+(?:of them\\s+)?(?:are\\s+)?read by the reference|pins the\\s+${NUMBER}\\b`,
      'i'
    ).exec(live);
    expect(
      restated?.[0] ?? null,
      'TODO.md is restating the size of this list. Point at the list instead — it moves every time a ' +
        'setting is wired, and the number beside it is the copy nobody updates.'
    ).toBeNull();

    /* And that it still points here at all, so the pointer cannot be deleted along with the count. */
    expect(live).toContain('setting-coverage-contract.test.ts');
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
    /*
      And the one derivation this session did NOT make is named against the credential it would be
      derived from, so the pending decision cannot be lost. Asserted rather than left in prose
      because a note nothing reads is a note that goes stale — the day `twillioApiSID` leaves the
      credential list, this line has to be revisited with it.
    */
    expect(CREDENTIAL_DERIVATION_AWAITING_THE_OWNER).toContain('twillioApiSID');
    expect(CREDENTIALS_THE_REFERENCE_LEAKS).toContain('twillioApiSID');
  });

  it('keeps the settled row settled — smallerImagePreview is wired and stays wired', () => {
    /*
      The inverse of the assertion that used to be here, and it is kept rather than deleted for the
      reason the paragraph above gives: this row was answered wrong twice, and both wrong answers
      were recorded as settled. If somebody flips it back to `wired: false`, that is a decision that
      has to be argued at the paragraph rather than made by an edit to a generated file.

      It is asserted HERE, and not in `settings-preference-wiring-contract.test.ts` where the byte
      evidence lives, for the reason that file's own name gives away — it is one of the 42
      `gate/evidence-bound-tests.mjs` excludes when the capture roots are absent, so an assertion
      added there does not run in this checkout and its negative control produces no output at all.
      This file runs.
    */
    expect(REFERENCE_READS_AND_WE_DO_NOT).not.toContain('smallerImagePreview');

    const schema = readFileSync(
      new URL('../../../controller/src/lib/room-settings-schema.ts', import.meta.url),
      'utf8'
    );
    const row = /\{ name: "smallerImagePreview",[^}]*\}/.exec(schema)?.[0];
    expect(row, 'the setting this note is about is gone from the schema').toBeDefined();
    expect(
      row,
      'smallerImagePreview went back to `wired: false` — USM-18 was built on 2026-09-02 and the ' +
        'paragraph above says why; unwiring it is an argument, not an edit'
    ).toContain('wired: true');
  });
});
