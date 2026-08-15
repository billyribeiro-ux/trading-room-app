import type { SwingAlertDirection, SwingAlertRow } from '$lib/types';

/**
 * `this.swingAlert` — the composer's model.
 *
 * Read verbatim from the field initialiser at bundle byte 1,955,146 and from
 * `clearSwingAlertFields` at 1,983,629. The two are byte-identical, which is what makes the reset
 * total: there is no field the form can leave dirty because "clear" and "initial" are the same
 * literal.
 *
 * ```js
 * this.swingAlert = { alertTxt:"", direction:"long", symbol:"", entryPrice:"", stop:"",
 *                     target:"", senderName:"", edit:!1, alertLogID:"", image:"", txtInAlerts:"" }
 * ```
 *
 * ## Which of those eleven fields survive here, and why the rest do not
 *
 * Five are inputs, one is the radio pair, one is the mode flag. The other four exist because the
 * reference has to re-find its own mirrored feed message by comparing formatted text:
 *
 *   - `alertTxt` is sent on the wire and is always `""` in practice — no template writes it;
 *   - `senderName` on the model is never read at all (byte 1,955,224), because the payload takes
 *     the value from `globals.user` instead;
 *   - `alertLogID` and `txtInAlerts` are the recovered id of the feed message and its old text,
 *     both filled by `editSwingAlert`'s scan of `globals.alertsLog` and both cleared to `""` after
 *     `editAlertMessageSwing` is sent.
 *
 * This room records the association as a real column (`swing_alerts.alert_id`) instead of scanning
 * for it, so those last three have nothing to hold and are deliberately absent rather than carried
 * as fields nothing reads. `swingAlertID` on the edit payload is what replaces them.
 */
export interface SwingAlertDraft {
  symbol: string;
  /** Defaults to `"long"`, from the initialiser above. */
  direction: SwingAlertDirection;
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
  swingAlertID: number | null;
}

/**
 * `clearSwingAlertFields()` — the empty model, and the ONLY way to build one.
 *
 * A function rather than an exported constant: a shared object literal would be mutated by the
 * first form that touched it, and every later reset would start from somebody else's typing.
 */
export function emptySwingAlertDraft(): SwingAlertDraft {
  return {
    symbol: '',
    direction: 'long',
    entryPrice: '',
    stop: '',
    target: '',
    image: '',
    edit: false,
    swingAlertID: null
  };
}

/**
 * `editSwingAlert(row)` — fill the composer from a log row.
 *
 * The reference spreads the WHOLE row (`this.swingAlert = {...row}`), so `_id`, `entryDate`,
 * `senderPic` and `senderAvt` ride along into the model. Only the six editable fields are copied
 * here, because those extras are read back from the row on the server rather than round-tripped
 * through the browser — a client that can send `entryDate` is a client that can backdate an alert.
 */
export function swingAlertDraftFrom(row: SwingAlertRow): SwingAlertDraft {
  return {
    symbol: row.symbol,
    direction: row.direction,
    entryPrice: row.entryPrice,
    stop: row.stop,
    target: row.target,
    image: row.image,
    edit: true,
    swingAlertID: row.id
  };
}
