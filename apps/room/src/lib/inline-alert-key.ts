/**
 * What Enter does in the INLINE ALERT box — and it is not what it does in chat.
 *
 * ## The reference, byte 2,047,478
 *
 * ```js
 * onKey(e) {
 *   if (13 == e.keyCode) {
 *     e.preventDefault();
 *     const i = $("#textAreaAlertTxt");
 *     if (e.shiftKey) i.val(i.val());                          // ← a NO-OP
 *     else {
 *       if (!e.altKey) return i.val().trim() && emit("inlineAlertEntry", i.val()),
 *                             i.val(""), i.height("23px"), !1;
 *       i.val(i.val() + "\n")                                  // ← ALT+Enter
 *     }
 *   }
 * }
 * ```
 *
 * Three outcomes, and the middle one is the reason this is a module rather than four lines inside
 * the component:
 *
 * | keys | outcome |
 * | --- | --- |
 * | Enter | POST, and empty the box |
 * | Alt + Enter | insert a newline |
 * | **Shift + Enter** | **nothing** — the default is prevented and the value reassigned to itself |
 *
 * `PCC-09` — **this paragraph used to hand the chat composer's Shift arm the newline, and the bundle
 * refutes that.** Byte 1,439,821 IS that composer:
 *
 * ```js
 * onKey(e){ if(13==e.keyCode){ e.preventDefault(), …; const i=li("#textAreaTxt");
 *   e.shiftKey ? (i.val(i.val()), this.autoExpand(e.target)) : e.altKey ? (…) }
 * ```
 *
 * `i.val(i.val())` is the SAME no-op this box performs. The contrast that justified a module was
 * never between the two boxes' Shift arms; it is between their SEND arms — one column over, the
 * five chat composers call `autoExpand` after clearing, and this one clears and re-heights.
 *
 * The sentence is not decorative and getting it wrong was not free: it is the argument a reader uses
 * to decide which box behaves how, and it sent one batch's composer to a third answer before the six
 * offsets were read together. Corrected 2026-08-31 from the bundle rather than from the neighbouring
 * component, which is what made it wrong the first time.
 *
 * The rule is still written down here rather than left as a branch inside an event handler, for the
 * reason that always applied: a branch in a handler can only be driven by a browser.
 *
 * ## Two things the POST branch does that are easy to collapse into one
 *
 * `i.val().trim() && emit(...)` is inside the guard; `i.val("")` is OUTSIDE it. So a box holding
 * nothing but spaces **empties without sending**. Returning the action and the text separately is
 * what lets the caller reproduce that: it always clears, and it only posts when there is something
 * to post.
 *
 * The text that travels is the RAW value, not the trimmed one — the trim is only the test. Leading
 * whitespace survives into the alert, exactly as it does through the modal, whose own composer
 * "deliberately does not trim inputs".
 */

/** The three outcomes, plus `'ignore'` for a key this box does not claim. */
export type InlineAlertKeyAction = 'post' | 'newline' | 'swallow' | 'ignore';

export interface InlineAlertKeyEvent {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
}

/**
 * What this keystroke means.
 *
 * `'swallow'` and `'ignore'` are deliberately different answers even though neither changes the
 * text: the first prevents the browser's default and the second must not. Collapsing them would put
 * a newline back into the box on Shift+Enter, which is the one behaviour this module exists to pin.
 */
export function inlineAlertKeyAction(event: InlineAlertKeyEvent): InlineAlertKeyAction {
  if (event.key !== 'Enter') return 'ignore';
  if (event.shiftKey) return 'swallow';
  return event.altKey ? 'newline' : 'post';
}

/** Whether the browser's default must be prevented — every Enter, whatever it then does. */
export function inlineAlertKeyPrevents(action: InlineAlertKeyAction): boolean {
  return action !== 'ignore';
}

/**
 * Whether a box holding this text actually sends when Enter is pressed.
 *
 * Separate from the clear, because the reference separates them: the guard is
 * `i.val().trim() && emit(...)` and the clear that follows is unconditional.
 */
export function inlineAlertPosts(text: string): boolean {
  return text.trim() !== '';
}
