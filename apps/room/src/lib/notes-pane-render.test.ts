import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import NoteTabContent from './components/notes/NoteTabContent.svelte';
import NotesPane from './components/notes/NotesPane.svelte';
import type { RoomNote } from './types';

const callbacks = {
  onCreate: () => undefined,
  onDelete: () => undefined,
  onLoadVersions: async () => [],
  onNewNoteOpenChange: () => undefined,
  onRename: () => undefined,
  onRestoreVersion: () => undefined,
  onSave: () => undefined,
  onSetWelcomeMat: () => undefined,
  onUploadImages: async () => []
};

function renderNotes(notes: readonly RoomNote[]): string {
  return render(NotesPane, {
    props: {
      canEdit: true,
      focusedNoteId: null,
      onBringEveryone: () => {},
      giphyApiKey: '',
      newNoteOpen: false,
      notes,
      ...callbacks
    }
  }).body;
}

function note(id: number, name: string, position: number): RoomNote {
  return {
    id,
    name,
    contentHtml: '',
    isWelcomeMat: false,
    position,
    updatedById: 1,
    createdAt: '2026-07-30T12:00:00.000Z',
    updatedAt: '2026-07-30T12:00:00.000Z'
  };
}

describe('NotesPane evidence contract', () => {
  it('always renders the canonical notes tab list without an invented empty-state message', () => {
    const body = renderNotes([]);

    expect(body).toContain('<ul id="notesTabs"');
    expect(body).toContain('class="nav nav-tabs noteTabset');
    expect(body).not.toContain('No notes yet');
  });

  it('renders one canonical tab per persisted note and keeps the active note selected', () => {
    const body = renderNotes([note(59, 'Bible Verses', 0), note(60, 'Trading Plan', 1)]);

    expect(body.match(/<li role="presentation" class="nav-item">/g)).toHaveLength(2);
    expect(body).toContain(
      '<a data-bs-toggle="tab" role="tab" aria-selected="true" class="nav-link active" id="59-tab" aria-controls="59">'
    );
    expect(body).toContain(
      '<a data-bs-toggle="tab" role="tab" aria-selected="false" class="nav-link" id="60-tab" aria-controls="60">'
    );
    expect(body).not.toContain('href="#59"');
    expect(body).not.toContain('href="#60"');
    expect(body).toContain(
      '<div role="tabpanel" class="tab-pane fade show active" aria-labelledby="59-tab" id="59">'
    );
    expect(body).toContain(
      '<div class="noteOptions d-flex align-items-center justify-content-between">'
    );
    expect(body).toContain('title="Edit Note" class="btn btn-sm noteEdit mr-3"');
    expect(body).toContain('title="Download Note" class="btn btn-sm noteDownload mr-3"');
    expect(body).toContain('title="Delete Note" class="btn btn-sm noteDelete"');
  });

  it('inserts the captured note name, gear, and six-action menu hierarchy into every tab', () => {
    const body = render(NoteTabContent, {
      props: {
        canEdit: true,
        dirty: false,
        onBringEveryone: () => {},
        menuId: 'notes-pane-menu-59',
        menuOpen: false,
        note: note(59, 'Bible Verses', 0),
        onDelete: () => undefined,
        onRename: () => undefined,
        onRequestWelcome: () => undefined,
        onStartEditing: () => undefined,
        onToggleMenu: () => undefined
      }
    }).body;

    expect(body).toContain('id="noteUpd-59"');
    expect(body).toContain('class="fas fa-pen mx-1"');
    expect(body).toContain('style="display: none;"');
    expect(body).toContain('<a class="editName mx-1">Bible Verses </a>');
    expect(body).toContain(
      '<span id="notes-pane-menu-59" data-bs-toggle="dropdown" aria-expanded="false" class="dropdown-toggle">'
    );
    expect(body).toContain('<ul aria-labelledby="notes-pane-menu-59" class="dropdown-menu">');
    expect(body.match(/href="#"/g)).toHaveLength(6);
    expect(body).toContain('<i class="fas fa-edit"></i> Edit Note');
    expect(body).toContain('Rename Note');
    expect(body).toContain('<i class="fas fa-eye"></i> Bring everyone here');
    expect(body).toContain('<i class="fas fa-home"></i> Make Welcome Mat');
    expect(body).toContain('<i class="fas fa-home"></i> Apply as Welcome Mat to multiple rooms');
    expect(body).toContain('<i class="fas fa-trash-alt"></i> Delete');
  });
});
