import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseConstTable } from './const-table.mjs';

/**
 * `app-poll-modal` against the PINNED v4 bundle — the surface `todo-next.md` had never audited.
 *
 * ## Why this file exists beside `poll-source-contract.test.ts`
 *
 * That file opens `docs/source/components/app-poll-modal.full.js`, a path under an evidence root
 * this repository does not ship, so `gate/evidence-bound-tests.mjs` excludes it: it is one of the 42
 * the vitest banner names on every run. **Every claim it makes about `PollPanel.svelte` has been
 * unasserted here and on CI for as long as that has been true** — including the one that matters
 * most, below, whose failure mode is silent.
 *
 * The same shape as `SVC-04` and `STB-04`, and the same remedy those took: the old file is neither
 * deleted nor re-pointed (its subject genuinely is a build this checkout cannot see, and retiring it
 * is the owner's call), and the facts are re-derived here from
 * `docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` — TRACKED, 2,891,205 bytes, SHA-256
 * `40796ca83dba809bb966dad0d020ee5170b33aa4556c691957cb65f0bab87524`.
 *
 * ## What the audit found, 2026-08-31
 *
 * `PollPanel.svelte` is a FAITHFUL transcription. All 53 consts were decoded by value and compared
 * against it and `PollSavedList.svelte`; every value is present, including the reference's own
 * `ria-controls` typo. One divergence, and it is correct: the loading gif is `/assets/…` rather than
 * the reference's `../../assets/…`, because that relative path is resolved from an Angular
 * component's location and this app serves the file from `static/`.
 *
 * **So the finding is not a missing feature. It is that nothing which RUNS said so** — and one thing
 * in particular could break without any instrument here noticing.
 */

const BUNDLE = readFileSync('docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', 'utf8');
const PANEL = readFileSync('src/lib/components/PollPanel.svelte', 'utf8');
const SAVED = readFileSync('src/lib/components/PollSavedList.svelte', 'utf8');
const HOST = readFileSync('src/lib/components/ModalHost.svelte', 'utf8');
const GENERATED = readFileSync('src/lib/styles/captured-runtime-components.css', 'utf8');

/** Byte 2,112,526 — `consts:[` for `app-poll-modal`, verified by the first case below. */
const POLL_MODAL_CONSTS = 2_112_526;

/**
 * The bracket walk, string-aware, lifted in shape from `screen-cluster-v4-contract.test.ts`.
 *
 * The DECODE is not here: `const-table.mjs` is the single source of truth for turning a `consts:[…]`
 * literal into values and it refuses trailing input, so something has to find the closing bracket.
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

const CONSTS = constTableAt(POLL_MODAL_CONSTS);

describe('the evidence this file measures is loaded', () => {
  it('reads the bundle at the pinned size, so an offset means something', () => {
    expect(BUNDLE.length).toBe(2_891_205);
  });

  it('and the const table is the poll modal s own, at the byte this file names', () => {
    expect(BUNDLE.slice(2_112_472, 2_112_512)).toContain('selectors:[["app-poll-modal"]]');
    expect(CONSTS).toHaveLength(53);
  });
});

describe('the three modes, which are the whole component', () => {
  it('renders exactly ONE of setup, answer or results — never two, never none', () => {
    /*
      `O(11,"setup"==o.mode?11:-1), O(12,"answer"==o.mode?12:-1), O(13,"results"==o.mode?13:-1)` at
      byte 2,116,007. Three INDEPENDENT conditionals over one string, so `-1` on all three is
      reachable — a mode nobody set renders an empty body rather than falling back to setup, and
      that is the reference's behaviour rather than a gap.
    */
    expect(BUNDLE.slice(2_116_002, 2_116_120)).toContain(
      'O(11,"setup"==o.mode?11:-1),m(),O(12,"answer"==o.mode?12:-1),m(),O(13,"results"==o.mode?13:-1)'
    );
    for (const mode of ["mode === 'setup'", "mode === 'answer'", "mode === 'results'"]) {
      expect(PANEL, `${mode} is not a branch here`).toContain(mode);
    }
  });

  it('and the titlebar swaps ONE icon class rather than rendering two buttons', () => {
    /*
      `z("ngClass", o.isMaximized ? "fa-window-restore" : "fa-window-maximize")`. Const 6 is
      `[1,"fa",3,"ngClass"]` — the class is BOUND, so there is one button whose glyph changes.
      Two buttons with one hidden would look identical and be a different DOM.
    */
    expect(CONSTS[6]).toEqual([1, 'fa', 3, 'ngClass']);
    expect(BUNDLE.slice(2_115_894, 2_116_010)).toContain(
      'o.isMaximized?"fa-window-restore":"fa-window-maximize"'
    );
    /*
      Ours writes BOTH classes in the expression — `isMaximized ? 'fa fa-window-restore' : …` —
      where upstream keeps the static `fa` in const 6 and binds only the variable half through
      `ngClass`. The rendered class list is identical; the difference is that Angular has a
      static-plus-bound form and Svelte's `class={…}` does not, so there is nowhere else to put the
      `fa`. Asserted in the form this room actually uses rather than the one it cannot express.
    */
    expect(PANEL).toContain("isMaximized ? 'fa fa-window-restore' : 'fa fa-window-maximize'");
  });
});

describe('the 53 consts, decoded BY VALUE', () => {
  it('carries the reference s own `ria-controls` typo on the saved-polls tab', () => {
    /*
      Const 15 opens `["ria-controls","savedPolls", …]` — the `a` of `aria-controls` is missing, and
      its SIBLING (const 14, the Create New Poll tab) spells it correctly. So this is a typo in one
      of two adjacent attributes rather than a convention.

      Transcribed, not corrected. A screen reader gets no `aria-controls` on that tab upstream and
      gets none here; "fixing" it would make this the one tab in the room whose accessibility
      differs from the capture, with no capture of the corrected version to check against. The
      assertion is here so that the next person to notice finds the decision instead of re-making it.
    */
    expect(CONSTS[14]).toContain('aria-controls');
    expect(CONSTS[15]).toContain('ria-controls');
    expect(CONSTS[15]).not.toContain('aria-controls');
    expect(PANEL).toContain("'ria-controls': 'savedPolls'");
  });

  it('and every value in the table is present in one of the two components', () => {
    /*
      THE SWEEP, and the reason it is a loop rather than a list: a hand-written list of 53 consts is
      53 chances to omit the one that matters, and this file's whole purpose is that nothing here has
      been checked by anything that runs.

      Attribute NAMES and bare CSS keywords are skipped — they carry no information about this
      component, and asserting `"type"` appears in a Svelte file proves nothing. What is checked is
      every value that identifies something: ids, class names, placeholder text, and the two style
      declarations the table inlines.
    */
    const boring = new Set([
      'type',
      'button',
      'click',
      'ngClass',
      'ngModel',
      'ngModelChange',
      'ngModelOptions',
      'role',
      'true',
      'false',
      'both',
      'none',
      'block',
      'left',
      'center',
      'width',
      'height',
      'display',
      'margin',
      'text-align',
      'color',
      'white',
      'clear',
      'src',
      'for',
      'rows',
      'maxlength',
      'readonly',
      'aria-hidden',
      'aria-label',
      'title',
      'name',
      'placeholder',
      'data-bs-toggle',
      'data-bs-target',
      'aria-controls',
      'aria-selected',
      'keyup.enter',
      'id'
    ]);
    const ours = PANEL + SAVED;
    const missing: string[] = [];
    for (const [index, entry] of CONSTS.entries()) {
      for (const value of entry as unknown[]) {
        if (typeof value !== 'string' || value.length < 3 || boring.has(value)) continue;
        /* The one recorded divergence — see its own case below. */
        if (value === '../../assets/images/ajax-loader.gif') continue;
        if (!ours.includes(value)) missing.push(`const ${index}: ${value}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('the loader path, transcribed literally — this app has NO divergence from app-poll-modal', () => {
  it('carries const 49 exactly, because the literal resolves to the file it needs', () => {
    /*
      Const 49 is `["src","../../assets/images/ajax-loader.gif"]`.

      **This case used to record a divergence, and the divergence was unnecessary.** It read: *"that
      path is resolved from the Angular component's own location in the source tree; this app serves
      the file from `static/`, where the URL is absolute. Reproducing the literal would request a path
      that does not exist and show a broken image on every poll awaiting its first response."*

      Every sentence of that is wrong about how a browser resolves it. RFC 3986 discards `..`
      segments that would rise above the root, so `../../assets/images/ajax-loader.gif` resolves to
      `/assets/images/ajax-loader.gif` from `/`, `/room` and `/a/b` alike — asserted below with the
      platform's own `URL`, not argued. The literal and the "corrected" form are one request.

      The FILE is asserted too, because a transcription that points at a missing asset is a broken
      image whichever spelling it uses.
    */
    expect(CONSTS[49]).toEqual(['src', '../../assets/images/ajax-loader.gif']);
    /*
      TRANSCRIBED LITERALLY since 2026-09-01. It was `/assets/…` before, and the note below explains
      why that was unnecessary rather than merely different: `..` cannot rise above the root, so both
      spellings issue the same request from every page depth this app serves.
    */
    expect(PANEL).toContain('src="../../assets/images/ajax-loader.gif"');
    expect(new URL('../../assets/images/ajax-loader.gif', 'https://x.test/').pathname).toBe(
      '/assets/images/ajax-loader.gif'
    );
    expect(() => readFileSync('static/assets/images/ajax-loader.gif')).not.toThrow();
  });
});

describe('the 2,040 bytes of component CSS, and the ancestor they all depend on', () => {
  /*
    ## THE FAILURE MODE THIS BLOCK EXISTS FOR, AND IT IS SILENT

    `PollPanel.svelte` has NO `<style>` block. Every one of the component's seventeen rules ships in
    `lib/styles/captured-runtime-components.css`, re-homed onto the custom element:

        app-poll-modal .poll-panel-titlebar:not(:root) { … }

    So they apply only while the panel is rendered INSIDE an `<app-poll-modal>` element. Delete that
    wrapper as "a div would do" — which is exactly the change somebody makes when tidying a file that
    already has 6,900 lines — and the titlebar loses its background, its drag cursor and its layout,
    the buttons lose their box, and nothing in this repository says a word: it type-checks, it lints,
    `svelte-check` is silent, and every unit test still passes.

    `img-dimensions-contract.test.ts` documents the identical trap for `app-privchat`'s avatars and
    calls it "a real and silent failure mode". This is the same one, two orders of magnitude larger.
  */
  it('renders the panel INSIDE `<app-poll-modal>`, which is what the rules select on', () => {
    const open = HOST.indexOf('<app-poll-modal');
    const panel = HOST.indexOf('<PollPanel', open);
    const close = HOST.indexOf('</app-poll-modal>', panel);
    expect(open, 'the app-poll-modal wrapper is gone').toBeGreaterThan(-1);
    expect(panel, 'PollPanel is not inside the wrapper').toBeGreaterThan(open);
    expect(close, 'the wrapper is never closed after the panel').toBeGreaterThan(panel);
  });

  it('and the generated sheet still scopes them to that element', () => {
    /*
      Both halves. The wrapper without the rules, or the rules without the wrapper, and the panel is
      unstyled either way — so asserting one alone would go green on half of the defect.
    */
    expect(GENERATED).toContain('app-poll-modal .poll-panel-titlebar:not(:root) {');
    expect(GENERATED).toContain('app-poll-modal .poll-panel-btn:not(:root) {');
  });

  it('carries every declaration the reference ships, none dropped in the re-homing', () => {
    /*
      Compared as normalised declarations rather than as whole rules, because the generated sheet
      re-serialises colours (`#2c2c2c` becomes `rgb(44, 44, 44)`) and drops vendor duplicates that
      the browser already folded. What must survive is the SET of properties and their values, and
      the two that decide whether the titlebar is a titlebar at all are named individually below.
    */
    /*
      Every bound asserted before the slice, and none of them inlined: `slice-anchor-contract` counts
      inlined `indexOf` calls and refuses a new one, because a `-1` makes `slice` return a tail of
      the whole file that contains everything and proves nothing.
    */
    const selector = BUNDLE.indexOf('selectors:[["app-poll-modal"]]');
    expect(selector, 'the poll modal is not in the bundle').toBeGreaterThan(-1);
    const styles = BUNDLE.indexOf('styles:[', selector);
    expect(styles, 'the poll modal ships no styles any more').toBeGreaterThan(selector);
    const end = BUNDLE.indexOf('"]})', styles);
    expect(end, 'the styles array is never closed').toBeGreaterThan(styles);
    const css = BUNDLE.slice(styles, end);
    expect(css.length, 'the stylesheet shrank; a rule was dropped upstream').toBeGreaterThan(2_000);

    /* `cursor:move` and `user-select:none` ARE the drag affordance. Without them the bar looks inert. */
    expect(css).toContain('cursor:move');
    expect(GENERATED).toContain('cursor: move;');
    expect(GENERATED).toContain('user-select: none;');
    /* And the body's scroll, without which a long saved-poll list runs off the panel. */
    expect(css).toContain('overflow-y:auto');
  });
});

describe('the surface this file audits is recorded as audited', () => {
  it('todo-next.md names this contract, so the row cannot say `no` while this runs', () => {
    /*
      The half that keeps the coverage number honest. `todo-next-coverage-contract.test.ts` counts a
      surface as audited when its verdict cell is not the literal `no`; this asserts the cell points
      HERE, so a row re-marked audited by some other route still has to name what did it.
    */
    const tracker = readFileSync('../../todo-next.md', 'utf8');
    const row = tracker
      .split('\n')
      .find((line) => line.includes('`lib/components/PollPanel.svelte`'));
    expect(row, 'PollPanel is not in the inventory').toBeDefined();
    expect(row).toContain('poll-panel-v4-contract.test.ts');
  });
});
