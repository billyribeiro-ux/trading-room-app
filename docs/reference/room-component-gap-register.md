# Room component gap register — the v4 bundle against `apps/room`

**Opened 2026-08-16.** The room had no equivalent of
[`evidence-gap-register.md`](./evidence-gap-register.md), which tracks the CONTROLLER against
`apps/controller/evidence-dumps/`. That register covers `page.manageSession.html`,
`page.welcome.html` and their siblings — 70 rows, 31 closed. **It says nothing about the room**, and
room gaps have been tracked ad hoc in `TODO.md` rows instead. This file is the room's tracker.

**Same rules as the controller register.** A row is only `CLOSED` when a specific citation is written
next to it. `OPEN` means nobody has done it. `WON'T FIX` means a decision was taken and the reason is
recorded. **Never mark a row closed on reasoning alone.**

**This file has two parts, and they must not be read as one list.**

- **Part A — reference gaps (`R-*`).** Claims about the v4 bundle, every one backed by a byte offset
  in `apps/room/docs/source/`. Nothing here is opinion.
- **Part B — owner-stated product requirements (`P-*`).** Added 2026-08-16 at the owner's
  instruction. These are **not** capture-derived and no amount of reading the bundle will confirm
  them; three of the five are new product the reference never had. What each row *does* cite is the
  second half — what exists in this repository today — and anything not established is written as a
  question rather than filled in.

**Part B is where the money is.** P-1 alone is a cancelled member still receiving the product.

## The corpus

`apps/room/docs/source/` — an Angular 17 room build: `main.d6d3c112b59b7d0d.js` (2,887,876 bytes),
`styles.d622cb9ed2bbc221.css`, and **194 decoded files covering 51 components** in
`docs/source/components/` (`.full.js`, `.compiled.js`, `.render-helpers.js`, `.component.css` each).

### ⛔ CORPUS CAVEAT — Part A audited the OLDER build. Found 2026-08-16, mine.

**`apps/room/docs/source/` is not the current bundle.** There are two more captures I had not opened:

| capture | bundle | size |
|---|---|---|
| `apps/room/docs/source/` | `main.d6d3c112b59b7d0d.js` | 2,887,876 B — **the older build** |
| `apps/room/docs/source-v4-2026-08-15/` | `main.d1d09071be31f1ba.js` | 2,891,205 B — **the current v4** |
| `apps/room/docs/source-v3-2026-08-15/` | `main.99a5781d1d7a7775.js` | v3, not read at all |

`docs/decoded/mobile-app-decoded.md` establishes the difference by counting across both, and it is
not cosmetic — see **R-15**, a whole surface that exists only in the current build.

**Owner instruction, 2026-08-16: "we have to be all v4."** So v4 is the corpus. What that costs was
**measured before acting**, and the answer is: very little.

**The component sets are IDENTICAL.** Both bundles hold **68** single-selector component
definitions and the sets differ by nothing — **51 first-party `app-*`** (exactly the decoded set, so
the decode is complete) and **17 third-party** correctly excluded: `as-split`, `pan-zoom`,
`re-captcha`, `router-outlet`, `ng-component`, `option`, five `ngb-*` and six
`emoji-mart`/`ngx-emoji`. **Nothing was added or removed between the builds**, so the inventory
above — 51 / 42 rendered / 9 absent — **holds unchanged for v4.**

Every component body was then extracted from both bundles and compared:

| result | count | meaning |
|---|---|---|
| byte-identical | 10 | unchanged |
| differ, **same length** | 39 | **minifier identifier renames only** |
| differ, **different length** | **2** | **real content change** |

The 39 are proven renames rather than assumed: `app-root` is 454 bytes in both and the only
difference is `H(1,DRe,5,1)` → `H(1,IRe,5,1)`, one minified symbol. Each build assigns short names in
its own order.

**Only two components genuinely changed:**

| component | old → v4 | what |
|---|---|---|
| `app-webrtc-troubleshooter` | 12,346 → 12,897 (**+551**) | the Mobile App tab — **R-15** |
| `app-presentationarea` | 37,843 → 38,142 (**+299**) | **not yet read** |

**So Part A's findings survive the corpus change**, and the honest residue is narrow: promote the
nine `MATCH` verdicts once re-decoded, and genuinely re-read those two. Recorded rather than quietly
corrected, because I audited nine components against the older baseline and reported them as done
without noticing there was a newer one.

**⚠ Instrument note, because the first answer was wrong.** The comparison initially returned "51
unresolved" — it searched for `dt({`, the helper name in the *decoded* files, while the raw v4 bundle
uses `ut({`; the minified helper name itself differs per build. Rewritten to match `cmp=<ident>({`
and bracket-match, then validated against a known answer (`app-webrtc-troubleshooter` had to come
back changed, and did). **The first result was the tool failing, not a finding.**

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
| R-1 | `app-typing-indicator-dots` | **CLOSED 2026-09-01** | `TypingIndicatorDots.svelte`. The `styles:[…]` array transcribed verbatim — 3px circles, `#9e9ea1`, resting `.4`, a 1.5s blink staggered a third of a cycle apart — plus one line that is OURS, a `prefers-reduced-motion` block, the first in this application. Detail below is the reference read that produced it. |
| R-2 | `app-positions-container` | **CLOSED** | `PositionsContainer.svelte`, named in `reference-component-inventory-contract.test.ts`'s `BUILT_AS` — built WITHOUT the custom-element host, which is measured rather than assumed: it has zero rules in `captured-runtime-components.css`, so a host would be an element with no consumer. |
| R-3 | `app-kicked-page` | **CLOSED** | `KickedPage.svelte`, in `BUILT_AS` for the same measured reason as R-2. Its three captured consts are also what `routes/+error.svelte` was built from. |
| R-4 | `app-session-transcript` | **CLOSED 2026-09-02** | `routes/session-transcript/+page.svelte`, transcribed whole from byte 2,607,394, over a new `session_transcripts` table and two remote functions. ONE DIVERGENCE and it is a refusal: upstream's URL carries `globals.sesionToken`, so ours carries no query string and the server re-derives the room, the caller and the room's NAME from the session cookie. |
| R-5 | `app-closed-session-page` | **CLOSED 2026-09-01** | `routes/+error.svelte`. Its blocker — *"the reference stores its text server-side and that store is not in the capture"* — was closed by TWO pieces of work the row outlived: `room_state.closed_message` with `saveCloseMessage`, and the error page that renders it through `error(403, closedRoomMessage(shortCode))`. The reference's own `closed-container` (byte 2,573,542) is deliberately not reproduced: it matches no rule in the captured sheet and its `innerHTML` is a stored-XSS surface for a string a presenter types. |
| R-6 | `app-detached-screen` | **CLOSED — divergent by design** | `ScreenPane.svelte`, in `BUILT_AS`. The divergence is the one the row already described and is recorded at the code. |
| R-7 | `app-session-login` | **CLOSED — built as a route** | `src/routes/session/+page.svelte` + `+page.server.ts`, with the reference's 120-entry const table and `app-session-login.component.css` transcribed, and the "nothing auto-submits it" behaviour recorded from `app-session-login.full.js:408,451,908,948`. |
| R-8 | `app-streaming-view` | **CLOSED — built without the wrapper** | `StreamingView.svelte`, hls/m3u8. Rendered inside a `div.h-inherit` host because Angular has a host element and Svelte does not — recorded at the call site in `PresentationArea.svelte`. |
| R-9 | `app-screenshare-view` | **CLOSED — built without the wrapper** | `ScreenPane.svelte`. Its captured `controls`-attribute omission is a recorded deliberate decision (`TODO.md`, "Not gaps"). |
| R-10 | the other 42 | **IN PROGRESS** | The reference element is rendered. Completeness of gates, controls and branches is being audited component by component; each closed one gets its own row below. |
| R-11 | the query-parameter contract | **DECIDED 2026-09-02 — both "wired at one end only" halves answered, and they are NOT the same case** | `sl=1` is KEPT and recorded at `alerts-pane.ts`: the popout URL is a transcription, a member never sees it, it claims nothing, and it is inert only because dropping `tok` made it so — the two go together. `?forcedStream=` is the other half and is a REFUSAL recorded at `ModalHost.svelte`: honouring it would take a media host from a query parameter, so a link sent to a member could point their camera and microphone at somebody else's SFU. Its `{#if}` never opens today (`targetUser.streamServer` has no producer), which makes it a TRAP for whoever lands the media host rather than a defect now — written where they will look. The six absent parameters stay absent; each is an upstream feature this app does not have, and `r` is dead in the shipped bundle. |
| R-12 | `app-root`'s page switch and subscriptions | **OPEN — fully captured** | See below. We render the tag; the shell behind it is absent. |
| R-13 | `app-scplayer`'s undeclared bug-fix | **CLOSED 2026-09-02 — declared, not reverted** | The row asked for one of two things: *"keep the fix and write the reason at the call site, or restore the entity."* The fix is kept and the reason is at the markup in `PresentationArea.svelte` — the upstream behaviour is UNREACHABLE rather than merely different, since the element is `visibility:hidden` below the fold with no control to press, so a faithful transcription is a component that can never make a sound. `soundcloud-autoplay-contract.test.ts` asserts BOTH halves, because the fix without the reason is the state this row objected to. |
| R-14 | `app-ytplayer`'s late-join seek | **CLOSED** | Built in `YoutubePlayerOverlay.svelte`: `start=${i}` on the VIDEO-ID form only, and `i ? … : ''` rather than `start=0` — both the capture's own, at byte 1,503,354, and both easy to normalise away. Its blocker (*"persisted room video state"*) is gone too: `room_state.video_url` / `video_play_time` exist and the page applies `videoUrl && !videoPlayTime`. |
| R-15 | the v4 **Mobile App tab** in `app-webrtc-troubleshooter` | **CLOSED** | `MobileRestorePane.svelte`, composed by `ConnectivityModal.svelte` — the troubleshooter left `ModalHost` on 2026-09-01 and took its five contracts with it. `restoreMobileAppTokens` is BUILT per `missing-commands-triage.md`. |

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

**Subscriptions, with their exact strings** (all bootbox). The parenthetical here read *"all absent
from `apps/room/src`"* until **2026-09-03**, when the row was re-measured file by file rather than
inherited: **eleven of the thirteen are built.** The `Ours` column below is that measurement, and the
two that were genuinely open are settled underneath it.

| event | effect | ours, measured 2026-09-03 |
|---|---|---|
| `getSessionState` | `currentState=='closed'` → `currPage='closed'`; `=='open' && currPage=='login'` → `'chat'`, emit `appDataReady`, `loadSessionLogs()` | **not a divergence** — see below |
| `doSessionAuthFail` | once-only latch; `sessData.loginErrorMsg` or `Sorry, your session has expired or is invalid, please log in again`; then `loginErrorURL` redirect; `disconnectAll()` | **built** — see below |
| `hardReset` | `The room is being reset by an administrator. Click OK to continue...` → reload | `events.svelte.ts` |
| `kickPage` | `kickedMsg = payload`, `currPage='kicked'` | `private-commands.ts`, `KickedPage.svelte` |
| `closedPage` | `currPage='closed'` | `events.svelte.ts`, built 2026-09-03 with the door itself |
| `openSession` | `The session is now open, click here to reload the page and enter` → reload | `events.svelte.ts` |
| `forceReload` | `You need to reload this page to continue` → reload | `private-commands.ts`, `addressed-channel.ts` |
| `permsChangeReload` | `An admin has changed your room permissions, you need to reload this page to continue` → `{apiROOT}/sessions/v2/reAuthSessionTok?sessionID=…&tok=…&r=1` | `dialogs.svelte.ts`, `user-actions.svelte.ts`; the `reAuthSessionTok` redirect stays REFUSED — that route is confirmed absent from the bundle |
| `doMsgDelete` | `shiftDelete` skips the confirm; else `Are you sure you want to delete this message by {n}. text: {txt}` | `message-delete.ts:172` |
| `usersDoMsgDelete` | `Are you sure you want to delete your message: {txt}` | `message-delete.ts:173` — the same function's other branch, which is why the NAME is absent and the behaviour is not |
| `doAlertDelete` | `Are you sure you want to delete this alert by {n}. text: {txt}` → `deleteAlertMessage()` | `message-delete.ts:119`; `deleteAlertPW` reaches ELEVEN files, so the claim below that it has no occurrence is stale too |
| `doQAAlertDelete` | same string, `deleteQAAlert({qaMsgID, msgIndex})` | `message-delete.ts` |
| `debugLogResp` | shows `#debug-log-modal`, sets `#debugLogModalTxt` to the lines joined by `\n` | `debug-log.svelte.ts`, `debug-log.remote.ts` |

**`getSessionState` — NOT A DIVERGENCE, and the whole family reads as one.** It is an internal
event-bus name, not a server frame: emitted when a `getMyState`/`getRoomState` frame assigns
`globals.roomState` (byte 1,013,755) and again after `getMyRepeater` (1,021,461). Two subscribers,
both read whole. `handleSessionState()` (1,162,077) branches on `roomState.status == 'closed'` →
`disconnectAll()` + `closeRoom`, else emits `chatMode` and initialises the media handlers.
`app-root`'s (2,595,730) is the SPA page switch. Every reference-facing output has a counterpart
here arrived at differently: the closed branch is `closedPage` → the server door, `chatMode` is
`changeChatMode`, the media init is `media-transport`, and `currPage 'login' → 'chat'` has no
counterpart because this room's entry is a server route rather than a page inside the shell.

**`doSessionAuthFail` — BUILT, as `sessionRevoked`.** Its four emitters are all socket-authenticate
failures (993,162 / 993,292 / 993,379, and a disconnect with code 4500 at 997,931); this room
authenticates the SSE request by cookie, and `sess/[room]/events/+server.ts` sends
`{cmd:'sessionRevoked', reason, message}` and tears the stream down **in the same tick**. That is
also why the once-only latch is not transcribed: upstream latches the alert because its socket can
fail repeatedly, and here the connection ends with the frame. `loginErrorMsg` and `loginErrorURL`
are both `wired: true` and honoured — at the door (`room-entry.ts:212-213`), at SSO, and on the
reload the revoked member is sent through, which means the redirect is decided by the server from
settings it owns rather than shipped to every browser.

**`deleteAlertMessage()`** is a gate, not a wrapper: when `sessData.deleteAlertPW` is set it prompts
`Please enter the password to delete this alert:` and compares `trim()` against it, alerting
`Wrong password!` on a mismatch. The sentence that stood here — *"`deleteAlertPW` has no occurrence
in `apps/room/src`, so in our room a password-protected alert deletion is not password-protected"* —
was **true when written and is false now**, re-measured 2026-09-03: the name reaches eleven files,
and the gate is `internal/room-alert-delete-auth/[code]` on the controller with
`alert-delete-auth.remote.ts` and `server/alert-delete-access.ts` here. The credential STAYS on the
controller and the question travels, which is the same shape as `room-notes-auth` beside it.

**Three more init behaviours with no counterpart here:**

- `globalsLoaded` → `titleService.setTitle(sessionName)`; `sessData.customFaviconURL` → `changeFavicon()`
  (builds a `link#dynamic-favicon`, cache-busts with `?=${Math.random()}`, removes both the old
  dynamic favicon and any `link[type="image/x-icon"]`); `sessData.customCSS` → `addCustomCSS()`,
  which appends a `<link rel=stylesheet>` when the value **contains the substring `https`** and
  otherwise injects it as inline `<style>` text. Per-room operator-supplied CSS and favicon: absent here.
- the admin-in-iframe check — perms `'a'` and `window.location !== window.parent.location` →
  confirm `You seem to be a presenter and be running inside an iframe, click OK to load the page in
  regular mode so that you can present` → `window.parent.location = window.location + '&kt=1'`.
  **BUILT 2026-09-03** as `lib/room/iframe-breakout.ts`, called once from the page's `onMount`. It
  was the one row in the whole of R-12 that survived the re-measurement as genuinely absent.

  Three divergences, each argued at the module: the authority is the SERVER's `isPresenter` and not
  a token this browser decoded (upstream's `decodeToken(a).perms` is client-asserted authority, which
  is the 2026-08-07 escalation by name); `kt=1` is appended with `URL.searchParams` because this room
  strips the token from the address bar on entry, so upstream's concatenation would glue a parameter
  to a query-less path; and the swallowing `catch` around the parent read IS transcribed, cross-origin
  silence included, because reproducing an upstream defect is not a reason to diverge.

  **`kt` has exactly one occurrence in the 2,891,205-byte bundle and it is that write — nothing reads
  it**, which is what the sentence above ("this is what `kt` is for") could not have known. That
  measurement is pinned in `iframe-breakout-capture.test.ts` so a later reader cannot conclude the
  value was dropped from something upstream depended on.

  One thing the module measures and deliberately does NOT decide: `apps/room` sets no
  `X-Frame-Options` and no `frame-ancestors` anywhere, so this room can be framed today. That is what
  makes the control reachable rather than dead code — and whether the room SHOULD be frameable is an
  owner's product question, because closing it would break every operator embedding the room.
- `ngAfterViewInit` validates the saved theme against `globals.chatStyle`'s own keys and falls back
  to `lightTheme` with `Invalid theme "X" found, falling back to lightTheme`. **NOT A DIVERGENCE**,
  re-measured 2026-09-03: upstream's theme is a free-form preference key checked against
  `chatStyle`'s keys at READ time, so a bad stored value is reachable there. Here it is a
  `user_settings.theme` column with two values, written only by `saveTheme` (a `z.enum` that refuses
  everything else) and by `ensureSettings` (`'light'`), and read from the ROW rather than from the
  preferences blob — so `savePreference('theme', …)` cannot reach it either. The fallback would be a
  branch nothing can enter.

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

---

# Part B — owner-stated product requirements

**These are NOT capture-derived and must never be confused with the rows above.** Everything in
Part A is a claim about the v4 bundle, backed by a byte offset. Everything here is a requirement the
owner stated on **2026-08-16**, recorded in their own terms. The evidence discipline still applies to
the *second* half of each row — what exists in this repo today is cited, and what has not been
established is marked as a question rather than filled in.

Two of these (P-4, P-5) the owner explicitly flagged for further discussion. Their rows carry the
questions that must be answered before any design, not a design.

| id | requirement | state |
|---|---|---|
| P-1 | Mobile push notifications must stop on cancellation / non-renewal / revocation | **OPEN — the sender is not in this repo; see below** |
| P-2 | One computer + one mobile device per account | **OPEN — no device identity exists** |
| P-3 | Finish the super-admin dashboard (enterprise controls business accounts) | **PARTIAL — more built than expected; scope needs defining** |
| P-4 | Drawing / annotation tool | **OPEN — nothing exists; needs discussion** |
| P-5 | Spotify integration | **OPEN — needs discussion; one hard question first** |

## P-1 — Alert push notifications keep reaching cancelled members

**The owner's words:** *"The app when the subscription doesn't renew, the members continue to receive
alerts on their app which they're not supposed to. Either upon membership cancelation or failure to
renew it has to stop immediately."* Clarified: this is the **mobile app receiving alert push
notifications**, after cancellation, non-renewal, **or revocation**.

**Severity: this is revenue integrity, and it is the highest-value row in this file.** A cancelled
member still receiving trade alerts is still receiving the product. Unlike everything in Part A, it
costs money every day it is open.

### What exists here, read and cited

| piece | where |
|---|---|
| per-member push tokens | `roomUsers.pushTokensJson` (+ `notificationsState`) |
| device pairing door | `api/mobile/pair/+server.ts` — PIN-credentialed, single use, 5 failures destroy it |
| FCM v1 sender | `lib/server/fcm.ts:304` `sendPush()`, HTTP v1 + OAuth, `messages:send` |
| registration validate/prune | `lib/server/rooms.ts:772` `listFcmRegistrations()` — `validate_only`, prunes only `unregistered` |
| operator test push | `lib/server/rooms.ts:845` `sendTestPushToMember()` |
| entitlement rule | `lib/server/sso-entitlement.ts:91` `evaluateEntitlement(filters, asserted)` |
| account lifecycle seam | `accounts.status` — `'active'` / `'suspended'`, with `suspendedAt/By/Reason` |

### FOUND — the reference's own mechanism, and it explains the behaviour exactly

**This is captured, not inferred.** `room-settings-schema.ts:289-290` holds both settings with the
reference's own labels and help text, verbatim:

| setting | label | help text, **verbatim** | captured default | wired here |
|---|---|---|---|---|
| `mobileAppExpireNotificationsDays` | **Push expire days** | *"If user does not log in this many days, we'll stop sending push notifications"* | **14** | **`wired: false`** |
| `ptrMobileAppExpirePairCodeDays` | **PTR app exp days** | *"If user does not log in from regular site, mobile app token will expire after this many days"* | **7** | **`wired: false`** |

**Read that help text again, because it is the whole answer.** The reference's automatic stop is
keyed on **`lastLogin`** — *"if user does not log in this many days"* — and **not on subscription
state at all.** The reference's own `/sessions/users` response
(`lib/content/api-docs.ts:197-215`) carries `lastLogin`, `active`, `alerterAppFCMUserOff` and
`alerterAppTokens` side by side, so the data to do better was right there and the setting does not
use it.

**So the original's design is: cancel → the member can no longer log in to the web room → 14 days
later push stops.** That is a **fourteen-day paid-content leak by construction**, and it is exactly
what the owner is seeing. **This is not a defect we introduced in the rebuild — it is how the
reference behaves**, and "it has to stop immediately" is a requirement the original never met.

### The four controls the reference has, and what we built of each

| reference control | what it does | ours |
|---|---|---|
| `pauseUserNotifs(id, …, 'pause'\|'resume'\|'unsub')` | per-member, three verbs | **BUILT** — `rooms.ts:958` writes `notificationsState`; UI at `account/rooms/[id]/[[tab]]/+page.svelte:1989` |
| `notifications_state` | `active` / paused / unsubscribed | **BUILT** — `schema.ts:442`, default `'active'` |
| `resetFCMForuser` | drop every registration and start clean | **BUILT** — `rooms.ts:965-970`, sets `pushTokensJson: '[]'` + state back to `active` |
| `sendTestFCM` | a real push to that member's devices | **BUILT** — `sendTestPushToMember` |
| `alerterAppFCMUserOff` | per-user push-off boolean in the API | our equivalent is `notificationsState` |
| **`mobileAppExpireNotificationsDays`** | the automatic stop | **NOT WIRED** |
| **`ptrMobileAppExpirePairCodeDays`** | token expiry | **partly** — used for *pair-code* expiry (`mobile-pin/[code]/+server.ts:80`), not for token expiry |

**So every MANUAL control is built and only the AUTOMATIC one is missing** — and the automatic one
is the one that would have to fire without an operator noticing a cancellation.

### The second finding: nothing in this repo sends alert pushes at all

**`sendPush` has exactly two callers here, and neither is the alert broadcast.**
`listFcmRegistrations` (`rooms.ts:772`) is a `validate_only` dry run; `sendTestPushToMember`
(`:845`) is an operator's manual test. There is **no alert → push fan-out** in this codebase, and
`FCM_SERVICE_ACCOUNT_JSON` is unset (`MOBILE-APP.md:188`), so nothing here can send at all.

**Therefore the notifications the owner's members are receiving today are being sent by the
reference/production system, not by this rebuild.** That splits the work cleanly, and the two halves
have different urgencies:

- **The live leak is operational and fixable today, on the production system**, by whichever of
  `pauseUserNotifs('unsub')` / `resetFCMForuser` that system exposes — and by setting **Push expire
  days** to something far below 14 as an interim floor. It does not need this repo.
- **The rebuild's job is not to reproduce the 14-day decay.** It is to gate the fan-out that does
  not exist yet.

### What this repo must do when the fan-out is built

Recorded now, before the code exists, because that is the cheap moment:

1. **Check `notificationsState` at SEND time**, not only at pause time. The column is written by four
   places and **read by none on any send path** — because there is no send path. When one is added
   this is the first gate, or the whole pause/unsub feature is decorative.
2. **Gate on entitlement at send time, not entry time.** `evaluateEntitlement`
   (`sso-entitlement.ts:91`) takes **asserted** SSO claims and is a **door check evaluated once**; a
   phone paired while the subscription was live never passes that door again.
3. **Drive it off the billing event, not off `lastLogin`.** `accounts.status` is the designed seam —
   its own comment anticipates *"past-due, closed"* once billing exists — and there is **no billing
   machinery anywhere in `apps/` or `services/`** today.
4. **Keep the login-decay as a BACKSTOP, wired at last.** `mobileAppExpireNotificationsDays` is worth
   having as defence in depth for a device that goes dark; it is the wrong primary mechanism, and
   the reference proves it by failing exactly this way.
5. **Do not delete tokens to achieve it.** `MOBILE-APP.md:463` records the rule and its reason: only
   a registration FCM itself disowns is deleted, because dropping on transient failure silently
   unsubscribes working devices. **Suspension belongs in `notificationsState`, not in the token
   store** — which also answers the open question below in favour of suspend-not-unpair.

`TODO.md` row **Q** is adjacent and is NOT this. Q proves the WordPress/WooCommerce **entry door**
closes after cancellation. **Push bypasses the door entirely**, because the phone is already
registered. Closing Q does not close P-1.

### Answered by the evidence: suspend, don't unpair

The open question in the first draft of this row — unpair the device or suspend delivery — is
settled by rule 5 above plus the shape of `resetFCMForuser`, which exists precisely so an operator
can *deliberately* drop registrations. Suspension is `notificationsState`; unpairing is a separate,
heavier operator action the reference keeps distinct. **Keep them distinct here too.**

### "Immediately" is a design constraint, and it is the hard part

A next-login check is not immediate — a cancelled member who never opens the app keeps receiving
pushes forever. Immediate means the *lapse event* must actively revoke, so the design needs:

- a **billing webhook** (Stripe, or WooCommerce → our side) as the trigger;
- a **revocation write** that clears the tokens and marks the member;
- an **idempotent, replayable** path, because webhooks arrive twice and out of order;
- **fail-closed on ambiguity** — if entitlement cannot be determined, do not send. This is a
  multi-tenant fintech app and this file's parent standard says every allow-list is deny-by-default;
- a **reconciliation sweep**, because a webhook that is never delivered must not mean a member is
  entitled forever.

**Open question for the owner:** should revocation *unpair the device* (it must pair again, needing a
new PIN) or *suspend delivery* (tokens retained, resumed on renewal)? The second is far better for a
member who lapses and renews a day later, and it is the one I would build — but it is a product call,
not a technical one.

## P-2 — One computer and one mobile device per account

**The owner's words:** *"We also need to create a way where only one computer and one mobile device
can be connected. What happens quite often is people share the subscription and there are 5, 6 or
sometimes more users connected to the same account."*

**What exists:** `loginSessions` — `id`, `userId`, `createdAt`, `lastSeenAt`, plus
`login_sessions_last_seen_idx`. **That is all.** There is no device identifier, no device class, no
per-user session cap, and no eviction anywhere in `apps/` or `services/`.

**So the shape is: one row per login, unlimited rows per user.** Six people sharing one password
produce six perfectly valid sessions and nothing notices. The table is the right seam — it already
exists, is already keyed by user, and already tracks `lastSeenAt`, which is what an eviction policy
needs.

**What has to be added, none of which is speculative:**

- a **stable device identity** that survives a browser restart and is not trivially cleared;
- a **device class** — `desktop` | `mobile` — because the cap is *one of each*, not two of any. The
  mobile side already has a natural identity in the FCM registration from P-1;
- a **cap with an eviction policy**, which is a product decision: does a new login **evict the
  oldest** (seamless, and how Netflix-style limits usually behave) or **get refused** until the other
  signs out (stricter, and generates support load)?
- the **room** counted too, not just the controller. A room session is reached by handoff token; if
  the cap lives only at the controller's login, a shared handoff URL walks straight past it.

**Warn before enforcing.** Turning this on cold will sign out real single-users on their second
browser and read as an outage. Recommended order: **count and log first**, look at the real
distribution, then enforce with a clear message that says which other device is signed in.

**Open questions:** does a presenter get the same cap as a member (a presenter plausibly runs a
second screen)? Does "one computer" mean one browser, one machine, or one concurrent session?

## P-3 — The super-admin dashboard is further along than "to finish" suggests

**The owner's words:** *"We also have to finish the super admin dashboard, which is the enterprise
account which controls the business's accounts. (we might need to investigate that a little
further)."* The parenthesis is right, and this row is that investigation's starting point.

**What is already built — 795 lines, and it is not a stub:**

| piece | where |
|---|---|
| route | `(app)/admin/` — `+layout.server.ts`, `+page.server.ts` (266), `+page.svelte` (273) |
| authorization | `lib/server/superadmin.ts` (256) — `requireSuperadmin`, `recordAdminAccess` |
| guard | layout-level so it is **opt-out, not opt-in**, *plus* a page-level guard, both proven by `admin-guard-contract.test.ts` |
| audit | `admin_audit`; **refusals are recorded before the rethrow**, which is the half a naive version drops |
| tables | `admin_users`, `admin_audit`, `impersonations` |
| operator console | a table of Account · Owner · Registered · Users · Rooms · Members · Badges · API keys · Status |
| actions | `setAccountStatus` (suspend/reactivate), `impersonate`, `stopImpersonating` |

**The tenant boundary already exists too:** `accounts` is the business, `users.accountId` is the
membership, and `accounts.status` is honoured at one chokepoint (`readUser`) plus the two paths that
do not use a cookie — the login action and `internal/room-config`. Its comment states the reason
plainly: *"Miss one and a suspended owner keeps working, which is worse than no suspend at all
because it reads as enforced."*

**So "the enterprise account which controls the business's accounts" is largely the model that is
there.** What is NOT established — and must be, before any work — is what *finished* means:

1. **Is the enterprise tier a new level above `accounts`,** or is it the existing superadmin console
   with more features? These are very different: the first is a schema change (an
   `organisations` parent, re-scoping every query and every guard), the second is UI work on a
   boundary that already holds. **Nothing in the repo answers this** and I will not guess.
2. **What does an enterprise operator need to DO** that `setAccountStatus` / `impersonate` do not
   already cover — billing, usage, per-account limits, seat management, reporting?
3. **P-1 and P-2 both terminate here.** Billing state (P-1) and device caps (P-2) are exactly what an
   enterprise console displays and overrides. **Settle P-3's model before building either**, or they
   get built against a boundary that then moves.

## P-4 — Drawing / annotation tool

**The owner's words:** *"And one more thing is the drawing tool I would like to integrate into the
app. (will discuss further)."* Recorded as raised; **no design is proposed here**, per that note.

**What exists: nothing.** No canvas, annotation, whiteboard or drawing surface anywhere in
`apps/room/src` or `apps/controller/src`, and no such component in the 51-component reference bundle
— so **this is new product, not a reference match.** It is the first item in this file with no
capture to check against, which also means nothing constrains its design.

**The surfaces it would touch,** named so the discussion has a starting point: `ScreenPane.svelte`
(the screenshare view), `PresentationArea.svelte`, and `screen-zoom.ts` / `ScreenZoomControls.svelte`
— pan/zoom already transforms that surface, and an annotation layer has to share that transform or
the drawing slides off the content.

**Questions to settle before any design:**

- **Who draws** — presenters only, or members too?
- **Does it broadcast?** A presenter annotating a chart for the room is a completely different build
  from a member marking up their own view. Broadcast means a wire format, ordering, late-join replay
  (the same problem as R-14's `ytStartTime`) and per-stroke authorization.
- **What does it draw ON** — the shared screen, a stream tab, a blank whiteboard, an uploaded chart?
- **Does it persist**, and if so is it part of the recording?

## P-5 — Spotify

**The owner's words:** *"and also need to discuss implementing spotify."* Recorded; discussion
pending.

**What exists: nothing.** The only `spotify` matches in the repo are inside the Font Awesome brand
icon font — a glyph, not an integration.

**The precedent is `app-scplayer`** (audited above, R-13): SoundCloud as a hidden `iframe`, parked
below the fold, audio-only, one input `scUrl`. Room-wide audio is already a solved shape here —
`media.soundCloudPlaying`, `mp3Playing` and `youtubeForAllUrl` are the three sources the navbar
already knows about (`RoomNavbar.svelte:728`), so a fourth has somewhere to plug in.

**One question has to be answered before anything is designed, because it may end the discussion:**
Spotify's embed and Web Playback SDK are built for a listener playing to *themselves* — playback
requires each listener's own Premium account, and there is no supported way to take one presenter's
Spotify stream and rebroadcast it to a room. That is not the same shape as SoundCloud's public embed
or an MP3 the room hosts.

**So the real question is which product you want**, and they differ enormously in cost:

- **(a) Each member plays their own Spotify**, room-synced — needs per-member Spotify auth and
  Premium; the room only broadcasts *what to play*, never audio. Feasible, but every member needs a
  Premium account.
- **(b) The presenter's Spotify audio reaches everyone** — this is the one people usually mean, and
  it is the one the platform is designed to prevent. It would mean capturing system audio into the
  existing screenshare/SFU path rather than integrating Spotify at all, with the licensing question
  that raises.

**I have not verified Spotify's current developer terms against this use case**, and I am not going
to assert them from memory in a file whose whole point is cited evidence. **Action: confirm the terms
first**, then pick (a) or (b). If the answer is (b), the honest framing is that it is a
system-audio-capture feature that happens to be used for Spotify.

---

## Cross-check — what else is recorded elsewhere and is NOT duplicated here

Checked against `TODO.md`'s "Not an evidence gap — missing work" table so nothing is tracked in two
places (which is how one copy goes stale). The room-relevant rows there stay there:

- **Q** — WordPress/WooCommerce entry door after cancellation. **Adjacent to P-1 and not the same
  thing**; cross-referenced from P-1 rather than copied.
- **S** — guest path shows two forms where the reference has one.
- **W** — **HIGH: user-info / session-control modal actions that report success and send nothing**
  (`kick`, `kick-ban`, `kick-duplicates`, `admin-notes-password`, `session-send-users-url`,
  `session-send-sales-image`). This is the largest known room defect and it is a *behaviour* gap
  inside built components, so it belongs in that table — but **step 2 of this audit will meet it
  again** when `app-user-info-modal` and `app-session-control-modal` are read.
- **X** — `recPreviewWindow`, blocked on a MediaMTX cluster.
- **AE / AF / AG** — the `+page.svelte` decomposition, the html-to-text derivation, and the seventeen
  dynamically-dispatched form actions.

**Nothing in that table is missing from this file's scope, and nothing in this file duplicates it.**
