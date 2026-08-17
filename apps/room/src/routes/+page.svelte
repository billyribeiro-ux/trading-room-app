<script lang="ts">
  import {
    chatComposerEnabled,
    isChatMode,
    isWebinarMode,
    type ChatMode
  } from '#lib/chat-mode.js';
      import { page } from '$app/state';
  import { invalidate, invalidateAll } from '$app/navigation';
  // The first remote function in this app. Aliased because the local wrapper below keeps the name.
    import { getMyMobilePin } from './mobile-pin.remote';
    import { focusOnScreen } from './presenter-commands.remote';
    import { changeChatMode as changeChatModeCommand } from './chat-mode.remote';
                  import { isHttpError } from '@sveltejs/kit';
  import { PUBLIC_PTR_GIPHY_API_KEY, PUBLIC_PTR_TAWK_PROPERTY_ID } from '$app/env/public';
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
    import { MtxStreamTabs } from '#lib/room-mtx.svelte.js';
  import ScreenVolumeControl from '#lib/components/ScreenVolumeControl.svelte';
  import {
    rosterRowClass,
    rosterRowVisible,
    locationVisibleTo
  } from '#lib/roster-gates.js';
                          import { createRoom } from '#lib/room/create-room.svelte.js';
                        import { setAutoplayAttribute, setWebcamAudioAttributes } from '#lib/room/webcams.js';
        import type { RoomMessageChrome } from '#lib/room-message-chrome.js';
  import { EXTRA_COMPOSER } from '#lib/room/chat.svelte.js';
    import { tawkAttributes, tawkScript } from '#lib/tawk-support.js';
  import { splitPairFromValue, splitStorageKeys } from '#lib/room/split.svelte.js';
  import { shouldDisableSelection } from '#lib/room-key-gates.js';
  import AlertChatArea from '#lib/components/AlertChatArea.svelte';
  import PresentationArea from '#lib/components/PresentationArea.svelte';
  import RoomOverlays from '#lib/components/RoomOverlays.svelte';
  import ExtraChatPane from '#lib/components/ExtraChatPane.svelte';
  import { resolveNoteSurfaceGates } from '#lib/components/notes/note-gates.js';
      import { alertFilterAvailable } from '#lib/alert-filter.js';
      import PrivateChatPanel from '#lib/components/PrivateChatPanel.svelte';
  import {
    NO_SPEAKER_TEXT,
    SHARE_SCREEN_TEXT,
    STOP_SHARING_ALL_TEXT,
    VIRTUAL_CAM_TEXT
  } from '#lib/navbar-labels.js';
  import RoomNavbar from '#lib/components/RoomNavbar.svelte';
  import RoomSidebar from '#lib/components/RoomSidebar.svelte';
  import RoomShell from '#lib/components/RoomShell.svelte';
  import { DUMP_CONTRACT } from '#lib/dump-contract.js';
  import { initializeSoundEffects, setSoundEffectsVolume, unloadSoundEffects } from '#lib/sound-effects.js';
  import type { FollowChatStyle, MainTab, Theme } from '#lib/types.js';
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

  const mtx = new MtxStreamTabs();
  const unreadQaAlertIds = new SvelteSet<number>();
  /*
    THE COMPOSITION ROOT, in `#lib/room/create-room.svelte.ts`.

    Phase 5, S7. Thirty-six `new Room*()` constructions and 740 lines left this file in one move.
    What is left here is the ARGUMENT: what the page owns and the room reads, and what the room
    writes back. Everything below still reads `prefs.x` and `media.y` exactly as before, because the
    root hands the instances back under their own names.

    Destructured into `const`s and never reassigned — `svelte/context` warns that reassigning a
    shared reactive value breaks the link for everything reading it downstream, and here that would
    mean the whole room rendering once and then silently stopping.
  */
  const {
    prefs,
    roomVolume,
    roster,
    chat,
    media,
    split,
    polls,
    alerts,
    menus,
    dialogs,
    screens,
    broadcasts,
    files,
    swingAlerts,
    dayTradeAlerts,
    privateChat,
    toasts,
    mediaTransport,
    composer,
    messageActions,
    recording,
    windowHandlers,
    webcams,
    userActions,
    roomEvents,
    alertsFollow,
    chatFollow,
    extraChatFollow,
    gates,
    feeds,
    modals,
    notes,
    feedScroll,
    alertsPane,
    loadedChatStyle,
    rosterViewer
  } = createRoom({
    session: () => data,
    isPresenter: () => isPresenter,
    chatOnlyMode: () => chatOnlyMode,
    disableCopy: () => disableCopy,
    webinarMode: () => webinarMode,
    noteGates: () => noteGates,
    rosterSession: () => rosterSession,
    theme: () => theme,
    chatAlertsDetached: () => chatAlertsDetached,
    appHasFocus: () => appHasFocus,
    mainElement: () => mainElement,
    alertChatElement: () => alertChatElement,
    composerElement: () => composerElement,
    alertsScroller: () => alertsScroller,
    setTheme: (next) => (theme = next),
    setMainTab: (tab) => (mainTab = tab),
    setChatAlertsDetached: (next) => (chatAlertsDetached = next),
    mergeGlobalChatStyle: (patch) => (globalChatStyle = { ...globalChatStyle, ...patch }),
    setCurrentCaption: (caption) => (currentCaption = caption),
    pushCaptionHistory: (caption) => {
      captionHistory = [...captionHistory, caption].slice(-CAPTION_HISTORY_LIMIT);
    },
    chatMissedWhileHidden: () => (missedChatWhileHidden = true),
    hidePreviewWindows: () => (previewWindowsVisible = false),
    mtx,
    unreadQaAlertIds,
    settingsSplitPair,
    defaultFollowChatStyle
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
    Who is in the room, in `#lib/room/roster.svelte.ts`.

    The fourth room state class: the live roster, the four header controls that sort and search it,
    the badge count and the random-user draw. The two transcribed pipes and the four gates stay in
    `#lib/roster-gates.js`, where their truth tables are; this class holds the state they run on.

    Two thunks rather than a snapshot, which is the shape `$state`'s "passing state into functions"
    documents: `data` is a `$props()` value, so passing `data.connectedUsers` would hand over the
    ARRAY and the class would still be showing it after a navigation replaced it. Reading a thunk
    inside a `$derived` tracks whatever it touches.
  */
  // Typed off the load's own entry rather than re-listed, so the stream and the page load cannot
  // drift into two different shapes for the same person.
  type RosterEntry = (typeof data.connectedUsers)[number];

  /** `doUserSearch(e){ 13 == e.keyCode && (this.userSearchTermTxt ? this.searchUsers() : this.clearUserSearch()) }` */
  function doUserSearch(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    roster.submitSearch();
  }

  /**
   * `co=1` - chat-only mode. The capture reads it as `const F = s.get("co")` into
   * `globals.chatOnlyMode`, and a detached chat window runs in it so the popout shows the alerts
   * and chat instead of a second copy of the whole room.
   */
  const chatOnlyMode = $derived(page.url.searchParams.get('co') === '1');

  /** `hideChatAlerts` / `reopenAlertsChatBtn` - set while the pair lives in another window. */
  let chatAlertsDetached = $state(false);

  // The page data is the intentional one-time seed for client-managed theme state.
  // svelte-ignore state_referenced_locally
  let theme: Theme = $state(data.settings?.theme === 'dark' ? 'dark' : 'light');

  
  const showBadgesToPresentersOnly = $derived(data.sessData?.showBadgesToPresentersOnly === true);
  const disableStarYears = $derived(data.sessData?.disableStarYears === true);

  
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

  

  
  // svelte-ignore state_referenced_locally
  let globalChatStyle = $state<FollowChatStyle>({
    ...defaultChatStyleForTheme(theme),
    ...loadedChatStyle
  });
  // The captured alerts toolbar (alert-section/datach-alerts-1) is a strip between the alerts
  // header and the scroller. It is absent from the default capture (alert-section/1.html states
  // "No alertsToolbar search strip in this snapshot"), so it is toggled, not permanent.

  /*
    The `svelte-ignore state_referenced_locally` that stood here went with its code. It guarded the
    one-time seed reading `theme` at declaration; that seed is `loadedChatStyle`, which moved into
    `create-room.svelte.ts` in S7 because it reads `prefs`. eslint's `no-unused-svelte-ignore` is
    what caught the leftover — a suppression outliving the warning it suppressed is a comment that
    lies about the next reader's risk.
  */
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
  /*
    The alerts scroller, and it is the ONLY one of the three still held here.

    `RoomAlertsPane.toggleToolbar()` reads it: the toolbar strip changes height, so the log has to be
    pulled back to the newest alert afterwards, which is upstream's
    `guiEventBus.emit('scrollAlertLogToBottom')`. Two owners, so the element crosses the boundary —
    the "written on both sides" rule, the same one `followedUsers` paid for.

    The chat scroller and the extra column's are NOT here any more. Their only reader was a
    page-level `$effect` that scrolled an element the pane owned, and both effects moved into the
    panes on 2026-08-16 and -17. A `let` whose whole purpose was to let this file reach into a
    component's DOM is exactly what those moves were for.
  */
  let alertsScroller = $state<HTMLElement | undefined>();
  const isPresenter = $derived(data.user.role === 'staff' || data.user.role === 'admin');
  /**
   * `sessData.disableCopy` — "Disable Copy?", content protection for the AUDIENCE.
   *
   * Read the same way every other room setting here is. The presenter exemption is not applied at
   * this line: it belongs to each gate, in `#lib/room-key-gates.js`, because all three bindings carry
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
   *
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
   * The sidebar's gates. Every one is a transcription in `#lib/roster-gates.js`, tested there against
   * its truth table; this file only supplies the viewer and the session.
   */
  const rosterSession = $derived(data.sessData ?? {});

  /**
   * `mobilePin`, and the modal it belongs to.
   *
   * The room does not compute the pin. `getMyMobilePin` goes out on the command channel and the
   * server answers on it; `case "getMyMobilePin": appEventBus.emit("getMyMobilePin", i)` is the
   * whole of the client's part. `N/A` is the captured placeholder until it arrives, not a spinner.
   */
  let mobilePin = $state('N/A');

  async function getMyPinAndDoInfo() {
    if (!gates.mobileAppAvailable) return;
    // Open first. The capture's button opens the modal through `data-bs-toggle` regardless of what
    // the handler does, so the pin arriving late shows as `N/A` becoming a number, not as a delay
    // before anything appears.
    modals.open('mobile');
    mobilePin = 'N/A';
    try {
      mobilePin = await getMyMobilePin();
    } catch (cause) {
      // `N/A` stays as set above — no invented placeholder. `isHttpError` narrows Kit's rejection so
      // the 409 and 502 wordings stay distinct; `mobile-pin.remote.ts` says why that shape is known.
      dialogs.alert = isHttpError(cause) ? cause.body.message : 'Could not get an app pin right now.';
    }
  }

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
    enableBadges: gates.enableBadges,
    showBadgesToPresentersOnly,
    disableStarYears,
    presenterMessagesOnTheRight: gates.presenterMessagesOnTheRight,
    usersPublicReply,
    enableReactions,
    enableEditMessage,
    enableEditAlerts
  });

  /**
   * Is the Alert Filter configured for this room at all?
   *
   * The reference gates all THREE of its entry points on `sessData.modAlertFilterList` being
   * truthy — a room that never configured a trader list has no feature, no button and no badge.
   * Same value the filter predicate reads, so the controls cannot appear while the filtering they
   * describe is inert.
   */
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

  $effect(() => {
    // The decision is `RoomPolls.deliver` — who may see this poll, and whether this browser has
    // already shown it. What is left here is the one thing the class does not own: the modal.
    if (polls.deliver(data.activePoll, data.user.id)) modals.modal = 'poll';
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
    imageModalWindow.openImageModal = modals.openImage;
    // `ngAfterViewInit`: `sessData.tawkPresenterSupport && (loadTawkSupport(), setTAWKAttributes())`.
    // Gated on `tawkAvailable`, which adds the configured-property term — with none, no script.
    const stopTawk = gates.tawkAvailable ? loadTawkSupport() : () => {};
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
    /*
      THE SFU SESSION, opened by the transport that owns it.

      This was 236 lines of signalling wiring sitting in `onMount` — slice 4 moved the transport's
      state and left it, because it referenced page-level things that had not moved yet. Measured
      before slice 26: eight page names reached, 37 of the references `mediaTransport` itself.

      `connect` returns its own teardown, which is what makes the pairing checkable. The two halves
      used to sit 240 lines apart here, and the review of 2026-08-11 found the gap between them.
    */
    const stopMedia = mediaTransport.connect();
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
      stopMedia();
      stopRefresh();
      if (previousOpenImageModal) imageModalWindow.openImageModal = previousOpenImageModal;
      else delete imageModalWindow.openImageModal;
      feedScroll.destroy();
      // An armed "play at" that outlives the room would post a broadcast from a page nobody is on.
      broadcasts.clearScheduledVideoTimer();
      toasts.destroy();
      unloadSoundEffects();
      media.stopTalking(data.user.id);
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

  /* ── Swing Trade Alerts ──────────────────────────────────────────────────────────────────── */

  /* ── Day Trade Alerts ────────────────────────────────────────────────────────────────────── */

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
    viewerOnlyMode={gates.viewerOnlyMode}
    audioVolume={roomVolume.volume}
    talkingUsers={media.talking}
    preferences={roomVolume.presenterAudio}
    individualVolumeControls={gates.individualVolumeControls}
    onvolume={(level) => roomVolume.setMasterVolume(level)}
    onmute={() => roomVolume.muteScreenAudio()}
    onunmute={() => roomVolume.unmuteScreenAudio()}
    ontogglepresenter={(user) => roomVolume.toggleTalkingPresenterAudio(user)}
    onpresentervolume={(user, raw) => roomVolume.adjustPresenterVolume(user, raw)}
  />
{/snippet}

{#snippet bodySegmentsPrivate(text: string)}
  <!--
    Unkeyed: the parts come straight out of `split()` on one message and are replaced wholesale.
    An index key here reads as identity and provides none — `RoomMessage.bodySegments` carries the
    full reasoning, and `each-key-contract.test.ts` enforces the distinction. The disable is there
    because `require-each-key` cannot express "this list has no identity"; the docs' rule is the
    specific one and it forbids the only key available.
  -->
  <!-- eslint-disable-next-line svelte/require-each-key -->
  {#each text.split(/((?:http|https|ftp):\/\/[\w?=&.@/\-;#~%]+)/gi) as part}
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
      class={['wrapper', { 'push-wrapper': sidebarOpen, 'mt-0': chatOnlyMode || gates.viewerOnlyMode }]}
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
          individualVolumeControls={gates.individualVolumeControls}
          recordingReminderAllowed={gates.recordingReminderAllowed}
          recordingTooltip={gates.recordingTooltip}
          mobileAppAvailable={gates.mobileAppAvailable}
          tawkAvailable={gates.tawkAvailable}
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
          ontoggletopmenu={(menu) => modals.toggleTopMenu(menu)}
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
          onopensessioncontrol={(tab) => modals.openSessionControl(tab)}
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
        {#if !(chatOnlyMode || gates.viewerOnlyMode)}
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
          rosterVisible={gates.rosterVisible}
          rosterCountVisible={gates.rosterCountVisible}
          archivesAvailable={gates.archivesAvailable}
          {rowVisible}
          {rosterRowClass}
          locationVisible={(entry) => locationVisibleTo({ isPresenter }, entry)}
          canOpenRosterPrivateChat={(user) => privateChat.canOpenFor(user)}
          mobileAppAvailable={gates.mobileAppAvailable}
          benzingaVisible={gates.benzingaVisible}
          benzingaUrl={gates.benzingaUrl}
          benzingaLogoUrl={data.sessData?.altBenzingaLogoURL}
          dumpVersion={DUMP_CONTRACT.version}
          onopenmodal={(name) => modals.open(name)}
          onopenrosteruserinfo={(user) => userActions.openInfoFor(user)}
          onopenrosterprivatechat={(user) => privateChat.openFromRoster(user)}
          onmentionrosteruser={(user) => userActions.mentionFromRoster(user)}
          onselectuser={(id) => userActions.selectUserId(id)}
          onusersearchkey={doUserSearch}
          ongetmobilepin={() => void getMyPinAndDoInfo()}
          ongetrandomuser={getRandomUser}
          onopentranscript={() => alertsPane.openTranscript()}
          onreopenalertschat={() => alertsPane.reopen()}
          onreload={() => void invalidateAll()}
        />
        {@render mainNavigation()}
        {/if}

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
              alertLabels={gates.alertLabels}
              {messageChrome}
              followedUsers={userActions.followedUsers}
              {captureAlertChatElement}
              {captureAlertsScroller}
              {captureComposerElement}
              {observeComposerWidth}
              {feedScroll}
              {alertsFollow}
              {chatFollow}
              viewerId={data.user.id}
              onopenmodal={(name) => modals.open(name)}
              onopenpoll={() => modals.openPollUI()}
              ontogglealertstoolbar={() => alertsPane.toggleToolbar()}
              ontogglealertssearch={() => alertsPane.toggleToolbarSearchOnly()}
              ondetachalerts={() => alertsPane.detach()}
              onsavealerts={() => alertsPane.save()}
              onarchivealerts={() => alertsPane.archive()}
              onalertsscroll={(event) => feedScroll.trackAlertsScroll(event)}
              onchatscroll={(event) => feedScroll.trackChatScroll(event)}
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
              {screens}
              {mediaTransport}
              {split}
              {media}
              {menus}
              {mtx}
              {isPresenter}
              viewerOnlyMode={gates.viewerOnlyMode}
              doNotDisturbOn={prefs.doNotDisturbOn}
              bind:mainTab
              bind:subtitles={prefs.subtitles}
              {currentCaption}
              {captionHistory}
              bind:speechRecoHistoryMode
              archivesAvailable={gates.archivesAvailable}
              openTranscriptPage={() => alertsPane.openTranscript()}
              {previewWindowsVisible}
              webcamPresenters={mediaTransport.webcamPresenters}
              webcamCard={(presenter, index) => webcams.card(presenter, index)}
              attachLocalWebcam={(node) => webcams.attachLocal(node)}
              attachRemoteWebcam={(producerId) => webcams.attachRemote(producerId)}
              closeWebcamPreview={(presenter) => webcams.closePreview(presenter)}
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
              newNoteOpen={notes.newNoteOpen}
              onNewNoteOpenChange={(open) => (notes.newNoteOpen = open)}
              mountNewNoteLink={(menu) => notes.mountNewNoteLink(menu)}
              submitNoteMutation={<Success extends Record<string, unknown>>(
                action: Parameters<typeof notes.submitMutation>[0],
                values: Parameters<typeof notes.submitMutation>[1]
              ) => notes.submitMutation<Success>(action, values)}
              loadNoteVersions={(noteId) => notes.loadVersions(noteId)}
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
              mountUploadFileLink={(menu) => notes.mountUploadFileLink(menu)}
              playMp3ForAll={(url) => broadcasts.playMp3ForAll(url)}
              stopMp3ForAll={() => broadcasts.stopMp3ForAll()}
              openModal={(name) => modals.open(name)}
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
                showPmButton={gates.showPmButton}
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
                follow={extraChatFollow}
                viewerId={data.user.id}
                readingHistory={feedScroll.extraChatReadingHistory}
                onstopreadinghistory={() => feedScroll.stopReadingHistory('extraChat')}
                onscrolltobottom={(scroller) => feedScroll.forceChatToBottom(scroller)}
                onprivatechat={() => privateChat.show()}
                onsearch={() => modals.open('chat-logs')}
                onsettings={() => modals.open('settings')}
                onimageupload={() => composer.openImageUpload()}
                onrte={() => composer.openExtraRTE()}
                onselectgif={(url) => composer.selectGif('', url)}
              />
            </as-split-area>
          {/snippet}

        <RoomShell
          {split}
          {captureMainElement}
          {chatOnlyMode}
          viewerOnlyMode={gates.viewerOnlyMode}
          hideChatAlerts={gates.hideChatAlerts}
          {hidePresentation}
          {extraChatColumnVisible}
          {isPresenter}
          {chatMode}
          {beginSplit}
          {chatAlertsPane}
          {presentationPane}
          {extraChatPane}
        />
      </div>
    </div>
    <!--
      Everything that floats above the room, in `#lib/components/RoomOverlays.svelte`.

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
      {isPresenter}
      {unreadQaAlertIds}
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
      {modals}
      {chatMode}
      {globalChatStyle}
      {mobilePin}
      {theme}
      changeChatMode={(mode) => void changeChatMode(mode)}
      closeActiveModal={() => modals.closeActive()}
      downloadImage={(url) => modals.downloadImage(url)}
      minimizePoll={() => modals.minimizePoll()}
      openModal={(name) => modals.open(name)}
      saveAlertFilter={(next) => alertsPane.saveFilter(next)}
      setTheme={(next) => modals.setTheme(next)}
      submitPollAction={(action, values) => modals.submitPollAction(action, values)}
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
