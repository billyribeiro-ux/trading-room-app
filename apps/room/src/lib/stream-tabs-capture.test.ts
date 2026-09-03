import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The seven assertions about the reference's own streams tab bar, split out on 2026-09-03.
 *
 * ## What they were costing
 *
 * `stream-tabs-contract.test.ts` holds fifteen cases. Eight RENDER `StreamTabs` and read its output,
 * and three of those keep two similarly-named id fields from being confused: `lockedStreamId` drives
 * the badge and not the menu label, `lockedScreenId` drives the menu label and not the badge, and
 * the forced (eye) badge is its own third field. Those eight need nothing but this repository, and a
 * module-scope read of the gitignored `docs/source` took all fifteen out of every checkout without
 * the dumps, because `gate/evidence-bound-tests.mjs` excludes by FILE.
 *
 * ## What is here, and why it matters that it is a REFUSAL
 *
 * Four of these seven are standing refusals, and the free file's own header says what they are
 * protecting against: *"the failure mode is not that somebody deletes them — it is that somebody
 * 'finishes' one by inventing a protocol, and ships a lock button that locks nothing on a
 * multi-tenant fintech room."* `toggleLockScreenMTX` is a `console.error` stub upstream;
 * `forcedScreenMTXID` and `lockedScreenIDMTX` have no writer anywhere in the bundle; "Bring everyone
 * here" broadcasts an id no recipient can resolve.
 *
 * If one of these starts failing because the reference changed, the feature became real and can be
 * built from the new evidence. Until then, none of them may be implemented from imagination — and
 * that is a claim that has to be RUNNABLE by whoever holds the dumps, which is what this file is.
 */

const bundle = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);

describe('the reference markup is decoded, not inferred', () => {
  it('pins the whole update block in one string', () => {
    /*
      This single assertion carries most of the transcription. Reading left to right it fixes: the
      anchor id (`${_id}-tab`), the `active` class map, `aria-controls`, BOTH dead badges, the label
      being `mediaValue.name` and nothing else, the `isP` gate on the first menu item, and the
      lockedScreenID/lockedScreenIDMTX asymmetry that the last two clauses disagree about.
    */
    expect(bundle).toContain(
      'm(),ei("id","",e._id,"-tab"),z("ngClass",ut(9,Go,i.selectedMTXStreamTab==e._id)),' +
        'Dt("aria-controls",e._id),m(),O(2,i.forcedScreenMTXID==e._id?2:-1),m(),' +
        'O(3,i.appService.globals.lockedScreenIDMTX===e._id?3:-1),m(2),Ze(e.mediaValue.name),' +
        'm(5),O(10,i.isP?10:-1),m(3),O(13,i.appService.globals.lockedScreenID!==e._id?13:14)'
    );
  });

  it('pins the const entries for the bar and its pane', () => {
    // The bar is `id="streamsTabs"` but wears the SCREENSHARE bar's `screens-tabs` class.
    expect(bundle).toContain(
      '"id","streamsTabs","role","tablist",1,"nav","nav-tabs","screens-tabs"'
    );
    expect(bundle).toContain('"id","streamsTabsContent",1,"tab-content"');
    // There is no `streams-tabs` class anywhere. Inventing one would look right and style nothing.
    expect(bundle).not.toContain('"streams-tabs"');
  });

  it('pins the two menu items and the class map', () => {
    expect(bundle).toContain('["href","#",1,"dropdown-item"]');
    expect(bundle).toContain('["aria-labelledby","dropdownMenuButton",1,"dropdown-menu"]');
    // `Go` is what `ut(9,Go,…)` above resolves to — the `active` class, not `show active`.
    expect(bundle).toContain('Go=t=>({active:t})');
  });
});

describe('the four controls that are INERT upstream', () => {
  /*
    Each `it` below is a standing refusal. If one starts failing because the reference changed, the
    feature became real and can be built from the new evidence. Until then, none of them may be
    "implemented" from imagination.
  */

  it('"Lock Screen" calls a console.error stub', () => {
    expect(bundle).toContain('toggleLockScreenMTX(e){console.error("TODO: toggleLockScreenMTX")');
    // And it sits directly beside a REAL implementation for screenshares, so it is not that the
    // feature is unimplementable — it is that this half of it was never written.
    expect(bundle).toContain('toggleLockScreen(e){this.appService.globals.lockedScreenID=');
  });

  it('the forced (eye) badge has no writer in the entire bundle', () => {
    const hits = bundle.split('forcedScreenMTXID').length - 1;
    expect(hits, 'exactly one read in the template, one init in the constructor').toBe(2);
    expect(bundle).toContain('forcedScreenMTXID=""');
  });

  it('the lock badge has no writer either', () => {
    /*
      FOUR, not three. The `selectStreamTabOfId` guard names the field TWICE in one expression, and
      the first attempt at this count said three because it came from a `grep -o` whose match window
      swallowed the second occurrence. The count is done here by splitting the whole file precisely
      so that a miscount fails the build instead of becoming a comment nobody rechecks.
    */
    const hits = bundle.split('lockedScreenIDMTX').length - 1;
    expect(hits, 'one globals init, one template read, two in the selectStreamTabOfId guard').toBe(
      4
    );
    expect(bundle).toContain('lockedScreenIDMTX=""');
    // The only READ outside the template is the guard, which is why the field looks load-bearing.
    expect(bundle).toContain(
      '!this.appService.globals.lockedScreenIDMTX||this.appService.globals.lockedScreenIDMTX===e._id'
    );
  });

  it('"Bring everyone here" broadcasts an id no recipient can resolve', () => {
    // It sends the same command the screenshare menu sends...
    expect(bundle).toContain(
      'bringFocusToScreen(e){e&&this.appService.sendServerAdminCommand("focusOnScreen",{id:e})}'
    );
    // ...but every receiver scans the SCREENSHARE list only, never mtxHandlerService.mtxStreams.
    expect(bundle).toContain(
      'guiEventBus.subscribe("focusOnScreen",e=>{const i=this.mediaService.screenSharingUsers'
    );
    expect(bundle).not.toContain('focusOnScreen",e=>{const i=this.mtxHandlerService.mtxStreams');
  });
});
