/**
 * `doChatLogSearch` — the two chat columns' search boxes, and nothing else.
 *
 * ## Why this is its own class
 *
 * It arrived inside `RoomChat` and took that file from 260 lines to 397 — past a ceiling the size
 * contract holds, and the answer that contract asks for is this one: move the explanation to the
 * code that owns its subject. `RoomChat` is about which channel each column is showing and what is
 * typed in each composer. A search box is a third thing, with its own state machine (open, term,
 * results pending) and its own rule about when it ends.
 *
 * The two are still coupled in one direction, and that coupling is the feature: **switching channels
 * ends the search**, because a search is scoped to a channel (`{searchTerm, channel}` on the wire).
 * `RoomChat`'s tab setters call `endedByChannelSwitch` for that reason, which is a method here rather
 * than a field there so the rule reads where the search lives.
 *
 * ## What it does NOT own: the rows
 *
 * Those are `RoomFeeds`'. They are typed messages that go through the same visibility pipeline as
 * the log — hidden rows, webinar mode, badges — and holding them here would mean an `unknown[]` the
 * feed casts, which is loose typing at exactly the boundary a leak would cross. This class reports
 * that a search ended; `RoomFeeds` is what clears the rows.
 *
 * ## The upstream shape, and the one flag deliberately not reproduced
 *
 * ```js
 * toggleChatToolbarSearchOnly() {                      // the magnifier, byte 1,435,310
 *   this.showChatToolbar && this.showChatToolbarExtended || (this.showChatToolbar = !this.showChatToolbar);
 *   this.showChatToolbarExtended = !1; …focus the field…
 * }
 * toggleChatToolbar() {                                // the gear, byte 1,435,047
 *   this.showChatToolbar && !this.showChatToolbarExtended ? this.showChatToolbarExtended = !0
 *     : (this.showChatToolbar = !this.showChatToolbar, this.showChatToolbar && (this.showChatToolbarExtended = !0));
 * }
 * searchTermChanged(e) { e || this.clearSearchTerm() }  // byte 1,439,050
 * ```
 *
 * `showChatToolbarExtended` IS held now, and the sentence that used to stand here — "a flag whose
 * only reader would be markup that does not exist is what `CLAUDE.md` refuses by name" — was correct
 * on 2026-08-29 and stopped being correct on 2026-08-30, when `acA-04` built the first control the
 * extended bar carries: the **Mod Only** checkbox. So both toggles are transcribed above, term for
 * term, and both are implemented below.
 *
 * The rest of that bar is still not built — the save-chat and archive controls (`Y_e` and `Q_e`,
 * nodes 4 and 5 of `X_e` at byte 1,423,265) are separate features — so the extended section renders
 * the checkbox and nothing else. That is a gap in what the bar OFFERS, not a flag with no reader.
 *
 * ## One divergence, and it is in the reader's favour
 *
 * **Closing the bar clears the search.** Upstream's bar can be hidden with a term still in it and
 * results still standing in for the log, leaving a reader looking at a filtered log with nothing on
 * screen saying so. That is the failure `alert-toolbar-search-scope.ts` was written to prevent on the
 * alerts side, and it is worse here because these results are not a superset of anything — they are
 * a different query's answer.
 */

/** Which column. The two are independent in every respect but the rule that a switch ends a search. */
export type ChatColumn = 'main' | 'extra';

export class RoomChatSearch {
  /**
   * A search on this column has ended, and its rows should stop standing in for the log.
   *
   * Injected, because the rows are `RoomFeeds`' — see the docblock. Defaults to a no-op so a test
   * that only cares about the box need not wire a feed.
   */
  readonly #ended: (column: ChatColumn) => void;

  #term = $state({ main: '', extra: '' });
  #open = $state({ main: false, extra: false });
  /** `showChatToolbarExtended` — the bar is showing its controls and not only the search field. */
  #extended = $state({ main: false, extra: false });

  constructor(options: { ended?: (column: ChatColumn) => void } = {}) {
    this.#ended = options.ended ?? (() => {});
  }

  /** What is typed in a column's box. */
  term(column: ChatColumn): string {
    return this.#term[column];
  }

  /**
   * `searchTermChanged(e) { e || this.clearSearchTerm() }` — emptying the box ends the search.
   *
   * With no round trip and no submit, which is upstream's behaviour and is why this is a setter
   * rather than something the component decides: a component that had to remember to call `clear`
   * on an empty input is a component that will forget on the second copy of the box, and there are
   * two.
   */
  setTerm(column: ChatColumn, next: string): void {
    this.#term[column] = next;
    if (!next) this.#ended(column);
  }

  /** Whether the bar is showing under a column's header. */
  isOpen(column: ChatColumn): boolean {
    return this.#open[column];
  }

  /** Whether the bar is showing its controls as well as the search field. */
  isExtended(column: ChatColumn): boolean {
    return this.#extended[column];
  }

  /**
   * The magnifier — `toggleChatToolbarSearchOnly`, byte 1,435,310.
   *
   * ```js
   * this.showChatToolbar && this.showChatToolbarExtended || (this.showChatToolbar = !this.showChatToolbar);
   * this.showChatToolbarExtended = !1;
   * ```
   *
   * The `||` is doing the work and is easy to misread: when the bar is open AND extended, the left
   * side is truthy and the assignment is SKIPPED — so the magnifier COLLAPSES an extended bar to
   * search-only rather than closing it. Every other state flips it. The unconditional
   * `showChatToolbarExtended = !1` is the second line.
   *
   * Closing ends the search — see the divergence in the docblock.
   */
  toggle(column: ChatColumn): void {
    const collapsing = this.#open[column] && this.#extended[column];
    this.#extended[column] = false;
    if (collapsing) return;

    const next = !this.#open[column];
    this.#open[column] = next;
    if (!next) this.clear(column);
  }

  /**
   * The gear — `toggleChatToolbar`, byte 1,435,047.
   *
   * ```js
   * this.showChatToolbar && !this.showChatToolbarExtended
   *   ? this.showChatToolbarExtended = !0
   *   : (this.showChatToolbar = !this.showChatToolbar,
   *      this.showChatToolbar && (this.showChatToolbarExtended = !0));
   * ```
   *
   * An open search-only bar EXTENDS; anything else opens or closes, and an open one is always
   * extended. Closing this way ends the search for the same reason the magnifier does — a term left
   * standing behind a hidden bar is a filtered log with nothing on screen saying so.
   */
  toggleExtended(column: ChatColumn): void {
    if (this.#open[column] && !this.#extended[column]) {
      this.#extended[column] = true;
      return;
    }

    const next = !this.#open[column];
    this.#open[column] = next;
    this.#extended[column] = next;
    if (!next) this.clear(column);
  }

  /** The `×`. Both halves at once, because a term left standing with no results is the bug. */
  clear(column: ChatColumn): void {
    this.#term[column] = '';
    this.#ended(column);
  }

  /**
   * The reader switched channels, so whatever was found no longer belongs to what they are reading.
   *
   * Called from `RoomChat`'s tab setters. **The bar stays open** and only its contents go: the
   * reader asked for a search box and did not ask for it to disappear, and a bar that vanished on a
   * channel switch would look like a bug rather than a scope rule.
   *
   * Not a display nicety. Badge channels are visible to some members and not others, so results
   * held across a switch would be another channel's messages rendered as this one's — legitimately
   * fetched rows in an illegitimate place.
   */
  endedByChannelSwitch(column: ChatColumn): void {
    this.clear(column);
  }
}
