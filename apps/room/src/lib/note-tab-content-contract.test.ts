import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';
import { WELCOME_MAT_TOOLTIP, activateNoteMenuOnKey } from './components/notes/note-tab-chrome';

/**
 * NTC-1, NTC-2, NTC-3 — one note tab's chrome, read against `app-presentationarea` 2026-08-31.
 *
 * ## How the reference was read
 *
 * By bracket-walking that component's consts table BY VALUE — `consts:[` at byte 1,994,257, 294
 * entries — rather than by counting to a slot, and against its three templates: the tab `jSe`
 * (1,928,605), the gear menu `USe` (1,927,567) and the Welcome Mat badge `BSe` (1,927,509). The
 * component and `note-tab-chrome.ts` carry the arguments; this file is the gate for all three rows.
 *
 * ## NTC-1 — the Welcome Mat marker was an invented title on an unpainted icon
 *
 * Const 122 is a `badge badge-success mx-1 p-0` SPAN carrying a whole sentence as its tooltip, with
 * a bare `fas fa-home` inside it (const 125). What was here was `<i class="fas fa-home mx-1"
 * title="Welcome Mat">` — the `mx-1` moved onto the icon, no badge, and a two-word title that
 * appears nowhere in the 2,891,205-byte bundle. Both halves are asserted below, the second by
 * full-file search rather than by inspection.
 *
 * ## NTC-2 — the gear had no keyboard path
 *
 * Const 126 is a `dropdown-toggle` span with `data-bs-toggle="dropdown"`, no `role`, no `tabindex`
 * and no text. `bootstrap-dropdown-contract.test.ts` measures that nothing here depends on
 * `bootstrap`, so the attribute is inert and every note action behind that gear — Edit, Rename,
 * Bring everyone here, both Welcome Mat items and Delete — was mouse-only.
 *
 * ## NTC-3 — the capture's hard-coded id IS a duplicate id per tab, and is reproduced
 *
 * Const 126 names every gear `dropdownMenuNote` and const 127 points every menu's
 * `aria-labelledby` at that same literal. This component is rendered once per note tab in both
 * codebases, so upstream really does emit N elements with one id and N menus labelled by the first
 * gear.
 *
 * That was a deliberate divergence — *"matching it here would reproduce a defect"* — and it is a
 * defect, in rendered output, which is not one of the four things that excuse one. **Reproduced
 * 2026-09-02**, with the harm bounded rather than waved at: the ids collide, which is invalid HTML;
 * the accessible NAME does not change, because every gear carries the same `aria-label="Note
 * options"` and only one `<ul>` takes `.show` at a time.
 *
 * `aria-expanded` went the OTHER way in the same pass, and the reason is the same const. It sits
 * before the `1` that opens the class names, so Angular never updates it — and the element hands
 * itself to Bootstrap's Dropdown plugin with `data-bs-toggle`, which writes that attribute on every
 * show and hide. The const is the creation-time value and not the rendered one; this room ships no
 * Bootstrap JavaScript, so a binding is what reproduces what upstream renders and a literal would
 * freeze a DOM the reference never shows after its first paint. Measured for this row, MSM-02 and
 * MTS-06 together in `bootstrap-dropdown-contract.test.ts`.
 *
 * ## Negative controls, run before this file was committed
 *
 * * `badge-success` removed from the span → the badge assertion goes RED.
 * * `WELCOME_MAT_TOOLTIP`'s "noboby" corrected to "nobody" → the verbatim assertion goes RED, which
 *   is the point: the misspelling is the capture's.
 * * `tabindex="0"` deleted from the gear → the keyboard assertion goes RED.
 * * the literal `dropdownMenuNote` replaced by a per-note id → the assertion below goes RED
 *   (it asserted the opposite until 2026-09-02).
 * * `activateNoteMenuOnKey`'s `event.key !== ' '` term dropped → the Space case goes RED.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TAB_FILE = 'lib/components/notes/NoteTabContent.svelte';
const TAB_RAW = readFileSync(`${ROOT}${TAB_FILE}`, 'utf8');
/** Comments stripped: this component quotes its own attribute names in prose. */
const TAB = codeOf(TAB_FILE, TAB_RAW);

const BUNDLE = readFileSync(
  fileURLToPath(
    new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url)
  ),
  'utf8'
);

describe('NTC-1 — the Welcome Mat marker is the capture s badge, with the capture s sentence', () => {
  it('quotes const 122 verbatim, misspelling and all', () => {
    const at = BUNDLE.indexOf('"placement","bottom","ngbTooltip","This note is the Welcome Mat');
    expect(at, 'const 122 of app-presentationarea moved').toBeGreaterThan(-1);
    const constant = BUNDLE.slice(at, at + 200);
    expect(constant).toContain(WELCOME_MAT_TOOLTIP);
    expect(constant).toContain('1,"badge","badge-success","mx-1","p-0"');
    /* And the icon inside it is bare — the `mx-1` is the badge's. */
    expect(BUNDLE).toContain('function BSe(t,n){1&t&&(d(0,"span",122),T(1,"i",125),u())}');
  });

  it('renders that badge, with a tooltip something actually shows', () => {
    const at = TAB.indexOf('{#if note.isWelcomeMat}');
    expect(at, 'the Welcome Mat branch moved').toBeGreaterThan(-1);
    const badge = TAB.slice(at, at + 400);
    expect(badge).toContain('ngbtooltip: WELCOME_MAT_TOOLTIP');
    expect(badge).toContain("placement: 'bottom'");
    expect(badge).toContain('{@attach ngbTooltip}');
    expect(badge).toContain('class="badge badge-success mx-1 p-0"');
    expect(badge).toContain('<i class="fas fa-home"></i>');
  });

  it('has dropped the invented title, which is nowhere in the bundle', () => {
    expect(BUNDLE).not.toContain('"Welcome Mat"');
    expect(BUNDLE).not.toContain('"title","Welcome Mat"');
    expect(TAB).not.toContain('title="Welcome Mat"');
  });

  it('paints the badge it now renders', () => {
    /* A class with no rule is the `.flipped` defect `CLAUDE.md` names; this one has two. */
    const css = readFileSync(`${ROOT}../css/complete-app-styles.css`, 'utf8');
    expect(css).toContain(
      '.badge-success { color: rgb(255, 255, 255); background-color: rgb(0, 188, 140); }'
    );
    expect(css).toContain('.badge { display: inline-block;');
  });
});

describe('NTC-2 — the gear is reachable, named and operable', () => {
  it('reads the capture s bare toggle span out of the bundle', () => {
    expect(BUNDLE).toContain(
      '["id","dropdownMenuNote","data-bs-toggle","dropdown","aria-expanded","false",1,"dropdown-toggle"]'
    );
  });

  it('carries the four attributes the capture has no room for', () => {
    const at = TAB.indexOf('class="dropdown-toggle"');
    expect(at, 'the gear moved').toBeGreaterThan(-1);
    const gear = TAB.slice(at - 400, at + 200);
    expect(gear).toContain('role="button"');
    expect(gear).toContain('tabindex="0"');
    expect(gear).toContain('aria-label="Note options"');
    expect(gear).toContain('onkeydown={(event) => activateNoteMenuOnKey(event, onToggleMenu)}');
    /* The captured attribute stays beside them; this is an addition, not a replacement. */
    expect(gear).toContain('data-bs-toggle="dropdown"');
  });

  it('activates on Enter and Space, and on nothing else', () => {
    const pressed: string[] = [];
    const press = (key: string) => {
      let prevented = false;
      activateNoteMenuOnKey(
        {
          key,
          preventDefault: () => (prevented = true),
          stopPropagation: () => undefined
        } as unknown as KeyboardEvent,
        () => pressed.push(key)
      );
      return prevented;
    };
    expect(press('Enter')).toBe(true);
    expect(press(' ')).toBe(true);
    expect(press('Tab')).toBe(false);
    expect(pressed).toEqual(['Enter', ' ']);
  });

  it('renders the capture s six labels, five of them through the one snippet', () => {
    /*
      FIVE, not six, and the sixth is the interesting one. `USe`'s rows are
      `d(N,"li",56) → d(N+1,"a",57)` with an icon on all but one: `d(9,"a",57), v(10," Rename
      Note")` has no `T(...)` before its text. A snippet with an OPTIONAL icon would need `{#if}` or
      `{@render icon?.()}`, and both emit an SSR anchor comment between the icon and the label —
      which `notes-pane-render.test.ts` asserts contiguously against the capture. So the icon
      parameter is required and Rename Note is written out; the count is asserted so that a seventh
      row cannot join it there unnoticed.
    */
    expect([...TAB.matchAll(/\{@render menuItem\(/g)]).toHaveLength(5);
    expect([...TAB.matchAll(/class="dropdown-item"/g)]).toHaveLength(2);
    for (const label of [
      "' Edit Note'",
      "' Rename Note'",
      "' Bring everyone here'",
      "' Make Welcome Mat'",
      "' Apply as Welcome Mat to multiple rooms'",
      "' Delete'"
    ]) {
      expect(TAB, `${label} is not rendered`).toContain(label);
    }
    /* And the longhand row is the one the capture gives no icon, not one that lost its icon. */
    expect(TAB).toContain("activateNoteMenuItem(event, onRename)}>{' Rename Note'}");
  });
});

describe('NTC-3 — the menu ids are per tab, where the capture freezes one literal', () => {
  it('reads both frozen consts out of the bundle', () => {
    expect(BUNDLE).toContain('["aria-labelledby","dropdownMenuNote",1,"dropdown-menu"]');
  });

  it('writes the capture’s literal on BOTH elements', () => {
    expect(TAB).toContain('id="dropdownMenuNote"');
    expect(TAB).toContain('aria-labelledby="dropdownMenuNote"');
    /*
      Both, because they are separable and half of this is worse than either whole: a literal `id`
      with a per-note `aria-labelledby` points every menu at an element that does not exist.
    */
    expect(TAB, 'a per-note id came back').not.toContain('id={menuId}');
    expect(TAB, 'a per-note aria-labelledby came back').not.toContain('aria-labelledby={menuId}');
  });

  it('and `aria-expanded` stays BOUND, which the same const decides', () => {
    /*
      Not an inconsistency. `aria-expanded` sits in the const's static section, so Angular never
      updates it — and `data-bs-toggle` hands the element to Bootstrap's Dropdown plugin, which
      does. The const is the creation-time value; the rendered one is dynamic upstream and this room
      ships no Bootstrap JavaScript to make it so. `bootstrap-dropdown-contract.test.ts` carries the
      measurement for this row, MSM-02 and MTS-06.
    */
    expect(TAB).toContain('aria-expanded={menuOpen}');
    expect(TAB, 'the attribute was frozen with the id').not.toContain('aria-expanded="false"');
  });

  it('and the pane no longer mints an id nothing reads', () => {
    /*
      The other end. Leaving `menuId` computed and unpassed would be exactly the dead scaffolding
      this repository refuses — and `dead-export-contract` would not see it, because it was a
      template-local `{const}`.
    */
    const pane = codeOf(
      'lib/components/notes/NotesPane.svelte',
      readFileSync(`${ROOT}lib/components/notes/NotesPane.svelte`, 'utf8')
    );
    expect(pane).not.toContain('note-menu-');
  });
});
