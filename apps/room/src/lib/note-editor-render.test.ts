import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import NoteEditor from './components/notes/NoteEditor.svelte';

describe('NoteEditor evidence contract', () => {
  it('renders the complete evidenced rich-text toolbar while a note is being edited', () => {
    const body = render(NoteEditor, {
      props: {
        contentHtml: '',
        giphyApiKey: 'test-key',
        noteId: 59,
        onBringEveryone: () => undefined,
        onDirtyChange: () => undefined,
        onDone: () => undefined,
        onSave: () => undefined,
        onSetWelcomeMat: () => undefined,
        onUploadImages: async () => []
      }
    }).body;

    expect(body).toContain('class="note-toolbar');
    for (const group of [
      'note-style',
      'note-view',
      'note-misc',
      'note-font',
      'note-fontname',
      'note-fontsize',
      'note-color',
      'note-para',
      'note-height',
      'note-table',
      'note-insert',
      'note-customButtons'
    ]) {
      expect(body).toContain(group);
    }

    expect(body).toContain('aria-label="Style"');
    expect(body).toContain('aria-label="Full Screen"');
    expect(body).toContain('aria-label="Code View"');
    expect(body).toContain('aria-label="Undo"');
    expect(body).toContain('aria-label="Redo"');
    expect(body).toContain('aria-label="Font Family"');
    expect(body).toContain('aria-label="Font Size"');
    expect(body).toContain('aria-label="More Color"');
    expect(body).toContain('aria-label="Paragraph"');
    expect(body).toContain('aria-label="Line Height"');
    expect(body).toContain('aria-label="Table"');
    expect(body).toContain('aria-label="Link"');
    expect(body).toContain('aria-label="Picture"');
    expect(body).toContain('aria-label="Video"');
    expect(body).toContain('aria-label="Insert a gif"');
    expect(body).toContain('aria-label="Insert an image carousel"');
  });
});
