import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseConstTable } from './const-table.mjs';
import { volumeIcon } from './screen-volume';

/*
  `.mainAppNav` became `RoomNavbar.svelte` on 2026-08-15 — the third of the five template regions.
  Reference-bundle assertions are untouched; ours follow the markup into the component.
*/
const NAVBAR = readFileSync(new URL('./components/RoomNavbar.svelte', import.meta.url), 'utf8');

/*
  The screen overlay's volume dropdown, pinned against the DECODED component rather than against a
  transcription of it.

  `docs/source/components/` is this repository's decoded copy of the 51 components in the shipped
  bundle — `manifest.json` records each one's byte range and SHA-256. Every expectation below is
  READ OUT OF THOSE FILES AT RUNTIME: the const indices come from the render-helper call sites, the
  attributes and classes come from the const table those indices point into, and the gates come from
  `CSe`'s update block. Nothing here is a number somebody typed in from a reading session; if the
  reference says something different tomorrow, this file says so instead of quietly agreeing.

  Why not the bundle: `screen-controls-contract.test.ts` next door reads
  `main.d6d3c112b59b7d0d.js` because it predates the decode. Both are the same bytes — the decoded
  files are pretty-printed slices of it — but the decoded copy is the one a human can check, which is
  the point of pinning at all.
*/

const HELPERS = readFileSync(
  new URL('../../docs/source/components/app-presentationarea.render-helpers.js', import.meta.url),
  'utf8'
);
const COMPILED = readFileSync(
  new URL('../../docs/source/components/app-presentationarea.compiled.js', import.meta.url),
  'utf8'
);
const ROOM_HELPERS = readFileSync(
  new URL('../../docs/source/components/app-room.render-helpers.js', import.meta.url),
  'utf8'
);
const ROOM_COMPILED = readFileSync(
  new URL('../../docs/source/components/app-room.compiled.js', import.meta.url),
  'utf8'
);
const CONTROL = readFileSync(
  new URL('./components/ScreenVolumeControl.svelte', import.meta.url),
  'utf8'
);
const CLUSTER = readFileSync(
  new URL('./components/ScreenZoomControls.svelte', import.meta.url),
  'utf8'
);
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/*
  `PANE` in this file is `ScreenPane.svelte`. This one is the presentation AREA, which took the
  main tab strip and `#screensTabsContent` on 2026-08-15 — named in full so the two cannot be
  confused by the next reader.
*/
const PRESENTATION = readFileSync(
  new URL('./components/PresentationArea.svelte', import.meta.url),
  'utf8'
);
const ROWS = readFileSync(
  new URL('./components/PresenterMuteRows.svelte', import.meta.url),
  'utf8'
);
const MODULE = readFileSync(new URL('./screen-volume.ts', import.meta.url), 'utf8');

/** Comments quote the reference at length, so a positional assertion must not read them. */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const controlMarkup = stripComments(CONTROL);
const clusterMarkup = stripComments(CLUSTER);
/** The shared per-presenter row, which both dropdowns render. */
const rowsMarkup = stripComments(ROWS);
/**
 * The page WITHOUT its comments.
 *
 * Load-bearing: this file's own comments quote the reference at length — including the
 * `fa-volume-mute` spelling this app used to render — so a `not.toContain` against the raw text
 * would fail on the note explaining the fix rather than on the markup.
 */
const pageMarkup = stripComments(PAGE);
/*
  The navbar dropdown is `RoomNavbar.svelte` since 2026-08-15. This describe block reads it; the
  in-presentation copy of the same control is still the page's, which is the whole point of the
  block above — a superset and a subset, not alternatives.
*/
const navbarMarkup = stripComments(NAVBAR);

/** The component's `consts:[…]` table, parsed with the repository's own tokenizer. */
function constTable(compiled: string): unknown[] {
  const from = compiled.indexOf('consts: [');
  expect(from, 'the component must declare a consts table').toBeGreaterThan(-1);
  const open = compiled.indexOf('[', from);
  const close = compiled.indexOf('\n        ],\n        template:', open);
  expect(close, 'the consts table must close before the template').toBeGreaterThan(open);
  return parseConstTable(compiled.slice(open, close + '\n        ]'.length)) as unknown[];
}

const CONSTS = constTable(COMPILED);
const ROOM_CONSTS = constTable(ROOM_COMPILED);

/**
 * The const index a render helper renders, read from its own call site.
 *
 * `H(1, cSe, 1, 0, 'i', 106)` — the last argument is the const index, and taking it from the file
 * rather than from a note is what makes the table lookups below evidence instead of memory.
 */
function indexFrom(pattern: RegExp, source = HELPERS): number {
  const match = pattern.exec(source);
  expect(match, `the decoded component should contain ${pattern}`).not.toBeNull();
  return Number(match![1]);
}

/** One const entry's classes: everything after the `1` marker, up to `2` (styles) or `3` (bindings). */
function classesOf(entry: unknown): string[] {
  const items = entry as unknown[];
  const start = items.indexOf(1);
  if (start === -1) return [];
  const classes: string[] = [];
  for (const item of items.slice(start + 1)) {
    if (typeof item !== 'string') break;
    classes.push(item);
  }
  return classes;
}

/** One const entry's static attributes: the string pairs before the `1` marker. */
function attributesOf(entry: unknown): Record<string, string> {
  const items = entry as unknown[];
  const end = items.indexOf(1);
  const attributes: Record<string, string> = {};
  const upTo = end === -1 ? items.length : end;
  for (let at = 0; at + 1 < upTo; at += 2) {
    const name = items[at];
    const value = items[at + 1];
    if (typeof name === 'string' && typeof value === 'string') attributes[name] = value;
  }
  return attributes;
}

describe('the decoded component still says what this control was built from', () => {
  it('carries the zoom-overlay trigger, which is NOT the navbar one', () => {
    const overlay = CONSTS.findIndex(
      (entry) =>
        Array.isArray(entry) &&
        entry.includes('dropdownVolume') &&
        classesOf(entry).includes('btn-dark')
    );
    expect(overlay, 'app-presentationarea should declare the btn-dark trigger').toBeGreaterThan(-1);
    expect(classesOf(CONSTS[overlay])).toEqual(['btn', 'btn-sm', 'btn-dark']);
    expect(attributesOf(CONSTS[overlay])).toEqual({
      id: 'dropdownVolume',
      'data-bs-toggle': 'dropdown'
    });

    // …and the navbar's copy is a DIFFERENT const in a DIFFERENT component.
    const nav = ROOM_CONSTS.findIndex(
      (entry) =>
        Array.isArray(entry) &&
        entry.includes('dropdownVolume') &&
        classesOf(entry).includes('nav-link')
    );
    expect(nav, 'app-room should declare the nav-link trigger').toBeGreaterThan(-1);
    expect(classesOf(ROOM_CONSTS[nav])).toEqual(['nav-link', 'd-flex', 'align-items-center']);
  });

  it('renders the trigger ONLY in viewer-only mode', () => {
    expect(HELPERS).toContain('O(3, e.appService.globals.viewerOnlyMode ? 3 : -1)');
    // The MENU has no gate at all: it is created unconditionally in `CSe`'s create block.
    expect(HELPERS).toMatch(/d\(4, 'div', 91\)\(5, 'h4'\)/);
  });

  it('gates Mute on > 0 and Unmute on == 0, as two separate conditionals', () => {
    expect(HELPERS).toContain('O(11, e.audioVolume > 0 ? 11 : -1)');
    expect(HELPERS).toContain('O(12, 0 == e.audioVolume ? 12 : -1)');
  });

  it('gates the presenter rows on talkingUsers and the slider on individualVolumeControls', () => {
    expect(HELPERS).toContain(
      'O(15, e.mediaService.talkingUsers && e.mediaService.talkingUsers.length > 0 ? 15 : -1)'
    );
    expect(HELPERS).toContain(
      'O(6, o.appService.globals.sessData.individualVolumeControls ? 6 : -1)'
    );
  });
});

describe('the icon thresholds are the reference own, and they are STRICT', () => {
  it('hSe still branches on > 50, < 50 && > 4 and < 4', () => {
    expect(HELPERS).toContain('O(1, e.audioVolume > 50 ? 1 : -1)');
    expect(HELPERS).toContain('O(2, e.audioVolume < 50 && e.audioVolume > 4 ? 2 : -1)');
    expect(HELPERS).toContain('O(3, e.audioVolume < 4 ? 3 : -1)');

    // And the port must not have widened either bound.
    expect(MODULE).toContain('audioVolume > 50');
    expect(MODULE).toContain('audioVolume < 50 && audioVolume > 4');
    expect(MODULE).toContain('audioVolume < 4');
    expect(MODULE).not.toMatch(/audioVolume\s*>=/);
    expect(MODULE).not.toMatch(/audioVolume\s*<=/);
  });

  it('the three icon classes come from the const table, and we render those exact ones', () => {
    const up = indexFrom(/H\(1, cSe, 1, 0, 'i', (\d+)\)/);
    const down = indexFrom(/\(2, dSe, 1, 0, 'i', (\d+)\)/);
    const off = indexFrom(/\(3, uSe, 1, 0, 'i', (\d+)\)/);

    expect(classesOf(CONSTS[up])).toEqual(['fas', 'fa-volume-up']);
    expect(classesOf(CONSTS[down])).toEqual(['fas', 'fa-volume-down']);
    /*
      `fa-volume-off`, NOT `fa-volume-mute`. The navbar copy in `+page.svelte` renders
      `fa-volume-mute` for its third branch while `app-room`'s own const 107 is `fa-volume-off` —
      recorded in TODO.md as a separate, pre-existing divergence rather than fixed under this change.
    */
    expect(classesOf(CONSTS[off])).toEqual(['fas', 'fa-volume-off']);

    for (const cls of ['fa-volume-up', 'fa-volume-down', 'fa-volume-off']) {
      expect(controlMarkup, `${cls} should be rendered`).toContain(`fas ${cls}`);
    }
    expect(controlMarkup, 'the overlay must not borrow the navbar icon').not.toContain(
      'fa-volume-mute'
    );
  });

  it('the port agrees with those branches at every boundary value', () => {
    // The same six values `verify-screen-volume.mjs` renders in Chromium.
    expect([0, 4, 5, 50, 51, 100].map(volumeIcon)).toEqual([
      'fa-volume-off',
      null,
      'fa-volume-down',
      null,
      'fa-volume-up',
      'fa-volume-up'
    ]);
  });
});

describe('the menu reproduces its consts attribute for attribute', () => {
  it('the menu, its heading close control and the master slider', () => {
    const menu = CONSTS.findIndex(
      (entry) => Array.isArray(entry) && classesOf(entry).includes('volumeControl')
    );
    expect(attributesOf(CONSTS[menu])).toEqual({ 'aria-labelledby': 'dropdownVolume' });
    expect(classesOf(CONSTS[menu])).toEqual(['dropdown-menu', 'volumeControl']);
    expect(controlMarkup).toContain('aria-labelledby="dropdownVolume"');
    expect(controlMarkup).toContain('class="dropdown-menu volumeControl"');

    // The `h4`'s own text node, spaces included: `v(6, ' Volume ')`.
    expect(HELPERS).toContain("v(6, ' Volume ')");
    expect(controlMarkup).toMatch(/<h4>\s*Volume/);

    const closer = CONSTS.findIndex(
      (entry) => Array.isArray(entry) && classesOf(entry).join(' ') === 'float-right mr-2'
    );
    expect(attributesOf(CONSTS[closer])).toEqual({ 'data-bs-toggle': 'dropdown' });
    expect(controlMarkup).toContain('<span data-bs-toggle="dropdown" class="float-right mr-2">');

    const master = CONSTS.findIndex(
      (entry) => Array.isArray(entry) && classesOf(entry).join(' ') === 'mx-auto py-2 volCtrl'
    );
    expect(attributesOf(CONSTS[master])).toEqual({
      audioVolSlider: '',
      type: 'range',
      min: '0',
      max: '100',
      title: 'Volume'
    });
    expect(controlMarkup).toContain('class="mx-auto py-2 volCtrl"');
    expect(controlMarkup).toContain('audiovolslider=""');
  });

  it('Mute and Unmute are two buttons that differ only in their title', () => {
    const mute = CONSTS.findIndex(
      (entry) => Array.isArray(entry) && attributesOf(entry).title === 'Mute Audio'
    );
    const unmute = CONSTS.findIndex(
      (entry) => Array.isArray(entry) && attributesOf(entry).title === 'Unmute Audio'
    );
    expect(classesOf(CONSTS[mute])).toEqual(['btn', 'btn-primary', 'btn-sm']);
    expect(classesOf(CONSTS[unmute])).toEqual(['btn', 'btn-primary', 'btn-sm']);
    // `v(1, ' Mute ')` / `v(1, ' Unmute ')` — the labels, and the handlers behind them.
    expect(HELPERS).toContain("v(1, ' Mute ')");
    expect(HELPERS).toContain("v(1, ' Unmute ')");
    expect(HELPERS).toContain('g(4).mute()');
    expect(HELPERS).toContain('g(4).unmute()');
    expect(controlMarkup).toContain('title="Mute Audio"');
    expect(controlMarkup).toContain('title="Unmute Audio"');
  });

  it('reproduces the checkbox, its typo, and the per-presenter slider', () => {
    const checkbox = CONSTS.findIndex(
      (entry) => Array.isArray(entry) && attributesOf(entry).title === 'Presenter audio'
    );
    const attributes = attributesOf(CONSTS[checkbox]);
    // The reference's own typo: `value="Presenter audiob"`, one `b` past the word.
    expect(attributes.value).toBe('Presenter audiob');
    expect(attributes.type).toBe('checkbox');
    expect(classesOf(CONSTS[checkbox])).toEqual(['form-check-input']);
    // The row itself is `PresenterMuteRows`, shared with the navbar copy.
    expect(rowsMarkup).toContain('value="Presenter audiob"');

    const rowSlider = CONSTS.findIndex(
      (entry) => Array.isArray(entry) && classesOf(entry).join(' ') === 'mx-auto py-1 volCtrl'
    );
    expect(rowSlider, 'the per-presenter slider is py-1, not py-2').toBeGreaterThan(-1);
    expect(rowsMarkup).toContain('class="mx-auto py-1 volCtrl"');
    expect(rowsMarkup).toContain('class="mx-2 text-center"');

    // `ei('name'|'id'|'for', 'talkingPresenter', i, '-donot-disturb')`, keyed by ROW INDEX.
    expect(HELPERS).toContain("ei('name', 'talkingPresenter', i, '-donot-disturb')");
    // `${prefix}${index}-donot-disturb`, with the prefix defaulting to the reference's own — see
    // the id-collision test below for why the overlay copy passes a different one.
    expect(MODULE).toContain('`${prefix}${index}-donot-disturb`');
    expect(rowsMarkup).toContain("idPrefix = 'talkingPresenter'");
  });

  it('swaps Mute for Muted on the label, the way mSe and gSe do', () => {
    expect(HELPERS).toContain("1 & t && (d(0, 'span'), v(1, 'Mute'), u());");
    expect(HELPERS).toContain("1 & t && (d(0, 'span'), v(1, 'Muted'), u());");
    // `O(3, muted ? -1 : 3)` shows "Mute" when NOT muted; `O(5, muted ? 5 : -1)` shows "Muted".
    expect(HELPERS).toContain(
      'O(3, o.appService.globals.preferences.audioMutedFor[e.userID] ? -1 : 3)'
    );
    expect(HELPERS).toContain(
      'O(5, o.appService.globals.preferences.audioMutedFor[e.userID] ? 5 : -1)'
    );
    expect(rowsMarkup).toContain('{#if !muted}<span>Mute</span>{/if}');
    expect(rowsMarkup).toContain('{#if muted}<span>Muted</span>{/if}');
  });
});

describe('audioMutedFor is an object, and unmuting deletes the key', () => {
  it('the reference stores {name} and deletes it', () => {
    const compact = COMPILED.replace(/\s+/g, '');
    expect(compact).toContain('audioMutedFor[i]={name:o.name}');
    expect(compact).toContain('deletethis.appService.globals.preferences.audioMutedFor[i]');
    expect(compact).not.toContain('audioMutedFor[i]=!1');
  });

  it('and so does the port', () => {
    expect(MODULE).toContain('delete audioMutedFor[userID]');
    expect(MODULE).toContain('audioMutedFor[userID] = { name: mediaValue.name }');
    expect(MODULE).not.toMatch(/audioMutedFor\[userID\]\s*=\s*(false|true)/);
  });
});

describe('the two room-sound-options are a superset and a subset, not alternatives', () => {
  it('the overlay holds presenter rows ONLY', () => {
    // `d(14, 'div', 97), H(15, vSe, 2, 0), u()()` — one child, the repeater.
    expect(HELPERS).toContain("d(14, 'div', 97),\n      H(15, vSe, 2, 0),");
    // And app-presentationarea has no sound checkbox at all: those ids live in app-room.
    expect(COMPILED).not.toContain('alert-donot-disturb');
    expect(ROOM_COMPILED).toContain('alert-donot-disturb');
  });

  it('the NAVBAR copy holds the same rows AND the six checkboxes', () => {
    /*
      The correction this test exists for. `HANDOFF.md` said the navbar's `room-sound-options` was
      "the sound checkboxes" and the overlay's was "one row per talking presenter", as if they were
      different content. `app-room.render-helpers.js` shows the navbar has BOTH — `b4e` repeats the
      identical presenter row and appends an `hr`, and the checkboxes follow it.
    */
    expect(ROOM_HELPERS).toContain('ht(0, _4e, 7, 14, null, null, qAe)');
    expect(ROOM_HELPERS).toContain('g(3).toggleTalkingPresenter(o)');
    expect(ROOM_HELPERS).toContain(
      'O(51, e.mediaService.talkingUsers && e.mediaService.talkingUsers.length > 0 ? 51 : -1)'
    );
    // …which is why the navbar copy in this app is INCOMPLETE, recorded in TODO.md rather than
    // silently fixed here: `+page.svelte`'s `room-sound-options` renders the six checkboxes only.
    expect(NAVBAR).toContain('class="room-sound-options"');
  });
});

describe('the NAVBAR dropdown, which is the same control in a different component', () => {
  const NAV = readFileSync(
    new URL('./components/PresenterMuteRows.svelte', import.meta.url),
    'utf8'
  );
  const rows = stripComments(NAV);

  it('renders the presenter rows FIRST, then a rule, then the six checkboxes', () => {
    /*
      `d(50, 'div', 116), H(51, b4e, 3, 0, 'hr'), d(52, 'div', 117)(53, 'input', 118)` — the
      repeater is the FIRST child of `div.room-sound-options` and the checkbox rows follow it
      (`app-room.render-helpers.js:1224-1231`). `b4e` is the repeater plus a trailing `hr`
      (`:1103-1106`), and its gate is `talkingUsers.length > 0` (`:1436`).
    */
    expect(ROOM_HELPERS).toContain("d(50, 'div', 116),\n      H(51, b4e, 3, 0, 'hr'),");
    expect(ROOM_HELPERS).toContain("ht(0, _4e, 7, 14, null, null, qAe), T(2, 'hr')");
    expect(classesOf(ROOM_CONSTS[116])).toEqual(['room-sound-options']);
    expect(classesOf(ROOM_CONSTS[117])).toEqual(['my-1']);
    expect(attributesOf(ROOM_CONSTS[118]).id).toBe('alert-donot-disturb');

    const soundOptions = navbarMarkup.slice(
      navbarMarkup.indexOf('<div class="room-sound-options">')
    );
    const rowsAt = soundOptions.indexOf('<PresenterMuteRows');
    const firstCheckbox = soundOptions.indexOf('alert-donot-disturb');
    expect(rowsAt, 'the navbar dropdown must render the presenter rows').toBeGreaterThan(-1);
    expect(rowsAt).toBeLessThan(firstCheckbox);
    expect(soundOptions.slice(rowsAt, firstCheckbox)).toContain('trailingRule');
  });

  it('uses the same three icon consts, and the third is fa-volume-off', () => {
    // `l4e`/`c4e`/`d4e` render consts 105/106/107 (`app-room.render-helpers.js:974-982`).
    expect(classesOf(ROOM_CONSTS[105])).toEqual(['fas', 'fa-2x', 'fa-volume-up']);
    expect(classesOf(ROOM_CONSTS[106])).toEqual(['fas', 'fa-2x', 'fa-volume-down']);
    expect(classesOf(ROOM_CONSTS[107])).toEqual(['fas', 'fa-2x', 'fa-volume-off']);
    expect(ROOM_HELPERS).toContain('O(35, e.audioVolume < 4 ? 35 : -1)');
    expect(navbarMarkup).toContain('fas fa-2x fa-volume-off');
    expect(navbarMarkup, 'fa-volume-mute is in neither const table').not.toContain(
      'fa-volume-mute'
    );
  });

  it('gates the background-music block on THREE sources and styles its container', () => {
    // `O(48, e.scPlaying || e.mp3Playing || e.appService.globals.roomState.ytURL ? 48 : -1)`
    expect(ROOM_HELPERS).toContain(
      'O(48, e.scPlaying || e.mp3Playing || e.appService.globals.roomState.ytURL ? 48 : -1)'
    );
    expect(NAVBAR).toContain('{#if media.soundCloudPlaying || mp3Playing || youtubeForAllUrl}');

    // Const 114 is `[2,'text-align','center']` — a `2` marker is STYLES, so no class at all.
    expect(ROOM_CONSTS[114]).toEqual([2, 'text-align', 'center']);
    expect(classesOf(ROOM_CONSTS[114])).toEqual([]);
    expect(classesOf(ROOM_CONSTS[199])).toEqual(['m-0']);
    expect(NAVBAR).toContain('<div style="text-align: center;">');
  });

  it('the Subtitles label icon is the const the reference names', () => {
    // `T(79, 'i', 54)` inside the subtitles label (`app-room.render-helpers.js:1268`).
    expect(ROOM_HELPERS).toContain("T(79, 'i', 54)");
    expect(classesOf(ROOM_CONSTS[54])).toEqual(['fas', 'fa-closed-captioning']);
    expect(NAVBAR).toContain('<i class="fas fa-closed-captioning"></i> Subtitles');
  });

  it('the muted class on the row label is the reference own, not an assumption', () => {
    /*
      `ut(12, KB, …audioMutedFor[e.userID])` with `KB = (t) => ({ muted: t })`
      (`app-room.render-helpers.js:7`), and the overlay's is `HCe`, spelled identically
      (`app-presentationarea.render-helpers.js:11`). Both resolve to the single class `muted`.
    */
    expect(ROOM_HELPERS).toContain('KB = (t) => ({ muted: t })');
    expect(HELPERS).toContain('HCe = (t) => ({ muted: t })');
    // Phase 4: the directive became the clsx attribute form. `{ muted }` is the shorthand, which
    // is the same shape `HCe` returns.
    expect(rows).toContain('{ muted }');
  });

  it('the ids collide UPSTREAM, and this app diverges on purpose for the overlay copy', () => {
    /*
      Both components build the row ids identically, and in viewer-only mode both dropdowns are in
      the document at once — so upstream every `talkingPresenter{i}-donot-disturb` appears twice and
      the overlay's labels resolve to the navbar's checkboxes. The navbar copy keeps the captured
      ids; the overlay copy takes a distinct prefix. Recorded in TODO.md under decisions taken
      deliberately.
    */
    expect(HELPERS).toContain("ei('name', 'talkingPresenter', i, '-donot-disturb')");
    expect(ROOM_HELPERS).toContain("ei('name', 'talkingPresenter', i, '-donot-disturb')");
    expect(rows).toContain("idPrefix = 'talkingPresenter'");
    expect(controlMarkup).toContain('idPrefix="screenTalkingPresenter"');
    // The navbar copy must NOT pass a prefix: it keeps the captured ids exactly.
    const soundOptions = PAGE.slice(PAGE.indexOf('<div class="room-sound-options">'));
    const navRows = soundOptions.slice(
      soundOptions.indexOf('<PresenterMuteRows'),
      soundOptions.indexOf('/>', soundOptions.indexOf('<PresenterMuteRows'))
    );
    expect(navRows).not.toContain('idPrefix');
  });
});

describe('viewer-only mode drives every binding the reference gives it', () => {
  const TABS = readFileSync(new URL('./components/ScreenTabs.svelte', import.meta.url), 'utf8');
  const PANE = readFileSync(new URL('./components/ScreenPane.svelte', import.meta.url), 'utf8');
  const SHARE_HELPERS = readFileSync(
    new URL('../../docs/source/components/app-screenshare-view.render-helpers.js', import.meta.url),
    'utf8'
  );
  const SHARE_COMPILED = readFileSync(
    new URL('../../docs/source/components/app-screenshare-view.compiled.js', import.meta.url),
    'utf8'
  );

  it('hides the main tab strip', () => {
    expect(COMPILED).toContain("z('hidden', o.appService.globals.viewerOnlyMode)");
    expect(PRESENTATION).toContain('hidden={viewerOnlyMode}');
  });

  it('hides the chat and alerts column', () => {
    // `viewerOnlyMode && (this.hideChatAlerts = viewerOnlyMode)` — app-room's ngOnInit.
    expect(ROOM_COMPILED.replace(/\s+/g, '')).toContain(
      'this.appService.globals.viewerOnlyMode&&(this.hideChatAlerts=this.appService.globals.viewerOnlyMode)'
    );
    /*
      This used to assert a branch keyed on `viewerOnlyMode` itself. That was the right expectation
      for the wrong mechanism: upstream `viewerOnlyMode` is ONE OF FIVE writers of `hideChatAlerts`
      (`app-room.full.js:1893-1902`, `:2179-2181`), and the column is gated on the flag, never on
      any single writer — `O(1, e.hideChatAlerts ? -1 : 1)`. Keying a branch on the mode is what
      left the room SETTING with nowhere to be read.

      So what viewer-only owes this column is that it FEEDS the flag, which is what is asserted
      here. The gate itself, the other four writers and the two this room cannot model are covered
      by `chat-alerts-gates-contract.test.ts`.
    */
    const GATES = readFileSync(new URL('./room/gates.svelte.ts', import.meta.url), 'utf8');
    expect(GATES).toContain('this.viewerOnlyMode ||\n      this.#chatAlertsDetached()');
    expect(PAGE).toContain('{#if !gates.hideChatAlerts}');
  });

  it('refuses to open the private chat', () => {
    expect(ROOM_COMPILED.replace(/\s+/g, '')).toContain(
      'this.appService.globals.videoOnlyMode||this.appService.globals.viewerOnlyMode||'
    );
    /*
      The refusal moved into `RoomPrivateChat.show()` in Phase 5 slice 7. Both halves are read: the
      class refuses, and the PAGE is what tells it what viewer-only means — a class that refused
      against a flag nobody supplied would pass a source assertion and never fire.
    */
    const privateChatModule = readFileSync(
      new URL('room/private-chat.svelte.ts', import.meta.url),
      'utf8'
    );
    expect(privateChatModule).toContain('show() {');
    expect(privateChatModule).toContain('if (this.#viewerOnlyMode()) return;');
    expect(PAGE).toContain('viewerOnlyMode: () => gates.viewerOnlyMode,');
  });

  it('removes the navbar and the sidebar, and reclaims the 49px they reserved', () => {
    const ROOM_FULL = readFileSync(
      new URL('../../docs/source/components/app-room.full.js', import.meta.url),
      'utf8'
    );
    /*
      Nodes 3 and 4 of the root template carry the SAME gate — one condition evaluated twice, which
      is why one `{#if}` covers both here (`app-room.full.js:4043-4059`):

        O(3, videoOnlyMode || chatOnlyMode || viewerOnlyMode ? -1 : 3)   // _Pe = the sidebar
        O(4, videoOnlyMode || chatOnlyMode || viewerOnlyMode ? -1 : 4)   // A4e = the navbar

      and the root div binds `KAe = (t, n) => ({'push-wrapper': t, 'mt-0': n})` with `n` as that same
      flag (`:4029-4039`, the helper at `:5`).
    */
    const compact = ROOM_FULL.replace(/\s+/g, '');
    expect(compact).toContain("KAe=(t,n)=>({'push-wrapper':t,'mt-0':n})");
    expect(
      compact.match(
        /O\(\d,o\.appService\.globals\.videoOnlyMode\|\|o\.appService\.globals\.chatOnlyMode\|\|o\.appService\.globals\.viewerOnlyMode\?-1:\d\)/g
      )?.length,
      'the sidebar and the navbar carry the same gate, twice'
    ).toBe(2);

    // `mt-0` is not cosmetic: the 49px is space reserved for the `fixed-top` navbar.
    const APPLIED = readFileSync(
      new URL('../../src/lib/styles/captured-runtime-components.css', import.meta.url),
      'utf8'
    );
    // The de-scoped rule's `:not(…)` guard is ~1kB of component names, so the assertion reads the
    // block after the selector rather than trying to span it with one pattern.
    const wrapperAt = APPLIED.indexOf('app-room\n  .wrapper:not(:root)');
    expect(wrapperAt, 'the de-scoped app-room .wrapper rule must exist').toBeGreaterThan(-1);
    expect(APPLIED.slice(wrapperAt, wrapperAt + 2500)).toContain('margin-top: 49px');

    expect(pageMarkup).toContain("'mt-0': chatOnlyMode || gates.viewerOnlyMode");
    expect(pageMarkup).toContain('{#if !(chatOnlyMode || gates.viewerOnlyMode)}');
    // And the harness that measures the consequence must actually render those elements — it did
    // not, which is why `4/4` could not catch the defect this pins.
    const LAYOUT_HARNESS = readFileSync(
      new URL('../../scripts/verify-viewer-only-layout.mjs', import.meta.url),
      'utf8'
    );
    for (const token of ['mainAppNav', 'room-sidebar', 'wrapperMarginTop', 'splitBottom']) {
      expect(LAYOUT_HARNESS, `the layout harness must measure ${token}`).toContain(token);
    }
  });

  it('gives the split the full viewport height, which is the other half of hiding a column', () => {
    // `QB = (t) => ({'vh-100': t})`, bound to videoOnly || chatOnly || viewerOnly.
    expect(ROOM_HELPERS).toContain("QB = (t) => ({ 'vh-100': t })");
    expect(ROOM_HELPERS).toContain('e.appService.globals.viewerOnlyMode\n      )');
    expect(pageMarkup).toContain("'vh-100': chatOnlyMode || gates.viewerOnlyMode");
  });

  it('applies all three viewer-only classes as BINDINGS, never as static classes', () => {
    expect(HELPERS).toContain("jCe = (t) => ({ 'viewer-only-screen-tab': t })");
    expect(HELPERS).toContain("VCe = (t) => ({ 'viewer-only-screen-zoom-controls': t })");
    expect(SHARE_HELPERS).toContain(
      "H0e = (t, n) => ({ hidden: t, 'viewer-only-screen-video': n })"
    );

    expect(stripComments(PRESENTATION)).toContain("'viewer-only-screen-tab': viewerOnlyMode");
    expect(clusterMarkup).toContain("'viewer-only-screen-zoom-controls': viewerOnlyMode");
    expect(stripComments(PANE)).toContain("'viewer-only-screen-video': viewerOnlyMode");

    // The defect this replaced: both were STATIC, so viewer-only geometry applied to every room.
    expect(stripComments(PANE)).not.toContain('webcamScreen viewer-only-screen-video');
    expect(stripComments(PANE)).not.toContain('tab-pane fade viewer-only-screen-tab');
  });

  it('puts viewer-only-screen-tab on const 72, the ONLY element in wSe that can carry it', () => {
    /*
      `wSe`'s update block walked against its create block
      (`app-presentationarea.render-helpers.js:471-494`): `O(0,…)`, `m(2)`, `pt(…)`, `m(2)`,
      `O(4,…)` — an explicit index, so the pointer is fixed independently of counting — then `m()`
      to node 5, where the `ngClass` lands. Node 5 is `d(5, 'div', 72)`.

      The const table agrees from the other side: only const 72 carries a `3,'ngClass'` marker, and
      Angular emits that marker exactly where a binding exists. So const 70 (`ul#screenTabs`) cannot
      carry one at all, and const 73's only `ngClass` is `Hr = {'show active': t}`.
    */
    expect(HELPERS).toContain("d(5, 'div', 72)");
    expect(HELPERS).toContain("z('ngClass', ut(3, jCe, e.appService.globals.viewerOnlyMode))");
    expect(attributesOf(CONSTS[72]).id).toBe('screensTabsContent');
    expect(CONSTS[72]).toContain('ngClass');
    expect(CONSTS[70]).not.toContain('ngClass');
    expect(HELPERS).toContain("Hr = (t) => ({ 'show active': t })");

    const presentationMarkup = stripComments(PRESENTATION);
    const tabsContent = presentationMarkup.slice(
      presentationMarkup.indexOf('id="screensTabsContent"')
    );
    expect(tabsContent.slice(0, 250)).toContain("'viewer-only-screen-tab': viewerOnlyMode");
    expect(stripComments(TABS), 'the tab strip cannot carry it').not.toContain(
      'viewer-only-screen-tab'
    );
    expect(stripComments(PANE), 'the pane cannot carry it either').not.toContain(
      'viewer-only-screen-tab'
    );
  });

  it('binds BOTH arguments of H0e, not just the one that was interesting', () => {
    /*
      `hidden: !o.isConnected || (o.isPresentingThisScreen && !o.localpreview) || o.mediaService.saveData`
      (`app-screenshare-view.compiled.js:338-343`). Term by term:

        * `!isConnected` -> `stream === null`.
        * `isPresentingThisScreen && !localpreview` is FALSE by construction here — our own screens
          always local-preview — so modelling it would add a term that can never be true.
        * `saveData` was unmodelled when this test was written, and the comment said so. It is
          modelled now: the writer was found in the bundle on 2026-08-14
          (`toggleDisableVideo(){this.saveData=!this.saveData}`, byte 1136736) and the AV settings
          modal's control drives it.

      So the assertion moved from one term to two, which is the binding getting MORE faithful rather
      than the test being loosened — and it is written as an exact string so a fourth term, or a
      dropped one, fails here.
    */
    expect(SHARE_COMPILED.replace(/\s+/g, '')).toContain(
      '!o.isConnected||(o.isPresentingThisScreen&&!o.localpreview)||o.mediaService.saveData'
    );
    expect(stripComments(PANE)).toContain('{ hidden: stream === null || saveData');
    // The class needs a rule, and this component's copy is scoped — hence its own style block.
    expect(PANE).toMatch(/\.hidden\s*\{\s*display:\s*none;/);
  });

  it('does not reproduce `controls`, because upstream it can never be true', () => {
    // `showControls = !1`, toggled only by a click on the element that carries
    // `.webcamScreen { pointer-events: none }` — so the binding is permanently false upstream.
    expect(SHARE_COMPILED).toContain('(this.showControls = !1)');
    expect(SHARE_COMPILED).toContain('o.showControls = !o.showControls');
    expect(SHARE_COMPILED).toContain('pointer-events:none');
    expect(stripComments(PANE)).not.toMatch(/<video[^>]*\scontrols/);
  });

  it('and every one of those classes is painted by the sheet this app serves', () => {
    const APPLIED = readFileSync(
      new URL('../../css/complete-app-styles.css', import.meta.url),
      'utf8'
    );
    for (const cls of [
      'viewer-only-screen-tab',
      'viewer-only-screen-zoom-controls',
      'viewer-only-screen-video'
    ]) {
      expect(APPLIED, `${cls} must have a rule, or the binding is decoration`).toContain(
        `.${cls} {`
      );
    }
  });
});

describe('the cluster keeps the captured child order', () => {
  it('the volume dropdown sits between the zoom trio and the dark buttons', () => {
    /*
      `CSe`'s create block:
        d(0,'li',71)(1,'div',88),
        H(2, lSe, 7, 3, 'div', 89)(3, hSe, 4, 3, 'button', 90),
        d(4,'div',91)…            <- the menu
        d(16,'button',98)…        <- togglePanZoom, captureVideoImage, fullScreenshare
    */
    expect(HELPERS).toContain("H(2, lSe, 7, 3, 'div', 89)(3, hSe, 4, 3, 'button', 90)");
    expect(HELPERS).toContain("d(16, 'button', 98)");

    const trio = clusterMarkup.indexOf('{@render zoomTrio()}');
    const volume = clusterMarkup.indexOf('{@render volume?.()}');
    const dark = clusterMarkup.indexOf('{@render darkButtons()}');
    expect(volume, 'the cluster must render the volume slot').toBeGreaterThan(-1);
    expect(trio).toBeLessThan(volume);
    expect(volume).toBeLessThan(dark);

    // And the detached variant must NOT get one: app-screenshare-view has no volume control.
    const detached = clusterMarkup.slice(clusterMarkup.indexOf('{:else}'));
    expect(detached).not.toContain('{@render volume');
  });

  it('the page supplies the slot, and gates it on the vo query parameter', () => {
    // The slot is filled in the pane now; the SNIPPET it is filled with is still the page's.
    expect(PRESENTATION).toContain('volume={screenVolume}');
    expect(PAGE).toContain('{#snippet screenVolume()}');
    expect(PAGE).toContain('{screenVolume}');
    const GATES_SOURCE = readFileSync(new URL('./room/gates.svelte.ts', import.meta.url), 'utf8');
    expect(GATES_SOURCE).toContain("page.url.searchParams.get('vo') === '1'");
    expect(GATES_SOURCE).toContain("page.url.searchParams.get('vo') === '2'");
    expect(controlMarkup).toContain('{#if viewerOnlyMode}');
  });
});
