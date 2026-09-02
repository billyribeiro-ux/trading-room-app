import { setTyping } from '../../routes/typing.remote';

/**
 * The SEND half of the typing indicator — one `typing` per burst, one `notyping` when it ends.
 *
 * ## The transcription
 *
 * `updateLastTypedTime()` (byte 1,435,993) runs on every keystroke and does two things: it resets a
 * `setTimeout(refreshTypingStatus, typingDelayMillis)`, and — only if `!amITyping` — announces once.
 * `refreshTypingStatus(force)` (1,435,666) sends `notyping` when the box is empty, has lost focus,
 * or `typingDelayMillis` has passed since the last key.
 *
 * ```js
 * refreshTypingStatus(e = !1) {
 *   const i = $("#textAreaTxt");
 *   if (e || "" == i.val() || !i.is(":focus")
 *       || (new Date).getTime() - this.lastTypedTime.getTime() > this.typingDelayMillis) {
 *     this.amITyping = !1;
 *     sendServerCommand("notyping", { c: channel || "main", uid, pm: null, pu: null })
 *   }
 * }
 * ```
 *
 * ## TWO frames per burst, and that is the whole reason this is affordable
 *
 * A naive implementation sends per keystroke and multiplies every member's typing by the size of
 * the room. This one announces on the FIRST key of a burst and again only after five seconds of
 * silence — so a member typing a paragraph produces exactly two frames.
 *
 * ## The timer is a debounce, not an interval
 *
 * Every keystroke replaces the pending timeout, which is what makes "five seconds since the LAST
 * key" fall out rather than needing the timestamp comparison the reference also carries. That
 * comparison exists upstream because its timer can fire while a `blur` handler is also racing it;
 * here the debounce and the explicit `stop()` are the only two paths.
 *
 * ## The caller that chooses between the two, which this file used to quote neither of
 *
 * `onKey`, byte 1,440,194 — and its `.trim()` is the reference's own, not this room's improvement:
 *
 * ```js
 * this.showTyping && (0 === $("#textAreaTxt").val().trim().length
 *   ? this.refreshTypingStatus(!0)
 *   : this.updateLastTypedTime())
 * ```
 *
 * So a box holding only spaces is a STOP upstream too. What that means is worth stating, because it
 * is the reason {@link stop} is guarded: with `force = true` the reference re-sends `notyping` on
 * every keystroke for as long as the box stays whitespace, and it does the same on every blur. The
 * extra column's copy at 2,386,514 is identical but for the element id.
 *
 * ## Where this deliberately sends FEWER frames than the reference, and why that is not a divergence
 *
 * Upstream those redundant `notyping` frames ride a websocket that is already open. Here every frame
 * is an HTTP round trip through a remote function, so reproducing them would mean one POST per
 * keystroke for as long as somebody leans on the space bar — the "two frames per burst" property
 * this whole class exists for, defeated by a control character.
 *
 * {@link stop} therefore sends only when there is a burst to stop, and **no member can observe the
 * difference**: `notyping` is idempotent at the receiver, which removes an entry from a map and does
 * nothing when there is none. What changes is the number of redundant frames on the wire, which is
 * internal rather than reference-facing. The first draft of that method claimed to be idempotent in
 * its own doc comment and was not — it cleared the timer under a guard and then sent unconditionally.
 */
export class TypingSignal {
  readonly #channel: () => string;
  readonly #announce: () => boolean;
  readonly #clear: () => void;
  /** `typingDelayMillis = 5e3`. Injected so a test does not have to wait five real seconds. */
  readonly #delayMs: number;
  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: {
    /** The channel this composer posts to, read at send time — a viewer can switch tabs mid-word. */
    channel: () => string;
    /** `amITyping` — returns true only on the first key of a burst. Owned by `RoomChat`. */
    announce: () => boolean;
    /** Clears that flag, so the next burst announces again. */
    clear: () => void;
    delayMs?: number;
  }) {
    this.#channel = options.channel;
    this.#announce = options.announce;
    this.#clear = options.clear;
    this.#delayMs = options.delayMs ?? 5_000;
  }

  /** One keystroke. */
  typed(value: string): void {
    /*
      AN EMPTY BOX IS A STOP, not a keystroke — `"" == i.val()` is one of the reference's own three
      `notyping` conditions, and it is the one that fires when somebody selects all and deletes.
    */
    if (value.trim().length === 0) {
      this.stop();
      return;
    }

    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.stop(), this.#delayMs);

    if (this.#announce()) void this.#send(true);
  }

  /**
   * The box emptied, lost focus, or five seconds passed.
   *
   * IDEMPOTENT, and now actually so: a second call sends nothing, because the timer is the marker
   * for "a burst is live" and the first call cleared it. `typed()` arms it on every keystroke,
   * including the ones that do not announce, so it is true for exactly the span between the first
   * key of a burst and its end — which is exactly the span in which a `notyping` means anything.
   *
   * The header argues why this diverges from the reference's unconditional re-send. In one line: a
   * frame here is an HTTP round trip and there it is a websocket write, `notyping` is idempotent at
   * the receiver, and no member can see the difference.
   */
  stop(): void {
    if (this.#timer === null) return;

    clearTimeout(this.#timer);
    this.#timer = null;
    this.#clear();
    void this.#send(false);
  }

  async #send(typing: boolean): Promise<void> {
    try {
      await setTyping({ chatChannel: this.#channel(), typing });
    } catch {
      /*
        SWALLOWED, and this is the one place in this room where that is right. A typing indicator is
        advisory: a failed frame costs a member nothing they can perceive, and there is no state to
        roll back. Raising it would put a toast on somebody's screen because a keystroke did not
        reach a server — and the five-second timer means the next burst tries again anyway.
      */
    }
  }
}
