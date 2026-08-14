<script lang="ts">
  import { ngbTooltip, ngbTooltipWith } from '$lib/ngb-tooltip';
  import { alertDateFormatter } from '$lib/message-formatters';
  import { panelDragResize } from '$lib/panel-drag';
  import { deserialize } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import type {
    AlertTab,
    ActivePoll,
    FollowChatStyle,
    ManagedChatUser,
    ModalName,
    ModalTargetUser,
    SavedPoll,
    SettingsTab,
    Theme
  } from '$lib/types';
  import BootboxDialog from './BootboxDialog.svelte';
  import EmojiPicker from './EmojiPicker.svelte';
  import Modal from './Modal.svelte';
  import PollPanel from './PollPanel.svelte';
  import PostAlertModal from './PostAlertModal.svelte';
  import RoomMessage from './RoomMessage.svelte';
  import type { PastedImageSubmission, PostAlertSubmission } from '$lib/post-alert-behavior';
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
  } from '$lib/alerts-advanced-search';

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
    }[];
    onMentionUser: (name: string) => void;
    onPrivateChat: (user: ModalTargetUser) => void;
    onFollowToggle: (user: ModalTargetUser) => void;
    onFollowStyleChange: (user: ModalTargetUser, style: FollowChatStyle) => void;
    onMuteToggle: (user: ModalTargetUser) => void;
    onUserAction: (action: string, user: ModalTargetUser) => void;
    onManagedUserRemoval: (list: 'mutedUsers' | 'followedUsers', user: ManagedChatUser) => void;
    onManagedUserInfo: (user: ManagedChatUser) => void;
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
     * `canEditUsername` — `sessData.allowUsersToChangeUsername`, the member's own rename.
     *
     * The fallback branch of `O(9)`. Different action from the presenter's: `editUsernameByUser`
     * rather than `editUsername`.
     */
    canEditUsername?: boolean;
    targetUser: ModalTargetUser;
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
     * The room's alerts, for `#alerts-advanced-search-modal`. The captured component calls a
     * server route this room does not have, so the search runs against these real rows - see
     * `filterAlerts` in `$lib/alerts-advanced-search`.
     */
    alerts: SearchableAlert[];
  }

  let {
    name,
    mediaIceServers = [],
    settingsTab,
    alertTab,
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
    onMentionUser,
    onPrivateChat,
    onFollowToggle,
    onFollowStyleChange,
    onMuteToggle,
    onUserAction,
    onManagedUserRemoval,
    onManagedUserInfo,
    currentUser,
    mobilePin = 'N/A',
    mobileAndroidUrl = null,
    mobileIosUrl = null,
    hideMobileCredentials = false,
    isLimitedPresenter = false,
    canEditUsername = false,
    targetUser,
    mutedUsers,
    followedUsers,
    targetMessage,
    alerts
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
  let advancedSearchResults = $state<SearchableAlert[]>([]);
  let advancedSearchLoading = $state(false);
  /** `selectedTradersStr` / `selectedRoomsStr` - empty string means "show the placeholder span". */
  const selectedTradersStr = $derived(selectedLabel(advancedSearch.traders));
  const selectedRoomsStr = $derived(selectedLabel(advancedSearch.rooms));
  /** Gates the red Clear button AND the footer's `justify-content-between`. */
  const advancedSearchHasInput = $derived(
    checkInputs(advancedSearch, advancedSearchResults.length)
  );

  /** `searchAlerts()` - the early return, then the query. */
  function runAdvancedSearch() {
    if (!canSearch(advancedSearch)) return;
    advancedSearchResults = [];
    advancedSearchLoading = true;
    // The capture awaits a server round trip here. This room answers from rows it already holds,
    // so the loading state is set and cleared in the same tick rather than faked with a timer.
    advancedSearchResults = filterAlerts(alerts, advancedSearch);
    advancedSearchLoading = false;
  }

  function clearAdvancedSearch() {
    advancedSearch = clearInput();
    advancedSearchResults = [];
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
  let qaComposer = $state('');
  let qaEmojiOpen = $state(false);
  let qaMenuQuestionId = $state<number | null>(null);
  const qaQuestions = $derived(
    alertQuestions.filter((question) => question.alertId === targetMessage?.id)
  );
  const qaTimeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  // Captured alerts carry the timestamp exactly as it was rendered; database rows are formatted.
  /*
    The tooltip beside the visible time, which the reference BINDS rather than writes:
    `xn("ngbTooltip", Ct(27, 24, e.msg.t, "short"))` against a visible `hh:mm a`. Angular's
    `date:'short'` for en-US is `M/d/yy, h:mm a`, which is exactly what `alertDateFormatter` already
    produces — reused rather than re-derived, because a second formatter for the same shape is how
    two of them drift apart.

    Empty when there is no timestamp to format: `ngbTooltipWith` renders nothing for an empty string,
    which matches a reference binding that evaluates to nothing.
  */
  const qaAlertTooltip = $derived.by(() => {
    if (!targetMessage) return '';
    return 'createdAt' in targetMessage && targetMessage.createdAt
      ? alertDateFormatter.format(new Date(targetMessage.createdAt as string | Date))
      : '';
  });
  const qaAlertTimestamp = $derived.by(() => {
    if (!targetMessage) return '';
    if ('evidenceTimestampText' in targetMessage && targetMessage.evidenceTimestampText) {
      return targetMessage.evidenceTimestampText;
    }
    return 'createdAt' in targetMessage && targetMessage.createdAt
      ? qaTimeFormatter.format(new Date(targetMessage.createdAt as string | Date))
      : '';
  });
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
  let groupChatMode = $state('g');
  let echoCancellation = $state(false);
  let noiseSuppression = $state(false);
  let autoGainControl = $state(false);
  let audioDevices = $state([
    {
      deviceId: '953f11aeca98147407fe5afe290dc18b384306c979179ce7a96ec4b92148ab5b',
      label: 'Studio Display Microphone (05ac:1118)'
    }
  ]);
  let videoDevices = $state([
    {
      deviceId: '2da3a3313185023c68e57b8bd07c010fe3975db1a2962584c0b6b493aa5c708a',
      label: 'Studio Display Camera (15bc:0000)'
    }
  ]);
  let currentAudioDevice = $state(
    '953f11aeca98147407fe5afe290dc18b384306c979179ce7a96ec4b92148ab5b'
  );
  let currentVideoDevice = $state(
    '2da3a3313185023c68e57b8bd07c010fe3975db1a2962584c0b6b493aa5c708a'
  );
  let devicesLoading = $state(false);
  let devicesLoadError = $state('');
  const fileUploadInputId = 'fupload';
  let streamPlayerEnabled = $state(false);
  let streamingProtocol = $state('');
  let restreamLink = $state('');
  let reportLoading = $state(true);
  let alertDisplayMode = $state<'regular' | 'compact'>('regular');
  let chatDisplayMode = $state<'regular' | 'compact'>('regular');
  let presenterTextColor = $state('#f7fd37');
  let presenterBackgroundColor = $state('#000000');
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
  let activeConnectivityTab = $state<'network' | 'mic'>('network');
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
  let micDevices = $state<Array<{ deviceId: string; label: string }>>([]);
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

  function onConnectivityTabChange(tab: 'network' | 'mic') {
    if (tab === activeConnectivityTab) return;
    if (activeConnectivityTab === 'mic') cleanupMicTest();
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
  let uploadQueue = $state<File[]>([]);
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
      const body = new FormData();
      body.append('file', file);
      body.append('originalname', file.name);

      try {
        const response = await fetch('?/uploadFile', { method: 'POST', body });
        const result = deserialize<{ success?: boolean }, { message?: string }>(
          await response.text()
        );
        if (result.type !== 'success') {
          failures.push(
            `${file.name}: ${result.type === 'failure' ? (result.data?.message ?? 'refused') : 'upload failed'}`
          );
        }
      } catch (cause) {
        failures.push(`${file.name}: ${cause instanceof Error ? cause.message : 'network error'}`);
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

  /**
   * Revoking a permission sends the capture's `remotePresCommand` to that member.
   *
   * The capture's three moderation subCmds are carried out by the peer they name -
   * `mutemic` -> `muteMic()`, `mutecam` -> `stopCam()`, `mutescreens` -> `stopSharingAll()` - so
   * unchecking Microphone here does not edit a row, it tells that member's browser to stop
   * sending. These checkboxes were bound to local state and sent nowhere, so a presenter could
   * untick Microphone and nothing at all happened.
   *
   * Only the REVOKE direction is wired here, and that is still right: ticking a box is not the
   * grant. Granting is `giveMicScreen`, a top-level command of its own carrying `{give}`, and its
   * subscriber flips the member to a limited presenter
   * (`globals.user.isPresenter = globals.isLimitedPresenter = globals.isPresenter = e.give`) and
   * then reinitialises their media.
   *
   * The RECEIVING half now exists — `+page.svelte` dispatches `giveMicScreen` and sets
   * `isLimitedPresenter`, which is what narrows `archivesAvailableTo()` and the administrative
   * body of this modal. What is still missing is the control that SENDS it: the capture's
   * `giveMicScreen(e)` refuses a self-target (`Can't give 'Mic/Screenshare' to yourself.`) and
   * then `sendServerAdminCommand("giveMicScreen", {user, give})`, but which element calls it has
   * not been located in the decoded template. `TODO.md` gap 24 rather than a guessed button.
   */
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
  let micScreenAlert = $state<string | null>(null);

  async function giveMicScreen(give: boolean) {
    if (!targetUser?.id) return;
    if (targetUser.id === currentUser.id) {
      micScreenAlert = `Can't ${give ? 'give' : 'take'} 'Mic/Screenshare' to yourself.`;
      return;
    }
    const body = new FormData();
    body.set('targetUserId', String(targetUser.id));
    body.set('give', String(give));
    const response = await fetch('?/giveMicScreen', { method: 'POST', body });
    if (!response.ok) {
      console.error('[room] giveMicScreen failed', response.status);
      return;
    }
    micScreenAlert = give ? 'Mic/Screenshare given OK' : 'Mic/Screen taken away OK';
  }

  async function revokePermission(subCmd: 'mutemic' | 'mutecam' | 'mutescreens') {
    if (!targetUser?.id) return;
    const body = new FormData();
    body.set('subCmd', subCmd);
    body.set('targetUserId', String(targetUser.id));
    const response = await fetch('?/presenterCommand', { method: 'POST', body });
    if (!response.ok) console.error('[room] presenter command failed', response.status);
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
      'presenter-push-to-talk': 'pushToTalk',
      'presenter-speech-recognition': 'doSpeechReco',
      'app-speech-reco-overlay': 'showSpeechRecoOverlay',
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

  function applyGroupChatMode(mode: string) {
    groupChatMode = mode;
    onPreferenceChange('chatMode', mode);
  }

  function requestSettingsChatMode(mode: string) {
    if (groupChatMode === mode) return;
    const label = mode === 'p' ? '"Webinar Mode"?' : mode === 'd' ? '"Disabled"?' : '"Group Chat"?';
    onConfirm(`Are you sure you want to change the chat mode to ${label}`, () =>
      applyGroupChatMode(mode)
    );
  }

  function requestSessionChatMode(mode: string) {
    if (groupChatMode === mode) return;
    onConfirm(`Are you sure you want to change the chat mode to ${mode}`, () =>
      applyGroupChatMode(mode)
    );
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

  function saveRestreamLink() {
    if (restreamLink.startsWith('rtmp://') && !restreamLink.includes(' ')) {
      onPreferenceChange('restreamToURL', restreamLink);
      return;
    }
    onUserAction('invalid-restream-link', targetUser);
  }

  function clearRestreamLink() {
    restreamLink = '';
    onPreferenceChange('restreamToURL', '');
  }

  async function loadDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      devicesLoadError =
        'Your browser does not support device enumeration. Please use a modern browser.';
      return;
    }

    devicesLoading = true;
    devicesLoadError = '';
    const streams: MediaStream[] = [];
    try {
      try {
        streams.push(await navigator.mediaDevices.getUserMedia({ audio: true }));
      } catch {
        // The compiled client continues and enumerates devices without labels.
      }
      try {
        streams.push(await navigator.mediaDevices.getUserMedia({ video: true }));
      } catch {
        // The compiled client continues and enumerates devices without labels.
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const isDuplicateDefault = (device: MediaDeviceInfo) => {
        const label = device.label;
        if (device.deviceId === 'default' || device.deviceId === 'communications') return true;
        if (!label.toLowerCase().startsWith('default - ')) return false;
        const physicalLabel = label.slice(10);
        return devices.some(
          (candidate) =>
            candidate.kind === device.kind &&
            candidate.label === physicalLabel &&
            candidate.deviceId !== device.deviceId
        );
      };
      const toOption = (device: MediaDeviceInfo) => ({
        deviceId: device.deviceId,
        label:
          device.label ||
          `${device.kind} (${device.deviceId ? `${device.deviceId.slice(0, 8)}...` : 'unknown'})`
      });

      const nextAudio = devices
        .filter((device) => device.kind === 'audioinput' && !isDuplicateDefault(device))
        .map(toOption);
      const nextVideo = devices
        .filter((device) => device.kind === 'videoinput' && !isDuplicateDefault(device))
        .map(toOption);
      if (nextAudio.length) {
        audioDevices = nextAudio;
        if (!nextAudio.some((device) => device.deviceId === currentAudioDevice)) {
          currentAudioDevice = nextAudio[0].deviceId;
        }
      }
      if (nextVideo.length) {
        videoDevices = nextVideo;
        if (!nextVideo.some((device) => device.deviceId === currentVideoDevice)) {
          currentVideoDevice = nextVideo[0].deviceId;
        }
      }
      if (!nextAudio.length && !nextVideo.length) {
        devicesLoadError =
          'No audio or video devices detected. Please ensure devices are connected and permissions are granted.';
      }
    } catch (error) {
      const deviceError = error as DOMException;
      devicesLoadError =
        deviceError.name === 'NotFoundError'
          ? 'No audio or video devices found. Please connect a microphone and/or camera.'
          : deviceError.name === 'NotAllowedError'
            ? 'Permission denied. Please allow access to your microphone and camera in your browser settings.'
            : deviceError.name === 'SecurityError'
              ? 'Security error. Please ensure the page is loaded over HTTPS.'
              : `Error loading devices: ${deviceError.message || 'Unknown error'}`;
    } finally {
      for (const stream of streams) {
        for (const track of stream.getTracks()) track.stop();
      }
      devicesLoading = false;
    }
  }

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
    const videoPattern = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const videoId = youtubeURL.match(videoPattern)?.[2] ?? null;
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

  async function sendQuestion() {
    const body = qaComposer.trim();
    if (!body) return;
    if (await onQuestionSend(body)) {
      qaComposer = '';
      qaEmojiOpen = false;
    }
  }

  // Mirrors the reply composer: Enter sends, Shift+Enter is ignored, Alt+Enter inserts a newline.
  // The captured textarea had no handler at all, so pressing Enter did nothing.
  function handleQaKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    // Shift+Enter and Alt+Enter insert a line break: fall through so the textarea does it
    // natively, which puts the break at the caret and keeps undo history intact. Calling
    // preventDefault() before this check swallowed the keystroke and produced no newline at all.
    if (event.shiftKey || event.altKey) return;
    event.preventDefault();
    void sendQuestion();
  }

  // Same defect as the Q&A composer had, and the same fix: preventDefault() ran before the
  // modifier check, so Shift+Enter was swallowed instead of inserting a line break.
  function handleReplyKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    if (event.shiftKey || event.altKey) return;
    event.preventDefault();
    void sendReply();
  }

  function gravatarAtSize(url: string, size: number) {
    try {
      const avatarUrl = new URL(url);
      if (avatarUrl.hostname !== 'secure.gravatar.com') return url;
      avatarUrl.searchParams.set('s', String(size));
      return avatarUrl.toString();
    } catch {
      return url;
    }
  }

  const targetUserModalAvatar = $derived(gravatarAtSize(targetUser.pic, 80));
  const isPresenter = $derived(currentUser.role === 'staff' || currentUser.role === 'admin');
  const isTargetCurrentUser = $derived(targetUser.emailHash === currentUser.emailHash);
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
                class:active={userInfoTab === tabId}
                class="nav-item nav-link"
                onclick={(event) => {
                  event.preventDefault();
                  userInfoTab = tabId as typeof userInfoTab;
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
            class:show={userInfoTab === 'info'}
            class:active={userInfoTab === 'info'}
            class="tab-pane fade"
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
                        {targetUser.loggedIn ? String(targetUser.loggedIn) : 'n/a'}
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
                        <div class="d-inline-block align-baseline mr-1"></div>
                        {#if targetUser.isTrial}<span class="badge badge-danger">Trial</span>{/if}
                        {#if targetUser.isNew}<span class="badge badge-info">New</span>{/if}
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
                                  // Unticking revokes; ticking is `giveMicScreen`, not built.
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
                                  // Unticking revokes; ticking is `giveMicScreen`, not built.
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
                                  // Unticking revokes; ticking is `giveMicScreen`, not built.
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
                              onclick={() => onUserAction('save-permissions', targetUser)}
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
            class:show={userInfoTab === 'system'}
            class:active={userInfoTab === 'system'}
            class="tab-pane fade"
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
            class:show={userInfoTab === 'options'}
            class:active={userInfoTab === 'options'}
            class="tab-pane fade"
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
                    class:show={userMuteMenuOpen}
                    class="dropdown-menu"
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
                <button
                  type="button"
                  class="btn btn-block btn-outline-light"
                  onclick={() => onUserAction('upload-profile-picture', targetUser)}
                  ><i class="icon fa fa-user-circle"></i> Upload Profile Picture</button
                >
              </div>
            </div>
          </div>
          <div
            id="nav-notes"
            role="tabpanel"
            aria-labelledby="nav-tab-perms"
            class:show={userInfoTab === 'notes'}
            class:active={userInfoTab === 'notes'}
            class="tab-pane fade"
          >
            <div>
              <p>To be able to manage user's notes, please enter the password.</p>
              <button
                class="btn btn-outline-light"
                onclick={() => onUserAction('admin-notes-password', targetUser)}
              >
                Enter Password
              </button>
            </div>
          </div>
        </div>
      </div>
    {:else if isTargetFollowed}
      <div class="py-2">
        <div class="p-2 d-flex align-items-end justify-content-between">
          <div class="flex-fill">
            <div title="Chat Color Mode" class="pb-2">
              <i class="fas fa-wrench"></i>
              <span class="pl-2">Edit chat text colors &amp; size:</span>
            </div>
            <div class="ml-5">
              <input
                type="color"
                name="follow-chat-text-color"
                id="follow-chat-text-color"
                class="form-check-input"
                bind:value={followChatStyle.color}
              />
              <label for="follow-chat-text-color" class="form-check-label ml-4 pl-2">
                Text Color
              </label>
            </div>
            <div class="ml-5">
              <input
                type="color"
                name="follow-chat-username-color"
                id="follow-chat-username-color"
                class="form-check-input"
                bind:value={followChatStyle.usernameColor}
              />
              <label for="follow-chat-username-color" class="form-check-label ml-4 pl-2">
                Username Color
              </label>
            </div>
            <div class="ml-5">
              <input
                type="color"
                name="follow-chat-bg-color"
                id="follow-chat-bg-color"
                class="form-check-input"
                bind:value={followChatStyle.bgColor}
              />
              <label for="follow-chat-bg-color" class="form-check-label ml-4 pl-2">
                Background Color
              </label>
            </div>
            <div class="ml-5">
              <input
                type="color"
                name="follow-chat-ticker-color"
                id="follow-chat-ticker-color"
                class="form-check-input"
                bind:value={followChatStyle.tickerColor}
              />
              <label for="follow-chat-ticker-color" class="form-check-label ml-4 pl-2">
                Ticker Color
              </label>
            </div>
            <div class="ml-5">
              <input
                type="number"
                name="follow-chat-text-size"
                id="follow-chat-text-size"
                class="form-check-input"
                bind:value={followChatStyle.fontSize}
              />
              <label for="follow-chat-text-size" class="form-check-label ml-4 pl-2">
                Text Size
              </label>
            </div>
            <div class="ml-5 text-mode-box">
              <input
                type="checkbox"
                name="follow-chat-donot-disturb"
                value="Chat Sound for followed user"
                id="follow-chat-donot-disturb"
                class="form-check-input"
                bind:checked={followChatStyle.playSound}
              />
              <label for="follow-chat-donot-disturb" class="form-check-label">
                Chat sound {followChatStyle.playSound ? 'on' : 'off'}
              </label>
            </div>
          </div>
        </div>
        <div
          class="follow-user-example"
          style:background-color={followChatStyle.bgColor}
          style:color={followChatStyle.color}
          style:font-size={`${followChatStyle.fontSize}px`}
        >
          <div>
            <div style:color={followChatStyle.usernameColor}><strong>Username:</strong></div>
            This is the followed user message example with
            <span class="stockColor" style:color={followChatStyle.tickerColor}>$TICKER</span>
            color!
          </div>
          <button
            class="btn btn-dark btn-sm"
            disabled={!followChatStyle.playSound}
            title={followChatStyle.playSound ? 'Chat sound is on.' : 'Chat sound is off.'}
            onclick={() => onUserAction('test-follow-sound', targetUser)}
          >
            <span
              class="fa"
              class:fa-volume-up={followChatStyle.playSound}
              class:fa-volume-mute={!followChatStyle.playSound}
            ></span>
          </button>
        </div>
        <div class="text-right">
          <button
            type="button"
            class="btn btn-outline-danger mx-1"
            onclick={() => (followChatStyle = defaultFollowStyle())}
          >
            Reset
          </button>
          <button
            type="button"
            class="btn btn-outline-light"
            onclick={() => onFollowStyleChange(targetUser, followChatStyle)}
          >
            Save changes
          </button>
        </div>
      </div>
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
      {#if isPresenter}
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

        <div class="p-2 text-mode-box">
          <div class="mx-3">
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
              {@attach setInputChecked(alertDisplayMode === 'regular')}
              onchange={() => {
                alertDisplayMode = 'regular';
                onPreferenceChange('alertDisplayMode', 'regular');
              }}
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
              {@attach setInputChecked(alertDisplayMode === 'compact')}
              onchange={() => {
                alertDisplayMode = 'compact';
                onPreferenceChange('alertDisplayMode', 'compact');
              }}
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
              {@attach setInputChecked(chatDisplayMode === 'regular')}
              onchange={() => {
                chatDisplayMode = 'regular';
                onPreferenceChange('chatDisplayMode', 'regular');
              }}
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
              {@attach setInputChecked(chatDisplayMode === 'compact')}
              onchange={() => {
                chatDisplayMode = 'compact';
                onPreferenceChange('chatDisplayMode', 'compact');
              }}
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
            <label for="small-image-preview" class="form-check-label">Smaller image preview</label>
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
              In this mode, presenters will see everyones questions/comments, but users will not see
              each others' chats.
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
      </div>

      {#if isPresenter}
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

          <div class="p-2 text-mode-box">
            <div id="presenterSpeechRecognition" title="Presenter Speech Recognition" class="pb-2">
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
            <button
              type="button"
              class="btn btn-outline-danger mx-1"
              onclick={() => {
                presenterTextColor = '#f7fd37';
                presenterBackgroundColor = '#000000';
              }}>Reset</button
            >
            <button
              type="button"
              class="btn btn-outline-light"
              onclick={() =>
                onPreferenceChange('presenterStyle', {
                  color: presenterTextColor,
                  bkgColor: presenterBackgroundColor
                })}>Save changes</button
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
    title="Debug Log"
    {onclose}
    titleClass="modal-title"
    titleTag="h3"
    dialogClass="modal-lg"
    dialogStyle="overflow-y: initial !important;"
    bodyStyle="max-height: 77vh; overflow-y: scroll;"
    footerOutsideContent
  >
    <div class="row">
      <textarea
        id="debugLogModalTxt"
        rows="1000"
        {...{ readonly: 'readonly' } as Record<string, string>}
        {@attach setReadonlyAttribute}
        class="form-control"
        style="min-width: 100%;"></textarea>
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
    onpost={onPostAlert}
    onpastepost={onPastePostAlert}
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
<app-chat-logs-modal>
  <Modal
    id="chat-logs-modal"
    open={name === 'chat-logs'}
    ariaLabelledby="chat-logs-modal"
    title="Chat Logs"
    {onclose}
    footerClass="text-center"
  >
    <div>
      <button type="button" class="btn btn-primary my-2">Reload Log List</button>
      <div class="list-group">
        <h5 class="mt-2">There are no archived chats at this time</h5>
      </div>
    </div>
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal>
</app-chat-logs-modal>
<app-alert-logs-modal>
  <Modal
    id="alerts-logs-modal"
    open={name === 'alert-logs'}
    ariaLabelledby="alerts-logs-modal"
    title="Alerts Logs"
    {onclose}
    footerClass="text-center"
  >
    <div>
      <button type="button" class="btn btn-primary my-2">Reload Log List</button>
      <div class="list-group">
        <h5 class="mt-2">There are no archived alerts at this time</h5>
      </div>
    </div>
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal>
</app-alert-logs-modal>
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
            class:active={sessionControlTab === tabId}
            class="nav-link"
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
        class:show={sessionControlTab === 'reset-session'}
        class:active={sessionControlTab === 'reset-session'}
        class="tab-pane fade"
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
              Reloads the session configuration, useful if something changed and you want it to take
              effect.
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
              reconnect to the media servers gently. Works Well... Swap to your backup media servers
              if the primary are not working, and vice versa.
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
      <div
        id="close-session"
        role="tabpanel"
        aria-labelledby="close-session-tab"
        class:show={sessionControlTab === 'close-session'}
        class:active={sessionControlTab === 'close-session'}
        class="tab-pane fade"
      >
        <div class="d-flex justify-content-center">
          <button
            type="button"
            class="btn btn-outline-light mr-2 my-2"
            onclick={() => onUserAction('session-save-close', targetUser)}
          >
            <i class="fas fa-save"></i> Save Message and Close Session
          </button>
          <button
            type="button"
            class="btn btn-outline-light mr-2 my-2"
            onclick={() => onUserAction('session-save-close-message', targetUser)}
          >
            <i class="fas fa-save"></i> Just Save Close Message
          </button>
          <button
            type="button"
            class="btn btn-outline-light mr-2 my-2"
            onclick={() => onUserAction('session-open', targetUser)}
          >
            Open Session
          </button>
        </div>
        <div id="summernoteClosedMsg">undefined</div>
      </div>
      <div
        id="lock-session"
        role="tabpanel"
        aria-labelledby="lock-session-tab"
        class:show={sessionControlTab === 'lock-session'}
        class:active={sessionControlTab === 'lock-session'}
        class="tab-pane fade"
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
          Lock Session? If locked only presenters/admins will be able to use the room. Regular users
          will not be allowed to enter until you unlock it.
        </h4>
      </div>
      <div
        id="av-device-selection"
        role="tabpanel"
        aria-labelledby="av-device-selection-tab"
        class:show={sessionControlTab === 'av-device-selection'}
        class:active={sessionControlTab === 'av-device-selection'}
        class="tab-pane fade"
      >
        <div class="d-flex justify-content-end align-items-center mt-2 mb-3">
          <button
            type="button"
            title="Refresh device list"
            class="btn btn-sm btn-outline-primary"
            onclick={() => void loadDevices()}
          >
            <i class="fas fa-sync-alt"></i> Refresh Devices
          </button>
        </div>
        {#if devicesLoading}
          <div class="text-center my-3">
            <i class="fas fa-spinner fa-spin"></i> Loading devices...
          </div>
        {/if}
        {#if devicesLoadError}
          <div class="alert alert-danger">{devicesLoadError}</div>
        {/if}
        <div class="mt-2">
          <div class="form-group">
            <label for="audio-deviceList">Audio device (input):</label>
            <select
              id="audio-deviceList"
              aria-label="Audio device (input)"
              class="form-select"
              bind:value={currentAudioDevice}
              onchange={() => onPreferenceChange('audioDeviceID', currentAudioDevice)}
            >
              {#each audioDevices as device (device.deviceId)}
                <option value={device.deviceId}>{device.label}</option>
              {/each}
            </select>
            <small class="text-white mt-1 d-block">
              <i class="fas fa-check-circle text-success"></i>
              Selected: {audioDevices.find((device) => device.deviceId === currentAudioDevice)
                ?.label ?? 'Unknown Device'}
            </small>
          </div>
          <div class="form-group">
            <label for="video-deviceList">Video device (input):</label>
            <select
              id="video-deviceList"
              aria-label="Video device (input)"
              class="form-select"
              bind:value={currentVideoDevice}
              onchange={() => onPreferenceChange('videoDeviceID', currentVideoDevice)}
            >
              {#each videoDevices as device (device.deviceId)}
                <option value={device.deviceId}>{device.label}</option>
              {/each}
            </select>
            <small class="text-white mt-1 d-block">
              <i class="fas fa-check-circle text-success"></i>
              Selected: {videoDevices.find((device) => device.deviceId === currentVideoDevice)
                ?.label ?? 'Unknown Device'}
            </small>
          </div>
        </div>
        <div class="mt-4">
          <div class="ml-4">
            <input
              type="checkbox"
              name="echo-cancellation"
              value="Echo Cancellation"
              id="echo-cancellation"
              class="form-check-input"
              bind:checked={echoCancellation}
              onchange={() => onPreferenceChange('echoCancellation', echoCancellation)}
            />
            <label for="echo-cancellation" class="form-check-label"> Echo Cancellation </label>
          </div>
          <div class="ml-4">
            <input
              type="checkbox"
              name="noise-suppression"
              value="Noise Suppression"
              id="noise-suppression"
              class="form-check-input"
              bind:checked={noiseSuppression}
              onchange={() => onPreferenceChange('noiseSuppression', noiseSuppression)}
            />
            <label for="noise-suppression" class="form-check-label"> Noise Suppression </label>
          </div>
          <div class="ml-4">
            <input
              type="checkbox"
              name="auto-gain-control"
              value="Auto Gain Control"
              id="auto-gain-control"
              class="form-check-input"
              bind:checked={autoGainControl}
              onchange={() => onPreferenceChange('autoGainControl', autoGainControl)}
            />
            <label for="auto-gain-control" class="form-check-label"> Auto Gain </label>
          </div>
        </div>
      </div>
      <div
        id="streaming-selection"
        role="tabpanel"
        aria-labelledby="streaming-selection-tab"
        class:show={sessionControlTab === 'streaming-selection'}
        class:active={sessionControlTab === 'streaming-selection'}
        class="tab-pane fade"
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
                class:active={streamingControlTab === tabId}
                class="nav-link"
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
            class:show={streamingControlTab === 'stream-player'}
            class:active={streamingControlTab === 'stream-player'}
            class="tab-pane fade"
          >
            <p>
              The stream player tool allows you to create a link you can share with others to watch
              your stream. This is useful if you want to share your stream with others who are not
              logged in to the trading room. They will just see the screenshare sections (no
              chat/notes/files/etc)
            </p>
            <p>
              Stream Player enabled:
              <span style:color={streamPlayerEnabled ? 'green' : 'red'}>{streamPlayerEnabled}</span>
            </p>
            <div class="mt-4">
              <button
                class="btn btn-outline-primary btn-sm m-1"
                onclick={() => {
                  streamPlayerEnabled = true;
                  onPreferenceChange('streamingPlayerEnabled', true);
                }}
              >
                <i class="fas fa-desktop"></i> Enable Stream Player
              </button>
              <button
                class="btn btn-outline-danger btn-sm m-1"
                onclick={() => {
                  streamPlayerEnabled = false;
                  onPreferenceChange('streamingPlayerEnabled', false);
                }}
              >
                <i class="fas fa-stop"></i> Disable Stream Player
              </button>
            </div>
          </div>
          <div
            id="obs-streaming"
            role="tabpanel"
            aria-labelledby="obs-streaming-tab"
            class:show={streamingControlTab === 'obs-streaming'}
            class:active={streamingControlTab === 'obs-streaming'}
            class="tab-pane fade"
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
                <label for="streaming-rtmp" class="form-check-label font-weight-bold"> Rtmp </label>
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
                <label for="streaming-whip" class="form-check-label font-weight-bold"> Whip </label>
              </div>
            </div>
            <p>
              If you want to stream directly from OBS into this room, you can use the following
              interface to get your WHIP streraming link.
            </p>
          </div>
          <div
            id="restream"
            role="tabpanel"
            aria-labelledby="restream-tab"
            class:show={streamingControlTab === 'restream'}
            class:active={streamingControlTab === 'restream'}
            class="tab-pane fade"
          >
            <textarea
              id="restream-link"
              class="form-control border border-danger"
              style="height: 100px;"
              bind:value={restreamLink}></textarea>
            <button class="btn btn-outline-info btn-sm m-1" onclick={saveRestreamLink}>
              <i class="fas fa-save"></i> Set Restream URL
            </button>
            <button class="btn btn-outline-warning btn-sm m-1" onclick={clearRestreamLink}>
              <i class="fas fa-save"></i> Clear Restream URL
            </button>
          </div>
        </div>
      </div>
      <div
        id="session-history"
        role="tabpanel"
        aria-labelledby="session-history-tab"
        class:show={sessionControlTab === 'session-history'}
        class:active={sessionControlTab === 'session-history'}
        class="tab-pane fade"
      >
        <div class="p-4 text-center">No session history.</div>
        <div class="p-4 text-center">
          <button class="btn btn-primary"><i class="fas fa fa-sync"></i> Load History </button>
        </div>
      </div>
      <div
        id="webinar-tools"
        role="tabpanel"
        aria-labelledby="webinar-tools-tab"
        class:show={sessionControlTab === 'webinar-tools'}
        class:active={sessionControlTab === 'webinar-tools'}
        class="tab-pane fade"
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
<app-alert-qa-modal>
  <Modal
    id="alertQAModal"
    open={name === 'qa'}
    ariaLabelledby="alertQALabel"
    rootClass="fade modal"
    rootRole={null}
    rootAttributes={{ 'data-keyboard': 'false', 'data-backdrop': 'static' }}
    dialogRole={null}
    {onclose}
    headerClass="align-items-start"
    footerClass="flex-nowrap"
    bodyStyle="max-height: 70vh;"
  >
    {#snippet header()}
      <div class="flex-fill">
        <h5 id="alertQALabel" class="modal-title">Q&amp;A for Alert:</h5>
        <div class="admin-alert mt-2">
          <div
            {...{ clas: 'd-flex flex-column  align-items-center w-100' } as Record<string, string>}
          >
            <div class="mr-1 d-flex flex-row-reverse">
              <div
                class="d-flex flex-row-reverse justify-content-center align-items-start flex-nowrap mt-1"
              >
                <div class="avatar pl-1">
                  <img
                    alt="qaMsg.avt"
                    src={targetMessage?.senderAvatarUrl ??
                      'https://secure.gravatar.com/avatar/?d=mm&s=50'}
                    loading="lazy"
                    width="50"
                    height="50"
                  />
                </div>
              </div>
              <div class="w-100">
                <div class="d-flex justify-content-between align-items-center w-100">
                  <span
                    {...{ placement: 'top' } as Record<string, string>}
                    {@attach ngbTooltipWith(qaAlertTooltip)}
                    class="created-at mr-2">{qaAlertTimestamp}</span
                  >
                  <div class="d-flex align-items-center justify-content-between flex-nowrap">
                    <strong class="username mx-1">{targetMessage?.senderName ?? ''}</strong>
                  </div>
                </div>
                <div class="msg-left text-formated preText ml-2 mr-2 p-0">
                  {targetMessage?.body ?? ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/snippet}
    {#if qaQuestions.length === 0}
      <div class="my-2">There are no questions.</div>
    {:else}
      <!--
        The captured modal body renders each question through the same <app-st-message> component
        the room uses, as `msg-box pb-1 msg-box-adm` in its reversed layout - not a bespoke list.
      -->
      {#each qaQuestions as question (question.id)}
        <RoomMessage
          item={{
            id: question.id,
            senderId: question.senderId,
            senderName: question.senderName,
            senderEmailHash: question.senderEmailHash,
            senderAvatarUrl: question.senderAvatarUrl,
            body: question.body,
            createdAt: new Date(question.createdAt),
            // Follows the sender, not the viewer. The captured reader-side modal renders another
            // reader's question as plain `msg-box pb-1` in the forward layout and the presenter's
            // answer as `msg-box pb-1 msg-box-adm` reversed; the compiled source picks its toast
            // wording the same way (`const f = s.isA ? 'answer' : 'question'`). Hardcoding true
            // made every entry, including a reader's own question, render as a presenter's.
            isAdmin: question.senderRole === 'staff' || question.senderRole === 'admin',
            // The captured question body carries `questionColor`. RoomMessage otherwise infers that
            // from the text containing a "?", which would drop the colour for a question phrased
            // without one - and inside this modal every entry is a question by definition.
            evidenceQuestion: true
          }}
          kind="chat"
          currentUserId={currentUser.id}
          currentUserEmailHash={currentUser.emailHash}
          viewerIsPresenter={isPresenter}
          {theme}
          menuOpen={qaMenuQuestionId === question.id}
          showDateSeparator={false}
          ontoggle={(id) => (qaMenuQuestionId = qaMenuQuestionId === id ? null : id)}
          onaction={() => {}}
        />
      {/each}
    {/if}
    {#snippet footer()}
      <div id="textAreaHolder" class="d-flex align-items-center textSendDiv flex-fill">
        <div class="flex-fill d-flex mx-0">
          <div class="px-0 flex-fill">
            <textarea
              name="txt-area"
              id="textAreaQATxt"
              rows="1"
              spellcheck="true"
              class="txt-area form-control border-0"
              placeholder={isPresenter ? 'Type your answer here...' : 'Type your question here...'}
              bind:value={qaComposer}
              onkeydown={handleQaKeydown}></textarea>
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
              aria-describedby={qaEmojiOpen ? 'ngb-popover-qa-emoji' : undefined}
              onclick={() => (qaEmojiOpen = !qaEmojiOpen)}
            >
              <i
                {...{ placement: 'left', ngbtooltip: 'Add Emojis' } as Record<string, string>}
                {@attach ngbTooltip}
                class="far fa-smile"
              ></i>
            </span>
            {#if qaEmojiOpen}
              <EmojiPicker
                popoverId="ngb-popover-qa-emoji"
                onselect={(glyph) => (qaComposer += glyph)}
              />
            {/if}
            <!--
              The compiled component gates this node on `canPostImages`
              (`O(23, o.canPostImages ? 23 : -1)` in app-alert-qa-modal.full.js), which is why the
              captured reader-side footer carries only the emoji button.
            -->
            {#if isPresenter}
              <span class="textAreaBtns">
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
          </div>
        </div>
      </div>
    {/snippet}
  </Modal>
</app-alert-qa-modal>
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
              <img
                src={user.pic || `https://secure.gravatar.com/avatar/${user.emailHash}?d=mm&s=30`}
                alt={user.nick}
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
              <img
                src={user.pic || `https://secure.gravatar.com/avatar/${user.emailHash}?d=mm&s=30`}
                alt={user.nick}
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
    title="All private messages:"
    {onclose}
  >
    <div class="text-center my-4">
      <h5><i class="ml-2 fas fa-spinner fa-spin"></i> Loading...</h5>
    </div>
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
          <div class="log-messages">
            {#each advancedSearchResults as result (result.id)}
              <p>{result.body}</p>
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
    title="Filter out alerts from the following:"
    {onclose}
    bodyClass="pt-1"
    footerClass="d-flex align-items-center justify-content-between"
  >
    <div class="form-check m-2">
      <input
        type="checkbox"
        value=""
        id="show-alerts"
        class="form-check-input ng-untouched ng-pristine ng-valid"
      />
      <label for="show-alerts" class="form-check-label">
        Only show alerts from these people:
      </label>
    </div>
    <p>List is empty.</p>
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal>
</app-alert-filter-modal>
<app-webrtc-troubleshooter>
  <Modal
    id="webrtc-troubleshooter-modal"
    open={name === 'connectivity'}
    closedAriaHidden
    ariaLabelledby="webrtc-troubleshooter-modal"
    title="Connectivity/Mic Troubleshooter"
    titleClass="modal-title"
    titleTag="h3"
    dialogStyle="max-width: 540px;"
    {onclose}
  >
    {#snippet beforeBody()}
      <ul role="tablist" class="nav nav-tabs troubleshooter-tabs">
        <li role="presentation" class="nav-item">
          <button
            type="button"
            role="tab"
            class:active={activeConnectivityTab === 'network'}
            class="nav-link"
            onclick={() => onConnectivityTabChange('network')}
          >
            <i class="fas fa-network-wired me-1"></i> Network Test
          </button>
        </li>
        {#if isPresenter}
          <li role="presentation" class="nav-item">
            <button
              type="button"
              role="tab"
              class:active={activeConnectivityTab === 'mic'}
              class="nav-link"
              onclick={() => onConnectivityTabChange('mic')}
            >
              <i class="fas fa-microphone me-1"></i> Mic Test
            </button>
          </li>
        {/if}
      </ul>
    {/snippet}
    {#if activeConnectivityTab === 'network'}
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
        <div
          class:passed={testStates.udp === 'passed'}
          class:failed={testStates.udp === 'failed'}
          class="status-item mb-3"
        >
          <span class="fw-medium">UDP Enabled</span>
          <span
            class:spin={testStates.udp === 'pending' && isTestRunning}
            class="status-icon {testStates.udp}"
          >
            {testStates.udp === 'pending'
              ? isTestRunning
                ? '...'
                : '●'
              : testStates.udp === 'passed'
                ? '✔'
                : '✖'}
          </span>
        </div>
        <div
          class:passed={testStates.tcp === 'passed'}
          class:failed={testStates.tcp === 'failed'}
          class="status-item mb-3"
        >
          <span class="fw-medium">TCP Enabled</span>
          <span
            class:spin={testStates.tcp === 'pending' && isTestRunning}
            class="status-icon {testStates.tcp}"
          >
            {testStates.tcp === 'pending'
              ? isTestRunning
                ? '...'
                : '●'
              : testStates.tcp === 'passed'
                ? '✔'
                : '✖'}
          </span>
        </div>
        <div
          class:passed={testStates.stun === 'passed'}
          class:failed={testStates.stun === 'failed'}
          class="status-item mb-3"
        >
          <span class="fw-medium">STUN Server Connectivity</span>
          <span
            class:spin={testStates.stun === 'pending' && isTestRunning}
            class="status-icon {testStates.stun}"
          >
            {testStates.stun === 'pending'
              ? isTestRunning
                ? '...'
                : '●'
              : testStates.stun === 'passed'
                ? '✔'
                : '✖'}
          </span>
        </div>
        <div
          class:passed={testStates.turn === 'passed'}
          class:failed={testStates.turn === 'failed'}
          class="status-item mb-4"
        >
          <span class="fw-medium">TURN Server Connectivity</span>
          <!-- `–` for unconfigured, never `✖`. A cross next to "check your network or firewall"
               reads as the user's fault; this deployment simply has no relay set. -->
          <span
            class:spin={testStates.turn === 'pending' && isTestRunning}
            class="status-icon {testStates.turn}"
            title={testStates.turn === 'unconfigured'
              ? 'No TURN relay is configured for this deployment'
              : undefined}
          >
            {testStates.turn === 'pending'
              ? isTestRunning
                ? '...'
                : '●'
              : testStates.turn === 'passed'
                ? '✔'
                : testStates.turn === 'unconfigured'
                  ? '–'
                  : '✖'}
          </span>
        </div>
        {#if showConnectivityMessage}
          <div
            class:alert-success={connectivityMessageText.includes('passed')}
            class:alert-danger={connectivityMessageText.includes('failed')}
            class="alert alert-info"
          >
            {connectivityMessageText}
          </div>
        {/if}
      </div>
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
          <div class:active={isMicTesting} class="waveform-wrapper mb-3">
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
              <span class:active={isMicTesting} class="volume-value">{micLevel}%</span>
            </div>
            <div class="volume-bar-track">
              <div
                class:low={micLevel <= 30}
                class:mid={micLevel > 30 && micLevel <= 70}
                class:high={micLevel > 70}
                class="volume-bar-fill"
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
                  class:recording={isRecording}
                  class="btn btn-mic-record"
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
                  <i class:fa-play={!isPlayingBack} class:fa-volume-up={isPlayingBack} class="fas"
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
      {#if activeConnectivityTab === 'network'}
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
    <div id="msgTxtContainer"></div>
    {#snippet footer()}
      <div class="d-flex justify-content-between w-100 align-items-center">
        <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
          Close
        </button>
        <button type="button" class="btn btn-primary"><span>Send</span></button>
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
                class="filedrag"
                class:hover={dragHover}
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
