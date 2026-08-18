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
     * THE CATCH-UP AND THE POLL'S OWN IMMEDIATE REFRESH ARE THE SAME REQUEST, so only one goes out.
     * `missedChatWhileHidden` is set while hidden; when it is set this is a catch-up and
     * `refreshAll` is the wider re-read. When it is not, the tab was never away long enough to miss
     * anything and `refresh` — the poll's own narrow re-read — is all that is owed. Firing both
     * would double every return to the tab.
     */
    visibilityChanged(hidden: boolean): void {
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
