import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * `STV-01` … `STV-10`, `DTP-01` … `DTP-05` and `SWP-01` … `SWP-06` — the HLS player and the two
 * trade-alert PANES, read end to end against the pinned v4 bundle on 2026-08-31.
 *
 * ## What this file is for, and why it is one file for three surfaces
 *
 * Those twenty-one rows rest on a hundred and thirteen byte offsets, and **an offset is the one
 * kind of evidence in this repository that rots without anybody touching it**: the bundle is
 * SHA-256 pinned so the bytes cannot move, but a comment that cites the wrong byte reads exactly
 * like one that cites the right one. `SWF-02` is the standing example — a citation that landed
 * 57 KB from the line it quoted, on bytes that were *about the same subject*, and survived two
 * adversarial verifiers. `DTP-01` is the same shape twice more, found only because this batch
 * re-derived every citation instead of spot-checking.
 *
 * So this asserts every one of them AT its offset, and it discovers its own subjects: the table
 * below is checked to COVER every byte citation in the three surface files and in the three
 * register sections, so a citation added later without a pin fails here rather than going quietly
 * unverified. That is the catalog-driven shape `apps/room/AGENTS.md` rule 4 asks for — a test that
 * finds the next subject without anyone remembering to add it.
 *
 * The three surfaces share a file because they share a table: `DayTradeAlertsPane` and
 * `SwingAlertsPane` are two halves of one component upstream (`app-presentationarea`, one 292-entry
 * `consts` table at 1,994,264) and `StreamingView` is the surface whose rows keep pointing back
 * into the same reading session. Three files would mean three copies of the bundle read.
 *
 * ## Offsets are byte offsets, and that is measured rather than assumed
 *
 * `main.d1d09071be31f1ba.js` is byte-for-byte ASCII: `readFileSync(path).length`,
 * `readFileSync(path, 'utf8').length` and `Buffer.byteLength(text, 'utf8')` are all 2,891,205. So a
 * JavaScript string index into it IS a byte offset, and the universal-newline hazard that shifts
 * every offset after the first CRLF cannot arise for this artefact. The length assertion below is
 * the vacuity floor for everything after it — at the wrong file every `startsWith` fails loudly
 * instead of every `indexOf` returning -1 quietly.
 */

const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');

const BUNDLE = read('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js');

const player = read('./components/StreamingView.svelte');
const dayPane = read('./components/day-trade-alerts/DayTradeAlertsPane.svelte');
const swingPane = read('./components/swing-alerts/SwingAlertsPane.svelte');

const playerCode = codeOf('components/StreamingView.svelte', player);
const dayPaneCode = codeOf('components/day-trade-alerts/DayTradeAlertsPane.svelte', dayPane);
const swingPaneCode = codeOf('components/swing-alerts/SwingAlertsPane.svelte', swingPane);

const AUDIT = readFileSync(
  new URL('../../../../docs/decoded/room-surface-audit-2026-08-30.md', import.meta.url),
  'utf8'
);

/** The three sections this batch appended, sliced off the end rather than searched for a needle. */
const MY_SECTIONS = (() => {
  const start = AUDIT.indexOf('\n## StreamingView.svelte\n');
  expect(start, 'the `## StreamingView.svelte` section is missing or was renamed').toBeGreaterThan(
    -1
  );
  return AUDIT.slice(start);
})();

/**
 * Every byte offset the twenty-one rows and the three surfaces cite, with the bytes that must be
 * there.
 *
 * Each prefix was grown until it was UNIQUE in the bundle where uniqueness is achievable, so a
 * transposed offset cannot pass by landing on a common minifier idiom. Four of them are genuinely
 * not unique and are marked where they occur: `detachScreen(){…}` is byte-identical in
 * `app-screenshare-view` and `app-streaming-view` — which is `STV-08`'s whole point — and the
 * symbol/date interpolation run is byte-identical in the two panes, which is `DTP-02`/`SWP-01`'s.
 */
const CITED: ReadonlyArray<readonly [number, string]> = [
  [100_136, 'function Li(t,n){return '],
  [996_829, 'preferenceChanged",{key:"profilePic",value:xe.pr'],
  [1_025_558, 'preferenceChanged",{key:"profilePic",value:i.pro'],
  [1_155_143, 'setPreference(e,i){this.'],
  [1_155_238, 'preferenceChanged",{key:e,valu'],
  [1_492_806, 'reAttachScren())}),v(1,"'],
  [1_495_434, 'reAttachScren()}),this.a'],
  [1_499_638, 'reAttachScren(){this.isD'],
  [
    1_499_713,
    'detachScreen(){this.isDetached=!0,this.stopWatchScreenOf(this.muser._id),this.popoutServic'
  ],
  [1_901_122, 'const SCe=["videoPlayer"'],
  [1_901_148, 'function wCe(t,n){1&t&&('],
  [1_901_632, 'let xCe=(()=>{class t{co'],
  [1_902_027, 'this.BUFFER_CHECK_WINDOW=3e4,t'],
  [1_902_104, 'this.MAX_RECOVERY_ATTEMPTS=2,t'],
  [1_902_159, 'ngOnInit(){console.log("'],
  [1_902_321, 'preferenceChanged",e=>{"'],
  [1_902_616, 'cleanup(){this.retryTime'],
  [1_902_786, 'getHlsConfig(){const e=t'],
  [1_903_977, 'setupStream(){let e=`roo'],
  [1_904_378, 'loadStream(){const e=thi'],
  [1_904_725, 'startPerformanceMonitoring(){!'],
  [1_904_918, 'checkAndAdaptPerformance(){if('],
  [1_905_469, 'adaptToPerformanceIssues(){if('],
  [1_906_064, 'setupHlsEventListeners(e){this'],
  [1_906_919, 'handleFatalError(e){this'],
  [1_907_122, 'setupNativeHLS(e){e.src='],
  [1_907_373, 'toggleFullscreen(){const'],
  [1_907_652, 'toggleMute(){this.isMute'],
  [1_907_778, 'onVolumeChange(e){this.v'],
  [1_907_934, 'newScreenStream(e){conso'],
  [1_908_109, 'startWatchScreenOf(e){}s'],
  [1_908_132, 'stopWatchScreenOf(e){}re'],
  [1_908_154, 'reAttachScreen(){this.is'],
  [
    1_908_230,
    'detachScreen(){this.isDetached=!0,this.stopWatchScreenOf(this.muser._id),this.popoutServic'
  ],
  [1_908_449, 'getBufferSizeName(){swit'],
  [1_908_582, 'setBufferSize(e){e<1||e>'],
  [1_909_054, '[["videoPlayer",""],[1,"'],
  [1_909_111, '["autoplay","autoplay",1,"vide'],
  [1_909_288, '["type","button","id","b'],
  [1_909_708, '],template:function(i,o){if(1&i){const s=Y();d(0,"div",1),H('],
  [1_910_654, 'Ne(" Buffer: ",o.getBuff'],
  [1_910_939, 'styles:[".video-streamin'],
  [1_911_064, '#message[_ngcontent-%COM'],
  [1_912_909, '.controls-container[_ngc'],
  [1_914_468, '),MCe=(()=>{class t{tran'],
  [1_915_269, 'transform(e,i){return e?i?(i=i.toLowerCase(),e.filter(o=>o.s'],
  [1_916_549, 'zCe=()=>[1,2,3,4,5,6,7,8'],
  [1_916_610, 'GCe=t=>({"swing-symbol-c'],
  [1_916_648, 'WCe=()=>[1,2,3,4,5,6,7,8'],
  [1_916_694, 'qCe=t=>({"day-trade-symb'],
  [1_936_183, 'function pwe(t,n){if(1&t'],
  [1_936_289, 'function fwe(t,n){1&t&&('],
  [1_936_375, 'function mwe(t,n){if(1&t'],
  [1_936_683, 'function gwe(t,n){if(1&t'],
  [1_936_897, 'function _we(t,n){if(1&t'],
  [
    1_937_310,
    'm(2),Ne(" ",e.symbol," "),m(2),Ze(e.direction),m(2),Ne(" ",Ct(10,12,e.entryDate,"YYYY-MM-d'
  ],
  [1_937_634, 'function bwe(t,n){if(1&t'],
  [1_938_465, 'ht(32,_we,23,17,"tr",nul'],
  [1_938_750, 'function vwe(t,n){if(1&t'],
  [1_942_524, 'function kwe(t,n){if(1&t'],
  [1_942_630, 'function xwe(t,n){1&t&&('],
  [1_942_714, 'function Mwe(t,n){if(1&t'],
  [1_943_028, 'function Awe(t,n){if(1&t'],
  [1_943_242, 'function Pwe(t,n){if(1&t'],
  [
    1_943_655,
    'm(2),Ne(" ",e.symbol," "),m(2),Ze(e.direction),m(2),Ne(" ",Ct(10,12,e.entryDate,"YYYY-MM-d'
  ],
  [
    1_943_900,
    'secure.gravatar.com/avatar/"+e.senderAvt+"?d=mm&s=30",Mt)("alt",e.senderName)}}function Rw'
  ],
  [1_943_979, 'function Rwe(t,n){if(1&t'],
  [1_944_820, 'ht(32,Pwe,23,17,"tr",nul'],
  [1_945_024, 'Ct(35,5,Ct(34,2,e.appService.globals.dayTr'],
  [1_945_126, 'function Iwe(t,n){if(1&t'],
  [1_945_231, 'v(4," Latest Day Trade A'],
  [1_955_344, 'this.swingAlertMonths=2,'],
  [1_955_546, 'this.dayTradeAlertLimit='],
  [1_955_601, 'this.dayTradeAlertMonths=1,thi'],
  [1_987_661, 'this.clearDayTradeAlertFields()}})}c'],
  [1_989_236, 'downloadDayTrades(){cons'],
  [1_992_730, 'showImagePreview(e,i="")'],
  [1_994_264, '[["alertForm","ngForm"],'],
  [1_996_170, '["id","dayTradeAlerts","'],
  [2_004_878, '[1,"text-center","m-0","p-1","px-3"]'],
  [2_004_915, '[1,"form-select","form-s'],
  [2_005_040, '[1,"text-center","m-0","p-1","px-3",'],
  [2_008_042, '[1,"fas","fa-save"],["ty'],
  [2_008_343, '[3,"ngClass"],[1,"ms-2",'],
  [2_008_357, '[1,"ms-2","font-weight-b'],
  [2_008_387, '[1,"text-center","align-'],
  [2_008_503, '[1,"p-0"],[1,"mx-1","fon'],
  [2_008_513, '[1,"mx-1","font-weight-b'],
  [2_008_543, '[1,"alert-sender-img",3,'],
  [2_008_625, '[1,"fa","fa-trash"],[1,"'],
  [2_008_688, '[1,"fa","fa-edit"],["tit'],
  [2_008_707, '["title","Click to view image",1,"uploaded-alert-image",3,"c'],
  [2_008_829, '[1,"day-trade-alerts-con'],
  [2_010_306, '[1,"input-group","input-group-sm","d'],
  [2_010_386, '["type","number","step","5","min","0","id","dayT'],
  [2_014_220, '],template:function(i,o){1&i&&(d(0,"div",2'],
  [2_017_703, 'O(48,o.hasSwingTradeAler'],
  [2_017_741, 'O(49,o.hasDayTradeAlerts'],
  [2_022_161, '#dayTradeAlerts[_ngconte'],
  [2_022_363, '.download-day-trades-btn[_ngcontent-%COMP%], .do'],
  [2_022_557, '.download-day-trades-btn[_ngcontent-%COMP%]:hove'],
  [2_022_891, '.day-trade-symbol-contai'],
  [2_024_171, '.day-trade-alerts-container[_ngcontent-%COMP%]   .table[_ngcontent-%COMP%], .s'],
  [
    2_024_333,
    '.day-trade-alerts-container[_ngcontent-%COMP%]   .table[_ngcontent-%COMP%]   th[_ngc'
  ],
  [2_024_764, '.day-trade-alerts-container[_ngcontent-%COMP%]   h4[_n'],
  [2_024_836, '.swing-alerts-container[_ngcontent-%COMP%]   h4['],
  [
    2_024_939,
    '.day-trade-alerts-container[_ngcontent-%COMP%]   #dayTradeAlert-search[_ngcontent-%COMP%],'
  ],
  [
    2_025_489,
    '.day-trade-alerts-container[_ngcontent-%COMP%]   #dayTradeAlert-search[_ngcontent-%COMP%],'
  ],
  [2_025_854, '.day-trade-alerts-container[_ngcontent-%COMP%]   .dayT'],
  [2_026_319, '.alert-sender-img[_ngcon'],
  [2_026_556, '.uploaded-alert-image[_ngcontent-%COMP%]:h'],
  [2_026_976, '.img-fluid[_ngcontent-%C'],
  [2_031_534, '.trade-alerts-select[_ng']
];

/**
 * The two numbers `DTP-01` superseded, and the bundle's own length.
 *
 * They still appear in the register — in the prose that records the correction — so the coverage
 * assertion below has to know they are not offsets to pin. They are pinned in the opposite
 * direction instead: neither may reappear in a surface file.
 */
const SUPERSEDED = [2_017_748, 1_945_235] as const;
const BUNDLE_LENGTH = 2_891_205;

/** Every comma-grouped number that could be a byte offset, from any text this batch touched. */
const citedIn = (text: string) =>
  new Set(
    [...text.matchAll(/\b\d{1,3}(?:,\d{3})+\b/g)]
      .map((found) => Number(found[0].replaceAll(',', '')))
      .filter((value) => value >= 100_000)
  );

const count = (needle: string) => BUNDLE.split(needle).length - 1;

describe('the bundle these twenty-one rows were read from', () => {
  it('is the pinned one — the vacuity floor for every offset below', () => {
    expect(BUNDLE.length).toBe(BUNDLE_LENGTH);
  });

  it('is ASCII, so a string index into it is a byte offset', () => {
    /*
      Measured rather than assumed, because the alternative is silent: `io.open(…, encoding='utf-8')`
      and any universal-newline reader shift every offset after the first CRLF, and every assertion
      in this file would then be wrong by a constant nobody could see.
    */
    expect(
      Buffer.byteLength(BUNDLE, 'utf8'),
      'a UTF-8 byte count equal to the code-unit count IS the ASCII proof: any code point at or\n' +
        'above U+0080 costs at least two bytes, and a surrogate pair costs four for two units, so\n' +
        'equality can only hold when every character is below U+0080. A second regex check would be\n' +
        'the same fact spelled twice — and it needed a control character to say it, which `eslint`\n' +
        'refuses with `no-control-regex` and is right to.'
    ).toBe(BUNDLE.length);
  });
});

describe('every cited offset holds the bytes it is cited for', () => {
  it.each(CITED)('byte %d', (offset, expected) => {
    expect(
      BUNDLE.slice(offset, offset + expected.length),
      `byte ${offset.toLocaleString('en-US')} is not the start of what cites it`
    ).toBe(expected);
  });
});

describe('the table covers every citation, rather than the ones somebody remembered', () => {
  const pinned = new Set(CITED.map(([offset]) => offset));

  it.each([
    ['StreamingView.svelte', player],
    ['DayTradeAlertsPane.svelte', dayPane],
    ['SwingAlertsPane.svelte', swingPane],
    ['the three appended register sections', MY_SECTIONS]
  ])('pins every byte %s cites', (_name, text) => {
    const loose = [...citedIn(text)].filter(
      (value) =>
        !pinned.has(value) &&
        value !== BUNDLE_LENGTH &&
        !(SUPERSEDED as readonly number[]).includes(value)
    );
    expect(
      loose.map((value) => value.toLocaleString('en-US')),
      'a byte citation with nothing asserting it is a citation that can be wrong for months'
    ).toEqual([]);
  });
});

describe('DTP-01 — the two superseded numbers are refused, not merely replaced', () => {
  it('carries the corrected offsets in the pane', () => {
    expect(dayPane).toContain('at byte 2,017,741,');
    expect(dayPane).toContain('at byte 1,945,231,');
  });

  it('and neither surface file names the old ones again', () => {
    for (const surface of [player, dayPane, swingPane]) {
      expect(surface).not.toContain('2,017,748');
      expect(surface).not.toContain('1,945,235');
    }
  });

  it('because the old ones land INSIDE the constructs they quote', () => {
    /*
      This is the assertion that says WHY, and it is the reason the row exists at all: both wrong
      numbers point at bytes that are genuinely about the right subject, which is the shape that
      never gets questioned. `SWF-02` recorded the same lesson at a 57 KB distance.
    */
    expect(BUNDLE.startsWith('hasDayTradeAlerts?49:-1)', 2_017_748)).toBe(true);
    expect(BUNDLE.slice(2_017_741, 2_017_748)).toBe('O(49,o.');
    expect(BUNDLE.slice(1_945_235, 1_945_236)).toBe('"');
    expect(BUNDLE.slice(1_945_231, 1_945_235)).toBe('v(4,');
  });
});

describe('STV-01 — the file names an artefact that is in this checkout', () => {
  it('no longer points at the v2 decode workspace as if it were here', () => {
    expect(player).toContain('the v2 decode workspace, NOT in this');
    expect(player).toContain('checkout — every `lines N-M` below points into it.');
  });

  it('anchors the class in the pinned bundle instead', () => {
    expect(player).toContain('1,901,122-1,914,468');
    expect(BUNDLE.startsWith('const SCe=["videoPlayer"];', 1_901_122)).toBe(true);
    expect(BUNDLE.slice(1_914_457, 1_914_469)).toBe('return t})()');
  });

  it('and the four facts that sentence states are the ones in the bundle', () => {
    expect(BUNDLE).toContain('decls:27,vars:9,consts:[');
    /* Eighteen consts: the table runs 1,909,054 to its closing bracket at 1,909,708. */
    expect(BUNDLE.slice(1_909_708, 1_909_709)).toBe(']');
    expect(BUNDLE.startsWith('function wCe(t,n){', 1_901_148)).toBe(true);
    expect(BUNDLE.startsWith('getHlsConfig()', 1_902_786)).toBe(true);
    expect(BUNDLE.startsWith('styles:[', 1_910_939)).toBe(true);
  });
});

describe('STV-04 — the adaptive machinery is one-shot, and the four facts that make it so', () => {
  /*
    None of these four is a divergence on its own; together they are the reason
    `BUFFER_CHECK_WINDOW`, `BUFFER_THRESHOLD` and `MAX_RECOVERY_ATTEMPTS` stop meaning anything
    after the first reload. If somebody later resets `hasStartedPlaying` in `cleanup()` — a
    reasonable-looking change — this row becomes stale and these assertions are what say so.
  */
  it('reads the reference: cleanup clears the interval', () => {
    expect(BUNDLE.slice(1_902_616, 1_902_745)).toContain('clearInterval(this.performanceMonitor)');
  });

  it('reads the reference: nothing resets hasStartedPlaying once it is true', () => {
    expect(count('this.hasStartedPlaying=!0')).toBe(1);
    expect(count('this.hasStartedPlaying=!1')).toBe(1);
    /* The only `=!1` is the constructor's, at 1,902,104. */
    expect(BUNDLE.indexOf('this.hasStartedPlaying=!1')).toBe(1_902_133);
  });

  it('reads the reference: only two call sites start monitoring, and both are once-only', () => {
    expect(count('this.startPerformanceMonitoring()')).toBe(2);
  });

  it('ours reproduces all three, member for member', () => {
    expect(playerCode).toContain('if (performanceMonitor) clearInterval(performanceMonitor);');
    expect(playerCode).toContain('if (hasStartedPlaying) return;');
    expect(playerCode).toContain('hasStartedPlaying = true;');
    /* Exactly one assignment back to false — the initialiser — and nothing in cleanup. */
    expect(playerCode.split('hasStartedPlaying = false').length - 1).toBe(1);
  });

  it('and keeps the nested ternary that makes the >15s seek unreachable while optimal', () => {
    expect(BUNDLE.slice(1_904_918, 1_905_469)).toContain(
      'o>10&&"optimal"===this.currentPerformanceLevel?i.playbackRate=1.5:o>15?'
    );
    expect(playerCode).toContain("if (behind > 10 && currentPerformanceLevel === 'optimal')");
    expect(playerCode).toContain('} else if (behind > 15) {');
  });
});

describe('STV-05 — listeners accumulate because nothing removes them, upstream and here', () => {
  it('the reference never removes one', () => {
    expect(count('removeEventListener')).toBe(count('removeEventListener'));
    expect(BUNDLE.slice(1_906_064, 1_906_919)).not.toContain('removeEventListener');
  });

  it('and ours attaches them inside the per-load setup, as the reference does', () => {
    expect(playerCode).toContain("media.addEventListener('playing'");
    expect(playerCode).toContain("media.addEventListener('waiting'");
    expect(playerCode).not.toContain('removeEventListener');
  });
});

describe('STV-07 — the volume binding is a captured property whose writer is dead upstream', () => {
  it('const 3 really does bind volume', () => {
    expect(
      BUNDLE.startsWith(
        '["autoplay","autoplay",1,"video-streaming",3,"dblclick","id","muted","volume"]',
        1_909_111
      )
    ).toBe(true);
  });

  it('and onVolumeChange has no caller anywhere in 2,891,205 bytes', () => {
    /*
      The control is `onImagePaste`, which the two composer forms call from their templates: the
      same search shape returns a definition PLUS call sites where call sites exist, so a count of
      one here is an absence and not a bad needle.
    */
    expect(count('onVolumeChange')).toBe(1);
    expect(count('onImagePaste')).toBeGreaterThan(1);
  });

  it('and showVolumeSlider is written twice and read never', () => {
    expect(count('showVolumeSlider')).toBe(2);
  });

  it('ours keeps the binding and says why', () => {
    expect(playerCode).toContain('let volume = $state(1);');
    expect(playerCode).toContain('{volume}');
  });
});

describe('STV-08 — the dead screenshare members, and the spelling that separates the two copies', () => {
  it('the streaming view spells it correctly and nothing calls it', () => {
    expect(count('reAttachScreen')).toBe(1);
    expect(BUNDLE.indexOf('reAttachScreen')).toBe(1_908_154);
  });

  it('the screenshare pane spells it wrong and three things use it', () => {
    /* The passing control: the same needle family DOES match where the behaviour is live. */
    expect(count('reAttachScren')).toBe(3);
  });

  it('two of the members have empty bodies', () => {
    expect(BUNDLE.slice(1_908_109, 1_908_154)).toBe(
      'startWatchScreenOf(e){}stopWatchScreenOf(e){}'
    );
  });

  it('and ours carries none of them', () => {
    for (const name of [
      'isDetached',
      'detachScreen',
      'reAttachScreen',
      'startWatchScreenOf',
      'stopWatchScreenOf',
      'newScreenStream',
      'showControls'
    ]) {
      expect(playerCode, `${name} belongs to ScreenPane, not to the player`).not.toContain(name);
    }
  });
});

describe('DTP-02 and SWP-01 — the Ze/Ne split, which is what makes the five nodes countable', () => {
  it('the reference writes six of the row cells with Ze and two with Ne', () => {
    const dayRow = BUNDLE.slice(1_943_242, 1_943_979);
    expect(dayRow.split('Ze(e.').length - 1).toBe(5);
    expect(dayRow.split('Ne(" "').length - 1).toBe(2);

    const swingRow = BUNDLE.slice(1_936_897, 1_937_634);
    expect(swingRow.split('Ze(e.').length - 1).toBe(5);
    expect(swingRow.split('Ne(" "').length - 1).toBe(2);
  });

  it('and the two Ne nodes are the symbol and the date, in both panes', () => {
    for (const offset of [1_937_310, 1_943_655]) {
      expect(
        BUNDLE.startsWith(
          'm(2),Ne(" ",e.symbol," "),m(2),Ze(e.direction),m(2),Ne(" ",Ct(10,12,e.entryDate,"YYYY-MM-dd hh:mm:ss")," ")',
          offset
        )
      ).toBe(true);
    }
  });

  it('the three nodes outside the row carry the same spaces', () => {
    expect(BUNDLE.slice(1_942_630, 1_942_710)).toContain(
      'v(1," No Day Trade Alerts to display. ")'
    );
    expect(BUNDLE.slice(1_936_289, 1_936_370)).toContain(
      'v(1," No Swing Trade Alerts to display. ")'
    );
    expect(BUNDLE.startsWith('v(4," Latest Day Trade Alerts (Last "),', 1_945_231)).toBe(true);
    expect(BUNDLE.startsWith('v(4," Latest Swing Trade Alerts (Last "),', 1_938_855)).toBe(true);
  });

  it('and ours renders the six Ze cells with no spaces, which is the half that already matches', () => {
    for (const pane of [dayPaneCode, swingPaneCode]) {
      expect(pane).toContain('<td>{row.direction}</td>');
      expect(pane).toContain('<td>{row.entryPrice}</td>');
      expect(pane).toContain('<td>{row.stop}</td>');
      expect(pane).toContain('<td>{row.target}</td>');
      expect(pane).toContain('font-weight-bold">{row.senderName}</strong>');
    }
  });

  it('and loses them on the two Ne cells, which is the half the rows record', () => {
    /*
      A NEGATIVE assertion with a positive twin above it: if somebody builds the row and adds
      `{' '}`, this flips and the two rows have to be re-dispositioned rather than silently
      contradicted. That is the intended failure, not a false alarm.
    */
    expect(dayPaneCode).toContain('font-weight-bold">{row.symbol}</strong>');
    expect(swingPaneCode).toContain('font-weight-bold">{row.symbol}</strong>');
    expect(dayPaneCode).toContain('<td>{formatDayTradeAlertDate(row.entryDate)}</td>');
    expect(swingPaneCode).toContain('<td>{formatSwingAlertDate(row.entryDate)}</td>');
  });
});

describe('DTP-03 — the width rule read as a whole rule rather than searched for a class', () => {
  /*
    Both ends of this rule are bound to locals and checked, which `slice-anchor-contract.test.ts`
    ratchets down for a reason this row would otherwise walk straight into: `indexOf` answers -1
    when it fails, -1 is a valid `slice` argument, and the resulting "from the end" slice would make
    the six-selector count come out at zero — a GREEN `not.toContain` on an empty string, which is
    exactly the shape that has produced a meaningless assertion three times in this repository.
  */
  const ruleEnd = BUNDLE.indexOf('{width:100%}', 2_024_939);
  const RULE = BUNDLE.slice(2_024_939, ruleEnd);

  it('is a rule at all — the end anchor was found', () => {
    expect(ruleEnd).toBeGreaterThan(2_024_939);
  });

  it('names six selectors', () => {
    expect(RULE.split(', ')).toHaveLength(6);
  });

  it('and .dayTradeAlert-limit-container is in none of them', () => {
    expect(RULE).not.toContain('.dayTradeAlert-limit-container');
  });

  it('while .swingAlert-limit-container is in two — the control that makes that an absence', () => {
    expect(RULE.split('.swingAlert-limit-container').length - 1).toBe(2);
  });

  it('and the max-width rule 915 bytes later DOES carry all four combinations', () => {
    const maxRuleEnd = BUNDLE.indexOf('{max-width:180px', 2_025_854);
    expect(maxRuleEnd).toBeGreaterThan(2_025_854);
    const maxRule = BUNDLE.slice(2_025_854, maxRuleEnd);
    expect(maxRule.split(', ')).toHaveLength(4);
    expect(maxRule.split('.dayTradeAlert-limit-container').length - 1).toBe(2);
    expect(2_025_854 - 2_024_939).toBe(915);
  });

  it('so the day-trade pane declares the width on the search box only', () => {
    expect(dayPane).toContain(
      '.day-trade-alerts-container #dayTradeAlert-search {\n    width: 100%;'
    );
    expect(dayPane).not.toContain('.dayTradeAlert-limit-container {\n    width: 100%;');
    expect(swingPane).toContain('.swing-alerts-container .swingAlert-limit-container');
  });
});

describe('DTP-04 and SWP-04 — the repeater tracks by identity upstream, and we key by id', () => {
  it('Li returns the item, not the index', () => {
    expect(BUNDLE.startsWith('function Li(t,n){return n}', 100_136)).toBe(true);
  });

  it('and both repeaters pass it', () => {
    expect(BUNDLE.startsWith('ht(32,Pwe,23,17,"tr",null,Li)', 1_944_820)).toBe(true);
    expect(BUNDLE.startsWith('ht(32,_we,23,17,"tr",null,Li)', 1_938_465)).toBe(true);
  });

  it('ours keys by the row id — a real identity, not a stand-in for one', () => {
    expect(dayPaneCode).toContain('{#each visibleAlerts as row (row.id)}');
    expect(swingPaneCode).toContain('{#each visibleAlerts as row (row.id)}');
  });
});

describe('SWP-03 — the two search pipes are NOT the same, and the asymmetry is the reference s', () => {
  it('the swing pipe dereferences bare', () => {
    expect(
      BUNDLE.startsWith(
        'transform(e,i){return e?i?(i=i.toLowerCase(),e.filter(o=>o.symbol.toLowerCase().includes(i)||o.senderName.toLowerCase().includes(i))):e:[]}',
        1_915_269
      )
    ).toBe(true);
  });

  it('the day-trade pipe guards every step, 487 bytes later', () => {
    expect(
      BUNDLE.startsWith(
        'transform(e,i){return e?i?(i=i.toLowerCase(),e.filter(o=>o?.symbol?.toLowerCase()?.includes(i)||o?.senderName?.toLowerCase()?.includes(i))):e:[]}',
        1_915_756
      )
    ).toBe(true);
    expect(1_915_756 - 1_915_269).toBe(487);
  });

  it('and both are transcribed as they are, not as they would be if they agreed', () => {
    const swingLib = read('./swing-alerts.ts');
    const dayLib = read('./day-trade-alerts.ts');
    expect(swingLib).toContain(
      'row.symbol.toLowerCase().includes(needle) || row.senderName.toLowerCase().includes(needle)'
    );
    expect(dayLib).toContain('?.symbol?.toLowerCase()');
  });

  it('and the limit pipes ARE identical, which is why `?? 0` matters', () => {
    expect(count('transform(e,i){return e&&0!==i?e.slice(0,i):[]}')).toBe(2);
    expect(dayPaneCode).toContain('limit ?? 0');
    expect(swingPaneCode).toContain('limit ?? 0');
  });
});

describe('SWP-06 — the two panes differ in six measured ways, and every one is carried', () => {
  it('the months arrays differ, 99 bytes apart in one const block', () => {
    expect(
      BUNDLE.startsWith('zCe=()=>[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]', 1_916_549)
    ).toBe(true);
    expect(BUNDLE.startsWith('WCe=()=>[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]', 1_916_648)).toBe(
      true
    );
    expect(1_916_648 - 1_916_549).toBe(99);
  });

  it('the months initialisers differ, 257 bytes apart in one constructor', () => {
    expect(BUNDLE.startsWith('this.swingAlertMonths=2,', 1_955_344)).toBe(true);
    expect(BUNDLE.startsWith('this.dayTradeAlertMonths=1,', 1_955_601)).toBe(true);
    expect(1_955_601 - 1_955_344).toBe(257);
  });

  it('the limit initialiser is the one value that is shared', () => {
    expect(BUNDLE.startsWith('this.dayTradeAlertLimit=10,', 1_955_546)).toBe(true);
    expect(BUNDLE).toContain('this.swingAlertLimit=10');
  });

  it('the symbol class helpers differ', () => {
    expect(BUNDLE.startsWith('GCe=t=>({"swing-symbol-container":t})', 1_916_610)).toBe(true);
    expect(BUNDLE.startsWith('qCe=t=>({"day-trade-symbol-container":t})', 1_916_694)).toBe(true);
  });

  it('the entitlement slots differ and sit 38 bytes apart', () => {
    expect(BUNDLE.startsWith('O(48,o.hasSwingTradeAlerts?48:-1)', 2_017_703)).toBe(true);
    expect(BUNDLE.startsWith('O(49,o.hasDayTradeAlerts?49:-1)', 2_017_741)).toBe(true);
    expect(2_017_741 - 2_017_703).toBe(38);
  });

  it('and ours carries all of them rather than sharing a constant', () => {
    const swingLib = read('./swing-alerts.ts');
    const dayLib = read('./day-trade-alerts.ts');
    expect(swingLib).toContain('export const SWING_ALERT_DEFAULT_MONTHS = 2;');
    expect(dayLib).toContain('export const DAY_TRADE_ALERT_DEFAULT_MONTHS = 1;');
    expect(swingLib).toContain('16, 17, 18, 19, 20');
    expect(dayLib).toContain('11, 12, 13, 14, 15\n];');
    expect(swingPaneCode).toContain("'swing-symbol-container'");
    expect(dayPaneCode).toContain("'day-trade-symbol-container'");
  });
});

describe('the register files these twenty-one rows where a count can see them', () => {
  it('gives each of the three sections its own heading', () => {
    for (const heading of [
      '\n## StreamingView.svelte\n',
      '\n## DayTradeAlertsPane.svelte\n',
      '\n## SwingAlertsPane.svelte\n'
    ]) {
      expect(AUDIT).toContain(heading);
    }
  });

  it('and every row declares itself outside the two-verifier pass', () => {
    /*
      `room-surface-audit-counts.test.ts` licenses a row to sit outside the surfaces table ONLY by
      that sentence. A row of this batch that lost it would make the document's own totals wrong,
      so it is asserted here as well as counted there — this file knows how many rows this batch
      added, and that file does not.
    */
    const headings = MY_SECTIONS.split('\n').filter((line) => line.startsWith('### '));
    expect(headings).toHaveLength(21);
    const markers = MY_SECTIONS.split('row was ADDED after this document was committed').length - 1;
    expect(markers).toBe(headings.length);
  });

  it('and none of the three opens with the form the surfaces table is keyed on', () => {
    expect(MY_SECTIONS).not.toMatch(
      /^\d+ verified gaps; \d+ reference behaviours confirmed present\.$/m
    );
  });
});
