/**
 * What Enter does in the CHAT composer — measured on BOTH compiled copies, not one.
 *
 * ## The reference, byte 1,439,821 (`app-chat`) and byte 2,386,131 (`app-extra-chat`)
 *
 * The two are the same function with a different selector, which is why both offsets are quoted:
 * a rule read off one copy of a component that ships twice is a rule half-measured.
 *
 * ```js
 * onKey(e) {                                                  // bound to (keyup) on const 64 / 61
 *   if (13 == e.keyCode) {
 *     e.preventDefault();
 *     this.showTyping && this.refreshTypingStatus(!0);        // ← EVERY Enter, before the branch
 *     const i = $("#textAreaTxt");
 *     e.shiftKey ? (i.val(i.val()), this.autoExpand(e.target))
 *     : e.altKey ? (i.val(i.val() + "\n"), this.autoExpand(e.target))
 *     : (this.showEmojiChooser = !1, this.sendMessage(), this.autoExpand(e.target))
 *   } else {
 *     this.showTyping && (0 === $("#textAreaTxt").val().trim().length
 *       ? this.refreshTypingStatus(!0)
 *       : this.updateLastTypedTime())
 *   }
 * }
 * onKeydown(e) { e.preventDefault() }                         // bound to (keydown.enter), 1,440,246
 * ```
 *
 * `onKeydown` is the half that is easy to miss and it changes what the other half means: the
 * browser's default is cancelled on **keydown** for every Enter, so no newline is ever inserted by
 * the browser in this box. `onKey` then runs on keyup and decides what happens instead.
 *
 * | keys | upstream |
 * | --- | --- |
 * | Enter | close the emoji panel, SEND, re-expand |
 * | Alt + Enter | append `"\n"` to the value, re-expand |
 * | Shift + Enter | **nothing** — `i.val(i.val())` is a self-assignment after `preventDefault` |
 *
 * ## The correction this module exists to record
 *
 * `inline-alert-key.ts` says, of the inline ALERT box's identical three-branch rule: *"One column
 * over, in the chat composer, **Shift+Enter is the newline**."* **The bundle says otherwise.** The
 * chat composer's `onKey` is the alert box's `onKey` with three extra side effects bolted on; the
 * key DECISION is character-for-character the same, Shift included. That sentence was written from
 * this repository's own behaviour rather than from the reference, and it is the shape `CLAUDE.md`
 * warns about — a comment claiming something the next line does not do.
 *
 * ## The one divergence, and it is deliberate
 *
 * **Shift + Enter still inserts a newline here**, at the CURSOR, by letting the browser do it.
 * Alt + Enter is transcribed and Enter is transcribed; Shift is not, for two measured reasons:
 *
 * 1. Upstream's Shift branch is `i.val(i.val())` — a self-assignment whose only observable effect
 *    is that the keystroke is swallowed. That is the same shape as `copyMessage`'s write-back
 *    (audit row RM-19) and `chat-reaction-hover` (RM-13): a line that does something rather than
 *    nothing only by accident. Reproducing it would take away this room's only way to type a
 *    second line at the cursor and give back a dead branch.
 * 2. Upstream's newline is `i.val(i.val() + "\n")` — appended at the **end of the value**, not at
 *    the caret. That is fine as an escape hatch and wrong as the only one: a member editing the
 *    middle of a message would have the newline land somewhere else. Alt+Enter reproduces the
 *    append faithfully because that is what upstream does; Shift+Enter keeps the caret behaviour
 *    because nothing upstream contradicts it once the swallow is declined.
 *
 * The audit row states what the owner has to decide if the two boxes are to agree. Until then the
 * divergence is here, in the module the room's own code reads, rather than in a document.
 *
 * ## The three side effects on the send path, and who owns each here
 *
 * ```js
 * e.preventDefault();
 * this.showTyping && this.refreshTypingStatus(!0);                 // ← 1. EVERY Enter
 * e.shiftKey ? … : e.altKey ? (i.val(i.val()+"\n"), autoExpand)    //   2. the ALT newline
 *   : (this.showEmojiChooser = !1, this.sendMessage(), autoExpand) //   3. close the emoji panel
 * ```
 *
 * **1 — the typing signal stops at Enter, not five seconds later.** `refreshTypingStatus(!0)` is
 * the FORCED form — the same call this room already makes from the composer's `blur` — and it runs
 * BEFORE the branch, so an Alt+Enter newline stops it too. Without it a member kept showing as
 * typing to everyone in the channel for up to five seconds after their message had already
 * arrived; `TypingSignal`'s debounce was the only thing that would ever have cleared it, and a
 * message landing is a better signal than a timer.
 *
 * **2 — ALT+Enter was posting the message.** This room sent on any Enter without Shift, so a member
 * reaching for upstream's newline modifier published instead of breaking the line. The `\n` is
 * appended to the END of the value rather than inserted at the caret, because that is what
 * `i.val(i.val() + "\n")` does; guessing a caret insertion would be inventing behaviour, and the
 * divergence below already covers the caret case.
 *
 * **3 — the emoji panel stayed open across a send.** `showEmojiChooser = !1` is on the SEND branch
 * alone — a newline does not close it — and this room's equivalent is the page-owned `menus`, so
 * that exactly one panel is open across every column at once.
 *
 * The wiring is `AlertChatArea.svelte`'s `handleComposerKey`; it is not restated here, and this is
 * not restated there.
 */

/**
 * The four outcomes.
 *
 * `'ignore'` and `'newline'` are the two that must never be collapsed: the first must NOT prevent
 * the browser's default (a plain letter has to reach the textarea, and Shift+Enter has to insert
 * its own newline at the caret), the second must, because the newline is appended by us.
 */
export type ChatComposerKeyAction = 'post' | 'newline' | 'ignore';

export interface ChatComposerKeyEvent {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
}

/**
 * What this keystroke means to the chat composer.
 *
 * Shift is tested BEFORE Alt, which is upstream's own order (`e.shiftKey ? … : e.altKey ? …`), so
 * Shift+Alt+Enter resolves to the Shift branch in both. Here that branch is `'ignore'` rather than
 * upstream's swallow — see the divergence above — and the ordering is still transcribed, because a
 * later reader comparing the two should find the same decision tree and one changed leaf.
 */
export function chatComposerKeyAction(event: ChatComposerKeyEvent): ChatComposerKeyAction {
  if (event.key !== 'Enter') return 'ignore';
  if (event.shiftKey) return 'ignore';
  return event.altKey ? 'newline' : 'post';
}

/**
 * Whether the browser's default must be prevented.
 *
 * NOT `action !== 'ignore'`, which is what `inline-alert-key.ts` can say because every Enter is
 * claimed there. Here Shift+Enter is deliberately left to the browser, so this asks the question
 * the caller actually has: is this room about to write the text itself?
 */
export function chatComposerKeyPrevents(action: ChatComposerKeyAction): boolean {
  return action !== 'ignore';
}
