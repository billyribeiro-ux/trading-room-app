/**
 * Which image a paste carries — one rule, in one place.
 *
 * ## Why this is a module
 *
 * FOUR surfaces take a pasted screenshot: the chat composer (as of 2026-08-30), the post-alert
 * modal, the swing-alert form and the day-trade form. Three of them had their own copy of the same
 * eight-line loop, and **one of the three had drifted**:
 *
 * ```ts
 * // PostAlertModal, before this module — returns inside the loop
 * for (const item of Array.from(items)) {
 *   if (!item.type.startsWith('image')) continue;
 *   const file = item.getAsFile();
 *   if (!file) return;                 // ← and this abandons the whole paste on one bad item
 *   …
 *   return;                            // ← FIRST image wins
 * }
 * ```
 *
 * The reference keeps assigning and never breaks:
 *
 * ```js
 * let s = null;
 * for (const r of o) 0 === r.type.indexOf("image") && (s = r.getAsFile());   // byte 1,445,719
 * ```
 *
 * so the **LAST** image wins. That difference is not cosmetic: a paste from a screenshot tool
 * commonly carries several representations, and the reference's order is what resolves such a paste
 * to the one the OS considers primary. `PostAlertModal` picked a different one, silently, and
 * nothing could have noticed — both are files, both upload, both post.
 *
 * `if (!file) return` was the second drift in the same eight lines: an item whose `getAsFile()`
 * answers null abandoned the entire paste rather than being skipped, so one unreadable
 * representation could throw away a real screenshot sitting behind it.
 *
 * ## What it deliberately does NOT do
 *
 * No object URL, no dialog, no upload. Those differ per surface — chat posts into the room, the two
 * alert forms put the URL in a field — and folding them in here is what turned one rule into three
 * copies in the first place. This answers exactly one question.
 */

/**
 * The image a clipboard is offering, or `null`.
 *
 * @param items `event.clipboardData?.items` — absent on a paste the browser gives us nothing for,
 *   which is not an error and is why the parameter admits `undefined`.
 *
 * `startsWith('image')` and not `=== 'image/png'`: the reference tests
 * `0 === r.type.indexOf("image")`, which admits every image subtype the platform offers, and
 * narrowing it here would refuse a `image/webp` screenshot on a browser that produces one.
 *
 * A `for` loop rather than `[...items].filter(…).pop()`: `DataTransferItemList` is a live list and
 * `getAsFile()` is the call that materialises the bytes, so the loop shape keeps exactly one call
 * per image item and no intermediate array.
 */
export function pastedImageFrom(items: DataTransferItemList | undefined | null): File | null {
  if (!items) return null;
  let image: File | null = null;
  for (const item of items) {
    if (!item.type.startsWith('image')) continue;
    const file = item.getAsFile();
    /* SKIP, never abandon: one representation the platform cannot materialise must not throw away
       another sitting behind it. That `return` was a real divergence in `PostAlertModal`. */
    if (file) image = file;
  }
  return image;
}
