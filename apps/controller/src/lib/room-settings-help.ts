import type { RoomSettingDef } from './room-settings-schema';

/**
 * Helper copy for the Settings pane, corrected and completed from the rendered reference.
 *
 * `room-settings-schema.ts` is GENERATED and byte-verified against
 * `scripts/extract-manage-schema.mjs` (see `scripts/verify-room-settings-schema.mjs`), so nothing
 * below can be written into it by hand — the next `pnpm schema:extract` would erase it, and until
 * then `schema:verify` would call the checked-in file stale. This overlay is therefore the place
 * the corrections live, and it is applied at render time only.
 *
 * Two separate things are wrong in the generated file, both of them consequences of how the
 * extractor reads helper copy — it takes "the `label.muted` that follows", and nothing else:
 *
 * 1. Settings whose helper is a CLASSLESS `<label>` came out with `help: null`, so their row
 *    rendered three nodes short. Eight are in the pane above the Token Badges row (file2:1247,
 *    1474, 1501, 1507, 1512, 1517, 1523 and 1528); thirty-three more are below it, read one by one
 *    out of file2:1741-2506 and listed with their line numbers in `CLASSLESS` below.
 * 2. THREE whose helper text arrived damaged: `allowedPerms` lost the last two dots of its "…both
 *    must match..." (file2:1097; its sibling `allowedProducts`, file2:1092, kept all three, so
 *    this is not a deliberate normalisation), and `alertLabels` (file2:1702-1715) and
 *    `subscriptionPlans` (file2:1870-1883) were both cut off mid-token inside their JSON samples —
 *    at exactly 160 characters, which is `scripts/outline.mjs:41`, `text.slice(0, 160)`, feeding
 *    the extractor a truncated text node before it ever looks at it.
 *
 * `shape` says which of THREE forms the reference uses for the copy, and `br` whether a `<br>`
 * precedes it. Both are read off the capture per row. The majority — and therefore the default for
 * anything this file does not mention — is `<br><label class="muted">`.
 *
 * HONEST GAP: neither distinction is recorded anywhere in the evidence as a FLAG — both are read
 * off each helper's markup in file2, one by one. The fields are ours, the values are the capture's.
 */
export interface SettingHelp {
  readonly text: string;
  /**
   * How the reference wraps the copy:
   *   'muted' — `<label class="muted">`, the majority
   *   'plain' — a CLASSLESS `<label>`
   *   'text'  — no element at all: a bare text node on the row's own `<p>`
   */
  readonly shape: 'muted' | 'plain' | 'text';
  /** whether the reference puts a `<br>` between the editable and the copy */
  readonly br: boolean;
}

/**
 * Forty-one classless helpers, transcribed from the lines named against each.
 *
 * `autoOpenTime` and `autoCloseTime` carry two TRAILING spaces in the capture (file2:1523, 1528).
 * They are dropped here rather than hidden in a string literal: HTML collapses trailing
 * whitespace before a closing tag, so nothing on screen depends on them.
 *
 * `regUserCanPresent` carries a DOUBLE space in "will  have" (file2:2265). It is kept, because a
 * string literal is the one form `prettier --write` cannot silently repair — the same reason
 * `dtNote` takes its copy as an argument rather than as template text.
 */
const CLASSLESS: Record<string, string> = {
  usernameInstructions: 'Instructions how user can edit his username',
  showArchivesToSpecificPresenters: 'Comma separated list of Presenter emails',
  banIPList: 'Comma separated list of banned IPs',
  reportEmail: 'Comma separated list of emails to receive abuse reports',
  customJWTErrorMessage: 'Set a custom JWT error message',
  sendOpenCloseEmail: 'Comma separated list of emails to receive open / close room events',
  autoOpenTime: 'Time in Military EST to automatically OPEN the room. i.e. 7:30',
  autoCloseTime: 'Time in Military EST to automatically CLOSE the room. i.e. 18:30',

  /* file2:1833 */ altBenzingaLogoURL: 'Set custom Benzinga logo url',
  /* file2:1838 */ altBenzingaLinkURL: 'Set custom Benzinga link url',
  /* file2:1903 */ collectsUserStats: 'Only enabled if you need granular Users Stats',
  /* file2:1989 */ isAlertOnly:
    "Alerts only rooms are just rooms to receve push notifications and nothing else. Don't use this if you don't know what it is!!!",
  /* file2:1996 */ customClientAlertPostURL: 'POST alerts to this URL endpoint',
  /* file2:2001 */ customClientAlertPostSecret: 'secret PW for the endpoint above',
  /* file2:2025 */ privMessageHugePopup: "Some user can't see the private messages, this makes a HUGE popup",
  /* file2:2034 */ hasChannelTabs: 'This setting adds an OffTopic, channel tabs next to general chat',
  /* file2:2042 */ autoSwitchToOfftopics: 'Auto Switch to OffTopic tab',
  /* file2:2051 */ hasAdminOnlyChannel: 'This setting adds an admin/presenter dedicated chat tab',
  /* file2:2058 */ extraAdminChannels: 'Comma separated list of extra admin channels',
  /* file2:2066 */ extraRegChannels: 'Comma separated list of extra regular (anyone can post) channels',
  /* file2:2072 */ altGenChannelName: 'Rename the Main Chat channel to...',
  /* file2:2077 */ altOffTopicChannelName: 'Rename the Off-Topic channel to...',
  /* file2:2083-2097, one line here for the reason given on CORRECTED below */
  chatTabsWithBadges:
    'List of chat tabs with badges: [ { "name": "easy channel", "badges": [ "61eafd612fcdee7bc8e979bc", "6489f1f98993a677b83cdd70" ] }, { "name": "harder channel", "badges": [ "61eafd612fcdee7bc8e979bc" ] } ]',
  /* file2:2107 */ hasProfanityFilter: 'Profanity filter will try to filter (put xxxx) on bad words',
  /* file2:2112 */ ingnoreBadWordsList: 'Comma separated list OK words to remove from the filter',
  /* file2:2117 */ additionalBadWordsList: 'Comma separated list of additional bad words you want to filter',
  /* file2:2132 */ simplifiedEditor: 'If enabled, the Note Editor will be simplified.',
  /* file2:2142 */ audioMeterDisabled:
    'Turn this on to disable the audio level meter next to the presenter name when they are talking',
  /* file2:2178 */ hideRecs: 'If enabled, recordings will be hidden in archives',
  /* file2:2186 */ recordingReminder: 'If enabled, will show recording reminder popup',
  /* file2:2194 */ recsInRoom: 'If enabled, will show recordings tab in the room',
  /* file2:2202 */ downloadRecordingsDisabled: 'If enabled, will disable download button for Recordings for users',
  /* file2:2211 */ hasSpeechRecognitionDisabled: 'If enabled, will disable closed captioning for the room',
  /* file2:2219 */ dontShowRecInfoToUsers: 'If enabled, will hide recording info for users',
  /* file2:2249 */ stickyGiveMicAndCam: 'If enabled, when a presenter gives mic/cam, the setting will stick',
  /* file2:2257 */ overlayUserIdOnScreenshare: 'If enabled, it will overlay userID on screenshare',
  /* file2:2265 */ regUserCanPresent:
    'If enabled, ALL regular users will  have mic/screenshare in the room. ***** CAREFULL ******',
  /* file2:2273 */ dontStopRecOnMicMute: "Don't auto stop the rec on mic mute",
  /* file2:2281 */ individualVolumeControls: 'Individual volume controls for each Presenter',
  /* file2:2290 */ remote_recording: 'new experimental serverside rec control, more reliable?',
  /* file2:2415 */ hqVideo: 'Experimental better vid quality on vp8'
};

/**
 * The four helpers the reference does NOT precede with a `<br>`.
 *
 * Every other helper in the pane sits behind one. These four are butted straight onto the
 * editable — file2:1902-1903 and 2414-2415 put the `<label>` on the line after the closing `</a>`
 * with nothing between, and file2:2111-2112 and 2116-2117 do the same inside the two profanity
 * rows. A `<br>` is an element to the shape comparison, so this is not cosmetic.
 */
const NO_BR = new Set(['collectsUserStats', 'hqVideo', 'ingnoreBadWordsList', 'additionalBadWordsList']);

/**
 * Three helpers that are a BARE TEXT NODE on the row's own `<p>` — no `<br>`, no element at all.
 *
 * file2:2459, 2469 and 2477. The same shape the DON'T TOUCH block already models with `dtNote`.
 * The latter two open with the capture's own `&nbsp;&nbsp;` (file2:2469, 2477), written here as
 * two `\u00a0` escapes rather than as the literal characters, which are invisible in a diff.
 */
const BARE: Record<string, string> = {
  sendFcmAlertsNew: 'Use pub/sub for notifications',
  ptrMobileAppExpirePairCodeDays:
    '\u00a0\u00a0If user does not log in from regular site, mobile app token will expire after this many days',
  mobileAppExpireNotificationsDays:
    "\u00a0\u00a0If user does not log in this many days, we'll stop sending push notifications"
};

/**
 * Three muted helpers the extractor damaged.
 *
 * `alertLabels` and `subscriptionPlans` are written on one line each. The capture spreads the same
 * JSON samples over fourteen lines apiece (file2:1702-1715 and 1870-1883), and an HTML text node
 * collapses every run of whitespace to a single space, so one line and fourteen paint identically —
 * these are the collapsed forms, not rewrites.
 */
const CORRECTED: Record<string, string> = {
  allowedPerms:
    'Leave blank to let all members in. Comma seprated list of valid permissions the user needs to have to enter. Either a product or membership, or both must match...',
  alertLabels:
    'JSON array of alert labels, i.e. [ { "name": "Day Trade", "hash": "DayTrade", "color": "#9c4537", "bgcolor":"#e8f5f7" }, { "name": "Swing Trade", "hash": "SwingTrade", "color": "#24794f", "bgcolor":"#e8f5f7" } ]',
  subscriptionPlans:
    'JSON array with subscription plans, i.e. [{ "name": "Basic Plan", "fee": 4.99, "desc": "Basic Plan Description.", "recommended": false }, { "name": "Pro Plan", "fee": 9.99, "desc": "Pro Plan Description.", "recommended": true },]'
};

/** The helper a settings row should render, or null when the reference gives it none. */
export function settingHelp(def: Pick<RoomSettingDef, 'name' | 'help'>): SettingHelp | null {
  const bare = BARE[def.name];
  if (bare !== undefined) return { text: bare, shape: 'text', br: false };

  const classless = CLASSLESS[def.name];
  if (classless !== undefined) return { text: classless, shape: 'plain', br: !NO_BR.has(def.name) };

  const text = CORRECTED[def.name] ?? def.help;
  return text === null || text === undefined ? null : { text, shape: 'muted', br: true };
}
