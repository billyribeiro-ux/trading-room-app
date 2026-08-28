import { describe, expect, test } from 'vitest';
import { resolveNoteSurfaceGates } from './note-gates';

describe('resolveNoteSurfaceGates', () => {
  test('exhaustively gates the notes surface and editor mount', () => {
    expect(
      [false, true].flatMap((notesEnabled) =>
        [false, true].map((canEditNotes) => ({
          canEditNotes,
          gates: resolveNoteSurfaceGates({ canEditNotes, notesEnabled, sessData: null }),
          notesEnabled
        }))
      )
    ).toEqual([
      {
        canEditNotes: false,
        gates: { editorMounted: false, simplifiedEditor: false, surfaceVisible: false },
        notesEnabled: false
      },
      {
        canEditNotes: true,
        gates: { editorMounted: false, simplifiedEditor: false, surfaceVisible: false },
        notesEnabled: false
      },
      {
        canEditNotes: false,
        gates: { editorMounted: false, simplifiedEditor: false, surfaceVisible: true },
        notesEnabled: true
      },
      {
        canEditNotes: true,
        gates: { editorMounted: true, simplifiedEditor: false, surfaceVisible: true },
        notesEnabled: true
      }
    ]);
  });
});

/*
  `simplifiedEditor` FAILS CLOSED, and the table below is the whole reason to test a one-line read.

  `sessData` is JSON off the wire. A room that has never been configured sends nothing; an owner who
  unticks the box sends `false`; and a wire that has been through a form encoder or a permissive
  parser can send the STRING `"false"`, a `0`, or an object. Only a real `true` may simplify the
  toolbar, because the setting REMOVES a control a presenter otherwise has — the background colour
  palette — and a truthy `"false"` would take it away from every room that ever turned the setting
  off.
*/
describe('simplifiedEditor is read strictly', () => {
  const resolve = (simplifiedEditor: unknown) =>
    resolveNoteSurfaceGates({
      canEditNotes: true,
      notesEnabled: true,
      sessData: { simplifiedEditor } as { simplifiedEditor?: boolean }
    }).simplifiedEditor;

  test('a real true simplifies the toolbar', () => {
    expect(resolve(true)).toBe(true);
  });

  test.each([false, undefined, null, 0, 1, '', 'false', 'true', {}, []])(
    'refuses %o, so the full colour control stays',
    (value) => {
      expect(resolve(value)).toBe(false);
    }
  );

  test('an absent sessData is an unconfigured room, not an error', () => {
    for (const sessData of [null, undefined]) {
      expect(
        resolveNoteSurfaceGates({ canEditNotes: true, notesEnabled: true, sessData })
          .simplifiedEditor
      ).toBe(false);
    }
  });
});
