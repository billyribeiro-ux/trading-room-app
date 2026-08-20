// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import AttachDepsProbe from './AttachDepsProbe.svelte';
import SpeechRecoOverlay from './SpeechRecoOverlay.svelte';

/*
  AN ATTACHMENT'S DEPENDENCIES COME FROM ITS OWN BODY, NEVER FROM THE FUNCTION IT RETURNS.

  The docs say attachments "run in an effect when an element is mounted to the DOM or when state read
  inside the function updates", and separately that a returned function "is called before the
  attachment re-runs, or after the element is later removed from the DOM". Read together those two
  sentences mean a reactive read in the returned teardown creates no dependency — so an attachment
  whose only reads are in its teardown runs exactly once and never again.

  That is the whole rule, and it is asserted here against the REAL compiler rather than quoted,
  because the failure it produces is silent: no error, no warning, `svelte-check` green, and a
  feature that simply never happens. `SpeechRecoOverlay`'s caption auto-scroll was written that way
  and had never once scrolled.
*/

const mounted: ReturnType<typeof mount>[] = [];

afterEach(() => {
  for (const component of mounted.splice(0)) unmount(component);
});

function render<T extends Record<string, unknown>>(component: never, props: T) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const instance = mount(component, { target, props });
  mounted.push(instance);
  return target;
}

describe('where an attachment collects its dependencies — the platform, not the docs', () => {
  it('re-runs on state read in the BODY, and not on state read only in the teardown', () => {
    // Plain, deliberately — see the probe's own note on `effect_update_depth_exceeded`.
    const tally = { body: 0, teardown: 0, teardownReads: 0 };
    const state = $state({ count: 0 });

    render(AttachDepsProbe as never, {
      get count() {
        return state.count;
      },
      tally
    });
    flushSync();

    // The positive control: both ran once on mount, so neither tally is stuck at zero by accident.
    expect(tally.body, 'the body-reading attachment must run on mount').toBe(1);
    expect(tally.teardown, 'the teardown-returning attachment must run on mount').toBe(1);

    state.count = 1;
    flushSync();
    state.count = 2;
    flushSync();

    expect(tally.body, 'reading state in the body makes it a dependency').toBe(3);
    expect(
      tally.teardown,
      'reading state ONLY in the returned teardown creates no dependency, so the attachment never re-runs'
    ).toBe(1);
    expect(
      tally.teardownReads,
      'and the teardown itself never ran, because nothing re-ran it'
    ).toBe(0);
  });
});

/*
  The rule, applied to the component the bug was found in.

  jsdom performs no layout. `scrollHeight` is 0 on every element, and — the part that cost a draft —
  ASSIGNING `scrollTop` on an element with no layout box is silently ignored, so reading it back
  always gives 0 whether the code ran or not. Stubbing `scrollHeight` alone was not enough: the
  positive control failed against code that had genuinely executed, which would have been a
  manufactured defect had it been reported.

  Both sides are therefore instrumented. `scrollHeight` reads a fixed non-zero value, and `scrollTop`
  is replaced by a recording accessor, so the assertion is about whether the assignment HAPPENED
  rather than about a number jsdom refuses to store. Same lesson as `clientHeight` vs `offsetHeight`
  in `feed-scroll-wiring-contract`: a stub that does not match what the code actually touches makes
  the instrument the thing that failed.
*/
describe('the caption transcript follows its tail', () => {
  /** Records every `scrollTop` write per element and serves a fixed `scrollHeight`. */
  function withScrollInstrumented<T>(
    scrollHeight: number,
    run: (writes: WeakMap<HTMLElement, number>) => T
  ): T {
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    const originalHeight = Object.getOwnPropertyDescriptor(proto, 'scrollHeight');
    const originalTop = Object.getOwnPropertyDescriptor(proto, 'scrollTop');
    const writes = new WeakMap<HTMLElement, number>();

    Object.defineProperty(proto, 'scrollHeight', { configurable: true, get: () => scrollHeight });
    Object.defineProperty(proto, 'scrollTop', {
      configurable: true,
      get(this: HTMLElement) {
        return writes.get(this) ?? 0;
      },
      set(this: HTMLElement, value: number) {
        writes.set(this, value);
      }
    });

    try {
      return run(writes);
    } finally {
      if (originalHeight) Object.defineProperty(proto, 'scrollHeight', originalHeight);
      else delete proto.scrollHeight;
      if (originalTop) Object.defineProperty(proto, 'scrollTop', originalTop);
      else delete proto.scrollTop;
    }
  }

  it('scrolls to the bottom when a caption arrives, not only when the overlay first mounts', () => {
    withScrollInstrumented(500, () => {
      const state = $state({
        history: [{ timestamp: 1, sender: 'Ada', text: 'first' }]
      });

      const target = render(SpeechRecoOverlay as never, {
        current: null,
        get history() {
          return state.history;
        },
        historyMode: true
      });
      flushSync();

      const scroller = target.querySelector('.speech-reco-history') as HTMLElement;
      expect(scroller, 'history mode must render the scroller').toBeTruthy();

      // Positive control: the mount pass scrolls, so a later zero cannot be blamed on the stub.
      expect(scroller.scrollTop, 'the first pass pins to the bottom').toBe(500);

      scroller.scrollTop = 0;
      state.history = [...state.history, { timestamp: 2, sender: 'Ada', text: 'second' }];
      flushSync();

      expect(
        scroller.scrollTop,
        'a NEW caption must re-pin the transcript. If this is 0 the attachment never re-ran, which ' +
          'is what happens when its reactive reads sit in the returned teardown instead of its body.'
      ).toBe(500);
    });
  });
});
