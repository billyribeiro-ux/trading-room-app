import { tick } from 'svelte';

/*
  ── THE PRIVATE-CHAT LOG'S SCROLLING, EXTRACTED FROM `private-chat.svelte.ts` ─────────────────

  `app-privchatscroller`'s two scroll behaviours and the two numbers they turn on. They came out on
  2026-08-30 when the composer's image-upload path put that class past its ceiling, and the entry
  that raised it last had already named this as the seam: *"`scrollToBottom`, `#restoreAfterLoadMore`
  and the two constants are one concern that touches no other part of this class."*

  It holds NO state and reads none. Both functions take the element they act on — or find it — and
  the anchor id crosses as an argument rather than living here, because it belongs to the paging that
  produced it. That is what makes this a module and not a second class.
*/

/**
 * How long after the first scroll the second one fires — `setTimeout(…, 500)` at byte 2,192,880.
 *
 * Exported so the contract that guards it reads THIS value rather than restating the number, which
 * is how the two stop agreeing. It was 60 until 2026-08-30; see {@link scrollPrivateChatToBottom}.
 */
export const PRIVATE_CHAT_RESCROLL_MS = 500;

/**
 * How far to overscroll past the restored anchor after `Load More` — the reference's `- 20`.
 *
 * `scrollIntoView(true)` puts the anchor at the very top of the box, which hides the `Load More`
 * badge and the last line of the page just fetched. Exported for the same reason the delay is.
 */
export const LOAD_MORE_OVERSCROLL_PX = 20;

/** The panel's scroll box. One per document — the panel is a singleton floating window. */
function scroller(): Element | null {
  return document.querySelector('.pc-messages');
}

/**
 * `scrollPCLogToBottom` — scroll now, and again once the rows have settled.
 *
 * ```js
 * scrollToBottom(e = !1, i = !1) {                              // byte 2,192,880
 *   try {
 *     this.scrollRef.nativeElement.scrollTop = this.scrollRef.nativeElement.scrollHeight;
 *     const o = this;
 *     setTimeout(() => { o.scrollRef.nativeElement.scrollTop = o.scrollRef.nativeElement.scrollHeight }, 500)
 *   } catch {}
 * }
 * ```
 *
 * **The delay was 60ms and the reference's is 500.** The second scroll exists because the first runs
 * against a box whose height is not final: avatars are still loading, and a long message has not
 * wrapped yet. 60ms fires before either settles, so it re-scrolled to the same wrong place and a
 * conversation opened part-way up its own last message.
 *
 * `setTimeout` and not `tick()`, which is the opposite of {@link restoreAfterLoadMore}'s choice and
 * for the opposite reason: what is being waited for here is the BROWSER finishing layout after
 * images arrive, which Svelte does not know about and cannot await.
 */
export function scrollPrivateChatToBottom(): void {
  const run = () => {
    const box = scroller();
    if (box) box.scrollTop = box.scrollHeight;
  };
  run();
  setTimeout(run, PRIVATE_CHAT_RESCROLL_MS);
}

/**
 * Put the reader back where they were after `Load More` prepends older history.
 *
 * ```js
 * this.appService.appEventBus.subscribe("getPCLog", e => {          // byte 2,191,427
 *   this.isLoadingMore = !1,
 *   0 == e.length && (this.hasMoreData = !1, this.loadMoreLastID = ""),
 *   this.loadMoreLastID && (
 *     document.getElementById(this.loadMoreLastID).scrollIntoView(!0),
 *     this.scrollRef.nativeElement.parentElement.scrollTop =
 *       this.scrollRef.nativeElement.parentElement.scrollTop - 20)
 * })
 * ```
 *
 * Without it the older page is inserted above the viewport and the scroll position stays where it
 * was — which is now a different message — so a reader pressing `Load More` was thrown backwards
 * through history they had not read yet.
 *
 * **The `-20` is the reference's and it is not arbitrary.** `scrollIntoView(true)` aligns the anchor
 * to the very TOP of the box, which hides the `Load More` badge and the last line of the page just
 * fetched; twenty pixels of overscroll leaves both visible. Transcribed rather than tuned — it is a
 * number about the reference's own row height, and guessing a different one would be inventing a
 * value nobody can check.
 *
 * `CompactMessageRow` already emits `id="pcm-{message._id}"`, so the anchor existed all along and
 * nothing scrolled to it.
 *
 * After the render that inserted the rows, not before it — the anchor's new position does not exist
 * until then. `tick()` and not `setTimeout`: what is waited for is Svelte inserting the rows, which
 * it knows about exactly.
 */
export async function restoreAfterLoadMore(anchorId: string): Promise<void> {
  if (!anchorId) return;
  await tick();

  const anchor = document.getElementById(anchorId);
  if (!anchor) return;
  anchor.scrollIntoView(true);
  const box = scroller();
  if (box) box.scrollTop = box.scrollTop - LOAD_MORE_OVERSCROLL_PX;
}
