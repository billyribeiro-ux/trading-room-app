/**
 * What an angular-xeditable trigger prints, and when it is italic.
 *
 * These two rules look like one rule and are not, which is how both of them were wrong at once.
 * They live here rather than inside `Editable.svelte` so the counts below can be asserted.
 *
 * ## The evidence
 *
 * Every `.editable-click` node on the reference's Settings tab, tallied by printed text against
 * whether it carries `editable-empty` (the class that supplies `font-style: italic`):
 *
 *     47 x  "empty"       editable-empty=true   italic=true
 *      1 x  "0"           editable-empty=true   italic=true
 *     76 x  "No"          editable-empty=false  italic=false
 *      7 x  "Yes!"        editable-empty=false  italic=false
 *      1 x  "1d"          editable-empty=false  italic=false
 *      2 x  "08-0..-2026" editable-empty=false  italic=false
 *
 * Two things fall out of that table:
 *
 * 1. **A checkbox prints `Yes!` with the exclamation mark, and `No` without one.** Ours printed a
 *    plain `Yes`. 7 nodes.
 *
 * 2. **Italic is FALSY-and-not-a-checkbox, which is not the same as blank.** `simUserCount: 0` is
 *    falsy, prints its digit rather than the word, and *is* italic. An unchecked checkbox is also
 *    falsy and is *not*. Testing blankness alone left the `0` upright; testing falsiness alone
 *    would have italicised all 76 `No`s.
 */

/** A value with nothing in it — the only case that prints the literal word `empty`. */
export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Whether the trigger carries `editable-empty`, and so renders italic.
 *
 * Note `0` is included and `false` is not: see the tally above.
 */
export function isEditableEmpty(value: unknown, isCheckbox: boolean): boolean {
  return !isCheckbox && !value;
}

/** Exactly the text the reference prints inside the link. */
export function editableText(
  value: unknown,
  isCheckbox: boolean,
  options?: readonly { readonly value: string; readonly text: string }[]
): string {
  if (isCheckbox) return value ? 'Yes!' : 'No';
  // a select shows its option's TEXT, not the stored value
  if (options) {
    const hit = options.find((o) => o.value === (value ?? ''));
    if (hit) return hit.text;
  }
  if (isBlank(value)) return 'empty';
  return String(value);
}
