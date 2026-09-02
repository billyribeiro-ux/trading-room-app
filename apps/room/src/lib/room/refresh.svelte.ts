/*
  THE ROOM'S FRESHNESS POLL, and the tab-visibility rules that govern it.

  Arrived from `+page.svelte` on 2026-08-18. One cohesive unit: a five-second `invalidate` timer, the
  two flags that decide whether it runs, and the catch-up on the way back to a hidden tab. They were
  four functions, two flags and a timer handle spread across forty lines of the page, and the only
  thing asserting them was source text.

  ## Why nothing is pushed, and why that makes this load-bearing

  Nothing is pushed from the server for a reader's question, alert or chat message, so a presenter
  sat on a stale tab saw an empty Q&A while the row was already stored. This re-fetches on a timer,
  and ONLY while the tab is visible, so a backgrounded room is not polling. `invalidate` re-runs the
  load and patches the data; it is not a navigation, so scroll positions and open modals are left
  alone.

  ## Why a runes factory rather than a plain closure

  `appHasFocus` is read reactively — `RoomShell` renders from it and the composition root hands it on
  as a thunk — so it must be `$state`. `missedChatWhileHidden` is NOT: nothing renders from it, it is
  a latch read once on the way back, and the docs reserve `$state` for values that drive an update.
  Both live here rather than on the page because visibility is the only thing that writes them.

  The timer handle is a plain `let` for the same reason: nothing renders from a timer.

  ## The catch-up fires ONCE and does not replay

  The load already returns the newest page per channel, so the room re-reads itself and is current —
  which is what upstream's `appHasFocusGetChatLog` does.
*/

/** `globals.appHasFocus`'s poll interval. Five seconds, as the room has always used. */
const REFRESH_MS = 5000;

/**
 * `G16` — the reference does not observe visibility for the first ten seconds, and now nor does
 * this room. `},1e4)` closes the `setTimeout` that adds its listener, at bundle byte 2,511,416.
 *
 * A clock rather than a timer: no handle to leak, nothing to `unref` on the server where this
 * factory is also constructed during SSR, and identical behaviour — upstream's listener is absent,
 * so a flip inside the window is not observed, not queued and not replayed. The `<svelte:document>`
 * binding stays declarative; a late `addEventListener` would put back the hand-managed listener
 * `visibility-change-contract.test.ts` asserts is gone. That file carries the full argument, the two
 * upstream no-ops not reproduced, and why the roster half went the other way.
 */
const VISIBILITY_ARMING_MS = 10_000;

export interface RoomRefreshDeps {
  /** `invalidate('room:data')` — the narrow re-read the poll performs. */
  refresh: () => Promise<unknown>;
  /** `invalidateAll()` — the wider re-read used only for a catch-up. */
  refreshAll: () => Promise<unknown>;
}

export function createRoomRefresh(deps: RoomRefreshDeps) {
  let appHasFocus = $state(true);
  /* Not `$state`: nothing renders from it. A latch, read once on the way back. */
  let missedChatWhileHidden = false;
  /* Plain `let`: nothing renders from a timer handle. */
  let timer: ReturnType<typeof globalThis.setInterval> | undefined;
  /* When this room armed. Read once per flip; nothing renders from it. */
  const armedAt = Date.now();

  /**
   * A poll that loses the network must not become an unhandled rejection.
   *
   * `void deps.refresh()` would discard the promise without a handler, so a single dropped request —
   * a dev-server restart, a laptop waking up — surfaced as an uncaught error in the console with a
   * stack trace that looked like a fault in the room rather than one skipped refresh. The next tick
   * retries anyway; that is what a poll is for.
   */
  const refreshRoom = () => {
    void deps.refresh().catch((error: unknown) => {
      console.warn('[room] a refresh was skipped; the next one will retry', error);
    });
  };

  return {
    /** Reactive: `RoomShell` renders from this and the composition root hands it on. */
    get appHasFocus() {
      return appHasFocus;
    },

    /** Set by the realtime stream when a message lands while the tab is hidden. */
    chatMissedWhileHidden(): void {
      missedChatWhileHidden = true;
    },

    /** Idempotent: a second call while already polling must not start a second interval. */
    start(): void {
      if (timer !== undefined) return;
      timer = globalThis.setInterval(() => refreshRoom(), REFRESH_MS);
    },

    stop(): void {
      if (timer !== undefined) globalThis.clearInterval(timer);
      timer = undefined;
    },

    /**
     * `visibilitychange` — `globals.appHasFocus`, and the catch-up on the way back.
     *
     * ## G16 — TWO REFERENCE BEHAVIOURS ARE DELIBERATELY NOT REPRODUCED, recorded rather than left
     *
     * ```js
     * appVisibilityChange(e) {
     *   e ? this.visibilityChangeTimer = setTimeout(() => {
     *         document.addEventListener("visibilitychange", () => { … })
     *       }, 1e4)
     *     : …
     * }
     * ```
     * (bundle byte 2,511,416.)
     *
     * ## THE TWO WENT OPPOSITE WAYS ON 2026-09-02
     *
     * **The 10 000 ms arming delay — MATCHED**, see {@link VISIBILITY_ARMING_MS}. The reason
     * recorded here until then was that our poll is idempotent so nothing needs protecting, and
     * that arming immediately means an early tab-away is actually noticed. Both true; neither is an
     * escape. **Being better than the reference is still a divergence.**
     *
     * **`unloadRoster()` on hide, `showSidebar && loadRoster()` on show — NOT matched**, because
     * matching the CODE would produce a DIFFERENT rendered result. Upstream the roster is a
     * separate fetch, absent while hidden and invisibly reloaded on return; here it arrives with
     * the page load, so unloading it would empty the sidebar and repaint it on every return — a
     * flash the reference does not have.
     *
     * THE CATCH-UP AND THE POLL'S OWN IMMEDIATE REFRESH ARE THE SAME REQUEST, so only one goes out.
     * `missedChatWhileHidden` is set while hidden; when it is set this is a catch-up and
     * `refreshAll` is the wider re-read. When it is not, the tab was never away long enough to miss
     * anything and `refresh` — the poll's own narrow re-read — is all that is owed. Firing both
     * would double every return to the tab.
     */
    visibilityChanged(hidden: boolean): void {
      /* Upstream's listener does not exist yet, so a flip in here is not observed at all. */
      if (Date.now() - armedAt < VISIBILITY_ARMING_MS) return;

      if (hidden) {
        appHasFocus = false;
        this.stop();
        return;
      }
      appHasFocus = true;
      this.start();

      if (!missedChatWhileHidden) {
        refreshRoom();
        return;
      }
      missedChatWhileHidden = false;
      void deps.refreshAll();
    }
  };
}

export type RoomRefresh = ReturnType<typeof createRoomRefresh>;
