# The original's admin surface — evidence inventory and diff

**What this is.** Every page, tab, setting, action and control an operator of the ORIGINAL
(ProTradingRoom, "PTR") can reach, taken from the captures in this repository and the live captures
under `~/Desktop/new-room`, and diffed against what this repository has built.

**What this is not.** A design. Nothing below is proposed; everything below is cited. Where the
evidence is silent, this document says so and names where it looked.

**Method.** Every file listed under "Evidence read" was opened and read, not grepped. `grep` was used
only to *locate* a file or a line, never to conclude. Counts come from `python .count()` /
`re.finditer` over the parsed file, never from `grep -c` — `grep -c` on a one-line file returns 1 and
that mistake has already been made in this repository.

**Redaction.** Live captures contain real credentials. A JWT in the account capture's Launch href,
and an API-key secret in the same capture, are written as `[REDACTED]` below.

---

## Evidence read

| file | size | what it is | read |
|---|---|---|---|
| `apps/controller/evidence-page.manageSession.html` | 2,718 lines | the Manage Room page, rendered DOM | in full, lines 1–2718 |
| `apps/controller/evidence-dumps/TIER1-fetched/views/page.manageSession.html` | 2,718 lines | the same page's SOURCE template, fetched from the origin | compared byte-for-byte — **identical**, 216,609 bytes both |
| `apps/controller/evidence-dumps/TIER1-fetched/views/page.welcome.html` | 1,424 lines | the account page SOURCE template | in full (the 670-line emoji picker block, lines 475–1144, read as one unit) |
| `apps/controller/evidence-dumps/login-page/logged-in-page` | 885 lines | the account page, rendered, signed in | in full |
| `apps/controller/evidence-dumps/register-page/register-page-file` | 295 lines | the registration page, rendered | in full |
| `apps/controller/evidence-dumps/TIER1-fetched/views/page.register.html` | 89 lines | registration SOURCE template | in full |
| `apps/controller/evidence-dumps/TIER1-fetched/views/page.stats.html` | 99 lines | account-level stats page template | in full |
| `apps/controller/evidence-dumps/TIER1-fetched/views/page.recordings.html` | 26 lines | recordings page template | in full |
| `apps/controller/evidence-dumps/TIER1-fetched/views/users.html`, `page.avatars.html` | 37 / 17 lines | in-room partials | in full |
| `apps/controller/evidence-dumps/TIER1-fetched/api-post-routes.md` | 728 lines | the POST API documentation | section index read in full |
| `apps/controller/evidence-dumps/TIER1-fetched/README.md` | 51 lines | the fetch manifest with sha256 per artifact | in full |
| `apps/controller/evidence-dumps/stripe-details-2026-08-14.json` | — | captured JS handler **sources** from the live page | all found handlers read |
| `apps/controller/evidence-manage-gaps-2026-08-11.json` | 139 KB | manage-page dropdown/pane capture + honest gap list | `role`, `targets`, `gaps`, `refusedClicks` read |
| `apps/controller/evidence-tooltips-manage-2026-08-12.json` | 28 KB | tooltip capture | `gaps`, `verdict` read |
| `apps/controller/evidence-dumps/NEXT-STEP/gaps/meta.json` + `state-*.json` | 11 states | per-tab / per-modal rect+DOM states | `meta.json` and the state key set read |
| `~/Desktop/new-room/account-page/ptr-dump-member-1786232518250.json` | 930 KB | account page (`#/page/welcome`), **member** role | all 922 nodes rendered to text and read |
| `~/Desktop/new-room/second-dump/db/README.md` | — | a Postgres schema dump | read — see §D, it is OURS, not the original's |
| `apps/controller/src/lib/room-settings-schema.ts` | 895 lines | what we model | in full |
| `apps/controller/src/lib/server/superadmin.ts` | 256 lines | our operator-role model | in full |
| `apps/controller/src/routes/(app)/admin/+page.server.ts` | 266 lines | our operator console | in full |
| `apps/controller/src/routes/(app)/account/rooms/[id]/[[tab]]/+page.server.ts` | — | our room page's tab strip | lines 60–140 read |
| `apps/controller/src/lib/server/db/schema.ts` | — | our `accounts` table | lines 20–67 read |

**Named in the brief but absent from the repository:** `docs/reference/ptr1-MASTER.md`,
`docs/reference/ptr1-DECODE.md`, `docs/reference/prt2-DECODE.md` and `docs/reference/pieces/` do not
exist. `find docs -iname '*ptr1*' -o -iname '*prt2*' -o -iname '*pieces*'` returns nothing. What
`docs/reference/` actually contains is `evidence-dumps-full-read.md`, `evidence-gap-register.md`,
`original-new-room-backend-forensics.md`, `rects-deltas.txt`, `rects-vocab.txt`, `working-rules.md`.

---

## A. The Manage Room page, tab by tab

Route: `#/page/manageSession/{mongoId}`
(`evidence-dumps/NEXT-STEP/gaps/meta.json` → `url`). AngularJS **1.3.15**
(`meta.json` → `angularVersion.full`). Every field is an `angular-xeditable` inline editor; saving
calls `saveSessField('<field>')`, which is why that call is the field's identity throughout.

### A.0 — the panel header, above the tab strip

| line | control | verbatim text / binding |
|---|---|---|
| 10 | title | `Manage Room id: {{sess.uuid}}  ( {{sess._id}} )` |
| 10 | live counters | `Current <i class="fa fa-user">: {{sess.current_capacity}} / Max <i class="fa fa-user"> {{sess.recordedMaxCapacity}}` |
| 10 | button | **Reset Counts** → `resetMaxCount()` |
| 10 | hidden trigger | `ng-dblclick="canCloneDblClick()"` on the title span. Its source, captured live: `function(){$scope.canCloneClicks=!0}` (`stripe-details-2026-08-14.json` → `handlers.canCloneDblClick.source`). Double-clicking the title is what reveals Clone Room. |
| 11 | link | **Launch** → `/session?id={{sess.uuid}}&jwtSite={{tokSite}}`, `target="_blank"` |
| 13 | link | **Clone Room** → `cloneRoom(sess._id)`, shown on `sess.canClone \|\| sess.isClonedRoom \|\| canCloneClicks` |
| 15 | link | **Delete Room** → `deleteRoom(sess._id)`, shown only on `sess.isClonedRoom` |
| 16 | link | **Marketplace** → `manageMarketplaceSession(sess._id, sess)`, hidden on `disableMarketplace` |
| 24–28 | field | **Room Title** → `editable-text="sess.name"` |
| 39–52 | field | **Date:** → `editable-combodate="sess.webinarDate"`, shown only on `sess.roomType=='webinar'`. Note verbatim: `(NOTE: use your local time. It will be converted to the user's local time)` |
| 53–60 | field | **Authorization Mode** → `editable-select="sess.authMode"` over `sessAuthTypes` |
| 61–97 | block | shown on `authMode=='registrationA' \|\| 'registrationM'`: **Registration Link:** (read-only `https://{{hostname}}/r/{{sess._id}}` + Copy), **Event Time (for email template):** (`ng-model="webinarTimeTxt"`, placeholder `at 7pm EST`), **Email Preview:** (a `<pre>` reminder template), button **Send Emails Now** → `sendWeminarEmailReminder(webinarTimeTxt)` |
| 99–137 | block | shown on `authMode=='webinarRoom' \|\| 'open' \|\| 'unamePW' \|\| allowPWLoginWithSSO`: **Room Link:** `https://{{hostname}}/u/{{sess._id}}` + Copy; **Vanity Link:** `https://{{hostname}}/room/{{sess.customCname ? … : '[yournamehere]'}}` + **Edit** (`setCustomRoomURL()`) + Copy; **Unique Link:** `https://{{hostname}}/room/{{sess.uniqueLinkLogin ? … : '[youruniquelinkhere]'}}` + **Generate** (`setUniqueRoomURL()`) + Copy |
| 138–152 | block | shown on `sess.hasAppPairLink`: **App Pair Link:** `https://{{hostname}}/room/` + Copy |
| 159–162 | state | loading spinner `app/img/ajax_loader.gif` + `Loading...` |

### A.1 — the tab strip

Six `<tab>` elements, in this order (lines 165, 609, 616, 641, 653, 760):

1. **Users** — always
2. **Text List** — `ng-show="sess.twillioApiToken"`
3. **Branding (Logo / Landing Page) ** — always (label carries a trailing space)
4. **SSO Setup ** — `ng-show="sess.authMode=='sso'"` (trailing space)
5. **User Stats** — always
6. **Settings ** — always (trailing space)

There is no seventh tab. Marketplace is a **button**, not a tab (line 16 and account page
`logged-in-page:476`).

### A.2 — Users tab (lines 165–608)

**Toolbar** (168–239)

| line | control | handler |
|---|---|---|
| 170 | **Add User / Invite** | `doInvite()` |
| 171 | **Export** | `exportListToCSV()` |
| 172 | **Load / Reload Users** | `loadUsers()` |
| 174 | dropdown **User List Actions** | — |

**User List Actions** menu (177–236), in order:

| line | item | handler | condition |
|---|---|---|---|
| 179 | Batch User Invite | `doBatchInvite()` | `sess.authMode === 'unamePW'` |
| 183 | *(divider)* | — | same condition |
| 185 | Show Free Trials | `loadUsersFT()` | — |
| 190 | Show BANNED | `loadBannedUsers()` | — |
| 195 | Show Chat Muted | `loadMutedUsers()` | — |
| 200 | Show Mobile | `loadMobileUsers()` | — |
| 205 | Show Non-Mobile | `loadNonMobileUsers()` | — |
| 210 | Show Presenters | `loadPresentersUsers()` | — |
| 216 | Marketplace Users | `loadMarketplaceUsers()` | — |
| 220 | *(divider)* | — | — |
| 222 | Remove non-presenters | `clearUserList()` | — |
| 227 | Remove Free Trials | `removeUsersFT()` | — |
| 232 | Remove All User Badges | `removeBadgesForUsers()` | — |

`doBatchInvite` and `loadMarketplaceUsers` were captured live as running source
(`stripe-details-2026-08-14.json` → `handlers`): batch invite raises a `bootbox.prompt` titled
**"Enter comma separate email list"** with `inputType:"textarea"`, splits on comma, and POSTs
`inviteBatchUsers` to `/users/v1/sessions`; marketplace users POSTs `userListMarketplace` to the same
endpoint.

**Search** (240–253): label **Search Users**, `input[type=search]` bound to `uSearch`, `ng-enter`
submits, button **Search / Load Users** → `loadUsers(uSearch)`.

**Bulk selection** (255–331)

| line | control | handler |
|---|---|---|
| 257–259 | checkbox **Select All** / **Unselect All** | `getCheckedAllUserIds()` |
| 261–264 | checkbox **Apply to all rooms?** | `toggleApplyToAllRooms()`, `ng-model="applyToAllRooms"` |
| 269 | dropdown **Actions With Selected** | — |
| 272 | button **Actions With the Email List** | `actionsWithEmailList()` |

`actionsWithEmailList` captured live: `bootbox.prompt` titled **"Enter comma separated email list"**,
textarea, then `actionsWithEmailListOptions()`; empty input answers
**"Please enter at least one valid email address"**.

**Actions With Selected** menu (275–328) — each calls `updateManyUsers(n)`:

| line | item | n |
|---|---|---|
| 277 | Remove All | 10 |
| 282 | UNBAN Participant | 2 |
| 287 | Make Presenter | 1 |
| 292 | Make Admin (Non-Presenter) | 5 |
| 297 | Make Participant | 2 |
| 302 | Make TRIAL user | 6 |
| 307 | MUTE Participant | 3 |
| 312 | BAN Participant | 4 |
| 318 | Add Badge | `updateManyUsersBadgePrompt('add')` |
| 323 | Remove Badge | `updateManyUsersBadgePrompt('remove')` |

**User table** (334–605). Columns: `#`, `Name / Email`, `Last Login/Notes`, `Role / Status`,
`Actions`.

Per-row flag icons (350–360, 397–399): folder (`fileAccessCaseByCase && user.hasFileAccess`), mobile
(`ptrMobileAppCaseByCaseEnabled && hasMobileApp`), mobile (`alerterAppTokens.length>0`), red mobile
(`alerterAppFCMUserOff`), microphone (`hasMic`), video-camera (`hasCam`), desktop (`hasScreen`),
comment (`hasAdminChat`), pencil (`canEditNotes`), red hdd `title="Denied Archives Access"`
(`denyArchivesAccess`), gravatar, `Discord Username: {{user.discordUsername}}`, `TRIAL` badge,
`| <i class="fa fa-mobile"> {{user.mobilePairCode}}`, phone, `PW set`, `User Count Hidden`,
`User Personal Info Hidden`.

Stripe strip, `ng-if="user.isMarketPlaceUser"` (366–389): subscription-status label coloured by
`getStripeStatusClass`, Last Paid At, Next Billing, Last Payment Failure, Last Paid Amount via
`formatStripeAmount`, and a **Details** link → `openStripeDetails(user)`.

`getStripeStatusClass` captured live: `active`/`trialing` → `label-success`;
`past_due`/`paused` → `label-warning`; `canceled`/`unpaid`/`incomplete`/`incomplete_expired` →
`label-danger`; otherwise `label-info`. `formatStripeAmount` divides by 100, thousands-separates,
and prefixes `$` for USD, `€` for EUR, `£` for GBP, else appends the currency code.

**The Stripe Details dialog** — not markup in the page; built in JS and shown with
`bootbox.dialog`, title `"Stripe Details - " + (userName || email)`, one **Close** button
(`btn-primary`). Rows, in the order the captured source emits them, each skipped when empty:
Membership ID, Subscription ID, Customer ID, Checkout Session ID, Subscription Status,
Last Invoice ID, Last Paid At, Last Paid Amount, Last Paid Currency, Last Payment Failure At,
Last Failure Reason, Current Period End, Cancel At, Canceled At, Welcome Email Sent,
Welcome Email Sent At, Stripe Data Updated.

Role / Status cell (415–423): **APPROVE** button on `inviteStatus=='pending'`; then
`role==2` → `Participant`, `role==0` → `Owner`, `role==1 && !nonPresenter` → `Presenter`,
`role==1 && nonPresenter` → `Admin`, `role==3` → `CHAT MUTED`, `role==4` → `BANNED`; plus
`/ {{user.type}}` for everyone but the owner.

**Per-user Actions dropdown** (426–600), hidden for `role==0`. Four submenus plus loose items:

*Permissions* (438–469) — Make Presenter `updateUser(1,…)`, Make Admin `(5)`, Make Participant `(2)`,
Make Trial `(6)`, MUTE Participant `(3)`, BAN `(4)`, divider, Unban `(2)`, Freshen Login Date `(9)`.

*Granular Perms* (472–512) — **Adjust Mic/Cam/Screen/Chat/Notes** → `setPermissions(user)` opening
`#permissionsModal` (shown on `user.role !== 1`); divider; Show User Count `(8)`; Hide User Count
`(7)`; Deny Archives Access `(13)` / Allow Archives Access `(14)` (mutually exclusive on
`denyArchivesAccess`); Hide Pers User Data `(10)`; Don't Hide Pers User Data `(11)`; divider;
Disallow User2User PM `setUserRestrictPM(true,…)`; Allow User2User PM `setUserRestrictPM(false,…)`.

*App and Notifications* (515–553) — Get App PIN `getAppPin()`; Show App Tokens
`showAlerterAppTokens()`; Get FCM Tokens `getFCMTokens()`; divider; PAUSE Mobile Notifs
`pauseUserNotifs(...,'pause')`; RESUME `('resume')`; Remove `('unsub')`; Send Test Mobile Notifs
`sendTestFCM()`; Reset Mobile Notifs `resetFCMForuser()`; then, only on
`sess.ptrMobileAppCaseByCaseEnabled`: Enable Mobile App / Disable Mobile App
`manageMobileApp(...,'enable'|'disable')`.

*Badges* (556–565) — **Badges** → `manageBadges(badgesList, user.badges, user._id, user.userName,
user.email)`, only on `badges.hasBadges`.

*Loose items* (567–599) — Set Note `setNoteUser()`; Edit Username `editUsername()`; Remove User
`deleteParticipant()`; divider; Set/Change Password `setUserPW()`; Resend Welcome Email
`sendWelcomeEmail()`; divider; Pause / Pending `approveUser(...,'pending')`; then on
`sess.fileAccessCaseByCase`: Enable Files / Disable Files `manageFileAccess(...,'enable'|'disable')`.

**The permissions modal** — real markup, `#permissionsModal`, lines 2685–2715. Title:
`Adjust Mic/Cam/Screen permissions for user: {{userPermissions.userName}}`. Five checkboxes, each
firing its own toggle on change: **Microphone** (`toggleHasMic`), **Screenshare**
(`toggleHasScreen`), **WebCam** (`toggleHasCam`), **AdminChat** (`toggleHasAdminChat`),
**CanEditNotes** (`toggleCanEditNotes`). Footer: **Close** (dismiss) and **Save Changes**
(`saveUserPermissions()`).

### A.3 — Text List tab (lines 609–615)

Two controls only: a **Save List** button → `saveTextList()`, and `<textarea id="textListTxt">`
with `rows="40"`, width and height 100%. Tab gated on `sess.twillioApiToken`.

### A.4 — Branding (Logo / Landing Page) tab (lines 616–640)

| line | control | binding |
|---|---|---|
| 621 | logo preview | `<img ng-src="{{sess.logoURL}}" class="navLogo">` on a `#000` panel |
| 624 | **Upload/Change** | `openFileChooser('logos')` |
| 625 | **Reset** | `resetLogo()` |
| 634 | heading | `Login Landing Page Editor` |
| 634 | **Save Editor Changes** | `htmlDescChanged()` |
| 636 | WYSIWYG | `<div text-angular ng-model="sess.description" name="wysiswyg-editor">` |

`sess.description` is a real, live field. It is the **one** editable on this page that does not go
through `saveSessField`.

### A.5 — SSO Setup tab (lines 641–652)

Exactly one control: **SSO Host** → `editable-text="sess.ssoHost"`. Tab gated on
`authMode=='sso'`.

### A.6 — User Stats tab (lines 653–759)

| line | control | binding |
|---|---|---|
| 662 | **Start Date:** | `editable-date="statsDate"`, helper `Choose a start date` |
| 669 | **End Date:** | `editable-date="statsDateEnd"`, helper `Choose an end date` |
| 676 | **Load Stats** | `loadStats(statsDate, statsDateEnd, uSearchStat, filterFT, remDupes, showMobileStat)` |
| 677 | **Export** | `exportStatsToCSV(statsDate)` |
| 678 | **Monthly report for date range** | `loadMontlyStats(statsDate,statsDateEnd,false)`, shown when `statXrefsMontly.length===0` |
| 679 | **Clear monthly report** | `loadMontlyStats(...,true)`, shown when `>0` |
| 680 | **Download monthly report** | `downloadMontlyStats(statXrefsMontly)` |
| 686–688 | **Search Users** | `ng-model="uSearchStat"` |
| 690 | checkbox **Show Online Users Only** | `filterOnline` |
| 693 | checkbox **Show Free Trials Only?** | `filterFT` |
| 696 | checkbox **Show Mobile Only?** | `showMobileStat` |
| 699 | checkbox **Remove duplicates?** | `remDupes` |
| 707 | empty state | `No results to show. Select a date above...` |
| 716 | monthly heading | `Monthly report: {{statXrefsMontlyByYear}} - Total Logins: {{statXrefsMontlyTotal}}` |
| 717–723 | monthly table | month → totalLogins |
| 727–756 | stats table | `#`, `Nick`, `Email / IP`, `Time Stamps` + a **Reverse** link (`reverseStatSort()`), `Duration (Hours)`. Each row shows a gravatar, TRIAL badge, phone, `IP: <a href="http://ip-api.com/#{{ip}}">{{ip}} (lookup)</a>`, a mobile-or-desktop icon, the browser string, `In:` / `Out` timestamps and `duration/3600` to two decimals. |

### A.7 — Settings tab (lines 760–2670)

Two panel-level buttons at the top (764, 766): **Export Settings** → `exportSettingsToJSON()`, and
**Load Settings From Room** → `loadSettingsFromRoom()`. A third, **Load Settings**
(`loadSettingsFromJSON()`), is present but commented out at line 765.

One non-editable row (781–783): **Wordpress shortcode:** rendering
`[protradingroom room='{{sess._id}}' key='{{sess.ssoJWTSecret}}' link_text='Enter Room' mode='urlv3']`.

Two buttons attached to fields: **New Secret** (1690) → `generateNewApiSecret()` next to `apiSecret`;
and a link **API POST Routes Docs** (1695) → `/public/html/api-docs.html?src=/public/html/POST_ROUTE_API_DOCUMENTATION.md`.

A gear icon on the `chatTabsWithBadges` label (1860): `title="Configure Chat Tabs"` →
`openChatTabsWithBadgesEditor(sess.chatTabsWithBadges)`.

A sample pairing URL appears (1141) when `hasAppPairLink && pairSecretKey`:
`https://chat.protradingroom.com/ptr_app/sessions/v2/addUser/{{sess._id}}/?sec={{sess.pairSecretKey}}&email=__userEmail__&name=__userName__`.

**The DON'T TOUCH block.** Heading at line 2286:
`DON'T <span ng-click="donttouchShow=!donttouchShow">TOUCH</span> These below unless you know what
you are doing...`. The word **TOUCH** is the toggle. While closed, line 2287 renders the single word
`Settings...`. The block itself is lines 2288–2667 and holds **49** of the fields.

Four buttons live only inside it:

| line | button | handler |
|---|---|---|
| 2321 | **Swap ClusterIDs (Backup <--> Main)** | `swapCLusterIDs()` |
| 2322 | **Apply clusterID/backupID to all sessions** | `applyToAllSessions()` (`btn-danger`) |
| 2416 | **Apply server / repeaters to entire account?** | `applyRepeaterToAccount()`, revealed by clicking the Repeater List helper text (`ng-click="showAdServer=true;"`, line 2414) |
| 2420 / 2421 | **Add Server** / **Remove Server** | `addLiveServer()` / `removeLiveServer()`, with `#addServerTxt` / `#removeServerTxt` inputs, same reveal |

Two prose banners inside the block: line 2472 `These vars allow to server altertaive code version for
this room`, and line 2536 `For pushing alerts and streams to other rooms, you can use the following
settings. You need the other rooms ID and the API Secret of the other room to do this.`

### A.8 — every settings field, verbatim

**267 live `saveSessField` calls, 267 distinct field names, no duplicates.** A further **9** are
present but inside HTML comments and therefore not controls:
`roomType` (34), `webinarTZ` (48), `customRoomURL` (859), `chatAutoClearTime` (1901), `useV4` (2306),
`media_server_audio` (2368), `relay_to_repeaters` (2388), `relay_user_max` (2403),
`linkedStreamsToSession` (2584).

Adding `sess.description` (the Branding WYSIWYG, line 636) gives **268 live editable fields** on the
page.

Rows 1–3 are the panel header, row 4 is the SSO Setup tab, rows 5–267 are the Settings tab.
`line` cites `apps/controller/evidence-page.manageSession.html`.

One transcription caveat, stated rather than hidden: for `pairOKRedirect` (1146) and
`pairErrorRedirect` (1152) the helper `<label>` sits OUTSIDE the row's `<p>` (lines 1148 and 1154),
so the mechanical extractor below prints `—`. Read directly, their helpers are
`Where to send users if the pairing succeeds` and `Where to send users if the pairing fails`.


| line | label (verbatim) | `sess.*` field | editor | help text (verbatim) | help shape | DON'T TOUCH |
|---|---|---|---|---|---|---|
| 26 | Room Title | `name` | text | — | — |  |
| 43 | Date: | `webinarDate` | combodate | — | — |  |
| 57 | Authorization Mode | `authMode` | select | — | — |  |
| 646 | SSO Host | `ssoHost` | text | — | — |  |
| 770 | JWT Secret Key: | `ssoJWTSecret` | textarea | Use this key in combination with the WordPRess plugin, or other JWT SSO, make it hard to getss, like: '5081b73a690762e2526bc1fef3c46eedf1ec8832' | muted |  |
| 774 | Allow PW based logins on SSO? | `allowPWLoginWithSSO` | checkbox | if ON, you can give a link and PW to enter the SSO room as well | muted |  |
| 786 | Token Expiration | `tokenExpiresIn` | textarea | A string like '1d', '1h', '12h" etc... | muted |  |
| 793 | Room Password: | `webinarPW` | textarea | Give this password to your registered members to enter the room. Presenters have their own password. | muted |  |
| 798 | Temp Room Password: | `webinarPW2` | textarea | Temp password/additional pw.. Works in addition to the other passwords | muted |  |
| 803 | Temp Room Password 2: | `webinarPW3` | textarea | Temp password 2/additional pw.. Works in addition to the other passwords | muted |  |
| 809 | Free Trial Password: | `webinarPWFreeTrial` | textarea | Give this password to your free trial users. | muted |  |
| 815 | Delete Alert Password | `deleteAlertPW` | textarea | If set, Presenters will need to enter the password to delete an alert | muted |  |
| 820 | All Rooms Welcome Mat Password | `allRoomsWelcomeMatPW` | textarea | If set, Presenters will need to enter the password to replace all the rooms welcome mats | muted |  |
| 825 | Password to Manage User's Notes | `needPasswordForUserNotes` | textarea | If set, Presenters will need to enter the password to manage user's notes | muted |  |
| 831 | Nickname filter for members: | `nickFilter` | textarea | (Coma separated list of filters, i.e. 'SO_,SS_,John Carter, etc...' | muted |  |
| 838 | Custom Favicon | `customFaviconURL` | textarea | — | — |  |
| 843 | Overwrite Cash Register Sound | `overwriteCashRegisterSound` | text | If set, it will play instead of the chash.mp3 | muted |  |
| 849 | Login Webhook URL | `login_webhook_url` | textarea | — | — |  |
| 854 | Logout Webhook URL | `logout_webhook_url` | textarea | — | — |  |
| 865 | Membership filter: | `allowedMemberships` | textarea | Leave blank to let all members in. Comma seprated list of valid memberships the user needs to have to enter. | muted |  |
| 870 | Product filter: | `allowedProducts` | textarea | Leave blank to let all members in. Comma seprated list of valid products the user needs to have to enter. Either a product or membership, or both must match... | muted |  |
| 875 | Permissions filter: | `allowedPerms` | textarea | Leave blank to let all members in. Comma seprated list of valid permissions the user needs to have to enter. Either a product or membership, or both must match... | muted |  |
| 881 | Secret Token: | `secTok` | textarea | Leave blank to let all members in, Set it to something complex like '5081b73a690762e2526bc1fef3c46eedf1ec8832' | muted |  |
| 886 | Custom Room Drive URL | `custRoomDriveURL` | textarea | If set, Room Drive icon will open this link instead. | muted |  |
| 891 | Custom Logout URL | `custLogoutURL` | textarea | If set, Logout button will use this URL | muted |  |
| 896 | Show Roster ? | `rosterVisibleToViewers` | checkbox | If disabled only presenters will see the user count and the roster | muted |  |
| 903 | Hide Welcome To Message? | `hideWelcomeTo` | checkbox | If enabled, it will hide welcome message on the login page | muted |  |
| 910 | Open link on login? | `openLoginLink` | textarea | If enabled, it will open the link set in this setting on a new tab | muted |  |
| 915 | Custom login error URL redirect | `loginErrorURL` | textarea | On the login error it will redirect users to this url | muted |  |
| 920 | Custom login error message | `loginErrorMsg` | textarea | On the login error it will display this message to users | muted |  |
| 925 | Show only Presenters in the roster? | `onlyPresentersVisibleToViewers` | checkbox | If enabled, users will see only presenters in the roster | muted |  |
| 932 | Show Roster Count? | `rosterCountVisibleToViewers` | checkbox | If enabled, the roster count will still be visible to users, even if the roster is not | muted |  |
| 939 | Simulated Count? | `simUserCount` | number | A number from 0 to 5000. You can add "simulated users" to the total user count shown in the room. the roster list will be hidden if you enable this feature | muted |  |
| 948 | User PMs? | `userPM` | checkbox | If enabled, users can Private msg each other | muted |  |
| 955 | Enable Private Message History? | `enablePrivateMessageHistory` | checkbox | If enabled, can load users private message history | muted |  |
| 962 | Sound alert when a new message is posted? | `dingOnNewMessage` | checkbox | If enabled, it will play a sound when a new message is posted | muted |  |
| 969 | Sound when the user joins/leaves? | `beepOnUserJoin` | checkbox | If enabled, moderators will hear a sound when users join/leave | muted |  |
| 976 | Popup alert when the user joins/leaves? | `userJoinAndLeavePopup` | checkbox | If enabled, moderators will get a popup when users join/leave | muted |  |
| 983 | Hide User Avatars? | `hideAvatars` | checkbox | If enabled, user avatars will be hidden | muted |  |
| 990 | Hide Mobile App Info? | `hideAppInfo` | checkbox | If enabled, mobile app info wiil be hidden | muted |  |
| 997 | Always Show User Roster? | `alwaysShowRoster` | checkbox | If enabled, user roster will always be visible | muted |  |
| 1004 | Show Only Usernames in Roster? | `showOnlyUsernames` | checkbox | If enabled, for regular users it will show only their usernames in roster? | muted |  |
| 1011 | Allow Users to Change their Usernames? | `allowUsersToChangeUsername` | checkbox | If enabled, for regular users it will allow them to change their usernames. | muted |  |
| 1018 | Disable Editing Username | `disableEditingUsername` | checkbox | If enabled, it will disable the editing of the username in the login form for regular users | muted |  |
| 1025 | Username Instructions | `usernameInstructions` | textarea | Instructions how user can edit his username | plain |  |
| 1030 | Forgot room password? | `forgotRoomPassword` | checkbox | If enabled, can change room login password on the login page | muted |  |
| 1037 | Tawk Presenter Support? | `tawkPresenterSupport` | checkbox | If enabled, tawk presenter support will be visible in the room | muted |  |
| 1044 | User PM presenters? | `userToPresenterPM` | checkbox | If enabled, users can Private msg presenters | muted |  |
| 1051 | Chat Message Sound For Emails: | `playChatMessageSoundFor` | textarea | Coma separated list of emails to play sound on the new chat message | muted |  |
| 1056 | Alerts/Chat on bottom? | `alertsChatOnBottom` | checkbox | If enabled, the alerts and chat will be bellow the screenshare area | muted |  |
| 1064 | Q&A on Alerts? | `hasQAOnAlerts` | checkbox | If enabled, users can ask questions on Alerts and have a disscussion in context | muted |  |
| 1071 | Alerts over screenshare? | `alertsOverlayOnScreenshare` | checkbox | If enabled, alerts will appear over the screenshare in recordings | muted |  |
| 1078 | Copy Trades? | `copyTrades` | checkbox | If enabled, users can copy trades by clicking on them | muted |  |
| 1085 | Disable Copy? | `disableCopy` | checkbox | If enabled, it will disable right-click to prevent selecting and copying all text | muted |  |
| 1093 | Claim Nickname? | `claimNickName` | checkbox | If enabled, users can claim a nickname | muted |  |
| 1101 | Show typing indicator ? | `hasTypingIndicator` | checkbox | Show if somebody is typing in the room or PM | muted |  |
| 1108 | Presenter chat messages on the right? | `presenterMsgsOnTheRight` | checkbox | If enabled, renders presenter chat messages on the right | muted |  |
| 1115 | Alt Chat Render? | `altChatRender` | checkbox | If enabled, renders chat sans avatars, and compact mode | muted |  |
| 1122 | Alt Room Render? | `altRoomRender` | checkbox | If enabled, renders simplified alerts/chat | muted |  |
| 1129 | Pair Link For App? | `hasAppPairLink` | checkbox | If enabled, it will show the link to pair the app | muted |  |
| 1136 | Pair Secret Key | `pairSecretKey` | textarea | — | — |  |
| 1146 | Pair OK Redirect | `pairOKRedirect` | textarea | — | — |  |
| 1152 | Pair ERROR Redirect | `pairErrorRedirect` | textarea | — | — |  |
| 1159 | Hide Alerts/Chat Section? | `hideChatAlerts` | checkbox | If enabled, the room will not have chat/alerts. Just media. | muted |  |
| 1166 | Enable Swing Trade Alerts Tab? | `hasSwingTradeAlerts` | checkbox | If enabled, the room will have swing alerts tab. | muted |  |
| 1173 | Enable Day Trade Alerts Tab? | `hasDayTradeAlerts` | checkbox | If enabled, the room will have day trade alerts tab. | muted |  |
| 1180 | User Public Reply? | `usersPublicReply` | checkbox | If enabled, regular user will be able to do reply | muted |  |
| 1187 | Chat Disabled For Trials? | `chatDisabledForTrials` | checkbox | If its set, auto disable the chat (chat disabed) if they are trials | muted |  |
| 1194 | Disable PM For Trials? | `disablePMForTrials` | checkbox | If enabled, trial users will not be able to send private messages | muted |  |
| 1201 | Users Can Delete Own Messages? | `usersCanDeleteOwnMsgs` | checkbox | If enabled, regular users can delete their own messages | muted |  |
| 1208 | Smaller image previews? | `smallerImagePreview` | checkbox | If enabled, the room will have smaller image previews in the chats | muted |  |
| 1215 | Hide Notes Section? | `hideNotes` | checkbox | If enabled, the room will not have the notes tab | muted |  |
| 1222 | Hide Files Section? | `hideFiles` | checkbox | If enabled, the room will not have the files tab | muted |  |
| 1229 | Set Dark Theme As Default? | `darkThemeAsDefault` | checkbox | If enabled, dark theme will be set as default | muted |  |
| 1238 | Preserve Webinar Mode chat? | `saveWebinarModeChat` | checkbox | If enabled, chatlog will be preserved across page reloads | muted |  |
| 1245 | Show Archives? | `showArchivesToUsers` | checkbox | If enabled, users can see the archives on the side bar | muted |  |
| 1252 | Show Archives to specific Presenters | `showArchivesToSpecificPresenters` | textarea | Comma separated list of Presenter emails | plain |  |
| 1258 | Prevent sporadic reconnects? | `disalowSporadicMultiLogins` | checkbox | prevents a user's connection to reconnect multiple times within a short time | muted |  |
| 1265 | Disalow Multi-logins? | `disalowMultiLogins` | checkbox | If enabled, users could can only log in once per room | muted |  |
| 1272 | Send report email? | `sendReportEmails` | checkbox | If enabled, you will get an email to the address below for each incident | muted |  |
| 1279 | Ban IP list | `banIPList` | textarea | Comma separated list of banned IPs | plain |  |
| 1285 | Report emails | `reportEmail` | textarea | Comma separated list of emails to receive abuse reports | plain |  |
| 1290 | Custom JWT Error Message | `customJWTErrorMessage` | textarea | Set a custom JWT error message | plain |  |
| 1295 | Open/Close Room emails | `sendOpenCloseEmail` | textarea | Comma separated list of emails to receive open / close room events | plain |  |
| 1301 | Auto Open Room Time | `autoOpenTime` | textarea | Time in Military EST to automatically OPEN the room. i.e. 7:30 | plain |  |
| 1306 | Auto Close Room Time | `autoCloseTime` | textarea | Time in Military EST to automatically CLOSE the room. i.e. 18:30 | plain |  |
| 1311 | Ignore Auto Open & Close On Weekend | `ignoreAutoOpenCloseOnWeekend` | checkbox | — | — |  |
| 1319 | Alerts Sound Off? | `alertSoundOff` | checkbox | Turn off alert cash register sound by default. Members can always turn it on | muted |  |
| 1326 | Sticky Non-Trade Alerts? | `styckyNonTradeAlert` | checkbox | If enabled, the non-trade alert checkbox in the alert entry will be ON by default | muted |  |
| 1334 | Shared Files Access Case/Case? | `fileAccessCaseByCase` | checkbox | Allow access to the shared drive on a case/case basis | muted |  |
| 1341 | Chat Only Room? | `isChatOnlyRoom` | checkbox | The room will be only text based chat/alerts, no audio/video | muted |  |
| 1350 | Auto Clear Chat? | `chatAutoClear` | checkbox | Chat will clear at 11:45PM EST / 10:45PM Central. | muted |  |
| 1357 | Auto Clear Alerts? | `alertsAutoClear` | checkbox | Alerts will clear at 11:45PM EST / 10:45PM Central. | muted |  |
| 1364 | Overwrite Clear Hour: | `chatAutoClearSpecialHour` | textarea | Overwrite the default 12am clearing time with this hour instead: Enter a number only, example: "3" for 3:00AM est. ALL TIMES ARE EST' | muted |  |
| 1370 | Auto Clear Chat Weekend? | `chatAutoClearWeekend` | checkbox | Chat will clear on Sundays. | muted |  |
| 1378 | Archive Alerts? | `archiveAlertsLog` | checkbox | If enabled, archived alert logs will be available from a link in the room | muted |  |
| 1386 | Archive Chatlog? | `archiveChatLog` | checkbox | — | — |  |
| 1393 | Hide Chatlog from Archive? | `hideChatLog` | checkbox | If enabled, archived chat logs will be hidden for the regular users in the room | muted |  |
| 1400 | Enable alert scheduler? | `hasAlertScheduler` | checkbox | Presenters will be able to schedule sending alerts in the future | muted |  |
| 1409 | Enable VideoPlayer? | `enableVideoPlayer` | checkbox | In room video player | muted |  |
| 1417 | User Chat Screenshots? | `userUploads` | checkbox | If enabled, Users will be able to upload screenshots on the chat | muted |  |
| 1425 | Enable Discord? | `enableDiscord` | checkbox | It will enable Discord | muted |  |
| 1434 | Disable Emojis? | `disableEmojis` | checkbox | If enabled, Users will be able to add emojis using the emoji tool | muted |  |
| 1442 | Enable Rich Text Editor? | `enableRTE` | checkbox | If enabled, Presenter will be able to format their messages using the rich text editor | muted |  |
| 1450 | Enable Reactions? | `enableReactions` | checkbox | If enabled, Users will be able to add reactions to the messages | muted |  |
| 1457 | Enable QA Reactions? | `enableQAReactions` | checkbox | If enabled, Users will be able to add reactions to the QA messages | muted |  |
| 1464 | Enable Edit Messages? | `enableEditMessage` | checkbox | If enabled, everyone will be able to edit their own messages | muted |  |
| 1471 | Enable Edit Alerts? | `enableEditAlerts` | checkbox | If enabled, Presenters will be able to edit alerts | muted |  |
| 1480 | Alert Labels | `alertLabels` | textarea | JSON array of alert labels, i.e. [ { "name": "Day Trade", "hash": "DayTrade", "color": "#9c4537", "bgcolor":"#e8f5f7" }, { "name": "Swing Trade", "hash": "SwingTrade", "color": "#24794f", "bgcolor":"#e8f5f7" } ] | muted |  |
| 1500 | Advanced Search Alerts? | `advancedSearchAlerts` | checkbox | If enabled, will allow advanced search alerts | muted |  |
| 1508 | Enable Delete Log? | `enableDeleteLog` | checkbox | If enabled, will keep track of deleted messages | muted |  |
| 1516 | User Badges? | `enableBadges` | checkbox | If enabled, You can cofigure and set badges next to each user name, like [Gold], etc | muted |  |
| 1523 | Token Badges? | `enableTokenBadges` | checkbox | If enabled, Badges will come from JWT token in this room | muted |  |
| 1531 | Remove token from url | `remToken` | checkbox | If enabled, remove the jwt from the ULR. | muted |  |
| 1539 | Show Badges only to Presenters? | `showBadgesToPresentersOnly` | checkbox | If enabled, You can cofigure and set badges next to each user name, like [Gold], etc | muted |  |
| 1546 | Don't follow Presenters? | `dontFollowPresenters` | checkbox | If enabled, users will not follow Presenters | muted |  |
| 1556 | Disable Stars ? | `disableStarYears` | checkbox | If disabled, users will not see the stars next to user names | muted |  |
| 1566 | Phone Number Required? | `hasRequiredPhoneInLogin` | checkbox | User will need to enter a valid phone number to enter | muted |  |
| 1574 | Show password field? | `showPasswordField` | checkbox | Show password field on the login page | muted |  |
| 1582 | Is Main Room? | `isMainRoom` | checkbox | — | — |  |
| 1589 | Is Archived Room? | `isArchivedRoom` | checkbox | — | — |  |
| 1596 | Is New Room? | `isNewIndicatorOn` | checkbox | — | — |  |
| 1603 | BZ News (DO NOT USE UNLESS YOU HAVE API) | `hasBenzingaNews` | checkbox | You will need an API key from benzinga | muted |  |
| 1611 | Custom Benzinga logo url | `altBenzingaLogoURL` | textarea | Set custom Benzinga logo url | plain |  |
| 1616 | Custom Benzinga link url | `altBenzingaLinkURL` | textarea | Set custom Benzinga link url | plain |  |
| 1623 | Imgur ClientID: | `imgurClientID` | text | — | — |  |
| 1628 | Imgur api key: | `imgurApiKey` | text | — | — |  |
| 1633 | Imgur rapid key: | `imgurRapidKey` | textarea | — | — |  |
| 1638 | X User Access Token: | `xuserAccessToken` | textarea | — | — |  |
| 1643 | X User Access Token Secret: | `xuserAccessTokenSecret` | textarea | — | — |  |
| 1648 | Subscription Plans: | `subscriptionPlans` | textarea | JSON array with subscription plans, i.e. [{ "name": "Basic Plan", "fee": 4.99, "desc": "Basic Plan Description.", "recommended": false }, { "name": "Pro Plan", "fee": 9.99, "desc": "Pro Plan Description.", "recommended": true },] | muted |  |
| 1666 | Stripe Email: | `stripeEmail` | textarea | — | — |  |
| 1672 | Live User stats? | `enableLiveStats` | checkbox | — | — |  |
| 1679 | UserXrefStats? | `collectsUserStats` | checkbox | Only enabled if you need granular Users Stats | plain |  |
| 1688 | API secret | `apiSecret` | textarea | — | — |  |
| 1701 | Slack post URL secret | `slackPostURL` | textarea | — | — |  |
| 1707 | Disable PUSH Alerts? | `diasableFCMAlerts` | checkbox | — | — |  |
| 1715 | Moderator Message: | `modMessage` | textarea | — | — |  |
| 1720 | Positions Iframe Url | `positionsIframeUrl` | textarea | — | — |  |
| 1726 | Enable positions iframe? | `positionsIframe` | checkbox | — | — |  |
| 1734 | Enable Tip Me Button? | `tipMeBtnEnabled` | checkbox | — | — |  |
| 1742 | Tip Me Button Text | `tipMeBtnTxt` | textarea | — | — |  |
| 1747 | Tip Me Button Url | `tipMeBtnUrl` | textarea | — | — |  |
| 1751 | Sales Banner | `salesBanner` | textarea | — | — |  |
| 1756 | Admin panel access list: | `modAdminLoginList` | textarea | put any emails here of admins you want to allow access to the admin panel section. (i.e. "john@example.com","jane@example.com") comma separated list. | muted |  |
| 1764 | Alerts only Room? | `isAlertOnly` | checkbox | Alerts only rooms are just rooms to receve push notifications and nothing else. Don't use this if you don't know what it is!!! | plain |  |
| 1774 | Custom Alert POST | `customClientAlertPostURL` | textarea | POST alerts to this URL endpoint | plain |  |
| 1779 | Custom Alert secret | `customClientAlertPostSecret` | textarea | secret PW for the endpoint above | plain |  |
| 1786 | Strict Browser? | `strictBrowserMode` | checkbox | If YES, Only Chrome, Firefox, and Opera are allowed in (no try anyhow link)... | muted |  |
| 1793 | Disable Chat Flood? | `chatFloodDisabled` | checkbox | — | — |  |
| 1800 | Huge Priv Msg Alert? | `privMessageHugePopup` | checkbox | Some user can't see the private messages, this makes a HUGE popup | plain |  |
| 1809 | OffTopic Channels/Tabs | `hasChannelTabs` | checkbox | This setting adds an OffTopic, channel tabs next to general chat | plain |  |
| 1817 | Auto switch to OffTopic Channels/Tabs? | `autoSwitchToOfftopics` | checkbox | Auto Switch to OffTopic tab | plain |  |
| 1826 | Admin Channels/Tabs | `hasAdminOnlyChannel` | checkbox | This setting adds an admin/presenter dedicated chat tab | plain |  |
| 1836 | Extra Admin Channels | `extraAdminChannels` | textarea | Comma separated list of extra admin channels | plain |  |
| 1844 | Extra Regular Channels | `extraRegChannels` | textarea | Comma separated list of extra regular (anyone can post) channels | plain |  |
| 1850 | Rename "Main Chat" | `altGenChannelName` | textarea | Rename the Main Chat channel to... | plain |  |
| 1855 | Rename "Off-Topic" | `altOffTopicChannelName` | textarea | Rename the Off-Topic channel to... | plain |  |
| 1861 | Chat Tabs With Badges: | `chatTabsWithBadges` | textarea | — | — |  |
| 1882 | Chat Profanity filter? | `hasProfanityFilter` | checkbox | Profanity filter will try to filter (put xxxx) on bad words | plain |  |
| 1890 | Ignore List | `ingnoreBadWordsList` | text | Comma separated list OK words to remove from the filter | plain |  |
| 1895 | Extra Bad list | `additionalBadWordsList` | text | Comma separated list of additional bad words you want to filter | plain |  |
| 1907 | Simplified Note Editor? | `simplifiedEditor` | checkbox | If enabled, the Note Editor will be simplified. | plain |  |
| 1917 | Disable Audio Meter? | `audioMeterDisabled` | checkbox | Turn this on to disable the audio level meter next to the presenter name when they are talking | plain |  |
| 1926 | Hide WebCam in the room? | `hideWebcamForRoom` | checkbox | If enabled, WebCam will be hidden in the room | muted |  |
| 1934 | Record alerts and chat? | `recordChat` | checkbox | — | — |  |
| 1941 | Auto record presenters? | `autoRecord` | checkbox | — | — |  |
| 1947 | Blinking [REC]? | `blinkingRec` | checkbox | — | — |  |
| 1953 | Hide Recordings? | `hideRecs` | checkbox | If enabled, recordings will be hidden in archives | plain |  |
| 1961 | Recording Reminder If Speaking? | `recordingReminder` | checkbox | If enabled, will show recording reminder popup | plain |  |
| 1969 | Show Recordings tab in the room? | `recsInRoom` | checkbox | If enabled, will show recordings tab in the room | plain |  |
| 1977 | Disable download button for Recordings for users? | `downloadRecordingsDisabled` | checkbox | If enabled, will disable download button for Recordings for users | plain |  |
| 1986 | Disable Closed Captioning? | `hasSpeechRecognitionDisabled` | checkbox | If enabled, will disable closed captioning for the room | plain |  |
| 1994 | Hide recordings info for users? | `dontShowRecInfoToUsers` | checkbox | If enabled, will hide recording info for users | plain |  |
| 2002 | Minutes of recording inactivity? | `runawayRecMinutes` | number | Number of minutes to flag a recording if inactive (runaway). Leave at 0 to disable. | muted |  |
| 2010 | Auto stop recording if inactive? | `runawayRecAutoKill` | checkbox | If enabled, auto stop inactive recordings | muted |  |
| 2018 | Slack url to post | `runawayRecPostURL` | textarea | If set, it will post to this slack url when a recording is flagged as inactive (runaway) | muted |  |
| 2024 | Sticky give Mic/Cam? | `stickyGiveMicAndCam` | checkbox | If enabled, when a presenter gives mic/cam, the setting will stick | plain |  |
| 2032 | Overlay userID on screenshare? | `overlayUserIdOnScreenshare` | checkbox | If enabled, it will overlay userID on screenshare | plain |  |
| 2040 | Auto give Mic/Screen to Users? | `regUserCanPresent` | checkbox | If enabled, ALL regular users will have mic/screenshare in the room. ***** CAREFULL ****** | plain |  |
| 2048 | Don't stop on mute? | `dontStopRecOnMicMute` | checkbox | Don't auto stop the rec on mic mute | plain |  |
| 2056 | Individual Volume Controls? | `individualVolumeControls` | checkbox | Individual volume controls for each Presenter | plain |  |
| 2065 | NEW recording procedure? | `remote_recording` | checkbox | new experimental serverside rec control, more reliable? | plain |  |
| 2074 | Save Recs to AWS S3 | `saveRecsToS3` | checkbox | — | — |  |
| 2080 | S3 Key ID/Name | `s3KeyID` | text | — | — |  |
| 2085 | S3 Key Secret | `s3KeySecret` | text | — | — |  |
| 2089 | S3 Bucket | `s3Bucket` | text | — | — |  |
| 2093 | S3 Bucket subfolder/path | `s3BucketFolderPath` | text | — | — |  |
| 2100 | Save Recs to Vimeo | `saveRecsToVimeo` | checkbox | — | — |  |
| 2106 | Vimeo ClientID | `vimeoClientID` | text | — | — |  |
| 2111 | Vimeo Secret | `vimeoClientSecret` | text | — | — |  |
| 2115 | Vimeo Token | `vimeoToken` | text | — | — |  |
| 2119 | Vimeo Folder ID (optional) | `vimeoFolderPath` | text | — | — |  |
| 2124 | Broadcast using OBS? | `obsBroadcastRoom` | checkbox | — | — |  |
| 2130 | OBS Stream Key | `obsStreamKey` | text | — | — |  |
| 2134 | OBS Stream Satus WebHook URL | `obsStreamSatusWebHookURL` | text | — | — |  |
| 2138 | Restream URL | `restreamToURL` | text | — | — |  |
| 2142 | Restream Key | `restreamToURLKey` | text | — | — |  |
| 2148 | Custom Rec Params | `x264_encArgs` | text | — | — |  |
| 2154 | Twillio SID | `twillioApiSID` | text | — | — |  |
| 2158 | Twillio Token | `twillioApiToken` | text | — | — |  |
| 2162 | Twillio Phone | `twilioPhone` | text | — | — |  |
| 2167 | Protexting Token | `protextingSecretTok` | text | — | — |  |
| 2171 | Protexting GroupID | `protextingGroupIDs` | text | — | — |  |
| 2176 | Use h264 codec? | `h264Enabled` | checkbox | — | — |  |
| 2183 | Use VP9 codec? | `vp9Enabled` | checkbox | — | — |  |
| 2191 | Use HQ Video? | `hqVideo` | checkbox | Experimental better vid quality on vp8 | plain |  |
| 2199 | Custom Player URL | `customPlayerURL` | text | If set, it will always show an iframe with this url in the screens section | muted |  |
| 2209 | Iframe Cookie Fix? | `iframeSSOTFix` | checkbox | — | — |  |
| 2219 | Autoreset sess at 12am? | `autoResetSession` | checkbox | — | — |  |
| 2225 | Don't Soft reset at 12am? | `doNotAutoSoftReset` | checkbox | — | — |  |
| 2235 | New FCM Method? | `sendFcmAlertsNew` | checkbox | — | — |  |
| 2245 | PTR app exp days | `ptrMobileAppExpirePairCodeDays` | number | — | — |  |
| 2253 | Push expire days | `mobileAppExpireNotificationsDays` | number | — | — |  |
| 2262 | Custom Legal Disclosure | `customEnterDisclosure` | textarea | If set, Users will need to agree to thisDisclosure to enter. | muted |  |
| 2268 | Custom User Info Page | `customUserInfoURL` | text | — | — |  |
| 2274 | Scheudle ID (GCal) | `stAppScheduleID` | text | — | — |  |
| 2279 | Invalid Tokens | `invalidTokens` | textarea | Comma separated list of invalid JWT tokens. | muted |  |
| 2292 | Use v3? (DON'T!) | `useV3` | checkbox | — | — | YES |
| 2299 | Use v5? (DON'T!) | `useV5` | checkbox | — | — | YES |
| 2315 | ClusterID | `clusterID` | text | — | — | YES |
| 2318 | Backup ClusterID | `backupClusterID` | text | (In case the main clusterID is down, this is the backup, soft reset required for changes to take effect) | muted | YES |
| 2327 | Super ClusterID | `superClusterID` | text | (Super cluster, if this is set, we will use the new supercluster scaling logic to scale the session across the super cluster) | muted | YES |
| 2332 | Super Cluster Expected Server Count | `superClusterExpectedServerCount` | number | (Expected number of servers needed to handle the session) | muted | YES |
| 2338 | Use FFmpeg for Recording (BETA) | `useFFmpegRecording` | checkbox | — | — | YES |
| 2344 | Use Less busy server algo vs round robin | `useLessBusyVsRoundRobin` | checkbox | — | — | YES |
| 2351 | Use MediaMTX? | `useMediaMTX` | checkbox | — | — | YES |
| 2357 | MediaMTX ClusterID | `mediaMTXClusterID` | text | — | — | YES |
| 2361 | Backup MediaMTX ClustterID | `backupMediaMTXClustterID` | text | — | — | YES |
| 2374 | ScreenShare MAX BitRate | `media_max_bitrate` | text | (i.e. 1024000,512000,254000) | muted | YES |
| 2380 | ScreenShare KeyFrame Rate (i.e. 5, 10, 15) | `media_fir_rate` | text | (Session restart required for changes to take effect) | muted | YES |
| 2395 | Enable FB Live/YouTube Live | `hasYTStreaming` | checkbox | — | — | YES |
| 2411 | Repeater List | `media_relays` | textarea | (Comma separated list op IPs IE: localhost\|127.0.0.1,somehostname\|10.10.10.10) | muted | YES |
| 2431 | Lock Session? | `isLocked` | checkbox | If session is locked, nobody will be able to log in... | muted | YES |
| 2438 | Talk URL | `chatServerURL` | textarea | Used to clusterize the chat server | muted | YES |
| 2446 | Force JPG Screens | `force_jpeg_screenshare` | checkbox | — | — | YES |
| 2452 | Force MP3 Audio | `force_mp3_audio` | checkbox | — | — | YES |
| 2458 | Node Repeater List | `node_media_relays` | textarea | (Comma separated list op IPs IE: localhost\|127.0.0.1,somehostname\|10.10.10.10) | muted | YES |
| 2466 | Node Websocket Repeater List | `node_ws_media_relays` | textarea | (Comma separated list op IPs IE: localhost\|127.0.0.1,somehostname\|10.10.10.10) | muted | YES |
| 2475 | Alt VendorJS | `altCodeVendorJS` | textarea | (name if alt vendorJS. ie. 'vendor2.min.js' | muted | YES |
| 2483 | Alt AppJS | `altCodeAppJS` | textarea | (name if alt vendorJS. ie. 'app2.min.js' | muted | YES |
| 2492 | Alt JanusJS | `customJanus` | textarea | (name if alt janusJS. ie. 'janus4.js' | muted | YES |
| 2500 | Alt Room.js | `alt_roomjs` | textarea | (name if alt Room.js. ie. 'RoomRemoteRec.js' | muted | YES |
| 2509 | Alert filter list for mods: | `modAlertFilterList` | textarea | i.e. [{"username":"John","avatar":"john@example.com"}] | muted | YES |
| 2515 | Custom CSS | `customCSS` | textarea | Custom CSS to custimize colors, etc... | muted | YES |
| 2520 | Dark Theme Style | `darkThemeStyle` | textarea | Dark theme style to custimize colors. | muted | YES |
| 2525 | Hide Logo | `hideLogo` | checkbox | — | — | YES |
| 2531 | Hide Powered By | `hidePoweredBy` | checkbox | — | — | YES |
| 2539 | Linked Rooms for alerts | `linkedRoomAlerts` | textarea | Comma (,) separated list of Room IDs of the rooms to PUSH our alerts to | muted | YES |
| 2545 | Linked Rooms for Swing Alerts | `linkedRoomSwingAlerts` | textarea | Comma (,) separated list of Room IDs of the rooms to PUSH our swing alerts to | muted | YES |
| 2551 | SessionID to load swing alerts from | `linkedRoomSwingAlertsOther` | textarea | Session ID to load swing alerts from | muted | YES |
| 2557 | Linked Rooms for Day Trade Alerts | `linkedRoomDayTradeAlerts` | textarea | Comma (,) separated list of Room IDs of the rooms to PUSH our day trade alerts to | muted | YES |
| 2563 | SessionID to load day trade alerts from | `linkedRoomDayTradeAlertsOther` | textarea | Session ID to load day trade alerts from | muted | YES |
| 2570 | Linked Rooms for Recordings | `linkedRoomRecordings` | textarea | Comma (,) separated list of Session IDs of the rooms to load recordings from | muted | YES |
| 2579 | Other Room API Secret: | `linkedStreamsAPIKey` | textarea | — | — | YES |
| 2591 | Enable PTR app? | `ptrMobileAppEnabled` | checkbox | — | — | YES |
| 2599 | App for Free trials? | `freeTrialsGetApp` | checkbox | — | — | YES |
| 2606 | Custom App? | `customMobileAppEnabled` | checkbox | — | — | YES |
| 2613 | Custom app String | `customMobileAppV3Name` | textarea | — | — | YES |
| 2618 | Custom iOS App URL | `customMobileAppIOSUrl` | textarea | — | — | YES |
| 2622 | Custom Android App URL | `customMobileAppAndroidUrl` | textarea | — | — | YES |
| 2626 | Custom App launch Word | `customMobileAppLaunchWord` | textarea | — | — | YES |
| 2630 | Hide Mobile Credentials? | `hideMobileCredentials` | checkbox | If enabled, it will hide mobile credentials | muted | YES |
| 2639 | App for Some Members? | `ptrMobileAppCaseByCaseEnabled` | checkbox | — | — | YES |
| 2648 | NQ News URL | `nqNewsFeedURL` | textarea | — | — | YES |
| 2654 | Random UDP port fix? | `generateRandomUDPPort` | checkbox | — | — | YES |
| 2661 | Streaming Threads? | `streamingThreads` | checkbox | — | — | YES |


---

## B. The account / owner surface

Route: `#/page/welcome` (`ptr-dump-member-1786232518250.json` → `meta.href`). This single page is
both the signed-out login panel and, when signed in, the whole account console. Source:
`TIER1-fetched/views/page.welcome.html`; rendered: `evidence-dumps/login-page/logged-in-page`.

**Top navigation** (`logged-in-page:75–86`), shown on `login.isLoggedIn`:

- **Account** → `#/page/welcome`, `tooltip="Account Settings"`, `fa fa-cog`
- a power-off icon → `doLogout()`, `tooltip="Logout"`

That is the entire signed-in nav. There is no billing link, no team link, no settings page above the
room.

### B.1 — Sessions (rooms) list

`page.welcome.html:333–400`

| control | detail |
|---|---|
| heading | `Total ` + `<span ng-click="showNewRoom=showNewRoom+1;">Sessions</span>` + `: {{login.sessions.length}}` |
| search | `ng-model="sessSearch"`, `placeholder="search"` |
| **Show / Hide Archived** | `toggleArchivedRooms()`; the word flips on `showArchivedRooms` |
| column **Session ID** | sortable, `sortByUUID()` |
| column **Name** | sortable, `sortByName()` |
| column **State** | `{{s.currentState \|\| 'open'}}` as `label-orange`, or `archived` as `label-warning` when `s.isArchivedRoom` |
| column **Users** | `{{s.current_capacity}} / {{s.recordedMaxCapacity}}` |
| column **Actions** | **Launch** → `/session?id={{s.uuid}}&jwtSite={{tokSite}}` (new tab); **Manage** → `#/page/manageSession/{{s._id}}`; **Marketplace** → `manageMarketplaceSession(s._id, s)`, `ng-hide="disableMarketplace"` |
| hidden row detail | `<div ng-show="showNewRoom"><muted>( {{s._id}} - ownerID: {{s.ownerdID}}</muted> )</div>` — one click on the word "Sessions" reveals the Mongo id and the owner id (typo `ownerdID` is the reference's) |
| **New Room** | `createNew()` — **`ng-show="showNewRoom>=5"`**. Room creation is gated behind clicking the word "Sessions" five times. |

A **Stats** link per row exists but is commented out (`page.welcome.html:388`):
`<a href="#/page/stats/{{s._id}}" class="btn btn-sm btn-warning"><i class="icon fa fa-list"></i> Stats </a>`.

Live values from the member capture: one session, `uuid` **3627**, `_id`
`6a6529b318781e20ed81947d`, `ownerID` `6a6529b318781e20ed81947c`, name `Tarzan` in the member dump
and `Room 3627` in the in-repo render, state `open`, users `0 / 0` and `0 / 2` respectively. The
Launch href carries a live `jwtSite` JWT — `[REDACTED]`.

### B.2 — Badges

`page.welcome.html:402–1217`

| control | detail |
|---|---|
| **Add New Badge** | toggles the editor panel (`showAddBadge`) |
| **Upload Image Badge** | `ngf-select` + `ngf-change="onImageSelect($files, '')"` — an image badge instead of a text one |
| **Export Badges** | `exportBadges()`, shown only when `badgesList` |
| empty state | `No Badges defined` |
| table | `Badge` (its `<th>` carries `ng-dblclick="showBadgeID=!showBadgeID;"` — double-click reveals each badge's `_id`) and `Actions` |
| row actions | **Edit** `editBadge(_id, text, bkcolor, color, roles, name, imgURL)` · **Delete** `deleteBadge(_id, text, imgURL)` · **Dark Theme** `addBadgeDarkTheme(_id, text, imgURL, darkTheme)`, which renders the paired dark-theme badge inline beside it |

Editor panel — title **New Badge** on `badges.mode=='add'`, **Edit Badge** on `=='edit'`; a live
**Preview:**; then:

- **Background:** `<input type="color" ng-model="badges.bkcolor">` and a **Transparent** button
  setting `rgba(1,0,0,0)`
- **Text:** `<input type="color" ng-model="badges.color">`
- **Badge Text:** `#badgeInputTxt`, default `value="TEST"`, with an emoji picker button
  (`#emoji-picker`) opening a six-group Intercom picker (Frequently used / People / Nature /
  Objects / Places / Symbols)
- **Name:** `#badgeNameTxt`, `placeholder="Badge Name"`
- **Auto assign this badge to this WP roles (comma separated):** `#badgeRolesTxt`, a
  `cols=70 rows=2` textarea — WordPress role names auto-grant the badge
- submit **Add {{badges.text}}** / **Save Edit for {{badges.text}}**, plus **Close**

The colour-and-image parts hide when the badge has an `imgURL`.

### B.3 — Extra Admin Users

`page.welcome.html:1219–1305`

| control | detail |
|---|---|
| **Add Admin User** / **Close Add Admin User** | toggles `showAddAdminUser` |
| form | **Name** (`adminUser.name`, `placeholder="Enter name"`, required) · **Email** (`type=email`, required) · **Password** (`type=password`, required) |
| submit | **Add Admin User** → `addAdminUser()` |
| cancel | resets to `{name:'',email:'',password:'',perms:{}}` — a `perms` object exists in the model, but **no permission control renders anywhere in this form** |
| table | `Name`, `Email`, `Added` (`au.created \| date:'short'`), `Actions` |
| row action | **Remove** → `removeAdminUser(au._id, au.name)` |
| empty state | `No admin users added yet` |

This is the reference's entire idea of "more than one person can administer this account": name,
email, password, remove. No roles, no scoping to particular rooms, no audit.

### B.4 — API Keys

`page.welcome.html:1307–1357`

| control | detail |
|---|---|
| **New Api key** | `createApiKey()` |
| **API Docs** | `/public/html/api-docs.html?src=/public/html/API_Documentation.md`, new tab |
| table | `_id`, `secret` (`{{k.apiSecret}}` — the secret is displayed in the clear, permanently), `Actions` |
| restriction indicator | `<i class="fa fa-lock text-warning" title="Restricted">` shown when `k.restrictToSessions.length` or `k.restrictToEndpoints.length` |
| row actions | **regen secret** `rotateApiKey(k._id)` · **restrictions** `manageApiKeyRestrictions(k)` · **delete** `deleteApiKey(k._id)` |
| empty state | `No API keys yet` |

The member capture shows one key, `_id` `6a6e9fc77fc2687b623d4431`, secret `[REDACTED]`.
`manageApiKeyRestrictions` opens something that is **not in any capture** — see §G.

### B.5 — The signed-out panel, on the same route

`page.welcome.html:1363–1412`: `Login to your ProTradingRoom.com account`, email, password,
**Forgot your password?** → `#/page/forgot-password`, a reCAPTCHA that appears only on
`failedLoginCount >= 3` (sitekey `6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx`), **Login** →
`submitLogin()`, and a `Logging In, please wait...` spinner.

Footer on every page: `© {{app.year}} {{app.name}}`.

### B.6 — Other account-level routes that exist

- `#/page/stats/{id}` — `TIER1-fetched/views/page.stats.html`. One live panel: **Historical** with a
  Hourly/Daily/Weekly/Monthly `<select>` (whose four `<option>`s all carry `value="hourly"` — the
  reference's own bug), a `<flot>` chart over `userStatsData`, and a **Download** link to
  `/users/v1/sessions/stats/{{sessionID}}/{{tok}}` with `download="{{sessionID}}.json"`. Everything
  else in the file — a Realtime panel, Bar and Pie charts — is commented out. The link to this page
  is itself commented out on the account page.
- `page.recordings` — `page.recordings.html`. Heading **Recordings**, a list of
  `{{rec.created}} · {{rec.length/60000}} Minutes`, a `<video controls width=640>`, **Download** and
  a **Share** button whose `href` is empty. Also commented out of the account page (`page.welcome.html:398`).
- `/public/html/api-docs.html` — `evidence-dumps/login-page/api-docs`, title **API Documentation**,
  headings `Sessions API Documentation` / `Overview` / `Authentication` / `Rate Limiting`.
- `/public/html/POST_ROUTE_API_DOCUMENTATION.md` — `TIER1-fetched/api-post-routes.md`, 728 lines,
  twelve endpoints: Post to Chat, Post to Alerts, Add Users to Session, Delete Users from Session,
  Badge Management, User Statistics, User List, Chat Logs, Alert Logs, Deleted Logs, Archived Logs,
  Session Recordings. Auth is `sessionID` + `secret` in the JSON body. Error responses documented:
  403 Forbidden and 503 Service Unavailable.

---

## C. Registration and onboarding

Route: `#/page/register`. Source: `TIER1-fetched/views/page.register.html`; rendered:
`evidence-dumps/register-page/register-page-file:103–146`.

Heading: **Create your ProTradingRoom account**. The whole form:

| field | binding | type | placeholder |
|---|---|---|---|
| full name | `signup.name` | text | `Your full name` |
| email | `signup.email` | email | `Your email` |
| password | `signup.pass` | password | `Your password` |
| repeat password | `signup.pass2` | password | `Type your password again` |
| reCAPTCHA | — | `g-recaptcha`, sitekey `6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx` | — |
| terms | `signup.agreeTOSChk` | checkbox | label `I agree with the ` + a link reading `terms` whose `href` is **empty** |

Submit: **Create account** → `submitSignup()`. Below it: `Already register?` (the reference's typo)
and **Login here** → `#/page/welcome`. A **Forgot your password?** link sits inside the
repeat-password group.

Four fields and a checkbox. **That is the entire onboarding.** No company name, no plan choice, no
billing details, no seat count, no room limit, no invitation code, no email-verification step in the
markup. Runtime flags on the same page (`register-page-file:248–249`):
`__hasPhoneValidation = 'false'` and `__disableMarketplace = 'true'`.


---

## D. Operator / superadmin traces — **there are none**

This is the most consequential finding in the document, so it is stated plainly and the search is
recorded so it can be re-run.

**Nothing in any capture shows a surface above the account.** No PTR-side console, no cross-account
list, no impersonation, no per-client suspension, no plan, no entitlement flag, no quota, no seat
count, no tenant switcher, no billing screen for the operator.

What was searched, and what came back:

| term | in-repo evidence (`evidence-dumps/`, `evidence-page.manageSession.html`) | live captures (`~/Desktop/new-room/{must-match,mising,NEXT-STEP,second-dump}`) |
|---|---|---|
| `superadmin`, `super_admin` | 0 files | 0 files |
| `impersonat` | 0 | 0 |
| `suspend` | 0 | 0 |
| `entitle` | 0 | 0 |
| `tenant` / `tenantId` | 0 | 0 |
| `quota` | 0 | 0 |
| `sysadmin`, `platform admin`, `ptr admin`, `isSuperAdmin`, `platformAdmin`, `ptrAdmin` | 0 | 0 |
| `plan` | hits — every one is `subscriptionPlans` (a per-room JSON textarea) or a CSS class | — |
| `billing` | hits — only `title="Next Billing"` on the per-user Stripe strip | — |
| `subscription` | hits — only the per-user Stripe fields and `subscriptionPlans` | — |

The grep is sound: the same command over the same directories finds `roster` in five files, so the
zero results are real absence and not an unreadable-file artefact.

**The three closest things the reference actually has, none of which is an operator console:**

1. `modAdminLoginList` (line 1756) — "Admin panel access list:", a comma-separated list of emails
   allowed into *that one room's* admin section. Room-scoped, stored as a room setting.
2. **Extra Admin Users** on the account page — extra logins for *that one account* (§B.3).
3. `applyToAllSessions()` (line 2322) and `applyRepeaterToAccount()` (line 2416) — bulk writes that
   fan out across *the signed-in account's* rooms. Account-scoped, not cross-account.

**Two "DON'T!" fields imply an out-of-band operator process rather than a screen.** `useV3` (2295)
and `useV5` (2302) both read `(DON'T TURN THIS ON, If PTR did not clear you for v3!! it will not
work....)`. Being "cleared for v3" is an operator decision, and the mechanism for making it is not in
any capture — it is a phone call or a database edit, not a control.

**A caution about `~/Desktop/new-room/second-dump/db/`.** It is a PostgreSQL schema dump —
`ptr_clone`, PG 17.10, 24 tables, 20 RLS-FORCE tables (`second-dump/db/README.md`). That is **our
own** database, not the original's. The original is MongoDB: every id in every capture is a 24-hex
ObjectId (`6a6529b318781e20ed81947d`) and the page binds `sess._id`. Reading `second-dump/db` as
evidence of the original's data model would be a mistake.

### Conclusion for the control plane

The original's operator console **was never captured, and on this evidence there is no reason to
believe one exists in a form a browser could capture.** The control plane cannot be matched. It can
only be designed. Every operator-level capability this repository already has — listed in §E.4 — is
therefore an addition, not a reproduction, and must be judged on its own merits rather than against
a reference.

---

## E. THE DIFF

### E.1 — Room settings: a verified 1:1

`apps/controller/src/lib/room-settings-schema.ts` declares **269** settings. The reference's rendered
page carries **267** live `saveSessField` fields. Compared as sets:

- **in the reference, missing from ours: 0.**
- **in ours, not a live field in the reference: 2** — `description` and `roomType`.
- `dont-touch` grouping: reference has **49** fields below the `DON'T TOUCH` heading (line 2286);
  our schema marks **49**; the two sets are identical, with **0** disagreements in either direction.

So for the 267 fields the reference actually renders, the verdict on every one is **MATCH** — name,
section and DON'T-TOUCH grouping. The full per-field evidence table is §A.8 above; reproducing all
269 rows a second time here would add length without adding a fact.

Our schema's own header claims "268 room settings extracted … 269 settings total" and "By section:
room-form 3, sso-setup 1, settings 264, branding 1". Recomputed from the file: 269 rows,
`settings` 264, `room-form` 3, `sso-setup` 1, `branding` 1. **The header's arithmetic is correct**:
267 live `saveSessField` fields + `description` = 268 extracted, + `roomType` = 269.

### E.2 — The only two non-MATCH rows

| name | locator in the reference | in our schema? | rendered by us? | verdict |
|---|---|---|---|---|
| `description` | `evidence-page.manageSession.html:636` — `<div text-angular ng-model="sess.description">`, saved by `htmlDescChanged()` at line 634 | yes, `section: branding`, `type: html` | yes — Branding tab, `+page.svelte:2256` | **MATCH.** It is a real live control; it simply does not go through `saveSessField`, which is why a `saveSessField` count alone misses it. Not EXTRA-OURS. |
| `roomType` | `evidence-page.manageSession.html:30–37` — present but **entirely inside an HTML comment**. Its editor does not render, and no captured room carries a value for it. | yes, `section: room-form`, `type: select` | yes | **EXTRA-OURS.** The schema header names it honestly: "1 reviewed product deviation (roomType) is added". It is the deliberate exception, not an oversight. Note the page still *reads* `sess.roomType` at line 39 to gate the webinar Date field, so the value exists in the data model even though the control is commented out. |

**`roomType` is the only invented setting in the entire 269.** That was searched for deliberately —
see §F.

### E.3 — Everything else on the Manage page

| reference control | ours | verdict |
|---|---|---|
| tab strip: Users · Text List · Branding (Logo / Landing Page) · SSO Setup · User Stats · Settings | `ALL_TABS`, `+page.server.ts:85–93`, same six labels in the same order, plus a seventh entry `marketplace` explicitly flagged `strip: false` so it never appears in the strip | **MATCH** — and the `strip: false` flag is the honest handling of a button that has no captured destination |
| `Text List` gated on `sess.twillioApiToken`; `SSO Setup` gated on `authMode=='sso'`; both still emitted as hidden `<li>` | same, with the reasoning recorded at `+page.server.ts:62–83` — including why the SSO gate is `=='sso'` and **not** the `isSsoMode` helper that folds in `jwt` | **MATCH** |
| Settings tab split at the `DON'T TOUCH` heading, toggled by the word TOUCH | `dontTouchShown`, `+page.svelte:57` and `:3024`; `settingsDontTouch` filter at `:421` | **MATCH** |
| Export Settings · Load Settings From Room | `exportSettings` and a `loadSettingsFromRoom` form, `+page.svelte:2794–2827` | **MATCH** |
| Wordpress shortcode span | `data.wordpressShortcode`, `+page.svelte:2836` | **MATCH** |
| Users-tab filters (Free Trials / BANNED / Chat Muted / Mobile / Non-Mobile / Presenters / Marketplace Users) | rendered as `?filter=` links, `+page.svelte:1290–1297` | **MATCH** |
| User Stats CSV export | our own route `account/rooms/[id]/stats.csv/+server.ts` | **MATCH** in capability |

### E.4 — EXTRA-OURS above the account level

Everything in this table exists in this repository and has **no counterpart in any capture**. Per §D
that is expected — there is nothing to match — but it is recorded here so nobody later mistakes it
for reference behaviour.

| ours | locator | reference counterpart |
|---|---|---|
| `/admin` operator console listing **every** account with per-account user / room / member / badge / API-key counts and system-wide room + open-room totals | `src/routes/(app)/admin/+page.server.ts:43–132` | none |
| three operator roles `read-only` < `support` < `full`, from a comma-separated `SUPERADMIN_EMAILS` env allow-list with `email:role` entries | `src/lib/server/superadmin.ts:54–101` | none |
| 404-not-403 refusal for outsiders **and** for under-privileged operators | `superadmin.ts:136–174` | none |
| console unreachable while impersonating | `superadmin.ts:149–154` | none |
| account **suspend / reinstate** with reason | `admin/+page.server.ts:151–214` | none |
| guardrail: an operator cannot suspend the account they are signed in as | `admin/+page.server.ts:180–184` | none |
| **impersonation** with an `impersonations` row and a redirect into `/account`; ending it is deliberately ungated | `admin/+page.server.ts:223–265` | none |
| `admin_audit` trail — reads fire-and-forget, writes awaited-and-throwing with `before`/`after`/`reason` | `superadmin.ts:196–256` | none |
| `accounts.status` / `suspended_at` / `suspended_by` / `suspended_reason` | `src/lib/server/db/schema.ts:38–66` | none |
| per-account **entitlements** gating `text-list`, `sso`, `mobile`, `marketplace` | `src/lib/server/account-entitlements.ts`, consumed at `rooms/[id]/[[tab]]/+page.server.ts:123–130` | none — the reference gates Text List on a Twilio token and SSO on `authMode`, both per-room settings, never per-account |
| **feature readiness** — a per-setting "nothing consumes this yet" signal surfaced in the UI | `src/lib/features.ts`, `featureReason()` in `+page.svelte` | none |
| room **Archive** button in the account page's row | `account/+page.svelte:652–663` | none as a button. The reference has only the `isArchivedRoom` checkbox on the Settings tab (line 1589) plus the Show/Hide Archived filter — a filter with no way to set what it filters. Recorded as a deliberate divergence in the file's own comment at `:635–645`. |
| **New Room** always visible | `account/+page.svelte:675` | the reference gates it behind `showNewRoom>=5`, i.e. five clicks on the word "Sessions". Flagged in our source as "Deliberate divergence, decided by the owner". |

### E.5 — The honest gap that is not a diff: `wired`

Our schema carries a `wired` flag meaning "something actually consumes this value". **103 of 269 are
wired. 166 are not.** The unwired are stored and rendered faithfully, and today they do nothing.

**This section said "58 wired, 211 not" until 2026-08-29**, and listed those 58 by name. The count
had nearly doubled underneath it. Both the number and the roster below are now regenerated from
`scripts/verify-room-settings-schema.mjs`'s `EXPECTED_WIRED_SETTINGS`, which the schema itself is
checked against on every run — and that verifier now fails if this paragraph disagrees with it, so a
104th wired setting cannot land without this text moving.

Wired (103), alphabetically:

`alertLabels`, `alertSoundOff`, `alertsChatOnBottom`, `alertsOverlayOnScreenshare`,
`allowUsersToChangeUsername`, `allowedMemberships`, `allowedPerms`, `allowedProducts`,
`altBenzingaLinkURL`, `altBenzingaLogoURL`, `altChatRender`, `alwaysShowRoster`, `autoRecord`,
`autoSwitchToOfftopics`, `beepOnUserJoin`, `blinkingRec`, `chatDisabledForTrials`,
`chatTabsWithBadges`, `claimNickName`, `copyTrades`, `customCSS`, `customEnterDisclosure`,
`customFaviconURL`, `customMobileAppAndroidUrl`, `customMobileAppEnabled`,
`customMobileAppIOSUrl`, `customPlayerURL`, `darkThemeAsDefault`, `dingOnNewMessage`,
`disableCopy`, `disableEditingUsername`, `disablePMForTrials`, `disableStarYears`,
`dontShowRecInfoToUsers`, `dontStopRecOnMicMute`, `enableBadges`, `enableEditAlerts`,
`enableEditMessage`, `enablePrivateMessageHistory`, `enableQAReactions`, `enableRTE`,
`enableReactions`, `freeTrialsGetApp`, `hasAlertScheduler`, `hasBenzingaNews`,
`hasDayTradeAlerts`, `hasQAOnAlerts`, `hasRequiredPhoneInLogin`, `hasSpeechRecognitionDisabled`,
`hasSwingTradeAlerts`, `hasTypingIndicator`, `hideAppInfo`, `hideAvatars`, `hideChatAlerts`,
`hideChatLog`, `hideFiles`, `hideMobileCredentials`, `hideNotes`, `hidePoweredBy`, `hideRecs`,
`hideWebcamForRoom`, `hideWelcomeTo`, `individualVolumeControls`, `isChatOnlyRoom`,
`loginErrorMsg`, `loginErrorURL`, `modAlertFilterList`, `modMessage`, `name`, `nickFilter`,
`onlyPresentersVisibleToViewers`, `overlayUserIdOnScreenshare`, `overwriteCashRegisterSound`,
`positionsIframe`, `positionsIframeUrl`, `presenterMsgsOnTheRight`, `ptrMobileAppEnabled`,
`recordingReminder`, `rosterCountVisibleToViewers`, `rosterVisibleToViewers`,
`showArchivesToSpecificPresenters`, `showArchivesToUsers`, `showBadgesToPresentersOnly`,
`showOnlyUsernames`, `showPasswordField`, `simUserCount`, `simplifiedEditor`, `ssoJWTSecret`,
`styckyNonTradeAlert`, `tawkPresenterSupport`, `tipMeBtnEnabled`, `tipMeBtnTxt`, `tipMeBtnUrl`,
`tokenExpiresIn`, `useMediaMTX`, `userJoinAndLeavePopup`, `userPM`, `userToPresenterPM`,
`userUploads`, `usernameInstructions`, `usersCanDeleteOwnMsgs`, `usersPublicReply`, `webinarPW`.

The 166 unwired include every recording destination (`saveRecsToS3` and the four S3 fields,
`saveRecsToVimeo` and the four Vimeo fields), every streaming field (`obsBroadcastRoom`,
`obsStreamKey`, `restreamToURL`, `restreamToURLKey`, `hasYTStreaming`), every SMS field
(`twillioApiSID`, `twillioApiToken`, `twilioPhone`, `protextingSecretTok`, `protextingGroupIDs`),
most of the channels group (`hasChannelTabs`, `hasAdminOnlyChannel`, `extraAdminChannels`,
`extraRegChannels`, `altGenChannelName`, `altOffTopicChannelName`), the profanity filter
(`hasProfanityFilter`, `ingnoreBadWordsList`, `additionalBadWordsList`), every linked-room push
(`linkedRoomAlerts`, `linkedRoomSwingAlerts`, `linkedRoomSwingAlertsOther`,
`linkedRoomDayTradeAlerts`, `linkedRoomDayTradeAlertsOther`, `linkedRoomRecordings`,
`linkedStreamsAPIKey`), all 49 DON'T TOUCH fields, and `apiSecret`.

> **Superseded 2026-08-29.** This paragraph read *"The 211 unwired …"* and listed
> `chatTabsWithBadges` inside the channels group. It has been wired since — `chat-tabs.ts`,
> `ChatTabStrip.svelte` and `AlertChatArea.svelte` all consume it — so the group is now "most of"
> rather than "the whole". The count and the roster above are both checked by
> `apps/controller/scripts/verify-room-settings-schema.mjs`; this sentence was not, and it is what
> the check caught on its first run.

### E.6 — Account-page diff

| reference | ours | verdict |
|---|---|---|
| sessions list: Total Sessions, search, Show/Hide Archived, sortable Session ID + Name, State, Users, Launch / Manage / Marketplace | `account/+page.svelte` — same table, same sorts, same three action buttons (`:628` Marketplace) | **MATCH** |
| the "Sessions" click counter: 1 click reveals `_id` + ownerID, 5 reveal New Room | reproduced, `account/+page.svelte:79` documents it; New Room then made always-visible | **MATCH** on the reveal, **deliberate divergence** on the gate |
| Badges: Add New Badge, Upload Image Badge, Export Badges, per-badge Edit / Delete / Dark Theme, double-click to reveal badge ids, WP-roles auto-assign | `account/+page.svelte:708–1009`; Export Badges is CSV (`:295`) | **MATCH** |
| Extra Admin Users: Name / Email / Password, table with Added, Remove | `account/+page.svelte:1010–1123` | **MATCH** |
| API Keys: New Api key, API Docs, `_id` + `secret` table, regen secret / restrictions / delete, `title="Restricted"` lock | `account/+page.svelte:1124–1290`, including a **Restrictions** panel at `:1251` | **MATCH** on the list; our restrictions editor is **EXTRA-OURS in detail** — the reference's `manageApiKeyRestrictions` target was never captured (§G) |
| account-level `#/page/stats/{id}` and `page.recordings` | not built | **MISSING** — both are commented out of the reference's own account page, so nothing links to them there either |

---

## F. VERIFICATION — the negative controls

Four things were expected, checked for, and are reported with what actually happened. Two of the four
came back the opposite of the expectation.

**F.1 — Expected: the fetched source template would contain fields the rendered DOM had dropped.**
A rendered Angular page hides conditional branches, so the server-side template was expected to be a
superset. `TIER1-fetched/views/page.manageSession.html` was compared to
`evidence-page.manageSession.html` by parsing both and differencing the `saveSessField` sets.
**Result: 276 = 276, symmetric difference empty, and the two files are byte-identical
(`a == b` → `True`).** The expectation was wrong; the rendered capture lost nothing. This is why §A
can be asserted from one file.

**F.2 — Expected: a handful of settings would be EXTRA-OURS.** 269 rows written by an extractor over
a year of edits was expected to have accumulated some invented ones. Differenced mechanically against
the reference's live fields. **Result: exactly one — `roomType` — and our schema's own header already
names it as a reviewed deviation. `description` also appeared in the raw difference but is a real
live control (line 636) that simply does not use `saveSessField`, so it is a MATCH, not an
invention.** Better than expected.

**F.3 — Expected: an operator console somewhere in 60 MB of captures.** Twelve terms were searched
across every in-repo dump and four live capture directories (§D). **Result: zero hits for every
operator-level term.** The search was proved sound by running `roster` through the identical command
and getting five files. This is the finding, not a failure to look.

**F.4 — Expected: the DON'T TOUCH grouping would have drifted.** It is a line-position property
(everything after line 2286), which is exactly the kind of thing that rots when a file is
re-extracted. Computed both sides. **Result: 49 = 49, and both directions of the difference are
empty.**

**Tooling ruled out, per the rule that says to.** Two extraction bugs were found and fixed *before*
anything was reported, not after:

- the helper-text extractor first walked forward past the row's closing `</p>` and attributed
  `Loading...` (line 161) to `authMode` and `Choose a start date` (line 665) to `ssoHost`. Both
  fields in fact have no helper. Bounded to the enclosing `</p>` and re-run.
- the same extractor first treated the *next* row's `control-label` as the *current* row's helper.
  Excluded `control-label` and re-run.

Neither was reported as a finding about the reference, because neither was one. Field counts were
taken with `re.finditer` over the parsed file; `grep -c` was not used anywhere in this document.

---

## G. STILL UNCAPTURED — the brief for the next collection script

Each item is a specific capture target, with what is already known and what it blocks. Items 1–5 come
from the reference's own evidence carrying an honest gap; 6–10 are absences established by §D.

**1. `manageApiKeyRestrictions(k)` — the API-key restrictions editor.**
Known: the button exists (`page.welcome.html:1345`), and the lock indicator proves the shape of the
data — `k.restrictToSessions` (array) and `k.restrictToEndpoints` (array), `:1338–1339`. Unknown: the
entire editor. Target: sign in as an account owner, create a key, click **restrictions**, capture the
modal's markup, its computed styles, and the option list for endpoints.
Blocks: our restrictions panel (`account/+page.svelte:1251`) is currently unmatched by evidence.

**2. `manageMarketplaceSession(s._id, s)` — the Marketplace pane.**
Known: the button exists in two places (account row `logged-in-page:476`, manage header line 16), it
is hidden by `disableMarketplace`, and the live page ships `__disableMarketplace = 'true'`
(`register-page-file:249`). The per-user Stripe strip and `subscriptionPlans` prove a marketplace
exists. Unknown: everything the button opens. Target: a tenant with marketplace enabled — this may be
unreachable on the captured account, in which case say so rather than guessing.
Blocks: our `marketplace` tab pane, already flagged `strip: false` for exactly this reason.

**3. The Settings pane under a role that is not the owner.**
`evidence-manage-gaps-2026-08-11.json` records its own failure verbatim: *"gap 11: only 1 fields
found in the Settings pane; the schema expects ~264. The pane may not have finished rendering, or
this role sees fewer."* and *"gap 9: clicking the disclosure revealed no new fields (23 → 23). NOT
captured; do not treat an empty result as evidence."* Target: capture the Settings pane and the
DON'T TOUCH disclosure as **owner**, **presenter** and **admin (non-presenter)** separately, and
record the field count per role. Blocks: knowing whether the reference hides any setting by role at
all — we currently render all 269 to any room owner.

**4. The Users table with rows in it.** Same file: *"gap 5: no user rows found on this page."* Every
per-row control in §A.2 is transcribed from the `ng-repeat` template, never from a rendered row.
Target: a room with a banned user, a muted user, a trial user, a marketplace user and a mobile-paired
user, so every conditional icon and every `ng-show` branch renders at least once.

**5. `bootbox` prompt chrome.** Four handlers open `bootbox` dialogs whose **text** is known from
captured JS but whose **rendering** is not: `openStripeDetails`, `doBatchInvite`,
`actionsWithEmailList` and `updateManyUsersBadgePrompt`. `evidence-manage-gaps-2026-08-11.json`
records a refused click on *"Actions With the Email List"* — correctly refused, it mutates. Target:
capture one bootbox dialog's DOM and computed styles from a non-mutating path so the shell can be
matched once and reused. Also: two stylesheets in that capture are cross-origin and unreadable, so
any rule they carry is missing from every `rules` array.

**6. Whatever "PTR cleared you for v3/v5" actually is.** `useV3` (2295) and `useV5` (2302) say the
operator must clear a client. Unknown: whether that is a screen, a database column, or an email.
Target: ask the owner. This one may have no capture, ever.

**7. Any cross-account view at all.** The single highest-value unknown. Target: if a PTR-staff login
is ever available, capture whatever it lands on. If it is not, record that plainly and stop treating
the control plane as a matching exercise.

**8. Account lifecycle.** No capture shows an account being suspended, closed, downgraded or deleted,
and `accounts` has no visible status anywhere. Target: the states an account can be in and who sets
them. Until then, our `active`/`suspended` pair is a design, not a match.

**9. Plans, entitlements and limits.** Nothing shows a plan, a room cap, a user cap, a storage cap, a
recording-minutes cap, or an overage. `subscriptionPlans` is a per-room JSON textarea for the
*client's own* end-users, not the client's plan with PTR. Target: how PTR bills a client, and what a
client is entitled to.

**10. Billing between PTR and its clients.** `stripeEmail` (1666) and `subscriptionPlans` (1648) are
per-room settings for the tenant's own subscribers. Nothing anywhere describes PTR invoicing the
tenant. Target: the payment relationship one level up.

---

*Written from evidence only. Every claim above carries a file and a line, or says plainly that it
could not be found and where it was looked for.*
