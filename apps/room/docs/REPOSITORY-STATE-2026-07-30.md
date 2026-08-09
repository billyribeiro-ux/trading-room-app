# ProTradingRoom reconstruction — repository state

> ## ⚠️ SUPERSEDED — historical record only
>
> **Superseded by [`REPOSITORY-STATE-2026-08-03.md`](REPOSITORY-STATE-2026-08-03.md).**
>
> Twelve commits on 2026-08-01 (`e60e319` … `f84bae3`) added a PostgreSQL-backed
> Rust API, a realtime socket with a transactional outbox and `LISTEN`/`NOTIFY`,
> a capability layer, CI, container images, health endpoints and rate limiting.
> This document predates all of it and its architecture, inventory, verification
> and hygiene sections are **materially wrong** as a description of the current
> tree. Section 6 of the 08-03 report lists every correction.
>
> The most load-bearing errors: "no WebSocket … or transport" and "no
> cross-client presence … or room event fanout" are false; the runtime is 9
> route files not 4; SQLite defines 15 tables not 12; the suite is 195 tests not
> 95; and `.git`, CI, Dockerfiles, health endpoints and a rate limiter all exist.
>
> This file is kept unmodified below the line because it is the dated evidence of
> what was true on 2026-07-30, and several later documents cite it by date.
> Do not update it — record new findings in a new dated report.

**Audit date:** 2026-07-30  
**Workspace:** `/Users/billyribeiro/Desktop/new-room`  
**Scope:** current SvelteKit runtime, local persistence, decoded source/evidence, database artifacts,
tests, generated audits, and the boundary for the forthcoming mediasoup work.

This document reports what the repository does now. It does not infer missing behavior from labels,
screenshots, or conventional product expectations.

## Status vocabulary

| Status                | Meaning                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| **Persisted**         | The visible control reaches a SvelteKit server action or endpoint and writes current runtime storage. |
| **Client-functional** | The behavior works in the current browser but is not distributed to other room participants.          |
| **Partial**           | A real portion works, but a required downstream path is absent or deliberately deferred.              |
| **Evidence shell**    | The captured DOM/style is represented, but its product operation is not wired.                        |
| **Evidence-only**     | Source material exists in the repository but has not been made part of the runtime.                   |
| **Excluded artifact** | The captured node was injected by a browser/extension and is not application behavior.                |

“Persisted” does not mean production-complete. The active runtime is a single-node SQLite
reconstruction without a realtime transport or tenant enforcement.

## Executive assessment

The repository is a substantial, buildable forensic reconstruction of the live room surface. It is
not yet a production multi-user room.

What is solid:

- Svelte 5/SvelteKit/TypeScript runtime builds and type-checks.
- The major room surfaces, Darkly styling, captured alerts/chat rows, message menus, post-alert
  composition, poll panel, notes editor, modals, split layout, sounds, and toast behavior are
  represented.
- Connected identity is resolved per browser/upstream request instead of rendering a hardcoded
  username.
- Messages, alerts, settings, polls, poll answers, saved polls, chat mutes, notes, and note versions
  have active SQLite persistence.
- The supplied PostgreSQL schema package is preserved and verified exactly, including FORCE RLS,
  policies, grants, helper functions, and restore ordering.
- The current automated application suite is green.

What is not present:

- No WebSocket, Socket.IO, SSE, Redis, LiveKit, or mediasoup runtime dependency or transport.
- No cross-client presence, remote media, active-speaker detection, room event fanout, or reconnect
  protocol.
- The verified PostgreSQL/RLS schema is not the runtime database.
- A number of captured dialogs and controls are styled interaction shells or client-only behavior.
- There is no CI configuration, deployment manifest, health endpoint, production observability, or
  measured coverage report.

The correct current maturity label is:

> **Forensic single-node room reconstruction with local persistence and browser media acquisition;
> realtime room delivery and production control-plane enforcement remain to be implemented.**

## Quantitative inventory

### Repository corpus

| Area             | Files | Purpose                                                             |
| ---------------- | ----: | ------------------------------------------------------------------- |
| `first-dump/`    | 1,031 | Part 1 capture and decoded evidence                                 |
| `second-dump/`   |   877 | Part 2 evidence, component/modals decode, PostgreSQL artifacts      |
| `docs/`          |   220 | Source bundles, decoded components, contracts, generated audits     |
| `src/`           |    81 | Active SvelteKit runtime                                            |
| `scripts/`       |    34 | Capture analyzers, source decoders, CSS generators, contract audits |
| `static/`        |    30 | Logo, talking assets, app badges, loader, sound files               |
| `app-modals/`    |    29 | User-supplied modal evidence                                        |
| `drizzle/`       |    16 | SQLite migrations and snapshots                                     |
| `alert-section/` |     9 | User-supplied alert evidence                                        |
| `css/`           |     1 | Complete supplied stylesheet authority                              |

Additional focused evidence exists in `app-room/`, `app-message-modal/`, `navbar-section/`,
`kebabs/`, `preview/`, `jcrop/`, and top-level clean HTML/text dumps.

### Active runtime size

| Runtime artifact                      |  Lines |
| ------------------------------------- | -----: |
| `src/routes/+page.svelte`             |  4,365 |
| `src/lib/components/ModalHost.svelte` |  4,451 |
| `src/app.css`                         |  2,805 |
| Generated scoped CSS bridge           |  8,156 |
| Emoji data                            | 12,915 |
| `RoomMessage.svelte`                  |    771 |
| `PollPanel.svelte`                    |    787 |
| `PostAlertModal.svelte`               |    464 |
| `VideoPlayer.svelte`                  |    401 |
| Notes editor/pane/tab chrome          |  1,883 |
| `+page.server.ts`                     |    690 |
| Active `src` TS/Svelte/CSS total      | 41,436 |
| Audit/decoder scripts                 |  7,787 |

The active client is concentrated in two very large components. This helped preserve captured DOM
order, but it raises change-risk for the mediasoup and realtime phases.

### Captured evidence coverage

- 58 Part 1 capture states.
- 27,785 inspected captured node occurrences.
- 51 decoded `*.full.js` production components and 194 component source artifacts.
- 23 modal-root occurrences, 22 unique captured modal IDs, and 22 runtime modal roots.
- 384 captured classes: 372 have direct selector evidence; the other 12 have classified indirect
  ownership; zero are unclassified.
- 290 captured CSS variables; all 290 resolve to definitions.
- 95 captured computed-style properties.
- Part 2 is one final full-DOM freeze plus metadata; it explicitly contains no network/WebSocket
  payloads and no screenshot PNGs.

## Current runtime architecture

```text
Browser
  ├─ Svelte 5 room UI
  ├─ localStorage: split sizes, followed/muted users, presenter video list
  ├─ MediaDevices/MediaRecorder: local acquisition and recording
  └─ SvelteKit form actions / one notes endpoint
          │
          ▼
SvelteKit adapter-node process
  ├─ identity hook
  ├─ page load + form actions
  ├─ Drizzle ORM
  └─ better-sqlite3 (.data/proroom.sqlite)
```

There is no event broker or room transport between browsers. `invalidateAll()` refreshes server
data after actions initiated by the same client; it is not realtime fanout.

### Runtime routes

The active route surface contains only:

- `src/routes/+layout.svelte`
- `src/routes/+page.svelte`
- `src/routes/+page.server.ts`
- `src/routes/api/notes/[noteId]/versions/+server.ts`

Messages, alerts, polls, settings, and most notes mutations are SvelteKit page actions, not a
versioned application API.

## Identity, authorization, and tenancy

### Implemented

- `src/hooks.server.ts` resolves an identity on every request.
- `src/lib/server/connection.ts` accepts trusted `x-ptr-user-*` or `x-auth-request-*` headers.
- Without upstream identity, a stable `ptr_connection` browser session and `Guest <hex>` identity
  are created.
- The displayed username and avatar come from the connected identity.
- Session cookies are HTTP-only, SameSite Lax, 30-day cookies; production cookies are Secure.
- Presenter UI is gated by the local user role (`staff` or `admin`).

### Important current boundary

- The anonymous fallback user is assigned `staff`, not a restricted member role. This preserves the
  staff-capture experience but is unsafe as production authorization.
- Header trust assumes a correctly isolated reverse proxy; the app does not authenticate those
  headers itself.
- The active SQLite tables have no `enterprise_id`, `room_id`, RLS, or membership capability model.
- `connectedUsers` is deliberately `[connectedUser]`; the server source explicitly defers
  multi-user presence until its transport and membership semantics exist.
- User-management buttons mostly do not enforce or mutate a production membership model.

## Styling and visual source of truth

### What is authoritative

`css/complete-app-styles.css` is the captured global stylesheet authority:

- 8,078 lines
- SHA-256 `081f4c79bd6aec77046d2d7b7397603bbad7ecd36a2c2a6b4fbe02695b2ef5f0`

  Previously `0671255d837fe69761bd3e98e7b18c0e90ce09050d387046bea001f6237baf5a`. The four
  `@font-face` src lists were repointed from `use.fontawesome.com` and `chat.protradingroom.com`
  to the byte-identical copies already vendored in `node_modules/@fortawesome/fontawesome-free`
  and `src/lib/styles/` (SHA-256 verified per file), so the app makes no third-party font request.

`src/lib/styles/captured-runtime-components.css` is mechanically generated from it by
`pnpm css:sync-captured`. It translates Angular scope attributes to the captured custom-element
hosts and embeds the source hash.

### Actual runtime cascade

`src/app.css` imports, in order:

1. `css/complete-app-styles.css`
2. Font Awesome 5.8.1
3. Animate.css 3.7.2
4. `src/lib/styles/tokens.css`
5. generated `captured-runtime-components.css`
6. 2,813 lines of Svelte integration/layout/control CSS in `src/app.css`

Therefore the stylesheet is the evidence authority, but the executable styling system is not
literally one file. It includes:

- the supplied stylesheet;
- a 238-line derived token layer;
- an 8,156-line generated scoping bridge;
- local integration and new-feature styles.

The alert/chat style contract currently proves:

- the captured Alert and Chat header typography and icon sizes;
- the intentional evidence-backed difference between the 20 px alert bell and 16 px chat comment;
- one shared `RoomMessage` host for Alerts and Chat;
- one shared date separator rule with 13 px text, italic style, 600 weight, and matching top/bottom
  border color;
- no forbidden local re-styling of the audited Alert/Chat selectors.

This layered cascade must remain explicit. Calling `src/app.css` or `tokens.css` a second independent
visual authority would be inaccurate.

## Feature inventory

### Shell, navigation, and layout

| Capability                      | Status                        | Current behavior                                                                            |
| ------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------- |
| SvelteKit application shell     | **Implemented**               | Adapter-node build; SvelteKit body is wrapped in a `display: contents` element.             |
| Captured Angular-like hosts     | **Implemented**               | `app-root`, `app-room`, `as-split`, and other custom hosts preserve selector/DOM ownership. |
| Hamburger/sidebar               | **Client-functional**         | Starts closed; opens/closes only through the hamburger/close control.                       |
| Main and Alert/Chat split panes | **Client-functional**         | Pointer-drag gutters; ltr/ttb/rtl/btt direction support.                                    |
| Split persistence               | **Client-functional**         | Stored in localStorage per layout direction.                                                |
| Top room navbar                 | **Client-functional/partial** | Captured controls and menus render; media controls acquire local devices only.              |
| Mobile app launch control       | **Implemented**               | Opens the captured app-information modal.                                                   |
| Dark/light theme                | **Persisted**                 | Theme and related settings are stored in `user_settings`.                                   |
| Reload confirmation             | **Client-functional**         | Bootbox confirmation precedes `window.location.reload()`.                                   |

### Alerts

| Capability             | Status                        | Current behavior                                                                                                                                                                    |
| ---------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Captured alert history | **Implemented**               | Eight exact captured alert fixtures, including separators, stocks, Q&A badge/check, image, and legal text.                                                                          |
| New alert persistence  | **Persisted**                 | Presenter post writes `alerts` in SQLite.                                                                                                                                           |
| Post Alert tabs        | **Persisted/partial**         | Text, URL, and media composition work; external media upload requires configured source endpoint/key.                                                                               |
| Trade/non-trade flag   | **Persisted**                 | `alerts.non_trade` selects the evidence-backed sound.                                                                                                                               |
| Keep Open              | **Client-functional**         | Modal remains open and clears fields after successful post.                                                                                                                         |
| Post on X              | **Client-functional**         | Opens/reuses the X intent window.                                                                                                                                                   |
| Don’t Push             | **Partial**                   | Submitted by the client, but the server action does not read or enforce it. No push transport exists.                                                                               |
| Alert toast            | **Client-functional/partial** | Warning toast flies from the right, deduplicates, pauses on hover, sanitizes HTML, and times out. It only fires when this browser receives a new alert through refreshed page data. |
| Alert sound            | **Client-functional/partial** | Exact cash/nontrade assets play through Howler; no server push exists to deliver another user’s alert immediately.                                                                  |
| Browser notification   | **Client-functional/partial** | Requested after toast delivery; browser permission/platform policy still applies.                                                                                                   |
| DND suppression        | **Client-functional**         | Suppresses the implemented alert-delivery branch and shows captured badges.                                                                                                         |
| Q&A panel              | **Evidence shell**            | Modal/header/composer render; there is no question/answer persistence or send path.                                                                                                 |
| Alert Send Report      | **Evidence shell**            | Shows a simulated loading state, then “No Reports.”                                                                                                                                 |
| Advanced search        | **Evidence shell**            | Fields/dropdowns render; Search and Rooms refresh have no query path.                                                                                                               |
| Alert filter           | **Evidence shell**            | Captured controls render; no filtering state or server query is implemented.                                                                                                        |
| Scheduled alerts       | **Evidence shell**            | Empty captured table; no scheduling persistence or execution.                                                                                                                       |
| Alert archives/logs    | **Evidence shell**            | Empty-state modal; Reload has no archive backend.                                                                                                                                   |

### Chat and message rows

| Capability                  | Status                           | Current behavior                                                                                                    |
| --------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Captured chat history       | **Implemented**                  | Ten exact captured rows, including admin reverse layout, questions, separators, and timestamps.                     |
| Main/Off Topic tabs         | **Persisted locally in DB rows** | New messages write their selected `room`; the tab switch is client state.                                           |
| Send message                | **Persisted**                    | Enter without Shift posts through `sendMessage`; active chat mute is enforced.                                      |
| Reply                       | **Persisted/partial**            | Text replies persist with reply metadata; the reply modal image icon is not wired.                                  |
| Initial and send autoscroll | **Implemented**                  | Both panes open at the newest row; own messages force bottom; reading position is retained for others’ rows.        |
| Shared date separator       | **Implemented**                  | Same component/rule serves Alerts and Chat.                                                                         |
| Message menus/kebabs        | **Implemented/partial**          | Exact role/kind ordering and captured menu variants render.                                                         |
| Delete persisted row        | **Persisted**                    | Server permission check and deletion for live SQLite rows.                                                          |
| Edit persisted row          | **Persisted**                    | Server action updates live rows.                                                                                    |
| Reactions                   | **Persisted**                    | JSON reaction state is updated for live rows.                                                                       |
| Mark answered               | **Persisted**                    | Presenter can mark live chat rows answered.                                                                         |
| Mute chat for 24 hours      | **Persisted**                    | `chat_mutes` blocks `sendMessage` until expiration.                                                                 |
| Show message to all         | **Partial**                      | Server action returns success without changing state or broadcasting.                                               |
| Copy                        | **Client-functional**            | Clipboard copy plus info toast.                                                                                     |
| User Info / Mention         | **Client-functional**            | Opens the user modal or injects mention text.                                                                       |
| Captured fixture mutation   | **Client-functional**            | Negative-ID fixture edits/deletes/reactions are browser overlays and reset on reload.                               |
| Rich-text chat modal        | **Evidence shell**               | Empty `#msgTxtContainer`; Send has no handler. Source evidence says plain chat transport, not a completed chat RTE. |

### Composer and content tools

| Capability                   | Status                     | Current behavior                                                                             |
| ---------------------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| Active underline             | **Implemented**            | Uses the captured text-area holder/focus styling.                                            |
| Plus/options state           | **Client-functional**      | Width under 400 px starts collapsed; plus expands options.                                   |
| Emoji picker                 | **Client-functional**      | 1,823 decoded Apple emoji entries with categories/search/scroll behavior.                    |
| Image upload                 | **Persisted/conditional**  | Select/drop/preview, external upload, then message persistence; requires upload URL and key. |
| Giphy                        | **Persisted/conditional**  | Search/select/confirm then message post; requires `PUBLIC_PTR_GIPHY_API_KEY`.                |
| Play YouTube For All         | **Client-functional only** | Opens and plays the overlay in the initiating browser; there is no room event.               |
| Presenter-only media options | **Implemented**            | Image/GIF/YouTube controls are gated to the captured presenter role.                         |
| Form field identity          | **Verified**               | Source audit reports every field has an ID or name and literal IDs are unique.               |

### Polls

| Capability          | Status                | Current behavior                                                                                                                            |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Floating poll panel | **Client-functional** | Captured dimensions, centering, drag, resize, minimize, maximize, restore, close.                                                           |
| Create/send poll    | **Persisted**         | Active poll is written to SQLite; prior active polls are ended.                                                                             |
| Pre-canned polls    | **Persisted**         | Save, load, and delete from `saved_polls`.                                                                                                  |
| Vote once           | **Persisted**         | Unique poll/sender index; repeat insert is ignored.                                                                                         |
| Presenter results   | **Persisted**         | Totals, pie rendering, visible voter responses.                                                                                             |
| Post results        | **Persisted**         | Formatted results become a text alert.                                                                                                      |
| End poll            | **Persisted**         | Sender changes active poll to done.                                                                                                         |
| Recipient auto-open | **Partial**           | Works when refreshed data contains an unanswered poll; no realtime push opens it on other clients.                                          |
| Anonymous poll      | **Partial**           | Checkbox affects only the sender’s current panel rendering. It is not submitted, stored, or returned to participants, and resets on reopen. |

### Notes

The notes implementation is an evidence-backed local vertical slice. Notes-specific authority is
`notes/notes-main?`, decoded `app-note`/`app-presentationarea` source, and the supplied complete
stylesheet. The later `notes-rich-text-editor` README explicitly identifies its open editor as the
separate chat RTE modal, so that artifact is used only to corroborate shared Summernote chrome.

| Layer                       | Status                         | Current behavior                                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notes pane and tabs         | **Implemented**                | One captured `li.nav-item > a.nav-link` per persisted note, with the captured nested name/pen/gear/six-action hierarchy inserted after mount, active selection, and the bottom action bar. Actual persisted IDs are used; the decoded duplicate `dropdownMenuNote` defect is corrected with unique IDs. An empty collection renders no invented status message. |
| Notes CSS authority         | **Implemented**                | `css/complete-app-styles.css` owns `.noteTabset`, dropdown, `.note-container`, and `.noteOptions`; the generated `app-presentationarea` bridge owns full-height/flex layout. The unsupported local `#notesTabs { height: 2px; }` collapse and component-scoped layout overrides were removed and are regression-tested.                                         |
| Create/rename/delete        | **Persisted**                  | Bootbox-style prompt/confirmation flows call validated server actions; create consumes the exact server-returned note ID, activates its canonical tab, and enters edit mode immediately; delete is a soft delete.                                                                                                                                               |
| TipTap editor               | **Implemented/partial parity** | Real editor with the captured toolbar groups: style, view, history, font, font family/size/color, lists/alignment/indent, line height, table, link, image, video, emoji, GIF, and carousel. YouTube embeds are active; the other provider names present in the captured video label are not yet implemented.                                                    |
| Edit lifecycle              | **Implemented**                | Dirty state drives the pen indicator; TipTap transaction refreshes are deferred outside template evaluation; writes autosave on the decoded 3-second interval; Done forces a final save and closes the editor.                                                                                                                                                  |
| Note actions                | **Mixed**                      | Download works locally; current-room welcome mat persists; “all rooms” reaches the command but the runtime has only one session store; “Bring Everyone here” only selects locally because no room transport exists.                                                                                                                                             |
| Image/GIF/carousel          | **Client-functional/partial**  | HTTPS image URL, configured upload path, configured Giphy picker, and persisted carousel markup work. External upload/Giphy credentials still control availability.                                                                                                                                                                                             |
| Mount gate                  | **Implemented**                | `notesEnabled && canEditNotes`; current role gate is staff/admin.                                                                                                                                                                                                                                                                                               |
| Command validation          | **Implemented**                | Strict Zod commands cover create, rename, save, restore, delete, and welcome-mat changes; content HTML maximum is 1,000,000 characters.                                                                                                                                                                                                                         |
| Server sanitization         | **Implemented**                | `sanitize-html` allowlist on write/read covers the evidenced formatting, table, HTTPS media/embed, and carousel structures.                                                                                                                                                                                                                                     |
| Client sanitization         | **Implemented**                | Independent DOM allowlist rechecks historical rows, enforces HTTPS and trusted iframe hosts, caps depth at 50, adds safe link relations, and initializes sanitized carousels.                                                                                                                                                                                   |
| Persistence                 | **Persisted**                  | `notes` and `note_versions` in SQLite.                                                                                                                                                                                                                                                                                                                          |
| Version coalescing          | **Persisted**                  | Same editor’s writes within 30 seconds update the current version.                                                                                                                                                                                                                                                                                              |
| Restore                     | **Persisted**                  | Restoring creates a new immutable version head.                                                                                                                                                                                                                                                                                                                 |
| Versions endpoint           | **Implemented**                | `GET /api/notes/[noteId]/versions`.                                                                                                                                                                                                                                                                                                                             |
| Form identity               | **Implemented**                | Every field has an ID or name; dynamic editor IDs remain unique and the source audit parses complete Svelte template-literal IDs.                                                                                                                                                                                                                               |
| Postgres/tenant integration | **Not implemented**            | Current notes use local SQLite and local role gates.                                                                                                                                                                                                                                                                                                            |

### Presentation, files, and shared playback

| Capability                     | Status                     | Current behavior                                                  |
| ------------------------------ | -------------------------- | ----------------------------------------------------------------- |
| Screens tab                    | **Evidence shell**         | “No one is presenting right now…” and empty screen tabs/content.  |
| Streams tab                    | **Evidence shell**         | Hidden captured pane; no stream producers/consumers.              |
| VideoPlayer list               | **Client-functional**      | Presenter URLs stored in localStorage per local session ID.       |
| VideoPlayer schedule/play/stop | **Client-functional only** | Local timer and local iframe/video; “For All” is not distributed. |
| Files list/search/counts       | **Read-only partial**      | Reads `shared_files` from SQLite and filters in browser.          |
| File refresh                   | **Implemented**            | Calls `invalidateAll()`.                                          |
| File upload modal              | **Evidence shell**         | Exact select/drop/upload DOM; no file handlers or upload action.  |
| Delete Selected                | **Evidence shell**         | Button has no handler.                                            |
| Shared-file writes             | **Not implemented**        | Table exists; no create/delete server action exists.              |
| SoundCloud play/volume         | **Client-functional only** | DOM CustomEvents and local iframe state; no room broadcast.       |
| YouTube overlay                | **Client-functional only** | Local overlay and DND mute flag; no room broadcast.               |

### Roster, followed users, muted users, and private chat

| Capability           | Status                     | Current behavior                                                                                                            |
| -------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Roster               | **Partial**                | Renders only the current connected identity because no presence transport exists.                                           |
| Roster controls      | **Partial/shell**          | Reload invalidates; sort/search buttons and Sort by Trials are not operational.                                             |
| Roster kebab         | **Client-functional**      | User Info, Mention/Reply, and evidence-gated Private Chat.                                                                  |
| Followed users       | **Client-functional only** | Browser localStorage plus follow style/sound configuration.                                                                 |
| Muted users list     | **Client-functional only** | Browser localStorage; separate from server `chat_mutes`.                                                                    |
| Private chat window  | **Evidence shell**         | Window/user tab/empty scroller/DND badge render. No PM composer, persistence, transport, history, delete, or settings path. |
| All private messages | **Evidence shell**         | Permanent captured loading state.                                                                                           |

### Local media and recording

| Capability               | Status                        | Current behavior                                                                                                                         |
| ------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Microphone activation    | **Client-functional/partial** | `getUserMedia({audio:true})` only after explicit click; track can be enabled/disabled.                                                   |
| Camera activation        | **Client-functional/partial** | `getUserMedia({video:true})` only after explicit click; track can be enabled/disabled.                                                   |
| Screen capture           | **Client-functional/partial** | `getDisplayMedia()` or camera source only after explicit selection; track-end cleanup.                                                   |
| Screen recording         | **Client-functional/partial** | Local `MediaRecorder`, pause/resume/stop, local blob URL creation.                                                                       |
| Remote publish/consume   | **Not implemented**           | No mediasoup transport, producer, consumer, signaling, or remote media elements.                                                         |
| Local camera preview     | **Partial**                   | Captured preview DOM exists, but `webcamStream` is not assigned to a video `srcObject`.                                                  |
| Screen/recording preview | **Partial**                   | State and blob URL exist, but there is no complete preview/download/upload path.                                                         |
| Talking user list        | **Partial**                   | Local microphone enable adds the current user to a local array.                                                                          |
| Voice activity           | **Not implemented**           | No AudioContext/Analyser, mediasoup observer, or threshold logic.                                                                        |
| Talking waveform         | **Partial**                   | Exact `talking.gif`/name DOM renders only when a `presenterTalking` window event is dispatched. Runtime media code does not dispatch it. |
| Remote active speaker    | **Not implemented**           | No cross-client active-speaker event or roster.                                                                                          |

### Connectivity tester

The connectivity modal is a real browser diagnostic:

- WebRTC ICE candidate test for UDP/TCP/STUN/TURN.
- Microphone device enumeration on explicit action.
- Live microphone level, record, stop, and playback.
- Copyable results.

Operational risk: it reproduces the captured public STUN servers and hardcoded TURN endpoint,
username, and credential. These must not become the production mediasoup credential strategy.

### Settings, session control, and user administration

The settings/user/session surfaces contain a mixture of persistence and evidence-only commands.

Implemented or partially implemented:

- theme, room layout, chat style, DND, and several sound/popup preferences;
- username edit;
- session open/closed/locked values stored as flexible user preferences;
- local preview removal and local master mute;
- local video-list insertion from Session Control;
- reload/reset confirmations and captured success messages.

Visual confirmations without product-side effect:

- kick, kick/ban, and kick duplicates;
- save permissions;
- restart audio and force reload of another user;
- session soft/hard reset;
- sales image and users URL “send” commands.

User modal actions with no implementation branch:

- mute mic;
- mute camera;
- stop/restart screens;
- start/stop another user’s recording;
- debug log;
- disable private chat;
- upload profile picture;
- test follow sound;
- get token.

Additional shells:

- A/V Settings device selectors and Save/Change Devices controls;
- Debug Log empty textarea;
- many Session Control tabs and operational fields;
- recording archive/transcript-history menu items.

## Modal inventory

| Modal/surface                           | Runtime status                                         |
| --------------------------------------- | ------------------------------------------------------ |
| User Info                               | **Partial** — rich captured UI; subset of actions work |
| Play YouTube For All                    | **Client-functional only**                             |
| General Settings                        | **Partial/persisted subset**                           |
| A/V Settings                            | **Evidence shell/partial selectors**                   |
| Debug Log                               | **Evidence shell**                                     |
| Post Alert                              | **Persisted**, external uploads conditional            |
| Poll                                    | **Persisted**, no realtime, anonymity partial          |
| Chat Logs                               | **Evidence shell**                                     |
| Alert Logs                              | **Evidence shell**                                     |
| Session Control                         | **Partial/preferences and confirmations**              |
| Mobile App Info                         | **Implemented static links**                           |
| Reply                                   | **Persisted text; image control unwired**              |
| Alert Q&A                               | **Evidence shell**                                     |
| Muted Users                             | **Client-functional localStorage**                     |
| Followed Users                          | **Client-functional localStorage**                     |
| Duplicate Followed Users modal          | **Capture-true closed duplicate preserved**            |
| Scheduled Alerts                        | **Evidence shell**                                     |
| Alert Send Report                       | **Simulated shell**                                    |
| All Private Messages                    | **Evidence shell**                                     |
| Alerts Advanced Search                  | **Evidence shell**                                     |
| Alert Filter                            | **Evidence shell**                                     |
| WebRTC Troubleshooter                   | **Client-functional diagnostic**                       |
| Rich Text Editor                        | **Evidence shell**                                     |
| File Upload                             | **Evidence shell**                                     |
| Image Upload                            | **Functional with configured external upload service** |
| Bootbox alert/confirm/prompt            | **Client-functional**                                  |
| Image/GIF confirmation and image viewer | **Client-functional**                                  |

The generated behavior audit reports no captured trigger gaps. That proves every captured trigger has
a runtime trigger where evidence defined one; it does not prove the downstream product operation is
implemented.

## Active SQLite persistence

### Tables

The active Drizzle/SQLite runtime defines 12 tables:

1. `users`
2. `messages`
3. `alerts`
4. `shared_files`
5. `user_settings`
6. `polls`
7. `poll_answers`
8. `saved_polls`
9. `notes`
10. `note_versions`
11. `chat_mutes`
12. `sessions`

SQLite is opened in WAL mode with foreign keys enabled. The database files currently live under
`.data/`.

### Current server mutations

- create/update connected user and session;
- edit username;
- send/reply/edit/delete/react to messages;
- post/edit/delete/react to alerts;
- mark chat answered;
- mute chat for 24 hours;
- save user preferences and theme;
- create/save/answer/end polls and manage canned polls;
- create/save/version/restore notes.

No server mutation exists for:

- shared-file upload/delete;
- private messages;
- Q&A;
- scheduled alerts;
- archives/search/filter;
- presence;
- media signaling;
- admin membership/capability enforcement.

## PostgreSQL/RLS evidence package

The canonical database artifacts are under `second-dump/db/`:

| Artifact              | Lines | Role                                               |
| --------------------- | ----: | -------------------------------------------------- |
| `RECREATE.sql`        | 1,960 | Ordered, self-contained restore                    |
| `SCHEMA-REFERENCE.md` |   290 | Human-readable RLS/functions/grants/table contract |
| `SCHEMA-FULL.sql`     | 2,814 | Raw schema-only pg_dump                            |

`pnpm schema:verify` proves:

- exact artifact hashes;
- 24 tables and 317 public columns;
- 167 constraints and 93 indexes;
- 20 ENABLE+FORCE RLS tables;
- 19 common tenant policies and the private-message participant exception;
- five SECURITY DEFINER tenant-bootstrap helpers;
- `ptr_clone_app` remains NOBYPASSRLS with exact grants;
- the raw pg_dump function-ordering trap is detected;
- `RECREATE.sql` places those functions safely after their dependent tables.

### Not yet integrated

- Runtime Drizzle uses `sqlite-core`, not PostgreSQL.
- Runtime transactions do not issue `SET LOCAL app.enterprise_id` or `app.member_id`.
- Current identities are not resolved to Postgres enterprise/room memberships.
- The 24-table schema is an exact contract artifact, not the active application repository layer.
- No data migration from local SQLite to Postgres is implemented.

## Evidence and tooling already present

### Primary evidence

- 72 MB Part 1 capture JSON.
- Decoded Part 1 and Part 2 directories.
- Supplied clean navbar, room, alert, modal, message-menu, composer, emoji, and upload fragments.
- Deployed Angular runtime, polyfills, scripts, full stylesheet, and deployed index.
- 51 extracted full component sources plus compiled/render-helper/CSS variants.
- Exact logo, talking GIF, and sound assets.

### Durable contracts and generators

- `src/lib/dump-contract.ts`
- `src/lib/direct-evidence-contract.ts`
- `docs/app-st-message-forensic-contract.md`
- `docs/post-alert-forensic-contract.md`
- `docs/dnd-forensic-contract.md`
- `scripts/build-captured-runtime-styles.mjs`
- `scripts/build-captured-message-fixture.mjs`
- 32 additional forensic/audit scripts

### Extension-injected Jcrop nodes

`fake-image`, `jcrop-holder`, and `chrome-extension://giabb...` pixel/Jcrop assets are preserved as
evidence under `jcrop/`. They are **excluded artifacts**, not ProTradingRoom application behavior,
and correctly do not appear in `src/`.

## Verification state on 2026-07-30

| Command                          | Result                          |
| -------------------------------- | ------------------------------- |
| `pnpm schema:verify`             | **PASS**                        |
| `pnpm test`                      | **PASS** — 23 files, 95 tests   |
| `pnpm check`                     | **PASS** — 0 errors, 0 warnings |
| `pnpm build`                     | **PASS**                        |
| `pnpm capture:direct`            | **PASS**                        |
| `pnpm capture:navbar-source`     | **PASS**                        |
| `pnpm capture:alert-chat-styles` | **PASS**                        |
| `pnpm capture:behaviors`         | **PASS**                        |
| `pnpm capture:styles`            | **PASS**                        |
| `pnpm capture:styles-complete`   | **PASS**                        |
| `pnpm audit:forms`               | **PASS**                        |
| `pnpm capture:dnd-source`        | **FAIL: 2 of 51 assertions**    |

The DND audit failures are audit-maintenance defects:

1. It searches for a previous single-line initialization string; the current equivalent
   initialization is multiline and falls back to the same default.
2. It expects `id="app-donot-disturb"` inside the Settings modal. That field was renamed to
   `settings-app-donot-disturb` to eliminate the duplicate field ID while the volume control retains
   the captured ID. The form audit confirms IDs are now unique.

These two failures should be updated in the source-audit script before making the entire audit
suite a required CI gate.

The production build emits one performance warning:

- main client page chunk: approximately 1.348 MB minified / 276.0 KB gzip;
- main CSS asset: approximately 808 KB / 121 KB gzip.

There is no test coverage percentage, browser E2E suite, or verified current multi-browser run.

## Repository and delivery hygiene

- The workspace contains no `.git` directory, so branch, commit, provenance, and uncommitted-change
  status cannot be reported.
- No GitHub Actions or other CI pipeline is present.
- No Dockerfile/compose deployment, platform manifest, or hosting configuration is present.
- No health/readiness/liveness endpoint is present.
- No structured application logger, tracing, metrics, or error-reporting integration is present.
- No explicit app-layer rate limiter is present.
- The upload credential is configured as `PUBLIC_PTR_CDN_UPLOAD_KEY` and is therefore exposed to
  browser code. That is not an acceptable production secret boundary.

## Mediasoup readiness and exact integration boundary

### Existing pieces mediasoup can reuse

- explicit user gestures for mic/camera/screen acquisition;
- local `MediaStream` lifecycle helpers;
- captured navbar controls and permission/error messages;
- camera, screen-share, recording, talking-user, and preview state slots;
- screen-share end handling;
- device diagnostics and permissions UX;
- connected identity/session hook;
- captured presentation/screen/stream DOM hosts.

### Missing pieces mediasoup must supply

No implementation is present yet for:

- mediasoup client/server packages;
- worker/router lifecycle;
- WebRTC transport creation and DTLS/ICE parameter exchange;
- authenticated room signaling;
- send/receive transport reconnect;
- mic/camera/screen producers;
- remote consumers and media element attachment;
- producer pause/resume/close propagation;
- participant presence and capability changes;
- active-speaker/volume observer events;
- remote talking-user list and talking waveform state;
- remote presenter camera/screen panes;
- server-side cleanup on disconnect;
- simulcast/SVC policy;
- TURN credential strategy;
- recording pipeline, storage, or archive publication;
- cross-client VideoPlayer/YouTube/SoundCloud control;
- integration tests with multiple browser contexts.

### Contract that should not be broken

- Media permission prompts must remain behind explicit user clicks.
- `getUserMedia()` must not run on mount.
- The existing navbar/menus/DOM order are evidence contracts.
- The no-speaker row must only be replaced when an actual active-speaker event exists.
- DND, master volume, subtitle, and media-volume coupling must keep their captured behavior.
- A local media state must not be reported as “For All” until the room signaling path confirms it.

No mediasoup API shape should be invented before the supplied implementation/evidence arrives.

## Prioritized remaining work

### Phase 0 — repository truth and guardrails

1. Keep this inventory current as capabilities change.
2. Fix the two stale DND audit assertions without changing runtime behavior.
3. Add one aggregate verification command covering tests, check, build, and all source audits.
4. Establish Git provenance and CI before large realtime changes.
5. Add browser E2E baselines at evidence viewports for navbar, split layout, messages, modals, poll,
   composer, and theme states.

### Phase 1 — runtime identity, room, and event contracts

1. Integrate the Postgres schema/repositories and tenant transaction context.
2. Resolve connections to enterprise, room, member, role, and `can_*` capabilities.
3. Replace the fallback-staff production path with an explicit development-only mode.
4. Define authenticated, versioned room events with IDs, ordering, deduplication, and reconnect
   semantics.
5. Move messages, alerts, polls, presence, and moderation mutations behind those contracts.

This phase is needed whether the transport is a conventional WebSocket service, mediasoup-related
signaling, or both. The exact transport should follow supplied evidence.

### Phase 2 — mediasoup integration

1. Add the supplied mediasoup packages/configuration and server lifecycle.
2. Wire explicit-click local tracks to send transports/producers.
3. Wire remote consumers to presentation/camera/audio hosts.
4. Drive talking users from a real active-speaker/volume observer.
5. Implement disconnect/reconnect, permission changes, producer cleanup, and device switching.
6. Add two- and three-browser integration tests.
7. Decide recording/archive architecture from supplied requirements; do not equate local
   `MediaRecorder` with room recording.

### Phase 3 — complete evidence-backed product operations

1. Private chat persistence, history, composer, unread state, and realtime delivery.
2. File upload/delete/list lifecycle.
3. Alert Q&A and send reports.
4. Scheduled alerts and archives.
5. Advanced search and alert filtering.
6. User/session moderation commands and capability enforcement.
7. Cross-client VideoPlayer/YouTube/SoundCloud commands.
8. Persist and enforce poll anonymity.
9. Give `dontPush` and “Show message to all” real transport semantics.

### Phase 4 — production hardening

1. Server-side upload credentials/signing.
2. Rate limiting, abuse protection, audit logs, and authorization tests.
3. Health checks, graceful shutdown, structured logs, metrics, traces, and alerts.
4. Deployment/container configuration and rollback procedure.
5. Load, reconnect, network-degradation, and media-failure tests.
6. Bundle splitting and CSS delivery optimization without violating visual evidence contracts.

## Bottom line

The repository has a strong visual/evidence foundation and several real local vertical slices,
especially Notes, message/alert persistence, poll persistence, post-alert composition, scroll
behavior, sounds, and toasts.

The largest remaining body of work is not additional CSS. It is the shared room system:

- tenant-aware identity and capabilities;
- realtime events and presence;
- mediasoup media distribution and active speaker;
- completion of the captured product shells;
- production operations and security.

Those boundaries are now explicit enough to accept the forthcoming mediasoup work without
misclassifying browser-local state as a completed room feature.
