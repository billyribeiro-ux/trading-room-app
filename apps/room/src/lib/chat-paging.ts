/**
 * When to ask for older chat history, and how to fold it into what is already on screen.
 *
 * Pure functions, no DOM: the scroll handler passes numbers in and gets an answer back, which is
 * what makes the rule testable at all. The reference's own version is four conditions and two
 * guards buried in a scroll listener, and every one of them is load-bearing.
 */

/**
 * `i.scrollTop < 100` — how near the top counts as "asking for more".
 *
 * Not zero. Waiting for the scroller to reach the very top means the request starts only once the
 * reader has already run out of content, so they watch it arrive. A hundred pixels of remaining
 * runway is what makes the fetch invisible.
 */
export const CHAT_PAGE_TRIGGER_SCROLL_TOP = 100;

/**
 * `this.msgs.length > 15` — below this, don't page at all.
 *
 * A log with fifteen messages in it is shorter than the viewport, so `scrollTop` is 0 and stays 0.
 * Without this test the first render of a nearly-empty room fires a request for page 1, gets
 * nothing, and the only effect is a round trip.
 */
export const CHAT_PAGE_TRIGGER_MIN_MESSAGES = 15;

/**
 * `scrollTop = scrollTop + 30`, applied IMMEDIATELY after the request goes out.
 *
 * The reader is pinned at the top when the request fires, and `scrollTop` stays under the threshold
 * until the answer arrives and re-flows the list. Without the nudge, every scroll event in that
 * window re-fires the trigger; `loadingMore` catches those, but the nudge is what stops the
 * scroller from feeling stuck against the top edge while it waits.
 */
export const CHAT_PAGE_REQUEST_NUDGE = 30;

/**
 * `this.scroller.scrollTop = this.scroller.scrollTop + 1` when a page GREATER THAN ZERO arrives.
 *
 * The reference nudges twice, and the second one is not a duplicate of the first. Prepending fifty
 * rows leaves the browser free to keep `scrollTop` where it was, which is now pointing at different
 * content; a one-pixel scroll is the smallest thing that makes the scroller recompute its anchor
 * without visibly moving the reader.
 *
 * Only for a later page. Page 0 arriving takes upstream's other branch entirely — that is the
 * initial log, and it belongs at the bottom, not one pixel down from wherever the reader was.
 */
export const CHAT_PAGE_ARRIVAL_NUDGE = 1;

export type ChatPagingState = {
  scrollTop: number;
  messageCount: number;
  /** A filtered log is not a paged one — the reference refuses to page while a search is active. */
  searchTerm: string;
  /** False once a page came back empty. Reset when the reader returns to the bottom. */
  hasMoreData: boolean;
  /** A request is already in flight. */
  loadingMore: boolean;
};

/**
 * The reference's condition, whole:
 *
 * ```js
 * if (i.scrollTop < 100 && this.msgs && this.msgs.length > 15 && !this.searchTerm) {
 *   if (!this.hasMoreData) return void P("loading more: no more data...");
 *   if (this.loadingMore) return void P("loading more already...");
 *   this.loadingMore = !0; this.currPage++;
 *   emit("loadMoreLogs", {type: this.logType, channel: this.channel, page: this.currPage});
 * }
 * ```
 *
 * Written as one predicate rather than three early returns because the two guards and the three
 * conditions all answer the same question, and a scroll handler that can only say yes or no is a
 * scroll handler that can be tested without a scroller.
 */
export function shouldLoadOlderMessages(state: ChatPagingState): boolean {
  return (
    state.scrollTop < CHAT_PAGE_TRIGGER_SCROLL_TOP &&
    state.messageCount > CHAT_PAGE_TRIGGER_MIN_MESSAGES &&
    state.searchTerm.length === 0 &&
    state.hasMoreData &&
    !state.loadingMore
  );
}

/** The least a merged row must carry: something to tell it apart from another row. */
type Identified = { id: unknown };

/**
 * Folds an older page in front of what is already held, dropping anything already present.
 *
 * ## Why dedupe at all
 *
 * Offset paging over a live tail can hand back a row twice. A message posted between the page-0
 * read and the page-1 request shifts every row one place further back, so the boundary row lands in
 * both pages. Upstream carries this too and shows the duplicate; here it costs one Set.
 *
 * ## Identity is EQUALITY, never ordering
 *
 * Rows are matched with `Set.has`, which compares ids for sameness and nothing else. No `<`, no
 * `Math.max`, no arithmetic — `id-opacity-contract` exists because a previous version of this
 * codebase computed `Math.max(highest, item.id)` and would have produced `NaN` the day ids became
 * uuids. Sameness survives that change; ordering does not.
 *
 * ## Order comes from the caller
 *
 * Older pages go in FRONT, because both arrays are already oldest-first and page N+1 is older than
 * page N. Nothing is re-sorted here: re-sorting would need a comparison, and a comparison is the
 * thing being avoided.
 */
export function mergeOlderChatMessages<T extends Identified>(
  older: readonly T[],
  existing: readonly T[]
): T[] {
  return mergeOlderMessagesBy(older, existing, (item) => item.id);
}

/**
 * The same fold, for rows whose identity is not called `id`.
 *
 * Private-chat messages carry `_id` — the reference's field name, transcribed — so they cannot
 * satisfy `Identified`. A second entry point rather than a widened signature on the one above,
 * because two production call sites and four contract assertions pin that call verbatim, and
 * changing a shared function's shape to reach one new caller is how those pins become noise.
 *
 * One implementation: the function above delegates here. There is no second dedupe rule to keep in
 * step, which is the thing that mattered.
 */
export function mergeOlderMessagesBy<T>(
  older: readonly T[],
  existing: readonly T[],
  identify: (item: T) => unknown
): T[] {
  const seen = new Set(existing.map(identify));
  return [...older.filter((item) => !seen.has(identify(item))), ...existing];
}

/*
  ═══ THE LOAD MORE BUTTON, which is a different control from the scroll trigger above ═══

  Everything above this line serves the main chat and alert feeds, where reaching the top of the
  scroller fetches more. The PRIVATE CHAT panel has an explicit "Load More" badge instead, and the
  reference gives its scroller four fields of its own for it (bundle byte 2,191,427):

  ```js
  constructor: this.hasMoreData = !0, this.currPage = 0, this.isLoadingMore = !1, this.loadMoreLastID = ""

  subscribe("getPCLog", e => {
    this.isLoadingMore = !1,
    0 == e.length && (this.hasMoreData = !1, this.loadMoreLastID = ""),
    this.loadMoreLastID && (document.getElementById(this.loadMoreLastID).scrollIntoView(!0),
                            parent.scrollTop = parent.scrollTop - 20)
  })

  subscribe("PCswitchChatToUser", e => {
    this.currPage = 0, this.hasMoreData = !0, this.isLoadingMore = !1, this.loadMoreLastID = ""
  })

  loadMore() {
    this.loadMoreLastID = "pcm-" + this.msgs[0]._id,
    emit("PCLoadMore", { page: ++this.currPage }),
    this.isLoadingMore = !0
  }
  ```

  ## What this room had instead, and what it cost

  No counter and no `hasMoreData`. The panel computed the page as `Math.floor(log.length / 50)`
  against a `PAGE_SIZE = 50` it declared itself, and showed the badge whenever `log.length >= 50`.

  **A short page re-requested itself.** Ask for page 1, get 30 rows back, and `log.length` is 80 —
  `Math.floor(80 / 50)` is 1, so the next click asks for page 1 again and prepends the same thirty
  messages a second time. In a private conversation.

  **The badge never went away.** An empty response leaves `log.length` unchanged, so Load More stayed
  and every further click re-fetched the same empty page forever.

  **And `PAGE_SIZE` was invented.** The reference has no client-side page size at all: `currPage`
  counts requests, and the server decides how many rows a page holds. Fifty was a number in this
  repository that described a decision made somewhere else.
*/

/**
 * THREE of the reference's four fields.
 *
 * `loadMoreLastID` is deliberately absent, and its absence is recorded rather than quietly dropped.
 * It is a SCROLL RESTORATION: the id of the row that was at the top when Load More was pressed, used
 * by the `getPCLog` subscriber above to `scrollIntoView` that row once older messages have been
 * prepended and then back off 20px. Without it the reader's view jumps by however many rows arrived.
 *
 * It was modelled here first, and then removed, because NOTHING COULD READ IT: our rows render as
 * `<CompactMessageRow>` with no `id` attribute at all, so the `getElementById("pcm-" + _id)` the
 * restoration turns on would find nothing. A field written and never read is the thing this
 * repository refuses, and carrying it would have looked like the behaviour existed.
 *
 * Building it means giving the row an id — which is a shared component used by the all-user modal
 * too — and a `scrollToAnchor` beside `scrollToBottom` in `RoomPrivateChat`. `TODO.md` carries it
 * with these bytes so the next pass does not re-derive them.
 */
export type LoadMorePaging = {
  /** `currPage` — REQUESTS made, not rows held. That distinction is the whole defect. */
  readonly page: number;
  /** `hasMoreData` — false once a page came back empty, and only then. */
  readonly hasMoreData: boolean;
  /** `isLoadingMore` — a request is in flight; the badge becomes a spinner. */
  readonly loadingMore: boolean;
};

/** `PCswitchChatToUser` — a fresh conversation starts optimistic and unpaged. */
export function newLoadMorePaging(): LoadMorePaging {
  return { page: 0, hasMoreData: true, loadingMore: false };
}

/**
 * `loadMore()` — take the next page number and mark the request in flight, in one step.
 *
 * Returns the state to hold, and the caller asks for `.page`, because `++this.currPage` does both at
 * once and splitting them invites a caller to ask for a page it did not record.
 */
export function startLoadMore(state: LoadMorePaging): LoadMorePaging {
  return { ...state, page: state.page + 1, loadingMore: true };
}

/**
 * The `getPCLog` subscriber: a page has arrived.
 *
 * `hasMoreData` goes false on an EMPTY page and on nothing else — not on a short one. A page with
 * fewer rows than the last is not the end of the history; only a page with none is. Guessing from
 * the size is exactly the mistake `PAGE_SIZE` encoded.
 */
export function settleLoadMore(state: LoadMorePaging, incomingCount: number): LoadMorePaging {
  return { ...state, loadingMore: false, hasMoreData: incomingCount > 0 && state.hasMoreData };
}
