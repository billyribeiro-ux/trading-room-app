# Room component gap register — the v4 bundle against `apps/room`

**Opened 2026-08-16.** The room had no equivalent of
[`evidence-gap-register.md`](./evidence-gap-register.md), which tracks the CONTROLLER against
`apps/controller/evidence-dumps/`. That register covers `page.manageSession.html`,
`page.welcome.html` and their siblings — 70 rows, 31 closed. **It says nothing about the room**, and
room gaps have been tracked ad hoc in `TODO.md` rows instead. This file is the room's tracker.

**Same rules as the controller register.** A row is only `CLOSED` when a specific citation is written
next to it. `OPEN` means nobody has done it. `WON'T FIX` means a decision was taken and the reason is
recorded. **Never mark a row closed on reasoning alone.**

## The corpus

`apps/room/docs/source/` — the deployed Angular 17 room build: `main.d6d3c112b59b7d0d.js`,
`styles.d622cb9ed2bbc221.css`, and **194 decoded files covering 51 components** in
`docs/source/components/` (`.full.js`, `.compiled.js`, `.render-helpers.js`, `.component.css` each).

The decode is proven complete by `pull-everything-contract.test.ts`, which asserts the extractor
finds every `selectors:[` definition in the bundle rather than a hardcoded list, and names
`app-kicked-page`, `app-detached-screen` and others precisely because **no session renders them** —
so a DOM capture can never show them and only the bundle can.

## Method, and its honest limit

**Step 1 — inventory by rendered element.** For each of the 51, search `apps/room/src` for the
reference custom element (`<app-alerts>`, `<app-presentationarea>`, …). **42 of 51 are rendered.**

**This step LOCATES; it does not CONCLUDE.** Four of the nine that failed it are fully built without
the custom-element wrapper, and a marker search alone would have reported them missing. Every row
below was settled by opening the reference component and our source and reading them.

**Step 2 — per-component completeness.** Element present ≠ every gate, control and branch ported.
**This step is NOT DONE for the 42.** That is the bulk of the remaining audit and it is why the
status table below carries an explicit `NOT AUDITED` count rather than implying coverage.

---

## Rows

| id | component | status | evidence |
|---|---|---|---|
| R-1 | `app-typing-indicator-dots` | **OPEN — real gap, fully captured** | See below. |
| R-2 | `app-positions-container` | **OPEN — real gap, fully captured** | See below. |
| R-3 | `app-kicked-page` | **OPEN — real gap, fully captured** | See below. |
| R-4 | `app-session-transcript` | **OPEN — real gap, fully captured** | See below. Reference read whole 2026-08-16. |
| R-5 | `app-closed-session-page` | **OPEN — real gap, fully captured** | See below. Reference read whole 2026-08-16. |
| R-6 | `app-detached-screen` | **OPEN — divergent by design, fully captured** | See below. Reference read whole 2026-08-16. |
| R-7 | `app-session-login` | **CLOSED — built as a route** | `src/routes/session/+page.svelte` + `+page.server.ts`, with the reference's 120-entry const table and `app-session-login.component.css` transcribed, and the "nothing auto-submits it" behaviour recorded from `app-session-login.full.js:408,451,908,948`. |
| R-8 | `app-streaming-view` | **CLOSED — built without the wrapper** | `StreamingView.svelte`, hls/m3u8. Rendered inside a `div.h-inherit` host because Angular has a host element and Svelte does not — recorded at the call site in `PresentationArea.svelte`. |
| R-9 | `app-screenshare-view` | **CLOSED — built without the wrapper** | `ScreenPane.svelte`. Its captured `controls`-attribute omission is a recorded deliberate decision (`TODO.md`, "Not gaps"). |
| R-10 | the other 42 | **IN PROGRESS** | The reference element is rendered. Completeness of gates, controls and branches is being audited component by component; each closed one gets its own row below. |
| R-11 | the query-parameter contract | **OPEN — 6 absent, 2 wired at one end only** | See below. `app-root.full.js:196-243`. |
| R-12 | `app-root`'s page switch and subscriptions | **OPEN — fully captured** | See below. We render the tag; the shell behind it is absent. |
| R-13 | `app-scplayer`'s undeclared bug-fix | **OPEN — decision needed, not code** | See below. We corrected a reference defect without recording it. |
| R-14 | `app-ytplayer`'s late-join seek | **OPEN — already declared, blocked** | See below. Declared at `+page.svelte:7183-7201`; blocked on persisted room video state. |

---

## R-1 — `app-typing-indicator-dots` is not built, and it belongs in the chat panes

**Reference, read whole** (`app-typing-indicator-dots.full.js`, 1,231 B — 4 decls):

```
div.typing-indicator > span, span, span
```

Scoped CSS, captured verbatim: `.typing-indicator{display:flex!important}`; each `span` is
`height:3px; width:3px; float:left; margin:0 1px; background-color:#9e9ea1; display:block;
border-radius:50%; opacity:.4`; the three blink on a staggered `1.5s … infinite` at `.3333s`,
`.6666s` and `.9999s`, with `@keyframes blink{50%{opacity:1}}`.

**Where it renders upstream:** `app-chat` and `app-extra-chat` — read from
`app-chat.full.js`, `app-chat.render-helpers.js`, `app-extra-chat.full.js`,
`app-extra-chat.render-helpers.js`. Those are our `AlertChatArea.svelte` and `ExtraChatPane.svelte`.

**The gate, verbatim:** `O(22, usersTypingCnt > 0 ? 22 : -1)`.

**The state behind it,** counted in `app-chat.full.js`: `usersTyping`, `usersTypingCnt`,
`typingTimer`, `typingDelayMillis`, `showTyping`, `refreshTypingStatus`, `amITyping`,
`typingUpdated`, `typingUpdate`.

**Ours:** `.typing-indicator-container` rules ARE ported into
`src/lib/styles/captured-runtime-components.css` (for `app-reply-modal`, `app-alert-qa-modal` and a
chat-scoped rule) — **but nothing in `src/**/*.svelte` renders a typing indicator at all.** The CSS
arrived with the captured stylesheet; the feature did not.

**Blocks:** the "someone is typing" affordance in both chat columns. **Needs:** a wire signal for
typing — the transport half is not established here and must not be invented.

## R-2 — `app-positions-container` is not built

**Reference, read whole** (`app-positions-container.full.js`, 2,531 B — 3 decls):

```
div.positionOverlay.animated.fadeIn > iframe[src]
```

- `src` is `sessData.positionsIframeUrl` cache-busted per load: `+ (url.includes('?') ? '&' : '?') + 't=' + Date.now()`
- bound through a `noSanitize` pipe as a `resourceUrl`, so the URL bypasses Angular's sanitiser
- **30-second refresh**: `setInterval(loadPositionsContainer, 3e4)`, cleared on destroy
- gated on `preferences.updatePositionsIframe && globals.showPositions`
- driven by two bus events: `updatePositionsIframe`, `updatePositionsIframeChanged`
- CSS verbatim: `.positionOverlay{display:block;position:absolute;bottom:60px;right:0;width:100%;height:300px;z-index:11;padding:0 5px}` and `.positionOverlay iframe{width:100%;height:100%}`

**Ours:** no `positionsIframeUrl`, no positions overlay, no `showPositions`.

**Note for whoever builds it:** it embeds a THIRD-PARTY URL from room settings in an iframe with the
sanitiser bypassed. That is a security decision to take deliberately, not to copy.

## R-3 — `app-kicked-page` is not built

**Reference, read whole** (`app-kicked-page.full.js`, 822 B — 4 decls):

```
div.container.h-100 > div.d-flex.d-flex-column.h-100.w-100 > h2.align-self-center.w-100 > {{msg}}
```

`msg` is an `@Input` defaulting to the string `'kicked'`. Scoped CSS is one rule:
`h2{color:#000;vertical-align:middle;text-align:center}`.

**Ours:** the two `kicked` occurrences in `+page.svelte` are the ADMIN action — the confirm text
`'You have been kicked from the room by an administrator'` and the `'User kicked OK'` toast. **The
page a kicked member lands on does not exist.**

Note `d-flex-column` — not Bootstrap's `flex-column`. Transcribe it; do not correct it.

## R-4 — `app-session-transcript` is a whole page, not a link

**Reference, read whole** (`app-session-transcript.full.js`, 20,427 B — 20 decls, 6 vars).

**How it is reached.** `app-root` mounts it through the ROUTER, not through the `currPage` switch:
`isTranscriptRoute` is true when the URL contains `/session-transcript`, checked three ways —
`router.url`, `window.location.hash`, and a `NavigationEnd` subscription — and when it is true the
entire 5-way page switch renders nothing (`O(1, o.isTranscriptRoute ? -1 : 1)`,
`app-root.full.js:353`). A `#/session-transcript` hash is re-navigated through `navigateByUrl` on
init (`:59-65`). This is the URL our `openTranscriptPage()` comment already transcribes.

**Inputs.** `token` and `name` from `route.queryParams`; if `token` is still unset, a regex over
`window.location.hash` for `[?&]token=([^&]+)` and `[?&]name=([^&]+)`, `decodeURIComponent`d; failing
that, `globals.sesionToken`. No token at all → `error = 'No session token available'`.

**The API call.** `appService.getSessionTranscripts(token, { startDate, page, limit })` returning
`{ success, transcripts, pagination: { page, hasMore, hasPrevious, totalCount, totalPages }, error }`.
`pageSize = 300`.

**Two date constants that are NOT interchangeable and must be transcribed, not reasoned about:**

- the query's `startDate` is `new Date(Date.UTC(y, m, d, 13, 0, 0)).toISOString()` — **13:00 UTC**
- the date picker parses to `new Date(y, m-1, d, 8, 0, 0)` — **08:00 LOCAL**

**Layout.** `div.transcript-container > div.transcript-header + div.transcript-body`. Header is
`h2` reading `Session Transcript for: {sessionName}`, a `Date:` label + `input#date-picker[type=date]`,
a search `input` placeholder `Search transcripts...` firing on both `input` and `keyup.enter`, a
clear-search `span.input-group-text.btn.btn-light` (`fa-times`, title `Clear search`) shown only when
`searchText.length > 0`, and a search `span` (`fa-search`, title `Search`). Below them
`div.pagination-info` — `Showing {n} of {totalCount} entries` plus `(Page {currentPage+1} of
{totalPages})` when `totalPages > 0` — shown only when `totalCount > 0`.

**Body is a three-way**, `O(17, o.loading && 0 === o.transcripts.length ? 17 : o.error ? 18 : 19)`:
spinner (`Loading...` / `Loading transcripts...`), error (`fa-exclamation-triangle`, the message, a
`Retry` button calling `loadTranscripts()`), or the list.

**The five pagination buttons are rendered TWICE** — `.pagination-controls-top` above the entries and
`.pagination-controls-bottom` below, identical markup and identical handlers:

| label | class | icon | `disabled` |
|---|---|---|---|
| `Load Previous Day` | `btn btn-primary` | `fa-arrow-up` before | `loading` |
| `Load Prev` | `btn btn-secondary` | `fa-chevron-up` before | `loading \|\| currentPage === 0` |
| `Load More` | `btn btn-secondary` | `fa-chevron-down` after | `loading` |
| `Load Next Day` | `btn btn-primary` | `fa-arrow-down` after | `loading` |
| `Reset to Today` | `btn btn-outline-primary` | `fa-home` before | `loading` |

Every one of `loadPrevious` / `loadNextDay` / `loadPrev` / `loadMore` ends with
`window.scrollTo({ top: 0, behavior: 'smooth' })`. `loadPrev` is a no-op at `currentPage === 0`.

**Between them:** `Loading more...` when `loading && transcripts.length > 0`; `No transcripts found.`
plus a `btn btn-link` reading `Clear search to see all transcripts` when `searchText` is set;
otherwise `div.transcript-entries` of entries keyed on `_id`.

**One entry:** `div.transcript-entry > span.entry-date{formatDate(ts)}` then a literal `\xa0\xa0`
then `span.entry-speaker{speaker}` then `: {text} `. `formatDate` is
`M/D/YYYY h:mm:ss AM|PM` built with `a % 12 || 12` and `padStart(2,'0')` on minutes and seconds.

**Search** filters on `text` OR `speaker`, both lowercased, client-side over the loaded page only.

**Closing handshake:** when `window.opener` exists, `beforeunload` posts the string
`'transcriptWindowClosing'` to the opener at `window.location.origin`.

**Ours:** `openTranscriptPage()` (`+page.svelte:2581`) sets `bootboxAlert` to `TRANSCRIPT_UNAVAILABLE`.
That stub is honest and its comment (`:2560-2577`) records the real blocker: `currentCaption` is never
assigned, so this repo produces no transcript rows to serve. **The stub is correct; the page, the
route, the API and the storage are all absent.** Nothing in `src` matches `transcriptWindowClosing`.

**Blocks:** "Transcript History" in the Archives menu and "Full Transcript History" on the caption
overlay — both currently reach the stub. **Needs:** speech-reco results persisted server-side first;
building the page before there is anything to read would be the invented-data failure.

## R-5 — `app-closed-session-page` is a second room shell, not a message

**Reference, read whole** (`app-closed-session-page.full.js`, 39,323 B — 71 decls, 21 vars).

This is the biggest single thing this room does not have, and calling it "the closed page" undersells
it. **It is a complete second application shell**: its own fixed-top navbar, its own sidebar, and it
mounts **nine modals** of its own — `app-session-control-modal`, `app-user-info-modal`,
`app-user-settings-modal`, `app-chat-logs-modal`, `app-alert-logs-modal`, `app-mobile-app-info-modal`,
`app-muted-users-modal`, `app-followed-users-modal`, `app-webrtc-troubleshooter` (`:854-863`).

**What it actually shows** is one element:

```
div.m-2.w-100.closed-container [innerHTML]="sessData.closedTxt | noSanitize:'html'"
```

Room-owner-authored HTML, sanitiser bypassed, in a `height: calc(100vh - 68px); width: 100vw;
overflow-y: auto` box. Everything else on the page is chrome around it.

**Navbar** (`nav.navbar.navbar-expand-md.navbar-dark.bg-dark.fixed-top`):

- sidebar toggle — `span.sidebar-menu.active-icon` + `fa-arrow-left`, title `Close Sidebar`, when
  `showSidebar && !alwaysShowRoster`; `span.sidebar-menu` + `fa-bars`, title `Open Sidebar`, when
  `!(showSidebar || alwaysShowRoster)`. **Both can be absent at once** — `alwaysShowRoster` with
  `showSidebar` true renders neither, which is deliberate: the roster is pinned open.
- `span.users` title `Users Connected` → `toggleSideBarUsersCount()`, which does nothing at all
  unless `alwaysShowRoster`. Count text is `rosterCount + simUserCount`, shown when
  `rosterCountVisibleToViewers || isPresenter`.
- `a.navbar-brand[href="#"] > img#cssLogo.brand-logo[alt="App Logo"]` at `max-width:200px;
  height:auto; max-height:40px`, `src` = `globals.logoURL`.
- `Session Control` → `#session-control-modal`, presenter only.
- `Reload` → `doreload()` → `window.location.reload()`, `fa-2x fa-sync`, always.
- `Open Session` → `sendServerAdminCommand('openSession', {})`, `a.btn.btn-warning.nav-link.ml-2`,
  presenter only.

**Sidebar** (`.room-sidebar > .sidebar-wrapper > nav.navbar > ul.navbar-nav.small`):

- `Powered by:&nbsp;` → `a.ptr-website-link[href="https://protradingroom.com"][target=_blank][rel="noopener noreferrer"]` reading ` ProTradingRoom.com `
- `Version: {globals.appVersion}`
- the Mobile App Info `<p>`, hidden when `sessData.hideAppInfo`; inside it the button is further
  gated `(!ptrMobileAppEnabled && !customMobileAppEnabled) || (user.isFT && !freeTrialsGetApp)` → hidden,
  and carries `[ngClass]="{'btn-dark': preferences.theme == 'darkTheme'}"`
- `<hr>`, then `a.ptr-website-link[target=_blank]` labelled ` Try v3 ` whose href is
  `roomV4Link = window.location.href.replace('.com/', '.com/v4/')`, then `<hr>`.
  **The label says v3 and the URL says v4.** Transcribe it; do not correct it.
- `Connectivity/Mic Check` → `#webrtc-troubleshooter-modal` (`fa-network-wired`)
- `General Settings` → `#user-settings-modal` (`fa-cogs`)
- Benzinga, when `sessData.hasBenzingaNews`: `altBenzingaLogoURL` renders
  `img.benzinga-logo-alt`, otherwise `fa-newspaper` + `Benzinga News`
- Archives dropdown, when `archivesAvailableTo()` — `Recording` (`launchRecordings()`, shown when
  `isPresenter || !hideRecs`), `Alert Logs`, `Chat Logs` (shown when `!hideChatLog || isPresenter`).
  **No Transcript History item here**, unlike the live room's Archives menu.
- `Manage Muted Users` → `manageMutedUsers()`; `Manage Followed Users` → `manageFollowedUsers()`
- `Get Random User`, presenter only
- the roster block, when `onlyPresentersVisibleToViewers || rosterVisibleToViewers || isPresenter
  || user.hasAdminChat` — reload button, search toggle, `input#userSearchTermInput[type=search]`
  placeholder `Search by nick or email,enter to search`, and `<app-room-roster [roster] [parent]>`

**Behaviour worth transcribing exactly:**

- `simUserCount` is `Number(sessData.simUserCount)` **clamped to 5000 max and 0 min** (`:263-267`) —
  a fake headcount added to the real one everywhere the count is displayed.
- `alwaysShowRoster` → `showSidebar = true` and `loadRoster()` after a **500 ms** `setTimeout`.
- `toggleSideBar()` loads the roster on open and **unloads it on close**.
- `toggleUserSearch()` focuses `#userSearchTermInput` after a **300 ms** `setTimeout`.
- `searchUsers()` matches `nick.indexOf(term) >= 0` OR `emailHash === hashEmail(term)` — so a full
  email address matches by hash, and a partial one cannot.
- `getRandomUser()` asks `Only select from Trials?` (Yes `btn-success` / No `btn-danger`), filters
  `!isP`, dedupes by `emailHash`, then optionally `isFT`; `randomUser()` needs **≥ 2** candidates,
  shows a giphy gif in a `random-user-modal`, and after **3000 ms** replaces the body with
  `<h2 class="text-center flash animated">{nick}</h2>` and reveals the `User Info` button.
- `calculateDuplicates()` alerts `Unique Users: {n}. Duplicate: {n}` — **defined and never bound to
  any control in this template.** Dead in the reference; do not port it looking for its button.
- `benzingaUrl` is `https://ptrv3.protradingroom.com/public/bz/index.html?sessID=…&id={uuid}&tok={sesionToken}`,
  sanitiser-bypassed, overridden wholesale by `sessData.altBenzingaLinkURL` when non-empty.
  **It puts the session token in a third-party URL** — a security decision to take deliberately.

**Ours:** nothing. `closedTxt`, `closed-container`, `roomV4Link`, `simUserCount`, `alwaysShowRoster`
and `hideAppInfo` have **no occurrence anywhere in `apps/room/src`**. `archivesAvailableTo()` IS
built and pinned (`lib/roster-gates.ts:54`, bundle-pinned in `roster-gates.test.ts:52-57`), so the
gate exists even though the page that also uses it does not. The `sessionClosed` hits in
`lib/media/session.ts` and `lib/media/signalling.ts` are a mediasoup error string and unrelated —
`roster-gates.test.ts:733` already says so in as many words.

**Blocks:** everything a member sees after a session ends. Today they would see the live room.
**Needs:** `sessData.currentState` and `sessData.closedTxt` on the wire — see R-11.

## R-6 — `app-detached-screen`: ours diverges structurally, and the divergence is undeclared

**Reference, read whole** (`app-detached-screen.full.js`, 3,815 B — 2 decls, 2 vars).

**It is a PAGE, not a decoration.** `app-root` reads `dscreen` and switches the whole application to
it: `h && ((globals.isDetached = !0), (this.currPage = 'detachedScreen'))` (`app-root.full.js:237`),
and `currPage === 'detachedScreen'` renders `<app-detached-screen>` **instead of `<app-room>`**
(`:11`, `:27-28`). The popout therefore boots no chat, no roster, no alerts — only a screen.

Template, two independent conditionals:

- `!connected` → `div > br×4 > h3[style="text-align:center"] > i.fas.fa-spinner.fa-pulse` +
  ` Connecting To Screen of {pres.mediaValue.name}-{pres.mediaValue.screenName} `
- `pres` → `div.detach-screen[style="width:100%;height:auto"] > app-screenshare-view[muser]="pres"`

**The handshake, which is the whole component:**

1. `ngOnInit` reads `id` and `presID` from `URLSearchParams` — note **`id`**, where
   `app-screenshare-view` reads `dscreen` + `presID`.
2. `window.opener.addEventListener('unload', handleUnload)` → the popout closes itself when the
   room that opened it goes away. Unguarded: `window.opener` is dereferenced directly.
3. on `globalsLoaded` → `parent.postMessage({cmd:'ready', id, presID}, location.origin)`
4. parent replies; `handleParentMessage` sets `globals.user`, `globals.streamServer` and `pres` from
   the message, then `initWithGlobalsAndEventHandler(...)`
5. on `mediaServerConnected` → sets `document.title` to `{sessionName} - {name} - {screenName}`, then
   `connectToScreenOfProducer(pres)`
6. on `newScreenStream` → `connected = true`, retiring the spinner

**Two defects in the deployed reference, recorded because they change what "matching" means:**

- `((i = 'callScreeen') ? … : 'screeenStopped' == i && …)` (`:74-84`) is an **assignment**, not a
  comparison. It is always truthy, so **the `screeenStopped` branch is unreachable in the shipped
  bundle** and the popout never shows `the screen stream stopped.. this window will now close.`
  Both spellings — `callScreeen`, `screeenStopped` — are the reference's own.
- `pingBack()` is defined and bound to nothing.

**Ours — a real and defensible divergence, but it was never written down:**

`detachScreen()` (`+page.svelte:591`) opens `/?dscreen=1&id=…&presID=…`, matching the reference's
`openPopoutModal` exactly, and `detachedScreenId` (`:566`) derives from `dscreen` + `presID` both
present, matching `app-screenshare-view`'s `isDetachedCtrl`. But the window that opens is **our whole
room** wearing `class={{ 'detach-screen': detachedScreenId !== null }}` (`:8779`), where the
reference's is a bare screen viewer. Ours therefore boots chat, roster, alerts and media in every
popout; the reference's boots a consumer and nothing else.

That is arguably the better shape for a SvelteKit app — one route, one component tree — but it is a
**structural divergence with a per-popout cost** and `CLAUDE.md` requires those to be recorded at the
call site. They are not. **Action: record it, or narrow the popout.**

**One dead emission of ours:** `closeScreenPopout()` (`:633-644`) posts
`{cmd:'screeenStopped', presID}` and then calls `popout.close()` on the next line. **No
`window`-level `message` listener exists anywhere in `apps/room/src`** — the only
`addEventListener('message', …)` in the room is `subscribeToRoomEvents`' SSE handler on an
`EventSource` (`+page.svelte:6979`), which is a different channel entirely and never sees a
`postMessage`. So the post has no consumer here, and the branch that consumed it upstream is the
unreachable one above. The `close()` on the next line is what actually does the work.

*(Corrected during pass 3. This row first read "nothing listens for a `message` event", which a
reader checking it would have found contradicted by `:6979` and reasonably concluded the row was
wrong. The claim is about `window`/`postMessage`, and it now says so.)*

---

## R-11 — the query-parameter contract, read from `app-root` and never before recorded

`app-root.full.js:196-243` reads **fourteen** parameters in one block. Nothing in this repository had
written them down, and four of them are wired at one end only.

| param | reference effect | ours |
|---|---|---|
| `id` | session id, `loadGlobals(r)` | `session/+page.server.ts:154` |
| `tok` | `storePassedToken` / `getPassedToken`, `decodeToken` | **absent** — this app authenticates from the session cookie |
| `sl` | `=1` → `skeepLogin`, `logginIn`, `doSessionLoginWithToken(tok)` | **SET, never READ** — `+page.svelte:2540` |
| `forcedStream` | `globals.forcedStreamServer` | **SET, never READ** — `ModalHost.svelte:2215` |
| `dscreen` | `isDetached`, `currPage='detachedScreen'` | `+page.svelte:566` (different shape — R-6) |
| `r` | `videoOnlyMode`, **and gates the entire init block** | **absent** — recorded honest gap (`+page.svelte:8793`) |
| `vo` | `=1` viewerOnly; `=2` viewerOnly **+ viewerOnlyModeLimited** | `+page.svelte:1450`; `Limited` unmodelled, recorded at `:1439` |
| `co` | `chatOnlyMode` | `+page.svelte:561` |
| `pw` | `globals.loginPW` | **absent** |
| `email` | `globals.loginEmail` | `session/+page.server.ts:175` |
| `name` | `globals.loginNick` | `session/+page.server.ts:174` |
| `dlf` | `=1` → `disableLoginForm` | `session/+page.server.ts:190` |
| `kt` | `=1` → `globals.kt` | **absent** |
| `changePasswordUID` | `globals.changePasswordUID` | **absent** |

**`sl` and `forcedStream` are the finding.** Both are links this app GENERATES and cannot HONOUR:
`detachAlerts()` appends `sl=1` to the popout URL and `ModalHost` builds a `?forcedStream=` invite
link, and no code in `apps/room/src` reads either. Upstream `sl=1` is what makes the detached chat
window log itself in. Ours works anyway — the popout inherits the session cookie, which is exactly
why `tok` was deliberately dropped (`+page.svelte:2523-2526`) — so `sl=1` is **residue of that same
decision that nobody removed.** Either drop it or record it beside the `tok` note.

`r` deserves a second look too: upstream the WHOLE init block is `if (!f)`, so `?r=1` skips token
handling, login and the `beforeunload` unsubscribe entirely — and the `f && '1' === f` line that sets
`videoOnlyMode` sits *inside* `if (!f)` and is therefore **dead in the shipped bundle**. Anyone
implementing `r` from the property name alone would build the opposite of what ships.

## R-12 — `app-root`'s own shell: five pages, ten dialogs, and the `<audio id="webcam">`

`app-root` is rendered by us (`+page.svelte:8769`) but only as a wrapper tag. Read whole, it owns a
page switch and eleven event subscriptions that live nowhere in our source.

**The five-way switch** (`app-root.full.js:17-31`), on `currPage`:
`'chat'` → `<app-room [ngClass]="activeTheme">`, `'closed'` → `app-closed-session-page`, `'kicked'`
→ `<app-kicked-page [msg]="kickedMsg">`, `'detachedScreen'` → `app-detached-screen`, default
(`'login'`) → `<app-session-login [loginReady]>`. All five are suppressed when `isTranscriptRoute`.
**Three of the five pages are the R-3/R-5/R-6 gaps**, so the switch is the thing that makes them
reachable — it is the parent work item, not a seventh row.

**Sibling elements:** `<router-outlet>` before the switch and
`<audio autoplay="autoplay" hidden="true" id="webcam">` after it (`:352`) — a page-level audio sink
outliving every page.

**Subscriptions, with their exact strings** (all bootbox, all absent from `apps/room/src`):

| event | effect |
|---|---|
| `getSessionState` | `currentState=='closed'` → `currPage='closed'`; `=='open' && currPage=='login'` → `'chat'`, emit `appDataReady`, `loadSessionLogs()` |
| `doSessionAuthFail` | once-only latch; `sessData.loginErrorMsg` or `Sorry, your session has expired or is invalid, please log in again`; then `loginErrorURL` redirect; `disconnectAll()` |
| `hardReset` | `The room is being reset by an administrator. Click OK to continue...` → reload |
| `kickPage` | `kickedMsg = payload`, `currPage='kicked'` |
| `closedPage` | `currPage='closed'` |
| `openSession` | `The session is now open, click here to reload the page and enter` → reload |
| `forceReload` | `You need to reload this page to continue` → reload |
| `permsChangeReload` | `An admin has changed your room permissions, you need to reload this page to continue` → `{apiROOT}/sessions/v2/reAuthSessionTok?sessionID=…&tok=…&r=1` |
| `doMsgDelete` | `shiftDelete` skips the confirm; else `Are you sure you want to delete this message by {n}. text: {txt}` |
| `usersDoMsgDelete` | `Are you sure you want to delete your message: {txt}` |
| `doAlertDelete` | `Are you sure you want to delete this alert by {n}. text: {txt}` → `deleteAlertMessage()` |
| `doQAAlertDelete` | same string, `deleteQAAlert({qaMsgID, msgIndex})` |
| `debugLogResp` | shows `#debug-log-modal`, sets `#debugLogModalTxt` to the lines joined by `\n` |

**`deleteAlertMessage()`** is a gate, not a wrapper: when `sessData.deleteAlertPW` is set it prompts
`Please enter the password to delete this alert:` and compares `trim()` against it, alerting
`Wrong password!` on a mismatch. **`deleteAlertPW` has no occurrence in `apps/room/src`** — so in our
room a password-protected alert deletion is not password-protected.

**Three more init behaviours with no counterpart here:**

- `globalsLoaded` → `titleService.setTitle(sessionName)`; `sessData.customFaviconURL` → `changeFavicon()`
  (builds a `link#dynamic-favicon`, cache-busts with `?=${Math.random()}`, removes both the old
  dynamic favicon and any `link[type="image/x-icon"]`); `sessData.customCSS` → `addCustomCSS()`,
  which appends a `<link rel=stylesheet>` when the value **contains the substring `https`** and
  otherwise injects it as inline `<style>` text. Per-room operator-supplied CSS and favicon: absent here.
- the admin-in-iframe check — perms `'a'` and `window.location !== window.parent.location` →
  confirm `You seem to be a presenter and be running inside an iframe, click OK to load the page in
  regular mode so that you can present` → `window.parent.location = window.location + '&kt=1'`.
  This is what `kt` is for, and both halves are absent here.
- `ngAfterViewInit` validates the saved theme against `globals.chatStyle`'s own keys and falls back
  to `lightTheme` with `Invalid theme "X" found, falling back to lightTheme`.

`playChatMessageSoundFor` also lands here (`:73-84`): `app-root` splits the comma list, hashes each
address and pushes it into `globals.playChatMessageSoundFor`. Our `+page.svelte:7469-7473` already
records not implementing it **and gives the reason** — hashing happens server-side upstream, and
shipping raw member emails to every browser to decide a sound is the wrong trade. That one is a
declared decision, not an oversight, and should stay declared.

---

# Step 2 — per-component completeness audit of the 42

A component moves out of `NOT AUDITED` only when its reference `.full.js` has been read whole and
compared against our source. The verdicts mean:

- **MATCH** — every gate, control, string and branch in the reference is present here.
- **MATCH + divergence** — complete, but something differs deliberately; the divergence is named.
- **GAP** — something in the reference is missing here. It gets a numbered row.

| # | component | verdict |
|---|---|---|
| 1 | `app-root` | **GAP** → R-11, R-12 |
| 2 | `app-webcam-holder` | **MATCH** |
| 3 | `app-scplayer` | **MATCH + divergence** → R-13 |
| 4 | `app-debug-log-modal` | **MATCH (shell)** — markup exact; no data source, which is R-12's `debugLogResp` |
| 5 | `app-play-youtube-modal` | **MATCH** |
| 6 | `app-ytplayer` | **GAP, already declared** → R-14 |
| 7 | `app-mobile-app-info-modal` | **MATCH + divergence** — complete, incl. `hideMobileCredentials`, `mobilePin`/`N/A` and the `customMobileAppEnabled` override; the two store hrefs fall back to `TRADINGROOM_APP_URL` instead of the captured v3 listings, declared at `ModalHost.svelte:4664-4673` |
| 8 | `app-muted-users-modal` | **MATCH** — see below |
| 9 | `app-presenter-cams` | **MATCH + divergence** — see below |

**Audited: 9 of 42.** The remaining 33 are listed at the end of this file and are NOT audited.

### 8 — `app-muted-users-modal`, checked line by line

Reference (`app-muted-users-modal.full.js`, 3,992 B) against `ModalHost.svelte:4940-4983`: modal id,
`mutedUsersModalLabel`, the title `Muted Chat Users`, the empty-state string
`You don't have any muted/ignored users.` in `div.text-center`, `ul.list-group.list-group-flush`,
`li.list-group-item.d-flex.justify-content-between.align-items-start`, `div.fw-bold`, the gravatar
fallback `https://secure.gravatar.com/avatar/{emailHash}?d=mm&s=30`, and
`button.btn.btn-outline-danger.btn-sm > i.fas.fa-trash` all match. **The footer button is
`btn-primary`, not the `btn-secondary` every sibling modal uses, and ours transcribes that
correctly** — exactly the kind of detail a tidy-up would have destroyed.

Two notes, neither a gap: we key the `{#each}` on `emailHash` where the reference keys on `_id`
(`r3e = (t, n) => n._id`) — defensible, since `emailHash` is the identity `removeUserFromList` acts
on, but it is a divergence; and the `<img>` carries no `width`/`height` attributes, satisfied instead
by the captured `.fw-bold img{width:30px;height:30px}` rule, so there is no layout shift.

### 9 — `app-presenter-cams`, and why two cards became a loop

Reference (`app-presenter-cams.full.js`, 4,673 B). Markup matches ours at
`PresentationArea.svelte:394-417` element for element: `div.card.webcamsHolder#webcamsHolder-{pID}`,
`video.webcamsHolderVideo#webcamVideo-{pID}[autoplay][srcObject]`, `div.overlay >
h5.pNameLabel.m-0` with the close `span.closeIcon > i.fas.fa-times` **nested inside the `h5`**.

`initDrag()` — jQuery-UI `.draggable({appendTo, containment:'window', cursor:'move', scroll:!1,
snap:!0}).resizable({handles:'n, e, s, w, ne, se, sw, nw'})` persisted to
`localStorage['webcam-{sessionID}-{name with spaces → _}']` — **is ported**, in `lib/panel-drag.ts`
with `saveWebcamPosition`'s read-then-spread semantics and its own `panel-drag.test.ts:125`.

**The divergence is deliberate and already recorded** at `PresentationArea.svelte:359-392`: the
reference's `app-webcam-holder` emits two static `<app-presenter-cams>` with **no inputs bound**, so
`ngOnInit`'s `this.muser && (…)` short-circuits, `initDrag()` never runs, and `.show()` — its only
caller — never fires. They are inert. The live cards are created imperatively by
`addPresenterdWebcam`, one per user with a camera. Ours renders `{#each webcamPresenters}`, which is
what the reference actually does at runtime rather than what its template literally says.

**Three dead methods in the reference, recorded so nobody hunts for their controls:**
`showWebcams()` and `hideWebcams()` select `#webcamsHolder`, an id that never exists because every
real card is `webcamsHolder-{pID}`; `reposition()` is the bare expression `tu('#webcamsHolder');`
which does nothing at all; and `adjustPos()` logs `adjust pos called... TODO..`.

**Not verified in this pass:** whether our close path performs the reference's
`hupScreenOfProducer(muser)` teardown for a non-self camera. Stated as unchecked rather than assumed.

## Host order — checked, and it is exact

`DIRECT_EVIDENCE_CONTRACT.rootHostOrder` (`lib/direct-evidence-contract.ts:15-42`) records 26 host
elements in the reference's template order. `ModalHost.svelte` renders 25 of them at
`:1876`…`:5819` **in that exact sequence**, including the reference's own duplicate
`app-followed-users-modal` (ours at `:4984` and `:5096`); the 26th, `app-privchat`, lives in
`PrivateChatPanel.svelte`. Nothing is missing and nothing is out of order.

*Method note, recorded because it nearly produced a false finding:* a `grep` for `Debug Log` came
back empty and would have supported "the debug modal is not built". It is built, at
`ModalHost.svelte:3841`, with the exact `textarea#debugLogModalTxt rows="1000" readonly`. The grep
was truncated by its own `head -30`. **Absence reported from a search is not absence.**

## R-13 — `app-scplayer`: we silently fixed a reference bug

**Reference, read whole** (`app-scplayer.full.js`, 1,532 B). One input, `scUrl`; renders only when
`url` is set:

```
div#soundCloudDiv[style="visibility:hidden;position:absolute;bottom:calc(-100vh + 100px);right:10px"]
  > iframe#soundCloudIFrame[width=100%][height=150][scrolling=no][frameborder=no][allow="autoplay; encrypted-media"]
```

`src` is built at `:13-15` as, character for character:

```js
`https://w.soundcloud.com/player/?url=${this.scUrl}&amp;auto_play=true`
```

**That is an HTML entity inside a JavaScript template literal.** No HTML parser ever sees it, so the
URL the reference actually requests carries a parameter named `amp;auto_play` — and
`auto_play=true` therefore **never takes effect upstream**. The player is also
`visibility:hidden` and parked a full viewport below the fold, so it is audio-only by design.

**Ours** (`PresentationArea.svelte:1151-1168`) matches every attribute, id and style, adds a `title`
for accessibility, and emits `&auto_play=true` — the entity corrected. So our player autoplays where
the reference's does not.

**This is almost certainly the intended behaviour** — a hidden audio player nobody can press play on
is useless otherwise — but it is a **deliberate behavioural divergence from the capture that was
never declared**, and `~/CLAUDE.md` says to transcribe rather than correct. **Action:** keep the fix
and write the reason at the call site, or restore the entity. Do not leave it silent.

## R-14 — `app-ytplayer`: the late-join seek, blocked and already declared

**Reference, read whole** (`app-ytplayer.full.js`, 3,730 B). Inputs `startTime` and `ytURL`; the
`ytURL` setter calls `playYTURL(url, this.startTime)`, which appends the offset:

```js
`https://www.youtube.com/embed/${id}?autoplay=1${mute}&` + (i ? `start=${i}` : '')
```

**Where `startTime` comes from** — `app-presentationarea.full.js:2581-2600`, read directly:

```js
subscribe('playYTForAll', e => {
  let i = 0;
  if (e.startTime) { let o = Number(e.startTime), s = Date.now();
                     i = Math.round((s - o) / 1e3); this.startTime = i }
  else this.startTime = 0;
  this.ytURL = e.url
})
…
globals.roomState.ytURL && emit('playYTForAll',
  { url: roomState.ytURL, startTime: roomState.ytStartTime })
```

`ytStartTime` is the **epoch millisecond the video started**, held in room state, and the joiner
converts it to elapsed seconds. The LIVE command never carries it — this fires only on join.

**Ours:** `YoutubePlayerOverlay.svelte` has no `startTime` prop, and `videoUrl` (`:24`) ends

```js
`https://www.youtube.com/embed/${videoId}?autoplay=1${mute}&`
```

— a **trailing `&` with nothing after it**, which is precisely the reference's expression with the
`+ (i ? 'start='+i : '')` dropped.

**This gap was already declared, and pass 3 corrected this row to say so.** `+page.svelte:7183-7201`
carries the whole derivation with its byte offsets, states that the replay "needs a persisted room
video state, which this room does not have, so the offset here is always the live command's 0 and no
`start=` is appended", records it in `TODO.md`, and warns explicitly against inventing a `startTime`
onto the wire to make the branch look implemented. `for-all-broadcast-contract.test.ts:179-189` pins
the same derivation from the other side.

**So the correct reading is: known, reasoned, deliberately unbuilt — not an oversight.** The first
draft of this row called it "understood and documented and then not built", which invited exactly the
invented-`startTime` fix the source comment forbids.

**Consequence, unchanged and still real:** a member who joins ten minutes into a broadcast video
starts it at 0:00 while everyone else is at 10:00. **Needs, in order:** persisted room video state
carrying the start instant, *then* the prop. Not the prop first.

**Its twin is NOT a gap, and this is why the pair is recorded together.** The same file passes
`startTime: roomState.mp3StartTime` on late join (`:2638-2643`) — but the `playMP3ForAll` subscriber
(`:2601-2603`) is `((this.mp3Url = e.url), console.log(…), (this.mp3Playing = !0))` and **never reads
`e.startTime`**. The MP3 seek is dead in the reference. Ours not implementing it is a faithful match.
**Do not "fix" the MP3 case by symmetry with the YouTube one.**

---

## Not yet audited — the remaining 33

`app-alerts`, `app-alerts-advanced-search`, `app-alert-filter-modal`, `app-alert-logs-modal`,
`app-alert-qa-modal`, `app-alert-send-report-modal`, `app-all-user-pmmodal`, `app-av-settings-modal`,
`app-chat`, `app-chat-logs-modal`, `app-extra-chat`, `app-extra-roomscroller`,
`app-followed-users-modal`, `app-note`, `app-poll-modal`, `app-post-alert-modal`,
`app-presentationarea`, `app-privchat`, `app-privchatscroller`, `app-rec-preview`,
`app-reply-modal`, `app-rich-text-editor`, `app-room`, `app-room-roster`, `app-roomscroller`,
`app-scheduled-alerts-modal`, `app-screenshare-preview`, `app-session-control-modal`,
`app-st-compactmessage`, `app-st-message`, `app-user-info-modal`, `app-user-settings-modal`,
`app-webrtc-troubleshooter`.

`app-room` (139 KB) and `app-presentationarea` (177 KB) are the two largest and correspond to our
`+page.svelte` and `PresentationArea.svelte`. Both are partially covered by existing contract tests —
which is not the same as audited, as R-14 just demonstrated: the mechanism was pinned in a test and
never built.

---

## The three passes, and what each one changed

The owner asked for the audit to be run, then re-run twice and compared against itself. Recorded
here because **the re-runs are the only reason two of the rows below are correct.**

**Pass 1 — build the picture.** Read all six absent components whole (R-1…R-6), read `app-root`
whole, and audited nine of the 42 rendered ones. Produced 454 lines.

**Pass 2 — re-derive the inventory independently.** Walked `docs/source/components/*.full.js` and
`src/**/*.{svelte,ts}` from scratch rather than trusting pass 1's numbers. Reproduced **51
components, 42 rendering the reference element, 9 absent** — and the 9 came back as exactly R-1…R-9,
no more and no less. Diffed the file against its pass-1 snapshot: **454 → 632 lines with zero
deletions**, so nothing recorded in pass 1 was lost or overwritten.

**Pass 3 — attack the new claims.** Re-checked every *absence* assertion against the source, because
absence is the kind of claim that is cheapest to make and most expensive to get wrong. **It found two
of my own errors:**

1. **R-14 was mischaracterised.** I wrote that the YouTube late-join seek "was understood and
   documented and then not built", implying an oversight. `+page.svelte:7196-7198` contains
   `ytStartTime` and `start=` in a comment that already declares the gap, explains that it needs
   persisted room video state, points at `TODO.md`, and **warns against inventing a `startTime` to
   make the branch look implemented** — the exact fix my wording would have invited. Row corrected.
2. **R-6 overstated an absence.** I wrote that nothing in `apps/room/src` listens for a `message`
   event; `+page.svelte:6979` is `source.addEventListener('message', …)`. It is an `EventSource`,
   not `window`, so the underlying point stands — but a reader checking the claim would have found
   it contradicted and binned the row. Restated precisely.

**Both errors were mine, both were in the new material, and neither would have survived being acted
on.** That is the argument for the re-run, and it is also why every remaining unaudited component is
listed by name below rather than summarised as a count.

---

## Status

| | count |
|---|---|
| reference components | 51 |
| render the reference element | 42 |
| built without the wrapper (R-7, R-8, R-9) | 3 |
| **absent entirely — all now read whole (R-1…R-6)** | **6** |
| cross-cutting rows found by reading `app-root` (R-11, R-12) | 2 |
| **audited for completeness — 9 of 42 (R-10)** | 6 MATCH · 1 MATCH-shell · 2 GAP (R-13, R-14) |
| still unaudited for completeness | **33** |

**Pass 1 closed the cheap question.** All six absent components have now been read whole and every
one has a row with citations. That was always the smaller half.

**What this file does NOT yet claim.** No statement is made about whether a rendered component
reproduces every gate and control of its reference except where a row below says so. Anyone reading
this as "six things are missing" has read it wrong — six components are missing *entirely*, and
`app-root` alone turned up thirteen absent subscriptions, six unread query parameters and an unbuilt
password gate **inside components we already call built**.
