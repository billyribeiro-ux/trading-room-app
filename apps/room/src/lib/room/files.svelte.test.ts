// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FilesSessionFlags } from '#lib/files-gates.js';

import { RoomDialogs } from './dialogs.svelte';
import { type RoomFileRow, RoomFiles } from './files.svelte';

/*
  The file drive, EXECUTED rather than read as text.

  `files-pane-contract.test.ts` reads three sources as strings and pins the markup, the wiring and
  the commands against the capture. What it cannot do is run any of this, and three of the decisions
  slice 6 took only exist at runtime:

  - `filesHidden` is a GETTER, not a `$derived` field, because a derived field initialises before
    the constructor assigns the thunk it reads. A string assertion cannot tell those two apart.
  - `files` and `sessData` are THUNKS, so a navigation that replaces `data` reaches the pane. Read
    as text this is a pair of arrow functions and nothing more.
  - the sort pair is ONE value, so a field change cannot leave a stale direction behind.

  Each of those is a test below, and each was watched go red against the wrong implementation before
  being kept — the negative controls are named in the comments where they are not obvious.
*/

const ROWS: RoomFileRow[] = [
  {
    id: 1,
    name: 'chart.png',
    kind: 'image',
    url: '/uploads/chart.png',
    contentType: 'image/png',
    size: 4096,
    createdAt: new Date('2026-01-02T00:00:00Z')
  },
  {
    id: 2,
    name: 'bell.mp3',
    kind: 'sound',
    url: '/uploads/bell.mp3',
    contentType: 'audio/mpeg',
    size: 8192,
    createdAt: new Date('2026-01-01T00:00:00Z')
  },
  {
    id: 3,
    name: 'notes.pdf',
    kind: 'file',
    url: '/uploads/notes.pdf',
    contentType: 'application/pdf',
    size: 2048,
    createdAt: new Date('2026-01-03T00:00:00Z')
  }
];

const make = (options: { refuse?: boolean } = {}) => {
  /*
    Plain `let`s behind the thunks, deliberately. The page reads `data`, which is a `$props()`
    value; what this harness has to reproduce is that the class holds a WAY TO READ it rather than a
    copy of it, and a plain variable proves that more honestly than reactive state would — if the
    class had captured the array, reassigning this would not reach it.
  */
  let rows: readonly RoomFileRow[] = ROWS;
  let session: FilesSessionFlags = {};

  const sent: Array<{ command: string; payload: unknown }> = [];
  const invalidated: string[] = [];
  const dialogs = new RoomDialogs();

  const reject = () => Promise.reject(new Error('the server refused'));
  const files = new RoomFiles({
    dialogs,
    files: () => rows,
    sessData: () => session,
    commands: {
      deleteFile: (payload) =>
        options.refuse
          ? reject()
          : (sent.push({ command: 'deleteFile', payload }), Promise.resolve()),
      setAlertSound: (payload) =>
        options.refuse
          ? reject()
          : (sent.push({ command: 'setAlertSound', payload }), Promise.resolve())
    },
    onFilesChanged: () => (invalidated.push('all'), Promise.resolve()),
    onRoomDataChanged: () => (invalidated.push('room:data'), Promise.resolve())
  });

  return {
    files,
    dialogs,
    sent,
    invalidated,
    setRows: (next: readonly RoomFileRow[]) => (rows = next),
    setSession: (next: FilesSessionFlags) => (session = next)
  };
};

beforeEach(() => {
  // jsdom does not implement playback and throws "Not implemented" from `play()`.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('the thunks, which are why this class holds no copy of `data`', () => {
  it('reads the CURRENT rows after a navigation replaces them', () => {
    const { files, setRows } = make();
    expect(files.countFiles('files')).toBe(1);

    setRows([...ROWS, { ...ROWS[2], id: 4, name: 'deck.pdf' }]);

    /*
      The negative control for this one is the whole point of the thunk: constructing with
      `files: () => rows` and then handing `rows` itself instead returns 1 here, because the class
      would be holding the array it was given at construction rather than asking for the current one.
    */
    expect(files.countFiles('files'), 'the row thunk is being read once and cached').toBe(2);
  });

  it('recomputes `filesHidden` instead of caching it, which a `$derived` field could not do', () => {
    const { files, setSession } = make();
    expect(files.filesHidden).toBe(false);

    setSession({ hideFiles: true });

    /*
      This is the executable form of the design note on the getter. A `$derived` class field
      initialises in DECLARATION ORDER — before the constructor has assigned `#sessData` — so it
      would evaluate `filesSectionHidden(undefined)`, throw or cache `false`, and never move again.
      Written as a getter it re-reads, so a controller flipping "Hide Files Section?" reaches the
      pane on the next five-second `invalidate('room:data')` without a reload.
    */
    expect(files.filesHidden, 'the hide gate is cached rather than recomputed').toBe(true);
  });
});

describe('every public getter is reactive', () => {
  /*
    Mutations and flushes INSIDE `$effect.root`, assertions OUTSIDE it, for the reason
    `room-mtx.svelte.test.ts` records: the root swallows a thrown assertion, so a test that asserts
    inside it passes with a deliberately false expectation in place.

    One assertion per INDEPENDENTLY reactive group, not one for the class. A wiring that made
    `fileTab` reactive and left `selectedFileIds` stale would pass a single test and still draw
    every checkbox unticked after a click.
  */
  it('re-runs a reader when the tab changes', () => {
    const { files } = make();
    const seen: string[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(files.fileTab));
      flushSync();
      files.fileTab = 'sounds';
      flushSync();
    });
    stop();
    expect(seen, 'the fileTab getter is not reactive').toEqual(['files', 'sounds']);
  });

  it('re-runs a reader when the sort pair is toggled', () => {
    const { files } = make();
    const seen: string[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(`${files.fileSort.field}/${files.fileSort.direction}`));
      flushSync();
      files.applyFileSort('name');
      flushSync();
    });
    stop();
    expect(seen, 'the fileSort getter is not reactive').toEqual(['date/desc', 'name/asc']);
  });

  it('re-runs a reader when a row is ticked', () => {
    const { files } = make();
    const seen: number[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(files.selectedFileIds.size));
      flushSync();
      files.toggleFileSelection(1, true);
      flushSync();
    });
    stop();
    expect(seen, 'the selectedFileIds getter is not reactive').toEqual([0, 1]);
  });

  it('re-runs a reader when a sound starts playing for this viewer', () => {
    const { files } = make();
    const seen: number[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(files.playingForMe.size));
      flushSync();
      files.playMp3ForMe(ROWS[1]);
      flushSync();
    });
    stop();
    expect(seen, 'the playingForMe getter is not reactive').toEqual([0, 1]);
  });

  it('re-runs the row list when the search box reports a new term', () => {
    /*
      `fileSearch` has no getter at all — the box writes, `searchedFiles()` reads. So the reactivity
      that matters is the LIST's, and this is what proves `search()` is a real write into `$state`
      rather than a field the compiler never instrumented.
    */
    const { files } = make();
    const seen: number[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(files.searchedFiles().length));
      flushSync();
      files.search('mp3');
      flushSync();
    });
    stop();
    expect(seen, 'searchedFiles does not track the search term').toEqual([3, 1]);
  });
});

describe('searching and sorting, as the reference composes them', () => {
  it('matches EVERY string field, not just the name', () => {
    const { files } = make();
    // By content type — the case that silently returned nothing when this tested `item.name` alone.
    expect(files.searchedFiles().map((f) => f.id)).toHaveLength(3);
    files.search('audio/');
    expect(files.searchedFiles().map((f) => f.id)).toEqual([2]);
    files.search('pdf');
    expect(files.searchedFiles().map((f) => f.id)).toEqual([3]);
  });

  it('searches FIRST and sorts second, and opens on date/desc', () => {
    const { files } = make();
    expect(files.fileSort).toEqual({ field: 'date', direction: 'desc' });
    expect(files.searchedFiles().map((f) => f.name)).toEqual([
      'notes.pdf',
      'chart.png',
      'bell.mp3'
    ]);
  });

  it('resets the direction to the new field default rather than carrying the old one', () => {
    /*
      The defect `#lib/file-sort.js` was written to close, kept closed by holding ONE value: with two
      fields, toggling date to descending and then switching to name left name sorted descending,
      which the v4 bundle disagrees with at byte 1,975,308.
    */
    const { files } = make();
    files.applyFileSort('date');
    expect(files.fileSort).toEqual({ field: 'date', direction: 'asc' });
    files.applyFileSort('name');
    expect(files.fileSort, 'a stale direction survived a field change').toEqual({
      field: 'name',
      direction: 'asc'
    });
  });

  it('keys the tab gate on the singular kind', () => {
    const { files } = make();
    expect(files.countFiles('images')).toBe(1);
    expect(files.countFiles('sounds')).toBe(1);
    expect(files.matchesFileTab(ROWS[2])).toBe(true);
    files.fileTab = 'sounds';
    expect(files.matchesFileTab(ROWS[1])).toBe(true);
    expect(files.matchesFileTab(ROWS[2])).toBe(false);
  });
});

describe('the commands, and the refusals that must stay visible', () => {
  it('asks before deleting, and only deletes when the answer is yes', async () => {
    const { files, dialogs, sent, invalidated } = make();
    files.deleteFile({ id: 1, name: 'chart.png' });

    expect(dialogs.confirmation?.message).toBe('Delete file: "chart.png" ?');
    expect(sent, 'a file was deleted before anyone confirmed').toEqual([]);

    await dialogs.confirmation?.onconfirm();
    expect(sent).toEqual([{ command: 'deleteFile', payload: { fileId: 1 } }]);
    expect(dialogs.confirmation, 'the prompt must close itself').toBeNull();
    expect(invalidated).toEqual(['all']);
  });

  it("keeps the capture's misspelled empty-selection alert, and sends nothing", () => {
    const { files, dialogs, sent } = make();
    files.deleteSelectedFiles();
    expect(dialogs.alert).toBe('No files where checked...');
    expect(sent).toEqual([]);
  });

  it('deletes each ticked row and clears the selection', async () => {
    const { files, dialogs, sent } = make();
    files.toggleFileSelection(1, true);
    files.toggleFileSelection(2, true);
    files.toggleFileSelection(1, false);
    files.toggleFileSelection(3, true);
    expect([...files.selectedFileIds]).toEqual([2, 3]);

    files.deleteSelectedFiles();
    expect(dialogs.confirmation?.message).toBe('Are you sure you want to delete 2 files ?');
    await dialogs.confirmation?.onconfirm();

    expect(sent.map((s) => (s.payload as { fileId: number }).fileId)).toEqual([2, 3]);
    expect([...files.selectedFileIds], 'the ticks outlived the rows').toEqual([]);
  });

  it('surfaces a refused delete instead of dropping it', async () => {
    const { files, dialogs } = make({ refuse: true });
    files.deleteFile({ id: 1, name: 'chart.png' });
    await dialogs.confirmation?.onconfirm();
    expect(dialogs.alert).toBe('Delete failed.');
  });

  it('does NOT re-read the room when the alert sound is refused', async () => {
    /*
      The label-only lie this path exists to avoid: re-reading after a refusal redraws the button at
      a setting the controller never stored, so the room would show "Remove as alert sound" for a
      sound it never accepted. The `return` in the catch is what prevents it, and this is the
      assertion that keeps it there — deleting that one word leaves every other test green.
    */
    const { files, dialogs, invalidated } = make({ refuse: true });
    await files.setAlertSound('/uploads/bell.mp3', true);
    expect(dialogs.alert).toBe('Command failed.');
    expect(invalidated, 'a refused setting was read back as though it had been stored').toEqual([]);
  });

  it('re-reads only the room settings when the alert sound is accepted', async () => {
    const { files, sent, invalidated } = make();
    await files.setAlertSound('/uploads/bell.mp3', true);
    expect(sent).toEqual([
      { command: 'setAlertSound', payload: { url: '/uploads/bell.mp3', on: true } }
    ]);
    // `invalidate('room:data')`, not `invalidateAll()` — one setting changed, not the whole page.
    expect(invalidated).toEqual(['room:data']);
  });
});

describe('playing a sound for this viewer only', () => {
  it('builds a hidden audio element keyed by the file id, and removes it to stop', () => {
    const { files } = make();
    files.playMp3ForMe(ROWS[1]);

    const audio = document.getElementById('file-audio-2') as HTMLAudioElement | null;
    expect(audio, 'the capture appends a real element; nothing plays without one').not.toBeNull();
    expect(audio?.getAttribute('type')).toBe('audio/mpeg');
    expect(audio?.style.display).toBe('none');
    expect(files.playingForMe.has(2)).toBe(true);

    files.playMp3ForMe(ROWS[1]);
    expect(document.getElementById('file-audio-2')).toBeNull();
    expect(files.playingForMe.has(2)).toBe(false);
  });

  it('clears the flag when playback ends on its own, so the label stays honest', () => {
    /*
      The capture leaves the element behind on natural end and goes on showing "Stop". Clearing it
      is a deliberate divergence, recorded at the handler, and this is what holds it.
    */
    const { files } = make();
    files.playMp3ForMe(ROWS[1]);
    document.getElementById('file-audio-2')?.dispatchEvent(new Event('ended'));

    expect(document.getElementById('file-audio-2')).toBeNull();
    expect(files.playingForMe.has(2), 'the button still says Stop for a sound that finished').toBe(
      false
    );
  });
});
