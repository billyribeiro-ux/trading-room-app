// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';

import {
  CAPTURED_ALERTS_PERCENT,
  MOBILE_BREAKPOINT_WIDTH,
  RoomSplit,
  type SplitPair,
  type SplitPairReader,
  resolveSplitSizes,
  splitStorageKeys
} from './split.svelte';
import { DIRECT_EVIDENCE_CONTRACT } from '$lib/direct-evidence-contract';
import { DUMP_CONTRACT } from '$lib/dump-contract';
import { GUTTER_DOUBLE_CLICK_MS } from '$lib/split-gutter';

/*
  `RoomSplit` is the third of the room state classes and the first whose output is checkable against
  the capture rather than only against itself: the four flex strings in `DIRECT_EVIDENCE_CONTRACT`
  were measured off a rendered room, so a geometry that cannot reproduce them is wrong however
  self-consistent it is.

  The reactivity block at the bottom is the one no other gate can see, and its SHAPE is copied from
  `polls.svelte.test.ts`, which records two drafts that were wrong: mutating outside `$effect.root`
  records nothing, and asserting inside it is swallowed, so the test passes with a deliberately false
  expectation in it. Mutations and flushes go INSIDE the root; assertions go OUTSIDE.
*/

/** A reader over a fixed map, which is what the page's `settingsSplitPair` is over `loadedSettings`. */
const readerFor =
  (stored: Record<string, SplitPair>): SplitPairReader =>
  (key) =>
    stored[key] ?? null;

const NOTHING_STORED: SplitPairReader = () => null;

/** jsdom's own `getBoundingClientRect` is all zeros, so the panes being dragged are stubs. */
const pane = (rect: { left: number; top: number; width: number; height: number }) =>
  ({ getBoundingClientRect: () => rect }) as unknown as HTMLElement;

const at = (clientX: number, clientY: number) => ({ clientX, clientY }) as PointerEvent;

const GUTTER = DUMP_CONTRACT.baseline.splitGutterWidth;

describe('the geometry reproduces the captured room, to the digit', () => {
  /*
    The reason this file exists in the form it does.

    `DIRECT_EVIDENCE_CONTRACT.populatedRoom` records the four flex strings a real room rendered, and
    `dump-contract.test.ts:314` pins them with `toEqual`. It also records `primaryPercent`, the
    number behind the first two — and records NOTHING behind the other two, which is why the
    chat/alerts percentage lived in `+page.svelte` as a bare `40.136530587668595` with no stated
    origin while the line above it cited the contract.

    Rather than add a key to a pinned evidence object, the constant is named in the module and its
    provenance is EXECUTED here: the two percentages and the 11px gutter reproduce all four captured
    strings exactly, at the precision a browser serialises computed styles to. Change either number
    in the last place and this goes red.
  */
  const rounded = (value: number, places: number) => Number(value.toFixed(places));

  /** A percentage as the browser writes it back: 4 decimals on the percent, 5 on the pixels. */
  const renderedFlex = (percent: number) =>
    `calc(${rounded(percent, 4)}% - ${rounded((percent / 100) * GUTTER, 5)}px)`;

  it('the gutter is the captured 11px, which both terms depend on', () => {
    expect(GUTTER).toBe(11);
  });

  it('primaryPercent is the origin of primaryFlex and presentationFlex', () => {
    const percent = DIRECT_EVIDENCE_CONTRACT.populatedRoom.primaryPercent;
    expect(renderedFlex(percent)).toBe(DIRECT_EVIDENCE_CONTRACT.populatedRoom.primaryFlex);
    expect(renderedFlex(100 - percent)).toBe(
      DIRECT_EVIDENCE_CONTRACT.populatedRoom.presentationFlex
    );
  });

  it('CAPTURED_ALERTS_PERCENT is the origin of alertsFlex and chatFlex', () => {
    // The uncited literal, now cited by arithmetic instead of by comment.
    expect(renderedFlex(CAPTURED_ALERTS_PERCENT)).toBe(
      DIRECT_EVIDENCE_CONTRACT.populatedRoom.alertsFlex
    );
    expect(renderedFlex(100 - CAPTURED_ALERTS_PERCENT)).toBe(
      DIRECT_EVIDENCE_CONTRACT.populatedRoom.chatFlex
    );
  });

  it('and an unsized horizontal room emits the captured strings verbatim, not a recomputation', () => {
    /*
      The `null` branch. A stored 0 and "nothing stored" are different things: with nothing stored
      the capture's own string applies, which is how the first paint matches the reference exactly
      rather than to within a float.
    */
    const split = new RoomSplit('ltr', NOTHING_STORED);
    split.viewportWidth = 1440;

    expect(split.primaryColumn).toBe(DIRECT_EVIDENCE_CONTRACT.populatedRoom.primaryFlex);
    expect(split.presentationColumn).toBe(DIRECT_EVIDENCE_CONTRACT.populatedRoom.presentationFlex);
    expect(split.alertsRow).toBe(DIRECT_EVIDENCE_CONTRACT.populatedRoom.alertsFlex);
    expect(split.chatRow).toBe(DIRECT_EVIDENCE_CONTRACT.populatedRoom.chatFlex);
  });

  it('but a MOBILE room computes instead, because the capture was a desktop measurement', () => {
    // `isHorizontal`, not `roomIsHorizontal` — a width the captured room never had.
    const split = new RoomSplit('ltr', NOTHING_STORED);
    split.viewportWidth = MOBILE_BREAKPOINT_WIDTH;

    expect(split.primaryColumn).not.toBe(DIRECT_EVIDENCE_CONTRACT.populatedRoom.primaryFlex);
    expect(split.primaryColumn).toContain('calc(');
  });
});

describe('seeding from what the server persisted', () => {
  it('a horizontal room reads the FIRST number of the room pair', () => {
    const split = new RoomSplit('ltr', readerFor({ roomSizes: [30, 70] }));
    expect(split.main).toBeCloseTo(0.3, 10);
  });

  it('a vertical room reads the SECOND, because it stores presentation-first', () => {
    /*
      Not symmetry for its own sake: `roomSizes-bottom` is written presentation-first upstream, so
      reading index 0 would give a top/bottom room the presentation's share as the chat share and
      invert the layout on every reload.
    */
    const split = new RoomSplit('ttb', readerFor({ 'roomSizes-bottom': [70, 30] }));
    expect(split.main).toBeCloseTo(0.3, 10);
  });

  it('each direction has its OWN keys, so the two arrangements cannot overwrite each other', () => {
    expect(splitStorageKeys('ltr')).toEqual({
      horizontalRoom: true,
      roomKey: 'roomSizes',
      chatKey: 'chatAlertSizes'
    });
    expect(splitStorageKeys('ttb')).toEqual({
      horizontalRoom: false,
      roomKey: 'roomSizes-bottom',
      chatKey: 'chatAlertSizes-bottom'
    });
  });

  it('nothing stored stays NULL rather than becoming a default', () => {
    const split = new RoomSplit('ltr', NOTHING_STORED);
    expect(split.main).toBeNull();
    expect(split.chatAlerts).toBeNull();
  });

  it('a stored pair that is not two numbers is ignored, not coerced', () => {
    // `splitPairFromValue` refuses; a half-written preference must not become a NaN width.
    expect(resolveSplitSizes('ltr', readerFor({}))).toEqual({
      mainSplit: null,
      chatAlertsSplit: null
    });
  });

  it('and a stored pair outside 0-100 is clamped rather than trusted', () => {
    const split = new RoomSplit('ltr', readerFor({ roomSizes: [180, -80] }));
    expect(split.main).toBe(1);
  });

  it('switching direction re-seeds from the OTHER key pair', () => {
    const split = new RoomSplit(
      'ltr',
      readerFor({ roomSizes: [30, 70], 'roomSizes-bottom': [80, 20] })
    );
    expect(split.main).toBeCloseTo(0.3, 10);

    split.setDirection('ttb', readerFor({ roomSizes: [30, 70], 'roomSizes-bottom': [80, 20] }));
    expect(split.direction).toBe('ttb');
    expect(split.main, 'the vertical room reads index 1 of its own key').toBeCloseTo(0.2, 10);
  });
});

describe('the 601px threshold, which selects a different template upstream', () => {
  it('601 is mobile and 602 is not', () => {
    const split = new RoomSplit('ltr', NOTHING_STORED);
    split.viewportWidth = MOBILE_BREAKPOINT_WIDTH;
    expect(split.isMobileScreen).toBe(true);
    split.viewportWidth = MOBILE_BREAKPOINT_WIDTH + 1;
    expect(split.isMobileScreen).toBe(false);
  });

  it('an UNMEASURED viewport is not mobile, which is what makes SSR render the desktop tree', () => {
    // `0` means "never measured". Treating it as a width would put a phone layout in every SSR body.
    const split = new RoomSplit('ltr', NOTHING_STORED);
    expect(split.viewportWidth).toBe(0);
    expect(split.isMobileScreen).toBe(false);
  });

  it('a phone stacks the room whatever arrangement the user chose', () => {
    const split = new RoomSplit('ltr', NOTHING_STORED);
    split.viewportWidth = 390;
    expect(split.roomIsHorizontal, 'the PREFERENCE is still left/right').toBe(true);
    expect(split.isHorizontal, 'but the room is not drawn that way').toBe(false);
  });

  it('and the INNER split is vertical on a phone too, which is not the inverse of the outer', () => {
    /*
      The trap the class header names. Writing `innerIsVertical` as `!isHorizontal` reads fine and
      puts alerts and chat side by side in a 390px column. Const 228 is a static
      `['direction','vertical','minSize','0']` — both splits stack.
    */
    const split = new RoomSplit('ltr', NOTHING_STORED);
    split.viewportWidth = 390;
    expect(split.innerIsVertical).toBe(true);

    const desktop = new RoomSplit('ttb', NOTHING_STORED);
    desktop.viewportWidth = 1440;
    expect(desktop.innerIsVertical, 'a top/bottom desktop room puts them side by side').toBe(false);
  });

  it('order is dropped from the area styles on mobile and present on desktop', () => {
    const split = new RoomSplit('ltr', NOTHING_STORED);
    split.viewportWidth = 1440;
    expect(split.primaryAreaStyle).toContain('order: 0;');
    expect(split.presentationAreaStyle).toContain('order: 2;');

    split.viewportWidth = 390;
    expect(split.primaryAreaStyle).not.toContain('order');
    expect(split.presentationAreaStyle).not.toContain('order');
  });

  it('and a right-to-left room swaps which column is drawn first', () => {
    const ltr = new RoomSplit('ltr', NOTHING_STORED);
    ltr.viewportWidth = 1440;
    const rtl = new RoomSplit('rtl', NOTHING_STORED);
    rtl.viewportWidth = 1440;

    expect(ltr.primaryIsFirst).toBe(true);
    expect(rtl.primaryIsFirst).toBe(false);
    expect(rtl.primaryAreaStyle).toContain('order: 2;');
  });
});

describe('dragging a gutter', () => {
  const container = pane({ left: 0, top: 0, width: 1011, height: 800 });

  const dragMainTo = (split: RoomSplit, x: number) => {
    split.beginDrag(at(0, 0), 'main', pane({ left: 0, top: 0, width: GUTTER, height: 800 }));
    split.dragTo(at(x, 0), container, undefined);
  };

  it('moves the chat/alerts share on a left-to-right desktop room', () => {
    // 1011px wide minus the 11px gutter leaves 1000 for the panes, so x=250 is a quarter.
    const split = new RoomSplit('ltr', NOTHING_STORED);
    split.viewportWidth = 1440;
    dragMainTo(split, 250);
    expect(split.main).toBeCloseTo(0.25, 10);
  });

  it('and INVERTS it on a right-to-left room, where the first pane is the presentation', () => {
    const split = new RoomSplit('rtl', NOTHING_STORED);
    split.viewportWidth = 1440;
    dragMainTo(split, 250);
    expect(split.main).toBeCloseTo(0.75, 10);
  });

  it('a mobile drag moves the MOBILE number and leaves the desktop one untouched', () => {
    /*
      Two separate fields, exactly as upstream keeps `chatAlertsSizeMobile` beside `chatAlertsSize`.
      One field would mean rotating a tablet destroys the geometry chosen on the other side of the
      threshold.
    */
    const split = new RoomSplit('ltr', readerFor({ roomSizes: [30, 70] }));
    split.viewportWidth = 390;
    const desktopBefore = split.main;

    split.beginDrag(at(0, 0), 'main', pane({ left: 0, top: 0, width: 390, height: GUTTER }));
    split.dragTo(at(0, 250), pane({ left: 0, top: 0, width: 390, height: 1011 }), undefined);

    expect(split.mobile, 'the first pane is the presentation, so the share inverts').toBeCloseTo(
      0.75,
      10
    );
    expect(split.main, 'the desktop geometry must survive the phone').toBe(desktopBefore);
  });

  it('the pointer is clamped to the container, so a drag past the edge does not overshoot', () => {
    const split = new RoomSplit('ltr', NOTHING_STORED);
    split.viewportWidth = 1440;
    dragMainTo(split, 5000);
    expect(split.main).toBe(1);
    dragMainTo(split, -5000);
    expect(split.main).toBe(0);
  });

  it('the grab offset inside the gutter is subtracted, so the pane does not jump', () => {
    // Grabbing the gutter 8px in and moving to x=258 is still a quarter, not a quarter plus 8px.
    const split = new RoomSplit('ltr', NOTHING_STORED);
    split.viewportWidth = 1440;
    split.beginDrag(at(8, 0), 'main', pane({ left: 0, top: 0, width: GUTTER, height: 800 }));
    split.dragTo(at(258, 0), container, undefined);
    expect(split.main).toBeCloseTo(0.25, 10);
  });

  it('the inner gutter moves the alerts share and not the outer one', () => {
    const split = new RoomSplit('ltr', NOTHING_STORED);
    split.viewportWidth = 1440;
    split.beginDrag(at(0, 0), 'chat-alerts', pane({ left: 0, top: 0, width: 400, height: GUTTER }));
    split.dragTo(at(0, 300), undefined, pane({ left: 0, top: 0, width: 400, height: 1011 }));

    expect(split.chatAlerts).toBeCloseTo(0.3, 10);
    expect(split.main, 'the outer split is not this gutter').toBeNull();
  });
});

describe('releasing a gutter — what gets persisted, and what deliberately does not', () => {
  const desktopAfterMainDrag = (direction: 'ltr' | 'ttb') => {
    const split = new RoomSplit(direction, NOTHING_STORED);
    split.viewportWidth = 1440;
    split.beginDrag(at(0, 0), 'main', pane({ left: 0, top: 0, width: GUTTER, height: 800 }));
    split.dragTo(
      direction === 'ltr' ? at(250, 0) : at(0, 250),
      pane({ left: 0, top: 0, width: 1011, height: 1011 }),
      undefined
    );
    return split;
  };

  it('a release with no drag in progress writes nothing', () => {
    // This runs on EVERY pointerup in the room, because the listener is on the window.
    const split = new RoomSplit('ltr', NOTHING_STORED);
    expect(split.endDrag(1000)).toBeNull();
  });

  it('a desktop main drag writes the room key, chat-alerts first', () => {
    const split = desktopAfterMainDrag('ltr');
    const write = split.endDrag(1000);
    expect(write?.key).toBe('roomSizes');
    expect(write?.pair[0]).toBeCloseTo(25, 8);
    expect(write?.pair[1]).toBeCloseTo(75, 8);
    expect(split.target, 'the drag is over either way').toBeNull();
  });

  it('a vertical room writes the SAME pair inverted, and reads it back to the same number', () => {
    /*
      The round trip is the assertion. One place stores `[presentation, chatAlerts]` and the other
      reads index 1; if those two ever disagree a reload transposes the room, and nothing else in
      the suite would notice because each half is self-consistent.
    */
    const split = desktopAfterMainDrag('ttb');
    const write = split.endDrag(1000);
    expect(write?.key).toBe('roomSizes-bottom');

    const reloaded = new RoomSplit('ttb', readerFor({ 'roomSizes-bottom': write!.pair }));
    expect(reloaded.main).toBeCloseTo(split.main!, 8);
  });

  it('a DOUBLE click toggles the presentation and writes nothing', () => {
    /*
      `printSizes()` is a `console.log` and nothing else upstream (`app-room.full.js:2708-2712`),
      unlike `dragEnd` which does write. Persisting here would let a transient toggle overwrite the
      geometry the user actually chose by dragging.
    */
    const split = new RoomSplit('ltr', readerFor({ roomSizes: [30, 70] }));
    split.viewportWidth = 1440;
    const gutter = pane({ left: 0, top: 0, width: GUTTER, height: 800 });

    /*
      The FIRST click falls through and re-persists the size unchanged, and that is the original
      control flow rather than an oversight: `finishSplit` only returned early on a double click or
      a mobile main drag, so a single click on a desktop gutter reached `persistSplitSizes`. Asserted
      as what it is — an idempotent write of the value already stored — because a draft of this test
      claimed it returned null, and the code was right and the test was wrong.
    */
    split.beginDrag(at(0, 0), 'main', gutter);
    expect(split.endDrag(1000), 'a single click re-writes what was already there').toEqual({
      key: 'roomSizes',
      pair: [30, 70]
    });

    split.beginDrag(at(0, 0), 'main', gutter);
    const second = split.endDrag(1000 + GUTTER_DOUBLE_CLICK_MS);

    expect(second, 'the toggle IS the geometry change; there is nothing to persist').toBeNull();
    expect(split.main, 'collapsed to 100/0').toBe(1);
  });

  it('and a click OUTSIDE the window is two first clicks, not a pair', () => {
    const split = new RoomSplit('ltr', readerFor({ roomSizes: [30, 70] }));
    split.viewportWidth = 1440;
    const gutter = pane({ left: 0, top: 0, width: GUTTER, height: 800 });

    split.beginDrag(at(0, 0), 'main', gutter);
    split.endDrag(1000);
    split.beginDrag(at(0, 0), 'main', gutter);
    split.endDrag(1000 + GUTTER_DOUBLE_CLICK_MS + 1);

    expect(split.main, 'nothing toggled').toBeCloseTo(0.3, 10);
  });

  it('a DRAG is never a click, however fast the two releases are', () => {
    // `beginDrag` calls no `preventDefault` here, but the page does — native clicks are unreliable
    // on this element, so movement is the only signal that separates the two.
    const split = new RoomSplit('ltr', readerFor({ roomSizes: [30, 70] }));
    split.viewportWidth = 1440;
    const gutter = pane({ left: 0, top: 0, width: GUTTER, height: 800 });
    const container = pane({ left: 0, top: 0, width: 1011, height: 800 });

    split.beginDrag(at(0, 0), 'main', gutter);
    split.dragTo(at(250, 0), container, undefined);
    split.endDrag(1000);
    split.beginDrag(at(0, 0), 'main', gutter);
    split.dragTo(at(260, 0), container, undefined);
    split.endDrag(1000 + 10);

    expect(split.main, 'the second drag stands; nothing collapsed').toBeCloseTo(0.26, 10);
  });

  it('a MOBILE main drag is never recorded, because K4e binds no dragEnd', () => {
    /*
      SEEDED, and that is not decoration. The first draft used a split with nothing stored, and its
      negative control — deleting the mobile early return — stayed GREEN: a mobile drag writes the
      MOBILE field, so the desktop one was still null and `#writeFor` declined for that reason
      instead of this one. The test passed while proving nothing, which is the exact failure this
      repository keeps catching.

      With a stored size the desktop field is non-null, so removing the rule produces a real write
      and the assertion has something to refuse.
    */
    const split = new RoomSplit('ltr', readerFor({ roomSizes: [30, 70] }));
    split.viewportWidth = 390;
    split.beginDrag(at(0, 0), 'main', pane({ left: 0, top: 0, width: 390, height: GUTTER }));
    split.dragTo(at(0, 250), pane({ left: 0, top: 0, width: 390, height: 1011 }), undefined);

    expect(split.main, 'the desktop size is there to be written').not.toBeNull();
    expect(split.endDrag(1000)).toBeNull();
  });

  it('but the inner gutter DOES persist on mobile, which is a stated divergence', () => {
    /*
      `W4e` drops its `dragEnd` too. Our inner gutter writes the same `chatAlertSizes` key the
      desktop layout reads, and dropping the write would mean a phone silently reverting a size the
      user had set on a laptop.
    */
    const split = new RoomSplit('ltr', NOTHING_STORED);
    split.viewportWidth = 390;
    split.beginDrag(at(0, 0), 'chat-alerts', pane({ left: 0, top: 0, width: 390, height: GUTTER }));
    split.dragTo(at(0, 300), undefined, pane({ left: 0, top: 0, width: 390, height: 1011 }));

    const write = split.endDrag(1000);
    expect(write?.key).toBe('chatAlertSizes');
    expect(write?.pair[0]).toBeCloseTo(30, 8);
  });

  it('an unsized split writes nothing, rather than writing its default as if it were chosen', () => {
    // Nothing was dragged, so `main` is still null and the capture's string still applies.
    const split = new RoomSplit('ltr', NOTHING_STORED);
    split.viewportWidth = 1440;
    split.beginDrag(at(0, 0), 'main', pane({ left: 0, top: 0, width: GUTTER, height: 800 }));
    expect(split.endDrag(1000)).toBeNull();
  });
});

describe('the chat pane collapsing for a non-presenter in mode d', () => {
  it('takes the whole column and restores the previous size afterwards', () => {
    const split = new RoomSplit('ltr', readerFor({ chatAlertSizes: [40, 60] }));

    split.collapseChatForMode(true);
    expect(split.chatCollapsed).toBe(true);
    expect(split.chatAlerts, 'chatSize = 0; alertSize = 100').toBe(1);

    split.collapseChatForMode(false);
    expect(split.chatCollapsed).toBe(false);
    expect(split.chatAlerts, 'the size the user had, not a default').toBeCloseTo(0.4, 10);
  });

  it('is idempotent, so a re-run cannot record 1 as the size to restore', () => {
    /*
      The reason for the early return. Without it a second collapse would save the collapsed value
      as `#beforeCollapse`, and un-collapsing would restore a pane that is still collapsed — which
      is a chat window that never comes back until reload.
    */
    const split = new RoomSplit('ltr', readerFor({ chatAlertSizes: [40, 60] }));
    split.collapseChatForMode(true);
    split.collapseChatForMode(true);
    split.collapseChatForMode(false);
    expect(split.chatAlerts).toBeCloseTo(0.4, 10);
  });

  it('and restores NULL when there was no stored size, keeping the captured string', () => {
    const split = new RoomSplit('ltr', NOTHING_STORED);
    split.collapseChatForMode(true);
    split.collapseChatForMode(false);
    expect(split.chatAlerts).toBeNull();
  });
});

describe('the getters are REACTIVE, which no other gate can see', () => {
  /*
    Mutations and flushes inside `$effect.root`; assertions outside it. The negative control is
    deleting `$state` or `$derived` from the fields these read — every one of these goes red.
  */
  it('re-runs a reader as a drag moves the main split', () => {
    const split = new RoomSplit('ltr', NOTHING_STORED);
    const seen: (number | null)[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(split.main);
      });
      flushSync();
      split.viewportWidth = 1440;
      split.beginDrag(at(0, 0), 'main', pane({ left: 0, top: 0, width: GUTTER, height: 800 }));
      split.dragTo(at(250, 0), pane({ left: 0, top: 0, width: 1011, height: 800 }), undefined);
      flushSync();
    });
    stop();

    expect(seen.at(0), 'nothing stored').toBeNull();
    expect(seen.at(-1), 'the drag did not reach the effect').toBeCloseTo(0.25, 10);
  });

  it('and the DERIVED area style follows the viewport crossing the threshold', () => {
    /*
      A separate case from the one above because the styles are `$derived` fields rather than the
      `$state` ones, and a wiring that made the state reactive and left the deriveds stale would
      pass the first test while the room kept a desktop layout on a phone.
    */
    const split = new RoomSplit('ltr', NOTHING_STORED);
    const seen: string[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(split.primaryAreaStyle);
      });
      flushSync();
      split.viewportWidth = 1440;
      flushSync();
      split.viewportWidth = 390;
      flushSync();
    });
    stop();

    expect(seen.at(-2), 'desktop keeps its CSS order').toContain('order: 0;');
    expect(seen.at(-1), 'the phone drops it').not.toContain('order');
  });

  it('and a resize that does NOT cross the threshold recomputes nothing downstream', () => {
    /*
      The reason these are `$derived` fields and not plain computing getters. `bind:innerWidth`
      writes on every frame of a resize; `$derived` is push-pull, so an unchanged boolean stops the
      chain and the five flex strings are not rebuilt. Plain getters would rebuild them all, every
      frame — a silent performance regression carried in on a refactor.

      ONE run for six writes of the width, and that is the number rather than two: an unmeasured
      viewport is already not mobile, so the very first style is the desktop one and none of the
      five desktop widths changes it. Written as 2 first, on the assumption the initial run differed
      — the assumption was wrong and the memoisation is a step better than predicted.

      This is what separates `$derived` from a plain getter and it is not a stylistic difference.
      Through a getter the effect's dependency would be `#viewportWidth` itself, so all six writes
      would re-run it and rebuild the string; through a derived the chain stops at an unchanged
      boolean. Swap one for the other and this is the assertion that goes red.
    */
    const split = new RoomSplit('ltr', NOTHING_STORED);
    let runs = 0;

    const stop = $effect.root(() => {
      $effect(() => {
        void split.primaryAreaStyle;
        runs += 1;
      });
      flushSync();
      for (const width of [1440, 1200, 1000, 800, 700]) {
        split.viewportWidth = width;
        flushSync();
      }
    });
    stop();

    expect(runs, 'five desktop widths must not rebuild the flex string five times').toBe(1);
  });
});
