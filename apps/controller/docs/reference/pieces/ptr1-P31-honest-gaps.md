# ptr1-P31 — The complete register of what this dump CANNOT tell you

**Evidence root:** `/tmp/ptr-decode/ptr1/`

---

## Purpose

Rule 3 of the reference-match contract says: *"if something genuinely can't match … call it out as an explicit honest gap rather than quietly leaving a mismatch."* This is that register. Every row states **what is missing**, **why it is missing**, **what it blocks**, and **the specific capture or action that would close it**.

Two prior-pass gap claims were **re-tested this pass and found to be WRONG**. They are corrected in §0 and removed from the register. Do not carry them forward.

---

## §0 — Corrections: two claimed gaps that are NOT gaps

### ❌→✅ C1 — "FontAwesome glyph codepoints are unrecoverable (`::before` `content` captured as an empty escaped string)"

**This is false.** The codepoints **are** in the dump. Parsing every `::before`/`::after` JSON object across all 23 captures (493 objects, **0 parse failures**) yields the real Private-Use-Area characters. Top of the distribution:

| count | `content` | glyph |
|---|---|---|
| 94 | `""` | `fa-mobile` |
| 48 | `""` | `fa-user` |
| 25 | `" "` | Bootstrap clearfix `:before/:after` |
| 24 | `""` | `fa-comment-o` |
| 24 | `""` | `fa-caret-right` |
| 22 | `""` | `fa-user-times` |
| 21 | `""` | `fa-hdd-o` |
| 19 | `""` | `fa-trash` |
| 18 | `""` | `fa-lock` |
| 18 | `""` | `fa-bell-o` |
| … | 47 further distinct codepoints, each 1–16× | |

**57 distinct `content` values in total**, of which 56 are single PUA codepoints and one is the literal `" "`. They *look* empty in a terminal because U+F0xx renders as nothing without the FontAwesome font loaded — that is a display artifact of reading the slice, not a capture gap.

The codepoints are also directly recoverable from `01-stylesheets/10.css` (593 `.fa-*::before { content: "…"; }` rules), e.g. `fa-user`→`0xf007`, `fa-mobile`→`0xf10b`, `fa-bell-o`→`0xf0a2`, `fa-shield`→`0xf132`, `fa-certificate`→`0xf0a3`, `fa-sliders`→`0xf1de`, `fa-caret-right`→`0xf0da`, `fa-hdd-o`→`0xf0a0`, `fa-user-md`→`0xf0f0`, `fa-credit-card`→`0xf09d`.

Also captured per pseudo-element: `color`, `font-family`, `font-size`, `background-color`. The 13 distinct combinations:

| count | font-family | color | font-size |
|---|---|---|---|
| 376 | FontAwesome | `rgb(51, 51, 51)` | 13px |
| 28 | FontAwesome | `rgb(51, 51, 51)` | 14px |
| 24 | Helvetica stack | `rgb(51, 51, 51)` | 14px |
| 20 | FontAwesome | `rgb(255, 255, 255)` | 14px |
| 20 | FontAwesome | `rgb(51, 51, 51)` | 11px |
| 9 | FontAwesome | `rgb(255, 0, 0)` | 14px |
| 6 | FontAwesome | `rgb(51, 51, 51)` | 28px |
| 4 | FontAwesome | `rgb(51, 51, 51)` | 12px |
| 2 | FontAwesome | `rgb(119, 119, 119)` | 16px |
| 1 each | FontAwesome ×3 (`rgb(255,255,255)`/12px, `rgb(255,255,255)`/28px, `rgb(51,122,183)`/14px), Helvetica (`rgb(85,85,85)`/14px) | | |

**Every one has `background-color: rgba(0, 0, 0, 0)`.**

> **The genuine, much smaller gap that remains** is only this: the **font binary itself** (`../fonts/fontawesome-webfont.woff2?v=4.3.0`) is not in the dump, so the exact vector outlines are not reproducible from the dump alone. That is trivially closed — install `font-awesome@4.3.0`. Moved to row **G12** below with the correct scope.

### ❌→✅ C2 — the truncated-record list was wrong

Re-measured this pass by JSON-unescaping every `attr` value and every `text:` value in all 23 captures and testing against the harness limits (attrs 300 chars, text 250 chars).

**The complete, exact truncation set is 7 fields on 6 records:**

| record | field | raw length |
|---|---|---|
| `#0` `r` `<body>` | `attr ng-class` | **300** (truncated mid-expression at `'in-app': !$state.includes`) |
| `#3` `r.2` `<script>` | `text` | **250** |
| `#12` `r.11` `<script>` | `text` | **250** |
| `#49` `r.0.1.1.0.0.0.3` `<a>` | `attr ng-href` | **300** (JWT cut mid-signature) |
| `#49` (same node) | `attr href` | **300** (same JWT) |
| `#975` `r.0.1.1.0.1.3.1.5.0.0.134.3` `<label class="muted">` | `text` | **250** (the Subscription-Plans JSON example) |
| `#1062` `r.0.1.1.0.1.3.1.5.0.0.163.3` `<label>` | `text` | **250** (the Chat-Tabs-With-Badges JSON example) |

**`#162` is NOT truncated** — its `text` is 245 raw chars (251 escaped). The prior pass counted the escaped length. Likewise **`#903` (248), `#1321` (246), `#1326` (240) are NOT truncated.** Their apparent length came from `\n` and `\"` escapes.

---

## §1 — The gap register

| id | what is missing | why | what it blocks | what would close it |
|---|---|---|---|---|
| **G1** | **`01-stylesheets/03.css` — `https://vjs.zencdn.net/7.3.0/video-js.min.css`** | CORS-blocked. `00-META.txt:65` declares `ruleCount=0 bytes=12`; the file body is the literal string `CORS-BLOCKED` (`03.css:2`). | All Video.js player chrome geometry, colours, control-bar sizing, big-play-button, poster, progress bar. **Impact on *this* page: none** — no `.video-js` / `.vjs-*` node exists in any of the 23 captures. It only matters if the room view is rebuilt. | Re-capture with the sheet proxied same-origin, or `curl https://vjs.zencdn.net/7.3.0/video-js.min.css`. Note the app *does* ship two local overrides for it: `00.css` (`.video-js { width:300px; height:150px; } .vjs-fluid { padding-top:56.25%; }`) and `13.css` (4 `.vjs-youtube` rules). |
| **G2** | **`01-stylesheets/07.css` — `https://cdnjs.cloudflare.com/ajax/libs/angularjs-toaster/2.2.0/toaster.min.css`** | CORS-blocked. `00-META.txt:69` declares `ruleCount=0 bytes=12`; body is `CORS-BLOCKED` (`07.css:2`). | **Toast geometry is unknown** — width, padding, border-radius, shadow, icon, close button, stacking, animation. The app *does* override the colours locally (`09.css:399-405`: `body #toast-container { top: 55px !important; }`, `body .toast { background-color: rgb(29,31,33); }`, `.toast-success rgb(76,175,80)`, `.toast-error rgb(243,66,53)`, `.toast-info rgb(32,149,242)`, `.toast-wait rgb(102,57,182)`, `.toast-warning rgb(254,151,0)`) — so the **palette is known and the box model is not**. | Fetch the sheet, or capture a live toast (trigger any `saveSessField` save). |
| **G3** | **No screenshot anywhere in the dump.** | The harness captured DOM + CSSOM only. `02-MANIFEST.txt` lists per-capture `INFO/DEFAULTS/nodes/IDENTICAL/REMOVED` — no image artifact. | **Rule 3's bar cannot be met from this dump.** Everything asserted about the rendered page is derived from `getBoundingClientRect` + `getComputedStyle`, which is authoritative for *layout and colour* but is not a pixel diff. Text anti-aliasing, font fallback, sub-pixel rounding, image content, and anything painted by a canvas/plugin are invisible. | A real screenshot at `1842×1265` dpr=2, same UA, same session, diffed against the built page. **This is the single highest-value missing artifact.** |
| **G4** | **7 truncated fields** (§0/C2). Most consequentially: the **JWT signature** on `#49`, cut at exactly 300 chars ending `…AqpORjtpJqPb-q`. | Harness caps: attrs 300, text 250. | The full `href` of the **Launch** button. The full `<body>` `ng-class` map. The two inline `<script>` bodies (which set `__h264`, `__isReg`, `__cver`, and do UA sniffing — the tail of each is unknown). The tail of two Settings help texts. | Raise the caps and re-capture. (The JWT is a live credential — treat it as secret, not as data to reproduce.) |
| **G5** | **The Badges submenu `<ul>` has zero captured `<li>`.** | `#1819 r.0.1.1.0.1.3.1.0.0.3.1.0.4.0.1.3.1 <ul class="dropdown-menu">` (and its row-1/row-2 twins `#1834`, `#1849`) have **no children in the dump** — programmatically verified: enumerating children of that path returns `NO CHILDREN CAPTURED`. Captures `08`, `13`, `18` are each **exactly 1 node** (`caps/08-…/INFO.txt:5` `node count : 1`) — the empty `<ul class="dropdown-menu show" style="display: block;">`. | The entire Badges action list: item count, labels, handlers, icons, dividers. Almost certainly `ng-repeat`ed over a badge collection that is empty because `sess.enableBadges` renders `"No"` (`#913`) and `sess.enableTokenBadges` renders `"No"` (`#917`). | Enable badges on a room and re-capture with the submenu open. Cross-check against `updateManyUsersBadgePrompt('add'\|'remove')` (`#1537`/`#1538`), which is the *bulk* badge path and IS captured. |
| **G6** | **No `.modal-backdrop` element.** | `grep -rc 'modal-backdrop' caps/` → **0 hits across all 23 captures**. The rule exists (`02.css:1378-1380`: `.modal-backdrop { position: fixed; inset: 0px; z-index: 1040; background-color: rgb(0,0,0); }`, `.fade{opacity:0}`, `.in{opacity:0.5}`) but Bootstrap only injects the element on a real `.modal('show')`. The harness forced the modal open by setting `class="modal fade show"` + `style="display:block; visibility:visible;"` — which does not create a backdrop. | The dimmed-page state behind the modal. Known from CSS to be `rgba(0,0,0,0.5)` full-viewport at `z-index:1040`, but **not observed**. | Click a real `Adjust Mic/Cam/Screen/Chat/Notes` menu item and re-capture. |
| **G7** | **The modal was captured mid-transition — its geometry is the PRE-animation position, not the settled one.** | `caps/01-modal_permissionsModal/nodes-000.txt`: `#0` has `opacity: 0` and `transition-property: opacity / transition-duration: 0.15s`; `#1 .modal-dialog` has `transform: matrix(1, 0, 0, 1, 0, -82.1777)` and `transition-property: transform / duration: 0.3s`. Bootstrap needs the `.in` class for `.modal.in{opacity:1}` and `.modal.in .modal-dialog{transform:translate(0,0)}` (`02.css:1373-1374`) — the harness added `.show`, **not** `.in`. So the dialog is frozen at `translateY(-25%)`. | Every `y` in capture 01 is **82.178px too high** and every opacity is 0. Reported rects: `#1 .modal-dialog` `x=621 y=-52.2 w=600 h=328.7`; `#2 .modal-content` same; `#3 .modal-header` `642 -31.2 558 56.7`; `#4 .modal-body` `642 25.5 558 165`; `#5 .modal-footer` `642 190.5 558 65`. | **Derivable correction (do this, don't guess):** the settled position is `y_captured + 82.1777`. `.modal-dialog` settles at `x=621 y=30 w=600 h=328.711` — consistent with `margin: 30px auto` at `width: 600px` (`02.css:1391 @media (min-width:768px){.modal-dialog{width:600px;margin:30px auto}}`) and `(1842-600)/2 = 621`. Header `y=51`, body `y=107.7`, footer `y=272.7`. Confidence high but **derived, not observed** — a real click-then-capture would confirm. |
| **G8** | **Modal checkbox checked-states were never recorded.** | The five `<input type="checkbox">` (`#149`–`#153` / cap01 `#17`–`#21`) carry `class="ng-pristine ng-untouched ng-valid"` and **no `checked` attribute** — but `checked` is a DOM *property*, not reflected as an attribute unless set in markup. Also `setPermissions(user)` was never invoked, so `userPermissions` was never populated (the modal title's `<i class="ng-binding">` at `#148` renders **empty**). | Whether any permission renders as checked, and the checked-state visual. `appearance: auto` appears 17× in the deviation table (native checkbox rendering), and each input is `13×13` at dpr 2. | Click a user's `Adjust Mic/Cam/Screen/Chat/Notes`, then capture. |
| **G9** | **No hover / focus / active / `:visited` / `:disabled`-pseudo state anywhere.** | `getComputedStyle` returns the resting state only; the harness never forced a pseudo-class. All 2,156 baseline nodes are resting-state. | Every interactive affordance's feedback: `.btn:hover`, `.dropdown-menu > li > a:hover`, `a.editable-click:hover`, `.nav-tabs > li > a:hover`, focus rings, `:active` depression. **This is a large, systematic hole** — the page is a dense admin UI whose primary interaction is hover-driven menus. Note `outline-style: none` is COMMON on 2156/2156 nodes (`DEFAULTS.txt:84`), so no focus ring is present at rest, which says nothing about `:focus`. | A capture pass that forces `:hover`/`:focus` via CDP `forcePseudoState` on each interactive node, or reads the matched rules from the CSSOM rather than only computed values. The rules themselves *are* in `02.css`/`09.css` and can be read statically — so this gap is closable by CSS reading, at the cost of having to simulate specificity by hand. |
| **G10** | **`#1550` — the row-0 avatar `<img>` has no `src`.** | `#1550 r.0.1.1.0.1.3.1.0.0.3.1.0.1.11 <img gravatar-src-once="user.email " style="margin-right:5px " class="thumb24 ">` — **no `src` attribute**, while its twins `#1582` (`https://secure.gravatar.com/avatar/[GRAVATAR_MD5_A]?size=80&default=mm`) and `#1614` (`…/[GRAVATAR_MD5_B]?…`) both resolved. The Owner row's name/email cell (`#1316`) is empty. | What the Owner row's avatar actually paints — broken-image glyph, alt text, or nothing. The box is reserved (`rect: 104.3 558 24 24`). | A capture where the Owner row has an email, or a screenshot (G3). |
| **G11** | **`ng-if="!checkedAllUsers"` — the `checkedAllUsers === true` branch never existed in the DOM.** | `#1296 <span ng-if="!checkedAllUsers" class="ng-scope">Select All</span>` is present. Angular's `ng-if` *removes* the alternate branch from the DOM entirely, and there is no `ng-if="checkedAllUsers"` sibling in the dump. | The label shown after Select-All is clicked (probably "Deselect All", but that is a guess and is **not asserted**). | Click Select All, then re-capture. |
| **G12** | **No font binaries.** | The dump records `@font-face` *declarations* (`10.css:2` FontAwesome 4.3.0 woff2/woff/ttf; `11.css` Feather webfont; plus the Helvetica system stack) but not the files. | Exact glyph outlines and metrics. **Low risk** — versions are pinned in the URLs (`?v=4.3.0`), so `pnpm add font-awesome@4.3.0` reproduces them byte-for-byte. Helvetica Neue is a system font and **will render differently on a non-macOS build machine** — that is a real screenshot-diff hazard. | Install `font-awesome@4.3.0`; run any pixel diff on macOS, or pin a webfont and accept the deviation as a documented gap. |
| **G13** | **No dynamic behaviour observable at all.** | All 23 captures span **3.414 seconds** of a quiescent page (see P32). No route change, no XHR, no socket message, no timer tick, no animation frame. `final-room` is 2156/2156 identical to `baseline-room`. | Every transition: tab switching (only `Users` is `active`), dropdown open/close animation, xeditable popover open/edit/save/cancel, toast appearance, the loading spinner (`#40 ng-show="dataLoading"`, hidden), the stats spinner (`#143`), the `TOUCH`/`donttouchShow` reveal (`#190`, hidden), the `showAdServer` reveal (`#1247`, `#1405`, hidden), textAngular's html/rich toggle (`#1332`/`#1333`). | An interaction-trace capture: click each tab, open each xeditable, trigger a save. |
| **G14** | **Five of six tab panes are unrendered** — their entire subtrees have `rect = 0 0 0 0`. | Only `#97 r.0.1.1.0.1.3.1.0` (Users) has `class="tab-pane ng-scope active"` and a real rect (`37 361 1768 393.8`). Panes `#98`–`#102` are `class="tab-pane ng-scope"` with `rect 0 0 0 0`, as is every descendant. Measured per pane (nodes / nodes with a non-zero rect): **Users 628 / 82** · **Text List 5 / 0** · **Branding 89 / 0** · **SSO Setup 7 / 0** · **User Stats 60 / 0** · **Settings 1201 / 0**. Across the whole baseline, **1,993 of 2,156 nodes (92.4%) have `rect 0 0 0 0`**; only **163** carry real geometry. | **Every layout number for the Branding, User Stats and Settings tabs — 1,362 nodes' worth.** Their DOM, attributes, text and computed *non-geometric* styles ARE captured in full — but x/y/w/h are all zero, so nothing about their spacing, column widths, row heights or wrapping can be verified. **This is the largest quantitative hole in the dump.** (The 546 zero-rect nodes inside the *active* Users pane are legitimately zero — they are the closed dropdown menus, `display: none`.) | Capture once per tab with that tab active (5 more full-DOM captures). |
| **G15** | **Two tabs and many settings rows are `ng-hide`-gated off and were never rendered.** | `#92` Text List (`ng-show="sess.twillioApiToken"`, empty), `#94` SSO Setup (`ng-show="sess.authMode=='sso'"`, actual mode is `open`). Also all `authMode=='jwt'`/`'registrationA'`/`'registrationM'`/`'webinarRoom'`/`'unamePW'` conditional rows, `sess.hasAppPairLink` rows, `sess.hasProfanityFilter` rows, Clone/Delete/Marketplace buttons. | Their rendered appearance. Their markup IS captured (the `ng-hide` class is added, the nodes exist). | Captures at other `authMode` values and with those flags on. |
| **G16** | **Empty collections: `statXrefs`, `statXrefsMontly`, `completeUserList` length.** | `#142 ng-hide="statXrefs.length>0 \|\| statXrefsMontly.length>0"` is **visible** → both arrays empty. `#185 <tbody>` and `#222 <tbody>` are both childless. `#202 ng-if="completeUserList && completeUserList.length>0"` is present → length > 0, exact value unknown. | The entire User-Stats table body and monthly-report table body — row markup, cell contents, striping, sort affordances. Only the 5 `<th>` are known (`#488`–`#492`: `#`, `Nick`, `Email / IP`, `Time Stamps`, `Duration (Hours)`). | Load stats for a date range with data. |
| **G17** | **Only 3 roster rows, one of each role-ish state.** | `xrefs.length === 3`: row 0 Owner (`role==0`), row 1 Participant/`login`, row 2 Admin/`manual` + `PW set`. | Rendering for `role==1 && !nonPresenter` (Presenter), `role==3` (CHAT MUTED), `role==4` (BANNED), `inviteStatus=='pending'` (the APPROVE button), `isFreeTrial` (TRIAL badge), `hideUserCount`/`hidePersInfo` badges, `inactive`, `restrictPMUser`, `note`, `discordUserId`, `phone`, `mobilePairCode`. All exist as `ng-hide` markup; none was ever painted. | A room with users in each state. |
| **G18** | **No interpolated expression is recoverable.** | AngularJS `{{…}}` lives in text nodes; the dump keeps the *rendered* text and the `ng-binding` class, not the expression. 100+ elements carry `ng-binding` with no attribute to read. | Field names behind: the role-source suffix (`#1567` → `/ login`, `/ manual`), Discord username (`#1551`), phone (`#1555`), note body (`#1561`), monthly totals (`#220`/`#221`), webinar-time echo (`#193`), modal username (`#148`), room-title interpolation (`#46` `Manage Room id: 3625  ( 6a628a99731b9f77ae9bf505 )` — note the double space where a value was inserted), user-count (`#47` `Current : 0 / Max  0`), Wordpress shortcode (`#504`). | The un-minified template partial, or `/public/dist/app.min.js`'s `$templateCache`. |
| **G19** | **Sibling `<p class="form-control-static">` wrappers with no captured children.** | The Settings container `r.0.1.1.0.1.3.1.5.0.0` has children `0..225` **complete, no gaps** (verified programmatically). But **8 of those wrappers have zero captured children**: indices `3, 62, 63, 65, 66, 193, 204, 218`. The "DON'T TOUCH" container `r.0.1.1.0.1.3.1.5.0.4.0` has children `0..61` complete, with **12 childless**: `5, 8, 10, 17, 20, 21, 24, 29, 30, 40, 41, 49`. | 20 settings rows whose inner label/binding was not emitted. Some are structural (`hr`, `br`), but `#227 r…5.0.0.3 <p>` with **no attributes at all** and `#1233 r…5.0.4.0.5 <p>` are suspicious voids. **This is the one place where "the container exists but its content did not survive" is true.** | Re-capture with the Settings tab active (which also fixes G14). |
| **G20** | **No Intercom CSS, and no Intercom element.** | `09.css:1251` and `:2521` contain `.intercom-composer-popover { right: 10px !important; }` — an override for a widget whose own stylesheet is **not** among the 15 sheets, and whose DOM is **not** among the 2,156 nodes (`grep -ric 'intercom' caps/` → 0). | Nothing on this page — the widget is absent. Recorded so a rebuild does not chase a phantom. If Intercom loads for other roles/routes, its chrome is entirely unknown. | Capture as a role/route where Intercom initialises. |
| **G21** | **reCAPTCHA subtree is present but inert.** | `#13 r.12` and `#16`–`#19`, `#23` — the invisible-reCAPTCHA bubble at `y=-10000`, `opacity:0`, `visibility:hidden`, `z-index:2000000000`, plus an `<iframe>` at `1 -9984 0 0` with a live `bframe` URL. Third-party, off-screen. | Nothing visually. It does contribute 6 nodes to the 2,156 count and one live sitekey (`6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx`). | — (no action needed; exclude from any node-count comparison). |
| **G22** | **No `<head>`, no `<html>`, no document metadata.** | The dump's root is `r = <body>` (`#0 path=r <body>`). | `<title>`, `<meta>`, favicon (`sess.customFaviconURL` is a setting), `lang`, the `<link>` order that produced the sheet indices. Sheet order IS recoverable from `00-META.txt:62-76`. | A capture that includes `document.documentElement`. |
| **G23** | **No network, console, or storage state.** | Not captured by this harness. | Request/response bodies for `saveSessField`, `loadUsers`, `updateUser`; console errors (e.g. the broken-image request from G10, the invalid CSS from P30/B2); the socket transport (SockJS is loaded, `#9`). `meta.errors` is `[]` (`00-META.txt:10`), which records only *harness* errors, **not page errors** — do not read it as "the page had no errors". | A capture pass with `read_network_requests` / `read_console_messages`. |
| **G24** | **Style deviations are relative to a COMMON table, and 6 nodes have `visibility` other than `visible`.** | `DEFAULTS.txt:7` shows `visibility \| visible \| 2150/2156 \| 2` — so 6 nodes are `hidden`, and `pointer-events: auto \| 2154/2156` → 2 nodes differ, `resize: none \| 2154/2156` → 2 differ, `max-height: none \| 2154/2156` → 2 differ. The reconstruction rule ("node style = COMMON overridden by deviations") is stated at `DEFAULTS.txt:3` and is lossless — **this is not a gap**, but it means any tooling that reads only the node records without applying COMMON will silently get 100 properties wrong per node. | — | Noted as a consumption hazard, not a capture gap. |

---

## §2 — What is NOT a gap (so nobody re-opens it)

| claim | status |
|---|---|
| FontAwesome codepoints | **Recoverable** — 57 distinct `content` values parsed, 0 failures (§0/C1). |
| `#162`, `#903`, `#1321`, `#1326` truncated | **False** — raw lengths 245, 248, 246, 240 (§0/C2). |
| Settings sibling indices missing | **False at the wrapper level** — `0..225` and `0..61` are both complete. The real issue is 20 *childless* wrappers (**G19**). |
| `cssVars` empty means the harness failed to read them | **False** — `getComputedStyle` on `:root`/`body` genuinely returns no custom properties because the cascade declares none (`grep -oE '(^\|[;{ ])--[a-zA-Z]' 01-stylesheets/*.css` → 0). See P27. |
| `final-room` being identical means the capture was broken | **False** — independently verified: 2156/2156 paths present in `21/IDENTICAL-TO-BASELINE.txt`, 0 removed, and `DEFAULTS.txt` byte-identical except the label line. See P32. |
| `meta.errors: []` proves the page is error-free | **False** — it records harness errors only (**G23**). |

---

## §3 — What a rebuild must do about this

1. **Do not fake anything in G14/G16/G17.** The Branding / User Stats / Settings tabs have **no captured geometry**. Build them from the DOM + non-geometric computed styles, then mark them **honest-pending** until a per-tab capture exists. Do **not** invent spacing to make a screenshot look complete.
2. **Apply the G7 correction arithmetically, not by guessing.** Modal settles at `.modal-dialog` `x=621 y=30 w=600 h=328.711`; add `+82.1777` to every `y` in capture 01.
3. **Recover the toast palette from `09.css:399-405` and mark the box model honest-pending** (G2) until `toaster.min.css` is fetched.
4. **Pin `font-awesome@4.3.0`** (G12) and run pixel diffs on macOS, or document the Helvetica Neue substitution as a known deviation.
5. **Treat the JWT in `#49` as a secret**, not as data. It is truncated anyway (G4).
6. **Order of work to close the most gaps fastest:** (a) one screenshot → closes G3 and de-risks everything; (b) five per-tab full-DOM captures → closes G14 and G19; (c) one real modal-open capture → closes G6, G7, G8; (d) fetch the two CORS sheets → closes G1, G2.

---

## §4 — Coverage statement for this pass (what I actually read)

| artifact | coverage |
|---|---|
| `00-META.txt`, `02-MANIFEST.txt` | read in full, line by line |
| `01-stylesheets/00,01,03,05,07,13,14.css` | read in full (all ≤ 48 lines) |
| `01-stylesheets/02,04,06,08,09,10,11,12.css` | read by exhaustive targeted extraction: every `.dark`/`.light`/`theme`/`var(--)`/`--prop`/`prefers-color-scheme`/`body`/`.modal*`/`.fa-*::before`/`@font-face`/`intercom` selector, plus a full duplicate-block analysis of `09.css` (2,573 lines fingerprinted) and a full `fa-*` class cross-check of `10.css` (593 rules). **Not** read glyph-by-glyph end-to-end. |
| `caps/00-baseline-room/nodes-000..017.txt` | **all 2,156 records read** — via a lossless per-record projection (`#id path tag ¦ rect ¦ every attr ¦ text ¦ ::before/::after`), plus the 537 distinct `style-deviation` values read in full, plus the 100-row `DEFAULTS.txt`. 249 records that are byte-identical `<p class="form-control-static">` wrappers with rect `0 0 0 0` were read as a verified equivalence class rather than 249 times. |
| `caps/01-…` … `caps/18-…` | **all 18 captures, all 935 records, read in full** |
| `caps/19,20,21` | INFO, DEFAULTS, nodes, IDENTICAL, REMOVED — all read in full and independently re-verified |
| the five prior part-reports | used only as leads; **every claim re-verified against the raw slices**, and two were found wrong (§0) |
