import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  `isMobileScreen` and the `K4e` layout — the 601px threshold that selects a DIFFERENT TEMPLATE
  rather than restyling this one.

  `O(5, o.isMobileScreen ? 6 : 5)` (`app-room.full.js:4061`) picks between `j4e`
  (`app-room.render-helpers.js:1616-1664`) and `K4e` (`:1783-1821`). Everything asserted below is
  read out of those two functions and the const table at runtime, so a reference that says something
  different tomorrow makes this file say so rather than quietly agree.

  What this file does NOT prove: that a browser draws the two trees. That is
  `scripts/verify-mobile-layout.mjs`, which renders both widths and measures them — and which is
  honest in its own header about measuring the CSS consequence rather than the Svelte selection.
*/

const ROOM_FULL = readFileSync(
  new URL('../../docs/source/components/app-room.full.js', import.meta.url),
  'utf8'
);
const ROOM_HELPERS = readFileSync(
  new URL('../../docs/source/components/app-room.render-helpers.js', import.meta.url),
  'utf8'
);
const ROOM_COMPILED = readFileSync(
  new URL('../../docs/source/components/app-room.compiled.js', import.meta.url),
  'utf8'
);
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/*
  The split geometry left `+page.svelte` for `room/split.svelte.ts` on 2026-08-15, so half the
  assertions below moved with it. The upstream halves — everything read out of `docs/source/**` —
  are untouched, because the evidence did not move; only our side of each pair did.

  Re-pointed rather than deleted, and that distinction is the reason `source-size-contract.test.ts`
  polices this file: after an extraction a `toContain` fails loudly and tells you where to look,
  which is what happened here, while a `not.toContain` would have gone GREEN for the wrong reason —
  the text absent because the region left, not because the guard still holds.
*/
const SPLIT = readFileSync(new URL('./room/split.svelte.ts', import.meta.url), 'utf8');
const compact = (source: string) => source.replace(/\s+/g, '');

describe('the 601px threshold selects a template, and is read not chosen', () => {
  it('is <= 601 at init and on resize upstream', () => {
    const source = compact(ROOM_FULL);
    // `:1889` — init, where `isMobileScreen` and `onResizeChange` are set in ONE statement.
    expect(source).toContain('(this.isMobileScreen=this.onResizeChange=window.innerWidth<=601)');
    // `:2988` — the resize handler reads the event's own target.
    expect(source).toContain('this.isMobileScreen=e.target.innerWidth<=601');
    // `:4061` — and the flag selects a whole template, not a class.
    expect(source).toContain('O(5,o.isMobileScreen?6:5)');
  });

  it('binds the same number here', () => {
    expect(SPLIT).toContain('export const MOBILE_BREAKPOINT_WIDTH = 601;');
    expect(SPLIT).toContain(
      'this.#viewportWidth > 0 && this.#viewportWidth <= MOBILE_BREAKPOINT_WIDTH'
    );
    // Still a binding and not a listener, and still the page's, because the window is the page's.
    expect(PAGE).toContain('bind:innerWidth={split.viewportWidth}');
  });
});

describe('K4e reverses the child order, which is why the DOM is reordered', () => {
  it('puts the presentation first and the chat/alerts second', () => {
    const source = compact(ROOM_HELPERS);
    /*
      `K4e`'s update block, `:1815-1817`:
        O(1, e.hidePresentation ? -1 : 1)   <- node 1 is the PRESENTATION on mobile
        O(2, e.hideChatAlerts ? -1 : 2)
      against `j4e`'s `:1650` and `:1662`, where node 1 is the chat/alerts and node 3 the
      presentation. Same two flags, opposite order.
    */
    expect(source).toContain('O(1,e.hidePresentation?-1:1)');
    expect(source).toContain('O(2,e.hideChatAlerts?-1:2)');
    expect(source).toContain('O(1,e.hideChatAlerts?-1:1)');
    expect(source).toContain('O(3,e.hidePresentation?-1:3)');
  });

  it('renders the two panes in both orders here, from one pair of snippets', () => {
    const source = compact(PAGE);
    // Mobile: presentation, gutter, chat/alerts.
    expect(source).toContain(
      '{#ifsplit.isMobileScreen}{#if!hidePresentation}{@renderpresentationPane()}{/if}{@rendermainGutter()}{#if!hideChatAlerts}{@renderchatAlertsPane()}{/if}{#if!hideChatAlerts&&extraChatColumnVisible}{@renderextraChatPane()}{/if}'
    );
    // Desktop: chat/alerts, the extra column, presentation, gutter.
    expect(source).toContain(
      '{:else}{#if!hideChatAlerts}{@renderchatAlertsPane()}{/if}{#if!hideChatAlerts&&extraChatColumnVisible}{@renderextraChatPane()}{/if}{#if!hidePresentation}{@renderpresentationPane()}{/if}{@rendermainGutter()}{/if}'
    );
    /*
      THE THIRD AREA, added 2026-08-14. `K4e` renders three `as-split-area` children and gates the
      last on `!e.hideChatAlerts && preferences.extraChatColumn` — index 3 of the same block that
      places presentation and chat/alerts. It follows the chat/alerts column in DOM order in both
      branches, which on mobile IS the layout because those areas carry no `order`.
    */
    // One definition each — a duplicated pane is a layout that drifts.
    expect(PAGE.match(/\{#snippet presentationPane\(\)\}/g)?.length).toBe(1);
    expect(PAGE.match(/\{#snippet chatAlertsPane\(\)\}/g)?.length).toBe(1);
    expect(PAGE.match(/\{#snippet extraChatPane\(\)\}/g)?.length).toBe(1);
  });
});

describe('both mobile splits are vertical, as a static attribute', () => {
  it('is what the const table says', () => {
    const source = compact(ROOM_COMPILED);
    // Const 224 — the mobile OUTER split: direction is a value, not a binding.
    expect(source).toContain(
      "['minSize','0','direction','vertical','id','mainAreaSplit','gutterDblClickDuration','400',3,'gutterDblClick','dragStart','ngClass']"
    );
    // Const 228 — the mobile INNER split, also static vertical, and with no dragEnd.
    expect(source).toContain("['direction','vertical','minSize','0']");
    // Const 8 and 209 — the desktop pair, where direction IS bound.
    expect(source).toContain(
      "['minSize','0','id','mainAreaSplit','gutterDblClickDuration','400',3,'direction','ngClass']"
    );
    expect(source).toContain("['minSize','0',3,'dragEnd','direction']");
  });

  it('drives both splits from that, and the inner one is NOT the inverse of the outer', () => {
    /*
      The trap this pins: the inner split is normally the opposite direction to the outer, so the
      obvious implementation reuses `splitIsHorizontal` and puts alerts BESIDE chat in a phone-width
      column. Const 228 says vertical outright, so `innerSplitIsVertical` is an OR, not a negation.
    */
    expect(SPLIT).toContain(
      '#isHorizontal = $derived(this.#roomIsHorizontal && !this.#isMobileScreen);'
    );
    expect(SPLIT).toContain(
      '#innerIsVertical = $derived(this.#roomIsHorizontal || this.#isMobileScreen);'
    );
  });
});

describe('the mobile geometry is its own, and is never written down', () => {
  it('takes the reference’s 50/50', () => {
    // `chatAlertsSizeMobile = 50`, `presAreaSizeMobile = 50` — `app-room.full.js:1852-1853`.
    const source = compact(ROOM_FULL);
    expect(source).toContain('(this.chatAlertsSizeMobile=50),(this.presAreaSizeMobile=50)');
    expect(SPLIT).toContain('export const MOBILE_CHAT_ALERTS_SPLIT = 0.5;');
  });

  it('keeps the desktop 70/30 in a separate field, so neither overwrites the other', () => {
    expect(compact(ROOM_FULL)).toContain('(this.presAreaSize=70),(this.chatAlertsSize=30)');
    expect(SPLIT).toContain('#mobile = $state(MOBILE_CHAT_ALERTS_SPLIT);');
    expect(SPLIT).toContain(
      'this.#isMobileScreen ? this.#mobile : (this.#main ?? this.#defaultMainSplit)'
    );
  });

  it('never persists a mobile drag, because K4e has no dragEnd', () => {
    const source = compact(ROOM_HELPERS);
    // `j4e` binds dragEnd; `K4e` binds only gutterDblClick and dragStart.
    expect(source).toContain(
      "x('dragEnd',function(o){return(D(e),E(g().resizeEndPresentation(o)));})"
    );
    expect(source).toContain(
      "d(0,'as-split',224),x('gutterDblClick',function(){return(D(e),E(g().hideShowPresentationArea()));})('dragStart',function(){return(D(e),E(g().resizeStart()));})"
    );
    expect(SPLIT).toContain('if (this.isMobileScreen) return null;');
  });

  it('drops the order property, because the mobile areas carry none', () => {
    const source = compact(ROOM_COMPILED);
    // Const 225 / 226 — size only. Const 227, the extra chat column, is the only one with order.
    expect(source).toContain("['minSize','0',1,'presentation-box',3,'size']");
    expect(source).toContain("['minSize','0',1,'alert-chat-box',3,'size']");
    expect(source).toContain("['minSize','0',1,'alert-chat-box',3,'size','order']");
    expect(SPLIT).toContain('this.#isMobileScreen\n      ? `flex: 0 0 ${this.#primaryColumn};`');
  });
});

describe('crossing the threshold refetches, once, after 500ms', () => {
  it('is the reference’s debounce and its three commands', () => {
    const source = compact(ROOM_FULL);
    expect(source).toContain("this.appService.guiEventBus.emit('appHasFocusGetChatLog')");
    expect(source).toContain("this.appService.sendServerCommand('getAlertsLog',{page:0})");
    expect(source).toContain('this.onResizeChange=this.isMobileScreen');
    expect(source).toContain('},500)');
  });

  it('fires on the FLIP and not on every resize', () => {
    /*
      `isMobileScreen !== onResizeChange` upstream. Without it, dragging a desktop window 400px
      wider would refetch the whole room repeatedly for no layout change at all.
    */
    expect(compact(ROOM_FULL)).toContain('this.isMobileScreen!==this.onResizeChange');
    expect(PAGE).toContain('if (mobile === lastThresholdActedOn) return;');
    expect(PAGE).toContain('const RESIZE_REFETCH_DELAY_MS = 500;');
    // One invalidation stands in for all three commands — the load returns alerts and messages.
    expect(PAGE).toContain("void invalidate('room:data');");
  });

  it('does not refetch on the first measurement, which is not a flip', () => {
    // Upstream gets this from `isMobileScreen = onResizeChange = …` in one statement at init.
    expect(PAGE).toContain('if (lastThresholdActedOn === null) {');
  });
});
