import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import NoteEditor from './components/notes/NoteEditor.svelte';
import {
  NOTE_VERSION_PREVIEW_MAX_LENGTH,
  noteVersionDate,
  noteVersionPreview,
  noteVersionRevertMessage
} from './components/notes/version-history';
import type { NoteVersion } from './types';

/**
 * The note Version History panel.
 *
 * `docs/source/components/app-note.full.js` is the reference component in full — the toggle is
 * `C0e`, the panel is `w0e`, one row is `S0e`, and every class comes from that component's own
 * `consts` table. This file used to pin BOTH halves, the way `stream-ingest.test.ts` does: what the
 * capture actually contains, so a future reader can see the markup was transcribed rather than
 * invented, and what we render, so it cannot drift away from it.
 *
 * ## The first half moved on 2026-09-03, and here is why
 *
 * `docs/source` is gitignored, so a MODULE-SCOPE read of it excluded all seventeen cases here from
 * every checkout without the dumps — this container, and CI. Four needed the capture;
 * `note-version-history-capture.test.ts` holds them, as the `what the capture actually contains`
 * block this file had already separated them into. The thirteen that stayed are the SECOND half:
 * they execute `noteVersionPreview`, `noteVersionDate` and the revert sentence, and render
 * `NoteEditor` to read the HTML it emits. Both halves still exist; only one needs a dump to run.
 */

const ISO = '2026-08-11T14:32:05.000Z';

function version(id: number, contentHtml: string | null, createdAt = ISO): NoteVersion {
  return { id, noteId: 59, contentHtml, updatedById: 1, version: id, createdAt };
}

function editor(props: {
  showVersionHistory?: boolean;
  versions?: readonly NoteVersion[];
}): string {
  return render(NoteEditor, {
    props: {
      contentHtml: '',
      giphyApiKey: '',
      onBringEveryone: () => undefined,
      onDirtyChange: () => undefined,
      onDone: () => undefined,
      onRequestRestore: () => undefined,
      onSave: () => undefined,
      onSetWelcomeMat: () => undefined,
      onUploadImages: async () => [],
      onVersionHistoryOpenChange: () => undefined,
      showVersionHistory: props.showVersionHistory ?? false,
      simplifiedEditor: false,
      /* The carousel's image browser reads this; an empty room offers none. */
      sessionImages: [],
      versions: props.versions ?? []
    }
  }).body;
}

describe('noteVersionPreview', () => {
  it('turns tags into a space rather than deleting them', () => {
    /*
      `<p>one</p><p>two</p>` has no whitespace between the two words. Replacing a tag with the empty
      string would render `onetwo`, which is why the reference substitutes a space and then collapses
      runs of whitespace rather than doing it in one pass.
    */
    expect(noteVersionPreview('<p>one</p><p>two</p>')).toBe('one two');
    expect(noteVersionPreview('<b>bold</b>text')).toBe('bold text');
  });

  it('collapses whitespace runs and trims the ends', () => {
    expect(noteVersionPreview('  spaced   \n\t out  ')).toBe('spaced out');
    expect(noteVersionPreview('<div>   </div>')).toBe('');
    expect(noteVersionPreview('')).toBe('');
  });

  it('truncates past 100 characters and appends an ellipsis', () => {
    expect(NOTE_VERSION_PREVIEW_MAX_LENGTH).toBe(100);

    const exactly = 'a'.repeat(100);
    expect(noteVersionPreview(exactly)).toBe(exactly);
    expect(noteVersionPreview(exactly)).not.toContain('...');

    const longer = 'a'.repeat(101);
    expect(noteVersionPreview(longer)).toBe(`${'a'.repeat(100)}...`);
    expect(noteVersionPreview(longer)).toHaveLength(103);
  });

  it('does not pretend to be a sanitiser', () => {
    /*
      This is the reason the panel renders the preview through `safeNoteHtml` instead of `{@html}`.

      A regex over `<[^>]*>` leaves entity-encoded markup completely intact, so the string coming
      out of here can still be markup once a browser decodes it. The reference hands exactly this
      to `innerHTML` via its `noSanitize` pipe; we do not.
    */
    expect(noteVersionPreview('&lt;script&gt;alert(1)&lt;/script&gt;')).toContain('&lt;script&gt;');
  });
});

describe('noteVersionDate and the revert sentence', () => {
  it('formats with the platform, never by hand', () => {
    /*
      Deliberately the same call, because the property under test is that there is no second
      implementation. A hand-rolled format over a date string is what produced `20-3341` in this
      repository once already; the assertion that matters is the negative one below.
    */
    expect(noteVersionDate(ISO)).toBe(new Date(ISO).toLocaleString());
    expect(noteVersionDate(ISO)).not.toContain('T');
    expect(noteVersionDate(ISO)).not.toBe(ISO);
  });

  it('quotes that same string inside the confirmation', () => {
    const message = noteVersionRevertMessage(ISO);

    expect(message).toBe(
      `Are you sure you want to revert to the version from ${noteVersionDate(ISO)}? Your current content will be replaced.`
    );
    expect(message.startsWith('Are you sure you want to revert to the version from ')).toBe(true);
    expect(message.endsWith('? Your current content will be replaced.')).toBe(true);
  });
});

describe('what NoteEditor renders', () => {
  it('offers no toggle for a note with no history', () => {
    const body = editor({ versions: [] });

    expect(body).not.toContain('Version History');
    expect(body).not.toContain('fa-history');
    expect(body).not.toContain('version-history-panel');
  });

  it('renders the toggle with the count once history exists', () => {
    const body = editor({ versions: [version(3, '<p>c</p>'), version(2, '<p>b</p>')] });

    expect(body).toContain('class="btn btn-warning text-center m-1"');
    expect(body).toContain('<i class="fas fa-history"></i> Version History (2)');
    // Closed, so the panel is absent entirely rather than hidden.
    expect(body).not.toContain('version-history-panel');
  });

  it('marks the toggle active only while the panel is open', () => {
    const closed = editor({ versions: [version(1, 'a')], showVersionHistory: false });
    const open = editor({ versions: [version(1, 'a')], showVersionHistory: true });

    expect(closed).toContain('class="btn btn-warning text-center m-1"');
    expect(open).toContain('class="btn btn-warning text-center m-1 active"');
  });

  it('renders the panel, its header, and one row per version', () => {
    const body = editor({
      showVersionHistory: true,
      versions: [version(3, '<p>newest</p>'), version(2, '<p>older</p>')]
    });

    expect(body).toContain('<div class="version-history-panel card mt-2 mb-2');
    // Trailing quote omitted: these three carry a scoped-style class of their own after the name.
    expect(body).toContain('<div class="card-header');
    expect(body).toContain('<i class="fas fa-history"></i> Previous Versions');
    expect(body).toContain('class="close float-right"');
    expect(body).toContain('<span>×</span>');
    expect(body).toContain('<ul class="list-group list-group-flush');
    expect(
      body.match(/<li class="list-group-item d-flex justify-content-between align-items-center/g)
    ).toHaveLength(2);
    expect(body).toContain('class="badge bg-secondary text-light"');
    expect(body).toContain('class="version-preview');
    expect(body).toContain('class="btn btn-sm btn-outline-primary"');
    expect(body.match(/<i class="fas fa-undo"><\/i> Revert/g)).toHaveLength(2);
  });

  it('shows the localised date and never the raw stored timestamp', () => {
    const body = editor({ showVersionHistory: true, versions: [version(1, 'a')] });

    expect(body).toContain(noteVersionDate(ISO));
    // The row must not leak the ISO string the row is stored as.
    expect(body).not.toContain(ISO);
  });

  /*
    The preview element is rendered empty here ON PURPOSE, and that is a limitation of the check
    rather than of the component: its text arrives through `{@attach safeNoteHtml(...)}`, and
    attachments do not run during server rendering. The transformation itself is covered by the
    `noteVersionPreview` block above; what this asserts is that the element exists to receive it and
    that no unsanitised content was written into the markup instead.
  */
  it('leaves the preview to the sanitising attachment rather than inlining note HTML', () => {
    const body = editor({
      showVersionHistory: true,
      versions: [version(1, '<p>hello <b>there</b></p>')]
    });

    expect(body).toContain('<div class="version-preview');
    expect(body).not.toContain('<b>there</b>');
  });

  it('survives a version whose content is null', () => {
    // `note_versions.content_html` is nullable, and a deleted-then-restored note reaches it.
    const body = editor({ showVersionHistory: true, versions: [version(1, null)] });

    expect(body).toContain('class="version-preview');
    expect(body).toContain(noteVersionDate(ISO));
  });
});
