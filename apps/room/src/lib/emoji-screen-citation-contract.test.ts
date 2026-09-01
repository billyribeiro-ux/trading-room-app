import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Every byte offset the `EMOJI2-*` and `SP2-*` rows cite, re-read AT ITS BYTE in the pinned bundle.
 *
 * ## Why a citation needs its own gate
 *
 * `docs/decoded/room-surface-audit-2026-08-30.md` opens by saying its offsets exist so the next
 * person re-reads rather than trusts, and that "the v4 bundle is SHA-256 pinned, so an offset stays
 * valid". Both halves are true and neither is checked by anything: a mistyped digit, a comment
 * copied from the OLDER `../source/main.d6d3c112b59b7d0d.js` (+3,329 bytes apart, so every offset
 * past the file-sort strings differs), or an offset that names a real function which is not the one
 * the sentence means, all read exactly like a verified citation.
 *
 * That last shape is the expensive one and it is why this file pairs an offset with a NEEDLE rather
 * than merely checking the offset is in range. `1,492,849` — cited on this surface before today —
 * lands inside `z0e`, four bytes past the end of the string it was quoting and nineteen past where
 * that string starts; it is close enough to look right and wrong enough that a reader following it
 * lands mid-literal.
 *
 * ## The discovery half, which is the part that keeps working
 *
 * A hand-written table of offsets rots the moment somebody adds a row. So the table below is
 * checked against the SOURCES: every `byte N,NNN,NNN` appearing in the two audited components, the
 * two modules and the component extracted from them, plus the two audit sections, must appear here.
 * A citation added without a pin fails `every cited byte is pinned` rather than passing silently.
 *
 * Offsets are BYTE offsets and the bundle is ASCII throughout, which is asserted below — that is
 * what makes a JavaScript string index and a byte offset the same number here, and it is the
 * assumption every row in both sections rests on.
 */

const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');

const BUNDLE_PATH = '../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js';
const BUNDLE = read(BUNDLE_PATH);
const CSS = read('../../docs/source-v4-2026-08-15/styles.ee2a710065b60389.css');

/**
 * The two sections this file is the gate for, sliced out of the register.
 *
 * SCOPED deliberately: the register holds 265 rows across twenty surfaces and the other eighteen
 * carry their own citations, pinned — where they are pinned — by their own contract tests. Reading
 * the whole document here would either fail on somebody else's offsets or pull them all into this
 * table, and a table that owns everything is a table nobody can add a row to.
 *
 * Both anchors are bound to locals and checked, because `indexOf` answers -1 on failure and -1 is a
 * legal `slice` argument — the shape `slice-anchor-contract.test.ts` ratchets down, and the shape
 * that has produced a green-but-meaningless assertion three times in this repository.
 */
function auditSections(): string {
  const audit = read('../../../../docs/decoded/room-surface-audit-2026-08-30.md');
  const from = audit.indexOf('\n## EmojiPicker.svelte\n');
  const to = audit.indexOf('\n## The fifty-one refuted claims');
  if (from < 0) throw new Error('the EmojiPicker.svelte section heading is gone or was reworded');
  if (to < 0) throw new Error('the refuted-claims heading is gone or was reworded');
  if (to <= from) throw new Error('the refuted-claims heading no longer follows the two sections');
  return audit.slice(from, to);
}

/** Every file whose citations this pins. Named, so adding a citation elsewhere is not silently uncovered. */
const SOURCES = {
  'EmojiPicker.svelte': read('./components/EmojiPicker.svelte'),
  'ScreenPane.svelte': read('./components/ScreenPane.svelte'),
  'ScreenPaneStatus.svelte': read('./components/ScreenPaneStatus.svelte'),
  'emoji-search.ts': read('./emoji-search.ts'),
  'emoji-frequently.ts': read('./emoji-frequently.ts'),
  'room-surface-audit — the EMOJI2/SP2 sections': auditSections()
} as const;

describe('the bundle these citations are read from', () => {
  it('is the pinned one, and is ASCII — so an index IS a byte offset', () => {
    /*
      The vacuity floor for every assertion in this file. `readFileSync(path, 'utf8')` returns UTF-16
      code units; a byte offset only equals a string index while every code unit is under 0x80.
      Asserted rather than assumed, because the day a non-ASCII byte appears in either artifact every
      offset below silently shifts and each one still points at plausible-looking minified code.

      `byteLength === length` IS that assertion and is exact in both directions: UTF-8 encodes every
      code point above 0x7f — a lone surrogate included, at three bytes for one unit — in more bytes
      than units, and every code point at or below it in exactly one. So equality holds if and only
      if the file is pure ASCII. A regex over the escaped 0x00-0x7f range was tried alongside it
      first and is gone: it says the same thing less exactly and trips `no-control-regex`.
    */
    expect(BUNDLE.length).toBe(2_891_205);
    expect(Buffer.byteLength(BUNDLE, 'utf8')).toBe(BUNDLE.length);

    expect(CSS.length).toBe(444_793);
    expect(Buffer.byteLength(CSS, 'utf8')).toBe(CSS.length);
  });
});

/**
 * `[offset, needle]`, where the needle must begin AT the offset — `startsWith`, not `includes`.
 *
 * `includes` over a window is the weaker assertion and it is what lets an offset drift by a few
 * hundred bytes and stay green. Where a row deliberately cites the start of a containing construct
 * rather than of the quoted fragment, the needle is the construct.
 */
const AT_BYTE: ReadonlyArray<readonly [number, string]> = [
  // ---------------------------------------------------------------- EmojiPicker
  /* EMOJI2-01 — the category array the staging arithmetic actually counts. */
  [745_709, 'SEARCH_CATEGORY={id:"search",name:"Search",emojis:null,anchor:!1}'],
  [747_584, 'unshift(this.RECENT_CATEGORY)'],
  [747_681, 'unshift(this.SEARCH_CATEGORY)'],
  [747_768, 'const s=Math.min(this.categories.length,3)'],
  /* EMOJI2-02 — emoji-preview's two alternative blocks. */
  [719_840, 'function jee'],
  [734_949, 'consts:[["class","emoji-mart-preview",4,"ngIf"],[1,"emoji-mart-preview",3,"hidden"]'],
  [735_962, 'z("ngIf",o.emoji&&o.emojiData)'],
  /* EMOJI2-03 — the three captured whitespace pads. */
  [719_646, 'function Bee'],
  [719_744, 'function Uee'],
  [738_704, 'Ne(" ",o.i18n.search," ")'],
  [744_221, 'VR={search:"Search",emojilist:"List of emoji"'],
  /* EMOJI2-04 — the swatches' tabIndex. */
  [719_009, 'function Lee'],
  [733_107, 'tabIndex(e){return this.isVisible(e)?"0":""}'],
  [733_522, '[[1,"emoji-mart-skin-swatches"],["class","emoji-mart-skin-swatch"'],
  /* EMOJI2-05 — the frequent-sort guard nothing turns on. */
  [745_271, 'enableFrequentEmojiSort=!1'],
  [750_569, 'this.enableFrequentEmojiSort&&this.ngZone.run(()=>{o.updateRecentEmojis()'],
  [750_574, 'enableFrequentEmojiSort&&this.ngZone.run'],
  [751_151, 'handleEnterKey(e.$event,e.emoji)'],
  [752_585, 'enableFrequentEmojiSort:"enableFrequentEmojiSort"'],
  [752_610, 'enableFrequentEmojiSort",enableSearch:'],
  /* EMOJI2-06 — the anchorless Search category. */
  [716_699, 'z("ngIf",!1!==n.$implicit.anchor)'],
  [723_328, ',template:function(i,o){1&i&&(d(0,"div",0),H(1,kee,1,1,"ng-template",1),u())'],
  /* EMOJI2-07 — the clear button's second handler. */
  [737_990, '["type","button",1,"emoji-mart-search-icon",3,"click","keyup.enter","disabled"]'],
  [738_430, 'x("click",function(){return D(s),E(o.clear())})("keyup.enter"'],
  [719_148, '"keyup.enter",function(){const o=D(e).$implicit'],
  /* The const tables the section says it decoded, each at its own `consts:`. */
  [723_019, 'consts:[[1,"emoji-mart-anchors"]'],
  [728_963, 'consts:[["container",""]'],
  [733_515, 'consts:[[1,"emoji-mart-skin-swatches"]'],
  [737_828, 'consts:[["inputRef",""]'],
  [752_946, 'consts:[["scrollRef",""]'],
  /* The two services the extracted modules name. */
  [723_544, 'NR=(()=>{class t{platformId;NAMESPACE="emoji-mart"'],
  [724_507, 'const o=e*i,a=Object.keys(this.frequently).sort'],
  [730_571, 'originalPool={};index={};emojisList={};emoticonsList={};emojiSearch={}'],
  [736_246, 'maxResults=75'],
  [736_776, 'handleSearch(e){""===e?(this.icon=this.icons.search,this.isSearching=!1)'],
  [722_105, 'function Wee'],

  // ---------------------------------------------------------------- ScreenPane
  /* SP2-01 — the two different hide expressions. */
  [1_492_643, 'H0e=(t,n)=>({hidden:t,"viewer-only-screen-video":n})'],
  [1_492_696, '$0e=t=>({hidden:t})'],
  [1_493_686, 'function Y0e'],
  [1_493_972, 'z("ngClass",ct(2,$0e,!e.isDetached&&(!e.isConnected'],
  [1_502_001, 'z("controls",o.showControls)("ngClass",Kn(18,H0e,!o.isConnected'],
  /* SP2-02 — the clip, and the rule that lifts it in the popout. */
  [1_500_330, 'consts:[[1,"h-inherit"]'],
  [1_500_337, '[[1,"h-inherit"],[1,"mt-4","text-center"]'],
  [2_593_102, '[1,"detach-screen",2,"width","100%","height","auto"]'],
  /* SP2-03 — the flat create block. */
  [
    1_501_256,
    'd(0,"div",0),H(1,z0e,2,0,"h3",1)(2,G0e,2,0,"h3",1)(3,W0e,2,1,"p",2)(4,q0e,3,2,"h3",3)'
  ],
  [1_501_361, 'd(6,"div",5)(7,"pan-zoom",6)(8,"div",7)(9,"video",8)'],
  [1_492_716, 'function z0e'],
  [1_492_881, 'function G0e'],
  [1_493_190, 'function q0e'],
  [1_501_523, 'O(1,o.isDetached?1:-1)'],
  [1_501_550, 'O(2,o.mediaService.saveData?2:-1)'],
  /* SP2-04 — the local-preview invitation. */
  [1_492_944, 'function W0e'],
  [1_493_088, ' (You are sharing your screen as '],
  [1_499_849, 'largePreview(){this.localpreview=!0'],
  [1_501_588, 'O(3,o.mediaService.isScreenSharing&&o.mediaService.localSharingStreams'],
  /*
    `SP2-04`'s three `isConnected` writers, pinned when the row was BUILT on 2026-09-01. The whole
    feature rests on exactly one of them being reachable for a screen you share yourself, so each is
    read here rather than counted: a fourth writer, or one of these moving, changes the answer and
    nothing else in this repository would notice.
  */
  [1_497_433, 'this.isConnected=!0,P("newScreenStream playing vid for '],
  [1_498_827, 'addEventListener("playing",()=>{i.isConnected=!0'],
  [1_500_073, 'i.srcObject=e.localStream;try{i.play()}catch{}this.isConnected=!0'],
  /* The create block's sibling ORDER, which is what puts `W0e` between nodes 2 and 4. */
  [1_501_269, 'H(1,z0e,2,0,"h3",1)(2,G0e,2,0,"h3",1)(3,W0e,2,1,"p",2)(4,q0e,3,2,"h3",3)'],
  /* Const 11 — the invitation's classes and its inline `#ffcc00`. */
  [1_500_900, '[1,"text-center","mt-4",2,"color","#ffcc00",3,"click"]'],
  /* SP2-05 — the unreachable `controls` binding. */
  [1_494_561, 'showControls=!1,this.localpreview=!1,this.showZoomCtrl=!1'],
  [1_501_442, 'o.showControls=!o.showControls'],
  [1_502_316, '.webcamScreen[_ngcontent-%COMP%]{width:100%;height:100%;object-fit:contain'],
  [1_901_855, 'showControls=!1,this.path=""'],
  /* SP2-06 — where the watermark sits. */
  [1_494_134, 'function Q0e'],
  [1_501_479, 'H(10,Q0e,2,1,"span",9)'],
  /* SP2-07 — the detached cluster's gate. */
  [1_501_767, 'O(5,o.isDetachedCtrl?5:-1)'],
  /* Offsets the surface already cited, re-read here because this file is now their gate too. */
  [1_494_653, 'panZoomConfig=new Kse({zoomOnMouseWheel:!1,zoomOnDoubleClick:!1'],
  [1_501_699, 'O(4,o.isConnected||o.isPresentingThisScreen||o.isDetached?-1:4)'],
  [1_502_175, 'O(10,!o.appService.globals.isPresenter'],
  /*
    Offsets `ScreenPane.svelte` and the audit already carried before today. They are here because the
    discovery half below demanded them — which is the check working: five citations on a surface
    this repository calls verified had nothing re-reading them.

    `1,492,849` is the instructive one and is pinned AS IT IS rather than corrected. It lands
    nineteen bytes into ` Screen Detached.. Click here to re-attach `, so the needle it begins is
    mid-literal. The comment quoting it is not wrong about what the function does; the offset just
    does not point at what the quote shows, which is the difference this file makes visible.
  */
  [1_492_849, 'Click here to re-attach ")'],
  [1_493_278, 'Connecting To Screen of "'],
  [1_497_239, 'newScreenStream(e){if(P("Screenshare view comp newScreenStream muserID:"'],
  [1_499_022, 'i.tooSmallRetries<3&&!i.mediaService.is_firefox'],
  [1_500_765, '"muted","true",1,"webcamScreen",3,"click","controls","ngClass","id"]'],
  [1_501_226, ',template:function(i,o){1&i&&(d(0,"div",0)'],
  [736_204, 'Qee=0'],
  [736_424, 'inputId="emoji-mart-search-"+ ++Qee'],
  [737_093, 'setupKeyupListener(){this.ngZone.runOutsideAngular'],
  [744_873, '"function"!=typeof matchMedia||!matchMedia("(prefers-color-scheme: dark)").matches'],
  [750_272, 'handleEnterKey(e,i){if(!i&&null!==this.SEARCH_CATEGORY.emojis'],
  [750_893, 'handleEmojiLeave(){!this.showPreview||!this.previewRef'],
  [754_689, 'o.darkMode?"emoji-mart-dark":""']
];

/** The same shape against the pinned stylesheet — three rows cite CSS offsets rather than JS ones. */
const AT_CSS_BYTE: ReadonlyArray<readonly [number, string]> = [
  [294_501, '.overflow-hidden{overflow:hidden!important}'],
  [365_090, '.emoji-mart-preview-skins{position:absolute;top:50%;transform:translateY(-50%)}'],
  [365_272, '.emoji-mart-preview-skins{right:30px;text-align:right}'],
  [437_841, '.detach-screen .overflow-hidden{overflow:initial!important}'],
  [
    441_996,
    '.video-screen-container{position:relative;top:0;left:0;z-index:1999;width:inherit;height:inherit}'
  ]
];

describe('every cited offset says at its byte what the row says it says', () => {
  it.each(AT_BYTE)('bundle byte %d', (offset, needle) => {
    const found = BUNDLE.slice(offset, offset + needle.length);
    expect(
      found,
      `byte ${offset.toLocaleString('en-US')} of ${BUNDLE_PATH} does not begin ${JSON.stringify(needle)}. Re-read the offset before changing this line: an offset that points at a REAL function which is not the one the sentence means is the failure this file exists for.`
    ).toBe(needle);
  });

  it.each(AT_CSS_BYTE)('stylesheet byte %d', (offset, needle) => {
    expect(CSS.slice(offset, offset + needle.length)).toBe(needle);
  });
});

describe('a cited construct is the one the row names, not merely one that exists', () => {
  /*
    `toBe` above proves the bytes are there. These prove they are the ONLY ones, which is the part
    that survives a re-minification changing every offset: a needle that appears once in 2.9 MB
    cannot have been matched by accident, and a row citing it cannot be pointing somewhere else.
  */
  const occurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;

  it.each([
    ' (You are sharing your screen as ',
    'largePreview(){this.localpreview=!0',
    'SEARCH_CATEGORY={id:"search",name:"Search",emojis:null,anchor:!1}',
    'tabIndex(e){return this.isVisible(e)?"0":""}',
    'unshift(this.SEARCH_CATEGORY)',
    'd(6,"div",5)(7,"pan-zoom",6)(8,"div",7)(9,"video",8)',
    'H(10,Q0e,2,1,"span",9)',
    '$0e=t=>({hidden:t})'
  ])('%s occurs exactly once in the bundle', (needle) => {
    expect(occurrences(BUNDLE, needle)).toBe(1);
  });

  it('counts `enableFrequentEmojiSort` exactly four times, which is EMOJI2-05 s whole argument', () => {
    /*
      The row refuses to build a refresh because the reference's own guard can never be true. That
      rests on there being NO template binding for the input — a fifth occurrence would be one, and
      would turn a measured refusal into a real gap. So the census is the assertion, not prose.
    */
    expect(occurrences(BUNDLE, 'enableFrequentEmojiSort')).toBe(4);
  });

  it('counts `showControls` five times, four of them this component s, which is SP2-05 s', () => {
    expect(occurrences(BUNDLE, 'showControls')).toBe(5);
    /* The fifth is the HLS player's own field, ~400 KB away and unrelated. */
    expect(BUNDLE.indexOf('showControls', 1_600_000)).toBe(1_901_855);
  });
});

describe('every cited byte is pinned', () => {
  /*
    ## The discovery half

    Without this the table above is a snapshot: correct on the day it was written and silent about
    every citation added afterwards. This walks the sources for `byte N,NNN,NNN` and requires each
    number to be in one of the two tables.

    Its own vacuity floor is asserted first — a scanner that finds nothing makes the whole check
    pass while proving nothing, which is the failure `source-size-contract` records for its own
    counter.
  */
  /*
    ANY comma-grouped six-or-more-digit number, not only one introduced by the word `byte`.

    It was `\bbyte (…)` first, and that let six real offsets through in the first run of this file —
    prose says "the guard at 750,592" and "table body `[1,500,337`" as often as it says "byte". A
    scanner that only sees the tidy form is a scanner that checks the citations somebody remembered
    to write tidily.
  */
  const CITED = /(?<![\d,])\d{1,3}(?:,\d{3})+(?!\d)/g;

  /**
   * Numbers in this shape that are NOT offsets.
   *
   * The two artifact LENGTHS, which are asserted for real at the top of this file — so naming them
   * here weakens nothing, since no offset can hide behind a number that is itself checked. And
   * anything under 100,000, which is a count rather than an offset: the earliest byte either
   * section cites is 294,501 in the stylesheet and 716,154 in the bundle, and the numbers that
   * actually appear below the threshold are entry counts (`1,821` emoji) and cell counts.
   */
  const NOT_OFFSETS = new Set([BUNDLE.length, CSS.length]);
  const SMALLEST_CITED_OFFSET = 100_000;

  const citedIn = (source: string) =>
    [...source.matchAll(CITED)]
      .map((found) => Number(found[0].replaceAll(',', '')))
      .filter((value) => value >= SMALLEST_CITED_OFFSET && !NOT_OFFSETS.has(value));

  const pinned = new Set([...AT_BYTE, ...AT_CSS_BYTE].map(([offset]) => offset));

  it('reads the shapes a citation is actually written in', () => {
    /*
      The scanner's own control, and it earned itself twice inside one session.

      First it was `\\bbyte (…)`, and six offsets written without that word walked past it. Then the
      trailing guard was `(?![\\d,])`, and EVERY offset in a comma-separated list walked past it —
      `the guard at 750,592, and the two halves` matched nothing at all, because the comma after the
      number failed the lookahead and `\\d{3}` cannot backtrack to two digits. Both times the suite
      was green and the discovery half was checking a subset it never named.

      So the fixture below carries one of each shape rather than the assertion being "it found
      lots". A count alone cannot tell "found everything" from "found the easy ones".
    */
    const fixture =
      'byte 1,501,256 and 716,154; at 750,592, and 752,585 — table body `[1,500,337`, 1,821 entries';
    expect(citedIn(fixture)).toEqual([1_501_256, 716_154, 750_592, 752_585, 1_500_337]);

    const total = Object.values(SOURCES).reduce((sum, source) => sum + citedIn(source).length, 0);
    expect(
      total,
      'the citation scanner matched nothing — every assertion below is vacuous'
    ).toBeGreaterThan(60);
  });

  it.each(Object.entries(SOURCES))('%s cites nothing this file does not pin', (name, source) => {
    const unpinned = [...new Set(citedIn(source))].filter((offset) => !pinned.has(offset)).sort();
    expect(
      unpinned,
      `${name} cites ${unpinned.map((offset) => offset.toLocaleString('en-US')).join(', ')} and this file does not read those bytes. Add the offset and the needle it is supposed to begin — a citation nothing re-reads is exactly the shape this file exists to stop.`
    ).toEqual([]);
  });
});
