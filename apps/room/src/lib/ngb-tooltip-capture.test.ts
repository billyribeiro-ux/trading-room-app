import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The three assertions in the tooltip family that need the REFERENCE STYLESHEET, split 2026-09-03.
 *
 * ## What one module-scope read was costing
 *
 * `ngb-tooltip.test.ts` is the file whose header records that the FIRST tooltip implementation was
 * built on inference and shipped with the reasoning written up as though it were evidence — and
 * that a collector run against the live original *"disproved all five of its decisions: the element,
 * the arrow class, the placement attribute, the direction class and the insertion point."*
 *
 * Twenty-one cases read that collector's JSON, `evidence-tooltips-presenter-2026-08-11.json`, which
 * is **committed and present in every checkout** — 87,847 bytes under `git ls-files`. Eighteen of
 * them need nothing else. They were excluded from every run without the dumps, CI included, because
 * one module-scope line read `docs/source/styles.d622cb9ed2bbc221.css` for the other three.
 *
 * The file that exists to stop a tooltip being built from inference could not run on the machine
 * that decides whether a branch is mergeable.
 *
 * ## What is here, and why it is only half of each case
 *
 * Two of the three assert the SAME rule in two sheets — the reference's, and the one this app
 * applies. Only the reference half needs a capture, and the applied half is the claim about this
 * repository, so the applied half stays in `ngb-tooltip.test.ts` and this file anchors it: the rule
 * we match is a rule the reference genuinely paints.
 *
 * `css/complete-app-styles.css` is COMMITTED, which is why the applied half can run freely. Its
 * presence is easy to misread as making every `css`-rooted read available: `css` IS an evidence root
 * in `gate/evidence-bound-tests.mjs`, but exclusion fires on a root being ABSENT, and this one is
 * not. Measuring the root NAME rather than its absence produced a wrong finding here on 2026-09-03,
 * recorded at `253efda`.
 */

/** The reference's own stylesheet, pinned by `dump-contract.test.ts`, gitignored by `.gitignore`. */
const REFERENCE_SHEET = readFileSync(
  resolve(process.cwd(), 'docs/source/styles.d622cb9ed2bbc221.css'),
  'utf8'
);

/*
  The direction the collector actually recorded, read out of the capture rather than typed here —
  the same discipline the free file's header states in its own words: *"Nothing is transcribed here
  by hand, so the test cannot drift from the evidence and cannot be satisfied by a value somebody
  typed into it."* The JSON is committed; only the stylesheet is not.
*/
const CAPTURE = JSON.parse(
  readFileSync(resolve(process.cwd(), 'evidence-tooltips-presenter-2026-08-11.json'), 'utf8')
) as {
  tooltips: {
    label: string;
    appeared: boolean;
    tooltip: { attrs: Record<string, string> } | null;
  }[];
};
const CAPTURED = CAPTURE.tooltips.find((t) => t.appeared && t.label === 'Add Emojis')!;

describe('the reference stylesheet the applied one is matched against', () => {
  it('paints the direction class the capture carried', () => {
    /*
      ANCHORS `the classes we emit are ones the reference stylesheet actually paints` in
      `ngb-tooltip.test.ts`, which asserts the same rule in `css/complete-app-styles.css`. A class
      with no rule is an invisible element, and this repository has shipped a `.flipped` with no CSS
      before — so BOTH halves matter, and only this one needs a capture.
    */
    const direction = CAPTURED.tooltip!.attrs.class.match(/bs-tooltip-[a-z-]+/)![0];
    expect(direction).toBe('bs-tooltip-start');
    expect(REFERENCE_SHEET).toContain(`.${direction} .tooltip-arrow`);
  });

  it('and has rules for both element parts', () => {
    // ANCHORS the applied-sheet half of `has rules for the element parts`.
    expect(REFERENCE_SHEET).toContain('.tooltip-inner');
    expect(REFERENCE_SHEET).toContain('.tooltip-arrow');
  });

  it('and paints the arrow through the pseudo-element, in the captured direction', () => {
    /*
      `.bs-tooltip-start .tooltip-arrow:before` sets `border-left-color`, which is why a left-placed
      arrow points right. This one has no applied-sheet twin: it is entirely a statement about the
      reference, so the whole case lives here rather than half of it.
    */
    expect(REFERENCE_SHEET).toMatch(
      /\.bs-tooltip-start \.tooltip-arrow:before\{[^}]*border-left-color/
    );
  });
});
