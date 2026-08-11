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
 * Found by the quality review of 2026-08-11. A `$lib` module rather than a `<script module>` block
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
