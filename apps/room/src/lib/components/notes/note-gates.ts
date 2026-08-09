/** The separately gated notes tab/pane and authoring surface. */
export interface NoteSurfaceGates {
  readonly editorMounted: boolean;
  readonly surfaceVisible: boolean;
}

/**
 * Resolves note visibility from the room feature and authoring capability.
 * The editor cannot mount unless the containing notes surface is also enabled.
 */
export function resolveNoteSurfaceGates(input: {
  readonly canEditNotes: boolean;
  readonly notesEnabled: boolean;
}): NoteSurfaceGates {
  return {
    editorMounted: input.notesEnabled && input.canEditNotes,
    surfaceVisible: input.notesEnabled
  };
}
