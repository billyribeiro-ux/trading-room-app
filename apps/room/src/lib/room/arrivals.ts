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
 * A bound here would therefore be safe for those two.
 *
 * THE THIRD LIST'S DESCRIPTION HERE WAS STALE, and is corrected 2026-09-02. It said the
 * `alertQuestions` read in `+page.server.ts` was a `.select(...).all()` with no `.limit()` that
 * "returns every question the room has ever had". It is not: `loadQuestionsForAlerts`
 * (`#lib/server/alert-log.ts`) takes an id list and filters `inArray(alertQuestions.alertId, …)`,
 * and that list is the loaded alert page plus the captured fixtures. So the read is scoped to about
 * fifty alerts rather than to the room's history.
 *
 * The CONCLUSION is unchanged, and it is worth saying why a corrected premise did not move it:
 * scoped to fifty alerts is not the same as bounded by a row count. One busy alert can carry an
 * unbounded thread, so a page left open in a heavy Q&A still grows this set — and evicting an id
 * that is still in the list would re-announce it, a toast and a sound for a question from last week.
 *
 * The honest order is unchanged too: bound the QUESTIONS PER ALERT first, then bound this. Recorded
 * in `TODO.md` rather than guessed at with a number that looks big enough.
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

/**
 * `RoomOrderedArrivals` — the same question as `RoomArrivals`, answered by POSITION instead of by
 * identity, and the two are deliberately not one class.
 *
 * ## Why a second algorithm exists at all
 *
 * The mention popup marks the LAST message it announced and takes everything after it, by position
 * in the server's own ordering. A `Set` of seen ids would look equivalent and is not, because of the
 * case in the middle of `fresh()` below: when the marker is no longer in the list at all — trimmed
 * out of the newest page while you were away — this **re-seeds silently**. An identity set has no
 * way to express that. Every row would be unseen, and a member returning to a busy room would get a
 * toast AND an operating-system notification for every mention in the log at once.
 *
 * So they sit in one file, next to each other, precisely so nobody merges them: two algorithms that
 * look alike, answer the same English sentence, and differ on the case that matters.
 *
 * ## The id is an OPAQUE key here, never a number
 *
 * `Row` is constrained to `{ id: unknown }` rather than to `ArrivalRow`, and that is deliberate:
 * this class only ever compares with `===` and slices by POSITION, so it does not need to know what
 * an id is. `id-opacity-contract.test.ts` exists because the first version of this logic did
 * `Math.max(highest, item.id)` — and the room-to-API cutover swaps SQLite's numeric ids for uuids,
 * which is a server-side change ONLY while no client does arithmetic on one. `Math.max` over a uuid
 * is not a type error; it is `NaN` at runtime. Widening the constraint is what makes that
 * unwritable here rather than merely discouraged.
 *
 * `RoomArrivals` above keeps `number`, and that asymmetry is the point: it uses ids as `Set` keys,
 * so it needs one that hashes by value.
 *
 * ## The empty-room case, which falls out correctly rather than by accident
 *
 * Seeded against an empty log, `#lastId` is `undefined`; `findIndex` returns -1; the lost-marker
 * guard is skipped because it requires a marker to have existed; and `slice(0)` returns the whole
 * list. So the first message ever posted IS announced. That is the same distinction `RoomArrivals`
 * needs its `#primed` flag for, arriving here for free — worth stating, because it reads like an
 * oversight until you follow it through.
 */
export class RoomOrderedArrivals<Row extends { readonly id: unknown }> {
  #lastId: unknown;
  #seeded = false;

  /**
   * Everything after the last row this announced, and nothing at all on the first call.
   *
   * Arriving in a room with fifty unread mentions is silent: the first pass records where the log
   * ends and announces none of it.
   */
  fresh(messages: readonly Row[]): readonly Row[] {
    if (!this.#seeded) {
      this.#seeded = true;
      this.#lastId = messages.at(-1)?.id;
      return [];
    }

    /*
      THE MARKER IS GONE — trimmed from the newest page, or the log replaced under us. `findIndex`
      gives -1 and `slice(0)` would announce the entire list, so this re-seeds instead. The
      `!== undefined` term is what keeps the empty-room case out of this branch; see the note above.
    */
    const seenAt = messages.findIndex((item) => item.id === this.#lastId);
    if (this.#lastId !== undefined && seenAt === -1) {
      this.#lastId = messages.at(-1)?.id;
      return [];
    }

    const arrived = messages.slice(seenAt + 1);
    if (arrived.length === 0) return [];
    this.#lastId = messages.at(-1)?.id;
    return arrived;
  }
}
