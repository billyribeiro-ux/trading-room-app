// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RoomDialogs } from '#lib/room/dialogs.svelte.js';
import { RoomFiles } from '#lib/room/files.svelte.js';

import FilesPane from './FilesPane.svelte';

/*
  THE FILES PANE, MOUNTED — the second pane in this repository to get one, and the first since
  `PrivateChatPanel.test.ts`.

  ## Why this pane, and why now

  `files-pane-contract.test.ts` is large and careful, and every one of its assertions reads SOURCE
  TEXT. That instrument can prove a `{#if}` exists. It cannot prove what the browser ends up with,
  and this component has one behaviour where those two things come apart badly:

      {#each files.searchedFiles() as item (item.id)}
        <tr>
          {#if !files.matchesFileTab(item)}
            <!-- deliberately empty -->

  **A file belonging to another tab still emits its `<tr>`.** The row is empty, invisible, and
  load-bearing — because the captured stylesheet stripes on POSITION:

      .st-fileTable tbody tr:nth-of-type(odd) { background-color: var(--file-list-odd-bg) }
      .st-fileTable tbody tr:nth-of-type(2n)  { background-color: var(--file-list-even-bg) }

  `~/CLAUDE.md` records where this came from: reading `more-fucking-evidence/sounds` end to end
  showed 30 empty `<tr>` elements around 2 populated ones. No search for a class name would ever have
  surfaced an EMPTY element, and no source-text assertion can tell "renders a row per file" from
  "renders a row per VISIBLE file". Filtering at the loop would look correct in the diff, pass every
  existing assertion, and invert the banding against the capture.

  ## This is NOT duplicate coverage, and that was proven rather than argued

  `files-pane-contract.test.ts:623` already asserts the two source strings:

      expect(pane).toContain('{#each files.searchedFiles() as item (item.id)}');
      expect(pane).toContain('{#if !files.matchesFileTab(item)}');

  So the obvious objection is that this file adds nothing. It was tested rather than debated, with a
  mutation chosen to keep BOTH of those strings intact while destroying the behaviour — wrapping the
  `<tr>` in `{#if files.matchesFileTab(item)}`:

      files-pane-contract.test.ts ....... 64 passed   (blind)
      FilesPane.test.ts ................. 2 failed    (caught)

  Every empty row gone, the banding inverted on every visible row, and the source-text contract
  entirely green. That is the gap, measured. A `toContain` proves a string is present; it cannot
  prove the element it describes reaches the document.

  ## jsdom has no layout, and that does not matter here

  The repository's standing caveat is that jsdom cannot prove a panel is draggable or positioned. It
  is not being asked to. `:nth-of-type` is a SELECTOR, not layout — `element.matches(...)` resolves
  it exactly as a browser would, against real parsed DOM. So the banding is checkable even though
  the colours are not.

  ## What is real and what is stubbed

  `RoomFiles` is the real class, constructed with real rows: the tab predicate and the search are the
  subject, so stubbing them would test the stub. `RoomDialogs` is real too — it is a plain state
  container. Only the three command callbacks are spies, because they reach the network.
*/

const file = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'f1',
  name: 'chart.png',
  kind: 'file',
  url: 'https://cdn.invalid/chart.png',
  contentType: 'image/png',
  size: 1024,
  createdAt: new Date('2026-08-01T00:00:00Z'),
  ...over
});

const mountPane = (rows: ReturnType<typeof file>[], fileTab = 'files') => {
  const dialogs = new RoomDialogs();
  const files = new RoomFiles({
    dialogs,
    files: () => rows as never,
    sessData: () => ({}) as never,
    commands: {
      rename: vi.fn(),
      remove: vi.fn(),
      setAlertSound: vi.fn()
    } as never,
    onFilesChanged: vi.fn(async () => {}),
    onRoomDataChanged: vi.fn(async () => {})
  });
  files.fileTab = fileTab as never;

  const target = document.createElement('div');
  document.body.append(target);
  const component = mount(FilesPane, {
    target,
    props: {
      /*
        `data.files` is the LOAD's raw list and is read separately from the `RoomFiles` facade:
        `FilesPane.svelte:316` gates the sort bar on `data.files.length > 0` while the rows come
        from `files.searchedFiles()`. Both are fed the same rows here, as the page does.
      */
      data: { sessData: {}, user: {}, files: rows } as never,
      isPresenter: true,
      files,
      mainTab: 'files' as never,
      mp3Playing: false,
      playMp3ForAll: vi.fn(async () => {}),
      stopMp3ForAll: vi.fn(async () => {}),
      openModal: vi.fn()
    }
  });
  flushSync();
  return { component, target, files };
};

let mounted: ReturnType<typeof mountPane> | null = null;

afterEach(() => {
  if (mounted) unmount(mounted.component);
  mounted = null;
  document.body.innerHTML = '';
});

describe('the file table emits a row per FILE, not per visible file', () => {
  it('renders an empty <tr> for a file belonging to another tab', () => {
    /*
      Three files, one of which is an mp3. On the `files` tab the mp3 does not match, so the
      capture still emits its row and collapses the cells. Filtering at the loop would give two
      rows here and would pass every source-text assertion in the sibling contract file.
    */
    mounted = mountPane([
      file({ id: 'a', name: 'one.png' }),
      file({ id: 'b', name: 'song.mp3', kind: 'mp3' }),
      file({ id: 'c', name: 'two.png' })
    ]);

    const rows = [...mounted.target.querySelectorAll('#filesDriveList tr')];
    expect(rows, 'a row must be emitted for every file, matching or not').toHaveLength(3);

    // The middle row is the mp3: present, and empty.
    expect(rows[1].textContent?.trim()).toBe('');
    expect(rows[1].children).toHaveLength(0);
    // Its neighbours are not empty, which is what makes the assertion above mean something.
    expect(rows[0].textContent).toContain('one.png');
    expect(rows[2].textContent).toContain('two.png');
  });

  it('the empty row SHIFTS the striping, which is the whole reason it exists', () => {
    /*
      The captured rule bands on `:nth-of-type`, so position is the value. With the mp3's row
      present, `two.png` is the THIRD row and therefore odd-striped. Drop the empty row and it
      becomes the second — even — and every subsequent row inverts against the capture.

      `matches()` resolves the selector in jsdom exactly as a browser would; no layout is involved.
    */
    mounted = mountPane([
      file({ id: 'a', name: 'one.png' }),
      file({ id: 'b', name: 'song.mp3', kind: 'mp3' }),
      file({ id: 'c', name: 'two.png' })
    ]);

    const rows = [...mounted.target.querySelectorAll('#filesDriveList tr')];
    expect(rows[0].matches(':nth-of-type(odd)'), 'row 1 is odd').toBe(true);
    expect(rows[1].matches(':nth-of-type(2n)'), 'the empty row is even').toBe(true);
    expect(
      rows[2].matches(':nth-of-type(odd)'),
      'two.png must be ODD — it is the third row because the empty one counts'
    ).toBe(true);
  });

  it('the table carries the class the captured rule is scoped to', () => {
    // `.st-fileTable tbody tr:nth-of-type(...)`. Without this class the banding never applies and
    // the two assertions above would be describing a table nothing styles.
    mounted = mountPane([file()]);
    const table = mounted.target.querySelector('table');
    expect(table?.className).toContain('st-fileTable');
    expect(mounted.target.querySelector('#filesDriveList')).not.toBeNull();
  });
});

describe('the search runs over every string field, not just the name', () => {
  it('finds a file by its CONTENT TYPE, which the name does not contain', () => {
    /*
      `searchedFiles()` walks `Object.values(item)` and tests every string. This is asserted through
      the DOM rather than by calling the method, because the pane is what has to end up showing the
      row — a correct predicate wired to the wrong loop renders nothing and passes a unit test.
    */
    mounted = mountPane([
      file({ id: 'a', name: 'one.png', contentType: 'image/png' }),
      file({ id: 'b', name: 'two.txt', contentType: 'text/plain' })
    ]);

    // `search(value)` is a METHOD, not a bindable property — `files.svelte.ts:216` records why:
    // the box only ever writes and `searchedFiles()` is the only reader, so a bindable had a dead
    // incoming half. An earlier draft of this test assigned `files.fileSearch` and silently set an
    // arbitrary property, leaving the search empty and every row rendered.
    mounted.files.search('text/plain');
    flushSync();

    const rows = [...mounted.target.querySelectorAll('#filesDriveList tr')];
    const text = rows.map((r) => r.textContent ?? '').join(' ');
    expect(text).toContain('two.txt');
    expect(text).not.toContain('one.png');
  });
});
