# ptr1.json — master decode

**Source:** `evidence-dumps/NEXT-STEP/ptr1.json` (23,539,370 bytes)
**Captured:** 2026-07-24T15:59:18.276Z → 15:59:21.690Z (3.414 s window)
**URL:** `https://protradingroom.com/ptrApp#/page/manageSession/6a628a99731b9f77ae9bf505`
**Role:** member · **Viewport:** 1842×1265 @dpr2 · **UA:** Android 15 / Pixel 9 mobile Chrome · **errors:** `[]`
**Decoded slices:** `/tmp/ptr-decode/ptr1/` — 108 files, 45,676 lines, produced by `scripts/decode-ptr-dump.mjs`

Five agents read disjoint slices, each in its own context, none delegating. Their parts are appended
below in full and are the evidence of record. This preamble covers only what no single part could
settle: the cross-slice reconciliation.

---

## 1. What this page is

The **Manage Room** admin page for room **3625** (`_id 6a628a99731b9f77ae9bf505`), title `sess.name`
= "Room 3625". The sibling dump `prt2.json` (account settings) lists this exact room in its Sessions
table — the two captures are the same room seen from both ends, and the ObjectId matches on both sides.

Shell: `<body class="footer-hidden">` → `div.app-container` (`ng-controller="CoreController"`) → two
`ui-view` regions, a 1842×50 black navbar and a 1842×772.8 content area → one Bootstrap-3
`.panel.panel-default`. The navbar is byte-identical in role and structure to prt2's, so it is the app
shell rather than page furniture.

The content is a **6-tab `uib-tabset`**: Users (active) · Text List (hidden, needs
`sess.twillioApiToken`) · Branding · SSO Setup (hidden, needs `authMode=='sso'`) · User Stats ·
Settings. **Only the Users pane paints.** Everything else in the capture — including the entire
181-field settings form — is a hidden tab.

**Size reality check:** 2,156 nodes, of which roughly **157 render**. Per slice: ~102 of 720 paint
(#0–719), 29 of 720 (#720–1439), 26 of 716 (#1440–2155). A rebuild is implementing ~157 boxes, not 2,156.

## 2. Node ordering — read this before using any part

The node array is **breadth-first by DOM depth**, not document order. Two agents established this
independently: depth rises monotonically from 13 at #1440 to 20 at #2155, and the 13→14 segment
boundary falls exactly at #1289/#1290. **Reconstruct by `path`, never by `#index`** — a node's children
appear hundreds of records later, in another agent's slice. My original "top / middle / tail" framing of
the three baseline ranges was wrong and is corrected here.

Consequence: the three baseline parts are depth bands cutting across every region at once, not page
sections. Components are truncated at band boundaries by construction; each part says where.

## 3. Cross-slice questions the parts could not close (resolved here)

**Q1 — Does any element actually carry `class="dark"` or `class="light"`?**
Part 5 found the `.dark` rules and correctly refused to guess whether anything uses them, since it did
not own the node files. Resolved by grepping every `attr class` line across all 18 baseline node files:
**zero matches.** No element on this page carries a `dark` or `light` class. The `.dark` rules at
`09.css:1195–1201` are dead on this capture.

**Q2 — Which controls open the two unattributed dropdowns?**
Part 4 could not prove this because subtree captures are re-rooted at `path=r`, discarding their
location. Resolved by locating the menus in the baseline tree:

| Menu | Menu node in baseline | Trigger | Trigger text |
|---|---|---|---|
| M1 user-list filter / bulk-remove | `#457` `div.dropdown` at `r.0.1.1.0.1.3.1.0.0.0.0.3` | `#1293` `button.btn.btn-md.dropdown-toggle.btn-primary.mt` | **"User List Actions"** |
| M2 bulk apply-to-many | `#465` `ul.dropdown-menu` at `r.0.1.1.0.1.3.1.0.0.2.1.2` | `#463` `button.btn.dropdown-toggle.btn-primary` | **"Actions With Selected"** |

## 4. Theme verdict — one palette, definitively

Converging evidence from three independent directions:

- `cssVars` is `{"root":{},"body":{}}` for all 21 DOM captures.
- `var(--` occurs **0 times** across all 15 stylesheets — the app has no CSS custom properties.
- `darkTheme` / `lightTheme` occur **0 times** in the stylesheets; the forced body classes match nothing.
- Forcing dark (cap 19) and light (cap 20) each changed **exactly 1 node of 2,156** — the `<body>`
  class attribute — with no style or rect change on any node.
- `.light { }` is an empty rule (`09.css:1196`), and per Q1 above nothing carries `.dark` either.

**A rebuild needs one palette.** The sibling prt2 dump reached the same conclusion from the account
page; this page is where the scoped chat/room `.dark` rules live, so it is the strongest possible place
to test the claim, and it holds.

## 5. Quiescence

`final-room` vs `baseline-room`: **2,156 of 2,156 nodes identical, 0 differing, 0 removed** —
independently recounted by part 5 after the decoder's pseudo-element comparison bug was fixed. Nothing
changed across the 3.414 s window: no socket message, no animation frame, no reflow.

Two readings, both true: the baseline is a clean, quiescent screenshot-diff target — **and** the dump
contains no evidence whatsoever of the app's dynamic behaviour. Live chat, alerts, video, and presence
are unobservable here. That is an honest gap no amount of re-reading fixes.

## 6. Interaction surface (from the 18 subtree captures)

Five distinct menus and one modal, deduplicated from 18 captures:

| ID | Menu | Substance |
|---|---|---|
| M1 | User List Actions | 6 filters + 3 destructive removes |
| M2 | Actions With Selected | 9 role/state ops via `updateManyUsers(n)` |
| M3 | Per-user row menu | 4 submenu parents + Set Note / Edit Username / Remove User / Set Password / Resend Welcome / Pause |
| M3.a | Permissions | Presenter / Admin / Participant / Trial / Mute / Ban / Unban / Freshen Login |
| M3.b | Granular Perms | Mic·Cam·Screen·Chat·Notes → `#permissionsModal`, gated `user.role !== 1`; user-count, archives, PII, PM toggles |
| M3.c | App & Notifications | App PIN · App Tokens · FCM Tokens · pause/resume/remove/test/reset notifs |
| M3.d | Badges | **empty — 0 items** |
| D1 | `#permissionsModal` | 600px dialog, z-1050, 5 checkboxes → `userPermissions.*`, Close + Save |

The `(128, 28, 30, 31, 1)` capture group repeats three times because there are **three `ng-repeat` user
rows**, not three components. Proof: in group 3 the Mic/Cam/Screen item carries `ng-hide` +
`display:none` because that row's user has `role === 1` (Presenter); item counts run 42/42/**41**; row
geometry matches at 62.4px pitch. **One menu component, rendered per row.**

`updateUser` opcode map, recovered from the bindings: 1 Presenter · 2 Participant/Unban · 3 Mute ·
4 Ban · 5 Admin · 6 Trial · 7/8 hide/show user count · 9 freshen login · 10/11 personal data ·
13/14 archives. Opcode 12 unused.

## 7. Traps that would produce a wrong rebuild

1. **`.muted` is a dead class.** Helper labels compute `color: rgb(51,51,51)` — identical to body text.
   Rendering them grey does not match.
2. **`badge-danger` is inert.** "Free Trials" computes `rgb(119,119,119)`, plain grey, not red.
3. **`styles.css` ships twice, concatenated** (lines 2–1272 and 1273–2574) and **copy B wins**:
   `.thumb20` does not exist, `.thumb16` has no `margin-right`, and the 32 real room rules
   (`.roomArea`, `.alertsChatArea`, `.webcamScreenVideo`, `#permissionsModal`, badge/chat-tab) exist
   **only** at `09.css:2543–2574`.
4. **`14.css:2` `body{overflow:auto}`** is the last sheet and silently overrides `09.css:95`
   `body{overflow:hidden}`.
5. **No flexbox, no CSS grid, no custom properties** — every flex/grid property has exactly one
   distinct value across all 2,156 nodes. Layout is pure float-and-table Bootstrap 3.
6. **Only 15 of 181 settings fields are set.** Unset x-editables render the literal italic word
   "empty"; that is real UI copy, not a placeholder to invent around.

## 8. Upstream bugs in the reference (recorded, not fixed)

| Where | Bug |
|---|---|
| `#550` | binds `sess.login_webhook_url` but saves `logout_webhook_url` |
| `#22` | `background-color: 0A0A0A` — invalid, missing `#` |
| M2 | `updateManyUsers(2)` bound to both "UNBAN Participant" and "Make Participant" |
| row menu | `class="fa fa-reload"` — not a FontAwesome 4 class, renders blank |
| row menu | `class="fa fa fa-bell-o"` — duplicate `fa` |
| settings | `e-title="Alr RoomJS:"` typo; `e-label="Nick   Filter:"` triple space; `#648` copy-pasted `e-title` |

## 9. Sensitive data in this capture

- **Live HS256 JWT** on the "Launch" link (`#49`), payload naming [OWNER_JWT_NAME], the email, user
  ObjectId `[OWNER_USER_ID]`, `exp` 1815944082. **The same token appears in prt2.json.**
- **Real member PII** in the users table: `[OWNER_NAME] / [MEMBER_A_EMAIL]` (last login
  [MEMBER_A_LAST_LOGIN]) and `[OWNER_SHORT_NAME] / [OWNER_EMAIL]`; two live gravatar MD5 hashes.
- Google reCAPTCHA site key `6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx`.
- **Clean:** all 31 secret-bearing settings fields (apiSecret, S3, Vimeo, Twilio, Imgur, OBS, Stripe,
  Slack, clusterIDs) read "empty". No secret leaked.

None of this may be hard-coded into the rebuild.

## 10. Honest gaps — the whole list

1. **Sheets 03 (video-js 7.3.0) and 07 (angularjs-toaster 2.2.0) are CORS-blocked.** All Video.js
   player chrome and all toast geometry are unknown and cannot be matched from this dump.
2. **No screenshot ships in ptr1.json.** A pixel-perfect claim cannot be closed from this file alone —
   it needs a real render diffed against a real screenshot.
3. **The capture truncates attributes at 300 chars and text at 250** — `#0`, `#49`, `#3`, `#12`, `#162`
   are incomplete in the evidence, including the JWT signature.
4. **FontAwesome glyph codepoints are unrecoverable** — the capture writes `::before` `content` as an
   empty escaped string. Icons are identified by class name only.
5. **No dynamic behaviour observable** (see §5) — no live chat, alerts, video, or presence.
6. **The Badges submenu `<ul>` has no captured `<li>` children.** Whether it is genuinely empty or a
   capture failure is undetermined; do not invent items.
7. **No `.modal-backdrop` captured**; the permissions modal was caught mid-transition (`opacity:0`,
   `translateY(-82.18px)`), so its resting position is inferred from CSS, not measured.
8. **Modal checkbox checked-states not recorded**; the username binding renders empty (w=0).
9. **No hover, focus, or active states** anywhere in the dump.
10. Missing sibling group indices in the settings form (62/63/65/66/193/204/218 and
    5/8/10/17/20/21/24/29/30); settings rows 40/41/49 have no captured children; row-0 avatar `#1550`
    has no `src`.
11. **Intercom's CSS is absent** (lives in an iframe).

---

## Coverage

| Part | Slice | Lines read | File |
|---|---|---|---|
| 1 | baseline #0–719 | 9,568 | `ptr1-parts/01-baseline-000-719.md` |
| 2 | baseline #720–1439 | 10,458 | `ptr1-parts/02-baseline-720-1439.md` |
| 3 | baseline #1440–2155 | 11,795 | `ptr1-parts/03-baseline-1440-2155.md` |
| 4 | 18 interaction captures | 8,290 | `ptr1-parts/04-interactions.md` |
| 5 | 15 stylesheets + meta + theme/final diffs | 12,775 | `ptr1-parts/05-css-meta-themes.md` |

All 2,156 baseline records covered exactly once (720 + 720 + 716), all 22 non-meta captures covered,
all 15 stylesheets read end to end. Each part carries its own `## Verification` section stating what it
read and what it did not.

**Known limitation in the evidence pipeline:** the decoder's first run compared `::before`/`::after` by
reference rather than by value, producing phantom diffs in the theme captures. The prt2 agent caught it
by hexdumping the "differing" strings rather than trusting the output. The script was fixed
(`scripts/decode-ptr-dump.mjs`) and ptr1's slices regenerated before these five agents read them, so
every count above comes from corrected data.

---

# PART: ptr1-parts/01-baseline-000-719.md

# ptr1 baseline-room — node records #0–#719 = **DOM depths 1–13: the region map / skeleton of the whole page**

> **Framing correction (verified against my own six files).** My briefing called this range "the top of the DOM …
> and the start of the main content". The second half is wrong and I have not written to it. The node array is
> ordered **breadth-first by DOM depth**, so #0–#719 is not the first part of the page in reading order — it is the
> **shallowest slice of every region on the page at once**. Two adjacent `#index` values are routinely in unrelated
> parts of the UI (e.g. #111 is inside the permissions modal, #112 is the Room-Title row of the panel body).
> Consequently this document is a **region map**, not a linear walkthrough: it contains the *root* of essentially
> every region, and every deep component is truncated at depth 13 with its leaves in other agents' ranges (§1.0, §7.4).

Capture: `capture[0] baseline-room`, `kind=fullDom`, node count **2156** (declared 2156, `truncated=false`),
ts `2026-07-24T15:59:18.276Z`, viewport `{"w":1842,"h":1265,"dpr":2}`, `themeClass "footer-hidden"`,
`cssVars {"root":{},"body":{}}` — i.e. **zero CSS custom properties** (`INFO.txt` lines 1–9).

Slice files decoded here: `DEFAULTS.txt`, `INFO.txt`, `nodes-000.txt` … `nodes-005.txt` = records **#0 … #719**.

## 0. How to read this document — three structural facts you need first

1. **A node record prints only style properties that DIFFER from `DEFAULTS.txt`.** Full computed style =
   the DEFAULTS table overridden by that node's `style-deviations`. Every colour/size I state below is
   either a literal deviation line or explicitly marked "(DEFAULTS)".
   Key DEFAULTS values (`DEFAULTS.txt` lines 6–100): `display:block`, `position:static`, `box-sizing:border-box`,
   `color:rgb(51,51,51)`, `font-family:"Helvetica Neue", Helvetica, Arial, sans-serif`, `font-size:14px`,
   `font-weight:400`, `line-height:20px`, `letter-spacing:normal`, `background-color:rgba(0,0,0,0)`,
   `border-*-color:rgb(51,51,51)`, all border widths `0px`, all radii `0px`, `box-shadow:none`,
   `overflow:visible`, `z-index:auto`, `opacity:1`, `transform:none`, `fill:rgb(0,0,0)`, `stroke:none`.
   **No flex/grid anywhere**: `flex 0 1 auto`, `flex-direction row`, `align-items normal`, `justify-content normal`,
   `gap normal`, `grid-template-columns none` are **2156/2156 nodes** (`DEFAULTS.txt` lines 22–33) — the whole
   page is Bootstrap-3 floats + tables, not flexbox.
2. **Records are emitted breadth-first (depth-major), NOT in document order.** I checked all 720 records in file
   order: depth is **monotonically non-decreasing with `#index`, with zero backward steps**, and each depth occupies
   one contiguous `#index` block:

   | depth | `#index` range | count | | depth | `#index` range | count |
   |---:|---|---:|---|---:|---|---:|
   | 1 | #0 | 1 | | 8 | #43 – #64 | 22 |
   | 2 | #1 – #13 | 13 | | 9 | #65 – #111 | 47 |
   | 3 | #14 – #19 | 6 | | 10 | #112 – #153 | 42 |
   | 4 | #20 – #23 | 4 | | 11 | #154 – #190 | 37 |
   | 5 | #24 – #27 | 4 | | 12 | #191 – #451 | 261 |
   | 6 | #28 – #33 | 6 | | 13 | #452 – **#719 (my end)** | 268 |
   | 7 | #34 – #42 | 9 | | | | |

   Depth 13 is **cut mid-layer** at my boundary — the slice owning #1440–#2155 reports depth 13 still running at
   #1440 and rising to depth 20 by #2155, so layer 13 spans roughly #452 → #1440+. **`path` is the only authoritative
   nesting evidence**: siblings share a path prefix, and depth = number of dot-separated segments. Every tree in this
   document was reconstructed from `path` strings, never from `#index` adjacency.
3. **No CSS custom properties, no flexbox, no CSS grid — pure float-based Bootstrap 3.** `INFO.txt` line 8 gives
   `cssVars {"root":{},"body":{}}`, and `DEFAULTS.txt` lines 22–33 show all twelve flex/grid properties with
   **1 distinct value across all 2156 nodes** (`flex 0 1 auto`, `flex-direction row`, `flex-wrap nowrap`,
   `flex-grow 0`, `flex-shrink 1`, `flex-basis auto`, `align-items normal`, `align-self auto`,
   `justify-content normal`, `gap normal`, `order 0`, `grid-template-columns none`). I additionally grepped my 720
   records for any flex/grid deviation line or any `display:flex|inline-flex|grid|inline-grid`: **zero hits.**
   So there is no flex/grid setup to report anywhere in my range. The layout primitives actually in use are
   `float` + `position` + `display`, censused here:

   | `display` deviations | n | | `float` | n | | `position` | n |
   |---|---:|---|---|---:|---|---|---:|
   | `inline` | 143 | | `left` | 97 | | `relative` | 134 |
   | `inline-block` | 116 | | `right` | 8 | | `absolute` | 4 |
   | `none` | 45 | | | | | `fixed` | 2 |
   | `table-cell` | 10 | | | | | | |
   | `table` | 7 | | | | | | |
   | `table-row` | 5 | | | | | | |
   | `table-row-group` | 3 | | | | | | |
   | `table-header-group` | 2 | | | | | | |

   (everything else = the `display:block` / `float:none` / `position:static` DEFAULTS). Column widths are Bootstrap
   percentage floats (16.6667% / 25% / 33.3333% / 66.6667% / 83.3333%), and the input-groups are real CSS tables
   (`display:table` + `display:table-cell`), not flex rows — see §2.6.

---

## 1.0 Region map — the top-level layout chain and where every region's root sits

This is the payload of this slice: **my range contains the root of every region on the page.** Anyone rebuilding
starts here, then asks another slice for the leaves.

**Top-level layout chain (depths 1→6), single spine, no siblings that matter:**

```
depth 1  <body>                     #0   r                 1842×1265  bg #fff, class="footer-hidden"
depth 2  <div>.app-container        #1   r.0               1842×1265  ng-controller="CoreController"
depth 3  ├─ header slot             #14  r.0.0             1842×50
depth 3  └─ content slot (ui-view)  #15  r.0.1             1842×772.8
depth 4     ├─ <nav>.navbar         #20  r.0.0.0           1842×50    bg rgb(0,0,0)
depth 4     └─ inner ui-view        #22  r.0.1.1           1842×772.8
depth 5        ├─ .panel            #26  r.0.1.1.0         1842×772.8   ← the entire visible page
depth 5        └─ #permissionsModal #27  r.0.1.1.1         0×0 display:none
depth 6           ├─ .panel-heading #30  r.0.1.1.0.0       1840×53
depth 6           ├─ .panel-body    #31  r.0.1.1.0.1       1840×696.8
depth 6           └─ .panel-footer  #32  r.0.1.1.0.2       1840×21  (empty)
```

Body's other 12 depth-2 children are 11 `<script>` + the reCAPTCHA host `r.12` — no layout role.
**There is no sidebar, no footer content, no second column.** The page is one full-width panel under a black navbar.

**Region roots (every region on the page, with its root record and how deep my slice follows it):**

| # | Region | Root node | Root path | Rect | Visible | I hold it down to | Leaves in my slice? |
|---|---|---|---|---|---|---|---|
| 1 | Navbar / brand | #20 | `r.0.0.0` | 1842×50 | yes | depth 8 (`#43` logo `<img>`) | ✅ complete |
| 2 | Navbar right menu (Account, Logout) | #29 | `r.0.0.0.1.0` | 150.4×50 | yes | depth 8 (`#44`,`#45` `<a>`) | ✅ complete |
| 3 | Panel heading / title bar | #30 | `r.0.1.1.0.0` | 1840×53 | yes | depth 9 (`#65`–`#71` icons) | ✅ complete |
| 4 | Room-detail form (title / date / authmode / 3 links) | #38 | `r.0.1.1.0.1.0` | 1810×170 | yes | depth 13 (`#452`,`#453`) | ✅ complete |
| 5 | Loading spinner | #40 | `r.0.1.1.0.1.2` | 0×0 | no | depth 9 (`#58`,`#59`) | ✅ complete |
| 6 | Tabset (uib) | #41 | `r.0.1.1.0.1.3` | 1810×476.8 | yes | — | container only |
| 6a | └ tab strip (6 tabs) | #60 | `r.0.1.1.0.1.3.0` | 1810×42 | yes | depth 11 (`#131`–`#136`) | ✅ complete |
| 6b | └ tab content | #61 | `r.0.1.1.0.1.3.1` | 1810×434.8 | yes | — | container only |
| 7 | **Users pane** (active) | #97 | `r.0.1.1.0.1.3.1.0` | 1768×393.8 | yes | depth 13 (`#454`–`#469`) | ⛔ **cut** — table `<th>`/`<td>` deeper |
| 8 | Text List pane | #98 | `r.0.1.1.0.1.3.1.1` | 0×0 | no | depth 13 (`#175`,`#176`,`#206`) | ✅ complete |
| 9 | Branding pane | #99 | `r.0.1.1.0.1.3.1.2` | 0×0 | no | depth 13 (`#470`–`#474`) | ⛔ **cut** — `text-angular` editor internals |
| 10 | SSO Setup pane | #100 | `r.0.1.1.0.1.3.1.3` | 0×0 | no | depth 13 (`#475`) | ⛔ **cut** — `<p>` contents |
| 11 | User Stats pane | #101 | `r.0.1.1.0.1.3.1.4` | 0×0 | no | depth 13 (`#476`–`#492`) | ⛔ **cut** — `<tbody>` rows |
| 12 | **Settings pane** (226 rows) | #102 | `r.0.1.1.0.1.3.1.5` | 0×0 | no | depth 13 (`#493`–`#719`) | ⛔ **cut** — rows .61–.225 |
| 13 | Panel footer | #32 | `r.0.1.1.0.2` | 1840×21 | yes | depth 6 (leaf) | ✅ empty |
| 14 | Permissions modal | #27 | `r.0.1.1.1` | 0×0 | no | depth 11 (`#147`–`#153`) | ✅ complete |
| 15 | reCAPTCHA host + bframe | #13 | `r.12` | 2×2 off-screen | `visibility:hidden` | depth 4 (`#23` iframe) | ✅ complete |
| 16 | Scripts (11) | #2–#12 | `r.1`…`r.11` | 0×0 | no | depth 2 (leaves) | ✅ complete |

**Deepest paths I hold** (the exact cut line): `r.0.1.1.0.1.3.1.4.0.1.1.0` (#482, User Stats search input) …
`r.0.1.1.0.1.3.1.5.0.0.60.2#pairURLLink` (#719, last record in my range). Anything below depth 13 belongs to the
next slice.

## 1. DOM outline (reconstructed from `path` strings, in tree order — NOT `#index` order)

Format: `path` `<tag>` `#index` — classes/ids — rect `x,y w×h` (CSS px). `HIDDEN` = zero rect and/or
`display:none` / `visibility:hidden`.

```
r  <body> #0                                          0,0 1842×1265   class="footer-hidden"
│  bg rgb(255,255,255); overflow-x/y:auto  (nodes-000.txt #0 path=r)
│
├─ r.0 <div> #1  .app-container.ng-scope               0,0 1842×1265  ng-controller="CoreController", data-ui-view
│  │ position:relative; inset 0; min-height:100%
│  │
│  ├─ r.0.0 <div> #14  .ng-fadeOutZoom.ng-fluid.ng-scope   0,0 1842×50
│  │  └─ r.0.0.0 <nav> #20  .navbar.topnavbar             0,0 1842×50   style="background-color: black;"
│  │     ├─ r.0.0.0.0 <div> #24  .navbar-header           0,0 350×50    float:left; z-index:1
│  │     │  └─ r.0.0.0.0.0 <div> #28 .navbar-brand        15,0 320×50
│  │     │     └─ r.0.0.0.0.0.0 <a href=""> #34           20,14.5 200×21
│  │     │        └─ r.0.0.0.0.0.0.0 <img> #43 .brand-logo 20,14.6 200×24.5  src=/public/images/ptr_logo.png
│  │     └─ r.0.0.0.1 <div> #25 .nav-wrapper.collapse.navbar-collapse.in  0,0 1842×50  padding-x:15
│  │        └─ r.0.0.0.1.0 <ul> #29 .nav.navbar-nav.navbar-right.hidden-material  1691.6,0 150.4×50
│  │           │  ng-show="login.isLoggedIn"; float:right; margin-right:-15px
│  │           ├─ …0 <li> #35    1691.6,0 96.4×50
│  │           │   └─ …0.0 <a> #44  .icon.fa..fa-cog     1691.6,0 96.4×50  "Account"
│  │           └─ …1 <li> #36    1788,0 54×50
│  │               └─ …1.0 <a> #45  .icon.fa.fa-2x.fa-power-off  1788,0 54×50  ng-click="doLogout()"
│  │
│  └─ r.0.1 <div ui-view autoscroll="false"> #15 .ng-fluid.ng-scope   0,50 1842×772.8
│     ├─ r.0.1.0 <style> #21 .ng-scope   HIDDEN (display:none)  text: "body { overflow: auto; }"
│     └─ r.0.1.1 <div ui-view autoscroll="false"> #22 .ng-fadeOutZoom.ng-fluid.ng-scope  0,50 1842×772.8
│        │  attr style = "background-color: 0A0A0A; "   ← invalid CSS value, no effect (computed bg = DEFAULTS rgba(0,0,0,0))
│        │
│        ├─ r.0.1.1.0 <div> #26 .panel.panel-default    0,50 1842×772.8
│        │  ├─ …0 <div> #30 .panel-heading              1,51 1840×53
│        │  │  └─ …0.0 <div> #37 .panel-title           16,61 1810×32
│        │  │     ├─ …0 <span> #46 .ng-binding          16,66.1 398.4×18.5  ng-dblclick="canCloneDblClick()"
│        │  │     ├─ …1 <span> #47 .text-muted.ng-binding 418.9,66.1 168×18.5
│        │  │     │   ├─ …1.0 <i> #65 .icon.fa.fa-user  476.7,67.6 12.6×16
│        │  │     │   └─ …1.1 <i> #66 .icon.fa.fa-user  556.5,67.6 12.6×16
│        │  │     ├─ …2 <button> #48 .btn.btn-link.btn-warning 586.9,61 124.9×32  ng-click="resetMaxCount()"
│        │  │     │   └─ …2.0 <i> #67 .icon.fa.fa-refresh 598.9,70 12×14
│        │  │     ├─ …3 <a> #49 .btn.btn-sm.pull-right.btn-info.mr 1739.1,61 76.9×30  target="_blank"
│        │  │     │   └─ …3.0 <i> #68 .icon.fa.fa-external-link 1750.1,70 12×12
│        │  │     ├─ …4 <a> #50 .btn.btn-sm.pull-right.btn-warning.mr.ng-hide  HIDDEN  ng-show="sess.canClone || sess.isClonedRoom || canCloneClicks"
│        │  │     │   └─ …4.0 <i> #69 .icon.fa.fa-copy   HIDDEN
│        │  │     ├─ …5 <a> #51 .btn.btn-sm.pull-right.btn-danger.mr.ng-hide  HIDDEN  ng-show="sess.isClonedRoom"
│        │  │     │   └─ …5.0 <i> #70 .icon.fa.fa-trash  HIDDEN
│        │  │     └─ …6 <a> #52 .btn.btn-sm.pull-right.btn-default.mr.ng-hide HIDDEN  ng-hide="disableMarketplace"
│        │  │         └─ …6.0 <i> #71 .fa.fa-credit-card HIDDEN
│        │  ├─ …1 <div> #31 .panel-body                  1,104 1840×696.8   padding:15
│        │  │  ├─ …0 <div> #38 .form-vertical           16,119 1810×170
│        │  │  │  ├─ …0.0 <div> #53 .form-group.m0      16,119 1810×0     ← "Room Title" row
│        │  │  │  │  ├─ #72 <label> .col-sm-2.control-label  16,119 301.7×20  "Room Title"
│        │  │  │  │  └─ #73 <div> .col-sm-10               317.7,119 1508.3×34
│        │  │  │  │     └─ #112 <p> .form-control-static   332.7,119 1478.3×34
│        │  │  │  │        └─ #154 <a> editable-text="sess.name"  332.7,127.5 72.6×17.5  "Room 3625"
│        │  │  │  ├─ …0.1 <div> #54 .form-group.m0.ng-hide  HIDDEN  ng-show="sess.roomType=='webinar'"  ← "Date:" row
│        │  │  │  │  ├─ #74 <label> "Date:"   └─ #75 <div>.col-sm-10 → #113 <p> → #155 <a> editable-combodate "07/23/2026 @ 05:41 PM", #156 <br>, #157 <muted>
│        │  │  │  ├─ …0.2 <div> #55 .form-group.m0      16,119 1810×0     ← "Authorization Mode" row
│        │  │  │  │  ├─ #76 <label> 16,153 301.7×20 "Authorization Mode"
│        │  │  │  │  └─ #77 <div>.col-sm-10 317.7,153 1508.3×34 → #114 <p> 332.7,153 → #158 <a> editable-select "Open - Anyone with…"
│        │  │  │  ├─ …0.3 <div> #56 .ng-hide  HIDDEN  ng-show="sess.authMode=='registrationA' || sess.authMode=='registrationM'"
│        │  │  │  │  ├─ #78 .form-group.m0 → #115 label "Registration Link:", #116 .input-group → #159 input#webinarRegLinkTxt, #160 span.input-group-btn → #191 button "Copy" → #452 <i>.fa-copy
│        │  │  │  │  ├─ #79 <br>
│        │  │  │  │  ├─ #80 .form-group.m0 → #117 label "Event Time (for email template):", #118 .col-sm-10 → #161 input ng-model="webinarTimeTxt" placeholder="at 7pm EST"
│        │  │  │  │  ├─ #81 <br clear="both">
│        │  │  │  │  ├─ #82 .form-group.m0 → #119 label "Email Preview:", #120 .col-sm-8 → #162 <pre> (email template) → #192/#193 <strong>, #163 button "Send Emails Now"; #121 <br>, #122 <br>
│        │  │  │  │  └─ #83 <br clear="both">
│        │  │  │  └─ …0.4 <div> #57  16,119 1810×170  ng-show="sess.authMode=='webinarRoom' || sess.authMode=='open' || sess.authMode=='unamePW' || sess.allowPWLoginWithSSO"  ← VISIBLE (authMode=open)
│        │  │  │     ├─ #84 <label> 16,187 301.7×20 "Room Link:"
│        │  │  │     ├─ #85 <div>.input-group 317.7,187 1508.3×34 (display:table)
│        │  │  │     │   ├─ #123 <input#webinarLinkTxt> 317.7,187 1432×34 readonly
│        │  │  │     │   └─ #124 <span>.input-group-btn 1749.7,187 76.3×34 → #164 <button>.btn-info "Copy" 1748.7,187 77.3×34 → #194 <i>.fa-copy 1799,197 14×14
│        │  │  │     ├─ #86 <label> 16,221 301.7×20 "Vanity Link:"
│        │  │  │     ├─ #87 <div>.input-group 317.7,221 1508.3×34
│        │  │  │     │   ├─ #125 <input#customLinkTxt> 317.7,221 1364.7×34 readonly
│        │  │  │     │   └─ #126 <span>.input-group-btn 1682.4,221 143.6×34 → #165 <button>.btn-warning "Edit" 1681.4,221 68.3×34 → #195 <i>.fa-edit 1722.7,231 14×14
│        │  │  │     │                                                      → #166 <button>.btn-info "Copy" 1748.7,221 77.3×34 → #196 <i>.fa-copy 1799,231 14×14
│        │  │  │     ├─ #88 <label> 16,255 301.7×20 "Unique Link:"
│        │  │  │     ├─ #89 <div>.input-group 317.7,255 1508.3×34
│        │  │  │     │   ├─ #127 <input#uniqueLinkTxt> 317.7,255 1332.5×34 readonly
│        │  │  │     │   └─ #128 <span>.input-group-btn 1650.2,255 175.8×34 → #167 <button>.btn-primary "Generate" 1649.2,255 100.5×34 → #197 <i>.fa-link 1723.7,265 13×14
│        │  │  │     │                                                      → #168 <button>.btn-info "Copy" 1748.7,255 77.3×34 → #198 <i>.fa-copy 1799,265 14×14
│        │  │  │     └─ #90 <div>.ng-hide HIDDEN ng-show="sess.hasAppPairLink" → #129 label "App Pair Link:", #130 .input-group → #169 input#appPairLink, #170 span → #199 button "Copy" → #453 <i>.fa-copy
│        │  │  ├─ …1 <br> #39                            16,290.5 0×16.5
│        │  │  ├─ …2 <div> #40 .div.animated.fadeIn.infinite.ng-hide  HIDDEN  ng-show="dataLoading"; padding:25; text-align:center
│        │  │  │   ├─ #58 <img src="app/img/ajax_loader.gif">   └─ #59 <label> "Loading..."
│        │  │  └─ …3 <div> #41 .ng-isolate-scope  16,309 1810×476.8   ← uib tabset
│        │  │     ├─ …3.0 <ul> #60 .nav.nav-tabs        16,309 1810×42   ng-transclude; ng-class="{'nav-stacked': vertical, 'nav-justified': justified}"
│        │  │     │  ├─ #91 <li> heading="Users" .active         16,309 70.3×42   → #131 <a> "Users"       16,309 68.3×42
│        │  │     │  ├─ #92 <li> heading="Text List" .ng-hide    HIDDEN ng-show="sess.twillioApiToken" → #132 <a> "Text List"
│        │  │     │  ├─ #93 <li> heading="Branding (Logo / Landing Page)"  86.3,309 232.6×42 → #133 <a>  86.3,309 230.6×42
│        │  │     │  ├─ #94 <li> heading="SSO Setup" .ng-hide    HIDDEN ng-show="sess.authMode=='sso'" → #134 <a> "SSO Setup"
│        │  │     │  ├─ #95 <li> heading="User Stats"           318.9,309 99.6×42 → #135 <a>  318.9,309 97.6×42
│        │  │     │  └─ #96 <li> heading="Settings"             418.5,309 85.3×42 → #136 <a>  418.5,309 83.3×42
│        │  │     └─ …3.1 <div> #61 .tab-content        16,351 1810×434.8  padding 10/20; border r/b/l 1px solid rgb(230,233,238)
│        │  │        ├─ #97  <div>.tab-pane.ng-scope.active  37,361 1768×393.8  ← USERS pane (see §1a)
│        │  │        ├─ #98  <div>.tab-pane.ng-scope  HIDDEN  ← Text List pane (see §1b)
│        │  │        ├─ #99  <div>.tab-pane.ng-scope  HIDDEN  ← Branding pane (see §1c)
│        │  │        ├─ #100 <div>.tab-pane.ng-scope  HIDDEN  ← SSO Setup pane (see §1d)
│        │  │        ├─ #101 <div>.tab-pane.ng-scope  HIDDEN  ← User Stats pane (see §1e)
│        │  │        └─ #102 <div>.tab-pane.ng-scope  HIDDEN  ← Settings pane (see §1f)
│        │  └─ …2 <div> #32 .panel-footer.text-center   1,800.8 1840×21   (no text, no element children in capture)
│        │
│        └─ r.0.1.1.1 <div#permissionsModal> #27 .modal.fade  HIDDEN (display:none, opacity 0, z-index 1050, position:fixed inset 0)
│           └─ …0 <div> #33 .modal-dialog role="document"  width:600px; margin 30px auto
│              └─ …0.0 <div> #42 .modal-content  padding 20; border 1px solid rgba(0,0,0,0.2); radius 6px; bg #fff; shadow rgba(0,0,0,0.5) 0 5px 15px
│                 ├─ #62 <div>.modal-header  padding 15; border-bottom 1px solid rgb(229,229,229)
│                 │   ├─ #103 <button>.close data-dismiss="modal" aria-label="Close" → #147 <span aria-hidden="true"> "×"
│                 │   └─ #104 <h4#permissionsModalLabel>.modal-title "Adjust Mic/Cam/Screen permissions for user:" → #148 <i>.ng-binding (italic, empty)
│                 ├─ #63 <div>.modal-body  padding 15; position:relative
│                 │   ├─ #105 <label>.d-block "Microphone"   → #149 <input type=checkbox> ng-model="userPermissions.hasMic"
│                 │   ├─ #106 <label>.d-block "Screenshare"  → #150 <input type=checkbox> ng-model="userPermissions.hasScreen"
│                 │   ├─ #107 <label>.d-block "WebCam"       → #151 <input type=checkbox> ng-model="userPermissions.hasCam"
│                 │   ├─ #108 <label>.d-block "AdminChat"    → #152 <input type=checkbox> ng-model="userPermissions.hasAdminChat"
│                 │   └─ #109 <label>.d-block "CanEditNotes" → #153 <input type=checkbox> ng-model="userPermissions.canEditNotes"
│                 └─ #64 <div>.modal-footer.text-right  padding 15; border-top 1px solid rgb(229,229,229)
│                     ├─ #110 <button>.btn.btn-default data-dismiss="modal" "Close"
│                     └─ #111 <button>.btn.btn-success ng-click="saveUserPermissions()" "Save Changes"
│
├─ r.1  <script src="/public/dist/vendor.min.js?v=2.18.100"> #2                     HIDDEN
├─ r.2  <script> #3  (inline: __h264 / __isReg bootstrap)                            HIDDEN
├─ r.3  <script src="https://cdnjs.cloudflare.com/ajax/libs/adapterjs/0.15.5/adapter.min.js"> #4  HIDDEN
├─ r.4  <script src="/public/vendor/janus3.js?v=2.18.100"> #5                        HIDDEN
├─ r.5  <script src="//vjs.zencdn.net/7.3.0/video.min.js"> #6                        HIDDEN
├─ r.6  <script src="//cdnjs.cloudflare.com/ajax/libs/videojs-youtube/2.6.0/Youtube.min.js"> #7 HIDDEN
├─ r.7  <script src="https://cdnjs.cloudflare.com/ajax/libs/angularjs-toaster/2.2.0/toaster.min.js"> #8 HIDDEN
├─ r.8  <script src="https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.4.0/sockjs.min.js"> #9 HIDDEN
├─ r.9  <script src="https://w.soundcloud.com/player/api.js"> #10                    HIDDEN
├─ r.10 <script src="/public/dist/app.min.js?v=1784623769671"> #11                   HIDDEN
├─ r.11 <script> #12 (inline: __cver + UA sniffing)                                  HIDDEN
└─ r.12 <div> #13  reCAPTCHA bubble host   0,-10000 2×2   visibility:hidden; z-index 2000000000
   ├─ r.12.0 <div> #16   0,0 1842×1265  position:fixed; bg #fff; opacity .05; visibility:hidden
   ├─ r.12.1 <div> #17 .g-recaptcha-bubble-arrow  1,-10010 22×22  visibility:hidden
   ├─ r.12.2 <div> #18 .g-recaptcha-bubble-arrow  1,-10009 20×20  visibility:hidden
   └─ r.12.3 <div> #19   1,-9999 0×0  visibility:hidden
      └─ r.12.3.0 <iframe> #23  1,-9984 0×0  visibility:hidden  (reCAPTCHA bframe, see §6)
```

### 1a. Users tab pane (#97, the only visible pane) — `r.0.1.1.0.1.3.1.0`

```
#97  <div>.tab-pane.ng-scope.active        37,361 1768×393.8   ng-repeat="tab in tabs"; tab-content-transclude="tab"
└─ #137 <fieldset>.ng-scope                37,361 1768×393.8   margin-bottom 20; padding-bottom 20
   ├─ #171 <div>.form-group                37,361 1768×0
   │   └─ #200 <div>.col-sm-4.pull-right   1215.7,361 589.3×88  float:right; padding-x 15
   │       ├─ #454 <button>.btn.btn-md.btn-info.mt   1230.7,371 150.6×34  ng-click="doInvite()"          "Add User / Invite"
   │       ├─ #455 <button>.btn.btn-md.btn-info.mt   1385.2,371  83.1×34  ng-click="exportListToCSV()"   "Export"
   │       ├─ #456 <button>.btn.btn-md.btn-primary.mt 1472.2,371 174.1×34 ng-click="loadUsers()"         "Load / Reload Users"
   │       └─ #457 <div>.dropdown                    1230.7,405 148.1×44  style="display:inline-block; vertical-align:middle;"
   ├─ #172 <form>.form-inline.ng-pristine.ng-valid   37,361 1768×34
   │   └─ #201 <div>.form-group  37,361 423.1×34 (display:inline-block; vertical-align:middle)
   │       ├─ #458 <label>.control-label  37,368  89.5×20  "Search Users"
   │       ├─ #459 <input type="search" name="title"> 130.4,361 194×34  ng-model="uSearch " ng-enter="loadUsers(uSearch)"
   │       └─ #460 <button>.btn.btn-sm.btn-primary  328.3,363 131.8×30  ng-click="loadUsers(uSearch)"  "Search / Load Users"
   ├─ #173 <div>.users-many-actions   37,425 1768×64   margin-top 30
   │   ├─ #202 <div>.checkbox.ng-scope  37,425 1768×20  ng-if="completeUserList && completeUserList.length>0"
   │   │   ├─ #461 <label> 37,425 78.3×20   ng-click="getCheckedAllUserIds()"   (no text of its own)
   │   │   └─ #462 <label>.checkbox-apply-to-all-rooms 129.2,425 140.9×20      (no text of its own)
   │   └─ #203 <span>.dropdown  37,462.1 376.6×16.5  position:relative
   │       ├─ #463 <button>.btn.dropdown-toggle.btn-primary  37,455 179.7×34  data-toggle="dropdown"  "Actions With Selected"
   │       ├─ #464 <button>.btn.dropdown-toggle.btn-primary 220.6,455 193×34  ng-click="actionsWithEmailList()"  "Actions With the Email List"
   │       └─ #465 <ul>.dropdown-menu role="menu"  HIDDEN (display:none; position:absolute; top:100%; z-index 1000)
   └─ #174 <table>.table.table-striped  37,489 1768×225.8  ng-init="showPins=true;"
       ├─ #204 <thead>  37,489 1768×60.5
       │   └─ #466 <tr>  37,489 1768×60.5      (its <th> cells are BEYOND #719 — next slice)
       └─ #205 <tbody>  37,549.5 1768×165.3
           ├─ #467 <tr> ng-repeat="user in xrefs  "  37,549.5 1768×41    bg rgb(249,249,249)  ← striped odd row
           ├─ #468 <tr> ng-repeat="user in xrefs  "  37,590.5 1768×62.4  (bg = DEFAULTS transparent)
           └─ #469 <tr> ng-repeat="user in xrefs  "  37,652.9 1768×61.9  bg rgb(249,249,249)
               (row <td> cells are BEYOND #719 — next slice)
```

**3 user rows are rendered** (`#467`, `#468`, `#469`) — that is the real live count of `xrefs` in this capture.

### 1b. Text List pane (#98, hidden) — `r.0.1.1.0.1.3.1.1`
```
#98 HIDDEN → #138 <div>.form-vertical.ng-scope
   ├─ #175 <button>.btn.btn-info.pull-right ng-click="saveTextList()" "Save List" → #206 <i>.fa.fa-save
   └─ #176 <textarea#textListTxt rows="40" style="width: 100%; height:100%">  resize:both; white-space:pre-wrap
```

### 1c. Branding pane (#99, hidden) — `r.0.1.1.0.1.3.1.2`
```
#99 HIDDEN → #139 <fieldset>.ng-scope → #177 <div>.form-group
   ├─ #207 <label>.col-sm-2.control-label "Logo"
   ├─ #208 <div>.col-sm-3  style="background-color: #000; padding: 15px;"  → computed bg rgb(0,0,0), width 25%
   │    └─ #470 <img>.navLogo  ng-src/src="/public/images/ptr_logo.png"  height 25px; max-width 300px; max-height 25px
   ├─ #209 <div>.col-sm-4 (33.3333%)
   │    ├─ #471 <button>.btn.btn-assertive  ng-click="openFileChooser( 'logos') "  "Upload/Change"
   │    └─ #472 <button>.btn.btn-assertive  ng-click="resetLogo() "                "Reset"
   ├─ #210 <br>
   ├─ #211 <hr>  (box-sizing content-box; margin 20px auto; border-top 1px solid rgb(238,238,238))
   └─ #212 <div>.col-sm-10 (83.3333%)
        ├─ #473 <h3 style="text-align: center; margin-bottom: 20px;"> "Login Landing Page Editor"
        └─ #474 <div text-angular ng-model="sess.description" name="wysiswyg-editor"> .btn-group-small.ta-root
```

### 1d. SSO Setup pane (#100, hidden) — `r.0.1.1.0.1.3.1.3`
```
#100 HIDDEN → #140 <div>.form-horizontal.ng-scope → #178 <div>.form-group.m0
   ├─ #213 <label>.col-sm-4.control-label (33.3333%, text-align:right, padding-top 7px) "SSO Host"
   └─ #214 <div>.col-sm-8 → #475 <p>.form-control-static
```

### 1e. User Stats pane (#101, hidden) — `r.0.1.1.0.1.3.1.4`
```
#101 HIDDEN
├─ #141 <fieldset>.ng-scope  (border-bottom 1px dashed rgb(238,238,238))
│   ├─ #179 <div>.form-group
│   │   └─ #215 <div>.col-sm-4.pull-left
│   │       ├─ #476 <div> (no attrs)
│   │       ├─ #477 <button>.btn.btn-md.btn-info  ng-click="loadStats(statsDate,statsDateEnd,uSearchStat,filterFT,remDupes,showMobileStat)"  "Load Stats"
│   │       ├─ #478 <button>.btn.btn-md.btn-info  ng-click="exportStatsToCSV(statsDate)"  "Export"
│   │       ├─ #479 <button>.btn.btn-md.btn-info  ng-click="loadMontlyStats(statsDate,statsDateEnd,false)" ng-show="statXrefsMontly.length===0"  "Monthly report for date range"
│   │       ├─ #480 <button>… .ng-hide  ng-click="loadMontlyStats(statsDate,statsDateEnd,true)"  ng-show="statXrefsMontly.length>0"  "Clear monthly report"
│   │       └─ #481 <button>… .ng-hide  ng-click="downloadMontlyStats(statXrefsMontly)" ng-show="statXrefsMontly.length>0" "Download monthly report"
│   └─ #180 <div> ng-show="statXrefs.length>0 || true"
│       ├─ #216 <label>.col-sm-2.control-label "Search Users"
│       └─ #217 <div>.col-sm-4
│           ├─ #482 <input type="search " name="title " required=" "> ng-model="uSearchStat " .ng-invalid-required
│           ├─ #483 <br>
│           ├─ #484 <label> "Show Online Users Only"
│           ├─ #485 <label> "Show  Only?"          ← interpolation gap (see §7)
│           ├─ #486 <label> "Show Mobile Only?"
│           └─ #487 <label> "Remove duplicates?"
├─ #142 <h3> ng-hide="statXrefs.length>0 || statXrefsMontly.length>0"  "No results to show. Select a date above..."
├─ #143 <div>.ng-hide ng-show="loadingUsersStats" → #181 <div#chatLogLoading style="padding: 25px; text-align: center;"> → #218 <img src="app/img/ajax_loader.gif">, #219 <label> "Loading..."
├─ #144 <div>.ng-hide ng-show="!loadingUsersStats && statXrefsMontly.length>0"
│   ├─ #182 <h4> "Monthly report:  - Total Logins:" → #220 <strong>.ng-binding (empty), #221 <strong>.ng-binding "0"
│   └─ #183 <table>.table.table-striped → #222 <tbody>
└─ #145 <table>.table.table-striped.ng-hide ng-show="!loadingUsersStats && statXrefs.length>0"
    ├─ #184 <thead> → #223 <tr> → #488 <th>"#", #489 <th>"Nick", #490 <th>"Email / IP", #491 <th>"Time Stamps", #492 <th>"Duration (Hours)"
    └─ #185 <tbody>
```

### 1f. Settings pane (#102, hidden) — `r.0.1.1.0.1.3.1.5`
```
#102 HIDDEN → #146 <div>.form-vertical.ng-scope
   ├─ #186 <div>.form-group.m0        ← 226 direct children (.0 … .225), one per settings row
   ├─ #187 <hr>
   ├─ #188 <h3> "DON'T  These below unless you know what you are doing..."  → #450 <span ng-click="donttouchShow=!donttouchShow"> "TOUCH"
   │        (rendered text is "DON'T TOUCH These below…")
   ├─ #189 <p> ng-hide="donttouchShow" "Settings..."
   └─ #190 <div>.form-vertical.ng-hide ng-show="donttouchShow" → #451 <div>.form-group.m0
```
`#186`'s children in my range: `#224` (row .0, a `<p>` holding the two top buttons), `#225`–`#449` = rows .1–.225,
almost all `<p class="form-control-static">` (min-height 34px, padding 7px 0). The **contents** of rows .0–.60
are records `#493`–`#719` (see §5 table). Rows **.61–.225 have their children beyond #719** (next slice).

---

## 2. Region / component inventory

All values are literal deviation lines from the cited record; anything not listed is the `DEFAULTS.txt` value.
The "flex/grid setup" column my briefing asked for is **deliberately absent: there is none** (§0.3, zero hits in
2156 nodes). Read the `float` / `position` / `display` columns as the layout mechanism instead. Components marked
⛔ in §1.0 are described only down to depth 13; their leaves are in another slice.

### 2.1 Page shell

| Component | Node | Box | Colours | Typography | Other |
|---|---|---|---|---|---|
| `<body>` | nodes-000 #0 `path=r` | 1842×1265 | bg `rgb(255,255,255)` | DEFAULTS 14px/20px Helvetica Neue | `overflow-x/y:auto` (from injected `<style>` #21); class `footer-hidden` |
| `.app-container` | #1 `path=r.0` | 1842×1265, `min-height:100%` | — | — | `position:relative`, inset `0 0 0 0` |
| header wrapper `.ng-fluid` | #14 `r.0.0` | 1842×50 | — | — | — |
| content wrapper `ui-view` | #15 `r.0.1` | 1842×772.766 | — | — | — |
| inner `ui-view` | #22 `r.0.1.1` | 1842×772.766 | inline `style="background-color: 0A0A0A; "` → **invalid, computed bg stays transparent** | — | — |

### 2.2 Navbar (`r.0.0.0`, #20)

| Part | Node | Box | Colour | Typography |
|---|---|---|---|---|
| `<nav>.navbar.topnavbar` | #20 | 1842×50, `min-height:50px`, `position:relative` inset 0 | bg `rgb(0,0,0)` (inline `background-color: black`) | — (`::before`/`::after` content `" "`, colour `rgb(51,51,51)`) |
| `.navbar-header` | #24 | 350×50, `float:left`, `z-index:1` | — | — |
| `.navbar-brand` | #28 | 320×50, margin-x 15, padding-x 5, `z-index:1` | colour + border + outline `rgb(250,250,250)` | 18px / 50px |
| brand `<a href="">` | #34 | 200×21 @ 20,14.5, `display:inline` | colour/border/outline `rgb(51,122,183)` | 18px / 50px, `cursor:pointer` |
| brand `<img>.brand-logo` | #43 | 199.992×24.539 @20,14.6; `max-width:200px`; `max-height:40px`; `display:inline-block` | inherits `rgb(51,122,183)` | `vertical-align:middle`; `overflow:clip` |
| right `<ul>` | #29 | 150.43×50 @1691.6,0; `float:right`; `margin-right:-15px` | — | `list-style-type:none` |
| `<li>` #35 / #36 | #35, #36 | 96.43×50 / 54×50, `float:left`, `position:relative` | — | — |
| Account `<a>.icon.fa..fa-cog` | #44 | 96.43×50, padding 15 all | colour/border/outline `rgb(255,255,255)` | `font-family:FontAwesome`, 14px; `cursor:pointer`; `transform:matrix(1,0,0,1,0,0)`; `::before` colour `rgb(255,255,255)` 14px |
| Logout `<a>.icon.fa.fa-2x.fa-power-off` | #45 | 54×50, padding 15 all | `rgb(255,255,255)` | `font-family:FontAwesome`, **28px**; `::before` 28px |

### 2.3 Panel (`.panel.panel-default`, #26)

| Part | Node | Box | Colour / border | Typography |
|---|---|---|---|---|
| panel | #26 | 1842×772.766, `margin-bottom:20px` | border 1px solid `rgb(221,221,221)` all sides; radius 4px all; bg `rgb(255,255,255)`; shadow `rgba(0,0,0,0.05) 0px 1px 1px 0px` | — |
| `.panel-heading` | #30 | 1840×53, padding `10px 15px` | border-bottom 1px solid `rgb(221,221,221)`; radius top 3px; bg `rgb(245,245,245)` | — |
| `.panel-title` | #37 | 1810×32 | — | **16px / 22.8571px** |
| `.panel-body` | #31 | 1840×696.766, padding 15 all | — | — |
| `.panel-footer.text-center` | #32 | 1840×21, padding `10px 15px` | border-top 1px solid `rgb(221,221,221)`; radius bottom 3px; bg `rgb(245,245,245)` | `text-align:center` — **empty** |

### 2.4 Panel-title inline items

| Item | Node | Box | Colour | Notes |
|---|---|---|---|---|
| room-id `<span>.ng-binding` | #46 | 398.4×18.5 @16,66.1, `display:inline` | DEFAULTS `rgb(51,51,51)` | 16px/22.8571px; `ng-dblclick="canCloneDblClick()"` |
| counts `<span>.text-muted` | #47 | 168×18.5 @418.9,66.1 | colour/border/outline `rgb(119,119,119)` | 16px/22.8571px |
| `<i>.fa-user` ×2 | #65, #66 | 12.578×16 | `rgb(119,119,119)` | FontAwesome 16px/16px, inline-block |
| `<i>.fa-refresh` | #67 | 12×14 | `rgb(51,122,183)` | FontAwesome 14px/14px; `cursor:pointer`; `user-select:none` |
| `<i>.fa-external-link` | #68 | 12×12 | DEFAULTS `rgb(51,51,51)` | FontAwesome 12px/12px |
| `<i>.fa-copy` / `.fa-trash` / `.fa-credit-card` | #69 / #70 / #71 | 0×0 (hidden parents) | `rgb(51,51,51)` | FontAwesome 12px/12px |

### 2.5 Button palette (literal, from this slice)

| Class | bg | border (all 4) | text | radius | padding | example node |
|---|---|---|---|---|---|---|
| `.btn-info` | `rgb(91,192,222)` | 1px solid `rgb(70,184,218)` | `rgb(255,255,255)` | 4px (md) / 3px (`.btn-sm`) | `6px 12px` (md), `5px 10px` (sm) | #164, #454, #49 (sm) |
| `.btn-primary` | `rgb(51,122,183)` | 1px solid `rgb(46,109,164)` | `rgb(255,255,255)` | 4px / 3px sm | 6px 12px / 5px 10px | #167, #456, #460 (sm) |
| `.btn-warning` | `rgb(240,173,78)` | 1px solid `rgb(238,162,54)` | `rgb(255,255,255)` | (none set on #165) / 3px on `.btn-sm` #50 | 6px 12px | #165, #50 |
| `.btn-danger` | `rgb(217,83,79)` | 1px solid `rgb(212,63,58)` | (DEFAULTS) | 3px | 5px 10px | #51 |
| `.btn-default` | `rgb(255,255,255)` | 1px solid `rgb(230,233,238)` | (DEFAULTS) | 4px / 3px sm | 6px 12px | #110, #163, #52 |
| `.btn-success` | `rgb(92,184,92)` | 1px solid `rgb(76,174,76)` | `rgb(255,255,255)` | 4px | 6px 12px | #111 |
| `.btn-assertive` | `rgb(239,239,239)` | 1px solid `rgba(0,0,0,0)` | (DEFAULTS) | 4px | 6px 12px | #471, #472 |
| `.btn-link.btn-warning` | (transparent) | — | `rgb(51,122,183)` | — | 6px 12px | #48, plus `box-shadow: rgb(0,0,0) 0 0 0 0` |
| all buttons | — | — | — | — | `text-align:center; white-space:nowrap; vertical-align:middle; cursor:pointer; user-select:none` |

`.btn-md.mt` adds `margin-top:10px` (#454–#456). `.mr` adds `margin-right:10px` (#49–#52).
`.input-group-btn` buttons add `margin-left:-1px`, `z-index:2`, and only right-side radii 4px (#164, #166, #168).

### 2.6 Form controls

| Control | Node | Box | Colour / border | Notes |
|---|---|---|---|---|
| `.form-control` readonly link boxes | #123, #125, #127, #159, #169, #719 | h 34px; padding `6px 18px`; radius: **left 4px only** when inside `.input-group` (#123/#125/#127), all-4 4px when standalone (#719) | border 1px solid `rgb(219,217,217)`; bg `rgb(238,238,238)`; text `rgb(85,85,85)` | `z-index:2`, `float:left`, `cursor:text`, `overflow:clip`, `box-shadow: rgb(0,0,0) 0 0 0 0`, `transition: border-color .15s, box-shadow .15s` |
| `.form-control` search input | #459 | 194×34; padding `6px 18px`; radius 4px all | border 1px solid `rgb(219,217,217)`; bg `rgb(255,255,255)`; text `rgb(85,85,85)` | `display:inline-block`, `vertical-align:middle` |
| `.form-control` invalid search | #482 | 100%×34 | same, `appearance:auto` | class `ng-invalid ng-invalid-required` |
| bare `<input type=text>` | #161 | — | border 2px inset `rgb(118,118,118)`; bg `rgb(255,255,255)` | padding `1px 2px`; the only non-`.form-control` text input |
| `<textarea#textListTxt>` | #176 | 100%×100% | border 1px solid `rgb(118,118,118)`; bg `rgb(255,255,255)` | `resize:both`; `white-space:pre-wrap`; `overflow:auto`; `appearance:auto`; `rows="40"` |
| checkbox inputs | #149–#153 | — | — | `display:inline-block`; `margin-top:4px`; `line-height:normal`; `appearance:auto` |
| `.input-group` | #85, #87, #89 (visible) | `display:table`; 1508.34×34 | — | `position:relative` |
| `.input-group-btn` | #124, #126, #128 | `display:table-cell`; 76.34 / 143.62 / 175.80 × 34 | — | `font-size:0; line-height:0; white-space:nowrap; vertical-align:middle` |
| `<p>.form-control-static` | #112, #114, #224+ | `min-height:34px`; padding `7px 0` | — | — |
| `<label>.col-sm-2.control-label` | #72, #76, #84, #86, #88 | 301.664×20 (=16.6667%); padding-x 15; `float:left`; `margin-bottom:5px` | — | `font-weight:700`; `cursor:default`; `max-width:100%`; `min-height:1px` |
| `<div>.col-sm-10` | #73, #77 | 1508.33×34 (83.3333%); padding-x 15; `float:left` | — | `position:relative`, `min-height:1px` |

Bootstrap grid widths seen: `.col-sm-2`=16.6667%, `.col-sm-3`=25%, `.col-sm-4`=33.3333%, `.col-sm-8`=66.6667%,
`.col-sm-10`=83.3333% (#207, #208, #209, #212, #214 …). All get `padding-right/left:15px`, `min-height:1px`, `float:left`, `position:relative`.

### 2.7 x-editable inline editors (`editable-*`)

| State | Colour | Border | Font | Nodes |
|---|---|---|---|---|
| `.editable.editable-click` | `rgb(10,10,10)` (colour, border-top/right/left, outline) | `border-bottom: 1px dashed rgb(66,139,202)` | DEFAULTS 14/20 | #154, #158, #500, #576, #600, #676, … |
| `+ .editable-empty` | same | same | **`font-style:italic`** | #496, #510, #514, #518, #522, #526, … (all "empty" values) |
| all | `display:inline`, `cursor:pointer` | | | |

### 2.8 Tabs

| Part | Node | Box | Colour / border | Notes |
|---|---|---|---|---|
| `<ul>.nav.nav-tabs` | #60 | 1810×42 | border-bottom 1px solid `rgb(221,221,221)` | `list-style-type:none` |
| `<li>` (any) | #91–#96 | h 42; `float:left`; `margin-bottom:-1px`; `position:relative` | — | — |
| active tab `<a>` | #131 | 68.289×42; margin-right 2px; padding `10px 15px` | border 1px solid `rgb(221,221,221)` on top/right/left, **bottom `rgba(0,0,0,0)`**; radius top 4px; bg `rgb(255,255,255)`; text `rgb(85,85,85)` | `cursor:default` |
| inactive tab `<a>` | #132–#136 | same metrics | all 4 borders `rgba(0,0,0,0)`; radius top 4px; no bg | text `rgb(51,122,183)`; `cursor:pointer` |
| `.tab-content` | #61 | 1810×434.766; padding `10px 20px` | border **right/bottom/left** 1px solid `rgb(230,233,238)` (`border-top-style:solid` but width stays 0) | — |
| `.tab-pane` | #97 active / #98–#102 | 1768×393.766 active; hidden panes `display:none` | — | `ng-repeat="tab in tabs"`, `ng-class="{active: tab.active}"`, `tab-content-transclude="tab"` |

### 2.9 Modal (`#permissionsModal`, #27)

| Part | Node | Box | Colour / border |
|---|---|---|---|
| `.modal.fade` | #27 | `position:fixed`, inset 0, `z-index:1050`, `overflow:hidden`, `opacity:0`, `outline-width:0`, `transition: opacity .15s`; `display:none` | — |
| `.modal-dialog` | #33 | `width:600px`; `margin:30px auto`; `transition: transform .3s` | — |
| `.modal-content` | #42 | padding 20 | border 1px solid `rgba(0,0,0,0.2)`; radius 6px; bg `rgb(255,255,255)`; `background-clip:padding-box`; shadow `rgba(0,0,0,0.5) 0 5px 15px`; `outline-width:0` |
| `.modal-header` | #62 | padding 15 | border-bottom 1px solid `rgb(229,229,229)` |
| `.modal-body` | #63 | padding 15; `position:relative` | — |
| `.modal-footer.text-right` | #64 | padding 15 | border-top 1px solid `rgb(229,229,229)`; `text-align:right` |
| `.close` button | #103 | `float:right`; `margin-top:-2px` | colour `rgb(0,0,0)`; 21px/21px, weight 700; `text-shadow: rgb(255,255,255) 0 1px 0`; `opacity:0.2` |
| `.modal-title` h4 | #104 | — | 18px / 25.7143px, weight 500 |

### 2.10 Dropdown menu

`#465` `<ul>.dropdown-menu role="menu"`: `display:none`, `position:absolute`, `top:100%`, `left:0`, `z-index:1000`,
`min-width:160px`, `margin-top:2px`, padding-y 5px, border 1px solid `rgba(0,0,0,0.15)`, radius 2px,
bg `rgb(255,255,255)`, `background-clip:padding-box`, font 13px / 18.5714px, `text-align:left`,
shadow `rgba(0,0,0,0.176) 0px 6px 12px 0px`, `list-style-type:none`.

### 2.11 Tables

`.table.table-striped` (#174, #145, #183): `display:table`, `width:100%`/1768px, `max-width:100%`, `margin-bottom:20px`.
`<thead>`/`<tbody>`/`<tr>`/`<th>`: `display:table-header-group`/`table-row-group`/`table-row`/`table-cell`, `vertical-align:middle`.
`<th>` (#488–#492): padding `20px 8px`, `border-bottom: 1px solid rgb(221,221,221)`, `font-weight:700`, `text-align:left`, `vertical-align:bottom`.
Striping: odd rows get `background-color: rgb(249,249,249)` (#467, #469); even row #468 keeps the transparent DEFAULT.

### 2.12 Misc primitives

| Element | Node | Style |
|---|---|---|
| `<hr>` | #187, #211 | `box-sizing:content-box`; `height:0`; `margin:20px auto`; `border-top:1px solid rgb(238,238,238)`; other border colours `rgb(128,128,128)`; `overflow:hidden` |
| `<h3>` | #142, #188, #473 | 24px / 26.4px, weight 500; margin `20px 0 10px` (#473 overrides `margin-bottom:20px`, `text-align:center`) |
| `<h4>` | #182 | 18px / 19.8px, weight 500; margin `10px 0` |
| `<pre>` | #162 | h 130px; padding 9.5; border 1px solid `rgb(204,204,204)`; radius 4px; bg `rgb(245,245,245)`; font `Menlo, Monaco, Consolas, "Courier New", monospace` 13px/18.5714px; `white-space:pre`; `word-break:break-all`; `overflow:scroll` |
| `<fieldset>` | #137, #139, #141 | `margin-bottom:20px`; `padding-bottom:20px`; #141 adds `border-bottom:1px dashed rgb(238,238,238)` |
| `<label>` generic | many | `display:inline-block`; `max-width:100%`; `margin-bottom:5px`; `font-weight:700`; `cursor:default` |
| `.checkbox` wrapper | #202 | 1768×20; `margin:10px 0`; `position:relative` |
| checkbox `<label>` | #461, #462 | `min-height:20px`; `padding-left:20px`; `cursor:pointer`; #462 adds `margin-left:10px` |

---

## 3. Visibility census (my 720 records)

| Bucket | Count | Notes |
|---|---:|---|
| Records in range | **720** | #0 … #719 |
| Rect exactly `x=0 y=0 w=0 h=0` | **612** | 85.0% of the slice |
| Rect zero-area but positioned off-screen (`w=0 h=0`, x/y ≠ 0) | **2** | #19 `1,-9999`; #23 `1,-9984` (reCAPTCHA) |
| Rect with non-zero area (or non-zero height/width) | **106** | includes #39 `<br>` (0×16.5) and #53/#55/#171 (1810×0 / 1768×0) |
| Own `display:none` deviation | **45** | listed below |
| Own `visibility:hidden` deviation | **6** | #13, #16, #17, #18, #19, #23 — the entire reCAPTCHA subtree `r.12*` |
| **Actually painted on screen** | **≈102** | 106 non-zero-area minus the 4 non-zero-area but `visibility:hidden` reCAPTCHA nodes (#13, #16, #17, #18) |

**The 45 own-`display:none` nodes**, by region:
- **Head/scripts (12)**: #2–#12 (`<script>`), #21 (`<style>`) — never renderable.
- **Panel-title action buttons (3)**: #50 "Clone Room", #51 "Delete Room", #52 "Marketplace".
- **Panel-body conditionals (3)**: #40 (loading spinner, `ng-show="dataLoading"`), #54 (Date row, `roomType=='webinar'`), #56 (registration block).
- **Room-link block (1)**: #90 (App Pair Link, `sess.hasAppPairLink`).
- **Modal (1)**: #27 `#permissionsModal`.
- **Tabs (2 headers + 5 panes = 7)**: #92 (Text List li), #94 (SSO Setup li); panes #98, #99, #100, #101, #102.
- **Inside hidden panes (13)**: #143, #144, #145, #190, #480, #481 (User Stats/Settings sub-blocks), #465 (dropdown-menu), #193, #225, #226, #229–#233, #284, #389, #390 (`ng-show` settings rows).

**Why 612 zero rects but only 45 `display:none`:** everything under a `display:none` ancestor still reports a
`0,0 0×0` rect without its own deviation. The bulk is the **Settings pane** (`#102` hidden): its 226 row
wrappers `#224`–`#449` plus their contents `#493`–`#719` are all zero-rect purely by inheritance.

**Everything visible on screen lives in one column**: `x` 0→1842, `y` 0→821.8. Below `y≈822` the page is empty
(the `.app-container` is 1265 tall because of `min-height:100%`, but the panel ends at `y=821.8`).

---

## 4. Text content verbatim (DOM order, every user-visible string in my range)

Script/style text (not user-visible) is in §6. `∅` marks an empty interpolation (see §7).

### 4.1 Navbar
| Path | Node | Text |
|---|---|---|
| `r.0.0.0.1.0.0.0` | #44 | `Account` |
| `r.0.0.0.1.0.1.0` | #45 | *(no text — icon only)* |

### 4.2 Panel heading
| Path | Node | Text |
|---|---|---|
| `r.0.1.1.0.0.0.0` | #46 | `Manage Room id: 3625  ( 6a628a99731b9f77ae9bf505 )` |
| `r.0.1.1.0.0.0.1` | #47 | `Current : 0 / Max  0` |
| `r.0.1.1.0.0.0.2` | #48 | `Reset Counts` |
| `r.0.1.1.0.0.0.3` | #49 | `Launch` |
| `r.0.1.1.0.0.0.4` | #50 | `Clone Room` *(hidden)* |
| `r.0.1.1.0.0.0.5` | #51 | `Delete Room` *(hidden)* |
| `r.0.1.1.0.0.0.6` | #52 | `Marketplace` *(hidden)* |

### 4.3 Panel body form (visible unless noted)
| Path | Node | Text |
|---|---|---|
| `r.0.1.1.0.1.0.0.0` | #72 | `Room Title` |
| `r.0.1.1.0.1.0.0.1.0.0` | #154 | `Room 3625` |
| `r.0.1.1.0.1.0.1.0` | #74 | `Date:` *(hidden)* |
| `r.0.1.1.0.1.0.1.1.0.0` | #155 | `07/23/2026 @ 05:41 PM` *(hidden)* |
| `r.0.1.1.0.1.0.1.1.0.2` | #157 | `(NOTE: use your local time. It will be converted to the user's local time)` *(hidden, `<muted>` tag)* |
| `r.0.1.1.0.1.0.2.0` | #76 | `Authorization Mode` |
| `r.0.1.1.0.1.0.2.1.0.0` | #158 | `Open - Anyone with the room link can join with their email & name` |
| `r.0.1.1.0.1.0.3.0.0` | #115 | `Registration Link:` *(hidden)* |
| `r.0.1.1.0.1.0.3.2.0` | #117 | `Event Time (for email template):` *(hidden)* |
| `r.0.1.1.0.1.0.3.4.0` | #119 | `Email Preview:` *(hidden)* |
| `r.0.1.1.0.1.0.3.4.1.0` | #162 | `Hello __name__,\n\n                        This is a friendly reminder to attend the session "Room 3625".\n                        We'll get started at .\n                        Please click this link to attend: ______ unique link will be here_____` *(hidden; **at the 250-char cap → truncated**)* |
| `r.0.1.1.0.1.0.3.4.1.0.0` | #192 | `FILL TIME ABOVE` *(hidden)* |
| `r.0.1.1.0.1.0.3.4.1.1` | #163 | `Send Emails Now` *(hidden)* |
| `r.0.1.1.0.1.0.3.0.1.1.0` | #191 | `Copy` *(hidden)* |
| `r.0.1.1.0.1.0.4.0` | #84 | `Room Link:` |
| `r.0.1.1.0.1.0.4.1.1.0` | #164 | `Copy` |
| `r.0.1.1.0.1.0.4.2` | #86 | `Vanity Link:` |
| `r.0.1.1.0.1.0.4.3.1.0` | #165 | `Edit` |
| `r.0.1.1.0.1.0.4.3.1.1` | #166 | `Copy` |
| `r.0.1.1.0.1.0.4.4` | #88 | `Unique Link:` |
| `r.0.1.1.0.1.0.4.5.1.0` | #167 | `Generate` |
| `r.0.1.1.0.1.0.4.5.1.1` | #168 | `Copy` |
| `r.0.1.1.0.1.0.4.6.0` | #129 | `App Pair Link:` *(hidden)* |
| `r.0.1.1.0.1.0.4.6.1.1.0` | #199 | `Copy` *(hidden)* |
| `r.0.1.1.0.1.2.1` | #59 | `Loading...` *(hidden)* |

### 4.4 Tab strip
`Users` (#131) · `Text List` (#132, hidden) · `Branding (Logo / Landing Page)` (#133) · `SSO Setup` (#134, hidden) · `User Stats` (#135) · `Settings` (#136).
Same strings also appear as `heading="…"` attributes on #91–#96.

### 4.5 Users pane (visible)
| Path | Node | Text |
|---|---|---|
| `…3.1.0.0.1.0.0` | #458 | `Search Users` |
| `…3.1.0.0.1.0.2` | #460 | `Search / Load Users` |
| `…3.1.0.0.0.0.0` | #454 | `Add User / Invite` |
| `…3.1.0.0.0.0.1` | #455 | `Export` |
| `…3.1.0.0.0.0.2` | #456 | `Load / Reload Users` |
| `…3.1.0.0.2.1.0` | #463 | `Actions With Selected` |
| `…3.1.0.0.2.1.1` | #464 | `Actions With the Email List` |

### 4.6 Hidden panes
Text List: `Save List` (#175).
Branding: `Logo` (#207), `Upload/Change` (#471), `Reset` (#472), `Login Landing Page Editor` (#473).
SSO Setup: `SSO Host` (#213).
User Stats: `Load Stats` (#477), `Export` (#478), `Monthly report for date range` (#479), `Clear monthly report` (#480),
`Download monthly report` (#481), `Search Users` (#216), `Show Online Users Only` (#484), `Show  Only?` (#485, ∅),
`Show Mobile Only?` (#486), `Remove duplicates?` (#487), `No results to show. Select a date above...` (#142),
`Loading...` (#219), `Monthly report:  - Total Logins:` (#182, ∅) + `0` (#221), and table headers
`#` (#488), `Nick` (#489), `Email / IP` (#490), `Time Stamps` (#491), `Duration (Hours)` (#492).

Settings pane strings: see §5 (label + value + helper text per row). Plus the block footer:
`DON'T  These below unless you know what you are doing...` (#188) + `TOUCH` (#450) → renders "DON'T TOUCH These below…";
`Settings...` (#189); and the pair-link helpers
`Where to send users if the pairing succeeds` (#287), `Where to send users if the pairing fails` (#290),
`Enable this to prevent media server soft reset each night...` (#442),
`Use pub/sub for notifications` (#443),
`If user does not log in from regular site, mobile app token will expire after this many days` (#444),
`If user does not log in this many days, we'll stop sending push notifications` (#445),
`Sample link you would need to use to add each user: (replace email/name with the real user email/name` (#718).

### 4.7 Modal (hidden)
`Adjust Mic/Cam/Screen permissions for user:` (#104) · `×` (#147) · `Microphone` (#105) · `Screenshare` (#106) ·
`WebCam` (#107) · `AdminChat` (#108) · `CanEditNotes` (#109) · `Close` (#110) · `Save Changes` (#111).

---

## 5. AngularJS bindings (verbatim)

Attribute frequency across my 720 records: `class`×597, `href`×73, `onaftersave`×60, `ng-click`×32, `e-title`×32,
`ng-show`×30, `editable-checkbox`×30, `editable-textarea`×25, `e-label`×25, `style`×21, `src`×14, `ng-class`×14,
`id`×10, `ng-repeat`×9, `ng-model`×9, `name`×9, `value`×7, `tab-heading-transclude`×6, `tab-content-transclude`×6,
`readonly`×6, `heading`×6, `onclick`×5, `ng-change`×5, `ng-hide`×4, `ng-src`×2, `editable-text`×2, `ui-view`×2,
`tooltip`/`tooltip-placement`×2, `clear`×2, `autoscroll`×2, and singletons `ui-sref`, `text-angular`, `ng-transclude`,
`ng-init`, `ng-if`, `ng-href`, `ng-enter`, `ng-dblclick`, `ng-controller`, `editable-select`, `editable-number`,
`editable-combodate`, `e-ng-options`, `e-min-year`, `e-max-year`, `e-data-format`, `data-format`, `collapse`,
`data-toggle`, `data-ui-view`, `data-autoscroll`.

### 5.1 Structural / controller
| Node | Attribute (verbatim) |
|---|---|
| #0 | `ng-class = "{\n      'layout-fixed': app.layout.isFixed,\n      'layout-boxed': app.layout.isBoxed,\n      'layout-dock': app.layout.isDocked,\n      'layout-material': app.layout.isMaterial,\n      'aside-offscreen': app.sidebar.isOffscreen,\n      'footer-hidden': app.footer.hidden,\n      'in-app': !$state.includes` **← truncated at the 300-char attr cap** |
| #1 | `ng-controller = "CoreController"`, `data-ui-view = ""`, `data-autoscroll = "false"` |
| #15 | `ui-view = ""`, `autoscroll = "false"` |
| #22 | `ui-view = ""`, `autoscroll = "false"` |
| #25 | `collapse = "headerMenuCollapsed"` |
| #29 | `ng-show = "login.isLoggedIn"` |

### 5.2 Click / change handlers
`ng-click` (32): `doLogout()` (#45) · `resetMaxCount()` (#48) · `cloneRoom(sess._id)` (#50) · `deleteRoom(sess._id)` (#51) ·
`manageMarketplaceSession(sess._id, sess)` (#52) · `select()` (#131–#136, ×6) · `setCustomRoomURL()` (#165) ·
`setUniqueRoomURL()` (#167) · `sendWeminarEmailReminder(webinarTimeTxt)` (#163) · `saveUserPermissions()` (#111) ·
`saveTextList()` (#175) · `doInvite()` (#454) · `exportListToCSV()` (#455) · `loadUsers()` (#456) ·
`loadUsers(uSearch)` (#460) · `getCheckedAllUserIds()` (#461) · `actionsWithEmailList()` (#464) ·
`openFileChooser( 'logos') ` (#471) · `resetLogo() ` (#472) ·
`loadStats(statsDate,statsDateEnd,uSearchStat,filterFT,remDupes,showMobileStat)` (#477) ·
`exportStatsToCSV(statsDate)` (#478) · `loadMontlyStats(statsDate,statsDateEnd,false)` (#479) ·
`loadMontlyStats(statsDate,statsDateEnd,true)` (#480) · `downloadMontlyStats(statXrefsMontly)` (#481) ·
`exportSettingsToJSON()` (#493) · `loadSettingsFromRoom()` (#494) · `donttouchShow=!donttouchShow` (#450).
`ng-dblclick = "canCloneDblClick()"` (#46). `ng-enter = "loadUsers(uSearch)"` (#459).
`ng-change` (5): `toggleHasMic()` (#149) · `toggleHasScreen()` (#150) · `toggleHasCam()` (#151) ·
`toggleHasAdminChat()` (#152) · `toggleCanEditNotes()` (#153).
Native `onclick` (5): `copyLinkToClipboard('webinarLinkTxt')` (#164) · `…('customLinkTxt')` (#166) ·
`…('uniqueLinkTxt')` (#168) · `…('webinarRegLinkTxt')` (#191) · `…('appPairLink')` (#199).

### 5.3 Conditionals — `ng-show` / `ng-hide` / `ng-if`
| Expression | Node(s) | Rendered? |
|---|---|---|
| `login.isLoggedIn` | #29 | shown |
| `sess.canClone \|\| sess.isClonedRoom \|\| canCloneClicks` | #50 | hidden |
| `sess.isClonedRoom` | #51 | hidden |
| `ng-hide="disableMarketplace"` | #52 | hidden |
| `dataLoading` | #40 | hidden |
| `sess.roomType=='webinar'` | #54 | hidden |
| `sess.authMode=='registrationA' \|\| sess.authMode=='registrationM'` | #56 | hidden |
| `sess.authMode=='webinarRoom' \|\| sess.authMode=='open' \|\| sess.authMode=='unamePW' \|\| sess.allowPWLoginWithSSO` | #57 | **shown** |
| `sess.hasAppPairLink` | #90 | hidden |
| `sess.twillioApiToken` | #92 | hidden |
| `sess.authMode=='sso'` | #94 | hidden |
| `ng-hide="statXrefs.length>0 \|\| statXrefsMontly.length>0"` | #142 | (in hidden pane) |
| `loadingUsersStats` | #143 | hidden |
| `!loadingUsersStats && statXrefsMontly.length>0` | #144 | hidden |
| `!loadingUsersStats && statXrefs.length>0` | #145 | hidden |
| `statXrefs.length>0 \|\| true` | #180 | (in hidden pane) |
| `!webinarTimeTxt` / `webinarTimeTxt` | #192 / #193 | #193 hidden |
| `ng-hide="donttouchShow"` | #189 | (in hidden pane) |
| `donttouchShow` | #190 | hidden |
| `sess.authMode=='jwt'` | #225, #226, #229 | hidden |
| `sess.authMode=='webinarRoom' \|\| sess.allowPWLoginWithSSO` | #230, #231, #232 | hidden |
| `sess.authMode=='webinarRoom' \|\| sess.authMode=='unamePW' \|\| sess.allowPWLoginWithSSO` | #233 | hidden |
| `sess.hasAppPairLink && sess.pairSecretKey` | #284 | hidden |
| `sess.hasProfanityFilter` | #389, #390 | hidden |
| `statXrefsMontly.length===0` / `>0` | #479 / #480, #481 | #480/#481 hidden |
| `ng-if="completeUserList && completeUserList.length>0"` | #202 | **shown** (so `completeUserList` is non-empty) |

### 5.4 Repeats, models, transclusion
`ng-repeat` (9): `tab in tabs` (#97–#102, ×6); `user in xrefs  ` (#467, #468, #469, ×3).
`ng-model` (9): `userPermissions.hasMic` (#149), `userPermissions.hasScreen` (#150), `userPermissions.hasCam` (#151),
`userPermissions.hasAdminChat` (#152), `userPermissions.canEditNotes` (#153), `webinarTimeTxt` (#161),
`uSearch ` (#459), `uSearchStat ` (#482), `sess.description` (#474, on `text-angular`).
`ng-class` (14): `{active: active, disabled: disabled}` (#91–#96, ×6), `{active: tab.active}` (#97–#102, ×6),
`{'nav-stacked': vertical, 'nav-justified': justified}` (#60), plus body's layout map (#0).
`ng-transclude = ""` (#60); `tab-heading-transclude = ""` (#131–#136); `tab-content-transclude = "tab"` (#97–#102).
`ng-init = "showPins=true;"` (#174).
`ng-href` (1): #49 (see §6). `ng-src` (2): `/public/images/ptr_logo.png` (#43, #470).
`ui-sref = "page.welcome"` (#44). `tooltip = "Account Settings"` / `"Logout"` with `tooltip-placement="bottom"` (#44, #45).

### 5.5 x-editable bindings — the `sess` data model (rows .0–.60 of the Settings pane)

Every row is `<label class="col-sm-2 control-label">` + `<a editable-*>` + optional `<br>` + `<label class="muted">` helper.
`onaftersave` always calls `saveSessField('<field>')`.

| Row | Label (#) | Binding (#) | Kind | Rendered value | Helper text (#) |
|---|---|---|---|---|---|
| .1 | `JWT Secret Key:` #495 | `sess.ssoJWTSecret` #496 | textarea, `e-label="Secret:"` | `empty` | #498 `Use this key in combination with the WordPRess plugin, or other JWT SSO, make it hard to getss, like: '5081b73a690762e2526bc1fef3c46eedf1ec8832'` |
| .2 | `Allow PW based logins on SSO?` #499 | `sess.allowPWLoginWithSSO` #500 | checkbox | `No` | #502 `if ON, you can give a link and PW to enter the SSO room as well` |
| .4 | `Wordpress shortcode:` #503 | — | static span #504 | `[protradingroom room='6a628a99731b9f77ae9bf505' key='' link_text='Enter Room' mode='urlv3']` | — |
| .5 | `Token Expiration` #505 | `sess.tokenExpiresIn` #506 | textarea, `e-label="Expires In:"` | `1d` | #508 `A string like '1d', '1h', '12h" etc...` |
| .6 | `Room Password:` #509 | `sess.webinarPW` #510 | textarea | `empty` | #512 `Give this password to your  to enter the room.` |
| .7 | `Temp Room Password:` #513 | `sess.webinarPW2` #514 | textarea | `empty` | #516 |
| .8 | `Temp Room Password 2:` #517 | `sess.webinarPW3` #518 | textarea | `empty` | #520 |
| .9 | `Free Trial Password:` #521 | `sess.webinarPWFreeTrial` #522 | textarea | `empty` | #524 `Give this password to your` |
| .10 | `Delete Alert Password` #525 | `sess.deleteAlertPW` #526 | textarea | `empty` | #528 |
| .11 | `All Rooms Welcome Mat Password` #529 | `sess.allRoomsWelcomeMatPW` #530 | textarea | `empty` | #532 |
| .12 | `Password to Manage User's Notes` #533 | `sess.needPasswordForUserNotes` #534 | textarea | `empty` | #536 |
| .13 | `Nickname filter for members:` #537 | `sess.nickFilter` #538 | textarea | `empty` | #540 |
| .14 | `Custom Favicon` #541 | `sess.customFaviconURL` #542 | textarea | `empty` | — |
| .15 | `Overwrite Cash Register Sound` #543 | `sess.overwriteCashRegisterSound` #544 | **text**, `e-label="URL"` | `empty` | #546 `If set, it will play instead of the chash.mp3` |
| .16 | `Login Webhook URL` #547 | `sess.login_webhook_url` #548 | textarea | `empty` | — |
| .17 | `Logout Webhook URL` #549 | `sess.login_webhook_url` #550 ⚠ | textarea, `onaftersave="saveSessField('logout_webhook_url')"` | `empty` | — |
| .18 | `Membership filter:` #551 | `sess.allowedMemberships` #552 | textarea | `empty` | #554 |
| .19 | `Product filter:` #555 | `sess.allowedProducts` #556 | textarea | `empty` | #558 |
| .20 | `Permissions filter:` #559 | `sess.allowedPerms` #560 | textarea | `empty` | #562 |
| .21 | `Secret Token:` #563 | `sess.secTok` #564 | textarea | `empty` | #566 |
| .22 | `Custom Room Drive URL` #567 | `sess.custRoomDriveURL` #568 | textarea | `empty` | #570 |
| .23 | `Custom Logout URL` #571 | `sess.custLogoutURL` #572 | textarea | `empty` | #574 |
| .24 | `Show Roster ?` #575 | `sess.rosterVisibleToViewers` #576 | checkbox | **`Yes!`** | #578 |
| .25 | `Hide Welcome To Message?` #579 | `sess.hideWelcomeTo` #580 | checkbox | `No` | #582 |
| .26 | `Open link on login?` #583 | `sess.openLoginLink` #584 | textarea | `empty` | #586 |
| .27 | `Custom login error URL redirect` #587 | `sess.loginErrorURL` #588 | textarea | `empty` | #590 |
| .28 | `Custom login error message` #591 | `sess.loginErrorMsg` #592 | textarea, `e-title` | `empty` | #594 |
| .29 | `Show only Presenters in the roster?` #595 | `sess.onlyPresentersVisibleToViewers` #596 | checkbox | `No` | #598 |
| .30 | `Show Roster Count?` #599 | `sess.rosterCountVisibleToViewers` #600 | checkbox | **`Yes!`** | #602 |
| .31 | `Simulated Count?` #603 | `sess.simUserCount` #604 | **number** | `0` | #606 |
| .32 | `User PMs?` #607 | `sess.userPM` #608 | checkbox | `No` | #610 |
| .33 | `Enable Private Message History?` #611 | `sess.enablePrivateMessageHistory` #612 | checkbox | `No` | #614 |
| .34 | `Sound alert when a new message is posted?` #615 | `sess.dingOnNewMessage` #616 | checkbox | `No` | #618 |
| .35 | `Sound when the user joins/leaves?` #619 | `sess.beepOnUserJoin` #620 | checkbox | `No` | #622 |
| .36 | `Popup alert when the user joins/leaves?` #623 | `sess.userJoinAndLeavePopup` #624 | checkbox | `No` | #626 |
| .37 | `Hide User Avatars?` #627 | `sess.hideAvatars` #628 | checkbox | `No` | #630 |
| .38 | `Hide Mobile App Info?` #631 | `sess.hideAppInfo` #632 | checkbox | `No` | #634 |
| .39 | `Always Show User Roster?` #635 | `sess.alwaysShowRoster` #636 | checkbox | `No` | #638 |
| .40 | `Show Only Usernames in Roster?` #639 | `sess.showOnlyUsernames` #640 | checkbox | `No` | #642 |
| .41 | `Allow Users to Change their Usernames?` #643 | `sess.allowUsersToChangeUsername` #644 | checkbox | `No` | #646 |
| .42 | `Disable Editing Username` #647 | `sess.disableEditingUsername` #648 | checkbox (`e-title="Show Only Usernames in Roster?"` ⚠ copy-paste) | `No` | #650 |
| .43 | `Username Instructions` #651 | `sess.usernameInstructions` #652 | textarea | `empty` | #654 |
| .44 | `Forgot room password?` #655 | `sess.forgotRoomPassword` #656 | checkbox | `No` | #658 |
| .45 | `Tawk Presenter Support?` #659 | `sess.tawkPresenterSupport` #660 | checkbox | `No` | #662 |
| .46 | `User PM presenters?` #663 | `sess.userToPresenterPM` #664 | checkbox | `No` | #666 |
| .47 | `Chat Message Sound For Emails:` #667 | `sess.playChatMessageSoundFor` #668 | textarea | `empty` | #670 |
| .48 | `Alerts/Chat on bottom?` #671 | `sess.alertsChatOnBottom` #672 | checkbox | `No` | #674 |
| .49 | `Q&A on Alerts?` #675 | `sess.hasQAOnAlerts` #676 | checkbox | **`Yes!`** | #678 |
| .50 | `Alerts over screenshare?` #679 | `sess.alertsOverlayOnScreenshare` #680 | checkbox | `No` | #682 |
| .51 | `Copy Trades?` #683 | `sess.copyTrades` #684 | checkbox | `No` | #686 |
| .52 | `Disable Copy?` #687 | `sess.disableCopy` #688 | checkbox | `No` | #690 |
| .53 | `Claim Nickname?` #691 | `sess.claimNickName` #692 | checkbox | `No` | #694 |
| .54 | `Show typing indicator ?` #695 | `sess.hasTypingIndicator` #696 | checkbox | `No` | #698 |
| .55 | `Presenter chat messages on the right?` #699 | `sess.presenterMsgsOnTheRight` #700 | checkbox | `No` | #702 |
| .56 | `Alt Chat Render?` #703 | `sess.altChatRender` #704 | checkbox | `No` | #706 |
| .57 | `Alt Room Render?` #707 | `sess.altRoomRender` #708 | checkbox | `No` | #710 |
| .58 | `Pair Link For App?` #711 | `sess.hasAppPairLink` #712 | checkbox | `No` | #714 |
| .59 | `Pair Secret Key` #715 | `sess.pairSecretKey` #716 | textarea | `empty` | — |
| .60 | (hidden block #284) | — | — | — | #718 label + `<input#pairURLLink>` #719 |

Row .0 = `#224` holding `Export Settings` (#493) and `Load Settings From Room` (#494). Row .3 = `#227`, an empty `<p>`.

Other editable bindings outside the Settings pane:
`editable-text="sess.name"` `onaftersave="saveSessField('name')"` (#154);
`editable-combodate="sess.webinarDate"` `onaftersave="saveSessField('webinarDate')"` with
`e-max-year="2028"`, `e-min-year="2026"`, `e-data-format="DD-MM-YYYY h:mm a"`, `data-format="DD-MM-YYYY +-HH:mm"` (#155);
`editable-select="sess.authMode "` `e-ng-options="s.value as s.text for s in sessAuthTypes "`
`onaftersave="saveSessField('authMode')"` (#158).

**Full `sess` field list observed in my range** (60 `saveSessField` targets + conditionals):
`name`, `webinarDate`, `authMode`, `roomType`, `logoURL`, `description`, `canClone`, `isClonedRoom`,
`twillioApiToken`, `hasProfanityFilter`, `ssoJWTSecret`, `allowPWLoginWithSSO`, `tokenExpiresIn`, `webinarPW`,
`webinarPW2`, `webinarPW3`, `webinarPWFreeTrial`, `deleteAlertPW`, `allRoomsWelcomeMatPW`,
`needPasswordForUserNotes`, `nickFilter`, `customFaviconURL`, `overwriteCashRegisterSound`, `login_webhook_url`,
`logout_webhook_url`, `allowedMemberships`, `allowedProducts`, `allowedPerms`, `secTok`, `custRoomDriveURL`,
`custLogoutURL`, `rosterVisibleToViewers`, `hideWelcomeTo`, `openLoginLink`, `loginErrorURL`, `loginErrorMsg`,
`onlyPresentersVisibleToViewers`, `rosterCountVisibleToViewers`, `simUserCount`, `userPM`,
`enablePrivateMessageHistory`, `dingOnNewMessage`, `beepOnUserJoin`, `userJoinAndLeavePopup`, `hideAvatars`,
`hideAppInfo`, `alwaysShowRoster`, `showOnlyUsernames`, `allowUsersToChangeUsername`, `disableEditingUsername`,
`usernameInstructions`, `forgotRoomPassword`, `tawkPresenterSupport`, `userToPresenterPM`,
`playChatMessageSoundFor`, `alertsChatOnBottom`, `hasQAOnAlerts`, `alertsOverlayOnScreenshare`, `copyTrades`,
`disableCopy`, `claimNickName`, `hasTypingIndicator`, `presenterMsgsOnTheRight`, `altChatRender`, `altRoomRender`,
`hasAppPairLink`, `pairSecretKey`, `_id`.
Other scope vars: `dataLoading`, `loadingUsersStats`, `statXrefs`, `statXrefsMontly`, `xrefs`, `completeUserList`,
`uSearch`, `uSearchStat`, `statsDate`, `statsDateEnd`, `filterFT`, `remDupes`, `showMobileStat`, `webinarTimeTxt`,
`donttouchShow`, `canCloneClicks`, `disableMarketplace`, `hideLogo`, `showPins`, `userPermissions.*`, `sessAuthTypes`,
`tabs`, `login.isLoggedIn`, `app.layout.*`, `app.sidebar.isOffscreen`, `app.footer.hidden`.

---

## 6. Assets & data (and credential flags)

### 6.1 Scripts (all `display:none`)
| Node | src |
|---|---|
| #2 | `/public/dist/vendor.min.js?v=2.18.100` |
| #4 | `https://cdnjs.cloudflare.com/ajax/libs/adapterjs/0.15.5/adapter.min.js` (`integrity="sha512-8HaugtT+4c0rhgZIggNCv7I2N0u5OuCXQutD91XdRLqtBl4kD5z2B6QmHczDFMpeENZV060Fip3S954njcfv9A=="`, `crossorigin="anonymous"`) |
| #5 | `/public/vendor/janus3.js?v=2.18.100` — WebRTC (Janus) |
| #6 | `//vjs.zencdn.net/7.3.0/video.min.js` |
| #7 | `//cdnjs.cloudflare.com/ajax/libs/videojs-youtube/2.6.0/Youtube.min.js` |
| #8 | `https://cdnjs.cloudflare.com/ajax/libs/angularjs-toaster/2.2.0/toaster.min.js` |
| #9 | `https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.4.0/sockjs.min.js` |
| #10 | `https://w.soundcloud.com/player/api.js` (`type="text/javascript"`) |
| #11 | `/public/dist/app.min.js?v=1784623769671` |

Inline #3 (truncated at 250 chars): `var __h264 = 'false';\n    var __isReg = 'false';\n    if (typeof __h264 === 'boolean') {\n    } else {\n      __h264 = __h264 == 'true' ? true : false;\n    }\n    if (typeof __isReg === 'boolean') {\n    } else {\n      __isReg = __isReg == 'true' ? true :`
Inline #12 (truncated): `var __cver = '1784623769671';\n\n    var ua = navigator.userAgent.toLowerCase();\n\n    var is_chrome = ua.indexOf('chrome') > -1;\n    var is_firefox = ua.indexOf('firefox') > -1;\n    var is_msie = ua.indexOf('msie') > -1 || ua.indexOf('trident') > -1;\n `
Inline `<style>` #21: `body {\n        overflow: auto;\n    }`
App build version appears twice: asset query `?v=2.18.100` and cache-buster `1784623769671`.

### 6.2 Images
| Node | src | Rendered |
|---|---|---|
| #43 | `/public/images/ptr_logo.png` (`ng-src` identical, `height="35px"`, inline `max-width:200px; height:auto; max-height:40px`) | 199.992×24.539 @20,14.6 |
| #470 | `/public/images/ptr_logo.png` (`.navLogo`) | 0×0 (Branding pane hidden) |
| #58, #218 | `app/img/ajax_loader.gif` | 0×0 (hidden) |

### 6.3 iframes
| Node | src |
|---|---|
| #23 | `https://www.google.com/recaptcha/api2/bframe?hl=en&v=A7KpaEASfhDcK0nXxgQEyyYv&k=6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx&bft=0dAFcWeA4YbSQP1DurnKHZ3cEoiRDL6-QM4GOeI1w3Xu8NNITZpKY9_SvlEct1fp-xvB0KCgqwtFH6ltmvBtilk2sLo5IXAKB0yw` — `name="c-g8o2ifrad64d"`, `title="recaptcha challenge expires in two minutes"`, `frameborder="0"`, `scrolling="no"`, `sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation allow-modals allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"` |

⚠ **reCAPTCHA site key `6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx`** (public key, but record it) and a one-time `bft` token.

### 6.4 Links (`href`)
71 of the 73 `href` attributes are the literal empty string `""` (x-editable / JS-driven anchors). The two real ones:
- #44 `href="#/page/welcome"` + `ui-sref="page.welcome"` → account-settings route (the sibling dump's page).
- #49 `href` / `ng-href` = `/session?id=3625&jwtSite=<JWT>` with `target="_blank"`.

### 6.5 Form fields / ids (10 ids in range)
| id | Node | Type | Value / binding |
|---|---|---|---|
| `webinarLinkTxt` | #123 | text, readonly | `https://protradingroom.com/u/6a628a99731b9f77ae9bf505` |
| `customLinkTxt` | #125 | text, readonly | `https://protradingroom.com/room/[yournamehere]` |
| `uniqueLinkTxt` | #127 | text, readonly | `https://protradingroom.com/room/[youruniquelinkhere]` |
| `webinarRegLinkTxt` | #159 | text, readonly | `https://protradingroom.com/r/6a628a99731b9f77ae9bf505` |
| `appPairLink` | #169 | text, readonly | `https://protradingroom.com/room/` |
| `pairURLLink` | #719 | text, readonly | `https://chat.protradingroom.com/ptr_app/sessions/v2/addUser/6a628a99731b9f77ae9bf505/?sec=&email=__userEmail__&name=__userName__` |
| `textListTxt` | #176 | textarea rows=40 | — |
| `chatLogLoading` | #181 | div | — |
| `permissionsModal` | #27 | modal | — |
| `permissionsModalLabel` | #104 | h4 | — |
Unnamed fields: search `<input name="title">` (#459, `ng-model="uSearch "`), stats search (#482, `name="title "`, `required=" "`),
webinar time (#161, placeholder `at 7pm EST`), 5 permission checkboxes `name="checkbox"` (#149–#153).

### 6.6 Live session data / identifiers
| Datum | Value | Evidence |
|---|---|---|
| Room numeric id | `3625` | #46 text; #49 href `?id=3625`; #154 "Room 3625" |
| Room ObjectId | `6a628a99731b9f77ae9bf505` | #46, #123, #159, #504, #719 |
| Room title | `Room 3625` | #154 (`sess.name`) |
| Auth mode | `Open - Anyone with the room link can join with their email & name` | #158 (`sess.authMode`, and #57 shown proves `authMode=='open'`) |
| Occupancy | `Current : 0 / Max  0` | #47 |
| Webinar date field | `07/23/2026 @ 05:41 PM` (row hidden — not a webinar room) | #155 |
| Users listed | 3 rows in `xrefs` | #467, #468, #469 |
| Host domains | `protradingroom.com`, `chat.protradingroom.com` | #123, #719 |

⚠ **CREDENTIAL — `#49` (`nodes-000.txt #49 path=r.0.1.1.0.0.0.3`)** carries a live signed JWT in both `ng-href` and
`href`, truncated by the capture at 300 chars:
`/session?id=3625&jwtSite=[REDACTED_CAPTURE_JWT]…`
Decoded payload (base64, plainly readable in the dump): `{"name":"[OWNER_JWT_NAME]","email":"[OWNER_EMAIL]","id":"[OWNER_USER_ID]","type":"site","issued":1784840082215,"iat":1784840082,"exp":1815944082}`.
→ **User ObjectId `[OWNER_USER_ID]`**, HS256, ~1-year expiry. Treat as a secret; do not echo into the rebuild.

All password/secret fields in the Settings pane render `empty` (#496, #510, #514, #518, #522, #526, #530, #534,
#564, #716) — i.e. no real secrets are exposed there. The strings
`'5081b73a690762e2526bc1fef3c46eedf1ec8832'` (#498, #566) are **documentation examples**, not live keys.

---

## 7. Honest gaps

1. **Capture truncation caps.** Attribute values are cut at **300 characters**, text at **250 characters**.
   Affected nodes in my range: #0 (`ng-class`, ends `'in-app': !$state.includes`), #49 (`href` and `ng-href`,
   JWT signature cut at `AqpORjtpJqPb-q`), #3 and #12 (inline script text), #162 (`<pre>` email template, ends
   `______ unique link will be here_____`). Their full values are **not recoverable from this slice**.
2. **Empty interpolations (`∅`).** Several strings have a gap where an Angular binding produced nothing:
   `Current : 0 / Max  0` (#47 — a value between "Current :" and "0"), `Show  Only?` (#485),
   `Monthly report:  - Total Logins:` (#182, filled by `<strong>` #220 which is empty and #221 = `0`),
   `Give this password to your  to enter the room.` (#512), `Give this password to your` (#524),
   `DON'T  These below…` (#188 — the gap is the child `<span>` "TOUCH" #450, so it renders correctly).
   These are genuine runtime-empty bindings, not decoder loss.
3. **`::before` glyphs.** FontAwesome `::before` `content` values are captured as private-use codepoints that print
   as `""` in the slice (e.g. #44, #45, #65–#71, #194–#198). The **icon identity is only knowable from the class**
   (`fa-cog`, `fa-power-off`, `fa-user`, `fa-refresh`, `fa-external-link`, `fa-copy`, `fa-trash`, `fa-credit-card`,
   `fa-edit`, `fa-link`, `fa-save`). The exact codepoints are an honest gap.
4. **Depth boundary at #719 (this is a *depth* cut, not a *position* cut).** Because the dump is depth-major, my
   range ends mid-layer-13 and **every deep component is truncated at the same depth**, not at some point in
   reading order. Subtrees that start inside my range but whose contents are in the next slice, with the deepest
   path I actually hold for each:
   | Truncated component | Deepest node I hold | What's missing |
   |---|---|---|
   | Users table header | `#466` `r.0.1.1.0.1.3.1.0.0.3.0.0` | all `<th>` cells |
   | Users table rows ×3 | `#467`–`#469` `…3.1.0` / `.1` / `.2` | all `<td>` cells + per-row controls |
   | "Actions With Selected" menu | `#465` `r.0.1.1.0.1.3.1.0.0.2.1.2` | all `<li>` menu items |
   | `text-angular` WYSIWYG | `#474` `r.0.1.1.0.1.3.1.2.0.0.5.1` | entire toolbar + editable body |
   | Settings rows .61–.225 | `<p>` `#285`–`#449` | label/editable/helper of 165 rows |
   | Stats + monthly tables | `#185`, `#222` | all rows |
   | SSO Host value | `#475` `r.0.1.1.0.1.3.1.3.0.0.1.0` | the `<p>`'s editable contents |
   Because of this I describe **no** component above as complete unless §1.0 marks it ✅.
5. **`#22` inline style `background-color: 0A0A0A;`** is invalid CSS (missing `#`); the computed background stays
   the transparent DEFAULT. I record it as authored-but-inert, not as a colour.
6. **Two suspected upstream bugs, recorded not fixed**: #550 binds `editable-textarea="sess.login_webhook_url"`
   while saving `logout_webhook_url`; #648 uses `e-title="Show Only Usernames in Roster?"` on the
   "Disable Editing Username" row.
7. **`#43` logo**: `ng-hide="hideLogo || !sess.logoURL"` yet the image renders — so `sess.logoURL` is truthy, but the
   *resolved* `src` is the default `/public/images/ptr_logo.png`. Whether `sess.logoURL` equals that path or the
   `ng-src` simply was not overridden is **not determinable from this slice**.
8. **`.panel-footer` (#32)** has no text and no element children anywhere in the capture, yet occupies 1840×21.
   If the reference screenshot shows content there, it was not captured.
9. **No `<html>`/`<head>` records** — the dump root is `<body>` (`path=r`). Page `<title>`, favicon, meta and all
   stylesheet links are outside this capture entirely.
10. **`ng-class` on `<body>`** proves layout modes exist (`layout-fixed`, `layout-boxed`, `layout-dock`,
    `layout-material`, `aside-offscreen`, `footer-hidden`, `in-app`) but only `footer-hidden` is applied here;
    what the others do is unknown from this slice.

---

## Verification

- **Files read, in full, line by line, by me (no delegation):**
  1. `/tmp/ptr-decode/ptr1/caps/00-baseline-room/DEFAULTS.txt` — 101 lines (read to line 101, EOF).
  2. `/tmp/ptr-decode/ptr1/caps/00-baseline-room/INFO.txt` — 9 lines (read to line 9, EOF).
  3. `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-000.txt` — 1798 lines, read in 2 passes (1–1346, 1347–1798). Records #0–#119.
  4. `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-001.txt` — 2006 lines, read in 2 passes (1–1100, 1100–2006). Records #120–#239.
  5. `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-002.txt` — 964 lines, single pass to EOF. Records #240–#359.
  6. `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-003.txt` — 1415 lines, single pass to EOF. Records #360–#479.
  7. `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-004.txt` — 1765 lines, read in 2 passes (1–1000, 1000–1765). Records #480–#599.
  8. `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-005.txt` — 1623 lines, read in 2 passes (1–900, 900–1623). Records #600–#719.
- **Total lines read: 9681.** Total node records covered: **720**, first `#0 path=r <body>`, last
  `#719 path=r.0.1.1.0.1.3.1.5.0.0.60.2#pairURLLink <input>`. I reached the final line of every file.
- Census figures in §3 were cross-checked with `grep`/`awk` counts over these same six files
  (720 records; 612 exactly-zero rects; 2 zero-area off-origin; 106 non-zero-area; 45 `display:none`; 6 `visibility:hidden`) — the arithmetic closes: 612 + 2 + 106 = 720.
- **Ordering claim verified independently on my own slice**: walking all 720 records in file order, depth
  (= path segment count) never decreases — **zero backward steps** — and each depth forms one contiguous `#index`
  block (§0.2 table). This confirms the coordinator's correction that the array is breadth-first by depth, and my
  range is depths 1–13 (the shallowest nodes of *every* region), not the first regions in reading order. Every
  tree in this document was reconstructed from `path`, never from `#index` adjacency.
- **Flex/grid claim verified**: `DEFAULTS.txt` lines 22–33 show 1 distinct value / 2156 nodes for all twelve
  flex/grid properties, and a grep of my 720 records for flex/grid deviations or `display:flex|inline-flex|grid|inline-grid`
  returned **zero hits**. I report float/position/display instead (§0.3).
- I did **not** read `evidence-dumps/NEXT-STEP/ptr1.json`, any other agent's slice, or any other capture directory, and I did
  **not** re-run the decoder or spawn any sub-agent.

---

# PART: ptr1-parts/02-baseline-720-1439.md

# ptr1 baseline-room — decode of node records #720 … #1439

**Source capture:** `evidence-dumps/NEXT-STEP/ptr1.json` → decoded slices in
`/tmp/ptr-decode/ptr1/caps/00-baseline-room/`.
Capture metadata (`INFO.txt` lines 1-9): `capture index 0`, `label baseline-room`,
`ts 2026-07-24T15:59:18.276Z`, `kind fullDom`, `node count 2156 (declared 2156, truncated=false)`,
`themeClass "footer-hidden"`, `viewport {"w":1842,"h":1265,"dpr":2}`, `cssVars {"root":{},"body":{}}`
(**confirms: zero CSS custom properties**), `emitted as FULL node dump`.

**My slice:** records **#720 – #1439** (720 records) across six files:
`nodes-006.txt` (#720-839), `nodes-007.txt` (#840-959), `nodes-008.txt` (#960-1079),
`nodes-009.txt` (#1080-1199), `nodes-010.txt` (#1200-1319), `nodes-011.txt` (#1320-1439).

**How to read every style claim in this document.** A node record prints ONLY the properties that
differ from the COMMON table in `DEFAULTS.txt`. Unless a property is listed as a deviation below, its
value is the DEFAULTS value. The DEFAULTS values that matter most for this slice
(`DEFAULTS.txt` lines 6-100):

| prop | COMMON value | prop | COMMON value |
|---|---|---|---|
| `display` | `block` | `color` | `rgb(51, 51, 51)` |
| `visibility` | `visible` | `font-family` | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| `position` | `static` | `font-size` | `14px` |
| `box-sizing` | `border-box` | `font-weight` | `400` |
| `background-color` | `rgba(0, 0, 0, 0)` | `line-height` | `20px` |
| `background-image` | `none` | `letter-spacing` | `normal` |
| all `border-*-width` | `0px` | `text-align` | `start` |
| all `border-*-style` | `none` | `white-space` | `normal` |
| all `border-*-color` | `rgb(51, 51, 51)` | `vertical-align` | `baseline` |
| all `border-*-radius` | `0px` | `overflow-x/y` | `visible` |
| all `margin-*` | `0px` | `box-shadow` | `none` |
| all `padding-*` | `0px` | `opacity` | `1` |
| `z-index` | `auto` | `cursor` | `auto` |
| `float` | `none` | `transform` | `none` |
| `width` / `height` | `auto` | `outline-color` | `rgb(51, 51, 51)` |

Note also: `flex`, `flex-direction`, `align-items`, `justify-content`, `gap`, `order`,
`grid-template-columns` are **`2156/2156` at their initial values** (`DEFAULTS.txt` lines 22-33) —
**there is no flexbox and no CSS grid anywhere in this 2,156-node page.** Layout is Bootstrap-3
floats + tables. This is a hard, whole-capture fact, not an inference from my slice.

---

## 0. Structural key: the dump is BREADTH-FIRST

Verified over all 720 of my records: records **#720-#1289** all have paths of **13 dot-segments**
(DOM depth 12) and records **#1290-#1439** all have **14 dot-segments** (depth 13). The boundary is
exact — `nodes-010.txt #1289 path=r.0.1.1.0.1.3.1.5.0.4.0.61` (13 segments) is immediately followed
by `nodes-010.txt #1290 path=r.0.1.1.0.1.3.1.0.0.0.0.0.0` (14 segments).

**Consequence for anyone rebuilding from this dump: sibling order within a parent is preserved, but
index order is NOT document order.** A node's children appear hundreds of records later. Reassemble
by `path`, never by `#index`.

Every node in my slice descends from **`r.0.1.1.0.1.3.1`**. Its children `.0 … .5` are the
manage-session tab panes:

| path prefix | records in my slice | count | what it is |
|---|---|---|---|
| `r.0.1.1.0.1.3.1.0.0.*` | #1290-#1329 | 40 | **Users pane — the ONLY rendered pane** (all 29 non-zero rects) |
| `r.0.1.1.0.1.3.1.2.0.0.5.*` | #1330-#1334 | 5 | textAngular rich-text (room description) editor |
| `r.0.1.1.0.1.3.1.3.0.0.1.0.0` | #1335 | 1 | SSO host editable |
| `r.0.1.1.0.1.3.1.4.0.*`, `.4.4.0.*` | #1336-#1348 | 13 | second user/stats pane (icon toolbar + filter checkboxes) |
| `r.0.1.1.0.1.3.1.5.0.0.*` | #720-#1227, #1349-#1355 | 515 | **Session Settings form** (general) |
| `r.0.1.1.0.1.3.1.5.0.4.0.*` | #1228-#1289, #1356-#1439 | 146 | **Session Settings form (advanced / server / cluster block)** |

661 of my 720 nodes (91.8%) belong to the Settings form and every one of them has a zero rect.

### 0.1 What my band actually holds — every component is cut at BOTH ends

My 720 records span exactly **two DOM depths: 12 (13 path segments) and 13 (14 path segments)**.
Nothing shallower, nothing deeper. Measured per region from my own files:

| region (path prefix) | nodes | shallowest path I hold | deepest path I hold | depths held |
|---|---|---|---|---|
| `r.0.1.1.0.1.3.1.5.*` (Settings) | 661 | `r.0.1.1.0.1.3.1.5.0.0.61.0` (#720, 13 seg) | `r.0.1.1.0.1.3.1.5.0.0.0.0.0` (#1349, 14 seg) | **12 and 13** |
| `r.0.1.1.0.1.3.1.0.*` (Users pane) | 40 | `r.0.1.1.0.1.3.1.0.0.0.0.0.0` (#1290, 14 seg) | same (14 seg) | **13 only** |
| `r.0.1.1.0.1.3.1.4.*` (Stats pane) | 13 | `r.0.1.1.0.1.3.1.4.0.0.0.0.0` (#1336, 14 seg) | same (14 seg) | **13 only** |
| `r.0.1.1.0.1.3.1.2.*` (textAngular) | 5 | `r.0.1.1.0.1.3.1.2.0.0.5.0.0` (#1330, 14 seg) | same (14 seg) | **13 only** |
| `r.0.1.1.0.1.3.1.3.*` (SSO) | 1 | `r.0.1.1.0.1.3.1.3.0.0.1.0.0` (#1335, 14 seg) | same (14 seg) | **13 only** |

**Read that carefully: for the Users pane, the Stats pane, the textAngular editor and the SSO
field I hold exactly ONE depth level.** Every one of those "components" is a horizontal cross-section
— I have some of their middles and none of their tops or bottoms. Their ancestors are in records
**#0–719** and their leaves are in **#1440–2155**; both are other agents' slices, which I did not
read. Nothing in §1 or §2 should be taken as a complete component. Where I describe a widget
(a dropdown, a table row, an editor) I am describing the nodes at one depth that belong to it.

The upper boundary is independently corroborated: my last record, `nodes-011.txt #1439
path=r.0.1.1.0.1.3.1.5.0.4.0.32.1`, has 14 segments = depth 13, and the agent owning #1440–2155
measures #1440 at depth 13 rising monotonically to depth 20 at #2155. The band is continuous
across the handoff with no gap and no overlap.

**Corollary for §1.1 / §1.2:** the contiguous `#index` spans I list for each form-group *are* safe to
rely on, but only because those nodes are same-depth siblings under one parent — BFS keeps siblings
adjacent. They are **not** document order and must not be read as such.

---

## 1. DOM outline

### 1.1 Settings form, general block — `r.0.1.1.0.1.3.1.5.0.0.<N>`

`<N>` is the form-group index. My slice covers **N = 61 … 225** (the sibling-group tail; groups
0-60 are another agent's range). The repeating unit is rigid:

```
r.0.1.1.0.1.3.1.5.0.0.<N>.0   <label class="col-sm-2 control-label">   field caption
r.0.1.1.0.1.3.1.5.0.0.<N>.1   <a href="" editable-* onaftersave=…>     x-editable control
r.0.1.1.0.1.3.1.5.0.0.<N>.2   <br>            (sometimes a <label> helper instead)
r.0.1.1.0.1.3.1.5.0.0.<N>.3   <label class="muted"> or bare <label>    helper text
```

Group indices present in my range, with their record spans (contiguous, no gaps except where the
capture shows a group has no `.2/.3` children):

`61`(#720-721) `64`(#722-723) `67`(#724-727) `68`(#728-731) `69`(#732-735) `70`(#736-739)
`71`(#740-743) `72`(#744-747) `73`(#748-751) `74`(#752-755) `75`(#756-759) `76`(#760-763)
`77`(#764-767) `78`(#768-771) `79`(#772-775) `80`(#776-779) `81`(#780-783) `82`(#784-787)
`83`(#788-791) `84`(#792-795) `85`(#796-799) `86`(#800-803) `87`(#804-807) `88`(#808-811)
`89`(#812-815) `90`(#816-817) `91`(#818-821) `92`(#822-825) `93`(#826-829) `94`(#830-833)
`95`(#834-837) `96`(#838-841) `97`(#842-845) `98`(#846-849) `99`(#850-853) `100`(#854-855)
`101`(#856-859) `102`(#860-863) `103`(#864-867) `104`(#868-871) `105`(#872-875) `106`(#876-879)
`107`(#880-883) `108`(#884-887) `109`(#888-891) `110`(#892-895) `111`(#896-899) `112`(#900-903)
`113`(#904-907) `114`(#908-911) `115`(#912-915) `116`(#916-919) `117`(#920-923) `118`(#924-927)
`119`(#928-931) `120`(#932-935) `121`(#936-939) `122`(#940-943) `123`(#944-945) `124`(#946-947)
`125`(#948-949) `126`(#950-953) `127`(#954-957) `128`(#958-961) `129`(#962-963) `130`(#964-965)
`131`(#966-967) `132`(#968-969) `133`(#970-971) `134`(#972-975) `135`(#976-977) `136`(#978-979)
`137`(#980-982) `138`(#983-985) `139`(#986) `140`(#987-988) `141`(#989-990) `142`(#991-992)
`143`(#993-994) `144`(#995-996) `145`(#997-998) `146`(#999-1000) `147`(#1001-1002)
`148`(#1003-1004) `149`(#1005-1008) `150`(#1009-1012) `151`(#1013-1016) `152`(#1017-1020)
`153`(#1021-1024) `154`(#1025-1026) `155`(#1027-1030) `156`(#1031-1034) `157`(#1035-1038)
`158`(#1039-1042) `159`(#1043-1046) `160`(#1047-1050) `161`(#1051-1054) `162`(#1055-1058)
`163`(#1059-1062) `164`(#1063-1066) `165`(#1067-1069) `166`(#1070-1072) `167`(#1073-1076)
`168`(#1077-1080) `169`(#1081-1084) `170`(#1085-1086) `171`(#1087-1088) `172`(#1089-1090)
`173`(#1091-1094) `174`(#1095-1098) `175`(#1099-1102) `176`(#1103-1106) `177`(#1107-1110)
`178`(#1111-1114) `179`(#1115-1118) `180`(#1119-1122) `181`(#1123-1126) `182`(#1127-1130)
`183`(#1131-1134) `184`(#1135-1138) `185`(#1139-1142) `186`(#1143-1146) `187`(#1147-1150)
`188`(#1151-1152) `189`(#1153-1154) `190`(#1155-1156) `191`(#1157-1158) `192`(#1159-1160)
`194`(#1161-1162) `195`(#1163-1164) `196`(#1165-1166) `197`(#1167-1168) `198`(#1169-1170)
`199`(#1171-1172) `200`(#1173-1174) `201`(#1175-1176) `202`(#1177-1178) `203`(#1179-1180)
`205`(#1181-1182) `206`(#1183-1184) `207`(#1185-1186) `208`(#1187-1188) `209`(#1189-1190)
`210`(#1191-1192) `211`(#1193-1194) `212`(#1195-1196) `213`(#1197-1199) `214`(#1200-1203)
`215`(#1204-1205) `216`(#1206-1207) `217`(#1208-1209) `219`(#1210-1211) `220`(#1212-1213)
`221`(#1214-1215) `222`(#1216-1219) `223`(#1220-1221) `224`(#1222-1223) `225`(#1224-1227)

**Missing group indices inside my range: 62, 63, 65, 66, 193, 204, 218.** These siblings exist in the
DOM numbering but produced no captured node at this depth. Treated as an honest gap (§7), not
invented.

Depth-13 descendants of this block that fall in my slice: `#1349` (`5.0.0.0.0.0` `<i class="fa
fa-floppy-o">`), `#1350` (`5.0.0.0.1.0` `<i class="fa fa-plus">`), `#1351`/`#1352`
(`5.0.0.6.3.0`/`.1` underlined `<span>`s), `#1353` (`5.0.0.9.3.0` `<span>`), `#1354`
(`5.0.0.138.2.0` `<i class="fa fa-random">` inside the *New Secret* button), `#1355`
(`5.0.0.163.0.0` `<i class="fa fa-gear ms-2 cursor-pointer">`).

### 1.2 Settings form, advanced/server block — `r.0.1.1.0.1.3.1.5.0.4.0.<N>`

Depth-12 children `<N> = 0 … 61` are #1228-#1289: a run of `<p class="form-control-static">`
paragraphs, seven `<hr>` rules, two bare `<div>`s, a `ng-show="showAdServer"` div, and plain `<p>`
section intros. Depth-13 children #1356-#1439 are the actual label/editable/br/helper quadruples for
this block (groups `0,1,2,3,4,6,7,9,11,12,13,14,15,16,18,19,22,23,25,26,27,28,31,32`).

**Advanced-block group indices present at depth 13: 0,1,2,3,4,6,7,9,11,12,13,14,15,16,18,19,22,23,25,26,27,28,31,32.**
Missing: 5,8,10,17,20,21,24,29,30 — honest gap (§7).

### 1.3 Users pane — `r.0.1.1.0.1.3.1.0.0.*` (the visible pane)

```
r.0.1.1.0.1.3.1.0.0.0.*        toolbar row  (y = 381 … 449)
  .0.0.0.0.0   #1290  <i class="fa fa-user-plus" aria-hidden="true">    16×14 @ (1243.7, 381)
  .0.0.0.1.0   #1291  <i class="fa fa-floppy-o" aria-hidden="true">     12×14 @ (1398.2, 381)
  .0.0.0.2.0   #1292  <i class="fa fa-refresh">                         12×14 @ (1485.2, 381)
  .0.0.0.3.0   #1293  <button class="btn btn-md dropdown-toggle btn-primary mt">
                        "User List Actions"                          148.09×34 @ (1230.7, 415)
  .0.0.0.3.1   #1294  <ul role="menu" class="dropdown-menu">            display:none  (0×0)

r.0.1.1.0.1.3.1.0.0.2.*        filter row  (y = 426.5 … 475.4)
  .0.0.2.0.0.0 #1295  <input type="checkbox" ng-click="getCheckedAllUserIds()"
                             ng-checked="checkedAllUsers">              13×13 @ (37, 429)
  .0.0.2.0.0.1 #1296  <span ng-if="!checkedAllUsers">"Select All"     58.3×16.5 @ (57, 426.5)
  .0.0.2.0.1.0 #1297  <input type="checkbox" ng-model="applyToAllRooms"
                             ng-change="toggleApplyToAllRooms()">       13×13 @ (129.2, 429)
  .0.0.2.0.1.1 #1298  <span>"Apply to all rooms?"                    120.9×16.5 @ (149.2, 426.5)
  .0.0.2.1.0.0 #1299  <span class="caret">                               8×4  @ (195.7, 471.4)
  .0.0.2.1.2.0 … .9   #1300-#1309  <li> ×10                             0×0 (menu closed)

r.0.1.1.0.1.3.1.0.0.3.*        users table  (thead y = 489, tbody rows y = 549.5 / 590.5 / 652.9)
  .0.0.3.0.0.0 … .4   #1310-#1314  <th> ×5
  .0.0.3.1.0.0 … .4   #1315-#1319  <td> ×5   row index 0
  .0.0.3.1.1.0 … .4   #1320-#1324  <td> ×5   row index 1
  .0.0.3.1.2.0 … .4   #1325-#1329  <td> ×5   row index 2
```

### 1.4 textAngular editor pane — `r.0.1.1.0.1.3.1.2.0.0.5.*`

```
.5.0.0  #1330  <button class="btn btn-info pull-right" ng-click="htmlDescChanged() ">
                 "Save Editor Changes"
.5.1.0  #1331  <div text-angular-toolbar="" name="textAngularToolbar7346242129359551"
                    class="ng-scope ng-isolate-scope ta-toolbar btn-toolbar">
.5.1.1  #1332  <div class="ta-scroll-window ng-scope ta-text ta-editor form-control"
                    ng-hide="showHtml">
.5.1.2  #1333  <textarea id="taHtmlElement7346242129359551" ng-show="showHtml" ta-bind="ta-bind"
                    ng-model="html" class="… ta-bind ta-html ta-editor form-control ng-hide">
.5.1.3  #1334  <input type="hidden" tabindex="-1" style="display: none;" name="wysiswyg-editor" value="">
```

### 1.5 SSO pane — `r.0.1.1.0.1.3.1.3.0.0.1.0.0`

`#1335 <a href="" editable-text="sess.ssoHost" onaftersave="saveSessField('ssoHost')">` text `"empty"`.

### 1.6 Stats/second-users pane — `r.0.1.1.0.1.3.1.4.*`

```
.4.0.0.0.0   #1336  <p class="form-control-static">
.4.0.0.0.1   #1337  <p class="form-control-static">
.4.0.0.1.0   #1338  <i class="fa fa-user-plus" aria-hidden="true">
.4.0.0.2.0   #1339  <i class="fa fa-floppy-o" aria-hidden="true">
.4.0.0.3.0   #1340  <i class="fa fa-users"    aria-hidden="true">
.4.0.0.4.0   #1341  <i class="fa fa-trash"    aria-hidden="true">
.4.0.0.5.0   #1342  <i class="fa fa-download" aria-hidden="true">
.4.0.1.1.2.0 #1343  <input type="checkbox" ng-model="filterOnline">
.4.0.1.1.3.0 #1344  <input type="checkbox" ng-model="filterFT">
.4.0.1.1.3.1 #1345  <span class="badge badge-danger">"Free Trials"
.4.0.1.1.4.0 #1346  <input type="checkbox" ng-model="showMobileStat">
.4.0.1.1.5.0 #1347  <input type="checkbox" ng-model="remDupes">
.4.4.0.0.3.0 #1348  <a href="" ng-click="reverseStatSort()">"Reverse"
```

The full 720-row outline (index / path / tag / class / id / rect) is **Appendix A**.

---

## 2. Region & component inventory

All colours below are the literal `rgb()`/`rgba()` strings printed in the capture. Anything not
listed is the DEFAULTS value.

### 2.1 `label.col-sm-2.control-label` — the field caption (180 instances in my slice)

Representative: `nodes-006.txt #720 path=r.0.1.1.0.1.3.1.5.0.0.61.0`. Identical 10-property
deviation set on every instance.

| property | value |
|---|---|
| position | `relative` |
| float | `left` |
| width | `16.6667%` |
| max-width | `100%` |
| min-height | `1px` |
| margin-bottom | `5px` |
| padding-right / padding-left | `15px` / `15px` |
| font-weight | `700` |
| cursor | `default` |
| *(display)* | `block` (DEFAULTS) |
| *(color)* | `rgb(51, 51, 51)` (DEFAULTS) |
| *(font)* | `14px / 20px "Helvetica Neue", Helvetica, Arial, sans-serif` (DEFAULTS) |
| *(border / radius / shadow / bg)* | none / 0 / none / `rgba(0, 0, 0, 0)` (DEFAULTS) |

This is Bootstrap 3 `col-sm-2` (2/12 = 16.6667%) with the standard 15px gutter. There is **no
`text-align: right`** — `text-align` is not deviated, so it stays `start`. That contradicts stock
`.control-label` in a `.form-horizontal`; the caption is **left-aligned**.

### 2.2 Helper text label (`class="muted"`, 69 instances) and bare `<label>` helper (40 instances)

*(`<label>` census across my 720 nodes: 289 total = 180 `col-sm-2 control-label` + 69 `muted` + 40 no-class.)*

Representative `.muted`: `nodes-006.txt #727 path=r.0.1.1.0.1.3.1.5.0.0.67.3`.
Representative bare: `nodes-006.txt #779 path=r.0.1.1.0.1.3.1.5.0.0.80.3`.
**Both have the identical 5-property deviation set** — the `muted` class changes nothing computed:

| property | value |
|---|---|
| display | `inline-block` |
| max-width | `100%` |
| margin-bottom | `5px` |
| font-weight | `700` |
| cursor | `default` |

**Hard finding: `color` is NOT in the deviation list for any `.muted` node in my slice**, so the
helper text renders at `rgb(51, 51, 51)` — the same colour as everything else, at `font-weight: 700`.
The `muted` class is dead (Bootstrap 2 legacy; BS3 uses `.text-muted`). A rebuild that renders helper
text grey/lighter would NOT match this capture.

### 2.3 x-editable anchor `a.editable.editable-click` — 181 instances

Two variants, distinguished by whether the extra class `editable-empty` is present.

**Variant A — has a value** (10 deviations). Representative: `nodes-006.txt #725
path=r.0.1.1.0.1.3.1.5.0.0.67.1`, class `"ng-scope ng-binding editable editable-click"`, text `"No"`.

| property | value |
|---|---|
| display | `inline` |
| border-bottom-width | `1px` |
| border-bottom-style | `dashed` |
| border-bottom-color | `rgb(66, 139, 202)` |
| border-top/right/left-color | `rgb(10, 10, 10)` |
| color | `rgb(10, 10, 10)` |
| outline-color | `rgb(10, 10, 10)` |
| cursor | `pointer` |
| *(font-size / line-height / family)* | `14px / 20px / Helvetica Neue…` (DEFAULTS) |
| *(background)* | `rgba(0, 0, 0, 0)` (DEFAULTS) |

**Variant B — empty** (11 deviations): all of the above **plus `font-style: italic`**, class adds
`editable-empty`, and the rendered text is the literal string `"empty"`. Representative:
`nodes-006.txt #721 path=r.0.1.1.0.1.3.1.5.0.0.61.1`.

So: an unset session field renders as the italic word **"empty"** in near-black `rgb(10, 10, 10)`
with a blue `rgb(66, 139, 202)` dashed underline. A boolean renders as `"No"` / `"Yes!"` upright.

### 2.4 `<br>` — 115 instances

Single deviation: `display: inline`. e.g. `nodes-006.txt #726 path=r.0.1.1.0.1.3.1.5.0.0.67.2`.

### 2.5 Buttons — 8 instances, six distinct skins

| # / path | classes | box | border | radius | background | color | font |
|---|---|---|---|---|---|---|---|
| `nodes-008.txt #985` `5.0.0.138.2` | `btn btn-sm btn-warning` | pad `5px 10px`; `display:inline-block`; `vertical-align:middle`; `white-space:nowrap`; `user-select:none`; `cursor:pointer` | `1px solid rgb(238, 162, 54)` | `3px` all | `rgb(240, 173, 78)` | `rgb(255,255,255)` (outline-color same) | `12px / 18px`, `text-align:center` |
| `nodes-008.txt #986` `5.0.0.139.0` (`<a>`) | `btn btn-default` | pad `6px 12px`; `display:inline-block`; `vertical-align:middle`; `white-space:nowrap`; `user-select:none`; `cursor:pointer` | `1px solid rgb(230, 233, 238)` | `4px` all | `rgb(255, 255, 255)` | *(not deviated →* `rgb(51,51,51)`*)* | 14px/20px, `text-align:center` |
| `nodes-010.txt #1293` `0.0.0.3.0` | `btn btn-md dropdown-toggle btn-primary mt` | **`148.094 × 34` @ (1230.7, 415)**; `margin-top:10px`; pad `6px 12px` | `1px solid rgb(46, 109, 164)` | `4px` all | `rgb(51, 122, 183)` | `rgb(255,255,255)` | 14px/20px, `text-align:center` |
| `nodes-011.txt #1330` `2.0.0.5.0.0` | `btn btn-info pull-right` | `float:right`; pad `6px 12px` | `1px solid rgb(70, 184, 218)` | `4px` all | `rgb(91, 192, 222)` | `rgb(255,255,255)` | 14px/20px |
| `nodes-011.txt #1368` `5.0.4.0.3.0` | `btn btn-primary btn-link` | `display:inline-block`; pad `6px 12px`; `box-shadow: rgb(0, 0, 0) 0px 0px 0px 0px` | border-*-color `rgb(51,122,183)`, **width 0 / style none** (DEFAULTS) | 0 | *(not deviated →* `rgba(0,0,0,0)`*)* | `rgb(51, 122, 183)` | 14px/20px |
| `nodes-011.txt #1369` `5.0.4.0.4.0` | `btn btn-danger btn-sm` | pad `5px 10px` | `1px solid rgb(212, 63, 58)` | `3px` all | `rgb(217, 83, 79)` | `rgb(255,255,255)` | `12px / 18px` |
| `nodes-011.txt #1405` `5.0.4.0.18.5` | `btn btn-warning ng-hide` | **`display:none`**; pad `6px 12px` | `1px solid rgb(238, 162, 54)` | `4px` all | `rgb(240, 173, 78)` | `rgb(255,255,255)` | 14px/20px |
| `nodes-011.txt #1409`, `#1412` `5.0.4.0.19.3`, `.19.6` | `btn btn-inverse` | `display:inline-block`; pad `6px 12px` | `1px solid rgb(54, 63, 69)` | `4px` all | `rgb(54, 63, 69)` | `rgb(255,255,255)` | 14px/20px |

### 2.6 Dropdown menu `ul.dropdown-menu` — `nodes-010.txt #1294 path=r.0.1.1.0.1.3.1.0.0.0.3.1`

| property | value |
|---|---|
| display | `none` (closed) |
| position / top / left | `absolute` / `100%` / `0px` |
| z-index | `1000` |
| min-width | `160px` |
| margin-top | `2px` |
| padding-top / padding-bottom | `5px` / `5px` |
| border | `1px solid rgba(0, 0, 0, 0.15)` on all four sides |
| border-radius | `2px` all four |
| background-color | `rgb(255, 255, 255)` |
| background-clip | `padding-box` |
| font-size / line-height | `13px` / `18.5714px` |
| text-align | `left` |
| box-shadow | `rgba(0, 0, 0, 0.176) 0px 6px 12px 0px` |
| list-style-type | `none` |

Its ten `<li>` children (`nodes-010.txt #1300-#1309`, paths `0.0.2.1.2.0 … .9`) each deviate exactly:
`display:list-item`, `font-size:13px`, `line-height:18.5714px`, `text-align:left`,
`list-style-type:none`. Note these `<li>` belong to a **second** dropdown (`0.0.2.1.2`), not to
`#1294` (`0.0.0.3.1`) — two dropdown widgets exist in this pane.

### 2.7 Caret — `nodes-010.txt #1299 path=r.0.1.1.0.1.3.1.0.0.2.1.0.0` `<span class="caret">`

`8 × 4` @ `(195.7, 471.4)`; `display:inline-block`; `border-top-width:4px`,
`border-right-width:4px`, `border-left-width:4px`; `border-top-style:dashed`,
`border-right-style:solid`, `border-left-style:solid`; `border-top-color: rgb(255, 255, 255)`,
`border-bottom-color: rgb(255, 255, 255)`, `border-right-color: rgba(0, 0, 0, 0)`,
`border-left-color: rgba(0, 0, 0, 0)`; `color/outline-color: rgb(255, 255, 255)`;
`text-align:center`; `white-space:nowrap`; `vertical-align:middle`; `cursor:pointer`;
`user-select:none`. White caret ⇒ it sits inside a coloured button whose own record is outside my
slice (parent `0.0.2.1.0`).

### 2.8 Users table — the only pixel-bearing region

**Header cells** `nodes-010.txt #1310-#1314`, paths `0.0.3.0.0.0 … .4`. Identical 13-deviation set:
`display:table-cell`, `padding: 20px 8px`, `border-bottom: 1px solid rgb(221, 221, 221)`,
`font-weight:700`, `text-align:left`, `vertical-align:bottom`, plus explicit width/height.

| # | text | x | width | y | height |
|---|---|---|---|---|---|
| #1310 | `#` | 37 | `59.2656px` | 489 | 60.5 |
| #1311 | `Name / Email` | 96.3 | `722.703px` | 489 | 60.5 |
| #1312 | `Last Login/Notes` | 819 | `386.406px` | 489 | 60.5 |
| #1313 | `Role / Status` | 1205.4 | `313.789px` | 489 | 60.5 |
| #1314 | `Actions` | 1519.2 | `285.836px` | 489 | 60.5 |

Table content box spans x = 37 → 1805 (1768 px) inside the 1842 px viewport.

**Body cells** `nodes-010.txt #1315-#1319` and `nodes-011.txt #1320-#1329`. Identical 11-deviation
set: `display:table-cell`, `padding: 8px` (all four sides), `border-top: 1px solid rgb(221, 221,
221)`, `vertical-align:top`, plus width/height. Column x/width match the header exactly.

| row | records | y | height | col-0 text | col-1 text | col-2 text |
|---|---|---|---|---|---|---|
| 0 | #1315-#1319 | 549.5 | 41 | `0` | *(empty)* | *(empty)* |
| 1 | #1320-#1324 | 590.5 | `62.3828` | `1` | `[OWNER_NAME] … [MEMBER_A_EMAIL]` | `[MEMBER_A_LAST_LOGIN]` |
| 2 | #1325-#1329 | 652.9 | `61.8828` | `2` | `[OWNER_SHORT_NAME] … [OWNER_EMAIL]` | *(empty)* |

Cells `#1315`, `#1316`, `#1317`, `#1320`, `#1321`, `#1322`, `#1325`, `#1326`, `#1327` carry
`class="ng-binding"`; the `Role / Status` and `Actions` cells (`.3`, `.4`) carry **no attributes at
all** and no text — their content lives in child nodes at depth 14, outside my slice.

#### 2.8.1 These are ONE repeated template, not three components — and what I cannot see

The 15 `<td>` records above are **3 instances × 5 cells of a single row template**. The path families
`0.0.3.1.0.*`, `0.0.3.1.1.*`, `0.0.3.1.2.*` are structurally identical and their per-column
x/width values are byte-identical across all three rows (`59.2656 / 722.703 / 386.406 / 313.789 /
285.836`), which is exactly what one template rendered three times produces. Rebuild it as one
component with a row model, not as three.

The agent owning #1440–2155 reports each of these rows contains ~170 nodes and identifies them as
row0 = Owner (role 0), row1 = Participant, row2 = Admin. **I cannot verify the role labels from my
slice** — the role text lives inside the `Role / Status` cell's children at depth 14+, which I do not
hold. I hold 5 of the ~170 nodes per row. I record their claim as external, unverified-by-me
orientation.

What my slice *does* independently show about the three rows, and which is worth reconciling:

| row | path | row height | col-1 `Name / Email` text | col-2 `Last Login/Notes` text |
|---|---|---|---|---|
| 0 | `0.0.3.1.0.*` | **41** | **none at this depth** (`#1316`, has `class="ng-binding"`) | **none** (`#1317`) |
| 1 | `0.0.3.1.1.*` | `62.3828` | `[OWNER_NAME] … [MEMBER_A_EMAIL]` (`#1321`) | `[MEMBER_A_LAST_LOGIN]` (`#1322`) |
| 2 | `0.0.3.1.2.*` | `61.8828` | `[OWNER_SHORT_NAME] … [OWNER_EMAIL]` (`#1326`) | **none** (`#1327`) |

Row 0 is **21.4 px shorter** than rows 1–2 and carries no direct text in either bound cell, while
rows 1–2 carry their name/email as a direct text node. I do not know why: the row-0 content may sit
entirely in deeper children, or the row may genuinely render less. **I am not asserting row 0 is
empty and I am not filling it in.** Anyone reconciling this must check the depth-14 children in the
#1440–2155 slice.

The `updateUser` opcode map supplied by the deeper-slice agent (1 Presenter, 2 Participant/Unban,
3 Mute, 4 Ban, 5 Admin, 6 Trial, 7/8 hide/show user count, 9 freshen login, 10/11 personal data,
13/14 archives) describes controls that attach inside the `Actions` cells — `#1319` / `#1324` /
`#1329` (`0.0.3.1.{0,1,2}.4`). Those cells are the deepest nodes I hold on that path; **every
`ng-click` carrying those opcodes is below my band and I confirm none of them appears in my slice**
(my complete `ng-*` census in §5.1 contains no `updateUser` call). Recorded as external context only.

### 2.9 Checkboxes

**Row-select checkboxes** (`nodes-010.txt #1295`, `#1297`) — 12 deviations each:

| property | #1295 (`Select All`) | #1297 (`Apply to all rooms?`) |
|---|---|---|
| rect | `13 × 13 @ (37, 429)` | `13 × 13 @ (129.2, 429)` |
| position | `absolute` | `absolute` |
| top / bottom | `0px` / `3px` | `0px` / `3px` |
| left / right | `20px` / `1755px` | `112.227px` / `1662.77px` |
| width / height | `13px` / `13px` | `13px` / `13px` |
| margin-top / margin-left | `4px` / `-20px` | `4px` / `-20px` |
| line-height | `normal` | `normal` |
| cursor | `default` | `default` |
| appearance | `auto` | `auto` |
| attributes | `type=checkbox`, `ng-click="getCheckedAllUserIds()"`, `ng-checked="checkedAllUsers"` | `ng-change="toggleApplyToAllRooms()"`, `type=checkbox`, `ng-model="applyToAllRooms"`, `class="ng-pristine ng-untouched ng-valid"` |

**Filter checkboxes** (`nodes-011.txt #1343`, `#1344`, `#1346`, `#1347`) — 6 deviations each,
all zero-rect: `display:inline-block`, `margin-top:4px`, `font-weight:700`, `line-height:normal`,
`cursor:default`, `appearance:auto`. All carry `class="ng-pristine ng-untouched ng-valid"`.

**Text inputs** (`nodes-011.txt #1408 id=addServerTxt`, `#1411 id=removeServerTxt`) — 21 deviations
each: `display:inline-block`; `padding: 1px 2px`; `border: 2px inset rgb(118, 118, 118)` all four
sides; `background-color: rgb(255, 255, 255)`; `overflow-x/y: clip`; `cursor:text`. These are
**unstyled native inputs** (no Bootstrap `form-control`) — 2px inset UA border.

### 2.10 FontAwesome icons — 12 `<i>` elements

All share: `display:inline-block`, `font-family: FontAwesome`, `line-height: 14px`, plus a
`::before` with `content:""` (PUA glyph), `font-family:"FontAwesome"`, `background-color: rgba(0, 0,
0, 0)`.

| # | path | class | ::before colour / size | rect | extra deviations |
|---|---|---|---|---|---|
| `#1290` | `0.0.0.0.0` | `fa fa-user-plus` | `rgb(255,255,255)` `14px` | `16 × 14 @ (1243.7, 381)` | width `16px`, height `14px`, all border-colors + color + outline-color `rgb(255,255,255)`, `text-align:center`, `white-space:nowrap`, `cursor:pointer`, `user-select:none`, `transform: matrix(1, 0, 0, 1, 0, 0)` |
| `#1291` | `0.0.0.1.0` | `fa fa-floppy-o` | `rgb(255,255,255)` `14px` | `12 × 14 @ (1398.2, 381)` | as above, width `12px` |
| `#1292` | `0.0.0.2.0` | `fa fa-refresh` | `rgb(255,255,255)` `14px` | `12 × 14 @ (1485.2, 381)` | as above, width `12px` (no `aria-hidden`) |
| `#1338` | `4.0.0.1.0` | `fa fa-user-plus` | `rgb(255,255,255)` `14px` | 0×0 | white colour set, `cursor:pointer`, `user-select:none` |
| `#1339` | `4.0.0.2.0` | `fa fa-floppy-o` | `rgb(255,255,255)` `14px` | 0×0 | same |
| `#1340` | `4.0.0.3.0` | `fa fa-users` | `rgb(255,255,255)` `14px` | 0×0 | same |
| `#1341` | `4.0.0.4.0` | `fa fa-trash` | `rgb(255,255,255)` `14px` | 0×0 | same |
| `#1342` | `4.0.0.5.0` | `fa fa-download` | `rgb(255,255,255)` `14px` | 0×0 | same |
| `#1349` | `5.0.0.0.0.0` | `fa fa-floppy-o` | `rgb(255,255,255)` `14px` | 0×0 | same |
| `#1350` | `5.0.0.0.1.0` | `fa fa-plus` | `rgb(255,255,255)` `14px` | 0×0 | same |
| `#1354` | `5.0.0.138.2.0` | `fa fa-random` | `rgb(255,255,255)` **`12px`** | 0×0 | `font-size:12px`, `line-height:12px` (it lives inside the `btn-sm` *New Secret* button) |
| `#1355` | `5.0.0.163.0.0` | `fa fa-gear ms-2 cursor-pointer` | **`rgb(51, 51, 51)`** `14px` | 0×0 | only 4 deviations; `cursor:default`; `title="Configure Chat Tabs"`; `ng-click="openChatTabsWithBadgesEditor(sess.chatTabsWithBadges)"` |

`#1355` is the one **dark** icon — it sits in a label, not a button. Note its class contains
`cursor-pointer` yet computed `cursor` is `default`: the utility class does not exist in the loaded
CSS. Do not reproduce a pointer cursor there.

### 2.11 textAngular editor

| # / path | element | key computed values |
|---|---|---|
| `#1331` `2.0.0.5.1.0` | `div.ta-toolbar.btn-toolbar` | only deviation `margin-left: -5px`; `::before` and `::after` both `content:" "`, `color: rgb(51,51,51)`, `font-family:"Helvetica Neue", Helvetica, Arial, sans-serif`, `14px`, `background-color: rgba(0,0,0,0)` (clearfix) |
| `#1332` `2.0.0.5.1.1` | `div.ta-scroll-window.ta-text.ta-editor.form-control` `ng-hide="showHtml"` | `position:relative`; `width:100%`; `min-height:300px`; border `1px solid rgb(219, 217, 217)` ×4; radius `4px` ×4; `background-color: rgb(255,255,255)`; `color: rgb(85, 85, 85)`; `overflow-x/y: auto`; `box-shadow: rgb(0, 0, 0) 0px 0px 0px 0px`; `outline-color: rgb(85,85,85)`; `transition-property: border-color, box-shadow`; `transition-duration: 0.15s, 0.15s` |
| `#1333` `2.0.0.5.1.2` | `textarea#taHtmlElement7346242129359551` | `display:none`; `width:100%`; `min-height:300px`; `padding: 6px 18px`; same border/radius/bg/colour/shadow/transition as `#1332`; `white-space: pre-wrap`; `overflow-wrap: break-word`; `overflow-x/y:auto`; `cursor:text`; `resize: both`; `appearance: auto` |
| `#1334` `2.0.0.5.1.3` | `input[type=hidden][name=wysiswyg-editor]` | `display:none`; `overflow-x/y: clip`; `cursor:default` |

### 2.12 Badge — `nodes-011.txt #1345 path=r.0.1.1.0.1.3.1.4.0.1.1.3.1`

`<span class="badge badge-danger">` text `"Free Trials"`:
`display:inline-block`; `min-width:10px`; `padding: 3px 7px`; all four `border-*-color: rgb(255,
255, 255)`; `border-radius: 10px` ×4; **`background-color: rgb(119, 119, 119)`**;
`color: rgb(255, 255, 255)`; `font-size:12px`; `font-weight:700`; `line-height:12px`;
`text-align:center`; `white-space:nowrap`; `vertical-align:middle`; `cursor:default`.

**Hard finding: the `badge-danger` modifier is inert** — computed background is neutral grey
`rgb(119, 119, 119)`, i.e. plain Bootstrap-3 `.badge`. Do not render this red.

### 2.13 Link — `nodes-011.txt #1348 path=r.0.1.1.0.1.3.1.4.4.0.0.3.0`

`<a href="" ng-click="reverseStatSort()">"Reverse"`: `display:inline`; all four border-colors and
`color` and `outline-color` `rgb(51, 122, 183)`; `font-weight:700`; `text-align:left`;
`cursor:pointer`. No underline deviation ⇒ `text-decoration-line: none`.

### 2.14 Underlined inline spans — `#1351`, `#1352`, `#1353`

Attribute `style="text-decoration: underline"`. Deviations: `display:inline`, `font-weight:700`,
`text-decoration-line: underline`, `cursor:default`. Colour inherits `rgb(51,51,51)`.

### 2.15 `<hr>` — 7 instances (`#1238`, `#1249`, `#1252`, `#1257`, `#1268`, `#1277`, `#1406`)

Identical 16-deviation set: `box-sizing: content-box` (the only elements in this slice that are NOT
`border-box`); `height: 0px`; `margin: 20px auto`; `border-top: 1px solid rgb(238, 238, 238)`;
`border-right/bottom/left-color: rgb(128, 128, 128)`; `color: rgb(128, 128, 128)`;
`overflow-x/y: hidden`; `outline-color: rgb(128, 128, 128)`.

### 2.16 `p.form-control-static` — 48 instances

3 deviations only: `min-height: 34px`; `padding-top: 7px`; `padding-bottom: 7px`. Bare `<p>`
(`#1233`, `#1248`, `#1258`, `#1269`, `#1275`) deviate only by `margin-bottom: 10px`.

### 2.17 `div` — 5 instances

`#1231`, `#1232` (`5.0.4.0.3`, `.4`): **zero deviations** — pure `display:block` wrappers.
`#1247` (`5.0.4.0.19`): `ng-show="showAdServer"`, `class="ng-hide"`, `display:none`.
`#1331`, `#1332`: see §2.11.

---

## 3. Visibility census

| metric | count | share of 720 |
|---|---|---|
| **Total records in my slice** | **720** | 100% |
| Rect `x=0 y=0 w=0 h=0` | **691** | 95.97% |
| Rect non-zero (rendered) | **29** | 4.03% |
| `display: none` in the deviation list | **5** | 0.69% |
| `visibility: hidden` | **0** | 0% |
| `opacity: 0` | **0** | 0% |

Per file: `nodes-006` 120/120 zero · `nodes-007` 120/120 zero · `nodes-008` 120/120 zero ·
`nodes-009` 120/120 zero · `nodes-010` 101/120 zero (19 visible) · `nodes-011` 110/120 zero
(10 visible).

**Zero-rect by region:**

| region | nodes | zero-rect | why |
|---|---|---|---|
| Settings form `5.0.0.*` + `5.0.4.0.*` | 661 | **661 (all)** | inactive tab pane — laid out at 0×0 |
| Users pane `0.0.*` | 40 | 11 | 1 closed `ul.dropdown-menu` (`#1294`, `display:none`) + its 10 sibling `<li>` in a second closed menu (`#1300-#1309`) |
| textAngular `2.0.0.5.*` | 5 | 5 | inactive pane; `#1333`/`#1334` additionally `display:none` |
| SSO `3.0.0.*` | 1 | 1 | inactive pane |
| Stats pane `4.*` | 13 | 13 | inactive pane |
| **Total** | **720** | **691** | |

**The five explicit `display:none` nodes**, in index order:

| # | path | element | reason |
|---|---|---|---|
| `#1247` | `5.0.4.0.19` | `<div ng-show="showAdServer" class="ng-hide">` | Angular `ng-show` false |
| `#1294` | `0.0.0.3.1` | `<ul role="menu" class="dropdown-menu">` | Bootstrap dropdown closed |
| `#1333` | `2.0.0.5.1.2` | `<textarea id="taHtmlElement…" ng-show="showHtml" class="… ng-hide">` | HTML-source view off |
| `#1334` | `2.0.0.5.1.3` | `<input type="hidden" style="display: none;">` | inline style + `type=hidden` |
| `#1405` | `5.0.4.0.18.5` | `<button ng-show="showAdServer" class="btn btn-warning ng-hide">` | Angular `ng-show` false |

**Visible vs hidden, stated plainly: 29 of my 720 nodes are on screen; 691 are not.** All 29 visible
nodes live in `r.0.1.1.0.1.3.1.0.0.*` (the Users pane) and occupy the band **y = 381 … 714.8**,
**x = 37 … 1805**. My slice contains **no visible node above y=381 and none below y=714.8**.

---

## 4. Text content, verbatim

505 nodes in my slice carry a `text:` value. The complete list, in DOM-path order with `#index` and
`path`, is **Appendix B** (verbatim, including the capture's own `\n` and `\"` escapes).

Highlights and the only *live* (non-template) strings:

**Real user data — flag as PII (`nodes-011.txt`):**
- `#1321 path=r.0.1.1.0.1.3.1.0.0.3.1.1.1` →
  `"[OWNER_NAME]\n                                        \n                                        \n                                        \n\n                                        \n                                         [MEMBER_A_EMAIL]"`
- `#1322 path=r.0.1.1.0.1.3.1.0.0.3.1.1.2` → `"[MEMBER_A_LAST_LOGIN]"`
- `#1326 path=r.0.1.1.0.1.3.1.0.0.3.1.2.1` →
  `"[OWNER_SHORT_NAME]\n                                        \n                                        \n                                        \n\n                                        \n                                         [OWNER_EMAIL]"`
- `#1315 …3.1.0.0` → `"0"`, `#1320 …3.1.1.0` → `"1"`, `#1325 …3.1.2.0` → `"2"` (row counters)

The long whitespace runs inside `#1321` / `#1326` are the collapsed text of intervening inline
elements (badges/stars/role markers) that live at depth 14+ and are **not** in my slice — an honest
gap, see §7.

**Visible UI chrome (`nodes-010.txt`):** `#1293` `"User List Actions"`; `#1296` `"Select All"`;
`#1298` `"Apply to all rooms?"`; `#1310-#1314` `"#"`, `"Name / Email"`, `"Last Login/Notes"`,
`"Role / Status"`, `"Actions"`.

**Session-field values actually set on this room** (the only editables not `"No"` / `"empty"`):

| # | field | rendered value |
|---|---|---|
| `#789` | `sendReportEmails` | `"Yes!"` |
| `#851` | `archiveAlertsLog` | `"Yes!"` |
| `#855` | `archiveChatLog` | `"Yes!"` |
| `#865` | `enableVideoPlayer` | `"Yes!"` |
| `#1000` | `tipMeBtnTxt` | `"Tip Me?"` |
| `#1032` | `hasChannelTabs` | `"Yes!"` |
| `#1116` | `runawayRecMinutes` | `"5"` |
| `#1194` | `h264Enabled` | `"Yes!"` |
| `#1213` | `ptrMobileAppExpirePairCodeDays` | `"7"` |
| `#1215` | `mobileAppExpireNotificationsDays` | `"14"` |
| `#1357` | `useV3` | `"Yes!"` |
| `#1377` | `superClusterExpectedServerCount` | `"0"` |
| `#1391` | `media_max_bitrate` | `"512000"` |
| `#1395` | `media_fir_rate` | `"5"` |
| `#1419` | `chatServerURL` | `"/talk"` |

**Every other one of the 181 editables in my slice reads `"No"` or `"empty"`.** That is the honest
state of this session's configuration.

**Button / link captions:** `#985` `"New Secret"`; `#986` `"API POST Routes Docs"`; `#1330` `"Save
Editor Changes"`; `#1348` `"Reverse"`; `#1368` `"Swap ClusterIDs (Backup <--> Main)"`; `#1369`
`"Apply clusterID/backupID to all sessions"`; `#1405` `"Apply  server / repeaters to entire
account?"` (note the double space, verbatim); `#1409` `"Add Server"`; `#1412` `"Remove Server"`;
`#1345` `"Free Trials"`.

**Section-intro prose:** `#1228` `"(DON'T TURN THIS ON, If PTR did not clear you for v3!! it will not
work....)"`; `#1229` same for `v5`; `#1258` `"These  vars allow to server altertaive code version for
this room"` (double space + typos verbatim); `#1269` `"For pushing alerts and streams to other rooms,
you can use the following settings. You need the other rooms ID and the API Secret of the other room
to do this."`; `#1278` `"(DON'T USE this for ST)"`; `#1279` `"Also enable the app for free trials?"`;
`#1280` `"(DON'T USE unless you have a custom app)"`; `#1286` `"Note above needs to ALSO be on (enable
ptr app)"`.

---

## 5. AngularJS bindings — every `ng-*` attribute in my slice, verbatim

**There is not a single `ng-repeat` in records #720-#1439.** The three user rows are represented in
my slice only by their *cell* nodes at `0.0.3.1.0.*`, `0.0.3.1.1.*`, `0.0.3.1.2.*`. **I never see the
row elements themselves** — `0.0.3.1.0`, `.1`, `.2` are one level shallower than my band, so I cannot
state their tag name and do not assert one. Whatever `ng-repeat` drives the user list is attached at
or above that level and is invisible to me (§7.3, §2.8.1). Likewise no `ng-controller`,
`ng-include`, `ng-bind`, `ng-src`, `ng-href`, `ng-options`, `ng-switch`, or `ng-app` appears in my
range.

### 5.1 Complete `ng-*` attribute list (24 occurrences, 23 distinct)

| # | path | attribute (verbatim) |
|---|---|---|
| `#985` | `5.0.0.138.2` | `ng-click = "generateNewApiSecret()"` |
| `#1247` | `5.0.4.0.19` | `ng-show = "showAdServer"` |
| `#1295` | `0.0.2.0.0.0` | `ng-click = "getCheckedAllUserIds()"` |
| `#1295` | `0.0.2.0.0.0` | `ng-checked = "checkedAllUsers"` |
| `#1296` | `0.0.2.0.0.1` | `ng-if = "!checkedAllUsers"` |
| `#1297` | `0.0.2.0.1.0` | `ng-change = "toggleApplyToAllRooms()"` |
| `#1297` | `0.0.2.0.1.0` | `ng-model = "applyToAllRooms"` |
| `#1330` | `2.0.0.5.0.0` | `ng-click = "htmlDescChanged() "` *(trailing space verbatim)* |
| `#1332` | `2.0.0.5.1.1` | `ng-hide = "showHtml"` |
| `#1333` | `2.0.0.5.1.2` | `ng-show = "showHtml"` |
| `#1333` | `2.0.0.5.1.2` | `ng-model = "html"` |
| `#1343` | `4.0.1.1.2.0` | `ng-model = "filterOnline"` |
| `#1344` | `4.0.1.1.3.0` | `ng-model = "filterFT"` |
| `#1346` | `4.0.1.1.4.0` | `ng-model = "showMobileStat"` |
| `#1347` | `4.0.1.1.5.0` | `ng-model = "remDupes"` |
| `#1348` | `4.4.0.0.3.0` | `ng-click = "reverseStatSort()"` |
| `#1355` | `5.0.0.163.0.0` | `ng-click = "openChatTabsWithBadgesEditor(sess.chatTabsWithBadges)"` |
| `#1368` | `5.0.4.0.3.0` | `ng-click = "swapCLusterIDs()"` *(capital L verbatim)* |
| `#1369` | `5.0.4.0.4.0` | `ng-click = "applyToAllSessions()"` |
| `#1403` | `5.0.4.0.18.3` | `ng-click = "showAdServer=true;"` *(on a `<label class="muted">`)* |
| `#1405` | `5.0.4.0.18.5` | `ng-show = "showAdServer"` |
| `#1405` | `5.0.4.0.18.5` | `ng-click = "applyRepeaterToAccount()"` |
| `#1409` | `5.0.4.0.19.3` | `ng-click = "addLiveServer()"` |
| `#1412` | `5.0.4.0.19.6` | `ng-click = "removeLiveServer()"` |

**Scope variables revealed:** `showAdServer`, `checkedAllUsers`, `applyToAllRooms`, `showHtml`,
`html`, `filterOnline`, `filterFT`, `showMobileStat`, `remDupes`, and the `sess` object.

**Controller methods revealed:** `generateNewApiSecret()`, `getCheckedAllUserIds()`,
`toggleApplyToAllRooms()`, `htmlDescChanged()`, `reverseStatSort()`,
`openChatTabsWithBadgesEditor(sess.chatTabsWithBadges)`, `swapCLusterIDs()`,
`applyToAllSessions()`, `applyRepeaterToAccount()`, `addLiveServer()`, `removeLiveServer()`, and
`saveSessField(<field>)` (181 call sites).

**Hidden-UX rule worth keeping:** clicking the helper text at `#1403`
(`"(Comma separated list op IPs IE: localhost|127.0.0.1,somehostname|10.10.10.10)"`) sets
`showAdServer = true`, which reveals `#1247` (the ad-server `<div>`) and `#1405` (the *Apply server /
repeaters to entire account?* button). That is an easter-egg toggle, and it is the *only* thing that
reveals those two nodes.

### 5.2 Angular-generated classes present

`ng-scope` (on all 181 editable anchors + `#1296` + `#1331` + `#1333`), `ng-binding` (all 181
editable anchors + the 9 `ng-binding` `<td>`s), `ng-hide` (`#1247`, `#1333`, `#1405`),
`ng-isolate-scope` (`#1331`), `ng-pristine ng-untouched ng-valid` (`#1297`, `#1333`, `#1343`,
`#1344`, `#1346`, `#1347`).

### 5.3 x-editable directives — the real data model (181 fields)

Attribute shape on every one:
`href="" onaftersave="saveSessField('<field>')" editable-<type>="sess.<field>" [e-label|e-title="…"] class="ng-scope ng-binding editable editable-click [editable-empty]"`.

Control-type census across my slice: **`editable-checkbox` 102 · `editable-textarea` 42 ·
`editable-text` 33 · `editable-number` 4** = 181.
`e-title` present on 110, `e-label` on 63; 8 have neither
(`#967 imgurRapidKey`, `#963 imgurClientID`, `#965 imgurApiKey`, `#1174 obsStreamKey`,
`#1176 obsStreamSatusWebHookURL`, `#1178 restreamToURL`, `#1180 restreamToURLKey`, `#1335 ssoHost`).

The complete ordered field inventory (index, path, directive, `sess.` expression, `e-label`/`e-title`,
rendered value) is **Appendix C**. Field names in DOM order:

`pairOKRedirect, pairErrorRedirect, hideChatAlerts, hasSwingTradeAlerts, hasDayTradeAlerts,
usersPublicReply, chatDisabledForTrials, disablePMForTrials, usersCanDeleteOwnMsgs,
smallerImagePreview, hideNotes, hideFiles, darkThemeAsDefault, saveWebinarModeChat,
showArchivesToUsers, showArchivesToSpecificPresenters, disalowSporadicMultiLogins, disalowMultiLogins,
sendReportEmails, banIPList, reportEmail, customJWTErrorMessage, sendOpenCloseEmail, autoOpenTime,
autoCloseTime, ignoreAutoOpenCloseOnWeekend, alertSoundOff, styckyNonTradeAlert, fileAccessCaseByCase,
isChatOnlyRoom, chatAutoClear, alertsAutoClear, chatAutoClearSpecialHour, chatAutoClearWeekend,
archiveAlertsLog, archiveChatLog, hideChatLog, hasAlertScheduler, enableVideoPlayer, userUploads,
enableDiscord, disableEmojis, enableRTE, enableReactions, enableQAReactions, enableEditMessage,
enableEditAlerts, alertLabels, advancedSearchAlerts, enableDeleteLog, enableBadges, enableTokenBadges,
remToken, showBadgesToPresentersOnly, dontFollowPresenters, disableStarYears, hasRequiredPhoneInLogin,
showPasswordField, isMainRoom, isArchivedRoom, isNewIndicatorOn, hasBenzingaNews, altBenzingaLogoURL,
altBenzingaLinkURL, imgurClientID, imgurApiKey, imgurRapidKey, xuserAccessToken,
xuserAccessTokenSecret, subscriptionPlans, stripeEmail, enableLiveStats, collectsUserStats, apiSecret,
slackPostURL, diasableFCMAlerts, modMessage, positionsIframeUrl, positionsIframe, tipMeBtnEnabled,
tipMeBtnTxt, tipMeBtnUrl, salesBanner, modAdminLoginList, isAlertOnly, customClientAlertPostURL,
customClientAlertPostSecret, strictBrowserMode, chatFloodDisabled, privMessageHugePopup,
hasChannelTabs, autoSwitchToOfftopics, hasAdminOnlyChannel, extraAdminChannels, extraRegChannels,
altGenChannelName, altOffTopicChannelName, chatTabsWithBadges, hasProfanityFilter, ingnoreBadWordsList,
additionalBadWordsList, simplifiedEditor, audioMeterDisabled, hideWebcamForRoom, recordChat, autoRecord,
blinkingRec, hideRecs, recordingReminder, recsInRoom, downloadRecordingsDisabled,
hasSpeechRecognitionDisabled, dontShowRecInfoToUsers, runawayRecMinutes, runawayRecAutoKill,
runawayRecPostURL, stickyGiveMicAndCam, overlayUserIdOnScreenshare, regUserCanPresent,
dontStopRecOnMicMute, individualVolumeControls, remote_recording, saveRecsToS3, s3KeyID, s3KeySecret,
s3Bucket, s3BucketFolderPath, saveRecsToVimeo, vimeoClientID, vimeoClientSecret, vimeoToken,
vimeoFolderPath, obsBroadcastRoom, obsStreamKey, obsStreamSatusWebHookURL, restreamToURL,
restreamToURLKey, x264_encArgs, twillioApiSID, twillioApiToken, twilioPhone, protextingSecretTok,
protextingGroupIDs, h264Enabled, vp9Enabled, hqVideo, customPlayerURL, iframeSSOTFix, autoResetSession,
doNotAutoSoftReset, sendFcmAlertsNew, ptrMobileAppExpirePairCodeDays, mobileAppExpireNotificationsDays,
customEnterDisclosure, customUserInfoURL, stAppScheduleID, invalidTokens, ssoHost, useV3, useV5,
clusterID, backupClusterID, superClusterID, superClusterExpectedServerCount, useFFmpegRecording,
useLessBusyVsRoundRobin, useMediaMTX, mediaMTXClusterID, backupMediaMTXClustterID, media_max_bitrate,
media_fir_rate, hasYTStreaming, media_relays, isLocked, chatServerURL, force_jpeg_screenshare,
force_mp3_audio, node_media_relays, node_ws_media_relays, altCodeVendorJS, altCodeAppJS`

(Field-name typos — `disalowMultiLogins`, `styckyNonTradeAlert`, `diasableFCMAlerts`,
`ingnoreBadWordsList`, `backupMediaMTXClustterID`, `twillioApiSID`, `obsStreamSatusWebHookURL` — are
**verbatim from the capture** and must be preserved by any API that talks to this backend.)

---

## 6. Assets & data

### 6.1 Media assets

**There is no `<img>`, `<iframe>`, `<video>`, `<audio>`, `<source>`, `<svg>`, or `<canvas>` element
anywhere in records #720-#1439, and no `src=` attribute of any kind.** Icon art is entirely
FontAwesome `::before` glyphs (§2.10). Stated as fact, not omission.

### 6.2 Links

| # | path | href |
|---|---|---|
| `#986` | `5.0.0.139.0` | `/public/html/api-docs.html?src=/public/html/POST_ROUTE_API_DOCUMENTATION.md` (`target="_blank"`) |
| 182 others | various | `href=""` — the 181 x-editable anchors plus `#1348` "Reverse" |

### 6.3 Element ids and generated names

| id / name | # | note |
|---|---|---|
| `taHtmlElement7346242129359551` | `#1333` | textAngular instance id — **random per page load, do not hard-code** |
| `textAngularToolbar7346242129359551` (`name`) | `#1331` | same instance number |
| `addServerTxt` | `#1408` | `<input type="text">` |
| `removeServerTxt` | `#1411` | `<input type="text">` |
| `wysiswyg-editor` (`name`) | `#1334` | hidden input, `value=""` (typo verbatim) |

### 6.4 Form fields

9 `<input>` (6 `type=checkbox`, 2 `type=text`, 1 `type=hidden`), 1 `<textarea>`, 8 `<button>` (all
`type` absent except `#985` `type="button"`), plus the 181 x-editable anchors that act as fields.
Full attribute detail in §2.9, §2.11 and Appendix A.

### 6.5 ObjectIds / tokens / credentials — security read

**No credential value is present in this capture.** Every secret-bearing field renders `"empty"`:
`apiSecret` (#984), `imgurClientID` (#963), `imgurApiKey` (#965), `imgurRapidKey` (#967),
`xuserAccessToken` (#969), `xuserAccessTokenSecret` (#971), `stripeEmail` (#977),
`slackPostURL` (#988), `customClientAlertPostSecret` (#1018), `s3KeyID` (#1154), `s3KeySecret`
(#1156), `s3Bucket` (#1158), `s3BucketFolderPath` (#1160), `vimeoClientID` (#1164),
`vimeoClientSecret` (#1166), `vimeoToken` (#1168), `obsStreamKey` (#1174),
`obsStreamSatusWebHookURL` (#1176), `restreamToURL` (#1178), `restreamToURLKey` (#1180),
`twillioApiSID` (#1184), `twillioApiToken` (#1186), `twilioPhone` (#1188), `protextingSecretTok`
(#1190), `protextingGroupIDs` (#1192), `invalidTokens` (#1225), `clusterID` (#1361),
`backupClusterID` (#1365), `superClusterID` (#1371), `mediaMTXClusterID` (#1387),
`backupMediaMTXClustterID` (#1389).

The only ObjectId-shaped strings in my range are **placeholders inside example help text**, not live
data — `nodes-008.txt #1062 path=r.0.1.1.0.1.3.1.5.0.0.163.3`:
`"61eafd612fcdee7bc8e979bc"` and `"6489f1f98993a677b83cdd70"`.

**Live personal data that IS present** (flagged): the two member rows in §4 — full names
`[OWNER_NAME]` / `[OWNER_SHORT_NAME]`, emails `[MEMBER_A_EMAIL]` / `[OWNER_EMAIL]`, and
a last-login timestamp `[MEMBER_A_LAST_LOGIN]`. Treat these as real member records; do not fabricate
extra rows to "fill out" a rebuilt table.

---

## 7. Honest gaps

1. **Truncated `text` values.** The capture truncates long strings. Confirmed truncations in my
   slice:
   - `nodes-008.txt #975 path=r.0.1.1.0.1.3.1.5.0.0.134.3` — `subscriptionPlans` help JSON, cut
     mid-token at `…"desc": "Pr`. The rest of the sample plan JSON is unrecoverable from this dump.
   - `nodes-008.txt #1062 path=r.0.1.1.0.1.3.1.5.0.0.163.3` — `chatTabsWithBadges` help JSON, cut
     after the second `"badges"` array at `…"61eafd612fcdee7bc8e979bc"\n    ]\n  `.
   - `nodes-007.txt #845 path=r.0.1.1.0.1.3.1.5.0.0.97.3` ends with an unbalanced apostrophe
     (`…ALL TIMES ARE EST'`) — that appears to be a source typo rather than truncation, but I cannot
     prove it from this dump.
   - `nodes-007.txt #903 path=r.0.1.1.0.1.3.1.5.0.0.112.3` (`alertLabels` sample JSON) ends with
     `]` and looks complete, but I cannot rule out truncation exactly at a closing bracket.
2. **Missing sibling indices.** General block: groups **62, 63, 65, 66, 193, 204, 218** are absent
   between present neighbours. Advanced block: groups **5, 8, 10, 17, 20, 21, 24, 29, 30** absent.
   These children exist in the DOM index space but produced no captured record at this depth. I do
   not know whether they were empty comment/`ng-if` placeholders or were dropped — I did not invent
   content for them.
3. **No parents, no deeper children — every component here is truncated at both ends.** My slice is
   a BFS band holding only DOM depths 12 and 13 (see §0.1 for the exact shallowest/deepest path I
   hold per region). The row containers `0.0.3.1.0/.1/.2` are one level **shallower** than my band,
   so I do not know their tag and do not assert it, and the `ng-repeat` expression that drives the
   user list is **not visible to me**. Likewise the contents of the `Role / Status` and `Actions`
   cells, the badges/stars collapsed into the whitespace of `#1321`/`#1326`, the ten dropdown `<li>`
   labels, and the textAngular toolbar buttons are all **deeper** than my range. Other agents own
   both ends.
4. **The `<td>` `Role / Status` (`#1318`, `#1323`, `#1328`) and `Actions` (`#1319`, `#1324`,
   `#1329`) cells have no attributes and no text** in the capture. They are not empty on screen —
   their children are at depth 14. Do not conclude the columns are blank.
5. **Second dropdown widget.** `#1299` (visible white caret at `195.7, 471.4`) and `#1300-#1309`
   (ten `<li>`) belong to a dropdown at `0.0.2.1` whose button and menu `<ul>` are outside my slice.
   I know the menu has exactly ten items but not their labels.
6. **The `mt` class on `#1293`** (`btn btn-md dropdown-toggle btn-primary mt`) contributes exactly
   `margin-top: 10px` — I can attribute the value but not confirm which rule produced it, since no
   stylesheet is in the dump.
7. **`themeClass: "footer-hidden"`** is recorded in `INFO.txt` but no node in my slice carries it;
   its effect on my region is undetermined.
8. **No screenshot was available to me**, so I have verified geometry against the capture's own
   rects only. A pixel diff of a rebuilt page against a real screenshot has NOT been performed for
   this slice and remains outstanding.

---

## Appendix A — full node outline, all 720 records (#720 … #1439)

Generated verbatim from the six `nodes-0NN.txt` files. `class` is the first `attr class` on the
node; `id` is the `attr id` if present; `rect` is the captured CSS-px box. Pipes inside values are
escaped as `\|`.

| # | path | tag | class | id | rect |
|---|---|---|---|---|---|
| 720 | `r.0.1.1.0.1.3.1.5.0.0.61.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 721 | `r.0.1.1.0.1.3.1.5.0.0.61.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 722 | `r.0.1.1.0.1.3.1.5.0.0.64.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 723 | `r.0.1.1.0.1.3.1.5.0.0.64.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 724 | `r.0.1.1.0.1.3.1.5.0.0.67.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 725 | `r.0.1.1.0.1.3.1.5.0.0.67.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 726 | `r.0.1.1.0.1.3.1.5.0.0.67.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 727 | `r.0.1.1.0.1.3.1.5.0.0.67.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 728 | `r.0.1.1.0.1.3.1.5.0.0.68.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 729 | `r.0.1.1.0.1.3.1.5.0.0.68.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 730 | `r.0.1.1.0.1.3.1.5.0.0.68.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 731 | `r.0.1.1.0.1.3.1.5.0.0.68.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 732 | `r.0.1.1.0.1.3.1.5.0.0.69.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 733 | `r.0.1.1.0.1.3.1.5.0.0.69.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 734 | `r.0.1.1.0.1.3.1.5.0.0.69.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 735 | `r.0.1.1.0.1.3.1.5.0.0.69.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 736 | `r.0.1.1.0.1.3.1.5.0.0.70.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 737 | `r.0.1.1.0.1.3.1.5.0.0.70.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 738 | `r.0.1.1.0.1.3.1.5.0.0.70.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 739 | `r.0.1.1.0.1.3.1.5.0.0.70.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 740 | `r.0.1.1.0.1.3.1.5.0.0.71.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 741 | `r.0.1.1.0.1.3.1.5.0.0.71.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 742 | `r.0.1.1.0.1.3.1.5.0.0.71.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 743 | `r.0.1.1.0.1.3.1.5.0.0.71.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 744 | `r.0.1.1.0.1.3.1.5.0.0.72.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 745 | `r.0.1.1.0.1.3.1.5.0.0.72.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 746 | `r.0.1.1.0.1.3.1.5.0.0.72.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 747 | `r.0.1.1.0.1.3.1.5.0.0.72.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 748 | `r.0.1.1.0.1.3.1.5.0.0.73.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 749 | `r.0.1.1.0.1.3.1.5.0.0.73.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 750 | `r.0.1.1.0.1.3.1.5.0.0.73.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 751 | `r.0.1.1.0.1.3.1.5.0.0.73.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 752 | `r.0.1.1.0.1.3.1.5.0.0.74.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 753 | `r.0.1.1.0.1.3.1.5.0.0.74.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 754 | `r.0.1.1.0.1.3.1.5.0.0.74.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 755 | `r.0.1.1.0.1.3.1.5.0.0.74.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 756 | `r.0.1.1.0.1.3.1.5.0.0.75.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 757 | `r.0.1.1.0.1.3.1.5.0.0.75.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 758 | `r.0.1.1.0.1.3.1.5.0.0.75.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 759 | `r.0.1.1.0.1.3.1.5.0.0.75.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 760 | `r.0.1.1.0.1.3.1.5.0.0.76.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 761 | `r.0.1.1.0.1.3.1.5.0.0.76.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 762 | `r.0.1.1.0.1.3.1.5.0.0.76.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 763 | `r.0.1.1.0.1.3.1.5.0.0.76.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 764 | `r.0.1.1.0.1.3.1.5.0.0.77.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 765 | `r.0.1.1.0.1.3.1.5.0.0.77.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 766 | `r.0.1.1.0.1.3.1.5.0.0.77.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 767 | `r.0.1.1.0.1.3.1.5.0.0.77.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 768 | `r.0.1.1.0.1.3.1.5.0.0.78.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 769 | `r.0.1.1.0.1.3.1.5.0.0.78.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 770 | `r.0.1.1.0.1.3.1.5.0.0.78.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 771 | `r.0.1.1.0.1.3.1.5.0.0.78.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 772 | `r.0.1.1.0.1.3.1.5.0.0.79.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 773 | `r.0.1.1.0.1.3.1.5.0.0.79.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 774 | `r.0.1.1.0.1.3.1.5.0.0.79.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 775 | `r.0.1.1.0.1.3.1.5.0.0.79.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 776 | `r.0.1.1.0.1.3.1.5.0.0.80.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 777 | `r.0.1.1.0.1.3.1.5.0.0.80.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 778 | `r.0.1.1.0.1.3.1.5.0.0.80.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 779 | `r.0.1.1.0.1.3.1.5.0.0.80.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 780 | `r.0.1.1.0.1.3.1.5.0.0.81.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 781 | `r.0.1.1.0.1.3.1.5.0.0.81.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 782 | `r.0.1.1.0.1.3.1.5.0.0.81.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 783 | `r.0.1.1.0.1.3.1.5.0.0.81.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 784 | `r.0.1.1.0.1.3.1.5.0.0.82.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 785 | `r.0.1.1.0.1.3.1.5.0.0.82.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 786 | `r.0.1.1.0.1.3.1.5.0.0.82.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 787 | `r.0.1.1.0.1.3.1.5.0.0.82.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 788 | `r.0.1.1.0.1.3.1.5.0.0.83.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 789 | `r.0.1.1.0.1.3.1.5.0.0.83.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 790 | `r.0.1.1.0.1.3.1.5.0.0.83.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 791 | `r.0.1.1.0.1.3.1.5.0.0.83.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 792 | `r.0.1.1.0.1.3.1.5.0.0.84.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 793 | `r.0.1.1.0.1.3.1.5.0.0.84.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 794 | `r.0.1.1.0.1.3.1.5.0.0.84.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 795 | `r.0.1.1.0.1.3.1.5.0.0.84.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 796 | `r.0.1.1.0.1.3.1.5.0.0.85.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 797 | `r.0.1.1.0.1.3.1.5.0.0.85.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 798 | `r.0.1.1.0.1.3.1.5.0.0.85.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 799 | `r.0.1.1.0.1.3.1.5.0.0.85.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 800 | `r.0.1.1.0.1.3.1.5.0.0.86.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 801 | `r.0.1.1.0.1.3.1.5.0.0.86.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 802 | `r.0.1.1.0.1.3.1.5.0.0.86.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 803 | `r.0.1.1.0.1.3.1.5.0.0.86.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 804 | `r.0.1.1.0.1.3.1.5.0.0.87.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 805 | `r.0.1.1.0.1.3.1.5.0.0.87.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 806 | `r.0.1.1.0.1.3.1.5.0.0.87.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 807 | `r.0.1.1.0.1.3.1.5.0.0.87.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 808 | `r.0.1.1.0.1.3.1.5.0.0.88.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 809 | `r.0.1.1.0.1.3.1.5.0.0.88.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 810 | `r.0.1.1.0.1.3.1.5.0.0.88.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 811 | `r.0.1.1.0.1.3.1.5.0.0.88.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 812 | `r.0.1.1.0.1.3.1.5.0.0.89.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 813 | `r.0.1.1.0.1.3.1.5.0.0.89.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 814 | `r.0.1.1.0.1.3.1.5.0.0.89.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 815 | `r.0.1.1.0.1.3.1.5.0.0.89.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 816 | `r.0.1.1.0.1.3.1.5.0.0.90.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 817 | `r.0.1.1.0.1.3.1.5.0.0.90.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 818 | `r.0.1.1.0.1.3.1.5.0.0.91.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 819 | `r.0.1.1.0.1.3.1.5.0.0.91.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 820 | `r.0.1.1.0.1.3.1.5.0.0.91.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 821 | `r.0.1.1.0.1.3.1.5.0.0.91.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 822 | `r.0.1.1.0.1.3.1.5.0.0.92.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 823 | `r.0.1.1.0.1.3.1.5.0.0.92.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 824 | `r.0.1.1.0.1.3.1.5.0.0.92.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 825 | `r.0.1.1.0.1.3.1.5.0.0.92.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 826 | `r.0.1.1.0.1.3.1.5.0.0.93.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 827 | `r.0.1.1.0.1.3.1.5.0.0.93.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 828 | `r.0.1.1.0.1.3.1.5.0.0.93.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 829 | `r.0.1.1.0.1.3.1.5.0.0.93.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 830 | `r.0.1.1.0.1.3.1.5.0.0.94.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 831 | `r.0.1.1.0.1.3.1.5.0.0.94.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 832 | `r.0.1.1.0.1.3.1.5.0.0.94.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 833 | `r.0.1.1.0.1.3.1.5.0.0.94.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 834 | `r.0.1.1.0.1.3.1.5.0.0.95.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 835 | `r.0.1.1.0.1.3.1.5.0.0.95.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 836 | `r.0.1.1.0.1.3.1.5.0.0.95.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 837 | `r.0.1.1.0.1.3.1.5.0.0.95.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 838 | `r.0.1.1.0.1.3.1.5.0.0.96.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 839 | `r.0.1.1.0.1.3.1.5.0.0.96.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 840 | `r.0.1.1.0.1.3.1.5.0.0.96.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 841 | `r.0.1.1.0.1.3.1.5.0.0.96.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 842 | `r.0.1.1.0.1.3.1.5.0.0.97.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 843 | `r.0.1.1.0.1.3.1.5.0.0.97.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 844 | `r.0.1.1.0.1.3.1.5.0.0.97.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 845 | `r.0.1.1.0.1.3.1.5.0.0.97.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 846 | `r.0.1.1.0.1.3.1.5.0.0.98.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 847 | `r.0.1.1.0.1.3.1.5.0.0.98.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 848 | `r.0.1.1.0.1.3.1.5.0.0.98.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 849 | `r.0.1.1.0.1.3.1.5.0.0.98.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 850 | `r.0.1.1.0.1.3.1.5.0.0.99.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 851 | `r.0.1.1.0.1.3.1.5.0.0.99.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 852 | `r.0.1.1.0.1.3.1.5.0.0.99.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 853 | `r.0.1.1.0.1.3.1.5.0.0.99.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 854 | `r.0.1.1.0.1.3.1.5.0.0.100.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 855 | `r.0.1.1.0.1.3.1.5.0.0.100.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 856 | `r.0.1.1.0.1.3.1.5.0.0.101.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 857 | `r.0.1.1.0.1.3.1.5.0.0.101.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 858 | `r.0.1.1.0.1.3.1.5.0.0.101.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 859 | `r.0.1.1.0.1.3.1.5.0.0.101.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 860 | `r.0.1.1.0.1.3.1.5.0.0.102.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 861 | `r.0.1.1.0.1.3.1.5.0.0.102.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 862 | `r.0.1.1.0.1.3.1.5.0.0.102.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 863 | `r.0.1.1.0.1.3.1.5.0.0.102.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 864 | `r.0.1.1.0.1.3.1.5.0.0.103.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 865 | `r.0.1.1.0.1.3.1.5.0.0.103.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 866 | `r.0.1.1.0.1.3.1.5.0.0.103.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 867 | `r.0.1.1.0.1.3.1.5.0.0.103.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 868 | `r.0.1.1.0.1.3.1.5.0.0.104.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 869 | `r.0.1.1.0.1.3.1.5.0.0.104.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 870 | `r.0.1.1.0.1.3.1.5.0.0.104.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 871 | `r.0.1.1.0.1.3.1.5.0.0.104.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 872 | `r.0.1.1.0.1.3.1.5.0.0.105.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 873 | `r.0.1.1.0.1.3.1.5.0.0.105.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 874 | `r.0.1.1.0.1.3.1.5.0.0.105.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 875 | `r.0.1.1.0.1.3.1.5.0.0.105.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 876 | `r.0.1.1.0.1.3.1.5.0.0.106.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 877 | `r.0.1.1.0.1.3.1.5.0.0.106.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 878 | `r.0.1.1.0.1.3.1.5.0.0.106.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 879 | `r.0.1.1.0.1.3.1.5.0.0.106.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 880 | `r.0.1.1.0.1.3.1.5.0.0.107.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 881 | `r.0.1.1.0.1.3.1.5.0.0.107.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 882 | `r.0.1.1.0.1.3.1.5.0.0.107.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 883 | `r.0.1.1.0.1.3.1.5.0.0.107.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 884 | `r.0.1.1.0.1.3.1.5.0.0.108.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 885 | `r.0.1.1.0.1.3.1.5.0.0.108.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 886 | `r.0.1.1.0.1.3.1.5.0.0.108.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 887 | `r.0.1.1.0.1.3.1.5.0.0.108.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 888 | `r.0.1.1.0.1.3.1.5.0.0.109.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 889 | `r.0.1.1.0.1.3.1.5.0.0.109.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 890 | `r.0.1.1.0.1.3.1.5.0.0.109.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 891 | `r.0.1.1.0.1.3.1.5.0.0.109.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 892 | `r.0.1.1.0.1.3.1.5.0.0.110.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 893 | `r.0.1.1.0.1.3.1.5.0.0.110.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 894 | `r.0.1.1.0.1.3.1.5.0.0.110.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 895 | `r.0.1.1.0.1.3.1.5.0.0.110.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 896 | `r.0.1.1.0.1.3.1.5.0.0.111.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 897 | `r.0.1.1.0.1.3.1.5.0.0.111.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 898 | `r.0.1.1.0.1.3.1.5.0.0.111.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 899 | `r.0.1.1.0.1.3.1.5.0.0.111.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 900 | `r.0.1.1.0.1.3.1.5.0.0.112.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 901 | `r.0.1.1.0.1.3.1.5.0.0.112.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 902 | `r.0.1.1.0.1.3.1.5.0.0.112.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 903 | `r.0.1.1.0.1.3.1.5.0.0.112.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 904 | `r.0.1.1.0.1.3.1.5.0.0.113.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 905 | `r.0.1.1.0.1.3.1.5.0.0.113.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 906 | `r.0.1.1.0.1.3.1.5.0.0.113.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 907 | `r.0.1.1.0.1.3.1.5.0.0.113.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 908 | `r.0.1.1.0.1.3.1.5.0.0.114.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 909 | `r.0.1.1.0.1.3.1.5.0.0.114.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 910 | `r.0.1.1.0.1.3.1.5.0.0.114.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 911 | `r.0.1.1.0.1.3.1.5.0.0.114.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 912 | `r.0.1.1.0.1.3.1.5.0.0.115.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 913 | `r.0.1.1.0.1.3.1.5.0.0.115.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 914 | `r.0.1.1.0.1.3.1.5.0.0.115.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 915 | `r.0.1.1.0.1.3.1.5.0.0.115.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 916 | `r.0.1.1.0.1.3.1.5.0.0.116.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 917 | `r.0.1.1.0.1.3.1.5.0.0.116.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 918 | `r.0.1.1.0.1.3.1.5.0.0.116.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 919 | `r.0.1.1.0.1.3.1.5.0.0.116.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 920 | `r.0.1.1.0.1.3.1.5.0.0.117.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 921 | `r.0.1.1.0.1.3.1.5.0.0.117.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 922 | `r.0.1.1.0.1.3.1.5.0.0.117.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 923 | `r.0.1.1.0.1.3.1.5.0.0.117.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 924 | `r.0.1.1.0.1.3.1.5.0.0.118.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 925 | `r.0.1.1.0.1.3.1.5.0.0.118.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 926 | `r.0.1.1.0.1.3.1.5.0.0.118.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 927 | `r.0.1.1.0.1.3.1.5.0.0.118.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 928 | `r.0.1.1.0.1.3.1.5.0.0.119.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 929 | `r.0.1.1.0.1.3.1.5.0.0.119.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 930 | `r.0.1.1.0.1.3.1.5.0.0.119.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 931 | `r.0.1.1.0.1.3.1.5.0.0.119.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 932 | `r.0.1.1.0.1.3.1.5.0.0.120.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 933 | `r.0.1.1.0.1.3.1.5.0.0.120.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 934 | `r.0.1.1.0.1.3.1.5.0.0.120.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 935 | `r.0.1.1.0.1.3.1.5.0.0.120.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 936 | `r.0.1.1.0.1.3.1.5.0.0.121.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 937 | `r.0.1.1.0.1.3.1.5.0.0.121.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 938 | `r.0.1.1.0.1.3.1.5.0.0.121.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 939 | `r.0.1.1.0.1.3.1.5.0.0.121.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 940 | `r.0.1.1.0.1.3.1.5.0.0.122.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 941 | `r.0.1.1.0.1.3.1.5.0.0.122.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 942 | `r.0.1.1.0.1.3.1.5.0.0.122.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 943 | `r.0.1.1.0.1.3.1.5.0.0.122.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 944 | `r.0.1.1.0.1.3.1.5.0.0.123.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 945 | `r.0.1.1.0.1.3.1.5.0.0.123.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 946 | `r.0.1.1.0.1.3.1.5.0.0.124.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 947 | `r.0.1.1.0.1.3.1.5.0.0.124.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 948 | `r.0.1.1.0.1.3.1.5.0.0.125.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 949 | `r.0.1.1.0.1.3.1.5.0.0.125.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 950 | `r.0.1.1.0.1.3.1.5.0.0.126.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 951 | `r.0.1.1.0.1.3.1.5.0.0.126.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 952 | `r.0.1.1.0.1.3.1.5.0.0.126.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 953 | `r.0.1.1.0.1.3.1.5.0.0.126.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 954 | `r.0.1.1.0.1.3.1.5.0.0.127.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 955 | `r.0.1.1.0.1.3.1.5.0.0.127.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 956 | `r.0.1.1.0.1.3.1.5.0.0.127.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 957 | `r.0.1.1.0.1.3.1.5.0.0.127.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 958 | `r.0.1.1.0.1.3.1.5.0.0.128.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 959 | `r.0.1.1.0.1.3.1.5.0.0.128.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 960 | `r.0.1.1.0.1.3.1.5.0.0.128.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 961 | `r.0.1.1.0.1.3.1.5.0.0.128.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 962 | `r.0.1.1.0.1.3.1.5.0.0.129.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 963 | `r.0.1.1.0.1.3.1.5.0.0.129.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 964 | `r.0.1.1.0.1.3.1.5.0.0.130.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 965 | `r.0.1.1.0.1.3.1.5.0.0.130.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 966 | `r.0.1.1.0.1.3.1.5.0.0.131.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 967 | `r.0.1.1.0.1.3.1.5.0.0.131.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 968 | `r.0.1.1.0.1.3.1.5.0.0.132.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 969 | `r.0.1.1.0.1.3.1.5.0.0.132.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 970 | `r.0.1.1.0.1.3.1.5.0.0.133.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 971 | `r.0.1.1.0.1.3.1.5.0.0.133.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 972 | `r.0.1.1.0.1.3.1.5.0.0.134.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 973 | `r.0.1.1.0.1.3.1.5.0.0.134.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 974 | `r.0.1.1.0.1.3.1.5.0.0.134.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 975 | `r.0.1.1.0.1.3.1.5.0.0.134.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 976 | `r.0.1.1.0.1.3.1.5.0.0.135.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 977 | `r.0.1.1.0.1.3.1.5.0.0.135.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 978 | `r.0.1.1.0.1.3.1.5.0.0.136.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 979 | `r.0.1.1.0.1.3.1.5.0.0.136.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 980 | `r.0.1.1.0.1.3.1.5.0.0.137.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 981 | `r.0.1.1.0.1.3.1.5.0.0.137.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 982 | `r.0.1.1.0.1.3.1.5.0.0.137.2` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 983 | `r.0.1.1.0.1.3.1.5.0.0.138.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 984 | `r.0.1.1.0.1.3.1.5.0.0.138.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 985 | `r.0.1.1.0.1.3.1.5.0.0.138.2` | `<button>` | `btn btn-sm btn-warning` | — | x=0 y=0 w=0 h=0 |
| 986 | `r.0.1.1.0.1.3.1.5.0.0.139.0` | `<a>` | `btn btn-default` | — | x=0 y=0 w=0 h=0 |
| 987 | `r.0.1.1.0.1.3.1.5.0.0.140.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 988 | `r.0.1.1.0.1.3.1.5.0.0.140.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 989 | `r.0.1.1.0.1.3.1.5.0.0.141.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 990 | `r.0.1.1.0.1.3.1.5.0.0.141.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 991 | `r.0.1.1.0.1.3.1.5.0.0.142.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 992 | `r.0.1.1.0.1.3.1.5.0.0.142.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 993 | `r.0.1.1.0.1.3.1.5.0.0.143.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 994 | `r.0.1.1.0.1.3.1.5.0.0.143.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 995 | `r.0.1.1.0.1.3.1.5.0.0.144.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 996 | `r.0.1.1.0.1.3.1.5.0.0.144.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 997 | `r.0.1.1.0.1.3.1.5.0.0.145.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 998 | `r.0.1.1.0.1.3.1.5.0.0.145.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 999 | `r.0.1.1.0.1.3.1.5.0.0.146.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1000 | `r.0.1.1.0.1.3.1.5.0.0.146.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1001 | `r.0.1.1.0.1.3.1.5.0.0.147.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1002 | `r.0.1.1.0.1.3.1.5.0.0.147.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1003 | `r.0.1.1.0.1.3.1.5.0.0.148.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1004 | `r.0.1.1.0.1.3.1.5.0.0.148.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1005 | `r.0.1.1.0.1.3.1.5.0.0.149.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1006 | `r.0.1.1.0.1.3.1.5.0.0.149.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1007 | `r.0.1.1.0.1.3.1.5.0.0.149.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1008 | `r.0.1.1.0.1.3.1.5.0.0.149.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1009 | `r.0.1.1.0.1.3.1.5.0.0.150.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1010 | `r.0.1.1.0.1.3.1.5.0.0.150.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1011 | `r.0.1.1.0.1.3.1.5.0.0.150.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1012 | `r.0.1.1.0.1.3.1.5.0.0.150.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1013 | `r.0.1.1.0.1.3.1.5.0.0.151.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1014 | `r.0.1.1.0.1.3.1.5.0.0.151.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1015 | `r.0.1.1.0.1.3.1.5.0.0.151.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1016 | `r.0.1.1.0.1.3.1.5.0.0.151.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1017 | `r.0.1.1.0.1.3.1.5.0.0.152.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1018 | `r.0.1.1.0.1.3.1.5.0.0.152.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1019 | `r.0.1.1.0.1.3.1.5.0.0.152.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1020 | `r.0.1.1.0.1.3.1.5.0.0.152.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1021 | `r.0.1.1.0.1.3.1.5.0.0.153.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1022 | `r.0.1.1.0.1.3.1.5.0.0.153.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1023 | `r.0.1.1.0.1.3.1.5.0.0.153.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1024 | `r.0.1.1.0.1.3.1.5.0.0.153.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1025 | `r.0.1.1.0.1.3.1.5.0.0.154.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1026 | `r.0.1.1.0.1.3.1.5.0.0.154.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1027 | `r.0.1.1.0.1.3.1.5.0.0.155.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1028 | `r.0.1.1.0.1.3.1.5.0.0.155.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1029 | `r.0.1.1.0.1.3.1.5.0.0.155.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1030 | `r.0.1.1.0.1.3.1.5.0.0.155.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1031 | `r.0.1.1.0.1.3.1.5.0.0.156.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1032 | `r.0.1.1.0.1.3.1.5.0.0.156.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1033 | `r.0.1.1.0.1.3.1.5.0.0.156.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1034 | `r.0.1.1.0.1.3.1.5.0.0.156.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1035 | `r.0.1.1.0.1.3.1.5.0.0.157.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1036 | `r.0.1.1.0.1.3.1.5.0.0.157.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1037 | `r.0.1.1.0.1.3.1.5.0.0.157.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1038 | `r.0.1.1.0.1.3.1.5.0.0.157.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1039 | `r.0.1.1.0.1.3.1.5.0.0.158.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1040 | `r.0.1.1.0.1.3.1.5.0.0.158.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1041 | `r.0.1.1.0.1.3.1.5.0.0.158.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1042 | `r.0.1.1.0.1.3.1.5.0.0.158.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1043 | `r.0.1.1.0.1.3.1.5.0.0.159.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1044 | `r.0.1.1.0.1.3.1.5.0.0.159.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1045 | `r.0.1.1.0.1.3.1.5.0.0.159.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1046 | `r.0.1.1.0.1.3.1.5.0.0.159.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1047 | `r.0.1.1.0.1.3.1.5.0.0.160.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1048 | `r.0.1.1.0.1.3.1.5.0.0.160.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1049 | `r.0.1.1.0.1.3.1.5.0.0.160.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1050 | `r.0.1.1.0.1.3.1.5.0.0.160.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1051 | `r.0.1.1.0.1.3.1.5.0.0.161.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1052 | `r.0.1.1.0.1.3.1.5.0.0.161.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1053 | `r.0.1.1.0.1.3.1.5.0.0.161.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1054 | `r.0.1.1.0.1.3.1.5.0.0.161.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1055 | `r.0.1.1.0.1.3.1.5.0.0.162.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1056 | `r.0.1.1.0.1.3.1.5.0.0.162.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1057 | `r.0.1.1.0.1.3.1.5.0.0.162.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1058 | `r.0.1.1.0.1.3.1.5.0.0.162.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1059 | `r.0.1.1.0.1.3.1.5.0.0.163.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1060 | `r.0.1.1.0.1.3.1.5.0.0.163.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1061 | `r.0.1.1.0.1.3.1.5.0.0.163.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1062 | `r.0.1.1.0.1.3.1.5.0.0.163.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1063 | `r.0.1.1.0.1.3.1.5.0.0.164.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1064 | `r.0.1.1.0.1.3.1.5.0.0.164.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1065 | `r.0.1.1.0.1.3.1.5.0.0.164.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1066 | `r.0.1.1.0.1.3.1.5.0.0.164.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1067 | `r.0.1.1.0.1.3.1.5.0.0.165.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1068 | `r.0.1.1.0.1.3.1.5.0.0.165.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1069 | `r.0.1.1.0.1.3.1.5.0.0.165.2` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1070 | `r.0.1.1.0.1.3.1.5.0.0.166.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1071 | `r.0.1.1.0.1.3.1.5.0.0.166.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1072 | `r.0.1.1.0.1.3.1.5.0.0.166.2` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1073 | `r.0.1.1.0.1.3.1.5.0.0.167.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1074 | `r.0.1.1.0.1.3.1.5.0.0.167.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1075 | `r.0.1.1.0.1.3.1.5.0.0.167.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1076 | `r.0.1.1.0.1.3.1.5.0.0.167.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1077 | `r.0.1.1.0.1.3.1.5.0.0.168.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1078 | `r.0.1.1.0.1.3.1.5.0.0.168.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1079 | `r.0.1.1.0.1.3.1.5.0.0.168.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1080 | `r.0.1.1.0.1.3.1.5.0.0.168.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1081 | `r.0.1.1.0.1.3.1.5.0.0.169.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1082 | `r.0.1.1.0.1.3.1.5.0.0.169.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1083 | `r.0.1.1.0.1.3.1.5.0.0.169.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1084 | `r.0.1.1.0.1.3.1.5.0.0.169.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1085 | `r.0.1.1.0.1.3.1.5.0.0.170.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1086 | `r.0.1.1.0.1.3.1.5.0.0.170.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1087 | `r.0.1.1.0.1.3.1.5.0.0.171.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1088 | `r.0.1.1.0.1.3.1.5.0.0.171.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1089 | `r.0.1.1.0.1.3.1.5.0.0.172.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1090 | `r.0.1.1.0.1.3.1.5.0.0.172.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1091 | `r.0.1.1.0.1.3.1.5.0.0.173.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1092 | `r.0.1.1.0.1.3.1.5.0.0.173.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1093 | `r.0.1.1.0.1.3.1.5.0.0.173.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1094 | `r.0.1.1.0.1.3.1.5.0.0.173.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1095 | `r.0.1.1.0.1.3.1.5.0.0.174.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1096 | `r.0.1.1.0.1.3.1.5.0.0.174.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1097 | `r.0.1.1.0.1.3.1.5.0.0.174.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1098 | `r.0.1.1.0.1.3.1.5.0.0.174.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1099 | `r.0.1.1.0.1.3.1.5.0.0.175.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1100 | `r.0.1.1.0.1.3.1.5.0.0.175.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1101 | `r.0.1.1.0.1.3.1.5.0.0.175.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1102 | `r.0.1.1.0.1.3.1.5.0.0.175.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1103 | `r.0.1.1.0.1.3.1.5.0.0.176.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1104 | `r.0.1.1.0.1.3.1.5.0.0.176.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1105 | `r.0.1.1.0.1.3.1.5.0.0.176.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1106 | `r.0.1.1.0.1.3.1.5.0.0.176.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1107 | `r.0.1.1.0.1.3.1.5.0.0.177.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1108 | `r.0.1.1.0.1.3.1.5.0.0.177.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1109 | `r.0.1.1.0.1.3.1.5.0.0.177.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1110 | `r.0.1.1.0.1.3.1.5.0.0.177.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1111 | `r.0.1.1.0.1.3.1.5.0.0.178.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1112 | `r.0.1.1.0.1.3.1.5.0.0.178.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1113 | `r.0.1.1.0.1.3.1.5.0.0.178.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1114 | `r.0.1.1.0.1.3.1.5.0.0.178.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1115 | `r.0.1.1.0.1.3.1.5.0.0.179.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1116 | `r.0.1.1.0.1.3.1.5.0.0.179.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1117 | `r.0.1.1.0.1.3.1.5.0.0.179.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1118 | `r.0.1.1.0.1.3.1.5.0.0.179.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1119 | `r.0.1.1.0.1.3.1.5.0.0.180.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1120 | `r.0.1.1.0.1.3.1.5.0.0.180.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1121 | `r.0.1.1.0.1.3.1.5.0.0.180.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1122 | `r.0.1.1.0.1.3.1.5.0.0.180.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1123 | `r.0.1.1.0.1.3.1.5.0.0.181.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1124 | `r.0.1.1.0.1.3.1.5.0.0.181.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1125 | `r.0.1.1.0.1.3.1.5.0.0.181.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1126 | `r.0.1.1.0.1.3.1.5.0.0.181.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1127 | `r.0.1.1.0.1.3.1.5.0.0.182.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1128 | `r.0.1.1.0.1.3.1.5.0.0.182.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1129 | `r.0.1.1.0.1.3.1.5.0.0.182.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1130 | `r.0.1.1.0.1.3.1.5.0.0.182.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1131 | `r.0.1.1.0.1.3.1.5.0.0.183.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1132 | `r.0.1.1.0.1.3.1.5.0.0.183.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1133 | `r.0.1.1.0.1.3.1.5.0.0.183.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1134 | `r.0.1.1.0.1.3.1.5.0.0.183.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1135 | `r.0.1.1.0.1.3.1.5.0.0.184.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1136 | `r.0.1.1.0.1.3.1.5.0.0.184.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1137 | `r.0.1.1.0.1.3.1.5.0.0.184.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1138 | `r.0.1.1.0.1.3.1.5.0.0.184.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1139 | `r.0.1.1.0.1.3.1.5.0.0.185.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1140 | `r.0.1.1.0.1.3.1.5.0.0.185.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1141 | `r.0.1.1.0.1.3.1.5.0.0.185.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1142 | `r.0.1.1.0.1.3.1.5.0.0.185.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1143 | `r.0.1.1.0.1.3.1.5.0.0.186.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1144 | `r.0.1.1.0.1.3.1.5.0.0.186.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1145 | `r.0.1.1.0.1.3.1.5.0.0.186.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1146 | `r.0.1.1.0.1.3.1.5.0.0.186.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1147 | `r.0.1.1.0.1.3.1.5.0.0.187.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1148 | `r.0.1.1.0.1.3.1.5.0.0.187.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1149 | `r.0.1.1.0.1.3.1.5.0.0.187.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1150 | `r.0.1.1.0.1.3.1.5.0.0.187.3` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1151 | `r.0.1.1.0.1.3.1.5.0.0.188.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1152 | `r.0.1.1.0.1.3.1.5.0.0.188.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1153 | `r.0.1.1.0.1.3.1.5.0.0.189.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1154 | `r.0.1.1.0.1.3.1.5.0.0.189.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1155 | `r.0.1.1.0.1.3.1.5.0.0.190.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1156 | `r.0.1.1.0.1.3.1.5.0.0.190.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1157 | `r.0.1.1.0.1.3.1.5.0.0.191.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1158 | `r.0.1.1.0.1.3.1.5.0.0.191.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1159 | `r.0.1.1.0.1.3.1.5.0.0.192.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1160 | `r.0.1.1.0.1.3.1.5.0.0.192.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1161 | `r.0.1.1.0.1.3.1.5.0.0.194.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1162 | `r.0.1.1.0.1.3.1.5.0.0.194.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1163 | `r.0.1.1.0.1.3.1.5.0.0.195.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1164 | `r.0.1.1.0.1.3.1.5.0.0.195.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1165 | `r.0.1.1.0.1.3.1.5.0.0.196.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1166 | `r.0.1.1.0.1.3.1.5.0.0.196.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1167 | `r.0.1.1.0.1.3.1.5.0.0.197.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1168 | `r.0.1.1.0.1.3.1.5.0.0.197.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1169 | `r.0.1.1.0.1.3.1.5.0.0.198.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1170 | `r.0.1.1.0.1.3.1.5.0.0.198.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1171 | `r.0.1.1.0.1.3.1.5.0.0.199.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1172 | `r.0.1.1.0.1.3.1.5.0.0.199.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1173 | `r.0.1.1.0.1.3.1.5.0.0.200.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1174 | `r.0.1.1.0.1.3.1.5.0.0.200.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1175 | `r.0.1.1.0.1.3.1.5.0.0.201.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1176 | `r.0.1.1.0.1.3.1.5.0.0.201.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1177 | `r.0.1.1.0.1.3.1.5.0.0.202.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1178 | `r.0.1.1.0.1.3.1.5.0.0.202.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1179 | `r.0.1.1.0.1.3.1.5.0.0.203.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1180 | `r.0.1.1.0.1.3.1.5.0.0.203.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1181 | `r.0.1.1.0.1.3.1.5.0.0.205.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1182 | `r.0.1.1.0.1.3.1.5.0.0.205.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1183 | `r.0.1.1.0.1.3.1.5.0.0.206.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1184 | `r.0.1.1.0.1.3.1.5.0.0.206.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1185 | `r.0.1.1.0.1.3.1.5.0.0.207.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1186 | `r.0.1.1.0.1.3.1.5.0.0.207.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1187 | `r.0.1.1.0.1.3.1.5.0.0.208.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1188 | `r.0.1.1.0.1.3.1.5.0.0.208.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1189 | `r.0.1.1.0.1.3.1.5.0.0.209.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1190 | `r.0.1.1.0.1.3.1.5.0.0.209.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1191 | `r.0.1.1.0.1.3.1.5.0.0.210.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1192 | `r.0.1.1.0.1.3.1.5.0.0.210.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1193 | `r.0.1.1.0.1.3.1.5.0.0.211.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1194 | `r.0.1.1.0.1.3.1.5.0.0.211.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1195 | `r.0.1.1.0.1.3.1.5.0.0.212.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1196 | `r.0.1.1.0.1.3.1.5.0.0.212.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1197 | `r.0.1.1.0.1.3.1.5.0.0.213.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1198 | `r.0.1.1.0.1.3.1.5.0.0.213.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1199 | `r.0.1.1.0.1.3.1.5.0.0.213.2` | `<label>` | — | — | x=0 y=0 w=0 h=0 |
| 1200 | `r.0.1.1.0.1.3.1.5.0.0.214.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1201 | `r.0.1.1.0.1.3.1.5.0.0.214.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1202 | `r.0.1.1.0.1.3.1.5.0.0.214.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1203 | `r.0.1.1.0.1.3.1.5.0.0.214.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1204 | `r.0.1.1.0.1.3.1.5.0.0.215.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1205 | `r.0.1.1.0.1.3.1.5.0.0.215.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1206 | `r.0.1.1.0.1.3.1.5.0.0.216.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1207 | `r.0.1.1.0.1.3.1.5.0.0.216.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1208 | `r.0.1.1.0.1.3.1.5.0.0.217.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1209 | `r.0.1.1.0.1.3.1.5.0.0.217.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1210 | `r.0.1.1.0.1.3.1.5.0.0.219.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1211 | `r.0.1.1.0.1.3.1.5.0.0.219.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1212 | `r.0.1.1.0.1.3.1.5.0.0.220.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1213 | `r.0.1.1.0.1.3.1.5.0.0.220.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1214 | `r.0.1.1.0.1.3.1.5.0.0.221.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1215 | `r.0.1.1.0.1.3.1.5.0.0.221.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1216 | `r.0.1.1.0.1.3.1.5.0.0.222.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1217 | `r.0.1.1.0.1.3.1.5.0.0.222.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1218 | `r.0.1.1.0.1.3.1.5.0.0.222.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1219 | `r.0.1.1.0.1.3.1.5.0.0.222.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1220 | `r.0.1.1.0.1.3.1.5.0.0.223.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1221 | `r.0.1.1.0.1.3.1.5.0.0.223.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1222 | `r.0.1.1.0.1.3.1.5.0.0.224.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1223 | `r.0.1.1.0.1.3.1.5.0.0.224.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1224 | `r.0.1.1.0.1.3.1.5.0.0.225.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1225 | `r.0.1.1.0.1.3.1.5.0.0.225.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1226 | `r.0.1.1.0.1.3.1.5.0.0.225.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1227 | `r.0.1.1.0.1.3.1.5.0.0.225.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1228 | `r.0.1.1.0.1.3.1.5.0.4.0.0` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1229 | `r.0.1.1.0.1.3.1.5.0.4.0.1` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1230 | `r.0.1.1.0.1.3.1.5.0.4.0.2` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1231 | `r.0.1.1.0.1.3.1.5.0.4.0.3` | `<div>` | — | — | x=0 y=0 w=0 h=0 |
| 1232 | `r.0.1.1.0.1.3.1.5.0.4.0.4` | `<div>` | — | — | x=0 y=0 w=0 h=0 |
| 1233 | `r.0.1.1.0.1.3.1.5.0.4.0.5` | `<p>` | — | — | x=0 y=0 w=0 h=0 |
| 1234 | `r.0.1.1.0.1.3.1.5.0.4.0.6` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1235 | `r.0.1.1.0.1.3.1.5.0.4.0.7` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1236 | `r.0.1.1.0.1.3.1.5.0.4.0.8` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1237 | `r.0.1.1.0.1.3.1.5.0.4.0.9` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1238 | `r.0.1.1.0.1.3.1.5.0.4.0.10` | `<hr>` | — | — | x=0 y=0 w=0 h=0 |
| 1239 | `r.0.1.1.0.1.3.1.5.0.4.0.11` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1240 | `r.0.1.1.0.1.3.1.5.0.4.0.12` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1241 | `r.0.1.1.0.1.3.1.5.0.4.0.13` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1242 | `r.0.1.1.0.1.3.1.5.0.4.0.14` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1243 | `r.0.1.1.0.1.3.1.5.0.4.0.15` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1244 | `r.0.1.1.0.1.3.1.5.0.4.0.16` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1245 | `r.0.1.1.0.1.3.1.5.0.4.0.17` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1246 | `r.0.1.1.0.1.3.1.5.0.4.0.18` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1247 | `r.0.1.1.0.1.3.1.5.0.4.0.19` | `<div>` | `ng-hide` | — | x=0 y=0 w=0 h=0 |
| 1248 | `r.0.1.1.0.1.3.1.5.0.4.0.20` | `<p>` | — | — | x=0 y=0 w=0 h=0 |
| 1249 | `r.0.1.1.0.1.3.1.5.0.4.0.21` | `<hr>` | — | — | x=0 y=0 w=0 h=0 |
| 1250 | `r.0.1.1.0.1.3.1.5.0.4.0.22` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1251 | `r.0.1.1.0.1.3.1.5.0.4.0.23` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1252 | `r.0.1.1.0.1.3.1.5.0.4.0.24` | `<hr>` | — | — | x=0 y=0 w=0 h=0 |
| 1253 | `r.0.1.1.0.1.3.1.5.0.4.0.25` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1254 | `r.0.1.1.0.1.3.1.5.0.4.0.26` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1255 | `r.0.1.1.0.1.3.1.5.0.4.0.27` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1256 | `r.0.1.1.0.1.3.1.5.0.4.0.28` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1257 | `r.0.1.1.0.1.3.1.5.0.4.0.29` | `<hr>` | — | — | x=0 y=0 w=0 h=0 |
| 1258 | `r.0.1.1.0.1.3.1.5.0.4.0.30` | `<p>` | — | — | x=0 y=0 w=0 h=0 |
| 1259 | `r.0.1.1.0.1.3.1.5.0.4.0.31` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1260 | `r.0.1.1.0.1.3.1.5.0.4.0.32` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1261 | `r.0.1.1.0.1.3.1.5.0.4.0.33` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1262 | `r.0.1.1.0.1.3.1.5.0.4.0.34` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1263 | `r.0.1.1.0.1.3.1.5.0.4.0.35` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1264 | `r.0.1.1.0.1.3.1.5.0.4.0.36` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1265 | `r.0.1.1.0.1.3.1.5.0.4.0.37` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1266 | `r.0.1.1.0.1.3.1.5.0.4.0.38` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1267 | `r.0.1.1.0.1.3.1.5.0.4.0.39` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1268 | `r.0.1.1.0.1.3.1.5.0.4.0.40` | `<hr>` | — | — | x=0 y=0 w=0 h=0 |
| 1269 | `r.0.1.1.0.1.3.1.5.0.4.0.41` | `<p>` | — | — | x=0 y=0 w=0 h=0 |
| 1270 | `r.0.1.1.0.1.3.1.5.0.4.0.42` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1271 | `r.0.1.1.0.1.3.1.5.0.4.0.43` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1272 | `r.0.1.1.0.1.3.1.5.0.4.0.44` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1273 | `r.0.1.1.0.1.3.1.5.0.4.0.45` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1274 | `r.0.1.1.0.1.3.1.5.0.4.0.46` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1275 | `r.0.1.1.0.1.3.1.5.0.4.0.47` | `<p>` | — | — | x=0 y=0 w=0 h=0 |
| 1276 | `r.0.1.1.0.1.3.1.5.0.4.0.48` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1277 | `r.0.1.1.0.1.3.1.5.0.4.0.49` | `<hr>` | — | — | x=0 y=0 w=0 h=0 |
| 1278 | `r.0.1.1.0.1.3.1.5.0.4.0.50` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1279 | `r.0.1.1.0.1.3.1.5.0.4.0.51` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1280 | `r.0.1.1.0.1.3.1.5.0.4.0.52` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1281 | `r.0.1.1.0.1.3.1.5.0.4.0.53` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1282 | `r.0.1.1.0.1.3.1.5.0.4.0.54` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1283 | `r.0.1.1.0.1.3.1.5.0.4.0.55` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1284 | `r.0.1.1.0.1.3.1.5.0.4.0.56` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1285 | `r.0.1.1.0.1.3.1.5.0.4.0.57` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1286 | `r.0.1.1.0.1.3.1.5.0.4.0.58` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1287 | `r.0.1.1.0.1.3.1.5.0.4.0.59` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1288 | `r.0.1.1.0.1.3.1.5.0.4.0.60` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1289 | `r.0.1.1.0.1.3.1.5.0.4.0.61` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1290 | `r.0.1.1.0.1.3.1.0.0.0.0.0.0` | `<i>` | `fa fa-user-plus` | — | x=1243.7 y=381 w=16 h=14 |
| 1291 | `r.0.1.1.0.1.3.1.0.0.0.0.1.0` | `<i>` | `fa fa-floppy-o` | — | x=1398.2 y=381 w=12 h=14 |
| 1292 | `r.0.1.1.0.1.3.1.0.0.0.0.2.0` | `<i>` | `fa fa-refresh` | — | x=1485.2 y=381 w=12 h=14 |
| 1293 | `r.0.1.1.0.1.3.1.0.0.0.0.3.0` | `<button>` | `btn btn-md dropdown-toggle btn-primary mt` | — | x=1230.7 y=415 w=148.1 h=34 |
| 1294 | `r.0.1.1.0.1.3.1.0.0.0.0.3.1` | `<ul>` | `dropdown-menu` | — | x=0 y=0 w=0 h=0 |
| 1295 | `r.0.1.1.0.1.3.1.0.0.2.0.0.0` | `<input>` | — | — | x=37 y=429 w=13 h=13 |
| 1296 | `r.0.1.1.0.1.3.1.0.0.2.0.0.1` | `<span>` | `ng-scope` | — | x=57 y=426.5 w=58.3 h=16.5 |
| 1297 | `r.0.1.1.0.1.3.1.0.0.2.0.1.0` | `<input>` | `ng-pristine ng-untouched ng-valid` | — | x=129.2 y=429 w=13 h=13 |
| 1298 | `r.0.1.1.0.1.3.1.0.0.2.0.1.1` | `<span>` | — | — | x=149.2 y=426.5 w=120.9 h=16.5 |
| 1299 | `r.0.1.1.0.1.3.1.0.0.2.1.0.0` | `<span>` | `caret` | — | x=195.7 y=471.4 w=8 h=4 |
| 1300 | `r.0.1.1.0.1.3.1.0.0.2.1.2.0` | `<li>` | — | — | x=0 y=0 w=0 h=0 |
| 1301 | `r.0.1.1.0.1.3.1.0.0.2.1.2.1` | `<li>` | — | — | x=0 y=0 w=0 h=0 |
| 1302 | `r.0.1.1.0.1.3.1.0.0.2.1.2.2` | `<li>` | — | — | x=0 y=0 w=0 h=0 |
| 1303 | `r.0.1.1.0.1.3.1.0.0.2.1.2.3` | `<li>` | — | — | x=0 y=0 w=0 h=0 |
| 1304 | `r.0.1.1.0.1.3.1.0.0.2.1.2.4` | `<li>` | — | — | x=0 y=0 w=0 h=0 |
| 1305 | `r.0.1.1.0.1.3.1.0.0.2.1.2.5` | `<li>` | — | — | x=0 y=0 w=0 h=0 |
| 1306 | `r.0.1.1.0.1.3.1.0.0.2.1.2.6` | `<li>` | — | — | x=0 y=0 w=0 h=0 |
| 1307 | `r.0.1.1.0.1.3.1.0.0.2.1.2.7` | `<li>` | — | — | x=0 y=0 w=0 h=0 |
| 1308 | `r.0.1.1.0.1.3.1.0.0.2.1.2.8` | `<li>` | — | — | x=0 y=0 w=0 h=0 |
| 1309 | `r.0.1.1.0.1.3.1.0.0.2.1.2.9` | `<li>` | — | — | x=0 y=0 w=0 h=0 |
| 1310 | `r.0.1.1.0.1.3.1.0.0.3.0.0.0` | `<th>` | — | — | x=37 y=489 w=59.3 h=60.5 |
| 1311 | `r.0.1.1.0.1.3.1.0.0.3.0.0.1` | `<th>` | — | — | x=96.3 y=489 w=722.7 h=60.5 |
| 1312 | `r.0.1.1.0.1.3.1.0.0.3.0.0.2` | `<th>` | — | — | x=819 y=489 w=386.4 h=60.5 |
| 1313 | `r.0.1.1.0.1.3.1.0.0.3.0.0.3` | `<th>` | — | — | x=1205.4 y=489 w=313.8 h=60.5 |
| 1314 | `r.0.1.1.0.1.3.1.0.0.3.0.0.4` | `<th>` | — | — | x=1519.2 y=489 w=285.8 h=60.5 |
| 1315 | `r.0.1.1.0.1.3.1.0.0.3.1.0.0` | `<td>` | `ng-binding` | — | x=37 y=549.5 w=59.3 h=41 |
| 1316 | `r.0.1.1.0.1.3.1.0.0.3.1.0.1` | `<td>` | `ng-binding` | — | x=96.3 y=549.5 w=722.7 h=41 |
| 1317 | `r.0.1.1.0.1.3.1.0.0.3.1.0.2` | `<td>` | `ng-binding` | — | x=819 y=549.5 w=386.4 h=41 |
| 1318 | `r.0.1.1.0.1.3.1.0.0.3.1.0.3` | `<td>` | — | — | x=1205.4 y=549.5 w=313.8 h=41 |
| 1319 | `r.0.1.1.0.1.3.1.0.0.3.1.0.4` | `<td>` | — | — | x=1519.2 y=549.5 w=285.8 h=41 |
| 1320 | `r.0.1.1.0.1.3.1.0.0.3.1.1.0` | `<td>` | `ng-binding` | — | x=37 y=590.5 w=59.3 h=62.4 |
| 1321 | `r.0.1.1.0.1.3.1.0.0.3.1.1.1` | `<td>` | `ng-binding` | — | x=96.3 y=590.5 w=722.7 h=62.4 |
| 1322 | `r.0.1.1.0.1.3.1.0.0.3.1.1.2` | `<td>` | `ng-binding` | — | x=819 y=590.5 w=386.4 h=62.4 |
| 1323 | `r.0.1.1.0.1.3.1.0.0.3.1.1.3` | `<td>` | — | — | x=1205.4 y=590.5 w=313.8 h=62.4 |
| 1324 | `r.0.1.1.0.1.3.1.0.0.3.1.1.4` | `<td>` | — | — | x=1519.2 y=590.5 w=285.8 h=62.4 |
| 1325 | `r.0.1.1.0.1.3.1.0.0.3.1.2.0` | `<td>` | `ng-binding` | — | x=37 y=652.9 w=59.3 h=61.9 |
| 1326 | `r.0.1.1.0.1.3.1.0.0.3.1.2.1` | `<td>` | `ng-binding` | — | x=96.3 y=652.9 w=722.7 h=61.9 |
| 1327 | `r.0.1.1.0.1.3.1.0.0.3.1.2.2` | `<td>` | `ng-binding` | — | x=819 y=652.9 w=386.4 h=61.9 |
| 1328 | `r.0.1.1.0.1.3.1.0.0.3.1.2.3` | `<td>` | — | — | x=1205.4 y=652.9 w=313.8 h=61.9 |
| 1329 | `r.0.1.1.0.1.3.1.0.0.3.1.2.4` | `<td>` | — | — | x=1519.2 y=652.9 w=285.8 h=61.9 |
| 1330 | `r.0.1.1.0.1.3.1.2.0.0.5.0.0` | `<button>` | `btn btn-info pull-right` | — | x=0 y=0 w=0 h=0 |
| 1331 | `r.0.1.1.0.1.3.1.2.0.0.5.1.0` | `<div>` | `ng-scope ng-isolate-scope ta-toolbar btn-toolbar` | — | x=0 y=0 w=0 h=0 |
| 1332 | `r.0.1.1.0.1.3.1.2.0.0.5.1.1` | `<div>` | `ta-scroll-window ng-scope ta-text ta-editor form-control` | — | x=0 y=0 w=0 h=0 |
| 1333 | `r.0.1.1.0.1.3.1.2.0.0.5.1.2#taHtmlElement7346242129359551` | `<textarea>` | `ng-pristine ng-untouched ng-valid ng-scope ta-bind ta-html ta-editor form-control ng-hide` | `taHtmlElement7346242129359551` | x=0 y=0 w=0 h=0 |
| 1334 | `r.0.1.1.0.1.3.1.2.0.0.5.1.3` | `<input>` | — | — | x=0 y=0 w=0 h=0 |
| 1335 | `r.0.1.1.0.1.3.1.3.0.0.1.0.0` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1336 | `r.0.1.1.0.1.3.1.4.0.0.0.0.0` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1337 | `r.0.1.1.0.1.3.1.4.0.0.0.0.1` | `<p>` | `form-control-static` | — | x=0 y=0 w=0 h=0 |
| 1338 | `r.0.1.1.0.1.3.1.4.0.0.0.1.0` | `<i>` | `fa fa-user-plus` | — | x=0 y=0 w=0 h=0 |
| 1339 | `r.0.1.1.0.1.3.1.4.0.0.0.2.0` | `<i>` | `fa fa-floppy-o` | — | x=0 y=0 w=0 h=0 |
| 1340 | `r.0.1.1.0.1.3.1.4.0.0.0.3.0` | `<i>` | `fa fa-users` | — | x=0 y=0 w=0 h=0 |
| 1341 | `r.0.1.1.0.1.3.1.4.0.0.0.4.0` | `<i>` | `fa fa-trash` | — | x=0 y=0 w=0 h=0 |
| 1342 | `r.0.1.1.0.1.3.1.4.0.0.0.5.0` | `<i>` | `fa fa-download` | — | x=0 y=0 w=0 h=0 |
| 1343 | `r.0.1.1.0.1.3.1.4.0.1.1.2.0` | `<input>` | `ng-pristine ng-untouched ng-valid` | — | x=0 y=0 w=0 h=0 |
| 1344 | `r.0.1.1.0.1.3.1.4.0.1.1.3.0` | `<input>` | `ng-pristine ng-untouched ng-valid` | — | x=0 y=0 w=0 h=0 |
| 1345 | `r.0.1.1.0.1.3.1.4.0.1.1.3.1` | `<span>` | `badge badge-danger` | — | x=0 y=0 w=0 h=0 |
| 1346 | `r.0.1.1.0.1.3.1.4.0.1.1.4.0` | `<input>` | `ng-pristine ng-untouched ng-valid` | — | x=0 y=0 w=0 h=0 |
| 1347 | `r.0.1.1.0.1.3.1.4.0.1.1.5.0` | `<input>` | `ng-pristine ng-untouched ng-valid` | — | x=0 y=0 w=0 h=0 |
| 1348 | `r.0.1.1.0.1.3.1.4.4.0.0.3.0` | `<a>` | — | — | x=0 y=0 w=0 h=0 |
| 1349 | `r.0.1.1.0.1.3.1.5.0.0.0.0.0` | `<i>` | `fa fa-floppy-o` | — | x=0 y=0 w=0 h=0 |
| 1350 | `r.0.1.1.0.1.3.1.5.0.0.0.1.0` | `<i>` | `fa fa-plus` | — | x=0 y=0 w=0 h=0 |
| 1351 | `r.0.1.1.0.1.3.1.5.0.0.6.3.0` | `<span>` | — | — | x=0 y=0 w=0 h=0 |
| 1352 | `r.0.1.1.0.1.3.1.5.0.0.6.3.1` | `<span>` | — | — | x=0 y=0 w=0 h=0 |
| 1353 | `r.0.1.1.0.1.3.1.5.0.0.9.3.0` | `<span>` | — | — | x=0 y=0 w=0 h=0 |
| 1354 | `r.0.1.1.0.1.3.1.5.0.0.138.2.0` | `<i>` | `fa fa-random` | — | x=0 y=0 w=0 h=0 |
| 1355 | `r.0.1.1.0.1.3.1.5.0.0.163.0.0` | `<i>` | `fa fa-gear ms-2 cursor-pointer` | — | x=0 y=0 w=0 h=0 |
| 1356 | `r.0.1.1.0.1.3.1.5.0.4.0.0.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1357 | `r.0.1.1.0.1.3.1.5.0.4.0.0.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1358 | `r.0.1.1.0.1.3.1.5.0.4.0.1.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1359 | `r.0.1.1.0.1.3.1.5.0.4.0.1.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1360 | `r.0.1.1.0.1.3.1.5.0.4.0.2.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1361 | `r.0.1.1.0.1.3.1.5.0.4.0.2.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1362 | `r.0.1.1.0.1.3.1.5.0.4.0.2.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1363 | `r.0.1.1.0.1.3.1.5.0.4.0.2.3` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1364 | `r.0.1.1.0.1.3.1.5.0.4.0.2.4` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1365 | `r.0.1.1.0.1.3.1.5.0.4.0.2.5` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1366 | `r.0.1.1.0.1.3.1.5.0.4.0.2.6` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1367 | `r.0.1.1.0.1.3.1.5.0.4.0.2.7` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1368 | `r.0.1.1.0.1.3.1.5.0.4.0.3.0` | `<button>` | `btn btn-primary btn-link` | — | x=0 y=0 w=0 h=0 |
| 1369 | `r.0.1.1.0.1.3.1.5.0.4.0.4.0` | `<button>` | `btn btn-danger btn-sm` | — | x=0 y=0 w=0 h=0 |
| 1370 | `r.0.1.1.0.1.3.1.5.0.4.0.6.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1371 | `r.0.1.1.0.1.3.1.5.0.4.0.6.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1372 | `r.0.1.1.0.1.3.1.5.0.4.0.6.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1373 | `r.0.1.1.0.1.3.1.5.0.4.0.6.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1374 | `r.0.1.1.0.1.3.1.5.0.4.0.6.4` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1375 | `r.0.1.1.0.1.3.1.5.0.4.0.6.5` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1376 | `r.0.1.1.0.1.3.1.5.0.4.0.6.6` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1377 | `r.0.1.1.0.1.3.1.5.0.4.0.6.7` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1378 | `r.0.1.1.0.1.3.1.5.0.4.0.6.8` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1379 | `r.0.1.1.0.1.3.1.5.0.4.0.6.9` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1380 | `r.0.1.1.0.1.3.1.5.0.4.0.7.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1381 | `r.0.1.1.0.1.3.1.5.0.4.0.7.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1382 | `r.0.1.1.0.1.3.1.5.0.4.0.9.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1383 | `r.0.1.1.0.1.3.1.5.0.4.0.9.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1384 | `r.0.1.1.0.1.3.1.5.0.4.0.11.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1385 | `r.0.1.1.0.1.3.1.5.0.4.0.11.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1386 | `r.0.1.1.0.1.3.1.5.0.4.0.12.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1387 | `r.0.1.1.0.1.3.1.5.0.4.0.12.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1388 | `r.0.1.1.0.1.3.1.5.0.4.0.13.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1389 | `r.0.1.1.0.1.3.1.5.0.4.0.13.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1390 | `r.0.1.1.0.1.3.1.5.0.4.0.14.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1391 | `r.0.1.1.0.1.3.1.5.0.4.0.14.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1392 | `r.0.1.1.0.1.3.1.5.0.4.0.14.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1393 | `r.0.1.1.0.1.3.1.5.0.4.0.14.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1394 | `r.0.1.1.0.1.3.1.5.0.4.0.15.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1395 | `r.0.1.1.0.1.3.1.5.0.4.0.15.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1396 | `r.0.1.1.0.1.3.1.5.0.4.0.15.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1397 | `r.0.1.1.0.1.3.1.5.0.4.0.15.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1398 | `r.0.1.1.0.1.3.1.5.0.4.0.16.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1399 | `r.0.1.1.0.1.3.1.5.0.4.0.16.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1400 | `r.0.1.1.0.1.3.1.5.0.4.0.18.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1401 | `r.0.1.1.0.1.3.1.5.0.4.0.18.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1402 | `r.0.1.1.0.1.3.1.5.0.4.0.18.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1403 | `r.0.1.1.0.1.3.1.5.0.4.0.18.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1404 | `r.0.1.1.0.1.3.1.5.0.4.0.18.4` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1405 | `r.0.1.1.0.1.3.1.5.0.4.0.18.5` | `<button>` | `btn btn-warning ng-hide` | — | x=0 y=0 w=0 h=0 |
| 1406 | `r.0.1.1.0.1.3.1.5.0.4.0.19.0` | `<hr>` | — | — | x=0 y=0 w=0 h=0 |
| 1407 | `r.0.1.1.0.1.3.1.5.0.4.0.19.1` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1408 | `r.0.1.1.0.1.3.1.5.0.4.0.19.2#addServerTxt` | `<input>` | — | `addServerTxt` | x=0 y=0 w=0 h=0 |
| 1409 | `r.0.1.1.0.1.3.1.5.0.4.0.19.3` | `<button>` | `btn btn-inverse` | — | x=0 y=0 w=0 h=0 |
| 1410 | `r.0.1.1.0.1.3.1.5.0.4.0.19.4` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1411 | `r.0.1.1.0.1.3.1.5.0.4.0.19.5#removeServerTxt` | `<input>` | — | `removeServerTxt` | x=0 y=0 w=0 h=0 |
| 1412 | `r.0.1.1.0.1.3.1.5.0.4.0.19.6` | `<button>` | `btn btn-inverse` | — | x=0 y=0 w=0 h=0 |
| 1413 | `r.0.1.1.0.1.3.1.5.0.4.0.19.7` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1414 | `r.0.1.1.0.1.3.1.5.0.4.0.22.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1415 | `r.0.1.1.0.1.3.1.5.0.4.0.22.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1416 | `r.0.1.1.0.1.3.1.5.0.4.0.22.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1417 | `r.0.1.1.0.1.3.1.5.0.4.0.22.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1418 | `r.0.1.1.0.1.3.1.5.0.4.0.23.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1419 | `r.0.1.1.0.1.3.1.5.0.4.0.23.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1420 | `r.0.1.1.0.1.3.1.5.0.4.0.23.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1421 | `r.0.1.1.0.1.3.1.5.0.4.0.23.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1422 | `r.0.1.1.0.1.3.1.5.0.4.0.25.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1423 | `r.0.1.1.0.1.3.1.5.0.4.0.25.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1424 | `r.0.1.1.0.1.3.1.5.0.4.0.26.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1425 | `r.0.1.1.0.1.3.1.5.0.4.0.26.1` | `<a>` | `ng-scope ng-binding editable editable-click` | — | x=0 y=0 w=0 h=0 |
| 1426 | `r.0.1.1.0.1.3.1.5.0.4.0.27.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1427 | `r.0.1.1.0.1.3.1.5.0.4.0.27.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1428 | `r.0.1.1.0.1.3.1.5.0.4.0.27.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1429 | `r.0.1.1.0.1.3.1.5.0.4.0.27.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1430 | `r.0.1.1.0.1.3.1.5.0.4.0.28.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1431 | `r.0.1.1.0.1.3.1.5.0.4.0.28.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1432 | `r.0.1.1.0.1.3.1.5.0.4.0.28.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1433 | `r.0.1.1.0.1.3.1.5.0.4.0.28.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1434 | `r.0.1.1.0.1.3.1.5.0.4.0.31.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1435 | `r.0.1.1.0.1.3.1.5.0.4.0.31.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |
| 1436 | `r.0.1.1.0.1.3.1.5.0.4.0.31.2` | `<br>` | — | — | x=0 y=0 w=0 h=0 |
| 1437 | `r.0.1.1.0.1.3.1.5.0.4.0.31.3` | `<label>` | `muted` | — | x=0 y=0 w=0 h=0 |
| 1438 | `r.0.1.1.0.1.3.1.5.0.4.0.32.0` | `<label>` | `col-sm-2 control-label` | — | x=0 y=0 w=0 h=0 |
| 1439 | `r.0.1.1.0.1.3.1.5.0.4.0.32.1` | `<a>` | `ng-scope ng-binding editable editable-click editable-empty` | — | x=0 y=0 w=0 h=0 |

## Appendix B — every `text:` value in my slice, verbatim (505 nodes)

Strings are exactly as the capture printed them, including its `
` and `\"` escapes and the
surrounding double quotes. Pipes escaped as `\|`.

| # | path | tag | text (verbatim) |
|---|---|---|---|
| 720 | `r.0.1.1.0.1.3.1.5.0.0.61.0` | `<label>` | `"Pair OK Redirect"` |
| 721 | `r.0.1.1.0.1.3.1.5.0.0.61.1` | `<a>` | `"empty"` |
| 722 | `r.0.1.1.0.1.3.1.5.0.0.64.0` | `<label>` | `"Pair ERROR Redirect"` |
| 723 | `r.0.1.1.0.1.3.1.5.0.0.64.1` | `<a>` | `"empty"` |
| 724 | `r.0.1.1.0.1.3.1.5.0.0.67.0` | `<label>` | `"Hide Alerts/Chat Section?"` |
| 725 | `r.0.1.1.0.1.3.1.5.0.0.67.1` | `<a>` | `"No"` |
| 727 | `r.0.1.1.0.1.3.1.5.0.0.67.3` | `<label>` | `"If enabled, the room will not have chat/alerts. Just media."` |
| 728 | `r.0.1.1.0.1.3.1.5.0.0.68.0` | `<label>` | `"Enable Swing Trade Alerts Tab?"` |
| 729 | `r.0.1.1.0.1.3.1.5.0.0.68.1` | `<a>` | `"No"` |
| 731 | `r.0.1.1.0.1.3.1.5.0.0.68.3` | `<label>` | `"If enabled, the room will have swing alerts tab."` |
| 732 | `r.0.1.1.0.1.3.1.5.0.0.69.0` | `<label>` | `"Enable Day Trade Alerts Tab?"` |
| 733 | `r.0.1.1.0.1.3.1.5.0.0.69.1` | `<a>` | `"No"` |
| 735 | `r.0.1.1.0.1.3.1.5.0.0.69.3` | `<label>` | `"If enabled, the room will have day trade alerts tab."` |
| 736 | `r.0.1.1.0.1.3.1.5.0.0.70.0` | `<label>` | `"User Public Reply?"` |
| 737 | `r.0.1.1.0.1.3.1.5.0.0.70.1` | `<a>` | `"No"` |
| 739 | `r.0.1.1.0.1.3.1.5.0.0.70.3` | `<label>` | `"If enabled, regular user will be able to do reply"` |
| 740 | `r.0.1.1.0.1.3.1.5.0.0.71.0` | `<label>` | `"Chat Disabled For Trials?"` |
| 741 | `r.0.1.1.0.1.3.1.5.0.0.71.1` | `<a>` | `"No"` |
| 743 | `r.0.1.1.0.1.3.1.5.0.0.71.3` | `<label>` | `"If its set, auto disable the chat (chat disabed) if they are trials"` |
| 744 | `r.0.1.1.0.1.3.1.5.0.0.72.0` | `<label>` | `"Disable PM For Trials?"` |
| 745 | `r.0.1.1.0.1.3.1.5.0.0.72.1` | `<a>` | `"No"` |
| 747 | `r.0.1.1.0.1.3.1.5.0.0.72.3` | `<label>` | `"If enabled, trial users will not be able to send private messages"` |
| 748 | `r.0.1.1.0.1.3.1.5.0.0.73.0` | `<label>` | `"Users Can Delete Own Messages?"` |
| 749 | `r.0.1.1.0.1.3.1.5.0.0.73.1` | `<a>` | `"No"` |
| 751 | `r.0.1.1.0.1.3.1.5.0.0.73.3` | `<label>` | `"If enabled, regular users can delete their own messages"` |
| 752 | `r.0.1.1.0.1.3.1.5.0.0.74.0` | `<label>` | `"Smaller image previews?"` |
| 753 | `r.0.1.1.0.1.3.1.5.0.0.74.1` | `<a>` | `"No"` |
| 755 | `r.0.1.1.0.1.3.1.5.0.0.74.3` | `<label>` | `"If enabled, the room will have smaller image previews in the chats"` |
| 756 | `r.0.1.1.0.1.3.1.5.0.0.75.0` | `<label>` | `"Hide Notes Section?"` |
| 757 | `r.0.1.1.0.1.3.1.5.0.0.75.1` | `<a>` | `"No"` |
| 759 | `r.0.1.1.0.1.3.1.5.0.0.75.3` | `<label>` | `"If enabled, the room will not have the notes tab"` |
| 760 | `r.0.1.1.0.1.3.1.5.0.0.76.0` | `<label>` | `"Hide Files Section?"` |
| 761 | `r.0.1.1.0.1.3.1.5.0.0.76.1` | `<a>` | `"No"` |
| 763 | `r.0.1.1.0.1.3.1.5.0.0.76.3` | `<label>` | `"If enabled, the room will not have the files tab"` |
| 764 | `r.0.1.1.0.1.3.1.5.0.0.77.0` | `<label>` | `"Set Dark Theme As Default?"` |
| 765 | `r.0.1.1.0.1.3.1.5.0.0.77.1` | `<a>` | `"No"` |
| 767 | `r.0.1.1.0.1.3.1.5.0.0.77.3` | `<label>` | `"If enabled, dark theme will be set as default"` |
| 768 | `r.0.1.1.0.1.3.1.5.0.0.78.0` | `<label>` | `"Preserve Webinar Mode chat?"` |
| 769 | `r.0.1.1.0.1.3.1.5.0.0.78.1` | `<a>` | `"No"` |
| 771 | `r.0.1.1.0.1.3.1.5.0.0.78.3` | `<label>` | `"If enabled, chatlog will be preserved across page reloads"` |
| 772 | `r.0.1.1.0.1.3.1.5.0.0.79.0` | `<label>` | `"Show Archives?"` |
| 773 | `r.0.1.1.0.1.3.1.5.0.0.79.1` | `<a>` | `"No"` |
| 775 | `r.0.1.1.0.1.3.1.5.0.0.79.3` | `<label>` | `"If enabled, users can see the archives on the side bar"` |
| 776 | `r.0.1.1.0.1.3.1.5.0.0.80.0` | `<label>` | `"Show Archives to specific Presenters"` |
| 777 | `r.0.1.1.0.1.3.1.5.0.0.80.1` | `<a>` | `"empty"` |
| 779 | `r.0.1.1.0.1.3.1.5.0.0.80.3` | `<label>` | `"Comma separated list of Presenter emails"` |
| 780 | `r.0.1.1.0.1.3.1.5.0.0.81.0` | `<label>` | `"Prevent sporadic reconnects?"` |
| 781 | `r.0.1.1.0.1.3.1.5.0.0.81.1` | `<a>` | `"No"` |
| 783 | `r.0.1.1.0.1.3.1.5.0.0.81.3` | `<label>` | `"prevents a user's connection to reconnect multiple times within a short time"` |
| 784 | `r.0.1.1.0.1.3.1.5.0.0.82.0` | `<label>` | `"Disalow Multi-logins?"` |
| 785 | `r.0.1.1.0.1.3.1.5.0.0.82.1` | `<a>` | `"No"` |
| 787 | `r.0.1.1.0.1.3.1.5.0.0.82.3` | `<label>` | `"If enabled, users could can only log in once per room"` |
| 788 | `r.0.1.1.0.1.3.1.5.0.0.83.0` | `<label>` | `"Send report email?"` |
| 789 | `r.0.1.1.0.1.3.1.5.0.0.83.1` | `<a>` | `"Yes!"` |
| 791 | `r.0.1.1.0.1.3.1.5.0.0.83.3` | `<label>` | `"If enabled, you will get an email to the address below for each incident"` |
| 792 | `r.0.1.1.0.1.3.1.5.0.0.84.0` | `<label>` | `"Ban IP list"` |
| 793 | `r.0.1.1.0.1.3.1.5.0.0.84.1` | `<a>` | `"empty"` |
| 795 | `r.0.1.1.0.1.3.1.5.0.0.84.3` | `<label>` | `"Comma separated list of banned IPs"` |
| 796 | `r.0.1.1.0.1.3.1.5.0.0.85.0` | `<label>` | `"Report emails"` |
| 797 | `r.0.1.1.0.1.3.1.5.0.0.85.1` | `<a>` | `"empty"` |
| 799 | `r.0.1.1.0.1.3.1.5.0.0.85.3` | `<label>` | `"Comma separated list of emails to receive abuse reports"` |
| 800 | `r.0.1.1.0.1.3.1.5.0.0.86.0` | `<label>` | `"Custom JWT Error Message"` |
| 801 | `r.0.1.1.0.1.3.1.5.0.0.86.1` | `<a>` | `"empty"` |
| 803 | `r.0.1.1.0.1.3.1.5.0.0.86.3` | `<label>` | `"Set a custom JWT error message"` |
| 804 | `r.0.1.1.0.1.3.1.5.0.0.87.0` | `<label>` | `"Open/Close Room emails"` |
| 805 | `r.0.1.1.0.1.3.1.5.0.0.87.1` | `<a>` | `"empty"` |
| 807 | `r.0.1.1.0.1.3.1.5.0.0.87.3` | `<label>` | `"Comma separated list of emails to receive open / close room events"` |
| 808 | `r.0.1.1.0.1.3.1.5.0.0.88.0` | `<label>` | `"Auto Open Room Time"` |
| 809 | `r.0.1.1.0.1.3.1.5.0.0.88.1` | `<a>` | `"empty"` |
| 811 | `r.0.1.1.0.1.3.1.5.0.0.88.3` | `<label>` | `"Time in Military EST to automatically OPEN the room. i.e. 7:30"` |
| 812 | `r.0.1.1.0.1.3.1.5.0.0.89.0` | `<label>` | `"Auto Close Room Time"` |
| 813 | `r.0.1.1.0.1.3.1.5.0.0.89.1` | `<a>` | `"empty"` |
| 815 | `r.0.1.1.0.1.3.1.5.0.0.89.3` | `<label>` | `"Time in Military EST to automatically CLOSE the room. i.e. 18:30"` |
| 816 | `r.0.1.1.0.1.3.1.5.0.0.90.0` | `<label>` | `"Ignore Auto Open & Close On Weekend"` |
| 817 | `r.0.1.1.0.1.3.1.5.0.0.90.1` | `<a>` | `"No"` |
| 818 | `r.0.1.1.0.1.3.1.5.0.0.91.0` | `<label>` | `"Alerts Sound Off?"` |
| 819 | `r.0.1.1.0.1.3.1.5.0.0.91.1` | `<a>` | `"No"` |
| 821 | `r.0.1.1.0.1.3.1.5.0.0.91.3` | `<label>` | `"Turn off alert cash register sound by default. Members can always turn it on"` |
| 822 | `r.0.1.1.0.1.3.1.5.0.0.92.0` | `<label>` | `"Sticky Non-Trade Alerts?"` |
| 823 | `r.0.1.1.0.1.3.1.5.0.0.92.1` | `<a>` | `"No"` |
| 825 | `r.0.1.1.0.1.3.1.5.0.0.92.3` | `<label>` | `"If enabled, the non-trade alert checkbox in the alert entry will be ON by default"` |
| 826 | `r.0.1.1.0.1.3.1.5.0.0.93.0` | `<label>` | `"Shared Files Access Case/Case?"` |
| 827 | `r.0.1.1.0.1.3.1.5.0.0.93.1` | `<a>` | `"No"` |
| 829 | `r.0.1.1.0.1.3.1.5.0.0.93.3` | `<label>` | `"Allow access to the shared drive on a case/case basis"` |
| 830 | `r.0.1.1.0.1.3.1.5.0.0.94.0` | `<label>` | `"Chat Only Room?"` |
| 831 | `r.0.1.1.0.1.3.1.5.0.0.94.1` | `<a>` | `"No"` |
| 833 | `r.0.1.1.0.1.3.1.5.0.0.94.3` | `<label>` | `"The room will be only text based chat/alerts, no audio/video"` |
| 834 | `r.0.1.1.0.1.3.1.5.0.0.95.0` | `<label>` | `"Auto Clear Chat?"` |
| 835 | `r.0.1.1.0.1.3.1.5.0.0.95.1` | `<a>` | `"No"` |
| 837 | `r.0.1.1.0.1.3.1.5.0.0.95.3` | `<label>` | `"Chat will clear at 11:45PM EST / 10:45PM Central."` |
| 838 | `r.0.1.1.0.1.3.1.5.0.0.96.0` | `<label>` | `"Auto Clear Alerts?"` |
| 839 | `r.0.1.1.0.1.3.1.5.0.0.96.1` | `<a>` | `"No"` |
| 841 | `r.0.1.1.0.1.3.1.5.0.0.96.3` | `<label>` | `"Alerts will clear at 11:45PM EST / 10:45PM Central."` |
| 842 | `r.0.1.1.0.1.3.1.5.0.0.97.0` | `<label>` | `"Overwrite Clear Hour:"` |
| 843 | `r.0.1.1.0.1.3.1.5.0.0.97.1` | `<a>` | `"empty"` |
| 845 | `r.0.1.1.0.1.3.1.5.0.0.97.3` | `<label>` | `"Overwrite the default 12am clearing time with this hour instead: Enter a number only, example: \"3\" for 3:00AM est.  ALL TIMES ARE EST'"` |
| 846 | `r.0.1.1.0.1.3.1.5.0.0.98.0` | `<label>` | `"Auto Clear Chat Weekend?"` |
| 847 | `r.0.1.1.0.1.3.1.5.0.0.98.1` | `<a>` | `"No"` |
| 849 | `r.0.1.1.0.1.3.1.5.0.0.98.3` | `<label>` | `"Chat will clear on Sundays."` |
| 850 | `r.0.1.1.0.1.3.1.5.0.0.99.0` | `<label>` | `"Archive Alerts?"` |
| 851 | `r.0.1.1.0.1.3.1.5.0.0.99.1` | `<a>` | `"Yes!"` |
| 853 | `r.0.1.1.0.1.3.1.5.0.0.99.3` | `<label>` | `"If enabled, archived alert logs will be available from a link in the room"` |
| 854 | `r.0.1.1.0.1.3.1.5.0.0.100.0` | `<label>` | `"Archive Chatlog?"` |
| 855 | `r.0.1.1.0.1.3.1.5.0.0.100.1` | `<a>` | `"Yes!"` |
| 856 | `r.0.1.1.0.1.3.1.5.0.0.101.0` | `<label>` | `"Hide Chatlog from Archive?"` |
| 857 | `r.0.1.1.0.1.3.1.5.0.0.101.1` | `<a>` | `"No"` |
| 859 | `r.0.1.1.0.1.3.1.5.0.0.101.3` | `<label>` | `"If enabled, archived chat logs will be hidden for the regular users in the room"` |
| 860 | `r.0.1.1.0.1.3.1.5.0.0.102.0` | `<label>` | `"Enable alert scheduler?"` |
| 861 | `r.0.1.1.0.1.3.1.5.0.0.102.1` | `<a>` | `"No"` |
| 863 | `r.0.1.1.0.1.3.1.5.0.0.102.3` | `<label>` | `"Presenters will be able to schedule sending alerts in the future"` |
| 864 | `r.0.1.1.0.1.3.1.5.0.0.103.0` | `<label>` | `"Enable VideoPlayer?"` |
| 865 | `r.0.1.1.0.1.3.1.5.0.0.103.1` | `<a>` | `"Yes!"` |
| 867 | `r.0.1.1.0.1.3.1.5.0.0.103.3` | `<label>` | `"In room video player"` |
| 868 | `r.0.1.1.0.1.3.1.5.0.0.104.0` | `<label>` | `"User Chat Screenshots?"` |
| 869 | `r.0.1.1.0.1.3.1.5.0.0.104.1` | `<a>` | `"No"` |
| 871 | `r.0.1.1.0.1.3.1.5.0.0.104.3` | `<label>` | `"If enabled, Users will be able to upload screenshots on the chat"` |
| 872 | `r.0.1.1.0.1.3.1.5.0.0.105.0` | `<label>` | `"Enable Discord?"` |
| 873 | `r.0.1.1.0.1.3.1.5.0.0.105.1` | `<a>` | `"No"` |
| 875 | `r.0.1.1.0.1.3.1.5.0.0.105.3` | `<label>` | `"It will enable Discord"` |
| 876 | `r.0.1.1.0.1.3.1.5.0.0.106.0` | `<label>` | `"Disable Emojis?"` |
| 877 | `r.0.1.1.0.1.3.1.5.0.0.106.1` | `<a>` | `"No"` |
| 879 | `r.0.1.1.0.1.3.1.5.0.0.106.3` | `<label>` | `"If enabled, Users will be able to add emojis using the emoji tool"` |
| 880 | `r.0.1.1.0.1.3.1.5.0.0.107.0` | `<label>` | `"Enable Rich Text Editor?"` |
| 881 | `r.0.1.1.0.1.3.1.5.0.0.107.1` | `<a>` | `"No"` |
| 883 | `r.0.1.1.0.1.3.1.5.0.0.107.3` | `<label>` | `"If enabled, Presenter will be able to format their messages using the rich text editor"` |
| 884 | `r.0.1.1.0.1.3.1.5.0.0.108.0` | `<label>` | `"Enable Reactions?"` |
| 885 | `r.0.1.1.0.1.3.1.5.0.0.108.1` | `<a>` | `"No"` |
| 887 | `r.0.1.1.0.1.3.1.5.0.0.108.3` | `<label>` | `"If enabled, Users will be able to add reactions to the messages"` |
| 888 | `r.0.1.1.0.1.3.1.5.0.0.109.0` | `<label>` | `"Enable QA Reactions?"` |
| 889 | `r.0.1.1.0.1.3.1.5.0.0.109.1` | `<a>` | `"No"` |
| 891 | `r.0.1.1.0.1.3.1.5.0.0.109.3` | `<label>` | `"If enabled, Users will be able to add reactions to the QA messages"` |
| 892 | `r.0.1.1.0.1.3.1.5.0.0.110.0` | `<label>` | `"Enable Edit Messages?"` |
| 893 | `r.0.1.1.0.1.3.1.5.0.0.110.1` | `<a>` | `"No"` |
| 895 | `r.0.1.1.0.1.3.1.5.0.0.110.3` | `<label>` | `"If enabled, everyone will be able to edit their own messages"` |
| 896 | `r.0.1.1.0.1.3.1.5.0.0.111.0` | `<label>` | `"Enable Edit Alerts?"` |
| 897 | `r.0.1.1.0.1.3.1.5.0.0.111.1` | `<a>` | `"No"` |
| 899 | `r.0.1.1.0.1.3.1.5.0.0.111.3` | `<label>` | `"If enabled, Presenters will be able to edit alerts"` |
| 900 | `r.0.1.1.0.1.3.1.5.0.0.112.0` | `<label>` | `"Alert Labels"` |
| 901 | `r.0.1.1.0.1.3.1.5.0.0.112.1` | `<a>` | `"empty"` |
| 903 | `r.0.1.1.0.1.3.1.5.0.0.112.3` | `<label>` | `"JSON array of alert labels, i.e. [\n  {\n    \"name\": \"Day Trade\",\n    \"hash\": \"DayTrade\",\n    \"color\": \"#9c4537\",\n     \"bgcolor\":\"#e8f5f7\"\n  },\n  {\n    \"name\": \"Swing Trade\",\n    \"hash\": \"SwingTrade\",\n    \"color\": \"#24794f\",\n\"bgcolor\":\"#e8f5f7\"\n  }\n]"` |
| 904 | `r.0.1.1.0.1.3.1.5.0.0.113.0` | `<label>` | `"Advanced Search Alerts?"` |
| 905 | `r.0.1.1.0.1.3.1.5.0.0.113.1` | `<a>` | `"No"` |
| 907 | `r.0.1.1.0.1.3.1.5.0.0.113.3` | `<label>` | `"If enabled, will allow advanced search alerts"` |
| 908 | `r.0.1.1.0.1.3.1.5.0.0.114.0` | `<label>` | `"Enable Delete Log?"` |
| 909 | `r.0.1.1.0.1.3.1.5.0.0.114.1` | `<a>` | `"No"` |
| 911 | `r.0.1.1.0.1.3.1.5.0.0.114.3` | `<label>` | `"If enabled, will keep track of deleted messages"` |
| 912 | `r.0.1.1.0.1.3.1.5.0.0.115.0` | `<label>` | `"User Badges?"` |
| 913 | `r.0.1.1.0.1.3.1.5.0.0.115.1` | `<a>` | `"No"` |
| 915 | `r.0.1.1.0.1.3.1.5.0.0.115.3` | `<label>` | `"If enabled, You can cofigure and set badges next to each user name, like [Gold], etc"` |
| 916 | `r.0.1.1.0.1.3.1.5.0.0.116.0` | `<label>` | `"Token Badges?"` |
| 917 | `r.0.1.1.0.1.3.1.5.0.0.116.1` | `<a>` | `"No"` |
| 919 | `r.0.1.1.0.1.3.1.5.0.0.116.3` | `<label>` | `"If enabled, Badges will come from JWT token in this room"` |
| 920 | `r.0.1.1.0.1.3.1.5.0.0.117.0` | `<label>` | `"Remove token from url"` |
| 921 | `r.0.1.1.0.1.3.1.5.0.0.117.1` | `<a>` | `"No"` |
| 923 | `r.0.1.1.0.1.3.1.5.0.0.117.3` | `<label>` | `"If enabled, remove the jwt from the ULR."` |
| 924 | `r.0.1.1.0.1.3.1.5.0.0.118.0` | `<label>` | `"Show Badges only to Presenters?"` |
| 925 | `r.0.1.1.0.1.3.1.5.0.0.118.1` | `<a>` | `"No"` |
| 927 | `r.0.1.1.0.1.3.1.5.0.0.118.3` | `<label>` | `"If enabled, You can cofigure and set badges next to each user name, like [Gold], etc"` |
| 928 | `r.0.1.1.0.1.3.1.5.0.0.119.0` | `<label>` | `"Don't follow Presenters?"` |
| 929 | `r.0.1.1.0.1.3.1.5.0.0.119.1` | `<a>` | `"No"` |
| 931 | `r.0.1.1.0.1.3.1.5.0.0.119.3` | `<label>` | `"If enabled, users will not follow Presenters"` |
| 932 | `r.0.1.1.0.1.3.1.5.0.0.120.0` | `<label>` | `"Disable Stars ?"` |
| 933 | `r.0.1.1.0.1.3.1.5.0.0.120.1` | `<a>` | `"No"` |
| 935 | `r.0.1.1.0.1.3.1.5.0.0.120.3` | `<label>` | `"If disabled, users will not see the stars next to user names"` |
| 936 | `r.0.1.1.0.1.3.1.5.0.0.121.0` | `<label>` | `"Phone Number Required?"` |
| 937 | `r.0.1.1.0.1.3.1.5.0.0.121.1` | `<a>` | `"No"` |
| 939 | `r.0.1.1.0.1.3.1.5.0.0.121.3` | `<label>` | `"User will need to enter a valid phone number to enter"` |
| 940 | `r.0.1.1.0.1.3.1.5.0.0.122.0` | `<label>` | `"Show password field?"` |
| 941 | `r.0.1.1.0.1.3.1.5.0.0.122.1` | `<a>` | `"No"` |
| 943 | `r.0.1.1.0.1.3.1.5.0.0.122.3` | `<label>` | `"Show password field on the login page"` |
| 944 | `r.0.1.1.0.1.3.1.5.0.0.123.0` | `<label>` | `"Is Main Room?"` |
| 945 | `r.0.1.1.0.1.3.1.5.0.0.123.1` | `<a>` | `"No"` |
| 946 | `r.0.1.1.0.1.3.1.5.0.0.124.0` | `<label>` | `"Is Archived Room?"` |
| 947 | `r.0.1.1.0.1.3.1.5.0.0.124.1` | `<a>` | `"No"` |
| 948 | `r.0.1.1.0.1.3.1.5.0.0.125.0` | `<label>` | `"Is New Room?"` |
| 949 | `r.0.1.1.0.1.3.1.5.0.0.125.1` | `<a>` | `"No"` |
| 950 | `r.0.1.1.0.1.3.1.5.0.0.126.0` | `<label>` | `"BZ News (DO NOT USE UNLESS YOU HAVE API)"` |
| 951 | `r.0.1.1.0.1.3.1.5.0.0.126.1` | `<a>` | `"No"` |
| 953 | `r.0.1.1.0.1.3.1.5.0.0.126.3` | `<label>` | `"You will need an API key from benzinga"` |
| 954 | `r.0.1.1.0.1.3.1.5.0.0.127.0` | `<label>` | `"Custom Benzinga logo url"` |
| 955 | `r.0.1.1.0.1.3.1.5.0.0.127.1` | `<a>` | `"empty"` |
| 957 | `r.0.1.1.0.1.3.1.5.0.0.127.3` | `<label>` | `"Set custom Benzinga logo url"` |
| 958 | `r.0.1.1.0.1.3.1.5.0.0.128.0` | `<label>` | `"Custom Benzinga link url"` |
| 959 | `r.0.1.1.0.1.3.1.5.0.0.128.1` | `<a>` | `"empty"` |
| 961 | `r.0.1.1.0.1.3.1.5.0.0.128.3` | `<label>` | `"Set custom Benzinga link url"` |
| 962 | `r.0.1.1.0.1.3.1.5.0.0.129.0` | `<label>` | `"Imgur ClientID:"` |
| 963 | `r.0.1.1.0.1.3.1.5.0.0.129.1` | `<a>` | `"empty"` |
| 964 | `r.0.1.1.0.1.3.1.5.0.0.130.0` | `<label>` | `"Imgur api key:"` |
| 965 | `r.0.1.1.0.1.3.1.5.0.0.130.1` | `<a>` | `"empty"` |
| 966 | `r.0.1.1.0.1.3.1.5.0.0.131.0` | `<label>` | `"Imgur rapid key:"` |
| 967 | `r.0.1.1.0.1.3.1.5.0.0.131.1` | `<a>` | `"empty"` |
| 968 | `r.0.1.1.0.1.3.1.5.0.0.132.0` | `<label>` | `"X User Access Token:"` |
| 969 | `r.0.1.1.0.1.3.1.5.0.0.132.1` | `<a>` | `"empty"` |
| 970 | `r.0.1.1.0.1.3.1.5.0.0.133.0` | `<label>` | `"X User Access Token Secret:"` |
| 971 | `r.0.1.1.0.1.3.1.5.0.0.133.1` | `<a>` | `"empty"` |
| 972 | `r.0.1.1.0.1.3.1.5.0.0.134.0` | `<label>` | `"Subscription Plans:"` |
| 973 | `r.0.1.1.0.1.3.1.5.0.0.134.1` | `<a>` | `"empty"` |
| 975 | `r.0.1.1.0.1.3.1.5.0.0.134.3` | `<label>` | `"JSON array with subscription plans, i.e. [{\n                                    \"name\": \"Basic Plan\",\n\n    \"fee\": 4.99,\n    \"desc\": \"Basic Plan Description.\",\n    \"recommended\": false\n  },\n  {\n\n    \"name\": \"Pro Plan\",\n    \"fee\": 9.99,\n    \"desc\": \"Pr"` |
| 976 | `r.0.1.1.0.1.3.1.5.0.0.135.0` | `<label>` | `"Stripe Email:"` |
| 977 | `r.0.1.1.0.1.3.1.5.0.0.135.1` | `<a>` | `"empty"` |
| 978 | `r.0.1.1.0.1.3.1.5.0.0.136.0` | `<label>` | `"Live User stats?"` |
| 979 | `r.0.1.1.0.1.3.1.5.0.0.136.1` | `<a>` | `"No"` |
| 980 | `r.0.1.1.0.1.3.1.5.0.0.137.0` | `<label>` | `"UserXrefStats?"` |
| 981 | `r.0.1.1.0.1.3.1.5.0.0.137.1` | `<a>` | `"No"` |
| 982 | `r.0.1.1.0.1.3.1.5.0.0.137.2` | `<label>` | `"Only enabled if you need granular Users Stats"` |
| 983 | `r.0.1.1.0.1.3.1.5.0.0.138.0` | `<label>` | `"API secret"` |
| 984 | `r.0.1.1.0.1.3.1.5.0.0.138.1` | `<a>` | `"empty"` |
| 985 | `r.0.1.1.0.1.3.1.5.0.0.138.2` | `<button>` | `"New Secret"` |
| 986 | `r.0.1.1.0.1.3.1.5.0.0.139.0` | `<a>` | `"API POST Routes Docs"` |
| 987 | `r.0.1.1.0.1.3.1.5.0.0.140.0` | `<label>` | `"Slack post URL secret"` |
| 988 | `r.0.1.1.0.1.3.1.5.0.0.140.1` | `<a>` | `"empty"` |
| 989 | `r.0.1.1.0.1.3.1.5.0.0.141.0` | `<label>` | `"Disable PUSH Alerts?"` |
| 990 | `r.0.1.1.0.1.3.1.5.0.0.141.1` | `<a>` | `"No"` |
| 991 | `r.0.1.1.0.1.3.1.5.0.0.142.0` | `<label>` | `"Moderator Message:"` |
| 992 | `r.0.1.1.0.1.3.1.5.0.0.142.1` | `<a>` | `"empty"` |
| 993 | `r.0.1.1.0.1.3.1.5.0.0.143.0` | `<label>` | `"Positions Iframe Url"` |
| 994 | `r.0.1.1.0.1.3.1.5.0.0.143.1` | `<a>` | `"empty"` |
| 995 | `r.0.1.1.0.1.3.1.5.0.0.144.0` | `<label>` | `"Enable positions iframe?"` |
| 996 | `r.0.1.1.0.1.3.1.5.0.0.144.1` | `<a>` | `"No"` |
| 997 | `r.0.1.1.0.1.3.1.5.0.0.145.0` | `<label>` | `"Enable Tip Me Button?"` |
| 998 | `r.0.1.1.0.1.3.1.5.0.0.145.1` | `<a>` | `"No"` |
| 999 | `r.0.1.1.0.1.3.1.5.0.0.146.0` | `<label>` | `"Tip Me Button Text"` |
| 1000 | `r.0.1.1.0.1.3.1.5.0.0.146.1` | `<a>` | `"Tip Me?"` |
| 1001 | `r.0.1.1.0.1.3.1.5.0.0.147.0` | `<label>` | `"Tip Me Button Url"` |
| 1002 | `r.0.1.1.0.1.3.1.5.0.0.147.1` | `<a>` | `"empty"` |
| 1003 | `r.0.1.1.0.1.3.1.5.0.0.148.0` | `<label>` | `"Sales Banner"` |
| 1004 | `r.0.1.1.0.1.3.1.5.0.0.148.1` | `<a>` | `"empty"` |
| 1005 | `r.0.1.1.0.1.3.1.5.0.0.149.0` | `<label>` | `"Admin panel access list:"` |
| 1006 | `r.0.1.1.0.1.3.1.5.0.0.149.1` | `<a>` | `"empty"` |
| 1008 | `r.0.1.1.0.1.3.1.5.0.0.149.3` | `<label>` | `"put any emails here of admins you want to allow access to the admin panel section. (i.e. \"john@example.com\",\"jane@example.com\") comma separated list."` |
| 1009 | `r.0.1.1.0.1.3.1.5.0.0.150.0` | `<label>` | `"Alerts only Room?"` |
| 1010 | `r.0.1.1.0.1.3.1.5.0.0.150.1` | `<a>` | `"No"` |
| 1012 | `r.0.1.1.0.1.3.1.5.0.0.150.3` | `<label>` | `"Alerts only rooms are just rooms to receve push notifications and nothing else. Don't use this if you don't know what it is!!!"` |
| 1013 | `r.0.1.1.0.1.3.1.5.0.0.151.0` | `<label>` | `"Custom Alert POST"` |
| 1014 | `r.0.1.1.0.1.3.1.5.0.0.151.1` | `<a>` | `"empty"` |
| 1016 | `r.0.1.1.0.1.3.1.5.0.0.151.3` | `<label>` | `"POST alerts to this URL endpoint"` |
| 1017 | `r.0.1.1.0.1.3.1.5.0.0.152.0` | `<label>` | `"Custom Alert secret"` |
| 1018 | `r.0.1.1.0.1.3.1.5.0.0.152.1` | `<a>` | `"empty"` |
| 1020 | `r.0.1.1.0.1.3.1.5.0.0.152.3` | `<label>` | `"secret PW for the endpoint above"` |
| 1021 | `r.0.1.1.0.1.3.1.5.0.0.153.0` | `<label>` | `"Strict Browser?"` |
| 1022 | `r.0.1.1.0.1.3.1.5.0.0.153.1` | `<a>` | `"No"` |
| 1024 | `r.0.1.1.0.1.3.1.5.0.0.153.3` | `<label>` | `"If YES, Only Chrome, Firefox, and Opera are allowed in (no try anyhow link)..."` |
| 1025 | `r.0.1.1.0.1.3.1.5.0.0.154.0` | `<label>` | `"Disable Chat Flood?"` |
| 1026 | `r.0.1.1.0.1.3.1.5.0.0.154.1` | `<a>` | `"No"` |
| 1027 | `r.0.1.1.0.1.3.1.5.0.0.155.0` | `<label>` | `"Huge Priv Msg Alert?"` |
| 1028 | `r.0.1.1.0.1.3.1.5.0.0.155.1` | `<a>` | `"No"` |
| 1030 | `r.0.1.1.0.1.3.1.5.0.0.155.3` | `<label>` | `"Some user can't see the private messages, this makes a HUGE popup"` |
| 1031 | `r.0.1.1.0.1.3.1.5.0.0.156.0` | `<label>` | `"OffTopic Channels/Tabs"` |
| 1032 | `r.0.1.1.0.1.3.1.5.0.0.156.1` | `<a>` | `"Yes!"` |
| 1034 | `r.0.1.1.0.1.3.1.5.0.0.156.3` | `<label>` | `"This setting adds an OffTopic, channel tabs next to general chat"` |
| 1035 | `r.0.1.1.0.1.3.1.5.0.0.157.0` | `<label>` | `"Auto switch to OffTopic Channels/Tabs?"` |
| 1036 | `r.0.1.1.0.1.3.1.5.0.0.157.1` | `<a>` | `"No"` |
| 1038 | `r.0.1.1.0.1.3.1.5.0.0.157.3` | `<label>` | `"Auto Switch to OffTopic tab"` |
| 1039 | `r.0.1.1.0.1.3.1.5.0.0.158.0` | `<label>` | `"Admin Channels/Tabs"` |
| 1040 | `r.0.1.1.0.1.3.1.5.0.0.158.1` | `<a>` | `"No"` |
| 1042 | `r.0.1.1.0.1.3.1.5.0.0.158.3` | `<label>` | `"This setting adds an admin/presenter dedicated chat tab"` |
| 1043 | `r.0.1.1.0.1.3.1.5.0.0.159.0` | `<label>` | `"Extra Admin Channels"` |
| 1044 | `r.0.1.1.0.1.3.1.5.0.0.159.1` | `<a>` | `"empty"` |
| 1046 | `r.0.1.1.0.1.3.1.5.0.0.159.3` | `<label>` | `"Comma separated list of extra admin channels"` |
| 1047 | `r.0.1.1.0.1.3.1.5.0.0.160.0` | `<label>` | `"Extra Regular Channels"` |
| 1048 | `r.0.1.1.0.1.3.1.5.0.0.160.1` | `<a>` | `"empty"` |
| 1050 | `r.0.1.1.0.1.3.1.5.0.0.160.3` | `<label>` | `"Comma separated list of extra regular (anyone can post) channels"` |
| 1051 | `r.0.1.1.0.1.3.1.5.0.0.161.0` | `<label>` | `"Rename \"Main Chat\""` |
| 1052 | `r.0.1.1.0.1.3.1.5.0.0.161.1` | `<a>` | `"empty"` |
| 1054 | `r.0.1.1.0.1.3.1.5.0.0.161.3` | `<label>` | `"Rename the Main Chat channel to..."` |
| 1055 | `r.0.1.1.0.1.3.1.5.0.0.162.0` | `<label>` | `"Rename \"Off-Topic\""` |
| 1056 | `r.0.1.1.0.1.3.1.5.0.0.162.1` | `<a>` | `"empty"` |
| 1058 | `r.0.1.1.0.1.3.1.5.0.0.162.3` | `<label>` | `"Rename the Off-Topic channel to..."` |
| 1059 | `r.0.1.1.0.1.3.1.5.0.0.163.0` | `<label>` | `"Chat Tabs With Badges:"` |
| 1060 | `r.0.1.1.0.1.3.1.5.0.0.163.1` | `<a>` | `"empty"` |
| 1062 | `r.0.1.1.0.1.3.1.5.0.0.163.3` | `<label>` | `"List of chat tabs with badges: [\n  {\n    \"name\": \"easy channel\",\n    \"badges\": [\n      \"61eafd612fcdee7bc8e979bc\",\n      \"6489f1f98993a677b83cdd70\"\n    ]\n  },\n  {\n    \"name\": \"harder channel\",\n    \"badges\": [\n      \"61eafd612fcdee7bc8e979bc\"\n    ]\n  "` |
| 1063 | `r.0.1.1.0.1.3.1.5.0.0.164.0` | `<label>` | `"Chat Profanity filter?"` |
| 1064 | `r.0.1.1.0.1.3.1.5.0.0.164.1` | `<a>` | `"No"` |
| 1066 | `r.0.1.1.0.1.3.1.5.0.0.164.3` | `<label>` | `"Profanity filter will try to filter (put xxxx) on bad words"` |
| 1067 | `r.0.1.1.0.1.3.1.5.0.0.165.0` | `<label>` | `"Ignore List"` |
| 1068 | `r.0.1.1.0.1.3.1.5.0.0.165.1` | `<a>` | `"empty"` |
| 1069 | `r.0.1.1.0.1.3.1.5.0.0.165.2` | `<label>` | `"Comma separated list OK words to remove from the filter"` |
| 1070 | `r.0.1.1.0.1.3.1.5.0.0.166.0` | `<label>` | `"Extra Bad list"` |
| 1071 | `r.0.1.1.0.1.3.1.5.0.0.166.1` | `<a>` | `"empty"` |
| 1072 | `r.0.1.1.0.1.3.1.5.0.0.166.2` | `<label>` | `"Comma separated list of additional bad words you want to filter"` |
| 1073 | `r.0.1.1.0.1.3.1.5.0.0.167.0` | `<label>` | `"Simplified Note Editor?"` |
| 1074 | `r.0.1.1.0.1.3.1.5.0.0.167.1` | `<a>` | `"No"` |
| 1076 | `r.0.1.1.0.1.3.1.5.0.0.167.3` | `<label>` | `"If enabled, the Note Editor will be simplified."` |
| 1077 | `r.0.1.1.0.1.3.1.5.0.0.168.0` | `<label>` | `"Disable Audio Meter?"` |
| 1078 | `r.0.1.1.0.1.3.1.5.0.0.168.1` | `<a>` | `"No"` |
| 1080 | `r.0.1.1.0.1.3.1.5.0.0.168.3` | `<label>` | `"Turn this on to disable the audio level meter next to the presenter name when they are talking"` |
| 1081 | `r.0.1.1.0.1.3.1.5.0.0.169.0` | `<label>` | `"Hide WebCam in the room?"` |
| 1082 | `r.0.1.1.0.1.3.1.5.0.0.169.1` | `<a>` | `"No"` |
| 1084 | `r.0.1.1.0.1.3.1.5.0.0.169.3` | `<label>` | `"If enabled, WebCam will be hidden in the room"` |
| 1085 | `r.0.1.1.0.1.3.1.5.0.0.170.0` | `<label>` | `"Record alerts and chat?"` |
| 1086 | `r.0.1.1.0.1.3.1.5.0.0.170.1` | `<a>` | `"No"` |
| 1087 | `r.0.1.1.0.1.3.1.5.0.0.171.0` | `<label>` | `"Auto record presenters?"` |
| 1088 | `r.0.1.1.0.1.3.1.5.0.0.171.1` | `<a>` | `"No"` |
| 1089 | `r.0.1.1.0.1.3.1.5.0.0.172.0` | `<label>` | `"Blinking [REC]?"` |
| 1090 | `r.0.1.1.0.1.3.1.5.0.0.172.1` | `<a>` | `"No"` |
| 1091 | `r.0.1.1.0.1.3.1.5.0.0.173.0` | `<label>` | `"Hide Recordings?"` |
| 1092 | `r.0.1.1.0.1.3.1.5.0.0.173.1` | `<a>` | `"No"` |
| 1094 | `r.0.1.1.0.1.3.1.5.0.0.173.3` | `<label>` | `"If enabled, recordings will be hidden in archives"` |
| 1095 | `r.0.1.1.0.1.3.1.5.0.0.174.0` | `<label>` | `"Recording Reminder If Speaking?"` |
| 1096 | `r.0.1.1.0.1.3.1.5.0.0.174.1` | `<a>` | `"No"` |
| 1098 | `r.0.1.1.0.1.3.1.5.0.0.174.3` | `<label>` | `"If enabled, will show recording reminder popup"` |
| 1099 | `r.0.1.1.0.1.3.1.5.0.0.175.0` | `<label>` | `"Show Recordings tab in the room?"` |
| 1100 | `r.0.1.1.0.1.3.1.5.0.0.175.1` | `<a>` | `"No"` |
| 1102 | `r.0.1.1.0.1.3.1.5.0.0.175.3` | `<label>` | `"If enabled, will show recordings tab in the room"` |
| 1103 | `r.0.1.1.0.1.3.1.5.0.0.176.0` | `<label>` | `"Disable download button for Recordings for users?"` |
| 1104 | `r.0.1.1.0.1.3.1.5.0.0.176.1` | `<a>` | `"No"` |
| 1106 | `r.0.1.1.0.1.3.1.5.0.0.176.3` | `<label>` | `"If enabled, will disable download button for Recordings for users"` |
| 1107 | `r.0.1.1.0.1.3.1.5.0.0.177.0` | `<label>` | `"Disable Closed Captioning?"` |
| 1108 | `r.0.1.1.0.1.3.1.5.0.0.177.1` | `<a>` | `"No"` |
| 1110 | `r.0.1.1.0.1.3.1.5.0.0.177.3` | `<label>` | `"If enabled, will disable closed captioning for the room"` |
| 1111 | `r.0.1.1.0.1.3.1.5.0.0.178.0` | `<label>` | `"Hide recordings info for users?"` |
| 1112 | `r.0.1.1.0.1.3.1.5.0.0.178.1` | `<a>` | `"No"` |
| 1114 | `r.0.1.1.0.1.3.1.5.0.0.178.3` | `<label>` | `"If enabled, will hide recording info for users"` |
| 1115 | `r.0.1.1.0.1.3.1.5.0.0.179.0` | `<label>` | `"Minutes of recording inactivity?"` |
| 1116 | `r.0.1.1.0.1.3.1.5.0.0.179.1` | `<a>` | `"5"` |
| 1118 | `r.0.1.1.0.1.3.1.5.0.0.179.3` | `<label>` | `"Number of minutes to flag a recording if inactive (runaway). Leave at 0 to disable."` |
| 1119 | `r.0.1.1.0.1.3.1.5.0.0.180.0` | `<label>` | `"Auto stop recording if inactive?"` |
| 1120 | `r.0.1.1.0.1.3.1.5.0.0.180.1` | `<a>` | `"No"` |
| 1122 | `r.0.1.1.0.1.3.1.5.0.0.180.3` | `<label>` | `"If enabled, auto stop inactive recordings"` |
| 1123 | `r.0.1.1.0.1.3.1.5.0.0.181.0` | `<label>` | `"Slack url to post"` |
| 1124 | `r.0.1.1.0.1.3.1.5.0.0.181.1` | `<a>` | `"empty"` |
| 1126 | `r.0.1.1.0.1.3.1.5.0.0.181.3` | `<label>` | `"If set, it will post to this slack url when a recording is flagged as inactive (runaway)"` |
| 1127 | `r.0.1.1.0.1.3.1.5.0.0.182.0` | `<label>` | `"Sticky give Mic/Cam?"` |
| 1128 | `r.0.1.1.0.1.3.1.5.0.0.182.1` | `<a>` | `"No"` |
| 1130 | `r.0.1.1.0.1.3.1.5.0.0.182.3` | `<label>` | `"If enabled, when a presenter gives mic/cam, the setting will stick"` |
| 1131 | `r.0.1.1.0.1.3.1.5.0.0.183.0` | `<label>` | `"Overlay userID on screenshare?"` |
| 1132 | `r.0.1.1.0.1.3.1.5.0.0.183.1` | `<a>` | `"No"` |
| 1134 | `r.0.1.1.0.1.3.1.5.0.0.183.3` | `<label>` | `"If enabled, it will overlay userID on screenshare"` |
| 1135 | `r.0.1.1.0.1.3.1.5.0.0.184.0` | `<label>` | `"Auto give Mic/Screen to Users?"` |
| 1136 | `r.0.1.1.0.1.3.1.5.0.0.184.1` | `<a>` | `"No"` |
| 1138 | `r.0.1.1.0.1.3.1.5.0.0.184.3` | `<label>` | `"If enabled, ALL regular users will  have mic/screenshare in the room. ***** CAREFULL ******"` |
| 1139 | `r.0.1.1.0.1.3.1.5.0.0.185.0` | `<label>` | `"Don't stop on mute?"` |
| 1140 | `r.0.1.1.0.1.3.1.5.0.0.185.1` | `<a>` | `"No"` |
| 1142 | `r.0.1.1.0.1.3.1.5.0.0.185.3` | `<label>` | `"Don't auto stop the rec on mic mute"` |
| 1143 | `r.0.1.1.0.1.3.1.5.0.0.186.0` | `<label>` | `"Individual Volume Controls?"` |
| 1144 | `r.0.1.1.0.1.3.1.5.0.0.186.1` | `<a>` | `"No"` |
| 1146 | `r.0.1.1.0.1.3.1.5.0.0.186.3` | `<label>` | `"Individual volume controls for each Presenter"` |
| 1147 | `r.0.1.1.0.1.3.1.5.0.0.187.0` | `<label>` | `"NEW recording procedure?"` |
| 1148 | `r.0.1.1.0.1.3.1.5.0.0.187.1` | `<a>` | `"No"` |
| 1150 | `r.0.1.1.0.1.3.1.5.0.0.187.3` | `<label>` | `"new experimental serverside rec control, more reliable?"` |
| 1151 | `r.0.1.1.0.1.3.1.5.0.0.188.0` | `<label>` | `"Save Recs to AWS S3"` |
| 1152 | `r.0.1.1.0.1.3.1.5.0.0.188.1` | `<a>` | `"No"` |
| 1153 | `r.0.1.1.0.1.3.1.5.0.0.189.0` | `<label>` | `"S3 Key ID/Name"` |
| 1154 | `r.0.1.1.0.1.3.1.5.0.0.189.1` | `<a>` | `"empty"` |
| 1155 | `r.0.1.1.0.1.3.1.5.0.0.190.0` | `<label>` | `"S3 Key Secret"` |
| 1156 | `r.0.1.1.0.1.3.1.5.0.0.190.1` | `<a>` | `"empty"` |
| 1157 | `r.0.1.1.0.1.3.1.5.0.0.191.0` | `<label>` | `"S3 Bucket"` |
| 1158 | `r.0.1.1.0.1.3.1.5.0.0.191.1` | `<a>` | `"empty"` |
| 1159 | `r.0.1.1.0.1.3.1.5.0.0.192.0` | `<label>` | `"S3 Bucket subfolder/path"` |
| 1160 | `r.0.1.1.0.1.3.1.5.0.0.192.1` | `<a>` | `"empty"` |
| 1161 | `r.0.1.1.0.1.3.1.5.0.0.194.0` | `<label>` | `"Save Recs to Vimeo"` |
| 1162 | `r.0.1.1.0.1.3.1.5.0.0.194.1` | `<a>` | `"No"` |
| 1163 | `r.0.1.1.0.1.3.1.5.0.0.195.0` | `<label>` | `"Vimeo ClientID"` |
| 1164 | `r.0.1.1.0.1.3.1.5.0.0.195.1` | `<a>` | `"empty"` |
| 1165 | `r.0.1.1.0.1.3.1.5.0.0.196.0` | `<label>` | `"Vimeo Secret"` |
| 1166 | `r.0.1.1.0.1.3.1.5.0.0.196.1` | `<a>` | `"empty"` |
| 1167 | `r.0.1.1.0.1.3.1.5.0.0.197.0` | `<label>` | `"Vimeo Token"` |
| 1168 | `r.0.1.1.0.1.3.1.5.0.0.197.1` | `<a>` | `"empty"` |
| 1169 | `r.0.1.1.0.1.3.1.5.0.0.198.0` | `<label>` | `"Vimeo Folder ID (optional)"` |
| 1170 | `r.0.1.1.0.1.3.1.5.0.0.198.1` | `<a>` | `"empty"` |
| 1171 | `r.0.1.1.0.1.3.1.5.0.0.199.0` | `<label>` | `"Broadcast using OBS?"` |
| 1172 | `r.0.1.1.0.1.3.1.5.0.0.199.1` | `<a>` | `"No"` |
| 1173 | `r.0.1.1.0.1.3.1.5.0.0.200.0` | `<label>` | `"OBS Stream Key"` |
| 1174 | `r.0.1.1.0.1.3.1.5.0.0.200.1` | `<a>` | `"empty"` |
| 1175 | `r.0.1.1.0.1.3.1.5.0.0.201.0` | `<label>` | `"OBS Stream Satus WebHook URL"` |
| 1176 | `r.0.1.1.0.1.3.1.5.0.0.201.1` | `<a>` | `"empty"` |
| 1177 | `r.0.1.1.0.1.3.1.5.0.0.202.0` | `<label>` | `"Restream URL"` |
| 1178 | `r.0.1.1.0.1.3.1.5.0.0.202.1` | `<a>` | `"empty"` |
| 1179 | `r.0.1.1.0.1.3.1.5.0.0.203.0` | `<label>` | `"Restream Key"` |
| 1180 | `r.0.1.1.0.1.3.1.5.0.0.203.1` | `<a>` | `"empty"` |
| 1181 | `r.0.1.1.0.1.3.1.5.0.0.205.0` | `<label>` | `"Custom Rec Params"` |
| 1182 | `r.0.1.1.0.1.3.1.5.0.0.205.1` | `<a>` | `"empty"` |
| 1183 | `r.0.1.1.0.1.3.1.5.0.0.206.0` | `<label>` | `"Twillio SID"` |
| 1184 | `r.0.1.1.0.1.3.1.5.0.0.206.1` | `<a>` | `"empty"` |
| 1185 | `r.0.1.1.0.1.3.1.5.0.0.207.0` | `<label>` | `"Twillio Token"` |
| 1186 | `r.0.1.1.0.1.3.1.5.0.0.207.1` | `<a>` | `"empty"` |
| 1187 | `r.0.1.1.0.1.3.1.5.0.0.208.0` | `<label>` | `"Twillio Phone"` |
| 1188 | `r.0.1.1.0.1.3.1.5.0.0.208.1` | `<a>` | `"empty"` |
| 1189 | `r.0.1.1.0.1.3.1.5.0.0.209.0` | `<label>` | `"Protexting Token"` |
| 1190 | `r.0.1.1.0.1.3.1.5.0.0.209.1` | `<a>` | `"empty"` |
| 1191 | `r.0.1.1.0.1.3.1.5.0.0.210.0` | `<label>` | `"Protexting GroupID"` |
| 1192 | `r.0.1.1.0.1.3.1.5.0.0.210.1` | `<a>` | `"empty"` |
| 1193 | `r.0.1.1.0.1.3.1.5.0.0.211.0` | `<label>` | `"Use h264 codec?"` |
| 1194 | `r.0.1.1.0.1.3.1.5.0.0.211.1` | `<a>` | `"Yes!"` |
| 1195 | `r.0.1.1.0.1.3.1.5.0.0.212.0` | `<label>` | `"Use VP9 codec?"` |
| 1196 | `r.0.1.1.0.1.3.1.5.0.0.212.1` | `<a>` | `"No"` |
| 1197 | `r.0.1.1.0.1.3.1.5.0.0.213.0` | `<label>` | `"Use HQ Video?"` |
| 1198 | `r.0.1.1.0.1.3.1.5.0.0.213.1` | `<a>` | `"No"` |
| 1199 | `r.0.1.1.0.1.3.1.5.0.0.213.2` | `<label>` | `"Experimental better vid quality on vp8"` |
| 1200 | `r.0.1.1.0.1.3.1.5.0.0.214.0` | `<label>` | `"Custom Player URL"` |
| 1201 | `r.0.1.1.0.1.3.1.5.0.0.214.1` | `<a>` | `"empty"` |
| 1203 | `r.0.1.1.0.1.3.1.5.0.0.214.3` | `<label>` | `"If set, it will always show an iframe with this url in the screens section"` |
| 1204 | `r.0.1.1.0.1.3.1.5.0.0.215.0` | `<label>` | `"Iframe Cookie Fix?"` |
| 1205 | `r.0.1.1.0.1.3.1.5.0.0.215.1` | `<a>` | `"No"` |
| 1206 | `r.0.1.1.0.1.3.1.5.0.0.216.0` | `<label>` | `"Autoreset sess at 12am?"` |
| 1207 | `r.0.1.1.0.1.3.1.5.0.0.216.1` | `<a>` | `"No"` |
| 1208 | `r.0.1.1.0.1.3.1.5.0.0.217.0` | `<label>` | `"Don't Soft reset at 12am?"` |
| 1209 | `r.0.1.1.0.1.3.1.5.0.0.217.1` | `<a>` | `"No"` |
| 1210 | `r.0.1.1.0.1.3.1.5.0.0.219.0` | `<label>` | `"New FCM Method?"` |
| 1211 | `r.0.1.1.0.1.3.1.5.0.0.219.1` | `<a>` | `"No"` |
| 1212 | `r.0.1.1.0.1.3.1.5.0.0.220.0` | `<label>` | `"PTR app exp days"` |
| 1213 | `r.0.1.1.0.1.3.1.5.0.0.220.1` | `<a>` | `"7"` |
| 1214 | `r.0.1.1.0.1.3.1.5.0.0.221.0` | `<label>` | `"Push expire days"` |
| 1215 | `r.0.1.1.0.1.3.1.5.0.0.221.1` | `<a>` | `"14"` |
| 1216 | `r.0.1.1.0.1.3.1.5.0.0.222.0` | `<label>` | `"Custom Legal Disclosure"` |
| 1217 | `r.0.1.1.0.1.3.1.5.0.0.222.1` | `<a>` | `"empty"` |
| 1219 | `r.0.1.1.0.1.3.1.5.0.0.222.3` | `<label>` | `"If set, Users will need to agree to thisDisclosure to enter."` |
| 1220 | `r.0.1.1.0.1.3.1.5.0.0.223.0` | `<label>` | `"Custom User Info Page"` |
| 1221 | `r.0.1.1.0.1.3.1.5.0.0.223.1` | `<a>` | `"empty"` |
| 1222 | `r.0.1.1.0.1.3.1.5.0.0.224.0` | `<label>` | `"Scheudle ID (GCal)"` |
| 1223 | `r.0.1.1.0.1.3.1.5.0.0.224.1` | `<a>` | `"empty"` |
| 1224 | `r.0.1.1.0.1.3.1.5.0.0.225.0` | `<label>` | `"Invalid Tokens"` |
| 1225 | `r.0.1.1.0.1.3.1.5.0.0.225.1` | `<a>` | `"empty"` |
| 1227 | `r.0.1.1.0.1.3.1.5.0.0.225.3` | `<label>` | `"Comma separated list of invalid JWT tokens."` |
| 1228 | `r.0.1.1.0.1.3.1.5.0.4.0.0` | `<p>` | `"(DON'T TURN THIS ON, If PTR did not clear you for v3!! it will not work....)"` |
| 1229 | `r.0.1.1.0.1.3.1.5.0.4.0.1` | `<p>` | `"(DON'T TURN THIS ON, If PTR did not clear you for v5!! it will not work....)"` |
| 1258 | `r.0.1.1.0.1.3.1.5.0.4.0.30` | `<p>` | `"These  vars allow to server altertaive code version for this room"` |
| 1269 | `r.0.1.1.0.1.3.1.5.0.4.0.41` | `<p>` | `"For pushing alerts and streams to other rooms, you can use the following settings. You need the other rooms ID and the API Secret of the other room to do this."` |
| 1278 | `r.0.1.1.0.1.3.1.5.0.4.0.50` | `<p>` | `"(DON'T USE this for ST)"` |
| 1279 | `r.0.1.1.0.1.3.1.5.0.4.0.51` | `<p>` | `"Also enable the app for free trials?"` |
| 1280 | `r.0.1.1.0.1.3.1.5.0.4.0.52` | `<p>` | `"(DON'T USE unless you have a custom app)"` |
| 1286 | `r.0.1.1.0.1.3.1.5.0.4.0.58` | `<p>` | `"Note above needs to ALSO be on (enable ptr app)"` |
| 1293 | `r.0.1.1.0.1.3.1.0.0.0.0.3.0` | `<button>` | `"User List Actions"` |
| 1296 | `r.0.1.1.0.1.3.1.0.0.2.0.0.1` | `<span>` | `"Select All"` |
| 1298 | `r.0.1.1.0.1.3.1.0.0.2.0.1.1` | `<span>` | `"Apply to all rooms?"` |
| 1310 | `r.0.1.1.0.1.3.1.0.0.3.0.0.0` | `<th>` | `"#"` |
| 1311 | `r.0.1.1.0.1.3.1.0.0.3.0.0.1` | `<th>` | `"Name / Email"` |
| 1312 | `r.0.1.1.0.1.3.1.0.0.3.0.0.2` | `<th>` | `"Last Login/Notes"` |
| 1313 | `r.0.1.1.0.1.3.1.0.0.3.0.0.3` | `<th>` | `"Role / Status"` |
| 1314 | `r.0.1.1.0.1.3.1.0.0.3.0.0.4` | `<th>` | `"Actions"` |
| 1315 | `r.0.1.1.0.1.3.1.0.0.3.1.0.0` | `<td>` | `"0"` |
| 1320 | `r.0.1.1.0.1.3.1.0.0.3.1.1.0` | `<td>` | `"1"` |
| 1321 | `r.0.1.1.0.1.3.1.0.0.3.1.1.1` | `<td>` | `"[OWNER_NAME]\n                                        \n                                        \n                                        \n\n                                        \n                                         [MEMBER_A_EMAIL]"` |
| 1322 | `r.0.1.1.0.1.3.1.0.0.3.1.1.2` | `<td>` | `"[MEMBER_A_LAST_LOGIN]"` |
| 1325 | `r.0.1.1.0.1.3.1.0.0.3.1.2.0` | `<td>` | `"2"` |
| 1326 | `r.0.1.1.0.1.3.1.0.0.3.1.2.1` | `<td>` | `"[OWNER_SHORT_NAME]\n                                        \n                                        \n                                        \n\n                                        \n                                         [OWNER_EMAIL]"` |
| 1330 | `r.0.1.1.0.1.3.1.2.0.0.5.0.0` | `<button>` | `"Save Editor Changes"` |
| 1335 | `r.0.1.1.0.1.3.1.3.0.0.1.0.0` | `<a>` | `"empty"` |
| 1345 | `r.0.1.1.0.1.3.1.4.0.1.1.3.1` | `<span>` | `"Free Trials"` |
| 1348 | `r.0.1.1.0.1.3.1.4.4.0.0.3.0` | `<a>` | `"Reverse"` |
| 1351 | `r.0.1.1.0.1.3.1.5.0.0.6.3.0` | `<span>` | `"registered members"` |
| 1352 | `r.0.1.1.0.1.3.1.5.0.0.6.3.1` | `<span>` | `"Presenters have their own password."` |
| 1353 | `r.0.1.1.0.1.3.1.5.0.0.9.3.0` | `<span>` | `"free trial users."` |
| 1356 | `r.0.1.1.0.1.3.1.5.0.4.0.0.0` | `<label>` | `"Use v3? (DON'T!)"` |
| 1357 | `r.0.1.1.0.1.3.1.5.0.4.0.0.1` | `<a>` | `"Yes!"` |
| 1358 | `r.0.1.1.0.1.3.1.5.0.4.0.1.0` | `<label>` | `"Use v5? (DON'T!)"` |
| 1359 | `r.0.1.1.0.1.3.1.5.0.4.0.1.1` | `<a>` | `"No"` |
| 1360 | `r.0.1.1.0.1.3.1.5.0.4.0.2.0` | `<label>` | `"ClusterID"` |
| 1361 | `r.0.1.1.0.1.3.1.5.0.4.0.2.1` | `<a>` | `"empty"` |
| 1364 | `r.0.1.1.0.1.3.1.5.0.4.0.2.4` | `<label>` | `"Backup ClusterID"` |
| 1365 | `r.0.1.1.0.1.3.1.5.0.4.0.2.5` | `<a>` | `"empty"` |
| 1367 | `r.0.1.1.0.1.3.1.5.0.4.0.2.7` | `<label>` | `"(In case the main clusterID is down, this is the backup, soft reset required for changes to take effect)"` |
| 1368 | `r.0.1.1.0.1.3.1.5.0.4.0.3.0` | `<button>` | `"Swap ClusterIDs (Backup <--> Main)"` |
| 1369 | `r.0.1.1.0.1.3.1.5.0.4.0.4.0` | `<button>` | `"Apply clusterID/backupID to all sessions"` |
| 1370 | `r.0.1.1.0.1.3.1.5.0.4.0.6.0` | `<label>` | `"Super ClusterID"` |
| 1371 | `r.0.1.1.0.1.3.1.5.0.4.0.6.1` | `<a>` | `"empty"` |
| 1373 | `r.0.1.1.0.1.3.1.5.0.4.0.6.3` | `<label>` | `"(Super cluster, if this is set, we will use the new supercluster scaling logic to scale the session across the super cluster)"` |
| 1376 | `r.0.1.1.0.1.3.1.5.0.4.0.6.6` | `<label>` | `"Super Cluster Expected Server Count"` |
| 1377 | `r.0.1.1.0.1.3.1.5.0.4.0.6.7` | `<a>` | `"0"` |
| 1379 | `r.0.1.1.0.1.3.1.5.0.4.0.6.9` | `<label>` | `"(Expected number of servers needed to handle the session)"` |
| 1380 | `r.0.1.1.0.1.3.1.5.0.4.0.7.0` | `<label>` | `"Use FFmpeg for Recording (BETA)"` |
| 1381 | `r.0.1.1.0.1.3.1.5.0.4.0.7.1` | `<a>` | `"No"` |
| 1382 | `r.0.1.1.0.1.3.1.5.0.4.0.9.0` | `<label>` | `"Use Less busy server algo vs round robin"` |
| 1383 | `r.0.1.1.0.1.3.1.5.0.4.0.9.1` | `<a>` | `"No"` |
| 1384 | `r.0.1.1.0.1.3.1.5.0.4.0.11.0` | `<label>` | `"Use MediaMTX?"` |
| 1385 | `r.0.1.1.0.1.3.1.5.0.4.0.11.1` | `<a>` | `"No"` |
| 1386 | `r.0.1.1.0.1.3.1.5.0.4.0.12.0` | `<label>` | `"MediaMTX ClusterID"` |
| 1387 | `r.0.1.1.0.1.3.1.5.0.4.0.12.1` | `<a>` | `"empty"` |
| 1388 | `r.0.1.1.0.1.3.1.5.0.4.0.13.0` | `<label>` | `"Backup MediaMTX ClustterID"` |
| 1389 | `r.0.1.1.0.1.3.1.5.0.4.0.13.1` | `<a>` | `"empty"` |
| 1390 | `r.0.1.1.0.1.3.1.5.0.4.0.14.0` | `<label>` | `"ScreenShare MAX BitRate"` |
| 1391 | `r.0.1.1.0.1.3.1.5.0.4.0.14.1` | `<a>` | `"512000"` |
| 1393 | `r.0.1.1.0.1.3.1.5.0.4.0.14.3` | `<label>` | `"(i.e. 1024000,512000,254000)"` |
| 1394 | `r.0.1.1.0.1.3.1.5.0.4.0.15.0` | `<label>` | `"ScreenShare KeyFrame Rate  (i.e. 5, 10, 15)"` |
| 1395 | `r.0.1.1.0.1.3.1.5.0.4.0.15.1` | `<a>` | `"5"` |
| 1397 | `r.0.1.1.0.1.3.1.5.0.4.0.15.3` | `<label>` | `"(Session restart required for changes to take effect)"` |
| 1398 | `r.0.1.1.0.1.3.1.5.0.4.0.16.0` | `<label>` | `"Enable FB Live/YouTube Live"` |
| 1399 | `r.0.1.1.0.1.3.1.5.0.4.0.16.1` | `<a>` | `"No"` |
| 1400 | `r.0.1.1.0.1.3.1.5.0.4.0.18.0` | `<label>` | `"Repeater List"` |
| 1401 | `r.0.1.1.0.1.3.1.5.0.4.0.18.1` | `<a>` | `"empty"` |
| 1403 | `r.0.1.1.0.1.3.1.5.0.4.0.18.3` | `<label>` | `"(Comma separated list op IPs IE: localhost\|127.0.0.1,somehostname\|10.10.10.10)"` |
| 1405 | `r.0.1.1.0.1.3.1.5.0.4.0.18.5` | `<button>` | `"Apply  server / repeaters to entire account?"` |
| 1409 | `r.0.1.1.0.1.3.1.5.0.4.0.19.3` | `<button>` | `"Add Server"` |
| 1412 | `r.0.1.1.0.1.3.1.5.0.4.0.19.6` | `<button>` | `"Remove Server"` |
| 1414 | `r.0.1.1.0.1.3.1.5.0.4.0.22.0` | `<label>` | `"Lock Session?"` |
| 1415 | `r.0.1.1.0.1.3.1.5.0.4.0.22.1` | `<a>` | `"No"` |
| 1417 | `r.0.1.1.0.1.3.1.5.0.4.0.22.3` | `<label>` | `"If session is locked, nobody will be able to log in..."` |
| 1418 | `r.0.1.1.0.1.3.1.5.0.4.0.23.0` | `<label>` | `"Talk URL"` |
| 1419 | `r.0.1.1.0.1.3.1.5.0.4.0.23.1` | `<a>` | `"/talk"` |
| 1421 | `r.0.1.1.0.1.3.1.5.0.4.0.23.3` | `<label>` | `"Used to clusterize the chat server"` |
| 1422 | `r.0.1.1.0.1.3.1.5.0.4.0.25.0` | `<label>` | `"Force JPG Screens"` |
| 1423 | `r.0.1.1.0.1.3.1.5.0.4.0.25.1` | `<a>` | `"No"` |
| 1424 | `r.0.1.1.0.1.3.1.5.0.4.0.26.0` | `<label>` | `"Force MP3 Audio"` |
| 1425 | `r.0.1.1.0.1.3.1.5.0.4.0.26.1` | `<a>` | `"No"` |
| 1426 | `r.0.1.1.0.1.3.1.5.0.4.0.27.0` | `<label>` | `"Node Repeater List"` |
| 1427 | `r.0.1.1.0.1.3.1.5.0.4.0.27.1` | `<a>` | `"empty"` |
| 1429 | `r.0.1.1.0.1.3.1.5.0.4.0.27.3` | `<label>` | `"(Comma separated list op IPs IE: localhost\|127.0.0.1,somehostname\|10.10.10.10)"` |
| 1430 | `r.0.1.1.0.1.3.1.5.0.4.0.28.0` | `<label>` | `"Node Websocket Repeater List"` |
| 1431 | `r.0.1.1.0.1.3.1.5.0.4.0.28.1` | `<a>` | `"empty"` |
| 1433 | `r.0.1.1.0.1.3.1.5.0.4.0.28.3` | `<label>` | `"(Comma separated list op IPs IE: localhost\|127.0.0.1,somehostname\|10.10.10.10)"` |
| 1434 | `r.0.1.1.0.1.3.1.5.0.4.0.31.0` | `<label>` | `"Alt VendorJS"` |
| 1435 | `r.0.1.1.0.1.3.1.5.0.4.0.31.1` | `<a>` | `"empty"` |
| 1437 | `r.0.1.1.0.1.3.1.5.0.4.0.31.3` | `<label>` | `"(name if alt vendorJS. ie. 'vendor2.min.js'"` |
| 1438 | `r.0.1.1.0.1.3.1.5.0.4.0.32.0` | `<label>` | `"Alt AppJS"` |
| 1439 | `r.0.1.1.0.1.3.1.5.0.4.0.32.1` | `<a>` | `"empty"` |

## Appendix C — x-editable session-field inventory (181 fields)

Every node carrying an `editable-*` directive, in dump order. `onaftersave` is always
`saveSessField('<field>')` where `<field>` is the tail of the `sess.` expression.

| # | path | directive | model expression | e-label / e-title | rendered value |
|---|---|---|---|---|---|
| 721 | `r.0.1.1.0.1.3.1.5.0.0.61.1` | `editable-textarea` | `sess.pairOKRedirect` | `e-label:Pair OK Redirect:` | "empty" |
| 723 | `r.0.1.1.0.1.3.1.5.0.0.64.1` | `editable-textarea` | `sess.pairErrorRedirect` | `e-label:Pair ERROR Redirect:` | "empty" |
| 725 | `r.0.1.1.0.1.3.1.5.0.0.67.1` | `editable-checkbox` | `sess.hideChatAlerts` | `e-title:Hide Alerts/Chat Section?` | "No" |
| 729 | `r.0.1.1.0.1.3.1.5.0.0.68.1` | `editable-checkbox` | `sess.hasSwingTradeAlerts` | `e-title:Enable Swing Trade Alerts Tab?` | "No" |
| 733 | `r.0.1.1.0.1.3.1.5.0.0.69.1` | `editable-checkbox` | `sess.hasDayTradeAlerts` | `e-title:Enable Day Trade Alerts Tab?` | "No" |
| 737 | `r.0.1.1.0.1.3.1.5.0.0.70.1` | `editable-checkbox` | `sess.usersPublicReply` | `e-title:User Public Reply?` | "No" |
| 741 | `r.0.1.1.0.1.3.1.5.0.0.71.1` | `editable-checkbox` | `sess.chatDisabledForTrials` | `e-title:Chat Disabled For Trials?` | "No" |
| 745 | `r.0.1.1.0.1.3.1.5.0.0.72.1` | `editable-checkbox` | `sess.disablePMForTrials` | `e-title:Disable PM For Trials?` | "No" |
| 749 | `r.0.1.1.0.1.3.1.5.0.0.73.1` | `editable-checkbox` | `sess.usersCanDeleteOwnMsgs` | `e-title:Users Can Delete Own Messages?` | "No" |
| 753 | `r.0.1.1.0.1.3.1.5.0.0.74.1` | `editable-checkbox` | `sess.smallerImagePreview` | `e-title:Smaller image previews?` | "No" |
| 757 | `r.0.1.1.0.1.3.1.5.0.0.75.1` | `editable-checkbox` | `sess.hideNotes` | `e-title:Hide notes Section?` | "No" |
| 761 | `r.0.1.1.0.1.3.1.5.0.0.76.1` | `editable-checkbox` | `sess.hideFiles` | `e-title:Hide files Section?` | "No" |
| 765 | `r.0.1.1.0.1.3.1.5.0.0.77.1` | `editable-checkbox` | `sess.darkThemeAsDefault` | `e-title:Dark Theme As Default?` | "No" |
| 769 | `r.0.1.1.0.1.3.1.5.0.0.78.1` | `editable-checkbox` | `sess.saveWebinarModeChat` | `e-title:Preserve Webinar Mode chat?` | "No" |
| 773 | `r.0.1.1.0.1.3.1.5.0.0.79.1` | `editable-checkbox` | `sess.showArchivesToUsers` | `e-title:User Archives?` | "No" |
| 777 | `r.0.1.1.0.1.3.1.5.0.0.80.1` | `editable-textarea` | `sess.showArchivesToSpecificPresenters` | `e-label:email:` | "empty" |
| 781 | `r.0.1.1.0.1.3.1.5.0.0.81.1` | `editable-checkbox` | `sess.disalowSporadicMultiLogins` | `e-title:Prevent sporadic?` | "No" |
| 785 | `r.0.1.1.0.1.3.1.5.0.0.82.1` | `editable-checkbox` | `sess.disalowMultiLogins` | `e-title:Disalow Multi-Logins?` | "No" |
| 789 | `r.0.1.1.0.1.3.1.5.0.0.83.1` | `editable-checkbox` | `sess.sendReportEmails` | `e-title:Send emails?` | "Yes!" |
| 793 | `r.0.1.1.0.1.3.1.5.0.0.84.1` | `editable-textarea` | `sess.banIPList` | `e-label:email:` | "empty" |
| 797 | `r.0.1.1.0.1.3.1.5.0.0.85.1` | `editable-textarea` | `sess.reportEmail` | `e-label:email:` | "empty" |
| 801 | `r.0.1.1.0.1.3.1.5.0.0.86.1` | `editable-textarea` | `sess.customJWTErrorMessage` | `e-label:text:` | "empty" |
| 805 | `r.0.1.1.0.1.3.1.5.0.0.87.1` | `editable-textarea` | `sess.sendOpenCloseEmail` | `e-label:email:` | "empty" |
| 809 | `r.0.1.1.0.1.3.1.5.0.0.88.1` | `editable-textarea` | `sess.autoOpenTime` | `e-label:Open Time:` | "empty" |
| 813 | `r.0.1.1.0.1.3.1.5.0.0.89.1` | `editable-textarea` | `sess.autoCloseTime` | `e-label:Close Time:` | "empty" |
| 817 | `r.0.1.1.0.1.3.1.5.0.0.90.1` | `editable-checkbox` | `sess.ignoreAutoOpenCloseOnWeekend` | `e-title:Ignore Auto Open & Close On Weekend?` | "No" |
| 819 | `r.0.1.1.0.1.3.1.5.0.0.91.1` | `editable-checkbox` | `sess.alertSoundOff` | `e-title:Alerts Sound Off?` | "No" |
| 823 | `r.0.1.1.0.1.3.1.5.0.0.92.1` | `editable-checkbox` | `sess.styckyNonTradeAlert` | `e-title:Sticky Non-Trade Alerts?` | "No" |
| 827 | `r.0.1.1.0.1.3.1.5.0.0.93.1` | `editable-checkbox` | `sess.fileAccessCaseByCase` | `e-title:Shared Files Access Case/Case?` | "No" |
| 831 | `r.0.1.1.0.1.3.1.5.0.0.94.1` | `editable-checkbox` | `sess.isChatOnlyRoom` | `e-title:Disable Screen & Audio?` | "No" |
| 835 | `r.0.1.1.0.1.3.1.5.0.0.95.1` | `editable-checkbox` | `sess.chatAutoClear` | `e-title:Auto Clear Chat?` | "No" |
| 839 | `r.0.1.1.0.1.3.1.5.0.0.96.1` | `editable-checkbox` | `sess.alertsAutoClear` | `e-title:Auto Clear Alerts?` | "No" |
| 843 | `r.0.1.1.0.1.3.1.5.0.0.97.1` | `editable-textarea` | `sess.chatAutoClearSpecialHour` | `e-label:Nick Filter:` | "empty" |
| 847 | `r.0.1.1.0.1.3.1.5.0.0.98.1` | `editable-checkbox` | `sess.chatAutoClearWeekend` | `e-title:Auto Clear Chat?` | "No" |
| 851 | `r.0.1.1.0.1.3.1.5.0.0.99.1` | `editable-checkbox` | `sess.archiveAlertsLog` | `e-title:Archive Alerts?` | "Yes!" |
| 855 | `r.0.1.1.0.1.3.1.5.0.0.100.1` | `editable-checkbox` | `sess.archiveChatLog` | `e-title:Archive Chats?` | "Yes!" |
| 857 | `r.0.1.1.0.1.3.1.5.0.0.101.1` | `editable-checkbox` | `sess.hideChatLog` | `e-title:Hide Chatlog from Archive?` | "No" |
| 861 | `r.0.1.1.0.1.3.1.5.0.0.102.1` | `editable-checkbox` | `sess.hasAlertScheduler` | `e-title:Enable Alert Scheduler?` | "No" |
| 865 | `r.0.1.1.0.1.3.1.5.0.0.103.1` | `editable-checkbox` | `sess.enableVideoPlayer` | `e-title:Video Player?` | "Yes!" |
| 869 | `r.0.1.1.0.1.3.1.5.0.0.104.1` | `editable-checkbox` | `sess.userUploads` | `e-title:Allow User Screenshots?` | "No" |
| 873 | `r.0.1.1.0.1.3.1.5.0.0.105.1` | `editable-checkbox` | `sess.enableDiscord` | `e-title:Enable Discord?` | "No" |
| 877 | `r.0.1.1.0.1.3.1.5.0.0.106.1` | `editable-checkbox` | `sess.disableEmojis` | `e-title:Disable Emojis?` | "No" |
| 881 | `r.0.1.1.0.1.3.1.5.0.0.107.1` | `editable-checkbox` | `sess.enableRTE` | `e-title:Enable Rich Text Editor?` | "No" |
| 885 | `r.0.1.1.0.1.3.1.5.0.0.108.1` | `editable-checkbox` | `sess.enableReactions` | `e-title:Enable Reactions?` | "No" |
| 889 | `r.0.1.1.0.1.3.1.5.0.0.109.1` | `editable-checkbox` | `sess.enableQAReactions` | `e-title:Enable Reactions?` | "No" |
| 893 | `r.0.1.1.0.1.3.1.5.0.0.110.1` | `editable-checkbox` | `sess.enableEditMessage` | `e-title:Enable Edit Messages?` | "No" |
| 897 | `r.0.1.1.0.1.3.1.5.0.0.111.1` | `editable-checkbox` | `sess.enableEditAlerts` | `e-title:Enable Edit Alerts?` | "No" |
| 901 | `r.0.1.1.0.1.3.1.5.0.0.112.1` | `editable-textarea` | `sess.alertLabels` | `e-label:Alert Labels:` | "empty" |
| 905 | `r.0.1.1.0.1.3.1.5.0.0.113.1` | `editable-checkbox` | `sess.advancedSearchAlerts` | `e-title:Advanced Alerts Search?` | "No" |
| 909 | `r.0.1.1.0.1.3.1.5.0.0.114.1` | `editable-checkbox` | `sess.enableDeleteLog` | `e-title:Enable Delete Log?` | "No" |
| 913 | `r.0.1.1.0.1.3.1.5.0.0.115.1` | `editable-checkbox` | `sess.enableBadges` | `e-title:User Badges?` | "No" |
| 917 | `r.0.1.1.0.1.3.1.5.0.0.116.1` | `editable-checkbox` | `sess.enableTokenBadges` | `e-title:Token Badges?` | "No" |
| 921 | `r.0.1.1.0.1.3.1.5.0.0.117.1` | `editable-checkbox` | `sess.remToken` | `e-title:Remove token from url?` | "No" |
| 925 | `r.0.1.1.0.1.3.1.5.0.0.118.1` | `editable-checkbox` | `sess.showBadgesToPresentersOnly` | `e-title:Show Badges only Presenters?` | "No" |
| 929 | `r.0.1.1.0.1.3.1.5.0.0.119.1` | `editable-checkbox` | `sess.dontFollowPresenters` | `e-title:Don't follow Presenters?` | "No" |
| 933 | `r.0.1.1.0.1.3.1.5.0.0.120.1` | `editable-checkbox` | `sess.disableStarYears` | `e-title:Disable Stars?` | "No" |
| 937 | `r.0.1.1.0.1.3.1.5.0.0.121.1` | `editable-checkbox` | `sess.hasRequiredPhoneInLogin` | `e-title:Phone Required?` | "No" |
| 941 | `r.0.1.1.0.1.3.1.5.0.0.122.1` | `editable-checkbox` | `sess.showPasswordField` | `e-title:Show password field?` | "No" |
| 945 | `r.0.1.1.0.1.3.1.5.0.0.123.1` | `editable-checkbox` | `sess.isMainRoom` | `e-title:Is Main Room?` | "No" |
| 947 | `r.0.1.1.0.1.3.1.5.0.0.124.1` | `editable-checkbox` | `sess.isArchivedRoom` | `e-title:Is Archived Room?` | "No" |
| 949 | `r.0.1.1.0.1.3.1.5.0.0.125.1` | `editable-checkbox` | `sess.isNewIndicatorOn` | `e-title:Is New Room?` | "No" |
| 951 | `r.0.1.1.0.1.3.1.5.0.0.126.1` | `editable-checkbox` | `sess.hasBenzingaNews` | `e-title:BZ News?` | "No" |
| 955 | `r.0.1.1.0.1.3.1.5.0.0.127.1` | `editable-textarea` | `sess.altBenzingaLogoURL` | `e-label:URL:` | "empty" |
| 959 | `r.0.1.1.0.1.3.1.5.0.0.128.1` | `editable-textarea` | `sess.altBenzingaLinkURL` | `e-label:URL:` | "empty" |
| 963 | `r.0.1.1.0.1.3.1.5.0.0.129.1` | `editable-text` | `sess.imgurClientID` | — | "empty" |
| 965 | `r.0.1.1.0.1.3.1.5.0.0.130.1` | `editable-text` | `sess.imgurApiKey` | — | "empty" |
| 967 | `r.0.1.1.0.1.3.1.5.0.0.131.1` | `editable-textarea` | `sess.imgurRapidKey` | — | "empty" |
| 969 | `r.0.1.1.0.1.3.1.5.0.0.132.1` | `editable-textarea` | `sess.xuserAccessToken` | `e-label:URL:` | "empty" |
| 971 | `r.0.1.1.0.1.3.1.5.0.0.133.1` | `editable-textarea` | `sess.xuserAccessTokenSecret` | `e-label:URL:` | "empty" |
| 973 | `r.0.1.1.0.1.3.1.5.0.0.134.1` | `editable-textarea` | `sess.subscriptionPlans` | `e-label:Subscription Plans:` | "empty" |
| 977 | `r.0.1.1.0.1.3.1.5.0.0.135.1` | `editable-textarea` | `sess.stripeEmail` | `e-label:Stripe Email:` | "empty" |
| 979 | `r.0.1.1.0.1.3.1.5.0.0.136.1` | `editable-checkbox` | `sess.enableLiveStats` | `e-title:Live stats?` | "No" |
| 981 | `r.0.1.1.0.1.3.1.5.0.0.137.1` | `editable-checkbox` | `sess.collectsUserStats` | `e-title:UserXrefStats?` | "No" |
| 984 | `r.0.1.1.0.1.3.1.5.0.0.138.1` | `editable-textarea` | `sess.apiSecret` | `e-label:URL:` | "empty" |
| 988 | `r.0.1.1.0.1.3.1.5.0.0.140.1` | `editable-textarea` | `sess.slackPostURL` | `e-label:URL:` | "empty" |
| 990 | `r.0.1.1.0.1.3.1.5.0.0.141.1` | `editable-checkbox` | `sess.diasableFCMAlerts` | `e-title:disable PUSH Alerts ?` | "No" |
| 992 | `r.0.1.1.0.1.3.1.5.0.0.142.1` | `editable-textarea` | `sess.modMessage` | `e-label:MSG:` | "empty" |
| 994 | `r.0.1.1.0.1.3.1.5.0.0.143.1` | `editable-textarea` | `sess.positionsIframeUrl` | `e-label:URL:` | "empty" |
| 996 | `r.0.1.1.0.1.3.1.5.0.0.144.1` | `editable-checkbox` | `sess.positionsIframe` | `e-title:Enable positions iframe?` | "No" |
| 998 | `r.0.1.1.0.1.3.1.5.0.0.145.1` | `editable-checkbox` | `sess.tipMeBtnEnabled` | `e-title:Enable Tip Me Button?` | "No" |
| 1000 | `r.0.1.1.0.1.3.1.5.0.0.146.1` | `editable-textarea` | `sess.tipMeBtnTxt` | `e-label:Text:` | "Tip Me?" |
| 1002 | `r.0.1.1.0.1.3.1.5.0.0.147.1` | `editable-textarea` | `sess.tipMeBtnUrl` | `e-label:Text:` | "empty" |
| 1004 | `r.0.1.1.0.1.3.1.5.0.0.148.1` | `editable-textarea` | `sess.salesBanner` | `e-label:Text:` | "empty" |
| 1006 | `r.0.1.1.0.1.3.1.5.0.0.149.1` | `editable-textarea` | `sess.modAdminLoginList` | `e-label:Admin login list:` | "empty" |
| 1010 | `r.0.1.1.0.1.3.1.5.0.0.150.1` | `editable-checkbox` | `sess.isAlertOnly` | `e-title:Alerts only room ?` | "No" |
| 1014 | `r.0.1.1.0.1.3.1.5.0.0.151.1` | `editable-textarea` | `sess.customClientAlertPostURL` | `e-label:URL:` | "empty" |
| 1018 | `r.0.1.1.0.1.3.1.5.0.0.152.1` | `editable-textarea` | `sess.customClientAlertPostSecret` | `e-label:Secret:` | "empty" |
| 1022 | `r.0.1.1.0.1.3.1.5.0.0.153.1` | `editable-checkbox` | `sess.strictBrowserMode` | `e-title:Strict Browser?` | "No" |
| 1026 | `r.0.1.1.0.1.3.1.5.0.0.154.1` | `editable-checkbox` | `sess.chatFloodDisabled` | `e-title:Disable Chat Flood ?` | "No" |
| 1028 | `r.0.1.1.0.1.3.1.5.0.0.155.1` | `editable-checkbox` | `sess.privMessageHugePopup` | `e-title:Huge Priv Msg?` | "No" |
| 1032 | `r.0.1.1.0.1.3.1.5.0.0.156.1` | `editable-checkbox` | `sess.hasChannelTabs` | `e-title:Chat Channels?` | "Yes!" |
| 1036 | `r.0.1.1.0.1.3.1.5.0.0.157.1` | `editable-checkbox` | `sess.autoSwitchToOfftopics` | `e-title:Auto Switch To Offtopics Channel?` | "No" |
| 1040 | `r.0.1.1.0.1.3.1.5.0.0.158.1` | `editable-checkbox` | `sess.hasAdminOnlyChannel` | `e-title:Admin Channel?` | "No" |
| 1044 | `r.0.1.1.0.1.3.1.5.0.0.159.1` | `editable-textarea` | `sess.extraAdminChannels` | `e-label:email:` | "empty" |
| 1048 | `r.0.1.1.0.1.3.1.5.0.0.160.1` | `editable-textarea` | `sess.extraRegChannels` | `e-label:email:` | "empty" |
| 1052 | `r.0.1.1.0.1.3.1.5.0.0.161.1` | `editable-textarea` | `sess.altGenChannelName` | `e-label:email:` | "empty" |
| 1056 | `r.0.1.1.0.1.3.1.5.0.0.162.1` | `editable-textarea` | `sess.altOffTopicChannelName` | `e-label:email:` | "empty" |
| 1060 | `r.0.1.1.0.1.3.1.5.0.0.163.1` | `editable-textarea` | `sess.chatTabsWithBadges` | `e-label:Chat Tabs With Badges:` | "empty" |
| 1064 | `r.0.1.1.0.1.3.1.5.0.0.164.1` | `editable-checkbox` | `sess.hasProfanityFilter` | `e-title:Filter bad words?` | "No" |
| 1068 | `r.0.1.1.0.1.3.1.5.0.0.165.1` | `editable-text` | `sess.ingnoreBadWordsList` | `e-label:Comma Separated Ignore list` | "empty" |
| 1071 | `r.0.1.1.0.1.3.1.5.0.0.166.1` | `editable-text` | `sess.additionalBadWordsList` | `e-label:Comma Separated additional list` | "empty" |
| 1074 | `r.0.1.1.0.1.3.1.5.0.0.167.1` | `editable-checkbox` | `sess.simplifiedEditor` | `e-title:Enable Simplified Note Editor?` | "No" |
| 1078 | `r.0.1.1.0.1.3.1.5.0.0.168.1` | `editable-checkbox` | `sess.audioMeterDisabled` | `e-title:Disable Audio Meter?` | "No" |
| 1082 | `r.0.1.1.0.1.3.1.5.0.0.169.1` | `editable-checkbox` | `sess.hideWebcamForRoom` | `e-title:Hide WebCam in the room?` | "No" |
| 1086 | `r.0.1.1.0.1.3.1.5.0.0.170.1` | `editable-checkbox` | `sess.recordChat` | `e-title:Record alerts and chat?` | "No" |
| 1088 | `r.0.1.1.0.1.3.1.5.0.0.171.1` | `editable-checkbox` | `sess.autoRecord` | `e-title:Auto record presenters?` | "No" |
| 1090 | `r.0.1.1.0.1.3.1.5.0.0.172.1` | `editable-checkbox` | `sess.blinkingRec` | `e-title:Blinking [REC]?` | "No" |
| 1092 | `r.0.1.1.0.1.3.1.5.0.0.173.1` | `editable-checkbox` | `sess.hideRecs` | `e-title:Hide Recordings?` | "No" |
| 1096 | `r.0.1.1.0.1.3.1.5.0.0.174.1` | `editable-checkbox` | `sess.recordingReminder` | `e-title:Recording Reminder If Speaking?` | "No" |
| 1100 | `r.0.1.1.0.1.3.1.5.0.0.175.1` | `editable-checkbox` | `sess.recsInRoom` | `e-title:Show Recordings in the room?` | "No" |
| 1104 | `r.0.1.1.0.1.3.1.5.0.0.176.1` | `editable-checkbox` | `sess.downloadRecordingsDisabled` | `e-title:Disable download button for Recordings for users?` | "No" |
| 1108 | `r.0.1.1.0.1.3.1.5.0.0.177.1` | `editable-checkbox` | `sess.hasSpeechRecognitionDisabled` | `e-title:Disable closed captioning?` | "No" |
| 1112 | `r.0.1.1.0.1.3.1.5.0.0.178.1` | `editable-checkbox` | `sess.dontShowRecInfoToUsers` | `e-title:Hide recordings info for users?` | "No" |
| 1116 | `r.0.1.1.0.1.3.1.5.0.0.179.1` | `editable-number` | `sess.runawayRecMinutes` | `e-title:Minutes of recording inactivity?` | "5" |
| 1120 | `r.0.1.1.0.1.3.1.5.0.0.180.1` | `editable-checkbox` | `sess.runawayRecAutoKill` | `e-title:Auto stop recording if inactive?` | "No" |
| 1124 | `r.0.1.1.0.1.3.1.5.0.0.181.1` | `editable-textarea` | `sess.runawayRecPostURL` | `e-label:URL:` | "empty" |
| 1128 | `r.0.1.1.0.1.3.1.5.0.0.182.1` | `editable-checkbox` | `sess.stickyGiveMicAndCam` | `e-title:Sticky give Mic/Cam?` | "No" |
| 1132 | `r.0.1.1.0.1.3.1.5.0.0.183.1` | `editable-checkbox` | `sess.overlayUserIdOnScreenshare` | `e-title:Overlay userID on screenshare?` | "No" |
| 1136 | `r.0.1.1.0.1.3.1.5.0.0.184.1` | `editable-checkbox` | `sess.regUserCanPresent` | `e-title:Auto give mic/screen to Regular users?` | "No" |
| 1140 | `r.0.1.1.0.1.3.1.5.0.0.185.1` | `editable-checkbox` | `sess.dontStopRecOnMicMute` | `e-title:Don't rec stop on mic mute?` | "No" |
| 1144 | `r.0.1.1.0.1.3.1.5.0.0.186.1` | `editable-checkbox` | `sess.individualVolumeControls` | `e-title:Individual Volume Controls?` | "No" |
| 1148 | `r.0.1.1.0.1.3.1.5.0.0.187.1` | `editable-checkbox` | `sess.remote_recording` | `e-title:New Rec?` | "No" |
| 1152 | `r.0.1.1.0.1.3.1.5.0.0.188.1` | `editable-checkbox` | `sess.saveRecsToS3` | `e-title:Save Recordings to S3?` | "No" |
| 1154 | `r.0.1.1.0.1.3.1.5.0.0.189.1` | `editable-text` | `sess.s3KeyID` | `e-label:S3 Key Name` | "empty" |
| 1156 | `r.0.1.1.0.1.3.1.5.0.0.190.1` | `editable-text` | `sess.s3KeySecret` | `e-label:S3 Key Secret` | "empty" |
| 1158 | `r.0.1.1.0.1.3.1.5.0.0.191.1` | `editable-text` | `sess.s3Bucket` | `e-label:S3 Bucket` | "empty" |
| 1160 | `r.0.1.1.0.1.3.1.5.0.0.192.1` | `editable-text` | `sess.s3BucketFolderPath` | `e-label:S3 Bucket subfolder` | "empty" |
| 1162 | `r.0.1.1.0.1.3.1.5.0.0.194.1` | `editable-checkbox` | `sess.saveRecsToVimeo` | `e-title:Save Recordings to saveRecsToVimeo?` | "No" |
| 1164 | `r.0.1.1.0.1.3.1.5.0.0.195.1` | `editable-text` | `sess.vimeoClientID` | `e-label:Vimeo ClientID` | "empty" |
| 1166 | `r.0.1.1.0.1.3.1.5.0.0.196.1` | `editable-text` | `sess.vimeoClientSecret` | `e-label:Vimeo Secret` | "empty" |
| 1168 | `r.0.1.1.0.1.3.1.5.0.0.197.1` | `editable-text` | `sess.vimeoToken` | `e-label:Token` | "empty" |
| 1170 | `r.0.1.1.0.1.3.1.5.0.0.198.1` | `editable-text` | `sess.vimeoFolderPath` | `e-label:Folder Path` | "empty" |
| 1172 | `r.0.1.1.0.1.3.1.5.0.0.199.1` | `editable-checkbox` | `sess.obsBroadcastRoom` | `e-title:Broadcast using OBS?` | "No" |
| 1174 | `r.0.1.1.0.1.3.1.5.0.0.200.1` | `editable-text` | `sess.obsStreamKey` | — | "empty" |
| 1176 | `r.0.1.1.0.1.3.1.5.0.0.201.1` | `editable-text` | `sess.obsStreamSatusWebHookURL` | — | "empty" |
| 1178 | `r.0.1.1.0.1.3.1.5.0.0.202.1` | `editable-text` | `sess.restreamToURL` | — | "empty" |
| 1180 | `r.0.1.1.0.1.3.1.5.0.0.203.1` | `editable-text` | `sess.restreamToURLKey` | — | "empty" |
| 1182 | `r.0.1.1.0.1.3.1.5.0.0.205.1` | `editable-text` | `sess.x264_encArgs` | `e-label:Rec Params` | "empty" |
| 1184 | `r.0.1.1.0.1.3.1.5.0.0.206.1` | `editable-text` | `sess.twillioApiSID` | `e-label:Twillio SID` | "empty" |
| 1186 | `r.0.1.1.0.1.3.1.5.0.0.207.1` | `editable-text` | `sess.twillioApiToken` | `e-label:Token SID` | "empty" |
| 1188 | `r.0.1.1.0.1.3.1.5.0.0.208.1` | `editable-text` | `sess.twilioPhone` | `e-label:Token SID` | "empty" |
| 1190 | `r.0.1.1.0.1.3.1.5.0.0.209.1` | `editable-text` | `sess.protextingSecretTok` | `e-label:Token` | "empty" |
| 1192 | `r.0.1.1.0.1.3.1.5.0.0.210.1` | `editable-text` | `sess.protextingGroupIDs` | `e-label:GroupIDs` | "empty" |
| 1194 | `r.0.1.1.0.1.3.1.5.0.0.211.1` | `editable-checkbox` | `sess.h264Enabled` | `e-title:Use h264 codec ?` | "Yes!" |
| 1196 | `r.0.1.1.0.1.3.1.5.0.0.212.1` | `editable-checkbox` | `sess.vp9Enabled` | `e-title:Use VP9 codec ?` | "No" |
| 1198 | `r.0.1.1.0.1.3.1.5.0.0.213.1` | `editable-checkbox` | `sess.hqVideo` | `e-title:Use HQ Video ?` | "No" |
| 1201 | `r.0.1.1.0.1.3.1.5.0.0.214.1` | `editable-text` | `sess.customPlayerURL` | `e-label:Custom Player URL` | "empty" |
| 1205 | `r.0.1.1.0.1.3.1.5.0.0.215.1` | `editable-checkbox` | `sess.iframeSSOTFix` | `e-title:UIframe Cookie Fix ?` | "No" |
| 1207 | `r.0.1.1.0.1.3.1.5.0.0.216.1` | `editable-checkbox` | `sess.autoResetSession` | `e-title:autoreset sess?` | "No" |
| 1209 | `r.0.1.1.0.1.3.1.5.0.0.217.1` | `editable-checkbox` | `sess.doNotAutoSoftReset` | `e-title:Don't softreset sess?` | "No" |
| 1211 | `r.0.1.1.0.1.3.1.5.0.0.219.1` | `editable-checkbox` | `sess.sendFcmAlertsNew` | `e-title:new FCM method?` | "No" |
| 1213 | `r.0.1.1.0.1.3.1.5.0.0.220.1` | `editable-number` | `sess.ptrMobileAppExpirePairCodeDays` | `e-title:PTR code expire:` | "7" |
| 1215 | `r.0.1.1.0.1.3.1.5.0.0.221.1` | `editable-number` | `sess.mobileAppExpireNotificationsDays` | `e-title:PUSH expire days:` | "14" |
| 1217 | `r.0.1.1.0.1.3.1.5.0.0.222.1` | `editable-textarea` | `sess.customEnterDisclosure` | `e-label:URL:` | "empty" |
| 1221 | `r.0.1.1.0.1.3.1.5.0.0.223.1` | `editable-text` | `sess.customUserInfoURL` | `e-label:URL` | "empty" |
| 1223 | `r.0.1.1.0.1.3.1.5.0.0.224.1` | `editable-text` | `sess.stAppScheduleID` | `e-label:Goog Calendar ID` | "empty" |
| 1225 | `r.0.1.1.0.1.3.1.5.0.0.225.1` | `editable-textarea` | `sess.invalidTokens` | `e-label:Invalid Tokens:` | "empty" |
| 1335 | `r.0.1.1.0.1.3.1.3.0.0.1.0.0` | `editable-text` | `sess.ssoHost` | — | "empty" |
| 1357 | `r.0.1.1.0.1.3.1.5.0.4.0.0.1` | `editable-checkbox` | `sess.useV3` | `e-title:Use v3?` | "Yes!" |
| 1359 | `r.0.1.1.0.1.3.1.5.0.4.0.1.1` | `editable-checkbox` | `sess.useV5` | `e-title:Use v5?` | "No" |
| 1361 | `r.0.1.1.0.1.3.1.5.0.4.0.2.1` | `editable-text` | `sess.clusterID` | `e-label:Server` | "empty" |
| 1365 | `r.0.1.1.0.1.3.1.5.0.4.0.2.5` | `editable-text` | `sess.backupClusterID` | `e-label:Server` | "empty" |
| 1371 | `r.0.1.1.0.1.3.1.5.0.4.0.6.1` | `editable-text` | `sess.superClusterID` | `e-label:Server` | "empty" |
| 1377 | `r.0.1.1.0.1.3.1.5.0.4.0.6.7` | `editable-number` | `sess.superClusterExpectedServerCount` | `e-label:Expected Server Count` | "0" |
| 1381 | `r.0.1.1.0.1.3.1.5.0.4.0.7.1` | `editable-checkbox` | `sess.useFFmpegRecording` | `e-title:Use FFmpeg for Recording?` | "No" |
| 1383 | `r.0.1.1.0.1.3.1.5.0.4.0.9.1` | `editable-checkbox` | `sess.useLessBusyVsRoundRobin` | `e-title:Use less busy?` | "No" |
| 1385 | `r.0.1.1.0.1.3.1.5.0.4.0.11.1` | `editable-checkbox` | `sess.useMediaMTX` | `e-title:Use MediaMTX?` | "No" |
| 1387 | `r.0.1.1.0.1.3.1.5.0.4.0.12.1` | `editable-text` | `sess.mediaMTXClusterID` | `e-label:MediaMTX ClusterID:` | "empty" |
| 1389 | `r.0.1.1.0.1.3.1.5.0.4.0.13.1` | `editable-text` | `sess.backupMediaMTXClustterID` | `e-label:Backup MediaMTX ClustterID:` | "empty" |
| 1391 | `r.0.1.1.0.1.3.1.5.0.4.0.14.1` | `editable-text` | `sess.media_max_bitrate` | `e-label:BitRate` | "512000" |
| 1395 | `r.0.1.1.0.1.3.1.5.0.4.0.15.1` | `editable-text` | `sess.media_fir_rate` | `e-label:KeyFrameRate` | "5" |
| 1399 | `r.0.1.1.0.1.3.1.5.0.4.0.16.1` | `editable-checkbox` | `sess.hasYTStreaming` | `e-title:FB / YT Streaming?` | "No" |
| 1401 | `r.0.1.1.0.1.3.1.5.0.4.0.18.1` | `editable-textarea` | `sess.media_relays` | `e-title:Repeaters:` | "empty" |
| 1415 | `r.0.1.1.0.1.3.1.5.0.4.0.22.1` | `editable-checkbox` | `sess.isLocked` | `e-title:Lock Session?` | "No" |
| 1419 | `r.0.1.1.0.1.3.1.5.0.4.0.23.1` | `editable-textarea` | `sess.chatServerURL` | `e-label:Talk URL:` | "/talk" |
| 1423 | `r.0.1.1.0.1.3.1.5.0.4.0.25.1` | `editable-checkbox` | `sess.force_jpeg_screenshare` | `e-title:Force JPG Screens?` | "No" |
| 1425 | `r.0.1.1.0.1.3.1.5.0.4.0.26.1` | `editable-checkbox` | `sess.force_mp3_audio` | `e-title:Force  MP3 Audio?` | "No" |
| 1427 | `r.0.1.1.0.1.3.1.5.0.4.0.27.1` | `editable-textarea` | `sess.node_media_relays` | `e-title:Node Repeaters:` | "empty" |
| 1431 | `r.0.1.1.0.1.3.1.5.0.4.0.28.1` | `editable-textarea` | `sess.node_ws_media_relays` | `e-title:Node WS Repeaters:` | "empty" |
| 1435 | `r.0.1.1.0.1.3.1.5.0.4.0.31.1` | `editable-textarea` | `sess.altCodeVendorJS` | `e-title:VendorJS name:` | "empty" |
| 1439 | `r.0.1.1.0.1.3.1.5.0.4.0.32.1` | `editable-textarea` | `sess.altCodeAppJS` | `e-title:AppJS name:` | "empty" |

## Verification

**Files read, in full, line by line, in my own context (no delegation, no sub-agents):**

| file | lines | records | first `#index` | last `#index` | reached last line? |
|---|---|---|---|---|---|
| `/tmp/ptr-decode/ptr1/caps/00-baseline-room/DEFAULTS.txt` | 100 | n/a (style table) | n/a | n/a | yes — line 100 `stroke \| none \| 2156/2156 \| 1` |
| `/tmp/ptr-decode/ptr1/caps/00-baseline-room/INFO.txt` | 9 | n/a (capture header) | n/a | n/a | yes — line 9 `emitted as : FULL node dump` |
| `…/nodes-006.txt` | 1639 | 120 | #720 | #839 | yes — final record #839 ends at line 1638 |
| `…/nodes-007.txt` | 1634 | 120 | #840 | #959 | yes — final record #959 ends at line 1633 |
| `…/nodes-008.txt` | 1845 | 120 | #960 | #1079 | yes — final record #1079 ends at line 1844 |
| `…/nodes-009.txt` | 1859 | 120 | #1080 | #1199 | yes — final record #1199 ends at line 1858 |
| `…/nodes-010.txt` | 1519 | 120 | #1200 | #1319 | yes — final record #1319 ends at line 1518 |
| `…/nodes-011.txt` | 1962 | 120 | #1320 | #1439 | yes — final record #1439 ends at line 1961 |

**Totals:** 10,458 lines of node records + 109 lines of DEFAULTS/INFO = **10,567 lines read**.
**Node records covered: #720 through #1439 inclusive — 720 records, zero skipped, zero sampled.**
Record count independently re-derived from the files: `grep -c '^#'` = 120 per file × 6 = 720.

**What I did NOT read (correctly, per my assignment):** `evidence-dumps/NEXT-STEP/ptr1.json` (the 23 MB source),
`nodes-000.txt` … `nodes-005.txt`, and `nodes-012.txt` … `nodes-017.txt`. Those are other agents'
slices. I did not re-run the decoder. I spawned no sub-agents; every claim above sits next to
evidence I read myself.

**Derived tables (Appendices A/B/C and the census in §3) were extracted mechanically from those
same six files** so that no number in this document depends on my hand-counting. The extraction
reproduces 720 outline rows, 505 text rows and 181 editable rows, matching the record count.

---

# PART: ptr1-parts/03-baseline-1440-2155.md

# ptr1 baseline-room decode — node records #1440–#2155 (slice 03)

Source slices read (and only these):
`/tmp/ptr-decode/ptr1/caps/00-baseline-room/DEFAULTS.txt`,
`nodes-012.txt`, `nodes-013.txt`, `nodes-014.txt`, `nodes-015.txt`, `nodes-016.txt`, `nodes-017.txt`.

Capture: `baseline-room`, 2156 nodes total, page
`https://protradingroom.com/ptrApp#/page/manageSession/6a628a99731b9f77ae9bf505`, role=member,
viewport 1842×1265 @dpr2, captured 2026-07-24.

Every node's full computed style = the COMMON table in `DEFAULTS.txt` overridden by that node's
`style-deviations`. All colour/typography values below are the literal values printed in the slice
(or the COMMON value from `DEFAULTS.txt` where a node prints no deviation for that property).

---

## 0. CRITICAL STRUCTURAL CORRECTION — this range is NOT "the bottom of the body"

The brief described records #1440–#2155 as "the tail of the DOM … overlays, modals, templates and
third-party widgets at the bottom of the body." **That is not what this range contains.** The dump is
ordered **breadth-first by DOM depth**, not in document order. Verified by counting path segments on
every `#index` line in my six files, in file order:

| DOM depth (path segments after `r.`) | first record | node count |
|---|---|---|
| 13 | `#1440 path=r.0.1.1.0.1.3.1.5.0.4.0.32.2` | 78 |
| 14 | `#1518 path=r.0.1.1.0.1.3.1.0.0.0.0.3.0.0` | 133 |
| 15 | `#1651 path=r.0.1.1.0.1.3.1.0.0.0.0.3.1.0.0` | 84 |
| 16 | `#1735 path=r.0.1.1.0.1.3.1.0.0.0.0.3.1.1.0.0` | 76 |
| 17 | `#1811 path=r.0.1.1.0.1.3.1.0.0.3.1.0.4.0.0.1.0` | 45 |
| 18 | `#1856 path=r.0.1.1.0.1.3.1.0.0.3.1.0.4.0.1.0.0.0` | 132 |
| 19 | `#1988 path=r.0.1.1.0.1.3.1.0.0.3.1.0.4.0.1.0.1.0.0` | 75 |
| 20 | `#2063 path=r.0.1.1.0.1.3.1.0.0.3.1.0.4.0.1.0.1.0.0.0` | 93 |

Sum = 716 = exactly my record count. Depth increases monotonically and never goes back down, so my
range is **the deepest leaves of the page**, i.e. the innermost contents of four regions whose
shallow ancestors live in earlier slices (#0–#1439, other agents).

**Consequence — honest gap / negative finding:** there is **no third-party injected DOM in my range at
all**. Zero `<iframe>`, zero `<video>`, zero `<svg>`, zero `<script>`, zero `<canvas>` (verified: no
such tag appears on any `#index` line in my six files). No Intercom, no reCAPTCHA, no Google Tag,
no Stripe element, no chat widget. Every one of my 716 nodes is AngularJS application DOM.
Tag census across my range:

| tag | count | tag | count |
|---|---|---|---|
| `<i>` | 218 | `<div>` | 26 |
| `<a>` | 152 | `<br>` | 25 |
| `<li>` | 139 | `<ul>` | 15 |
| `<span>` | 57 | `<input>` | 3 |
| `<label>` | 43 | `<img>` | 3 |
| `<button>` | 34 | `<p>` | 1 |

---

## 1. DOM outline

All paths share the ancestor prefix **`r.0.1.1.0.1.3.1`** — referred to below as `$T` (the
manage-session tab body). Four disjoint sub-trees appear in my range.

```
$T = r.0.1.1.0.1.3.1
│
├── $T.0 ................................. USERS / PARTICIPANTS tab pane
│   ├── $T.0.0.0.0.3 ..................... "user list" dropdown (btn-group)
│   │   ├── .3.0.0   <span class="caret">          #1518  rect 1357.8,431.4  8×4   ← VISIBLE
│   │   └── .3.1     <ul class="dropdown-menu">    (parent out of range)
│   │        ├── .1.0  <li>   #1519  → .1.0.0 <a> "Show Free Trials"        #1651 → <i fa-user?>  —
│   │        │                                   (icon #1735 is on .1.1.0, see below)
│   │        ├── .1.1  <li>   #1520  → .1.1.0 <a> "Show BANNED"             #1652 → <i fa-ban>      #1735
│   │        ├── .1.2  <li>   #1521  → .1.2.0 <a> "Show Mobile"             #1653 → <i fa-mobile>   #1736
│   │        ├── .1.3  <li>   #1522  → .1.3.0 <a> "Show Non-Mobile"         #1654 → <i fa-mobile>   #1737
│   │        ├── .1.4  <li>   #1523  → .1.4.0 <a> "Show Presenters"         #1655 → <i fa-microphone> #1738
│   │        ├── .1.5  <li>   #1524  → .1.5.0 <a> "Marketplace Users"       #1656 → <i fa-credit-card> #1739
│   │        ├── .1.6  <li role="separator" class="divider">                #1525
│   │        ├── .1.7  <li>   #1526  → .1.7.0 <a> "Remove non-presenters"   #1657 → <i fa-trash-o>  #1740
│   │        ├── .1.8  <li>   #1527  → .1.8.0 <a> "Remove Free Trials"      #1658 → <i fa-trash-o>  #1741
│   │        └── .1.9  <li>   #1528  → .1.9.0 <a> "Remove All User Badges"  #1659 → <i fa-trash-o>  #1742
│   │
│   ├── $T.0.0.2.1.2 ..................... "bulk actions on checked users" <ul> (parent out of range)
│   │        ├── .2.0.0 <a> "Remove All"                 #1529 → <i class="icon fa fa-trash">  #1660
│   │        ├── .2.1.0 <a> "UNBAN Participant"          #1530 → <i class="icon fa fa-user">   #1661
│   │        ├── .2.2.0 <a> "Make Presenter"             #1531 → <i fa-microphone> #1662, <i fa-desktop> #1663
│   │        ├── .2.3.0 <a> "Make Admin (Non-Presenter)" #1532 → <i fa-cog> #1664, <i fa-user-md> #1665
│   │        ├── .2.4.0 <a> "Make Participant"           #1533 → <i class="icon fa fa-user">   #1666
│   │        ├── .2.5.0 <a> "Make TRIAL user"            #1534 → <i class="icon fa fa-user">   #1667
│   │        ├── .2.6.0 <a> "MUTE Participant"           #1535 → <i fa-user-times>             #1668
│   │        ├── .2.7.0 <a> "BAN Participant"            #1536 → <i fa-user-times>             #1669
│   │        ├── .2.8.0 <a> "Add Badge"                  #1537 → <i class="icon fa fa-user">   #1670
│   │        └── .2.9.0 <a> "Remove Badge"               #1538 → <i class="icon fa fa-user">   #1671
│   │
│   └── $T.0.0.3.1.{0,1,2} ............... THREE ng-repeat USER ROWS (170 nodes each)
│        ├── row .0  (OWNER — role==0)     see §2.4
│        ├── row .1  (PARTICIPANT — role==2, "/ login")
│        └── row .2  (ADMIN — role==1 nonPresenter, "/ manual", PW set)
│
├── $T.2.0.0.5 ........................... textAngular RICH-TEXT EDITOR (70 nodes)
│   ├── .5.0.0.0  <i class="fa fa-save">                             #1635
│   ├── .5.1.0.{0,1,2,3}  <div class="btn-group"> ×4 (toolbar groups) #1636–#1639
│   │    ├── group 0 → buttons h1..h6, p, pre, quote                  #1696–#1704 (+icon #1788)
│   │    ├── group 1 → bold, italics, underline, strikeThrough, ul, ol, redo, undo, clear
│   │    │                                                            #1705–#1713 (icons #1789–#1797)
│   │    ├── group 2 → justifyLeft, justifyCenter(active), justifyRight, justifyFull, indent, outdent
│   │    │                                                            #1714–#1719 (icons #1798–#1803)
│   │    └── group 3 → html, insertImage, insertLink, insertVideo, #toolbarWC, #toolbarCC
│   │                                                                #1720–#1725 (icons #1804–#1807,
│   │                                                                 counters #1808 "0", #1809 "0")
│   ├── .5.1.1.0  <div class="popover fade bottom">  #1640  → .0 arrow #1726, .1 popover-content #1727
│   ├── .5.1.1.1  <div class="ta-resizer-handle-overlay"> #1641 → background #1728, corners
│   │                                                       tl #1729 tr #1730 bl #1731 br #1732,
│   │                                                       info #1733
│   └── .5.1.1.2#taTextElement7346242129359551 <div contenteditable> #1642
│            └── .0 <p> #1734 → .0.0 <br> #1810
│
├── $T.4.0.0.0.0 ......................... STATS DATE-RANGE FORM (8 nodes)
│   ├── .0.0 <label class="col-sm-4 control-label"> "Start Date:"      #1643
│   ├── .0.1 <a editable-date="statsDate"> "07-22-2026"               #1644
│   ├── .0.2 <br>                                                     #1645
│   ├── .0.3 <label class="muted"> "Choose a start date"              #1646
│   ├── .1.0 <label class="col-sm-4 control-label"> "End Date:"       #1647
│   ├── .1.1 <a editable-date="statsDateEnd"> "07-23-2026"            #1648
│   ├── .1.2 <br>                                                     #1649
│   └── .1.3 <label class="muted"> "Choose an end date"               #1650
│
└── $T.5.0.4.0.{32…61} ................... SESSION SETTINGS FORM, rows 32–61 (78 nodes)
     each row = .N.0 <label class="col-sm-2 control-label">   (field name)
                .N.1 <a editable-textarea|editable-checkbox>  (xeditable value)
                .N.2 <br>                       (only on textarea rows that carry a hint)
                .N.3 <label class="muted">      (hint text)
     rows present: 32(partial: .2/.3 only), 33, 34, 35, 36, 37, 38(no .2/.3), 39(no .2/.3),
                   42, 43, 44, 45, 46, 47, 48(no .2/.3), 50, 51, 52, 53, 54, 55, 56, 57,
                   58(no .2/.3), 59, 60, 61
```

### User-row internal skeleton (identical for rows .0 / .1 / .2)

```
$T.0.0.3.1.<R>
 ├── .1  (identity / status strip)
 │    ├── .1.0  <input type="checkbox" name="checkbox">          row0 #1539  row1 #1571  row2 #1603
 │    ├── .1.1  <i class="fa fa-folder-o fa-2x ng-hide">         #1540 #1572 #1604
 │    ├── .1.2  <i class="fa fa-mobile fa-2x ng-hide">           #1541 #1573 #1605
 │    ├── .1.3  <i class="fa fa-mobile ng-hide">                 #1542 #1574 #1606
 │    ├── .1.4  <i class="fa fa-mobile ng-hide" style="color:red"> #1543 #1575 #1607
 │    ├── .1.5  <i class="fa fa-microphone ng-hide">             #1544 #1576 #1608
 │    ├── .1.6  <i class="fa fa-video-camera ng-hide">           #1545 #1577 #1609
 │    ├── .1.7  <i class="fa fa-desktop ng-hide">                #1546 #1578 #1610
 │    ├── .1.8  <i class="fa fa-comment-o ng-hide">              #1547 #1579 #1611
 │    ├── .1.9  <i class="fa fa-pencil-square-o ng-hide">        #1548 #1580 #1612
 │    ├── .1.10 <i class="fa fa-hdd-o ng-hide" title="Denied Archives Access"> #1549 #1581 #1613
 │    ├── .1.11 <img class="thumb24" gravatar-src-once="user.email ">  #1550 #1582 #1614
 │    ├── .1.12 <div ng-show="user.discordUserId"> "Discord Username:" #1551 #1583 #1615
 │    ├── .1.13 <span class="badge badge-danger-chat"> "TRIAL"   #1552 #1584 #1616
 │    ├── .1.14 <br>                                            #1553 #1585 #1617
 │    ├── .1.15 <span ng-show="showPins && user.mobilePairCode"> "|"  #1554 #1586 #1618
 │    │          └── .15.0 <i class="fa fa-mobile">              #1672 #1680 #1688
 │    ├── .1.16 <span ng-show="user.phone">   (no text captured) #1555 #1587 #1619
 │    │          └── .16.0 <i class="fa fa-phone">               #1673 #1681 #1689
 │    ├── .1.17 <span ng-show="user.pw"> "PW set"                #1556 #1588 #1620
 │    │          └── .17.0 <i class="fa fa-lock">                #1674 #1682 #1690
 │    ├── .1.18 <span class="badge badge-danger"> "User Count Hidden"        #1557 #1589 #1621
 │    └── .1.19 <span class="badge badge-danger"> "User Personal Info Hidden" #1558 #1590 #1622
 ├── .2  (flags / note)
 │    ├── .2.0 <span style="color:red"> "*** INACTIVE USER ***"  #1559 #1591 #1623
 │    ├── .2.1 <span style="color:red"> "User PMs disabled"      #1560 #1592 #1624
 │    │          ├── .1.0 <br>                                   #1675 #1683 #1691
 │    │          └── .1.1 <i class="fa fa-comment-o">            #1676 #1684 #1692
 │    └── .2.2 <div ng-show="user.note" style="border:1px solid #A0A0A0; padding:5px;"> #1561 #1593 #1625
 │               └── .2.0 <br>                                   #1677 #1685 #1693
 ├── .3  (approve + role labels)
 │    ├── .3.0 <button class="btn btn-small btn-warning"> "APPROVE"   #1562 #1594 #1626
 │    ├── .3.1 <span ng-show="user.role==2 "> "Participant"           #1563 #1595 #1627
 │    ├── .3.2 <span ng-show="user.role==0 "> "Owner"                 #1564 #1596 #1628
 │    ├── .3.3 <span ng-show="user.role==1 && !user.nonPresenter"> "Presenter" #1565 #1597 #1629
 │    ├── .3.4 <span ng-show="user.role==1 && user.nonPresenter"> "Admin"      #1566 #1598 #1630
 │    ├── .3.5 <span ng-hide="user.role==0" class="ng-binding">  "/" | "/ login" | "/ manual"
 │    │                                                              #1567 #1599 #1631
 │    ├── .3.6 <span ng-show="user.role==3 "> "CHAT MUTED"            #1568 #1600 #1632
 │    └── .3.7 <span ng-show="user.role==4 "> "BANNED"                #1569 #1601 #1633
 └── .4.0 <div dropdown class="btn-group mb-sm mr">              #1570 #1602 #1634
      ├── .0.0 <button class="btn dropdown-toggle btn-primary"> "Actions"  #1678 #1686 #1694
      │    ├── .0.0.0 <span class="caret">                       #1743 #1758 #1773
      │    └── .0.0.1 <span> (sr-only-ish wrapper)               #1744 #1759 #1774
      │          └── .1.0 <span style="width:107px;height:107px;left:-10.6719px;top:-42.5px;">
      │                                                          #1811 #1826 #1841
      └── .0.1 <ul role="menu" class="dropdown-menu dropdown-menu-right">  #1679 #1687 #1695
           ├── .1.0 <li class="dropdown-submenu" ng-class="{open: submenuOpen.permissions}">
           │        #1745 #1760 #1775 → <a> "Permissions" #1812 #1827 #1842 (+ <i fa-shield>,
           │        <i fa-caret-right pull-right>) → <ul class="dropdown-menu"> #1813 #1828 #1843
           │        with 9 <li> → 8 <a>: Make Presenter / Make Admin / Make Participant /
           │        Make Trial / MUTE Participant / BAN / (divider) / Unban / Freshen Login Date
           ├── .1.1 <li class="dropdown-submenu" ng-class="{open: submenuOpen.granular}">
           │        #1746 #1761 #1776 → <a> "Granular Perms" (+ <i fa-sliders>) → <ul> with 12 <li>
           │        → 9 <a>: Adjust Mic/Cam/Screen/Chat/Notes / Show User Count / Hide User Count /
           │        Deny Archives Access / Allow Archives Access / Hide Pers User Data /
           │        Don't Hide Pers User Data / Disallow User2User PM / Allow User2User PM
           ├── .1.2 <li class="dropdown-submenu" ng-class="{open: submenuOpen.app}">
           │        #1747 #1762 #1777 → <a> "App and Notifications" (+ <i fa-mobile>) → <ul> with 9 <li>
           │        → 8 <a>: Get App PIN / Show App Tokens / Get FCM Tokens / (divider) /
           │        PAUSE Mobile Notifs / RESUME Mobile Notifs / Remove Mobile Notifs /
           │        Send Test Mobile Notifs / Reset Mobile Notifs
           ├── .1.3 <li class="dropdown-submenu" ng-class="{open: submenuOpen.badges}">
           │        #1748 #1763 #1778 → <a> "Badges" (+ <i fa-certificate>) → <ul> #1819 #1834 #1849
           │        (NO child <li> captured — see §7 Honest gaps)
           ├── .1.4 <li class="divider">                        #1749 #1764 #1779
           ├── .1.5 <li> → <a> "Set Note"                       #1750 #1765 #1780 / #1820 #1835 #1850
           ├── .1.6 <li> → <a> "Edit Username"                  #1751 #1766 #1781 / #1821 #1836 #1851
           ├── .1.7 <li> → <a> "Remove User"                    #1752 #1767 #1782 / #1822 #1837 #1852
           ├── .1.8 <li class="divider">                        #1753 #1768 #1783
           ├── .1.9 <li> → <a> "Set/Change Password"            #1754 #1769 #1784 / #1823 #1838 #1853
           ├── .1.10 <li> → <a> "Resend Welcome Email"          #1755 #1770 #1785 / #1824 #1839 #1854
           ├── .1.11 <li class="divider">                       #1756 #1771 #1786
           └── .1.12 <li> → <a> "Pause / Pending"               #1757 #1772 #1787 / #1825 #1840 #1855
```

---

## 2. Region / component inventory

### 2.1 Session-settings form rows — `$T.5.0.4.0.32…61` (78 nodes, #1440–#1517)

Bootstrap 3 `form-horizontal` rows driven by **angular-xeditable**. All 78 nodes have
`rect: x=0 y=0 w=0 h=0` and **none** carries `display:none` itself — the whole pane is collapsed by an
ancestor outside my range (honest inference limit: I cannot cite the ancestor, it is not in my files).

| element | box model | colour | typography | other |
|---|---|---|---|---|
| `<label class="col-sm-2 control-label">` e.g. `#1442 path=$T.5.0.4.0.33.0` | `position:relative; float:left; width:16.6667%; max-width:100%; min-height:1px; margin-bottom:5px; padding-left:15px; padding-right:15px` | `color: rgb(51,51,51)` (COMMON) | `"Helvetica Neue", Helvetica, Arial, sans-serif` 14px / **700** / 20px | `cursor:default` |
| `<a … editable-textarea>` e.g. `#1443 path=$T.5.0.4.0.33.1` | `display:inline; border-bottom: 1px dashed rgb(66,139,202)` (other three border colours `rgb(10,10,10)`) | `color: rgb(10,10,10)`; `outline-color: rgb(10,10,10)` | 14px / 400 / 20px, **`font-style: italic`** (only when `editable-empty`) | `cursor:pointer` |
| `<a … editable-checkbox>` e.g. `#1463 path=$T.5.0.4.0.38.1` | same as above | same | same but **no** italic (value "No") | `cursor:pointer` |
| `<label class="muted">` (hint) e.g. `#1445 path=$T.5.0.4.0.33.3` | `display:inline-block; max-width:100%; margin-bottom:5px` | `rgb(51,51,51)` (COMMON — the `.muted` class does **not** change colour here) | 14px / **700** / 20px | `cursor:default` |
| `<br>` e.g. `#1444` | — | — | — | `display:inline` only |

Radii: 0 everywhere. Shadows: none. z-index: auto. Overflow: visible. No flex/grid anywhere in this
region (`DEFAULTS.txt` line 22–33: `flex`, `flex-direction`, `grid-template-columns` have exactly 1
distinct value across the whole 2156-node capture — the page uses **float-based Bootstrap 3 grid only,
no flexbox and no CSS grid**).

### 2.2 Dropdown menus — `$T.0.0.0.0.3.1` and `$T.0.0.2.1.2`

| element | box model | colour | typography | other |
|---|---|---|---|---|
| `<span class="caret">` `#1518 path=$T.0.0.0.0.3.0.0` **(only visible node of this region)** | `display:inline-block; w 8px × h 4px; border-top:4px dashed rgb(255,255,255); border-left/right:4px solid rgba(0,0,0,0)` | `color rgb(255,255,255)`; `border-bottom-color rgb(255,255,255)` | 14px/400/20px, `text-align:center`, `white-space:nowrap`, `vertical-align:middle` | `cursor:pointer; user-select:none`; rect **x=1357.8 y=431.4 w=8 h=4** |
| `<li>` menu item `#1519 path=$T.0.0.0.0.3.1.0` | `display:list-item; list-style-type:none` | COMMON `rgb(51,51,51)` | **13px / 400 / 18.5714px**, `text-align:left` | — |
| `<li role="separator" class="divider">` `#1525 path=$T.0.0.0.0.3.1.6` | `height:1px; margin:9px 0; overflow:hidden` | **`background-color: rgb(229,229,229)`** | 13px/18.5714px | — |
| `<a>` menu link `#1529 path=$T.0.0.2.1.2.0.0` | `padding: 3px 20px 3px 20px` | COMMON `rgb(51,51,51)` | 13px / 400 / 18.5714px, `white-space:nowrap`, `text-align:left` | `cursor:pointer; list-style-type:none` |
| `<i class="fa …">` menu icon `#1660 path=$T.0.0.2.1.2.0.0.0` | `display:inline-block` | `::before {content:""-style glyph; color rgb(51,51,51); background rgba(0,0,0,0)}` | **`font-family: FontAwesome`, 13px / 13px** | `cursor:pointer` |

### 2.3 Bootstrap dropdown panel (`ul.dropdown-menu`) — the repeated overlay primitive

Cited from `#1679 path=$T.0.0.3.1.0.4.0.1` (identical deviations on #1687, #1695, and on the four
submenu `ul`s #1813/#1815/#1817/#1819 and their row-1/row-2 twins — the submenu variant differs only in
`left:0px` instead of `right:0px`):

| property | value |
|---|---|
| display | `none` (closed) |
| position / anchor | `absolute; top:100%; right:0px` (submenus: `top:100%; left:0px`) |
| z-index | **1000** |
| min-width | `160px` |
| margin | `margin-top:2px` |
| padding | `5px 0 5px 0` |
| border | `1px solid rgba(0, 0, 0, 0.15)` all four sides |
| radius | `2px` all four corners |
| background | `rgb(255,255,255)`, `background-clip: padding-box` |
| typography | 13px / 400 / 18.5714px, `text-align:left` |
| box-shadow | `rgba(0, 0, 0, 0.176) 0px 6px 12px 0px` |
| list-style | `none` |

### 2.4 The three user rows — `$T.0.0.3.1.{0,1,2}`

Each row is 170 records. Rendered geometry (all non-zero rects in my range come from here plus the
caret at #1518):

| row | user identity evidence | checkbox | avatar `<img class="thumb24">` | role text | Actions button |
|---|---|---|---|---|---|
| `.0` | `#1564` `<span ng-show="user.role==0 ">` **"Owner"** visible at `x=1213.4 y=559.5 w=41.2 h=16.5` | `#1539` `class="ng-hide"` → `display:none` (because `ng-show="user.role!==0"`) | `#1550` rect `x=104.3 y=558 w=24 h=24`; **`src` attribute ABSENT in the capture** (only `gravatar-src-once="user.email "`) | "Owner"; `.3.5` "/" is `ng-hide` (#1567) | `#1570` dropdown div `display:none` (`ng-hide="user.role==0"`) — the owner has no Actions menu |
| `.1` | `#1595` **"Participant"** at `x=1213.4 y=600.5 w=67.4 h=16.5`; `#1599` **"/ login"** at `x=1284.7 y=600.5 w=38.6 h=16.5` | `#1571` visible `x=104.3 y=603 w=13 h=13`, `appearance:auto` | `#1582` rect `x=121.2 y=600.4 w=24 h=24`, `src="https://secure.gravatar.com/avatar/[GRAVATAR_MD5_A]?size=80&default=mm"` | Participant (role==2) | `#1602` div `x=1527.2 y=599 w=88.7 h=34`; `#1686` button same rect; caret `#1758` `x=1594.9 y=615.4 w=8 h=4` |
| `.2` | `#1630` **"Admin"** at `x=1213.4 y=662.9 w=40.2 h=16.5`; `#1631` **"/ manual"** at `x=1257.5 y=662.9 w=54.2 h=16.5`; `#1620` **"PW set"** at `x=305 y=688.3 w=73.3 h=16.5` with `#1690` `<i class="fa fa-lock">` at `x=320.6 y=689.8 w=9 h=14` | `#1603` visible `x=104.3 y=665.4 w=13 h=13` | `#1614` rect `x=121.2 y=662.8 w=24 h=24`, `src="https://secure.gravatar.com/avatar/[GRAVATAR_MD5_B]?size=80&default=mm"` | Admin (role==1 && nonPresenter) | `#1634` div `x=1527.2 y=661.4 w=88.7 h=34`; `#1694` button; caret `#1773` `x=1594.9 y=677.8 w=8 h=4` |

Row vertical rhythm: row0 baseline y≈558–560, row1 y≈599–603, row2 y≈661–665 → **row pitch ≈ 42 px
then ≈ 62 px** (row 2 is taller because it renders the extra "PW set" line at y=688.3).

Component styling inside a row:

| component | box model | colour | typography | other |
|---|---|---|---|---|
| `<img class="thumb24 ">` `#1582` | `display:inline; 24×24px; margin-right:5px; overflow-x/y: clip` | — | `line-height:24px`, `vertical-align:middle` | inline `style="margin-right:5px "` |
| `<input type=checkbox>` `#1571` | `display:inline-block; 13×13px; margin-top:4px` | — | `line-height:normal` | `cursor:default; appearance:auto` |
| `<span class="badge badge-danger-chat">` "TRIAL" `#1552` | `min-width:10px; margin-right:20px; padding:3px 7px; radius 10px all corners` | `background-color: rgb(255,0,0)`; `color: rgb(255,255,255)`; all border colours `rgb(255,255,255)` | **12px / 700 / 12px**, `text-align:center`, `white-space:nowrap`, `vertical-align:middle` | `display:none` (ng-hide) |
| `<span class="badge badge-danger">` "User Count Hidden" `#1557` / "User Personal Info Hidden" `#1558` | `min-width:10px; padding:3px 7px; radius 10px` | **`background-color: rgb(119,119,119)`**; `color rgb(255,255,255)` | 12px / 700 / 12px, centered | `display:none` |
| `<div ng-show="user.note" style="border:1px solid #A0A0A0; padding:5px;">` `#1561` | `padding:5px; border:1px solid rgb(160,160,160)` all sides | inherits `rgb(51,51,51)` | inherits 14px/20px | `display:none` |
| `<button class="btn btn-small btn-warning">` "APPROVE" `#1562` | `padding:6px 12px; border:1px solid rgb(238,162,54); radius 4px` | `background-color: rgb(240,173,78)`; `color rgb(255,255,255)` | 14px / 400 / 20px, centered, nowrap, `vertical-align:middle` | `cursor:pointer; user-select:none`; `display:none` |
| `<button class="btn dropdown-toggle btn-primary">` "Actions" `#1686` | `float:left; 88.7188 × 34px; padding:6px 12px; border:1px solid rgb(46,109,164); radius 4px` | **`background-color: rgb(51,122,183)`**; `color rgb(255,255,255)` | 14px / 400 / 20px, centered, nowrap, `vertical-align:middle` | `position:relative; cursor:pointer; user-select:none` |
| `<div dropdown class="btn-group mb-sm mr">` `#1602` | `display:inline-block; position:relative; 88.7188 × 34px; margin-right:10px; margin-bottom:5px` | — | `vertical-align:middle` | so `.mr` = margin-right:10px, `.mb-sm` = margin-bottom:5px |
| red status text (`*** INACTIVE USER ***`, `User PMs disabled`, `CHAT MUTED`, `BANNED`) `#1559 #1560 #1568 #1569` | — | `color: rgb(255,0,0)` and all four border colours `rgb(255,0,0)`, `outline-color rgb(255,0,0)` | inherits 14px/20px | `display:none` in this capture |
| `<div ng-show="user.discordUserId">` `#1551` | `margin-left:10px` | `color: rgb(255,0,0)` (+ borders/outline) | **12px / 400 / 17.1429px** | `display:none` |
| `<span>` inside Actions button `#1811` | inline `style="width: 107px; height: 107px; left: -10.6719px; top: -42.5px;"` → computed `top:-42.5px; left:-10.6719px; width:107px; height:107px` | `color rgb(255,255,255)` | centered, nowrap | `display:inline` — a ripple/effect element; row1 twin `#1826` has rect `x=1602.9 y=607.5 w=0 h=16.5` |

### 2.5 textAngular rich-text editor — `$T.2.0.0.5` (70 nodes)

Every node here has a zero rect; only two carry `display:none` themselves (#1640 popover, #1641
resizer overlay). The rest are laid-out-but-collapsed because an ancestor outside my range is hidden.

| component | path / node | box model | colour | typography | other |
|---|---|---|---|---|---|
| toolbar group | `$T.2.0.0.5.1.0.{0,1,2,3}` `#1636`–`#1639` | `position:relative; float:left; margin-left:5px` | — | `vertical-align:middle` | Bootstrap `.btn-group` |
| toolbar button (disabled) | `#1696 …5.1.0.0.0` name="h1" | `position:relative; float:left; margin-bottom:5px; padding:10px; border:1px solid rgb(230,233,238)`; **first-in-group** gets `border-top-left-radius:4px; border-bottom-left-radius:4px`, **last-in-group** gets the right-side pair (`#1704`, `#1713`, `#1719`, `#1725`), middles get `margin-left:-1px` | `background-color: rgb(255,255,255)` | **11px / 400 / 15.7143px**, centered, nowrap, `vertical-align:middle` | `opacity: 0.65; cursor: not-allowed; box-shadow: rgb(0,0,0) 0px 0px 0px 0px; user-select:none`; `disabled="disabled"` |
| toolbar button (**active**) | `#1715 …5.1.0.2.1` name="justifyCenter" `class="… active"` | same + `z-index: 2` | **`background-color: rgb(230,230,230)`** | 11px/15.7143px | still `disabled`, `opacity:0.65` |
| toolbar button (**enabled**) | `#1720 …5.1.0.3.0` name="html" | same box | `background-color: rgb(255,255,255)` | 11px/15.7143px | **no `opacity`, no `disabled`, `cursor:pointer`** — the only enabled tool |
| word-count tile | `#1724 …5.1.0.3.4#toolbarWC` `<div id="toolbarWC">` | `min-width:100px` (inline `style="display:block; min-width:100px;"`) | white bg | 11px/15.7143px | text "Words:" + `<span ng-bind="wordcount">` "0" `#1808` |
| char-count tile | `#1725 …5.1.0.3.5#toolbarCC` `<div id="toolbarCC">` | `min-width:120px`; right-side radii 4px | white bg | 11px/15.7143px | text "Characters:" + `<span ng-bind="charcount">` "0" `#1809` |
| popover | `#1640 …5.1.1.0` `class="popover fade bottom"` inline `style="max-width:none; width:305px;"` | `position:absolute; top:0; left:0; width:305px; margin-top:10px; padding:1px; border-top/right/left:1px solid rgb(238,238,238)`, **`border-bottom: 2px solid rgb(230,233,238)`**; radius 2px | `background rgb(255,255,255)`, `background-clip:padding-box`, `color rgb(85,85,85)` | 14px/20px `text-align:left` | **`z-index: 1060`**, `opacity: 0`, `box-shadow: rgb(0,0,0) 0px 0px 0px 0px`, `transition-property: opacity`, `transition-duration: 0.15s`, `display:none` |
| popover arrow | `#1726 …5.1.1.0.0` `class="arrow"` | `position:absolute; top:-11px; left:50%; 0×0; margin-left:-11px; border-right/bottom/left-width:11px; all four styles solid` | `border-bottom-color: rgba(0, 0, 0, 0.25)`, others `rgba(0,0,0,0)` | — | `::after {content:" "}` |
| popover content | `#1727 …5.1.1.0.1` | `padding: 9px 14px` | `color rgb(85,85,85)` | 14px/20px left | — |
| resizer overlay | `#1641 …5.1.1.1` | `position:absolute` | `color rgb(85,85,85)` | — | **`z-index: 100`**, `display:none` |
| resizer background | `#1728 …5.1.1.1.0` | `position:absolute; inset 5px on all sides; border:1px solid rgb(0,0,0)` | **`background-color: rgba(0, 0, 0, 0.2)`** | — | — |
| resizer corners | `#1729` tl / `#1730` tr / `#1731` bl / `#1732` br | `position:absolute; 10×10px`, two 1px solid `rgb(0,0,0)` edges each; **br also has all four borders + `background rgb(255,255,255)` + `cursor: se-resize`** | — | — | — |
| resizer info | `#1733 …5.1.1.1.5` | `position:absolute; right:16px; bottom:16px; padding-left/right:4px; border:1px solid rgb(0,0,0)` | `background rgb(255,255,255)` | — | **`opacity: 0.7`** |
| editable surface | `#1642 …5.1.1.2#taTextElement7346242129359551` | **`min-height: 300px`; `padding: 6px 12px`** | `color: rgb(85,85,85)` | 14px/20px | `contenteditable="true"`, `overflow-wrap: break-word` |
| its content | `#1734 <p>` → `#1810 <br>` | `<p>` `margin-bottom:10px` | `rgb(85,85,85)` | 14px/20px | empty paragraph — editor is blank |

### 2.6 Stats date-range form — `$T.4.0.0.0.0` (8 nodes, all zero-rect)

| element | box model | colour | typography |
|---|---|---|---|
| `<label class="col-sm-4 control-label">` `#1643`, `#1647` | `position:relative; float:left; **width:33.3333%**; min-height:1px; margin-bottom:5px; padding:0 15px` | `rgb(51,51,51)` | 14px / **700** / 20px, `cursor:default` |
| `<a href="#" editable-date="statsDate">` `#1644`, `#1648` | `display:inline; border-bottom:1px dashed rgb(66,139,202)` | `color rgb(10,10,10)` | 14px/400/20px, `cursor:pointer` (no italic — values are non-empty) |
| `<label class="muted">` `#1646`, `#1650` | `display:inline-block; max-width:100%; margin-bottom:5px` | `rgb(51,51,51)` | 14px / **700** / 20px |

---

## 3. Visibility census (716 nodes)

| bucket | count | % |
|---|---|---|
| records in my range | **716** (#1440–#2155) | 100% |
| `rect: x=0 y=0 w=0 h=0` | **690** | 96.4% |
| non-zero rect (has geometry) | **26** | 3.6% |
| own `display: none` in style-deviations | **101** | 14.1% |
| `visibility: hidden` | **0** | 0% |
| `class` containing `ng-hide` | **84** | 11.7% |

**The 690 zero-rect nodes are NOT all `display:none`.** Only 101 hide themselves; the other 589 are
laid out inside an ancestor that is hidden/closed above my slice boundary. Breakdown by region:

| region (path under `$T`) | what it is | nodes | zero-rect | own `display:none` |
|---|---|---|---|---|
| `.0.0.0.0` | user-list filter dropdown (caret + 10 `li` + 9 `a` + 8 `i`) | 28 | 27 | 0 |
| `.0.0.2.1` | bulk-actions dropdown (10 `a` + 12 `i`) | 22 | 22 | 0 |
| `.0.0.3.1` | three user rows | **510** | 485 | **99** |
| `.2.0.0.5` | textAngular editor | 70 | 70 | 2 (#1640 popover, #1641 resizer overlay) |
| `.4.0.0.0` | stats date range | 8 | 8 | 0 |
| `.5.0.4.0` | session settings rows 32–61 | 78 | 78 | 0 |

Per user row:

| row | nodes | zero-rect | own `display:none` | visible nodes |
|---|---|---|---|---|
| `.0` (Owner) | 170 | 167 | 35 | 3 (`#1550` img, `#1553` br, `#1564` "Owner") |
| `.1` (Participant) | 170 | 160 | 32 | 10 |
| `.2` (Admin) | 170 | 158 | 32 | 12 |

The two dropdown regions (`.0.0.0.0`, `.0.0.2.1`) contain **zero** `display:none` nodes yet are all
invisible — their parent `ul.dropdown-menu` (closed, `display:none`) is outside my slice. The single
exception is `#1518` the caret, which is a child of the toggle **button**, not of the menu, hence
visible at `x=1357.8 y=431.4`.

**Third-party DOM: none.** See §0.

---

## 4. Text content verbatim (DOM order, deduplicated across the 3 identical user rows)

258 `text:` values, **128 distinct**. No value in my range shows a truncation marker (no `…`); the
literal `...` in "Custom CSS to custimize colors, etc..." is authored content, not truncation.

### 4.1 Session-settings rows — `$T.5.0.4.0.*` (#1440–#1517)

| # | path | string |
|---|---|---|
| 1441 | `.32.3` | `(name if alt vendorJS. ie. 'app2.min.js'` |
| 1442 | `.33.0` | `Alt JanusJS` |
| 1443 | `.33.1` | `empty` |
| 1445 | `.33.3` | `(name if alt janusJS. ie. 'janus4.js'` |
| 1446 | `.34.0` | `Alt Room.js` |
| 1447 | `.34.1` | `empty` |
| 1449 | `.34.3` | `(name if alt Room.js. ie. 'RoomRemoteRec.js'` |
| 1450 | `.35.0` | `Alert filter list for mods:` |
| 1451 | `.35.1` | `empty` |
| 1453 | `.35.3` | `i.e. [{\"username\":\"John\",\"avatar\":\"john@example.com\"}]` |
| 1454 | `.36.0` | `Custom CSS` |
| 1455 | `.36.1` | `empty` |
| 1457 | `.36.3` | `Custom CSS to custimize colors, etc...` |
| 1458 | `.37.0` | `Dark Theme Style` |
| 1459 | `.37.1` | `empty` |
| 1461 | `.37.3` | `Dark theme style to custimize colors.` |
| 1462 | `.38.0` | `Hide Logo` |
| 1463 | `.38.1` | `No` |
| 1464 | `.39.0` | `Hide Powered By` |
| 1465 | `.39.1` | `No` |
| 1466 | `.42.0` | `Linked Rooms for alerts` |
| 1467 | `.42.1` | `empty` |
| 1469 | `.42.3` | `Comma (,) separated list of Room IDs of the rooms to PUSH our alerts to` |
| 1470 | `.43.0` | `Linked Rooms for Swing Alerts` |
| 1471 | `.43.1` | `empty` |
| 1473 | `.43.3` | `Comma (,) separated list of Room IDs of the rooms to PUSH our swing alerts to` |
| 1474 | `.44.0` | `SessionID to load swing alerts from` |
| 1475 | `.44.1` | `empty` |
| 1477 | `.44.3` | `Session ID to load swing alerts from` |
| 1478 | `.45.0` | `Linked Rooms for Day Trade Alerts` |
| 1479 | `.45.1` | `empty` |
| 1481 | `.45.3` | `Comma (,) separated list of Room IDs of the rooms to PUSH our day trade alerts to` |
| 1482 | `.46.0` | `SessionID to load day trade alerts from` |
| 1483 | `.46.1` | `empty` |
| 1485 | `.46.3` | `Session ID to load day trade alerts from` |
| 1486 | `.47.0` | `Linked Rooms for Recordings` |
| 1487 | `.47.1` | `empty` |
| 1489 | `.47.3` | `Comma (,) separated list of Session IDs of the rooms to load recordings from` |
| 1490 | `.48.0` | `Other Room API Secret:` |
| 1491 | `.48.1` | `empty` |
| 1492 | `.50.0` | `Enable PTR app?` |
| 1493 | `.50.1` | `No` |
| 1494 | `.51.0` | `App for Free trials?` |
| 1495 | `.51.1` | `No` |
| 1496 | `.52.0` | `Custom App?` |
| 1497 | `.52.1` | `No` |
| 1498 | `.53.0` | `Custom app String` |
| 1499 | `.53.1` | `empty` |
| 1500 | `.54.0` | `Custom iOS App URL` |
| 1501 | `.54.1` | `empty` |
| 1502 | `.55.0` | `Custom Android App URL` |
| 1503 | `.55.1` | `empty` |
| 1504 | `.56.0` | `Custom App launch Word` |
| 1505 | `.56.1` | `empty` |
| 1506 | `.57.0` | `Hide Mobile Credentials?` |
| 1507 | `.57.1` | `No` |
| 1509 | `.57.3` | `If enabled, it will hide mobile credentials` |
| 1510 | `.58.0` | `App for Some Members?` |
| 1511 | `.58.1` | `No` |
| 1512 | `.59.0` | `NQ News URL` |
| 1513 | `.59.1` | `empty` |
| 1514 | `.60.0` | `Random UDP port fix?` |
| 1515 | `.60.1` | `No` |
| 1516 | `.61.0` | `Streaming Threads?` |
| 1517 | `.61.1` | `No` |

Every checkbox field reads **"No"** and every textarea field reads **"empty"** — i.e. **this room has
none of these advanced settings configured.** That is real captured state, not a placeholder.

### 4.2 Bulk-actions dropdown — `$T.0.0.2.1.2.*` (#1529–#1538)

`Remove All` · `UNBAN Participant` · `Make Presenter` · `Make Admin (Non-Presenter)` ·
`Make Participant` · `Make TRIAL user` · `MUTE Participant` · `BAN Participant` · `Add Badge` ·
`Remove Badge`

### 4.3 User-list filter dropdown — `$T.0.0.0.0.3.1.*.0` (#1651–#1659)

`Show Free Trials` · `Show BANNED` · `Show Mobile` · `Show Non-Mobile` · `Show Presenters` ·
`Marketplace Users` · `Remove non-presenters` · `Remove Free Trials` · `Remove All User Badges`

### 4.4 User row strings (each appears 3×, once per row)

| string | row0 / row1 / row2 nodes | visible in capture? |
|---|---|---|
| `Discord Username:` | #1551 / #1583 / #1615 | no (all `ng-hide`) |
| `TRIAL` | #1552 / #1584 / #1616 | no |
| `\|` | #1554 / #1586 / #1618 | no |
| `PW set` | #1556 / #1588 / #1620 | **row2 only** (`x=305 y=688.3`) |
| `User Count Hidden` | #1557 / #1589 / #1621 | no |
| `User Personal Info Hidden` | #1558 / #1590 / #1622 | no |
| `*** INACTIVE USER ***` | #1559 / #1591 / #1623 | no |
| `User PMs disabled` | #1560 / #1592 / #1624 | no |
| `APPROVE` | #1562 / #1594 / #1626 | no |
| `Participant` | #1563 / #1595 / #1627 | **row1 only** |
| `Owner` | #1564 / #1596 / #1628 | **row0 only** |
| `Presenter` | #1565 / #1597 / #1629 | no |
| `Admin` | #1566 / #1598 / #1630 | **row2 only** |
| `/` \| `/ login` \| `/ manual` (same `<span ng-hide="user.role==0" class="ng-binding">`) | #1567 `"/"` / #1599 `"/ login"` / #1631 `"/ manual"` | rows 1 & 2 |
| `CHAT MUTED` | #1568 / #1600 / #1632 | no |
| `BANNED` | #1569 / #1601 / #1633 | no |
| `Actions` | #1678 / #1686 / #1694 | rows 1 & 2 |

Actions-menu strings (each appears 3×, all `display:none` because the menus are closed):
`Permissions` (#1812/#1827/#1842) · `Granular Perms` (#1814/#1829/#1844) ·
`App and Notifications` (#1816/#1831/#1846) · `Badges` (#1818/#1833/#1848) ·
`Set Note` (#1820/#1835/#1850) · `Edit Username` (#1821/#1836/#1851) ·
`Remove User` (#1822/#1837/#1852) · `Set/Change Password` (#1823/#1838/#1853) ·
`Resend Welcome Email` (#1824/#1839/#1854) · `Pause / Pending` (#1825/#1840/#1855)

Permissions submenu (#1988–#1995 row0; #2013–#2020 row1; #2038–#2045 row2):
`Make Presenter` · `Make Admin` · `Make Participant` · `Make Trial` · `MUTE Participant` · `BAN` ·
`Unban` · `Freshen Login Date`

Granular submenu (#1996–#2004 row0; #2021–#2029 row1; #2046–#2054 row2):
`Adjust Mic/Cam/Screen/Chat/Notes` · `Show User Count` · `Hide User Count` ·
`Deny Archives Access` · `Allow Archives Access` · `Hide Pers User Data` ·
`Don't Hide Pers User Data` · `Disallow User2User PM` · `Allow User2User PM`

App-and-Notifications submenu (#2005–#2012 row0; #2030–#2037 row1; #2055–#2062 row2):
`Get App PIN` · `Show App Tokens` · `Get FCM Tokens` · `PAUSE Mobile Notifs` ·
`RESUME Mobile Notifs` · `Remove Mobile Notifs` · `Send Test Mobile Notifs` · `Reset Mobile Notifs`

### 4.5 Stats form (#1643–#1650)

`Start Date:` · **`07-22-2026`** · `Choose a start date` · `End Date:` · **`07-23-2026`** ·
`Choose an end date`

### 4.6 Editor toolbar (#1696–#1725, #1808–#1809)

`H1` · `H2` · `H3` · `H4` · `H5` · `H6` · `P` · `pre` · `Words:` `0` · `Characters:` `0`
(the bold/italic/align/etc. buttons carry no text — icon only.)

---

## 5. AngularJS bindings — every `ng-*` and directive attribute, verbatim

Attribute-name census over my 716 records:

| attribute | occurrences |
|---|---|
| `ng-click` | 160 |
| `ng-show` | 93 |
| `ng-class` | 42 |
| `ng-disabled` | 33 |
| `ng-hide` | 6 |
| `ng-init` | 3 |
| `ng-checked` | 3 |
| `ng-bind` | 2 |
| `ng-model` | 1 |

Non-`ng` directives: `ta-button` (30), `onaftersave` (26), `editable-textarea` (17), `e-label` (15),
`e-title` (11), `editable-checkbox` (9), `on-toggle` (3), `gravatar-src-once` (3),
`dropdown-toggle` (3), `dropdown` (3), `data-toggle`+`data-target` (3 each), `editable-date` (2),
`ta-bind` (1). **No `ng-repeat`, `ng-if`, `ng-include`, `ng-controller` or `ng-app` appears in my
range** — those sit on the ancestors in earlier slices.

### 5.1 xeditable session-settings bindings (#1440–#1517) — verbatim

| node | `onaftersave` | model attribute | label attribute |
|---|---|---|---|
| #1443 | `saveSessField('customJanus')` | `editable-textarea = "sess.customJanus"` | `e-title = "customJanus:"` |
| #1447 | `saveSessField('alt_roomjs')` | `editable-textarea = "sess.alt_roomjs"` | `e-title = "Alr RoomJS:"` *(sic — typo in source)* |
| #1451 | `saveSessField('modAlertFilterList')` | `editable-textarea = "sess.modAlertFilterList"` | `e-label = "Nick   Filter:"` *(3 spaces, verbatim)* |
| #1455 | `saveSessField('customCSS')` | `editable-textarea = "sess.customCSS"` | `e-label = "customCSS:"` |
| #1459 | `saveSessField('darkThemeStyle')` | `editable-textarea = "sess.darkThemeStyle"` | `e-label = "Dark Theme Style:"` |
| #1463 | `saveSessField('hideLogo')` | `editable-checkbox = "sess.hideLogo"` | `e-title = "Hide Logo?"` |
| #1465 | `saveSessField('hidePoweredBy')` | `editable-checkbox = "sess.hidePoweredBy"` | `e-title = "Hide Powered By?"` |
| #1467 | `saveSessField('linkedRoomAlerts')` | `editable-textarea = "sess.linkedRoomAlerts"` | `e-label = "Linked Rooms:"` |
| #1471 | `saveSessField('linkedRoomSwingAlerts')` | `editable-textarea = "sess.linkedRoomSwingAlerts"` | `e-label = "Linked Rooms:"` |
| #1475 | `saveSessField('linkedRoomSwingAlertsOther')` | `editable-textarea = "sess.linkedRoomSwingAlertsOther"` | `e-label = "Linked Rooms:"` |
| #1479 | `saveSessField('linkedRoomDayTradeAlerts')` | `editable-textarea = "sess.linkedRoomDayTradeAlerts"` | `e-label = "Linked Rooms:"` |
| #1483 | `saveSessField('linkedRoomDayTradeAlertsOther')` | `editable-textarea = "sess.linkedRoomDayTradeAlertsOther"` | `e-label = "Linked Rooms:"` |
| #1487 | `saveSessField('linkedRoomRecordings')` | `editable-textarea = "sess.linkedRoomRecordings"` | `e-label = "Linked Rooms:"` |
| #1491 | `saveSessField('linkedStreamsAPIKey')` | `editable-textarea = "sess.linkedStreamsAPIKey"` | `e-label = "Linked Room Key:"` |
| #1493 | `saveSessField('ptrMobileAppEnabled')` | `editable-checkbox = "sess.ptrMobileAppEnabled"` | `e-title = "Enable PTR app?"` |
| #1495 | `saveSessField('freeTrialsGetApp')` | `editable-checkbox = "sess.freeTrialsGetApp"` | `e-title = "App for Free trials?"` |
| #1497 | `saveSessField('customMobileAppEnabled')` | `editable-checkbox = "sess.customMobileAppEnabled"` | `e-title = "Enable Custom app?"` |
| #1499 | `saveSessField('customMobileAppV3Name')` | `editable-textarea = "sess.customMobileAppV3Name"` | `e-label = "Custom app string:"` |
| #1501 | `saveSessField('customMobileAppIOSUrl')` | `editable-textarea = "sess.customMobileAppIOSUrl"` | `e-label = "Custom iOS App URL:"` |
| #1503 | `saveSessField('customMobileAppAndroidUrl')` | `editable-textarea = "sess.customMobileAppAndroidUrl"` | `e-label = "Custom Android App URL:"` |
| #1505 | `saveSessField('customMobileAppLaunchWord')` | `editable-textarea = "sess.customMobileAppLaunchWord"` | `e-label = "Custom Launch Word:"` |
| #1507 | `saveSessField('hideMobileCredentials')` | `editable-checkbox = "sess.hideMobileCredentials"` | `e-title = "Hide Mobile Credentials?"` |
| #1511 | `saveSessField('ptrMobileAppCaseByCaseEnabled')` | `editable-checkbox = "sess.ptrMobileAppCaseByCaseEnabled"` | `e-title = "Enable PTR app only for some?"` |
| #1513 | `saveSessField('nqNewsFeedURL')` | `editable-textarea = "sess.nqNewsFeedURL"` | `e-label = "NQ News URL:"` |
| #1515 | `saveSessField('generateRandomUDPPort')` | `editable-checkbox = "sess.generateRandomUDPPort"` | `e-title = "Random UDP port fix ?"` |
| #1517 | `saveSessField('streamingThreads')` | `editable-checkbox = "sess.streamingThreads"` | `e-title = "Streaming Threads ?"` |

All 26 carry `href = ""` and `class = "ng-scope ng-binding editable editable-click"` (+ `editable-empty`
on the 17 textarea rows). Stats-form dates use `editable-date = "statsDate"` (#1644, `href="#"`) and
`editable-date = "statsDateEnd"` (#1648, `href="#"`).

### 5.2 Bulk-action `ng-click` (#1529–#1538, #1651–#1659)

```
updateManyUsers(10)            #1529 "Remove All"
updateManyUsers(2)             #1530 "UNBAN Participant"
updateManyUsers(1)             #1531 "Make Presenter"
updateManyUsers(5)             #1532 "Make Admin (Non-Presenter)"
updateManyUsers(2)             #1533 "Make Participant"
updateManyUsers(6)             #1534 "Make TRIAL user"
updateManyUsers(3)             #1535 "MUTE Participant"
updateManyUsers(4)             #1536 "BAN Participant"
updateManyUsersBadgePrompt('add')     #1537 "Add Badge"
updateManyUsersBadgePrompt('remove')  #1538 "Remove Badge"
loadUsersFT()                  #1651   loadBannedUsers()      #1652
loadMobileUsers()              #1653   loadNonMobileUsers()   #1654
loadPresentersUsers()          #1655   loadMarketplaceUsers() #1656
clearUserList()                #1657   removeUsersFT()        #1658
removeBadgesForUsers()         #1659
```

Note the collision: `updateManyUsers(2)` is bound to **both** "UNBAN Participant" (#1530) and
"Make Participant" (#1533) — same opcode, two labels. Recorded as-is.

### 5.3 Per-user-row bindings (verbatim; identical on rows .0 / .1 / .2)

```
ng-show   = "user.role!==0"              (checkbox)               #1539 #1571 #1603
ng-checked= "checkedUserIds[user._id]"                             #1539 #1571 #1603
ng-click  = "getCheckedUserIds(user._id)"                          #1539 #1571 #1603
ng-show   = "false"                      (4 status icons)          #1540-#1543 …
ng-show   = "user.hasMic"                                          #1544 #1576 #1608
ng-show   = "user.hasCam"                                          #1545 #1577 #1609
ng-show   = "user.hasScreen"                                       #1546 #1578 #1610
ng-show   = "user.hasAdminChat"                                    #1547 #1579 #1611
ng-show   = "user.canEditNotes"                                    #1548 #1580 #1612
ng-show   = "user.denyArchivesAccess"                              #1549 #1581 #1613
ng-show   = "user.discordUserId"                                   #1551 #1583 #1615
ng-show   = "user.isFreeTrial"                                     #1552 #1584 #1616
ng-show   = "showPins && user.mobilePairCode"                      #1554 #1586 #1618
ng-show   = "user.phone"                                           #1555 #1587 #1619
ng-show   = "user.pw"                                              #1556 #1588 #1620
ng-show   = "user.hideUserCount"                                   #1557 #1589 #1621
ng-show   = "user.hidePersInfo"                                    #1558 #1590 #1622
ng-show   = "user.inactive"                                        #1559 #1591 #1623
ng-show   = "user.restrictPMUser"                                  #1560 #1592 #1624
ng-show   = "user.note"                                            #1561 #1593 #1625
ng-click  = "approveUser(user.userName,user._id,$index,'approved')" #1562 #1594 #1626
ng-show   = "user.inviteStatus=='pending' "                        #1562 #1594 #1626
ng-show   = "user.role==2 " / "user.role==0 " /
            "user.role==1 && !user.nonPresenter" /
            "user.role==1 && user.nonPresenter" /
            "user.role==3 " / "user.role==4 "                      #1563-#1569 …
ng-hide   = "user.role==0"                     (the "/ …" span)    #1567 #1599 #1631
ng-hide   = "user.role==0"                     (Actions btn-group) #1570 #1602 #1634
ng-init   = "submenuOpen={permissions:false, granular:false, app:false, badges:false}"   #1570 #1602 #1634
on-toggle = "!open && (submenuOpen={permissions:false, granular:false, app:false, badges:false})"
                                                                    #1570 #1602 #1634
dropdown  = "dropdown"                                              #1570 #1602 #1634
ng-disabled = "disabled" + dropdown-toggle=""  (Actions button)     #1678 #1686 #1694
ng-class  = "{open: submenuOpen.permissions}"  #1745 #1760 #1775
ng-class  = "{open: submenuOpen.granular}"     #1746 #1761 #1776
ng-class  = "{open: submenuOpen.app}"          #1747 #1762 #1777
ng-class  = "{open: submenuOpen.badges}"       #1748 #1763 #1778
ng-show   = "user.role !== 1"                  #1869 #1913 #1957 (row2 = ng-hide)
ng-show   = "!user.denyArchivesAccess"         #1873 #1917 #1961
ng-show   = "user.denyArchivesAccess"          #1874 #1918 #1962 (all ng-hide)
```

Submenu toggles (verbatim, one of four; the other three permute the same four flags):
```
ng-click = "submenuOpen.permissions=!submenuOpen.permissions; submenuOpen.granular=false;
            submenuOpen.app=false; submenuOpen.badges=false;
            $event.preventDefault(); $event.stopPropagation();"     #1812 #1827 #1842
```

Row action handlers (verbatim):
```
setNoteUser(user._id,user.userName,$index)                 #1820 #1835 #1850
editUsername(user._id, user.userName)                      #1821 #1836 #1851
deleteParticipant(user.userName,user._id,$index)           #1822 #1837 #1852
setUserPW(user._id,user.userName,$index)                   #1823 #1838 #1853
sendWelcomeEmail(user._id,user.userName,$index)            #1824 #1839 #1854
approveUser(user.userName,user._id,$index,'pending')       #1825 #1840 #1855
updateUser(1|5|2|6|3|4|2|9,user._id,user.userName,$index)  #1988-#1995 (+row1 #2013-#2020, row2 #2038-#2045)
setPermissions(user)   [data-toggle="modal" data-target="#permissionsModal"]  #1996 #2021 #2046
updateUser(8|7|13|14|10|11,user._id,user.userName,$index)  #1997-#2002 …
setUserRestrictPM(true|false,user._id,user.userName)       #2003 #2004 …
getAppPin(user.email,user.userName,$index)                 #2005 #2030 #2055
showAlerterAppTokens(user.userName,user.alerterAppTokens)  #2006 #2031 #2056
getFCMTokens(user._id,user.userName,$index)                #2007 #2032 #2057
pauseUserNotifs(user._id,user.userName,$index,'pause'|'resume'|'unsub')  #2008-#2010 …
sendTestFCM(user._id,user.userName,$index)                 #2011 #2036 #2061
resetFCMForuser(user._id,user.userName,$index)             #2012 #2037 #2062
```

**Full `updateUser` opcode map recovered from this range** (label → int):
`1 Make Presenter` · `2 Make Participant / Unban` · `3 MUTE Participant` · `4 BAN` ·
`5 Make Admin` · `6 Make Trial` · `7 Hide User Count` · `8 Show User Count` ·
`9 Freshen Login Date` · `10 Hide Pers User Data` · `11 Don't Hide Pers User Data` ·
`13 Deny Archives Access` · `14 Allow Archives Access`. **Opcode 12 is not used by any node in my
range** — honest gap; it may exist elsewhere in the app.

### 5.4 textAngular bindings

Every toolbar button carries the identical quartet, e.g. `#1696`:
```
ta-button    = "ta-button"
ng-disabled  = "isDisabled()"
ng-click     = "executeAction()"
ng-class     = "displayActiveToolClass(active)"
tabindex     = "-1"     unselectable = "on"
```
plus `name` (`h1 h2 h3 h4 h5 h6 p pre quote bold italics underline strikeThrough ul ol redo undo
clear justifyLeft justifyCenter justifyRight justifyFull indent outdent html insertImage insertLink
insertVideo wordcount charcount`) and `title` (`Heading 1`…`Heading 6`, `Paragraph`,
`Preformatted text`, `Quote/unquote selection or paragraph`, `Bold`, `Italic`, `Underline`,
`Strikethrough`, `Unordered List`, `Ordered List`, `Redo`, `Undo`, `Clear formatting`,
`Align text left`, `Center`, `Align text right`, `Justify text`, `Increase indent`,
`Decrease indent`, `Toggle html / Rich Text`, `Insert image`, `Insert / edit link`, `Insert video`).
29 of the 30 carry `disabled="disabled"`; the exception is `name="html"` (#1720).

Contenteditable surface `#1642`:
`id="taTextElement7346242129359551"`, `contenteditable="true"`, `ta-bind="ta-bind"`,
`ng-model="html"`, `class="ng-pristine ng-untouched ng-valid ta-bind"`.
Counters: `ng-bind="wordcount"` (#1808) and `ng-bind="charcount"` (#1809), both rendering `0`.

---

## 6. Assets & data

| kind | value | node |
|---|---|---|
| `<img>` src | *(absent — attribute not present)* | `#1550` (row0 avatar) |
| `<img>` src | `https://secure.gravatar.com/avatar/[GRAVATAR_MD5_A]?size=80&default=mm` | `#1582` (row1 avatar) |
| `<img>` src | `https://secure.gravatar.com/avatar/[GRAVATAR_MD5_B]?size=80&default=mm` | `#1614` (row2 avatar) |
| avatar directive | `gravatar-src-once = "user.email "` (trailing space verbatim) | #1550, #1582, #1614 |
| `href` values | 150× `""` (Angular no-op links) + 2× `"#"` (`#1644`, `#1648` editable-date) | — |
| iframes / video / svg / canvas / script | **none** | — |
| DOM `id`s | `taTextElement7346242129359551`, `toolbarWC`, `toolbarCC` | #1642, #1724, #1725 |
| modal target | `data-toggle="modal" data-target="#permissionsModal"` | #1996, #2021, #2046 |
| form fields | 3 × `<input type="checkbox" name="checkbox">` (one per user row) | #1539, #1571, #1603 |
| form fields | 1 × `contenteditable` div `ng-model="html"` | #1642 |
| dates | `07-22-2026` (statsDate), `07-23-2026` (statsDateEnd) | #1644, #1648 |
| ObjectIds | **none literal.** All are expression references: `user._id`, `checkedUserIds[user._id]` | throughout §5.3 |

### Credential / PII flags

1. **`#1491 path=$T.5.0.4.0.48.1`** — label "Other Room API Secret:", bound to
   `sess.linkedStreamsAPIKey` via `editable-textarea`, rendered value **`empty`**. This is an API-secret
   input surfaced in the page. In this capture it is unset, so **no secret leaked**, but the field
   exists and any rebuild must treat it as a credential field (never echo it into a DOM dump).
2. **Two gravatar hashes** (`[GRAVATAR_MD5_A]`, `[GRAVATAR_MD5_B]`) are
   MD5s of the two non-owner members' e-mail addresses — PII-derived identifiers, live data.
3. **`#1620` "PW set"** with `<i class="fa fa-lock">` (#1690) is visible on row 2 — the capture reveals
   *that* the Admin user has a password set (not the password itself).
4. `showAlerterAppTokens(user.userName,user.alerterAppTokens)` (#2006/#2031/#2056) and
   `getFCMTokens(...)` (#2007/#2032/#2057) are **token-revealing actions** wired into the row menu.
   No token values appear in my range.
5. `#1453` hint text embeds the example e-mail `john@example.com` — documentation placeholder, not real.

### FontAwesome icon inventory (58 distinct class strings, 218 `<i>` nodes)

`fa-mobile`(32) · `fa-user`(12, of which 5 as `icon fa fa-user`) · `fa-caret-right pull-right`(12) ·
`fa-lock`(9) · `fa-comment-o`(9) · `fa-user-times`(8) · `fa-user-circle`(6) · `fa-trash`(6, 1 as
`icon fa fa-trash`) · `fa-hdd-o`(6) · `fa fa-bell-o`(6, note the **duplicated `fa` class — verbatim**) ·
`fa-microphone`(5) · `fa-user-md`(4) · `fa-desktop`(4) · `fa-cog`(4) · `fa-video-camera`(3) ·
`fa-trash-o`(3) · `fa-sliders`(3) · `fa-shield`(3) · `fa-reload`(3) · `fa-play`(3) · `fa-phone`(3) ·
`fa-pencil-square-o`(3) · `fa-pause`(3) · `fa-folder-o fa-2x`(3) · `fa-envelope`(3) · `fa-edit`(3) ·
`fa-clock-o`(3) · `fa-certificate`(3) · `fa-ban`(2) · and one each of `fa-youtube-play`, `fa-undo`,
`fa-underline`, `fa-strikethrough`, `fa-save`, `fa-repeat`, `fa-quote-right`, `fa-picture-o`,
`fa-outdent`, `fa-list-ul`, `fa-list-ol`, `fa-link`, `fa-italic`, `fa-indent`, `fa-credit-card`,
`fa-code`, `fa-bold`, `fa-align-right`, `fa-align-left`, `fa-align-justify`, `fa-align-center`.

Icon rendering: all use `font-family: FontAwesome` on a `::before` with `content` = a private-use
glyph. **The capture stores the glyph as `"\"\""` (an empty-looking escaped string) for every icon**,
so the exact codepoints are NOT recoverable from this dump — the class name is the only identifier.
Icon sizes seen: 28px (`fa-2x`), 14px (row status strip), 13px (menu items), 11px (editor toolbar).

**`fa-reload` (#2093, #2124, #2155) is not a real FontAwesome 4 class** — the three
"Reset Mobile Notifs" icons will render blank. Note also `class="fa fa fa-bell-o"` (#2085 etc.) with
`fa` repeated. Both are source bugs, recorded verbatim, and reproduced exactly if the rebuild is to
match pixel-for-pixel (both are inside closed menus, so neither is visible in this capture).

---

## 7. Honest gaps

1. **Reframing, not a gap but must be stated:** this range is the *deepest* part of the DOM, not the
   bottom of the body. There are **no modal templates, no overlays at document end, and no
   third-party widgets** here (§0). If such things exist on this page they are in records < #1440.
2. **Truncation:** no `text:` value in my six files carries a truncation marker. I found **zero**
   truncated strings. (The literal `...` in #1457 is authored.)
3. **`<span ng-show="user.phone">` (#1555, #1587, #1619) has NO `text:` line at all** — the capture
   records no text for it (its `<i class="fa fa-phone">` child is #1673/#1681/#1689). Whether the
   binding is empty or the capture skipped it is undeterminable from my slice.
4. **`#1550` (row-0 avatar) has no `src` attribute** while its two siblings do. It still renders with a
   24×24 rect at `x=104.3 y=558`. Cause not determinable from my slice (Angular may not have resolved
   `gravatar-src-once` for the owner, or the capture missed it). Treated as an honest unknown.
5. **The "Badges" submenu `<ul>` (#1819 / #1834 / #1849) has no captured `<li>` children.** Its three
   siblings (permissions/granular/app) each expand into 8–12 items. Badge items are therefore either
   rendered lazily or lie beyond the capture's depth. **Do not invent badge menu entries.**
6. **Session-settings rows 40, 41 and 49 have no captured children**, and rows 32, 38, 39, 48, 58 lack
   the `.2`/`.3` (`<br>` + hint) pair. Row 32 appears only from `.32.2` onward — `.32.0`/`.32.1` are
   below #1440 (previous slice). Whether rows 40/41/49 exist and are empty, or do not exist, cannot be
   determined here.
7. **`updateUser` opcode 12 is unused** in my range (§5.3) — presumably defined elsewhere.
8. **All ancestors are outside my slice.** I can prove *that* the two dropdown regions, the settings
   form and the editor are invisible (zero rects, no self `display:none`), but I cannot cite *which*
   ancestor hides them. Anyone reconciling this must join with the slice covering #0–#1439.
9. **Icon glyph codepoints are unrecoverable** (§6) — the capture writes `content` as `"\"\""` for
   every FontAwesome `::before`.
10. **Row identity:** the capture exposes only role/derived text ("Owner", "Participant", "Admin",
    "/ login", "/ manual", "PW set") and two gravatar MD5s. **No usernames, e-mails, or `_id`s are
    present as literal text anywhere in my range** — every occurrence is an Angular expression. I have
    therefore not asserted who these three users are.

---

## Verification

- **Files read, in full, line by line, by me in this context (no delegation, no sub-agents):**
  1. `/tmp/ptr-decode/ptr1/caps/00-baseline-room/DEFAULTS.txt` — 100 lines + trailing blank (read lines 1–101, whole file).
  2. `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-012.txt` — 1789 lines (read 1–1338, then 1339–1789/end).
  3. `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-013.txt` — 1812 lines (read 1–950, then 951–1812/end).
  4. `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-014.txt` — 2732 lines (read 1–919, 920–1839, 1840–2732/end).
  5. `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-015.txt` — 1931 lines (read 1–999, then 1000–1931/end).
  6. `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-016.txt` — 1722 lines (read 1–879, then 880–1722/end).
  7. `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-017.txt` — 1709 lines (read 1–879, then 880–1709/end).
- **Total node-file lines read: 11,695** (1789 + 1812 + 2732 + 1931 + 1722 + 1709), plus 100 lines of `DEFAULTS.txt`.
- **I reached the last line of every one of the seven files.** The final line of `nodes-017.txt`
  (line 1709) is `    list-style-type: none`, the closing deviation of record #2155.
- **Node records covered: 716.** First = **`#1440 path=r.0.1.1.0.1.3.1.5.0.4.0.32.2 <br>`**.
  Last = **`#2155 path=r.0.1.1.0.1.3.1.0.0.3.1.2.4.0.1.2.1.8.0.1 <i class="fa fa-reload">`**.
  Per-file record counts: 012→120, 013→120, 014→120, 015→120, 016→120, 017→116. 120×5 + 116 = **716**,
  which equals 2155 − 1440 + 1 = 716. No record is missing and none is duplicated.
- **CONFIRMED: I reached record #2155, the last node of the page** (`nodes-017.txt` header line 1 reads
  "records 2040..2155 of 2156"; record #2155 begins at line 1697 and ends at line 1708).
- **I did NOT read** the 23 MB source JSON, `INFO.txt`, `nodes-000.txt` … `nodes-011.txt`, or any other
  agent's slice. I did not re-run the decoder. I spawned no sub-agents.
- Numeric claims in §3 (690 zero-rect, 26 non-zero-rect, 101 `display:none`, 0 `visibility:hidden`,
  84 `ng-hide`), the §0 depth table, the tag census, the icon census and the `ng-*` attribute census
  were produced by `grep`/`awk` over the same six files *after* I had read them, purely to make the
  counts exact rather than eyeballed.

---

# PART: ptr1-parts/04-interactions.md

# ptr1 decode — Part 04: Interaction captures (modal + 17 dropdowns)

Source: `evidence-dumps/NEXT-STEP/ptr1.json`, captures **[01]–[18]**, decoded slices under `/tmp/ptr-decode/ptr1/caps/`.
Page: `https://protradingroom.com/ptrApp#/page/manageSession/6a628a99731b9f77ae9bf505`, role=member,
viewport 1842×1265 @dpr2, captured 2026-07-24T15:59:18–19Z (`00-META.txt` lines 5–8).

Every claim below cites `caps/<dir>/nodes-NNN.txt #index path=<path>`. Node full style =
that capture's own `DEFAULTS.txt` COMMON table, overridden by the node's `style-deviations`.

---

## 0. How to read this part / what the harness did

All 18 captures are `kind = subtree` (`caps/01-modal_permissionsModal/INFO.txt` line 4, and the
same line in every other `INFO.txt`), and **every subtree is re-rooted at `path=r`**. Capture [02]'s
menu and capture [09]'s menu both report `#0 path=r` — the path therefore does **not** locate the
menu inside the baseline document tree. This is an honest limitation of the slice (see §7).

The harness evidently forced each `.dropdown-menu` open one at a time: the four submenus of the
per-user menu appear *inside* capture [04] with `attr class = "dropdown-menu"` and
`display: none` (`caps/04-…/nodes-000.txt #15 path=r.0.1`), yet the standalone captures of those
same elements carry `attr class = "dropdown-menu show"` + `attr style = "display: block;"`
(`caps/05-…/nodes-000.txt #0 path=r`). Timestamps are 62–71 ms apart and strictly sequential
(`00-META.txt` lines 15–31), consistent with a scripted walk, not user clicks.

Because of that forcing, most forced-open subtrees were never laid out: their rects are all
`x=0 y=0 w=0 h=0`. Real geometry exists only for captures **[02]**, **[03]**, **[09]** and **[14]**.
Rects are reported exactly as captured; no geometry is inferred.

---

## 1. The permissions modal — capture [01], 22 nodes

`caps/01-modal_permissionsModal/` — `INFO.txt` line 5: `node count : 22 (declared 22, truncated=false)`.

### 1.1 Dialog shell and box model

| # / path | tag | attrs | rect (CSS px) | key computed style |
|---|---|---|---|---|
| `#0 path=r` | `div` | `class="modal fade show"`, `id="permissionsModal"`, `tabindex="-1"`, `role="dialog"`, `aria-labelledby="permissionsModalLabel"`, `style="display: block; visibility: visible;"` | x=0 y=0 w=1842 h=1265 | `position: fixed`; `top/right/bottom/left: 0px`; **`z-index: 1050`**; `overflow-x/y: hidden`; **`opacity: 0`**; `transition-property: opacity`, `transition-duration: 0.15s` |
| `#1 path=r.0` | `div` | `class="modal-dialog"`, `role="document"` | x=621 y=-52.2 w=600 h=328.7 | `position: relative`; `width: 600px`; `margin: 30px 621px`; `transition-property: transform`, `duration 0.3s`; **`transform: matrix(1, 0, 0, 1, 0, -82.1777)`** |
| `#2 path=r.0.0` | `div` | `class="modal-content"` | x=621 y=-52.2 w=600 h=328.7 | `padding: 20px` all sides; `border: 1px solid rgba(0, 0, 0, 0.2)`; `border-radius: 6px`; `background-color: rgb(255, 255, 255)`; `background-clip: padding-box`; `box-shadow: rgba(0, 0, 0, 0.5) 0px 5px 15px 0px` |
| `#3 path=r.0.0.0` | `div` | `class="modal-header"` | x=642 y=-31.2 w=558 h=56.7 | `padding: 15px`; `border-bottom: 1px solid rgb(229, 229, 229)`; `::before`/`::after` both `content: " "` (clearfix) |
| `#4 path=r.0.0.1` | `div` | `class="modal-body"` | x=642 y=25.5 w=558 h=165 | `position: relative`; `padding: 15px` |
| `#5 path=r.0.0.2` | `div` | `class="modal-footer text-right"` | x=642 y=190.5 w=558 h=65 | `padding: 15px`; `border-top: 1px solid rgb(229, 229, 229)`; `text-align: right`; clearfix `::before`/`::after` |

**Capture state.** `#0` has `opacity: 0` and `#1` has `transform: translateY(-82.1777px)` — the modal
was captured **mid fade/slide-in**, before the Bootstrap `.in`/`.show` transition finished. The
negative `y=-52.2` on `#1`/`#2` is that translate applied to the resting position
(`margin-top: 30px` → resting top = 30; 30 − 82.1777 = −52.18, matching `y=-52.2`).
A rebuild should render the **resting** state: dialog 600×328.71 at x=621, top 30.

Text/base colours from `caps/01-…/DEFAULTS.txt`: `color: rgb(51, 51, 51)` (19/22 nodes, line 64),
`font-family: "Helvetica Neue", Helvetica, Arial, sans-serif` (22/22, line 65), `font-size: 14px`
(18/22, line 66).

### 1.2 Header

* `#6 path=r.0.0.0.0` `<button type="button" class="close" data-dismiss="modal" aria-label="Close">` —
  rect x=1172.4 y=-18.2 w=12.6 h=21; `float: right`; `margin-top: -2px`; `color: rgb(0, 0, 0)`;
  `font-size: 21px`; `line-height: 21px`; `text-shadow: rgb(255, 255, 255) 0px 1px 0px`;
  **`opacity: 0.2`**; `cursor: pointer`.
* `#15 path=r.0.0.0.0.0` `<span aria-hidden="true">` `text: "×"` — x=1172.4 y=-20.2 w=12.6 h=25.
* `#7 path=r.0.0.0.1#permissionsModalLabel` `<h4 class="modal-title" id="permissionsModalLabel">` —
  `text: "Adjust Mic/Cam/Screen permissions for user:"`; rect x=657 y=-16.2 w=528 h=25.7;
  `font-size: 18px`; `font-weight: 500`; `line-height: 25.7143px`.
* `#16 path=r.0.0.0.1#permissionsModalLabel.0` `<i class="ng-binding">` — rect x=1034.2 y=-14.2
  **w=0** h=21.5; `font-style: italic`. **The username binding rendered empty** (width 0, no `text:`
  line). The dialog title in the reference is therefore literally
  `Adjust Mic/Cam/Screen permissions for user:` with an empty italic slot after it — honest gap, §7.

### 1.3 Body — five permission checkboxes

All five `<label class="d-block">` share `max-width: 100%`, `margin-bottom: 5px`, rect w=528 h=22,
x=657. All five `<input type="checkbox" name="checkbox" class="ng-pristine ng-untouched ng-valid">`
share `display: inline-block`, `width/height: 13px`, `margin-top: 4px`, `line-height: normal`,
`appearance: auto`, rect 13×13 at x=657.

| label node | label text | y (label) | input node | `ng-model` | `ng-change` | y (input) |
|---|---|---|---|---|---|---|
| `#8 path=r.0.0.1.0` | `Microphone` | 40.5 | `#17 path=r.0.0.1.0.0` | `userPermissions.hasMic` | `toggleHasMic()` | 44.5 |
| `#9 path=r.0.0.1.1` | `Screenshare` | 67.5 | `#18 path=r.0.0.1.1.0` | `userPermissions.hasScreen` | `toggleHasScreen()` | 71.5 |
| `#10 path=r.0.0.1.2` | `WebCam` | 94.5 | `#19 path=r.0.0.1.2.0` | `userPermissions.hasCam` | `toggleHasCam()` | 98.5 |
| `#11 path=r.0.0.1.3` | `AdminChat` | 121.5 | `#20 path=r.0.0.1.3.0` | `userPermissions.hasAdminChat` | `toggleHasAdminChat()` | 125.5 |
| `#12 path=r.0.0.1.4` | `CanEditNotes` | 148.5 | `#21 path=r.0.0.1.4.0` | `userPermissions.canEditNotes` | `toggleCanEditNotes()` | 152.5 |

Row pitch = 27px (40.5 → 67.5 → 94.5 → 121.5 → 148.5). Each row is a block `<label>` with the
checkbox as its **first child**, so the text follows the box on the same line.

### 1.4 Footer buttons

* `#13 path=r.0.0.2.0` `<button type="button" class="btn btn-default" data-dismiss="modal">`
  `text: "Close"` — rect x=997.6 y=206.5 w=61.8 h=34; `padding: 6px 12px`;
  `border: 1px solid rgb(230, 233, 238)`; `border-radius: 4px`;
  `background-color: rgb(255, 255, 255)`; `text-align: center`; `white-space: nowrap`;
  `vertical-align: middle`; `cursor: pointer`; `user-select: none`.
* `#14 path=r.0.0.2.1` `<button type="button" class="btn btn-success" ng-click="saveUserPermissions()">`
  `text: "Save Changes"` — rect x=1068.3 y=206.5 w=116.8 h=34; `margin-left: 5px`;
  `padding: 6px 12px`; `border: 1px solid rgb(76, 174, 76)`; `border-radius: 4px`;
  **`background-color: rgb(92, 184, 92)`**; `color: rgb(255, 255, 255)`.

**There is no `<i>`/icon inside either button** — no child records exist under `r.0.0.2.0` or
`r.0.0.2.1` in the 22-node dump.

### 1.5 Backdrop and z-index stack

* Modal root `z-index: 1050` (`#0`).
* Every dropdown menu root `z-index: 1000` (e.g. `caps/02-…/nodes-000.txt #0 path=r`;
  `caps/08-…/DEFAULTS.txt` line 13).
* **No `.modal-backdrop` node exists in capture [01]** — the subtree is rooted at `#permissionsModal`
  and contains 22 nodes only. Backdrop styling is an honest gap (§7).

---

## 2. Dropdown catalogue — one section per capture

Shared chrome for **every** `.dropdown-menu` root in captures [02]–[18] (identical values in all of
them; cited from `caps/08-…/DEFAULTS.txt` lines 8–13, 34–57, 63, 66, 69, 71, 83, 95 and reproduced
as `style-deviations` on each root):

```
position: absolute;  z-index: 1000;  min-width: 160px;
margin-top: 2px;  padding: 5px 0;
border: 1px solid rgba(0, 0, 0, 0.15);  border-radius: 2px;
background-color: rgb(255, 255, 255);  background-clip: padding-box;
box-shadow: rgba(0, 0, 0, 0.176) 0px 6px 12px 0px;
color: rgb(51, 51, 51);  font-size: 13px;  font-weight: 400;
line-height: 18.5714px;  text-align: left;  list-style-type: none;
```

Shared item chrome: `<a href="" ng-click="…">` with `display: block` and `padding: 3px 20px`
(e.g. `caps/02-…/nodes-000.txt #11 path=r.0.0`); item `<li>` height **24.5703px**;
`cursor: pointer` on the anchors (`caps/02-…/DEFAULTS.txt` line 87).
Divider `<li class="divider">`: `height: 1px`, `margin: 9px 0`,
`background-color: rgb(229, 229, 229)`, `overflow: hidden`
(e.g. `caps/02-…/nodes-000.txt #7 path=r.6`).
Icons are FontAwesome `<i class="fa fa-…">` with `font-family: FontAwesome`, `line-height: 13px`,
`display: inline-block`, glyph delivered via `::before { content: "\f…" }`.

### [02] User-list filter / bulk-remove menu — 28 nodes, LAID OUT

`caps/02-dropdown_dropdown-menu.show/nodes-000.txt`.
Root `#0 path=r` `<ul role="menu" class="dropdown-menu show" style="display: block;">` —
**rect x=1230.7 y=451 w=200.5 h=252.1**; computed `top: 44px`, `right: -52.4297px`,
`bottom: -254.133px`, `left: 0px`. Items x=1231.7 w=198.5.

| order | li | rect y / h | label | `ng-click` | icon |
|---|---|---|---|---|---|
| 1 | `#1 r.0` | 457 / 24.6 | `Show Free Trials` (`#11 r.0.0`) | `loadUsersFT()` | **none** |
| 2 | `#2 r.1` | 481.6 / 24.6 | `Show BANNED` (`#12 r.1.0`) | `loadBannedUsers()` | `fa fa-ban` (`#20 r.1.0.0`, w=11.1) |
| 3 | `#3 r.2` | 506.1 / 24.6 | `Show Mobile` (`#13 r.2.0`) | `loadMobileUsers()` | `fa fa-mobile` (`#21 r.2.0.0`, w=5.6) |
| 4 | `#4 r.3` | 530.7 / 24.6 | `Show Non-Mobile` (`#14 r.3.0`) | `loadNonMobileUsers()` | `fa fa-mobile` (`#22 r.3.0.0`) |
| 5 | `#5 r.4` | 555.3 / 24.6 | `Show Presenters` (`#15 r.4.0`) | `loadPresentersUsers()` | `fa fa-microphone` (`#23 r.4.0.0`, w=8.4) |
| 6 | `#6 r.5` | 579.9 / 24.6 | `Marketplace Users` (`#16 r.5.0`) | `loadMarketplaceUsers()` | `fa fa-credit-card` (`#24 r.5.0.0`, w=13.9) |
| — | `#7 r.6` | 613.4 / **1** | `<li role="separator" class="divider">` | — | — |
| 7 | `#8 r.7` | 623.4 / 24.6 | `Remove non-presenters` (`#17 r.7.0`) | `clearUserList()` | `fa fa-trash-o` (`#25 r.7.0.0`, w=10.2) |
| 8 | `#9 r.8` | 648 / 24.6 | `Remove Free Trials` (`#18 r.8.0`) | `removeUsersFT()` | `fa fa-trash-o` (`#26 r.8.0.0`) |
| 9 | `#10 r.9` | 672.6 / 24.6 | `Remove All User Badges` (`#19 r.9.0`) | `removeBadgesForUsers()` | `fa fa-trash-o` (`#27 r.9.0.0`) |

The divider is the only node in this dump carrying `role="separator"` (`#7`); the dividers in every
other capture carry `class="divider"` alone.

### [03] Bulk "apply to many users" menu — 33 nodes, LAID OUT

`caps/03-dropdown_dropdown-menu.show/nodes-000.txt`.
Root `#0 path=r` `<ul role="menu" class="dropdown-menu show" style="display: block;">` —
**rect x=37 y=480.6 w=238.7 h=257.7**; computed `top: 16.5px`, `right: 137.953px`,
`bottom: -259.703px`, `left: 0px`. Items x=38 w=236.7 h=24.6, pitch 24.6, **no dividers**.

| order | li | y | label | `ng-click` | icon(s) |
|---|---|---|---|---|---|
| 1 | `#1 r.0` | 486.6 | `Remove All` (`#11 r.0.0`) | `updateManyUsers(10)` | `icon fa fa-trash` (`#21`) |
| 2 | `#2 r.1` | 511.2 | `UNBAN Participant` (`#12 r.1.0`) | `updateManyUsers(2)` | `icon fa fa-user` (`#22`) |
| 3 | `#3 r.2` | 535.8 | `Make Presenter` (`#13 r.2.0`) | `updateManyUsers(1)` | `fa fa-microphone` (`#23`) + `fa fa-desktop` (`#24`) |
| 4 | `#4 r.3` | 560.3 | `Make Admin (Non-Presenter)` (`#14 r.3.0`) | `updateManyUsers(5)` | `fa fa-cog aria-hidden="true"` (`#25`) + `fa fa-user-md` (`#26`) |
| 5 | `#5 r.4` | 584.9 | `Make Participant` (`#15 r.4.0`) | `updateManyUsers(2)` | `icon fa fa-user` (`#27`) |
| 6 | `#6 r.5` | 609.5 | `Make TRIAL user` (`#16 r.5.0`) | `updateManyUsers(6)` | `icon fa fa-user` (`#28`) |
| 7 | `#7 r.6` | 634 | `MUTE Participant` (`#17 r.6.0`) | `updateManyUsers(3)` | `fa fa-user-times` (`#29`, w=14.9) |
| 8 | `#8 r.7` | 658.6 | `BAN Participant` (`#18 r.7.0`) | `updateManyUsers(4)` | `fa fa-user-times` (`#30`) |
| 9 | `#9 r.8` | 683.2 | `Add Badge` (`#19 r.8.0`) | `updateManyUsersBadgePrompt('add')` | `icon fa fa-user` (`#31`) |
| 10 | `#10 r.9` | 707.8 | `Remove Badge` (`#20 r.9.0`) | `updateManyUsersBadgePrompt('remove')` | `icon fa fa-user` (`#32`) |

Note items 2 and 5 fire the **same** `updateManyUsers(2)` — "UNBAN Participant" and
"Make Participant" are the same role code (2) in the reference (`#12` vs `#15`).

### [04] / [09] / [14] Per-user row action menu — 128 nodes each

Roots: `caps/04-…/nodes-000.txt #0 path=r`, `caps/09-…/nodes-000.txt #0 path=r`,
`caps/14-…/nodes-000.txt #0 path=r` — all
`<ul role="menu" class="dropdown-menu dropdown-menu-right show" style="display: block;">`.

Geometry (the `dropdown-menu-right` variant computes `right: 0px`):

| capture | rect | computed top/right/bottom/left |
|---|---|---|
| [04] | **x=0 y=0 w=0 h=0** (not laid out) | `top: 100%`, `right: 0px` (no bottom/left deviation) |
| [09] | x=1416.7 **y=635** w=199.2 h=314.7 | `top: 34px`, `right: 0px`, `bottom: -316.703px`, `left: -110.508px` |
| [14] | x=1416.7 **y=697.4** w=199.2 h=314.7 | `top: 34px`, `right: 0px`, `bottom: -316.703px`, `left: -110.508px` |

Items (rects quoted from [09], x=1417.7 w=197.2 h=24.6; [14] is identical shifted +62.4px in y):

| order | li | [09] y | label / node | `ng-click` | icon(s) |
|---|---|---|---|---|---|
| 1 | `#1 r.0` `class="dropdown-submenu" ng-class="{open: submenuOpen.permissions}"` | 641 | `Permissions` (`#14 r.0.0`) | `submenuOpen.permissions=!submenuOpen.permissions; submenuOpen.granular=false; submenuOpen.app=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();` | `fa fa-shield` (`#28`) + `fa fa-caret-right pull-right` (`#29`, `float: right`, `margin-left: 3.9px`) |
| 2 | `#2 r.1` `ng-class="{open: submenuOpen.granular}"` | 665.6 | `Granular Perms` (`#16 r.1.0`) | `submenuOpen.granular=!submenuOpen.granular; …permissions=false; …app=false; …badges=false; preventDefault; stopPropagation` | `fa fa-sliders` (`#39`) + caret (`#40`) |
| 3 | `#3 r.2` `ng-class="{open: submenuOpen.app}"` | 690.1 | `App and Notifications` (`#18 r.2.0`) | `submenuOpen.app=!submenuOpen.app; …` | `fa fa-mobile` (`#53`) + caret (`#54`) |
| 4 | `#4 r.3` `ng-class="{open: submenuOpen.badges}"` | 714.7 | `Badges` (`#20 r.3.0`) | `submenuOpen.badges=!submenuOpen.badges; …` | `fa fa-certificate` (`#64`) + caret (`#65`) |
| — | `#5 r.4 class="divider"` | 748.3 (h=1) | — | — | — |
| 5 | `#6 r.5` | 758.3 | `Set Note` (`#22 r.5.0`) | `setNoteUser(user._id,user.userName,$index)` | `fa fa-pencil-square-o` (`#66`) |
| 6 | `#7 r.6` | 782.9 | `Edit Username` (`#23 r.6.0`) | `editUsername(user._id, user.userName)` | `fa fa-edit` (`#67`) |
| 7 | `#8 r.7` | 807.4 | `Remove User` (`#24 r.7.0`) | `deleteParticipant(user.userName,user._id,$index)` | `fa fa-trash` (`#68`) |
| — | `#9 r.8 class="divider"` | 841 (h=1) | — | — | — |
| 8 | `#10 r.9` | 851 | `Set/Change Password` (`#25 r.9.0`) | `setUserPW(user._id,user.userName,$index)` | `fa fa-lock` (`#69`) |
| 9 | `#11 r.10` | 875.6 | `Resend Welcome Email` (`#26 r.10.0`) | `sendWelcomeEmail(user._id,user.userName,$index)` | `fa fa-envelope` (`#70`) |
| — | `#12 r.11 class="divider"` | 909.1 (h=1) | — | — | — |
| 10 | `#13 r.12` | 919.1 | `Pause / Pending` (`#27 r.12.0`) | `approveUser(user.userName,user._id,$index,'pending')` | `fa fa-pause` (`#71`) |

The four submenu `<ul class="dropdown-menu">` (`#15 r.0.1`, `#17 r.1.1`, `#19 r.2.1`, `#21 r.3.1`)
are present but `display: none` in all three captures; `r.3.1` (**Badges**) has **no child records
at all** in any of [04]/[09]/[14] — the badges submenu is empty (see §5).

### [05] / [10] / [15] "Permissions" submenu (= `r.0.1` of the row menu) — 28 nodes

`caps/05-…/nodes-000.txt` (identical semantics in [10], [15] — proven in §4). Root `#0 path=r`
`<ul class="dropdown-menu show" style="display: block;">`, all rects 0×0 (forced open, never laid out).

| order | li | label | `ng-click` | icon(s) |
|---|---|---|---|---|
| 1 | `#1 r.0` | `Make Presenter` (`#10 r.0.0`) | `updateUser(1,user._id,user.userName,$index)` | `fa fa-microphone` (`#18`) + `fa fa-desktop` (`#19`) |
| 2 | `#2 r.1` | `Make Admin` (`#11 r.1.0`) | `updateUser(5,…)` | `fa fa-cog aria-hidden="true"` (`#20`) + `fa fa-user-md` (`#21`) |
| 3 | `#3 r.2` | `Make Participant` (`#12 r.2.0`) | `updateUser(2,…)` | `fa fa-user` (`#22`) |
| 4 | `#4 r.3` | `Make Trial` (`#13 r.3.0`) | `updateUser(6,…)` | `fa fa-user` (`#23`) |
| 5 | `#5 r.4` | `MUTE Participant` (`#14 r.4.0`) | `updateUser(3,…)` | `fa fa-user-times` (`#24`) |
| 6 | `#6 r.5` | `BAN` (`#15 r.5.0`) | `updateUser(4,…)` | `fa fa-user-times` (`#25`) |
| — | `#7 r.6 class="divider"` | — | — | — |
| 7 | `#8 r.7` | `Unban` (`#16 r.7.0`) | `updateUser(2,…)` | `fa fa-user` (`#26`) |
| 8 | `#9 r.8` | `Freshen Login Date` (`#17 r.8.0`) | `updateUser(9,…)` | `fa fa-clock-o` (`#27`) |

### [06] / [11] / [16] "Granular Perms" submenu (= `r.1.1`) — 30 nodes

`caps/06-…/nodes-000.txt`. Root `#0 path=r` as above; rects 0×0.

| order | li | conditional | label | `ng-click` | icon |
|---|---|---|---|---|---|
| 1 | `#1 r.0` | `ng-show="user.role !== 1"` | `Adjust Mic/Cam/Screen/Chat/Notes` (`#13 r.0.0`) | `setPermissions(user)` **+ `data-toggle="modal"` `data-target="#permissionsModal"`** | **none** |
| — | `#2 r.1 class="divider"` | — | — | — | — |
| 2 | `#3 r.2` | — | `Show User Count` (`#14 r.2.0`) | `updateUser(8,…)` | `fa fa-user-circle` (`#22`) |
| 3 | `#4 r.3` | — | `Hide User Count` (`#15 r.3.0`) | `updateUser(7,…)` | `fa fa-user-circle` (`#23`) |
| 4 | `#5 r.4` | `ng-show="!user.denyArchivesAccess"` | `Deny Archives Access` (`#16 r.4.0`) | `updateUser(13,…)` | `fa fa-hdd-o` (`#24`) |
| 5 | `#6 r.5` | `ng-show="user.denyArchivesAccess"` **+ `class="ng-hide"`, `display: none`** | `Allow Archives Access` (`#17 r.5.0`) | `updateUser(14,…)` | `fa fa-hdd-o` (`#25`) |
| 6 | `#7 r.6` | — | `Hide Pers User Data` (`#18 r.6.0`) | `updateUser(10,…)` | `fa fa-lock` (`#26`) |
| 7 | `#8 r.7` | — | `Don't Hide Pers User Data` (`#19 r.7.0`) | `updateUser(11,…)` | `fa fa-user` (`#27`) |
| — | `#9 r.8 class="divider"` | — | — | — | — |
| 8 | `#10 r.9` | — | `Disallow User2User PM` (`#20 r.9.0`) | `setUserRestrictPM(true,user._id,user.userName)` | `fa fa-comment-o` (`#28`) |
| 9 | `#11 r.10` | — | `Allow User2User PM` (`#21 r.10.0`) | `setUserRestrictPM(false,user._id,user.userName)` | `fa fa-comment-o` (`#29`) |
| — | `#12 r.11 class="divider"` | — | — | — | — |

Items 4/5 and 8/9 are mutually-exclusive toggle pairs; `r.11` is a **trailing** divider with nothing
after it (there is no `r.12` record) — a stray separator in the reference markup, reproduce as-is.
**This is the menu item that opens the capture-[01] modal** (`data-target="#permissionsModal"`).

### [07] / [12] / [17] "App and Notifications" submenu (= `r.2.1`) — 31 nodes

`caps/07-…/nodes-000.txt`. Root `#0 path=r` as above; rects 0×0.

| order | li | label | `ng-click` | icon(s) |
|---|---|---|---|---|
| 1 | `#1 r.0` | `Get App PIN` (`#10 r.0.0`) | `getAppPin(user.email,user.userName,$index)` | `fa fa-mobile` (`#18`) |
| 2 | `#2 r.1` | `Show App Tokens` (`#11 r.1.0`) | `showAlerterAppTokens(user.userName,user.alerterAppTokens)` | `fa fa-mobile` (`#19`) |
| 3 | `#3 r.2` | `Get FCM Tokens` (`#12 r.2.0`) | `getFCMTokens(user._id,user.userName,$index)` | `fa fa-mobile aria-hidden="true"` (`#20`) |
| — | `#4 r.3 class="divider"` | — | — | — |
| 4 | `#5 r.4` | `PAUSE Mobile Notifs` (`#13 r.4.0`) | `pauseUserNotifs(user._id,user.userName,$index,'pause')` | `fa fa-mobile` (`#21`) + `fa fa fa-bell-o` (`#22`) |
| 5 | `#6 r.5` | `RESUME Mobile Notifs` (`#14 r.5.0`) | `pauseUserNotifs(…,'resume')` | `fa fa-mobile` (`#23`) + `fa fa-play` (`#24`) |
| 6 | `#7 r.6` | `Remove Mobile Notifs` (`#15 r.6.0`) | `pauseUserNotifs(…,'unsub')` | `fa fa-mobile` (`#25`) + `fa fa-trash` (`#26`) |
| 7 | `#8 r.7` | `Send Test Mobile Notifs` (`#16 r.7.0`) | `sendTestFCM(user._id,user.userName,$index)` | `fa fa-mobile` (`#27`) + `fa fa fa-bell-o` (`#28`) |
| 8 | `#9 r.8` | `Reset Mobile Notifs` (`#17 r.8.0`) | `resetFCMForuser(user._id,user.userName,$index)` | `fa fa-mobile` (`#29`) + `fa fa-reload` (`#30`) |

Two class strings in the reference are malformed and must be copied verbatim if matching the DOM:
`class="fa fa fa-bell-o"` (duplicated `fa`, `#22`/`#28`) and `class="fa fa-reload"` (`#30`) —
**`fa-reload` is not a FontAwesome 4 class**, so that glyph renders blank. Consistent with `#30`
being the only icon record in [07] with **no `::before` line** at all (compare `#29`, which has one).
Same for `fa fa-user-circle` in [06] `#22`/`#23` — no `::before` captured either.

### [08] / [13] / [18] — 1 node each

See §5.

---

## 3. Which trigger owns each dropdown

**Hard limitation first:** every subtree capture is re-rooted at `path=r`
(`caps/02-…/nodes-000.txt #0 path=r`, `caps/09-…/nodes-000.txt #0 path=r`, …). The root path
therefore carries **no** information about the menu's location in the baseline DOM. Mapping menus to
baseline trigger elements requires capture [00] `baseline-room` (2156 nodes), which is **not in my
slice**. What follows is derived strictly from attributes and Angular scope expressions **inside my
own files**, and is labelled by confidence.

| capture | owning trigger — evidence | confidence |
|---|---|---|
| [02] | Handlers are list-scope, not user-scope: `loadUsersFT()`, `loadBannedUsers()`, `loadMobileUsers()`, `loadNonMobileUsers()`, `loadPresentersUsers()`, `loadMarketplaceUsers()`, `clearUserList()`, `removeUsersFT()`, `removeBadgesForUsers()` (`caps/02-…/nodes-000.txt #11–#19`). No `user.` or `$index` reference anywhere in the capture. It is laid out at x=1230.7 y=451, i.e. a menu hanging off a control on the right-hand side of the page at y≈451−44=407 (root `top: 44px`). → a **user-list toolbar / "Show…" filter button**. | High that it is list-scoped; the exact button element is **unverified** (needs [00]). |
| [03] | Every handler is `updateManyUsers(n)` / `updateManyUsersBadgePrompt('add'\|'remove')` (`#11–#20`) — bulk operations over a selection. Laid out at x=37 y=480.6, i.e. far **left** of the page, `top: 16.5px` under its trigger. → a **bulk-action ("apply to selected") button on the left column**. | High that it is bulk-scoped; exact element unverified. |
| [04]/[09]/[14] | Every handler passes `user._id, user.userName, $index` (`#22`–`#27`) and the root carries `dropdown-menu-right` → right-aligned to its trigger. `right: 0px`, `top: 34px`, item width 197.2 → a compact 34px-tall trigger. → the **per-row overflow/gear button in a user/participant list row** (one instance per `ng-repeat` row). | High. |
| [05]–[08], [10]–[13], [15]–[18] | Each is one of the four `<ul class="dropdown-menu">` children of the row menu — proven structurally: [05] item list ≡ `r.0.1.*` of [04] (`caps/04-…/nodes-000.txt #72–#79` + `#97–#106` vs `caps/05-…/nodes-000.txt #10–#17` + `#18–#27`); [06] ≡ `r.1.1.*` (`#80–#88`, `#107–#114`); [07] ≡ `r.2.1.*` (`#89–#96`, `#115–#127`); [08] ≡ `r.3.1` (childless). Their triggers are the four `dropdown-submenu` anchors `Permissions` / `Granular Perms` / `App and Notifications` / `Badges` (`caps/04-…/nodes-000.txt #14, #16, #18, #20`), driven by `submenuOpen.permissions/granular/app/badges`. | **Proven** from within my slice. |

---

## 4. The repeat structure — three groups of (128, 28, 30, 31, 1)

**Answer: three DIFFERENT DOM elements — three different rows of the same `ng-repeat`, showing
three different users — not one element captured three times.**

### 4.1 Evidence table

| evidence | group 1 ([04]–[08]) | group 2 ([09]–[13]) | group 3 ([14]–[18]) |
|---|---|---|---|
| parent root rect | `x=0 y=0 w=0 h=0` (`caps/04-…/nodes-000.txt #0`) | `x=1416.7 **y=635** w=199.2 h=314.7` (`caps/09-…/nodes-000.txt #0`) | `x=1416.7 **y=697.4** w=199.2 h=314.7` (`caps/14-…/nodes-000.txt #0`) |
| parent computed offsets | `top: 100%`, `right: 0px` | `top: 34px`, `right: 0px`, `bottom: -316.703px`, `left: -110.508px` | identical to group 2 |
| **`r.1.1.0` (`ng-show="user.role !== 1"`)** | `attr ng-show = "user.role !== 1"` only, **visible** (`caps/04-…/nodes-000.txt #41`) | same, **visible** (`caps/09-…/nodes-000.txt #41`) | **`attr class = "ng-hide"` + `display: none`** (`caps/14-…/nodes-000.txt #41`) |
| same fact in the standalone submenu | `caps/06-…/nodes-000.txt #1 path=r.0` — no `ng-hide` | `caps/11-…/nodes-000.txt #1 path=r.0` — no `ng-hide` | `caps/16-…/nodes-000.txt #1 path=r.0` — **`class="ng-hide"`, `display: none`** |
| `DEFAULTS.txt` `display\|list-item` count | 42/128 (`caps/04-…/DEFAULTS.txt` line 6) | 42/128 (`caps/09-…/DEFAULTS.txt` line 6) | **41/128** (`caps/14-…/DEFAULTS.txt` line 6) |
| capture timestamps | 18.641 → 18.898 | 18.968 → 19.224 | 19.294 → 19.550 (`00-META.txt` lines 17–31) |
| node counts | 128, 28, 30, 31, 1 | 128, 28, 30, 31, 1 | 128, 28, 30, 31, 1 |

### 4.2 Machine-verified diff (attributes + text only, rects/styles ignored)

Signature = all `#index path=`, `attr` and `text` lines of each capture, concatenated across its
`nodes-*.txt` parts:

```
04 vs 09 :  (no differences)          342 lines each
09 vs 14 :  110a111 >   attr class = "ng-hide"      (14 has 343 lines)
04 vs 14 :  110a111 >   attr class = "ng-hide"
05 vs 10 :  (none)      10 vs 15 : (none)
06 vs 11 :  (none)      11 vs 16 : 5a6 >   attr class = "ng-hide"
07 vs 12 :  (none)      12 vs 17 : (none)
08 vs 13 :  (none)      13 vs 18 : (none)
```

That single added line is node `#41 path=r.1.1.0` in [14] and node `#1 path=r.0` in [16] — the
`Adjust Mic/Cam/Screen/Chat/Notes` item guarded by `ng-show="user.role !== 1"`.

### 4.3 Conclusion

* The **template** behind all three groups is one and the same (identical labels, order, icons,
  handlers, dividers — zero diffs apart from the one node).
* The **instances** are three distinct elements bound to three distinct `user` objects:
  * group 3's user has `user.role === 1` (a Presenter) → `Adjust Mic/Cam/Screen/Chat/Notes` is
    `ng-hide`-den;
  * groups 1 and 2's users have `user.role !== 1` → that item is shown.
  * groups 2 and 3 are laid out **62.4 px apart vertically** (y=635 vs y=697.4) at the same x —
    exactly the pitch of consecutive rows in a list.
  * group 1 was not laid out at all (all rects 0×0) — its row's `.dropdown` ancestor was not
    rendered/positioned at capture time.
* All three users share `!user.denyArchivesAccess` (the `Allow Archives Access` item is `ng-hide`
  in [06] `#6`, [11] `#6`, [16] `#6`).

**Rebuild implication: implement ONE menu component, rendered per row, with the `role !== 1` guard
on the Adjust-permissions item.** Do not build three menus.

---

## 5. The three 1-node captures [08], [13], [18]

All three contain exactly one node and are byte-identical to each other
(`caps/08-…/nodes-000.txt`, `caps/13-…/nodes-000.txt`, `caps/18-…/nodes-000.txt`, plus identical
`DEFAULTS.txt`):

```
#0 path=r <ul>
  rect: x=0 y=0 w=0 h=0
  attr class = "dropdown-menu show"
  attr style = "display: block;"
  style-deviations (0; all other props == COMMON in DEFAULTS.txt):
```

**They are empty menus, not capture failures.** Evidence:

1. `INFO.txt` line 5 in each: `node count : 1 (declared 1, truncated=false)` — the harness declared
   1 node and did not truncate. Same in `00-META.txt` lines 21, 26, 31 (`truncated=false`).
2. The corresponding element inside the parent capture also has zero children: `r.3.1`
   (`caps/04-…/nodes-000.txt #21`, `caps/09-…/#21`, `caps/14-…/#21`) is a
   `<ul class="dropdown-menu">` with no `r.3.1.*` records anywhere in the 128-node dumps.
3. Position in the capture sequence (5th of each group of five, `00-META.txt`) matches the 4th
   submenu, **Badges** (`caps/04-…/nodes-000.txt #20 path=r.3.0`,
   `ng-click="submenuOpen.badges=!…"`, icon `fa fa-certificate`).

So: **the Badges submenu of the per-user row menu renders zero items** for all three users — the
badge list (presumably an `ng-repeat` over configured room badges) is empty in this session.
A rebuild should render the "Badges ▸" parent item and an empty submenu (or hide it) — it must
**not** invent badge entries.

One honest inconsistency: the root reports `rect 0×0` while its own computed style says
`min-width: 160px`, `padding: 5px 0`, `border: 1px` — an actually-laid-out empty menu would be
≥160×12. The element was therefore not laid out when measured (an ancestor was `display: none`),
same as everything else in group 1. Reported as captured; not explained away.

---

## 6. Deduplicated menu catalogue — what the rebuild implements

**5 genuinely distinct menus + 1 modal.** (17 dropdown captures → 5 unique, because the row menu
and its 4 submenus were each captured 3×, once per user row.)

| # | menu | source captures | items | opens from |
|---|---|---|---|---|
| **M1** | User-list filter / bulk-remove | [02] | 9 items + 1 divider after item 6 | list toolbar button (element unverified) |
| **M2** | Bulk "apply to many users" | [03] | 10 items, no dividers | bulk-action button (element unverified) |
| **M3** | Per-user row actions (`dropdown-menu-right`) | [04], [09], [14] | 4 submenu parents + 6 leaf items + 3 dividers | per-row overflow button |
| **M3.a** | ↳ Permissions | [05], [10], [15] | 8 items + 1 divider | M3 item 1 (`fa fa-shield`) |
| **M3.b** | ↳ Granular Perms | [06], [11], [16] | 9 items + 3 dividers (one trailing) | M3 item 2 (`fa fa-sliders`) |
| **M3.c** | ↳ App and Notifications | [07], [12], [17] | 8 items + 1 divider | M3 item 3 (`fa fa-mobile`) |
| **M3.d** | ↳ Badges | [08], [13], [18] | **0 items (empty)** | M3 item 4 (`fa fa-certificate`) |
| **D1** | `#permissionsModal` dialog | [01] | 5 checkboxes + 2 buttons + close × | M3.b item 1 (`data-target="#permissionsModal"`) |

Full item lists with labels, order, icons and handlers: M1 → §2 [02]; M2 → §2 [03];
M3 → §2 [04]/[09]/[14]; M3.a → §2 [05]; M3.b → §2 [06]; M3.c → §2 [07]; M3.d → §5; D1 → §1.

Conditionals the rebuild must honour (all cited above):
* `user.role !== 1` gates `Adjust Mic/Cam/Screen/Chat/Notes` (M3.b item 1).
* `!user.denyArchivesAccess` / `user.denyArchivesAccess` swap `Deny Archives Access` ↔
  `Allow Archives Access` (M3.b items 4/5).
* `submenuOpen.{permissions,granular,app,badges}` — opening one closes the other three, and the
  handler calls `$event.preventDefault(); $event.stopPropagation();`
  (`caps/04-…/nodes-000.txt #14, #16, #18, #20`).

Role-code mapping observable from the handlers (`updateUser(n,…)` / `updateManyUsers(n)`):
1 = Presenter, 2 = Participant / Unban, 3 = Mute, 4 = Ban, 5 = Admin, 6 = Trial, 7 = hide user count,
8 = show user count, 9 = freshen login date, 10 = hide personal data (**and** `updateManyUsers(10)` =
"Remove All"), 11 = don't hide personal data, 13 = deny archives, 14 = allow archives. Note code 10
means two different things in the two APIs (`caps/03-…/nodes-000.txt #11` vs
`caps/06-…/nodes-000.txt #18`) — flagged, not resolved.

---

## 7. Honest gaps

1. **Trigger elements are not identifiable from my slice.** All subtrees are re-rooted at `path=r`
   (`#0 path=r` in every capture), so the assignment of M1 and M2 to specific baseline buttons is
   *inferred from handler names and absolute position only*, not proven. Confirming it requires
   capture [00] `baseline-room` (2156 nodes) — another agent's file.
2. **No `.modal-backdrop`.** Capture [01] contains only the 22 nodes under `#permissionsModal`;
   backdrop colour/opacity/z-index are absent from this dump.
3. **Modal captured mid-transition** — `opacity: 0` and `transform: translateY(-82.1777px)`
   (`caps/01-…/nodes-000.txt #0`, `#1`). The resting geometry stated in §1.1 is derived arithmetically
   from `margin-top: 30px` minus the translate; no resting-state screenshot exists in the dump.
4. **Modal title's username is empty.** `#16 path=r.0.0.0.1#permissionsModalLabel.0`
   `<i class="ng-binding">` has `w=0` and no `text:` — the actual user name shown in the reference is
   **not recorded**. Do not fabricate one; render the binding slot empty or from real data.
5. **Checkbox checked state unknown.** All five inputs are `ng-pristine ng-untouched ng-valid`
   (`#17`–`#21`); the dump records no `checked` attribute or `:checked` state, so the reference
   on/off values of hasMic/hasScreen/hasCam/hasAdminChat/canEditNotes cannot be asserted.
6. **Group-1 geometry missing.** Every rect in [04]–[08] is `0×0`; likewise all forced-open submenu
   captures ([05]–[08], [10]–[13], [15]–[18]) and the empty menus of §5. Usable menu geometry exists
   only for [02], [03], [09], [14].
7. **Hover/active/focus states absent.** Only the resting computed style is captured; no
   `.dropdown-menu > li > a:hover` background is recorded anywhere in captures [01]–[18].
8. **Two malformed FontAwesome classes** — `fa fa fa-bell-o` and `fa fa-reload`
   (`caps/07-…/nodes-000.txt #22, #28, #30`) — plus `fa fa-user-circle`
   (`caps/06-…/nodes-000.txt #22, #23`) have **no `::before` content captured**, so those three
   glyphs are blank/undefined in the reference. Whether that is a reference bug or a capture gap
   cannot be determined from this slice.
9. **Which users the three rows belong to is unknown.** The row menus reference `user._id`,
   `user.userName`, `$index` as *unevaluated Angular expressions*; no user names, ids or `$index`
   values appear in captures [04]–[18]. Only `user.role === 1` for group 3 and `role !== 1` for
   groups 1–2 is provable.
10. **No truncation anywhere.** All 18 `INFO.txt` files report `truncated=false`; no text in this
    slice was cut off.

---

## Verification

Every file in `caps/01` … `caps/18` was read in full, in this agent's own context, record by record.
No reading was delegated. No file outside my slice was read except the shared `00-META.txt`.

| dir | INFO | DEFAULTS | nodes files | declared nodes | records read | lines |
|---|---|---|---|---|---|---|
| `caps/01-modal_permissionsModal` | ✓ | ✓ | `nodes-000.txt` | 22 | #0–#21 (22/22) | 9+100+407 = 516 |
| `caps/02-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 28 | #0–#27 (28/28) | 9+100+324 = 433 |
| `caps/03-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 33 | #0–#32 (33/33) | 9+100+376 = 485 |
| `caps/04-dropdown_dropdown-menu.dropdown-menu-right.show` | ✓ | ✓ | `nodes-000.txt`, `nodes-001.txt` | 128 | #0–#119, #120–#127 (128/128) | 9+100+1302+77 = 1488 |
| `caps/05-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 28 | #0–#27 (28/28) | 9+100+293 = 402 |
| `caps/06-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 30 | #0–#29 (30/30) | 9+100+322 = 431 |
| `caps/07-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 31 | #0–#30 (31/31) | 9+100+321 = 430 |
| `caps/08-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 1 | #0 (1/1) | 9+100+8 = 117 |
| `caps/09-dropdown_dropdown-menu.dropdown-menu-right.show` | ✓ | ✓ | `nodes-000.txt`, `nodes-001.txt` | 128 | #0–#119, #120–#127 (128/128) | 9+100+1407+77 = 1593 |
| `caps/10-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 28 | #0–#27 (28/28) | 9+100+293 = 402 |
| `caps/11-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 30 | #0–#29 (30/30) | 9+100+322 = 431 |
| `caps/12-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 31 | #0–#30 (31/31) | 9+100+321 = 430 |
| `caps/13-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 1 | #0 (1/1) | 9+100+8 = 117 |
| `caps/14-dropdown_dropdown-menu.dropdown-menu-right.show` | ✓ | ✓ | `nodes-000.txt`, `nodes-001.txt` | 128 | #0–#119, #120–#127 (128/128) | 9+100+1409+77 = 1595 |
| `caps/15-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 28 | #0–#27 (28/28) | 9+100+293 = 402 |
| `caps/16-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 30 | #0–#29 (30/30) | 9+100+324 = 433 |
| `caps/17-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 31 | #0–#30 (31/31) | 9+100+321 = 430 |
| `caps/18-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 1 | #0 (1/1) | 9+100+8 = 117 |

* **Directories: 18/18.** **Files: 60/60** (18 `INFO.txt` + 18 `DEFAULTS.txt` + 24 `nodes-*.txt`).
* **Lines read: 10,252** across those 60 files, plus `00-META.txt` (77 lines) = **10,329**.
* **Node records read: 815/815** (22+28+33+128+28+30+31+1+128+28+30+31+1+128+28+30+31+1), i.e. every
  record in every capture in my slice. `INFO.txt` line 5 of each directory confirms
  `truncated=false`, so 815 is the complete population.
* Cross-group identity claims in §4 were additionally machine-checked with `diff` over
  attribute/text signatures extracted from the same files I read; results reproduced verbatim in §4.2.
* **Not read (outside my slice, by instruction):** `caps/00-baseline-room/`,
  `caps/19-forced-darkTheme/`, `caps/20-forced-lightTheme/`, `caps/21-final-room/`,
  `01-stylesheets/`, and the 23 MB `evidence-dumps/NEXT-STEP/ptr1.json` source.

---

# PART: ptr1-parts/05-css-meta-themes.md

# ptr1 — Part 05: CSS, metadata, and the theme verdict

Decode of `evidence-dumps/NEXT-STEP/ptr1.json` (23,535,138 bytes, `00-META.txt:2`), slice = dump metadata,
all 15 stylesheets, the page-wide COMMON computed-style table, and the three diff captures
(19 forced-darkTheme / 20 forced-lightTheme / 21 final-room).

Every citation below is `<file>:<line>` relative to `/tmp/ptr-decode/ptr1/`.
Nothing here is inferred from memory or from a sibling page; where a fact is not in my files
I say so under **Honest gaps**.

---

## 1. Dump metadata

| Field | Value | Locator |
|---|---|---|
| source | `evidence-dumps/NEXT-STEP/ptr1.json` | `00-META.txt:1` |
| bytes | 23,535,138 | `00-META.txt:2` |
| dump.part | 1 | `00-META.txt:3` |
| capture count | 23 | `00-META.txt:4` |
| meta.capturedAt | `2026-07-24T15:59:21.704Z` | `00-META.txt:5` |
| meta.url | `https://protradingroom.com/ptrApp#/page/manageSession/6a628a99731b9f77ae9bf505` | `00-META.txt:6` |
| meta.ua | `Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36` | `00-META.txt:7` |
| meta.role | `member` | `00-META.txt:8` |
| meta.viewport | `{"w":1842,"h":1265,"dpr":2}` | `00-META.txt:9` |
| meta.errors | `[]` (empty — no capture errors reported) | `00-META.txt:10` |

**Note on the UA vs the viewport.** The UA string is an Android/Pixel 9 *mobile* UA
(`00-META.txt:7`) while the viewport is 1842×1265 @dpr2 (`00-META.txt:9`) — i.e. a desktop-width
window driven by a spoofed mobile UA. Every capture carries the identical viewport
(`00-META.txt:13`–`34`), so the whole dump is one layout at 1842 CSS px. At 1842px every
breakpoint in the sheets is in its widest state (all `min-width: 768/992/1200` blocks active,
all `max-width: 479/767/991` blocks inactive) — see §3.5.

### Capture index (verbatim from `00-META.txt:13`–`35`)

| # | kind | label | ts (2026-07-24) | nodes | trunc | themeClass |
|---|---|---|---|---|---|---|
| 00 | fullDom | baseline-room | 15:59:18.276Z | 2156 | false | `footer-hidden` |
| 01 | subtree | modal:permissionsModal | 15:59:18.443Z | 22 | false | `footer-hidden` |
| 02 | subtree | dropdown:dropdown-menu.show | 15:59:18.507Z | 28 | false | `footer-hidden` |
| 03 | subtree | dropdown:dropdown-menu.show | 15:59:18.570Z | 33 | false | `footer-hidden` |
| 04 | subtree | dropdown:dropdown-menu.dropdown-menu-right.show | 15:59:18.641Z | 128 | false | `footer-hidden` |
| 05 | subtree | dropdown:dropdown-menu.show | 15:59:18.706Z | 28 | false | `footer-hidden` |
| 06 | subtree | dropdown:dropdown-menu.show | 15:59:18.771Z | 30 | false | `footer-hidden` |
| 07 | subtree | dropdown:dropdown-menu.show | 15:59:18.836Z | 31 | false | `footer-hidden` |
| 08 | subtree | dropdown:dropdown-menu.show | 15:59:18.898Z | 1 | false | `footer-hidden` |
| 09 | subtree | dropdown:dropdown-menu.dropdown-menu-right.show | 15:59:18.968Z | 128 | false | `footer-hidden` |
| 10 | subtree | dropdown:dropdown-menu.show | 15:59:19.032Z | 28 | false | `footer-hidden` |
| 11 | subtree | dropdown:dropdown-menu.show | 15:59:19.097Z | 30 | false | `footer-hidden` |
| 12 | subtree | dropdown:dropdown-menu.show | 15:59:19.162Z | 31 | false | `footer-hidden` |
| 13 | subtree | dropdown:dropdown-menu.show | 15:59:19.224Z | 1 | false | `footer-hidden` |
| 14 | subtree | dropdown:dropdown-menu.dropdown-menu-right.show | 15:59:19.294Z | 128 | false | `footer-hidden` |
| 15 | subtree | dropdown:dropdown-menu.show | 15:59:19.359Z | 28 | false | `footer-hidden` |
| 16 | subtree | dropdown:dropdown-menu.show | 15:59:19.423Z | 30 | false | `footer-hidden` |
| 17 | subtree | dropdown:dropdown-menu.show | 15:59:19.487Z | 31 | false | `footer-hidden` |
| 18 | subtree | dropdown:dropdown-menu.show | 15:59:19.550Z | 1 | false | `footer-hidden` |
| 19 | fullDom | forced-darkTheme | 15:59:20.397Z | 2156 | false | `footer-hidden darkTheme` |
| 20 | fullDom | forced-lightTheme | 15:59:21.244Z | 2156 | false | `footer-hidden lightTheme` |
| 21 | fullDom | final-room | 15:59:21.690Z | 2156 | false | `footer-hidden` |
| 22 | meta | `__meta__` | — | — | — | `null` |

**Wall-clock span, first→last capture:** `15:59:18.276Z` → `15:59:21.690Z` = **3.414 s**
(`00-META.txt:13` vs `00-META.txt:34`). `meta.capturedAt` (`15:59:21.704Z`, `00-META.txt:5`)
is 14 ms after the final capture, so the whole dump was produced in **3.428 s**.

Observation worth flagging to the DOM agents: captures 02–08, 10–13(+14–18) repeat the same
node-count fingerprint three times (`28, 30/33, 31, 1, 128`) — the harness swept the same
dropdown set three times (`00-META.txt:15`–`31`, `02-MANIFEST.txt:6`–`22`).
Capture 08/13/18 have **nodes=1** — a `.dropdown-menu.show` that contained nothing.

`02-MANIFEST.txt` restates the same per-capture inventory plus node-file counts; it confirms
19 and 20 are `mode=diff nodeFiles=1` and 21 is `mode=diff nodeFiles=0`
(`02-MANIFEST.txt:23`–`25`).

---

## 2. Stylesheet inventory — 15 sheets, 4,498 rules, 434,385 bytes of CSS text

Byte/rule counts are the capture's own figures (`00-META.txt:62`–`76`); "file lines" is the
decoded file on disk (one rule per line, `@media`/`@keyframes` expanded).

| # | href | rules | bytes | file lines | Owner | Governs |
|---|---|---|---|---|---|---|
| 00 | *(inline)* | 2 | 78 | 2 | vendor (video.js shim) | `.video-js` 300×150 default box, `.vjs-fluid` 56.25% padding-top (`00.css:2`–`3`) |
| 01 | *(inline)* | 2 | 169 | 2 | vendor (AngularJS) | `[ng-cloak]`/`.ng-hide` → `display:none!important`; `ng:form{display:block}` (`01.css:2`–`3`) |
| 02 | `/public/app/css/bootstrap.min.css` | 1187 | 134,760 | 1577 | **vendor, self-hosted** | Bootstrap 3.x: normalize, Glyphicons, 12-col grid, forms, buttons, nav/navbar, dropdown, modal, tooltip/popover, carousel, responsive utilities |
| 03 | `https://vjs.zencdn.net/7.3.0/video-js.min.css` | **0** | 12 | 2 | vendor | **CORS-BLOCKED** — `03.css:2` literally reads `CORS-BLOCKED`. Honest gap. |
| 04 | `/public/vendor/angularjs-color-picker/angularjs-color-picker.min.css` | 48 | 30,377 | 49 | vendor | Colour-picker panel/grid/slider; 2 big base64 PNG gradients (`04.css:26`, `04.css:41`) |
| 05 | `…/angularjs-color-picker-bootstrap.min.css` | 3 | 254 | 4 | vendor | 3 bootstrap-bridge rules (`05.css:2`–`4`) |
| 06 | `/public/vendor/angular-xeditable/dist/css/xeditable.min.css` | 23 | 2,643 | 32 | vendor | Inline-edit widgets, `.editable-*`, `.popover-wrapper` |
| 07 | `cdnjs…/angularjs-toaster/2.2.0/toaster.min.css` | **0** | 12 | 2 | vendor | **CORS-BLOCKED** — `07.css:2` reads `CORS-BLOCKED`. Honest gap. |
| 08 | `/public/vendor/textAngular/src/textAngular.css` | 26 | 3,412 | 27 | vendor | Rich-text editor + a second full `.popover` implementation (`08.css:16`–`27`) |
| 09 | **`/public/app/css/styles.css`** | 2290 | 195,160 | 2574 | **THE APP** | Everything below in §3–§4 |
| 10 | `/public/vendor/font-awesome/css/font-awesome.min.css` | 551 | 24,767 | 557 | vendor | Font Awesome **4.3.0** (version literal at `10.css:2`) — 1 `@font-face` + 517 glyph rules |
| 11 | `/public/vendor/feather/webfont/feather-webfont/feather.css` | 135 | 5,946 | 136 | vendor | Feather icon webfont, `.icon-*` (`11.css:2`–`136`) |
| 12 | `/public/vendor/animate.css/animate.min.css` | 226 | 36,536 | 790 | vendor | animate.css keyframe library (bounce/fade/flip/rotate/slide/zoom/hinge/roll/lightSpeed) |
| 13 | *(inline)* | 4 | 235 | 4 | vendor (videojs-youtube) | `.vjs-youtube*` iframe-blocker/poster rules (`13.css:2`–`5`) |
| 14 | *(inline)* | 1 | 24 | 1 | **app** | `body { overflow: auto; }` (`14.css:2`) — **last sheet wins**, overriding `09.css:95` `body{overflow:hidden}` |

**App-authored CSS = sheet 09 (195,160 B) + inline sheet 14 (24 B).** Everything else is vendor.
Sheet 02, though served from `protradingroom.com`, is verbatim Bootstrap (normalize block
`02.css:2`–`40`, glyphicon map `02.css:60`–`323`, `.col-xs/sm/md/lg-*` grid `02.css:433`–`647`).

### 2a. `styles.css` is shipped TWICE, concatenated

Hard evidence, not a guess: line 2 and line 1273 are byte-identical
(`09.css:2` == `09.css:1273`, both the `.glyphicon{…FontAwesome…}` override), and
`diff <(sed -n '2,1272p' 09.css) <(sed -n '1273,2574p' 09.css)` returns exactly three hunks:

- **Copy A** = `09.css:2`–`1272` (1,271 rules).
- **Copy B** = `09.css:1273`–`2574` (1,302 rules).
- Copy B **drops** `.thumb20` and drops `margin-right:5px` from `.thumb16`
  (`09.css:1048`–`1049` vs `09.css:2319`).
- Copy B **appends 32 new rules** at `09.css:2543`–`2574` that exist nowhere in copy A —
  and these are *precisely the trading-room rules* (`.roomArea`, `.alertsChatArea`,
  `.webcamScreenVideo`, `#permissionsModal`, badge/chat-tab rules).

Consequence for the rebuild: **copy B wins** (later in the sheet, equal specificity).
So the live cascade is: `.thumb16` has **no** `margin-right`, `.thumb20` **does not exist**,
and the 32 room rules at `09.css:2543`–`2574` are live. Everything else is identical in both
copies, so citations below use copy-A line numbers; add **+1271** for the copy-B twin.
(Uniqueness check: 2,573 non-header lines, only 1,224 distinct.)

---

## 3. The design system, extracted from the CSS

### 3.1 Root typography (Bootstrap base, unchanged by the app)

```
02.css:326   html { font-size: 10px; -webkit-tap-highlight-color: rgba(0,0,0,0); }
02.css:327   body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
                    font-size: 14px; line-height: 1.42857; color: rgb(51,51,51);
                    background-color: rgb(255,255,255); }
```

Confirmed live by the rendered page: `caps/00-baseline-room/DEFAULTS.txt:65`–`69` reports the
most-frequent computed values across all 2,156 nodes as
`font-family = "Helvetica Neue", Helvetica, Arial, sans-serif` (1906/2156, only **3** distinct
families page-wide), `font-size = 14px` (1600/2156, 10 distinct), `font-weight = 400`
(1638/2156, 3 distinct), `line-height = 20px` (1527/2156, 20 distinct).
`color = rgb(51,51,51)` for 1732/2156 nodes (`DEFAULTS.txt:64`).

**The rebuild needs no webfont for body text** — it is the system Helvetica stack.

Heading scale (`02.css:342`–`353`): h1 36 / h2 30 / h3 24 / h4 18 / h5 14 / h6 12 px,
`font-weight:500`, `line-height:1.1`, `color: inherit`.

App type-scale utilities (`09.css:1025`–`1029`):
`.text-xs 7.8px` · `.text-sm 11.05px` · `.text-md 22.1px` · `.text-lg 39px` · `.text-hg 52px`
(all `!important`). Weight utilities `09.css:1036`–`1038`: `.text-thin 100`, `.text-normal
normal`, `.text-bold bold`.

Chat-specific scale (`09.css:1143`–`1152`) — this is the room's real type ladder:
```
.chat      { font-size: 12px; }              09.css:1143
.chatXXl li{ font-size: 18px; }              09.css:1147
.chatXl    { font-size: 16px; }              09.css:1148
.chatLg    { font-size: 14px; }              09.css:1149
.chatMd    { font-size: 12px; }              09.css:1150
.chatSm    { font-size: 10px; }              09.css:1151
.chatTiny  { font-size:  9px; }              09.css:1152
```
Other app sizes present: 30px (`#clockdiv` `09.css:1202`), 23px (`.app-view-header`
`09.css:108`), 20px (`.settings-button > em` `09.css:265`, `.hasMobileApp` `09.css:1253`),
17px (`.title` `09.css:1139`), 15px (all `.icon-*` `09.css:320`), 13px (`.dropdown-menu`
`09.css:48`), 12px (`.chatChannelTabs a` `09.css:1231`, `.videChatLabel` `09.css:1211`,
`.onLabel` `09.css:1182`), 11px (`.sidebar .nav-heading` `09.css:183`), 10px
(`.tsSm` `09.css:1238`, `.dark-theme-badge-id` `09.css:2565`).

### 3.2 Colour palette — the app's own sheets only (09.css + 14.css)

The app has **no neutral/brand tokens**; it has a hard-coded Material-ish palette repeated
across `.bg-*`, `.text-*`, `.b*-*`, `.btn-*`, `.label-*`, `.alert-*`, `.switch-*` families.
Each named colour below is the *base*; each family also hard-codes a lighter and darker step.

| Token (by class family) | Base | Light step | Dark step | Locators |
|---|---|---|---|---|
| primary | `rgb(29,31,33)` | `rgb(43,46,49)` | `rgb(15,16,17)` | `09.css:971`, `605`, `606` — note `.bg-primary` itself uses **`rgb(0,0,0)`** (`09.css:583`) while `.text-primary`/`.bl-primary` use `29,31,33` (`09.css:971`, `871`) |
| success | `rgb(76,175,80)` | `rgb(96,186,99)` | `rgb(67,154,70)` | `09.css:607`, `629`, `630`, `974` |
| info | `rgb(32,149,242)` | `rgb(61,163,244)` | `rgb(13,134,230)` | `09.css:631`, `653`, `654`, `983` |
| warning | `rgb(254,151,0)` | `rgb(255,164,30)` | `rgb(223,133,0)` | `09.css:655`, `677`, `678`, `977` |
| danger | `rgb(243,66,53)` | `rgb(245,93,82)` | `rgb(241,39,24)` | `09.css:679`, `701`, `702`, `980` |
| inverse | `rgb(54,63,69)` | `rgb(67,79,86)` | `rgb(41,47,52)` | `09.css:559`, `581`, `582`, `989`, `331` |
| amber | `rgb(255,193,7)` | `rgb(255,201,38)` | `rgb(231,174,0)` | `09.css:703`, `725`, `726`, `1004` |
| pink | `rgb(233,30,99)` | `rgb(236,58,118)` | `rgb(212,21,86)` | `09.css:727`, `749`, `750`, `995` |
| purple | `rgb(102,57,182)` | `rgb(117,72,198)` | `rgb(89,50,159)` | `09.css:751`, `773`, `774`, `998` |
| orange | `rgb(254,86,33)` | `rgb(254,109,63)` | `rgb(254,63,3)` | `09.css:775`, `797`, `798`, `1007` |
| gray-darker | `rgb(43,61,81)` | — | — | `09.css:449`, `910`–`913`, `1010` |
| gray-dark | `rgb(81,93,110)` | — | — | `09.css:471`, `914`–`917`, `1013` |
| gray | `rgb(160,170,178)` | — | — | `09.css:427`, `918`–`921`, `1016` |
| gray-light | `rgb(230,233,238)` | — | — | `09.css:493`, `922`–`925`, `1019` |
| gray-lighter | `rgb(244,245,245)` | — | — | `09.css:515`, `926`–`929`, `1022` |
| muted text | `rgb(131,148,169)` | — | — | `09.css:550`, `930`–`933`, `111` |
| body text on white | `rgb(88,95,105)` | — | — | `09.css:537`, `1040` |
| link (app) | `rgb(133,142,154)` → hover `rgb(81,93,110)` | | | `09.css:538`–`539` |
| hairline / divider | **`rgb(236,238,238)`** | | | `09.css:866`–`869` (`.b`, `.bt`, `.br`, `.bb`, `.bl`) |
| white / black | `rgb(255,255,255)` / `rgb(0,0,0)` | | | `09.css:537`, `583` |

Room/chat-only colours (these do **not** appear in the utility families — they are bespoke):

| Purpose | Colour | Locator |
|---|---|---|
| chat link (light) visited/link | `rgb(2,90,168)` | `09.css:1130` |
| chat link hover | `rgb(0,0,255)` | `09.css:1129` |
| chat link (dark) visited/link | `rgb(50,176,213)` | `09.css:1132` |
| chat "question" | `rgb(32,149,242)` | `09.css:1153` |
| chat highlight / private highlight | `yellow` | `09.css:1154`, `1155` |
| chat @mention text | `rgba(4,141,4,0.9)` italic | `09.css:1159` |
| chat @mention row background | `rgba(255,0,0,0.06)` | `09.css:1168` |
| chat header background | `rgba(0,0,0,0.04)` + 1px `rgb(236,238,238)` | `09.css:1169` |
| chat row separator | `rgba(220,220,220,0.46)` | `09.css:1165` |
| admin row underline | `rgb(176,176,176)` | `09.css:1166` |
| chat toolbar top border | `rgba(0,0,0,0.5)` | `09.css:1135` |
| chat tab (idle) | `rgb(133,142,154)` | `09.css:1231` |
| chat tab (active/hover) | text `rgb(81,93,110)` on `rgb(232,232,232)` | `09.css:1232`–`1233` |
| chat-top bottom border | `rgb(232,232,232)` | `09.css:1229` |
| unread badge (chat) | `rgb(255,0,0)` | `09.css:1234` |
| private-chat label / badge-warning | `rgb(255,204,0)` (badge text `black`) | `09.css:1235`–`1236` |
| filter-strong | `black` weight 600 | `09.css:1163` |
| split-pane gutter | bg `rgb(34,34,34)`, fg `rgb(255,255,255)` | `09.css:1240` |
| webcam PiP frame | bg `rgba(0,0,0,0.5)`, border 2px `rgba(191,255,0,0.494)` | `09.css:1187` |
| video-chat tile | outline 2px `rgb(255,255,255)`, bg `rgb(51,51,51)` | `09.css:1208`–`1209` |
| video-chat label strip | `rgba(0,0,0,0.1)` bg, white text | `09.css:1211` |
| drag-drop area | 2px dashed `rgb(29,41,54)`; highlight `rgb(2,90,168)` + bg `rgb(241,241,241)` | `09.css:1218`–`1219` |
| countdown clock | text white, chip bg `rgb(0,191,150)`, digit bg `rgb(0,0,0)` | `09.css:1202`–`1204` |
| room badge id/name | `rgb(0,0,0)` | `09.css:2566` |
| chat-tab-row separator | `rgb(238,238,238)` | `09.css:2571` |
| loading bar / spinner | `rgb(54,63,69)` | `09.css:241`, `242`, `244` |
| toasts | base `rgb(29,31,33)`; success `76,175,80`; error `243,66,53`; info `32,149,242`; wait `102,57,182`; warning `254,151,0` | `09.css:400`–`405` |
| navbar brand text | `rgb(250,250,250)` | `09.css:62` |
| navbar hover wash | `rgba(54,63,69,0.05)` | `09.css:80` |
| form-control border | `rgb(219,217,217)`; addon bg `rgb(248,249,251)` | `09.css:34`–`35` |
| ripple | `rgb(209,210,211)` | `09.css:383` |
| scrollbar (slimScroll) | thumb `rgba(0,0,0,0.35)`, rail `rgba(0,0,0,0.15)` | `09.css:394`, `396` |
| xeditable link (app override) | `rgb(10,10,10)` | `09.css:1194` |

Six background photographs are referenced but not captured:
`.bg-pic1`…`.bg-pic6 { background-image: url("../img/bg1.jpg"…"bg6.jpg") }` (`09.css:800`–`805`).

### 3.3 Spacing scale

Margin/padding utilities, `09.css:806`–`860` — the whole app spacing vocabulary:

| step | margin | padding |
|---|---|---|
| 0 | `.m0/.ml0/.mr0/.mt0/.mb0` = 0 (`09.css:806`–`810`) | `.p0/.pl0/.ph0/.pv0` = 0 (`09.css:831`–`835`) |
| sm | `5px` (`09.css:816`–`820`) | `5px` (`09.css:841`–`845`) |
| base | `10px` (`09.css:811`–`815`) | `10px` (`09.css:836`–`840`) |
| lg | `15px` (`09.css:821`–`825`) | `15px` (`09.css:846`–`850`) |
| xl | `30px` margin (`09.css:826`–`830`) | `20px` padding (`09.css:851`–`855`) |
| xxl | — | `25px` (`09.css:856`–`860`) |

So the ladder is **0 / 5 / 10 / 15 / 20 / 25 / 30 px**; suffix `h` = horizontal, `v` = vertical.
Structural spacing: `.app { padding: 15px 15px 80px }` (`09.css:105`), sidebar width **240px**
(`09.css:98`, `120`, `140`), sidebar inner **257px** (`09.css:181`), header/footer heights
**50px / 60px** (`09.css:100`, `138`), `.navbar-header { width: 350px }` (`09.css:1137`),
`.private-chat-wrapper { max-width: 350px }` (`09.css:1250`).
Width tokens `09.css:1068`–`1079`: 50 / 60 / 90 / 150 / 200 / 240 / 280 / 320 / 360 px, 90%, 100%.
Thumb sizes `09.css:1047`–`1057`: 8/16/24/32/40/48/64/80/96/128 px (and 20px in copy A only).
Height ladder `09.css:1174`–`1181`: `.ch0/.ch10/.ch20/.ch30/.ch70/.ch80/.ch90/.ch100` = 0/10/20/30/70/80/90/100 %.

### 3.4 Border radii, borders, shadows

Radii the app defines (`09.css`): `0px` (`.radius-clear` `09.css:967`, `.btn-square`
`09.css:360`, `.btn-flat` `09.css:358`), `1px` (`09.css:369`–`372`), `2px`
(`.dropdown-menu` `09.css:48`, `.popover` `09.css:46`, `.progress` `09.css:44`,
`.chat li .chat-msg` `09.css:1128`), `3px` (`.rounded` `09.css:969`, `.setting-color > label`
`09.css:272`, `#clockdiv > div` `09.css:1203`, `.btn-lg .btn-label` `09.css:367`),
`4px` (`#webcamCamDiv` `09.css:1187`), `5px` (`.drop-area` `09.css:1218`),
`10px` (`#loading-bar-spinner .spinner-icon` `09.css:244`), `25px`/`35px`
(`.btn-circle.btn-lg/.btn-xl` `09.css:377`–`378`), `50px` (`.btn-pill-*`/`.btn-oval`
`09.css:361`–`362`), `100px` (`.form-control-rounded` `09.css:308`, `.switch span`
`09.css:289`), `400px`/`500px` (`09.css:290`, `376`), `50%` (`.circle` `09.css:968`),
`100%` (`#loading-bar .peg` `09.css:242`, `.layer-morph-inner` `09.css:407`).

Border = **1px solid `rgb(236,238,238)`** everywhere via `.b/.bt/.br/.bb/.bl`
(`09.css:866`–`869`); coloured variants `.b*-primary/-success/-info/-warning/-danger/-amber/
-pink/-purple/-inverse/-orange/-gray*/-muted` at `09.css:870`–`933`.

Elevation ladder (`09.css:1115`–`1120`) — this is the app's entire shadow system:
```
.shadow-z1       0 1px 6px rgba(0,0,0,.12), 0 1px 6px rgba(0,0,0,.12)      09.css:1115
.shadow-z2       0 3px 10px rgba(0,0,0,.23), 0 3px 10px rgba(0,0,0,.16)    09.css:1116
.shadow-z2-hover 0 6px 10px rgba(0,0,0,.23), 0 10px 30px rgba(0,0,0,.19)   09.css:1117
.shadow-z3       0 6px 10px rgba(0,0,0,.23), 0 10px 30px rgba(0,0,0,.19)   09.css:1118
.shadow-z4       0 10px 18px rgba(0,0,0,.22), 0 14px 45px rgba(0,0,0,.25)  09.css:1119
.shadow-z5       0 15px 20px rgba(0,0,0,.22), 0 19px 60px rgba(0,0,0,.30)  09.css:1120
.shadow-clear/.no-shadow  → 0 0 0 rgb(0,0,0) !important                     09.css:970
```
z2 is reused verbatim for `.jumbotron`/`.well`/`.settings-inner` (`09.css:20`, `22`, `263`)
and for every `.btn:hover/:focus/:active` (`09.css:325`).
Header/aside get a distinct pair: `0 0 4px rgba(0,0,0,.14), 0 4px 8px rgba(0,0,0,.28)`
(`09.css:97`) and `…, 2px 4px 8px rgba(0,0,0,.28)` (`09.css:98`).
`.chat li .chat-body { box-shadow: rgba(0,0,0,0.05) 0 1px 1px }` (`09.css:1123`).
Live corroboration: `box-shadow` is `none` for 2094/2156 nodes with **6** distinct values
(`caps/00-baseline-room/DEFAULTS.txt:83`).

### 3.5 Breakpoints — every `@media` in the dump

**App sheet (`09.css`), 38 blocks in copy A:**

| Query | Line(s) | What it does |
|---|---|---|
| `only screen and (min-width: 480px)` | `112` | `.app-view-header > small` → `inline-block` |
| `only screen and (min-width: 768px)` | `59, 63, 73, 79, 87, 102, 116, 139, 166, 194, 235, 314, 419` | The main desktop switch: hides `.mobile-toggles` (`74`), pushes `section`/`footer` by the 240px sidebar (`103`), sets `.app-fh{left:240px}` + `.app-display-flex{display:flex!important}` (`140`–`141`), navbar hover `rgba(54,63,69,.05)` (`80`), `.nav-wrapper` positioning (`88`–`92`), full `.layout-material` re-layout (`167`–`176`), sidebar nav padding (`195`–`197`), `#loading-bar{height:100px}` under layout-material (`236`), `.input-huge{font-size:42px}` (`315`), `.layer-morph-wrapper{padding-left:70px}` (`420`) |
| `only screen and (min-width: 992px)` | `317` | `.input-huge { font-size: 82px }` |
| `only screen and (max-width: 479px)` | `934` | `.b0-sm`/`.b*-sm` border utilities |
| `only screen and (max-width: 767px)` | `121, 151, 945` | 3-D sidebar off-canvas translate (`122`–`124`), `#cssLogo{display:none}` (`152`), `.b*-md` utilities (`946`–`954`) |
| `only screen and (max-width: 991px)` | `956` | `.b*-lg` utilities |
| `print` | `253, 443, 465, 487, 509, 531, 553, 575, 599, 623, 647, 671, 695, 719, 743, 767, 791` | Hides sidebar/navbar/settings/buttons (`254`), forces every `.bg-*` to black text |

**Bootstrap (`02.css`):** `min-width:768/992/1200` container + grid tiers (`02.css:356, 400,
422, 425, 428, 486, 540, 594, …`), `max-width:767` (`02.css:676, 1042, 1067, 1101, 1125, 1485,
1491, 1494, 1497, 1545`), the four `visible-*/hidden-*` bands `768–991`, `992–1199`, `≥1200`
(`02.css:1500`–`1556`), `@media screen and (-webkit-min-device-pixel-ratio: 0)` for date inputs
(`02.css:702`), `@media (max-device-width:480px) and (orientation:landscape)` (`02.css:1010`),
`@media (transform-3d),(-webkit-transform-3d)` for the carousel (`02.css:1436`), plus a print
block (`02.css:41`).
**xeditable (`06.css`):** `screen and (max-width:750px)` / `(min-width:750px)` (`06.css:23`, `28`).

**Effective breakpoint set for a rebuild: 480 / 768 / 992 / 1200 px** (plus a stray 750px in
xeditable and 479/767/991 as the `max-width` mirrors). At the captured 1842px viewport all
`min-width` blocks are active and all `max-width` blocks inactive.

### 3.6 z-index layers (app sheet)

| z | Selector | Locator |
|---|---|---|
| `-1` | `#loading-bar`, `.switch input`, `.show-behind` | `09.css:234`, `288`, `1042` |
| `1` | `.topnavbar > .navbar-header`(≥768), `.navbar-brand`, `.smoothy`, `.layer-morph-inner` | `09.css:60`, `62`, `397`, `407` |
| `5` | `.carousel-control em` | `09.css:52` |
| `100` | `.wrapper-bg-image` | `09.css:2547` |
| `108 / 109` | `.layout-material` aside / header (≥768) | `09.css:170`, `167` |
| `110` | `.app-container > section` | `09.css:99` |
| `210` | `.app-container > footer` | `09.css:100` |
| `310` | `.app-container > aside` | `09.css:98` |
| `410` | `.app-container > header` | `09.css:97` |
| `999` | `.abs-center.abs-fixed` | `09.css:1108` |
| `1000` | `#webcamCamDiv`, `.posted-video-container` | `09.css:1187`, `1263` |
| `3001` | `.topnavbar .sidebar-toggle/.menu-toggle`, `.settings-wrapper` | `09.css:76`, `262` |
| `9001 / 9002 / 9003` | layer-morph overlay / container / close | `09.css:406`, `417`, `408` |
| `9999` | `.smoothy::after` | `09.css:398` |
| `90002` | `#loading-bar-spinner` | `09.css:243` |
| `99999` | `.btn-offset` | `09.css:379` |

Bootstrap's own stack sits underneath: `.dropdown-menu 1000` (`02.css:857`),
`.navbar-fixed-* 1030` (`02.css:1021`), `.modal-backdrop 1040` (`02.css:1378`),
`.modal 1050` (`02.css:1372`), `.popover 1060` (`02.css:1414`), `.tooltip 1070`
(`02.css:1398`), `.dropdown-backdrop 990` (`02.css:870`).
Live: `z-index` is `auto` for 2116/2156 nodes, **8** distinct values
(`caps/00-baseline-room/DEFAULTS.txt:13`).

### 3.7 Motion

`.animated { animation-duration: 0.5s; animation-fill-mode: both }` (`09.css:224`) —
the app **overrides** animate.css's 1s (`12.css:2`) because sheet 09 loads after sheet 12? No —
09 is index 9 and 12 is index 12, so **animate.css wins** and the live duration is 1s
(`12.css:2`). Flag for the rebuild: the 0.5s in `09.css:224` is dead.
Angular route transitions: `.ng-fadeIn*/.ng-fadeOut*` all `0.35s ease` (`09.css:202`–`223`),
`.ng-fadeOutZoom` `1s cubic-bezier(0.23,1,0.32,1)` (`09.css:222`–`223`).
Ripple `0.35s linear` (`09.css:384`–`392`); settings drawer `right 0.3s
cubic-bezier(0.86,0,0.07,1)` (`09.css:262`); layer-morph `transform 0.5s
cubic-bezier(0.42,0,0.58,1)` (`09.css:407`); YouTube-button reveal `showYtBtns` 5s
(`09.css:1267`–`1271`).
Live: `transition-duration` is `0s` for 2142/2156 nodes with 5 distinct values, and
`transform` is `none` for 2141/2156 (`caps/00-baseline-room/DEFAULTS.txt:91`, `92`) —
**nothing was mid-animation when the DOM was captured.**

---

## 4. The rules that drive THIS page

### 4.1 Room shell / layout engine (CSS tables, not flex)

```
09.css:94   html { height: 100%; touch-action: manipulation; }
09.css:95   body { overflow: hidden; height: 100%; }          ← overridden by 14.css:2 (overflow:auto)
09.css:96   .app-container { position: relative; width: 100%; min-height: 100%; height: auto; }
09.css:135  .footer-hidden .container-fh { bottom: 0px; }
09.css:136  .footer-hidden .app { padding-bottom: 0px; }
09.css:137  .footer-hidden .app-container > footer { display: none; }
09.css:138  .app-fh { position: absolute; width: auto; overflow: visible; inset: 50px 0 0; padding: 0; }
09.css:144  .container-fh { height: 100%; }
09.css:145  .l-table, .l-table-fixed { display: table; width: 100%; height: 100%; min-height: 240px; border-spacing: 0; }
09.css:146  .l-table-fixed { table-layout: fixed; }
09.css:147  .l-row  { display: table-row; height: 100%; }
09.css:148  .l-cell, .l-cell-wrapper { position: relative; display: table-cell; height: 100%; width: 100%; vertical-align: top; overflow: auto; }
09.css:149  .l-cell-wrapper { display: block; }
09.css:150  .l-cell-wrapper .l-cell-inner { position: absolute; inset: 0px; }
09.css:1173 .l-table, .l-table-fixed { min-height: inherit; }   ← later override of :145
```

**`themeClass` = `footer-hidden` on every capture** (`00-META.txt:13`–`34`), so
`09.css:135`–`137` are live: the footer is `display:none` and `.app` has no bottom padding.

The 32 room-only rules appended in copy B (`09.css:2543`–`2574`) — quoted in full because they
are the actual room layout and exist **only** in the second copy:

```
09.css:2543  .roomArea { height: 100%; display: flex !important; flex-direction: column !important; }
09.css:2544  .alertsChatArea { display: flex !important; flex-direction: row !important; }
09.css:2545  .l-cell-presentation-sections, .presentationHolderDiv, .presentationContainer, .split-presentation { overflow: hidden; }
09.css:2546  .room-bg-image-show, .root-bg-image, .container-bg-image, .video-presentation-section { width: 100%; height: inherit; }
09.css:2547  .wrapper-bg-image { width: 100%; height: 100%; padding: 25px; text-align: center; z-index: 100; }
09.css:2548  .l-table-block, .l-row-block { display: block !important; }
09.css:2549  .room-bg-image { max-width: 100%; max-height: 100%; }
09.css:2550  .webcamScreenVideo { max-height: calc(-50px + 100vh) !important; height: auto !important; }
09.css:2551  .btn-random-user { display: none; }
09.css:2552  .texarea-alt-wrapper { padding: 2px !important; }
09.css:2553  .texarea-alt { padding: 3.5px !important; }
09.css:2554  .input-group-alt { padding: 1px 10px !important; }
09.css:2555  .typing-indicator { height: 16px; }
09.css:2556  .l-cell-wrapper-overflow { overflow: hidden; }
09.css:2557  .user-info-block { display: block; margin: 3px 0px; }
09.css:2558  .roster-user-icon { vertical-align: middle; }
09.css:2559  .disclosure-input { margin-bottom: 10px; }
09.css:2560  .d-block { display: block; }
09.css:2561  #permissionsModal .modal-content { padding: 20px; }
09.css:2562  #badgesForm input { vertical-align: text-bottom; }
09.css:2563  .label-badge-img { padding: 0px !important; }
09.css:2564  .user-badge-img { width: auto; height: 100%; max-height: 20px; margin: 0px 4px; }
09.css:2565  .dark-theme-badge-id { font-size: 10px; }
09.css:2566  .room-badge-id, .room-badge-name { color: rgb(0, 0, 0); }
09.css:2567  .room-badge-name { margin: 0px 4px; }
09.css:2568  .users-many-actions { margin-top: 30px; }
09.css:2569  .checkbox-apply-to-all-rooms { margin-left: 10px; }
09.css:2570  .checkbox-apply-to-all-rooms input:checked + span { font-weight: bold; }
09.css:2571  .chat-tab-row { display: flex; align-items: center; justify-content: flex-start; gap: 10px; border-bottom: 1px solid rgb(238,238,238); padding: 5px 0px; }
09.css:2572  .badge-preview { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
09.css:2573  .add-tab-btn { margin-top: 10px; }
09.css:2574  .cursor-pointer:hover { cursor: pointer; }
```

`#permissionsModal` (`09.css:2561`) is exactly capture 01's subtree
(`00-META.txt:14`) — the modal is a 22-node `.modal-content` with 20px padding.

Split panes (the draggable room dividers):
```
09.css:1241  .gutter.gutter-horizontal { background-image: url(data:image/png;base64,…); cursor: col-resize; position: relative; padding: 0px 5px; }
09.css:1242  .gutter.gutter-vertical   { background-image: url(data:image/png;base64,…); cursor: row-resize; padding: 5px 0px; }
09.css:1240  .gutter { background-color: rgb(34,34,34); color: rgb(255,255,255); background-repeat: no-repeat; background-position: 50% center; display: inherit; }
09.css:1243  .split { box-sizing: border-box; }
09.css:1244  .split, .gutter.gutter-horizontal { float: left; }
09.css:1245  .split, .gutter.gutter-horizontal { height: 100%; }
09.css:1246  .split { overflow: hidden auto; }
```

### 4.2 Chat

```
09.css:1121  .chat { list-style: none; margin: 0; padding: 0 6px 0 0; }
09.css:1122  .chat li { margin-bottom: 2px; padding-bottom: 1px; }
09.css:1123  .chat li .chat-body { box-shadow: rgba(0,0,0,0.05) 0px 1px 1px; }
09.css:1124  .chat li .chat-body p { margin: 0; color: rgb(131,148,169); }
09.css:1125  .chat li .chat-header { padding: 0 0 3px; display: inline; }
09.css:1128  .chat li .chat-msg { padding: 3px 5px 5px; border-radius: 2px; white-space: pre-wrap; }
09.css:1133  .chat li.left  .chat-body { margin-left: 60px; }
09.css:1134  .chat li.right .chat-body { margin-right: 60px; }
09.css:1135  .chatToolbar { margin-top: 5px; border-top: 1px solid rgba(0,0,0,0.5); … }
09.css:1144  ul#chatContent.chatWide { font-size: 12px; display: flex; flex-flow: column wrap; height: 100%; width: 100%; }
09.css:1145  li#chatContent.chatWide { width: calc(33.3333%); padding-left: 10px; }
09.css:1146  #chatContent.chatWide div { max-width: 200px; word-break: break-all; overflow-wrap: break-word; }
09.css:1156  .chatUpvoted { font-weight: 700; font-size: 16px; }
09.css:1157  .chatUpvoted i { font-size: 16px; }
09.css:1160  .chatStars { max-height: 8px; height: 8px; vertical-align: text-top; }
09.css:1161  .chatName { vertical-align: text-top; margin-right: 5px; }
09.css:1162  .isAdm { font-weight: 400; }
09.css:1164  .chat li { overflow-wrap: break-word; }
09.css:1165  .smChatLi { border-bottom: 1px solid rgba(220,220,220,0.46); }
09.css:1166  .smChatLi .isAdm { border-bottom: 1px solid rgb(176,176,176); }
09.css:1167  .smChatBodyAdm { text-align: right; margin-right: 5px; }
09.css:1169  .chatHeader { padding-top: 0; background-color: rgba(0,0,0,0.04); border: 1px solid rgb(236,238,238); }
09.css:1170  .chatSmall li { padding-bottom: 1px; margin-bottom: 1px; }
09.css:1229  .chat-top { display: flex; justify-content: space-between; align-items: center; height: auto; min-height: 40px; padding: 0 10px; border-bottom: 1px solid rgb(232,232,232); }
09.css:1230  .chatChannelTabs { display: flex; justify-content: center; border: 0; flex-flow: wrap; }
09.css:1231  .chatChannelTabs a { font-size: 12px; font-weight: bolder; height: 33px; margin-top: 9px; color: rgb(133,142,154)!important; padding: 5px 4px!important; }
09.css:1232  .chatChannelTabs li.activeTab a { cursor: pointer; color: rgb(81,93,110)!important; background-color: rgb(232,232,232)!important; }
09.css:1233  .chatChannelTabs a:hover, .chatChannelTabs a:focus { cursor: pointer; color: rgb(81,93,110)!important; background-color: rgb(232,232,232)!important; }
09.css:1247  #chatAlertsDiv { overflow-y: hidden; display: flex; flex-direction: column; }
09.css:1248  .chat-relative-position { position: relative; }
09.css:1250  .private-chat-wrapper { max-width: 350px; overflow-y: auto; }
```
One rule in the sheet is a leftover hand-edit against a specific message id:
`#chatLi_30 > div > div.chat-msg.chat-msg-txt > div > a > img isadm.uploaded-img img
{ text-align: right !important; }` (`09.css:1228`) — malformed (`isadm` is not a valid
combinator) and can never match. Do not port it.

### 4.3 Alerts

The app's own `alert` styling is only the 5 extra colour variants
(`.alert-purple/-amber/-pink/-inverse/-orange`, `09.css:1091`–`1105`); the base `.alert`
box comes from Bootstrap (`02.css:1203`–`1221`). The **alerts tab strip** is app CSS:
```
09.css:23  .nav-tabs-alerts > li > a { font-weight: 400; color: rgb(88,95,105); background-color: rgb(244,245,245); margin: 0; border: 1px solid rgb(230,233,238); border-radius: 0; padding: 8px 18px; cursor: pointer; }
09.css:24  .nav-tabs-alerts > li.active > a { padding: 12px 22px; }
09.css:25  .nav-tabs-alerts > li.active > a, …:hover, …:focus { color: inherit; border-bottom-color: rgb(255,255,255); }
09.css:26  .nav-tabs-alerts > li { padding: 4px; }
09.css:27  .nav-tabs-alerts > li.active { padding: 0px; }
09.css:28  .nav-tabs-alerts > li.active + li { padding-left: 4px; }
09.css:29  .nav-tabs-alerts > li:first-child { padding-left: 0px; }
09.css:30  .tab-content { padding: 10px 20px; border-style: solid; border-width: 0 1px 1px; border-color: rgb(230,233,238); }
09.css:31  .nav-pills + .tab-content { border: 0; padding: 0; }
```
Alert-upload plumbing: `#file, #fileAlert { display: none }` (`09.css:1217`),
`.drop-area-alert, .drop-area { border: 2px dashed rgb(29,41,54); margin:10px; padding:20px 0;
border-radius:5px }` (`09.css:1218`), `.drop-area-alert.highlight, .drop-area.highlight
{ border-color: rgb(2,90,168); background-color: rgb(241,241,241)!important }` (`09.css:1219`).

### 4.4 Video / screen-share / webcam

```
09.css:1184  #webcamScreen { height: inherit; object-fit: contain; vertical-align: top; max-height: calc(-60px + 100vh); width: 100%; }
09.css:1185  object#webcamScreen { width: 99%; height: 99%; background-color: inherit; object-fit: contain; vertical-align: top; overflow: hidden; pointer-events: none; max-width: 1920px !important; max-height: 1080px !important; }
09.css:1186  .loadingBkg { background-image: url("/public/app/img/ajax_loader.gif") !important; background-repeat: no-repeat !important; background-position: center center !important; }
09.css:1187  #webcamCamDiv { position: absolute; background: rgba(0,0,0,0.5); border: 2px solid rgba(191,255,0,0.494); border-radius: 4px; top: calc(100% - 320px); left: calc(100% - 2000px); width: 320px; z-index: 1000; resize: both; overflow: hidden; min-width: 50px; min-height: 50px; max-width: 1920px !important; max-height: 1080px !important; }
09.css:1188  #webcamCam { width: 100%; height: 100%; background-color: inherit; object-fit: contain; vertical-align: top; overflow: hidden; pointer-events: none; }
09.css:1189  object#webcam { width: 1px; height: 1px; background-color: rgb(255,255,255); … max-width: 1px !important; max-height: 1px !important; }
09.css:1190  #webcamFlash { display: inherit; height: 100%; width: 100%; object-fit: contain; }
09.css:1192  .w11k-flash-container, .object { display: inherit; height: 100%; width: 100%; object-fit: contain; }
09.css:1193  #padFrame { height: 100%; width: 100%; object-fit: contain; }
09.css:1207  .videoChatContainer { width: 100%; display: flex; flex-flow: row; justify-content: center; align-items: flex-start; overflow: scroll; }
09.css:1208  .videoChatAuto { outline: rgb(255,255,255) solid 2px; background: rgb(51,51,51); margin: auto; max-width: 320px; max-height: 200px; … }
09.css:1209  .videoChatAutoSM { background: rgb(51,51,51); margin: auto; max-width: 160px; max-height: 100px; … text-align: center; … }
09.css:1210  .videoChatAudio { width: 1px !important; height: 1px !important; padding: 0 !important; margin: 0 !important; position: relative !important; float: left !important; }
09.css:1211  .videChatLabel { width: 100%; height: 20px; background-color: rgba(0,0,0,0.1); color: rgb(255,255,255); font-size: 12px; text-align: center; position: relative; bottom: 0; }
09.css:1263  .posted-video-container { position: absolute; bottom: 20px; right: 20px; z-index: 1000; }
09.css:2550  .webcamScreenVideo { max-height: calc(-50px + 100vh) !important; height: auto !important; }
```
Note `left: calc(100% - 2000px)` on `#webcamCamDiv` (`09.css:1187`) — at 1842px viewport that
computes to a **negative** left of about −158px, i.e. the PiP starts off the left edge unless
JS repositions it. `.videoChatContainer` uses `overflow: scroll` (not `auto`), so its
scrollbars are always reserved.

YouTube posting UI: `#basic-addonSaveYoutube:hover, #basic-addonClearYoutube:hover,
#basic-addonYoutube:hover { cursor: pointer; background-color: rgb(244,244,244) }`
(`09.css:1264`), `.remove-yt-url { padding: 2px 6px }` (`09.css:1265`),
`.yt-url:hover { cursor: pointer; color: rgb(85,85,85); text-decoration: underline }`
(`09.css:1266`), `.yt-btn { opacity: 0; animation: 5s … showYtBtns }` (`09.css:1267`).
Video.js itself is **not styled** — sheet 03 is CORS-blocked (§8).

### 4.5 Member list / roster / badges

```
09.css:2557  .user-info-block { display: block; margin: 3px 0px; }
09.css:2558  .roster-user-icon { vertical-align: middle; }
09.css:2562  #badgesForm input { vertical-align: text-bottom; }
09.css:2563  .label-badge-img { padding: 0px !important; }
09.css:2564  .user-badge-img { width: auto; height: 100%; max-height: 20px; margin: 0px 4px; }
09.css:2565  .dark-theme-badge-id { font-size: 10px; }
09.css:2566  .room-badge-id, .room-badge-name { color: rgb(0, 0, 0); }
09.css:2567  .room-badge-name { margin: 0px 4px; }
09.css:2568  .users-many-actions { margin-top: 30px; }
09.css:2569  .checkbox-apply-to-all-rooms { margin-left: 10px; }
09.css:2570  .checkbox-apply-to-all-rooms input:checked + span { font-weight: bold; }
09.css:1255  span.label { padding: 0.2em; margin-right: -4px !important; }
09.css:1236  .badge-warning { background-color: rgb(255,204,0); color: black; margin-left: 5px; }
09.css:1234  .badge-danger-chat { background-color: rgb(255,0,0); }
09.css:2551  .btn-random-user { display: none; }
```
`.dark-theme-badge-id` (`09.css:2565`) is a **badge-id size utility, not a theme selector** —
it sets only `font-size: 10px` and contains no colour. Do not mistake it for theming.

### 4.6 Navbar / topbar

```
09.css:56   .topnavbar, .navbar, .navbar .dropdown-menu { filter: none !important; }
09.css:57   .topnavbar { position: relative; margin-bottom: 0; border-radius: 0; border: 0; backface-visibility: hidden; }
09.css:62   .topnavbar > .navbar-header > .navbar-brand { position: relative; display: block; padding: 0 5px; line-height: 50px; float: none; margin: 0 50px; z-index: 1; color: rgb(250,250,250); }
09.css:64   (≥768) .topnavbar > .navbar-header > .navbar-brand { margin: 0px 15px; }
09.css:66   .topnavbar > .navbar-header > .navbar-brand img { max-height: 100%; width: auto; }
09.css:70   .topnavbar .mobile-toggles { right:0; left:0; top:0; height:50px; line-height:50px; padding:0 10px; position: absolute !important; }
09.css:74   (≥768) .topnavbar .mobile-toggles { display: none; }
09.css:76   .topnavbar .sidebar-toggle, .topnavbar .menu-toggle { font-size: 24px; color: white; z-index: 3001; }
09.css:80   (≥768) .topnavbar .nav > li > a:hover/:focus { background-color: rgba(54,63,69,0.05); }
09.css:1137 .navbar-header { width: 350px; }
09.css:1138 .navSwitcher { margin-left: 5px; margin-right: 25px; }
09.css:1139 .title { line-height: 50px; color: rgb(255,255,255); font-size: 17px; text-align: center; }
09.css:1191 .navLogo { max-height: 25px; max-width: 300px; width: auto; height: 25px; }
09.css:1253 .hasMobileApp { font-size: 20px !important; margin: 0 5px 0 2px !important; color: white !important; }
09.css:1252 .page-layout-types { margin-left: 7px; }
09.css:1256 .mobileTabs li:hover { cursor: pointer; }
09.css:1260 .nav-tab-li:hover { cursor: pointer; }
09.css:1261 .nav-tab-li:hover .active { cursor: auto; }
```
Navbar height is **50px** throughout (`09.css:62`, `70`, `1139`; Bootstrap `.navbar
min-height:50px` `02.css:994`, `.navbar-brand height:50px` `02.css:1027`).

### 4.7 Dropdowns (captures 02–18)

```
09.css:48    .dropdown-menu { border-radius: 2px; font-size: 13px; }
09.css:49    .dropdown-header { color: rgb(161,162,163); }
09.css:86    .nav-wrapper .navbar-nav .open .dropdown-menu { position: absolute; left: 0; right: 0; border-top: 1px solid rgb(225,225,225); border-bottom: 1px solid rgb(225,225,225); }
09.css:91-92 (≥768) …{ left: auto; right: auto; }  /  .navbar-right … { left: auto; right: 0; }
09.css:1257  #filesDrive .dropdown-menu { left: -175px; top: -70px; }
09.css:1258  #filesDrive .dropdown-menu::after { content:""; position:absolute; right:-10px; bottom:13px; border-width:5px; border-style:solid; border-color: transparent transparent transparent rgb(0,0,0); }
09.css:1259  #filesDrive .dropdown-menu-sounds::after { bottom: 60px; }
```
Base geometry from Bootstrap: `min-width:160px; padding:5px 0; margin:2px 0 0; font-size:14px;
background:#fff; border:1px solid rgba(0,0,0,.15); border-radius:4px; box-shadow:0 6px 12px
rgba(0,0,0,.176)` (`02.css:857`) — **but the app overrides radius to 2px and font-size to 13px**
(`09.css:48`). `.dropdown-menu-right { right:0; left:auto }` (`02.css:867`) is the
`dropdown-menu-right.show` variant seen in captures 04/09/14.

### 4.8 Modal

App contributes only `#permissionsModal .modal-content { padding: 20px }` (`09.css:2561`) and
the imgur/preview modal:
```
09.css:1223  .imgur-modal { text-align: center; }
09.css:1225  .imgur-modal img { max-width: 100%; max-height: calc(-150px + 100vh); }
09.css:1226  .imgur-modal .modal-dialog { width: 90%; height: 90%; }
```
Everything else is Bootstrap: `.modal z-index:1050` (`02.css:1372`), `.modal-dialog
{width:600px; margin:30px auto}` at ≥768 (`02.css:1391`), `.modal-content` white, 6px radius,
`0 5px 15px rgba(0,0,0,.5)` (`02.css:1377`, `1392`), backdrop `#000` at `opacity .5`
(`02.css:1378`, `1380`), header/footer `15px` padding with `1px solid rgb(229,229,229)`
(`02.css:1381`, `1385`).

---

## 5. THEME SYSTEM — the verdict

### 5.1 There are ZERO CSS custom properties in this app

`cssVars` is `{"root":{},"body":{}}` for **all 21 DOM captures** — `00-META.txt:38`–`59`,
every single line, no exceptions. And that is not a capture failure: a grep for `var(--`
across all 15 decoded sheets returns **0 occurrences**, and a grep for custom-property
*definitions* (`--name:`) returns **0** as well.

> `grep -o 'var(--' *.css | wc -l` → **0**
> `grep -oE '\-\-[a-zA-Z0-9_-]+ *:' *.css` → **0 matches**

**The app uses no CSS variables anywhere.** Every colour is a literal `rgb()`/`rgba()`/keyword
baked into a selector. A rebuild that introduces custom properties is *improving* on the
original, not matching it — that is fine, but the source has no token layer to copy.

### 5.2 `darkTheme` / `lightTheme` are not selectors — they match nothing

`grep -inE 'darkTheme|lightTheme'` across all 15 sheets → **0 matches**.
`grep -in 'theme'` across all 15 sheets → exactly **one** hit, and it is not a theme selector:
`09.css:2565 .dark-theme-badge-id { font-size: 10px; }`.

So when the harness put `darkTheme` (capture 19) or `lightTheme` (capture 20) on `<body>`,
**no rule in any loaded stylesheet could react**. This is confirmed empirically in §5.4.

### 5.3 The real theming primitive: a bare `.dark` / `.light` class, and `.light` is EMPTY

These are the **only** `.dark`/`.light` rules in the entire dump (grep across all 15 sheets;
`12.css:497` and `12.css:506` are animate.css's `.lightSpeedIn/.lightSpeedOut` and are unrelated):

```
09.css:1131  .dark .chat-msg-txt a:hover                 { color: rgb(0, 0, 255); }
09.css:1132  .dark .chat-msg-txt a:visited, .dark .chat-msg-txt a:link { color: rgb(50, 176, 213); }
09.css:1158  li.chatUpvoted.light                        { border: 2px solid rgb(0, 0, 0); }
09.css:1195  .dark                                       { background-color: black; color: white; }
09.css:1196  .light                                      { }        ← EMPTY RULE, zero declarations
09.css:1197  div.l-row.dark                              { background-color: black; color: rgb(224, 224, 224); }
09.css:1198  div.l-row.dark a                            { color: rgb(208, 208, 208); }
09.css:1199  div.chatHeader.dark                         { color: rgb(136, 136, 136); background-color: rgb(72, 72, 72); border: none; }
09.css:1200  div.p.bt.dark                               { color: rgb(136, 136, 136); background-color: rgb(72, 72, 72); border: none; }
09.css:1201  input.form-control.dark, .btn.btn-default.dark { background-color: rgb(0, 0, 0); }
```
(duplicated verbatim at `09.css:2401`, `2402`, `2428`, `2465`–`2471`.)

Read the selectors: `.dark` is applied **per element**, never to `html`/`body`. The targets are
exactly the room/chat surfaces — `div.l-row` (the room layout row, `09.css:147`),
`div.chatHeader` (`09.css:1169`), `div.p.bt` (the padding-10 + border-top panel,
`09.css:836` + `09.css:868`), `.chat-msg-txt` links, `li.chatUpvoted`, and the composer's
`input.form-control` / `.btn.btn-default`. There is no `.dark` rule for the navbar, the
sidebar, the modal, the dropdown, the alerts tabs, or any `.bg-*` utility.

**`.light { }` at `09.css:1196` is literally an empty rule** — light mode is "no class applied,
inherit the default light palette." The only rule that does anything under `.light` is the
upvote outline at `09.css:1158`, which exists because the dark variant would be invisible.

**This confirms the sibling account-settings dump's conclusion — and this page is where the
proof lives.** The sibling page could only observe the absence of theming; ptr1 is the
chat/room page, and here the `.dark`/`.light` selectors *do* exist and *are* scoped precisely
to chat/room components. Nothing in ptr1 refutes the sibling; ptr1 supplies the positive half
of the claim the sibling could only state negatively.

### 5.4 What forcing dark and light ACTUALLY changed: one attribute, zero pixels

**Capture 19 (forced-darkTheme).** `caps/19-forced-darkTheme/INFO.txt:10`–`12` declares
`nodes identical to baseline: 2155/2156`, `nodes differing: 1`, `nodes removed: 0`.
I recounted independently: `caps/19-forced-darkTheme/IDENTICAL-TO-BASELINE.txt` is 2157 lines
(1 header + 1 blank + **2155** node paths), and `NODES-REMOVED-VS-BASELINE.txt:1` says
`0 baseline node path(s) absent from this capture`. The one differing node, in full:

```
caps/19-forced-darkTheme/nodes-000.txt:3   #0 path=r <body> — 1 difference(s) vs baseline
caps/19-forced-darkTheme/nodes-000.txt:4     attr class: "footer-hidden" -> "footer-hidden darkTheme"
```

**Capture 20 (forced-lightTheme).** Identical shape —
`caps/20-forced-lightTheme/INFO.txt:10`–`12` (2155/2156, 1 differing, 0 removed), recount of
`IDENTICAL-TO-BASELINE.txt` = **2155** paths, `NODES-REMOVED-VS-BASELINE.txt:1` = 0 removed:

```
caps/20-forced-lightTheme/nodes-000.txt:3   #0 path=r <body> — 1 difference(s) vs baseline
caps/20-forced-lightTheme/nodes-000.txt:4     attr class: "footer-hidden" -> "footer-hidden lightTheme"
```

The diff format is exhaustive — the header of each IDENTICAL file states the compared surface:
"byte-identical to baseline-room (rect, attrs, tag, text, ::before, ::after, and **ALL computed
style props**)" (`caps/19-forced-darkTheme/IDENTICAL-TO-BASELINE.txt:1`). And the single
differing node lists exactly **one** difference, an `attr`, with **no** style lines. So:

- Not one rect moved.
- Not one computed style property changed, on any node — **including `<body>` itself**.
- No node appeared or disappeared.

Second, independent corroboration: the page-wide COMMON computed-style tables for captures 19
and 20 are **byte-for-byte identical to the baseline's**, apart from the capture label on
line 1. I diffed `caps/00-baseline-room/DEFAULTS.txt` against
`caps/19-forced-darkTheme/DEFAULTS.txt` and `caps/20-forced-lightTheme/DEFAULTS.txt`: the only
hunk is `1c1` (`…for capture "baseline-room"` → `…"forced-darkTheme"` / `…"forced-lightTheme"`).
All 95 property rows (`DEFAULTS.txt:6`–`100`) — the distinct-value counts, the majority-value
counts — are unchanged.
If any theme rule had fired, `background-color` (18 distinct, 1999/2156 at `rgba(0,0,0,0)`,
`DEFAULTS.txt:58`) or `color` (10 distinct, 1732/2156 at `rgb(51,51,51)`, `DEFAULTS.txt:64`)
would have shifted. Neither moved by a single node.

### 5.5 VERDICT

> **The rebuild needs ONE palette, not two.**
>
> There is no theme system in this application. `darkTheme`/`lightTheme` on `<body>` are inert
> strings that match zero selectors (§5.2). There are no CSS custom properties to swap (§5.1).
> The only theming primitive that exists is a bare `.dark` class toggled on individual
> chat/room elements — a 10-rule, chat-scoped inversion (`09.css:1131`, `1132`, `1195`,
> `1197`–`1201` + `li.chatUpvoted.light` at `09.css:1158`) — with its counterpart `.light { }`
> **empty** (`09.css:1196`), i.e. "light" *is* the default and costs nothing.
>
> Build the light palette from §3.2. Then, if and only if the room offers a per-room dark chat
> toggle, implement `.dark` as a **component-scoped modifier** on exactly seven surfaces:
> the generic fallback (`black`/`white`), `div.l-row` (`black` / `rgb(224,224,224)`, links
> `rgb(208,208,208)`), `div.chatHeader` and `div.p.bt` (both `rgb(72,72,72)` / `rgb(136,136,136)`,
> border removed), `input.form-control` + `.btn.btn-default` (`rgb(0,0,0)`), and chat message
> links (`rgb(50,176,213)` / hover `rgb(0,0,255)`). Nothing else in the app has a dark variant —
> not the navbar, not the modal, not the alerts tabs, not any `.bg-*`/`.text-*` utility.

**In the captured state, `.dark` was not active anywhere I can see:** the body class is
`footer-hidden` in every capture (`00-META.txt:13`–`34`), and the COMMON background-color for
the page is `rgba(0,0,0,0)` with text `rgb(51,51,51)` on a white Bootstrap body
(`DEFAULTS.txt:58`, `64`; `02.css:327`). Whether any individual node carries `class="dark"`
is answerable only from the per-node files in `caps/00-baseline-room/nodes-*.txt`, which belong
to another agent — see **Honest gaps**.

---

## 6. `final-room` vs `baseline-room` — nothing changed at all

`caps/21-final-room/INFO.txt:10`–`12`:
```
nodes identical to baseline: 2156/2156
nodes differing            : 0
nodes removed vs baseline  : 0
```
Independently recounted: `caps/21-final-room/IDENTICAL-TO-BASELINE.txt` is 2158 lines
(1 header + 1 blank + **2156** node paths — and unlike captures 19/20 the list *includes*
the root path `r`, which is exactly the body node that differed there);
`caps/21-final-room/NODES-REMOVED-VS-BASELINE.txt:1` = `0 baseline node path(s) absent`;
`02-MANIFEST.txt:25` records `nodeFiles=0` (there is no diff file because there is no diff).
And `caps/21-final-room/DEFAULTS.txt` diffs against the baseline's in exactly one place:
line 1's capture label.

**What this implies, over the 3.414 s window from `15:59:18.276Z` to `15:59:21.690Z`
(`00-META.txt:13` vs `00-META.txt:34`):**

- **No live data arrived.** Not one chat message, alert, roster change, or price tick landed —
  a single socket push would have inserted or mutated at least one `<li>` and changed a rect.
- **No animation advanced.** Every `.animated` element (`12.css:2`, 1s duration) would have
  moved a `transform` or `opacity` inside 3.4 s. `transform` is `none` on 2141/2156 nodes and
  `transition-duration` is `0s` on 2142/2156 (`DEFAULTS.txt:91`–`92`) — nothing was in flight.
- **No layout reflow.** Not one of the 2,156 rects shifted by a subpixel, so no image finished
  decoding, no font swapped, no video element resized.
- **The two theme forcings left no residue.** Capture 21 is byte-identical to capture 00 *after*
  dark and light were both applied and reverted (captures 19 → 20 → 21), which independently
  re-proves §5.4: the forcings had no effect to undo.

For the rebuild this is good news and a caveat. Good: the baseline capture is a **stable,
quiescent** picture — a screenshot diff against it is a fair test. Caveat: the dump contains
**no evidence of dynamic behaviour** — no second frame of a chat list, no arriving alert, no
socket-driven state. Any live-update behaviour must come from another source; it is an honest
gap in this dump, not something to invent.

---

## 7. Fonts

**Three `@font-face` declarations exist in the entire dump. All three are icon fonts.
There is no `@font-face` for body text.**

| family | sources | sheet | licence note for the rebuild |
|---|---|---|---|
| `"Glyphicons Halflings"` | `../fonts/glyphicons-halflings-regular.woff2` / `.woff` / `.ttf` | `02.css:60` | **Bundled with Bootstrap 3 under the Bootstrap licence, but Glyphicons proper is a commercial font** — Bootstrap 3's bundled subset is redistributable with Bootstrap. Must be **self-hosted** (relative `../fonts/` path). Only used by `.glyphicon-*` (`02.css:61`–`323`); the app overrides `.glyphicon` to render from **FontAwesome** instead (`09.css:2`), and maps four chevrons to FA codepoints (`09.css:5`–`8`), so Glyphicons may be droppable entirely — verify against the rendered glyphs. |
| `FontAwesome` | `../fonts/fontawesome-webfont.woff2?v=4.3.0` / `.woff` / `.ttf` | `10.css:2` | **Version 4.3.0 is stated in the URL.** SIL OFL 1.1 for the font, MIT for the CSS — free, but must be **self-hosted**. Carries 517 glyph rules (`10.css:40`–`557`) plus `.fa-lg/2x…5x`, `.fa-fw`, `.fa-ul/li`, `.fa-spin/-pulse`, `.fa-rotate/-flip`, `.fa-stack` (`10.css:4`–`39`). |
| `feather` | `fonts/feather-webfont.woff` / `.ttf` (**no woff2**) | `11.css:2` | This is the **Feather webfont by Cole Bemis / "feathericons" webfont build**, not the modern SVG Feather. 134 `.icon-*` glyphs (`11.css:5`–`136`), applied via `[data-icon]::before` and `[class^="icon-"]` (`11.css:3`–`4`). The app sizes them at 15px (`09.css:320`). Must be **self-hosted**; no woff2 exists in the capture, so expect a larger payload or a re-generated font. |

Non-`@font-face` families declared:
- `02.css:327` body stack `"Helvetica Neue", Helvetica, Arial, sans-serif` — **system fonts, no licensing.**
- `02.css:24` / `02.css:414` code stack `Menlo, Monaco, Consolas, "Courier New", monospace` — system.
- `09.css:1202` `#clockdiv { font-family: sans-serif }` — system.
- `02.css:1457` `.carousel-control .icon-next/-prev { font-family: serif }` — system.
- `02.css:2` `html { font-family: sans-serif }` (normalize), overridden at `02.css:327`.

Live corroboration: only **3** distinct computed `font-family` values exist across all 2,156
nodes, with the Helvetica stack on 1,906 of them (`caps/00-baseline-room/DEFAULTS.txt:65`).
The other two are almost certainly `FontAwesome` and `feather` on icon elements — but the exact
node-level values are in the per-node files owned by another agent (see §8).

**Bottom line: the rebuild needs zero licensed text fonts.** Self-host FontAwesome 4.3.0 and
the Feather webfont; verify whether Glyphicons is reachable at all given `09.css:2`.

---

## 8. Honest gaps

1. **Sheet 03 — `https://vjs.zencdn.net/7.3.0/video-js.min.css` — CORS-BLOCKED.**
   `00-META.txt:65` reports `ruleCount=0 bytes=12`; `03.css:2` is the literal string
   `CORS-BLOCKED`. **All Video.js player chrome is unknown**: the big play button, control bar,
   progress bar, volume slider, captions/subtitles menu, poster, spinner, fullscreen. The only
   video-js CSS I have is the 2-rule inline shim (`00.css:2`–`3`, `.video-js` 300×150 and
   `.vjs-fluid` 56.25%) and the 4-rule YouTube-plugin shim (`13.css:2`–`5`). If this page shows
   a Video.js player, its styling must be sourced from video.js 7.3.0 directly — I cannot
   reconstruct it from this dump and will not guess it.
2. **Sheet 07 — `angularjs-toaster 2.2.0` — CORS-BLOCKED.** `00-META.txt:69`, `07.css:2`.
   The toast container geometry, positions, and close buttons are unknown. The app *does*
   override toast colours (`09.css:399`–`405`: `#toast-container { top: 55px !important }`,
   `.toast` `rgb(29,31,33)`, success/error/info/wait/warning) — so I know the palette but not
   the box. Note `body .toast-wait` (`09.css:404`) has no Bootstrap/toastr analogue in my files.
3. **Intercom.** The app ships exactly one Intercom rule — `.intercom-composer-popover
   { right: 10px !important }` (`09.css:1251`, dup `09.css:2521`). **Intercom's own stylesheet
   is not among the 15 sheets** (`00-META.txt:62`–`76`), so the messenger widget's appearance
   is entirely uncaptured. Expected — Intercom renders in a cross-origin iframe.
4. **Background images not captured.** `../img/bg1.jpg`…`bg6.jpg` (`09.css:800`–`805`),
   `/public/app/img/ajax_loader.gif` (`09.css:1186`), and the two split-gutter PNGs
   (`09.css:1241`–`1242`, inline base64 — those two *are* fully present). The six jpegs and the
   loader gif are references only; a rebuild has no source art for them.
5. **`02.css` truncated closing brace.** The decoded file ends at
   `02.css:1577` `  .hidden-print { display: none !important; }` followed by a bare `}` —
   the final `@media print` block's brace. Verified by byte-dump of the file tail; the file is
   complete, the line count just makes the last rule look orphaned. **Not a real gap.**
6. **Bootstrap's exact minor version is not stated anywhere in the capture.** The href is
   `bootstrap.min.css` with no version query (`00-META.txt:64`), unlike Font Awesome's
   `?v=4.3.0`. I can prove it is Bootstrap 3.x from its structure (10px root font-size
   `02.css:326`, `.col-xs/sm/md/lg` grid `02.css:433`–`647`, Glyphicons `@font-face`
   `02.css:60`, `.panel`/`.well`/`.jumbotron` `02.css:1291`, `1364`, `1188`), but I will not
   assert a minor version from memory.
7. **Whether `class="dark"` is present on any node in the live DOM is not answerable from my
   files.** The `.dark` rules exist (`09.css:1195`–`1201`); whether the room was rendered with
   them applied requires `caps/00-baseline-room/nodes-*.txt`, which belongs to another agent.
   The page-wide evidence I do have (`DEFAULTS.txt:58`, `64`: background `rgba(0,0,0,0)` on
   1999/2156, colour `rgb(51,51,51)` on 1732/2156) is consistent with `.dark` being **off**,
   but only the node files can settle it. I flag this rather than assert it.
8. **The `.animated` duration conflict is a cascade fact, not a measurement.** `12.css:2` (1s)
   loads after `09.css:224` (0.5s) by sheet index, so 1s should win — but no element was
   mid-animation in the capture (`DEFAULTS.txt:91`–`92`), so I could not confirm it from a
   computed value. Treat 1s as the reasoned reading, unverified against a rendered node.
9. **No second frame.** As established in §6, the dump contains zero temporal change across
   3.414 s. There is no evidence in this dump about how chat rows enter, how alerts animate in,
   or how the typing indicator (`09.css:2555`, height 16px) behaves. That is a genuine gap;
   it must not be invented.

---

## Verification

Every file in my assignment, with its line count, read end to end in this agent's own context —
no delegation, no sub-agents, no sampling.

| File | Lines | Read |
|---|---|---|
| `00-META.txt` | 76 | ✅ full, lines 1–76 in one read |
| `02-MANIFEST.txt` | 25 | ✅ full, lines 1–25 in one read |
| `01-stylesheets/00.css` | 2 | ✅ full |
| `01-stylesheets/01.css` | 2 | ✅ full |
| `01-stylesheets/02.css` | 1577 | ✅ full — read as 1–400, 400–800, 800–1200, 1200–1577; file tail byte-verified |
| `01-stylesheets/03.css` | 2 | ✅ full (CORS-BLOCKED marker) |
| `01-stylesheets/04.css` | 49 | ✅ full (incl. both 11k-char base64 lines) |
| `01-stylesheets/05.css` | 4 | ✅ full |
| `01-stylesheets/06.css` | 32 | ✅ full |
| `01-stylesheets/07.css` | 2 | ✅ full (CORS-BLOCKED marker) |
| `01-stylesheets/08.css` | 27 | ✅ full |
| `01-stylesheets/09.css` | 2574 | ✅ full — lines 1–1272 read directly (4 reads); lines 1273–2574 proven byte-identical to 2–1272 by `diff`, with the only 3 divergences (`2319`, `2543`–`2574`) read directly. Every distinct line in the file has been read. |
| `01-stylesheets/10.css` | 557 | ✅ full — 1–120 and 121–557 |
| `01-stylesheets/11.css` | 136 | ✅ full |
| `01-stylesheets/12.css` | 790 | ✅ full — 1–400 and 400–790 |
| `01-stylesheets/13.css` | 4 | ✅ full |
| `01-stylesheets/14.css` | 1 | ✅ full |
| `caps/00-baseline-room/DEFAULTS.txt` | 100 | ✅ full (4 preamble lines + column header + 95 property rows) |
| `caps/19-forced-darkTheme/INFO.txt` | 12 | ✅ full |
| `caps/19-forced-darkTheme/DEFAULTS.txt` | 100 | ✅ full (diffed against baseline) |
| `caps/19-forced-darkTheme/nodes-000.txt` | 5 | ✅ full |
| `caps/19-forced-darkTheme/IDENTICAL-TO-BASELINE.txt` | 2157 | ✅ header + tail read; **path lines recounted programmatically** |
| `caps/19-forced-darkTheme/NODES-REMOVED-VS-BASELINE.txt` | 2 | ✅ full |
| `caps/20-forced-lightTheme/INFO.txt` | 12 | ✅ full |
| `caps/20-forced-lightTheme/DEFAULTS.txt` | 100 | ✅ full (diffed against baseline) |
| `caps/20-forced-lightTheme/nodes-000.txt` | 5 | ✅ full |
| `caps/20-forced-lightTheme/IDENTICAL-TO-BASELINE.txt` | 2157 | ✅ header + tail read; **path lines recounted programmatically** |
| `caps/20-forced-lightTheme/NODES-REMOVED-VS-BASELINE.txt` | 2 | ✅ full |
| `caps/21-final-room/INFO.txt` | 12 | ✅ full |
| `caps/21-final-room/DEFAULTS.txt` | 100 | ✅ full (diffed against baseline) |
| `caps/21-final-room/IDENTICAL-TO-BASELINE.txt` | 2158 | ✅ header + tail read; **path lines recounted programmatically** |
| `caps/21-final-room/NODES-REMOVED-VS-BASELINE.txt` | 2 | ✅ full |

**Total: 5,752 stylesheet lines + 101 metadata/manifest lines + 6,922 capture-file lines.**

### Independently recomputed diff counts

I did not take INFO.txt's numbers on faith. Recount method: `tail -n +3 <IDENTICAL> | grep -c .`
(skip the 1 header + 1 blank line, count non-empty path lines), plus a `diff` of each
capture's `DEFAULTS.txt` against the baseline's.

| Capture | INFO.txt claims | My recount of IDENTICAL paths | nodes differing (from nodes-*.txt) | removed | DEFAULTS.txt vs baseline |
|---|---|---|---|---|---|
| 19 forced-darkTheme | 2155/2156 identical, 1 differing, 0 removed | **2155** ✔ | **1** — `#0 path=r <body>`, single `attr class` change ✔ | **0** ✔ | identical except capture label on line 1 |
| 20 forced-lightTheme | 2155/2156 identical, 1 differing, 0 removed | **2155** ✔ | **1** — `#0 path=r <body>`, single `attr class` change ✔ | **0** ✔ | identical except capture label on line 1 |
| 21 final-room | 2156/2156 identical, 0 differing, 0 removed | **2156** ✔ (and the list includes root path `r`, absent from 19/20 — the exact node that differed there) | **0** — no nodes file exists (`02-MANIFEST.txt:25` `nodeFiles=0`) ✔ | **0** ✔ | identical except capture label on line 1 |

**All three INFO.txt figures are confirmed.** 2155 + 1 = 2156 for both theme captures;
2156 + 0 = 2156 for final-room.

### Additional recomputations reported above

- `var(--` occurrences across all 15 sheets: **0**. Custom-property definitions: **0**.
- `darkTheme|lightTheme` matches across all 15 sheets: **0**.
- `theme` (case-insensitive) across all 15 sheets: **1** (`09.css:2565 .dark-theme-badge-id`).
- `09.css`: 2,573 non-header lines, **1,224 distinct** — the two-copy structure proven by
  `diff <(sed -n '2,1272p') <(sed -n '1273,2574p')` returning exactly 3 hunks.
- Sheet totals from `00-META.txt:62`–`76`: **4,498 rules, 434,385 bytes** of CSS text.
- `!important` count in `09.css` copy A: **299**.
- `@media` census: 20 distinct query strings across all sheets (§3.5).

### Not read (correctly — owned by other agents)

`caps/00-baseline-room/nodes-*.txt` (18 files), and every `caps/01`…`caps/18` subtree capture.
I did not open them, and no claim above depends on their contents. Where a question could only
be answered from them (§8 item 7 — is `class="dark"` actually on any node), I said so rather
than guessing.

---
