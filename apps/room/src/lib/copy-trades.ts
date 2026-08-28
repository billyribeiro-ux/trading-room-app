/**
 * "Copy trades" — the `[{( … )}]` marker in an alert becomes one click-to-copy order.
 *
 * ## The transcription
 *
 * Three sites, and the third is the one that is easy to miss.
 *
 * **The rewrite**, byte 1,414,924, inside `filterChatMessages`:
 *
 * ```js
 * sessData.copyTrades && "alerts" === i && e && e.length > 0 && (e = e.map(o => (
 *   o.txt.includes("[{(") && o.txt.includes(")}]") && (
 *     o.txt = o.txt.replace("[{(", '<span class="tradeColor" id="id_' + o._id + '">'),
 *     o.txt = o.txt.replace(")}]", "</span>")), o)))
 * ```
 *
 * **The click**, immediately after it:
 *
 * ```js
 * copyTradeOnClick(e, i) {
 *   const o = e.target;
 *   "SPAN" === o.tagName && o.classList?.contains("tradeColor") && o.id === i &&
 *     (this.doTradeCopy(i), e.stopPropagation())
 * }
 * doTradeCopy(e) {
 *   const i = document.getElementById(e);
 *   if (i) { const o = i.textContent || "";
 *     navigator.clipboard.writeText(o).then(() => { … bootbox.alert("Order copied to clipboard.") }) }
 * }
 * ```
 *
 * **The component swap**, byte 1,419,447 — `app-roomscroller`'s whole template is
 * `O(0, sessData.copyTrades ? 0 : 1)` between two identical row lists whose consts differ by one
 * thing: `[3,"msg","isP","logType","prevD"]` versus `[3,"click","msg","isP","logType","prevD"]`.
 * **The only difference the setting makes to the scroller is whether rows carry a click handler.**
 * The same two-way appears again in the Q&A modal at byte 2,332,058.
 *
 * ## ALERTS ONLY
 *
 * `"alerts" === i` is part of the gate. A `[{( … )}]` typed into CHAT stays literal text, exactly as
 * `#label` substitution does — and for the same reason: the transform runs on one log and not the
 * other. Passing the flag through and filtering at the render site would have been the easy mistake.
 *
 * ## ONE GROUP UPSTREAM, ALL OF THEM HERE — a divergence, and it is the `String.replace` family again
 *
 * `.replace("[{(", …)` and `.replace(")}]", …)` take STRING patterns, so each replaces the FIRST
 * occurrence only. In `A [{(x)}] B [{(y)}] C` upstream produces `A <span>x</span> B [{(y)}] C`: the
 * second order is left as literal punctuation and cannot be copied. This function splits every
 * balanced pair.
 *
 * That is a divergence rather than a transcription, and it is the second `String.replace`
 * first-occurrence defect found in this bundle today — the first was `playChatMessageSoundFor`.
 *
 * ## Why segments rather than an HTML string
 *
 * The reference builds `<span class="tradeColor" id="id_…">` INTO the message text and renders the
 * result through `bypassSecurityTrustHtml`. This room never turns message text into markup —
 * `parseBodySegments` exists for exactly that reason — so the marker becomes a structured segment
 * and the span is a real element. The rendered DOM is the same and the message body can never be
 * parsed as HTML on the way.
 */

/** The open and close markers, verbatim from the capture. */
export const TRADE_OPEN = '[{(';
export const TRADE_CLOSE = ')}]';

export interface TradeSplitPiece {
  /** `trade` is a copyable order; `text` is everything around one. */
  readonly kind: 'trade' | 'text';
  readonly text: string;
}

/**
 * Split a body into copyable orders and the text between them.
 *
 * Returns a single `text` piece when the body holds no balanced pair, which is the common case and
 * is the same answer the reference's `includes()` guard produces.
 */
export function splitTradeOrders(body: string): TradeSplitPiece[] {
  const pieces: TradeSplitPiece[] = [];
  let cursor = 0;

  for (;;) {
    const open = body.indexOf(TRADE_OPEN, cursor);
    if (open === -1) break;
    const close = body.indexOf(TRADE_CLOSE, open + TRADE_OPEN.length);
    /*
      An unbalanced opener is TEXT, not an order that runs to the end of the message. Upstream's
      `includes("[{(") && includes(")}]")` refuses the same case — though only for the message as a
      whole — and copying half an order silently would be worse than not offering to.
    */
    if (close === -1) break;

    if (open > cursor) pieces.push({ kind: 'text', text: body.slice(cursor, open) });
    pieces.push({ kind: 'trade', text: body.slice(open + TRADE_OPEN.length, close) });
    cursor = close + TRADE_CLOSE.length;
  }

  if (cursor < body.length) pieces.push({ kind: 'text', text: body.slice(cursor) });
  return pieces.length > 0 ? pieces : [{ kind: 'text', text: body }];
}

/**
 * `id="id_" + msg._id` — the element id the reference gives each order.
 *
 * Reproduced because it is what `doTradeCopy` looks up and what `copyTradeOnClick` compares against,
 * and because an id in captured markup is the kind of thing another surface may already select on.
 * A message with more than one order gets a suffix, which upstream never needs: it only ever
 * rewrites one.
 */
export function tradeOrderId(messageId: number | string, index: number): string {
  return index === 0 ? `id_${messageId}` : `id_${messageId}_${index}`;
}
