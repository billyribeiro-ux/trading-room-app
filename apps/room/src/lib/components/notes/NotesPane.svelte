<script lang="ts">
  import BootboxDialog from '$lib/components/BootboxDialog.svelte';
  import type { RoomNote } from '$lib/types';
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import NoteEditor from './NoteEditor.svelte';
  import NoteTabContent from './NoteTabContent.svelte';
  import { safeNoteHtml } from './safe-html';

  type PromptState =
    | { kind: 'new'; title: 'New Note name:'; value: '' }
    | { kind: 'rename'; noteId: number; title: 'Change note name'; value: string };

  type ConfirmState =
    | { kind: 'delete'; noteId: number; message: 'Are you sure you want to delete this note?' }
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
    readonly giphyApiKey: string;
    readonly notes: readonly RoomNote[];
    readonly newNoteOpen: boolean;
    readonly onCreate: (name: string) => RoomNote | void | Promise<RoomNote | void>;
    readonly onDelete: (noteId: number) => void | Promise<void>;
    readonly onNewNoteOpenChange: (open: boolean) => void;
    readonly onRename: (noteId: number, newName: string) => void | Promise<void>;
    readonly onSave: (noteId: number, contentHtml: string) => void | Promise<void>;
    readonly onSetWelcomeMat: (noteId: number, allRooms: boolean) => void | Promise<void>;
    readonly onUploadImages: (files: readonly File[]) => Promise<readonly string[]>;
  }

  let {
    canEdit,
    giphyApiKey,
    notes,
    newNoteOpen,
    onCreate,
    onDelete,
    onNewNoteOpenChange,
    onRename,
    onSave,
    onSetWelcomeMat,
    onUploadImages
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

  function selectNote(noteId: number): void {
    requestedNoteId = noteId;
    openMenuNoteId = null;
  }

  function setDirty(noteId: number, dirty: boolean): void {
    if (dirty) dirtyNoteIds.add(noteId);
    else dirtyNoteIds.delete(noteId);
  }

  function startEditing(noteId: number): void {
    requestedNoteId = noteId;
    editingNoteId = noteId;
    openMenuNoteId = null;
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
        class="nav-link"
        class:active={activeNote?.id === note.id}
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
            onSelect={() => selectNote(note.id)}
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
              onBringEveryone={() => selectNote(activeNote.id)}
              onDirtyChange={(dirty) => setDirty(activeNote.id, dirty)}
              onDone={() => {
                setDirty(activeNote.id, false);
                editingNoteId = null;
              }}
              onSave={(contentHtml) => onSave(activeNote.id, contentHtml)}
              onSetWelcomeMat={(allRooms) => requestWelcome(activeNote.id, allRooms)}
              {onUploadImages}
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
