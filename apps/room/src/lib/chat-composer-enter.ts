/**
 * What the Enter key does in a chat composer — ONE definition, because there were two and they
 * disagreed.
 *
 * ## The reference branches three ways, not two
 *
 * Every composer in the captured application routes Enter through the same shape. `app-extra-chat`'s
 * copy is `onKey` at bundle byte **2,386,131**:
 *
 * ```js
 * onKey(e){if(13==e.keyCode){e.preventDefault(), … ;
 *   const i=ui("#textAreaTxtExtra");
 *   e.shiftKey ? (i.val(i.val()), this.autoExpand(e.target))
 *   : e.altKey ? (i.val(i.val()+"\n"), this.autoExpand(e.target))
 *   : (this.showEmojiChooser=!1, this.sendMessage(), this.autoExpand(e.target))}
 *   else …}
 * ```
 *
 * and `app-alert-qa-modal`'s is the same branch, character for character apart from the field id, at
 * byte **2,336,560**. So the rule is: **Shift+Enter and Alt+Enter make a line break; a bare Enter
 * sends, and closes the emoji picker on its way.**
 *
 * ## Why it is a module and not two functions
 *
 * On 2026-08-31 the two composers this repository owns disagreed about it, in opposite directions:
 *
 * * `AlertQaModal.handleQaKeydown` had the alt case right (`if (event.shiftKey || event.altKey)
 *   return`) and carried a comment claiming the captured textarea *had no handler at all* — which
 *   the two offsets above refute.
 * * `ExtraChatPane.submitOnEnter` guarded on `event.shiftKey` alone, so **Alt+Enter sent the
 *   message** where the reference inserts a newline, and it left the emoji picker open across a
 *   send where `showEmojiChooser = !1` closes it.
 *
 * Two implementations of one captured rule, each looking correct in isolation, is the exact shape
 * `room-message-chrome.ts` records for the three private-messaging gates: *"three implementations,
 * one of them unfed, and the disagreement was invisible because each looked right on its own."* One
 * function is what stops the third composer inheriting whichever half its author happened to read.
 *
 * ## What it deliberately does NOT decide
 *
 * The **line break itself**. `'line-break'` means *let the browser do it*: the caller returns
 * without calling `preventDefault`, so the character lands at the caret and the undo stack survives.
 * Upstream appends `"\n"` to the whole field value instead, which puts the break at the END no
 * matter where the caret was and discards undo — `AlertQaModal` had already argued that divergence
 * and it is kept here rather than re-argued at each call site.
 *
 * The **keydown/keyup choice**, which is also a divergence and also deliberate. Upstream listens on
 * `keyup` and binds a second handler to `keydown.enter` — `onKeydown(e){e.preventDefault()}`, byte
 * **2,386,566** — purely to stop the browser inserting a newline before the keyup arrives. One
 * handler on `keydown` reaches the same end state with no second binding to keep in step, and it
 * behaves better under key repeat. This function takes the event either way; the caller picks.
 */

/**
 * `send` — a bare Enter: `preventDefault`, close the emoji picker, submit.
 * `line-break` — Shift or Alt is held: do nothing, and let the textarea insert the character.
 * `ignore` — not the Enter key at all.
 */
export type ComposerEnterAction = 'send' | 'line-break' | 'ignore';

/**
 * Structural rather than `KeyboardEvent`, so this is callable from a test without a DOM.
 *
 * Three fields and no more: reading the whole event here would let a caller pass something that
 * only looks like one, and `metaKey`/`ctrlKey` are deliberately absent because the reference tests
 * neither — a Ctrl+Enter sends, exactly as a bare Enter does.
 */
export interface ComposerEnterEvent {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

export function composerEnterAction(event: ComposerEnterEvent): ComposerEnterAction {
  if (event.key !== 'Enter') return 'ignore';
  return event.shiftKey || event.altKey ? 'line-break' : 'send';
}
