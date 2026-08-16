import { shouldAutoScrollForMessage } from '#lib/room-scroller.js';

/**
 * `RoomScrollFollow` — does this render pull the reader to the bottom, or leave them where they are?
 *
 * ## The three copies this replaces
 *
 * The alerts column, the chat column and the second chat column each ran the same twenty lines with
 * their own three markers:
 *
 * ```
 *   alerts       alertsScrollInitialized      previousAlertCount         (no tab)
 *   chat         chatScrollInitialized        previousChatCount          previousChatTab
 *   extra chat   extraChatScrollInitialized   previousExtraChatCount     previousExtraChatTab
 * ```
 *
 * Eight identifiers for one question asked three times. They are three INSTANCES and not one shared
 * marker, and that is the load-bearing part: the columns have independent tabs, independent lists
 * and independent reader scroll positions, so a reader scrolled up in one column must not be yanked
 * to the bottom by traffic in the other. One set of markers would do exactly that.
 *
 * ## Why the decision is returned rather than performed
 *
 * `follows()` answers the question and updates its own markers. The caller does the scrolling, and
 * the caller clears its own `scrollingUp` flag. That is the same split `RoomSplit.endDrag()` uses:
 * a class that reached into the DOM could not be tested without one, and the `tick()`-then-check
 * dance around a scroller that may have been replaced mid-flight belongs where the element lives.
 *
 * ## Not a rune module, for the same reason as `RoomArrivals`
 *
 * Nothing renders from `#initialized` / `#previousCount` / `#previousTab` — they are read inside an
 * effect that also writes them, and a `$state` field in that position would re-run its own effect.
 *
 * ## The remaining latch, named honestly
 *
 * `#previousCount` still infers an arrival from a count going up. That is not something this class
 * fixes; it is where the inference now LIVES, tested, instead of being restated three times. A
 * count cannot tell one arrival from two, or an arrival from a deletion plus two arrivals — it
 * never could, and the captured app has the same limitation.
 */
export class RoomScrollFollow<Tab = never> {
  #initialized = false;
  #previousCount = 0;
  #previousTab: Tab | undefined;

  /**
   * The viewer's "always scroll to bottom" override, or nothing.
   *
   * A CONSTRUCTOR capability rather than a `follows()` argument, because `shouldAutoScrollForMessage`
   * records the rule it enforces: *"The alerts scroller shares this function but must NOT take the
   * override."* Supplied here, the alerts instance cannot be handed one by a caller who forgets —
   * the rule is structural instead of remembered.
   *
   * A thunk and not a value, so it is read at decision time. It is read INSIDE the `&&` below, which
   * keeps it a conditional dependency of the calling effect exactly as the inline version was:
   * toggling the preference does not re-run a scroll decision for a render with no new message.
   */
  readonly #alwaysScrollToBottom: () => boolean;

  constructor(options: { alwaysScrollToBottom?: () => boolean } = {}) {
    this.#alwaysScrollToBottom = options.alwaysScrollToBottom ?? (() => false);
  }

  /**
   * Whether to scroll, given what this column now holds. Asking updates the markers.
   *
   * Three ways to say yes, and they are checked in this order for a reason:
   *
   * * **the first view** — a column you have just opened starts at the newest message;
   * * **a channel switch** — you changed tab, so you are not "reading history" in the new one;
   * * **a new message**, and only if `shouldAutoScrollForMessage` agrees you may be moved.
   *
   * `readingHistory` is the caller's scrolled-up flag, maintained continuously by the scroll
   * listener rather than measured here. Nothing in this method touches the DOM.
   */
  follows(input: {
    readonly count: number;
    /** Omitted by the alerts column, which has no channels; `undefined !== undefined` is false. */
    readonly tab?: Tab;
    readonly newestSenderId: number | undefined;
    readonly viewerId: number;
    readonly readingHistory: boolean;
  }): boolean {
    const isInitialView = !this.#initialized;
    const didSwitchChannel = this.#initialized && input.tab !== this.#previousTab;
    /*
      NO `!didSwitchChannel` TERM, and its absence is deliberate rather than an omission.

      Both chat effects carried one — `initialized && !didSwitchChannel && count > previousCount` —
      and it could never change an answer: `didSwitchChannel ||` short-circuits the return below, so
      `isNewMessage` is only ever consulted when `didSwitchChannel` is already false. Dropping it is
      `A || B || (C && !B && D)` reduced to `A || B || (C && D)`, the same function.

      Found by a negative control that removed the term and left the suite green. That is a control
      doing its job rather than failing at it: a mutation that cannot change behaviour cannot be
      caught, and the answer is to delete the term, not to write a test that pretends to guard it.
    */
    const isNewMessage = this.#initialized && input.count > this.#previousCount;

    this.#initialized = true;
    this.#previousTab = input.tab;
    this.#previousCount = input.count;

    return (
      isInitialView ||
      didSwitchChannel ||
      (isNewMessage &&
        shouldAutoScrollForMessage(
          input.readingHistory,
          input.newestSenderId,
          input.viewerId,
          this.#alwaysScrollToBottom()
        ))
    );
  }
}
