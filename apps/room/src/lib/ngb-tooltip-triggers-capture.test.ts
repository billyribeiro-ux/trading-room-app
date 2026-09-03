import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The three assertions about the reference's own tooltip DIRECTIVE, split out on 2026-09-03.
 *
 * ## What they were costing
 *
 * `ngb-tooltip-triggers-contract.test.ts` holds ten cases. Seven read the collector's own capture
 * JSON — `evidence-tooltips-presenter-2026-08-12.json`, COMMITTED, 87,095 bytes — and our
 * `ngb-tooltip.ts`: that the capture is of the ROOM host rather than the account app, the room's
 * Bootstrap version, that hovering the GIF control produced no tooltip element at all, and that our
 * attachment returns before binding anything. A module-scope read of the gitignored `docs/source`
 * took all ten out of every checkout without the dumps, because `gate/evidence-bound-tests.mjs`
 * excludes by FILE.
 *
 * ## What is here
 *
 * The three facts about the directive that the free file's decisions rest on: that `triggers` is a
 * declared NgbTooltip input (*"THE fact the whole change rests on"*), that there is no separate
 * `[tooltip]` directive for the inert `tooltip="Unlock this screen?"` markup to belong to, and that
 * the GIF host's template declares `placement` twice — `top` then `auto` — so the `auto` this
 * application renders is a match rather than a collapse of ours.
 */

const cwd = process.cwd();
const BUNDLE = readFileSync(resolve(cwd, 'docs/source/main.d6d3c112b59b7d0d.js'), 'utf8');

describe('triggers is an NgbTooltip input, not a popover-only one', () => {
  it('the directive declares it', () => {
    /*
      THE fact the whole change rests on. Read out of the bundle rather than transcribed, so if the
      reference ever drops the input this test fails instead of quietly describing something gone.
    */
    const at = BUNDLE.indexOf('selectors:[["","ngbTooltip",""]]');
    expect(at).toBeGreaterThan(-1);
    const def = BUNDLE.slice(at, at + 300);
    expect(def).toContain('triggers:"triggers"');
    expect(def).toContain('placement:"placement"');
  });

  it('there is no separate [tooltip] directive for it to belong to instead', () => {
    // `tooltip="Unlock this screen?"` on the screen tabs binds to nothing. Inert markup, not a
    // second tooltip system — which is why no run while sharing a screen could ever capture it.
    expect(BUNDLE).not.toContain('"","tooltip",""');
    expect((BUNDLE.match(/selectors:\[\["","ngbTooltip",""\]\]/g) ?? []).length).toBe(1);
  });
});

describe('the GIF host declares placement twice, and auto is the later one', () => {
  it('so the auto our markup renders is a match, not a collapse of ours', () => {
    /*
      ANCHORS `the DOM carries one placement, and it is auto` in the free file, which asserts the
      CAPTURED DOM — committed — carries exactly one `placement` and that it is `auto`. This is the
      template line that makes that a match: only the later of two declarations survives, so `top`
      is dead in the reference too.
    */
    expect(BUNDLE).toContain('"ngbTooltip","Search for GIFs","placement","top","placement","auto"');
  });
});
