/**
 * Whether the alerts TOOLBAR search is answering over a partial log, and what to say when it is.
 *
 * ## The defect
 *
 * The toolbar's search field is ported verbatim from the capture, down to its dangling
 * `aria-describedby`. What it does is not: `RoomAlerts.matchesSearch` filters the alerts the page
 * happens to hold — `loadAlertPage`'s newest fifty rows — while upstream sends `doChatLogSearch` to a
 * SERVER (byte 1439114, `type:"chat"`; the alerts sender at 2051344). So a reader searching for
 * something from last week gets an empty list and **no indication the log was never asked.**
 *
 * `TODO.md` filed it under SILENT CORRECTNESS GAPS: *"it works, but not the way the reference works,
 * and nothing says so"*, and offered two resolutions — a real search endpoint, or make the limit
 * visible.
 *
 * ## Why the limit, and not a round trip on Enter
 *
 * **A correct search already exists and is one click away.** The Advanced Search modal asks the
 * database through `searchAlerts`, reports its own truncation at `ALERT_SEARCH_LIMIT`, and has done
 * since 2026-08-23. Rebuilding that behind the toolbar would be a second search path over the same
 * table, and it would change what the toolbar IS: a live filter that narrows the list as you type,
 * with no round trip and no spinner.
 *
 * So the toolbar keeps being a filter and stops pretending to be a search. That is the resolution the
 * defect table offers, and it is the one that leaves a reader with a true statement rather than a
 * confident wrong answer.
 *
 * ## The sentence is OURS
 *
 * Not captured, and it cannot be: the reference has no equivalent because its toolbar does not
 * filter locally at all. Recorded as invented rather than left to look transcribed.
 */

/** The number of alerts one page delivers — `CHAT_LOG_PAGE_SIZE`, restated for the client. */
export const ALERT_PAGE_SIZE = 50;

/**
 * The notice, or `null` when there is nothing to warn about.
 *
 * Three conditions, and each rules out a case where the warning would be noise:
 *
 * - **No term** — the toolbar is not filtering, so nothing is being answered partially.
 * - **Fewer alerts loaded than a full page** — the reader is looking at the whole log for this room,
 *   so the filter's answer IS the log's answer. This is the common case in a quiet room and the one
 *   that would make a permanent notice read as boilerplate.
 * - **Nothing matched, or something did** — deliberately NOT a condition. A search that found three
 *   results out of fifty rows is just as partial as one that found none, and warning only on the
 *   empty case would teach readers that results mean completeness.
 */
export function alertSearchScopeNotice(input: {
  term: string;
  loadedCount: number;
}): string | null {
  if (!input.term.trim()) return null;
  if (input.loadedCount < ALERT_PAGE_SIZE) return null;
  return `Searching the ${input.loadedCount} alerts loaded here, not the whole log. Use Advanced Search to search everything.`;
}
