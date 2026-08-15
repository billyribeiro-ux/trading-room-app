import type { DayTradeAlertDirection, DayTradeAlertRow } from '$lib/types';

/**
 * `this.dayTradeAlert` — the composer's model.
 *
 * Read verbatim from the field initialiser at bundle byte 1,955,394 and from
 * `clearDayTradeAlertFields` at 1,987,696. The two are character-identical, which is what makes the
 * reset total: there is no field the form can leave dirty because "clear" and "initial" are the
 * same literal.
 *
 * ```js
 * this.dayTradeAlert = { alertTxt:"", direction:"long", symbol:"", entryPrice:"", stop:"",
 *                        target:"", senderName:"", edit:!1, alertLogID:"", image:"", txtInAlerts:"" }
 * ```
 *
 * It is also field-for-field identical to `this.swingAlert` (byte 1,955,146) — same eleven keys,
 * same order, same `direction: "long"` default. The two models were read side by side, 248 bytes
 * apart in the same constructor, so the sameness is a read fact and not an assumption from the
 * port.
 *
 * ## Which of those eleven fields survive here, and why the rest do not
 *
 * Five are inputs, one is the radio pair, one is the mode flag. The other four exist because the
 * reference has to re-find its own mirrored feed message by comparing formatted text:
 *
 *   - `alertTxt` is sent on the wire and is always `""` in practice — the complete set of
 *     `dayTradeAlert-*` ids in the consts array is `symbol`, `entryPrice`, `stop`, `target`,
 *     `image`, `direction`, `long`, `short`, `limit`, `search`, and `alertTxt` is not among them,
 *     so no template writes it;
 *   - `senderName` on the model is never read at all, because the payload takes the value from
 *     `globals.user.nick || globals.user.name` instead;
 *   - `alertLogID` and `txtInAlerts` are the recovered id of the feed message and its old text,
 *     both filled by `editDayTradeAlert`'s scan of `globals.alertsLog` and both cleared after
 *     `editAlertMessageSwing` is sent (byte 1,987,319).
 *
 * This room records the association as a real column (`day_trade_alerts.alert_id`) instead of
 * scanning for it, so those last three have nothing to hold and are deliberately absent rather than
 * carried as fields nothing reads. `dayTradeAlertID` on the edit payload is what replaces them.
 *
 * That is worth more here than it is on the Swing side, because the Day Trade scan is WORSE: its
 * loop has no `break` (byte 1,988,461), so it walks the whole feed and the LAST match wins, where
 * Swing's breaks on the first. Neither behaviour is reproduced, because neither is reachable once
 * the id is a column.
 */
export interface DayTradeAlertDraft {
  symbol: string;
  /** Defaults to `"long"`, from the initialiser above. */
  direction: DayTradeAlertDirection;
  entryPrice: string;
  stop: string;
  target: string;
  image: string;
  /** The mode flag. `true` swaps both button labels and makes submit an edit. */
  edit: boolean;
  /**
   * Which row is being edited, or `null` when composing a new one.
   *
   * The reference keeps `_id` on the spread row; here it is explicit, so "is this an edit" and
   * "which row" cannot disagree — `edit === true` with no id is unrepresentable in practice
   * because both are written by the same two functions below.
   */
  dayTradeAlertID: number | null;
}

/**
 * `clearDayTradeAlertFields()` — the empty model, and the ONLY way to build one.
 *
 * A function rather than an exported constant: a shared object literal would be mutated by the
 * first form that touched it, and every later reset would start from somebody else's typing.
 */
export function emptyDayTradeAlertDraft(): DayTradeAlertDraft {
  return {
    symbol: '',
    direction: 'long',
    entryPrice: '',
    stop: '',
    target: '',
    image: '',
    edit: false,
    dayTradeAlertID: null
  };
}

/**
 * `editDayTradeAlert(row)` — fill the composer from a log row.
 *
 * The reference spreads the WHOLE row (`i.dayTradeAlert = {...e}`, byte 1,988,461), so `_id`,
 * `entryDate`, `senderPic` and `senderAvt` ride along into the model. Only the six editable fields
 * are copied here, because those extras are read back from the row on the server rather than
 * round-tripped through the browser — a client that can send `entryDate` is a client that can
 * backdate an alert.
 */
export function dayTradeAlertDraftFrom(row: DayTradeAlertRow): DayTradeAlertDraft {
  return {
    symbol: row.symbol,
    direction: row.direction,
    entryPrice: row.entryPrice,
    stop: row.stop,
    target: row.target,
    image: row.image,
    edit: true,
    dayTradeAlertID: row.id
  };
}
