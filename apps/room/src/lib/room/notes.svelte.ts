import { deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';

import type { NoteVersion } from '#lib/types.js';

import type { RoomMenus } from './menus.svelte';
import type { RoomModals } from './modals.svelte';

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

  async submitMutation<Success extends Record<string, unknown> = Record<string, unknown>>(
    action:
      | 'deleteSessionNoteTab'
      | 'newSessionNoteTab'
      | 'renameSessionNoteTab'
      | 'restoreNoteVersion'
      | 'saveSessionNote'
      | 'setWelcomeMatNoteTab',
    values: Record<string, boolean | string | number>
  ): Promise<Success | undefined> {
    const body = new FormData();
    for (const [key, value] of Object.entries(values)) body.set(key, String(value));
    const response = await fetch(`?/${action}`, { method: 'POST', body });
    const result = deserialize<Success, { message?: string }>(await response.text());

    if (result.type === 'failure') {
      throw new Error(result.data?.message ?? `Unable to ${action}.`);
    }
    if (result.type === 'error') {
      throw new Error(result.error.message ?? `Unable to ${action}.`);
    }
    if (result.type !== 'success') {
      throw new Error(`Unable to ${action}.`);
    }

    await invalidateAll();
    return result.data;
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
