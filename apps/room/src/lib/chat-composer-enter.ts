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
 * ## THAT TABLE IS RIGHT FOR TWO OF THE SIX, AND THE HANDLER IS NOT WHAT DECIDES IT
 *
 * Re-measured 2026-09-02, from the CONST TABLES rather than the handlers. The five identical
 * handlers above are identical; the BINDINGS are not, and the binding is what makes
 * `e.preventDefault()` mean something:
 *
 * | textarea | const at | binding section |
 * | --- | ---: | --- |
 * | `textAreaTxt` | 1,451,244 | `3,"keyup","paste","keydown.enter","focus"` |
 * | `textAreaTxtExtra` | 2,397,231 | `3,"keyup","paste","keydown.enter","focus"` |
 * | `textAreaAlertTxt` | 2,055,692 | `3,"keyup","paste"` |
 * | `textAreaTxtPM` | 2,217,289 | `3,"keyup","paste","focus"` |
 * | `textAreaReplyTxt` | 2,324,702 | `3,"keyup","paste"` |
 * | `textAreaQATxt` | 2,342,122 | `3,"keyup","paste","placeholder"` |
 *
 * Only the first two carry `keydown.enter`, and what it calls is a whole method:
 *
 * ```js
 * onKeydown(e) { e.preventDefault() }        // bytes 1,440,246 and 2,386,566 — the only two
 * ```
 *
 * So for those two the newline is killed on the way DOWN, `onKey` then runs on the way up, and its
 * shift arm's no-op reassignment genuinely leaves the box unchanged. **Shift+Enter does nothing** —
 * exactly as the table says.
 *
 * For the other four there is no keydown handler at all. The browser inserts the newline, `onKey`
 * runs on keyup, and `e.preventDefault()` there is INERT — a keyup cannot un-insert a character.
 * So:
 *
 * | keys | keyup-only composers |
 * | --- | --- |
 * | Enter | the newline lands, then `sendMessage()` — which `.trim()`s it away (byte 2,208,062), so this is indistinguishable from the other two |
 * | **Shift + Enter** | **a newline** — the browser's, which the no-op reassignment preserves |
 * | **Alt + Enter** | **TWO newlines** — the browser's, plus the explicit `+ "\n"` |
 *
 * The Alt row is an upstream defect and is reproduced; the Shift row is what a user expects anyway
 * and is what four of the six actually do.
 *
 * **The lesson is the reason this paragraph is long.** The previous decoding read all six handlers
 * by value, found five identical, and concluded the rule. It was one input short: a handler that
 * prevents a default says nothing until you know which event it is bound to. Three readers had
 * already guessed this rule differently; the fourth reading was executable and still wrong, because
 * executable is not the same as complete.
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

/**
 * WHICH EVENTS THE REFERENCE BINDS ON THIS COMPOSER — the input this module used to be missing.
 *
 * `'keydown-and-keyup'` is the two composers whose const carries `keydown.enter`, whose handler is
 * `onKeydown(e){e.preventDefault()}`: the newline never reaches the box.
 *
 * `'keyup-only'` is the other four: the browser has already inserted the newline before the handler
 * runs, and nothing can take it back.
 */
export type ComposerEnterBinding = 'keydown-and-keyup' | 'keyup-only';

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
export function composerEnterAction(
  event: ComposerEnterEvent,
  binding: ComposerEnterBinding = 'keydown-and-keyup'
): ComposerEnterAction {
  if (event.key !== 'Enter') return 'ignore';
  if (event.shiftKey) {
    /*
      The only row the binding changes, and it changes it completely.

      On a `keydown-and-keyup` composer the reference has already killed the newline, and the shift
      arm's `i.val(i.val())` leaves the box as it was — so this handler must prevent the default and
      do nothing, which is `'swallow'`.

      On a `keyup-only` composer the newline is in the box before this runs. `'ignore'` is the
      answer, not `'swallow'`: the two exist as separate outcomes precisely because one prevents the
      default and the other does not, and preventing it here would take away a newline the reference
      keeps.
    */
    return binding === 'keyup-only' ? 'ignore' : 'swallow';
  }
  return event.altKey ? 'newline' : 'send';
}

/**
 * Whether the browser's default must be prevented.
 *
 * The `binding` is required for the same reason it is above: on a `keyup-only` composer NOTHING can
 * be prevented — the character landed on keydown — so this answers false for every action there.
 *
 * A caller that prevents anyway is not merely writing a no-op: `preventDefault()` on a keyup is
 * inert, so the line would tell the next reader the newline is being swallowed when it is not, which
 * is exactly the misreading this module was one input short of.
 */
export function composerEnterPrevents(
  action: ComposerEnterAction,
  binding: ComposerEnterBinding = 'keydown-and-keyup'
): boolean {
  if (binding === 'keyup-only') return false;
  return action !== 'ignore';
}
