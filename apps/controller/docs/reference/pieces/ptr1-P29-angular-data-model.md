# ptr1-P29 — The complete Angular data model implied by the bindings

**Evidence root:** `/tmp/ptr-decode/ptr1/`
**Sweep basis:** ALL 18 baseline node files (`caps/00-baseline-room/nodes-000.txt` … `nodes-017.txt`, 2,156 records) **plus** all 18 interaction captures (`caps/01-…` … `caps/18-…`) **plus** the 3 diff captures (`caps/19,20,21`). Every attribute on every node in all 23 captures was enumerated programmatically; nothing was sampled.

---

## Purpose

This is **the API contract the rebuild must satisfy**. AngularJS templates carry the model on the elements themselves; because the dump preserves every attribute, the model can be recovered exactly. Below: every `sess.*` field with its editor type, handler and rendered value; every `user.*` field; every scope variable; every controller method with its **signature as written in the DOM**; the verified `updateUser` opcode map; every `ng-repeat`; and every `ng-if`/`ng-show`/`ng-hide` grouped by what it gates.

---

## §0 — Attribute census (all 23 captures)

`grep -rhoE '^  attr [A-Za-z0-9:_-]+ =' --include='nodes-*.txt' caps/ | sort | uniq -c`:

| count | attribute | | count | attribute |
|---|---|---|---|---|
| 1932 | `class` | | 9 | `ng-repeat` |
| 607 | `href` | | 9 | `data-target` |
| **403** | **`ng-click`** | | 8 | `value` |
| **267** | **`onaftersave`** | | 6 | `tab-heading-transclude` |
| 153 | `e-title` | | 6 | `tab-content-transclude` |
| **144** | **`ng-show`** | | 6 | `readonly` |
| **141** | **`editable-checkbox`** | | 6 | `heading` |
| 111 | `aria-hidden` | | 5 | `onclick` |
| 103 | `e-label` | | 5 | `editable-number` |
| **84** | **`editable-textarea`** | | 5 | `aria-haspopup` |
| 79 | `type` | | 5 | `aria-expanded` |
| 79 | `style` | | 4 | `ng-init` |
| 68 | `ng-class` | | 4 | `ng-checked` |
| 49 | `name` | | 4 | `data-dismiss` |
| **35** | **`editable-text`** | | 3 | `on-toggle` |
| 33 | `title` | | 3 | `gravatar-src-once` |
| 33 | `tabindex` | | 3 | `dropdown-toggle` |
| 33 | `ng-disabled` | | 3 | `dropdown` |
| 30 | `unselectable` | | 2 | `ui-view` / `tooltip-placement` / `tooltip` / `target` / `ta-bind` / `ng-src` / **`ng-if`** / `ng-bind` / **`editable-date`** / `clear` / `autoscroll` / `aria-labelledby` / `aria-label` |
| 30 | `ta-button` | | 1 | `ui-sref` / `text-angular-toolbar` / `text-angular` / `scrolling` / `sandbox` / `rows` / `required` / `placeholder` / `ng-transclude` / `ng-href` / `ng-enter` / `ng-dblclick` / `ng-controller` / `integrity` / `height` / `frameborder` / **`editable-select`** / **`editable-combodate`** / `e-ng-options` / `e-min-year` / `e-max-year` / `e-data-format` / `data-ui-view` / `data-format` / `data-autoscroll` / `cz-shortcut-listen` / `crossorigin` / `contenteditable` / `collapse` |
| 29 | `disabled` | | | |
| 21 | `ng-model` | | | |
| 18 | `id` | | | |
| 17 | `role` | | | |
| 16 | `src` | | | |
| **11** | **`ng-hide`** | | | |
| 11 | `ng-change` | | | |
| 11 | `data-toggle` | | | |

Counts include the repeated subtrees in captures 01–18 (which re-dump nodes already present in the baseline). Per-capture-unique figures are given inline where they matter.

**Root controller:** `ng-controller = "CoreController"` on `#1 r.0 <div class="app-container ng-scope">` — the **only** `ng-controller` in the dump. Everything on the page runs in one controller scope (plus the isolate scopes of `uib-tabset`, `textAngular`, `xeditable`, `uib-dropdown`).

---

## §1 — `sess.*` — the session/room model (269 editable bindings)

The Settings tab (`r.0.1.1.0.1.3.1.5`) plus the Room header (`r.0.1.1.0.1.0.*`) plus SSO (`r.0.1.1.0.1.3.1.3`) plus Branding (`r.0.1.1.0.1.3.1.2`) expose **269 `angular-xeditable` bindings**. Every one follows the same shape:

```
<p class="form-control-static">
  <label class="col-sm-2 control-label">{{HUMAN LABEL}}</label>
  <a href=""
     onaftersave="saveSessField('{{FIELD}}')"
     editable-{{TYPE}}="sess.{{FIELD}}"
     e-title="…"        (checkbox / number)
     e-label="…"        (text / textarea)
     class="ng-scope ng-binding editable editable-click [editable-empty]">{{RENDERED}}</a>
  <br>
  <label class="muted">{{HELP TEXT}}</label>
</p>
```

**Universal save handler:** `saveSessField(fieldName: string)` — 267 `onaftersave` attributes, all of the form `saveSessField('X')`. There is **no per-field save function**.

**Editor types observed** (`editable-*` attribute names): `text` (35), `textarea` (84), `checkbox` (141), `number` (5), `date` (2), `select` (1), `combodate` (1).

**Rendered-value convention** (this is how the reference paints an unset value — the rebuild must match it exactly):
- checkbox true → literal text **`Yes!`**; false → **`No`**
- text/textarea empty → literal text **`empty`** and the extra class **`editable-empty`**
- number/other unset → the raw value (e.g. `0`, `5`, `7`, `14`, `512000`)

### The 269 bindings

*TOTAL editable bindings: 269 — every row below is generated directly from the raw `attr` lines of `caps/00-baseline-room/nodes-000..017.txt`; the `form label` column is the sibling `<label class="col-sm-2 control-label">` text.*

| # | path | sess field | editor | ng model | e-title | e-label | rendered value | form label |
|---|---|---|---|---|---|---|---|---|
| #154 | `r.0.1.1.0.1.0.0.1.0.0` | `name` | text | `sess.name` |  |  | `Room 3625` |  |
| #155 | `r.0.1.1.0.1.0.1.1.0.0` | `webinarDate` | combodate | `sess.webinarDate` |  |  | `07/23/2026 @ 05:41 PM` |  |
| #158 | `r.0.1.1.0.1.0.2.1.0.0` | `authMode` | select | `sess.authMode ` |  |  | `Open - Anyone with the room link can join with their email & name` |  |
| #496 | `r.0.1.1.0.1.3.1.5.0.0.1.1` | `ssoJWTSecret` | textarea | `sess.ssoJWTSecret` |  | Secret: | `empty` | JWT Secret Key: |
| #500 | `r.0.1.1.0.1.3.1.5.0.0.2.1` | `allowPWLoginWithSSO` | checkbox | `sess.allowPWLoginWithSSO` | PW based logins ? |  | `No` | Allow PW based logins on SSO? |
| #506 | `r.0.1.1.0.1.3.1.5.0.0.5.1` | `tokenExpiresIn` | textarea | `sess.tokenExpiresIn` |  | Expires In: | `1d` | Token Expiration |
| #510 | `r.0.1.1.0.1.3.1.5.0.0.6.1` | `webinarPW` | textarea | `sess.webinarPW` |  | Password: | `empty` | Room Password: |
| #514 | `r.0.1.1.0.1.3.1.5.0.0.7.1` | `webinarPW2` | textarea | `sess.webinarPW2` |  | Temp Password: | `empty` | Temp Room Password: |
| #518 | `r.0.1.1.0.1.3.1.5.0.0.8.1` | `webinarPW3` | textarea | `sess.webinarPW3` |  | Temp Password 2: | `empty` | Temp Room Password 2: |
| #522 | `r.0.1.1.0.1.3.1.5.0.0.9.1` | `webinarPWFreeTrial` | textarea | `sess.webinarPWFreeTrial` |  | FT Password: | `empty` | Free Trial Password: |
| #526 | `r.0.1.1.0.1.3.1.5.0.0.10.1` | `deleteAlertPW` | textarea | `sess.deleteAlertPW` |  | Delete Alert Password: | `empty` | Delete Alert Password |
| #530 | `r.0.1.1.0.1.3.1.5.0.0.11.1` | `allRoomsWelcomeMatPW` | textarea | `sess.allRoomsWelcomeMatPW` |  | All Rooms Welcome Mat Password: | `empty` | All Rooms Welcome Mat Password |
| #534 | `r.0.1.1.0.1.3.1.5.0.0.12.1` | `needPasswordForUserNotes` | textarea | `sess.needPasswordForUserNotes` |  | Password to Manage User's Notes: | `empty` | Password to Manage User's Notes |
| #538 | `r.0.1.1.0.1.3.1.5.0.0.13.1` | `nickFilter` | textarea | `sess.nickFilter` |  | Nick Filter: | `empty` | Nickname filter for members: |
| #542 | `r.0.1.1.0.1.3.1.5.0.0.14.1` | `customFaviconURL` | textarea | `sess.customFaviconURL` |  | Favicon URL: | `empty` | Custom Favicon |
| #544 | `r.0.1.1.0.1.3.1.5.0.0.15.1` | `overwriteCashRegisterSound` | text | `sess.overwriteCashRegisterSound` |  | URL | `empty` | Overwrite Cash Register Sound |
| #548 | `r.0.1.1.0.1.3.1.5.0.0.16.1` | `login_webhook_url` | textarea | `sess.login_webhook_url` |  | Login Webhook URL: | `empty` | Login Webhook URL |
| #550 | `r.0.1.1.0.1.3.1.5.0.0.17.1` | `logout_webhook_url` | textarea | `sess.login_webhook_url` |  | Logout Webhook URL: | `empty` | Logout Webhook URL |
| #552 | `r.0.1.1.0.1.3.1.5.0.0.18.1` | `allowedMemberships` | textarea | `sess.allowedMemberships` |  | MemberPlan Filter: | `empty` | Membership filter: |
| #556 | `r.0.1.1.0.1.3.1.5.0.0.19.1` | `allowedProducts` | textarea | `sess.allowedProducts` |  | MemberPlan Filter: | `empty` | Product filter: |
| #560 | `r.0.1.1.0.1.3.1.5.0.0.20.1` | `allowedPerms` | textarea | `sess.allowedPerms` |  | Permissions Filter: | `empty` | Permissions filter: |
| #564 | `r.0.1.1.0.1.3.1.5.0.0.21.1` | `secTok` | textarea | `sess.secTok` |  | Secret: | `empty` | Secret Token: |
| #568 | `r.0.1.1.0.1.3.1.5.0.0.22.1` | `custRoomDriveURL` | textarea | `sess.custRoomDriveURL` |  | URL: | `empty` | Custom Room Drive URL |
| #572 | `r.0.1.1.0.1.3.1.5.0.0.23.1` | `custLogoutURL` | textarea | `sess.custLogoutURL` |  | URL: | `empty` | Custom Logout URL |
| #576 | `r.0.1.1.0.1.3.1.5.0.0.24.1` | `rosterVisibleToViewers` | checkbox | `sess.rosterVisibleToViewers` | Show Roster ? |  | `Yes!` | Show Roster ? |
| #580 | `r.0.1.1.0.1.3.1.5.0.0.25.1` | `hideWelcomeTo` | checkbox | `sess.hideWelcomeTo` | Hide Welcome To Message? |  | `No` | Hide Welcome To Message? |
| #584 | `r.0.1.1.0.1.3.1.5.0.0.26.1` | `openLoginLink` | textarea | `sess.openLoginLink` |  | URL: | `empty` | Open link on login? |
| #588 | `r.0.1.1.0.1.3.1.5.0.0.27.1` | `loginErrorURL` | textarea | `sess.loginErrorURL` |  | URL: | `empty` | Custom login error URL redirect |
| #592 | `r.0.1.1.0.1.3.1.5.0.0.28.1` | `loginErrorMsg` | textarea | `sess.loginErrorMsg` | Login error message |  | `empty` | Custom login error message |
| #596 | `r.0.1.1.0.1.3.1.5.0.0.29.1` | `onlyPresentersVisibleToViewers` | checkbox | `sess.onlyPresentersVisibleToViewers` | Show only Presenters in the roster? |  | `No` | Show only Presenters in the roster? |
| #600 | `r.0.1.1.0.1.3.1.5.0.0.30.1` | `rosterCountVisibleToViewers` | checkbox | `sess.rosterCountVisibleToViewers` | Show Roster Count? |  | `Yes!` | Show Roster Count? |
| #604 | `r.0.1.1.0.1.3.1.5.0.0.31.1` | `simUserCount` | number | `sess.simUserCount` | Simulated Count? |  | `0` | Simulated Count? |
| #608 | `r.0.1.1.0.1.3.1.5.0.0.32.1` | `userPM` | checkbox | `sess.userPM` | User PM? |  | `No` | User PMs? |
| #612 | `r.0.1.1.0.1.3.1.5.0.0.33.1` | `enablePrivateMessageHistory` | checkbox | `sess.enablePrivateMessageHistory` | Enable Private Message History? |  | `No` | Enable Private Message History? |
| #616 | `r.0.1.1.0.1.3.1.5.0.0.34.1` | `dingOnNewMessage` | checkbox | `sess.dingOnNewMessage` | Sound alert when a new message is posted? |  | `No` | Sound alert when a new message is posted? |
| #620 | `r.0.1.1.0.1.3.1.5.0.0.35.1` | `beepOnUserJoin` | checkbox | `sess.beepOnUserJoin` | Sound alert when the user joins/leaves? |  | `No` | Sound when the user joins/leaves? |
| #624 | `r.0.1.1.0.1.3.1.5.0.0.36.1` | `userJoinAndLeavePopup` | checkbox | `sess.userJoinAndLeavePopup` | Popup alert when the user joins/leaves? |  | `No` | Popup alert when the user joins/leaves? |
| #628 | `r.0.1.1.0.1.3.1.5.0.0.37.1` | `hideAvatars` | checkbox | `sess.hideAvatars` | User Avatars? |  | `No` | Hide User Avatars? |
| #632 | `r.0.1.1.0.1.3.1.5.0.0.38.1` | `hideAppInfo` | checkbox | `sess.hideAppInfo` | Mobile App Info? |  | `No` | Hide Mobile App Info? |
| #636 | `r.0.1.1.0.1.3.1.5.0.0.39.1` | `alwaysShowRoster` | checkbox | `sess.alwaysShowRoster` | Show user roster? |  | `No` | Always Show User Roster? |
| #640 | `r.0.1.1.0.1.3.1.5.0.0.40.1` | `showOnlyUsernames` | checkbox | `sess.showOnlyUsernames` | Show Only Usernames in Roster? |  | `No` | Show Only Usernames in Roster? |
| #644 | `r.0.1.1.0.1.3.1.5.0.0.41.1` | `allowUsersToChangeUsername` | checkbox | `sess.allowUsersToChangeUsername` | Allow Users to Change their Username? |  | `No` | Allow Users to Change their Usernames? |
| #648 | `r.0.1.1.0.1.3.1.5.0.0.42.1` | `disableEditingUsername` | checkbox | `sess.disableEditingUsername` | Show Only Usernames in Roster? |  | `No` | Disable Editing Username |
| #652 | `r.0.1.1.0.1.3.1.5.0.0.43.1` | `usernameInstructions` | textarea | `sess.usernameInstructions` |  | text: | `empty` | Username Instructions |
| #656 | `r.0.1.1.0.1.3.1.5.0.0.44.1` | `forgotRoomPassword` | checkbox | `sess.forgotRoomPassword` | Forgot room password? |  | `No` | Forgot room password? |
| #660 | `r.0.1.1.0.1.3.1.5.0.0.45.1` | `tawkPresenterSupport` | checkbox | `sess.tawkPresenterSupport` | Tawk Presenter Support? |  | `No` | Tawk Presenter Support? |
| #664 | `r.0.1.1.0.1.3.1.5.0.0.46.1` | `userToPresenterPM` | checkbox | `sess.userToPresenterPM` | User PM presenters? |  | `No` | User PM presenters? |
| #668 | `r.0.1.1.0.1.3.1.5.0.0.47.1` | `playChatMessageSoundFor` | textarea | `sess.playChatMessageSoundFor` |  | List of emails: | `empty` | Chat Message Sound For Emails: |
| #672 | `r.0.1.1.0.1.3.1.5.0.0.48.1` | `alertsChatOnBottom` | checkbox | `sess.alertsChatOnBottom` | Alerts/Chat on bottom? |  | `No` | Alerts/Chat on bottom? |
| #676 | `r.0.1.1.0.1.3.1.5.0.0.49.1` | `hasQAOnAlerts` | checkbox | `sess.hasQAOnAlerts` | Alert Q&A ? |  | `Yes!` | Q&A on Alerts? |
| #680 | `r.0.1.1.0.1.3.1.5.0.0.50.1` | `alertsOverlayOnScreenshare` | checkbox | `sess.alertsOverlayOnScreenshare` | Alerts over screenshare? |  | `No` | Alerts over screenshare? |
| #684 | `r.0.1.1.0.1.3.1.5.0.0.51.1` | `copyTrades` | checkbox | `sess.copyTrades` | Copy Trades? |  | `No` | Copy Trades? |
| #688 | `r.0.1.1.0.1.3.1.5.0.0.52.1` | `disableCopy` | checkbox | `sess.disableCopy` | Disable Copy? |  | `No` | Disable Copy? |
| #692 | `r.0.1.1.0.1.3.1.5.0.0.53.1` | `claimNickName` | checkbox | `sess.claimNickName` | Claim Nickname? |  | `No` | Claim Nickname? |
| #696 | `r.0.1.1.0.1.3.1.5.0.0.54.1` | `hasTypingIndicator` | checkbox | `sess.hasTypingIndicator` | Show typing indicator ? |  | `No` | Show typing indicator ? |
| #700 | `r.0.1.1.0.1.3.1.5.0.0.55.1` | `presenterMsgsOnTheRight` | checkbox | `sess.presenterMsgsOnTheRight` | Presenter chat messages on the right? |  | `No` | Presenter chat messages on the right? |
| #704 | `r.0.1.1.0.1.3.1.5.0.0.56.1` | `altChatRender` | checkbox | `sess.altChatRender` | Alt Chat Render? |  | `No` | Alt Chat Render? |
| #708 | `r.0.1.1.0.1.3.1.5.0.0.57.1` | `altRoomRender` | checkbox | `sess.altRoomRender` | Alt Room Render? |  | `No` | Alt Room Render? |
| #712 | `r.0.1.1.0.1.3.1.5.0.0.58.1` | `hasAppPairLink` | checkbox | `sess.hasAppPairLink` | App Pair Link? |  | `No` | Pair Link For App? |
| #716 | `r.0.1.1.0.1.3.1.5.0.0.59.1` | `pairSecretKey` | textarea | `sess.pairSecretKey` |  | Pair Secret Key: | `empty` | Pair Secret Key |
| #721 | `r.0.1.1.0.1.3.1.5.0.0.61.1` | `pairOKRedirect` | textarea | `sess.pairOKRedirect` |  | Pair OK Redirect: | `empty` | Pair OK Redirect |
| #723 | `r.0.1.1.0.1.3.1.5.0.0.64.1` | `pairErrorRedirect` | textarea | `sess.pairErrorRedirect` |  | Pair ERROR Redirect: | `empty` | Pair ERROR Redirect |
| #725 | `r.0.1.1.0.1.3.1.5.0.0.67.1` | `hideChatAlerts` | checkbox | `sess.hideChatAlerts` | Hide Alerts/Chat Section? |  | `No` | Hide Alerts/Chat Section? |
| #729 | `r.0.1.1.0.1.3.1.5.0.0.68.1` | `hasSwingTradeAlerts` | checkbox | `sess.hasSwingTradeAlerts` | Enable Swing Trade Alerts Tab? |  | `No` | Enable Swing Trade Alerts Tab? |
| #733 | `r.0.1.1.0.1.3.1.5.0.0.69.1` | `hasDayTradeAlerts` | checkbox | `sess.hasDayTradeAlerts` | Enable Day Trade Alerts Tab? |  | `No` | Enable Day Trade Alerts Tab? |
| #737 | `r.0.1.1.0.1.3.1.5.0.0.70.1` | `usersPublicReply` | checkbox | `sess.usersPublicReply` | User Public Reply? |  | `No` | User Public Reply? |
| #741 | `r.0.1.1.0.1.3.1.5.0.0.71.1` | `chatDisabledForTrials` | checkbox | `sess.chatDisabledForTrials` | Chat Disabled For Trials? |  | `No` | Chat Disabled For Trials? |
| #745 | `r.0.1.1.0.1.3.1.5.0.0.72.1` | `disablePMForTrials` | checkbox | `sess.disablePMForTrials` | Disable PM For Trials? |  | `No` | Disable PM For Trials? |
| #749 | `r.0.1.1.0.1.3.1.5.0.0.73.1` | `usersCanDeleteOwnMsgs` | checkbox | `sess.usersCanDeleteOwnMsgs` | Users Can Delete Own Messages? |  | `No` | Users Can Delete Own Messages? |
| #753 | `r.0.1.1.0.1.3.1.5.0.0.74.1` | `smallerImagePreview` | checkbox | `sess.smallerImagePreview` | Smaller image previews? |  | `No` | Smaller image previews? |
| #757 | `r.0.1.1.0.1.3.1.5.0.0.75.1` | `hideNotes` | checkbox | `sess.hideNotes` | Hide notes Section? |  | `No` | Hide Notes Section? |
| #761 | `r.0.1.1.0.1.3.1.5.0.0.76.1` | `hideFiles` | checkbox | `sess.hideFiles` | Hide files Section? |  | `No` | Hide Files Section? |
| #765 | `r.0.1.1.0.1.3.1.5.0.0.77.1` | `darkThemeAsDefault` | checkbox | `sess.darkThemeAsDefault` | Dark Theme As Default? |  | `No` | Set Dark Theme As Default? |
| #769 | `r.0.1.1.0.1.3.1.5.0.0.78.1` | `saveWebinarModeChat` | checkbox | `sess.saveWebinarModeChat` | Preserve Webinar Mode chat? |  | `No` | Preserve Webinar Mode chat? |
| #773 | `r.0.1.1.0.1.3.1.5.0.0.79.1` | `showArchivesToUsers` | checkbox | `sess.showArchivesToUsers` | User Archives? |  | `No` | Show Archives? |
| #777 | `r.0.1.1.0.1.3.1.5.0.0.80.1` | `showArchivesToSpecificPresenters` | textarea | `sess.showArchivesToSpecificPresenters` |  | email: | `empty` | Show Archives to specific Presenters |
| #781 | `r.0.1.1.0.1.3.1.5.0.0.81.1` | `disalowSporadicMultiLogins` | checkbox | `sess.disalowSporadicMultiLogins` | Prevent sporadic? |  | `No` | Prevent sporadic reconnects? |
| #785 | `r.0.1.1.0.1.3.1.5.0.0.82.1` | `disalowMultiLogins` | checkbox | `sess.disalowMultiLogins` | Disalow Multi-Logins? |  | `No` | Disalow Multi-logins? |
| #789 | `r.0.1.1.0.1.3.1.5.0.0.83.1` | `sendReportEmails` | checkbox | `sess.sendReportEmails` | Send emails? |  | `Yes!` | Send report email? |
| #793 | `r.0.1.1.0.1.3.1.5.0.0.84.1` | `banIPList` | textarea | `sess.banIPList` |  | email: | `empty` | Ban IP list |
| #797 | `r.0.1.1.0.1.3.1.5.0.0.85.1` | `reportEmail` | textarea | `sess.reportEmail` |  | email: | `empty` | Report emails |
| #801 | `r.0.1.1.0.1.3.1.5.0.0.86.1` | `customJWTErrorMessage` | textarea | `sess.customJWTErrorMessage` |  | text: | `empty` | Custom JWT Error Message |
| #805 | `r.0.1.1.0.1.3.1.5.0.0.87.1` | `sendOpenCloseEmail` | textarea | `sess.sendOpenCloseEmail` |  | email: | `empty` | Open/Close Room emails |
| #809 | `r.0.1.1.0.1.3.1.5.0.0.88.1` | `autoOpenTime` | textarea | `sess.autoOpenTime` |  | Open Time: | `empty` | Auto Open Room Time |
| #813 | `r.0.1.1.0.1.3.1.5.0.0.89.1` | `autoCloseTime` | textarea | `sess.autoCloseTime` |  | Close Time: | `empty` | Auto Close Room Time |
| #817 | `r.0.1.1.0.1.3.1.5.0.0.90.1` | `ignoreAutoOpenCloseOnWeekend` | checkbox | `sess.ignoreAutoOpenCloseOnWeekend` | Ignore Auto Open & Close On Weekend? |  | `No` | Ignore Auto Open & Close On Weekend |
| #819 | `r.0.1.1.0.1.3.1.5.0.0.91.1` | `alertSoundOff` | checkbox | `sess.alertSoundOff` | Alerts Sound Off? |  | `No` | Alerts Sound Off? |
| #823 | `r.0.1.1.0.1.3.1.5.0.0.92.1` | `styckyNonTradeAlert` | checkbox | `sess.styckyNonTradeAlert` | Sticky Non-Trade Alerts? |  | `No` | Sticky Non-Trade Alerts? |
| #827 | `r.0.1.1.0.1.3.1.5.0.0.93.1` | `fileAccessCaseByCase` | checkbox | `sess.fileAccessCaseByCase` | Shared Files Access Case/Case? |  | `No` | Shared Files Access Case/Case? |
| #831 | `r.0.1.1.0.1.3.1.5.0.0.94.1` | `isChatOnlyRoom` | checkbox | `sess.isChatOnlyRoom` | Disable Screen & Audio? |  | `No` | Chat Only Room? |
| #835 | `r.0.1.1.0.1.3.1.5.0.0.95.1` | `chatAutoClear` | checkbox | `sess.chatAutoClear` | Auto Clear Chat? |  | `No` | Auto Clear Chat? |
| #839 | `r.0.1.1.0.1.3.1.5.0.0.96.1` | `alertsAutoClear` | checkbox | `sess.alertsAutoClear` | Auto Clear Alerts? |  | `No` | Auto Clear Alerts? |
| #843 | `r.0.1.1.0.1.3.1.5.0.0.97.1` | `chatAutoClearSpecialHour` | textarea | `sess.chatAutoClearSpecialHour` |  | Nick Filter: | `empty` | Overwrite Clear Hour: |
| #847 | `r.0.1.1.0.1.3.1.5.0.0.98.1` | `chatAutoClearWeekend` | checkbox | `sess.chatAutoClearWeekend` | Auto Clear Chat? |  | `No` | Auto Clear Chat Weekend? |
| #851 | `r.0.1.1.0.1.3.1.5.0.0.99.1` | `archiveAlertsLog` | checkbox | `sess.archiveAlertsLog` | Archive Alerts? |  | `Yes!` | Archive Alerts? |
| #855 | `r.0.1.1.0.1.3.1.5.0.0.100.1` | `archiveChatLog` | checkbox | `sess.archiveChatLog` | Archive Chats? |  | `Yes!` | Archive Chatlog? |
| #857 | `r.0.1.1.0.1.3.1.5.0.0.101.1` | `hideChatLog` | checkbox | `sess.hideChatLog` | Hide Chatlog from Archive? |  | `No` | Hide Chatlog from Archive? |
| #861 | `r.0.1.1.0.1.3.1.5.0.0.102.1` | `hasAlertScheduler` | checkbox | `sess.hasAlertScheduler` | Enable Alert Scheduler? |  | `No` | Enable alert scheduler? |
| #865 | `r.0.1.1.0.1.3.1.5.0.0.103.1` | `enableVideoPlayer` | checkbox | `sess.enableVideoPlayer` | Video Player? |  | `Yes!` | Enable VideoPlayer? |
| #869 | `r.0.1.1.0.1.3.1.5.0.0.104.1` | `userUploads` | checkbox | `sess.userUploads` | Allow User Screenshots? |  | `No` | User Chat Screenshots? |
| #873 | `r.0.1.1.0.1.3.1.5.0.0.105.1` | `enableDiscord` | checkbox | `sess.enableDiscord` | Enable Discord? |  | `No` | Enable Discord? |
| #877 | `r.0.1.1.0.1.3.1.5.0.0.106.1` | `disableEmojis` | checkbox | `sess.disableEmojis` | Disable Emojis? |  | `No` | Disable Emojis? |
| #881 | `r.0.1.1.0.1.3.1.5.0.0.107.1` | `enableRTE` | checkbox | `sess.enableRTE` | Enable Rich Text Editor? |  | `No` | Enable Rich Text Editor? |
| #885 | `r.0.1.1.0.1.3.1.5.0.0.108.1` | `enableReactions` | checkbox | `sess.enableReactions` | Enable Reactions? |  | `No` | Enable Reactions? |
| #889 | `r.0.1.1.0.1.3.1.5.0.0.109.1` | `enableQAReactions` | checkbox | `sess.enableQAReactions` | Enable Reactions? |  | `No` | Enable QA Reactions? |
| #893 | `r.0.1.1.0.1.3.1.5.0.0.110.1` | `enableEditMessage` | checkbox | `sess.enableEditMessage` | Enable Edit Messages? |  | `No` | Enable Edit Messages? |
| #897 | `r.0.1.1.0.1.3.1.5.0.0.111.1` | `enableEditAlerts` | checkbox | `sess.enableEditAlerts` | Enable Edit Alerts? |  | `No` | Enable Edit Alerts? |
| #901 | `r.0.1.1.0.1.3.1.5.0.0.112.1` | `alertLabels` | textarea | `sess.alertLabels` |  | Alert Labels: | `empty` | Alert Labels |
| #905 | `r.0.1.1.0.1.3.1.5.0.0.113.1` | `advancedSearchAlerts` | checkbox | `sess.advancedSearchAlerts` | Advanced Alerts Search? |  | `No` | Advanced Search Alerts? |
| #909 | `r.0.1.1.0.1.3.1.5.0.0.114.1` | `enableDeleteLog` | checkbox | `sess.enableDeleteLog` | Enable Delete Log? |  | `No` | Enable Delete Log? |
| #913 | `r.0.1.1.0.1.3.1.5.0.0.115.1` | `enableBadges` | checkbox | `sess.enableBadges` | User Badges? |  | `No` | User Badges? |
| #917 | `r.0.1.1.0.1.3.1.5.0.0.116.1` | `enableTokenBadges` | checkbox | `sess.enableTokenBadges` | Token Badges? |  | `No` | Token Badges? |
| #921 | `r.0.1.1.0.1.3.1.5.0.0.117.1` | `remToken` | checkbox | `sess.remToken` | Remove token from url? |  | `No` | Remove token from url |
| #925 | `r.0.1.1.0.1.3.1.5.0.0.118.1` | `showBadgesToPresentersOnly` | checkbox | `sess.showBadgesToPresentersOnly` | Show Badges only Presenters? |  | `No` | Show Badges only to Presenters? |
| #929 | `r.0.1.1.0.1.3.1.5.0.0.119.1` | `dontFollowPresenters` | checkbox | `sess.dontFollowPresenters` | Don't follow Presenters? |  | `No` | Don't follow Presenters? |
| #933 | `r.0.1.1.0.1.3.1.5.0.0.120.1` | `disableStarYears` | checkbox | `sess.disableStarYears` | Disable Stars? |  | `No` | Disable Stars ? |
| #937 | `r.0.1.1.0.1.3.1.5.0.0.121.1` | `hasRequiredPhoneInLogin` | checkbox | `sess.hasRequiredPhoneInLogin` | Phone Required? |  | `No` | Phone Number Required? |
| #941 | `r.0.1.1.0.1.3.1.5.0.0.122.1` | `showPasswordField` | checkbox | `sess.showPasswordField` | Show password field? |  | `No` | Show password field? |
| #945 | `r.0.1.1.0.1.3.1.5.0.0.123.1` | `isMainRoom` | checkbox | `sess.isMainRoom` | Is Main Room? |  | `No` | Is Main Room? |
| #947 | `r.0.1.1.0.1.3.1.5.0.0.124.1` | `isArchivedRoom` | checkbox | `sess.isArchivedRoom` | Is Archived Room? |  | `No` | Is Archived Room? |
| #949 | `r.0.1.1.0.1.3.1.5.0.0.125.1` | `isNewIndicatorOn` | checkbox | `sess.isNewIndicatorOn` | Is New Room? |  | `No` | Is New Room? |
| #951 | `r.0.1.1.0.1.3.1.5.0.0.126.1` | `hasBenzingaNews` | checkbox | `sess.hasBenzingaNews` | BZ News? |  | `No` | BZ News (DO NOT USE UNLESS YOU HAVE API) |
| #955 | `r.0.1.1.0.1.3.1.5.0.0.127.1` | `altBenzingaLogoURL` | textarea | `sess.altBenzingaLogoURL` |  | URL: | `empty` | Custom Benzinga logo url |
| #959 | `r.0.1.1.0.1.3.1.5.0.0.128.1` | `altBenzingaLinkURL` | textarea | `sess.altBenzingaLinkURL` |  | URL: | `empty` | Custom Benzinga link url |
| #963 | `r.0.1.1.0.1.3.1.5.0.0.129.1` | `imgurClientID` | text | `sess.imgurClientID` |  |  | `empty` | Imgur ClientID: |
| #965 | `r.0.1.1.0.1.3.1.5.0.0.130.1` | `imgurApiKey` | text | `sess.imgurApiKey` |  |  | `empty` | Imgur api key: |
| #967 | `r.0.1.1.0.1.3.1.5.0.0.131.1` | `imgurRapidKey` | textarea | `sess.imgurRapidKey` |  |  | `empty` | Imgur rapid key: |
| #969 | `r.0.1.1.0.1.3.1.5.0.0.132.1` | `xuserAccessToken` | textarea | `sess.xuserAccessToken` |  | URL: | `empty` | X User Access Token: |
| #971 | `r.0.1.1.0.1.3.1.5.0.0.133.1` | `xuserAccessTokenSecret` | textarea | `sess.xuserAccessTokenSecret` |  | URL: | `empty` | X User Access Token Secret: |
| #973 | `r.0.1.1.0.1.3.1.5.0.0.134.1` | `subscriptionPlans` | textarea | `sess.subscriptionPlans` |  | Subscription Plans: | `empty` | Subscription Plans: |
| #977 | `r.0.1.1.0.1.3.1.5.0.0.135.1` | `stripeEmail` | textarea | `sess.stripeEmail` |  | Stripe Email: | `empty` | Stripe Email: |
| #979 | `r.0.1.1.0.1.3.1.5.0.0.136.1` | `enableLiveStats` | checkbox | `sess.enableLiveStats` | Live stats? |  | `No` | Live User stats? |
| #981 | `r.0.1.1.0.1.3.1.5.0.0.137.1` | `collectsUserStats` | checkbox | `sess.collectsUserStats` | UserXrefStats? |  | `No` | UserXrefStats? |
| #984 | `r.0.1.1.0.1.3.1.5.0.0.138.1` | `apiSecret` | textarea | `sess.apiSecret` |  | URL: | `empty` | API secret |
| #988 | `r.0.1.1.0.1.3.1.5.0.0.140.1` | `slackPostURL` | textarea | `sess.slackPostURL` |  | URL: | `empty` | Slack post URL secret |
| #990 | `r.0.1.1.0.1.3.1.5.0.0.141.1` | `diasableFCMAlerts` | checkbox | `sess.diasableFCMAlerts` | disable PUSH Alerts ? |  | `No` | Disable PUSH Alerts? |
| #992 | `r.0.1.1.0.1.3.1.5.0.0.142.1` | `modMessage` | textarea | `sess.modMessage` |  | MSG: | `empty` | Moderator Message: |
| #994 | `r.0.1.1.0.1.3.1.5.0.0.143.1` | `positionsIframeUrl` | textarea | `sess.positionsIframeUrl` |  | URL: | `empty` | Positions Iframe Url |
| #996 | `r.0.1.1.0.1.3.1.5.0.0.144.1` | `positionsIframe` | checkbox | `sess.positionsIframe` | Enable positions iframe? |  | `No` | Enable positions iframe? |
| #998 | `r.0.1.1.0.1.3.1.5.0.0.145.1` | `tipMeBtnEnabled` | checkbox | `sess.tipMeBtnEnabled` | Enable Tip Me Button? |  | `No` | Enable Tip Me Button? |
| #1000 | `r.0.1.1.0.1.3.1.5.0.0.146.1` | `tipMeBtnTxt` | textarea | `sess.tipMeBtnTxt` |  | Text: | `Tip Me?` | Tip Me Button Text |
| #1002 | `r.0.1.1.0.1.3.1.5.0.0.147.1` | `tipMeBtnUrl` | textarea | `sess.tipMeBtnUrl` |  | Text: | `empty` | Tip Me Button Url |
| #1004 | `r.0.1.1.0.1.3.1.5.0.0.148.1` | `salesBanner` | textarea | `sess.salesBanner` |  | Text: | `empty` | Sales Banner |
| #1006 | `r.0.1.1.0.1.3.1.5.0.0.149.1` | `modAdminLoginList` | textarea | `sess.modAdminLoginList` |  | Admin login list: | `empty` | Admin panel access list: |
| #1010 | `r.0.1.1.0.1.3.1.5.0.0.150.1` | `isAlertOnly` | checkbox | `sess.isAlertOnly` | Alerts only room ? |  | `No` | Alerts only Room? |
| #1014 | `r.0.1.1.0.1.3.1.5.0.0.151.1` | `customClientAlertPostURL` | textarea | `sess.customClientAlertPostURL` |  | URL: | `empty` | Custom Alert POST |
| #1018 | `r.0.1.1.0.1.3.1.5.0.0.152.1` | `customClientAlertPostSecret` | textarea | `sess.customClientAlertPostSecret` |  | Secret: | `empty` | Custom Alert secret |
| #1022 | `r.0.1.1.0.1.3.1.5.0.0.153.1` | `strictBrowserMode` | checkbox | `sess.strictBrowserMode` | Strict Browser? |  | `No` | Strict Browser? |
| #1026 | `r.0.1.1.0.1.3.1.5.0.0.154.1` | `chatFloodDisabled` | checkbox | `sess.chatFloodDisabled` | Disable Chat Flood ? |  | `No` | Disable Chat Flood? |
| #1028 | `r.0.1.1.0.1.3.1.5.0.0.155.1` | `privMessageHugePopup` | checkbox | `sess.privMessageHugePopup` | Huge Priv Msg? |  | `No` | Huge Priv Msg Alert? |
| #1032 | `r.0.1.1.0.1.3.1.5.0.0.156.1` | `hasChannelTabs` | checkbox | `sess.hasChannelTabs` | Chat Channels? |  | `Yes!` | OffTopic Channels/Tabs |
| #1036 | `r.0.1.1.0.1.3.1.5.0.0.157.1` | `autoSwitchToOfftopics` | checkbox | `sess.autoSwitchToOfftopics` | Auto Switch To Offtopics Channel? |  | `No` | Auto switch to OffTopic Channels/Tabs? |
| #1040 | `r.0.1.1.0.1.3.1.5.0.0.158.1` | `hasAdminOnlyChannel` | checkbox | `sess.hasAdminOnlyChannel` | Admin Channel? |  | `No` | Admin Channels/Tabs |
| #1044 | `r.0.1.1.0.1.3.1.5.0.0.159.1` | `extraAdminChannels` | textarea | `sess.extraAdminChannels` |  | email: | `empty` | Extra Admin Channels |
| #1048 | `r.0.1.1.0.1.3.1.5.0.0.160.1` | `extraRegChannels` | textarea | `sess.extraRegChannels` |  | email: | `empty` | Extra Regular Channels |
| #1052 | `r.0.1.1.0.1.3.1.5.0.0.161.1` | `altGenChannelName` | textarea | `sess.altGenChannelName` |  | email: | `empty` | Rename \"Main Chat\" |
| #1056 | `r.0.1.1.0.1.3.1.5.0.0.162.1` | `altOffTopicChannelName` | textarea | `sess.altOffTopicChannelName` |  | email: | `empty` | Rename \"Off-Topic\" |
| #1060 | `r.0.1.1.0.1.3.1.5.0.0.163.1` | `chatTabsWithBadges` | textarea | `sess.chatTabsWithBadges` |  | Chat Tabs With Badges: | `empty` | Chat Tabs With Badges: |
| #1064 | `r.0.1.1.0.1.3.1.5.0.0.164.1` | `hasProfanityFilter` | checkbox | `sess.hasProfanityFilter` | Filter bad words? |  | `No` | Chat Profanity filter? |
| #1068 | `r.0.1.1.0.1.3.1.5.0.0.165.1` | `ingnoreBadWordsList` | text | `sess.ingnoreBadWordsList` |  | Comma Separated Ignore list | `empty` | Ignore List |
| #1071 | `r.0.1.1.0.1.3.1.5.0.0.166.1` | `additionalBadWordsList` | text | `sess.additionalBadWordsList` |  | Comma Separated additional list | `empty` | Extra Bad list |
| #1074 | `r.0.1.1.0.1.3.1.5.0.0.167.1` | `simplifiedEditor` | checkbox | `sess.simplifiedEditor` | Enable Simplified Note Editor? |  | `No` | Simplified Note Editor? |
| #1078 | `r.0.1.1.0.1.3.1.5.0.0.168.1` | `audioMeterDisabled` | checkbox | `sess.audioMeterDisabled` | Disable Audio Meter? |  | `No` | Disable Audio Meter? |
| #1082 | `r.0.1.1.0.1.3.1.5.0.0.169.1` | `hideWebcamForRoom` | checkbox | `sess.hideWebcamForRoom` | Hide WebCam in the room? |  | `No` | Hide WebCam in the room? |
| #1086 | `r.0.1.1.0.1.3.1.5.0.0.170.1` | `recordChat` | checkbox | `sess.recordChat` | Record alerts and chat? |  | `No` | Record alerts and chat? |
| #1088 | `r.0.1.1.0.1.3.1.5.0.0.171.1` | `autoRecord` | checkbox | `sess.autoRecord` | Auto record presenters? |  | `No` | Auto record presenters? |
| #1090 | `r.0.1.1.0.1.3.1.5.0.0.172.1` | `blinkingRec` | checkbox | `sess.blinkingRec` | Blinking [REC]? |  | `No` | Blinking [REC]? |
| #1092 | `r.0.1.1.0.1.3.1.5.0.0.173.1` | `hideRecs` | checkbox | `sess.hideRecs` | Hide Recordings? |  | `No` | Hide Recordings? |
| #1096 | `r.0.1.1.0.1.3.1.5.0.0.174.1` | `recordingReminder` | checkbox | `sess.recordingReminder` | Recording Reminder If Speaking? |  | `No` | Recording Reminder If Speaking? |
| #1100 | `r.0.1.1.0.1.3.1.5.0.0.175.1` | `recsInRoom` | checkbox | `sess.recsInRoom` | Show Recordings in the room? |  | `No` | Show Recordings tab in the room? |
| #1104 | `r.0.1.1.0.1.3.1.5.0.0.176.1` | `downloadRecordingsDisabled` | checkbox | `sess.downloadRecordingsDisabled` | Disable download button for Recordings for users? |  | `No` | Disable download button for Recordings for users? |
| #1108 | `r.0.1.1.0.1.3.1.5.0.0.177.1` | `hasSpeechRecognitionDisabled` | checkbox | `sess.hasSpeechRecognitionDisabled` | Disable closed captioning? |  | `No` | Disable Closed Captioning? |
| #1112 | `r.0.1.1.0.1.3.1.5.0.0.178.1` | `dontShowRecInfoToUsers` | checkbox | `sess.dontShowRecInfoToUsers` | Hide recordings info for users? |  | `No` | Hide recordings info for users? |
| #1116 | `r.0.1.1.0.1.3.1.5.0.0.179.1` | `runawayRecMinutes` | number | `sess.runawayRecMinutes` | Minutes of recording inactivity? |  | `5` | Minutes of recording inactivity? |
| #1120 | `r.0.1.1.0.1.3.1.5.0.0.180.1` | `runawayRecAutoKill` | checkbox | `sess.runawayRecAutoKill` | Auto stop recording if inactive? |  | `No` | Auto stop recording if inactive? |
| #1124 | `r.0.1.1.0.1.3.1.5.0.0.181.1` | `runawayRecPostURL` | textarea | `sess.runawayRecPostURL` |  | URL: | `empty` | Slack url to post |
| #1128 | `r.0.1.1.0.1.3.1.5.0.0.182.1` | `stickyGiveMicAndCam` | checkbox | `sess.stickyGiveMicAndCam` | Sticky give Mic/Cam? |  | `No` | Sticky give Mic/Cam? |
| #1132 | `r.0.1.1.0.1.3.1.5.0.0.183.1` | `overlayUserIdOnScreenshare` | checkbox | `sess.overlayUserIdOnScreenshare` | Overlay userID on screenshare? |  | `No` | Overlay userID on screenshare? |
| #1136 | `r.0.1.1.0.1.3.1.5.0.0.184.1` | `regUserCanPresent` | checkbox | `sess.regUserCanPresent` | Auto give mic/screen to Regular users? |  | `No` | Auto give Mic/Screen to Users? |
| #1140 | `r.0.1.1.0.1.3.1.5.0.0.185.1` | `dontStopRecOnMicMute` | checkbox | `sess.dontStopRecOnMicMute` | Don't rec stop on mic mute? |  | `No` | Don't stop on mute? |
| #1144 | `r.0.1.1.0.1.3.1.5.0.0.186.1` | `individualVolumeControls` | checkbox | `sess.individualVolumeControls` | Individual Volume Controls? |  | `No` | Individual Volume Controls? |
| #1148 | `r.0.1.1.0.1.3.1.5.0.0.187.1` | `remote_recording` | checkbox | `sess.remote_recording` | New Rec? |  | `No` | NEW recording procedure? |
| #1152 | `r.0.1.1.0.1.3.1.5.0.0.188.1` | `saveRecsToS3` | checkbox | `sess.saveRecsToS3` | Save Recordings to S3? |  | `No` | Save Recs to AWS S3 |
| #1154 | `r.0.1.1.0.1.3.1.5.0.0.189.1` | `s3KeyID` | text | `sess.s3KeyID` |  | S3 Key Name | `empty` | S3 Key ID/Name |
| #1156 | `r.0.1.1.0.1.3.1.5.0.0.190.1` | `s3KeySecret` | text | `sess.s3KeySecret` |  | S3 Key Secret | `empty` | S3 Key Secret |
| #1158 | `r.0.1.1.0.1.3.1.5.0.0.191.1` | `s3Bucket` | text | `sess.s3Bucket` |  | S3 Bucket | `empty` | S3 Bucket |
| #1160 | `r.0.1.1.0.1.3.1.5.0.0.192.1` | `s3BucketFolderPath` | text | `sess.s3BucketFolderPath` |  | S3 Bucket subfolder | `empty` | S3 Bucket subfolder/path |
| #1162 | `r.0.1.1.0.1.3.1.5.0.0.194.1` | `saveRecsToVimeo` | checkbox | `sess.saveRecsToVimeo` | Save Recordings to saveRecsToVimeo? |  | `No` | Save Recs to Vimeo |
| #1164 | `r.0.1.1.0.1.3.1.5.0.0.195.1` | `vimeoClientID` | text | `sess.vimeoClientID` |  | Vimeo ClientID | `empty` | Vimeo ClientID |
| #1166 | `r.0.1.1.0.1.3.1.5.0.0.196.1` | `vimeoClientSecret` | text | `sess.vimeoClientSecret` |  | Vimeo Secret | `empty` | Vimeo Secret |
| #1168 | `r.0.1.1.0.1.3.1.5.0.0.197.1` | `vimeoToken` | text | `sess.vimeoToken` |  | Token | `empty` | Vimeo Token |
| #1170 | `r.0.1.1.0.1.3.1.5.0.0.198.1` | `vimeoFolderPath` | text | `sess.vimeoFolderPath` |  | Folder Path | `empty` | Vimeo Folder ID (optional) |
| #1172 | `r.0.1.1.0.1.3.1.5.0.0.199.1` | `obsBroadcastRoom` | checkbox | `sess.obsBroadcastRoom` | Broadcast using OBS? |  | `No` | Broadcast using OBS? |
| #1174 | `r.0.1.1.0.1.3.1.5.0.0.200.1` | `obsStreamKey` | text | `sess.obsStreamKey` |  |  | `empty` | OBS Stream Key |
| #1176 | `r.0.1.1.0.1.3.1.5.0.0.201.1` | `obsStreamSatusWebHookURL` | text | `sess.obsStreamSatusWebHookURL` |  |  | `empty` | OBS Stream Satus WebHook URL |
| #1178 | `r.0.1.1.0.1.3.1.5.0.0.202.1` | `restreamToURL` | text | `sess.restreamToURL` |  |  | `empty` | Restream URL |
| #1180 | `r.0.1.1.0.1.3.1.5.0.0.203.1` | `restreamToURLKey` | text | `sess.restreamToURLKey` |  |  | `empty` | Restream Key |
| #1182 | `r.0.1.1.0.1.3.1.5.0.0.205.1` | `x264_encArgs` | text | `sess.x264_encArgs` |  | Rec Params | `empty` | Custom Rec Params |
| #1184 | `r.0.1.1.0.1.3.1.5.0.0.206.1` | `twillioApiSID` | text | `sess.twillioApiSID` |  | Twillio SID | `empty` | Twillio SID |
| #1186 | `r.0.1.1.0.1.3.1.5.0.0.207.1` | `twillioApiToken` | text | `sess.twillioApiToken` |  | Token SID | `empty` | Twillio Token |
| #1188 | `r.0.1.1.0.1.3.1.5.0.0.208.1` | `twilioPhone` | text | `sess.twilioPhone` |  | Token SID | `empty` | Twillio Phone |
| #1190 | `r.0.1.1.0.1.3.1.5.0.0.209.1` | `protextingSecretTok` | text | `sess.protextingSecretTok` |  | Token | `empty` | Protexting Token |
| #1192 | `r.0.1.1.0.1.3.1.5.0.0.210.1` | `protextingGroupIDs` | text | `sess.protextingGroupIDs` |  | GroupIDs | `empty` | Protexting GroupID |
| #1194 | `r.0.1.1.0.1.3.1.5.0.0.211.1` | `h264Enabled` | checkbox | `sess.h264Enabled` | Use h264 codec ? |  | `Yes!` | Use h264 codec? |
| #1196 | `r.0.1.1.0.1.3.1.5.0.0.212.1` | `vp9Enabled` | checkbox | `sess.vp9Enabled` | Use VP9 codec ? |  | `No` | Use VP9 codec? |
| #1198 | `r.0.1.1.0.1.3.1.5.0.0.213.1` | `hqVideo` | checkbox | `sess.hqVideo` | Use HQ Video ? |  | `No` | Use HQ Video? |
| #1201 | `r.0.1.1.0.1.3.1.5.0.0.214.1` | `customPlayerURL` | text | `sess.customPlayerURL` |  | Custom Player URL | `empty` | Custom Player URL |
| #1205 | `r.0.1.1.0.1.3.1.5.0.0.215.1` | `iframeSSOTFix` | checkbox | `sess.iframeSSOTFix` | UIframe Cookie Fix ? |  | `No` | Iframe Cookie Fix? |
| #1207 | `r.0.1.1.0.1.3.1.5.0.0.216.1` | `autoResetSession` | checkbox | `sess.autoResetSession` | autoreset sess? |  | `No` | Autoreset sess at 12am? |
| #1209 | `r.0.1.1.0.1.3.1.5.0.0.217.1` | `doNotAutoSoftReset` | checkbox | `sess.doNotAutoSoftReset` | Don't softreset sess? |  | `No` | Don't Soft reset at 12am? |
| #1211 | `r.0.1.1.0.1.3.1.5.0.0.219.1` | `sendFcmAlertsNew` | checkbox | `sess.sendFcmAlertsNew` | new FCM method? |  | `No` | New FCM Method? |
| #1213 | `r.0.1.1.0.1.3.1.5.0.0.220.1` | `ptrMobileAppExpirePairCodeDays` | number | `sess.ptrMobileAppExpirePairCodeDays` | PTR code expire: |  | `7` | PTR app exp days |
| #1215 | `r.0.1.1.0.1.3.1.5.0.0.221.1` | `mobileAppExpireNotificationsDays` | number | `sess.mobileAppExpireNotificationsDays` | PUSH expire days: |  | `14` | Push expire days |
| #1217 | `r.0.1.1.0.1.3.1.5.0.0.222.1` | `customEnterDisclosure` | textarea | `sess.customEnterDisclosure` |  | URL: | `empty` | Custom Legal Disclosure |
| #1221 | `r.0.1.1.0.1.3.1.5.0.0.223.1` | `customUserInfoURL` | text | `sess.customUserInfoURL` |  | URL | `empty` | Custom User Info Page |
| #1223 | `r.0.1.1.0.1.3.1.5.0.0.224.1` | `stAppScheduleID` | text | `sess.stAppScheduleID` |  | Goog Calendar ID | `empty` | Scheudle ID (GCal) |
| #1225 | `r.0.1.1.0.1.3.1.5.0.0.225.1` | `invalidTokens` | textarea | `sess.invalidTokens` |  | Invalid Tokens: | `empty` | Invalid Tokens |
| #1335 | `r.0.1.1.0.1.3.1.3.0.0.1.0.0` | `ssoHost` | text | `sess.ssoHost` |  |  | `empty` |  |
| #1357 | `r.0.1.1.0.1.3.1.5.0.4.0.0.1` | `useV3` | checkbox | `sess.useV3` | Use v3? |  | `Yes!` | Use v3? (DON'T!) |
| #1359 | `r.0.1.1.0.1.3.1.5.0.4.0.1.1` | `useV5` | checkbox | `sess.useV5` | Use v5? |  | `No` | Use v5? (DON'T!) |
| #1361 | `r.0.1.1.0.1.3.1.5.0.4.0.2.1` | `clusterID` | text | `sess.clusterID` |  | Server | `empty` | ClusterID |
| #1365 | `r.0.1.1.0.1.3.1.5.0.4.0.2.5` | `backupClusterID` | text | `sess.backupClusterID` |  | Server | `empty` | ClusterID |
| #1371 | `r.0.1.1.0.1.3.1.5.0.4.0.6.1` | `superClusterID` | text | `sess.superClusterID` |  | Server | `empty` | Super ClusterID |
| #1377 | `r.0.1.1.0.1.3.1.5.0.4.0.6.7` | `superClusterExpectedServerCount` | number | `sess.superClusterExpectedServerCount` |  | Expected Server Count | `0` | Super ClusterID |
| #1381 | `r.0.1.1.0.1.3.1.5.0.4.0.7.1` | `useFFmpegRecording` | checkbox | `sess.useFFmpegRecording` | Use FFmpeg for Recording? |  | `No` | Use FFmpeg for Recording (BETA) |
| #1383 | `r.0.1.1.0.1.3.1.5.0.4.0.9.1` | `useLessBusyVsRoundRobin` | checkbox | `sess.useLessBusyVsRoundRobin` | Use less busy? |  | `No` | Use Less busy server algo vs round robin |
| #1385 | `r.0.1.1.0.1.3.1.5.0.4.0.11.1` | `useMediaMTX` | checkbox | `sess.useMediaMTX` | Use MediaMTX? |  | `No` | Use MediaMTX? |
| #1387 | `r.0.1.1.0.1.3.1.5.0.4.0.12.1` | `mediaMTXClusterID` | text | `sess.mediaMTXClusterID` |  | MediaMTX ClusterID: | `empty` | MediaMTX ClusterID |
| #1389 | `r.0.1.1.0.1.3.1.5.0.4.0.13.1` | `backupMediaMTXClustterID` | text | `sess.backupMediaMTXClustterID` |  | Backup MediaMTX ClustterID: | `empty` | Backup MediaMTX ClustterID |
| #1391 | `r.0.1.1.0.1.3.1.5.0.4.0.14.1` | `media_max_bitrate` | text | `sess.media_max_bitrate` |  | BitRate | `512000` | ScreenShare MAX BitRate |
| #1395 | `r.0.1.1.0.1.3.1.5.0.4.0.15.1` | `media_fir_rate` | text | `sess.media_fir_rate` |  | KeyFrameRate | `5` | ScreenShare KeyFrame Rate  (i.e. 5, 10, 15) |
| #1399 | `r.0.1.1.0.1.3.1.5.0.4.0.16.1` | `hasYTStreaming` | checkbox | `sess.hasYTStreaming` | FB / YT Streaming? |  | `No` | Enable FB Live/YouTube Live |
| #1401 | `r.0.1.1.0.1.3.1.5.0.4.0.18.1` | `media_relays` | textarea | `sess.media_relays` | Repeaters: |  | `empty` | Repeater List |
| #1415 | `r.0.1.1.0.1.3.1.5.0.4.0.22.1` | `isLocked` | checkbox | `sess.isLocked` | Lock Session? |  | `No` | Lock Session? |
| #1419 | `r.0.1.1.0.1.3.1.5.0.4.0.23.1` | `chatServerURL` | textarea | `sess.chatServerURL` |  | Talk URL: | `/talk` | Talk URL |
| #1423 | `r.0.1.1.0.1.3.1.5.0.4.0.25.1` | `force_jpeg_screenshare` | checkbox | `sess.force_jpeg_screenshare` | Force JPG Screens? |  | `No` | Force JPG Screens |
| #1425 | `r.0.1.1.0.1.3.1.5.0.4.0.26.1` | `force_mp3_audio` | checkbox | `sess.force_mp3_audio` | Force  MP3 Audio? |  | `No` | Force MP3 Audio |
| #1427 | `r.0.1.1.0.1.3.1.5.0.4.0.27.1` | `node_media_relays` | textarea | `sess.node_media_relays` | Node Repeaters: |  | `empty` | Node Repeater List |
| #1431 | `r.0.1.1.0.1.3.1.5.0.4.0.28.1` | `node_ws_media_relays` | textarea | `sess.node_ws_media_relays` | Node WS Repeaters: |  | `empty` | Node Websocket Repeater List |
| #1435 | `r.0.1.1.0.1.3.1.5.0.4.0.31.1` | `altCodeVendorJS` | textarea | `sess.altCodeVendorJS` | VendorJS name: |  | `empty` | Alt VendorJS |
| #1439 | `r.0.1.1.0.1.3.1.5.0.4.0.32.1` | `altCodeAppJS` | textarea | `sess.altCodeAppJS` | AppJS name: |  | `empty` | Alt AppJS |
| #1443 | `r.0.1.1.0.1.3.1.5.0.4.0.33.1` | `customJanus` | textarea | `sess.customJanus` | customJanus: |  | `empty` | Alt JanusJS |
| #1447 | `r.0.1.1.0.1.3.1.5.0.4.0.34.1` | `alt_roomjs` | textarea | `sess.alt_roomjs` | Alr RoomJS: |  | `empty` | Alt Room.js |
| #1451 | `r.0.1.1.0.1.3.1.5.0.4.0.35.1` | `modAlertFilterList` | textarea | `sess.modAlertFilterList` |  | Nick   Filter: | `empty` | Alert filter list for mods: |
| #1455 | `r.0.1.1.0.1.3.1.5.0.4.0.36.1` | `customCSS` | textarea | `sess.customCSS` |  | customCSS: | `empty` | Custom CSS |
| #1459 | `r.0.1.1.0.1.3.1.5.0.4.0.37.1` | `darkThemeStyle` | textarea | `sess.darkThemeStyle` |  | Dark Theme Style: | `empty` | Dark Theme Style |
| #1463 | `r.0.1.1.0.1.3.1.5.0.4.0.38.1` | `hideLogo` | checkbox | `sess.hideLogo` | Hide Logo? |  | `No` | Hide Logo |
| #1465 | `r.0.1.1.0.1.3.1.5.0.4.0.39.1` | `hidePoweredBy` | checkbox | `sess.hidePoweredBy` | Hide Powered By? |  | `No` | Hide Powered By |
| #1467 | `r.0.1.1.0.1.3.1.5.0.4.0.42.1` | `linkedRoomAlerts` | textarea | `sess.linkedRoomAlerts` |  | Linked Rooms: | `empty` | Linked Rooms for alerts |
| #1471 | `r.0.1.1.0.1.3.1.5.0.4.0.43.1` | `linkedRoomSwingAlerts` | textarea | `sess.linkedRoomSwingAlerts` |  | Linked Rooms: | `empty` | Linked Rooms for Swing Alerts |
| #1475 | `r.0.1.1.0.1.3.1.5.0.4.0.44.1` | `linkedRoomSwingAlertsOther` | textarea | `sess.linkedRoomSwingAlertsOther` |  | Linked Rooms: | `empty` | SessionID to load swing alerts from |
| #1479 | `r.0.1.1.0.1.3.1.5.0.4.0.45.1` | `linkedRoomDayTradeAlerts` | textarea | `sess.linkedRoomDayTradeAlerts` |  | Linked Rooms: | `empty` | Linked Rooms for Day Trade Alerts |
| #1483 | `r.0.1.1.0.1.3.1.5.0.4.0.46.1` | `linkedRoomDayTradeAlertsOther` | textarea | `sess.linkedRoomDayTradeAlertsOther` |  | Linked Rooms: | `empty` | SessionID to load day trade alerts from |
| #1487 | `r.0.1.1.0.1.3.1.5.0.4.0.47.1` | `linkedRoomRecordings` | textarea | `sess.linkedRoomRecordings` |  | Linked Rooms: | `empty` | Linked Rooms for Recordings |
| #1491 | `r.0.1.1.0.1.3.1.5.0.4.0.48.1` | `linkedStreamsAPIKey` | textarea | `sess.linkedStreamsAPIKey` |  | Linked Room Key: | `empty` | Other Room API Secret: |
| #1493 | `r.0.1.1.0.1.3.1.5.0.4.0.50.1` | `ptrMobileAppEnabled` | checkbox | `sess.ptrMobileAppEnabled` | Enable PTR app? |  | `No` | Enable PTR app? |
| #1495 | `r.0.1.1.0.1.3.1.5.0.4.0.51.1` | `freeTrialsGetApp` | checkbox | `sess.freeTrialsGetApp` | App for Free trials? |  | `No` | App for Free trials? |
| #1497 | `r.0.1.1.0.1.3.1.5.0.4.0.52.1` | `customMobileAppEnabled` | checkbox | `sess.customMobileAppEnabled` | Enable Custom app? |  | `No` | Custom App? |
| #1499 | `r.0.1.1.0.1.3.1.5.0.4.0.53.1` | `customMobileAppV3Name` | textarea | `sess.customMobileAppV3Name` |  | Custom app string: | `empty` | Custom app String |
| #1501 | `r.0.1.1.0.1.3.1.5.0.4.0.54.1` | `customMobileAppIOSUrl` | textarea | `sess.customMobileAppIOSUrl` |  | Custom iOS App URL: | `empty` | Custom iOS App URL |
| #1503 | `r.0.1.1.0.1.3.1.5.0.4.0.55.1` | `customMobileAppAndroidUrl` | textarea | `sess.customMobileAppAndroidUrl` |  | Custom Android App URL: | `empty` | Custom Android App URL |
| #1505 | `r.0.1.1.0.1.3.1.5.0.4.0.56.1` | `customMobileAppLaunchWord` | textarea | `sess.customMobileAppLaunchWord` |  | Custom Launch Word: | `empty` | Custom App launch Word |
| #1507 | `r.0.1.1.0.1.3.1.5.0.4.0.57.1` | `hideMobileCredentials` | checkbox | `sess.hideMobileCredentials` | Hide Mobile Credentials? |  | `No` | Hide Mobile Credentials? |
| #1511 | `r.0.1.1.0.1.3.1.5.0.4.0.58.1` | `ptrMobileAppCaseByCaseEnabled` | checkbox | `sess.ptrMobileAppCaseByCaseEnabled` | Enable PTR app only for some? |  | `No` | App for Some Members? |
| #1513 | `r.0.1.1.0.1.3.1.5.0.4.0.59.1` | `nqNewsFeedURL` | textarea | `sess.nqNewsFeedURL` |  | NQ News URL: | `empty` | NQ News URL |
| #1515 | `r.0.1.1.0.1.3.1.5.0.4.0.60.1` | `generateRandomUDPPort` | checkbox | `sess.generateRandomUDPPort` | Random UDP port fix ? |  | `No` | Random UDP port fix? |
| #1517 | `r.0.1.1.0.1.3.1.5.0.4.0.61.1` | `streamingThreads` | checkbox | `sess.streamingThreads` | Streaming Threads ? |  | `No` | Streaming Threads? |
| #1644 | `r.0.1.1.0.1.3.1.4.0.0.0.0.0.1` | `` | date | `statsDate` |  |  | `07-22-2026` | Start Date: |
| #1648 | `r.0.1.1.0.1.3.1.4.0.0.0.0.1.1` | `` | date | `statsDateEnd` |  |  | `07-23-2026` | End Date: |

### Non-`saveSessField` `sess.*` bindings (2 more)

| record | path | binding | note |
|---|---|---|---|
| `#474` | `r.0.1.1.0.1.3.1.2.0.0.5.1` | `text-angular=""`, `ng-model="sess.description"`, `name="wysiswyg-editor"` | Branding tab — the *Login Landing Page Editor* WYSIWYG. Saved by `htmlDescChanged()` (`#1330`), **not** by `saveSessField`. |
| `#1355` | `r.0.1.1.0.1.3.1.5.0.0.163.0.0` | `<i class="fa fa-gear ms-2 cursor-pointer" title="Configure Chat Tabs" ng-click="openChatTabsWithBadgesEditor(sess.chatTabsWithBadges)">` | opens a custom editor for the same field that `#1060` edits as a textarea |

### `sess.*` fields referenced in conditions but never edited on this page

| field | referenced at |
|---|---|
| `sess._id` | `#50` `cloneRoom(sess._id)`, `#51` `deleteRoom(sess._id)`, `#52` `manageMarketplaceSession(sess._id, sess)` |
| `sess.roomType` | `#54` `ng-show="sess.roomType=='webinar'"` |
| `sess.canClone`, `sess.isClonedRoom` | `#50` `ng-show="sess.canClone || sess.isClonedRoom || canCloneClicks"`, `#51` `ng-show="sess.isClonedRoom"` |
| `sess.logoURL` | `#43` `ng-hide="hideLogo || !sess.logoURL"` |

---

## §2 — `user.*` — the roster/xref model

Every `user.*` reference in the dump, with a first-occurrence citation. The row template is `r.0.1.1.0.1.3.1.0.0.3.1.{0,1,2}` (three rows, `ng-repeat="user in xrefs  "`).

| field | type implied | where referenced (first occurrence) |
|---|---|---|
| `user._id` | id (string) | `#1539` `ng-checked="checkedUserIds[user._id]"`, `ng-click="getCheckedUserIds(user._id)"`; passed to 15 controller methods |
| `user.userName` | string | passed to `updateUser`, `deleteParticipant`, `approveUser`, `editUsername`, `setNoteUser`, `setUserPW`, `sendWelcomeEmail`, `getAppPin`, `getFCMTokens`, `pauseUserNotifs`, `sendTestFCM`, `resetFCMForuser`, `setUserRestrictPM`, `showAlerterAppTokens` |
| `user.email` | string | `#1550` `gravatar-src-once="user.email "` (note trailing space); `#2005` `getAppPin(user.email,…)` |
| `user.role` | **int enum** — see §2b | `#1539` `ng-show="user.role!==0"`; `#1563-#1569` role labels; `#1570` `ng-hide="user.role==0"`; `#1869` `ng-show="user.role !== 1"` |
| `user.nonPresenter` | bool | `#1565` `ng-show="user.role==1 && !user.nonPresenter"` → "Presenter"; `#1566` `ng-show="user.role==1 && user.nonPresenter"` → "Admin" |
| `user.inviteStatus` | string enum (`'pending'`, `'approved'`) | `#1562` `ng-show="user.inviteStatus=='pending' "`; `approveUser(…,'approved'\|'pending')` |
| `user.hasMic` | bool | `#1544` `<i class="fa fa-microphone ng-hide" ng-show="user.hasMic">` |
| `user.hasCam` | bool | `#1545` `<i class="fa fa-video-camera ng-hide" ng-show="user.hasCam">` |
| `user.hasScreen` | bool | `#1546` `<i class="fa fa-desktop ng-hide" ng-show="user.hasScreen">` |
| `user.hasAdminChat` | bool | `#1547` `<i class="fa fa-comment-o ng-hide" ng-show="user.hasAdminChat">` |
| `user.canEditNotes` | bool | `#1548` `<i class="fa fa-pencil-square-o ng-hide" ng-show="user.canEditNotes">` |
| `user.denyArchivesAccess` | bool | `#1549` `<i class="fa fa-hdd-o ng-hide" ng-show="user.denyArchivesAccess" title="Denied Archives Access" style="color: red;">`; also gates menu items `#1873`/`#1874` |
| `user.discordUserId` | string | `#1551` `<div ng-show="user.discordUserId" …>Discord Username:</div>` |
| `user.isFreeTrial` | bool | `#1552` `<span ng-show="user.isFreeTrial" class="badge badge-danger-chat">TRIAL</span>` |
| `user.mobilePairCode` | string | `#1554` `ng-show="showPins && user.mobilePairCode"` |
| `user.phone` | string | `#1555` `ng-show="user.phone"` (renders `<i class="fa fa-phone">`) |
| `user.pw` | string/bool | `#1556` `ng-show="user.pw"` → text `"PW set"` + `<i class="fa fa-lock">` |
| `user.hideUserCount` | bool | `#1557` `<span class="badge badge-danger" ng-show="user.hideUserCount">User Count Hidden</span>` |
| `user.hidePersInfo` | bool | `#1558` `<span class="badge badge-danger" ng-show="user.hidePersInfo">User Personal Info Hidden</span>` |
| `user.inactive` | bool | `#1559` `<span ng-show="user.inactive" style="color: red;">*** INACTIVE USER ***</span>` |
| `user.restrictPMUser` | bool | `#1560` `<span ng-show="user.restrictPMUser" style="color: red;">User PMs disabled</span>` |
| `user.note` | string | `#1561` `<div ng-show="user.note" style="border: 1px solid #A0A0A0; padding: 5px; " class="ng-binding">` |
| `user.alerterAppTokens` | array | `#2006` `showAlerterAppTokens(user.userName,user.alerterAppTokens)` |

### §2b — `user.role` enum (verified from the six mutually-exclusive `ng-show` labels)

| value | rendered label | evidence |
|---|---|---|
| `0` | **Owner** | `#1564` `ng-show="user.role==0 "` → `T="Owner"`; row 0 renders this (rect `1213.4 559.5 41.2 16.5`) |
| `1` + `!nonPresenter` | **Presenter** | `#1565` |
| `1` + `nonPresenter` | **Admin** | `#1566`; row 2 renders this (`#1630`, rect `1213.4 662.9 40.2 16.5`) |
| `2` | **Participant** | `#1563`; row 1 renders this (`#1595`, rect `1213.4 600.5 67.4 16.5`) |
| `3` | **CHAT MUTED** (red) | `#1568` `style="color: red;"` |
| `4` | **BANNED** (red) | `#1569` `style="color: red;"` |

A suffix span `#1567` `ng-hide="user.role==0"` renders `"/"` + a source token — real captured values: row 1 → `"/ login"` (`#1599`), row 2 → `"/ manual"` (`#1631`). Row 0 (Owner) hides it. So `user` also carries an **origin/source** string that renders after the role; its field name is **not recoverable** from this dump (it is inside an interpolated `ng-binding` whose expression is not an attribute). *Honest gap.*

### §2c — actual roster data captured (3 rows, `xrefs.length === 3`)

| row | `#` cells | rendered content |
|---|---|---|
| 0 | `#1315`–`#1319` | `"0"` / *(empty name cell)* / *(empty last-login)* / **Owner** / Actions dropdown (`ng-hide="user.role==0"` → hidden, `class="… ng-hide"`) |
| 1 | `#1320`–`#1324` | `"1"` / `"[OWNER_NAME] … [MEMBER_A_EMAIL]"` / `"[MEMBER_A_LAST_LOGIN]"` / **Participant / login** / Actions (visible, rect `1527.2 599 88.7 34`) |
| 2 | `#1325`–`#1329` | `"2"` / `"[OWNER_SHORT_NAME] … [OWNER_EMAIL]"` / *(empty)* / **Admin / manual** + `PW set` / Actions (visible, rect `1527.2 661.4 88.7 34`) |

Gravatar srcs actually resolved: row 1 `https://secure.gravatar.com/avatar/[GRAVATAR_MD5_A]?size=80&default=mm` (`#1582`), row 2 `…/[GRAVATAR_MD5_B]?size=80&default=mm` (`#1614`). **Row 0 (`#1550`) has `gravatar-src-once="user.email "` and `class="thumb24 "` but NO `src` attribute** — the directive never fired because the Owner row has no email. See P31.

---

## §3 — `userPermissions.*` — the permissions modal model

Modal `#permissionsModal` (`#27` in baseline; full subtree in `caps/01-modal_permissionsModal`). Five checkboxes, each `ng-model` + `ng-change`:

| record (baseline / cap01) | `ng-model` | `ng-change` | adjacent `<label class="d-block">` |
|---|---|---|---|
| `#149` / cap01 `#17` | `userPermissions.hasMic` | `toggleHasMic()` | `Microphone` (`#105`) |
| `#150` / cap01 `#18` | `userPermissions.hasScreen` | `toggleHasScreen()` | `Screenshare` (`#106`) |
| `#151` / cap01 `#19` | `userPermissions.hasCam` | `toggleHasCam()` | `WebCam` (`#107`) |
| `#152` / cap01 `#20` | `userPermissions.hasAdminChat` | `toggleHasAdminChat()` | `AdminChat` (`#108`) |
| `#153` / cap01 `#21` | `userPermissions.canEditNotes` | `toggleCanEditNotes()` | `CanEditNotes` (`#109`) |

All five carry `type="checkbox" name="checkbox" class="ng-pristine ng-untouched ng-valid"`. Modal is populated by `setPermissions(user)` (`#1996`, `data-toggle="modal" data-target="#permissionsModal"`) and committed by `saveUserPermissions()` (`#111`, `<button class="btn btn-success">Save Changes</button>`). Title `#104` `"Adjust Mic/Cam/Screen permissions for user:"` + `#148` `<i class="ng-binding">` (the interpolated username; empty at capture time).

---

## §4 — Every scope variable

### §4a — two-way bound (`ng-model`, 15 distinct values)

| variable | element | tab | evidence |
|---|---|---|---|
| `uSearch ` *(trailing space)* | `<input type="search" name="title">` | Users | `#459` `ng-model="uSearch "`, `ng-enter="loadUsers(uSearch)"` |
| `applyToAllRooms` | `<input type="checkbox">` | Users | `#1297` + `ng-change="toggleApplyToAllRooms()"`; label `#462 class="checkbox-apply-to-all-rooms"` / span `#1298` `"Apply to all rooms?"` |
| `uSearchStat ` *(trailing space)* | `<input type="search " name="title " required=" ">` | User Stats | `#482`, class `ng-invalid ng-invalid-required` |
| `filterOnline` | `<input type="checkbox">` | User Stats | `#1343`; label `#484` `"Show Online Users Only"` |
| `filterFT` | `<input type="checkbox">` | User Stats | `#1344`; label `#485` `"Show  Only?"` (double space — interpolation dropped) + badge `#1345` `"Free Trials"` |
| `showMobileStat` | `<input type="checkbox">` | User Stats | `#1346`; label `#486` `"Show Mobile Only?"` |
| `remDupes` | `<input type="checkbox">` | User Stats | `#1347`; label `#487` `"Remove duplicates?"` |
| `webinarTimeTxt` | `<input type="text" placeholder="at 7pm EST">` | Room header (webinar) | `#161` |
| `html` | `<textarea id="taHtmlElement…">` **and** `<div contenteditable="true">` | Branding | `#1333`, `#1642` — textAngular's internal model |
| `sess.description` | `<div text-angular>` | Branding | `#474` |
| `userPermissions.hasMic/hasScreen/hasCam/hasAdminChat/canEditNotes` | modal checkboxes | modal | §3 |

### §4b — one-way / flag variables (from `ng-show`, `ng-hide`, `ng-if`, `ng-checked`, `ng-init`, `ng-click`)

| variable | kind | evidence |
|---|---|---|
| `dataLoading` | bool | `#40` `ng-show="dataLoading"` on the global spinner `<div class="div animated  fadeIn infinite ng-hide">` |
| `xrefs` | array | `#467-#469` `ng-repeat="user in xrefs  "` |
| `completeUserList` | array | `#202` `ng-if="completeUserList && completeUserList.length>0"` |
| `checkedAllUsers` | bool | `#1295` `ng-checked="checkedAllUsers"`; `#1296` `ng-if="!checkedAllUsers"` → span `"Select All"` |
| `checkedUserIds` | map `{id: bool}` | `#1539` `ng-checked="checkedUserIds[user._id]"` |
| `showPins` | bool | `#174` `ng-init="showPins=true;"` on `<table class="table table-striped ">`; consumed by `#1554` `ng-show="showPins && user.mobilePairCode"` |
| `submenuOpen` | object `{permissions,granular,app,badges}` | `#1570` `ng-init="submenuOpen={permissions:false, granular:false, app:false, badges:false}"`; `on-toggle="!open && (submenuOpen={permissions:false, granular:false, app:false, badges:false})"` |
| `statXrefs` | array | `#142` `ng-hide="statXrefs.length>0 \|\| statXrefsMontly.length>0"`; `#145` `ng-show="!loadingUsersStats && statXrefs.length>0"`; `#180` `ng-show="statXrefs.length>0 \|\| true"` |
| `statXrefsMontly` *(sic)* | array | `#144`, `#479` `ng-show="statXrefsMontly.length===0"`, `#480`/`#481` `ng-show="statXrefsMontly.length>0"` |
| `loadingUsersStats` | bool | `#143` `ng-show="loadingUsersStats"` |
| `statsDate` | date | `#1644` `editable-date="statsDate"` → rendered `"07-22-2026"` |
| `statsDateEnd` | date | `#1648` `editable-date="statsDateEnd"` → rendered `"07-23-2026"` |
| `donttouchShow` | bool | `#189` `ng-hide="donttouchShow"`; `#190` `ng-show="donttouchShow"`; toggled by `#450` `<span ng-click="donttouchShow=!donttouchShow">TOUCH</span>` |
| `showAdServer` | bool | `#1247` `ng-show="showAdServer"`; `#1405` `ng-show="showAdServer"`; set by `#1403` `<label class="muted" ng-click="showAdServer=true;">` |
| `showHtml` | bool | `#1332` `ng-hide="showHtml"` (rich view); `#1333` `ng-show="showHtml"` (html textarea) |
| `wordcount`, `charcount` | number | `#1808` `ng-bind="wordcount"` → `"0"`; `#1809` `ng-bind="charcount"` → `"0"` |
| `canCloneClicks` | counter | `#50` `ng-show="sess.canClone \|\| sess.isClonedRoom \|\| canCloneClicks"`; incremented by `#46` `ng-dblclick="canCloneDblClick()"` |
| `disableMarketplace` | bool | `#52` `ng-hide="disableMarketplace"` |
| `hideLogo` | bool (scope, distinct from `sess.hideLogo`) | `#43` `ng-hide="hideLogo \|\| !sess.logoURL"` |
| `login.isLoggedIn` | bool | `#29` `ng-show="login.isLoggedIn"` on the top-right nav `<ul>` |
| `headerMenuCollapsed` | bool | `#25` `collapse="headerMenuCollapsed"` |
| `sessAuthTypes` | array of `{value,text}` | `#158` `e-ng-options="s.value as s.text for s in sessAuthTypes "` |
| `tabs`, `tab.active` | uib-tabset | `#97-#102` `ng-repeat="tab in tabs"` + `ng-class="{active: tab.active}"` |
| `vertical`, `justified`, `active`, `disabled`, `open` | uib-tabset / uib-dropdown isolate scope | `#60` `ng-class="{'nav-stacked': vertical, 'nav-justified': justified}"`; `#91` `ng-class="{active: active, disabled: disabled}"`; `#1678` `ng-disabled="disabled"`; `#1570` `on-toggle="!open && …"` |
| `app.layout.isFixed/isBoxed/isDocked/isMaterial`, `app.sidebar.isOffscreen`, `app.footer.hidden`, `$state.includes` | global app shell | `#0` `<body ng-class="{…}">` — **value truncated at 300 chars** mid-expression: `…'in-app': !$state.includes` |
| `wysiswyg-editor` *(sic)* | form control name | `#474` `name="wysiswyg-editor"`; hidden mirror `#1334` `<input type="hidden" name="wysiswyg-editor" value="">` |

> ### ⚠ Prior-report claim NOT confirmed: `sessSearch`
> An earlier pass listed `sessSearch` as a scope variable. This pass enumerated **every** `ng-model` value in all 23 captures — the complete set is: `applyToAllRooms`, `filterFT`, `filterOnline`, `html` (×2), `remDupes`, `sess.description`, `showMobileStat`, `uSearch `, `uSearchStat `, `userPermissions.canEditNotes`, `userPermissions.hasAdminChat`, `userPermissions.hasCam`, `userPermissions.hasMic`, `userPermissions.hasScreen`, `webinarTimeTxt`. **`sessSearch` does not appear anywhere in the dump** (`grep -r 'sessSearch' caps/` → 0 hits). It is **not** part of this page's model. The two search boxes are `uSearch` (Users tab) and `uSearchStat` (User Stats tab).

---

## §5 — Every controller method called from the DOM, with its signature **as written**

`ng-click` — 403 occurrences, **89 distinct expressions**. Sorted; count = occurrences across all 23 captures; the citation is the first occurrence in document order.

| # | expression as written in the DOM | label / UI affordance | first occurrence |
|---|---|---|---|
| 1 | `actionsWithEmailList()` | button `Actions With the Email List` | `#464 r.0.1.1.0.1.3.1.0.0.2.1.1 <button>` |
| 2 | `addLiveServer()` | button `Add Server` | `#1409 r.0.1.1.0.1.3.1.5.0.4.0.19.3` |
| 3 | `applyRepeaterToAccount()` | button `Apply  server / repeaters to entire account?` *(double space)* | `#1405 r.0.1.1.0.1.3.1.5.0.4.0.18.5` |
| 4 | `applyToAllSessions()` | button `Apply clusterID/backupID to all sessions` | `#1369 r.0.1.1.0.1.3.1.5.0.4.0.4.0` |
| 5 | `approveUser(user.userName,user._id,$index,'approved')` ×3 | button `APPROVE` (gated `user.inviteStatus=='pending' `) | `#1562 r.0.1.1.0.1.3.1.0.0.3.1.0.3.0` |
| 6 | `approveUser(user.userName,user._id,$index,'pending')` ×6 | menu `Pause / Pending` | `#1825 …3.1.0.4.0.1.12.0` |
| 7 | `canCloneDblClick()` *(`ng-dblclick`)* | room-title span | `#46 r.0.1.1.0.0.0.0` |
| 8 | `clearUserList()` ×2 | menu `Remove non-presenters` | `#1657 …0.0.0.0.3.1.7.0` |
| 9 | `cloneRoom(sess._id)` | button `Clone Room` | `#50 r.0.1.1.0.0.0.4` |
| 10 | `deleteParticipant(user.userName,user._id,$index)` ×6 | menu `Remove User` | `#1822 …3.1.0.4.0.1.7.0` |
| 11 | `deleteRoom(sess._id)` | button `Delete Room` | `#51 r.0.1.1.0.0.0.5` |
| 12 | `doInvite()` | button `Add User / Invite` | `#454 r.0.1.1.0.1.3.1.0.0.0.0.0` |
| 13 | `doLogout()` | top-right power icon | `#45 r.0.0.0.1.0.1.0` |
| 14 | `donttouchShow=!donttouchShow` | span `TOUCH` | `#450 r.0.1.1.0.1.3.1.5.0.2.0` |
| 15 | `downloadMontlyStats(statXrefsMontly)` *(sic "Montly")* | button `Download monthly report` | `#481 …3.1.4.0.0.0.5` |
| 16 | `editUsername(user._id, user.userName)` ×6 *(note the space after the comma)* | menu `Edit Username` | `#1821 …3.1.0.4.0.1.6.0` |
| 17 | `executeAction()` ×30 | every textAngular toolbar button | `#1696 …2.0.0.5.1.0.0.0` |
| 18 | `exportListToCSV()` | button `Export` (Users) | `#455` |
| 19 | `exportSettingsToJSON()` | button `Export Settings` | `#493 …5.0.0.0.0` |
| 20 | `exportStatsToCSV(statsDate)` | button `Export` (Stats) | `#478` |
| 21 | `generateNewApiSecret()` | button `New Secret` | `#985 …5.0.0.138.2` |
| 22 | `getAppPin(user.email,user.userName,$index)` ×9 | menu `Get App PIN` | `#2005 …4.0.1.2.1.0.0` |
| 23 | `getCheckedAllUserIds()` ×2 | `<label>` **and** its `<input type="checkbox">` | `#461 …0.0.2.0.0` (label), `#1295` (input) |
| 24 | `getCheckedUserIds(user._id)` ×3 | per-row checkbox | `#1539 …3.1.0.1.0` |
| 25 | `getFCMTokens(user._id,user.userName,$index)` ×9 | menu `Get FCM Tokens` | `#2007` |
| 26 | `htmlDescChanged() ` *(trailing space)* | button `Save Editor Changes` | `#1330 …2.0.0.5.0.0` |
| 27 | `loadBannedUsers()` ×2 | menu `Show BANNED` | `#1652` |
| 28 | `loadMarketplaceUsers()` ×2 | menu `Marketplace Users` | `#1656` |
| 29 | `loadMobileUsers()` ×2 | menu `Show Mobile` | `#1653` |
| 30 | `loadMontlyStats(statsDate,statsDateEnd,false)` | button `Monthly report for date range` | `#479` |
| 31 | `loadMontlyStats(statsDate,statsDateEnd,true)` | button `Clear monthly report` | `#480` |
| 32 | `loadNonMobileUsers()` ×2 | menu `Show Non-Mobile` | `#1654` |
| 33 | `loadPresentersUsers()` ×2 | menu `Show Presenters` | `#1655` |
| 34 | `loadSettingsFromRoom()` | button `Load Settings From Room` | `#494` |
| 35 | `loadStats(statsDate,statsDateEnd,uSearchStat,filterFT,remDupes,showMobileStat)` | button `Load Stats` — **6-arg signature** | `#477 …3.1.4.0.0.0.1` |
| 36 | `loadUsers()` | button `Load / Reload Users` | `#456` |
| 37 | `loadUsers(uSearch)` | button `Search / Load Users` **and** `ng-enter` on the search input | `#460`, `#459` |
| 38 | `loadUsersFT()` ×2 | menu `Show Free Trials` | `#1651` |
| 39 | `manageMarketplaceSession(sess._id, sess)` | button `Marketplace` | `#52` |
| 40 | `openChatTabsWithBadgesEditor(sess.chatTabsWithBadges)` | gear icon next to `Chat Tabs With Badges:` | `#1355 …5.0.0.163.0.0 <i>` |
| 41 | `openFileChooser( 'logos') ` *(spaces inside the parens)* | button `Upload/Change` | `#471 …2.0.0.2.0` |
| 42 | `pauseUserNotifs(user._id,user.userName,$index,'pause')` ×9 | menu `PAUSE Mobile Notifs` | `#2008` |
| 43 | `pauseUserNotifs(user._id,user.userName,$index,'resume')` ×9 | menu `RESUME Mobile Notifs` | `#2009` |
| 44 | `pauseUserNotifs(user._id,user.userName,$index,'unsub')` ×9 | menu `Remove Mobile Notifs` | `#2010` |
| 45 | `removeBadgesForUsers()` ×2 | menu `Remove All User Badges` | `#1659` |
| 46 | `removeLiveServer()` | button `Remove Server` | `#1412` |
| 47 | `removeUsersFT()` ×2 | menu `Remove Free Trials` | `#1658` |
| 48 | `resetFCMForuser(user._id,user.userName,$index)` ×9 *(lower-case `u` in `Foruser`)* | menu `Reset Mobile Notifs` | `#2012` |
| 49 | `resetLogo() ` *(trailing space)* | button `Reset` | `#472` |
| 50 | `resetMaxCount()` | button `Reset Counts` | `#48 r.0.1.1.0.0.0.2` |
| 51 | `reverseStatSort()` | link `Reverse` in the stats `<th>Time Stamps</th>` | `#1348 …3.1.4.4.0.0.3.0` |
| 52 | `saveTextList()` | button `Save List` (Text List tab) | `#175` |
| 53 | `saveUserPermissions()` ×2 | modal button `Save Changes` | `#111` |
| 54 | `select()` ×6 | every tab heading `<a>` | `#131 r.0.1.1.0.1.3.0.0.0` |
| 55 | `sendTestFCM(user._id,user.userName,$index)` ×9 | menu `Send Test Mobile Notifs` | `#2011` |
| 56 | `sendWelcomeEmail(user._id,user.userName,$index)` ×6 | menu `Resend Welcome Email` | `#1824` |
| 57 | `sendWeminarEmailReminder(webinarTimeTxt)` *(sic "Weminar")* | button `Send Emails Now` | `#163 r.0.1.1.0.1.0.3.4.1.1` |
| 58 | `setCustomRoomURL()` | button `Edit` (Vanity Link) | `#165` |
| 59 | `setNoteUser(user._id,user.userName,$index)` ×6 | menu `Set Note` | `#1820` |
| 60 | `setPermissions(user)` ×9 — also `data-toggle="modal" data-target="#permissionsModal"` | menu `Adjust Mic/Cam/Screen/Chat/Notes` | `#1996 …4.0.1.1.1.0.0` |
| 61 | `setUniqueRoomURL()` | button `Generate` (Unique Link) | `#167` |
| 62 | `setUserPW(user._id,user.userName,$index)` ×6 | menu `Set/Change Password` | `#1823` |
| 63 | `setUserRestrictPM(false,user._id,user.userName)` ×9 — **no `$index`** | menu `Allow User2User PM` | `#2004` |
| 64 | `setUserRestrictPM(true,user._id,user.userName)` ×9 — **no `$index`** | menu `Disallow User2User PM` | `#2003` |
| 65 | `showAdServer=true;` | `<label class="muted">` under Repeater List | `#1403 …5.0.4.0.18.3` |
| 66 | `showAlerterAppTokens(user.userName,user.alerterAppTokens)` ×9 | menu `Show App Tokens` | `#2006` |
| 67 | `submenuOpen.app=!submenuOpen.app; submenuOpen.permissions=false; submenuOpen.granular=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();` ×6 | submenu `App and Notifications` | `#1816` |
| 68 | `submenuOpen.badges=!submenuOpen.badges; submenuOpen.permissions=false; submenuOpen.granular=false; submenuOpen.app=false; $event.preventDefault(); $event.stopPropagation();` ×6 | submenu `Badges` | `#1818` |
| 69 | `submenuOpen.granular=!submenuOpen.granular; submenuOpen.permissions=false; submenuOpen.app=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();` ×6 | submenu `Granular Perms` | `#1814` |
| 70 | `submenuOpen.permissions=!submenuOpen.permissions; submenuOpen.granular=false; submenuOpen.app=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();` ×6 | submenu `Permissions` | `#1812` |
| 71 | `swapCLusterIDs()` *(sic — capital `L`)* | button `Swap ClusterIDs (Backup <--> Main)` | `#1368` |
| 72–80 | `updateManyUsers(N)` — see §6b | bulk-action menu | `#1529`–`#1536` |
| 81–82 | `updateManyUsersBadgePrompt('add')` / `('remove')` ×2 each | menu `Add Badge` / `Remove Badge` | `#1537`, `#1538` |
| 83–95 | `updateUser(N,user._id,user.userName,$index)` — see §6a | per-user Actions menu | `#1988`+ |

Non-`ng-click` handlers:

| attribute | value | element |
|---|---|---|
| `onclick` ×5 (**native, not Angular**) | `copyLinkToClipboard('webinarLinkTxt')` / `('customLinkTxt')` / `('uniqueLinkTxt')` / `('webinarRegLinkTxt')` / `('appPairLink')` | the five `Copy` buttons `#164`, `#166`, `#168`, `#191`, `#199` |
| `ng-change` ×11 | `toggleApplyToAllRooms()`, `toggleHasMic()`, `toggleHasScreen()`, `toggleHasCam()`, `toggleHasAdminChat()`, `toggleCanEditNotes()` | `#1297`, `#149`–`#153` |
| `onaftersave` ×267 | `saveSessField('…')` | §1 |
| `ng-dblclick` ×1 | `canCloneDblClick()` | `#46` |
| `ng-enter` ×1 *(custom directive)* | `loadUsers(uSearch)` | `#459` |
| `ng-disabled` ×33 | `isDisabled()` (30, textAngular) / `disabled` (3, uib-dropdown) | `#1696`, `#1678` |

---

## §6 — The opcode maps (independently verified)

### §6a — `updateUser(op, user._id, user.userName, $index)` — verified against the actual `ng-click` strings and their anchor text

Every one of the 42 `updateUser` bindings in the baseline (14 per row × 3 rows) was extracted with `awk -v RS='' '/ng-click = "updateUser\(/'` and read with its sibling `text:` line. Confirmed identical in captures 04/05/06, 09/10/11, 14/15/16.

| op | rendered label | icon | first-occurrence record |
|---|---|---|---|
| **1** | `Make Presenter` | `fa fa-microphone` + `fa fa-desktop` | `#1988 r.0.1.1.0.1.3.1.0.0.3.1.0.4.0.1.0.1.0.0` |
| **2** | `Make Participant` | `fa fa-user` | `#1990 …1.0.1.2.0` |
| **2** | `Unban` ⟵ **same opcode, second binding** | `fa fa-user` | `#1994 …1.0.1.7.0` |
| **3** | `MUTE Participant` | `fa fa-user-times` | `#1992 …1.0.1.4.0` |
| **4** | `BAN` | `fa fa-user-times` | `#1993 …1.0.1.5.0` |
| **5** | `Make Admin` | `fa fa-cog` + `fa fa-user-md` | `#1989 …1.0.1.1.0` |
| **6** | `Make Trial` | `fa fa-user` | `#1991 …1.0.1.3.0` |
| **7** | `Hide User Count` | `fa fa-user-circle` ⚠ *(undefined class — see P30)* | `#1998 …1.1.1.3.0` |
| **8** | `Show User Count` | `fa fa-user-circle` ⚠ | `#1997 …1.1.1.2.0` |
| **9** | `Freshen Login Date` | `fa fa-clock-o` | `#1995 …1.0.1.8.0` |
| **10** | `Hide Pers User Data` | `fa fa-lock` | `#2001 …1.1.1.6.0` |
| **11** | `Don't Hide Pers User Data` | `fa fa-user` | `#2002 …1.1.1.7.0` |
| **12** | — **NOT BOUND ANYWHERE** | — | `grep 'updateUser(12' caps/` → **0 hits across all 23 captures** |
| **13** | `Deny Archives Access` | `fa fa-hdd-o` | `#1999 …1.1.1.4.0` |
| **14** | `Allow Archives Access` | `fa fa-hdd-o` | `#2000 …1.1.1.5.0` |

**Occurrence counts across all 23 captures** (baseline 3 rows + subtree captures 04/05/06, 09/10/11, 14/15/16): `1`→9, `2`→**18**, `3`→9, `4`→9, `5`→9, `6`→9, `7`→9, `8`→9, `9`→9, `10`→9, `11`→9, `13`→9, `14`→9. The `2`→18 (double) is the "Make Participant"/"Unban" collision.

**Verdict on the prior map:** *confirmed exactly* — 1 Presenter · 2 Participant **and** Unban · 3 Mute · 4 Ban · 5 Admin · 6 Trial · 7 hide user count · 8 show user count · 9 freshen login · 10 hide personal data · 11 show personal data · 12 unused · 13 deny archives · 14 allow archives. One nuance to record: the earlier shorthand "7/8 hide/show" is right in *that order* — 7 = **Hide**, 8 = **Show**, and the DOM lists Show (8) *above* Hide (7).

### §6b — `updateManyUsers(op)` — the bulk-action menu (10 items, `r.0.1.1.0.1.3.1.0.0.2.1.2.*`, subtree = capture `03`)

| DOM order | op | rendered label | icon | record |
|---|---|---|---|---|
| 0 | `10` | `Remove All` | `icon fa fa-trash` | `#1529` / cap03 `#11` |
| 1 | `2` | `UNBAN Participant` | `icon fa fa-user` | `#1530` / cap03 `#12` |
| 2 | `1` | `Make Presenter` | `fa fa-microphone` + `fa fa-desktop` | `#1531` / cap03 `#13` |
| 3 | `5` | `Make Admin (Non-Presenter)` | `fa fa-cog` + `fa fa-user-md` | `#1532` / cap03 `#14` |
| 4 | `2` ⟵ **collision** | `Make Participant` | `icon fa fa-user` | `#1533` / cap03 `#15` |
| 5 | `6` | `Make TRIAL user` | `icon fa fa-user` | `#1534` / cap03 `#16` |
| 6 | `3` | `MUTE Participant` | `fa fa-user-times` | `#1535` / cap03 `#17` |
| 7 | `4` | `BAN Participant` | `fa fa-user-times` | `#1536` / cap03 `#18` |
| 8 | `'add'` | `Add Badge` → `updateManyUsersBadgePrompt('add')` | `icon fa fa-user` | `#1537` / cap03 `#19` |
| 9 | `'remove'` | `Remove Badge` → `updateManyUsersBadgePrompt('remove')` | `icon fa fa-user` | `#1538` / cap03 `#20` |

**`updateManyUsers` opcode space is a subset of `updateUser`'s** — `{1,2,3,4,5,6,10}` — but note `10` means **`Remove All`** here while in `updateUser` it means **`Hide Pers User Data`**. **The two opcode spaces are NOT the same enum.** A rebuild must implement them as two separate maps.

---

## §7 — Every `ng-repeat` and its collection

| expression as written | count | element | collection |
|---|---|---|---|
| `"tab in tabs"` | 6 | `<div class="tab-pane ng-scope …">` `#97`–`#102` | `tabs` — the uib-tabset panes |
| `"user in xrefs  "` *(two trailing spaces)* | 3 | `<tr class="ng-scope">` `#467`, `#468`, `#469` | `xrefs` — the roster; `xrefs.length === 3` at capture time |

There are **no other `ng-repeat`s in the dump**. The 6 tab headings (`<li>` `#91`–`#96`) are *not* repeated — they are `uib-tab` isolate-scope directives with a `heading` attribute:

| `<li>` | `heading` | `ng-show` gate | rendered? |
|---|---|---|---|
| `#91` | `Users` | — | **yes**, `class="… active"`, rect `16 309 70.3 42` |
| `#92` | `Text List` | `sess.twillioApiToken` | no (`ng-hide`) |
| `#93` | `Branding (Logo / Landing Page)` | — | yes, rect `86.3 309 232.6 42` |
| `#94` | `SSO Setup` | `sess.authMode=='sso'` | no (`ng-hide`) |
| `#95` | `User Stats` | — | yes, rect `318.9 309 99.6 42` |
| `#96` | `Settings` | — | yes, rect `418.5 309 85.3 42` |

---

## §8 — Every `ng-if` (2), `ng-hide` (6 distinct), `ng-show` (53 distinct), grouped by what they gate

### §8a — `ng-if` (creates/destroys DOM) — only 2 in the entire dump

| expression | element | evidence |
|---|---|---|
| `completeUserList && completeUserList.length>0` | `<div class="checkbox ng-scope">` wrapping the Select-All row | `#202 r.0.1.1.0.1.3.1.0.0.2.0` — **present**, so `completeUserList.length > 0` |
| `!checkedAllUsers` | `<span class="ng-scope">Select All</span>` | `#1296` — **present**, so `checkedAllUsers` is falsy. **There is no captured "Deselect All" sibling** — the `ng-if="checkedAllUsers"` branch was never in the DOM. *Honest gap.* |

### §8b — `ng-hide` (6 distinct expressions)

| expression | gates | record |
|---|---|---|
| `disableMarketplace` | `Marketplace` button | `#52` (hidden) |
| `donttouchShow` | `<p>Settings...</p>` teaser | `#189` (visible) |
| `hideLogo \|\| !sess.logoURL` | brand `<img class="brand-logo">` | `#43` (visible, `src="/public/images/ptr_logo.png"`) |
| `showHtml` | textAngular rich-text pane `.ta-scroll-window` | `#1332` (visible) |
| `statXrefs.length>0 \|\| statXrefsMontly.length>0` | `<h3>No results to show. Select a date above...</h3>` | `#142` (visible → both arrays empty) |
| `user.role==0` ×6 | the role-suffix span (`#1567`) **and** the whole per-row Actions dropdown (`#1570`, `#1602`, `#1634`) | row 0 hidden, rows 1–2 visible |

### §8c — `ng-show`, grouped by gate

**Gated on `sess.authMode` (auth-mode-conditional settings):**

| expression | count | records |
|---|---|---|
| `sess.authMode=='jwt'` | 3 | `#225`, `#226`, `#229` (JWT Secret / PW-on-SSO / Token Expiration wrappers) |
| `sess.authMode=='sso'` | 1 | `#94` (SSO Setup tab) |
| `sess.authMode=='registrationA' \|\| sess.authMode=='registrationM'` | 1 | `#56` (Registration Link + Event Time + Email Preview block) |
| `sess.authMode=='webinarRoom' \|\| sess.allowPWLoginWithSSO` | 3 | `#230`, `#231`, `#232` (Room PW / Temp PW / Temp PW 2) |
| `sess.authMode=='webinarRoom' \|\| sess.authMode=='unamePW' \|\| sess.allowPWLoginWithSSO` | 1 | `#233` (Free Trial Password) |
| `sess.authMode=='webinarRoom' \|\| sess.authMode=='open' \|\| sess.authMode=='unamePW' \|\| sess.allowPWLoginWithSSO` | 1 | `#57` (**the Room Link / Vanity Link / Unique Link block — VISIBLE**, because `authMode` renders as `Open - Anyone with the room link can join with their email & name`, `#158`) |

**Gated on other `sess.*`:**

| expression | count | record |
|---|---|---|
| `sess.roomType=='webinar'` | 1 | `#54` (Date row) — hidden |
| `sess.twillioApiToken` | 1 | `#92` (Text List tab) — hidden |
| `sess.hasAppPairLink` | 1 | `#90` (App Pair Link input-group) — hidden |
| `sess.hasAppPairLink && sess.pairSecretKey` | 1 | `#284` (sample pair-URL block) — hidden |
| `sess.hasProfanityFilter` | 2 | `#389`, `#390` (Ignore List / Extra Bad list) — hidden |
| `sess.canClone \|\| sess.isClonedRoom \|\| canCloneClicks` | 1 | `#50` (Clone Room) — hidden |
| `sess.isClonedRoom` | 1 | `#51` (Delete Room) — hidden |

**Gated on `user.*` (roster row internals — each ×3 rows, or ×9/×12 counting the subtree captures):**

`user.hasMic` (`#1544`), `user.hasCam` (`#1545`), `user.hasScreen` (`#1546`), `user.hasAdminChat` (`#1547`), `user.canEditNotes` (`#1548`), `user.denyArchivesAccess` (`#1549`, ×12), `!user.denyArchivesAccess` (`#1873`, ×9), `user.discordUserId` (`#1551`), `user.isFreeTrial` (`#1552`), `showPins && user.mobilePairCode` (`#1554`), `user.phone` (`#1555`), `user.pw` (`#1556` — **visible on row 2**, `#1620` rect `305 688.3 73.3 16.5`), `user.hideUserCount` (`#1557`), `user.hidePersInfo` (`#1558`), `user.inactive` (`#1559`), `user.restrictPMUser` (`#1560`), `user.note` (`#1561`), `user.inviteStatus=='pending' ` (`#1562`), `user.role==0 ` / `==1 && !nonPresenter` / `==1 && nonPresenter` / `==2 ` / `==3 ` / `==4 ` (`#1563`–`#1569`), `user.role!==0` (`#1539`, the row checkbox), `user.role !== 1` (`#1869`, ×9 — gates the `Adjust Mic/Cam/Screen/Chat/Notes` menu item; **hidden for row 2** per cap14 `#41`/cap16 `#1`).

**Gated on stats state:**

`loadingUsersStats` (`#143`), `!loadingUsersStats && statXrefsMontly.length>0` (`#144`), `!loadingUsersStats && statXrefs.length>0` (`#145`), `statXrefs.length>0 || true` (`#180` — **always true; dead condition**), `statXrefsMontly.length===0` (`#479`), `statXrefsMontly.length>0` (`#480`, `#481`).

**Gated on UI flags:**

`dataLoading` (`#40`), `donttouchShow` (`#190`), `showAdServer` (`#1247`, `#1405`), `showHtml` (`#1333`), `login.isLoggedIn` (`#29`), `webinarTimeTxt` (`#193`), `!webinarTimeTxt` (`#192` — `<strong>FILL TIME ABOVE</strong>`), **`false`** ×12 (`#1540`–`#1543` and their row-1/row-2 twins — four permanently-hidden `<i>` icons per row: `fa-folder-o fa-2x`, `fa-mobile fa-2x`, `fa-mobile`, `fa-mobile` with `style="color: red;"` — **dead markup, see P30**).

---

## §9 — `ng-class` (9 distinct) and `ng-init` / `on-toggle`

| expression | count | element |
|---|---|---|
| `{active: tab.active}` | 6 | tab panes `#97`–`#102` |
| `{active: active, disabled: disabled}` | 6 | tab headings `#91`–`#96` |
| `{'nav-stacked': vertical, 'nav-justified': justified}` | 1 | `<ul class="nav nav-tabs">` `#60` |
| `{open: submenuOpen.permissions}` | 6 | `<li class="dropdown-submenu">` `#1745` etc. |
| `{open: submenuOpen.granular}` | 6 | `#1746` etc. |
| `{open: submenuOpen.app}` | 6 | `#1747` etc. |
| `{open: submenuOpen.badges}` | 6 | `#1748` etc. |
| `displayActiveToolClass(active)` | 30 | textAngular toolbar buttons |
| the `<body>` shell map (truncated) | 1 | `#0` |

`ng-init`: `showPins=true;` (`#174`) and `submenuOpen={permissions:false, granular:false, app:false, badges:false}` (`#1570`, ×3).
`on-toggle` (uib-dropdown): `!open && (submenuOpen={permissions:false, granular:false, app:false, badges:false})` (`#1570`, ×3).

---

## §10 — The per-user Actions dropdown: full 13-item structure

`ng-hide="user.role==0" dropdown="dropdown"` on `<div class="btn-group mb-sm mr">` (`#1570` / `#1602` / `#1634`) → `<button dropdown-toggle="" ng-disabled="disabled" class="btn dropdown-toggle btn-primary">Actions</button>` + `<ul role="menu" class="dropdown-menu dropdown-menu-right">` with **13 `<li>`** (indices 0–12, complete, no gaps):

| li | class | content |
|---|---|---|
| 0 | `dropdown-submenu` + `ng-class="{open: submenuOpen.permissions}"` | `Permissions` (`fa fa-shield` + `fa fa-caret-right pull-right`) → sub-`<ul>` of **9 `<li>`** = `updateUser` 1,5,2,6,3,4 + divider + 2,9 |
| 1 | `dropdown-submenu` + `{open: submenuOpen.granular}` | `Granular Perms` (`fa fa-sliders`) → sub-`<ul>` of **12 `<li>`** = `setPermissions(user)` (gated `user.role !== 1`), divider, 8, 7, 13 (gated `!denyArchivesAccess`), 14 (gated `denyArchivesAccess`), 10, 11, divider, `setUserRestrictPM(true…)`, `setUserRestrictPM(false…)`, divider |
| 2 | `dropdown-submenu` + `{open: submenuOpen.app}` | `App and Notifications` (`fa fa-mobile`) → sub-`<ul>` of **9 `<li>`** = Get App PIN, Show App Tokens, Get FCM Tokens, divider, PAUSE/RESUME/Remove Mobile Notifs, Send Test, Reset |
| 3 | `dropdown-submenu` + `{open: submenuOpen.badges}` | `Badges` (`fa fa-certificate`) → sub-`<ul class="dropdown-menu">` with **ZERO captured `<li>`** ⚠ (`#1819`, `#1834`, `#1849`; also captures `08`, `13`, `18` = 1 node each). See P31. |
| 4 | `divider` | |
| 5 | | `Set Note` → `setNoteUser(user._id,user.userName,$index)` (`fa fa-pencil-square-o`) |
| 6 | | `Edit Username` → `editUsername(user._id, user.userName)` (`fa fa-edit`) |
| 7 | | `Remove User` → `deleteParticipant(user.userName,user._id,$index)` (`fa fa-trash`) |
| 8 | `divider` | |
| 9 | | `Set/Change Password` → `setUserPW(user._id,user.userName,$index)` (`fa fa-lock`) |
| 10 | | `Resend Welcome Email` → `sendWelcomeEmail(user._id,user.userName,$index)` (`fa fa-envelope`) |
| 11 | `divider` | |
| 12 | | `Pause / Pending` → `approveUser(user.userName,user._id,$index,'pending')` (`fa fa-pause`) |

Measured geometry (cap `09`, the only Actions menu captured with real rects — row 1): `<ul>` at `x=1416.7 y=635 w=199.2 h=314.7`; items `x=1417.7 w=197.2 h=24.6`; dividers `h=1` with 10px of surrounding space (`641, 665.6, 690.1, 714.7, [748.3 divider], 758.3, 782.9, 807.4, [841 divider], 851, 875.6, [909.1 divider], 919.1`). Cap `14` is the same menu for row 2, offset +62.4px (`y=697.4`).

---

## §11 — The "User List Actions" and "Actions With Selected" menus

| menu | trigger | `<ul>` | items | subtree capture |
|---|---|---|---|---|
| **User List Actions** | `#1293 <button class="btn btn-md dropdown-toggle btn-primary mt" data-toggle="dropdown">` rect `1230.7 415 148.1 34` | `#1294` | 10 `<li>` (index 6 = `role="separator" class="divider"`): Show Free Trials, Show BANNED, Show Mobile, Show Non-Mobile, Show Presenters, Marketplace Users, —, Remove non-presenters, Remove Free Trials, Remove All User Badges | `caps/02` (28 nodes; `<ul>` rect `1230.7 451 200.5 252.1`) |
| **Actions With Selected** | `#463 <button class="btn dropdown-toggle btn-primary" data-toggle="dropdown">` rect `37 455 179.7 34` | `#465` | 10 `<li>` — see §6b | `caps/03` (33 nodes; `<ul>` rect `37 480.6 238.7 257.7`) |
| **Actions With the Email List** | `#464 <button class="btn dropdown-toggle btn-primary" ng-click="actionsWithEmailList()">` rect `220.6 455 193 34` | — | **no menu** — this button has `class="… dropdown-toggle …"` but **no `data-toggle="dropdown"` and no sibling `<ul>`**; it calls a controller method directly | — |

---

## What a rebuild must do about this

1. **Implement `saveSessField(field: string)` as the single settings mutation.** 267 call sites, one endpoint. Body must be `{ [field]: sess[field] }` for the session id in the route.
2. **Implement two separate opcode enums** — `updateUser` (§6a, 13 live ops, `12` unused) and `updateManyUsers` (§6b, 7 ops, `10` = *Remove All*). Do not merge them.
3. **Reproduce the xeditable rendering convention exactly**: `Yes!` / `No` / `empty` (+ `editable-empty` class), dashed `border-bottom: 1px dashed rgb(66, 139, 202)`, `color: rgb(10, 10, 10)`, `cursor: pointer` (from the 269 nodes' style deviations).
4. **Roster row model**: 23 `user.*` fields (§2). `user.role` is the 5-value enum in §2b with the `nonPresenter` split at `role==1`.
5. **Gate visibility with the exact expressions in §8** — several are load-bearing for layout (e.g. `#57` shows the three link rows and contributes 170px of height; `#54`/`#56` are hidden and contribute 0).
6. **Dead code you may drop**: `updateUser(12)`, the 4×3 `ng-show="false"` icons, `ng-show="statXrefs.length>0 || true"`. Dropping them is invisible in a screenshot diff (all render nothing).
7. **Preserve the literal strings verbatim**, including the typos and stray whitespace, if the goal is a byte-exact match: `sendWeminarEmailReminder`, `loadMontlyStats`/`downloadMontlyStats`, `statXrefsMontly`, `swapCLusterIDs`, `resetFCMForuser`, `wysiswyg-editor`, `"user in xrefs  "`, `"uSearch "`. See P30 for the ones that are *visible* to the user.

---

## Honest gaps in this piece

| gap | what is missing | what would close it |
|---|---|---|
| **Interpolated bindings are invisible.** AngularJS `{{…}}` expressions live in text nodes; the dump records the *rendered* text plus the `ng-binding` class, not the expression. 100+ elements carry `class="… ng-binding"` with no recoverable expression. | Field names behind e.g. `#1567`'s role-source suffix (`/ login`, `/ manual`), `#1551` Discord username, `#1555` phone, `#1561` note body, `#220`/`#221` monthly totals, `#193` webinar-time echo, `#148` modal username, `#504` Wordpress shortcode. | The un-rendered template HTML (`/public/dist/app.min.js` templateCache or the server-side partial). |
| **`#0`'s `ng-class` is truncated at 300 chars**, cut mid-expression at `'in-app': !$state.includes`. | The remaining shell classes on `<body>`. Body's actual class at capture is just `footer-hidden`, so nothing else was active — but the full map is unknown. | Raise the attribute cap, or read the app source. |
| **Badges submenu `<ul>` has zero captured children** (`#1819`/`#1834`/`#1849`; captures `08`/`13`/`18` are 1 node each). | The entire Badges action list — item count, labels, handlers, icons. It is almost certainly `ng-repeat`ed over a badge collection that is empty because `sess.enableBadges === "No"` (`#913`). | Capture a room with `enableBadges` on, or capture with the badges submenu expanded. |
| **`checkedAllUsers === true` branch never existed in the DOM** (`ng-if="!checkedAllUsers"`). | The "Deselect All" (or equivalent) label. | Click Select All, then re-capture. |
| **`ng-repeat` collections are only observable at their captured length**: `xrefs.length===3`, `tabs.length===6`, `statXrefs.length===0`, `statXrefsMontly.length===0`, `completeUserList.length>0` (exact value unknown). | Row/empty-state rendering for other cardinalities; the entire stats table body (`#185 <tbody>` and `#222 <tbody>` are both empty). | Load stats for a date range with data, and load a room with >3 users. |
| **`setUserRestrictPM` takes no `$index`** while its 12 sibling row actions do. | Whether that is deliberate or an upstream omission. It is recorded as fact, not judged. | The controller source. |
| **No POST/response payloads.** Every field's *wire* type (string vs number vs bool) is inferred from the editor type and the rendered value, not from an API body. | e.g. `sess.simUserCount` renders `0` with `editable-number` → number; `sess.tokenExpiresIn` renders `1d` with `editable-textarea` → string. Confident, but not proven. | A network capture of `saveSessField`. |
