import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  THE OTHER HALF OF `trimFat()`: that something actually calls the release.

  `log-pages.svelte.test.ts` proves `releaseHistory` drops the held pages and notifies. This proves
  it is WIRED, and the two are separate files because the failure this phase keeps producing is
  exactly a pair whose ends each read correctly on their own — a receiver nobody calls, a rune
  nobody reads. Four negative controls in this decomposition came back green for that reason.

  ## What the reference does, read from the bundle

  `app-roomscroller`'s scroll handler (`docs/source-v3-2026-08-15/main.99a5781d1d7a7775.js`, byte
  1,318,297) puts BOTH actions in one expression:

  ```js
  i.scrollHeight - i.scrollTop <= i.offsetHeight + 20
    ? (this.isScrollingUp = !1, this.shouldtrimFat = !0, this.hasMoreData = !0,
       this.currPage > 0 && this.trimFat())
    : this.isScrollingUp = !0
  ```

  This room implemented `hasMoreData = !0` — our `arm()` — and not `trimFat()`, which is why the
  held pages grew for the life of the session while the re-arm worked perfectly. Asserting them
  together is the point: they are one branch upstream and must not drift apart again.

  ## The bound this restores, and the number that is NOT 300

  `trimAlertsLog` and `trimChatLog` both splice back to `globals.chatLogPageSize` — **50** (byte
  1,051,216 and the line before it). `globals.trimLogSize` is 300 and caps the chat log ON ARRIVAL
  (byte 928,060); it says nothing about paged-in history. Two bounds, two mechanisms. The obvious
  guess was 300 and it would have been wrong by 250 rows.
*/

const FEED_SCROLL = readFileSync(new URL('./room/feed-scroll.ts', import.meta.url), 'utf8');
const LOG_PAGES = readFileSync(new URL('./room/log-pages.svelte.ts', import.meta.url), 'utf8');
const BUNDLE = readFileSync(
  new URL('../../docs/source-v3-2026-08-15/main.99a5781d1d7a7775.js', import.meta.url),
  'utf8'
);

/** Whitespace is the only thing that differs between the decode and a quotation of it. */
const compact = (source: string) => source.replace(/\s+/g, '');

describe('the reference releases paged history at the bottom, and so do we', () => {
  it('is what the bundle says, so this is transcription and not preference', () => {
    /*
      Read from the capture at runtime rather than quoted from memory: a reference that says
      something different tomorrow makes this file say so rather than quietly agree.
    */
    expect(compact(BUNDLE)).toContain('this.currPage>0&&this.trimFat()');
    /*
      The body, quoted from AFTER its log call. `compact` strips whitespace inside string literals
      too, so `U("Trimming the fat a little")` compacts to `U("Trimmingthefatalittle")` — quoting
      across it asserts a string that exists nowhere. My own first draft did exactly that and failed;
      the fix is to quote a region with no prose in it rather than to loosen the comparison.
    */
    expect(compact(BUNDLE)).toContain(
      'this.currPage=0,this.loadingMore=!1,"chat"==this.logType?this.appService.appEventBus.emit("trimChatLog",this.channel):"alerts"==this.logType&&this.appService.appEventBus.emit("trimAlertsLog")'
    );
  });

  it('bounds at chatLogPageSize, NOT at trimLogSize', () => {
    // The alerts handler, byte 1,051,216 — the splice target is `chatLogPageSize`.
    expect(compact(BUNDLE)).toContain(
      'this.globals.alertsLog.splice(0,i-this.globals.chatLogPageSize)'
    );
    // And the two constants, so the distinction cannot be read as a typo in either direction.
    expect(compact(BUNDLE)).toContain('this.chatLogPageSize=50,this.trimLogSize=300');
    // `trimLogSize` guards the chat log's ARRIVAL path and nothing else.
    expect(compact(BUNDLE)).toContain(
      'e.globals.preferences.trimChatLogs&&e.globals.chatLog.main.length>e.globals.trimLogSize&&e.globals.chatLog.main.shift()'
    );
  });

  it('calls the release beside the arm, for all three feeds', () => {
    /*
      All three, because they are one branch upstream. The extra column shares the chat log's paging
      state by channel, so releasing on its scroll releases the same history the main column holds —
      which is correct, and is why it is keyed rather than duplicated.
    */
    expect(FEED_SCROLL).toContain('this.#alertPages.arm(ALERTS_LOG);');
    expect(FEED_SCROLL).toContain('this.#alertPages.releaseHistory(ALERTS_LOG);');
    expect(FEED_SCROLL).toContain('this.#chatPages.arm(this.#chat.tab);');
    expect(FEED_SCROLL).toContain('this.#chatPages.releaseHistory(this.#chat.tab);');
    expect(FEED_SCROLL).toContain('this.#chatPages.arm(this.#chat.extraTab);');
    expect(FEED_SCROLL).toContain('this.#chatPages.releaseHistory(this.#chat.extraTab);');
  });

  it('releases only on the way DOWN, never while reading history', () => {
    /*
      The guard that makes this safe. `isRoomScrollerReadingHistory` is the reference's own
      `scrollHeight - scrollTop <= offsetHeight + 20`, inverted; releasing on the way UP would
      delete the page a reader just asked for, one frame after it arrived.

      Asserted structurally — every `releaseHistory` call sits inside a block guarded by a
      `!…ScrollingUp` test — rather than by quoting one call site, because there are three.
    */
    /*
      `.releaseHistory(` with the dot, which counts CALLS and excludes the one declaration in the
      structural `LogPages` interface this file narrows `RoomLogPages` to. Counting the bare name
      gave four and failed, which is the check being wrong rather than the code.
    */
    const guarded = FEED_SCROLL.split('.releaseHistory(').length - 1;
    expect(guarded).toBe(3);
    for (const flag of ['#alertsScrollingUp', '#chatScrollingUp', '#extraChatScrollingUp']) {
      const at = FEED_SCROLL.indexOf(`if (!this.${flag})`);
      expect(at, `${flag} no longer guards its release`).toBeGreaterThan(-1);
      // The release is inside the block that guard opens, not somewhere after it.
      const block = FEED_SCROLL.slice(at, FEED_SCROLL.indexOf('\n    }', at));
      expect(block).toContain('releaseHistory(');
    }
  });

  it('the release itself is guarded on having paged, as upstream guards it', () => {
    // `currPage > 0` — without it every bottom-scroll writes a new record for no change.
    expect(LOG_PAGES).toContain('if (this.page(key) === 0) return false;');
    expect(LOG_PAGES).toContain('this.#older = { ...this.#older, [key]: EMPTY };');
  });
});
