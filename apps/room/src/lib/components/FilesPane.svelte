<script lang="ts">
  /*
    `#files` — the room's file drive: the three-tab strip, the toolbar, the sort bar and the table.

    ## Why it is its own component

    It was the one pane inside `PresentationArea` with no component of its own, and the only reason
    it stayed inline that long is that it arrived a piece at a time. Everything around it —
    `NotesPane`, `SwingAlertsPane`, `DayTradeAlertsPane`, `ScreenTabs`, `StreamTabs`, `VideoPlayer` —
    is already a component, so this was the odd one out rather than a deliberate exception.

    ## The prop list came from the COMPILER

    Empty `<script>`, `svelte-check --output machine`, every `Cannot find name`. Twenty-two props
    and five imports, which is what `TODO.md` row AK predicted from the previous pass's measurements
    — the props were already named there because they were `PresentationArea`'s, and that is the
    whole value of writing the measurements down instead of rediscovering them.

    ## What it does NOT decide

    Nothing here reads the database, deletes a file or resolves who may. `isPresenter` arrives
    decided, `alertSoundButtonFor` resolves the two complementary alert-sound gates in
    `#lib/files-gates.js` where they are tested, and every control calls a page callback. The pane
    draws; the page acts.

    ## `mainTab` is READ here and never written

    The main tab strip lives in `PresentationArea` and this pane only needs to know whether it is
    the visible one, so a bindable would hand it an authority it does not use — and `svelte-check`
    is silent on a bindable nobody writes.

    This note used to contrast `mainTab` with `fileTab`, which WAS bindable. It is not any more:
    Phase 5 slice 6 replaced fifteen props with the `RoomFiles` object, and the three tab buttons
    now write `files.fileTab` through its setter. The bind: hop existed only to carry that write
    back up through `PresentationArea`, which never read it, so removing the props removed the
    reason for the binding as well. The prop count in the section above is therefore historical —
    twenty-two was the number the compiler produced when this pane was cut out, and it is eight now.
  */
  import { invalidate } from '$app/navigation';
  import { alertSoundButtonFor } from '#lib/files-gates.js';
  import { fileSizeInKb, fileSortTitle } from '#lib/file-sort.js';
  import { mediumDate } from '#lib/message-formatters.js';
  import type { MainTab, ModalName } from '#lib/types.js';
  import type { RoomFiles } from '#lib/room/files.svelte.js';
  import type { PageProps } from '../../routes/$types';

  interface Props {
    /** Read for `data.files` and for the `sessData` the alert-sound gate resolves against. */
    data: PageProps['data'];
    /** The ROLE, decided on the page. Gates Delete Selected, Upload, and the per-row controls. */
    isPresenter: boolean;
    /**
     * The file drive, whole — `#lib/room/files.svelte.ts`.
     *
     * Fifteen props collapsed into this one object, and the same fifteen disappeared from
     * `PresentationArea`, which passed every one of them straight through. `filesHidden` still
     * carries the PANE half of the hide gate; the TAB half is read off the same object one level up.
     */
    files: RoomFiles;
    /** Read only: whether `#files` is the visible main tab. See the note above. */
    mainTab: MainTab;
    /** `O(83, o.isP && o.mp3Playing ? 83 : -1)` — the room-wide playback, not this viewer's. */
    mp3Playing: boolean;

    playMp3ForAll: (url: string) => Promise<void>;
    stopMp3ForAll: () => Promise<void>;
    openModal: (name: Exclude<ModalName, null>) => void;
  }

  let {
    data,
    isPresenter,
    files,
    mainTab,
    mp3Playing,
    playMp3ForAll,
    stopMp3ForAll,
    openModal
  }: Props = $props();
</script>

<!--
  `FP-03` — `Hr = t => ({"show active": t})` at byte 1,916,418, bound at 2,017,799 over const 29's
  static `tab-pane fade`, so the reference's rendered attribute is `tab-pane fade show active`. This
  emitted `active show`: the same class SET, a different attribute STRING, and a byte-for-byte DOM
  diff against a capture reports it as a difference. Free to match, so it matches.
-->
<div
  id="files"
  class={mainTab === 'files' ? 'tab-pane fade show active' : 'tab-pane fade'}
  hidden={files.filesHidden}
  role="tabpanel"
  aria-labelledby="files-tab"
>
  <ul id="myTab" class="nav nav-tabs files-tabs d-flex justify-content-center" role="tablist">
    <!--
      The click handler sits on the <li>, as the reference has it: its const puts the listener there,
      and `.files-tabs li.nav-item { cursor: pointer }` is measured on the li — so the 5px margin band
      around each tab is part of the target. Ours listened on the <a> alone and that band was dead.

      `FP-05` — and the anchor's own `onclick` is GONE, all three of them. Const 32/34/35 (read at
      1,996,545) carry `ngClass` and nothing else: the reference's anchors have no click at all, and
      an anchor click here bubbled to the li, so the handler ran twice per click. Idempotent, so
      nothing observable broke — which is precisely why it would have stayed.

      The `onkeydown` stays and is deliberate: the reference's anchors are not keyboard operable and
      ours are. That is the one half of this row that is an addition rather than a duplication, and
      it is why the fix is not "make the anchor inert".
    -->
    <li class="nav-item" role="presentation" onclick={() => (files.fileTab = 'files')}>
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <a
        id="files-tab"
        class={[
          'nav-link d-flex align-items-center justify-content-between',
          { active: files.fileTab === 'files' }
        ]}
        data-bs-toggle="tab"
        role="tab"
        aria-controls="files"
        aria-selected={files.fileTab === 'files'}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') files.fileTab = 'files';
        }}
      >
        <span>Files</span>
        <span class="badge rounded-pill bg-danger files-badge">{files.countFiles('files')}</span>
      </a>
    </li>
    <!-- The click handler sits on the <li>, as the reference has it: its const puts the
                           listener there, and `.files-tabs li.nav-item { cursor: pointer }` is
                           measured on the li — so the 5px margin band around each tab is part of the
                           target. Ours listened on the <a> alone and that band was dead. The anchor
                           keeps the keydown, so the tab stays operable from the keyboard, which the
                           reference's is not. -->
    <li class="nav-item" role="presentation" onclick={() => (files.fileTab = 'images')}>
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <a
        id="image-tab"
        class={[
          'nav-link d-flex align-items-center justify-content-between',
          { active: files.fileTab === 'images' }
        ]}
        data-bs-toggle="tab"
        role="tab"
        aria-controls="image"
        aria-selected={files.fileTab === 'images'}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') files.fileTab = 'images';
        }}
      >
        <span>Images</span>
        <span class="badge rounded-pill bg-danger files-badge">{files.countFiles('images')}</span>
      </a>
    </li>
    <!-- The click handler sits on the <li>, as the reference has it: its const puts the
                           listener there, and `.files-tabs li.nav-item { cursor: pointer }` is
                           measured on the li — so the 5px margin band around each tab is part of the
                           target. Ours listened on the <a> alone and that band was dead. The anchor
                           keeps the keydown, so the tab stays operable from the keyboard, which the
                           reference's is not. -->
    <li class="nav-item" role="presentation" onclick={() => (files.fileTab = 'sounds')}>
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <a
        id="sounds-tab"
        class={[
          'nav-link d-flex align-items-center justify-content-between',
          { active: files.fileTab === 'sounds' }
        ]}
        data-bs-toggle="tab"
        role="tab"
        aria-controls="sounds"
        aria-selected={files.fileTab === 'sounds'}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') files.fileTab = 'sounds';
        }}
      >
        <span>Sounds</span>
        <span class="badge rounded-pill bg-danger files-badge">{files.countFiles('sounds')}</span>
      </a>
    </li>
  </ul>
  <div
    class="mt-3 mb-3 text-center d-flex flex-wrap justify-content-center align-items-center w-75 m-auto"
  >
    <div class="flex-fill mb-1">
      <div class="input-group st-searchbar">
        <!--
          No `id` and no `name`. Const 39 - the search input's own attribute
          table - is
          `["type","text","placeholder","Search files...","aria-label","search",
           "aria-describedby","addon-wrapping",1,"form-control",3,"ngModelChange","ngModel"]`
          and carries neither. We had invented `id="files-search"` and
          `name="filesSearch"`; nothing in this repo targeted either, and no
          `<label for=...>` points at it - `aria-label="search"` is what names it.
          (`filesSearch` is the reference's COMPONENT FIELD, bound through
          `ngModel`, not an attribute that reaches the DOM.)
        -->
        <input
          class="form-control ng-untouched ng-pristine ng-valid"
          type="text"
          placeholder="Search files..."
          aria-label="search"
          aria-describedby="addon-wrapping"
          oninput={(event) => files.search(event.currentTarget.value)}
        />
        <span
          id="basic-addon1"
          class="input-group-text st-searchbar-icon btn btn-outline-secondary"
        >
          <i class="fas fa-search"></i>
        </span>
      </div>
    </div>
    <div class="d-flex flex-wrap justify-content-center align-items-center ml-2">
      <!--
        Delete Selected and Upload File are gated on `isP` in the capture -
        `O(77, o.isP ? 77 : -1)` and `O(81, o.isP ? 81 : -1)` - while Refresh
        (node 78) is unconditional. A member seeing only the list and Refresh is
        the captured behaviour, not a bug; showing these two to everyone was.

        The bare-space expressions in this pane are the capture's own text nodes:
        `v(2, 'Delete Selected ')`, `v(79, ' Refresh')`, `v(2, ' Upload File ')`,
        `v(2, 'Stop Playing For All ')`, `v(18, 'Download ')`, `v(2, 'Delete ')`,
        `v(2, 'Play ')` / `v(2, 'Stop ')` and `v(2, 'Play For All ')` — every one
        of them padded (full.js:1778-1888, and `Download ` at 1937). Svelte trims
        whitespace at the edges of an element's children, so written as plain
        source text those spaces are dropped and the DOM text node stops matching
        the capture - checked against the compiler, not assumed. They collapse at
        the edge of the line box and change no pixel; the expressions are here so
        a byte-for-byte comparison of the two DOMs comes back clean.
      -->
      {#if isPresenter}
        <button
          class="btn m-2 st-fileDeleteSelected"
          title="Delete Selected"
          onclick={() => files.deleteSelectedFiles()}
        >
          <i class="fa fa-trash fa-check mr-2"></i>Delete Selected{' '}
        </button>
      {/if}
      <!--
        Refresh re-runs THIS page's load, not every loader on the page.

        The reference's handler is `getSessionFiles()`, which posts one
        `getSessionFiles` command and replaces `sessionFiles` alone
        (app-presentationarea.full.js:2967-2978). Ours called `invalidateAll()`,
        which re-runs every load function belonging to the active page.

        `invalidate('room:data')` is the narrowest refetch SvelteKit offers here:
        the load registers `depends('room:data')` (+page.server.ts:122) and the
        five-second poll already uses this identifier. It is not a files-only
        refetch and cannot be - this route has a single `+page.server.ts` load that
        builds messages, alerts, polls, notes and files together, so the two calls
        re-run exactly the same work today. What changes is the blast radius: a
        layout load added later would be re-run by `invalidateAll()` and is not by
        this. A genuinely files-only refetch would need its own endpoint and a
        second, client-owned source of truth for `data.files`, which no other
        control in this file has.
      -->
      <button
        class="btn mt-2 mr-2 mb-2 st-fileSeeMore"
        title="Reload list"
        onclick={() => invalidate('room:data')}
      >
        {' '}Refresh<i class="fas fa-sync ml-2"></i>
      </button>
      {#if isPresenter}
        <button
          class="btn btn-secondary mt-2 mr-2 mb-2 st-fileUpload"
          title="Upload New File"
          onclick={() => openModal('file-upload')}
        >
          <i class="fas fa-plus"></i> Upload File{' '}
        </button>
      {/if}
    </div>
    <!--
      "Stop Playing For All" belongs HERE, once, not in every row.

      The reference puts it in this otherwise-empty div after the upload row —
      node 82 in the capture holds node 83, gated `O(83, o.isP && o.mp3Playing)`.
      Ours rendered it inside each row's action cell, so a room with ten sounds
      showed ten identical Stop buttons, all stopping the same single playback.

      Label and icon are the reference's too: "Stop Playing For All " with
      `fa fa-play-circle mr-2` — the play glyph, not a stop glyph; transcribed, not
      corrected. Ours read "Stop For All" with `fa-stop-circle`.

      `FP-12` — the index was cited as 158 and is **157** in the pinned v4 bundle:
      `d(0,"button",241) … T(1,"i",157), v(2,"Stop Playing For All ")` at byte
      1,946,166, with const 157 decoding to `[1,"fa","fa-play-circle","mr-2"]` at
      2,004,368. The VALUE was right and the index was one out, because the comment
      was written against `app-presentationarea.full.js`, a capture that is not in
      this repository. An index nobody can check is worse than no index: it reads
      as verified. Every citation below now names the v4 bundle and its offset.
    -->
    <div>
      {#if isPresenter && mp3Playing}
        <button
          type="button"
          title="Stop For All"
          class="btn ml-2 st-fileDelete"
          onclick={() => void stopMp3ForAll()}
        >
          <i class="fa fa-play-circle mr-2"></i>Stop Playing For All{' '}
        </button>
      {/if}
    </div>
  </div>
  <!--
    An EMPTY room renders no heading, no SORT BAR and no table.

    The two gates are `O(84, o.sessionFiles ? -1 : 84)` for the `<h4>` and
    `O(85, o.sessionFiles && o.sessionFiles.length > 0 ? 85 : -1)` for node 85.
    They are not complements: the heading needs `sessionFiles` to be FALSY, and an
    empty array is truthy, so a room with zero files shows nothing at all. Both
    rendered captures confirm it — the badges read 0 and after the toolbar there
    are two collapsed anchors and no `h4`, no table.

    So "No room files found." is not the empty-list message it looks like; it is
    the never-fetched message. Our loader ends in `.all()`, which always returns an
    array, so that state cannot arise here and the heading is not rendered at all
    rather than kept as a branch nothing can reach. Ours previously showed it
    whenever the list was empty, which is the one case the reference stays silent.

    THE SORT BAR IS INSIDE THIS GATE, and that was read rather than assumed. Node
    85 is the view `t2e` (byte 2,016,231, `H(84,Bwe,2,0,"h4",48)(85,t2e,17,17)`),
    and `t2e` opens with the sort bar div and closes with the files table — one
    view holding both, read at byte 1,950,099. Its gate is the one quoted above,
    read at byte 2,018,251. So the two elements share a single condition, and a
    room with no files shows no "Sorting by:" strip either. Ours rendered the bar
    unconditionally, which put a sort control above an absent table.
  -->
  {#if data.files.length > 0}
    <!--
      The sort bar. Every class comes from the const table read at bytes
      2,011,253-2,011,600:

        242 [1,"d-flex","flex-wrap","justify-content-center","align-items-center","mt-2","st-fileSortBar"]
        243 [1,"mr-2"]
        244 [1,"btn","btn-sm","m-1","st-fileSortName",3,"click","ngClass","title"]
        245 [1,"fas","ml-2",3,"ngClass"]
        246 [1,"btn","btn-sm","m-1","st-fileSortDate",3,"click","ngClass","title"]
        249 [1,"fas","fa-sort","ml-2"]

      Both labels keep their LEADING AND TRAILING space - `v(4," Name ")` at byte
      1,950,263 and `v(8," Date ")` at 1,950,396. Svelte trims whitespace at the
      edges of an element's children, so each pad has to be an expression to
      survive into the DOM text node, exactly as the other padded labels in this
      pane already are.

      The icon class ORDER differs by state and is not a typo. Const 245 is static
      `fas ml-2` with the glyph appended by ngClass, so the active icon renders
      `fas ml-2 fa-sort-alpha-down`; const 249 is entirely static, so the inactive
      one renders `fas fa-sort ml-2`. Both variants key off the SAME direction.
    -->
    <div class="d-flex flex-wrap justify-content-center align-items-center mt-2 st-fileSortBar">
      <span class="mr-2">Sorting by:</span>
      <!--
        `.active` is CAPTURED, not derived. The binding is
        `z("ngClass",ct(13,mo,"name"===e.fileSortField))` at byte 1,950,577, and
        `mo` is the shared pure function read at byte 1,916,345 — it takes one
        argument and returns an object whose only key is `active`, set to that
        argument. So the class is present exactly when this button's field is the
        governing field, and it depends on the field alone, never on the
        direction. `docs/decoded/files-sort-bar.md` listed this expression as an
        honest gap; it was opened and the gap is closed.

        `mo` is quoted verbatim in `#lib/file-sort.js`, and asserted verbatim against
        the bundle in `files-pane-contract.test.ts`. It is written out in words
        HERE because its body is brace-delimited, and a brace-delimited construct
        inside a Svelte comment is prose to a human and a mustache to a parser.
        That exact shape has already turned a contract test red in this repository
        while `svelte-check` stayed green.
      -->
      <button
        class={['btn btn-sm m-1 st-fileSortName', { active: files.fileSort.field === 'name' }]}
        title={fileSortTitle('name', files.fileSort)}
        onclick={() => files.applyFileSort('name')}
      >
        {' '}Name{' '}
        {#if files.fileSort.field === 'name'}
          <i
            class="fas ml-2 {files.fileSort.direction === 'asc'
              ? 'fa-sort-alpha-down'
              : 'fa-sort-alpha-up'}"
          ></i>
        {:else}
          <i class="fas fa-sort ml-2"></i>
        {/if}
      </button>
      <button
        class={['btn btn-sm m-1 st-fileSortDate', { active: files.fileSort.field === 'date' }]}
        title={fileSortTitle('date', files.fileSort)}
        onclick={() => files.applyFileSort('date')}
      >
        {' '}Date{' '}
        {#if files.fileSort.field === 'date'}
          <i
            class="fas ml-2 {files.fileSort.direction === 'asc'
              ? 'fa-sort-amount-down'
              : 'fa-sort-amount-up'}"
          ></i>
        {:else}
          <i class="fas fa-sort ml-2"></i>
        {/if}
      </button>
    </div>
    <table class="table table-striped m-auto w-100 mt-3 st-fileTable">
      <tbody id="filesDriveList">
        {#each files.searchedFiles() as item (item.id)}
          <tr>
            {#if !files.matchesFileTab(item)}
              <!--
                Deliberately empty. The capture emits this row for every file in
                the room and collapses its cells when the file belongs to another
                tab; the row still counts for `nth-of-type` striping.
              -->
            {:else}
              <!--
                Resolved ONCE per row. The two alert-sound buttons are complements
                of one another, so asking twice invites the two answers to drift.
              -->
              {const alertSoundButton = $derived(
                alertSoundButtonFor({ isPresenter }, data.sessData ?? {}, item)
              )}
              {#if isPresenter}
                <td>
                  <input
                    type="checkbox"
                    value={item.id}
                    checked={files.selectedFileIds.has(item.id)}
                    onchange={(event) =>
                      files.toggleFileSelection(item.id, event.currentTarget.checked)}
                  />
                </td>
              {/if}
              <td>
                <div class="d-flex flex-column">
                  <div>
                    <span class="st-fileName">{item.name} </span>
                    <span class="st-fileSize ml-2">{fileSizeInKb(item.size)}Kb </span>
                    <div class="st-fileName">
                      <i>{mediumDate(item.createdAt)}</i>
                    </div>
                  </div>
                  {#if item.kind === 'image'}
                    <a target="_blank" href={item.url} type={item.contentType} download={item.name}>
                      <!-- No width/height attributes. The reference's const carries
                                           only alt, class, style and src, and the sole sizing rule
                                           is `.fileDriveImg { max-width: 200px }` — it CLAMPS the
                                           thumbnail and lets each upload keep its own aspect ratio.
                                           A fixed 120x90 box letterboxed or distorted every image
                                           that was not 4:3. -->
                      <!-- svelte-ignore a11y_img_redundant_alt -->
                      <img
                        alt="Image"
                        class="fileDriveImg"
                        style="background-color: #000;"
                        src={item.url}
                      />
                    </a>
                  {/if}
                </div>
              </td>
              <td>
                <div class="d-flex justify-content-center align-items-center flex-wrap">
                  {#if item.kind !== 'image'}
                    <!-- svelte-ignore a11y_consider_explicit_label -->
                    <a
                      class="fileDowload"
                      href={item.url}
                      type={item.contentType}
                      download={item.name}
                    ></a>
                  {/if}
                  <a
                    title="Download File"
                    target="_blank"
                    class="btn st-fileDownload"
                    href={item.url}
                    type={item.contentType}
                    download={item.name}
                  >
                    <i class="fas fa-download mr-2"></i>Download{' '}
                  </a>
                  {#if isPresenter}
                    <button
                      type="button"
                      title="Delete File"
                      class="btn ml-2 st-fileDelete"
                      onclick={() => files.deleteFile(item)}
                    >
                      <i class="fa fa-trash mr-2"></i>Delete{' '}
                    </button>
                  {/if}
                  {#if item.kind === 'sound'}
                    <button
                      type="button"
                      title="Play"
                      class="btn ml-2 st-fileDownload btn-success"
                      onclick={() => files.playMp3ForMe(item)}
                    >
                      {#if files.playingForMe.has(item.id)}
                        <span><i class="fa fa-stop-circle mr-2"></i>Stop{' '}</span>
                      {:else}
                        <span><i class="fa fa-play-circle mr-2"></i>Play{' '}</span>
                      {/if}
                    </button>
                  {/if}
                  {#if isPresenter && item.kind === 'sound'}
                    <button
                      type="button"
                      title="Play For All"
                      class="btn ml-2 st-fileDelete"
                      onclick={() => playMp3ForAll(item.url)}
                    >
                      <i class="fa fa-play-circle mr-2"></i>Play For All{' '}
                    </button>
                  {/if}
                  <!--
                    Nodes 22 and 23 of the row, both
                    `btn ml-2 btn-info set-alert-sound-btn` — the class whose rule
                    already ships at
                    `src/lib/styles/captured-runtime-components.css:6972`
                    (`font-size: 12px`).

                    `FP-12` — these were cited as consts 261/262/263 against a
                    capture this repository does not hold. In the pinned v4 bundle
                    they are **267** (Overwrite, with the click) and **269** (Remove,
                    with the click), read at bytes 1,947,897 and 1,948,105; **268**
                    is the `fa fa-bell mr-2` glyph and the Remove button's is **144**,
                    `fa fa-trash mr-2`. **260** and **261** are the same two entries
                    WITHOUT a click — Angular's placeholder attrs for the same nodes
                    — which is why a reader counting entries finds four buttons where
                    there are two.

                    ONE `{#if}` with an `{:else if}`, not two independent blocks.
                    The two gates at full.js:1972-1991 are complements over the same
                    three terms, and written separately a room that never received
                    `overwriteCashRegisterSound` would render both at once.
                    `alertSoundButtonFor` in `#lib/files-gates.js` resolves them to one
                    answer and is tested there.

                    TRANSCRIPTION NOTE: consts **261 and 269** spell the type
                    attribute `pe="button"` — `["pe","button","title","Remove
                    Overwrited Cash Register Sound",...]` — where every sibling row
                    button spells it `type`. (Cited as 263 before `FP-12`; the typo
                    is real and it is on the Remove button's pair, both the
                    placeholder and the live one.) That is a typo in the original. It is harmless where it
                    stands, because the files table sits in no `form` and the
                    implicit `submit` a missing type gives a button has nothing to
                    submit; copied forward it would plant a latent bug for anyone
                    who later wraps this pane in one. So `type="button"` is written
                    here. The TITLE is verbatim, misspelling included.
                  -->
                  {#if alertSoundButton === 'set'}
                    <button
                      type="button"
                      title="Overwrite Cash Register Sound"
                      class="btn ml-2 btn-info set-alert-sound-btn"
                      onclick={() => files.setAlertSound(item.url, true)}
                    >
                      <i class="fa fa-bell mr-2"></i>Set as alert sound{' '}
                    </button>
                  {:else if alertSoundButton === 'remove'}
                    <button
                      type="button"
                      title="Remove Overwrited Cash Register Sound"
                      class="btn ml-2 btn-info set-alert-sound-btn"
                      onclick={() => files.setAlertSound(item.url, false)}
                    >
                      <i class="fa fa-trash mr-2"></i>Remove as alert sound{' '}
                    </button>
                  {/if}
                </div>
              </td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
