import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';

import { codeOf } from '#lib/source-comments.js';
import { parseConstTable } from './const-table.mjs';
import ScreenVolumeControl from './components/ScreenVolumeControl.svelte';
import ScreenZoomControls from './components/ScreenZoomControls.svelte';
import type { PresenterAudioPreferences, TalkingPresenter } from './screen-volume.js';

/**
 * The screen tab bar's `ms-auto` cluster — `ScreenZoomControls` and `ScreenVolumeControl` — against
 * the PINNED v4 bundle.
 *
 * ## Why this file exists beside `screen-volume-contract.test.ts`
 *
 * That file opens five files under a capture root this repository does not ship, so
 * `gate/evidence-bound-tests.mjs` excludes it: it is one of the 42 the vitest banner names on every
 * run, and every claim it makes about these two components has been unasserted here and on CI for
 * as long as that has been true. It is not deleted and not edited — its subject is a build this
 * checkout cannot see — but the facts it was meant to hold are re-pinned here against
 * `docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`, which is TRACKED, 2,891,205 bytes, SHA-256
 * `40796ca83dba809bb966dad0d020ee5170b33aa4556c691957cb65f0bab87524`, and is the bundle the audit
 * register is written against.
 *
 * ## Read BY VALUE, which is the only way two of these could have been found
 *
 * The const table is bracket-walked and decoded with `src/lib/const-table.mjs`, then compared to
 * what the components claim each INDEX holds. Two findings came out of that and out of nothing
 * else:
 *
 * 1. **Every index from 66 up was one too high.** The old numbering names the entry AFTER the one
 *    it describes, all the way along, and the neighbours are plausible: 90 is the volume MENU, not
 *    its trigger; 98 is the magnifier GLYPH, not the button that holds it.
 * 2. **The `ngClass` class names are not in the const table at all.** Angular compiles the object
 *    literal to a shared arrow beside the template functions, so const 88 says only
 *    `[1,"zoom-controls","position-absolute",3,"ngClass"]` and the class it toggles lives in `HCe`
 *    at byte 1,916,482. A previous decode note said the names were in the table; the assertion
 *    below is that they are NOT, because that is what sent this component's comment to `VCe` —
 *    which is 38 bytes away and is a DIFFERENT class.
 *
 * ## Negative controls
 *
 * Every `it` below was run against a mutated subject and seen RED before this file was committed.
 * The mutation, the failing assertion and the restore are in the change's report.
 */
const ROOT = fileURLToPath(new URL('.', import.meta.url));

const BUNDLE = readFileSync(
  fileURLToPath(
    new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url)
  ),
  'utf8'
);

const VOLUME = 'components/ScreenVolumeControl.svelte';
const ZOOM = 'components/ScreenZoomControls.svelte';
const volume = codeOf(VOLUME, readFileSync(`${ROOT}${VOLUME}`, 'utf8'));
const zoom = codeOf(ZOOM, readFileSync(`${ROOT}${ZOOM}`, 'utf8'));

/** `consts:[[` of `app-presentationarea` and of `app-screenshare-view`, as opening brackets. */
const PRESENTATION_AREA_CONSTS = 1_994_264;
const SCREENSHARE_VIEW_CONSTS = 1_500_337;

/**
 * The array literal at `open`, decoded with the repository's own tokenizer.
 *
 * The bracket walk is here and the DECODE is not: `src/lib/const-table.mjs` is the single source of
 * truth for turning a `consts:[…]` literal into values, and it refuses trailing input, so something
 * has to find the closing bracket first. String-aware for the same reason the tokenizer is — the
 * quote that opened a string is the only one that closes it.
 */
const constTableAt = (open: number): unknown[] => {
  expect(BUNDLE[open], `byte ${open} does not open an array`).toBe('[');
  let depth = 0;
  let at = open;
  while (at < BUNDLE.length) {
    const char = BUNDLE[at];
    if (char === '"' || char === "'") {
      const quote = char;
      at += 1;
      while (at < BUNDLE.length && BUNDLE[at] !== quote) at += BUNDLE[at] === '\\' ? 2 : 1;
      at += 1;
      continue;
    }
    if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) return parseConstTable(BUNDLE.slice(open, at + 1)) as unknown[];
    }
    at += 1;
  }
  throw new Error(`unterminated array at byte ${open}`);
};

const AREA = constTableAt(PRESENTATION_AREA_CONSTS);
const SHARE = constTableAt(SCREENSHARE_VIEW_CONSTS);

/**
 * A stand-in for the volume dropdown, so the `volume` slot has something to NOT render.
 *
 * ## This exists because a negative control came back GREEN
 *
 * `SZC-04`'s detached case asserted `not.toContain('dropdownVolume')` while passing no snippet at
 * all, so it was asking whether nothing renders nothing. Adding the volume slot to the detached
 * branch — the exact defect the assertion names — left it passing. A marker snippet is what makes
 * the two branches distinguishable, and the attached case asserts the marker IS there so the
 * snippet itself cannot silently stop rendering and turn the negative green again.
 */
const VOLUME_SLOT = createRawSnippet(() => ({
  render: () => '<b id="dropdownVolume">volume slot</b>'
}));

const TALKING: TalkingPresenter[] = [{ userID: 7, mediaValue: { name: 'Dana Vero' } }];
const PREFERENCES: PresenterAudioPreferences = { audioMutedFor: {}, audioVolumeFor: {} };
const noop = () => {};

const volumeBody = (props: Record<string, unknown>) =>
  render(ScreenVolumeControl, {
    props: {
      viewerOnlyMode: true,
      audioVolume: 100,
      talkingUsers: TALKING,
      preferences: PREFERENCES,
      individualVolumeControls: false,
      onvolume: noop,
      onmute: noop,
      onunmute: noop,
      ontogglepresenter: noop,
      onpresentervolume: noop,
      open: true,
      ontoggle: noop,
      ...props
    }
  }).body;

const zoomBody = (props: Record<string, unknown>) =>
  render(ScreenZoomControls, {
    props: {
      variant: 'attached',
      showZoomCtrl: true,
      ontoggle: noop,
      oncapture: noop,
      onzoomin: noop,
      onzoomout: noop,
      onreset: noop,
      volume: VOLUME_SLOT,
      ...props
    }
  }).body;

describe('the evidence this file measures is loaded', () => {
  it('is the pinned bundle and both real components', () => {
    expect(BUNDLE.length).toBe(2_891_205);
    expect(volume).toContain('dropdownVolume');
    expect(zoom).toContain('zoom-controls');
    expect(AREA.length).toBe(292);
    expect(SHARE.length).toBe(20);
  });
});

describe('SZC-01 / SVC-02 — the cluster consts, decoded by VALUE', () => {
  /*
    Every case is a pair: the index now named holds what it says, and the index formerly named
    holds something else. Only the second half can fail on an off-by-one, which is the whole
    defect being pinned.
  */
  it('87 is the container and 88 the floating trio; 88 and 89 were the old numbers', () => {
    expect(AREA[87]).toEqual([1, 'zoom-controls-container', 'position-relative']);
    expect(AREA[88]).toEqual([1, 'zoom-controls', 'position-absolute', 3, 'ngClass']);
    /* The old `const 88` for the container is the trio; the old `const 89` is the trigger. */
    expect(AREA[89]).toEqual([
      'id',
      'dropdownVolume',
      'data-bs-toggle',
      'dropdown',
      1,
      'btn',
      'btn-sm',
      'btn-dark'
    ]);
  });

  it('89 is the volume trigger and 90 its menu, not the other way round', () => {
    expect(AREA[90]).toEqual([
      'aria-labelledby',
      'dropdownVolume',
      1,
      'dropdown-menu',
      'volumeControl'
    ]);
    expect(AREA[91]).toEqual(['data-bs-toggle', 'dropdown', 1, 'float-right', 'mr-2']);
    expect(AREA[92]).toEqual([1, 'fas', 'fa-times']);
  });

  it('93 is the master slider, 94/95 the two gated buttons, 96 the rows container', () => {
    expect(AREA[93]).toContain('audioVolSlider');
    expect(AREA[93]).toContain('volCtrl');
    expect(AREA[94]).toEqual(['title', 'Mute Audio', 1, 'btn', 'btn-primary', 'btn-sm']);
    expect(AREA[95]).toEqual(['title', 'Unmute Audio', 1, 'btn', 'btn-primary', 'btn-sm']);
    expect(AREA[96]).toEqual([1, 'room-sound-options']);
    /* 108 / 109 are the same two with their click bindings — the pair the header names. */
    expect(AREA[108]).toEqual([
      'title',
      'Mute Audio',
      1,
      'btn',
      'btn-primary',
      'btn-sm',
      3,
      'click'
    ]);
    expect(AREA[109]).toContain('Unmute Audio');
  });

  it('97 is the dark BUTTON and 98 the magnifier glyph — the old numbering swapped them', () => {
    expect(AREA[97]).toEqual([1, 'btn', 'btn-sm', 'btn-dark', 3, 'click']);
    expect(AREA[98]).toEqual([1, 'icon', 'fas', 'fa-search']);
    expect(AREA[99]).toEqual([1, 'icon', 'fas', 'fa-camera']);
    expect(AREA[100]).toEqual([1, 'icon', 'fas', 'fa-compress-arrows-alt']);
    expect(AREA[115]).toEqual([1, 'icon', 'fas', 'fa-expand']);
  });

  it('101 to 104 are the gated trio and its three glyphs', () => {
    expect(AREA[101]).toEqual([1, 'btn', 'btn-sm', 'btn-warning', 3, 'click']);
    expect(AREA[102]).toEqual([1, 'icon', 'fas', 'fa-search-plus']);
    expect(AREA[103]).toEqual([1, 'icon', 'fas', 'fa-search-minus']);
    expect(AREA[104]).toEqual([1, 'icon', 'fas', 'fa-redo']);
  });

  it('105 to 107 are the three volume glyphs, and 111 carries the reference’s typo', () => {
    expect(AREA[105]).toEqual([1, 'fas', 'fa-volume-up']);
    expect(AREA[106]).toEqual([1, 'fas', 'fa-volume-down']);
    expect(AREA[107]).toEqual([1, 'fas', 'fa-volume-off']);
    expect(AREA[111]).toContain('Presenter audiob');
  });

  it('and the components name the corrected numbers, not the stale ones', () => {
    const rawVolume = readFileSync(`${ROOT}${VOLUME}`, 'utf8');
    const rawZoom = readFileSync(`${ROOT}${ZOOM}`, 'utf8');
    expect(rawVolume).toContain('app-presentationarea 89');
    expect(rawVolume).toContain('const 111');
    expect(rawVolume).not.toContain('app-presentationarea 90');
    expect(rawVolume).not.toContain('const 112');
    expect(rawZoom).toContain('const 87');
    expect(rawZoom).toContain('consts 89-96');
    expect(rawZoom).not.toContain('const 71');
    expect(rawZoom).not.toContain('consts 90-97');
  });
});

describe('SZC-01 — the ngClass class names live in a shared arrow, NOT in the const table', () => {
  /*
    This is the assertion the decode note got backwards, and it is why this component's comment
    named `VCe`. Angular compiles `[ngClass]="{a: x}"` to a module-level factory; the const entry
    keeps only the marker `3,"ngClass"`. So the class NAME cannot be recovered from the table at
    any index, and a reader who looks for it there finds the nearest arrow instead.
  */
  const TABLE_TEXT = BUNDLE.slice(PRESENTATION_AREA_CONSTS, 2_014_221);

  it('the table marks the binding and never names the class', () => {
    expect(AREA[88]).toContain('ngClass');
    expect(TABLE_TEXT).not.toContain('viewer-only-screen-zoom-controls');
    /* Nor any of its siblings — this is a property of the compiler, not of one entry. */
    expect(TABLE_TEXT).not.toContain('viewer-only-screen-tab');
    expect(TABLE_TEXT).not.toContain('show active');
  });

  it('the arrow that does name it is `HCe`, and `VCe` beside it is a different class', () => {
    expect(BUNDLE.slice(1_916_482, 1_916_540)).toContain(
      'HCe=t=>({"viewer-only-screen-zoom-controls":t})'
    );
    expect(BUNDLE.slice(1_916_444, 1_916_490)).toContain('VCe=t=>({"viewer-only-screen-tab":t})');
    /* `cSe` binds HCe, and it is the only place the trio's class comes from. */
    expect(BUNDLE.slice(1_920_974, 1_921_040)).toContain(
      'z("ngClass",ct(1,HCe,e.appService.globals.viewerOnlyMode))'
    );
  });

  it('and the component now names HCe rather than VCe', () => {
    const rawZoom = readFileSync(`${ROOT}${ZOOM}`, 'utf8');
    expect(rawZoom).toContain('HCe = t => ');
    expect(rawZoom).not.toContain("VCe = (t) => ({'viewer-only-screen-zoom-controls': t})");
  });
});

describe('SZC-02 — the detached container carries an ngClass the sketch used to omit', () => {
  it('const 4 of app-screenshare-view binds it, and `$0e` is what it binds', () => {
    expect(SHARE[4]).toEqual([1, 'zoom-controls-container-detached', 3, 'ngClass']);
    expect(BUNDLE.slice(1_492_696, 1_492_730)).toContain('$0e=t=>({hidden:t})');
    expect(BUNDLE.slice(1_493_972, 1_494_120)).toContain(
      'z("ngClass",ct(2,$0e,!e.isDetached&&(!e.isConnected||e.isPresentingThisScreen&&!e.localpreview||e.mediaService.saveData))'
    );
  });

  it('the detached buttons are consts 13 and 16, which did NOT move', () => {
    expect(SHARE[13]).toEqual([1, 'btn', 'btn-sm', 'btn-dark', 3, 'click']);
    expect(SHARE[16]).toEqual([1, 'btn', 'btn-sm', 'btn-warning', 3, 'click']);
    expect(SHARE[14]).toEqual([1, 'icon', 'fas', 'fa-search']);
    expect(SHARE[15]).toEqual([1, 'icon', 'fas', 'fa-camera']);
  });

  it('and the component records the binding rather than drawing a bare class', () => {
    const rawZoom = readFileSync(`${ROOT}${ZOOM}`, 'utf8');
    expect(rawZoom).toContain('zoom-controls-container-detached" [ngClass]');
  });
});

describe('SZC-03 — the double-click guard is OURS, because the nesting is ours', () => {
  /*
    `Y0e` is node 5 of app-screenshare-view's root template and the `appDoubleClick` box (const 5)
    is node 6 — SIBLINGS. Our `ScreenPane` nests the cluster inside that box so it fullscreens with
    the picture, which is what `SV-SP-01`'s watermark needs, and the guard is the price of the
    choice rather than a transcription of anything.
  */
  it('the reference declares the cluster and the double-click box as siblings', () => {
    expect(BUNDLE.slice(1_501_300, 1_501_500)).toContain('(5,Y0e,6,4,"div",4),d(6,"div",5)');
    expect(SHARE[5]).toContain('appDoubleClick');
  });

  it('and the component says so where the guard is written', () => {
    const rawZoom = readFileSync(`${ROOT}${ZOOM}`, 'utf8');
    expect(rawZoom).toContain('UPSTREAM IT IS NOT NESTED');
    expect(rawZoom).not.toContain('It is inert in the attached arrangement,');
  });
});

describe('SZC-04 — the cluster renders in the reference’s order, per variant', () => {
  it('attached: the floating trio, then the volume slot, then search, camera, expand', () => {
    const html = zoomBody({ fullscreen: false });
    const trio = html.indexOf('zoom-controls position-absolute');
    expect(trio, 'the gated trio is missing').toBeGreaterThan(-1);
    const slot = html.indexOf('volume slot');
    expect(slot, 'the volume snippet did not render').toBeGreaterThan(-1);
    const search = html.indexOf('fa-search"');
    expect(search, 'the magnifier is missing').toBeGreaterThan(-1);
    const camera = html.indexOf('fa-camera');
    expect(camera, 'the camera is missing').toBeGreaterThan(-1);
    const expand = html.indexOf('fa-expand');
    expect(expand, 'the fullscreen button is missing').toBeGreaterThan(-1);
    expect(trio).toBeLessThan(slot);
    expect(slot).toBeLessThan(search);
    expect(search).toBeLessThan(camera);
    expect(camera).toBeLessThan(expand);
  });

  it('attached: viewerOnlyMode moves the trio rather than hiding it', () => {
    expect(zoomBody({ viewerOnlyMode: true })).toContain('viewer-only-screen-zoom-controls');
    expect(zoomBody({ viewerOnlyMode: false })).not.toContain('viewer-only-screen-zoom-controls');
    expect(zoomBody({ viewerOnlyMode: false })).toContain('zoom-controls position-absolute');
  });

  it('attached: the fullscreen glyph swaps on `fullscreen`, as const 100 / 115 do', () => {
    expect(zoomBody({ fullscreen: true })).toContain('fa-compress-arrows-alt');
    expect(zoomBody({ fullscreen: false })).toContain('fa-expand');
  });

  it('detached: the two dark buttons come FIRST and the trio wrapper carries no class', () => {
    const html = zoomBody({ variant: 'detached' });
    const search = html.indexOf('fa-search"');
    expect(search, 'the magnifier is missing').toBeGreaterThan(-1);
    const plus = html.indexOf('fa-search-plus');
    expect(plus, 'the zoom-in button is missing').toBeGreaterThan(-1);
    expect(search).toBeLessThan(plus);
    expect(html).toContain('<div><button');
    /*
      No volume slot and no expand button — app-screenshare-view's 20-entry table has neither. The
      snippet IS passed (see `VOLUME_SLOT`), so this is a real refusal to render it rather than an
      assertion about an absent prop.
    */
    expect(html).not.toContain('fa-expand');
    expect(html).not.toContain('volume slot');
  });

  it('detached: the trio still hides when the gate is off', () => {
    expect(zoomBody({ variant: 'detached', showZoomCtrl: false })).not.toContain('btn-warning');
    expect(zoomBody({ variant: 'detached', showZoomCtrl: false })).toContain('fa-camera');
  });
});

describe('SVC-01 — the three captured text nodes keep their own spaces', () => {
  /*
    `v(6," Volume ")`, `v(1," Mute ")` and `v(1," Unmute ")`: leading AND trailing. Plain text
    nodes lose both — Svelte drops whitespace-only text at an element boundary — so all three are
    written with the brace idiom `AGENTS.md` records for the forty-odd other captured strings.
  */
  it('the reference emits all three with surrounding spaces', () => {
    expect(BUNDLE.slice(1_923_441, 1_923_470)).toContain(',v(6," Volume ")');
    expect(BUNDLE.slice(1_921_484, 1_921_510)).toContain('v(1," Mute ")');
    expect(BUNDLE.slice(1_921_611, 1_921_640)).toContain('v(1," Unmute ")');
  });

  it('and the rendered control keeps them', () => {
    const html = volumeBody({ audioVolume: 100 });
    expect(html).toContain('<h4> Volume ');
    expect(html).toContain('> Mute </button>');
    expect(volumeBody({ audioVolume: 0 })).toContain('> Unmute </button>');
  });

  it('the source uses the brace idiom rather than a bare text node', () => {
    expect(volume).toContain("{' Mute '}");
    expect(volume).toContain("{' Unmute '}");
    expect(volume).toContain("{' Volume '}");
  });
});

describe('SVC — the gates this control is entirely made of', () => {
  it('the trigger is gated on viewerOnlyMode ALONE and the menu on nothing', () => {
    expect(BUNDLE.slice(1_924_167, 1_924_260)).toContain(
      'm(2),O(2,e.showZoomCtrl?2:-1),m(),O(3,e.appService.globals.viewerOnlyMode?3:-1)'
    );
    expect(volumeBody({ viewerOnlyMode: false })).not.toContain('id="dropdownVolume"');
    /* The MENU is created unconditionally upstream, so it is rendered unconditionally here. */
    expect(volumeBody({ viewerOnlyMode: false })).toContain('dropdown-menu volumeControl');
  });

  it('the icon bounds are STRICT, so 50 and 4 render an empty trigger', () => {
    expect(BUNDLE.slice(1_921_142, 1_921_380)).toContain(
      'O(1,e.audioVolume>50?1:-1),m(),O(2,e.audioVolume<50&&e.audioVolume>4?2:-1),m(),O(3,e.audioVolume<4?3:-1)'
    );
    expect(volumeBody({ audioVolume: 51 })).toContain('fa-volume-up');
    expect(volumeBody({ audioVolume: 5 })).toContain('fa-volume-down');
    expect(volumeBody({ audioVolume: 3 })).toContain('fa-volume-off');
    for (const empty of [50, 4]) {
      const html = volumeBody({ audioVolume: empty });
      expect(html, `audioVolume ${empty} should render no glyph`).not.toContain('fa-volume-');
      expect(html).toContain('id="dropdownVolume"');
    }
  });

  it('Mute and Unmute are two separately gated buttons, never an else', () => {
    expect(BUNDLE.slice(1_924_260, 1_924_400)).toContain(
      'O(11,e.audioVolume>0?11:-1),m(),O(12,0==e.audioVolume?12:-1)'
    );
    expect(volumeBody({ audioVolume: 1 })).not.toContain('Unmute');
    expect(volumeBody({ audioVolume: 0 })).not.toContain('> Mute <');
  });
});

describe('SVC-03 — the presenter-row ids diverge, and the reference is why', () => {
  /*
    ALREADY BUILT: `screen-volume.ts`'s `presenterRowId` carries the decision and its reasoning.
    What was never asserted anywhere that RUNS is the measurement under it, so it is here: the
    reference builds the SAME ids in both dropdowns, six occurrences over two components, and both
    dropdowns are in the document at once in viewer-only mode.
  */
  it('the reference interpolates one id shape in both components', () => {
    const hits = BUNDLE.split('ei("name","talkingPresenter",i,"-donot-disturb")').length - 1;
    expect(hits, 'app-presentationarea and app-room each build it once').toBe(2);
    expect(BUNDLE.split('"talkingPresenter"').length - 1, 'name, id and for, twice over').toBe(6);
    expect(BUNDLE.slice(1_922_603, 1_922_700)).toContain('"talkingPresenter"');
    expect(BUNDLE.slice(2_483_544, 2_483_640)).toContain('"talkingPresenter"');
  });

  it('and the overlay copy takes a distinct prefix so its own labels resolve', () => {
    expect(volume).toContain('idPrefix="screenTalkingPresenter"');
    expect(volumeBody({})).toContain('screenTalkingPresenter0-donot-disturb');
    expect(volumeBody({})).not.toContain('"talkingPresenter0-donot-disturb"');
  });
});
