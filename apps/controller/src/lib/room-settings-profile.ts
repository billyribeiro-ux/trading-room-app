import { ROOM_SETTING_BY_NAME, type RoomSettings } from './room-settings-schema';

/**
 * The settings a newly created room starts with: **every feature switched on**, so anyone
 * evaluating the product gets the whole thing rather than an empty shell.
 *
 * ## Why this exists
 *
 * `room-settings-schema.ts` carries a `captured` value per setting, and it is labelled "Evidence,
 * not a default" for good reason — those values are the REFERENCE's own free-sample tenant, which
 * has most things off. Copying them would ship a demo deliberately configured to show as little as
 * possible. Until this file, `createRoom` wrote no settings row at all, which was worse still: a
 * new room resolved to `{}` and every feature was off.
 *
 * This is a product decision, not evidence. It is a **seed, not a lock**: it is written into
 * `room_settings` at creation, the owner can change any key afterwards, and changing this table
 * later affects only rooms created after the change.
 *
 * ## Why it is a hand-written list and not a filter
 *
 * "Turn on every checkbox" is actively wrong. 33 of the 141 checkbox settings are negative
 * polarity — `hideNotes`, `hideFiles`, `hideChatAlerts`, `disableEmojis`, `hideWebcamForRoom`,
 * `hasSpeechRecognitionDisabled` — so flipping them all true produces the *least* featured room
 * possible. Several more read as positive and are not: `isChatOnlyRoom` removes audio and video
 * outright, and `simplifiedEditor` takes tools away from the note editor.
 *
 * So every entry below was chosen by reading its label and help text, and every exclusion is
 * recorded in {@link DELIBERATELY_OFF} with the reason. A reviewer can check both lists against the
 * schema; `room-settings-profile.test.ts` checks that they stay consistent with it.
 *
 * ## Honest limit
 *
 * A setting the room does not read yet does nothing when enabled. Only the `wired` subset has a
 * consumer today, and the rest are stored and inert until the room grows one. They are included
 * anyway so the seed does not have to be revisited each time a consumer lands — but nobody should
 * read "enabled" here as "working".
 */
export const FULL_EXPERIENCE_SETTINGS: Partial<RoomSettings> = {
  /* ---- Roster: visible, counted, and showing everyone ---------------------------------- */
  rosterVisibleToViewers: true,
  rosterCountVisibleToViewers: true,
  alwaysShowRoster: true,

  /* ---- Chat ---------------------------------------------------------------------------- */
  userPM: true,
  userToPresenterPM: true,
  enablePrivateMessageHistory: true,
  hasTypingIndicator: true,
  usersPublicReply: true,
  usersCanDeleteOwnMsgs: true,
  enableEditMessage: true,
  enableReactions: true,
  enableRTE: true,
  userUploads: true,
  hasChannelTabs: true,
  hasAdminOnlyChannel: true,
  enableDeleteLog: true,
  claimNickName: true,
  allowUsersToChangeUsername: true,

  /* ---- Alerts -------------------------------------------------------------------------- */
  hasQAOnAlerts: true,
  enableQAReactions: true,
  enableEditAlerts: true,
  advancedSearchAlerts: true,
  hasAlertScheduler: true,
  hasSwingTradeAlerts: true,
  hasDayTradeAlerts: true,
  copyTrades: true,

  /* ---- Media and recording -------------------------------------------------------------- */
  enableVideoPlayer: true,
  individualVolumeControls: true,
  stickyGiveMicAndCam: true,
  recordChat: true,
  archiveAlertsLog: true,
  archiveChatLog: true,
  recsInRoom: true,
  showArchivesToUsers: true,

  /* ---- Identity and presentation --------------------------------------------------------- */
  enableBadges: true,
  enableLiveStats: true
};

/**
 * Everything deliberately left off, and why.
 *
 * Kept as data rather than prose so the test can assert that nothing appears in both lists and
 * that every name here is a real setting. A reviewer arguing for a change edits one table.
 */
export const DELIBERATELY_OFF: ReadonlyArray<{ name: keyof RoomSettings; because: string }> = [
  {
    name: 'regUserCanPresent',
    because:
      'Gives EVERY visitor mic and screenshare with no grant step — the reference’s own help text says "***** CAREFULL ******". Owner decision, 2026-08-07: grant per person through the permissions modal instead.'
  },
  {
    name: 'isChatOnlyRoom',
    because: 'Reads as a feature and is the opposite: "only text based chat/alerts, no audio/video".'
  },
  {
    name: 'isAlertOnly',
    because:
      'Reduces the room to push notifications. Its own help text: "Don’t use this if you don’t know what it is!!!".'
  },
  {
    name: 'simplifiedEditor',
    because: 'Takes tools away from the note editor. Positive name, reducing effect.'
  },
  {
    name: 'onlyPresentersVisibleToViewers',
    because: 'Hides members from the roster. Contradicts showing the full roster.'
  },
  { name: 'showOnlyUsernames', because: 'Shows less about each member, not more.' },
  {
    name: 'showBadgesToPresentersOnly',
    because: 'Restricts badges to presenters; the point of enabling badges is that members see them.'
  },
  {
    name: 'chatDisabledForTrials',
    because: 'Silences trial users — the exact people evaluating the product.'
  },
  {
    name: 'fileAccessCaseByCase',
    because: 'Gates the shared drive per person; extra friction in a demo.'
  },
  {
    name: 'chatAutoClear',
    because: 'Wipes the chat nightly. A tester would lose what they had just done.'
  },
  {
    name: 'alertsAutoClear',
    because: 'Wipes the alert log nightly, for the same reason chatAutoClear is off.'
  },
  {
    name: 'chatAutoClearWeekend',
    because: 'Wipes the chat every Sunday; a room evaluated over a weekend would come back empty.'
  },
  {
    name: 'autoResetSession',
    because: 'Resets the whole session at midnight, discarding whatever a tester set up.'
  },
  {
    name: 'isMainRoom',
    because: 'A designation for one room on an account rather than a feature, and only one room can hold it.'
  },
  {
    name: 'hasRequiredPhoneInLogin',
    because: 'Adds a required field at the door. Real feature, wrong default for evaluation.'
  },
  {
    name: 'showPasswordField',
    because: 'Adds a password field to a room that has no password set.'
  },
  {
    name: 'forgotRoomPassword',
    because: 'Only meaningful once a room password exists.'
  },
  {
    name: 'enableTokenBadges',
    because: 'Sources badges from a JWT; needs the SSO subsystem, which is unbuilt.'
  },
  {
    name: 'sendReportEmails',
    because: 'Needs mail transport, which does not exist yet (OUTSTANDING §1b.4).'
  },
  {
    name: 'hasAppPairLink',
    because: 'Needs `pairSecretKey`; renders a pairing link that cannot work without it.'
  },
  {
    name: 'positionsIframe',
    because: 'Needs `positionsIframeUrl`; enabling it alone shows an empty frame.'
  },
  { name: 'tipMeBtnEnabled', because: 'Needs `tipMeBtnUrl`; the button would go nowhere.' },
  {
    name: 'tawkPresenterSupport',
    because: 'Third-party Tawk widget; not ours to enable on a customer’s behalf.'
  },
  {
    name: 'collectsUserStats',
    because: 'Its help text says to enable it "only if you need granular Users Stats" — a cost, not a feature.'
  },
  {
    name: 'remote_recording',
    because: 'Described in the reference as "new experimental serverside rec control".'
  },
  {
    name: 'hqVideo',
    because: 'The reference describes it as "Experimental better vid quality on vp8".'
  },
  { name: 'sendFcmAlertsNew', because: 'An alternate FCM method, not an added capability.' },
  {
    name: 'iframeSSOTFix',
    because: 'A workaround for a specific cookie problem; enabling it blind is cargo-culting.'
  },
  {
    name: 'privMessageHugePopup',
    because: 'A workaround for users who miss PMs, not something to inflict by default.'
  },
  {
    name: 'autoSwitchToOfftopics',
    because: 'Moves a member off the main chat automatically.'
  },
  {
    name: 'hasProfanityFilter',
    because: 'Rewrites members’ messages. A deliberate moderation choice, not a default.'
  },
  {
    name: 'altChatRender',
    because: 'An ALTERNATIVE layout, not an addition — enabling it hides avatars and compacts chat.'
  },
  {
    name: 'altRoomRender',
    because: 'Another alternative render that simplifies alerts and chat rather than adding to them.'
  },
  {
    name: 'darkThemeAsDefault',
    because: 'A preference either way; left to the owner rather than chosen for them.'
  },
  {
    name: 'autoRecord',
    because:
      'Starts recording presenters automatically. Recording people without them choosing to is not a default we set.'
  }
];

/**
 * The seed for a newly created room.
 *
 * A function rather than the constant so callers cannot mutate the shared object, and so a future
 * per-plan variation has one place to live.
 */
export function newRoomSettings(): Partial<RoomSettings> {
  return { ...FULL_EXPERIENCE_SETTINGS };
}

/** Every name used above must be a real setting; exported so the test can check both tables. */
export function unknownProfileSettings(): string[] {
  const names = [...Object.keys(FULL_EXPERIENCE_SETTINGS), ...DELIBERATELY_OFF.map((entry) => entry.name)];
  return names.filter((name) => !ROOM_SETTING_BY_NAME.has(name));
}
