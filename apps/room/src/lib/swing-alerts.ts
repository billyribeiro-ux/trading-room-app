/**
 * Swing Trade Alerts — the gates, pipes, comparators and formatters, out of the template.
 *
 * Same reason as `files-gates.ts` and `note-gates.ts`: a predicate that can only be reached by
 * rendering a pane is a predicate nobody tests, and every one of these decides either what a person
 * sees or what leaves the browser.
 *
 * Every value here is transcribed from `docs/decoded/swing-alerts.md`, which was decoded from
 * `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` with byte offsets. Offsets quoted
 * below are that document's. Nothing here is inferred; where the decode is silent it says so.
 */

/** The room settings this feature reads. Absent means unset, and unset means off. */
export interface SwingAlertsSessionFlags {
  /**
   * "Enable Swing Trade Alerts Tab?" — the per-room entitlement, and the ONLY thing that decides
   * whether this feature exists at all.
   *
   * `this.hasSwingTradeAlerts = this.appService.globals.sessData.hasSwingTradeAlerts` in `ngOnInit`
   * (spec §5b, byte 1,955,884), gating BOTH the nav item and the pane:
   *
   * ```js
   * O(26, o.hasSwingTradeAlerts ? 26 : -1)   // the <li>, XCe
   * O(48, o.hasSwingTradeAlerts ? 48 : -1)   // the <div id="swingAlerts">, vwe
   * ```
   *
   * `-1` is `ɵɵconditional`'s "instantiate nothing", so a room without it emits neither element —
   * not a hidden one. That is why {@link swingAlertsTabVisible} feeds an `{#if}` here rather than a
   * `hidden` attribute, unlike `hideFiles`, which really is bound to `hidden`.
   *
   * NOT presenter status. A member in a room with the setting on sees the tab, the heading, the
   * months select, the search box, the limit box, the download button and the whole table; what
   * presenter status gates is the form and the row buttons, separately, inside the pane.
   */
  hasSwingTradeAlerts?: boolean;
}

/**
 * The entitlement gate, as a truthiness test because that is what `O(26, …)` performs.
 *
 * Read once from the room's configuration, exactly as the reference reads it once in `ngOnInit`.
 */
export function swingAlertsTabVisible(session: SwingAlertsSessionFlags): boolean {
  return Boolean(session.hasSwingTradeAlerts);
}

/**
 * The wire commands, named once so the client, the server and the contract test cannot drift.
 *
 * Every name below was read directly out of `main.d1d09071be31f1ba.js` in the session that wrote
 * this file — the submit path at byte 1,983,136 onwards, the weeks handler at 1,993,565.
 *
 * ## Trap 1 — the create command
 *
 * Create is `swingAlertMsg`. It is **not** `newSwingAlertMsg`. That name is two OTHER things and
 * neither is a create: it is a payload KEY on `editSwingAlertMsg`
 * (`{ newSwingAlertMsg: h, swingAlertID: … }`), and it is the server→client push that prepends a
 * row. Sending it as a create produces a command the server rejects, and nothing in the failure
 * names the cause. {@link SWING_ALERT_PUSH_COMMANDS} keeps the push names beside these so the
 * collision stays visible.
 *
 * ## Trap 2 — a submit sends TWO commands
 *
 * ```js
 * if (this.swingAlert.edit) {
 *   sendServerCommand("editSwingAlertMsg", { newSwingAlertMsg: h, swingAlertID: this.swingAlert._id });
 *   sendServerCommand("editAlertMessageSwing", { alertID: …, newAlertMsg: f, swingTradeAlert: !0, txt: … });
 * } else {
 *   sendServerCommand("swingAlertMsg", h);
 *   sendServerCommand("alertMsg", _);
 * }
 * ```
 *
 * A swing alert is a row AND a message in the main alerts feed. {@link mirrorCreate} and
 * {@link mirrorEdit} are that second write. A rebuild that keeps only the row leaves the feed copy
 * orphaned the first time somebody edits.
 *
 * ## Trap 3 — `editAlertMessageSwing` is NOT swing-only
 *
 * The Day Trade path sends the **same literal command**, differing only in the boolean:
 * `{ alertID, newAlertMsg, dayTradeAlert: !0, txt }`. Read in this session immediately after
 * `editDayTradeAlertMsg`. When Day Trade is ported it reuses this name — it does not become
 * `editAlertMessageDayTrade`, and inventing that name is how the port breaks.
 *
 * ## Trap 4 — the log command is never a quoted literal at its send site
 *
 * It is built as `` sendServerCommand(`get${e}AlertsLog`, …) `` with `e` of `"Swing"` or
 * `"DayTrade"`, so searching the bundle for the string finds the handler and not the caller.
 */
export const SWING_ALERT_COMMANDS = {
  /** `getSwingAlertsLog` — `{ sessionID, days }`, built from `` `get${e}AlertsLog` ``. */
  log: 'getSwingAlertsLog',
  /** `swingAlertMsg` — the alert object `h`. */
  create: 'swingAlertMsg',
  /** `editSwingAlertMsg` — `{ newSwingAlertMsg: h, swingAlertID }`. */
  edit: 'editSwingAlertMsg',
  /** `deleteSwingAlertMsg` — `{ swingAlertID }`. */
  delete: 'deleteSwingAlertMsg',
  /** `alertMsg` — the mirrored feed message, create branch only. */
  mirrorCreate: 'alertMsg',
  /** `editAlertMessageSwing` — the mirrored feed edit. Shared verbatim with the Day Trade path. */
  mirrorEdit: 'editAlertMessageSwing'
} as const;

/**
 * The server→client pushes, recorded because two of them share a name with a client→server command
 * and one of them is the name most easily mistaken for the create command.
 *
 * Nothing calls these today — this room answers its mutations directly rather than pushing — so
 * they are documentation of the protocol rather than a dispatch table, and are named in the
 * contract test for exactly the reason above.
 */
export const SWING_ALERT_PUSH_COMMANDS = {
  /** Replaces the whole log: `data.reverse()`, then assign. Spec §5, byte 1,017,718. */
  log: 'getSwingAlertsLog',
  /** PREPENDS `data.newSwingAlertMsg`. This is the only correct use of that name. */
  created: 'newSwingAlertMsg',
  /** Splices out `_id === data.swingAlertID`. */
  deleted: 'deleteSwingAlertMsg',
  /** Replaces `_id === data.swingAlertID` with `data.swingMsg`. */
  edited: 'editSwingAlertMsg'
} as const;

/**
 * The months `<select>` — the integers 1 through 20, one `<option>` each.
 *
 * `zCe` at byte 1,916,549 is `() => [1,2,…,20]` and the repeater tracks by identity (`Li`, byte
 * 100,136). The Day Trade twin uses `WCe`, `[1..15]`, which is one of the differences to carry
 * across on that port — not a value to share.
 */
export const SWING_ALERT_MONTH_OPTIONS: readonly number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
];

/** `swingAlertMonths` initialises to 2. Byte 1,955,344. */
export const SWING_ALERT_DEFAULT_MONTHS = 2;

/** `swingAlertLimit` initialises to 10. Spec §3. */
export const SWING_ALERT_DEFAULT_LIMIT = 10;

/**
 * The FIRST fetch asks for 42 days, not for `30 * swingAlertMonths`.
 *
 * `loadTradeAlerts("Swing")` hardcodes `days: 42` (byte 1,010,251) while the select that describes
 * the window initialises to 2 and would ask for 60. So the first list shown is 42 days of data
 * under a label reading "Last 2 Months", and changing the select once reconciles them.
 *
 * That is the reference's behaviour, read from three separate places (spec §5b), and it is
 * reproduced rather than corrected: "fixing" it silently changes which rows a room opens on.
 */
export const SWING_ALERT_INITIAL_DAYS = 42;

/**
 * `onTradeAlertWeeksChange("Swing")` — months to days.
 *
 * `30 * this.swingAlertMonths` (byte 1,993,565). The Day Trade twin multiplies by 28, so this
 * deliberately takes no "feature" argument: a shared helper is a shared bug the day one of them
 * changes.
 */
export function swingAlertLogDays(months: number): number {
  return 30 * months;
}

/**
 * The Show/entries limit — `limitSwingLogs`, class `RCe` at byte 1,915,541, `pure: !0`:
 *
 * ```js
 * transform(e,i){ return e && 0 !== i ? e.slice(0,i) : [] }
 * ```
 *
 * **A limit of 0 yields the EMPTY list, not the whole one.** That is the comparator's single
 * surprising property and the reason it is a named function with a test rather than a `.slice()`
 * at the call site: `slice(0, 0)` and "no limit" are the same expression away from each other, and
 * whoever writes `rows.slice(0, limit || rows.length)` has changed the behaviour of the box.
 */
export function limitSwingLogs<T>(
  rows: readonly T[] | null | undefined,
  limit: number
): readonly T[] {
  return rows && limit !== 0 ? rows.slice(0, limit) : [];
}

/** The two fields `searchSwingLogs` dereferences. */
interface SwingSearchable {
  symbol: string;
  senderName: string;
}

/**
 * The search box — `searchSwingLogs`, class `PCe` at byte 1,915,251, `pure: !0`:
 *
 * ```js
 * transform(e,i){ return e ? (i ? (i = i.toLowerCase(),
 *   e.filter(o => o.symbol.toLowerCase().includes(i)
 *              || o.senderName.toLowerCase().includes(i))) : e) : [] }
 * ```
 *
 * Symbol OR sender name, both lowercased, substring. An empty term returns the list unfiltered —
 * it does not return `[]`, which is what the outer ternary is for.
 *
 * **No optional chaining, deliberately.** The swing pipe dereferences `o.symbol` and `o.senderName`
 * directly (byte 1,915,362) while the Day Trade twin `searchDayTradeLogs` (class `ICe`, byte
 * 1,915,738) writes `o?.symbol?.toLowerCase()?.includes(i)` — the guard sits AFTER the call, not
 * before it, and an earlier revision of this comment had those two transposed as
 * `o?.symbol?.toLowerCase?.()`. Corrected 2026-08-15 by reading both pipe classes side by side, 487
 * bytes apart, while porting the Day Trade half. Transcribing the swing one as forgiving would be
 * quietly choosing the other component's behaviour; both columns are `NOT NULL` in this room's own
 * table, so a row that reaches here without them is a defect that should be loud.
 */
export function searchSwingLogs<T extends SwingSearchable>(
  rows: readonly T[] | null | undefined,
  term: string
): readonly T[] {
  if (!rows) return [];
  if (!term) return rows;
  const needle = term.toLowerCase();
  return rows.filter(
    (row) =>
      row.symbol.toLowerCase().includes(needle) || row.senderName.toLowerCase().includes(needle)
  );
}

/** The five text fields of the form, as `onSwingAlertSubmit` reads them before trimming. */
export interface SwingAlertDraftFields {
  symbol: string;
  entryPrice: string;
  stop: string;
  target: string;
  image: string;
}

/**
 * `onSwingAlertSubmit`'s validation, byte 1,981,965 — the combined guard, then the per-field ones.
 *
 * Every string is verbatim from the decode's table (spec §2), including the quotes around the field
 * names and the comma after "Please". Returns `null` when the draft may be submitted.
 *
 * The order matters and is the reference's: the combined guard tests the RAW values for falsiness
 * first, so a form filled entirely with spaces gets the per-field message rather than the generic
 * one. `image` is trimmed alongside the others and is never validated.
 */
export function swingAlertSubmitError(draft: SwingAlertDraftFields): string | null {
  if (!draft.symbol || !draft.entryPrice || !draft.stop || !draft.target) {
    return 'Please, fill in required fields.';
  }
  if (!draft.symbol.trim()) return 'Please, fill in "symbol" field.';
  if (!draft.entryPrice.trim()) return 'Please, fill in "entry price" field.';
  if (!draft.stop.trim()) return 'Please, fill in "stop" field.';
  if (!draft.target.trim()) return 'Please, fill in "target" field.';
  return null;
}

/** The confirmation shown once the draft validates. Byte 1,981,965 onwards. */
export function swingAlertSubmitConfirm(edit: boolean): string {
  return `Are you sure you want to ${edit ? 'save' : 'send'} this alert?`;
}

/**
 * `onSwingAlertCancel`, byte 1,983,802.
 *
 * Returns `null` when EVERY field is empty, and the button then does nothing at all — no dialog,
 * no reset. That is not an oversight to smooth over: the guard is
 * `(symbol || entryPrice || stop || target || image) && bootbox.confirm(…)`, so a pristine form
 * has nothing to discard and says nothing.
 */
export function swingAlertCancelConfirm(
  draft: SwingAlertDraftFields,
  edit: boolean
): string | null {
  const dirty =
    draft.symbol || draft.entryPrice || draft.stop || draft.target || draft.image ? true : false;
  if (!dirty) return null;
  return `Are you sure you want to ${edit ? 'discard' : 'clear'} inputs for this alert?`;
}

/** `deleteSwingAlert`'s confirmation, verbatim including the shouted verb. Byte 1,984,720. */
export const SWING_ALERT_DELETE_CONFIRM = 'Are you sure you want to DELETE this alert?';

/** What `formatSwingAlertTxt` reads. The six fields of the payload it is given. */
export interface SwingAlertMirrorFields {
  symbol: string;
  direction: string;
  entryPrice: string;
  stop: string;
  target: string;
  image: string;
}

/**
 * `formatSwingAlertTxt` — the text of the message a swing alert posts into the MAIN alerts feed.
 *
 * Read verbatim in this session at byte 1,984,092:
 *
 * ```js
 * formatSwingAlertTxt(e) {
 *   let i = "#SwingTrade \n";
 *   return i += `${e.symbol} - ${e.direction} - Entry ${e.entryPrice} - Exit ${e.stop} - Target ${e.target}`,
 *          e.image && (i += `\n${e.image}`), i
 * }
 * ```
 *
 * Two things here look like typos and are not. **There is a space between `#SwingTrade` and the
 * newline** — `"#SwingTrade \n"`, not `"#SwingTrade\n"`. And **the stop value is labelled `Exit`**,
 * not `Stop`, even though the form's own label for that field is `Stop` and the table's header is
 * `Stop`. Both are the reference's, both are user-visible in the feed, and correcting either one
 * changes a string that presenters read every day. They stay.
 *
 * The image line is appended only when there is an image, and it is a bare `\n` — no space.
 */
export function formatSwingAlertTxt(alert: SwingAlertMirrorFields): string {
  let text = '#SwingTrade \n';
  text += `${alert.symbol} - ${alert.direction} - Entry ${alert.entryPrice} - Exit ${alert.stop} - Target ${alert.target}`;
  if (alert.image) text += `\n${alert.image}`;
  return text;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * The week-numbering year behind the row date's `YYYY` field.
 *
 * A week-numbering year is the calendar year of the Thursday in that date's week, which is why it
 * disagrees with the calendar year only for dates in the last days of December and the first days
 * of January. Computed rather than pulled from `Intl`, because `Intl.DateTimeFormat` exposes no
 * week-numbering-year field at all.
 *
 * **Honest bound.** The decode establishes that the format string is the literal
 * `YYYY-MM-dd hh:mm:ss` and that Angular's stock `DatePipe` consumes it (spec §3, bytes 1,937,378
 * and 164,283), and states that `YYYY` is the week-numbering year. Angular's own week-numbering
 * implementation was NOT read in this session, so the ISO-8601 Thursday rule is used here. If the
 * two ever disagree they can only do so for dates between roughly 29 December and 3 January.
 */
function weekNumberingYear(date: Date): number {
  const thursday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // `getDay()` is 0 on Sunday; ISO weeks run Monday (1) to Sunday (7).
  const isoDayOfWeek = thursday.getDay() === 0 ? 7 : thursday.getDay();
  thursday.setDate(thursday.getDate() + 4 - isoDayOfWeek);
  return thursday.getFullYear();
}

/**
 * The Alert Date cell — Angular's `date:'YYYY-MM-dd hh:mm:ss'`, byte 1,937,378.
 *
 * `hh` is the TWELVE-hour clock and the format string carries no `a` field, so no AM/PM marker is
 * emitted and midnight prints as `12`. That is the reference's output and not a bug to correct: a
 * 24-hour clock here would silently change every afternoon row.
 *
 * It is also the ONLY formatted field in the row. `entryPrice`, `stop` and `target` are bare
 * interpolations with no pipe, no `toFixed` and no currency, and they stay that way.
 */
export function formatSwingAlertDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const hour12 = date.getHours() % 12 === 0 ? 12 : date.getHours() % 12;
  return (
    `${weekNumberingYear(date)}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ` +
    `${pad2(hour12)}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
  );
}

/** What the CSV builder reads off a row. Narrower than the rendered row on purpose. */
export interface SwingAlertExportRow {
  symbol: string;
  direction: string;
  entryDate: string;
  entryPrice: string;
  stop: string;
  target: string;
  image: string;
  senderName: string;
}

/**
 * `downloadSwingTrades`'s header row, byte 1,985,151 — verbatim, INCLUDING the space between
 * `Sender` and the line break. Eight columns in the order the table and the row template use.
 */
export const SWING_TRADES_CSV_HEADER =
  'Symbol, Long/Short, Alert Date, Entry Price, Stop, Target, Image, Sender \r\n';

/**
 * `downloadSwingTrades`, byte 1,985,029.
 *
 * ## What the decode fixes, and the one thing it does not
 *
 * Fixed: the header verbatim, `"` around every field, `\r\n` after every row, the literal `n/a` for
 * a row whose image is empty after `?.trim()`, the exact `toLocaleTimeString` option bag, and a
 * per-row `try`/`catch` that logs rather than aborting the file.
 *
 * NOT fixed: the separator BETWEEN the quoted data fields. Spec §4 records the quoting and the row
 * terminator but does not quote a data row. `,` is taken from the header's own separator rather
 * than guessed at, and this comment is here so nobody later reads it as decoded.
 *
 * ## It ignores the search box and the limit box
 *
 * The reference iterates `globals.swingAlertsLog` directly, not the piped view, so the file is the
 * whole window regardless of what is on screen. Passing the filtered rows here would be a quiet
 * behaviour change in the direction of "what I expected".
 */
export function swingTradesCsv(rows: readonly SwingAlertExportRow[]): string {
  let csv = SWING_TRADES_CSV_HEADER;
  for (const row of rows) {
    try {
      const alertDate = new Date(row.entryDate).toLocaleTimeString('en-us', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const image = row.image?.trim() ? row.image.trim() : 'n/a';
      csv +=
        `"${row.symbol}","${row.direction}","${alertDate}","${row.entryPrice}",` +
        `"${row.stop}","${row.target}","${image}","${row.senderName}"\r\n`;
    } catch (error: unknown) {
      // Per row, and logged rather than swallowed — one unparseable date must not cost the file.
      console.error(error);
    }
  }
  return csv;
}

/** `` `SwingLog_${sessionID}.csv` `` — byte 1,985,725. */
export function swingTradesCsvFilename(sessionHandle: string): string {
  return `SwingLog_${sessionHandle}.csv`;
}

/** Blob type for the export, byte 1,985,725's neighbourhood. */
export const SWING_TRADES_CSV_MIME = 'text/csv;charset=utf-8';
