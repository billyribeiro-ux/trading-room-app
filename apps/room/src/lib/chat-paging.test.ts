import { describe, expect, it } from 'vitest';

import {
  CHAT_PAGE_ARRIVAL_NUDGE,
  CHAT_PAGE_REQUEST_NUDGE,
  CHAT_PAGE_TRIGGER_MIN_MESSAGES,
  CHAT_PAGE_TRIGGER_SCROLL_TOP,
  mergeOlderChatMessages,
  shouldLoadOlderMessages
} from './chat-paging';

/*
  The reference's condition, term by term:

    if (i.scrollTop < 100 && this.msgs && this.msgs.length > 15 && !this.searchTerm) {
      if (!this.hasMoreData) return void P("loading more: no more data...");
      if (this.loadingMore) return void P("loading more already...");
      ...
    }

  Every term gets its own case, because each one is the whole rule for somebody: the threshold for
  a reader mid-scroll, the message floor for a nearly-empty room, `hasMoreData` for a reader at the
  start of history, and `loadingMore` for a trackpad emitting forty scroll events a second.
*/

const armed = {
  scrollTop: 0,
  messageCount: 100,
  searchTerm: '',
  hasMoreData: true,
  loadingMore: false
};

describe('shouldLoadOlderMessages', () => {
  it('fires when the reader is near the top of a log with history behind it', () => {
    expect(shouldLoadOlderMessages(armed)).toBe(true);
  });

  it('is a threshold, not the top edge', () => {
    /*
      100 rather than 0, so the fetch starts while there is still runway. Asserted on both sides of
      the boundary because an off-by-one here is invisible: it just means the reader occasionally
      watches the spinner.
    */
    expect(CHAT_PAGE_TRIGGER_SCROLL_TOP).toBe(100);
    expect(shouldLoadOlderMessages({ ...armed, scrollTop: 99 })).toBe(true);
    expect(shouldLoadOlderMessages({ ...armed, scrollTop: 100 })).toBe(false);
    expect(shouldLoadOlderMessages({ ...armed, scrollTop: 500 })).toBe(false);
  });

  it('does not page a log shorter than the viewport', () => {
    /*
      Fifteen messages do not fill the pane, so `scrollTop` is 0 and stays 0. Without this floor the
      first render of a nearly-empty room fires a request whose only possible answer is nothing.
    */
    expect(CHAT_PAGE_TRIGGER_MIN_MESSAGES).toBe(15);
    expect(shouldLoadOlderMessages({ ...armed, messageCount: 15 })).toBe(false);
    expect(shouldLoadOlderMessages({ ...armed, messageCount: 16 })).toBe(true);
    expect(shouldLoadOlderMessages({ ...armed, messageCount: 0 })).toBe(false);
  });

  it('refuses while a search is active, because a filtered log is not a paged one', () => {
    expect(shouldLoadOlderMessages({ ...armed, searchTerm: 'AAPL' })).toBe(false);
  });

  it('stops for good once a page came back empty', () => {
    expect(shouldLoadOlderMessages({ ...armed, hasMoreData: false })).toBe(false);
  });

  it('allows one request at a time', () => {
    /*
      The guard that matters most in practice. A scroll gesture emits events continuously, so
      without it one flick at the top of the log fires a request per frame.
    */
    expect(shouldLoadOlderMessages({ ...armed, loadingMore: true })).toBe(false);
  });

  it('there are TWO nudges, and they are not duplicates', () => {
    /*
      `+30` synchronously after the emit, in the scroll handler, so a continuing gesture is not
      fighting the threshold while the fetch is in flight. Then `+1` when a page greater than zero
      arrives, because prepending fifty rows leaves the browser free to keep `scrollTop` pointing at
      what is now different content.

      The first draft of this feature applied 30 on arrival and nothing at request time — a single
      nudge doing neither job properly. Both numbers are upstream's.
    */
    expect(CHAT_PAGE_REQUEST_NUDGE).toBe(30);
    expect(CHAT_PAGE_ARRIVAL_NUDGE).toBe(1);
  });
});

describe('mergeOlderChatMessages', () => {
  it('puts older messages in front, because both halves are oldest-first', () => {
    const older = [{ id: 1 }, { id: 2 }];
    const existing = [{ id: 3 }, { id: 4 }];
    expect(mergeOlderChatMessages(older, existing)).toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 }
    ]);
  });

  it('drops a row the boundary handed back twice', () => {
    /*
      The real case, not a hypothetical: offset paging over a live tail. A message posted between
      the page-0 read and the page-1 request shifts every row one place further back, so the row at
      the boundary lands in both pages. Upstream shows it twice.
    */
    const older = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const existing = [{ id: 3 }, { id: 4 }];
    expect(mergeOlderChatMessages(older, existing)).toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 }
    ]);
  });

  it('keeps the copy already on screen, not the one just fetched', () => {
    /*
      The held row may carry state the fetched one does not — an optimistic reaction, an edit that
      has not round-tripped. Preferring the incoming copy would flicker it away.
    */
    const merged = mergeOlderChatMessages(
      [{ id: 1, body: 'from the server' }],
      [{ id: 1, body: 'edited here a moment ago' }]
    );
    expect(merged).toEqual([{ id: 1, body: 'edited here a moment ago' }]);
  });

  it('matches ids by SAMENESS and never by order', () => {
    /*
      `id-opacity-contract` exists because a previous version computed `Math.max(highest, item.id)`,
      which produces `NaN` the day ids become uuids. String ids must merge exactly as integers do.
    */
    const older = [{ id: 'c1a3-…' }, { id: 'b2f4-…' }];
    const existing = [{ id: 'b2f4-…' }, { id: 'a0e9-…' }];
    expect(mergeOlderChatMessages(older, existing)).toEqual([
      { id: 'c1a3-…' },
      { id: 'b2f4-…' },
      { id: 'a0e9-…' }
    ]);
  });

  it('handles the empty cases without inventing rows', () => {
    expect(mergeOlderChatMessages([], [{ id: 1 }])).toEqual([{ id: 1 }]);
    expect(mergeOlderChatMessages([{ id: 1 }], [])).toEqual([{ id: 1 }]);
    expect(mergeOlderChatMessages([], [])).toEqual([]);
  });
});
