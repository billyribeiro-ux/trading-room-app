import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The editable trigger's HOVER and FOCUS colours, pinned to the two captured stylesheet rules that
 * decide them.
 *
 * ## Why this exists
 *
 * `manage.css` carried an invented hover colour — `border-bottom-color: rgb(35,82,124)`, with the
 * text left near-black — under a comment asserting that hover "is NOT evidence" because the DOM
 * capture is entirely at rest. That premise was half right and wholly misleading: the computed
 * capture is at rest, but the capture ALSO contains the reference's own stylesheets, and they state
 * hover outright. Nobody had read them end to end, so an invented value sat behind a confident
 * comment that discouraged the next reader from looking.
 *
 * ## The two rules, read from the capture
 *
 *     evidence-dumps/NEXT-STEP/gaps/sheet-6.css:14-16
 *       (= https://protradingroom.com/public/vendor/angular-xeditable/dist/css/xeditable.min.css,
 *          per stylesheets.json entry 6)
 *
 *       14  .editable-click, a.editable-click {
 *             color: rgb(66,139,202); border-bottom: 1px dashed rgb(66,139,202); }
 *       15  .editable-click:hover, a.editable-click:hover {
 *             color: rgb(42,100,150); border-bottom-color: rgb(42,100,150); }
 *       16  .editable-empty, .editable-empty:hover, .editable-empty:focus,
 *           a.editable-empty, a.editable-empty:hover, a.editable-empty:focus {
 *             font-style: italic; color: rgb(221,17,68); }
 *
 *     evidence-dumps/NEXT-STEP/gaps/sheet-9.css:1193
 *       (= https://protradingroom.com/public/app/css/styles.css — the app's OWN sheet)
 *
 *       1193  .editable-click, a.editable-click { color: rgb(10,10,10); }
 *
 * sheet-9:1193 is the ONLY `.editable-*` rule in all 2,574 lines of styles.css. That was
 * established by reading the file, not by searching it: lines 1..1046 are byte-identical to
 * 1272..2317 (styles.css includes its theme block twice), so the file reduces to lines 1..1271 plus
 * 34 unique tail lines, and all of those were read.
 *
 * ## The cascade those four rules produce
 *
 * `a.editable-click` and `a.editable-empty` are both (0,1,1). styles.css is a LATER sheet than
 * xeditable (index 9 vs 6), so at rest it wins the colour and drags both the ordinary and the empty
 * trigger to near-black — which is exactly what the rect capture measures on all 115 empty nodes.
 *
 * It cannot reach the interaction states, because `a.editable-click:hover` is (0,2,1) and beats it:
 *
 *   | state    | .editable-click              | .editable-click.editable-empty          |
 *   | -------- | --------------------------- | --------------------------------------- |
 *   | resting  | rgb(10,10,10)  / rgb(66,139,202) | rgb(10,10,10) italic / rgb(66,139,202) |
 *   | :hover   | rgb(42,100,150)/ rgb(42,100,150) | rgb(221,17,68) italic/ rgb(42,100,150) |
 *   | :focus   | as resting                  | rgb(221,17,68) italic/ rgb(66,139,202)  |
 *
 * The empty row's hover text is red rather than the hover blue because sheet-6:16 and sheet-6:15
 * are an exact specificity tie broken by source order, and 16 comes after 15. Its UNDERLINE is
 * still the hover blue, because 16 never sets `border-bottom-color`. That split is why the two
 * `:hover` / `:focus` selectors in `manage.css` cannot be collapsed into one.
 *
 * `:focus` is absent from sheet-6:15, so a focused NON-empty trigger measures like a resting one —
 * which is why grouping `:focus` with `:hover`, as the old rule did, was wrong twice over.
 */

const CSS = readFileSync(new URL('../manage.css', import.meta.url), 'utf8');

/** Collapse whitespace so assertions do not depend on how the file happens to be wrapped. */
const FLAT = CSS.replace(/\s+/g, ' ');

function block(selector: string): string {
  const at = FLAT.indexOf(`${selector} {`);
  expect(at, `no rule found for \`${selector}\``).toBeGreaterThan(-1);
  return FLAT.slice(at, FLAT.indexOf('}', at));
}

/**
 * Every declaration in a rule, as an exact property -> value map.
 *
 * This is parsed rather than substring-matched because substring-matching is silently inert here:
 * `border-bottom-color: rgb(42, 100, 150)` CONTAINS `color: rgb(42, 100, 150)`, so a
 * `toContain('color: …')` assertion on the text colour passes even when the text colour is wrong.
 * The first draft of this test did exactly that, and its negative control caught it — the hover
 * colour was reverted to near-black and all seven assertions still went green.
 */
function decls(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of block(selector).slice(block(selector).indexOf('{') + 1).split(';')) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    out[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
  }
  return out;
}

describe('editable trigger hover/focus, per the captured stylesheets', () => {
  it('hover moves BOTH the text and the underline to xeditable rgb(42,100,150)', () => {
    const d = decls('.mg-root .editable-click:hover');
    expect(d['color']).toBe('rgb(42, 100, 150)');
    expect(d['border-bottom-color']).toBe('rgb(42, 100, 150)');
  });

  it('never reintroduces rgb(35,82,124) on an editable', () => {
    // The value the hover rule carried before the stylesheets were read.
    //
    // Scoped to the editable rules ON PURPOSE. rgb(35,82,124) is #23527c — Bootstrap 3's real
    // `@link-hover-color`, `darken(@link-color, 15%)` where `@link-color` is #337ab7 — and it is
    // CORRECT where `manage.css` uses it on `.btn-link:hover`. The first draft of this test banned
    // it file-wide and went red on that legitimate use.
    //
    // That is also the likely provenance of the bug: a real Bootstrap token borrowed onto an
    // xeditable element it does not govern. So the thing to guard is the misapplication, not the
    // value.
    for (const selector of [
      '.mg-root .editable-click:hover',
      '.mg-root .editable-empty:hover',
      '.mg-root .editable-empty:focus',
      '.mg-root .mg-date:hover'
    ]) {
      expect(Object.values(decls(selector)).join(' '), selector).not.toContain('35, 82, 124');
    }
  });

  it('does not group :focus with :hover for a non-empty trigger', () => {
    // sheet-6:15 names :hover only, so a focused non-empty field measures like a resting one.
    expect(FLAT).not.toContain('.mg-root .editable-click:focus');
  });

  it('an empty trigger is near-black at rest — styles.css beats xeditable on source order', () => {
    const d = decls('.mg-root .editable-empty');
    expect(d['color']).toBe('rgb(10, 10, 10)');
    expect(d['font-style']).toBe('italic');
    expect(d['border-bottom-color']).toBe('rgb(66, 139, 202)');
  });

  it('an empty trigger goes xeditable red on hover, with the hover-blue underline', () => {
    const d = decls('.mg-root .editable-empty:hover');
    expect(d['color']).toBe('rgb(221, 17, 68)');
    // sheet-6:16 sets no border-bottom-color, so 15 still supplies it
    expect(d['border-bottom-color']).toBe('rgb(42, 100, 150)');
  });

  it('an empty trigger goes red on focus, but keeps the RESTING underline', () => {
    const d = decls('.mg-root .editable-empty:focus');
    expect(d['color']).toBe('rgb(221, 17, 68)');
    // :focus is absent from sheet-6:15, so the underline falls back to sheet-6:14
    expect(d['border-bottom-color']).toBe('rgb(66, 139, 202)');
  });

  it('the stats date inputs get the same hover, being .editable-click in the reference', () => {
    // Read on the User Stats capture as
    // `<a href="#" editable-date="statsDate" class="ng-scope ng-binding editable editable-click">`.
    // Ours is an <input class="mg-date">, which the .editable-click rule cannot reach.
    const d = decls('.mg-root .mg-date:hover');
    expect(d['color']).toBe('rgb(42, 100, 150)');
    expect(d['border-bottom-color']).toBe('rgb(42, 100, 150)');
  });
});
