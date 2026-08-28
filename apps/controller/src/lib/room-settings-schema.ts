// GENERATED — do not edit by hand.
// Source: evidence-dumps/login-page/manage (served DOM of the reference's #/page/manageSession)
// Regenerate: pnpm schema:extract
//
// 268 room settings extracted from the reference controller.
// 1 reviewed product deviation (roomType) is added; 269 settings total.
// By type: text 35, combodate 1, select 2, textarea 84, checkbox 141, number 5, html 1.
// By section: room-form 3, sso-setup 1, settings 264, branding 1.
// 154 extracted settings had a captured value; 114 were unset.
// roomType has no captured value because its editor sits inside an HTML comment in the
// served DOM (byte 2,377) — PRESENT in the evidence, just not rendered as a control. Said
// precisely because "absent from evidence" is the phrasing that makes the next reader search,
// find nothing, and conclude the reference lacks the field. It does not: the property is live,
// and ng-show="sess.roomType=='webinar'" reads it at byte 2,652 to reveal the Date row.
//
// `wired` is the honest bit: false means the controller can store the value but
// nothing in the room reads it yet. 83 of 269 are wired today.
// Flip one to true ONLY when a consumer exists, so the UI can mark the rest
// instead of pretending they do something.

export type RoomSettingSection =
  | 'branding'
  | 'room-form'
  | 'settings'
  | 'sso-setup';

export type RoomSettingType =
  | 'checkbox'
  | 'combodate'
  | 'date'
  | 'html'
  | 'number'
  | 'select'
  | 'text'
  | 'textarea';

export interface RoomSettingDef {
  /** Key as stored in room_settings.settings_json, and as the reference names it. */
  readonly name: string;
  /** Which controller surface exposes this field. */
  readonly section: RoomSettingSection;
  readonly type: RoomSettingType;
  /** Label exactly as the reference renders it, including its typos. */
  readonly label: string | null;
  /** Helper copy shown under the field. */
  readonly help: string | null;
  /**
   * How the reference WRITES that helper, which differs per field and is part of the match.
   *
   * Counted across the capture: 136 `muted` (`<br><label class="muted">`), 37 `plain`
   * (`<br><label>`) and 5 `bare` (`<label>` with no `<br>`). Rendering one shape for all of
   * them put a class on 42 helpers that have none and a `<br>` before 5 that have none.
   */
  readonly helpShape: 'muted' | 'plain' | 'bare' | 'text' | null;
  /** True when the reference puts the helper OUTSIDE the row's `<p>`, as a sibling of it. */
  readonly helpOutside: boolean;
  /**
   * Value observed in the captured tenant. null = unset. Evidence, not a default.
   *
   * For every type EXCEPT select and combodate this is also the stored value.
   * For those two it is what the reference DISPLAYED — an option's label, or a
   * date formatted MM/DD/YYYY @ hh:mm A — and the underlying value is
   * something else entirely. capturedIsDisplayOnly says which, so a seed
   * cannot mistake one for the other. It did once: authMode was seeded as
   * "Open - Anyone with the room link can join with their email & name".
   */
  readonly captured: string | number | boolean | null;
  /** true when the captured text is display text rather than the stored value */
  readonly capturedIsDisplayOnly: boolean;
  /** 'dont-touch' for the block the reference hides behind a click on "TOUCH". */
  readonly group: 'dont-touch' | null;
  /** False until something in the room actually consumes this setting. */
  readonly wired: boolean;
}

export const ROOM_SETTINGS: readonly RoomSettingDef[] = [
  { name: "name", section: "room-form", type: "text", label: "Room Title", help: null, helpShape: null, helpOutside: false, captured: "Room 3627", capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "webinarDate", section: "room-form", type: "combodate", label: "Date:", help: null, helpShape: null, helpOutside: false, captured: "07/25/2026 @ 05:25 PM", capturedIsDisplayOnly: true, group: null, wired: false },
  { name: "authMode", section: "room-form", type: "select", label: "Authorization Mode", help: null, helpShape: null, helpOutside: false, captured: "Open - Anyone with the room link can join with their email & name", capturedIsDisplayOnly: true, group: null, wired: false },
  { name: "ssoHost", section: "sso-setup", type: "text", label: "SSO Host", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "ssoJWTSecret", section: "settings", type: "textarea", label: "JWT Secret Key:", help: "Use this key in combination with the WordPRess plugin, or other JWT SSO, make it hard to getss, like: '5081b73a690762e2526bc1fef3c46eedf1ec8832'", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "allowPWLoginWithSSO", section: "settings", type: "checkbox", label: "Allow PW based logins on SSO?", help: "if ON, you can give a link and PW to enter the SSO room as well", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "tokenExpiresIn", section: "settings", type: "textarea", label: "Token Expiration", help: "A string like '1d', '1h', '12h\" etc...", helpShape: "muted", helpOutside: false, captured: "1d", capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "webinarPW", section: "settings", type: "textarea", label: "Room Password:", help: "Give this password to your", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "webinarPW2", section: "settings", type: "textarea", label: "Temp Room Password:", help: "Temp password/additional pw.. Works in addition to the other passwords", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "webinarPW3", section: "settings", type: "textarea", label: "Temp Room Password 2:", help: "Temp password 2/additional pw.. Works in addition to the other passwords", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "webinarPWFreeTrial", section: "settings", type: "textarea", label: "Free Trial Password:", help: "Give this password to your", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "deleteAlertPW", section: "settings", type: "textarea", label: "Delete Alert Password", help: "If set, Presenters will need to enter the password to delete an alert", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "allRoomsWelcomeMatPW", section: "settings", type: "textarea", label: "All Rooms Welcome Mat Password", help: "If set, Presenters will need to enter the password to replace all the rooms welcome mats", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "needPasswordForUserNotes", section: "settings", type: "textarea", label: "Password to Manage User's Notes", help: "If set, Presenters will need to enter the password to manage user's notes", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "nickFilter", section: "settings", type: "textarea", label: "Nickname filter for members:", help: "(Coma separated list of filters, i.e. 'SO_,SS_,John Carter, etc...'", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "customFaviconURL", section: "settings", type: "textarea", label: "Custom Favicon", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "overwriteCashRegisterSound", section: "settings", type: "text", label: "Overwrite Cash Register Sound", help: "If set, it will play instead of the chash.mp3", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "login_webhook_url", section: "settings", type: "textarea", label: "Login Webhook URL", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "logout_webhook_url", section: "settings", type: "textarea", label: "Logout Webhook URL", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "allowedMemberships", section: "settings", type: "textarea", label: "Membership filter:", help: "Leave blank to let all members in. Comma seprated list of valid memberships the user needs to have to enter.", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "allowedProducts", section: "settings", type: "textarea", label: "Product filter:", help: "Leave blank to let all members in. Comma seprated list of valid products the user needs to have to enter. Either a product or membership, or both must match...", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "allowedPerms", section: "settings", type: "textarea", label: "Permissions filter:", help: "Leave blank to let all members in. Comma seprated list of valid permissions the user needs to have to enter. Either a product or membership, or both must match...", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "secTok", section: "settings", type: "textarea", label: "Secret Token:", help: "Leave blank to let all members in, Set it to something complex like '5081b73a690762e2526bc1fef3c46eedf1ec8832'", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "custRoomDriveURL", section: "settings", type: "textarea", label: "Custom Room Drive URL", help: "If set, Room Drive icon will open this link instead.", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "custLogoutURL", section: "settings", type: "textarea", label: "Custom Logout URL", help: "If set, Logout button will use this URL", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "rosterVisibleToViewers", section: "settings", type: "checkbox", label: "Show Roster ?", help: "If disabled only presenters will see the user count and the roster", helpShape: "muted", helpOutside: false, captured: true, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "hideWelcomeTo", section: "settings", type: "checkbox", label: "Hide Welcome To Message?", help: "If enabled, it will hide welcome message on the login page", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "openLoginLink", section: "settings", type: "textarea", label: "Open link on login?", help: "If enabled, it will open the link set in this setting on a new tab", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "loginErrorURL", section: "settings", type: "textarea", label: "Custom login error URL redirect", help: "On the login error it will redirect users to this url", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "loginErrorMsg", section: "settings", type: "textarea", label: "Custom login error message", help: "On the login error it will display this message to users", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "onlyPresentersVisibleToViewers", section: "settings", type: "checkbox", label: "Show only Presenters in the roster?", help: "If enabled, users will see only presenters in the roster", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "rosterCountVisibleToViewers", section: "settings", type: "checkbox", label: "Show Roster Count?", help: "If enabled, the roster count will still be visible to users, even if the roster is not", helpShape: "muted", helpOutside: false, captured: true, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "simUserCount", section: "settings", type: "number", label: "Simulated Count?", help: "A number from 0 to 5000. You can add \"simulated users\" to the total user count shown in the room. the roster list will be hidden if you enable this feature", helpShape: "muted", helpOutside: false, captured: 0, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "userPM", section: "settings", type: "checkbox", label: "User PMs?", help: "If enabled, users can Private msg each other", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "enablePrivateMessageHistory", section: "settings", type: "checkbox", label: "Enable Private Message History?", help: "If enabled, can load users private message history", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "dingOnNewMessage", section: "settings", type: "checkbox", label: "Sound alert when a new message is posted?", help: "If enabled, it will play a sound when a new message is posted", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "beepOnUserJoin", section: "settings", type: "checkbox", label: "Sound when the user joins/leaves?", help: "If enabled, moderators will hear a sound when users join/leave", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "userJoinAndLeavePopup", section: "settings", type: "checkbox", label: "Popup alert when the user joins/leaves?", help: "If enabled, moderators will get a popup when users join/leave", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "hideAvatars", section: "settings", type: "checkbox", label: "Hide User Avatars?", help: "If enabled, user avatars will be hidden", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "hideAppInfo", section: "settings", type: "checkbox", label: "Hide Mobile App Info?", help: "If enabled, mobile app info wiil be hidden", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "alwaysShowRoster", section: "settings", type: "checkbox", label: "Always Show User Roster?", help: "If enabled, user roster will always be visible", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "showOnlyUsernames", section: "settings", type: "checkbox", label: "Show Only Usernames in Roster?", help: "If enabled, for regular users it will show only their usernames in roster?", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "allowUsersToChangeUsername", section: "settings", type: "checkbox", label: "Allow Users to Change their Usernames?", help: "If enabled, for regular users it will allow them to change their usernames.", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "disableEditingUsername", section: "settings", type: "checkbox", label: "Disable Editing Username", help: "If enabled, it will disable the editing of the username in the login form for regular users", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "usernameInstructions", section: "settings", type: "textarea", label: "Username Instructions", help: "Instructions how user can edit his username", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "forgotRoomPassword", section: "settings", type: "checkbox", label: "Forgot room password?", help: "If enabled, can change room login password on the login page", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "tawkPresenterSupport", section: "settings", type: "checkbox", label: "Tawk Presenter Support?", help: "If enabled, tawk presenter support will be visible in the room", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "userToPresenterPM", section: "settings", type: "checkbox", label: "User PM presenters?", help: "If enabled, users can Private msg presenters", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "playChatMessageSoundFor", section: "settings", type: "textarea", label: "Chat Message Sound For Emails:", help: "Coma separated list of emails to play sound on the new chat message", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "alertsChatOnBottom", section: "settings", type: "checkbox", label: "Alerts/Chat on bottom?", help: "If enabled, the alerts and chat will be bellow the screenshare area", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "hasQAOnAlerts", section: "settings", type: "checkbox", label: "Q&A on Alerts?", help: "If enabled, users can ask questions on Alerts and have a disscussion in context", helpShape: "muted", helpOutside: false, captured: true, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "alertsOverlayOnScreenshare", section: "settings", type: "checkbox", label: "Alerts over screenshare?", help: "If enabled, alerts will appear over the screenshare in recordings", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "copyTrades", section: "settings", type: "checkbox", label: "Copy Trades?", help: "If enabled, users can copy trades by clicking on them", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "disableCopy", section: "settings", type: "checkbox", label: "Disable Copy?", help: "If enabled, it will disable right-click to prevent selecting and copying all text", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "claimNickName", section: "settings", type: "checkbox", label: "Claim Nickname?", help: "If enabled, users can claim a nickname", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "hasTypingIndicator", section: "settings", type: "checkbox", label: "Show typing indicator ?", help: "Show if somebody is typing in the room or PM", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "presenterMsgsOnTheRight", section: "settings", type: "checkbox", label: "Presenter chat messages on the right?", help: "If enabled, renders presenter chat messages on the right", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "altChatRender", section: "settings", type: "checkbox", label: "Alt Chat Render?", help: "If enabled, renders chat sans avatars, and compact mode", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "altRoomRender", section: "settings", type: "checkbox", label: "Alt Room Render?", help: "If enabled, renders simplified alerts/chat", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "hasAppPairLink", section: "settings", type: "checkbox", label: "Pair Link For App?", help: "If enabled, it will show the link to pair the app", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "pairSecretKey", section: "settings", type: "textarea", label: "Pair Secret Key", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "pairOKRedirect", section: "settings", type: "textarea", label: "Pair OK Redirect", help: "Where to send users if the pairing succeeds", helpShape: "muted", helpOutside: true, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "pairErrorRedirect", section: "settings", type: "textarea", label: "Pair ERROR Redirect", help: "Where to send users if the pairing fails", helpShape: "muted", helpOutside: true, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "hideChatAlerts", section: "settings", type: "checkbox", label: "Hide Alerts/Chat Section?", help: "If enabled, the room will not have chat/alerts. Just media.", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "hasSwingTradeAlerts", section: "settings", type: "checkbox", label: "Enable Swing Trade Alerts Tab?", help: "If enabled, the room will have swing alerts tab.", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "hasDayTradeAlerts", section: "settings", type: "checkbox", label: "Enable Day Trade Alerts Tab?", help: "If enabled, the room will have day trade alerts tab.", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "usersPublicReply", section: "settings", type: "checkbox", label: "User Public Reply?", help: "If enabled, regular user will be able to do reply", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "chatDisabledForTrials", section: "settings", type: "checkbox", label: "Chat Disabled For Trials?", help: "If its set, auto disable the chat (chat disabed) if they are trials", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "disablePMForTrials", section: "settings", type: "checkbox", label: "Disable PM For Trials?", help: "If enabled, trial users will not be able to send private messages", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "usersCanDeleteOwnMsgs", section: "settings", type: "checkbox", label: "Users Can Delete Own Messages?", help: "If enabled, regular users can delete their own messages", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "smallerImagePreview", section: "settings", type: "checkbox", label: "Smaller image previews?", help: "If enabled, the room will have smaller image previews in the chats", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "hideNotes", section: "settings", type: "checkbox", label: "Hide Notes Section?", help: "If enabled, the room will not have the notes tab", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "hideFiles", section: "settings", type: "checkbox", label: "Hide Files Section?", help: "If enabled, the room will not have the files tab", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "darkThemeAsDefault", section: "settings", type: "checkbox", label: "Set Dark Theme As Default?", help: "If enabled, dark theme will be set as default", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "saveWebinarModeChat", section: "settings", type: "checkbox", label: "Preserve Webinar Mode chat?", help: "If enabled, chatlog will be preserved across page reloads", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "showArchivesToUsers", section: "settings", type: "checkbox", label: "Show Archives?", help: "If enabled, users can see the archives on the side bar", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "showArchivesToSpecificPresenters", section: "settings", type: "textarea", label: "Show Archives to specific Presenters", help: "Comma separated list of Presenter emails", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "disalowSporadicMultiLogins", section: "settings", type: "checkbox", label: "Prevent sporadic reconnects?", help: "prevents a user's connection to reconnect multiple times within a short time", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "disalowMultiLogins", section: "settings", type: "checkbox", label: "Disalow Multi-logins?", help: "If enabled, users could can only log in once per room", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "sendReportEmails", section: "settings", type: "checkbox", label: "Send report email?", help: "If enabled, you will get an email to the address below for each incident", helpShape: "muted", helpOutside: false, captured: true, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "banIPList", section: "settings", type: "textarea", label: "Ban IP list", help: "Comma separated list of banned IPs", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "reportEmail", section: "settings", type: "textarea", label: "Report emails", help: "Comma separated list of emails to receive abuse reports", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "customJWTErrorMessage", section: "settings", type: "textarea", label: "Custom JWT Error Message", help: "Set a custom JWT error message", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "sendOpenCloseEmail", section: "settings", type: "textarea", label: "Open/Close Room emails", help: "Comma separated list of emails to receive open / close room events", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "autoOpenTime", section: "settings", type: "textarea", label: "Auto Open Room Time", help: "Time in Military EST to automatically OPEN the room. i.e. 7:30", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "autoCloseTime", section: "settings", type: "textarea", label: "Auto Close Room Time", help: "Time in Military EST to automatically CLOSE the room. i.e. 18:30", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "ignoreAutoOpenCloseOnWeekend", section: "settings", type: "checkbox", label: "Ignore Auto Open & Close On Weekend", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "alertSoundOff", section: "settings", type: "checkbox", label: "Alerts Sound Off?", help: "Turn off alert cash register sound by default. Members can always turn it on", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "styckyNonTradeAlert", section: "settings", type: "checkbox", label: "Sticky Non-Trade Alerts?", help: "If enabled, the non-trade alert checkbox in the alert entry will be ON by default", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "fileAccessCaseByCase", section: "settings", type: "checkbox", label: "Shared Files Access Case/Case?", help: "Allow access to the shared drive on a case/case basis", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "isChatOnlyRoom", section: "settings", type: "checkbox", label: "Chat Only Room?", help: "The room will be only text based chat/alerts, no audio/video", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "chatAutoClear", section: "settings", type: "checkbox", label: "Auto Clear Chat?", help: "Chat will clear at 11:45PM EST / 10:45PM Central.", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "alertsAutoClear", section: "settings", type: "checkbox", label: "Auto Clear Alerts?", help: "Alerts will clear at 11:45PM EST / 10:45PM Central.", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "chatAutoClearSpecialHour", section: "settings", type: "textarea", label: "Overwrite Clear Hour:", help: "Overwrite the default 12am clearing time with this hour instead: Enter a number only, example: \"3\" for 3:00AM est. ALL TIMES ARE EST'", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "chatAutoClearWeekend", section: "settings", type: "checkbox", label: "Auto Clear Chat Weekend?", help: "Chat will clear on Sundays.", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "archiveAlertsLog", section: "settings", type: "checkbox", label: "Archive Alerts?", help: "If enabled, archived alert logs will be available from a link in the room", helpShape: "muted", helpOutside: false, captured: true, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "archiveChatLog", section: "settings", type: "checkbox", label: "Archive Chatlog?", help: null, helpShape: null, helpOutside: false, captured: true, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "hideChatLog", section: "settings", type: "checkbox", label: "Hide Chatlog from Archive?", help: "If enabled, archived chat logs will be hidden for the regular users in the room", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "hasAlertScheduler", section: "settings", type: "checkbox", label: "Enable alert scheduler?", help: "Presenters will be able to schedule sending alerts in the future", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "enableVideoPlayer", section: "settings", type: "checkbox", label: "Enable VideoPlayer?", help: "In room video player", helpShape: "muted", helpOutside: false, captured: true, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "userUploads", section: "settings", type: "checkbox", label: "User Chat Screenshots?", help: "If enabled, Users will be able to upload screenshots on the chat", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "enableDiscord", section: "settings", type: "checkbox", label: "Enable Discord?", help: "It will enable Discord", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "disableEmojis", section: "settings", type: "checkbox", label: "Disable Emojis?", help: "If enabled, Users will be able to add emojis using the emoji tool", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "enableRTE", section: "settings", type: "checkbox", label: "Enable Rich Text Editor?", help: "If enabled, Presenter will be able to format their messages using the rich text editor", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "enableReactions", section: "settings", type: "checkbox", label: "Enable Reactions?", help: "If enabled, Users will be able to add reactions to the messages", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "enableQAReactions", section: "settings", type: "checkbox", label: "Enable QA Reactions?", help: "If enabled, Users will be able to add reactions to the QA messages", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "enableEditMessage", section: "settings", type: "checkbox", label: "Enable Edit Messages?", help: "If enabled, everyone will be able to edit their own messages", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "enableEditAlerts", section: "settings", type: "checkbox", label: "Enable Edit Alerts?", help: "If enabled, Presenters will be able to edit alerts", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "alertLabels", section: "settings", type: "textarea", label: "Alert Labels", help: "JSON array of alert labels, i.e. [ { \"name\": \"Day Trade\", \"hash\": \"DayTrade\", \"color\": \"#9c4537\", \"bgcolor\":\"#e8f5f7\" }, { \"name\": \"Swing Trade\", \"hash\": \"SwingTrade\", \"color\": \"#24794f\", \"bgcolor\":\"#e8f5f7\" } ]", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "advancedSearchAlerts", section: "settings", type: "checkbox", label: "Advanced Search Alerts?", help: "If enabled, will allow advanced search alerts", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "enableDeleteLog", section: "settings", type: "checkbox", label: "Enable Delete Log?", help: "If enabled, will keep track of deleted messages", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "enableBadges", section: "settings", type: "checkbox", label: "User Badges?", help: "If enabled, You can cofigure and set badges next to each user name, like [Gold], etc", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "enableTokenBadges", section: "settings", type: "checkbox", label: "Token Badges?", help: "If enabled, Badges will come from JWT token in this room", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "remToken", section: "settings", type: "checkbox", label: "Remove token from url", help: "If enabled, remove the jwt from the ULR.", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "showBadgesToPresentersOnly", section: "settings", type: "checkbox", label: "Show Badges only to Presenters?", help: "If enabled, You can cofigure and set badges next to each user name, like [Gold], etc", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "dontFollowPresenters", section: "settings", type: "checkbox", label: "Don't follow Presenters?", help: "If enabled, users will not follow Presenters", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "disableStarYears", section: "settings", type: "checkbox", label: "Disable Stars ?", help: "If disabled, users will not see the stars next to user names", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "hasRequiredPhoneInLogin", section: "settings", type: "checkbox", label: "Phone Number Required?", help: "User will need to enter a valid phone number to enter", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "showPasswordField", section: "settings", type: "checkbox", label: "Show password field?", help: "Show password field on the login page", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "isMainRoom", section: "settings", type: "checkbox", label: "Is Main Room?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "isArchivedRoom", section: "settings", type: "checkbox", label: "Is Archived Room?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "isNewIndicatorOn", section: "settings", type: "checkbox", label: "Is New Room?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "hasBenzingaNews", section: "settings", type: "checkbox", label: "BZ News (DO NOT USE UNLESS YOU HAVE API)", help: "You will need an API key from benzinga", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "altBenzingaLogoURL", section: "settings", type: "textarea", label: "Custom Benzinga logo url", help: "Set custom Benzinga logo url", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "altBenzingaLinkURL", section: "settings", type: "textarea", label: "Custom Benzinga link url", help: "Set custom Benzinga link url", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "imgurClientID", section: "settings", type: "text", label: "Imgur ClientID:", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "imgurApiKey", section: "settings", type: "text", label: "Imgur api key:", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "imgurRapidKey", section: "settings", type: "textarea", label: "Imgur rapid key:", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "xuserAccessToken", section: "settings", type: "textarea", label: "X User Access Token:", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "xuserAccessTokenSecret", section: "settings", type: "textarea", label: "X User Access Token Secret:", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "subscriptionPlans", section: "settings", type: "textarea", label: "Subscription Plans:", help: "JSON array with subscription plans, i.e. [{ \"name\": \"Basic Plan\", \"fee\": 4.99, \"desc\": \"Basic Plan Description.\", \"recommended\": false }, { \"name\": \"Pro Plan\", \"fee\": 9.99, \"desc\": \"Pro Plan Description.\", \"recommended\": true },]", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "stripeEmail", section: "settings", type: "textarea", label: "Stripe Email:", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "enableLiveStats", section: "settings", type: "checkbox", label: "Live User stats?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "collectsUserStats", section: "settings", type: "checkbox", label: "UserXrefStats?", help: "Only enabled if you need granular Users Stats", helpShape: "bare", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "apiSecret", section: "settings", type: "textarea", label: "API secret", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "slackPostURL", section: "settings", type: "textarea", label: "Slack post URL secret", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "diasableFCMAlerts", section: "settings", type: "checkbox", label: "Disable PUSH Alerts?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "modMessage", section: "settings", type: "textarea", label: "Moderator Message:", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "positionsIframeUrl", section: "settings", type: "textarea", label: "Positions Iframe Url", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "positionsIframe", section: "settings", type: "checkbox", label: "Enable positions iframe?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "tipMeBtnEnabled", section: "settings", type: "checkbox", label: "Enable Tip Me Button?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "tipMeBtnTxt", section: "settings", type: "textarea", label: "Tip Me Button Text", help: null, helpShape: null, helpOutside: false, captured: "Tip Me?", capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "tipMeBtnUrl", section: "settings", type: "textarea", label: "Tip Me Button Url", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "salesBanner", section: "settings", type: "textarea", label: "Sales Banner", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "modAdminLoginList", section: "settings", type: "textarea", label: "Admin panel access list:", help: "put any emails here of admins you want to allow access to the admin panel section. (i.e. \"john@example.com\",\"jane@example.com\") comma separated list.", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "isAlertOnly", section: "settings", type: "checkbox", label: "Alerts only Room?", help: "Alerts only rooms are just rooms to receve push notifications and nothing else. Don't use this if you don't know what it is!!!", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "customClientAlertPostURL", section: "settings", type: "textarea", label: "Custom Alert POST", help: "POST alerts to this URL endpoint", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "customClientAlertPostSecret", section: "settings", type: "textarea", label: "Custom Alert secret", help: "secret PW for the endpoint above", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "strictBrowserMode", section: "settings", type: "checkbox", label: "Strict Browser?", help: "If YES, Only Chrome, Firefox, and Opera are allowed in (no try anyhow link)...", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "chatFloodDisabled", section: "settings", type: "checkbox", label: "Disable Chat Flood?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "privMessageHugePopup", section: "settings", type: "checkbox", label: "Huge Priv Msg Alert?", help: "Some user can't see the private messages, this makes a HUGE popup", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "hasChannelTabs", section: "settings", type: "checkbox", label: "OffTopic Channels/Tabs", help: "This setting adds an OffTopic, channel tabs next to general chat", helpShape: "plain", helpOutside: false, captured: true, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "autoSwitchToOfftopics", section: "settings", type: "checkbox", label: "Auto switch to OffTopic Channels/Tabs?", help: "Auto Switch to OffTopic tab", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "hasAdminOnlyChannel", section: "settings", type: "checkbox", label: "Admin Channels/Tabs", help: "This setting adds an admin/presenter dedicated chat tab", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "extraAdminChannels", section: "settings", type: "textarea", label: "Extra Admin Channels", help: "Comma separated list of extra admin channels", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "extraRegChannels", section: "settings", type: "textarea", label: "Extra Regular Channels", help: "Comma separated list of extra regular (anyone can post) channels", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "altGenChannelName", section: "settings", type: "textarea", label: "Rename \"Main Chat\"", help: "Rename the Main Chat channel to...", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "altOffTopicChannelName", section: "settings", type: "textarea", label: "Rename \"Off-Topic\"", help: "Rename the Off-Topic channel to...", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "chatTabsWithBadges", section: "settings", type: "textarea", label: null, help: "List of chat tabs with badges: [ { \"name\": \"easy channel\", \"badges\": [ \"61eafd612fcdee7bc8e979bc\", \"6489f1f98993a677b83cdd70\" ] }, { \"name\": \"harder channel\", \"badges\": [ \"61eafd612fcdee7bc8e979bc\" ] } ]", helpShape: "plain", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "hasProfanityFilter", section: "settings", type: "checkbox", label: "Chat Profanity filter?", help: "Profanity filter will try to filter (put xxxx) on bad words", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "ingnoreBadWordsList", section: "settings", type: "text", label: "Ignore List", help: "Comma separated list OK words to remove from the filter", helpShape: "bare", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "additionalBadWordsList", section: "settings", type: "text", label: "Extra Bad list", help: "Comma separated list of additional bad words you want to filter", helpShape: "bare", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "simplifiedEditor", section: "settings", type: "checkbox", label: "Simplified Note Editor?", help: "If enabled, the Note Editor will be simplified.", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "audioMeterDisabled", section: "settings", type: "checkbox", label: "Disable Audio Meter?", help: "Turn this on to disable the audio level meter next to the presenter name when they are talking", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "hideWebcamForRoom", section: "settings", type: "checkbox", label: "Hide WebCam in the room?", help: "If enabled, WebCam will be hidden in the room", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "recordChat", section: "settings", type: "checkbox", label: "Record alerts and chat?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "autoRecord", section: "settings", type: "checkbox", label: "Auto record presenters?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "blinkingRec", section: "settings", type: "checkbox", label: "Blinking [REC]?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "hideRecs", section: "settings", type: "checkbox", label: "Hide Recordings?", help: "If enabled, recordings will be hidden in archives", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "recordingReminder", section: "settings", type: "checkbox", label: "Recording Reminder If Speaking?", help: "If enabled, will show recording reminder popup", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "recsInRoom", section: "settings", type: "checkbox", label: "Show Recordings tab in the room?", help: "If enabled, will show recordings tab in the room", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "downloadRecordingsDisabled", section: "settings", type: "checkbox", label: "Disable download button for Recordings for users?", help: "If enabled, will disable download button for Recordings for users", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "hasSpeechRecognitionDisabled", section: "settings", type: "checkbox", label: "Disable Closed Captioning?", help: "If enabled, will disable closed captioning for the room", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "dontShowRecInfoToUsers", section: "settings", type: "checkbox", label: "Hide recordings info for users?", help: "If enabled, will hide recording info for users", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "runawayRecMinutes", section: "settings", type: "number", label: "Minutes of recording inactivity?", help: "Number of minutes to flag a recording if inactive (runaway). Leave at 0 to disable.", helpShape: "muted", helpOutside: false, captured: 5, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "runawayRecAutoKill", section: "settings", type: "checkbox", label: "Auto stop recording if inactive?", help: "If enabled, auto stop inactive recordings", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "runawayRecPostURL", section: "settings", type: "textarea", label: "Slack url to post", help: "If set, it will post to this slack url when a recording is flagged as inactive (runaway)", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "stickyGiveMicAndCam", section: "settings", type: "checkbox", label: "Sticky give Mic/Cam?", help: "If enabled, when a presenter gives mic/cam, the setting will stick", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "overlayUserIdOnScreenshare", section: "settings", type: "checkbox", label: "Overlay userID on screenshare?", help: "If enabled, it will overlay userID on screenshare", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "regUserCanPresent", section: "settings", type: "checkbox", label: "Auto give Mic/Screen to Users?", help: "If enabled, ALL regular users will have mic/screenshare in the room. ***** CAREFULL ******", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "dontStopRecOnMicMute", section: "settings", type: "checkbox", label: "Don't stop on mute?", help: "Don't auto stop the rec on mic mute", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "individualVolumeControls", section: "settings", type: "checkbox", label: "Individual Volume Controls?", help: "Individual volume controls for each Presenter", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "remote_recording", section: "settings", type: "checkbox", label: "NEW recording procedure?", help: "new experimental serverside rec control, more reliable?", helpShape: "plain", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "saveRecsToS3", section: "settings", type: "checkbox", label: "Save Recs to AWS S3", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "s3KeyID", section: "settings", type: "text", label: "S3 Key ID/Name", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "s3KeySecret", section: "settings", type: "text", label: "S3 Key Secret", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "s3Bucket", section: "settings", type: "text", label: "S3 Bucket", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "s3BucketFolderPath", section: "settings", type: "text", label: "S3 Bucket subfolder/path", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "saveRecsToVimeo", section: "settings", type: "checkbox", label: "Save Recs to Vimeo", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "vimeoClientID", section: "settings", type: "text", label: "Vimeo ClientID", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "vimeoClientSecret", section: "settings", type: "text", label: "Vimeo Secret", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "vimeoToken", section: "settings", type: "text", label: "Vimeo Token", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "vimeoFolderPath", section: "settings", type: "text", label: "Vimeo Folder ID (optional)", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "obsBroadcastRoom", section: "settings", type: "checkbox", label: "Broadcast using OBS?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "obsStreamKey", section: "settings", type: "text", label: "OBS Stream Key", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "obsStreamSatusWebHookURL", section: "settings", type: "text", label: "OBS Stream Satus WebHook URL", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "restreamToURL", section: "settings", type: "text", label: "Restream URL", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "restreamToURLKey", section: "settings", type: "text", label: "Restream Key", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "x264_encArgs", section: "settings", type: "text", label: "Custom Rec Params", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "twillioApiSID", section: "settings", type: "text", label: "Twillio SID", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "twillioApiToken", section: "settings", type: "text", label: "Twillio Token", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "twilioPhone", section: "settings", type: "text", label: "Twillio Phone", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "protextingSecretTok", section: "settings", type: "text", label: "Protexting Token", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "protextingGroupIDs", section: "settings", type: "text", label: "Protexting GroupID", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "h264Enabled", section: "settings", type: "checkbox", label: "Use h264 codec?", help: null, helpShape: null, helpOutside: false, captured: true, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "vp9Enabled", section: "settings", type: "checkbox", label: "Use VP9 codec?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "hqVideo", section: "settings", type: "checkbox", label: "Use HQ Video?", help: "Experimental better vid quality on vp8", helpShape: "bare", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "customPlayerURL", section: "settings", type: "text", label: "Custom Player URL", help: "If set, it will always show an iframe with this url in the screens section", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "iframeSSOTFix", section: "settings", type: "checkbox", label: "Iframe Cookie Fix?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "autoResetSession", section: "settings", type: "checkbox", label: "Autoreset sess at 12am?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "doNotAutoSoftReset", section: "settings", type: "checkbox", label: "Don't Soft reset at 12am?", help: "Enable this to prevent media server soft reset each night...", helpShape: "bare", helpOutside: true, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "sendFcmAlertsNew", section: "settings", type: "checkbox", label: "New FCM Method?", help: "Use pub/sub for notifications", helpShape: "text", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "ptrMobileAppExpirePairCodeDays", section: "settings", type: "number", label: "PTR app exp days", help: "If user does not log in from regular site, mobile app token will expire after this many days", helpShape: "text", helpOutside: false, captured: 7, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "mobileAppExpireNotificationsDays", section: "settings", type: "number", label: "Push expire days", help: "If user does not log in this many days, we'll stop sending push notifications", helpShape: "text", helpOutside: false, captured: 14, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "customEnterDisclosure", section: "settings", type: "textarea", label: "Custom Legal Disclosure", help: "If set, Users will need to agree to thisDisclosure to enter.", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: true },
  { name: "customUserInfoURL", section: "settings", type: "text", label: "Custom User Info Page", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "stAppScheduleID", section: "settings", type: "text", label: "Scheudle ID (GCal)", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "invalidTokens", section: "settings", type: "textarea", label: "Invalid Tokens", help: "Comma separated list of invalid JWT tokens.", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false },
  { name: "useV3", section: "settings", type: "checkbox", label: "Use v3? (DON'T!)", help: "(DON'T TURN THIS ON, If PTR did not clear you for v3!! it will not work....)", helpShape: "text", helpOutside: false, captured: true, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "useV5", section: "settings", type: "checkbox", label: "Use v5? (DON'T!)", help: "(DON'T TURN THIS ON, If PTR did not clear you for v5!! it will not work....)", helpShape: "text", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "clusterID", section: "settings", type: "text", label: "ClusterID", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "backupClusterID", section: "settings", type: "text", label: "Backup ClusterID", help: "(In case the main clusterID is down, this is the backup, soft reset required for changes to take effect)", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "superClusterID", section: "settings", type: "text", label: "Super ClusterID", help: "(Super cluster, if this is set, we will use the new supercluster scaling logic to scale the session across the super cluster)", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "superClusterExpectedServerCount", section: "settings", type: "number", label: "Super Cluster Expected Server Count", help: "(Expected number of servers needed to handle the session)", helpShape: "muted", helpOutside: false, captured: 0, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "useFFmpegRecording", section: "settings", type: "checkbox", label: "Use FFmpeg for Recording (BETA)", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "useLessBusyVsRoundRobin", section: "settings", type: "checkbox", label: "Use Less busy server algo vs round robin", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "useMediaMTX", section: "settings", type: "checkbox", label: "Use MediaMTX?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: true },
  { name: "mediaMTXClusterID", section: "settings", type: "text", label: "MediaMTX ClusterID", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "backupMediaMTXClustterID", section: "settings", type: "text", label: "Backup MediaMTX ClustterID", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "media_max_bitrate", section: "settings", type: "text", label: "ScreenShare MAX BitRate", help: "(i.e. 1024000,512000,254000)", helpShape: "muted", helpOutside: false, captured: "512000", capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "media_fir_rate", section: "settings", type: "text", label: "ScreenShare KeyFrame Rate (i.e. 5, 10, 15)", help: "(Session restart required for changes to take effect)", helpShape: "muted", helpOutside: false, captured: "5", capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "hasYTStreaming", section: "settings", type: "checkbox", label: "Enable FB Live/YouTube Live", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "media_relays", section: "settings", type: "textarea", label: "Repeater List", help: "(Comma separated list op IPs IE: localhost|127.0.0.1,somehostname|10.10.10.10)", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "isLocked", section: "settings", type: "checkbox", label: "Lock Session?", help: "If session is locked, nobody will be able to log in...", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "chatServerURL", section: "settings", type: "textarea", label: "Talk URL", help: "Used to clusterize the chat server", helpShape: "muted", helpOutside: false, captured: "/talk", capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "force_jpeg_screenshare", section: "settings", type: "checkbox", label: "Force JPG Screens", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "force_mp3_audio", section: "settings", type: "checkbox", label: "Force MP3 Audio", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "node_media_relays", section: "settings", type: "textarea", label: "Node Repeater List", help: "(Comma separated list op IPs IE: localhost|127.0.0.1,somehostname|10.10.10.10)", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "node_ws_media_relays", section: "settings", type: "textarea", label: "Node Websocket Repeater List", help: "(Comma separated list op IPs IE: localhost|127.0.0.1,somehostname|10.10.10.10)", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "altCodeVendorJS", section: "settings", type: "textarea", label: "Alt VendorJS", help: "(name if alt vendorJS. ie. 'vendor2.min.js'", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "altCodeAppJS", section: "settings", type: "textarea", label: "Alt AppJS", help: "(name if alt vendorJS. ie. 'app2.min.js'", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "customJanus", section: "settings", type: "textarea", label: "Alt JanusJS", help: "(name if alt janusJS. ie. 'janus4.js'", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "alt_roomjs", section: "settings", type: "textarea", label: "Alt Room.js", help: "(name if alt Room.js. ie. 'RoomRemoteRec.js'", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "modAlertFilterList", section: "settings", type: "textarea", label: "Alert filter list for mods:", help: "i.e. [{\"username\":\"John\",\"avatar\":\"john@example.com\"}]", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: true },
  { name: "customCSS", section: "settings", type: "textarea", label: "Custom CSS", help: "Custom CSS to custimize colors, etc...", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "darkThemeStyle", section: "settings", type: "textarea", label: "Dark Theme Style", help: "Dark theme style to custimize colors.", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "hideLogo", section: "settings", type: "checkbox", label: "Hide Logo", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "hidePoweredBy", section: "settings", type: "checkbox", label: "Hide Powered By", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: true },
  { name: "linkedRoomAlerts", section: "settings", type: "textarea", label: "Linked Rooms for alerts", help: "Comma (,) separated list of Room IDs of the rooms to PUSH our alerts to", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "linkedRoomSwingAlerts", section: "settings", type: "textarea", label: "Linked Rooms for Swing Alerts", help: "Comma (,) separated list of Room IDs of the rooms to PUSH our swing alerts to", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "linkedRoomSwingAlertsOther", section: "settings", type: "textarea", label: "SessionID to load swing alerts from", help: "Session ID to load swing alerts from", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "linkedRoomDayTradeAlerts", section: "settings", type: "textarea", label: "Linked Rooms for Day Trade Alerts", help: "Comma (,) separated list of Room IDs of the rooms to PUSH our day trade alerts to", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "linkedRoomDayTradeAlertsOther", section: "settings", type: "textarea", label: "SessionID to load day trade alerts from", help: "Session ID to load day trade alerts from", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "linkedRoomRecordings", section: "settings", type: "textarea", label: "Linked Rooms for Recordings", help: "Comma (,) separated list of Session IDs of the rooms to load recordings from", helpShape: "muted", helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "linkedStreamsAPIKey", section: "settings", type: "textarea", label: "Other Room API Secret:", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "ptrMobileAppEnabled", section: "settings", type: "checkbox", label: "Enable PTR app?", help: "(DON'T USE this for ST)", helpShape: "text", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: true },
  { name: "freeTrialsGetApp", section: "settings", type: "checkbox", label: "App for Free trials?", help: "Also enable the app for free trials?", helpShape: "text", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: true },
  { name: "customMobileAppEnabled", section: "settings", type: "checkbox", label: "Custom App?", help: "(DON'T USE unless you have a custom app)", helpShape: "text", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: true },
  { name: "customMobileAppV3Name", section: "settings", type: "textarea", label: "Custom app String", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "customMobileAppIOSUrl", section: "settings", type: "textarea", label: "Custom iOS App URL", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: true },
  { name: "customMobileAppAndroidUrl", section: "settings", type: "textarea", label: "Custom Android App URL", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: true },
  { name: "customMobileAppLaunchWord", section: "settings", type: "textarea", label: "Custom App launch Word", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "hideMobileCredentials", section: "settings", type: "checkbox", label: "Hide Mobile Credentials?", help: "If enabled, it will hide mobile credentials", helpShape: "muted", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: true },
  { name: "ptrMobileAppCaseByCaseEnabled", section: "settings", type: "checkbox", label: "App for Some Members?", help: "Note above needs to ALSO be on (enable ptr app)", helpShape: "text", helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "nqNewsFeedURL", section: "settings", type: "textarea", label: "NQ News URL", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "generateRandomUDPPort", section: "settings", type: "checkbox", label: "Random UDP port fix?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "streamingThreads", section: "settings", type: "checkbox", label: "Streaming Threads?", help: null, helpShape: null, helpOutside: false, captured: false, capturedIsDisplayOnly: false, group: "dont-touch", wired: false },
  { name: "roomType", section: "settings", type: "select", label: "Room Type", help: "A webinar room adds a scheduled date and the reminder-email tools.", helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: true, group: null, wired: false },
  { name: "description", section: "branding", type: "html", label: "Login Landing Page Editor", help: null, helpShape: null, helpOutside: false, captured: null, capturedIsDisplayOnly: false, group: null, wired: false }
];

/** Fast lookup by the name the reference uses. */
export const ROOM_SETTING_BY_NAME: ReadonlyMap<string, RoomSettingDef> = new Map(
  ROOM_SETTINGS.map((d) => [d.name, d])
);

/** Kept as the name the rest of the app already imports. */
export const ROOM_SETTINGS_BY_NAME = ROOM_SETTING_BY_NAME;

/**
 * The stored shape: every setting the controller can write, with the value type
 * its editor produces. A room's row holds a Partial of this — an absent key
 * means "never set", which is what the reference renders as "empty".
 */
export interface RoomSettings {
  /** Room Title */
  name: string;
  /** Date: */
  webinarDate: string;
  /** Authorization Mode */
  authMode: string;
  /** SSO Host */
  ssoHost: string;
  /** JWT Secret Key: */
  ssoJWTSecret: string;
  /** Allow PW based logins on SSO? */
  allowPWLoginWithSSO: boolean;
  /** Token Expiration */
  tokenExpiresIn: string;
  /** Room Password: */
  webinarPW: string;
  /** Temp Room Password: */
  webinarPW2: string;
  /** Temp Room Password 2: */
  webinarPW3: string;
  /** Free Trial Password: */
  webinarPWFreeTrial: string;
  /** Delete Alert Password */
  deleteAlertPW: string;
  /** All Rooms Welcome Mat Password */
  allRoomsWelcomeMatPW: string;
  /** Password to Manage User's Notes */
  needPasswordForUserNotes: string;
  /** Nickname filter for members: */
  nickFilter: string;
  /** Custom Favicon */
  customFaviconURL: string;
  /** Overwrite Cash Register Sound */
  overwriteCashRegisterSound: string;
  /** Login Webhook URL */
  login_webhook_url: string;
  /** Logout Webhook URL */
  logout_webhook_url: string;
  /** Membership filter: */
  allowedMemberships: string;
  /** Product filter: */
  allowedProducts: string;
  /** Permissions filter: */
  allowedPerms: string;
  /** Secret Token: */
  secTok: string;
  /** Custom Room Drive URL */
  custRoomDriveURL: string;
  /** Custom Logout URL */
  custLogoutURL: string;
  /** Show Roster ? */
  rosterVisibleToViewers: boolean;
  /** Hide Welcome To Message? */
  hideWelcomeTo: boolean;
  /** Open link on login? */
  openLoginLink: string;
  /** Custom login error URL redirect */
  loginErrorURL: string;
  /** Custom login error message */
  loginErrorMsg: string;
  /** Show only Presenters in the roster? */
  onlyPresentersVisibleToViewers: boolean;
  /** Show Roster Count? */
  rosterCountVisibleToViewers: boolean;
  /** Simulated Count? */
  simUserCount: number;
  /** User PMs? */
  userPM: boolean;
  /** Enable Private Message History? */
  enablePrivateMessageHistory: boolean;
  /** Sound alert when a new message is posted? */
  dingOnNewMessage: boolean;
  /** Sound when the user joins/leaves? */
  beepOnUserJoin: boolean;
  /** Popup alert when the user joins/leaves? */
  userJoinAndLeavePopup: boolean;
  /** Hide User Avatars? */
  hideAvatars: boolean;
  /** Hide Mobile App Info? */
  hideAppInfo: boolean;
  /** Always Show User Roster? */
  alwaysShowRoster: boolean;
  /** Show Only Usernames in Roster? */
  showOnlyUsernames: boolean;
  /** Allow Users to Change their Usernames? */
  allowUsersToChangeUsername: boolean;
  /** Disable Editing Username */
  disableEditingUsername: boolean;
  /** Username Instructions */
  usernameInstructions: string;
  /** Forgot room password? */
  forgotRoomPassword: boolean;
  /** Tawk Presenter Support? */
  tawkPresenterSupport: boolean;
  /** User PM presenters? */
  userToPresenterPM: boolean;
  /** Chat Message Sound For Emails: */
  playChatMessageSoundFor: string;
  /** Alerts/Chat on bottom? */
  alertsChatOnBottom: boolean;
  /** Q&A on Alerts? */
  hasQAOnAlerts: boolean;
  /** Alerts over screenshare? */
  alertsOverlayOnScreenshare: boolean;
  /** Copy Trades? */
  copyTrades: boolean;
  /** Disable Copy? */
  disableCopy: boolean;
  /** Claim Nickname? */
  claimNickName: boolean;
  /** Show typing indicator ? */
  hasTypingIndicator: boolean;
  /** Presenter chat messages on the right? */
  presenterMsgsOnTheRight: boolean;
  /** Alt Chat Render? */
  altChatRender: boolean;
  /** Alt Room Render? */
  altRoomRender: boolean;
  /** Pair Link For App? */
  hasAppPairLink: boolean;
  /** Pair Secret Key */
  pairSecretKey: string;
  /** Pair OK Redirect */
  pairOKRedirect: string;
  /** Pair ERROR Redirect */
  pairErrorRedirect: string;
  /** Hide Alerts/Chat Section? */
  hideChatAlerts: boolean;
  /** Enable Swing Trade Alerts Tab? */
  hasSwingTradeAlerts: boolean;
  /** Enable Day Trade Alerts Tab? */
  hasDayTradeAlerts: boolean;
  /** User Public Reply? */
  usersPublicReply: boolean;
  /** Chat Disabled For Trials? */
  chatDisabledForTrials: boolean;
  /** Disable PM For Trials? */
  disablePMForTrials: boolean;
  /** Users Can Delete Own Messages? */
  usersCanDeleteOwnMsgs: boolean;
  /** Smaller image previews? */
  smallerImagePreview: boolean;
  /** Hide Notes Section? */
  hideNotes: boolean;
  /** Hide Files Section? */
  hideFiles: boolean;
  /** Set Dark Theme As Default? */
  darkThemeAsDefault: boolean;
  /** Preserve Webinar Mode chat? */
  saveWebinarModeChat: boolean;
  /** Show Archives? */
  showArchivesToUsers: boolean;
  /** Show Archives to specific Presenters */
  showArchivesToSpecificPresenters: string;
  /** Prevent sporadic reconnects? */
  disalowSporadicMultiLogins: boolean;
  /** Disalow Multi-logins? */
  disalowMultiLogins: boolean;
  /** Send report email? */
  sendReportEmails: boolean;
  /** Ban IP list */
  banIPList: string;
  /** Report emails */
  reportEmail: string;
  /** Custom JWT Error Message */
  customJWTErrorMessage: string;
  /** Open/Close Room emails */
  sendOpenCloseEmail: string;
  /** Auto Open Room Time */
  autoOpenTime: string;
  /** Auto Close Room Time */
  autoCloseTime: string;
  /** Ignore Auto Open & Close On Weekend */
  ignoreAutoOpenCloseOnWeekend: boolean;
  /** Alerts Sound Off? */
  alertSoundOff: boolean;
  /** Sticky Non-Trade Alerts? */
  styckyNonTradeAlert: boolean;
  /** Shared Files Access Case/Case? */
  fileAccessCaseByCase: boolean;
  /** Chat Only Room? */
  isChatOnlyRoom: boolean;
  /** Auto Clear Chat? */
  chatAutoClear: boolean;
  /** Auto Clear Alerts? */
  alertsAutoClear: boolean;
  /** Overwrite Clear Hour: */
  chatAutoClearSpecialHour: string;
  /** Auto Clear Chat Weekend? */
  chatAutoClearWeekend: boolean;
  /** Archive Alerts? */
  archiveAlertsLog: boolean;
  /** Archive Chatlog? */
  archiveChatLog: boolean;
  /** Hide Chatlog from Archive? */
  hideChatLog: boolean;
  /** Enable alert scheduler? */
  hasAlertScheduler: boolean;
  /** Enable VideoPlayer? */
  enableVideoPlayer: boolean;
  /** User Chat Screenshots? */
  userUploads: boolean;
  /** Enable Discord? */
  enableDiscord: boolean;
  /** Disable Emojis? */
  disableEmojis: boolean;
  /** Enable Rich Text Editor? */
  enableRTE: boolean;
  /** Enable Reactions? */
  enableReactions: boolean;
  /** Enable QA Reactions? */
  enableQAReactions: boolean;
  /** Enable Edit Messages? */
  enableEditMessage: boolean;
  /** Enable Edit Alerts? */
  enableEditAlerts: boolean;
  /** Alert Labels */
  alertLabels: string;
  /** Advanced Search Alerts? */
  advancedSearchAlerts: boolean;
  /** Enable Delete Log? */
  enableDeleteLog: boolean;
  /** User Badges? */
  enableBadges: boolean;
  /** Token Badges? */
  enableTokenBadges: boolean;
  /** Remove token from url */
  remToken: boolean;
  /** Show Badges only to Presenters? */
  showBadgesToPresentersOnly: boolean;
  /** Don't follow Presenters? */
  dontFollowPresenters: boolean;
  /** Disable Stars ? */
  disableStarYears: boolean;
  /** Phone Number Required? */
  hasRequiredPhoneInLogin: boolean;
  /** Show password field? */
  showPasswordField: boolean;
  /** Is Main Room? */
  isMainRoom: boolean;
  /** Is Archived Room? */
  isArchivedRoom: boolean;
  /** Is New Room? */
  isNewIndicatorOn: boolean;
  /** BZ News (DO NOT USE UNLESS YOU HAVE API) */
  hasBenzingaNews: boolean;
  /** Custom Benzinga logo url */
  altBenzingaLogoURL: string;
  /** Custom Benzinga link url */
  altBenzingaLinkURL: string;
  /** Imgur ClientID: */
  imgurClientID: string;
  /** Imgur api key: */
  imgurApiKey: string;
  /** Imgur rapid key: */
  imgurRapidKey: string;
  /** X User Access Token: */
  xuserAccessToken: string;
  /** X User Access Token Secret: */
  xuserAccessTokenSecret: string;
  /** Subscription Plans: */
  subscriptionPlans: string;
  /** Stripe Email: */
  stripeEmail: string;
  /** Live User stats? */
  enableLiveStats: boolean;
  /** UserXrefStats? */
  collectsUserStats: boolean;
  /** API secret */
  apiSecret: string;
  /** Slack post URL secret */
  slackPostURL: string;
  /** Disable PUSH Alerts? */
  diasableFCMAlerts: boolean;
  /** Moderator Message: */
  modMessage: string;
  /** Positions Iframe Url */
  positionsIframeUrl: string;
  /** Enable positions iframe? */
  positionsIframe: boolean;
  /** Enable Tip Me Button? */
  tipMeBtnEnabled: boolean;
  /** Tip Me Button Text */
  tipMeBtnTxt: string;
  /** Tip Me Button Url */
  tipMeBtnUrl: string;
  /** Sales Banner */
  salesBanner: string;
  /** Admin panel access list: */
  modAdminLoginList: string;
  /** Alerts only Room? */
  isAlertOnly: boolean;
  /** Custom Alert POST */
  customClientAlertPostURL: string;
  /** Custom Alert secret */
  customClientAlertPostSecret: string;
  /** Strict Browser? */
  strictBrowserMode: boolean;
  /** Disable Chat Flood? */
  chatFloodDisabled: boolean;
  /** Huge Priv Msg Alert? */
  privMessageHugePopup: boolean;
  /** OffTopic Channels/Tabs */
  hasChannelTabs: boolean;
  /** Auto switch to OffTopic Channels/Tabs? */
  autoSwitchToOfftopics: boolean;
  /** Admin Channels/Tabs */
  hasAdminOnlyChannel: boolean;
  /** Extra Admin Channels */
  extraAdminChannels: string;
  /** Extra Regular Channels */
  extraRegChannels: string;
  /** Rename "Main Chat" */
  altGenChannelName: string;
  /** Rename "Off-Topic" */
  altOffTopicChannelName: string;
  chatTabsWithBadges: string;
  /** Chat Profanity filter? */
  hasProfanityFilter: boolean;
  /** Ignore List */
  ingnoreBadWordsList: string;
  /** Extra Bad list */
  additionalBadWordsList: string;
  /** Simplified Note Editor? */
  simplifiedEditor: boolean;
  /** Disable Audio Meter? */
  audioMeterDisabled: boolean;
  /** Hide WebCam in the room? */
  hideWebcamForRoom: boolean;
  /** Record alerts and chat? */
  recordChat: boolean;
  /** Auto record presenters? */
  autoRecord: boolean;
  /** Blinking [REC]? */
  blinkingRec: boolean;
  /** Hide Recordings? */
  hideRecs: boolean;
  /** Recording Reminder If Speaking? */
  recordingReminder: boolean;
  /** Show Recordings tab in the room? */
  recsInRoom: boolean;
  /** Disable download button for Recordings for users? */
  downloadRecordingsDisabled: boolean;
  /** Disable Closed Captioning? */
  hasSpeechRecognitionDisabled: boolean;
  /** Hide recordings info for users? */
  dontShowRecInfoToUsers: boolean;
  /** Minutes of recording inactivity? */
  runawayRecMinutes: number;
  /** Auto stop recording if inactive? */
  runawayRecAutoKill: boolean;
  /** Slack url to post */
  runawayRecPostURL: string;
  /** Sticky give Mic/Cam? */
  stickyGiveMicAndCam: boolean;
  /** Overlay userID on screenshare? */
  overlayUserIdOnScreenshare: boolean;
  /** Auto give Mic/Screen to Users? */
  regUserCanPresent: boolean;
  /** Don't stop on mute? */
  dontStopRecOnMicMute: boolean;
  /** Individual Volume Controls? */
  individualVolumeControls: boolean;
  /** NEW recording procedure? */
  remote_recording: boolean;
  /** Save Recs to AWS S3 */
  saveRecsToS3: boolean;
  /** S3 Key ID/Name */
  s3KeyID: string;
  /** S3 Key Secret */
  s3KeySecret: string;
  /** S3 Bucket */
  s3Bucket: string;
  /** S3 Bucket subfolder/path */
  s3BucketFolderPath: string;
  /** Save Recs to Vimeo */
  saveRecsToVimeo: boolean;
  /** Vimeo ClientID */
  vimeoClientID: string;
  /** Vimeo Secret */
  vimeoClientSecret: string;
  /** Vimeo Token */
  vimeoToken: string;
  /** Vimeo Folder ID (optional) */
  vimeoFolderPath: string;
  /** Broadcast using OBS? */
  obsBroadcastRoom: boolean;
  /** OBS Stream Key */
  obsStreamKey: string;
  /** OBS Stream Satus WebHook URL */
  obsStreamSatusWebHookURL: string;
  /** Restream URL */
  restreamToURL: string;
  /** Restream Key */
  restreamToURLKey: string;
  /** Custom Rec Params */
  x264_encArgs: string;
  /** Twillio SID */
  twillioApiSID: string;
  /** Twillio Token */
  twillioApiToken: string;
  /** Twillio Phone */
  twilioPhone: string;
  /** Protexting Token */
  protextingSecretTok: string;
  /** Protexting GroupID */
  protextingGroupIDs: string;
  /** Use h264 codec? */
  h264Enabled: boolean;
  /** Use VP9 codec? */
  vp9Enabled: boolean;
  /** Use HQ Video? */
  hqVideo: boolean;
  /** Custom Player URL */
  customPlayerURL: string;
  /** Iframe Cookie Fix? */
  iframeSSOTFix: boolean;
  /** Autoreset sess at 12am? */
  autoResetSession: boolean;
  /** Don't Soft reset at 12am? */
  doNotAutoSoftReset: boolean;
  /** New FCM Method? */
  sendFcmAlertsNew: boolean;
  /** PTR app exp days */
  ptrMobileAppExpirePairCodeDays: number;
  /** Push expire days */
  mobileAppExpireNotificationsDays: number;
  /** Custom Legal Disclosure */
  customEnterDisclosure: string;
  /** Custom User Info Page */
  customUserInfoURL: string;
  /** Scheudle ID (GCal) */
  stAppScheduleID: string;
  /** Invalid Tokens */
  invalidTokens: string;
  /** Use v3? (DON'T!) */
  useV3: boolean;
  /** Use v5? (DON'T!) */
  useV5: boolean;
  /** ClusterID */
  clusterID: string;
  /** Backup ClusterID */
  backupClusterID: string;
  /** Super ClusterID */
  superClusterID: string;
  /** Super Cluster Expected Server Count */
  superClusterExpectedServerCount: number;
  /** Use FFmpeg for Recording (BETA) */
  useFFmpegRecording: boolean;
  /** Use Less busy server algo vs round robin */
  useLessBusyVsRoundRobin: boolean;
  /** Use MediaMTX? */
  useMediaMTX: boolean;
  /** MediaMTX ClusterID */
  mediaMTXClusterID: string;
  /** Backup MediaMTX ClustterID */
  backupMediaMTXClustterID: string;
  /** ScreenShare MAX BitRate */
  media_max_bitrate: string;
  /** ScreenShare KeyFrame Rate (i.e. 5, 10, 15) */
  media_fir_rate: string;
  /** Enable FB Live/YouTube Live */
  hasYTStreaming: boolean;
  /** Repeater List */
  media_relays: string;
  /** Lock Session? */
  isLocked: boolean;
  /** Talk URL */
  chatServerURL: string;
  /** Force JPG Screens */
  force_jpeg_screenshare: boolean;
  /** Force MP3 Audio */
  force_mp3_audio: boolean;
  /** Node Repeater List */
  node_media_relays: string;
  /** Node Websocket Repeater List */
  node_ws_media_relays: string;
  /** Alt VendorJS */
  altCodeVendorJS: string;
  /** Alt AppJS */
  altCodeAppJS: string;
  /** Alt JanusJS */
  customJanus: string;
  /** Alt Room.js */
  alt_roomjs: string;
  /** Alert filter list for mods: */
  modAlertFilterList: string;
  /** Custom CSS */
  customCSS: string;
  /** Dark Theme Style */
  darkThemeStyle: string;
  /** Hide Logo */
  hideLogo: boolean;
  /** Hide Powered By */
  hidePoweredBy: boolean;
  /** Linked Rooms for alerts */
  linkedRoomAlerts: string;
  /** Linked Rooms for Swing Alerts */
  linkedRoomSwingAlerts: string;
  /** SessionID to load swing alerts from */
  linkedRoomSwingAlertsOther: string;
  /** Linked Rooms for Day Trade Alerts */
  linkedRoomDayTradeAlerts: string;
  /** SessionID to load day trade alerts from */
  linkedRoomDayTradeAlertsOther: string;
  /** Linked Rooms for Recordings */
  linkedRoomRecordings: string;
  /** Other Room API Secret: */
  linkedStreamsAPIKey: string;
  /** Enable PTR app? */
  ptrMobileAppEnabled: boolean;
  /** App for Free trials? */
  freeTrialsGetApp: boolean;
  /** Custom App? */
  customMobileAppEnabled: boolean;
  /** Custom app String */
  customMobileAppV3Name: string;
  /** Custom iOS App URL */
  customMobileAppIOSUrl: string;
  /** Custom Android App URL */
  customMobileAppAndroidUrl: string;
  /** Custom App launch Word */
  customMobileAppLaunchWord: string;
  /** Hide Mobile Credentials? */
  hideMobileCredentials: boolean;
  /** App for Some Members? */
  ptrMobileAppCaseByCaseEnabled: boolean;
  /** NQ News URL */
  nqNewsFeedURL: string;
  /** Random UDP port fix? */
  generateRandomUDPPort: boolean;
  /** Streaming Threads? */
  streamingThreads: boolean;
  /** Room Type */
  roomType: string;
  /** Login Landing Page Editor */
  description: string;
}
