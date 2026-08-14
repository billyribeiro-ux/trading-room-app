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
 * `scrollTop = scrollTop + 30` after the request goes out.
 *
 * The reader is pinned at the top when the request fires, and `scrollTop` stays under the threshold
 * until the answer arrives and re-flows the list. Without the nudge, every scroll event in that
 * window re-fires the trigger; `loadingMore` catches those, but the nudge is what stops the
 * scroller from feeling stuck against the top edge while it waits.
 */
export const CHAT_PAGE_SCROLL_NUDGE = 30;

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
  const seen = new Set(existing.map((item) => item.id));
  return [...older.filter((item) => !seen.has(item.id)), ...existing];
}
