/**
 * The three date formatters every message renders with, built once for the page.
 *
 * They were declared in `RoomMessage.svelte`'s instance script, which runs once per rendered item —
 * one per alert and one per chat message, neither list windowed. Constructing an
 * `Intl.DateTimeFormat` is the expensive half of `Intl`: it resolves the locale and compiles the
 * pattern. Measured on node 24.19 (the same V8 as Chrome), warm, these exact three option shapes
 * cost ~20-25 microseconds each to construct against ~0.6 microseconds to `format()` with one
 * already built — roughly 35x.
 *
 * So a room mounting 400 items of history paid ~1,200 constructions to produce objects that are
 * byte-identical in every instance, and **at most one of the three is ever called per message**:
 * `longDateFormatter` only under the date separator, `alertDateFormatter` only on the alert branch,
 * `chatTimeFormatter` only on the chat branch. The other two were built dead, every time.
 *
 * Nothing about them depends on a prop — the locale is the literal `'en-US'` and every option is a
 * literal — so hoisting cannot change a single rendered string, and SSR and the client still agree
 * for the same reason they did before: the locale is pinned rather than taken from the environment.
 *
 * Found by the quality review of 2026-08-11. A `#lib` module rather than a `<script module>` block
 * because this tree has no `<script module>` anywhere, and one import reads like the rest of it.
 */

/** The date separator between days of history — "Monday, January 5, 2026". */
export const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

/** An alert's own timestamp — "1/5/26, 9:31 AM". */
export const alertDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: '2-digit',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

/** The time beside a chat line — "09:31". */
export const chatTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit'
});

/**
 * Angular's `date:'medium'` pipe, which for en-US is `MMM d, y, h:mm:ss a` — the Files pane's
 * uploaded-at column.
 *
 * Moved out of `+page.svelte`, where it called `toLocaleString` with an inline options object. That
 * constructs a new formatter on EVERY call, once per file per render, and this module exists
 * precisely because the four beside it are built once at module scope. It belonged here from the
 * start: a date formatter for this room, living in the file that holds the room's date formatters.
 */
export const mediumDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true
});

export function mediumDate(value: Date | string | number): string {
  return mediumDateFormatter.format(new Date(value));
}

/**
 * `chatMutedTill`, in the reference's own format.
 *
 * ```js
 * Ne(' till ', Ct(2, 1, e.chatMutedTill, 'EEE @ h:mm a'), '')
 * ```
 *
 * Angular's `EEE @ h:mm a` is short weekday, a literal ` @ `, then 12-hour time with minutes and
 * AM/PM. `Intl` cannot express the literal in one pattern — asking for weekday and time together
 * yields "Wed, 3:45 PM", with a comma where the capture has an at-sign — so the two parts are
 * formatted separately and joined. Composed rather than hand-rolled: the weekday name and the
 * 12-hour clock still come from `Intl`, which is what knows them.
 */
const mutedTillWeekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const mutedTillTime = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});

export function formatChatMutedTill(value: Date): string {
  return `${mutedTillWeekday.format(value)} @ ${mutedTillTime.format(value)}`;
}

/**
 * Whether two messages fall on the same calendar day — the date-separator rule.
 *
 * Lifted out of `+page.svelte` on 2026-08-14 with the extra chat column, for the reason
 * `RoomMessageItem` moved too: two panes draw separators now, and the rule has to be one rule.
 * `day-separator-contract.test.ts` still counts the CALLS in the page, which are unchanged.
 */
export function sameCalendarDay(current: Date, previous?: Date) {
  if (!previous) return false;
  return (
    current.getFullYear() === previous.getFullYear() &&
    current.getMonth() === previous.getMonth() &&
    current.getDate() === previous.getDate()
  );
}
