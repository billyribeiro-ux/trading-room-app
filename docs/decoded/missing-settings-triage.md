# The settings the reference reads and this room does not — triaged

**Written 2026-08-28.** Companion to `missing-commands-triage.md`, and it exists for the same
reason: `apps/room/src/lib/setting-coverage-contract.test.ts` pins a LIST OF NAMES, and a list of
names is not a backlog. Each name is a question. This document is where the answers live.

## How the list was produced

`apps/room/gate/audit-setting-coverage.mjs` verifies the pinned v4 bundle against its committed
SHA-256, then asks it which of the 269 settings in `room-settings-schema.ts` the reference's own
room client reads as `sessData.<name>` while this room marks them `wired: false`. It opened at 58 on
2026-08-28 and is at **47** as this is written; eleven have been answered by building, and the
CHANGELOG entries for each say what.

Every byte offset below is against that pinned bundle. **Every one was read**, not searched for and
assumed.

## What the dispositions mean

| disposition | meaning |
| --- | --- |
| **NEVER** | Wiring it would be a regression. It stays on the pinned list permanently, and the pin asserts that it does. |
| **NOT A GAP** | The reference's own feature is dead, hard-coded to one customer, or styles nothing. Building it would reproduce a defect. |
| **ENUMERATION ARTEFACT** | The audit's read count is wrong for this name, and why. |
| **WIRE** | Our room already has the surface; it is missing a term or a value. Cheap and evidenced. |
| **FEATURE** | Genuinely unbuilt. Sized by what it needs, not by the setting. |
| **BLOCKED** | Needs something this repository does not have. |

---

## NEVER — credentials the reference ships to every browser

Seven, and the shape is identical in all of them: a password is sent to the client and compared IN THE
CLIENT with `bootbox.prompt`. Anyone with a devtools console reads the value out of `sessData` and
skips the prompt entirely, so upstream these gates protect nothing.

**`internal/room-entry` is the pattern that replaces them**: the credential stays on the controller
and the QUESTION travels. `room-config-boundary.test.ts` enforces that none of these ever reaches
`ROOM_VISIBLE_SETTINGS`.

| setting | reads | what it guards upstream |
| --- | --- | --- |
| `deleteAlertPW` | 12 | Alert deletion, chat-log deletion, `resetAllMediaServers`, `hardResetMediaServerOnServer`, `switchToBackup`. Byte 2,048,668 onward — five separate `i.trim() === sessData.deleteAlertPW` comparisons. |
| `allRoomsWelcomeMatPW` | 3 | `setWelcomeMatNoteTab` with `allRooms: true`, byte 1,474,192. The password is also POSTED back to the server as `pw`, so the server *may* re-check it; the client check is still client-side. |
| `needPasswordForUserNotes` | 2 | `manageAdminNotes`, byte 2,081,795. Already tracked as its own `TODO.md` row with the `internal/room-notes-auth` design. |
| `banIPList` | 1 | `sessData.banIPList.includes(globals.userIP)` at byte 1,194,655 — the whole ban list, in the browser, so a banned member can read every other banned address. |
| `obsStreamKey` | 2 | The OBS ingest URL, byte 2,160,349. This room mints its own through `internal/stream-ingest` on a separate capability. |
| `twillioApiSID` | 1 | Byte 2,138,976 — used only to decide whether to render the SMS row in the alert composer. **The account SID is shipped to answer a yes/no question.** |
| `modAdminLoginList` | 1 | Byte 2,154,474 — same shape, gating a presenter-only block. |

**`restreamToURL` is on the same line without being on this list.** Byte 2,160,069 uses it as the
restream target shown to a presenter. An RTMP target commonly embeds its own stream key in the path,
so it is treated as credential-shaped until somebody reads a real one; it is presenter-only upstream
and would be presenter-only here.

---

## NOT A GAP — the reference's own feature does not work

| setting | evidence |
| --- | --- |
| `h264Enabled` | Byte 1,073,226: `this.forceH264 = this.globals.sessData.h264Enabled \|\| !0`. `!0` is `true`, so the expression is unconditionally true and **the setting has no effect upstream at all**. Wiring it here would be inventing a behaviour the reference does not have. |
| `advancedSearchAlerts` | Byte 2,043,017: `O(6, sessData.advancedSearchAlerts && "56ba547185ae93560d186ea8" == sessData.ownerdID ? 6 : -1)`. The feature is gated on **one hard-coded owner id**. It is not a room setting, it is a customer-specific branch. |
| `smallerImagePreview` | Byte 1,436,548 is a room default with a latch, the same shape as the three built on 2026-08-28 — it seeds `preferences.defaultImagePreview` / `smallImagePreview` once. But `smallImagePreview` was closed by evidence on 2026-08-14: its only effect is the class `chat-uploaded-img-sm`, which **has no rule in any of the 52 stylesheets this repository holds**. See `settings-preference-wiring-contract.test.ts`. A default that seeds a preference that styles nothing is not a feature to reproduce. |

---

## ENUMERATION ARTEFACT — the count is wrong, and here is why

**`name`** is reported with a read count that is almost entirely noise. The audit matches
`.name` and the bundle is full of unrelated `this.name` — `UnsubscriptionError`,
`ObjectUnsubscribedError`, Angular's own `t.name` reflection at byte 11,833.

The real read is one line: `globals.sessionName = r.name` in `loadSessionData`, feeding
`document.title` and the transcript window's `&name=` parameter. **That one IS a small real gap**
and is listed under WIRE below. The count is not evidence of anything.

`description` has the same problem in smaller form (`TransportError.description` at byte 1,034,567,
a new-feature popup's `o.description` at 1,164,735) around one real read at byte 1,179,600 — the
LOGIN page's room blurb, which is the controller's surface and not this room's.

**This is a limitation of matching a bare property name against a minified bundle.** It is recorded
rather than fixed: tightening the pattern to `sessData.<name>` alone would lose the reads that go
through a local alias, which is how three of the settings above are consumed. The list is a set of
questions, and a question that turns out to be noise is answered here.

---

## WIRE — the surface exists here and is missing a term

Ordered by how much of the work is already done.

| setting | byte | what is missing |
| --- | --- | --- |
| `isNewIndicatorOn` | 1,344,539 | `isNewIndicatorOn && isPresenter && msg.isNew` — a presenter-only "new member" marker on a message and on the roster row (byte 2,034,786). Needs `msg.isNew` to have a supply; check before wiring, the way `disableStarYears` was checked. |
| `autoSwitchToOfftopics` | 1,407,102 | On chat init, switch the channel to `offTopic`. Two consumers, main and extra column (2,359,803), and the extra one is additionally gated on `preferences.extraChatColumn`. |
| `name` | see above | `document.title` and the transcript window title. One value, two consumers. |
| `modMessage` | 2,492,450 | A presenter-visible moderator message bar above the presentation area, with a close button that clears it locally (`closeModMessage`). |
| `enablePrivateMessageHistory` | 2,068,615 | One row in the user-info modal. |
| `simplifiedEditor` | 1,468,478 | Picks `"forecolor"` versus `"color"` in the note editor's toolbar config. One string. |
| `styckyNonTradeAlert` | 2,124,407 | Seeds the alert composer's `nonTradeAlert` checkbox. |
| `recsInRoom` | 2,016,810 | `archivesAvailableTo() && sessData.recsInRoom` gates the Recordings tab AND its pane. **Wire it only with the tab** — see BLOCKED. |

---

## CORRECTED — one row of this document was wrong, and reading fixed it

**`enableQAReactions` was filed as WIRE on the first pass and it is a FEATURE.** The correction is
recorded rather than quietly swapped, because the reasoning is the useful part.

The first pass read the gate — `enableReactions && logType === 'chat' || enableQAReactions &&
logType === 'alerts' && isQAMsg` — saw that `sourceMessageBehavior.react` in `message-behavior.ts`
**already implements it exactly**, and concluded that only the supply was missing. That much is
true. What it did not do is ask what `isQAMsg` MEANS.

It is not a property of a message. Byte 2,334,347 is the Q&A modal's own constructor —
`this.isQAMsg = !0, this.logType = "alerts"` — and byte 2,332,907 is that modal rendering its thread
with `("isQAMsg", o.isQAMsg)("qaMsgID", o.qaMsg._id)`. **`isQAMsg` means "this row is being rendered
inside the Q&A thread modal"**, and `enableQAReactions` therefore gates reactions on the entries of
that thread.

This room's Q&A thread does render `RoomMessage` — `ModalHost.svelte:4873` — but it passes
`kind="chat"` where the reference passes `logType="alerts"`, and `onaction={() => {}}`: **the menu
in that modal is inert.** Wiring the flag would light a reaction control that cannot act, which is
the "control whose only effect is changing its own label" this repository forbids by name.

So the work is: give the Q&A thread a real `onaction`, pass `kind="alert"` and `isQaMessage` as the
reference does, and only then does the entitlement have something to gate. That is a feature, and
the `kind` change alone moves five entries in and out of that thread's menu — `publicReply`,
`markAnswered`, `copy`, `openAlertReport` and `edit` all branch on it.

---

## FEATURE — genuinely unbuilt

| setting | byte | size |
| --- | --- | --- |
| `enableQAReactions` | 1,335,445 | Reactions on the entries of the Q&A thread. See CORRECTED above — the rule is already written in `message-behavior.ts`; what is missing is a Q&A thread whose menu acts at all. |
| `hasTypingIndicator` | 1,437,143 | A whole feature: `refreshTypingStatus`, `updateLastTypedTime`, a 5,000 ms `typingDelayMillis` debounce, `usersTyping` / `usersTypingCnt`, a wire round trip, and the display slot `O(22, showTyping && usersTypingCnt > 0 ? 22 : -1)`. Two copies upstream, main and extra column. |
| `usersCanDeleteOwnMsgs` | 1,158,826 | `canDeleteOwnMessage(msg)` — own email hash or own uid, gated on the setting. Needs the `userDeleteChatMsg` command, which is on the command list as absent. |
| `copyTrades` | 1,414,899 | Rewrites `[{( … )}]` inside an alert body into a `span.tradeColor` with a generated id, and swaps the whole message component (byte 1,419,422 picks between two templates on it). |
| `tipMeBtnEnabled` + `tipMeBtnUrl` + `tipMeBtnTxt` | 2,509,208 / 2,509,258 / 2,466,801 | **One feature, three settings**, and the gate is the conjunction of all three: `isTipEnabled = tipMeBtnEnabled && tipMeBtnUrl && tipMeBtnTxt`. The text is both the `title` attribute and the label; the click is `window.open(tipMeBtnUrl, "_blank")`. |
| `positionsIframe` + `positionsIframeUrl` | 2,285,266 | A positions pane with its own refresh loop (`startIframeRefresh` / `stopIframeRefresh`, byte 2,329,124) driven by a `updatePositionsIframe` preference. Two settings, one pane, three render sites. |
| `chatTabsWithBadges` | 1,007,480 | Badge-gated extra chat channels. A JSON list — the schema's help text carries the shape — and `registerForExtraChannels` subscribes only to the channels whose badges the member holds. |
| `enableDiscord` | 2,241,684 | Discord account linking: `checkDiscordAuth()` on load, plus two presenter-only settings rows. |
| `alertsOverlayOnScreenshare` | 1,099,577 | Composites the last four alerts onto the screenshare canvas — `startAlertOverlayCompositor` replaces the outgoing track (byte 1,103,589). Real work in the media path. |
| `customCSS` | 2,595,094 | `addCustomCSS(sessData.customCSS)`. **Read the security note before building**: this injects owner-authored CSS into every member's page. |
| `customFaviconURL` | 2,594,973 | `changeFavicon(...)`, on the same line as `customCSS`. |
| `customPlayerURL` | 1,918,564 | An iframe in the screens pane, chosen over the normal content at byte 2,017,223. |
| `playChatMessageSoundFor` | 1,431,925 | A list of hashed senders whose messages play a sound for this viewer. |
| `showOnlyUsernames` | 2,035,645 | `!sessData.showOnlyUsernames \|\| e.isP` picks between two renderings of a roster entry. Read the two slots before building — the difference is the point. |
| `autoRecord` + `dontStopRecOnMicMute` | 1,116,616 / 1,116,675 | A pair. Auto-start recording when a screenshare begins; do not stop on mic mute unless the flag says so, and only when `talkingUsers.length <= 1`. |
| `altChatRender` | 1,349,126 | Forces `displayMode = "c"`, persists it as the `chatMode` preference, and hides avatars for chat and Q&A messages. |
| `linkedRoomAlerts` | 2,139,184 | One row of the alert composer, cross-posting to a linked room. |
| `hasAlertScheduler` | 1,009,745 | Already tracked in `TODO.md` with its own section — three commands and a server-side scheduler. |
| `openLoginLink` | 1,437,888 | `window.open(sessData.openLoginLink, "_blank", "resizable=yes,top=0,left=0,width=800,height=400")` on chat init. **A popup on page load**; decide whether to reproduce it before building. |

---

## BLOCKED

| setting | blocked on |
| --- | --- |
| `recsInRoom` | The Recordings tab it gates. `presAreaTabs-recordings` is an iframe onto a server archive page, and there are zero recordings or archive tables in either database. `TODO.md` carries the blocker. Wire the setting WITH the tab, never before it. |
| `isLocked` | Byte 1,148,353 — refuses a non-presenter at connect with a named dialog, and byte 2,500,128 offers the presenter an unlock confirm. Needs a lock the SERVER owns; `room_state` has no column for it, and a client-side lock is not a lock. |
| `backupClusterID` | Media infrastructure — a second MediaMTX cluster. Same blocker as every other `STREAM_SERVER_MTX` row. |
| `recordChat` | Only ever read inside the `videoOnlyMode` recording-bot branch (bytes 1,497,779 and 2,498,823), and this room does not model the `r` query parameter. The same honest gap `files-gates.ts` already records for `hideFiles`. |
| `authMode` | Login-page state on the controller side, not a room read. `e.authMode` is a component field. |
| `description` | The login page's room blurb — the controller's surface, and already documented there. |

---

## The eleven already answered

| setting | answer | date |
| --- | --- | --- |
| `hideNotes` | WIRED — the Notes tab and pane now honour it. | 2026-08-28 |
| `darkThemeAsDefault` | WIRED — `room-defaults.ts`, latched. | 2026-08-28 |
| `alertSoundOff` | WIRED — same module. | 2026-08-28 |
| `alertsChatOnBottom` | WIRED — same module. | 2026-08-28 |
| `dontShowRecInfoToUsers` | CORRECTED — the gate existed and read a viewer preference nothing writes. | 2026-08-28 |
| `chatDisabledForTrials` | WIRED — `chatComposerAvailable` now holds all three reasons the composer is off. | 2026-08-28 |
| `hasQAOnAlerts` | WIRED — the ask-a-question button was gated on a prop defaulting to `true` that nothing passed. | 2026-08-28 |
| `alwaysShowRoster` | WIRED — the sidebar seed. Its SECOND upstream use, a third term on the mobile-app icon, is refused with the reason at `RoomGates.mobileAppAvailable`. | 2026-08-28 |
| `hasSpeechRecognitionDisabled` | WIRED — `beginSpeechRecognition` quoted "or session settings" and gated on preferences alone. | 2026-08-28 |
| `hideWebcamForRoom` | WIRED — the fifth term of the webcam control's gate, and the only one this room could not evaluate. | 2026-08-28 |
| `blinkingRec` | WIRED — `breathing-rec`, which unlike `smallImagePreview`'s class has a real keyframe rule. | 2026-08-28 |
