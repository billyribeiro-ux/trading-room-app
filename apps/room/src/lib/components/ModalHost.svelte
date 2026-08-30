<script lang="ts">
  import AvDevicePane from '#lib/components/AvDevicePane.svelte';
  import ViewerAlertPrefsPane from '#lib/components/ViewerAlertPrefsPane.svelte';
  import type { ViewerAlertPrefs } from '#lib/viewer-alert-prefs.js';
  import type { RoomPeerHistory } from '#lib/room/peer-history.svelte.js';
  import CompactMessageRow from '#lib/components/CompactMessageRow.svelte';
  import { downscaledSize } from '#lib/profile-picture-downscale.js';
  import { shortWhen } from '#lib/short-when.js';
  import CloseSessionPane from './CloseSessionPane.svelte';
  import SessionHistoryPane from './SessionHistoryPane.svelte';
  import ReactionPrefsPane from './ReactionPrefsPane.svelte';
  import RestreamPane from './RestreamPane.svelte';
  import { ngbTooltip } from '#lib/ngb-tooltip.js';
  import { searchAlerts } from '../../routes/alerts-search.remote';
  import { ALERT_SEARCH_LIMIT } from '#lib/alert-search-limit.js';
  import { ROOM_PERMISSION_KEYS, type RoomPermissionKey } from '#lib/permission-keys.js';
  import {
    CONNECTIVITY_ROWS,
    connectivityGlyph,
    connectivityRowClasses
  } from '#lib/connectivity-status-rows.js';
  import { rtmpIngestUrl, whipIngestUrl, type StreamIngestKey } from '#lib/stream-ingest.js';
  import { invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { onMount, untrack } from 'svelte';
  import type { CaptureSettings } from '#lib/capture-settings.js';
  import type {
    AlertTab,
    ActivePoll,
    FollowChatStyle,
    ManagedChatUser,
    MessageAction,
    MessageActionItem,
    MessageReactionPayload,
    MessageReactions,
    ModalName,
    ModalTargetUser,
    RoomMessageItem,
    SavedPoll,
    SettingsTab,
    Theme,
    TradeCopyPayload
  } from '#lib/types.js';
  import type { AlertLabel } from '#lib/alert-labels.js';
  import RoomMessage from '#lib/components/RoomMessage.svelte';
  import { sameCalendarDay } from '#lib/message-formatters.js';
  import type { RoomMessageChrome } from '#lib/room-message-chrome.js';
  import {
    PRESENTER_COLOR_DEFAULTS,
    seedPresenterColors,
    type PresenterColorMap
  } from '#lib/presenter-colors.js';
  import { clearPresenterColors, savePresenterColors } from '../../routes/presenter-colors.remote';
  import type { ChatDisplayMode, ChatDisplaySurface } from '#lib/chat-display-mode.js';
  import type { MessageBadge } from '#lib/types.js';
  import AlertQaModal from './AlertQaModal.svelte';
  import BootboxDialog from './BootboxDialog.svelte';
  import EmojiPicker from './EmojiPicker.svelte';
  import MobileRestorePane from './MobileRestorePane.svelte';
  import UserNotesPane from './UserNotesPane.svelte';
  import LogArchiveModals from './LogArchiveModals.svelte';
  import FollowChatStylePane from './FollowChatStylePane.svelte';
  import type { UserNoteView } from '#lib/server/user-notes.js';
  import AvatarOptionsMenu from './AvatarOptionsMenu.svelte';
  import Modal from './Modal.svelte';
  import PollPanel from './PollPanel.svelte';
  import PostAlertModal from './PostAlertModal.svelte';
  import RichTextEditor from './RichTextEditor.svelte';
  import { chatModeConfirmPrompt, type ChatMode } from '#lib/chat-mode.js';
  import { refusalMessage, refusalOrTransportMessage } from '#lib/refusal-message.js';
  import { uploadFile } from '../../routes/files-pane.remote';
  import {
    giveMicScreen as giveMicScreenCommand,
    presenterCommand
  } from '../../routes/presenter-commands.remote';
  import type { PastedImageSubmission, PostAlertSubmission } from '#lib/post-alert-behavior.js';
  import {
    alertFilterAvailable,
    alertFilterConfirm,
    alertFilterTitle,
    parseModAlertFilterList,
    selectAllTraders,
    toggleTrader,
    traderRowIconClass,
    unselectAllTraders,
    type AlertFilterFor,
    type AlertFilterTrader
  } from '#lib/alert-filter.js';
  import {
    CAPTURED_TRADERS,
    canSearch,
    checkInputs,
    clearInput,
    emptySearch,
    filterAlerts,
    selectedLabel,
    toggleKey,
    SYNC_ROOMS_CONFIRM,
    type SearchableAlert
  } from '#lib/alerts-advanced-search.js';

  interface Props {
    name: ModalName;
    /**
     * The ICE servers THIS deployment minted, from `/api/media/grant` via `+page.svelte`.
     *
     * Empty until the media socket has opened once, which the connectivity test reports honestly
     * rather than papering over. See `runWebRTCTest`.
     */
    mediaIceServers?: RTCIceServer[];
    settingsTab: SettingsTab;
    alertTab: AlertTab;
    /** "Sticky non-trade alert?" — passed through to the composer, which re-applies it per open. */
    stickyNonTradeAlert?: boolean;
    /** `sessData.hasAlertScheduler`, forwarded to the composer — see `PostAlertModal`'s own prop. */
    schedulerAvailable?: boolean;
    /**
     * The room's configured Alert Labels, forwarded to the composer's picker (`PAM-01`).
     *
     * Parsed ONCE on the page (`gates.alertLabels`) — `parseAlertLabels` runs `JSON.parse`, and the
     * alerts log already needs the same table to render the badges. Two parses of one setting is how
     * a picker offers a label the renderer does not know.
     */
    alertLabels?: readonly AlertLabel[];
    theme: Theme;
    roomSplitDir: 'ltr' | 'ttb' | 'rtl' | 'btt';
    sessionControlInitialTab:
      | 'reset-session'
      | 'close-session'
      | 'lock-session'
      | 'av-device-selection'
      | 'streaming-selection'
      | 'session-history'
      | 'webinar-tools';
    chatStyle: FollowChatStyle;
    doNotDisturbOn: boolean;
    /**
     * `mediaService.saveData` — the AV settings modal's "Disable Video (saves bandwidth)" switch.
     *
     * Owned by the page, not by this component, because the thing it controls is the media layer:
     * upstream `callScreenOfUserWEBRTC` refuses to create the consumer at all while it is set
     * (`main.d6d3c112b59b7d0d.js` byte 1132193), so no screen stream is requested. Until 2026-08-14
     * this was a local `avVideoDisabled` that only changed its own label — the same dead-control
     * shape as `app-disable-video`, and the fifth such found in two days.
     */
    saveData: boolean;
    alertSoundOn: boolean;
    nonTradeSound: boolean;
    alertPopup: boolean;
    longerAlertPopup: boolean;
    qaSoundOn: boolean;
    chatSoundOn: boolean;
    pollOpenMode: 'setup' | 'auto';
    pollRestoreToken: number;
    activePoll: ActivePoll | null;
    savedPolls: SavedPoll[];
    onclose: () => void;
    onSettingsTab: (tab: SettingsTab) => void;
    onAlertTab: (tab: AlertTab) => void;
    onTheme: (theme: Theme) => void;
    onPreferenceChange: (key: string, value: unknown) => void;
    /**
     * `sessData.restreamToURL` — the room's current restream destination, for SEEDING the textarea.
     *
     * `undefined` for a participant, because the controller projects this one only to a presenter;
     * see `RoomSessionSettings.restreamToURL` for the argument. The pane it feeds is presenter-only
     * anyway, so the two agree, and the seed is `''` either way.
     */
    restreamUrl?: string;
    /**
     * `setRestreamURL` — SC-13's write, at the level the value actually lives at.
     *
     * Separate from `onPreferenceChange` on purpose, and that separation IS the fix: this pane wrote
     * the room's restream destination as a per-viewer preference for as long as it existed, and the
     * two paths being one function is what let that look right. A caller that must name a different
     * function cannot make the same mistake by passing a different string.
     */
    onSaveRestreamUrl: (url: string) => void;
    onDoNotDisturbChange: (enabled: boolean) => void;
    onSaveDataChange: (enabled: boolean) => void;
    onPlayYoutube: (url: string) => void;
    onPostAlert: (submission: PostAlertSubmission) => Promise<boolean>;
    onPastePostAlert: (submission: PastedImageSubmission) => Promise<boolean>;
    onPollMinimize: () => void;
    onPollSave: (question: string, choices: string[]) => Promise<boolean>;
    onPollDelete: (pollId: number) => Promise<boolean>;
    onPollSend: (question: string, choices: string[]) => Promise<boolean>;
    onPollAnswer: (choiceIndex: number) => Promise<boolean>;
    onPollPostResults: (body: string) => Promise<boolean>;
    onPollEnd: () => Promise<boolean>;
    onAlert: (message: string) => void;
    onConfirm: (message: string, onconfirm: () => void) => void;
    onReplySend: (body: string) => Promise<boolean>;
    onQuestionSend: (body: string) => Promise<boolean>;
    alertQuestions?: readonly {
      id: number;
      alertId: number;
      senderId: number;
      body: string;
      createdAt: Date | string;
      senderName: string;
      senderEmailHash: string;
      senderAvatarUrl: string;
      senderRole: string;
      /**
       * The row's own reactions, validated on the SERVER by `parseReactions` before they travel —
       * the same shape and the same route every other rendered message takes.
       */
      reactions: MessageReactions;
    }[];
    /**
     * The chrome every rendered message shares, spread onto each Q&A entry.
     *
     * THIS REVERSES A DECISION recorded in `room-message-chrome.ts`, which said the thread was
     * "left spelling its four" because spreading the full chrome "would silently turn those on
     * inside a modal that has never shown them". That was right while the thread was inert: it
     * rendered `kind="chat"` with an `onaction` that did nothing, so anything the chrome switched on
     * would have been a control that could not act.
     *
     * The thread acts now, and it renders `kind="alert"` because that is what the reference does
     * (`this.isQAMsg = !0, this.logType = "alerts"`). Spreading is what makes its menu the menu the
     * reference draws, minus the three entries that are dead upstream — `message-behavior.ts` names
     * them and says why.
     *
     * `alertLabels` is deliberately NOT passed, and that is the reference's own choice: the body
     * pipe receives `e.isQAMsg ? null : alertLabels` (bundle byte 1,331,700), so a hash inside a
     * question stays text.
     */
    messageChrome: RoomMessageChrome;
    /**
     * Every presenter's message colours for this room, keyed by the sender's email hash.
     *
     * Two consumers here, and they are different halves of the same feature: the Q&A thread renders
     * messages and needs the map to look each sender up, and the settings modal's two colour
     * pickers open on THIS presenter's entry — `messageChrome.currentUserEmailHash` — rather than
     * on a constant, which is what they did until 2026-08-30. `presenter-colors.ts` holds the rest.
     */
    presenterColors: PresenterColorMap;
    /**
     * The two display modes the settings modal's Text Mode radios show and set.
     *
     * `alertsDisplayMode` is also what the Q&A thread renders in — upstream's Q&A modal calls
     * `loadAlertsMode()`, the same function the alerts log calls, rather than keeping a third key.
     */
    alertsDisplayMode: ChatDisplayMode;
    chatLogDisplayMode: ChatDisplayMode;
    onDisplayModeChange: (surface: ChatDisplaySurface, mode: ChatDisplayMode) => void;
    /**
     * What a Q&A entry's menu asks for. `mention` never arrives here — this component owns the
     * thread's composer, so it inserts that one itself.
     */
    onQaAction: (
      action: MessageAction,
      item: MessageActionItem,
      payload?: MouseEvent | MessageReactionPayload | TradeCopyPayload
    ) => void;
    onMentionUser: (name: string) => void;
    onPrivateChat: (user: ModalTargetUser) => void;
    onFollowToggle: (user: ModalTargetUser) => void;
    onFollowStyleChange: (user: ModalTargetUser, style: FollowChatStyle) => void;
    onMuteToggle: (user: ModalTargetUser) => void;
    onUserAction: (action: string, user: ModalTargetUser) => void;
    /**
     * The Admin Notes tab: its gate, its list, and the two actions on it.
     *
     * **BOTH STATES EXIST NOW, 2026-08-29.** There used to be a separate `canManageNotes` prop here
     * whose docblock said only one did — *"`notes` is room-scoped, keyed by `room_short_code` with
     * no member column, so there are no per-member notes to list. That is a schema change and its
     * own feature."* The diagnosis was right and the schema change is done: `user_notes`, keyed by
     * room AND subject. `canManage` travels with the data it gates rather than beside it, so there
     * is no way to pass one and forget the other.
     *
     * Structural rather than `RoomUserNotes` itself, so this component depends on the SHAPE and not
     * on a class in `lib/room/` — which is what lets `UserNotesPane`'s own test render it against a
     * plain object instead of standing up the room. Every method is invoked through an arrow at the
     * call site below, never handed over by reference: a class method passed as a value loses
     * `this`, which `dialogs.svelte.ts` records having been bitten by.
     */
    userNotes: {
      /** Upstream's `allowToManageNotes` — what the room may DRAW. The server decides what it writes. */
      readonly canManage: boolean;
      readonly notes: readonly UserNoteView[];
      readonly loading: boolean;
      readonly error: string | null;
      add(): void;
      remove(note: UserNoteView): void;
      open(subjectUserId: number): void;
    };
    /**
     * The target member's badges, resolved by `RoomFeeds.badgesFor` on the page.
     *
     * A prop rather than a resolver callback because every other fact about the target arrives that
     * way, and because the resolution needs the page's badge map and the theme — both of which the
     * page has and this component does not.
     */
    targetBadges: readonly MessageBadge[];
    /**
     * Save the five permission checkboxes — the one control here that carries a PAYLOAD.
     *
     * `onUserAction` takes a name and a target and nothing else, so the ticked boxes had no way out
     * of this component; that is why Save reported success and saved nothing until 2026-08-23.
     * Widening the shared prop was refused for the reason `focusOnSessionNote` paid for. The rest is
     * on `permissions.remote.ts`.
     */
    onSavePermissions: (user: ModalTargetUser, granted: RoomPermissionKey[]) => void;
    /**
     * The saved `streamingType` preference — `'RTMP'`, `'WHIP'`, or `''` when never chosen.
     *
     * The radio pair has always WRITTEN this and never read it back, which was invisible while
     * nothing depended on the value. It is load-bearing now: the reference gates its two ingest
     * blocks on `streamingType` (byte 2152300), so an unseeded field means a presenter who chose
     * WHIP last session reopens the panel to a blank pane.
     *
     * Blank stays blank rather than defaulting to one of the two. A default here would be a value
     * nothing captured, and the reference has no unset state to copy — its preference is always
     * populated.
     */
    streamingType: string;
    /**
     * Every device and processing flag the A/V pane saves, as saved. See `#lib/capture-settings.ts`.
     *
     * ONE prop rather than five, and the same value the capture itself reads. It seeds this pane's
     * controls so a reopened modal shows what is actually in force — they were `$state(false)` and
     * two fabricated device ids until 2026-08-30, and neither told the truth.
     */
    capture: CaptureSettings;
    /**
     * The alerts tab's five gated viewer preferences — five controls the reference has, this room
     * did not, and every one of them sat over a live consumer. See `#lib/viewer-alert-prefs.ts`.
     */
    viewerAlerts: ViewerAlertPrefs;
    onManagedUserRemoval: (list: 'mutedUsers' | 'followedUsers', user: ManagedChatUser) => void;
    onManagedUserInfo: (user: ManagedChatUser) => void;
    /**
     * `sessData.enablePrivateMessageHistory` — whether the user-info modal offers the moderation
     * read at all.
     *
     * A CONVENIENCE, not the authority: `loadPeerPrivateMessageHistory` refuses on the server from
     * the control plane. Hiding the button stops a presenter asking for something the room has not
     * enabled; it is not what stops the read.
     */
    privateMessageHistoryEnabled: boolean;
    /** Opens the all-user private-message modal for one peer. */
    onShowPrivateMessages: (user: ModalTargetUser) => void;
    /**
     * What that modal is showing, why it is not, and whether it is still asking.
     *
     * ONE collaborator rather than the three parallel props this used to be — see the getter it
     * comes from. Three props that are one idea is the shape this session corrected twice.
     */
    peerHistory: RoomPeerHistory;
    currentUser: {
      id: number;
      email: string;
      emailHash: string;
      role: string;
    };
    /**
     * `mobilePin`, from the server's `getMyMobilePin`.
     *
     * The room never computes it: the reference sends the command and the server answers with a
     * pair code. `N/A` is the captured value for "not answered yet".
     */
    mobilePin?: string;
    /**
     * Whether this member can reach the mobile app at all — `gates.mobileAppAvailable`.
     *
     * Gates the Mobile App TAB, which upstream does not gate at all. That absence is
     * `docs/decoded/mobile-app-decoded.md` §3 row 26, verified by reading the whole troubleshooter
     * component: `ptrMobileAppEnabled` occurs five times in the bundle and none is in that range.
     *
     * The doc asks for a deliberate decision rather than a copy, and this is it. A room with no app
     * configured would otherwise show a tab whose only button answers 409 every time — a control
     * whose sole effect is its own presence, which this repository refuses by name. The endpoint is
     * gated regardless; this stops the member being offered something that cannot work.
     */
    mobileAppAvailable?: boolean;
    /** `restoreMobileAppTokens` — see `runMobileRestore`, which composes what the member reads. */
    onrestoremobiletokens: () => Promise<{
      registrations: number;
      sent: number;
      failed: number;
      pruned: number;
    }>;
    /** `sessData.customMobileAppAndroidUrl`, when `customMobileAppEnabled`. */
    mobileAndroidUrl?: string | null;
    /** `sessData.customMobileAppIOSUrl`, when `customMobileAppEnabled`. */
    mobileIosUrl?: string | null;
    /** `O(13, sessData.hideMobileCredentials ? -1 : 13)`. */
    hideMobileCredentials?: boolean;
    /**
     * `globals.isLimitedPresenter` — runtime state, set when a presenter hands somebody mic and
     * screen. Narrows two controls in this modal that `isPresenter` alone was opening.
     */
    isLimitedPresenter?: boolean;
    /**
     * `globals.user.hasMic` — the DURABLE membership permission, not the runtime grant.
     *
     * One of the five `permissions_json` keys, ticked in this modal's own user-info pane
     * (`hasMicChk`). It is what opens the session-control modal's non-presenter body — see the
     * `{:else if hasMic}` arm at the modal itself for the decoded gate and why it is not
     * `isLimitedPresenter`.
     */
    hasMic?: boolean;
    /**
     * `globals.hasSpeechRecognition` — USM-15, the ROOM's captions entitlement.
     *
     * `globals.hasSpeechRecognition = !sessData.hasSpeechRecognitionDisabled && !0` at byte
     * 1,147,900, and `O(132, hasSpeechRecognition ? 132 : -1)` at 2,285,653 is what it draws. Read
     * off `RoomGates.speechRecognitionAvailable` rather than re-derived here, because that getter
     * already owns the `!== true` reading — absent means NOT disabled, so a room that never
     * configured captions has them.
     */
    captionsAvailable?: boolean;
    /**
     * `canEditUsername` — `sessData.allowUsersToChangeUsername`, the member's own rename.
     *
     * The fallback branch of `O(9)`. Different action from the presenter's: `editUsernameByUser`
     * rather than `editUsername`.
     */
    canEditUsername?: boolean;
    targetUser: ModalTargetUser;
    /**
     * `adminUploadProfilePic` — a presenter sets this member's avatar.
     *
     * Its own prop, not an `onUserAction` case: see the note at the button. The `File` crosses to
     * the server as a real `File`, which `uploadComposerImage` already relies on and documents.
     */
    onUploadProfilePicture: (user: ModalTargetUser, file: File) => void;
    /** The other half of the same control — see the button in the avatar cluster. */
    onRemoveProfilePicture: (user: ModalTargetUser) => void;
    /**
     * The debug log this presenter last received, or null.
     *
     * Both fields are filled by the SERVER from the replying member's own session — a member cannot
     * name whose log this is said to be, which is the one thing upstream's `{requestor}` reply let
     * it do. See `routes/debug-log.remote.ts`.
     */
    debugLog?: { fromUserId: number; fromName: string; log: string } | null;
    mutedUsers: Record<string, ManagedChatUser>;
    followedUsers: Record<string, ManagedChatUser>;
    targetMessage: {
      id: number;
      senderName: string;
      body: string;
      // The Q&A header reproduces the alert card, so it needs the avatar and the timestamp too.
      senderAvatarUrl?: string;
      createdAt?: Date | string;
      evidenceTimestampText?: string;
    } | null;
    /**
     * The viewer's mod-alert filter, applied to SERVER search results.
     *
     * A predicate rather than the rows, since 2026-08-23. The search asks the database now, and the
     * database cannot know which traders this viewer filtered out — so the rule travels to the
     * results. `alert-filter-contract.test.ts` calls this site three of three.
     */
    alertSearchFilter: (alert: SearchableAlert) => boolean;
    /**
     * The chat rich text editor's three-way gate, already resolved by the page.
     *
     * `sessData.enableRTE && preferences.enableRTE && isPresenter`. Resolved there and not here
     * because the same answer gates the composer button that opens this modal, and one expression
     * with one consumer cannot drift from itself. The reference asks it twice for the same reason
     * and gets it wrong once — see `canUseRTE` in `room/composer.svelte.ts`.
     */
    canUseRTE?: boolean;
    /** The message being composed in the editor, as HTML. The page owns it; this modal shows it. */
    rteDraft?: string;
    /** `Save` when editing an existing message, `Send` otherwise — the reference's two labels. */
    rteIsEditing?: boolean;
    /** The room's chat mode — `g`, `p` or `d` — read from `room_state` by the page load. */
    chatMode?: ChatMode;
    /** `changeChatMode` — a presenter act that changes the room; `#lib/chat-mode.ts` says why typed. */
    onChatModeChange: (mode: ChatMode) => void;
    /** What members are told when the room is closed, as stored. The editor opens on this. */
    closedMessage?: string;
    /**
     * Both close-session buttons, as ONE receiver taking what they differ by.
     *
     * *" Save Message and Close Session "* and *" Just Save Close Message "* save the same text; one
     * of them then closes the room. Two props would have been two chances to wire the save to only
     * one of them — which is exactly what was wrong here until 2026-08-27, when the first wrote
     * `sessionOpen: false` without the message and the second raised `Message Saved` and wrote
     * nothing at all. Two buttons offered to save it and neither did.
     */
    onSaveCloseMessage?: (message: string, then: 'close' | 'save-only') => void;
    onRteDraftChange: (html: string) => void;
    onRteSend: () => void;
    /**
     * `sessData.modAlertFilterList` — a STRING containing JSON, parsed when the modal opens.
     *
     * Undefined or blank means the room configured no list, and the reference then has no feature
     * at all: no entry point, no modal, no filtering. See `alertFilterAvailable`.
     */
    modAlertFilterList?: string;
    /** `globals.user.alertFilterFor` — avatar hash to username. The map IS the selection. */
    alertFilterFor?: AlertFilterFor;
    /** `preferences.showAlertsFrom` — INVERTS the filter: true allow-list, false deny-list. */
    showAlertsFrom?: boolean;
    /** `updateAlertFilter` — persist the selection. The page owns the round trip. */
    onsavealertfilter?: (next: { alertFilterFor: AlertFilterFor; showAlertsFrom: boolean }) => void;
    /**
     * `openAlertFilterModal()` — the settings modal's own entry point into the Alert Filter.
     *
     * Single-purpose rather than a general `openModal(name)`, because that is the shape the
     * reference has: TWO components declare a method by this exact name and both bodies are
     * `guiEventBus.emit("doAlertFilterModal")` — bytes 2,051,809 and 2,256,592. A generic
     * navigation callback would be a wider API than anything captured asks for, and `name` is
     * owned by the page.
     *
     * Bootstrap does the switch declaratively upstream via `data-bs-target`; here the page changes
     * `name`, which closes this modal and opens that one.
     */
    onopenalertfilter?: () => void;
  }

  let {
    name,
    mediaIceServers = [],
    settingsTab,
    alertTab,
    stickyNonTradeAlert = false,
    schedulerAvailable = false,
    alertLabels = [],
    theme,
    roomSplitDir,
    sessionControlInitialTab,
    chatStyle: initialChatStyle,
    doNotDisturbOn,
    saveData,
    alertSoundOn,
    nonTradeSound,
    alertPopup,
    longerAlertPopup,
    qaSoundOn,
    chatSoundOn,
    pollOpenMode,
    pollRestoreToken,
    activePoll,
    savedPolls,
    onclose,
    onSettingsTab,
    onAlertTab,
    onTheme,
    onPreferenceChange,
    restreamUrl,
    onSaveRestreamUrl,
    hasMic = false,
    captionsAvailable = true,
    onDoNotDisturbChange,
    onSaveDataChange,
    onPlayYoutube,
    onPostAlert,
    onPastePostAlert,
    onPollMinimize,
    onPollSave,
    onPollDelete,
    onPollSend,
    onPollAnswer,
    onPollPostResults,
    onPollEnd,
    onAlert,
    onConfirm,
    onReplySend,
    onQuestionSend,
    alertQuestions = [],
    messageChrome,
    presenterColors,
    alertsDisplayMode,
    chatLogDisplayMode,
    onDisplayModeChange,
    onQaAction,
    onMentionUser,
    onPrivateChat,
    onFollowToggle,
    onFollowStyleChange,
    onMuteToggle,
    onUserAction,
    targetBadges,
    userNotes,
    onSavePermissions,
    streamingType,
    capture,
    viewerAlerts,
    onManagedUserRemoval,
    onManagedUserInfo,
    privateMessageHistoryEnabled,
    onShowPrivateMessages,
    peerHistory,
    currentUser,
    mobilePin = 'N/A',
    mobileAppAvailable = false,
    onrestoremobiletokens,
    mobileAndroidUrl = null,
    mobileIosUrl = null,
    hideMobileCredentials = false,
    isLimitedPresenter = false,
    canEditUsername = false,
    targetUser,
    debugLog = null,
    onUploadProfilePicture,
    onRemoveProfilePicture,
    mutedUsers,
    followedUsers,
    targetMessage,
    alertSearchFilter,
    canUseRTE = false,
    rteDraft = '',
    rteIsEditing = false,
    chatMode = 'g',
    closedMessage = '',
    onSaveCloseMessage,
    onChatModeChange,
    onRteDraftChange,
    onRteSend,
    modAlertFilterList,
    alertFilterFor = $bindable({}),
    showAlertsFrom = $bindable(false),
    onsavealertfilter,
    onopenalertfilter
  }: Props = $props();

  /**
   * TradingRoom v1's home, standing in for both store listings.
   *
   * The captured defaults are Pro Trading Room v3's (`com.bellesoft.protradingroomv3` and
   * `id1587924329`). This build is v1 and has no store listings, so both badges point at the app's
   * own site rather than at two invented package ids. Named once so they cannot drift, and so
   * replacing it with real listings later is a single edit.
   */
  const TRADINGROOM_APP_URL = 'https://www.tradingroom.app';
  const mobileAndroidHref = $derived(mobileAndroidUrl?.trim() || TRADINGROOM_APP_URL);
  const mobileIosHref = $derived(mobileIosUrl?.trim() || TRADINGROOM_APP_URL);

  /**
   * `#alerts-advanced-search-modal` state, transcribed from the captured component's constructor
   * (`docs/source/components/app-alerts-advanced-search.compiled.js:27-40`):
   * `this.msgs = []`, `this.loading = !1`, and the `search` object.
   */
  let advancedSearch = $state(emptySearch());
  let advancedSearchResults = $state.raw<SearchableAlert[]>([]);

  /**
   * One search hit, in the shape `RoomMessage` renders.
   *
   * `searchAlertLog` already selects every field this needs — it joins `users` for the name, avatar,
   * role and status and hashes the address — so nothing is invented here and nothing is fetched
   * again. The cast is a WIDENING at the type level only: `SearchableAlert` is deliberately the
   * narrow shape the pure filter needs (`alerts-advanced-search.ts` says so), and the rows this
   * modal actually holds are the wide ones the remote query returned.
   *
   * `reactions` are passed through because the row carries them and the log renders them; nothing
   * here can toggle one, which is what `showMenu={false}` and the refusing action handler below
   * make true rather than merely unlikely.
   */
  const searchResultItem = (result: SearchableAlert): RoomMessageItem => {
    const row = result as SearchableAlert & Partial<RoomMessageItem>;
    return {
      ...row,
      id: row.id,
      senderId: row.senderId ?? 0,
      senderName: row.senderName ?? '',
      senderEmailHash: row.senderEmailHash,
      senderAvatarUrl: row.senderAvatarUrl ?? '',
      body: row.body,
      createdAt: new Date(result.createdAt)
    };
  };

  /**
   * The ONE thing a search result can do — `copyTradeOnClick`, the reference's own extra binding.
   *
   * Everything else is refused rather than forwarded, and the refusal is silent because nothing can
   * reach it: the kebab is not drawn (`showMenu={false}`), so `copy-trade` is the only action the
   * row emits. The `if` is here so that a later change which draws more controls fails closed
   * instead of quietly routing a delete through this modal.
   */
  function runSearchResultAction(
    action: MessageAction,
    _item: RoomMessageItem,
    payload?: unknown
  ): void {
    if (action !== 'copy-trade') return;
    const text = (payload as { text?: string } | undefined)?.text ?? '';
    if (!text || typeof navigator === 'undefined') return;
    void navigator.clipboard.writeText(text);
  }
  let advancedSearchLoading = $state(false);
  /* The search reached `ALERT_SEARCH_LIMIT`, so the list is the newest matches and not all of them.
     Rendered, because a cap the reader cannot see is the defect this change removed. */
  let advancedSearchTruncated = $state(false);
  /** `selectedTradersStr` / `selectedRoomsStr` - empty string means "show the placeholder span". */
  const selectedTradersStr = $derived(selectedLabel(advancedSearch.traders));
  const selectedRoomsStr = $derived(selectedLabel(advancedSearch.rooms));
  /** Gates the red Clear button AND the footer's `justify-content-between`. */
  const advancedSearchHasInput = $derived(
    checkInputs(advancedSearch, advancedSearchResults.length)
  );

  /**
   * `#alert-filter-modal` — `app-alert-filter-modal`, bundle bytes 1,218,900-1,224,100.
   *
   * The list is synced from the ROOM SETTING when the modal opens, not held across the session:
   * `ngOnInit` subscribes to `doAlertFilterModal` and answers with `syncModAlertFilterList()`
   * (byte 1,221,830). Reproduced with an effect on `open` so the parse happens at the same moment.
   *
   * `parseModAlertFilterList` throws on malformed JSON, deliberately — see its note. The throw
   * lands here, when the modal opens, and the room keeps running.
   */
  const alertFilterTraders = $derived.by<AlertFilterTrader[]>(() => {
    /*
      Gated on the modal being the open one, which is what makes this equivalent to the reference's
      `doAlertFilterModal` subscription rather than merely similar. Two things follow from it:

      the parse does not run for a room that never opens the modal, and — because
      `parseModAlertFilterList` deliberately does NOT catch, mirroring `syncModAlertFilterList` at
      byte 1,221,905 — a malformed room setting throws HERE rather than while the page renders.

      Written as a derived rather than an effect assigning state, which is the same reason the rest
      of this file prefers one: an effect that assigns is a second source of truth.
    */
    if (name !== 'alert-filter') return [];
    return parseModAlertFilterList(modAlertFilterList);
  });

  /**
   * `updateAlertFilter()`, byte 1,221,430 — confirm, then recompute `doFilteredAlerts`, send, and
   * persist the preference. The confirm text depends on BOTH the selection being empty and the
   * direction, which is why it comes from the module rather than being inlined here.
   */
  function saveAlertFilter() {
    alertFilterConfirmMessage = alertFilterConfirm(alertFilterFor, showAlertsFrom);
  }

  /** Set while the bootbox confirm is open; `null` when it is not. */
  let alertFilterConfirmMessage = $state<string | null>(null);

  function confirmAlertFilter() {
    alertFilterConfirmMessage = null;
    onsavealertfilter?.({ alertFilterFor, showAlertsFrom });
  }

  /**
   * `showAlertsFrom()`, byte 1,221,180 — the checkbox flips the direction and saves immediately,
   * so the confirm appears on the click rather than on a separate Save.
   */
  function toggleShowAlertsFrom() {
    showAlertsFrom = !showAlertsFrom;
    saveAlertFilter();
  }

  /**
   * `searchAlerts()` - the early return, then the query.
   *
   * A REAL round trip now, which is what the loading state above was always describing. Until
   * 2026-08-23 this filtered the `alerts` prop — `loadAlertPage`'s newest FIFTY rows — so a date
   * range pointing further back searched fifty rows from today and answered "no results" over a log
   * that had them. `alerts-search.remote.ts` carries the reasoning.
   *
   * `filterAlerts` still runs, on the server's answer: the trader predicate matches
   * `senderEmailHash`, which is computed from the address at read time and is not a column, so no
   * SQL can express it. Three predicates moved; that one cannot.
   */
  async function runAdvancedSearch() {
    if (!canSearch(advancedSearch)) return;
    advancedSearchResults = [];
    advancedSearchTruncated = false;
    advancedSearchLoading = true;
    try {
      const found = await searchAlerts({
        txt: advancedSearch.txt,
        startDate: advancedSearch.startDate,
        endDate: advancedSearch.endDate,
        nonTradeAlert: advancedSearch.nonTradeAlert
      });
      advancedSearchResults = filterAlerts(found.alerts.filter(alertSearchFilter), advancedSearch);
      advancedSearchTruncated = found.truncated;
    } finally {
      // `finally`, so a refused or timed-out search clears the spinner instead of hanging it.
      advancedSearchLoading = false;
    }
  }

  function clearAdvancedSearch() {
    advancedSearch = clearInput();
    advancedSearchResults = [];
    advancedSearchTruncated = false;
    advancedSearchLoading = false;
  }

  /**
   * `syncRooms()` (`app-alerts-advanced-search.compiled.js:167-171`):
   *
   * ```js
   * syncRooms() {
   *   bootbox.confirm('Are you sure you want to reload the room list?', (e) => {
   *     e && this.appService.getAllSTRoomsForUser();
   *   });
   * }
   * ```
   *
   * The confirm and its text are captured. What it confirms is not reproducible here: the room
   * list comes from `getAllSTRoomsForUser`, a multi-room route this single-room app does not have,
   * and `SYNC_ROOMS_UNAVAILABLE` says so rather than leaving a button that silently does nothing.
   * That message is ours, and is an honest-pending state - not captured copy.
   */
  let syncRoomsConfirmOpen = $state(false);
  let syncRoomsNotice = $state<string | null>(null);
  const SYNC_ROOMS_UNAVAILABLE =
    'The room list is not reloadable here: this room has no multi-room directory to sync from.';

  function onSyncRooms() {
    syncRoomsConfirmOpen = true;
  }

  let pollPanelHost = $state<HTMLElement | undefined>();
  let userInfoTab = $state<'info' | 'system' | 'options' | 'notes'>('info');
  let userMuteMenuOpen = $state(false);
  let userPermissions = $state({
    hasMic: false,
    hasScreen: false,
    hasCam: false,
    hasAdminChat: false,
    canEditNotes: false,
    temporaryAccessOnly: false
  });
  let followChatStyle = $state<FollowChatStyle>({
    color: '#f7fd37',
    tickerColor: '#f7fd37',
    usernameColor: '#c0d8ed',
    bgColor: '#000000',
    fontSize: 14,
    playSound: true
  });
  let replyComposer = $state('');
  let replyEmojiOpen = $state(false);
  let youtubeURL = $state('');
  let ytVideoList = $state<Array<{ title: string; url: string }>>([]);
  let youtubePromptOpen = $state(false);
  let youtubeRemoveIndex = $state<number | null>(null);
  let youtubeAlert = $state<string | null>(null);
  let avSettingsTab = $state<'user' | 'presenter'>('user');

  let sessionControlTab = $state<
    | 'reset-session'
    | 'close-session'
    | 'lock-session'
    | 'av-device-selection'
    | 'streaming-selection'
    | 'session-history'
    | 'webinar-tools'
  >('reset-session');
  let streamingControlTab = $state<'stream-player' | 'obs-streaming' | 'restream'>('obs-streaming');
  /*
    The room's chat mode, from `room_state` via the page load — NOT local state.

    It was `$state('g')`, seeded to group chat on every open regardless of the room, so the radio
    could show "Group Chat" in a room whose chat was disabled.
  */
  const groupChatMode = $derived(chatMode);
  const fileUploadInputId = 'fupload';
  /*
    Seeded from the saved preference, then owned locally.

    Not `$derived`: the radio pair binds to it with `bind:group` and the user must be able to change
    it without the preference having round-tripped. The initial read is the point — see the
    `streamingType` prop.
  */
  let streamingProtocol = $state(untrack(() => streamingType));
  /*
    OBS / XSplit ingest.

    `mtxToken` is `globals.mtxToken` in the reference and is the ONE secret: the RTMP URL carries it
    as `?jwt=`, and WHIP presents the same value as an HTTP Bearer
    (`main.d6d3c112b59b7d0d.js` byte 2157950).

    `$state.raw` on the answer object, not `$state`: it is replaced wholesale on every mint and never
    mutated field-by-field, so a deep proxy over it would cost a proxy read on every render for a
    reactivity nobody uses.
  */
  let ingest = $state.raw<StreamIngestKey | null>(null);
  let ingestError = $state('');
  let ingestLoading = $state(false);
  /*
    The three strings the presenter copies, derived from the one answer rather than assigned.

    This is a DELIBERATE, named divergence from the reference, and the reason is a defect there:
    its `getNewToken()` rebuilds `streamingLinkRTMP` only (byte 2169850), leaving `streamKey` and
    `streamingLink` holding the token that was just revoked. A presenter who pressed "New Link"
    while on the WHIP tab would copy a dead Bearer and the publish would be refused with nothing
    on screen to explain why. Deriving all three from one source makes that state unrepresentable.
  */
  const streamKey = $derived(ingest?.rtmpToken ?? '');
  const streamingLink = $derived(
    ingest && ingest.configured ? whipIngestUrl(ingest.streamServerMTX, ingest.ingestPath) : ''
  );
  const streamingLinkRTMP = $derived(
    ingest && ingest.configured
      ? rtmpIngestUrl(ingest.streamServerMTX, ingest.ingestPath, ingest.rtmpToken)
      : ''
  );
  let reportLoading = $state(true);
  /*
    ── THE TWO TEXT-MODE RADIOS WERE DEAD, and this is the third control of that exact shape ────────

    They were `$state<'regular' | 'compact'>('regular')` here, seeded to a CONSTANT and never from
    anything, writing `onPreferenceChange('alertDisplayMode' | 'chatDisplayMode', 'regular' |
    'compact')` — three invented names against the reference's own `alertsMode` / `chatMode` keys and
    its `'r'` / `'c'` values. Nothing in this room read any of them. So the radios persisted a
    preference nobody consulted, and reopening the modal showed Regular whatever had been picked.

    That is the same defect the room's chat-mode radio had (`chat-mode.remote.ts` records it) and the
    same one `dead-preference-keys.ts` was written for. Both invented keys join that list.

    They are PROPS now: the mode is resolved once per surface on the page — `resolveChatDisplayMode`,
    which the owner's `altChatRender` can force — and a change is reported back up rather than kept
    here, because the logs that render it are not inside this component.
  */
  /*
    ── THE PRESENTER'S TWO COLOUR PICKERS, and what they used to be ────────────────────────────────

    They were seeded from these two CONSTANTS and their Save button wrote
    `onPreferenceChange('presenterStyle', …)` — a key in this presenter's own settings blob that
    nothing read, in a store no other viewer can see — under a heading reading *"These colors will
    affect how ALL USERS see your messages and alerts"*. All three claims in that sentence were
    false at once, and reopening the modal showed these constants whatever had been picked.

    They are seeded from the room's stored map now (the effect below, on modal open, which is where
    the reference seeds them too) and both buttons send a real command. `presenter-colors.ts` holds
    the transcription, `presenter-colors.remote.ts` the write.

    Plain `$state` strings rather than an object, because `bind:value` on `<input type="color">`
    writes them individually — the same reason `chatStyle` below is `$state` and not `$state.raw`.
  */
  let presenterTextColor = $state(PRESENTER_COLOR_DEFAULTS.dark.color);
  let presenterBackgroundColor = $state(PRESENTER_COLOR_DEFAULTS.dark.bgColor);
  let chatStyle = $state<FollowChatStyle>({
    color: '#f7fd37',
    tickerColor: '#f7fd37',
    usernameColor: '#c0d8ed',
    bgColor: '#000000',
    fontSize: 14,
    playSound: true
  });
  let screenPreviewDropdownOpen = $state(false);
  let traderDropdownOpen = $state(false);
  let roomDropdownOpen = $state(false);
  let settingChecks = $state<Record<string, boolean>>({
    'app-recording-start-sound': true,
    'app-recording-stop-sound': true,
    'app-recording-preview-window': true,
    'note-update-popup': true,
    'app-reactions-popup': true,
    'app-reactions-popup-qa': true,
    'app-reactions-sound-qa': true,
    'pm-window-layout': false,
    'app-disable-video': true,
    'app-speech-reco-overlay': false,
    'alert-popup-donot-disturb': true,
    'alert-donot-disturb': false,
    'qa-donot-disturb': false,
    'non-trade-alert': false,
    'longer-alert-popup': false,
    'chat-gif-donot-disturb': true,
    'chat-badges-donot-disturb': true,
    'chat-popup-donot-disturb': false,
    'chat-donot-disturb': false,
    'small-image-preview': false,
    'extra-chat-column': false,
    'chat-always-scroll': false,
    'chat-mem-clear': true,
    'visibility-change-enabled': true,
    'presenter-alert-donot-disturb': false,
    'presenter-chat-donot-disturb': false,
    'presenter-speech-recognition': true,
    'presenter-push-to-talk': false,
    'presenter-enable-rte': false,
    'presenter-follow-my-screens': false
  });
  type ConnectivityTestState = 'pending' | 'passed' | 'failed' | 'unconfigured';
  type MicStatus = 'idle' | 'testing' | 'success' | 'no-audio' | 'error';
  /*
    CONN-03 — `this.activeTab = this.appService.globals.isPresenter ? "network" : "mobile"` at byte
    2,444,097, in the constructor. This was the bare literal `'network'`, which is the tab a
    non-presenter is not allowed to see at all (CONN-02).

    `untrack` because this is a SEED: the member then clicks, and a `$derived` would drag them back
    to the default on any re-read of page data.
  */
  let activeConnectivityTab = $state<'network' | 'mic' | 'mobile'>(
    untrack(() => (isPresenter ? 'network' : 'mobile'))
  );

  let testResults = $state({ udp: false, tcp: false, stun: false, turn: false });
  /**
   * Which ICE servers the last run used.
   *
   * `deployment` — this deployment's own, from `/api/media/grant`; the result is about US.
   * `public-fallback` — Google's public STUN, because the media socket had not opened yet and we
   * had nothing of our own to offer. A pass then says the user's network can reach a public STUN
   * server, which is worth knowing and is NOT the same claim.
   */
  let testIceSource = $state<'deployment' | 'public-fallback'>('public-fallback');
  /** Whether a run has completed at least once, so the source line describes fact, not intent. */
  let hasRunTest = $state(false);
  let testStates = $state<Record<'udp' | 'tcp' | 'stun' | 'turn', ConnectivityTestState>>({
    udp: 'pending',
    tcp: 'pending',
    stun: 'pending',
    turn: 'pending'
  });
  let isTestRunning = $state(false);
  let showConnectivityMessage = $state(false);
  let connectivityMessageText = $state('');
  let micDevices = $state.raw<Array<{ deviceId: string; label: string }>>([]);
  let micDevicesLoading = $state(false);
  let micDevicesLoaded = $state(false);
  let selectedMicDeviceId = $state('');
  let isMicTesting = $state(false);
  let micLevel = $state(0);
  let micStatus = $state<MicStatus>('idle');
  let micErrorMessage = $state('');
  let micStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let animationFrameId = 0;
  let noAudioTimeout: number | null = null;
  let audioDetected = false;
  let waveformCanvas = $state<HTMLCanvasElement>();
  let isRecording = $state(false);
  let mediaRecorder: MediaRecorder | null = null;
  let recordedChunks: Blob[] = [];
  let recordedAudioUrl = $state<string | null>(null);
  let recordingDuration = $state(0);
  let recordingInterval: number | null = null;
  let isPlayingBack = $state(false);
  let playbackAudio: HTMLAudioElement | null = null;

  function setInputChecked(checked: boolean) {
    return (node: HTMLInputElement) => {
      node.checked = checked;
    };
  }

  // Declared before resetTestResults so the reset can release an in-flight run.
  function resetTestResults() {
    testStates = { udp: 'pending', tcp: 'pending', stun: 'pending', turn: 'pending' };
    testResults = { udp: false, tcp: false, stun: false, turn: false };
    showConnectivityMessage = false;
    connectivityMessageText = '';
    isTestRunning = false;
    micStatus = 'idle';
    micLevel = 0;
    micErrorMessage = '';
  }

  function onConnectivityTabChange(tab: 'network' | 'mic' | 'mobile') {
    if (tab === activeConnectivityTab) return;
    if (activeConnectivityTab === 'mic') cleanupMicTest();
    /*
      Leaving the Mobile App tab drops its result, and nothing here has to remember to do that:
      `MobileRestorePane` holds the message and the `{:else if}` below unmounts it, so the state goes
      with it. Recorded because the manual reset that used to sit on this line is exactly the kind of
      thing a later reader deletes as redundant — and it would be, until somebody moved the state
      back up here.
    */
    activeConnectivityTab = tab;
  }

  function showMessageBox(message: string, duration = 3000) {
    connectivityMessageText = message;
    showConnectivityMessage = true;
    window.setTimeout(() => {
      showConnectivityMessage = false;
    }, duration);
  }

  // The peer connection and its timeout are owned at component scope so a run can always be torn
  // down - by the next run, or by the connectivity effect when the modal closes. Keeping them
  // function-local meant nothing outside runWebRTCTest could reach them: an abandoned run held its
  // RTCPeerConnection (and its two authenticated TURN allocations against flash.protradingroom.com)
  // open for the page lifetime, and its orphaned timer later wrote 'failed' into the live
  // testStates of a test that was no longer running.
  let webrtcConnection: RTCPeerConnection | null = null;
  let webrtcTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

  function cleanupWebRTCTest() {
    if (webrtcTimer !== undefined) {
      globalThis.clearTimeout(webrtcTimer);
      webrtcTimer = undefined;
    }
    if (webrtcConnection) {
      webrtcConnection.onicecandidate = null;
      webrtcConnection.close();
      webrtcConnection = null;
    }
  }

  async function runWebRTCTest() {
    cleanupWebRTCTest();
    testStates = { udp: 'pending', tcp: 'pending', stun: 'pending', turn: 'pending' };
    testResults = { udp: false, tcp: false, stun: false, turn: false };
    isTestRunning = true;

    /*
      THE REFERENCE'S TURN SERVER IS GONE FROM HERE, AND IT SHOULD NEVER HAVE SHIPPED.

      This block used to carry, transcribed from the capture:

        { urls: 'turn:flash.protradingroom.com:3478?transport=udp', username: 'ptrUser', credential: 'ptr123' }
        { urls: 'turn:flash.protradingroom.com:3478?transport=tcp', username: 'ptrUser', credential: 'ptr123' }

      Every run of this test therefore opened two authenticated relay allocations against a THIRD
      PARTY's server, using that third party's credentials, and sent our user's IP addresses to it.
      It also tested the wrong thing: this deployment's media path is `media.tradingroom.app`, so a
      green tick here said nothing about whether OUR relay works, and a red one blamed the user's
      firewall for someone else's server being unreachable.

      The two STUN entries stay. They are Google's public servers — not the reference's — they were
      in the captured configuration for the same reason anyone uses them, and they are what makes
      the `typ srflx` check below meaningful.

      TURN is reported as `unconfigured` rather than `failed` when this deployment has none, which is
      the honest answer: `mediaIceServers` (`lib/server/media-grant.ts:411`) builds relay entries from
      `MEDIA_TURN_URLS` + `MEDIA_TURN_SECRET` and returns none when they are unset, which is the
      state today. Saying "check your network or firewall" for a relay nobody configured is blaming
      the user for our own missing setting.

      RESOLVED 2026-08-10 (`TODO.md` item N): this test now runs against the ICE servers THIS
      deployment minted. `+page.svelte` hoisted them out of its `onMount` local into
      `mediaIceServers` and passes them down.

      When they are available they are used ALONE, and that is the whole point. Adding Google's
      STUN alongside would mean a green `stun` tick could have come from Google's server while ours
      was unreachable — the same lie as before, pointing the other way. A result is only worth
      showing a user if it is about the infrastructure they are actually trying to reach.

      The public servers remain as a labelled FALLBACK for the window before the media socket has
      opened, when we have nothing of our own to test. The UI says which of the two ran, because
      "STUN passed" means different things in those two cases and a support conversation should not
      have to guess which.
    */
    const usingDeploymentServers = mediaIceServers.length > 0;
    testIceSource = usingDeploymentServers ? 'deployment' : 'public-fallback';
    hasRunTest = true;

    const configuration: RTCConfiguration = {
      iceServers: usingDeploymentServers
        ? mediaIceServers
        : [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
    };

    const relayConfigured = (configuration.iceServers ?? []).some((server) => {
      const urls = typeof server.urls === 'string' ? [server.urls] : server.urls;
      return urls.some((url) => url.startsWith('turn:') || url.startsWith('turns:'));
    });
    if (!relayConfigured) testStates.turn = 'unconfigured';

    let peerConnection: RTCPeerConnection;
    try {
      peerConnection = new RTCPeerConnection(configuration);
      webrtcConnection = peerConnection;
    } catch (error) {
      console.error('Failed to create RTCPeerConnection', error);
      showMessageBox('WebRTC is not supported on this browser.');
      isTestRunning = false;
      return;
    }

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;
      const candidate = event.candidate.candidate;
      console.log('Candidate found:', candidate);
      if (candidate.includes('udp') && !testResults.udp) {
        testResults.udp = true;
        testStates.udp = 'passed';
      }
      if (candidate.includes('tcp') && !testResults.tcp) {
        testResults.tcp = true;
        testStates.tcp = 'passed';
      }
      if (candidate.includes('typ srflx') && !testResults.stun) {
        testResults.stun = true;
        testStates.stun = 'passed';
        showMessageBox('STUN connectivity test passed!');
      }
      if (candidate.includes('typ relay') && !testResults.turn) {
        testResults.turn = true;
        testStates.turn = 'passed';
        showMessageBox('TURN connectivity test passed!');
      }
    };
    peerConnection.createDataChannel('test');

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
    } catch (error) {
      console.error('Failed to create offer:', error);
      showMessageBox('Failed to initiate test. Check console for details.');
      cleanupWebRTCTest();
      isTestRunning = false;
      return;
    }

    webrtcTimer = globalThis.setTimeout(() => {
      // Ignore a timer left over from a run that has already been superseded or torn down.
      if (webrtcConnection !== peerConnection) return;
      webrtcTimer = undefined;

      if (!testResults.udp) testStates.udp = 'failed';
      if (!testResults.tcp) testStates.tcp = 'failed';
      if (!testResults.stun) {
        testStates.stun = 'failed';
        showMessageBox('STUN connectivity test failed. Check your network.', 5000);
      }
      /*
        Only call TURN failed if a relay was actually offered. With none configured the state is
        already `unconfigured`, and overwriting it with `failed` — plus "check your network or
        firewall" — would blame the user for a server this deployment never set.
      */
      if (!testResults.turn && testStates.turn !== 'unconfigured') {
        testStates.turn = 'failed';
        showMessageBox('TURN connectivity test failed. Check your network or firewall.', 5000);
      }
      // The connection has served its purpose either way: gathering finished, or it timed out.
      // Leaving it open on the success path held its TURN allocations for the page lifetime.
      cleanupWebRTCTest();
      isTestRunning = false;
    }, 10000);
  }

  function copyResults() {
    const results = [
      `UDP: ${testResults.udp ? 'OK' : 'FAILED'}`,
      `TCP: ${testResults.tcp ? 'OK' : 'FAILED'}`,
      `STUN Server Connectivity: ${testResults.stun ? 'OK' : 'FAILED'}`,
      `TURN Server Connectivity: ${testResults.turn ? 'OK' : 'FAILED'}`
    ].join('\n');

    navigator.clipboard
      .writeText(results)
      .then(() => {
        showMessageBox('Test results copied to clipboard!');
      })
      .catch((error) => {
        console.error('Failed to copy results: ', error);
        showMessageBox('Failed to copy results to clipboard.');
      });
  }

  async function loadMicDevices() {
    if (!isPresenter) return;
    micDevicesLoading = true;
    micDevicesLoaded = false;
    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionStream.getTracks().forEach((track) => track.stop());
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
        (device) => device.kind === 'audioinput'
      );
      micDevices = devices
        .filter((device) => {
          const isAlias = device.deviceId === 'default' || device.deviceId === 'communications';
          let isDuplicateDefault = false;
          if (device.label.toLowerCase().startsWith('default - ')) {
            const physicalLabel = device.label.substring(10);
            isDuplicateDefault = devices.some(
              (candidate) =>
                candidate.kind === device.kind &&
                candidate.label === physicalLabel &&
                candidate.deviceId !== device.deviceId
            );
          }
          return !isAlias && !isDuplicateDefault;
        })
        .map((device) => ({ deviceId: device.deviceId, label: device.label }));
      if (micDevices.length > 0 && !selectedMicDeviceId) {
        selectedMicDeviceId = micDevices[0].deviceId;
      }
    } catch (error) {
      console.warn('Could not enumerate mic devices:', error);
      micDevices = [];
    } finally {
      micDevicesLoading = false;
      micDevicesLoaded = true;
    }
  }

  async function startMicTest() {
    cleanupMicTest();
    micStatus = 'testing';
    micLevel = 0;
    audioDetected = false;
    recordedAudioUrl = null;
    const constraints: MediaStreamConstraints = {
      audio: selectedMicDeviceId ? { deviceId: { exact: selectedMicDeviceId } } : true
    };

    try {
      micStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      const microphoneError = error as DOMException;
      micStatus = 'error';
      micErrorMessage =
        microphoneError.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow mic permission.'
          : microphoneError.name === 'NotFoundError'
            ? 'No microphone found. Please connect a mic.'
            : `Could not access microphone: ${microphoneError.message || microphoneError.name}`;
      return;
    }

    isMicTesting = true;
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(micStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    drawLoop();
    noAudioTimeout = window.setTimeout(() => {
      if (!audioDetected && isMicTesting) micStatus = 'no-audio';
    }, 4000);
  }

  function stopMicTest() {
    cleanupMicTest();
    if (micStatus === 'testing') micStatus = 'idle';
  }

  function drawLoop() {
    if (!analyser || !isMicTesting) return;
    const canvas = waveformCanvas;
    if (!canvas) {
      animationFrameId = requestAnimationFrame(() => drawLoop());
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) return;
    const binCount = analyser.frequencyBinCount;
    const timeData = new Uint8Array(binCount);
    const frequencyData = new Uint8Array(binCount);

    const draw = () => {
      if (!analyser || !isMicTesting) return;
      animationFrameId = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(frequencyData);

      let sum = 0;
      for (let index = 0; index < binCount; index += 1) {
        const normalized = (timeData[index] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / binCount);
      const level = Math.min(100, Math.round(300 * rms));
      if (level > 5 && !audioDetected) {
        audioDetected = true;
        micStatus = 'success';
      }
      micLevel = level;

      const width = canvas.width;
      const height = canvas.height;
      context.fillStyle = '#0f172a';
      context.fillRect(0, 0, width, height);
      const barWidth = width / 64;
      const binStep = Math.floor(binCount / 64);
      for (let index = 0; index < 64; index += 1) {
        const strength = frequencyData[index * binStep] / 255;
        const barHeight = strength * height * 0.6;
        context.fillStyle = `hsla(${160 - 120 * strength}, 90%, 55%, 0.25)`;
        context.fillRect(index * barWidth, height - barHeight, barWidth - 1, barHeight);
      }

      context.lineWidth = 2;
      context.beginPath();
      const sliceWidth = width / binCount;
      let x = 0;
      for (let index = 0; index < binCount; index += 1) {
        const value = timeData[index] / 128;
        const y = (value * height) / 2;
        const hue = 180 - 140 * Math.abs(value - 1);
        context.strokeStyle = `hsl(${hue}, 100%, 60%)`;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
        x += sliceWidth;
      }
      context.stroke();
      context.shadowBlur = 8;
      context.shadowColor = 'rgba(34, 211, 238, 0.4)';
      context.lineWidth = 1;
      context.beginPath();
      x = 0;
      for (let index = 0; index < binCount; index += 1) {
        const y = ((timeData[index] / 128) * height) / 2;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
        x += sliceWidth;
      }
      context.strokeStyle = 'rgba(34, 211, 238, 0.5)';
      context.stroke();
      context.shadowBlur = 0;
    };
    draw();
  }

  function startRecording() {
    if (!micStream || !isMicTesting) return;
    recordedChunks = [];
    recordingDuration = 0;
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      recordedAudioUrl = null;
    }
    try {
      mediaRecorder = new MediaRecorder(micStream);
    } catch (error) {
      console.error('MediaRecorder not supported:', error);
      return;
    }
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
      recordedAudioUrl = URL.createObjectURL(audioBlob);
    };
    mediaRecorder.start();
    isRecording = true;
    recordingInterval = window.setInterval(() => {
      recordingDuration += 1;
      if (recordingDuration >= 30) stopRecording();
    }, 1000);
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    isRecording = false;
    if (recordingInterval !== null) {
      window.clearInterval(recordingInterval);
      recordingInterval = null;
    }
  }

  function playRecording() {
    if (!recordedAudioUrl) return;
    isPlayingBack = true;
    playbackAudio = new Audio(recordedAudioUrl);
    playbackAudio.onended = () => {
      isPlayingBack = false;
      playbackAudio = null;
    };
    playbackAudio.onerror = () => {
      isPlayingBack = false;
      playbackAudio = null;
    };
    void playbackAudio.play();
  }

  function cleanupMicTest() {
    if (!isPresenter) return;
    isMicTesting = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }
    if (noAudioTimeout !== null) {
      window.clearTimeout(noAudioTimeout);
      noAudioTimeout = null;
    }
    if (isRecording) stopRecording();
    if (playbackAudio) {
      playbackAudio.pause();
      playbackAudio = null;
      isPlayingBack = false;
    }
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      micStream = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      void audioContext.close();
      audioContext = null;
    }
    analyser = null;
    micLevel = 0;
  }

  function setAutoplayAttribute(node: HTMLVideoElement) {
    node.setAttribute('autoplay', 'autoplay');
  }

  /**
   * The hidden picker behind the "Upload Profile Picture" button.
   *
   * `$state`, and the first draft of this had it as a plain `let` with a comment arguing that
   * nothing renders from it. THE COMPILER DISAGREED — `non_reactive_update`: *"`profilePictureInput`
   * is updated, but is not declared with `$state(...)`"* — and it is right, because `bind:this` is
   * a WRITE, performed on mount and again with `undefined` on teardown. A plain `let` holds a
   * detached node after the modal is re-rendered, and `svelte-check --fail-on-warnings` (this app's
   * own `check` script) would have refused it in CI.
   *
   * `| undefined` rather than `| null` because that is what `bind:this` writes on teardown for this
   * shape — measured by `BindThisProbe.svelte`, which exists to answer exactly that question rather
   * than have each site guess.
   *
   * `svelte-autofixer` returns zero issues and one suggestion here — *"The usage of `bind:this` can
   * often be replaced with an easier to read `action` or even better an `attachment`."* DECLINED,
   * recorded rather than ignored, because this repository has already ruled on the question with the
   * docs in hand. `dom-reference-contract.svelte.test.ts` quotes `svelte/bind` verbatim — *"To get a
   * reference to a DOM node, use `bind:this`"* — and admits a capture attachment only for three
   * STRUCTURAL reasons: crossing a component boundary, fanning one node to two owners, or a node
   * that has no single lvalue. This node is read in the same file, by one owner, inside an event
   * handler. An attachment here would be the hand-rolled `bind:this` that gate calls unsanctioned.
   */
  let profilePictureInput = $state<HTMLInputElement | undefined>();

  /**
   * The picker filter: `image` then a slash then a wildcard — ASSEMBLED, not written as a literal.
   *
   * This is not obfuscation and it is not style. Writing that attribute value directly puts a
   * slash-star pair in the file, and slash-star opens a comment window for the whole-file regex that
   * fifty-five test files here use to strip comments before reading markup.
   *
   * Measured when the first draft did exactly that: the window opened at line 2,559 and the next
   * star-slash closed it at line 5,687 — **120,987 characters of markup deleted**, taking
   * `AlertQaModal`, `BootboxDialog`, `CompactMessageRow` and the rest with them. Three contract
   * tests went red for markup that was still on disk.
   *
   * `orphan-component-contract.test.ts` catches that class and its message offers two resolutions:
   * move the render out of the window, or give every reader a Svelte-aware stripper. Neither fits a
   * 6,000-line host with fifty-five readers. Not emitting the sequence is the third, and it costs
   * one line and this paragraph.
   *
   * `PostAlertModal.svelte` carries the literal safely because nothing closes its window — an
   * unclosed one matches nothing and deletes nothing. That is luck, not design, and this file has
   * none of it.
   *
   * A SECOND self-inflicted failure is recorded here because it cost a run: the first version of
   * this very paragraph quoted the closing sequence, which terminated the docblock early and made
   * the whole component unparseable. `CLAUDE.md` already says a comment must not contain the syntax
   * it is describing; this is that rule earning its place twice in one edit.
   *
   * The value is byte-identical to the attribute the capture renders; only how it reaches the DOM
   * has changed.
   */
  const IMAGE_ACCEPT = `image/${'*'}`;

  /**
   * Downscale to the reference's 125px box, then hand the result up.
   *
   * ## The step this was missing
   *
   * `adminUploadProfilePic` (bundle byte 2,084,700) never uploads the chosen file. It reads it,
   * draws it into a canvas at a 125px longest edge, and uploads THAT as a PNG. The first version of
   * this control shipped without the step because the evidence row naming it was not read until
   * after; `#lib/profile-picture-downscale.js` carries the arithmetic and that correction.
   *
   * It matters more here than upstream: this room stores the bytes itself, and an avatar is only
   * ever drawn at 45px in a roster row or 80px in this modal.
   *
   * ## Failing OPEN, deliberately
   *
   * Every step below can fail on a file the browser cannot decode - `createImageBitmap` throws,
   * `getContext` returns null, `toBlob` hands back null. In each case the ORIGINAL file is sent. The
   * server refuses a non-image and reports why; refusing here as well would replace that specific
   * message with a vaguer one from a resize that was never the point.
   */
  async function sendProfilePicture(user: ModalTargetUser, file: File): Promise<void> {
    try {
      const bitmap = await createImageBitmap(file);
      const size = downscaledSize(bitmap.width, bitmap.height);
      if (size.width === bitmap.width && size.height === bitmap.height) {
        bitmap.close();
        onUploadProfilePicture(user, file);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext('2d');
      if (!context) {
        bitmap.close();
        onUploadProfilePicture(user, file);
        return;
      }
      context.drawImage(bitmap, 0, 0, size.width, size.height);
      bitmap.close();

      // `image/png` and quality 1, both the reference's - `F.toBlob(te => ..., "image/png", 1)`.
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((result) => resolve(result), 'image/png', 1)
      );
      if (!blob) {
        onUploadProfilePicture(user, file);
        return;
      }

      /*
        `.png`, because the bytes ARE a PNG now whatever the original was. A `.jpg` name on PNG bytes
        is the kind of small lie that survives into a filename on disk and confuses the next person
        who looks at the uploads directory.
      */
      const renamed = file.name.replace(/\.[^./\\]*$/, '') + '.png';
      onUploadProfilePicture(user, new File([blob], renamed, { type: 'image/png' }));
    } catch {
      onUploadProfilePicture(user, file);
    }
  }

  function setReadonlyAttribute(node: HTMLTextAreaElement) {
    node.setAttribute('readonly', 'readonly');
  }

  function setMultipleAttribute(node: HTMLInputElement) {
    node.setAttribute('multiple', 'true');
  }

  /**
   * The Files-pane upload, transcribed from the capture.
   *
   * The whole feature was markup and nothing else: the file input had no `change` handler,
   * `#filedrag` had no drop handler, `#fileList` was never written to, and the Upload button had no
   * `onclick`. There was also no server endpoint - `shared_files` was read and never written. So it
   * could not upload, rather than uploading and failing.
   *
   * `gs` in the capture, a module-level array the two handlers fill and the uploader drains:
   *
   * ```js
   * function l0(t) {                       // bound to BOTH `change` and `drop`
   *   $("#fileList").show(); $("#filedrag").hide(); vf(t);
   *   let n = t.target.files || t.dataTransfer.files;
   *   $("#fileList").empty();
   *   const e = $("<ul>"); gs = [];
   *   for (let o, i = 0; (o = n[i]); i++) { gs.push(o); $(e).append(`<li>${o.name}</li>`); }
   *   $("#fileList").append(e);
   * }
   * ```
   *
   * Note it REPLACES the list each time rather than appending, so picking files twice keeps only
   * the second selection. Reproduced.
   */
  let uploadQueue = $state.raw<File[]>([]);
  let uploadListVisible = $state(false);
  let dragHover = $state(false);
  let uploadStatus = $state<string | null>(null);
  let uploading = $state(false);

  /**
   * `vf` - the dragover/dragleave handler.
   *
   * ```js
   * function vf(t) {
   *   t.stopPropagation(); t.preventDefault();
   *   t.target.className = "dragover" == t.type ? "hover" : "";
   * }
   * ```
   *
   * The capture assigns `className` outright, which drops the `filedrag` class for the life of the
   * element. That is invisible there because the drop zone is hidden on drop and the whole bootbox
   * is destroyed on close. Expressed here as a `hover` toggle so the base class survives, which is
   * the same thing on screen and does not fight Svelte over the attribute.
   */
  function onDragState(event: DragEvent) {
    event.stopPropagation();
    event.preventDefault();
    dragHover = event.type === 'dragover';
  }

  /** `l0` - bound to the input's `change` and to the drop zone's `drop`. */
  function onFilesChosen(event: Event) {
    uploadListVisible = true;
    onDragState(event as DragEvent);

    const source = event as DragEvent & { target: HTMLInputElement };
    const list = source.dataTransfer?.files ?? source.target?.files;
    uploadQueue = list ? [...list] : [];
    uploadStatus = null;
  }

  /**
   * `doFileListUpload()` - one request per file, awaited in order:
   *
   * ```js
   * const i = gs.length;
   * for (const [o, s] of gs.entries()) {
   *   bootbox.hideAll();
   *   alertsService.info(`Uploading ${o}/${i}: ${s.name}.`);
   *   yield doFileUpload(s);
   * }
   * alertsService.clear(); getSessionFiles(); gs.splice(0, gs.length - 1);
   * ```
   *
   * `doFileUpload` posts `file` + `originalname` as multipart. The capture's URL carries the
   * session and token in the path; ours is a SvelteKit action, which already has the session from
   * the cookie. Field names are kept identical.
   *
   * The capture's `bootbox.hideAll()` per iteration closes the dialog before the first byte, so a
   * failure surfaces as a bare "Upload Failed..." with the modal already gone. The modal stays open
   * here until the run finishes, so a partial failure can say which file died.
   */
  async function doFileListUpload() {
    if (!uploadQueue.length || uploading) return;
    uploading = true;

    const total = uploadQueue.length;
    const failures: string[] = [];

    for (const [index, file] of uploadQueue.entries()) {
      uploadStatus = `Uploading ${index}/${total}: ${file.name}.`;
      // One `catch` where there were two: an action's refusal came back as a 200 with the reason
      // in the body. A command rejects for both, and `refusalOrTransportMessage` tells them apart.
      try {
        await uploadFile({ file, originalName: file.name });
      } catch (cause) {
        failures.push(`${file.name}: ${refusalOrTransportMessage(cause, 'network error')}`);
      }
    }

    uploading = false;
    await invalidateAll();

    if (failures.length) {
      // "Upload Failed..." in the capture. Naming the file beats a bare string when three were
      // queued and one was too large.
      uploadStatus = `Upload Failed — ${failures.join('; ')}`;
      return;
    }

    uploadQueue = [];
    uploadListVisible = false;
    uploadStatus = null;
    onclose();
  }

  /**
   * Bootstrap's focustrap on activate: `this._config.autofocus && this._config.trapElement.focus()`
   * - it focuses the modal ELEMENT, never a control inside it. Bootbox only overrides that for a
   * prompt, where `shown.bs.modal` focuses the input.
   *
   * This used to focus the close button, which bootbox renders with a literal
   * `aria-hidden="true"` (its `closeButton` template). Focusing an aria-hidden element makes Chrome
   * refuse to apply the attribute and log "Blocked aria-hidden on an element because its descendant
   * retained focus", and it left focus parked on Close so the upload control never got it - the
   * reported "upload is not working" on the presenter side.
   *
   * `tabindex="-1"` is what makes a div focusable here; it is on the same element in bootbox's
   * dialog template.
   */
  function focusUploadModal(node: HTMLElement) {
    const frame = requestAnimationFrame(() => node.focus());
    return () => cancelAnimationFrame(frame);
  }

  let micScreenAlert = $state<string | null>(null);

  /**
   * `giveMicScreen(e)` — hand this member mic and screenshare, or take them back.
   *
   * Transcribed from the bundle at offset 2075481, on the SAME class as `saveCustomPerms` and
   * `startPrivateChat`, which is this modal:
   *
   * ```js
   * giveMicScreen(e) {
   *   if (this.user.userXrefID == this.appService.globals.user.userXrefID)
   *     return bootbox.alert(`Can't ${e ? 'give' : 'take'} 'Mic/Screenshare' to yourself.`), !1;
   *   this.appService.sendServerAdminCommand('giveMicScreen', { user: this.user._id, give: e });
   *   bootbox.alert(e ? 'Mic/Screenshare given OK' : 'Mic/Screen taken away OK');
   * }
   * ```
   *
   * Every string here is that one's, including the two confirmations and the self-target refusal.
   *
   * **Honest gap:** the METHOD is proven byte-for-byte and its host component is proven by the
   * neighbouring methods, but the element that CALLS it is still not located in the decoded
   * template — so the button's own markup and label are ours, not transcribed. The behaviour is
   * evidence; the affordance is a reasoned placement.
   */
  async function giveMicScreen(give: boolean) {
    if (!targetUser?.id) return;
    if (targetUser.id === currentUser.id) {
      micScreenAlert = `Can't ${give ? 'give' : 'take'} 'Mic/Screenshare' to yourself.`;
      return;
    }
    try {
      await giveMicScreenCommand({ targetUserId: targetUser.id, give });
    } catch (cause) {
      // Shown, not swallowed: this used to `console.error` a status and tell the presenter nothing.
      micScreenAlert = refusalMessage(cause, 'That did not work.');
      return;
    }
    micScreenAlert = give ? 'Mic/Screenshare given OK' : 'Mic/Screen taken away OK';
  }

  /**
   * Revoking a permission sends the capture's `remotePresCommand` to that member.
   *
   * The capture's three moderation subCmds are carried out by the peer they name -
   * `mutemic` -> `muteMic()`, `mutecam` -> `stopCam()`, `mutescreens` -> `stopSharingAll()` - so
   * unchecking Microphone here does not edit a row, it tells that member's browser to stop
   * sending. These checkboxes were bound to local state and sent nowhere, so a presenter could
   * untick Microphone and nothing at all happened.
   *
   * Only the REVOKE direction is wired to the checkboxes, and that is right: ticking a box is not
   * the grant. Granting is `giveMicScreen` directly above — a top-level command of its own carrying
   * `{give}`, whose subscriber flips the member to a limited presenter
   * (`globals.user.isPresenter = globals.isLimitedPresenter = globals.isPresenter = e.give`) and
   * then reinitialises their media.
   *
   * This docblock carried a closing paragraph reading *"what is still missing is the control that
   * SENDS it … `TODO.md` gap 24 rather than a guessed button"* until 2026-08-26. The buttons that
   * send it are forty lines below, and had been for some time — the claim outlived its subject
   * because nothing in this repository checks a comment against the code it sits next to. It was
   * found by the orphan gate, which noticed this block had drifted away from `revokePermission`
   * entirely; the staleness was the second thing the drift revealed.
   */
  async function revokePermission(subCmd: 'mutemic' | 'mutecam' | 'mutescreens') {
    if (!targetUser?.id) return;
    /*
      THIS WAS BROKEN: `presenterCommand`'s action was removed on 2026-08-15 and this call site was
      missed — it is in ModalHost, not `+page.svelte`, and only that file was checked. It posted to
      an action that no longer existed, so revoking a member's mic or camera did nothing at all.
    */
    try {
      await presenterCommand({ subCmd, targetUserId: targetUser.id });
    } catch (cause) {
      console.error('[room] presenter command failed', cause);
    }
  }

  function updateSettingCheck(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    if (input.id === 'app-donot-disturb' || input.id === 'settings-app-donot-disturb') {
      onDoNotDisturbChange(input.checked);
      return;
    }
    settingChecks[input.id] = input.checked;
    /*
      Element id -> PREFERENCE NAME, and the `?? input.id` fallback below is why this table has to
      be right rather than merely present.

      An id with no entry here is still persisted — under the id. `+page.svelte` reads preferences
      by their reference names (`loadedSettings.recordingStartSound`), so an unmapped checkbox
      writes `app-recording-start-sound`, which nothing reads, and the setting appears to work: the
      label flips, the POST succeeds, and the sound still plays. That is the same defect class as
      the dead `app-disable-video` checkbox, but harder to see, because here the consumer exists and
      is simply never reached.

      The four added on 2026-08-14 each had a live consumer sitting unreached. Every name is the
      one the reference passes to `setPreference`, read out of `app-user-settings-modal.full.js`
      rather than inferred from the id:
      `recordingStartSoundOnChange` :1106-1113, `recordingStopSoundOnChange` :1114-1121,
      `pushToTalkOnChange` :1023-1030, and `speechRecoCCOnChange` :990-1008, which sets
      `speechRecoCC` AND mirrors it into `doSpeechReco` — `doSpeechReco` is the one this room gates
      speech recognition on, so that is the half carried here.

      Still unmapped, deliberately: the ids whose preference has no consumer in this room at all
      (`chat-gif-donot-disturb`, `extra-chat-column`, `chat-mem-clear`, and the rest). Mapping those
      would move the junk key rather than remove it. They are recorded in `TODO.md`.
    */
    const preferenceKeyByInputId: Record<string, string> = {
      'alert-popup-donot-disturb': 'alertPopup',
      'settings-alert-donot-disturb': 'alertSoundOn',
      'settings-qa-donot-disturb': 'qaSoundOn',
      'settings-chat-donot-disturb': 'chatSoundOn',
      'non-trade-alert': 'nonTradeSound',
      'longer-alert-popup': 'longerAlertPopup',
      'app-recording-start-sound': 'recordingStartSound',
      'app-recording-stop-sound': 'recordingStopSound',
      /* USM-12. `recPreviewWindowOnChange` at byte 2,250,601 persists `recPreviewWindow`; the id
         was absent from this table and the table has no fallback, so the box wrote nothing at all. */
      'app-recording-preview-window': 'recPreviewWindow',
      /* USM-11. `noteUpdatePopupOnChange` at byte 2,251,541 persists `noteUpdatePopup`; the
         consumer is the `updatedSessionNote` frame's handler in `events.svelte.ts`. */
      'note-update-popup': 'noteUpdatePopup',
      /* USM-08 / USM-09 / USM-10. `reactionsPopupOnChange`, `reactionsPopupQAOnChange` and
         `reactionsSoundQAOnChange` at bytes 2,250,601 / 2,250,812 / 2,251,363. Their consumer is
         `RoomOverlays`, which notices a reaction by diffing two loads — see
         `#lib/reaction-arrivals.ts` for why it cannot come off the wire. */
      'app-reactions-popup': 'reactionsPopup',
      'app-reactions-popup-qa': 'reactionsPopupQA',
      'app-reactions-sound-qa': 'qaReactionSoundOn',
      'presenter-push-to-talk': 'pushToTalk',
      'presenter-speech-recognition': 'doSpeechReco',
      'app-speech-reco-overlay': 'showSpeechRecoOverlay',
      'chat-always-scroll': 'alwaysScrollToBottom',
      'presenter-follow-my-screens': 'makeUsersFollowMyScreens',
      'chat-gif-donot-disturb': 'chatGif',
      'chat-badges-donot-disturb': 'chatBadges',
      'chat-popup-donot-disturb': 'chatPopup',
      'chat-mem-clear': 'trimChatLogs',
      /* `extraChatColumnOnChange()` at `app-user-settings-modal.full.js:1044-1057` persists
         `extraChatColumn`. It also fires `getChatLog {channel:'offTopic', page:0, extraChat:true}`
         on the way ON; this room needs no such fetch, because its page load already sends page 0 of
         EVERY rendered channel — see `loadNewestChatPages`. */
      /* `visibilityChangeEnabledChange()` persists `visibilityChangeEnabled` and emits
         `appVisibilityChange`. Only the CHAT half of that feature is reproduced — see the note on
         the preference in `+page.svelte` for why the roster half would be worse than nothing here. */
      'visibility-change-enabled': 'visibilityChangeEnabled',
      'extra-chat-column': 'extraChatColumn',
      /* `enableRTEOnChange()` at `app-user-settings-modal.full.js:1031-1035` persists `enableRTE`,
         read from that handler rather than inferred from the id. The checkbox has rendered since
         the presenter tab was built and its value went nowhere. */
      'presenter-enable-rte': 'enableRTE',
      /* The presenter tab's own Do-not-disturb pair. SECOND controls for preferences that
         already have live consumers — the reference wires them to `alertSoundOnChange()` and
         `chatSoundOnChange()`, the very same handlers its main tab uses. */
      'presenter-alert-donot-disturb': 'alertSoundOn',
      'presenter-chat-donot-disturb': 'chatSoundOn',
      'app-disable-video': 'disableVideo'
    };
    /*
      NO FALLBACK. This used to be `preferenceKeyByInputId[input.id] ?? input.id`, and that `??` is
      what wrote nineteen element ids into every user's settings blob as if they were preferences.

      An id with no entry above now persists NOTHING, which is the honest outcome: its checkbox has
      no consumer in this room, so there is nothing for a stored value to restore. Writing it
      anyway produced a key that looked like a working setting, survived reloads, and changed
      nothing — the failure mode that hid four real defects.

      Adding a checkbox therefore now means adding its preference name here as a deliberate step.
      That is the point: the mapping is the declaration that a control HAS a consumer, and a
      missing row fails loudly at review instead of quietly at runtime.
    */
    const preferenceKey = preferenceKeyByInputId[input.id];
    if (preferenceKey) onPreferenceChange(preferenceKey, input.checked);
  }

  /*
    `sendServerAdminCommand('changeChatMode', {mode})`. This used to be
    `onPreferenceChange('chatMode', mode)` — a per-user preference nothing in the room ever read, at
    the wrong LEVEL besides; `#lib/chat-mode.ts` carries that history.

    What matters HERE is that there is no local assignment. `groupChatMode` is a prop, fed from the
    row the server just wrote, so the radio shows what the room IS rather than what this browser
    last clicked.
  */
  function applyGroupChatMode(mode: ChatMode) {
    onChatModeChange(mode);
  }

  function requestSettingsChatMode(mode: ChatMode) {
    if (groupChatMode === mode) return;
    onConfirm(chatModeConfirmPrompt(mode), () => applyGroupChatMode(mode));
  }

  /*
    The same prompt as the settings radio, which it was NOT: this one interpolated the raw letter
    and asked "are you sure you want to change the chat mode to p". `chatModeConfirmPrompt` owns the
    capture's wording now, so there is one spelling instead of a right one and a wrong one.
  */
  function requestSessionChatMode(mode: ChatMode) {
    if (groupChatMode === mode) return;
    onConfirm(chatModeConfirmPrompt(mode), () => applyGroupChatMode(mode));
  }

  function requestPmWindowLayout(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const previous = settingChecks['pm-window-layout'];
    input.checked = previous;
    onConfirm(
      `Are you sure you want to change PM logs on the ${previous ? 'LEFT' : 'RIGHT'}?`,
      () => {
        settingChecks['pm-window-layout'] = !previous;
        onPreferenceChange('pmLogsOnRight', !previous);
      }
    );
  }

  /**
   * `getNewToken` — mint (or re-mint) this presenter's OBS / XSplit publish credential.
   *
   * The reference calls the same command on the panel's first render and on "New Link"
   * (`main.d6d3c112b59b7d0d.js` byte 2169850), and so does this: there is no "fetch my existing
   * key" mode, because the server rotates on every call and a key it did not just issue may
   * already have been replaced.
   */
  async function getNewToken() {
    ingestLoading = true;
    ingestError = '';
    try {
      const response = await fetch('/api/stream-ingest', { method: 'POST' });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        /*
          The server's own sentence, and no fallback to a stale key. A panel that kept showing the
          previous token after a failed rotation would be showing a credential that may already be
          revoked — the presenter would copy it, OBS would be refused, and nothing on screen would
          say why.
        */
        ingest = null;
        ingestError = body.message ?? 'The stream key could not be issued.';
        return;
      }
      ingest = (await response.json()) as StreamIngestKey;
    } catch {
      ingest = null;
      ingestError = 'The stream key could not be issued.';
    } finally {
      ingestLoading = false;
    }
  }

  /**
   * The reference's three copy handlers, which differ only in which field they read
   * (bytes 2168500-2169300). Each selects the textarea first — that is what makes the copied text
   * visibly highlighted — then writes to the clipboard and raises the same toast.
   *
   * `node.select()` rather than a `document.querySelector` by id: the element is right here, and
   * querying the document for something this component rendered is how a copy button ends up
   * reading a different pane's textarea after a refactor.
   */
  async function copyIngestField(node: HTMLTextAreaElement | null) {
    if (!node) return;
    node.select();
    await navigator.clipboard.writeText(node.value);
    onUserAction('copied-to-clipboard', targetUser);
  }

  /** The `here` link inside both instruction blocks — `openRestreamTab()`. */
  function openRestreamTab() {
    streamingControlTab = 'restream';
  }

  let streamingLinkNode = $state<HTMLTextAreaElement | null>(null);
  let streamingLinkRtmpNode = $state<HTMLTextAreaElement | null>(null);
  let streamWhipKeyNode = $state<HTMLTextAreaElement | null>(null);

  /*
    Mint on first sight of the OBS pane — the reference's `handleStreaming()`, which runs when the
    streaming section initialises rather than when the modal opens.

    Deliberately NOT on page load. This is a live publish credential and every request rotates it,
    so issuing one for every viewer who opens Session Control would revoke a presenter's working
    key from a pane they never looked at.

    The guards are read through `untrack` on purpose: `getNewToken` writes both of them, and an
    effect that both reads and writes the same state is the shape that loops. Only the two tab
    values are dependencies, which is exactly when this should re-evaluate.
  */
  $effect(() => {
    const showingObsPane =
      sessionControlTab === 'streaming-selection' && streamingControlTab === 'obs-streaming';
    if (!showingObsPane) return;
    if (untrack(() => ingest !== null || ingestLoading || ingestError !== '')) return;
    void getNewToken();
  });

  onMount(() => {
    try {
      const savedVideos: unknown = JSON.parse(localStorage.getItem('ytVideoList') ?? '[]');
      if (
        Array.isArray(savedVideos) &&
        savedVideos.every(
          (video) =>
            video &&
            typeof video === 'object' &&
            'title' in video &&
            typeof video.title === 'string' &&
            'url' in video &&
            typeof video.url === 'string'
        )
      ) {
        ytVideoList = savedVideos as Array<{ title: string; url: string }>;
      }
    } catch {
      ytVideoList = [];
    }
    return () => cleanupMicTest();
  });

  function playYtVideo() {
    onPlayYoutube(youtubeURL);
  }

  function playSavedYtUrl(url: string) {
    youtubeURL = url;
    playYtVideo();
  }

  function persistYoutubeList() {
    localStorage.setItem('ytVideoList', JSON.stringify(ytVideoList));
  }

  function requestRemoveYtUrl(index: number) {
    youtubeRemoveIndex = index;
  }

  function removeYtUrl() {
    if (youtubeRemoveIndex === null) return;
    ytVideoList.splice(youtubeRemoveIndex, 1);
    youtubeRemoveIndex = null;
    persistYoutubeList();
    youtubeAlert = 'Youtube video url is removed successfully.';
  }

  function saveYtUrl() {
    /* Verbatim from the bundle (byte 1503474 / 1977968 / 2295405): the escapes are redundant to
       a regex engine and kept because the capture is reproduced, not tidied. */
    // eslint-disable-next-line no-useless-escape
    const videoPattern = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const videoId = youtubeURL.match(videoPattern)?.[2] ?? null;
    /* Verbatim from the bundle (byte 1503474 / 1977968 / 2295405): the escapes are redundant to
       a regex engine and kept because the capture is reproduced, not tidied. */
    // eslint-disable-next-line no-useless-escape
    const playlistId = youtubeURL.match(/[?&]list=([^#\&\?]+)/)?.[1] ?? null;
    if (videoId || playlistId) youtubePromptOpen = true;
  }

  function saveYtUrlWithTitle(title: string) {
    youtubePromptOpen = false;
    if (!title) {
      youtubeAlert = 'Error. Title is empty.';
      return;
    }
    if (ytVideoList.some((video) => video.url === youtubeURL)) {
      youtubeAlert = 'Youtube video url is already saved.';
      return;
    }
    ytVideoList.push({ title, url: youtubeURL });
    persistYoutubeList();
    youtubeAlert = 'Youtube video url is saved successfully.';
  }

  async function sendReply() {
    const body = replyComposer.trim();
    if (!body) return;
    if (await onReplySend(body)) {
      replyComposer = '';
      replyEmojiOpen = false;
      onclose();
    }
  }

  // Same defect as the Q&A composer had, and the same fix: preventDefault() ran before the
  // modifier check, so Shift+Enter was swallowed instead of inserting a line break.
  function handleReplyKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    if (event.shiftKey || event.altKey) return;
    event.preventDefault();
    void sendReply();
  }

  /**
   * Whether an avatar is the gravatar fallback rather than something the member uploaded.
   *
   * Extracted from `gravatarAtSize`, which already asked exactly this question to decide whether it
   * could resize. It is now asked in two places — that, and whether the avatar dropdown offers
   * "Remove profile picture" — and one concept in two spellings is how they stop agreeing.
   *
   * IT IS THE ONLY SIGNAL AVAILABLE, and that is worth stating rather than leaving to be discovered.
   * The reference asks `preferences.profilePic`, a field whose emptiness means "never set". This
   * room has no such field: `removeProfilePicture` writes `gravatarUrl(email)` into `users.avatar_url`,
   * so a member who has removed their picture has a URL rather than a null. "Is it a gravatar" is
   * therefore the same question, asked of the value this room actually stores.
   */
  function isGravatar(url: string) {
    try {
      return new URL(url).hostname === 'secure.gravatar.com';
    } catch {
      return false;
    }
  }

  function gravatarAtSize(url: string, size: number) {
    if (!isGravatar(url)) return url;
    const avatarUrl = new URL(url);
    avatarUrl.searchParams.set('s', String(size));
    return avatarUrl.toString();
  }

  const targetUserModalAvatar = $derived(gravatarAtSize(targetUser.pic, 80));
  const isPresenter = $derived(currentUser.role === 'staff' || currentUser.role === 'admin');
  const isTargetCurrentUser = $derived(targetUser.emailHash === currentUser.emailHash);
  /*
    `O(4, e.appService.globals.preferences.profilePic ? 5 : 4)` — the avatar menu's two states. See
    `isGravatar` for why this room asks a different question to get the same answer.
  */
  const hasOwnProfilePicture = $derived(!isGravatar(targetUser.pic));
  const isTargetFollowed = $derived(Boolean(followedUsers[targetUser.emailHash]));
  const isTargetMuted = $derived(Boolean(mutedUsers[targetUser.emailHash]));
  const mutedUsersList = $derived(Object.values(mutedUsers));
  const followedUsersList = $derived(Object.values(followedUsers));

  function defaultFollowStyle(): FollowChatStyle {
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

  function resetChatStyle() {
    chatStyle = defaultFollowStyle();
    onPreferenceChange('chatStyle', chatStyle);
  }

  function saveChatStyle() {
    onPreferenceChange('chatStyle', { ...chatStyle });
  }

  /**
   * Whatever the presenter's colour Save or Reset came back with, shown rather than swallowed.
   *
   * The same `bootbox.alert` shape `micScreenAlert` uses. A colour write that is refused — a role
   * lost between opening the modal and pressing Save, most plausibly — has to say so, because the
   * pickers keep showing the chosen colour either way and silence would read as success.
   */
  let presenterColorAlert = $state<string | null>(null);

  /**
   * Save — the reference's `savePresenterStyle()`, byte 2,243,496.
   *
   * The key it sends is deliberately absent from ours; `presenter-colors.remote.ts` explains why at
   * length. The page re-reads the row when the broadcast comes back, so nothing is assigned here on
   * success: the two pickers already hold what was sent, and the LOG is repainted by the load.
   */
  async function savePresenterStyle() {
    try {
      await savePresenterColors({ color: presenterTextColor, bgColor: presenterBackgroundColor });
    } catch (cause) {
      presenterColorAlert = refusalMessage(cause, 'Those colors were not saved.');
    }
  }

  /**
   * Reset — the reference's `resetPresenterStyle()`, byte 2,243,637, which is a SEND and not a
   * local revert.
   *
   * Upstream sends the empty pair and restores the pickers to `globals.presenterStyle[theme]`; ours
   * deletes the row and restores the same theme default. Until 2026-08-30 this button assigned two
   * constants and sent nothing, so a presenter who had saved colours could not un-save them.
   */
  async function resetPresenterStyle() {
    const defaults = PRESENTER_COLOR_DEFAULTS[theme];
    try {
      await clearPresenterColors();
    } catch (cause) {
      presenterColorAlert = refusalMessage(cause, 'Those colors were not cleared.');
      return;
    }
    presenterTextColor = defaults.color;
    presenterBackgroundColor = defaults.bgColor;
  }

  $effect(() => {
    if (name !== 'user') return;
    userInfoTab = 'info';
    userMuteMenuOpen = false;
    userPermissions = {
      hasMic: Boolean(targetUser.hasMic),
      hasScreen: Boolean(targetUser.hasScreen),
      hasCam: Boolean(targetUser.hasCam),
      hasAdminChat: Boolean(targetUser.hasAdminChat),
      canEditNotes: Boolean(targetUser.canEditNotes),
      temporaryAccessOnly: Boolean(targetUser.temporaryAccessOnly)
    };
    followChatStyle = {
      ...(followedUsers[targetUser.emailHash]?.followChatStyle ?? defaultFollowStyle())
    };
  });

  $effect(() => {
    if (name !== 'settings') return;
    chatStyle = { ...initialChatStyle };
    /*
      The presenter's own pair, from the room's map, or the theme default — the reference's seed at
      bundle byte 2,241,150. In THIS effect rather than one of its own so that the settings modal
      still has exactly one open-time seeding effect; `effect-not-derived-contract.test.ts` counts
      them, and two effects keyed on the same `name` would be two answers to one question.

      It reads `theme` as well, so switching theme while the modal is open re-seeds — which is what
      the reference's `switchTheme` does at byte 2,254,236, verbatim the same four lines.
    */
    const seed = seedPresenterColors(presenterColors, messageChrome.currentUserEmailHash, theme);
    presenterTextColor = seed.color;
    presenterBackgroundColor = seed.bgColor;
  });

  $effect(() => {
    if (name !== 'report') return;
    reportLoading = true;
    const timer = window.setTimeout(() => {
      reportLoading = false;
    }, 500);
    return () => window.clearTimeout(timer);
  });

  $effect(() => {
    if (name !== 'session') return;
    sessionControlTab = sessionControlInitialTab;
  });

  $effect(() => {
    if (name !== 'connectivity') return;
    resetTestResults();
    void loadMicDevices();
    return () => {
      cleanupWebRTCTest();
      isTestRunning = false;
      cleanupMicTest();
    };
  });

  /** `e.user.loggedIn | date:'short'`, `$derived` because `targetUser` re-resolves on every access. */
  const lastLogin = $derived(
    targetUser.loggedIn ? shortWhen.format(new Date(targetUser.loggedIn)) : 'n/a'
  );
</script>

<app-user-info-modal>
  <Modal
    id="user-modal"
    open={name === 'user'}
    ariaLabelledby="user-details"
    {onclose}
    bodyClass="py-0"
    footerClass="text-center"
  >
    {#snippet header()}
      <div class="edit-user-avatar">
        <!--
          Modal.svelte always renders its children and only toggles classes, so every closed modal
          still has its images in the DOM. With no target user selected this resolves to the
          captured placeholder `.../avatar/undefined?d=mm&s=80`, which the browser fetched from
          gravatar.com on every page load. `loading="lazy"` defers it until the modal is actually
          shown - the element, its attributes and its rendered size are unchanged.
        -->
        <img src={targetUserModalAvatar} alt={targetUser.nick} loading="lazy" />
        <!--
          `edit-user-avatar-options`, the last of `#user-modal`'s four missing affordances. The
          transcription, the const table and the two corrections it forced are on the component.

          Gate: `O(6, o.user.userXrefID === o.appService.globals.user.userXrefID ? 6 : -1)` — your
          own avatar, with no role term. `roomForAvatarChange` in `profile-picture.remote.ts` is the
          server half of that, and it is the authority; this is responsiveness.
        -->
        {#if isTargetCurrentUser}
          <AvatarOptionsMenu
            hasPicture={hasOwnProfilePicture}
            onremove={() => onRemoveProfilePicture(targetUser)}
            onupload={() => profilePictureInput?.click()}
          />
        {/if}
      </div>
      <h3 class="modal-title">
        {targetUser.nick}
        <!--
          `O(9, isPresenter && !isLimitedPresenter ? 9 : canEditUsername ? 10 : -1)` — a three-way,
          and it was a two-way here.

          Index 9 is `z2e`, whose click is `editUsername(user)`: a full presenter renaming somebody
          else. Index 10 is `G2e`, identical markup with `editUsernameByUser(user)`: a member
          renaming THEMSELVES, when `allowUsersToChangeUsername` lets them. The two are different
          actions behind the same pencil, and a limited presenter gets the second, not the first.
        -->
        {#if isPresenter && !isLimitedPresenter}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span
            title="Edit username"
            class="text-primary mx-1 edit-username"
            onclick={() => onUserAction('edit-username', targetUser)}
            onkeydown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onUserAction('edit-username', targetUser);
              }
            }}><i class="fas fa-edit"></i></span
          >
        {:else if canEditUsername}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span
            title="Edit username"
            class="text-primary mx-1 edit-username"
            onclick={() => onUserAction('edit-username-by-user', targetUser)}
            onkeydown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onUserAction('edit-username-by-user', targetUser);
              }
            }}><i class="fas fa-edit"></i></span
          >
        {/if}
        {#if targetUser.status === 'offline'}
          <span class="badge badge-danger">Offline</span>
        {/if}
      </h3>
    {/snippet}
    <!--
      `O(14, isPresenter && !isLimitedPresenter ? 14 : -1)` — the whole administrative body of the
      modal: the System, Actions and Admin Notes tabs, the IP, the stream server, the permission
      checkboxes. A limited presenter is a presenter for speaking and sharing, not for this.
    -->
    {#if isPresenter && !isLimitedPresenter}
      <div class="py-2">
        <nav>
          <div id="nav-tab" role="tablist" class="nav nav-tabs">
            {#each [['info', 'User Info'], ['system', 'System'], ['options', 'Actions'], ['notes', 'Admin Notes']] as [tabId, label] (tabId)}
              <a
                id="nav-tab-{tabId}"
                data-bs-toggle="tab"
                href="#nav-{tabId}"
                role="tab"
                aria-controls="nav-{tabId}"
                aria-selected={userInfoTab === tabId}
                class={['nav-item nav-link', { active: userInfoTab === tabId }]}
                onclick={(event) => {
                  event.preventDefault();
                  userInfoTab = tabId as typeof userInfoTab;
                  /*
                    Upstream's const 56 is the ONLY tab in this strip with a click binding — the
                    other three are plain anchors. This is what that binding is for: the notes tab
                    fetches, and the other three render what the modal already holds.

                    An event handler and not an `$effect` on `userInfoTab`. The load is a side
                    effect of a click, not a value derived from state, and an effect here would
                    re-fire on every unrelated reason the tab happened to be re-evaluated.
                  */
                  if (tabId === 'notes') userNotes.open(targetUser.id);
                }}
              >
                {label}
              </a>
            {/each}
          </div>
        </nav>
        <div id="nav-tabContent" class="tab-content">
          <div
            id="nav-info"
            role="tabpanel"
            aria-labelledby="nav-tab-info"
            class={[
              'tab-pane fade',
              { show: userInfoTab === 'info', active: userInfoTab === 'info' }
            ]}
          >
            <div class="d-flex flex-wrap align-items-center justify-content-center">
              <div class="table-responsive">
                <table class="table w-100">
                  <tbody>
                    <tr>
                      <th scope="row">Name:</th>
                      <td>{targetUser.nick}</td>
                    </tr>
                    <tr>
                      <th scope="row">Last Login:</th>
                      <td>
                        {lastLogin}
                        {#if targetUser.status === 'offline'}
                          <span class="badge badge-danger">Offline</span>
                        {/if}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Email:</th>
                      <td>
                        <a target="_blank" href="mailto:{targetUser.email ?? ''}"
                          >{targetUser.email ?? 'n/a'}</a
                        >
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Badges:</th>
                      <td>
                        <!--
                          THE CELL WAS EMPTY while the supply was already in the browser. Upstream
                          binds `innerHTML` here (bytes 2,060,329-2,060,802); these are ELEMENTS
                          because `badge.text` is controller data, and UNGATED because upstream's
                          binding carries no `O()`. See `user-badges-contract.test.ts`.
                        -->
                        <div class="d-inline-block align-baseline mr-1">
                          {#each targetBadges as badge, badgeIndex (`${targetUser.id}-${badgeIndex}`)}
                            {#if badge.imageUrl}
                              <img
                                class="user-badge-img"
                                src={badge.imageUrl}
                                alt={badge.text ?? 'Badge'}
                                width="16"
                                height="16"
                              />
                            {:else}
                              <span
                                class="badge px-1 mx-1 user-badge"
                                style="background-color: {badge.backgroundColor}; color: {badge.color};"
                                >{badge.text}</span
                              >
                            {/if}
                          {/each}
                        </div>
                        <!--
                          `O(20, sessData.isNewIndicatorOn && isPresenter && user.isNew ? 20 : -1)`
                          — bundle byte 2,060,925, and this gate had ONE of its three terms.

                          `isPresenter` is added here because it is the term this room can actually
                          evaluate, and it is the one that matters: whether somebody is a new member
                          is a moderation fact, and a member should not be reading it about another
                          member. The `Trial` badge above it carries the same rule upstream
                          (`O(19, isPresenter && user.isFT ? 19 : -1)`) and it is fixed with it.

                          `isNewIndicatorOn` is deliberately NOT added, and the reason is the same
                          one that keeps it off `ROOM_VISIBLE_SETTINGS`: **`isNew` has no supply.**
                          It arrives on the reference's own login payload (`globals.user.isNew =
                          B.data.isNew`, byte 995,175; `isNew: s.isNew || !1`, 1,157,344) from a
                          server that is not in the capture, so the rule deciding who is new is
                          unknowable here. Zero occurrences in `apps/room/src/lib/server` or on the
                          controller — measured, not assumed. A gate with nothing to gate is not a
                          consumer, which is exactly why `enableBadges` was held out until
                          `item.badges` had a supply. `missing-settings-triage.md` carries it as
                          BLOCKED with what would unblock it.
                        -->
                        {#if isPresenter && targetUser.isTrial}<span class="badge badge-danger"
                            >Trial</span
                          >{/if}
                        {#if isPresenter && targetUser.isNew}<span class="badge badge-info"
                            >New</span
                          >{/if}
                        {#if targetUser.years}
                          <span class="stars-container">
                            <i class="fas fa-star stars-icon"></i>
                            <span class="stars-num">{targetUser.years}</span>
                          </span>
                        {/if}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Location:</th>
                      <td>
                        {targetUser.location ?? 'n/a'} &nbsp;&nbsp;
                        {#if targetUser.ip}
                          <span
                            >IP:
                            <a target="_blank" href="http://ip-api.com/#{targetUser.ip}"
                              >{targetUser.ip} (click to lookup)</a
                            ></span
                          >
                        {/if}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">System:</th>
                      <td>{targetUser.userAgent ?? 'n/a'}</td>
                    </tr>
                    <tr>
                      <th scope="row">Permissions:</th>
                      <td>
                        <p class="mb-2">
                          {#if targetUser.permissions === 'r'}
                            <span>Regular User</span>
                          {:else if targetUser.permissions === 'a'}
                            <span>Presenter / Admin</span>
                          {/if}
                        </p>
                        <div class="d-flex justify-content-between align-items-end ms-4">
                          <form novalidate>
                            <div class="form-group mb-0">
                              <input
                                type="checkbox"
                                name="hasMic"
                                id="hasMicChk"
                                class="form-check-input"
                                bind:checked={userPermissions.hasMic}
                                onchange={(event) => {
                                  // Unticking revokes; ticking is not the grant - that is the Give button below.
                                  if (!event.currentTarget.checked)
                                    void revokePermission('mutemic');
                                }}
                              />
                              <label for="hasMicChk" class="form-check-label"
                                ><i class="icon fa fa-microphone"></i> &nbsp;Microphone</label
                              >
                            </div>
                            <div class="form-group mb-0">
                              <input
                                type="checkbox"
                                name="hasScreen"
                                id="hasScreenChk"
                                class="form-check-input"
                                bind:checked={userPermissions.hasScreen}
                                onchange={(event) => {
                                  // Unticking revokes; ticking is not the grant - that is the Give button below.
                                  if (!event.currentTarget.checked)
                                    void revokePermission('mutescreens');
                                }}
                              />
                              <label for="hasScreenChk" class="form-check-label"
                                ><i class="icon fa fa-desktop"></i>&nbsp;Screenshare</label
                              >
                            </div>
                            <div class="form-group mb-0">
                              <input
                                type="checkbox"
                                name="hasCam"
                                id="hasCam"
                                class="form-check-input"
                                bind:checked={userPermissions.hasCam}
                                onchange={(event) => {
                                  // Unticking revokes; ticking is not the grant - that is the Give button below.
                                  if (!event.currentTarget.checked)
                                    void revokePermission('mutecam');
                                }}
                              />
                              <label for="hasCam" class="form-check-label"
                                ><i class="icon fa fa-video"></i>&nbsp;WebCam</label
                              >
                            </div>
                            <!--
                              `giveMicScreen(true|false)`.

                              The method is transcribed byte-for-byte (bundle offset 2075481) and
                              belongs to this component, proven by its neighbours `saveCustomPerms`
                              and `startPrivateChat`. The BUTTONS are ours: the calling element is
                              still not located in the decoded template, so the affordance is a
                              reasoned placement beside the permissions it grants, and is marked as
                              such rather than presented as captured.

                              This is the sender §2.4 said was missing — without it
                              `isLimitedPresenter` could never become true and the two surfaces
                              gated on it could never narrow.
                            -->
                            <div class="form-group mb-0 mt-2">
                              <button
                                type="button"
                                class="btn btn-sm btn-primary"
                                onclick={() => void giveMicScreen(true)}
                                >Give Mic/Screenshare</button
                              >
                              <button
                                type="button"
                                class="btn btn-sm btn-default"
                                onclick={() => void giveMicScreen(false)}>Take away</button
                              >
                            </div>
                            <div class="form-group mb-0">
                              <input
                                type="checkbox"
                                name="hasAdminChat"
                                id="hasAdminChat"
                                class="form-check-input"
                                bind:checked={userPermissions.hasAdminChat}
                              />
                              <label for="hasAdminChat" class="form-check-label"
                                ><i class="far fa-comment-alt"></i>&nbsp;Admin Chat</label
                              >
                            </div>
                            <div class="form-group mb-0">
                              <input
                                type="checkbox"
                                name="canEditNotes"
                                id="canEditNotes"
                                class="form-check-input"
                                bind:checked={userPermissions.canEditNotes}
                              />
                              <label for="canEditNotes" class="form-check-label"
                                ><i class="fas fa-edit"></i>&nbsp;Can Edit Notes</label
                              >
                            </div>
                          </form>
                          <div>
                            <button
                              class="btn btn-outline-success mb-1"
                              onclick={() =>
                                onSavePermissions(
                                  targetUser,
                                  ROOM_PERMISSION_KEYS.filter((key) => userPermissions[key])
                                )}
                            >
                              <i class="icon fa fa-disk"></i> Save
                            </button>
                            <div class="form-group mb-0 ms-4">
                              <input
                                type="checkbox"
                                name="temporaryAccessOnly"
                                id="temporaryAccessOnly"
                                class="form-check-input"
                                bind:checked={userPermissions.temporaryAccessOnly}
                              />
                              <label for="temporaryAccessOnly" class="form-check-label"
                                ><i class="fas fa-wrench"></i>&nbsp;Temporary Access Only</label
                              >
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div
            id="nav-system"
            role="tabpanel"
            aria-labelledby="nav-tab-system"
            class={[
              'tab-pane fade',
              { show: userInfoTab === 'system', active: userInfoTab === 'system' }
            ]}
          >
            <div class="d-flex flex-wrap align-items-center justify-content-center">
              <div class="table-responsive">
                <table class="table w-100">
                  <tbody>
                    <tr>
                      <th scope="row">App Version:</th>
                      <td>{targetUser.appVersion ?? 'n/a'}</td>
                    </tr>
                    <tr>
                      <th scope="row">IP:</th>
                      <td>
                        <span>{targetUser.ip ?? 'n/a'}</span>
                        {#if targetUser.ip}
                          <a target="_blank" href="http://ip-api.com/#{targetUser.ip}"
                            >{targetUser.ip} (click to lookup)</a
                          >
                        {/if}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">System:</th>
                      <td>{targetUser.userAgent ?? 'n/a'}</td>
                    </tr>
                    <tr>
                      <th scope="row">Stream Server:</th>
                      <td>
                        {targetUser.streamServer ?? 'n/a'}
                        {#if targetUser.streamServer}
                          <a
                            href="{resolve('/')}?forcedStream={encodeURIComponent(
                              targetUser.streamServer
                            )}">(test it)</a
                          >
                        {/if}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Socket Server:</th>
                      <td> Host ID: {targetUser.serverId ?? 'n/a'} </td>
                    </tr>
                    <tr>
                      <th scope="row">UserID:</th>
                      <td>
                        UID: {targetUser.userXrefID ?? 'n/a'} <br />
                        RID: {targetUser._id ?? 'n/a'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div
            id="nav-options"
            role="tabpanel"
            aria-labelledby="nav-tab-options"
            class={[
              'tab-pane fade',
              { show: userInfoTab === 'options', active: userInfoTab === 'options' }
            ]}
          >
            <div class="row">
              {#if targetUser.permissions === 'a'}
                <div class="col">
                  <button
                    type="button"
                    class="btn btn-block btn-outline-light"
                    onclick={() => onUserAction('mute-mic', targetUser)}
                    ><i class="icon fa fa-microphone-slash"></i> Mute Audio</button
                  >
                  <button
                    type="button"
                    class="btn btn-block btn-outline-light"
                    onclick={() => onUserAction('mute-camera', targetUser)}
                    ><i class="icon fa fa-video-slash"></i> Mute Camera</button
                  >
                  <button
                    type="button"
                    class="btn btn-block btn-outline-light"
                    onclick={() => onUserAction('stop-screens', targetUser)}
                    ><i class="icon fa fa-desktop"></i>&nbsp;<i class="icon fa fa-stop-circle"></i> Stop
                    Screens</button
                  >
                  <button
                    type="button"
                    class="btn btn-block btn-outline-light"
                    onclick={() => onUserAction('restart-screens', targetUser)}
                    ><i class="icon fa fa-desktop"></i>&nbsp;<i class="icon fa fa-play-circle"></i> Restart
                    Screens</button
                  >
                  <button
                    type="button"
                    class="btn btn-block btn-outline-light"
                    onclick={() => onUserAction('start-recording', targetUser)}
                    ><i class="icon fa fa-record-vinyl"></i> Start Rec</button
                  >
                  <button
                    type="button"
                    class="btn btn-block btn-outline-light"
                    onclick={() => onUserAction('stop-recording', targetUser)}
                    ><i class="icon fa fa-stop-circle"></i> Stop Rec</button
                  >
                </div>
              {/if}
              <div class="col">
                <button
                  type="button"
                  class="btn btn-block btn-outline-light"
                  onclick={() => onUserAction('force-reload', targetUser)}
                  ><i class="icon fa fa-sync"></i> Force Reload</button
                >
                <button
                  type="button"
                  class="btn btn-block btn-outline-light"
                  onclick={() => onUserAction('restart-audio', targetUser)}
                  ><i class="icon fa fa-volume-up"></i> Restart Audio</button
                >
                <button
                  type="button"
                  class="btn btn-block btn-outline-light"
                  onclick={() => onUserAction('debug-log', targetUser)}
                  ><i class="icon fa fa-bug"></i> Get Debug Log</button
                >
                <button
                  type="button"
                  class="btn btn-block btn-outline-light"
                  onclick={() => onUserAction('kick', targetUser)}
                  ><i class="icon fa fa-user-times"></i> Kick</button
                >
                <button
                  type="button"
                  class="btn btn-block btn-outline-light"
                  onclick={() => onUserAction('kick-ban', targetUser)}
                  ><i class="icon fa fa-user-times"></i> Kick &amp; Ban</button
                >
                <button
                  type="button"
                  class="btn btn-block btn-outline-light"
                  onclick={() => onUserAction('kick-duplicates', targetUser)}
                  ><i class="icon fa fa-user-times"></i> Kick Duplicates</button
                >
                <div
                  {...{ ngbdropdown: '' } as Record<string, string>}
                  class="d-inline-block btn-block dropdown"
                >
                  <button
                    {...{ ngbdropdowntoggle: '' } as Record<string, string>}
                    class="dropdown-toggle btn btn-block btn-outline-light"
                    aria-expanded={userMuteMenuOpen}
                    onclick={() => (userMuteMenuOpen = !userMuteMenuOpen)}
                  >
                    Mute / Unmute Chat
                  </button>
                  <div
                    {...{ ngbdropdownmenu: '' } as Record<string, string>}
                    aria-labelledby="dropdownBasic1"
                    class={['dropdown-menu', { show: userMuteMenuOpen }]}
                  >
                    <button
                      {...{ ngbdropdownitem: '' } as Record<string, string>}
                      class="dropdown-item"
                      tabindex="0"
                      onclick={() => onUserAction('mute-chat-24', targetUser)}
                    >
                      Mute Chat for 24hrs
                    </button>
                    <button
                      {...{ ngbdropdownitem: '' } as Record<string, string>}
                      class="dropdown-item"
                      tabindex="0"
                      onclick={() => onUserAction('mute-chat-indefinitely', targetUser)}
                    >
                      Mute Chat indefinately
                    </button>
                    <button
                      {...{ ngbdropdownitem: '' } as Record<string, string>}
                      class="dropdown-item"
                      tabindex="0"
                      onclick={() => onUserAction('unmute-chat', targetUser)}
                    >
                      Unmute Chat
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  class="btn btn-block btn-outline-light"
                  onclick={() => onUserAction('disable-private-chat', targetUser)}
                  ><i class="icon fa fa-comment-slash"></i> Disable Private Chat</button
                >
                <!--
                  WIRED 2026-08-29, and it takes ITS OWN PROP rather than a widened `onUserAction`.

                  That is the call `save-permissions` already paid for and `focusOnSessionNote`
                  before it: `onUserAction` carries an action name and a user, and a control that
                  needs to carry a FILE too would have to widen it for every other action as well.
                  A prop shared between two different acts is what lets a control look wired while
                  doing something else.

                  Upstream's `adminUploadProfilePic($event)` takes the click event, so the picker is
                  the button's own. The input is hidden rather than styled because the capture
                  renders a `<button>` here and nothing else — a visible file input would be a
                  control the reference does not have.
                -->
                <input
                  type="file"
                  accept={IMAGE_ACCEPT}
                  class="d-none"
                  bind:this={profilePictureInput}
                  onchange={(event) => {
                    const picked = event.currentTarget.files?.[0];
                    // Reset FIRST, so choosing the same file twice still fires a change.
                    event.currentTarget.value = '';
                    if (picked) void sendProfilePicture(targetUser, picked);
                  }}
                />
                <button
                  type="button"
                  class="btn btn-block btn-outline-light"
                  onclick={() => profilePictureInput?.click()}
                  ><i class="icon fa fa-user-circle"></i> Upload Profile Picture</button
                >
                <!--
                  Slot 102, `O(102, sessData.enablePrivateMessageHistory ? 102 : -1)` at bundle byte
                  2,068,640, template `hTe` with consts 90 and 91. `{#if}` and not `hidden`: the
                  reference REMOVES the node, and what it gates is an entitlement rather than a mode,
                  which is `MainTabStrip`'s rule for choosing between the two.
                -->
                {#if privateMessageHistoryEnabled}
                  <button
                    type="button"
                    class="btn btn-block btn-outline-light"
                    onclick={() => onShowPrivateMessages(targetUser)}
                    ><i class="icon fas fa-comment"></i> Show private messages</button
                  >
                {/if}
              </div>
            </div>
          </div>
          <div
            id="nav-notes"
            role="tabpanel"
            aria-labelledby="nav-tab-perms"
            class={[
              'tab-pane fade',
              { show: userInfoTab === 'notes', active: userInfoTab === 'notes' }
            ]}
          >
            <!--
              BOTH halves of upstream's two-state switch now, `O(104, allowToManageNotes ? 105 : 104)`.
              Only 104 was here; see `UserNotesPane.svelte` for what 105 is and how it was found.
            -->
            <UserNotesPane
              canManage={userNotes.canManage}
              notes={userNotes.notes}
              loading={userNotes.loading}
              error={userNotes.error}
              onEnterPassword={() => onUserAction('admin-notes-password', targetUser)}
              onAdd={() => userNotes.add()}
              onRemove={(note) => userNotes.remove(note)}
            />
          </div>
        </div>
      </div>
    {:else if isTargetFollowed}
      <FollowChatStylePane
        bind:style={followChatStyle}
        onreset={() => (followChatStyle = defaultFollowStyle())}
        onsave={() => onFollowStyleChange(targetUser, followChatStyle)}
        ontestsound={() => onUserAction('test-follow-sound', targetUser)}
      />
    {/if}
    {#snippet footer()}
      {#if !isTargetCurrentUser}
        <button
          type="button"
          class="btn btn-outline-light"
          onclick={() => {
            onMentionUser(targetUser.nick);
            onclose();
          }}
        >
          @Mention
        </button>
        <button
          type="button"
          class="btn btn-outline-light"
          onclick={() => {
            onPrivateChat(targetUser);
            onclose();
          }}
        >
          Private Chat
        </button>
        <button
          type="button"
          class="btn btn-outline-info"
          onclick={() => onFollowToggle(targetUser)}
        >
          {#if isTargetFollowed}
            <span><span class="followingSign">Following</span></span>
          {:else}
            <span>Follow</span>
          {/if}
        </button>
        <button
          type="button"
          class="btn btn-outline-warning"
          onclick={() => onMuteToggle(targetUser)}
        >
          {#if isTargetMuted}
            <span><i class="fas fa-ban me-1"></i>Muted</span>
          {:else}
            <span>Mute</span>
          {/if}
        </button>
      {/if}
      <button type="button" class="btn btn-primary" onclick={onclose}>Close</button>
    {/snippet}
  </Modal>
</app-user-info-modal>
<app-play-youtube-modal>
  <Modal
    id="play-youtube-modal"
    open={name === 'youtube'}
    ariaLabelledby="play-youtube-modal"
    title="Play YouTube For All"
    {onclose}
    footerClass="text-center"
  >
    <div class="input-group mb-3">
      <input
        id="youtube-url"
        name="youtubeURL"
        type="text"
        placeholder="Paste YouTube URL"
        aria-label="Paste YouTube URL"
        aria-describedby="basic-addonYT"
        class="form-control ng-untouched ng-pristine ng-valid"
        bind:value={youtubeURL}
      />
      {#if youtubeURL}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span id="basic-addonClear" class="input-group-text btn" onclick={() => (youtubeURL = '')}
          >×</span
        >
      {/if}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span id="basic-addonSave" class="input-group-text btn" onclick={saveYtUrl}>Save</span>
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span id="basic-addonPlay" class="input-group-text btn" onclick={playYtVideo}
        >Play For All</span
      >
    </div>
    {#if ytVideoList.length > 0}
      <div class="text-left">
        <h5>Saved:</h5>
        {#each ytVideoList as video, index (video.url)}
          <p>
            <button
              type="button"
              aria-label="Remove saved YouTube URL"
              class="btn btn-danger btn-sm remove-yt-url"
              onclick={() => requestRemoveYtUrl(index)}
            >
              <i class="fas fa-minus"></i>
            </button>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <span class="yt-url" onclick={() => playSavedYtUrl(video.url)}>{video.title}</span>
          </p>
        {/each}
      </div>
    {/if}
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal>
  {#if youtubePromptOpen}
    <BootboxDialog
      mode="prompt"
      message=""
      title="Add Title for Youtube video url"
      onclose={() => (youtubePromptOpen = false)}
      onconfirm={(value) => saveYtUrlWithTitle(value ?? '')}
    />
  {/if}
  {#if youtubeRemoveIndex !== null}
    <BootboxDialog
      mode="confirm"
      message="Remove this youtube video url?"
      onclose={() => (youtubeRemoveIndex = null)}
      onconfirm={removeYtUrl}
    />
  {/if}
  {#if youtubeAlert}
    <BootboxDialog mode="alert" message={youtubeAlert} onclose={() => (youtubeAlert = null)} />
  {/if}
  <!-- `bootbox.alert(...)` in the capture, both for the refusal and the confirmation. -->
  {#if micScreenAlert}
    <BootboxDialog mode="alert" message={micScreenAlert} onclose={() => (micScreenAlert = null)} />
  {/if}
  {#if presenterColorAlert}
    <BootboxDialog
      mode="alert"
      message={presenterColorAlert}
      onclose={() => (presenterColorAlert = null)}
    />
  {/if}
</app-play-youtube-modal>
<app-user-settings-modal>
  <Modal
    id="user-settings-modal"
    open={name === 'settings'}
    closedAriaHidden
    ariaLabelledby="user-settings-modal"
    title="General Settings"
    {onclose}
    footerClass="text-center"
  >
    <ul id="userSettingsTab" role="tablist" class="nav nav-tabs">
      <li class="nav-item">
        <a
          id="user-app-settings-tab"
          data-bs-toggle="tab"
          href="#user-app-settings"
          role="tab"
          aria-controls="user-app-settings"
          aria-selected={settingsTab === 'app'}
          class={settingsTab === 'app' ? 'nav-link active' : 'nav-link'}
          onclick={(event) => {
            event.preventDefault();
            onSettingsTab('app');
          }}>App Settings</a
        >
      </li>
      <li class="nav-item">
        <a
          id="user-alert-settings-tab"
          data-bs-toggle="tab"
          href="#user-alert-settings"
          role="tab"
          aria-controls="user-alert-settings"
          aria-selected={settingsTab === 'alerts'}
          class={settingsTab === 'alerts' ? 'nav-link active' : 'nav-link'}
          onclick={(event) => {
            event.preventDefault();
            onSettingsTab('alerts');
          }}>Alert Settings</a
        >
      </li>
      <li class="nav-item">
        <a
          id="user-chat-settings-tab"
          data-bs-toggle="tab"
          href="#user-chat-settings"
          role="tab"
          aria-controls="user-chat-settings"
          aria-selected={settingsTab === 'chat'}
          class={settingsTab === 'chat' ? 'nav-link active' : 'nav-link'}
          onclick={(event) => {
            event.preventDefault();
            onSettingsTab('chat');
          }}>Chat Settings</a
        >
      </li>
      <!--
        USM-14 — `O(18, isPresenter && !isLimitedPresenter ? 18 : -1)`, byte 2,283,408, and the pane
        below carries the same pair at 2,288,469. A limited presenter — somebody handed mic and
        screen — was getting the whole Presenter Settings tab: the CC toggle, the presenter colours,
        the recording preview. `giveMicScreen` hands over the ability to SPEAK, and the same
        narrowing is already applied two tabs away on the user card and on Group Chat Control.
      -->
      {#if isPresenter && !isLimitedPresenter}
        <li class="nav-item">
          <a
            id="presenter-settings-tab"
            data-bs-toggle="tab"
            href="#presenter-settings"
            role="tab"
            aria-controls="presenter-settings"
            aria-selected={settingsTab === 'presenter'}
            class={settingsTab === 'presenter' ? 'nav-link active' : 'nav-link'}
            onclick={(event) => {
              event.preventDefault();
              onSettingsTab('presenter');
            }}>Presenter Settings</a
          >
        </li>
      {/if}
    </ul>

    <div id="userSettingsTabContent" class="tab-content">
      <div
        id="user-app-settings"
        role="tabpanel"
        aria-labelledby="user-app-settings-tab"
        class={settingsTab === 'app' ? 'tab-pane fade show active' : 'tab-pane fade'}
      >
        <div class="p-2 themes">
          <div id="colorTheme" title="Choose Color Theme" class="pb-2">
            <i class="fas fa-palette"></i>
            <span class="pl-2">Choose Color Theme:</span>
          </div>
          <div class="ml-5">
            <input
              type="radio"
              name="app-color-theme"
              value="Light Theme"
              id="app-light-theme"
              class="form-check-input"
              {@attach setInputChecked(theme === 'light')}
              onchange={() => onTheme('light')}
            />
            <label for="app-light-theme" class="form-check-label">Light Theme</label>
          </div>
          <div class="ml-5">
            <input
              type="radio"
              name="app-color-theme"
              value="Dark Theme"
              id="app-dark-theme"
              class="form-check-input"
              {@attach setInputChecked(theme === 'dark')}
              onchange={() => onTheme('dark')}
            />
            <label for="app-dark-theme" class="form-check-label">Dark Theme</label>
          </div>
        </div>

        <div class="p-2 themes">
          <div id="roomLayout" title="Choose Room Layout" class="pb-2">
            <i class="fa fa-columns"></i>
            <span class="pl-2">Room Layout:</span>
          </div>
          <div class="ml-5">
            <div class="form-check">
              <input
                type="radio"
                name="roomLayoutOptions"
                id="chat-alerts-left"
                value="chat-alerts-left"
                class="form-check-input"
                {@attach setInputChecked(roomSplitDir === 'ltr')}
              />
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
              <label
                for="chat-alerts-left"
                class="form-check-label"
                onclick={() => onPreferenceChange('roomSplitDir', 'ltr')}
                >Chat and Alerts left</label
              >
            </div>
            <div class="form-check">
              <input
                type="radio"
                name="roomLayoutOptions"
                id="chat-alerts-top"
                value="chat-alerts-top"
                class="form-check-input"
                {@attach setInputChecked(roomSplitDir === 'ttb')}
              />
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
              <label
                for="chat-alerts-top"
                class="form-check-label"
                onclick={() => onPreferenceChange('roomSplitDir', 'ttb')}>Chat and Alerts top</label
              >
            </div>
            <div class="form-check">
              <input
                type="radio"
                name="roomLayoutOptions"
                id="chat-alerts-right"
                value="chat-alerts-right"
                class="form-check-input"
                {@attach setInputChecked(roomSplitDir === 'rtl')}
              />
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
              <label
                for="chat-alerts-right"
                class="form-check-label"
                onclick={() => onPreferenceChange('roomSplitDir', 'rtl')}
                >Chat and Alerts right</label
              >
            </div>
            <div class="form-check">
              <input
                type="radio"
                name="roomLayoutOptions"
                id="chat-alerts-bottom"
                value="chat-alerts-bottom"
                class="form-check-input"
                {@attach setInputChecked(roomSplitDir === 'btt')}
              />
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
              <label
                for="chat-alerts-bottom"
                class="form-check-label"
                onclick={() => onPreferenceChange('roomSplitDir', 'btt')}
                >Chat and Alerts bottom</label
              >
            </div>
          </div>
          <div class="ml-5">
            <hr />
            <input
              type="checkbox"
              name="pm-window-layout"
              value="appService.globals.preferences.pmLogsOnRight"
              id="pm-window-layout"
              class="form-check-input ng-untouched ng-pristine ng-valid"
              {@attach setInputChecked(settingChecks['pm-window-layout'])}
              onchange={requestPmWindowLayout}
            />
            <label for="pm-window-layout" class="form-check-label">PM logs on the right</label>
          </div>
        </div>

        <div class="p-2 d-flex align-items-end justify-content-between">
          <div class="flex-fill">
            <div id="chatColorMode" title="Chat Color Mode" class="pb-2">
              <i class="fas fa-wrench"></i>
              <span class="pl-2">Colors &amp; Size:</span>
            </div>
            <div class="ml-5">
              <input
                type="color"
                name="chat-text-color"
                id="chat-text-color"
                class="form-check-input ng-untouched ng-pristine ng-valid"
                bind:value={chatStyle.color}
              />
              <label for="chat-text-color" class="form-check-label ml-4 pl-2">Text Color</label>
            </div>
            <div class="ml-5">
              <input
                type="color"
                name="chat-username-color"
                id="chat-username-color"
                class="form-check-input ng-untouched ng-pristine ng-valid"
                bind:value={chatStyle.usernameColor}
              />
              <label for="chat-username-color" class="form-check-label ml-4 pl-2"
                >Username Color</label
              >
            </div>
            <div class="ml-5">
              <input
                type="color"
                name="chat-bg-color"
                id="chat-bg-color"
                class="form-check-input ng-untouched ng-pristine ng-valid"
                bind:value={chatStyle.bgColor}
              />
              <label for="chat-bg-color" class="form-check-label ml-4 pl-2">Background Color</label>
            </div>
            <div class="ml-5">
              <input
                type="color"
                name="chat-ticker-color"
                id="chat-ticker-color"
                class="form-check-input ng-untouched ng-pristine ng-valid"
                bind:value={chatStyle.tickerColor}
              />
              <label for="chat-ticker-color" class="form-check-label ml-4 pl-2">Ticker Color</label>
            </div>
            <div class="ml-5">
              <input
                type="number"
                name="chat-text-size"
                id="chat-text-size"
                class="form-check-input ng-untouched ng-pristine ng-valid"
                bind:value={chatStyle.fontSize}
              />
              <label for="chat-text-size" class="form-check-label ml-4 pl-2">Text Size</label>
            </div>
          </div>
          <div class="text-right">
            <button type="button" class="btn btn-outline-danger mx-1" onclick={resetChatStyle}
              >Reset</button
            >
            <button type="button" class="btn btn-outline-light" onclick={saveChatStyle}
              >Save changes</button
            >
          </div>
        </div>

        <div class="p-2 text-mode-box">
          <div id="appDoNotDisturb" title="Do not disturb" class="pb-2">
            <i class="fas fa-bell-slash"></i>
            <span class="pl-2">Do not disturb:</span>
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="settings-app-donot-disturb"
              value="Do not disturb"
              id="settings-app-donot-disturb"
              class="form-check-input"
              {@attach setInputChecked(doNotDisturbOn)}
              onchange={updateSettingCheck}
            />
            <label for="settings-app-donot-disturb" class="form-check-label"
              ><span>{doNotDisturbOn ? "DON'T DISTURB" : "Don't Disturb"}</span></label
            >
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="app-recording-start-sound"
              value="Do not disturb"
              id="app-recording-start-sound"
              class="form-check-input"
              {@attach setInputChecked(settingChecks['app-recording-start-sound'])}
              onchange={updateSettingCheck}
            />
            <label for="app-recording-start-sound" class="form-check-label"
              >Start recording sound <span
                >{settingChecks['app-recording-start-sound'] ? 'on' : 'off'}</span
              ></label
            >
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="app-recording-stop-sound"
              value="Do not disturb"
              id="app-recording-stop-sound"
              class="form-check-input"
              {@attach setInputChecked(settingChecks['app-recording-stop-sound'])}
              onchange={updateSettingCheck}
            />
            <label for="app-recording-stop-sound" class="form-check-label"
              >Stop recording sound <span
                >{settingChecks['app-recording-stop-sound'] ? 'on' : 'off'}</span
              ></label
            >
          </div>
          <!--
            USM-12 — `O(115, isPresenter ? 115 : -1)`, byte 2,285,015. THREE defects in one control,
            and the first two are why the third was never noticed:

              1. `app-recording-preview-window` was absent from `updateSettingCheck`'s
                 id→preference table, which has NO fallback, so the box persisted nothing and was
                 forgotten on reload.
              2. Nothing read `recPreviewWindow` anywhere in this room, so there was nothing for a
                 stored value to restore even if it had been written.
              3. It rendered for every viewer, while the preview window it governs belongs to the
                 presenter who is recording.

            All three are closed: the preference exists on `RoomPrefs`, `showRecPreview` refuses when
            it is off, `create-room`'s `onSideEffect` closes an open preview when it is switched off
            (the reference's own `closeRecPreviewWindow`), and this is the gate.
          -->
          {#if isPresenter}
            <div class="ml-5">
              <input
                type="checkbox"
                name="app-recording-preview-window"
                value="Do not disturb"
                id="app-recording-preview-window"
                class="form-check-input"
                {@attach setInputChecked(settingChecks['app-recording-preview-window'])}
                onchange={updateSettingCheck}
              />
              <label for="app-recording-preview-window" class="form-check-label"
                >Recording Preview
                <span>{settingChecks['app-recording-preview-window'] ? 'on' : 'off'}</span></label
              >
            </div>
          {/if}
        </div>

        <div class="p-2 text-mode-box">
          <div id="appDisableVideo" title="Disable/Enable Video" class="pb-2">
            <i class="fas fa-desktop"></i>
            <span class="pl-2">Disable/Enable Video:</span>
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="app-disable-video"
              value="Disable video"
              id="app-disable-video"
              class="form-check-input"
              {@attach setInputChecked(settingChecks['app-disable-video'])}
              onchange={updateSettingCheck}
            />
            <label for="app-disable-video" class="form-check-label"
              >Video <span>{settingChecks['app-disable-video'] ? 'Enabled' : 'Disabled'}</span
              ></label
            >
          </div>
        </div>

        <ViewerAlertPrefsPane {viewerAlerts} {isPresenter} {onPreferenceChange} />

        <!--
          USM-11 — `note-update-popup`, `v(3," Note Update Popup ")` at byte 2,269,438.

          Its consumer had to be built first and that was the larger half: `saveSessionNote`
          published NOTHING, so another viewer's Notes pane kept the old text until they reloaded.
          `#lib/room/note-update-notice.ts` holds the frame, both byte offsets and the two refusals —
          including why this control is NOT gated on `sessData.beepOnUserJoin` the way upstream
          gates it at byte 2,285,196.
        -->
        <!--
          USM-08 and USM-09 — the two reaction popups, each behind the ROOM setting that turns its
          feature on. `ReactionPrefsPane.svelte` holds them, both gate offsets, and why a room with
          reactions switched off must not draw them at all.
        -->
        <ReactionPrefsPane
          enableReactions={messageChrome.enableReactions}
          enableQaReactions={messageChrome.enableQaReactions}
          {settingChecks}
          onchange={updateSettingCheck}
        />
        <div class="p-2 text-mode-box">
          <div id="appNoteUpdatePopup" title="Note Update Popup" class="pb-2">
            <i class="fas fa-sticky-note"></i>
            <span class="pl-2">Note Update Popup:</span>
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="note-update-popup"
              value="Do not disturb"
              id="note-update-popup"
              class="form-check-input"
              {@attach setInputChecked(settingChecks['note-update-popup'])}
              onchange={updateSettingCheck}
            />
            <label for="note-update-popup" class="form-check-label"
              >Note Update Popup
              <span>{settingChecks['note-update-popup'] ? 'on' : 'off'}</span></label
            >
          </div>
        </div>
        <!--
          USM-15 — `O(132, globals.hasSpeechRecognition ? 132 : -1)`, byte 2,285,653, and its twin
          on the presenter pane below.

          Not a privilege hole and it is worth saying which kind of defect it was: this room already
          REFUSES at runtime (`RoomRecording.beginSpeechRecognition`, pinned by
          `speech-reco-entitlement.test.ts`). What it drew was a checkbox that could be ticked, said
          `Enabled`, and captioned nothing — a control whose only effect is changing its own label,
          which is the shape `CLAUDE.md` names outright. The room-level entitlement decides whether
          the control exists at all, exactly as it decides whether the feature runs.
        -->
        {#if captionsAvailable}
          <div class="p-2 text-mode-box">
            <div id="appSpeechRecoOverlay" title="Show Speech Recognition Overlay" class="pb-2">
              <i class="fas fa-closed-captioning"></i>
              <span class="pl-2">Show Closed Captions Overlay:</span>
            </div>
            <div class="ml-5">
              <input
                type="checkbox"
                name="app-speech-reco-overlay"
                value="Show Speech Recognition Overlay"
                id="app-speech-reco-overlay"
                class="form-check-input"
                {@attach setInputChecked(settingChecks['app-speech-reco-overlay'])}
                onchange={updateSettingCheck}
              />
              <label for="app-speech-reco-overlay" class="form-check-label"
                ><span>{settingChecks['app-speech-reco-overlay'] ? 'Enabled' : 'Disabled'}</span
                ></label
              >
            </div>
          </div>
        {/if}

        <div class="p-2 text-mode-box">
          <div class="mx-3">
            <!--
              `O(135, isPresenter ? 135 : -1)`, byte 2,285,714 — slot 135 is `ake` and holds exactly
              these three, while "Edit my Info and Avatar" below is outside it and drawn for
              everybody. All four sat in one ungated div here. `isPresenter` alone, not the
              `&& !isLimitedPresenter` the user card uses: transcribed, not tightened.
            -->
            {#if isPresenter}
              <button
                class="btn btn-danger btn-sm m-1"
                onclick={() => onUserAction('remove-preview-windows', targetUser)}
              >
                <i class="fas fa-video-slash me-1"></i> Remove webcam/screenpreview windows
              </button>
              <button
                class="btn btn-danger btn-sm m-1"
                onclick={() => onUserAction('mute-all-non-admins', targetUser)}
              >
                <i class="fas fa-microphone-slash me-1"></i> Mute Microphone for all non-admins
              </button>
              <button
                class="btn btn-info btn-sm m-1"
                onclick={() => onUserAction('get-my-token', targetUser)}
              >
                <i class="fas fa-user-tie me-1"></i> Get my token
              </button>
            {/if}
            <button
              class="btn btn-warning btn-sm m-1"
              onclick={() => onUserAction('edit-my-info', targetUser)}
              ><i class="fas fa-user-tie me-1"></i>Edit my Info and Avatar</button
            >
          </div>
        </div>
      </div>

      <div
        id="user-alert-settings"
        role="tabpanel"
        aria-labelledby="user-alert-settings-tab"
        class={settingsTab === 'alerts' ? 'tab-pane fade active show' : 'tab-pane fade'}
      >
        <div class="p-2 text-mode-box">
          <div id="alertTextMode" title="Alert Text Mode" class="pb-2">
            <i class="fas fa-file-alt"></i>
            <span class="pl-2">Text Mode:</span>
          </div>
          <div class="ml-5">
            <input
              type="radio"
              name="alert-text-mode"
              value="Alert Regular Mode"
              id="alert-regular-mode"
              class="form-check-input"
              {@attach setInputChecked(alertsDisplayMode === 'r')}
              onchange={() => onDisplayModeChange('alerts', 'r')}
            />
            <label for="alert-regular-mode" class="form-check-label">Regular Mode</label>
          </div>
          <div class="ml-5">
            <input
              type="radio"
              name="alert-text-mode"
              value="Alert Compact Mode"
              id="alert-compact-mode"
              class="form-check-input"
              {@attach setInputChecked(alertsDisplayMode === 'c')}
              onchange={() => onDisplayModeChange('alerts', 'c')}
            />
            <label for="alert-compact-mode" class="form-check-label">Compact Mode</label>
          </div>
        </div>

        <div class="p-2 text-mode-box">
          <div id="alertDoNotDisturb" title="Alert Do not disturb" class="pb-2">
            <i class="fas fa-bell-slash"></i>
            <span class="pl-2">Do not disturb:</span>
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="alert-popup-donot-disturb"
              value="Alert Popup Do not disturb"
              id="alert-popup-donot-disturb"
              class="form-check-input"
              {@attach setInputChecked(alertPopup)}
              onchange={updateSettingCheck}
            />
            <label for="alert-popup-donot-disturb" class="form-check-label"
              >Alert / QA Popup <span>{alertPopup ? 'on' : 'off'}</span></label
            >
            <hr />
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="settings-alert-donot-disturb"
              value="Alert Do not disturb"
              id="settings-alert-donot-disturb"
              class="form-check-input"
              {@attach setInputChecked(alertSoundOn)}
              onchange={updateSettingCheck}
            />
            <label for="settings-alert-donot-disturb" class="form-check-label"
              >Alert sound <span>{alertSoundOn ? 'on' : 'off'}</span></label
            >
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="settings-qa-donot-disturb"
              value="QA Do not disturb"
              id="settings-qa-donot-disturb"
              class="form-check-input"
              {@attach setInputChecked(qaSoundOn)}
              onchange={updateSettingCheck}
            />
            <label for="settings-qa-donot-disturb" class="form-check-label"
              >QA sound <span>{qaSoundOn ? 'on' : 'off'}</span></label
            >
          </div>
          <!--
            USM-10 — `app-reactions-sound-qa`, `v(3," QA Reactions Sound ")` at byte 2,232,964, sat
            beside the QA sound above it and was missing.

            Same event as USM-09's popup, and note which gate is on which: upstream suppresses this
            SOUND with Do Not Disturb and does NOT suppress the popup —
            `preferences.doNotDisturbOn || (c && preferences.qaReactionSoundOn && qaAlert.play())`
            at byte 1,408,850, with the popup on the line after, outside that guard. Reproduced,
            asymmetry included, because it is the shape every other notification here has.

            Gated on `enableQAReactions` for the reason its two neighbours in the App tab are: a
            room with Q&A reactions off has nothing for this to silence.
          -->
          {#if messageChrome.enableQaReactions}
            <div class="ml-5">
              <input
                type="checkbox"
                name="app-reactions-sound-qa"
                value="Do not disturb"
                id="app-reactions-sound-qa"
                class="form-check-input"
                {@attach setInputChecked(settingChecks['app-reactions-sound-qa'])}
                onchange={updateSettingCheck}
              />
              <label for="app-reactions-sound-qa" class="form-check-label"
                >QA Reactions Sound
                <span>{settingChecks['app-reactions-sound-qa'] ? 'on' : 'off'}</span></label
              >
            </div>
          {/if}
          <div class="ml-5">
            <input
              type="checkbox"
              name="non-trade-alert"
              value="Alert Do not disturb"
              id="non-trade-alert"
              class="form-check-input"
              {@attach setInputChecked(nonTradeSound)}
              onchange={updateSettingCheck}
            />
            <label for="non-trade-alert" class="form-check-label"
              >Non-trade alert sound <span>{nonTradeSound ? 'on' : 'off'}</span></label
            >
          </div>
        </div>

        <div class="p-2 text-mode-box">
          <div id="alertPopup" title="Alert popup" class="pb-2">
            <i class="fas fa-bell"></i>
            <span class="pl-2">Alert popup:</span>
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="longer-alert-popup"
              value="Longer alert popup"
              id="longer-alert-popup"
              class="form-check-input"
              {@attach setInputChecked(longerAlertPopup)}
              onchange={updateSettingCheck}
            />
            <label for="longer-alert-popup" class="form-check-label"
              >Longer alert popup <span>{longerAlertPopup ? 'on' : 'off'}</span></label
            >
          </div>
          <!--
            `Fke`, slot 195 of the settings modal, const 159 — the THIRD entry point into
            `#alert-filter-modal`, and the one whose label differs from the other two.

            Nesting is the capture's and is easy to get wrong: the creation block reads
            `d(189,"div",17) … u()(), H(195, Fke, 3, 0, "button", 89), u()()`, so the button is a
            child of the `p-2 text-mode-box` box (const 52) and a SIBLING AFTER the `ml-5` div
            that holds the checkbox — not inside it.

            The three entry points do NOT share a label or a class, so none of them is a copy of
            another:
              header badge    `badge badge-danger ms-1 filtered-text`   " filtered"
              alerts toolbar  `btn btn-outline-light btn-sm m-1`        " Filter alerts"
              here            `btn btn-primary btn-sm mt-4 ml-4`        " Filter out alerts "

            The trailing space after "alerts" is in `v(2," Filter out alerts ")` and is kept.
          -->
          {#if alertFilterAvailable(modAlertFilterList)}
            <button
              data-bs-toggle="modal"
              data-bs-target="#alert-filter-modal"
              class="btn btn-primary btn-sm mt-4 ml-4"
              onclick={() => onopenalertfilter?.()}
            >
              <i class="fas fa-filter me-1"></i>{' '}Filter out alerts{' '}
            </button>
          {/if}
        </div>
      </div>

      <div
        id="user-chat-settings"
        role="tabpanel"
        aria-labelledby="user-chat-settings-tab"
        class={settingsTab === 'chat' ? 'tab-pane fade active show' : 'tab-pane fade'}
      >
        <div class="p-2 text-mode-box">
          <div id="chatTextMode" title="Chat Text Mode" class="pb-2">
            <i class="fas fa-file-alt"></i>
            <span class="pl-2">Text Mode:</span>
          </div>
          <div class="ml-5">
            <input
              type="radio"
              name="chat-text-mode"
              value="Chat Regular Mode"
              id="chat-regular-mode"
              aria-checked="true"
              class="form-check-input"
              {@attach setInputChecked(chatLogDisplayMode === 'r')}
              onchange={() => onDisplayModeChange('chat', 'r')}
            />
            <label for="chat-regular-mode" class="form-check-label">Regular Mode</label>
          </div>
          <div class="ml-5">
            <input
              type="radio"
              name="chat-text-mode"
              value="Chat Compact Mode"
              id="chat-compact-mode"
              class="form-check-input"
              {@attach setInputChecked(chatLogDisplayMode === 'c')}
              onchange={() => onDisplayModeChange('chat', 'c')}
            />
            <label for="chat-compact-mode" class="form-check-label">Compact Mode</label>
          </div>
        </div>

        <div class="p-2 text-mode-box">
          <div id="chatImagePreview" title="Chat Image Preview" class="pb-2">
            <i class="fas fa-image"></i>
            <span class="pl-2">Image Preview:</span>
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="small-image-preview"
              value="Small image preview"
              id="small-image-preview"
              class="form-check-input"
              {@attach setInputChecked(settingChecks['small-image-preview'])}
              onchange={updateSettingCheck}
            />
            <!--
              USM-18 — `v(218," Smaller image preview "), H(219,Cke,…)(220,Ske,…)` at byte 2,281,312,
              where `Cke` and `Ske` are `<span>on</span>` and `<span>off</span>`. Every other
              checkbox in this modal carries that pair and this one did not.

              The row's OTHER half is deliberately not reproduced. Upstream both the `checked`
              binding and the span gate are `smallImagePreview && defaultImagePreview`; here neither
              preference has a consumer, because the class the pair drives — `chat-uploaded-img-sm` —
              has no rule in any of the 52 stylesheets. `settings-preference-wiring-contract.test.ts`
              proves that and keeps the id out of `updateSettingCheck`'s table. Adding the conjunct
              would be ANDing two values nothing reads.
            -->
            <label for="small-image-preview" class="form-check-label"
              >Smaller image preview
              <span>{settingChecks['small-image-preview'] ? 'on' : 'off'}</span></label
            >
          </div>
        </div>

        <div class="p-2 text-mode-box">
          <div id="chatDoNotDisturb" title="chat Do not disturb" class="pb-2">
            <i class="fas fa-bell-slash"></i>
            <span class="pl-2">Do not disturb:</span>
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="chat-gif-donot-disturb"
              value="Chat Gif Do not disturb"
              id="chat-gif-donot-disturb"
              class="form-check-input"
              {@attach setInputChecked(settingChecks['chat-gif-donot-disturb'])}
              onchange={updateSettingCheck}
            />
            <label for="chat-gif-donot-disturb" class="form-check-label"
              >Gif <span>{settingChecks['chat-gif-donot-disturb'] ? 'on' : 'off'}</span></label
            >
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="chat-badges-donot-disturb"
              value="Chat Badges Do not disturb"
              id="chat-badges-donot-disturb"
              class="form-check-input"
              {@attach setInputChecked(settingChecks['chat-badges-donot-disturb'])}
              onchange={updateSettingCheck}
            />
            <label for="chat-badges-donot-disturb" class="form-check-label"
              >Badges <span>{settingChecks['chat-badges-donot-disturb'] ? 'on' : 'off'}</span
              ></label
            >
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="chat-popup-donot-disturb"
              value="Chat Popup Do not disturb"
              id="chat-popup-donot-disturb"
              class="form-check-input"
              {@attach setInputChecked(settingChecks['chat-popup-donot-disturb'])}
              onchange={updateSettingCheck}
            />
            <label for="chat-popup-donot-disturb" class="form-check-label"
              >Chat / PM Popup <span
                >{settingChecks['chat-popup-donot-disturb'] ? 'on' : 'off'}</span
              ></label
            >
            <hr />
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="settings-chat-donot-disturb"
              value="Chat Do not disturb"
              id="settings-chat-donot-disturb"
              class="form-check-input"
              {@attach setInputChecked(chatSoundOn)}
              onchange={updateSettingCheck}
            />
            <label for="settings-chat-donot-disturb" class="form-check-label"
              >Chat sound <span>{chatSoundOn ? 'on' : 'off'}</span></label
            >
          </div>
        </div>

        <div class="p-2 text-mode-box">
          <div id="extraChatColumn" title="Extra Chat Column" class="pb-2">
            <i class="fas fa-comment"></i>
            <span class="pl-2">Extra chat column:</span>
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="extra-chat-column"
              value="Extra Chat Column"
              id="extra-chat-column"
              class="form-check-input"
              {@attach setInputChecked(settingChecks['extra-chat-column'])}
              onchange={updateSettingCheck}
            />
            <label for="extra-chat-column" class="form-check-label"
              >Chat column <span>{settingChecks['extra-chat-column'] ? 'on' : 'off'}</span></label
            >
          </div>
        </div>

        <div class="p-2 text-mode-box">
          <div id="alwaysScrollToBottom" title="Always Scroll To Bottom" class="pb-2">
            <i class="fas fa-scroll"></i>
            <span class="pl-2">Always Scroll To Bottom:</span>
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="chat-always-scroll"
              value="Chat Always Scroll To Bottom"
              id="chat-always-scroll"
              class="form-check-input"
              {@attach setInputChecked(settingChecks['chat-always-scroll'])}
              onchange={updateSettingCheck}
            />
            <label for="chat-always-scroll" class="form-check-label"
              >Always scroll to bottom <span
                >{settingChecks['chat-always-scroll'] ? 'on' : 'off'}</span
              ></label
            >
          </div>
        </div>

        <div class="p-2 text-mode-box">
          <div id="trimChatlogFat" title="Reduce Chatlog Memory" class="pb-2">
            <i class="fas fa-trash"></i>
            <span class="pl-2">Reduce Chatlog Memory:</span>
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="chat-mem-clear"
              value="Reduce Chatlog Memory"
              id="chat-mem-clear"
              class="form-check-input"
              {@attach setInputChecked(settingChecks['chat-mem-clear'])}
              onchange={updateSettingCheck}
            />
            <label for="chat-mem-clear" class="form-check-label"
              >Reduce Chatlog Memory <span>{settingChecks['chat-mem-clear'] ? 'on' : 'off'}</span
              ></label
            >
          </div>
          <div class="ml-5">
            <input
              type="checkbox"
              name="visibility-change-enabled"
              value="Tab sleep optimization"
              id="visibility-change-enabled"
              class="form-check-input"
              {@attach setInputChecked(settingChecks['visibility-change-enabled'])}
              onchange={updateSettingCheck}
            />
            <label for="visibility-change-enabled" class="form-check-label"
              >Tab sleep optimization <span
                >{settingChecks['visibility-change-enabled'] ? 'on' : 'off'}</span
              ></label
            >
          </div>
        </div>

        <!--
          `O(290, isPresenter && !isLimitedPresenter ? 290 : -1)`, byte 2,288,249, and it was missing:
          the three radios rendered for everybody. Not an escalation — `chat-mode.remote.ts` calls
          `presenterRoom()` — but a control whose only possible effect for a member is a 403.
          `!isLimitedPresenter` carries its own weight: `giveMicScreen` makes a member a presenter at
          runtime, and disabling the room's chat is not part of what that grant hands over.
        -->
        {#if isPresenter && !isLimitedPresenter}
          <div class="p-2 text-mode-box">
            <div id="groupChatControl" title="Group Chat Control" class="pb-2">
              <i class="fas fa-comments"></i>
              <span class="pl-2">Group Chat Control:</span>
            </div>
            <div class="ml-5">
              <input
                type="radio"
                name="regular-group-chat"
                value="g"
                id="regular-group-chat"
                aria-checked={groupChatMode === 'g'}
                class="form-check-input"
                {@attach setInputChecked(groupChatMode === 'g')}
                onchange={() => requestSettingsChatMode('g')}
              />
              <label for="regular-group-chat" class="form-check-label">Regular Group Chat</label>
            </div>
            <div class="ml-5">
              <input
                type="radio"
                name="webinar-group-chat"
                value="p"
                id="webinar-group-chat"
                aria-checked={groupChatMode === 'p'}
                class="form-check-input"
                {@attach setInputChecked(groupChatMode === 'p')}
                onchange={() => requestSettingsChatMode('p')}
              />
              <label for="webinar-group-chat" class="form-check-label"
                >Webinar Mode (Regular users don't see each others posts)</label
              >
              <div class="form-text text-white">
                In this mode, presenters will see everyones questions/comments, but users will not
                see each others' chats.
              </div>
            </div>
            <div class="ml-5">
              <input
                type="radio"
                name="disabled-group-chat"
                value="d"
                id="disabled-group-chat"
                aria-checked={groupChatMode === 'd'}
                class="form-check-input"
                {@attach setInputChecked(groupChatMode === 'd')}
                onchange={() => requestSettingsChatMode('d')}
              />
              <label for="disabled-group-chat" class="form-check-label">Disable Group Chat</label>
            </div>
          </div>
        {/if}
      </div>

      <!-- USM-14, the pane half: `O(292, isPresenter && !isLimitedPresenter ? 292 : -1)`. -->
      {#if isPresenter && !isLimitedPresenter}
        <div
          id="presenter-settings"
          role="tabpanel"
          aria-labelledby="presenter-settings-tab"
          class={settingsTab === 'presenter' ? 'tab-pane fade active show' : 'tab-pane fade'}
        >
          <div class="p-2 text-mode-box">
            <div id="presenterDoNotDisturb" title="Presenter Do not disturb" class="pb-2">
              <i class="fas fa-bell-slash"></i>
              <span class="pl-2">Do not disturb:</span>
            </div>
            <div class="ml-5">
              <input
                type="checkbox"
                name="presenter-alert-donot-disturb"
                value="Presenter Alert Do not disturb"
                id="presenter-alert-donot-disturb"
                class="form-check-input"
                {@attach setInputChecked(settingChecks['presenter-alert-donot-disturb'])}
                onchange={updateSettingCheck}
              />
              <label for="presenter-alert-donot-disturb" class="form-check-label"
                >Alert sound
                <span>{settingChecks['presenter-alert-donot-disturb'] ? 'on' : 'off'}</span></label
              >
            </div>
            <div class="ml-5">
              <input
                type="checkbox"
                name="presenter-chat-donot-disturb"
                value="Presenter Chat Do not disturb"
                id="presenter-chat-donot-disturb"
                class="form-check-input"
                {@attach setInputChecked(settingChecks['presenter-chat-donot-disturb'])}
                onchange={updateSettingCheck}
              />
              <label for="presenter-chat-donot-disturb" class="form-check-label"
                >Chat sound
                <span>{settingChecks['presenter-chat-donot-disturb'] ? 'on' : 'off'}</span></label
              >
            </div>
          </div>

          <!-- USM-15, the presenter half. Same gate, same reason — see the overlay block above. -->
          {#if captionsAvailable}
            <div class="p-2 text-mode-box">
              <div
                id="presenterSpeechRecognition"
                title="Presenter Speech Recognition"
                class="pb-2"
              >
                <i class="fas fa-microphone-alt"></i>
                <span class="pl-2">Speech Recognition for Closed Captions:</span>
              </div>
              <div class="ml-5">
                <input
                  type="checkbox"
                  name="presenter-speech-recognition"
                  value="Presenter Speech Recognition"
                  id="presenter-speech-recognition"
                  class="form-check-input"
                  {@attach setInputChecked(settingChecks['presenter-speech-recognition'])}
                  onchange={updateSettingCheck}
                />
                <label for="presenter-speech-recognition" class="form-check-label"
                  ><span
                    >{settingChecks['presenter-speech-recognition'] ? 'Enabled' : 'Disabled'}</span
                  ></label
                >
              </div>
            </div>
          {/if}

          <div class="p-2 text-mode-box">
            <div id="presenterPushToTalk" title="Presenter Push To Talk" class="pb-2">
              <i class="fas fa-microphone-alt"></i>
              <span class="pl-2">Push To Talk:</span>
            </div>
            <div class="ml-5">
              <input
                type="checkbox"
                name="presenter-push-to-talk"
                value="Presenter Push To Talk"
                id="presenter-push-to-talk"
                class="form-check-input"
                {@attach setInputChecked(settingChecks['presenter-push-to-talk'])}
                onchange={updateSettingCheck}
              />
              <label for="presenter-push-to-talk" class="form-check-label"
                ><span>{settingChecks['presenter-push-to-talk'] ? 'Enabled' : 'Disabled'}</span
                ></label
              >
            </div>
          </div>

          <div class="p-2 text-mode-box">
            <div id="presenterEnableRTE" title="Presenter Enable RTE" class="pb-2">
              <i class="fas fa-edit"></i>
              <span class="pl-2">Enable RTE:</span>
            </div>
            <div class="ml-5">
              <input
                type="checkbox"
                name="presenter-enable-rte"
                value="Presenter Enable RTE"
                id="presenter-enable-rte"
                class="form-check-input"
                {@attach setInputChecked(settingChecks['presenter-enable-rte'])}
                onchange={updateSettingCheck}
              />
              <label for="presenter-enable-rte" class="form-check-label"
                ><span>{settingChecks['presenter-enable-rte'] ? 'Enabled' : 'Disabled'}</span
                ></label
              >
            </div>
          </div>

          <div class="p-2 text-mode-box">
            <div id="presenterFollowMyScreens" title="Presenter Follow My Screens" class="pb-2">
              <i class="fas fa-desktop"></i>
              <span class="pl-2">Make Users Follow My Screens:</span>
            </div>
            <div class="ml-5">
              <input
                type="checkbox"
                name="presenter-follow-my-screens"
                value="Presenter Follow My Screens"
                id="presenter-follow-my-screens"
                class="form-check-input"
                {@attach setInputChecked(settingChecks['presenter-follow-my-screens'])}
                onchange={updateSettingCheck}
              />
              <label for="presenter-follow-my-screens" class="form-check-label"
                ><span>{settingChecks['presenter-follow-my-screens'] ? 'Enabled' : 'Disabled'}</span
                ></label
              >
            </div>
          </div>

          <div class="p-2">
            <div id="presenterColorMode" title="Presenter Color Mode" class="pb-2">
              <i class="fas fa-wrench"></i>
              <span class="pl-2"
                >These colors will affect how ALL USERS see your messages and alerts</span
              >
            </div>
            <div class="ml-5">
              <input
                type="color"
                name="presenter-text-color"
                id="presenter-text-color"
                class="form-check-input"
                bind:value={presenterTextColor}
              />
              <label for="presenter-text-color" class="form-check-label ml-4 pl-2">Text Color</label
              >
            </div>
            <div class="ml-5">
              <input
                type="color"
                name="presenter-bg-color"
                id="presenter-bg-color"
                class="form-check-input"
                bind:value={presenterBackgroundColor}
              />
              <label for="presenter-bg-color" class="form-check-label ml-4 pl-2"
                >Background Color</label
              >
            </div>
          </div>
          <div class="text-right">
            <button type="button" class="btn btn-outline-danger mx-1" onclick={resetPresenterStyle}
              >Reset</button
            >
            <button type="button" class="btn btn-outline-light" onclick={savePresenterStyle}
              >Save changes</button
            >
          </div>
        </div>
      {/if}
    </div>
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}
        >Close</button
      >
    {/snippet}
  </Modal>
</app-user-settings-modal>
<app-av-settings-modal>
  <Modal
    id="av-settings-modal"
    open={name === 'av'}
    ariaLabelledby="av-settings-modal"
    title="Audio/Video Settings"
    {onclose}
    footerClass="text-center"
  >
    <ul id="userSettingsTab" role="tablist" class="nav nav-tabs">
      <li class="nav-item">
        <a
          id="user-audio-video-settings-tab"
          data-bs-toggle="tab"
          href="#user-audio-video-settings"
          role="tab"
          aria-controls="user-audio-video-settings"
          aria-selected={avSettingsTab === 'user'}
          class={avSettingsTab === 'user' ? 'nav-link active' : 'nav-link'}
          onclick={(event) => {
            event.preventDefault();
            avSettingsTab = 'user';
          }}>User Settings</a
        >
      </li>
      {#if isPresenter}
        <li class="nav-item">
          <a
            id="presenter-audio-video-settings-tab"
            data-bs-toggle="tab"
            href="#presenter-audio-video-settings"
            role="tab"
            aria-controls="presenter-audio-video-settings"
            aria-selected={avSettingsTab === 'presenter'}
            class={avSettingsTab === 'presenter' ? 'nav-link active' : 'nav-link'}
            onclick={(event) => {
              event.preventDefault();
              avSettingsTab = 'presenter';
            }}>Presenter Settings</a
          >
        </li>
      {/if}
    </ul>
    <div id="userSettingsTabContent" class="tab-content">
      <div
        id="user-audio-video-settings"
        role="tabpanel"
        aria-labelledby="user-audio-video-settings-tab"
        class={avSettingsTab === 'user' ? 'tab-pane fade show active' : 'tab-pane fade'}
      >
        <nav class="navbar w-100 h-100">
          <ul class="navbar-nav small w-100 h-100">
            <li class="nav-item">
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_missing_attribute -->
              <!--
                The title FLIPS here and is static upstream — const 13 of `app-av-settings-modal`
                is `["title","Disable Video",1,"nav-link",3,"click"]`, so the reference still reads
                "Disable Video" while video is already off. A tooltip that contradicts its own
                label is an upstream slip, and reproducing it would only mislead a screen reader.
                Same call already taken for `aria-selected` in `ScreenTabs.svelte`: a captured value
                is reproduced unless reproducing it makes the control worse to use.
              -->
              <a
                title={saveData ? 'Enable Video' : 'Disable Video'}
                class="nav-link"
                onclick={() => onSaveDataChange(!saveData)}
                onkeydown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    onSaveDataChange(!saveData);
                  }
                }}
              >
                <i class="fas fa-desktop"></i>
                <span class="pl-2">
                  {saveData ? 'Enable Video ' : 'Disable Video'}
                  {#if !saveData}
                    <span class="saves-bandwidth">(saves bandwidth)</span>
                  {/if}
                </span>
              </a>
            </li>
            <li class="nav-item">
              <!-- svelte-ignore a11y_missing_attribute -->
              <a title="Choose Speakers" class="nav-link">
                <div class="form-group d-flex justify-content-between align-items-end">
                  <div class="w-75 mr-2">
                    <label for="av-speakers-device">Speakers:</label>
                    <select id="av-speakers-device" name="avSpeakersDevice" class="form-control">
                      <option>Default - External Headphones</option>
                      <option>Default - External Headphones 2</option>
                    </select>
                  </div>
                  <div class="w-25">
                    <button type="button" class="btn btn-outline-light">
                      <i class="fas fa-volume-up mr-2"></i>Test
                    </button>
                  </div>
                </div>
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div
        id="presenter-audio-video-settings"
        role="tabpanel"
        aria-labelledby="presenter-audio-video-settings-tab"
        class={avSettingsTab === 'presenter' ? 'tab-pane fade show active' : 'tab-pane fade'}
      >
        <div class="form-group">
          <label for="presenter-audio-deviceList">Audio device (input):</label>
          <select
            id="presenter-audio-deviceList"
            name="presenterAudioDevice"
            aria-label="Audio device (input)"
            class="form-select"
          ></select>
        </div>
        <div class="form-group">
          <label for="presenter-video-deviceList">Video device (input):</label>
          <select
            id="presenter-video-deviceList"
            name="presenterVideoDevice"
            aria-label="Video device (input)"
            class="form-select"
          ></select>
        </div>
        <button type="button" class="btn btn-primary">Change Devices</button>
      </div>
    </div>
    {#snippet footer()}
      <button type="submit" class="btn btn-success">Save</button>
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal>
</app-av-settings-modal>
<app-debug-log-modal>
  <Modal
    id="debug-log-modal"
    open={name === 'debug'}
    ariaLabelledby="user-details"
    title={debugLog ? `Debug Log — ${debugLog.fromName}` : 'Debug Log'}
    {onclose}
    titleClass="modal-title"
    titleTag="h3"
    dialogClass="modal-lg"
    dialogStyle="overflow-y: initial !important;"
    bodyStyle="max-height: 77vh; overflow-y: scroll;"
    footerOutsideContent
  >
    <div class="row">
      <!--
        `debug-area` is the CAPTURED class and it had no consumer until 2026-08-29: `app.css:2443`
        and `:3080` have carried `.debug-area { height: 870px; resize: none; background:
        var(--debug-log-bg) }` and its mobile override the whole time, matching nothing in the
        markup. Two CSS rules for a class no element wore is the same defect as a class with no CSS,
        and building the feature is what closes it.

        The value is the SERVER's, not the replying member's — see `routes/debug-log.remote.ts`. It
        is bound rather than attached because it changes: a presenter can ask a second member without
        closing the modal, and a one-shot attachment would leave the first member's log on screen
        under the second one's name.
      -->
      <textarea
        id="debugLogModalTxt"
        rows="1000"
        {...{ readonly: 'readonly' } as Record<string, string>}
        {@attach setReadonlyAttribute}
        class="form-control debug-area"
        style="min-width: 100%;"
        value={debugLog?.log ?? ''}></textarea>
    </div>
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal>
</app-debug-log-modal>
<app-post-alert-modal>
  <PostAlertModal
    open={name === 'alert'}
    tab={alertTab}
    {onclose}
    ontab={onAlertTab}
    onalert={onAlert}
    onconfirm={onConfirm}
    onpost={onPostAlert}
    onpastepost={onPastePostAlert}
    {stickyNonTradeAlert}
    {schedulerAvailable}
    {alertLabels}
  />
</app-post-alert-modal>
<app-poll-modal id="pollModalCompHolder" class="pollModalHolder" bind:this={pollPanelHost}>
  <PollPanel
    hostElement={pollPanelHost}
    open={name === 'poll'}
    openMode={pollOpenMode}
    restoreToken={pollRestoreToken}
    {currentUser}
    {activePoll}
    {savedPolls}
    {onclose}
    onminimize={onPollMinimize}
    onalert={onAlert}
    onconfirm={onConfirm}
    onsave={onPollSave}
    ondelete={onPollDelete}
    onsend={onPollSend}
    onanswer={onPollAnswer}
    onpostresults={onPollPostResults}
    onend={onPollEnd}
  />
</app-poll-modal>
<LogArchiveModals {name} {onclose} {onAlert} {onConfirm} />
<app-session-control-modal>
  <Modal
    id="session-control-modal"
    open={name === 'session'}
    ariaLabelledby="session-control"
    title="Session Control"
    titleId="session-control"
    titleClass="modal-title"
    dialogClass="modal-lg"
    {onclose}
  >
    <!--
      ── SC-17 AND SC-14 — WHO THIS MODAL IS FOR, DECIDED HERE AND NOT ONLY AT THE DOOR ──────────

      ```js
      O(8, isPresenter ? 8 : -1)
      O(9, !isPresenter && user.hasMic ? 9 : -1)      // byte 2,184,295
      ```

      Two bodies upstream, and this component had ONE — the presenter's — with no role condition
      anywhere in it. Nothing was exposed in practice, because both entry points sit inside
      `RoomNavbar`'s `{#if isPresenter}`; it was one navbar edit away from rendering Hard Reset and
      Lock Session to a member. Every one of those buttons is server-authorised, so this is
      defence-in-depth rather than an escalation being closed — and it is exactly the kind of
      second check this repository asks for, because the navbar edit that would have exposed it is
      the one made directly below for SC-14.

      `hasMic` is the DURABLE permission (one of the five `permissions_json` keys, ticked in this
      modal's own user-info pane) and NOT `isLimitedPresenter`. The reference is explicit about the
      difference: `giveMicScreen` assigns
      `globals.user.isPresenter = globals.isLimitedPresenter = globals.isPresenter = e.give`, so
      somebody handed mic and screen at runtime becomes a presenter and takes the FIRST arm. This
      arm is for a member whose membership carries the mic permission without the promotion.

      `Done` stays outside both, which is the reference's shape and the only sensible one: a body
      that renders nothing must still be closable.
    -->
    {#if isPresenter}
      <ul id="myTab" role="tablist" class="nav nav-tabs">
        {#each [['reset-session', 'Session Control / Reset'], ['close-session', 'Close Session'], ['lock-session', 'Lock Session'], ['av-device-selection', 'A/V Device Selection'], ['streaming-selection', 'Streaming'], ['session-history', 'Session History'], ['webinar-tools', 'Webinar Tools']] as [tabId, label] (tabId)}
          <li role="presentation" class="nav-item">
            <!-- svelte-ignore a11y_interactive_supports_focus -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_missing_attribute -->
            <a
              id="{tabId}-tab"
              data-bs-toggle="tab"
              data-bs-target="#{tabId}"
              role="tab"
              aria-controls={tabId}
              aria-selected={sessionControlTab === tabId}
              class={['nav-link', { active: sessionControlTab === tabId }]}
              onclick={(event) => {
                event.preventDefault();
                sessionControlTab = tabId as typeof sessionControlTab;
              }}>{label}</a
            >
          </li>
        {/each}
      </ul>
      <div id="myTabContent" class="tab-content">
        <div
          id="reset-session"
          role="tabpanel"
          aria-labelledby="reset-session-tab"
          class={[
            'tab-pane fade',
            {
              show: sessionControlTab === 'reset-session',
              active: sessionControlTab === 'reset-session'
            }
          ]}
        >
          <div class="row mt-4">
            <div class="col border-right pr-4">
              <button
                type="button"
                class="btn btn-outline-light mr-2"
                onclick={() => onUserAction('session-reload-config', targetUser)}
              >
                Reload Session Config
              </button>
              <h5 class="small mt-2">
                Reloads the session configuration, useful if something changed and you want it to
                take effect.
              </h5>
              <br />
              <button
                type="button"
                class="btn btn-outline-light mr-2"
                onclick={() => onUserAction('session-refresh-roster', targetUser)}
              >
                Refresh Roster &amp; Count (User List)
              </button>
              <h5 class="small mt-2">
                This clears the user list and forces all "stale" connections out.
                <strong style="text-decoration: underline;"
                  >It will take up to 1/2 minute for changes to take effect</strong
                >
              </h5>
              <hr />
              <button
                type="button"
                class="btn btn-primary mr-2"
                onclick={() => onUserAction('session-soft-reset', targetUser)}
              >
                Soft Reset Session
              </button>
              <h5 class="small mt-2">
                Use this before a hard reset. Resets the media state of the room, Makes all users
                reconnect to the media servers gently. Works Well... Swap to your backup media
                servers if the primary are not working, and vice versa.
              </h5>
              <br /><br />
              <button
                type="button"
                class="btn btn-danger mr-2"
                onclick={() => onUserAction('session-hard-reset', targetUser)}
              >
                Hard Reset/ All Reload
              </button>
              <h5 class="small mt-2">
                Hard Resetting forces everyone to reload the session and page.
              </h5>
              <br />
              <button
                type="button"
                class="btn btn-danger mr-2"
                onclick={() => onUserAction('session-hard-reset-revoke', targetUser)}
              >
                Hard Reset and Revoke Tokens
              </button>
              <br />
              <h5 class="small mt-2">
                Hard Resetting forces everyone to reload the session and page, also revokes session
                tokens, forcing users to log in again.
              </h5>
            </div>
            <div class="col pl-4">
              <h3><i class="fas fa-comments"></i> Group Chat Control</h3>
              <div class="custom-control custom-radio my-2">
                <input
                  type="radio"
                  id="customRadio1"
                  value="g"
                  name="customRadio"
                  class="custom-control-input"
                  {@attach setInputChecked(groupChatMode === 'g')}
                  onchange={() => requestSessionChatMode('g')}
                />
                <label for="customRadio1" class="custom-control-label">Regular Group Chat</label>
              </div>
              <div class="custom-control custom-radio my-2">
                <input
                  type="radio"
                  id="customRadio2"
                  value="p"
                  name="customRadio"
                  class="custom-control-input"
                  {@attach setInputChecked(groupChatMode === 'p')}
                  onchange={() => requestSessionChatMode('p')}
                />
                <label for="customRadio2" class="custom-control-label"
                  >Webinar Mode (Regular users don't see each others posts)</label
                >
                <p>
                  In this mode, presenters will see everyones questions/comments, but users will not
                  see each others' chats.
                </p>
              </div>
              <div class="custom-control custom-radio my-2">
                <input
                  type="radio"
                  id="customRadio3"
                  value="d"
                  name="customRadio"
                  class="custom-control-input"
                  {@attach setInputChecked(groupChatMode === 'd')}
                  onchange={() => requestSessionChatMode('d')}
                />
                <label for="customRadio3" class="custom-control-label">Disable Group Chat</label>
              </div>
            </div>
          </div>
        </div>
        <CloseSessionPane
          active={sessionControlTab === 'close-session'}
          {closedMessage}
          onOpenSession={() => onUserAction('session-open', targetUser)}
          onSave={onSaveCloseMessage}
        />
        <div
          id="lock-session"
          role="tabpanel"
          aria-labelledby="lock-session-tab"
          class={[
            'tab-pane fade',
            {
              show: sessionControlTab === 'lock-session',
              active: sessionControlTab === 'lock-session'
            }
          ]}
        >
          <button
            type="button"
            class="btn btn-warning m-2"
            onclick={() => onUserAction('session-lock', targetUser)}
          >
            Lock Session
          </button>
          <button
            type="button"
            class="btn btn-danger m-2"
            onclick={() => onUserAction('session-lock-kick', targetUser)}
          >
            Lock Session &amp; kick users.
          </button>
          <button
            type="button"
            class="btn btn-success m-2"
            onclick={() => onUserAction('session-unlock', targetUser)}
          >
            Unlock Session
          </button>
          <h4 class="small mt-2">
            Lock Session? If locked only presenters/admins will be able to use the room. Regular
            users will not be allowed to enter until you unlock it.
          </h4>
        </div>
        <div
          id="av-device-selection"
          role="tabpanel"
          aria-labelledby="av-device-selection-tab"
          class={[
            'tab-pane fade',
            {
              show: sessionControlTab === 'av-device-selection',
              active: sessionControlTab === 'av-device-selection'
            }
          ]}
        >
          <AvDevicePane {capture} {onPreferenceChange} />
        </div>
        <div
          id="streaming-selection"
          role="tabpanel"
          aria-labelledby="streaming-selection-tab"
          class={[
            'tab-pane fade',
            {
              show: sessionControlTab === 'streaming-selection',
              active: sessionControlTab === 'streaming-selection'
            }
          ]}
        >
          <ul id="streaming-settings-tab" role="tablist" class="nav nav-tabs">
            {#each [['obs-streaming', 'Stream RTMP/WHIP/OBS'], ['restream', 'Restream'], ['stream-player', 'Stream Player']] as [tabId, label] (tabId)}
              <li class="nav-item">
                <a
                  id="{tabId}-tab"
                  data-bs-toggle="tab"
                  href="#{tabId}"
                  role="tab"
                  aria-controls={tabId}
                  aria-selected={streamingControlTab === tabId}
                  class={['nav-link', { active: streamingControlTab === tabId }]}
                  onclick={(event) => {
                    event.preventDefault();
                    streamingControlTab = tabId as typeof streamingControlTab;
                  }}>{label}</a
                >
              </li>
            {/each}
          </ul>
          <div id="streaming-settings-tabContent" class="tab-content">
            <div
              id="stream-player"
              role="tabpanel"
              aria-labelledby="stream-player-tab"
              class={[
                'tab-pane fade',
                {
                  show: streamingControlTab === 'stream-player',
                  active: streamingControlTab === 'stream-player'
                }
              ]}
            >
              <p>
                The stream player tool allows you to create a link you can share with others to
                watch your stream. This is useful if you want to share your stream with others who
                are not logged in to the trading room. They will just see the screenshare sections
                (no chat/notes/files/etc)
              </p>
              <p>
                Stream Player enabled:
                <span style:color="red">false</span>
              </p>
              <!--
              ── THESE TWO BUTTONS ARE INERT, AND SAYING SO IS THE FIX ────────────────────────────

              They used to flip a local `streamPlayerEnabled` and write
              `onPreferenceChange('streamingPlayerEnabled', true | false)` — a key in THIS
              presenter's own settings blob, read by nothing anywhere in the repository. A
              room-level presenter act modelled as a per-user preference, which is the same defect
              `chat-mode.ts` and `presenter-colors.ts` each record; the label went green and
              nothing else in the world changed.

              Wiring them was measured and REFUSED rather than attempted, because what the
              reference does cannot be reproduced from anything held here:

                getPlayerLink() { let i = yield invokeAdminCmd("streamStatus");
                                  this.streamingPlayerEnabled = i.rc.enablePlayer;
                                  this.streamingLinkPlayer = i.rc.playerURL }   (byte 2,170,505)

              `playerURL` arrives FROM THE SERVER. The client composes nothing, and that server is
              not in the capture. So the feature is a public, unauthenticated page that renders one
              room's screenshares to whoever holds a link — which needs an anonymous media grant,
              and minting one is an authorization decision this repository's own standard forbids
              inventing: every authority decision is made on the server from data the server owns,
              and there is no such data here yet.

              Disabled with the reason on screen, rather than removed: the reference draws this
              pane, and a presenter who has been told the tool is unavailable is better served than
              one who cannot find where it went. The blocker is recorded in `TODO.md` and against
              `SC-04` / `SC-05` in the surface audit. `streamingPlayerEnabled` joins
              `dead-preference-keys.ts` so the copies already written are pruned.
            -->
              <div class="mt-4">
                <button class="btn btn-outline-primary btn-sm m-1" disabled>
                  <i class="fas fa-desktop"></i> Enable Stream Player
                </button>
                <button class="btn btn-outline-danger btn-sm m-1" disabled>
                  <i class="fas fa-stop"></i> Disable Stream Player
                </button>
              </div>
              <div class="alert alert-info m-2">
                The stream player is not available in this deployment: it needs a public playback
                page, and there is no server here that issues one. The buttons above are shown
                because the tool exists upstream, and are disabled because pressing them would
                change nothing.
              </div>
            </div>
            <div
              id="obs-streaming"
              role="tabpanel"
              aria-labelledby="obs-streaming-tab"
              class={[
                'tab-pane fade',
                {
                  show: streamingControlTab === 'obs-streaming',
                  active: streamingControlTab === 'obs-streaming'
                }
              ]}
            >
              <div class="form-group m-4 w-100 text-center">
                <div class="form-check form-check-inline">
                  <input
                    type="radio"
                    name="streaming-rtmp"
                    id="streaming-rtmp"
                    value="RTMP"
                    required
                    class="form-check-input"
                    bind:group={streamingProtocol}
                    onchange={() => onPreferenceChange('streamingType', streamingProtocol)}
                  />
                  <label for="streaming-rtmp" class="form-check-label font-weight-bold">
                    Rtmp
                  </label>
                </div>
                <div class="form-check form-check-inline">
                  <input
                    type="radio"
                    name="streaming-whip"
                    id="streaming-whip"
                    value="WHIP"
                    required
                    class="form-check-input"
                    bind:group={streamingProtocol}
                    onchange={() => onPreferenceChange('streamingType', streamingProtocol)}
                  />
                  <label for="streaming-whip" class="form-check-label font-weight-bold">
                    Whip
                  </label>
                </div>
              </div>
              <!--
              The RTMP half — the reference's `_De`, which renders only when `streamingType` is
              RTMP (`O(153, "RTMP" === e.streamingType ? 153 : -1)`, byte 2152300). The intro
              sentence lives INSIDE that conditional upstream, typo `streraming` and all, so it
              moves here with it.
            -->
              {#if streamingProtocol === 'RTMP'}
                <p>
                  If you want to stream directly from OBS into this room, you can use the following
                  interface to get your WHIP streraming link.
                </p>
                <!-- `gDe`, gated on `streamingLinkRTMP` being non-empty. No link, no block. -->
                {#if streamingLinkRTMP}
                  <div class="m-2">
                    <div class="d-flex align-items-center">
                      <label for="streaming-link-rtmp" class="form-label me-2">
                        Streaming link:
                      </label>
                      <button
                        class="btn btn-outline-info btn-sm m-1"
                        onclick={() => copyIngestField(streamingLinkRtmpNode)}
                      >
                        <i class="fas fa-copy"></i> Copy
                      </button>
                      <button
                        class="btn btn-outline-info btn-sm m-1"
                        disabled={ingestLoading}
                        onclick={getNewToken}
                      >
                        <i class="fas fa-sync"></i> New Link
                      </button>
                    </div>
                    <textarea
                      bind:this={streamingLinkRtmpNode}
                      id="streaming-link-rtmp"
                      readonly
                      class="form-control border border-danger"
                      style="height: 100px;"
                      value={streamingLinkRTMP}></textarea>
                    <p>
                      IN OBS or any RTMP compatible broadcaster enter the above link. Replace
                      <strong>"name="</strong> with your desired name
                    </p>
                    <p>
                      Note: you can re-stream this incoming stream to another rtmp destination,
                      click
                      <!--
                      The reference makes this a clickable `<strong>` (consts index 112:
                      `[1,"text-primary","fw-bold","restream-link",3,"click"]`). A `<button>`
                      carries the SAME three classes instead, which is a deliberate and visually
                      identical substitution: `fw-bold` already supplies the weight `<strong>` gave
                      it, `text-primary` the colour, and the captured `.restream-link:hover` rule
                      the underline and pointer. What changes is that a control which was
                      mouse-only becomes focusable, announced, and operable by keyboard — Svelte
                      refuses `role="button"` on a `<strong>`, and it is right to.

                      The button chrome is stripped by `#session-control-modal button.restream-link`
                      in `app.css`, beside the captured hover rule it belongs with.
                    -->
                      <button
                        type="button"
                        class="text-primary fw-bold restream-link"
                        onclick={openRestreamTab}>here</button
                      > to set that up.
                    </p>
                  </div>
                  <hr />
                {/if}
              {/if}

              <!--
              The WHIP half — the reference's `vDe`, `O(154, "WHIP" === e.streamingType ? 154 : -1)`.

              Its `bDe` child (Start/Stop WHIP Streaming) is deliberately NOT reproduced. Upstream it
              renders only when `useMTX` is FALSE — it belongs to a browser-publishes-WHIP path that
              exists when MediaMTX is switched off. This deployment's OBS design IS MediaMTX, so
              those buttons never render in the reference for this configuration either; building
              them here would be two controls calling nothing.
            -->
              {#if streamingProtocol === 'WHIP'}
                <div class="mt-1">
                  <div class="m-2">
                    <div class="d-flex align-items-center">
                      <label for="streaming-link" class="form-label me-2"> Streaming link: </label>
                      <button
                        class="btn btn-outline-info btn-sm m-1"
                        onclick={() => copyIngestField(streamingLinkNode)}
                      >
                        <i class="fas fa-copy"></i> Copy
                      </button>
                    </div>
                    <div class="mb-2">
                      <label for="streaming-link">Streaming Link</label>
                      <textarea
                        bind:this={streamingLinkNode}
                        id="streaming-link"
                        readonly
                        rows="2"
                        class="form-control border border-danger"
                        style="height: auto; overflow-y: scroll;"
                        value={streamingLink}></textarea>
                    </div>
                    <div class="mb-2">
                      <label for="stream-whip-key">Bearer</label>
                      <button
                        class="btn btn-outline-info btn-sm m-1"
                        onclick={() => copyIngestField(streamWhipKeyNode)}
                      >
                        <i class="fas fa-copy"></i> Copy
                      </button>
                      <textarea
                        bind:this={streamWhipKeyNode}
                        id="stream-whip-key"
                        readonly
                        rows="2"
                        class="form-control border border-danger"
                        style="height: auto; overflow-y: scroll;"
                        value={streamKey}></textarea>
                    </div>
                    <p>
                      Note: you can re-stream this incoming stream to another rtmp destination,
                      click
                      <!--
                      The reference makes this a clickable `<strong>` (consts index 112:
                      `[1,"text-primary","fw-bold","restream-link",3,"click"]`). A `<button>`
                      carries the SAME three classes instead, which is a deliberate and visually
                      identical substitution: `fw-bold` already supplies the weight `<strong>` gave
                      it, `text-primary` the colour, and the captured `.restream-link:hover` rule
                      the underline and pointer. What changes is that a control which was
                      mouse-only becomes focusable, announced, and operable by keyboard — Svelte
                      refuses `role="button"` on a `<strong>`, and it is right to.

                      The button chrome is stripped by `#session-control-modal button.restream-link`
                      in `app.css`, beside the captured hover rule it belongs with.
                    -->
                      <button
                        type="button"
                        class="text-primary fw-bold restream-link"
                        onclick={openRestreamTab}>here</button
                      > to set that up.
                    </p>
                    <p>
                      IN OBS, under streaming, select "WHIP", and enter the above link. Replace
                      <strong>"name="</strong> with your desired name
                    </p>
                  </div>
                </div>
              {/if}

              <!--
              Not in the reference, and deliberately added: it has no state in which the ingest
              server is missing, because its `streamServerMTX` is always populated. Ours can be
              unset, and the repository's rule is that an absent value is REPORTED rather than
              filled in — the alternative is a panel that composes `http://:8889/…` and looks like
              a working link.
            -->
              {#if ingestError}
                <div class="alert alert-danger m-2">{ingestError}</div>
              {:else if ingest && !ingest.configured}
                <div class="alert alert-info m-2">
                  No ingest server is configured for this deployment, so there is no link to publish
                  to yet. Your stream key has still been issued.
                </div>
              {/if}
            </div>
            <RestreamPane
              active={streamingControlTab === 'restream'}
              {restreamUrl}
              {onSaveRestreamUrl}
              oninvalid={() => onUserAction('invalid-restream-link', targetUser)}
            />
          </div>
        </div>
        <SessionHistoryPane active={sessionControlTab === 'session-history'} />
        <div
          id="webinar-tools"
          role="tabpanel"
          aria-labelledby="webinar-tools-tab"
          class={[
            'tab-pane fade',
            {
              show: sessionControlTab === 'webinar-tools',
              active: sessionControlTab === 'webinar-tools'
            }
          ]}
        >
          <div class="p-4">
            <button
              type="button"
              class="btn btn-outline-info m-2"
              onclick={() => onUserAction('session-send-video', targetUser)}
            >
              <i class="fas fa-video me-1"></i> Send video to room
            </button>
            <button
              type="button"
              class="btn btn-outline-info m-2"
              onclick={() => onUserAction('session-send-sales-image', targetUser)}
            >
              <i class="fas fa-image me-1"></i> Send sales image to chat
            </button>
            <button
              type="button"
              class="btn btn-outline-info m-2"
              onclick={() => onUserAction('session-send-users-url', targetUser)}
            >
              <i class="fas fa-link me-1"></i> Send users to URL
            </button>
          </div>
        </div>
      </div>
    {:else if hasMic}
      <!--
        ── SC-14 — THE NON-PRESENTER BODY ────────────────────────────────────────────────────────

        ```js
        function LDe(t,n){ d(0,"form",131,0), x("ngSubmit", () => submitNewDevices(form)),
            H(2,PDe,…)(3,RDe,…)(4,ODe,…)(5,NDe,…), d(6,"button",132), v(7," Change Devices ") …
            …then the three processing checkboxes, consts 55 / 57 / 59 }   // byte 2,156,909
        131 [1,"mt-2",3,"ngSubmit"]   132 ["type","submit",1,"btn","btn-primary"]
        133 ["id","audio-deviceList","name","audioID", … 1,"form-select"]
        134 ["id","video-deviceList","name","videoID", … 1,"form-select"]
        ```

        What that form contains is: the two device selects, their two "Please connect …" fallbacks,
        and the same three processing checkboxes the presenter's pane has. `AvDevicePane` already
        IS all six of those, so it is rendered rather than transcribed a second time.

        ## TWO recorded divergences, and the second is forced by one of ours

        1. **It applies on CHANGE, not on submit.** `submitNewDevices(form)` reads
           `form.value.audioID` / `videoID` and writes `audioDeviceID` / `videoDeviceID` — the same
           two preference keys the presenter's selects write, only later. Keeping the submit button
           would mean one modal in which the identical control behaves two different ways depending
           on who opened it, which is worse than the divergence.

        2. **It has a Refresh button, which the reference's non-presenter form does not.** That is
           forced by SC-02's divergence: this room deliberately does NOT enumerate devices when the
           pane opens, because `loadDevices` calls `getUserMedia` and opening a settings pane must
           not prompt somebody for their camera. Upstream enumerates in `ngAfterViewInit`, so its
           form arrives populated. Without Refresh, a member would see "Please connect audio
           devices." forever and have no way to answer it — a form that cannot be filled in.
      -->
      <AvDevicePane {capture} {onPreferenceChange} />
    {/if}
    {#snippet footer()}
      <button type="button" class="btn btn-success btn-block" onclick={onclose}>Done</button>
    {/snippet}
  </Modal>
</app-session-control-modal>
<app-mobile-app-info-modal>
  <Modal
    id="mobileAppInfoModal"
    open={name === 'mobile'}
    ariaLabelledby="mobileAppInfoLabel"
    rootRole={null}
    dialogRole={null}
    title="Download our mobile apps"
    titleId="mobileAppInfoLabel"
    titleClass="modal-title"
    {onclose}
  >
    <!--
      The shell was here and none of the behaviour was: two hardcoded Pro Trading Room v3 store
      links, a `Pin Code` permanently reading `N/A`, and no `hideMobileCredentials` gate. It looked
      finished and did nothing.

      The captured defaults are v3's listings (`com.bellesoft.protradingroomv3` / `id1587924329`).
      This build is TradingRoom v1, whose only address is its own site — there are no v1 store
      listings to link, and inventing package ids would put two dead links behind two real badges.
      `customMobileAppEnabled` still replaces both, exactly as the capture does.
    -->
    <div class="d-flex align-items-center justify-content-evenly m-3 mb-4">
      <a href={mobileAndroidHref} target="_blank" rel="noopener noreferrer" type="button">
        <img
          class="google-badge"
          src="/assets/images/google-play-badge.png"
          alt="Google Play Badge"
          loading="lazy"
        />
      </a>
      <a href={mobileIosHref} target="_blank" rel="noopener noreferrer" type="button">
        <img src="/assets/images/iosAppStore.svg" alt="App Store Badge" loading="lazy" />
      </a>
    </div>
    <!-- `O(13, sessData.hideMobileCredentials ? -1 : 13)` -->
    {#if !hideMobileCredentials}
      <div class="mt-2">
        <hr />
        <h5 class="my-4">To login to the app use the following credentials:</h5>
        <div class="mt-2"><strong>Email:</strong><span>{currentUser.email}</span></div>
        <!--
          `mobilePin`, from the server's `getMyMobilePin`. `N/A` is the captured placeholder until
          it answers, not a spinner the capture has no equivalent for.
        -->
        <div class="mt-2"><strong>Pin Code:</strong><span>{mobilePin}</span></div>
      </div>
    {/if}
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal>
</app-mobile-app-info-modal>
<app-reply-modal>
  <Modal
    id="replyModal"
    open={name === 'reply'}
    ariaLabelledby="replyLabel"
    rootRole={null}
    dialogRole={null}
    title=":"
    titleId="replyLabel"
    titleClass="modal-title"
    {onclose}
  >
    {#snippet header()}
      <h5 id="replyLabel" class="modal-title">
        <span class="do-private-reply"
          ><strong>{targetMessage?.senderName ?? ''}:</strong>
          <div>{targetMessage?.body ?? ''}</div></span
        >
      </h5>
    {/snippet}
    <div class="flex-fill d-flex mx-0">
      <div class="px-0 flex-fill">
        <textarea
          name="txt-area"
          id="textAreaReplyTxt"
          rows="1"
          spellcheck="true"
          placeholder="Type your message here.."
          class="txt-area form-control border-0"
          bind:value={replyComposer}
          onkeydown={handleReplyKeydown}></textarea>
      </div>
      <div
        class="justify-content-center d-flex flex-row align-items-center justify-content-center p-0 m-0 text-center textAreaBtnsCol"
      >
        <span
          {...{
            placement: 'auto',
            container: 'body',
            autoclose: 'outside',
            popoverclass: 'popOverDiv'
          } as Record<string, string>}
          class="textAreaBtns"
          aria-describedby={replyEmojiOpen ? 'ngb-popover-reply-emoji' : undefined}
          onclick={() => (replyEmojiOpen = !replyEmojiOpen)}
        >
          <i
            {...{ placement: 'left', ngbtooltip: 'Add Emojis' } as Record<string, string>}
            {@attach ngbTooltip}
            class="far fa-smile"
          ></i>
        </span>
        {#if replyEmojiOpen}
          <EmojiPicker
            popoverId="ngb-popover-reply-emoji"
            onselect={(glyph) => (replyComposer += glyph)}
          />
        {/if}
        <span class="textAreaBtns">
          <i
            {...{ ngbtooltip: 'Upload an Image', placement: 'left' } as Record<string, string>}
            {@attach ngbTooltip}
            class="fas fa-image"
          ></i>
        </span>
      </div>
    </div>
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal>
</app-reply-modal>
<AlertQaModal
  open={name === 'qa'}
  {targetMessage}
  {alertQuestions}
  {messageChrome}
  {presenterColors}
  displayMode={alertsDisplayMode}
  {isPresenter}
  {onclose}
  {onQuestionSend}
  {onQaAction}
/>
<app-muted-users-modal>
  <Modal
    id="mutedUsersModal"
    open={name === 'muted'}
    closedAriaHidden
    ariaLabelledby="mutedUsersModalLabel"
    rootRole={null}
    dialogRole={null}
    title="Muted Chat Users"
    titleId="mutedUsersModalLabel"
    titleClass="modal-title"
    {onclose}
  >
    {#if mutedUsersList.length === 0}
      <div class="text-center">You don't have any muted/ignored users.</div>
    {:else}
      <ul class="list-group list-group-flush">
        {#each mutedUsersList as user (user.emailHash)}
          <li class="list-group-item d-flex justify-content-between align-items-start">
            <div class="fw-bold">
              <!--
                `s=30` IS the size: gravatar returns a square of exactly the pixel size asked for,
                so this box is read off the URL below rather than chosen. A custom `user.pic` of
                another shape letterboxes inside it instead of reflowing the row, which is the right
                trade for a list of dozens. `SwingAlertsPane.svelte` does the same for its sender.
              -->
              <img
                src={user.pic || `https://secure.gravatar.com/avatar/${user.emailHash}?d=mm&s=30`}
                alt={user.nick}
                width="30"
                height="30"
              />
              {user.nick}
            </div>
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <button
              class="btn btn-outline-danger btn-sm"
              onclick={() => onManagedUserRemoval('mutedUsers', user)}
            >
              <i class="fas fa-trash"></i>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-primary" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal>
</app-muted-users-modal>
<app-followed-users-modal>
  <Modal
    id="followedUsersModal"
    open={name === 'followed'}
    closedAriaHidden
    ariaLabelledby="followedUsersModalLabel"
    rootRole={null}
    dialogRole={null}
    title="Followed Chat Users"
    titleId="followedUsersModalLabel"
    titleClass="modal-title"
    {onclose}
  >
    {#if followedUsersList.length === 0}
      <div class="text-center">You don't have any followed users.</div>
    {:else}
      <ul class="list-group list-group-flush">
        {#each followedUsersList as user (user.emailHash)}
          <li class="list-group-item d-flex justify-content-between align-items-start">
            <div class="fw-bold">
              <!-- `s=30` again - see the muted-users list above. -->
              <img
                src={user.pic || `https://secure.gravatar.com/avatar/${user.emailHash}?d=mm&s=30`}
                alt={user.nick}
                width="30"
                height="30"
              />
              {user.nick}
            </div>
            <div>
              {#if user._id && user.userXrefID}
                <!-- svelte-ignore a11y_consider_explicit_label -->
                <button
                  class="btn btn-outline-success btn-sm me-1"
                  onclick={() => onManagedUserInfo(user)}
                >
                  <i class="fas fa-edit"></i>
                </button>
              {/if}
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button
                class="btn btn-outline-danger btn-sm"
                onclick={() => onManagedUserRemoval('followedUsers', user)}
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-light" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal>
</app-followed-users-modal>
<app-screenshare-preview>
  <div
    id="screenshareLocalPreviewHolder"
    class="card webcamsHolderScreen ui-draggable ui-draggable-handle ui-resizable"
  >
    <div class="card-body">
      <!-- svelte-ignore a11y_missing_content -->
      <h5 class="card-title m-0">
        <div {...{ ngbdropdown: '' } as Record<string, string>} class="d-inline-block dropdown">
          <button
            id="dropdownBasic1"
            {...{ ngbdropdowntoggle: '' } as Record<string, string>}
            class="dropdown-toggle btn btn-outline-dark"
            aria-expanded={screenPreviewDropdownOpen}
            onclick={() => (screenPreviewDropdownOpen = !screenPreviewDropdownOpen)}
          ></button>
          <div
            {...{ ngbdropdownmenu: '' } as Record<string, string>}
            aria-labelledby="dropdownBasic1"
            class={screenPreviewDropdownOpen ? 'dropdown-menu show' : 'dropdown-menu'}
            style={screenPreviewDropdownOpen ? 'display: block;' : undefined}
          ></div>
        </div>
        <span class="float-right p-2"><i class="fas fa-times"></i></span>
      </h5>
      <video
        {@attach setAutoplayAttribute}
        {...{ autoplay: 'autoplay' } as Record<string, string>}
        id="webcamScreenLocalPreview"
        class="webcamPreviewScreen"
      ></video>
    </div>
    <div class="ui-resizable-handle ui-resizable-n" style="z-index: 90;"></div>
    <div class="ui-resizable-handle ui-resizable-e" style="z-index: 90;"></div>
    <div class="ui-resizable-handle ui-resizable-s" style="z-index: 90;"></div>
    <div class="ui-resizable-handle ui-resizable-w" style="z-index: 90;"></div>
    <div class="ui-resizable-handle ui-resizable-ne" style="z-index: 90;"></div>
    <div
      class="ui-resizable-handle ui-resizable-se ui-icon ui-icon-gripsmall-diagonal-se"
      style="z-index: 90; display: block;"
    ></div>
    <div class="ui-resizable-handle ui-resizable-sw" style="z-index: 90;"></div>
    <div class="ui-resizable-handle ui-resizable-nw" style="z-index: 90;"></div>
  </div>
</app-screenshare-preview>
<app-rec-preview>
  <div id="recLocalPreviewHolder" class="card recsHolderScreen">
    <div class="card-body">
      <h5 class="card-title m-0">
        <div class="d-inline-block p-2 text-white">Recording Preview. (DELAYED UPTO 20s)</div>
        <span class="float-right p-2"><i class="fas fa-times text-white"></i></span>
        <span class="float-right p-2 mx-1"><i class="fas fa-expand text-white"></i></span>
      </h5>
      <div class="text-center py-4 text-white"><h4>Recording paused.</h4></div>
    </div>
  </div>
</app-rec-preview>
<app-followed-users-modal>
  <Modal
    id="followedUsersModal"
    ariaLabelledby="followedUsersModalLabel"
    rootRole={null}
    dialogRole={null}
    title="Followed Chat Users"
    titleId="followedUsersModalLabel"
    titleClass="modal-title"
    {onclose}
  >
    <div class="text-center">You don't have any followed users.</div>
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-light" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal>
</app-followed-users-modal>
<app-scheduled-alerts-modal>
  <Modal
    id="scheduledAlertsModal"
    open={name === 'scheduled'}
    ariaLabelledby="scheduledAlertsModalLabel"
    rootClass="modal fade text-white"
    rootRole={null}
    dialogRole={null}
    title="Manage Scheduled Alerts"
    titleId="scheduledAlertsModalLabel"
    titleClass="modal-title"
    dialogClass="modal-xl"
    {onclose}
  >
    <table class="table table-striped text-white w-100">
      <thead>
        <tr>
          <th scope="col">Date / Time</th>
          <th scope="col">Sender</th>
          <th scope="col">Alert</th>
          <th scope="col">Repeat</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-primary" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal>
</app-scheduled-alerts-modal>
<app-alert-send-report-modal>
  <Modal
    id="alert-send-report-modal"
    open={name === 'report'}
    ariaLabelledby="alert-send-report-modal"
    title={`Alert Sent Report. AlertID: ${targetMessage?.id ?? ''}`}
    {onclose}
    footerClass="text-center"
  >
    {#if reportLoading}
      <div class="text-center my-4">
        <h5><i class="ml-2 fas fa-spinner fa-spin"></i> Loading...</h5>
      </div>
    {:else}
      <div class="mt-3 text-center">No Reports.</div>
    {/if}
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal>
</app-alert-send-report-modal>
<app-all-user-pmmodal>
  <Modal
    id="all-user-pm-modal"
    open={name === 'all-private'}
    ariaLabelledby="all-user-pm-modal"
    {onclose}
  >
    <!--
      `O(6, userData?.nick ? 6 : -1)` — template `OMe`, a `<strong>` beside the title carrying the
      member's name. It comes back WITH the answer rather than from the request: the modal is
      labelling somebody else's private messages, so the label is the server's to supply.
    -->
    {#snippet header()}
      <h5>
        All private messages:
        {#if peerHistory.history?.nick}<strong>{peerHistory.history.nick}</strong>{/if}
      </h5>
    {/snippet}
    <!--
      `O(9, loading ? 9 : -1)` then `O(10, loading ? -1 : 10)` — the spinner and the log are the two
      halves of one switch (bundle byte 2,417,700), so exactly one of them is ever on screen. This
      was the spinner ALONE and nothing opened the modal: a permanent "Loading..." with no fetch
      behind it, which is why `enablePrivateMessageHistory` was mis-filed as a one-line WIRE.
    -->
    {#if peerHistory.loading}
      <div class="text-center my-4">
        <h5><i class="ml-2 fas fa-spinner fa-spin"></i> Loading...</h5>
      </div>
    {:else if peerHistory.error}
      <!--
        NOT in the capture: upstream has no failure branch here, because its fetch cannot refuse.
        Ours can — the server checks the role AND the room setting before it reads a row — and a
        refusal that rendered as "No logs." would tell a presenter the member has no private
        messages, which is a different and worse answer than "you may not read them".
      -->
      <div class="mt-3 text-center text-warning">{peerHistory.error}</div>
    {:else}
      <div class="w-100">
        <div class="log-body">
          {#if peerHistory.history && peerHistory.history.messages.length > 0}
            <div class="log-messages">
              {#each peerHistory.history.messages as message (message._id)}
                <CompactMessageRow {message} />
              {/each}
            </div>
            {#if peerHistory.history.truncated}
              <!--
                ALSO NOT in the capture, and for the same reason: the reference asks for everything
                and gets everything. `loadPeerHistory` caps at `MAX_PEER_HISTORY` because this read
                is unbounded and runs on a click, and a moderator must not read a truncated history
                as a complete one. Saying so is the whole point of having the flag come back.
              -->
              <div class="mt-3 text-center text-muted">
                Showing the most recent messages only; older ones are not listed.
              </div>
            {/if}
          {:else}
            <div class="mt-3">No logs.</div>
          {/if}
        </div>
      </div>
    {/if}
    <div class="modal-footer text-center">
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
        Close
      </button>
    </div>
  </Modal>
</app-all-user-pmmodal>
<app-alerts-advanced-search>
  <!--
    Rebuilt against the BUNDLE, not the DOM capture.

    The previous version reproduced `app-room/complete.clean.html:155555` exactly - and that
    capture only ever rendered the empty state, so every branch the component gates behind state
    was missing: the selected-trader label, the check marks, "Unselect All", the loading spinner,
    the results list, and the Clear button. All of them are in
    `docs/source/components/app-alerts-advanced-search.render-helpers.js`, which is the whole
    reason the rule is bundle > DOM dump. It was also unreachable: `name === 'advanced-search'`
    was the only reference to that modal name in the repository, so nothing could open it.

    Template order below follows the main template function
    (`app-alerts-advanced-search.compiled.js:373-470`) node for node.
  -->
  <Modal
    id="alerts-advanced-search-modal"
    open={name === 'advanced-search'}
    ariaLabelledby="alerts-advanced-search-modal"
    title="Alerts Advanced Search"
    {onclose}
    footerClass={advancedSearchHasInput
      ? 'd-flex align-items-center justify-content-end justify-content-between'
      : 'd-flex align-items-center justify-content-end'}
  >
    {#snippet header()}
      <h5>
        Alerts Advanced Search
        <button type="button" class="btn btn-info btn-sm mx-1" onclick={onSyncRooms}>
          <i class="fas fa-sync-alt me-1"></i> Rooms
        </button>
      </h5>
    {/snippet}
    <div class="d-flex align-items-center justify-content-between flex-wrap mb-2">
      <div class="d-flex align-items-center justify-content-between flex-wrap">
        <div class="dropdown dropdown-trader-select mx-1">
          <button
            type="button"
            data-bs-toggle="dropdown"
            data-bs-auto-close="outside"
            aria-expanded={traderDropdownOpen}
            id="selectTraderDropdown"
            class="btn btn-light dropdown-toggle"
            onclick={() => (traderDropdownOpen = !traderDropdownOpen)}
          >
            <!-- `O(15, o.selectedTradersStr ? 15 : 16)` - the label replaces the placeholder. -->
            {#if selectedTradersStr}
              <span class="selected-traders-str">{selectedTradersStr} </span>
            {:else}
              <span>--Select Traders--</span>
            {/if}
          </button>
          <ul
            class={traderDropdownOpen ? 'dropdown-menu w-100 show' : 'dropdown-menu w-100'}
            style={traderDropdownOpen ? 'display: block;' : undefined}
          >
            {#each CAPTURED_TRADERS as trader (trader.avatar)}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
              <li
                onclick={() => {
                  advancedSearch.traders = toggleKey(
                    advancedSearch.traders,
                    trader.avatar,
                    trader.username
                  );
                }}
              >
                <!-- svelte-ignore a11y_missing_attribute -->
                <a class="dropdown-item">
                  {#if advancedSearch.traders[trader.avatar]}
                    <i class="fas fa-check-square me-1"></i>
                  {/if}
                  {trader.username}
                </a>
              </li>
            {/each}
            <!-- `O(20, o.selectedTradersStr ? 20 : -1)` - the divider and Unselect All appear together. -->
            {#if selectedTradersStr}
              <li><hr class="dropdown-divider" /></li>
              <li class="text-center">
                <button
                  type="button"
                  class="btn btn-warning btn-sm mx-1"
                  onclick={() => (advancedSearch.traders = {})}
                >
                  <i class="fas fa-minus-square me-1"></i> Unselect All
                </button>
              </li>
            {/if}
          </ul>
        </div>
        <div class="dropdown dropdown-room-select mx-1">
          <button
            type="button"
            data-bs-toggle="dropdown"
            data-bs-auto-close="outside"
            aria-expanded={roomDropdownOpen}
            id="selectRoomDropdown"
            class="btn btn-light dropdown-toggle"
            onclick={() => (roomDropdownOpen = !roomDropdownOpen)}
          >
            {#if selectedRoomsStr}
              <span class="selected-rooms-str">{selectedRoomsStr} </span>
            {:else}
              <span>--Select Rooms--</span>
            {/if}
          </button>
          <ul
            class={roomDropdownOpen ? 'dropdown-menu w-100 show' : 'dropdown-menu w-100'}
            style={roomDropdownOpen ? 'display: block;' : undefined}
          >
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <li
              onclick={() => {
                advancedSearch.rooms = toggleKey(
                  advancedSearch.rooms,
                  'mastering-the-trade',
                  'Mastering The Trade'
                );
              }}
            >
              <!-- svelte-ignore a11y_missing_attribute -->
              <a class="dropdown-item">
                {#if advancedSearch.rooms['mastering-the-trade']}
                  <i class="fas fa-check-square me-1"></i>
                {/if}
                Mastering The Trade
              </a>
            </li>
            {#if selectedRoomsStr}
              <li><hr class="dropdown-divider" /></li>
              <li class="text-center">
                <button
                  type="button"
                  class="btn btn-warning btn-sm mx-1"
                  onclick={() => (advancedSearch.rooms = {})}
                >
                  <i class="fas fa-minus-square me-1"></i> Unselect All
                </button>
              </li>
            {/if}
          </ul>
        </div>
      </div>
      <input
        id="search-term-input"
        name="search-term-input"
        type="search"
        placeholder="Type your search term"
        aria-label="Type your search term"
        aria-describedby="search-term-addon"
        class="form-control"
        bind:value={advancedSearch.txt}
        onkeyup={(event) => {
          // `onInputChange(e) { 13 === e.keyCode && (e.preventDefault(), this.searchAlerts()) }`
          if (event.key === 'Enter') {
            event.preventDefault();
            runAdvancedSearch();
          }
        }}
      />
    </div>
    <div class="d-flex align-items-center justify-content-between flex-wrap mb-2">
      <div>
        <div class="form-check m-1">
          <input
            type="checkbox"
            id="checkNonTradeAlert"
            class="form-check-input"
            bind:checked={advancedSearch.nonTradeAlert}
          />
          <label for="checkNonTradeAlert" class="form-check-label"> Non Trade Alert </label>
        </div>
        <div class="form-check m-1">
          <input
            type="checkbox"
            id="checkArchives"
            class="form-check-input"
            bind:checked={advancedSearch.isArchived}
          />
          <label for="checkArchives" class="form-check-label"> Also search archives? </label>
        </div>
      </div>
      <div class="d-flex align-items-center flex-wrap date-input-container">
        <div class="d-flex align-items-center flex-wrap m-1">
          <label for="startDateInput" class="form-label m-0 me-1">Start Date:</label>
          <input
            type="datetime-local"
            id="startDateInput"
            class="form-control"
            bind:value={advancedSearch.startDate}
          />
        </div>
        <div class="d-flex align-items-center flex-wrap m-1">
          <label for="endDateInput" class="form-label m-0 me-1">End Date:</label>
          <input
            type="datetime-local"
            id="endDateInput"
            class="form-control"
            bind:value={advancedSearch.endDate}
          />
        </div>
      </div>
    </div>
    <!-- `O(50, o.loading ? 50 : 51)` - the spinner replaces the results block entirely. -->
    {#if advancedSearchLoading}
      <div class="text-center my-4">
        <h5><i class="ml-2 fas fa-spinner fa-spin"></i> Loading...</h5>
      </div>
    {:else}
      <div class="w-100">
        {#if advancedSearchResults.length > 0}
          <!-- `Ne(' Found: ', e.msgs.length, ' alert')` then a conditional 's', then '. ' -->
          <p class="text-center">
            Found: {advancedSearchResults.length} alert{advancedSearchResults.length > 1
              ? 's'
              : ''}.
          </p>
          <!--
            OURS, not the capture's. The reference's server bounds its own answer somewhere the
            bundle does not show, so the number is a choice this room made and it says so out loud.
            A cap the reader cannot see is exactly the silent wrong answer this search was fixed to
            stop being — it would simply have moved from fifty rows to five hundred.
          -->
          {#if advancedSearchTruncated}
            <p class="text-center text-muted small">
              Showing the newest {ALERT_SEARCH_LIMIT} matches. Narrow the dates or the text to see older
              ones.
            </p>
          {/if}
          <!--
            ── THE RESULTS ARE MESSAGES, and until 2026-08-30 they were escaped plain text ──────────

            This was `<p>{result.body}</p>`: no sender, no timestamp, no day separator, no session
            name, no alert-label badge, and — the part `SRCH-01` names — no trade highlighting and no
            click-to-copy, so an order found by searching could not be copied from the place it was
            found.

            The reference renders the same component the alerts log does, `app-st-message`, byte
            2,421,116:

              d(0, "app-st-message", 46), x("click", o => copyTradeOnClick(o, "id_" + s._id)),
              z("msg", e)("logType", "alerts")("prevD", i > 0 ? msgs[i-1].t : 0)
               ("sessName", e?.sessName || null)

            `prevD` is the previous row's timestamp, which is what draws the day separator — so the
            separator is computed here exactly as `AlertChatArea` computes it, from the row before.

            ## `showMenu={false}` is a DIVERGENCE and is recorded as one

            Upstream's row carries its full kebab. This room has no route from this modal to the
            message-action command — `ModalHost` is handed `onQaAction` and nothing else — so drawing
            twelve entries that cannot act would be the dead-control defect this repository exists to
            remove. The one binding the reference adds ON TOP of the component, `copyTradeOnClick`,
            IS wired: it is the only action a search result can take here, and it is the one the
            audit says was lost.
          -->
          <div class="log-messages">
            {#each advancedSearchResults as result, index (result.id)}
              <RoomMessage
                item={searchResultItem(result)}
                kind="alert"
                {...messageChrome}
                showMenu={false}
                menuOpen={false}
                showDateSeparator={index === 0 ||
                  !sameCalendarDay(
                    new Date(result.createdAt),
                    new Date(advancedSearchResults[index - 1].createdAt)
                  )}
                ontoggle={() => {}}
                onaction={runSearchResultAction}
              />
            {/each}
          </div>
        {:else}
          <div class="mt-4 pt-4 text-center">
            No logs to display. Please, change the input fields.
          </div>
        {/if}
      </div>
    {/if}
    {#snippet footer()}
      <!-- `O(53, o.checkInputs() ? 53 : -1)` - Clear is present only when there is input. -->
      {#if advancedSearchHasInput}
        <button type="button" class="btn btn-danger m-2" onclick={clearAdvancedSearch}>
          <i class="fa fa-trash me-1"></i> Clear
        </button>
      {/if}
      <div>
        <button
          type="button"
          class="btn btn-primary m-2 align-self-end"
          onclick={runAdvancedSearch}
        >
          <i class="fas fa-search me-1"></i> Search
        </button>
        <button
          type="button"
          data-bs-dismiss="modal"
          class="btn btn-secondary m-2 align-self-end"
          onclick={onclose}
        >
          Close
        </button>
      </div>
    {/snippet}
  </Modal>
  {#if syncRoomsConfirmOpen}
    <BootboxDialog
      mode="confirm"
      message={SYNC_ROOMS_CONFIRM}
      onclose={() => (syncRoomsConfirmOpen = false)}
      onconfirm={() => (syncRoomsNotice = SYNC_ROOMS_UNAVAILABLE)}
    />
  {/if}
  {#if syncRoomsNotice}
    <BootboxDialog
      mode="alert"
      message={syncRoomsNotice}
      onclose={() => (syncRoomsNotice = null)}
    />
  {/if}
</app-alerts-advanced-search>
<app-alert-filter-modal>
  <Modal
    id="alert-filter-modal"
    open={name === 'alert-filter'}
    ariaLabelledby="alert-filter-modal"
    title={alertFilterTitle(showAlertsFrom)}
    {onclose}
    bodyClass="pt-1"
    footerClass="d-flex align-items-center justify-content-between"
  >
    <div class="form-check m-2">
      <!--
        `je("ngModel", showAlertsFrom)` plus a separate `click` handler, byte 1,222,600. The
        reference binds the value AND calls `showAlertsFrom()` on click, which flips the flag and
        immediately opens the save confirm — so the direction is not a pending edit you then Save,
        it saves on the spot. `bind:checked` covers the model half; the click handler is the other.
      -->
      <input
        type="checkbox"
        value=""
        id="show-alerts"
        class="form-check-input ng-untouched ng-pristine ng-valid"
        bind:checked={showAlertsFrom}
        onclick={toggleShowAlertsFrom}
      />
      <label for="show-alerts" class="form-check-label">
        Only show alerts from these people:
      </label>
    </div>
    <!--
      `O(14, modAlertFilterList && modAlertFilterList.length > 0 ? 14 : 15)` — the list, or the empty
      state. Keyed by `avatar`, which is the reference's own trackBy (`Cue = (t, n) => n.avatar`).
    -->
    {#if alertFilterTraders.length > 0}
      <ul class="list-group">
        <!--
          The row is `<li class="list-group-item list-group-item-action">` with a bare `click` —
          const 13, byte 1,222,300. That is the reference's markup and it is reproduced.

          THE ACCESSIBILITY DEFECT IS THE REFERENCE'S, AND IT IS REPRODUCED DELIBERATELY.

          Bootstrap intends `list-group-item-action` for an `<a>` or a `<button>`; the reference puts
          it on a bare `<li>` and hangs a click on it, so the row cannot be reached from a keyboard.
          svelte-check says so in three different ways, and it is right every time.

          A first attempt here added `tabindex` and a keydown handler. That was an improvement, and
          improvements come after — the standing directive is to match identically first. Adding
          keyboard operability changes the tab order of the modal against the capture, which is
          exactly the kind of quiet drift a later pixel diff would have to explain.

          So the markup is the capture's, and the warnings are suppressed WITH THIS REASON attached
          rather than silently. When the improve pass comes, this is a two-line change to a
          `<button>` carrying the same classes, and Bootstrap renders it identically.
        -->
        {#each alertFilterTraders as trader (trader.avatar)}
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <li
            class="list-group-item list-group-item-action"
            onclick={() =>
              (alertFilterFor = toggleTrader(alertFilterFor, trader.avatar, trader.username))}
          >
            <i class={traderRowIconClass(alertFilterFor, trader.avatar)}></i>
            {' '}{trader.username}{' '}
          </li>
        {/each}
      </ul>
    {:else}
      <p>List is empty.</p>
    {/if}
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
        {' '}Close{' '}
      </button>
      <!--
        `O(19, modAlertFilterList && modAlertFilterList.length > 0 ? 19 : -1)` — the three buttons
        render ONLY when the list is non-empty. `-1` is "instantiate nothing", so an empty list gets
        a Close button and nothing else rather than three controls that would act on no rows.
      -->
      {#if alertFilterTraders.length > 0}
        <div>
          <button
            type="button"
            class="btn btn-warning m-1"
            onclick={() => (alertFilterFor = unselectAllTraders())}
          >
            <i class="fas fa-minus-square me-1"></i>{' '}Unselect All{' '}
          </button>
          <button
            type="button"
            class="btn btn-info m-1"
            onclick={() => (alertFilterFor = selectAllTraders(alertFilterFor, alertFilterTraders))}
          >
            <i class="fas fa-plus-square me-1"></i>{' '}Select All{' '}
          </button>
        </div>
        <button type="button" class="btn btn-success" onclick={saveAlertFilter}>
          {' '}Save
        </button>
      {/if}
    {/snippet}
  </Modal>
  {#if alertFilterConfirmMessage}
    <BootboxDialog
      mode="confirm"
      message={alertFilterConfirmMessage}
      onconfirm={confirmAlertFilter}
      onclose={() => {
        /*
          `bootbox.confirm(..., s => { s ? (...) : (showAlertsFrom = !showAlertsFrom) })`, byte
          1,221,700. Cancelling REVERTS the direction rather than leaving the checkbox where the
          user put it — because the click already flipped it before the confirm opened.
        */
        alertFilterConfirmMessage = null;
        showAlertsFrom = !showAlertsFrom;
      }}
    />
  {/if}
</app-alert-filter-modal>
<app-webrtc-troubleshooter>
  <Modal
    id="webrtc-troubleshooter-modal"
    open={name === 'connectivity'}
    closedAriaHidden
    ariaLabelledby="webrtc-troubleshooter-modal"
    title={isPresenter ? 'Connectivity/Mic Troubleshooter' : 'Connectivity Troubleshooter'}
    titleClass="modal-title"
    titleTag="h3"
    dialogStyle="max-width: 540px;"
    {onclose}
  >
    {#snippet beforeBody()}
      <ul role="tablist" class="nav nav-tabs troubleshooter-tabs">
        <!--
          CONN-02 — `H(9,hAe,4,2,"li",8)` and `H(14,pAe,4,2,"li",8)` are BOTH behind
          `z("ngIf", globals.isPresenter)` at byte 2,456,395; only the Mobile App `li` between them
          is unconditional. This room had it the other way round — Network Test unconditional, Mic
          Test gated — so a member could run the WebRTC connectivity test, which the reference never
          exposes to one.

          Diagnostic rather than privileged, so this is defence in depth rather than a hole being
          closed. It is closed anyway, and the BODY and the footer carry the same term for the reason
          SC-17 records: a gate on the way IN is not a statement about what the thing is for.
        -->
        {#if isPresenter}
          <li role="presentation" class="nav-item">
            <button
              type="button"
              role="tab"
              class={['nav-link', { active: activeConnectivityTab === 'network' }]}
              onclick={() => onConnectivityTabChange('network')}
            >
              <i class="fas fa-network-wired me-1"></i> Network Test
            </button>
          </li>
        {/if}
        <!--
          The Mobile App tab, `d(10,"li",9)(11,"button",10)` at 2,456,143 — consts 9
          `["role","presentation",1,"nav-item"]`, 10 `["type","button","role","tab",1,"nav-link",3,"click"]`
          and 11 `[1,"fas","fa-mobile-alt","me-1"]`. The label is `" Mobile App "` at 2,456,210.

          `fa-mobile-alt` occurs EXACTLY ONCE in the whole bundle and this is it. The navbar's mobile
          button is `fa-mobile` (const 137 at 2,541,704) and has been since the older build —
          matching the new string to the nearest mobile-looking element would have changed the icon
          on a control nobody touched.

          It sits BETWEEN Network Test and Mic Test upstream, and it does here. Its `{#if}` does not:
          upstream emits this `li` unconditionally while gating the other two on `isPresenter`, and
          that absence is recorded on `mobileAppAvailable` above.
        -->
        {#if mobileAppAvailable}
          <li role="presentation" class="nav-item">
            <button
              type="button"
              role="tab"
              class={['nav-link', { active: activeConnectivityTab === 'mobile' }]}
              onclick={() => onConnectivityTabChange('mobile')}
            >
              <i class="fas fa-mobile-alt me-1"></i> Mobile App
            </button>
          </li>
        {/if}
        {#if isPresenter}
          <li role="presentation" class="nav-item">
            <button
              type="button"
              role="tab"
              class={['nav-link', { active: activeConnectivityTab === 'mic' }]}
              onclick={() => onConnectivityTabChange('mic')}
            >
              <i class="fas fa-microphone me-1"></i> Mic Test
            </button>
          </li>
        {/if}
      </ul>
    {/snippet}
    {#if isPresenter && activeConnectivityTab === 'network'}
      <div>
        <p class="text-muted mb-4">
          This tool checks your network and connectivity to essential WebRTC servers.
        </p>
        <!--
          WHICH servers were tested, said out loud.

          "STUN passed" against this deployment's own servers and against a public fallback are two
          different claims, and a support conversation should not have to guess which one it is
          reading. Rendered only after a run, so it reports what happened rather than what will.
        -->
        {#if hasRunTest}
          <p class="text-muted mb-4" data-testid="ice-source">
            {#if testIceSource === 'deployment'}
              Tested against this room's own media servers.
            {:else}
              Tested against public STUN only — the media connection has not opened yet, so this
              says nothing about this room's servers. Join the room, then run it again.
            {/if}
          </p>
        {/if}
        <!--
          The four checks, one loop. They were four near-identical blocks stating the same two rules
          four times; the table and the two pure functions live in `#lib/connectivity-status-rows.js`,
          where they are tested. The TURN row's `–`-for-unconfigured is preserved and is the reason
          the glyph is a function rather than a nested ternary in the markup.
        -->
        {#each CONNECTIVITY_ROWS as row (row.key)}
          {@const state = testStates[row.key]}
          <div class={[`status-item ${row.spacing}`, connectivityRowClasses(state)]}>
            <span class="fw-medium">{row.label}</span>
            <span
              class={[`status-icon ${state}`, { spin: state === 'pending' && isTestRunning }]}
              title={state === 'unconfigured' ? row.unconfiguredTitle : undefined}
            >
              {connectivityGlyph(state, isTestRunning)}
            </span>
          </div>
        {/each}
        {#if showConnectivityMessage}
          <div
            class={[
              'alert alert-info',
              {
                'alert-success': connectivityMessageText.includes('passed'),
                'alert-danger': connectivityMessageText.includes('failed')
              }
            ]}
          >
            {connectivityMessageText}
          </div>
        {/if}
      </div>
    {:else if activeConnectivityTab === 'mobile' && mobileAppAvailable}
      <MobileRestorePane onrestore={onrestoremobiletokens} />
    {:else if !isPresenter && !mobileAppAvailable}
      <!--
        A GAP OUR OWN GATE CREATES, and upstream cannot have it.

        The reference draws the Mobile App `li` unconditionally, so a non-presenter always has one
        tab. Ours draws it behind `mobileAppAvailable` — correctly: a room with no mobile app has
        nothing for Restore Connectivity to restore, which is recorded on that prop. Put together
        with CONN-02's gate, a member in such a room would open this modal onto NOTHING.

        An empty modal is the shape this repository refuses hardest — a control whose only effect is
        that it opened. So it says why it is empty. Same reasoning as SC-14's Refresh button: a
        divergence forced by an earlier divergence of ours is still ours to answer for.
      -->
      <p class="text-muted my-4 text-center">
        There is nothing to troubleshoot from here. Connectivity checks are run by the room's
        presenters, and this room has no mobile app to reconnect.
      </p>
    {:else if activeConnectivityTab === 'mic'}
      <div class="mic-test-container">
        {#if micDevices.length === 0 && !micDevicesLoading && micDevicesLoaded}
          <div class="no-mic-container">
            <div class="no-mic-icon"><i class="fas fa-microphone-slash"></i></div>
            <h5 class="no-mic-title">No Microphone Detected</h5>
            <p class="no-mic-text">
              Please connect a microphone to your computer and make sure it is enabled in your
              system settings.
            </p>
            <button class="btn btn-mic-start" onclick={() => void loadMicDevices()}>
              <i class="fas fa-sync-alt"></i> Retry Detection
            </button>
          </div>
        {:else if micDevicesLoading}
          <div class="no-mic-container">
            <div class="no-mic-icon loading">
              <i class="fas fa-spinner fa-spin"></i>
            </div>
            <p class="no-mic-text">Detecting microphones...</p>
          </div>
        {:else if micDevices.length > 0}
          <p class="text-muted mb-3">
            Test your microphone, visualize audio input, and record a sample to play back.
          </p>
          <div class="mic-device-selector mb-3">
            <label for="webrtc-mic-device" class="mic-label mb-1">Microphone Device</label>
            <select
              id="webrtc-mic-device"
              class="form-select mic-select"
              bind:value={selectedMicDeviceId}
              disabled={isMicTesting}
            >
              {#each micDevices as device (device.deviceId)}
                <option value={device.deviceId}>
                  {device.label || `Microphone (${device.deviceId.slice(0, 8)}...)`}
                </option>
              {/each}
            </select>
          </div>
          <div class={['waveform-wrapper mb-3', { active: isMicTesting }]}>
            <canvas bind:this={waveformCanvas} width="480" height="120" class="waveform-canvas"
            ></canvas>
            {#if !isMicTesting}
              <div class="waveform-overlay">
                <i class="fas fa-waveform fa-microphone-alt"></i>
                <span>Start test to see waveform</span>
              </div>
            {/if}
          </div>
          <div class="volume-meter mb-3">
            <div class="volume-label">
              <span class="mic-label">Volume Level</span>
              <span class={['volume-value', { active: isMicTesting }]}>{micLevel}%</span>
            </div>
            <div class="volume-bar-track">
              <div
                class={[
                  'volume-bar-fill',
                  { low: micLevel <= 30, mid: micLevel > 30 && micLevel <= 70, high: micLevel > 70 }
                ]}
                style:width={`${micLevel}%`}
              ></div>
            </div>
          </div>
          <div class="mic-status mic-status-{micStatus} mb-3">
            <span class="mic-status-dot"></span>
            {#if micStatus === 'idle'}
              <span class="mic-status-text">Ready to test</span>
            {:else if micStatus === 'testing'}
              <span class="mic-status-text">Listening...</span>
            {:else if micStatus === 'success'}
              <span class="mic-status-text">Microphone is working!</span>
            {:else if micStatus === 'no-audio'}
              <span class="mic-status-text">No audio detected — check your mic</span>
            {:else if micStatus === 'error'}
              <span class="mic-status-text">{micErrorMessage}</span>
            {/if}
          </div>
          <div class="mic-actions">
            <div class="mic-actions-row mb-2">
              {#if !isMicTesting}
                <button class="btn btn-mic-start" onclick={() => void startMicTest()}>
                  <i class="fas fa-microphone"></i> Start Test
                </button>
              {:else}
                <button class="btn btn-mic-stop" onclick={stopMicTest}>
                  <i class="fas fa-stop"></i> Stop
                </button>
              {/if}
              {#if isMicTesting && !isRecording}
                <button
                  class={['btn btn-mic-record', { recording: isRecording }]}
                  onclick={startRecording}
                >
                  <i class="fas fa-circle"></i> Record
                </button>
              {:else if isRecording}
                <button class="btn btn-mic-record recording" onclick={stopRecording}>
                  <i class="fas fa-stop"></i> Stop ({recordingDuration}s)
                </button>
              {/if}
            </div>
            {#if recordedAudioUrl}
              <div class="mic-actions-row">
                <button class="btn btn-mic-play" onclick={playRecording} disabled={isPlayingBack}>
                  <i class={['fas', { 'fa-play': !isPlayingBack, 'fa-volume-up': isPlayingBack }]}
                  ></i>
                  {isPlayingBack ? 'Playing...' : 'Play Recording'}
                </button>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
    {#snippet footer()}
      {#if isPresenter && activeConnectivityTab === 'network'}
        <button
          type="button"
          class="btn btn-primary"
          onclick={() => void runWebRTCTest()}
          disabled={isTestRunning}
        >
          {#if !isTestRunning}
            <i class="fas fa-play"></i>
          {:else}
            <i class="fas fa-spinner fa-spin"></i>
          {/if}
          {isTestRunning ? 'Testing...' : 'Start Test'}
        </button>
        <button type="button" class="btn btn-success" onclick={copyResults}>
          <i class="fas fa-copy"></i> Copy Results
        </button>
        <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
          Close
        </button>
      {:else}
        <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
          Close
        </button>
      {/if}
    {/snippet}
  </Modal>
</app-webrtc-troubleshooter>
<app-rich-text-editor>
  <Modal
    id="rteModal"
    open={name === 'rich-text'}
    ariaLabelledby="rteLabel"
    rootRole={null}
    dialogRole={null}
    title="Rich Text Editor"
    titleId="rteLabel"
    titleClass="modal-title"
    {onclose}
  >
    <!--
      `#msgTxtContainer` is the editor HOST, kept because that is what the capture calls it: the
      reference mounts summernote onto this div and `destroyRTE()` replaces the whole element with
      an empty one of the same id. Unmounting the component is our equivalent, so the id is
      structural here rather than decorative — the toolbar and the editable region are inside it.

      Gated, not merely hidden. `loadRTE()` refuses to construct the editor at all unless
      `sessData.enableRTE && preferences.enableRTE && isPresenter`, so with the gate shut there is
      no editor rather than a disabled one — and `retriveRTEContent()` asks the same question again
      before reading anything out of it, which is the half reproduced on the send below.
    -->
    <div id="msgTxtContainer">
      <!--
        `name === 'rich-text'` as well as the gate, and it is load-bearing rather than tidy.
        `Modal` renders its children whether it is open or not — it hides with `inert` plus
        `display: none` so the dialog keeps its DOM. An editor mounted on page load would run its
        focus attachment into a hidden container at startup, and then NOT focus on the open that
        matters, because the attachment had already run.

        Mount on open and unmount on close is also the exact shape of the capture: `destroyRTE()`
        tears summernote down and replaces the host with an empty div of the same id, and every
        open calls `loadRTE()` again.
      -->
      {#if name === 'rich-text' && canUseRTE}
        <!--
          A function binding rather than `bind:` on a bindable prop: this component reports
          everything to the page through callbacks, and one prop reaching back into the parent's
          state would be the only exception. The getter and setter say the same thing explicitly.
        -->
        <RichTextEditor bind:value={() => rteDraft, (html) => onRteDraftChange(html)} />
      {/if}
    </div>
    {#snippet footer()}
      <div class="d-flex justify-content-between w-100 align-items-center">
        <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
          Close
        </button>
        <!--
          Two labels, chosen by `o.isEditing ? 14 : 15` over a pair of embedded views that hold
          `<span>Save</span>` and `<span>Send</span>`. The span is the capture's, not a wrapper
          added here.
        -->
        <button type="button" class="btn btn-primary" onclick={onRteSend}>
          {#if rteIsEditing}<span>Save</span>{:else}<span>Send</span>{/if}
        </button>
      </div>
    {/snippet}
  </Modal>
</app-rich-text-editor>

{#if name === 'file-upload'}
  <div
    class="bootbox modal fade show"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    {@attach focusUploadModal}
  >
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">File Upload</h5>
          <button
            type="button"
            class="bootbox-close-button close btn-close"
            aria-hidden="true"
            aria-label="Close"
            onclick={onclose}
          ></button>
        </div>
        <div class="modal-body">
          <div class="bootbox-body">
            <div>
              <label
                class="upload-area"
                style="width:100%;text-align:center;"
                for={fileUploadInputId}
              >
                <input
                  id={fileUploadInputId}
                  name="fupload"
                  type="file"
                  style="display:none;"
                  {...{ multiple: 'true' } as Record<string, string>}
                  {@attach setMultipleAttribute}
                  onchange={onFilesChosen}
                />
                <i class="fas fa-file-upload fa-3x"></i><br />
                Click to select files to upload
              </label>
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                id="filedrag"
                class={['filedrag', { hover: dragHover }]}
                style={uploadListVisible ? 'display: none;' : 'display: block;'}
                ondragover={onDragState}
                ondragleave={onDragState}
                ondrop={onFilesChosen}
              >
                or drop files here
              </div>
              <br />
              <div
                style="margin-left:5px !important;"
                id="fileList"
                class="fileList"
                hidden={!uploadListVisible}
              >
                <ul>
                  {#each uploadQueue as file (file.name + file.size + file.lastModified)}
                    <li>{file.name}</li>
                  {/each}
                </ul>
              </div>
              {#if uploadStatus}
                <div class="upload-status" role="status">{uploadStatus}</div>
              {/if}
            </div>
            <div class="clearfix"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-success"
            disabled={!uploadQueue.length || uploading}
            onclick={doFileListUpload}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
