import type { PageData } from '../../routes/$types';
import type { RoomSessionSettings } from '#lib/server/room-config-client.js';
import type { SplitPair } from '#lib/room/split.svelte.js';
/*
  THE COMPOSITION ROOT — where the room's 36 state objects are built, and nothing else.

  Phase 5, S7. `+page.svelte` held 740 lines of `new Room*()` across 22 non-contiguous runs, spread
  from line 175 to line 1516 and interleaved with the `$derived` values they read. That interleaving
  is the reason this was a refactor rather than a cut-and-paste, and it is why the measurement below
  was taken before a single line moved.

  ## What crosses, and in which direction

  26 page bindings reached into those constructions. They are now the `RoomDeps` argument, and they
  come in exactly three kinds:

  * **Readers** arrive as THUNKS and are re-derived here under their original names. That is what
    lets the 36 construction bodies stay byte-identical: a body that read `isPresenter` still reads
    `isPresenter`, and `data.user.id` is still `data.user.id`. Nine tenths of the risk in this slice
    was the temptation to rewrite those bodies, and this design removes it.
  * **Receivers** are named functions the page supplies — `setTheme`, `setMainTab`,
    `mergeGlobalChatStyle`. Nine sites that previously held an inline arrow assigning to a page
    `let` now call one. That IS a rewrite, deliberately, and it is an improvement: the receiver is
    declared once with a name instead of being re-derived at each site.
  * **Plain values** — `mtx`, `unreadQaAlertIds`, `settingsSplitPair` — pass straight through.

  **The template was not touched, and that is a measured fact rather than a hope:** none of the 13
  page `let`s that cross here is written by the template. Every write is script-side. Had even one
  been written from markup, this boundary would have needed a `$bindable` and the slice would have
  been a different, larger shape.

  ## Why a function returning an object, and not a class

  Because the page then writes `const { prefs, media, … } = createRoom({ … })` and EVERY existing
  reference keeps working — the template, the 166 test files, all of it. The classes keep their
  names, so this slice moves 740 lines while changing almost no call sites. A class would have
  renamed every one of them to `room.prefs`, which is a far larger diff for no benefit.

  ## The rule that makes this safe, and it is the docs' rule

  Svelte's context page: *"if you REASSIGN … you will 'break the link'"*, and `.svelte.ts` files
  *"cannot export reassigned state"*. So the object returned here is built once and never
  reassigned, and the page destructures it into `const`s. Reassigning any of them would leave the
  room rendering correctly exactly once and then silently stopping — no error, no failing
  type-check, no red test. That is the failure this file's shape is chosen to prevent, and
  `create-room.svelte.test.ts` holds it with a reactivity assertion per independently reactive group.

  ## Three values MOVED IN rather than crossing

  `loadedChatStyle`, `loadedRoomSplitDir` and `rosterViewer` were page `const`s that read `prefs` and
  `media` — constructions this file owns. They could not be passed in without a cycle: the page
  cannot compute them until the root has run. They belong here, with what they derive from. Two are
  returned because the page still reads them; `loadedRoomSplitDir` has no reader outside this file.
*/

import { RoomMenus } from '#lib/room/menus.svelte.js';
import { RoomPolls } from '#lib/room/polls.svelte.js';
import { page } from '$app/state';
import { invalidate, invalidateAll } from '$app/navigation';
import { muteChat, unmuteChat } from '../../routes/chat-mute.remote';

import {
  deletePrivateChatLog as deletePrivateChatLogCommand,
  loadPrivateChatLog as loadPrivateChatLogCommand,
  sendPrivateMessage as sendPrivateMessageCommand
} from '../../routes/private-chat.remote';
import {
  focusOnScreen,
  focusOnSessionNote,
  forceReload,
  kickUser,
  presenterCommand
} from '../../routes/presenter-commands.remote';
import { sessionSendUrl, videoForAll, youtubeForAll } from '../../routes/for-all-broadcast.remote';

import {
  deleteFile as deleteFileCommand,
  fileMediaCommand,
  overwriteCashRegisterSound
} from '../../routes/files-pane.remote';
import { uploadComposerImage } from '../../routes/composer-image.remote';
import { savePreference as savePreferenceCommand } from '../../routes/user-settings.remote';
import { savePermissions } from '../../routes/permissions.remote';
import { editUsername } from '../../routes/username.remote';
import { replyMessage, sendMessage as sendMessageCommand } from '../../routes/chat-messages.remote';
import { askQuestion } from '../../routes/alert-questions.remote';
import { postAlert as postAlertCommand } from '../../routes/post-alert.remote';
import { messageAction } from '../../routes/message-actions.remote';

import { PUBLIC_PTR_CDN_UPLOAD_KEY, PUBLIC_PTR_UPLOAD_SERVER } from '$app/env/public';

import { SvelteSet } from 'svelte/reactivity';
import { checkPermissionState } from '#lib/media-capture-error.js';
import { MtxStreamTabs } from '#lib/room-mtx.svelte.js';

import { RoomRoster } from '#lib/room/roster.svelte.js';
import { RoomAlerts } from '#lib/room/alerts.svelte.js';
import { ALERTS_LOG, RoomLogPages } from '#lib/room/log-pages.svelte.js';
import { RoomScrollFollow } from '#lib/room/scroll-follow.js';
import { RoomDialogs } from '#lib/room/dialogs.svelte.js';
import { RoomPrefs } from '#lib/room/prefs.svelte.js';
import { RoomVolume } from '#lib/room/volume.svelte.js';
import { RoomBroadcasts } from '#lib/room/broadcasts.svelte.js';
import { RoomToasts } from '#lib/room/toasts.svelte.js';
import { RoomFiles } from '#lib/room/files.svelte.js';
import { RoomPrivateChat } from '#lib/room/private-chat.svelte.js';
import { RoomComposer } from '#lib/room/composer.svelte.js';
import { RoomAlertsPane } from '#lib/room/alerts-pane.js';
import { RoomFeedScroll } from '#lib/room/feed-scroll.js';
import { RoomGates } from '#lib/room/gates.svelte.js';
import { RoomModals } from '#lib/room/modals.svelte.js';
import { RoomNotes } from '#lib/room/notes.svelte.js';
import { RoomFeeds } from '#lib/room/feeds.svelte.js';
import { RoomMessageActions } from '#lib/room/message-actions.svelte.js';
import { RoomEventStream } from '#lib/room/events.svelte.js';
import { RoomMediaTransport } from '#lib/room/media-transport.svelte.js';
import { RoomRecording } from '#lib/room/recording.js';
import { RoomWindowHandlers } from '#lib/room/window-handlers.js';
import { RoomWebcams } from '#lib/room/webcams.js';
import { RoomScreens } from '#lib/room/screens.svelte.js';
import { RoomUserActions } from '#lib/room/user-actions.svelte.js';
import {
  DAY_TRADE_ALERT_FEED,
  type DayTradeAlertAction,
  SWING_ALERT_FEED,
  type SwingAlertAction,
  RoomTradeAlerts
} from '#lib/room/trade-alerts.svelte.js';

import { RoomChat } from '#lib/room/chat.svelte.js';
import { RoomMedia } from '#lib/room/media.svelte.js';

import { RoomSplit, isRoomSplitDir } from '#lib/room/split.svelte.js';

import { resolveNoteSurfaceGates } from '#lib/components/notes/note-gates.js';
import { swingAlertsTabVisible } from '#lib/swing-alerts.js';
import type { SwingAlertRow } from '#lib/types.js';

import { dayTradeAlertsTabVisible } from '#lib/day-trade-alerts.js';
import type { DayTradeAlertRow } from '#lib/types.js';

import { playSoundEffect } from '#lib/sound-effects.js';
import type { ChatTab, FollowChatStyle, MainTab, Theme } from '#lib/types.js';

/** Everything the constructions reach for that this file does not own. */
export interface RoomDeps {
  /** The load's data, as a thunk — it is replaced on every `invalidateAll()`. */
  session: () => PageData;

  // ── Readers. Thunks, because a `$derived` collaborator handed a VALUE captures only the first one.
  isPresenter: () => boolean;
  chatOnlyMode: () => boolean;
  disableCopy: () => boolean;
  webinarMode: () => boolean;
  noteGates: () => ReturnType<typeof resolveNoteSurfaceGates>;
  rosterSession: () => RoomSessionSettings;
  theme: () => Theme;
  chatAlertsDetached: () => boolean;
  appHasFocus: () => boolean;
  mainElement: () => HTMLElement | undefined;
  alertChatElement: () => HTMLElement | undefined;
  composerElement: () => HTMLTextAreaElement | undefined;
  alertsScroller: () => HTMLElement | undefined;

  // ── Receivers. Named, because an inline arrow assigning to a page `let` cannot cross a module.
  setTheme: (next: Theme) => void;
  setMainTab: (tab: MainTab) => void;
  setChatAlertsDetached: (next: boolean) => void;
  mergeGlobalChatStyle: (patch: Partial<FollowChatStyle>) => void;
  setCurrentCaption: (caption: Caption) => void;
  pushCaptionHistory: (caption: Caption) => void;
  chatMissedWhileHidden: () => void;
  hidePreviewWindows: () => void;

  // ── Plain values. Not reactive, so they cross as themselves.
  mtx: MtxStreamTabs;
  unreadQaAlertIds: SvelteSet<number>;
  settingsSplitPair: (key: string) => SplitPair | null;
  defaultFollowChatStyle: () => FollowChatStyle;
}

/** One caption line, as the speech overlay and the transcript page both read it. */
export type Caption = { timestamp: number; sender: string; text: string; live?: boolean };

export function createRoom(deps: RoomDeps) {
  /*
    The readers, re-derived under the names the moved code already used. This is the whole reason
    the 740 lines below could travel unchanged — see the note at the top of the file.
  */
  const data = $derived(deps.session());
  const isPresenter = $derived(deps.isPresenter());
  const chatOnlyMode = $derived(deps.chatOnlyMode());
  const disableCopy = $derived(deps.disableCopy());
  const webinarMode = $derived(deps.webinarMode());
  const noteGates = $derived(deps.noteGates());
  const rosterSession = $derived(deps.rosterSession());
  const theme = $derived(deps.theme());
  const chatAlertsDetached = $derived(deps.chatAlertsDetached());
  const appHasFocus = $derived(deps.appHasFocus());
  const mainElement = $derived(deps.mainElement());
  const alertChatElement = $derived(deps.alertChatElement());
  const composerElement = $derived(deps.composerElement());
  const alertsScroller = $derived(deps.alertsScroller());

  const { mtx, unreadQaAlertIds, settingsSplitPair, defaultFollowChatStyle } = deps;

  /*
    Every preference this viewer owns, in `#lib/room/prefs.svelte.ts`.

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
    `#lib` and lets the write path be tested without mocking the wire.
  */
  // The server settings are the intentional one-time seed for editable client preference state.
  // svelte-ignore state_referenced_locally
  /*
    THE THREE EAGER READS OF `data`, and why they are correct rather than a captured-value bug.

    `svelte-autofixer` flags this line with `state_referenced_locally`: *"this reference only
    captures the initial value of `data`."* That is TRUE and it is the intent. These are ONE-TIME
    SEEDS — the persisted preferences below, and `seed: data.swingAlerts` / `seed: data.dayTradeAlerts`
    further down. Each hands a class its starting value, after which the class owns it and the
    server's later pages arrive through paging rather than by re-seeding.

    The behaviour is byte-identical to what the page did: `data` there was `$props()`, read once at
    construction in exactly these three places. Moving to a `$derived` local preserved that, and the
    flag appears now only because the compiler can finally SEE the pattern.

    Recorded rather than suppressed with `svelte-ignore`, because nothing is actually warning —
    `svelte-check` reports 0 warnings — and eslint's `no-unused-svelte-ignore` correctly objects to a
    suppression with no warning under it. That rule already caught one such leftover in this slice.

    Everything else reads `data` inside a thunk and stays live. If a FOURTH eager read appears, the
    question to ask is whether its subject is genuinely a seed or whether somebody has just made the
    room stop following the server.
  */
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
        deps.mergeGlobalChatStyle(value as Partial<FollowChatStyle>);
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
    Every volume in the room, in `#lib/room/volume.svelte.ts`.

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

  const roster = new RoomRoster<PageData['connectedUsers'][number]>({
    seed: () => data.connectedUsers,
    simUserCount: () => data.sessData?.simUserCount ?? 0
  });

  /*
    The two chat columns, in `#lib/room/chat.svelte.ts`.

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

  /*
    The room's media STATE, in `#lib/room/media.svelte.ts`.

    Every flag the interface renders from — mic, camera, screen, this browser's media.recording and the
    ROOM's, who has a microphone open, and whether this member has been handed limited-presenter
    status. Not the transport: the `MediaStream`s, the `MediaRecorder`, the producer ids and the
    preview window stay as plain `let`s below, because nothing renders from a handle and a class
    that owned one would have gained an abstraction over the browser rather than an owner for state.

    `media.talking` and `media.limitedPresenter` were both filed under `RoomRoster` in the phase plan and
    both refused there. They arrive here because this is where their writers are.
  */
  const media = new RoomMedia();
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

  /*
    The room's two nested splits, in `#lib/room/split.svelte.ts`.

    The third room state class, and the largest so far: seven pieces of reactive state, five plain
    ones and twenty derived values that were spread from the seed here to the drag handlers 5,500
    lines below. The persisted layout is the intentional one-time seed; `settingsSplitPair` is a
    hoisted function declaration, so passing it as the reader at this point in the file is fine.

    A `const` that is never reassigned, for the reason `RoomPolls` records: `svelte/context` warns
    that reassigning a shared value breaks the link for everything reading it downstream.
  */
  const loadedChatStyle =
    prefs.loaded.chatStyle &&
    typeof prefs.loaded.chatStyle === 'object' &&
    !Array.isArray(prefs.loaded.chatStyle)
      ? (prefs.loaded.chatStyle as Partial<FollowChatStyle>)
      : {};
  const loadedRoomSplitDir = isRoomSplitDir(prefs.loaded.roomSplitDir)
    ? prefs.loaded.roomSplitDir
    : 'ltr';
  const split = new RoomSplit(loadedRoomSplitDir, settingsSplitPair);

  /*
    The poll modal's four fields, in `#lib/room/polls.svelte.ts`.

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

  /*
    The alerts pane's own state, in `#lib/room/alerts.svelte.ts`: the two-state toolbar, this
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
    The eleven floating menus, in `#lib/room/menus.svelte.ts`.

    They were eleven separate flags closed by TWO functions with two different lists — `openModal`
    left the top-bar dropdowns open, `closeFloatingMenus` left the emoji and GIF pickers open. Both
    behaviours are preserved exactly and are now named `closeForModal` and `closeFloating`, so the
    difference is a decision somebody can read rather than a divergence nobody can see.
  */
  const menus = new RoomMenus();

  /*
    The room's three bootbox dialogs, in `#lib/room/dialogs.svelte.ts`.

    Three fields and not one discriminated union, because they STACK: a prompt's `onconfirm` raises
    an alert, a confirm's handler raises an alert on failure, and the Escape handler at the bottom
    of this file reads all three in a fixed precedence for that reason. One field would let the
    second silently replace the first.

    Settable properties rather than `raise*` methods, so the forty-odd `dialogs.alert = '…'` sites
    stay assignments to state instead of becoming forty rewritten expressions.
  */
  const dialogs = new RoomDialogs();

  /*
    The screen VIEWER, in `#lib/room/screens.svelte.ts`.

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
    focusOnScreen
  });

  /*
    Everything a presenter plays for the WHOLE ROOM, in `#lib/room/broadcasts.svelte.ts`.

    The three commands are one shape: a button, a server command, and every browser reacting to what
    comes back on the `cmds` channel. The dispatch below calls RECEIVERS rather than assigning the
    fields, because stopping a video must also clear its armed timer and blank its schedule — three
    writes that a caller holding setters could do one of.

    The commands are injected rather than imported so the class needs no route import and its
    refusal paths can be tested without the wire.
  */
  const broadcasts = new RoomBroadcasts({
    dialogs,
    menus,
    setSoundCloudUrl: (url) => (media.soundCloudUrl = url),
    setSoundCloudPlaying: (playing) => (media.soundCloudPlaying = playing),
    commands: {
      video: (payload) => videoForAll(payload),
      youtube: (payload) => youtubeForAll(payload),
      fileMedia: (payload) => fileMediaCommand(payload)
    }
  });

  /*
    The file drive, in `#lib/room/files.svelte.ts`.

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
    The two trade alert feeds, in `#lib/room/trade-alerts.svelte.ts` — ONE class, two instances.

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
    // A one-time seed; see the note at `new RoomPrefs`.
    seed: data.swingAlerts,
    enabled: () => swingAlertsTabVisible(data.sessData ?? {}),
    uploadImages: (files) => composer.uploadAlertFiles(files)
  });

  const dayTradeAlerts = new RoomTradeAlerts<DayTradeAlertRow, DayTradeAlertAction>({
    dialogs,
    feed: DAY_TRADE_ALERT_FEED,
    // A one-time seed; see the note at `new RoomPrefs`.
    seed: data.dayTradeAlerts,
    enabled: () => dayTradeAlertsTabVisible(data.sessData ?? {}),
    uploadImages: (files) => composer.uploadAlertFiles(files)
  });

  /*
    The private-chat panel, in `#lib/room/private-chat.svelte.ts`.

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
    viewerOnlyMode: () => gates.viewerOnlyMode,
    playSound: (name) => playSoundEffect(name),
    closeUserMenu: () => menus.openUserMenu(null),
    selectRosterUser: (user) => userActions.select(user),
    onCleared: () => userActions.clearSelectedMessageUser(),
    onThreadDeleted: () => invalidateAll()
  });

  /*
    The room's toast queue, in `#lib/room/toasts.svelte.ts`.

    The first slice of the phase that moves BEHAVIOUR out of this file rather than declarations —
    the queue, its timers, the duplicate guard and the browser notification left together, because
    a class holding `toasts` while this file held every function that writes it is what Phase 1
    produced eight times and is why it only moved 584 lines.

    It owns the MECHANISM and deliberately not the policy. That sentence used to end "…`deliverAlert`
    and `deliverQaNotice` below decide who is told and with which sound, reading six preferences that
    still live in this file, so they stay here until those do." THE CONDITION FIRED: slice 3 moved
    those six preferences into `RoomPrefs`, and S3 moved the policy to `RoomOverlays.svelte`, which
    renders the `ToastHost` it drives. Recorded rather than deleted, because a note that names its
    own trigger is the only kind that can be checked later instead of remembered — and this one was
    checked, four slices after it was written.

    The split itself is unchanged and still the point: this class owns the queue, the timers, the
    duplicate guard and the browser notification; the component owns who is told and with which
    sound. What moved is the second half, to the layer that shows it.

    A `const` that is never reassigned, for the reason `RoomPolls` records: reassigning a shared
    reactive value breaks the link for everything reading it downstream.
  */
  const toasts = new RoomToasts();

  /*
    The SFU TRANSPORT, in `#lib/room/media-transport.svelte.ts`.

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
    showScreensTab: () => deps.setMainTab('screens'),
    checkPermissionState: (kind, userAgent) => checkPermissionState(kind, userAgent),
    isPresenter: () => isPresenter,
    /*
      The caption LIST stays here: the speech overlay renders it and the transcript page reads it.
      The transport knows a line arrived and nothing about what is done with it.
    */
    onCaption: (caption, isFinal) => {
      deps.setCurrentCaption(caption);
      if (isFinal) deps.pushCaptionHistory(caption);
    }
  });

  /*
    Everything that LEAVES this browser as content, in `#lib/room/composer.svelte.ts`.

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
    openModal: (name) => modals.open(name),
    closeModal: () => (modals.modal = null),
    closeMenu: (name, open) => menus.set(name, open),
    editMessage: (kind, item, body, bodyHtml) =>
      messageActions.editMessage(kind, item, body, bodyHtml),
    onSent: () => invalidateAll(),
    uploadServer: PUBLIC_PTR_UPLOAD_SERVER ?? '',
    uploadKey: PUBLIC_PTR_CDN_UPLOAD_KEY ?? ''
  });

  /*
    What a click on a MESSAGE can do, in `#lib/room/message-actions.svelte.ts`.

    Phase 5 slice 8, and it went LAST of the domain slices deliberately. This dispatcher reached
    into rich-text composer state, the private-chat panel, the evidence overlay, the modal shell and
    the mention router — all page-level when the phase began, all their own class now. Extracting it
    first would have meant a dozen injected callbacks rewritten three times as those slices landed.

    `openPrivateChat` is ONE receiver rather than two calls, because showing the panel and opening
    the thread must happen together — a caller with both can show an empty panel. `focusComposer`
    stays here because the element does, and a class cannot hold it without also owning when it
    mounts.

    THE MECHANISM NAMED HERE WAS WRONG until 2026-08-17: this said `composerElement` "is a
    `bind:this`". It is not. It is populated by `captureComposerElement`, an ATTACHMENT the page
    hands to `AlertChatArea` as a prop (`AlertChatArea.svelte:826`), because the `<textarea>` lives
    in that component and `bind:this` cannot cross a component boundary. The REASONING above was
    right and is unchanged; only the mechanism was misnamed, which is the kind of error that sends
    the next reader looking for a binding that does not exist.
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
    openModal: (name) => modals.open(name),
    closeMessageMenu: () => menus.openMessageMenu(null),
    selectUser: (user) => (userActions.selectedMessageUser = user),
    patchEvidence: (item, patch) => feeds.patchEvidence(item, patch),
    openPrivateChat: (peerId) => {
      privateChat.show();
      void privateChat.switchToUser(peerId);
    },
    openImage: (event, url) => modals.openImage(event, url),
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
    THE WINDOW LISTENERS' bodies, in `#lib/room/window-handlers.ts`.

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
    selectedImageUrl: () => modals.selectedImageUrl,
    clearSelectedImage: () => (modals.selectedImageUrl = null)
  });

  /*
    THE WEBCAM CARDS, in `#lib/room/webcams.ts`.

    Phase 5 slice 21. It RENDERS; it does not capture — `mediaTransport` acquires the camera and
    produces it, and this decides what a card looks like and which element the stream lands in. The
    two attribute setters beside it are module functions rather than methods, because neither reads
    any instance state.
  */
  const webcams = new RoomWebcams({
    media,
    mediaTransport,
    sessionHandle: () => data.sessionHandle
  });

  /*
    Everything that can be DONE to a user, in `#lib/room/user-actions.svelte.ts`.

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
  const userActions = new RoomUserActions<(typeof data.connectedUsers)[number]>({
    dialogs,
    toasts,
    commands: {
      presenter: presenterCommand,
      editUsername,
      muteChat,
      unmuteChat,
      forceReload,
      kickUser,
      sessionSendUrl,
      savePermissions
    },
    session: () => data,
    isPresenter: () => isPresenter,
    talking: () => media.talking,
    rosterUsers: () => roster.users,
    savePreference: (key, value) => prefs.save(key, value),
    openModal: (name) => modals.open(name),
    closeModal: () => (modals.modal = null),
    closeUserMenu: () => menus.openUserMenu(null),
    mentionUser: (name) => messageActions.mention(name),
    clearSelectedMessage: () => messageActions.clearSelected(),
    hidePreviewWindows: deps.hidePreviewWindows,
    defaultFollowStyle: () => defaultFollowChatStyle(),
    reload: () => invalidateAll()
  });

  /*
    The room's REALTIME CHANNEL, in `#lib/room/events.svelte.ts`.

    Phase 5 slice 5, and the largest single function left after slice 4: `subscribeToRoomEvents`
    was 575 lines routing six channels. The browser-side geolocation travels with it because it is
    the other thing this page starts and stops at the same two moments.

    Constructed AFTER `mediaTransport`, which it calls on three commands. Every collaborator below
    is something the stream ROUTES TO; it owns only the four fields describing the connection.

    `restartMediaSession` is a thunk returning a thunk, and that shape is load-bearing: the page
    does not define the rebuild until `onMount` has run, and a `giveMicScreen` frame can arrive
    before that. Passing the value would capture `null` forever.
  */
  const roomEvents = new RoomEventStream<PageData['connectedUsers'][number]>({
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
    restartMediaSession: () => () => mediaTransport.restart(),
    showTab: (tab) => deps.setMainTab(tab),
    chatMissedWhileHidden: deps.chatMissedWhileHidden,
    /*
      Declared below this call — the closure runs on a frame arriving from the server, long after
      `notes` is initialised, so the forward reference is resolved by then.
    */
    focusSessionNote: (noteId) => notes.focusNote(noteId),
    // Byte 2597102, verbatim. Why it is `alertThen` and not `confirm` is on `RoomDialogs.alertThen`.
    forceReloadRequested: () =>
      dialogs.alertThen('You need to reload this page to continue', () => location.reload()),
    // The presenter's own message, as text. No page swap: see `events.svelte.ts`.
    kicked: (message: string) => (dialogs.alert = message),
    // ONE instance, shared with the presenter's two buttons — see `RoomChatMute`.
    chatMute: userActions.chatMute
  });

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

  /*
    WHAT THIS VIEWER MAY SEE, in `#lib/room/gates.svelte.ts`.

    Phase 5 slice 27. Sixteen `$derived` predicates answering one question sixteen ways: given this
    room's configuration and this viewer's role, what is on screen.

    They are GETTERS in the class rather than `$derived` fields, because a derived field initialises
    in declaration order - before the constructor has assigned the thunks it reads - and would cache
    an `undefined` evaluation. `RoomFiles.filesHidden` is where that was first paid for. A getter is
    exactly as reactive: a `$derived` read through one is the same signal read.

    The RULES stay in `#lib/*-gates.ts` with their own tests. This asks them.
  */
  const gates = new RoomGates({
    prefs,
    media,
    session: () => data,
    isPresenter: () => isPresenter,
    rosterViewer: () => rosterViewer,
    rosterSession: () => rosterSession,
    chatAlertsDetached: () => chatAlertsDetached
  });

  /*
    The alerts log pages too, and shares this machinery deliberately: upstream renders ONE roomlog
    component for both, switched on `logType`, so the trigger, the guards, the terminator and both
    nudges are the same code there and are the same code here. What differs is only that alerts have
    no channel — `getAlertsLog {page}` against `getChatLog {channel, page}`.
  */
  /*
    Older-page state for BOTH logs, in `#lib/room/log-pages.svelte.ts`.

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

  /**
   * Older pages, oldest-first, keyed by channel.
   *
   * `$state.raw`: these arrays are only ever REPLACED, never mutated in place, so a deep proxy over
   * every message row would cost a proxy read per field on every render and buy nothing.
   */
  const chatPages = new RoomLogPages<(typeof data.messages)[number]>();

  /*
    What each pane actually RENDERS, in `#lib/room/feeds.svelte.ts`.

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
    WHICH OVERLAY IS SHOWING, in `#lib/room/modals.svelte.ts`.

    Phase 5 slice 24: the modal name, the tab each modal opens on, the image the lightbox holds, and
    the two actions reached only from inside one.

    The STATE moved with the functions, which is why nothing crosses back. An earlier measurement of
    the same ten functions reported three fields written on both sides — because the functions were
    leaving and their state was not.

    `theme` deliberately stayed: `setTheme` writes it, but thirteen other places read it, so it
    crosses as a receiver.
  */
  const modals = new RoomModals({
    menus,
    polls,
    messageActions,
    userActions,
    unreadQaAlertIds,
    setTheme: deps.setTheme
  });

  /*
    THE NOTES TAB s own actions, in `#lib/room/notes.svelte.ts`.

    Phase 5 slice 25. The two link mounts came with them because each wires a link that only exists
    inside note or file markup - content this class is responsible for - while the page s other
    capture helpers hold DOM handles the whole page reads. The plan named that seam as the one it
    was least sure of; measured, they do not read as one thing, so only the note pair moved.
  */
  const notes = new RoomNotes({
    menus,
    modals,
    noteGates: () => noteGates,
    showNotesTab: () => deps.setMainTab('notes'),
    focusOnSessionNote
  });

  /*
    SCROLL-FOLLOW and PAGING for all three feeds, in `#lib/room/feed-scroll.ts`.

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

  /*
    THE ALERTS PANE's own actions, in `#lib/room/alerts-pane.ts`.

    Phase 5 slice 22: archive, export, detach and the two toolbar toggles — what a viewer DOES to
    the pane, as against what `RoomAlerts` and `RoomFeeds` know about the alerts themselves.

    `chatAlertsDetached` is written on both sides of this boundary, so only the RECEIVER crosses:
    the class writes it and this file reads it to lay out. A reader thunk was supplied at first and
    eslint refused it as a collaborator nothing consumes.
  */
  const alertsPane = new RoomAlertsPane<(typeof data.alerts)[number]>({
    alerts,
    dialogs,
    prefs,
    feeds,
    alertsScroller: () => alertsScroller ?? null,
    forceAlertsToBottom: feedScroll.forceAlertsToBottom,
    sessionHandle: () => data.sessionHandle,
    setChatAlertsDetached: deps.setChatAlertsDetached
  });
  /*
    Returned as ONE frozen object, built once and never reassigned. The page destructures it into
    `const`s; reassigning any of them breaks the link for everything downstream, which is the silent
    failure this file's shape exists to prevent.
  */
  return {
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
    alertPages,
    chatPages,
    feeds,
    modals,
    notes,
    feedScroll,
    alertsPane,
    loadedChatStyle,
    rosterViewer
  } as const;
}

/** What `createRoom` hands back, for the page and for anything that takes the room whole. */
export type RoomContext = ReturnType<typeof createRoom>;
