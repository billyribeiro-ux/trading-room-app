<script lang="ts">
  /*
    `app-webcam-holder` + `app-presentationarea` — the fifth and last of the plan's template
    regions, and the biggest: the webcam strip, the main tab bar and every one of its seven panes.

    ## Why it is one component and not seven

    EVERY pane has its own component — `NotesPane`, `SwingAlertsPane`, `DayTradeAlertsPane`,
    `FilesPane`, `ScreenTabs`, `ScreenPane`, `StreamTabs`, `StreamingView`, `VideoPlayer`. What is
    left here is the WIRING between the tab strip and those components, and wiring is one concern:
    `mainTab` is a single value that every tab reads and every tab writes.

    `FilesPane` was the last of them and landed on 2026-08-16, one pass after this component did.
    Splitting it out separately was deliberate — two extractions at once is how a mangle ships, and
    this one had already re-pointed 40 assertions across 11 contract files. Its 22 props are still
    declared below and passed straight through, because the PAGE owns the handlers behind them.

    ## The prop list came from the COMPILER, as it did for `AlertChatArea`

    Empty `<script>`, `svelte-check --output machine`, and every `Cannot find name` became a prop.
    It found things a hand scan would not have: `screenVolume` is a SNIPPET, not a value, and
    `captureVideoImage` is an import from `#lib/screen-zoom.js` rather than page state.

    ## DEVIATION, recorded rather than taken quietly: the page's names are kept

    `RoomNavbar` and `AlertChatArea` renamed every callback to `on*`. This one does not, and the
    reason is that the rule does not fit the region. Of the ~45 functions here, a third are not
    event handlers at all — `countFiles`, `searchedFiles`, `matchesFileTab`, `fileSortTitle`,
    `swingAlertPayload`, `dayTradeAlertPayload` are QUERIES the markup calls to compute a value, and
    an `on` prefix would misname them. Renaming only the true handlers would leave two conventions
    inside one file, which is worse than one consistent one. So every function keeps the name it has
    on the page, and the mapping is the identity — which also means a reader diffing this against
    `+page.svelte` sees a move rather than a rewrite.

    ## What it does NOT decide

    Every gate arrives already decided — `isPresenter`, `filesHidden`, `hideStreams`,
    `swingAlertsEnabled`, `dayTradeAlertsEnabled`, `noteGates`, `videoDisabled`. Authority is
    computed once on the page from data the server owns. Nothing here opens a device, starts a
    stream, or writes a file.
  */
  import { NEUTRAL_PAN, captureVideoImage } from '#lib/screen-zoom.js';
  import DayTradeAlertsPane from '#lib/components/day-trade-alerts/DayTradeAlertsPane.svelte';
  import FilesPane from '#lib/components/FilesPane.svelte';
  import NotesPane from '#lib/components/notes/NotesPane.svelte';
  import ScreenPane from '#lib/components/ScreenPane.svelte';
  import ScreenTabs from '#lib/components/ScreenTabs.svelte';
  import WebcamStrip from '#lib/components/WebcamStrip.svelte';
  import ScreenZoomControls from '#lib/components/ScreenZoomControls.svelte';
  import SpeechRecoOverlay from '#lib/components/SpeechRecoOverlay.svelte';
  import StreamingView from '#lib/components/StreamingView.svelte';
  import StreamTabs from '#lib/components/StreamTabs.svelte';
  import SwingAlertsPane from '#lib/components/swing-alerts/SwingAlertsPane.svelte';
  import VideoPlayer from '#lib/components/VideoPlayer.svelte';
  import YoutubePlayerOverlay from '#lib/components/YoutubePlayerOverlay.svelte';
  import type { Snippet } from 'svelte';
  import type { MtxStreamTabs } from '#lib/room-mtx.svelte.js';
  import type { RoomMedia } from '#lib/room/media.svelte.js';
  import type { RoomMediaTransport } from '#lib/room/media-transport.svelte.js';
  import type { RoomScreens } from '#lib/room/screens.svelte.js';
  import type { RoomMenus } from '#lib/room/menus.svelte.js';
  import type { RoomFiles } from '#lib/room/files.svelte.js';
  import type { RoomNotes } from '#lib/room/notes.svelte.js';
  import type { RoomWebcams } from '#lib/room/webcams.js';
  import type { RoomBroadcasts } from '#lib/room/broadcasts.svelte.js';
  import type {
    DayTradeAlertAction,
    RoomTradeAlerts,
    SwingAlertAction
  } from '#lib/room/trade-alerts.svelte.js';
  import type { RoomSplit } from '#lib/room/split.svelte.js';
  /*
    `NoteVersion` and `WebcamPresenter` went with their props on 2026-08-18 — the first with the
    hand-forwarded `loadNoteVersions`, the second with the four webcam callbacks and then the strip
    itself. eslint's `no-unused-vars` is what named them, which is the point of leaving that rule on
    for type imports: a type nothing annotates is a claim about a shape this file no longer handles.
  */
  import type {
    DayTradeAlertRow,
    MainTab,
    ModalName,
    RoomNote,
    SwingAlertRow
  } from '#lib/types.js';
  import type { PageProps } from '../../routes/$types';

  type Caption = { timestamp: number; sender: string; text: string; live?: boolean };

  interface Props {
    /** The page's load data. Read for notes, files, the session handle and `sessData` gates. */
    data: PageProps['data'];
    split: RoomSplit;
    media: RoomMedia;
    menus: RoomMenus;
    mtx: MtxStreamTabs;

    /** The ROLE, decided on the page from `data.user.role`. Never asserted by a component. */
    isPresenter: boolean;
    /** `?vo=1` — a room reduced to the screen; the whole main tab strip goes. */
    viewerOnlyMode: boolean;
    doNotDisturbOn: boolean;
    /** Which main tab is showing. BINDABLE: every tab in the strip writes it. */
    mainTab: MainTab;

    // ── the speech-reco overlay ────────────────────────────────────────────────
    /** This viewer's `showSpeechRecoOverlay` preference. BINDABLE: the overlay's X clears it. */
    subtitles: boolean;
    currentCaption: Caption | null;
    captionHistory: Caption[];
    /** BINDABLE: the overlay's own history toggle writes it. */
    speechRecoHistoryMode: boolean;
    archivesAvailable: boolean;
    openTranscriptPage: () => void;

    // ── the webcam strip ───────────────────────────────────────────────────────
    previewWindowsVisible: boolean;
    /**
     * The webcam attachments, whole — `#lib/room/webcams.ts`.
     *
     * Four props, and every one of them was an arrow on the page wrapping one method of this
     * object. The wrapping was not stylistic: `unbound-method-contract.test.ts` records that **the
     * four webcam attachments were among thirteen props that threw on the first click in every
     * room**, because a method handed over by reference loses `this` and `svelte-check`, eslint and
     * the autofixer all pass on it. Passing the object removes the hazard rather than wrapping
     * around it — there is nothing left to hand over by reference.
     *
     * The two `{@attach}` positions below are unchanged in behaviour. The docs are explicit that an
     * attachment re-runs on *"state read inside the function"*, not on the identity of the
     * expression, and `card` / `attachRemote` are CALLED rather than referenced, so `this` is bound
     * at the call. If anything this is steadier than the props were: the page rebuilt those four
     * arrows on every one of its own renders.
     */
    webcams: RoomWebcams;

    // ── #screens ───────────────────────────────────────────────────────────────
    /** This viewer's "off to preserve data" switch, which replaces the WHOLE pane. */
    videoDisabled: boolean;
    /**
     * The screen VIEWER and the SFU TRANSPORT, whole — and every member is read through them.
     *
     * ## What this replaced, because the note that stood here promised it
     *
     * Both objects were already props, for the spatial-layer effect below. Beside them stood
     * TWENTY-ONE more props that were nothing but their own members handed over a second time:
     * seventeen of `screens` and four of `mediaTransport`. The note here said collapsing them was
     * "a real slice with its own ripple" and deferred it so that one commit would not do two
     * things. This is that slice.
     *
     * The duplication was not theoretical and it was already visible inside this one file: the
     * effect read `mediaTransport.screenStreams.size` through the facade while `ScreenPane` below
     * read a drilled `screenStreams` prop — the same map, two names, five hundred lines apart.
     *
     * ## Why `isFullScreenshare` stopped being `$bindable`
     *
     * `RoomScreens` declares a real setter for it, so the zoom cluster's fullscreen control writes
     * `screens.isFullScreenshare` directly and there is no value to bind back up through here.
     * That is not a new pattern: `files` below records the same reasoning for `bind:fileTab`, and
     * the `$props` docs' warning about mutating props is about STATE PROXIES the component does
     * not own — a setter on a class instance is a method call, which is what the room's facades
     * exist to expose.
     *
     * ## What is deliberately still drilled, and why
     *
     * `volume` alone, and it is `RoomVolume`'s. That class is not passed here, so collapsing it
     * would ADD a prop to remove one, and the pane reads exactly one member of it.
     *
     * The three that WERE in this paragraph — `webcams`, `notes` and `broadcasts` — are facades
     * now, in the commit after this one. The argument each needed is written at its own prop
     * rather than here, because the reason differs in each case: `webcams` was a shipped
     * `this`-loss hazard, `notes` was carrying a generic through a prop by hand, and `broadcasts`
     * was already being passed whole to `RoomOverlays` from the same page.
     */
    screens: RoomScreens;
    mediaTransport: RoomMediaTransport;
    volume: number;
    /** The volume dropdown, passed as a SNIPPET — it is markup the page owns, not a value. */
    screenVolume: Snippet;

    // ── #streams ───────────────────────────────────────────────────────────────
    hideStreams: boolean;
    streamServerMTX: string;
    mtxToken: string;
    selectStreamTabByUser: (streamId: string) => void;
    bringEveryoneToStream: (streamId: string) => void;
    toggleLockStreamMtx: (streamId: string) => void;

    // ── #notes ─────────────────────────────────────────────────────────────────
    noteGates: { surfaceVisible: boolean; editorMounted: boolean };
    giphyApiKey: string;
    /**
     * The notes surface, whole — `#lib/room/notes.svelte.ts`.
     *
     * Six props, and one of them was the reason to do this rather than the count. `submitMutation`
     * is GENERIC in its success type, and a generic cannot survive being handed through a prop by
     * itself, so the page carried a five-line wrapper whose entire job was to re-declare the type
     * parameter and forward it:
     *
     * ```svelte
     * submitNoteMutation={<Success extends Record<string, unknown>>(
     *   action: Parameters<typeof notes.submitMutation>[0],
     *   values: Parameters<typeof notes.submitMutation>[1]
     * ) => notes.submitMutation<Success>(action, values)}
     * ```
     *
     * Twelve lines of interface here and five of markup there existed to move one method across
     * one boundary with its type intact. Passing the object deletes all seventeen and the call
     * sites below name `notes.submitMutation` directly, which is what they meant all along.
     *
     * `newNoteOpen` stops being a bind-and-relay pair for the same reason `isFullScreenshare` did
     * above: `RoomNotes` declares a real setter, so `NotesPane`'s report writes through it.
     */
    notes: RoomNotes;
    uploadAlertFiles: (files: readonly File[]) => Promise<readonly string[]>;

    // ── #swingAlerts and #dayTradeAlerts ───────────────────────────────────────
    /**
     * The two trade alert feeds, whole — `#lib/room/trade-alerts.svelte.ts`.
     *
     * Fourteen props, seven per feed, and the two sevens were the same seven twice. They are one
     * class with two instances now, so the pane calls below read `swingAlerts.log` where they read
     * `swingAlertsLog`, and the wire action names stay at the call sites where they belong —
     * `submit()` is generic over them precisely so this component keeps naming them.
     */
    swingAlerts: RoomTradeAlerts<SwingAlertRow, SwingAlertAction>;
    dayTradeAlerts: RoomTradeAlerts<DayTradeAlertRow, DayTradeAlertAction>;

    // ── #videoplayer, the mp3 sink and the YouTube overlay ─────────────────────
    /**
     * Everything a presenter plays FOR THE ROOM, whole — `#lib/room/broadcasts.svelte.ts`.
     *
     * Thirteen props, spread across three separate sections of this interface because they arrived
     * with three different features — the video player, the mp3 element and the YouTube overlay —
     * and reassembled here because they were always one object. `hideVideoPlayer` is set by
     * `playVideoForAll` and cleared by `stopVideoForAll`, both on the `cmds` channel; that
     * sentence is the whole argument, and it was previously attached to one of the thirteen.
     *
     * The inconsistency this removes is visible on the page rather than here: `+page.svelte` hands
     * this same object WHOLE to `RoomOverlays` twenty lines below where it decomposed it into
     * thirteen for this component.
     */
    broadcasts: RoomBroadcasts;

    // ── #files ─────────────────────────────────────────────────────────────────
    /**
     * The file drive, whole — `#lib/room/files.svelte.ts`.
     *
     * This was fifteen props, and every one of them arrived from the page and left again for
     * `FilesPane` unread: the only member this component itself touches is `filesHidden`, on the
     * main tab `li` below. Passing the object rather than its parts is what `RoomSidebar` does
     * with `roster` and `menus`, and it is why `bind:fileTab` is gone — the pane writes
     * `files.fileTab` directly, so there is no value to bind back up through here.
     */
    files: RoomFiles;
    openModal: (name: Exclude<ModalName, null>) => void;
    setAutoplayAttribute: (node: HTMLMediaElement) => void;
  }

  let {
    data,
    split,
    media,
    menus,
    mtx,
    isPresenter,
    viewerOnlyMode,
    doNotDisturbOn,
    mainTab = $bindable('screens'),
    subtitles = $bindable(true),
    currentCaption,
    captionHistory,
    speechRecoHistoryMode = $bindable(false),
    archivesAvailable,
    openTranscriptPage,
    previewWindowsVisible,
    webcams,
    videoDisabled,
    screens,
    mediaTransport,
    volume,
    screenVolume,
    hideStreams,
    streamServerMTX,
    mtxToken,
    selectStreamTabByUser,
    bringEveryoneToStream,
    toggleLockStreamMtx,
    noteGates,
    giphyApiKey,
    notes,
    uploadAlertFiles,
    swingAlerts,
    dayTradeAlerts,
    broadcasts,
    files,
    openModal,
    setAutoplayAttribute
  }: Props = $props();

  /*
    THE SFU SPATIAL LAYER FOLLOWS THE SELECTED TAB.

    `setPreferredLayers(id, TOP)` for the screen being watched and layer 0 for the rest, so the room
    is not pulling full-resolution video for four screens when a viewer is looking at one. The work
    is `RoomMediaTransport.applyScreenLayers`; what lives here is WHEN to ask.

    ## Why this is an `$effect`, and why it is in this component

    It is not DOM manipulation — it touches no node. It is the other case the docs name for effects:
    *"calling third-party libraries"*. The library is the SFU client, and this pushes state INTO it.
    `createSubscriber` was considered and does not fit, because that is for making an external source
    readable as a getter and nothing here reads a value back.

    `svelte-autofixer` returns zero issues and one suggestion — *"you are calling a function inside an
    $effect… could it use `$derived`?"* Declined, for the reason above: what this produces is a
    round trip to the SFU, not a value, and a `$derived` that performed network I/O on read would be
    the actual malpractice. Recorded rather than ignored, the same way `ExtraChatPane.svelte` records
    the decline on its scroll-follow effect.

    It belongs to THIS component because this is what the effect is about: `ScreenPane` below renders
    the selected screen, and the whole point of the call is that the screen a viewer is actually
    watching is the one that gets the bandwidth. On `+page.svelte` it sat 700 lines from anything to
    do with screens.

    ## The two `void` reads are load-bearing, and are not dead code

    `applyScreenLayers` reads `selectedTab` and the stream map INTERNALLY, through `this`. An effect
    only tracks what it reads SYNCHRONOUSLY in its own body, and the method is `async` — everything
    after its first `await` is untracked. So without these two lines the effect would run once and
    never again, and switching tabs would leave the new screen on layer 0: visibly soft video with
    no error anywhere. They are dependency declarations, and `void` says the value is not wanted.
  */
  $effect(() => {
    // Re-runs when the viewer switches tabs or a screen arrives/leaves.
    void screens.selectedTab;
    void mediaTransport.screenStreams.size;
    void mediaTransport.applyScreenLayers();
  });
</script>

<as-split-area
  minsize="0"
  class="presentation-box as-split-area"
  style={split.presentationAreaStyle}
>
  <!--
    `app-webcam-holder`, in `#lib/components/WebcamStrip.svelte` since 2026-08-18.

    Eighty-two lines and the capture's own component boundary: the header above argues the seven TAB
    PANES stay together because `mainTab` is one value every tab reads and writes, and that argument
    never covered this. The strip is a SIBLING of the tab area upstream, shares no state with any
    tab, and reads exactly three things.

    The two long transcriptions — why the cards are created dynamically rather than as the two
    static `app-presenter-cams` the template appears to hold, and why the ids carry the presenter
    suffix — went WITH the markup they explain.
  -->
  <WebcamStrip
    visible={previewWindowsVisible}
    presenters={mediaTransport.webcamPresenters}
    {webcams}
  />
  <app-presentationarea>
    <div class="mainPresentationAreaHolder">
      <!--
                  `.speech-reco-overlay` is `position: absolute` pinned to the bottom of its
                  containing block, so it belongs inside `.mainPresentationAreaHolder` - the
                  presentation area is what it captions.

                  Two gates, and both must be open: `subtitles` is this viewer's
                  `presentation-subtitles` / `showSpeechRecoOverlay` preference, and a caption only
                  exists at all while session-level `doSpeechReco` is running recognition.
                -->
      {#if subtitles}
        <SpeechRecoOverlay
          current={currentCaption}
          history={captionHistory}
          historyMode={speechRecoHistoryMode}
          {archivesAvailable}
          onclose={() => (subtitles = false)}
          ontogglehistory={() => (speechRecoHistoryMode = !speechRecoHistoryMode)}
          ontranscript={openTranscriptPage}
        />
      {/if}
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
        <li role="presentation" class="nav-item">
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

      <div id="mainTabsContent" class="tab-content">
        <div
          id="screens"
          class={[
            'tab-pane fade',
            {
              show: mainTab === 'screens',
              active: mainTab === 'screens',
              'is-fullscreenshare': screens.isFullScreenshare
            }
          ]}
          role="tabpanel"
          aria-labelledby="screens-tab"
        >
          <!--
                      The viewer's own "off to preserve data" switch, and it replaces the WHOLE
                      pane rather than hiding the videos inside it. `TSe`
                      (`app-presentationarea.render-helpers.js:496-499`) chooses between `eSe` -
                      this one h3 - and `wSe`, and `wSe` is the empty-room h3, `ul#screenTabs` and
                      `div#screensTabsContent` together, so nothing below survives the switch.
                      That is the point: a tab strip with no video under it would still be
                      requesting streams.
                    -->
          {#if videoDisabled}
            <h3 class="text-center mt-4">Video off to preserve data...</h3>
          {:else}
            <!--
                      `screenSharingUsers` is an array and each presenter holds a Map of screens, so
                      N sharers x M screens each all land here as sibling tabs - the captured bar
                      carried three at once, all belonging to a single presenter.
                    -->
            <!--
                      The h3 and the bar are SIBLINGS, not alternatives. The bar used to sit in the
                      alternate branch of this conditional, so an idle room rendered the h3 INSTEAD
                      of `ul#screenTabs` and the strip's background simply did not exist - the
                      owner's report, 2026-08-11, that the background div is missing from where the
                      screens go.

                      The capture settles it without ambiguity. `app.css:1225` cites the computed
                      style at path `r.0#screens.1#screenTabs`, and 1229 records that in that same
                      capture NO screen was shared: index `.0` is this h3, index `.1` is the bar.
                      Both present, in that order, with nothing being presented. The bar reported
                      `background-color: rgb(17,17,17)`, `width: 1186.53px` and `height: 1px` -
                      that 1px being 0px of content plus its own bottom border, which is exactly
                      what an empty flex container measures.

                      So the bar is unconditional and only its CONTENTS are conditional, which
                      `ScreenTabs` already handles: the `{#each}` renders nothing and the
                      `li.nav-item.ms-auto` controls slot is gated on `screens.length > 0`.
                      `height: auto` then reproduces both states for free, because
                      `.nav-tabs .nav-item { margin-bottom: -1px }` cancels the bar's own border
                      once it has tabs.
                    -->
            {#if mediaTransport.screens.length === 0}
              <h3 class="text-center mt-4">No one is presenting right now...</h3>
            {/if}
            <ScreenTabs
              screens={mediaTransport.screens}
              selectedScreenId={screens.selectedTab}
              forcedScreenId={screens.forcedId}
              lockedScreenId={screens.lockedId}
              {isPresenter}
              onselect={(id) => screens.selectTab(id)}
              ondetach={(id) => screens.detach(id)}
              ontogglelock={(id) => screens.toggleLock(id)}
              onbringeveryone={(id) => screens.bringEveryoneTo(id)}
              onstopscreen={(id) => screens.stop(id)}
            >
              <!--
                        The `li.nav-item.ms-auto` slot, which the capture fills and this page
                        never did. `ScreenTabs` already renders the captured container around it
                        (`div.zoom-controls-container.position-relative`, const 88 of
                        `app-presentationarea`), so the snippet supplies that container's
                        children only.
                      -->
              {#snippet controls()}
                <ScreenZoomControls
                  variant="attached"
                  showZoomCtrl={screens.showZoomCtrl}
                  {viewerOnlyMode}
                  ontoggle={() => screens.toggleZoomControls()}
                  volume={screenVolume}
                  oncapture={() => {
                    // The captured payload names the screen, and only that screen's view
                    // answers: `e.screenId !== this.muser._id` returns early.
                    if (screens.selectedTab) captureVideoImage(screens.selectedTab);
                  }}
                  onzoomin={() => screens.zoomIn()}
                  onzoomout={() => screens.zoomOut()}
                  onreset={() => screens.resetZoom()}
                  fullscreen={screens.isFullScreenshare}
                  onfullscreen={() => (screens.isFullScreenshare = !screens.isFullScreenshare)}
                />
              {/snippet}
            </ScreenTabs>
            <!--
                      `viewer-only-screen-tab` lives HERE, on const 72, and nowhere else.

                      `wSe`'s update block walks `O(0,…)`, `m(2)`, `pt(…)`, `m(2)`, `O(4,…)` — an
                      explicit index, so the pointer is fixed — then `m()` to node 5, where
                      `z('ngClass', ut(3, jCe, …viewerOnlyMode))` lands
                      (`app-presentationarea.render-helpers.js:483-493`). Node 5 is
                      `d(5,'div',72)` and const 72 is
                      `['id','screensTabsContent',1,'tab-content',3,'ngClass']` — the only element in
                      that block whose const carries a binding marker (`…compiled.js:2044`). The tab
                      strip's const 70 has none, and the pane's const 73 binds `{'show active': …}`
                      alone.

                      `.viewer-only-screen-tab { padding-bottom: 5px; height: 100% !important;
                      max-height: calc(-40px + 100vh) !important }`
                      (`css/complete-app-styles.css:6978`) — the 40px it reclaims is `ul#mainTabs`,
                      which is `hidden` in this mode.
                    -->
            <div
              id="screensTabsContent"
              class={['tab-content', { 'viewer-only-screen-tab': viewerOnlyMode }]}
            >
              {#each mediaTransport.screens as screen (screen.id)}
                <ScreenPane
                  id={screen.id}
                  stream={mediaTransport.screenStreams.get(screen.id) ?? null}
                  active={screen.id === screens.selectedTab}
                  {viewerOnlyMode}
                  {volume}
                  muted={volume === 0}
                  showZoomCtrl={screens.showZoomCtrl}
                  zoomLevel={screens.zoomLevel}
                  pan={screens.pans.get(screen.id) ?? NEUTRAL_PAN}
                  detached={screens.detachedScreenId !== null}
                  saveData={mediaTransport.saveData}
                  onpan={(x, y) => screens.pans.set(screen.id, { x, y })}
                  ontogglezoom={() => screens.toggleZoomControls()}
                  onzoomin={() => screens.zoomIn()}
                  onzoomout={() => screens.zoomOut()}
                  onreset={() => screens.resetZoom()}
                />
              {/each}
            </div>
          {/if}
        </div>
        <!--
                    The `#streams` pane — `d(40,'div',22)` with `H(41, DSe, 2, 0, 'h3', 23)(42, OSe, 7, 1)`
                    (`app-presentationarea.full.js:5277-5278`), and its update block at `:5388-5393`:

                      z('ngClass', ut(57, Hr, 'presAreaTabs-streams' == o.selectedMainTab))
                       ('hidden', o.hideStreams),
                      m(), O(41, o.appService.globals.preferences.disableVideo ? 41 : 42)

                    `Hr` is `t => ({'show active': t})`, so the pane gets BOTH classes, exactly like
                    `#screens`.

                    THE SAME `disableVideo` PREFERENCE BLANKS THIS PANE TOO. `DSe` (`:500`) renders
                    the identical `<h3 class="text-center mt-4">Video off to preserve data...</h3>`
                    that `eSe` renders for `#screens`. One switch, two panes — a viewer who turns
                    video off to save data must not keep pulling an HLS playlist here, which is the
                    whole point of the preference. `disable-video-gate-contract.test.ts` already
                    pins the polarity: the flag being SET selects the MESSAGE.
                  -->
        <div
          id="streams"
          class={mainTab === 'streams' ? 'tab-pane fade show active' : 'tab-pane fade'}
          role="tabpanel"
          aria-labelledby="streams-tab"
          hidden={hideStreams}
        >
          {#if videoDisabled}
            <h3 class="text-center mt-4">Video off to preserve data...</h3>
          {:else}
            <!--
                        `O(0, 0 == mtxStreams.length ? 0 : -1)` — the empty-state h3 is the ONLY
                        conditional part. The `ul` and the `div` are always rendered, empty, which is
                        why this sits beside them rather than replacing them.
                      -->
            {#if mtx.streams.length === 0}
              <h3 class="text-center mt-4">No one is streaming right now...</h3>
            {/if}
            <StreamTabs
              streams={mtx.streams}
              selectedStreamId={mtx.selectedTabID}
              {isPresenter}
              onselect={selectStreamTabByUser}
              onbringeveryone={bringEveryoneToStream}
              ontogglelock={toggleLockStreamMtx}
            />
            <!--
                        `d(4,'div',119)` then `ht(5, ISe, 2, 7, 'div', 73, pc)`. Each pane is const
                        73 — `['role','tabpanel',1,'tab-pane','fade',3,'ngClass','id']` — with
                        `ngClass` from `Hr` and `aria-labelledby` interpolated as `${_id}-tab`.

                        Every pane stays MOUNTED and only the classes change, which is why
                        `onStreamTabChange` has no stop/start counterpart: unlike
                        `onScreenShareTabChange`, which emits `stopWatchScreenOf` /
                        `startWatchScreenOf`, switching stream tabs upstream touches nothing but the
                        selection. `StreamingView` owns its own hls.js lifecycle from `active`.
                      -->
            <div id="streamsTabsContent" class="tab-content">
              {#each mtx.streams as mtxStream (mtxStream._id)}
                <div
                  id={mtxStream._id}
                  role="tabpanel"
                  class={mtxStream._id === mtx.selectedTabID
                    ? 'tab-pane fade show active'
                    : 'tab-pane fade'}
                  aria-labelledby="{mtxStream._id}-tab"
                >
                  <!--
                              `T(1,'app-streaming-view',117)` — const 117 is `[1,'h-inherit',3,'muser']`,
                              so the HOST element carries `h-inherit` and the component's own root
                              carries `h-100` (its const 1). Angular has a host element; Svelte has
                              none, so the host becomes this wrapper `div` and the two nested
                              elements survive. Dropping it would drop the height chain and the
                              video would collapse to its intrinsic size.
                            -->
                  <div class="h-inherit">
                    <StreamingView
                      muser={mtxStream}
                      {streamServerMTX}
                      {mtxToken}
                      {isPresenter}
                      overlayUserIdOnScreenshare={data.sessData.overlayUserIdOnScreenshare === true}
                      userXrefID={data.user.userXrefID}
                      audioVolume={volume / 100}
                      {doNotDisturbOn}
                    />
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
        <div
          id="notes"
          class={mainTab === 'notes' ? 'tab-pane active show' : 'tab-pane'}
          role="tabpanel"
          aria-labelledby="notes-tab"
        >
          {#if noteGates.surfaceVisible}
            <NotesPane
              canEdit={noteGates.editorMounted}
              {giphyApiKey}
              notes={data.notes}
              newNoteOpen={notes.newNoteOpen}
              onCreate={async (name) => {
                const result = await notes.submitMutation<{
                  success: boolean;
                  note: RoomNote;
                }>('newSessionNoteTab', { name });
                return result?.note;
              }}
              onDelete={async (noteId) => {
                await notes.submitMutation('deleteSessionNoteTab', { noteId });
              }}
              onLoadVersions={(noteId) => notes.loadVersions(noteId)}
              onNewNoteOpenChange={(open) => (notes.newNoteOpen = open)}
              onRename={async (noteId, newName) => {
                await notes.submitMutation('renameSessionNoteTab', { noteId, newName });
              }}
              onRestoreVersion={async (noteId, versionId) => {
                await notes.submitMutation('restoreNoteVersion', { noteId, versionId });
              }}
              onSave={async (noteId, contentHtml) => {
                await notes.submitMutation('saveSessionNote', { noteId, contentHtml });
              }}
              onSetWelcomeMat={async (noteId, allRooms) => {
                await notes.submitMutation('setWelcomeMatNoteTab', {
                  noteId,
                  allRooms
                });
              }}
              onUploadImages={uploadAlertFiles}
            />
          {/if}
        </div>
        <!--
                    The `#swingAlerts` pane — `vwe`, slot 48, carrying the SAME gate as the nav
                    item above (`O(48, o.hasSwingTradeAlerts ? 48 : -1)`). Both, because either one
                    alone leaves a tab that opens nothing or a pane reachable from a tab that is
                    gone.

                    The pane re-applies the gate itself, which is not redundancy for its own sake:
                    it is what lets the contract test prove the component renders nothing on a false
                    entitlement without standing up this whole page.
                  -->
        {#if swingAlerts.enabled}
          <div
            id="swingAlerts"
            class={mainTab === 'swingAlerts'
              ? 'tab-pane position-relative show active'
              : 'tab-pane position-relative'}
            role="tabpanel"
            aria-labelledby="swingAlerts-tab"
          >
            <SwingAlertsPane
              alerts={swingAlerts.log}
              hasSwingTradeAlerts={swingAlerts.enabled}
              {isPresenter}
              onCreate={async (draft) => {
                await swingAlerts.submit('swingAlertMsg', swingAlerts.payload(draft));
              }}
              onDelete={async (swingAlertID) => {
                await swingAlerts.submit('deleteSwingAlertMsg', { swingAlertID });
              }}
              onEdit={async (draft) => {
                await swingAlerts.submit('editSwingAlertMsg', {
                  ...swingAlerts.payload(draft),
                  swingAlertID: draft.swingAlertID ?? 0
                });
              }}
              onMonthsChange={(months) => void swingAlerts.changeMonths(months)}
              onPasteImage={(file) => swingAlerts.requestImagePaste(file)}
              onUploadImage={() => swingAlerts.requestImageUpload()}
              sessionHandle={data.sessionHandle}
            />
          </div>
        {/if}
        <!--
                    The `#dayTradeAlerts` pane — `Iwe`, slot 49, carrying the SAME gate as the nav
                    item above (`O(49, o.hasDayTradeAlerts ? 49 : -1)`, byte 2,017,748). Both,
                    because either one alone leaves a tab that opens nothing or a pane reachable
                    from a tab that is gone.

                    The pane re-applies the gate itself, which is not redundancy for its own sake:
                    it is what lets the contract test prove the component renders nothing on a false
                    entitlement without standing up this whole page.
                  -->
        {#if dayTradeAlerts.enabled}
          <div
            id="dayTradeAlerts"
            class={mainTab === 'dayTradeAlerts'
              ? 'tab-pane position-relative show active'
              : 'tab-pane position-relative'}
            role="tabpanel"
            aria-labelledby="dayTradeAlerts-tab"
          >
            <DayTradeAlertsPane
              alerts={dayTradeAlerts.log}
              hasDayTradeAlerts={dayTradeAlerts.enabled}
              {isPresenter}
              onCreate={async (draft) => {
                await dayTradeAlerts.submit('dayTradeAlertMsg', dayTradeAlerts.payload(draft));
              }}
              onDelete={async (dayTradeAlertID) => {
                await dayTradeAlerts.submit('deleteDayTradeAlertMsg', {
                  dayTradeAlertID
                });
              }}
              onEdit={async (draft) => {
                await dayTradeAlerts.submit('editDayTradeAlertMsg', {
                  ...dayTradeAlerts.payload(draft),
                  dayTradeAlertID: draft.dayTradeAlertID ?? 0
                });
              }}
              onMonthsChange={(months) => void dayTradeAlerts.changeMonths(months)}
              onPasteImage={(file) => dayTradeAlerts.requestImagePaste(file)}
              onUploadImage={() => dayTradeAlerts.requestImageUpload()}
              sessionHandle={data.sessionHandle}
            />
          </div>
        {/if}
        <!-- Slot 47 carries the same gate as the tab above. -->
        {#if (broadcasts.hideVideoPlayer && !isPresenter) || isPresenter}
          <div
            id="videoplayer"
            class={mainTab === 'videoplayer'
              ? 'tab-pane position-relative h-100 active show'
              : 'tab-pane position-relative h-100'}
            role="tabpanel"
            aria-labelledby="videoplayer-tab"
          >
            <VideoPlayer
              sessionId={data.sessionHandle}
              {isPresenter}
              videoPlayerUrl={broadcasts.videoPlayerUrl}
              scheduledVideo={broadcasts.scheduledVideoForAll}
              onplaynow={(url) => void broadcasts.playVideoForAll(url)}
              onschedule={(url, whenLocal) => broadcasts.scheduleVideoForAll(url, whenLocal)}
              onstopforall={() => void broadcasts.stopVideoForAll()}
            />
          </div>
        {/if}
        <!--
                    The second half of the `hideFiles` gate - `z('hidden', o.hideFiles)` at
                    full.js:5410-5413. `#files.active` sets `display: block`, which the UA rule for
                    `[hidden]` cannot beat on its own, so `app.css` carries `#files[hidden]` after
                    it; the note there records that the two selectors are equally specific and it is
                    the order that decides.
                  -->
        <FilesPane
          {data}
          {isPresenter}
          {files}
          {mainTab}
          mp3Playing={broadcasts.mp3Playing}
          playMp3ForAll={(url) => broadcasts.playMp3ForAll(url)}
          stopMp3ForAll={() => broadcasts.stopMp3ForAll()}
          {openModal}
        />
      </div>
      {#if broadcasts.youtubeForAllUrl}
        <!--
                    Two DIFFERENT handlers, which is the whole point of the two buttons: `onstop`
                    posts `stopYTForAll` and takes the video off the room, `onclose` dismisses this
                    viewer's own iframe and nothing else. Both were wired to one function.
                  -->
        <YoutubePlayerOverlay
          url={broadcasts.youtubeForAllUrl}
          {isPresenter}
          muted={doNotDisturbOn}
          onstop={() => void broadcasts.stopYoutubeForAll()}
          onclose={() => broadcasts.closeYoutubeFrame()}
        />
      {/if}
      {#if media.soundCloudUrl && media.soundCloudPlaying}
        <app-scplayer>
          <div
            id="soundCloudDiv"
            style="visibility: hidden; position: absolute; bottom: calc(-100vh + 100px); right: 10px;"
          >
            <iframe
              id="soundCloudIFrame"
              title="SoundCloud player"
              width="100%"
              height="150"
              scrolling="no"
              frameborder="no"
              allow="autoplay; encrypted-media"
              src={`https://w.soundcloud.com/player/?url=${media.soundCloudUrl}&auto_play=true`}
            ></iframe>
          </div>
        </app-scplayer>
      {/if}
      <!--
                  `z('src', o.mp3Url, Mt)` — the element binds its src to the room-wide sound.

                  It was `src=""`, so the element existed, autoplayed nothing, and a presenter's
                  "Play For All" was silent in every browser including their own. `#mp3player` is
                  the capture's own id and is load-bearing: `setBkgMusicVol` reaches it with
                  `un('#mp3player').prop('volume', o)`.
                -->
      <audio
        {@attach setAutoplayAttribute}
        {...{ autoplay: 'autoplay' } as Record<string, string>}
        id="mp3player"
        src={broadcasts.mp3Url ?? ''}
      ></audio>
    </div>
  </app-presentationarea>
</as-split-area>
