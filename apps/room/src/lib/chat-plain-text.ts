/**
 * The plain-text twin of a rich message, for every reader that never learns about `body_html`.
 *
 * The mention rule, the chat popup, the log search and the copy-to-clipboard all read `body`. The
 * server derives it the same way and ITS derivation is the authoritative one — this is the
 * optimistic copy the composer shows before the row comes back, so the two must agree, and
 * `chat-rich-text-contract` pins the server's.
 *
 * ## Why it is a module rather than a function inside `+page.svelte`
 *
 * It is pure, it has a twin it must agree with, and it was the only thing in a 13,000-line
 * component that could be tested for that agreement without mounting anything. Moving it out is
 * what paid for the growth the `changeChatMode`/`recordingState` conversion added to that file —
 * the ratchet in `source-size-contract.test.ts` asks for an extraction rather than a raised number,
 * and this is the extraction.
 *
 * ## The three steps, and why entities are left alone past `&nbsp;`
 *
 * Tags out, `&nbsp;` to a space, trim. `&nbsp;` is whitespace to a reader but NOT to `trim()`, so a
 * message of nothing but spacing would survive as a non-empty string without the middle step. No
 * other entity is decoded, because this feeds `body` — a value that is rendered as TEXT, where
 * `&amp;` reads correctly as typed and decoding it would be the start of an escaping round-trip
 * nobody asked for.
 *
 * ## THERE ARE TWO COPIES, NOT THREE — read 2026-08-17, corrected here 2026-08-28
 *
 * This paragraph said the server's own `body` derivation was *"very likely a third"* and that it
 * *"has NOT been read, so the count is not asserted here"*. It has been read, and it is not a third
 * copy: `sendMessage` calls THIS function (`chat-messages.remote.ts`), `editMessage` calls it
 * (`message-actions.remote.ts`), and the client's optimistic copy calls it (`composer.svelte.ts`).
 * One function, three consumers, which cannot disagree.
 *
 * The MEDIUM severity `TODO.md` row AF carried — a silent divergence between what a sender sees and
 * what the room stores — does not apply, and the row is closed.
 *
 * The only other copy is `isEmptyChatHtml` in `#lib/server/chat-html.ts`, which runs the identical
 * three steps to answer a DIFFERENT question: whether a sanitised message is empty. It stays
 * separate deliberately — see its own note — and `chat-rich-text-contract.test.ts:123-132` pins both
 * sides against drift.
 */
export function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}
