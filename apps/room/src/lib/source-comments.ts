/**
 * A source file with its comments removed — correctly, and in ONE place.
 *
 * ## Why every contract test needs this
 *
 * A source assertion that runs over raw text can be satisfied by PROSE. This repository has met that
 * four times: `evidence-gap-register-counts` counted matches across a whole table row,
 * `dead-export-contract` counted a symbol named in a comment as a reader, and two contract tests
 * quoted the very line they were asserting was gone. So a contract test that reads a file strips its
 * comments first.
 *
 * ## Why the obvious implementation is WRONG for a `.svelte` file
 *
 * This was measured on this repository on 2026-08-29, by `orphan-component-contract.test.ts`, and
 * the prose below is that file's — moved here rather than restated, because two descriptions of one
 * rule is how one of them goes stale.
 *
 * The obvious implementation runs `/\*[\s\S]*?\*\//` over the whole file. In a Svelte file that is
 * wrong, because the TEMPLATE is not JavaScript and `/*` there is usually not a comment at all:
 *
 * ```svelte
 * <input accept="image/*" ... />
 * ```
 *
 * That `/` and `*` open a "comment" the regex then closes at the next real one — thousands of
 * characters later — and everything between is deleted. **Four of this room's `.svelte` files carry
 * a `/*` glued to a preceding character**: `NoteEditor`, `ImageUploadDialog`, `PostAlertModal` and
 * `RoomOverlays`.
 *
 * It fails silently in the dangerous direction. A `toContain` fails loudly, which is how it keeps
 * being found; a `not.toContain` **passes for a defect that is still there**.
 *
 * ## The rule, which is about where the syntax is in force
 *
 * `/* … *\/` and `//` are JavaScript and CSS comment syntax. In a Svelte file that syntax exists only
 * inside `<script>` and `<style>`; the template's comments are `<!-- -->` and nothing else. So markup
 * comments are removed everywhere, and JS-style comments are removed **only within those two
 * blocks**. An `accept="image/*"` in the template is then what it actually is: an attribute value.
 *
 * ## Why it is a module and not a helper in the test that needs it
 *
 * It was one. `orphan-component-contract.test.ts` owned the correct implementation and every other
 * contract test carried the naive two-liner — including one written on 2026-08-30, which lost half
 * of `NoteEditor.svelte` before the loud half of the failure caught it. A rule that is correct in
 * one file and wrong in eighty-two is a rule that lives in the wrong place.
 *
 * The eighty-two are NOT rewritten here, and the reason is measured rather than assumed: across
 * every source file in `src/`, `NoteEditor.svelte` is the only one where the naive strip removes
 * code (8,267 characters). `orphan-component-contract.test.ts` carries the tripwire that fails when
 * a second such file appears.
 */

/** A `.ts` file with its comments removed. */
export function tsCodeOf(source: string): string {
  return (
    source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      /* `[^:]` so `https://` survives — the same guard `dead-export-contract.test.ts` uses. */
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
  );
}

/** A `.svelte` file with its comments removed. See the module note for why this is not `tsCodeOf`. */
export function svelteCodeOf(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(
      /(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2>)/g,
      (_match, open: string, _tag: string, body: string, close: string) =>
        open + tsCodeOf(body) + close
    );
}

/**
 * A source file with its comments removed, chosen by EXTENSION.
 *
 * ## Why this exists, and the trap it closes
 *
 * The two functions above are not interchangeable, and the failure is silent in the worse direction.
 * {@link svelteCodeOf} applied to a `.ts` file strips only `<!-- -->` — a `.ts` file has none — so
 * **every JavaScript comment in it survives**. A gate that reads the result then counts prose as
 * code, which is the false-WEARER half of the same defect this module exists for, and the half that
 * reports a clean sweep while measuring nothing.
 *
 * `orphan-style-contract.test.ts` reads a corpus of both kinds and reached for `svelteCodeOf` for
 * all of it on 2026-08-30, one minute after the naive stripper had produced a false orphan there.
 * One rule, two file types, one dispatch — rather than each caller remembering which is which.
 */
export function codeOf(path: string, source: string): string {
  return path.endsWith('.svelte') ? svelteCodeOf(source) : tsCodeOf(source);
}
