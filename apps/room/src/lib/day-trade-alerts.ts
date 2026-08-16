/**
 * Day Trade Alerts — the gates, pipes, comparators and formatters, out of the template.
 *
 * A PORT of `swing-alerts.ts`, deliberately shaped the same way file for file, because two features
 * that render the same form and speak the same protocol are cheaper to maintain when they read the
 * same way. Where the two genuinely differ, the difference is named here with the byte offset it
 * was read at — because the differences are the whole risk of a port, and a silently normalised one
 * is invisible in review.
 *
 * Every value below is transcribed from `docs/decoded/day-trade-alerts.md`, and every offset quoted
 * was re-derived by opening `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`
 * (2,891,205 bytes) at that offset and reading the region in this session. Nothing is inferred;
 * where the decode is silent it says so.
 *
 * ## The six ways Day Trade is NOT Swing
 *
 * | | Swing | Day Trade | read at |
 * | --- | --- | --- | --- |
 * | gate flag | `hasSwingTradeAlerts` | `hasDayTradeAlerts` — no `Trade` doubling | 1,009,430 / 1,009,503 |
 * | months options | 1–20 (`zCe`) | 1–15 (`WCe`) | 1,916,549 / 1,916,648 |
 * | months default | 2 | 1 | 1,955,344 / 1,955,601 |
 * | months → days | `30 * months` | `4 * months * 7` | 1,993,612 / 1,993,637 |
 * | first fetch | `days: 42` | `days: 21` | 1,010,116 |
 * | search pipe | no optional chaining (`PCe`) | optional chaining at every hop (`ICe`) | 1,915,738 |
 *
 * And one way it is deliberately NOT different: {@link DAY_TRADE_ALERT_COMMANDS.mirrorEdit} is
 * `editAlertMessageSwing`, spelled with `Swing`, on the Day Trade path too.
 */

import { formatSwingAlertDate } from '#lib/swing-alerts.js';

/** The room settings this feature reads. Absent means unset, and unset means off. */
export interface DayTradeAlertsSessionFlags {
  /**
   * "Enable Day Trade Alerts Tab?" — the per-room entitlement, and the ONLY thing that decides
   * whether this feature exists at all.
   *
   * `this.hasDayTradeAlerts = this.appService.globals.sessData.hasDayTradeAlerts` in `ngOnInit`
   * (byte 1,955,967), gating BOTH the nav item and the pane:
   *
   * ```js
   * O(27, o.hasDayTradeAlerts ? 27 : -1)   // the <li>, JCe
   * O(49, o.hasDayTradeAlerts ? 49 : -1)   // the <div id="dayTradeAlerts">, Iwe
   * ```
   *
   * Read at bytes 2,016,951 and 2,017,748 in the host template's update block. `-1` is
   * `ɵɵconditional`'s "instantiate nothing", so a room without it emits neither element — not a
   * hidden one. That is why {@link dayTradeAlertsTabVisible} feeds a conditional block here rather
   * than a `hidden` attribute, unlike `hideFiles`, which really is bound to `hidden`.
   *
   * **Note the spelling.** The Swing flag is `hasSwingTradeAlerts` and this one is
   * `hasDayTradeAlerts` — no `Trade` in the middle. Both spellings are confirmed read, side by side
   * in `loadSessionLogs()` at bytes 1,009,430 and 1,009,503, and the asymmetry is upstream's.
   * `hasDayTradeTradeAlerts` names nothing.
   *
   * NOT presenter status. A member in a room with the setting on sees the tab, the heading, the
   * months select, the search box, the limit box, the download button and the whole table; what
   * presenter status gates is the form and the row buttons, separately, inside the pane.
   */
  hasDayTradeAlerts?: boolean;
}

/**
 * The entitlement gate, as a truthiness test because that is what `O(27, …)` performs.
 *
 * Read once from the room's configuration, exactly as the reference reads it once in `ngOnInit`.
 */
export function dayTradeAlertsTabVisible(session: DayTradeAlertsSessionFlags): boolean {
  return Boolean(session.hasDayTradeAlerts);
}

/**
 * The wire commands, named once so the client, the server and the contract test cannot drift.
 *
 * Every name below was read directly out of `main.d1d09071be31f1ba.js` in the session that wrote
 * this file — the submit path at byte 1,985,961 onwards, the weeks handler at 1,993,565.
 *
 * ## Trap 1 — the create command
 *
 * Create is `dayTradeAlertMsg`. It is **not** `newDayTradeAlertMsg`. That name is two OTHER things
 * and neither is a create: it is a payload KEY on `editDayTradeAlertMsg`
 * (`{ newDayTradeAlertMsg: h, dayTradeAlertID: … }`, byte 1,987,052), and it is the server→client
 * push that prepends a row (byte 1,018,739). The identifier occurs at exactly three offsets in the
 * whole bundle and **not one of them is a create**. {@link DAY_TRADE_ALERT_PUSH_COMMANDS} keeps the
 * push names beside these so the collision stays visible.
 *
 * ## Trap 2 — a submit sends TWO commands
 *
 * ```js
 * if (this.dayTradeAlert.edit) {
 *   sendServerCommand("editDayTradeAlertMsg", { newDayTradeAlertMsg: h, dayTradeAlertID: … });
 *   sendServerCommand("editAlertMessageSwing", { alertID: …, newAlertMsg: f, dayTradeAlert: !0, txt: … });
 *   this.dayTradeAlert.txtInAlerts = "";
 * } else {
 *   sendServerCommand("dayTradeAlertMsg", h);
 *   sendServerCommand("alertMsg", _);
 * }
 * ```
 *
 * A day trade alert is a row AND a message in the main alerts feed. {@link mirrorCreate} and
 * {@link mirrorEdit} are that second write. A rebuild that keeps only the row leaves the feed copy
 * orphaned the first time somebody edits.
 *
 * ## Trap 3 — `editAlertMessageSwing` is NOT renamed for Day Trade
 *
 * The literal occurs at exactly TWO offsets in the whole bundle — 1,983,136 (swing) and
 * **1,987,189 (day trade)** — and both spell it `…Swing`. The two payloads differ in one key and
 * nothing else:
 *
 * ```js
 * // 1,983,136
 * { alertID, newAlertMsg: f, swingTradeAlert: !0, txt }
 * // 1,987,189 — same command name
 * { alertID, newAlertMsg: f, dayTradeAlert:   !0, txt }
 * ```
 *
 * `editAlertMessageDayTrade` occurs at ZERO offsets. Inventing it by analogy produces a command
 * the server does not implement, and the failure names nothing.
 *
 * ## Trap 4 — the log command is never a quoted literal at its send site
 *
 * It is built as `` sendServerCommand(`get${e}AlertsLog`, …) `` with `e` of `"Swing"` or
 * `"DayTrade"` (byte 1,993,858), so searching the bundle for the string finds the handler at
 * 1,018,629 and not the caller. `getDayTradeAlertsLog` occurs exactly ONCE in the file, and that
 * one occurrence is the server→client case label.
 */
export const DAY_TRADE_ALERT_COMMANDS = {
  /** `getDayTradeAlertsLog` — `{ sessionID, days }`, built from `` `get${e}AlertsLog` ``. */
  log: 'getDayTradeAlertsLog',
  /** `dayTradeAlertMsg` — the alert object `h`. Byte 1,987,393. */
  create: 'dayTradeAlertMsg',
  /** `editDayTradeAlertMsg` — `{ newDayTradeAlertMsg: h, dayTradeAlertID }`. Byte 1,987,029. */
  edit: 'editDayTradeAlertMsg',
  /** `deleteDayTradeAlertMsg` — `{ dayTradeAlertID }`. Byte 1,989,017. */
  delete: 'deleteDayTradeAlertMsg',
  /** `alertMsg` — the mirrored feed message, create branch only. */
  mirrorCreate: 'alertMsg',
  /**
   * `editAlertMessageSwing` — the mirrored feed edit.
   *
   * Spelled with `Swing` ON THE DAY TRADE PATH. Not a copy-paste left over from the port: read at
   * byte 1,987,189 inside `onDayTradeAlertSubmit`'s edit branch. See Trap 3 above.
   */
  mirrorEdit: 'editAlertMessageSwing'
} as const;

/**
 * The server→client pushes, recorded because two of them share a name with a client→server command
 * and one of them is the name most easily mistaken for the create command.
 *
 * Nothing calls these today — this room answers its mutations directly rather than pushing — so
 * they are documentation of the protocol rather than a dispatch table, and are named in the
 * contract test for exactly the reason above.
 *
 * One asymmetry with Swing, read rather than assumed: the Swing `getSwingAlertsLog` case both logs
 * (`P("handleServerCmd got getSwingAlertsLog:", i)`) and emits on `appEventBus`; the Day Trade case
 * at byte 1,018,629 does neither. Its whole body is
 * `if (!i || !i.data) return; i.data.reverse(); this.globals.dayTradeAlertsLog = i.data;`.
 */
export const DAY_TRADE_ALERT_PUSH_COMMANDS = {
  /** Replaces the whole log: `data.reverse()`, then assign. Byte 1,018,629. */
  log: 'getDayTradeAlertsLog',
  /** PREPENDS `data.newDayTradeAlertMsg`. This is the only correct use of that name. */
  created: 'newDayTradeAlertMsg',
  /** Splices out `_id === data.dayTradeAlertID`. Byte 1,018,887. */
  deleted: 'deleteDayTradeAlertMsg',
  /**
   * Replaces `_id === data.dayTradeAlertID` with **`data.dayTradeAlertMsg`**. Byte 1,019,179.
   *
   * The request field is `newDayTradeAlertMsg` and the response field is `dayTradeAlertMsg`. The
   * two names differ on the same round trip, which is why both are written down.
   */
  edited: 'editDayTradeAlertMsg'
} as const;

/**
 * The months `<select>` — the integers 1 through 15, one `<option>` each.
 *
 * `WCe` at byte 1,916,648 is `() => [1,2,…,15]` and the repeater tracks by identity (`Li`, byte
 * 100,136). **Fifteen, not twenty.** The Swing twin `zCe` at 1,916,549 runs to 20; the two arrays
 * sit 99 bytes apart in the same const block and were read together. This is a value to carry
 * across, never one to share.
 */
export const DAY_TRADE_ALERT_MONTH_OPTIONS: readonly number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
];

/** `dayTradeAlertMonths` initialises to 1. Byte 1,955,601. Swing initialises to 2. */
export const DAY_TRADE_ALERT_DEFAULT_MONTHS = 1;

/** `dayTradeAlertLimit` initialises to 10. Byte 1,955,546 — the same as Swing's. */
export const DAY_TRADE_ALERT_DEFAULT_LIMIT = 10;

/**
 * The FIRST fetch asks for 21 days, not for `4 * dayTradeAlertMonths * 7`.
 *
 * `loadTradeAlerts(e)` at byte 1,010,116 builds `{ sessionID, days: 21 }` and then overrides it
 * only for Swing:
 *
 * ```js
 * let o = { sessionID: …, days: 21 }; "Swing" == e && (o.days = 42);
 * ```
 *
 * So 21 is the DEFAULT branch and 42 is the Swing special case — read in one expression, in both
 * arms of the linked-room `if`. With the select initialising to 1 month, the dropdown would ask for
 * 28; the first list is therefore 21 days of data under a label reading "Last 1 Months", and
 * changing the select once reconciles them.
 *
 * That is the reference's behaviour and it is reproduced rather than corrected: "fixing" it
 * silently changes which rows a room opens on.
 */
export const DAY_TRADE_ALERT_INITIAL_DAYS = 21;

/**
 * `onTradeAlertWeeksChange("DayTrade")` — months to days.
 *
 * Read verbatim at byte 1,993,565:
 *
 * ```js
 * const i = "Swing" === e ? 30 * this.swingAlertMonths : 4 * this.dayTradeAlertMonths * 7;
 * ```
 *
 * **`4 * months * 7`, written in that order, not `28 * months`.** The two are arithmetically equal
 * for integers and the expression is transcribed as it is written because that is what the source
 * says — the control is labelled "Months" and the arithmetic is four weeks, and preserving the
 * shape preserves the reason. Range at the bounds: 1 → 28 days, 15 → 420.
 *
 * Deliberately takes no "feature" argument, exactly as {@link swingAlertLogDays} does not: the two
 * multipliers differ, and a shared helper is a shared bug the day one of them changes.
 */
export function dayTradeAlertLogDays(months: number): number {
  return 4 * months * 7;
}

/**
 * The Show/entries limit — `limitDayTradeLogs`, class `OCe` at byte 1,916,037, `pure: !0`:
 *
 * ```js
 * transform(e,i){ return e && 0 !== i ? e.slice(0,i) : [] }
 * ```
 *
 * Byte-identical to `limitSwingLogs` (`RCe`, 1,915,541) and still a separate pipe class upstream,
 * so it is a separate function here.
 *
 * **A limit of 0 yields the EMPTY list, not the whole one.** That is the comparator's single
 * surprising property and the reason it is a named function with a test rather than a `.slice()`
 * at the call site: `slice(0, 0)` and "no limit" are the same expression away from each other, and
 * whoever writes `rows.slice(0, limit || rows.length)` has changed the behaviour of the box.
 */
export function limitDayTradeLogs<T>(
  rows: readonly T[] | null | undefined,
  limit: number
): readonly T[] {
  return rows && limit !== 0 ? rows.slice(0, limit) : [];
}

/**
 * The two fields `searchDayTradeLogs` dereferences.
 *
 * Both are optional here, and that is not defensive typing — it is what makes the optional chaining
 * below MEAN something instead of being unreachable syntax. The pipe upstream guards every hop, so
 * the type it is given has to admit the values those guards are for.
 */
interface DayTradeSearchable {
  symbol?: string | null;
  senderName?: string | null;
}

/**
 * The search box — `searchDayTradeLogs`, class `ICe` at byte 1,915,738, `pure: !0`:
 *
 * ```js
 * transform(e,i){ return e ? (i ? (i = i.toLowerCase(),
 *   e.filter(o => o?.symbol?.toLowerCase()?.includes(i)
 *              || o?.senderName?.toLowerCase()?.includes(i))) : e) : [] }
 * ```
 *
 * Symbol OR sender name, both lowercased, substring. An empty term returns the list unfiltered —
 * it does not return `[]`, which is what the outer ternary is for.
 *
 * ## The optional chaining is the difference, and it is reproduced rather than normalised
 *
 * `searchSwingLogs` (`PCe`, byte 1,915,251) dereferences `o.symbol` and `o.senderName` directly;
 * this one guards the row, the field AND the `toLowerCase()` result. The two pipe classes sit 487
 * bytes apart in the same module and were read side by side in this session, so the difference is a
 * read fact rather than a transcription slip.
 *
 * Normalising the two — in either direction — would be quietly choosing one component's behaviour
 * for the other. Here it means this pipe survives a row that Swing's would throw on, which is the
 * upstream behaviour and is strictly the safer of the two to reproduce.
 */
export function searchDayTradeLogs<T extends DayTradeSearchable>(
  rows: readonly T[] | null | undefined,
  term: string
): readonly T[] {
  if (!rows) return [];
  if (!term) return rows;
  const needle = term.toLowerCase();
  return rows.filter(
    (row) =>
      row?.symbol?.toLowerCase()?.includes(needle) ||
      row?.senderName?.toLowerCase()?.includes(needle)
  );
}

/** The five text fields of the form, as `onDayTradeAlertSubmit` reads them before trimming. */
export interface DayTradeAlertDraftFields {
  symbol: string;
  entryPrice: string;
  stop: string;
  target: string;
  image: string;
}

/**
 * `onDayTradeAlertSubmit`'s validation, byte 1,985,961 — the combined guard, then the per-field
 * ones.
 *
 * Every string is verbatim, read in this session, including the quotes around the field names and
 * the comma after "Please". Character for character identical to Swing's four (byte 1,981,965);
 * the guard literal `Please, fill in required fields.` occurs at 1,986,127 for Day Trade and
 * 1,982,116 for Swing. Returns `null` when the draft may be submitted.
 *
 * The order matters and is the reference's: the combined guard tests the RAW values for falsiness
 * first, so a form filled entirely with spaces gets the per-field message rather than the generic
 * one. `image` is trimmed alongside the others and is never validated, and `direction` is checked
 * by neither — the model default `"long"` means the payload always carries one.
 */
export function dayTradeAlertSubmitError(draft: DayTradeAlertDraftFields): string | null {
  if (!draft.symbol || !draft.entryPrice || !draft.stop || !draft.target) {
    return 'Please, fill in required fields.';
  }
  if (!draft.symbol.trim()) return 'Please, fill in "symbol" field.';
  if (!draft.entryPrice.trim()) return 'Please, fill in "entry price" field.';
  if (!draft.stop.trim()) return 'Please, fill in "stop" field.';
  if (!draft.target.trim()) return 'Please, fill in "target" field.';
  return null;
}

/** The confirmation shown once the draft validates. Byte 1,986,691. */
export function dayTradeAlertSubmitConfirm(edit: boolean): string {
  return `Are you sure you want to ${edit ? 'save' : 'send'} this alert?`;
}

/**
 * `onDayTradeAlertCancel`, byte 1,987,875.
 *
 * Returns `null` when EVERY field is empty, and the button then does nothing at all — no dialog,
 * no reset. That is not an oversight to smooth over: the guard is
 * `(symbol || entryPrice || stop || target || image) && bootbox.confirm(…)`, so a pristine form
 * has nothing to discard and says nothing. `direction` is not in the check, so a form where only
 * the radio was touched is still pristine.
 *
 * The reference's confirm callback does one thing more than Swing's — it reassigns
 * `globals.dayTradeAlertsLog = [...globals.dayTradeAlertsLog]` (byte 1,988,188). That is an
 * Angular change-detection nudge for an array nothing changed, and it has no counterpart here: the
 * list is `$state.raw` owned by the page and the composer's reset does not touch it. Recorded
 * rather than transcribed into a no-op assignment.
 */
export function dayTradeAlertCancelConfirm(
  draft: DayTradeAlertDraftFields,
  edit: boolean
): string | null {
  const dirty =
    draft.symbol || draft.entryPrice || draft.stop || draft.target || draft.image ? true : false;
  if (!dirty) return null;
  return `Are you sure you want to ${edit ? 'discard' : 'clear'} inputs for this alert?`;
}

/** `deleteDayTradeAlert`'s confirmation, verbatim including the shouted verb. Byte 1,988,927. */
export const DAY_TRADE_ALERT_DELETE_CONFIRM = 'Are you sure you want to DELETE this alert?';

/** What `formatDayTradeAlertTxt` reads. The six fields of the payload it is given. */
export interface DayTradeAlertMirrorFields {
  symbol: string;
  direction: string;
  entryPrice: string;
  stop: string;
  target: string;
  image: string;
}

/**
 * `formatDayTradeAlertTxt` — the text of the message a day trade alert posts into the MAIN alerts
 * feed.
 *
 * Read verbatim in this session at byte 1,988,280:
 *
 * ```js
 * formatDayTradeAlertTxt(e) {
 *   let i = "#DayTrade \n";
 *   return i += `${e.symbol} - ${e.direction} - Entry ${e.entryPrice} - Exit ${e.stop} - Target ${e.target}`,
 *          e.image && (i += `\n${e.image}`), i
 * }
 * ```
 *
 * Three things here look like typos and none is. **There is a space between `#DayTrade` and the
 * newline** — `"#DayTrade \n"`, not `"#DayTrade\n"`. **The stop value is labelled `Exit`**, not
 * `Stop`, even though the form's own label for that field is `Stop` and the table's header is
 * `Stop`. And the hashtag is `#DayTrade`, one word, while the Swing one is `#SwingTrade` — so this
 * is not "the swing string with a word swapped", it is its own literal.
 *
 * All three are the reference's, all three are user-visible in the feed, and correcting any of them
 * changes a string that presenters read every day. They stay.
 *
 * The image line is appended only when there is an image, and it is a bare `\n` — no space.
 */
export function formatDayTradeAlertTxt(alert: DayTradeAlertMirrorFields): string {
  let text = '#DayTrade \n';
  text += `${alert.symbol} - ${alert.direction} - Entry ${alert.entryPrice} - Exit ${alert.stop} - Target ${alert.target}`;
  if (alert.image) text += `\n${alert.image}`;
  return text;
}

/**
 * The Alert Date cell — Angular's `date:'YYYY-MM-dd hh:mm:ss'`, byte 1,943,736.
 *
 * ## Why this is a re-export and not a second implementation
 *
 * Both row templates call the SAME pipe. `_we` (swing) and `Pwe` (day trade, byte 1,943,242) each
 * emit `Xe(n,"date")` and pass the identical format string — read at bytes 1,937,391 and 1,943,736,
 * character for character the same 19 characters — and the class registered under the pipe name
 * `date` is Angular's stock `DatePipe`, whose body begins at byte 164,283 and whose registration
 * `Rn({name:"date",type:t,pure:!0,standalone:!0})` is at byte 164,709. One implementation,
 * framework-provided, shared by both features.
 *
 * That is exactly the opposite of the search and limit pipes, which are FOUR distinct classes
 * upstream (`PCe`/`ICe`, `RCe`/`OCe`) and are therefore four functions here. The rule this file
 * follows is: duplicate what the reference duplicates, share what the reference shares. Copying the
 * week-numbering-year computation into a second file would create two places to be wrong about a
 * date that differs from the calendar year only between roughly 29 December and 3 January — which
 * is the kind of divergence nobody notices until January.
 *
 * `hh` is the TWELVE-hour clock and the format string carries no `a` field, so no AM/PM marker is
 * emitted and midnight prints as `12`. It is also the ONLY formatted field in the row:
 * `entryPrice`, `stop` and `target` are bare interpolations with no pipe, no `toFixed` and no
 * currency, and they stay that way.
 */
export const formatDayTradeAlertDate = formatSwingAlertDate;

/** What the CSV builder reads off a row. Narrower than the rendered row on purpose. */
export interface DayTradeAlertExportRow {
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
 * `downloadDayTrades`'s header row, byte 1,989,356 — verbatim, INCLUDING the space between
 * `Sender` and the line break. Eight columns in the order the table and the row template use.
 *
 * Character for character the same text as Swing's, and still its own literal in its own method
 * upstream (`downloadSwingTrades` at 1,985,029, `downloadDayTrades` at 1,989,236), which is why it
 * is written out again here rather than imported.
 */
export const DAY_TRADES_CSV_HEADER =
  'Symbol, Long/Short, Alert Date, Entry Price, Stop, Target, Image, Sender \r\n';

/**
 * `downloadDayTrades`, byte 1,989,236 — read end to end in this session.
 *
 * ## What the decode fixes, and the one thing it does not
 *
 * Fixed: the header verbatim, `"` around every field, `\r\n` after every row, the literal `n/a` for
 * a row whose image is empty after `?.trim()`, the exact `toLocaleTimeString` option bag, and a
 * per-row `try`/`catch` that logs rather than aborting the file.
 *
 * NOT fixed: the separator BETWEEN the quoted data fields. The decode records the quoting and the
 * row terminator but the source builds the row by concatenation, so `,` is taken from the header's
 * own separator rather than guessed at, and this comment is here so nobody later reads it as
 * decoded.
 *
 * ## It ignores the search box and the limit box
 *
 * The reference iterates `globals.dayTradeAlertsLog` directly, not the piped view, so the file is
 * the whole window regardless of what is on screen. Passing the filtered rows here would be a quiet
 * behaviour change in the direction of "what I expected".
 */
export function dayTradesCsv(rows: readonly DayTradeAlertExportRow[]): string {
  let csv = DAY_TRADES_CSV_HEADER;
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

/**
 * `` `DayTradeLog_${sessionID}.csv` `` — byte 1,989,936.
 *
 * `DayTradeLog_`, not `DayTradesLog_` and not `DayTradeAlertsLog_`. The Swing twin is `SwingLog_`
 * (byte 1,985,725), which is the shorter of the two names, so neither can be derived from the
 * other by rule.
 */
export function dayTradesCsvFilename(sessionHandle: string): string {
  return `DayTradeLog_${sessionHandle}.csv`;
}

/** Blob type for the export, byte 1,989,827. */
export const DAY_TRADES_CSV_MIME = 'text/csv;charset=utf-8';
