<script lang="ts">
  import { deserialize } from '$app/forms';
  import {
    chatComposerEnabled,
    isChatMode,
    isWebinarMode,
    type ChatMode
  } from '$lib/chat-mode';
  import { RoomMenus } from '$lib/room/menus.svelte';
  import { RoomPolls } from '$lib/room/polls.svelte';
  import { page } from '$app/state';
  import { invalidate, invalidateAll } from '$app/navigation';
  // The first remote function in this app. Aliased because the local wrapper below keeps the name.
  import { unmuteChat as unmuteChatCommand } from './chat-mute.remote';
  import { getMyMobilePin } from './mobile-pin.remote';
  import {
    deletePrivateChatLog as deletePrivateChatLogCommand,
    loadPrivateChatLog as loadPrivateChatLogCommand,
    sendPrivateMessage as sendPrivateMessageCommand
  } from './private-chat.remote';
  import { focusOnScreen, presenterCommand } from './presenter-commands.remote';
  import { videoForAll, youtubeForAll } from './for-all-broadcast.remote';
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
  import { onMount, tick } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { SignallingClient } from '$lib/media/signalling';
  import { MediaSession } from '$lib/media/session';
  import { checkPermissionState } from '$lib/media-capture-error';
  import { MtxStreamTabs } from '$lib/room-mtx.svelte';
  import ScreenVolumeControl from '$lib/components/ScreenVolumeControl.svelte';
  import {
    archivesAvailableTo,
    rosterBlockVisible,
    rosterCountVisibleTo,
    rosterRowClass,
    rosterRowVisible,
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
  import { RoomPrivateChat } from '$lib/room/private-chat.svelte';
  import { RoomComposer } from '$lib/room/composer.svelte';
  import { RoomAlertsPane } from '$lib/room/alerts-pane';
  import { RoomFeedScroll } from '$lib/room/feed-scroll';
  import { RoomFeeds } from '$lib/room/feeds.svelte';
  import { RoomMessageActions } from '$lib/room/message-actions.svelte';
  import { RoomEventStream } from '$lib/room/events.svelte';
  import { RoomMediaTransport } from '$lib/room/media-transport.svelte';
  import { RoomRecording } from '$lib/room/recording';
  import { RoomWindowHandlers } from '$lib/room/window-handlers';
  import {
    RoomWebcams,
    setAutoplayAttribute,
    setWebcamAudioAttributes
  } from '$lib/room/webcams';
  import { RoomScreens } from '$lib/room/screens.svelte';
  import { RoomUserActions } from '$lib/room/user-actions.svelte';
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
  import { tawkAttributes, tawkScript, tawkSupportAvailable } from '$lib/tawk-support';
  import {
    RoomSplit,
    isRoomSplitDir,
    splitPairFromValue,
    splitStorageKeys
  } from '$lib/room/split.svelte';
  import { shouldDisableSelection } from '$lib/room-key-gates';
  import AlertChatArea from '$lib/components/AlertChatArea.svelte';
  import PresentationArea from '$lib/components/PresentationArea.svelte';
  import RoomOverlays from '$lib/components/RoomOverlays.svelte';
  import ExtraChatPane from '$lib/components/ExtraChatPane.svelte';
  import { resolveNoteSurfaceGates } from '$lib/components/notes/note-gates';
  import { swingAlertsTabVisible } from '$lib/swing-alerts';
  import type { SwingAlertRow } from '$lib/types';
  import { parseAlertLabels } from '$lib/alert-labels';
  import { alertFilterAvailable, alertPassesFilter } from '$lib/alert-filter';
  import { dayTradeAlertsTabVisible } from '$lib/day-trade-alerts';
  import type { DayTradeAlertRow } from '$lib/types';
  import { isMentionOf } from '$lib/mention';
  import PrivateChatPanel from '$lib/components/PrivateChatPanel.svelte';
  import {
    NO_SPEAKER_TEXT,
    SHARE_SCREEN_TEXT,
    STOP_SHARING_ALL_TEXT,
    VIRTUAL_CAM_TEXT
  } from '$lib/navbar-labels';
  import RoomNavbar from '$lib/components/RoomNavbar.svelte';
  import RoomSidebar from '$lib/components/RoomSidebar.svelte';
  import { resolveAlertDelivery } from '$lib/alert-delivery';
  import { DUMP_CONTRACT } from '$lib/dump-contract';
  import {
    initializeSoundEffects,
    playSoundEffect,
    setSoundEffectsVolume,
    unloadSoundEffects
  } from '$lib/sound-effects';
  import type {
    AlertTab,
    ChatTab,
    FollowChatStyle,
    MainTab,
    ModalName,
    NoteVersion,
    SessionControlTab,
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
  /*
    The eleven floating menus, in `$lib/room/menus.svelte.ts`.

    They were eleven separate flags closed by TWO functions with two different lists — `openModal`
    left the top-bar dropdowns open, `closeFloatingMenus` left the emoji and GIF pickers open. Both
    behaviours are preserved exactly and are now named `closeForModal` and `closeFloating`, so the
    difference is a decision somebody can read rather than a divergence nobody can see.
  */
  const menus = new RoomMenus();
  let newNoteOpen = $state(false);
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
    The screen VIEWER, in `$lib/room/screens.svelte.ts`.

    Phase 5 slice 11. Which tab is showing, how far it is zoomed, where it is panned, and the popout
    windows a presenter can detach a screen into.

    It deliberately does NOT own `sharedScreens`: the SFU transport fills that list, and a field
    written on both sides of a boundary is not extracted, it is shared. The list crosses as a thunk
    and its removal as a receiver — the rule slice 13 paid for with `followedUsers`.

    The two transport sites that used to write the three ids by hand call `screenAdded` and
    `screenRemoved` now, because each is one whole state change and a caller with three setters can
    make a third of it.
  */
  const screens = new RoomScreens({
    dialogs,
    screens: () => mediaTransport.screens,
    removeScreen: (screenId) => mediaTransport.removeScreen(screenId),
    isLocalScreen: (screenId) => mediaTransport.isLocalScreen(screenId),
    stopLocalScreen: (screenId) => mediaTransport.stopLocalScreen(screenId),
    selectTabOfId: (screenId) => mediaTransport.selectScreenTabOfId(screenId),
    searchParams: () => page.url.searchParams,
    sessionHandle: () => data.sessionHandle,
    isPresenter: () => isPresenter,
    followMyScreens: () => prefs.makeUsersFollowMyScreens,
    focusOnScreen: (screenId) => focusOnScreen(screenId)
  });

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
    uploadImages: (files) => composer.uploadAlertFiles(files)
  });
  // The same one-time seed, for the same reason.
  // svelte-ignore state_referenced_locally
  const dayTradeAlerts = new RoomTradeAlerts<DayTradeAlertRow, DayTradeAlertAction>({
    dialogs,
    feed: DAY_TRADE_ALERT_FEED,
    seed: data.dayTradeAlerts,
    enabled: () => dayTradeAlertsTabVisible(data.sessData ?? {}),
    uploadImages: (files) => composer.uploadAlertFiles(files)
  });
  /*
    The private-chat panel, in `$lib/room/private-chat.svelte.ts`.

    Phase 5 slice 7. Twenty-four declarations and functions that were spread across four regions of
    this file — the state at 1,263, the roster entry points at 2,000 and the behaviour at 4,585 —
    and that read each other constantly: `ingest` alone touches six of the nine fields.

    The session goes in as a THUNK, so a navigation reaches the tab strip. The roster row type is a
    class parameter rather than a narrowed copy, because `openFromRoster` hands the row straight on
    to `selectRosterUser` and that wants all of it.

    `onCleared` is `selectedMessageUser`, which the panel's close clears and which belongs to the
    message-action path rather than to the panel. It crosses as a callback rather than as a field
    the class would then co-own with a feature it knows nothing about.
  */
  // The roster row type, given explicitly: nothing in the options infers it, so without this the
  // class would be instantiated at its constraint and `selectRosterUser` would receive a narrowed
  // row where the roster wants the whole one.
  const privateChat = new RoomPrivateChat<(typeof data.connectedUsers)[number]>({
    dialogs,
    prefs,
    commands: {
      loadLog: (payload) => loadPrivateChatLogCommand(payload),
      send: (payload) => sendPrivateMessageCommand(payload),
      deleteLog: (payload) => deletePrivateChatLogCommand(payload)
    },
    session: () => data,
    isPresenter: () => isPresenter,
    viewerOnlyMode: () => viewerOnlyMode,
    playSound: (name) => playSoundEffect(name),
    closeUserMenu: () => menus.openUserMenu(null),
    selectRosterUser: (user) => userActions.select(user),
    onCleared: () => userActions.clearSelectedMessageUser(),
    onThreadDeleted: () => invalidateAll()
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
  /*
    The SFU TRANSPORT, in `$lib/room/media-transport.svelte.ts`.

    Phase 5 slice 4, the largest of the phase: the session, the producers this browser publishes,
    the consumers it subscribes to, and every stream on either side.

    `RoomMedia` holds what the UI ASKS FOR; this holds what the wire did about it. That boundary is
    `media.svelte.ts`'s own recorded decision — "STATE moved, TRANSPORT did not" — and this is the
    other half of the sentence rather than a revision of it.

    Constructed AFTER `screens`, because the viewer is handed to it. The two hand-offs the other way
    — `screens`'s list thunk and its removal receiver — read `mediaTransport` through arrows, which
    is why the order only has to satisfy the compiler.
  */
  const mediaTransport: RoomMediaTransport = new RoomMediaTransport({
    dialogs,
    toasts,
    media,
    screens,
    session: () => data,
    closeScreenMenu: () => menus.set('screen', false),
    videoDeviceId: () =>
      typeof prefs.loaded.videoDeviceID === 'string' ? prefs.loaded.videoDeviceID : undefined,
    roomVolume,
    beginSpeech: () => recording.beginSpeechRecognition(),
    endSpeech: () => recording.endSpeechRecognition(),
    stopRecording: () => recording.stopRecording(),
    showScreensTab: () => (mainTab = 'screens'),
    checkPermissionState: (kind, userAgent) => checkPermissionState(kind, userAgent)
  });
  /*
    Everything that can be DONE to a user, in `$lib/room/user-actions.svelte.ts`.

    Phase 5 slice 13, and the largest single function in this file went with it: `handleUserAction`
    was 249 lines. What holds the twenty-three declarations together is that every one of them reads
    the same two things — WHO is selected, and what this viewer may do — and `ModalHost` reads the
    resolved `target` a hundred times.

    Constructed after `toasts` because it needs one, and after `privateChat` even though
    `privateChat` is handed `select`. That is not a cycle: the hand-off is an arrow, evaluated
    when a roster row is clicked rather than when the class is built.

    `defaultFollowStyle` is injected rather than moved — it reads the theme preference, and
    `alerts-background-contract.test.ts` pins it against THIS file by name because it is about a
    captured colour rather than about this class.
  */
  /*
    Everything that LEAVES this browser as content, in `$lib/room/composer.svelte.ts`.

    Phase 5 slice 10. Five entry points — plain composer, extra column, rich text, image upload,
    GIF — that all funnel into one `sendBody`, plus the two alert paths that share its uploader.
    They were spread from line 1,326 to line 5,215 and every one of them had its own refusal
    handling.

    `editMessage` is injected rather than moved: opening the editor on an EXISTING message is the
    message-action path's job, and injecting it is what leaves slice 8 free to move that later.

    The upload server and key cross as values rather than being imported inside, so the class has no
    opinion about where configuration comes from and its fallback can be exercised by passing empty
    strings.
  */
  /*
    ANNOTATED, and the annotation is load-bearing rather than decoration.

    `composer` takes `editMessage` from `messageActions`, and `messageActions` takes `composer`.
    Both hand-offs are arrows, so at RUNTIME the order is fine - but TypeScript cannot infer
    either type without the other and reports both as implicitly `any`. One explicit type breaks
    the cycle; without it the whole file loses its checking silently.
  */
  const composer: RoomComposer = new RoomComposer({
    dialogs,
    chat,
    commands: {
      send: (payload) => sendMessageCommand(payload),
      uploadImage: (payload) => uploadComposerImage(payload),
      postAlert: (payload) => postAlertCommand(payload)
    },
    session: () => data,
    prefs,
    isPresenter: () => isPresenter,
    openModal: (name) => openModal(name),
    closeModal: () => (modal = null),
    closeMenu: (name, open) => menus.set(name, open),
    editMessage: (kind, item, body, bodyHtml) => messageActions.editMessage(kind, item, body, bodyHtml),
    onSent: () => invalidateAll(),
    uploadServer: PUBLIC_PTR_UPLOAD_SERVER ?? '',
    uploadKey: PUBLIC_PTR_CDN_UPLOAD_KEY ?? ''
  });
  /*
    What a click on a MESSAGE can do, in `$lib/room/message-actions.svelte.ts`.

    Phase 5 slice 8, and it went LAST of the domain slices deliberately. This dispatcher reached
    into rich-text composer state, the private-chat panel, the evidence overlay, the modal shell and
    the mention router — all page-level when the phase began, all their own class now. Extracting it
    first would have meant a dozen injected callbacks rewritten three times as those slices landed.

    `openPrivateChat` is ONE receiver rather than two calls, because showing the panel and opening
    the thread must happen together — a caller with both can show an empty panel. `focusComposer`
    stays here because the element does: `composerElement` is a `bind:this`, and a class cannot
    hold it without also owning when it mounts.
  */
  const messageActions = new RoomMessageActions({
    dialogs,
    toasts,
    chat,
    composer,
    session: () => data,
    sendOperation: (payload) => messageAction(payload),
    askQuestion: (payload) => askQuestion(payload),
    replyMessage: (payload) => replyMessage(payload),
    openModal: (name) => openModal(name),
    closeMessageMenu: () => menus.openMessageMenu(null),
    selectUser: (user) => (userActions.selectedMessageUser = user),
    patchEvidence: (item, patch) => feeds.patchEvidence(item, patch),
    openPrivateChat: (peerId) => {
      privateChat.show();
      void privateChat.switchToUser(peerId);
    },
    openImage: (event, url) => openImageModal(event, url),
    clearUnreadQa: (id) => unreadQaAlertIds.delete(id),
    focusComposer: () =>
      requestAnimationFrame(() => {
        composerElement?.focus();
        composerElement?.setSelectionRange(chat.composer.length, chat.composer.length);
      }),
    onChanged: () => invalidateAll()
  });

  const recording = new RoomRecording({
    dialogs,
    media,
    menus,
    prefs,
    mediaTransport,
    isPresenter: () => isPresenter
  });

  /*
    THE WEBCAM CARDS, in `$lib/room/webcams.ts`.

    Phase 5 slice 21. It RENDERS; it does not capture — `mediaTransport` acquires the camera and
    produces it, and this decides what a card looks like and which element the stream lands in. The
    two attribute setters beside it are module functions rather than methods, because neither reads
    any instance state.
  */
  /*
    THE WINDOW LISTENERS' bodies, in `$lib/room/window-handlers.ts`.

    Phase 5 slice 18. The bindings stay on `<svelte:window>` at the bottom of this file, because
    that is how Svelte says to attach a window listener and it owns the add and the remove. What
    moved is the hundred lines of body and citation that were sitting inside the attribute values.

    `selectedImageUrl` crosses BOTH ways — Escape reads it to decide what to close and clears it —
    so it is a reader plus a receiver, unlike slice 22's detach flag where only the write crossed.
  */
  const windowHandlers = new RoomWindowHandlers({
    menus,
    split,
    prefs,
    media,
    mediaTransport,
    dialogs,
    mainElement: () => mainElement,
    alertChatElement: () => alertChatElement,
    disableCopy: () => disableCopy,
    isPresenter: () => isPresenter,
    chatOnlyMode: () => chatOnlyMode,
    selectedImageUrl: () => selectedImageUrl,
    clearSelectedImage: () => (selectedImageUrl = null)
  });

  const webcams = new RoomWebcams({
    media,
    mediaTransport,
    sessionHandle: () => data.sessionHandle
  });

  const userActions = new RoomUserActions<(typeof data.connectedUsers)[number]>({
    dialogs,
    toasts,
    commands: {
      presenter: (payload) => presenterCommand(payload),
      editUsername: (payload) => editUsername(payload),
      unmuteChat: (payload) => unmuteChatCommand(payload)
    },
    session: () => data,
    isPresenter: () => isPresenter,
    talking: () => media.talking,
    rosterUsers: () => roster.users,
    savePreference: (key, value) => prefs.save(key, value),
    openModal: (name) => openModal(name),
    closeModal: () => (modal = null),
    closeUserMenu: () => menus.openUserMenu(null),
    mentionUser: (name) => messageActions.mention(name),
    clearSelectedMessage: () => messageActions.clearSelected(),
    hidePreviewWindows: () => (previewWindowsVisible = false),
    defaultFollowStyle: () => defaultFollowChatStyle(),
    reload: () => invalidateAll()
  });

  /*
    The room's REALTIME CHANNEL, in `$lib/room/events.svelte.ts`.

    Phase 5 slice 5, and the largest single function left after slice 4: `subscribeToRoomEvents`
    was 575 lines routing six channels. The browser-side geolocation travels with it because it is
    the other thing this page starts and stops at the same two moments.

    Constructed AFTER `mediaTransport`, which it calls on three commands. Every collaborator below
    is something the stream ROUTES TO; it owns only the four fields describing the connection.

    `restartMediaSession` is a thunk returning a thunk, and that shape is load-bearing: the page
    does not define the rebuild until `onMount` has run, and a `giveMicScreen` frame can arrive
    before that. Passing the value would capture `null` forever.
  */
  const roomEvents = new RoomEventStream<RosterEntry>({
    prefs,
    toasts,
    media,
    broadcasts,
    mediaTransport,
    mtx,
    roster,
    privateChat,
    userActions,
    session: () => data,
    isPresenter: () => isPresenter,
    appHasFocus: () => appHasFocus,
    restartMediaSession: () => restartMediaSession,
    showTab: (tab) => (mainTab = tab),
    chatMissedWhileHidden: () => (missedChatWhileHidden = true)
  });
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


  let previewWindowsVisible = $state(true);
  let showMessageOptions = $state(false);
  
  
  
  
  
  
  
  
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


  
  let mainElement: HTMLElement | undefined;
  let alertChatElement: HTMLElement | undefined;
  let composerElement: HTMLTextAreaElement | undefined;
  let alertsScroller = $state<HTMLElement | undefined>();
  let chatScroller = $state<HTMLElement | undefined>();
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
    What each pane actually RENDERS, in `$lib/room/feeds.svelte.ts`.

    Phase 5 slice 9. The read pipelines and the client-side evidence overlay, which look separate
    and are one thing: every pipeline filters on the overlay and maps it, so a class holding the
    state without the pipelines would be a field with four readers across a boundary.

    Generic over BOTH row types. `RoomAlerts`'s predicates take `AlertRow` — body, sender, hash,
    timestamp — which is narrower than `MessageActionItem`, and widening it to make one type fit
    would have loosened a contract four other call sites depend on.

    The unbounded `visibleAlerts` pass is recorded in the class and in `TODO.md` and deliberately
    NOT fixed here: it changes behaviour, and that belongs in its own change with its own
    measurement rather than inside a move.
  */
  const feeds = new RoomFeeds<(typeof data.alerts)[number], (typeof data.messages)[number]>({
    alerts,
    chat,
    alertPages,
    chatPages,
    session: () => data,
    prefs,
    isPresenter: () => isPresenter,
    webinarMode: () => webinarMode,
    theme: () => theme,
    unreadQa: unreadQaAlertIds,
    alertsLogKey: ALERTS_LOG
  });

  /*
    THE ALERTS PANE's own actions, in `$lib/room/alerts-pane.ts`.

    Phase 5 slice 22: archive, export, detach and the two toolbar toggles — what a viewer DOES to
    the pane, as against what `RoomAlerts` and `RoomFeeds` know about the alerts themselves.

    `chatAlertsDetached` is written on both sides of this boundary, so only the RECEIVER crosses:
    the class writes it and this file reads it to lay out. A reader thunk was supplied at first and
    eslint refused it as a collaborator nothing consumes.
  */
  /*
    SCROLL-FOLLOW and PAGING for all three feeds, in `$lib/room/feed-scroll.ts`.

    Phase 5 slice 23. One mechanism and three instances of it: a flag per feed saying the reader has
    scrolled up into history, a tracker that sets it, and a paging arm that is disarmed while it is
    set.

    The three flags MOVED rather than staying here, and that is a change of ownership. They were
    written from two sides — the trackers, and the follow effects below that clear them on the tick
    they pull a feed to the bottom — and two writers of one flag is how a feed ends up following
    while its reader is halfway up the log. The effects now ask: `…ReadingHistory` to read,
    `stopReadingHistory` to clear.
  */
  const feedScroll = new RoomFeedScroll({
    alerts,
    chat,
    alertPages,
    chatPages,
    feeds
  });

  const alertsPane = new RoomAlertsPane<(typeof data.alerts)[number]>({
    alerts,
    dialogs,
    prefs,
    feeds,
    alertsScroller: () => alertsScroller ?? null,
    forceAlertsToBottom: feedScroll.forceAlertsToBottom,
    sessionHandle: () => data.sessionHandle,
    setChatAlertsDetached: (next) => (chatAlertsDetached = next)
  });









  /*
    ── Older chat history ───────────────────────────────────────────────────────────────────────
    The page load sends the NEWEST page per channel. Everything before that is fetched here, one
    page at a time, and held in client state so an `invalidateAll()` — which every SSE event
    triggers — refreshes the live tail without throwing away what the reader scrolled back to.
  */



  $effect(() => {
    const scroller = alertsScroller;
    const count = feeds.visibleAlerts.length;
    const newestMessage = feeds.visibleAlerts.at(-1);

    if (!scroller) return;

    if (
      alertsFollow.follows({
        count,
        newestSenderId: newestMessage?.senderId,
        viewerId: data.user.id,
        readingHistory: feedScroll.alertsReadingHistory
      })
    ) {
      feedScroll.stopReadingHistory('alerts');
      void tick().then(() => {
        if (alertsScroller === scroller) feedScroll.forceAlertsToBottom(scroller);
      });
    }
  });

  $effect(() => {
    const scroller = chatScroller;
    const activeTab = chat.tab;
    const count = feeds.visibleChat.length;
    const newestMessage = feeds.visibleChat.at(-1);

    if (!scroller) return;

    if (
      chatFollow.follows({
        count,
        tab: activeTab,
        newestSenderId: newestMessage?.senderId,
        viewerId: data.user.id,
        readingHistory: feedScroll.chatReadingHistory
      })
    ) {
      feedScroll.stopReadingHistory('chat');
      void tick().then(() => {
        if (chatScroller === scroller) feedScroll.forceChatToBottom(scroller);
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
    const count = feeds.visibleExtraChat.length;
    const newestMessage = feeds.visibleExtraChat.at(-1);

    if (!scroller) return;

    if (
      extraChatFollow.follows({
        count,
        tab: activeTab,
        newestSenderId: newestMessage?.senderId,
        viewerId: data.user.id,
        // THIS column's flag. Passing `chatScrollingUp` would let the main column's reader position
        // decide whether this one jumps, which is the defect its own contract test guards.
        readingHistory: feedScroll.extraChatReadingHistory
      })
    ) {
      feedScroll.stopReadingHistory('extraChat');
      void tick().then(() => {
        if (extraChatScroller === scroller) feedScroll.forceChatToBottom(scroller);
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








  function openModal(name: Exclude<ModalName, null>) {
    if (name === 'muted' || name === 'followed' || name === 'user') userActions.loadManaged();
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
    if (modal === 'qa' && messageActions.selected) unreadQaAlertIds.delete(messageActions.selected.id);
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
    void screens.selectedTab;
    void mediaTransport.screenStreams.size;
    void mediaTransport.applyScreenLayers();
  });

  $effect(() => {
    // ONE ring for a batch that arrives together, not one per message — `.some` is that rule, and
    // it is why the sound is decided after the whole arrival is known rather than inside the loop.
    const arrived = chatArrivals.fresh(data.messages);
    const incoming = arrived.some((message) => message.senderId !== data.user.id);

    if (incoming && !prefs.doNotDisturbOn && prefs.chatSoundOn) playSoundEffect('pling');
  });











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
   * The private-chat toolbar's "Don't Disturb" button. `app-privchat`'s `setDND()` flips the one
   * global flag and nothing else - no persistence call, unlike its neighbours which end in
   * `prefs.save(...)`. `app-chat` defines the same method but never binds it to a template, so
   * the private chat is the only place in the capture this button exists.
   */
  function setDND() {
    prefs.doNotDisturbOn = !prefs.doNotDisturbOn;
  }

















  /**
   * Tells the room what this presenter's recorder is doing. `media.recording-state.remote.ts` carries the
   * reasoning for all of it: why the room is told rather than each browser reading its own flag, why
   * `cmd` is the command's schema instead of four restated strings, and why the catch is here once
   * rather than at each of the four `void`-ed call sites.
   */








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









  
  

  

  

  





  /* ── The chat rich text editor ────────────────────────────────────────────────────────────────
     The editor lives in `ModalHost`; its session lives here, because the composer hands work to it
     and the send hands work back to the same code path an ordinary message uses. */





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



  onMount(() => {
    const stopRoomEvents = roomEvents.subscribe();
    // After subscribe, never before: the stream must not wait on a third-party host.
    const stopGeoLookup = roomEvents.resolveOwnLocation();
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
    userActions.loadManaged();
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
    mediaTransport.attachSession(session);
    mediaTransport.signalling = signalling;

    signalling.on('socketopen', ({ reconnected }) => mediaTransport.serverConnected(reconnected));
    signalling.on('disconnected', () => {
      mediaTransport.serverDisconnected();
      // The far side closed every consumer with the socket. Drop them so a stale picture is never
      // left frozen on screen pretending to be live; the tabs rebuild from `getProducers` on the
      // next connect.
      mediaTransport.dropRemoteMedia();
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
          const active = mediaTransport.session;
          if (!active) return;
          mediaTransport.sessionReady = active.load();
          await mediaTransport.sessionReady;
          const { producers } = await signalling.request('getProducers');
          for (const producer of producers) {
            await mediaTransport.addRemoteScreen(active, producer);
            await mediaTransport.addRemoteWebcam(active, producer);
            await mediaTransport.addRemoteAudio(active, producer);
          }
        } catch (error) {
          // Leaving `sessionReady` pending would hang every future consume on a promise that can
          // never settle, so it is reset and the next connect retries from scratch.
          mediaTransport.sessionReady = null;
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
      const previous = mediaTransport.session;
      mediaTransport.attachSession(null);
      mediaTransport.sessionReady = null;
      // Closes every transport, producer and consumer this peer held. What was consumed must go
      // with them, or the tab bar keeps painting a stream whose transport no longer exists — and
      // the dedupe guards would refuse to re-consume any of it below.
      previous?.close();
      mediaTransport.dropRemoteMedia();

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
      mediaTransport.attachSession(rebuilt);

      try {
        mediaTransport.sessionReady = rebuilt.load();
        await mediaTransport.sessionReady;
        const { producers } = await signalling.request('getProducers');
        for (const producer of producers) {
          await mediaTransport.addRemoteScreen(rebuilt, producer);
          await mediaTransport.addRemoteWebcam(rebuilt, producer);
          await mediaTransport.addRemoteAudio(rebuilt, producer);
        }
      } catch (error) {
        mediaTransport.sessionReady = null;
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
      const active = mediaTransport.session;
      if (!active) return;
      void mediaTransport.addRemoteScreen(active, info);
      void mediaTransport.addRemoteWebcam(active, info);
      void mediaTransport.addRemoteAudio(active, info);
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
    signalling.on('producerPaused', ({ producerId }) => mediaTransport.remoteAudioPaused(producerId));
    signalling.on('producerResumed', ({ producerId }) => mediaTransport.remoteAudioResumed(producerId));
    signalling.on('producerClosed', ({ producerId }) => {
      mediaTransport.removeRemoteScreen(producerId);
      mediaTransport.removeRemoteWebcam(producerId);
      mediaTransport.removeRemoteAudio(producerId);
    });
    signalling.on('peerClosed', ({ peerId }) => {
      // The current session, for the same reason as `newProducer` above: after a role change the
      // captured `session` holds the streams of a connection that no longer exists, so a peer
      // leaving would tear down nothing and leave their tile painted.
      for (const remote of mediaTransport.session?.remoteStreams.values() ?? []) {
        if (remote.peerId === peerId) {
          mediaTransport.removeRemoteScreen(remote.producerId);
          mediaTransport.removeRemoteWebcam(remote.producerId);
          mediaTransport.removeRemoteAudio(remote.producerId);
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
      mediaTransport.serverDisconnected();
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
      recording.endSpeechRecognition();
      mediaTransport.signalling = null;
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
      const live = mediaTransport.session;
      mediaTransport.attachSession(null);
      live?.close();
      signalling.close();
      stopRefresh();
      if (previousOpenImageModal) imageModalWindow.openImageModal = previousOpenImageModal;
      else delete imageModalWindow.openImageModal;
      feedScroll.destroy();
      // An armed "play at" that outlives the room would post a broadcast from a page nobody is on.
      broadcasts.clearScheduledVideoTimer();
      toasts.destroy();
      unloadSoundEffects();
      media.stopTalking(data.user.id);
      mediaTransport.stopStream(mediaTransport.microphoneStream);
      mediaTransport.stopStream(mediaTransport.webcamStream);
      // Every shared screen, not just the newest: leaving the others running holds the camera or
      // the screen-capture indicator on after the room is gone.
      for (const stream of mediaTransport.localScreenStreams.values()) mediaTransport.stopStream(stream);
      mediaTransport.localScreenStreams.clear();
      mediaTransport.stopStream(mediaTransport.screenStream);
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
  onclick={(event) => windowHandlers.click(event)}
  onpointermove={(event) => windowHandlers.pointerMove(event)}
  onpointerup={finishSplit}
  onpointercancel={finishSplit}
  onkeydown={(event) => windowHandlers.keyDown(event)}
  onkeyup={(event) => windowHandlers.keyUp(event)}
  oncontextmenu={(event) => windowHandlers.contextMenu(event)}
  onbeforeunload={() => windowHandlers.beforeUnload()}
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
    class={{ 'detach-screen': screens.detachedScreenId !== null }}
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
          onstartrecording={() => void recording.startRecording()}
          onstoprecording={() => void recording.stopRecording()}
          onpauserecording={() => recording.pauseRecording()}
          onresumerecording={() => recording.resumeRecording()}
          ondownloadrecording={() => recording.downloadRecording()}
          onpromptforsoundcloud={promptForSoundCloud}
          onstopsoundcloud={stopSoundCloud}
          onstopsoundcloudforme={stopSoundCloudForMe}
          ontogglemicrophone={() => void mediaTransport.toggleMicrophone()}
          ontogglewebcam={() => void mediaTransport.toggleWebcam()}
          onpromptforscreenname={(source) => void mediaTransport.promptForScreenName(source)}
          onstopscreensharing={() => void mediaTransport.stopScreenSharing()}
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
          onshowrecpreview={() => recording.showRecPreview()}
          onhiderecpreview={() => recording.hideRecPreview()}
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
          roomEventsConnected={roomEvents.connected}
          mediaConnected={media.connected}
          {chatAlertsDetached}
          {rosterVisible}
          {rosterCountVisible}
          {archivesAvailable}
          {rowVisible}
          {rosterRowClass}
          locationVisible={(entry) => locationVisibleTo({ isPresenter }, entry)}
          canOpenRosterPrivateChat={(user) => privateChat.canOpenFor(user)}
          {mobileAppAvailable}
          {benzingaVisible}
          {benzingaUrl}
          benzingaLogoUrl={data.sessData?.altBenzingaLogoURL}
          dumpVersion={DUMP_CONTRACT.version}
          onopenmodal={openModal}
          onopenrosteruserinfo={(user) => userActions.openInfoFor(user)}
          onopenrosterprivatechat={(user) => privateChat.openFromRoster(user)}
          onmentionrosteruser={(user) => userActions.mentionFromRoster(user)}
          onselectuser={(id) => userActions.selectUserId(id)}
          onusersearchkey={doUserSearch}
          ongetmobilepin={() => void getMyPinAndDoInfo()}
          ongetrandomuser={getRandomUser}
          onopentranscript={alertsPane.openTranscript}
          onreopenalertschat={alertsPane.reopen}
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
              canUseRTE={composer.canUseRTE}
              {giphyApiKey}
              bind:showMessageOptions
              visibleAlerts={feeds.visibleAlerts}
              visibleChatMessages={feeds.visibleChat}
              {alertLabels}
              {messageChrome}
              followedUsers={userActions.followedUsers}
              {captureAlertChatElement}
              {captureAlertsScroller}
              {captureChatScroller}
              {captureComposerElement}
              {observeComposerWidth}
              onopenmodal={openModal}
              onopenpoll={openPollUI}
              ontogglealertstoolbar={() => alertsPane.toggleToolbar()}
              ontogglealertssearch={() => alertsPane.toggleToolbarSearchOnly()}
              ondetachalerts={alertsPane.detach}
              onsavealerts={alertsPane.save}
              onarchivealerts={alertsPane.archive}
              onalertsscroll={feedScroll.trackAlertsScroll}
              onchatscroll={feedScroll.trackChatScroll}
              onmessageaction={(kind, action, item, payload) =>
                messageActions.handle(kind, action, item, payload)}
              onprivatechat={() => privateChat.show()}
              onexpandcomposer={autoExpandComposer}
              onsend={() => composer.send()}
              onimageupload={() => composer.openImageUpload()}
              onrte={() => composer.openRTE()}
              onselectgif={(title, url) => composer.selectGif(title, url)}
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
              openTranscriptPage={alertsPane.openTranscript}
              {previewWindowsVisible}
              webcamPresenters={mediaTransport.webcamPresenters}
              webcamCard={webcams.card}
              attachLocalWebcam={webcams.attachLocal}
              attachRemoteWebcam={webcams.attachRemote}
              closeWebcamPreview={webcams.closePreview}
              videoDisabled={prefs.videoDisabled}
              sharedScreens={mediaTransport.screens}
              selectedScreenTab={screens.selectedTab}
              forcedScreenId={screens.forcedId}
              lockedScreenId={screens.lockedId}
              detachedScreenId={screens.detachedScreenId}
              screenStreams={mediaTransport.screenStreams}
              screenPans={screens.pans}
              zoomLevel={screens.zoomLevel}
              showZoomCtrl={screens.showZoomCtrl}
              bind:isFullScreenshare={screens.isFullScreenshare}
              volume={roomVolume.volume}
              saveData={mediaTransport.saveData}
              {screenVolume}
              selectScreenTabByUser={(id) => screens.selectTab(id)}
              detachScreen={(id) => screens.detach(id)}
              toggleLockScreen={(id) => screens.toggleLock(id)}
              bringEveryoneToScreen={(id) => screens.bringEveryoneTo(id)}
              stopSharedScreen={(id) => screens.stop(id)}
              togglePanZoom={() => screens.toggleZoomControls()}
              panZoomIn={() => screens.zoomIn()}
              panZoomOut={() => screens.zoomOut()}
              panZoomReset={() => screens.resetZoom()}
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
              uploadAlertFiles={(files) => composer.uploadAlertFiles(files)}
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
                messages={feeds.visibleExtraChat}
                doNotDisturbOn={prefs.doNotDisturbOn}
                {chatEnabled}
                {webinarMode}
                {selfMutedUntil}
                {showPmButton}
                {canPostImages}
                canUseRTE={composer.canUseRTE}
                {giphyApiKey}
                chrome={messageChrome}
                followedUsers={userActions.followedUsers}
                openMenuKey={menus.messageId}
                onmenutoggle={(key) => menus.openMessageMenu(key)}
                onaction={(action, message, event) =>
                  messageActions.handle('chat', action, message, event, true)}
                onfocus={() => chat.focused(EXTRA_COMPOSER)}
                onsend={() => void composer.sendExtra()}
                onscroll={(scroller) => feedScroll.trackExtraChatScroll(scroller)}
                onscrollerready={(scroller) => (extraChatScroller = scroller)}
                onprivatechat={() => privateChat.show()}
                onsearch={() => openModal('chat-logs')}
                onsettings={() => openModal('settings')}
                onimageupload={() => composer.openImageUpload()}
                onrte={() => composer.openExtraRTE()}
                onselectgif={(url) => composer.selectGif('', url)}
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
      Everything that floats above the room, in `$lib/components/RoomOverlays.svelte`.

      Phase 5 slice 17, and the largest single template region left after Phase 2: the modal host,
      the seven dialog blocks, the toast host, the image lightbox, the hidden remote-audio sinks and
      the "Conected" overlay. 310 lines became this call.

      Nineteen of the props are the room's state classes handed over WHOLE, which is what makes it a
      saving rather than a move — `ModalHost` still takes its 85, but they are assembled beside it
      instead of being drilled through here. Only `modal` and `selectedImageUrl` bind back,
      because only they are written on the other side.
    -->
    <RoomOverlays
      {alerts}
      {broadcasts}
      {composer}
      {data}
      {dayTradeAlerts}
      {dialogs}
      {feeds}
      {media}
      {mediaTransport}
      {messageActions}
      {polls}
      {prefs}
      {privateChat}
      {roomEvents}
      {roster}
      {split}
      {swingAlerts}
      {toasts}
      {userActions}
      bind:modal
      bind:selectedImageUrl
      {alertTab}
      {chatMode}
      {globalChatStyle}
      {mobilePin}
      {sessionControlInitialTab}
      {settingsTab}
      {theme}
      changeChatMode={(mode) => void changeChatMode(mode)}
      {closeActiveModal}
      {downloadImage}
      {minimizePoll}
      {openModal}
      saveAlertFilter={alertsPane.saveFilter}
      {setTheme}
      {submitPollAction}
    />
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
      open={privateChat.open}
      doNotDisturb={prefs.doNotDisturbOn}
      {isPresenter}
      peer={userActions.selectedMessageUser}
      tabs={privateChat.tabs}
      currentUserId={privateChat.peerId}
      log={privateChat.log}
      searching={privateChat.searching}
      searchTerm={privateChat.searchTerm}
      bind:draft={privateChat.draft}
      body={bodySegmentsPrivate}
      formatTime={(at) => privateChat.formatTime(at)}
      onclosepeer={() => {
        userActions.clearSelectedMessageUser();
        messageActions.clearSelected();
      }}
      ondeletethis={() => privateChat.deleteThread()}
      onclose={() => privateChat.close()}
      onsearch={(term) => void privateChat.search(term)}
      ondonotdisturb={setDND}
      ondownload={() => privateChat.downloadLog()}
      onswitchuser={(uid) => void privateChat.switchToUser(uid)}
      onloadmore={(uid, page) => void privateChat.loadLog(uid, page)}
      onsend={() => void privateChat.send()}
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
