/**
 * Which of the room's shared files the note editor's image browser offers.
 *
 * ## The reference, byte 1,477,053
 *
 * ```js
 * openFileBrowser(e) {
 *   this.fileBrowserTargetIndex = e, this.fileBrowserImages = [], this.fileBrowserLoading = !0,
 *   this.fileBrowserModalRef = this.modalService.open(this.fileBrowserModal, {…}),
 *   this.httpClient.post(`${apiROOT}/sessions/v2/cmd`,
 *     { tok: …, cmd: "getSessionFiles", uploadType: "files" }).subscribe({
 *       next: o => { this.fileBrowserLoading = !1,
 *         o?.success && o.files && (this.fileBrowserImages = o.files.filter(
 *           s => s.contentType?.includes("image/"))) }
 *     })
 * }
 * ```
 *
 * ## `includes`, not `startsWith`, and that is transcribed rather than tightened
 *
 * `s.contentType?.includes("image/")` matches anywhere in the string, so a stored type of
 * `application/x-image/thing` would be offered. It reads like a mistake and it is the shipped
 * filter; narrowing it to `startsWith` would silently drop a file the reference shows, and the
 * consequence of the loose version is at worst a broken thumbnail in a grid the presenter chose to
 * open.
 *
 * The optional chain is transcribed too: a row with no `contentType` is skipped rather than throwing.
 * This room's column is `NOT NULL` with a default, so that case is unreachable here — kept because
 * the list arrives as JSON on the page payload and "unreachable" is a claim about our writer.
 *
 * ## Why this room does not fetch
 *
 * The reference asks its server every time the browser opens. The page load here already carries
 * `data.sharedFiles` — the same rows the Files pane renders — and every upload path calls
 * `invalidateAll()`, so the list is current without a second read of data the page is already
 * holding. The consequence is named at the modal: the reference's `Loading images...` state cannot
 * occur here, so it is not drawn, because a branch that can never render is a branch that can never
 * be checked.
 */

/** One shared file, as much of it as this filter needs. */
export interface SessionFileRow {
  readonly name: string;
  readonly url: string;
  readonly contentType?: string | null;
}

/** One offered image — the thumbnail's source and its caption. */
export interface SessionImageFile {
  readonly name: string;
  readonly url: string;
}

/**
 * The images among a room's shared files, in the order the page supplies them.
 *
 * Order is the page's (`orderBy(asc(sharedFiles.createdAt))`), not re-sorted here: the Files pane
 * shows the same rows in the same order, and a browser that disagreed with the pane it is browsing
 * would be its own small confusion.
 */
export function sessionImageFiles(
  files: readonly SessionFileRow[] | null | undefined
): SessionImageFile[] {
  if (!files) return [];
  return files
    .filter((file) => file.contentType?.includes('image/'))
    .map((file) => ({ name: file.name, url: file.url }));
}
