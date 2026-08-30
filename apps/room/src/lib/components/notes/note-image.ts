import Image from '@tiptap/extension-image';

/*
  ── THE IMAGE POPOVER'S FOUR GROUPS, `note-editor-image-popover` ─────────────────────────────────

  ```js
  popover: { image: [                                           // reference byte 1,469,073
    ["custom", ["imageAttributes"]],
    ["image",  ["resizeFull","resizeHalf","resizeQuarter","resizeNone"]],
    ["float",  ["floatLeft","floatRight","floatNone"]],
    ["remove", ["removeMedia"]]
  ]}
  ```

  Once an image was in a note there was NO WAY to resize it, float it or remove it — only a raw text
  delete. The four group names are what the capture evidences; summernote itself is not in the
  bundle, so the popover's markup and the `imageAttributes` plugin's dialog are NOT evidenced, and
  neither is invented here. `NoteEditor.svelte` carries what was built and what was not.

  ## Why the width is an ATTRIBUTE and the float is a STYLE

  Because that is what survives `safe-html.ts`, and the sanitizer is the authority on what a note can
  contain — not this extension. `img` already admits a `width` attribute there; it did not admit a
  `float` declaration, which is why adding one is a deliberate, argued widening recorded at that
  file rather than a side effect of this one.

  Summernote's own `resizeFull` writes `width: 100%` as a style. Writing the attribute instead is a
  divergence with a reason: our sanitizer's `img` style allow-list admits `width: 100%` and nothing
  else, so `50%` and `25%` would have been stripped on the way back in and the control would have
  been one that changes nothing — the defect class this repository removes rather than adds.
*/

/** `resizeFull` / `resizeHalf` / `resizeQuarter` / `resizeNone`, by the names the capture gives. */
export const IMAGE_WIDTHS = [
  { command: 'resizeFull', label: '100%', width: '100%' },
  { command: 'resizeHalf', label: '50%', width: '50%' },
  { command: 'resizeQuarter', label: '25%', width: '25%' },
  /* `resizeNone` is the ABSENCE of a width, not a width of "auto" — the image goes back to its own. */
  { command: 'resizeNone', label: 'Auto', width: null }
] as const;

/** `floatLeft` / `floatRight` / `floatNone`. `floatNone` clears, for the same reason. */
export const IMAGE_FLOATS = [
  { command: 'floatLeft', label: 'Left', float: 'left' },
  { command: 'floatRight', label: 'Right', float: 'right' },
  { command: 'floatNone', label: 'None', float: null }
] as const;

/** The three values `float` may take. Narrow by construction, and the sanitizer re-checks it. */
const FLOAT_VALUES = new Set(['left', 'right', 'none']);

/**
 * `@tiptap/extension-image` plus the two attributes the popover's groups operate on.
 *
 * `...this.parent?.()` first, so `src`, `alt` and `title` are kept rather than replaced — dropping
 * them would silently strip every existing image's alt text on the next save.
 *
 * Both `parseHTML` functions have to be able to read what `renderHTML` wrote, or a note round-trips
 * to nothing: the editor serializes to HTML on save and re-parses it on open, so an attribute that
 * renders but does not parse survives exactly until the note is reopened.
 */
export const NoteImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('width'),
        renderHTML: (attributes: Record<string, unknown>) =>
          typeof attributes.width === 'string' && attributes.width !== ''
            ? { width: attributes.width }
            : {}
      },
      float: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const value = element.style.float;
          return FLOAT_VALUES.has(value) ? value : null;
        },
        renderHTML: (attributes: Record<string, unknown>) =>
          typeof attributes.float === 'string' && FLOAT_VALUES.has(attributes.float)
            ? { style: `float: ${attributes.float}` }
            : {}
      }
    };
  }
});
