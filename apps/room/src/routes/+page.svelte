<script lang="ts">
  import { deserialize } from '$app/forms';
  import {
    chatComposerEnabled,
    isChatMode,
    isWebinarMode,
    webinarMessageVisible,
    type ChatMode
  } from '$lib/chat-mode';
  import {
    CHAT_PAGE_ARRIVAL_NUDGE,
    CHAT_PAGE_REQUEST_NUDGE,
    mergeOlderChatMessages,
    shouldLoadOlderMessages
  } from '$lib/chat-paging';
  import { stripHtmlToText } from '$lib/chat-plain-text';
  import { toggleReaction } from '$lib/reaction-toggle';
  import { RoomMenus } from '$lib/room/menus.svelte';
  import { RoomPolls } from '$lib/room/polls.svelte';
  import { chooseRecordingOptions } from '$lib/recording-codec';
  import { page } from '$app/state';
  import { panelDragResize, readPanelBounds } from '$lib/panel-drag';
  import { invalidate, invalidateAll } from '$app/navigation';
  // The first remote function in this app. Aliased because the local wrapper below keeps the name.
  import { unmuteChat as unmuteChatCommand } from './chat-mute.remote';
  import { getMyMobilePin } from './mobile-pin.remote';
  import {
    loadOlderAlerts as loadOlderAlertsPage,
    loadOlderChatMessages as loadOlderChatPage
  } from './log-pages.remote';
  import {
    deletePrivateChatLog as deletePrivateChatLogCommand,
    loadPrivateChatLog as loadPrivateChatLogCommand,
    sendPrivateMessage as sendPrivateMessageCommand
  } from './private-chat.remote';
  import { focusOnScreen, presenterCommand } from './presenter-commands.remote';
  import { videoForAll, youtubeForAll } from './for-all-broadcast.remote';
  import { recordingState } from './recording-state.remote';
  import { changeChatMode as changeChatModeCommand } from './chat-mode.remote';
  import {
    deleteFile as deleteFileCommand,
    fileMediaCommand,
    overwriteCashRegisterSound
  } from './files-pane.remote';
  import { uploadComposerImage } from './composer-image.remote';
  import { savePreference as savePreferenceCommand, saveTheme } from './user-settings.remote';
  import { editUsername } from './username.remote';
  import { replyMessage, sendMessage as sendMessageCommand } from './chat-messages.remote';
  import { askQuestion } from './alert-questions.remote';
  import { postAlert as postAlertCommand } from './post-alert.remote';
  import { messageAction } from './message-actions.remote';
  import { isHttpError } from '@sveltejs/kit';
  import {
    PUBLIC_PTR_CDN_UPLOAD_KEY,
    PUBLIC_PTR_GIPHY_API_KEY,
    PUBLIC_PTR_TAWK_PROPERTY_ID,
    PUBLIC_PTR_UPLOAD_SERVER
  } from '$app/env/public';
  import { onMount, tick, untrack } from 'svelte';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import BootboxDialog from '$lib/components/BootboxDialog.svelte';
  import { type ScreenTab } from '$lib/components/ScreenTabs.svelte';
  import { SignallingClient, legacyUserId, type ProducerInfo } from '$lib/media/signalling';
  import { MediaSession } from '$lib/media/session';
  import { startSpeechRecognition } from '$lib/media/speech-reco';
  import { isMtxStream } from '$lib/mtx-streams';
  import { MISSING_SCHEME_ALERT, addVideoToList, isAcceptableSendUrl, userActionAlert } from '$lib/user-action-intent';
  import {
    captureErrorMessage,
    captureErrorName,
    checkPermissionState,
    mediaCaptureErrorMessage,
    permissionForCapture,
    type MediaCaptureKind
  } from '$lib/media-capture-error';
  import { MtxStreamTabs } from '$lib/room-mtx.svelte';
  import {
    INITIAL_ZOOM_LEVEL,
    zoomIn,
    zoomOut,
    type Pan
  } from '$lib/screen-zoom';
  import ScreenVolumeControl from '$lib/components/ScreenVolumeControl.svelte';
  import {
    archivesAvailableTo,
    rosterBlockVisible,
    rosterCountVisibleTo,
    rosterRowClass,
    rosterRowVisible,
    formatUserLocation,
    joinsMediaAsProducer,
    locationVisibleTo
  } from '$lib/roster-gates';
  import { RoomRoster } from '$lib/room/roster.svelte';
  import { RoomAlerts } from '$lib/room/alerts.svelte';
  import { ALERTS_LOG, RoomLogPages } from '$lib/room/log-pages.svelte';
  import { RoomArrivals, RoomOrderedArrivals } from '$lib/room/arrivals';
  import { RoomScrollFollow } from '$lib/room/scroll-follow';
  import { RoomDialogs } from '$lib/room/dialogs.svelte';
  import { RoomPrefs } from '$lib/room/prefs.svelte';
  import { RoomVolume } from '$lib/room/volume.svelte';
  import { RoomBroadcasts } from '$lib/room/broadcasts.svelte';
  import { RoomToasts } from '$lib/room/toasts.svelte';
  import { RoomFiles } from '$lib/room/files.svelte';
  import {
    DAY_TRADE_ALERT_FEED,
    type DayTradeAlertAction,
    SWING_ALERT_FEED,
    type SwingAlertAction,
    RoomTradeAlerts
  } from '$lib/room/trade-alerts.svelte';
  import type { RoomMessageChrome } from '$lib/room-message-chrome';
  import { EXTRA_COMPOSER, RoomChat } from '$lib/room/chat.svelte';
  import { RoomMedia } from '$lib/room/media.svelte';
  import {
    MUTE_ALL_CONFIRM,
    MUTE_STAGGER_MS,
    nonAdminTalkingUsers
  } from '$lib/mute-all-non-admins';
  import { tawkAttributes, tawkScript, tawkSupportAvailable } from '$lib/tawk-support';
  import {
    RoomSplit,
    isRoomSplitDir,
    splitPairFromValue,
    splitStorageKeys
  } from '$lib/room/split.svelte';
  import {
    pushToTalkShouldMute,
    pushToTalkShouldUnmute,
    shouldBlockContextMenu,
    shouldBlockCopyKey,
    shouldDisableSelection
  } from '$lib/room-key-gates';
  import AlertChatArea from '$lib/components/AlertChatArea.svelte';
  import PresentationArea from '$lib/components/PresentationArea.svelte';
  import ExtraChatPane from '$lib/components/ExtraChatPane.svelte';
  import GifConfirmDialog from '$lib/components/GifConfirmDialog.svelte';
  import ImageUploadDialog from '$lib/components/ImageUploadDialog.svelte';
  import ModalHost from '$lib/components/ModalHost.svelte';
  import { resolveNoteSurfaceGates } from '$lib/components/notes/note-gates';
  import { swingAlertsTabVisible } from '$lib/swing-alerts';
  import type { SwingAlertRow } from '$lib/types';
  import { parseAlertLabels } from '$lib/alert-labels';
  import { alertFilterAvailable, alertPassesFilter, type AlertFilterFor } from '$lib/alert-filter';
  import { dayTradeAlertsTabVisible } from '$lib/day-trade-alerts';
  import type { DayTradeAlertRow } from '$lib/types';
  import type { MessageBadge } from '$lib/types';
  import { isMentionOf } from '$lib/mention';
  import { trimChatLog } from '$lib/room-scroller';
  import PrivateChatPanel from '$lib/components/PrivateChatPanel.svelte';
  import {
    NO_SPEAKER_TEXT,
    SHARE_SCREEN_TEXT,
    STOP_SHARING_ALL_TEXT,
    VIRTUAL_CAM_TEXT
  } from '$lib/navbar-labels';
  import RoomNavbar from '$lib/components/RoomNavbar.svelte';
  import RoomSidebar from '$lib/components/RoomSidebar.svelte';
  import ToastHost from '$lib/components/ToastHost.svelte';
  import { resolveAlertDelivery } from '$lib/alert-delivery';
  import { DUMP_CONTRACT } from '$lib/dump-contract';
  import {
    composePastedImageAlert,
    composeUploadedAlert,
    postOnXIntent,
    type PastedImageSubmission,
    type PostAlertSubmission
  } from '$lib/post-alert-behavior';
  // `shouldAutoScrollForMessage` is no longer imported here: `RoomScrollFollow` calls it, which is
  // where the rule about the alerts column not taking the override now lives with it.
  import { isRoomScrollerReadingHistory, scrollRoomScrollerToBottom } from '$lib/room-scroller';
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
  import type {
    AlertTab,
    ChatTab,
    MessageAction,
    FollowChatStyle,
    MainTab,
    ManagedChatUser,
    MessageActionItem,
    MessageReactionPayload,
    MessageReactions,
    ModalName,
    ModalTargetUser,
    NoteVersion,
    SettingsTab,
    Theme,
    WebcamPresenter
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



  type SessionControlTab =
    | 'reset-session'
    | 'close-session'
    | 'lock-session'
    | 'av-device-selection'
    | 'streaming-selection'
    | 'session-history'
    | 'webinar-tools';

  let { data }: PageProps = $props();

  /*
    Every preference this viewer owns, in `$lib/room/prefs.svelte.ts`.

    Twenty-seven of them were declared across eleven hundred lines of this file, and the function
    that writes them sat two thousand lines below the values it assigned. TWENTY-FIVE now have no
    public setter at all: before this, any code here could write `chatGif = true` and the
    preference would change on screen and never reach the server, because persistence lived in a
    function nobody was obliged to call. The only way in is `prefs.save`.

    The two that keep a setter are the two the room writes WITHOUT persisting, both transient by the
    reference's own design — `doNotDisturbOn` (the private-chat toolbar's `setDND` calls no
    `setPreference`, unlike every neighbouring handler) and `subtitles` (`setMasterVolume`
    forces it on at zero volume).

    `persist` is injected rather than imported, which keeps a route-level remote function out of
    `$lib` and lets the write path be tested without mocking the wire.
  */
  // The server settings are the intentional one-time seed for editable client preference state.
  // svelte-ignore state_referenced_locally
  const prefs = new RoomPrefs(data.settings?.settingsJson, {
    persist: (key, value) => {
      // The value goes as a VALUE — devalue carries it, and `z.json()` is the schema for what the
      // settings blob can hold. It used to be stringified for the wire and parsed back in a `try`.
      void savePreferenceCommand({
        key,
        value: value as Parameters<typeof savePreferenceCommand>[0]['value']
      }).catch((cause) => console.error('savePreference', key, cause));
    },
    /*
      The two branches of the write path that are NOT preferences, kept here with their reasoning.
      A preferences class that re-seeded the room's layout would have stopped having a boundary.
    */
    onSideEffect: (key, value) => {
          if (key === 'chatStyle' && value && typeof value === 'object' && !Array.isArray(value)) {
            globalChatStyle = {
              ...globalChatStyle,
              ...(value as Partial<FollowChatStyle>)
            };
          }
          /*
            Applies the sizes the server rendered with, alongside the new direction. Each arrangement has
            its own pair of preference keys, so this brings back the geometry last chosen for THAT
            arrangement rather than reinterpreting a width as a height. Only reached on a deliberate user
            action, never on a page load.
          */
          if (key === 'roomSplitDir' && isRoomSplitDir(value)) {
            split.setDirection(value, settingsSplitPair);
          }
    }
  });

  /*
    Every volume in the room, in `$lib/room/volume.svelte.ts`.

    The first class to take another as a dependency: `mute()` and `unmute()` set
    `preferences.doNotDisturbOn` in the reference itself, so the coupling is captured behaviour
    rather than one invented here, and the per-presenter pair persists through `prefs.save`.

    `soundCloudPlaying` is a THUNK: it belongs to `RoomMedia` and changes while this is alive, so
    a value copied at construction would leave the widget at the level the room loaded with.
  */
  const roomVolume = new RoomVolume({
    prefs,
    soundCloudPlaying: () => media.soundCloudPlaying
  });


  let sidebarOpen = $state(false);
  let mobileNavOpen = $state(false);
  // `new-evidence/presenter-tab` captures the bar as rendered: `screens-tab` carries
  // `class="nav-link active"` with `aria-selected="true"`, and `notes-tab` carries
  // `class="nav-link presAreaTabs-notes"` with `aria-selected="false"`. The room opens on Screens.
  let mainTab: MainTab = $state('screens');

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
   * The MediaMTX stream list and its selected tab, owned by `room-mtx.svelte.ts`.
   *
   * The reasoning that used to live here — why `$state.raw`, why this list must never be merged
   * with `sharedScreens`, and why it is a class rather than exported state — moved WITH the code
   * rather than being left behind as a comment about something that is no longer in this file.
   */
  const mtx = new MtxStreamTabs();

  /*
    `this.hideStreams = !this.appService.globals.sessData.useMediaMTX`
    (`app-presentationarea.full.js:2293`), applied to BOTH the `#streams-tab` `li` (`:5357`) and the
    `#streams` pane (`:5388-5391`) — the same value, twice, so the tab and its content can never
    disagree.

    Note the NEGATION and the default that falls out of it. The setting says the feature is ON; the
    flag says the tab is HIDDEN. A room with no MediaMTX sends no `useMediaMTX` at all, `!undefined`
    is true, and the tab stays hidden — which is right, and is why this is not written as an
    `=== false` check.
  */
  const hideStreams = $derived(!data.sessData.useMediaMTX);

  /*
    The playback credential, from `/internal/stream-read/{code}` at load time.

    Empty strings when the room has no media server, when the controller refused, or when it could
    not be reached. `StreamingView` is only ever rendered from inside the `#streams` pane, which
    `hideStreams` already keeps out of rooms without MediaMTX, so an empty pair here means a room
    that HAS MediaMTX but whose viewer has no token — an honest gap, not a URL built from blanks.
  */
  const streamServerMTX = $derived(data.streamRead?.streamServerMTX ?? '');
  const mtxToken = $derived(data.streamRead?.mtxToken ?? '');

  /**
   * A stream tab the USER clicked — the counterpart of `selectScreenTabByUser`, and deliberately
   * NOT the same function.
   *
   * `onStreamTabChange(e)` is two assignments and nothing else (`:2722-2725`). It does not emit the
   * `stopWatchScreenOf` / `startWatchScreenOf` pair that `onScreenShareTabChange` does, because
   * every stream pane stays mounted and only its classes change. It also does not broadcast: the
   * `prefs.makeUsersFollowMyScreens` clause lives on the SCREENSHARE path alone.
   */
  function selectStreamTabByUser(streamId: string) {
    mtx.selectByUser(streamId);
  }

  /**
   * "Bring everyone here" on a STREAM tab. It sends, and that is genuinely all it does.
   *
   * Upstream this is `bringFocusToScreen(e)` — the very same method the screenshare menu calls
   * (`:2727`) — so the command that goes out is `focusOnScreen` carrying the stream's `_id`. What
   * makes it a no-op is the RECEIVER: every client resolves that id against
   * `mediaService.screenSharingUsers` only (bundle byte 1962380) and never against the MTX stream
   * list, so a stream id matches nothing anywhere.
   *
   * Reproduced rather than repaired. Our own receiver already behaves identically — it calls
   * `selectScreenTabOfId`, which searches `sharedScreens` — so the inertness here is emergent from
   * the same cause rather than hand-coded, and it will start working by itself if the reference
   * ever teaches its receiver about streams.
   *
   * What it must NOT do is what `bringEveryoneToScreen` does: that one assigns `selectedScreenTab`
   * and `forcedScreenId` locally first, and pointing either at a STREAM id would select a
   * screenshare tab that does not exist.
   */
  function bringEveryoneToStream(streamId: string) {
    if (!isPresenter) return;
    void focusOnScreen(streamId).catch((cause) => console.error('[focusOnScreen]', cause));
  }

  /**
   * "Lock Screen" on a stream tab. Upstream: `toggleLockScreenMTX(e) { console.error('TODO:
   * toggleLockScreenMTX') }` (`:3056-3058`) — an unimplemented stub beside a working
   * `toggleLockScreen` for screenshares.
   *
   * There is no wire command, no globals write and no server half anywhere in the bundle to
   * transcribe, and `globals.lockedScreenIDMTX` has no writer at all. So this reports the same
   * thing the reference reports and changes nothing, rather than inventing a lock protocol whose
   * only author would be me. `stream-tabs-contract.test.ts` fails if the stub ever gains a body.
   */
  function toggleLockStreamMtx(streamId: string) {
    console.error('TODO: toggleLockScreenMTX', streamId);
  }
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
   * return isPresenter && !media.limitedPresenter
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
  /*
    Who is in the room, in `$lib/room/roster.svelte.ts`.

    The fourth room state class: the live roster, the four header controls that sort and search it,
    the badge count and the random-user draw. The two transcribed pipes and the four gates stay in
    `$lib/roster-gates`, where their truth tables are; this class holds the state they run on.

    Two thunks rather than a snapshot, which is the shape `$state`'s "passing state into functions"
    documents: `data` is a `$props()` value, so passing `data.connectedUsers` would hand over the
    ARRAY and the class would still be showing it after a navigation replaced it. Reading a thunk
    inside a `$derived` tracks whatever it touches.
  */
  // Typed off the load's own entry rather than re-listed, so the stream and the page load cannot
  // drift into two different shapes for the same person.
  type RosterEntry = (typeof data.connectedUsers)[number];
  const roster = new RoomRoster<RosterEntry>({
    seed: () => data.connectedUsers,
    simUserCount: () => data.sessData?.simUserCount ?? 0
  });

  /** `doUserSearch(e){ 13 == e.keyCode && (this.userSearchTermTxt ? this.searchUsers() : this.clearUserSearch()) }` */
  function doUserSearch(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    roster.submitSearch();
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
      dialogs.alert =
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
    if (isPresenter && prefs.makeUsersFollowMyScreens) bringEveryoneToScreen(screenId);
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
    void focusOnScreen(screenId).catch((cause) => console.error('[focusOnScreen]', cause));
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
  /*
    The two chat columns, in `$lib/room/chat.svelte.ts`.

    Which channel each shows, what is typed in each, which one the viewer last touched, and the
    mention routing that reads three of those at once. They were declared 650 lines apart and the
    thing binding them — `prefs.extraChatColumn && (fromExtraColumn || chat.focus === 'textAreaTxtExtra')`
    — was not visible from any one of them.

    `prefs.extraChatColumn` stays a page preference and is passed as a THUNK: it is one of fifteen booleans
    seeded from the settings snapshot and written through one `savePreference`, and a copy would be
    the value as of construction, so turning the second column on mid-session would leave every
    mention routing to the main composer.
  */
  const chat = new RoomChat({ extraColumnEnabled: () => prefs.extraChatColumn });
  // The page data is the intentional one-time seed for client-managed theme state.
  // svelte-ignore state_referenced_locally
  let theme: Theme = $state(data.settings?.theme === 'dark' ? 'dark' : 'light');

  /**
   * `globals.videoDeviceID` - the camera chosen in AV settings, which both camera paths pass as
   * `deviceId: {ideal: ...}`. The modal already saves it (`onPreferenceChange('videoDeviceID', ...)`);
   * nothing read it back, so the choice was written and then ignored.
   *
   * `ideal`, never `exact`: a camera that has been unplugged since it was chosen must fall back to
   * another one rather than reject the whole call.
   */
  const selectedVideoDeviceId = $derived(
    typeof prefs.loaded.videoDeviceID === 'string' && prefs.loaded.videoDeviceID
      ? prefs.loaded.videoDeviceID
      : undefined
  );

  
  
  
  
  
  
  /**
   * `preferences.alwaysScrollToBottom` — the chat's "always scroll to bottom" override.
   *
   * `=== true`, not `!== false`, and the difference is the reference's own default: the preferences
   * blob ships `prefs.alwaysScrollToBottom:!1` (`main.d6d3c112b59b7d0d.js` byte 979602). Seeding it ON for
   * anyone who has never touched the checkbox would drag a reader out of the history they are
   * scrolled up into — the opposite of the mistake made with `showSpeechRecoOverlay`, where
   * `=== true` wrongly disabled a feature that defaults ON. The default decides which comparison is
   * correct; neither is a house style.
   *
   * PERSISTED, unlike `saveData`: `chatAlwaysScrollToBottomChange` calls
   * `setPreference('prefs.alwaysScrollToBottom', …)` (byte 2246247).
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
   * `=== true` — the blob ships `prefs.makeUsersFollowMyScreens:!1` (byte 980006). A presenter who has
   * never touched it should not be dragging the room around by clicking their own tabs.
   */
  /**
   * `preferences.chatGif` — whether inline gifs play or show a click-to-reveal placeholder.
   *
   * `!== false`, because the blob ships `prefs.chatGif:!0`. A viewer who has never touched the checkbox
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
   * Which chat messages are new since the popup last looked.
   *
   * `RoomOrderedArrivals`, not `RoomArrivals` — it marks a POSITION and re-seeds silently when the
   * marker has been trimmed away, and its `Row` is constrained to `{ id: unknown }` so the id stays
   * the opaque key `id-opacity-contract.test.ts` requires. The reasoning lives with the class.
   */
  const mentionArrivals = new RoomOrderedArrivals<(typeof data.messages)[number]>();
  
  
  
  
  
  
  

  
  /**
   * The extra chat column's scroll container, and the three trackers its autoscroll needs.
   *
   * `onscrollerready` wrote this element in and NOTHING read it until 2026-08-14, so the second
   * chat column never followed a new message while the first one did — a message arrived, the
   * column stayed where it was, and the reader saw nothing. ESLint is what surfaced it, as an
   * "assigned but never used" that turned out to be a missing feature.
   *
   * The effect below is a deliberate parallel of the main chat's, not a new design: same four
   * conditions (first view, channel switch, new message, and the reader's own scroll position via
   * `shouldAutoScrollForMessage`), same `tick()` before measuring, and the same identity re-check
   * afterwards so a scroller swapped out mid-await is not written to.
   */
  let extraChatScroller = $state<HTMLElement | undefined>();
  let extraChatScrollingUp = false;

  
  let appHasFocus = $state(true);
  /** Set while hidden, so the catch-up only runs when something was actually missed. */
  let missedChatWhileHidden = false;

  /**
   * `visibilitychange` — `globals.appHasFocus`, and the catch-up on the way back.
   *
   * NO LONGER AN EFFECT. `svelte/best-practices` names this case by itself: *"If you need to attach
   * listeners to `window` or `document` you can use `<svelte:window>` and `<svelte:document>` …
   * Avoid using `onMount` or `$effect` for this."* The handler is bound on `<svelte:document>` at
   * the bottom of this file and Svelte owns the add and the remove, so the twelve lines of manual
   * `addEventListener` / teardown are gone with them.
   *
   * The comment that used to sit here weighed `{@attach}` and kept the effect, on the grounds that
   * the listener must exist whether or not an element is mounted. That was true of an attachment
   * and irrelevant to an event ATTRIBUTE: `<svelte:document>` is present for the component's whole
   * lifetime, which is exactly as long as the listener should be.
   *
   * The catch-up fires ONCE rather than replaying what was missed, because the load already returns
   * the newest page per channel — the room re-reads itself and is current, which is what upstream's
   * `appHasFocusGetChatLog` does.
   */
  /*
    The five-second refresh poll, hoisted here from `onMount` so ONE handler owns visibility.

    Nothing is pushed from the server for a reader's question, alert or chat message, so a presenter
    sat on a stale tab saw an empty Q&A while the row was already stored. This re-fetches on a
    timer, and only while the tab is visible, so a backgrounded room is not polling. `invalidate`
    re-runs the load and patches the data; it is not a navigation, so scroll positions and open
    modals are left alone.

    Plain `let`/`function`, not `$state`: nothing renders from a timer handle.
  */
  const REFRESH_MS = 5000;
  let refreshTimer: ReturnType<typeof globalThis.setInterval> | undefined;

  /**
   * A poll that loses the network must not become an unhandled rejection.
   *
   * `void invalidate(...)` discards the promise without a handler, so a single dropped request — a
   * dev-server restart, a laptop waking up — surfaced as an uncaught error in the console with a
   * stack trace pointing here, and looked like a fault in the room rather than one skipped refresh.
   * The next tick retries anyway; that is what a poll is for.
   */
  function refreshRoom() {
    void invalidate('room:data').catch((error: unknown) => {
      console.warn('[room] a refresh was skipped; the next one will retry', error);
    });
  }

  function startRefresh() {
    if (refreshTimer !== undefined) return;
    refreshTimer = globalThis.setInterval(() => refreshRoom(), REFRESH_MS);
  }

  function stopRefresh() {
    if (refreshTimer !== undefined) globalThis.clearInterval(refreshTimer);
    refreshTimer = undefined;
  }

  function onVisibilityChange() {
    if (document.hidden) {
      appHasFocus = false;
      stopRefresh();
      return;
    }
    appHasFocus = true;
    startRefresh();
    /*
      The catch-up and the poll's own immediate refresh are the SAME request, so only one goes out.

      `missedChatWhileHidden` is set while hidden; when it is set this is a catch-up and
      `invalidateAll()` is the wider re-read. When it is not, the tab was never away long enough to
      miss anything and `refreshRoom()` — the poll's `invalidate('room:data')` — is all that is
      owed. Firing both would double every return to the tab.
    */
    if (!missedChatWhileHidden) {
      refreshRoom();
      return;
    }
    missedChatWhileHidden = false;
    void invalidateAll();
  }

  

  /**
   * The ROOM's media.recording state - `globals.roomState.isRecording` / `isRecordingPaused` / `recName`.
   *
   * Distinct from `media.recording`, which is this browser's own `MediaRecorder`. The `[ REC ]` badge is
   * a report about the room, so it must follow what the server says; gating it on the local flag is
   * why a member never saw it.
   */
  /*
    The room's media STATE, in `$lib/room/media.svelte.ts`.

    Every flag the interface renders from — mic, camera, screen, this browser's media.recording and the
    ROOM's, who has a microphone open, and whether this member has been handed limited-presenter
    status. Not the transport: the `MediaStream`s, the `MediaRecorder`, the producer ids and the
    preview window stay as plain `let`s below, because nothing renders from a handle and a class
    that owned one would have gained an abstraction over the browser rather than an owner for state.

    `media.talking` and `media.limitedPresenter` were both filed under `RoomRoster` in the phase plan and
    both refused there. They arrive here because this is where their writers are.
  */
  const media = new RoomMedia();

  /**
   * `'Recording to: ' + decodedRecName()`, suppressed for non-presenters when the session says so.
   *
   * `dontShowRecInfoToUsers` is not captured in our session data, so it is read defensively and
   * treated as off when absent - the capture's default is to SHOW the name.
   */
  const recordingTooltip = $derived.by(() => {
    const hideFromUsers = prefs.loaded.dontShowRecInfoToUsers === true;
    if ((hideFromUsers && !isPresenter) || !media.roomRecordingName) return '';
    return `Recording to: ${decodeURIComponent(media.roomRecordingName)}`;
  });

  
  
  
  
  const loadedChatStyle =
    prefs.loaded.chatStyle &&
    typeof prefs.loaded.chatStyle === 'object' &&
    !Array.isArray(prefs.loaded.chatStyle)
      ? (prefs.loaded.chatStyle as Partial<FollowChatStyle>)
      : {};
  const loadedRoomSplitDir = isRoomSplitDir(prefs.loaded.roomSplitDir)
    ? prefs.loaded.roomSplitDir
    : 'ltr';
  // svelte-ignore state_referenced_locally
  let globalChatStyle = $state<FollowChatStyle>({
    ...defaultChatStyleForTheme(theme),
    ...loadedChatStyle
  });
  /*
    The room's two nested splits, in `$lib/room/split.svelte.ts`.

    The third room state class, and the largest so far: seven pieces of reactive state, five plain
    ones and twenty derived values that were spread from the seed here to the drag handlers 5,500
    lines below. The persisted layout is the intentional one-time seed; `settingsSplitPair` is a
    hoisted function declaration, so passing it as the reader at this point in the file is fine.

    A `const` that is never reassigned, for the reason `RoomPolls` records: `svelte/context` warns
    that reassigning a shared value breaks the link for everything reading it downstream.
  */
  const split = new RoomSplit(loadedRoomSplitDir, settingsSplitPair);
  let modal: ModalName = $state(null);
  /*
    The poll modal's four fields, in `$lib/room/polls.svelte.ts`.

    The first of the room state classes. A class rather than four `let`s because that is the only
    shape reactive state can leave a component in — `svelte/svelte-js-files` says reassigned state
    cannot be exported from a `.svelte.ts` module, so the reactive box lives behind `this` and every
    reader goes through a getter.

    The instance is a `const` and is never reassigned. `svelte/context` warns that reassigning
    breaks the link for anything reading it downstream, and this becomes a context value in the
    component extraction that follows.

    It owns the poll fields and the decisions between them; it does NOT own `modal`, which belongs
    to the room's layout and is written by a dozen unrelated controls. So its methods RETURN whether
    the modal should open and this file performs the write.
  */
  const polls = new RoomPolls();
  let settingsTab: SettingsTab = $state('app');
  let alertTab: AlertTab = $state('text');
  let sessionControlInitialTab = $state<SessionControlTab>('reset-session');
  // The captured alerts toolbar (alert-section/datach-alerts-1) is a strip between the alerts
  // header and the scroller. It is absent from the default capture (alert-section/1.html states
  // "No alertsToolbar search strip in this snapshot"), so it is toggled, not permanent.
  /*
    The alerts pane's own state, in `$lib/room/alerts.svelte.ts`: the two-state toolbar, this
    viewer's Alert Filter, the archive cut-off and the search term — with the citations for each.

    The fifth room state class. It deliberately does NOT own `visibleAlerts` / `searchableAlerts`,
    which thread `data.alerts` through evidence rules and the unread-Q&A set, nor the alerts PAGING,
    which is the same code as the chat log's because upstream renders one roomlog component for
    both. What moved is the state and every predicate built on it — the page's filter chain now
    reads as named filters instead of five inline closures that each restated the filter's two
    halves.
  */
  const alerts = new RoomAlerts({
    // The stored settings are the intentional one-time seed for editable client preference state.
    alertFilterFor: RoomAlerts.readFilterFor(prefs.loaded.alertFilterFor),
    showAlertsFrom: prefs.loaded.showAlertsFrom === true,
    archivedAt:
      typeof prefs.loaded.alertsArchivedAt === 'number' ? prefs.loaded.alertsArchivedAt : null
  });
  let alertsDetachedWindow: Window | null = null;
  /*
    The eleven floating menus, in `$lib/room/menus.svelte.ts`.

    They were eleven separate flags closed by TWO functions with two different lists — `openModal`
    left the top-bar dropdowns open, `closeFloatingMenus` left the emoji and GIF pickers open. Both
    behaviours are preserved exactly and are now named `closeForModal` and `closeFloating`, so the
    difference is a decision somebody can read rather than a divergence nobody can see.
  */
  const menus = new RoomMenus();
  let newNoteOpen = $state(false);
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
  /*
    The room's three bootbox dialogs, in `$lib/room/dialogs.svelte.ts`.

    Three fields and not one discriminated union, because they STACK: a prompt's `onconfirm` raises
    an alert, a confirm's handler raises an alert on failure, and the Escape handler at the bottom
    of this file reads all three in a fixed precedence for that reason. One field would let the
    second silently replace the first.

    Settable properties rather than `raise*` methods, so the forty-odd `dialogs.alert = '…'` sites
    stay assignments to state instead of becoming forty rewritten expressions.
  */
  const dialogs = new RoomDialogs();

  /*
    Everything a presenter plays for the WHOLE ROOM, in `$lib/room/broadcasts.svelte.ts`.

    The three commands are one shape: a button, a server command, and every browser reacting to what
    comes back on the `cmds` channel. The dispatch below calls RECEIVERS rather than assigning the
    fields, because stopping a video must also clear its armed timer and blank its schedule — three
    writes that a caller holding setters could do one of.

    The commands are injected rather than imported so the class needs no route import and its
    refusal paths can be tested without the wire.
  */
  const broadcasts = new RoomBroadcasts({
    dialogs,
    commands: {
      video: (payload) => videoForAll(payload),
      youtube: (payload) => youtubeForAll(payload),
      fileMedia: (payload) => fileMediaCommand(payload)
    }
  });
  /*
    The file drive, in `$lib/room/files.svelte.ts`.

    The slice with the clearest payoff beyond its own line count. Fifteen of these props were handed
    to `PresentationArea`, which passed the same fifteen straight through to `FilesPane` while
    reading only `filesHidden` itself — so one object removes thirty prop declarations, not fifteen.

    `files` and `sessData` go in as THUNKS rather than as values. `data` is a `$props()` value, so
    handing over `data.files` would hand over THAT array and the pane would still be showing it
    after a navigation replaced it; a thunk read inside the class tracks whatever it touches. This
    is the shape `$state`'s "passing state into functions" section documents, and `RoomRoster`
    already uses it.

    The two commands are injected for the reason `RoomBroadcasts` records: the class needs no route
    import and its refusal paths can be tested without the wire. Neither is an authority — both
    `deleteFile` and `overwriteCashRegisterSound` re-check `presenterRoom()` on the server, so what
    moved here is which button is drawn, never who may press it.

    The two invalidations are injected for the same reason and are deliberately NOT the same call:
    a delete re-reads the whole page, while setting the alert sound only needs the room's settings
    back. Collapsing them would make every "Set as alert sound" click re-run every load function.
  */
  const files = new RoomFiles({
    dialogs,
    files: () => data.files,
    sessData: () => data.sessData ?? {},
    commands: {
      deleteFile: (payload) => deleteFileCommand(payload),
      setAlertSound: (payload) => overwriteCashRegisterSound(payload)
    },
    onFilesChanged: () => invalidateAll(),
    onRoomDataChanged: () => invalidate('room:data')
  });
  /*
    The two trade alert feeds, in `$lib/room/trade-alerts.svelte.ts` — ONE class, two instances.

    Phase 5 slice 15, and the slice that removes a duplicate rather than moving one. The swing half
    and the day trade half were fourteen declarations each, in the same order, and folding the day
    trade vocabulary onto the swing one left NINE of the fourteen pairs byte-identical. Of the five
    that differed, four differed only in prose. The only code difference in 297 lines was the
    endpoint and the failure sentence, which is why `TradeAlertFeed` has four members.

    The log goes in as a ONE-TIME SEED rather than a thunk, which is the opposite of `RoomFiles`
    two constructions above and is deliberate: the load always answers one fixed window, so a value
    that kept following `data` would throw away the presenter's chosen months window on the next
    `invalidateAll()`. The entitlement IS a thunk, so a mid-session configuration re-read reaches
    the tab.
  */
  // The page data is the intentional ONE-TIME seed; every later value comes from the feed's own
  // refetch, which is what keeps the presenter's chosen months window across an `invalidateAll()`.
  // svelte-ignore state_referenced_locally
  const swingAlerts = new RoomTradeAlerts<SwingAlertRow, SwingAlertAction>({
    dialogs,
    feed: SWING_ALERT_FEED,
    seed: data.swingAlerts,
    enabled: () => swingAlertsTabVisible(data.sessData ?? {}),
    uploadImages: (files) => uploadAlertFiles(files)
  });
  // The same one-time seed, for the same reason.
  // svelte-ignore state_referenced_locally
  const dayTradeAlerts = new RoomTradeAlerts<DayTradeAlertRow, DayTradeAlertAction>({
    dialogs,
    feed: DAY_TRADE_ALERT_FEED,
    seed: data.dayTradeAlerts,
    enabled: () => dayTradeAlertsTabVisible(data.sessData ?? {}),
    uploadImages: (files) => uploadAlertFiles(files)
  });
  /*
    The room's toast queue, in `$lib/room/toasts.svelte.ts`.

    The first slice of the phase that moves BEHAVIOUR out of this file rather than declarations —
    the queue, its timers, the duplicate guard and the browser notification left together, because
    a class holding `toasts` while this file held every function that writes it is what Phase 1
    produced eight times and is why it only moved 584 lines.

    It owns the MECHANISM and deliberately not the policy: `deliverAlert` and `deliverQaNotice`
    below decide who is told and with which sound, reading six preferences that still live in this
    file, so they stay here until those do.

    A `const` that is never reassigned, for the reason `RoomPolls` records: reassigning a shared
    reactive value breaks the link for everything reading it downstream.
  */
  const toasts = new RoomToasts();
  let tweetWindow: Window | null = null;
  let privateChatOpen = $state(false);
  // The private-chat gear is a toolbar toggle, not a dropdown: `<li class="nav-item dropdown"
  // (click)="togglePMToolbar()">`, with the toolbar rendered as a sibling of the nav inside
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
  let showMessageOptions = $state(false);
  let sendingGif = $state(false);
  let pendingGifUrl = $state<string | null>(null);
  
  
  
  
  
  
  
  
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
   * - `videoOnlyMode` is the `r` query parameter, the media.recording-bot mode — the same gap
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
   * Closed captions.
   *
   * `prefs.subtitles` above is the navbar's `presentation-prefs.subtitles` checkbox, already wired to the
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
   * was permanently false - `{#if media.anyoneTalking && media.talking.length > 0}` could never be
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

  /** The separate window the preview lives in - the capture's `reopenRecPreviewWindow` target. */
  let recPreviewWindow: Window | null = null;
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

  
  let mainElement: HTMLElement | undefined;
  let alertChatElement: HTMLElement | undefined;
  let composerElement: HTMLTextAreaElement | undefined;
  let alertsScroller = $state<HTMLElement | undefined>();
  let chatScroller = $state<HTMLElement | undefined>();
  let alertsScrollingUp = false;
  let chatScrollingUp = false;
  /*
    ONE INSTANCE PER COLUMN, and that is the whole point rather than an implementation detail: the
    three columns have independent tabs, independent lists and independent reader scroll positions,
    so a shared set of markers would let traffic in one column yank a reader out of another.

    The two chat columns take the viewer's `prefs.alwaysScrollToBottom` override; the alerts column is
    constructed WITHOUT one, because `shouldAutoScrollForMessage` records that the alerts scroller
    shares the function and must not take it. Here that rule is structural — there is no argument to
    forget.

    A thunk, not a value, so the preference is read when a scroll is decided rather than captured at
    construction and stale for the rest of the session.
  */
  const alertsFollow = new RoomScrollFollow();
  const chatFollow = new RoomScrollFollow<ChatTab>({
    alwaysScrollToBottom: () => prefs.alwaysScrollToBottom
  });
  const extraChatFollow = new RoomScrollFollow<ChatTab>({
    alwaysScrollToBottom: () => prefs.alwaysScrollToBottom
  });
  /**
   * Which alerts are NEW since the last load — see `RoomArrivals` for why the three lists that ask
   * this question share one implementation, and why it is a plain class rather than a rune module.
   */
  const alertArrivals = new RoomArrivals<(typeof data.alerts)[number]>();
  let alertScrollTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  let chatScrollTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  let mutedUsers = $state<Record<string, ManagedChatUser>>({});
  let followedUsers = $state<Record<string, ManagedChatUser>>({});
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
   * `prefs.extraChatColumn` has zero occurrences in this room — a pre-existing gap, not one opened here.
   *
   * `lastThresholdActedOn` is a PLAIN variable, not `$state`: nothing renders from it, and making it
   * reactive would put a write to a tracked value inside the effect that reads it. It starts `null`
   * to mean "never measured", which is how the first paint on a phone avoids a refetch it does not
   * need — upstream gets the same effect from `isMobileScreen = onResizeChange = …` in one
   * statement at init (`:1889`), so the two are equal before any resize can happen.
   */
  let lastThresholdActedOn: boolean | null = null;
  let resizeRefetchTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  const RESIZE_REFETCH_DELAY_MS = 500;

  $effect(() => {
    const mobile = split.isMobileScreen;
    if (split.viewportWidth === 0) return;
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

    STAYS AN EFFECT, deliberately, while the `visibilitychange` listener above became a
    `<svelte:document>` handler. The two look alike and are not: that one was a LISTENER, which the
    docs say belongs on the element; this one is direct DOM manipulation of a node no element in
    this component owns, which `$effect` documents as one of its legitimate uses — *"useful for
    things like analytics and direct DOM manipulation"*. There is no element to attach to, and
    `<svelte:body>` takes listeners rather than classes.
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
  function getRandomUser() {
    dialogs.confirmation = {
      message: 'Only select from Trials?',
      onconfirm: () => {
        dialogs.confirmation = null;
        roster.draw(true);
      },
      // `bootbox.confirm`'s callback receives false for No AND for a dismissal, and this call site
      // acts on it: the draw still runs, just without the trials filter.
      ondismiss: () => roster.draw(false)
    };
  }

  /**
   * The sidebar's gates. Every one is a transcription in `$lib/roster-gates`, tested there against
   * its truth table; this file only supplies the viewer and the session.
   */
  /*
    `isLimitedPresenter` moved to `RoomMedia` — it is written by `giveMicScreen`, which is a media
    command, and its full reasoning went with it. Read here because the gates need it.
  */
  const rosterViewer = $derived({
    isPresenter,
    email: data.user.email,
    userXrefID: data.user.userXrefID,
    hasAdminChat: data.user.hasAdminChat,
    isLimitedPresenter: media.limitedPresenter,
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
    try {
      mobilePin = await getMyMobilePin();
    } catch (cause) {
      // `N/A` stays as set above — no invented placeholder. `isHttpError` narrows Kit's rejection so
      // the 409 and 502 wordings stay distinct; `mobile-pin.remote.ts` says why that shape is known.
      dialogs.alert = isHttpError(cause) ? cause.body.message : 'Could not get an app pin right now.';
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
  /**
   * The chat rich text editor's gate — the two extra flags the comment above refers to.
   *
   * `sessData.enableRTE && preferences.enableRTE && isPresenter`, which is the reference's own
   * expression and appears THREE times in it: on the composer button
   * (`O(5, …prefs.enableRTE && …prefs.enableRTE && …isPresenter ? 5 : -1)`), inside `loadRTE()`, which will not
   * construct the editor without it, and inside `retriveRTEContent()`, which returns an empty
   * string so a click that reached the send anyway cannot post through a disabled editor. All
   * three consumers here read THIS, so the three cannot disagree.
   *
   * ## One deliberate narrowing, and it is a narrowing
   *
   * The reference's EDIT entry point asks a different question —
   * `sessData.enableRTE && preferences.enableRTE && containsHtml(msg.txt)`, with no presenter term.
   * A member who owns a rich message therefore gets the editor opened for them, types into it,
   * presses Save, and `retriveRTEContent()` refuses because THAT check does require presenter: the
   * editor reports "Empty message. Please type a message..." and their edit is lost. Reproducing a
   * control that cannot ever complete is not reproducing a feature, so the edit branch below asks
   * this same full question. Strictly fewer people reach the editor than upstream, and everyone
   * who reaches it can finish.
   */
  /**
   * `showPMBtn` — the chat header's private-chat button.
   *
   * ```js
   * this.showPMBtn = (isPresenter || sessData.userPM || sessData.userToPresenterPM)
   *   && !(user.isFT && sessData.disablePMForTrials)
   * ```
   *
   * The same three settings the roster's per-target `canShowRosterPrivateChat` reads, asked without
   * a target because this button opens the chooser rather than one conversation.
   */
  const showPmButton = $derived(
    (isPresenter ||
      data.sessData?.userPM === true ||
      data.sessData?.userToPresenterPM === true) &&
      !(data.user.isFT === true && data.sessData?.disablePMForTrials === true)
  );
  const canUseRTE = $derived(data.sessData?.enableRTE === true && prefs.enableRTE && isPresenter);
  /**
   * The room's chat mode — `g` group, `p` webinar, `d` disabled.
   *
   * DERIVED from the load, with no local copy. The `changeChatMode` broadcast makes this page
   * invalidate rather than assigning a mode itself, which is a deliberate departure from the rule
   * two hundred lines below that the command channel "does not refetch — it ACTS". That rule is
   * right for a command: `mutemic` is an instruction a browser carries out, and there is nothing to
   * re-read. A chat mode is not an instruction, it is room STATE that is stored in `room_state` and
   * read by the load — so a local copy would be a second source of truth that could disagree with
   * the row, and the client's copy would be the one nobody could audit.
   *
   * The cost is one extra load on a rare presenter action. The benefit is that a tab which missed
   * the broadcast, or received a forged one, converges on the row rather than diverging from it.
   */
  const chatMode = $derived(isChatMode(data.chatMode) ? data.chatMode : 'g');

  /** `this.webinarMode = 'p' == e`. */
  const webinarMode = $derived(isWebinarMode(chatMode));

  /**
   * Whether this viewer may type at all — the two reasons the reference replaces the composer with
   * its `Chat Disabled` block, in one place.
   *
   * `'d' != chatMode` is the room's rule and applies to everyone; the mute is this viewer's own.
   * The mute was enforced on the server long before it was ever shown, which is why a muted member
   * used to press send and watch nothing happen at all.
   */
  const selfMutedUntil = $derived(data.chatMutedTill ? new Date(data.chatMutedTill) : null);
  const chatEnabled = $derived(chatComposerEnabled(chatMode) && selfMutedUntil === null);
  const giphyApiKey = PUBLIC_PTR_GIPHY_API_KEY ?? '';

  /*
    The chat pane collapsing for a non-presenter in mode `d`, which is the ONE piece of the split
    that is still driven from here.

    The transition itself — what to save, what to restore, and why a re-run must not record the
    collapsed size as the one to restore — is `split.collapseChatForMode`, with the capture's
    `hideChat` subscription quoted above it. What stays is the question of WHO collapses, which is
    a room-authority answer this class has no business knowing: a presenter keeps their pane,
    because they are the one who turned chat off and still has to read it.
  */
  $effect(() => {
    split.collapseChatForMode(!isPresenter && chatMode === 'd');
  });

  /**
   * Whether the second column is on screen.
   *
   * `prefs.extraChatColumn` is the viewer's preference; this is that preference AND the collapse, so the
   * setting survives being hidden — `extraChatColumnWasEnabled` in the capture, which has no
   * counterpart here precisely because this is a derivation rather than a second stored flag.
   */
  const extraChatColumnVisible = $derived(prefs.extraChatColumn && !split.chatCollapsed);

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
    menus.openUserMenu(null);
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
    menus.openUserMenu(null);

    if (start.kind === 'self') {
      dialogs.alert = start.message;
      return;
    }

    selectRosterUser(user);
    showPrivateChat();
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

  /*
    The alerts log pages too, and shares this machinery deliberately: upstream renders ONE roomlog
    component for both, switched on `logType`, so the trigger, the guards, the terminator and both
    nudges are the same code there and are the same code here. What differs is only that alerts have
    no channel — `getAlertsLog {page}` against `getChatLog {channel, page}`.
  */
  /*
    Older-page state for BOTH logs, in `$lib/room/log-pages.svelte.ts`.

    The room held this machinery twice and in two shapes — scalars for alerts, per-channel maps for
    chat — and neither was wrong, which is what let the duplication survive. Upstream keeps the
    state on the roomlog COMPONENT and renders one per log view, so the alerts pane has one set and
    the chat pane has one set per channel it renders. Same machinery at two arities. One keyed class
    covers both: alerts passes a fixed key, chat passes its tab.

    Two instances rather than one, because the two logs hold different row types and a single
    instance would have to be typed as their union — at which point every read needs narrowing that
    the key already decides.
  */
  const alertPages = new RoomLogPages<(typeof data.alerts)[number]>();
  /*
    The live tail from the load, with whatever older pages the reader has scrolled back to in front
    of it — the same two-lifetime split the chat log uses, and for the same reason: `data.alerts` is
    replaced by every `invalidateAll()`, so older pages held there would be discarded by one new
    alert.
  */
  /**
   * `globals.user.alertFilterFor` and `preferences.showAlertsFrom` — the Alert Filter.
   *
   * `$state.raw` on the map for the same reason `presenterAudio` uses it: every transition in
   * `$lib/alert-filter` REPLACES the object rather than mutating it, so a deep proxy would cost a
   * proxy per key and buy nothing.
   *
   * Seeded from the stored preferences, which is where `updateAlertFilter` persists them — the
   * reference sends the map to the server AND calls `setPreference('showAlertsFrom', …)` in the same
   * expression, byte 1,221,491.
   */
  /**
   * Is the Alert Filter configured for this room at all?
   *
   * The reference gates all THREE of its entry points on `sessData.modAlertFilterList` being
   * truthy — a room that never configured a trader list has no feature, no button and no badge.
   * Same value the filter predicate reads, so the controls cannot appear while the filtering they
   * describe is inert.
   */
  /**
   * The room's Alert Labels, parsed ONCE for the page rather than once per rendered alert.
   *
   * `RoomMessage` is instantiated per message, so parsing inside it would run `JSON.parse` for
   * every row in the log. The reference parses once too, at byte 1,147,290, when the session
   * arrives.
   *
   * This THROWS on a malformed setting, deliberately and like the reference — see
   * `parseAlertLabels`. A room that typed bad JSON into Alert Labels should find out.
   */
  const alertLabels = $derived(parseAlertLabels(data.sessData?.alertLabels));

  /*
    Four gates `RoomMessage.svelte` has implemented since it was written and never received.

    Each was a prop defaulting false that this page did not pass, so public reply, reactions and
    both edit entries were unreachable in every room however the owner configured it. Every
    occurrence of all four in the reference bundle is `sessData.` dotted onto the name, so they
    are per-room policy and absent means off rather than "decide locally".

    Edit is TWO settings because upstream gates the chat log and the alerts log apart, and
    `sourceMessageBehavior` already picks between them on `kind`. Collapsing them would let a
    room that allows editing alerts also allow editing chat.
  */
  /*
    The OWNER term of the media.recording-reminder banner, byte 2,477,770.

    Upstream shares this name between a room setting and a local runtime flag, and the gate needs
    BOTH. The room already had the flag and the banner, so this is the missing half rather than a
    new feature: without it an owner cannot switch the reminder off at all.

    HONEST GAP: the captured gate also requires mic state -
    !micDisabled && !media.micMuted - which this room does not model on that banner. Named here rather
    than silently approximated.
  */
  const recordingReminderAllowed = $derived(data.sessData?.recordingReminder === true);
  const usersPublicReply = $derived(data.sessData?.usersPublicReply === true);
  const enableReactions = $derived(data.sessData?.enableReactions === true);
  const enableEditMessage = $derived(data.sessData?.enableEditMessage === true);
  const enableEditAlerts = $derived(data.sessData?.enableEditAlerts === true);

  /** The sixteen props every message in this room shares. `room-message-chrome.ts` says why. */
  const messageChrome: RoomMessageChrome = $derived({
    currentUserId: data.user.id,
    currentUserEmailHash: data.user.emailHash,
    currentUserName: data.user.displayName,
    // The ROLE, not `isPresenter`. See `media-elevation.ts` and the module's own note.
    viewerIsPresenter: data.user.role === 'staff' || data.user.role === 'admin',
    theme,
    chatStyle: globalChatStyle,
    chatGif: prefs.chatGif,
    chatBadges: prefs.chatBadges,
    enableBadges,
    showBadgesToPresentersOnly,
    disableStarYears,
    presenterMessagesOnTheRight,
    usersPublicReply,
    enableReactions,
    enableEditMessage,
    enableEditAlerts
  });

  const alertFilterConfigured = $derived(alertFilterAvailable(data.sessData?.modAlertFilterList));

  /**
   * `globals.doFilteredAlerts` (byte 1,221,430) — is a selection currently in force?
   *
   * Drives the header badge ALONE, and its gate in the capture is the conjunction, not this value
   * by itself: `O(6, sessData.modAlertFilterList && doFilteredAlerts ? 6 : -1)` at byte 2,056,460.
   * A room with a list but no selection shows the buttons and no badge, which is why the two gates
   * are separate values rather than one.
   */
  const alertFilterActive = $derived(alertFilterConfigured && alerts.filterSelected);

  /**
   * `updateAlertFilter` — the reference persists the map server-side AND sets the preference.
   *
   * This room has one mechanism for both: `savePreference` already stores arbitrary JSON per user
   * and already carries map-shaped values, so no new endpoint is needed. The observable result is
   * the reference's: the selection survives a reload.
   */
  function saveAlertFilter(next: { alertFilterFor: AlertFilterFor; showAlertsFrom: boolean }) {
    const write = alerts.filterChanged(next);
    prefs.save('alertFilterFor', write.alertFilterFor);
    prefs.save('showAlertsFrom', write.showAlertsFrom);
  }

  const visibleAlerts = $derived(
    mergeOlderChatMessages(alertPages.older(ALERTS_LOG), data.alerts)
      .filter((item) => !isEvidenceMessageHidden(item))
      .map(withEvidenceState)
      .filter(alerts.matchesSearch)
      /*
        THE ALERT FILTER — the second of the reference's three sites, `case "getAlertsLog"` at byte
        1,017,070.

        `senderEmailHash` is this room's name for what the reference calls `avt`: the gravatar hash
        of the sender's email, which is what the selection is keyed by. `alerts-advanced-search.ts`
        matches on the same field for the same reason.

        The predicate lives in `$lib/alert-filter` rather than here because it fails OPEN in three
        distinct ways and inlining it would put that logic in three places.
      */
      .filter(alerts.passesFilter(data.sessData?.modAlertFilterList))
      .filter(alerts.afterArchive)
      .map((item) => ({ ...item, unreadQa: unreadQaAlertIds.has(item.id) }))
  );

  /**
   * THE ALERT FILTER, site three of three — the alerts SEARCH results, byte 1,020,817.
   *
   * `case "doChatLogSearch"`, in the `"alerts" == i.type` branch:
   *
   * ```js
   * try {
   *   sessData.modAlertFilterList?.trim()?.length > 0 &&
   *     Object.keys(user.alertFilterFor).length > 0 &&
   *     (i.data = i.data.filter(se =>
   *       preferences.showAlertsFrom ? user.alertFilterFor[se.avt] : !user.alertFilterFor[se.avt]))
   * } catch {}
   * globals.alertsSearchResults = i.data.reverse();
   * ```
   *
   * The reference filters the RESULTS the server sent back; `#alerts-advanced-search-modal` here
   * searches the rows this room already holds, so the filter is applied to the input instead. Same
   * observable result — a filtered-out trader's alerts cannot appear in a search — and it keeps the
   * predicate in one place rather than reaching into `filterAlerts`.
   *
   * Separate from `visibleAlerts` because the advanced search deliberately does NOT inherit the
   * toolbar's search term, the archive cut-off or the evidence-hidden rules; sharing that chain
   * would quietly narrow the search to whatever the list happens to be showing.
   */
  const searchableAlerts = $derived(
    data.alerts.filter(alerts.passesFilter(data.sessData?.modAlertFilterList))
  );

  function archiveAlerts() {
    const archivable = visibleAlerts.length;
    if (archivable === 0) {
      dialogs.alert = 'There are no alerts to archive.';
      return;
    }
    dialogs.confirmation = {
      message: `Archive ${archivable} alert${archivable === 1 ? '' : 's'} from this list? They stay stored and are not deleted.`,
      onconfirm: () => {
        dialogs.confirmation = null;
        // One clock reading for the state and the preference: two calls could straddle an alert
        // arriving and archive it out of the list while storing a cut-off that does not cover it.
        prefs.save('alertsArchivedAt', alerts.archive(Date.now()));
      }
    };
  }

  // "Save alerts messages" exports what is currently listed, mirroring how a note is downloaded.
  function saveAlerts() {
    if (visibleAlerts.length === 0) {
      dialogs.alert = 'There are no alerts to save.';
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
      dialogs.alert =
        'Your browser blocked the detached window. Please allow pop-ups for this site.';
      return;
    }
    chatAlertsDetached = true;
    // `"windowClosing" === o.data && emit("reatachChat")` - closing the popout puts them back.
    alertsDetachedWindow.addEventListener('beforeunload', () => {
      chatAlertsDetached = false;
      alertsDetachedWindow = null;
    });
    dialogs.alert = DETACHED_ALERTS_MESSAGE;
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
    dialogs.alert = TRANSCRIPT_UNAVAILABLE;
  }

  /** `reopenAlertsChat()` - the side-menu control the bootbox message points at. */
  function reopenAlertsChat() {
    chatAlertsDetached = false;
    if (alertsDetachedWindow && !alertsDetachedWindow.closed) alertsDetachedWindow.close();
    alertsDetachedWindow = null;
  }
  /**
   * The mention popup — `prefs.chatPopup`'s half of the reference's notification block.
   *
   * Driven off `data.messages` rather than off the SSE payload, and that is a deliberate security
   * choice rather than convenience. The chat event carries only `senderId`, `senderEmailHash` and
   * the CHANNEL — never the text — because `room` is a chat channel and can be an admin one; a
   * payload carrying message bodies would put admin chat on every subscriber's wire. The refetched
   * `data.messages` has already been filtered by the server for THIS viewer, so reading the text
   * from there cannot show anybody something they were not already entitled to see.
   *
   * An `$effect` because this IS a side effect — a toast and an OS notification — not a derivation.
   *
   * `RoomOrderedArrivals` owns which messages are new, and it is deliberately NOT `RoomArrivals`:
   * this marks a POSITION in the server's ordering and re-seeds silently when that marker has been
   * trimmed out of the newest page, where an identity set would announce the entire log. Both live
   * in `$lib/room/arrivals.ts`, next to each other, so nobody merges them. Arriving in a room with
   * fifty unread mentions is silent; only messages that appear afterwards pop.
   */
  $effect(() => {
    const fresh = mentionArrivals.fresh(data.messages);
    if (fresh.length === 0) return;

    // `prefs.doNotDisturbOn ||` — the outer gate on the whole block, sound and popup alike.
    if (prefs.doNotDisturbOn || !prefs.chatPopup) return;

    for (const item of fresh) {
      // Your own message is never a mention of you, whatever it says.
      if (item.senderId === data.user.id) continue;
      if (!isMentionOf(item.body, data.user.displayName, item.isAdmin === true)) continue;

      const title = `Mention from @${item.senderName ?? 'Unknown'}`;
      /*  — the reference passes the body as the
         toast TEXT and the title second, and enables HTML because chat bodies carry markup. */
      toasts.show({ kind: 'info', title, message: item.body, enableHtml: true });
      toasts.notify(title, item.body, null, item.senderEmailHash ?? '');
    }
  });

  /**
   * Older pages, oldest-first, keyed by channel.
   *
   * `$state.raw`: these arrays are only ever REPLACED, never mutated in place, so a deep proxy over
   * every message row would cost a proxy read per field on every render and buy nothing.
   */
  const chatPages = new RoomLogPages<(typeof data.messages)[number]>();

  /*
    The live tail from the load, with whatever older pages the reader has scrolled back to in front
    of it.

    The two halves have different lifetimes on purpose: `data.messages` is replaced by every
    `invalidateAll()`, which is every SSE event, while the held older pages survive them. Merging
    rather than concatenating because offset paging over a live tail can hand the boundary row back
    twice — see `mergeOlderChatMessages`, which matches on identity and never on order.

    The trim runs AFTER the merge, so `prefs.trimChatLogs` still caps what is held at the reference's 300
    however far back somebody paged. Trimming first would let the cap be exceeded by exactly the
    pages this feature adds.
  */
  /*
    The extra column's rows, through the SAME pipeline as the main column's — merge, trim, hide,
    badge, and the webinar filter — differing only in which channel it reads. Written as a function
    so the two columns cannot drift: a second derived would be a second copy of six steps.
  */
  const visibleExtraChatMessages = $derived(chatMessagesFor(chat.extraTab));

  function chatMessagesFor(tab: ChatTab) {
    return trimChatLog(
      mergeOlderChatMessages(chatPages.older(tab), data.messages),
      prefs.trimChatLogs
    )
      .filter((item) => item.room === tab && !isEvidenceMessageHidden(item))
      /*
        WEBINAR MODE. Upstream applies this as messages ARRIVE, dropping them before they ever reach
        the log; applied here as a view filter instead, because this room re-reads its log from the
        server on every invalidate and a drop-on-arrival would be undone by the next load.

        The rule is the reference's, term for term — see `webinarMessageVisible`, including the
        asymmetry that a message containing an `@` is dropped even when it is an admin message.

        `isMention` is computed with the SAME rule the highlight and the popup use, rather than the
        loose `indexOf('@')` upstream tests separately: one mention rule, in `$lib/mention`.
      */
      .filter((item) =>
        !webinarMode
          ? true
          : webinarMessageVisible(
              {
                isAdmin: item.isAdmin === true,
                senderId: item.senderId,
                body: item.body,
                isMention: isMentionOf(item.body, data.user.displayName, item.isAdmin === true)
              },
              {
                id: data.user.id,
                isPresenter,
                hasAdminChat: data.user.hasAdminChat === true
              }
            )
      )
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
      .map((item) => ({ ...item, badges: badgesForSender(item.senderEmailHash) }));
  }

  const visibleChatMessages = $derived(chatMessagesFor(chat.tab));

  function forceAlertsToBottom(scroller: HTMLElement) {
    if (alertScrollTimer !== undefined) globalThis.clearTimeout(alertScrollTimer);
    alertScrollTimer = scrollRoomScrollerToBottom(scroller);
  }

  function forceChatToBottom(scroller: HTMLElement) {
    if (chatScrollTimer !== undefined) globalThis.clearTimeout(chatScrollTimer);
    chatScrollTimer = scrollRoomScrollerToBottom(scroller);
  }

  function trackAlertsScroll(event: Event) {
    const scroller = event.currentTarget as HTMLElement;
    alertsScrollingUp = isRoomScrollerReadingHistory(scroller);
    // Back at the bottom, so paging is armed again — `hasMoreData = !0` on the way down.
    if (!alertsScrollingUp) alertPages.arm(ALERTS_LOG);
    if (
      !shouldLoadOlderMessages({
        scrollTop: scroller.scrollTop,
        messageCount: visibleAlerts.length,
        /* REAL here, unlike the chat log: the alerts pane has a live search field, and
           `matchesAlertSearch` filters the rendered list by it. Upstream refuses to page while a
           term is set because a filtered log is not a paged one — asking for page 2 of a filter the
           server knows nothing about would interleave unfiltered history into a filtered view. */
        searchTerm: alerts.search,
        hasMoreData: alertPages.hasMore(ALERTS_LOG),
        loadingMore: alertPages.loading
      })
    ) {
      return;
    }
    scroller.scrollTop += CHAT_PAGE_REQUEST_NUDGE;
    void loadOlderAlerts(scroller);
  }

  /** `loadMoreLogs({type: 'alerts', page})` -> `getAlertsLog {page}`. */
  async function loadOlderAlerts(scroller: HTMLElement) {
    const page = alertPages.requesting(ALERTS_LOG);

    let incoming: Awaited<ReturnType<typeof loadOlderAlertsPage>>;
    try {
      incoming = await loadOlderAlertsPage(page);
    } catch {
      // Non-fatal by design, not swallowed: `hasMoreData` stays true and the next scroll retries.
      return; // `log-pages.remote.ts` carries why, and why the `finally` below must not move.
    } finally {
      alertPages.settled();
    }

    if (incoming.length === 0) {
      alertPages.exhausted(ALERTS_LOG);
      return;
    }

    alertPages.arrived(ALERTS_LOG, incoming, page);
    scroller.scrollTop += CHAT_PAGE_ARRIVAL_NUDGE;
  }

  function trackChatScroll(event: Event) {
    const scroller = event.currentTarget as HTMLElement;
    chatScrollingUp = isRoomScrollerReadingHistory(scroller);
    /*
      Back at the bottom, so paging is armed again: `hasMoreData = !0` on the way down is the
      reference's own reset, and without it a reader who once hit the end of the history could never
      page again in that session even after the log had grown.
    */
    if (!chatScrollingUp) chatPages.arm(chat.tab);
    maybeLoadOlderMessages(scroller);
  }

  /*
    ── Older chat history ───────────────────────────────────────────────────────────────────────
    The page load sends the NEWEST page per channel. Everything before that is fetched here, one
    page at a time, and held in client state so an `invalidateAll()` — which every SSE event
    triggers — refreshes the live tail without throwing away what the reader scrolled back to.
  */

  function maybeLoadOlderMessages(scroller: HTMLElement) {
    if (
      !shouldLoadOlderMessages({
        scrollTop: scroller.scrollTop,
        messageCount: visibleChatMessages.length,
        /*
          Always empty HERE, and deliberately not invented. The reference's roomlog component has
          its own `searchTerm` that filters the live log in place, and refuses to page while one is
          set — a filtered log is not a paged one. This room has no such filter: its chat search is
          the `chat-logs` archive modal, a separate view over its own query. The rule is kept whole
          in `shouldLoadOlderMessages` because it is the reference's, and this call site passes the
          only honest value it has.
        */
        searchTerm: '',
        hasMoreData: chatPages.hasMore(chat.tab),
        loadingMore: chatPages.loading
      })
    ) {
      return;
    }
    /*
      `+30` the instant the request goes out, before any answer — upstream applies it synchronously
      after the emit, in the scroll handler itself. It moves the reader off the trigger zone so a
      continuing gesture is not fighting the threshold while the fetch is in flight.
    */
    scroller.scrollTop += CHAT_PAGE_REQUEST_NUDGE;
    void loadOlderChatMessages(chat.tab, scroller);
  }

  /**
   * `loadMoreLogs({type: 'chat', channel, page})` — one page older, appended in front.
   *
   * The empty answer is the terminator, exactly as upstream reads it
   * (`0 == o.length && (this.hasMoreData = !1)`): the server does not say how much history is left
   * and does not need to, because running out is something you discover by asking once too often.
   */
  async function loadOlderChatMessages(channel: ChatTab, scroller: HTMLElement) {
    const page = chatPages.requesting(channel);

    let incoming: Awaited<ReturnType<typeof loadOlderChatPage>>;
    try {
      incoming = await loadOlderChatPage({ channel, page });
    } catch {
      return; // Non-fatal and retried, exactly as the alerts sibling above.
    } finally {
      chatPages.settled();
    }

    if (incoming.length === 0) {
      chatPages.exhausted(channel);
      return;
    }

    chatPages.arrived(channel, incoming, page);
    /*
      The SECOND nudge. The reference does two and they are not duplicates: `+30` the instant the
      request goes out, which is above, and `+1` when a page greater than zero arrives, which is
      here. Prepending fifty rows leaves the browser free to keep `scrollTop` pointing at what is
      now different content, and one pixel is the smallest scroll that makes it recompute the
      anchor without visibly moving the reader.
    */
    scroller.scrollTop += CHAT_PAGE_ARRIVAL_NUDGE;
  }

  $effect(() => {
    const scroller = alertsScroller;
    const count = visibleAlerts.length;
    const newestMessage = visibleAlerts.at(-1);

    if (!scroller) return;

    if (
      alertsFollow.follows({
        count,
        newestSenderId: newestMessage?.senderId,
        viewerId: data.user.id,
        readingHistory: alertsScrollingUp
      })
    ) {
      alertsScrollingUp = false;
      void tick().then(() => {
        if (alertsScroller === scroller) forceAlertsToBottom(scroller);
      });
    }
  });

  $effect(() => {
    const scroller = chatScroller;
    const activeTab = chat.tab;
    const count = visibleChatMessages.length;
    const newestMessage = visibleChatMessages.at(-1);

    if (!scroller) return;

    if (
      chatFollow.follows({
        count,
        tab: activeTab,
        newestSenderId: newestMessage?.senderId,
        viewerId: data.user.id,
        readingHistory: chatScrollingUp
      })
    ) {
      chatScrollingUp = false;
      void tick().then(() => {
        if (chatScroller === scroller) forceChatToBottom(scroller);
      });
    }
  });

  /*
    The SECOND chat column, following its own messages.

    Deliberately a separate effect rather than a loop over both: the two columns have independent
    tabs, independent message lists and independent reader scroll positions, so one effect reading
    both would re-run each column's scroll logic whenever the other changed. That is the difference
    between "a message arrived here" and "a message arrived anywhere", and it is what would make a
    reader scrolled up in this column get yanked to the bottom by traffic in the other one.
  */
  $effect(() => {
    const scroller = extraChatScroller;
    const activeTab = chat.extraTab;
    const count = visibleExtraChatMessages.length;
    const newestMessage = visibleExtraChatMessages.at(-1);

    if (!scroller) return;

    if (
      extraChatFollow.follows({
        count,
        tab: activeTab,
        newestSenderId: newestMessage?.senderId,
        viewerId: data.user.id,
        // THIS column's flag. Passing `chatScrollingUp` would let the main column's reader position
        // decide whether this one jumps, which is the defect its own contract test guards.
        readingHistory: extraChatScrollingUp
      })
    ) {
      extraChatScrollingUp = false;
      void tick().then(() => {
        if (extraChatScroller === scroller) forceChatToBottom(scroller);
      });
    }
  });

  $effect(() => {
    const unseenAlerts = alertArrivals.fresh(data.alerts);
    if (unseenAlerts.length === 0) return;

    queueMicrotask(() => {
      /*
        THE ALERT FILTER, site one of three — the LIVE arrival, byte 1,004,533.

        This is a genuinely separate site from the paged log, not a duplicate of it, and the reason
        is where the reference puts its two `continue`s:

          if (sessData.modAlertFilterList?.trim()?.length > 0 &&
              Object.keys(user.alertFilterFor).length > 0) {
            P("filtered out alert for " + te.avt);
            if (preferences.showAlertsFrom && !user.alertFilterFor[te.avt]) continue;
            if (!preferences.showAlertsFrom && user.alertFilterFor[te.avt]) continue;
          }
          globals.alertsLog.push(te);
          appEventBus.emit("alertMsg", te);

        BOTH the push and the emit are skipped, so a filtered-out alert makes no toast and plays no
        sound. Filtering only at render — which `visibleAlerts` already does, and which is this
        room's equivalent of the push — would still have popped and beeped for every alert the
        reader asked not to see.

        The two `continue`s are one predicate: skip unless `showAlertsFrom ? selected : !selected`.
        That is `alertPassesFilter`, so it is called rather than re-derived here.

        Read inside the microtask, deliberately: the values are wanted as of DELIVERY, and reading
        them in the effect body would make the filter a dependency, so toggling it would re-run
        this and re-deliver alerts that already arrived.

        NOT reproduced: the reference logs "filtered out alert for …" BEFORE both conditionals, so
        it claims to have filtered every alert once a selection exists, including the ones it then
        keeps. That is a defect in a debug line, and there is no `P()` here to carry it.
      */
      for (const alert of unseenAlerts) {
        if (
          !alertPassesFilter({
            avatarHash: alert.senderEmailHash,
            alertFilterFor: alerts.filterFor,
            showAlertsFrom: alerts.showFrom,
            modAlertFilterListRaw: data.sessData?.modAlertFilterList
          })
        ) {
          continue;
        }
        deliverAlert(alert);
      }
    });
  });

  $effect(() => {
    // The decision is `RoomPolls.deliver` — who may see this poll, and whether this browser has
    // already shown it. What is left here is the one thing the class does not own: the modal.
    if (polls.deliver(data.activePoll, data.user.id)) modal = 'poll';
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
    dialogs.confirmation = {
      message: `Do you want to ${followedUsers[user.emailHash] ? 'un' : ''}follow ${user.nick}?`,
      className: 'manage-user-list',
      onconfirm: () => {
        dialogs.confirmation = null;
        applyFollowToggle(user);
      }
    };
  }

  function requestMuteToggle(user: ModalTargetUser) {
    dialogs.confirmation = {
      message: `Do you want to ${mutedUsers[user.emailHash] ? 'un' : ''}mute ${user.nick}?`,
      className: 'manage-user-list',
      onconfirm: () => {
        dialogs.confirmation = null;
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
    if (media.talking.length === 0) return;

    dialogs.confirmation = {
      message: MUTE_ALL_CONFIRM,
      onconfirm: () => {
        dialogs.confirmation = null;
        const targets = nonAdminTalkingUsers(media.talking, roster.users);
        // `0 !== r.length &&` — an empty selection sends nothing, which is the case where every
        // open microphone belongs to a presenter.
        targets.forEach((entry, index) => {
          globalThis.setTimeout(() => {
            void presenterCommand({ subCmd: 'mutemic', targetUserId: entry.userID }).catch(
              (cause) => console.error('[presenterCommand]', cause)
            );
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
      PUBLIC_PTR_TAWK_PROPERTY_ID
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
    const script = tawkScript(PUBLIC_PTR_TAWK_PROPERTY_ID);
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
        savedNick: typeof prefs.loaded.savedNick === 'string' ? prefs.loaded.savedNick : null,
        nick: data.user.displayName,
        name: data.user.displayName,
        savedEmail: typeof prefs.loaded.savedEmail === 'string' ? prefs.loaded.savedEmail : null,
        email: data.user.email
      }),
      (error) => {
        if (error) console.error('Error setting Tawk.to attributes:', error);
      }
    );
    tawkWidgetOpen = true;
  }

  function requestManagedUserRemoval(list: 'mutedUsers' | 'followedUsers', user: ManagedChatUser) {
    dialogs.confirmation = {
      message: `Do you want to un${list === 'mutedUsers' ? 'mute' : 'follow'} ${user.nick}?`,
      className: 'manage-user-list',
      onconfirm: () => {
        dialogs.confirmation = null;
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
      dialogs.alert = 'User is not logged in.';
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

  /** `invalidateAll()` only on the resolved path — the roster is this route's `load`, not a query. */
  async function updateUsername(user: ModalTargetUser, username: string) {
    const trimmed = username.trim();
    if (!trimmed) return;
    try {
      await editUsername({ userId: user.id, username: trimmed });
    } catch (cause) {
      dialogs.alert = isHttpError(cause) ? cause.body.message : 'Could not change that username.';
      return;
    }
    await invalidateAll();
  }

  /**
   * Lifts a member's chat mute — the other half of `mute24`.
   *
   * The mute was enforced on the server and the unmute was not sent anywhere: the modal's button
   * raised the reference's alert and stopped. `invalidateAll()` refreshes the presenter's own view
   * of the roster; the MEMBER learns about it on the `privCmds` channel, because their gate is
   * server-read and nothing local to them changed.
   *
   * That `invalidateAll()` runs by hand and has to: single-flight mutations refresh remote QUERIES,
   * and the presenter's roster is not one — it comes from this route's `load`. Converting it is its
   * own change, and doing it here would be claiming a refresh that never happens.
   *
   * The caller does not await this — `handleUserAction` is synchronous — but it DOES catch it. A
   * remote command rejects where the old `fetch('?/unmuteChat')` returned `response.ok === false`
   * for anyone who bothered to look, and nobody did; that is the same silent success this whole
   * path was built to fix. `chat-mute.remote.ts` carries the rest of the reasoning.
   */
  async function unmuteChat(user: ModalTargetUser) {
    await unmuteChatCommand({ targetUserId: user.id });
    await invalidateAll();
  }

  function handleUserAction(action: string, user: ModalTargetUser) {
    if (action === 'session-reload-config') {
      dialogs.confirm('Are you sure you want to reload tge session config?', () => {
        modal = null;
        void invalidateAll();
        dialogs.alert = 'Session config reloaded...';
      });
      return;
    }

    /*
      The reference raises `alertService.success("Copied to clipboard.")` from all three of its
      copy buttons (`main.d6d3c112b59b7d0d.js` bytes 2168500-2169300). `alertService` is
      ngx-toastr, which is what `ToastHost` reproduces — so this is the same transient success
      toast, not a modal.
    */
    if (action === 'copied-to-clipboard') {
      toasts.show({ kind: 'success', message: 'Copied to clipboard.', enableHtml: false });
      return;
    }

    if (action === 'session-refresh-roster') {
      void invalidateAll();
      dialogs.alert =
        'Command send OK. Please allow 1/2 minute for old entries to get deleted from the list';
      return;
    }

    if (action === 'session-soft-reset') {
      dialogs.confirm('Are you sure you want to soft reset the room?', () => {
        modal = null;
        void invalidateAll();
        dialogs.alert = 'Soft reset request sent...';
      });
      return;
    }

    if (action === 'session-hard-reset' || action === 'session-hard-reset-revoke') {
      dialogs.confirm('Are you sure you want to reset the room?', () => {
        modal = null;
        prefs.save('sessionTokensRevoked', action === 'session-hard-reset-revoke');
        void invalidateAll();
      });
      return;
    }

    if (action === 'session-save-close') {
      prefs.save('sessionOpen', false);
      modal = null;
      return;
    }

    if (action === 'session-save-close-message') {
      dialogs.alert = 'Message Saved';
      return;
    }

    if (action === 'session-open') {
      prefs.save('sessionOpen', true);
      modal = null;
      return;
    }

    if (action === 'session-lock' || action === 'session-lock-kick') {
      prefs.save('sessionLocked', true);
      prefs.save('sessionLockKick', action === 'session-lock-kick');
      dialogs.alert = 'Session Locked';
      return;
    }

    if (action === 'session-unlock') {
      prefs.save('sessionLocked', false);
      dialogs.alert = 'Session Unlocked';
      return;
    }

    if (action === 'invalid-restream-link') {
      dialogs.alert =
        'Invalid RTMP link!, please make sure it starts with "rtmp://" and does not contain spaces or special characters. For example: rtmp://example.com/live/stream';
      return;
    }

    if (
      action === 'session-send-video' ||
      action === 'session-send-sales-image' ||
      action === 'session-send-users-url'
    ) {
      dialogs.prompt = {
        title: 'Please enter the URL:',
        value: '',
        onconfirm: (value) => {
          const url = value.trim();
          dialogs.prompt = null;
          if (!isAcceptableSendUrl(url)) {
            dialogs.alert = MISSING_SCHEME_ALERT;
            return;
          }
          if (action === 'session-send-video') {
            const key = `videos-${data.sessionHandle}`;
            const stored = JSON.parse(localStorage.getItem(key) ?? '[]') as string[];
            const result = addVideoToList(stored, url);
            if (!result.added) {
              dialogs.alert = 'Video already exists.';
              return;
            }
            localStorage.setItem(key, JSON.stringify(result.videos));
            modal = null;
            dialogs.alert = 'Video added.';
            return;
          }
          modal = null;
          dialogs.alert = 'Command send OK.';
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
      dialogs.prompt = {
        title: `Enter a new username for "${user.nick}":`,
        value: '',
        onconfirm: (value) => {
          dialogs.prompt = null;
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
      dialogs.prompt = {
        title: 'Enter a new username for yourself:',
        value: user.nick,
        onconfirm: (value) => {
          dialogs.prompt = null;
          const next = value?.trim() ?? '';
          if (next.length === 0) return;
          if (!/^[a-zA-Z0-9]+$/.test(next)) {
            dialogs.alert = 'Username can only contain letters and numbers';
            return;
          }
          if (next.length < 3) {
            dialogs.alert = 'Username must be at least 3 characters long';
            return;
          }
          if (next.length >= 30) {
            dialogs.alert = 'Username must be less than 30 characters long';
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
      dialogs.prompt = {
        title: 'Enter the kick message for this user',
        value: 'You have been kicked from the room by an administrator',
        onconfirm: () => {
          dialogs.prompt = null;
          modal = null;
          dialogs.alert = 'User kicked OK';
        }
      };
      return;
    }

    if (action === 'kick-duplicates') {
      dialogs.prompt = {
        title: `Kick all other duplicates of ${user.nick} with the following message:`,
        value: 'You have been kicked from the room by an administrator',
        onconfirm: () => {
          dialogs.prompt = null;
          modal = null;
          dialogs.alert = `No duplicates found for ${user.nick}`;
        }
      };
      return;
    }

    if (action === 'admin-notes-password') {
      dialogs.prompt = {
        title: "Please enter the password to manage user's notes:",
        value: '',
        onconfirm: () => {
          dialogs.prompt = null;
          dialogs.alert = 'Wrong password!';
        }
      };
      return;
    }

    /*
      Ahead of `userActionAlert` below because this one sends something — see `EXACT_ALERTS` in
      `user-action-intent.ts` for why leaving it in that table was the bug. The alert is raised
      first because the reference raises it immediately; `Command failed.` is inherited from the
      sibling handlers in this file, not captured, because the reference never showed us a failure
      for this control.
    */
    if (action === 'unmute-chat') {
      dialogs.alert = 'user chat unmuted';
      void unmuteChat(user).catch(() => {
        dialogs.alert = 'Command failed.';
      });
      return;
    }

    // The table moved to `user-action-intent.ts`; the state writes stay here. See it for why.
    const fixedAlert = userActionAlert(action);
    if (fixedAlert) {
      if (action === 'save-permissions') modal = null;
      dialogs.alert = fixedAlert;
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
    alerts.toggleToolbar();
    // `guiEventBus.emit('scrollAlertLogToBottom')` - the strip changes height, so the log would
    // otherwise be left scrolled off the newest alert. The scroller is this file's element, which
    // is why the emit stayed here rather than going into the class with the toggle.
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
    if (!alerts.toggleSearchOnly()) return;
    // `setTimeout(...)` in the capture, because the input does not exist until the strip renders.
    void tick().then(() => {
      document.querySelector<HTMLInputElement>('#alert-settings .form-control')?.focus();
    });
  }

  function openModal(name: Exclude<ModalName, null>) {
    if (name === 'muted' || name === 'followed' || name === 'user') loadManagedUsers();
    modal = name;
    menus.closeForModal();
  }

  function openPollUI() {
    /*
      `requestOpen` restores a minimised poll rather than rebuilding it, and says so by bumping the
      token the modal watches. Both paths open the modal; only a fresh one goes through `openModal`,
      which closes the floating menus on the way.
    */
    const wasMinimized = polls.minimized;
    polls.requestOpen();
    if (wasMinimized) modal = 'poll';
    else openModal('poll');
  }

  function minimizePoll() {
    polls.minimize();
    modal = null;
  }

  function closeActiveModal() {
    if (modal === 'poll') polls.closed();
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
    // Optimistic as always; the catch is here because a `void`-ed rejection is a swallowed error.
    void saveTheme(nextTheme).catch((cause) => console.error('saveTheme', nextTheme, cause));
  }


  const closeFloatingMenus = () => menus.closeFloating();

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

  function mediaServerConnected(_reconnected: boolean) {
    media.connected = true;
    /*
      Cleared here, on the socket's `connect`, exactly where the reference clears them — inline in
      that handler beside `emit("mediaServerConnected")` and `reproduceLocalTracksIfAny()`.

      Its own `clearReconnectToasts()` method duplicates this body and is never called from
      anywhere in the bundle; that is dead code upstream, not a second path, so there is nothing
      else to reproduce.
    */
    if (reconnectToastId !== null) {
      toasts.dismiss(reconnectToastId);
      reconnectToastId = null;
    }
    if (presenterReconnectToastId !== null) {
      toasts.dismiss(presenterReconnectToastId);
      presenterReconnectToastId = null;
    }
    // ALWAYS, not just on a redial. A toast that says "reconnecting..." is false the instant the
    // socket opens, and gating this on `reconnected` left the error on screen forever whenever the
    // first connect of a session happened to follow a failed one.
    toasts.dismissMatching('Disconnected from Media Server');
    toasts.show({ kind: 'success', message: 'Connected to Media Server', enableHtml: false });
  }

  /**
   * Raised on the TRANSITION into a disconnected state, never per redial attempt.
   *
   * The capture subscribes to an event bus - `appEventBus.subscribe("mediaServerDisconnected", ...)`
   * - which is a state change. Our signalling client emits `disconnected` from `#onClose`, and
   * `#onClose` also runs for every FAILED reconnect attempt, so this was firing on a backoff
   * schedule that climbs to one every 30s (`maxReconnectDelayMs: 30_000`).
   *
   * `toasts.show` dedupes an identical message, but its 5s timer still expires, so each retry raised
   * a fresh toast the moment the previous one cleared. With the media server down the banner was
   * permanent - which is exactly what it did when I killed the SFU and left it dead.
   */
  function mediaServerDisconnected() {
    if (!media.connected) return;
    media.connected = false;
    toasts.show({
      kind: 'error',
      message: 'Disconnected from Media Server... reconnecting...',
      enableHtml: false
    });

    // The sticky pair, raised beside the bus toast exactly as the reference raises them.
    if (reconnectToastId === null) {
      reconnectToastId = toasts.show(
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
      presenterReconnectToastId = toasts.show(
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
   * DISTINCT from `prefs.videoDisabled` above, which is `preferences.disableVideo` from the USER settings
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
        media.startTalking({ userID: owner.userID, mediaValue: { name: owner.name } });
      }
    }
  }

  /** `producerPaused` - the capture's `presMuted`, i.e. that peer stopped talking. */
  function onRemoteAudioPaused(producerId: string) {
    const owner = audioProducerOwners.get(producerId);
    if (owner) media.stopTalking(owner.userID);
  }

  /** `producerResumed` - the capture's `presUnmuted`, i.e. that peer is talking again. */
  function onRemoteAudioResumed(producerId: string) {
    const owner = audioProducerOwners.get(producerId);
    if (owner) media.startTalking({ userID: owner.userID, mediaValue: { name: owner.name } });
  }

  function removeRemoteAudio(producerId: string) {
    remoteAudioStreams.delete(producerId);
    const owner = audioProducerOwners.get(producerId);
    if (owner) media.stopTalking(owner.userID);
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
      node.volume = Math.min(1, Math.max(0, untrack(() => roomVolume.volume) / 100));

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
   * so it needs the session-level `prefs.doSpeechReco` on and a live microphone - and here, a presenter,
   * because the server refuses `sendSpeechReco` from a member. `prefs.subtitles` is deliberately NOT a
   * gate: that is the per-viewer overlay preference, and a presenter who hides captions on their own
   * screen should still caption for everybody else.
   */
  function beginSpeechRecognition() {
    if (stopSpeechReco || !isPresenter || !prefs.doSpeechReco || !mediaSession) return;

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
        doNotDisturbOn: prefs.doNotDisturbOn,
        alertSoundOn: prefs.alertSoundOn,
        nonTradeSound: prefs.nonTradeSound,
        alertPopup: prefs.alertPopup,
        longerAlertPopup: prefs.longerAlertPopup
      }
    );
    if (!delivery) return;

    if (delivery.sound) playSoundEffect(delivery.sound);
    if (!delivery.toast) return;

    const { timeOut, ...toast } = delivery.toast;
    toasts.show(toast, timeOut);
    toasts.notify(
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
  const qaArrivals = new RoomArrivals<(typeof data.alertQuestions)[number]>();

  function deliverQaNotice(question: (typeof data.alertQuestions)[number]) {
    if (question.senderId === data.user.id) return;

    const alert = data.alerts.find((item) => item.id === question.alertId);
    if (!alert) return;

    const askedOnThisAlert = data.alertQuestions.some(
      (other) => other.alertId === question.alertId && other.senderId === data.user.id
    );
    if (!isPresenter && !askedOnThisAlert) return;

    if (!prefs.doNotDisturbOn && prefs.qaSoundOn) playSoundEffect('qaAlert');
    if (!prefs.alertPopup) return;

    const senderIsPresenter =
      question.senderRole === 'staff' || question.senderRole === 'admin';
    toasts.show({
      kind: 'info',
      title: `Alert ${senderIsPresenter ? 'answer' : 'question'} from @${question.senderName}`,
      message: `"${question.body}" for alert: "${alert.body}" by ${alert.senderName}`,
      enableHtml: false
    });
  }

  $effect(() => {
    const questions = data.alertQuestions;

    // The first pass is whatever was already stored when the page loaded, not news, and
    // `RoomArrivals` returns nothing for it — a reader opening the room gets no toast per
    // historical question.
    for (const question of qaArrivals.fresh(questions)) {
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
    //
    // The priming pass used to `return` above this, so this ran from the SECOND pass onwards; it now
    // runs from the first. That is a no-op and not a behaviour change: `unreadQaAlertIds` is
    // declared empty and only ever filled by the loop directly above, so on the first pass there is
    // nothing to clear.
    const answered = [...unreadQaAlertIds].filter(
      (alertId) => !questions.some((question) => question.alertId === alertId && !question.answeredAt)
    );
    for (const alertId of answered) unreadQaAlertIds.delete(alertId);
  });

  // app-chat plays `pling` for an incoming chat message under exactly this gate:
  //   preferences.doNotDisturbOn || (preferences.chatSoundOn && soundEffectsService.pling.play())
  // Your own message does not ring, and one ring covers a batch that arrives together rather than
  // one per message.
  const chatArrivals = new RoomArrivals<(typeof data.messages)[number]>();

  $effect(() => {
    // Re-runs when the viewer switches tabs or a screen arrives/leaves.
    void selectedScreenTab;
    void screenStreams.size;
    void applyScreenLayers();
  });

  $effect(() => {
    // ONE ring for a batch that arrives together, not one per message — `.some` is that rule, and
    // it is why the sound is decided after the whole arrival is known rather than inside the loop.
    const arrived = chatArrivals.fresh(data.messages);
    const incoming = arrived.some((message) => message.senderId !== data.user.id);

    if (incoming && !prefs.doNotDisturbOn && prefs.chatSoundOn) playSoundEffect('pling');
  });

  async function runMessageOperation(
    kind: 'alert' | 'chat',
    item: MessageActionItem,
    operation: 'delete' | 'markAnswered' | 'mute24' | 'showMsgToAll'
  ) {
    /*
      `targetUserId` rides ONLY on `mute24` now. The action took it on every operation and read it on
      one, so a delete carried a field nothing looked at; `z.discriminatedUnion` refuses it on the
      other three, which is what makes the shape honest.

      A rejection is the refusal. The old `response.ok` reported "the request arrived" and not "the
      operation happened" — SvelteKit put a `fail` in the BODY with a 200 status — so anything
      undoing an optimistic update had to read the result itself.
    */
    try {
      await messageAction(
        operation === 'mute24'
          ? { kind, id: item.id, operation, targetUserId: item.senderId }
          : { kind, id: item.id, operation }
      );
    } catch (cause) {
      dialogs.alert = isHttpError(cause) ? cause.body.message : 'That did not work.';
      return false;
    }
    if (operation === 'delete' || operation === 'markAnswered') await invalidateAll();
    return true;
  }

  /**
   * @param newBodyHtml Rich text from the editor, when the edit was made with it.
   *
   * `editChatMessage` with `newMsg` set to the editor's content, which is what the reference sends
   * from `sendMessage()` while `isEditing`. As on the post path, the server sanitises it and
   * derives the plain body itself.
   */
  async function editMessage(
    kind: 'alert' | 'chat',
    item: MessageActionItem,
    newBody: string,
    newBodyHtml?: string
  ) {
    try {
      await messageAction({ kind, id: item.id, operation: 'edit', newBody, newBodyHtml });
    } catch (cause) {
      dialogs.alert = isHttpError(cause) ? cause.body.message : 'That edit did not save.';
      return false;
    }
    await invalidateAll();
    return true;
  }

  async function toggleMessageReaction(
    kind: 'alert' | 'chat',
    item: MessageActionItem,
    reaction: MessageReactionPayload
  ) {
    try {
      await messageAction({
        kind,
        id: item.id,
        operation: 'reaction',
        reactionKey: reaction.key,
        reactionEmoji: reaction.emoji
      });
    } catch (cause) {
      dialogs.alert = isHttpError(cause) ? cause.body.message : 'That reaction did not save.';
      return false;
    }
    await invalidateAll();
    return true;
  }

  function toggleEvidenceReaction(
    item: MessageActionItem,
    reactionPayload: MessageReactionPayload
  ) {
    // The same four rules the server applies, from the same function — see `$lib/reaction-toggle`.
    const reactions = toggleReaction(
      item.reactions ?? {},
      reactionPayload.key,
      reactionPayload.emoji,
      data.user.emailHash
    );
    updateEvidenceMessage(item, { reactions });
  }

  /**
   * The two sends that act on the modal's selected message. One helper because they differed only in
   * the command called — two copies of a refusal path is how one of them ends up refetching anyway.
   */
  async function sendAgainstSelectedMessage(
    send: (id: number) => Promise<void>,
    failure: string
  ): Promise<boolean> {
    if (!selectedMessage) return false;
    try {
      await send(selectedMessage.id);
    } catch (cause) {
      dialogs.alert = isHttpError(cause) ? cause.body.message : failure;
      return false;
    }
    await invalidateAll();
    return true;
  }

  const sendAlertQuestion = (body: string) =>
    sendAgainstSelectedMessage((alertId) => askQuestion({ body, alertId }), 'Question not sent.');

  const sendReplyMessage = (body: string) =>
    sendAgainstSelectedMessage((messageId) => replyMessage({ body, messageId }), 'Reply not sent.');

  /**
   * `doMention` / `doMentionExtra` — the SAME insert, into whichever composer is the target.
   *
   * ```js
   * doMention(e) {
   *   guiEventBus.emit(
   *     this.isQAMsg ? "doQAMention"
   *     : preferences.extraChatColumn && (this.extraChatMsg || "textAreaTxtExtra" === globals.chatInputFocus)
   *       ? "doMentionExtra" : "doMention", e)
   * }
   * ```
   *
   * Two ways to reach the extra column, and both matter: the message you clicked was IN that column
   * (`extraChatMsg`, true for every row it renders), or you were last typing there
   * (`chat.focus`). Without the second, clicking a name in the main log while composing in the
   * extra column would insert into the pane you are not looking at.
   *
   * The extra column's insert is upstream's own, and it differs by a space:
   * `i.length ? val(i + ' @' + e + ' ') : val('@' + e + ' ')`.
   */
  function mentionUser(name: string, toExtraColumn = false) {
    // The insert is the class's; the caret is this file's, because the element is.
    if (!chat.mention(name, toExtraColumn)) return;
    requestAnimationFrame(() => {
      composerElement?.focus();
      composerElement?.setSelectionRange(chat.composer.length, chat.composer.length);
    });
  }

  function handleMessageAction(
    kind: 'alert' | 'chat',
    action: MessageAction,
    item: MessageActionItem,
    payload?: MouseEvent | MessageReactionPayload,
    /** True when the click came from the extra chat column — upstream's `extraChatMsg`. */
    fromExtraColumn = false
  ) {
    if (action !== 'reaction') menus.openMessageMenu(null);
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
    if (action === 'mention'){
      mentionUser(item.senderName, chat.mentionTargetIsExtra(fromExtraColumn));
    }
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
        dialogs.alert = 'Chatting with yourself again?';
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
        dialogs.confirmation = {
          message:
            data.user.role === 'staff' || data.user.role === 'admin'
              ? `Are you sure you want to delete this ${noun} by ${item.senderName}. text: ${item.body}`
              : `Are you sure you want to delete your message: ${item.body}`,
          onconfirm: () => {
            dialogs.confirmation = null;
            deleteMessage();
          }
        };
      }
    }
    if (action === 'mute') {
      if (item.senderId <= 0) {
        dialogs.alert = 'Could not retrieve user info.';
        return;
      }
      dialogs.confirmation = {
        message: 'Are you sure you want to mute this user for 24 hours?',
        onconfirm: () => {
          dialogs.confirmation = null;
          void runMessageOperation(kind, item, 'mute24').then((success) => {
            if (success) dialogs.alert = 'User chat muted.';
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
        toasts.info('Copied to clipboard.');
      });
    }
    if (action === 'edit') {
      /*
        ```js
        editMessage() {
          if ("chat" === this.logType) {
            if (sessData.enableRTE && preferences.enableRTE && containsHtml(this.msg.txt))
              return void guiEventBus.emit("doRTEModalEdit", {msg: this.msg});
            bootbox.prompt({title: "Edit chat message:", inputType: "textarea", …})
        ```

        A rich message is edited richly; everything else keeps the plain prompt below, which is the
        reference's own fallback and was already built here.

        THE ONE DIFFERENCE, and it is the column. Upstream asks `containsHtml(msg.txt)` — it sniffs
        the stored text for markup, because a message there is one string and nothing records how
        it was written. This room records it: `bodyHtml` is a nullable column, set only by the
        sanitiser on the way in. So somebody who TYPED a less-than in the plain composer gets the
        plain prompt and sees the characters they typed, rather than an editor that treats their
        sentence as tags. Same rule the renderer follows, for the same reason.
      */
      if (kind === 'chat' && canUseRTE && item.bodyHtml) {
        rteIsEditing = true;
        rteEditTarget = item;
        rteDraft = item.bodyHtml;
        openModal('rich-text');
        return;
      }
      dialogs.prompt = {
        title: kind === 'chat' ? 'Edit chat message:' : `Edit alert by ${item.senderName}:`,
        value: item.body,
        onconfirm: (value) => {
          const newBody = value.trim();
          if (!newBody) return;
          dialogs.prompt = null;
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
          menus.openMessageMenu(null);
        }, 500);
      });
    }
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

    if (!prefs.doNotDisturbOn && !isMine && prefs.chatSoundOn) playSoundEffect('pling');
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
    let incoming: PrivateChatMessage[];
    try {
      incoming = await loadPrivateChatLogCommand({ peerId, page, searchTerm });
    } catch {
      return; // Non-fatal: the held log stays as it was. See `private-chat.remote.ts`.
    }

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

    try {
      await sendPrivateMessageCommand({ peerId: currUser, body: text });
    } catch (cause) {
      // The server's own wording, which includes the capture's `Chatting with yourself again?`.
      dialogs.alert = isHttpError(cause) ? cause.body.message : 'Message not sent.';
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
    dialogs.confirmation = {
      message: 'Are you sure you want to delete all messages in this chat?',
      onconfirm: async () => {
        dialogs.confirmation = null;
        await deletePrivateChatLogCommand({ peerId });
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
   * `videoOnlyMode` is the `r` query parameter — the media.recording-bot mode — which this room does not
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
   * `prefs.save(...)`. `app-chat` defines the same method but never binds it to a template, so
   * the private chat is the only place in the capture this button exists.
   */
  function setDND() {
    prefs.doNotDisturbOn = !prefs.doNotDisturbOn;
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



  /**
   * Turn a capture failure into the one sentence the user sees.
   *
   * The DECISION moved to `media-capture-error.ts`; what stays here is the part that is genuinely
   * the page's: the async permission round trip and the assignment to `dialogs.alert`.
   *
   * The `NotAllowedError` path is why this is still async. `mediaCaptureErrorMessage` returns null
   * for it because the answer depends on what the Permissions API says, and the room deliberately
   * stays SILENT unless that comes back denied - somebody who just dismissed the prompt themselves
   * does not need to be told they dismissed it. The `Permission denied` prefix is the test, because
   * every other state comes back as a sentinel rather than prose.
   */
  async function reportMediaCaptureError(kind: MediaCaptureKind, error: unknown) {
    const errorName = captureErrorName(error);

    if (errorName === 'NotAllowedError') {
      const guidance = await checkPermissionState(permissionForCapture(kind), navigator.userAgent);
      if (guidance.startsWith('Permission denied')) dialogs.alert = guidance;
      return;
    }

    const message = mediaCaptureErrorMessage({
      kind,
      errorName,
      errorMessage: captureErrorMessage(error),
      isSecureContext: window.isSecureContext
    });
    if (message) dialogs.alert = message;
  }

  async function enableMicrophone(retryCount = 0) {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException('Microphone access is not supported', 'NotSupportedError');
      }
      microphoneStream ??= await navigator.mediaDevices.getUserMedia({ audio: true });
      setStreamEnabled(microphoneStream, true);
      media.micMuted = false;

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
          toasts.show({
            kind: 'error',
            message: 'Your microphone could not be shared with the room.',
            enableHtml: false
          });
        }
      }
      // An open mic is what "talking" means here - see `audioProducerOwners`.
      media.startTalking({
        userID: data.user.id,
        mediaValue: { name: data.user.displayName }
      });
      beginSpeechRecognition();
    } catch (error) {
      if (retryCount === 0) {
        await enableMicrophone(1);
        return;
      }
      media.micMuted = true;
      media.stopTalking(data.user.id);
      await reportMediaCaptureError('microphone', error);
    }
  }

  async function toggleMicrophone() {
    if (!media.micMuted) {
      /*
        The TOOLBAR is `toggleMute()`, and its mute branch is `disableMic()` - not `muteMic()`.

        ```js
        toggleMute() { this.micProducer ? (this.micMuted ? this.enableMic(!1) : this.disableMic())
                                        : this.enableMic(!1) }

        disableMic() {
          if (this.micProducer) {
            this.micMuted = !0; this.guiEventBus.emit("media.micMuted", this.micMuted);
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
      media.micMuted = true;
      media.stopTalking(data.user.id);
      endSpeechRecognition();
      return;
    }

    media.micLaunching = true;
    try {
      await enableMicrophone();
    } finally {
      media.micLaunching = false;
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
    media.camLaunching = true;
    try {
      if (!media.camMuted) {
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
        media.camMuted = true;
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
      media.camMuted = false;
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
          toasts.show({
            kind: 'error',
            message: 'Your camera could not be shared with the room.',
            enableHtml: false
          });
        }
      }
    } catch (error) {
      media.camMuted = true;
      await reportMediaCaptureError('camera', error);
    } finally {
      media.camLaunching = false;
    }
  }


  function stopRecording() {
    const wasRecording = media.recording;
    if (screenRecorder && screenRecorder.state !== 'inactive') screenRecorder.stop();
    // Only announce a stop we actually made: `stopScreenSharing()` calls this unconditionally, and
    // a stop broadcast with no start would clear the badge for a room that is still media.recording.
    if (wasRecording) void broadcastRecordingState('stopRec');
    media.recording = false;
    media.recordingPaused = false;
    media.recordingReminder = false;
  }

  /** The navbar's stop control: ends every screen this presenter is sharing. */
  function stopScreenSharing() {
    menus.set('screen', false);
    stopRecording();
    for (const producerId of [...localScreenStreams.keys()]) stopLocalScreen(producerId);
    // A share that never reached the SFU has no producer id to key on, so it is not in the map.
    stopStream(screenStream);
    screenStream = null;
    localScreenProducerId = null;
    media.screenSharing = false;
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
      dialogs.alert = MEDIA_NOT_CONNECTED_ALERT;
      menus.set('screen', false);
      return;
    }
    dialogs.prompt = {
      title: SCREEN_NAME_PROMPT,
      // `screenProducers.size + 1` - what this session is already sharing, so a second screen
      // opens on "Screen 2" rather than on "Screen 1" again.
      value: `Screen ${mediaSession.screenNames.length + 1}`,
      onconfirm: (value) => {
        dialogs.prompt = null;
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
      dialogs.alert =
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
      media.screenSharing = true;
      menus.set('screen', false);
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
          toasts.show({
            kind: 'error',
            message: 'Your screen could not be shared with the room.',
            enableHtml: false
          });
        }
      }
    } catch (error) {
      // Only this attempt failed. Screens already being shared are untouched, and `media.screenSharing`
      // stays true if any of them survive - flipping it off would hide the stop control for shares
      // that are still running.
      stopStream(stream);
      screenStream = localScreenStreams.values().next().value ?? null;
      media.screenSharing = localScreenStreams.size > 0;
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
      media.screenSharing = false;
    }
  }

  /**
   * Tells the room what this presenter's recorder is doing. `media.recording-state.remote.ts` carries the
   * reasoning for all of it: why the room is told rather than each browser reading its own flag, why
   * `cmd` is the command's schema instead of four restated strings, and why the catch is here once
   * rather than at each of the four `void`-ed call sites.
   */
  type RecordingTransition = Parameters<typeof recordingState>[0]['cmd'];

  async function broadcastRecordingState(cmd: RecordingTransition, recName = '') {
    /*
      THE SPINNER'S MISSING WRITER, added 2026-08-15.

      `recIndicatorStart` — the spinner-plus-REC navbar indicator, consts 92/93/94 — was rendered
      and `media.roomRecordingStarting` was never set by anything, so the branch was unreachable and the
      presenter got no feedback at all between pressing record and the room confirming. Found by
      reading every use of the field while extracting `RoomMedia`: one declaration, one template
      branch, no writer.

      The failure path clears it too, and that half matters as much: a spinner left running on a
      refused command reads as "still starting" for the rest of the session, which is worse than no
      feedback because it is wrong feedback.
    */
    if (cmd === 'startRec') media.roomRecordingRequested();
    try {
      await recordingState({ cmd, recName });
    } catch (error) {
      if (cmd === 'startRec') media.roomRecordingRequestFailed();
      console.error('recordingState', cmd, error);
    }
  }

  /**
   * Records the shared screen to a file on this machine.
   *
   * NOT what the capture does, and the divergence is deliberate. The original records
   * SERVER-side - `mediaSoupService.startRec(muser)` and
   * `sendServerAdminCommand('startRecMtx', {streams})`, with the server pushing back a `recName`
   * - and the whole bundle contains exactly ONE `new MediaRecorder`, which is the microphone test
   * in the AV settings modal. The original never writes a session media.recording to your computer.
   * Server-side media.recording needs the media.recording/transcoding workers that the deployment plan defers,
   * so this records in the browser instead.
   *
   * Three things were wrong with it:
   *
   *   1. SILENT. `getDisplayMedia({ audio: false })` means `screenStream` carries video only, so
   *      every media.recording was a silent movie. The presenter's microphone is mixed in below.
   *   2. UNREACHABLE. `media.recordedUrl` is only set by the recorder's `stop` event, which also
   *      sets `media.recording = false` - and the menu item that exposed it sat inside `{#if media.recording}`.
   *      It existed only at the moment it became invisible.
   *   3. NEVER SAVED. A blob URL was created and nothing ever downloaded it.
   */
  function startRecording() {
    if (!screenStream || !media.screenSharing || typeof MediaRecorder === 'undefined') return;

    // Video from the share, audio from the mic. `getAudioTracks()` on the display stream is empty
    // by construction, so without this the file has no sound at all.
    const tracks: MediaStreamTrack[] = [...screenStream.getVideoTracks()];
    const micTrack = microphoneStream?.getAudioTracks()[0];
    if (micTrack && micTrack.readyState === 'live') tracks.push(micTrack);
    media.recordedHasAudio = Boolean(micTrack && micTrack.readyState === 'live');
    const recordedStream = new MediaStream(tracks);

    recordedScreenChunks = [];
    /*
      Explicit codec and bitrate, where this was `new MediaRecorder(recordedStream)` with NO options.

      With none, the browser chose both the container and roughly 2.5 Mbps. `docs/streaming-choices.md`
      row 4 measured, on realistic chart content, that VP9 produces 3841 kbps at an 8 Mbps cap and
      keeps scaling, while H.264 saturates near 2033 and ignores anything higher — so the detail was
      available and simply never asked for. See `media.recording-codec.ts` for the full ordering and for
      why 8 Mbps rather than 12: a second 1080p encode competes with the live encoder, and the share
      members are watching matters more than the presenter's own file.
    */
    const recordingOptions = chooseRecordingOptions();
    screenRecorder = new MediaRecorder(recordedStream, {
      // Omitted entirely when nothing is supported: passing an unsupported `mimeType` THROWS, and a
      // media.recording that fails to start is worse than one at the browser's default.
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
        if (media.recordedUrl) URL.revokeObjectURL(media.recordedUrl);
        if (recordedScreenChunks.length === 0) {
          dialogs.alert = 'Nothing was recorded.';
          return;
        }
        const type = screenRecorder?.mimeType || 'video/webm';
        media.recordedUrl = URL.createObjectURL(new Blob(recordedScreenChunks, { type }));
        downloadRecording();
      },
      { once: true }
    );
    // A timeslice, so `dataavailable` fires periodically instead of only at stop. Without it a
    // media.recording lost to a crash or a closed tab is a media.recording with zero chunks.
    screenRecorder.start(1000);
    media.recording = true;
    // The room learns from the server, never from this flag - see `broadcastRecordingState`.
    void broadcastRecordingState('startRec', `room-media.recording-${new Date().toISOString()}`);
    media.recordingPaused = false;
    media.recordingReminder = true;
    menus.set('recording', false);
  }

  /**
   * Writes the finished media.recording to the user's Downloads folder.
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
   * server-side media.recording and therefore no such URL, so the window shows the local media.recording
   * instead. The window model itself is the capture's.
   *
   * The toggle previously flipped `media.recPreviewOpen` and nothing read it anywhere else in the app:
   * a control that changed its own label and did nothing.
   */
  function showRecPreview() {
    if (!media.recordedUrl) return;
    recPreviewWindow?.close();
    recPreviewWindow = window.open(media.recordedUrl, 'RecPreview', 'width=960,height=600');
    menus.set('recording', false);

    // `window.open` returns null when the popup is blocked. Flipping the label to "Hide" anyway
    // would claim a window that is not there, and staying silent looks like a dead button - which
    // is what the control already was. Say what happened; the file is still on disk either way.
    if (!recPreviewWindow) {
      media.recPreviewOpen = false;
      dialogs.alert =
        'Your browser blocked the preview window. Allow pop-ups for this site, or open the downloaded media.recording from your Downloads folder.';
      return;
    }
    media.recPreviewOpen = true;
  }

  function hideRecPreview() {
    recPreviewWindow?.close();
    recPreviewWindow = null;
    media.recPreviewOpen = false;
    menus.set('recording', false);
  }

  function downloadRecording() {
    if (!media.recordedUrl) return;
    const type = screenRecorder?.mimeType || 'video/webm';
    const extension = type.includes('mp4') ? 'mp4' : 'webm';
    // `sv-SE` gives `2026-08-05 20:33:41` - ISO-shaped and already local time, so the name sorts
    // chronologically in Finder without any timezone arithmetic.
    const stamp = new Date().toLocaleString('sv-SE').replace(/[: ]/g, '-');
    const link = document.createElement('a');
    link.href = media.recordedUrl;
    link.download = `room-media.recording-${stamp}.${extension}`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function pauseRecording() {
    if (!screenRecorder || screenRecorder.state !== 'recording') return;
    screenRecorder.pause();
    void broadcastRecordingState('pauseRec');
    media.recordingPaused = true;
    media.recordingReminder = true;
    menus.set('recording', false);
  }

  function resumeRecording() {
    if (!screenRecorder || screenRecorder.state !== 'paused') return;
    screenRecorder.resume();
    void broadcastRecordingState('resumeRec');
    media.recordingPaused = false;
    media.recordingReminder = false;
    menus.set('recording', false);
  }

  function promptForSoundCloud() {
    dialogs.prompt = {
      title:
        'You can play SoundCloud music for all. Click on "Share" from your track or playlist, copy and paste the share url here',
      value: '',
      onconfirm: (value) => {
        dialogs.prompt = null;
        if (!value) return;
        if (value.indexOf('https://soundcloud.com') !== 0) {
          dialogs.alert = 'Invalid SoundCloud URL...';
          return;
        }
        media.soundCloudUrl = value;
        media.soundCloudPlaying = true;
        menus.set('soundcloud', false);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('playSoundCloudForAll', { detail: { url: value } }));
        }
      }
    };
  }

  function stopSoundCloud() {
    media.soundCloudPlaying = false;
    menus.set('soundcloud', false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stopSoundCloudForAll', { detail: { url: null } }));
    }
  }

  function stopSoundCloudForMe() {
    media.soundCloudPlaying = false;
    menus.set('soundcloud', false);
  }

  function toggleTopMenu(menu: 'recording' | 'soundcloud' | 'screen') {
    menus.toggleTop(menu);
  }

  function requestReload() {
    dialogs.confirmation = {
      message: 'Are you sure you want to reload the page?',
      onconfirm: () => window.location.reload()
    };
  }









  
  

  

  

  



  async function sendComposerMessage() {
    const body = chat.composer.trim();
    if (!body) return;

    if (await sendMessageBody(body)) chat.clear('textAreaTxt');
  }

  /**
   * @param bodyHtml Rich text from the editor, when the message was written with it.
   *
   * Sent as a SEPARATE field rather than folded into `body`, because which kind of message this is
   * has to be a fact the row carries — see `chat-rich-text-contract.test.ts`. The server sanitises
   * it and derives its own `body` from the result, so what arrives here as plain text is the
   * optimistic copy and never the stored one.
   */
  async function sendMessageBody(body: string, bodyHtml?: string, room: ChatTab = chat.tab) {
    const trimmedBody = body.trim();
    if (!trimmedBody) return false;

    try {
      await sendMessageCommand({ body: trimmedBody, bodyHtml, room });
    } catch (cause) {
      dialogs.alert = isHttpError(cause) ? cause.body.message : 'Message not sent.';
      return false;
    }
    await invalidateAll();
    return true;
  }

  /* ── The chat rich text editor ────────────────────────────────────────────────────────────────
     The editor lives in `ModalHost`; its session lives here, because the composer hands work to it
     and the send hands work back to the same code path an ordinary message uses. */

  /** The message being composed in the editor, as HTML. */
  let rteDraft = $state('');
  /** `Save` rather than `Send`, and an edit rather than a post. */
  let rteIsEditing = $state(false);
  /**
   * The message being edited, when editing. Null for a new message.
   *
   * `$state.raw`, not `$state`: this is a message row that is only ever REPLACED, never mutated
   * field by field, so a deep proxy over it would cost a proxy read on every property access and
   * buy nothing. Reassignment still triggers, which is the only reactivity this needs.
   */
  let rteEditTarget = $state.raw<MessageActionItem | null>(null);

  /**
   * Text typed in the plain composer, as HTML for the editor.
   *
   * The reference hands its composer's value straight to `summernote('code', …)`, which parses it
   * as markup. Ours escapes it, and that is not a deviation from the feature: `#textAreaTxt` is a
   * `<textarea>`, so its value is TEXT, and rendering text as markup is a category error whoever
   * typed it. Somebody who types a less-than and switches to the editor should see the character
   * they typed, exactly as `chat-rich-text-contract` requires of the renderer.
   *
   * The escaping is the platform's — assign to `textContent`, read back `innerHTML` — rather than a
   * hand-rolled replace over three characters that always turns out to be four.
   */
  function textToEditorHtml(text: string) {
    const holder = document.createElement('div');
    holder.textContent = text;
    return holder.innerHTML;
  }

  /**
   * `openRTEModal()` — the composer's `fa-font` button.
   *
   * ```js
   * openRTEModal() {
   *   this.appService.guiEventBus.emit("doRTEModal", {
   *     channel: this.channel, txt: $("#textAreaTxt")?.val()?.toString()?.trim() || "" });
   *   $("#textAreaTxt")?.val("");
   * }
   * ```
   *
   * Both halves are load-bearing: the composer's text comes WITH you into the editor, and the
   * composer is left empty so the same words cannot be sent twice from two places.
   */
  function openRTEModal() {
    menus.set('emoji', false);
    menus.set('giphy', false);
    rteIsEditing = false;
    rteEditTarget = null;
    // One step, so a half-written message cannot exist in the modal AND behind it — which is a
    // message sent twice.
    rteDraft = textToEditorHtml(chat.take('textAreaTxt'));
    openModal('rich-text');
  }

  /**
   * The editor's Send / Save.
   *
   * ```js
   * sendMessage() {
   *   let e = this.retriveRTEContent();
   *   if (!e || "" === e.trim()) return P("Empty message. Please type a message..."), !1;
   *   this.isEditing ? (sendServerCommand("editChatMessage", {msgID: this.msg._id, newMsg: e}), …)
   *                  : (sendGrpChat(this.channel, e),
   *                     guiEventBus.emit("scrollChatLogToBottom", {force:!0, repeat:!1}));
   *   this.destroyRTE(); $("#rteModal").modal("hide");
   * }
   * ```
   *
   * `retriveRTEContent()` is the gate asked a second time, and it is reproduced rather than
   * skipped: with the gate shut it returns an empty string, so this refuses in the same words.
   *
   * THE EMPTINESS TEST IS THE SERVER'S, not the reference's. Upstream compares against four
   * literal strings, so `<b></b>` — formatting with nothing in it, which is what you get by
   * pressing Bold and then Send — passes, and is then refused by the server with a 400 the modal
   * has nowhere to show. Asking the same question `isEmptyChatHtml` asks (tags stripped, `&nbsp;`
   * treated as the space it looks like) means the person is TOLD, in the reference's own words,
   * rather than left in front of a button that appears to do nothing.
   */
  async function sendRTEMessage() {
    const html = canUseRTE ? rteDraft.trim() : '';
    const text = stripHtmlToText(html);
    if (!text) {
      dialogs.alert = 'Empty message. Please type a message...';
      return;
    }
    const target = rteEditTarget;
    const succeeded = target
      ? await editMessage('chat', target, text, html)
      : await sendMessageBody(text, html);
    if (!succeeded) return;
    rteDraft = '';
    rteIsEditing = false;
    rteEditTarget = null;
    modal = null;
    /*
      NOT scrolled here, and the omission is the point. The reference follows its send with
      `scrollChatLogToBottom {force:!0}`; this room reaches the same place through the autoscroll
      effect above, whose `shouldAutoScrollForMessage` returns true when
      `senderId === connectedUserId` — your own message always wins, whatever you were reading.
      Adding a second scroll would be a duplicate writer of somebody else's scroll position, which
      is how the alerts scroller went wrong once already.
    */
  }

  /**
   * `sendServerAdminCommand('changeChatMode', {mode})` — presenter-only, and re-checked there.
   *
   * No optimistic update; `chat-mode.remote.ts` says why the command hands back nothing to assign.
   * The `return` in the catch is what `if (result.type !== 'success') return` used to buy: a refetch
   * after a refusal re-reads the unchanged row and redraws the radio at the mode nobody picked.
   */
  async function changeChatMode(mode: ChatMode) {
    try {
      await changeChatModeCommand(mode);
    } catch (error) {
      console.error('changeChatMode', mode, error);
      return;
    }
    await invalidateAll();
  }

  /** The extra column's composer, sending into the channel that column is showing. */
  async function sendExtraComposerMessage() {
    const body = chat.extraComposer.trim();
    if (!body) return;
    if (await sendMessageBody(body, undefined, chat.extraTab)) chat.clear(EXTRA_COMPOSER);
  }

  /**
   * The extra column's scroll handler.
   *
   * Its own `isScrollingUp` and its own paging trigger: two scrollers with two positions is the
   * whole point of `app-extra-roomscroller` being a separate component upstream. The paging STATE
   * is shared because it is keyed by channel — two columns showing the same channel are looking at
   * the same history, and should not fetch it twice.
   */
  function trackExtraChatScroll(scroller: HTMLElement) {
    extraChatScrollingUp = isRoomScrollerReadingHistory(scroller);
    if (!extraChatScrollingUp) chatPages.arm(chat.extraTab);
    if (
      !shouldLoadOlderMessages({
        scrollTop: scroller.scrollTop,
        messageCount: visibleExtraChatMessages.length,
        searchTerm: '',
        hasMoreData: chatPages.hasMore(chat.extraTab),
        loadingMore: chatPages.loading
      })
    ) {
      return;
    }
    scroller.scrollTop += CHAT_PAGE_REQUEST_NUDGE;
    void loadOlderChatMessages(chat.extraTab, scroller);
  }

  /**
   * The extra column's rich-text button — `openRTEModal()` on `app-extra-chat`, which reads
   * `#textAreaTxtExtra` rather than `#textAreaTxt` and clears that one.
   */
  function openExtraRTEModal() {
    rteIsEditing = false;
    rteEditTarget = null;
    rteDraft = textToEditorHtml(chat.take(EXTRA_COMPOSER));
    openModal('rich-text');
  }

  function openImageUpload() {
    menus.set('emoji', false);
    menus.set('giphy', false);
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
    const uploadServer = PUBLIC_PTR_UPLOAD_SERVER ?? '';
    const uploadKey = PUBLIC_PTR_CDN_UPLOAD_KEY ?? '';

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

    /*
      `composer-image.remote.ts`, NOT the Files pane's `uploadFile` — that one is presenter-only and
      refused every member while their own upload button sat there enabled. The `File` goes as
      itself; that module cites the two functions in Kit that reduce and revive it.

      Re-thrown, not caught: `uploadComposerImages` already turns a failure into the dialog, so
      swallowing here would post a message with an image that never uploaded.
    */
    try {
      return await uploadComposerImage({ file, originalName: file.name });
    } catch (cause) {
      // `{ cause }` because the rejection is the only record of WHY — an `HttpError` re-thrown as a
      // bare `Error` keeps the sentence and loses the status the server actually answered with.
      throw new Error(isHttpError(cause) ? cause.body.message : 'Upload failed.', { cause });
    }
  }

  async function uploadComposerImages(files: File[], message: string) {
    modal = null;
    if (files.length === 0) return;

    const uploadedUrls: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        dialogs.alert = `Uploading ${index}/${files.length}: ${file.name}. Please wait...`;
        uploadedUrls.push(await uploadOneImage(file));
      }

      const body = `${uploadedUrls.join(' ')}${message ? ` ${message}` : ''}`;
      dialogs.alert = null;
      await sendMessageBody(body);
    } catch (error) {
      console.error(error);
      dialogs.alert = 'Upload Failed...';
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
    // `dontPush` is NOT sent: the action received it and never read it, and `post-alert.remote.ts`
    // refuses it rather than accept a field nothing consumes. The parameter stays; the caller
    // computes it, and the push suppression it names has no consumer in this room yet.
    void dontPush;
    try {
      await postAlertCommand({ kind, body, targetUrl, nonTradeAlert });
    } catch (cause) {
      dialogs.alert = isHttpError(cause) ? cause.body.message : 'Alert not posted.';
      return false;
    }
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
        dialogs.alert = 'Upload Failed...';
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
      dialogs.alert = 'Upload Failed...';
      return false;
    }
  }

  function selectGif(_title: string, url: string) {
    if (sendingGif) return;
    menus.set('giphy', false);
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

  

  

  

  

  

  

  

  

  

  // Server-persisted sizes. These are the ones SSR can see, so they are the source of truth.
  function settingsSplitPair(key: string) {
    return splitPairFromValue(prefs.loaded[key]);
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
        if (legacy) prefs.save(key, legacy);
      }
    }
  }

  function beginSplit(event: PointerEvent, target: 'main' | 'chat-alerts') {
    split.beginDrag(event, target, event.currentTarget as HTMLElement);
    /*
      Stays HERE rather than inside `beginDrag`, because it is the page's decision and not the
      geometry's: suppressing the browser's default drag is what makes the pointer stream usable,
      and it is also why counting native `click` events on this element is not reliable — see the
      `#lastClickAt` note in the class.
    */
    event.preventDefault();
  }

  /**
   * The pointer was released anywhere in the room, which is where the double-click toggle, the
   * mobile no-write rule and the two storage keys are all decided — in `split.endDrag`, with the
   * citations.
   *
   * What is left here is the write itself. `savePreference` mirrors into the decoded settings
   * snapshot, re-seeds the split on a direction change and forwards to the server; a geometry class
   * calling that would own half the room's preference system by accident.
   */
  function finishSplit() {
    const write = split.endDrag(performance.now());
    if (write) prefs.save(write.key, write.pair);
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
      // No initialiser: the `catch` returns, so a value here could never be read.
      let payload: { channel?: string; data?: Record<string, unknown> };
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
              /**
               * `mtxStartStream` / `mtxStopStream` carry the stream under `muser` — the reference's
               * own key (byte 1010826), and the reason `mtx-streams.ts` describes an MTX stream as
               * "simply another muser". Typed `unknown` because `isMtxStream` is what decides.
               */
              muser?: unknown;
              /** `getSessionMTXMediaState`'s full list. Same reason: validated, not asserted. */
              data?: unknown;
            }
          | undefined;

        /*
          The room's media.recording state, for EVERYONE in it. Verbatim:

            subscribe("startRec",  i => { roomState.isRecording = !0;
              !prefs.doNotDisturbOn && prefs.recordingStartSound && !videoOnlyMode && recordingStart.play() })
            subscribe("stopRec",   i => { roomState.isRecording = !1;
              !prefs.doNotDisturbOn && prefs.recordingStopSound  && !videoOnlyMode && recordingStop.play() })
            subscribe("pauseRec",  () => { roomState.isRecordingPaused = !0;
              !prefs.doNotDisturbOn && prefs.recordingStopSound && recordingStop.play() })
            subscribe("resumeRec", () => { roomState.isRecordingPaused = !1;
              !prefs.doNotDisturbOn && prefs.recordingStopSound && recordingStart.play() })

          Two quirks kept because they are the capture's: pause and resume BOTH check
          `prefs.recordingStopSound` (resume plays the start sound behind the stop preference), and
          neither checks `videoOnlyMode` where start and stop do.
        */
        if (command?.cmd === 'startRec') {
          media.roomRecordingStarted(command.recName ?? '');
          if (!prefs.doNotDisturbOn && prefs.recordingStartSound) playSoundEffect('recordingStart');
          return;
        }
        if (command?.cmd === 'stopRec') {
          media.roomRecordingStopped();
          if (!prefs.doNotDisturbOn && prefs.recordingStopSound) playSoundEffect('recordingStop');
          return;
        }
        if (command?.cmd === 'pauseRec') {
          media.roomRecordingPauseChanged(true);
          if (!prefs.doNotDisturbOn && prefs.recordingStopSound) playSoundEffect('recordingStop');
          return;
        }
        if (command?.cmd === 'resumeRec') {
          media.roomRecordingPauseChanged(false);
          if (!prefs.doNotDisturbOn && prefs.recordingStopSound) playSoundEffect('recordingStart');
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
          modal, both of which read `isPresenter && !media.limitedPresenter`. Taking it away puts them
          back.
        */
        if (command?.cmd === 'giveMicScreen') {
          if (command.targetUserId !== data.user.id) return;
          media.micScreenGranted(command.give === true);
          /*
            The recipient is told, in the reference's own words. From offset 2499228:

              appEventBus.subscribe('giveMicScreen', i =>
                i.give ? alertsService.success('You can now Talk / Screenshare')
                       : alertsService.error('You can no longer Talk / Screenshare'))

            `success` and `error`, not one skin for both — losing a capability is not good news, and
            the capture colours it accordingly.
          */
          toasts.show({
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
            `readRoomConfig`. `media.limitedPresenter` is runtime state that never touches the
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
          broadcasts.mp3Started(typeof command.url === 'string' ? command.url : null);
          return;
        }
        if (command?.cmd === 'stopMp3ForAll') {
          broadcasts.mp3Stopped();
          return;
        }

        /*
          `playVideoForAll` / `stopVideoForAll`, verbatim (bytes 1,966,711 and 1,966,882):

            subscribe("playVideoForAll", e => { this.videoPlayerUrl = e.url;
              this.hideVideoPlayer = !0;
              this.isP || this.onMainTabChange("presAreaTabs-videoplayer") })
            subscribe("stopVideoForAll", () => { this.videoPlayerUrl = "";
              this.scheduledVideo.videoURL = ""; this.scheduledVideo.videoPlayTime = null;
              this.hideVideoPlayer = !1;
              this.isP || this.onMainTabChange("presAreaTabs-screens") })

          Room-wide, so no `targetUserId` to match on. The tab move is for NON-presenters only, and
          the reason is visible in the gate it pairs with: a presenter is already able to reach the
          VideoPlayer tab whenever they like, while a member's tab exists only while
          `hideVideoPlayer` is true — dragging them there is what makes it reachable at all, and
          putting them back on screens is what stops them staring at an empty pane afterwards.
        */
        if (command?.cmd === 'playVideoForAll') {
          if (typeof command.url !== 'string') return;
          broadcasts.videoStarted(command.url);
          if (!isPresenter) mainTab = 'videoplayer';
          return;
        }
        if (command?.cmd === 'stopVideoForAll') {
          /*
            The armed timer dies here rather than in the sender, so that a stop sent by ANOTHER
            presenter also cancels this browser's pending play. Clearing it only where the button
            is pressed would leave the first presenter's video arriving minutes after the room was
            told it had been removed.
          */
          broadcasts.videoStopped();
          if (!isPresenter) mainTab = 'screens';
          return;
        }

        /*
          `playYTForAll` / `stopYTForAll` — the floating overlay, on every screen in the room.

            case "playYTForAll": this.guiEventBus.emit("playYTForAll", {url: i.url});
            case "stopYTForAll": this.guiEventBus.emit("stopYTForAll");

          THE SEEK POSITION IS DERIVED, NEVER SENT. The subscriber at byte 1,964,799 is

            let i = 0;
            if (e.startTime) { let o = Number(e.startTime); i = Math.round((Date.now() - o) / 1e3) }
            else this.startTime = 0;

          and `startTime` is absent from the live command above — it arrives only on the late-join
          replay, `emit("playYTForAll", {url: roomState.ytURL, startTime: roomState.ytStartTime})`
          at byte 1,965,054. That replay needs a persisted room video state, which this room does
          not have, so the offset here is always the live command's 0 and no `start=` is appended.
          The gap is recorded in `TODO.md`. What must NOT happen is a `startTime` invented onto the
          wire to make the branch look implemented: the value is a function of when the room
          started playing, and nothing here knows that.
        */
        if (command?.cmd === 'playYTForAll') {
          if (typeof command.url === 'string') broadcasts.youtubeStarted(command.url);
          return;
        }
        if (command?.cmd === 'stopYTForAll') {
          // No payload is read. A url rides with the stop that precedes a play (byte 2,296,932)
          // and the reference's dispatch forwards none of it.
          broadcasts.youtubeStopped();
          return;
        }

        if (command?.cmd === 'changeChatMode') {
          /*
            The one command on this channel that refetches instead of acting, and the reason is in
            the note on `chatMode` above: it is room STATE, held in `room_state` and read by the
            load, so the row stays the only authority. The broadcast carries the new mode as well,
            and it is deliberately NOT read here — trusting it would put room policy in the gift of
            whatever arrives on a socket.
          */
          void invalidateAll();
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

        /*
          The three MediaMTX commands. TWO NAMES HERE ARE NEARLY IDENTICAL AND ARE NOT THE SAME
          THING — this cost a wrong first draft and is written down so it costs nobody else one:

            `getSessionMTXMediaState`  — MTX in the MIDDLE. The WIRE command, both directions. The
                                         client SENDS it bare to ask for the list, and the server
                                         REPLIES with the same name carrying `data`.
            `getSessionMediaStateMTX`  — MTX at the END. An INTERNAL bus event upstream, emitted
                                         with no payload after the reply has been stored in
                                         `globals.roomMediaStateMTX`.

          Decoded at bundle byte 1013960:

            case "getSessionMTXMediaState":
              this.globals.roomMediaStateMTX = i.data,
              this.appEventBus.emit("getSessionMediaStateMTX"); break;

          and byte 989729: `subscribe("fetchSessionMediaStateMTX", () => this.send("getSessionMTXMediaState"))`.

          There is no `globals` here, so the payload goes straight to the reducer and the internal
          event has nothing left to do — one hop instead of three, with no behaviour lost.
        */
        if (command?.cmd === 'mtxStartStream') {
          // `case "mtxStartStream": emit("mtxStartStream", i.muser)` — the key is `muser`, byte 1010826.
          if (isMtxStream(command.muser)) mtx.started(command.muser);
          return;
        }
        if (command?.cmd === 'mtxStopStream') {
          if (isMtxStream(command.muser)) mtx.stopped(command.muser);
          return;
        }
        if (command?.cmd === 'getSessionMTXMediaState') {
          /*
            The full list, and a REPLACE rather than a merge — `this.mtxStreams =
            this.globals.roomMediaStateMTX`. Non-array payloads are ignored rather than coerced to
            `[]`, because an empty list is a meaningful state (it renders "No one is streaming right
            now...") and a malformed frame must not be allowed to assert it.
          */
          if (Array.isArray(command.data)) {
            mtx.replaceFromSession(command.data.filter(isMtxStream));
          }
          return;
        }

        if (command?.cmd !== 'remotePresCommand') return;
        // Addressed to one member; everyone else ignores it.
        if (command.targetUserId !== data.user.id) return;

        if (command.subCmd === 'mutemic' && !media.micMuted) void toggleMicrophone();
        if (command.subCmd === 'mutecam' && !media.camMuted) void toggleWebcam();
        if (command.subCmd === 'mutescreens') stopScreenSharing();
        return;
      }

      /*
        `/roster/` - `handleRosterCmd`'s only load-bearing case:
          case "getRosterCount": this.globals.rosterCount = parseInt(i.data)
        Its sibling `getRosterQueue` logs and does nothing else, so it is not reproduced.
      */
      if (payload.channel === 'roster') {
        /*
          `frame`, not `roster` — the name it had until 2026-08-15, when `RoomRoster` took that
          identifier at the top of the file. A local `const roster` here would have shadowed the
          class for the whole block, and every write below would have gone to a payload object
          instead of the room. Renamed rather than aliased, because the payload is a frame and was
          never the roster.
        */
        const frame = payload.data as
          | {
              cmd?: string;
              data?: number;
              users?: RosterEntry[];
              /** `onUserJoin` / `onUserLeave` carry the person, not a count. */
              userId?: number;
              nick?: string;
            }
          | undefined;
        if (frame?.cmd === 'getRosterCount' && typeof frame.data === 'number') {
          roster.countArrived(frame.data);
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
            `userJoinAndLeavePopup` and the VIEWER preference `prefs.popupOnUserJoin`; the beep needs the
            room's `prefs.beepOnUserJoin` and the viewer's `prefs.beepOnUserJoin`. An owner can turn the feature
            off for the room, and a presenter can turn it off for themselves.
          * `info` for a join, `warning` for a leave — the reference uses two different toast skins,
            and the strings are "logged in." / "logged out." with the full stop.

          THE QUIRK, reproduced: the LEAVE beep reads `sessData.beepOnUserJoin`, not a
          `prefs.beepOnUserLeave` room setting. There is no such room setting upstream — only the viewer
          preference is per-direction. Transcribed rather than tidied.
        */
        if (
          (frame?.cmd === 'onUserJoin' || frame?.cmd === 'onUserLeave') &&
          typeof frame.userId === 'number'
        ) {
          const joined = frame.cmd === 'onUserJoin';
          if (!isPresenter || frame.userId === data.user.id) return;
          const nick = typeof frame.nick === 'string' ? frame.nick : '';

          if (
            data.sessData?.userJoinAndLeavePopup &&
            (joined ? prefs.popupOnUserJoin : prefs.popupOnUserLeave)
          ) {
            toasts.show({
              kind: joined ? 'info' : 'warning',
              message: `${nick} logged ${joined ? 'in' : 'out'}.`,
              enableHtml: false
            });
          }
          if (
            data.sessData?.beepOnUserJoin &&
            (joined ? prefs.beepOnUserJoin : prefs.beepOnUserLeave) &&
            !prefs.doNotDisturbOn
          ) {
            playSoundEffect(joined ? 'userJoin' : 'userLeave');
          }
          return;
        }
        // `getRoster` -> `globals.roster`, which is what the sidebar list and
        // `checkUserOnlineStatus` both read in the capture.
        if (frame?.cmd === 'getRoster' && Array.isArray(frame.users)) {
          /*
            `subscribe("getRoster", () => { this.visibleRoster = globals.roster; this.userSearchTermTxt = "" })`

            The list, the search snapshot and the term are ONE method, because a fresh roster clears
            the search rather than re-filtering it. Without that, a search run once would pin the
            sidebar to that snapshot for the rest of the session — people who joined afterwards
            would never appear, because nothing else ever reassigns it.
          */
          roster.rosterArrived(frame.users);
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

      /* `/privCmdsIn/{uid}-{id}/` - emits `forceReload` and `unmuteChat`, addressed to one member. */
      if (payload.channel === 'privCmds') {
        const command = payload.data as { cmd?: string; targetUserId?: number } | undefined;
        if (command?.cmd === 'forceReload' && command.targetUserId === data.user.id) {
          location.reload();
        }
        /*
          The capture's receiver toast for the unmute, verbatim: `Chat enabled`. It is a plain
          info toast, not the presenter's `user chat unmuted` - those are two different strings on
          two different screens and collapsing them would put the presenter's wording in front of
          the member.

          `invalidateAll()` is what actually re-opens the composer: `chatMutedTill` is read on the
          server, so the gate does not lift until the loader runs again. Toasting without it would
          tell the member they can type while the box stayed disabled.
        */
        if (command?.cmd === 'unmuteChat' && command.targetUserId === data.user.id) {
          toasts.show({ kind: 'info', message: 'Chat enabled', enableHtml: false });
          void invalidateAll();
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
      if (payload.channel === 'chat' && !prefs.doNotDisturbOn && prefs.chatSoundOn) {
        const senderHash = (payload.data as { senderEmailHash?: string } | undefined)?.senderEmailHash;
        const followStyle = senderHash ? followedUsers[senderHash]?.followChatStyle : undefined;
        if (followStyle?.playSound) playSoundEffect('pling');
        else if (data.sessData?.dingOnNewMessage) playSoundEffect('followed');
      }

      /*
        `prefs.visibilityChangeEnabled && !appHasFocus` — do not re-read the room for a hidden tab.

        The MENTION path above has already run, so the one message addressed to you by name still
        reaches you; what is skipped is the full refetch. `missedChatWhileHidden` records that there
        is something to catch up on, so returning to a tab where nothing happened costs nothing.
      */
      if (prefs.visibilityChangeEnabled && !appHasFocus) {
        missedChatWhileHidden = true;
        return;
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
    setSoundEffectsVolume(roomVolume.volume / 100);
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
    /*
      `signalling`, not `media` — renamed 2026-08-15 when `RoomMedia` took that identifier at the
      top of the file. A local `const media` here shadowed the class for the whole block, and three
      of its own reads (`iceServers`, `connected`, `recordedUrl`) resolved to a `SignallingClient`
      that has none of them. `svelte-check` caught it; the rename is to what the object IS.
    */
    const signalling = new SignallingClient({
      url: data.mediaWsUrl,
      grant: async () => {
        const response = await fetch('/api/media/grant', { method: 'POST' });
        if (!response.ok) throw new Error(`grant request failed: ${response.status}`);
        const minted = (await response.json()) as {
          grant: string;
          iceServers?: RTCIceServer[];
        };
        // Component-level now, not a local: the connectivity test reads the same value, so it
        // tests THIS deployment's relay instead of Google's STUN. See `media.iceServers`.
        media.iceServers = minted.iceServers ?? [];
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
      signalling,
      canProduce: joinsMediaAsProducer({
        isPresenter,
        hasMic: data.user.hasMic,
        hasCam: data.user.hasCam,
        hasScreen: data.user.hasScreen
      }),
      iceServers: () => media.iceServers
    });
    mediaSession = session;
    mediaSignalling = signalling;

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

    signalling.on('socketopen', ({ reconnected }) => mediaServerConnected(reconnected));
    signalling.on('disconnected', () => {
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
    signalling.on('connected', () => {
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
          const { producers } = await signalling.request('getProducers');
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
        signalling,
        canProduce: joinsMediaAsProducer({
          isPresenter,
          hasMic: data.user.hasMic,
          hasCam: data.user.hasCam,
          hasScreen: data.user.hasScreen
        }),
        iceServers: () => media.iceServers
      });
      mediaSession = rebuilt;

      try {
        sessionReady = rebuilt.load();
        await sessionReady;
        const { producers } = await signalling.request('getProducers');
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
    signalling.on('newProducer', (info) => {
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
    signalling.on('speechReco', (line) => {
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
    signalling.on('producerPaused', ({ producerId }) => onRemoteAudioPaused(producerId));
    signalling.on('producerResumed', ({ producerId }) => onRemoteAudioResumed(producerId));
    signalling.on('producerClosed', ({ producerId }) => {
      removeRemoteScreen(producerId);
      removeRemoteWebcam(producerId);
      removeRemoteAudio(producerId);
    });
    signalling.on('peerClosed', ({ peerId }) => {
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
     * toasts.show() already dedupes on title+message, so the socket path firing as well cannot
     * produce two identical toasts.
     */
    void signalling.connect().catch(() => {
      // The first connect never reached `socketopen`, so `media.connected` is still false and the
      // transition guard would swallow this. A first failure is a real disconnect to report.
      media.connected = true;
      mediaServerDisconnected();
    });

    /*
      The poll and its visibility handling live at component scope now — see `onVisibilityChange`.
      There were TWO `visibilitychange` listeners on this document, in this component: one tracking
      focus and catching the chat up, one pausing and resuming this timer. Different concerns, both
      correct, and still a duplication nobody would have found by reading either one.

      All that is left here is starting it, because a tab that is already hidden at mount must not.
    */
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
      signalling.close();
      stopRefresh();
      if (previousOpenImageModal) imageModalWindow.openImageModal = previousOpenImageModal;
      else delete imageModalWindow.openImageModal;
      if (alertScrollTimer !== undefined) globalThis.clearTimeout(alertScrollTimer);
      if (chatScrollTimer !== undefined) globalThis.clearTimeout(chatScrollTimer);
      // An armed "play at" that outlives the room would post a broadcast from a page nobody is on.
      broadcasts.clearScheduledVideoTimer();
      toasts.destroy();
      unloadSoundEffects();
      media.stopTalking(data.user.id);
      stopStream(microphoneStream);
      stopStream(webcamStream);
      // Every shared screen, not just the newest: leaving the others running holds the camera or
      // the screen-capture indicator on after the room is gone.
      for (const stream of localScreenStreams.values()) stopStream(stream);
      localScreenStreams.clear();
      stopStream(screenStream);
      if (media.recordedUrl) URL.revokeObjectURL(media.recordedUrl);
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
      menus.set('emoji', false);
      menus.set('giphy', false);
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

    const stream = media.camMuted ? null : webcamStream;
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
      menus.set('notes', false);
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

  /*
    Read by `NotesPane` while a presenter has the editor open, to fill the Version History panel.

    A plain GET rather than `submitNoteMutation`: this changes nothing, so it must not go through
    `invalidateAll()` — doing so would re-run every load function on the page each time a panel
    was opened, and the route already answers with exactly the rows the panel needs.
  */
  async function loadNoteVersions(noteId: number): Promise<readonly NoteVersion[]> {
    const response = await fetch(`/api/notes/${noteId}/versions`);
    if (!response.ok) {
      throw new Error('Unable to load note versions.');
    }
    return (await response.json()) as readonly NoteVersion[];
  }

  /* ── Swing Trade Alerts ──────────────────────────────────────────────────────────────────── */













  /* ── Day Trade Alerts ────────────────────────────────────────────────────────────────────── */













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
      menus.set('files', false);
      openModal('file-upload');
    });
    item.append(link);
    menu.append(item);

    return () => item.remove();
  }
</script>

<!--
  Children [3] and [4] of `div.zoom-controls-container` — the screen overlay's roomVolume.volume dropdown.

  Declared here and passed into `ScreenZoomControls` so the ORDER stays with the component that
  documents it (trio, roomVolume.volume, then the three dark buttons), while the state stays on this page,
  which is where `app-presentationarea` keeps `audioVolume`, `preferences.audioMutedFor`,
  `preferences.audioVolumeFor` and `mediaService.talkingUsers`.
-->
{#snippet screenVolume()}
  <ScreenVolumeControl
    {viewerOnlyMode}
    audioVolume={roomVolume.volume}
    talkingUsers={media.talking}
    preferences={roomVolume.presenterAudio}
    {individualVolumeControls}
    onvolume={(level) => roomVolume.setMasterVolume(level)}
    onmute={() => roomVolume.muteScreenAudio()}
    onunmute={() => roomVolume.unmuteScreenAudio()}
    ontogglepresenter={(user) => roomVolume.toggleTalkingPresenterAudio(user)}
    onpresentervolume={(user, raw) => roomVolume.adjustPresenterVolume(user, raw)}
  />
{/snippet}

{#snippet bodySegmentsPrivate(text: string)}
  {#each text.split(/((?:http|https|ftp):\/\/[\w?=&.@/\-;#~%]+)/gi) as part, index (index)}
    {#if /^(?:http|https|ftp):\/\//i.test(part)}<a
        href={part}
        target="_blank"
        rel="noreferrer"
        class="linkColor"
        onclick={(event) => event.stopPropagation()}>{part}</a
      >{:else}{part}{/if}
  {/each}
{/snippet}


<!-- Not an effect: see `onVisibilityChange`. Svelte owns the add and the remove. -->
<svelte:document onvisibilitychange={onVisibilityChange} />

<svelte:window
  bind:innerWidth={split.viewportWidth}
  onclick={(event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('.textAreaBtns, .popOverDiv')) {
      menus.set('emoji', false);
      menus.set('giphy', false);
    }
    if (target?.closest('.dropdown')) return;
    closeFloatingMenus();
  }}
  onpointermove={(event) => {
    if (split.target) split.dragTo(event, mainElement, alertChatElement);
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
    if (pushToTalkShouldUnmute(event, { pushToTalk: prefs.pushToTalk, micMuted: media.micMuted })) void toggleMicrophone();
    if (shouldBlockCopyKey(event, { disableCopy, isPresenter })) event.preventDefault();

    if (event.key !== 'Escape') return;
    /*
      The emoji and GIF triggers carry ngbPopover's `autoclose: 'outside'`, and that mode
      closes on Escape as well as on an outside click - the click half was already handled
      above, this is the other half.
    */
    if (menus.emoji || menus.giphy) {
      menus.set('emoji', false);
      menus.set('giphy', false);
      return;
    }
    if (selectedImageUrl) selectedImageUrl = null;
    else if (dialogs.confirmation) dialogs.confirmation = null;
    else if (dialogs.prompt) dialogs.prompt = null;
    else if (dialogs.alert) dialogs.alert = null;
  }}
  onkeyup={(event) => {
    /*
      `onKeyUp` — `app-room.full.js:3027-3032`, host-bound on `keyup`
      (`app-room.compiled.js:1274-1280`). The release half of push-to-talk, and the ONLY thing on
      that listener upstream: `disableCopy` has no keyup arm, because suppressing a keystroke has
      to happen on the way down.
    */
    if (pushToTalkShouldMute(event, { pushToTalk: prefs.pushToTalk, micMuted: media.micMuted })) void toggleMicrophone();
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
    class={{ 'detach-screen': detachedScreenId !== null }}
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
      class={['wrapper', { 'push-wrapper': sidebarOpen, 'mt-0': chatOnlyMode || viewerOnlyMode }]}
    >
      <div class="d-flex flex-column-reverse flex-sm-row room-container">
        {#snippet mainNavigation()}
        <!--
          `.mainAppNav` is `RoomNavbar.svelte` since 2026-08-15 — the third of the five template
          regions and the one with the most CONTROLS. Seventy-odd identifiers, two thirds of them
          handlers, and almost every piece of state it reads belonging to `RoomMedia` or
          `RoomMenus`: three instances replace about thirty scalars.

          Nothing in that file starts a recording, opens a device or touches a `MediaStream`. It
          decides what a button LOOKS like; `RoomMedia` says what is true, and the work stays here.
        -->
        <RoomNavbar
          {isPresenter}
          bind:sidebarOpen
          bind:mobileNavOpen
          {media}
          {menus}
          {roster}
          volume={roomVolume.volume}
          presenterAudio={roomVolume.presenterAudio}
          {individualVolumeControls}
          {recordingReminderAllowed}
          {recordingTooltip}
          {mobileAppAvailable}
          {tawkAvailable}
          doNotDisturbOn={prefs.doNotDisturbOn}
          mp3Playing={broadcasts.mp3Playing}
          youtubeForAllUrl={broadcasts.youtubeForAllUrl}
          backgroundVolume={roomVolume.backgroundVolume}
          soundChecks={prefs.soundChecks}
          noSpeakerText={NO_SPEAKER_TEXT}
          shareScreenText={SHARE_SCREEN_TEXT}
          virtualCamText={VIRTUAL_CAM_TEXT}
          stopSharingAllText={STOP_SHARING_ALL_TEXT}
          {setInputChecked}
          {setRangeValue}
          ontoggletopmenu={toggleTopMenu}
          onstartrecording={() => void startRecording()}
          onstoprecording={() => void stopRecording()}
          onpauserecording={pauseRecording}
          onresumerecording={resumeRecording}
          ondownloadrecording={downloadRecording}
          onpromptforsoundcloud={promptForSoundCloud}
          onstopsoundcloud={stopSoundCloud}
          onstopsoundcloudforme={stopSoundCloudForMe}
          ontogglemicrophone={() => void toggleMicrophone()}
          ontogglewebcam={() => void toggleWebcam()}
          onpromptforscreenname={(source) => void promptForScreenName(source)}
          onstopscreensharing={() => void stopScreenSharing()}
          onopensessioncontrol={openSessionControl}
          onsetmastervolume={(level) => roomVolume.setMasterVolume(level)}
          onsetbackgroundvolume={(level) => roomVolume.setBackgroundVolume(level)}
          ontogglemute={() => roomVolume.toggleMute()}
          onadjustpresentervolume={(user, raw) => roomVolume.adjustPresenterVolume(user, raw)}
          ontoggletalkingpresenteraudio={(user) => roomVolume.toggleTalkingPresenterAudio(user)}
          onupdatesoundcheck={(event) => prefs.updateSoundCheck(event)}
          ontoggletawksupport={toggleTAWKSupport}
          ongetmypinanddoinfo={() => void getMyPinAndDoInfo()}
          onrequestreload={requestReload}
          onshowrecpreview={showRecPreview}
          onhiderecpreview={hideRecPreview}
        />
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
        <!--
          `.room-sidebar` is `RoomSidebar.svelte` since 2026-08-15 — the second of the five
          template regions, and the first to take state CLASSES as props rather than a wall of
          scalars. `roster` and `menus` go whole; three references replace about twenty.

          That is the argument for the classes landing BEFORE the components, paying off where it
          can be seen: extracting this markup first would have meant a prop surface the size of the
          file it came from.

          The GATES are passed as the page's own predicates, not re-derived: every authority
          decision in this room is made in one place from data the server owns.
        -->
        <RoomSidebar
          {sidebarOpen}
          {theme}
          {isPresenter}
          session={rosterSession}
          {roster}
          {menus}
          {roomEventsConnected}
          mediaConnected={media.connected}
          {chatAlertsDetached}
          {rosterVisible}
          {rosterCountVisible}
          {archivesAvailable}
          {rowVisible}
          {rosterRowClass}
          locationVisible={(entry) => locationVisibleTo({ isPresenter }, entry)}
          {canOpenRosterPrivateChat}
          {mobileAppAvailable}
          {benzingaVisible}
          {benzingaUrl}
          benzingaLogoUrl={data.sessData?.altBenzingaLogoURL}
          dumpVersion={DUMP_CONTRACT.version}
          onopenmodal={openModal}
          onopenrosteruserinfo={openRosterUserInfo}
          onopenrosterprivatechat={openRosterPrivateChat}
          onmentionrosteruser={mentionRosterUser}
          onselectuser={(id) => (selectedUserId = id)}
          onusersearchkey={doUserSearch}
          ongetmobilepin={() => void getMyPinAndDoInfo()}
          ongetrandomuser={getRandomUser}
          onopentranscript={openTranscriptPage}
          onreopenalertschat={reopenAlertsChat}
          onreload={() => void invalidateAll()}
        />
        {@render mainNavigation()}
        {/if}

<!--
          `z('ngClass', ut(5, QB, videoOnlyMode || chatOnlyMode || viewerOnlyMode))` with
          `QB = (t) => ({'vh-100': t})` (`app-room.render-helpers.js:1639-1648, 11`).

          It is the other half of hiding a column: with the chat and alerts gone the split has one
          child, and `.vh-100 { height: 100vh !important }`
          (`css/complete-app-styles.css:4992`) is what makes the screen fill the window instead of
          keeping the height it had beside them.

          `videoOnlyMode` is the `r` query parameter — the media.recording-bot mode — which this room does
          not model; the same honest gap `files-gates.ts` already records for `hideFiles`. The two
          modes this room does model are bound.
        -->
        <as-split
          {@attach captureMainElement}
          minsize="0"
          id="mainAreaSplit"
          gutterdblclickduration="400"
          class={{ 'is-resizing': split.target !== null, 'vh-100': chatOnlyMode || viewerOnlyMode }}
          style={split.isHorizontal ? undefined : 'flex-direction: column;'}
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
            <AlertChatArea
              {split}
              {alerts}
              {chat}
              {polls}
              {menus}
              {isPresenter}
              doNotDisturbOn={prefs.doNotDisturbOn}
              {pollIsActive}
              {alertFilterConfigured}
              {alertFilterActive}
              {chatOnlyMode}
              {webinarMode}
              {chatEnabled}
              {selfMutedUntil}
              {canPostImages}
              {canUseRTE}
              {giphyApiKey}
              bind:showMessageOptions
              {visibleAlerts}
              {visibleChatMessages}
              {alertLabels}
              {messageChrome}
              {followedUsers}
              {captureAlertChatElement}
              {captureAlertsScroller}
              {captureChatScroller}
              {captureComposerElement}
              {observeComposerWidth}
              onopenmodal={openModal}
              onopenpoll={openPollUI}
              ontogglealertstoolbar={toggleAlertsToolbar}
              ontogglealertssearch={toggleAlertsToolbarSearchOnly}
              ondetachalerts={detachAlerts}
              onsavealerts={saveAlerts}
              onarchivealerts={archiveAlerts}
              onalertsscroll={trackAlertsScroll}
              onchatscroll={trackChatScroll}
              onmessageaction={handleMessageAction}
              onprivatechat={showPrivateChat}
              onexpandcomposer={autoExpandComposer}
              onsend={sendComposerMessage}
              onimageupload={openImageUpload}
              onrte={openRTEModal}
              onselectgif={selectGif}
              onbeginsplit={beginSplit}
            />
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
            <PresentationArea
              {data}
              {split}
              {media}
              {menus}
              {mtx}
              {isPresenter}
              {viewerOnlyMode}
              doNotDisturbOn={prefs.doNotDisturbOn}
              bind:mainTab
              bind:subtitles={prefs.subtitles}
              {currentCaption}
              {captionHistory}
              bind:speechRecoHistoryMode
              {archivesAvailable}
              {openTranscriptPage}
              {previewWindowsVisible}
              {webcamPresenters}
              {webcamCard}
              {attachLocalWebcam}
              {attachRemoteWebcam}
              {closeWebcamPreview}
              videoDisabled={prefs.videoDisabled}
              {sharedScreens}
              {selectedScreenTab}
              {forcedScreenId}
              {lockedScreenId}
              {detachedScreenId}
              {screenStreams}
              {screenPans}
              {zoomLevel}
              {showZoomCtrl}
              bind:isFullScreenshare
              volume={roomVolume.volume}
              {saveData}
              {screenVolume}
              {selectScreenTabByUser}
              {detachScreen}
              {toggleLockScreen}
              {bringEveryoneToScreen}
              {stopSharedScreen}
              {togglePanZoom}
              {panZoomIn}
              {panZoomOut}
              {panZoomReset}
              {hideStreams}
              {streamServerMTX}
              {mtxToken}
              {selectStreamTabByUser}
              {bringEveryoneToStream}
              {toggleLockStreamMtx}
              {noteGates}
              {giphyApiKey}
              bind:newNoteOpen
              {mountNewNoteLink}
              {submitNoteMutation}
              {loadNoteVersions}
              {uploadAlertFiles}
              {swingAlerts}
              {dayTradeAlerts}
              hideVideoPlayer={broadcasts.hideVideoPlayer}
              videoPlayerUrl={broadcasts.videoPlayerUrl}
              scheduledVideoForAll={broadcasts.scheduledVideoForAll}
              playVideoForAll={(url) => broadcasts.playVideoForAll(url)}
              scheduleVideoForAll={(url, whenLocal) => broadcasts.scheduleVideoForAll(url, whenLocal)}
              stopVideoForAll={() => broadcasts.stopVideoForAll()}
              {files}
              {mountUploadFileLink}
              playMp3ForAll={(url) => broadcasts.playMp3ForAll(url)}
              stopMp3ForAll={() => broadcasts.stopMp3ForAll()}
              {openModal}
              youtubeForAllUrl={broadcasts.youtubeForAllUrl}
              stopYoutubeForAll={() => broadcasts.stopYoutubeForAll()}
              closeYoutubeFrame={() => broadcasts.closeYoutubeFrame()}
              mp3Playing={broadcasts.mp3Playing}
              mp3Url={broadcasts.mp3Url}
              {setAutoplayAttribute}
            />
          {/snippet}

          <!--
            `q4e` — the extra chat column, its own `as-split-area` holding `app-extra-chat`.

            A third area, not a second pane inside the chat column: `K4e` renders three areas and
            gates this one on `!hideChatAlerts && preferences.extraChatColumn`. Const 227 is the
            only mobile area carrying an `order` binding, which `RoomSplit.extraChatAreaStyle`
            records; the note there used to end "which this room does not model", and it does now.
          -->
          {#snippet extraChatPane()}
            <as-split-area
              minsize="0"
              class="alert-chat-box as-split-area"
              style={split.extraChatAreaStyle}
            >
              <ExtraChatPane
                bind:tab={chat.extraTab}
                bind:composer={chat.extraComposer}
                messages={visibleExtraChatMessages}
                doNotDisturbOn={prefs.doNotDisturbOn}
                {chatEnabled}
                {webinarMode}
                {selfMutedUntil}
                {showPmButton}
                {canPostImages}
                {canUseRTE}
                {giphyApiKey}
                chrome={messageChrome}
                {followedUsers}
                openMenuKey={menus.messageId}
                onmenutoggle={(key) => menus.openMessageMenu(key)}
                onaction={(action, message, event) =>
                  handleMessageAction('chat', action, message, event, true)}
                onfocus={() => chat.focused(EXTRA_COMPOSER)}
                onsend={() => void sendExtraComposerMessage()}
                onscroll={(scroller) => trackExtraChatScroll(scroller)}
                onscrollerready={(scroller) => (extraChatScroller = scroller)}
                onprivatechat={showPrivateChat}
                onsearch={() => openModal('chat-logs')}
                onsettings={() => openModal('settings')}
                onimageupload={openImageUpload}
                onrte={openExtraRTEModal}
                onselectgif={(url) => selectGif('', url)}
              />
            </as-split-area>
          {/snippet}

          {#snippet mainGutter()}
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <div
              role="separator"
              tabindex="0"
              class="as-split-gutter"
              aria-orientation={split.isHorizontal ? 'horizontal' : 'vertical'}
              aria-valuemin="0"
              aria-valuenow={split.primaryPercent}
              aria-valuetext={`${Math.round(split.primaryPercent)} percent`}
              style={split.isMobileScreen ? 'flex-basis: 11px;' : 'flex-basis: 11px; order: 1;'}
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
                `split.isHorizontal`.
              - there is NO `dragEnd`, so a mobile drag is never recorded. Handled in
                `RoomSplit.endDrag`, which returns no write on that path.
              - the areas carry no `order`. Handled in `split.primaryAreaStyle` and
                `split.presentationAreaStyle`, and it is why this block reorders the DOM instead of
                restyling it.

            The gutter is a snippet for exactly that reason: on a phone it has to sit BETWEEN the two
            panes in document order, because there is no `order` property left to place it with.

            Snippets rather than a second copy of the markup: the two panes are ~1,625 lines, and a
            duplicated layout is one that drifts the first time somebody edits the version they
            happen to be looking at.
          -->
          {#if split.isMobileScreen}
            {#if !hidePresentation}{@render presentationPane()}{/if}
            {@render mainGutter()}
            {#if !hideChatAlerts}{@render chatAlertsPane()}{/if}
            {#if !hideChatAlerts && extraChatColumnVisible}{@render extraChatPane()}{/if}
          {:else}
            {#if !hideChatAlerts}{@render chatAlertsPane()}{/if}
            {#if !hideChatAlerts && extraChatColumnVisible}{@render extraChatPane()}{/if}
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
        `adjustVol` does `$("[id^=msRemAudio-]").prop("roomVolume.volume", …)` (bundle byte 2517022),
        `adjustVolPres` targets one peer's element, and `reconnectAudio` does
        `$("[id^='msRemAudio-']").remove()` before re-subscribing. This room already queries that
        exact prefix in `roomVolume.setMasterVolume`, against elements that had no id at all - so the master
        roomVolume.volume slider moved nothing.
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
      mediaIceServers={media.iceServers}
      {mobilePin}
      modAlertFilterList={data.sessData?.modAlertFilterList}
      bind:alertFilterFor={alerts.filterFor}
      bind:showAlertsFrom={alerts.showFrom}
      onsavealertfilter={saveAlertFilter}
      onopenalertfilter={() => openModal('alert-filter')}
      mobileAndroidUrl={data.sessData?.customMobileAppEnabled
        ? data.sessData?.customMobileAppAndroidUrl
        : null}
      mobileIosUrl={data.sessData?.customMobileAppEnabled
        ? data.sessData?.customMobileAppIOSUrl
        : null}
      hideMobileCredentials={Boolean(data.sessData?.hideMobileCredentials)}
      isLimitedPresenter={media.limitedPresenter}
      canEditUsername={Boolean(data.sessData?.allowUsersToChangeUsername)}
      alerts={searchableAlerts}
      {chatMode}
      onChatModeChange={(mode) => void changeChatMode(mode)}
      {canUseRTE}
      {rteDraft}
      {rteIsEditing}
      onRteDraftChange={(html) => (rteDraft = html)}
      onRteSend={() => void sendRTEMessage()}
      {settingsTab}
      {alertTab}
      {theme}
      roomSplitDir={split.direction}
      {sessionControlInitialTab}
      chatStyle={globalChatStyle}
      doNotDisturbOn={prefs.doNotDisturbOn}
      alertSoundOn={prefs.alertSoundOn}
      nonTradeSound={prefs.nonTradeSound}
      alertPopup={prefs.alertPopup}
      longerAlertPopup={prefs.longerAlertPopup}
      qaSoundOn={prefs.qaSoundOn}
      chatSoundOn={prefs.chatSoundOn}
      pollOpenMode={polls.openMode}
      pollRestoreToken={polls.restoreToken}
      activePoll={data.activePoll}
      savedPolls={data.savedPolls}
      onclose={closeActiveModal}
      onSettingsTab={(tab) => (settingsTab = tab)}
      onAlertTab={(tab) => (alertTab = tab)}
      onTheme={setTheme}
      onPreferenceChange={(key, value) => prefs.save(key, value)}
      {saveData}
      onSaveDataChange={setSaveData}
      onDoNotDisturbChange={(enabled) => (prefs.doNotDisturbOn = enabled)}
      onPlayYoutube={(url) => void broadcasts.playYoutubeForAll(url)}
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
      onAlert={(message) => (dialogs.alert = message)}
      onConfirm={(message, onconfirm) => dialogs.confirm(message, onconfirm)}
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
      streamingType={typeof prefs.loaded.streamingType === 'string' ? prefs.loaded.streamingType : ''}
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
    <!--
      `imgUpload('swing')` — the swing form's own upload dialog.

      A SECOND instance rather than a share of the composer's `modal === 'image-upload'`: the
      reference's `imgUpload` takes the feature name as an argument and opens a dialog whose
      completion belongs to that feature, and routing the swing upload through the composer's
      handler would post the image into chat instead of putting its URL in the form.
    -->
    {#if swingAlerts.imageUpload}
      <ImageUploadDialog
        onclose={() => swingAlerts.cancelImageUpload()}
        onupload={(files) => void swingAlerts.completeImageUpload(files)}
      />
    {/if}
    <!--
      `onImagePaste(event, 'swing')` puts the pasted image in a `bootbox.confirm` before uploading,
      so a stray paste cannot silently push bytes to the upload server.
    -->
    {#if swingAlerts.imagePaste}
      {@const pastePreviewUrl = swingAlerts.imagePaste.previewUrl}
      <BootboxDialog
        mode="confirm"
        message=""
        onclose={() => swingAlerts.closeImagePaste()?.resolve(null)}
        onconfirm={() => void swingAlerts.confirmImagePaste()}
      >
        <div class="text-center">
          <img src={pastePreviewUrl} class="img-fluid" alt="Pasted screenshot" />
        </div>
      </BootboxDialog>
    {/if}
    <!--
      `imgUpload('dayTrade')` — the day trade form's own upload dialog.

      A THIRD instance rather than a share of the composer's or the swing form's: `imgUpload` takes
      the feature name as an argument and `doImggurUpload` dispatches on it deny-by-default —
      `"swing" === i ? swingAlert.image = F : "dayTrade" === i && (dayTradeAlert.image = F)` at byte
      1,992,037 — so the completion belongs to exactly one feature. Routing this through either of
      the others would put the URL in the wrong box or post the image into chat.
    -->
    {#if dayTradeAlerts.imageUpload}
      <ImageUploadDialog
        onclose={() => dayTradeAlerts.cancelImageUpload()}
        onupload={(files) => void dayTradeAlerts.completeImageUpload(files)}
      />
    {/if}
    <!--
      `onImagePaste(event, 'dayTrade')` puts the pasted image in a `bootbox.confirm` before
      uploading, so a stray paste cannot silently push bytes to the upload server.
    -->
    {#if dayTradeAlerts.imagePaste}
      {@const dayTradePastePreviewUrl = dayTradeAlerts.imagePaste.previewUrl}
      <BootboxDialog
        mode="confirm"
        message=""
        onclose={() => dayTradeAlerts.closeImagePaste()?.resolve(null)}
        onconfirm={() => void dayTradeAlerts.confirmImagePaste()}
      >
        <div class="text-center">
          <img src={dayTradePastePreviewUrl} class="img-fluid" alt="Pasted screenshot" />
        </div>
      </BootboxDialog>
    {/if}
    {#if pendingGifUrl}
      <GifConfirmDialog
        url={pendingGifUrl}
        onclose={cancelGif}
        onconfirm={() => void confirmGif()}
      />
    {/if}
    {#if dialogs.confirmation}
      <BootboxDialog
        mode="confirm"
        message={dialogs.confirmation.message}
        className={dialogs.confirmation.className}
        onclose={() => {
          const dismissed = dialogs.confirmation?.ondismiss;
          dialogs.confirmation = null;
          dismissed?.();
        }}
        onconfirm={dialogs.confirmation.onconfirm}
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
    {#if roster.pick}
      <BootboxDialog
        mode="alert"
        message=""
        title="Random User"
        className="random-user-modal"
        onclose={() => roster.closeDraw()}
      >
        {#if roster.pick.revealed}
          <h2 class="text-center flash animated">{roster.pick.entry.displayName}</h2>
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
          {#if roster.pick?.revealed}
            <button
              type="button"
              class="btn btn-warning btn-random-user"
              onclick={() => roster.pick && openRosterUserInfo(roster.pick.entry)}
            >
              User Info
            </button>
          {/if}
          <button type="button" class="btn btn-danger" onclick={() => roster.closeDraw()}>Close</button>
        {/snippet}
      </BootboxDialog>
    {/if}
    {#if dialogs.alert}
      <BootboxDialog mode="alert" message={dialogs.alert} onclose={() => (dialogs.alert = null)} />
    {/if}
    {#if dialogs.prompt}
      <BootboxDialog
        mode="prompt"
        message=""
        title={dialogs.prompt.title}
        value={dialogs.prompt.value}
        onclose={() => (dialogs.prompt = null)}
        onconfirm={(value) => dialogs.prompt?.onconfirm(value ?? '')}
      />
    {/if}
    <ToastHost
      toasts={toasts.notices}
      ondismiss={(id) => toasts.dismiss(id)}
      onstick={(id) => toasts.stick(id)}
      onresume={(id) => toasts.resume(id)}
    />
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
      `app-privchat` is its own component since 2026-08-15 — the first of the five template
      regions, and the smallest, chosen to prove the pattern on a floating panel rather than on a
      pane a member looks at all day.

      PROPS, not context, and the reasoning is in the component's own header: these state classes
      are instantiated inside this file, so they are per-request already and there is nothing for
      `createContext` to protect against. It is a direct child; a context layer for a one-level hop
      is indirection with no reader.

      `showPMToolbar` did NOT come along as a prop. It was page state that nothing outside that
      markup read or wrote, so it is component-local now — the part of this extraction that removes
      a line rather than relocating one.
    -->
    <PrivateChatPanel
      open={privateChatOpen}
      doNotDisturb={prefs.doNotDisturbOn}
      {isPresenter}
      peer={selectedMessageUser}
      tabs={chatTabs}
      currentUserId={currUser}
      log={privateChatLog}
      searching={pmSearching}
      bind:searchTerm={pmSearchTerm}
      bind:draft={privateChatDraft}
      body={bodySegmentsPrivate}
      formatTime={privateChatTime}
      onclosepeer={() => {
        selectedMessageUser = null;
        selectedMessage = null;
      }}
      ondeletethis={deleteThisPM}
      onclose={closePrivateChatPanel}
      onsearch={(term) => void onEnterSearchPrivateChat(term)}
      ondonotdisturb={setDND}
      ondownload={downloadPrivateChatLog}
      onswitchuser={switchChatToUser}
      onloadmore={(uid, page) => loadPrivateChatLog(uid, page)}
      onsend={() => void sendPrivateMessage()}
    />
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
