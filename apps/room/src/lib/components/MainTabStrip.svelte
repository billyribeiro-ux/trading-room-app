<script lang="ts">
  /*
    `ul#mainTabs` — the main tab strip, and ONLY the strip.

    ## Why it is its own component

    It is 275 lines of `PresentationArea.svelte`, and that file's own header argues the seven tab
    PANES stay together because `mainTab` is one value every tab reads and writes. That argument
    never covered the strip itself: the strip WRITES `mainTab` and reads nothing a pane produces, so
    the coupling it describes runs one way and stops here.

    The extraction was recorded as a DEBT in `source-size-contract.test.ts` when
    `PresentationArea`'s ceiling was raised for the `hideNotes` gate, in those words — *"a focused
    change with a safety net already in place"*. The safety net is
    `main-tab-strip-contract.test.ts`, a contract test that has been named after this component
    since before it existed, and which renders the PARENT — so it goes on proving the strip end to
    end without knowing the extraction happened.

    ## The two mechanisms, and the reason they are not interchangeable

    The capture uses both and this file transcribes both, which is the single most important thing
    to preserve here:

    * `{#if}` for ENTITLEMENTS — `O(26, o.hasSwingTradeAlerts ? 26 : -1)`, where `-1` is
      `ɵɵconditional`'s "instantiate nothing". An entitlement that ships hidden markup has already
      told the member the feature exists, and this is what a room pays for.
    * `hidden` for MODES and ROOM SETTINGS — `z('hidden', o.hideStreams)`, `z('hidden', o.hideNotes)`,
      `z('hidden', o.hideFiles)`, and `z('hidden', viewerOnlyMode)` on the `ul` itself. The feature
      exists; this viewer is simply not being shown it.

    Swapping one for the other is invisible to every source-text instrument in this repository and
    is a real leak of what a room has paid for. `main-tab-strip-contract.test.ts` renders rather
    than greps for exactly that reason.

    ## `z('hidden', o.hideScreens)` on the Screens `<li>` is NOT reproduced, and it was measured

    Byte 2,016,417. The flag it reads can never be true: `hideScreens` occurs THREE times in the
    whole 2,891,205-byte bundle — `this.hideScreens=!1` in the constructor (1,954,414) and the two
    template reads (2,016,430 and 2,017,196, the tab and its pane). Its four siblings are all
    assigned in `ngOnInit` — `hideNotes`, `hideFiles`, `hasSwingTradeAlerts`, `hasDayTradeAlerts`,
    `hideStreams`, at 1,955,678 — and `hideScreens` is not among them. Nothing writes it, ever. A
    prop and a `hidden` binding here would be a gate no caller could ever open, which is the
    "nothing exists without a consumer" rule pointed the other way.
    `aria-selected` is derived here where the capture hardcodes it on all eight anchors; that
    deliberate accessibility correction is enforced in `main-tab-strip-gates.svelte.test.ts`.

    Nothing here reads `sessData` or opens a device; `mainTab` is the only value it writes, and it is
    `$bindable` because that is what a tab
    strip is for.

    Every anchor's `tabindex={mainTab === … ? 0 : -1}` is a ROVING tabindex and the `0` half is
    load-bearing: it read `? undefined : -1` until 2026-08-31, which left every one of the seven
    `onkeydown` handlers below unreachable. Same file, same reason.
  */
  import RecordingTab from '#lib/components/RecordingTab.svelte';
  import TabGearMenu from '#lib/components/TabGearMenu.svelte';
  import type { RoomBroadcasts } from '#lib/room/broadcasts.svelte.js';
  import type { RoomFiles } from '#lib/room/files.svelte.js';
  import type { RoomMenus } from '#lib/room/menus.svelte.js';
  import type { RoomNotes } from '#lib/room/notes.svelte.js';
  import type {
    DayTradeAlertAction,
    RoomTradeAlerts,
    SwingAlertAction
  } from '#lib/room/trade-alerts.svelte.js';
  import type { DayTradeAlertRow, MainTab, SwingAlertRow } from '#lib/types.js';

  interface Props {
    /** Which main tab is showing. BINDABLE: every tab in the strip writes it. */
    mainTab: MainTab;
    /** `?vo=1` — a room reduced to the screen; the whole strip goes. */
    viewerOnlyMode: boolean;
    /** The ROLE, decided on the page. Read for the video-player tab's gate and the notes cog's. */
    isPresenter: boolean;
    /**
     * `MTS-02` — the VIEWER's own authoring capability, and the second term of the notes cog's gate.
     *
     * `O(23, o.isP || o.appService.globals.user.canEditNotes ? 23 : -1)`, byte 2,016,713 — the same
     * shape as the files cog's gate above it, with a permission rather than a role as the second
     * term. It is a PROP and not a re-derivation from anything already here, because nothing already
     * here can answer it: `isPresenter` is a role and `hideNotes` is a room setting, and the
     * capability is neither.
     *
     * Not folded into `noteGates.editorMounted`, which the page already computes and which
     * `PresentationArea` already holds. That value is `notesEnabled && canEditNotes`, so using it
     * would AND the room setting into the member's half of this gate and not the presenter's — a
     * gate the reference does not have. The two questions are different and stay different; the
     * strip's own `hidden={hideNotes}` is where the room setting is answered.
     */
    canEditNotes: boolean;
    /** `!sessData.useMediaMTX` — see `RoomGates.streamsHidden`. */
    hideStreams: boolean;
    /** "Hide Notes Section?" ORed with viewer-only mode — see `RoomGates.notesHidden`. */
    hideNotes: boolean;
    recordingsVisible?: boolean;
    /** The two dropdowns this strip owns, and the only state it toggles. */
    menus: RoomMenus;
    /** For the two `{@attach}` mount points on the notes and files dropdown menus. */
    notes: RoomNotes;
    /** `hideVideoPlayer` alone — the member half of the video-player tab's gate. */
    broadcasts: RoomBroadcasts;
    /** `filesHidden` alone; the pane itself lives with its siblings in `PresentationArea`. */
    files: RoomFiles;
    swingAlerts: RoomTradeAlerts<SwingAlertRow, SwingAlertAction>;
    dayTradeAlerts: RoomTradeAlerts<DayTradeAlertRow, DayTradeAlertAction>;
  }

  let {
    mainTab = $bindable('screens'),
    viewerOnlyMode,
    isPresenter,
    canEditNotes,
    hideStreams,
    hideNotes,
    recordingsVisible = false,
    menus,
    notes,
    broadcasts,
    files,
    swingAlerts,
    dayTradeAlerts
  }: Props = $props();
</script>

<!--
  `z('hidden', o.appService.globals.viewerOnlyMode)` on this `ul`
  (`app-presentationarea.compiled.js:3154-3155`, and const 3 at `:1598` declares the
  `hidden` binding it feeds). Viewer-only mode is a room reduced to the screen: the
  whole main tab strip goes, which is also why `.viewer-only-screen-tab` sets
  `max-height: calc(-40px + 100vh)` — the 40px it reclaims is this strip.
-->
<ul id="mainTabs" class="nav nav-tabs mainTabset" role="tablist" hidden={viewerOnlyMode}>
  <li role="presentation" class="nav-item">
    <a
      id="screens-tab"
      class={['nav-link', { active: mainTab === 'screens' }]}
      role="tab"
      tabindex={mainTab === 'screens' ? 0 : -1}
      aria-controls="screens"
      aria-selected={mainTab === 'screens'}
      data-bs-toggle="tab"
      data-bs-target="#screens"
      onclick={() => (mainTab = 'screens')}
      onkeydown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') mainTab = 'screens';
      }}
    >
      <div class="d-flex">
        <div><i class="fas fa-desktop"></i><span class="ml-1">Screens</span></div>
      </div>
    </a>
  </li>
  <!--
    `z('hidden', o.hideStreams)` on the `li` (`app-presentationarea.full.js:5357`),
    the same flag the pane below uses. This carried a hardcoded `hidden` and no
    click handler until `useMediaMTX` reached the room — a tab that could never
    open, in every room, whether or not it had MediaMTX.
  -->
  <li role="presentation" class="nav-item" hidden={hideStreams}>
    <a
      id="streams-tab"
      class={['nav-link', { active: mainTab === 'streams' }]}
      role="tab"
      tabindex={mainTab === 'streams' ? 0 : -1}
      aria-controls="streams"
      aria-selected={mainTab === 'streams'}
      data-bs-toggle="tab"
      data-bs-target="#streams"
      onclick={() => (mainTab = 'streams')}
      onkeydown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') mainTab = 'streams';
      }}
    >
      <div class="d-flex">
        <div><i class="fas fa-podcast"></i><span class="ml-1">Streams</span></div>
      </div>
    </a>
  </li>
  <!-- `z('hidden', o.hideNotes)` (byte 2016630), the binding `hideStreams` carries above.
           HIDDEN, not absent: a setting and a mode, where an entitlement gets `{#if}`. -->
  <li role="presentation" class="nav-item" hidden={hideNotes}>
    <a
      id="notes-tab"
      class={['nav-link presAreaTabs-notes', { active: mainTab === 'notes' }]}
      role="tab"
      tabindex={mainTab === 'notes' ? 0 : -1}
      aria-controls="notes"
      aria-selected={mainTab === 'notes'}
      data-bs-toggle="tab"
      data-bs-target="#notes"
      onclick={() => (mainTab = 'notes')}
      onkeydown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') mainTab = 'notes';
      }}
    >
      <div class="d-flex align-items-center">
        <div>
          <i id="noteChangeIndicator" class="fas fa-edit"></i><span class="mx-1">Notes</span>
        </div>
        <!--
          `MTS-02` — `O(23, o.isP || o.appService.globals.user.canEditNotes ? 23 : -1)`, byte
          2,016,713. The gate this cog went without, now built.

          `{#if}` and not `hidden`, which is the distinction this file exists to preserve: `-1` is
          `ɵɵconditional`'s instantiate-nothing, and the files cog two `<li>`s down already reads it
          that way. A capability that ships hidden markup has told the member the control exists.

          It was NOT harmless while it was missing, and the old comment here undersold it by saying
          so. `RoomNotes.requestNewNote` does refuse — it sets `newNoteOpen` from
          `noteGates().editorMounted` — so a member who may not author got nothing when they pressed
          it. A control whose only effect is nothing is precisely the shape the root standard names
          outright, and the reference declines to draw it at all.

          The gate is on the cog and NOT on the `<li>`: a member who may not author notes still has
          the Notes tab, and still reads them. `hidden={hideNotes}` above is what takes the tab away,
          and it answers a different question — the room's setting, not this viewer's permission.
        -->
        {#if isPresenter || canEditNotes}
          <TabGearMenu
            id="dropdownMenuNotes"
            labelledBy="dropdownMenuButton"
            wrapperClass="dropdown"
            menu="notes"
            {menus}
            onselecttab={() => (mainTab = 'notes')}
            mountItem={(list) => notes.mountNewNoteLink(list)}
          />
        {/if}
      </div>
    </a>
  </li>
  <RecordingTab {recordingsVisible} bind:mainTab />
  <!--
    The captured gate, verbatim, on both the tab (slot 25, byte 2,016,864) and its
    pane (slot 47, byte 2,017,661):

      O(25, (o.hideVideoPlayer && !o.isP) || o.isP ? 25 : -1)

    i.e. a presenter always sees it, and a member sees it only while a video is
    playing for the room. `hideVideoPlayer` is now modelled - `playVideoForAll`
    sets it and `stopVideoForAll` clears it, both on the `cmds` channel.

    Two earlier states of this gate, kept because each was a real defect: the tab
    once rendered with NO gate, so every member saw it; it was then reduced to
    `isPresenter`, correct only for as long as nothing could set the other term.
    Now that the broadcast exists, dropping the term would force-switch a member to
    a tab that renders nothing.

    Evidence, stated as what was observed and no further: the owner's own MEMBER
    capture of `#mainTabs` has this tab collapsed to an empty Angular comment
    anchor, so the gate was false for that member at that moment. No member capture
    taken WHILE a video was playing exists, so the true branch is transcribed from
    the bundle above rather than from a rendered page.
  -->
  {#if (broadcasts.hideVideoPlayer && !isPresenter) || isPresenter}
    <li role="presentation" class="nav-item">
      <a
        id="videoplayer-tab"
        class={['nav-link', { active: mainTab === 'videoplayer' }]}
        data-bs-toggle="tab"
        data-bs-target="#videoplayer"
        role="tab"
        aria-controls="videoplayer"
        aria-selected={mainTab === 'videoplayer'}
        tabindex={mainTab === 'videoplayer' ? 0 : -1}
        onclick={() => (mainTab = 'videoplayer')}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') mainTab = 'videoplayer';
        }}
      >
        <div class="d-flex align-items-center">
          <div><i class="fas fa-video"></i><span class="mx-1">VideoPlayer</span></div>
        </div>
      </a>
    </li>
  {/if}
  <!--
    Swing Alerts — `XCe`, gated on the room setting rather than on presenter status:

      O(26, o.hasSwingTradeAlerts ? 26 : -1)

    `{#if}` and not `hidden`, because `-1` is `ɵɵconditional`'s "instantiate
    nothing". An entitlement that ships hidden markup has already told the member
    the feature exists, and this one is what a room pays for.

    The icon is `fas fa-bell` (const 64), shared with the Day Trades tab.
  -->
  {#if swingAlerts.enabled}
    <li role="presentation" class="nav-item">
      <a
        id="swingAlerts-tab"
        class={['nav-link', { active: mainTab === 'swingAlerts' }]}
        data-bs-toggle="tab"
        data-bs-target="#swingAlerts"
        role="tab"
        aria-controls="swingAlerts"
        aria-selected={mainTab === 'swingAlerts'}
        tabindex={mainTab === 'swingAlerts' ? 0 : -1}
        onclick={() => (mainTab = 'swingAlerts')}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') mainTab = 'swingAlerts';
        }}
      >
        <div class="d-flex align-items-center">
          <div>
            <i class="fas fa-bell"></i><span class="mx-1">Swing Alerts</span>
          </div>
        </div>
      </a>
    </li>
  {/if}
  <!--
    Day Trades — `JCe`, byte 1,917,906, the `<li>` immediately after the Swing one
    and gated the same way, on its own room setting rather than on presenter status:

      O(27, o.hasDayTradeAlerts ? 27 : -1)

    A conditional block and not a `hidden` attribute, because `-1` is
    `ɵɵconditional`'s "instantiate nothing". An entitlement that ships hidden markup has
    already told the member the feature exists, and this one is what a room pays for.

    The label is `Day Trades` (byte 1,918,110), NOT "Day Trade Alerts" — the pane's
    own heading says "Latest Day Trade Alerts" and the tab says the short form. The
    icon is `fas fa-bell` (const 64), the same tuple the Swing tab uses.
  -->
  {#if dayTradeAlerts.enabled}
    <li role="presentation" class="nav-item">
      <a
        id="dayTradeAlerts-tab"
        class={['nav-link', { active: mainTab === 'dayTradeAlerts' }]}
        data-bs-toggle="tab"
        data-bs-target="#dayTradeAlerts"
        role="tab"
        aria-controls="dayTradeAlerts"
        aria-selected={mainTab === 'dayTradeAlerts'}
        tabindex={mainTab === 'dayTradeAlerts' ? 0 : -1}
        onclick={() => (mainTab = 'dayTradeAlerts')}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') mainTab = 'dayTradeAlerts';
        }}
      >
        <div class="d-flex align-items-center">
          <div>
            <i class="fas fa-bell"></i><span class="mx-1">Day Trades</span>
          </div>
        </div>
      </a>
    </li>
  {/if}
  <!--
    "Hide Files Section?" - `z('hidden', o.hideFiles)` on this `li`
    (app-presentationarea.full.js:5375) and on the `#files` pane (5410-5413). Both,
    because either one alone leaves a tab that opens nothing or a pane still
    reachable from a tab that is gone.

    The reference feeds the binding `sessData.hideFiles || globals.videoOnlyMode`
    (2289-2290). Only the first term is implemented, and `filesSectionHidden` in
    `#lib/files-gates.js` says why: the second is not a setting but the recording-bot
    client global, set from the `r` query parameter, and this room has no recording
    bot to model.
  -->
  <li role="presentation" class="nav-item" hidden={files.filesHidden}>
    <!-- svelte-ignore a11y_missing_attribute -->
    <a
      class={['nav-link', { active: mainTab === 'files' }]}
      role="tab"
      tabindex={mainTab === 'files' ? 0 : -1}
      aria-controls="files"
      aria-selected={mainTab === 'files'}
      data-bs-toggle="tab"
      data-bs-target="#files"
      onclick={() => (mainTab = 'files')}
      onkeydown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') mainTab = 'files';
      }}
    >
      <div class="d-flex align-items-center">
        <div><i class="fas fa-folder"></i><span class="mx-1">Files</span></div>
        <!--
          `O(35, o.isP ? 35 : -1)` — byte 2,017,076 — and `{#if}` rather than `hidden` because `-1`
          is `ɵɵconditional`'s "instantiate nothing". This cog opens the room's file-upload dialog
          (`RoomNotes.mountUploadFileLink`), so a member was being shown the presenter's uploader; it
          did nothing they were entitled to do and told them the room could.
        -->
        {#if isPresenter}
          <TabGearMenu
            id="dropdownMenuFiles"
            labelledBy="dropdownMenuFiles"
            menu="files"
            {menus}
            onselecttab={() => (mainTab = 'files')}
            mountItem={(list) => notes.mountUploadFileLink(list)}
          />
        {/if}
      </div>
    </a>
  </li>
</ul>
