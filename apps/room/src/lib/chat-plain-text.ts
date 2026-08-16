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
 * `isEmptyChatHtml` in `#lib/server/chat-html.ts` runs the identical three steps to answer a
 * different question — whether a sanitised message is empty. That is a second copy, and the server's
 * own `body` derivation on the message-send path is very likely a third; it has NOT been read, so
 * the count is not asserted here. Recorded as **`TODO.md` row AF** rather than merged on a guess:
 * the two that were read have different jobs, and proving they must stay identical needs the
 * authoritative one read end to end first.
 */
export function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}
