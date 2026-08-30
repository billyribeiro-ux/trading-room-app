import { invalidateAll } from '$app/navigation';

import {
  deleteSessionNoteTab,
  newSessionNoteTab,
  renameSessionNoteTab,
  restoreNoteVersion,
  saveSessionNote,
  setWelcomeMatNoteTab
} from '../../routes/session-notes.remote';
import type { NoteVersion, RoomNote } from '#lib/types.js';

import type { RoomMenus } from './menus.svelte';
import type { RoomModals } from './modals.svelte';

/**
 * THE SIX SESSION-NOTE MUTATIONS, as the pair of an action name and the payload it carries.
 *
 * This union is what replaced a bare list of six strings. As six strings the reachable set was
 * declared in `submitMutation`'s signature and the arguments were `Record<string, boolean | string |
 * number>`, so nothing tied a name to the fields it needs — `saveSessionNote` could be called with a
 * `newName` and would compile. Here each name carries its own payload, and the payloads are the
 * ones `session-notes.remote.ts` validates, so a call site that sends the wrong fields is a build
 * error rather than a schema refusal a presenter reads as *"Unable to update the note."*
 */
type NoteMutation =
  | { action: 'newSessionNoteTab'; values: { name: string } }
  | { action: 'saveSessionNote'; values: { noteId: number; contentHtml: string } }
  | { action: 'restoreNoteVersion'; values: { noteId: number; versionId: number } }
  | { action: 'renameSessionNoteTab'; values: { noteId: number; newName: string } }
  | { action: 'deleteSessionNoteTab'; values: { noteId: number } }
  | {
      action: 'setWelcomeMatNoteTab';
      values: { noteId: number; allRooms: boolean; pw: string };
    };

/** The six names, derived from the union rather than written out beside it. */
type NoteAction = NoteMutation['action'];

/** Action name to payload, so `submitMutation` can type its second argument from its first. */
type NoteValues = { [Mutation in NoteMutation as Mutation['action']]: Mutation['values'] };

/**
 * The dispatch, over IMPORTED SYMBOLS.
 *
 * A `switch` and not a lookup table, because a table would need one cast per entry to bring the
 * union's member back down to the payload that entry accepts, and six casts hide what one asserted
 * pair states once. The switch narrows `mutation` properly, so every call below is checked against
 * its own command's argument type with nothing asserted.
 *
 * Every arm names an import from `session-notes.remote.ts`. Deleting or renaming one of the six
 * commands is a build error at that line — which is the whole property the old
 * ``fetch(`?/${action}`)`` could not have, and the reason `presenterCommand` could rot for three
 * commits with every gate green.
 */
function send(mutation: NoteMutation): Promise<RoomNote> {
  switch (mutation.action) {
    case 'newSessionNoteTab':
      return newSessionNoteTab(mutation.values);
    case 'saveSessionNote':
      return saveSessionNote(mutation.values);
    case 'restoreNoteVersion':
      return restoreNoteVersion(mutation.values);
    case 'renameSessionNoteTab':
      return renameSessionNoteTab(mutation.values);
    case 'deleteSessionNoteTab':
      return deleteSessionNoteTab(mutation.values);
    case 'setWelcomeMatNoteTab':
      return setWelcomeMatNoteTab(mutation.values);
  }
}

/**
 * THE NOTES TAB's own actions, and the two links that mount into rendered markup.
 *
 * Phase 5 slice 25. Four functions and one field: creating a tab, the mutation every note action
 * goes through, the version history behind one, and the two `{@attach}` handlers that wire a link
 * inside content the server rendered.
 *
 * **`mountNewNoteLink` and `mountUploadFileLink` are attachments, not helpers**, and that is why
 * they live with the notes rather than with the page's other DOM mechanics. Each wires a link that
 * only exists inside note or file markup — content this class is responsible for — and each returns
 * its own teardown, which is the contract `{@attach}` defines.
 *
 * **`mainTab` is SHARED and crosses as a receiver.** Creating a note moves the room to the Notes
 * tab, and the tab strip is the page's — three other features write it too. A field written on four
 * sides is not one this class may own.
 *
 * **The phase plan named this seam as the one it was least sure of**, grouping notes with the DOM
 * attachment helpers and saying: "If at slice 16 they do not read as one thing they go to
 * `room/attachments.ts` as a second file and I say so." Measured: they do NOT read as one thing.
 * `captureMainElement` and its five siblings hold DOM handles the whole page reads — the split
 * geometry, the scroll follow, the window handlers — while these two mount links into note content.
 * Only the note-specific pair came; the rest stay on the page for now.
 */
export class RoomNotes {
  #newNoteOpen: boolean;
  /**
   * The note a presenter has pulled the room to, or null.
   *
   * `$state.raw` because it is only ever REPLACED — it is an id, never mutated in place, which is
   * the condition this repository's own rule names for preferring raw over a deep proxy.
   */
  #focusedNoteId = $state.raw<number | null>(null);

  /** Read by `NotesPane`, which selects the note when this changes. */
  get focusedNoteId(): number | null {
    return this.#focusedNoteId;
  }

  /**
   * RECEIVING end — a presenter elsewhere pulled the room here.
   *
   * Switches the main tab as well as the note, which is what the reference's own receiver does
   * (capture byte 1962371 sets `selectedMainTab = "presAreaTabs-notes"` and then
   * `selectedNoteTab = \`noteTab-${e}\``). Focusing a note on a hidden tab would be a no-op the
   * member never sees.
   */
  focusNote(noteId: number): void {
    this.#focusedNoteId = noteId;
    this.#showNotesTab();
  }

  /**
   * SENDING end — "Bring everyone here".
   *
   * Both halves deliberately: the presenter's own view follows immediately rather than waiting for
   * their own broadcast to arrive back, and the room is told. The command is fire-and-forget with a
   * logged failure, the same shape `RoomScreens.focusScreen` uses, because a refused broadcast must
   * not leave the presenter's own tab unmoved.
   *
   * Until 2026-08-23 this sent NOTHING. Both controls were wired to a local `selectNote(id)` and
   * `focus-on-screen-contract.test.ts` had already recorded the identical defect for screens in as
   * many words — *"The menu item said 'Bring everyone here' and brought nobody"* — for a control
   * that is one tab away from this one.
   */
  bringEveryoneTo(noteId: number): void {
    this.focusNote(noteId);
    void this.#focusOnSessionNote(noteId).catch((cause) =>
      console.error('[focusOnSessionNote]', cause)
    );
  }

  constructor(options: {
    /** The room-wide command. Injected so this class stays testable without a server. */
    focusOnSessionNote: (noteId: number) => Promise<unknown>;
    menus: RoomMenus;
    modals: RoomModals;
    /** Whether the note editor has mounted; the new-note link reads it to decide its state. */
    noteGates: () => { readonly editorMounted: boolean };
    /**
     * `mainTab = …` — a RECEIVER, because creating a note moves the room to the Notes tab and
     * the tab strip is the page's. Four features write it; a field written on four sides is
     * not one this class may own.
     */
    showNotesTab: () => void;
  }) {
    this.#menus = options.menus;
    this.#modals = options.modals;
    this.#noteGates = options.noteGates;
    this.#showNotesTab = options.showNotesTab;
    this.#focusOnSessionNote = options.focusOnSessionNote;

    this.#newNoteOpen = $state(false);
  }

  readonly #menus: RoomMenus;
  readonly #modals: RoomModals;
  readonly #noteGates: () => { readonly editorMounted: boolean };
  readonly #showNotesTab: () => void;
  readonly #focusOnSessionNote: (noteId: number) => Promise<unknown>;

  /** Whether the new-note editor is open. The Notes pane renders from it. */
  get newNoteOpen(): boolean {
    return this.#newNoteOpen;
  }

  set newNoteOpen(next: boolean) {
    this.#newNoteOpen = next;
  }

  /**
   * "New Note", asked for from wherever.
   *
   * ```js
   * newNote() { this.newNoteName = "", this.showNewNoteModal = !0 }
   * ```
   *
   * `PA-04` gave this a SECOND caller — the empty pane's own button — and two call sites writing
   * `newNoteOpen = noteGates().editorMounted` is one too many, because the gate is the interesting
   * half: a viewer who may READ notes but not edit them must not be handed an editor, and that rule
   * would have been in markup at one of the two.
   */
  requestNewNote(): void {
    this.#newNoteOpen = this.#noteGates().editorMounted;
  }

  mountNewNoteLink(menu: HTMLUListElement) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    const icon = document.createElement('i');

    link.setAttribute('href', '#');
    link.className = 'dropdown-item';
    icon.className = 'fas fa-plus';
    link.append(icon, document.createTextNode(' New Note'));
    link.addEventListener('click', (event) => {
      event.preventDefault();
      this.#menus.set('notes', false);
      this.#showNotesTab();
      this.requestNewNote();
    });
    item.append(link);
    menu.append(item);

    return () => item.remove();
  }

  /**
   * THE SIX SESSION-NOTE MUTATIONS, dispatched over imported commands rather than over a string.
   *
   * ## What this replaced
   *
   * ``fetch(`?/${action}`)`` with a hand-built `FormData` body and a `deserialize()` of the
   * response, over a six-member union of ACTION NAMES. Nothing connected the two ends: the endpoint
   * was assembled while the page ran, every value was stringified on the way out and re-parsed with
   * `Number()` on the way in, and a refusal was a discriminated union the caller had to remember to
   * inspect. Delete the action and this kept compiling and started doing nothing — which is exactly
   * what `presenterCommand` did for three commits with every gate green.
   *
   * {@link send} is that union's replacement, and {@link NoteMutation} is the reachable set. Both
   * are checked by the compiler now.
   *
   * ## Why the two-argument shape survives, and what removes it
   *
   * The six call sites are prop callbacks inside `PresentationArea.svelte`. Turning them into six
   * named methods — the way `RoomModals` now names its five poll commands — is the last step of
   * this conversion and is NOT done here, because that file is owned by another agent in this
   * session. `TODO.md` carries the remainder with exactly this note.
   *
   * What the shape no longer is, is untyped. `Action` is INFERRED at five of the six call sites, so
   * `values` is checked against that command's own payload; the sixth supplies an explicit
   * `Success` and falls back to the union of all six payloads, which is still a closed set rather
   * than any record at all. That is why `Action` is the SECOND type parameter with a default:
   * TypeScript infers nothing once a type argument is supplied by hand, so a call that names
   * `Success` must still type-check, and only a defaulted parameter lets it.
   *
   * ## The two assertions, named rather than hidden
   *
   * `{ action, values }` is correct by construction — `values` IS `NoteValues[Action]` — but
   * TypeScript will not correlate two separate parameters into a discriminated union, so the pair
   * is asserted into one. And `Success` is a caller-chosen type this function cannot produce a
   * witness for, so the result is asserted into it.
   *
   * **Neither is new.** Both were performed before by `deserialize<Success, { message?: string }>`,
   * which asserted a parsed response body into `Success` with no check whatsoever. Making an
   * assertion that already existed visible at the line that performs it is the improvement;
   * removing it needs the call sites, which is the same thing the paragraph above is waiting on.
   */
  async submitMutation<
    Success extends Record<string, unknown> = Record<string, unknown>,
    Action extends NoteAction = NoteAction
  >(action: Action, values: NoteValues[Action]): Promise<Success | undefined> {
    const note = await send({ action, values } as NoteMutation);
    /*
      Kept from the version this replaced: the notes list, the welcome mat and the version panel are
      built by the page LOAD rather than by a remote query, so nothing refreshes them on its own.
      AFTER the mutation resolved, deliberately — a refetch over a refusal would redraw the same
      state and read as success. A rejection never reaches this line, which is what `NotesPane`'s
      own `catch` turns into the message a presenter sees.
    */
    await invalidateAll();
    return { success: true, note } as unknown as Success;
  }

  /*
    Read by `NotesPane` while a presenter has the editor open, to fill the Version History panel.

    A plain GET rather than `submitNoteMutation`: this changes nothing, so it must not go through
    `invalidateAll()` — doing so would re-run every load function on the page each time a panel
    was opened, and the route already answers with exactly the rows the panel needs.
  */
  async loadVersions(noteId: number): Promise<readonly NoteVersion[]> {
    const response = await fetch(`/api/notes/${noteId}/versions`);
    if (!response.ok) {
      throw new Error('Unable to load note versions.');
    }
    return (await response.json()) as readonly NoteVersion[];
  }

  mountUploadFileLink(menu: HTMLUListElement) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    const icon = document.createElement('i');

    link.setAttribute('href', '#');
    link.className = 'dropdown-item';
    icon.className = 'fas fa-plus';
    link.append(icon, document.createTextNode(' Upload File'));
    link.addEventListener('click', (event) => {
      event.preventDefault();
      this.#menus.set('files', false);
      this.#modals.open('file-upload');
    });
    item.append(link);
    menu.append(item);

    return () => item.remove();
  }
}
