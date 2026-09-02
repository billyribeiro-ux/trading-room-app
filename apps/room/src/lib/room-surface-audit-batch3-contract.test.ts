import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { svelteCodeOf, tsCodeOf } from './source-comments.js';

/**
 * BATCH 3 OF THE ROOM-SURFACE AUDIT — `RoomNavbar`, `RoomOverlays` and `ExtraChatPane`.
 *
 * Every row in the `## RoomNavbar.svelte`, `## RoomOverlays.svelte` and `## ExtraChatPane.svelte`
 * sections of `docs/decoded/room-surface-audit-2026-08-30.md` cites a byte in the pinned bundle.
 * This file re-reads each of those bytes and fails if the citation has moved or was never right,
 * and then asserts what this room now does about it.
 *
 * ## Why the reasoning lives HERE and not beside the markup
 *
 * All three components were already AT their `source-size-contract.test.ts` ceilings on the day this
 * batch ran — 1169/1169, 1081/1081, 640/640 — and that ratchet only ever goes DOWN. So the fixes had
 * to be line-neutral, which means the long explanations this repository asks for could not go in the
 * files they explain. They go in the one place a contract test is allowed to be long, and each edit
 * carries a pointer to this file rather than a paragraph.
 *
 * That is a constraint doing its job rather than a workaround: three of the eight rows below could
 * NOT be built inside a line budget of zero, and they are recorded as blocked with the extraction
 * that would unblock them, instead of being smuggled in by shortening a comment somewhere else.
 *
 * ## How the reference was read
 *
 * By decoding, not by lookup. Every const index quoted below came out of a string-aware walk of the
 * component's own `consts:[[ … ]]` table with `const-table.mjs`, which is the only way an index and
 * a byte offset can be quoted in the same sentence — the tables are per component and the same
 * number means three different things three components away. Two of the eight rows exist ONLY
 * because the table was decoded: `RNB-01`, whose gate turned out to be a field nothing assigns, and
 * `ECP-04`, whose two consts decode byte-identically and explain a stylesheet that had gone missing.
 */

const ROOT = new URL('../', import.meta.url);

const BUNDLE = readFileSync(
  new URL('../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', ROOT),
  'utf8'
);

const read = (path: string) => readFileSync(new URL(path, ROOT), 'utf8');

const NAVBAR = svelteCodeOf(read('lib/components/RoomNavbar.svelte'));
const OVERLAYS = svelteCodeOf(read('lib/components/RoomOverlays.svelte'));
/*
  The image lightbox was EXTRACTED out of `RoomOverlays.svelte` on this branch. Same markup, its own
  component — so the assertions that read it read `ImageLightbox.svelte`, and a batch written against
  a tree where it still lived in the overlay layer would fail here for a reason that is not a defect.
*/
const LIGHTBOX = svelteCodeOf(read('lib/components/ImageLightbox.svelte'));
const EXTRA_CHAT = svelteCodeOf(read('lib/components/ExtraChatPane.svelte'));
const MAIN_CHAT = svelteCodeOf(read('lib/components/AlertChatArea.svelte'));
const BOOTBOX = svelteCodeOf(read('lib/components/BootboxDialog.svelte'));
const EVENTS = tsCodeOf(read('lib/room/events.svelte.ts'));
const APP_CSS = read('app.css');
const GENERATED_CSS = read('lib/styles/captured-runtime-components.css');
const CAPTURED_SHEET = read('../css/complete-app-styles.css');
const DEPLOYED_INDEX = read('../docs/source-v4-2026-08-15/deployed-index.html');

/**
 * Every citation this batch makes, as `[byte, text]`, checked in one sweep.
 *
 * `indexOf` FIRST and `toBe(byte)` second, in that order and never the other way round: a needle
 * that has moved answers -1, and `-1 === byte` fails with "expected -1 to be 2487900", which reads
 * like a wrong offset when it is actually a wrong string. Asserting existence first names which of
 * the two happened.
 *
 * The bundle is SHA-256 pinned (`docs/source-v4-2026-08-15/sha256sums.txt`), so an offset that was
 * right once stays right, and a failure here means the citation was wrong when it was written.
 */
const CITATIONS: readonly (readonly [number, string])[] = [
  // ── RNB-01 — the Simpler Trading help link ────────────────────────────────────────────────────
  [2_487_900, 'O(9,e.hasSTHelpLink?9:-1)'],
  [2_472_793, '{1&t&&(d(0,"a",84),T(1,"i",138),u())}'],
  [
    2_538_141,
    '["href","https://intercom.help/simpler-trading/en/","target","_blank",1,"helpLink","mr-auto"]'
  ],
  [2_497_849, 'this.hasSTHelpLink=!1'],
  // the passing control for RNB-01: a sibling field in the same constructor that IS assigned
  [2_509_182, 'this.isTipEnabled=this.appService.globals.sessData.tipMeBtnEnabled'],

  // ── RNB-02 — TAWK Support sits before the volume dropdown ─────────────────────────────────────
  [2_485_567, '(29,f4e,5,0,"li",101)(30,m4e,5,0,"li",102),d(31,"li",103)'],
  [
    2_539_218,
    '["title","Session Control","data-bs-toggle","modal","data-bs-target","#session-control-modal",1,"nav-item"]'
  ],
  [2_539_326, '["title","TAWK Support",1,"nav-item"]'],
  [2_539_364, '[1,"nav-item","dropdown","dropstart"]'],

  // ── RNB-03 — the recording reminder and the microphone ────────────────────────────────────────
  [
    2_477_744,
    'O(5,!e.appService.globals.sessData.recordingReminder||!e.recordingReminder||e.micDisabled||e.mediaService.micMuted||!e.appService.globals.roomState.isRecordingPaused&&e.appService.globals.roomState.isRecording?-1:5)'
  ],
  [2_503_063, 'this.micDisabled=!0,this.recordingReminder=!1'],

  // ── RNB-04 — the Rec Preview item's gate ──────────────────────────────────────────────────────
  [
    2_476_206,
    'O(9,e.appService.globals.roomState.isRecording&&e.appService.globals.sessData.recPreviewLocation?9:-1)'
  ],
  [2_475_111, 'v(2," Hide Rec Preview ")'],
  [2_475_265, 'v(2," Show Rec Preview")'],
  [1_023_752, 'this.globals.sessData.recPreviewLocation=i.url'],

  // ── ROV-01 — the "Conected" flash ─────────────────────────────────────────────────────────────
  [2_547_002, 'H(7,iRe,3,0,"div",9)'],
  [2_547_023, 'd(8,"div",10),T(9,"i",11),v(10," Conected\\n"),u()'],
  [2_533_614, '["id","connectedMsg",1,"notConnectedOverlay","animated","fadeIn"]'],
  [2_533_680, '[1,"fas","fa-check"]'],

  // ── ROV-02 — the lightbox's geometry ──────────────────────────────────────────────────────────
  [
    1_364_894,
    '.imgur-modal[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{width:inherit;height:inherit;max-width:100%;max-height:calc(100vh - 150px)}'
  ],

  // ── ROV-03 / ROV-04 — the image viewer the bundle does and does not contain ───────────────────
  [1_326_388, 'onclick="openImageModal(event,'],
  [1_992_730, 'showImagePreview(e,i=""){e&&bootbox.dialog('],

  // ── ECP-01 — the `&nbsp;Chat` fallback label ──────────────────────────────────────────────────
  [2_367_398, '{1&t&&(d(0,"span"),v(1,"\\xa0Chat"),u())}'],
  [2_399_335, 'H(5,j3e,2,0,"span")(6,V3e,3,0,"span",11)'],
  [2_399_848, 'O(5,0==o.chatTabs.length?5:-1)'],

  // ── ECP-02 — the `isConnected` half of the composer gate ──────────────────────────────────────
  [2_400_361, 'O(23,o.isConnected&&o.chatEnabled?23:24)'],
  [2_375_326, 'this.isConnected=!0,this.isMediaConnected=!1'],
  [2_376_472, '"socketDisconnected",e=>{this.isConnected=!1}'],

  // ── ECP-03 — where the header's two toggles bind their click ──────────────────────────────────
  [2_394_394, '[1,"nav-item","mx-1",3,"click"]'],
  [2_394_426, '["title","Search",1,"nav-link","p-0"]'],
  [2_394_486, '[1,"nav-item","dropdown","ml-2",2,"position","static",3,"click"]'],
  [
    2_394_551,
    '["aria-haspopup","true","aria-expanded","false",1,"nav-link","dropdown-toggle","p-0"]'
  ],
  [
    2_399_435,
    'd(10,"li",15),x("click",function(){return D(s),E(o.toggleChatToolbarSearchOnly())}),d(11,"a",16)'
  ],
  [
    2_399_551,
    'd(13,"li",18),x("click",function(){return D(s),E(o.toggleChatToolbar())}),d(14,"a",19)'
  ],

  // ── ECP-04 — one id, two components ───────────────────────────────────────────────────────────
  [1_448_754, '["id","textAreaHolder",1,"d-flex","align-items-center","textSendDiv"]'],
  [2_394_929, '["id","textAreaHolder",1,"d-flex","align-items-center","textSendDiv"]']
];

describe('every byte this batch cites is still that byte', () => {
  it('reads the bundle at the pinned size, so an offset means something', () => {
    expect(BUNDLE.length).toBe(2_891_205);
  });

  it.each(CITATIONS.map(([byte, text]) => [byte, text] as const))(
    'byte %d',
    (byte: number, text: string) => {
      const at = BUNDLE.indexOf(text);
      expect(
        at,
        `the cited text is not in the bundle at all: ${JSON.stringify(text)}`
      ).toBeGreaterThan(-1);
      expect(BUNDLE.indexOf(text, byte)).toBe(byte);
      expect(BUNDLE.slice(byte, byte + text.length)).toBe(text);
    }
  );
});

/**
 * RNB-01 — the help link is a control whose gate nothing can turn on.
 *
 * `U4e`'s node 9 is `H(9,MPe,2,0,"a",84)` and `MPe` (byte 2,472,793) is two nodes:
 * `d(0,"a",84),T(1,"i",138)`. Const 84 is the Simpler Trading intercom link, const 138 is
 * `fas fa-question-circle`, and the gate is `O(9, e.hasSTHelpLink ? 9 : -1)` at byte 2,487,900.
 *
 * `hasSTHelpLink` occurs exactly THREE times in 2,891,205 bytes: once as the login component's
 * `this.hasSTHelpLink=!0`, once as the room component's `this.hasSTHelpLink=!1` (byte 2,497,849)
 * and once as the template read above. `app-room` initialises it FALSE and never writes it again,
 * so upstream's own room can never render this control.
 *
 * The passing control matters more than the absence: `isTipEnabled` is a field in the SAME
 * constructor, initialised `!1` in the same statement list, and it IS assigned — from
 * `sessData.tipMeBtnEnabled && tipMeBtnUrl && …` at byte 2,509,182. So the method finds an
 * assignment when there is one to find.
 */
describe('RNB-01 — the help link, refused because its gate is never written', () => {
  it('counts the occurrences rather than trusting a failed search', () => {
    const hits = BUNDLE.split('hasSTHelpLink').length - 1;
    expect(hits).toBe(3);
    // …and the only one inside `app-room` is the initialiser, which sets it false.
    expect(BUNDLE.indexOf('this.hasSTHelpLink=!1')).toBe(2_497_849);
    expect(BUNDLE.indexOf('this.hasSTHelpLink=!0')).toBe(1_189_000);
    expect(BUNDLE.indexOf('this.hasSTHelpLink=!0', 2_400_000)).toBe(-1);
  });

  it('rules out a BULK write, which a name search alone cannot', () => {
    /*
      THE HOLE IN "IT OCCURS THREE TIMES", CLOSED 2026-09-01.

      Counting a field's NAME proves nothing about a framework that can write fields without naming
      them. `Object.assign(this, sessData)`, a `for…in` copy, or a computed `this[key] = value` would
      each set `hasSTHelpLink` while leaving the occurrence count at three — and the whole refusal
      rests on that count.

      So the class body is searched for all four shapes. `app-room`'s constructor is at 2,497,849 and
      its class runs past 2,527,000; the window below covers it with room either side.

      The three `Object.keys` calls that DO exist are webcam bookkeeping — `addPresenterdWebcam`
      counting `this.webcams`, and `resetWebcamPositions`/`resetWebcamPositionsAlt` iterating it.
      Named here because "three hits, all harmless" is a claim somebody should be able to re-check
      without re-deriving which three.
    */
    const classBody = BUNDLE.slice(2_490_000, 2_530_000);
    expect(classBody, 'app-room does not bulk-copy onto itself').not.toContain(
      'Object.assign(this'
    );
    expect(classBody).not.toMatch(/for\s*\(\s*(?:const|let|var)\s+\w+\s+in\s/);
    expect(classBody, 'no computed self-assignment').not.toMatch(/this\[\w+\]\s*=/);
    const objectKeys = classBody.split('Object.keys(').length - 1;
    expect(objectKeys).toBe(3);
    /* All three read `this.webcams`, so none of them can reach a boolean gate. */
    expect(classBody.split('Object.keys(this.webcams)').length - 1).toBe(3);
  });

  it('so the reference s OWN room never renders it, which makes the DOMs agree', () => {
    /*
      The conclusion the earlier cases support but none of them stated, and it is the one that
      matters under "match the dump exactly": this is not a divergence.

      A refusal says *we chose differently from the reference*. Here the gate is dead upstream, so
      upstream's rendered navbar has no help link and neither does ours. The const-table value is a
      residual of the SWEEP — which reads source — not of the page. Recorded as a case because the
      distinction is the difference between four rows of open work and none.
    */
    expect(BUNDLE).toContain('O(9,e.hasSTHelpLink?9:-1)');
    expect(BUNDLE.split('this.hasSTHelpLink=').length - 1).toBe(2);
    expect(BUNDLE.indexOf('this.hasSTHelpLink=!1')).toBe(2_497_849);
    expect(NAVBAR).not.toContain('intercom.help');
  });

  it('has a control that proves an assignment WOULD have been found', () => {
    expect(BUNDLE.split('isTipEnabled').length - 1).toBe(4);
    expect(
      BUNDLE.indexOf('this.isTipEnabled=this.appService.globals.sessData.tipMeBtnEnabled')
    ).toBe(2_509_182);
  });

  it('leaves the navbar without the link, and says so by not carrying the href', () => {
    expect(NAVBAR).toContain('navbar-brand ml-1 mr-auto');
    expect(NAVBAR).not.toContain('intercom.help');
    expect(NAVBAR).not.toContain('helpLink');
  });

  it('is not the same thing as dead CSS, which is why nothing was deleted', () => {
    /*
      `.helpLink` DOES ship — but never alone. It shares both of its rules with `.sidebar-menu` and
      `.users`, which this navbar renders, so removing the selector would edit a captured sheet for
      a class that costs nothing. Read, not assumed.
    */
    const at = CAPTURED_SHEET.indexOf('.helpLink');
    expect(at, 'the captured rule must exist for the slice below to test anything').toBeGreaterThan(
      -1
    );
    const rule = CAPTURED_SHEET.slice(CAPTURED_SHEET.lastIndexOf('\n', at) + 1, at);
    expect(rule).toContain('.sidebar-menu');
    expect(rule).toContain('.users');
  });
});

/**
 * RNB-02 — TAWK Support is node 30 and the volume dropdown is node 31.
 *
 * Read from `U4e`'s node list at byte 2,485,567, decoded rather than counted:
 *
 * ```js
 * (29,f4e,5,0,"li",101)(30,m4e,5,0,"li",102),d(31,"li",103)
 * 101 ["title","Session Control","data-bs-toggle","modal", … ,1,"nav-item"]   @ 2,539,218
 * 102 ["title","TAWK Support",1,"nav-item"]                                   @ 2,539,326
 * 103 [1,"nav-item","dropdown","dropstart"]                                   @ 2,539,364
 * ```
 *
 * This bar rendered Session Control, then the Volume dropdown, then TAWK. Both orders draw the same
 * six items, so nothing was broken; what differs is WHERE the support control lands relative to the
 * volume control on a bar whose items are laid out `ml-auto` from the right. A presenter reaching
 * for TAWK on this room had to pass over Volume, and on the reference did not.
 *
 * A pure move — twenty-six lines lifted and re-inserted, no edit to any of them — because the
 * component was at its ceiling and because a reorder that also rewrites the thing it moves is two
 * changes reviewed as one.
 */
describe('RNB-02 — the presenter block ends Session Control, TAWK, Volume, Reload', () => {
  const order = (needle: string) => {
    const at = NAVBAR.indexOf(needle);
    expect(at, `${needle} must be present for this ordering to mean anything`).toBeGreaterThan(-1);
    return at;
  };

  it('puts TAWK Support between Session Control and the volume dropdown', () => {
    const sessionControl = order('title="Session Control"');
    const tawk = order('title="TAWK Support"');
    const volume = order('class="nav-item dropdown dropstart"');
    const reload = order('title="Reload"');
    expect(sessionControl).toBeLessThan(tawk);
    expect(tawk).toBeLessThan(volume);
    expect(volume).toBeLessThan(reload);
  });

  it('did not change the item while moving it', () => {
    expect(NAVBAR).toContain(
      '<li title="TAWK Support" class="nav-item" onclick={ontoggletawksupport}>'
    );
    expect(NAVBAR).toContain('<span class="ml-2 mainNavItem">TAWK Support</span>');
  });
});

/**
 * RNB-03 — "You are not recording!" no longer nags a presenter whose microphone is muted.
 *
 * The reference's gate, byte 2,477,744, has five terms and this room had three:
 *
 * ```js
 * O(5, !sessData.recordingReminder || !e.recordingReminder || e.micDisabled ||
 *      e.mediaService.micMuted || (!roomState.isRecordingPaused && roomState.isRecording) ? -1 : 5)
 * ```
 *
 * `micMuted` is the one that was missing and the one that matters: the reminder exists to catch a
 * presenter who started talking without pressing record, and a presenter with the microphone muted
 * is not talking. It fired at them anyway, over the recording menu, every time the room re-rendered.
 *
 * `micDisabled` is deliberately NOT added, and the reason is in the bundle rather than in taste. The
 * only thing that sets it is the `audioServerDisableMic` subscriber at byte 2,503,063, and that
 * handler's very next statement is `this.recordingReminder=!1`. So the fourth term is already
 * implied by the second on the only path that can reach it; adding it here would model a signal this
 * room does not have (`G11`, `lib/room/local-capture.svelte.ts`) to re-check something already false.
 */
describe('RNB-03 — the recording reminder reads the microphone', () => {
  it('carries the micMuted term, in the reference s own shape', () => {
    expect(NAVBAR).toContain(
      '{#if recordingReminderAllowed && media.recordingReminder && !media.micMuted && (!media.recording || media.recordingPaused)}'
    );
  });

  it('keeps the reminder markup it gates, so the gate is not guarding nothing', () => {
    expect(NAVBAR).toContain('<div class="recording-reminder">');
    expect(NAVBAR).toContain('<span>You are not recording!</span>');
  });

  it('reads the same disable handler that makes micDisabled redundant', () => {
    const handler = 'this.micDisabled=!0,this.recordingReminder=!1';
    expect(BUNDLE.slice(2_503_063, 2_503_063 + handler.length)).toBe(handler);
  });
});

/**
 * RNB-04 and RNB-05 — the two items at the tail of the recording menu that are OURS.
 *
 * `KPe` (byte 2,475,295) is the reference's whole preview block: a `<li>` holding an `<hr>`, then a
 * `<li class="nav-item">` holding one of two anchors — `" Hide Rec Preview "` (byte 2,475,111) or
 * `" Show Rec Preview"` (byte 2,475,265), whose asymmetric spacing this room already transcribes.
 * Its gate, byte 2,476,206, is `isRecording && sessData.recPreviewLocation`.
 *
 * **RNB-04.** `recPreviewLocation` arrives from the server as a `setRecPreview` message (byte
 * 1,023,752, `this.globals.sessData.recPreviewLocation=i.url`) pointing at a still frame the RECORDER
 * writes while it runs. There is no such producer here — `lib/room/recording.ts` records the refusal
 * — so this room gates the item on `media.recordedUrl` instead, which is the local blob and exists
 * only AFTER the recording stops. Same control, different moment, and it is the only moment this
 * room can offer.
 *
 * **RNB-05.** `Download Recording` occurs ZERO times in the bundle. That is a measured absence, not
 * a failed search: the sibling label `" Show Rec Preview"` from the very same menu is found at
 * 2,475,265, so the method finds this menu's strings when they are there. The item is ours because
 * the recording is ours — upstream records server-side through MTX or a record bot and has no blob
 * in the browser to save, while this room's `MediaRecorder` produces one that is otherwise lost when
 * the tab closes.
 */
describe('RNB-04 and RNB-05 — the recording menu tail, and which half of it is ours', () => {
  it('transcribes the reference s two preview labels exactly, spacing included', () => {
    expect(NAVBAR).toContain("' Hide Rec Preview '");
    expect(NAVBAR).toContain("' Show Rec Preview'");
  });

  it('gates the preview on the local recording, which is what this room has', () => {
    expect(NAVBAR).toContain('{#if media.recordedUrl}');
    expect(NAVBAR).toContain('media.recPreviewOpen ? onhiderecpreview : onshowrecpreview');
  });

  it('measures the absence of Download Recording with a control from the same menu', () => {
    expect(BUNDLE.split('Download Recording').length - 1).toBe(0);
    expect(BUNDLE.split(' Show Rec Preview').length - 1).toBe(1);
    // …and it is ours, rendered, with a consumer.
    expect(NAVBAR).toContain('Download Recording');
    expect(NAVBAR).toContain('onclick={ondownloadrecording}');
  });
});

/**
 * ROV-01 — the success flash renders its tick BEFORE the word, and with the capture's spaces.
 *
 * `app-room`'s template, byte 2,547,023:
 *
 * ```js
 * H(7,iRe,3,0,"div",9),d(8,"div",10),T(9,"i",11),v(10," Conected\n"),u()
 *  9 [1,"notConnectedOverlay","animated","fadeIn"]
 * 10 ["id","connectedMsg",1,"notConnectedOverlay","animated","fadeIn"]   @ 2,533,614
 * 11 [1,"fas","fa-check"]                                                @ 2,533,680
 * ```
 *
 * `T(9,"i",11)` is node 9 and `v(10, …)` is node 10, so the check mark comes first and the text is
 * ` Conected\n` — a leading space and a trailing newline. This room rendered `Conected` and then the
 * icon, which puts the tick on the wrong side of a three-second flash nobody gets to re-read.
 *
 * The string is written as an expression for the reason every captured string in this repository is:
 * Svelte normalises whitespace at element boundaries, and the spaces are evidence. `G03` already
 * argued the same point for ` Reconnecting Chat... ` one element up.
 */
describe('ROV-01 — the "Conected" flash', () => {
  it('renders the tick first and the captured string second', () => {
    expect(OVERLAYS).toContain('<i class="fas fa-check"></i>{\' Conected\\n\'}');
  });

  it('leaves the two overlays as two elements, which G03 already settled', () => {
    expect(OVERLAYS).toContain('id="connectedMsg"');
    expect(OVERLAYS).toContain("{' Reconnecting Chat... '}");
    expect(OVERLAYS.match(/notConnectedOverlay/g)).toHaveLength(2);
  });
});

/**
 * ROV-02 — the lightbox had no maximum height, because its three rules are scoped to a component it
 * is not inside.
 *
 * The capture puts `.imgur-modal` in the MESSAGE component's encapsulated block (byte 1,364,894),
 * and the generated transcription keeps that scoping honestly, as `app-st-message .imgur-modal …`.
 * Phase 5 slice 17 moved this room's lightbox to the overlay LAYER, where it is a sibling of
 * `app-st-message` and never a descendant, so all three selectors missed.
 *
 * The third is the one a member notices: without `max-height: calc(100vh - 150px)` a tall screenshot
 * opened from chat renders at its natural height and takes the close button off the bottom of the
 * screen with it.
 *
 * Rewritten in `app.css` rather than in the generated file, which is generated. Scoped
 * `.bootbox.imgur-modal` — three classes — so it beats Bootstrap's own `.modal-lg` on the dialog
 * without a `!important`, which is the arithmetic and not a preference.
 */
describe('ROV-02 — the image lightbox gets the geometry the capture gives it', () => {
  it('still finds the captured rule where this row says it is', () => {
    expect(GENERATED_CSS).toContain('app-st-message .imgur-modal:not(:root) img:not(:root)');
    expect(GENERATED_CSS).toContain('max-height: calc(-150px + 100vh)');
  });

  it('renders the lightbox outside app-st-message, which is why that rule misses', () => {
    expect(LIGHTBOX).toContain('class="bootbox modal fade imgur-modal show"');
    expect(OVERLAYS).not.toContain('app-st-message');
  });

  it('carries the three rules on a selector that matches what is rendered', () => {
    expect(APP_CSS).toContain('.bootbox.imgur-modal {');
    expect(APP_CSS).toContain('.bootbox.imgur-modal .modal-dialog {');
    expect(APP_CSS).toContain('.bootbox.imgur-modal img {');
    expect(APP_CSS).toContain('max-height: calc(100vh - 150px);');
    expect(APP_CSS).toContain('max-width: 90%;');
  });
});

/**
 * ROV-03 — what the pinned bundle does NOT settle about the chat-image lightbox, stated rather than
 * guessed.
 *
 * The markup that opens it is an inline handler inside a template string (byte 1,326,388):
 *
 * ```js
 * `<div class="img-container ${l?"d-none":""}" onclick="openImageModal(event,'${a}')"> …`
 * ```
 *
 * `openImageModal` occurs exactly ONCE in 2,891,205 bytes — that call — and there is no declaration
 * anywhere. Neither is there markup wearing `.imgur-modal`: the class appears only inside component
 * stylesheets. So this bundle does not contain the viewer that handler opens.
 *
 * **That is not the same as saying it does not exist**, and every sentence above is still true of
 * the BUNDLE. What was wrong is the next step: the declaration was looked for in one file.
 *
 * ## UNBLOCKED 2026-09-02 — it is in `deployed-index.html`, which this file already reads
 *
 * `openImageModal` is defined at `deployed-index.html` line 70, inline, with the whole
 * `bootbox.dialog({…})` at lines 106-123 and its `downloadImage(url, imageName)` at 125-145. The
 * file is 159 lines, sits in the same pinned directory as the bundle, and is listed in that
 * directory's `sha256sums.txt` as `d1f84087…6ae9a220`.
 *
 * **This test already had it in a constant.** `DEPLOYED_INDEX` was read only for the four
 * `<script src>` tags in the assertion below — the file's `<script>` BODY was never looked at. That
 * is the same failure as RTE-05's in the same pass, one level in: a sweep of one file reported as a
 * sweep of the evidence, by a test whose own fixture held the answer.
 *
 * It was also already refuted by this room's own code: `RoomModals.openImage` is a transcription of
 * this exact declaration, popped-out-window branch and all, and `routes/+page.svelte` assigns it to
 * `window.openImageModal` — the global name the captured page defines for its inline handlers.
 * Somebody built the function from this file while this row recorded the file as not holding it.
 *
 * So `ImageLightbox.svelte` is `openImageModal`'s dialog and was documented as
 * `showImagePreview`'s. The visible consequence was its `alt`, corrected with this row.
 */
describe('ROV-03 — the viewer the pinned CHUNK does not contain, and the pinned INDEX does', () => {
  it('finds the call and no declaration IN THE BUNDLE, and says which is which', () => {
    expect(BUNDLE.split('openImageModal').length - 1).toBe(1);
    expect(BUNDLE.indexOf('onclick="openImageModal(event,')).toBe(1_326_388);
    expect(BUNDLE.indexOf('function openImageModal')).toBe(-1);
    expect(BUNDLE.indexOf('openImageModal=')).toBe(-1);
  });

  it('has a control that proves a declaration WOULD have been found', () => {
    expect(BUNDLE.split('showImagePreview').length - 1).toBe(5);
    expect(BUNDLE.indexOf('showImagePreview(e,i=""){e&&bootbox.dialog(')).toBe(1_992_730);
  });

  it('names the three chunks this checkout does not have, so the absence is bounded', () => {
    expect(DEPLOYED_INDEX).toContain('src="main.d1d09071be31f1ba.js"');
    expect(DEPLOYED_INDEX).toContain('src="runtime.b70e5d3ff558bfdf.js"');
    expect(DEPLOYED_INDEX).toContain('src="polyfills.95db17d6d6f4b89d.js"');
    expect(DEPLOYED_INDEX).toContain('src="scripts.38973a242454fb27.js"');
  });

  it('AND FINDS THE DECLARATION in the index this file was already holding', () => {
    /*
      The assertion this describe block was missing for the whole of its life. It read
      `DEPLOYED_INDEX` for four `<script src>` attributes and never for its inline body, which is
      where the answer was.
    */
    expect(DEPLOYED_INDEX).toContain('function openImageModal(event, url) {');
    expect(DEPLOYED_INDEX).toContain("var imageName = url.substring(url.lastIndexOf('/') + 1);");
    expect(DEPLOYED_INDEX).toContain("className: 'imgur-modal',");
  });

  it('and the lightbox renders what that declaration writes, `alt` included', () => {
    /*
      `'<img src="' + url + '" alt="' + imageName + '" /><hr><button class="btn btn-primary btn-sm"…'`

      The `alt` is the FILENAME. This component computed exactly that until 2026-08-31, when it was
      changed to the whole URL as "a preference substituted for a captured value" — citing
      `showImagePreview`, which is the OTHER viewer and does use the whole URL. Right rule, wrong
      dialog.

      The `<hr>` and the in-body button were recorded as this room's invention and "not evidence of
      anything". They are the reference's, and its class list is `btn btn-primary btn-sm` — which is
      what was already written here, so the guess was right and is now evidence.
    */
    expect(LIGHTBOX).toContain('alt={imageName}');
    expect(LIGHTBOX).toContain("url.substring(url.lastIndexOf('/') + 1)");
    expect(LIGHTBOX, 'the alt went back to the other viewer’s value').not.toContain('alt={url}');
    expect(LIGHTBOX).toContain('<hr />');
    expect(LIGHTBOX).toContain('class="btn btn-primary btn-sm"');
  });
});

/**
 * ROV-04 — the lightbox calls itself a bootbox and renders no backdrop.
 *
 * Every other dialog in this room gets one: `BootboxDialog.svelte` renders
 * `<div class="modal-backdrop fade show"></div>` as its last node, because that is what bootbox
 * emits and what `.modal-backdrop`'s `z-index: 1050` is for. The lightbox wears
 * `bootbox modal fade imgur-modal show` and has no backdrop at all, so it opens over an undimmed
 * room — and `showImagePreview` (byte 1,992,730), the only image viewer the pinned bundle contains,
 * is a plain `bootbox.dialog({…})` and therefore has one.
 *
 * BUILT 2026-08-31, and the block below is INVERTED rather than deleted — it used to assert the
 * absence, and it now asserts the presence.
 *
 * **The blocker this batch recorded was real on the day and was gone by the time it was read
 * again.** It said the backdrop was blocked behind lifting the lightbox out of `RoomOverlays.svelte`
 * (1081 of 1081, ceilings only going down) into its own component, "which is not this batch's work".
 * That extraction happened the same day for `dta-02`: `ImageLightbox.svelte` exists, is 94 lines,
 * and carries `class="bootbox modal fade imgur-modal show"` at its root. The one line the row was
 * waiting on had nothing left in its way.
 *
 * Worth naming, because it is the second stale blocker found in this register in one session: a row
 * that says "blocked behind X" goes stale the moment somebody does X for an unrelated reason, and
 * nothing re-reads it. The measurement, not the row, is what decides.
 */
describe('ROV-04 — the backdrop the lightbox opened without', () => {
  it('shows the room s own bootbox rendering a backdrop', () => {
    expect(BOOTBOX).toContain('<div class="modal-backdrop fade show"></div>');
  });

  it('and the lightbox, which claims bootbox, now renders the identical element', () => {
    expect(LIGHTBOX).toContain('class="bootbox modal fade imgur-modal show"');
    expect(LIGHTBOX).toContain('<div class="modal-backdrop fade show"></div>');
  });

  it('as a SIBLING after the dialog, which is what the app.css rule selects on', () => {
    /*
      `app.css` selects `.bootbox.modal.above-note-modal + .modal-backdrop` — an adjacent-sibling
      combinator. A backdrop nested inside the dialog satisfies `toContain` and falls silently out
      of that rule, so the assertion is on the ORDER rather than on the presence: the backdrop's
      offset is past the dialog root's closing tag, which is the same shape `BootboxDialog` has.

      Anchored on locals rather than inlined, because `slice-anchor-contract` refuses the inline
      form and because a `-1` from either `indexOf` would otherwise make this pass by arithmetic.
    */
    const dialog = LIGHTBOX.indexOf('class="bootbox modal fade imgur-modal show"');
    const backdrop = LIGHTBOX.indexOf('<div class="modal-backdrop fade show"></div>');
    expect(dialog, 'the lightbox dialog root is missing').toBeGreaterThan(-1);
    expect(backdrop, 'the lightbox backdrop is missing').toBeGreaterThan(-1);
    expect(backdrop).toBeGreaterThan(dialog);
    /* It is the LAST node, so nothing was appended after it that would break the combinator. */
    expect(LIGHTBOX.trimEnd().endsWith('<div class="modal-backdrop fade show"></div>')).toBe(true);
  });

  it('and RoomOverlays still renders no backdrop of its own', () => {
    /*
      Kept from the original block, with its meaning changed by the move: it used to record the
      lightbox's absence (the markup was inline there), and it now guards against a SECOND backdrop
      being added at the call site beside the component's own. Two backdrops dim twice.
    */
    expect(OVERLAYS).not.toContain('modal-backdrop');
  });
});

/**
 * ECP-01 — the second chat column had no name when the room has no channels.
 *
 * `app-extra-chat`'s brand anchor is three nodes (byte 2,399,335):
 * `T(4,"i",10), H(5,j3e,2,0,"span")(6,V3e,3,0,"span",11)` — the comment glyph, then the label, then
 * the DND badge. `j3e` (byte 2,367,398) is `<span>\xa0Chat</span>` and its gate is
 * `O(5, 0 == o.chatTabs.length ? 5 : -1)` at byte 2,399,848.
 *
 * This is `acA-11` exactly, one column over. The main pane has carried both halves since that row —
 * the label AND `ChatTabStrip` suppressing its own `<ul>` at zero tabs — and the extra column got
 * the second half and not the first, because `ChatTabStrip` is shared and the label is not. So a
 * room with no channels configured drew a comment glyph on the left column with the word "Chat"
 * beside it and a bare glyph on the right one.
 *
 * `&nbsp;` and not a space: it is `\xa0` in the capture, and a plain space is collapsed away by the
 * surrounding whitespace.
 */
describe('ECP-01 — the extra column names itself when there is no tab strip', () => {
  it('renders the label under the reference s own gate', () => {
    expect(EXTRA_CHAT).toContain('{#if chatTabs.length === 0}<span>&nbsp;Chat</span>{/if}');
  });

  it('keeps it in the captured order — icon, label, DND badge', () => {
    const icon = EXTRA_CHAT.indexOf('<i class="fas fa-comment"></i>');
    const label = EXTRA_CHAT.indexOf('<span>&nbsp;Chat</span>');
    const dnd = EXTRA_CHAT.indexOf('badge badge-danger ml-2');
    expect(icon).toBeGreaterThan(-1);
    expect(icon).toBeLessThan(label);
    expect(label).toBeLessThan(dnd);
  });

  it('matches the main column, which is the control for this row', () => {
    expect(MAIN_CHAT).toContain('{#if chatTabs.length === 0}<span>&nbsp;Chat</span>{/if}');
  });
});

/**
 * ECP-02 — the composer/Chat Disabled swap reads only half of its gate.
 *
 * `O(23, o.isConnected && o.chatEnabled ? 23 : 24)` at byte 2,400,361: slot 23 is the composer,
 * slot 24 is the Chat Disabled block. `isConnected` starts TRUE (byte 2,375,326) and is driven by
 * two subscriptions — `socketDisconnected` sets it false at byte 2,376,472, `socketConnected` sets
 * it true. So upstream, a chat connection that drops takes the composer away and says why.
 *
 * Both of this room's chat columns gate on `chatEnabled` alone, so a member whose channel has
 * dropped keeps a live-looking composer, types into it, presses Enter and watches nothing happen —
 * with only the small ` Reconnecting Chat... ` corner overlay to explain it.
 *
 * **BUILT 2026-08-31, and this block is INVERTED rather than deleted** — it asserted the absence and
 * now asserts the presence. The row's diagnosis was exactly right, including the design: it named
 * the STARTING VALUE as the real obstacle rather than the line budget, and named the fix as a second
 * field starting true and following the same two events. That is what was built.
 *
 * `RoomEventStream.chatChannelUp` starts TRUE, goes false on `error` and true on `open` — the same
 * two handlers that already move the sidebar's flag, so the pair cannot drift. Both columns take it
 * as a prop defaulting TRUE and gate `{#if !chatEnabled || !chatChannelUp}`.
 *
 * TWO FIELDS FOR ONE CHANNEL, and the last case below is why. `connected` answers *has this ever
 * opened?* and must start FALSE, or the sidebar claims a connection it does not have.
 * `chatChannelUp` answers *has it DROPPED?* and must start TRUE, or every composer in the room reads
 * "Chat Disabled" on first paint for the duration of one connect. The difference is one initial
 * value, which is exactly why a later reader will try to merge them.
 *
 * Both columns, in one change. This block reported the sibling rather than silently editing it,
 * because that batch's scope was the extra column — and fixing one while leaving the other is how
 * the pair drifted to begin with.
 */
describe('ECP-02 — the connection half of the composer gate, now built in both columns', () => {
  it('shows both columns quoting the whole expression', () => {
    const quoted = 'O(23, o.isConnected && o.chatEnabled ? 23 : 24)';
    expect(read('lib/components/ExtraChatPane.svelte')).toContain(quoted);
    expect(read('lib/components/AlertChatArea.svelte')).toContain(quoted);
  });

  it('and both implementing BOTH halves of it now', () => {
    expect(EXTRA_CHAT).toContain('{#if !chatEnabled || !chatChannelUp}');
    expect(MAIN_CHAT).toContain('{#if !chatEnabled || !chatChannelUp}');
    /*
      The prop defaults TRUE in both, which is `this.isConnected=!0` at byte 2,375,326. `false` here
      would announce that chat is off in every render that omits the prop — the same defect arrived
      at from the other side.
    */
    expect(EXTRA_CHAT).toContain('chatChannelUp = true,');
    expect(MAIN_CHAT).toContain('chatChannelUp = true,');
  });

  it('and the stream carries TWO answers about one channel, which start differently', () => {
    /*
      Both, in one assertion, because the pair is the point: either starting value alone is wrong for
      the other reader. `events.svelte.test.ts` executes the disagreement — reads both at the same
      instant before any event — and this pins the declarations that produce it, so a merge cannot
      pass by making them agree.
    */
    expect(EVENTS).toContain('this.#roomEventsConnected = $state(false);');
    expect(EVENTS).toContain('this.#chatChannelUp = $state(true);');
    expect(EVENTS).toContain('get connected(): boolean {');
    expect(EVENTS).toContain('get chatChannelUp(): boolean {');
  });
});

/**
 * ECP-03 — the header's search and settings toggles bind their click on the `<li>`.
 *
 * Decoded by value from `app-extra-chat`'s own table, and the pairing is the whole row:
 *
 * ```
 * 15 [1,"nav-item","mx-1",3,"click"]                                        @ 2,394,394
 * 16 ["title","Search",1,"nav-link","p-0"]                                  @ 2,394,426
 * 18 [1,"nav-item","dropdown","ml-2",2,"position","static",3,"click"]       @ 2,394,486
 * 19 ["aria-haspopup","true","aria-expanded","false",1,"nav-link", … ]      @ 2,394,551
 * ```
 *
 * Consts 15 and 18 carry `3,"click"`; consts 16 and 19 declare no bindings at all. The template
 * confirms it — `d(10,"li",15),x("click", … toggleChatToolbarSearchOnly())` at byte 2,399,435 and
 * `d(13,"li",18),x("click", … toggleChatToolbar())` at 2,399,551 — the handler is on the list item
 * and the anchor inside it is inert.
 *
 * This room had both handlers on the `<a>`. The anchor is `p-0` and the `<li>` is not, so every
 * pixel of the row's own box outside the glyph was dead, and `.chatHeader` gives that box real
 * height. `acA-12` is the same finding on the alerts toolbar and `NP-02` on the notes tab strip;
 * this is the third and it is transcribed rather than re-argued.
 *
 * The a11y suppressions move WITH the handler — `no_noninteractive_element_interactions` for a
 * `<li>`, where the anchor needed `no_static_element_interactions` — because a suppression that
 * outlives the thing it suppresses is a lie the compiler cannot catch.
 */
describe('ECP-03 — the click is on the list item, as the consts say', () => {
  it('binds the search toggle on the li', () => {
    expect(EXTRA_CHAT).toContain('<li class="nav-item mx-1" onclick={onsearch}>');
    expect(EXTRA_CHAT).toContain('<a title="Search" class="nav-link p-0">');
  });

  it('binds the settings gear on the li', () => {
    expect(EXTRA_CHAT).toContain(
      '<li class="nav-item dropdown ml-2" style="position: static;" onclick={ontoggletoolbar}>'
    );
    expect(EXTRA_CHAT).toContain(
      '<a aria-haspopup="true" aria-expanded="false" class="nav-link dropdown-toggle p-0">'
    );
  });

  it('leaves no click on either anchor, which is what const 16 and const 19 say', () => {
    expect(EXTRA_CHAT).not.toContain('class="nav-link p-0" onclick=');
    expect(EXTRA_CHAT).not.toContain(
      'class="nav-link dropdown-toggle p-0"\n              onclick='
    );
  });
});

/**
 * ECP-04 — one id in the capture, two ids here, and a stylesheet that followed neither.
 *
 * The two composer holders decode BYTE-IDENTICALLY — `app-chat`'s const 25 at byte 1,448,754 and
 * `app-extra-chat`'s const 25 at byte 2,394,929 are both
 * `["id","textAreaHolder",1,"d-flex","align-items-center","textSendDiv"]`. Upstream renders the same
 * id twice and Angular's emulated encapsulation keeps the two rules apart: the captured sheet has
 * four `#textAreaHolder[_ngcontent-…]` variants, one per component, and gives the private-chat
 * composer a different id outright.
 *
 * ## TWO FIXES EXISTED FOR THIS, AND THE OTHER ONE IS THE ONE THAT SHIPPED
 *
 * `ExtraChatPane` used to diverge to `#textAreaHolderExtra`, and this batch's original assertions
 * required every `#textAreaHolder` rule to grow an `#textAreaHolderExtra` twin — duplicating nine
 * selectors so the second column got its styling back.
 *
 * A parallel batch had already fixed the same defect by **removing the suffix**:
 * `EXTRA_CHAT_COMPOSER_HOLDER_ID` is `'textAreaHolder'`, the capture's own id from const 25, argued
 * in `extra-chat-surface.ts` and cited at the markup. That fix is strictly better and it is what is
 * on this branch, so the twin assertions were retargeted rather than merged: keeping them would have
 * demanded ten selectors matching **no element in this application**. CSS with no element is the
 * same defect as an element with no CSS, read from the other side — and it is the one a sweep-style
 * assertion actively pushes you toward, because a sweep is satisfied by adding selectors.
 *
 * The behavioural half is worth keeping in view: the missing rule that mattered was not a radius or
 * a margin, it was `container-type`. The composer's two `@container` queries resolved against
 * nothing, so both button sets rendered at every width and pressing "+" only hid "+".
 *
 * `.textSendDiv` — which both holders wear — was not used as the shared hook, because the
 * private-chat composer wears it too and upstream gives that one deliberately different margins.
 */
describe('ECP-04 — the second composer holder is styled', () => {
  it("renders the capture's OWN id in both columns, so one rule set serves both", () => {
    /*
      Both consts decode byte-identically upstream — `["id","textAreaHolder",1,"d-flex",…]` at
      1,448,754 and 2,394,929 — so rendering the same id twice IS the transcription. Angular kept the
      two apart with encapsulation attributes; this sheet is global and does not need to.
    */
    expect(EXTRA_CHAT).toContain('id={EXTRA_CHAT_COMPOSER_HOLDER_ID}');
    expect(read('lib/extra-chat-surface.ts')).toContain(
      "export const EXTRA_CHAT_COMPOSER_HOLDER_ID = 'textAreaHolder';"
    );
    expect(MAIN_CHAT).toContain(
      '<div id="textAreaHolder" class="d-flex align-items-center textSendDiv">'
    );
  });

  it('leaves NO #textAreaHolderExtra selector behind, because nothing renders that id', () => {
    /*
      The assertion that replaces the twin sweep, and it guards the opposite failure. A selector for
      an id no component renders is dead CSS, and this is exactly where it would come from: the other
      fix for this defect adds ten of them, and a sweep demanding twins would have required it.

      Prose may name the id — the rule block above explains why the divergence is gone — so this
      reads SELECTORS, not the file.
    */
    const selectors = APP_CSS.split('\n')
      .map((line) => line.trim())
      .filter((line) => line.endsWith(',') || line.endsWith('{'));
    expect(
      selectors.filter((line) => line.includes('#textAreaHolderExtra')),
      'these selectors match no element in this application'
    ).toEqual([]);
  });

  it('still has the rules the second column needs, keyed on the shared id', () => {
    /* The vacuity floor: "no Extra selectors" is trivially true if the rules were deleted. */
    const selectors = APP_CSS.split('\n')
      .map((line) => line.trim())
      .filter(
        (line) => line.includes('#textAreaHolder') && (line.endsWith(',') || line.endsWith('{'))
      );
    expect(selectors.length, 'the #textAreaHolder rules must still exist').toBeGreaterThan(8);
    expect(APP_CSS, 'the container-type is the rule whose absence broke behaviour').toContain(
      'container-type'
    );
  });

  it('keeps the private-chat composer out of it, which is why .textSendDiv was not used', () => {
    expect(read('lib/components/PrivateChatComposer.svelte')).toContain('id="textAreaHolderPM"');
    expect(APP_CSS).not.toContain('.textSendDiv {');
  });
});
