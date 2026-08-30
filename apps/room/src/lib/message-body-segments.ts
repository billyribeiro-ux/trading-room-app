import { splitAlertLabels, type AlertLabel } from '#lib/alert-labels.js';
import type { FollowChatStyle } from '#lib/types.js';
import { splitTradeOrders, tradeOrderId } from '#lib/copy-trades.js';

/**
 * `parseSymbols`, `parseLinks` and `parseStock` — the reference's three body PIPES, in one module.
 *
 * ## Why a module and not part of the component
 *
 * Because upstream they are pipes, which is Angular's word for exactly this: a pure transform of
 * one string, reused by every template that renders a body. `RoomMessage.svelte` had all three
 * inline, so the only way to ask what `foo$AAPL` produces was to render a whole message row with a
 * dozen props and read the markup back out. That is a slow, indirect test of a pure function, and
 * `source-size-contract` is what forced the question: the component crossed its ceiling and the
 * seam the REFERENCE draws was sitting right there.
 *
 * The three run in a fixed order and the order is the capture's, not a preference — see
 * {@link parseBodySegments}.
 *
 * ## What did NOT come with them
 *
 * `isMutedGif` and `revealedGifs` stayed in the component. Muting a gif is a rendering decision
 * made from a preference and a click, not a property of the text; the parser's job ends at "this
 * segment is an image".
 */

/**
 * Everything the three passes read besides the string itself.
 *
 * One object rather than four positional parameters, because three of them are booleans and a
 * lookup — `parseBodySegments(text, 'chat', [], true, 4)` is a call nobody can read and every
 * caller can get wrong in silence.
 */
export interface BodySegmentContext {
  /** `"alerts" === i` in the reference — the label and trade passes run on ALERTS only. */
  readonly kind: 'alert' | 'chat';
  /** The message's own id, which is what `id_<messageId>` on a trade span is built from. */
  readonly messageId: number;
  /** `globals.alertLabels`, or empty when the room has none or the row is a Q&A message. */
  readonly alertLabels: readonly AlertLabel[];
  /** `copyTradeOnClick` — the room setting that turns `[{( … )}]` into a clickable span. */
  readonly copyTrades: boolean;
}

/**
 * The URL pattern from the capture's `parseLinks` pipe, verbatim:
 *
 * ```js
 * e.replace(/((http|https|ftp):\/\/[\w?=&.@\/-;#~%-]+(?![\w\s?&.@\/;#~%"=-]*>))/gi,
 *           r => this.urlwrapImg(r, i, o, s))
 * ```
 *
 * `\/-;` inside the class is a RANGE - `/` (0x2F) through `;` (0x3B) - so it also admits digits
 * and `:`. Copied as written rather than "tidied", because narrowing it would stop matching URLs
 * the real room links today.
 */
/*
  The name is the reason: this is the reference's own linkifier, reproduced character for
  character. Its `\/` escapes inside the character classes are redundant to a regex engine, and
  tidying them would make this no longer a transcription — including the `\/-;` run, which a
  reader should notice is a RANGE from `/` to `;` rather than three literals. That is upstream's,
  and it is reproduced rather than corrected.
*/
// eslint-disable-next-line no-useless-escape
const CAPTURED_URL = /((http|https|ftp):\/\/[\w?=&.@\/-;#~%-]+(?![\w\s?&.@\/;#~%"=-]*>))/gi;

/** `urlwrapImg` renders these inline instead of as an anchor. */
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.jfif'];

export type BodySegment = {
  kind: 'text' | 'stock' | 'link' | 'image' | 'label' | 'trade';
  text: string;
  url?: string;
  label?: AlertLabel;
  /**
   * `trade` only — the element id `doTradeCopy` looks up, `id_<messageId>` for the first order.
   *
   * The order's own text lives in `children`, not in `text`, because the reference leaves the
   * span's CONTENT to the later pipes: a `$TICKER` inside an order is still coloured. So a trade
   * segment wraps segments rather than carrying a string.
   */
  tradeId?: string;
  children?: BodySegment[];
};

/**
 * Splits a message body into tickers, links, inline images and plain text.
 *
 * Links were not parsed at all - a pasted URL rendered as dead text. The capture wraps each one
 * as `<a href target="_blank" class="linkColor" onclick="event.stopPropagation()">`; the
 * `stopPropagation` matters because the message row itself is clickable, so without it opening a
 * link would also fire the row's own handler.
 *
 * Built as segments rather than an HTML string. The capture pipes through
 * `bypassSecurityTrustHtml` and leans on DOMPurify to make that safe; emitting real elements
 * means the message text can never be parsed as markup in the first place, and the rendered DOM
 * is the same.
 *
 * ## Alert Labels, then tickers and links — and that ORDER is the capture's, not a preference
 *
 * `parseSymbols` (bundle byte 1,326,855) substitutes its labels into the string FIRST and only
 * then hands the result to `parseStock`, so the `$` pass only ever sees text the label pass has
 * already rewritten. Running them the other way round would let a ticker match inside a label.
 *
 * `"alerts" === i` in that transform is the whole reason `kind` is consulted here: the same pipe
 * runs over the chat log and substitutes nothing there, so a `#DayTrade` typed in chat stays
 * literal text. Passing the labels in unconditionally and filtering at the badge would have been
 * the easy mistake.
 */
export function parseBodySegments(value: string, context: BodySegmentContext): BodySegment[] {
  /*
    TRADE ORDERS FIRST, and the order of these passes is the capture's.

    `filterChatMessages` rewrites `[{( … )}]` into a span BEFORE the message reaches the renderer,
    so `parseSymbols` and `parseStock` run over the already-wrapped string and colour tickers
    INSIDE an order. Splitting orders last would put a `$TICKER` and an order in competition for
    the same characters.

    `kind === 'alert'` is part of the reference's gate (`"alerts" === i`), not an optimisation: a
    `[{( … )}]` typed into chat stays literal, exactly as a `#label` does.
  */
  const pieces =
    context.copyTrades && context.kind === 'alert'
      ? splitTradeOrders(value)
      : [{ kind: 'text' as const, text: value }];

  return pieces.flatMap<BodySegment>((piece, index) =>
    piece.kind === 'trade'
      ? [
          {
            kind: 'trade',
            text: piece.text,
            tradeId: tradeOrderId(context.messageId, index),
            /*
              `false`, always, and it is a fact about the reference rather than a simplification:
              upstream a trade order has ALREADY been wrapped in `<span class="tradeColor" …>` by
              `filterChatMessages` before `parseStock` ever runs, so the first character of its
              text is preceded by that tag's `>`. See the guard in `parseTickersAndLinks`.
            */
            children: parseLabelsTickersAndLinks(piece.text, false, context)
          }
        ]
      : parseLabelsTickersAndLinks(piece.text, index === 0, context)
  );
}

function parseLabelsTickersAndLinks(
  value: string,
  atBodyStart: boolean,
  context: BodySegmentContext
): BodySegment[] {
  const labelled =
    context.kind === 'alert' && context.alertLabels.length > 0
      ? splitAlertLabels(value, context.alertLabels)
      : [{ kind: 'text' as const, text: value }];

  return labelled.flatMap<BodySegment>((piece, index) =>
    piece.kind === 'label'
      ? [{ kind: 'label', text: piece.text, label: piece.label }]
      : parseTickersAndLinks(piece.text, atBodyStart && index === 0)
  );
}

/**
 * ── RM-06 — A TICKER IS ONLY A TICKER AT A WORD BOUNDARY ─────────────────────────────────────
 *
 * `parseStock` (bundle byte 1,327,300) refuses the substitution outright for a match that is not
 * at the start of the body and does not begin with a space:
 *
 * ```js
 * var a = e.indexOf(r);
 * if (!(a > 0 && " " != e.charAt(a))) { … }
 * ```
 *
 * `r` is the match INCLUDING whatever `\s*` swallowed in front of it, so `e.charAt(a)` is the
 * match's own first character. The rule that falls out is: colour it when the body starts with
 * it, or when a literal space precedes it — and leave `foo$AAPL`, `($AAPL` and a tab-indented
 * `\t$AAPL` as plain text. We coloured all of them.
 *
 * `atBodyStart` is threaded rather than measured because upstream runs over ONE string that the
 * label and trade passes have already rewritten into markup: a ticker at offset 0 of a later
 * piece sits immediately after a `>` there, which is not a space, so those pieces are `false` and
 * the two implementations agree character for character.
 *
 * ## WHAT WE DELIBERATELY DO NOT REPRODUCE, because it is a defect rather than a rule
 *
 * `a` is `e.indexOf(r)` — the FIRST occurrence of the matched text anywhere in the body, not the
 * position of this particular match — and `e.replace(r, …)` then rewrites that same first
 * occurrence. So upstream ` $AAPL foo $AAPL` decides both matches from position 0 and, on the
 * second pass, substitutes INSIDE the span the first pass produced, nesting one `stockColor` span
 * in another. Matching that would mean reproducing a bug whose only visible effect is malformed
 * markup; the positional RULE above is reproduced, the aliasing is not, and this paragraph is
 * here so the next comparison against the bundle reads it as a decision rather than a miss.
 */
function parseTickersAndLinks(value: string, atBodyStart: boolean): BodySegment[] {
  const segments: BodySegment[] = [];

  let offset = 0;
  for (const chunk of value.split(/(\s*\$[A-Za-z_?]+\b)/g)) {
    const at = offset;
    offset += chunk.length;
    if (!chunk) continue;

    if (
      /^\s*\$[A-Za-z_?]+\b$/.test(chunk) &&
      (chunk.startsWith(' ') || (atBodyStart && at === 0))
    ) {
      segments.push({ kind: 'stock', text: chunk });
      continue;
    }

    let cursor = 0;
    for (const match of chunk.matchAll(CAPTURED_URL)) {
      const at = match.index ?? 0;
      if (at > cursor) segments.push({ kind: 'text', text: chunk.slice(cursor, at) });
      const url = match[0];
      const lower = url.toLowerCase();
      segments.push({
        kind: IMAGE_EXTENSIONS.some((extension) => lower.includes(extension)) ? 'image' : 'link',
        text: url,
        url
      });
      cursor = at + url.length;
    }
    if (cursor < chunk.length) segments.push({ kind: 'text', text: chunk.slice(cursor) });
  }

  return segments;
}

/**
 * ── RM-21 — THE TICKER HAS ITS OWN PRECEDENCE, and it is not the body's ──────────────────────
 *
 * `parseStock` (bundle byte 1,327,180) resolves the ticker colour from localStorage itself, and
 * its two branches read DIFFERENT sources from the ones the body style resolves through:
 *
 * ```js
 * if ("chat" === i) {
 *   const l = localStorage.getItem("chatStyle"), c = localStorage.getItem("followedUsers");
 *   … h[o] ? h[o].followChatStyle.tickerColor : l ? JSON.parse(l).tickerColor : <bare span>
 * }
 * if ("alerts" === i) {                              // byte 1,327,851
 *   const l = localStorage.getItem("alertStyle");
 *   l ? JSON.parse(l).tickerColor : <bare span>
 * }
 * ```
 *
 * Two things follow, and this had neither. On the ALERTS log the followed-user style is not
 * consulted at all and a ROOM style is — so every `$TICKER` in every alert rendered here as a
 * bare `stockColor` span, on the surface where a ticker is the point of the message. And on CHAT
 * the room style applies whether or not the message carries a background of its own, because
 * `parseStock` never reads `msg.bkgColor`, while `RoomMessage`'s `effectiveStyle` drops to
 * `undefined` for exactly that case — correctly, because that gate belongs to the BOX. Reading the
 * box's gate for the ticker is what left a coloured message's tickers bare.
 *
 * The bare-span fallback is kept and is upstream's: when neither store holds a style the span
 * carries the class and no inline colour, and the stylesheet decides.
 *
 * ## The alert branch reads `chatStyle`, and that is a RECORDED GAP rather than a shortcut
 *
 * Upstream `alertStyle` is a separately persisted preference — `saveAlertStyle` (byte 2,242,440)
 * writes the `alertStyle` localStorage key, `resetAlertStyle` removes it. Its DEFAULT is
 * byte-identical to the chat one: `globals.alertStyle` (byte 980,310) is the same five values as
 * `globals.chatStyle` immediately above it, which is the fact `chat-style.ts` already records.
 * This repository has no alert-style editor, so nothing here can ever make the two differ, and a
 * prop nothing feeds is the defect `unfed-props-contract` exists to catch. When that pane lands
 * this is the one expression that changes: give it its own prop and read it on the alert branch.
 *
 * The captured-row exclusion is applied by the CALLER, not here: "this row is captured DOM, do not
 * repaint it" is a fact about `RoomMessage`'s evidence props, and the reference's pipe has no such
 * notion. A pure transform of a style pair is what this is.
 */
export function tickerColorStyle(input: {
  readonly kind: 'alert' | 'chat';
  readonly chatStyle?: FollowChatStyle;
  readonly followedStyle?: FollowChatStyle;
}): string | undefined {
  const style = input.kind === 'alert' ? input.chatStyle : (input.followedStyle ?? input.chatStyle);
  return style ? `color: ${style.tickerColor};` : undefined;
}
