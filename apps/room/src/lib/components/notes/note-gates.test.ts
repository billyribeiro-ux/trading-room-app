import { describe, expect, test } from 'vitest';
import { resolveNoteSurfaceGates } from './note-gates';

describe('resolveNoteSurfaceGates', () => {
  test('exhaustively gates the notes surface and editor mount', () => {
    expect(
      [false, true].flatMap((notesEnabled) =>
        [false, true].map((canEditNotes) => ({
          canEditNotes,
          gates: resolveNoteSurfaceGates({ canEditNotes, notesEnabled }),
          notesEnabled
        }))
      )
    ).toEqual([
      {
        canEditNotes: false,
        gates: { editorMounted: false, surfaceVisible: false },
        notesEnabled: false
      },
      {
        canEditNotes: true,
        gates: { editorMounted: false, surfaceVisible: false },
        notesEnabled: false
      },
      {
        canEditNotes: false,
        gates: { editorMounted: false, surfaceVisible: true },
        notesEnabled: true
      },
      {
        canEditNotes: true,
        gates: { editorMounted: true, surfaceVisible: true },
        notesEnabled: true
      }
    ]);
  });
});
