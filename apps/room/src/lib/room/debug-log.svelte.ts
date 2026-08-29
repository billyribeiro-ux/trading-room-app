import { DebugLogBuffer } from '#lib/debug-log-buffer.js';

/**
 * The room's own console log, and the one a presenter has pulled out of somebody else's browser.
 *
 * Two halves that look unrelated and are not: this is one feature seen from its two ends. Every
 * member collects, every presenter may receive, and the same page is both — so both live here rather
 * than splitting a feature across two classes by role.
 *
 * ## Why the buffer is NOT `$state` and the received log is
 *
 * `CLAUDE.md`: *"`$state` on an object that only ever changes at the top level → `$state.raw`. A
 * deep proxy over a list that is replaced wholesale is pure overhead on every read."* The buffer is
 * worse than that case — it is written from inside `console.log`, on whatever schedule the
 * application logs, and read exactly once, when a presenter asks. A reactive array would pay a proxy
 * trap per logged line to drive nothing at all.
 *
 * `#received` IS rendered — it fills the textarea in `#debug-log-modal` — so it is `$state`, and
 * `$state` rather than `$state.raw` because it is a small object replaced wholesale and never
 * mutated in place, which is what the plain rune is for.
 *
 * ## Installing over `console` is opt-in and reversible
 *
 * `install()` is called by the page, not by the constructor. A class that patched a global on
 * construction would do it in every unit test that builds a room, and the teardown it returns is
 * what makes that safe: the original methods are restored, so a suite cannot leave a patched
 * `console` behind for the next file.
 *
 * The patch always calls through. A debug buffer that swallowed output would make the browser
 * console — the thing a developer actually looks at — worse in exchange for a feature nobody uses
 * daily.
 */
export class RoomDebugLog {
  readonly #buffer = new DebugLogBuffer();

  /**
   * The log this presenter last received, or null.
   *
   * Carries WHO it came from because the modal's title is otherwise a lie by omission: a presenter
   * who asked two members in a row would have no way to tell which answer they are reading. Both
   * fields are the server's, never the sender's — see `debug-log.remote.ts`.
   */
  #received = $state<{ fromUserId: number; fromName: string; log: string } | null>(null);

  get received(): { fromUserId: number; fromName: string; log: string } | null {
    return this.#received;
  }

  /** How many lines this browser is holding. Read by the contract test, and by nothing else. */
  get size(): number {
    return this.#buffer.size;
  }

  /**
   * Patch `console` so ordinary logging accumulates here. Returns the teardown.
   *
   * `at` is injected rather than read from `Date` inside, for the reason
   * `RoomAlerts.archive(now)` gives: a timestamp the caller supplies is one a test can drive, and
   * the alternative is a buffer whose content differs on every run.
   *
   * `svelte-autofixer` returns zero issues and one suggestion on this line — *"Found a mutable
   * instance of the built-in Date class. Use SvelteDate instead."* DECLINED, recorded rather than
   * ignored, and for the reason `RoomAlerts.afterArchive` already declines the same suggestion:
   * `SvelteDate` earns its place when a Date is MUTATED and read reactively — a clock, a picker.
   * This one is constructed, read once through `toISOString()` and discarded, INSIDE A PATCHED
   * `console.log`. Making it reactive would allocate a signal per logged line to drive nothing,
   * which is the exact overhead this class's docblock argues the buffer must not have.
   */
  install(
    target: Pick<Console, 'log' | 'warn' | 'error' | 'info'> = console,
    at: () => string = () => new Date().toISOString()
  ): () => void {
    const levels = ['log', 'warn', 'error', 'info'] as const;
    const originals = levels.map((level) => [level, target[level]] as const);

    for (const [level, original] of originals) {
      target[level] = (...args: unknown[]) => {
        this.#buffer.recordArguments(level, args, at());
        // ALWAYS through. See the class docblock: the browser console must not get worse.
        (original as (...a: unknown[]) => void).apply(target, args);
      };
    }

    return () => {
      for (const [level, original] of originals) target[level] = original;
    };
  }

  /** The whole buffer, as the presenter's textarea will show it. */
  collect(): string {
    return this.#buffer.toText();
  }

  /** A `debugLogResp` frame arrived. Every field here was filled by the server. */
  receive(from: { fromUserId: number; fromName: string; log: string }): void {
    this.#received = from;
  }

  /**
   * Forget the received log.
   *
   * Called when the modal closes, so one member's console does not sit in a presenter's page for the
   * rest of the session waiting to be shown again by an unrelated open.
   */
  clearReceived(): void {
    this.#received = null;
  }
}
