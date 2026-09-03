import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  GUTTER_DOUBLE_CLICK_MS,
  PRESENTATION_COLLAPSED_SPLIT,
  PRESENTATION_RESTORED_SPLIT,
  NO_PENDING_CLICK,
  gutterRelease,
  togglePresentationSplit
} from './split-gutter';

/*
  THE THREE CAPTURE READS THAT SAT HERE ARE IN `split-gutter-capture.test.ts`.

  They were MODULE-SCOPE reads of the gitignored `docs/source`, and `gate/evidence-bound-tests.mjs`
  excludes by FILE, so four cases took all TWELVE here out of every checkout without the dumps —
  this container, and CI. The eight that stayed EXECUTE the double-click rule: that a single click
  does nothing, that the fourth restores, that a drag pair is not a double-click, and that three
  clicks are one double-click and a leftover. Those are the assertions a regression would break.
*/
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/*
  THE ROOM'S LAYOUT MOVED TO `RoomShell.svelte` on 2026-08-17 (Phase 5, S4+S8) — the `as-split`
  element, the gutter, the mobile/desktop child order and the two layout effects. The three panes
  did NOT: they are still built on `+page.svelte` and handed over as snippets, so every pane prop
  list and every pane contract is untouched.

  Assertions about layout read `SHELL`; the gate names lost their `gates.` prefix in the same move
  because the shell takes the RESOLVED booleans as props instead of reaching into the gates object.
*/
const SHELL = readFileSync(new URL('./components/RoomShell.svelte', import.meta.url), 'utf8');

/**
 * A gutter, clicked.
 *
 * This is the point of extracting the state machine: the room can be driven here without a browser,
 * so "collapse and restore" is an actual sequence of clicks at actual timestamps rather than an
 * assertion that two constants exist.
 */
function clickGutter(
  start: { mainSplit: number; lastClickAt: number },
  { at, moved = false }: { at: number; moved?: boolean }
) {
  const release = gutterRelease(start.lastClickAt, at, moved);
  return {
    mainSplit: release.doubleClick ? togglePresentationSplit(start.mainSplit) : start.mainSplit,
    lastClickAt: release.lastClickAt
  };
}

describe('the gutter double-click collapses and restores the presentation area', () => {
  it('does nothing on a single click', () => {
    const room = { mainSplit: 0.4, lastClickAt: NO_PENDING_CLICK };
    const after = clickGutter(room, { at: 5_000 });
    expect(after.mainSplit).toBe(0.4);
  });

  it('collapses the presentation on the second click, and restores it on the fourth', () => {
    /*
      One continuous session, four clicks, real timestamps — the acceptance criterion for this item
      in the only shape that can fail.
    */
    let room = { mainSplit: 0.4, lastClickAt: NO_PENDING_CLICK };

    room = clickGutter(room, { at: 1_000 });
    expect(room.mainSplit, 'one click is not a double-click').toBe(0.4);

    room = clickGutter(room, { at: 1_150 });
    expect(room.mainSplit, 'presAreaSize > 0, so it collapses to 0 / 100').toBe(
      PRESENTATION_COLLAPSED_SPLIT
    );

    room = clickGutter(room, { at: 5_000 });
    expect(room.mainSplit, 'still collapsed after one click').toBe(PRESENTATION_COLLAPSED_SPLIT);

    room = clickGutter(room, { at: 5_200 });
    expect(room.mainSplit, 'presAreaSize is 0, so it restores to 70 / 30').toBe(
      PRESENTATION_RESTORED_SPLIT
    );
  });

  it('restores to the reference’s 70/30 and not to the size the user had dragged', () => {
    // Deliberate: upstream restores a fixed pair, so the second double-click is a reset.
    const dragged = { mainSplit: 0.62, lastClickAt: NO_PENDING_CLICK };
    const collapsed = clickGutter(clickGutter(dragged, { at: 100 }), { at: 200 });
    const restored = clickGutter(clickGutter(collapsed, { at: 900 }), { at: 1_000 });
    expect(restored.mainSplit).toBe(0.3);
    expect(restored.mainSplit).not.toBe(0.62);
  });

  it('ignores clicks further apart than the reference’s 400ms', () => {
    const room = { mainSplit: 0.4, lastClickAt: NO_PENDING_CLICK };
    const first = clickGutter(room, { at: 1_000 });
    const late = clickGutter(first, { at: 1_000 + GUTTER_DOUBLE_CLICK_MS + 1 });
    expect(late.mainSplit).toBe(0.4);
    // The boundary itself counts — `<=`, so exactly 400ms apart is a double-click.
    const onTheBoundary = clickGutter(first, { at: 1_000 + GUTTER_DOUBLE_CLICK_MS });
    expect(onTheBoundary.mainSplit).toBe(PRESENTATION_COLLAPSED_SPLIT);
  });

  it('does not treat the first click of the session as a double-click', () => {
    /*
      A REGRESSION, found by the "restores to 70/30" case above while this file was being written.

      The sentinel for "no click pending" was `0`, and `performance.now()` counts from page load —
      so a genuine first click at t=100ms was 100ms away from the sentinel, inside the 400ms window,
      and the room collapsed its presentation area on a SINGLE click. The same collision returned
      after every completed double-click, because that reset the timestamp to the sentinel too.

      Anything but `-Infinity` here reopens it, which is why this asserts the behaviour at a
      realistically small timestamp rather than asserting the constant.
    */
    const room = { mainSplit: 0.4, lastClickAt: NO_PENDING_CLICK };
    expect(clickGutter(room, { at: 1 }).mainSplit).toBe(0.4);
    expect(clickGutter(room, { at: 100 }).mainSplit).toBe(0.4);
    expect(clickGutter(room, { at: GUTTER_DOUBLE_CLICK_MS }).mainSplit).toBe(0.4);
  });

  it('does not fire on two quick DRAGS, which would throw away the resize', () => {
    const room = { mainSplit: 0.4, lastClickAt: NO_PENDING_CLICK };
    const first = clickGutter(room, { at: 1_000, moved: true });
    const second = clickGutter(first, { at: 1_100, moved: true });
    expect(second.mainSplit).toBe(0.4);
  });

  it('treats three clicks as one double-click and a leftover', () => {
    let room = { mainSplit: 0.4, lastClickAt: NO_PENDING_CLICK };
    room = clickGutter(room, { at: 1_000 });
    room = clickGutter(room, { at: 1_100 });
    expect(room.mainSplit).toBe(PRESENTATION_COLLAPSED_SPLIT);
    // The third click must not immediately re-toggle off the second one's timestamp.
    room = clickGutter(room, { at: 1_200 });
    expect(room.mainSplit).toBe(PRESENTATION_COLLAPSED_SPLIT);
  });
});

describe('the number and the binding are the reference’s', () => {
  /*
    The three cases that read the reference itself — its `hideShowPresentationArea` body, the
    `gutterDblClick` binding on BOTH splits, and const 8 carrying the 400 — are
    `split-gutter-capture.test.ts`. They read `docs/source`, which is gitignored.
  */
  it('takes 400 from the const table rather than choosing it', () => {
    // Const 8 of `app-room.compiled.js:1294-1304`, anchored in `split-gutter-capture.test.ts`.
    expect(GUTTER_DOUBLE_CLICK_MS).toBe(400);
    // And the room still renders the attribute the number came from.
    expect(SHELL).toContain('gutterdblclickduration="400"');
    // ONE `as-split`, in the shell. A second would render the whole room twice.
    expect(PAGE, 'the split element moved to RoomShell in S8').not.toContain(
      'gutterdblclickduration'
    );
  });

  it('is actually wired into the room, not just exported', () => {
    /*
      The defect being closed: the attribute shipped and `hideShowPresentationArea` had zero
      occurrences. An export nothing calls would be the same defect wearing a test.
    */
    const split = readFileSync(new URL('./room/split.svelte.ts', import.meta.url), 'utf8');

    /*
      The consumer moved to `room/split.svelte.ts` on 2026-08-15 and the chain is asserted end to
      end rather than at one link, because "an export nothing calls" can hide at any of them: the
      module imports both decisions, the toggle uses one, the release uses the other, and the PAGE
      still reaches the release on a real pointer event. Drop any link and the attribute is
      decorative again, which is the defect this file was written to close.
    */
    expect(split).toContain("from '#lib/split-gutter.js'");
    expect(split).toContain('togglePresentation(): void {');
    expect(split).toContain('this.#main = togglePresentationSplit(this.resolvedMainSplit);');
    expect(split).toContain('const release = gutterRelease(this.#lastClickAt, now, this.#moved);');
    // `now` is a parameter so the 400ms window is drivable by a test; the page supplies the clock.
    /*
      MOVED 2026-08-17: this was `finishSplit` on the page, bound to `<svelte:window onpointerup>`.
      It is now `RoomWindowHandlers.pointerUp`, beside `pointerMove` which was already a method
      there — the two halves of one gesture had been in two files.
    */
    const handlers = readFileSync(new URL('./room/window-handlers.ts', import.meta.url), 'utf8');
    expect(handlers).toContain('const write = this.#split.endDrag(performance.now());');
    expect(PAGE, 'the pointer-up handler moved to RoomWindowHandlers').not.toContain(
      'function finishSplit'
    );
    // The binding is still on the page — a drag ends anywhere in the window, so it must be a
    // `<svelte:window>` listener; only the BODY moved to the class that owns window handlers.
    expect(PAGE).toContain('onpointerup={() => windowHandlers.pointerUp()}');
  });
});
