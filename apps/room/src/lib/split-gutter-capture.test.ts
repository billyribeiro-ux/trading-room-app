import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { GUTTER_DOUBLE_CLICK_MS } from './split-gutter';

/**
 * The three assertions about the reference's own gutter double-click, split out on 2026-09-03.
 *
 * ## What they were costing
 *
 * `split-gutter.test.ts` holds twelve cases and eight of them EXECUTE the rule: a single click does
 * nothing, the second collapses and the fourth restores, a pair of quick DRAGS is not a
 * double-click (which would throw away the resize the member just made), and three clicks are one
 * double-click and a leftover. None of those needs a capture. Three module-scope reads of the
 * gitignored `docs/source` took all twelve out of every checkout without the dumps, because
 * `gate/evidence-bound-tests.mjs` excludes by FILE.
 *
 * ## What is here
 *
 * The reference's own three: the `hideShowPresentationArea` body that gives 70/30 its numbers, the
 * `gutterDblClick` binding present on BOTH the desktop and mobile splits, and const 8 carrying the
 * 400ms — which is where `GUTTER_DOUBLE_CLICK_MS` comes from rather than being chosen. That last one
 * is compared to our constant here as well, so the anchor and the value cannot drift apart.
 *
 * `does not persist, because printSizes only logs` is here too: it is entirely a statement about the
 * reference — `printSizes(){console.log(` — and is the evidence that collapsing is not a saved
 * preference in the original either.
 */

const compact = (source: string) => source.replace(/\s+/g, '');

const ROOM_FULL = readFileSync(
  new URL('../../docs/source/components/app-room.full.js', import.meta.url),
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

describe('it is the reference\u2019s handler, its number and its binding', () => {
  it('matches hideShowPresentationArea', () => {
    // `app-room.full.js:2693-2698`.
    expect(compact(ROOM_FULL)).toContain(
      'hideShowPresentationArea(){(this.presAreaSize>0?((this.presAreaSize=0),(this.chatAlertsSize=100)):((this.presAreaSize=70),(this.chatAlertsSize=30)),this.printSizes());}'
    );
  });

  it('is bound to gutterDblClick on the outer split in BOTH layouts', () => {
    // `render-helpers.js:1622-1623` (desktop `j4e`) and `:1787-1788` (mobile `K4e`).
    const bindings = compact(ROOM_HELPERS).match(
      /\('gutterDblClick',function\(\){return\(D\(e\),E\(g\(\)\.hideShowPresentationArea\(\)\)\);}\)/g
    );
    expect(bindings?.length, 'both splits bind it').toBe(2);
  });

  it('takes 400 from the const table, and ours is that number', () => {
    // Const 8 of `app-room.compiled.js:1294-1304`.
    expect(compact(ROOM_COMPILED)).toContain("'gutterDblClickDuration','400'");
    expect(GUTTER_DOUBLE_CLICK_MS).toBe(400);
  });

  it('does not persist, because printSizes only logs', () => {
    // `:2708-2712` — a console.log. `dragEnd` writes; this does not.
    expect(compact(ROOM_FULL)).toContain('printSizes(){console.log(');
  });
});
