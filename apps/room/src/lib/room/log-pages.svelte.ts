import { mergeOlderChatMessages } from '#lib/chat-paging.js';

/*
  Older-page state for a room log — held ONCE, because upstream holds it once.

  ## The finding this extraction is

  The room had two copies of this machinery and they were shaped differently:

  ```js
  let olderAlerts       = $state.raw<Row[]>([]);              let olderChatMessages = $state.raw<Record<string, Row[]>>({});
  let alertsPage        = $state.raw(0);                      let chatPage          = $state.raw<Record<string, number>>({});
  let alertsHasMoreData = $state(true);                       let chatHasMoreData   = $state.raw<Record<string, boolean>>({});
  let alertsLoadingMore = $state(false);                      let chatLoadingMore   = $state(false);
  ```

  Scalars on the left, per-channel maps on the right — and NEITHER shape is wrong, which is what
  made the duplication survive so long. Upstream renders ONE roomlog component per log view and
  keeps this state on the component, so the alerts pane has one set and the chat pane has one set
  per channel it renders. The chat comment records that discovery in as many words: a single shared
  `hasMoreData` meant reaching the start of `main` also stopped `off-topic` from ever paging.

  So the two are the same machinery at two arities, and the arity is the only difference. One keyed
  class covers both: the alerts pane passes a fixed key, the chat pane passes its tab. Behaviour is
  identical on both sides — an alerts log with exactly one key behaves as a scalar did.

  ## What is NOT here

  The SCROLL side of paging — the trigger threshold, the two nudges and the refusal to page while a
  search term is set — stays in `#lib/chat-paging.js`, which is pure and already tested against the
  reference's own rules. This class holds the state those rules are asked about; it does not decide
  anything about scrolling and never touches an element.

  The FETCH stays in the page too. `loadOlderChatPage` and `loadOlderAlertsPage` are remote
  functions with different signatures — one takes a channel, one does not — and a class that knew
  which to call would be picking transport for its caller. What it provides instead is the
  bookkeeping either loader needs: which page to ask for, that a request is in flight, and what to
  do with an empty answer.
*/

/**
 * The alerts log's key.
 *
 * The alerts pane is one log with no channels, so it needs a name to be keyed by and this is it. A
 * literal at the call site would work and would also be the sort of string that gets typed two ways
 * six months apart, at which point a pane silently pages from a second, empty slot.
 */
export const ALERTS_LOG = 'alerts';

/** The minimum a row needs for {@link RoomLogPages.arrived} to merge it. */
type Identified = { id: unknown };

export class RoomLogPages<Row extends Identified> {
  /**
   * Older pages, oldest-first, keyed by log.
   *
   * `$state.raw`: these arrays are only ever REPLACED, never mutated in place, so a deep proxy over
   * every message row would cost a proxy read per field on every render and buy nothing.
   */
  #older = $state.raw<Record<string, readonly Row[]>>({});

  /** `this.currPage`, per log. Page 0 is what the page load already sent. */
  #page = $state.raw<Record<string, number>>({});

  /**
   * `this.hasMoreData` — cleared when a page comes back empty, re-armed at the bottom.
   *
   * Absent means TRUE: a log nobody has paged yet has more data until it says otherwise. Storing
   * the negative would mean seeding every key before the first scroll, and a key that was missed
   * would silently refuse to page rather than trying once and finding out.
   */
  #hasMore = $state.raw<Record<string, boolean>>({});

  /**
   * `this.loadingMore` — one request at a time.
   *
   * NOT per key, and that is the reference's shape rather than an oversight: upstream's flag is on
   * the component and guards the one in-flight request it can have. A reader is looking at one log
   * at a time, so a second concurrent fetch is a double-fired scroll handler rather than genuine
   * parallelism.
   */
  #loading = $state(false);

  get loading(): boolean {
    return this.#loading;
  }

  older(key: string): readonly Row[] {
    return this.#older[key] ?? EMPTY;
  }

  page(key: string): number {
    return this.#page[key] ?? 0;
  }

  hasMore(key: string): boolean {
    return this.#hasMore[key] ?? true;
  }

  /**
   * Back at the bottom, so paging is armed again.
   *
   * `hasMoreData = !0` on the way down is the reference's own reset, and without it a reader who
   * once hit the end of the history could never page again in that session even after the log had
   * grown.
   */
  arm(key: string): void {
    /*
      Guarded through {@link hasMore} and NOT through the raw record, which is a real difference the
      test caught rather than a style choice.

      `arm` runs on every scroll event that ends at the bottom, which is a great many of them, and
      `$state.raw` compares by reference — so an unguarded write hands every reader of every key a
      new object per frame for no change at all. Reading the record directly guards the second call
      onward but not the first, because an unpaged log reports `true` from the `?? true` default
      while having no ENTRY. Through the accessor, a log that has never been exhausted never writes.
    */
    if (this.hasMore(key)) return;
    this.#hasMore = { ...this.#hasMore, [key]: true };
  }

  /**
   * A request is going out. Returns the page number to ask for.
   *
   * The caller must pair this with {@link settled} in a `finally`, exactly as the two loaders it
   * replaced did — an early `return` in the `catch` is the non-fatal path, and leaving the flag set
   * there would wedge the log for the session.
   */
  requesting(key: string): number {
    this.#loading = true;
    return this.page(key) + 1;
  }

  /** The request finished, however it finished. Belongs in a `finally`. */
  settled(): void {
    this.#loading = false;
  }

  /**
   * An empty answer is the terminator, exactly as upstream reads it
   * (`0 == o.length && (this.hasMoreData = !1)`): the server does not say how much history is left
   * and does not need to, because running out is something you discover by asking once too often.
   */
  exhausted(key: string): void {
    this.#hasMore = { ...this.#hasMore, [key]: false };
  }

  /**
   * A page arrived. Records it and merges the rows in front of what is held.
   *
   * Merging rather than concatenating because offset paging over a LIVE tail can hand the boundary
   * row back twice — `mergeOlderChatMessages` matches on identity and never on order.
   *
   * The page number moves only here, so a request that failed or came back empty does not advance
   * it and the next scroll asks for the same page again.
   */
  arrived(key: string, incoming: readonly Row[], page: number): void {
    this.#page = { ...this.#page, [key]: page };
    this.#older = {
      ...this.#older,
      [key]: mergeOlderChatMessages(incoming, this.older(key))
    };
  }
}

/**
 * One shared empty array for every unpaged log.
 *
 * A fresh `[]` per call would be a new identity on every read, so a `$derived` that merges it would
 * recompute on every render of a log nobody has paged — which is all of them, most of the time.
 */
const EMPTY: readonly never[] = [];
