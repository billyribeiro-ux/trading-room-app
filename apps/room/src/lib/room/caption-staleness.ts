/**
 * `startSpeechChecker` — a caption that stops arriving has to stop being shown.
 *
 * ```js
 * startSpeechChecker() {
 *   this.speechRecoInterval || (this.speechRecoInterval = setInterval(() => {
 *     this.lastSpeechRecoEvent + 7e3 < Date.now()
 *       ? (this.currentSpeechReco = null, this.showSpeechRecognition = !1,
 *          this.stopSpeechChecker(), console.log("speech checker NOT active.. …"))
 *       : console.log("speech checker running.. still active...")
 *   }, 7e3))
 * }
 * ```                                                                        // byte 1,956,753
 *
 * ## The defect this closes, which is a caption that never goes away
 *
 * `PA-01`. Nothing in this room ever wrote the current caption back to null — the port's own type
 * was `(caption: Caption) => void`, which cannot express it — so the last line anybody spoke stayed
 * pinned over the presentation area for the rest of the session. Not a stale-data nicety: the room
 * falls silent, the presenter moves on, and a sentence from twenty minutes ago is still captioning
 * whatever is on screen now.
 *
 * ## Why the interval is the same 7 seconds as the window
 *
 * That is upstream's own shape and it is worth stating, because it looks like a coincidence. The
 * checker runs every 7,000 ms and asks whether the last event was more than 7,000 ms ago, so the
 * caption survives between 7 and 14 seconds of silence. A tighter interval would clear it sooner and
 * cost a timer wake-up per second for the whole session; this reproduces the reference's behaviour
 * rather than improving on it, and improving on it is not this row's decision to make.
 *
 * ## It stops itself, and that is load-bearing
 *
 * `stopSpeechChecker()` is called from inside the stale branch, so a silent room holds no timer at
 * all — the checker exists only while something is being said. `seen()` restarts it. Without that
 * the interval would run for the life of the page in every room, presenting or not.
 *
 * ## Why this is a plain class and not a rune module
 *
 * Nothing renders from it. It owns a timestamp and a timer handle, and it REPORTS staleness through
 * an injected callback to whoever owns the caption — the same decision-versus-effect split
 * `arrivals.ts` records, and the reason that file is a plain `.ts` too.
 */

/** `7e3` — the window, and the interval, both. See the docblock. */
export const SPEECH_RECO_STALE_MS = 7_000;

export class CaptionStaleness {
  #lastEvent = 0;
  #timer: ReturnType<typeof setInterval> | null = null;

  /** What to do when the room has gone quiet. The caption is the page's; this only reports. */
  readonly #onStale: () => void;
  /**
   * Injected so a test can drive the clock.
   *
   * `Date.now` and not `performance.now`: the comparison is against a wall-clock stamp taken at the
   * same source, and mixing the two epochs is how `#lastClickAt` in `split.svelte.ts` once treated
   * 0 as a real timestamp.
   */
  readonly #now: () => number;

  constructor(options: { onStale: () => void; now?: () => number }) {
    this.#onStale = options.onStale;
    this.#now = options.now ?? (() => Date.now());
  }

  /** Whether the checker is running. Read by the tests; the room has no reason to ask. */
  get running(): boolean {
    return this.#timer !== null;
  }

  /**
   * A caption arrived — `lastSpeechRecoEvent = Date.now()` plus `startSpeechChecker()`.
   *
   * The `||` in `this.speechRecoInterval || (…)` is what makes this idempotent: a second caption
   * inside the window records its time and does NOT start a second interval.
   */
  seen(): void {
    this.#lastEvent = this.#now();
    if (this.#timer !== null) return;
    this.#timer = setInterval(() => {
      if (this.#lastEvent + SPEECH_RECO_STALE_MS >= this.#now()) return;
      this.stop();
      this.#onStale();
    }, SPEECH_RECO_STALE_MS);
  }

  /**
   * `stopSpeechChecker()` — from the stale branch above, and from the overlay's close button.
   *
   * `PA-02`: dismissing the overlay stops the checker as well as hiding it, or a timer keeps waking
   * up to clear a caption nobody is being shown.
   */
  stop(): void {
    if (this.#timer === null) return;
    clearInterval(this.#timer);
    this.#timer = null;
  }
}
