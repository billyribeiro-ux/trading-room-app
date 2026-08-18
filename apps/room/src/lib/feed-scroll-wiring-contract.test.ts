// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { parse } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

import { RoomFeedScroll } from './room/feed-scroll';

/*
  THE THREE SCROLLERS ARE WIRED TO THEIR TRACKERS — which nothing asserted until 2026-08-18.

  ## How the gap was found, and it was measured rather than guessed

  While collapsing `feedScroll`'s two drilled callbacks into the facade `AlertChatArea` already
  received, the wiring line was rewritten. Before claiming that was safe, the line was DELETED
  outright and the whole suite run: **2,479 tests, 172 files, all green**, with the alerts log no
  longer tracking scroll at all. So the room could ship with read-history detection and infinite
  scroll disconnected and nothing anywhere would say so.

  That is not a defect the collapse introduced — the drilled prop was equally unguarded, and had
  been since the handlers moved out of the page. It is a defect the collapse EXPOSED, and the rule
  in `CLAUDE.md` is that the unit of work is the reason plus the test that enforces it.

  ## What each half is for

  The FIRST describe reads the markup through `svelte.parse`, not a regex: what matters is that a
  named attribute of a specific element carries a specific call, and a substring search over a
  1,000-line component cannot tell that from the same characters in a comment or on a sibling.

  The SECOND executes `RoomFeedScroll` against real elements, because source text cannot show that
  the trackers DO anything. Wiring `onscroll` to a method that no longer sets the flag would pass
  every assertion in the first half.

  ## Why the two columns must not share a tracker

  `trackAlertsScroll` and `trackChatScroll` read different pages and different search state — the
  alerts pane has a live search field and refuses to page while a term is set, the chat log does
  not. Crossing them is silent: both take an `Event`, both set a flag, and the types are identical.
*/

/*
  A CWD-relative path, not `new URL(..., import.meta.url)`, and the reason is this file's own
  environment: under `@vitest-environment jsdom` the module base resolves to an `http://localhost`
  URL, so `readFileSync` refuses it with *"The URL must be of scheme file"*. `roster-gates.test.ts`
  already reads sources this way. jsdom is required here because the second half needs real elements.
*/
const ALERT_CHAT_AREA = readFileSync('src/lib/components/AlertChatArea.svelte', 'utf8');

/**
 * Every `onscroll` expression in a component, as source text, keyed by nothing but order.
 *
 * Elements rather than components: `app-roomscroller` is a custom element, so these are
 * `RegularElement` nodes and the `Component` walk used elsewhere would not see them.
 */
const onScrollHandlers = (source: string): string[] => {
  const found: string[] = [];

  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const candidate = node as { type?: string; attributes?: unknown[] };

    if (candidate.type === 'RegularElement') {
      for (const raw of candidate.attributes ?? []) {
        const attr = raw as { type?: string; name?: string; value?: unknown };
        if (attr.type !== 'Attribute' || attr.name !== 'onscroll') continue;
        const tag = (Array.isArray(attr.value) ? attr.value[0] : attr.value) as
          { expression?: { start?: number; end?: number } } | undefined;
        const expression = tag?.expression;
        if (expression?.start === undefined || expression.end === undefined) continue;
        found.push(source.slice(expression.start, expression.end));
      }
    }

    for (const value of Object.values(node as Record<string, unknown>)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };

  visit(parse(source, { modern: true }).fragment);
  return found;
};

describe('the alerts and chat scrollers are actually wired', () => {
  const handlers = onScrollHandlers(ALERT_CHAT_AREA);

  it('has exactly two scroll handlers, one per column', () => {
    /*
      Asserted FIRST and by count, because every assertion below is about WHICH tracker each one
      names — and a check of that shape passes trivially against an empty list. This is the failure
      `focus-on-screen-contract.test.ts` records shipping once, in the form that catches it.
    */
    expect(handlers, `found: ${JSON.stringify(handlers)}`).toHaveLength(2);
  });

  it('gives the alerts log its OWN tracker, not the chat one', () => {
    expect(handlers[0]).toContain('feedScroll.trackAlertsScroll(');
    // Crossing them is silent: identical signatures, different paging and search rules.
    expect(handlers[0], 'the alerts column must not run the chat tracker').not.toContain(
      'trackChatScroll'
    );
  });

  it('gives the chat log its OWN tracker, not the alerts one', () => {
    expect(handlers[1]).toContain('feedScroll.trackChatScroll(');
    expect(handlers[1], 'the chat column must not run the alerts tracker').not.toContain(
      'trackAlertsScroll'
    );
  });

  it('CALLS the tracker rather than passing it by reference', () => {
    /*
      `onscroll={feedScroll.trackAlertsScroll}` type-checks, lints, and throws on the first scroll
      because the method reaches a private field through `this`.
      `unbound-method-contract.test.ts` catches this shape too; asserted here as well because this
      file is where someone editing the wiring will be looking.
    */
    for (const handler of handlers) expect(handler).toMatch(/=>\s*feedScroll\.track\w+\(/);
  });
});

/**
 * A scroller whose geometry says the reader is at the bottom, or some distance above it.
 *
 * `offsetHeight`, NOT `clientHeight`, and a first draft of this helper got it wrong: it defined
 * `clientHeight`, `isRoomScrollerReadingHistory` read `offsetHeight`, jsdom answered 0 for it, and
 * "back at the bottom" came out as history. The failing assertion was the instrument, not the code
 * — which is the rule this repository states about ruling out your own tooling before reporting a
 * fault. `room-scroller.ts` types the viewport as exactly `offsetHeight | scrollHeight | scrollTop`.
 *
 * 1000 tall in a 400 viewport, against `ROOM_SCROLLER_BOTTOM_TOLERANCE_PX` of 20: a `scrollTop` of
 * 600 is exactly at the bottom, 100 is well up the log.
 */
const scrollerAt = (scrollTop: number) => {
  const element = document.createElement('div');
  Object.defineProperties(element, {
    scrollTop: { value: scrollTop, writable: true },
    scrollHeight: { value: 1000, configurable: true },
    offsetHeight: { value: 400, configurable: true }
  });
  return element;
};

/** `currentTarget` is what the trackers read, and jsdom will not set it without a real dispatch. */
const scrollEventFrom = (element: HTMLElement) => {
  const event = new Event('scroll');
  Object.defineProperty(event, 'currentTarget', { value: element });
  return event;
};

const feedScroll = () =>
  new RoomFeedScroll({
    alerts: { search: '' } as never,
    chat: { tab: 'main', extraTab: 'main' } as never,
    alertPages: {
      hasMore: () => false,
      arm: () => {},
      releaseHistory: () => false,
      requesting: () => 0,
      settled: () => {},
      exhausted: () => {},
      arrived: () => {}
    } as never,
    chatPages: {
      hasMore: () => false,
      arm: () => {},
      releaseHistory: () => false,
      requesting: () => 0,
      settled: () => {},
      exhausted: () => {},
      arrived: () => {}
    } as never,
    feeds: { visibleAlerts: [], visibleChat: [], visibleExtraChat: [] } as never
  } as never);

describe('the trackers actually move the flag the follow effects read', () => {
  /*
    The runtime half. Everything above reads source, and source can name the right method while that
    method has stopped deciding anything — which is the exact shape `for-all-broadcast-contract`
    records: a full audit passed while `deleteSwingAlert` could not delete a row, because nothing in
    it executed anything.
  */
  it('reports reading-history when the reader scrolls UP, and not at the bottom', () => {
    const scroll = feedScroll();
    expect(scroll.alertsReadingHistory, 'a fresh feed is not in history').toBe(false);

    scroll.trackAlertsScroll(scrollEventFrom(scrollerAt(100)));
    expect(scroll.alertsReadingHistory, 'scrolled well above the bottom IS history').toBe(true);

    scroll.trackAlertsScroll(scrollEventFrom(scrollerAt(600)));
    expect(scroll.alertsReadingHistory, 'back at the bottom is not').toBe(false);
  });

  it('keeps the three feeds independent, which is why they are three getters', () => {
    // One reader can be halfway up the alerts log while the chat column follows.
    const scroll = feedScroll();
    scroll.trackAlertsScroll(scrollEventFrom(scrollerAt(100)));

    expect(scroll.alertsReadingHistory).toBe(true);
    expect(scroll.chatReadingHistory, 'the chat column must not follow the alerts one').toBe(false);
    expect(scroll.extraChatReadingHistory, 'nor the extra column').toBe(false);
  });

  it('the chat tracker moves the CHAT flag and nothing else', () => {
    const scroll = feedScroll();
    scroll.trackChatScroll(scrollEventFrom(scrollerAt(100)));

    expect(scroll.chatReadingHistory).toBe(true);
    expect(scroll.alertsReadingHistory, 'crossed trackers is the silent failure').toBe(false);
  });
});
