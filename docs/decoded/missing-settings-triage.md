# The settings the reference reads and this room does not — triaged

**Written 2026-08-28.** Companion to `missing-commands-triage.md`, and it exists for the same
reason: `apps/room/src/lib/setting-coverage-contract.test.ts` pins a LIST OF NAMES, and a list of
names is not a backlog. Each name is a question. This document is where the answers live.

## How the list was produced

`apps/room/gate/audit-setting-coverage.mjs` verifies the pinned v4 bundle against its committed
SHA-256, then asks it which of the 269 settings in `room-settings-schema.ts` the reference's own
room client reads as `sessData.<name>` while this room marks them `wired: false`. It opened at 58 on
2026-08-28 and is at **27** as this is written; thirty have been answered by building, one more
is answered NOT A GAP, and the CHANGELOG entries for each say what.

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
| **DERIVED** | The feature is BUILT, and the raw setting still does not cross — the controller sends what the room actually needs instead. Added 2026-08-28. |

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

**`openLoginLink` — DECIDED 2026-08-28 and it is NOT A GAP.** The row used to say *"a popup on page
load; decide whether to reproduce it before building"*, and the decision is: no.

```js
sessData.openLoginLink &&
  window.open(sessData.openLoginLink, "_blank", "resizable=yes,top=0,left=0,width=800,height=400")
```

Bytes 1,437,913 and 2,384,175 — the same statement at the end of BOTH chat components' init, beside
`chatEnabled` and `webinarMode`. Two things make it a defect rather than a feature:

* It runs during component INITIALISATION, not from a click, and the options string it passes is
  exactly the popup shape browsers block without a user gesture. The reference does not check
  `window.open`'s `null` return, so a blocked open is silent — there is no fallback and no message.
* Because the statement is in both chat components, a member with the extra chat column enabled
  gets it **twice**.

Building it faithfully would ship a blocked popup and a browser warning bar; building it "safely" —
as a link the member can click — would be inventing a control the capture does not have.
`custom-player-contract.test.ts` asserts the room opens no window on load, so this decision cannot be
quietly reversed by somebody reading the settings list alone.

---

## ENUMERATION ARTEFACT — the count is wrong, and here is why

**`name`** is reported with a read count that is almost entirely noise. The audit matches
`.name` and the bundle is full of unrelated `this.name` — `UnsubscriptionError`,
`ObjectUnsubscribedError`, Angular's own `t.name` reflection at byte 11,833.

The real read is one line: `globals.sessionName = r.name` in `loadSessionData`, feeding
`document.title` and the transcript window's `&name=` parameter. **That one WAS a small real gap and
is now built** — `<svelte:head>` in `routes/+page.svelte`, answered 2026-08-28 — so this row is the
clearest case this document has for its own rule: a row's read count says nothing about its size.
`name` sat near the top of the list and cost three lines of markup.

The transcript window's `&name=` parameter is the half that is **not** built — see the section at the
end of this document, which is where a setting's remaining consumers go once the setting itself has
been answered.

`description` has the same problem in smaller form (`TransportError.description` at byte 1,034,567,
a new-feature popup's `o.description` at 1,164,735) around one real read at byte 1,179,600 — the
LOGIN page's room blurb, which is the controller's surface and not this room's.

**This is a limitation of matching a bare property name against a minified bundle.** It is recorded
rather than fixed: tightening the pattern to `sessData.<name>` alone would lose the reads that go
through a local alias, which is how three of the settings above are consumed. The list is a set of
questions, and a question that turns out to be noise is answered here.

---

## WIRE — the surface exists here and is missing a term

**This section opened with twelve rows and is down to one**, and two of the eleven that left were
CORRECTIONS rather than builds — see the section below. The pattern both shared is worth carrying
into whatever is filed here next: a gate whose SURFACE exists reads as cheap, and says nothing about
whether the ACTION behind it does.

| setting | byte | what is missing |
| --- | --- | --- |
| `recsInRoom` | 2,016,810 | `archivesAvailableTo() && sessData.recsInRoom` gates the Recordings tab AND its pane. **Wire it only with the tab** — see BLOCKED. |

---

## CORRECTED — three rows of this document were wrong, and reading fixed them

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

**BUILT 2026-08-28**, and the size the row should have carried is worth stating, because the
correction above still under-called it. What it needed:

- two commands, `reactToQuestion` and `deleteQuestion`, addressing a question **by its own row id**
  — the reference cannot, and sends the parent alert plus an ORDINAL instead (1,354,136 / 1,159,097),
  which is a race the moment a neighbour is deleted;
- `reactions_json` on `alert_questions`, because a reaction belongs to the row it is on;
- `room_short_code` on the same table, which **reversed a decision this repository had written
  down** and fixed a silent data loss — see the DEFECTS section below;
- the thread extracted to `AlertQaModal.svelte`, because the size ratchet refused the raise.

**Three of the five entries that turn on with `kind` are NOT drawn**, and this is the part the
correction got wrong in the other direction. `showToAll`, `openAlertReport` and `edit` all address
`this.msg._id`, and a Q&A entry has no `_id` — which is precisely why the two things the reference
CAN do to one address it by alert-plus-ordinal. They are dead upstream, so drawing them here would
ship three controls whose only effect is changing their own labels. `message-behavior.ts` carries
the suppression and its evidence; `qa-thread-contract.test.ts` asserts each one is offered on a
plain alert and refused inside the thread.

**`enablePrivateMessageHistory` was filed as WIRE — "One row in the user-info modal" — and it is a
FEATURE.** Corrected 2026-08-28, and the shape of the mistake is the same as the one above: a gate
whose SURFACE exists and whose ACTION does not.

The button really is one row, and it really does exist to be gated. What it opens did not. The chain,
read end to end this time:

```
O(102, sessData.enablePrivateMessageHistory ? 102 : -1)                         byte 2,068,640
hTe: <button data-bs-target="#all-user-pm-modal">
       <i class="icon fas fa-comment"></i> Show private messages </button>
showPrivateMessages(): guiEventBus.emit("doUserPMModal", {peerID, nick})        byte 2,087,336
the modal: subscribe -> clearData() -> loadLogs()
           -> invokeAdminCmd("getAllUserPM", {peerID})                          byte 2,417,900
```

**`#all-user-pm-modal` in this room was a permanent `Loading...` spinner.** No fetch, no list, no
empty state — and, measured, nothing in the repository that could open it: `'all-private'` occurred
exactly twice, as the modal's own `open=` and as a member of the union in `types.ts`.
`getAllUserPM` was on `feature-coverage-contract.test.ts`'s list of commands absent from our source,
which is where the first pass should have looked before writing "one row".

**BUILT 2026-08-28**, and it is worth saying what it needed, because that is the size the row should
have carried: a bounded repository read (`loadPeerHistory`), a remote command that decides BOTH the
role and the entitlement on the server from the control plane, three fields of modal state, the
modal's two captured branches plus two the reference does not have (a refusal and a truncation
notice), and the row markup extracted to `CompactMessageRow.svelte` so it was not transcribed twice.

**It is the widest read in the room.** A presenter sees the member's private conversations with
everybody, not the thread they share with the presenter — which is what the setting is named for and
why the entitlement is checked where a client cannot reach it.

**`isNewIndicatorOn` was filed as WIRE and it is BLOCKED.** Corrected 2026-08-28. The row's own
caveat was right — *"Needs `msg.isNew` to have a supply; check before wiring"* — and the check is
what changes the disposition: there is no supply and there cannot be one from evidence, because
`isNew` is produced by the reference's server rather than derived in its client. Inventing a rule
("joined in the last N days") would be inventing the decision the setting exists to express.

**The check found a live defect on the way, and it is fixed.** `ModalHost.svelte` rendered
`{#if targetUser.isTrial}` and `{#if targetUser.isNew}` where the capture has
`O(19, isPresenter && user.isFT ? 19 : -1)` and
`O(20, isNewIndicatorOn && isPresenter && user.isNew ? 20 : -1)` — **one term between the two
badges**. `isTrial` HAS a supply, so any member opening another member's info card could read their
billing status. Both badges now carry the presenter term; the third term stays out with the reason at
the code, and `moderation-badge-contract.test.ts` re-measures the absence of an `isNew` supply rather
than quoting this paragraph.

---

## DEFECTS this triage found in OUR code, not in the reference

A setting is a question about the reference, and answering one keeps turning up something wrong on
this side. Recorded here because the CHANGELOG is chronological and this is the list somebody wants
when deciding what to read next.

**A question asked on a CAPTURED alert was written and never read back.** Found 2026-08-28 while
building `enableQAReactions`. `askQuestion` resolves a negative alert id through the fixture and
writes a real `alert_questions` row — deliberately, with its own comment saying so — and
`loadQuestionsForAlerts` dropped every one of them, because it reached its room by joining `alerts`
and a fixture alert has no row to join to. `+page.server.ts` did not pass their ids either. A member
asked, was told nothing, and watched the thread go on saying *"There are no questions."*

`alert-log.ts` had argued in writing that a `room_short_code` column *"would denormalise a fact this
schema already derives"*. It does not derive it for every row, and those rows had **no room anchor at
all** — two rooms serving the same captured alert would have shared their questions the moment
anything did read them. The column is the anchor now, and the reversal is recorded where the old
argument was. The same missing term was in the answered-sweep and the recount, both keyed on
`alertId` alone; real alert ids are globally unique, which is exactly why the hole was invisible.

**`mute24` carried a row coordinate it never read.** Same day, same feature. The shared `{ kind, id }`
target rode on the mute operation and the branch used neither — it mutes a USER. Harmless until the
Q&A thread needed it: a question is neither an alert nor a chat message, so muting its author through
the shared shape meant labelling a question id as one of the two, and the day anything started
reading `id` it would have acted on the wrong table.

**A reply could be posted into a channel the replier could not read.** Found 2026-08-28 while
building `chatTabsWithBadges`, and it existed only because that setting created private channels at
all. `replyMessage` looks its target up by ROOM and id — never by channel — and then inserts into
`original.room`. Without a check a member could name the id of a message in a badge channel and post
a reply INTO it, quoting the line they were replying to back at the people who can read it. Refused
with the same 404 the cross-room case gets, because a 403 would confirm the id exists.

**The realtime chat fan-out went to every listener in the room.** Same feature, same day.
`publishChatToRoom` carries no body, which is why it is built per listener at all — but it carries
the sender, the channel and the fact that something happened, and it is what makes a client refetch.
A badge channel's frames would have told every member that a private channel exists and that
somebody just posted in it. `publishTypingToRoom` had the same shape and named who was active there.

**Two badges leaked another member's billing status.** Found earlier the same day while checking
`isNewIndicatorOn`; recorded in the CORRECTED section above.

---

## FEATURE — genuinely unbuilt

**All FOUR remaining rows need something this container does not have**, and each obstacle was
measured on 2026-08-28 rather than inherited. This section stays separate from BLOCKED because these
are features with a known size, not questions with an unknown answer: what to build is understood in
every case, and only the means to verify it is missing.

| row | what it needs, measured |
| --- | --- |
| `enableDiscord` | A Discord application registration. Owner's call — there is nothing to link to. |
| `alertsOverlayOnScreenshare` | A human at a screen picker. `getDisplayMedia` cannot be automated and headless returns a synthetic gradient, so a compositor that replaces the outgoing track would ship to the most fragile path in the room with nothing able to look at the result. |
| `autoRecord` + `dontStopRecOnMicMute` | A server-side recorder, which does not exist. Same blocker `start-recording` / `stop-recording` carry. |
| `hasAlertScheduler` | A scheduler process in `services/api`, and the crate's TEST targets cannot be built here. **The Rust position is narrower than it has been written down as, measured today:** `cargo check -p tradingroom-api --features testing` and `cargo clippy … -- -D warnings` are both GREEN in this container. What fails is `cargo test`, because the crate dev-depends on `tradingroom-media` for one contract test, that pulls `mediasoup-sys`, and its build script fetches `libsrtp` from GitHub where the egress proxy answers **403**. So a `services/api` change can be compiled and linted here and cannot be unit-tested — and a timer that writes to a multi-tenant fintech database is not something to ship on a compile. |

| setting | byte | size |
| --- | --- | --- |
| `enableDiscord` | 2,241,684 | Discord account linking: `checkDiscordAuth()` on load, plus two presenter-only settings rows. |
| `alertsOverlayOnScreenshare` | 1,099,577 | Composites the last four alerts onto the screenshare canvas — `startAlertOverlayCompositor` replaces the outgoing track (byte 1,103,589). Real work in the media path. |
| `autoRecord` + `dontStopRecOnMicMute` | 1,116,616 / 1,116,675 | A pair. Auto-start recording when a screenshare begins; do not stop on mic mute unless the flag says so, and only when `talkingUsers.length <= 1`. |
| `hasAlertScheduler` | 1,009,745 | Already tracked in `TODO.md` with its own section — three commands and a server-side scheduler. |

---

## BLOCKED

| setting | blocked on |
| --- | --- |
| `isNewIndicatorOn` | **Its data.** The gate is `isNewIndicatorOn && isPresenter && <row>.isNew` at four sites (bytes 1,344,564 / 1,382,617 / 2,034,811 / 2,060,925), and `isNew` is not computed in the browser at all: it arrives on the login payload from the reference's own server — `globals.user.isNew = B.data.isNew` (995,175), `isNew: s.isNew || !1` (1,157,344) — so the rule deciding who counts as new is unknowable from the capture. Measured 2026-08-28: `isNew` occurs ZERO times in `apps/room/src/lib/server` and zero times on the controller. Crossing the setting would put a gate on a value nothing supplies, which is what `enableBadges` was held out of the boundary to avoid. Unblocked by one answer from the owner about what makes a member new, or by a capture of that login response. |
| `linkedRoomAlerts` | **The server-side fan-out, which is not in the capture.** The setting's own help text is *"Comma separated list of Room IDs of the rooms to PUSH our alerts to"* — the pushing is the reference's SERVER. What the client contributes is one composer row (`WTe`, byte 2,119,618) whose checkbox is `dontCrossPost`, sent on the `alertMsg` and `alertMsgLater` payloads. **Measured 2026-08-28: `crossPost` occurs ZERO times in the bundle**, so the browser never does the fan-out and never reads the flag back. Building the checkbox alone would ship a control whose only effect is sending a field nothing reads — the thing this repository refuses by name. Unblocked by cross-posting existing at all, which is its own feature and needs an owner decision about what "linked room" means across two databases. |
| `recsInRoom` | The Recordings tab it gates. `presAreaTabs-recordings` is an iframe onto a server archive page, and there are zero recordings or archive tables in either database. `TODO.md` carries the blocker. Wire the setting WITH the tab, never before it. |
| `isLocked` | Byte 1,148,353 — refuses a non-presenter at connect with a named dialog, and byte 2,500,128 offers the presenter an unlock confirm. Needs a lock the SERVER owns; `room_state` has no column for it, and a client-side lock is not a lock. |
| `altChatRender` | **The captured evidence roots, and this is a RECLASSIFICATION from FEATURE — measured 2026-08-28.** The compact renderer itself is fully transcribable from the pinned bundle: `app-st-compactmessage`'s const table (byte 1,395,475), its template (1,399,986) and its own `styles:[…]` block were all read today, and the two classes our stylesheets lack — `.nowrap{white-space:nowrap;display:table}` and `.reactions-container{margin-left:20px}` — are in that block. They are absent from `css/complete-app-styles.css` for the correct reason: this room renders neither, because it has no compact mode. **What is blocked is building it cleanly.** Compact and regular share one ten-entry kebab menu, so the honest build extracts that menu out of `RoomMessage.svelte` — and `room-message-render.test.ts` pins *"all 18 captured kebabs with the exact labels and source order"*, the exact string `msgMenu dropright pt-1` and `dropdown-menu users-dropdown-options`. It is one of the 49 evidence-bound files EXCLUDED in this checkout (`gate/evidence-bound-tests.mjs`; 13 of 14 capture roots missing), so that extraction is a change to the room's most-rendered component with its one guard switched off. The alternative — a second copy of that menu and its ten gates — is the duplication `room-message-chrome.ts` exists to prevent. Unblocked by the capture roots being present, which is one `ln -s` on the owner's machine. |
| `backupClusterID` | Media infrastructure — a second MediaMTX cluster. Same blocker as every other `STREAM_SERVER_MTX` row. |
| `recordChat` | Only ever read inside the `videoOnlyMode` recording-bot branch (bytes 1,497,779 and 2,498,823), and this room does not model the `r` query parameter. The same honest gap `files-gates.ts` already records for `hideFiles`. |
| `authMode` | Login-page state on the controller side, not a room read. `e.authMode` is a component field. |
| `description` | The login page's room blurb — the controller's surface, and already documented there. |

---

## The thirty already answered

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
| `autoSwitchToOfftopics` | WIRED — a SEED on `RoomChat`'s main column; the extra column already defaults there. | 2026-08-28 |
| `styckyNonTradeAlert` | WIRED — re-applied on EVERY modal open, which is what sticky means. | 2026-08-28 |
| `name` | WIRED — the document title, `<svelte:head>` on the room page. Two further consumers stay unbuilt and are listed in the last section. | 2026-08-28 |
| `modMessage` | WIRED — `ModeratorMessage.svelte`, presenter-only, dismissed locally exactly as upstream dismisses it. | 2026-08-28 |
| `simplifiedEditor` | WIRED — a field of `NoteSurfaceGates`; the note toolbar's colour control becomes foreground-only. The first row whose downstream VENDOR is absent from the capture, so the decision is reproduced and the unevidenced part is named. | 2026-08-28 |
| `enablePrivateMessageHistory` | BUILT — corrected out of WIRE first: the button was one row, and the modal it opens was a spinner with no fetch. `getAllUserPM` now exists, bounded, and refuses on the server. | 2026-08-28 |
| `showOnlyUsernames` | BUILT — `rosterRowIsFull`. The row's own advice paid off: `e` is the ROW, so the setting reduces MEMBER rows and leaves presenters in full, for every viewer. The obvious reading was the exact inverse. | 2026-08-28 |
| `tipMeBtnEnabled` + `tipMeBtnUrl` + `tipMeBtnTxt` | BUILT — `tipButtonFor`, one conjunction feeding both captured render sites. The URL is checked for `http:`/`https:` here, which the reference does not do. | 2026-08-28 |
| `customFaviconURL` + `customCSS` | BUILT — `RoomBranding`. The upstream `indexOf("https")` check that decides link-versus-inline is a substring test and is fixed by parsing: ordinary CSS mentioning an https URL was being set as a stylesheet href, and a plain `http://` stylesheet was being injected as CSS text. Both failures were silent. | 2026-08-28 |
| `customPlayerURL` | BUILT — `PresentationArea`'s `#screens` pane. It replaces the WHOLE pane including the save-data switch, and the URL is scheme-checked here: the reference binds it through `bypassSecurityTrustResourceUrl`, i.e. it explicitly opts out of its own sanitiser. | 2026-08-28 |
| `copyTrades` | BUILT — `copy-trades.ts` plus a `trade` segment on `RoomMessage`. Alerts only, as upstream gates it. Divergence: the reference's two `String.replace` calls take string patterns, so it makes only the FIRST order in a message copyable; the room splits every balanced pair. | 2026-08-28 |
| `positionsIframe` + `positionsIframeUrl` | BUILT — `PositionsContainer` and `PositionsControls`, wired at nodes 3 and 5 of the presentation split area. ONE feature, two settings, conjoined once on the page. The thirty-second reload is behind a SECOND per-viewer gate, ANDed, so a member who never opens the panel has no background timer. | 2026-08-28 |
| `usersCanDeleteOwnMsgs` | **BUILT, and it closed a hole.** The row's caveat — *"needs the `userDeleteChatMsg` command, which is absent"* — was FALSE: `messageAction`'s delete branch already let a member remove their own message, on all three item kinds, and never asked whether the room allowed it. The setting is now checked on the SERVER from the control plane, and the menu entry it feeds was defaulting off the whole time so nothing showed the gap. | 2026-08-28 |
| `chatTabsWithBadges` | **BUILT, and it is the first row to change a TYPE.** This room had two chat channels hard-coded in three components behind a closed `ChatTab` union. An owner can configure more, behind badges, so the set is per room and per member — and the reference decides it in the BROWSER, so every read and write path here asks the server instead (`memberChatChannels`), and the chat and typing fan-outs became audience-aware. An entry with an EMPTY badge list is public, which is upstream's own `[].every(…)` and is reproduced with a test saying so. | 2026-08-28 |
| `enableQAReactions` | **BUILT, and it was filed as a one-line WIRE twice over.** The rule was already transcribed and could never evaluate true — the Q&A thread rendered `kind="chat"` behind an inert handler. It needed two commands addressing a question by its own row id, two columns on `alert_questions`, and the thread extracted to its own component. Three menu entries that turn on with `kind="alert"` are deliberately NOT drawn: they address an `_id` a thread entry does not have, and are dead upstream. | 2026-08-28 |
| `hasTypingIndicator` | BUILT — `lib/server/typing.ts` (an in-memory registry swept on read), `setTyping`, `publishTypingToRoom`, `TypingSignal` and the indicator in both columns. It gates the SEND as well as the display. The animated dots are deliberately NOT drawn: neither `app-typing-indicator-dots` nor `.typing-indicator` has a rule in any stylesheet we hold. | 2026-08-28 |

---

## DERIVED — the feature is built and the raw setting still does not cross

A setting can be honoured without being sent. This is the third kind of answer, and it exists
because the first two — *wire it* and *do not wire it* — could not describe what happened here.

| setting | byte | what crosses instead |
| --- | --- | --- |
| `playChatMessageSoundFor` | 2,595,225 and 1,431,949 | **Email HASHES.** The setting holds member email ADDRESSES, and the reference ships them to every browser to hash there, then compares the result against `e.avt` — the sender's hash — on each arriving message. The room never needs the addresses. `internal/room-config/[code]` splits and hashes the list and sends `chatSoundForEmailHashes`, exactly as it already does for `badges.byEmailHash`. **`playChatMessageSoundFor` stays `wired: false` and stays on the pinned list**, which is correct: that list asks whether the RAW VALUE crosses, and the answer is no and should remain no. |

**Two upstream defects are not reproduced, and both are silent.**

1. `sessData.playChatMessageSoundFor.replace(" ", "")` uses a STRING pattern, and `String.replace`
   applies one to the FIRST occurrence only. Measured: in `a, b, c` the space before `b` goes and
   every entry from the THIRD on keeps its own, so a five-address list has three entries that hash
   to digests no sender can ever match. The controller splits on `/[\s,]+/`.

2. The branch that chooses between the two sounds reads
   `followedUsers[e.avt].followChatStyle.playSound` after checking only that the map is NON-EMPTY.
   For a member who follows anybody, every message from a sender they do NOT follow evaluates
   `undefined.followChatStyle` and throws — swallowed by the surrounding `try/catch`. **So
   `dingOnNewMessage` and this list both go silent the moment a member follows one person.**
   `chat-arrival-sound.ts` takes a resolved boolean rather than the map, so it cannot happen.

---

## Consumers still unbuilt behind an ANSWERED setting

A row leaves the WIRE table when the setting is read, not when every use of it upstream has been
reproduced. **That is the gap this section exists to stop from disappearing**: `name` reads as done
in the answered table and in `setting-coverage-contract.test.ts`, and two of its consumers are not
built. Nothing else would say so.

| consumer | byte | what is missing |
| --- | --- | --- |
| transcript window title (`name`) | 1,958,716 and 2,532,633 | `openTranscript` passes the room name as a `&name=` query parameter to the transcript popup. Blocked with the transcript window itself, which this room does not open. |
| private-chat tab flasher (`name`) | 2,207,601 | On an unread private message the title alternates between `"<sender> messaged you - <room>"` and the room name on a timer, and stops on focus. Needs the private-message unread signal, not the title. |

`moderator-message-contract.test.ts` asserts that neither has quietly appeared on the page, so adding
one without deleting its row here fails a test rather than going unrecorded.
