# What the reference has that we do not — the full triage

`audit-feature-coverage.mjs` reported **43 wire commands and 2 presentation-area tabs** present in
the reference bundle and absent from `apps/room/src`. Every one was read at every occurrence in
`main.d1d09071be31f1ba.js` and then checked against our own source before being classified.

## Read this before using the table

**An identifier absent from our code does NOT mean the feature is absent.** We use SvelteKit form
actions and REST endpoints where the reference uses socket commands, so names legitimately differ.
Every REAL_GAP claim was therefore put through a **second, adversarial pass** whose only job was to
refute it by finding the behaviour in our source under any other name.

**That pass killed 7 of 34 claims outright, and an eighth was contested and resolved against it by reading — a 21 per cent false-gap rate.** Reporting those would have sent
the owner reading working code, which `~/CLAUDE.md` records as worse than saying nothing.

## The counts below are MEASURED, not carried forward — re-measured 2026-08-29

The table that used to sit here said **30 not built**, and it was a snapshot written the day the
triage ran. It was never updated as rows landed, and by 2026-08-29 it was wrong by more than half.

Every row of *Confirmed missing* now carries a **status** measured against `apps/room/src` with
comments stripped, and `apps/room/src/lib/missing-command-census-contract.test.ts` **recomputes it on
every run and fails on a disagreement in either direction** — a row still marked `NOT BUILT` whose
command now exists, and a row marked `BUILT` whose command does not. A sentence cannot go stale here
again without a red test.

| outcome | count |
| --- | ---: |
| *Confirmed missing*, now **BUILT** | **13** |
| *Confirmed missing*, **BUILT AS** something else | 3 |
| *Confirmed missing*, still **NOT BUILT** | 9 |
| need a decision first (the operator toolkit, below) — all still outstanding | 5 |
| claimed missing, then REFUTED — we already have it | 7 |
| classified as built-under-another-name at triage | 9 |
| framework/library noise, not our work at all | 4 |

**The status column is not decoration; it is where a defect hid.** `forceStopScreen` sat in this
table with a payload row citing *"ours … ScreenTabs.svelte:211,227"* — the presenter's menu ITEM.
The item rendered; the behaviour did not. A presenter clicking "Stop This Screen" on a member's share
removed their own tab and left the member broadcasting to the whole room. That is the exact mistake
this document records catching on `stopVideoForAll` one section below — *"the refuter matched the
BUTTON. The brief asked it to match the BEHAVIOUR."* — made again, in this file, on a row a few lines
away from the warning. **A citation is not a test.** It was built on 2026-08-29 and is pinned by
`force-stop-screen-contract.test.ts`.

**There is no "parked" bucket, and there must never be one.** An earlier version of this document
filed five commands under "unclear, needs a decision rather than more reading", which read as a
resolved category and was not one. **A pending decision is outstanding work.** The only thing that
removes a row from the outstanding count is building it, or proving we already did. The four NOISE
rows are the sole exception, because they are third-party library internals and were never ours to
build.

That mistake has now been made twice in this repository in two different shapes: a TODO sentence
claiming everything buildable was built while two whole tabs sat undiscovered, and this bucket. Both
hid work behind a confident-sounding category.

---

## The seven false gaps — we already build these

Recorded permanently. Each was a plausible-looking gap that survived a full read of the bundle and
died on contact with our source.

| command | where we already do it |
| --- | --- |
| `hardResetSession` | /Users/billyribeiro/Desktop/trading-room-app/apps/room/src/lib/components/ModalHost.svelte:3901 (and :3912); handler at /Users/billyribeiro/Desktop/trading-room-app/apps/room/src/routes/+page.svelte:3 |
| `lockSession` | apps/controller/src/lib/room-entry.ts:221 |
| `saveAndCloseSession` | apps/room/src/lib/components/ModalHost.svelte:3984 |
| `saveCloseMessage` | apps/room/src/lib/components/ModalHost.svelte:3988 (button, label "Just Save Close Message"); apps/room/src/routes/+page.svelte:3510 (handler: 'Message Saved' alert, modal deliberately not closed) |
| `savePresenterColors` | apps/room/src/lib/components/ModalHost.svelte:3556 |
| `softResetSession` | apps/room/src/lib/components/ModalHost.svelte:3891 |
| `stopRecMtx` | apps/room/src/routes/+page.svelte:5904 (stopRecording), :5909 (broadcastRecordingState('stopRec')), :6174 (broadcastRecordingState def); apps/room/src/routes/+page.server.ts:2217 (recordingState actio |

### One was contested, and I resolved it by reading rather than averaging

`stopVideoForAll` was judged twice and the two verdicts disagreed — one found our button and called
it built, the other called it a real gap. **The gap is real.** `requestStopVideo()` at
`VideoPlayer.svelte:156` carries the correct confirm string and the correct two callers, and its
`onconfirm` clears local `$state` and a timer and nothing else. The component makes **zero** network
calls: 0 `fetch(`, 0 `use:enhance`, 0 `action=`, 0 socket.

The refuter matched the BUTTON. The brief asked it to match the BEHAVIOUR. A control that says
"For All" and reaches nobody is worse than an absent one, because it reports success.

---

## Confirmed missing

| command | status | occ | size | gate | what it does |
| --- | --- | ---: | --- | --- | --- |
| `stopVideoForAll` | BUILT | 7 | small | Same isP gates as playVideoForAll: the "Stop For All" button is O(1, e.isP ? 1 : -1) insid | Clears the room-wide video: every client sets videoPlayerUrl = "", scheduledVideo.videoURL = "", scheduledVideo.videoPlayTime = null, hideVideoPlayer = false, and a NON-presenter is force-switched back to the screens tab (`this.isP \|\| this.onMainTabChange("p |
| `kickUser` | BUILT | 11 | medium | No client-side predicate on the buttons; authority is the separate socket channel `sendAdm | Presenter ejects one member. Sent from app-user-info-modal and from app-st-message/app-st-compactmessage as sendServerAdminCommand over the separate `adminCmd` socket channel. Two receive paths: (1) the per-user private channel `/sess/{sessionID}/privCmdsIn/{u |
| `playYTForAll` | BUILT | 9 | small | Opener: the chat-composer span, const 71 ["data-bs-toggle","modal","data-bs-target","#play | Broadcasts a YouTube URL that every client renders in a floating app-ytplayer iframe. The SEEK POSITION is derived, not sent: the subscriber computes `i = Math.round((Date.now() - Number(e.startTime)) / 1e3)` seconds and appends `start=${i}` to the embed URL ( |
| `stopYTForAll` | BUILT | 8 | small | The "Stop For All" button in app-ytplayer is O(1, o.appService.globals.isPresenter ? 1 : - | Tears the room-wide YouTube overlay down on every client. The two-button design is the load-bearing detail: "Stop For All" goes to the server, "×" only clears the local iframe, and the reference distinguishes them by which bus it emits on. OURS: YoutubePlayerO |
| `doChatLogSearch` | NOT BUILT | 8 | medium | The plain search has NO gate — any viewer can run it. The destructive `del:true` path is r | A server-side search over the FULL stored chat/alert history, whose results replace the live log in place — plus a bulk-delete mode on the same command. The 8 hits break down as: 4 sends (1439114 main chat, 2385404 extra-chat column, 2051344 and 2051436 alerts |
| `playVideoForAll` | BUILT | 7 | medium | UI: O(0, g(2).isP ? 0 : -1) on the whole video-list/schedule block (fn ZSe, byte 1932536 r | A presenter picks a URL from their localStorage video list (`videos-${sessionID}`) and either plays it room-wide now or schedules it. On receipt every client sets videoPlayerUrl = i.url, hideVideoPlayer = true, and a NON-presenter is force-switched to the vide |
| `remoteRestartAudio` | BUILT | 7 | small | Transport: sendServerAdminCommand -> socketService.sendAdminCmd -> this.socket.transmit("a | A presenter picks a member in the user-info modal and forces THAT member's browser to re-establish its incoming audio. Sender at offset 2080401: remoteRestartAudio(){this.appService.sendServerAdminCommand("remoteRestartAudio",this.user),bootbox.alert("Audio re |
| `sendUsersToURL` | BUILT | 7 | small | Send: none client-side, `adminCmd` channel. Receive: `this.globals.isPresenter \|\|` — pre | Redirects the room's browsers to a URL. Asked specifically: it targets ALL users in the session, NOT a selection — the payload is only {url, sessID} with no user list, and it is fired from app-session-control-modal (a room-level panel), not from a roster row.  |
| `focusOnSessionNote` | BUILT | 7 | small | The note tab's cog menu — which holds "Bring everyone here" — renders only under `i.isP \| | A presenter drags the whole room's presentation area onto one note tab — the note twin of `focusOnScreen`. The 7 hits: 2 sends (1474124 from the note editor's toolbar `bringFocusToTab()`, 1970890 from the presentation area's `bringFocusToTab(e)`), 1 handler `c |
| `sendSalesImageToChat` | BUILT | 7 | small | Sender: the whole webinar-tools panel is `O(164, e.appService.globals.isPresenter ? 164 :  | A presenter pushes an arbitrary image URL that is overlaid on EVERY non-presenter's chat pane. Admin send: sendServerAdminCommand('sendSalesImageToChat', {url, sessID}). Receive: the handler returns early unless `i.url` is set, then `this.globals.isPresenter \ |
| `archiveLogs` | NOT BUILT | 6 | large | UI: `e.appService.globals.isPresenter && !e.appService.globals.isLimitedPresenter` — the ` | Fires `sendServerAdminCommand("archiveLogs", …)` -> `socket.transmit("adminCmd",{cmd,data})` (transport at byte 990391; wrapper at 1159866). NO `case"archiveLogs"` handler exists in the bundle, so it is send-only. 4 of the 6 hits are real sends; the other 2 (b |
| `unmuteChat` | BUILT | 5 | small | Same `adminCmd` channel as the rest; no client-side predicate. | Lifts a chat mute for one user. A command of its own on the wire, reached only through `muteChat(-1)` in app-user-info-modal — there is no button bound directly to it. Payload carries the user and no time. Receive side has two paths: `case"unmuteChat": e.appEv |
| `getDebugLog` | BUILT | 4 | medium | Transport: sendAdminCmd -> socket.transmit("adminCmd",...) (offset 990391). UI gate, verba | Remote log capture: a presenter pulls the in-memory console log out of another member's browser. Sender at offset 2080323: getDebugLog(){this.appService.sendServerAdminCommand("getDebugLog",this.user)} — no confirm, no local alert. The target receives it on /p |
| `notyping` | BUILT AS setTyping | 3 | medium | None — ordinary member command, not admin-gated. | MIS-CLUSTERED: this is the typing indicator's stop event, not a moderation command. It is the only member of this cluster sent with `sendServerCommand` (the ordinary `cmd` channel) rather than `sendServerAdminCommand`, which is the tell. Paired with `typing`:  |
| `presAreaTabs-recordings` | NOT BUILT | 3 | small | Tab (slot 24) and pane (slot 46) carry the identical two-term gate, read verbatim at bytes | Not a wire command - it is the local tab key for a fifth presentation-area tab. All 3 occurrences read: (1) byte 1917052, inside template fn YCe, the <li> click handler `x("click",function(){return D(e),E(g().onMainTabChange("presAreaTabs-recordings"))})`; (2) |
| `restoreMobileAppTokens` | NOT BUILT | 3 | medium | None. The panel renders on `z("ngIf", "mobile" === o.activeTab)` alone. Note the surroundi | Re-registers the caller's mobile push tokens with the server and asks it to fire a test push at the device. Fire-and-forget: the client sends an EMPTY payload and immediately shows a confirmation, so it never learns whether the restore worked. It is the sole c |
| `stopRecMsg` | NOT BUILT | 3 | trivial | None. No permission check, no doNotDisturb check, and no Notification.permission check bef | A free-text recording status line pushed from the recorder. The subscriber branches on the STRING: `-1 != i.data.indexOf("Stopped") ? alertsService.error(i.data) : alertsService.info(i.data)` — so a message containing the word "Stopped" is rendered red and any |
| `unarchiveLogs` | NOT BUILT | 2 | medium | `O(17, e.appService.globals.isPresenter ? 17 : -1)` — the Unarchive button is rendered onl | Restores a whole archive back into the live log. Both hits are sends, one per archives modal: `app-chat-logs-modal` (byte 2304724) and `app-alert-logs-modal` (byte 2312024). No `case"unarchiveLogs"` handler — after sending, the client optimistically flips `thi |
| `editQAMessage` | NOT BUILT | 2 | small | `this.appService.globals.sessData.enableEditAlerts && "alerts"===this.logType && (this.can | Edits one Q&A reply nested inside an alert. Both hits are sends, one in each of the two compiled copies of `app-st-message` (1351806, 1389696); `case"editQAMessage"` count is 0, so it is send-only. It is the `isQAMsg` branch of a single `editMessage()` method  |
| `updateProfilePic` | BUILT | 2 | medium | None. The dropdown that reaches it is `O(6, o.user.userXrefID === o.appService.globals.use | Tells the caller their OWN profile picture changed. Two independent case labels in two different handlers, both doing the same three things: set globals.preferences.profilePic, set globals.user.profilePic, then emit preferenceChanged {key:'profilePic', value}. |
| `forceStopScreen` | BUILT | 1 | medium | The two-item block holding it renders only for a presenter: O(11, i.isP ? 11 : -1) inside  | A presenter stops SOMEBODY ELSE'S screen share for the whole room, addressed by that screen's muser _id. There is no `case "forceStopScreen"` in the client switch - the only occurrence in the bundle is the send - so the server is what acts, presumably closing  |
| `stopOBStream` | NOT BUILT | 1 | trivial | O(1, e.useMTX ? -1 : 1) - the Start/Stop pair (fn SDe) renders ONLY when useMTX is FALSE.  | Stops the browser-publishes-WHIP ingest that startOBStream opened, and blanks the panel's streamingLink field. NOT built here, and the omission is DELIBERATE and already written down: apps/room/src/lib/components/ModalHost.svelte:4317-4325 records it - "Its `b |
| `setUserProfilePic` | BUILT AS uploadProfilePicture | 1 | medium | The button sits inside gTe (bytes 2065610-2068821), rendered by `O(14, o.appService.global | A presenter uploads a profile picture ON BEHALF OF another user. adminUploadProfilePic() opens a file dialog, canvas-downscales the image to a 125px longest edge, POSTs it as multipart to `${globals.upload_server}/image/${sessionID}` with an `Authorization: Cl |
| `updateUserProfilePic` | BUILT AS setRosterAvatar | 1 | small — once a stored pictur | None — every client applies it. | The fan-out for SOMEBODY ELSE'S new picture. It patches the roster entry whose `_id === i.userId` (`se.pic = i.pic`), then walks every channel of globals.chatLog and rewrites `_e.pic = i.pic` on every message whose `uid` matches either `i.userXrefID` or `i.use |
| `streamPlayerDisabled` | NOT BUILT | 1 | medium — it needs the player | `this.globals.isPlayer` on receipt, and again inside the streamPlayerEnded subscriber. isP | Ends a standalone stream-PLAYBACK session. Guarded by `this.globals.isPlayer &&` — a client global set from the JWT, `globals.isPlayer = decodedPassedToken.isPTRPlayer` — so only browsers in player mode react. It emits softResetDone and then streamPlayerEnded, |

### Verbatim UI strings for the confirmed gaps

| command | strings, spaces preserved |
| --- | --- |
| `archiveLogs` | Archive Chat Messages \| Archive Alerts Messages \| You can either archive all chats or select an older than date: \| You can either archive all alerts or select an older than date: \| Close \| Delete Searched \| Archive All \| Archive Older than Selected Date \| Are you sure you want to archive the |
| `doChatLogSearch` | input: name="chatSearchTermTxt" placeholder="Type your search term, then press Enter" aria-label="Search" aria-describedby="addon-search" title="Type your search term, then press Enter" \| clear: id="addon-chat-clear" title="Clear the search" \| Delete Searched \| Are you sure you want to DELETE the |
| `editQAMessage` | menu item: \xa0\xa0Edit  (i.fas per const 41) \| prompt title: Edit ${this.isQAMsg?"qa message":"alert"} by <strong>${this.msg.n}:</strong>  — for a QA message this renders as: Edit qa message by <strong>NAME:</strong> \| inputType textarea, prefilled with this.msg.txt |
| `focusOnSessionNote` | Bring everyone here   (note tab cog menu, i.fas.fa-eye, byte 1928018)   \|    Bring Everyone here    (note editor toolbar button, btn btn-success text-center m-1, i.fas.fa-eye, byte 1461866) |
| `forceStopScreen` | Dropdown item text " Stop This Screen" (leading space, no trailing), icon const 84, inside the gear menu whose sibling item is " Bring everyone here" (icon const 81). |
| `getDebugLog` | Get Debug Log " / modal title: "Debug Log |
| `kickUser` | Kick  /  Kick & Ban  /  Kick Duplicates  / prompt title "Enter the kick message for this user" / prompt value "You have been kicked from the room by an administrator" / "Kick all other duplicates of "+o+" with the following message:" / alert "User kicked OK" / "Kicked "+l+" duplicate(s) of "+o / "No |
| `playVideoForAll` | Tab label "VideoPlayer"; row button title="Play For All" text "Play For All " (icon fa fa-play-circle mr-2); empty state "No videos."; input placeholder "Video url..."; bootbox dialog title "Video", message "<p>Do you want to play this video at a specific time?", buttons "Cancel" (btn-danger) / "Cho |
| `playYTForAll` | Composer icon tooltip const 74: ["ngbTooltip","Play YouTube For All","placement","left",1,"fas","fa-video"]. Modal: h5 "Play YouTube For All"; input placeholder "Paste YouTube URL" / aria-label "Paste YouTube URL"; clear span "×"; "Save"; "Play For All"; saved-list header "Saved:"; footer " Close ". |
| `presAreaTabs-recordings` | Recordings |
| `remoteRestartAudio` | Restart Audio " / alert: "Audio restart request sent OK |
| `restoreMobileAppTokens` | tab " Mobile App " \| paragraph " Use this to restore your mobile app connectivity and get a test notification on your device. Only do this if you are not getting notifications " \| button " Restore Connectivity " \| alert "Command sent successfully, check your mobile device for a test notification" |
| `sendSalesImageToChat` | button " Send sales image to chat " \| prompt title "Please enter the URL:" \| success alert "Command send OK." (the reference's own typo, "send" not "sent") \| reject alert 'The link seems to be missing "https://" or "http://"' \| overlay close title "Close" |
| `sendUsersToURL` | Send users to URL  / prompt title "Please enter the URL:" / alert "Command send OK." / alert 'The link seems to be missing "https://" or "http://"' |
| `setUserProfilePic` | button " Upload Profile Picture " \| dialog title `Upload Profile Picture for ${this.user.nick\|\|this.user.name}` \| dialog buttons "Close" and "Upload" \| drop label "Click to select images to upload" \| progress alert `Uploading: ${e.name}... Please wait...` \| success alert "Profile picture uplo |
| `stopOBStream` | Two buttons side by side in fn SDe: " Start WHIP Streaming " (const 69, icon const 118) and " Stop WHIP Streaming " (const 84, icon const 72). Both spaces preserved. |
| `stopRecMsg` | none fixed — the text is whatever the server sends; the only literal is the substring test "Stopped" |
| `stopYTForAll` | Presenter button, const 4 [1,"btn","btn-primary","btn-sm","yt-btn",2,"position","absolute","top","-32px","right","30px",3,"click"], text " Stop For All" (leading space, no trailing). Close button, const 2 [1,"btn","btn-danger","btn-sm","yt-btn", ... "right","0",3,"click"], text " × " (v(3," \xd7 ")) |
| `streamPlayerDisabled` | alert "The stream has ended. You can close this page now." |
| `unarchiveLogs` | Unarchive \| Are you sure you want to unarchive (restore) this chatlog? \| Are you sure you want to unarchive (restore) this alerts? \| Chatlog restored \| Alerts restored \| modal titles: " Chat Logs" / " Alerts Logs " \| Reload Log List \| There are no archived chats at this time \| There are no a |
| `unmuteChat` | Unmute Chat  / alert "user chat unmuted" / receiver toast "Chat enabled" |
| `updateProfilePic` | dropdown items " Setup Gravatar " (href https://en.gravatar.com/), " Or upload a picture", " Replace picture", " Remove profile picture " \| confirm "Are your sure you want to remove your profile picture?" (the reference's own grammar) \| dialog title "Profile Image Upload" \| reload confirm "Your p |

### Payloads and offsets

| command | payload | byte offsets |
| --- | --- | --- |
| `archiveLogs` | chat: {type:"chat",date:e,channel:this.channel}   alerts: {type:"alerts",date:e,channel:""} | 1444126, 2048903, 2049028, 2390430, 2304726(substring of unarchiveLogs), 2312026(substring of unarchiveLogs), 990391(sendAdminCmd transport) |
| `doChatLogSearch` | chat: {searchTerm:this.chatSearchTerm.replace("$","\\$"),channel:this.channel,type:"chat",del:e}   extra chat: {searchTerm:…,channel:this.channel,type:"chat",del:e,extraChat:!0}   alerts: {searchTerm:…,type:"alerts",del:e}   RESPO | 1020422(handler), 1020526(doChatLogSearchDeleteExtra), 1020555(doChatLogSearchDelete), 1439114(chat send), 2051344 and 2051436(alerts sends) |
| `editQAMessage` | {qaMsgID:this.qaMsgID, msgIndex:this.msgIndex, newAlertMsg:o}   (o = the trimmed prompt value) | 1351806, 1389696, 1348838(gate), 1335539(menu render condition), 1330618 and 1337958(Edit menu item templates) |
| `focusOnSessionNote` | {id: this.tab._id}  (note editor, byte 1474124)   {id: e}  (presentation area, byte 1970890) | 1023554(case), 1023597(emit inside case), 1474124(editor send), 1962371(subscriber), 1969946 and 1970054(handleNoPresenter local emits), 197 |
| `forceStopScreen` | {id: e._id} - the muser _id, NOT the producerID. Sent inside a setTimeout of 2e3 ms, after the local call `this.mediaService.stopSharingProducer(e.producerID)`: `stopSharingThisScreenRemote(e){ e && (this.mediaService.stopSharingP | 1969578 (send), 1919818 (menu + isP gate); ours apps/room/src/lib/components/ScreenTabs.svelte:211,227; apps/room/src/routes/+page.svelte:74 |
| `getDebugLog` | request: this.user (whole target-user object, unwrapped). response: {requestor:xe.requestor,log:V1} | 996046, 996125, 996159, 2066906, 2080323, 2080377, 901835, 902041, 2598895, 2100230, 2100717 |
| `kickUser` | {user:r,msg:o,ban:i,kickAllInstances:!1} | 996192, 1011338, 1356154, 1356645, 1394202, 1394693, 2067021, 2067126, 2078315, 2078633, 2079420, 2596752 (kickPage subscriber), 990391 (sen |
| `notyping` | {c:o,uid:this.appService.globals.user.userXrefID,pm:null,pu:null} | 1016497, 1435915, 2382177 |
| `playVideoForAll` | SEND (two call sites, same method): {url: e, videoPlayTime: i} where i = new Date(ii('#video-start-datetime').val()).getTime()  — and {url: e, videoPlayTime: null} for "Play now". RECEIVE: case "playVideoForAll": this.guiEventBus. | 1024587, 1024627, 1931423, 1966711, 1980807, 1981613, 1981761; ours apps/room/src/lib/components/VideoPlayer.svelte:119, :133, :156; apps/ro |
| `playYTForAll` | SEND: {url: this.youtubeURL} (byte 2297009, inside playYtVideo()). RECEIVE: case "playYTForAll": this.guiEventBus.emit("playYTForAll", {url: i.url}). The bus subscriber ALSO reads e.startTime - it is not on the live command, it is | 1024137, 1024174, 1503049, 1964799, 1964893, 1964970, 1965054, 1965264, 2297009; opener gate 1426579; ours apps/room/src/routes/+page.svelte |
| `presAreaTabs-recordings` | — | 1917052, 1917216, 1930515, 1994257 (consts 25/59/60/140), 2016835, 2017632, 1959447, 1959845, 2522147, 2467847, 2468673 |
| `remoteRestartAudio` | this.user (the whole target-user object, passed unwrapped as the second argument to sendServerAdminCommand) | 995974, 996014, 1119300, 1130127, 1133537, 2066784, 2080401, 2080462, 2095322, 990391 |
| `restoreMobileAppTokens` | {} — literally empty: this.appService.sendServerCommand("restoreMobileAppTokens",{}) | 2438516, 2444920, 2444980; tab wiring at 2456305; titles at 2433777 and 2433841. Ours: src/lib/components/ModalHost.svelte:5327-5362 has exa |
| `sendSalesImageToChat` | {url: i, sessID: this.appService.globals.sessionID} where i = the prompt value .trim() | 1015180, 1015228, 1015321, 2147273, 2173100, 2173284, 2502019; gate at 2155567; alert at 2173371. Ours: the three buttons and the URL prompt |
| `sendUsersToURL` | {url:o,sessID:e.appService.globals.sessionID} | 1015357, 1015399, 1015486, 2147408, 2173465, 2173666, 2502469 |
| `setUserProfilePic` | {user: i.user, profilePic: l.data.link} — the WHOLE roster user object plus the returned CDN URL, sent via sendServerAdminCommand | 2087041 (the send), 2084700 (adminUploadProfilePic), 2085404 (dialog title), 2067826 (the button), 2065610/2068821 (gTe bounds), 2155567-adj |
| `stopOBStream` | None. `yield e.appService.sendServerAdminCommand("stopOBStream")` with no second argument -> {cmd:"stopOBStream", data:{}}. Its partner is an INVOKE not a transmit: `let i = yield e.appService.invokeAdminCmd("startOBStream"); e.st | 2170467 (stopOBStream), 2170289 (startOBStream), 2144976 + 2145560 (SDe buttons and its useMTX gate); ours apps/room/src/lib/components/Moda |
| `stopRecMsg` | {data} — a string, used verbatim as the toast text, the Notification title and the Notification body | 1014265, 1014300 (dispatch), 2505283 (the subscriber). Ours: `stopRecMsg` has zero occurrences in src/; the cmds handler at src/routes/+page |
| `stopYTForAll` | SEND, two distinct shapes: (a) {url: this.youtubeURL} from playYtVideo() at byte 2296932 - a stop-then-play sequence, the url is passed but the stop does not need it; (b) NO payload from the ytplayer's own stopYTForAll() at byte 1 | 1024212, 1024249, 1502899, 1503220, 1503275, 1503339, 1965152, 2296932; ours apps/room/src/routes/+page.svelte:7033, :12300; apps/room/src/l |
| `streamPlayerDisabled` | none — the command carries no fields; the handler reads only globals.isPlayer | 1013009 (the handler), 2508792 (the subscriber and its alert at 2508887), 1191994 (isPlayer = decodedPassedToken.isPTRPlayer), 2498622 (the  |
| `unarchiveLogs` | chat: {type:"chat",roomID:this.appService.globals.sessData.roomID,archiveID:this.logId}   alerts: {type:"alerts",roomID:this.appService.globals.sessData.roomID,archiveID:this.logId} | 2304724, 2312024, 2300500-2307600(chat modal read whole), 2307800-2315000(alerts modal read whole), 2304507(getArchiveList chat), 2311806(ge |
| `unmuteChat` | {user:this.user} | 996325, 1430505, 2080257, 2376996, 2080259 (the send) |
| `updateProfilePic` | {profilePic} — read as `i.profilePic` / `xe.profilePic` | 996704, 1025426 (the two handlers); 2058513/2058648/2058819 and 1174575/1174700/1174976 and 1182739/1182864/1183140 (the menu items); 119838 |
| `updateUserProfilePic` | {userId, userXrefID, pic} — all three read: `_id === i.userId`, `_e.uid === i.userXrefID \|\| _e.uid === i.userId`, `.pic = i.pic` | 1025627. Ours: no per-user picture exists to fan out (see updateProfilePic). Message avatars are computed at render from `user.pic \|\| 'htt |

---

## Built under another name — the audit script cannot see these

| reference name | ours |
| --- | --- |
| `muteChat` | src/routes/+page.server.ts:2884 (messageAction op 'mute24'), src/lib/server/db/schema.ts:582 (chat_mutes), src/routes/+page.server.ts:1382 (enforced in sendMessage), src/routes/+page.server.ts:686 (chatMutedTill), src/ro |
| `presAreaTabs-videoplayer` | apps/room/src/lib/types.ts:6; apps/room/src/routes/+page.svelte:11294-11316 (tab); apps/room/src/routes/+page.svelte:11820-11831 (pane); apps/room/src/lib/components/VideoPlayer.svelte:1-407 |
| `refreshRoster` | src/routes/+page.svelte:3479, src/lib/components/ModalHost.svelte:3877, src/lib/server/room-events.ts:291 |
| `reloadSessionConfig` | apps/room/src/routes/+page.svelte:3459 |
| `savedSessionPolls` | src/routes/+page.server.ts:2434 (savePoll), src/routes/+page.server.ts:2459 (deleteSavedPoll), src/routes/+page.server.ts:637 (loader), src/lib/server/db/schema.ts:281 (saved_polls table), src/lib/components/PollPanel.sv |
| `setWelcomwMatSessionNote` | src/routes/+page.server.ts:960 (setWelcomeMatNoteTab action, same name as the reference's send), src/lib/server/notes-repository.ts:214 (setWelcomeMatNote, with the exclusivity enforced in a transaction and scoped to the |
| `startWebcam` | apps/room/src/routes/+page.svelte:4296 (addRemoteWebcam) and :8023 (media.on('newProducer', ...)); apps/room/src/lib/media/session.ts:597 (produceWebcam) and apps/room/src/lib/media/signalling.ts:145 (newProducer: Produc |
| `updateChatMsg` | src/routes/+page.server.ts:2599 (messageAction), :2794 (operation === 'edit', including the body_html rewrite), :2720 (operation === 'reaction', toggling clickedBy); src/lib/server/reactions.ts:16 (parseReactions); src/r |
| `updatedSessionNote` | src/routes/+page.server.ts:852 (saveSessionNote action, the reference's exact command name), src/lib/server/notes-repository.ts:91 (saveNote), src/lib/notes-command.ts:13 (schema) |

**`presAreaTabs-videoplayer` is the instructive one.** We key that tab `'videoplayer'`; the
reference keys it `'presAreaTabs-videoplayer'`. The audit's identifier search missed our
implementation purely because of the prefix, and it was one adversarial pass away from being
reported as a missing tab. **The coverage audit reports identifiers, not features** — its PRESENT
rows are a floor and its MISSING rows are a question, not an answer.

---

## Noise — framework and library strings, not PTR features

| identifier | occ | what it actually is |
| --- | ---: | --- |
| `subtitleTrack` | 48 | Entirely hls.js HLS subtitle plumbing — every one of the 48 falls between bytes 1512643 and 1900573, inside the vendored library. Read in full, they are: the error-enum strings subtitleTrackLoadError / subtitleTrackLoadT |
| `setPosition` | 12 | Two unrelated third-party libraries, no PTR command. Eight occurrences are Angular's animation engine — AnimationPlayer.setPosition(n) setting _position/domPlayer.currentTime, the AnimationGroupPlayer that scales it acro |
| `transmuxComplete` | 1 | An hls.js internal worker message, not a PTR wire command. It is one arm of `onWorkerMessage(n)`'s switch over `e.event` inside the transmuxer interface — `case "transmuxComplete": this.handleTransmuxComplete(e.data)` —  |
| `workerLog` | 1 | An hls.js internal worker message, not a PTR wire command. `case "workerLog": De[e.data.logType] && De[e.data.logType](e.data.message)` — the Web Worker forwarding its own log lines to the main-thread logger. Adjacent to |

`subtitleTrack` at 48 occurrences and `setPosition` at 12 were the two largest MISSING counts in
the whole report and both are third-party plumbing — hls.js subtitle handling and Angular animation
internals. **Volume is not evidence of importance.**

---

## NOT BUILT — the five that need a decision first, and are outstanding regardless

| command | occ | what it does |
| --- | ---: | --- |
| `getMyRepeater` | 6 | Media-server (repeater) assignment and failover for the CURRENT client — a diagnostic only in the sense that it asks 'which stream server should I be on'. Client sends its current server; the server replies with the one to use. Response handler at offset 10213 |
| `resetAudioBridge` | 4 | Resets the room's audio bridge. Full method, offset 2166556: resetAudioBridge(){bootbox.confirm("Are you sure you want to reset the audio bridge?",e=>{e&&(this.done(),this.appService.sendServerAdminCommand("resetAudioBridge",{}))})}. Note it is the only reset  |
| `resetAllMediaServers` | 3 | Hard-resets every media server behind the room. Method at offset 2167330; both branches send the identical sendServerAdminCommand("resetAllMediaServers",{}) with an empty payload (offsets 2167673 password-path, 2167929 no-password path), then this.done() (clos |
| `resetMediaServer` | 3 | Hard-resets ONE media server. Two wrappers send it. hardResetMediaServer(e) at offset 2168026 takes a parameter and then ignores it, sending an empty payload {} — a real upstream quirk, recorded as read. hardResetMediaServerOnServer(e) sends {server:e} where e |
| `resetAudioBridgeOnServer` | 2 | Resets the audio bridge on one named server. Full method, offset 2166727: resetAudioBridgeOnServer(e){bootbox.confirm(`Are you sure you want to reset the audio on Server: ${e} ?`,i=>{i&&(this.done(),this.appService.sendServerAdminCommand("resetAudioBridgeOnSer |

**The decision these were waiting on is ANSWERED, by the owner, 2026-08-15.** They are not "should a
presenter be able to reset shared media infrastructure" — they are the **SaaS operator's toolkit**:
when a tenant has a problem, the operator resets, diagnoses, and hard-reboots their room. That is
what this platform is sold as, and these are the controls that do it.

Three things follow, and they raise the priority of every row above rather than lowering it:

1. **They all travel on a SEPARATE channel** — `sendAdminCmd` → `socket.transmit("adminCmd", …)`,
   distinct from the ordinary command transport. The reference has a dedicated admin command path,
   which is what an operator toolkit looks like from the client side.
2. **Six of the wider reset/diagnose family are ALREADY BUILT here** — `hardResetSession`,
   `softResetSession`, `reloadSessionConfig`, `saveAndCloseSession`, `saveCloseMessage` and
   `refreshRoster`, in `ModalHost.svelte` and `+page.svelte`. So this is not new ground.
3. **What is missing is REACH, not the commands.** Ours work inside a room, for that room. The
   operator need is to invoke them for a tenant's room from a central console. `/admin` already has
   impersonation, which is half that bridge.

---

## Method, so this can be re-run and challenged

1. `audit-feature-coverage.mjs` enumerates the reference's identifiers and diffs them against `src/`.
2. Seven agents, one per cluster, read EVERY occurrence of every command in the bundle — not the
   first hit, all of them — recorded direction, payload, gate and verbatim UI strings, then searched
   our source for the same BEHAVIOUR under any name.
3. Every REAL_GAP claim went to an independent refuter told to default to refuted when uncertain.
4. Contested verdicts were resolved by reading the source, not by majority.

**Counts come from python `.count()`, never `grep -c`** — the bundle is one line, so a line-based
count returns 1 or 0 and destroys every real number. That mistake was made here on 2026-08-15 and
nearly caused a correct report to be dismissed.