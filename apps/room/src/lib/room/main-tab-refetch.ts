import type { MainTab } from '#lib/types.js';

/**
 * `onMainTabChange` — two of the seven main tabs refetch when you open them.
 *
 * ```js
 * onMainTabChange(e) { P("onMainTabChange", e), this.selectedMainTab = e,
 *   "presAreaTabs-files" == this.selectedMainTab && this.getSessionFiles(),
 *   "presAreaTabs-videoplayer" == this.selectedMainTab && this.loadVideos() }
 * ```                                                                        // byte 1,968,369
 *
 * `FP-01`. This room's strip only assigned the tab, so the file list a viewer opened was whatever
 * the five-second poll last brought — up to five seconds stale, and stale in the one place where
 * somebody has just been told a file exists and gone looking for it.
 *
 * ## Why a class rather than an `$effect` reading `mainTab` directly
 *
 * Because of the FIRST PASS, which is the whole content of this file. An effect on `mainTab` runs
 * once at mount with whatever tab the room opened on, and refetching there would fire a second load
 * on top of the one that just delivered the page — for every viewer whose room opens on Files, on
 * every navigation. Upstream cannot have that problem: `onMainTabChange` is a click handler and
 * there is no such thing as running it for the initial value.
 *
 * So the first call SEEDS and returns false, exactly as `RoomArrivals.fresh` does, and for the same
 * reason: "what is the current value" and "what changed" are different questions and only the second
 * one is an event.
 *
 * ## ONE refetch identifier for both tabs, and that is not a simplification
 *
 * `getSessionFiles()` and `loadVideos()` are two commands upstream. This route has a single
 * `+page.server.ts` load that builds messages, alerts, polls, notes, files and the video state
 * together, and it registers `depends('room:data')`; `invalidate('room:data')` is the narrowest
 * refetch SvelteKit offers against it. The two upstream calls therefore collapse into one here, and
 * a caller that tried to be cleverer would be inventing a second source of truth for `data.files` —
 * the same argument the Refresh button in `FilesPane.svelte` already records.
 */
export class MainTabRefetch {
  #seenTab: MainTab | null = null;

  /**
   * Whether opening this tab should refetch the room.
   *
   * Returns false for the tab the room opened on, however many times it is asked, and false for a
   * repeat of the tab already showing — an effect re-runs for reasons that have nothing to do with
   * the strip, and each of those must not be a network round trip.
   */
  opened(tab: MainTab): boolean {
    const first = this.#seenTab === null;
    if (tab === this.#seenTab) return false;
    this.#seenTab = tab;
    if (first) return false;
    return tab === 'files' || tab === 'videoplayer';
  }
}
