/**
 * What Enter does in a CHAT COMPOSER — decoded from all six `onKey` implementations in the pinned
 * v4 bundle, by value, rather than from the one nearest the file being written.
 *
 * ## The six, at their byte offsets in `docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`
 *
 * | byte | textarea | component |
 * | ---: | --- | --- |
 * | 1,439,821 | `#textAreaTxt` | the main room chat composer |
 * | 2,047,549 | `#textAreaAlertTxt` | the inline alert box |
 * | 2,208,387 | `#textAreaTxtPM` | **private chat — this module's caller** |
 * | 2,319,787 | `#textAreaReplyTxt` | the reply modal |
 * | 2,336,560 | `#textAreaQATxt` | the alert Q&A modal |
 * | 2,386,131 | `#textAreaTxtExtra` | the extra-chat column |
 *
 * Five of the six are the same three lines, character for character apart from the jQuery alias and
 * the element id. This is the private composer's, at 2,208,387:
 *
 * ```js
 * onKey(e) {
 *   if (13 == e.keyCode) {
 *     e.preventDefault();
 *     const i = Ao("#textAreaTxtPM");
 *     e.shiftKey ? (i.val(i.val()), this.autoExpand(e.target))          // ← a NO-OP
 *       : e.altKey ? (i.val(i.val() + "\n"), this.autoExpand(e.target)) // ← ALT+Enter
 *       : (this.showEmojiChooser = !1, this.sendMessage(), this.autoExpand(e.target))
 *   }
 * }
 * ```
 *
 * | keys | outcome |
 * | --- | --- |
 * | Enter | close the emoji panel, SEND |
 * | Alt + Enter | insert a newline |
 * | **Shift + Enter** | **nothing** — the default is prevented and the value reassigned to itself |
 *
 * ## Why this is a module and not four lines inside the component
 *
 * Because the repository has now held **three** different opinions about that middle row, and each
 * of them was written by somebody who had read one composer and generalised.
 *
 * `PrivateChatComposer.svelte` treated Shift **and** Alt as the newline, so Shift+Enter put a line
 * break in a box where the capture puts nothing. `inline-alert-key.ts` has the branch right for the
 * box it owns, and its prose states — as the reason that box is different — that *"one column over,
 * in the chat composer, Shift+Enter is the newline"*. That sentence is false: byte 1,439,821 is the
 * chat composer and its shift arm is `i.val(i.val())`, the same no-op as the alert's. The odd one
 * out is not the alert's Shift branch at all; it is the alert's SEND branch, which clears the box
 * and resets its height where the five chat composers call `autoExpand` instead.
 *
 * A rule that three readers have each guessed differently is a rule that has to be executable.
 *
 * ## `'swallow'` and `'ignore'` are deliberately different answers
 *
 * Neither changes the text. The first must prevent the browser's default and the second must not —
 * collapse them and Shift+Enter puts the newline back, which is the one behaviour this module
 * exists to pin.
 */

/** The four outcomes. `'ignore'` is any key this composer does not claim. */
export type ComposerEnterAction = 'send' | 'newline' | 'swallow' | 'ignore';

/** The three fields of a `KeyboardEvent` this decision reads, and nothing else. */
export interface ComposerEnterEvent {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
}

/**
 * What this keystroke means in a chat composer.
 *
 * The order of the tests is the capture's own: `shiftKey` is asked FIRST, so Shift+Alt+Enter
 * swallows rather than inserting a newline. That falls out of a nested ternary upstream and is
 * preserved rather than tidied, because tidying it is how the branch drifted the first time.
 */
export function composerEnterAction(event: ComposerEnterEvent): ComposerEnterAction {
  if (event.key !== 'Enter') return 'ignore';
  if (event.shiftKey) return 'swallow';
  return event.altKey ? 'newline' : 'send';
}

/** Whether the browser's default must be prevented — every Enter, whatever it then does. */
export function composerEnterPrevents(action: ComposerEnterAction): boolean {
  return action !== 'ignore';
}
