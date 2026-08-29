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

    ## What it does NOT decide

    Every gate arrives already decided. Nothing here reads `sessData`, opens a device or starts a
    stream; `mainTab` is the only value it writes, and it is `$bindable` because that is what a tab
    strip is for.
  */
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
    /** The ROLE, decided on the page. Read only for the video-player tab's gate. */
    isPresenter: boolean;
    /** `!sessData.useMediaMTX` — see `RoomGates.streamsHidden`. */
    hideStreams: boolean;
    /** "Hide Notes Section?" ORed with viewer-only mode — see `RoomGates.notesHidden`. */
    hideNotes: boolean;
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
    hideStreams,
    hideNotes,
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
      tabindex={mainTab === 'screens' ? undefined : -1}
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
      tabindex={mainTab === 'streams' ? undefined : -1}
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
      tabindex={mainTab === 'notes' ? undefined : -1}
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
        <div class="dropdown">
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span
            id="dropdownMenuNotes"
            data-bs-toggle="dropdown"
            aria-expanded={menus.notes}
            class="dropdown-toggle"
            onclick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              menus.toggle('notes');
            }}
            onkeydown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') menus.toggle('notes');
            }}
          >
            <i class="fas fa-cog"></i>
          </span>
          <ul
            aria-labelledby="dropdownMenuButton"
            class={['dropdown-menu', { show: menus.notes }]}
            {@attach (menu: HTMLUListElement) => notes.mountNewNoteLink(menu)}
          ></ul>
        </div>
      </div>
    </a>
  </li>
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
        tabindex={mainTab === 'videoplayer' ? undefined : -1}
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
        tabindex={mainTab === 'swingAlerts' ? undefined : -1}
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
        tabindex={mainTab === 'dayTradeAlerts' ? undefined : -1}
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
                  client global, set from the `r` query parameter, and this room has no media.recording
                  bot to model.
                -->
  <li role="presentation" class="nav-item" hidden={files.filesHidden}>
    <!-- svelte-ignore a11y_missing_attribute -->
    <a
      class={['nav-link', { active: mainTab === 'files' }]}
      role="tab"
      tabindex={mainTab === 'files' ? undefined : -1}
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
        <div>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span
            id="dropdownMenuFiles"
            data-bs-toggle="dropdown"
            aria-expanded={menus.files}
            class="dropdown-toggle"
            onclick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              mainTab = 'files';
              menus.set('notes', false);
              menus.toggle('files');
            }}
            onkeydown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                mainTab = 'files';
                menus.set('notes', false);
                menus.toggle('files');
              }
            }}
          >
            <i class="fas fa-cog"></i>
          </span>
          <ul
            aria-labelledby="dropdownMenuFiles"
            class={['dropdown-menu', { show: menus.files }]}
            {@attach (menu: HTMLUListElement) => notes.mountUploadFileLink(menu)}
          ></ul>
        </div>
      </div>
    </a>
  </li>
</ul>
