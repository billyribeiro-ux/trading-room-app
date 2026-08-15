<script lang="ts">
  import type { RoomMedia, TalkingUser } from '$lib/room/media.svelte';
  import type { RoomMenus } from '$lib/room/menus.svelte';
  import type { RoomRoster, RosterMember } from '$lib/room/roster.svelte';
  import type { PresenterAudioPreferences } from '$lib/screen-volume';
  import PresenterMuteRows from '$lib/components/PresenterMuteRows.svelte';

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
    mobileAppAvailable: boolean;
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
  }

  let {
    isPresenter,
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
    onhiderecpreview
  }: Props = $props();
</script>

<nav class="navbar navbar-expand-md navbar-dark fixed-top mainAppNav" style="">
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span
    title={sidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
    class={sidebarOpen ? 'sidebar-menu active-icon' : 'sidebar-menu'}
    onclick={() => (sidebarOpen = !sidebarOpen)}
  >
    <i class={sidebarOpen ? 'fas fa-arrow-left' : 'fas fa-bars'}></i>
  </span>
  <!--
      `Ne(" ", globals.rosterCount + e.simUserCount, " ")`.

      This read `data.connectedUsers.length`, and the load returns `[connectedUser]` - one
      entry, always yourself. So the navbar said "1" in a room of any size, and never
      changed as people came and went. It is the same number as the sidebar badge and is
      now computed the same way.
    -->
  <span title="Users Connected" class="users ml-1 mr-1 d-flex align-items-center">
    <i class="fas fa-user"></i><span class="ml-1">{roster.connectedCount}</span>
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
      {#if media.anyoneTalking && media.talking.length > 0}
        <li class="nav-item talkingIndicator animated fadeIn">
          <!-- svelte-ignore a11y_missing_attribute -->
          <a class="talking">
            <i class="icon fa fa-microphone"></i>
            &nbsp;
            <span class="talking-string">
              {#each media.talking as talkingUser, index (talkingUser.userID)}
                <span>
                  {index > 0 ? ',' : ''}
                  {talkingUser.mediaValue.name}
                </span>
              {/each}
            </span>
            &nbsp;
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
          The room's media.recording badge, for EVERYONE - this reports state, it does not change
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
        <li class="nav-item recIndicator animated fadeIn">
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
            class="nav-link dropdown-toggle d-flex align-items-center"
            class:muted={!media.screenSharing}
            onclick={() => ontoggletopmenu('recording')}
          >
            <i class="far fa-2x fa-dot-circle"></i>
            <span class="ml-2 mainNavItem">Start/Stop Recording</span>
          </a>
          {#if recordingReminderAllowed && media.recordingReminder && (!media.recording || media.recordingPaused)}
            <div class="media.recording-reminder">
              <span class="media.recording-reminder-arrow"></span>
              <span>You are not media.recording!</span>
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
            class="screen-options-start-screen dropdown-menu dropdown-menu-end"
            class:show={menus.recording}
            style={menus.recording ? 'display: block;' : undefined}
          >
            {#if !media.screenSharing}
              <li class="nav-item">Can't start media.recording without screenshare</li>
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
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <li
          title="Play music from SoundCloud for all"
          class="nav-item dropdown"
          onclick={(event) => event.stopPropagation()}
        >
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <a
            id="soundcloudDropdown"
            data-bs-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded={menus.soundcloud}
            class="nav-link dropdown-toggle d-flex align-items-center"
            class:text-white={media.soundCloudPlaying}
            onclick={() => ontoggletopmenu('soundcloud')}
          >
            <i class="fab fa-2x fa-soundcloud"></i>
            <span class="ml-2">
              <span class="caret"></span>
              {#if media.soundCloudPlaying}
                <img src="/assets/images/playing.gif" alt="" style="max-height: 25px;" />
              {/if}
            </span>
          </a>
          <ul
            aria-labelledby="soundcloudDropdown"
            data-bs-popper={menus.soundcloud ? 'static' : undefined}
            class="dropdown-menu dropdown-menu-end soundcloud-options"
            class:show={menus.soundcloud}
            style={menus.soundcloud ? 'display: block;' : undefined}
          >
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <li class="nav-item" onclick={onpromptforsoundcloud}>
              <i class="fa fa-play-circle"></i> Play a track or playlist from SoundCloud
            </li>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <li class="nav-item" onclick={onstopsoundcloud}>
              <i class="fa fa-square"></i><i class="fa fa-users"></i> Stop Playing For All
            </li>
            <li class="divider"></li>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <li class="nav-item" onclick={onstopsoundcloudforme}>
              <i class="fa fa-square"></i> Stop Playing For Me
            </li>
          </ul>
        </li>
        {#if !media.micLaunching}
          <li title="Unmute/Mute Microphone" class="nav-item d-flex align-items-center">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <a
              id="unmuteMuteMicrophone"
              class="nav-link d-flex align-items-center"
              class:muted={media.micMuted}
              class:text-white={!media.micMuted}
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
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <li
          title="Start/Stop Screen Sharing"
          class="screen-sharing nav-item dropdown"
          onclick={(event) => event.stopPropagation()}
        >
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <a
            id="dropdownScreenSharing"
            data-bs-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded={menus.screen}
            class="nav-link dropdown-toggle d-flex align-items-center"
            class:muted={!media.screenSharing}
            class:text-white={media.screenSharing}
            onclick={() => ontoggletopmenu('screen')}
          >
            <i class="fas fa-2x fa-desktop"></i>
            <span class="ml-2 mainNavItem">Start/Stop Screen Sharing</span>
          </a>
          <ul
            aria-labelledby="dropdownScreenSharing"
            data-bs-popper={menus.screen ? 'static' : undefined}
            class="screen-options-start-screen dropdown-menu dropdown-menu-end"
            class:show={menus.screen}
            style={menus.screen ? 'display: block;' : undefined}
          >
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <li
              title="(Regular Bandwidth) ** RECOMMENDED"
              onclick={() => onpromptforscreenname('screen')}
            >
              <!-- svelte-ignore a11y_missing_attribute -->
              <a aria-hidden="true">{shareScreenText}</a>
            </li>
            <div class="dropdown-divider"></div>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <li title="OBS" onclick={() => onpromptforscreenname('camera')}>
              <!-- svelte-ignore a11y_missing_attribute -->
              <a aria-hidden="true">{virtualCamText}</a>
            </li>
            <!--
                `e4e` in the capture, verbatim - TWO dividers, then a bare `li > a` with no
                icon, bound to `mediaService.stopSharingAll()`:

                  T(0,"div",115)(1,"div",115),
                  d(2,"li")(3,"a",163), x("click", () => onstopsharingall()),
                  v(4," Stop Sharing All Screens"), u()()

                The nav item is labelled "Start/Stop Screen Sharing" but there was no stop
                anywhere in the menu; `onstopscreensharing()` existed and was only ever
                reachable through a remote `mutescreens` command from a presenter.
              -->
            {#if media.screenSharing}
              <div class="dropdown-divider"></div>
              <div class="dropdown-divider"></div>
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
              <li onclick={onstopscreensharing}>
                <!-- svelte-ignore a11y_missing_attribute -->
                <a aria-hidden="true">{stopSharingAllText}</a>
              </li>
            {/if}
          </ul>
        </li>
        {#if !media.camLaunching}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <li title="Start / Stop WebCam" class="nav-item" onclick={ontogglewebcam}>
            <a
              id="startStopWebCam"
              class="nav-link d-flex align-items-center"
              class:muted={media.camMuted}
              class:text-white={!media.camMuted}
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
          property id. See `$lib/tawk-support` — the reference's id is its own company's,
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
