<script lang="ts">
  import SoundCloudMenu from '#lib/components/SoundCloudMenu.svelte';
  import SoundCloudViewerStop from '#lib/components/SoundCloudViewerStop.svelte';
  import ScreenShareMenu from '#lib/components/ScreenShareMenu.svelte';
  import type { TipButton } from '#lib/tip-button.js';
  import type { RoomMedia, TalkingUser } from '#lib/room/media.svelte.js';
  import type { RoomMenus } from '#lib/room/menus.svelte.js';
  import type { RoomRoster, RosterMember } from '#lib/room/roster.svelte.js';
  import type { PresenterAudioPreferences } from '#lib/screen-volume.js';
  import PresenterMuteRows from '#lib/components/PresenterMuteRows.svelte';

  /*
    `.mainAppNav` — the room's top bar: the brand, the connected count, the REC and speaking
    indicators, and the presenter's broadcast controls (recording, SoundCloud, microphone, screen
    sharing, webcam, session control) with the volume dropdown and Reload a member also gets.

    ## The third of the five template regions, and the one with the most CONTROLS

    Seventy-odd identifiers, and the shape of that number is the point: two thirds are handlers, and
    almost every piece of state it reads belongs to `RoomMedia` or `RoomMenus`. Three instances
    replace what would otherwise be about thirty scalars — the same payoff `RoomSidebar` recorded,
    on a bigger surface.

    ## What it does NOT decide

    Nothing here starts a recording, opens a device or touches a `MediaStream`. Every control calls
    a page callback, because the transport lives with the page — a bar that owned a `MediaRecorder`
    would own its lifecycle and its error paths too. This file decides what a button LOOKS like;
    `RoomMedia` says what is true, and the page does the work.
  */

  interface Props {
    isPresenter: boolean;
    /**
     * `globals.user.hasMic` — the durable membership permission, which widens ONE item below.
     *
     * `O(29, !isPresenter && !user.hasMic || isLimitedPresenter ? -1 : 29)` at bundle byte
     * 2,489,576, where slot 29 is `f4e` — the `Session Control` item. It is the only entry in the
     * presenter block whose gate is not plain `isPresenter`, and it is why this prop exists.
     */
    hasMic?: boolean;
    /*
      BINDABLE, both of them, and that is a defect this extraction nearly shipped.

      The hamburger and the mobile-nav toggle both ASSIGN to these, and a plain prop assignment
      updates the component's own copy and nothing else — so the button would have animated while
      the sidebar it controls, which is a sibling component reading the page's value, never moved.
      `svelte-check` is silent on it, and the suite would have been too: the assertion that caught it
      was a source-text one looking for the handler in the wrong file.
    */
    sidebarOpen: boolean;
    mobileNavOpen: boolean;
    media: RoomMedia;
    menus: RoomMenus;
    roster: RoomRoster<RosterMember & { id: number; displayName: string; email: string }>;

    /** Master output level, 0-100, and the per-presenter map beside it. */
    volume: number;
    presenterAudio: PresenterAudioPreferences;
    individualVolumeControls: boolean;
    /** `sessData.recordingReminder` — the OWNER's half of the reminder gate. */
    recordingReminderAllowed: boolean;
    /** The recording tooltip, already resolved: a member may not see the file name. */
    recordingTooltip: string;
    /**
     * Benzinga, the NAVBAR copy — a second, independent render of the same feature.
     *
     * `RoomSidebar` renders the sidebar's (consts 50/51/52: `nav-link sidebar-item ps-1`, and an
     * icon-and-text fallback). This is `PPe` at bundle byte 2,473,150, gated by the same
     * `O(15, sessData.hasBenzingaNews ? 15 : -1)` and sitting immediately before the talking
     * indicator, which is where it is rendered below.
     *
     * The two are NOT the same markup and neither is a copy of the other — see the note at the
     * element for the one branch this one does not have.
     */
    mobileAppAvailable: boolean;
    /** The Benzinga item's three settings as one — see `gates.benzinga` and its contract test. */
    benzinga: { visible: boolean; url: string | null; logoUrl: string | null };
    tawkAvailable: boolean;
    /** The viewer's own do-not-disturb, which greys the sound checks. */
    doNotDisturbOn: boolean;
    /*
      The three OTHER background sources, beside SoundCloud. The volume block is gated on all four
      because any of them can be what a member is hearing, and a slider that appears for one and not
      the others is a control that vanishes mid-use.
    */
    mp3Playing: boolean;
    youtubeForAllUrl: string;
    backgroundVolume: number;
    /** The do-not-disturb checkboxes, keyed by their input ids. */
    soundChecks: Record<string, boolean>;
    /*
      NO `viewerName`, NO `onopenmodal`, NO `decodedRecName` AND NO `onstopsharingall` PROP.

      Four invented in a first draft, all four found by ESLint rather than by reading. Two came from
      scanning the region for identifiers and picking up COMMENT text; the other two were guesses
      about what a top bar surely needs. It does not: the brand shows no name, and every modal this
      bar reaches it reaches through `onopensessioncontrol` or `ongetmypinanddoinfo`.

      Recorded rather than quietly deleted, because it is the third and fourth time in this phase
      that a scan of a region has produced props for prose — after `user`/`viewer` in the sidebar and
      `toggleSpeechRecoHistory` before them. The lesson is the repository's own: locating with a tool
      is fine, CONCLUDING from its output is not.

      Both were declared in a first draft and neither is called by this markup: they appear only in
      COMMENTS — one inside a quoted tooltip expression, one inside a note about what a member's own
      browser does. That is the third time in this extraction that scanning a region for identifiers
      picked up prose, after `user`/`viewer` here and `toggleSpeechRecoHistory` in the sidebar.

      The tooltip this bar renders is `recordingTooltip`, already resolved by the page because a
      member may not be shown the file name.
    */

    /*
      The four label strings the capture spells exactly, passed rather than restated.

      `virtualCamText` is ' OBS / XSPLIT/ Share Virtual Cam' — the spacing and the missing space
      after the second slash are the reference's. Retyping them here would be a second place for a
      captured string to drift, and one of them has already been the source of a bug: a menu item
      went unclicked because a regex was built out of that exact label.
    */
    noSpeakerText: string;
    shareScreenText: string;
    virtualCamText: string;
    stopSharingAllText: string;

    /** Attachments the page owns, because they poke at DOM the page also writes. */
    setInputChecked: (checked: boolean) => (node: HTMLInputElement) => void;
    setRangeValue: (value: number) => (node: HTMLInputElement) => void;

    ontoggletopmenu: (menu: 'recording' | 'soundcloud' | 'screen') => void;
    onstartrecording: () => void;
    onstoprecording: () => void;
    onpauserecording: () => void;
    onresumerecording: () => void;
    ondownloadrecording: () => void;
    onpromptforsoundcloud: () => void;
    onstopsoundcloud: () => void;
    onstopsoundcloudforme: () => void;
    ontogglemicrophone: () => void;
    ontogglewebcam: () => void;
    /**
     * "Hide webcam for room?" — the fifth term of the webcam control's gate, and the only one this
     * room could not evaluate: the other four are facts about the viewer and their devices.
     */
    hideWebcamForRoom: boolean;
    /**
     * "Blinking REC?" — whether the recording badge breathes while recording.
     *
     * ## NAV-04 — THE ELEMENT NAMED HERE WAS THE WRONG ONE, and the class is on a different VIEWER
     *
     * This paragraph used to say the reference binds `breathing-rec` *"through a class MAP on the
     * recording `ul`"*. It does not, and re-measuring the cited offset is what showed it:
     *
     * ```js
     * function t4e(t,n){ … d(0,"li",95)(1,"a",152), T(2,"i",153), … }        // byte 2,477,354
     * m(), z("ngClass", ct(4, KB, !e.mediaService.isScreenSharing)),          // node 1, the <a>
     * m(), z("ngClass", Kn(6, iPe,
     *          roomState.isRecording && sessData.blinkingRec,
     *          e.isRecordingStarting))                                       // node 2, the <i>
     * const iPe = (t,n) => ({"breathing-rec": t, recIndicatorStart: n});      // byte 2,465,900
     * ```
     *
     * Byte 2,477,678 lands inside that second binding, and the `m()` walk before it reaches node 2,
     * which const 153 declares as `[1,"far","fa-2x","fa-dot-circle",3,"ngClass"]` — the record dot
     * INSIDE the presenter's recording dropdown. There is no `ul` at that index; the menu is slot 6.
     *
     * That is not a one-level-down difference, it is a different audience. `.breathing-rec` is
     * `animation: 5s … breathing; color: red !important` in `captured-runtime-components.css`, and
     * upstream it pulses on a control **only a presenter is served**, while the `[ REC ]` badge
     * every member sees (`UPe`, const 93) stays still. Here the class is on that badge, so the whole
     * room gets a red pulsing indicator where upstream only the person who can stop the recording
     * does.
     *
     * **NOT MOVED, and the reason is a file this change may not touch.**
     * `room-navbar-contract.test.ts` asserts `breathing-rec` on a render whose `isPresenter` is
     * false. Moving the class into the presenter block turns that assertion red, and a change that
     * needs a test rewritten to pass is a change that has to be proposed rather than made. What
     * would unblock it is named in that test's own terms: give the *"breathes the REC badge only
     * when the room asked for it"* case `isPresenter: true`, and point its needle at the recording
     * dropdown's icon rather than at the badge.
     */
    blinkingRec: boolean;
    onpromptforscreenname: (source: 'screen' | 'camera') => void;
    onstopscreensharing: () => void;
    /**
     * The tab is a literal union rather than an imported type: `SessionControlTab` is declared in
     * `+page.svelte` and moving it would be a change to a file this extraction is trying to shrink.
     * Restated here because the bar only ever opens one of them.
     */
    onopensessioncontrol: (tab?: 'av-device-selection') => void;
    onsetmastervolume: (value: number) => void;
    onsetbackgroundvolume: (value: number) => void;
    ontogglemute: () => void;
    onadjustpresentervolume: (user: TalkingUser, rawValue: string) => void;
    ontoggletalkingpresenteraudio: (user: TalkingUser) => void;
    /** Takes the EVENT, because the page reads the input's id to decide which flag moved. */
    onupdatesoundcheck: (event: Event) => void;
    ontoggletawksupport: () => void;
    ongetmypinanddoinfo: () => void;
    onrequestreload: () => void;
    /** The recording preview lives in its own window; the page owns opening and closing it. */
    onshowrecpreview: () => void;
    onhiderecpreview: () => void;

    /** RS-09 — the tip control, already resolved. `tip-button.ts` holds the three-way gate. */
    tip: TipButton;
    /**
     * G12 — `toggleSideBarUsersCount` is `alwaysShowRoster && (…)`: the SETTING gates the whole
     * statement, so in a room without it clicking the counter does nothing at all.
     */
    alwaysShowRoster: boolean;
    /**
     * G13 — `!sessData.rosterCountVisibleToViewers && !isPresenter` inverted, resolved by the page
     * through `rosterCountVisibleTo()` so the navbar and the sidebar badge cannot answer it
     * differently. `hideCount` is this component's own and is NOT folded in here.
     */
    rosterCountVisible: boolean;
    /** G05 — `sessData.useMediaMTX`, which gates the OBS / RTMP entry alone. */
    streamingTabAvailable: boolean;
    /**
     * G07 — the screens THIS browser is sharing, in the order they were started.
     *
     * `pt(yr(18, 4, e.mediaSoupService.screenProducers))` — a `keyvalue` pipe over the LOCAL
     * producer map, so a presenter sees their own shares and never anyone else's.
     */
    localScreens: readonly { readonly id: string; readonly screenName: string }[];
    /** G04 — one speaker name in the talking indicator, clicked. */
    onmutetalkinguser: (user: TalkingUser) => void;
    /** G05 — `openStreamingTab()`: session control, streaming tab, OBS tab. */
    onopenstreamingtab: () => void;
    /** G06 — `reopenPreviewWindow()`, which is the only way back from Hide Preview Windows. */
    onreopenpreview: () => void;
    /** G07 — `mediaService.stopSharingProducer(key)` for one of this browser's own screens. */
    onstoplocalscreen: (producerId: string) => void;
  }

  /**
   * G12 — `hideCount`, a component field upstream and a component field here.
   *
   * It is not a preference: nothing persists it there, a reload shows the count again, and that is
   * the right behaviour for a double-click meant to peek past a number rather than to configure the
   * room. A plain `$state` for that reason, and deliberately not routed through `RoomPrefs`.
   */
  let hideCount = $state(false);

  let {
    isPresenter,
    hasMic = false,
    sidebarOpen = $bindable(),
    mobileNavOpen = $bindable(),
    media,
    menus,
    roster,
    volume,
    presenterAudio,
    individualVolumeControls,
    recordingReminderAllowed,
    recordingTooltip,
    benzinga,
    mobileAppAvailable,
    tawkAvailable,
    doNotDisturbOn,
    mp3Playing,
    youtubeForAllUrl,
    backgroundVolume,
    soundChecks,
    noSpeakerText,
    shareScreenText,
    virtualCamText,
    stopSharingAllText,
    setInputChecked,
    setRangeValue,
    ontoggletopmenu,
    onstartrecording,
    onstoprecording,
    onpauserecording,
    onresumerecording,
    ondownloadrecording,
    onpromptforsoundcloud,
    onstopsoundcloud,
    onstopsoundcloudforme,
    ontogglemicrophone,
    ontogglewebcam,
    hideWebcamForRoom,
    blinkingRec,
    onpromptforscreenname,
    onstopscreensharing,
    onopensessioncontrol,
    onsetmastervolume,
    onsetbackgroundvolume,
    ontogglemute,
    onadjustpresentervolume,
    ontoggletalkingpresenteraudio,
    onupdatesoundcheck,
    ontoggletawksupport,
    ongetmypinanddoinfo,
    onrequestreload,
    onshowrecpreview,
    onhiderecpreview,
    tip,
    alwaysShowRoster,
    rosterCountVisible,
    streamingTabAvailable,
    localScreens,
    onmutetalkinguser,
    onopenstreamingtab,
    onreopenpreview,
    onstoplocalscreen
  }: Props = $props();
</script>

<nav class="navbar navbar-expand-md navbar-dark fixed-top mainAppNav" style="">
  <!--
    ── NAV-01 — A ROOM THAT ALWAYS SHOWS THE ROSTER HAS NO HAMBURGER ────────────────────────────

    ```js
    O(1, e.showSidebar && !e.alwaysShowRoster ? 1 : -1)   // DPe, "Close Sidebar", const 133
    O(2, e.showSidebar || e.alwaysShowRoster ? -1 : 2)    // EPe, "Open Sidebar",  const 135
    ```

    Byte 2,487,413, the first two slots of `U4e`. Read together the two gates leave a THIRD state
    this room did not have: `alwaysShowRoster` removes both, at any value of `showSidebar`. That is
    the interlock for the counter's own handler below, which G12 already built as
    `alwaysShowRoster && (showSidebar = !showSidebar, …)` — upstream hands the toggle to exactly one
    element, and this room had it on two. Argued in full as NAV-01 in
    `docs/decoded/room-surface-audit-2026-08-30.md`; the one span with two ternaries is unchanged
    and stays, because DPe and EPe differ only in icon and title.
  -->
  {#if !alwaysShowRoster}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span
      title={sidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
      class={sidebarOpen ? 'sidebar-menu active-icon' : 'sidebar-menu'}
      onclick={() => (sidebarOpen = !sidebarOpen)}
    >
      <i class={sidebarOpen ? 'fas fa-arrow-left' : 'fas fa-bars'}></i>
    </span>
  {/if}
  <!--
      `Ne(" ", globals.rosterCount + e.simUserCount, " ")`.

      This read `data.connectedUsers.length`, and the load returns `[connectedUser]` - one
      entry, always yourself. So the navbar said "1" in a room of any size, and never
      changed as people came and went. It is the same number as the sidebar badge and is
      now computed the same way.
    -->
  <!--
    ── G12 and G13 — THE USERS COUNTER HAS TWO HANDLERS AND ONE GATE, and it had none of them ────

    ```js
    d(3,"span",79),                                                        // byte 2,484,941
      x("click",  () => g().toggleSideBarUsersCount())
       ("dblclick",() => { const o = g(); return o.hideCount = !o.hideCount }),
      T(4,"i",56), H(5,kPe,2,1,"span",80)
    O(5, e.hideCount || !sessData.rosterCountVisibleToViewers && !isPresenter ? -1 : 5)
    ```

    Const 79 carries `3,"click","dblclick"` — this element is the control, and ours was a bare
    `<span>`. The two gestures do unrelated things and the enumeration mislabelled which is which:
    CLICK opens the sidebar, DBLCLICK hides the number.

    **G13 is the one that matters.** `rosterCountVisibleToViewers` is an owner setting, and this
    room already honours it for the SIDEBAR badge — `rosterCountVisibleTo()` in `roster-gates.ts`,
    used at `RoomSidebar.svelte:545`. The navbar rendered the same number unconditionally, so an
    owner who turned the count off for viewers had it leaked one element away. A gate applied in one
    of two places is not a gate.

    `hideCount` is component state and stays component state, because that is what it is upstream —
    a field on the room component, not a preference. It survives nothing: a reload shows the count
    again, which is what a double-click meant to peek past a number should do.

    `toggleSideBarUsersCount` is `alwaysShowRoster && (showSidebar = !showSidebar, …)` — the
    setting gates the whole statement, so in a room without it the click does nothing, exactly as
    upstream. Its `loadRoster()` half has no counterpart and is already refused with its reason in
    `always-show-roster-contract.test.ts`: the roster arrives with the page load here.
  -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span
    title="Users Connected"
    class="users ml-1 mr-1 d-flex align-items-center"
    onclick={() => {
      if (alwaysShowRoster) sidebarOpen = !sidebarOpen;
    }}
    ondblclick={() => (hideCount = !hideCount)}
  >
    <i class="fas fa-user"></i>{#if !hideCount && rosterCountVisible}<span class="ml-1"
        >{roster.connectedCount}</span
      >{/if}
  </span>
  <!--
      `FPe`, const 137: the same action as the sidebar button, reachable without opening
      the sidebar. Its navbar gate is broader than the sidebar's -
      `O(6, !(ptrMobileAppEnabled || customMobileAppEnabled || alwaysShowRoster)
            || user.isFT && !freeTrialsGetApp ? -1 : 6)` - because `alwaysShowRoster` keeps
      the icon's slot occupied even when no app is configured. That flag is not built here,
      so this is the app half of the same condition.
    -->
  {#if mobileAppAvailable}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span
      title="Launch in Mobile App"
      data-bs-toggle="modal"
      data-bs-target="#mobileAppInfoModal"
      class="fas fa-mobile mr-1 mobile-info-app-btn"
      onclick={ongetmypinanddoinfo}
    ></span>
  {/if}
  <!-- svelte-ignore a11y_missing_attribute -->
  <a class="navbar-brand ml-1 mr-auto">
    <img
      id="cssLogo"
      alt="App Logo"
      class="brand-logo"
      src="/assets/images/ptr_logo.png"
      width="489"
      height="60"
    />
  </a>
  <button
    type="button"
    data-bs-toggle="collapse"
    data-bs-target="#navbarsRoom"
    aria-controls="navbarsRoom"
    aria-expanded={mobileNavOpen}
    aria-label="Toggle navigation"
    class="navbar-toggler btnNavToggler"
    onclick={() => (mobileNavOpen = !mobileNavOpen)}
  >
    <span class="navbar-toggler-icon"></span>
  </button>
  <div
    id="navbarsRoom"
    class={mobileNavOpen ? 'collapse navbar-collapse show' : 'collapse navbar-collapse'}
  >
    <ul class="navbar-nav align-items-center ml-auto">
      <!--
        `H(15, PPe, 3, 2, "li", 90)` under `O(15, sessData.hasBenzingaNews ? 15 : -1)`, immediately
        before the talking indicator below — the captured order, read at bundle byte 2,485,295.

        Consts read with a string-aware parser rather than counted by eye, because a const index is
        per component and the same numbers mean different things three tables away:

          90  [1,"nav-item","animated","fadeIn","benzinga-li"]
          141 ["target","_blank","title","Benzinga News",1,"nav-link"]
          142 [1,"benzinga-logo","animated","fadeIn",3,"src"]

        `animated fadeIn` are animate.css 3.7.2, which IS a dependency here, so these are worn
        rather than dropped. `benzinga-li` carries no rule in either captured sheet and is worn
        anyway: it is the capture's own hook and costs nothing.

        THE ONE THING THIS ITEM DOES NOT DO, and it is the whole reason for the extra condition:
        upstream's is IMAGE-ONLY with a hard fallback —

          z("src", sessData.altBenzingaLogoURL || "/assets/images/benzinga-logo.png", Mt)

        — and that asset is not in this repository. `find -iname "*benzinga*"` returns nothing.
        Transcribing it faithfully would put a broken image in the navbar of every room with
        Benzinga on and no custom logo, which is exactly the `playing.gif` defect fixed further
        down this same file.

        The sidebar's answer was an icon-and-text fallback, because ITS capture has one to copy
        (const 52, `fas fa-newspaper`, plus the words "Benzinga News"). This one has no such branch
        to copy, and inventing one would be inventing evidence — so the item renders when the room
        supplies a logo and is absent otherwise. A room in that state still gets the sidebar item,
        so the feature is reachable either way. Restore the second copy by adding the asset.
      -->
      <!--
        ── RS-09 — THE TIP BUTTON IS RENDERED TWICE UPSTREAM, and we had one of them ──────────────

        ```js
        function APe(t,n){ … d(0,"li",139), x("click", () => doTipToUser()),
                             d(1,"a",140), T(2,"i",35), d(3,"span",36), v(4) …
                           xn("title", sessData.tipMeBtnTxt), Ze(sessData.tipMeBtnTxt) }
        O(14, e.isTipEnabled ? 14 : -1)          // byte 2,487,938, immediately before Benzinga
        139 [1,"nav-item",3,"click","title"]
        140 [1,"d-flex","align-items-center","btn","btn-primary","btn-sm"]
        ```

        `aPe` (byte 2,466,601) is the SIDEBAR's copy and this room has it; this is the navbar's, and
        `tip-button.ts` was written expecting both — its own docblock says *"the two call sites read
        `tip.visible`"* while only one existed. The label is bound to the `title` AND to the text,
        which is upstream's doubling on both copies.

        The `<li>` carries the click here where the sidebar's `<button>` does, so the whole item is
        the target rather than the button inside it. That is const 139's `3,"click"` and not a
        choice; `role`/`tabindex`/`onkeydown` are ours, for the reason every other captured
        click-on-a-non-control in this file carries them.
      -->
      {#if tip.visible}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <li
          class="nav-item"
          title={tip.label}
          onclick={() => window.open(tip.url, '_blank', 'noopener,noreferrer')}
        >
          <!-- svelte-ignore a11y_missing_attribute -->
          <a class="d-flex align-items-center btn btn-primary btn-sm">
            <i class="fas fa-dollar-sign"></i><span class="ms-1">{tip.label}</span>
          </a>
        </li>
      {/if}
      {#if benzinga.visible && benzinga.logoUrl}
        <li class="nav-item animated fadeIn benzinga-li">
          <a
            href={benzinga.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Benzinga News"
            class="nav-link"
          >
            <!--
              `.benzinga-logo` is `max-height: 25px !important` in the captured sheet
              (`css/complete-app-styles.css:7150`), so the height is CSS's. The attributes are here
              because `img-dimensions-contract.test.ts` requires every `<img>` to carry intrinsic
              dimensions or an aspect ratio, and a logo of unknown size with no reservation is a
              layout shift on every load.
            -->
            <img
              class="benzinga-logo animated fadeIn"
              src={benzinga.logoUrl}
              alt="Benzinga News"
              width="120"
              height="25"
            />
          </a>
        </li>
      {/if}
      {#if media.anyoneTalking && media.talking.length > 0}
        <li class="nav-item talkingIndicator animated fadeIn">
          <!-- svelte-ignore a11y_missing_attribute -->
          <a class="talking">
            <i class="icon fa fa-microphone"></i>
            &nbsp;
            <span class="talking-string">
              <!--
                G04 — `d(0,"span",147)` at byte 2,473,449, const 147 `[3,"click"]`: each name is a
                CONTROL, bound to `muteTalkingUserDialog(o)`. Ours was a bare `<span>`, so a
                presenter watching one member hold the floor had no way to take it back short of
                opening the roster and finding them — and `muteAllNonAdmins`, which is built, is
                all-or-nothing.

                The comma and the surrounding spaces are `ns(" ", i > 0 ? "," : "", " ", name, " ")`
                and were already right; only the handler was missing. `role`/`tabindex`/`onkeydown`
                are OURS, because the capture puts a click on a bare span and a span is neither
                focusable nor keyboard-reachable — the same addition, for the same reason, as the
                trade-order span in `MessageBody`.

                The gate is inside `muteTalkingUserDialog`, not here: upstream's whole method body
                is behind `globals.user.isPresenter`, so a member clicking a name gets no dialog
                rather than a dialog whose command is refused.
              -->
              {#each media.talking as talkingUser, index (talkingUser.userID)}
                <span
                  role="button"
                  tabindex="0"
                  onclick={() => onmutetalkinguser(talkingUser)}
                  onkeydown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    onmutetalkinguser(talkingUser);
                  }}
                >
                  {index > 0 ? ',' : ''}
                  {talkingUser.mediaValue.name}
                </span>
              {/each}
            </span>
            &nbsp;
            <!--
              ── G08 — THE IDLE WAVEFORM IS A MEASURED REFUSAL, not an omission ────────────────────

              The reference switches between two images here:

              ```js
              O(8, e.mediaService.presenterTalking ? 8 : 9)          // byte 2,473,901
              146  ["id","talkingLevelsImg","src","/assets/images/talking.gif",1,"talkingWaveform",…]
              148  ["id","nolevelsImg","src","/assets/images/notalking.png",1,"talkingWaveform",…]
              ```

              **`presenterTalking` is not a fact this room can know.** It is written by exactly two
              subscribers (byte 1,117,020) — `guiEventBus.subscribe("presenterTalking", …)` and its
              `presenterNotTalking` twin — and the only thing that emits them is the SERVER socket
              relaying `case "presenterTalking"` at byte 1,014,971. It is a live audio-activity
              signal computed somewhere we do not have, and it is NOT the same thing as the list
              beside it: "talking" in `talkingUsers` means A MICROPHONE IS OPEN, which
              `media-transport.svelte.ts` records at length, and there is no level detection
              anywhere in the reference either — its single `createAnalyser` is the AV-settings mic
              test, and `audioLevel`, `activeSpeaker` and `volumeChange` do not occur at all.

              So building the branch means one of two dishonest things: an image nothing can ever
              show, or one that always shows. Neither is the reference. The waveform stays, which is
              the state a room with an open microphone is actually in.

              **This is also what explains `notalking.png`.** The audit row noticed the asset ships
              here with no consumer and read that as strong evidence the branch was dropped. It is
              evidence of something narrower: the MARKUP was transcribed from a capture whose driving
              signal did not cross with it. The asset stays — it is a captured asset, and deleting it
              would be deciding this can never be built.

              WHAT WOULD UNBLOCK IT: our own server computing and pushing an activity signal on the
              room channel. At that point this is one `{#if}` and the second const above.
            -->
            <img
              id="talkingLevelsImg"
              src="/assets/images/talking.gif"
              class="talkingWaveform animated fadeIn ng-star-inserted"
              alt=""
              width="53"
              height="60"
            />
          </a>
        </li>
      {:else}
        <li class="nav-item talkingIndicator animated fadeIn">
          <!-- svelte-ignore a11y_missing_attribute -->
          <a>{noSpeakerText}</a>
        </li>
      {/if}
      <!--
          The room's recording badge, for EVERYONE - this reports state, it does not change
          it, so it is deliberately outside the presenter block below.

          Consts 92/93/94, and the gating from the update block:
            O(6, isRecording && !isRecordingPaused ? 6 : -1)   -> [ REC ]
            O(8, isRecordingPaused && isRecording ? 8 : -1)    -> [ REC PAUSED]
            recIndicatorStart                                  -> spinner + REC, while starting

          Driven by `media.roomRecording`, which the server pushes. It used to be gated on
          `media.recording` - this browser's own MediaRecorder - so it only ever appeared for the
          presenter doing the media.recording, and every member saw nothing.

          The tooltip is the one part that IS member-aware, and only to hide the file name:
            (sessData.dontShowRecInfoToUsers && !isPresenter) || !roomState.recName
              ? '' : 'Recording to: ' + decodedRecName()
        -->
      {#if media.roomRecordingPaused && media.roomRecording}
        <li class="nav-item recIndicator animated flash">
          <!-- svelte-ignore a11y_missing_attribute -->
          <a>[ REC PAUSED]</a>
        </li>
      {:else if media.roomRecording}
        <li class={['nav-item recIndicator animated fadeIn', { 'breathing-rec': blinkingRec }]}>
          <!-- svelte-ignore a11y_missing_attribute -->
          <a title={recordingTooltip}>[ REC ]</a>
        </li>
      {:else if media.roomRecordingStarting}
        <li class="nav-item recIndicatorStart">
          <!-- svelte-ignore a11y_missing_attribute -->
          <a class="nav-link"><i class="fas fa-spinner fa-spin"></i> REC </a>
        </li>
      {/if}
      <!--
          Broadcast controls - media.recording, SoundCloud, microphone, screen sharing, webcam and
          session control - drive what the room sends to everyone, so they are presenter-only.
          A reader keeps the Volume dropdown and Reload below, plus the talking and REC
          indicators above, which report state rather than change it.
        -->
      <!--
        NAV-02 — `o4e`, byte 2,478,748, gated `O(23, isPresenter || isNonPresenterAdmin ||
        !e.scPlaying ? -1 : 23)` at byte 2,488,684: the one SoundCloud control upstream renders for
        a VIEWER, and the only way a member has to stop room-wide music for themselves. Its gate is
        the exact negation of `SoundCloudMenu`'s, which is why the two are separate files.

        ## It sits OUTSIDE the presenter block, and that is the whole fix

        It was written inside it. A control whose gate is `not a presenter`, nested in a block that
        renders only FOR a presenter, is unreachable in both directions at once: no member ever saw
        it, and the only browser that evaluated its gate was the one it excludes. The defect it was
        built to fix — a member with no way to silence room-wide music — survived the fix.

        Placed BEFORE that block rather than after, and the row order is unaffected either way: for
        a member the presenter block renders nothing, so this is still slot 23's place in the row,
        and for a presenter this renders nothing. Argued as NAV-02 in
        `docs/decoded/room-surface-audit-2026-08-30.md`.
      -->
      {#if !isPresenter && media.soundCloudPlaying}
        <SoundCloudViewerStop {onstopsoundcloudforme} />
      {/if}
      {#if isPresenter}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <li
          title="Star/Stop Recording"
          class="nav-item dropdown"
          onclick={(event) => event.stopPropagation()}
        >
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <a
            id="dropdownRecording"
            data-bs-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded={menus.recording}
            class={[
              'nav-link dropdown-toggle d-flex align-items-center',
              { muted: !media.screenSharing }
            ]}
            onclick={() => ontoggletopmenu('recording')}
          >
            <i class="far fa-2x fa-dot-circle"></i>
            <span class="ml-2 mainNavItem">Start/Stop Recording</span>
          </a>
          {#if recordingReminderAllowed && media.recordingReminder && (!media.recording || media.recordingPaused)}
            <div class="recording-reminder">
              <span class="recording-reminder-arrow"></span>
              <span>You are not recording!</span>
              <button
                type="button"
                class="btn-close"
                onclick={() => (media.recordingReminder = false)}
                aria-label="Close"
              ></button>
            </div>
          {/if}
          <ul
            aria-labelledby="dropdownRecording"
            data-bs-popper={menus.recording ? 'static' : undefined}
            class={[
              'screen-options-start-screen dropdown-menu dropdown-menu-end',
              { show: menus.recording }
            ]}
            style={menus.recording ? 'display: block;' : undefined}
          >
            {#if !media.screenSharing}
              <li class="nav-item">Can't start recording without screenshare</li>
            {:else}
              {#if !media.recording}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <li onclick={onstartrecording}>
                  <!-- svelte-ignore a11y_missing_attribute -->
                  <a aria-hidden="true"><i class="far fa-dot-circle"></i> Start Recording </a>
                </li>
              {:else}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <li onclick={onstoprecording}>
                  <!-- svelte-ignore a11y_missing_attribute -->
                  <a aria-hidden="true"><i class="far fa-square"></i> STOP Recording </a>
                </li>
                {#if !media.recordingPaused}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                  <li onclick={onpauserecording}>
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <a aria-hidden="true"><i class="far fa-pause-circle"></i> PAUSE Recording </a>
                  </li>
                {:else}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                  <li onclick={onresumerecording}>
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <a aria-hidden="true"
                      ><i class="far fa-pause-circle-o"></i> RESUME Recording
                    </a>
                  </li>
                {/if}
              {/if}
              <!--
                  Outside the media.recording branch on purpose. `media.recordedUrl` is set by the
                  recorder's `stop` handler, which also clears `media.recording` - so while this
                  sat inside `{#if media.recording}` it appeared and vanished in the same tick and
                  could never be clicked.
                -->
              {#if media.recordedUrl}
                <li><hr class="dropdown-divider" /></li>
                <li class="nav-item">
                  <!-- svelte-ignore a11y_missing_attribute -->
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <a onclick={ondownloadrecording}>
                    <i class="fas fa-download"></i> Download Recording
                    {#if !media.recordedHasAudio}(no audio){/if}
                  </a>
                </li>
                <li class="nav-item">
                  <!-- svelte-ignore a11y_missing_attribute -->
                  <a
                    aria-hidden="true"
                    onclick={media.recPreviewOpen ? onhiderecpreview : onshowrecpreview}
                  >
                    <i class={media.recPreviewOpen ? 'fas fa-times-circle' : 'fas fa-circle'}></i>
                    {media.recPreviewOpen ? ' Hide Rec Preview ' : ' Show Rec Preview'}
                  </a>
                </li>
              {/if}
            {/if}
          </ul>
        </li>
        <SoundCloudMenu
          playing={media.soundCloudPlaying}
          menuOpen={menus.soundcloud}
          ontoggle={() => ontoggletopmenu('soundcloud')}
          {onpromptforsoundcloud}
          {onstopsoundcloud}
          {onstopsoundcloudforme}
        />
        {#if !media.micLaunching}
          <li title="Unmute/Mute Microphone" class="nav-item d-flex align-items-center">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <a
              id="unmuteMuteMicrophone"
              class={[
                'nav-link d-flex align-items-center',
                { muted: media.micMuted, 'text-white': !media.micMuted }
              ]}
              onclick={ontogglemicrophone}
            >
              <i class="fas fa-2x fa-microphone"></i>
              <span class="ml-2 mainNavItem">Unmute/Mute Microphone</span>
            </a>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <!-- svelte-ignore a11y_missing_attribute -->
            <a
              title="Audio Device Settings"
              class="nav-link mic-gear-btn p-0 m-0"
              onclick={() => onopensessioncontrol('av-device-selection')}
            >
              <i class="fas fa-cog"></i>
            </a>
          </li>
        {:else}
          <li class="nav-item">
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <!-- svelte-ignore a11y_missing_attribute -->
            <a><i class="fas fa-2x fa-spinner fa-spin"></i></a>
          </li>
        {/if}
        <ScreenShareMenu
          screenSharing={media.screenSharing}
          menuOpen={menus.screen}
          {shareScreenText}
          {virtualCamText}
          {stopSharingAllText}
          {streamingTabAvailable}
          {localScreens}
          ontoggle={() => ontoggletopmenu('screen')}
          {onpromptforscreenname}
          {onstopscreensharing}
          {onopenstreamingtab}
          {onreopenpreview}
          {onstoplocalscreen}
        />
        {#if !media.camLaunching && !hideWebcamForRoom}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <li title="Start / Stop WebCam" class="nav-item" onclick={ontogglewebcam}>
            <a
              id="startStopWebCam"
              class={[
                'nav-link d-flex align-items-center',
                { muted: media.camMuted, 'text-white': !media.camMuted }
              ]}
            >
              <i class="fas fa-2x fa-video"></i>
              <span class="ml-2 mainNavItem">Start / Stop WebCam</span>
            </a>
          </li>
        {:else}
          <li class="nav-item">
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <!-- svelte-ignore a11y_missing_attribute -->
            <a><i class="fas fa-2x fa-spinner fa-spin"></i></a>
          </li>
        {/if}
      {/if}
      <!--
        ── SC-14 — SESSION CONTROL IS NOT PLAIN `isPresenter` ──────────────────────────────────

        ```js
        O(29, !isPresenter && !user.hasMic || isLimitedPresenter ? -1 : 29)     // byte 2,489,576
        function f4e(t,n){ d(0,"li",192), x("click", () => doSessionControl()),
            d(1,"a",193), T(2,"i",194), d(3,"span",108), v(4,"Session Control") … }
        ```

        This item sat inside the presenter block with everything else, and it is the one entry there
        whose gate upstream is wider: rendered when `(isPresenter || user.hasMic)` AND NOT
        `isLimitedPresenter`. A member whose membership carries the mic permission gets it, and the
        modal answers them with the device picker alone (`ModalHost.svelte`'s `{:else if hasMic}`
        arm, SC-14/SC-17). Without this they could produce audio and had no way to choose which
        microphone it came from.

        `media.limitedPresenter` is the reference's own term and it is not redundant: `giveMicScreen`
        assigns `globals.user.isPresenter = globals.isLimitedPresenter = e.give`, so somebody handed
        mic and screen at runtime satisfies `isPresenter` — and upstream deliberately withholds this
        item from them. A temporary grant is not room administration.

        The three sibling items above (recording, microphone, screenshare) stay on plain
        `isPresenter`: those drive what the room SENDS to everybody, which is the reason recorded at
        the top of that block.
      -->
      {#if (isPresenter || hasMic) && !media.limitedPresenter}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <li
          title="Session Control"
          data-bs-toggle="modal"
          data-bs-target="#session-control-modal"
          class="nav-item"
          onclick={() => onopensessioncontrol()}
        >
          <!-- svelte-ignore a11y_missing_attribute -->
          <a class="nav-link d-flex align-items-center">
            <i class="fas fa-2x fa-cog"></i>
            <span class="ml-2 mainNavItem">Session Control</span>
          </a>
        </li>
      {/if}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <li class="nav-item dropdown dropstart" onclick={(event) => event.stopPropagation()}>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <a
          id="dropdownVolume"
          data-bs-toggle="dropdown"
          class="nav-link d-flex align-items-center"
          onclick={() => menus.toggle('volume')}
        >
          <!--
              Consts 105/106/107 of `app-room` — `['fas','fa-2x','fa-volume-up']`,
              `…fa-volume-down`, `…fa-volume-off` (`app-room.compiled.js:1694-1696`) — and
              the same three strict inequalities the overlay uses
              (`app-room.render-helpers.js:1424-1428`).

              The third one read `fa-volume-mute` here, which is in neither const table. One
              word, and it is the icon a muted listener looks at.
            -->
          {#if volume > 50}
            <i class="fas fa-2x fa-volume-up"></i>
          {:else if volume < 50 && volume > 4}
            <i class="fas fa-2x fa-volume-down"></i>
          {:else if volume < 4}
            <i class="fas fa-2x fa-volume-off"></i>
          {/if}
          <span class="ml-2 mainNavItem">Volume</span>
        </a>
        <div
          aria-labelledby="dropdownVolume"
          data-bs-popper={menus.volume ? 'static' : undefined}
          class={menus.volume ? 'dropdown-menu volumeControl show' : 'dropdown-menu volumeControl'}
          style={menus.volume ? 'display: block;' : undefined}
        >
          <h4>
            Volume
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <span
              data-bs-toggle="dropdown"
              class="float-right mr-2"
              onclick={() => menus.set('volume', false)}
            >
              <i class="fas fa-times"></i>
            </span>
          </h4>
          <input
            id="master-volume"
            name="masterVolume"
            audiovolslider=""
            type="range"
            min="0"
            max="100"
            title="Volume"
            class="mx-auto py-2 volCtrl"
            {@attach setRangeValue(volume)}
            oninput={(event) => {
              onsetmastervolume(Number((event.currentTarget as HTMLInputElement).value));
            }}
          />
          <br />
          <button
            title={volume > 0 ? 'Mute Audio' : 'Unmute Audio'}
            class="btn btn-primary btn-sm"
            onclick={ontogglemute}
          >
            {volume > 0 ? 'Mute' : 'Unmute'}
          </button>
          <hr />
          <!--
              TWO defects, both from `app-room.render-helpers.js:1005-1028` (`p4e`) and its
              gate at `:1434`.

              THE GATE was `media.soundCloudPlaying` alone. The reference is
              `O(48, e.scPlaying || e.mp3Playing || e.appService.globals.roomState.ytURL ? 48 : -1)`
              — three sources, of which this room already models all three: `media.soundCloudPlaying`,
              `mp3Playing` (set from the `playMP3ForAll` command) and `youtubeForAllUrl`
              (the room-wide YouTube overlay, this app's `roomState.ytURL`). So the slider was
              dead for two of the three things it controls: `onsetbackgroundvolume` reaches
              `#mp3player` and the YouTube overlay as well as SoundCloud, and neither could be
              turned down.

              THE CONTAINER is const 114, `[2, 'text-align', 'center']`
              (`app-room.compiled.js:1723`). A `2` marker is STYLES, not classes — so it is a
              `div` with `style="text-align: center"` and no class at all. `m-0` belongs to the
              `<p>` inside it (const 199, `[1,'m-0']`), which already has it.
            -->
          {#if media.soundCloudPlaying || mp3Playing || youtubeForAllUrl}
            <div style="text-align: center;">
              <hr />
              <p class="m-0">Background Music:</p>
              <input
                id="background-volume"
                name="backgroundVolume"
                type="range"
                min="0"
                max="100"
                title="Background Volume"
                class="px-0 py-2"
                {@attach setRangeValue(backgroundVolume)}
                oninput={(event) => {
                  onsetbackgroundvolume(Number((event.currentTarget as HTMLInputElement).value));
                }}
              />
            </div>
          {/if}
          <div class="dropdown-divider"></div>
          <div class="room-sound-options">
            <!--
                THE ROWS COME FIRST, and this dropdown did not have them.

                `app-room.render-helpers.js:1224-1225` puts `H(51, b4e, 3, 0, 'hr')` at the
                head of `div.room-sound-options` (const 116), gated on
                `media.talking && media.talking.length > 0` (`:1436`), and `b4e` is
                `ht(0, _4e, 7, 14, null, null, qAe), T(2, 'hr')` — the same per-presenter
                row the screen overlay renders, plus a trailing rule, and only THEN the six
                sound checkboxes below.

                Without them a member could mute the room but not one presenter, which is
                the entire point of the control. Shared with the overlay so the two cannot
                drift; the `hr` is this copy's, not the overlay's.
              -->
            <PresenterMuteRows
              talkingUsers={media.talking}
              preferences={presenterAudio}
              {individualVolumeControls}
              trailingRule
              ontogglepresenter={ontoggletalkingpresenteraudio}
              onpresentervolume={onadjustpresentervolume}
            />
            <div class="my-1">
              <input
                type="checkbox"
                name="alert-donot-disturb"
                value="Alert Do not disturb"
                id="alert-donot-disturb"
                title="Alert sound"
                class="form-check-input"
                {@attach setInputChecked(soundChecks['alert-donot-disturb'])}
                onchange={onupdatesoundcheck}
              />
              <label for="alert-donot-disturb" class="form-check-label">
                Alert sound
                <span>{soundChecks['alert-donot-disturb'] ? 'on' : 'off'}</span>
              </label>
            </div>
            <div class="my-1">
              <input
                type="checkbox"
                name="qa-donot-disturb"
                value="QA Do not disturb"
                id="qa-donot-disturb"
                title="QA sound"
                class="form-check-input"
                {@attach setInputChecked(soundChecks['qa-donot-disturb'])}
                onchange={onupdatesoundcheck}
              />
              <label for="qa-donot-disturb" class="form-check-label">
                QA sound <span>{soundChecks['qa-donot-disturb'] ? 'on' : 'off'}</span>
              </label>
            </div>
            <div class="my-1">
              <input
                type="checkbox"
                name="non-trade-donot-disturb"
                value="Non-trade alerts do not disturb"
                id="non-trade-donot-disturb"
                title="Non-trade alert sound"
                class="form-check-input"
                {@attach setInputChecked(soundChecks['non-trade-donot-disturb'])}
                onchange={onupdatesoundcheck}
              />
              <label for="non-trade-donot-disturb" class="form-check-label">
                NTA sound
                <span>{soundChecks['non-trade-donot-disturb'] ? 'on' : 'off'}</span>
              </label>
            </div>
            <div class="my-1">
              <input
                type="checkbox"
                name="chat-donot-disturb"
                value="Chat Do not disturb"
                id="chat-donot-disturb"
                title="Chat sound"
                class="form-check-input"
                {@attach setInputChecked(soundChecks['chat-donot-disturb'])}
                onchange={onupdatesoundcheck}
              />
              <label for="chat-donot-disturb" class="form-check-label">
                Chat sound <span>{soundChecks['chat-donot-disturb'] ? 'on' : 'off'}</span>
              </label>
            </div>
            <div class="my-1">
              <input
                type="checkbox"
                name="presentation-subtitles"
                value="Presentation Subtitles"
                id="presentation-subtitles"
                title="Show Speech Recognition Overlay"
                class="form-check-input"
                {@attach setInputChecked(soundChecks['presentation-subtitles'])}
                onchange={onupdatesoundcheck}
              />
              <label for="presentation-subtitles" class="form-check-label">
                <i class="fas fa-closed-captioning"></i> Subtitles
                <span>{soundChecks['presentation-subtitles'] ? 'on' : 'off'}</span>
              </label>
            </div>
            <div class="my-1">
              <input
                type="checkbox"
                name="app-donot-disturb"
                value="Do not disturb"
                id="app-donot-disturb"
                title="Don't Disturb"
                class="form-check-input"
                {@attach setInputChecked(doNotDisturbOn)}
                onchange={onupdatesoundcheck}
              />
              <label for="app-donot-disturb" class="form-check-label">
                <span>{doNotDisturbOn ? "DON'T DISTURB" : "Don't Disturb"}</span>
              </label>
            </div>
          </div>
        </div>
      </li>
      <!--
          `a4e` — `app-room.render-helpers.js:960-973`, gated at `:1417-1422`:
          `O(30, isPresenter && sessData.tawkPresenterSupport ? 30 : -1)`.

          Markup from the const table: 195 is
          `['title','TAWK Support',1,'nav-item',3,'click']`, 193 is
          `[1,'nav-link','d-flex','align-items-center']`, 196 is
          `[1,'fas','fa-2x','fa-question-circle']` and 108 is `[1,'ml-2','mainNavItem']`
          (`app-room.compiled.js:2050-2051, 2048, 1697`).

          `tawkAvailable` carries a THIRD term the reference does not have: a configured
          property id. See `#lib/tawk-support` — the reference's id is its own company's,
          and a room with none configured shows no control rather than a control that opens
          somebody else's support inbox.
        -->
      {#if tawkAvailable}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <li title="TAWK Support" class="nav-item" onclick={ontoggletawksupport}>
          <!-- svelte-ignore a11y_missing_attribute -->
          <a class="nav-link d-flex align-items-center">
            <i class="fas fa-2x fa-question-circle"></i>
            <span class="ml-2 mainNavItem">TAWK Support</span>
          </a>
        </li>
      {/if}
      <li title="Reload" class="nav-item">
        <!-- svelte-ignore a11y_missing_attribute -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <a class="nav-link d-flex align-items-center" onclick={onrequestreload}>
          <i class="fas fa-2x fa-sync"></i>
          <span class="ml-2 mainNavItem">Reload</span>
        </a>
      </li>
    </ul>
  </div>
</nav>
