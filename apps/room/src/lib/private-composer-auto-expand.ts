/**
 * `autoExpand(e)` for the private-chat composer — reference byte **2,203,228**.
 *
 * ```js
 * autoExpand(e) {
 *   e.style.height = "0";
 *   const i = window.getComputedStyle(e), o = e.scrollHeight + 2 + "px";
 *   i.getPropertyValue("height") !== o && (
 *     e.style.height = o,
 *     this.elementRef.nativeElement.querySelector(".pc-messages").style.height =
 *       `calc(100% - ${o} - 15px)`),
 *   "" === e.value.trim() && (
 *     e.style.height = "23px",
 *     this.elementRef.nativeElement.querySelector(".pc-messages").style.height =
 *       "calc(100% - 50px)")
 * }
 * ```
 *
 * **The `+ 2` is the capture's and it is not padding for luck.** Setting the height to exactly
 * `scrollHeight` leaves the content a hair taller than the box it was measured against, so the
 * browser puts a scrollbar inside an empty one-line composer. Those two pixels are the whole reason
 * the original does not have one.
 *
 * **THE SECOND HALF IS WHAT MAKES THIS DIFFERENT FROM THE MAIN COMPOSER'S.** `.pc-messages` is
 * `height: calc(100% - 50px)` — fifty pixels reserved for a one-line composer — so a composer that
 * grows without the log shrinking pushes the log's bottom off the panel, and the newest message
 * disappears exactly when somebody is replying to it. The `- 15px` is the reference's own gap.
 *
 * Reaching out of the component is what upstream does too (`this.elementRef.nativeElement
 * .querySelector`), and it is scoped the same way: `closest('app-privchat')` finds THIS panel's log
 * rather than the first one in the document.
 *
 * It lives here rather than in `PrivateChatComposer.svelte` because that file sits on a
 * `source-size-contract` ceiling, and the ratchet's own rule is that the explanation moves to the
 * code that owns it rather than being shaved to fit.
 */
export function autoExpandPrivateComposer(textarea: HTMLTextAreaElement): void {
  const log = textarea.closest('app-privchat')?.querySelector<HTMLElement>('.pc-messages') ?? null;

  textarea.style.height = '0';
  const height = `${textarea.scrollHeight + 2}px`;
  if (window.getComputedStyle(textarea).getPropertyValue('height') !== height) {
    textarea.style.height = height;
    if (log) log.style.height = `calc(100% - ${height} - 15px)`;
  }
  if (textarea.value.trim() === '') {
    textarea.style.height = '23px';
    if (log) log.style.height = 'calc(100% - 50px)';
  }
}
