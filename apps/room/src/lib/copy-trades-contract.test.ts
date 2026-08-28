import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { TRADE_CLOSE, TRADE_OPEN, splitTradeOrders, tradeOrderId } from './copy-trades.js';

/**
 * "Copy trades" — `[{( … )}]` in an ALERT becomes one click-to-copy order.
 *
 * Rewrite at bundle byte 1,414,924, `copyTradeOnClick`/`doTradeCopy` beside it, and the scroller's
 * entire template at 1,419,447 is `O(0, sessData.copyTrades ? 0 : 1)` between two row lists whose
 * consts differ by exactly one thing: a `click` binding. `copy-trades.ts` carries the argument.
 */
describe('splitTradeOrders', () => {
  it('leaves a body with no marker as one piece of text', () => {
    expect(splitTradeOrders('just an alert')).toEqual([{ kind: 'text', text: 'just an alert' }]);
  });

  it('splits one order out of its surrounding text', () => {
    expect(splitTradeOrders(`BTO ${TRADE_OPEN}AAPL 150C 8/30 @ 1.25${TRADE_CLOSE} now`)).toEqual([
      { kind: 'text', text: 'BTO ' },
      { kind: 'trade', text: 'AAPL 150C 8/30 @ 1.25' },
      { kind: 'text', text: ' now' }
    ]);
  });

  /*
    THE DIVERGENCE, and it is the second `String.replace` first-occurrence defect found in this
    bundle in one day. `.replace("[{(", …)` and `.replace(")}]", …)` take STRING patterns, so
    upstream rewrites only the FIRST marker of each kind: a two-order alert gets one copyable order
    and one left as literal punctuation.
  */
  it('splits EVERY order, where the reference splits only the first', () => {
    const body = `A ${TRADE_OPEN}x${TRADE_CLOSE} B ${TRADE_OPEN}y${TRADE_CLOSE} C`;

    expect(splitTradeOrders(body).filter((piece) => piece.kind === 'trade')).toEqual([
      { kind: 'trade', text: 'x' },
      { kind: 'trade', text: 'y' }
    ]);

    // …and this is what the reference produces from the same body, reproduced so it is concrete.
    const upstream = body
      .replace(TRADE_OPEN, '<span class="tradeColor" id="id_1">')
      .replace(TRADE_CLOSE, '</span>');
    expect(upstream).toContain(`${TRADE_OPEN}y${TRADE_CLOSE}`);
  });

  /*
    An unbalanced opener is TEXT. Upstream's `includes("[{(") && includes(")}]")` guard refuses the
    same case for the message as a whole; copying half an order would be worse than not offering to.
  */
  it('treats an unclosed marker as text', () => {
    const body = `BTO ${TRADE_OPEN}AAPL 150C`;
    expect(splitTradeOrders(body)).toEqual([{ kind: 'text', text: body }]);
  });

  it('treats a stray closer as text', () => {
    const body = `AAPL${TRADE_CLOSE} done`;
    expect(splitTradeOrders(body)).toEqual([{ kind: 'text', text: body }]);
  });

  it('handles an empty order without producing an empty text piece beside it', () => {
    expect(splitTradeOrders(`${TRADE_OPEN}${TRADE_CLOSE}`)).toEqual([{ kind: 'trade', text: '' }]);
  });
});

describe('tradeOrderId', () => {
  it('is the reference’s own id for the first order', () => {
    // `'<span class="tradeColor" id="id_' + o._id + '">'` — what `doTradeCopy` looks up.
    expect(tradeOrderId(42, 0)).toBe('id_42');
  });

  it('suffixes the rest, which the reference never needs', () => {
    // It only ever rewrites one order, so it has no second id to collide with.
    expect(tradeOrderId(42, 1)).toBe('id_42_1');
    expect(tradeOrderId(42, 0)).not.toBe(tradeOrderId(42, 1));
  });
});

const message = readFileSync(new URL('./components/RoomMessage.svelte', import.meta.url), 'utf8');
const chrome = readFileSync(new URL('./room-message-chrome.ts', import.meta.url), 'utf8');
const actions = readFileSync(new URL('./room/message-actions.svelte.ts', import.meta.url), 'utf8');

/** Both comment syntaxes, for the reason `custom-player-contract.test.ts` records. */
const codeOf = (source: string) =>
  source.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('the render', () => {
  /*
    ALERTS ONLY, and this is part of the reference's gate rather than an optimisation: `"alerts" === i`
    sits beside `sessData.copyTrades`, so the same markers typed into CHAT stay literal — exactly as
    a `#label` does, and for the same reason.
  */
  it('is gated on the setting AND the log type', () => {
    expect(codeOf(message)).toContain("copyTrades && kind === 'alert'");
  });

  it('renders the captured class and id', () => {
    expect(codeOf(message)).toContain('class="tradeColor"');
    expect(codeOf(message)).toContain('id={segment.tradeId}');
  });

  /*
    The order's text goes through the label, ticker and link passes, because upstream's span is
    inserted BEFORE those pipes run — a `$TICKER` inside an order is still coloured. That is why a
    trade segment wraps SEGMENTS rather than carrying a string, and it is invisible unless asserted.
  */
  it('parses the order’s own text rather than rendering it raw', () => {
    expect(message).toContain('children: parseLabelsTickersAndLinks(piece.text)');
    expect(message).toContain('{@render bodySegments(segment.children ?? [])}');
  });

  /*
    UPSTREAM BINDS THE CLICK TO A BARE SPAN and checks `tagName` inside the handler. A span is
    neither focusable nor keyboard-reachable, so this carries the role, the tabindex and a keydown.
    The class and the id are unchanged, because both are what the captured stylesheet and the
    captured handler select on.
  */
  it('is a real control rather than a clickable span', () => {
    /*
      COMMENTS STRIPPED FIRST, and this assertion needed it: the citation above the markup quotes
      `<span class="tradeColor" id="id_…">`, so an unstripped `indexOf` finds the PROSE and slices
      nine hundred characters of explanation. Sixth time in this repository an assertion has met its
      own explanation — and the first where it produced a slice rather than a match.
    */
    const code = codeOf(message);
    const at = code.indexOf('class="tradeColor"');
    expect(at, 'the trade span is missing').toBeGreaterThan(-1);
    const span = code.slice(at, at + 900);
    expect(span).toContain('role="button"');
    expect(span).toContain('tabindex="0"');
    expect(span).toContain('onkeydown');
    // `stopPropagation` is the reference's own: the message row is itself clickable.
    expect(span).toContain('event.stopPropagation();');
  });
});

describe('the wire', () => {
  it('reaches the message through the chrome, not per call site', () => {
    expect(chrome).toContain('readonly copyTrades: boolean;');
    expect(chrome).toContain('copyTrades: settings?.copyTrades === true');
  });

  /*
    ITS OWN ACTION, not a second use of `copy`. `copy` takes the WHOLE message; the point of an
    order marker is that a member gets the order and nothing else — and the toast says which.
  */
  it('copies the order and says so in the reference’s own words', () => {
    const at = actions.indexOf("action === 'copy-trade'");
    expect(at, 'the copy-trade handler is missing').toBeGreaterThan(-1);
    const handler = actions.slice(at, at + 600);
    expect(handler).toContain('navigator.clipboard.writeText(text)');
    expect(handler).toContain("'Order copied to clipboard.'");
    // …and the whole-message copy still says its own thing.
    expect(actions).toContain("'Copied to clipboard.'");
  });
});
