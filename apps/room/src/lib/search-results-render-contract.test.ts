import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import RoomMessage from './components/RoomMessage.svelte';

/**
 * The advanced alert search renders MESSAGES, not escaped plain text — `SRCH-01`.
 *
 * ## What it was
 *
 * ```svelte
 * <div class="log-messages">
 *   {#each advancedSearchResults as result (result.id)}
 *     <p>{result.body}</p>
 *   {/each}
 * </div>
 * ```
 *
 * No sender, no timestamp, no day separator, no session name, no alert-label badge — and, the part
 * the audit names, no trade highlighting and no click-to-copy. An order found by searching could not
 * be copied from the place it was found, while the same order in the alerts log could.
 *
 * ## The reference, byte 2,421,116
 *
 * ```js
 * d(0, "app-st-message", 46), x("click", o => copyTradeOnClick(o, "id_" + s._id)),
 * z("msg", e)("logType", "alerts")("prevD", i > 0 ? o.msgs[i-1].t : 0)("sessName", e?.sessName || null)
 * ```
 *
 * It renders the same component the alerts log renders, and binds ONE handler of its own on top of
 * it. `prevD` is the previous row's timestamp, which is what draws the day separator.
 *
 * ## The one divergence, stated rather than glossed
 *
 * `showMenu={false}`. Upstream's row carries its full kebab; this room has no route from this modal
 * to the message-action command — `ModalHost` is handed `onQaAction` and nothing else — so drawing
 * twelve entries that cannot act would be the dead-control defect this repository spends its time
 * removing. `copyTradeOnClick`, the binding the reference adds ON TOP of the component, IS wired,
 * and it is the one the audit says was lost.
 */

const MODAL = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
/* Comments stripped: this file's own quotes of the old markup would otherwise satisfy it. */
const modalCode = MODAL.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');

const item = {
  id: 11,
  senderId: 2,
  senderName: 'A Presenter',
  senderEmailHash: 'hash-of-the-presenter',
  senderAvatarUrl: '',
  body: 'BTO [{(AAPL 150C 8/30 @ 1.25)}] now',
  createdAt: new Date('2026-08-30T12:00:00Z'),
  isAdmin: true
};

const draw = (props: Record<string, unknown>) =>
  render(RoomMessage, {
    props: {
      item,
      kind: 'alert',
      currentUserId: 99,
      currentUserEmailHash: 'hash-of-the-viewer',
      viewerIsPresenter: false,
      theme: 'dark',
      menuOpen: false,
      showDateSeparator: false,
      ontoggle: () => {},
      onaction: () => {},
      ...props
    } as never
  }).body;

describe('showMenu', () => {
  it('draws the kebab by default, because every log wants it', () => {
    /*
      The DEFAULT is what matters here: one caller passes false and forty do not, so a prop that
      defaulted the wrong way would silently strip the menu from the whole room.
    */
    expect(draw({})).toContain('msgMenu');
  });

  it('removes it entirely when false — not hidden, not empty', () => {
    const html = draw({ showMenu: false });
    expect(html).not.toContain('msgMenu');
    expect(html).not.toContain('dropdown-menu users-dropdown-options');
  });

  it('keeps the rest of the row, which is the whole point of rendering one', () => {
    const html = draw({ showMenu: false });
    expect(html).toContain('A Presenter');
    expect(html).toContain('8/30/26');
  });

  it('and the trade marker still becomes a copyable order — the behaviour SRCH-01 says was lost', () => {
    /*
      `copyTrades` is the room's setting and reaches the row through the chrome, which the search
      modal spreads. WITHOUT it the marker stays literal text, and that is correct rather than a
      miss — a room that has not enabled copy trades must not have punctuation turn into a control.
      Both directions are asserted, because only the pair distinguishes "wired" from "always on".
    */
    const withCopy = draw({ showMenu: false, copyTrades: true });
    expect(withCopy).toContain('AAPL 150C 8/30 @ 1.25');
    expect(withCopy).not.toContain('[{(');

    const without = draw({ showMenu: false });
    expect(without).toContain('[{(');
  });
});

describe('the search modal', () => {
  it('renders the alerts log s own component, not a paragraph', () => {
    expect(modalCode).not.toContain('<p>{result.body}</p>');
    expect(modalCode).toContain('item={searchResultItem(result)}');
    expect(modalCode).toContain('{...messageChrome}');
    /* `logType: "alerts"` upstream — the same value the alerts log passes. */
    expect(modalCode).toContain('kind="alert"');
  });

  it('draws the day separator from the PREVIOUS row, as `prevD` does', () => {
    expect(modalCode).toContain('advancedSearchResults[index - 1].createdAt');
    expect(modalCode).toContain('sameCalendarDay(');
  });

  it('draws no kebab, and says so at the call site', () => {
    expect(modalCode).toContain('showMenu={false}');
  });

  it('refuses every action but the one the reference binds', () => {
    /*
      Source-level because the handler is a component-local function. What makes it worth asserting
      anyway is that it FAILS CLOSED: the kebab is not drawn, so `copy-trade` is the only action the
      row can emit today — and the guard is what stops a later change that draws more controls from
      quietly routing a delete through this modal.
    */
    const at = modalCode.indexOf('function runSearchResultAction');
    expect(at, 'the handler must exist for this to test anything').toBeGreaterThan(-1);
    const closes = modalCode.indexOf('\n  }', at);
    expect(closes, 'the handler must be closed for the slice to bound anything').toBeGreaterThan(
      at
    );
    const body = modalCode.slice(at, closes);

    expect(body).toContain("if (action !== 'copy-trade') return;");
    expect(body).toContain('navigator.clipboard.writeText(text)');
    for (const forbidden of ['delete', 'edit', 'reaction', 'markAnswered', 'mute']) {
      expect(body, `${forbidden} must not be reachable from the search modal`).not.toContain(
        forbidden
      );
    }
  });
});
