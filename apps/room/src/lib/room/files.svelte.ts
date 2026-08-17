import { isHttpError } from '@sveltejs/kit';

import {
  INITIAL_FILE_SORT,
  type FileSortField,
  sortFiles,
  toggleFileSort
} from '#lib/file-sort.js';
import { type FilesSessionFlags, filesSectionHidden } from '#lib/files-gates.js';
import type { FileTab } from '#lib/types.js';

import type { RoomDialogs } from './dialogs.svelte';

/**
 * One row of the file drive, as the loader's `sharedFiles` select returns it.
 *
 * Declared with the fields this class and `FilesPane` actually touch rather than imported from
 * `./$types`: nothing else in this directory reaches into route types, and a structural row keeps
 * the class testable without a loader. `searchedFiles()` searches `Object.values`, so the rows it
 * matches on at RUNTIME are every field the row really has — this type narrows what may be READ,
 * not what is there.
 */
export interface RoomFileRow {
  id: number;
  name: string;
  kind: string;
  url: string;
  contentType: string;
  size: number;
  createdAt: Date | string | number;
}

/** The two commands this pane sends, injected so the class needs no route import. */
export interface RoomFileCommands {
  deleteFile: (payload: { fileId: number }) => Promise<unknown>;
  setAlertSound: (payload: { url: string; on: boolean }) => Promise<unknown>;
}

/*
  The Files pane: which tab, what is typed in the search box, how the rows are sorted, which are
  ticked, and every command a row can send.

  Phase 5 slice 6. It is the slice with the clearest payoff beyond its own line count, because the
  props it collapses are drilled TWICE: `+page.svelte` handed fifteen of them to `PresentationArea`,
  which passed the same fifteen straight through to `FilesPane` while reading only `filesHidden`
  itself. One object replaces both hops, so thirty prop declarations become two.

  ## `data` arrives as a THUNK, never as an array

  `files` and `sessData` are read through functions for the reason `$state`'s own "passing state
  into functions" section gives: `data` is a `$props()` value, so handing over `data.files` would
  hand over THAT array, and the class would still be showing it after a navigation replaced it.
  Reading a thunk inside a getter tracks whatever it touches. `RoomRoster` already does this.

  ## `filesHidden` is a getter rather than a `$derived` field, deliberately

  A `$derived` class field initialises in declaration order, before the constructor assigns the
  thunk it would need — so it would evaluate against `undefined` exactly once and cache that. The
  getter recomputes, which for one boolean predicate is cheaper than the bug.

  ## The sort pair cannot drift

  `fileSort` is one `$state.raw` value holding field AND direction, replaced wholesale by
  `toggleFileSort`. Two separate fields is what let a stale direction survive a field change, which
  is the defect `#lib/file-sort.js` was written to close; keeping them one value here keeps it closed.

  ## Which fields are public, and why three of them are not

  `fileTab` is the only one with a setter, because the three tab buttons write it and nothing else
  decides which tab is showing. `fileSearch` has no accessor AT ALL — the box only ever writes it
  and `searchedFiles()` is the only reader, so a getter would be a member with no consumer;
  `search()` is its receiver, and that direction is the same one `PresentationArea`'s
  `onfilesearch` prop recorded when ESLint's `no-useless-assignment` refused a bindable whose
  incoming half was dead. `selectedFileIds` and `playingForMe` are written only by the methods
  below, which is what keeps their copy-on-write replacement in one place.

  ## `SvelteSet` was suggested by the autofixer and DECLINED, for the third time in this phase

  `svelte-autofixer` reports every `new Set()` here as "use SvelteSet instead". Both sets are
  COPY-ON-WRITE: `toggleFileSelection` builds `new Set(previous)`, mutates the copy, and assigns —
  so the mutation happens before the value is ever stored, and the `$state` REASSIGNMENT is what
  publishes it. Nothing mutates a set that is already in a field, which is the only case `SvelteSet`
  exists to make reactive.

  Switching would trade eight allocations for a proxy on every read and change behaviour on a path
  no test covers, in a slice whose whole job is to MOVE code. `RoomToasts` declined the matching
  `SvelteMap` suggestion for the same reason, and `TODO.md` lists these sites under "Not gaps —
  decisions taken deliberately". Recorded here so the next reader does not re-litigate it from the
  autofixer's output alone.
*/
export class RoomFiles {
  readonly #dialogs: RoomDialogs;
  readonly #files: () => readonly RoomFileRow[];
  readonly #sessData: () => FilesSessionFlags;
  readonly #commands: RoomFileCommands;
  readonly #onFilesChanged: () => Promise<void>;
  readonly #onRoomDataChanged: () => Promise<void>;
  #fileTab: FileTab;
  #fileSearch;
  #fileSort;
  #selectedFileIds: Set<number>;
  #playingForMe: Set<number>;

  constructor(options: {
    dialogs: RoomDialogs;
    files: () => readonly RoomFileRow[];
    sessData: () => FilesSessionFlags;
    commands: RoomFileCommands;
    onFilesChanged: () => Promise<void>;
    onRoomDataChanged: () => Promise<void>;
  }) {
    this.#dialogs = options.dialogs;
    this.#files = options.files;
    this.#sessData = options.sessData;
    this.#commands = options.commands;
    this.#onFilesChanged = options.onFilesChanged;
    this.#onRoomDataChanged = options.onRoomDataChanged;

    this.#fileTab = $state('files');

    this.#fileSearch = $state('');

    /*
      The Files sort bar's state - ONE field and ONE direction, opening on date/desc.

      This used to be three variables (`fileSortKey`, `nameAscending`, `dateNewestFirst`) built from
      the owner's pasted markup, because the capture we held at the time contained no sort bar at all.
      The v4 bundle does contain it, and it disagrees on two points that a per-button direction cannot
      express: both icons read the same `fileSortDir` (bytes 1,946,450 and 1,946,605), and switching
      field RESETS that direction to the new field's default rather than restoring a remembered one
      (byte 1,975,308). `#lib/file-sort.js` holds the decode and the reasoning.

      `$state.raw`, not `$state`: this object is only ever REPLACED, by `toggleFileSort` returning a
      new pair, so a deep proxy over it would be per-read overhead buying nothing. The pair is one
      value rather than two so the field and the direction cannot drift apart.
    */
    this.#fileSort = $state.raw(INITIAL_FILE_SORT);

    /*
      The row checkboxes that feed "Delete Selected"; `#filesDriveList input:checked` in the capture.

      `$state.raw`, and the change on 2026-08-17 turned a CONVENTION into a GUARANTEE.

      This is one of the eight copy-on-write `Set` sites — `toggleFileSelection` builds
      `new Set(this.#selectedFileIds)`, mutates the COPY, and reassigns. That pattern is a recorded
      decision and is not what changed. What changed is that it used to depend on everyone
      remembering: a `.add()` straight onto a proxied `$state` Set would have worked, so nothing
      stopped the copy being skipped.

      Raw state cannot be mutated at all — only reassigned — so the discipline is now enforced by the
      rune rather than by discipline. `state-raw-contract.test.ts` guards the other direction too: a
      `.add()` on a raw Set updates the Set and notifies NOTHING, which is silent and has no error.
    */
    this.#selectedFileIds = $state.raw<Set<number>>(new Set());

    /**
     * `playMp3ForMe(e)` - a toggle that builds a hidden `<audio>` keyed by the file id and removes
     * that same element to stop:
     *
     * ```js
     * this.isPlayingForMe[e._id] = !this.isPlayingForMe?.[e._id];
     * if (playing) { const i = document.createElement('audio');
     *   i.controls = !0; i.type = e.contentType; i.src = e.vidPath; i.id = e._id;
     *   i.style.display = 'none'; document.body.appendChild(i); i.play(); }
     * else { document.body.removeChild(document.getElementById(e._id)); }
     * ```
     */
    this.#playingForMe = $state.raw<Set<number>>(new Set());
  }

  get fileTab() {
    return this.#fileTab;
  }

  set fileTab(next: FileTab) {
    this.#fileTab = next;
  }

  get fileSort() {
    return this.#fileSort;
  }

  get selectedFileIds() {
    return this.#selectedFileIds;
  }

  get playingForMe() {
    return this.#playingForMe;
  }

  /**
   * "Hide Files Section?" — `filesSectionHidden` in `#lib/files-gates.js`, tested there.
   *
   * `hidden` on BOTH the main-tab `li` and the `#files` pane, which is what the reference binds
   * (`z('hidden', o.hideFiles)` at full.js:5375 and 5410-5413). Derived rather than copied into
   * `$state` so a controller change picked up by the five-second `invalidate('room:data')` takes
   * effect without a reload.
   *
   * A GETTER rather than a `$derived` field, and that is the one change the extraction made: a
   * derived class field initialises before the constructor has assigned the thunk it reads, so it
   * would cache a value computed against `undefined`. Recomputing one boolean predicate is
   * cheaper than that bug.
   */
  get filesHidden() {
    return filesSectionHidden(this.#sessData());
  }

  /**
   * What was typed in the search box, reported UP — there is no getter to read it back.
   *
   * `PresentationArea` carried this as an `onfilesearch` callback rather than a bindable, and the
   * note there records that ESLint's `no-useless-assignment` is what decided it: the box only
   * writes, `searchedFiles()` is the only reader, so a bindable had a dead incoming half. A
   * receiver keeps that finding true now the prop is gone.
   */
  search(value: string) {
    this.#fileSearch = value;
  }

  /** One delete; the loop above drives it, as the capture's `deleteSelected()` does. */
  async #postDeleteFile(fileId: number) {
    try {
      await this.#commands.deleteFile({ fileId });
    } catch (cause) {
      this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'Delete failed.';
    }
  }

  countFiles(kind: FileTab) {
    const singularKind = kind === 'files' ? 'file' : kind.slice(0, -1);
    return this.#files().filter((item) => item.kind === singularKind).length;
  }

  /** True when a file belongs to the tab on screen - `Ywe`'s `O(1, ...)`, keyed on content type. */
  matchesFileTab(item: { kind: string }) {
    return item.kind === (this.#fileTab === 'files' ? 'file' : this.#fileTab.slice(0, -1));
  }

  /**
   * Every file matching the SEARCH box, sorted - not filtered by tab.
   *
   * The capture's `{#each}` equivalent runs over `filter(sessionFiles, filesSearch)` and emits a
   * `<tr>` for each, leaving the row EMPTY when it belongs to another tab. `more-fucking-evidence/
   * sounds` shows exactly that: 30 `<tr class="ng-star-inserted"><!----></tr>` around the two mp3s.
   *
   * Those empty rows are not inert. `.st-fileTable tbody tr:nth-of-type(2n+1)` stripes on position
   * among ALL rows, so filtering them out here would shift every visible row's stripe by one and
   * invert the banding against the capture.
   */
  /*
    The search matches EVERY string field, not just the name.

    The reference's `filter` pipe lower-cases the query and walks `Object.keys(row)`, testing every
    string-valued property — so a member can find a file by its content type, its id, its date or
    its path, and typing "png" or "mp3" narrows the list. Ours tested `item.name` alone, which
    silently returned nothing for all of those.
  */
  searchedFiles() {
    const query = this.#fileSearch.trim().toLowerCase();
    const matching = this.#files().filter((item) =>
      Object.values(item).some(
        (field) => typeof field === 'string' && field.toLowerCase().includes(query)
      )
    );
    /*
      SEARCH FIRST, THEN SORT, which is the order the reference composes its two pipes in - read at
      byte 1,951,076:

          pt(rg(16,9,Ct(15,6,e.sessionFiles,e.filesSearch),e.fileSortField,e.fileSortDir))

      `Ct` binds the two-argument `filter`, and its result is the FIRST argument to the
      three-argument `sortFiles`. Sorting first and filtering after would give the same rows here,
      but it is not what the reference does and it costs a comparison pass over rows that are about
      to be discarded.

      `sortFiles` copies before it sorts, so the array `filter` just allocated is not sorted in
      place either; see property 1 in `#lib/file-sort.js`.
    */
    return sortFiles(matching, this.#fileSort.field, this.#fileSort.direction);
  }

  /**
   * One click on one of the two sort buttons.
   *
   * The whole transition lives in `#lib/file-sort.js` so it can be exercised without rendering this
   * component; all this does is hand the current pair in and store the pair that comes back. The
   * single assignment is deliberate - `$state.raw` reacts to reassignment, and assigning field and
   * direction separately is what would let a stale direction survive a field change.
   */
  applyFileSort(field: FileSortField) {
    this.#fileSort = toggleFileSort(this.#fileSort, field);
  }

  /**
   * `deleteFile(name, id)`:
   *
   * ```js
   * bootbox.confirm(`Delete file: "${e}" ?`, s => { s && (r.fileID = i, post(cmd), getSessionFiles()) })
   * ```
   */
  deleteFile(file: { id: number; name: string }) {
    this.#dialogs.confirmation = {
      message: `Delete file: "${file.name}" ?`,
      onconfirm: async () => {
        this.#dialogs.confirmation = null;
        await this.#postDeleteFile(file.id);
        await this.#onFilesChanged();
      }
    };
  }

  /**
   * `deleteSelected()` - the checked boxes, a count in the prompt, then the same command per file:
   *
   * ```js
   * $('#filesDriveList input:checked').each(function(){ i.push(this.value) });
   * 0 != i.length
   *   ? bootbox.confirm('Are you sure you want to delete ' + i.length + ' files ?', ...)
   *   : bootbox.alert('No files where checked...');
   * ```
   *
   * The misspelling in the empty-selection alert is the capture's, kept verbatim.
   */
  deleteSelectedFiles() {
    const ids = [...this.#selectedFileIds];
    if (!ids.length) {
      this.#dialogs.alert = 'No files where checked...';
      return;
    }
    this.#dialogs.confirmation = {
      message: `Are you sure you want to delete ${ids.length} files ?`,
      onconfirm: async () => {
        this.#dialogs.confirmation = null;
        for (const id of ids) await this.#postDeleteFile(id);
        this.#selectedFileIds = new Set();
        await this.#onFilesChanged();
      }
    };
  }

  playMp3ForMe(file: { id: number; url: string; contentType: string }) {
    const elementId = `file-audio-${file.id}`;
    const existing = document.getElementById(elementId);
    if (existing) {
      existing.remove();
      const next = new Set(this.#playingForMe);
      next.delete(file.id);
      this.#playingForMe = next;
      return;
    }
    const audio = document.createElement('audio');
    audio.controls = true;
    // `i.type = e.contentType` in the capture. `type` is not a property of HTMLAudioElement, so
    // that line only ever set a JS expando; written as the attribute it actually reaches the DOM.
    audio.setAttribute('type', file.contentType);
    audio.src = file.url;
    audio.id = elementId;
    audio.style.display = 'none';
    // The capture leaves the element behind on natural end, so the button stays showing "Stop"
    // until pressed. Clearing the flag keeps the label honest about what is actually playing.
    audio.addEventListener('ended', () => {
      audio.remove();
      const next = new Set(this.#playingForMe);
      next.delete(file.id);
      this.#playingForMe = next;
    });
    document.body.appendChild(audio);
    void audio.play();
    this.#playingForMe = new Set(this.#playingForMe).add(file.id);
  }

  /**
   * `overwriteCashRegisterSound(e, i)` — "Set as alert sound" and "Remove as alert sound".
   *
   * The reference posts an admin command and then writes the new value into its own
   * `globals.sessData` (full.js:3084-3086). Here the action writes it through to the controller,
   * which is where a room's settings live, and `invalidate('room:data')` re-reads it — so the label
   * changes because the stored value changed, not instead of it. A button whose only effect is
   * changing its own label is the failure mode this avoids.
   */
  async setAlertSound(url: string, on: boolean) {
    try {
      // `on` crosses as a real boolean now; the action carried the strings 'true' / 'false'.
      await this.#commands.setAlertSound({ url, on });
    } catch (cause) {
      this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'Command failed.';
      // Returned, not fallen through: re-reading after a refusal redraws the button at a setting
      // the controller never stored, which is the label-only lie this whole path exists to avoid.
      return;
    }
    await this.#onRoomDataChanged();
  }

  toggleFileSelection(id: number, selected: boolean) {
    const next = new Set(this.#selectedFileIds);
    if (selected) next.add(id);
    else next.delete(id);
    this.#selectedFileIds = next;
  }
}
