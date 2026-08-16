/**
 * `RoomArrivals` — which rows in a wholesale-replaced list are NEW, and silence on the first pass.
 *
 * ## The three sites this replaces, and why they are one thing
 *
 * `data.messages`, `data.alerts` and `data.alertQuestions` are SvelteKit load data: replaced in
 * full on every `invalidate`, never mutated. Three separate effects in `+page.svelte` each needed
 * the same answer — *which of these did I not have last time?* — and each had grown its own copy:
 *
 * ```
 *   alert delivery   seenAlertIds     + alertDeliveryInitialized   -> toast + sound
 *   Q&A notices      seenQuestionIds  + qaNoticesPrimed            -> toast + sound
 *   chat sound       seenMessageIds   + chatSoundPrimed            -> pling
 * ```
 *
 * Three sets, three booleans, spread across two thousand lines, and the rule they all encode — the
 * first pass records and announces NOTHING — restated three times where two of them could drift.
 * Opening a room with fifty unread alerts must be silent; that is one rule, so it is one class,
 * tested once, with one negative control.
 *
 * ## Why this is NOT a `.svelte.ts` rune module
 *
 * Every other class under `src/lib/room/` holds `$state` because something renders from it. Nothing
 * renders from these markers — they are bookkeeping read inside an effect that also writes them.
 * Making them reactive would be actively wrong, not merely surplus: an effect that reads a `$state`
 * set and then adds to it re-runs itself. So this is a plain `.ts` class, and the absence of runes
 * here is a decision rather than an oversight.
 *
 * ## The marker set grows with the room, and nothing bounds it
 *
 * `#seen` accumulates an id per row for the life of the page, while the lists it is fed are BOUNDED
 * server-side — `loadNewestChatPages` and `loadAlertPage` return `CHAT_LOG_PAGE_SIZE` (50) rows.
 * A bound here would therefore be safe for those two. It is deliberately NOT added, because the
 * third list is not bounded: the `alertQuestions` read in `+page.server.ts` is a `.select(...).all()`
 * with no `.limit()`, so it returns every question the room has ever had. Evicting an id that is
 * still in the list would re-announce it — a toast and a sound for a question from last week.
 *
 * The honest order is: bound the server read first, then bound this. Recorded in `TODO.md` rather
 * than guessed at with a number that looks big enough.
 */

/**
 * A row with a comparable identity.
 *
 * Declared here rather than shared with `RoomLogPages`, whose `Identified` is `{ id: unknown }`:
 * that one only ever compares ids for equality when merging pages, while this one uses them as
 * `Set` keys, and widening this to `unknown` would let a row whose id is an object join the set
 * under reference identity and never match again.
 */
export type ArrivalRow = { readonly id: number };

export class RoomArrivals<Row extends ArrivalRow> {
  #seen = new Set<number>();
  /**
   * False until the first `fresh()` call. NOT "has any row been seen" — an empty room's first pass
   * must still prime, or the first message ever posted would arrive as a backlog rather than as
   * news, and a set-emptiness check cannot tell those apart.
   */
  #primed = false;

  /**
   * The rows not seen before, marked seen by the asking.
   *
   * Returns `[]` on the FIRST call whatever it is given — that pass is the log as it stood when the
   * page loaded, which is history and not news.
   */
  fresh(rows: readonly Row[]): Row[] {
    if (!this.#primed) {
      this.#primed = true;
      for (const row of rows) this.#seen.add(row.id);
      return [];
    }

    const arrived: Row[] = [];
    for (const row of rows) {
      if (this.#seen.has(row.id)) continue;
      this.#seen.add(row.id);
      arrived.push(row);
    }
    return arrived;
  }
}
