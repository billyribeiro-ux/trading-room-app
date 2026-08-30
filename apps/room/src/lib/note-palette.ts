/**
 * The note editor's four constant tables: font families, font sizes, line heights, and the colour
 * palette its two swatch grids are drawn from.
 *
 * ## Why these live in a module and not in the component
 *
 * `source-size-contract.test.ts` refused `NoteEditor.svelte` at its 1,700-line ceiling on
 * 2026-08-30, and the rule that ceiling carries is that a slice comes out rather than the number
 * going up. This is the slice with the cleanest seam in that file: ninety lines of pure data that
 * know nothing about Tiptap, about the toolbar's open menu, or about a note. Nothing here reads
 * component state and nothing here can, which is what makes moving it a move rather than a
 * refactor.
 *
 * ## WHAT IS EVIDENCED HERE, AND WHAT IS NOT — read this before "correcting" a value
 *
 * **None of it is in the pinned bundle, and that is not a defect.** The reference's editor is
 * summernote, configured at byte 1,468,553 with a toolbar list and nothing else — no palette, no
 * font list, no size list. Summernote itself is a separate script that the capture does not
 * include: `main.d1d09071be31f1ba.js` mentions the string `summernote` 37 times and contains the
 * library zero times, and the two sheets carry none of the sixty-four hex values below (searched
 * for `F7C6CE` and `9CC6EF` in `main.*.js`, `styles.*.css` and `css/complete-app-styles.css` —
 * zero hits in all three).
 *
 * So these are **summernote's own defaults**, which is what the reference's editor would have
 * rendered, carried here because our editor is not summernote and has no defaults of its own. They
 * are not a transcription and must not be cited as one. A row that wants to change one of them is
 * arguing about this room's editor, not about a captured value — which is a much cheaper argument
 * to have, and it should be had here rather than in a component that cannot say any of this.
 */

/** Summernote's `fontNames` default, minus the faces it filters out as unavailable. */
export const FONT_FAMILIES = [
  'Arial',
  'Arial Black',
  'Comic Sans MS',
  'Courier New',
  'Helvetica Neue',
  'Helvetica',
  'Impact',
  'Lucida Grande',
  'Tahoma',
  'Times New Roman',
  'Verdana'
] as const;

/** `fontSizes`, in points as summernote writes them. The editor appends `px` when it sets one. */
export const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '18', '24', '36'] as const;

/** `lineHeights`, unitless multipliers. */
export const LINE_HEIGHTS = ['1.0', '1.2', '1.4', '1.5', '1.6', '1.8', '2.0', '3.0'] as const;

/**
 * Sixty-four colours, in the order the two grids paint them.
 *
 * FLAT, and split into rows by {@link NOTE_PALETTE_ROWS} below rather than being written as eight
 * arrays. The order is the data; the row width is presentation, and writing it as eight literal
 * rows would put a layout decision in a place no layout can reach.
 */
export const NOTE_PALETTE = [
  '#000000',
  '#424242',
  '#636363',
  '#9C9C94',
  '#CEC6CE',
  '#EFEFEF',
  '#F7F7F7',
  '#FFFFFF',
  '#FF0000',
  '#FF9C00',
  '#FFFF00',
  '#00FF00',
  '#00FFFF',
  '#0000FF',
  '#9C00FF',
  '#FF00FF',
  '#F7C6CE',
  '#FFE7CE',
  '#FFEFC6',
  '#D6EFD6',
  '#CEDEE7',
  '#CEE7F7',
  '#D6D6E7',
  '#E7D6DE',
  '#E79C9C',
  '#FFC69C',
  '#FFE79C',
  '#B5D6A5',
  '#A5C6CE',
  '#9CC6EF',
  '#B5A5D6',
  '#D6A5BD',
  '#E76363',
  '#F7AD6B',
  '#FFD663',
  '#94BD7B',
  '#73A5AD',
  '#6BADDE',
  '#8C7BC6',
  '#C67BA5',
  '#CE0000',
  '#E79439',
  '#EFC631',
  '#6BA54A',
  '#4A7B8C',
  '#3984C6',
  '#634AA5',
  '#A54A7B',
  '#9C0000',
  '#B56308',
  '#BD9400',
  '#397B21',
  '#104A5A',
  '#085294',
  '#311873',
  '#731842',
  '#630000',
  '#7B3900',
  '#846300',
  '#295218',
  '#083139',
  '#003163',
  '#21104A',
  '#4A1031'
] as const;

/**
 * The same sixty-four, as eight rows of eight — one `.note-color-row` each.
 *
 * Computed once at module load rather than per render, and frozen by `as const` above it: the two
 * palettes in the editor are the same rows, so a component-local `Array.from` would build this
 * twice on every open of the colour dropdown and hand each grid a fresh array identity for an
 * each-block whose contents never change.
 */
export const NOTE_PALETTE_ROWS: readonly (readonly string[])[] = Array.from(
  { length: NOTE_PALETTE.length / 8 },
  (_unused, row) => NOTE_PALETTE.slice(row * 8, row * 8 + 8)
);
