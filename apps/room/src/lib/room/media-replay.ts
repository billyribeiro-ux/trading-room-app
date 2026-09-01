import type { RoomMediaState } from '#lib/server/room-media-state.js';

/**
 * THE LATE-JOIN REPLAY — what a member is shown when they arrive at a room already playing.
 *
 * ## Where this comes from
 *
 * The reference replays from server state in its own constructor, at two sites:
 *
 * ```js
 * roomState.videoURL && !roomState.videoPlayTime &&
 *   (hideVideoPlayer = !0, videoPlayerUrl = roomState.videoURL,
 *    onMainTabChange("presAreaTabs-videoplayer"))                            // byte 1,967,330
 * roomState.ytURL && emit("playYTForAll",
 *   {url: roomState.ytURL, startTime: roomState.ytStartTime})                // byte 1,965,054
 * subscribe("playYTForAll", e => { let i = 0;
 *   if (e.startTime) { let o = Number(e.startTime), s = Date.now();
 *     i = Math.round((s - o) / 1e3), this.startTime = i } else this.startTime = 0 })
 *                                                                           // byte 1,964,799
 * ```
 *
 * Not from a broadcast — a broadcast only reaches whoever was already there, which is the entire
 * defect this closes. `TODO.md` carried it for weeks: *"a member who joins while a video is playing
 * sees nothing."*
 *
 * ## Why a module rather than nine lines in `onMount`
 *
 * It was nine lines in `onMount`, and two things were wrong with that. `+page.svelte` went past its
 * ceiling, which is what forced the question; and the DERIVATION — a clock read, a subtraction, a
 * rounding and a clamp — had no test that did not involve mounting a page and stubbing time. The
 * three rules below are each a decision taken from the capture, and each is now assertable on its
 * own:
 *
 *   1. a video is replayed only when it is PLAYING, not when it is merely scheduled;
 *   2. the tab moves for a MEMBER and not for a presenter;
 *   3. the YouTube offset is seconds elapsed since the stored moment, clamped at zero.
 *
 * This function decides; it does not act. Applying the result is the page's, because the two things
 * it changes — the broadcast model and the visible tab — are the page's to own.
 */

/** What the room should show this member, decided from server state and the current time. */
export interface MediaReplay {
  /** `playVideoForAll`'s url, or null when there is nothing playing to join. */
  readonly videoUrl: string | null;
  /**
   * Whether to move this viewer to the VideoPlayer tab.
   *
   * `this.isP || this.onMainTabChange(...)` on the live path (byte 1,966,711) — the tab moves for a
   * member and not for a presenter, and the reason is visible in the gate it pairs with: a presenter
   * can reach that tab whenever they like, while a member's tab exists only while `hideVideoPlayer`
   * is true. A presenter still gets the VIDEO; what they do not get is being moved.
   */
  readonly showVideoTab: boolean;
  /** `playYTForAll`'s url, or null. */
  readonly ytUrl: string | null;
  /** `playYTURL(e, i)`'s `i` — seconds into the video the room already is. */
  readonly ytStartSeconds: number;
}

const NOTHING: MediaReplay = {
  videoUrl: null,
  showVideoTab: false,
  ytUrl: null,
  ytStartSeconds: 0
};

/**
 * `now` is a parameter, not a `Date.now()` call, and that is what makes rule 3 testable.
 *
 * A function that reads the clock has a different answer every time it runs, so the only way to test
 * the derivation would be to stub a global — which tests the stub as much as the code. The page
 * passes the real clock; a test passes a moment.
 */
export function mediaReplay(
  state: RoomMediaState,
  options: { readonly isPresenter: boolean; readonly now: number }
): MediaReplay {
  /*
    RULE 1 — `roomState.videoURL && !roomState.videoPlayTime`, and the second term is the one a
    reasonable design drops.

    A play ARMED for later has a url in the row and nothing on screen. Replaying it would drop an
    arriving member onto an empty VideoPlayer tab minutes before the video exists, which is worse
    than the gap this whole feature closes: at least "nothing" is honest about being nothing.
  */
  const playingNow = state.videoUrl !== null && state.videoPlayTime === null;

  /*
    RULE 3 — `i = Math.round((s - o) / 1e3)`, byte 1,964,799, where `o` is the stored moment.

    CLAMPED AT ZERO, and the clamp is OURS rather than the capture's. A row written by a clock ahead
    of this one yields a negative, and `start=` with a negative is a request YouTube answers
    unpredictably rather than refuses — so the honest floor is "the beginning". It costs nothing and
    the alternative is behaviour nobody here can state.

    Zero when there is no stored moment, which is the reference's own `else this.startTime = 0`.
  */
  const ytStartSeconds =
    state.ytUrl !== null && state.ytStartTime !== null
      ? Math.max(0, Math.round((options.now - state.ytStartTime) / 1000))
      : 0;

  if (!playingNow && state.ytUrl === null) return NOTHING;

  return {
    videoUrl: playingNow ? state.videoUrl : null,
    /* RULE 2. A presenter gets the video and stays where they are. */
    showVideoTab: playingNow && !options.isPresenter,
    ytUrl: state.ytUrl,
    ytStartSeconds
  };
}
