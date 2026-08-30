import { noteVersionRevertMessage } from './components/notes/version-history';
import type { NoteVersion, RoomNote } from './types.js';

/**
 * EVERY DIALOG THE NOTES PANE RAISES, AND THE CAPTURED SENTENCE EACH ONE ASKS.
 *
 * ## Why they left the component
 *
 * `source-size-contract.test.ts` refused `NotesPane.svelte` at its 525-line ceiling on 2026-08-30,
 * and that ceiling's rule is that a slice comes out rather than the number going up. This is the
 * slice, and it is a better home than the one it left: six captured strings and one interpolated
 * one, scattered through a component in the order the handlers happened to be written, are now one
 * list with their byte offsets beside them. A seventh dialog added to the pane has an obvious place
 * to go, and a reader asking *"what exactly does this room ask before it deletes a note"* has one
 * file to open.
 *
 * Nothing here is reactive and nothing here reads component state. Each function returns a VALUE
 * describing a dialog; the pane assigns it and `BootboxDialog` draws it. That is what makes the
 * strings testable without rendering a pane, which is what `note-dialogs.test.ts` does.
 *
 * ## The strings are transcriptions and their punctuation is evidence
 *
 * `'Are you sure you want to apply this note as Welcome Mat'` has no full stop; the all-rooms twin
 * has a question mark. That asymmetry is upstream's, at byte 1,474,217, and it is the shape a
 * "consistency" pass silently corrects. The literal types below are what refuse it: a changed
 * sentence is a type error at the call site, not a diff nobody reads.
 */

/** A `bootbox.prompt` — a title and a starting value, and the pane's own kind tag. */
export type NotePrompt =
  | { kind: 'new'; title: 'New Note name:'; value: '' }
  | { kind: 'rename'; noteId: number; title: 'Change note name'; value: string }
  /*
    The all-rooms welcome mat's password — `note-editor-welcome-mat-all-rooms-password`.

    The title is the reference's verbatim, at byte 1,474,217. It is a PROMPT and not a confirm
    because upstream raises a different dialog for each: a password when `allRoomsWelcomeMatPW` is
    configured and a plain confirmation when it is not. This room cannot see that setting, so
    `welcomeMatPasswordRequired` asks the controller which one to raise.
  */
  | {
      kind: 'welcome-password';
      noteId: number;
      title: 'Please enter the password to replace all the rooms Welcome Mats:';
      value: '';
    };

/** A `bootbox.confirm` — one sentence and what to do if the answer is yes. */
export type NoteConfirm =
  | { kind: 'delete'; noteId: number; message: 'Are you sure you want to delete this note?' }
  /*
    The one confirmation whose text is not a fixed string: `revertToVersion` in the reference
    interpolates the version's own date into it, so the message is built by
    `noteVersionRevertMessage` from the same value the row displays.
  */
  | { kind: 'restore'; noteId: number; versionId: number; message: string }
  | {
      kind: 'welcome';
      noteId: number;
      allRooms: boolean;
      message:
        | 'Are you sure you want to apply this note as Welcome Mat'
        | 'Are you sure you want to replace all the rooms Welcome Mats with this note?';
    };

/** `newNote()` — the strip's cog and the empty state both raise this one. */
export const newNotePrompt = (): NotePrompt => ({
  kind: 'new',
  title: 'New Note name:',
  value: ''
});

/** `renameTab(name, id)` — opened from the tab's own dropdown and from double-clicking its title. */
export const renamePrompt = (note: RoomNote): NotePrompt => ({
  kind: 'rename',
  noteId: note.id,
  title: 'Change note name',
  value: note.name
});

/** The all-rooms password, raised only when the controller says one is configured. */
export const welcomePasswordPrompt = (noteId: number): NotePrompt => ({
  kind: 'welcome-password',
  noteId,
  title: 'Please enter the password to replace all the rooms Welcome Mats:',
  value: ''
});

/** `deleteNote(id)`. */
export const deleteConfirm = (noteId: number): NoteConfirm => ({
  kind: 'delete',
  noteId,
  message: 'Are you sure you want to delete this note?'
});

/** `revertToVersion(v)` — the date in the sentence is the row's own, not "now". */
export const restoreConfirm = (noteId: number, version: NoteVersion): NoteConfirm => ({
  kind: 'restore',
  noteId,
  versionId: version.id,
  message: noteVersionRevertMessage(version.createdAt)
});

/**
 * `setAsWelcomeTab(e)`'s two confirmations — byte 1,474,217.
 *
 * The THIRD dialog that method can raise is {@link welcomePasswordPrompt}, and which of the three
 * a press produces is not decidable here: it depends on whether the controller holds an
 * `allRoomsWelcomeMatPW`, which this room may never see. The pane asks, then calls one of these.
 */
export const welcomeConfirm = (noteId: number, allRooms: boolean): NoteConfirm => ({
  kind: 'welcome',
  noteId,
  allRooms,
  message: allRooms
    ? 'Are you sure you want to replace all the rooms Welcome Mats with this note?'
    : 'Are you sure you want to apply this note as Welcome Mat'
});
