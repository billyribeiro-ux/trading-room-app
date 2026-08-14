/**
 * Is this message a mention of me?
 *
 * The reference's own rule, transcribed rather than approximated
 * (`main.d6d3c112b59b7d0d.js`, `isMention`):
 *
 * ```js
 * isMention(e) {
 *   this.myname || (this.myname = this.globals.user.name.toLowerCase());
 *   let i = e.txt.toLowerCase();
 *   return -1 != i.indexOf(`@${this.myname} `) || (-1 != i.indexOf('@all ') && e.isA)
 * }
 * ```
 *
 * Three details that a reasonable-looking `body.includes('@' + name)` gets wrong, and this room
 * got wrong in all three until 2026-08-14:
 *
 * 1. **Case-insensitive.** Both sides are lowercased. `@Bob` mentions `bob`.
 * 2. **A trailing SPACE is required.** `@bob ` matches; `@bobby` does not, and neither does `@bob`
 *    at the very end of a message. That last one looks like a bug and is load-bearing: without it
 *    every `@bobby` would ping bob, and the reference chose the false negative over the false
 *    positive. Reproduced exactly, including the end-of-message case.
 * 3. **`@all ` counts, but only from an admin.** `e.isA` is the message's own admin flag, so a
 *    member typing `@all ` pings nobody. That is the half most worth having: without it, a
 *    presenter addressing the room mentions no one at all.
 *
 * Pure, and separate from any component, because two callers need the SAME answer — the highlight
 * in `RoomMessage.svelte` and the popup in `+page.svelte`. Two copies of a rule this fiddly is how
 * one of them drifts.
 */
export function isMentionOf(
  body: string | null | undefined,
  viewerName: string | null | undefined,
  messageIsFromAdmin = false
): boolean {
  if (!body) return false;
  const text = body.toLowerCase();
  const name = viewerName?.trim().toLowerCase();
  /* `this.myname ||` — with no name there is nothing to match, and `@ ` would match everything. */
  if (name && text.includes(`@${name} `)) return true;
  return messageIsFromAdmin && text.includes('@all ');
}
