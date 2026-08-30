<script lang="ts">
  import type { SessionImageFile } from '#lib/session-image-files.js';
  import BootboxDialog from '#lib/components/BootboxDialog.svelte';
  import type { NoteVersion, RoomNote } from '#lib/types.js';
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import NoteEditor from './NoteEditor.svelte';
  import NoteTabContent from './NoteTabContent.svelte';
  import { safeNoteHtml } from './safe-html';
  import { welcomeMatPasswordRequired } from '../../../routes/welcome-mat.remote';

  import {
    type NoteConfirm,
    type NotePrompt,
    deleteConfirm,
    newNotePrompt,
    renamePrompt,
    restoreConfirm,
    welcomeConfirm,
    welcomePasswordPrompt
  } from '#lib/note-dialogs.js';

  interface Props {
    readonly canEdit: boolean;
    /** The note a presenter has pulled the room to, or null. Owned by `RoomNotes`. */
    readonly focusedNoteId: number | null;
    /** "Bring everyone here" — tells the room, and is NOT the same act as selecting a tab. */
    readonly onBringEveryone: (noteId: number) => void;
    readonly giphyApiKey: string;
    readonly notes: readonly RoomNote[];
    readonly newNoteOpen: boolean;
    readonly onCreate: (name: string) => RoomNote | void | Promise<RoomNote | void>;
    readonly onDelete: (noteId: number) => void | Promise<void>;
    /*
      Reads `api/notes/[noteId]/versions`, which refuses anything but a presenter of this room —
      the history holds text that was edited away, so it is gated harder than the note itself.
      Only ever called behind `canEdit`, which is that same authority as the client sees it.
    */
    readonly onLoadVersions: (noteId: number) => Promise<readonly NoteVersion[]>;
    readonly onNewNoteOpenChange: (open: boolean) => void;
    readonly onRename: (noteId: number, newName: string) => void | Promise<void>;
    readonly onRestoreVersion: (noteId: number, versionId: number) => void | Promise<void>;
    readonly onSave: (noteId: number, contentHtml: string) => void | Promise<void>;
    /**
     * `pw` is the all-rooms password, and it is forwarded rather than compared.
     *
     * Empty for the per-room variant and for a room with no `allRoomsWelcomeMatPW` configured. The
     * comparison happens on the controller — see `welcome-mat.remote.ts` and the endpoint's header
     * for why this room must never hold the value it would compare against.
     */
    readonly onSetWelcomeMat: (
      noteId: number,
      allRooms: boolean,
      pw: string
    ) => void | Promise<void>;
    readonly onUploadImages: (files: readonly File[]) => Promise<readonly string[]>;
    /** The room's shared IMAGE files, for the carousel's browser — see `NoteEditor`'s own prop. */
    readonly sessionImages: readonly SessionImageFile[];
    /** `noteGates.simplifiedEditor` - passed through untouched; the editor draws the toolbar. */
    readonly simplifiedEditor: boolean;
  }

  let {
    canEdit,
    focusedNoteId,
    onBringEveryone,
    giphyApiKey,
    notes,
    newNoteOpen,
    onCreate,
    onDelete,
    onLoadVersions,
    onNewNoteOpenChange,
    onRename,
    onRestoreVersion,
    onSave,
    onSetWelcomeMat,
    onUploadImages,
    sessionImages,
    simplifiedEditor
  }: Props = $props();

  const componentId = $props.id();
  let requestedNoteId = $state<number | null>(null);
  let editingNoteId = $state<number | null>(null);
  let openMenuNoteId = $state<number | null>(null);
  const dirtyNoteIds = new SvelteSet<number>();
  let prompt = $state<NotePrompt | null>(null);
  let confirm = $state<NoteConfirm | null>(null);
  let mutationError = $state<string | null>(null);
  let noteTabChromeMounted = $state(false);
  /*
    Version history lives HERE rather than in `NoteEditor`, which is the component that shows it.

    The editor sits inside a `{#key}` on the note's `updatedAt`, so it is destroyed and rebuilt
    every time the note is saved — including by its own three-second autosave. Panel state kept
    inside it would close itself under a presenter mid-read, and the list would be refetched by
    each new instance.

    The rows and the note they belong to are ONE value, not two: they are written together and are
    only ever meaningful together, and a pair of variables is a pair that can drift. `$state.raw`
    because it is replaced wholesale and never mutated, so a deep proxy would cost on every read
    and buy nothing.
  */
  let loadedVersions = $state.raw<{ noteId: number; rows: readonly NoteVersion[] } | null>(null);
  let showVersionHistory = $state(false);

  onMount(() => {
    noteTabChromeMounted = true;
  });

  let activeNote = $derived(
    notes.find(({ id }) => id === requestedNoteId) ??
      notes.find(({ isWelcomeMat }) => isWelcomeMat) ??
      notes[0] ??
      null
  );
  let effectivePrompt = $derived.by<NotePrompt | null>(() => {
    if (prompt !== null) return prompt;
    return newNoteOpen && canEdit ? newNotePrompt() : null;
  });
  /*
    Never show one note's history against another note's editor.

    The fetch below is asynchronous, so between opening note B and its response arriving,
    `loadedVersions` still holds note A's rows. Checking the id they were loaded for means that
    window renders as empty — which hides the button, since the reference only offers it when there
    is history — instead of briefly attributing A's edits to B.
  */
  let activeVersions = $derived(
    loadedVersions !== null && loadedVersions.noteId === editingNoteId ? loadedVersions.rows : []
  );

  /*
    A network read is a side effect, which is what this rune is for — the Svelte documentation names
    "making network requests" in its first sentence. It is NOT a `$derived` in disguise: nothing
    here can be computed synchronously from state, and `onLoadVersions` assigns nothing of ours.

    It re-runs on the note's `updatedAt` as well as its id, because every save and every restore
    writes a `note_versions` row, and `updatedAt` moving is the signal that one landed. That does
    mean a GET per autosave while a presenter is actively typing; it is the price of the count on
    the button being true, it is presenter-only, and it is bounded by the three-second timer.
  */
  $effect(() => {
    const noteId = editingNoteId;
    void activeNote?.updatedAt;
    if (!canEdit || noteId === null) return;

    let cancelled = false;
    void (async () => {
      try {
        const rows = await onLoadVersions(noteId);
        // The teardown ran while this was in flight: a later note, or none, is now being edited.
        if (cancelled) return;
        loadedVersions = { noteId, rows };
      } catch (error: unknown) {
        if (cancelled) return;
        // Surfaced, not swallowed. A refusal here means the endpoint or the session is wrong.
        mutationError = error instanceof Error ? error.message : 'Unable to load note versions.';
      }
    })();

    return () => {
      cancelled = true;
    };
  });

  function selectNote(noteId: number): void {
    requestedNoteId = noteId;
    openMenuNoteId = null;
  }

  /*
    A presenter pulled the room here. `RoomNotes` owns which note that is; this selects it.

    An `$effect` because the trigger is a value ARRIVING from the server through a class field, not a
    user gesture — there is no handler to hang it on. It reads `focusedNoteId` and nothing else, so
    selecting locally cannot re-enter it: `selectNote` writes `requestedNoteId`, which this never
    reads.
  */
  $effect(() => {
    const requested = focusedNoteId;
    if (requested !== null) selectNote(requested);
  });

  function setDirty(noteId: number, dirty: boolean): void {
    if (dirty) dirtyNoteIds.add(noteId);
    else dirtyNoteIds.delete(noteId);
  }

  function startEditing(noteId: number): void {
    requestedNoteId = noteId;
    editingNoteId = noteId;
    openMenuNoteId = null;
    // A fresh editor opens with the panel shut, as a fresh `app-note` does: `showVersionHistory`
    // is initialised to false in its constructor and the component is per-note.
    showVersionHistory = false;
  }

  /* The dialogs themselves — every captured sentence, with its offset — are `#lib/note-dialogs.ts`. */
  function requestRestore(noteId: number, version: NoteVersion): void {
    confirm = restoreConfirm(noteId, version);
  }

  function requestRename(note: RoomNote): void {
    openMenuNoteId = null;
    prompt = renamePrompt(note);
  }

  function requestDelete(noteId: number): void {
    openMenuNoteId = null;
    confirm = deleteConfirm(noteId);
  }

  /**
   * Raise the right dialog for the welcome mat a presenter asked for.
   *
   * ```js
   * setAsWelcomeTab(e) {                                         // reference byte 1,474,217
   *   e ? this.appService.globals.sessData.allRoomsWelcomeMatPW
   *         ? bootbox.prompt({ title: "Please enter the password to replace all the rooms Welcome Mats:", … })
   *         : bootbox.confirm("Are you sure you want to replace all the rooms Welcome Mats with this note?")
   *     : bootbox.confirm("Are you sure you want to apply this note as Welcome Mat", …)
   * }
   * ```
   *
   * Three dialogs, two of which already existed here. The third — the password — could not exist
   * while nothing knew whether one was configured, because `allRoomsWelcomeMatPW` may never reach
   * this room. `welcomeMatPasswordRequired` is what answers that, and it answers `true` when the
   * controller is unreachable: a prompt whose answer the write path re-checks costs a presenter one
   * dialog, where a confirmation would skip a gate the owner chose to set.
   *
   * The per-room variant does not ask at all — upstream does not either, and a round trip before a
   * confirmation nobody gated would be latency for nothing.
   */
  async function requestWelcome(noteId: number, allRooms: boolean): Promise<void> {
    openMenuNoteId = null;

    if (allRooms && (await welcomeMatPasswordRequired()).required) {
      prompt = welcomePasswordPrompt(noteId);
      return;
    }

    confirm = welcomeConfirm(noteId, allRooms);
  }

  async function acceptPrompt(value = ''): Promise<void> {
    const current = effectivePrompt;
    const trimmed = value.trim();
    if (current === null || trimmed.length === 0) return;

    mutationError = null;
    prompt = null;
    if (current.kind === 'new') {
      onNewNoteOpenChange(false);
    }

    try {
      if (current.kind === 'new') {
        const created = await onCreate(trimmed);
        if (created !== undefined) {
          requestedNoteId = created.id;
          editingNoteId = created.id;
        }
      } else if (current.kind === 'welcome-password') {
        /*
          The typed password goes STRAIGHT OUT, uncompared. `trimmed` because the reference trims
          too (`const o = i.trim()`), and because the controller's own compare trims the candidate
          and not the stored value — trimming here as well is the same act, not a second one.

          `Wrong password!` comes back as the action's failure message rather than being decided
          here: this room has nothing to decide it against, which is the whole point.
        */
        await onSetWelcomeMat(current.noteId, true, trimmed);
        requestedNoteId = current.noteId;
      } else {
        await onRename(current.noteId, trimmed);
        requestedNoteId = current.noteId;
      }
    } catch (error: unknown) {
      mutationError = error instanceof Error ? error.message : 'Unable to update the note.';
    }
  }

  function closePrompt(): void {
    if (effectivePrompt?.kind === 'new') {
      onNewNoteOpenChange(false);
    }
    prompt = null;
  }

  async function acceptConfirm(): Promise<void> {
    const current = confirm;
    if (current === null) return;

    mutationError = null;
    confirm = null;

    try {
      if (current.kind === 'delete') {
        await onDelete(current.noteId);
        if (editingNoteId === current.noteId) editingNoteId = null;
        if (requestedNoteId === current.noteId) requestedNoteId = null;
      } else if (current.kind === 'restore') {
        await onRestoreVersion(current.noteId, current.versionId);
        // The reference closes the panel as part of reverting, before the editor is rewritten.
        showVersionHistory = false;
        requestedNoteId = current.noteId;
      } else {
        /* No password on this path: either it is the per-room variant, or none is configured. */
        await onSetWelcomeMat(current.noteId, current.allRooms, '');
        requestedNoteId = current.noteId;
      }
    } catch (error: unknown) {
      mutationError = error instanceof Error ? error.message : 'Unable to update the note.';
    }
  }

  function downloadNote(note: RoomNote): void {
    const blob = new Blob([note.contentHtml ?? ''], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.name}.html`;
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
</script>

<ul id="notesTabs" role="tablist" class="nav nav-tabs noteTabset">
  {#each notes as note (note.id)}
    {const tabId = $derived(String(note.id))}
    {const menuId = $derived(`${componentId}-note-menu-${note.id}`)}
    <!--
      THE CLICK IS ON THE `<li>`, WHICH IS WHERE THE CAPTURE PUTS IT — and it is not a preference.

      Const 31 is `["role","presentation",1,"nav-item",3,"click"]` (byte 1,996,498) and const 73, the
      anchor, is `["data-bs-toggle","tab","role","tab","aria-selected","true",1,"nav-link",3,
      "ngClass","id"]` (byte 1,999,647) — no click on it at all. `jSe` binds
      `onNotesTabChange(o._id)` on the `<li>` at byte 1,928,643.

      It was on the anchor here, and the difference is measurable rather than notional:
      `.noteTabset .nav-link` carries `margin: 5px`, so every tab in this strip has a five-pixel
      ring that belongs to the `<li>` and to nothing else. A press landing there did nothing.
      `acA-12` is the same finding on the two alert-toolbar toggles, and it was built the same way.

      The anchor keeps `role="tab"` and its `aria-*`: it is what a screen reader reads as the tab,
      and moving the handler outwards does not move the role.

      NO `svelte-ignore` IS NEEDED HERE and two were written before being measured: `svelte-autofixer`
      answered `svelte-ignore comment is used, but not warned` for both. `role="presentation"` is what
      makes the difference — a presentational element raises neither
      `a11y_click_events_have_key_events` nor `a11y_no_noninteractive_element_interactions`, because
      it is not in the accessibility tree to begin with. A suppression for a warning that does not
      fire is a suppression that will one day hide a warning that does.
    -->
    <li
      role="presentation"
      class="nav-item"
      onclick={(event) => {
        event.preventDefault();
        selectNote(note.id);
      }}
    >
      <!--
        The captured application has no href on this Bootstrap tab anchor.
        Its nested title anchor is inserted after mount by NoteTabContent.
      -->
      <!-- svelte-ignore a11y_missing_attribute -->
      <a
        data-bs-toggle="tab"
        role="tab"
        aria-selected={activeNote?.id === note.id}
        class={['nav-link', { active: activeNote?.id === note.id }]}
        id={`${tabId}-tab`}
        aria-controls={tabId}
      >
        {#if noteTabChromeMounted}
          <NoteTabContent
            {canEdit}
            dirty={dirtyNoteIds.has(note.id)}
            {menuId}
            menuOpen={openMenuNoteId === note.id}
            {note}
            onDelete={() => requestDelete(note.id)}
            onRename={() => requestRename(note)}
            onRequestWelcome={(allRooms) => requestWelcome(note.id, allRooms)}
            onBringEveryone={() => onBringEveryone(note.id)}
            onStartEditing={() => startEditing(note.id)}
            onToggleMenu={() => {
              openMenuNoteId = openMenuNoteId === note.id ? null : note.id;
            }}
          />
        {/if}
      </a>
    </li>
  {/each}
</ul>

<div id="notesTabsContent" class="tab-content">
  <!--
    ── ONE PANEL PER NOTE, NOT ONE PANEL ────────────────────────────────────────────────────────

    `zSe` (byte 1,930,200) repeats BOTH lists over the same array: `ht(1,jSe,…,"li",16,pc)` for the
    tabs and `ht(4,$Se,10,9,"div",72,pc)` for the panels, at byte 1,930,259. Const 72 is
    `["role","tabpanel",1,"tab-pane","fade",3,"ngClass","id"]` — `show active` arrives through
    `ngClass`, which is Bootstrap's own tab-pane shape: every pane exists and one is shown.

    This rendered the ACTIVE note's panel only, and the cost was not cosmetic. Every tab anchor
    carries `aria-controls={note.id}` (the reference's `Et("aria-controls",e._id)` at byte
    1,929,073), so with one panel in the document every tab but the open one pointed at an id that
    does not exist. A dangling `aria-controls` is not a degraded experience, it is a broken one: the
    control announces a relationship a screen reader then cannot follow.

    It also cost the thing a tab strip is for. `.note-container` is `overflow-y: auto`, so each
    panel is its own scroller; unmounting the pane threw away the scroll position, and switching
    away from a long note and back returned the reader to the top of it.

    **What is NOT repeated is the editor.** The reference mounts `app-note` in every panel and lets
    each decide whether it is editing; ours mounts `NoteEditor` only in the panel being edited,
    because ours is a Tiptap instance with a document, a history stack and a three-second autosave
    timer, and `editingNoteId` is a single value — a second instance could never be reached and
    would cost all of that per note in the room.
  -->
  {#each notes as note (note.id)}
    {const isActive = $derived(activeNote?.id === note.id)}
    <div
      role="tabpanel"
      class={['tab-pane', 'fade', { show: isActive, active: isActive }]}
      aria-labelledby={`${note.id}-tab`}
      id={String(note.id)}
    >
      <div class="note-container">
        {#if editingNoteId === note.id && canEdit}
          {#key `${note.id}:${note.updatedAt}`}
            <NoteEditor
              contentHtml={note.contentHtml ?? ''}
              {giphyApiKey}
              onBringEveryone={() => onBringEveryone(note.id)}
              onDirtyChange={(dirty) => setDirty(note.id, dirty)}
              onDone={() => {
                setDirty(note.id, false);
                editingNoteId = null;
                showVersionHistory = false;
              }}
              onRequestRestore={(version) => requestRestore(note.id, version)}
              onSave={(contentHtml) => onSave(note.id, contentHtml)}
              onSetWelcomeMat={(allRooms) => requestWelcome(note.id, allRooms)}
              {onUploadImages}
              {sessionImages}
              onVersionHistoryOpenChange={(open) => (showVersionHistory = open)}
              {showVersionHistory}
              {simplifiedEditor}
              versions={activeVersions}
            />
          {/key}
        {:else}
          <div
            class="note-view"
            id={`summernoteEdit-${note.id}`}
            {@attach safeNoteHtml(note.contentHtml ?? '')}
          ></div>
        {/if}
      </div>

      <div class="noteOptions d-flex align-items-center justify-content-between">
        <div>
          {#if canEdit}
            <button
              type="button"
              title="Edit Note"
              class="btn btn-sm noteEdit mr-3"
              onclick={() => startEditing(note.id)}
              ><i class="fas fa-edit mr-2"></i>Edit{' '}
            </button>
          {/if}
          <button
            type="button"
            title="Download Note"
            class="btn btn-sm noteDownload mr-3"
            onclick={() => downloadNote(note)}
            ><i class="fas fa-download mr-2"></i>Download{' '}
          </button>
          {#if canEdit}
            <button
              type="button"
              title="Delete Note"
              class="btn btn-sm noteDelete"
              onclick={() => requestDelete(note.id)}
              ><i class="fas fa-trash-alt mr-2"></i>Delete{' '}
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/each}
</div>

{#if effectivePrompt !== null}
  <BootboxDialog
    mode="prompt"
    message=""
    title={effectivePrompt.title}
    value={effectivePrompt.value}
    onclose={closePrompt}
    onconfirm={(value) => void acceptPrompt(value)}
  />
{/if}

{#if confirm !== null}
  <BootboxDialog
    mode="confirm"
    message={confirm.message}
    onclose={() => (confirm = null)}
    onconfirm={() => void acceptConfirm()}
  />
{/if}

{#if mutationError !== null}
  <BootboxDialog mode="alert" message={mutationError} onclose={() => (mutationError = null)} />
{/if}
