<script lang="ts">
  import { deserialize } from '$app/forms';
  import { chooseRecordingOptions } from '$lib/recording-codec';
  import { page } from '$app/state';
  import { panelDragResize, readPanelBounds } from '$lib/panel-drag';
  import { invalidate, invalidateAll } from '$app/navigation';
  import { env } from '$env/dynamic/public';
  import { onMount, tick, untrack } from 'svelte';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import BootboxDialog from '$lib/components/BootboxDialog.svelte';
  import ScreenTabs, { type ScreenTab } from '$lib/components/ScreenTabs.svelte';
  import { ngbTooltip } from '$lib/ngb-tooltip';
  import SpeechRecoOverlay from '$lib/components/SpeechRecoOverlay.svelte';
  import { SignallingClient, legacyUserId, type ProducerInfo } from '$lib/media/signalling';
  import { MediaSession } from '$lib/media/session';
  import { startSpeechRecognition } from '$lib/media/speech-reco';
  import ScreenPane from '$lib/components/ScreenPane.svelte';
  import ScreenZoomControls from '$lib/components/ScreenZoomControls.svelte';
  import {
    INITIAL_ZOOM_LEVEL,
    NEUTRAL_PAN,
    captureVideoImage,
    zoomIn,
    zoomOut,
    type Pan
  } from '$lib/screen-zoom';
  import ScreenVolumeControl from '$lib/components/ScreenVolumeControl.svelte';
  import PresenterMuteRows from '$lib/components/PresenterMuteRows.svelte';
  import { DEAD_PREFERENCE_KEYS } from '$lib/dead-preference-keys';
  import {
    adjustVolumeForPresenter,
    toggleTalkingPresenter,
    type PresenterAudioPreferences,
    type TalkingPresenter as PresenterAudioUser
  } from '$lib/screen-volume';
  import {
    RANDOM_USER_MINIMUM,
    archivesAvailableTo,
    filterRosterToTrials,
    randomUserCandidates,
    rosterBlockVisible,
    rosterCountVisibleTo,
    rosterRowClass,
    rosterRowVisible,
    formatUserLocation,
    joinsMediaAsProducer,
    locationVisibleTo,
    searchRoster,
    sortRosterByNick
  } from '$lib/roster-gates';
  import { alertSoundButtonFor, filesSectionHidden } from '$lib/files-gates';
  import {
    MUTE_ALL_CONFIRM,
    MUTE_STAGGER_MS,
    nonAdminTalkingUsers
  } from '$lib/mute-all-non-admins';
  import { tawkAttributes, tawkScript, tawkSupportAvailable } from '$lib/tawk-support';
  import { NO_PENDING_CLICK, gutterRelease, togglePresentationSplit } from '$lib/split-gutter';
  import {
    pushToTalkShouldMute,
    pushToTalkShouldUnmute,
    shouldBlockContextMenu,
    shouldBlockCopyKey,
    shouldDisableSelection
  } from '$lib/room-key-gates';
  import EmojiPicker from '$lib/components/EmojiPicker.svelte';
  import GifConfirmDialog from '$lib/components/GifConfirmDialog.svelte';
  import GiphyPicker from '$lib/components/GiphyPicker.svelte';
  import ImageUploadDialog from '$lib/components/ImageUploadDialog.svelte';
  import ModalHost from '$lib/components/ModalHost.svelte';
  import NotesPane from '$lib/components/notes/NotesPane.svelte';
  import { resolveNoteSurfaceGates } from '$lib/components/notes/note-gates';
  import RoomMessage from '$lib/components/RoomMessage.svelte';
  import type { MessageBadge } from '$lib/types';
  import { isMentionOf } from '$lib/mention';
  import { trimChatLog } from '$lib/room-scroller';
  import ToastHost from '$lib/components/ToastHost.svelte';
  import VideoPlayer from '$lib/components/VideoPlayer.svelte';
  import YoutubePlayerOverlay from '$lib/components/YoutubePlayerOverlay.svelte';
  import { DEFAULT_ALERT_DELIVERY_PREFERENCES, resolveAlertDelivery } from '$lib/alert-delivery';
  import { DIRECT_EVIDENCE_CONTRACT } from '$lib/direct-evidence-contract';
  import { DUMP_CONTRACT } from '$lib/dump-contract';
  import {
    composePastedImageAlert,
    composeUploadedAlert,
    postOnXIntent,
    type PastedImageSubmission,
    type PostAlertSubmission
  } from '$lib/post-alert-behavior';
  import {
    isRoomScrollerReadingHistory,
    scrollRoomScrollerToBottom,
    shouldAutoScrollForMessage
  } from '$lib/room-scroller';
  import {
    canShowRosterPrivateChat,
    resolveRosterPrivateChatStart
  } from '$lib/roster-private-chat';
  import {
    initializeSoundEffects,
    playSoundEffect,
    setSoundEffectsVolume,
    unloadSoundEffects
  } from '$lib/sound-effects';
  import type { ToastNotice } from '$lib/toast';
  import type {
    AlertTab,
    ChatTab,
    FileTab,
    FollowChatStyle,
    MainTab,
    ManagedChatUser,
    MessageReactions,
    ModalName,
    ModalTargetUser,
    NoteVersion,
    RoomNote,
    SettingsTab,
    Theme
  } from '$lib/types';
  import type { PageProps } from './$types';

  /**
   * The ROOM's chat/alert style - `globals.chatStyle`, verbatim:
   *
   * ```js
   * this.chatStyle = {
   *   lightTheme:{color:"#1a1a1a",tickerColor:"#1a1a1a",usernameColor:"#365d7d",bgColor:"#e8e8e8",fontSize:"13"},
   *   darkTheme: {color:"#f7fd37",tickerColor:"#f7fd37",usernameColor:"#c0d8ed",bgColor:"#000",  fontSize:"13"}}
   * ```
   *
   * `this.alertStyle` is the same object, which is why an alert and a chat message share a
   * background in the capture.
   *
   * This is NOT the follow-a-user style - see {@link defaultFollowChatStyle}. One function used to
   * serve both, returning the FOLLOW default (`bgColor: #ffffff`, `fontSize: 14`, `playSound`), and
   * `RoomMessage` applies the global style inline to every chat message that has no colour of its
   * own. So every chat message carried `background-color: #ffffff` as an inline style - which beats
   * every stylesheet rule - and chat sat white while alerts sat on #e8e8e8.
   */
  function defaultChatStyleForTheme(theme: Theme): FollowChatStyle {
    return theme === 'light'
      ? {
          color: '#1a1a1a',
          tickerColor: '#1a1a1a',
          usernameColor: '#365d7d',
          bgColor: '#e8e8e8',
          fontSize: 13,
          playSound: true
        }
      : {
          color: '#f7fd37',
          tickerColor: '#f7fd37',
          usernameColor: '#c0d8ed',
          bgColor: '#000000',
          fontSize: 13,
          playSound: true
        };
  }


  function decodeSettingsJson(value: string | null | undefined) {
    try {
      const parsed: unknown = JSON.parse(value ?? '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  type RoomSplitDir = 'ltr' | 'ttb' | 'rtl' | 'btt';
  type MediaPermissionKind = 'microphone' | 'camera' | 'display-capture';
  type MediaCaptureKind = 'microphone' | 'camera' | 'screen';
  type TalkingUser = {
    userID: number;
    mediaValue: {
      name: string;
    };
  };
  type SessionControlTab =
    | 'reset-session'
    | 'close-session'
    | 'lock-session'
    | 'av-device-selection'
    | 'streaming-selection'
    | 'session-history'
    | 'webinar-tools';
  const noSpeakerText = ' ( No one is speaking )';
  const shareScreenText = 'Share Screen ';
  const virtualCamText = ' OBS / XSPLIT/ Share Virtual Cam';
  const stopSharingAllText = ' Stop Sharing All Screens';

  function isRoomSplitDir(value: unknown): value is RoomSplitDir {
    return value === 'ltr' || value === 'ttb' || value === 'rtl' || value === 'btt';
  }

  let { data }: PageProps = $props();

  let sidebarOpen = $state(false);
  let mobileNavOpen = $state(false);
  // `new-evidence/presenter-tab` captures the bar as rendered: `screens-tab` carries
  // `class="nav-link active"` with `aria-selected="true"`, and `notes-tab` carries
  // `class="nav-link presAreaTabs-notes"` with `aria-selected="false"`. The room opens on Screens.
  let mainTab: MainTab = $state('screens');
  /** Mirrors the capture's `isMediaConnected`. */
  let isMediaConnected = $state(false);

  /**
   * Screens currently being shared, one tab each.
   *
   * A presenter can share several at once - the captured client keeps them in a Map
   * (`this.screenProducers=new Map`) and the captured tab bar rendered three tabs all belonging to
   * one presenter - so this is a flat list of screens, NOT a list of presenters. The label is
   * `{name}-{screenName}`, where `screenName` is free text the sharer typed (`FUTURES`,
   * `MAIN / SPX`), never generated.
   *
   * Empty until the media session is wired in: nothing in this app produces or consumes screen
   * media yet, so inventing entries here would put fabricated presenters on screen.
   */
  let sharedScreens = $state<ScreenTab[]>([]);
  /**
   * The live MediaStream behind each screen tab, keyed by producer id.
   *
   * Kept beside `sharedScreens` rather than inside it because a tab is a label and a stream is a
   * resource: the tab can render the moment `newProducer` arrives, while `consume()` is still in
   * flight, and the pane simply has no picture until the stream lands. Merging them would mean
   * either a tab that appears late or a `ScreenTab` carrying a nullable MediaStream.
   */
  const screenStreams = new SvelteMap<string, MediaStream>();
  /**
   * The live MediaStream behind each REMOTE webcam card, keyed by producer id.
   *
   * Separate from {@link screenStreams} because the two are different surfaces: a screen becomes a
   * tab in the presentation area, a camera becomes a floating `app-presenter-cams` card.
   */
  const webcamStreams = new SvelteMap<string, MediaStream>();
  /**
   * The live media session, hoisted out of onMount so the screen-share button can produce into it.
   * Null until the socket is up; every call guards on it rather than assuming.
   */
  let mediaSession: MediaSession | null = null;
  /** This peer's own screen producer, so stopping the share can close it. */
  /**
   * The most recent local screen producer. Kept for the single-screen callers (`applyScreenLayers`
   * skipping our own producer) that only need "one of ours".
   */
  let localScreenProducerId: string | null = null;

  /**
   * Every screen THIS presenter is currently sharing, producer id -> its capture stream.
   *
   * The mirror of the capture's `this.screenProducers = new Map` (byte 1072217). A plain Map, not
   * a SvelteMap: nothing renders from it - the tab bar renders from `sharedScreens`, which comes
   * back from the SFU - so making it reactive would buy a dependency and no redraw.
   */
  const localScreenStreams = new Map<string, MediaStream>();
  /**
   * Resolves once `MediaSession.load()` has completed.
   *
   * `newProducer` can arrive before the `connected` handler has finished loading the Device - the
   * server pushes it the moment another peer produces, which may be the same tick we joined. Every
   * consume path awaits this instead of racing it; without it the tab appeared with no picture and
   * the only symptom was `load() must resolve before this is available` in the console.
   */
  let sessionReady: Promise<void> | null = null;
  let selectedScreenTab = $state<string | null>(null);
  /** The screen every viewer is taken to; renders the eye badge on that tab. */
  let forcedScreenId = $state<string | null>(null);
  let lockedScreenId = $state<string | null>(null);
  /**
   * Live connected count, from `/sess/{id}/roster/`.
   *
   * `handleRosterCmd` sets `globals.rosterCount = parseInt(i.data)` and the header badge renders
   * it. Seeded from the server-rendered roster so the badge is right before the first event
   * arrives, then kept current by the channel - previously it only ever showed the value baked in
   * at page load, so a member joining or leaving never changed it for anyone else.
   */
  /** Whether the SSE channel is up. The sidebar's "Chat" line reports it. */
  /**
   * `archivesAvailableTo()`, transcribed:
   *
   * ```js
   * return isPresenter && !isLimitedPresenter
   *   ? !(sessData.showArchivesToSpecificPresenters &&
   *       !sessData.showArchivesToSpecificPresenters.includes(user.email))
   *   : !(!sessData.showArchivesToUsers || user.denyArchivesAccess);
   * ```
   *
   * A full presenter gets archives unless an explicit allowlist exists and leaves them out;
   * everyone else needs the session to have opened archives to users AND not be individually
   * denied. Ours showed Archives to everybody unconditionally.
   */
  let roomEventsConnected = $state(false);
  /**
   * The "Conected" flash and its one-shot guard — `app-room.full.js:2035-2041`.
   *
   * `hasConnectedBefore` is a plain `let`, not `$state`: nothing renders from it, it only decides
   * whether an `open` is a RE-connect, and making it reactive would buy a dependency and no redraw.
   * `reconnectedFlash` is `$state` because the overlay's `display` follows it.
   *
   * The reference's misspelling — "Conected" — is in the markup and stays there.
   */
  let hasConnectedBefore = false;
  let reconnectedFlash = $state(false);
  /** `setTimeout(…, 3e3)`. */
  const RECONNECTED_FLASH_MS = 3000;
  let rosterCount = $state<number | null>(null);
  /**
   * `globals.roster` - who is actually in the room, pushed by the hub.
   *
   * The page load can only ever describe THIS connection (`connectedUsers: [connectedUser]`), so
   * the list is seeded from it and then replaced by the first `getRoster` frame. Until this
   * existed, the badge counted every subscriber while the list rendered one hard-coded entry - a
   * presenter saw "Users: 2" over a list containing only themselves.
   */
  // Typed off the load's own entry rather than re-listed, so the stream and the page load cannot
  // drift into two different shapes for the same person.
  type RosterEntry = (typeof data.connectedUsers)[number];
  let liveRoster = $state<RosterEntry[]>([]);
  const rosterUsers = $derived(liveRoster.length > 0 ? liveRoster : data.connectedUsers);

  /**
   * The roster header's four controls, every one of which was rendered and inert.
   *
   * `isSortUsers` / `isSortFTUsers` are the two pipe arguments the capture applies to the list -
   * `roster | sortUsers:isSortUsers | sortFTUsers:isSortFTUsers` - and `showUserSearch` /
   * `userSearchTermTxt` drive the search input that `O(22, showUserSearch ? 22 : -1)` reveals.
   */
  let isSortUsers = $state(false);
  let isSortFTUsers = $state(false);
  let showUserSearch = $state(false);
  let userSearchTermTxt = $state('');
  /**
   * `visibleRoster` as a SNAPSHOT, which is what the capture holds.
   *
   * `searchUsers()` assigns `visibleRoster = globals.roster.filter(...)` once; the filtered list
   * then stays put until `clearUserSearch()` or the next `getRoster` frame resets it. Deriving it
   * live instead would silently re-run the filter as people join and leave, which reads as results
   * appearing under the cursor. Null means no search is active.
   */
  let searchedRoster = $state<RosterEntry[] | null>(null);
  const visibleRoster = $derived(searchedRoster ?? rosterUsers);

  /**
   * The two pipes, transcribed:
   *
   * ```js
   * sortUsers:   transform(e,i){ return i ? e.sort((o,s) => o.isP ? o : s.isP ? s : (o.nick.toLowerCase() > s.nick.toLowerCase() ? 1 : -1)) : e }
   * sortFTUsers: transform(e,i){ return i ? e.filter(s => s.isFT).sort((s,r) => s.nick.toLowerCase() > r.nick.toLowerCase() ? 1 : -1) : e }
   * ```
   *
   * Two faithful-to-a-fault details worth naming. The first comparator returns an OBJECT when
   * either side is a presenter; `Array.prototype.sort` coerces a non-number to NaN and treats it as
   * 0, so a presenter compares equal to everyone and only non-presenters actually sort by nick.
   * That is the observable behaviour, so it is what `0` reproduces here - not a tidied-up version
   * that would reorder presenters the capture leaves alone.
   *
   * The second is that both pipes call `.sort()` on the array they were handed, mutating
   * `globals.roster` in place. Doing that to a `$state` array would make the sort toggle rewrite
   * the roster itself, so each pipe copies first.
   */
  const displayRoster = $derived(
    filterRosterToTrials(sortRosterByNick(visibleRoster, isSortUsers), isSortFTUsers)
  );

  /** `sortUsers(){ this.isSortUsers = !this.isSortUsers; emit("sortUsers", …) }` */
  function sortUsers() {
    isSortUsers = !isSortUsers;
  }

  /** `sortFTUsers(){ this.isSortFTUsers = !this.isSortFTUsers; emit("sortFTUsers", …) }` */
  function sortFTUsers() {
    isSortFTUsers = !isSortFTUsers;
  }

  /**
   * `toggleUserSearch(){ this.showUserSearch = !this.showUserSearch;
   *   this.showUserSearch && setTimeout(() => document.getElementById("userSearchTermInput").focus(), 300) }`
   *
   * The 300ms is the input's reveal; focusing before it exists does nothing. An attachment on the
   * input focuses it when it is actually in the DOM, which is the same intent without the timer.
   */
  function toggleUserSearch() {
    showUserSearch = !showUserSearch;
  }

  function focusUserSearch(node: HTMLInputElement) {
    node.focus();
  }

  /**
   * `searchUsers(){ let e = this.userSearchTermTxt.toLocaleLowerCase();
   *   this.visibleRoster = globals.roster.filter(i => i.nick.toLowerCase().indexOf(e) >= 0
   *                                              || i.emailHash && i.emailHash === this.appService.hashEmail(e)) }`
   *
   * The second clause hashes the search term because the capture's roster entries carry only
   * `emailHash`, never the address. Ours carry `email`, so an exact address match is compared
   * directly - same observable result, and no md5 in the browser to get there.
   */
  function searchUsers() {
    searchedRoster = searchRoster(rosterUsers, userSearchTermTxt);
  }

  /** `clearUserSearch(){ this.visibleRoster = globals.roster }` */
  function clearUserSearch() {
    searchedRoster = null;
  }

  /** `doUserSearch(e){ 13 == e.keyCode && (this.userSearchTermTxt ? this.searchUsers() : this.clearUserSearch()) }` */
  function doUserSearch(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    if (userSearchTermTxt) searchUsers();
    else clearUserSearch();
  }

  /**
   * Screen zoom, lifted here from `ScreenPane` because that is where the capture keeps it.
   *
   * `app-presentationarea` - the component this page reproduces - declares `this.showZoomCtrl = !1`
   * in its constructor and owns all five handlers
   * (`docs/source/components/app-presentationarea.compiled.js:12,480-499`). Its buttons live in the
   * tab bar's `li.nav-item.ms-auto` slot and drive every screen through a broadcast event bus, so
   * the state cannot sit inside one pane. `src/lib/screen-zoom.ts` carries the transcription and
   * the reasoning for what is global and what is per screen.
   */
  /**
   * `isFullScreenshare` - `fullScreenshare() { this.isFullScreenshare = !this.isFullScreenshare }`.
   *
   * The screens pane takes `is-fullscreenshare` from it via
   * `UCe = (t, n) => ({'show active': t, 'is-fullscreenshare': n})`, which the captured sheet
   * makes `position: fixed; 100vw/100vh; z-index: 1030`.
   */
  let isFullScreenshare = $state(false);
  let showZoomCtrl = $state(false);
  let zoomLevel = $state(INITIAL_ZOOM_LEVEL);
  /** Per screen, because the drag is: `panZoomIn` is broadcast, a pointer drag is not. */
  const screenPans = new SvelteMap<string, Pan>();

  function panZoomIn() {
    zoomLevel = zoomIn(zoomLevel);
  }

  function panZoomOut() {
    zoomLevel = zoomOut(zoomLevel);
  }

  /**
   * `panZoomAPI.resetView()` on every subscribed view - back to the neutral level AND the
   * untranslated origin, for all screens rather than the selected one.
   */
  function panZoomReset() {
    zoomLevel = INITIAL_ZOOM_LEVEL;
    screenPans.clear();
  }

  /**
   * The capture resets on EVERY toggle, not only when leaving zoom mode. The subscriber runs
   * `this.showZoomCtrl = i; this.togglePanZoom()` and the view's own `togglePanZoom()` body is
   * exactly `this.panZoomReset()`
   * (`docs/source/components/app-screenshare-view.compiled.js:45-46,73-75`).
   */
  function togglePanZoom() {
    showZoomCtrl = !showZoomCtrl;
    panZoomReset();
  }

  /**
   * Every screen this peer has popped out, producer id -> window. The capture's `screenPopputs`.
   */
  const screenPopouts = new Map<string, Window>();

  /**
   * Is THIS window a detached screen popout?
   *
   * The capture's own test, from app-screenshare-view's ngOnInit:
   *
   *   const o = new URLSearchParams(window.location.search);
   *   this.isDetachedCtrl = o.has("dscreen") && o.has("presID");
   *
   * Both keys, not either: `dscreen` alone says "a popout" and `presID` says which screen, and a
   * window with only one of them has nothing to render.
   */
  /**
   * `co=1` - chat-only mode. The capture reads it as `const F = s.get("co")` into
   * `globals.chatOnlyMode`, and a detached chat window runs in it so the popout shows the alerts
   * and chat instead of a second copy of the whole room.
   */
  const chatOnlyMode = $derived(page.url.searchParams.get('co') === '1');

  /** `hideChatAlerts` / `reopenAlertsChatBtn` - set while the pair lives in another window. */
  let chatAlertsDetached = $state(false);

  const detachedScreenId = $derived.by(() => {
    const params = page.url.searchParams;
    if (!params.has('dscreen') || !params.has('presID')) return null;
    return params.get('presID');
  });

  /**
   * "Detach Screen to a new window", transcribed from the capture's popout service:
   *
   * ```js
   * openPopoutModal(e, i) {
   *   "screen" == e && (i.id = globals.sessionID, i.presID = i.pres._id);
   *   const o = Object.keys(i).map(a => "pres" == a ? "" : enc(a) + "=" + enc(i[a])).join("&");
   *   const s = window.open(`/?dscreen=1&${o}`, "_blank",
   *     "toolbar=no,location=no,directories=no,status=no,menubar=no,titlebar=no,fullscreen=no,width=1280,height=1024");
   *   this.screenPopputs[i.pres._id] = { windowInstance: s, type: e, pres: i.pres };
   *   s.onbeforeunload = () => appEventBus.emit("reatachScreenShare", i.pres._id)
   * }
   * ```
   *
   * This used to open `/screen/<id>` at 1280x720 - a route that does not exist in this app, so
   * detaching a screen opened a window that redirected straight to the login page. The real
   * contract is the ROOM itself with `?dscreen=1`, which is also how the popout recognises itself:
   * the captured component reads `isDetachedCtrl = params.has("dscreen") && params.has("presID")`.
   */
  function detachScreen(screenId: string) {
    const screen = sharedScreens.find((entry) => entry.id === screenId);
    if (!screen) return;

    const existing = screenPopouts.get(screenId);
    if (existing && !existing.closed) {
      existing.focus();
      return;
    }

    const query = new URLSearchParams({
      dscreen: '1',
      id: data.sessionHandle,
      presID: screenId
    });
    const popout = window.open(
      `/?${query}`,
      '_blank',
      'toolbar=no,location=no,directories=no,status=no,menubar=no,titlebar=no,fullscreen=no,width=1280,height=1024'
    );
    if (!popout) {
      // Blocked by the popup blocker. Saying so beats a menu item that silently does nothing.
      bootboxAlert =
        'Your browser blocked the detached screen window. Allow popups for this site and try again.';
      return;
    }
    screenPopouts.set(screenId, popout);

    // `s.onbeforeunload = () => appEventBus.emit("reatachScreenShare", i.pres._id)` - closing the
    // window puts the screen back in the room rather than leaving it detached and invisible.
    popout.addEventListener('beforeunload', () => {
      screenPopouts.delete(screenId);
      selectScreenTabOfId(screenId);
    });
  }

  /**
   * `postMessage({cmd:"screeenStopped", presID})` then drop it - the capture's own spelling.
   *
   * A popout showing a screen whose producer has gone would otherwise sit on a frozen last frame
   * with no way to know the share ended.
   */
  function closeScreenPopout(screenId: string) {
    const popout = screenPopouts.get(screenId);
    if (!popout) return;
    screenPopouts.delete(screenId);
    if (popout.closed) return;
    try {
      popout.postMessage({ cmd: 'screeenStopped', presID: screenId }, window.location.origin);
    } catch {
      // A window already navigating away cannot be messaged; closing it below is enough.
    }
    popout.close();
  }

  /**
   * A tab the USER clicked, as opposed to `selectScreenTabOfId`, which is every programmatic path.
   *
   * That split is the reference's `i` parameter made structural: `onScreenShareTabChange(e, i = !0)`
   * broadcasts only when `i`, and callers pass false when the change came from a command. Keeping
   * two functions instead of a boolean means a new programmatic caller cannot accidentally opt into
   * broadcasting by forgetting an argument.
   */
  function selectScreenTabByUser(screenId: string) {
    selectedScreenTab = screenId;
    if (isPresenter && makeUsersFollowMyScreens) bringEveryoneToScreen(screenId);
  }

  function toggleLockScreen(screenId: string) {
    lockedScreenId = lockedScreenId === screenId ? null : screenId;
  }

  function bringEveryoneToScreen(screenId: string) {
    /*
      `bringFocusToScreen(e) { e && this.appService.sendServerAdminCommand("focusOnScreen", {id: e}) }`.
      This used to move only the presenter, with a comment saying the broadcast "needs the media
      signalling channel, which is not wired yet". It does not need that channel: the reference
      sends a SERVER command, and the room already carries server commands on the `cmds` channel —
      the same one `remotePresCommand` uses.

      The local move stays and happens FIRST, so the presenter's own view responds to their click
      without waiting for a round trip. The server re-checks that the caller is a presenter and
      scopes the broadcast to their room, so authority is decided there rather than here.
    */
    forcedScreenId = screenId;
    selectedScreenTab = screenId;
    if (!isPresenter) return;
    const body = new FormData();
    body.set('screenId', screenId);
    void fetch('?/focusOnScreen', { method: 'POST', body });
  }

  function stopSharedScreen(screenId: string) {
    // One of our own screens: stop it for real - close the producer and release the capture - so
    // the room loses it too. Dropping only the tab would leave the presenter believing they had
    // stopped sharing while every viewer kept watching.
    if (localScreenStreams.has(screenId)) {
      stopLocalScreen(screenId);
      return;
    }
    // Somebody else's. Stopping their producer is not ours to do, so this only drops the tab and
    // is deliberately not pretending the remote share ended.
    sharedScreens = sharedScreens.filter((entry) => entry.id !== screenId);
    if (selectedScreenTab === screenId) selectedScreenTab = sharedScreens[0]?.id ?? null;
    if (forcedScreenId === screenId) forcedScreenId = null;
    if (lockedScreenId === screenId) lockedScreenId = null;
  }
  let fileTab: FileTab = $state('files');
  /**
   * "Hide Files Section?" — `filesSectionHidden` in `$lib/files-gates`, tested there.
   *
   * `hidden` on BOTH the main-tab `li` and the `#files` pane, which is what the reference binds
   * (`z('hidden', o.hideFiles)` at full.js:5375 and 5410-5413). Derived rather than copied into
   * `$state` so a controller change picked up by the five-second `invalidate('room:data')` takes
   * effect without a reload.
   */
  const filesHidden = $derived(filesSectionHidden(data.sessData ?? {}));
  let chatTab: ChatTab = $state('main');
  // The page data is the intentional one-time seed for client-managed theme state.
  // svelte-ignore state_referenced_locally
  let theme: Theme = $state(data.settings?.theme === 'dark' ? 'dark' : 'light');
  // The server settings are the intentional one-time seed for editable client preference state.
  // svelte-ignore state_referenced_locally
  const loadedSettings = decodeSettingsJson(data.settings?.settingsJson);
  /**
   * `globals.videoDeviceID` - the camera chosen in AV settings, which both camera paths pass as
   * `deviceId: {ideal: ...}`. The modal already saves it (`onPreferenceChange('videoDeviceID', ...)`);
   * nothing read it back, so the choice was written and then ignored.
   *
   * `ideal`, never `exact`: a camera that has been unplugged since it was chosen must fall back to
   * another one rather than reject the whole call.
   */
  const selectedVideoDeviceId = $derived(
    typeof loadedSettings.videoDeviceID === 'string' && loadedSettings.videoDeviceID
      ? loadedSettings.videoDeviceID
      : undefined
  );
  // The deployed client seeds this global flag from the per-session preferences object.
  // Its direct DND controls toggle the flag without calling setPreference.
  let doNotDisturbOn = $state(
    typeof loadedSettings.doNotDisturbOn === 'boolean'
      ? loadedSettings.doNotDisturbOn
      : DEFAULT_ALERT_DELIVERY_PREFERENCES.doNotDisturbOn
  );
  let alertSoundOn = $state(
    typeof loadedSettings.alertSoundOn === 'boolean'
      ? loadedSettings.alertSoundOn
      : DEFAULT_ALERT_DELIVERY_PREFERENCES.alertSoundOn
  );
  let nonTradeSound = $state(
    typeof loadedSettings.nonTradeSound === 'boolean'
      ? loadedSettings.nonTradeSound
      : DEFAULT_ALERT_DELIVERY_PREFERENCES.nonTradeSound
  );
  /**
   * `preferences.recordingStartSound` / `recordingStopSound` - whether this listener hears the room
   * start and stop recording. Both default ON: the capture's checks are
   * `!doNotDisturbOn && preferences.recordingStartSound && ...`, so an unset preference would
   * silence a cue the room is meant to give everyone.
   */
  /**
   * The four per-viewer halves of the join/leave gates (`app-room.full.js:2137-2153`).
   *
   * Default ON, for the same reason `recordingStartSound` does: the reference's checks are
   * `sessData.X && preferences.Y && …`, so an unset preference would silence a cue the ROOM has
   * been configured to give. The room setting is the off switch; the preference is the override.
   */
  let popupOnUserJoin = $state(loadedSettings.popupOnUserJoin !== false);
  let popupOnUserLeave = $state(loadedSettings.popupOnUserLeave !== false);
  let beepOnUserJoin = $state(loadedSettings.beepOnUserJoin !== false);
  let beepOnUserLeave = $state(loadedSettings.beepOnUserLeave !== false);
  /**
   * `preferences.alwaysScrollToBottom` — the chat's "always scroll to bottom" override.
   *
   * `=== true`, not `!== false`, and the difference is the reference's own default: the preferences
   * blob ships `alwaysScrollToBottom:!1` (`main.d6d3c112b59b7d0d.js` byte 979602). Seeding it ON for
   * anyone who has never touched the checkbox would drag a reader out of the history they are
   * scrolled up into — the opposite of the mistake made with `showSpeechRecoOverlay`, where
   * `=== true` wrongly disabled a feature that defaults ON. The default decides which comparison is
   * correct; neither is a house style.
   *
   * PERSISTED, unlike `saveData`: `chatAlwaysScrollToBottomChange` calls
   * `setPreference('alwaysScrollToBottom', …)` (byte 2246247).
   */
  /**
   * `preferences.makeUsersFollowMyScreens` — when this presenter changes screen tab, take the room
   * with them.
   *
   * `i && globals.isPresenter && preferences.makeUsersFollowMyScreens && this.bringFocusToScreen(…)`
   * at the end of `onScreenShareTabChange` (`main.d6d3c112b59b7d0d.js` byte 1967413). `i` defaults
   * true and is passed false for programmatic changes, which is the loop guard: receiving a focus
   * command must not send one back.
   *
   * `=== true` — the blob ships `makeUsersFollowMyScreens:!1` (byte 980006). A presenter who has
   * never touched it should not be dragging the room around by clicking their own tabs.
   */
  /**
   * `preferences.chatGif` — whether inline gifs play or show a click-to-reveal placeholder.
   *
   * `!== false`, because the blob ships `chatGif:!0`. A viewer who has never touched the checkbox
   * gets gifs, which is what the reference does; `=== true` would mute them for everybody.
   */
  /**
   * `sessData.presenterMsgsOnTheRight` — a ROOM setting, not a viewer preference.
   *
   * `RoomMessage.svelte` has carried both consumers since it was written and neither was ever fed:
   * `messageBodyClass` adds `presenter-msg-right`, and the reaction row takes
   * `presenter-reactions-right`. Owner-configurable at
   * `page.manageSession.html:1108`.
   *
   * It is also the FIRST term of the reference's chat-badge gate —
   * `preferences.chatBadges && !sessData.presenterMsgsOnTheRight && sessData.enableBadges && …` —
   * so with it on, badges are suppressed regardless of the other three. That coupling is upstream's
   * and is reproduced by `visibleBadges`.
   */
  const presenterMessagesOnTheRight = $derived(data.sessData?.presenterMsgsOnTheRight === true);

  /**
   * The other three terms of the reference's chat-badge gate:
   *
   * ```js
   * preferences.chatBadges && !sessData.presenterMsgsOnTheRight && sessData.enableBadges &&
   *   msg.b && msg.b.length && (!sessData.showBadgesToPresentersOnly || globals.isPresenter)
   * ```
   *
   * `enableBadges` is the owner's master switch and is `=== true`: a room that has never been
   * configured shows no badges, which is what an absent setting means everywhere else in this
   * payload — the controller omits unset values rather than sending null.
   *
   * `showBadgesToPresentersOnly` narrows them to presenters. `disableStarYears` gates the
   * membership-star, whose `item.membershipYears` still has no supply, so it is passed for the
   * component's own gate and is expected to change nothing until that lands — recorded rather than
   * left to look like an oversight.
   */
  const enableBadges = $derived(data.sessData?.enableBadges === true);
  const showBadgesToPresentersOnly = $derived(data.sessData?.showBadgesToPresentersOnly === true);
  const disableStarYears = $derived(data.sessData?.disableStarYears === true);

  /**
   * A sender's badges, resolved the way `app-st-message.full.js` byte 28120 resolves them.
   *
   * ```js
   * for (let o = 0; o < this.msg.b.length; o++) {
   *   let r = sessData.badgesH[this.msg.b[o]];
   *   r && r.darkTheme && 'darkTheme' === preferences.theme && (r = sessData.badgesH[r.darkTheme]);
   *   r && (this.badges += r.imgURL ? '<img …>' : '<span class="badge …">' + r.text + '</span>');
   * }
   * ```
   *
   * Three things carried across exactly:
   *
   * * **The dark-theme swap is a LOOKUP, not a flag.** `r.darkTheme` holds the id of a variant
   *   badge and the whole definition is replaced with it. This is the render-site proof of T5-27,
   *   which had been established from the manage page alone.
   * * **An id with no definition renders nothing.** `r &&` — a badge deleted from the account while
   *   still assigned to a member is skipped, not drawn as a blank chip.
   * * **A missing variant falls back to the original.** `badgesH[r.darkTheme]` can itself be
   *   undefined if the variant was deleted; upstream would then render nothing, so the `?? badge`
   *   here is a deliberate divergence — losing a badge because its DARK variant was deleted is a
   *   worse outcome than showing the light one.
   *
   * Returns `[]` rather than undefined so `RoomMessage`'s own gate chain does the deciding; this
   * function answers "which badges", never "should badges show".
   */
  function badgesForSender(emailHash: string | null | undefined): MessageBadge[] {
    if (!emailHash) return [];
    const ids = data.badges?.byEmailHash?.[emailHash];
    if (!ids?.length) return [];
    const definitions = data.badges?.definitions ?? {};
    const resolved: MessageBadge[] = [];
    for (const id of ids) {
      const badge = definitions[String(id)];
      if (!badge) continue;
      const variant =
        theme === 'dark' && typeof badge.darkTheme === 'number'
          ? (definitions[String(badge.darkTheme)] ?? badge)
          : badge;
      resolved.push({
        text: variant.text,
        color: variant.color,
        backgroundColor: variant.backgroundColor,
        imageUrl: variant.imageUrl
      });
    }
    return resolved;
  }
  /**
   * `preferences.chatBadges` — the VIEWER's half of the badge gate, distinct from the owner's
   * `enableBadges`. Ships `!0`, so `!== false`.
   */
  /**
   * `preferences.chatPopup` — a toast and a browser notification when somebody mentions you.
   *
   * `!doNotDisturbOn && chatPopup` upstream, sitting beside the sound in the same block:
   * `doNotDisturbOn || (chatSoundOn && pling.play(), chatPopup && (alertService.info(…), new
   * Notification(…)))` (`main.d6d3c112b59b7d0d.js` byte 1431308). The sound half has been here since
   * the SSE handler was written; this is the other half.
   *
   * `!== false`, because the blob ships it on with its siblings and a viewer who has never opened
   * the settings modal should be told when they are addressed by name.
   */
  /**
   * `preferences.trimChatLogs` — "Reduce chat log memory", the settings modal's own label.
   *
   * `!== false`: the blob ships it ON, and it is the safer default in a room this one cannot bound
   * — see the note on `visibleChatMessages`. Upstream trims one message per arrival; ours caps the
   * derived view, which reaches the same steady state and also bounds the DOM.
   */
  let trimChatLogs = $state(loadedSettings.trimChatLogs !== false);
  let chatPopup = $state(loadedSettings.chatPopup !== false);

  /**
   * The id of the last chat message already considered for a popup — an OPAQUE key, never a number.
   *
   * `id-opacity-contract.test.ts` caught the first version of this doing `Math.max(highest,
   * item.id)`, and it was right to: the room-to-API cutover swaps SQLite's numeric ids for uuids,
   * and that is a server-side change ONLY while no client does arithmetic on one. `Math.max` over a
   * uuid is not a type error, it is `NaN` at runtime. So the marker is compared with `===` and
   * everything else is done by POSITION in the server's own ordering.
   *
   * `undefined` means "nothing considered yet". Not `$state`: nothing renders from it, and making
   * it reactive would invalidate the effect that writes it.
   */
  let lastPopupChatId: (typeof data.messages)[number]['id'] | undefined;
  let popupSeeded = false;
  let chatBadges = $state(loadedSettings.chatBadges !== false);
  let chatGif = $state(loadedSettings.chatGif !== false);
  let makeUsersFollowMyScreens = $state(loadedSettings.makeUsersFollowMyScreens === true);
  let alwaysScrollToBottom = $state(loadedSettings.alwaysScrollToBottom === true);
  let recordingStartSound = $state(loadedSettings.recordingStartSound !== false);
  let recordingStopSound = $state(loadedSettings.recordingStopSound !== false);

  /**
   * `preferences.disableVideo` - the viewer's own "turn the video off to preserve data" switch.
   *
   * The CHECKBOX has been in the settings modal since it was built (`ModalHost.svelte:2652`,
   * `id="app-disable-video"`). Nothing read it. `settingChecks['app-disable-video']` is written at
   * `ModalHost.svelte:1172` and was read only by its own label two lines below itself, which made
   * it a control whose only effect was changing its own words - the thing this repository
   * forbids. This state is the missing consumer.
   *
   * Upstream the flag swaps the ENTIRE screens pane for one line of text.
   * `app-presentationarea.render-helpers.js:496-499` - `TSe` renders `eSe` when the flag is set
   * and `wSe` otherwise, and `wSe` is the "No one is presenting right now..." h3, `ul#screenTabs`
   * and `div#screensTabsContent` together. The message is `eSe` at `:126-128`:
   * `<h3 class="text-center mt-4">Video off to preserve data...</h3>`, its class being const 23 at
   * `app-presentationarea.full.js:3907`.
   *
   * INVERTED relative to the checkbox, which is checked when video is ENABLED: the reference binds
   * `checked: !preferences.disableVideo` (`app-user-settings-modal.full.js:3070`) and labels it
   * "Enabled" / "Disabled" (`XEe` / `JEe`, `:293-298`). The modal's own default is
   * `'app-disable-video': true`, so both halves start at "video on" without being wired together.
   *
   * NOT restored from a saved preference, and that is deliberate rather than an omission.
   * `disableVideoChange()` (`app-user-settings-modal.full.js:1223-1226`) is the ONE handler in that
   * neighbourhood that does not call `appService.setPreference` - `beepOnUserLeaveChange`,
   * `popupOnUserLeaveChange` and `smallImagePreviewOnChange` (`:1197-1221`) all do. Upstream the
   * switch lasts for the session and a reload comes back with video on. Matching that is also the
   * kinder default: a member who turned the screens off on a phone last month should not open the
   * room today to an empty pane and no idea why.
   */
  let videoDisabled = $state(false);

  /**
   * The ROOM's recording state - `globals.roomState.isRecording` / `isRecordingPaused` / `recName`.
   *
   * Distinct from `recording`, which is this browser's own `MediaRecorder`. The `[ REC ]` badge is
   * a report about the room, so it must follow what the server says; gating it on the local flag is
   * why a member never saw it.
   */
  /** `isRecordingStarting` - the spinner state between asking to record and the room confirming. */
  let isRecordingStarting = $state(false);
  let roomIsRecording = $state(false);
  let roomRecordingPaused = $state(false);
  let roomRecName = $state('');

  /**
   * `'Recording to: ' + decodedRecName()`, suppressed for non-presenters when the session says so.
   *
   * `dontShowRecInfoToUsers` is not captured in our session data, so it is read defensively and
   * treated as off when absent - the capture's default is to SHOW the name.
   */
  const recordingTooltip = $derived.by(() => {
    const hideFromUsers = loadedSettings.dontShowRecInfoToUsers === true;
    if ((hideFromUsers && !isPresenter) || !roomRecName) return '';
    return `Recording to: ${decodeURIComponent(roomRecName)}`;
  });

  let alertPopup = $state(
    typeof loadedSettings.alertPopup === 'boolean'
      ? loadedSettings.alertPopup
      : DEFAULT_ALERT_DELIVERY_PREFERENCES.alertPopup
  );
  let longerAlertPopup = $state(
    typeof loadedSettings.longerAlertPopup === 'boolean'
      ? loadedSettings.longerAlertPopup
      : DEFAULT_ALERT_DELIVERY_PREFERENCES.longerAlertPopup
  );
  let qaSoundOn = $state(
    typeof loadedSettings.qaSoundOn === 'boolean' ? loadedSettings.qaSoundOn : true
  );
  let chatSoundOn = $state(
    typeof loadedSettings.chatSoundOn === 'boolean' ? loadedSettings.chatSoundOn : true
  );
  const loadedChatStyle =
    loadedSettings.chatStyle &&
    typeof loadedSettings.chatStyle === 'object' &&
    !Array.isArray(loadedSettings.chatStyle)
      ? (loadedSettings.chatStyle as Partial<FollowChatStyle>)
      : {};
  const loadedRoomSplitDir = isRoomSplitDir(loadedSettings.roomSplitDir)
    ? loadedSettings.roomSplitDir
    : 'ltr';
  const initialSplitSizes = resolveSplitSizes(loadedRoomSplitDir, settingsSplitPair);
  // svelte-ignore state_referenced_locally
  let globalChatStyle = $state<FollowChatStyle>({
    ...defaultChatStyleForTheme(theme),
    ...loadedChatStyle
  });
  // The persisted room layout is the intentional one-time seed for the interactive split state.
  let roomSplitDir = $state<RoomSplitDir>(loadedRoomSplitDir);
  let modal: ModalName = $state(null);
  let pollOpenMode = $state<'setup' | 'auto'>('setup');
  let pollMinimized = $state(false);
  let pollRestoreToken = $state(0);
  let deliveredPollId = $state<number | null>(null);
  let settingsTab: SettingsTab = $state('app');
  let alertTab: AlertTab = $state('text');
  let sessionControlInitialTab = $state<SessionControlTab>('reset-session');
  // The captured alerts toolbar (alert-section/datach-alerts-1) is a strip between the alerts
  // header and the scroller. It is absent from the default capture (alert-section/1.html states
  // "No alertsToolbar search strip in this snapshot"), so it is toggled, not permanent.
  let alertsToolbarOpen = $state(false);
  /**
   * The toolbar has TWO states, not one. `app-alerts` carries a second flag and two separate
   * toggles (`docs/source/components/app-alerts.compiled.js:16-17,134-150`), and its template
   * gates three regions on the second one
   * (`docs/source/components/app-alerts.render-helpers.js:160-196`):
   *
   *   div.alertsToolbar                      <- showAlertsToolbar
   *     div.d-flex…justify-content-between   <- showAlertsToolbarExtended   (checkbox, Detach, buttons)
   *     form#alert-settings                  <- always
   *       input + span#addon-chat-clear      <- always
   *       span#addon-chat-save + archive     <- showAlertsToolbarExtended
   *
   * So the magnifier opens a search-only strip and the gear opens the full one. This room had a
   * single flag, so the magnifier opened everything and the gear opened the alert-filter modal
   * instead of expanding the toolbar.
   */
  let alertsToolbarExtended = $state(false);
  let inlineAlertEntry = $state(false);
  let alertSearch = $state('');
  let alertsDetachedWindow: Window | null = null;
  let volumeOpen = $state(false);
  let recordingMenuOpen = $state(false);
  let soundCloudMenuOpen = $state(false);
  let screenShareMenuOpen = $state(false);
  let rosterSortOpen = $state(false);
  let archivesMenuOpen = $state(false);
  let notesMenuOpen = $state(false);
  let newNoteOpen = $state(false);
  let filesMenuOpen = $state(false);
  let userMenuId = $state<number | null>(null);
  let messageMenuId = $state<string | null>(null);
  let evidenceMessageState = $state<
    Record<
      string,
      {
        hidden?: boolean;
        answered?: boolean;
        body?: string;
        reactions?: MessageReactions;
      }
    >
  >({});
  let selectedUserId = $state<number | null>(null);
  let selectedMessageUser = $state<ModalTargetUser | null>(null);
  let selectedMessage = $state<MessageActionItem | null>(null);
  let selectedImageUrl = $state<string | null>(null);
  let bootboxConfirmation = $state<{
    message: string;
    onconfirm: () => void;
    /**
     * The FALSE branch. `bootbox.confirm(msg, cb)` calls back with `false` for No and for a
     * dismissal, and not every call site treats that as "do nothing" - `getRandomUser()` picks
     * from everyone when the answer is No.
     */
    ondismiss?: () => void;
    className?: string;
  } | null>(null);
  let bootboxAlert = $state<string | null>(null);
  let bootboxPrompt = $state<{
    title: string;
    value: string;
    onconfirm: (value: string) => void;
  } | null>(null);
  let toasts = $state<ToastNotice[]>([]);
  let toastSequence = 0;
  const toastTimers = new Map<number, ReturnType<typeof globalThis.setTimeout>>();
  let tweetWindow: Window | null = null;
  let privateChatOpen = $state(false);
  // The private-chat gear is a toolbar toggle, not a dropdown: `<li class="nav-item dropdown"
  // (click)="togglePMToolbar()">`, with the toolbar rendered as a sibling of the nav inside
  // `.bs-component` and gated on `O(14, o.showPMToolbar ? 14 : -1)`.
  let showPMToolbar = $state(false);
  let pmSearchTerm = $state('');
  /**
   * `app-privchat`'s state, in the capture's own shapes.
   *
   * `privChatLog` is keyed by PEER id, never by message direction - the capture buckets an incoming
   * frame with `isMine = te.uid == myUserID` then `privChatLog[isMine ? te.recvdID : te.uid]`, so
   * both halves of a conversation land in one array.
   *
   * `msgs` is whichever array the open tab points at. `chatTabs` is the strip, most-recently-active
   * last, because `newMessage()` splices a tab out and pushes it to the end.
   */
  type PrivateChatMessage = {
    _id: string;
    t: number;
    n: string;
    txt: string;
    uid: number;
    recvdID: number;
    avt: string;
    pic: string;
    isA: boolean;
  };
  type PrivateChatTab = {
    name: string;
    uid: number;
    avt: string;
    pic: string;
    unread: number;
    isA: boolean;
    online: boolean;
  };

  let privChatLog = $state<Record<number, PrivateChatMessage[]>>({});
  /**
   * The tab strip: the server's conversation list MERGED with what has happened since.
   *
   * Deliberately not a writable `$derived` overridden by hand. Overriding a derived is documented
   * as temporary - it survives only until a dependency changes - and `data` changes on every
   * `invalidateAll()`, which silently reset every unread count back to zero. Measured: an SSE
   * frame arrived correctly and the badge still read 0.
   *
   * So the local deltas live in their own state and the strip is a pure function of both. Nothing
   * to reset, and a conversation started this session appears without waiting for a refetch.
   */
  let unreadByPeer = $state<Record<number, number>>({});
  let lastActivityByPeer = $state<Record<number, number>>({});
  // An array, not a Record. `Object.entries` stringifies its keys, so reading a peer id back out
  // means `Number(uid)` - and this project forbids arithmetic on an id, because the room-to-API
  // cutover turns them into uuids (`docs/CUTOVER-ROOM-TO-API.md` §1, pinned by
  // `id-opacity-contract.test.ts`). Keeping the id inside the object never coerces it.
  let peerProfiles = $state<PrivateChatTab[]>([]);

  const chatTabs: PrivateChatTab[] = $derived.by(() => {
    const byId = new Map<number, PrivateChatTab>();
    for (const tab of data.privateChats ?? []) {
      byId.set(tab.uid, {
        name: tab.name,
        uid: tab.uid,
        avt: tab.avt,
        pic: tab.pic,
        unread: 0,
        isA: tab.isA,
        online: false
      });
    }
    // Conversations that started after this page loaded.
    for (const profile of peerProfiles) {
      if (!byId.has(profile.uid)) byId.set(profile.uid, profile);
    }
    return [...byId.values()]
      .map((tab) => ({ ...tab, unread: unreadByPeer[tab.uid] ?? 0 }))
      // `newMessage()` splices a tab out and pushes it, so the most recent sits last.
      .sort((a, b) => (lastActivityByPeer[a.uid] ?? 0) - (lastActivityByPeer[b.uid] ?? 0));
  });
  /** `this.currUser` - the peer id whose thread is on screen, `''` when none. */
  let currUser = $state<number | null>(null);
  let pmSearching = $state(false);
  let privateChatDraft = $state('');
  const privateChatLog = $derived(currUser === null ? [] : (privChatLog[currUser] ?? []));
  let previewWindowsVisible = $state(true);
  let emojiOpen = $state(false);
  let giphyOpen = $state(false);
  let showMessageOptions = $state(false);
  let sendingGif = $state(false);
  let pendingGifUrl = $state<string | null>(null);
  let youtubeForAllUrl = $state('');
  let composer = $state('');
  let fileSearch = $state('');
  // The sort bar is the one part of the Files pane with no counterpart in the pinned capture -
  // `st-fileSortBar`, `st-fileSortName`, `st-fileSortDate`, `fa-sort` and `fa-sort-amount-up` are
  // absent from main.d6d3c112b59b7d0d.js, from complete-app-styles.css and from the rendered Files
  // dump, so the deployment we hold predates it. These class names come from the owner's own
  // markup rather than from the bundle.
  let fileSortKey = $state<'name' | 'date'>('name');
  // Each button keeps its own direction, which is why the capture's inactive Date button still
  // says "Sorted newest to oldest". Name defaults A-to-Z and Date defaults newest-first, matching
  // the rendered titles in the owner's markup.
  let nameAscending = $state(true);
  let dateNewestFirst = $state(true);
  // The row checkboxes that feed "Delete Selected"; `#filesDriveList input:checked` in the capture.
  let selectedFileIds = $state<Set<number>>(new Set());
  let volume = $state(100);
  let previousVolume = $state(100);
  let muted = $state(false);
  let backgroundVolume = $state(70);
  /**
   * `appService.globals.viewerOnlyMode` — the `vo` query parameter, and the ONLY gate on the screen
   * overlay's volume trigger (`ScreenVolumeControl.svelte`).
   *
   * Read the same way `chatOnlyMode` above reads `co` and `detachedScreenId` reads `dscreen`: this
   * app's query parameters are its own, and the reference's parser assigns all three out of one
   * block. `?vo=2` additionally sets `viewerOnlyModeLimited` upstream; nothing in this room reads
   * that yet, so it is deliberately not modelled here rather than added as state with no consumer.
   *
   * PROVENANCE, stated because it is the one fact in this change that was not re-read this session:
   * the `vo` -> `viewerOnlyMode` mapping comes from `HANDOFF.md`, which quotes it from the minified
   * bundle at ~2595500. It is NOT in `docs/source/components/**` — that tree decodes the 51
   * COMPONENTS, and the query-parameter block belongs to the app service. What IS re-read and cited
   * is every consumer: `app-presentationarea.compiled.js:92`, `app-room.compiled.js:76,856`, and
   * the two `ngClass` helpers `jCe`/`VCe` in `app-presentationarea.render-helpers.js:9-10`.
   */
  const viewerOnlyMode = $derived(
    page.url.searchParams.get('vo') === '1' || page.url.searchParams.get('vo') === '2'
  );
  /**
   * `sessData.individualVolumeControls` — "Individual Volume Controls?", the room setting that
   * reveals the per-presenter slider inside the overlay's `room-sound-options`
   * (`bSe`'s `O(6, …sessData.individualVolumeControls ? 6 : -1)`).
   *
   * It exists in the controller's schema (`room-settings-schema.ts`, "Individual volume controls
   * for each Presenter") and had to be added to `ROOM_VISIBLE_SETTINGS` to reach this room; that
   * change and its consumer land together.
   */
  const individualVolumeControls = $derived(data.sessData?.individualVolumeControls === true);
  /**
   * `hideChatAlerts` — ONE flag with five writers upstream, and the single gate on the whole
   * chat/alerts column: `O(1, e.hideChatAlerts ? -1 : 1)` (`app-room.render-helpers.js:1650`),
   * plus the extra chat column beside it at `:1652-1660`.
   *
   * The five writers, all in `ngOnInit` except the last (`app-room.full.js`):
   *
   *   :1893      `this.hideChatAlerts = sessData.hideChatAlerts`        — the room setting
   *   :1894-1896 `isPlayer && isPresenter` forces it true
   *   :1898-1900 `videoOnlyMode && (hideChatAlerts = !recordChat && videoOnlyMode)`
   *   :1901-1902 `viewerOnlyMode && (hideChatAlerts = viewerOnlyMode)`
   *   :2179-2181 the `detachChat` event sets it true, with `reopenAlertsChatBtn`
   *
   * THREE of the five are modelled here. The two that are not are honest gaps, not oversights:
   *
   * - `isPlayer` has ZERO occurrences in this room. Upstream it is a client global for a stream
   *   PLAYBACK mode — the only other thing that reads it raises "The stream has ended. You can
   *   close this page now." on `streamPlayerEnded` (`full.js:2162-2165`). This room has no such
   *   mode, so there is nothing to read.
   * - `videoOnlyMode` is the `r` query parameter, the recording-bot mode — the same gap
   *   `files-gates.ts` already records for `hideFiles`. `recordChat` is deliberately not on the
   *   wire either, because it appears ONLY inside that writer and would arrive with no reader.
   *
   * This replaces two unrelated mechanisms that each carried one writer: a hardcoded branch on
   * `viewerOnlyMode` and a separate `chatAlertsDetached` branch. They were the same decision
   * rendered twice, which is why the room setting an owner ticks did nothing at all.
   */
  const hideChatAlerts = $derived(
    data.sessData?.hideChatAlerts === true || viewerOnlyMode || chatAlertsDetached
  );
  /**
   * `hidePresentation` — `(chatOnlyMode || sessData.isChatOnlyRoom)` sets it, gating the
   * presentation column at `O(3, e.hidePresentation ? -1 : 3)`
   * (`app-room.render-helpers.js:1662`); the assignment is `app-room.full.js:1903-1904`.
   *
   * Both terms are modelled: `co=1` is one reader popping the chat into its own window, and
   * `isChatOnlyRoom` is the owner declaring the room has no presentation area for anybody. Before
   * this, `?co=1` rendered a presentation area the reference removes — a detached chat window
   * carrying a second copy of the screens.
   */
  const hidePresentation = $derived(chatOnlyMode || data.sessData?.isChatOnlyRoom === true);
  /**
   * `preferences.audioMutedFor` and `preferences.audioVolumeFor` — per-presenter audio, persisted.
   *
   * `$state.raw`, not `$state`: every transition in `$lib/screen-volume` REPLACES both maps, so a
   * deep proxy would cost a proxy per key and buy nothing.
   *
   * Seeded from the same stored settings every other preference here is seeded from. The reference
   * persists exactly these two keys, through `setPreference('audioMutedFor', …)` and
   * `setPreference('audioVolumeFor', …)`, on every toggle and every drag.
   */
  // The stored settings are the intentional one-time seed for editable client preference state.
  // svelte-ignore state_referenced_locally
  let presenterAudio = $state.raw<PresenterAudioPreferences>({
    audioMutedFor: readPresenterMuteMap(loadedSettings.audioMutedFor),
    audioVolumeFor: readPresenterVolumeMap(loadedSettings.audioVolumeFor)
  });

  /**
   * `audioMutedFor` as it comes back from storage.
   *
   * Deliberately strict about the SHAPE rather than coercing: the stored value is a map of
   * `{name}` objects, and an entry that is not one is dropped instead of being turned into a
   * truthy placeholder that would mute a presenter nobody muted.
   */
  function readPresenterMuteMap(stored: unknown): Record<number, { name: string }> {
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
    const map: Record<number, { name: string }> = {};
    for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
      const userID = Number(key);
      if (!Number.isFinite(userID)) continue;
      if (value && typeof value === 'object' && typeof (value as { name?: unknown }).name === 'string') {
        map[userID] = { name: (value as { name: string }).name };
      }
    }
    return map;
  }

  /** `audioVolumeFor` as it comes back from storage — strings and numbers both, see `screen-volume.ts`. */
  function readPresenterVolumeMap(stored: unknown): Record<number, string | number> {
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
    const map: Record<number, string | number> = {};
    for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
      const userID = Number(key);
      if (!Number.isFinite(userID)) continue;
      if (typeof value === 'string' || typeof value === 'number') map[userID] = value;
    }
    return map;
  }
  /**
   * This viewer's caption-overlay preference — `preferences.showSpeechRecoOverlay`.
   *
   * `$state(false)` before, seeded from nothing, and that was the whole bug: the navbar's
   * `presentation-subtitles` checkbox seeds and renders from
   * `soundChecks['presentation-subtitles']`, persists through `savePreference`, and **never touched
   * this**. Two comments in this file asserted it was "already wired". It was not — the only
   * writers were `toggleMute`, `setMasterVolume` and the overlay's own close button. So the
   * checkbox read "on" by default while the overlay was off, and ticking it did nothing at all.
   *
   * `!== false` reproduces the reference's gate exactly:
   * `isSpeechRecoOverlayEnabled() { const e = …preferences.showSpeechRecoOverlay; return null == e
   * || !!e }` (`app-presentationarea.full.js:2409-2412`) — absent, null and true all enable it, and
   * only an explicit `false` turns it off. The same expression already seeds the checkbox at the
   * `soundChecks` declaration below, which is where that reasoning was first written down; it
   * simply never reached the state the overlay reads.
   *
   * Defaulting ON is safe rather than noisy, because the overlay carries its OWN second gate:
   * `SpeechRecoOverlay.svelte:86` renders nothing at all unless there is a current caption or a
   * non-empty history. Two gates, both of which must be open — which is what the comment at the
   * render site already claimed.
   */
  let subtitles = $state(loadedSettings.showSpeechRecoOverlay !== false);
  /**
   * Closed captions.
   *
   * `subtitles` above is the navbar's `presentation-subtitles` checkbox, already wired to the
   * `showSpeechRecoOverlay` preference. These are the overlay's own state: the line being spoken,
   * the transcript, and `speechRecoHistoryMode`.
   *
   * `currentCaption` stays null until a recognition source exists. The capture drives it from the
   * Web Speech API on the presenter's machine and relays results to viewers; neither half is wired
   * here, and inventing captions would put words in a presenter's mouth.
   */
  let currentCaption = $state<{ timestamp: number; sender: string; text: string; live?: boolean } | null>(
    null
  );
  let captionHistory = $state<{ timestamp: number; sender: string; text: string; live?: boolean }[]>(
    []
  );
  let speechRecoHistoryMode = $state(false);
  /**
   * How many finalised lines the transcript keeps.
   *
   * Unbounded, a long session would grow this array until the tab suffers - captions arrive at up
   * to two lines a second per speaker. The overlay only shows what fits its 60vh scroll area.
   */
  const CAPTION_HISTORY_LIMIT = 500;
  /** Stops recognition; null when this peer is not captioning. */
  let stopSpeechReco: (() => void) | null = null;
  /**
   * The session-level "Speech Recognition for Closed Captions:" switch, distinct from the
   * per-viewer `subtitles` overlay toggle. Defaults on, matching the captured preference
   * (`doSpeechReco:!0`, byte 979439).
   */
  let doSpeechReco = $state(
    typeof loadedSettings.doSpeechReco === 'boolean' ? loadedSettings.doSpeechReco : true
  );
  /** The live socket, so the caption sender can issue commands without reaching into MediaSession. */
  let mediaSignalling: SignallingClient | null = null;
  /**
   * Tears the media session down and builds a new one — the capture's `disconnectAll()` plus
   * re-init, for `giveMicScreen` (`TODO.md` gap 22).
   *
   * A closure assigned in `onMount` rather than a top-level function, because building a session
   * needs the signalling client and the ICE getter that live in that scope. Duplicating the
   * construction here is how the two copies drift.
   */
  let restartMediaSession: (() => Promise<void>) | null = null;
  /**
   * The ICE servers THIS deployment minted, hoisted out of `onMount` so the connectivity test can
   * see them (`TODO.md` item N).
   *
   * They were a `let` inside `onMount`, reachable only by the media session. The consequence was a
   * diagnostic that tested somebody else's infrastructure: the modal fell back to Google's public
   * STUN, so a green tick said nothing about whether `media.tradingroom.app` is reachable, and a red
   * one blamed the user's firewall for a server we do not run.
   *
   * `$state.raw` rather than `$state`: the array is REPLACED on every grant, never mutated, so deep
   * proxying would cost something and buy nothing.
   *
   * Empty until the first grant is minted, which happens when the socket opens. The modal treats
   * empty as "not connected yet" and says so rather than pretending.
   */
  let mediaIceServers = $state.raw<RTCIceServer[]>([]);
  let micMuted = $state(true);
  let micLaunching = $state(false);
  let talkingUsers = $state<TalkingUser[]>([]);
  /**
   * producer id -> the peer that audio producer belongs to.
   *
   * "Talking" in the capture means A MICROPHONE IS OPEN, not that anyone is making noise: the room
   * socket pushes `case "startTalking"` / `case "stopTalking"` carrying a `muser` (bundle byte
   * 1014120), and the client only ever SENDS those on `presUnmuted` / `presMuted` (byte 1141591).
   * There is no level detection anywhere in it - the bundle's single `createAnalyser` is the
   * AV-settings mic-test waveform, and `audioLevel`, `activeSpeaker` and `volumeChange` do not
   * occur at all.
   *
   * That second socket does not exist here, so the same fact is taken from the one that does: an
   * audio producer appearing means a mic opened, `producerPaused`/`producerResumed` mean it was
   * muted and unmuted, and `producerClosed` means it went away. `services/media/src/server.rs:1428`
   * says this is exactly what those announcements are for - "if the SFU that just paused the
   * producer does not say so, nothing does".
   */
  const audioProducerOwners = new Map<string, { userID: number; name: string }>();
  /**
   * Whether anyone in the room currently has their microphone open.
   *
   * Derived, not stored. It used to be a `$state` flag flipped only inside a listener for a
   * `window` event named `'presenterTalking'` that nothing in this codebase ever dispatched, so it
   * was permanently false - `{#if presenterTalking && talkingUsers.length > 0}` could never be
   * true, and " ( No one is speaking )" stayed on screen even with the microphone on.
   *
   * "Talking" here means unmuted, not making sound. That is what the capture sends:
   *
   *   guiEventBus.subscribe("presUnmuted", e => sendServerAdminCommand("startTalking", {…}))
   *   guiEventBus.subscribe("presMuted",   e => sendServerAdminCommand("stopTalking",  {…}))
   *
   * so the roster changes on mute and unmute, and the indicator holds for as long as a microphone
   * is open. Pausing between sentences must not flip it back to " ( No one is speaking )".
   */
  const presenterTalking = $derived(talkingUsers.length > 0);
  let webcamMuted = $state(true);
  let camLaunching = $state(false);
  let screenSharing = $state(false);
  let recording = $state(false);
  let recordingPaused = $state(false);
  let recordingReminder = $state(false);
  // `this.recPreviewOpen = !1` in the capture's globals. Ours defaulted to true, so the menu
  // opened saying "Hide Rec Preview" with nothing shown.
  let recPreviewOpen = $state(false);
  /** The separate window the preview lives in - the capture's `reopenRecPreviewWindow` target. */
  let recPreviewWindow: Window | null = null;
  let soundCloudUrl = $state('');
  let soundCloudPlaying = $state(false);
  let microphoneStream: MediaStream | null = null;
  /**
   * Reactive, unlike the other capture streams, because a `<video>` has to follow it.
   *
   * As a plain `let` this held a live camera track that nothing could observe: `toggleWebcam`
   * acquired it and enabled it, so the browser lit the in-use indicator, and the preview stayed
   * black because no attachment re-ran and no element ever received it. Both halves had to change
   * - see {@link attachLocalWebcam}.
   */
  let webcamStream = $state<MediaStream | null>(null);
  /**
   * The capture's `camProducer`. Its presence is what `toggleCam()` branches on, and `stopCam()`
   * is a no-op without it - `stopCam() { if (this.camProducer) { … } }`.
   */
  let localWebcamProducerId: string | null = null;
  /**
   * The capture's `micProducer`. Muting PAUSES it rather than closing it - `muteMic()` calls
   * `micProducer.pause()` and emits `pauseProducer`, while only `disableMic()` closes it and stops
   * the track. Keeping the producer across a mute is what lets unmuting resume without a new
   * transport negotiation.
   */
  let localMicProducerId: string | null = null;
  /**
   * Every remote peer's microphone, keyed by producer id.
   *
   * Audio needs an element to come out of. Nothing in this room consumed audio at all: both
   * `info.kind` guards were `!== 'video'`, so a remote microphone was discarded on arrival.
   */
  const remoteAudioStreams = new SvelteMap<string, MediaStream>();
  let screenStream: MediaStream | null = null;
  let screenRecorder: MediaRecorder | null = null;
  let recordedScreenChunks: Blob[] = [];
  let recordedScreenUrl = $state('');
  /** Whether the last recording actually captured the microphone, so the UI can say so. */
  let recordingHasAudio = $state(false);
  let soundChecks = $state<Record<string, boolean>>({
    'alert-donot-disturb':
      typeof loadedSettings.alertSoundOn === 'boolean'
        ? loadedSettings.alertSoundOn
        : DEFAULT_ALERT_DELIVERY_PREFERENCES.alertSoundOn,
    'qa-donot-disturb':
      typeof loadedSettings.qaSoundOn === 'boolean' ? loadedSettings.qaSoundOn : true,
    'non-trade-donot-disturb':
      typeof loadedSettings.nonTradeSound === 'boolean'
        ? loadedSettings.nonTradeSound
        : DEFAULT_ALERT_DELIVERY_PREFERENCES.nonTradeSound,
    'chat-donot-disturb':
      typeof loadedSettings.chatSoundOn === 'boolean' ? loadedSettings.chatSoundOn : true,
    /*
     * Absent means ENABLED, which is the opposite of what `=== true` did here.
     *
     * The capture gates the overlay on `isSpeechRecoOverlayEnabled()` and reads the stored
     * preference as `null == e || !!e` - null, undefined and true all enable it, and only an
     * explicit `false` turns it off. Written as `=== true`, a reader who had never touched the
     * subtitles checkbox had no stored value, so the overlay stayed disabled and captions never
     * appeared however well the rest of the pipeline worked.
     */
    'presentation-subtitles': loadedSettings.showSpeechRecoOverlay !== false
  });
  let splitTarget = $state<'main' | 'chat-alerts' | null>(null);
  let splitPointerAxis: 'x' | 'y' = 'x';
  let splitPointerOffset = 0;
  /*
    The two halves of `gutterDblClickDuration="400"`, which this room has shipped as an attribute
    since the split was written and never acted on.

    `splitMoved` is what separates a CLICK from a DRAG: `beginSplit` calls `preventDefault()` on
    pointerdown, so counting native `click` events on the gutter is not reliable here, and counting
    pointerdowns alone would fire the toggle on two quick drags. The gutter is a click only if the
    pointer went down and came up without `resizeFromPointer` ever running.

    `lastGutterClickAt` is a plain number rather than `$state`: nothing renders from it, and making
    it reactive would invalidate on every click for no observer. It starts at `NO_PENDING_CLICK`
    rather than 0 — `performance.now()` counts from page load, so 0 is a real timestamp and using it
    as "nothing pending" collapsed the presentation on the first single click of the session.
  */
  let splitMoved = false;
  let lastGutterClickAt = NO_PENDING_CLICK;
  // Seeded from the server-persisted sizes so the very first paint already has the user's pane
  // geometry. Leaving these null until onMount made SSR emit the default flex and hydration then
  // rewrite it, which is a layout shift the size of the whole room.
  let mainSplit = $state<number | null>(initialSplitSizes.mainSplit);
  let chatAlertsSplit = $state<number | null>(initialSplitSizes.chatAlertsSplit);
  /**
   * `chatAlertsSizeMobile` — 50, beside `presAreaSizeMobile` at 50 (`app-room.full.js:1852-1853`).
   *
   * A SEPARATE number from `mainSplit`, exactly as upstream keeps a separate field: the phone's
   * 50/50 and the desktop's 70/30 (`:1848-1849`) do not overwrite each other, so rotating a tablet
   * does not destroy the geometry the user dragged on either side of the threshold.
   *
   * Not seeded from the persisted sizes and never written to them, because `K4e`'s outer split
   * binds `dragStart` and NO `dragEnd` (`app-room.render-helpers.js:1786-1791`) — the desktop `j4e`
   * binds both (`:1620-1623`). Upstream therefore never records a mobile drag, and neither does
   * this: the gutter moves, and the size is gone on reload.
   */
  const MOBILE_CHAT_ALERTS_SPLIT = 0.5;
  let mobileSplit = $state(MOBILE_CHAT_ALERTS_SPLIT);
  let mainElement: HTMLElement | undefined;
  let alertChatElement: HTMLElement | undefined;
  let composerElement: HTMLTextAreaElement | undefined;
  let alertsScroller = $state<HTMLElement | undefined>();
  let chatScroller = $state<HTMLElement | undefined>();
  let alertsScrollingUp = false;
  let chatScrollingUp = false;
  let alertsScrollInitialized = false;
  let chatScrollInitialized = false;
  let previousAlertCount = 0;
  let previousChatCount = 0;
  let previousChatTab: ChatTab | undefined;
  let alertDeliveryInitialized = false;
  let seenAlertIds = new Set<number>();
  let alertScrollTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  let chatScrollTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  let mutedUsers = $state<Record<string, ManagedChatUser>>({});
  let followedUsers = $state<Record<string, ManagedChatUser>>({});
  const roomSplitIsHorizontal = $derived(roomSplitDir === 'ltr' || roomSplitDir === 'rtl');
  /**
   * `isMobileScreen` — `window.innerWidth <= 601`, the threshold that selects an entirely different
   * template upstream: `O(5, o.isMobileScreen ? 6 : 5)` (`app-room.full.js:4061`).
   *
   * Set at init (`:1889`, `this.isMobileScreen = this.onResizeChange = window.innerWidth <= 601`)
   * and in `onResize` (`:2988`). Bound here instead of listened for, which is the same value by a
   * shorter path — `bind:innerWidth` on `<svelte:window>` is reactive and needs no listener to
   * remove.
   *
   * `601`, not 600 and not a breakpoint from the stylesheet: `<=` 601 means 602 is the first
   * desktop width. The scoped sheet's own media query next to it is `max-width: 600px`
   * (`app-room.component.css`), so the two do NOT agree and the 1px seam is the reference's. Copied
   * rather than tidied — a room at exactly 601px takes the mobile TEMPLATE and the desktop CSS, and
   * "fixing" that would be inventing a behaviour nobody has seen.
   *
   * SSR renders the desktop tree, because no server knows the viewport. The correction happens on
   * hydration, and it is a real divergence in kind rather than in code: the reference is a
   * client-rendered Angular app whose first paint already knows the width. Doing this with CSS
   * `order` instead would avoid the correction and diverge on READING order, which is the thing
   * `K4e` actually changes — see the render block below.
   */
  let windowWidth = $state(0);
  const isMobileScreen = $derived(windowWidth > 0 && windowWidth <= 601);
  /**
   * The direction the two splits are ACTUALLY drawn in.
   *
   * On mobile both are hardcoded vertical, and that is a static attribute rather than a binding:
   * const 224 is
   * `['minSize','0','direction','vertical','id','mainAreaSplit','gutterDblClickDuration','400',3,'gutterDblClick','dragStart','ngClass']`
   * and const 228 is `['direction','vertical','minSize','0']` (`app-room.compiled.js`). The desktop
   * pair binds direction instead — const 8 ends `3,'direction','ngClass'` and const 209 is
   * `['minSize','0',3,'dragEnd','direction']`, both fed by `directionRoom()`.
   *
   * So a phone gets a stacked room whatever `roomSplitDir` says, and the user's left/right
   * preference simply does not apply at that width.
   */
  const splitIsHorizontal = $derived(roomSplitIsHorizontal && !isMobileScreen);
  /**
   * The INNER chat/alerts split's direction, which is NOT simply the inverse of the outer one.
   *
   * On desktop it is: a left/right room stacks alerts above chat, a top/bottom room puts them side
   * by side, which is what `directionChatAlerts()` returns. On mobile BOTH splits are vertical —
   * const 228 is `['direction','vertical','minSize','0']`, a static attribute, exactly like const
   * 224 for the outer. So a phone stacks presentation, then alerts, then chat, all the way down.
   *
   * Writing this as `splitIsHorizontal` would have made the inner split HORIZONTAL on a phone,
   * putting alerts and chat side by side in a column barely wide enough for one of them. Caught
   * against const 228 rather than by looking at it.
   */
  const innerSplitIsVertical = $derived(roomSplitIsHorizontal || isMobileScreen);
  /**
   * The other half of `onResize`, and the half that is easy to miss: crossing the threshold REFETCHES
   * (`app-room.full.js:2987-2999`).
   *
   * ```js
   * this.isMobileScreen = e.target.innerWidth <= 601;
   * this.appService.guiEventBus.emit('resizeChatView');
   * if (this.isMobileScreen !== this.onResizeChange) {
   *   clearTimeout(this.onResizeTimer);
   *   this.onResizeTimer = setTimeout(() => {
   *     this.appService.guiEventBus.emit('appHasFocusGetChatLog');
   *     if (preferences.extraChatColumn) emit('appHasFocusGetChatLogExtraChatColumn');
   *     this.appService.sendServerCommand('getAlertsLog', { page: 0 });
   *     this.onResizeChange = this.isMobileScreen;
   *   }, 500);
   * }
   * ```
   *
   * Why it exists: the two templates render different numbers of messages, so the log the room is
   * holding is the wrong length the moment the layout changes. It fires on the FLIP and not on every
   * resize — `onResizeChange` is the last threshold actually acted on, which is why dragging a
   * window across 400px of desktop width costs nothing.
   *
   * `invalidate('room:data')` is all three commands at once here: the load registers
   * `depends('room:data')` (`+page.server.ts:124`) and returns the alerts and the messages together,
   * so there is no separate alerts request to make. The extra-chat emit has no counterpart because
   * `extraChatColumn` has zero occurrences in this room — a pre-existing gap, not one opened here.
   *
   * `lastThresholdActedOn` is a PLAIN variable, not `$state`: nothing renders from it, and making it
   * reactive would put a write to a tracked value inside the effect that reads it. It starts `null`
   * to mean "never measured", which is how the first paint on a phone avoids a refetch it does not
   * need — upstream gets the same effect from `isMobileScreen = onResizeChange = …` in one statement
   * at init (`:1889`), so the two are equal before any resize can happen.
   */
  let lastThresholdActedOn: boolean | null = null;
  let resizeRefetchTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  const RESIZE_REFETCH_DELAY_MS = 500;

  $effect(() => {
    const mobile = isMobileScreen;
    if (windowWidth === 0) return;
    if (lastThresholdActedOn === null) {
      lastThresholdActedOn = mobile;
      return;
    }
    if (mobile === lastThresholdActedOn) return;
    globalThis.clearTimeout(resizeRefetchTimer);
    resizeRefetchTimer = globalThis.setTimeout(() => {
      lastThresholdActedOn = mobile;
      void invalidate('room:data');
    }, RESIZE_REFETCH_DELAY_MS);
    return () => globalThis.clearTimeout(resizeRefetchTimer);
  });
  const isPresenter = $derived(data.user.role === 'staff' || data.user.role === 'admin');
  /**
   * `sessData.disableCopy` — "Disable Copy?", content protection for the AUDIENCE.
   *
   * Read the same way every other room setting here is. The presenter exemption is not applied at
   * this line: it belongs to each gate, in `$lib/room-key-gates`, because all three bindings carry
   * the same two terms and folding `!isPresenter` in here would hide that they are one rule.
   */
  const disableCopy = $derived(data.sessData?.disableCopy === true);
  /**
   * `preferences.pushToTalk` — a per-USER preference, not a room setting, so it is seeded from the
   * persisted settings blob like every other preference rather than crossing the config boundary.
   *
   * This USED to read "HONEST GAP: nothing in this room WRITES it yet", and that claim expired
   * without anything here changing — the failure mode working-rule 2 exists for. The control was
   * already built: `ModalHost.svelte` renders it as `id="presenter-push-to-talk"`. What was missing
   * was one row in that component's id-to-preference table, so the checkbox persisted itself under
   * its own element id and this gate never saw it. The old comment's own words were right about
   * what to do — it "will do the right thing the moment a control sets it" — and now one does.
   *
   * `$state` rather than `$derived`, and the difference is not cosmetic. `loadedSettings` is a
   * plain object, deliberately (`svelte-ignore state_referenced_locally` where it is built), so
   * `savePreference` mutating it notifies nothing: a `$derived` over it would hold its
   * page-load value until some unrelated dependency happened to change, and push-to-talk would
   * start working only after a reload. Seeded from the same blob, then assigned by
   * `savePreference`, which is what every other live preference on this page does.
   */
  let pushToTalk = $state(loadedSettings.pushToTalk === true);
  /*
    `document.body.classList.add('noselect')` — `ngAfterViewInit`, `app-room.full.js:2227-2229`,
    behind the same `!isPresenter && sessData.disableCopy` the keystroke and right-click gates use.

    An `$effect` rather than a one-shot on mount, and that IS a divergence worth naming: upstream
    this runs once in `ngAfterViewInit` and never again, because `isPresenter` cannot change in that
    component's lifetime. Here it can — `giveMicScreen` elevates a member to presenter mid-session —
    and a class added at mount would then keep restricting somebody the room has just promoted. The
    teardown removes it for the same reason.

    It touches `document.body`, which is outside this component, so it cleans up after itself rather
    than leaving state behind on navigation.
  */
  $effect(() => {
    if (!shouldDisableSelection({ disableCopy, isPresenter })) return;
    document.body.classList.add('noselect');
    return () => document.body.classList.remove('noselect');
  });

  /**
   * `randomUser(e)`:
   *
   * ```js
   * randomUser(e){ const i=this; var o=e.length;
   *   if(o>=2){ var r=e[Math.floor(Math.random()*o)],
   *     a=bootbox.dialog({title:"Random User", message:'<p class="text-center"><img src="…giphy.gif" alt=""></p>',
   *       className:"random-user-modal",
   *       buttons:{ noclose:{label:"User Info", className:"btn-warning btn-random-user",
   *                          callback:()=>(i.appService.getUserInfo(r.userXrefID,r._id,null,null,!0),
   *                                        i.appService.guiEventBus.emit("doUserInfo",r.userXrefID),!1)},
   *                 cancel:{label:"Close", className:"btn-danger", callback(){}}}});
   *     a.init(()=>{ setTimeout(()=>{ a.find(".bootbox-body").html('<h2 class="text-center flash animated">'+r.nick+"</h2>"),
   *                                   $(".btn-random-user").css("display","inline-block") }, 3e3) }) } }
   * ```
   *
   * `if (o >= 2)` has NO else: fewer than two candidates and nothing opens at all. That is the
   * captured behaviour and it is deliberate - drawing a "random" user from a field of one is not a
   * draw. This used to alert "No users to pick from." on an empty field and name the only candidate
   * on a field of one, both of which the capture does not do.
   *
   * The three-second suspense is the point of the dialog: the giphy spinner shows, then the name
   * replaces it and only then does "User Info" become clickable.
   */
  const RANDOM_USER_REVEAL_MS = 3000;
  let randomUserPick = $state<{ entry: RosterEntry; revealed: boolean } | null>(null);
  let randomUserRevealTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

  function randomUser(candidates: RosterEntry[]) {
    if (candidates.length < RANDOM_USER_MINIMUM) return;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    randomUserPick = { entry: picked, revealed: false };
    globalThis.clearTimeout(randomUserRevealTimer);
    randomUserRevealTimer = globalThis.setTimeout(() => {
      if (randomUserPick) randomUserPick = { ...randomUserPick, revealed: true };
    }, RANDOM_USER_REVEAL_MS);
  }

  function closeRandomUser() {
    globalThis.clearTimeout(randomUserRevealTimer);
    randomUserPick = null;
  }

  /**
   * `getRandomUser()`, transcribed:
   *
   * ```js
   * bootbox.confirm({ message: "Only select from Trials?",
   *   buttons: { confirm: {label:"Yes", className:"btn-success"},
   *              cancel:  {label:"No",  className:"btn-danger"} },
   *   callback(i){ let o = globals.roster.filter(r => !r.isP);
   *                let {uniqueUsers: s} = uniqueRoster(o);
   *                i && (s = s.filter(r => r.isFT));
   *                randomUser(s) } })
   * ```
   *
   * Presenters only, and it draws from NON-presenters. Both answers run the SAME code path - "Yes"
   * only adds the `isFT` filter - so the No branch is not a dismissal to be ignored.
   */
  function drawRandomUser(trialsOnly: boolean) {
    randomUser(randomUserCandidates(rosterUsers, trialsOnly));
  }

  function getRandomUser() {
    bootboxConfirmation = {
      message: 'Only select from Trials?',
      onconfirm: () => {
        bootboxConfirmation = null;
        drawRandomUser(true);
      },
      // `bootbox.confirm`'s callback receives false for No AND for a dismissal, and this call site
      // acts on it: the draw still runs, just without the trials filter.
      ondismiss: () => drawRandomUser(false)
    };
  }

  /**
   * The sidebar's gates. Every one is a transcription in `$lib/roster-gates`, tested there against
   * its truth table; this file only supplies the viewer and the session.
   */
  /**
   * `globals.isLimitedPresenter` - runtime state, not a stored flag.
   *
   * It was a column on `users`, which was inventing durable state for something the capture treats
   * as transient. Nothing in the controller stores it either: `giveMicScreen` assigns it in one
   * statement alongside `isPresenter`
   * (`globals.user.isPresenter = globals.isLimitedPresenter = globals.isPresenter = e.give`), so it
   * is what a member BECOMES when a presenter hands them mic and screen, and what they stop being
   * when it is taken away.
   *
   * False on arrival, every time. `archivesAvailableTo()` reads it unchanged; only its source moved.
   */
  let isLimitedPresenter = $state(false);

  const rosterViewer = $derived({
    isPresenter,
    email: data.user.email,
    userXrefID: data.user.userXrefID,
    hasAdminChat: data.user.hasAdminChat,
    isLimitedPresenter,
    denyArchivesAccess: data.user.denyArchivesAccess
  });
  const rosterSession = $derived(data.sessData ?? {});

  /**
   * Mobile App Info.
   *
   * `getMyPinAndDoInfo()`, transcribed:
   *
   * ```js
   * (sessData.ptrMobileAppEnabled || sessData.customMobileAppEnabled)
   *   && (!globals.user.isFT || sessData.freeTrialsGetApp)
   *   && appService.sendServerCommand("getMyMobilePin", null)
   * ```
   *
   * The same predicate gates the two buttons that call it, so it is named once. Re-checking it
   * inside the handler is the capture's own belt-and-braces and is kept: a `data-bs-toggle` opens
   * the modal whether or not the click handler agrees, so the command must not go out on a room
   * with no app.
   */
  const mobileAppAvailable = $derived(
    (Boolean(data.sessData?.ptrMobileAppEnabled) || Boolean(data.sessData?.customMobileAppEnabled)) &&
      (!data.user.isFT || Boolean(data.sessData?.freeTrialsGetApp))
  );

  /**
   * `mobilePin`, and the modal it belongs to.
   *
   * The room does not compute the pin. `getMyMobilePin` goes out on the command channel and the
   * server answers on it; `case "getMyMobilePin": appEventBus.emit("getMyMobilePin", i)` is the
   * whole of the client's part. `N/A` is the captured placeholder until it arrives, not a spinner.
   */
  let mobilePin = $state('N/A');

  async function getMyPinAndDoInfo() {
    if (!mobileAppAvailable) return;
    // Open first. The capture's button opens the modal through `data-bs-toggle` regardless of what
    // the handler does, so the pin arriving late shows as `N/A` becoming a number, not as a delay
    // before anything appears.
    openModal('mobile');
    mobilePin = 'N/A';

    const response = await fetch('?/getMyMobilePin', { method: 'POST', body: new FormData() });
    const result = deserialize(await response.text());
    if (result.type === 'success' && typeof result.data?.pin === 'string') {
      mobilePin = result.data.pin;
    } else {
      // No invented placeholder. `N/A` is the captured value for "no pin", and a failed request is
      // a case of not having one.
      bootboxAlert =
        (result.type === 'failure' ? (result.data?.message as string) : null) ??
        'Could not get an app pin right now.';
    }
  }

  /**
   * Benzinga.
   *
   * ```js
   * benzingaUrl = `https://ptrv3.protradingroom.com/public/bz/index.html
   *                ?sessID=${globals.sessionID}&id=${sessData.uuid}&tok=${globals.sesionToken}`;
   * "" != sessData.altBenzingaLinkURL && (benzingaUrl = sessData.altBenzingaLinkURL)
   * ```
   *
   * The default is built from three values this room does not have: the reference's own
   * `sessionID`, a `sessData.uuid` that is not in the 268-key schema at all, and `sesionToken`
   * (the capture's spelling), which is the controller's session credential and has no business
   * crossing into a page. So the default is NOT reproduced - a link built from three blanks is a
   * broken link wearing a logo.
   *
   * `altBenzingaLinkURL` is reproduced exactly, and a room that sets it gets a working item.
   * Without it the item does not render, and `TODO.md` records why.
   */
  const benzingaUrl = $derived(data.sessData?.altBenzingaLinkURL?.trim() || null);
  const benzingaVisible = $derived(Boolean(data.sessData?.hasBenzingaNews) && benzingaUrl !== null);

  /**
   * `globals.rosterCount + this.simUserCount` - the one number the navbar and the sidebar badge
   * both show. `rosterCount` is null until the first `getRosterCount` frame lands, so the
   * server-rendered roster stands in until then rather than the badge flashing through zero.
   */
  const connectedCount = $derived(
    (rosterCount ?? rosterUsers.length) + (data.sessData?.simUserCount ?? 0)
  );

  /** `O(32, e.archivesAvailableTo() ? 32 : -1)` */
  const archivesAvailable = $derived(archivesAvailableTo(rosterViewer, rosterSession));
  /** `O(44, …)` - the Users block. */
  const rosterVisible = $derived(rosterBlockVisible(rosterViewer, rosterSession));
  /** `O(6, …)` - the badge, which is gated separately from the list. */
  const rosterCountVisible = $derived(rosterCountVisibleTo(rosterViewer, rosterSession));

  function rowVisible(entry: RosterEntry) {
    return rosterRowVisible(rosterViewer, rosterSession, entry);
  }

  const noteGates = $derived(
    resolveNoteSurfaceGates({
      canEditNotes: data.canEditNotes,
      notesEnabled: data.notesEnabled
    })
  );
  const pollIsActive = $derived(data.activePoll !== null);
  /**
   * `(this.isPresenter || this.appService.globals.sessData.userUploads) && (this.canPostImages = !0)`
   *
   * Identical in app-chat, app-privchat, app-alerts and app-extra-chat. This was `isPresenter`
   * alone, which is why a member's composer had the emoji button and nothing else - the image
   * upload and the GIF picker are BOTH gated on this one flag
   * (`O(2, canPostImages ? 2 : -1)` and `O(4, canPostImages ? 4 : -1)`), while YouTube is
   * `isPresenter` and the RTE needs two more flags on top of it.
   *
   * `direct-evidence-contract.ts` has recorded the correct rule as a string all along; only the
   * implementation disagreed.
   */
  const canPostImages = $derived(isPresenter || data.sessData?.userUploads === true);
  const giphyApiKey = env.PUBLIC_PTR_GIPHY_API_KEY ?? '';
  const primaryIsFirst = $derived(roomSplitDir === 'ltr' || roomSplitDir === 'ttb');
  const defaultMainSplit = $derived(
    splitIsHorizontal ? DIRECT_EVIDENCE_CONTRACT.populatedRoom.primaryPercent / 100 : 0.5
  );
  const defaultChatAlertsSplit = $derived(splitIsHorizontal ? 40.136530587668595 / 100 : 0.3);
  /*
    The captured flex strings below are a DESKTOP measurement — `DIRECT_EVIDENCE_CONTRACT` records
    one rendered room, and that room was horizontal. Every branch that reaches for them therefore
    tests `splitIsHorizontal` rather than `roomSplitIsHorizontal`, so the mobile layout takes the
    computed branch instead of inheriting a width measured at a viewport it never has.
  */
  const resolvedMainSplit = $derived(isMobileScreen ? mobileSplit : (mainSplit ?? defaultMainSplit));
  const resolvedChatAlertsSplit = $derived(chatAlertsSplit ?? defaultChatAlertsSplit);
  const primaryColumn = $derived(
    mainSplit === null && splitIsHorizontal
      ? DIRECT_EVIDENCE_CONTRACT.populatedRoom.primaryFlex
      : `calc(${resolvedMainSplit * 100}% - ${resolvedMainSplit * DUMP_CONTRACT.baseline.splitGutterWidth}px)`
  );
  const presentationColumn = $derived(
    mainSplit === null && splitIsHorizontal
      ? DIRECT_EVIDENCE_CONTRACT.populatedRoom.presentationFlex
      : `calc(${(1 - resolvedMainSplit) * 100}% - ${(1 - resolvedMainSplit) * DUMP_CONTRACT.baseline.splitGutterWidth}px)`
  );
  const alertsRow = $derived(
    chatAlertsSplit === null && splitIsHorizontal
      ? DIRECT_EVIDENCE_CONTRACT.populatedRoom.alertsFlex
      : `calc(${resolvedChatAlertsSplit * 100}% - ${resolvedChatAlertsSplit * DUMP_CONTRACT.baseline.splitGutterWidth}px)`
  );
  const chatRow = $derived(
    chatAlertsSplit === null && splitIsHorizontal
      ? DIRECT_EVIDENCE_CONTRACT.populatedRoom.chatFlex
      : `calc(${(1 - resolvedChatAlertsSplit) * 100}% - ${(1 - resolvedChatAlertsSplit) * DUMP_CONTRACT.baseline.splitGutterWidth}px)`
  );
  /*
    `order` is dropped entirely on mobile, and that is read from the const table rather than chosen.

    The desktop areas are placed by CSS order because `roomSplitDir` can reverse them without
    touching the DOM. `K4e`'s areas carry no order at all — const 225 is
    `['minSize','0',1,'presentation-box',3,'size']` and const 226 the same shape for
    `alert-chat-box`; the ONLY mobile area with an order binding is const 227, the extra chat column
    (`['minSize','0',1,'alert-chat-box',3,'size','order']`), which this room does not model.

    So on a phone the DOM order is the layout, which is why the render block below emits the two
    panes in a different sequence rather than restyling them. Leaving `order` on while reordering
    the DOM would have produced a room that reads presentation-first to a screen reader and
    chat-first to the eye.
  */
  const primaryAreaStyle = $derived(
    isMobileScreen
      ? `flex: 0 0 ${primaryColumn};`
      : `order: ${primaryIsFirst ? 0 : 2}; flex: 0 0 ${primaryColumn};`
  );
  const presentationAreaStyle = $derived(
    isMobileScreen
      ? `flex: 0 0 ${presentationColumn};`
      : `order: ${primaryIsFirst ? 2 : 0}; flex: 0 0 ${presentationColumn};`
  );
  const alertsAreaStyle = $derived(`order: 0; flex: 0 0 ${alertsRow};`);
  const chatAreaStyle = $derived(`order: 2; flex: 0 0 ${chatRow};`);
  const primaryPercent = $derived(resolvedMainSplit * 100);
  const alertsPercent = $derived(resolvedChatAlertsSplit * 100);
  const targetUser = $derived.by<ModalTargetUser>(() => {
    if (selectedMessageUser) return selectedMessageUser;
    const user = data.connectedUsers.find((connectedUser) => connectedUser.id === selectedUserId);
    if (!user) {
      return {
        id: 0,
        nick: '',
        emailHash: 'undefined',
        pic: 'https://secure.gravatar.com/avatar/undefined?d=mm&s=80',
        status: 'offline',
        ip: 'n/a'
      };
    }
    return {
      id: user.id,
      nick: user.displayName,
      email: user.email,
      emailHash: user.emailHash,
      pic: user.avatarUrl,
      status: user.status,
      permissions: user.role === 'user' ? 'r' : 'a',
      ...(user.status !== 'offline' ? { userXrefID: String(user.id), _id: String(user.id) } : {})
    };
  });

  function rosterUserTarget(user: (typeof data.connectedUsers)[number]): ModalTargetUser {
    return {
      id: user.id,
      nick: user.displayName,
      email: user.email,
      emailHash: user.emailHash,
      pic: user.avatarUrl,
      status: user.status,
      permissions: user.role === 'user' ? 'r' : 'a',
      ...(user.status !== 'offline' ? { userXrefID: String(user.id), _id: String(user.id) } : {})
    };
  }

  function selectRosterUser(user: (typeof data.connectedUsers)[number]) {
    selectedUserId = user.id;
    selectedMessageUser = rosterUserTarget(user);
    selectedMessage = null;
    userMenuId = null;
  }

  function openRosterUserInfo(user: (typeof data.connectedUsers)[number]) {
    selectRosterUser(user);
    openModal('user');
  }

  function mentionRosterUser(user: (typeof data.connectedUsers)[number]) {
    selectRosterUser(user);
    mentionUser(user.displayName);
  }

  function canOpenRosterPrivateChat(user: (typeof data.connectedUsers)[number]) {
    return canShowRosterPrivateChat(
      {
        isPresenter,
        userPmEnabled: data.sessData?.userPM,
        userToPresenterPmEnabled: data.sessData?.userToPresenterPM,
        // Both of these were absent, which made the helper's trial branch unreachable.
        currentUserIsTrial: data.user.isFT,
        disablePmForTrials: data.sessData?.disablePMForTrials
      },
      {
        id: user.id,
        permissions: user.isP ? 'a' : 'r',
        // The row's OWN flag, not `role !== 'user'` - an admin-chat member is neither a presenter
        // nor an ordinary row, and that distinction is the whole point of the flag.
        hasAdminChat: user.hasAdminChat
      }
    );
  }

  function openRosterPrivateChat(user: (typeof data.connectedUsers)[number]) {
    const start = resolveRosterPrivateChatStart(data.user.id, user.id);
    userMenuId = null;

    if (start.kind === 'self') {
      bootboxAlert = start.message;
      return;
    }

    selectRosterUser(user);
    showPrivateChat();
  }
  type MessageAction =
    | 'delete'
    | 'mute'
    | 'user'
    | 'mention'
    | 'show-all'
    | 'report'
    | 'copy'
    | 'reply'
    | 'answered'
    | 'private'
    | 'question'
    | 'image'
    | 'edit'
    | 'reaction';

  interface MessageReactionPayload {
    key: string;
    emoji: string;
  }

  interface MessageActionItem {
    id: number;
    senderId: number;
    senderName: string;
    senderEmailHash: string;
    senderAvatarUrl: string;
    senderRole?: string;
    senderStatus?: string;
    body: string;
    targetUrl?: string | null;
    nonTrade?: boolean;
    isAdmin?: boolean;
    backgroundColor?: string | null;
    fontColor?: string | null;
    answered?: boolean;
    replyToMessageId?: number | null;
    replyToName?: string | null;
    replyToBody?: string | null;
    reactions?: MessageReactions;
    evidenceKey?: string;
    // Present on every item RoomMessage hands back; the Q&A modal reproduces the alert card and
    // needs the timestamp, using the captured text where the item carries one.
    createdAt?: Date;
    evidenceTimestampText?: string;
    evidenceBodySegments?: Array<{
      kind: string;
      text?: string;
      url?: string;
      width?: number;
      height?: number;
    }>;
  }

  function withEvidenceState<T extends MessageActionItem>(item: T): T {
    if (!item.evidenceKey) return item;
    const state = evidenceMessageState[item.evidenceKey];
    if (!state) return item;

    return {
      ...item,
      ...(state.answered === undefined ? {} : { answered: state.answered }),
      ...(state.body === undefined
        ? {}
        : {
            body: state.body,
            evidenceBodySegments: undefined
          }),
      ...(state.reactions === undefined ? {} : { reactions: state.reactions })
    } as T;
  }

  function isEvidenceMessageHidden(item: MessageActionItem) {
    return Boolean(item.evidenceKey && evidenceMessageState[item.evidenceKey]?.hidden);
  }

  function updateEvidenceMessage(
    item: MessageActionItem,
    patch: {
      hidden?: boolean;
      answered?: boolean;
      body?: string;
      reactions?: MessageReactions;
    }
  ) {
    if (!item.evidenceKey) return;
    evidenceMessageState = {
      ...evidenceMessageState,
      [item.evidenceKey]: {
        ...evidenceMessageState[item.evidenceKey],
        ...patch
      }
    };
  }

  // `unreadQA` is a transient per-viewer marker in the source, not a property of the alert: it is
  // set when a Q&A update arrives (`o.unreadQA = !0` in updateAlertMsg) and deleted when this
  // viewer opens or closes that alert's modal. It is deliberately not derived from whether the
  // questions are answered - that is what the ✅ (`msg.ans`) reports - and it is not persisted, so
  // it does not survive a reload.
  const unreadQaAlertIds = new SvelteSet<number>();

  const visibleAlerts = $derived(
    data.alerts
      .filter((item) => !isEvidenceMessageHidden(item))
      .map(withEvidenceState)
      .filter((item) => matchesAlertSearch(item))
      .filter(
        (item) => alertsArchivedAt === null || new Date(item.createdAt).getTime() > alertsArchivedAt
      )
      .map((item) => ({ ...item, unreadQa: unreadQaAlertIds.has(item.id) }))
  );

  // The captured search field reads "Type your search term, then press Enter", so the term filters
  // the alert list. It is applied against the rendered body and the sender name only - the fields
  // the reader can actually see - rather than against metadata they cannot.
  function matchesAlertSearch(item: { body: string; senderName: string }) {
    const term = alertSearch.trim().toLowerCase();
    if (!term) return true;
    return item.body.toLowerCase().includes(term) || item.senderName.toLowerCase().includes(term);
  }

  // "Archive Alerts Messages" records a cut-off rather than deleting anything: alerts at or before
  // it drop out of the list, and the alerts themselves stay in the database. The capture gives the
  // control a title and a trash icon but no evidence of its server semantics, so this is the
  // conservative reading - nothing is destroyed, and clearing the stored preference restores the
  // full list.
  // `null` means no archive has been taken, which is not the same as a cut-off of 0: captured
  // alerts carry `createdAt: new Date(0)` (captured-room.ts), so a 0 default made the
  // `createdAt > cutoff` test below false for every one of them and silently hid the entire
  // captured alert list until the reader archived something.
  let alertsArchivedAt = $state<number | null>(
    typeof loadedSettings.alertsArchivedAt === 'number' ? loadedSettings.alertsArchivedAt : null
  );

  function archiveAlerts() {
    const archivable = visibleAlerts.length;
    if (archivable === 0) {
      bootboxAlert = 'There are no alerts to archive.';
      return;
    }
    bootboxConfirmation = {
      message: `Archive ${archivable} alert${archivable === 1 ? '' : 's'} from this list? They stay stored and are not deleted.`,
      onconfirm: () => {
        bootboxConfirmation = null;
        const cutoff = Date.now();
        alertsArchivedAt = cutoff;
        savePreference('alertsArchivedAt', cutoff);
      }
    };
  }

  // "Save alerts messages" exports what is currently listed, mirroring how a note is downloaded.
  function saveAlerts() {
    if (visibleAlerts.length === 0) {
      bootboxAlert = 'There are no alerts to save.';
      return;
    }
    const lines = visibleAlerts.map((item) => {
      // Captured alerts carry the timestamp text exactly as it was rendered; database rows do not.
      const stamp =
        'evidenceTimestampText' in item && item.evidenceTimestampText
          ? item.evidenceTimestampText
          : alertExportFormatter.format(new Date(item.createdAt));
      return `[${stamp}] ${item.senderName}: ${item.body}`;
    });
    const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alerts-${data.sessionHandle}.txt`;
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  const alertExportFormatter = new Intl.DateTimeFormat('en-US', {
    year: '2-digit',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  // Exact copy from the captured detach bootbox (alert-section/modal-content); do not paraphrase.
  const DETACHED_ALERTS_MESSAGE =
    'Chat/Alerts detached to a new browser window...You can reopen the chat in this window from the side menu.';

  /**
   * "Detach Alerts", transcribed from the capture's `detachChat` handler:
   *
   * ```js
   * appEventBus.subscribe("detachChat", () => {
   *   const e = window.innerWidth, i = window.innerHeight;
   *   this.detachedChatWindow = window.open(
   *     window.location.href + `&co=1&sl=1&tok=${globals.sesionToken}`, "_blank",
   *     `toolbar=no,location=no,directories=no,status=no,menubar=no,titlebar=no,
   *      fullscreen=no,width=${e / 2},height=${i}`);
   *   window.addEventListener("message", o =>
   *     "windowClosing" === o.data && appEventBus.emit("reatachChat")) })
   * ```
   *
   * `co=1` is the whole point and was missing: the capture parses it as `chatOnlyMode`
   * (`const F = s.get("co")`, and `globals.chatOnlyMode` even changes the socket's query to
   * `{detachedChat:"1"}`). This opened `window.location.href` with NO query string, so the popout
   * was a second copy of the ENTIRE room rather than the alerts and chat.
   *
   * `tok` is not carried: the capture passes a session token in the URL because its popout
   * authenticates from the query string. This app authenticates from the session cookie, which the
   * new window already has, so putting a credential in a URL here would add an exposure the
   * original needed and this one does not.
   *
   * The other half is in the room component, and matters as much: detaching HIDES the chat and
   * alerts in this window and offers a control to bring them back -
   * `subscribe("detachChat", () => { this.hideChatAlerts = !0; this.reopenAlertsChatBtn = !0 })`.
   * Without it a reader ends up with the same panel twice.
   */
  function detachAlerts() {
    if (alertsDetachedWindow && !alertsDetachedWindow.closed) {
      alertsDetachedWindow.focus();
      return;
    }
    const query = new URLSearchParams(window.location.search);
    query.set('co', '1');
    query.set('sl', '1');
    alertsDetachedWindow = window.open(
      `${window.location.pathname}?${query}`,
      '_blank',
      `toolbar=no,location=no,directories=no,status=no,menubar=no,titlebar=no,fullscreen=no,width=${Math.round(window.innerWidth / 2)},height=${window.innerHeight}`
    );
    if (!alertsDetachedWindow) {
      bootboxAlert =
        'Your browser blocked the detached window. Please allow pop-ups for this site.';
      return;
    }
    chatAlertsDetached = true;
    // `"windowClosing" === o.data && emit("reatachChat")` - closing the popout puts them back.
    alertsDetachedWindow.addEventListener('beforeunload', () => {
      chatAlertsDetached = false;
      alertsDetachedWindow = null;
    });
    bootboxAlert = DETACHED_ALERTS_MESSAGE;
  }

  /**
   * `openTranscriptPage()`, and the sidebar's `toggleSpeechRecoHistory()` - byte-for-byte the same
   * body on two different components, so "Transcript History" in the Archives menu and "Full
   * Transcript History" on the caption overlay are one action:
   *
   * ```js
   * const e = globals.sesionToken;
   * if (!e) return void P("No session token available for transcript");
   * window.open(`${location.origin + location.pathname}#/session-transcript?token=${encodeURIComponent(e)}&name=${encodeURIComponent(globals.sessionName)}`, "_blank");
   * ```
   *
   * Both controls were dead links - no handler at all on the menu item, no button on the overlay.
   * They now report the same thing, honestly: there is no transcript page to open, because nothing
   * in this repo produces a transcript. `currentCaption` is never assigned (the Web Speech API runs
   * on the presenter's machine in the capture and the results are relayed over the socket; neither
   * half is wired here), so `lastSpeechReco` has no source and the page would render an empty
   * document. Recorded in TODO.md rather than papered over with a route that always says "empty".
   */
  const TRANSCRIPT_UNAVAILABLE =
    'The transcript page is not available in this room: speech recognition results are not being captured, so there is nothing to open.';

  function openTranscriptPage() {
    bootboxAlert = TRANSCRIPT_UNAVAILABLE;
  }

  /** `reopenAlertsChat()` - the side-menu control the bootbox message points at. */
  function reopenAlertsChat() {
    chatAlertsDetached = false;
    if (alertsDetachedWindow && !alertsDetachedWindow.closed) alertsDetachedWindow.close();
    alertsDetachedWindow = null;
  }
  /**
   * The mention popup — `chatPopup`'s half of the reference's notification block.
   *
   * Driven off `data.messages` rather than off the SSE payload, and that is a deliberate security
   * choice rather than convenience. The chat event carries only `senderId`, `senderEmailHash` and
   * the CHANNEL — never the text — because `room` is a chat channel and can be an admin one; a
   * payload carrying message bodies would put admin chat on every subscriber's wire. The refetched
   * `data.messages` has already been filtered by the server for THIS viewer, so reading the text
   * from there cannot show anybody something they were not already entitled to see.
   *
   * An `$effect` because this IS a side effect — a toast and an OS notification — not a derivation.
   * The marker it writes is bookkeeping, not rendered state.
   *
   * `lastPopupChatId` starts at -1 and is seeded on the FIRST pass without announcing anything, so
   * arriving in a room with fifty unread mentions is silent. Only messages that appear afterwards
   * pop.
   */
  $effect(() => {
    const messages = data.messages;
    if (!popupSeeded) {
      popupSeeded = true;
      lastPopupChatId = messages.at(-1)?.id;
      return;
    }
    /*
      Everything AFTER the marker, by position in the server's own ordering. If the marker is gone
      — trimmed from the log, or the tab changed — `indexOf` gives -1 and `slice(0)` would announce
      the whole list, so that case seeds again instead.
    */
    const seenAt = messages.findIndex((item) => item.id === lastPopupChatId);
    if (lastPopupChatId !== undefined && seenAt === -1) {
      lastPopupChatId = messages.at(-1)?.id;
      return;
    }
    const fresh = messages.slice(seenAt + 1);
    if (fresh.length === 0) return;
    lastPopupChatId = messages.at(-1)?.id;

    // `doNotDisturbOn ||` — the outer gate on the whole block, sound and popup alike.
    if (doNotDisturbOn || !chatPopup) return;

    for (const item of fresh) {
      // Your own message is never a mention of you, whatever it says.
      if (item.senderId === data.user.id) continue;
      if (!isMentionOf(item.body, data.user.displayName, item.isAdmin === true)) continue;

      const title = `Mention from @${item.senderName ?? 'Unknown'}`;
      /*  — the reference passes the body as the
         toast TEXT and the title second, and enables HTML because chat bodies carry markup. */
      showToast({ kind: 'info', title, message: item.body, enableHtml: true });
      requestAlertBrowserNotification(title, item.body, null, item.senderEmailHash ?? '');
    }
  });

  const visibleChatMessages = $derived(
    trimChatLog(data.messages, trimChatLogs)
      .filter((item) => item.room === chatTab && !isEvidenceMessageHidden(item))
      .map(withEvidenceState)
      /*
        `msg.b` — the sender's badges, attached here rather than stored on the row.

        Upstream they ride on the message itself, because that server owns both the chat log and
        the badge assignments. Ours do not: badges live in the controller and messages in the room's
        own database, so they are joined at render time on `senderEmailHash`, which every message
        already carries. A member given a badge mid-session sees it on their NEXT message upstream
        and on ALL of them here — a divergence in our favour, and the alternative would be
        denormalising controller state into room rows that then go stale.
      */
      .map((item) => ({ ...item, badges: badgesForSender(item.senderEmailHash) }))
  );

  function forceAlertsToBottom(scroller: HTMLElement) {
    if (alertScrollTimer !== undefined) globalThis.clearTimeout(alertScrollTimer);
    alertScrollTimer = scrollRoomScrollerToBottom(scroller);
  }

  function forceChatToBottom(scroller: HTMLElement) {
    if (chatScrollTimer !== undefined) globalThis.clearTimeout(chatScrollTimer);
    chatScrollTimer = scrollRoomScrollerToBottom(scroller);
  }

  function trackAlertsScroll(event: Event) {
    alertsScrollingUp = isRoomScrollerReadingHistory(event.currentTarget as HTMLElement);
  }

  function trackChatScroll(event: Event) {
    chatScrollingUp = isRoomScrollerReadingHistory(event.currentTarget as HTMLElement);
  }

  $effect(() => {
    const scroller = alertsScroller;
    const count = visibleAlerts.length;
    const newestMessage = visibleAlerts.at(-1);

    if (!scroller) return;

    const isInitialView = !alertsScrollInitialized;
    const isNewMessage = alertsScrollInitialized && count > previousAlertCount;
    alertsScrollInitialized = true;
    previousAlertCount = count;

    if (
      isInitialView ||
      (isNewMessage &&
        shouldAutoScrollForMessage(alertsScrollingUp, newestMessage?.senderId, data.user.id))
    ) {
      alertsScrollingUp = false;
      void tick().then(() => {
        if (alertsScroller === scroller) forceAlertsToBottom(scroller);
      });
    }
  });

  $effect(() => {
    const scroller = chatScroller;
    const activeTab = chatTab;
    const count = visibleChatMessages.length;
    const newestMessage = visibleChatMessages.at(-1);

    if (!scroller) return;

    const isInitialView = !chatScrollInitialized;
    const didSwitchChannel = chatScrollInitialized && activeTab !== previousChatTab;
    const isNewMessage = chatScrollInitialized && !didSwitchChannel && count > previousChatCount;
    chatScrollInitialized = true;
    previousChatTab = activeTab;
    previousChatCount = count;

    if (
      isInitialView ||
      didSwitchChannel ||
      (isNewMessage &&
        shouldAutoScrollForMessage(
          chatScrollingUp,
          newestMessage?.senderId,
          data.user.id,
          alwaysScrollToBottom
        ))
    ) {
      chatScrollingUp = false;
      void tick().then(() => {
        if (chatScroller === scroller) forceChatToBottom(scroller);
      });
    }
  });

  $effect(() => {
    const currentAlerts = data.alerts;

    if (!alertDeliveryInitialized) {
      seenAlertIds = new Set(currentAlerts.map((alert) => alert.id));
      alertDeliveryInitialized = true;
      return;
    }

    const unseenAlerts = currentAlerts.filter((alert) => !seenAlertIds.has(alert.id));
    if (unseenAlerts.length === 0) return;

    for (const alert of unseenAlerts) seenAlertIds.add(alert.id);
    queueMicrotask(() => {
      for (const alert of unseenAlerts) deliverAlert(alert);
    });
  });

  $effect(() => {
    const activePoll = data.activePoll;

    if (!activePoll) {
      deliveredPollId = null;
      pollMinimized = false;
      return;
    }
    if (
      activePoll.senderId === data.user.id ||
      activePoll.userAnswerChoice !== null ||
      deliveredPollId === activePoll.id
    ) {
      return;
    }

    deliveredPollId = activePoll.id;
    pollOpenMode = 'auto';
    pollMinimized = false;
    modal = 'poll';
  });

  /**
   * The FOLLOW-a-user style, a different captured default:
   *
   * ```js
   * "lightTheme" === preferences.theme
   *   ? {color:"#1a1a1a",tickerColor:"#1a1a1a",usernameColor:"#365d7d",bgColor:"#ffffff",fontSize:14,playSound:!0}
   *   : {color:"#f7fd37",tickerColor:"#f7fd37",usernameColor:"#c0d8ed",bgColor:"#000000",fontSize:14,playSound:!0}
   * ```
   *
   * White and 14px, where the room style is #e8e8e8 and 13px. A followed user's messages are meant
   * to stand out from the rest, so the two must not share one function.
   */
  function defaultFollowChatStyle(): FollowChatStyle {
    return theme === 'light'
      ? {
          color: '#1a1a1a',
          tickerColor: '#1a1a1a',
          usernameColor: '#365d7d',
          bgColor: '#ffffff',
          fontSize: 14,
          playSound: true
        }
      : {
          color: '#f7fd37',
          tickerColor: '#f7fd37',
          usernameColor: '#c0d8ed',
          bgColor: '#000000',
          fontSize: 14,
          playSound: true
        };
  }

  function readManagedUsers(key: 'mutedUsers' | 'followedUsers') {
    if (typeof localStorage === 'undefined') return {};
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return {};
      const parsed = JSON.parse(stored);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, ManagedChatUser>)
        : {};
    } catch {
      return {};
    }
  }

  function loadManagedUsers() {
    mutedUsers = readManagedUsers('mutedUsers');
    followedUsers = readManagedUsers('followedUsers');
  }

  function storeManagedUsers(
    key: 'mutedUsers' | 'followedUsers',
    users: Record<string, ManagedChatUser>
  ) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(users));
    }
  }

  function applyFollowToggle(user: ModalTargetUser) {
    const next = { ...followedUsers };
    if (next[user.emailHash]) {
      delete next[user.emailHash];
    } else {
      next[user.emailHash] = {
        nick: user.nick,
        emailHash: user.emailHash,
        pic: user.pic,
        userXrefID: user.userXrefID,
        _id: user._id,
        followChatStyle: defaultFollowChatStyle()
      };
    }
    followedUsers = next;
    storeManagedUsers('followedUsers', next);
  }

  function applyFollowStyle(user: ModalTargetUser, style: FollowChatStyle) {
    const existing = followedUsers[user.emailHash];
    if (!existing) return;
    const next = {
      ...followedUsers,
      [user.emailHash]: {
        ...existing,
        followChatStyle: { ...style }
      }
    };
    followedUsers = next;
    storeManagedUsers('followedUsers', next);
  }

  function applyMuteToggle(user: ModalTargetUser) {
    const next = { ...mutedUsers };
    if (next[user.emailHash]) {
      delete next[user.emailHash];
    } else {
      next[user.emailHash] = {
        nick: user.nick,
        emailHash: user.emailHash,
        pic: user.pic
      };
    }
    mutedUsers = next;
    storeManagedUsers('mutedUsers', next);
  }

  function requestFollowToggle(user: ModalTargetUser) {
    bootboxConfirmation = {
      message: `Do you want to ${followedUsers[user.emailHash] ? 'un' : ''}follow ${user.nick}?`,
      className: 'manage-user-list',
      onconfirm: () => {
        bootboxConfirmation = null;
        applyFollowToggle(user);
      }
    };
  }

  function requestMuteToggle(user: ModalTargetUser) {
    bootboxConfirmation = {
      message: `Do you want to ${mutedUsers[user.emailHash] ? 'un' : ''}mute ${user.nick}?`,
      className: 'manage-user-list',
      onconfirm: () => {
        bootboxConfirmation = null;
        applyMuteToggle(user);
      }
    };
  }

  /**
   * `muteAllNonAdmins()` — `app-room.full.js:2963-2986`, reached through
   * `appEventBus.subscribe('muteAllNonAdmins', …)` (`:2219-2221`), which in this room is the
   * session-control action of the same name.
   *
   * **This replaced a control that did the wrong thing quietly.** It read
   * `muted = true; volume = 0` — so a presenter who asked the room to silence its non-admin
   * speakers silenced their OWN speakers instead, and every one of those microphones stayed open
   * for everybody else. The label and the effect were unrelated.
   *
   * The selection is `nonAdminTalkingUsers` in `$lib/mute-all-non-admins`, with the four properties
   * that matter transcribed and tested there — chiefly that a talking user with no roster row is
   * SKIPPED rather than assumed ordinary.
   *
   * **One mapping, stated because it is not a transcription.** Upstream sends its own
   * `sendServerCommand('muteTalkingUser', muser)`. This room has no such command; it has
   * `remotePresCommand` / `mutemic`, which is the same act addressed to one peer and is already
   * carried out by that peer's own browser (`:5917`). The server re-checks that the caller is a
   * presenter and that the subCmd is one of three (`+page.server.ts:1654-1670`), so authority is
   * decided there rather than asserted here.
   *
   * The 100ms stagger is the reference's and is not cosmetic: this is one request per muted member.
   */
  function muteAllNonAdmins() {
    // `if (!globals.user.isPresenter) return` — the first line of the method, before the dialog.
    if (!isPresenter) return;
    // `!e || 0 === e.length ||` — with nobody speaking the confirm never opens at all.
    if (talkingUsers.length === 0) return;

    bootboxConfirmation = {
      message: MUTE_ALL_CONFIRM,
      onconfirm: () => {
        bootboxConfirmation = null;
        const targets = nonAdminTalkingUsers(talkingUsers, rosterUsers);
        // `0 !== r.length &&` — an empty selection sends nothing, which is the case where every
        // open microphone belongs to a presenter.
        targets.forEach((entry, index) => {
          globalThis.setTimeout(() => {
            const body = new FormData();
            body.set('subCmd', 'mutemic');
            body.set('targetUserId', String(entry.userID));
            void fetch('?/presenterCommand', { method: 'POST', body });
          }, MUTE_STAGGER_MS * index);
        });
      }
    };
  }

  /**
   * Tawk.to presenter support — `app-room.full.js:2224-2298`.
   *
   * The gates, the URL shape and the attribute fallbacks are in `$lib/tawk-support`, with the one
   * DIVERGENCE stated there and tested: the property id is configuration, never the capture's
   * literal, because copying `5aecb59f227d3d7edc24f7c2` would open every presenter's support chat
   * into another company's inbox and post their name and email into it.
   *
   * `loadTawkSupport()` runs from `ngAfterViewInit` upstream — after the view exists, once — which
   * is `onMount` here. `setTAWKAttributes()` then awaits the API and calls `hideWidget()`, so the
   * widget is present and invisible until the navbar control is used; that is why the control is a
   * toggle rather than a launcher.
   */
  const tawkAvailable = $derived(
    tawkSupportAvailable(
      { isPresenter },
      data.sessData ?? {},
      env.PUBLIC_PTR_TAWK_PROPERTY_ID
    )
  );
  /** `this.tawkWidgetOpen` — attributes are set once, on the first open. */
  let tawkWidgetOpen = false;

  type TawkApi = {
    toggleVisibility?: () => void;
    hideWidget?: () => void;
    setAttributes?: (
      attributes: { name: string; email: string },
      onerror: (error: unknown) => void
    ) => void;
  };

  function tawkApi(): TawkApi | undefined {
    return (window as Window & { Tawk_API?: TawkApi }).Tawk_API;
  }

  /**
   * `loadTawkSupport()` + `setTAWKAttributes()`, in the order `ngAfterViewInit` runs them.
   *
   * `waitForTawkAPI()` upstream polls every 100ms until `window.Tawk_API` exists, then hides the
   * widget. Reproduced with the script's own `load` event plus the same poll as a fallback, because
   * the API object is created by the script rather than at load time.
   */
  function loadTawkSupport() {
    const script = tawkScript(env.PUBLIC_PTR_TAWK_PROPERTY_ID);
    if (!script) return () => {};

    const element = document.createElement('script');
    element.async = script.async;
    element.src = script.src;
    element.charset = script.charset;
    element.setAttribute('crossorigin', script.crossorigin);
    // `i.parentNode.insertBefore(e, i)` where `i` is the first existing script.
    const first = document.getElementsByTagName('script')[0];
    first?.parentNode?.insertBefore(element, first);

    // `waitForTawkAPI()` — then `hideWidget()`, so it is invisible until the control is used.
    let cancelled = false;
    const waitForApi = () => {
      if (cancelled) return;
      const api = tawkApi();
      if (api?.hideWidget) api.hideWidget();
      else globalThis.setTimeout(waitForApi, 100);
    };
    waitForApi();

    return () => {
      cancelled = true;
      element.remove();
    };
  }

  /** `toggleTAWKSupport()` — visibility every time, attributes only on the first open. */
  function toggleTAWKSupport() {
    const api = tawkApi();
    if (!api?.toggleVisibility) return;
    api.toggleVisibility();
    if (tawkWidgetOpen) return;
    api.setAttributes?.(
      tawkAttributes({
        savedNick: typeof loadedSettings.savedNick === 'string' ? loadedSettings.savedNick : null,
        nick: data.user.displayName,
        name: data.user.displayName,
        savedEmail: typeof loadedSettings.savedEmail === 'string' ? loadedSettings.savedEmail : null,
        email: data.user.email
      }),
      (error) => {
        if (error) console.error('Error setting Tawk.to attributes:', error);
      }
    );
    tawkWidgetOpen = true;
  }

  function requestModalConfirmation(message: string, onconfirm: () => void) {
    bootboxConfirmation = {
      message,
      onconfirm: () => {
        bootboxConfirmation = null;
        onconfirm();
      }
    };
  }

  function requestManagedUserRemoval(list: 'mutedUsers' | 'followedUsers', user: ManagedChatUser) {
    bootboxConfirmation = {
      message: `Do you want to un${list === 'mutedUsers' ? 'mute' : 'follow'} ${user.nick}?`,
      className: 'manage-user-list',
      onconfirm: () => {
        bootboxConfirmation = null;
        const next = { ...(list === 'mutedUsers' ? mutedUsers : followedUsers) };
        delete next[user.emailHash];
        if (list === 'mutedUsers') mutedUsers = next;
        else followedUsers = next;
        storeManagedUsers(list, next);
      }
    };
  }

  function openManagedUserInfo(user: ManagedChatUser) {
    if (!user.userXrefID || !user._id) {
      bootboxAlert = 'User is not logged in.';
      return;
    }
    selectedMessageUser = {
      id: Number(user._id),
      nick: user.nick,
      emailHash: user.emailHash,
      pic: user.pic,
      status: 'online',
      userXrefID: user.userXrefID,
      _id: user._id
    };
    openModal('user');
  }

  async function updateUsername(user: ModalTargetUser, username: string) {
    const trimmed = username.trim();
    if (!trimmed) return;
    const body = new FormData();
    body.set('userId', String(user.id));
    body.set('username', trimmed);
    const response = await fetch('?/editUsername', { method: 'POST', body });
    if (response.ok) await invalidateAll();
  }

  function handleUserAction(action: string, user: ModalTargetUser) {
    if (action === 'session-reload-config') {
      requestModalConfirmation('Are you sure you want to reload tge session config?', () => {
        modal = null;
        void invalidateAll();
        bootboxAlert = 'Session config reloaded...';
      });
      return;
    }

    if (action === 'session-refresh-roster') {
      void invalidateAll();
      bootboxAlert =
        'Command send OK. Please allow 1/2 minute for old entries to get deleted from the list';
      return;
    }

    if (action === 'session-soft-reset') {
      requestModalConfirmation('Are you sure you want to soft reset the room?', () => {
        modal = null;
        void invalidateAll();
        bootboxAlert = 'Soft reset request sent...';
      });
      return;
    }

    if (action === 'session-hard-reset' || action === 'session-hard-reset-revoke') {
      requestModalConfirmation('Are you sure you want to reset the room?', () => {
        modal = null;
        savePreference('sessionTokensRevoked', action === 'session-hard-reset-revoke');
        void invalidateAll();
      });
      return;
    }

    if (action === 'session-save-close') {
      savePreference('sessionOpen', false);
      modal = null;
      return;
    }

    if (action === 'session-save-close-message') {
      bootboxAlert = 'Message Saved';
      return;
    }

    if (action === 'session-open') {
      savePreference('sessionOpen', true);
      modal = null;
      return;
    }

    if (action === 'session-lock' || action === 'session-lock-kick') {
      savePreference('sessionLocked', true);
      savePreference('sessionLockKick', action === 'session-lock-kick');
      bootboxAlert = 'Session Locked';
      return;
    }

    if (action === 'session-unlock') {
      savePreference('sessionLocked', false);
      bootboxAlert = 'Session Unlocked';
      return;
    }

    if (action === 'invalid-restream-link') {
      bootboxAlert =
        'Invalid RTMP link!, please make sure it starts with "rtmp://" and does not contain spaces or special characters. For example: rtmp://example.com/live/stream';
      return;
    }

    if (
      action === 'session-send-video' ||
      action === 'session-send-sales-image' ||
      action === 'session-send-users-url'
    ) {
      bootboxPrompt = {
        title: 'Please enter the URL:',
        value: '',
        onconfirm: (value) => {
          const url = value.trim();
          bootboxPrompt = null;
          if (!url.toLowerCase().includes('http://') && !url.toLowerCase().includes('https://')) {
            bootboxAlert = 'The link seems to be missing "https://" or "http://"';
            return;
          }
          if (action === 'session-send-video') {
            const key = `videos-${data.sessionHandle}`;
            const videos = JSON.parse(localStorage.getItem(key) ?? '[]') as string[];
            if (videos.includes(url)) {
              bootboxAlert = 'Video already exists.';
              return;
            }
            videos.push(url);
            localStorage.setItem(key, JSON.stringify(videos));
            modal = null;
            bootboxAlert = 'Video added.';
            return;
          }
          modal = null;
          bootboxAlert = 'Command send OK.';
        }
      };
      return;
    }

    if (action === 'edit-my-info') {
      selectedMessageUser = null;
      selectedUserId = data.user.id;
      modal = 'user';
      return;
    }

    if (action === 'remove-preview-windows') {
      previewWindowsVisible = false;
      return;
    }

    if (action === 'mute-all-non-admins') {
      muteAllNonAdmins();
      return;
    }

    if (action === 'edit-username') {
      // `editUsername(e)` - a presenter renaming somebody else. No pre-filled value, no length or
      // character rules: the capture accepts whatever a presenter types.
      bootboxPrompt = {
        title: `Enter a new username for "${user.nick}":`,
        value: '',
        onconfirm: (value) => {
          bootboxPrompt = null;
          void updateUsername(user, value);
        }
      };
      return;
    }

    if (action === 'edit-username-by-user') {
      /*
        `editUsernameByUser(e)` - a member renaming THEMSELVES, and a different function from the
        one above in four ways the capture is explicit about:

          bootbox.prompt({ title: "Enter a new username for yourself:", value: this.user.nick, … })
          if (!/^[a-zA-Z0-9]+$/.test(o))  "Username can only contain letters and numbers"
          if (o.length < 3)               "Username must be at least 3 characters long"
          if (o.length >= 30)             "Username must be less than 30 characters long"
          … && this.user.nick?.trim() != o && (… setPreference("savedNick", o) …)

        The rules exist because this one is reachable by the person being renamed. Every string is
        the capture's, including "less than 30" on a `>= 30` test.
      */
      bootboxPrompt = {
        title: 'Enter a new username for yourself:',
        value: user.nick,
        onconfirm: (value) => {
          bootboxPrompt = null;
          const next = value?.trim() ?? '';
          if (next.length === 0) return;
          if (!/^[a-zA-Z0-9]+$/.test(next)) {
            bootboxAlert = 'Username can only contain letters and numbers';
            return;
          }
          if (next.length < 3) {
            bootboxAlert = 'Username must be at least 3 characters long';
            return;
          }
          if (next.length >= 30) {
            bootboxAlert = 'Username must be less than 30 characters long';
            return;
          }
          // Unchanged is a no-op, not a round trip.
          if (user.nick?.trim() === next) return;
          void updateUsername(user, next);
        }
      };
      return;
    }

    if (action === 'kick' || action === 'kick-ban') {
      bootboxPrompt = {
        title: 'Enter the kick message for this user',
        value: 'You have been kicked from the room by an administrator',
        onconfirm: () => {
          bootboxPrompt = null;
          modal = null;
          bootboxAlert = 'User kicked OK';
        }
      };
      return;
    }

    if (action === 'kick-duplicates') {
      bootboxPrompt = {
        title: `Kick all other duplicates of ${user.nick} with the following message:`,
        value: 'You have been kicked from the room by an administrator',
        onconfirm: () => {
          bootboxPrompt = null;
          modal = null;
          bootboxAlert = `No duplicates found for ${user.nick}`;
        }
      };
      return;
    }

    if (action === 'admin-notes-password') {
      bootboxPrompt = {
        title: "Please enter the password to manage user's notes:",
        value: '',
        onconfirm: () => {
          bootboxPrompt = null;
          bootboxAlert = 'Wrong password!';
        }
      };
      return;
    }

    const exactAlerts: Record<string, string> = {
      'save-permissions': 'Permissions applied, user will reload the page now to apply...',
      'mute-chat-24': 'user chat muted',
      'mute-chat-indefinitely': 'user chat muted',
      'unmute-chat': 'user chat unmuted',
      'restart-audio': 'Audio restart request sent OK',
      'force-reload': 'Reload request sent OK'
    };
    if (exactAlerts[action]) {
      if (action === 'save-permissions') modal = null;
      bootboxAlert = exactAlerts[action];
    }
  }

  /**
   * `toggleAlertsToolbar()` - the gear (`app-alerts.compiled.js:134-140`):
   *
   * ```js
   * toggleAlertsToolbar() {
   *   this.showAlertsToolbar && !this.showAlertsToolbarExtended
   *     ? (this.showAlertsToolbarExtended = !0)
   *     : ((this.showAlertsToolbar = !this.showAlertsToolbar),
   *        this.showAlertsToolbar && (this.showAlertsToolbarExtended = !0)),
   *   this.appService.guiEventBus.emit('scrollAlertLogToBottom');
   * }
   * ```
   *
   * Note the first branch: with a search-only strip already open the gear EXPANDS it rather than
   * closing it, so the two controls do not fight each other.
   */
  function toggleAlertsToolbar() {
    if (alertsToolbarOpen && !alertsToolbarExtended) {
      alertsToolbarExtended = true;
    } else {
      alertsToolbarOpen = !alertsToolbarOpen;
      if (alertsToolbarOpen) alertsToolbarExtended = true;
    }
    // `guiEventBus.emit('scrollAlertLogToBottom')` - the strip changes height, so the log would
    // otherwise be left scrolled off the newest alert.
    if (alertsScroller) forceAlertsToBottom(alertsScroller);
  }

  /**
   * `toggleAlertsToolbarSearchOnly()` - the magnifier (`app-alerts.compiled.js:141-150`):
   *
   * ```js
   * toggleAlertsToolbarSearchOnly() {
   *   (this.showAlertsToolbar && this.showAlertsToolbarExtended) ||
   *     (this.showAlertsToolbar = !this.showAlertsToolbar),
   *   this.showAlertsToolbarExtended = !1,
   *   this.showAlertsToolbar && setTimeout(() => { … focus the search box … });
   * }
   * ```
   *
   * The mirror of the above: from the FULL toolbar it collapses to search-only instead of
   * closing, and it always ends with the extended regions hidden.
   */
  function toggleAlertsToolbarSearchOnly() {
    if (!(alertsToolbarOpen && alertsToolbarExtended)) alertsToolbarOpen = !alertsToolbarOpen;
    alertsToolbarExtended = false;
    if (alertsToolbarOpen) {
      // `setTimeout(...)` in the capture, because the input does not exist until the strip renders.
      void tick().then(() => {
        document.querySelector<HTMLInputElement>('#alert-settings .form-control')?.focus();
      });
    }
  }

  function openModal(name: Exclude<ModalName, null>) {
    if (name === 'muted' || name === 'followed' || name === 'user') loadManagedUsers();
    modal = name;
    volumeOpen = false;
    rosterSortOpen = false;
    archivesMenuOpen = false;
    notesMenuOpen = false;
    filesMenuOpen = false;
    userMenuId = null;
    messageMenuId = null;
    emojiOpen = false;
    giphyOpen = false;
  }

  function openPollUI() {
    if (pollMinimized) {
      pollRestoreToken += 1;
      pollMinimized = false;
      modal = 'poll';
      return;
    }

    pollOpenMode = 'setup';
    openModal('poll');
  }

  function minimizePoll() {
    pollMinimized = true;
    modal = null;
  }

  function closeActiveModal() {
    if (modal === 'poll') pollMinimized = false;
    // The modal component clears the marker again on the way out, which is the path that matters
    // when an answer lands while the modal is already open - that update sets unreadQA and emits
    // `openAlertQAModal` with `openModal: !1`, so only the close can clear it:
    //   yi(`.${e._id}`).on('hidden.bs.modal', () => { ... delete e.unreadQA })
    if (modal === 'qa' && selectedMessage) unreadQaAlertIds.delete(selectedMessage.id);
    modal = null;
  }

  async function submitPollAction(
    action: 'savePoll' | 'deleteSavedPoll' | 'sendPoll' | 'sendPollAnswer' | 'pollDone',
    values: Record<string, string | number> = {}
  ) {
    const body = new FormData();
    for (const [key, value] of Object.entries(values)) body.set(key, String(value));

    const response = await fetch(`?/${action}`, { method: 'POST', body });
    if (!response.ok) return false;
    await invalidateAll();
    return true;
  }

  function openSessionControl(tab: SessionControlTab = 'reset-session') {
    sessionControlInitialTab = tab;
    openModal('session');
  }

  function setTheme(nextTheme: Theme) {
    theme = nextTheme;
    const body = new FormData();
    body.set('theme', nextTheme);
    void fetch('?/saveTheme', { method: 'POST', body });
  }

  function savePreference(key: string, value: unknown) {
    // Mirror into the decoded snapshot so anything that resolves a preference later in the same
    // session (the split sizes, for instance) sees the write instead of the value the page was
    // server-rendered with.
    loadedSettings[key] = value;

    if (key === 'chatStyle' && value && typeof value === 'object' && !Array.isArray(value)) {
      globalChatStyle = {
        ...globalChatStyle,
        ...(value as Partial<FollowChatStyle>)
      };
    }
    if (key === 'roomSplitDir' && isRoomSplitDir(value)) {
      roomSplitDir = value;
      loadStoredSplitSizes(value);
    }
    if (typeof value === 'boolean') {
      if (key === 'alertSoundOn') {
        alertSoundOn = value;
        soundChecks['alert-donot-disturb'] = value;
      }
      if (key === 'nonTradeSound') {
        nonTradeSound = value;
        soundChecks['non-trade-donot-disturb'] = value;
      }
      if (key === 'alertPopup') alertPopup = value;
      if (key === 'longerAlertPopup') longerAlertPopup = value;
      if (key === 'qaSoundOn') {
        qaSoundOn = value;
        soundChecks['qa-donot-disturb'] = value;
      }
      if (key === 'chatSoundOn') {
        chatSoundOn = value;
        soundChecks['chat-donot-disturb'] = value;
      }
      /*
        INVERTED, and the inversion is the whole point: the modal reports whether the box is
        TICKED, and a ticked box means video is enabled. `updateSettingCheck` sends `input.checked`
        under the reference's own preference name, and the label reads "Enabled" when checked -
        matching the reference's `checked: !preferences.disableVideo`
        (`app-user-settings-modal.full.js:3070`). Storing `value` here rather than `!value` would
        blank the screens pane for every viewer who has video ON, which is all of them by default.
      */
      if (key === 'disableVideo') videoDisabled = !value;
      /*
        Four preferences whose CONSUMER already existed and whose control never reached it. The
        modal writes them under their reference names (see the mapping table in
        `ModalHost.svelte`); these lines are the other half, because persisting a preference does
        not move the state this page already read it into. Without them the setting would take
        effect only after a reload — which is how `recordingStartSound` behaved: the checkbox
        flipped, the POST succeeded, and the sound still played.
      */
      if (key === 'recordingStartSound') recordingStartSound = value;
      if (key === 'recordingStopSound') recordingStopSound = value;
      if (key === 'pushToTalk') pushToTalk = value;
      if (key === 'doSpeechReco') doSpeechReco = value;
      if (key === 'alwaysScrollToBottom') alwaysScrollToBottom = value;
      if (key === 'makeUsersFollowMyScreens') makeUsersFollowMyScreens = value;
      if (key === 'chatGif') chatGif = value;
      if (key === 'chatBadges') chatBadges = value;
      if (key === 'chatPopup') chatPopup = value;
      if (key === 'trimChatLogs') trimChatLogs = value;
      /*
        Both halves, because this preference has TWO controls: the navbar's
        `presentation-subtitles` checkbox and the settings modal's `app-speech-reco-overlay`. The
        navbar one sets `soundChecks` itself before calling here, so that line is redundant for it
        and load-bearing for the modal — without it, changing the setting from the modal would open
        the overlay while the navbar checkbox went on reading "off".
      */
      if (key === 'showSpeechRecoOverlay') {
        subtitles = value;
        soundChecks['presentation-subtitles'] = value;
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
      /*
        The same nineteen dead keys are in localStorage too, and the server's prune cannot reach
        them: `savePreference` writes both stores, so the element-id fallback left a copy in each.
        Removed here on the next preference change of any kind, which is the same converge-on-use
        rule the server side uses — no startup pass, nothing to run, and idempotent once clean.
      */
      for (const dead of DEAD_PREFERENCE_KEYS) localStorage.removeItem(dead);
    }
    const body = new FormData();
    body.set('key', key);
    body.set('value', JSON.stringify(value));
    void fetch('?/savePreference', { method: 'POST', body });
  }

  function closeFloatingMenus() {
    volumeOpen = false;
    recordingMenuOpen = false;
    soundCloudMenuOpen = false;
    screenShareMenuOpen = false;
    rosterSortOpen = false;
    archivesMenuOpen = false;
    notesMenuOpen = false;
    filesMenuOpen = false;
    userMenuId = null;
    messageMenuId = null;
  }

  function sameCalendarDay(current: Date, previous?: Date) {
    if (!previous) return false;
    return (
      current.getFullYear() === previous.getFullYear() &&
      current.getMonth() === previous.getMonth() &&
      current.getDate() === previous.getDate()
    );
  }

  function openImageModal(event: MouseEvent | undefined, url: string) {
    const ctrlClick = (event as (MouseEvent & { ctrlClick?: boolean }) | undefined)?.ctrlClick;
    if (event && (event.shiftKey || event.altKey || ctrlClick)) {
      const imageWindow = window.open('', '', 'toolbar=0,location=0,resizable=1,scrollbars=1');
      if (!imageWindow) return;
      imageWindow.document.write(`<!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${url}</title>
                <style>
                  html,
                  body {
                      height: 100%;
                      width: 100%;
                      overflow-x: hidden;
                      overflow-y: auto;
                      background-color: #000;
                  }

                  body {
                      display: flex;
                      align-items: center;
                      justify-content: center;
                  }
                </style>
              </head>
              <body>
                <img src="${url}" alt="${url}" />
              </body>
            </html>`);
      return;
    }
    selectedImageUrl = url;
  }

  function downloadImage(url: string) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onload = () => {
      const urlCreator = window.URL;
      const imageUrl = urlCreator.createObjectURL(xhr.response);
      const tag = document.createElement('a');
      let imageName = url.split('/').pop() || 'image.jpg';
      imageName = imageName.replace(/^[^_]+_/, '').replace(/_[^_]+(\.[^.]+)$/, '$1');
      tag.href = imageUrl;
      tag.download = imageName;
      tag.style.display = 'none';
      document.body.appendChild(tag);
      tag.click();
      tag.remove();
      urlCreator.revokeObjectURL(imageUrl);
    };
    xhr.send();
  }

  function clearToastTimer(id: number) {
    const timer = toastTimers.get(id);
    if (timer !== undefined) globalThis.clearTimeout(timer);
    toastTimers.delete(id);
  }

  function dismissToast(id: number) {
    clearToastTimer(id);
    toasts = toasts.filter((toast) => toast.id !== id);
  }

  function scheduleToastRemoval(id: number, timeOut: number) {
    clearToastTimer(id);
    toastTimers.set(
      id,
      globalThis.setTimeout(() => {
        dismissToast(id);
      }, timeOut)
    );
  }

  /**
   * @param timeOut milliseconds, or **0 for a toast that never expires** — toastr's
   *   `disableTimeOut: true`. The reconnect toasts below use it: a banner that says "reconnecting"
   *   must not clear itself while the thing is still disconnected.
   * @returns the id, so a sticky toast can be cleared by whatever raised it. `null` when the notice
   *   was a duplicate and nothing was added.
   */
  function showToast(notice: Omit<ToastNotice, 'id'>, timeOut = 5_000): number | null {
    const duplicate = toasts.some(
      (toast) => toast.title === notice.title && toast.message === notice.message
    );
    if (duplicate) return null;

    const id = ++toastSequence;
    toasts = [{ id, ...notice }, ...toasts];
    if (timeOut > 0) scheduleToastRemoval(id, timeOut);
    return id;
  }

  /**
   * The media server's connection toasts, verbatim from the captured room:
   *
   *   appEventBus.subscribe("mediaServerConnected", e => {
   *     this.isMediaConnected = !0, this.alertService.success("Connected to Media Server") })
   *   appEventBus.subscribe("mediaServerDisconnected", e => {
   *     this.isMediaConnected = !1,
   *     this.alertService.error("Disconnected from Media Server... reconnecting...") })
   *
   * `success` and `error` are toastr skins, so the geometry and colour come from the captured
   * stylesheet with nothing declared here: `.ngx-toastr` is 300px wide with
   * `padding: 15px 15px 15px 50px`, `border-radius: 3px` and a 24px icon inset 15px from the left,
   * `.toast-success` is `rgb(81, 163, 81)` and `.toast-error` `rgb(189, 54, 47)`. Both messages are
   * passed with no title, exactly as the capture calls them.
   */
  /**
   * The two sticky reconnect toasts, read out of the reference's own room bundle.
   *
   * `docs/source/main.d6d3c112b59b7d0d.js`, in the mediasoup socket's `disconnect` handler:
   *
   *     i.reconnectToast || (i.reconnectToast = i.toastr.info(
   *       'Reconnecting to media... <i class="fas fa-cog fa-spin ms-2"></i>', "Media",
   *       { disableTimeOut: !0, tapToDismiss: !0, closeButton: !0, enableHtml: !0 }))
   *
   *     (i.liveMicTrack || i.liveCamTrack || i.liveScreenTrack) && !i.presenterReconnectToast && (
   *       i.presenterReconnectToast = i.toastr.info(
   *         "Reconnecting media (presenter)... re-sharing mic/cam/screen", "Presenter",
   *         { disableTimeOut: !0, tapToDismiss: !1, closeButton: !1 }))
   *
   * These are DISTINCT from the `mediaServerConnected`/`mediaServerDisconnected` bus toasts already
   * handled below — the reference raises both, and its bundle still carries "Connected to Media
   * Server" and "Disconnected from Media Server" alongside these.
   *
   * `disableTimeOut` is why they are held by id: a banner that says "reconnecting" must not expire
   * while the thing is still disconnected, so it is cleared by the event that makes it false rather
   * than by a timer. The `||` guard is the reference's own — one at a time, however many redials
   * the backoff runs.
   *
   * The presenter one is raised only when this peer holds a live track, and the reference makes it
   * **undismissable** (`tapToDismiss: false, closeButton: false`) where the member one can be
   * dismissed. That asymmetry is deliberate there and reproduced here: a presenter whose mic is
   * being re-shared needs to know it, and the toast goes when the re-share finishes.
   */
  let reconnectToastId: number | null = null;
  let presenterReconnectToastId: number | null = null;

  function mediaServerConnected(reconnected: boolean) {
    isMediaConnected = true;
    /*
      Cleared here, on the socket's `connect`, exactly where the reference clears them — inline in
      that handler beside `emit("mediaServerConnected")` and `reproduceLocalTracksIfAny()`.

      Its own `clearReconnectToasts()` method duplicates this body and is never called from
      anywhere in the bundle; that is dead code upstream, not a second path, so there is nothing
      else to reproduce.
    */
    if (reconnectToastId !== null) {
      dismissToast(reconnectToastId);
      reconnectToastId = null;
    }
    if (presenterReconnectToastId !== null) {
      dismissToast(presenterReconnectToastId);
      presenterReconnectToastId = null;
    }
    // ALWAYS, not just on a redial. A toast that says "reconnecting..." is false the instant the
    // socket opens, and gating this on `reconnected` left the error on screen forever whenever the
    // first connect of a session happened to follow a failed one.
    dismissToastsMatching('Disconnected from Media Server');
    showToast({ kind: 'success', message: 'Connected to Media Server', enableHtml: false });
  }

  /**
   * Raised on the TRANSITION into a disconnected state, never per redial attempt.
   *
   * The capture subscribes to an event bus - `appEventBus.subscribe("mediaServerDisconnected", ...)`
   * - which is a state change. Our signalling client emits `disconnected` from `#onClose`, and
   * `#onClose` also runs for every FAILED reconnect attempt, so this was firing on a backoff
   * schedule that climbs to one every 30s (`maxReconnectDelayMs: 30_000`).
   *
   * `showToast` dedupes an identical message, but its 5s timer still expires, so each retry raised
   * a fresh toast the moment the previous one cleared. With the media server down the banner was
   * permanent - which is exactly what it did when I killed the SFU and left it dead.
   */
  function mediaServerDisconnected() {
    if (!isMediaConnected) return;
    isMediaConnected = false;
    showToast({
      kind: 'error',
      message: 'Disconnected from Media Server... reconnecting...',
      enableHtml: false
    });

    // The sticky pair, raised beside the bus toast exactly as the reference raises them.
    if (reconnectToastId === null) {
      reconnectToastId = showToast(
        {
          kind: 'info',
          title: 'Media',
          message: 'Reconnecting to media... <i class="fas fa-cog fa-spin ms-2"></i>',
          enableHtml: true
        },
        0
      );
    }
    // Only when this peer is actually producing something to re-share.
    /*
      The reference's `liveMicTrack || liveCamTrack || liveScreenTrack`, mapped onto what this room
      actually holds: `localMicProducerId` is its `micProducer`, `webcamStream` its camera, and
      `localScreenStreams` its screen shares. A mic that is MUTED still counts — muting pauses the
      producer rather than closing it, so there is still a track to re-share.
    */
    const holdsLiveTrack = Boolean(
      localMicProducerId || webcamStream || localScreenStreams.size > 0
    );
    if (holdsLiveTrack && presenterReconnectToastId === null) {
      presenterReconnectToastId = showToast(
        {
          kind: 'info',
          title: 'Presenter',
          message: 'Reconnecting media (presenter)... re-sharing mic/cam/screen',
          enableHtml: false
        },
        0
      );
    }
  }

  /**
   * Turns one remote producer into a screen tab with a live picture.
   *
   * Only screen shares are handled here: the producing client tags them `{share: true, screenName}`
   * in `appData` and the server echoes that back verbatim, which is the only thing distinguishing a
   * screen from a webcam on the same `video` kind.
   *
   * Ordering matters. The tab is added BEFORE `consume()` resolves so the bar reflects the room
   * immediately, and the stream is filled in when it arrives - a tab with no picture is honest,
   * a picture with no tab is unreachable.
   */
  /**
   * `mediaService.saveData` — "Disable Video (saves bandwidth)", from the AV settings modal.
   *
   * DISTINCT from `videoDisabled` above, which is `preferences.disableVideo` from the USER settings
   * modal and swaps the screens and streams panes for a message. Both exist upstream, each with its
   * own control, and the original row in `TODO.md` conflated them. This one is the media-layer
   * switch, and it does something the pane preference does not: upstream
   * `callScreenOfUserWEBRTC` opens with
   * `this.saveData ? P("callScreenOfUserWEBRTC saveData on.. nop...") : (…)`
   * (`main.d6d3c112b59b7d0d.js` byte 1132193), so **the consumer is never created and no screen
   * stream is requested at all**. The `Video Disabled` h3 and the hidden `<video>` are only what the
   * viewer sees; the bandwidth saving is that nothing is fetched.
   *
   * Not persisted, matching the reference: the writer is
   * `toggleDisableVideo(){this.saveData=!this.saveData}` (byte 1136736) on the media service, which
   * calls no `setPreference`. It lasts the session.
   */
  let saveData = $state(false);

  /**
   * Screens whose stream was NOT fetched because `saveData` was on when they arrived.
   *
   * The reference re-consumes by a different route — selecting a tab calls
   * `startWatchScreenOf` -> `mediaService.startWatchingScreenOf`, so turning video back on and
   * clicking a tab re-requests it. This room consumes on producer ARRIVAL instead, so without
   * keeping the `ProducerInfo` a viewer who re-enabled video would see nothing until the presenter
   * happened to restart their share.
   *
   * A plain `Map`, not `SvelteMap`: nothing renders from it. It is bounded by the number of screens
   * in the room, and every entry is removed the moment it is consumed.
   */
  const deferredScreens = new Map<string, ProducerInfo>();

  /**
   * The one place `saveData` changes, so the re-consume cannot be forgotten at a second call site.
   *
   * Turning it ON does NOT tear down consumers that already exist, and that is the reference's
   * behaviour rather than an oversight on our part: `saveData` is read in exactly three places
   * upstream — `callScreenOfUserWEBRTC`, the `hidden` class and the `Video Disabled` h3 — and none
   * of them closes a consumer. So a screen already being watched keeps arriving and is hidden,
   * while screens that arrive AFTER the switch are never fetched. Stating it plainly because it
   * looks like a bug until you have read all three sites.
   */
  async function setSaveData(enabled: boolean) {
    saveData = enabled;
    if (enabled || deferredScreens.size === 0) return;
    /* `sessionReady` resolves to void — it is a barrier, not a handle. The session lives in
       `mediaSession`, which `restartMediaSession` sets to null while it rebuilds, so it is read
       AFTER the await rather than before. */
    await sessionReady;
    const session = mediaSession;
    if (!session) return;
    for (const [producerId, info] of [...deferredScreens]) {
      deferredScreens.delete(producerId);
      const remote = await session.consume(info);
      if (remote) screenStreams.set(producerId, remote.stream);
    }
  }

  async function addRemoteScreen(session: MediaSession, info: ProducerInfo) {
    const share = info.appData as { share?: unknown; screenName?: unknown } | null;
    if (info.kind !== 'video' || share?.share !== true) return;
    /*
     * Never consume your own screen.
     *
     * `newProducer` already excludes the producing peer (`notify_room(..., except: identity.id)`),
     * but the `getProducers` snapshot does not - it lists everything in the room, including what
     * this peer is producing. Consuming yourself asks the server for a consumer on a transport the
     * producing session does not own, which it refuses with
     * `unknownTransport: this session has no transport …`, and a presenter would see a duplicate
     * tab of their own screen.
     */
    if (legacyUserId(info.userId) === data.user.id) return;
    if (sharedScreens.some((screen) => screen.id === info.producerId)) return;
    // The Device must be loaded before `consume()` will do anything.
    await sessionReady;

    const screenName = typeof share.screenName === 'string' ? share.screenName : '';
    sharedScreens = [
      ...sharedScreens,
      {
        id: info.producerId,
        name: info.displayName ?? 'Presenter',
        screenName,
        // The producer carries no avatar. Resolve it from the roster when the peer is known;
        // gravatar's own `d=mm` placeholder otherwise, rather than inventing a hash.
        avatarUrl:
          data.connectedUsers.find((user) => user.id === legacyUserId(info.userId))?.avatarUrl ??
          'https://secure.gravatar.com/avatar/?d=mm&s=20'
      }
    ];
    // A viewer is brought to the screen too, not just the presenter sharing it. The capture emits
    // `selectScreenTabOfId` from the viewer's side as well - `callScreenOfUserWEBRTC` when a
    // viewer starts watching a screen, and `handleScreenSwitchToTalking` when the presenter who
    // starts talking has one - and without it a member sitting on Notes never learns a screen
    // exists. `selectScreenTabOfId` honours the lock, so a forced screen still cannot be stolen.
    selectScreenTabOfId(info.producerId);

    /*
      The gate, and it sits AFTER the tab is added on purpose. Upstream `saveData` stops
      `callScreenOfUserWEBRTC` from creating the consumer, but the screenshare view still renders —
      that is where the `Video Disabled` h3 lives — so the tab must exist for there to be anything
      to show. Skipping the tab as well would hide the fact that a presenter is sharing at all,
      which is not what the switch says it does.

      The `ProducerInfo` is kept so re-enabling can fetch it; see `setSaveData`.
    */
    if (saveData) {
      deferredScreens.set(info.producerId, info);
      return;
    }

    const remote = await session.consume(info);
    // `consume` returns null when this producer is already being consumed, which is the dedupe the
    // server's at-least-once `newProducer` requires.
    if (remote) screenStreams.set(info.producerId, remote.stream);
  }

  /**
   * Turns one remote WEBCAM producer into a floating presenter card.
   *
   * The sibling of {@link addRemoteScreen}, and the reason a member saw nothing when a presenter
   * turned their camera on. `appData.share` is the only thing separating a screen from a camera on
   * the same `video` kind - `produceScreen` tags `{share: true, screenName}` and `produceWebcam`
   * tags `{share: false}` - and `addRemoteScreen` returns early on anything that is not a share.
   * Nothing picked the remainder up, so a webcam producer was consumed by no one.
   *
   * The capture routes it the same way, by identity rather than by kind: `app-presenter-cams`'
   * `ngOnInit` does
   * `muser.isMe ? (pStream = localWebcamStream) : (subscribe('newWebcamStream', …),
   * connectToScreenOfProducer(muser))`.
   *
   * Card first, stream second - the same ordering `addRemoteScreen` uses and for the same reason:
   * a card with no picture is honest, a picture with no card is unreachable.
   */
  async function addRemoteWebcam(session: MediaSession, info: ProducerInfo) {
    const share = info.appData as { share?: unknown } | null;
    /*
      An EXPLICIT `share === false` is required, not merely "not true".

      The capture tags both kinds positively - `appData:{share:!1,isReconnect:o,prevMuserID:s}` for
      a camera and `appData:{share:!0,screenName:i,…}` for a screen - and this room's own
      `produceWebcam`/`produceScreen` do the same (`src/lib/media/session.ts:601,630`). So a video
      producer carrying NEITHER tag is neither a camera nor a screen, and guessing costs something:
      with `share !== true` this branch adopted every untagged or unknown video producer as a
      webcam and built a floating card for it that nothing could ever remove, because no
      `removeWebcamPresenter` would match a producer the room never really understood.
    */
    if (info.kind !== 'video' || share?.share !== false) return;
    // Never consume your own camera: the `getProducers` snapshot lists it, and the server refuses
    // a consumer on a transport the producing session owns.
    if (legacyUserId(info.userId) === data.user.id) return;
    if (webcamPresenters.some((entry) => entry.id === info.producerId)) return;
    await sessionReady;

    addWebcamPresenter({
      id: info.producerId,
      name: info.displayName ?? 'Presenter',
      isMe: false
    });

    const remote = await session.consume(info);
    // `consume` returns null when this producer is already being consumed - the dedupe the
    // server's at-least-once `newProducer` requires.
    if (remote) webcamStreams.set(info.producerId, remote.stream);
  }

  /**
   * Consumes one remote MICROPHONE and gives it somewhere to come out.
   *
   * This branch did not exist. Both `info.kind` guards in this room were `!== 'video'`
   * ({@link addRemoteScreen} and {@link addRemoteWebcam}), so an audio producer arriving from the
   * SFU was matched by nothing and dropped - which is the second half of "no voice in the members
   * room". The first half was that no microphone was ever produced.
   *
   * The stream is put in {@link remoteAudioStreams} and rendered as a hidden `<audio autoplay>`;
   * audio needs an element to play through, and there is no visible control for it.
   */
  async function addRemoteAudio(session: MediaSession, info: ProducerInfo) {
    if (info.kind !== 'audio') return;
    // Never consume your own microphone: the server refuses a consumer on the producing session's
    // own transport, and you would hear yourself.
    if (legacyUserId(info.userId) === data.user.id) return;
    if (remoteAudioStreams.has(info.producerId)) return;
    await sessionReady;

    const remote = await session.consume(info);
    if (remote) {
      remoteAudioStreams.set(info.producerId, remote.stream);
      // An open microphone IS the talking signal. Without this the room reports
      // "( No one is speaking )" while that peer's voice is plainly coming out of the speakers.
      const ownerId = legacyUserId(info.userId);
      if (ownerId !== null) {
        const owner = { userID: ownerId, name: info.displayName ?? 'Presenter' };
        audioProducerOwners.set(info.producerId, owner);
        startTalking({ userID: owner.userID, mediaValue: { name: owner.name } });
      }
    }
  }

  /** `producerPaused` - the capture's `presMuted`, i.e. that peer stopped talking. */
  function onRemoteAudioPaused(producerId: string) {
    const owner = audioProducerOwners.get(producerId);
    if (owner) stopTalking(owner.userID);
  }

  /** `producerResumed` - the capture's `presUnmuted`, i.e. that peer is talking again. */
  function onRemoteAudioResumed(producerId: string) {
    const owner = audioProducerOwners.get(producerId);
    if (owner) startTalking({ userID: owner.userID, mediaValue: { name: owner.name } });
  }

  function removeRemoteAudio(producerId: string) {
    remoteAudioStreams.delete(producerId);
    const owner = audioProducerOwners.get(producerId);
    if (owner) stopTalking(owner.userID);
    audioProducerOwners.delete(producerId);
  }

  /**
   * Attaches a consumed microphone to its element.
   *
   * NOT muted - this is someone else talking, which is the entire point. The room's master volume
   * applies, matching how every other remote stream is played here. A rejected `play()` is
   * surfaced: Chrome blocks audible autoplay without a gesture, and silence caused by policy looks
   * exactly like silence caused by a dead producer.
   */
  function attachRemoteAudio(producerId: string) {
    return (node: HTMLAudioElement) => {
      const stream = remoteAudioStreams.get(producerId) ?? null;
      if (node.srcObject !== stream) node.srcObject = stream;
      /*
        The master volume is deliberately NOT read here.

        An attachment re-runs when reactive state it reads changes, and its return value is the
        teardown - so reading `volume` inside it meant every tick of the slider destroyed the
        attachment (pausing the element and nulling `srcObject`) and rebuilt it, replaying `play()`
        each time. Dragging the slider produced a pause/replay storm and a stream of AbortErrors.
        `setMasterVolume` sets the level instead, by the `msRemAudio-` id the capture uses.
      */
      node.volume = Math.min(1, Math.max(0, untrack(() => volume) / 100));

      if (stream) {
        node.play().catch((error: unknown) => {
          console.warn(`[media] remote audio ${producerId} could not play`, error);
        });
      }

      return () => {
        node.pause();
        node.srcObject = null;
      };
    };
  }

  /** `removePresenterWebcam` - the card is destroyed and its stream dropped. */
  function removeRemoteWebcam(producerId: string) {
    webcamStreams.delete(producerId);
    removeWebcamPresenter(producerId);
  }

  /**
   * Gives the presenter a tab for a screen they are sharing themselves.
   *
   * `addRemoteScreen` refuses our own producer on purpose - consuming yourself is refused by the
   * server with `unknownTransport` - which left a presenter sharing a screen with no tab for it at
   * all, seeing only other people's. The capture does not consume its own screen either; it adds a
   * LOCAL one:
   *
   * ```js
   * this.globals.user.id == r.userID && (
   *   this.isScreenSharing = !0, this.addLocalStream(r), …,
   *   setTimeout(() => { this.guiEventBus.emit("selectScreenTabOfId", r) }, 500))
   * ```
   *
   * So the stream behind this tab is the capture itself, straight from getDisplayMedia, never a
   * round trip through the SFU - which is also why it costs nothing and cannot fail.
   */
  /**
   * `selectScreenTabOfId` - bring the presentation area to a screen.
   *
   * Transcribed from the capture, and the FIRST line is the one that matters:
   *
   * ```js
   * guiEventBus.subscribe("selectScreenTabOfId", e => {
   *   if (!globals.lockedScreenID || globals.lockedScreenID === e._id) {
   *     this.selectedMainTab = "presAreaTabs-screens";
   *     if (this.selectedScreenShareTab == e._id) return;
   *     this.selectedScreenShareTab = e._id;
   *     this.onScreenShareTabChange(e._id, !1)
   *   }
   * })
   * ```
   *
   * Selecting the screen's own tab was already done here; switching the MAIN tab was not, and that
   * is why a shared screen appeared to render nothing. This room opens on Notes
   * (`mainTab = 'notes'`), so the screen, its tab and its video were all being built inside
   * `#screensTabsContent` while that entire pane sat hidden behind another tab. Every check that
   * asked the `<video>` for `videoWidth` or `currentTime` passed, because a hidden pane does not
   * invalidate the element - which is exactly how it went unnoticed.
   *
   * The lock is the capture's own guard: while a presenter has forced everyone to one screen, a
   * newly arriving screen must not steal the view.
   */
  function selectScreenTabOfId(producerId: string) {
    // A detached window exists to show ONE screen. Anything else arriving must not steal it.
    if (detachedScreenId !== null && detachedScreenId !== producerId) return;
    if (lockedScreenId && lockedScreenId !== producerId) return;
    mainTab = 'screens';
    if (selectedScreenTab === producerId) return;
    selectedScreenTab = producerId;
  }

  function addLocalScreen(producerId: string, screenName: string, stream: MediaStream) {
    if (sharedScreens.some((screen) => screen.id === producerId)) return;
    sharedScreens = [
      ...sharedScreens,
      {
        id: producerId,
        name: data.user.displayName,
        screenName,
        avatarUrl: data.user.avatarUrl
      }
    ];
    screenStreams.set(producerId, stream);

    // `setTimeout(() => guiEventBus.emit("selectScreenTabOfId", r), 500)` in the capture: the view
    // moves to the new screen a moment after it appears rather than in the same frame.
    globalThis.setTimeout(() => {
      if (sharedScreens.some((screen) => screen.id === producerId)) {
        selectScreenTabOfId(producerId);
      }
    }, 500);
  }

  /**
   * Keeps every consumer's layer in step with what the viewer is actually looking at.
   *
   * The selected screen gets the producer's top layer; every other screen drops to spatial layer 0.
   * Without this, N shared screens cost N times the bandwidth and N times the decode no matter
   * which tab is on top - a viewer with four presenters sharing pays for four full-resolution
   * streams to look at one.
   *
   * Layer 9 rather than a real maximum: mediasoup clamps a request above what the producer offers
   * (proven in `session.rs`'s `a_consumers_preferred_layers_can_be_set_and_clamped`), so asking
   * high is how a client says "the best you have" without knowing whether the producer sent SVC,
   * simulcast or a single layer.
   */
  const TOP_SPATIAL_LAYER = 9;

  async function applyScreenLayers() {
    const session = mediaSession;
    if (!session) return;
    for (const screen of sharedScreens) {
      if (!screenStreams.has(screen.id)) continue;
      // Our own screens play from the local capture and are never consumed, so there is no
      // consumer whose layers could be preferred - asking would earn one `unknownConsumer` warning
      // per tab switch for a stream that was never going over the network in the first place.
      if (localScreenStreams.has(screen.id)) continue;
      try {
        await session.setPreferredLayers(
          screen.id,
          screen.id === selectedScreenTab ? TOP_SPATIAL_LAYER : 0
        );
      } catch (error) {
        // Not fatal: the stream keeps playing at whatever layer it already had.
        console.warn(`[media] could not set layers for screen ${screen.id}`, error);
      }
    }
  }

  /**
   * Starts captioning this peer's speech.
   *
   * Gated as the capture gates it:
   *
   *   "Speech recognition not started: disabled by preferences or session settings"
   *   "Speech recognition not started: mic is muted or not enabled"
   *
   * so it needs the session-level `doSpeechReco` on and a live microphone - and here, a presenter,
   * because the server refuses `sendSpeechReco` from a member. `subtitles` is deliberately NOT a
   * gate: that is the per-viewer overlay preference, and a presenter who hides captions on their own
   * screen should still caption for everybody else.
   */
  function beginSpeechRecognition() {
    if (stopSpeechReco || !isPresenter || !doSpeechReco || !mediaSession) return;

    stopSpeechReco = startSpeechRecognition({
      isMicAlive: () => microphoneStream?.getAudioTracks()[0]?.readyState === 'live',
      onresult: (result) => {
        void mediaSignalling
          ?.request('sendSpeechReco', result)
          .catch((error: unknown) => console.warn('[captions] a line was not relayed', error));
      },
      onfatal: (reason) => {
        console.warn('[captions] recognition stopped:', reason);
        endSpeechRecognition();
      }
    });
  }

  function endSpeechRecognition() {
    stopSpeechReco?.();
    stopSpeechReco = null;
  }

  function removeRemoteScreen(producerId: string) {
    closeScreenPopout(producerId);
    screenStreams.delete(producerId);
    stopSharedScreen(producerId);
  }

  function dismissToastsMatching(fragment: string) {
    for (const toast of toasts) {
      if (toast.message.includes(fragment)) dismissToast(toast.id);
    }
  }

  function showInfoToast(message: string) {
    showToast({ kind: 'info', message, enableHtml: false });
  }

  function stickToast(id: number) {
    clearToastTimer(id);
  }

  function resumeToast(id: number) {
    if (toasts.some((toast) => toast.id === id)) scheduleToastRemoval(id, 1_000);
  }

  function decodeHtmlEntities(value: string) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
  }

  function requestAlertBrowserNotification(
    title: string,
    message: string,
    icon: string | null | undefined,
    emailHash: string
  ) {
    if (!('Notification' in window)) return;

    void Notification.requestPermission()
      .then((permission) => {
        if (permission !== 'granted' && permission !== 'default') {
          console.log('User blocked notifications.');
          return;
        }
        const notificationIcon =
          icon || `https://secure.gravatar.com/avatar/${emailHash}?d=mm&s=50`;
        new Notification(title, {
          body: decodeHtmlEntities(message),
          icon: notificationIcon
        });
      })
      .catch((error: unknown) => {
        console.error(error);
      });
  }

  function deliverAlert(alert: {
    senderName: string;
    senderEmailHash: string;
    senderAvatarUrl?: string | null;
    body: string;
    nonTrade?: boolean;
  }) {
    const delivery = resolveAlertDelivery(
      {
        senderName: alert.senderName,
        body: alert.body,
        nonTradeAlert: alert.nonTrade === true
      },
      {
        doNotDisturbOn,
        alertSoundOn,
        nonTradeSound,
        alertPopup,
        longerAlertPopup
      }
    );
    if (!delivery) return;

    if (delivery.sound) playSoundEffect(delivery.sound);
    if (!delivery.toast) return;

    const { timeOut, ...toast } = delivery.toast;
    showToast(toast, timeOut);
    requestAlertBrowserNotification(
      delivery.toast.title,
      delivery.toast.message,
      alert.senderAvatarUrl,
      alert.senderEmailHash
    );
  }

  // A new Q&A entry notifies exactly the people the compiled roomscroller notifies:
  //
  //   if (s.uid !== globals.user.userXrefID && !r) {
  //     const f = s.isA ? 'answer' : 'question';
  //     for (let _ of o.qa) _.uid === globals.user.userXrefID && (
  //       preferences.doNotDisturbOn || (!l && preferences.qaSoundOn && soundEffectsService.qaAlert.play()),
  //       !l && preferences.alertPopup && alertService.info(
  //         `"${s.txt}" for alert: "${o.txt}" by ${o.n}`, `Alert ${f} from @${s.n}`)) }
  //   globals.user.isPresenter && ( ...the same... );
  //
  // so: never for your own post, otherwise every presenter plus anyone who has asked on that same
  // alert. `alertService.info` is the cyan `.toast-info` skin (background rgb(47, 150, 180)) and
  // `qaAlert` is clearly.mp3, which is why it sounds different from an alert's `cash`.
  const seenQuestionIds = new Set<number>();
  let qaNoticesPrimed = false;

  function deliverQaNotice(question: (typeof data.alertQuestions)[number]) {
    if (question.senderId === data.user.id) return;

    const alert = data.alerts.find((item) => item.id === question.alertId);
    if (!alert) return;

    const askedOnThisAlert = data.alertQuestions.some(
      (other) => other.alertId === question.alertId && other.senderId === data.user.id
    );
    if (!isPresenter && !askedOnThisAlert) return;

    if (!doNotDisturbOn && qaSoundOn) playSoundEffect('qaAlert');
    if (!alertPopup) return;

    const senderIsPresenter =
      question.senderRole === 'staff' || question.senderRole === 'admin';
    showToast({
      kind: 'info',
      title: `Alert ${senderIsPresenter ? 'answer' : 'question'} from @${question.senderName}`,
      message: `"${question.body}" for alert: "${alert.body}" by ${alert.senderName}`,
      enableHtml: false
    });
  }

  $effect(() => {
    const questions = data.alertQuestions;

    // The first run is whatever was already stored when the page loaded, not news: seed the set so
    // a reader opening the room does not get a toast per historical question.
    if (!qaNoticesPrimed) {
      for (const question of questions) seenQuestionIds.add(question.id);
      qaNoticesPrimed = true;
      return;
    }

    for (const question of questions) {
      if (seenQuestionIds.has(question.id)) continue;
      seenQuestionIds.add(question.id);
      // updateAlertMsg sets the marker for whoever receives the update, with no role check.
      unreadQaAlertIds.add(question.alertId);
      deliverQaNotice(question);
    }

    // DELIBERATE DEVIATION from the captured app, on an explicit product decision.
    //
    // Upstream the flash is purely an unread marker: the class binds to `msg.unreadQA` alone
    // (`ut(4, mge, (null == e.msg ? null : e.msg.unreadQA) || !1)` - `msg.ans` never appears in
    // it), it is set by updateAlertMsg on any Q&A update, and the only two things that clear it
    // are opening the modal (`openAlertQAModal`) and hiding it (`hidden.bs.modal`). Answering
    // clears nothing upstream; even app-alert-qa-modal, which handles answering, touches
    // `unreadQA` only in its hide handler.
    //
    // Here an alert stops flashing as soon as it has no unanswered question left, so the flash
    // reads as "someone is waiting on you" rather than "there is something you have not opened".
    // The two upstream clears still apply in the meantime.
    const answered = [...unreadQaAlertIds].filter(
      (alertId) => !questions.some((question) => question.alertId === alertId && !question.answeredAt)
    );
    for (const alertId of answered) unreadQaAlertIds.delete(alertId);
  });

  // app-chat plays `pling` for an incoming chat message under exactly this gate:
  //   preferences.doNotDisturbOn || (preferences.chatSoundOn && soundEffectsService.pling.play())
  // Your own message does not ring, and one ring covers a batch that arrives together rather than
  // one per message.
  const seenMessageIds = new Set<number>();
  let chatSoundPrimed = false;

  $effect(() => {
    // Re-runs when the viewer switches tabs or a screen arrives/leaves.
    void selectedScreenTab;
    void screenStreams.size;
    void applyScreenLayers();
  });

  $effect(() => {
    const roomMessages = data.messages;

    if (!chatSoundPrimed) {
      for (const message of roomMessages) seenMessageIds.add(message.id);
      chatSoundPrimed = true;
      return;
    }

    let incoming = false;
    for (const message of roomMessages) {
      if (seenMessageIds.has(message.id)) continue;
      seenMessageIds.add(message.id);
      if (message.senderId !== data.user.id) incoming = true;
    }

    if (incoming && !doNotDisturbOn && chatSoundOn) playSoundEffect('pling');
  });

  async function runMessageOperation(
    kind: 'alert' | 'chat',
    item: MessageActionItem,
    operation: 'delete' | 'markAnswered' | 'mute24' | 'showMsgToAll'
  ) {
    const form = new FormData();
    form.set('kind', kind);
    form.set('id', String(item.id));
    form.set('operation', operation);
    form.set('targetUserId', String(item.senderId));
    const response = await fetch('?/messageAction', { method: 'POST', body: form });
    // A refused action still answers 200 - SvelteKit puts the failure in the body, not the status -
    // so `response.ok` reports "the request arrived", not "the operation happened". Anything that
    // undoes an optimistic update on failure has to read the result itself.
    const result = deserialize<{ success?: boolean }, { message?: string }>(await response.text());
    const succeeded = result.type === 'success';
    if (succeeded && (operation === 'delete' || operation === 'markAnswered')) {
      await invalidateAll();
    }
    return succeeded;
  }

  async function editMessage(kind: 'alert' | 'chat', item: MessageActionItem, newBody: string) {
    const form = new FormData();
    form.set('kind', kind);
    form.set('id', String(item.id));
    form.set('operation', 'edit');
    form.set('newBody', newBody);
    const response = await fetch('?/messageAction', { method: 'POST', body: form });
    // As in runMessageOperation: a refused action answers 200 with the failure in the body, so the
    // status alone cannot tell an edit that was applied from one that was rejected.
    const result = deserialize<{ success?: boolean }, { message?: string }>(await response.text());
    const succeeded = result.type === 'success';
    if (succeeded) await invalidateAll();
    return succeeded;
  }

  async function toggleMessageReaction(
    kind: 'alert' | 'chat',
    item: MessageActionItem,
    reaction: MessageReactionPayload
  ) {
    const form = new FormData();
    form.set('kind', kind);
    form.set('id', String(item.id));
    form.set('operation', 'reaction');
    form.set('reactionKey', reaction.key);
    form.set('reactionEmoji', reaction.emoji);
    const response = await fetch('?/messageAction', { method: 'POST', body: form });
    // As in runMessageOperation: a refused action answers 200 with the failure in the body.
    const result = deserialize<{ success?: boolean }, { message?: string }>(await response.text());
    const succeeded = result.type === 'success';
    if (succeeded) await invalidateAll();
    return succeeded;
  }

  function toggleEvidenceReaction(
    item: MessageActionItem,
    reactionPayload: MessageReactionPayload
  ) {
    const reactions = structuredClone(item.reactions ?? {});
    const reaction = reactions[reactionPayload.key] ?? {
      emoji: reactionPayload.emoji,
      clickedBy: []
    };
    const index = reaction.clickedBy.indexOf(data.user.emailHash);

    if (index >= 0) reaction.clickedBy.splice(index, 1);
    else reaction.clickedBy.push(data.user.emailHash);

    if (reaction.clickedBy.length === 0) delete reactions[reactionPayload.key];
    else reactions[reactionPayload.key] = reaction;

    updateEvidenceMessage(item, { reactions });
  }

  async function sendAlertQuestion(body: string) {
    if (!selectedMessage) return false;
    const form = new FormData();
    form.set('body', body);
    form.set('alertId', String(selectedMessage.id));
    const response = await fetch('?/askQuestion', { method: 'POST', body: form });
    if (!response.ok) return false;
    await invalidateAll();
    return true;
  }

  async function sendReplyMessage(body: string) {
    if (!selectedMessage) return false;
    const form = new FormData();
    form.set('body', body);
    form.set('messageId', String(selectedMessage.id));
    const response = await fetch('?/replyMessage', { method: 'POST', body: form });
    if (response.ok) {
      await invalidateAll();
      return true;
    }
    return false;
  }

  function mentionUser(name: string) {
    composer += `${composer ? ' ' : ''}@${name} `;
    requestAnimationFrame(() => {
      composerElement?.focus();
      composerElement?.setSelectionRange(composer.length, composer.length);
    });
  }

  function handleMessageAction(
    kind: 'alert' | 'chat',
    action: MessageAction,
    item: MessageActionItem,
    payload?: MouseEvent | MessageReactionPayload
  ) {
    if (action !== 'reaction') messageMenuId = null;
    selectedMessage = item;
    selectedMessageUser = {
      id: item.senderId,
      nick: item.senderName,
      emailHash: item.senderEmailHash,
      pic: item.senderAvatarUrl,
      status: item.senderStatus ?? 'offline',
      ...(item.senderStatus && item.senderStatus !== 'offline'
        ? { userXrefID: String(item.senderId), _id: String(item.senderId) }
        : {})
    };

    if (action === 'user') openModal('user');
    if (action === 'mention') mentionUser(item.senderName);
    if (action === 'reply') openModal('reply');
    if (action === 'report') openModal('report');
    if (action === 'question') {
      // `openAlertQAModal` clears the marker as it opens:
      //   e.hasOwnProperty('unreadQA') && delete e.unreadQA
      unreadQaAlertIds.delete(item.id);
      openModal('qa');
    }
    /*
      `startPrivChat`, verbatim:

        guiEventBus.subscribe('startPrivChat', i =>
          i.user._id != globals.user.id
            ? (privChatInited || (privChatInited = !0, initPMDrag()),
               privChatVisible = !0,
               guiEventBus.emit('PCfocusOnUser', {uid: i.uid, isInit: i.isInit, user: i.user}))
            : bootbox.alert('Chatting with yourself again?'))

      Picking "Private Chat" on your OWN message does not open a panel in the capture - it shows
      that alert and stops. The server refuses it too, but by then the panel has already opened on
      an empty conversation with yourself, which is not what the original does.
    */
    if (action === 'private') {
      if (item.senderId === data.user.id) {
        bootboxAlert = 'Chatting with yourself again?';
        return;
      }
      showPrivateChat();
      // `PCfocusOnUser` - open straight onto that person's thread rather than the tab list.
      void switchChatToUser(item.senderId);
    }
    if (action === 'image' && item.targetUrl) {
      openImageModal(payload instanceof MouseEvent ? payload : undefined, item.targetUrl);
    }
    if (action === 'delete') {
      const event = payload instanceof MouseEvent ? payload : undefined;
      const deleteMessage = () => {
        // Captured items used to stop here, hidden in this browser's memory and nowhere else - so
        // a presenter deleting an alert watched it vanish while every member kept being served it
        // from the fixture on every poll, forever. The local hide stays as the optimistic update,
        // because the server round-trip and its invalidate take a moment and the row should not
        // linger under the cursor; the server call is what makes it stick for the room.
        if (item.evidenceKey) updateEvidenceMessage(item, { hidden: true });
        void runMessageOperation(kind, item, 'delete').then((succeeded) => {
          // A member may only delete what the capture attributes to them, and the server is what
          // decides that. Put a refused item back rather than leaving it hidden for this viewer
          // alone - that is the same one-sided disappearance this change exists to remove.
          if (!succeeded && item.evidenceKey) updateEvidenceMessage(item, { hidden: false });
        });
      };
      if (event?.shiftKey) {
        deleteMessage();
      } else {
        const noun = kind === 'alert' ? 'alert' : 'message';
        bootboxConfirmation = {
          message:
            data.user.role === 'staff' || data.user.role === 'admin'
              ? `Are you sure you want to delete this ${noun} by ${item.senderName}. text: ${item.body}`
              : `Are you sure you want to delete your message: ${item.body}`,
          onconfirm: () => {
            bootboxConfirmation = null;
            deleteMessage();
          }
        };
      }
    }
    if (action === 'mute') {
      if (item.senderId <= 0) {
        bootboxAlert = 'Could not retrieve user info.';
        return;
      }
      bootboxConfirmation = {
        message: 'Are you sure you want to mute this user for 24 hours?',
        onconfirm: () => {
          bootboxConfirmation = null;
          void runMessageOperation(kind, item, 'mute24').then((success) => {
            if (success) bootboxAlert = 'User chat muted.';
          });
        }
      };
    }
    if (action === 'show-all') {
      void runMessageOperation(kind, item, 'showMsgToAll');
    }
    if (action === 'answered') {
      // Optimistic for the captured case, then persisted - the same shape the delete uses. Marking
      // answered in this browser alone left the ✅ invisible to everyone else, which is the whole
      // point of the marker.
      if (item.evidenceKey) updateEvidenceMessage(item, { answered: true });
      void runMessageOperation(kind, item, 'markAnswered').then((succeeded) => {
        if (!succeeded && item.evidenceKey) updateEvidenceMessage(item, { answered: false });
      });
    }
    if (action === 'copy' && typeof navigator !== 'undefined') {
      const container = document.createElement('div');
      container.innerHTML = item.body;
      const plainText = container.textContent ?? '';
      void navigator.clipboard.writeText(plainText).then(() => {
        showInfoToast('Copied to clipboard.');
      });
    }
    if (action === 'edit') {
      bootboxPrompt = {
        title: kind === 'chat' ? 'Edit chat message:' : `Edit alert by ${item.senderName}:`,
        value: item.body,
        onconfirm: (value) => {
          const newBody = value.trim();
          if (!newBody) return;
          bootboxPrompt = null;
          const previousBody = item.body;
          if (item.evidenceKey) updateEvidenceMessage(item, { body: newBody });
          void editMessage(kind, item, newBody).then((succeeded) => {
            if (!succeeded && item.evidenceKey) updateEvidenceMessage(item, { body: previousBody });
          });
        }
      };
    }
    if (action === 'reaction' && payload && !(payload instanceof MouseEvent) && 'key' in payload) {
      // Optimistic locally so the pill responds under the cursor, then persisted. The server does
      // the same toggle against the stored override, so it - not this browser - decides the result.
      const previousReactions = item.evidenceKey ? structuredClone(item.reactions ?? {}) : null;
      if (item.evidenceKey) toggleEvidenceReaction(item, payload);
      void toggleMessageReaction(kind, item, payload).then((succeeded) => {
        if (!succeeded && previousReactions) {
          updateEvidenceMessage(item, { reactions: previousReactions });
        }
        window.setTimeout(() => {
          messageMenuId = null;
        }, 500);
      });
    }
  }

  function countFiles(kind: FileTab) {
    const singularKind = kind === 'files' ? 'file' : kind.slice(0, -1);
    return data.files.filter((item) => item.kind === singularKind).length;
  }

  function setInputChecked(checked: boolean) {
    return (node: HTMLInputElement) => {
      node.checked = checked;
    };
  }

  function setRangeValue(value: number) {
    return (node: HTMLInputElement) => {
      node.value = String(value);
    };
  }

  function updateSoundCheck(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    if (input.id === 'app-donot-disturb') {
      doNotDisturbOn = input.checked;
      return;
    }
    soundChecks[input.id] = input.checked;
    const preferenceKeyByInputId: Record<string, string> = {
      'alert-donot-disturb': 'alertSoundOn',
      'non-trade-donot-disturb': 'nonTradeSound',
      'qa-donot-disturb': 'qaSoundOn',
      'chat-donot-disturb': 'chatSoundOn',
      'presentation-subtitles': 'showSpeechRecoOverlay'
    };
    const preferenceKey = preferenceKeyByInputId[input.id];
    if (preferenceKey) savePreference(preferenceKey, input.checked);
  }

  function setMasterVolume(nextVolume: number) {
    volume = nextVolume;
    muted = nextVolume === 0;
    setSoundEffectsVolume(nextVolume / 100);
    if (typeof document !== 'undefined') {
      document
        .querySelectorAll<HTMLMediaElement>('[id^="msRemAudio-"], [id^="video-"]')
        .forEach((media) => {
          media.volume = nextVolume / 100;
        });
    }
    if (nextVolume === 0) subtitles = true;
  }

  function setBackgroundVolume(nextVolume: number) {
    backgroundVolume = nextVolume;
    if (typeof document === 'undefined') return;

    const mp3Player = document.getElementById('mp3player');
    if (mp3Player instanceof HTMLMediaElement) mp3Player.volume = nextVolume / 100;

    if (soundCloudPlaying) {
      const soundCloudFrame = document.getElementById('soundCloudIFrame');
      const soundCloud = (
        window as Window & {
          SC?: {
            Widget: (element: HTMLElement) => { setVolume: (value: number) => void };
          };
        }
      ).SC;
      if (soundCloudFrame && soundCloud) soundCloud.Widget(soundCloudFrame).setVolume(nextVolume);
    }

    window.dispatchEvent(new CustomEvent('setYTVolume', { detail: nextVolume }));
  }

  /**
   * `mute()` / `unmute()` as `app-presentationarea` defines them — the SCREEN OVERLAY's pair, which
   * is NOT the navbar's.
   *
   * ```text
   * mute()   { this.prevVolume = this.audioVolume; this.audioVolume = 0; this.adjustVol(null);
   *            this.appService.globals.preferences.doNotDisturbOn = !0 }
   * unmute() { this.audioVolume = this.prevVolume; this.adjustVol(null);
   *            this.appService.globals.preferences.doNotDisturbOn = !1 }
   * ```
   * (`app-presentationarea.compiled.js:923-933`)
   *
   * `app-room`'s copy of the same two methods (`app-room.compiled.js:807-823`) additionally sets
   * `preferences.subtitles` and drags the background music volume along with it. That is the
   * NAVBAR's behaviour and it is what {@link toggleMute} already does; the overlay's is deliberately
   * the shorter one, because the two components genuinely differ.
   *
   * One divergence, stated rather than hidden: `setMasterVolume` here also sets `subtitles = true`
   * at zero, because it was written from `app-room`'s `adjustVol` — the only `adjustVol` this room
   * had a caller for. `app-presentationarea`'s `adjustVol` has no such line. Splitting it would mean
   * two master-volume paths over one `volume` state, which is worse than the one line of drift.
   */
  function muteScreenAudio() {
    previousVolume = volume;
    setMasterVolume(0);
    doNotDisturbOn = true;
  }

  function unmuteScreenAudio() {
    setMasterVolume(previousVolume);
    doNotDisturbOn = false;
  }

  /**
   * Applies one presenter's volume to their audio sink.
   *
   * `ii('[id^=msRemAudio-' + o + ']').prop('volume', a)` — the reference reaches for the element by
   * the id prefix this room already emits (`msRemAudio-{userID}`, the hidden `<audio>` per remote
   * microphone). Same selector, same 0–1 range.
   */
  function applyPresenterVolume(userID: number, level: number) {
    if (typeof document === 'undefined') return;
    document
      .querySelectorAll<HTMLMediaElement>(`[id^="msRemAudio-${userID}"]`)
      .forEach((element) => {
        element.volume = level;
      });
  }

  /**
   * `toggleTalkingPresenter(user)` — the per-presenter mute checkbox.
   *
   * The state transition is in `$lib/screen-volume` and tested there. What is left here is the two
   * effects the reference pairs with it:
   *
   * 1. **The persistence**, `setPreference('audioMutedFor'|'audioVolumeFor', …)`, which is this
   *    room's `savePreference`.
   * 2. **The SFU half** — and this is an HONEST GAP rather than a reproduction.
   *    `mediaSoupService.startListeningToPresenter` / `stopListeningToPresenter` stop the server
   *    SENDING that presenter's audio; this room's signalling wire has no equivalent command
   *    (`Commands` in `src/lib/media/signalling.ts` carries `resumeConsumer`, `closeConsumer`,
   *    `pauseProducer`, `resumeProducer` — nothing that pauses a consumer, and `closeConsumer`
   *    cannot be undone without re-consuming from a `ProducerInfo` this page does not retain).
   *    So the mute is applied where it can be applied honestly: the listener's own audio element.
   *    The member hears exactly what the reference's member hears; the bandwidth saving is the part
   *    that is missing, and `TODO.md` records it with the exact command that would close it.
   */
  function toggleTalkingPresenterAudio(user: PresenterAudioUser) {
    const next = toggleTalkingPresenter(presenterAudio, user);
    presenterAudio = next.preferences;
    // Unmuting restores 100, muting drops to 0 — the reference writes both into `audioVolumeFor`,
    // so the element follows the stored value rather than a second opinion about it.
    applyPresenterVolume(user.userID, next.listen ? 1 : 0);
    savePreference('audioMutedFor', next.preferences.audioMutedFor);
    savePreference('audioVolumeFor', next.preferences.audioVolumeFor);
  }

  /** `adjustVolPres(event, user)` — the per-presenter slider. Same two effects as above. */
  function adjustPresenterVolume(user: PresenterAudioUser, rawValue: string) {
    const next = adjustVolumeForPresenter(presenterAudio, user, rawValue);
    presenterAudio = next.preferences;
    applyPresenterVolume(user.userID, next.elementVolume);
    savePreference('audioMutedFor', next.preferences.audioMutedFor);
    savePreference('audioVolumeFor', next.preferences.audioVolumeFor);
  }

  function toggleMute() {
    if (volume > 0) {
      previousVolume = volume;
      setMasterVolume(0);
      doNotDisturbOn = true;
      subtitles = true;
      backgroundVolume = volume;
      setBackgroundVolume(backgroundVolume);
      return;
    }
    setMasterVolume(previousVolume);
    doNotDisturbOn = false;
    subtitles = false;
    backgroundVolume = volume;
    setBackgroundVolume(backgroundVolume);
  }

  /**
   * `newMessage(e)` - one frame off the private channel.
   *
   * The capture's rules, kept: bucket by peer; if the tab exists but is not the open one, move it
   * to the end of the strip and increment `unread`; if it does not exist, create it. The unread
   * count is only bumped for messages that are NOT mine, which is why `isMine` is computed first -
   * our own echo must not make our own conversation look unread.
   */
  function ingestPrivateMessage(message: PrivateChatMessage) {
    const isMine = message.uid === data.user.id;
    const peerId = isMine ? message.recvdID : message.uid;

    const thread = privChatLog[peerId] ?? [];
    // Re-entrancy guard: the sender gets an echo AND may already have the row from the action's
    // response. Two copies of one message is worse than none.
    if (thread.some((existing) => existing._id === message._id)) return;
    privChatLog = { ...privChatLog, [peerId]: [...thread, message] };

    // A peer we have never had a tab for: remember enough to draw one.
    if (!chatTabs.some((tab) => tab.uid === peerId)) {
      peerProfiles = [
        ...peerProfiles.filter((profile) => profile.uid !== peerId),
        {
          name: isMine ? `User ${peerId}` : message.n,
          uid: peerId,
          avt: message.avt,
          pic: message.pic,
          unread: 0,
          isA: message.isA,
          online: true
        }
      ];
    }
    lastActivityByPeer = { ...lastActivityByPeer, [peerId]: message.t };

    // Only somebody else's message, and only when their tab is not the one on screen.
    if (!isMine && currUser !== peerId) {
      unreadByPeer = { ...unreadByPeer, [peerId]: (unreadByPeer[peerId] ?? 0) + 1 };
    }

    if (!doNotDisturbOn && !isMine && chatSoundOn) playSoundEffect('pling');
    if (currUser === peerId) scrollPrivateChatToBottom();
  }

  /** `app-st-compactmessage` shows a short local time against each row. */
  function privateChatTime(at: number) {
    return new Date(at).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  /** `scrollPCLogToBottom` - the scroller's own handler, which also re-runs after a tick. */
  function scrollPrivateChatToBottom() {
    const run = () => {
      const scroller = document.querySelector('.pc-messages');
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    };
    run();
    setTimeout(run, 60);
  }

  /**
   * `switchChatToUser(uid, user)` - open a thread.
   *
   * Clears `unread` on the tab it opens, seeds an empty array so the scroller has something to
   * bind to, and loads the first page.
   */
  async function switchChatToUser(peerId: number) {
    currUser = peerId;
    pmSearchTerm = '';
    if (!privChatLog[peerId]) privChatLog = { ...privChatLog, [peerId]: [] };
    unreadByPeer = { ...unreadByPeer, [peerId]: 0 };
    await loadPrivateChatLog(peerId, 0);
    scrollPrivateChatToBottom();
  }

  /** `loadPClogForUID(uid, page)` -> `getPCLog {page, peerID}`; with a term it is `doPCLogSearch`. */
  async function loadPrivateChatLog(peerId: number, page = 0, searchTerm = '') {
    const body = new FormData();
    body.set('peerID', String(peerId));
    body.set('page', String(page));
    if (searchTerm) body.set('searchTerm', searchTerm);
    const response = await fetch('?/loadPrivateChatLog', { method: 'POST', body });
    const result = deserialize<
      { peerId?: number; page?: number; messages?: PrivateChatMessage[] },
      { message?: string }
    >(await response.text());
    if (result.type !== 'success' || !result.data?.messages) return;

    const incoming = result.data.messages;
    // Page 0 replaces; a later page is older history and goes in front of what is already there.
    privChatLog = {
      ...privChatLog,
      [peerId]:
        page === 0 || searchTerm ? incoming : [...incoming, ...(privChatLog[peerId] ?? [])]
    };
  }

  /** `sendMessage()` - `sendPrivChat(currUser, text, recvdUser)`. Empty text sends nothing. */
  async function sendPrivateMessage() {
    const text = privateChatDraft.trim();
    if (!text || currUser === null) return;

    const body = new FormData();
    body.set('peerID', String(currUser));
    body.set('msg', text);
    const response = await fetch('?/sendPrivateMessage', { method: 'POST', body });
    const result = deserialize<{ message?: PrivateChatMessage }, { message?: string }>(
      await response.text()
    );
    if (result.type === 'failure') {
      bootboxAlert = result.data?.message ?? 'Message not sent.';
      return;
    }
    privateChatDraft = '';
    // The echo on `/privChat` is what actually appends it, so nothing is inserted here.
    scrollPrivateChatToBottom();
  }

  /** `deleteThisPM()` - confirm, then `deletePeerPCLog {peerID}`, then drop the tab. */
  function deleteThisPM() {
    if (currUser === null) return;
    const peerId = currUser;
    bootboxConfirmation = {
      message: 'Are you sure you want to delete all messages in this chat?',
      onconfirm: async () => {
        bootboxConfirmation = null;
        const body = new FormData();
        body.set('peerID', String(peerId));
        await fetch('?/deletePrivateChatLog', { method: 'POST', body });
        const { [peerId]: _dropped, ...remainingLog } = privChatLog;
        privChatLog = remainingLog;
        const { [peerId]: _unread, ...remainingUnread } = unreadByPeer;
        unreadByPeer = remainingUnread;
        peerProfiles = peerProfiles.filter((profile) => profile.uid !== peerId);
        await invalidateAll();
        currUser = null;
        selectedMessageUser = null;
      }
    };
  }

  /**
   * `closePanel()` - the X in the private-chat header:
   *
   * ```js
   * closePanel(){
   *   guiEventBus.emit('PCClosePanel');
   *   this.notificationInterval && (clearInterval(this.notificationInterval),
   *                                 document.title = globals.sessionName);
   *   this.user = null; this.recvdUser = null; this.currUser = '';
   * }
   * ```
   *
   * Closing DESELECTS the thread. Hiding the panel alone - which is all the X used to do - means
   * reopening lands straight back in the last conversation, where the capture returns to
   * "No active chat".
   */
  /**
   * `showPrivateChat()` — the ONE door into the private-chat panel, and its refusal.
   *
   * `app-room.compiled.js:855-861`, verbatim in shape:
   *
   * ```js
   * showPrivateChat(e = null, i = null) {
   *   this.appService.globals.videoOnlyMode ||
   *     this.appService.globals.viewerOnlyMode ||
   *     (this.privChatInited || (…initPMDrag()), this.privChatVisible = !0, …)
   * }
   * ```
   *
   * A leading `a || b || (…)`: in video-only or viewer-only mode the panel does not open at all,
   * silently. Four call sites in this file each set `privateChatOpen = true` on their own, so the
   * guard has to live in one place or it is four places to forget it.
   *
   * `videoOnlyMode` is the `r` query parameter — the recording-bot mode — which this room does not
   * model, the same honest gap `files-gates.ts` already records for `hideFiles`. The half that is
   * modelled is enforced.
   */
  function showPrivateChat() {
    if (viewerOnlyMode) return;
    privateChatOpen = true;
  }

  function closePrivateChatPanel() {
    privateChatOpen = false;
    currUser = null;
    selectedMessageUser = null;
    pmSearchTerm = '';
    pmSearching = false;
    privateChatDraft = '';
  }

  /** `onEnterSearchChat(value)` - a term searches this thread; an empty one restores it. */
  async function onEnterSearchPrivateChat(term: string) {
    if (currUser === null) return;
    pmSearchTerm = term;
    pmSearching = Boolean(term.trim());
    await loadPrivateChatLog(currUser, 0, term.trim());
    scrollPrivateChatToBottom();
  }

  /**
   * The private-chat toolbar's "Don't Disturb" button. `app-privchat`'s `setDND()` flips the one
   * global flag and nothing else - no persistence call, unlike its neighbours which end in
   * `savePreference(...)`. `app-chat` defines the same method but never binds it to a template, so
   * the private chat is the only place in the capture this button exists.
   */
  function setDND() {
    doNotDisturbOn = !doNotDisturbOn;
  }

  /**
   * The toolbar's "Download Log" button, transcribed from `app-privchat`'s `downloadLog()`: one
   * `toLocaleTimeString('en-us', ...)` line per message, CRLF-terminated, offered as a text blob
   * named `${name}_${date}_${time}.txt` with the space in the name replaced (the capture calls
   * `replace(' ', '_')`, which replaces only the first - kept as-is).
   *
   * The private-chat message log itself is still a stub here, so this currently writes an empty
   * file. That is the honest state, not a placeholder transcript.
   */
  function downloadPrivateChatLog() {
    const openTab = chatTabs.find((tab) => tab.uid === currUser);
    if (!openTab) return;
    const format: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    const lines = privateChatLog.map(
      (message) =>
        `${new Date(message.t).toLocaleTimeString('en-us', format)} [${message.n}]: ${message.txt}\r\n`
    );
    const url = URL.createObjectURL(new Blob(lines, { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    link.download = `${openTab.name.replace(' ', '_')}_${now.toLocaleDateString()}_${now.toLocaleTimeString()}.txt`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function stopStream(stream: MediaStream | null) {
    stream?.getTracks().forEach((track) => track.stop());
  }

  function setStreamEnabled(stream: MediaStream | null, enabled: boolean) {
    stream?.getTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  function startTalking(talkingUser: TalkingUser) {
    if (talkingUsers.some((currentUser) => currentUser.userID === talkingUser.userID)) return;
    talkingUsers.push(talkingUser);
  }

  function stopTalking(userID: number) {
    talkingUsers = talkingUsers.filter((talkingUser) => talkingUser.userID !== userID);
  }


  function getBrowserPermissionGuidance(permission: MediaPermissionKind) {
    const userAgent = navigator.userAgent.toLowerCase();
    const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
    const isFirefox = userAgent.includes('firefox');
    const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
    const isEdge = userAgent.includes('edg');
    const permissionLabel =
      permission === 'microphone'
        ? 'Microphone'
        : permission === 'camera'
          ? 'Camera'
          : 'Screen capture';
    let browserName = 'your browser';
    let settingsPath = '';

    if (isChrome) {
      browserName = 'Chrome';
      settingsPath = `Settings > Privacy and security > Site Settings > ${permissionLabel}`;
    } else if (isFirefox) {
      browserName = 'Firefox';
      settingsPath = `Settings > Privacy & Security > Permissions > ${permissionLabel}`;
    } else if (isSafari) {
      browserName = 'Safari';
      settingsPath = `Safari > Preferences > Websites > ${permissionLabel}`;
    } else if (isEdge) {
      browserName = 'Edge';
      settingsPath = `Settings > Cookies and site permissions > ${permissionLabel}`;
    }

    const mediaLabel =
      permission === 'microphone'
        ? 'microphone'
        : permission === 'camera'
          ? 'camera'
          : 'screen sharing';
    return `Permission denied. To enable ${mediaLabel}, go to ${browserName} ${settingsPath} and allow access for this site.`;
  }

  async function checkPermissionState(permission: MediaPermissionKind) {
    if (!navigator.permissions?.query) return 'Permissions API not supported in this browser';

    try {
      const result = await navigator.permissions.query({
        name: permission
      } as PermissionDescriptor);
      if (result.state === 'granted') return 'permission_granted';
      if (result.state === 'denied') return getBrowserPermissionGuidance(permission);
      if (result.state === 'prompt') return 'permission_prompt';
      return 'permission_unknown';
    } catch {
      return 'permission_check_failed';
    }
  }

  function captureErrorName(error: unknown) {
    return error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
  }

  function captureErrorMessage(error: unknown) {
    return error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : 'Unknown error occurred';
  }

  async function reportMediaCaptureError(kind: MediaCaptureKind, error: unknown) {
    const errorName = captureErrorName(error);
    const errorMessage = captureErrorMessage(error);
    const permission: MediaPermissionKind = kind === 'screen' ? 'display-capture' : kind;

    if (errorName === 'NotAllowedError') {
      const guidance = await checkPermissionState(permission);
      if (guidance.startsWith('Permission denied')) bootboxAlert = guidance;
      return;
    }

    if (errorName === 'AbortError') return;

    if (kind === 'microphone') {
      if (errorName === 'NotSupportedError') {
        bootboxAlert =
          'Your browser does not support microphone access. Please use Chrome, Firefox, or Safari.';
      } else if (errorName === 'NotFoundError') {
        bootboxAlert =
          'No microphone detected. Please ensure you have a microphone connected and try again.';
      } else if (errorName === 'SecurityError') {
        bootboxAlert = window.isSecureContext
          ? 'Security error accessing microphone. Please check your browser settings.'
          : 'Microphone access requires a secure connection (HTTPS). Please check your browser settings or contact your administrator.';
      } else if (errorName === 'OverconstrainedError') {
        bootboxAlert =
          'The selected microphone does not meet the required specifications. Please try a different microphone.';
      } else {
        bootboxAlert = `Error enabling microphone: ${errorMessage}`;
      }
      return;
    }

    if (kind === 'camera') {
      if (errorName === 'NotSupportedError') {
        bootboxAlert =
          'Your browser does not support camera access. Please use Chrome, Firefox, or Safari.';
      } else if (errorName === 'NotFoundError') {
        bootboxAlert =
          'No camera detected. Please ensure you have a camera connected and try again.';
      } else if (errorName === 'SecurityError') {
        bootboxAlert = window.isSecureContext
          ? 'Security error accessing camera. Please check your browser settings.'
          : 'Camera access requires a secure connection (HTTPS). Please check your browser settings or contact your administrator.';
      } else if (errorName === 'OverconstrainedError') {
        bootboxAlert =
          'The selected camera does not meet the required specifications. Please try a different camera.';
      } else {
        bootboxAlert = `Error enabling camera: ${errorMessage}`;
      }
      return;
    }

    if (errorName === 'NotSupportedError') {
      bootboxAlert =
        'Your browser does not support screen sharing. Please use Chrome, Firefox, or Safari.';
    } else if (errorName === 'NotFoundError') {
      bootboxAlert =
        'No screens or windows available for sharing. Please ensure you have a screen connected.';
    } else if (errorName === 'SecurityError') {
      bootboxAlert = window.isSecureContext
        ? 'Security error accessing screen sharing. Please check your browser settings.'
        : 'Screen sharing requires a secure connection (HTTPS). Please check your browser settings or contact your administrator.';
    } else {
      bootboxAlert = `Screen sharing error: ${errorMessage}`;
    }
  }

  async function enableMicrophone(retryCount = 0) {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException('Microphone access is not supported', 'NotSupportedError');
      }
      microphoneStream ??= await navigator.mediaDevices.getUserMedia({ audio: true });
      setStreamEnabled(microphoneStream, true);
      micMuted = false;

      /*
        Publish it, or nobody hears anything.

        `MediaSession.produceMicrophone` (`src/lib/media/session.ts:571`) was written and never
        called, so this room acquired a microphone, lit the browser's in-use indicator, ran speech
        recognition on it - and never sent a single packet. The capture produces here:
        `enableMic` creates `micProducer`, and every later control (`muteMic`, `unmuteMic`,
        `disableMic`) is a no-op without it.

        Produced once and kept: a mute pauses this producer rather than replacing it.
      */
      const micTrack = microphoneStream.getAudioTracks()[0];
      if (micTrack && mediaSession && !localMicProducerId) {
        try {
          const producer = await mediaSession.produceMicrophone(micTrack);
          localMicProducerId = producer.id;
        } catch (error) {
          console.error('[media] the microphone could not be published', error);
          showToast({
            kind: 'error',
            message: 'Your microphone could not be shared with the room.',
            enableHtml: false
          });
        }
      }
      // An open mic is what "talking" means here - see `audioProducerOwners`.
      startTalking({
        userID: data.user.id,
        mediaValue: { name: data.user.displayName }
      });
      beginSpeechRecognition();
    } catch (error) {
      if (retryCount === 0) {
        await enableMicrophone(1);
        return;
      }
      micMuted = true;
      stopTalking(data.user.id);
      await reportMediaCaptureError('microphone', error);
    }
  }

  async function toggleMicrophone() {
    if (!micMuted) {
      /*
        The TOOLBAR is `toggleMute()`, and its mute branch is `disableMic()` - not `muteMic()`.

        ```js
        toggleMute() { this.micProducer ? (this.micMuted ? this.enableMic(!1) : this.disableMic())
                                        : this.enableMic(!1) }

        disableMic() {
          if (this.micProducer) {
            this.micMuted = !0; this.guiEventBus.emit("micMuted", this.micMuted);
            this.stopSpeechRecognition(); this.micStream = null;
            this.micProducer.close();
            this.prevMicStream.getAudioTracks()[0].stop();
          }
        }
        ```

        `muteMic()`/`unmuteMic()` - the pause/resume pair - are the REMOTE-ADMIN controls, reached
        from a presenter command, not from this button. Using them here left the producer alive: a
        member kept an `<audio>` element and a live consumer for a microphone that had stopped
        sending, which is exactly the "presenter is off but still showing" report. Closing it is
        what makes `producerClosed` reach the room.
      */
      if (localMicProducerId && mediaSession) {
        void mediaSession.closeProducer(localMicProducerId);
      }
      localMicProducerId = null;
      stopStream(microphoneStream);
      microphoneStream = null;
      micMuted = true;
      stopTalking(data.user.id);
      endSpeechRecognition();
      return;
    }

    micLaunching = true;
    try {
      await enableMicrophone();
    } finally {
      micLaunching = false;
    }
  }

  /**
   * The toolbar's webcam control - `toggleCam()`, and the half that actually ends a camera.
   *
   * ```js
   * toggleCam() { this.connected ? (this.camProducer ? this.stopCam() : this.enableCam(!1)) : … }
   *
   * stopCam() {
   *   if (this.camProducer) {
   *     this.camMuted = !0; this.guiEventBus.emit("camMuted", this.camMuted);
   *     if (this.localWebcamStream)
   *       this.localWebcamStream.getTracks().forEach(e => { e.stop() });     // releases the device
   *     this.prevCamStream = null;
   *     this.socket.emit("cmd", {cmd:"closeProducer", kind:"video", producerId:…}, …);
   *   }
   * }
   * ```
   *
   * The capture never toggles `track.enabled` for the camera: it STOPS every track and re-acquires
   * with a fresh `getUserMedia` on the way back in (`enableCam` -> "enableWebcam() | calling
   * getUserMedia()"). This room had been caching the stream with `webcamStream ??= …` and flipping
   * `enabled`, which left `readyState: "live"` forever - measured after pressing the control:
   * the track stayed live and the browser kept reporting the camera in use, with no path in the UI
   * that ever released it. `stopStream` (which calls `track.stop()`) was wired only into page
   * teardown.
   *
   * The SFU half - `closeProducer` - is not reproduced; this room has no camera producer yet.
   */
  async function toggleWebcam() {
    camLaunching = true;
    try {
      if (!webcamMuted) {
        // `stopCam()` closes the producer as well as stopping the tracks:
        //   socket.emit("cmd", {cmd:"closeProducer", kind:"video", producerId: camProducer.id},
        //              () => { this.camProducer.close(); this.camProducer = null })
        // Closing it server-side is what tears down every viewer's consumer; without it a member
        // keeps a frozen last frame instead of losing the camera.
        if (localWebcamProducerId && mediaSession) {
          void mediaSession.closeProducer(localWebcamProducerId);
        }
        localWebcamProducerId = null;
        stopStream(webcamStream);
        webcamStream = null;
        webcamMuted = true;
        removeWebcamPresenter(String(data.user.id));
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException('Camera access is not supported', 'NotSupportedError');
      }
      /*
        A fresh acquire, not a cached stream: the previous one was stopped and cannot be revived.

        Only the device is constrained, NOT the resolution - and that is deliberate. `enableCam()`
        reads `const {resolution: _} = this.webcam` and spreads `JN[_]`, but `this.webcam` is
        initialised `{device: null, resolution: "sd"}` and nothing in the bundle ever writes to it.
        `JN` has no `sd` key, so `JN["sd"]` is `undefined` and `{...undefined}` contributes nothing:
        the original's webcam runs unconstrained. Adding 1080p here would be an improvement the
        capture does not make, so it stays out until it is asked for - see `docs/streaming-choices.md`.
      */
      webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { ideal: selectedVideoDeviceId } }
      });
      webcamMuted = false;
      // `webcamingUsers.push(r)` then `guiEventBus.emit("newWebcamPresenter", r)`.
      addWebcamPresenter({
        id: String(data.user.id),
        name: data.user.displayName,
        isMe: true
      });

      /*
        Publish it. Without this the camera is purely local - the presenter sees their own preview
        and no member sees anything, which is exactly what this room did: `toggleWebcam` had no
        produce call of any kind, while `MediaSession.produceWebcam` sat written and uncalled at
        `src/lib/media/session.ts:592`.

        The capture creates a producer here too - `camProducer = yield producerTransport.produce({
        stopTracks:!1, …})` - and `toggleCam()` branches on its existence.

        Failure is reported rather than swallowed, matching the screen path: the local preview will
        still be running, so a silent failure looks to the presenter exactly like success.
      */
      const track = webcamStream.getVideoTracks()[0];
      if (track && mediaSession) {
        try {
          const producer = await mediaSession.produceWebcam(track);
          localWebcamProducerId = producer.id;
        } catch (error) {
          console.error('[media] the webcam could not be published', error);
          showToast({
            kind: 'error',
            message: 'Your camera could not be shared with the room.',
            enableHtml: false
          });
        }
      }
    } catch (error) {
      webcamMuted = true;
      await reportMediaCaptureError('camera', error);
    } finally {
      camLaunching = false;
    }
  }


  function stopRecording() {
    const wasRecording = recording;
    if (screenRecorder && screenRecorder.state !== 'inactive') screenRecorder.stop();
    // Only announce a stop we actually made: `stopScreenSharing()` calls this unconditionally, and
    // a stop broadcast with no start would clear the badge for a room that is still recording.
    if (wasRecording) void broadcastRecordingState('stopRec');
    recording = false;
    recordingPaused = false;
    recordingReminder = false;
  }

  /** The navbar's stop control: ends every screen this presenter is sharing. */
  function stopScreenSharing() {
    screenShareMenuOpen = false;
    stopRecording();
    for (const producerId of [...localScreenStreams.keys()]) stopLocalScreen(producerId);
    // A share that never reached the SFU has no producer id to key on, so it is not in the map.
    stopStream(screenStream);
    screenStream = null;
    localScreenProducerId = null;
    screenSharing = false;
  }

  /**
   * "Name for this screen?" - the step that runs BEFORE anything is captured.
   *
   * Transcribed from the captured `startScreenSharing(e)` (`docs/source/main.d6d3c112b59b7d0d.js`):
   *
   * ```js
   * this.mediaSoupService.connected
   *   ? pa.prompt({ value: `Screen ${this.mediaSoupService.screenProducers.size+1}`,
   *       title: "Name for this screen ? Press OK for default. (You can share multiple screens
   *               from the same room and name each one here)",
   *       inputType: "text",
   *       callback: o => { if (!o) return; let r = o; r || (r = `Screen ${…length+1}`);
   *                        this.mediaSoupService.startScreenSharing(e, r, …) } })
   *   : pa.alert("Not connected to media server yet, please wait a second or two...")
   * ```
   *
   * Three things that were not obvious and are worth stating, because I got one of them wrong
   * before this line was found:
   *
   * 1. **There IS a generated default** - `Screen ${screenProducers.size + 1}` - prefilled into the
   *    input. A live room showing `FUTURES` and `MAIN / SPX` was the presenter typing over it, not
   *    evidence against a generator. Both are true: the name is free text, and the box starts
   *    populated.
   * 2. **Cancel aborts the share entirely.** `if (!o) return` runs before any capture, so no
   *    getDisplayMedia prompt appears. The `r || (r = …)` line after it is dead in the original -
   *    `o` is already truthy there - so the fallback it describes can never fire, and it is not
   *    reproduced.
   * 3. **Disconnected refuses instead of sharing**, with its own message. Sharing a screen the
   *    SFU cannot carry is the failure this exists to prevent: the presenter's own preview would
   *    look perfect while the room saw nothing.
   */
  const SCREEN_NAME_PROMPT =
    'Name for this screen ? Press OK for default. (You can share multiple screens from the same room and name each one here)';
  const MEDIA_NOT_CONNECTED_ALERT =
    'Not connected to media server yet, please wait a second or two... Or reload the page if it takes too long... *** If nothing else works, use the Gear icon on the right to open the Session Control and reset the media server...';

  function promptForScreenName(source: 'screen' | 'camera') {
    // `this.mediaSoupService.connected` in the capture. Deliberately not `sessionReady`: that is a
    // Promise, so it is truthy the moment load() is CALLED - including after it rejected - and it
    // says nothing about whether the socket is currently up.
    if (!mediaSession || !mediaSignalling?.connected) {
      bootboxAlert = MEDIA_NOT_CONNECTED_ALERT;
      screenShareMenuOpen = false;
      return;
    }
    bootboxPrompt = {
      title: SCREEN_NAME_PROMPT,
      // `screenProducers.size + 1` - what this session is already sharing, so a second screen
      // opens on "Screen 2" rather than on "Screen 1" again.
      value: `Screen ${mediaSession.screenNames.length + 1}`,
      onconfirm: (value) => {
        bootboxPrompt = null;
        const screenName = value.trim();
        // `if (!o) return`: cancelling, or clearing the box, shares nothing at all.
        if (!screenName) return;
        void startScreenSharing(source, screenName);
      }
    };
  }

  async function startScreenSharing(source: 'screen' | 'camera', screenName: string) {
    // Deliberately NOT stopping the screen already being shared.
    //
    // This used to open with `stopStream(screenStream)`, which killed the previous screen's track
    // while leaving its producer open at the SFU. The result was the worst shape a media bug takes:
    // viewers kept the tab, the <video> stayed unpaused, the track still reported
    // readyState "live" - and no frame ever arrived again. Measured directly: sharing a second
    // screen left the first stuck at currentTime 6.50 for as long as it was watched, with nothing
    // anywhere reporting a fault.
    //
    // Multiple concurrent screens are the point - the naming prompt says so in its own text ("You
    // can share multiple screens from the same room and name each one here") and the capture holds
    // them in a Map (`this.screenProducers=new Map`, byte 1072217), stopping them individually by
    // producer id (byte 1099342). So each share keeps its own stream, keyed by its producer id.

    if (!navigator.mediaDevices?.getDisplayMedia) {
      bootboxAlert =
        'Screen sharing is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.';
      return;
    }

    let stream: MediaStream | null = null;
    try {
      stream =
        source === 'camera'
          ? await navigator.mediaDevices.getUserMedia({
              // `getUserMedia({video:{deviceId:{ideal: globals.videoDeviceID}, ...JN.hdd}})` in
              // `enableShare()`, where the capture's constraint table is
              //
              //   JN = { qvga:{320x240}, vga:{640x480}, hd:{1280x720},
              //          hdd:{width:{ideal:1920}, height:{ideal:1080}} }
              //
              // This path took a bare `{video: true}`, which is the browser default - MEASURED at
              // 640x480. Every member watching an OBS / XSPLIT / virtual-cam share was receiving a
              // ninth of the pixels the original sends. The selected camera was ignored too.
              video: {
                deviceId: { ideal: selectedVideoDeviceId },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              }
            })
          : await navigator.mediaDevices.getDisplayMedia({
              audio: false,
              video: {
                width: { max: 1920 },
                height: { max: 1080 },
                frameRate: { max: 30 }
              }
            });
      screenStream = stream;
      screenSharing = true;
      screenShareMenuOpen = false;
      const track = stream.getVideoTracks()[0];

      /*
        `contentHint = 'detail'` — `docs/streaming-choices.md` row 2, and the reasoning is the wire
        measurement in that document rather than a preference.

        Presenter-to-member, 12 seconds with a member attached: full 1920x1080 leaves the presenter,
        arrives at the member, paints at 1920x1080, VP9 end to end, ZERO dropped frames. And
        `qualityLimitationReason: none` with cumulative `bandwidth: 0, cpu: 0` — the encoder spent
        **zero seconds constrained**.

        So a soft-looking share is not a limit to lift. Nothing is throttling it; nothing is ASKING
        the encoder to spend more. With `encodings: undefined` there is no floor, no ceiling and no
        content hint, so libvpx's own heuristic decides — and that heuristic is tuned for camera
        video, where blurring a moving background is free. For candlesticks, gridlines and 13px
        quote text it is exactly the wrong trade.

        This is the one line that tells it otherwise. Applied to the SCREEN capture only, never to
        the camera path above, where the default heuristic is correct.

        Two honest caveats, both from the doc:

        * **Its cost is unmeasured.** It may raise the bitrate, and under genuine congestion it
          degrades frame rate rather than resolution — a share may end up sharper and choppier. The
          doc previously called this free; that was an assumption and it was wrong.
        * **It is a divergence.** The capture sets `contentHint = "detail"` on its alert-overlay
          canvas stream and never on the raw screen track.

        Chosen anyway because the measurement says the headroom is real and unused, and because it
        is one property on one track: reverting is deleting this line. The `getStats()` read that
        would settle it needs a presenter sharing a REAL desktop with a member attached, which is
        `scripts/collect-share-stats.js`.
      */
      if (track) track.contentHint = 'detail';

      /*
       * Send it to the SFU. Without this the capture is purely local - the presenter sees their own
       * preview and nobody else sees anything, which is what this room did until now.
       *
       * The name came from the prompt in `promptForScreenName`, which the captured app raises
       * before any capture happens. It is what the tab bar renders as `{name}-{screenName}`.
       */
      if (track && mediaSession) {
        try {
          const producer = await mediaSession.produceScreen(track, screenName);
          localScreenProducerId = producer.id;
          localScreenStreams.set(producer.id, stream);
          addLocalScreen(producer.id, screenName, stream);
          // Ending the capture - the browser's own "Stop sharing" bar - closes THIS screen only,
          // not every screen this presenter is sharing.
          track.addEventListener('ended', () => stopLocalScreen(producer.id), { once: true });
        } catch (error) {
          // The local preview still works; only the sharing half failed, and saying so beats a
          // presenter believing the room can see them.
          console.error('[media] the screen could not be published', error);
          showToast({
            kind: 'error',
            message: 'Your screen could not be shared with the room.',
            enableHtml: false
          });
        }
      }
    } catch (error) {
      // Only this attempt failed. Screens already being shared are untouched, and `screenSharing`
      // stays true if any of them survive - flipping it off would hide the stop control for shares
      // that are still running.
      stopStream(stream);
      screenStream = localScreenStreams.values().next().value ?? null;
      screenSharing = localScreenStreams.size > 0;
      await reportMediaCaptureError('screen', error);
    }
  }

  /**
   * Stops one shared screen, leaving the presenter's others running.
   *
   * The capture stops them individually by producer id (byte 1099342), which is the only thing
   * that makes "share multiple screens" usable - a presenter finishing with one chart should not
   * drop the other two.
   */
  function stopLocalScreen(producerId: string) {
    closeScreenPopout(producerId);
    const stream = localScreenStreams.get(producerId);
    localScreenStreams.delete(producerId);

    // Close the producer before dropping the track: the server tears the room's consumers down
    // from `producerClosed`, so viewers lose the tab instead of keeping a frozen last frame.
    if (mediaSession) void mediaSession.closeProducer(producerId);
    stopStream(stream ?? null);

    // Our own tab is ours to remove: no `producerClosed` comes back for a producer we closed, so
    // nothing else would ever drop it.
    sharedScreens = sharedScreens.filter((entry) => entry.id !== producerId);
    screenStreams.delete(producerId);
    if (selectedScreenTab === producerId) selectedScreenTab = sharedScreens[0]?.id ?? null;
    if (forcedScreenId === producerId) forcedScreenId = null;
    if (lockedScreenId === producerId) lockedScreenId = null;

    if (localScreenProducerId === producerId) localScreenProducerId = null;
    // The recorder and the local preview follow whichever share is still running, if any.
    screenStream = localScreenStreams.values().next().value ?? null;
    if (localScreenStreams.size === 0) {
      stopRecording();
      screenSharing = false;
    }
  }

  /**
   * Records the shared screen to a file on this machine.
   *
   * NOT what the capture does, and the divergence is deliberate. The original records
   * SERVER-side - `mediaSoupService.startRec(muser)` and
   * `sendServerAdminCommand('startRecMtx', {streams})`, with the server pushing back a `recName`
   * - and the whole bundle contains exactly ONE `new MediaRecorder`, which is the microphone test
   * in the AV settings modal. The original never writes a session recording to your computer.
   * Server-side recording needs the recording/transcoding workers that the deployment plan defers,
   * so this records in the browser instead.
   *
   * Three things were wrong with it:
   *
   *   1. SILENT. `getDisplayMedia({ audio: false })` means `screenStream` carries video only, so
   *      every recording was a silent movie. The presenter's microphone is mixed in below.
   *   2. UNREACHABLE. `recordedScreenUrl` is only set by the recorder's `stop` event, which also
   *      sets `recording = false` - and the menu item that exposed it sat inside `{#if recording}`.
   *      It existed only at the moment it became invisible.
   *   3. NEVER SAVED. A blob URL was created and nothing ever downloaded it.
   */
  /**
   * Tells the room what this presenter's recorder is doing.
   *
   * The capture's recording is server-side, so the server is the one that emits `startRec`. Ours
   * records in the browser, so the presenter announces it instead - but the SHAPE is the capture's:
   * every peer, including this one, learns the state from the `cmds` channel rather than from a
   * local flag. That is what makes the badge appear for members.
   */
  async function broadcastRecordingState(cmd: string, recName = '') {
    const body = new FormData();
    body.set('cmd', cmd);
    if (recName) body.set('recName', recName);
    await fetch('?/recordingState', { method: 'POST', body });
  }

  function startRecording() {
    if (!screenStream || !screenSharing || typeof MediaRecorder === 'undefined') return;

    // Video from the share, audio from the mic. `getAudioTracks()` on the display stream is empty
    // by construction, so without this the file has no sound at all.
    const tracks: MediaStreamTrack[] = [...screenStream.getVideoTracks()];
    const micTrack = microphoneStream?.getAudioTracks()[0];
    if (micTrack && micTrack.readyState === 'live') tracks.push(micTrack);
    recordingHasAudio = Boolean(micTrack && micTrack.readyState === 'live');
    const recordedStream = new MediaStream(tracks);

    recordedScreenChunks = [];
    /*
      Explicit codec and bitrate, where this was `new MediaRecorder(recordedStream)` with NO options.

      With none, the browser chose both the container and roughly 2.5 Mbps. `docs/streaming-choices.md`
      row 4 measured, on realistic chart content, that VP9 produces 3841 kbps at an 8 Mbps cap and
      keeps scaling, while H.264 saturates near 2033 and ignores anything higher — so the detail was
      available and simply never asked for. See `recording-codec.ts` for the full ordering and for
      why 8 Mbps rather than 12: a second 1080p encode competes with the live encoder, and the share
      members are watching matters more than the presenter's own file.
    */
    const recordingOptions = chooseRecordingOptions();
    screenRecorder = new MediaRecorder(recordedStream, {
      // Omitted entirely when nothing is supported: passing an unsupported `mimeType` THROWS, and a
      // recording that fails to start is worse than one at the browser's default.
      ...(recordingOptions.mimeType ? { mimeType: recordingOptions.mimeType } : {}),
      videoBitsPerSecond: recordingOptions.videoBitsPerSecond,
      audioBitsPerSecond: recordingOptions.audioBitsPerSecond
    });
    screenRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) recordedScreenChunks.push(event.data);
    });
    screenRecorder.addEventListener(
      'stop',
      () => {
        if (recordedScreenUrl) URL.revokeObjectURL(recordedScreenUrl);
        if (recordedScreenChunks.length === 0) {
          bootboxAlert = 'Nothing was recorded.';
          return;
        }
        const type = screenRecorder?.mimeType || 'video/webm';
        recordedScreenUrl = URL.createObjectURL(new Blob(recordedScreenChunks, { type }));
        downloadRecording();
      },
      { once: true }
    );
    // A timeslice, so `dataavailable` fires periodically instead of only at stop. Without it a
    // recording lost to a crash or a closed tab is a recording with zero chunks.
    screenRecorder.start(1000);
    recording = true;
    // The room learns from the server, never from this flag - see `broadcastRecordingState`.
    void broadcastRecordingState('startRec', `room-recording-${new Date().toISOString()}`);
    recordingPaused = false;
    recordingReminder = true;
    recordingMenuOpen = false;
  }

  /**
   * Writes the finished recording to the user's Downloads folder.
   *
   * Called automatically when the recorder stops, and again from the menu if they want another
   * copy. The extension follows the container the browser actually chose - Chrome gives
   * `video/webm;codecs=...`, Safari `video/mp4` - because naming an mp4 `.webm` produces a file
   * the OS refuses to open.
   */
  /**
   * `showRecPreview()` / `hideRecPreview()`, which in the capture are:
   *
   * ```js
   * showRecPreview(){ if(!roomState.isRecording) return !1;
   *   globals.recPreviewOpen = !0; guiEventBus.emit("reopenRecPreviewWindow") }
   * hideRecPreview(){ if(!roomState.isRecording) return !1;
   *   globals.recPreviewOpen = !1; guiEventBus.emit("closeRecPreviewWindow") }
   * ```
   *
   * There the preview is a separate WINDOW pointed at a server-supplied URL - the server sends
   * `setRecPreview` and the client stores `sessData.recPreviewLocation = i.url`. We have no
   * server-side recording and therefore no such URL, so the window shows the local recording
   * instead. The window model itself is the capture's.
   *
   * The toggle previously flipped `recPreviewOpen` and nothing read it anywhere else in the app:
   * a control that changed its own label and did nothing.
   */
  function showRecPreview() {
    if (!recordedScreenUrl) return;
    recPreviewWindow?.close();
    recPreviewWindow = window.open(recordedScreenUrl, 'RecPreview', 'width=960,height=600');
    recordingMenuOpen = false;

    // `window.open` returns null when the popup is blocked. Flipping the label to "Hide" anyway
    // would claim a window that is not there, and staying silent looks like a dead button - which
    // is what the control already was. Say what happened; the file is still on disk either way.
    if (!recPreviewWindow) {
      recPreviewOpen = false;
      bootboxAlert =
        'Your browser blocked the preview window. Allow pop-ups for this site, or open the downloaded recording from your Downloads folder.';
      return;
    }
    recPreviewOpen = true;
  }

  function hideRecPreview() {
    recPreviewWindow?.close();
    recPreviewWindow = null;
    recPreviewOpen = false;
    recordingMenuOpen = false;
  }

  function downloadRecording() {
    if (!recordedScreenUrl) return;
    const type = screenRecorder?.mimeType || 'video/webm';
    const extension = type.includes('mp4') ? 'mp4' : 'webm';
    // `sv-SE` gives `2026-08-05 20:33:41` - ISO-shaped and already local time, so the name sorts
    // chronologically in Finder without any timezone arithmetic.
    const stamp = new Date().toLocaleString('sv-SE').replace(/[: ]/g, '-');
    const link = document.createElement('a');
    link.href = recordedScreenUrl;
    link.download = `room-recording-${stamp}.${extension}`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function pauseRecording() {
    if (!screenRecorder || screenRecorder.state !== 'recording') return;
    screenRecorder.pause();
    void broadcastRecordingState('pauseRec');
    recordingPaused = true;
    recordingReminder = true;
    recordingMenuOpen = false;
  }

  function resumeRecording() {
    if (!screenRecorder || screenRecorder.state !== 'paused') return;
    screenRecorder.resume();
    void broadcastRecordingState('resumeRec');
    recordingPaused = false;
    recordingReminder = false;
    recordingMenuOpen = false;
  }

  function promptForSoundCloud() {
    bootboxPrompt = {
      title:
        'You can play SoundCloud music for all. Click on "Share" from your track or playlist, copy and paste the share url here',
      value: '',
      onconfirm: (value) => {
        bootboxPrompt = null;
        if (!value) return;
        if (value.indexOf('https://soundcloud.com') !== 0) {
          bootboxAlert = 'Invalid SoundCloud URL...';
          return;
        }
        soundCloudUrl = value;
        soundCloudPlaying = true;
        soundCloudMenuOpen = false;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('playSoundCloudForAll', { detail: { url: value } }));
        }
      }
    };
  }

  function stopSoundCloud() {
    soundCloudPlaying = false;
    soundCloudMenuOpen = false;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stopSoundCloudForAll', { detail: { url: null } }));
    }
  }

  function stopSoundCloudForMe() {
    soundCloudPlaying = false;
    soundCloudMenuOpen = false;
  }

  function toggleTopMenu(menu: 'recording' | 'soundcloud' | 'screen') {
    recordingMenuOpen = menu === 'recording' ? !recordingMenuOpen : false;
    soundCloudMenuOpen = menu === 'soundcloud' ? !soundCloudMenuOpen : false;
    screenShareMenuOpen = menu === 'screen' ? !screenShareMenuOpen : false;
    volumeOpen = false;
  }

  function requestReload() {
    bootboxConfirmation = {
      message: 'Are you sure you want to reload the page?',
      onconfirm: () => window.location.reload()
    };
  }

  /** True when a file belongs to the tab on screen - `Ywe`'s `O(1, ...)`, keyed on content type. */
  function matchesFileTab(item: { kind: string }) {
    return item.kind === (fileTab === 'files' ? 'file' : fileTab.slice(0, -1));
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
  function searchedFiles() {
    const query = fileSearch.trim().toLowerCase();
    const matching = data.files.filter((item) =>
      Object.values(item).some((field) => typeof field === 'string' && field.toLowerCase().includes(query))
    );
    return matching.sort((a, b) =>
      fileSortKey === 'name'
        ? (nameAscending ? 1 : -1) * a.name.localeCompare(b.name)
        : // "newest to oldest" is descending, so the default direction is the reverse of name's.
          (dateNewestFirst ? -1 : 1) *
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    );
  }

  /**
   * Both titles read "Sorted X (click to sort Y)", on the active button and the inactive one alike,
   * so a click flips that button's own direction and makes it the governing sort.
   */
  function toggleFileSort(key: 'name' | 'date') {
    if (key === 'name') nameAscending = !nameAscending;
    else dateNewestFirst = !dateNewestFirst;
    fileSortKey = key;
  }

  /**
   * `deleteFile(name, id)`:
   *
   * ```js
   * bootbox.confirm(`Delete file: "${e}" ?`, s => { s && (r.fileID = i, post(cmd), getSessionFiles()) })
   * ```
   */
  function deleteFile(file: { id: number; name: string }) {
    bootboxConfirmation = {
      message: `Delete file: "${file.name}" ?`,
      onconfirm: async () => {
        bootboxConfirmation = null;
        await postDeleteFile(file.id);
        await invalidateAll();
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
  function deleteSelectedFiles() {
    const ids = [...selectedFileIds];
    if (!ids.length) {
      bootboxAlert = 'No files where checked...';
      return;
    }
    bootboxConfirmation = {
      message: `Are you sure you want to delete ${ids.length} files ?`,
      onconfirm: async () => {
        bootboxConfirmation = null;
        for (const id of ids) await postDeleteFile(id);
        selectedFileIds = new Set();
        await invalidateAll();
      }
    };
  }

  async function postDeleteFile(fileId: number) {
    const body = new FormData();
    body.set('fileID', String(fileId));
    const response = await fetch('?/deleteFile', { method: 'POST', body });
    const result = deserialize<{ success?: boolean }, { message?: string }>(await response.text());
    if (result.type === 'failure') bootboxAlert = result.data?.message ?? 'Delete failed.';
  }

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
  let playingForMe = $state<Set<number>>(new Set());

  function playMp3ForMe(file: { id: number; url: string; contentType: string }) {
    const elementId = `file-audio-${file.id}`;
    const existing = document.getElementById(elementId);
    if (existing) {
      existing.remove();
      const next = new Set(playingForMe);
      next.delete(file.id);
      playingForMe = next;
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
      const next = new Set(playingForMe);
      next.delete(file.id);
      playingForMe = next;
    });
    document.body.appendChild(audio);
    void audio.play();
    playingForMe = new Set(playingForMe).add(file.id);
  }

  /**
   * `mp3Playing` / `mp3Url` — the room-wide sound a presenter started.
   *
   * Transcribed from the bundle. The subscribers are at offset 1963827:
   *
   * ```js
   * guiEventBus.subscribe('playMP3ForAll', e => { this.mp3Url = e.url; this.mp3Playing = true })
   * guiEventBus.subscribe('stopMp3ForAll', () => { this.mp3Url = null; this.mp3Playing = false })
   * ```
   *
   * The sender for both already existed here; nothing RECEIVED them, so a presenter could hit
   * "Play For All" and no other browser made a sound — the same shape as every other missing
   * receiver in this file.
   *
   * `mp3Playing` is a separate flag rather than `mp3Url !== null` because the capture keeps both
   * and gates different things on each: the audio element binds `src` to the URL
   * (`z('src', o.mp3Url, Mt)`), while "Stop For All" is gated on `isP && mp3Playing`
   * (`O(83, o.isP && o.mp3Playing ? 83 : -1)`).
   */
  let mp3Playing = $state(false);
  let mp3Url = $state<string | null>(null);

  /** `playMp3ForAll(e) { sendServerAdminCommand('playMP3ForAll', { url: e }) }`. */
  async function playMp3ForAll(url: string) {
    await sendPresenterFileCommand('playMP3ForAll', url);
  }

  /** `stopMp3ForAll() { sendServerAdminCommand('stopMp3ForAll') }`. */
  async function stopMp3ForAll() {
    await sendPresenterFileCommand('stopMp3ForAll');
  }

  async function sendPresenterFileCommand(cmd: string, url?: string) {
    const body = new FormData();
    body.set('cmd', cmd);
    if (url !== undefined) body.set('url', url);
    const response = await fetch('?/fileMediaCommand', { method: 'POST', body });
    const result = deserialize<{ success?: boolean }, { message?: string }>(await response.text());
    if (result.type === 'failure') bootboxAlert = result.data?.message ?? 'Command failed.';
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
  async function setAlertSound(url: string, on: boolean) {
    const body = new FormData();
    body.set('url', url);
    body.set('on', on ? 'true' : 'false');
    const response = await fetch('?/overwriteCashRegisterSound', { method: 'POST', body });
    const result = deserialize<{ success?: boolean }, { message?: string }>(await response.text());
    if (result.type === 'failure') {
      bootboxAlert = result.data?.message ?? 'Command failed.';
      return;
    }
    await invalidate('room:data');
  }

  function toggleFileSelection(id: number, selected: boolean) {
    const next = new Set(selectedFileIds);
    if (selected) next.add(id);
    else next.delete(id);
    selectedFileIds = next;
  }

  // `round(e.size / 1024)` then the literal 'Kb ' - the capture reports kilobytes, rounded, with a
  // trailing space before the closing tag.
  function fileSizeInKb(size: number) {
    return Math.round(size / 1024);
  }

  // Angular's `date:'medium'` pipe, which for en-US is `MMM d, y, h:mm:ss a`.
  function mediumDate(value: Date | string | number) {
    return new Date(value).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  async function sendComposerMessage() {
    const body = composer.trim();
    if (!body) return;

    if (await sendMessageBody(body)) composer = '';
  }

  async function sendMessageBody(body: string) {
    const trimmedBody = body.trim();
    if (!trimmedBody) return false;

    const form = new FormData();
    form.set('body', trimmedBody);
    form.set('room', chatTab);
    const response = await fetch('?/sendMessage', { method: 'POST', body: form });

    if (response.ok) {
      await invalidateAll();
      return true;
    }
    return false;
  }

  function openImageUpload() {
    emojiOpen = false;
    giphyOpen = false;
    openModal('image-upload');
  }

  /**
   * Upload one image and return the URL to put in the message body.
   *
   * The capture posts to an external CDN, `Client-ID`-authenticated, and reads `data.link` back:
   *
   * ```js
   * fetch(`${uploadServer}/image/${sessionHandle}`, { method:'POST',
   *   headers:{ Authorization:`Client-ID ${uploadKey}` }, body: form })  // -> { data: { link } }
   * ```
   *
   * `PUBLIC_PTR_UPLOAD_SERVER` and `PUBLIC_PTR_CDN_UPLOAD_KEY` are both empty here - we do not have
   * that service - and the code threw "Missing captured upload configuration.", which is where
   * posting an alert with an image died. Rather than fail, it falls back to the room's OWN upload,
   * which stores the bytes and hands back a real `/uploads/<uuid>` URL. Same contract: a URL that
   * resolves to the image the user picked.
   *
   * The captured path is kept and still wins when the environment provides it.
   */
  async function uploadOneImage(file: File): Promise<string> {
    const uploadServer = env.PUBLIC_PTR_UPLOAD_SERVER ?? '';
    const uploadKey = env.PUBLIC_PTR_CDN_UPLOAD_KEY ?? '';

    if (uploadServer && uploadKey) {
      const upload = new FormData();
      upload.append('image', file);
      upload.append('name', file.name);
      const response = await fetch(`${uploadServer}/image/${data.sessionHandle}`, {
        method: 'POST',
        headers: { Authorization: `Client-ID ${uploadKey}` },
        body: upload
      });
      if (!response.ok) throw new Error(`Image upload failed with ${response.status}.`);
      const payload = (await response.json()) as { data?: { link?: string } };
      const link = payload.data?.link;
      if (!link) throw new Error('Image upload response did not include data.link.');
      return link;
    }

    const body = new FormData();
    body.append('file', file);
    body.append('originalname', file.name);
    // `uploadComposerImage`, NOT `uploadFile`: the Files-pane action is presenter-only, and routing
    // composer images through it refused every member with "Presenters only." while their own
    // upload button was visible and enabled.
    const response = await fetch('?/uploadComposerImage', { method: 'POST', body });
    const result = deserialize<{ file?: { url?: string } }, { message?: string }>(
      await response.text()
    );
    if (result.type !== 'success' || !result.data?.file?.url) {
      throw new Error(
        result.type === 'failure' ? (result.data?.message ?? 'Upload failed.') : 'Upload failed.'
      );
    }
    return result.data.file.url;
  }

  async function uploadComposerImages(files: File[], message: string) {
    modal = null;
    if (files.length === 0) return;

    const uploadedUrls: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        bootboxAlert = `Uploading ${index}/${files.length}: ${file.name}. Please wait...`;
        uploadedUrls.push(await uploadOneImage(file));
      }

      const body = `${uploadedUrls.join(' ')}${message ? ` ${message}` : ''}`;
      bootboxAlert = null;
      await sendMessageBody(body);
    } catch (error) {
      console.error(error);
      bootboxAlert = 'Upload Failed...';
    }
  }

  async function uploadAlertFiles(files: readonly File[]) {
    const uploadedUrls: string[] = [];
    for (const file of files) uploadedUrls.push(await uploadOneImage(file));
    return uploadedUrls;
  }

  function postAlertOnX(body: string) {
    if (!body) return;
    const intent = postOnXIntent(body);
    if (tweetWindow && !tweetWindow.closed) {
      tweetWindow.focus();
      tweetWindow.location.href = intent;
      return;
    }
    tweetWindow = window.open(
      intent,
      'TweetWindow',
      'width=800,height=800,scrollbars=yes,resizable=yes'
    );
  }

  async function persistPostedAlert(
    kind: AlertTab,
    body: string,
    targetUrl: string | null,
    nonTradeAlert: boolean,
    dontPush: boolean
  ) {
    const form = new FormData();
    form.set('kind', kind);
    form.set('body', body);
    if (targetUrl) form.set('targetUrl', targetUrl);
    form.set('nonTradeAlert', String(nonTradeAlert));
    form.set('dontPush', String(dontPush));

    const response = await fetch('?/postAlert', { method: 'POST', body: form });
    if (!response.ok) return false;
    await invalidateAll();
    return true;
  }

  async function postAlert(submission: PostAlertSubmission) {
    let body: string;
    let targetUrl: string | null;

    if (submission.composition.status === 'upload') {
      try {
        const uploadedUrls = await uploadAlertFiles(submission.files);
        body = composeUploadedAlert(
          submission.composition.bodyBeforeUploads,
          uploadedUrls,
          submission.legalDisclosure,
          submission.legalDisclosureText
        );
        targetUrl = uploadedUrls[0] ?? null;
      } catch (error) {
        console.error(error);
        bootboxAlert = 'Upload Failed...';
        return false;
      }
    } else {
      body = submission.composition.body;
      targetUrl = null;
    }

    if (submission.postOnX) postAlertOnX(body);
    return persistPostedAlert(
      submission.composition.kind,
      body,
      targetUrl,
      submission.nonTradeAlert,
      submission.dontPush
    );
  }

  async function postPastedAlertImage(submission: PastedImageSubmission) {
    try {
      const [uploadedUrl] = await uploadAlertFiles([submission.file]);
      if (!uploadedUrl) throw new Error('Image upload response did not include data.link.');
      const body = composePastedImageAlert(
        submission.alertText,
        uploadedUrl,
        submission.legalDisclosure,
        submission.legalDisclosureText
      );
      if (submission.postOnX) postAlertOnX(body);
      return persistPostedAlert(
        'media',
        body,
        uploadedUrl,
        submission.nonTradeAlert,
        submission.dontPush
      );
    } catch (error) {
      console.error(error);
      bootboxAlert = 'Upload Failed...';
      return false;
    }
  }

  function selectGif(_title: string, url: string) {
    if (sendingGif) return;
    giphyOpen = false;
    sendingGif = true;
    pendingGifUrl = url;
  }

  function cancelGif() {
    pendingGifUrl = null;
    sendingGif = false;
  }

  async function confirmGif() {
    const url = pendingGifUrl;
    pendingGifUrl = null;
    if (url) await sendMessageBody(url);
    sendingGif = false;
  }

  function playYoutubeForAll(url: string) {
    youtubeForAllUrl = url;
  }

  function stopYoutubeForAll() {
    youtubeForAllUrl = '';
  }

  function clamp(value: number, minimum: number, maximum: number) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function splitPairFromValue(value: unknown): [number, number] | null {
    return Array.isArray(value) &&
      value.length >= 2 &&
      typeof value[0] === 'number' &&
      typeof value[1] === 'number'
      ? [value[0], value[1]]
      : null;
  }

  // Server-persisted sizes. These are the ones SSR can see, so they are the source of truth.
  function settingsSplitPair(key: string) {
    return splitPairFromValue(loadedSettings[key]);
  }

  // Browser-only sizes written by earlier builds, kept as a one-time migration source.
  function storedSplitPair(key: string): [number, number] | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      return splitPairFromValue(JSON.parse(localStorage.getItem(key) ?? 'null'));
    } catch {
      return null;
    }
  }

  function splitStorageKeys(direction: RoomSplitDir) {
    const horizontalRoom = direction === 'ltr' || direction === 'rtl';
    return {
      horizontalRoom,
      roomKey: horizontalRoom ? 'roomSizes' : 'roomSizes-bottom',
      chatKey: horizontalRoom ? 'chatAlertSizes' : 'chatAlertSizes-bottom'
    } as const;
  }

  function resolveSplitSizes(
    direction: RoomSplitDir,
    read: (key: string) => [number, number] | null
  ) {
    const { horizontalRoom, roomKey, chatKey } = splitStorageKeys(direction);
    const roomSizes = read(roomKey);
    const chatSizes = read(chatKey);
    return {
      mainSplit: roomSizes
        ? clamp((horizontalRoom ? roomSizes[0] : roomSizes[1]) / 100, 0, 1)
        : null,
      chatAlertsSplit: chatSizes ? clamp(chatSizes[0] / 100, 0, 1) : null
    };
  }

  // Applies the sizes the server rendered with. Only called when the split direction changes,
  // which is a deliberate user action rather than a page load.
  function loadStoredSplitSizes(direction: RoomSplitDir = roomSplitDir) {
    const resolved = resolveSplitSizes(direction, settingsSplitPair);
    mainSplit = resolved.mainSplit;
    chatAlertsSplit = resolved.chatAlertsSplit;
  }

  // Sizes that exist only in this browser are promoted to the server so the NEXT server render
  // already contains them. They are deliberately NOT applied to the live layout: doing that would
  // move the alerts column, the chat column and the whole presentation area (screens / notes /
  // videoplayer / files) after first paint, which is exactly the shift this promotion removes.
  function promoteLegacySplitSizes() {
    for (const direction of ['ltr', 'ttb'] as const) {
      const { roomKey, chatKey } = splitStorageKeys(direction);
      for (const key of [roomKey, chatKey]) {
        if (settingsSplitPair(key)) continue;
        const legacy = storedSplitPair(key);
        if (legacy) savePreference(key, legacy);
      }
    }
  }

  function persistSplitSizes(target: 'main' | 'chat-alerts') {
    const { roomKey, chatKey } = splitStorageKeys(roomSplitDir);
    if (target === 'main' && mainSplit !== null) {
      savePreference(
        roomKey,
        roomSplitIsHorizontal
          ? [mainSplit * 100, (1 - mainSplit) * 100]
          : [(1 - mainSplit) * 100, mainSplit * 100]
      );
    }
    if (target === 'chat-alerts' && chatAlertsSplit !== null) {
      savePreference(chatKey, [chatAlertsSplit * 100, (1 - chatAlertsSplit) * 100]);
    }
  }

  function resizeFromPointer(event: PointerEvent) {
    // Any movement at all makes this a drag rather than a click — see `splitMoved` above.
    splitMoved = true;
    if (splitTarget === 'main' && mainElement) {
      const rect = mainElement.getBoundingClientRect();
      const availableSize = Math.max(
        1,
        (splitPointerAxis === 'x' ? rect.width : rect.height) -
          DUMP_CONTRACT.baseline.splitGutterWidth
      );
      const pointer =
        splitPointerAxis === 'x' ? event.clientX - rect.left : event.clientY - rect.top;
      const firstAreaSize = clamp(pointer - splitPointerOffset, 0, availableSize);
      const firstAreaFraction = firstAreaSize / availableSize;
      /*
        Mobile drags move `mobileSplit`, never `mainSplit`, and the first pane is the PRESENTATION
        there — so the fraction has to be inverted, because both numbers mean "the chat/alerts
        share". `primaryIsFirst` is a `roomSplitDir` question and does not apply at this width; the
        mobile order is fixed by `K4e`'s child sequence.
      */
      if (isMobileScreen) mobileSplit = 1 - firstAreaFraction;
      else mainSplit = primaryIsFirst ? firstAreaFraction : 1 - firstAreaFraction;
    }

    if (splitTarget === 'chat-alerts' && alertChatElement) {
      const rect = alertChatElement.getBoundingClientRect();
      const availableSize = Math.max(
        1,
        (splitPointerAxis === 'x' ? rect.width : rect.height) -
          DUMP_CONTRACT.baseline.splitGutterWidth
      );
      const pointer =
        splitPointerAxis === 'x' ? event.clientX - rect.left : event.clientY - rect.top;
      const alertsSize = clamp(pointer - splitPointerOffset, 0, availableSize);
      chatAlertsSplit = alertsSize / availableSize;
    }
  }

  /**
   * `hideShowPresentationArea()` — `app-room.full.js:2693-2698`, bound to `gutterDblClick` on the
   * outer split in both of the reference's layouts (`app-room.render-helpers.js:1622-1623` and
   * `:1787-1788`).
   *
   * The decision itself is in `$lib/split-gutter`, with the citations and the reasoning, because a
   * two-click state machine whose entire content is timing has to be drivable by a test.
   *
   * Deliberately NOT persisted: upstream this ends in `printSizes()`, a `console.log` and nothing
   * else (`:2708-2712`), unlike `dragEnd` which does write. Persisting here would let a transient
   * toggle overwrite the geometry the user actually chose by dragging.
   */
  function hideShowPresentationArea() {
    /*
      `K4e` binds `gutterDblClick` to this same handler (`app-room.render-helpers.js:1787-1788`), so
      the toggle exists on a phone too — and it has to move the number that layout is drawn from, or
      it would silently rewrite the desktop geometry while the user is looking at the mobile one.
    */
    if (isMobileScreen) mobileSplit = togglePresentationSplit(resolvedMainSplit);
    else mainSplit = togglePresentationSplit(resolvedMainSplit);
  }

  function beginSplit(event: PointerEvent, target: 'main' | 'chat-alerts') {
    splitMoved = false;
    splitTarget = target;
    // The drag axis follows the direction actually drawn, which mobile forces to vertical.
    splitPointerAxis =
      target === 'main' ? (splitIsHorizontal ? 'x' : 'y') : innerSplitIsVertical ? 'y' : 'x';
    const gutter = event.currentTarget as HTMLElement;
    const gutterRect = gutter.getBoundingClientRect();
    splitPointerOffset =
      splitPointerAxis === 'x' ? event.clientX - gutterRect.left : event.clientY - gutterRect.top;
    event.preventDefault();
  }

  function finishSplit() {
    /*
      A gutter that never moved is a CLICK, and two of them inside the 400ms window are the
      reference's `gutterDblClick`. Only the main gutter carries it: upstream the binding is on the
      OUTER split in both layouts (`render-helpers.js:1622-1623` and `:1787-1788`), never on the
      nested chat/alerts one, and `hideShowPresentationArea` moves the outer pair by definition.

      The counter resets on use rather than tracking a running pair, so three clicks are one
      double-click and a leftover, not two overlapping ones.
    */
    if (splitTarget === 'main') {
      const release = gutterRelease(lastGutterClickAt, performance.now(), splitMoved);
      lastGutterClickAt = release.lastClickAt;
      if (release.doubleClick) {
        hideShowPresentationArea();
        // The toggle IS the geometry change; there is no drag to persist and upstream persists none.
        splitTarget = null;
        return;
      }
    }
    /*
      A mobile drag of the MAIN split is never written down, because `K4e`'s outer split binds
      `dragStart` and no `dragEnd` (`app-room.render-helpers.js:1786-1791`) where the desktop `j4e`
      binds both (`:1620-1623`). `dragEnd` is the only thing that calls `resizeEndRoom` upstream, so
      there is nothing to record.

      The inner chat/alerts gutter is a separate question and keeps persisting: `W4e` drops its
      `dragEnd` too, but our inner gutter writes the SAME `chatAlertsSizes` key the desktop layout
      reads, and dropping the write would mean a phone silently reverting a size the user had set on
      a laptop. That is a divergence, and it is here rather than silent.
    */
    if (splitTarget === 'main' && isMobileScreen) {
      splitTarget = null;
      return;
    }
    if (splitTarget) persistSplitSizes(splitTarget);
    splitTarget = null;
  }

  /**
   * The room's realtime channel - the half that makes this a room rather than a page.
   *
   * The capture subscribes to `/sess/{sessionID}/alerts/` (and nine sibling channels) over
   * SocketCluster and drains each with `for await`, pushing every message into `alertsLog` /
   * `chatLog` and re-emitting it on its event bus. This room subscribed to nothing: an alert a
   * presenter posted was invisible to every other member until that member reloaded, because
   * `invalidateAll()` only ever ran after the acting user's own submission.
   *
   * `invalidate` rather than a local push: the alert list is server-derived (it carries the
   * sender's avatar, role and evidence state, joined in `+page.server.ts`), so refetching keeps
   * one source of truth instead of two shapes of the same row. The event is the trigger, not the
   * payload - which is also why a message this peer caused is skipped, since its own action has
   * already invalidated.
   */
  /**
   * The member's own city, resolved in the BROWSER and posted back for the roster.
   *
   * Faithful to the reference, which calls `reallyfreegeoip.org` over JSONP — a `<script>` tag, not
   * `fetch`, because the host serves no CORS headers. `ip-api.com` appears in the reference only as
   * a clickable link inside the User Info modal and is NOT the geolocation API; wiring that instead
   * is the obvious wrong guess.
   *
   * **Privacy cost, stated rather than buried:** every member's browser discloses their IP to a
   * third party with no SLA. Resolving it server-side from the connection would produce the same
   * roster line without that disclosure. Matching the reference is the current instruction and this
   * is on the improvement list, not forgotten.
   *
   * Failure is silent by design: no location simply means no line under the name, which is exactly
   * what a room whose members block third-party scripts already shows.
   */
  function resolveOwnLocation(): () => void {
    if (typeof document === 'undefined') return () => {};

    const callback = `ptrGeo${Math.floor(Math.random() * 1e9)}`;
    const script = document.createElement('script');
    let settled = false;

    const cleanUp = () => {
      if (settled) return;
      settled = true;
      delete (window as unknown as Record<string, unknown>)[callback];
      script.remove();
    };

    (window as unknown as Record<string, unknown>)[callback] = (location: unknown) => {
      const locStr = formatUserLocation(location as Parameters<typeof formatUserLocation>[0]);
      cleanUp();
      if (!locStr) return;
      void fetch('/api/roster/location', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locStr })
      }).catch(() => {
        // The roster line is cosmetic; a failed post must not surface as an error in the room.
      });
    };

    script.src = `https://reallyfreegeoip.org/json/?callback=${callback}`;
    script.onerror = cleanUp;
    document.head.append(script);
    return cleanUp;
  }

  function subscribeToRoomEvents() {
    if (typeof EventSource === 'undefined') return () => {};

    /*
      This room's own channel, not the constant `ptr-room`.

      The capture's paths are `/sess/{sessionID}/…` because it hosts many rooms, and so does this
      now. `data.room.shortCode` comes from the controller with the rest of the configuration, so
      it is what the session was actually handed off into - a client cannot put itself in another
      room by editing the URL, because the SERVER keys the subscription off the session too.
    */
    const source = new EventSource(`/sess/${encodeURIComponent(data.room.shortCode)}/events`);

    source.addEventListener('message', (event) => {
      let payload: { channel?: string; data?: Record<string, unknown> } | null = null;
      try {
        payload = JSON.parse((event as MessageEvent<string>).data);
      } catch {
        // A malformed frame must not kill the stream; the next one may be fine.
        return;
      }
      if (!payload?.channel) return;

      /*
        The command channel does not refetch - it ACTS.

        `remotePresCommand` is carried out by the peer it names, not by the presenter who sent it:
        `case "mutemic": muteMic()`, `case "mutecam": stopCam()`, `case "mutescreens":
        stopSharingAll()`. So a member's own browser is what turns their microphone off, which is
        also why the authority to send it is checked on the server rather than here.
      */
      if (payload.channel === 'cmds') {
        const command = payload.data as
          | {
              cmd?: string;
              subCmd?: string;
              targetUserId?: number;
              recName?: string;
              /** `giveMicScreen`'s payload: `{give: boolean}`. */
              give?: boolean;
              /** `playMP3ForAll`'s payload: `{url}`. Room-wide, so it carries no target. */
              url?: string;
              /** `focusOnScreen` — the producer id of the screen to move to. */
              screenId?: string;
            }
          | undefined;

        /*
          The room's recording state, for EVERYONE in it. Verbatim:

            subscribe("startRec",  i => { roomState.isRecording = !0;
              !doNotDisturbOn && recordingStartSound && !videoOnlyMode && recordingStart.play() })
            subscribe("stopRec",   i => { roomState.isRecording = !1;
              !doNotDisturbOn && recordingStopSound  && !videoOnlyMode && recordingStop.play() })
            subscribe("pauseRec",  () => { roomState.isRecordingPaused = !0;
              !doNotDisturbOn && recordingStopSound && recordingStop.play() })
            subscribe("resumeRec", () => { roomState.isRecordingPaused = !1;
              !doNotDisturbOn && recordingStopSound && recordingStart.play() })

          Two quirks kept because they are the capture's: pause and resume BOTH check
          `recordingStopSound` (resume plays the start sound behind the stop preference), and
          neither checks `videoOnlyMode` where start and stop do.
        */
        if (command?.cmd === 'startRec') {
          roomIsRecording = true;
          roomRecordingPaused = false;
          roomRecName = command.recName ?? '';
          if (!doNotDisturbOn && recordingStartSound) playSoundEffect('recordingStart');
          return;
        }
        if (command?.cmd === 'stopRec') {
          roomIsRecording = false;
          roomRecordingPaused = false;
          roomRecName = '';
          if (!doNotDisturbOn && recordingStopSound) playSoundEffect('recordingStop');
          return;
        }
        if (command?.cmd === 'pauseRec') {
          roomRecordingPaused = true;
          if (!doNotDisturbOn && recordingStopSound) playSoundEffect('recordingStop');
          return;
        }
        if (command?.cmd === 'resumeRec') {
          roomRecordingPaused = false;
          if (!doNotDisturbOn && recordingStopSound) playSoundEffect('recordingStart');
          return;
        }

        /*
          `case "giveMicScreen": P("giveMicScreen give: " + i.give);
                                 appEventBus.emit("giveMicScreen", i)`

          Its own top-level command carrying `{give}`, NOT a `remotePresCommand` subCmd - an
          earlier version of this dispatched it as one, which no sender would ever have matched.

          The subscriber assigns three things in one statement:
          `globals.user.isPresenter = globals.isLimitedPresenter = globals.isPresenter = e.give`.
          So being handed mic and screen makes a member a LIMITED presenter - presenter enough to
          speak and share, not enough for the archives or the administrative half of the user-info
          modal, both of which read `isPresenter && !isLimitedPresenter`. Taking it away puts them
          back.
        */
        if (command?.cmd === 'giveMicScreen') {
          if (command.targetUserId !== data.user.id) return;
          isLimitedPresenter = command.give === true;
          /*
            The recipient is told, in the reference's own words. From offset 2499228:

              appEventBus.subscribe('giveMicScreen', i =>
                i.give ? alertsService.success('You can now Talk / Screenshare')
                       : alertsService.error('You can no longer Talk / Screenshare'))

            `success` and `error`, not one skin for both — losing a capability is not good news, and
            the capture colours it accordingly.
          */
          showToast({
            kind: command.give === true ? 'success' : 'error',
            message:
              command.give === true
                ? 'You can now Talk / Screenshare'
                : 'You can no longer Talk / Screenshare',
            enableHtml: false
          });
          /*
            The media actually restarts now — `TODO.md` gap 22. The capture's own handler:

              disconnectAll(), setTimeout(() => initWithGlobalsAndEventHandler(...), 3e3)

            The 3-second delay is the capture's, kept rather than tuned: the server tears the peer
            down when the socket's session ends, and reconnecting into a teardown that has not
            finished is how you get two peers for one person.

            **TAKING mic/screen away works completely.** The rebuild closes every producer this peer
            held, so a member who was talking stops, immediately and server-side.

            **GIVING is still half a feature, and the reason is architectural rather than a
            forgotten line.** The SFU decides who may produce from the GRANT's role, and
            `/api/media/grant` mints that from the CONTROLLER's membership —
            `joinsMediaAsProducer(isPresenter || hasCam || hasMic || hasScreen)`, read from
            `readRoomConfig`. `isLimitedPresenter` is runtime state that never touches the
            membership, so a rebuilt session re-mints the SAME `member` grant and the SFU answers
            `forbidden` to `produce`.

            Closing that needs a decision nobody has taken, and it is not ours to invent: either
            `giveMicScreen` writes `hasMic`/`hasScreen` onto the membership — durable, works, and
            diverges from the capture's explicitly transient model — or the grant learns to carry a
            runtime elevation, which means the client asserting its own authority. Recorded in
            `TODO.md` rather than guessed at.
          */
          if (restartMediaSession) {
            const restart = restartMediaSession;
            setTimeout(() => void restart(), 3000);
          }
          return;
        }

        /*
          `playMP3ForAll` / `stopMp3ForAll` — a sound every browser in the room plays.

          Room-wide, so unlike `giveMicScreen` there is no `targetUserId` to match on: everybody
          who receives it plays it, which is the whole point of "For All".
        */
        if (command?.cmd === 'playMP3ForAll') {
          mp3Url = typeof command.url === 'string' ? command.url : null;
          mp3Playing = mp3Url !== null;
          return;
        }
        if (command?.cmd === 'stopMp3ForAll') {
          mp3Url = null;
          mp3Playing = false;
          return;
        }

        if (command?.cmd === 'focusOnScreen') {
          /*
            A presenter pulled the room to a screen. `selectScreenTabOfId` rather than assigning
            `selectedScreenTab`, because it HONOURS THE LOCK — a member who has locked a screen is
            not dragged off it, which is the same rule `addRemoteScreen` relies on.

            No re-broadcast from here. Upstream that guard is the `i` parameter of
            `onScreenShareTabChange(e, i = !0)`, which callers pass false for programmatic changes;
            here the equivalent is simply that only the user-initiated tab click broadcasts.
          */
          if (typeof command.screenId === 'string') selectScreenTabOfId(command.screenId);
          return;
        }

        if (command?.cmd !== 'remotePresCommand') return;
        // Addressed to one member; everyone else ignores it.
        if (command.targetUserId !== data.user.id) return;

        if (command.subCmd === 'mutemic' && !micMuted) void toggleMicrophone();
        if (command.subCmd === 'mutecam' && !webcamMuted) void toggleWebcam();
        if (command.subCmd === 'mutescreens') stopScreenSharing();
        return;
      }

      /*
        `/roster/` - `handleRosterCmd`'s only load-bearing case:
          case "getRosterCount": this.globals.rosterCount = parseInt(i.data)
        Its sibling `getRosterQueue` logs and does nothing else, so it is not reproduced.
      */
      if (payload.channel === 'roster') {
        const roster = payload.data as
          | {
              cmd?: string;
              data?: number;
              users?: typeof liveRoster;
              /** `onUserJoin` / `onUserLeave` carry the person, not a count. */
              userId?: number;
              nick?: string;
            }
          | undefined;
        if (roster?.cmd === 'getRosterCount' && typeof roster.data === 'number') {
          rosterCount = roster.data;
        }
        /*
          `onUserJoin` / `onUserLeave` — `app-room.full.js:2134-2155`, verbatim in shape:

            isPresenter && user.userXrefID !== i.userXrefID && (
              sessData.userJoinAndLeavePopup && preferences.popupOnUserJoin
                && alertsService.info(`${i.nick} logged in.`),
              sessData.beepOnUserJoin && preferences.beepOnUserJoin
                && !preferences.doNotDisturbOn && soundEffectsService.userJoin.play())

          Four things about that are load-bearing:

          * PRESENTER ONLY. A member is not told who came and went.
          * NEVER YOURSELF — `user.userXrefID !== i.userXrefID`. Opening the room would otherwise
            announce your own arrival to you.
          * TWO GATES PER EFFECT, and they are different gates. The popup needs the ROOM setting
            `userJoinAndLeavePopup` and the VIEWER preference `popupOnUserJoin`; the beep needs the
            room's `beepOnUserJoin` and the viewer's `beepOnUserJoin`. An owner can turn the feature
            off for the room, and a presenter can turn it off for themselves.
          * `info` for a join, `warning` for a leave — the reference uses two different toast skins,
            and the strings are "logged in." / "logged out." with the full stop.

          THE QUIRK, reproduced: the LEAVE beep reads `sessData.beepOnUserJoin`, not a
          `beepOnUserLeave` room setting. There is no such room setting upstream — only the viewer
          preference is per-direction. Transcribed rather than tidied.
        */
        if (
          (roster?.cmd === 'onUserJoin' || roster?.cmd === 'onUserLeave') &&
          typeof roster.userId === 'number'
        ) {
          const joined = roster.cmd === 'onUserJoin';
          if (!isPresenter || roster.userId === data.user.id) return;
          const nick = typeof roster.nick === 'string' ? roster.nick : '';

          if (
            data.sessData?.userJoinAndLeavePopup &&
            (joined ? popupOnUserJoin : popupOnUserLeave)
          ) {
            showToast({
              kind: joined ? 'info' : 'warning',
              message: `${nick} logged ${joined ? 'in' : 'out'}.`,
              enableHtml: false
            });
          }
          if (
            data.sessData?.beepOnUserJoin &&
            (joined ? beepOnUserJoin : beepOnUserLeave) &&
            !doNotDisturbOn
          ) {
            playSoundEffect(joined ? 'userJoin' : 'userLeave');
          }
          return;
        }
        // `getRoster` -> `globals.roster`, which is what the sidebar list and
        // `checkUserOnlineStatus` both read in the capture.
        if (roster?.cmd === 'getRoster' && Array.isArray(roster.users)) {
          liveRoster = roster.users;
          /*
            `subscribe("getRoster", () => { this.visibleRoster = globals.roster; this.userSearchTermTxt = "" })`

            A fresh roster clears the search rather than re-filtering it. Without this, a search run
            once would pin the sidebar to that snapshot for the rest of the session - people who
            joined afterwards would never appear, because nothing else ever reassigns it.
          */
          searchedRoster = null;
          userSearchTermTxt = '';
        }
        return;
      }

      /*
        `/cmdsAdmin/` - `handleServerCmdAdmin` carries exactly one command, and only presenters
        subscribe to it, so a member answering a poll is not broadcast to the room.
      */
      if (payload.channel === 'cmdsAdmin') {
        const admin = payload.data as { cmd?: string } | undefined;
        if (admin?.cmd === 'gotPollAnswer' && isPresenter) void invalidateAll();
        return;
      }

      /* `/privCmdsIn/{uid}-{id}/` - emits `forceReload`, addressed to one member. */
      if (payload.channel === 'privCmds') {
        const command = payload.data as { cmd?: string; targetUserId?: number } | undefined;
        if (command?.cmd === 'forceReload' && command.targetUserId === data.user.id) {
          location.reload();
        }
        return;
      }

      /*
        `/privChatIn/{uid}/` - a private message. Delivered to BOTH parties, so this fires for our
        own outgoing message too; `isMine` decides which side it belongs on, exactly as the capture
        does:

          let isMine = te.uid == myUserID;
          let peer = isMine ? te.recvdID : te.uid;
          privChatLog[peer].push(te);
          appEventBus.emit("privChatIn", te);

        The message travels with the event, so nothing has to refetch a thread to learn one line.
      */
      if (payload.channel === 'privChat') {
        const priv = payload.data as
          | { toUserId?: number; message?: PrivateChatMessage }
          | undefined;
        if (priv?.toUserId !== data.user.id) return;
        // A delete publishes without a message: the peer's copy is gone, so drop ours.
        if (!priv.message) {
          void invalidateAll();
          return;
        }
        ingestPrivateMessage(priv.message);
        return;
      }

      // Our own post already refetched. Re-invalidating would refetch twice per alert.
      if (payload.data?.senderId === data.user.id) return;

      /*
        The chat ding, transcribed from `app-chat.compiled.js:112-137`:

          !preferences.doNotDisturbOn && preferences.chatSoundOn
            ? followedUsers[e.avt].followChatStyle.playSound
                ? pling.play()
                : ((playChatMessageSoundFor.length && hashEmail(user.email) !== e.avt
                     && playChatMessageSoundFor.includes(e.avt))
                   || (sessData.dingOnNewMessage && hashEmail(user.email) !== e.avt))
                  && followed.play()

        Three things about it are worth stating, because each is easy to get wrong:

        * **A followed user wins, and plays a DIFFERENT sound.** `pling`, not `followed` — the
          per-user preference outranks the room-wide setting, and it is the only branch that does.
        * **`followed` is the sound for an ordinary new message.** The name is the reference's, and
          it is confusing: the sound file called "followed" is what the ROOM-WIDE ding uses, while
          a followed user gets "pling".
        * **Never for your own message.** The reference compares `hashEmail(user.email) !== e.avt`;
          the `senderId` guard directly above already does that here, so the check is not repeated.

        `playChatMessageSoundFor` — the per-email list — is NOT implemented. It is a room setting
        holding member email addresses, and the reference compares it against `e.avt`, an email
        HASH, so honouring it means the server sending hashed addresses rather than the raw list.
        Sending raw member emails to every browser to decide a sound would be the wrong trade;
        recorded rather than quietly skipped.
      */
      if (payload.channel === 'chat' && !doNotDisturbOn && chatSoundOn) {
        const senderHash = (payload.data as { senderEmailHash?: string } | undefined)?.senderEmailHash;
        const followStyle = senderHash ? followedUsers[senderHash]?.followChatStyle : undefined;
        if (followStyle?.playSound) playSoundEffect('pling');
        else if (data.sessData?.dingOnNewMessage) playSoundEffect('followed');
      }

      void invalidateAll();
    });

    // The sidebar reports this, so it has to be observable and not just logged.
    source.addEventListener('open', () => {
      /*
        `subscribe('reconnectedSocket', …)` — `app-room.full.js:2035-2041`:

          un('#connectedMsg').show(),
          setTimeout(() => { un('#connectedMsg').hide() }, 3e3),
          this.appService.loadSessionLogs()

        `#connectedMsg` was rendered here as a static `display: none` div and nothing ever showed
        it, so the room had the reassurance markup and never gave the reassurance. Its own scoped
        rule is `#connectedMsg { display: none }` (`app-room.component.css`), which is why the
        reference reaches for an inline `display` rather than a class — reproduced with a bound
        style for the same reason.

        RE-connect only, never the first. The event upstream is named `reconnectedSocket` and the
        message reads "Conected", which is an answer to having been disconnected; firing it on the
        first open of a fresh page would announce a recovery that never happened. `EventSource`
        re-fires `open` on every retry, so the flag is what distinguishes them.

        `loadSessionLogs()` is this room's `invalidate('room:data')` — the same "catch up on what
        was missed" the reference does, through the identifier the five-second poll already uses.
      */
      const isReconnect = roomEventsConnected === false && hasConnectedBefore;
      roomEventsConnected = true;
      hasConnectedBefore = true;

      if (!isReconnect) return;
      reconnectedFlash = true;
      globalThis.setTimeout(() => {
        reconnectedFlash = false;
      }, RECONNECTED_FLASH_MS);
      // `invalidate` directly rather than the poll's `refreshRoom`, which is scoped to `onMount`
      // and does not exist yet when this subscription is created.
      void invalidate('room:data').catch(() => {
        // A catch-up that fails is not worth an error in the room; the poll retries in 5s.
      });
    });

    source.addEventListener('error', () => {
      // EventSource reconnects on its own; log once rather than swallowing it entirely, because a
      // permanently dead channel looks exactly like a quiet room.
      roomEventsConnected = false;
      console.warn('[room-events] channel interrupted; the browser will retry');
    });

    return () => source.close();
  }

  onMount(() => {
    const stopRoomEvents = subscribeToRoomEvents();
    // After subscribe, never before: the stream must not wait on a third-party host.
    const stopGeoLookup = resolveOwnLocation();
    const imageModalWindow = window as Window & {
      openImageModal?: (event: MouseEvent | undefined, url: string) => void;
    };
    const previousOpenImageModal = imageModalWindow.openImageModal;
    imageModalWindow.openImageModal = openImageModal;
    // `ngAfterViewInit`: `sessData.tawkPresenterSupport && (loadTawkSupport(), setTAWKAttributes())`.
    // Gated on `tawkAvailable`, which adds the configured-property term — with none, no script.
    const stopTawk = tawkAvailable ? loadTawkSupport() : () => {};
    initializeSoundEffects();
    setSoundEffectsVolume(volume / 100);
    loadManagedUsers();
    promoteLegacySplitSizes();

    /*
     * Connect to the media server.
     *
     * This is what makes the connection toasts real. Defining
     * mediaServerConnected()/mediaServerDisconnected() was not enough - nothing called them, so the
     * toast could never fire, exactly the dead-code shape `unreadQa` had before it was wired.
     *
     * The grant is minted per attempt rather than cached: its lifetime is capped at five minutes
     * (`grant.rs`, MAX_GRANT_TTL_SECONDS), so a reconnect after an outage must ask for a new one.
     */
    /*
     * TURN credentials ride along with the grant. They are ephemeral - minted per request and
     * expiring - so they cannot be baked into the page, and they arrive here rather than at
     * construction because the grant is fetched when the socket opens. Held in a plain local
     * because the transports read it through a getter, so a reconnect uses the credentials minted
     * for the new grant instead of the expired ones from the first attempt.
     */
    const media = new SignallingClient({
      url: data.mediaWsUrl,
      grant: async () => {
        const response = await fetch('/api/media/grant', { method: 'POST' });
        if (!response.ok) throw new Error(`grant request failed: ${response.status}`);
        const minted = (await response.json()) as {
          grant: string;
          iceServers?: RTCIceServer[];
        };
        // Component-level now, not a local: the connectivity test reads the same value, so it
        // tests THIS deployment's relay instead of Google's STUN. See `mediaIceServers`.
        mediaIceServers = minted.iceServers ?? [];
        return minted.grant;
      }
    });
    /*
     * A MediaSession on top of the socket: it owns the Device, the recv transport and every
     * consumer. `canProduce` is the room's own presenter predicate - the server refuses `produce`
     * from a member with `forbidden`, so asking for a send transport as a reader would buy a
     * transport and a refusal.
     */
    /*
      `canProduce` must be the SAME predicate the SFU grant is minted from.

      It was `isPresenter` — the room's account role — while `/api/media/grant` mints its role from
      `joinsMediaAsProducer(...)`, the reference's `isPresenter || hasCam || hasMic || hasScreen`.
      The two disagreed for exactly the case the permissions modal exists to create: a Participant
      granted a microphone received a `presenter` grant from the server and was then refused a send
      transport by their own browser. Half a fix is worse than none, because the server-side half
      looks correct in isolation.

      One formula, one import, both halves.
    */
    const session = new MediaSession({
      signalling: media,
      canProduce: joinsMediaAsProducer({
        isPresenter,
        hasMic: data.user.hasMic,
        hasCam: data.user.hasCam,
        hasScreen: data.user.hasScreen
      }),
      iceServers: () => mediaIceServers
    });
    mediaSession = session;
    mediaSignalling = media;

    /*
      Everything this peer consumed from other people, dropped in one place.

      This has to reset the DEDUPE GUARDS, not just the visible streams, and that distinction is the
      whole reason it exists. `addRemoteScreen` returns early on
      `sharedScreens.some(entry => entry.id === info.producerId)`, `addRemoteWebcam` on
      `webcamPresenters.some(...)`, and `addRemoteAudio` on `remoteAudioStreams.has(...)`. Clearing
      `screenStreams` — which is a DIFFERENT map from `sharedScreens` — cleared no guard at all, so
      the rebuild from `getProducers` that both callers below rely on found every producer already
      "known" and consumed none of them. The result was a room that reconnected to silence and a
      blank tab bar.

      Found by the adversarial review of 2026-08-11. The reconnect half predates that day's work;
      the role-change half arrived with it.

      Dropping remote state is always safe here: both callers are points where the far side has
      already closed every consumer, so what is on screen is a still frame pretending to be live.
      `audioProducerOwners` goes too — it is keyed by producer id and would otherwise attribute a
      recycled id to whoever held it last.
    */
    function dropRemoteMedia() {
      sharedScreens = [];
      screenStreams.clear();
      // `webcamPresenters` is a `const` $state array, so it is emptied in place rather than
      // reassigned; reassigning it would replace the array every other reader is holding.
      webcamPresenters.splice(0, webcamPresenters.length);
      remoteAudioStreams.clear();
      audioProducerOwners.clear();
    }

    media.on('socketopen', ({ reconnected }) => mediaServerConnected(reconnected));
    media.on('disconnected', () => {
      mediaServerDisconnected();
      // The far side closed every consumer with the socket. Drop them so a stale picture is never
      // left frozen on screen pretending to be live; the tabs rebuild from `getProducers` on the
      // next connect.
      dropRemoteMedia();
    });

    /*
     * `connected` is the server's own notification, sent once before any command is accepted, and
     * it is the first moment `getProducers` can be issued. Producers that already exist arrive in
     * that snapshot; ones that appear later arrive as `newProducer`. Both paths funnel into
     * addRemoteScreen, which dedupes - the two overlap by design, because losing a producer is a
     * permanently blank tile.
     */
    media.on('connected', () => {
      void (async () => {
        try {
          /*
           * `load()` first, and it is not optional. It runs getRouterRtpCapabilities and
           * `device.load()`, and until it resolves the Device has no capabilities - every
           * produce/consume call throws `load() must resolve before this is available`. Omitting it
           * is what made the first working build fail silently: the presenter's share threw, the
           * viewer's tab never appeared, and the only trace was one console error.
           */
          /*
            `mediaSession`, not the `session` this handler closed over.

            `giveMicScreen` REPLACES the session (see `restartMediaSession`), and `MediaSession.close()`
            latches `#closed` permanently — `load()` calls `#assertOpen()` and throws `sessionClosed`
            on a closed instance. A handler holding the original const would therefore throw on the
            first reconnect after a role change, and the room would silently stop consuming.
          */
          const active = mediaSession;
          if (!active) return;
          sessionReady = active.load();
          await sessionReady;
          const { producers } = await media.request('getProducers');
          for (const producer of producers) {
            await addRemoteScreen(active, producer);
            await addRemoteWebcam(active, producer);
            await addRemoteAudio(active, producer);
          }
        } catch (error) {
          // Leaving `sessionReady` pending would hang every future consume on a promise that can
          // never settle, so it is reset and the next connect retries from scratch.
          sessionReady = null;
          console.error('[media] the session could not be initialised', error);
        }
      })();
    });
    /*
      `disconnectAll()` + re-init, from the capture's own handler:

        subscribe("giveMicScreen", e => {
          globals.user.isPresenter = globals.isLimitedPresenter = globals.isPresenter = e.give,
          this.mediaHandlerService.disconnectAll(),
          setTimeout(() => this.mediaHandlerService.initWithGlobalsAndEventHandler(...), 3e3)
        })

      A new MediaSession rather than a reused one: `close()` latches `#closed` permanently, so the
      old instance can never `load()` again. Everything else is deliberately reused — the same
      signalling client, the same ICE getter — because a second socket would leave the SFU holding
      two peers for one person.
    */
    restartMediaSession = async () => {
      const previous = mediaSession;
      mediaSession = null;
      sessionReady = null;
      // Closes every transport, producer and consumer this peer held. What was consumed must go
      // with them, or the tab bar keeps painting a stream whose transport no longer exists — and
      // the dedupe guards would refuse to re-consume any of it below.
      previous?.close();
      dropRemoteMedia();

      const rebuilt = new MediaSession({
        signalling: media,
        canProduce: joinsMediaAsProducer({
          isPresenter,
          hasMic: data.user.hasMic,
          hasCam: data.user.hasCam,
          hasScreen: data.user.hasScreen
        }),
        iceServers: () => mediaIceServers
      });
      mediaSession = rebuilt;

      try {
        sessionReady = rebuilt.load();
        await sessionReady;
        const { producers } = await media.request('getProducers');
        for (const producer of producers) {
          await addRemoteScreen(rebuilt, producer);
          await addRemoteWebcam(rebuilt, producer);
          await addRemoteAudio(rebuilt, producer);
        }
      } catch (error) {
        sessionReady = null;
        console.error('[media] the session could not be rebuilt after a role change', error);
      }
    };

    /*
      `mediaSession`, never the captured `session`.

      `session` is the const built at the top of this block. `restartMediaSession` replaces it —
      it must, because `close()` latches `#closed` permanently — and every handler registered here
      closes over the ORIGINAL. Reading it after a role change consumes on a session whose
      transports are gone, so every producer arriving after a mic hand-over rendered nothing, in
      silence, with no error. Found by the adversarial review of 2026-08-11.

      The null check is not defensive padding: `restartMediaSession` sets `mediaSession = null` for
      the window between closing the old session and the new one being assigned, and a producer can
      arrive inside it.
    */
    media.on('newProducer', (info) => {
      const active = mediaSession;
      if (!active) return;
      void addRemoteScreen(active, info);
      void addRemoteWebcam(active, info);
      void addRemoteAudio(active, info);
    });

    /*
     * Captions from whoever is speaking.
     *
     * An interim result replaces the line being spoken; a final one commits it to the transcript.
     * That is what `speechRecoHistoryMode` reads, and it is why interim lines are not appended -
     * recognition revises the same sentence repeatedly as it hears more of it.
     */
    media.on('speechReco', (line) => {
      const caption = {
        timestamp: line.timestamp,
        sender: line.sender ?? 'Presenter',
        text: line.text,
        live: !line.isFinal
      };
      currentCaption = caption;
      if (line.isFinal) {
        captionHistory = [...captionHistory, caption].slice(-CAPTION_HISTORY_LIMIT);
      }
    });
    // `producerPaused` / `producerResumed` are declared in `src/lib/media/signalling.ts:162,164`
    // and were listened for by nothing. They are the capture's `presMuted` / `presUnmuted`.
    media.on('producerPaused', ({ producerId }) => onRemoteAudioPaused(producerId));
    media.on('producerResumed', ({ producerId }) => onRemoteAudioResumed(producerId));
    media.on('producerClosed', ({ producerId }) => {
      removeRemoteScreen(producerId);
      removeRemoteWebcam(producerId);
      removeRemoteAudio(producerId);
    });
    media.on('peerClosed', ({ peerId }) => {
      // The current session, for the same reason as `newProducer` above: after a role change the
      // captured `session` holds the streams of a connection that no longer exists, so a peer
      // leaving would tear down nothing and leave their tile painted.
      for (const remote of mediaSession?.remoteStreams.values() ?? []) {
        if (remote.peerId === peerId) {
          removeRemoteScreen(remote.producerId);
          removeRemoteWebcam(remote.producerId);
          removeRemoteAudio(remote.producerId);
        }
      }
    });
    /*
     * A dial that fails AFTER the socket exists surfaces through `disconnected`, because #onClose
     * runs even when the open never settled. A dial that fails BEFORE it - an unreachable SFU, or
     * a grant request the deployment cannot mint (503 when MEDIA_GRANT_PRIVATE_KEY is unset) -
     * never creates a socket, so nothing emits and the rejection was being swallowed here. That is
     * precisely the case a reader hits on a deployment with no media server, and it is the case
     * that must not be silent.
     *
     * showToast() already dedupes on title+message, so the socket path firing as well cannot
     * produce two identical toasts.
     */
    void media.connect().catch(() => {
      // The first connect never reached `socketopen`, so `isMediaConnected` is still false and the
      // transition guard would swallow this. A first failure is a real disconnect to report.
      isMediaConnected = true;
      mediaServerDisconnected();
    });

    // Nothing is pushed from the server, so a reader's question, alert or chat message only shows
    // up when this page's load runs again - which is why a presenter sat on a stale tab saw an
    // empty Q&A while the row was already stored. Re-fetch on a timer, and only while the tab is
    // visible so a backgrounded room is not polling. `invalidate` re-runs the load and patches the
    // data; it is not a navigation, so scroll positions and open modals are left alone.
    const REFRESH_MS = 5000;
    /*
     * A poll that loses the network must not become an unhandled rejection.
     *
     * `void invalidate(...)` discards the promise without a handler, so a single dropped request -
     * a dev-server restart, a laptop waking up - surfaced as an uncaught error in the console with
     * a stack trace pointing here, and looked like a fault in the room rather than one skipped
     * refresh. The next tick retries anyway; that is what a poll is for.
     */
    const refreshRoom = () => {
      void invalidate('room:data').catch((error: unknown) => {
        console.warn('[room] a refresh was skipped; the next one will retry', error);
      });
    };
    let refreshTimer: ReturnType<typeof globalThis.setInterval> | undefined;
    const stopRefresh = () => {
      if (refreshTimer !== undefined) globalThis.clearInterval(refreshTimer);
      refreshTimer = undefined;
    };
    const startRefresh = () => {
      if (refreshTimer !== undefined) return;
      refreshTimer = globalThis.setInterval(() => refreshRoom(), REFRESH_MS);
    };
    const handleVisibility = () => {
      if (document.hidden) stopRefresh();
      else {
        refreshRoom();
        startRefresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    if (!document.hidden) startRefresh();

    return () => {
      stopRoomEvents();
      stopGeoLookup();
      // The injected script goes with the component. Upstream never unmounts `app-room`, so it has
      // no teardown to transcribe; leaving a third-party script attached to a dead component is
      // ours to avoid.
      stopTawk();
      endSpeechRecognition();
      mediaSignalling = null;
      /*
        Close whichever session is LIVE, which after a role change is not the captured `session`.

        This read `session.close()`, so leaving a room in which a mic had been handed over closed
        the already-closed original and left the REBUILT session's transports and
        RTCPeerConnections open — they survived the component, held the SFU peer slot, and kept the
        microphone light on. Found by the adversarial review of 2026-08-11.

        Closing `mediaSession` alone covers both cases exactly, with no double close: if no restart
        happened it IS `session`, and if one did, `restartMediaSession` already closed the original
        before replacing it.
      */
      const live = mediaSession;
      mediaSession = null;
      live?.close();
      media.close();
      stopRefresh();
      document.removeEventListener('visibilitychange', handleVisibility);
      if (previousOpenImageModal) imageModalWindow.openImageModal = previousOpenImageModal;
      else delete imageModalWindow.openImageModal;
      if (alertScrollTimer !== undefined) globalThis.clearTimeout(alertScrollTimer);
      if (chatScrollTimer !== undefined) globalThis.clearTimeout(chatScrollTimer);
      for (const timer of toastTimers.values()) globalThis.clearTimeout(timer);
      toastTimers.clear();
      unloadSoundEffects();
      stopTalking(data.user.id);
      stopStream(microphoneStream);
      stopStream(webcamStream);
      // Every shared screen, not just the newest: leaving the others running holds the camera or
      // the screen-capture indicator on after the room is gone.
      for (const stream of localScreenStreams.values()) stopStream(stream);
      localScreenStreams.clear();
      stopStream(screenStream);
      if (recordedScreenUrl) URL.revokeObjectURL(recordedScreenUrl);
    };
  });

  function captureMainElement(node: HTMLElement) {
    mainElement = node;

    return () => {
      if (mainElement === node) mainElement = undefined;
    };
  }

  function captureAlertChatElement(node: HTMLElement) {
    alertChatElement = node;

    return () => {
      if (alertChatElement === node) alertChatElement = undefined;
    };
  }

  function captureComposerElement(node: HTMLTextAreaElement) {
    composerElement = node;

    return () => {
      if (composerElement === node) composerElement = undefined;
    };
  }

  /*
    Verbatim port of the captured composer's own auto-expand
    (docs/source/components/app-chat.full.js):

      autoExpand(e) {
        e.style.height = '0';
        const i = window.getComputedStyle(e), o = e.scrollHeight + 'px';
        i.getPropertyValue('height') !== o && (e.style.height = o);
        '' === e.value.trim() && (e.style.height = '23px');
      }

    Without it the field stays pinned at its 35px CSS height and grows a scrollbar the
    moment a message wraps to a second line. The deployed app binds this to 'input' in
    ngAfterViewInit and calls it again after each Enter, so the box tracks the message up
    to the 300px max-height and collapses once it is empty.
  */
  function autoExpandComposer(element: HTMLTextAreaElement | undefined) {
    if (!element) return;

    element.style.height = '0';
    /*
      `+ 2`, and it is not padding for luck - it is the capture's:

        const o = e.scrollHeight + 2 + 'px';

      Setting the height to exactly `scrollHeight` leaves the content a hair taller than the box it
      is measured against, and `.txt-area` carries `overflow-y: auto` from the captured sheet, so
      the browser puts a scrollbar inside an empty one-line composer. Those two pixels are the
      whole reason the original does not have one.
    */
    const height = `${element.scrollHeight + 2}px`;
    if (window.getComputedStyle(element).getPropertyValue('height') !== height) {
      element.style.height = height;
    }
    if (element.value.trim() === '') element.style.height = '23px';
  }

  function captureAlertsScroller(node: HTMLElement) {
    alertsScroller = node;

    return () => {
      if (alertsScroller === node) alertsScroller = undefined;
    };
  }

  function captureChatScroller(node: HTMLElement) {
    chatScroller = node;

    return () => {
      if (chatScroller === node) chatScroller = undefined;
    };
  }

  // The captured `offsetWidth >= 400` rule lives in app.css as a container query, so the right
  // button set is painted by the server instead of measured a frame after hydration. This observer
  // keeps the other half of the captured behaviour: once the composer is too narrow to show the
  // option buttons, any picker they opened is dismissed. It must NOT also assign
  // `showMessageOptions` - that is purely the explicit "+" override, and re-deriving it from the
  // width here immediately cancelled the user's click.
  function observeComposerWidth(node: HTMLElement) {
    const applyWidthRule = () => {
      if (node.offsetWidth >= 400) return;
      showMessageOptions = false;
      emojiOpen = false;
      giphyOpen = false;
    };
    const observer = new ResizeObserver(applyWidthRule);
    observer.observe(node);

    return () => observer.disconnect();
  }

  function setWebcamAudioAttributes(node: HTMLAudioElement) {
    node.setAttribute('autoplay', 'autoplay');
    node.setAttribute('hidden', 'true');
  }

  function setAutoplayAttribute(node: HTMLMediaElement) {
    node.setAttribute('autoplay', 'autoplay');
  }

  /** One entry per user with a live camera - the room's `webcamingUsers`. */
  type WebcamPresenter = { id: string; name: string; isMe: boolean };

  /**
   * `webcamingUsers`, as far as this room can populate it.
   *
   * The capture pushes an entry when a camera comes on ("<name> webcam on") and emits
   * `newWebcamPresenter`, which creates the card; `removePresenterWebcam` destroys it. So the
   * list IS the card set, and an empty list means no cards at all - which is why nothing should
   * be on screen before anyone opens a camera.
   *
   * Only this peer is in it. Remote cameras arrive over the SFU through
   * `connectToScreenOfProducer` / the `newWebcamStream` event, which is not wired yet, so a
   * remote presenter's card is honestly absent rather than rendered empty.
   */
  const webcamPresenters = $state<WebcamPresenter[]>([]);

  /**
   * `addPresenterdWebcam(e)` - note the guard, which is the capture's own:
   *
   * ```js
   * if (this.webcamsIdxs.includes(e._id)) return void P("...already have entry for this muser.. NOP");
   * ```
   */
  function addWebcamPresenter(presenter: WebcamPresenter) {
    if (webcamPresenters.some((entry) => entry.id === presenter.id)) return;
    webcamPresenters.push(presenter);
  }

  /** `removePresenterWebcam(e)` - `container.remove(idx)`, i.e. the card is destroyed. */
  function removeWebcamPresenter(id: string) {
    const at = webcamPresenters.findIndex((entry) => entry.id === id);
    if (at > -1) webcamPresenters.splice(at, 1);
  }

  /**
   * `closeMe()` (`docs/source/components/app-presenter-cams.compiled.js`):
   *
   * ```js
   * closeMe() {
   *   this.muser.isMe ? (this.pStream = null)
   *                   : (this.pStream = null, this.mediaSoupService.hupScreenOfProducer(this.muser));
   *   this.appService.guiEventBus.emit('removeWebcamPresenter', this.muser);
   * }
   * ```
   *
   * The emit is the part that matters: `removePresenterWebcam` calls `container.remove(idx)` and
   * deletes the entry, so the card is DESTROYED, not merely blanked. Dropping this peer out of
   * {@link webcamPresenters} is the same thing here - the `{#each}` removes the node.
   *
   * For ourselves that means turning the camera off, which is what clears `pStream`. The remote
   * branch additionally needs `hupScreenOfProducer`, which is not wired yet.
   */
  function closeWebcamPreview(presenter: WebcamPresenter) {
    // `closeMe()` emits `removeWebcamPresenter` and, for ourselves, does nothing else -
    // `this.muser.isMe ? (this.pStream = null) : ...`. It NEVER calls `stopCam()`, so the camera
    // keeps running and only the preview goes away. Verified against every `stopCam()` call site
    // in the bundle: `toggleCam()`, the soft reset, and the remote `"mutecam"` command. None of
    // them is this.
    removeWebcamPresenter(presenter.id);
    if (!presenter.isMe) {
      // The remote branch also needs `hupScreenOfProducer(muser)`, which is not wired yet.
      return;
    }
  }


  /**
   * Puts a REMOTE presenter's camera into their card.
   *
   * The mirror of {@link attachLocalWebcam}. Not muted the way the local preview is: that one is
   * muted because it is your own microphone path played back at you, while a remote presenter is
   * the audio you actually want. `playsInline` and the surfaced `play()` rejection are kept for
   * the same reasons as every other stream in this room.
   */
  function attachRemoteWebcam(producerId: string) {
    return (node: HTMLVideoElement) => {
      node.setAttribute('autoplay', 'autoplay');
      node.playsInline = true;

      const stream = webcamStreams.get(producerId) ?? null;
      if (node.srcObject !== stream) node.srcObject = stream;

      if (stream) {
        node.play().catch((error: unknown) => {
          console.warn(`[media] remote webcam ${producerId} could not play`, error);
        });
      }

      return () => {
        node.pause();
        node.srcObject = null;
      };
    };
  }

  /**
   * A webcam card's initial placement and its drag/resize, in the order the capture applies them.
   *
   * **Placement** is `resetWebcamPositionsAlt()`, which `app-room` runs 100ms after
   * `newWebcamPresenter`:
   *
   * ```js
   * resetWebcamPositionsAlt() {
   *   const c = $('#mainAreaSplit'), s = c.offset();
   *   let lastX = 0, lastY = 0, idx = 0;
   *   Object.keys(this.webcams).forEach(id => {
   *     const el = $(`#webcamsHolder-${…pID}`);
   *     idx === 0 ? (lastX = s.left + 20, lastY = s.top + 20)
   *               : (lastX = lastX + el.innerWidth() + 5, lastY = s.top + 20);
   *     el.offset({ top: lastY, left: lastX });
   *     idx++;
   *   });
   * }
   * ```
   *
   * So the first card sits 20px in from the TOP-LEFT of `#mainAreaSplit` and each next one tiles
   * to its right with a 5px gap - not bottom-centre, which is what this room had been placing it
   * at by way of an invented wrapper height.
   *
   * **Then** `initDrag()` (1000ms after the card's own `ngOnInit`) applies any stored position
   * over the top and enables the gestures. Running later is what makes a remembered position win,
   * so the stored bounds are checked FIRST here and the default is skipped when one exists -
   * otherwise the card would visibly jump from the default to the stored spot.
   *
   * `cancel: '.closeIcon'` is the one addition. The captured `initDrag()` passes no `cancel`
   * because jQuery UI does not use pointer capture, so a click on the X still reaches it. This
   * room's `makeDraggable` calls `setPointerCapture` on pointerdown, which retargets the pointerup
   * to the card and swallows the click outright - the X simply stopped closing. Excluding the icon
   * from the drag restores the captured behaviour rather than changing it.
   */
  function webcamCard(presenter: WebcamPresenter, index: number) {
    // `webcam-<sessionID>-<name with spaces underscored>` - the capture keys the position to the
    // PERSON, so it survives the producer id changing on a reconnect.
    const persistKey = `webcam-${data.sessionHandle}-${presenter.name.replaceAll(' ', '_')}`;
    const attachGestures = panelDragResize({
      persistKey,
      cancel: '.closeIcon',
      snap: true,
      handles: 'n, e, s, w, ne, se, sw, nw'
    });

    return (node: HTMLElement) => {
      /*
        Zero the margin before anything writes `left`/`top`.

        The captured `.webcamsHolder` carries `margin: 5px`, and the capture positions with
        jQuery's `.offset({top,left})`, whose setter COMPENSATES for margin - it solves for the
        CSS `top`/`left` that lands the border box on the requested point. Writing `left` directly,
        as both the placement below and `makeDraggable` do, does not: the margin is added on top
        every time.

        Measured with it left in place: the first card landed at 25,74 for a requested 20,69, and
        a drag dispatched as +100,+100 moved it +105,+105 - so the card crept 5px further right
        and down on EVERY drag. Removing the margin once, here, makes `left`/`top` mean what the
        capture's `.offset()` means. Nothing else uses that margin: the card is out of flow, so it
        was never spacing it from a sibling.
      */
      node.style.margin = '0';

      if (!readPanelBounds(persistKey)) {
        const container = document.querySelector('#mainAreaSplit');
        if (container) {
          const bounds = container.getBoundingClientRect();
          node.style.position = 'fixed';
          node.style.left = `${bounds.left + 20 + index * (node.offsetWidth + 5)}px`;
          node.style.top = `${bounds.top + 20}px`;
          node.style.right = 'auto';
          node.style.bottom = 'auto';
        }
      }
      return attachGestures(node);
    };
  }

  /**
   * Puts THIS peer's camera into the first webcam card.
   *
   * The card markup was reproduced from the capture as two static placeholders and nothing was
   * ever wired to them, so `toggleWebcam` produced a camera that was genuinely open - the browser
   * reported it in use - with no picture anywhere. `srcObject` cannot be set from markup, so it
   * has to be assigned here.
   *
   * Read the reactive state INSIDE the body, not in the returned teardown: an attachment runs in
   * an effect and re-runs when what it reads changes, and the returned function is the teardown.
   * That distinction is the same one recorded in `ScreenPane.svelte`, where putting the work in
   * the returned function meant the element never got a `srcObject` and nothing threw.
   *
   * `muted` is not optional. This is the presenter's own camera played back to them; unmuted it
   * would feed the room's audio back into the room, and Chrome blocks audible autoplay without a
   * gesture anyway, which would leave the preview frozen on its first frame.
   */
  function attachLocalWebcam(node: HTMLVideoElement) {
    node.setAttribute('autoplay', 'autoplay');
    node.muted = true;
    node.playsInline = true;

    const stream = webcamMuted ? null : webcamStream;
    if (node.srcObject !== stream) node.srcObject = stream;

    if (stream) {
      node.play().catch((error: unknown) => {
        // Surfaced rather than swallowed: "no camera" and "camera paused by policy" look the same.
        console.warn('[media] local webcam preview could not play', error);
      });
    }

    return () => {
      node.pause();
      node.srcObject = null;
    };
  }

  function mountNewNoteLink(menu: HTMLUListElement) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    const icon = document.createElement('i');

    link.setAttribute('href', '#');
    link.className = 'dropdown-item';
    icon.className = 'fas fa-plus';
    link.append(icon, document.createTextNode(' New Note'));
    link.addEventListener('click', (event) => {
      event.preventDefault();
      notesMenuOpen = false;
      mainTab = 'notes';
      newNoteOpen = noteGates.editorMounted;
    });
    item.append(link);
    menu.append(item);

    return () => item.remove();
  }

  async function submitNoteMutation<
    Success extends Record<string, unknown> = Record<string, unknown>
  >(
    action:
      | 'deleteSessionNoteTab'
      | 'newSessionNoteTab'
      | 'renameSessionNoteTab'
      | 'restoreNoteVersion'
      | 'saveSessionNote'
      | 'setWelcomeMatNoteTab',
    values: Record<string, boolean | string | number>
  ): Promise<Success | undefined> {
    const body = new FormData();
    for (const [key, value] of Object.entries(values)) body.set(key, String(value));
    const response = await fetch(`?/${action}`, { method: 'POST', body });
    const result = deserialize<Success, { message?: string }>(await response.text());

    if (result.type === 'failure') {
      throw new Error(result.data?.message ?? `Unable to ${action}.`);
    }
    if (result.type === 'error') {
      throw new Error(result.error.message ?? `Unable to ${action}.`);
    }
    if (result.type !== 'success') {
      throw new Error(`Unable to ${action}.`);
    }

    await invalidateAll();
    return result.data;
  }

  async function loadNoteVersions(noteId: number): Promise<readonly NoteVersion[]> {
    const response = await fetch(`/api/notes/${noteId}/versions`);
    if (!response.ok) {
      throw new Error('Unable to load note versions.');
    }
    return (await response.json()) as readonly NoteVersion[];
  }

  function mountUploadFileLink(menu: HTMLUListElement) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    const icon = document.createElement('i');

    link.setAttribute('href', '#');
    link.className = 'dropdown-item';
    icon.className = 'fas fa-plus';
    link.append(icon, document.createTextNode(' Upload File'));
    link.addEventListener('click', (event) => {
      event.preventDefault();
      filesMenuOpen = false;
      openModal('file-upload');
    });
    item.append(link);
    menu.append(item);

    return () => item.remove();
  }
</script>

<!--
  Children [3] and [4] of `div.zoom-controls-container` — the screen overlay's volume dropdown.

  Declared here and passed into `ScreenZoomControls` so the ORDER stays with the component that
  documents it (trio, volume, then the three dark buttons), while the state stays on this page,
  which is where `app-presentationarea` keeps `audioVolume`, `preferences.audioMutedFor`,
  `preferences.audioVolumeFor` and `mediaService.talkingUsers`.
-->
{#snippet screenVolume()}
  <ScreenVolumeControl
    {viewerOnlyMode}
    audioVolume={volume}
    {talkingUsers}
    preferences={presenterAudio}
    {individualVolumeControls}
    onvolume={setMasterVolume}
    onmute={muteScreenAudio}
    onunmute={unmuteScreenAudio}
    ontogglepresenter={toggleTalkingPresenterAudio}
    onpresentervolume={adjustPresenterVolume}
  />
{/snippet}

{#snippet bodySegmentsPrivate(text: string)}
  {#each text.split(/((?:http|https|ftp):\/\/[\w?=&.@/\-;#~%]+)/gi) as part, index (index)}
    {#if /^(?:http|https|ftp):\/\//i.test(part)}<!-- svelte-ignore a11y_click_events_have_key_events --><!-- svelte-ignore a11y_no_static_element_interactions --><a
        href={part}
        target="_blank"
        rel="noreferrer"
        class="linkColor"
        onclick={(event) => event.stopPropagation()}>{part}</a
      >{:else}{part}{/if}
  {/each}
{/snippet}


<svelte:window
  bind:innerWidth={windowWidth}
  onclick={(event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('.textAreaBtns, .popOverDiv')) {
      emojiOpen = false;
      giphyOpen = false;
    }
    if (target?.closest('.dropdown')) return;
    closeFloatingMenus();
  }}
  onpointermove={(event) => {
    if (splitTarget) resizeFromPointer(event);
  }}
  onpointerup={finishSplit}
  onpointercancel={finishSplit}
  onkeydown={(event) => {
    /*
      `onKeyDown` — `app-room.full.js:3011-3021`, bound as a host listener on `keydown`
      (`app-room.compiled.js:1260-1266`). Two unrelated features that share the keyboard, in the
      reference's own order: push-to-talk first, then the copy restriction.

      Both predicates live in `$lib/room-key-gates` with their citations. They run before the
      Escape handling below because that returns early on every other key, which is exactly how a
      host binding added here would go unnoticed.
    */
    if (pushToTalkShouldUnmute(event, { pushToTalk, micMuted })) void toggleMicrophone();
    if (shouldBlockCopyKey(event, { disableCopy, isPresenter })) event.preventDefault();

    if (event.key !== 'Escape') return;
    /*
      The emoji and GIF triggers carry ngbPopover's `autoclose: 'outside'`, and that mode
      closes on Escape as well as on an outside click - the click half was already handled
      above, this is the other half.
    */
    if (emojiOpen || giphyOpen) {
      emojiOpen = false;
      giphyOpen = false;
      return;
    }
    if (selectedImageUrl) selectedImageUrl = null;
    else if (bootboxConfirmation) bootboxConfirmation = null;
    else if (bootboxPrompt) bootboxPrompt = null;
    else if (bootboxAlert) bootboxAlert = null;
  }}
  onkeyup={(event) => {
    /*
      `onKeyUp` — `app-room.full.js:3027-3032`, host-bound on `keyup`
      (`app-room.compiled.js:1274-1280`). The release half of push-to-talk, and the ONLY thing on
      that listener upstream: `disableCopy` has no keyup arm, because suppressing a keystroke has
      to happen on the way down.
    */
    if (pushToTalkShouldMute(event, { pushToTalk, micMuted })) void toggleMicrophone();
  }}
  oncontextmenu={(event) => {
    /*
      `onRightClick` — `app-room.full.js:3022-3026`, host-bound on `contextmenu`
      (`app-room.compiled.js:1267-1273`). Every right-click, not merely those over the presentation
      area, and never the presenter's.

      Bound on `window` rather than `document`: the reference uses a different target resolver here
      than for the key events, and neither resolver is defined anywhere in the decoded tree, so
      which is which is not established. `contextmenu` bubbles to both, and this handler's only
      effect is `preventDefault`, so the distinction cannot change behaviour — see the note at the
      top of `$lib/room-key-gates`.
    */
    if (shouldBlockContextMenu({ disableCopy, isPresenter })) event.preventDefault();
  }}
  onbeforeunload={() => {
    /*
      The other half of the `hidePresentation` block, registered in the same statement upstream:

        (chatOnlyMode || sessData.isChatOnlyRoom) &&
          ((this.hidePresentation = !0),
           window.addEventListener('beforeunload', () => {
             window.opener.postMessage('windowClosing', window.location.origin);
           }))

      (`app-room.full.js:1903-1907`.) It is how the opener learns the popout closed: the room that
      detached the chat listens for exactly this message and calls `reatachChat` —
      `window.addEventListener("message", o => "windowClosing" === o.data && emit("reatachChat"))`
      (`:1692-1693`, transcribed in `detachAlerts` above). Without it, closing the detached window
      leaves the opener believing the pair still lives elsewhere, and the column never comes back.

      Gated on the MODE, not on `hidePresentation`: a room whose owner set `isChatOnlyRoom` is not a
      popout and has no opener to notify. `chatOnlyMode` is the `co=1` that `detachAlerts` sets, so
      it is the precise condition under which an opener exists.

      The `window.opener` guard is OURS and is a declared divergence. The reference dereferences it
      unconditionally, which is safe upstream only because `co=1` is reached exclusively through
      `detachChat`. This room can also be opened at `?co=1` by hand — a member who bookmarks the
      popout URL — and there `window.opener` is null, so the reference's line would throw a
      TypeError on every unload. The origin argument is `window.location.origin`, matching the
      reference exactly: the opener and the popout are the same origin, so this never posts
      cross-origin.
    */
    if (!chatOnlyMode) return;
    window.opener?.postMessage('windowClosing', window.location.origin);
  }}
/>

<app-root ng-version="17.3.12">
  <router-outlet></router-outlet>
  <!--
    `.detach-screen` is the captured stylesheet's own hook for a popped-out screen:
      .detach-screen .webcamScreen    { max-height: 100vh !important }
      .detach-screen .overflow-hidden { overflow: initial !important }
    so the screen fills the popout window instead of being boxed by the room's layout.
  -->
  <app-room
    id="topRoomDiv"
    class={theme === 'dark' ? 'darkTheme' : 'lightTheme'}
    class:detach-screen={detachedScreenId !== null}
  >
    <!--
      `KAe = (t, n) => ({'push-wrapper': t, 'mt-0': n})`, bound as
      `Kn(6, KAe, o.showSidebar, videoOnlyMode || chatOnlyMode || viewerOnlyMode)`
      (`docs/source/components/app-room.full.js:4029-4039`, pure function at `:5`).

      `mt-0` was never bound here, and it is not cosmetic. This component's own stylesheet sets
      `.wrapper { margin-top: 49px }` and `.navbar { height: 49px }`
      (`app-room.component.css`), so the 49px is space reserved FOR the navbar — and the navbar is
      removed in these same three modes (see the gate on `mainNavigation` below). Without `mt-0`
      the room keeps a 49px gap where a navbar used to be, and `vh-100` on the split then pushes
      49px of content off the bottom of the window.

      `videoOnlyMode` is the `r` query parameter, which this room does not model — the same honest
      gap recorded for `hideFiles` in `files-gates.ts`. The two modes it does model are bound.
    -->
    <div
      class="wrapper"
      class:push-wrapper={sidebarOpen}
      class:mt-0={chatOnlyMode || viewerOnlyMode}
    >
      <div class="d-flex flex-column-reverse flex-sm-row room-container">
        {#snippet mainNavigation()}
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
              <i class="fas fa-user"></i><span class="ml-1">{connectedCount}</span>
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
                onclick={getMyPinAndDoInfo}
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
                {#if presenterTalking && talkingUsers.length > 0}
                  <li class="nav-item talkingIndicator animated fadeIn">
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <a class="talking">
                      <i class="icon fa fa-microphone"></i>
                      &nbsp;
                      <span class="talking-string">
                        {#each talkingUsers as talkingUser, index (talkingUser.userID)}
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
                  The room's recording badge, for EVERYONE - this reports state, it does not change
                  it, so it is deliberately outside the presenter block below.

                  Consts 92/93/94, and the gating from the update block:
                    O(6, isRecording && !isRecordingPaused ? 6 : -1)   -> [ REC ]
                    O(8, isRecordingPaused && isRecording ? 8 : -1)    -> [ REC PAUSED]
                    recIndicatorStart                                  -> spinner + REC, while starting

                  Driven by `roomIsRecording`, which the server pushes. It used to be gated on
                  `recording` - this browser's own MediaRecorder - so it only ever appeared for the
                  presenter doing the recording, and every member saw nothing.

                  The tooltip is the one part that IS member-aware, and only to hide the file name:
                    (sessData.dontShowRecInfoToUsers && !isPresenter) || !roomState.recName
                      ? '' : 'Recording to: ' + decodedRecName()
                -->
                {#if roomRecordingPaused && roomIsRecording}
                  <li class="nav-item recIndicator animated flash">
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <a>[ REC PAUSED]</a>
                  </li>
                {:else if roomIsRecording}
                  <li class="nav-item recIndicator animated fadeIn">
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <a title={recordingTooltip}>[ REC ]</a>
                  </li>
                {:else if isRecordingStarting}
                  <li class="nav-item recIndicatorStart">
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <a class="nav-link"><i class="fas fa-spinner fa-spin"></i> REC </a>
                  </li>
                {/if}
                <!--
                  Broadcast controls - recording, SoundCloud, microphone, screen sharing, webcam and
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
                      aria-expanded={recordingMenuOpen}
                      class="nav-link dropdown-toggle d-flex align-items-center"
                      class:muted={!screenSharing}
                      onclick={() => toggleTopMenu('recording')}
                    >
                      <i class="far fa-2x fa-dot-circle"></i>
                      <span class="ml-2 mainNavItem">Start/Stop Recording</span>
                    </a>
                    {#if recordingReminder && (!recording || recordingPaused)}
                      <div class="recording-reminder">
                        <span class="recording-reminder-arrow"></span>
                        <span>You are not recording!</span>
                        <button
                          type="button"
                          class="btn-close"
                          onclick={() => (recordingReminder = false)}
                          aria-label="Close"
                        ></button>
                      </div>
                    {/if}
                    <ul
                      aria-labelledby="dropdownRecording"
                      data-bs-popper={recordingMenuOpen ? 'static' : undefined}
                      class="screen-options-start-screen dropdown-menu dropdown-menu-end"
                      class:show={recordingMenuOpen}
                      style={recordingMenuOpen ? 'display: block;' : undefined}
                    >
                      {#if !screenSharing}
                        <li class="nav-item">Can't start recording without screenshare</li>
                      {:else}
                        {#if !recording}
                          <!-- svelte-ignore a11y_click_events_have_key_events -->
                          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                          <li onclick={startRecording}>
                            <!-- svelte-ignore a11y_missing_attribute -->
                            <a aria-hidden="true"
                              ><i class="far fa-dot-circle"></i> Start Recording
                            </a>
                          </li>
                        {:else}
                          <!-- svelte-ignore a11y_click_events_have_key_events -->
                          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                          <li onclick={stopRecording}>
                            <!-- svelte-ignore a11y_missing_attribute -->
                            <a aria-hidden="true"><i class="far fa-square"></i> STOP Recording </a>
                          </li>
                          {#if !recordingPaused}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                            <li onclick={pauseRecording}>
                              <!-- svelte-ignore a11y_missing_attribute -->
                              <a aria-hidden="true"
                                ><i class="far fa-pause-circle"></i> PAUSE Recording
                              </a>
                            </li>
                          {:else}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                            <li onclick={resumeRecording}>
                              <!-- svelte-ignore a11y_missing_attribute -->
                              <a aria-hidden="true"
                                ><i class="far fa-pause-circle-o"></i> RESUME Recording
                              </a>
                            </li>
                          {/if}
                        {/if}
                        <!--
                          Outside the recording branch on purpose. `recordedScreenUrl` is set by the
                          recorder's `stop` handler, which also clears `recording` - so while this
                          sat inside `{#if recording}` it appeared and vanished in the same tick and
                          could never be clicked.
                        -->
                        {#if recordedScreenUrl}
                          <li><hr class="dropdown-divider" /></li>
                          <li class="nav-item">
                            <!-- svelte-ignore a11y_missing_attribute -->
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <a onclick={downloadRecording}>
                              <i class="fas fa-download"></i> Download Recording
                              {#if !recordingHasAudio}(no audio){/if}
                            </a>
                          </li>
                          <li class="nav-item">
                            <!-- svelte-ignore a11y_missing_attribute -->
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <a
                              aria-hidden="true"
                              onclick={recPreviewOpen ? hideRecPreview : showRecPreview}
                            >
                              <i class={recPreviewOpen ? 'fas fa-times-circle' : 'fas fa-circle'}
                              ></i>
                              {recPreviewOpen ? ' Hide Rec Preview ' : ' Show Rec Preview'}
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
                      aria-expanded={soundCloudMenuOpen}
                      class="nav-link dropdown-toggle d-flex align-items-center"
                      class:text-white={soundCloudPlaying}
                      onclick={() => toggleTopMenu('soundcloud')}
                    >
                      <i class="fab fa-2x fa-soundcloud"></i>
                      <span class="ml-2">
                        <span class="caret"></span>
                        {#if soundCloudPlaying}
                          <img src="/assets/images/playing.gif" alt="" style="max-height: 25px;" />
                        {/if}
                      </span>
                    </a>
                    <ul
                      aria-labelledby="soundcloudDropdown"
                      data-bs-popper={soundCloudMenuOpen ? 'static' : undefined}
                      class="dropdown-menu dropdown-menu-end soundcloud-options"
                      class:show={soundCloudMenuOpen}
                      style={soundCloudMenuOpen ? 'display: block;' : undefined}
                    >
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                      <li class="nav-item" onclick={promptForSoundCloud}>
                        <i class="fa fa-play-circle"></i> Play a track or playlist from SoundCloud
                      </li>
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                      <li class="nav-item" onclick={stopSoundCloud}>
                        <i class="fa fa-square"></i><i class="fa fa-users"></i> Stop Playing For All
                      </li>
                      <li class="divider"></li>
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                      <li class="nav-item" onclick={stopSoundCloudForMe}>
                        <i class="fa fa-square"></i> Stop Playing For Me
                      </li>
                    </ul>
                  </li>
                  {#if !micLaunching}
                    <li title="Unmute/Mute Microphone" class="nav-item d-flex align-items-center">
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <a
                        id="unmuteMuteMicrophone"
                        class="nav-link d-flex align-items-center"
                        class:muted={micMuted}
                        class:text-white={!micMuted}
                        onclick={toggleMicrophone}
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
                        onclick={() => openSessionControl('av-device-selection')}
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
                      aria-expanded={screenShareMenuOpen}
                      class="nav-link dropdown-toggle d-flex align-items-center"
                      class:muted={!screenSharing}
                      class:text-white={screenSharing}
                      onclick={() => toggleTopMenu('screen')}
                    >
                      <i class="fas fa-2x fa-desktop"></i>
                      <span class="ml-2 mainNavItem">Start/Stop Screen Sharing</span>
                    </a>
                    <ul
                      aria-labelledby="dropdownScreenSharing"
                      data-bs-popper={screenShareMenuOpen ? 'static' : undefined}
                      class="screen-options-start-screen dropdown-menu dropdown-menu-end"
                      class:show={screenShareMenuOpen}
                      style={screenShareMenuOpen ? 'display: block;' : undefined}
                    >
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                      <li
                        title="(Regular Bandwidth) ** RECOMMENDED"
                        onclick={() => promptForScreenName('screen')}
                      >
                        <!-- svelte-ignore a11y_missing_attribute -->
                        <a aria-hidden="true">{shareScreenText}</a>
                      </li>
                      <div class="dropdown-divider"></div>
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                      <li title="OBS" onclick={() => promptForScreenName('camera')}>
                        <!-- svelte-ignore a11y_missing_attribute -->
                        <a aria-hidden="true">{virtualCamText}</a>
                      </li>
                      <!--
                        `e4e` in the capture, verbatim - TWO dividers, then a bare `li > a` with no
                        icon, bound to `mediaService.stopSharingAll()`:

                          T(0,"div",115)(1,"div",115),
                          d(2,"li")(3,"a",163), x("click", () => stopSharingAll()),
                          v(4," Stop Sharing All Screens"), u()()

                        The nav item is labelled "Start/Stop Screen Sharing" but there was no stop
                        anywhere in the menu; `stopScreenSharing()` existed and was only ever
                        reachable through a remote `mutescreens` command from a presenter.
                      -->
                      {#if screenSharing}
                        <div class="dropdown-divider"></div>
                        <div class="dropdown-divider"></div>
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <li onclick={stopScreenSharing}>
                          <!-- svelte-ignore a11y_missing_attribute -->
                          <a aria-hidden="true">{stopSharingAllText}</a>
                        </li>
                      {/if}
                    </ul>
                  </li>
                  {#if !camLaunching}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <li title="Start / Stop WebCam" class="nav-item" onclick={toggleWebcam}>
                      <a
                        id="startStopWebCam"
                        class="nav-link d-flex align-items-center"
                        class:muted={webcamMuted}
                        class:text-white={!webcamMuted}
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
                    onclick={() => openSessionControl()}
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
                <li
                  class="nav-item dropdown dropstart"
                  onclick={(event) => event.stopPropagation()}
                >
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <a
                    id="dropdownVolume"
                    data-bs-toggle="dropdown"
                    class="nav-link d-flex align-items-center"
                    onclick={() => (volumeOpen = !volumeOpen)}
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
                    data-bs-popper={volumeOpen ? 'static' : undefined}
                    class={volumeOpen
                      ? 'dropdown-menu volumeControl show'
                      : 'dropdown-menu volumeControl'}
                    style={volumeOpen ? 'display: block;' : undefined}
                  >
                    <h4>
                      Volume
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <span
                        data-bs-toggle="dropdown"
                        class="float-right mr-2"
                        onclick={() => (volumeOpen = false)}
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
                        setMasterVolume(Number((event.currentTarget as HTMLInputElement).value));
                      }}
                    />
                    <br />
                    <button
                      title={volume > 0 ? 'Mute Audio' : 'Unmute Audio'}
                      class="btn btn-primary btn-sm"
                      onclick={toggleMute}
                    >
                      {volume > 0 ? 'Mute' : 'Unmute'}
                    </button>
                    <hr />
<!--
                      TWO defects, both from `app-room.render-helpers.js:1005-1028` (`p4e`) and its
                      gate at `:1434`.

                      THE GATE was `soundCloudPlaying` alone. The reference is
                      `O(48, e.scPlaying || e.mp3Playing || e.appService.globals.roomState.ytURL ? 48 : -1)`
                      — three sources, of which this room already models all three: `soundCloudPlaying`,
                      `mp3Playing` (set from the `playMP3ForAll` command) and `youtubeForAllUrl`
                      (the room-wide YouTube overlay, this app's `roomState.ytURL`). So the slider was
                      dead for two of the three things it controls: `setBackgroundVolume` reaches
                      `#mp3player` and the YouTube overlay as well as SoundCloud, and neither could be
                      turned down.

                      THE CONTAINER is const 114, `[2, 'text-align', 'center']`
                      (`app-room.compiled.js:1723`). A `2` marker is STYLES, not classes — so it is a
                      `div` with `style="text-align: center"` and no class at all. `m-0` belongs to the
                      `<p>` inside it (const 199, `[1,'m-0']`), which already has it.
                    -->
                    {#if soundCloudPlaying || mp3Playing || youtubeForAllUrl}
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
                            setBackgroundVolume(
                              Number((event.currentTarget as HTMLInputElement).value)
                            );
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
                        `talkingUsers && talkingUsers.length > 0` (`:1436`), and `b4e` is
                        `ht(0, _4e, 7, 14, null, null, qAe), T(2, 'hr')` — the same per-presenter
                        row the screen overlay renders, plus a trailing rule, and only THEN the six
                        sound checkboxes below.

                        Without them a member could mute the room but not one presenter, which is
                        the entire point of the control. Shared with the overlay so the two cannot
                        drift; the `hr` is this copy's, not the overlay's.
                      -->
                      <PresenterMuteRows
                        {talkingUsers}
                        preferences={presenterAudio}
                        {individualVolumeControls}
                        trailingRule
                        ontogglepresenter={toggleTalkingPresenterAudio}
                        onpresentervolume={adjustPresenterVolume}
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
                          onchange={updateSoundCheck}
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
                          onchange={updateSoundCheck}
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
                          onchange={updateSoundCheck}
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
                          onchange={updateSoundCheck}
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
                          onchange={updateSoundCheck}
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
                          onchange={updateSoundCheck}
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
                  <li title="TAWK Support" class="nav-item" onclick={toggleTAWKSupport}>
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
                  <a class="nav-link d-flex align-items-center" onclick={requestReload}>
                    <i class="fas fa-2x fa-sync"></i>
                    <span class="ml-2 mainNavItem">Reload</span>
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        {/snippet}

        <!--
          Nodes 3 and 4 of the root template, and they carry the SAME gate:

            O(3, videoOnlyMode || chatOnlyMode || viewerOnlyMode ? -1 : 3)   // _Pe  = the sidebar
            O(4, videoOnlyMode || chatOnlyMode || viewerOnlyMode ? -1 : 4)   // A4e  = the navbar

          (`docs/source/components/app-room.full.js:4043-4059`.) Both were rendered
          unconditionally here, so a room entered with `?vo=1` or `?co=1` kept a full navbar and a
          full sidebar that the reference removes entirely — and the `vh-100` on the split below
          assumes they are gone. One `{#if}` covers both because upstream it is one condition
          evaluated twice, not two decisions.

          The gate is deliberately NOT `hideChatAlerts`: that flag hides the chat/alerts COLUMN and
          has five sources of its own (`full.js:1893-1902`). This is the chrome, and it goes on the
          mode alone.
        -->
        {#if !(chatOnlyMode || viewerOnlyMode)}
        <div class="room-sidebar">
          <div class="sidebar-wrapper">
            <nav class="navbar w-100 h-100">
              <ul class="navbar-nav small w-100 h-100">
                <li class="nav-item text-center">
                  <p>
                    Powered by:
                    <!-- OURS, not the reference's. This shipped as
                         `href="https://protradingroom.com"` with the text "ProTradingRoom.com" —
                         transcribed with the rest of the sidebar — so every room this product
                         serves credited, and linked out to, a different company. The class name
                         stays `ptr-website-link` because `app.css` styles that selector and
                         renaming it would change the rendering, which this is not. -->
                    <a
                      href="https://www.tradingroom.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="ptr-website-link">TradingRoomApp</a
                    >
                  </p>
                  <p>Version: {DUMP_CONTRACT.version}</p>
                  <!--
                    `H(12, JAe, 2, 1, "p")` with `O(12, sessData.hideAppInfo ? -1 : 12)`.

                    This was an empty `<p>` — the element was in the right place with nothing in
                    it, so the room looked complete and the feature did not exist. Inside is
                    `XAe`, whose own gate is
                    `O(1, !ptrMobileAppEnabled && !customMobileAppEnabled
                          || user.isFT && !freeTrialsGetApp ? -1 : 1)`:
                    a room that has no app hides the button, and a trial account is shut out of it
                    unless the room says trials may have the app.
                  -->
                  {#if !data.sessData?.hideAppInfo}
                    <p>
                      {#if mobileAppAvailable}
                        <button
                          type="button"
                          data-bs-toggle="modal"
                          data-bs-target="#mobileAppInfoModal"
                          class="btn btn-sm btn-secondary"
                          class:btn-dark={theme === 'dark'}
                          onclick={getMyPinAndDoInfo}>Mobile App Info</button
                        >
                      {/if}
                    </p>
                  {/if}
                  <hr />
                  <!--
                    The two connection lines. Both were hard-coded markup - a permanently spinning
                    cog next to "Reconnecting Media..." and a permanent tick next to "Chat" - bound
                    to nothing, so the spinner could never stop no matter what the media server did.

                    The raw staff capture (`sidebar-forced-open`) shows the same two rows, and it
                    was taken mid-reconnect: `i.fas.fa-cog.fa-spin` beside "Reconnecting Media..."
                    and `i.fas.fa-check` beside "Chat". So the ELEMENTS are right; what was missing
                    is that they report state. `isMediaConnected` already tracks the SFU socket, and
                    `roomEventsConnected` tracks the SSE channel that carries chat.
                  -->
                  <p>
                    {#if isMediaConnected}
                      <i class="fas fa-check"></i> Media
                    {:else}
                      <i class="fas fa-cog fa-spin"></i>Reconnecting Media...
                    {/if}
                  </p>
                  <p>
                    <span>
                      {#if roomEventsConnected}
                        Chat <i class="fas fa-check"></i>
                      {:else}
                        <i class="fas fa-cog fa-spin"></i>Reconnecting Chat...
                      {/if}
                    </span>
                  </p>
                </li>
                <li class="nav-item">
                  <!-- svelte-ignore a11y_missing_attribute -->
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <a
                    title="Connectivity Check"
                    data-bs-toggle="modal"
                    data-bs-target="#webrtc-troubleshooter-modal"
                    class="nav-link sidebar-item"
                    onclick={() => openModal('connectivity')}
                  >
                    <i class="fas fa-network-wired"></i>
                    <span class="pl-2">Connectivity Check</span>
                  </a>
                </li>
                <!--
                  `O(25, e.reopenAlertsChatBtn ? 25 : -1)` (`app-room.render-helpers.js:355`),
                  rendering `oPe` (`:76-87`) as `H(25, oPe, 5, 0, 'li', 19)` (`:312`) - which is
                  why it sits HERE, between Connectivity Check and General Settings, rather than at
                  the end of the list. Markup and classes from the const table: 19 is
                  `[1, 'nav-item']`, 38 is
                  `['title', 'Reopen Alerts / Chat', 1, 'nav-link', 'sidebar-item', 3, 'click']`,
                  39 is `[1, 'fas', 'fa-window-restore']` and 22 is `[1, 'pl-2']`
                  (`app-room.compiled.js:1324, 1416, 1417, 1337`).

                  This is the control the detach bootbox promises when it says the chat can be
                  reopened "from the side menu", and until now this room had no such item - the
                  affordance was a button inside the column, which upstream is deleted the moment
                  the chat detaches.

                  Gated on `chatAlertsDetached` rather than a separate `reopenAlertsChatBtn`
                  field. Upstream needs two variables because `hideChatAlerts` is a plain property
                  that four other writers also set, so it cannot say WHY it is true; here
                  `hideChatAlerts` is derived and `chatAlertsDetached` IS the detach source, so a
                  second flag would be a copy that can only disagree. The reference sets both in
                  one statement and clears both in `reopenAlertsChat` (`app-room.full.js:2179-2181`,
                  `:3047-3053`), so they are never independent.
                -->
                {#if chatAlertsDetached}
                  <li class="nav-item">
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <a
                      title="Reopen Alerts / Chat"
                      class="nav-link sidebar-item"
                      onclick={reopenAlertsChat}
                    >
                      <i class="fas fa-window-restore"></i>
                      <span class="pl-2">Reopen Alerts / Chat</span>
                    </a>
                  </li>
                {/if}
                <li class="nav-item">
                  <!-- svelte-ignore a11y_missing_attribute -->
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <a
                    title="General Settings"
                    data-bs-toggle="modal"
                    data-bs-target="#user-settings-modal"
                    class="nav-link sidebar-item"
                    onclick={() => openModal('settings')}
                  >
                    <i class="fas fa-cogs"></i>
                    <span class="pl-2">General Settings</span>
                  </a>
                </li>
                <!--
                  `H(31, aPe, 4, 2, "li", 25)` with `O(31, sessData.hasBenzingaNews ? 31 : -1)`.

                  `aPe` picks between two children on `O(2, altBenzingaLogoURL ? 2 : 3)`: a custom
                  logo, or the captured default pair of a `fas fa-newspaper` and the words
                  "Benzinga News". The default image the capture would otherwise use
                  (`/assets/images/benzinga-logo.png`) is not in this repository, so the icon form
                  is what an unconfigured room gets - not a broken `<img>`.
                -->
                {#if benzingaVisible}
                  <li class="nav-item py-0">
                    <a
                      href={benzingaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Benzinga News"
                      class="nav-link sidebar-item ps-1"
                    >
                      {#if data.sessData?.altBenzingaLogoURL}
                        <img
                          class="benzinga-logo-alt"
                          src={data.sessData.altBenzingaLogoURL}
                          alt="Benzinga News"
                          width="120"
                          height="24"
                        />
                      {:else}
                        <i class="fas fa-newspaper"></i><span class="pl-2">Benzinga News</span>
                      {/if}
                    </a>
                  </li>
                {/if}
                <!-- `O(32, e.archivesAvailableTo() ? 32 : -1)` -->
                {#if archivesAvailable}
                  <li class="nav-item dropdown">
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <a
                      id="archivesDropdown"
                    title="Archives"
                    data-bs-toggle="dropdown"
                    aria-haspopup="true"
                    aria-expanded={archivesMenuOpen}
                    class="nav-link sidebar-item dropdown-toggle"
                    onclick={(event) => {
                      event.stopPropagation();
                      archivesMenuOpen = !archivesMenuOpen;
                    }}
                  >
                    <i class="fas fa-archive"></i>
                    <span class="pl-2">Archives</span>
                  </a>
                  <div
                    aria-labelledby="archivesDropdown"
                    class={archivesMenuOpen
                      ? 'dropdown-menu users-dropdown-options show'
                      : 'dropdown-menu users-dropdown-options'}
                    style={archivesMenuOpen ? 'display: block;' : undefined}
                  >
                    <!-- `O(6, isPresenter || !sessData.hideRecs ? 6 : -1)` -->
                    {#if isPresenter || !data.sessData?.hideRecs}
                      <!-- svelte-ignore a11y_missing_attribute -->
                      <a class="dropdown-item small"
                        ><i class="fas fa-circle"></i><span class="pl-2">Recording</span></a
                      >
                    {/if}
                    <!-- Alert Logs is the one entry the capture never gates. -->
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <a
                      data-bs-toggle="modal"
                      data-bs-target="#alerts-logs-modal"
                      class="dropdown-item small"
                      onclick={() => openModal('alert-logs')}
                    >
                      <i class="fas fa-bell"></i>
                      <span class="pl-2">Alert Logs</span>
                    </a>
                    <!--
                      One condition guards both, and it is the same one twice:
                        O(11, !sessData.hideChatLog || isPresenter ? 11 : -1)   Chat Logs
                        O(12, !sessData.hideChatLog || isPresenter ? 12 : -1)   Transcript History
                    -->
                    {#if !data.sessData?.hideChatLog || isPresenter}
                      <!-- svelte-ignore a11y_missing_attribute -->
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <a
                        data-bs-toggle="modal"
                        data-bs-target="#chat-logs-modal"
                        class="dropdown-item small"
                        onclick={() => openModal('chat-logs')}
                      >
                        <i class="fas fa-comment"></i>
                        <span class="pl-2">Chat Logs</span>
                      </a>
                      <!-- svelte-ignore a11y_missing_attribute -->
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <!-- `x("click", () => g(3).toggleSpeechRecoHistory())` - this had no handler. -->
                      <a class="dropdown-item small" onclick={openTranscriptPage}
                        ><i class="fas fa-closed-captioning"></i><span class="pl-2"
                          >Transcript History</span
                        ></a
                      >
                    {/if}
                  </div>
                </li>
                {/if}
                <li class="nav-item py-0">
                  <!-- svelte-ignore a11y_missing_attribute -->
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <a
                    title="Manage Muted Users"
                    data-bs-toggle="modal"
                    data-bs-target="#mutedUsersModal"
                    class="nav-link sidebar-item ps-1"
                    onclick={() => openModal('muted')}
                  >
                    <i class="fas fa-comments"></i>
                    <span class="pl-2">Manage Muted Users</span>
                  </a>
                </li>
                <li class="nav-item py-0">
                  <!-- svelte-ignore a11y_missing_attribute -->
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <a
                    title="Manage Followed Users"
                    data-bs-toggle="modal"
                    data-bs-target="#followedUsersModal"
                    class="nav-link sidebar-item ps-1"
                    onclick={() => openModal('followed')}
                  >
                    <i class="fas fa-users"></i>
                    <span class="pl-2">Manage Followed Users</span>
                  </a>
                </li>
                <!--
                  `O(43, e.appService.globals.isPresenter ? 43 : -1)` - presenter only, and it acts
                  on the roster (`globals.roster.filter(r => !r.isP)`), which a member does not have.
                  This was shown to everyone.
                -->
                {#if isPresenter}
                  <li class="nav-item py-0">
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <a title="Get Random User" class="nav-link sidebar-item ps-1" onclick={getRandomUser}>
                      <i class="fas fa-user"></i>
                      <span class="pl-2">Get Random User</span>
                    </a>
                  </li>
                {/if}
                <!-- `O(44, onlyPresentersVisibleToViewers || rosterVisibleToViewers || isPresenter || user.hasAdminChat ? 44 : -1)` -->
                {#if rosterVisible}
                  <li class="nav-item d-flex flex-column h-100">
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <a
                      class="nav-link active-room-users d-flex align-items-center justify-content-between pt-0"
                  >
                    <div title="Users">
                      <i class="fas fa-user"></i>
                      <span class="pl-2">Users:</span>
                      <!--
                        `O(6, sessData.rosterCountVisibleToViewers || isPresenter ? 6 : -1)` - the
                        COUNT has its own gate, separate from the roster list's. This was
                        unconditional, so a room that hides the headcount from viewers still
                        published it.
                      -->
                      {#if rosterCountVisible}
                        <span class="badge badge-primary d-inline-block ml-1"
                          >{connectedCount}</span
                        >
                      {/if}
                    </div>
                    <div class="flex-fill users-btns">
                      <div title="Users Options" class="dropdown user-options">
                        <!-- svelte-ignore a11y_consider_explicit_label -->
                        <button
                          id="user-options-btn"
                          data-bs-toggle="dropdown"
                          aria-expanded={rosterSortOpen}
                          class="btn btn-sm btn-dark ml-1 float-right border-0 dropdown-toggle"
                          onclick={(event) => {
                            event.stopPropagation();
                            rosterSortOpen = !rosterSortOpen;
                          }}
                        >
                          <i class="fas fa fa-cog"></i>
                        </button>
                        <ul
                          aria-labelledby="user-options-btn"
                          class={rosterSortOpen ? 'dropdown-menu show' : 'dropdown-menu'}
                          style={rosterSortOpen ? 'display: block;' : undefined}
                        >
                          <!--
                            const 65 is `[1,"dropdown-item","d-flex","align-items-center","justify-content-between",3,"click"]`
                            and `H(15, fPe, 1, 0, "i", 66)` with `O(15, isSortFTUsers ? 15 : -1)`
                            puts a `fas fa-check-circle` (const 66) on the right when the filter is
                            on. `justify-content-between` exists FOR that tick; the item had neither
                            the handler nor the icon, so it was a label in a menu.
                          -->
                          <!-- svelte-ignore a11y_click_events_have_key_events -->
                          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                          <li
                            class="dropdown-item d-flex align-items-center justify-content-between"
                            onclick={sortFTUsers}
                          >
                            <span>Sort by Trials</span>
                            {#if isSortFTUsers}
                              <i class="fas fa-check-circle"></i>
                            {/if}
                          </li>
                        </ul>
                      </div>
                      <button
                        title="Reload Users"
                        class="btn btn-sm btn-default ml-1 float-right reload-room-users border-0"
                        onclick={() => invalidateAll()}
                      >
                        <i class="fas fa fa-sync"></i>
                      </button>
                      <!--
                        `z("ngClass", ut(6, qB, i.isSortUsers))` with `qB = t => ({"btn-dark": t})` -
                        the alpha-sort button goes dark while the sort is on. It had no handler and
                        no state, so nothing about the list or the button ever changed.
                      -->
                      <button
                        title="Sort Users"
                        class="btn btn-sm btn-secondary float-right border-0 ms-1"
                        class:btn-dark={isSortUsers}
                        onclick={sortUsers}
                      >
                        <i class="fas fa-sort-alpha-down"></i>
                      </button>
                      <button
                        title="Search Users"
                        class="btn btn-sm btn-default float-right search-room-users border-0"
                        onclick={toggleUserSearch}
                      >
                        <i class="fas fa fa-search"></i>
                      </button>
                    </div>
                  </a>
                  <!--
                    `H(22, mPe, 1, 1, "input", 73)` gated by `O(22, showUserSearch ? 22 : -1)`. Every
                    attribute is const 73 verbatim. The capture binds `search` (the clear "x" a
                    `type=search` input fires) to `searchUsers()` and `keyup` to `doUserSearch`,
                    which acts on Enter alone.
                  -->
                  {#if showUserSearch}
                    <input
                      type="search"
                      id="userSearchTermInput"
                      placeholder="Search by nick or email,enter to search"
                      aria-label="Search"
                      aria-describedby="addon-search"
                      class="form-control"
                      bind:value={userSearchTermTxt}
                      onsearch={searchUsers}
                      onkeyup={doUserSearch}
                      {@attach focusUserSearch}
                    />
                  {/if}
                  <div class="flex-grow-1">
                    <app-room-roster>
                      <div class="room-roster-list">
                        {#if sidebarOpen}
                          {#each displayRoster as user (user.id)}
                            <!--
                              Two gates and a class map, all of which were missing: the per-row
                              visibility test, and `{regUser: !isP, presUser: isP || hasAdminChat}`,
                              which is not the either/or that `role === 'user'` assumed.
                            -->
                            {#if rowVisible(user)}
                              <div class="room-roster-container">
                                <div class={rosterRowClass(user)}>
                                <div class="media">
                                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                                  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                                  <img
                                    class="rosterImg mr-3"
                                    alt={user.displayName}
                                    src={user.avatarUrl}
                                    onclick={() => openRosterUserInfo(user)}
                                  />
                                  <div class="media-body">
                                    <div class="mt-0 mb-0 nickName d-inline">
                                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                                      <span
                                        onclick={() => mentionRosterUser(user)}
                                        ondblclick={() => openRosterUserInfo(user)}
                                        >{user.displayName}</span
                                      >
                                      <div class="d-inline-block align-baseline mr-1"></div>
                                      <!-- svelte-ignore a11y_interactive_supports_focus -->
                                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                                      <a
                                        role="button"
                                        id="dropdownMenuLink"
                                        data-bs-toggle="dropdown"
                                        aria-haspopup="true"
                                        aria-expanded={userMenuId === user.id}
                                        class="msgMenu dropright d-inline-block float-right"
                                        onclick={(event) => {
                                          event.stopPropagation();
                                          selectedUserId = user.id;
                                          userMenuId = userMenuId === user.id ? null : user.id;
                                        }}>⠇</a
                                      >
                                      <div
                                        aria-labelledby="dropdownMenuLink"
                                        class={userMenuId === user.id
                                          ? 'dropdown-menu users-dropdown-options show'
                                          : 'dropdown-menu users-dropdown-options'}
                                        data-bs-popper={userMenuId === user.id
                                          ? 'static'
                                          : undefined}
                                        style={userMenuId === user.id
                                          ? 'display: block;'
                                          : undefined}
                                      >
                                        <!-- svelte-ignore a11y_missing_attribute -->
                                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                                        <a
                                          class="dropdown-item"
                                          onclick={() => openRosterUserInfo(user)}
                                          ><i class="fas fa-user"></i>&nbsp;&nbsp;User Info</a
                                        >
                                        <!-- svelte-ignore a11y_missing_attribute -->
                                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                                        <a
                                          class="dropdown-item"
                                          onclick={() => mentionRosterUser(user)}
                                          ><i class="fas fa-reply"></i>&nbsp;&nbsp;Mention / Reply</a
                                        >
                                        {#if canOpenRosterPrivateChat(user)}
                                          <!-- svelte-ignore a11y_missing_attribute -->
                                          <!-- svelte-ignore a11y_click_events_have_key_events -->
                                          <!-- svelte-ignore a11y_no_static_element_interactions -->
                                          <a
                                            class="dropdown-item"
                                            onclick={() => openRosterPrivateChat(user)}
                                            ><i class="fas fa-comments"></i>&nbsp;&nbsp;Private Chat
                                          </a>
                                        {/if}
                                      </div>
                                      </div>
                                    </div>
                                    <!--
                                      `<p class="userLocation">`, a sibling of `.nickName` inside
                                      `.media-body`. Presenter-only: the reference gates it on
                                      `globals.isPresenter && entry.privData`, so a member never
                                      sees anyone's city — see `locationVisibleTo`.
                                    -->
                                    {#if locationVisibleTo({ isPresenter }, user)}
                                      <p class="userLocation">{user.locStr}</p>
                                    {/if}
                                  </div>
                                </div>
                              </div>
                            {/if}
                          {/each}
                        {/if}
                      </div>
                    </app-room-roster>
                  </div>
                  </li>
                {/if}
              </ul>
            </nav>
          </div>
        </div>
        {@render mainNavigation()}
        {/if}

<!--
          `z('ngClass', ut(5, QB, videoOnlyMode || chatOnlyMode || viewerOnlyMode))` with
          `QB = (t) => ({'vh-100': t})` (`app-room.render-helpers.js:1639-1648, 11`).

          It is the other half of hiding a column: with the chat and alerts gone the split has one
          child, and `.vh-100 { height: 100vh !important }`
          (`css/complete-app-styles.css:4992`) is what makes the screen fill the window instead of
          keeping the height it had beside them.

          `videoOnlyMode` is the `r` query parameter — the recording-bot mode — which this room does
          not model; the same honest gap `files-gates.ts` already records for `hideFiles`. The two
          modes this room does model are bound.
        -->
        <as-split
          {@attach captureMainElement}
          minsize="0"
          id="mainAreaSplit"
          gutterdblclickduration="400"
          class={splitIsHorizontal
            ? 'as-horizontal as-percent as-init'
            : 'as-vertical as-percent as-init'}
          class:is-resizing={splitTarget !== null}
          class:vh-100={chatOnlyMode || viewerOnlyMode}
          style={splitIsHorizontal ? undefined : 'flex-direction: column;'}
          dir="ltr"
        >
          <!--
            ONE gate on the whole chat/alerts column, because upstream it is one flag:
            `O(1, e.hideChatAlerts ? -1 : 1)` (`app-room.render-helpers.js:1650`). Its five writers
            and the two this room cannot model are documented on `hideChatAlerts` itself, in the
            script above.

            This used to be three branches - a hardcoded test on `viewerOnlyMode`, a detached
            branch, and the column - which is the shape that let the room SETTING an owner ticks do
            nothing at all: it had no branch of its own, and adding one would have been a fourth
            copy of the same decision.

            The detached case no longer renders a "Reopen here" panel here. Upstream, detaching
            hides this column outright and raises `reopenAlertsChatBtn`, whose control is a SIDEBAR
            item - `H(25, oPe, 5, 0, 'li', 19)` gated by `O(25, e.reopenAlertsChatBtn ? 25 : -1)`
            (`app-room.render-helpers.js:312, 355`, markup at `:76-87`). That is what the bootbox
            means by "you can reopen the chat in this window from the side menu", and the item is
            now rendered there. Keeping a half-height panel in a column the reference deletes was
            the divergence, not the fix.
          -->
          {#snippet chatAlertsPane()}
          <as-split-area
            minsize="0"
            class="alert-chat-box alert-chat-regular as-split-area"
            style={primaryAreaStyle}
          >
            <as-split
              {@attach captureAlertChatElement}
              minsize="0"
              class={innerSplitIsVertical
                ? 'as-percent as-vertical as-init'
                : 'as-percent as-horizontal as-init'}
              style={innerSplitIsVertical ? undefined : 'flex-direction: row;'}
              dir="ltr"
            >
              <as-split-area minsize="0" class="alert-box as-split-area" style={alertsAreaStyle}>
                <app-alerts>
                  <div class="chat d-flex flex-column" style="height: 100%;">
                    <div class="bs-component">
                      <nav class="navbar navbar-expand-lg navbar-light chat-nav p-1 alertHeader">
                        <!-- svelte-ignore a11y_missing_attribute -->
                        <a class="navbar-brand ml-1"
                          ><i class="fas fa-bell me-1"></i> Alerts
                          {#if doNotDisturbOn}
                            <span class="badge badge-danger ms-2"
                              ><i class="fas fa-bell-slash"></i> DND</span
                            >
                          {/if}</a
                        >
                        <ul class="nav ml-auto">
                          {#if isPresenter}
                            <li
                              class:poll-active-blink={pollIsActive && !pollMinimized}
                              class:poll-active-indicator={pollMinimized}
                              class="nav-item mx-2"
                            >
                              <!-- svelte-ignore a11y_click_events_have_key_events -->
                              <!-- svelte-ignore a11y_no_static_element_interactions -->
                              <!-- svelte-ignore a11y_missing_attribute -->
                              <a onclick={openPollUI}><i class="fas fa-question-circle"></i> Poll</a
                              >
                            </li>
                            <li class="nav-item mr-2">
                              <!-- svelte-ignore a11y_click_events_have_key_events -->
                              <!-- svelte-ignore a11y_no_static_element_interactions -->
                              <!-- svelte-ignore a11y_missing_attribute -->
                              <a onclick={() => openModal('alert')}
                                ><i class="fas fa-plus-circle"></i> Post Alert</a
                              >
                            </li>
                          {/if}
                          {#if !isPresenter && pollMinimized}
                            <li class="nav-item mx-2">
                              <!-- svelte-ignore a11y_click_events_have_key_events -->
                              <!-- svelte-ignore a11y_no_static_element_interactions -->
                              <!-- svelte-ignore a11y_missing_attribute -->
                              <a
                                class="poll-active-blink"
                                style="cursor: pointer;"
                                onclick={openPollUI}><i class="fas fa-question-circle"></i> Poll</a
                              >
                            </li>
                          {/if}
                          <li class="nav-item mx-1">
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <!-- svelte-ignore a11y_missing_attribute -->
                            <a
                              title="Search"
                              class="nav-link p-0"
                              onclick={toggleAlertsToolbarSearchOnly}
                            >
                              <i class="fas fa-search"></i>
                            </a>
                          </li>
                          <li class="nav-item dropdown ml-2" style="position: static;">
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <!-- svelte-ignore a11y_consider_explicit_label -->
                            <!-- svelte-ignore a11y_missing_attribute -->
                            <a
                              aria-haspopup="true"
                              aria-expanded="false"
                              class="nav-link dropdown-toggle p-0"
                              onclick={toggleAlertsToolbar}
                            >
                              <i title="Settings" class="fas fa-cog chat-header-gear"></i>
                            </a>
                          </li>
                        </ul>
                      </nav>
                    </div>
                    {#if alertsToolbarOpen}
                      <!--
                        Ported node for node from alert-section/datach-alerts-1. The empty right
                        div is a conditional slot in the capture (an Angular comment anchor pair),
                        so it is kept rather than collapsed - removing it changes the flex layout.
                        The button's title is "Detach Chat" while its label reads "Detach Alerts";
                        that mismatch is capture-accurate and deliberate.
                      -->
                      <div class="shadow p-2 w-100 alertsToolbar" style="margin-top: 0px;">
                        <!--
                          `R2e` (const 28), gated on `showAlertsToolbarExtended`. The magnifier
                          collapses this away and leaves only the form below.
                        -->
                        {#if alertsToolbarExtended}
                          <div class="d-flex align-items-center justify-content-between flex-wrap">
                            <div class="d-flex align-items-center">
                              <!-- `O(2, e.isPresenter ? 2 : -1)` - const 36, presenter only. -->
                              {#if isPresenter}
                                <div class="ms-4 my-2 text-white">
                                  <input
                                    type="checkbox"
                                    name="inline-alert-entry"
                                    value="Show inline alert entry"
                                    id="inline-alert-entry"
                                    class="form-check-input"
                                    bind:checked={inlineAlertEntry}
                                  /><label for="inline-alert-entry" class="form-check-label">
                                    Show inline alert entry
                                  </label>
                                </div>
                              {/if}
                              <!--
                                `O(3, chatOnlyMode ? -1 : 3)` - const 37/42. Hidden in a detached
                                chat window, which is already the chat in its own window.
                                The title is "Detach Chat" while the label reads "Detach Alerts";
                                that mismatch is capture-accurate and deliberate.
                              -->
                              {#if !chatOnlyMode}
                                <button
                                  title="Detach Chat"
                                  class="btn btn-outline-info btn-sm m-1"
                                  onclick={detachAlerts}
                                >
                                  <i class="fas fa-window-restore"></i> Detach Alerts
                                </button>
                              {/if}
                            </div>
                            <!--
                              The right-hand div, which this room rendered empty. The capture
                              declares TWO buttons for it, and each is gated:

                                const 38/44  data-bs-target="#alert-filter-modal"
                                             gated on `sessData.modAlertFilterList`
                                const 39     data-bs-target="#alerts-advanced-search-modal"
                                             gated on `sessData.advancedSearchAlerts &&
                                             ownerdID == '56ba547185ae93560d186ea8'`

                              Only Advanced Search is rendered here, and that is an evidence
                              decision rather than a preference. Across BOTH DOM captures of this
                              toolbar the owner supplied, the Alert Filter button never appears -
                              one shows the slot holding nothing but its two Angular comment
                              anchors, the other shows Advanced Search alone. Rendering both put
                              two buttons on a wrapped second row, a layout the capture never
                              produces.

                              Nothing is lost by omitting it: `#alert-filter-modal` has its own
                              entry point in the alerts header, `span.badge.filtered-text` with
                              the same `data-bs-target` (const 8/21), gated on
                              `modAlertFilterList && doFilteredAlerts`. That badge is also not
                              built here, and is recorded as open rather than substituted for.

                              Advanced Search's own gate is not reproducible either - this room
                              has no `sessData`, and the second half is a hardcoded owner id from
                              the original deployment - so it renders unconditionally.
                            -->
                            <div>
                              <button
                                type="button"
                                data-bs-toggle="modal"
                                data-bs-target="#alerts-advanced-search-modal"
                                class="btn btn-outline-light btn-sm m-1"
                                onclick={() => openModal('advanced-search')}
                              >
                                <i class="fas fa-search me-1"></i> Advanced Search
                              </button>
                            </div>
                          </div>
                        {/if}
                        <form novalidate id="alert-settings" class="w-100">
                          <div>
                            <div class="form-group m-0">
                              <div class="input-group">
                                <!--
                                  `name` is ours, not the capture's. Const 32 of `app-alerts`
                                  carries only class/type/placeholder/aria-label/aria-describedby/
                                  title, so the original ships this field with neither an `id` nor
                                  a `name` and Chrome reports "A form field element should have an
                                  id or name attribute" against it too.

                                  A `name` is added rather than an `id` because `id` is the half of
                                  that pair the capture DOES use elsewhere and would be a new
                                  document-unique hook; `name` satisfies the same requirement,
                                  scopes to the enclosing `form#alert-settings`, and renders
                                  nothing. No captured attribute is changed or removed.

                                  Note also that the captured `aria-describedby="addon-search"`
                                  points at an id nothing in the component defines - the clear
                                  button is `addon-chat-clear`. That dangling reference is
                                  reproduced as-is rather than silently repaired.
                                -->
                                <input
                                  type="text"
                                  name="alert-search-term"
                                  placeholder="Type your search term, then press Enter"
                                  aria-label="Search"
                                  aria-describedby="addon-search"
                                  title="Type your search term, then press Enter"
                                  class="form-control"
                                  bind:value={alertSearch}
                                  onkeydown={(event) => {
                                    if (event.key === 'Enter') event.preventDefault();
                                  }}
                                /><!-- svelte-ignore a11y_click_events_have_key_events -->
                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                <span
                                  id="addon-chat-clear"
                                  title="Clear the search"
                                  class="btn btn-outline-secondary pl-2 pr-2 d-inline-flex clear-alert-input input-group-text"
                                  onclick={() => (alertSearch = '')}
                                  ><i class="fas fa-times"></i></span
                                >
                                <!--
                                  `O2e`, gated on `showAlertsToolbarExtended`: the save button,
                                  and inside it the archive control gated again on
                                  `isPresenter && !isLimitedPresenter`. Search-only shows neither -
                                  this room showed both in every state.
                                -->
                                {#if alertsToolbarExtended}
                                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                                  <span
                                    id="addon-chat-save"
                                    title="Save alerts messages"
                                    class="btn btn-outline-secondary d-inline-flex pl-2 pr-2 input-group-text"
                                    onclick={saveAlerts}
                                    ><i class="fas fa-save"></i>
                                  </span>
                                  {#if isPresenter}
                                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                                    <div
                                      id="addon-chat-messages-archive"
                                      title="Archive Alerts Messages"
                                      class="btn btn-outline-secondary pl-2 pr-2 d-inline-flex archive-alert-input input-group-text"
                                      onclick={archiveAlerts}
                                    >
                                      <i class="fas fa-trash"></i>
                                    </div>
                                  {/if}
                                {/if}
                              </div>
                            </div>
                          </div>
                        </form>
                      </div>
                    {/if}

                    <app-roomscroller
                      {@attach captureAlertsScroller}
                      id="chatScrollViewParentAlerts"
                      style="overflow-y: scroll; height: 100%;"
                      onscroll={trackAlertsScroll}
                    >
                      <div>
                        {#each visibleAlerts as item, index (item.id)}
                          <RoomMessage
                            {item}
                            kind="alert"
                            {chatGif}
                            {presenterMessagesOnTheRight}
                            {chatBadges}
                            {enableBadges}
                            {showBadgesToPresentersOnly}
                            {disableStarYears}
                            currentUserId={data.user.id}
                            currentUserEmailHash={data.user.emailHash}
                            currentUserName={data.user.displayName}
                            followedStyle={followedUsers[item.senderEmailHash]?.followChatStyle}
                            chatStyle={globalChatStyle}
                            viewerIsPresenter={data.user.role === 'staff' ||
                              data.user.role === 'admin'}
                            {theme}
                            menuOpen={messageMenuId === `alert:${item.id}`}
                            showDateSeparator={'evidenceSeparatorText' in item
                              ? item.evidenceSeparatorText !== null
                              : index === 0 ||
                                !sameCalendarDay(
                                  item.createdAt,
                                  visibleAlerts[index - 1]?.createdAt
                                )}
                            ontoggle={(id) => {
                              const key = `alert:${id}`;
                              messageMenuId = messageMenuId === key ? null : key;
                            }}
                            onaction={(action, message, event) =>
                              handleMessageAction('alert', action, message, event)}
                          />
                        {/each}
                      </div>
                    </app-roomscroller>
                  </div>
                </app-alerts>
              </as-split-area>

              <as-split-area minsize="0" class="chat-box as-split-area" style={chatAreaStyle}>
                <app-chat>
                  <div class="chat d-flex flex-column h-100" style="overflow-y: hidden;">
                    <div class="bs-component">
                      <nav class="navbar navbar-expand-lg navbar-light chat-nav p-1 chatHeader">
                        <!-- svelte-ignore a11y_missing_attribute -->
                        <a class="navbar-brand ml-1 mr-1"
                          ><i class="fas fa-comment"></i>
                          {#if doNotDisturbOn}
                            <span class="badge badge-danger ml-2"
                              ><i class="fas fa-bell-slash"></i> DND</span
                            >
                          {/if}</a
                        >
                        <ul
                          role="tablist"
                          class="nav nav-tabs flex-wrap flex-grow-1 justify-content-center chatTabs"
                        >
                          <li class="nav-item">
                            <!-- svelte-ignore a11y_interactive_supports_focus -->
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_missing_attribute -->
                            <a
                              data-bs-toggle="tab"
                              role="tab"
                              class:active={chatTab === 'main'}
                              class="nav-link"
                              onclick={() => (chatTab = 'main')}>Main Chat</a
                            >
                          </li>
                          <li class="nav-item">
                            <!-- svelte-ignore a11y_interactive_supports_focus -->
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_missing_attribute -->
                            <a
                              data-bs-toggle="tab"
                              role="tab"
                              class:active={chatTab === 'off-topic'}
                              class="nav-link"
                              onclick={() => (chatTab = 'off-topic')}>Off Topic</a
                            >
                          </li>
                        </ul>
                        <ul class="nav ml-auto align-items-center">
                          <li class="nav-item">
                            <!-- svelte-ignore a11y_missing_attribute -->
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <a
                              title="Open Private chat"
                              class="nav-link"
                              onclick={showPrivateChat}
                            >
                              <i class="fas fa-comments"></i>
                            </a>
                          </li>
                          <li class="nav-item mx-1">
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <!-- svelte-ignore a11y_missing_attribute -->
                            <a
                              title="Search"
                              class="nav-link p-0"
                              onclick={() => openModal('chat-logs')}
                            >
                              <i class="fas fa-search"></i>
                            </a>
                          </li>
                          <li class="nav-item dropdown ml-2" style="position: static;">
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <!-- svelte-ignore a11y_consider_explicit_label -->
                            <!-- svelte-ignore a11y_missing_attribute -->
                            <a
                              aria-haspopup="true"
                              aria-expanded="false"
                              class="nav-link dropdown-toggle p-0"
                              onclick={() => openModal('settings')}
                            >
                              <i title="Settings" class="fas fa-cog chat-header-gear"></i>
                            </a>
                          </li>
                        </ul>
                      </nav>
                    </div>

                    <app-roomscroller
                      {@attach captureChatScroller}
                      style="overflow-y: scroll; overflow-x: hidden; height: 100%;"
                      onscroll={trackChatScroll}
                    >
                      <div>
                        {#each visibleChatMessages as item, index (item.id)}
                          <RoomMessage
                            {item}
                            kind="chat"
                            {chatGif}
                            {presenterMessagesOnTheRight}
                            {chatBadges}
                            {enableBadges}
                            {showBadgesToPresentersOnly}
                            {disableStarYears}
                            currentUserId={data.user.id}
                            currentUserEmailHash={data.user.emailHash}
                            currentUserName={data.user.displayName}
                            followedStyle={followedUsers[item.senderEmailHash]?.followChatStyle}
                            chatStyle={globalChatStyle}
                            viewerIsPresenter={data.user.role === 'staff' ||
                              data.user.role === 'admin'}
                            {theme}
                            menuOpen={messageMenuId === `chat:${item.id}`}
                            showDateSeparator={'evidenceSeparatorText' in item
                              ? item.evidenceSeparatorText !== null
                              : index === 0 ||
                                !sameCalendarDay(
                                  item.createdAt,
                                  visibleChatMessages[index - 1]?.createdAt
                                )}
                            ontoggle={(id) => {
                              const key = `chat:${id}`;
                              messageMenuId = messageMenuId === key ? null : key;
                            }}
                            onaction={(action, message, event) =>
                              handleMessageAction('chat', action, message, event)}
                          />
                        {/each}
                      </div>
                    </app-roomscroller>

                    <div id="textAreaHolder" class="d-flex align-items-center textSendDiv">
                      <div class="flex-fill d-flex mx-0" {@attach observeComposerWidth}>
                        <div class="px-0 flex-fill">
                          <textarea
                            name="txt-area"
                            id="textAreaTxt"
                            rows="1"
                            spellcheck="true"
                            placeholder="Type your message here.."
                            class="txt-area form-control border-0"
                            {@attach captureComposerElement}
                            bind:value={composer}
                            oninput={(event) => autoExpandComposer(event.currentTarget)}
                            onkeydown={(event) => {
                              if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                const field = event.currentTarget;
                                void sendComposerMessage().then(() => autoExpandComposer(field));
                              }
                            }}></textarea>
                        </div>
                        <!--
                          Which set of composer buttons applies is a pure width question, so it is
                          answered by a container query in app.css rather than by measuring after
                          hydration. Measuring meant the server rendered the collapsed "+" and the
                          ResizeObserver swapped in the four buttons once hydration ran, which is
                          the flicker. `showMessageOptions` stays as the explicit override the "+"
                          button sets, exactly as the captured app's toggleMessageOptions() does.
                        -->
                        <div
                          class="justify-content-center d-flex flex-row align-items-center justify-content-center p-0 m-0 text-center textAreaBtnsCol"
                          class:composer-options-forced={showMessageOptions}
                        >
                          <div class="composer-options">
                            <span
                              {...{
                                placement: 'auto',
                                container: 'body',
                                autoclose: 'outside',
                                popoverclass: 'popOverDiv'
                              } as Record<string, string>}
                              class="textAreaBtns"
                              aria-describedby={emojiOpen ? 'ngb-popover-3' : undefined}
                              onclick={() => {
                                giphyOpen = false;
                                emojiOpen = !emojiOpen;
                              }}
                            >
                              <i
                                {...{
                                  placement: 'left',
                                  ngbtooltip: 'Add Emojis'
                                } as Record<string, string>}
                                {@attach ngbTooltip}
                                class="far fa-smile"
                              ></i>
                            </span>
                            {#if canPostImages}
                              <!-- svelte-ignore a11y_click_events_have_key_events -->
                              <!-- svelte-ignore a11y_no_static_element_interactions -->
                              <span class="textAreaBtns" onclick={openImageUpload}>
                                <i
                                  {...{
                                    ngbtooltip: 'Upload an Image',
                                    placement: 'left'
                                  } as Record<string, string>}
                                  {@attach ngbTooltip}
                                  class="fas fa-image"
                                ></i>
                              </span>
                            {/if}
                            {#if isPresenter}
                              <!-- svelte-ignore a11y_click_events_have_key_events -->
                              <!-- svelte-ignore a11y_no_static_element_interactions -->
                              <span
                                data-bs-toggle="modal"
                                data-bs-target="#play-youtube-modal"
                                class="textAreaBtns"
                                onclick={() => openModal('youtube')}
                              >
                                <i
                                  {...{
                                    ngbtooltip: 'Play YouTube For All',
                                    placement: 'left'
                                  } as Record<string, string>}
                                  {@attach ngbTooltip}
                                  class="fas fa-video"
                                ></i>
                              </span>
                            {/if}
                            {#if canPostImages}
                              <span
                                {...{
                                  ngbtooltip: 'Search for GIFs',
                                  placement: 'auto',
                                  container: 'body',
                                  autoclose: 'outside',
                                  popoverclass: 'popOverDiv',
                                  triggers: 'manual'
                                } as Record<string, string>}
                                {@attach ngbTooltip}
                                class="textAreaBtns"
                                style="font-size: 12px;"
                                aria-describedby={giphyOpen ? 'ngb-popover-giphy' : undefined}
                                onclick={() => {
                                  emojiOpen = false;
                                  giphyOpen = !giphyOpen;
                                }}
                              >
                                <span>GIF</span>
                              </span>
                              {#if giphyOpen}
                                <GiphyPicker
                                  apiKey={giphyApiKey}
                                  popoverId="ngb-popover-giphy"
                                  onclose={() => (giphyOpen = false)}
                                  onselect={selectGif}
                                />
                              {/if}
                            {/if}
                          </div>
                          <!-- svelte-ignore a11y_click_events_have_key_events -->
                          <!-- svelte-ignore a11y_no_static_element_interactions -->
                          <span
                            class="textAreaBtns composer-expand"
                            onclick={() => (showMessageOptions = true)}
                          >
                            <i
                              {...{
                                ngbtooltip: 'Show message options',
                                placement: 'left'
                              } as Record<string, string>}
                              {@attach ngbTooltip}
                              class="fas fa-plus"
                            ></i>
                          </span>
                          
                          {#if emojiOpen}
                            <EmojiPicker onselect={(glyph) => (composer += glyph)} />
                          {/if}
                        </div>
                      </div>
                    </div>
                  </div>
                </app-chat>
              </as-split-area>

              <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
              <div
                role="separator"
                tabindex="0"
                class="as-split-gutter"
                aria-orientation={innerSplitIsVertical ? 'vertical' : 'horizontal'}
                aria-valuemin="0"
                aria-valuenow={alertsPercent}
                aria-valuetext={`${Math.round(alertsPercent)} percent`}
                style="flex-basis: 11px; order: 1;"
                onpointerdown={(event) => beginSplit(event, 'chat-alerts')}
              >
                <div class="as-split-gutter-icon"></div>
              </div>
            </as-split>
          </as-split-area>
          {/snippet}

          <!--
            `O(3, e.hidePresentation ? -1 : 3)` (`app-room.render-helpers.js:1662`), whose flag is
            set by `(chatOnlyMode || sessData.isChatOnlyRoom)` (`app-room.full.js:1903-1904`).

            The `co=1` half was already here and is unchanged in effect: the popout carries the
            alerts and chat, so the presentation area is not rendered in it at all, which is what
            stopped "Detach Alerts" opening a second copy of the entire room. What this adds is the
            SECOND term - the room-wide "Chat Only Room?" setting - and the name upstream gives the
            pair. They are one decision with two sources, and writing the mode alone meant an owner
            could configure a chat-only room and still get a presentation area for every member.
          -->
          {#snippet presentationPane()}
          <as-split-area
            minsize="0"
            class="presentation-box as-split-area"
            style={presentationAreaStyle}
          >
            <app-webcam-holder>
              {#if previewWindowsVisible}
                <div
                  class="webcam-wrapper d-flex justify-content-center flex-wrap align-items-end w-100"
                >
                  <!--
                    Slot 0 is this peer's own camera. The capture keys both the card and the video
                    by the presenter id (`webcamsHolder-{id}` / `webcamVideo-{id}`); this room
                    rendered the templates with an empty suffix and fed neither of them, which is
                    why turning the camera on lit the browser's in-use indicator and showed
                    nothing. Slot 1 stays an unfed placeholder: a second presenter's camera
                    arrives over the SFU, and that path is not wired yet.
                  -->
                  <!--
                    ONE card per webcaming user, created and destroyed with the list - never a
                    fixed pair.

                    `app-room` keeps `webcamingUsers` and drives the cards through the gui bus:

                      // camera on
                      this.webcamingUsers.push(r); r.isMe = a;
                      a && (r.localstream = mediaSoupService.localWebcamStream, this.camMuted = !1);
                      this.guiEventBus.emit("newWebcamPresenter", r)

                      subscribe("newWebcamPresenter",  i => this.addPresenterdWebcam(i))
                      subscribe("removeWebcamPresenter", i => this.removePresenterWebcam(i))

                      addPresenterdWebcam(e) {
                        if (this.webcamsIdxs.includes(e._id)) return;          // NOP if present
                        const s = this.container.createComponent(sL, i);       // sL = app-presenter-cams
                        s.instance.muser = e; s.instance.pID = e._id;
                        s.instance.pName = e.mediaValue.name;
                      }
                      removePresenterWebcam(e) { this.container.remove(o); delete this.webcams[e._id] }

                    So the real cards are CREATED DYNAMICALLY, one per user with a live camera, and
                    `removePresenterWebcam` destroys the component outright.

                    The two static `<app-presenter-cams>` in `app-webcam-holder`'s template are a
                    red herring: that template is
                    `T(1,'app-presenter-cams')(2,'app-presenter-cams')` with NO inputs bound, so
                    `muser` is undefined, `ngOnInit`'s `this.muser && (…)` short-circuits,
                    `initDrag()` never runs - and `initDrag()` is the only thing that calls
                    `.show()`. They are inert and never visible. Reproducing them as two rendered
                    cards put two empty black boxes on screen before anyone touched the camera,
                    and gave the second one an X that could not close anything.
                  -->
                  {#each webcamPresenters as presenter, index (presenter.id)}
                    <app-presenter-cams>
                      <div
                        class="card webcamsHolder"
                        id="webcamsHolder-{presenter.id}"
                        {@attach webcamCard(presenter, index)}
                      >
                        <video
                          {@attach presenter.isMe
                            ? attachLocalWebcam
                            : attachRemoteWebcam(presenter.id)}
                          {...{ autoplay: 'autoplay' } as Record<string, string>}
                          class="webcamsHolderVideo"
                          id="webcamVideo-{presenter.id}"
                        ></video>
                        <div class="overlay">
                          <h5 class="pNameLabel m-0">
                            {presenter.name}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <span class="closeIcon" onclick={() => closeWebcamPreview(presenter)}>
                              <i class="fas fa-times"></i>
                            </span>
                          </h5>
                        </div>
                      </div>
                    </app-presenter-cams>
                  {/each}
                </div>
              {/if}
            </app-webcam-holder>
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
                <ul
                  id="mainTabs"
                  class="nav nav-tabs mainTabset"
                  role="tablist"
                  hidden={viewerOnlyMode}
                >
                  <li role="presentation" class="nav-item">
                    <a
                      id="screens-tab"
                      class="nav-link"
                      class:active={mainTab === 'screens'}
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
                  <li role="presentation" class="nav-item" hidden>
                    <a
                      id="streams-tab"
                      class="nav-link"
                      role="tab"
                      tabindex="-1"
                      aria-controls="streams"
                      aria-selected="false"
                      data-bs-toggle="tab"
                      data-bs-target="#streams"
                    >
                      <div class="d-flex">
                        <div><i class="fas fa-podcast"></i><span class="ml-1">Streams</span></div>
                      </div>
                    </a>
                  </li>
                  <li role="presentation" class="nav-item">
                    <a
                      id="notes-tab"
                      class="nav-link presAreaTabs-notes"
                      class:active={mainTab === 'notes'}
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
                          <i id="noteChangeIndicator" class="fas fa-edit"></i><span class="mx-1"
                            >Notes</span
                          >
                        </div>
                        <div class="dropdown">
                          <!-- svelte-ignore a11y_no_static_element_interactions -->
                          <span
                            id="dropdownMenuNotes"
                            data-bs-toggle="dropdown"
                            aria-expanded={notesMenuOpen}
                            class="dropdown-toggle"
                            onclick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              notesMenuOpen = !notesMenuOpen;
                            }}
                            onkeydown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ')
                                notesMenuOpen = !notesMenuOpen;
                            }}
                          >
                            <i class="fas fa-cog"></i>
                          </span>
                          <ul
                            aria-labelledby="dropdownMenuButton"
                            class="dropdown-menu"
                            class:show={notesMenuOpen}
                            {@attach mountNewNoteLink}
                          ></ul>
                        </div>
                      </div>
                    </a>
                  </li>
                  <!--
                    VideoPlayer is presenter-only here. The captured gate, verbatim, on both the
                    tab (slot 25) and its pane (slot 47):

                      O(25, (o.hideVideoPlayer && !o.isP) || o.isP ? 25 : -1)

                    i.e. a presenter always sees it, and a member sees it only when
                    `hideVideoPlayer` is set. This room does not model `hideVideoPlayer`, and the
                    owner's own member capture of `#mainTabs` shows the tab collapsed to an
                    empty Angular comment anchor, alongside Recordings, Swing Alerts and Day
                    Trades - so for a member the gate evaluated false there. Reducing it to `isPresenter` reproduces both observed
                    states; the unmodelled term is recorded rather than invented.

                    This tab was rendered with no gate at all, so every member saw it.
                  -->
                  {#if isPresenter}
                    <li role="presentation" class="nav-item">
                    <a
                      id="videoplayer-tab"
                      class="nav-link"
                      class:active={mainTab === 'videoplayer'}
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
                    "Hide Files Section?" - `z('hidden', o.hideFiles)` on this `li`
                    (app-presentationarea.full.js:5375) and on the `#files` pane (5410-5413). Both,
                    because either one alone leaves a tab that opens nothing or a pane still
                    reachable from a tab that is gone.

                    The reference feeds the binding `sessData.hideFiles || globals.videoOnlyMode`
                    (2289-2290). Only the first term is implemented, and `filesSectionHidden` in
                    `$lib/files-gates` says why: the second is not a setting but the recording-bot
                    client global, set from the `r` query parameter, and this room has no recording
                    bot to model.
                  -->
                  <li role="presentation" class="nav-item" hidden={filesHidden}>
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <a
                      class="nav-link"
                      class:active={mainTab === 'files'}
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
                            aria-expanded={filesMenuOpen}
                            class="dropdown-toggle"
                            onclick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              mainTab = 'files';
                              notesMenuOpen = false;
                              filesMenuOpen = !filesMenuOpen;
                            }}
                            onkeydown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                mainTab = 'files';
                                notesMenuOpen = false;
                                filesMenuOpen = !filesMenuOpen;
                              }
                            }}
                          >
                            <i class="fas fa-cog"></i>
                          </span>
                          <ul
                            aria-labelledby="dropdownMenuFiles"
                            class="dropdown-menu"
                            class:show={filesMenuOpen}
                            {@attach mountUploadFileLink}
                          ></ul>
                        </div>
                      </div>
                    </a>
                  </li>
                </ul>

                <div id="mainTabsContent" class="tab-content">
                  <div
                    id="screens"
                    class="tab-pane fade"
                    class:show={mainTab === 'screens'}
                    class:active={mainTab === 'screens'}
                    class:is-fullscreenshare={isFullScreenshare}
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
                    {#if sharedScreens.length === 0}
                      <h3 class="text-center mt-4">No one is presenting right now...</h3>
                    {/if}
                    <ScreenTabs
                      screens={sharedScreens}
                      selectedScreenId={selectedScreenTab}
                      {forcedScreenId}
                      {lockedScreenId}
                      {isPresenter}
                      onselect={selectScreenTabByUser}
                      ondetach={detachScreen}
                      ontogglelock={toggleLockScreen}
                      onbringeveryone={bringEveryoneToScreen}
                      onstopscreen={stopSharedScreen}
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
                          {showZoomCtrl}
                          {viewerOnlyMode}
                          ontoggle={togglePanZoom}
                          volume={screenVolume}
                          oncapture={() => {
                            // The captured payload names the screen, and only that screen's view
                            // answers: `e.screenId !== this.muser._id` returns early.
                            if (selectedScreenTab) captureVideoImage(selectedScreenTab);
                          }}
                          onzoomin={panZoomIn}
                          onzoomout={panZoomOut}
                          onreset={panZoomReset}
                          fullscreen={isFullScreenshare}
                          onfullscreen={() => (isFullScreenshare = !isFullScreenshare)}
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
                      class="tab-content"
                      class:viewer-only-screen-tab={viewerOnlyMode}
                    >
                      {#each sharedScreens as screen (screen.id)}
                        <ScreenPane
                          id={screen.id}
                          stream={screenStreams.get(screen.id) ?? null}
                          active={screen.id === selectedScreenTab}
                          {viewerOnlyMode}
                          {volume}
                          muted={volume === 0}
                          {showZoomCtrl}
                          {zoomLevel}
                          pan={screenPans.get(screen.id) ?? NEUTRAL_PAN}
                          detached={detachedScreenId !== null}
                          {saveData}
                          onpan={(x, y) => screenPans.set(screen.id, { x, y })}
                          ontogglezoom={togglePanZoom}
                          onzoomin={panZoomIn}
                          onzoomout={panZoomOut}
                          onreset={panZoomReset}
                        />
                      {/each}
                    </div>
                    {/if}
                  </div>
                  <div
                    id="streams"
                    class="tab-pane fade"
                    role="tabpanel"
                    aria-labelledby="streams-tab"
                    hidden
                  >
                    <h3 class="text-center mt-4">No one is streaming right now...</h3>
                    <ul id="streamsTabs" class="nav nav-tabs screens-tabs" role="tablist"></ul>
                    <div id="streamsTabsContent" class="tab-content"></div>
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
                        {newNoteOpen}
                        onCreate={async (name) => {
                          const result = await submitNoteMutation<{
                            success: boolean;
                            note: RoomNote;
                          }>('newSessionNoteTab', { name });
                          return result?.note;
                        }}
                        onDelete={async (noteId) => {
                          await submitNoteMutation('deleteSessionNoteTab', { noteId });
                        }}
                        onNewNoteOpenChange={(open) => (newNoteOpen = open)}
                        onRename={async (noteId, newName) => {
                          await submitNoteMutation('renameSessionNoteTab', { noteId, newName });
                        }}
                        onSave={async (noteId, contentHtml) => {
                          await submitNoteMutation('saveSessionNote', { noteId, contentHtml });
                        }}
                        onSetWelcomeMat={async (noteId, allRooms) => {
                          await submitNoteMutation('setWelcomeMatNoteTab', {
                            noteId,
                            allRooms
                          });
                        }}
                        onUploadImages={uploadAlertFiles}
                      />
                    {/if}
                  </div>
                  <!-- Slot 47 carries the same gate as the tab above. -->
                  {#if isPresenter}
                  <div
                    id="videoplayer"
                    class={mainTab === 'videoplayer'
                      ? 'tab-pane position-relative h-100 active show'
                      : 'tab-pane position-relative h-100'}
                    role="tabpanel"
                    aria-labelledby="videoplayer-tab"
                  >
                    <VideoPlayer sessionId={data.sessionHandle} {isPresenter} />
                  </div>
                  {/if}
                  <!--
                    The second half of the `hideFiles` gate - `z('hidden', o.hideFiles)` at
                    full.js:5410-5413. `#files.active` sets `display: block`, which the UA rule for
                    `[hidden]` cannot beat on its own, so `app.css` carries `#files[hidden]` after
                    it; the note there records that the two selectors are equally specific and it is
                    the order that decides.
                  -->
                  <div
                    id="files"
                    class={mainTab === 'files' ? 'tab-pane fade active show' : 'tab-pane fade'}
                    hidden={filesHidden}
                    role="tabpanel"
                    aria-labelledby="files-tab"
                  >
                    <ul
                      id="myTab"
                      class="nav nav-tabs files-tabs d-flex justify-content-center"
                      role="tablist"
                    >
                      <!-- The click handler sits on the <li>, as the reference has it: its const puts the
                           listener there, and `.files-tabs li.nav-item { cursor: pointer }` is
                           measured on the li — so the 5px margin band around each tab is part of the
                           target. Ours listened on the <a> alone and that band was dead. The anchor
                           keeps the keydown, so the tab stays operable from the keyboard, which the
                           reference's is not. -->
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                      <li class="nav-item" role="presentation" onclick={() => (fileTab = 'files')}>
                        <!-- svelte-ignore a11y_interactive_supports_focus -->
                        <a
                          id="files-tab"
                          class="nav-link d-flex align-items-center justify-content-between"
                          class:active={fileTab === 'files'}
                          data-bs-toggle="tab"
                          role="tab"
                          aria-controls="files"
                          aria-selected={fileTab === 'files'}
                          onclick={() => (fileTab = 'files')}
                          onkeydown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') fileTab = 'files';
                          }}
                        >
                          <span>Files</span>
                          <span class="badge rounded-pill bg-danger files-badge"
                            >{countFiles('files')}</span
                          >
                        </a>
                      </li>
                      <!-- The click handler sits on the <li>, as the reference has it: its const puts the
                           listener there, and `.files-tabs li.nav-item { cursor: pointer }` is
                           measured on the li — so the 5px margin band around each tab is part of the
                           target. Ours listened on the <a> alone and that band was dead. The anchor
                           keeps the keydown, so the tab stays operable from the keyboard, which the
                           reference's is not. -->
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                      <li class="nav-item" role="presentation" onclick={() => (fileTab = 'images')}>
                        <!-- svelte-ignore a11y_interactive_supports_focus -->
                        <a
                          id="image-tab"
                          class="nav-link d-flex align-items-center justify-content-between"
                          class:active={fileTab === 'images'}
                          data-bs-toggle="tab"
                          role="tab"
                          aria-controls="image"
                          aria-selected={fileTab === 'images'}
                          onclick={() => (fileTab = 'images')}
                          onkeydown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') fileTab = 'images';
                          }}
                        >
                          <span>Images</span>
                          <span class="badge rounded-pill bg-danger files-badge"
                            >{countFiles('images')}</span
                          >
                        </a>
                      </li>
                      <!-- The click handler sits on the <li>, as the reference has it: its const puts the
                           listener there, and `.files-tabs li.nav-item { cursor: pointer }` is
                           measured on the li — so the 5px margin band around each tab is part of the
                           target. Ours listened on the <a> alone and that band was dead. The anchor
                           keeps the keydown, so the tab stays operable from the keyboard, which the
                           reference's is not. -->
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                      <li class="nav-item" role="presentation" onclick={() => (fileTab = 'sounds')}>
                        <!-- svelte-ignore a11y_interactive_supports_focus -->
                        <a
                          id="sounds-tab"
                          class="nav-link d-flex align-items-center justify-content-between"
                          class:active={fileTab === 'sounds'}
                          data-bs-toggle="tab"
                          role="tab"
                          aria-controls="sounds"
                          aria-selected={fileTab === 'sounds'}
                          onclick={() => (fileTab = 'sounds')}
                          onkeydown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') fileTab = 'sounds';
                          }}
                        >
                          <span>Sounds</span>
                          <span class="badge rounded-pill bg-danger files-badge"
                            >{countFiles('sounds')}</span
                          >
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
                            oninput={(event) => (fileSearch = event.currentTarget.value)}
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
                            onclick={deleteSelectedFiles}
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
                        `fa fa-play-circle mr-2` (its const 158 — the play glyph, not a stop glyph;
                        transcribed, not corrected). Ours read "Stop For All" with `fa-stop-circle`.
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
                      The sort bar, from the owner's own rendered markup. Angular's structural
                      anchors are dropped; every class, its ORDER, and both titles are verbatim.

                      Each button carries three icon variants (the two empty anchors after each `i`
                      are collapsed ngIfs): `fa-sort` when it is not the governing sort, and an
                      up/down pair when it is. Note the class order genuinely differs between the
                      two states in the capture - `fas ml-2 fa-sort-alpha-down` when active,
                      `fas fa-sort ml-2` when not - so they are written out rather than composed.
                    -->
                    <div
                      class="d-flex flex-wrap justify-content-center align-items-center mt-2 st-fileSortBar"
                    >
                      <span class="mr-2">Sorting by:</span>
                      <button
                        class="btn btn-sm m-1 st-fileSortName"
                        class:active={fileSortKey === 'name'}
                        title={nameAscending
                          ? 'Sorted A to Z (click to sort Z to A)'
                          : 'Sorted Z to A (click to sort A to Z)'}
                        onclick={() => toggleFileSort('name')}
                      >
                        {' '}Name{' '}
                        {#if fileSortKey === 'name'}
                          <i class="fas ml-2 {nameAscending
                              ? 'fa-sort-alpha-down'
                              : 'fa-sort-alpha-up'}"></i>
                        {:else}
                          <i class="fas fa-sort ml-2"></i>
                        {/if}
                      </button>
                      <button
                        class="btn btn-sm m-1 st-fileSortDate"
                        class:active={fileSortKey === 'date'}
                        title={dateNewestFirst
                          ? 'Sorted newest to oldest (click to sort oldest to newest)'
                          : 'Sorted oldest to newest (click to sort newest to oldest)'}
                        onclick={() => toggleFileSort('date')}
                      >
                        {' '}Date{' '}
                        {#if fileSortKey === 'date'}
                          <i class="fas ml-2 {dateNewestFirst
                              ? 'fa-sort-amount-down'
                              : 'fa-sort-amount-up'}"></i>
                        {:else}
                          <i class="fas fa-sort ml-2"></i>
                        {/if}
                      </button>
                    </div>
                    <!--
                      An EMPTY room renders neither the heading nor the table.

                      The two gates are `O(84, o.sessionFiles ? -1 : 84)` for the `<h4>` and
                      `O(85, o.sessionFiles && o.sessionFiles.length > 0 ? 85 : -1)` for the table.
                      They are not complements: the heading needs `sessionFiles` to be FALSY, and an
                      empty array is truthy, so a room with zero files shows nothing at all. Both
                      rendered captures confirm it — the badges read 0 and after the toolbar there
                      are two collapsed anchors and no `h4`, no table.

                      So "No room files found." is not the empty-list message it looks like; it is
                      the never-fetched message. Our loader ends in `.all()`, which always returns an
                      array, so that state cannot arise here and the heading is not rendered at all
                      rather than kept as a branch nothing can reach. Ours previously showed it
                      whenever the list was empty, which is the one case the reference stays silent.
                    -->
                    {#if data.files.length > 0}
                      <table class="table table-striped m-auto w-100 mt-3 st-fileTable">
                        <tbody id="filesDriveList">
                          {#each searchedFiles() as item (item.id)}
                            <tr>
                              {#if !matchesFileTab(item)}
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
                                {@const alertSoundButton = alertSoundButtonFor(
                                  { isPresenter },
                                  data.sessData ?? {},
                                  item
                                )}
                                {#if isPresenter}
                                <td>
                                  <input
                                    type="checkbox"
                                    value={item.id}
                                    checked={selectedFileIds.has(item.id)}
                                    onchange={(event) =>
                                      toggleFileSelection(item.id, event.currentTarget.checked)}
                                  />
                                </td>
                              {/if}
                              <td>
                                <div class="d-flex flex-column">
                                  <div>
                                    <span class="st-fileName">{item.name} </span>
                                    <span class="st-fileSize ml-2"
                                      >{fileSizeInKb(item.size)}Kb
                                    </span>
                                    <div class="st-fileName">
                                      <i>{mediumDate(item.createdAt)}</i>
                                    </div>
                                  </div>
                                  {#if item.kind === 'image'}
                                    <a
                                      target="_blank"
                                      href={item.url}
                                      type={item.contentType}
                                      download={item.name}
                                    >
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
                                <div
                                  class="d-flex justify-content-center align-items-center flex-wrap"
                                >
                                  {#if item.kind !== 'image'}
                                    <!-- svelte-ignore a11y_missing_content -->
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
                                      onclick={() => deleteFile(item)}
                                    >
                                      <i class="fa fa-trash mr-2"></i>Delete{' '}
                                    </button>
                                  {/if}
                                  {#if item.kind === 'sound'}
                                    <button
                                      type="button"
                                      title="Play"
                                      class="btn ml-2 st-fileDownload btn-success"
                                      onclick={() => playMp3ForMe(item)}
                                    >
                                      {#if playingForMe.has(item.id)}
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
                                    Nodes 22 and 23 of the row (full.js:1889-1916), consts
                                    261/262/263, both `btn ml-2 btn-info set-alert-sound-btn` - the
                                    class whose rule already ships at
                                    `src/lib/styles/captured-runtime-components.css:6972`
                                    (`font-size: 12px`).

                                    ONE `{#if}` with an `{:else if}`, not two independent blocks.
                                    The two gates at full.js:1972-1991 are complements over the same
                                    three terms, and written separately a room that never received
                                    `overwriteCashRegisterSound` would render both at once.
                                    `alertSoundButtonFor` in `$lib/files-gates` resolves them to one
                                    answer and is tested there.

                                    TRANSCRIPTION NOTE: const 263 spells the type attribute
                                    `pe="button"` - `["pe","button","title","Remove Overwrited Cash
                                    Register Sound",...]` - where every sibling row button spells it
                                    `type`. That is a typo in the original. It is harmless where it
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
                                      onclick={() => setAlertSound(item.url, true)}
                                    >
                                      <i class="fa fa-bell mr-2"></i>Set as alert sound{' '}
                                    </button>
                                  {:else if alertSoundButton === 'remove'}
                                    <button
                                      type="button"
                                      title="Remove Overwrited Cash Register Sound"
                                      class="btn ml-2 btn-info set-alert-sound-btn"
                                      onclick={() => setAlertSound(item.url, false)}
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
                </div>
                {#if youtubeForAllUrl}
                  <YoutubePlayerOverlay
                    url={youtubeForAllUrl}
                    {isPresenter}
                    muted={doNotDisturbOn}
                    onstop={stopYoutubeForAll}
                    onclose={stopYoutubeForAll}
                  />
                {/if}
                {#if soundCloudUrl && soundCloudPlaying}
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
                        src={`https://w.soundcloud.com/player/?url=${soundCloudUrl}&auto_play=true`}
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
                  src={mp3Url ?? ''}
                ></audio>
              </div>
            </app-presentationarea>
          </as-split-area>
          {/snippet}

          {#snippet mainGutter()}
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <div
              role="separator"
              tabindex="0"
              class="as-split-gutter"
              aria-orientation={splitIsHorizontal ? 'horizontal' : 'vertical'}
              aria-valuemin="0"
              aria-valuenow={primaryPercent}
              aria-valuetext={`${Math.round(primaryPercent)} percent`}
              style={isMobileScreen ? 'flex-basis: 11px;' : 'flex-basis: 11px; order: 1;'}
              onpointerdown={(event) => beginSplit(event, 'main')}
            >
              <div class="as-split-gutter-icon"></div>
            </div>
          {/snippet}

          <!--
            `O(5, o.isMobileScreen ? 6 : 5)` — `app-room.full.js:4061`. The 601px threshold does not
            restyle this layout, it selects a DIFFERENT ONE: `K4e`
            (`app-room.render-helpers.js:1783-1821`) against the desktop `j4e` (`:1616-1664`).

            What actually differs, read from those two functions and the const table rather than
            inferred:

              - the CHILD ORDER is reversed. `K4e` is presentation (`G4e`, node 1, gated
                `O(1, hidePresentation ? -1 : 1)`), then chat/alerts (`W4e`, node 2,
                `O(2, hideChatAlerts ? -1 : 2)`). `j4e` is chat/alerts (node 1), extra chat, then
                presentation (node 3). The gates are the same two flags either way, which is why
                they are written once here and read twice.
              - the split is VERTICAL as a static attribute, not a binding — const 224 carries
                `'direction','vertical'` where const 8 carries `3,'direction'`. Handled by
                `splitIsHorizontal`.
              - there is NO `dragEnd`, so a mobile drag is never recorded. Handled in `finishSplit`.
              - the areas carry no `order`. Handled in `primaryAreaStyle` / `presentationAreaStyle`,
                and it is why this block reorders the DOM instead of restyling it.

            The gutter is a snippet for exactly that reason: on a phone it has to sit BETWEEN the two
            panes in document order, because there is no `order` property left to place it with.

            Snippets rather than a second copy of the markup: the two panes are ~1,625 lines, and a
            duplicated layout is one that drifts the first time somebody edits the version they
            happen to be looking at.
          -->
          {#if isMobileScreen}
            {#if !hidePresentation}{@render presentationPane()}{/if}
            {@render mainGutter()}
            {#if !hideChatAlerts}{@render chatAlertsPane()}{/if}
          {:else}
            {#if !hideChatAlerts}{@render chatAlertsPane()}{/if}
            {#if !hidePresentation}{@render presentationPane()}{/if}
            {@render mainGutter()}
          {/if}
        </as-split>
      </div>
    </div>
    <!--
      One hidden sink per remote microphone. A consumed audio track produces no sound until it is
      attached to an element, and the room has no visible control for a peer's voice - the capture
      keeps its own audio elements out of sight the same way (`#mp3player` is `display: none`).
    -->
    {#each [...remoteAudioStreams.keys()] as producerId (producerId)}
      <!--
        `msRemAudio-{userID}` is the capture's own id and it is load-bearing, not decorative:
        `adjustVol` does `$("[id^=msRemAudio-]").prop("volume", …)` (bundle byte 2517022),
        `adjustVolPres` targets one peer's element, and `reconnectAudio` does
        `$("[id^='msRemAudio-']").remove()` before re-subscribing. This room already queries that
        exact prefix in `setMasterVolume`, against elements that had no id at all - so the master
        volume slider moved nothing.
      -->
      <audio
        id="msRemAudio-{audioProducerOwners.get(producerId)?.userID ?? producerId}"
        {@attach attachRemoteAudio(producerId)}
        autoplay
        style="display: none;"
      ></audio>
    {/each}
    <div
      id="connectedMsg"
      class="notConnectedOverlay animated fadeIn"
      style={reconnectedFlash ? 'display: block;' : 'display: none;'}
    >
      Conected<i class="fas fa-check"></i>
    </div>
    <ModalHost
      name={modal}
      {mediaIceServers}
      {mobilePin}
      mobileAndroidUrl={data.sessData?.customMobileAppEnabled
        ? data.sessData?.customMobileAppAndroidUrl
        : null}
      mobileIosUrl={data.sessData?.customMobileAppEnabled
        ? data.sessData?.customMobileAppIOSUrl
        : null}
      hideMobileCredentials={Boolean(data.sessData?.hideMobileCredentials)}
      {isLimitedPresenter}
      canEditUsername={Boolean(data.sessData?.allowUsersToChangeUsername)}
      alerts={data.alerts}
      {settingsTab}
      {alertTab}
      {theme}
      {roomSplitDir}
      {sessionControlInitialTab}
      chatStyle={globalChatStyle}
      {doNotDisturbOn}
      {alertSoundOn}
      {nonTradeSound}
      {alertPopup}
      {longerAlertPopup}
      {qaSoundOn}
      {chatSoundOn}
      {pollOpenMode}
      {pollRestoreToken}
      activePoll={data.activePoll}
      savedPolls={data.savedPolls}
      onclose={closeActiveModal}
      onSettingsTab={(tab) => (settingsTab = tab)}
      onAlertTab={(tab) => (alertTab = tab)}
      onTheme={setTheme}
      onPreferenceChange={savePreference}
      {saveData}
      onSaveDataChange={setSaveData}
      onDoNotDisturbChange={(enabled) => (doNotDisturbOn = enabled)}
      onPlayYoutube={playYoutubeForAll}
      onPostAlert={postAlert}
      onPastePostAlert={postPastedAlertImage}
      onPollMinimize={minimizePoll}
      onPollSave={(question, choices) =>
        submitPollAction('savePoll', { q: question, choices: JSON.stringify(choices) })}
      onPollDelete={(pollId) => submitPollAction('deleteSavedPoll', { pollId })}
      onPollSend={(question, choices) =>
        submitPollAction('sendPoll', { q: question, choices: JSON.stringify(choices) })}
      onPollAnswer={(choiceIndex) => submitPollAction('sendPollAnswer', { a: choiceIndex })}
      onPollPostResults={(body) => persistPostedAlert('text', body, null, false, false)}
      onPollEnd={() => submitPollAction('pollDone')}
      onAlert={(message) => (bootboxAlert = message)}
      onConfirm={requestModalConfirmation}
      onReplySend={sendReplyMessage}
      onQuestionSend={sendAlertQuestion}
      alertQuestions={data.alertQuestions}
      onMentionUser={mentionUser}
      onPrivateChat={(user) => {
        selectedMessageUser = user;
        showPrivateChat();
      }}
      onFollowToggle={requestFollowToggle}
      onFollowStyleChange={applyFollowStyle}
      onMuteToggle={requestMuteToggle}
      onUserAction={handleUserAction}
      onManagedUserRemoval={requestManagedUserRemoval}
      onManagedUserInfo={openManagedUserInfo}
      currentUser={data.user}
      {targetUser}
      {mutedUsers}
      {followedUsers}
      targetMessage={selectedMessage}
    />
    {#if modal === 'image-upload'}
      <ImageUploadDialog
        onclose={() => (modal = null)}
        onupload={(files, message) => void uploadComposerImages(files, message)}
      />
    {/if}
    {#if pendingGifUrl}
      <GifConfirmDialog
        url={pendingGifUrl}
        onclose={cancelGif}
        onconfirm={() => void confirmGif()}
      />
    {/if}
    {#if bootboxConfirmation}
      <BootboxDialog
        mode="confirm"
        message={bootboxConfirmation.message}
        className={bootboxConfirmation.className}
        onclose={() => {
          const dismissed = bootboxConfirmation?.ondismiss;
          bootboxConfirmation = null;
          dismissed?.();
        }}
        onconfirm={bootboxConfirmation.onconfirm}
      />
    {/if}
    <!--
      `randomUser()`'s dialog. Two phases, because the delay IS the feature: the giphy spinner
      shows for three seconds with "User Info" hidden, then the body is replaced by
      `<h2 class="text-center flash animated">` carrying the name and the button appears
      (`$(".btn-random-user").css("display", "inline-block")`).

      `alt=""` and `class="random-user-modal"` are the capture's own. The image is fixed 480x270 so
      the dialog does not resize around it as it loads.
    -->
    {#if randomUserPick}
      <BootboxDialog
        mode="alert"
        message=""
        title="Random User"
        className="random-user-modal"
        onclose={closeRandomUser}
      >
        {#if randomUserPick.revealed}
          <h2 class="text-center flash animated">{randomUserPick.entry.displayName}</h2>
        {:else}
          <p class="text-center">
            <img
              src="https://media.giphy.com/media/dyXPQavQUyeSK4nlpt/giphy.gif"
              alt=""
              width="480"
              height="270"
            />
          </p>
        {/if}
        {#snippet footer()}
          <!--
            The User Info handler ends in `!0` inverted - it returns `false`, which is bootbox's
            "do not dismiss". So the dialog stays open behind the user-info modal.
          -->
          {#if randomUserPick?.revealed}
            <button
              type="button"
              class="btn btn-warning btn-random-user"
              onclick={() => randomUserPick && openRosterUserInfo(randomUserPick.entry)}
            >
              User Info
            </button>
          {/if}
          <button type="button" class="btn btn-danger" onclick={closeRandomUser}>Close</button>
        {/snippet}
      </BootboxDialog>
    {/if}
    {#if bootboxAlert}
      <BootboxDialog mode="alert" message={bootboxAlert} onclose={() => (bootboxAlert = null)} />
    {/if}
    {#if bootboxPrompt}
      <BootboxDialog
        mode="prompt"
        message=""
        title={bootboxPrompt.title}
        value={bootboxPrompt.value}
        onclose={() => (bootboxPrompt = null)}
        onconfirm={(value) => bootboxPrompt?.onconfirm(value ?? '')}
      />
    {/if}
    <ToastHost {toasts} ondismiss={dismissToast} onstick={stickToast} onresume={resumeToast} />
    {#if selectedImageUrl}
      <div
        class="bootbox modal fade imgur-modal show"
        tabindex="-1"
        role="dialog"
        aria-hidden="true"
        style="display: block;"
        onclick={(event) => {
          if (event.target === event.currentTarget) selectedImageUrl = null;
        }}
      >
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header border-0">
              <!-- svelte-ignore a11y_missing_content -->
              <h5 class="modal-title"></h5>
              <button
                type="button"
                class="bootbox-close-button close btn-close"
                aria-hidden="true"
                aria-label="Close"
                onclick={() => (selectedImageUrl = null)}
              ></button>
            </div>
            <div class="modal-body">
              <div class="bootbox-body">
                <img
                  src={selectedImageUrl}
                  alt={selectedImageUrl.substring(selectedImageUrl.lastIndexOf('/') + 1)}
                />
                <hr />
                <button
                  class="btn btn-primary btn-sm"
                  onclick={() => downloadImage(selectedImageUrl as string)}
                  ><i class="fa fa-download"></i> Download Image</button
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
    <!--
      Draggable and resizable, exactly as the capture sets it up:

        un("#privaChatCompHolder")
          .draggable({ appendTo:"body", containment:".wrapper", cursor:"move", scroll:!1, snap:!0,
                       cancel:".privChatScroller, .textSendDiv, #pmSearchTermTxt" })
          .resizable({ handles:"n, e, s, w, ne, se, sw, nw",
                       maxWidth: un(".wrapper").width(), maxHeight: un(".wrapper").height() })

      The `cancel` list is what keeps the panel usable: without it, scrolling the conversation or
      selecting text in the composer would pick the whole panel up and move it.
    -->
    <app-privchat
      id="privaChatCompHolder"
      class="privChatHolder"
      style={privateChatOpen ? 'display: block;' : undefined}
      {@attach panelDragResize({
        containment: '.wrapper',
        cancel: '.privChatScroller, .textSendDiv, #pmSearchTermTxt',
        handles: 'n, e, s, w, ne, se, sw, nw',
        snap: true
      })}
    >
      <div class="chat d-flex flex-column h-100" style="overflow-y: hidden;">
        <div class="bs-component">
          <nav class="navbar navbar-expand-lg navbar-light bg-light chat-nav-pm p-1 text-white">
            <!-- svelte-ignore a11y_missing_attribute -->
            <a class="navbar-brand ml-1 mr-1"
              ><i class="fas fa-comments"></i>
              {#if doNotDisturbOn}
                <span class="badge badge-danger ml-2"><i class="fas fa-bell-slash"></i> DND</span>
              {/if}</a
            >
            {#if selectedMessageUser}
              <ul
                role="tablist"
                class="nav nav-tabs flex-wrap flex-grow-1 justify-content-center chatTabs"
              >
                <li class="nav-item">
                  <!-- svelte-ignore a11y_missing_attribute -->
                  <a data-bs-toggle="tab" role="tab" class="nav-link active">
                    <img
                      alt="user.name"
                      class="avatarImg avatarImg-active"
                      src={selectedMessageUser.pic}
                    />
                    {selectedMessageUser.nick}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <span
                      class="close-tab"
                      onclick={(event) => {
                        event.stopPropagation();
                        selectedMessageUser = null;
                        selectedMessage = null;
                      }}
                    >
                      <i class="mx-1 fas fa-times"></i>
                    </span>
                  </a>
                </li>
              </ul>
            {/if}
            <ul class="nav ml-auto flex-nowrap align-items-center">
              {#if selectedMessageUser && isPresenter}
                <li class="nav-item mr-2">
                  <!-- svelte-ignore a11y_missing_attribute -->
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <a
                    class="btn btn-outline-secondary btn-sm text-light border-0"
                    onclick={deleteThisPM}
                  >
                    <i class="fas fa-trash"></i> This
                  </a>
                </li>
              {/if}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
              <li
                class="nav-item dropdown"
                style="position: static;"
                onclick={() => (showPMToolbar = !showPMToolbar)}
              >
                <!-- svelte-ignore a11y_consider_explicit_label -->
                <!-- svelte-ignore a11y_missing_attribute -->
                <a aria-haspopup="true" aria-expanded="false" class="nav-link dropdown-toggle p-0">
                  <i title="Settings" class="fas fa-cog chat-header-gear"></i>
                </a>
              </li>
              <li class="nav-item ml-2 mr-2">
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <i class="fas fa-times" onclick={closePrivateChatPanel}></i>
              </li>
            </ul>
          </nav>
          {#if showPMToolbar}
            <div
              class="shadow p-2 w-100 border-top border-secondary pmToolbar"
              style="margin-top: 0px;"
            >
              <form
                id="chat-settings"
                class="w-100"
                onsubmit={(event) => {
                  event.preventDefault();
                }}
              >
                <div>
                  <div class="form-group">
                    <div class="input-group">
                      <input
                        type="text"
                        name="pmSearchTermTxt"
                        id="pmSearchTermTxt"
                        placeholder="Type your search term, then press Enter"
                        aria-label="Search"
                        aria-describedby="addon-search"
                        title="Type your search term, then press Enter"
                        class="form-control"
                        bind:value={pmSearchTerm}
                        onkeydown={(event) => {
                          if (event.key !== 'Enter') return;
                          event.preventDefault();
                          void onEnterSearchPrivateChat(event.currentTarget.value);
                        }}
                      />
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <span
                        id="addon-chat-clear"
                        title="Clear the search"
                        class="btn btn-outline-secondary pl-2 pr-2 d-inline-flex input-group-text"
                        onclick={() => void onEnterSearchPrivateChat('')}
                      >
                        <i class="fas fa-times"></i>
                      </span>
                    </div>
                  </div>
                </div>
              </form>
              <li class="d-inline mr-2">
                <!-- svelte-ignore a11y_missing_attribute -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <a class="btn btn-outline-light btn-sm text-light" onclick={setDND}
                  ><i class="fas fa-bell-slash"></i> Don't Disturb</a
                >
                <!-- svelte-ignore a11y_missing_attribute -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <a
                  class="btn btn-outline-info btn-sm text-light mx-1"
                  onclick={downloadPrivateChatLog}><i class="fas fa-download"></i> Download Log</a
                >
              </li>
            </div>
          {/if}
        </div>
        <div class="d-flex h-100 pc-body">
          {#if chatTabs.length > 0}
            <!--
              One row per conversation - `getAllPCLogs` fills this. The row markup is the capture's
              `tEe`: a `list-group-item` carrying a status dot, the avatar and the name, with
              `pc-active` on the open one.
            -->
            <div class="list-group pc-list">
              {#each chatTabs as tab (tab.uid)}
                <button
                  type="button"
                  aria-current={currUser === tab.uid}
                  class="list-group-item list-group-item-light d-flex align-items-center justify-content-between px-1"
                  class:pc-active={currUser === tab.uid}
                  onclick={() => switchChatToUser(tab.uid)}
                >
                  <span class="user-status-container">
                    <span class:bg-success={tab.online} class="badge user-status-type">&nbsp;</span>
                    <img alt="t.avt" class="avatarImg" src={tab.pic} />
                    <span class="pc-username ms-1">{tab.name}</span>
                  </span>
                  {#if tab.unread > 0}
                    <span class="badge privchatUnread">{tab.unread}</span>
                  {/if}
                </button>
              {/each}
            </div>
            <div class="pc-logs">
              {#if currUser === null}
                <div class="flex-fill p-3 text-center">No active chat</div>
              {:else}
                <!--
                  `app-privchatscroller`: `.pc-messages` scrolls, with a Load More badge above the
                  rows while `hasMoreData && !searchTerm`. Rows are `app-st-compactmessage` with
                  `logType="pc"`.
                -->
                <app-privchatscroller class="privChatScroller">
                  <div class="pc-messages">
                    {#if privateChatLog.length >= 50 && !pmSearching}
                      <div class="text-center">
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <span
                          class="badge badge-warning"
                          onclick={() =>
                            currUser !== null &&
                            loadPrivateChatLog(
                              currUser,
                              Math.floor(privateChatLog.length / 50)
                            )}
                        >
                          Load More</span
                        >
                      </div>
                    {/if}
                    {#each privateChatLog as message (message._id)}
                      <app-st-compactmessage id="pcm-{message._id}">
                        <div class="msg-box pb-1">
                          <div class="d-flex justify-content-between align-items-center w-100">
                            <strong class="username mx-1" class:presUser={message.isA}
                              >{message.n}</strong
                            >
                            <span class="msg-time mr-1">{privateChatTime(message.t)}</span>
                          </div>
                          <div class="msg-left text-formated preText ml-2 mr-2 p-0">
                            {@render bodySegmentsPrivate(message.txt)}
                          </div>
                        </div>
                      </app-st-compactmessage>
                    {/each}
                  </div>
                </app-privchatscroller>
                <!--
                  `#textAreaTxtPM`. Enter sends, Shift+Enter and Alt+Enter insert a newline -
                  `onKey(e)` in the capture, which calls `preventDefault()` on 13 either way.
                -->
                <div class="d-flex align-items-center textSendDiv" id="textAreaHolderPM">
                  <textarea
                    id="textAreaTxtPM"
                    class="txt-area w-100"
                    rows="1"
                    placeholder="Type your message here.."
                    bind:value={privateChatDraft}
                    onkeydown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      if (event.shiftKey || event.altKey) {
                        privateChatDraft += '\n';
                        return;
                      }
                      void sendPrivateMessage();
                    }}
                  ></textarea>
                </div>
              {/if}
            </div>
          {:else}
            <div class="flex-fill p-3 text-center">No active chat</div>
          {/if}
        </div>
      </div>
    </app-privchat>
  </app-room>
  <audio
    {@attach setWebcamAudioAttributes}
    {...{
      autoplay: 'autoplay',
      hidden: 'true'
    } as Record<string, string>}
    id="webcam"
  ></audio>
</app-root>
