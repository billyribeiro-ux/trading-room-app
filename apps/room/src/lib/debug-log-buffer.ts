/**
 * The bounded in-memory log a presenter can pull out of one member's browser.
 *
 * ## What this replaces
 *
 * Upstream's `getDebugLog` answers with `{requestor, log: V1}`, where `V1` is the page's own
 * accumulated console output. This room had no such buffer, which is the reason the control sat in
 * `INERT_ACTIONS` rather than being a missing wire: there was nothing to send.
 *
 * There are 94 `console.*` calls in this application, most of them on the client and in exactly the
 * places a presenter would want to see when a member says "I cannot hear anything" - the media
 * transport, the local capture, the recorder, the composer. So the content is real; what was
 * missing was somewhere for it to accumulate.
 *
 * ## Bounded, and bounded by COUNT rather than by bytes
 *
 * A log that grows with a session is a leak in a page that stays open all day. `CAPACITY` lines are
 * kept and the oldest is dropped, so the memory is O(1) in session length.
 *
 * The cap is on lines and not on total characters because the read path is what has to stay cheap:
 * `record` runs inside `console.log`, on whatever schedule the application logs, and a byte budget
 * would mean re-measuring the whole buffer on every call. Each line is separately truncated at
 * `MAX_LINE`, which bounds the total anyway - CAPACITY x MAX_LINE - without a running total.
 *
 * ## REDACTION IS OURS, and it is a deliberate divergence
 *
 * The reference sends its log verbatim. This one does not, because the two systems differ in a way
 * that matters: upstream's room and site are one system, and here a member's console can contain a
 * MediaMTX playback token (`mtxPlaylistUrl` carries one in a query parameter) or a stringified error
 * whose `cause` is a URL that does. Handing that to a presenter turns a diagnostic into a
 * credential transfer.
 *
 * A sweep of every client-side `console.*` call found exactly one line naming anything token-shaped,
 * and it logs a preference KEY and an error - not a value. So this is not fixing a known leak; it is
 * refusing to build a channel that would carry the next one. Recorded as invented rather than left
 * to look transcribed.
 *
 * ## No runes here
 *
 * `record` is called from a patched `console.log`. A `$state` array would allocate a proxy trap on
 * every line the application logs, for a value nothing renders until a presenter asks - which is the
 * `$state`-on-a-hot-path trap `CLAUDE.md` names. The buffer is a plain array; the room class that
 * owns it keeps only the RECEIVED log in state, because that one is rendered.
 */

/** How many lines are kept. The oldest is dropped when the buffer is full. */
export const CAPACITY = 500;

/** How long one line may be. Longer lines are truncated with a marker, never dropped. */
export const MAX_LINE = 2_000;

/** What replaces a redacted run. Visible on purpose: a reader must see that something was removed. */
export const REDACTED = '[redacted]';

/**
 * The shapes worth removing before a log leaves the browser.
 *
 * Deliberately few and deliberately specific. A broad "anything long and random" rule would eat
 * message ids, room codes and stack offsets, and a debug log with its identifiers scrubbed is not a
 * debug log. Each pattern below names a thing that is a CREDENTIAL by construction:
 *
 * - a JSON Web Token, which is what every signed handoff and media grant in this system looks like;
 * - a `token` / `key` / `secret` / `password` query parameter, which is how the MediaMTX playback
 *   URL carries its own;
 * - a `Bearer` header value, which is how one would appear in a logged request.
 */
const REDACTIONS: readonly RegExp[] = [
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /([?&](?:token|key|secret|password|jwt)=)[^&\s"']+/gi,
  /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{16,}/gi
];

/**
 * One line, with credentials removed and the length bounded.
 *
 * Exported because it is the half worth testing directly: the ring is three lines of arithmetic and
 * this is where a mistake would be silent.
 */
export function scrubLine(line: string): string {
  let scrubbed = line;
  for (const pattern of REDACTIONS) {
    /*
      `$1` keeps the NAME of what was removed. `?token=[redacted]` tells a reader which parameter was
      dropped; `[redacted]` alone tells them only that something was, which is the difference between
      a usable log and a censored one.
    */
    scrubbed = scrubbed.replace(pattern, (...args: unknown[]) => {
      /*
        `typeof === 'string'` and NOT a truthiness check, which is the bug this shape exists to
        avoid and which it had: `String.replace` passes the match OFFSET as the second argument when
        the pattern has no capture group, so a truthy test let the index through and produced
        `grant failed 13[redacted]`. The JWT pattern has no group; the other two do.
      */
      const prefix = args[1];
      return typeof prefix === 'string' ? `${prefix}${REDACTED}` : REDACTED;
    });
  }
  return scrubbed.length > MAX_LINE
    ? `${scrubbed.slice(0, MAX_LINE)}… [${scrubbed.length} chars]`
    : scrubbed;
}

/**
 * Render one `console.*` argument list as a single line.
 *
 * `JSON.stringify` rather than `String(value)` for objects, because `String({})` is
 * `"[object Object]"` - which is the exact marker `room-renders.spec.ts` asserts must never reach a
 * page, and it is no more useful in a log. Circular structures throw, so that is caught and the
 * useless-but-honest fallback is used rather than losing the whole line.
 */
export function formatArguments(args: readonly unknown[]): string {
  return args
    .map((value) => {
      if (typeof value === 'string') return value;
      if (value instanceof Error) return `${value.name}: ${value.message}`;
      try {
        return JSON.stringify(value) ?? String(value);
      } catch {
        return String(value);
      }
    })
    .join(' ');
}

/**
 * A fixed-capacity list of lines, oldest dropped first.
 *
 * A plain array with a `shift()` rather than a true circular buffer with an index: at 500 entries
 * the copy `shift` performs is not measurable, and an index-and-wrap implementation is where
 * off-by-one bugs live. If this ever needs to hold 100,000 lines the shape should change; it does
 * not, because a presenter reads it in a textarea.
 */
export class DebugLogBuffer {
  readonly #lines: string[] = [];
  readonly #capacity: number;

  constructor(capacity: number = CAPACITY) {
    this.#capacity = Math.max(1, Math.floor(capacity));
  }

  /** How many lines are held right now. */
  get size(): number {
    return this.#lines.length;
  }

  /** Append one already-formatted line, scrubbed and truncated. */
  record(line: string): void {
    this.#lines.push(scrubLine(line));
    while (this.#lines.length > this.#capacity) this.#lines.shift();
  }

  /** Append a `console.*` argument list. */
  recordArguments(level: string, args: readonly unknown[], at: string): void {
    this.record(`${at} [${level}] ${formatArguments(args)}`);
  }

  /** The whole buffer as the textarea will show it: oldest first, one line each. */
  toText(): string {
    return this.#lines.join('\n');
  }

  /** Drop everything. Used when a member's session ends, so a log cannot outlive the room it is about. */
  clear(): void {
    this.#lines.length = 0;
  }
}
