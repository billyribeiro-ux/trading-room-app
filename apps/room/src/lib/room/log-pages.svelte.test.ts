// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';

import { ALERTS_LOG, RoomLogPages } from './log-pages.svelte';

/*
  The sixth room state class, and the first that removed a duplicate rather than moving a slice: the
  alerts log and the chat log held this machinery twice, in two shapes, and the shape was the only
  difference between them.

  Everything below is asserted through ONE instance holding TWO keys, because that is the property
  the unification has to keep — the chat pane renders two channels through one instance, and the old
  bug it fixed was a single shared flag that stopped `off-topic` paging the moment `main` ran out.
*/

interface Row {
  id: number;
}

const row = (id: number): Row => ({ id });

describe('an unpaged log is optimistic, and that is deliberate', () => {
  it('reports more data before anybody has asked', () => {
    /*
      Absent means TRUE. Storing the negative would mean seeding every key before the first scroll,
      and a key that was missed would silently refuse to page rather than trying once and finding
      out — a log that quietly has no history, which nobody would report as a bug.
    */
    const pages = new RoomLogPages<Row>();
    expect(pages.hasMore('main')).toBe(true);
    expect(pages.hasMore('never-heard-of-it')).toBe(true);
  });

  it('starts at page 0, which is what the page load already sent', () => {
    expect(new RoomLogPages<Row>().page('main')).toBe(0);
  });

  it('and hands back the SAME empty array every time', () => {
    /*
      Referential identity, not just emptiness. A fresh `[]` per call is a new identity on every
      read, so a `$derived` merging it would recompute on every render of a log nobody has paged —
      which is all of them, most of the time.
    */
    const pages = new RoomLogPages<Row>();
    expect(pages.older('main')).toBe(pages.older('off-topic'));
  });
});

describe('one instance, many keys — which is the bug this shape fixes', () => {
  it('running out on one channel does not stop another', () => {
    /*
      The real defect from the first draft of chat paging: one shared `hasMoreData` meant reaching
      the start of `main` also stopped `off-topic` from ever paging, however much history it had.
      The reference keeps this state on the roomlog COMPONENT and renders one per channel.
    */
    const pages = new RoomLogPages<Row>();
    pages.exhausted('main');

    expect(pages.hasMore('main')).toBe(false);
    expect(pages.hasMore('off-topic'), 'a sibling channel is untouched').toBe(true);
  });

  it('and the two logs keep separate page counters and separate history', () => {
    const pages = new RoomLogPages<Row>();
    pages.arrived('main', [row(1)], pages.requesting('main'));
    pages.settled();

    expect(pages.page('main')).toBe(1);
    expect(pages.page('off-topic')).toBe(0);
    expect(pages.older('off-topic')).toEqual([]);
  });

  it('the ALERTS log is the same machinery with one key', () => {
    // The whole reason a keyed class could replace the scalars: one key behaves as a scalar did.
    const pages = new RoomLogPages<Row>();
    expect(pages.hasMore(ALERTS_LOG)).toBe(true);
    pages.exhausted(ALERTS_LOG);
    expect(pages.hasMore(ALERTS_LOG)).toBe(false);
    pages.arm(ALERTS_LOG);
    expect(pages.hasMore(ALERTS_LOG)).toBe(true);
  });
});

describe('the request cycle', () => {
  it('asks for the page after the last one that ARRIVED', () => {
    const pages = new RoomLogPages<Row>();
    expect(pages.requesting('main')).toBe(1);
    expect(pages.loading, 'one request at a time').toBe(true);
  });

  it('a failed request does not advance the page, so the next scroll retries it', () => {
    /*
      The page number moves only in `arrived`. If `requesting` advanced it, a failed page 1 would be
      followed by a request for page 2 and the reader would lose a page of history with no error.
    */
    const pages = new RoomLogPages<Row>();
    expect(pages.requesting('main')).toBe(1);
    pages.settled(); // the `finally` after a `catch`
    expect(pages.requesting('main'), 'the same page again').toBe(1);
  });

  it('an EMPTY answer is the terminator and also does not advance the page', () => {
    // `0 == o.length && (this.hasMoreData = !1)` — running out is discovered by asking once too
    // often, so the page that returned nothing must not be counted as read.
    const pages = new RoomLogPages<Row>();
    pages.requesting('main');
    pages.settled();
    pages.exhausted('main');

    expect(pages.hasMore('main')).toBe(false);
    expect(pages.page('main')).toBe(0);
  });

  it('settled() clears the flag however the request ended', () => {
    const pages = new RoomLogPages<Row>();
    pages.requesting('main');
    pages.settled();
    expect(pages.loading, 'a stuck flag wedges the pane for the session').toBe(false);
  });

  it('and pages accumulate oldest-first in front of what is held', () => {
    const pages = new RoomLogPages<Row>();
    pages.arrived('main', [row(3), row(4)], pages.requesting('main'));
    pages.settled();
    pages.arrived('main', [row(1), row(2)], pages.requesting('main'));
    pages.settled();

    expect(pages.older('main').map((item) => item.id)).toEqual([1, 2, 3, 4]);
    expect(pages.page('main')).toBe(2);
  });

  it('a row handed back twice is merged on IDENTITY, not appended', () => {
    /*
      Offset paging over a LIVE tail can return the boundary row again — a message arriving between
      two requests shifts the window by one. `mergeOlderChatMessages` matches on id and never on
      order, so the duplicate is dropped rather than rendered twice.
    */
    const pages = new RoomLogPages<Row>();
    pages.arrived('main', [row(2), row(3)], 1);
    pages.arrived('main', [row(1), row(2)], 2);

    expect(pages.older('main').map((item) => item.id)).toEqual([1, 2, 3]);
  });
});

describe('re-arming at the bottom', () => {
  it('a reader who returns to the bottom can page again', () => {
    // `hasMoreData = !0` on the way down. Without it a reader who once hit the start of history
    // could not page again for the rest of the session, however much the log grew.
    const pages = new RoomLogPages<Row>();
    pages.exhausted('main');
    pages.arm('main');
    expect(pages.hasMore('main')).toBe(true);
  });

  it('and arming an already-armed log does not churn the map', () => {
    /*
      `arm` runs on EVERY scroll event that ends at the bottom, which is a great many of them.
      Without the early return it hands `$state.raw` a NEW object each time, and since `$state.raw`
      compares by reference that invalidates every reader of every key for no change at all.

      ASSERTED BY COUNTING EFFECT RUNS, and the first draft got this wrong: it checked the identity
      of `older(key)`, which `arm` does not touch, so its negative control stayed green while
      proving nothing. The churn is only observable through the reader that the reassignment wakes.
    */
    const pages = new RoomLogPages<Row>();
    let runs = 0;

    const stop = $effect.root(() => {
      $effect(() => {
        void pages.hasMore('main');
        runs += 1;
      });
      flushSync();
      pages.arm('main');
      flushSync();
      pages.arm('main');
      flushSync();
    });
    stop();

    expect(pages.hasMore('main')).toBe(true);
    expect(runs, 'arming an armed log must not wake its readers').toBe(1);
  });
});

describe('the getters are REACTIVE, which no other gate can see', () => {
  it('re-runs a reader when a page arrives', () => {
    const pages = new RoomLogPages<Row>();
    const seen: number[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(pages.older('main').length);
      });
      flushSync();
      pages.arrived('main', [row(1), row(2)], 1);
      flushSync();
    });
    stop();

    expect(seen, 'a paged-in page would not render').toEqual([0, 2]);
  });

  it('and when a log runs out, which is what stops the scroll handler asking', () => {
    const pages = new RoomLogPages<Row>();
    const seen: boolean[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(pages.hasMore(ALERTS_LOG));
      });
      flushSync();
      pages.exhausted(ALERTS_LOG);
      flushSync();
      pages.arm(ALERTS_LOG);
      flushSync();
    });
    stop();

    expect(seen, 'the terminator is not reactive').toEqual([true, false, true]);
  });

  it('and the loading flag, which is the one-request-at-a-time guard', () => {
    const pages = new RoomLogPages<Row>();
    const seen: boolean[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(pages.loading);
      });
      flushSync();
      pages.requesting('main');
      flushSync();
      pages.settled();
      flushSync();
    });
    stop();

    expect(seen, 'the in-flight guard is not reactive').toEqual([false, true, false]);
  });
});
