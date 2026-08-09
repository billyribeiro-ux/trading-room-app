# ptr1 · P21 — Settings tab, **GENERAL settings rows**

> **Piece:** `ptr1-P21-settings-general.md`
> **Capture:** `/tmp/ptr-decode/ptr1/caps/00-baseline-room/` — `INFO.txt`, `DEFAULTS.txt`, `nodes-000.txt` … `nodes-017.txt`
> (capture index 0, label `baseline-room`, ts `2026-07-24T15:59:18.276Z`, kind `fullDom`,
> node count **2156** declared / **2156** emitted, `truncated=false`, viewport `1842×1265 @dpr 2`,
> `themeClass="footer-hidden"`, `cssVars={"root":{},"body":{}}` — `INFO.txt:1-9`).
> **Page:** the Manage Room admin page, room 3625.
> **Decode method:** all 18 `nodes-*.txt` files were parsed record-by-record into 2156 records
> (0 missing, 0 duplicate — every index 0…2155 accounted for). 1201 of those records live under
> `r.0.1.1.0.1.3.1.5`; **969** of them are this piece.

---

## 1. Purpose

This piece is the **general settings block** of the Manage Room "Settings" tab — one flat
`div.form-group.m0` holding 226 sibling group-children that render 214 x-editable room-configuration
fields (auth/passwords, roster, chat, alerts, archives, recordings, S3/Vimeo/OBS/Twilio credentials,
mobile-app knobs). Every field is an inline-edit `<a>` bound to a `sess.<field>` scope property and
persisted through `saveSessField('<field>')` on save.

---

## 2. Path anchor and exact record count

| | |
|---|---|
| **Anchor** | `r.0.1.1.0.1.3.1.5.0.0` (`#186`, `<div class="form-group m0">`) |
| **Records under the anchor (anchor included)** | **969** |
| **Records strictly below the anchor** | 968 |
| **Direct group-children of the anchor ("rows")** | **226** (group indices `0` … `225`, contiguous, none absent) |
| **x-editable fields in this piece** | **214** |
| **Non-field structural group-children** | **12** (indices 0, 3, 4, 60, 62, 63, 65, 66, 139, 193, 204, 218) |

Everything in this file was located by **`path` prefix**, never by `#index`. Reproduce with:

```
cd /tmp/ptr-decode/ptr1/caps/00-baseline-room
awk -v RS='' -v ORS='\n\n' '/path=r\.0\.1\.1\.0\.1\.3\.1\.5\.0\.0\./' nodes-*.txt
```

### 2.1 Ancestor chain (evidence for "this is the Settings tab")

| `#index` | path | tag | class | rect |
|---|---|---|---|---|
| `#60` | `r.0.1.1.0.1.3.0` | `ul` | `nav nav-tabs` | (laid out) |
| `#96` | `r.0.1.1.0.1.3.0.5` | `li` | `ng-isolate-scope` | `x=418.5 y=309 w=85.3 h=42` |
| `#136` | `r.0.1.1.0.1.3.0.5.0` | `a` | `ng-binding`, text **"Settings"** | `x=418.5 y=309 w=83.3 h=42` |
| `#61` | `r.0.1.1.0.1.3.1` | `div` | `tab-content` | — |
| `#102` | `r.0.1.1.0.1.3.1.5` | `div` | `tab-pane ng-scope` **(no `active`)** | `0×0` |
| `#146` | `r.0.1.1.0.1.3.1.5.0` | `div` | `form-vertical ng-scope` | `0×0` |
| `#186` | `r.0.1.1.0.1.3.1.5.0.0` | `div` | `form-group m0` | `0×0` |

The nav `<li>` at group index **5** carries the anchor text `"Settings"` (`#136`), and the sibling
`tab-pane` at group index **5** (`#102`) is the only one whose class lacks `active` — the active pane
is `r.0.1.1.0.1.3.1.0` (`#97`, `class="tab-pane ng-scope active"`). `#102` therefore computes
`display: none`, which is why **every rect below it is `0×0`**.

`#102` attributes (verbatim): `class="tab-pane ng-scope"`, `ng-repeat="tab in tabs"`,
`ng-class="{active: tab.active}"`, `tab-content-transclude="tab"`.

### 2.2 The other direct children of `r.0.1.1.0.1.3.1.5.0`

`r.0.1.1.0.1.3.1.5.0` has **five** children. `.0` is this piece; `.1`–`.4` are the divider + the
"DON'T TOUCH" heading + the advanced wrapper and are decoded in **`ptr1-P22-settings-advanced-cluster.md`**
(anchor `r.0.1.1.0.1.3.1.5.0.4.0`, plus its introducers `r.0.1.1.0.1.3.1.5.0.1` … `.4`).

---

## 3. Geometry — honest statement

**No layout geometry is available for any node in this piece.** The Settings pane (`#102`) is the
INACTIVE 6th tab and computes `display: none`; every one of the 969 records in this subtree reports
`rect: x=0 y=0 w=0 h=0`. That is expected, not a capture gap. **No width, height, x/y, gap or line-box
measurement is asserted anywhere in this document.** Everything below is DOM structure, attributes,
bindings, text and *resolvable* (cascade-derived) computed style, all of which the capture does record
for display:none subtrees.

---

## 4. The row template — verified against all 226 group-children

The prior-work template — `.0` `label.col-sm-2.control-label` → `.1` x-editable `<a href="">` →
`.2` `<br>` → `.3` helper `<label>` — **holds, but only for 110 of the 226 rows.** The full census of
child-shapes of the 226 group-children (generated mechanically from the parsed records):

| count | row element | child sequence |
|---|---|---|
| 103 | `p.form-control-static` | `label.col-sm-2` , `a.editable` , `br` , `label.muted` |
| 62 | `p.form-control-static` | `label.col-sm-2` , `a.editable` *(no `<br>`, no helper)* |
| 37 | `p.form-control-static` | `label.col-sm-2` , `a.editable` , `br` , `label` *(no class)* |
| 6 | `p.form-control-static ng-hide` | `label.col-sm-2` , `a.editable` , `br` , `label.muted` |
| 4 | `br` | *(none)* |
| 2 | `label.muted` | *(none)* |
| 2 | `p.form-control-static` | `label.col-sm-2` , `a.editable` , `label` *(no `<br>`)* |
| 2 | `p.form-control-static ng-hide` | `label.col-sm-2` , `a.editable` , `label` *(no `<br>`)* |
| 1 | `p.form-control-static` | `button.btn` , `button.btn` |
| 1 | `p` *(no class)* | *(none — empty spacer)* |
| 1 | `p.form-control-static` | `label.col-sm-2` , `span.ng-binding` *(read-only value, not editable)* |
| 1 | `p.ng-hide` | `label.col-sm-2` , `a.editable` , `br` , `label.muted` |
| 1 | `div.ng-hide` | `br` , `label` , `input.form-control` |
| 1 | `p.form-control-static` | `label.col-sm-2` , `a.editable` , `button.btn` |
| 1 | `p.form-control-static` | `a.btn` |
| 1 | `label` *(no class)* | *(none)* |
| **226** | | |

Confirmed for **all 214** editable `<a>` nodes: each carries `href=""`, `onaftersave="saveSessField('<field>')"`
and exactly one `editable-<type>="sess.<field>"` attribute. Attribute census over the 968 records below
the anchor: `onaftersave` 214, `editable-checkbox` 123 + `editable-textarea` 61 + `editable-text` 26 +
`editable-number` 4 = 214, `href` **215** (the 215th is `#986`, the non-editable "API POST Routes Docs"
button-link at group index 139), `e-title` 128, `e-label` 79. No node carries two `editable-*`; no node
carries both `e-title` and `e-label`.

**Three helper-text delivery mechanisms exist besides the `.3` `<label>`** (all verified, all real):

1. **Bare text node on the row `<p>`** — rows 219, 220, 221. e.g. `#443`
   (`r.0.1.1.0.1.3.1.5.0.0.219`) is `<p class="form-control-static">` whose *own* text is
   `"Use pub/sub for notifications"` while its element children are the label + the editable.
2. **Helper escaped to a SIBLING group index** — rows 61 and 64 close their `<p>` early, so their
   `<br>` + helper `<label class="muted">` land as group-children 62/63 and 65/66 instead of as
   `.2`/`.3`. Same for row 217, whose helper is the bare `<label>` at group index 218.
3. **`<label>` with no `class` at all** — 41 fields; computed style is byte-identical to `label.muted`
   (see §10/§11).

**57 of the 214 fields have no helper text at all in the capture.**

---

## 5. THE FIELD TABLE — all 214 fields, DOM order

Value column is the *rendered* text of the editable `<a>`. Unset text/textarea/number fields render the
literal italic word **`empty`**; unset checkboxes render **`No`**; set checkboxes render **`Yes!`**.
`|` inside a value is escaped as `\|`; `\n` denotes a literal newline inside the captured string.


| # | Row idx | `#index` | Label (verbatim) | `editable-*` type | Bound expression | `onaftersave` (verbatim) | `e-label` / `e-title` | Captured value | `editable-empty` class | Helper text (verbatim) | Helper node | Row `ng-show` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | #496 | JWT Secret Key: | `editable-textarea` | `sess.ssoJWTSecret` | `saveSessField('ssoJWTSecret')` | `e-label="Secret:"` | `empty` | **yes** | Use this key in combination with the WordPRess plugin, or other JWT SSO, make it hard to getss, like: '5081b73a690762e2526bc1fef3c46eedf1ec8832' | label.muted | `sess.authMode=='jwt'` |
| 2 | 2 | #500 | Allow PW based logins on SSO? | `editable-checkbox` | `sess.allowPWLoginWithSSO` | `saveSessField('allowPWLoginWithSSO')` | `e-title="PW based logins ?"` | `No` | no | if ON, you can give a link and PW to enter the SSO room as well | label.muted | `sess.authMode=='jwt'` |
| 3 | 5 | #506 | Token Expiration | `editable-textarea` | `sess.tokenExpiresIn` | `saveSessField('tokenExpiresIn')` | `e-label="Expires In:"` | `1d` | no | A string like '1d', '1h', '12h" etc... | label.muted | `sess.authMode=='jwt'` |
| 4 | 6 | #510 | Room Password: | `editable-textarea` | `sess.webinarPW` | `saveSessField('webinarPW')` | `e-label="Password:"` | `empty` | **yes** | Give this password to your  to enter the room. — contains `<span style="text-decoration: underline">registered members</span>` (#1351), `<span style="text-decoration: underline">Presenters have their own password.</span>` (#1352) | label.muted | `sess.authMode=='webinarRoom' \|\| sess.allowPWLoginWithSSO` |
| 5 | 7 | #514 | Temp Room Password: | `editable-textarea` | `sess.webinarPW2` | `saveSessField('webinarPW2')` | `e-label="Temp Password:"` | `empty` | **yes** | Temp password/additional pw.. Works in addition to the other passwords | label.muted | `sess.authMode=='webinarRoom' \|\| sess.allowPWLoginWithSSO` |
| 6 | 8 | #518 | Temp Room Password 2: | `editable-textarea` | `sess.webinarPW3` | `saveSessField('webinarPW3')` | `e-label="Temp Password 2:"` | `empty` | **yes** | Temp password 2/additional pw.. Works in addition to the other passwords | label.muted | `sess.authMode=='webinarRoom' \|\| sess.allowPWLoginWithSSO` |
| 7 | 9 | #522 | Free Trial Password: | `editable-textarea` | `sess.webinarPWFreeTrial` | `saveSessField('webinarPWFreeTrial')` | `e-label="FT Password:"` | `empty` | **yes** | Give this password to your — contains `<span style="text-decoration: underline">free trial users.</span>` (#1353) | label.muted | `sess.authMode=='webinarRoom' \|\| sess.authMode=='unamePW' \|\| sess.allowPWLoginWithSSO` |
| 8 | 10 | #526 | Delete Alert Password | `editable-textarea` | `sess.deleteAlertPW` | `saveSessField('deleteAlertPW')` | `e-label="Delete Alert Password:"` | `empty` | **yes** | If set, Presenters will need to enter the password to delete an alert | label.muted | — |
| 9 | 11 | #530 | All Rooms Welcome Mat Password | `editable-textarea` | `sess.allRoomsWelcomeMatPW` | `saveSessField('allRoomsWelcomeMatPW')` | `e-label="All Rooms Welcome Mat Password:"` | `empty` | **yes** | If set, Presenters will need to enter the password to replace all the rooms welcome mats | label.muted | — |
| 10 | 12 | #534 | Password to Manage User's Notes | `editable-textarea` | `sess.needPasswordForUserNotes` | `saveSessField('needPasswordForUserNotes')` | `e-label="Password to Manage User's Notes:"` | `empty` | **yes** | If set, Presenters will need to enter the password to manage user's notes | label.muted | — |
| 11 | 13 | #538 | Nickname filter for members: | `editable-textarea` | `sess.nickFilter` | `saveSessField('nickFilter')` | `e-label="Nick Filter:"` | `empty` | **yes** | (Coma separated list of filters, i.e. 'SO_,SS_,John Carter, etc...' | label.muted | — |
| 12 | 14 | #542 | Custom Favicon | `editable-textarea` | `sess.customFaviconURL` | `saveSessField('customFaviconURL')` | `e-label="Favicon URL:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 13 | 15 | #544 | Overwrite Cash Register Sound | `editable-text` | `sess.overwriteCashRegisterSound` | `saveSessField('overwriteCashRegisterSound')` | `e-label="URL"` | `empty` | **yes** | If set, it will play instead of the chash.mp3 | label.muted | — |
| 14 | 16 | #548 | Login Webhook URL | `editable-textarea` | `sess.login_webhook_url` | `saveSessField('login_webhook_url')` | `e-label="Login Webhook URL:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 15 | 17 | #550 | Logout Webhook URL | `editable-textarea` | `sess.login_webhook_url` | `saveSessField('logout_webhook_url')` | `e-label="Logout Webhook URL:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 16 | 18 | #552 | Membership filter: | `editable-textarea` | `sess.allowedMemberships` | `saveSessField('allowedMemberships')` | `e-label="MemberPlan Filter:"` | `empty` | **yes** | Leave blank to let all members in. Comma seprated list of valid memberships the user needs to have to enter. | label.muted | — |
| 17 | 19 | #556 | Product filter: | `editable-textarea` | `sess.allowedProducts` | `saveSessField('allowedProducts')` | `e-label="MemberPlan Filter:"` | `empty` | **yes** | Leave blank to let all members in. Comma seprated list of valid products the user needs to have to enter. Either a product or membership, or both must match... | label.muted | — |
| 18 | 20 | #560 | Permissions filter: | `editable-textarea` | `sess.allowedPerms` | `saveSessField('allowedPerms')` | `e-label="Permissions Filter:"` | `empty` | **yes** | Leave blank to let all members in. Comma seprated list of valid permissions the user needs to have to enter. Either a product or membership, or both must match... | label.muted | — |
| 19 | 21 | #564 | Secret Token: | `editable-textarea` | `sess.secTok` | `saveSessField('secTok')` | `e-label="Secret:"` | `empty` | **yes** | Leave blank to let all members in, Set it to something complex like  '5081b73a690762e2526bc1fef3c46eedf1ec8832' | label.muted | — |
| 20 | 22 | #568 | Custom Room Drive URL | `editable-textarea` | `sess.custRoomDriveURL` | `saveSessField('custRoomDriveURL')` | `e-label="URL:"` | `empty` | **yes** | If set, Room Drive icon will open this link instead. | label.muted | — |
| 21 | 23 | #572 | Custom Logout URL | `editable-textarea` | `sess.custLogoutURL` | `saveSessField('custLogoutURL')` | `e-label="URL:"` | `empty` | **yes** | If set, Logout button will use this URL | label.muted | — |
| 22 | 24 | #576 | Show Roster ? | `editable-checkbox` | `sess.rosterVisibleToViewers` | `saveSessField('rosterVisibleToViewers')` | `e-title="Show Roster ?"` | `Yes!` | no | If disabled only presenters will see the user count and the roster | label.muted | — |
| 23 | 25 | #580 | Hide Welcome To Message? | `editable-checkbox` | `sess.hideWelcomeTo` | `saveSessField('hideWelcomeTo')` | `e-title="Hide Welcome To Message?"` | `No` | no | If enabled, it will hide welcome message on the login page | label.muted | — |
| 24 | 26 | #584 | Open link on login? | `editable-textarea` | `sess.openLoginLink` | `saveSessField('openLoginLink')` | `e-label="URL:"` | `empty` | **yes** | If enabled, it will open the link set in this setting on a new tab | label.muted | — |
| 25 | 27 | #588 | Custom login error URL redirect | `editable-textarea` | `sess.loginErrorURL` | `saveSessField('loginErrorURL')` | `e-label="URL:"` | `empty` | **yes** | On the login error it will redirect users to this url | label.muted | — |
| 26 | 28 | #592 | Custom login error message | `editable-textarea` | `sess.loginErrorMsg` | `saveSessField('loginErrorMsg')` | `e-title="Login error message"` | `empty` | **yes** | On the login error it will display this message to users | label.muted | — |
| 27 | 29 | #596 | Show only Presenters in the roster? | `editable-checkbox` | `sess.onlyPresentersVisibleToViewers` | `saveSessField('onlyPresentersVisibleToViewers')` | `e-title="Show only Presenters in the roster?"` | `No` | no | If enabled, users will see only presenters in the roster | label.muted | — |
| 28 | 30 | #600 | Show Roster Count? | `editable-checkbox` | `sess.rosterCountVisibleToViewers` | `saveSessField('rosterCountVisibleToViewers')` | `e-title="Show Roster Count?"` | `Yes!` | no | If enabled, the roster count will still be visible to users, even if the roster is not | label.muted | — |
| 29 | 31 | #604 | Simulated Count? | `editable-number` | `sess.simUserCount` | `saveSessField('simUserCount')` | `e-title="Simulated Count?"` | `0` | **yes** | A number from 0 to 5000. You can add "simulated users" to the total user count shown in the room. the roster list will be hidden if you enable this feature | label.muted | — |
| 30 | 32 | #608 | User PMs? | `editable-checkbox` | `sess.userPM` | `saveSessField('userPM')` | `e-title="User PM?"` | `No` | no | If enabled, users can Private msg each other | label.muted | — |
| 31 | 33 | #612 | Enable Private Message History? | `editable-checkbox` | `sess.enablePrivateMessageHistory` | `saveSessField('enablePrivateMessageHistory')` | `e-title="Enable Private Message History?"` | `No` | no | If enabled, can load users private message history | label.muted | — |
| 32 | 34 | #616 | Sound alert when a new message is posted? | `editable-checkbox` | `sess.dingOnNewMessage` | `saveSessField('dingOnNewMessage')` | `e-title="Sound alert when a new message is posted?"` | `No` | no | If enabled, it will play a sound when a new message is posted | label.muted | — |
| 33 | 35 | #620 | Sound when the user joins/leaves? | `editable-checkbox` | `sess.beepOnUserJoin` | `saveSessField('beepOnUserJoin')` | `e-title="Sound alert when the user joins/leaves?"` | `No` | no | If enabled, moderators will hear a sound when users join/leave | label.muted | — |
| 34 | 36 | #624 | Popup alert when the user joins/leaves? | `editable-checkbox` | `sess.userJoinAndLeavePopup` | `saveSessField('userJoinAndLeavePopup')` | `e-title="Popup alert when the user joins/leaves?"` | `No` | no | If enabled, moderators will get a popup when users join/leave | label.muted | — |
| 35 | 37 | #628 | Hide User Avatars? | `editable-checkbox` | `sess.hideAvatars` | `saveSessField('hideAvatars')` | `e-title="User Avatars?"` | `No` | no | If enabled, user avatars will be hidden | label.muted | — |
| 36 | 38 | #632 | Hide Mobile App Info? | `editable-checkbox` | `sess.hideAppInfo` | `saveSessField('hideAppInfo')` | `e-title="Mobile App Info?"` | `No` | no | If enabled, mobile app info wiil be hidden | label.muted | — |
| 37 | 39 | #636 | Always Show User Roster? | `editable-checkbox` | `sess.alwaysShowRoster` | `saveSessField('alwaysShowRoster')` | `e-title="Show user roster?"` | `No` | no | If enabled, user roster will always be visible | label.muted | — |
| 38 | 40 | #640 | Show Only Usernames in Roster? | `editable-checkbox` | `sess.showOnlyUsernames` | `saveSessField('showOnlyUsernames')` | `e-title="Show Only Usernames in Roster?"` | `No` | no | If enabled, for regular users it will show only their usernames in roster? | label.muted | — |
| 39 | 41 | #644 | Allow Users to Change their Usernames? | `editable-checkbox` | `sess.allowUsersToChangeUsername` | `saveSessField('allowUsersToChangeUsername')` | `e-title="Allow Users to Change their Username?"` | `No` | no | If enabled, for regular users it will allow them to change their usernames. | label.muted | — |
| 40 | 42 | #648 | Disable Editing Username | `editable-checkbox` | `sess.disableEditingUsername` | `saveSessField('disableEditingUsername')` | `e-title="Show Only Usernames in Roster?"` | `No` | no | If enabled, it will disable the editing of the username in the login form for regular users | label.muted | — |
| 41 | 43 | #652 | Username Instructions | `editable-textarea` | `sess.usernameInstructions` | `saveSessField('usernameInstructions')` | `e-label="text:"` | `empty` | **yes** | Instructions how user can edit his username | label (no class) | — |
| 42 | 44 | #656 | Forgot room password? | `editable-checkbox` | `sess.forgotRoomPassword` | `saveSessField('forgotRoomPassword')` | `e-title="Forgot room password?"` | `No` | no | If enabled, can change room login password on the login page | label.muted | — |
| 43 | 45 | #660 | Tawk Presenter Support? | `editable-checkbox` | `sess.tawkPresenterSupport` | `saveSessField('tawkPresenterSupport')` | `e-title="Tawk Presenter Support?"` | `No` | no | If enabled, tawk presenter support will be visible in the room | label.muted | — |
| 44 | 46 | #664 | User PM presenters? | `editable-checkbox` | `sess.userToPresenterPM` | `saveSessField('userToPresenterPM')` | `e-title="User PM presenters?"` | `No` | no | If enabled, users can Private msg presenters | label.muted | — |
| 45 | 47 | #668 | Chat Message Sound For Emails: | `editable-textarea` | `sess.playChatMessageSoundFor` | `saveSessField('playChatMessageSoundFor')` | `e-label="List of emails:"` | `empty` | **yes** | Coma separated list of emails to play sound on the new chat message | label.muted | — |
| 46 | 48 | #672 | Alerts/Chat on bottom? | `editable-checkbox` | `sess.alertsChatOnBottom` | `saveSessField('alertsChatOnBottom')` | `e-title="Alerts/Chat on bottom?"` | `No` | no | If enabled, the alerts and chat will be bellow the screenshare area | label.muted | — |
| 47 | 49 | #676 | Q&A on Alerts? | `editable-checkbox` | `sess.hasQAOnAlerts` | `saveSessField('hasQAOnAlerts')` | `e-title="Alert Q&A ?"` | `Yes!` | no | If enabled, users can ask questions on Alerts and have a disscussion in context | label.muted | — |
| 48 | 50 | #680 | Alerts over screenshare? | `editable-checkbox` | `sess.alertsOverlayOnScreenshare` | `saveSessField('alertsOverlayOnScreenshare')` | `e-title="Alerts over screenshare?"` | `No` | no | If enabled, alerts will appear over the screenshare in recordings | label.muted | — |
| 49 | 51 | #684 | Copy Trades? | `editable-checkbox` | `sess.copyTrades` | `saveSessField('copyTrades')` | `e-title="Copy Trades?"` | `No` | no | If enabled, users can copy trades by clicking on them | label.muted | — |
| 50 | 52 | #688 | Disable Copy? | `editable-checkbox` | `sess.disableCopy` | `saveSessField('disableCopy')` | `e-title="Disable Copy?"` | `No` | no | If enabled, it will disable right-click to prevent selecting and copying all text | label.muted | — |
| 51 | 53 | #692 | Claim Nickname? | `editable-checkbox` | `sess.claimNickName` | `saveSessField('claimNickName')` | `e-title="Claim Nickname?"` | `No` | no | If enabled, users can claim a nickname | label.muted | — |
| 52 | 54 | #696 | Show typing indicator ? | `editable-checkbox` | `sess.hasTypingIndicator` | `saveSessField('hasTypingIndicator')` | `e-title="Show typing indicator ?"` | `No` | no | Show if somebody is typing in the room or PM | label.muted | — |
| 53 | 55 | #700 | Presenter chat messages on the right? | `editable-checkbox` | `sess.presenterMsgsOnTheRight` | `saveSessField('presenterMsgsOnTheRight')` | `e-title="Presenter chat messages on the right?"` | `No` | no | If enabled, renders presenter chat messages on the right | label.muted | — |
| 54 | 56 | #704 | Alt Chat Render? | `editable-checkbox` | `sess.altChatRender` | `saveSessField('altChatRender')` | `e-title="Alt Chat Render?"` | `No` | no | If enabled, renders chat sans avatars, and compact mode | label.muted | — |
| 55 | 57 | #708 | Alt Room Render? | `editable-checkbox` | `sess.altRoomRender` | `saveSessField('altRoomRender')` | `e-title="Alt Room Render?"` | `No` | no | If enabled, renders simplified alerts/chat | label.muted | — |
| 56 | 58 | #712 | Pair Link For App? | `editable-checkbox` | `sess.hasAppPairLink` | `saveSessField('hasAppPairLink')` | `e-title="App Pair Link?"` | `No` | no | If enabled, it will show the link to pair the app | label.muted | — |
| 57 | 59 | #716 | Pair Secret Key | `editable-textarea` | `sess.pairSecretKey` | `saveSessField('pairSecretKey')` | `e-label="Pair Secret Key:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 58 | 61 | #721 | Pair OK Redirect | `editable-textarea` | `sess.pairOKRedirect` | `saveSessField('pairOKRedirect')` | `e-label="Pair OK Redirect:"` | `empty` | **yes** | Where to send users if the pairing succeeds | SIBLING <label> at group index 63 (row <p> closed early) | — |
| 59 | 64 | #723 | Pair ERROR Redirect | `editable-textarea` | `sess.pairErrorRedirect` | `saveSessField('pairErrorRedirect')` | `e-label="Pair ERROR Redirect:"` | `empty` | **yes** | Where to send users if the pairing fails | SIBLING <label> at group index 66 (row <p> closed early) | — |
| 60 | 67 | #725 | Hide Alerts/Chat Section? | `editable-checkbox` | `sess.hideChatAlerts` | `saveSessField('hideChatAlerts')` | `e-title="Hide Alerts/Chat Section?"` | `No` | no | If enabled, the room will not have chat/alerts. Just media. | label.muted | — |
| 61 | 68 | #729 | Enable Swing Trade Alerts Tab? | `editable-checkbox` | `sess.hasSwingTradeAlerts` | `saveSessField('hasSwingTradeAlerts')` | `e-title="Enable Swing Trade Alerts Tab?"` | `No` | no | If enabled, the room will have swing alerts tab. | label.muted | — |
| 62 | 69 | #733 | Enable Day Trade Alerts Tab? | `editable-checkbox` | `sess.hasDayTradeAlerts` | `saveSessField('hasDayTradeAlerts')` | `e-title="Enable Day Trade Alerts Tab?"` | `No` | no | If enabled, the room will have day trade alerts tab. | label.muted | — |
| 63 | 70 | #737 | User Public Reply? | `editable-checkbox` | `sess.usersPublicReply` | `saveSessField('usersPublicReply')` | `e-title="User Public Reply?"` | `No` | no | If enabled, regular user will be able to do reply | label.muted | — |
| 64 | 71 | #741 | Chat Disabled For Trials? | `editable-checkbox` | `sess.chatDisabledForTrials` | `saveSessField('chatDisabledForTrials')` | `e-title="Chat Disabled For Trials?"` | `No` | no | If its set, auto disable the chat (chat disabed) if they are trials | label.muted | — |
| 65 | 72 | #745 | Disable PM For Trials? | `editable-checkbox` | `sess.disablePMForTrials` | `saveSessField('disablePMForTrials')` | `e-title="Disable PM For Trials?"` | `No` | no | If enabled, trial users will not be able to send private messages | label.muted | — |
| 66 | 73 | #749 | Users Can Delete Own Messages? | `editable-checkbox` | `sess.usersCanDeleteOwnMsgs` | `saveSessField('usersCanDeleteOwnMsgs')` | `e-title="Users Can Delete Own Messages?"` | `No` | no | If enabled, regular users can delete their own messages | label.muted | — |
| 67 | 74 | #753 | Smaller image previews? | `editable-checkbox` | `sess.smallerImagePreview` | `saveSessField('smallerImagePreview')` | `e-title="Smaller image previews?"` | `No` | no | If enabled, the room will have smaller image previews in the chats | label.muted | — |
| 68 | 75 | #757 | Hide Notes Section? | `editable-checkbox` | `sess.hideNotes` | `saveSessField('hideNotes')` | `e-title="Hide notes Section?"` | `No` | no | If enabled, the room will not have the notes tab | label.muted | — |
| 69 | 76 | #761 | Hide Files Section? | `editable-checkbox` | `sess.hideFiles` | `saveSessField('hideFiles')` | `e-title="Hide files Section?"` | `No` | no | If enabled, the room will not have the files tab | label.muted | — |
| 70 | 77 | #765 | Set Dark Theme As Default? | `editable-checkbox` | `sess.darkThemeAsDefault` | `saveSessField('darkThemeAsDefault')` | `e-title="Dark Theme As Default?"` | `No` | no | If enabled, dark theme will be set as default | label.muted | — |
| 71 | 78 | #769 | Preserve Webinar Mode chat? | `editable-checkbox` | `sess.saveWebinarModeChat` | `saveSessField('saveWebinarModeChat')` | `e-title="Preserve Webinar Mode chat?"` | `No` | no | If enabled, chatlog will be preserved across page reloads | label.muted | — |
| 72 | 79 | #773 | Show Archives? | `editable-checkbox` | `sess.showArchivesToUsers` | `saveSessField('showArchivesToUsers')` | `e-title="User Archives?"` | `No` | no | If enabled, users can see the archives on the side bar | label.muted | — |
| 73 | 80 | #777 | Show Archives to specific Presenters | `editable-textarea` | `sess.showArchivesToSpecificPresenters` | `saveSessField('showArchivesToSpecificPresenters')` | `e-label="email:"` | `empty` | **yes** | Comma separated list of Presenter emails | label (no class) | — |
| 74 | 81 | #781 | Prevent sporadic reconnects? | `editable-checkbox` | `sess.disalowSporadicMultiLogins` | `saveSessField('disalowSporadicMultiLogins')` | `e-title="Prevent sporadic?"` | `No` | no | prevents a user's connection to reconnect multiple times within a short time | label.muted | — |
| 75 | 82 | #785 | Disalow Multi-logins? | `editable-checkbox` | `sess.disalowMultiLogins` | `saveSessField('disalowMultiLogins')` | `e-title="Disalow Multi-Logins?"` | `No` | no | If enabled, users could can only log in once per room | label.muted | — |
| 76 | 83 | #789 | Send report email? | `editable-checkbox` | `sess.sendReportEmails` | `saveSessField('sendReportEmails')` | `e-title="Send emails?"` | `Yes!` | no | If enabled, you will get an email to the address below for each incident | label.muted | — |
| 77 | 84 | #793 | Ban IP list | `editable-textarea` | `sess.banIPList` | `saveSessField('banIPList')` | `e-label="email:"` | `empty` | **yes** | Comma separated list of banned IPs | label (no class) | — |
| 78 | 85 | #797 | Report emails | `editable-textarea` | `sess.reportEmail` | `saveSessField('reportEmail')` | `e-label="email:"` | `empty` | **yes** | Comma separated list of emails to receive abuse reports | label (no class) | — |
| 79 | 86 | #801 | Custom JWT Error Message | `editable-textarea` | `sess.customJWTErrorMessage` | `saveSessField('customJWTErrorMessage')` | `e-label="text:"` | `empty` | **yes** | Set a custom JWT error message | label (no class) | — |
| 80 | 87 | #805 | Open/Close Room emails | `editable-textarea` | `sess.sendOpenCloseEmail` | `saveSessField('sendOpenCloseEmail')` | `e-label="email:"` | `empty` | **yes** | Comma separated list of emails to receive open / close room events | label (no class) | — |
| 81 | 88 | #809 | Auto Open Room Time | `editable-textarea` | `sess.autoOpenTime` | `saveSessField('autoOpenTime')` | `e-label="Open Time:"` | `empty` | **yes** | Time in Military EST to automatically OPEN the room. i.e. 7:30 | label (no class) | — |
| 82 | 89 | #813 | Auto Close Room Time | `editable-textarea` | `sess.autoCloseTime` | `saveSessField('autoCloseTime')` | `e-label="Close Time:"` | `empty` | **yes** | Time in Military EST to automatically CLOSE the room. i.e. 18:30 | label (no class) | — |
| 83 | 90 | #817 | Ignore Auto Open & Close On Weekend | `editable-checkbox` | `sess.ignoreAutoOpenCloseOnWeekend` | `saveSessField('ignoreAutoOpenCloseOnWeekend')` | `e-title="Ignore Auto Open & Close On Weekend?"` | `No` | no | *(none in capture)* | — | — |
| 84 | 91 | #819 | Alerts Sound Off? | `editable-checkbox` | `sess.alertSoundOff` | `saveSessField('alertSoundOff')` | `e-title="Alerts Sound Off?"` | `No` | no | Turn off alert cash register sound by default. Members can always turn it on | label.muted | — |
| 85 | 92 | #823 | Sticky Non-Trade Alerts? | `editable-checkbox` | `sess.styckyNonTradeAlert` | `saveSessField('styckyNonTradeAlert')` | `e-title="Sticky Non-Trade Alerts?"` | `No` | no | If enabled, the non-trade alert checkbox in the alert entry will be ON by default | label.muted | — |
| 86 | 93 | #827 | Shared Files Access Case/Case? | `editable-checkbox` | `sess.fileAccessCaseByCase` | `saveSessField('fileAccessCaseByCase')` | `e-title="Shared Files Access Case/Case?"` | `No` | no | Allow access to the shared drive on a case/case basis | label.muted | — |
| 87 | 94 | #831 | Chat Only Room? | `editable-checkbox` | `sess.isChatOnlyRoom` | `saveSessField('isChatOnlyRoom')` | `e-title="Disable Screen & Audio?"` | `No` | no | The room will be only text based chat/alerts, no audio/video | label.muted | — |
| 88 | 95 | #835 | Auto Clear Chat? | `editable-checkbox` | `sess.chatAutoClear` | `saveSessField('chatAutoClear')` | `e-title="Auto Clear Chat?"` | `No` | no | Chat will clear at 11:45PM EST / 10:45PM Central. | label.muted | — |
| 89 | 96 | #839 | Auto Clear Alerts? | `editable-checkbox` | `sess.alertsAutoClear` | `saveSessField('alertsAutoClear')` | `e-title="Auto Clear Alerts?"` | `No` | no | Alerts will clear at 11:45PM EST / 10:45PM Central. | label.muted | — |
| 90 | 97 | #843 | Overwrite Clear Hour: | `editable-textarea` | `sess.chatAutoClearSpecialHour` | `saveSessField('chatAutoClearSpecialHour')` | `e-label="Nick Filter:"` | `empty` | **yes** | Overwrite the default 12am clearing time with this hour instead: Enter a number only, example: "3" for 3:00AM est.  ALL TIMES ARE EST' | label.muted | — |
| 91 | 98 | #847 | Auto Clear Chat Weekend? | `editable-checkbox` | `sess.chatAutoClearWeekend` | `saveSessField('chatAutoClearWeekend')` | `e-title="Auto Clear Chat?"` | `No` | no | Chat will clear on Sundays. | label.muted | — |
| 92 | 99 | #851 | Archive Alerts? | `editable-checkbox` | `sess.archiveAlertsLog` | `saveSessField('archiveAlertsLog')` | `e-title="Archive Alerts?"` | `Yes!` | no | If enabled, archived alert logs will be available from a link in the room | label.muted | — |
| 93 | 100 | #855 | Archive Chatlog? | `editable-checkbox` | `sess.archiveChatLog` | `saveSessField('archiveChatLog')` | `e-title="Archive Chats?"` | `Yes!` | no | *(none in capture)* | — | — |
| 94 | 101 | #857 | Hide Chatlog from Archive? | `editable-checkbox` | `sess.hideChatLog` | `saveSessField('hideChatLog')` | `e-title="Hide Chatlog from Archive?"` | `No` | no | If enabled, archived chat logs will be hidden for the regular users in the room | label.muted | — |
| 95 | 102 | #861 | Enable alert scheduler? | `editable-checkbox` | `sess.hasAlertScheduler` | `saveSessField('hasAlertScheduler')` | `e-title="Enable Alert Scheduler?"` | `No` | no | Presenters will be able to schedule sending alerts in the future | label.muted | — |
| 96 | 103 | #865 | Enable VideoPlayer? | `editable-checkbox` | `sess.enableVideoPlayer` | `saveSessField('enableVideoPlayer')` | `e-title="Video Player?"` | `Yes!` | no | In room video player | label.muted | — |
| 97 | 104 | #869 | User Chat Screenshots? | `editable-checkbox` | `sess.userUploads` | `saveSessField('userUploads')` | `e-title="Allow User Screenshots?"` | `No` | no | If enabled, Users will be able to upload screenshots on the chat | label.muted | — |
| 98 | 105 | #873 | Enable Discord? | `editable-checkbox` | `sess.enableDiscord` | `saveSessField('enableDiscord')` | `e-title="Enable Discord?"` | `No` | no | It will enable Discord | label.muted | — |
| 99 | 106 | #877 | Disable Emojis? | `editable-checkbox` | `sess.disableEmojis` | `saveSessField('disableEmojis')` | `e-title="Disable Emojis?"` | `No` | no | If enabled, Users will be able to add emojis using the emoji tool | label.muted | — |
| 100 | 107 | #881 | Enable Rich Text Editor? | `editable-checkbox` | `sess.enableRTE` | `saveSessField('enableRTE')` | `e-title="Enable Rich Text Editor?"` | `No` | no | If enabled, Presenter will be able to format their messages using the rich text editor | label.muted | — |
| 101 | 108 | #885 | Enable Reactions? | `editable-checkbox` | `sess.enableReactions` | `saveSessField('enableReactions')` | `e-title="Enable Reactions?"` | `No` | no | If enabled, Users will be able to add reactions to the messages | label.muted | — |
| 102 | 109 | #889 | Enable QA Reactions? | `editable-checkbox` | `sess.enableQAReactions` | `saveSessField('enableQAReactions')` | `e-title="Enable Reactions?"` | `No` | no | If enabled, Users will be able to add reactions to the QA messages | label.muted | — |
| 103 | 110 | #893 | Enable Edit Messages? | `editable-checkbox` | `sess.enableEditMessage` | `saveSessField('enableEditMessage')` | `e-title="Enable Edit Messages?"` | `No` | no | If enabled, everyone will be able to edit their own messages | label.muted | — |
| 104 | 111 | #897 | Enable Edit Alerts? | `editable-checkbox` | `sess.enableEditAlerts` | `saveSessField('enableEditAlerts')` | `e-title="Enable Edit Alerts?"` | `No` | no | If enabled, Presenters will be able to edit alerts | label.muted | — |
| 105 | 112 | #901 | Alert Labels | `editable-textarea` | `sess.alertLabels` | `saveSessField('alertLabels')` | `e-label="Alert Labels:"` | `empty` | **yes** | JSON array of alert labels, i.e. [\n  {\n    "name": "Day Trade",\n    "hash": "DayTrade",\n    "color": "#9c4537",\n     "bgcolor":"#e8f5f7"\n  },\n  {\n    "name": "Swing Trade",\n    "hash": "SwingTrade",\n    "color": "#24794f",\n"bgcolor":"#e8f5f7"\n  }\n] | label.muted | — |
| 106 | 113 | #905 | Advanced Search Alerts? | `editable-checkbox` | `sess.advancedSearchAlerts` | `saveSessField('advancedSearchAlerts')` | `e-title="Advanced Alerts Search?"` | `No` | no | If enabled, will allow advanced search alerts | label.muted | — |
| 107 | 114 | #909 | Enable Delete Log? | `editable-checkbox` | `sess.enableDeleteLog` | `saveSessField('enableDeleteLog')` | `e-title="Enable Delete Log?"` | `No` | no | If enabled, will keep track of deleted messages | label.muted | — |
| 108 | 115 | #913 | User Badges? | `editable-checkbox` | `sess.enableBadges` | `saveSessField('enableBadges')` | `e-title="User Badges?"` | `No` | no | If enabled, You can cofigure and set badges next to each user name, like [Gold], etc | label.muted | — |
| 109 | 116 | #917 | Token Badges? | `editable-checkbox` | `sess.enableTokenBadges` | `saveSessField('enableTokenBadges')` | `e-title="Token Badges?"` | `No` | no | If enabled, Badges will come from JWT token in this room | label.muted | — |
| 110 | 117 | #921 | Remove token from url | `editable-checkbox` | `sess.remToken` | `saveSessField('remToken')` | `e-title="Remove token from url?"` | `No` | no | If enabled, remove the jwt from the ULR. | label.muted | — |
| 111 | 118 | #925 | Show Badges only to Presenters? | `editable-checkbox` | `sess.showBadgesToPresentersOnly` | `saveSessField('showBadgesToPresentersOnly')` | `e-title="Show Badges only Presenters?"` | `No` | no | If enabled, You can cofigure and set badges next to each user name, like [Gold], etc | label.muted | — |
| 112 | 119 | #929 | Don't follow Presenters? | `editable-checkbox` | `sess.dontFollowPresenters` | `saveSessField('dontFollowPresenters')` | `e-title="Don't follow Presenters?"` | `No` | no | If enabled, users will not follow Presenters | label.muted | — |
| 113 | 120 | #933 | Disable Stars ? | `editable-checkbox` | `sess.disableStarYears` | `saveSessField('disableStarYears')` | `e-title="Disable Stars?"` | `No` | no | If disabled, users will not see the stars next to user names | label.muted | — |
| 114 | 121 | #937 | Phone Number Required? | `editable-checkbox` | `sess.hasRequiredPhoneInLogin` | `saveSessField('hasRequiredPhoneInLogin')` | `e-title="Phone Required?"` | `No` | no | User will need to enter a valid phone number to enter | label.muted | — |
| 115 | 122 | #941 | Show password field? | `editable-checkbox` | `sess.showPasswordField` | `saveSessField('showPasswordField')` | `e-title="Show password field?"` | `No` | no | Show password field on the login page | label.muted | — |
| 116 | 123 | #945 | Is Main Room? | `editable-checkbox` | `sess.isMainRoom` | `saveSessField('isMainRoom')` | `e-title="Is Main Room?"` | `No` | no | *(none in capture)* | — | — |
| 117 | 124 | #947 | Is Archived Room? | `editable-checkbox` | `sess.isArchivedRoom` | `saveSessField('isArchivedRoom')` | `e-title="Is Archived Room?"` | `No` | no | *(none in capture)* | — | — |
| 118 | 125 | #949 | Is New Room? | `editable-checkbox` | `sess.isNewIndicatorOn` | `saveSessField('isNewIndicatorOn')` | `e-title="Is New Room?"` | `No` | no | *(none in capture)* | — | — |
| 119 | 126 | #951 | BZ News (DO NOT USE UNLESS YOU HAVE API) | `editable-checkbox` | `sess.hasBenzingaNews` | `saveSessField('hasBenzingaNews')` | `e-title="BZ News?"` | `No` | no | You will need an API key from benzinga | label.muted | — |
| 120 | 127 | #955 | Custom Benzinga logo url | `editable-textarea` | `sess.altBenzingaLogoURL` | `saveSessField('altBenzingaLogoURL')` | `e-label="URL:"` | `empty` | **yes** | Set custom Benzinga logo url | label (no class) | — |
| 121 | 128 | #959 | Custom Benzinga link url | `editable-textarea` | `sess.altBenzingaLinkURL` | `saveSessField('altBenzingaLinkURL')` | `e-label="URL:"` | `empty` | **yes** | Set custom Benzinga link url | label (no class) | — |
| 122 | 129 | #963 | Imgur ClientID: | `editable-text` | `sess.imgurClientID` | `saveSessField('imgurClientID')` | **(neither)** | `empty` | **yes** | *(none in capture)* | — | — |
| 123 | 130 | #965 | Imgur api key: | `editable-text` | `sess.imgurApiKey` | `saveSessField('imgurApiKey')` | **(neither)** | `empty` | **yes** | *(none in capture)* | — | — |
| 124 | 131 | #967 | Imgur rapid key: | `editable-textarea` | `sess.imgurRapidKey` | `saveSessField('imgurRapidKey')` | **(neither)** | `empty` | **yes** | *(none in capture)* | — | — |
| 125 | 132 | #969 | X User Access Token: | `editable-textarea` | `sess.xuserAccessToken` | `saveSessField('xuserAccessToken')` | `e-label="URL:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 126 | 133 | #971 | X User Access Token Secret: | `editable-textarea` | `sess.xuserAccessTokenSecret` | `saveSessField('xuserAccessTokenSecret')` | `e-label="URL:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 127 | 134 | #973 | Subscription Plans: | `editable-textarea` | `sess.subscriptionPlans` | `saveSessField('subscriptionPlans')` | `e-label="Subscription Plans:"` | `empty` | **yes** | JSON array with subscription plans, i.e. [{\n                                    "name": "Basic Plan",\n\n    "fee": 4.99,\n    "desc": "Basic Plan Description.",\n    "recommended": false\n  },\n  {\n\n    "name": "Pro Plan",\n    "fee": 9.99,\n    "desc": "Pr | label.muted | — |
| 128 | 135 | #977 | Stripe Email: | `editable-textarea` | `sess.stripeEmail` | `saveSessField('stripeEmail')` | `e-label="Stripe Email:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 129 | 136 | #979 | Live User stats? | `editable-checkbox` | `sess.enableLiveStats` | `saveSessField('enableLiveStats')` | `e-title="Live stats?"` | `No` | no | *(none in capture)* | — | — |
| 130 | 137 | #981 | UserXrefStats? | `editable-checkbox` | `sess.collectsUserStats` | `saveSessField('collectsUserStats')` | `e-title="UserXrefStats?"` | `No` | no | Only enabled if you need granular Users Stats | label (no class) | — |
| 131 | 138 | #984 | API secret | `editable-textarea` | `sess.apiSecret` | `saveSessField('apiSecret')` | `e-label="URL:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 132 | 140 | #988 | Slack post URL secret | `editable-textarea` | `sess.slackPostURL` | `saveSessField('slackPostURL')` | `e-label="URL:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 133 | 141 | #990 | Disable PUSH Alerts? | `editable-checkbox` | `sess.diasableFCMAlerts` | `saveSessField('diasableFCMAlerts')` | `e-title="disable PUSH Alerts ?"` | `No` | no | *(none in capture)* | — | — |
| 134 | 142 | #992 | Moderator Message: | `editable-textarea` | `sess.modMessage` | `saveSessField('modMessage')` | `e-label="MSG:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 135 | 143 | #994 | Positions Iframe Url | `editable-textarea` | `sess.positionsIframeUrl` | `saveSessField('positionsIframeUrl')` | `e-label="URL:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 136 | 144 | #996 | Enable positions iframe? | `editable-checkbox` | `sess.positionsIframe` | `saveSessField('positionsIframe')` | `e-title="Enable positions iframe?"` | `No` | no | *(none in capture)* | — | — |
| 137 | 145 | #998 | Enable Tip Me Button? | `editable-checkbox` | `sess.tipMeBtnEnabled` | `saveSessField('tipMeBtnEnabled')` | `e-title="Enable Tip Me Button?"` | `No` | no | *(none in capture)* | — | — |
| 138 | 146 | #1000 | Tip Me Button Text | `editable-textarea` | `sess.tipMeBtnTxt` | `saveSessField('tipMeBtnTxt')` | `e-label="Text:"` | `Tip Me?` | no | *(none in capture)* | — | — |
| 139 | 147 | #1002 | Tip Me Button Url | `editable-textarea` | `sess.tipMeBtnUrl` | `saveSessField('tipMeBtnUrl')` | `e-label="Text:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 140 | 148 | #1004 | Sales Banner | `editable-textarea` | `sess.salesBanner` | `saveSessField('salesBanner')` | `e-label="Text:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 141 | 149 | #1006 | Admin panel access list: | `editable-textarea` | `sess.modAdminLoginList` | `saveSessField('modAdminLoginList')` | `e-label="Admin login list:"` | `empty` | **yes** | put any emails here of admins you want to allow access to the admin panel section. (i.e. "john@example.com","jane@example.com") comma separated list. | label.muted | — |
| 142 | 150 | #1010 | Alerts only Room? | `editable-checkbox` | `sess.isAlertOnly` | `saveSessField('isAlertOnly')` | `e-title="Alerts only room ?"` | `No` | no | Alerts only rooms are just rooms to receve push notifications and nothing else. Don't use this if you don't know what it is!!! | label (no class) | — |
| 143 | 151 | #1014 | Custom Alert POST | `editable-textarea` | `sess.customClientAlertPostURL` | `saveSessField('customClientAlertPostURL')` | `e-label="URL:"` | `empty` | **yes** | POST alerts to this URL endpoint | label (no class) | — |
| 144 | 152 | #1018 | Custom Alert secret | `editable-textarea` | `sess.customClientAlertPostSecret` | `saveSessField('customClientAlertPostSecret')` | `e-label="Secret:"` | `empty` | **yes** | secret PW for the endpoint above | label (no class) | — |
| 145 | 153 | #1022 | Strict Browser? | `editable-checkbox` | `sess.strictBrowserMode` | `saveSessField('strictBrowserMode')` | `e-title="Strict Browser?"` | `No` | no | If YES, Only Chrome, Firefox, and Opera are allowed in (no try anyhow link)... | label.muted | — |
| 146 | 154 | #1026 | Disable Chat Flood? | `editable-checkbox` | `sess.chatFloodDisabled` | `saveSessField('chatFloodDisabled')` | `e-title="Disable Chat Flood ?"` | `No` | no | *(none in capture)* | — | — |
| 147 | 155 | #1028 | Huge Priv Msg Alert? | `editable-checkbox` | `sess.privMessageHugePopup` | `saveSessField('privMessageHugePopup')` | `e-title="Huge Priv Msg?"` | `No` | no | Some user can't see the private messages, this makes a HUGE popup | label (no class) | — |
| 148 | 156 | #1032 | OffTopic Channels/Tabs | `editable-checkbox` | `sess.hasChannelTabs` | `saveSessField('hasChannelTabs')` | `e-title="Chat Channels?"` | `Yes!` | no | This setting adds an OffTopic, channel tabs next to general chat | label (no class) | — |
| 149 | 157 | #1036 | Auto switch to OffTopic Channels/Tabs? | `editable-checkbox` | `sess.autoSwitchToOfftopics` | `saveSessField('autoSwitchToOfftopics')` | `e-title="Auto Switch To Offtopics Channel?"` | `No` | no | Auto Switch to OffTopic tab | label (no class) | — |
| 150 | 158 | #1040 | Admin Channels/Tabs | `editable-checkbox` | `sess.hasAdminOnlyChannel` | `saveSessField('hasAdminOnlyChannel')` | `e-title="Admin Channel?"` | `No` | no | This setting adds an admin/presenter dedicated chat tab | label (no class) | — |
| 151 | 159 | #1044 | Extra Admin Channels | `editable-textarea` | `sess.extraAdminChannels` | `saveSessField('extraAdminChannels')` | `e-label="email:"` | `empty` | **yes** | Comma separated list of extra admin channels | label (no class) | — |
| 152 | 160 | #1048 | Extra Regular Channels | `editable-textarea` | `sess.extraRegChannels` | `saveSessField('extraRegChannels')` | `e-label="email:"` | `empty` | **yes** | Comma separated list of extra regular (anyone can post) channels | label (no class) | — |
| 153 | 161 | #1052 | Rename "Main Chat" | `editable-textarea` | `sess.altGenChannelName` | `saveSessField('altGenChannelName')` | `e-label="email:"` | `empty` | **yes** | Rename the Main Chat channel to... | label (no class) | — |
| 154 | 162 | #1056 | Rename "Off-Topic" | `editable-textarea` | `sess.altOffTopicChannelName` | `saveSessField('altOffTopicChannelName')` | `e-label="email:"` | `empty` | **yes** | Rename the Off-Topic channel to... | label (no class) | — |
| 155 | 163 | #1060 | Chat Tabs With Badges: | `editable-textarea` | `sess.chatTabsWithBadges` | `saveSessField('chatTabsWithBadges')` | `e-label="Chat Tabs With Badges:"` | `empty` | **yes** | List of chat tabs with badges: [\n  {\n    "name": "easy channel",\n    "badges": [\n      "61eafd612fcdee7bc8e979bc",\n      "6489f1f98993a677b83cdd70"\n    ]\n  },\n  {\n    "name": "harder channel",\n    "badges": [\n      "61eafd612fcdee7bc8e979bc"\n    ]\n   | label (no class) | — |
| 156 | 164 | #1064 | Chat Profanity filter? | `editable-checkbox` | `sess.hasProfanityFilter` | `saveSessField('hasProfanityFilter')` | `e-title="Filter bad words?"` | `No` | no | Profanity filter will try to filter (put xxxx) on bad words | label (no class) | — |
| 157 | 165 | #1068 | Ignore List | `editable-text` | `sess.ingnoreBadWordsList` | `saveSessField('ingnoreBadWordsList')` | `e-label="Comma Separated Ignore list"` | `empty` | **yes** | Comma separated list OK words to remove from the filter | label (no class) | `sess.hasProfanityFilter` |
| 158 | 166 | #1071 | Extra Bad list | `editable-text` | `sess.additionalBadWordsList` | `saveSessField('additionalBadWordsList')` | `e-label="Comma Separated additional list"` | `empty` | **yes** | Comma separated list of additional bad words you want to filter | label (no class) | `sess.hasProfanityFilter` |
| 159 | 167 | #1074 | Simplified Note Editor? | `editable-checkbox` | `sess.simplifiedEditor` | `saveSessField('simplifiedEditor')` | `e-title="Enable Simplified Note Editor?"` | `No` | no | If enabled, the Note Editor will be simplified. | label (no class) | — |
| 160 | 168 | #1078 | Disable Audio Meter? | `editable-checkbox` | `sess.audioMeterDisabled` | `saveSessField('audioMeterDisabled')` | `e-title="Disable Audio Meter?"` | `No` | no | Turn this on to disable the audio level meter next to the presenter name when they are talking | label (no class) | — |
| 161 | 169 | #1082 | Hide WebCam in the room? | `editable-checkbox` | `sess.hideWebcamForRoom` | `saveSessField('hideWebcamForRoom')` | `e-title="Hide WebCam in the room?"` | `No` | no | If enabled, WebCam will be hidden in the room | label.muted | — |
| 162 | 170 | #1086 | Record alerts and chat? | `editable-checkbox` | `sess.recordChat` | `saveSessField('recordChat')` | `e-title="Record alerts and chat?"` | `No` | no | *(none in capture)* | — | — |
| 163 | 171 | #1088 | Auto record presenters? | `editable-checkbox` | `sess.autoRecord` | `saveSessField('autoRecord')` | `e-title="Auto record presenters?"` | `No` | no | *(none in capture)* | — | — |
| 164 | 172 | #1090 | Blinking [REC]? | `editable-checkbox` | `sess.blinkingRec` | `saveSessField('blinkingRec')` | `e-title="Blinking [REC]?"` | `No` | no | *(none in capture)* | — | — |
| 165 | 173 | #1092 | Hide Recordings? | `editable-checkbox` | `sess.hideRecs` | `saveSessField('hideRecs')` | `e-title="Hide Recordings?"` | `No` | no | If enabled, recordings will be hidden in archives | label (no class) | — |
| 166 | 174 | #1096 | Recording Reminder If Speaking? | `editable-checkbox` | `sess.recordingReminder` | `saveSessField('recordingReminder')` | `e-title="Recording Reminder If Speaking?"` | `No` | no | If enabled, will show recording reminder popup | label (no class) | — |
| 167 | 175 | #1100 | Show Recordings tab in the room? | `editable-checkbox` | `sess.recsInRoom` | `saveSessField('recsInRoom')` | `e-title="Show Recordings in the room?"` | `No` | no | If enabled, will show recordings tab in the room | label (no class) | — |
| 168 | 176 | #1104 | Disable download button for Recordings for users? | `editable-checkbox` | `sess.downloadRecordingsDisabled` | `saveSessField('downloadRecordingsDisabled')` | `e-title="Disable download button for Recordings for users?"` | `No` | no | If enabled, will disable download button for Recordings for users | label (no class) | — |
| 169 | 177 | #1108 | Disable Closed Captioning? | `editable-checkbox` | `sess.hasSpeechRecognitionDisabled` | `saveSessField('hasSpeechRecognitionDisabled')` | `e-title="Disable closed captioning?"` | `No` | no | If enabled, will disable closed captioning for the room | label (no class) | — |
| 170 | 178 | #1112 | Hide recordings info for users? | `editable-checkbox` | `sess.dontShowRecInfoToUsers` | `saveSessField('dontShowRecInfoToUsers')` | `e-title="Hide recordings info for users?"` | `No` | no | If enabled, will hide recording info for users | label (no class) | — |
| 171 | 179 | #1116 | Minutes of recording inactivity? | `editable-number` | `sess.runawayRecMinutes` | `saveSessField('runawayRecMinutes')` | `e-title="Minutes of recording inactivity?"` | `5` | no | Number of minutes to flag a recording if inactive (runaway). Leave at 0 to disable. | label.muted | — |
| 172 | 180 | #1120 | Auto stop recording if inactive? | `editable-checkbox` | `sess.runawayRecAutoKill` | `saveSessField('runawayRecAutoKill')` | `e-title="Auto stop recording if inactive?"` | `No` | no | If enabled, auto stop inactive recordings | label.muted | — |
| 173 | 181 | #1124 | Slack url to post | `editable-textarea` | `sess.runawayRecPostURL` | `saveSessField('runawayRecPostURL')` | `e-label="URL:"` | `empty` | **yes** | If set, it will post to this slack url when a recording is flagged as inactive (runaway) | label.muted | — |
| 174 | 182 | #1128 | Sticky give Mic/Cam? | `editable-checkbox` | `sess.stickyGiveMicAndCam` | `saveSessField('stickyGiveMicAndCam')` | `e-title="Sticky give Mic/Cam?"` | `No` | no | If enabled, when a presenter gives mic/cam, the setting will stick | label (no class) | — |
| 175 | 183 | #1132 | Overlay userID on screenshare? | `editable-checkbox` | `sess.overlayUserIdOnScreenshare` | `saveSessField('overlayUserIdOnScreenshare')` | `e-title="Overlay userID on screenshare?"` | `No` | no | If enabled, it will overlay userID on screenshare | label (no class) | — |
| 176 | 184 | #1136 | Auto give Mic/Screen to Users? | `editable-checkbox` | `sess.regUserCanPresent` | `saveSessField('regUserCanPresent')` | `e-title="Auto give mic/screen to Regular users?"` | `No` | no | If enabled, ALL regular users will  have mic/screenshare in the room. ***** CAREFULL ****** | label (no class) | — |
| 177 | 185 | #1140 | Don't stop on mute? | `editable-checkbox` | `sess.dontStopRecOnMicMute` | `saveSessField('dontStopRecOnMicMute')` | `e-title="Don't rec stop on mic mute?"` | `No` | no | Don't auto stop the rec on mic mute | label (no class) | — |
| 178 | 186 | #1144 | Individual Volume Controls? | `editable-checkbox` | `sess.individualVolumeControls` | `saveSessField('individualVolumeControls')` | `e-title="Individual Volume Controls?"` | `No` | no | Individual volume controls for each Presenter | label (no class) | — |
| 179 | 187 | #1148 | NEW recording procedure? | `editable-checkbox` | `sess.remote_recording` | `saveSessField('remote_recording')` | `e-title="New Rec?"` | `No` | no | new experimental serverside rec control, more reliable? | label (no class) | — |
| 180 | 188 | #1152 | Save Recs to AWS S3 | `editable-checkbox` | `sess.saveRecsToS3` | `saveSessField('saveRecsToS3')` | `e-title="Save Recordings to S3?"` | `No` | no | *(none in capture)* | — | — |
| 181 | 189 | #1154 | S3 Key ID/Name | `editable-text` | `sess.s3KeyID` | `saveSessField('s3KeyID')` | `e-label="S3 Key Name"` | `empty` | **yes** | *(none in capture)* | — | — |
| 182 | 190 | #1156 | S3 Key Secret | `editable-text` | `sess.s3KeySecret` | `saveSessField('s3KeySecret')` | `e-label="S3 Key Secret"` | `empty` | **yes** | *(none in capture)* | — | — |
| 183 | 191 | #1158 | S3 Bucket | `editable-text` | `sess.s3Bucket` | `saveSessField('s3Bucket')` | `e-label="S3 Bucket"` | `empty` | **yes** | *(none in capture)* | — | — |
| 184 | 192 | #1160 | S3 Bucket subfolder/path | `editable-text` | `sess.s3BucketFolderPath` | `saveSessField('s3BucketFolderPath')` | `e-label="S3 Bucket subfolder"` | `empty` | **yes** | *(none in capture)* | — | — |
| 185 | 194 | #1162 | Save Recs to Vimeo | `editable-checkbox` | `sess.saveRecsToVimeo` | `saveSessField('saveRecsToVimeo')` | `e-title="Save Recordings to saveRecsToVimeo?"` | `No` | no | *(none in capture)* | — | — |
| 186 | 195 | #1164 | Vimeo ClientID | `editable-text` | `sess.vimeoClientID` | `saveSessField('vimeoClientID')` | `e-label="Vimeo ClientID"` | `empty` | **yes** | *(none in capture)* | — | — |
| 187 | 196 | #1166 | Vimeo Secret | `editable-text` | `sess.vimeoClientSecret` | `saveSessField('vimeoClientSecret')` | `e-label="Vimeo Secret"` | `empty` | **yes** | *(none in capture)* | — | — |
| 188 | 197 | #1168 | Vimeo Token | `editable-text` | `sess.vimeoToken` | `saveSessField('vimeoToken')` | `e-label="Token"` | `empty` | **yes** | *(none in capture)* | — | — |
| 189 | 198 | #1170 | Vimeo Folder ID (optional) | `editable-text` | `sess.vimeoFolderPath` | `saveSessField('vimeoFolderPath')` | `e-label="Folder Path"` | `empty` | **yes** | *(none in capture)* | — | — |
| 190 | 199 | #1172 | Broadcast using OBS? | `editable-checkbox` | `sess.obsBroadcastRoom` | `saveSessField('obsBroadcastRoom')` | `e-title="Broadcast using OBS?"` | `No` | no | *(none in capture)* | — | — |
| 191 | 200 | #1174 | OBS Stream Key | `editable-text` | `sess.obsStreamKey` | `saveSessField('obsStreamKey')` | **(neither)** | `empty` | **yes** | *(none in capture)* | — | — |
| 192 | 201 | #1176 | OBS Stream Satus WebHook URL | `editable-text` | `sess.obsStreamSatusWebHookURL` | `saveSessField('obsStreamSatusWebHookURL')` | **(neither)** | `empty` | **yes** | *(none in capture)* | — | — |
| 193 | 202 | #1178 | Restream URL | `editable-text` | `sess.restreamToURL` | `saveSessField('restreamToURL')` | **(neither)** | `empty` | **yes** | *(none in capture)* | — | — |
| 194 | 203 | #1180 | Restream Key | `editable-text` | `sess.restreamToURLKey` | `saveSessField('restreamToURLKey')` | **(neither)** | `empty` | **yes** | *(none in capture)* | — | — |
| 195 | 205 | #1182 | Custom Rec Params | `editable-text` | `sess.x264_encArgs` | `saveSessField('x264_encArgs')` | `e-label="Rec Params"` | `empty` | **yes** | *(none in capture)* | — | — |
| 196 | 206 | #1184 | Twillio SID | `editable-text` | `sess.twillioApiSID` | `saveSessField('twillioApiSID')` | `e-label="Twillio SID"` | `empty` | **yes** | *(none in capture)* | — | — |
| 197 | 207 | #1186 | Twillio Token | `editable-text` | `sess.twillioApiToken` | `saveSessField('twillioApiToken')` | `e-label="Token SID"` | `empty` | **yes** | *(none in capture)* | — | — |
| 198 | 208 | #1188 | Twillio Phone | `editable-text` | `sess.twilioPhone` | `saveSessField('twilioPhone')` | `e-label="Token SID"` | `empty` | **yes** | *(none in capture)* | — | — |
| 199 | 209 | #1190 | Protexting Token | `editable-text` | `sess.protextingSecretTok` | `saveSessField('protextingSecretTok')` | `e-label="Token"` | `empty` | **yes** | *(none in capture)* | — | — |
| 200 | 210 | #1192 | Protexting GroupID | `editable-text` | `sess.protextingGroupIDs` | `saveSessField('protextingGroupIDs')` | `e-label="GroupIDs"` | `empty` | **yes** | *(none in capture)* | — | — |
| 201 | 211 | #1194 | Use h264 codec? | `editable-checkbox` | `sess.h264Enabled` | `saveSessField('h264Enabled')` | `e-title="Use h264 codec ?"` | `Yes!` | no | *(none in capture)* | — | — |
| 202 | 212 | #1196 | Use VP9 codec? | `editable-checkbox` | `sess.vp9Enabled` | `saveSessField('vp9Enabled')` | `e-title="Use VP9 codec ?"` | `No` | no | *(none in capture)* | — | — |
| 203 | 213 | #1198 | Use HQ Video? | `editable-checkbox` | `sess.hqVideo` | `saveSessField('hqVideo')` | `e-title="Use HQ Video ?"` | `No` | no | Experimental better vid quality on vp8 | label (no class) | — |
| 204 | 214 | #1201 | Custom Player URL | `editable-text` | `sess.customPlayerURL` | `saveSessField('customPlayerURL')` | `e-label="Custom Player URL"` | `empty` | **yes** | If set, it will always show an iframe with this url in the screens section | label.muted | — |
| 205 | 215 | #1205 | Iframe Cookie Fix? | `editable-checkbox` | `sess.iframeSSOTFix` | `saveSessField('iframeSSOTFix')` | `e-title="UIframe Cookie Fix ?"` | `No` | no | *(none in capture)* | — | — |
| 206 | 216 | #1207 | Autoreset sess at 12am? | `editable-checkbox` | `sess.autoResetSession` | `saveSessField('autoResetSession')` | `e-title="autoreset sess?"` | `No` | no | *(none in capture)* | — | — |
| 207 | 217 | #1209 | Don't Soft reset at 12am? | `editable-checkbox` | `sess.doNotAutoSoftReset` | `saveSessField('doNotAutoSoftReset')` | `e-title="Don't softreset sess?"` | `No` | no | Enable this to prevent media server soft reset each night... | SIBLING <label> at group index 218 (row <p> closed early) | — |
| 208 | 219 | #1211 | New FCM Method? | `editable-checkbox` | `sess.sendFcmAlertsNew` | `saveSessField('sendFcmAlertsNew')` | `e-title="new FCM method?"` | `No` | no | Use pub/sub for notifications — contains `<span style="text-decoration: underline">New FCM Method?</span>` (#1210), `<span style="text-decoration: underline">No</span>` (#1211) | bare text node on the row <p> | — |
| 209 | 220 | #1213 | PTR app exp days | `editable-number` | `sess.ptrMobileAppExpirePairCodeDays` | `saveSessField('ptrMobileAppExpirePairCodeDays')` | `e-title="PTR code expire:"` | `7` | no | If user does not log in from regular site, mobile app token will expire after this many days — contains `<span style="text-decoration: underline">PTR app exp days</span>` (#1212), `<span style="text-decoration: underline">7</span>` (#1213) | bare text node on the row <p> | — |
| 210 | 221 | #1215 | Push expire days | `editable-number` | `sess.mobileAppExpireNotificationsDays` | `saveSessField('mobileAppExpireNotificationsDays')` | `e-title="PUSH expire days:"` | `14` | no | If user does not log in this many days, we'll stop sending push notifications — contains `<span style="text-decoration: underline">Push expire days</span>` (#1214), `<span style="text-decoration: underline">14</span>` (#1215) | bare text node on the row <p> | — |
| 211 | 222 | #1217 | Custom Legal Disclosure | `editable-textarea` | `sess.customEnterDisclosure` | `saveSessField('customEnterDisclosure')` | `e-label="URL:"` | `empty` | **yes** | If set, Users will need to agree to thisDisclosure to enter. | label.muted | — |
| 212 | 223 | #1221 | Custom User Info Page | `editable-text` | `sess.customUserInfoURL` | `saveSessField('customUserInfoURL')` | `e-label="URL"` | `empty` | **yes** | *(none in capture)* | — | — |
| 213 | 224 | #1223 | Scheudle ID (GCal) | `editable-text` | `sess.stAppScheduleID` | `saveSessField('stAppScheduleID')` | `e-label="Goog Calendar ID"` | `empty` | **yes** | *(none in capture)* | — | — |
| 214 | 225 | #1225 | Invalid Tokens | `editable-textarea` | `sess.invalidTokens` | `saveSessField('invalidTokens')` | `e-label="Invalid Tokens:"` | `empty` | **yes** | Comma separated list of invalid JWT tokens. | label.muted | — |


### 5.1 The 12 non-field structural group-children

| Group index | `#index` | tag | class | own text (verbatim) | children | role |
|---|---|---|---|---|---|---|
| 0 | `#224` | `p` | `form-control-static` | *(none)* | `button#493` "Export Settings" (`ng-click="exportSettingsToJSON()"`, `<i class="fa fa-floppy-o" aria-hidden="true">` `#1349`, `::before content ""`), `button#494` "Load Settings From Room" (`ng-click="loadSettingsFromRoom()"`, `<i class="fa fa-plus" aria-hidden="true">` `#1350`, `::before content ""`) | toolbar at the top of the block |
| 3 | `#227` | `p` | *(none)* | *(none)* | *(none)* | empty spacer `<p>`; only style deviation `margin-bottom: 10px` |
| 4 | `#228` | `p` | `form-control-static` | *(none)* | `label#503` "Wordpress shortcode:", `span#504.ng-binding` | **read-only** value row (no x-editable). `#504` text: `[protradingroom room='6a628a99731b9f77ae9bf505' key='' link_text='Enter Room' mode='urlv3']` |
| 60 | `#284` | `div` | `ng-hide` (`ng-show="sess.hasAppPairLink && sess.pairSecretKey"`) | *(none)* | `br#717`, `label#718`, `input#719` | hidden pair-link helper. `#718` text: "Sample link you would need to use to add each user: (replace email/name with the real user email/name". `#719` = `<input type="text" class="form-control col-md-6" id="pairURLLink" readonly value="https://chat.protradingroom.com/ptr_app/sessions/v2/addUser/6a628a99731b9f77ae9bf505/?sec=&email=__userEmail__&name=__userName__">` |
| 62 | `#286` | `br` | — | *(none)* | *(none)* | belongs to row 61 (`pairOKRedirect`) — `<p>` closed early |
| 63 | `#287` | `label` | `muted` | "Where to send users if the pairing succeeds" | *(none)* | helper for row 61 |
| 65 | `#289` | `br` | — | *(none)* | *(none)* | belongs to row 64 (`pairErrorRedirect`) |
| 66 | `#290` | `label` | `muted` | "Where to send users if the pairing fails" | *(none)* | helper for row 64 |
| 139 | `#363` | `p` | `form-control-static` | *(none)* | `a#986.btn.btn-default` | link-button row: text "API POST Routes Docs", `target="_blank"`, `href="/public/html/api-docs.html?src=/public/html/POST_ROUTE_API_DOCUMENTATION.md"` |
| 193 | `#417` | `br` | — | *(none)* | *(none)* | spacer after the S3 block (rows 188–192) |
| 204 | `#428` | `br` | — | *(none)* | *(none)* | spacer after the OBS/restream block (rows 199–203) |
| 218 | `#442` | `label` | *(none)* | "Enable this to prevent media server soft reset each night..." | *(none)* | helper for row 217 (`doNotAutoSoftReset`) |

Two rows contain an **extra control** beside the editable, folded into the field table above:

* Row 138 (`apiSecret`) also holds `button#985.btn.btn-sm.btn-warning` `type="button"`
  `ng-click="generateNewApiSecret()"` text **"New Secret"** with `<i class="fa fa-random">` `#1354`
  (`::before` content `""`, `font-size: 12px`).
* Row 163 (`chatTabsWithBadges`) has the gear icon **inside its label**:
  `#1355` `<i class="fa fa-gear ms-2 cursor-pointer" title="Configure Chat Tabs"
  ng-click="openChatTabsWithBadgesEditor(sess.chatTabsWithBadges)">`
  (`::before` content `""`, `color: rgb(51, 51, 51)`, `font-family: FontAwesome`, `cursor: default`).

### 5.2 Conditionally-hidden rows (`ng-show`) in this piece

| Row | `#index` | `ng-show` | class at capture | computed |
|---|---|---|---|---|
| 1 | `#225` | `sess.authMode=='jwt'` | `form-control-static ng-hide` | `display: none` |
| 2 | `#226` | `sess.authMode=='jwt'` | `form-control-static ng-hide` | `display: none` |
| 5 | `#229` | `sess.authMode=='jwt'` | `form-control-static ng-hide` | `display: none` |
| 6 | `#230` | `sess.authMode=='webinarRoom' \|\| sess.allowPWLoginWithSSO` | `form-control-static ng-hide` | `display: none` |
| 7 | `#231` | `sess.authMode=='webinarRoom' \|\| sess.allowPWLoginWithSSO` | `form-control-static ng-hide` | `display: none` |
| 8 | `#232` | `sess.authMode=='webinarRoom' \|\| sess.allowPWLoginWithSSO` | `form-control-static ng-hide` | `display: none` |
| 9 | `#233` | `sess.authMode=='webinarRoom' \|\| sess.authMode=='unamePW' \|\| sess.allowPWLoginWithSSO` | `ng-hide` *(note: no `form-control-static`)* | `display: none` |
| 60 | `#284` | `sess.hasAppPairLink && sess.pairSecretKey` | `ng-hide` | `display: none` |
| 165 | `#389` | `sess.hasProfanityFilter` | `form-control-static ng-hide` | `display: none` |
| 166 | `#390` | `sess.hasProfanityFilter` | `form-control-static ng-hide` | `display: none` |

All ten are hidden in this capture, consistent with the captured values
(`allowPWLoginWithSSO=No`, `hasAppPairLink=No`, `pairSecretKey=empty`, `hasProfanityFilter=No`).
`sess.authMode` itself is **not** a field in this piece — its value is not captured anywhere in this
subtree (honest gap, §14).

---

## 6. Set-vs-unset summary — my own independent recount

Counted mechanically over the 214 editable `<a>` nodes under `r.0.1.1.0.1.3.1.5.0.0.`:

| `editable-*` type | count in **P21** |
|---|---|
| `editable-checkbox` | **123** |
| `editable-textarea` | **61** |
| `editable-text` | **26** |
| `editable-number` | **4** |
| `editable-select` | **0** |
| **total** | **214** |

**This does not match the prior-work figure of "181 fields (102 checkbox, 42 textarea, 33 text, 4 number)".**
Independent cross-check with a raw grep over the whole dump
(`grep -ho 'attr editable-[a-z]* = ' nodes-*.txt | sort | uniq -c`) gives, for the *entire* 2156-node
page: 141 `editable-checkbox`, 84 `editable-textarea`, 35 `editable-text`, 5 `editable-number`,
1 `editable-select`, 2 `editable-date`, 1 `editable-combodate`. Of those, **P21 holds 123/61/26/4** and
P22 holds 18/23/7/1 — i.e. the Settings tab as a whole holds **263** editables
(141 checkbox + 84 textarea + 33 text + 5 number; the remaining 2 `text`, the `select`, the 2 `date`
and the `combodate` are outside the Settings tab). The prior-work `text` count (33) matches the
tab-wide total; its checkbox/textarea counts do not match anything I can reproduce.

### 6.1 Set/unset

Criterion, taken straight from the DOM (no inference):
* checkbox → **set** iff rendered text is `Yes!`; **unset** iff `No`.
* text/textarea/number → **set** iff the `<a>` does **not** carry the `editable-empty` class.

| | count |
|---|---|
| **SET** | **14** |
| UNSET | 200 |
| — of which `editable-empty` class present | 86 |
| — of which checkbox rendering `No` | 114 |

`123 checkbox = 9 "Yes!" + 114 "No"`; `91 value fields = 5 set + 86 editable-empty`.

**The complete list of SET fields in P21:**

| Row | `#index` | Label | Bound | Type | **Captured value** |
|---|---|---|---|---|---|
| 5 | `#506` | Token Expiration | `sess.tokenExpiresIn` | textarea | **`1d`** |
| 24 | `#576` | Show Roster ? | `sess.rosterVisibleToViewers` | checkbox | **`Yes!`** |
| 30 | `#600` | Show Roster Count? | `sess.rosterCountVisibleToViewers` | checkbox | **`Yes!`** |
| 49 | `#676` | Q&A on Alerts? | `sess.hasQAOnAlerts` | checkbox | **`Yes!`** |
| 83 | `#789` | Send report email? | `sess.sendReportEmails` | checkbox | **`Yes!`** |
| 99 | `#851` | Archive Alerts? | `sess.archiveAlertsLog` | checkbox | **`Yes!`** |
| 100 | `#855` | Archive Chatlog? | `sess.archiveChatLog` | checkbox | **`Yes!`** |
| 103 | `#865` | Enable VideoPlayer? | `sess.enableVideoPlayer` | checkbox | **`Yes!`** |
| 146 | `#1000` | Tip Me Button Text | `sess.tipMeBtnTxt` | textarea | **`Tip Me?`** |
| 156 | `#1032` | OffTopic Channels/Tabs | `sess.hasChannelTabs` | checkbox | **`Yes!`** |
| 179 | `#1116` | Minutes of recording inactivity? | `sess.runawayRecMinutes` | number | **`5`** |
| 211 | `#1194` | Use h264 codec? | `sess.h264Enabled` | checkbox | **`Yes!`** |
| 220 | `#1213` | PTR app exp days | `sess.ptrMobileAppExpirePairCodeDays` | number | **`7`** |
| 221 | `#1215` | Push expire days | `sess.mobileAppExpireNotificationsDays` | number | **`14`** |

### 6.2 The one x-editable oddity you must reproduce

`#604` (`r.0.1.1.0.1.3.1.5.0.0.31.1`, `sess.simUserCount`, `editable-number`) carries
**`class="… editable-empty"` *and* renders the text `0`**, not the word `empty` — and because
`.editable-empty` also sets `font-style: italic`, that `0` renders **italic**. x-editable treats the
JS-falsy `0` as "empty" for the class but still prints the value. Any rebuild must reproduce
"italic `0`", not "italic `empty`" and not "upright `0`".
(The same pattern occurs once in P22 at `#1377`, `sess.superClusterExpectedServerCount`.)
Both are counted as **UNSET** above.

### 6.3 Read-only values that *are* populated (not x-editable, so excluded from the counts)

* `#504` (row 4) `<span class="ng-binding">` — `[protradingroom room='6a628a99731b9f77ae9bf505' key='' link_text='Enter Room' mode='urlv3']`
* `#719` (row 60) `<input id="pairURLLink" readonly>` `value="https://chat.protradingroom.com/ptr_app/sessions/v2/addUser/6a628a99731b9f77ae9bf505/?sec=&email=__userEmail__&name=__userName__"`

Both expose the room's internal id **`6a628a99731b9f77ae9bf505`**; both have an **empty** key/`sec=`
segment, consistent with `sess.pairSecretKey` = `empty` (row 59) and the shortcode `key=''`.

---

## 7. Node table — all 969 records of this piece

Path column is relative to the anchor `r.0.1.1.0.1.3.1.5.0.0` (`.` = the anchor itself).
"self `display:none`" = the record's own style-deviation list contains `display: none`
(every node here is *visually* hidden anyway, by the `display:none` on the ancestor `#102`).


| `#index` | path (relative to anchor) | tag | class attr | rect | self `display:none` |
|---|---|---|---|---|---|
| #186 | `.` | `div` | `form-group m0` | 0×0 @ (0,0) | — |
| #224 | `0` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #225 | `1` | `p` | `form-control-static ng-hide` | 0×0 @ (0,0) | YES |
| #226 | `2` | `p` | `form-control-static ng-hide` | 0×0 @ (0,0) | YES |
| #227 | `3` | `p` | — | 0×0 @ (0,0) | — |
| #228 | `4` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #229 | `5` | `p` | `form-control-static ng-hide` | 0×0 @ (0,0) | YES |
| #230 | `6` | `p` | `form-control-static ng-hide` | 0×0 @ (0,0) | YES |
| #231 | `7` | `p` | `form-control-static ng-hide` | 0×0 @ (0,0) | YES |
| #232 | `8` | `p` | `form-control-static ng-hide` | 0×0 @ (0,0) | YES |
| #233 | `9` | `p` | `ng-hide` | 0×0 @ (0,0) | YES |
| #234 | `10` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #235 | `11` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #236 | `12` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #237 | `13` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #238 | `14` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #239 | `15` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #240 | `16` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #241 | `17` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #242 | `18` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #243 | `19` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #244 | `20` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #245 | `21` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #246 | `22` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #247 | `23` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #248 | `24` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #249 | `25` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #250 | `26` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #251 | `27` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #252 | `28` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #253 | `29` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #254 | `30` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #255 | `31` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #256 | `32` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #257 | `33` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #258 | `34` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #259 | `35` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #260 | `36` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #261 | `37` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #262 | `38` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #263 | `39` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #264 | `40` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #265 | `41` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #266 | `42` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #267 | `43` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #268 | `44` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #269 | `45` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #270 | `46` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #271 | `47` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #272 | `48` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #273 | `49` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #274 | `50` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #275 | `51` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #276 | `52` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #277 | `53` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #278 | `54` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #279 | `55` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #280 | `56` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #281 | `57` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #282 | `58` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #283 | `59` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #284 | `60` | `div` | `ng-hide` | 0×0 @ (0,0) | YES |
| #285 | `61` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #286 | `62` | `br` | — | 0×0 @ (0,0) | — |
| #287 | `63` | `label` | `muted` | 0×0 @ (0,0) | — |
| #288 | `64` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #289 | `65` | `br` | — | 0×0 @ (0,0) | — |
| #290 | `66` | `label` | `muted` | 0×0 @ (0,0) | — |
| #291 | `67` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #292 | `68` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #293 | `69` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #294 | `70` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #295 | `71` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #296 | `72` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #297 | `73` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #298 | `74` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #299 | `75` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #300 | `76` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #301 | `77` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #302 | `78` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #303 | `79` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #304 | `80` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #305 | `81` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #306 | `82` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #307 | `83` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #308 | `84` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #309 | `85` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #310 | `86` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #311 | `87` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #312 | `88` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #313 | `89` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #314 | `90` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #315 | `91` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #316 | `92` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #317 | `93` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #318 | `94` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #319 | `95` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #320 | `96` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #321 | `97` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #322 | `98` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #323 | `99` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #324 | `100` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #325 | `101` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #326 | `102` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #327 | `103` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #328 | `104` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #329 | `105` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #330 | `106` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #331 | `107` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #332 | `108` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #333 | `109` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #334 | `110` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #335 | `111` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #336 | `112` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #337 | `113` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #338 | `114` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #339 | `115` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #340 | `116` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #341 | `117` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #342 | `118` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #343 | `119` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #344 | `120` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #345 | `121` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #346 | `122` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #347 | `123` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #348 | `124` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #349 | `125` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #350 | `126` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #351 | `127` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #352 | `128` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #353 | `129` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #354 | `130` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #355 | `131` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #356 | `132` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #357 | `133` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #358 | `134` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #359 | `135` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #360 | `136` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #361 | `137` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #362 | `138` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #363 | `139` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #364 | `140` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #365 | `141` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #366 | `142` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #367 | `143` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #368 | `144` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #369 | `145` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #370 | `146` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #371 | `147` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #372 | `148` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #373 | `149` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #374 | `150` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #375 | `151` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #376 | `152` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #377 | `153` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #378 | `154` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #379 | `155` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #380 | `156` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #381 | `157` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #382 | `158` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #383 | `159` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #384 | `160` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #385 | `161` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #386 | `162` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #387 | `163` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #388 | `164` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #389 | `165` | `p` | `form-control-static ng-hide` | 0×0 @ (0,0) | YES |
| #390 | `166` | `p` | `form-control-static ng-hide` | 0×0 @ (0,0) | YES |
| #391 | `167` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #392 | `168` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #393 | `169` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #394 | `170` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #395 | `171` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #396 | `172` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #397 | `173` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #398 | `174` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #399 | `175` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #400 | `176` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #401 | `177` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #402 | `178` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #403 | `179` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #404 | `180` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #405 | `181` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #406 | `182` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #407 | `183` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #408 | `184` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #409 | `185` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #410 | `186` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #411 | `187` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #412 | `188` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #413 | `189` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #414 | `190` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #415 | `191` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #416 | `192` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #417 | `193` | `br` | — | 0×0 @ (0,0) | — |
| #418 | `194` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #419 | `195` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #420 | `196` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #421 | `197` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #422 | `198` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #423 | `199` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #424 | `200` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #425 | `201` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #426 | `202` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #427 | `203` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #428 | `204` | `br` | — | 0×0 @ (0,0) | — |
| #429 | `205` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #430 | `206` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #431 | `207` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #432 | `208` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #433 | `209` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #434 | `210` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #435 | `211` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #436 | `212` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #437 | `213` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #438 | `214` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #439 | `215` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #440 | `216` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #441 | `217` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #442 | `218` | `label` | — | 0×0 @ (0,0) | — |
| #443 | `219` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #444 | `220` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #445 | `221` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #446 | `222` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #447 | `223` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #448 | `224` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #449 | `225` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #493 | `0.0` | `button` | `btn btn-md btn-info` | 0×0 @ (0,0) | — |
| #494 | `0.1` | `button` | `btn btn-md btn-info` | 0×0 @ (0,0) | — |
| #495 | `1.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #496 | `1.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #497 | `1.2` | `br` | — | 0×0 @ (0,0) | — |
| #498 | `1.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #499 | `2.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #500 | `2.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #501 | `2.2` | `br` | — | 0×0 @ (0,0) | — |
| #502 | `2.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #503 | `4.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #504 | `4.1` | `span` | `ng-binding` | 0×0 @ (0,0) | — |
| #505 | `5.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #506 | `5.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #507 | `5.2` | `br` | — | 0×0 @ (0,0) | — |
| #508 | `5.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #509 | `6.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #510 | `6.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #511 | `6.2` | `br` | — | 0×0 @ (0,0) | — |
| #512 | `6.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #513 | `7.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #514 | `7.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #515 | `7.2` | `br` | — | 0×0 @ (0,0) | — |
| #516 | `7.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #517 | `8.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #518 | `8.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #519 | `8.2` | `br` | — | 0×0 @ (0,0) | — |
| #520 | `8.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #521 | `9.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #522 | `9.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #523 | `9.2` | `br` | — | 0×0 @ (0,0) | — |
| #524 | `9.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #525 | `10.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #526 | `10.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #527 | `10.2` | `br` | — | 0×0 @ (0,0) | — |
| #528 | `10.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #529 | `11.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #530 | `11.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #531 | `11.2` | `br` | — | 0×0 @ (0,0) | — |
| #532 | `11.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #533 | `12.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #534 | `12.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #535 | `12.2` | `br` | — | 0×0 @ (0,0) | — |
| #536 | `12.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #537 | `13.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #538 | `13.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #539 | `13.2` | `br` | — | 0×0 @ (0,0) | — |
| #540 | `13.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #541 | `14.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #542 | `14.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #543 | `15.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #544 | `15.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #545 | `15.2` | `br` | — | 0×0 @ (0,0) | — |
| #546 | `15.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #547 | `16.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #548 | `16.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #549 | `17.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #550 | `17.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #551 | `18.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #552 | `18.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #553 | `18.2` | `br` | — | 0×0 @ (0,0) | — |
| #554 | `18.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #555 | `19.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #556 | `19.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #557 | `19.2` | `br` | — | 0×0 @ (0,0) | — |
| #558 | `19.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #559 | `20.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #560 | `20.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #561 | `20.2` | `br` | — | 0×0 @ (0,0) | — |
| #562 | `20.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #563 | `21.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #564 | `21.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #565 | `21.2` | `br` | — | 0×0 @ (0,0) | — |
| #566 | `21.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #567 | `22.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #568 | `22.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #569 | `22.2` | `br` | — | 0×0 @ (0,0) | — |
| #570 | `22.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #571 | `23.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #572 | `23.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #573 | `23.2` | `br` | — | 0×0 @ (0,0) | — |
| #574 | `23.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #575 | `24.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #576 | `24.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #577 | `24.2` | `br` | — | 0×0 @ (0,0) | — |
| #578 | `24.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #579 | `25.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #580 | `25.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #581 | `25.2` | `br` | — | 0×0 @ (0,0) | — |
| #582 | `25.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #583 | `26.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #584 | `26.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #585 | `26.2` | `br` | — | 0×0 @ (0,0) | — |
| #586 | `26.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #587 | `27.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #588 | `27.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #589 | `27.2` | `br` | — | 0×0 @ (0,0) | — |
| #590 | `27.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #591 | `28.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #592 | `28.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #593 | `28.2` | `br` | — | 0×0 @ (0,0) | — |
| #594 | `28.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #595 | `29.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #596 | `29.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #597 | `29.2` | `br` | — | 0×0 @ (0,0) | — |
| #598 | `29.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #599 | `30.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #600 | `30.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #601 | `30.2` | `br` | — | 0×0 @ (0,0) | — |
| #602 | `30.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #603 | `31.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #604 | `31.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #605 | `31.2` | `br` | — | 0×0 @ (0,0) | — |
| #606 | `31.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #607 | `32.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #608 | `32.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #609 | `32.2` | `br` | — | 0×0 @ (0,0) | — |
| #610 | `32.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #611 | `33.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #612 | `33.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #613 | `33.2` | `br` | — | 0×0 @ (0,0) | — |
| #614 | `33.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #615 | `34.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #616 | `34.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #617 | `34.2` | `br` | — | 0×0 @ (0,0) | — |
| #618 | `34.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #619 | `35.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #620 | `35.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #621 | `35.2` | `br` | — | 0×0 @ (0,0) | — |
| #622 | `35.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #623 | `36.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #624 | `36.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #625 | `36.2` | `br` | — | 0×0 @ (0,0) | — |
| #626 | `36.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #627 | `37.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #628 | `37.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #629 | `37.2` | `br` | — | 0×0 @ (0,0) | — |
| #630 | `37.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #631 | `38.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #632 | `38.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #633 | `38.2` | `br` | — | 0×0 @ (0,0) | — |
| #634 | `38.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #635 | `39.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #636 | `39.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #637 | `39.2` | `br` | — | 0×0 @ (0,0) | — |
| #638 | `39.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #639 | `40.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #640 | `40.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #641 | `40.2` | `br` | — | 0×0 @ (0,0) | — |
| #642 | `40.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #643 | `41.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #644 | `41.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #645 | `41.2` | `br` | — | 0×0 @ (0,0) | — |
| #646 | `41.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #647 | `42.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #648 | `42.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #649 | `42.2` | `br` | — | 0×0 @ (0,0) | — |
| #650 | `42.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #651 | `43.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #652 | `43.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #653 | `43.2` | `br` | — | 0×0 @ (0,0) | — |
| #654 | `43.3` | `label` | — | 0×0 @ (0,0) | — |
| #655 | `44.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #656 | `44.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #657 | `44.2` | `br` | — | 0×0 @ (0,0) | — |
| #658 | `44.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #659 | `45.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #660 | `45.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #661 | `45.2` | `br` | — | 0×0 @ (0,0) | — |
| #662 | `45.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #663 | `46.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #664 | `46.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #665 | `46.2` | `br` | — | 0×0 @ (0,0) | — |
| #666 | `46.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #667 | `47.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #668 | `47.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #669 | `47.2` | `br` | — | 0×0 @ (0,0) | — |
| #670 | `47.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #671 | `48.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #672 | `48.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #673 | `48.2` | `br` | — | 0×0 @ (0,0) | — |
| #674 | `48.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #675 | `49.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #676 | `49.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #677 | `49.2` | `br` | — | 0×0 @ (0,0) | — |
| #678 | `49.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #679 | `50.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #680 | `50.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #681 | `50.2` | `br` | — | 0×0 @ (0,0) | — |
| #682 | `50.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #683 | `51.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #684 | `51.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #685 | `51.2` | `br` | — | 0×0 @ (0,0) | — |
| #686 | `51.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #687 | `52.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #688 | `52.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #689 | `52.2` | `br` | — | 0×0 @ (0,0) | — |
| #690 | `52.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #691 | `53.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #692 | `53.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #693 | `53.2` | `br` | — | 0×0 @ (0,0) | — |
| #694 | `53.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #695 | `54.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #696 | `54.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #697 | `54.2` | `br` | — | 0×0 @ (0,0) | — |
| #698 | `54.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #699 | `55.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #700 | `55.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #701 | `55.2` | `br` | — | 0×0 @ (0,0) | — |
| #702 | `55.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #703 | `56.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #704 | `56.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #705 | `56.2` | `br` | — | 0×0 @ (0,0) | — |
| #706 | `56.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #707 | `57.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #708 | `57.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #709 | `57.2` | `br` | — | 0×0 @ (0,0) | — |
| #710 | `57.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #711 | `58.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #712 | `58.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #713 | `58.2` | `br` | — | 0×0 @ (0,0) | — |
| #714 | `58.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #715 | `59.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #716 | `59.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #717 | `60.0` | `br` | — | 0×0 @ (0,0) | — |
| #718 | `60.1` | `label` | — | 0×0 @ (0,0) | — |
| #719 | `60.2#pairURLLink` | `input` | `form-control col-md-6` | 0×0 @ (0,0) | — |
| #720 | `61.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #721 | `61.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #722 | `64.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #723 | `64.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #724 | `67.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #725 | `67.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #726 | `67.2` | `br` | — | 0×0 @ (0,0) | — |
| #727 | `67.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #728 | `68.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #729 | `68.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #730 | `68.2` | `br` | — | 0×0 @ (0,0) | — |
| #731 | `68.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #732 | `69.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #733 | `69.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #734 | `69.2` | `br` | — | 0×0 @ (0,0) | — |
| #735 | `69.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #736 | `70.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #737 | `70.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #738 | `70.2` | `br` | — | 0×0 @ (0,0) | — |
| #739 | `70.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #740 | `71.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #741 | `71.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #742 | `71.2` | `br` | — | 0×0 @ (0,0) | — |
| #743 | `71.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #744 | `72.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #745 | `72.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #746 | `72.2` | `br` | — | 0×0 @ (0,0) | — |
| #747 | `72.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #748 | `73.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #749 | `73.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #750 | `73.2` | `br` | — | 0×0 @ (0,0) | — |
| #751 | `73.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #752 | `74.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #753 | `74.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #754 | `74.2` | `br` | — | 0×0 @ (0,0) | — |
| #755 | `74.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #756 | `75.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #757 | `75.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #758 | `75.2` | `br` | — | 0×0 @ (0,0) | — |
| #759 | `75.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #760 | `76.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #761 | `76.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #762 | `76.2` | `br` | — | 0×0 @ (0,0) | — |
| #763 | `76.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #764 | `77.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #765 | `77.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #766 | `77.2` | `br` | — | 0×0 @ (0,0) | — |
| #767 | `77.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #768 | `78.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #769 | `78.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #770 | `78.2` | `br` | — | 0×0 @ (0,0) | — |
| #771 | `78.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #772 | `79.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #773 | `79.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #774 | `79.2` | `br` | — | 0×0 @ (0,0) | — |
| #775 | `79.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #776 | `80.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #777 | `80.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #778 | `80.2` | `br` | — | 0×0 @ (0,0) | — |
| #779 | `80.3` | `label` | — | 0×0 @ (0,0) | — |
| #780 | `81.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #781 | `81.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #782 | `81.2` | `br` | — | 0×0 @ (0,0) | — |
| #783 | `81.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #784 | `82.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #785 | `82.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #786 | `82.2` | `br` | — | 0×0 @ (0,0) | — |
| #787 | `82.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #788 | `83.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #789 | `83.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #790 | `83.2` | `br` | — | 0×0 @ (0,0) | — |
| #791 | `83.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #792 | `84.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #793 | `84.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #794 | `84.2` | `br` | — | 0×0 @ (0,0) | — |
| #795 | `84.3` | `label` | — | 0×0 @ (0,0) | — |
| #796 | `85.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #797 | `85.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #798 | `85.2` | `br` | — | 0×0 @ (0,0) | — |
| #799 | `85.3` | `label` | — | 0×0 @ (0,0) | — |
| #800 | `86.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #801 | `86.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #802 | `86.2` | `br` | — | 0×0 @ (0,0) | — |
| #803 | `86.3` | `label` | — | 0×0 @ (0,0) | — |
| #804 | `87.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #805 | `87.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #806 | `87.2` | `br` | — | 0×0 @ (0,0) | — |
| #807 | `87.3` | `label` | — | 0×0 @ (0,0) | — |
| #808 | `88.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #809 | `88.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #810 | `88.2` | `br` | — | 0×0 @ (0,0) | — |
| #811 | `88.3` | `label` | — | 0×0 @ (0,0) | — |
| #812 | `89.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #813 | `89.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #814 | `89.2` | `br` | — | 0×0 @ (0,0) | — |
| #815 | `89.3` | `label` | — | 0×0 @ (0,0) | — |
| #816 | `90.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #817 | `90.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #818 | `91.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #819 | `91.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #820 | `91.2` | `br` | — | 0×0 @ (0,0) | — |
| #821 | `91.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #822 | `92.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #823 | `92.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #824 | `92.2` | `br` | — | 0×0 @ (0,0) | — |
| #825 | `92.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #826 | `93.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #827 | `93.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #828 | `93.2` | `br` | — | 0×0 @ (0,0) | — |
| #829 | `93.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #830 | `94.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #831 | `94.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #832 | `94.2` | `br` | — | 0×0 @ (0,0) | — |
| #833 | `94.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #834 | `95.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #835 | `95.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #836 | `95.2` | `br` | — | 0×0 @ (0,0) | — |
| #837 | `95.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #838 | `96.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #839 | `96.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #840 | `96.2` | `br` | — | 0×0 @ (0,0) | — |
| #841 | `96.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #842 | `97.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #843 | `97.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #844 | `97.2` | `br` | — | 0×0 @ (0,0) | — |
| #845 | `97.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #846 | `98.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #847 | `98.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #848 | `98.2` | `br` | — | 0×0 @ (0,0) | — |
| #849 | `98.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #850 | `99.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #851 | `99.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #852 | `99.2` | `br` | — | 0×0 @ (0,0) | — |
| #853 | `99.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #854 | `100.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #855 | `100.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #856 | `101.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #857 | `101.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #858 | `101.2` | `br` | — | 0×0 @ (0,0) | — |
| #859 | `101.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #860 | `102.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #861 | `102.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #862 | `102.2` | `br` | — | 0×0 @ (0,0) | — |
| #863 | `102.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #864 | `103.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #865 | `103.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #866 | `103.2` | `br` | — | 0×0 @ (0,0) | — |
| #867 | `103.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #868 | `104.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #869 | `104.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #870 | `104.2` | `br` | — | 0×0 @ (0,0) | — |
| #871 | `104.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #872 | `105.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #873 | `105.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #874 | `105.2` | `br` | — | 0×0 @ (0,0) | — |
| #875 | `105.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #876 | `106.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #877 | `106.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #878 | `106.2` | `br` | — | 0×0 @ (0,0) | — |
| #879 | `106.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #880 | `107.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #881 | `107.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #882 | `107.2` | `br` | — | 0×0 @ (0,0) | — |
| #883 | `107.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #884 | `108.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #885 | `108.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #886 | `108.2` | `br` | — | 0×0 @ (0,0) | — |
| #887 | `108.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #888 | `109.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #889 | `109.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #890 | `109.2` | `br` | — | 0×0 @ (0,0) | — |
| #891 | `109.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #892 | `110.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #893 | `110.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #894 | `110.2` | `br` | — | 0×0 @ (0,0) | — |
| #895 | `110.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #896 | `111.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #897 | `111.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #898 | `111.2` | `br` | — | 0×0 @ (0,0) | — |
| #899 | `111.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #900 | `112.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #901 | `112.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #902 | `112.2` | `br` | — | 0×0 @ (0,0) | — |
| #903 | `112.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #904 | `113.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #905 | `113.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #906 | `113.2` | `br` | — | 0×0 @ (0,0) | — |
| #907 | `113.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #908 | `114.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #909 | `114.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #910 | `114.2` | `br` | — | 0×0 @ (0,0) | — |
| #911 | `114.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #912 | `115.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #913 | `115.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #914 | `115.2` | `br` | — | 0×0 @ (0,0) | — |
| #915 | `115.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #916 | `116.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #917 | `116.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #918 | `116.2` | `br` | — | 0×0 @ (0,0) | — |
| #919 | `116.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #920 | `117.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #921 | `117.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #922 | `117.2` | `br` | — | 0×0 @ (0,0) | — |
| #923 | `117.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #924 | `118.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #925 | `118.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #926 | `118.2` | `br` | — | 0×0 @ (0,0) | — |
| #927 | `118.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #928 | `119.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #929 | `119.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #930 | `119.2` | `br` | — | 0×0 @ (0,0) | — |
| #931 | `119.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #932 | `120.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #933 | `120.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #934 | `120.2` | `br` | — | 0×0 @ (0,0) | — |
| #935 | `120.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #936 | `121.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #937 | `121.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #938 | `121.2` | `br` | — | 0×0 @ (0,0) | — |
| #939 | `121.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #940 | `122.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #941 | `122.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #942 | `122.2` | `br` | — | 0×0 @ (0,0) | — |
| #943 | `122.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #944 | `123.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #945 | `123.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #946 | `124.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #947 | `124.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #948 | `125.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #949 | `125.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #950 | `126.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #951 | `126.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #952 | `126.2` | `br` | — | 0×0 @ (0,0) | — |
| #953 | `126.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #954 | `127.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #955 | `127.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #956 | `127.2` | `br` | — | 0×0 @ (0,0) | — |
| #957 | `127.3` | `label` | — | 0×0 @ (0,0) | — |
| #958 | `128.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #959 | `128.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #960 | `128.2` | `br` | — | 0×0 @ (0,0) | — |
| #961 | `128.3` | `label` | — | 0×0 @ (0,0) | — |
| #962 | `129.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #963 | `129.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #964 | `130.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #965 | `130.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #966 | `131.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #967 | `131.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #968 | `132.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #969 | `132.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #970 | `133.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #971 | `133.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #972 | `134.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #973 | `134.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #974 | `134.2` | `br` | — | 0×0 @ (0,0) | — |
| #975 | `134.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #976 | `135.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #977 | `135.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #978 | `136.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #979 | `136.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #980 | `137.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #981 | `137.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #982 | `137.2` | `label` | — | 0×0 @ (0,0) | — |
| #983 | `138.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #984 | `138.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #985 | `138.2` | `button` | `btn btn-sm btn-warning` | 0×0 @ (0,0) | — |
| #986 | `139.0` | `a` | `btn btn-default` | 0×0 @ (0,0) | — |
| #987 | `140.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #988 | `140.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #989 | `141.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #990 | `141.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #991 | `142.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #992 | `142.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #993 | `143.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #994 | `143.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #995 | `144.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #996 | `144.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #997 | `145.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #998 | `145.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #999 | `146.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1000 | `146.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1001 | `147.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1002 | `147.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1003 | `148.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1004 | `148.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1005 | `149.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1006 | `149.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1007 | `149.2` | `br` | — | 0×0 @ (0,0) | — |
| #1008 | `149.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1009 | `150.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1010 | `150.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1011 | `150.2` | `br` | — | 0×0 @ (0,0) | — |
| #1012 | `150.3` | `label` | — | 0×0 @ (0,0) | — |
| #1013 | `151.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1014 | `151.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1015 | `151.2` | `br` | — | 0×0 @ (0,0) | — |
| #1016 | `151.3` | `label` | — | 0×0 @ (0,0) | — |
| #1017 | `152.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1018 | `152.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1019 | `152.2` | `br` | — | 0×0 @ (0,0) | — |
| #1020 | `152.3` | `label` | — | 0×0 @ (0,0) | — |
| #1021 | `153.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1022 | `153.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1023 | `153.2` | `br` | — | 0×0 @ (0,0) | — |
| #1024 | `153.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1025 | `154.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1026 | `154.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1027 | `155.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1028 | `155.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1029 | `155.2` | `br` | — | 0×0 @ (0,0) | — |
| #1030 | `155.3` | `label` | — | 0×0 @ (0,0) | — |
| #1031 | `156.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1032 | `156.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1033 | `156.2` | `br` | — | 0×0 @ (0,0) | — |
| #1034 | `156.3` | `label` | — | 0×0 @ (0,0) | — |
| #1035 | `157.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1036 | `157.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1037 | `157.2` | `br` | — | 0×0 @ (0,0) | — |
| #1038 | `157.3` | `label` | — | 0×0 @ (0,0) | — |
| #1039 | `158.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1040 | `158.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1041 | `158.2` | `br` | — | 0×0 @ (0,0) | — |
| #1042 | `158.3` | `label` | — | 0×0 @ (0,0) | — |
| #1043 | `159.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1044 | `159.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1045 | `159.2` | `br` | — | 0×0 @ (0,0) | — |
| #1046 | `159.3` | `label` | — | 0×0 @ (0,0) | — |
| #1047 | `160.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1048 | `160.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1049 | `160.2` | `br` | — | 0×0 @ (0,0) | — |
| #1050 | `160.3` | `label` | — | 0×0 @ (0,0) | — |
| #1051 | `161.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1052 | `161.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1053 | `161.2` | `br` | — | 0×0 @ (0,0) | — |
| #1054 | `161.3` | `label` | — | 0×0 @ (0,0) | — |
| #1055 | `162.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1056 | `162.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1057 | `162.2` | `br` | — | 0×0 @ (0,0) | — |
| #1058 | `162.3` | `label` | — | 0×0 @ (0,0) | — |
| #1059 | `163.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1060 | `163.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1061 | `163.2` | `br` | — | 0×0 @ (0,0) | — |
| #1062 | `163.3` | `label` | — | 0×0 @ (0,0) | — |
| #1063 | `164.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1064 | `164.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1065 | `164.2` | `br` | — | 0×0 @ (0,0) | — |
| #1066 | `164.3` | `label` | — | 0×0 @ (0,0) | — |
| #1067 | `165.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1068 | `165.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1069 | `165.2` | `label` | — | 0×0 @ (0,0) | — |
| #1070 | `166.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1071 | `166.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1072 | `166.2` | `label` | — | 0×0 @ (0,0) | — |
| #1073 | `167.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1074 | `167.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1075 | `167.2` | `br` | — | 0×0 @ (0,0) | — |
| #1076 | `167.3` | `label` | — | 0×0 @ (0,0) | — |
| #1077 | `168.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1078 | `168.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1079 | `168.2` | `br` | — | 0×0 @ (0,0) | — |
| #1080 | `168.3` | `label` | — | 0×0 @ (0,0) | — |
| #1081 | `169.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1082 | `169.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1083 | `169.2` | `br` | — | 0×0 @ (0,0) | — |
| #1084 | `169.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1085 | `170.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1086 | `170.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1087 | `171.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1088 | `171.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1089 | `172.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1090 | `172.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1091 | `173.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1092 | `173.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1093 | `173.2` | `br` | — | 0×0 @ (0,0) | — |
| #1094 | `173.3` | `label` | — | 0×0 @ (0,0) | — |
| #1095 | `174.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1096 | `174.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1097 | `174.2` | `br` | — | 0×0 @ (0,0) | — |
| #1098 | `174.3` | `label` | — | 0×0 @ (0,0) | — |
| #1099 | `175.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1100 | `175.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1101 | `175.2` | `br` | — | 0×0 @ (0,0) | — |
| #1102 | `175.3` | `label` | — | 0×0 @ (0,0) | — |
| #1103 | `176.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1104 | `176.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1105 | `176.2` | `br` | — | 0×0 @ (0,0) | — |
| #1106 | `176.3` | `label` | — | 0×0 @ (0,0) | — |
| #1107 | `177.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1108 | `177.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1109 | `177.2` | `br` | — | 0×0 @ (0,0) | — |
| #1110 | `177.3` | `label` | — | 0×0 @ (0,0) | — |
| #1111 | `178.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1112 | `178.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1113 | `178.2` | `br` | — | 0×0 @ (0,0) | — |
| #1114 | `178.3` | `label` | — | 0×0 @ (0,0) | — |
| #1115 | `179.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1116 | `179.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1117 | `179.2` | `br` | — | 0×0 @ (0,0) | — |
| #1118 | `179.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1119 | `180.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1120 | `180.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1121 | `180.2` | `br` | — | 0×0 @ (0,0) | — |
| #1122 | `180.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1123 | `181.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1124 | `181.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1125 | `181.2` | `br` | — | 0×0 @ (0,0) | — |
| #1126 | `181.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1127 | `182.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1128 | `182.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1129 | `182.2` | `br` | — | 0×0 @ (0,0) | — |
| #1130 | `182.3` | `label` | — | 0×0 @ (0,0) | — |
| #1131 | `183.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1132 | `183.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1133 | `183.2` | `br` | — | 0×0 @ (0,0) | — |
| #1134 | `183.3` | `label` | — | 0×0 @ (0,0) | — |
| #1135 | `184.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1136 | `184.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1137 | `184.2` | `br` | — | 0×0 @ (0,0) | — |
| #1138 | `184.3` | `label` | — | 0×0 @ (0,0) | — |
| #1139 | `185.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1140 | `185.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1141 | `185.2` | `br` | — | 0×0 @ (0,0) | — |
| #1142 | `185.3` | `label` | — | 0×0 @ (0,0) | — |
| #1143 | `186.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1144 | `186.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1145 | `186.2` | `br` | — | 0×0 @ (0,0) | — |
| #1146 | `186.3` | `label` | — | 0×0 @ (0,0) | — |
| #1147 | `187.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1148 | `187.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1149 | `187.2` | `br` | — | 0×0 @ (0,0) | — |
| #1150 | `187.3` | `label` | — | 0×0 @ (0,0) | — |
| #1151 | `188.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1152 | `188.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1153 | `189.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1154 | `189.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1155 | `190.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1156 | `190.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1157 | `191.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1158 | `191.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1159 | `192.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1160 | `192.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1161 | `194.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1162 | `194.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1163 | `195.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1164 | `195.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1165 | `196.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1166 | `196.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1167 | `197.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1168 | `197.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1169 | `198.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1170 | `198.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1171 | `199.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1172 | `199.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1173 | `200.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1174 | `200.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1175 | `201.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1176 | `201.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1177 | `202.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1178 | `202.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1179 | `203.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1180 | `203.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1181 | `205.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1182 | `205.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1183 | `206.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1184 | `206.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1185 | `207.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1186 | `207.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1187 | `208.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1188 | `208.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1189 | `209.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1190 | `209.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1191 | `210.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1192 | `210.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1193 | `211.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1194 | `211.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1195 | `212.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1196 | `212.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1197 | `213.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1198 | `213.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1199 | `213.2` | `label` | — | 0×0 @ (0,0) | — |
| #1200 | `214.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1201 | `214.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1202 | `214.2` | `br` | — | 0×0 @ (0,0) | — |
| #1203 | `214.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1204 | `215.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1205 | `215.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1206 | `216.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1207 | `216.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1208 | `217.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1209 | `217.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1210 | `219.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1211 | `219.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1212 | `220.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1213 | `220.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1214 | `221.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1215 | `221.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1216 | `222.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1217 | `222.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1218 | `222.2` | `br` | — | 0×0 @ (0,0) | — |
| #1219 | `222.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1220 | `223.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1221 | `223.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1222 | `224.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1223 | `224.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1224 | `225.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1225 | `225.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1226 | `225.2` | `br` | — | 0×0 @ (0,0) | — |
| #1227 | `225.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1349 | `0.0.0` | `i` | `fa fa-floppy-o` | 0×0 @ (0,0) | — |
| #1350 | `0.1.0` | `i` | `fa fa-plus` | 0×0 @ (0,0) | — |
| #1351 | `6.3.0` | `span` | — | 0×0 @ (0,0) | — |
| #1352 | `6.3.1` | `span` | — | 0×0 @ (0,0) | — |
| #1353 | `9.3.0` | `span` | — | 0×0 @ (0,0) | — |
| #1354 | `138.2.0` | `i` | `fa fa-random` | 0×0 @ (0,0) | — |
| #1355 | `163.0.0` | `i` | `fa fa-gear ms-2 cursor-pointer` | 0×0 @ (0,0) | — |


---

## 8. Resolved computed style — ABSOLUTE values

`DEFAULTS.txt` is the COMMON table; node records print only deviations. Every value below is the
**resolved absolute** value = COMMON overridden by that node's deviations. Nothing is a default I
assumed; each column is one real node.


| property | `label.col-sm-2.control-label` (#495) | `a.editable.editable-click` — value SET (#506) | `a.editable.editable-click.editable-empty` (#496) | `label.muted` helper (#498) | `label` helper, no class (#654) | `p.form-control-static` row (#225) | `br` (#497) |
|---|---|---|---|---|---|---|---|
| `display` | `block` | `inline` | `inline` | `inline-block` | `inline-block` | `none` | `inline` |
| `float` | `left` | `none` | `none` | `none` | `none` | `none` | `none` |
| `position` | `relative` | `static` | `static` | `static` | `static` | `static` | `static` |
| `width` | `16.6667%` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` |
| `max-width` | `100%` | `none` | `none` | `100%` | `100%` | `none` | `none` |
| `min-height` | `1px` | `0px` | `0px` | `0px` | `0px` | `34px` | `0px` |
| `margin-top` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `margin-right` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `margin-bottom` | `5px` | `0px` | `0px` | `5px` | `5px` | `0px` | `0px` |
| `margin-left` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `padding-top` | `0px` | `0px` | `0px` | `0px` | `0px` | `7px` | `0px` |
| `padding-right` | `15px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `padding-bottom` | `0px` | `0px` | `0px` | `0px` | `0px` | `7px` | `0px` |
| `padding-left` | `15px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `border-top-width` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `border-right-width` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `border-bottom-width` | `0px` | `1px` | `1px` | `0px` | `0px` | `0px` | `0px` |
| `border-left-width` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `border-top-style` | `none` | `none` | `none` | `none` | `none` | `none` | `none` |
| `border-right-style` | `none` | `none` | `none` | `none` | `none` | `none` | `none` |
| `border-bottom-style` | `none` | `dashed` | `dashed` | `none` | `none` | `none` | `none` |
| `border-left-style` | `none` | `none` | `none` | `none` | `none` | `none` | `none` |
| `border-top-color` | `rgb(51, 51, 51)` | `rgb(10, 10, 10)` | `rgb(10, 10, 10)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` |
| `border-right-color` | `rgb(51, 51, 51)` | `rgb(10, 10, 10)` | `rgb(10, 10, 10)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` |
| `border-bottom-color` | `rgb(51, 51, 51)` | `rgb(66, 139, 202)` | `rgb(66, 139, 202)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` |
| `border-left-color` | `rgb(51, 51, 51)` | `rgb(10, 10, 10)` | `rgb(10, 10, 10)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` |
| `background-color` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` |
| `color` | `rgb(51, 51, 51)` | `rgb(10, 10, 10)` | `rgb(10, 10, 10)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` |
| `font-family` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| `font-size` | `14px` | `14px` | `14px` | `14px` | `14px` | `14px` | `14px` |
| `font-weight` | `700` | `400` | `400` | `700` | `700` | `400` | `400` |
| `font-style` | `normal` | `normal` | `italic` | `normal` | `normal` | `normal` | `normal` |
| `line-height` | `20px` | `20px` | `20px` | `20px` | `20px` | `20px` | `20px` |
| `text-align` | `start` | `start` | `start` | `start` | `start` | `start` | `start` |
| `text-decoration-line` | `none` | `none` | `none` | `none` | `none` | `none` | `none` |
| `vertical-align` | `baseline` | `baseline` | `baseline` | `baseline` | `baseline` | `baseline` | `baseline` |
| `white-space` | `normal` | `normal` | `normal` | `normal` | `normal` | `normal` | `normal` |
| `box-sizing` | `border-box` | `border-box` | `border-box` | `border-box` | `border-box` | `border-box` | `border-box` |
| `cursor` | `default` | `pointer` | `pointer` | `default` | `default` | `auto` | `auto` |
| `user-select` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` |
| `opacity` | `1` | `1` | `1` | `1` | `1` | `1` | `1` |
| `visibility` | `visible` | `visible` | `visible` | `visible` | `visible` | `visible` | `visible` |



Verification of the prior-work claim: the x-editable link is **`color: rgb(10, 10, 10)`** with
**`border-bottom: 1px dashed rgb(66, 139, 202)`**, `cursor: pointer`, `display: inline`, and
**`font-style: italic` only when `.editable-empty` is present** — **CONFIRMED**, exactly.
Note the other three border colours resolve to `rgb(10, 10, 10)` (they inherit the `color`), but their
widths are `0px` and styles `none`, so only the bottom edge paints.

**Uniformity proof.** Grouping all 1201 records of the Settings tab by `(tag, class, full deviation list)`
yields only **34 distinct signatures**. The three archetypes are perfectly uniform across the whole tab:

| signature | instances | any variation? |
|---|---|---|
| `label.col-sm-2.control-label` | **264** | none — all 264 share one identical deviation list |
| `a.ng-scope.ng-binding.editable.editable-click` (value set) | **149** | none |
| `a.…editable-click.editable-empty` | **114** | none (adds only `font-style: italic`) |
| `label.muted` | **136** | none |
| `label` (no class) | **43** | none — **identical to `label.muted`** |
| `p.form-control-static` | **254** | none |
| `br` | **186** | none |

So a rebuild needs exactly one CSS rule per archetype; there are no per-row exceptions.

Additional resolved values used by this piece:

* `p.form-control-static.ng-hide` (8 nodes) = the `p.form-control-static` column **plus `display: none`**.
* `p.ng-hide` (`#233`, row 9) = `display: none`, `margin-bottom: 10px` (it has **no** `form-control-static`,
  so **no** `min-height: 34px` and **no** `padding: 7px 0` — a real inconsistency in the source, and the
  only row of the 226 built that way).
* `div.ng-hide` (`#284`, row 60) = `display: none`, all else COMMON.
* `input#pairURLLink.form-control.col-md-6` (`#719`): `position: relative; float: left; width: 100%;
  height: 34px; min-height: 1px; padding: 6px 18px; border: 1px solid rgb(219, 217, 217);
  border-radius: 4px; background-color: rgb(238, 238, 238); color: rgb(85, 85, 85);
  overflow: clip; box-shadow: rgb(0, 0, 0) 0px 0px 0px 0px; cursor: text;
  transition: border-color 0.15s, box-shadow 0.15s;` (readonly → grey fill).
* `button.btn.btn-md.btn-info` (`#493`, `#494`): `display: inline-block; padding: 6px 12px;
  border: 1px solid rgb(70, 184, 218); border-radius: 4px; background-color: rgb(91, 192, 222);
  color: rgb(255, 255, 255); text-align: center; white-space: nowrap; vertical-align: middle;
  cursor: pointer; user-select: none;`
* `button.btn.btn-sm.btn-warning` (`#985`): `padding: 5px 10px; border: 1px solid rgb(238, 162, 54);
  border-radius: 3px; background-color: rgb(240, 173, 78); color: rgb(255, 255, 255);
  font-size: 12px; line-height: 18px;` + the shared button bits.
* `a.btn.btn-default` (`#986`): `padding: 6px 12px; border: 1px solid rgb(230, 233, 238);
  border-radius: 4px; background-color: rgb(255, 255, 255); color: rgb(51, 51, 51)` (COMMON, no deviation)
  `; text-align: center; white-space: nowrap; vertical-align: middle; cursor: pointer;`
* `span[style="text-decoration: underline"]` (`#1351`, `#1352`, `#1353`): `display: inline;
  font-weight: 700; text-decoration-line: underline; cursor: default;` (bold because it inherits the
  helper `<label>`'s `font-weight: 700`).
* `i.fa.*` inside the buttons (`#1349`, `#1350`, `#1354`): `display: inline-block;
  font-family: FontAwesome; color: rgb(255, 255, 255); line-height: 14px (12px for #1354);
  text-align: center; white-space: nowrap; cursor: pointer; user-select: none;`
  with `::before` glyphs `""` (floppy-o), `""` (plus), `""` (random).
* `i.fa.fa-gear.ms-2.cursor-pointer` (`#1355`): `display: inline-block; font-family: FontAwesome;
  line-height: 14px; cursor: default;` `::before` `""`, `color: rgb(51, 51, 51)`
  — note `cursor: default` despite the `cursor-pointer` class, i.e. **that class is also dead here**.

---

## 9. `.muted` check — VERIFIED DEAD

**Result: `.muted` is a dead class in this capture. Rendering helper text grey would NOT match.**

Evidence:

* All **136** `label.muted` nodes in the Settings tab share one deviation list —
  `display: inline-block; max-width: 100%; margin-bottom: 5px; font-weight: 700; cursor: default` —
  and it contains **no `color` entry**. `color` therefore resolves to the COMMON value
  **`rgb(51, 51, 51)`** (`DEFAULTS.txt:64`), identical to body text and identical to
  `label.col-sm-2.control-label`.
* The **43** helper `<label>`s that carry **no class at all** resolve to *exactly the same* absolute
  style, `color: rgb(51, 51, 51)` included. `.muted` changes nothing whatsoever.
* Consequence beyond colour: helper text is **`font-weight: 700` (bold)**, `font-size: 14px`,
  `line-height: 20px`, `display: inline-block`, `margin-bottom: 5px`, `cursor: default` — inherited
  from Bootstrap's bare `label` rule. A rebuild that renders helper text as small grey muted copy will
  be wrong on **colour, weight and size** simultaneously.

---

## 10. Security review of the field list

**42 fields in P21 have names implying a secret, credential, private endpoint or access list.
Every single one reads `empty` in this capture. No secret value is exposed by this piece.**

| # | Row | `#index` | Field | Type | **Captured value** |
|---|---|---|---|---|---|
| 1 | 1 | `#496` | `sess.ssoJWTSecret` | textarea | `empty` |
| 2 | 6 | `#510` | `sess.webinarPW` | textarea | `empty` |
| 3 | 7 | `#514` | `sess.webinarPW2` | textarea | `empty` |
| 4 | 8 | `#518` | `sess.webinarPW3` | textarea | `empty` |
| 5 | 9 | `#522` | `sess.webinarPWFreeTrial` | textarea | `empty` |
| 6 | 10 | `#526` | `sess.deleteAlertPW` | textarea | `empty` |
| 7 | 11 | `#530` | `sess.allRoomsWelcomeMatPW` | textarea | `empty` |
| 8 | 12 | `#534` | `sess.needPasswordForUserNotes` | textarea | `empty` |
| 9 | 16 | `#548` | `sess.login_webhook_url` | textarea | `empty` |
| 10 | 17 | `#550` | `sess.login_webhook_url` *(label says **Logout** — see §12)* | textarea | `empty` |
| 11 | 21 | `#564` | `sess.secTok` | textarea | `empty` |
| 12 | 59 | `#716` | `sess.pairSecretKey` | textarea | `empty` |
| 13 | 129 | `#963` | `sess.imgurClientID` | text | `empty` |
| 14 | 130 | `#965` | `sess.imgurApiKey` | text | `empty` |
| 15 | 131 | `#967` | `sess.imgurRapidKey` | textarea | `empty` |
| 16 | 132 | `#969` | `sess.xuserAccessToken` | textarea | `empty` |
| 17 | 133 | `#971` | `sess.xuserAccessTokenSecret` | textarea | `empty` |
| 18 | 135 | `#977` | `sess.stripeEmail` | textarea | `empty` |
| 19 | 138 | `#984` | `sess.apiSecret` | textarea | `empty` |
| 20 | 140 | `#988` | `sess.slackPostURL` | textarea | `empty` |
| 21 | 149 | `#1006` | `sess.modAdminLoginList` *(admin-panel access list)* | textarea | `empty` |
| 22 | 151 | `#1014` | `sess.customClientAlertPostURL` | textarea | `empty` |
| 23 | 152 | `#1018` | `sess.customClientAlertPostSecret` | textarea | `empty` |
| 24 | 181 | `#1124` | `sess.runawayRecPostURL` *(Slack webhook)* | textarea | `empty` |
| 25 | 189 | `#1154` | `sess.s3KeyID` | text | `empty` |
| 26 | 190 | `#1156` | `sess.s3KeySecret` | text | `empty` |
| 27 | 191 | `#1158` | `sess.s3Bucket` | text | `empty` |
| 28 | 192 | `#1160` | `sess.s3BucketFolderPath` | text | `empty` |
| 29 | 195 | `#1164` | `sess.vimeoClientID` | text | `empty` |
| 30 | 196 | `#1166` | `sess.vimeoClientSecret` | text | `empty` |
| 31 | 197 | `#1168` | `sess.vimeoToken` | text | `empty` |
| 32 | 198 | `#1170` | `sess.vimeoFolderPath` | text | `empty` |
| 33 | 200 | `#1174` | `sess.obsStreamKey` | text | `empty` |
| 34 | 201 | `#1176` | `sess.obsStreamSatusWebHookURL` | text | `empty` |
| 35 | 202 | `#1178` | `sess.restreamToURL` | text | `empty` |
| 36 | 203 | `#1180` | `sess.restreamToURLKey` | text | `empty` |
| 37 | 206 | `#1184` | `sess.twillioApiSID` | text | `empty` |
| 38 | 207 | `#1186` | `sess.twillioApiToken` | text | `empty` |
| 39 | 208 | `#1188` | `sess.twilioPhone` | text | `empty` |
| 40 | 209 | `#1190` | `sess.protextingSecretTok` | text | `empty` |
| 41 | 210 | `#1192` | `sess.protextingGroupIDs` | text | `empty` |
| 42 | 225 | `#1225` | `sess.invalidTokens` | textarea | `empty` |

Related booleans (no secret value, listed for completeness, all `No`): `allowPWLoginWithSSO` (#500),
`forgotRoomPassword` (#656), `showPasswordField` (#941), `enableTokenBadges` (#917), `remToken` (#921),
`saveRecsToS3` (#1152), `saveRecsToVimeo` (#1162), `obsBroadcastRoom` (#1172), `iframeSSOTFix` (#1205).
`tokenExpiresIn` (#506) is set to `1d` — a duration, not a credential.

**What *is* exposed (real values, honestly reported):**

* The room's internal session id **`6a628a99731b9f77ae9bf505`** — twice: in the Wordpress shortcode
  (`#504`) and in the pair URL (`#719`).
* The pair endpoint host/path `https://chat.protradingroom.com/ptr_app/sessions/v2/addUser/…` (`#719`).
* A **placeholder** secret in helper copy (not a live value): `'5081b73a690762e2526bc1fef3c46eedf1ec8832'`
  appears verbatim in the help text of `ssoJWTSecret` (`#498`) and `secTok` (`#566`).

Two hygiene notes for the rebuild, from the DOM itself: (a) the S3/Vimeo/OBS/Twilio/Imgur secrets are
`editable-text`/`editable-textarea`, i.e. **plain-text inline edit with no masking** — the rendered value
would be the raw secret; (b) they round-trip through `saveSessField('<field>')` with the value carried
in scope, so a rebuilt admin page must not render them into a public/SSR payload.

---

## 11. Rebuild spec

### 11.1 One row — HTML

```html
<!-- the container: r.0.1.1.0.1.3.1.5.0.0  (#186) -->
<div class="form-group m0">

  <!-- canonical 4-part row (110 of 226 group-children use this exact shape) -->
  <p class="form-control-static">
    <label class="col-sm-2 control-label">Nickname filter for members:</label>
    <a href=""
       onaftersave="saveSessField('nickFilter')"
       editable-textarea="sess.nickFilter"
       e-label="Nick Filter:"
       class="ng-scope ng-binding editable editable-click editable-empty">empty</a>
    <br>
    <label class="muted">(Coma separated list of filters, i.e. 'SO_,SS_,John Carter, etc...'</label>
  </p>

  <!-- checkbox variant: e-title instead of e-label, renders "No" / "Yes!" -->
  <p class="form-control-static">
    <label class="col-sm-2 control-label">Show Roster ?</label>
    <a href=""
       onaftersave="saveSessField('rosterVisibleToViewers')"
       editable-checkbox="sess.rosterVisibleToViewers"
       e-title="Show Roster ?"
       class="ng-scope ng-binding editable editable-click">Yes!</a>
    <br>
    <label class="muted">If disabled only presenters will see the user count and the roster</label>
  </p>

</div>
```

### 11.2 One row — CSS (absolute values, no shorthand guessing)

```css
/* container — r.0.1.1.0.1.3.1.5.0.0  (#186): zero deviations from COMMON */
.form-group.m0 { display: block; margin: 0; padding: 0; }

/* the row — p.form-control-static (254 identical nodes) */
.form-control-static {
  display: block;
  min-height: 34px;
  margin: 0;
  padding: 7px 0;
  box-sizing: border-box;
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
}

/* .0 — the field label (264 identical nodes) */
.col-sm-2.control-label {
  display: block;            /* NOT inline-block */
  position: relative;
  float: left;
  width: 16.6667%;
  max-width: 100%;
  min-height: 1px;
  margin: 0 0 5px 0;
  padding: 0 15px;
  box-sizing: border-box;
  color: rgb(51, 51, 51);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
  font-weight: 700;
  font-style: normal;
  line-height: 20px;
  text-align: start;
  cursor: default;
}

/* .1 — the x-editable link, value SET (149 identical nodes) */
a.editable.editable-click {
  display: inline;
  float: none;
  width: auto;
  margin: 0;
  padding: 0;
  border: 0 none rgb(10, 10, 10);
  border-bottom: 1px dashed rgb(66, 139, 202);
  color: rgb(10, 10, 10);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
  font-weight: 400;
  font-style: normal;
  line-height: 20px;
  text-decoration-line: none;
  cursor: pointer;
}

/* .1 — the x-editable link, value EMPTY (114 identical nodes): adds italic only */
a.editable.editable-click.editable-empty { font-style: italic; }

/* .2 */
br { display: inline; }

/* .3 — the helper label (136 .muted + 43 class-less: byte-identical) */
label.muted, .form-control-static > label:not(.control-label) {
  display: inline-block;
  float: none;
  width: auto;
  max-width: 100%;
  margin: 0 0 5px 0;
  padding: 0;
  border-bottom: 0 none rgb(51, 51, 51);
  color: rgb(51, 51, 51);      /* NOT grey — .muted is dead, see §9 */
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
  font-weight: 700;            /* helper text is BOLD */
  font-style: normal;
  line-height: 20px;
  cursor: default;
}
```

### 11.3 Field schema — data structure

```ts
/** One P21 settings row, as captured. */
type EditableType = 'text' | 'textarea' | 'checkbox' | 'number';

interface SettingsField {
  groupIndex: number;        // position under r.0.1.1.0.1.3.1.5.0.0 (0..225)
  nodeIndex: number;         // the capture's #index of the <a>
  label: string;             // .0 label.col-sm-2.control-label text, verbatim
  type: EditableType;        // from the editable-<type> attribute name
  bind: string;              // attribute value, e.g. "sess.nickFilter"
  onaftersave: string;       // verbatim, e.g. "saveSessField('nickFilter')"
  ePopoverTitle?: string;    // e-title  (checkboxes + some others)
  ePopoverLabel?: string;    // e-label  (most text/textarea)
  value: string | null;      // rendered text; null == not set
  empty: boolean;            // .editable-empty class present -> render italic
  helper?: string;           // helper copy, verbatim
  helperKind: 'label.muted' | 'label' | 'row-text' | 'sibling-label' | 'none';
  ngShow?: string;           // row-level ng-show expression, if any
}

/** Rendering rules taken straight from the capture — do not "improve" them. */
const RENDER = {
  emptyText: 'empty',        // literal UI copy for an unset value field
  checkboxTrue: 'Yes!',      // literal UI copy
  checkboxFalse: 'No',       // literal UI copy
  // x-editable marks JS-falsy 0 as .editable-empty but still prints "0" -> italic "0"
  falsyZeroPrintsValue: true,
};
```

The machine-readable list of all 214 P21 fields is the table in §5, one line per field, in DOM order.

---

## 12. Upstream bugs and typos — verified in this piece

| Locator | Finding | Evidence |
|---|---|---|
| `#550` (`r.0.1.1.0.1.3.1.5.0.0.17.1`) | **Real bug.** Label reads "Logout Webhook URL", `onaftersave="saveSessField('logout_webhook_url')"`, but the binding is `editable-textarea="sess.login_webhook_url"` — the *same* expression as the Login row `#548`. Editing "Logout" edits and displays the **login** value, then saves it to the **logout** key. | verbatim attributes of `#548` and `#550` |
| `#648` (`r.0.1.1.0.1.3.1.5.0.0.42.1`) | **Copy-pasted `e-title`.** Field is `sess.disableEditingUsername`, label "Disable Editing Username", but `e-title="Show Only Usernames in Roster?"` — identical to `#640` (`sess.showOnlyUsernames`, row 40). The inline-edit popover shows the wrong question. | `#640` vs `#648` |
| `#843` (`r.0.1.1.0.1.3.1.5.0.0.97.1`) | Same class of copy-paste: `sess.chatAutoClearSpecialHour` ("Overwrite Clear Hour:") carries `e-label="Nick Filter:"`, copied from `#538` (`sess.nickFilter`, row 13). | `#538` vs `#843` |
| `#889` (row 109) | `sess.enableQAReactions` carries `e-title="Enable Reactions?"`, identical to `#885` (`sess.enableReactions`, row 108). | `#885` vs `#889` |
| `#877` (row 106) | Helper text contradicts the label: label "Disable Emojis?" but helper "If enabled, Users will be **able to add** emojis using the emoji tool". | `#879` |
| `#933` (row 120) | Label "Disable Stars ?" but helper "If **disabled**, users will not see the stars…" — inverted copy. | `#935` |
| `#927` (row 118) | `showBadgesToPresentersOnly` reuses `enableBadges`' helper verbatim ("If enabled, You can cofigure and set badges next to each user name, like [Gold], etc"). | `#915` vs `#927` |
| `#1162` (row 194) | `e-title="Save Recordings to saveRecsToVimeo?"` — the field name leaked into user-facing copy. | verbatim |
| `#233` (row 9) | Structural: this row's `<p>` has `class="ng-hide"` only — it is missing `form-control-static`, so it alone lacks `min-height: 34px` and `padding: 7px 0`. | style deviations of `#233` vs `#225` |
| rows 61 / 64 / 217 | Structural: the row `<p>` is closed before its `<br>` + helper `<label>`, which then become siblings at group indices 62/63, 65/66 and 218. | see §5.1 |
| `#498` | Typo in shipped copy: "WordPRess", "make it hard to **getss**". | verbatim |
| `#554`, `#558`, `#562` | Typo in shipped copy: "Comma **seprated** list" (helper labels of `allowedMemberships`, `allowedProducts`, `allowedPerms`). | verbatim |
| `#781` | Field name typo: `sess.disalowSporadicMultiLogins` / `#785` `sess.disalowMultiLogins` ("disalow"). | verbatim |
| `#823` | Field name typo: `sess.styckyNonTradeAlert`. | verbatim |
| `#990` | Field name typo: `sess.diasableFCMAlerts`. | verbatim |
| `#1068` | Field name typo: `sess.ingnoreBadWordsList`. | verbatim |
| `#1176` | Field name typo: `sess.obsStreamSatusWebHookURL` ("Satus"), label matches the typo. | verbatim |
| `#1184`/`#1186` vs `#1188` | Inconsistent spelling: `twillioApiSID`/`twillioApiToken` (two L) but `twilioPhone` (one L); `#1188`'s `e-label` is `"Token SID"`, copied from `#1186`. | verbatim |
| `#1219` | Missing space in copy: "Users will need to agree to **thisDisclosure** to enter." (helper of `customEnterDisclosure`, `#1217`). | verbatim |

(The `e-title="Alr RoomJS:"` typo and the `e-label="Nick   Filter:"` triple space are in **P22**,
`#1447` and `#1451` — see that file.)

---

## 13. Honest gaps

1. **No geometry at all.** The pane is the inactive 6th tab (`#102`, `display: none`); all 969 rects are
   `0×0`. Nothing about width/height/spacing/wrapping/line-boxes of this block can be verified against
   this capture. A pixel diff of this piece is **not possible** from `00-baseline-room` — it needs a
   capture taken with the Settings tab active.
2. **Two help strings are truncated by the dumper at exactly 250 characters** and are therefore
   incomplete in the evidence:
   * `#975` (`r.0.1.1.0.1.3.1.5.0.0.134.3`, helper for `sess.subscriptionPlans`) — 250 chars,
     ends mid-token: `…"fee": 9.99,\n    "desc": "Pr`
   * `#1062` (`r.0.1.1.0.1.3.1.5.0.0.163.3`, helper for `sess.chatTabsWithBadges`) — 250 chars,
     ends mid-token: `…fd612fcdee7bc8e979bc"\n    ]\n  `
   For contrast, `#903` (`sess.alertLabels` helper) is 248 chars and ends with `]` — **complete**.
   No other text node in this piece is at the limit.
3. **Interleaving of bare text nodes is not captured.** For rows 219/220/221 (and P22's text-bearing
   rows) the dump records the `<p>`'s own text separately from its element children, so the exact
   position of the bare helper text *relative to* the label and the editable cannot be proven from this
   evidence. Placing it after the editable follows the pattern of the 178 rows that use an explicit
   helper `<label>` (154 of the 214 fields do so), but that is an **inference, not evidence**.
4. **Prior-work claims I could NOT reproduce, stated plainly:**
   * "181 fields (102 checkbox, 42 textarea, 33 text, 4 number)" — my count for this anchor is
     **214 (123/61/26/4)**; tab-wide it is **263 (141/84/33/5)**. See §6.
   * "only 15 set" — I count **14** set in P21 (+4 in P22 = 18 tab-wide). See §6.1.
   * "group indices 62/63/65/66/193/204/218 absent" — they are **present**, as `<br>`/`<label>`
     structural siblings (§5.1). The 226 group indices `0…225` are contiguous with **no gaps**.
   * "rows 40/41/49 with no captured children" — **not reproduced**: rows 40, 41 and 49 each have the
     full 4-child quad (`#639`–`#642`, `#643`–`#646`, `#675`–`#678`). The rows that genuinely have no
     children are **3, 62, 63, 65, 66, 193, 204, 218** (§5.1).
5. **`sess.authMode` is never captured.** Ten rows key off it (§5.2) but the property itself is not a
   field in this pane and its value appears nowhere in this subtree; the ten rows' visibility can only
   be read off the `ng-hide` class they already carry.
6. **`e-form` / `e-placement` / other x-editable options are absent** — the only `e-*` attributes in the
   whole subtree are `e-label` (103 nodes) and `e-title` (153). Seven editables carry **neither**:
   `#963`, `#965`, `#967` (Imgur), `#1174`, `#1176`, `#1178`, `#1180` (OBS/restream). No editable
   carries both.
7. **Popover/edit-mode UI is not in the capture.** x-editable renders its form only after a click; the
   dump is a static snapshot with no open editor, so the input/textarea/checkbox markup, the OK/Cancel
   buttons and the `e-label`/`e-title` rendering are **not** evidenced here.
8. **`::before`/`::after` are only recorded for four nodes** (`#1349`, `#1350`, `#1354`, `#1355`) — the
   FontAwesome glyphs. If x-editable adds pseudo-content to `a.editable`, this capture does not show it
   (none of the 263 editables reports a pseudo-element).
