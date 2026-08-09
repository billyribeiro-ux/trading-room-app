/**
 * Contracts supplied after the part-1 JSON capture.
 *
 * These facts are kept separate from DUMP_CONTRACT so later evidence does not
 * rewrite the measurements or nodes that were present in the original file.
 */
export const DIRECT_EVIDENCE_CONTRACT = {
  populatedRoom: {
    primaryFlex: 'calc(25.5107% - 2.80618px)',
    presentationFlex: 'calc(74.4893% - 8.19382px)',
    primaryPercent: 25.5107,
    alertsFlex: 'calc(40.1365% - 4.41502px)',
    chatFlex: 'calc(59.8635% - 6.58498px)'
  },
  rootHostOrder: [
    'app-user-info-modal',
    'app-play-youtube-modal',
    'app-user-settings-modal',
    'app-av-settings-modal',
    'app-debug-log-modal',
    'app-post-alert-modal',
    'app-poll-modal',
    'app-chat-logs-modal',
    'app-alert-logs-modal',
    'app-session-control-modal',
    'app-mobile-app-info-modal',
    'app-reply-modal',
    'app-alert-qa-modal',
    'app-muted-users-modal',
    'app-followed-users-modal',
    'app-screenshare-preview',
    'app-rec-preview',
    'app-followed-users-modal',
    'app-scheduled-alerts-modal',
    'app-alert-send-report-modal',
    'app-all-user-pmmodal',
    'app-alerts-advanced-search',
    'app-alert-filter-modal',
    'app-webrtc-troubleshooter',
    'app-rich-text-editor',
    'app-privchat'
  ],
  suppliedMessageStates: {
    alertMessages: 8,
    alertDateSeparators: 2,
    alertStockSpans: 3,
    alertUploadedImages: 1,
    alertQuestionCountBadges: 1,
    alertAnsweredChecks: 1,
    chatMessages: 10,
    chatDateSeparators: 2,
    chatAdminReverseRows: 6,
    chatQuestionRows: 4
  },
  appStMessage: {
    rawPopulatedDomSha256: '09fabcc5f80a60e8835095d134d2225506a1a30ef47ac29fe09f611104b119f3',
    decodedSourceSha256: 'c0131a289b126877190c20129d537f45d360057c86f68f41df4ce2cde6137058',
    renderHelpersSha256: '4074796645917e368d9db1cc0307185cd37839abc6021ee1bc1dca8c7241dff7',
    componentCssSha256: '538caba947070d791bfefb5f995788469f84bdf14f769f69dd94394a773781f1',
    // Re-pinned after scripts/build-captured-message-fixture.mjs began emitting the intrinsic
    // width/height of each uploaded image alongside its url. The captured markup carries no
    // width/height attributes, so without them the browser has no aspect ratio to reserve and the
    // alert/chat list jumps when the bytes arrive. The values come from the asset's own PNG IHDR,
    // not from a guess; see IMAGE_INTRINSIC_SIZES in that script.
    capturedFixtureSha256: 'af37de13b3be6d793548cd907a6e8f04142f9759388f2a7fa1eef75046e3c477',
    kebabText: '⠇ ',
    kebabClass: 'msgMenu dropright pt-1',
    menuClass: 'dropdown-menu users-dropdown-options',
    presenterAlertMenu: [
      'Delete Message',
      'Mute Chat for 24hrs',
      'User Info',
      'Mention',
      'Show message to all',
      'Alert Send Report',
      'Copy',
      'Private Chat'
    ],
    presenterAdminChatMenu: [
      'Delete Message',
      'User Info',
      'Mention',
      'Show message to all',
      'Reply',
      'Mark Answered',
      'Private Chat'
    ],
    deleteConfirmMessage: 'Are you sure you want to delete this message by {name}. text: {text}',
    deleteConfirmAlert: 'Are you sure you want to delete this alert by {name}. text: {text}',
    deleteOwnConfirm: 'Are you sure you want to delete your message: {text}',
    muteConfirm: 'Are you sure you want to mute this user for 24 hours?',
    muteSuccess: 'User chat muted.',
    missingUser: 'Could not retrieve user info.',
    copyToast: 'Copied to clipboard.'
  },
  postAlert: {
    decodedSourceSha256: '44c5bfd1b37d216789815bc09cef48d148336fb88e0c7778d5585d1a46fcd482',
    renderHelpersSha256: '1aa25e293db333dbe991dcceee1ce836aa0ca61184889610c42260c482a6d4ad',
    componentCssSha256: '523b3c0febd4d84b09d6d49efcc688a87ec6abe5603970e0312a1707eceacfe2',
    rawDomSha256: '5c59885c014cb631fe4b33fb683f9bc4be0caeb30eaa2e483a7c58ee744f51c9',
    cleanDomSha256: '7c7b7703c5c53492f9d09e4c4a44d1e9c6f4fb23e1b4af70b06d5b43984ea683',
    focusedInnerDomSha256: '34133c8f39e47f3df967efd019bc2704afdec82f09ae074a7c8357e41b01a921',
    toastHostSha256: '5cfcae77ce68233164c177465971c4f1a7c2183479a04f650b9b8878fe983ef6',
    tabs: ['text', 'url', 'media'],
    sourceTabs: ['text', 'link', 'img'],
    sharedUrlState: 'alertUrl',
    legalDisclosure: 'FOR EDUCATIONAL PURPOSES ONLY, NOT FINANCIAL ADVICE',
    urlSchemeError: 'The link seems to be missing "https://" or "http://"',
    uploadPath: '{upload_server}/image/{sessionID}',
    uploadAuthorization: 'Client-ID {cdn_upload_key}',
    visibleFlags: ['keepOpen', 'postOnX', 'dontPush', 'nonTradeAlert', 'legalDisclosure'],
    hiddenCapabilityBranches: [
      'sendText',
      'alertLabels',
      'dontCrossPost',
      'sendLater',
      'scheduledAlerts'
    ],
    presenterHeaderActions: ['Poll', 'Post Alert'],
    idleToastHost: true
  },
  doNotDisturb: {
    alertBadgeClass: 'badge badge-danger ms-2',
    chatBadgeClass: 'badge badge-danger ml-2',
    badgeIconClass: 'fas fa-bell-slash',
    badgeText: 'DND',
    preferenceKey: 'doNotDisturbOn',
    defaultValue: false,
    activationToast: false,
    standaloneModal: false
  },
  composerFocus: {
    selector: '.txt-area:focus',
    borderColor: 'var(--darker-gray)',
    boxShadow: '1px 1px 1px var(--darker-gray)',
    bootstrapFocusRing: false
  },
  composerActions: {
    initialExpanded: false,
    expandAtWidth: 400,
    collapsedIconClass: 'fas fa-plus',
    collapsedTooltip: 'Show message options',
    collapsedTooltipPlacement: 'left',
    clickBehavior: 'open-only',
    canPostImages: '(isPresenter || sessData.userUploads)',
    presenterOrder: ['Add Emojis', 'Upload an Image', 'Play YouTube For All', 'Search for GIFs'],
    youtubeModalTarget: '#play-youtube-modal',
    giphyRating: 'pg'
  },
  emojiPicker: {
    dumpSha256: '7b91da2971d1b1dbf332750d195ede2e6a53201578ac276c343e08821e3cf275',
    /*
      Width is upstream's runtime formula, not a pinned pixel count:
      perLine * (emojiSize + 12) + 12 + 2 + measureScrollbar
      (docs/source/main.d6d3c112b59b7d0d.js). The captures disagree on the total only
      because they disagree on the scrollbar: the chat-composer capture
      (first-dump/decoded/01-caps/53-emoji-popover:0) measures 338 with overlay
      scrollbars, /emojis records 353 from a session where they take 15px.
    */
    perLine: 9,
    emojiSize: 24,
    baseWidth: 338,
    observedWidths: { overlayScrollbar: 338, classicScrollbar: 353 },
    height: 425.188,
    spriteSheet:
      'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@14.0.0/img/apple/sheets-256/64.png',
    categoryCount: 9,
    renderedEmojiElements: 1823
  }
} as const;
