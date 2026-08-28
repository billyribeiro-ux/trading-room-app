<script lang="ts">
  import BootboxDialog from '#lib/components/BootboxDialog.svelte';
  import type { NoteVersion, RoomNote } from '#lib/types.js';
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import NoteEditor from './NoteEditor.svelte';
  import NoteTabContent from './NoteTabContent.svelte';
  import { safeNoteHtml } from './safe-html';
  import { noteVersionRevertMessage } from './version-history';

  type PromptState =
    | { kind: 'new'; title: 'New Note name:'; value: '' }
    | { kind: 'rename'; noteId: number; title: 'Change note name'; value: string };

  type ConfirmState =
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
    readonly onSetWelcomeMat: (noteId: number, allRooms: boolean) => void | Promise<void>;
    readonly onUploadImages: (files: readonly File[]) => Promise<readonly string[]>;
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
    simplifiedEditor
  }: Props = $props();

  const componentId = $props.id();
  let requestedNoteId = $state<number | null>(null);
  let editingNoteId = $state<number | null>(null);
  let openMenuNoteId = $state<number | null>(null);
  const dirtyNoteIds = new SvelteSet<number>();
  let prompt = $state<PromptState | null>(null);
  let confirm = $state<ConfirmState | null>(null);
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
  let effectivePrompt = $derived.by<PromptState | null>(() => {
    if (prompt !== null) return prompt;
    return newNoteOpen && canEdit ? { kind: 'new', title: 'New Note name:', value: '' } : null;
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

  function requestRestore(noteId: number, version: NoteVersion): void {
    confirm = {
      kind: 'restore',
      noteId,
      versionId: version.id,
      message: noteVersionRevertMessage(version.createdAt)
    };
  }

  function requestRename(note: RoomNote): void {
    openMenuNoteId = null;
    prompt = { kind: 'rename', noteId: note.id, title: 'Change note name', value: note.name };
  }

  function requestDelete(noteId: number): void {
    openMenuNoteId = null;
    confirm = {
      kind: 'delete',
      noteId,
      message: 'Are you sure you want to delete this note?'
    };
  }

  function requestWelcome(noteId: number, allRooms: boolean): void {
    openMenuNoteId = null;
    confirm = {
      kind: 'welcome',
      noteId,
      allRooms,
      message: allRooms
        ? 'Are you sure you want to replace all the rooms Welcome Mats with this note?'
        : 'Are you sure you want to apply this note as Welcome Mat'
    };
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
        await onSetWelcomeMat(current.noteId, current.allRooms);
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
    {@const tabId = String(note.id)}
    {@const menuId = `${componentId}-note-menu-${note.id}`}
    <li role="presentation" class="nav-item">
      <!--
        The captured application has no href on this Bootstrap tab anchor.
        Its nested title anchor is inserted after mount by NoteTabContent.
      -->
      <!-- svelte-ignore a11y_missing_attribute -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <a
        data-bs-toggle="tab"
        role="tab"
        aria-selected={activeNote?.id === note.id}
        class={['nav-link', { active: activeNote?.id === note.id }]}
        id={`${tabId}-tab`}
        aria-controls={tabId}
        onclick={(event) => {
          event.preventDefault();
          selectNote(note.id);
        }}
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
  {#if activeNote !== null}
    <div
      role="tabpanel"
      class="tab-pane fade show active"
      aria-labelledby={`${activeNote.id}-tab`}
      id={String(activeNote.id)}
    >
      <div class="note-container">
        {#if editingNoteId === activeNote.id && canEdit}
          {#key `${activeNote.id}:${activeNote.updatedAt}`}
            <NoteEditor
              noteId={activeNote.id}
              contentHtml={activeNote.contentHtml ?? ''}
              {giphyApiKey}
              onBringEveryone={() => onBringEveryone(activeNote.id)}
              onDirtyChange={(dirty) => setDirty(activeNote.id, dirty)}
              onDone={() => {
                setDirty(activeNote.id, false);
                editingNoteId = null;
                showVersionHistory = false;
              }}
              onRequestRestore={(version) => requestRestore(activeNote.id, version)}
              onSave={(contentHtml) => onSave(activeNote.id, contentHtml)}
              onSetWelcomeMat={(allRooms) => requestWelcome(activeNote.id, allRooms)}
              {onUploadImages}
              onVersionHistoryOpenChange={(open) => (showVersionHistory = open)}
              {showVersionHistory}
              {simplifiedEditor}
              versions={activeVersions}
            />
          {/key}
        {:else}
          <div
            class="note-view"
            id={`summernoteEdit-${activeNote.id}`}
            {@attach safeNoteHtml(activeNote.contentHtml ?? '')}
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
              onclick={() => startEditing(activeNote.id)}
              ><i class="fas fa-edit mr-2"></i>Edit
            </button>
          {/if}
          <button
            type="button"
            title="Download Note"
            class="btn btn-sm noteDownload mr-3"
            onclick={() => downloadNote(activeNote)}
            ><i class="fas fa-download mr-2"></i>Download
          </button>
          {#if canEdit}
            <button
              type="button"
              title="Delete Note"
              class="btn btn-sm noteDelete"
              onclick={() => requestDelete(activeNote.id)}
              ><i class="fas fa-trash-alt mr-2"></i>Delete
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
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
