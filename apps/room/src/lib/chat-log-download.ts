/**
 * `downloadLogType("chat", false, range)` — the FILE, byte 1,416,419.
 *
 * ```js
 * const c = {year:"numeric",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"};
 * const W = new Date(B.t).toLocaleTimeString("en-us", c) + "[" + B.n + "]: " + B.txt + "\r\n";
 * …
 * const _ = new Blob(l, {type:"text/plain;charset=utf-8"}),
 *       F = ("chat" == s ? "ChatLog_" : "AlertsLog_") + (new Date).toDateString() + ".txt";
 * ```
 *
 * ## Why the text and the name are a module and the click is not
 *
 * Everything above is a pure function of the rows and a clock, and everything after it is four lines
 * of DOM. Splitting there is the same seam `chat-archive-log.svelte.ts` records for its own
 * `downloadLog()`: *"the file's TEXT. Writing it is the component's job; this is testable without a
 * DOM."*
 *
 * It matters more here than there, because this format has three details that are easy to
 * approximate and impossible to notice afterwards — `toLocaleTimeString` with DATE fields in its
 * options, no space before the bracket, and CRLF. A test that mounts a component to check them would
 * be testing the mount.
 *
 * ## The QA half is deliberately absent
 *
 * `downloadLogType`'s second parameter interleaves `"\r\nQA for \"…\": \n"` blocks, and it is only
 * ever `true` from the ALERTS dialog — `downloadLog("chat")` passes `!1`. Reproducing it here would
 * be building the alerts branch inside the chat one, for a field chat rows do not carry.
 */

/** One row as the file needs it — the reference's own three keys. */
export interface DownloadableChatMessage {
  /** `B.t` — epoch milliseconds. */
  readonly t: number;
  /** `B.n` — the sender's display name. */
  readonly n: string;
  /** `B.txt` — the message body, as text. */
  readonly txt: string;
}

/**
 * `c` — the format options, verbatim.
 *
 * DATE fields passed to `toLocaleTimeString`, which is the capture's own combination and looks like
 * a mistake until you run it: the method honours them, so each line carries the full date and the
 * time. A log spanning days is unreadable without it, which is presumably why.
 */
const LINE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
};

/**
 * One line per message, CRLF-terminated, in the capture's exact shape.
 *
 * `…toLocaleTimeString(…) + "[" + n + "]: " + txt` — **no space before the bracket**, unlike
 * `private-chat.svelte.ts`'s own transcription of `app-privchat`'s `downloadLog`, which has one
 * because ITS capture has one. Two downloads, two formats, and the difference is upstream's.
 */
export function chatLogFileText(messages: readonly DownloadableChatMessage[]): string {
  return messages
    .map(
      (message) =>
        `${new Date(message.t).toLocaleTimeString('en-us', LINE_TIME_FORMAT)}[${message.n}]: ${message.txt}\r\n`
    )
    .join('');
}

/**
 * `"ChatLog_" + (new Date).toDateString() + ".txt"`.
 *
 * `toDateString` and not `toLocaleDateString`: the first is fixed-format and always safe in a
 * filename (`Mon Sep 01 2026`), the second is locale-dependent and in most of Europe contains `/`.
 * Upstream chose the safe one; reproducing it is free and swapping it would break on a machine
 * nobody here uses.
 *
 * `now` is a parameter for the reason `mediaReplay`'s is: a function that reads the clock has a
 * different answer every run, and the only way to test it otherwise is to stub a global.
 */
export function chatLogFileName(now: Date = new Date()): string {
  return `ChatLog_${now.toDateString()}.txt`;
}
