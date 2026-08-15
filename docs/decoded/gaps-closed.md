# Gaps closed — cross-spec pass, 2026-08-15

Closes open items in `swing-alerts.md`, `day-trade-alerts.md`, `recordings.md`, `benzinga.md` and
`mobile-app-decoded.md`. Those five files are **not edited**; this one references them.

Every claim below cites a file plus a byte offset, a JSON path, or a `path:line`. Counts were taken
with Python `str.count()` on the decoded text, never with `grep -c` (a minified bundle is one line).
JSON was parsed, never regexed. Personal names and email addresses from live captures are
`[REDACTED]`; one live credential found verbatim in a public bundle is `[REDACTED — CREDENTIAL]`.

**The reason four previous passes could not close these:** they read the JavaScript bundle, which
answers *client behaviour*. Almost every open item was a *server-data* or *stylesheet* question. The
answers were in the manage-page HTML captures, the browser-computed stylesheet captures, and two
fetched API documents — all of which were already on disk, three of them already inside this
repository.

---

## What was read

### Dumps under `~/Desktop/new-room/`

| file | bytes | what it is | what was read |
| --- | --- | --- | --- |
| `NEXT-STEP/ptr1.json` | 23,539,370 | **manage page**, `protradingroom.com/ptrApp#/page/manageSession/6a628a99731b9f77ae9bf505`, room "Room 3625" (`caps[22].meta.url`) | `caps[0].fullDom.nodes` — all 2,156 nodes, `truncated:false`; `caps[22].meta.styleSheets[0..14]` in full |
| `NEXT-STEP/ptr2.json` | 9,414,539 | `#/page/welcome`, member, 2026-07-24 | `caps[4].meta` (url, role, 15 stylesheets) |
| `NEXT-STEP/run2/welcome-run2.json` | 35,344,912 | `#/page/welcome`, recording timeline t1–t9 | cap labels + `caps[10].meta` (317 bytes, no url) |
| `NEXT-STEP/run3/welcome-run3.json` | 15,038,002 | `#/page/welcome`, 2026-08-01 | `caps[4].meta`, 15 stylesheets |
| `mising/full` | 477,049 | **complete manage-settings HTML** for room `6a6529b318781e20ed81947d`, with `<label class="muted">` help text | read end to end via a 271-match extraction, then the regions at bytes 86,328–255,200 opened and read verbatim |
| `mising/file1` / `mising/file2` | 63,378 / 258,179 | manage Users table / manage tabs | heads read; needle counts taken |
| `must-match/match` | 20,790 | **the manage user row `<tr ng-repeat="user in xrefs">`**, complete | read in full (bytes 0–20,790) |
| `must-match/important`, `must-match/file1` | 258,173 / 256,610 | duplicates of the manage tab HTML | needle counts; `getAppPin` region read |
| `css/complete-app-styles.css` | 685,767 | **complete v4 room CSS** from `chat.protradingroom.com/?id=6a628a99731b9f77ae9bf505`, captured 2026-07-30 — includes Font Awesome **5.8.1** and `styles.d622cb9ed2bbc221.css` | bytes 0–60,000 (FA5), 556,000–562,000 (flash), 588,000–590,500 (benzinga), 656,000–668,000 (swing/day-trade) |
| `alert-section/1.html` | 91,111 | **rendered alerts+chat column with 19 real `<app-st-message>` rows** | bytes 0–2,500 and rows at 9,586 and 14,709 read in full |
| `proroom-ULTIMATE-staff-2026-07-24T12-42-02-part1.json` | 72,007,276 | v4 STAFF room, 58 caps | all 58 cap labels; `caps[0].fullDom` (1,052 nodes); `caps[20]` alerts-logs-modal (13 nodes, read in full); all 17 `gravatar` regions; all email/hash regex sweeps |
| `ptr-member-2026-08-08-20-03-19.json`, `…20-05-43.json` | 8,516 each | member probe runs | **parsed in full** — see below |
| `collect-manage-2026-08-08T20-16-32-687Z.json` | 18,598,311 | manage page, room `6a6529b318781e20ed81947d`, 2026-08-08 | full key walk; all 11 `captures.*.html` blocks (each truncated at 120,000 chars) extracted, 1,005 editable anchors matched |
| `account-page/ptr-dump-member-1786232518250.json` | 929,586 | account page, 922 nodes | full key walk; needle counts |
| `gap-dump/ptr-gaps-static-1785808858372.json` | 171,153 | bundle excerpts | all 23 `sessData` regions read |
| `new/ptr-components-1785884450507.json` | 151,628 | bundle excerpts (`main.d6d3c112b59b7d0d.js`) | all 21 `sessData` regions + the `upload_server` / `postAlert` regions read |
| `docs/source/main.d6d3c112b59b7d0d.js` | 2,887,876 | **older v4 bundle** | all `hideRecs`, `recsInRoom`, `dontShowRecInfoToUsers` regions |
| `docs/source/components/app-presentationarea.full.js` | 176,606 | **beautified** presentation-area component | `archivesAvailableTo` / `getRecordingsUrl` @ 62,838; `onSwingAlertSubmit` @ 96,105; swing row template @ 25,200–27,000; all 10 `vidPath` regions |
| `docs/source/app-st-message.compiled.js` | 57,990 | beautified message component | full `msg.*` field census |
| `docs/source/components/app-room.full.js` | 139,374 | beautified room component | `launchRecordings` @ 81,645 |

### In-repo evidence

| file | bytes | what was read |
| --- | --- | --- |
| `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` | 2,891,205 | globals class @ 976,500–976,900; MD5 class @ 982,430–988,600; `hashEmail` @ 1,026,984 and 1,162,008; `handleServerCmd` cases @ 1,017,003–1,018,700; `getMyMobilePin` @ 1,021,490; mobile modal @ 2,316,000–2,316,400; `getMyPinAndDoInfo` @ 2,528,987 / 2,567,684; swing row @ 1,937,500–1,944,000; `onTradeAlertWeeksChange` @ 1,993,565–1,994,300; full `sessData.*` census |
| `apps/room/docs/source-v4-2026-08-15/styles.ee2a710065b60389.css` | 444,793 | `@keyframes flash` @ 430,183; measured counts for `.fa-`, `.fas`, `.animated`, `day-trade`, `swing` |
| `apps/controller/evidence-dumps/TIER1-fetched/api-post-routes.md` | 20,699 | **read in full, all 729 lines** |
| `apps/controller/evidence-dumps/login-page/api-docs` | 20,632 | HTML stripped to text and read in full |
| `apps/controller/evidence-dumps/TIER1-fetched/views/page.recordings.html` | 1,324 | **read in full, all 27 lines** |
| `apps/controller/evidence-dumps/TIER1-fetched/vendor-animate.css` | 63,376 | `@keyframes flash` @ 1,953 and the `.animated.flash` rule |
| `apps/controller/evidence-dumps/TIER1-fetched/{styles,theme,main}.css` | 218,719 / 232,979 / 2,103 | measured `.fa-` counts; both `theme.css` hits opened |
| `apps/controller/evidence-dumps/NEXT-STEP/gaps/stylesheets.json` | 490,752 | all 15 entries |
| `apps/controller/evidence-dumps/NEXT-STEP/gaps/sheet-10.css` | 25,795 | Font Awesome **4.3.0**; six glyph rules extracted with codepoints |
| `apps/controller/evidence-dumps/NEXT-STEP/gaps/sheet-12.css` | 35,556 | animate.min.css; `@keyframes flash` @ 1,323 |
| `apps/controller/src/lib/server/mobile-pairing.ts` | — | lines 10–257 |
| `docs/MOBILE-APP.md` | — | lines 40–70, 100–130, 280–300, 385–405 |

### Dumps read and found to contain nothing for these gaps

`ptr-member-2026-08-08-20-03-19.json` and `…20-05-43.json` were parsed in full. Both are collector
**probe reports**, not room captures: `.meta` (10 keys), `.role` (4 booleans, all recorded),
`.steps` (4 entries), `.states` (6 groups — `onLoad.mainTabs` length 0, `colours.variables.values`
15 CSS custom properties, `files` `{}`, `sorting` `{}`, `privateChat` all `null`), and `.gaps`
(12 entries). `sessData` count: **0**. They cannot answer anything in section A.

`NEXT-STEP/run2/welcome-run2.json` contains **0** occurrences of every needle in this document.

---

## A. The `sessData` contract

`sessData` is the room-settings document. The manage page binds the same document as `sess.<field>`
via xeditable — `editable-checkbox="sess.hasSwingTradeAlerts"` with
`onaftersave="saveSessField('hasSwingTradeAlerts')"` (`NEXT-STEP/ptr1.json` byte 1,787,200; JSON
path `caps[0].fullDom.nodes[…].attrs`, DOM path `r.0.1.1.0.1.3.1.5.0.0.68.1`). Every key the room
client reads off `globals.sessData` appears under the same name on that page. That name-for-name
correspondence across 100+ keys is the evidence that they are one document.

### A.1 The WRITE side — 268 fields, with live values

Extracted from `NEXT-STEP/ptr1.json` `caps[0].fullDom.nodes` (2,156 nodes, `truncated:false`) by
matching `onaftersave="saveSessField('X')"` and the sibling `editable-*="sess.X"`. Values are the
rendered anchor text for room **6a628a99731b9f77ae9bf505** ("Room 3625"), captured 2026-07-24.
`collect-manage-2026-08-08…json` gives the same fields for room **6a6529b318781e20ed81947d**
("[REDACTED]") but its per-tab `html` is truncated at 120,000 chars and stops at
`customClientAlertPostSecret`.

Only the fields the five specs asked about are tabulated. Control type is the xeditable directive.
Help text is the adjacent `<label class="muted">` read verbatim from `mising/full`.

| key | control | Room 3625 | 2nd room | manage label / help (`mising/full` byte) |
| --- | --- | --- | --- | --- |
| `hasSwingTradeAlerts` | checkbox | `No` | `No` | "Enable Swing Trade Alerts Tab?" / "If enabled, the room will have swing alerts tab." (133,558) |
| `hasDayTradeAlerts` | checkbox | `No` | `No` | "Enable Day Trade Alerts Tab?" / "…day trade alerts tab." (134,241) |
| `hasBenzingaNews` | checkbox | `No` | `No` | **"BZ News (DO NOT USE UNLESS YOU HAVE API)"** / "You will need an API key from benzinga" (170,352) |
| `altBenzingaLogoURL` | textarea | `empty` | `empty` | "Custom Benzinga logo url" (170,956) |
| `altBenzingaLinkURL` | textarea | `empty` | `empty` | "Custom Benzinga link url" (171,461) |
| `recsInRoom` | checkbox | `No` | — | "Show Recordings tab in the room?" / "If enabled, will show recordings tab in the room" (197,724) |
| `hideRecs` | checkbox | `No` | — | "Hide Recordings?" / "If enabled, recordings will be hidden in archives" (196,393) |
| `downloadRecordingsDisabled` | checkbox | `No` | — | "Disable download button for Recordings for users?" (198,407) |
| `dontShowRecInfoToUsers` | checkbox | `No` | — | "Hide recordings info for users?" (199,844) |
| `showArchivesToUsers` | checkbox | `No` | `No` | "Show Archives?" / "If enabled, users can see the archives on the side bar" (140,975) |
| `showArchivesToSpecificPresenters` | textarea | `empty` | `empty` | "Show Archives to specific Presenters" / "Comma separated list of Presenter emails" (141,656) |
| `linkedRoomSwingAlerts` | textarea | `empty` | — | "Linked Rooms for Swing Alerts" / "Comma (,) separated list of Room IDs of the rooms to **PUSH our** swing alerts **to**" (246,061) |
| `linkedRoomSwingAlertsOther` | textarea | `empty` | — | "SessionID to load swing alerts **from**" (246,676) |
| `linkedRoomDayTradeAlerts` | textarea | `empty` | — | "Linked Rooms for Day Trade Alerts" / PUSH-to (247,258) |
| `linkedRoomDayTradeAlertsOther` | textarea | `empty` | — | "SessionID to load day trade alerts **from**" (247,887) |
| `linkedRoomRecordings` | textarea | `empty` | — | "Comma (,) separated list of Session IDs of the rooms to load recordings from" (248,446) |
| `linkedRoomAlerts` | textarea | `empty` | — | PUSH our alerts to (245,395) |
| `freeTrialsGetApp` | checkbox | `No` | — | "App for Free trials?" (250,748) |
| `hideAppInfo` | checkbox | `No` | `No` | "Hide Mobile App Info?" / "If enabled, mobile app info wiil be hidden" *(sic)* (116,666) |
| `ptrMobileAppEnabled` | checkbox | `No` | — | "Enable PTR app?" (250,153) |
| `customMobileAppEnabled` | checkbox | `No` | — | "Custom App?" (251,343) |
| `customMobileAppV3Name` | textarea | `empty` | — | "Custom app String" (251,960) |
| `customMobileAppIOSUrl` | textarea | `empty` | — | "Custom iOS App URL" (252,416) |
| `customMobileAppAndroidUrl` | textarea | `empty` | — | "Custom Android App URL" (252,876) |
| `customMobileAppLaunchWord` | textarea | `empty` | — | "Custom App launch Word" (253,348) |
| `hideMobileCredentials` | checkbox | `No` | — | "Hide Mobile Credentials?" (253,818) |
| `ptrMobileAppCaseByCaseEnabled` | checkbox | `No` | — | **"App for Some Members?"** (254,489) |
| `ptrMobileAppExpirePairCodeDays` | number | `7` | — | "PTR app exp days" (220,041) |
| `mobileAppExpireNotificationsDays` | number | `14` | — | "Push expire days" (220,725) |
| `hasAppPairLink` | checkbox | `No` | `No` | "Pair Link For App?" / "If enabled, it will show the link to pair the app" (130,077) |
| `pairSecretKey` | textarea | `empty` | `empty` | "Pair Secret Key" (130,723) |
| `pairOKRedirect` | textarea | `empty` | `empty` | "Where to send users if the pairing succeeds" (131,762) |
| `pairErrorRedirect` | textarea | `empty` | `empty` | "Where to send users if the pairing fails" (132,313) |
| `useV3` | checkbox | `Yes!` | — | **"Use v3? (DON'T!)"** (223,815) |
| `useV5` | checkbox | `No` | — | **"Use v5? (DON'T!)"** (224,424) |
| `useV4` | — | **field exists but its whole `<p>` is HTML-commented out** | — | see A.2 |

The full 268-field list, in DOM order, is reproducible from `NEXT-STEP/ptr1.json` by the extraction
described above; the 36 rows here are the ones the five specs asked for.

**`upload_server` and `cdn_upload_key` are NOT sessData.** They are hardcoded client constants on
the globals class `AN`, `main.d1d09071be31f1ba.js` byte 976,514–976,700, read verbatim:

```js
this.appVersion="v4.0.1", this.clientVersion="4.0.0",
this.ptr_server="https://chat.protradingroom.com",
this.ptr_server_ws="chat.protradingroom.com",
this.server_prefix="/ptr_app",
this.ipapi_key="",
this.giphy_api_key="[REDACTED — CREDENTIAL]",
this.kt=!1, this.isIOSMobile=!1,
this.upload_server="https://cdn1.protradingroom.com",
this.cdn_upload_key="[REDACTED — CREDENTIAL]",
this.videoOnlyMode=!1, this.viewerOnlyModeLimited=!1, this.viewerOnlyMode=!1
```

`this.upload_server` @ 976,642. **Closes `day-trade-alerts.md` §5 item 7.** The upload call is
`POST ${globals.upload_server}/image/${globals.sessionID}` with header
`Authorization: Client-ID ${globals.cdn_upload_key}`
(`new/ptr-components-1785884450507.json` byte ~7,900, `doImggurUpload`). Two live keys sit in a
public bundle; both are redacted here.

### A.2 `useV4` — it exists and it is switched off in the template

Read verbatim at `mising/full` bytes 223,400–226,400, inside `<div ng-show="donttouchShow">`:

```html
<label class="col-sm-2 control-label">Use v3? (DON'T!)</label>
<a href="" onaftersave="saveSessField('useV3')"  editable-checkbox="sess.useV3" e-title="Use v3?">Yes!</a>
(DON'T TURN THIS ON, If PTR did not clear you for v3!! it will not work....)

<label class="col-sm-2 control-label">Use v5? (DON'T!)</label>
<a href="" onaftersave="saveSessField('useV5')"  editable-checkbox="sess.useV5" e-title="Use v5?">No</a>
(DON'T TURN THIS ON, If PTR did not clear you for v5!! it will not work....)

<!-- <p class="form-control-static">
     <label class="col-sm-2 control-label">Use v4? (DON'T!)</label>
     <a href="" onaftersave="saveSessField('useV4')" editable-checkbox="sess.useV4" e-title="Use v4?">
       {{ sess.useV4 && "Yes!" || "No" }}
     </a>
     (DON'T TURN THIS ON, If PTR did not clear you for v4!! it will not work....)
   </p> -->
```

So: `useV3`, `useV4`, `useV5` are three sibling booleans of the same shape; `useV4`'s control is
commented out; all three live in the operator-only `dont-touch` group. **None of the three occurs in
`main.d1d09071be31f1ba.js`** — measured `useV3` 0, `useV4` 0, `useV5` 0 of 2,891,205 bytes. The v4
client never reads them; they select which client is served.

### A.3 The READ side — 135 keys, measured, in the current v4 bundle

Census of `sessData.<identifier>` over all 2,891,205 bytes of
`apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`: **135 distinct keys, 442 references.**
Full list, alphabetical, with reference counts:

`advancedSearchAlerts`1 `alertLabels`3 `alertSoundOff`1 `alertsChatOnBottom`1
`alertsOverlayOnScreenshare`2 `allRoomsWelcomeMatPW`4 `allowUsersToChangeUsername`1
`altBenzingaLinkURL`4 `altBenzingaLogoURL`5 `altChatRender`6 `alwaysShowRoster`2 `authMode`3
`autoRecord`4 `autoSwitchToOfftopics`2 `backupClusterID`1 `badgesH`9 `banIPList`1 `beepOnUserJoin`6
`blinkingRec`1 `chatDisabledForTrials`2 `chatMode`32 `chatTabsWithBadges`3 `closedTxt`5 `copyTrades`3
`currentState`7 `customCSS`2 `customEnterDisclosure`1 `customFaviconURL`2 `customMobileAppAndroidUrl`1
`customMobileAppEnabled`6 `customMobileAppIOSUrl`1 `customPlayerURL`2 `darkThemeAsDefault`3
`deleteAlertPW`12 `description`2 `dingOnNewMessage`2 `disableCopy`3 `disableEditingUsername`1
`disablePMForTrials`6 `disableStarYears`4 `dontShowRecInfoToUsers`1 `dontStopRecOnMicMute`2
`enableBadges`4 `enableDiscord`3 `enableEditAlerts`2 `enableEditMessage`2
`enablePrivateMessageHistory`1 `enableQAReactions`10 `enableRTE`6 `enableReactions`9
`freeTrialsGetApp`5 `h264Enabled`1 `hasAlertEmails`1 `hasAlertScheduler`3 `hasAlertTwitter`1
`hasAlertTxt`1 `hasBenzingaNews`3 `hasDayTradeAlerts`2 `hasQAOnAlerts`3 `hasRequiredPhoneInLogin`1
`hasSpeechRecognitionDisabled`2 `hasSwingTradeAlerts`2 `hasTypingIndicator`2 `hideAppInfo`2
`hideAvatars`3 `hideChatAlerts`2 `hideChatLog`3 `hideFiles`2 `hideMobileCredentials`1 `hideNotes`2
`hideRecs`2 `hideRoster`1 `hideStreams`1 `hideVideoPlayer`1 `hideWebcamForRoom`1 `hideWelcomeTo`2
`individualVolumeControls`2 `isChatOnlyRoom`1 `isLocked`2 `isNewIndicatorOn`4 `linkedRoomAlerts`1
`loginErrorMsg`3 `loginErrorURL`6 `modAdminLoginList`1 `modAlertFilterList`7 `modMessage`1 `name`3
`needPasswordForUserNotes`2 `obsStreamKey`2 `onlyPresentersVisibleToViewers`4 `openLoginLink`4
`overlayUserIdOnScreenshare`2 `overwriteCashRegisterSound`11 `ownerdID`1 `playChatMessageSoundFor`3
`positionsIframe`3 `positionsIframeUrl`4 `presenterMsgsOnTheRight`12 `presenterSettings`10
`ptrMobileAppEnabled`5 `recPreviewLocation`4 `recordChat`2 `recordingReminder`1 `recsInRoom`2
`restreamToURL`2 `roomID`2 `roomPublicSecret`1 `rosterCountVisibleToViewers`4 `rosterVisibleToViewers`5
`savedSessionPolls`3 `showArchivesToSpecificPresenters`6 `showArchivesToUsers`3
`showBadgesToPresentersOnly`3 `showOnlyUsernames`1 `showPasswordField`1 `simUserCount`2
`simplifiedEditor`1 `smallerImagePreview`6 `streamingPlayerEnabled`1 `strreamingPlayerEnabled`1
`styckyNonTradeAlert`1 `tawkPresenterSupport`2 `tipMeBtnEnabled`1 `tipMeBtnTxt`5 `tipMeBtnUrl`3
`twillioApiSID`1 `useMediaMTX`5 `userJoinAndLeavePopup`5 `userPM`8 `userToPresenterPM`7 `userUploads`5
`usernameInstructions`1 `usersCanDeleteOwnMsgs`1 `usersPublicReply`2 `uuid`3

Note `streamingPlayerEnabled` **and** `strreamingPlayerEnabled` — a three-r typo, both present, one
reference each. Do not silently normalise it.

**This census has exactly one blind spot, and it is enumerated.** `sessData[` computed access occurs
**2 times**, both the same expression: byte 1,010,154 and byte 1,993,773, both
`` sessData[`linkedRoom${e}AlertsOther`] ``. There are no other dynamic key reads.

### A.4 Read but not settable, and settable but never read

**Read by the client, absent from the 268 manage fields** — these are server-derived or runtime:
`badgesH`, `chatMode`, `closedTxt`, `currentState`, `hideRoster`, `hideStreams`, `hideVideoPlayer`,
`ownerdID`, `presenterSettings`, `recPreviewLocation`, `roomID`, `roomPublicSecret`,
`streamingPlayerEnabled`, `strreamingPlayerEnabled`, `uuid`, `hasAlertTxt`, `hasAlertEmails`,
`hasAlertTwitter`. (`hasAlertTxt`/`hasAlertEmails`/`hasAlertTwitter` measured 0 in
`NEXT-STEP/ptr1.json`; they gate the three Post-Alert tabs — `new/ptr-components-…json` byte 30,070.)

**Settable on manage, never read by the v4 client** — measured 0 in the 2,891,205-byte bundle:
`downloadRecordingsDisabled`, `linkedRoomSwingAlerts`, `linkedRoomSwingAlertsOther`,
`linkedRoomDayTradeAlerts`, `linkedRoomDayTradeAlertsOther`, `linkedRoomRecordings`, `hasAppPairLink`,
`pairSecretKey`, `useV3`, `useV4`, `useV5`. (`linkedRoom*AlertsOther` is read — via the computed key
in A.3. The other nine are genuinely unreferenced by the client.)

### A.5 Staff versus member — what is actually established

**No capture in any dump contains a `sessData` payload as delivered to a browser.** `sessData` count
is 0 in the 72 MB staff dump, 0 in both member probes, 0 in the account-page dump. The occurrences in
`gap-dump/` and `new/` are bundle *source text*, not runtime values. So a staff-vs-member value diff
**cannot be produced from these files** and none is asserted.

What the bundle does establish, and it is worth acting on: the client reads secret-bearing keys off
`sessData` with **no role guard at the read site**. `deleteAlertPW` (12 refs) is compared in the
browser — `main.d1d09071be31f1ba.js` byte 2,048,684:

```js
archiveChatDate(e){
  this.appService.globals.sessData.deleteAlertPW
    ? bootbox.prompt({ title:"Please enter the password to delete this alert:", value:"",
        callback: i => { i && (i.trim() === this.appService.globals.sessData.deleteAlertPW
            ? this.appService.sendServerAdminCommand("archiveLogs",{type:"alerts",date:e,channel:""})
            : bootbox.alert("Wrong password!")) } })
    : this.appService.sendServerAdminCommand("archiveLogs",{type:"alerts",date:e,channel:""})
}
```

That is a client-side authority decision on a plaintext secret. `roomPublicSecret` (byte 1,076,181)
is sent as `pw` in the media-server `connectToRoom` frame. `banIPList`, `obsStreamKey`,
`twillioApiSID`, `restreamToURL`, `allRoomsWelcomeMatPW`, `needPasswordForUserNotes`,
`showArchivesToSpecificPresenters` (the full presenter email list, compared client-side at
`app-presentationarea.full.js` byte 62,838) are all read the same way. **Whether the reference server
redacts any of these per role is not in any capture.** If it does not, every member's browser holds
them. Recorded as an honest gap and as a thing our build must not copy.

---

## B. Row shapes, from real data

### B.1 `avt` / `senderAvt` — CLOSED. It is MD5 of the lowercased, trimmed email.

This closes `swing-alerts.md` §6 item 2 and `day-trade-alerts.md` §5 item 5, and it did not need any
real email to be hashed — **the bundle carries its own test vector.**

`main.d1d09071be31f1ba.js`:

- byte **1,026,984**: `hashEmail(e){return e?xi.hashStr(e.trim().toLocaleLowerCase()):""}`
- byte **1,162,008**: `hashEmail(e){return e?rce.V.hashStr(e.trim().toLocaleLowerCase()):""}`
- byte **982,430**: `static hashStr(n,e=!1){return this.onePassHasher.start().appendStr(n).end(e)}` on
  class `xi`, whose `stateIdentity` (byte 986,256) is
  `new Int32Array([1732584193,-271733879,-1732584194,271733878])` and whose `hexChars` is
  `"0123456789abcdef"`
- byte **988,488**, executed at module load:
  `if("5d41402abc4b2a76b9719d911017c592"!==xi.hashStr("hello")) throw new Error("Md5 self test failed.")`
- the same class and the same self-test again in webpack module 9377 at bytes 2,884,223 and 2,890,486

`hashEmail(` occurs 30 times; `hashStr` 6 times.

**Live confirmation, independent of the bundle.** `alert-section/1.html` byte ~13,900 renders a real
message avatar as
`src="https://secure.gravatar.com/avatar/b27c0cfb1c74fb928f5e40ba6711669f?d=mm&s=50"`. That hash is
the MD5 of the lowercased email of the account that produced the capture. Name and email
`[REDACTED]`; the hash is quoted because it is the evidence.

So `avt`, `senderAvt` and the manage page's `gravatar-src-once="user.email"` directive
(`must-match/match` byte ~2,050) are three renderings of one derivation: **the server stores, or
recomputes, `md5(trim(lowercase(email)))`**, and both the swing row and the chat row consume it
directly as the Gravatar path segment.

### B.2 The swing / day-trade row — CLOSED

Read from `docs/source/components/app-presentationarea.full.js` (beautified, byte 25,200–27,000) and
cross-checked against `main.d1d09071be31f1ba.js` bytes 1,937,500–1,944,000. The row's binding block,
verbatim:

```js
Ne(' ', e.symbol, ' '),
Ze(e.direction),
Ne(' ', Ct(10, 12, e.entryDate, 'YYYY-MM-dd hh:mm:ss'), ' '),
Ze(e.entryPrice),
Ze(e.stop),
Ze(e.target),
O(18, e.image ? 18 : -1),
Ze(e.senderName),
z('src', e.senderPic || 'https://secure.gravatar.com/avatar/' + e.senderAvt + '?d=mm&s=30', Mt)
 ('alt', e.senderName)
```

| field | source | note |
| --- | --- | --- |
| `_id` | server | matched by `deleteSwingAlertMsg` / `editSwingAlertMsg` (bundle 1,017,718 ff.) |
| `symbol`, `entryPrice`, `stop`, `target`, `image`, `direction`, `alertTxt` | **client**, trimmed | see B.3 |
| `senderName` | **client** — `user.nick \|\| user.name` | see B.3 |
| `entryDate` | **server only** | 4 occurrences in the bundle, all reads |
| `senderPic` | **server only** | 2 occurrences, bytes 1,937,535 and 1,943,880, both reads |
| `senderAvt` | **server only** | 2 occurrences, bytes 1,937,555 and 1,943,900, both reads |

**`senderPic` takes precedence over `senderAvt`** — `senderPic || gravatar(senderAvt)`. The five
specs describe the gravatar; the fallback ordering is stated here explicitly because a rebuild that
ignores `senderPic` silently drops custom avatars.

### B.3 The swing write payload — CLOSED

`app-presentationarea.full.js` byte 96,105, `onSwingAlertSubmit()`, verbatim:

```js
const h = {
  alertTxt: e, direction: this.swingAlert.direction,
  symbol: i, entryPrice: o, stop: s, target: r, image: a,
  senderName: this.appService.globals.user.nick || this.appService.globals.user.name
};
if (this.swingAlert.edit) {
  sendServerCommand('editSwingAlertMsg', { newSwingAlertMsg: h, swingAlertID: this.swingAlert._id });
  const f = this.formatSwingAlertTxt(h);
  sendServerCommand('editAlertMessageSwing',
    { alertID: this.swingAlert.alertLogID, newAlertMsg: f, swingTradeAlert: !0, txt: this.swingAlert.txtInAlerts });
  this.swingAlert.txtInAlerts = '';
} else {
  sendServerCommand('swingAlertMsg', h);
  sendServerCommand('alertMsg', {
    txt: this.formatSwingAlertTxt(h),
    n: this.appService.globals.user.nick || this.appService.globals.user.name,
    sendTxt: !1, sendEmail: !1, sendTweet: !1, dontPush: !1,
    nonTradeAlert: !1, swingTradeAlert: !0 });
}
```

Note `swingTradeAlert: true` on the mirrored `alertMsg` — the feed mirror is flagged on the wire, not
only inferred from the formatted text. Edit re-associates by `alertLogID`, not by string comparison,
on the **edit** path.

The `swingAlert` / `dayTradeAlert` **form model** fields, censused over the same file:
`image`, `symbol`, `entryPrice`, `stop`, `target`, `direction`, `edit`, `alertTxt`, `_id`,
`alertLogID`, `txtInAlerts` — identical field sets for both features.

### B.4 The `alertsLog` / chat message row — CLOSED

Census of `msg.<identifier>` over the whole of `docs/source/app-st-message.compiled.js` (57,990
bytes, beautified):

| field | refs | meaning, from the read sites |
| --- | --- | --- |
| `_id` | 12 | message id |
| `t` | 9 | timestamp; rendered `date:'short'` in tooltip and `date:'h:mm a'` inline |
| `n` | 8 | display name |
| `uid` | 10 | compared against `globals.user.userXrefID` |
| `rid` | 8 | reply target id |
| `avt` | 15 | MD5 email hash — B.1; also the **mutedUsers key** |
| `pic` | 3 | custom avatar URL, same precedence pattern as `senderPic` |
| `txt` | 16 | body |
| `isA` | 10 | is admin/presenter |
| `isFT` | 1 | is free-trial |
| `isMention` | 5 | |
| `isNew` | 1 | |
| `repl` | 6 | reply object; `repl.n` is the replied-to name |
| `r` | 4 | reactions map, iterated with `keyvalue` |
| `qa` | 3 | Q&A array; each entry has `.uid`, `.isA` |
| `unreadQA` | 1 | |
| `ans` | 3 | answered flag |
| `d` | 1 | |
| `b` | 4 | badges array |
| `bkgColor` | 3 | |
| `fontColor` | 2 | |

**Independently confirmed on the server side.** `TIER1-fetched/api-post-routes.md:386-396` documents
the posted-message response as `{user, email, text, "b":["badge_123"], fontColor, bkgColor, channel}`
— `b`, `fontColor`, `bkgColor` match name-for-name.

`avt` is the muted-users key: `main.d1d09071be31f1ba.js` byte 1,414,754,
`e = e.filter(a => !o[a.avt])` where `o` is `globals.mutedUsers`; and that map is keyed by
`emailHash` at byte 2,076,820,
`addUserToList({[a]:{nick:r, emailHash:a, pic:l}}, "mutedUsers")`. **`msg.avt === user.emailHash`.**

The alert **write** payload is `{txt, n, sendTxt, sendEmail, sendTweet, dontPush, nonTradeAlert,
dontCrossPost}` (`new/ptr-components-…json` byte ~8,900, `postAlert()`).

### B.5 `getSwingAlertsLog` — there are no unread fields

`swing-alerts.md` §6 item 3 asks what the response carries beyond what the client reads. Read
verbatim, `main.d1d09071be31f1ba.js` byte 1,017,718:

```js
case"getSwingAlertsLog":
  if(P("handleServerCmd got getSwingAlertsLog:",i), !i || !i.data) return;
  i.data.reverse();
  this.globals.swingAlertsLog = i.data;
  this.appEventBus.emit("getSwingAlertsLog", this.globals.swingAlertsLog);
  break;
```

The handler touches exactly two properties of the frame: `i.data`. Compare `getAlertsLog` at byte
1,017,003, which additionally reads `i.page` and `i.page_size`. So the swing frame envelope carries
**no pagination and no unread counters**; anything else on a *row* is invisible from the client and
is a server question. That is the complete and final answer this bundle can give.

### B.6 The manage user row (`xrefs`) — real shape, read in full

`must-match/match`, all 20,790 bytes, `<tr ng-repeat="user in xrefs">`:

`_id`, `email`, `userName`, `role` (`0`=Owner, `1`=Presenter when `!nonPresenter` / Admin when
`nonPresenter`, `2`=Participant, `3`=CHAT MUTED, `4`=BANNED), `nonPresenter`, `hasMic`, `hasCam`,
`hasScreen`, `hasAdminChat`, `canEditNotes`, `denyArchivesAccess`, `discordUserId`,
`isMarketPlaceUser`, `badges`, `isFreeTrial`, **`mobilePairCode`**, `phone`, `pw`, `hideUserCount`,
`hidePersInfo`, `inactive`, `restrictPMUser`, `note`, `inviteStatus` (`'pending'`/`'approved'`),
`alerterAppTokens`, `fcmTokens`, `fcmUnreged`.

`denyArchivesAccess` is the same field the room reads in `archivesAvailableTo()` — cross-confirmed
across two independent captures.

---

## C. Recordings

### C.1 The response body — CLOSED, from two independent API documents

`recordings.md` §5 asks for the body of
`{apiROOT}/sessions/v2/archives/recordings/{sessionID}/{sesionToken}`. That exact HTML was **not**
captured. But the underlying `Recording` document is published in full, twice.

`TIER1-fetched/api-post-routes.md:398-428` (`POST /session/recordings`):

```json
{ "_id":"607f1f77bcf86cd799439011", "name":"recording_001.mp4", "namemkv":"recording_001.mkv",
  "sessionID":"xxxxyyyyzzzz", "session_uuid":"abc-123-def", "fpath":"/recordings/session_123",
  "media_server":"media.protradingroom.com", "ms":"media.protradingroom.com",
  "vidPath":"https://media.protradingroom.com/recordings/session_123/recording_001.mp4",
  "length":1800000, "duration":30, "contentType":"mp4",
  "isUpload":false, "isPublic":false,
  "created":"2024-01-15T10:30:00.000Z", "modified":"2024-01-15T11:00:00.000Z" }
```

`login-page/api-docs` (`GET /sessions/recordings`) repeats the same document and names every field:

- `duration` — **Duration in minutes**
- `length` — **Duration in milliseconds**
- `namemkv` — Original MKV filename (for MP4 recordings)
- `ms` — Media server identifier
- `isUpload` — Boolean indicating if this is an uploaded file

plus four behavioural notes: *"Only returns recordings from the last 3 weeks"*, *"Results are sorted
by creation date (newest first)"*, *"Returns empty array if no recordings found"*, *"Upload files have
duration set to 0"*.

**This settles `recordings.md` §2.6.** `page.recordings.html:13` computes
`{{(rec.length/60000) | number:2}} Minutes`; `length:1800000 / 60000 = 30`, and the document's own
`duration` field is `30`. The formula is correct and `length` is milliseconds, confirmed from the
server side rather than inferred.

Every field `page.recordings.html` binds — `rec.created`, `rec.length`, `rec.vidPath`,
`rec.contentType`, `rec.name` — is present in that document, and nothing it binds is absent. **That
is strong evidence the 27-line template is still the renderer for this model.** It is not proof that
the `/sessions/v2/archives/…` URL returns that template; only an authenticated GET can settle that.
See STILL OPEN.

### C.2 Where the URL is built, and both openers — cross-confirmed

`docs/source/components/app-presentationarea.full.js` byte 62,838, beautified:

```js
getRecordingsUrl() {
  return `${this.appService.globals.apiROOT}/sessions/v2/archives/recordings/${this.appService.globals.sessionID}/${this.appService.globals.sesionToken}`;
}
```

`docs/source/components/app-room.full.js` byte 81,645:

```js
launchRecordings() {
  window.open(`${…apiROOT}/sessions/v2/archives/recordings/${…sessionID}/${…sesionToken}`, '_blank');
}
```

The `sesionToken` misspelling is the reference's, in both.

### C.3 `archivesAvailableTo()` — resolved from beautified source

Same file, byte 62,838, immediately above `getRecordingsUrl`:

```js
archivesAvailableTo() {
  return this.appService.globals.isPresenter && !this.appService.globals.isLimitedPresenter
    ? !(sessData.showArchivesToSpecificPresenters &&
        !sessData.showArchivesToSpecificPresenters.includes(globals.user.email))
    : !(!sessData.showArchivesToUsers || globals.user.denyArchivesAccess);
}
```

Note the member branch reads `user.denyArchivesAccess` — the same per-user field carried on the
manage row (B.6). The presenter branch does a **substring** `includes` on a comma-separated email
list, which is a false-positive risk we must not reproduce.

### C.4 `downloadRecordingsDisabled` — where it is enforced

Measured, not searched:

| file | bytes | occurrences |
| --- | --- | --- |
| `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` | 2,891,205 | **0** |
| `~/Desktop/new-room/docs/source/main.d6d3c112b59b7d0d.js` (older v4) | 2,887,876 | **0** |
| `TIER1-fetched/views/page.recordings.html` | 1,324 | **0** (all 27 lines read; no `ng-if`/`ng-hide`/`ng-show` on the Download anchor at line 20) |
| `apps/controller/evidence-dumps/**` | — | present only in manage-page markup (the checkbox itself) |

**Two independent v4 builds, both zero.** The setting exists on the manage page
(`mising/full` byte 198,407, label "Disable download button for Recordings for users?") and is read
by no client in evidence. It can therefore only be enforced by the server that renders the archives
page. Still open only as *which* markup it removes — see STILL OPEN.

Related gates that ARE in the bundle, read verbatim:

- `hideRecs` — gates the **"Recording" link inside the Archives sidebar dropdown**, not the tab:
  `main.d6d3c112b59b7d0d.js` bytes 2,465,344 and 2,561,341,
  `O(6, e.appService.globals.isPresenter || !e.appService.globals.sessData.hideRecs ? 6 : -1)`.
- `recsInRoom` — gates the in-room tab, twice, at bytes 2,014,716 and 2,015,513:
  `O(24, o.archivesAvailableTo() && o.appService.globals.sessData.recsInRoom ? 24 : -1)`.
- `dontShowRecInfoToUsers` — 1 occurrence, byte 2,470,909: it blanks the `[REC]` badge's tooltip.
  `xn("ngbTooltip", sessData.dontShowRecInfoToUsers && !isPresenter || !roomState.recName ? "" : "Recording to: "+decodedRecName())`.
  It does **not** touch the recordings list.

### C.5 The Files row shares the Recording shape

`app-presentationarea.full.js` bytes 45,185–49,900: the Files tab renders `{_id, name, size, created,
contentType, vidPath}` and branches on `contentType.indexOf('image/')` / `'audio/'`. Same `vidPath` /
`contentType` / `name` / `created` names as the Recording document. Recorded because `vidPath` hits in
that file are Files-tab hits, not recordings-tab hits, and confusing them would misattribute the row.

### C.6 The `Recording` model sits beside the rest — named

`api-post-routes.md:692-706` lists the server models: `Session`, `SessionUserXref`,
`SessionTokenXref`, `SessionUserStats`, `ChatLogs`, `AlertLogs`, `SessionDeletedMessages`,
`SessionLogs`, `Recording`, plus `emailHash()` — the same function name whose client-side twin is
resolved in B.1.

---

## D. CSS — every open item closed, from files already in this repository

### D.1 `animated flash` — CLOSED, and the previous lookup pointed at the wrong sheet

`day-trade-alerts.md` §5 item 1 says the keyframes are not decoded and directs a search of
`styles.ee2a710065b60389.css` for `day-trade`/`swing`. Those two return 0 — which is why the item
stayed open. Measured on `apps/room/docs/source-v4-2026-08-15/styles.ee2a710065b60389.css`
(444,793 bytes):

| needle | count |
| --- | --- |
| `@keyframes flash` | **1** — at byte **430,183** |
| `.flash` | 1 |
| `.animated` | **0** |
| `.fa-` | 0 |
| `.fas` | 0 |
| `day-trade` | 0 |
| `swing` | 0 |

Byte 430,183, verbatim:

```css
@keyframes flash{0%{opacity:1}50%{opacity:0}to{opacity:1}}.flash{animation:flash 1s infinite}
```

Confirmed in the browser-computed capture, `~/Desktop/new-room/css/complete-app-styles.css` byte
559,091 (source header: `https://chat.protradingroom.com/styles.d622cb9ed2bbc221.css`):

```css
@keyframes flash { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }
.flash { animation: 1s ease 0s infinite normal none running flash; }
```

**`.animated` has no rule in either v4 sheet** (`.animated` count 0 in both). So
`editDayTradeAlert`'s `classList.add('animated','flash')` produces exactly one effect — an infinite
1s opacity pulse from `.flash` — and `animated` is inert. Reproduce `.flash` alone unless the
`animated` class is being kept for parity, and say which.

**Do not take these keyframes from animate.css.** Three different `flash` definitions exist in the
evidence and only the first applies to v4:

| source | keyframes | selector |
| --- | --- | --- |
| v4 room, `styles.*.css` | `0%:1, 50%:0, 100%:1`, **infinite** | `.flash` |
| v3 ptrApp, `NEXT-STEP/gaps/sheet-12.css` byte 1,323 (= animate.min.css) | `0%,100%,50%:1; 25%,75%:0` | `.flash { animation-name: flash }` |
| `TIER1-fetched/vendor-animate.css` byte 1,953 (animate.css 2013) | same as above | `.animated.flash` |

### D.2 `.fa-` — the "absent from every capture" claim is wrong, and the sheet is in the repo

`recordings.md` §5 states `.fa-` has 0 occurrences in `styles.ee2a710065b60389.css` and 0 in all four
`TIER1-fetched` stylesheets, and that the glyph sheet is in neither capture directory. Measured:

| file | bytes | `.fa-` |
| --- | --- | --- |
| `styles.ee2a710065b60389.css` | 444,793 | 0 ✔ |
| `TIER1-fetched/styles.css` | 218,719 | 0 ✔ |
| `TIER1-fetched/main.css` | 2,103 | 0 ✔ |
| `TIER1-fetched/theme.css` | 232,979 | **2** ✘ |
| `TIER1-fetched/vendor-animate.css` | 63,376 | 0 ✔ |
| **`apps/controller/evidence-dumps/NEXT-STEP/gaps/sheet-10.css`** | 25,795 | **the whole Font Awesome 4.3.0 sheet** |
| **`~/Desktop/new-room/css/complete-app-styles.css`** | 685,767 | **1,430 — Font Awesome 5.8.1** |

Both `theme.css` hits were opened: byte 14,386 `.navbar.white .navbar-collapse .navbar-nav > li > a
.fa-chevron-down { … }` and byte 139,222 `#blog #posts .sidebar .updates .fa-rss { … }`. Both are
positional overrides, not glyph rules — so the claim's *substance* held while its *count* did not.
Recorded because "0" is what stopped anyone looking further.

**Font Awesome 4.3.0 — the v3 ptrApp / recordings page.**
`apps/controller/evidence-dumps/NEXT-STEP/gaps/sheet-10.css`, identified by
`stylesheets.json[10].href = https://protradingroom.com/public/vendor/font-awesome/css/font-awesome.min.css`,
551 rules. `@font-face { font-family: FontAwesome; src: url("../fonts/fontawesome-webfont.woff2?v=4.3.0") … }`.
Every glyph `recordings.md` §5 lists:

| class | offset in `sheet-10.css` | codepoint |
| --- | --- | --- |
| `.fa-file-video-o::before` | 20,309 | `U+F1C8` |
| `.fa-clock-o::before` | 3,368 | `U+F017` |
| `.fa-cloud-download::before` | 11,377 | `U+F0ED` |
| `.fa-share::before` | 6,368 | `U+F064` |
| `.fa-archive::before` | 17,573 | `U+F187` |
| `.fa-circle::before` | 12,744 | `U+F111` |

`.fas` count in `sheet-10.css`: **0**. `fa-mobile-alt` count: **0**. `fa-file-video` (no `-o`): **0**.
Those three are Font Awesome 5 names, which is the correct and expected result for a 4.3.0 sheet.

**Font Awesome 5.8.1 — the v4 room.** `~/Desktop/new-room/css/complete-app-styles.css`, first source
header `https://use.fontawesome.com/releases/v5.8.1/css/all.css`. The family switch:

```css
.fas { -webkit-font-smoothing: antialiased; display: inline-block; font-style: normal;
       font-variant: normal; text-rendering: auto; line-height: 1; }   /* byte 366   */
.fas { font-family: "Font Awesome 5 Free"; }                            /* byte 59,663 */
.fas { font-weight: 900; }                                              /* byte 59,713 */
```

Glyphs for every icon the five specs name:

| class | offset | codepoint |
| --- | --- | --- |
| `.fa-bell::before` | 6,975 | `U+F0F3` |
| `.fa-times::before` | 50,807 | `U+F00D` |
| `.fa-image::before` | 29,568 | `U+F03E` |
| `.fa-trash::before` | 51,674 | `U+F1F8` |
| `.fa-edit::before` | 18,681 | `U+F044` |
| `.fa-save::before` | 43,044 | `U+F0C7` |
| `.fa-mobile::before` | 35,157 | `U+F10B` |
| `.fa-mobile-alt::before` | 35,194 | `U+F3CD` |
| `.fa-file-video::before` | 21,575 | `U+F1C8` |
| `.fa-clock::before` | 12,865 | `U+F017` |
| `.fa-cloud-download-alt::before` | 13,021 | `U+F381` |
| `.fa-share::before` | 43,793 | `U+F064` |
| `.fa-archive::before` | 4,644 | `U+F187` |
| `.fa-circle::before` | 12,574 | `U+F111` |
| `.fa-download::before` | 17,879 | `U+F019` |

`fa-file-video-o` is absent from the FA5 sheet, exactly as `fa-file-video` is absent from the FA4
sheet. **The two surfaces use two Font Awesome majors and the class names are not interchangeable** —
the v3 recordings page must keep `fa-file-video-o` / `fa-clock-o` / `fa-cloud-download`, and the v4
room must keep `fas fa-bell` etc. This is the concrete reason `swing-alerts.md` §5d's warning about
three icon families matters.

### D.3 The feature CSS, cross-confirmed from the browser-computed sheet

`~/Desktop/new-room/css/complete-app-styles.css`, all rules touching the swing / day-trade / benzinga
selectors, with `_ngcontent-ng-c2028866615` (presentation-area) and `_ngcontent-ng-c977335924`
(app-room) scoping stripped for readability:

| offset | rule |
| --- | --- |
| 656,238 | `#dayTradeAlerts, #swingAlerts { overflow-y: auto; height: calc(100% - 40px); }` |
| 656,371 | `.day-trade-alert-txt, .swing-alert-txt { padding-left: 5%; }` |
| 656,486 | `.download-day-trades-btn, .download-swing-trades-btn { font-size:18px; background-color: rgb(8,102,142); padding:3px 11px; color: rgb(255,255,255); border-radius:6px; line-height:24px; }` |
| 657,126 | `.day-trade-symbol-container, .swing-symbol-container { width:100%; max-width:150px; text-align:left; display:block; margin: 0 auto 0 24%; }` |
| 657,328 | `.day-trade-alert-form, .swing-alert-form { font-size:12px; max-width:600px; }` |
| 657,462 | `… .input-group-text { width:105px; font-size:12px; }` |
| 657,682 | `… .form-control { font-size:12px; }` |
| 658,652 | `.day-trade-alerts-container .table, .swing-alerts-container .table { font-size:12px; }` |
| 659,367 | `.day-trade-alerts-container h4, .swing-alerts-container h4 { background-color: rgb(8,102,142); color: rgb(255,255,255); }` |
| 661,211 | `.alert-sender-img, .uploaded-alert-image, .uploaded-img-preview { width:auto; height:100%; max-height:30px; object-fit:contain; }` |
| 661,426 | `.remove-image-btn { width: 36px !important; }` |
| 667,530 | `.trade-alerts-select { font-size:12px; vertical-align:bottom; }` |
| 588,580 | `.benzinga-logo { max-height: 25px !important; }` |
| 589,892 | `.benzinga-logo-alt { background-color: rgb(0,0,0); width:100% !important; max-height:25px !important; max-width:230px !important; }` |

`rgb(8, 102, 142)` is `#08668e` — the literal `swing-alerts.md` §7 names, confirmed here from
computed styles rather than from the bundle's inlined string.

**`.benzinga-li` has 0 occurrences** in all 685,767 bytes. `benzinga` occurs exactly twice, and both
are the two rules above. That is a second, independent confirmation of `benzinga.md` §7's finding,
taken from a *browser-computed* stylesheet enumeration rather than from the bundle — which is the
strongest form this claim can take short of a live probe, because it enumerates every rule the
browser actually had.

---

## E. The three mobile verdicts

### E.1 The pin transport — the verdict stands, but the doc was misread

**The reference issues the pin over the socket. Confirmed by my own measurement, not inherited.**

- `main.d1d09071be31f1ba.js` byte 2,528,987 and byte 2,567,684, `getMyPinAndDoInfo()`:
  ```js
  (sessData.ptrMobileAppEnabled || sessData.customMobileAppEnabled) &&
  (!globals.user.isFT || sessData.freeTrialsGetApp) &&
  this.appService.sendServerCommand("getMyMobilePin", null)
  ```
- inbound, byte 1,021,490: `case"getMyMobilePin": console.log("socket getMyMobilePin data:",i), this.appEventBus.emit("getMyMobilePin",i); break;`
- consumed, byte 2,316,207: `subscribe("getMyMobilePin", e => this.mobilePin = e.pin)`
- `getMyPinAndDoInfo` occurs 5 times (2,466,167 / 2,472,748 / 2,528,987 / 2,563,136 / 2,567,684)
- `/internal/` count: **0**. `mobile-pin` count: **0**.

The manage page has a second, different issuer:
`ng-click="getAppPin(user.email, user.userName, $index)"` (`must-match/match` byte 14,210) — keyed by
**email**, inside an "App and Notifications" submenu that also carries `showAlerterAppTokens(user.userName, user.alerterAppTokens)`,
`getFCMTokens(user._id,…)`, `pauseUserNotifs(user._id,…,'pause'|'resume'|'unsub')`,
`sendTestFCM(user._id,…)` and `resetFCMForuser(user._id,…)`. All six are present, contradicting
`mobile-app-decoded.md` row 2's "0 occurrences … they belong to the manage page" only in the sense
that the manage page **is** captured, in `must-match/`, `mising/` and
`TIER1-fetched/views/page.manageSession.html`.

**VERDICT on the claimed contradiction: the transport finding is correct; the framing is not.**
`docs/MOBILE-APP.md` never presents `POST /internal/mobile-pin/<shortCode>` as the reference's shape.
It appears under **"§7b. The endpoints the app needs — proposed contract"** (`MOBILE-APP.md:387-397`)
with the sub-heading **"1. Issue a PIN — EXISTS"**, i.e. it is labelled as ours and it is ours:
`apps/controller/src/routes/internal/mobile-pin/[code]/+server.ts` exists in this repository.
`mobile-app-decoded.md`'s own row-6 text already concedes this ("Our HTTP route has good reasons of
its own"). The only edit `MOBILE-APP.md` actually needs is one sentence in its §5 pairing narrative
naming the reference's transport as the `getMyMobilePin` socket command.

### E.2 "Two apps can coexist per room" — CONFIRMED as settings, CONTRADICTED as outcome

**Settings side, confirmed.** `mising/full` bytes 250,153 and 251,343 are two separate
`<p class="form-control-static">` blocks, each with its own `editable-checkbox` — `sess.ptrMobileAppEnabled`
("Enable PTR app?") and `sess.customMobileAppEnabled` ("Custom App?"). No radio grouping, no
`ng-disabled` cross-link. They are independent, exactly as `MOBILE-APP.md:286-287` says.

**Client side, contradicted.** `main.d1d09071be31f1ba.js` bytes 2,316,026–2,316,400, read verbatim:

```js
constructor(e){ this.appService=e,
  this.androidLink="https://play.google.com/store/apps/details?id=com.bellesoft.protradingroomv3",
  this.iosLink="https://apps.apple.com/us/app/pro-trading-room-v3/id1587924329",
  this.mobilePin="N/A" }
ngOnInit(){
  this.appService.appEventBus.subscribe("getMyMobilePin", e => { this.mobilePin = e.pin });
  this.appService.globals.sessData.customMobileAppEnabled &&
    (this.androidLink = …sessData.customMobileAppAndroidUrl,
     this.iosLink     = …sessData.customMobileAppIOSUrl);
}
```

Exactly one `androidLink` and one `iosLink` exist, and `customMobileAppEnabled` **overwrites** both.
`customMobileAppAndroidUrl` occurs once in the whole bundle, at byte 2,316,358 — that assignment.
With both flags on, the member is offered the custom app only.

**VERDICT: `mobile-app-decoded.md` row 15 is CORRECT, and I verified it independently.** The doc's
sentence is true of the settings and false of what a member sees; state both halves.

### E.3 "Six-digit PIN" — NOT ESTABLISHED from any dump. Genuine gap.

- Room client: `this.mobilePin = "N/A"` (byte 2,316,141); assigned as a bare passthrough of `e.pin`;
  rendered verbatim beside `globals.user.email`. **No length check, no format check, no mask.**
- Manage page: the pin is a user-row field, `user.mobilePairCode` (`mising/full` bytes 13,174 /
  34,120 / 55,076), displayed under `ng-show="showPins && user.mobilePairCode"` with
  `ng-init="showPins=true"` on the table (`mising/full` byte 10,126). **In every captured row that
  span carries `class="ng-hide"`** — meaning `mobilePairCode` was falsy for every captured user. No
  live PIN value exists in any dump.
- The **expiry** half of the doc's claim IS confirmed: `ptrMobileAppExpirePairCodeDays` = `7`
  (`NEXT-STEP/ptr1.json`, `mising/full` byte 220,041), alongside
  `mobileAppExpireNotificationsDays` = `14`.

**VERDICT: the digit count cannot be settled from these captures and is not asserted here.** Two
things are worth recording alongside it:

1. Our implementation is already six digits and already uses the reference's own column name:
   `apps/controller/src/lib/server/mobile-pairing.ts:92` — `if (!/^\d{6}$/.test(pin)) return null;` —
   and `:251` — `eq(roomUsers.mobilePairCode, request.pin)`. The field name matches
   `user.mobilePairCode` exactly.
2. The capture that would settle it is one line: the room already does
   `console.log("socket getMyMobilePin data:", i)` at byte 1,021,490, so opening the console in a room
   with `ptrMobileAppEnabled` on and clicking the mobile icon prints the whole frame.

### E.4 A fourth mobile item, closed while checking the other three

`mobile-app-decoded.md` row 11 states: *"**0 occurrences** of either name in either bundle. No
`pairURLLink`, no `addUser` route, no `/ptr_app/` string."*

Two of those three are wrong, and the third is right for the wrong reason.

**`pairURLLink` exists, with the URL template verbatim.** `mising/full` bytes 130,720–131,000:

```html
<div ng-show="sess.hasAppPairLink &amp;&amp; sess.pairSecretKey" class="ng-hide">
  <label>Sample link you would need to use to add each user: (replace email/name with the real user email/name</label>
  <input type="text" class="form-control col-md-6" id="pairURLLink" readonly="readonly"
    value="https://chat.protradingroom.com/ptr_app/sessions/v2/addUser/6a6529b318781e20ed81947d/?sec=&amp;email=__userEmail__&amp;name=__userName__">
</div>
```

That is the self-serve pairing contract `MOBILE-APP.md:184-187` describes: route
`/ptr_app/sessions/v2/addUser/{sessionID}/`, query `sec` (the `pairSecretKey`), `email`, `name`,
placeholders `__userEmail__` / `__userName__`, gated on `hasAppPairLink && pairSecretKey`, `readonly`.

**`/ptr_app` is in the bundle.** `main.d1d09071be31f1ba.js` byte 976,514:
`this.server_prefix="/ptr_app"` (`server_prefix` occurs 3 times: 976,514 / 1,139,844 / 1,139,994).
The previous search was for `/ptr_app/` **with a trailing slash**, which the bundle does not contain.

**`addUser` — right conclusion, wrong measurement.** `addUser` occurs 5 times in the bundle
(1,163,163 / 1,163,798 / 2,076,394 / 2,076,820 / 2,079,724). I opened all five: they are
`addUserToList`, `removeUserFromList` and `addUserNote`. None is an HTTP route. So "no `addUser`
route" holds — but it holds after reading five hits, not because there were none.

---

## VERIFICATION — negative controls

**Control 1 — the one that mattered.** `swing-alerts.md` §6 item 4 and §5b cite
`sessData.linkedRoomSwingAlertsOther` at offset **1,993,765**. I expected to find the identifier
there. Measured over all 2,891,205 bytes of `main.d1d09071be31f1ba.js`:
`linkedRoomSwingAlertsOther` = **0**. Also 0: `linkedRoomDayTradeAlertsOther`, `linkedRoomSwingAlerts`,
`linkedRoomDayTradeAlerts`, `linkedRoomRecordings`. Before reporting a discrepancy I opened the cited
offset — bytes 1,993,400–1,994,300:

```js
onTradeAlertWeeksChange(e){
  const i = "Swing"===e ? 30*this.swingAlertMonths : 4*this.dayTradeAlertMonths*7;
  this.appService.globals["Swing"===e ? "swingAlertsLog" : "dayTradeAlertsLog"] = [];
  let s = this.appService.globals.sessData[`linkedRoom${e}AlertsOther`];
  s = s?.trim();
  this.appService.sendServerCommand(`get${e}AlertsLog`,
    { sessionID: s || this.appService.globals.sessionID, days: i });
}
```

The citation was pointing at real, correct code. **The key is built by template-literal
interpolation**, so the literal string never exists in the file and no search for it can ever
succeed. `onTradeAlertWeeksChange` occurs 3 times (1,939,072 / 1,945,452 / 1,993,565); the two
computed reads are at 1,010,154 and 1,993,773 and are the only `sessData[` accesses in the bundle.
Three things fall out: the two key names are confirmed against the manage document
(`mising/full` 246,676 and 247,887); `sessionID: s || globals.sessionID` means a non-empty
`…AlertsOther` **replaces** the current room's session id in the fetch; and the day maths is
`30 × months` for Swing and `28 × months` for Day Trade, matching both specs. Had I stopped at
"0 occurrences", I would have reported a working feature as a documentation error.

**Control 2 — a class I expected to have a rule.** `editDayTradeAlert` adds `animated` **and**
`flash`. I did not assume both were styled. I counted `.animated` in both v4 sheets:
`styles.ee2a710065b60389.css` **0**, `css/complete-app-styles.css` **0** (the 4 bare `animated`
substrings there are inside `animation:` shorthands). `.flash` is 1 in each. Opposite results from
the same lookup, and only counting each separately separates them.

**Control 3 — a tab I expected to be captured.** I expected some DOM dump to hold a rendered Swing or
Day Trade tab. Measured `swingAlerts` / `"Swing Trade"` / `dayTradeAlerts` across every rendered-room
capture — `app-room/complete.clean.html`, `app-room/complete.html`, `app-room/app-room-file.txt`,
`preview/index.html`, `preview/clean.html`, `alert-section/1.html`, the 72 MB staff dump: **0 in all
seven, for all three needles.** The cause is established rather than guessed: `hasSwingTradeAlerts`
and `hasDayTradeAlerts` are both `No` in both captured rooms (A.1), and the tab is gated on them
(bundle 2,014,716). `NEXT-STEP/ptr1.json` is the only file with `"Swing Trade"` hits — 12 of them,
all manage-page label text. **No swing or day-trade row data exists in any dump, and none can, until
a room with the setting on is captured.**

**Control 4 — a documented count I could not reproduce.** `recordings.md` §5 asserts `.fa-` is 0 in
all four `TIER1-fetched` stylesheets. `theme.css` returns **2**. Rather than reporting a defect I
opened both (bytes 14,386 and 139,222); both are positional overrides on `.fa-chevron-down` and
`.fa-rss`, not glyph rules, so the claim's conclusion survives and only its count is wrong. Reported
as a count correction, not as a finding.

**Control 5 — ruling out my own extraction.** My first pass over `mising/full` took the `<label>`
*following* each field as its help text, which produced `useV5 → help: "Use v4? (DON'T!)"`. That
looked like evidence of a live `useV4` control. I opened bytes 223,400–226,400 before writing
anything: the following block is HTML-commented out. The extractor was wrong; the region is what
section A.2 reports. Nothing from the extractor is asserted here without the region having been read.

---

## STILL OPEN

Three items survive reading every dump named in "What was read". Each is a real finding.

### 1. The HTML body of `{apiROOT}/sessions/v2/archives/recordings/{sessionID}/{sesionToken}`

**Not captured, anywhere.** Searched, and measured 0 hits for `archives/recordings` outside bundle
source, across: all 20 directories under `~/Desktop/new-room/` excluding `node_modules`/`build`, and
every file under `apps/controller/evidence-dumps/`. The only hits are in the two v4 bundles and their
beautified component copies, and all of them build the string rather than hold a response.

What this pass **did** add: the `Recording` document is now fully specified from two independent
server-side API documents (C.1), and every field `page.recordings.html` binds is present in it with
no unbound field left over. So the row contract is closed even though the wrapper HTML is not.

**Blocks:** (a) whether `page.recordings.html` (fetched 2026-08-13 from `protradingroom.com`) is
still the renderer behind that URL on `chat.protradingroom.com`; (b) which element
`downloadRecordingsDisabled` removes; (c) whether the `Share` anchor at `page.recordings.html:21`
(`href=""`, no handler) is still dead.

**Capture:** one authenticated `GET` of that URL from a live room, saved as HTML, then a second with
`downloadRecordingsDisabled` toggled. Nothing short of that settles it, because the setting has
**0 occurrences in two independent v4 bundles and 0 in the 27-line template** (C.4) — it exists only
on the server.

### 2. Whether `sessData` is redacted per role before it reaches the browser

No capture in any dump contains a delivered `sessData` payload (A.5). The staff dump, both member
probes and the account-page dump all return 0 for `sessData`. So the requested staff-vs-member key
diff cannot be produced and is not asserted.

This matters beyond bookkeeping: the client reads `deleteAlertPW`, `roomPublicSecret`, `banIPList`,
`obsStreamKey`, `twillioApiSID`, `restreamToURL`, `allRoomsWelcomeMatPW`, `needPasswordForUserNotes`
and the full `showArchivesToSpecificPresenters` email list off `sessData` with **no role guard at any
read site**, and compares `deleteAlertPW` in a `bootbox.prompt` in the browser (A.5).

**Capture:** in a live room, `console.log(JSON.stringify(<appService>.globals.sessData))` once as a
member and once as a presenter, and diff the key sets. That single pair of frames closes this
completely — and it is the one capture that would let the 268-field write contract and the 135-key
read contract be joined into a proven three-way table.

### 3. The PIN's format

Established: the reference stores it as `user.mobilePairCode` on the user cross-reference row, issues
it to a member over the socket command `getMyMobilePin` and to an operator via the manage row action
`getAppPin(user.email, …)`, renders it verbatim with no format check, and expires it after
`ptrMobileAppExpirePairCodeDays` days (default `7`).

Not established: how many characters, and of what alphabet. **Every captured user row has
`mobilePairCode` falsy** — the display span carries `ng-hide` in all of them (E.3) — so no dump
contains a specimen. Our own implementation uses `/^\d{6}$/`, which is a decision, not a decoded fact.

**Capture:** one inbound `getMyMobilePin` frame. The bundle already logs it in full at byte
1,021,490; opening the console and clicking the mobile icon in a room with `ptrMobileAppEnabled` on
is sufficient.

---

## Corrections the five specs should absorb

Listed here rather than applied, since those files are not edited by this pass.

| spec | item | correction |
| --- | --- | --- |
| `swing-alerts.md` §6 item 2 | `senderAvt` origin "is a server question" | Closed: `md5(trim(lowercase(email)))`, proven by the bundle's own self-test (B.1) |
| `swing-alerts.md` §6 item 3 | `getSwingAlertsLog` response beyond what the client reads | Answered as far as a client can: the frame carries only `data`; no page/page_size, no unread counters (B.5) |
| `swing-alerts.md` §6 item 4, §5c | `linkedRoomSwingAlertsOther` cited at offset 1,993,765 | The identifier has 0 occurrences; the key is computed as `` sessData[`linkedRoom${e}AlertsOther`] `` (VERIFICATION control 1) |
| `swing-alerts.md` §3 row template | avatar built from `senderAvt` | `senderPic` takes precedence: `senderPic \|\| gravatar(senderAvt)` (B.2) |
| `day-trade-alerts.md` §5 item 1 | `animated flash` keyframes not decoded | Closed, in-repo, `styles.ee2a710065b60389.css` byte 430,183; `.animated` has no rule (D.1) |
| `day-trade-alerts.md` §5 item 2 | where `hasDayTradeAlerts` is populated | It is a manage-page room setting, `saveSessField('hasDayTradeAlerts')` (A.1) |
| `day-trade-alerts.md` §5 item 3 | `alertsLog` row shape | 21 fields censused (B.4); `b`/`fontColor`/`bkgColor` cross-confirmed server-side |
| `day-trade-alerts.md` §5 items 5, 6 | `senderPic`/`senderAvt`/`entryDate` provenance | `senderAvt` closed (B.1); `senderPic`/`entryDate` confirmed server-only, never client-written (B.2) |
| `day-trade-alerts.md` §5 item 7 | `upload_server`/`cdn_upload_key` assignment | Hardcoded client constants on the globals class, byte 976,514 — **not** sessData (A.1) |
| `day-trade-alerts.md` §5 item 9 | whether the server emits both `hasSwingTradeAlerts` and `hasDayTradeAlerts` | Both are separate, live checkboxes on the manage page (A.1). Neither is a legacy alias |
| `recordings.md` §2.6 | `length` in ms, `/60000` | Confirmed server-side: `length` ms, `duration` minutes, `1800000/60000 = 30 = duration` (C.1) |
| `recordings.md` §5 | `.fa-` absent from every capture | Wrong. FA 4.3.0 in `NEXT-STEP/gaps/sheet-10.css`, FA 5.8.1 in `css/complete-app-styles.css`; `theme.css` has 2 (D.2) |
| `recordings.md` §5 | `recsInRoom` default unknown | Still unknown as a *product* default, but now measured `No` in **two** independent rooms (A.1) |
| `benzinga.md` §12 | `.benzinga-li` rule "not checked outside `styles.*.css`" | Confirmed absent in the full browser-computed sheet, 685,767 bytes, `benzinga` count 2 (D.3) |
| `benzinga.md` §12 | `sessData.uuid` | Read 3 times by the client; the API docs describe `uuid` as the auto-incremented numeric room identifier (C.1 source, `/sessions/cloneSession`) |
| `mobile-app-decoded.md` row 6 | pin transport "CONTRADICTED" | Transport finding correct and independently re-verified; but `MOBILE-APP.md` labels the HTTP route as ours under "proposed contract" (E.1) |
| `mobile-app-decoded.md` row 11 | "no `pairURLLink`, no `addUser` route, no `/ptr_app/`" | `pairURLLink` and the full pairing URL are captured (E.4); `server_prefix="/ptr_app"` is at byte 976,514; only "no `addUser` route" survives |
| `mobile-app-decoded.md` rows 2, 8, 9, 10, 16, 17 | "NOT IN BUNDLE" | Correct for the bundle, and all six are now **found on the manage page** with labels and values (A.1, E.1) |
| `mobile-app-decoded.md` row 15 | "two apps can coexist" | Verified independently: correct (E.2) |
