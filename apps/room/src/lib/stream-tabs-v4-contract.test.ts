import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import { codeOf } from '#lib/source-comments.js';
import { parseConstTable } from './const-table.mjs';
import StreamTabs from './components/StreamTabs.svelte';
import type { MtxStream } from './mtx-streams';

/**
 * `StreamTabs.svelte` against the PINNED v4 bundle — the one this checkout actually holds.
 *
 * ## Why this file exists beside `stream-tabs-contract.test.ts` rather than inside it
 *
 * That file reads `docs/source/main.d6d3c112b59b7d0d.js`. **That path is not in this repository**
 * and never can be: `docs/source` is one of the fourteen gitignored capture roots, because
 * republishing a third party's compiled application from a public repository is not a question to
 * answer by accident. `gate/evidence-bound-tests.mjs` therefore excludes it — it is one of the 42
 * files the vitest banner names on every run — so on this checkout and on CI it asserts NOTHING.
 * Every claim it makes about this component has been unguarded for as long as that has been true.
 *
 * `docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` is TRACKED, 2,891,205 bytes, SHA-256
 * `40796ca83dba809bb966dad0d020ee5170b33aa4556c691957cb65f0bab87524`, and it is the bundle the
 * audit register is written against. So the same facts are re-pinned here, against evidence that
 * ships, and re-read out of the v4 bytes rather than copied across — which is what found the
 * off-by-one below.
 *
 * ## The const table is walked BY VALUE, and that is the whole of `STB-02`
 *
 * `parseConstTable` is handed the array text and the entries are then compared to what the
 * component's header claims each INDEX holds. Read that way, every index this component names from
 * 66 upward was one too high for the pinned bundle: `118` is `streamsTabsContent`, not the streams
 * bar; `74` is the tooltip, not the tab anchor. A reader following those numbers into this bundle
 * lands one entry past the const being described, every time, and the two entries either side of a
 * boundary are plausible enough that the mistake reads as correct.
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

const TABS = 'components/StreamTabs.svelte';
const tabs = codeOf(TABS, readFileSync(`${ROOT}${TABS}`, 'utf8'));

/** `app-presentationarea`'s `consts:[[`, whose opening bracket is this byte. */
const PRESENTATION_AREA_CONSTS = 1_994_264;

/**
 * The array literal at `open`, decoded with the repository's own tokenizer.
 *
 * The bracket walk is here and the DECODE is not: `src/lib/const-table.mjs` is the single source of
 * truth for turning a `consts:[…]` literal into values, and it refuses trailing input, so something
 * has to find the closing bracket first. String-aware, because const 74's tooltip is 250 characters
 * of prose and const 57 is `['href','#',…]` — a naive scan for `]` stops inside neither, but a
 * naive scan for `'` would, which is why the quote that opened a string is the only one that closes
 * it here exactly as it is in the tokenizer.
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

const CONSTS = constTableAt(PRESENTATION_AREA_CONSTS);

const stream = (id: string, name: string): MtxStream => ({
  _id: id,
  sessionID: '652882112ad80b3e7c5132d5',
  producerID: `producer-${id}`,
  mediaValue: { name, serverName: 'media.example.com' }
});

const STREAMS = [stream('aaa111', 'Dana Vero'), stream('bbb222', 'Kit Marlow')];
const body = (props: Record<string, unknown>) =>
  render(StreamTabs, { props: { streams: STREAMS, ...props } }).body;

describe('the evidence this file measures is loaded', () => {
  it('is the pinned bundle and the real component', () => {
    expect(BUNDLE.length).toBe(2_891_205);
    /* A component that failed to load would make every `not.toContain` below vacuous. */
    expect(tabs).toContain('streamsTabs');
    expect(tabs.length).toBeGreaterThan(500);
  });

  it('walked a const table rather than an empty one', () => {
    expect(CONSTS.length).toBe(292);
  });

  it('STB-04 — and the superseded file still SAYS it does not run here', () => {
    /*
      The pairing between these two files is the only thing stopping a reader trusting twelve `it`
      names that assert nothing on this checkout, and until 2026-08-31 it existed solely in this
      file's docblock — where somebody reading the OTHER file would never see it.

      That note now lives at the head of `stream-tabs-contract.test.ts` too, and this asserts it is
      still there. A one-directional cross-reference is how the pair comes apart: whoever re-points
      or retires that file will be reading that file, not this one.

      The three bundle generations are named there as a table, because the obvious repair — point it
      at the v3 capture this checkout DOES hold — was measured and does not work: v3 is a third
      minifier generation carrying neither this file's literals nor that one's.
    */
    const superseded = readFileSync(
      new URL('./stream-tabs-contract.test.ts', import.meta.url),
      'utf8'
    );
    expect(superseded).toContain('`STB-04` — READ THIS BEFORE TRUSTING ANY ASSERTION BELOW');
    expect(superseded).toContain('stream-tabs-v4-contract.test.ts` is the file that RUNS');
    /*
      And it still reads the absent bundle, which is the fact the note is about — asserted by
      FILENAME ALONE, never with its directory.

      Writing the full path here excluded THIS file. `evidence-bound-tests.mjs` strips comments and
      then matches a quote, `../` or `/` followed by a missing root; a string literal holding
      `docs/source/…` is code, not a comment, so the one file that runs became the 43rd excluded one
      and the suite reported "No test files found" for it. Caught within a minute by the gate, and
      it is the precise mirror of defect 1 that module's own docblock records — a citation is not a
      read, and here a read that was only a citation looked like one.
    */
    expect(superseded).toContain('main.d6d3c112b59b7d0d.js');
  });
});

describe('STB-02 — the const indices, decoded by VALUE out of the pinned table', () => {
  /*
    Each pair below is the same assertion twice: the index this component now names holds what it
    says, AND the index it used to name holds something else. The second half is the one that
    matters — without it the test passes on a table that happens to repeat a shape, and an off-by-one
    is exactly the error that produces plausible neighbours.
  */
  it('117 is the streams bar; 118, the old number, is its CONTENT pane', () => {
    expect(CONSTS[117]).toEqual([
      'id',
      'streamsTabs',
      'role',
      'tablist',
      1,
      'nav',
      'nav-tabs',
      'screens-tabs'
    ]);
    expect(CONSTS[118]).toEqual(['id', 'streamsTabsContent', 1, 'tab-content']);
  });

  it('73 is the tab anchor; 74, the old number, is the forced-screen tooltip', () => {
    expect(CONSTS[73]).toEqual([
      'data-bs-toggle',
      'tab',
      'role',
      'tab',
      'aria-selected',
      'true',
      1,
      'nav-link',
      3,
      'ngClass',
      'id'
    ]);
    expect(CONSTS[74]).toContain('tooltip');
  });

  it('31 is the `li`, and it is the node that carries the click', () => {
    expect(CONSTS[31]).toEqual(['role', 'presentation', 1, 'nav-item', 3, 'click']);
    /* And the anchor does NOT: it binds ngClass and id, and nothing else. */
    expect(CONSTS[73]).not.toContain('click');
  });

  it('82 is the lock badge with its click; 83, the old number, is the padlock glyph', () => {
    expect(CONSTS[82]).toEqual([
      'placement',
      'bottom',
      'tooltip',
      'Unlock this screen?',
      1,
      'mr-2',
      3,
      'click'
    ]);
    expect(CONSTS[83]).toEqual(['aria-hidden', 'true', 1, 'fas', 'fa-lock']);
  });

  it('54 to 57 are the gear, its menu, the menu `li` and its anchor', () => {
    expect(CONSTS[54]).toEqual([1, 'fas', 'fa-cog']);
    expect(CONSTS[55]).toEqual(['aria-labelledby', 'dropdownMenuButton', 1, 'dropdown-menu']);
    expect(CONSTS[56]).toEqual([3, 'click']);
    expect(CONSTS[57]).toEqual(['href', '#', 1, 'dropdown-item']);
  });

  it('77 and 78 are the gear wrapper and its toggle', () => {
    expect(CONSTS[77]).toEqual([1, 'd-inline-block']);
    expect(CONSTS[78]).toEqual([
      'id',
      'dropdownMenuScreen',
      'data-bs-toggle',
      'dropdown',
      'aria-expanded',
      'false',
      1,
      'dropdown-toggle'
    ]);
  });

  it('the component names the corrected numbers and not the old ones', () => {
    const raw = readFileSync(`${ROOT}${TABS}`, 'utf8');
    expect(raw).toContain('| 117   |');
    expect(raw).toContain('| 73    |');
    /* The stale rows, each of which named the entry AFTER the one it described. */
    expect(raw).not.toContain('| 118   |');
    expect(raw).not.toContain('| 83    |');
    expect(raw).not.toContain('| 79    |');
    expect(raw).not.toContain('| 58    |');
    expect(raw).not.toContain('| 82/84/87 |');
  });
});

describe('STB-05 — the forced-screen tooltip is ONE const entry, quoted here verbatim', () => {
  /*
    The header used to say the two bars read "two literals in one table". Decoding the table says
    otherwise: `xSe` (streams) and `iSe` (screenshares) both open `d(0,"span",74)`, so it is a
    single entry read twice. The transcription is asserted against that entry rather than against a
    copy of itself, which is the only version of this assertion that can fail for a real reason.
  */
  it('matches const 74 character for character', () => {
    const tooltip = CONSTS[74] as unknown[];
    /*
      The component writes the string as three concatenated fragments, so it never appears in the
      source as one substring — a `toContain` here would fail for a component that is CORRECT. The
      fragments are joined back before the comparison, which is what makes this a by-value check of
      the transcription rather than of the way Prettier broke the line.
    */
    const declared = tabs.indexOf('const FORCED_SCREEN_TOOLTIP =');
    expect(declared, 'the tooltip constant is gone or renamed').toBeGreaterThan(-1);
    /*
      Bound and asserted, not inlined — `slice-anchor-contract.test.ts` is the file about that, and
      its ceiling only goes down. A missing terminator makes `indexOf` return -1 and `slice(n, -1)`
      hand back everything but the last character, so the join below would run over the rest of the
      file and still produce a string.
    */
    const terminator = tabs.indexOf(';', declared);
    expect(terminator, 'the tooltip declaration lost its terminator').toBeGreaterThan(declared);
    const statement = tabs.slice(declared, terminator);
    const joined = (statement.match(/'([^']*)'/g) ?? []).map((part) => part.slice(1, -1)).join('');
    expect(joined).toBe(tooltip[3]);
    expect(joined.length).toBeGreaterThan(200);
  });

  it('and both reference bars open the same const', () => {
    /* `xSe` on the streams bar, `iSe` on the screenshare bar — one const entry, two readers. */
    expect(BUNDLE.slice(1_925_418, 1_925_474)).toContain('d(0,"span",74)');
    expect(BUNDLE.slice(1_918_787, 1_918_843)).toContain('d(0,"span",74)');
  });
});

describe('STB-01 — the tab-select listener sits where const 31 puts it', () => {
  it('the reference hangs it on the `li`, inside `ISe`', () => {
    expect(BUNDLE.slice(1_925_991, 1_926_160)).toContain(
      'd(0,"li",31),x("click",function(){const o=D(e).$implicit;return E(g(2).onStreamTabChange(o._id))})'
    );
    /* The anchor opens immediately after the `li`'s listener, and takes none of its own. */
    expect(BUNDLE.slice(1_925_991, 1_926_160)).toContain('}),d(1,"a",73),H(2,xSe');
  });

  it('and nothing in the reference tab stops the click reaching it', () => {
    /*
      This is the assertion the three `stopPropagation` calls were violating. Angular's compiled
      listeners stop propagation only by RETURNING FALSE; `E(...)` is `resetView`, which returns
      what the component method returned, and `onStreamTabChange`, `toggleLockScreenMTX` and
      `bringFocusToScreen` all return undefined. So upstream the gear, the lock badge and every
      menu item select their tab as a side effect, and that is reproduced here by letting the
      click bubble.
    */
    expect(BUNDLE.slice(1_925_991, 1_926_600)).not.toContain('stopPropagation');
    expect(BUNDLE).toContain('onStreamTabChange(e){console.log("onStreamTabChange: "+e)');
  });

  it('ours puts `onselect` on the `li` and leaves the anchor without it', () => {
    expect(tabs).toContain(
      '<li role="presentation" class="nav-item" onclick={() => onselect?.(stream._id)}>'
    );
    /* The anchor keeps `onkeydown` — it is the only focusable node — and nothing else. */
    expect(tabs).toContain(
      "if (event.key === 'Enter' || event.key === ' ') onselect?.(stream._id);"
    );
    expect(tabs).not.toContain('onclick={() => onselect?.(stream._id)}\n        onkeydown');
  });

  it('and swallows no click anywhere in the component', () => {
    expect(tabs).not.toContain('stopPropagation');
  });

  it('STB-06 — follows the `href="#"` navigation now, jump and all', () => {
    /*
      Const 57 at byte 1,998,356 is `["href","#",1,"dropdown-item"]` and the reference hangs no
      handler on the anchor, so a menu click upstream follows it: the room scrolls to the top and a
      history entry is pushed.

      This assertion was the inverse until 2026-09-02 — *"half of that behaviour is reproduced (the
      bubbling) and half is not (the jump) — recorded as a deliberate divergence"*. It is a defect,
      and "it would reproduce an upstream defect" is not one of the four things that excuse a
      divergence, so both halves are reproduced now.

      BOTH parts are pinned, because they are separable and either alone is wrong: the anchor must
      carry the capture's bare `#` rather than an interpolated id, and nothing may prevent its
      default. `runItem` no longer takes the event at all, which is the strongest form of the second.
    */
    expect(CONSTS[57]).toContain('#');
    expect(tabs, 'the interpolated href came back').not.toContain('href="#{stream._id}"');
    expect(tabs, 'the menu anchors lost the capture’s bare href').toContain('href="#"');
    expect(tabs, 'STB-06: the navigation is being prevented again').not.toContain(
      'event.preventDefault();'
    );
    expect(tabs).toContain('function runItem(streamId: string');
  });
});

describe('the four controls that are INERT upstream, re-pinned to the v4 bytes', () => {
  /*
    Each `it` is a standing refusal. If one starts failing because the reference changed, the
    feature became real and can be built from the new evidence. Until then none may be
    "implemented" from imagination. The counts are done by splitting the whole file, because a
    `grep -o` match window is what once reported three occurrences where there are four.
  */
  it('"Lock Screen" calls a console.error stub, 147 bytes after a working sibling', () => {
    expect(BUNDLE.slice(1_976_853, 1_976_920)).toContain(
      'toggleLockScreenMTX(e){console.error("TODO: toggleLockScreenMTX")'
    );
    expect(BUNDLE.slice(1_976_706, 1_976_780)).toContain(
      'toggleLockScreen(e){this.appService.globals.lockedScreenID='
    );
  });

  it('the forced (eye) badge has no writer in the entire bundle', () => {
    const hits = BUNDLE.split('forcedScreenMTXID').length - 1;
    expect(hits, 'exactly one read in the template, one init in the constructor').toBe(2);
    expect(BUNDLE.slice(1_954_252, 1_954_280)).toContain('forcedScreenMTXID=""');
    expect(BUNDLE.slice(1_926_594, 1_926_640)).toContain('O(2,i.forcedScreenMTXID==e._id?2:-1)');
  });

  it('the lock badge has no writer either, and the count is FOUR', () => {
    const hits = BUNDLE.split('lockedScreenIDMTX').length - 1;
    expect(hits, 'one globals init, one template read, two in the selectStreamTabOfId guard').toBe(
      4
    );
    expect(BUNDLE.slice(977_288, 977_320)).toContain('lockedScreenIDMTX=""');
    expect(BUNDLE.slice(1_961_880, 1_962_000)).toContain(
      '!this.appService.globals.lockedScreenIDMTX||this.appService.globals.lockedScreenIDMTX===e._id'
    );
  });

  it('"Bring everyone here" broadcasts an id no recipient can resolve', () => {
    expect(BUNDLE.slice(1_969_281, 1_969_380)).toContain(
      'bringFocusToScreen(e){e&&this.appService.sendServerAdminCommand("focusOnScreen",{id:e})}'
    );
    expect(BUNDLE.slice(1_964_100, 1_964_240)).toContain(
      'guiEventBus.subscribe("focusOnScreen",e=>{const i=this.mediaService.screenSharingUsers'
    );
    expect(BUNDLE).not.toContain('focusOnScreen",e=>{const i=this.mtxHandlerService.mtxStreams');
  });

  it('and the two lock FIELDS stay separate, 112 bytes apart in one update block', () => {
    expect(BUNDLE.slice(1_926_635, 1_926_700)).toContain(
      'O(3,i.appService.globals.lockedScreenIDMTX===e._id?3:-1)'
    );
    expect(BUNDLE.slice(1_926_747, 1_926_810)).toContain(
      'O(13,i.appService.globals.lockedScreenID!==e._id?13:14)'
    );
  });
});

describe('what the tab renders', () => {
  it('is the streams bar, wearing the screenshare bar’s class', () => {
    const html = body({});
    expect(html).toContain('id="streamsTabs"');
    expect(html).toContain('nav nav-tabs screens-tabs');
  });

  it('labels a tab with mediaValue.name ALONE — no avatar, no screenName join', () => {
    const html = body({});
    expect(html).toContain('<span class="mx-1">Dana Vero</span>');
    expect(html).not.toContain('presenter-img');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('Dana Vero-');
  });

  it('marks only the selected tab active', () => {
    const html = body({ selectedStreamId: 'bbb222' });
    expect(html).toMatch(/id="bbb222-tab"[^>]*aria-selected="true"/);
    expect(html).toMatch(/id="aaa111-tab"[^>]*aria-selected="false"/);
  });

  it('gates only "Bring everyone here" on the presenter', () => {
    expect(body({ isPresenter: false })).not.toContain('Bring everyone here');
    expect(body({ isPresenter: true })).toContain('Bring everyone here');
    expect(body({ isPresenter: false })).toContain('Lock Screen');
  });

  it('keeps the three id fields driving three different things', () => {
    expect(body({ lockedStreamId: 'aaa111' })).toContain('tooltip="Unlock this screen?"');
    expect(body({ lockedStreamId: 'aaa111' })).toContain('Lock Screen');
    expect(body({ lockedScreenId: 'aaa111' })).toContain('Unlock Screen');
    expect(body({ lockedScreenId: 'aaa111' })).not.toContain('tooltip="Unlock this screen?"');
    expect(body({ forcedStreamId: 'aaa111' })).toContain('fa-eye');
    expect(body({})).not.toContain('fa-eye');
  });
});
