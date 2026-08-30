// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  newLoadMorePaging,
  settleLoadMore,
  startLoadMore,
  mergeOlderMessagesBy
} from './chat-paging';

/*
  THE PRIVATE-CHAT LOAD MORE, which was three derived guesses and is now the reference's own state.

  `chat-paging.ts` carries the transcription (bundle byte 2,191,427) and the account of what the
  guesses cost. These are the behaviours, driven directly, because a state machine that can only be
  observed through a panel is a state machine nobody can characterise.
*/

describe('a fresh conversation', () => {
  it('starts optimistic, unpaged and idle', () => {
    // `PCswitchChatToUser`: currPage = 0, hasMoreData = !0, isLoadingMore = !1, loadMoreLastID = "".
    expect(newLoadMorePaging()).toEqual({ page: 0, hasMoreData: true, loadingMore: false });
  });
});

describe('asking for more', () => {
  it('counts REQUESTS, so a short page cannot make it name one already fetched', () => {
    /*
      THE DEFECT, stated as an assertion. The panel used to compute `Math.floor(log.length / 50)`.
      Hold 50, ask, get 30 back: `floor(80 / 50)` is 1 — the page just fetched — so the next click
      re-requested it. Here the counter does not know how many rows arrived and cannot be confused
      by a short one.
    */
    let state = newLoadMorePaging();
    state = startLoadMore(state);
    expect(state.page).toBe(1);
    state = settleLoadMore(state, 30);
    state = startLoadMore(state);
    expect(state.page, 'the page after the one just fetched, whatever came back').toBe(2);
  });

  it('marks the request in flight, which is what turns the badge into a spinner', () => {
    expect(startLoadMore(newLoadMorePaging()).loadingMore).toBe(true);
  });

  it('carries NO scroll anchor, which is a gap and not an omission', () => {
    /*
      The reference's fourth field, `loadMoreLastID`, restores the reader's position after older rows
      are prepended. It is not modelled here because nothing could read it: our rows render through
      `CompactMessageRow` with no `id` attribute, so the `getElementById("pcm-" + _id)` it turns on
      would find nothing. Asserted rather than left implied, so that adding the field without its
      reader fails here — which is how it nearly shipped.
    */
    expect(Object.keys(newLoadMorePaging()).sort()).toEqual(['hasMoreData', 'loadingMore', 'page']);
  });
});

describe('a page arriving', () => {
  it('stops the spinner', () => {
    const settled = settleLoadMore(startLoadMore(newLoadMorePaging()), 12);
    expect(settled.loadingMore).toBe(false);
  });

  it('keeps asking while rows keep arriving, however few', () => {
    /*
      `0 == e.length` and nothing else. A page SHORTER than the last is not the end of the history —
      only a page with nothing in it is. Guessing from the size is exactly what `PAGE_SIZE` encoded,
      and it is why a conversation with 49 messages showed no Load More at all.
    */
    expect(settleLoadMore(newLoadMorePaging(), 1).hasMoreData).toBe(true);
    expect(settleLoadMore(newLoadMorePaging(), 49).hasMoreData).toBe(true);
  });

  it('stops for good once one comes back empty', () => {
    const done = settleLoadMore(newLoadMorePaging(), 0);
    expect(done.hasMoreData).toBe(false);
    /*
      And STAYS false. `hasMoreData: incomingCount > 0 && state.hasMoreData` — without the second
      term a later empty-then-nonempty sequence would reopen a history that has ended. The badge
      used to reappear on every click forever, which is the same defect from the other side.
    */
    expect(settleLoadMore(done, 25).hasMoreData).toBe(false);
  });
});

describe('folding an older page in', () => {
  it('drops a row already held, keyed on the private message’s own id', () => {
    /*
      Offset paging over a live tail hands the boundary row back twice when a message arrives
      between two requests. The main feeds have used this fold since they were written; the private
      thread prepended blind, and its rows are keyed `_id` rather than `id`.
    */
    const older = [{ _id: 'a' }, { _id: 'b' }];
    const held = [{ _id: 'b' }, { _id: 'c' }];
    expect(mergeOlderMessagesBy(older, held, (row) => row._id)).toEqual([
      { _id: 'a' },
      { _id: 'b' },
      { _id: 'c' }
    ]);
  });

  it('puts the older page in front, because it is older', () => {
    expect(
      mergeOlderMessagesBy([{ _id: 'a' }], [{ _id: 'z' }], (row) => row._id).map((row) => row._id)
    ).toEqual(['a', 'z']);
  });
});
