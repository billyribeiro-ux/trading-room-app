import type { Attachment } from 'svelte/attachments';

/**
 * `dta-01` — flash the composer when Edit is pressed, for 500 ms.
 *
 * ```js
 * ii(".day-trade-alert-form").addClass("animated flash");
 * const s = setTimeout(() => {
 *   ii(".day-trade-alert-form").removeClass("animated flash"), clearTimeout(s) }, 500)
 *                                                              // bundle byte 1,988,722
 * ```
 * and the swing twin at 1,984,526, `.swing-alert-form`.
 *
 * ## What it is FOR, which the offset alone does not say
 *
 * The composer sits ABOVE a table that can be scrolled past it. Pressing Edit on row forty fills a
 * form the presenter cannot see, so without the flash the button reads as broken — they press it
 * again, and the second press overwrites the draft the first one made. That is the whole reason
 * upstream spends an animation on it.
 *
 * ## An attachment rather than an `$effect`, and rather than jQuery
 *
 * Svelte's own words: *"Attachments are functions that run in an effect when an element is mounted
 * to the DOM or when state read inside the function updates"*, and *"they can return a function that
 * is called before the attachment re-runs"*. So a nonce read at the call site gives both halves of
 * this for free — a re-press re-runs the attachment, and the cleanup cancels the previous timer
 * before it can strip the class off a flash that has only just started.
 *
 * That last part is why the nonce is a COUNTER and not a boolean. With a boolean, Edit pressed
 * twice inside 500 ms leaves the value already `true`, nothing re-runs, and the first timer ends the
 * second flash early — the presenter presses Edit, sees nothing, and is back to the defect.
 *
 * `0` is the "not yet" value: the attachment runs on mount and must not flash a form nobody asked
 * for.
 */
export function flashOnEdit(nonce: number): Attachment<HTMLElement> {
  return (node: HTMLElement) => {
    if (nonce === 0) return;
    node.classList.add('animated', 'flash');
    const timer = setTimeout(() => node.classList.remove('animated', 'flash'), 500);
    return () => {
      clearTimeout(timer);
      node.classList.remove('animated', 'flash');
    };
  };
}
