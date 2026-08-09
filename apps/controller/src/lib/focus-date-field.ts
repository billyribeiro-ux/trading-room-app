/**
 * Hands focus to a date field the moment it appears, and opens its picker.
 *
 * ## The defect this exists for
 *
 * The manage page's User Stats pane edits its two dates click-to-edit: an `<a>` at rest, swapped for
 * an `<input type="date">` on click. The swap happened and stopped there — the field never took
 * focus. Three things followed, and the third is the one that made it a trap rather than a
 * roughness:
 *
 *  1. the picker never opened, which is what the control exists for;
 *  2. nothing could be typed without a second click;
 *  3. **the row could not close.** Its only exits are `onchange` and `onblur`, and `blur` cannot
 *     fire on an element that never held focus. One click put the row into an edit state with no
 *     way out.
 *
 * ## Why this is a module rather than four lines in the component
 *
 * Same reason as `chrome.ts`: a function in a 2,000-line `.svelte` file cannot be unit-tested, and
 * this one has three branches that are all easy to get wrong and impossible to see in a review —
 * a browser without `showPicker`, a `showPicker` that throws, and the ordering of focus against it.
 *
 * ## Usage
 *
 * As an attachment, not an action. `{@attach focusDateField}` — the current Svelte docs list
 * `{@attach ...}` as the replacement for `use:` under "avoid legacy features", and an attachment
 * runs when the element is created, which is exactly when focus needs to move.
 */

/** The narrow slice of `HTMLInputElement` this needs, so a test can supply a plain object. */
export interface FocusableDateField {
  focus(): void;
  showPicker?: () => void;
}

export function focusDateField(node: FocusableDateField): void {
  /*
    Focus FIRST, and unconditionally.

    It is the half that fixes the stuck row, and it works in every browser and in every activation
    state. `showPicker` is the nicety on top; if the order were reversed, a throwing `showPicker`
    would take the focus down with it and leave the original defect in place.
  */
  node.focus();

  // A browser without the method is not a failure — the field is focused and typable.
  if (typeof node.showPicker !== 'function') return;

  try {
    node.showPicker();
  } catch {
    /*
      Spec'd to throw when the call is not user-activated, and that is not an error worth reporting.
      The field is focused and usable either way, and a browser declining to open a popup is a
      decision it is entitled to make.

      This is the only silent catch in this file and it is deliberately narrow: it wraps ONE call
      whose failure mode is known and benign. It is not a `.catch(() => {})` around a mutation.
    */
  }
}
