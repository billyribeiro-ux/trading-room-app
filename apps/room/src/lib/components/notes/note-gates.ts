/** The separately gated notes tab/pane and authoring surface. */
export interface NoteSurfaceGates {
  readonly editorMounted: boolean;
  readonly surfaceVisible: boolean;
  /**
   * "Simplified Note Editor?" — the colour control is FOREGROUND ONLY.
   *
   * On the same object as the other two because it answers the same question — *what shape is the
   * notes surface in this room?* — and because it then costs the page nothing: `noteGates` already
   * travels to `PresentationArea` whole, so a third field crosses on the wire that is already there
   * rather than as a fourth prop. That is the `buildMessageChrome` argument at one third the size.
   */
  readonly simplifiedEditor: boolean;
}

/**
 * The room facts that decide the notes surface, as the page's `data` already holds them.
 *
 * Declared structurally rather than importing the load type, for the reason `MessageChromeSettings`
 * gives next door: this is shared client code and that type lives behind `$lib/server`. Listing the
 * keys is also the more honest shape — it says on its face which facts the notes surface depends on,
 * and a fourth cannot arrive without appearing here.
 */
export interface NoteSurfaceSources {
  readonly canEditNotes: boolean;
  readonly notesEnabled: boolean;
  /** The room's settings, or absent. Absent means off, like every other setting read in this room. */
  readonly sessData: { readonly simplifiedEditor?: boolean } | null | undefined;
}

/**
 * Resolves note visibility from the room feature and authoring capability.
 * The editor cannot mount unless the containing notes surface is also enabled.
 *
 * ## `simplifiedEditor`, and the one thing the capture cannot tell us
 *
 * The reference spends this setting in exactly one place, byte 1,468,503:
 *
 * ```js
 * this.isSimplifiedEditor = this.appService.globals.sessData.simplifiedEditor ? "forecolor" : "color"
 * ```
 *
 * …and then hands that string to Summernote as the only member of the toolbar's `["color", [ … ]]`
 * group. It is never a boolean downstream. One occurrence in the whole bundle, read rather than
 * searched for and assumed.
 *
 * **Summernote is not in the capture.** The vendor that turns those two names into DOM is a separate
 * bundle this repository does not hold, so the exact markup each one produces is UNEVIDENCED. That
 * is stated here rather than glossed, because everything else in this room's note editor was matched
 * against captured markup and this one thing cannot be.
 *
 * What the captured stylesheet DOES decide, from `styles.ee2a710065b60389.css`:
 *
 * ```css
 * .note-color-all .note-dropdown-menu               { min-width: 337px }
 * .note-color .note-dropdown-menu .note-palette     { width: 160px }
 * .note-color .note-dropdown-menu .note-palette:first-child { margin: 0 5px }
 * ```
 *
 * Two 160px palettes side by side inside a 337px menu, a `:first-child` rule that only means
 * anything with more than one palette, and an `-all` suffix that only means anything if a not-all
 * case exists. Together with a button literally named `forecolor`, that is enough to decide the
 * SHAPE: simplified is the foreground-only case, one palette, without `note-color-all`.
 *
 * ## The one decision taken beyond the evidence, named as a decision
 *
 * The quick swatch beside the dropdown applies a BACKGROUND colour in the full control. When the
 * background palette goes, that button is the only background affordance left in an editor whose
 * background colouring was just removed — a control whose effect nothing else in the toolbar can
 * undo. So it applies the text colour instead in the simplified case.
 *
 * That is this repository's call, not a transcription, and it is written here so nobody later reads
 * it as evidenced. The alternative — leaving a background applier behind — reproduces no known
 * upstream behaviour either, and is incoherent besides.
 */
export function resolveNoteSurfaceGates(input: NoteSurfaceSources): NoteSurfaceGates {
  return {
    editorMounted: input.notesEnabled && input.canEditNotes,
    surfaceVisible: input.notesEnabled,
    // `=== true` like every other setting read in this room: `sessData` is JSON off the wire.
    simplifiedEditor: input.sessData?.simplifiedEditor === true
  };
}
