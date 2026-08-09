# prt2.json — Full Decode

Original source dump: `/Users/billyribeiro/Desktop/new-room/NEXT-STEP/prt2.json`; canonical
repository location: `evidence-dumps/NEXT-STEP/prt2.json` (9,414,539 bytes on disk;
decoder recorded `BYTES : 9407512` in `00-META.txt:2`)
Decoded slices: `/tmp/ptr-decode/prt2/` — 42 files, 20,654 lines.
Every claim below cites a slice file + line/record. Nothing is inferred from memory or from the sibling dump.

---

## Table of contents

1. [Page identity & shell](#1-page-identity--shell)
2. [Full region map](#2-full-region-map)
3. [Exhaustive component inventory](#3-exhaustive-component-inventory)
4. [All 4 tables in full](#4-all-4-tables-in-full)
5. [All 5 iframes](#5-all-5-iframes)
6. [All 3 forms + 12 inputs + 2 textareas + 5 labels](#6-all-3-forms--12-inputs--2-textareas--5-labels)
7. [Theme system](#7-theme-system)
8. [final-room vs baseline-room](#8-final-room-vs-baseline-room)
9. [Stylesheet inventory](#9-stylesheet-inventory)
10. [All text content verbatim (copy deck)](#10-all-text-content-verbatim-copy-deck)
11. [Data & assets](#11-data--assets)
12. [Honest gaps](#12-honest-gaps)
13. [Verification](#verification)

---

## 1. Page identity & shell

### 1.1 Capture metadata (`00-META.txt`)

| Field | Value | Cite |
|---|---|---|
| `dump.part` | `1` | `00-META.txt:3` |
| capture count | 5 | `00-META.txt:4` |
| `meta.capturedAt` | `2026-07-24T15:59:42.449Z` | `00-META.txt:5` |
| `meta.url` | `https://protradingroom.com/ptrApp#/page/welcome` | `00-META.txt:6` |
| `meta.ua` | `Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36` | `00-META.txt:7` |
| `meta.role` | `member` | `00-META.txt:8` |
| `meta.viewport` | `{"w":1842,"h":1265,"dpr":2}` | `00-META.txt:9` |
| `meta.errors` | `[]` (no capture errors) | `00-META.txt:10` |

Captures (`00-META.txt:13-17`):

| # | label | ts | nodes | truncated | themeClass | mode |
|---|---|---|---|---|---|---|
| 00 | `baseline-room` | 15:59:40.487Z | 882 | false | `"footer-hidden"` | FULL (`caps/00-baseline-room/INFO.txt:9`) |
| 01 | `forced-darkTheme` | 15:59:41.257Z | 882 | false | `"footer-hidden darkTheme"` | DIFF (`caps/01-forced-darkTheme/INFO.txt:9`) |
| 02 | `forced-lightTheme` | 15:59:42.049Z | 882 | false | `"footer-hidden lightTheme"` | DIFF (`caps/02-forced-lightTheme/INFO.txt:9`) |
| 03 | `final-room` | 15:59:42.441Z | 882 | false | `"footer-hidden"` | DIFF (`caps/03-final-room/INFO.txt:9`) |
| 04 | `__meta__` | — | — | — | null | metadata-only, no directory (`00-META.txt:17`) |

### 1.2 What this page actually is — reconciling `welcome` with the DOM

The capture harness labels the captures `baseline-room` / `final-room`, but **this is not a trading-room page**. The URL fragment is `#/page/welcome` (`00-META.txt:6`), and the DOM confirms it:

- The nav "Account" link is `href="#/page/welcome"` with `ui-sref="page.welcome"` and `tooltip="Account Settings"` (`caps/00-baseline-room/nodes-000.txt` #58, lines 1612-1620). The page therefore **is** the `page.welcome` state, and the app itself calls that state "Account Settings".
- The body content is an **owner/admin account dashboard**: a Sessions (rooms) list, a Badges manager, an Extra Admin Users manager, and an API Keys manager (`nodes-000.txt` #63 "Total : 1", #67 "Badges", #70 "Extra Admin Users", #73 "API Keys").
- A complete **login panel is present but `display:none`** because the user is logged in: `#44 path=r.0.1.1.0.1 <div class="panel ng-hide" ng-hide="login.isLoggedIn ">` with `display: none` (`nodes-000.txt:1258-1263`). Conversely the dashboard wrapper `#49 path=r.0.1.1.0.0.0 <div ng-show="login.isLoggedIn">` is `display: block` (`nodes-000.txt:1400-1405`).

So: **`#/page/welcome` is a dual-purpose route** — logged-out it renders the login card ("Login to your ProTradingRoom.com account", `nodes-000.txt` #61); logged-in it renders the account dashboard. This capture is the **logged-in dashboard** with the login card retained in the DOM but hidden.

Note the honest tension with `meta.role = member` (`00-META.txt:8`): the rendered UI is owner/admin-grade (Add Admin User, API keys, Badge management, "Manage" links into `#/page/manageSession/...`). The `role` field is capture-harness metadata, not something the DOM asserts. The DOM's own evidence for who is logged in is the JWT payload embedded in the Launch link (see §11.4): `"name":"[OWNER_JWT_NAME]","email":"[OWNER_EMAIL]","id":"[OWNER_USER_ID]","type":"site"`.

### 1.3 Body & shell chain

```
r            <body class="footer-hidden">                                    1842 × 1265
├─ r.0       <div data-ui-view data-autoscroll="false"
│               ng-controller="CoreController" class="app-container ng-scope"> 1842 × 1265
│  ├─ r.0.0  <div class="ng-fadeOutZoom ng-fluid ng-scope">                    1842 × 50    (header slot)
│  │  └─ r.0.0.0 <nav role="navigation" class="navbar topnavbar"
│  │               style="background-color: black;">                          1842 × 50
│  └─ r.0.1  <div ui-view autoscroll="false" class="ng-fluid ng-scope">        1842 × 1069.99 @ y=50
│     ├─ r.0.1.0 <style class="ng-scope">                                     display:none
│     ├─ r.0.1.1 <div ui-view autoscroll="false"
│     │            class="ng-fadeOutZoom ng-fluid ng-scope"
│     │            style="background-color: 0A0A0A" ng-init="showNewRoom=0;">  1842 × 1069.99
│     └─ r.0.1.2 <script src="https://www.google.com/recaptcha/api.js">        display:none
├─ r.1 … r.11   12 <script> tags                                              display:none, 0×0
├─ r.12, r.13, r.15  reCAPTCHA bubble containers (offscreen at y = −10000)
└─ r.14      <input type="file" ngf-select>                                   0×0, z-index −100000
```

Citations: body `nodes-000.txt` #0 (lines 3-27); `r.0` #1 (29-57); `r.0.0` #17 (442-461); `r.0.0.0` #31 (894-924); `r.0.1` #18 (463-484); `r.0.1.0` #32 (926-945); `r.0.1.1` #33 (947-970); `r.0.1.2` #34 (972-991); recaptcha containers #13/#14/#16 (284-441); file input #15 (366-399).

**Body computed style** (`nodes-000.txt` #0, style-deviations at lines 8-27; everything not listed = COMMON table in `caps/00-baseline-room/DEFAULTS.txt`):
`display:block · visibility:visible · 1842×1265px · padding 0 all sides · background-color rgb(255,255,255) · font-family "Helvetica Neue", Helvetica, Arial, sans-serif · font-size 14px · line-height 20px · text-align start · vertical-align baseline · overflow-x:auto · overflow-y:auto · cursor:auto · transition-property all · transition-duration 0s`.
The `overflow:auto` comes from inline sheet 14 (`01-stylesheets/14.css:2 body { overflow: auto; }`) overriding `styles.css` `body { overflow: hidden; height: 100% }` (`01-stylesheets/09.css:95`).

**Body attributes** (`nodes-000.txt:5-7`):
- `ng-class = "{\n 'layout-fixed': app.layout.isFixed,\n 'layout-boxed': app.layout.isBoxed,\n 'layout-dock': app.layout.isDocked,\n 'layout-material': app.layout.isMaterial,\n 'aside-offscreen': app.sidebar.isOffscreen,\n 'footer-hidden': app.footer.hidden,\n 'in-app': !$state.includes"` — **truncated by the capture** (see §12).
- `class = "footer-hidden"` — only `app.footer.hidden` is true. Consequence via `01-stylesheets/09.css:135-137`: `.footer-hidden .container-fh{bottom:0} .footer-hidden .app{padding-bottom:0} .footer-hidden .app-container > footer{display:none}` → **no app footer element exists in the DOM at all** (there is no `<footer>` node in the tag census).
- `cz-shortcut-listen = "true"` — injected by a browser extension (Chrome "cz" shortcut listener); not app markup.

**No sidebar / aside.** The tag census has no `<aside>`, `<header>`, `<footer>`, or `<section>` element. The shell here is header-nav + full-width content, i.e. the `container`-centred marketing/account layout, not the `app-fh` / `l-table` room layout that `styles.css` also defines.

---

## 2. Full region map

### 2.1 Visible-vs-hidden accounting (hard numbers)

| Measure | Count | Evidence |
|---|---|---|
| Total node records | **882** | `caps/00-baseline-room/INFO.txt:5`; 882 `#n path=` records across `nodes-000..007.txt` |
| Nodes with a **zero rect** (`w=0 h=0`) | **756** (85.7 %) | `rect:` lines matching `w=0 h=0` |
| Nodes with a **non-zero rect** | **126** (14.3 %) | complement |
| Nodes with `visibility: visible` | **208** | 208 style-deviation lines `visibility: visible`; COMMON is `hidden` at 674/882 (`DEFAULTS.txt:7`) |
| Nodes with `visibility: hidden` | **674** | `DEFAULTS.txt:7` — COMMON value |
| Nodes with `display: none` | **31** | 31 deviation lines `display: none` |
| Nodes using COMMON `display: inline-table` | **635** | `DEFAULTS.txt:6` |
| Non-zero-rect nodes **inside** the viewport (y ≥ 0) | **112** | 126 minus the 14 reCAPTCHA nodes parked at y = −10010 … −9984 |

**The dominant fact about this DOM:** 674 of 882 nodes (76 %) are `visibility:hidden`, and 635 of them are the **Intercom emoji-picker emoji `<span>`s** inside a popover that is `opacity:0; visibility:hidden`. The COMMON computed style in `DEFAULTS.txt` is literally the emoji-span style — `display:inline-table`, `width:30px`, `line-height:30px`, `font-size:28px`, `font-family:"Apple Color Emoji", "Segoe UI Emoji", NotoColorEmoji, "Segoe UI Symbol", "Android Emoji", EmojiSymbols`, `padding:5px`, `text-align:center`, `vertical-align:middle`, `cursor:pointer`, `transition: transform 0.06s` (`DEFAULTS.txt:6,16,38-41,65-66,69,71,77,87,90-91`), which matches `01-stylesheets/14.css:13 .intercom-emoji-picker-emoji {...}` exactly.
Of the 650 `<span>` elements in the page, **635 are hidden emoji glyphs**. Only 15 spans are page copy.

### 2.2 Region map in DOM order (every non-zero-rect node)

`x/y/w/h` in CSS px, from the `rect:` line of each record in `caps/00-baseline-room/nodes-*.txt`.

#### A. Off-screen / infrastructure (14 nodes, y ≈ −10000)

| # | path | tag | rect | what |
|---|---|---|---|---|
| 13 | `r.12` | div | 0, −10000, 2×2 | reCAPTCHA bubble shell #1 (`opacity:0`, `visibility:hidden`, `z-index:2000000000`) |
| 19 | `r.12.0` | div | 0, 0, 1842×1265 | full-viewport white scrim, `opacity:0.05`, `position:fixed` |
| 20 | `r.12.1` | div | 1, −10010, 22×22 | `.g-recaptcha-bubble-arrow` (11px transparent border) |
| 21 | `r.12.2` | div | 1, −10009, 20×20 | `.g-recaptcha-bubble-arrow` (10px) |
| 22 | `r.12.3` | div | 1, −9999, 0×0 | bubble body |
| 35 | `r.12.3.0` | iframe | 1, −9984, 0×0 | reCAPTCHA bframe |
| 14 | `r.13` | div | 0, −10000, 302×157 | reCAPTCHA bubble shell #2 |
| 23-26 | `r.13.0-.3` | div | scrim 1842×1265 / arrows 22×22, 20×20 / body 300×155 | as above |
| 36 | `r.13.3.0` | iframe | 1, −9999, 300×150 | reCAPTCHA bframe |
| 16 | `r.15` | div | 0, −10000, 302×157 | reCAPTCHA bubble shell #3 |
| 27-30 | `r.15.0-.3` | div | scrim / arrows / body 300×155 | as above |
| 37 | `r.15.3.0` | iframe | 1, −9999, 300×150 | reCAPTCHA bframe |

Cites: `nodes-000.txt` #13 (284-323), #14 (325-364), #16 (401-440), #19-#30 (486-892), #35-#37 (993-1087).

#### B. Header bar — y 0…50

| # | path | tag | rect | notes |
|---|---|---|---|---|
| 17 | `r.0.0` | div | 0, 0, 1842×50 | ui-view header slot, `class="ng-fadeOutZoom ng-fluid ng-scope"` |
| 31 | `r.0.0.0` | nav | 0, 0, 1842×50 | `.navbar.topnavbar`, `background-color: rgb(0,0,0)` (inline `style="background-color: black;"`), `min-height:50px`, `position:relative`, `::before`/`::after` = `content:" "` clearfix |
| 38 | `r.0.0.0.0` | div | 0, 0, 350×50 | `.navbar-header` — width 350px comes from app CSS `09.css:1137 .navbar-header{width:350px}`, `float:left`, `z-index:1` |
| 41 | `r.0.0.0.0.0` | div | 15, 0, 320×50 | `.navbar-brand` — margin 0 15px, `color rgb(250,250,250)`, `font-size 18px`, `line-height 50px`, `padding 0 5px` |
| 46 | `r.0.0.0.0.0.0` | a | 20, 14.5, 200×21 | `href=""`, inherits `color rgb(51,122,183)` (bootstrap link) |
| 57 | `r.0.0.0.0.0.0.0` | img | 20, 14.6, **199.992 × 24.539** | the ProTradingRoom logo |
| 39 | `r.0.0.0.1` | div | 0, 0, 1842×50 | `.nav-wrapper.collapse.navbar-collapse.in`, `collapse="headerMenuCollapsed"`, inline `height:auto`, padding 0 15px |
| 42 | `r.0.0.0.1.0` | ul | **1691.6**, 0, 150.43×50 | `.nav.navbar-nav.navbar-right.hidden-material`, `ng-show="login.isLoggedIn"`, `float:right`, `margin-right:-15px`, `list-style:none` |
| 47 | `r.0.0.0.1.0.0` | li | 1691.6, 0, 96.43×50 | float left |
| 58 | `r.0.0.0.1.0.0.0` | a | 1691.6, 0, 96.43×50 | **"Account"** — see §3.2 |
| 48 | `r.0.0.0.1.0.1` | li | 1788, 0, 54×50 | float left |
| 59 | `r.0.0.0.1.0.1.0` | a | 1788, 0, 54×50 | **Logout icon** — see §3.2 |

Cites: `nodes-000.txt` #17 (442), #31 (894), #38 (1089), #41 (1175), #46 (1319), #57 (1578), #39 (1119), #42 (1208), #47 (1344), #48 (1372), #58 (1612), #59 (1652).

#### C. Content column — y 50…1120

| # | path | tag | rect | notes |
|---|---|---|---|---|
| 18 | `r.0.1` | div | 0, 50, 1842×1069.99 | outer ui-view |
| 33 | `r.0.1.1` | div | 0, 50, 1842×1069.99 | inner ui-view; **inline `style="background-color: 0A0A0A"` is invalid CSS (missing `#`) and has no effect** — the node lists no `background-color` deviation, so it is the COMMON `rgba(0,0,0,0)` (`DEFAULTS.txt:58`). `ng-init="showNewRoom=0;"` |
| 40 | `r.0.1.1.0` | div | **336**, 50, **1170**×1069.99 | `.container.container-sm.animated.fadeInDown.ng-scope` — bootstrap `.container` at ≥1200px = 1170px wide (`02.css:429`), `margin-left/right 336px` (auto-centred in 1842), `padding 0 15px`, `transform: matrix(1,0,0,1,0,0)` (animate.css `fadeInDown` finished) |
| 43 | `r.0.1.1.0.0` | div | 351, **80**, 1140×948.992 | `.center-block.mt-xl` — `margin-top:30px` (`09.css:829 .mt-xl`) |
| 49 | `r.0.1.1.0.0.0` | div | 351, 80, 1140×948.992 | `ng-show="login.isLoggedIn"` — **the logged-in dashboard root** |
| 60 | `r.0.1.1.0.0.0.0` | div | 351, 80, 1140×948.992 | `ui-view`, `class="app ng-scope ng-fadeInLeft2"`, `ng-class="app.views.animation"`, padding `15px 15px 0 15px` |
| 44 | `r.0.1.1.0.1` | div | **0×0, display:none** | `.panel.ng-hide`, `ng-hide="login.isLoggedIn "` — the **login card** (see §6.1) |
| 45 | `r.0.1.1.0.2` | div | 351, **1029**, 1140×91 | `ng-include="'app/views/page.footer.html'"`, `class="p-lg text-center ng-scope"`, padding 15px |

Cites: `nodes-000.txt` #18 (463), #33 (947), #40 (1149), #43 (1236), #49 (1400), #60 (1690), #44 (1258), #45 (1298).

#### D. Dashboard sections (children of `r.0.1.1.0.0.0.0`, in order)

| child idx | # | path | tag | rect | region |
|---|---|---|---|---|---|
| `.0` | 63 | `…0.0` | h4 | 366, 105, 1110×19.797 | **"Total : 1"** + inline span "Sessions" |
| `.1` | 64 | `…0.1` | div.row | 351, 134.8, 1140×56 | **Sessions toolbar**: search box + Archived toggle |
| `.2` | 65 | `…0.2` | div.row | 351, 190.8, 1140×129 | **Sessions table row** (+ hidden "New Room" column) |
| `.3` | 66 | `…0.3` | hr | 366, 339.8, 1110×1 | separator, `border-top 1px solid rgb(238,238,238)` |
| `.4` | 67 | `…0.4` | h3 | 366, 360.8, 1110×26.398 | **"Badges"** |
| `.5` | 68 | `…0.5` | div.row | 351, 397.2, 1140×126 | **Badges section** (hidden editor panel + buttons + table) |
| `.6` | 69 | `…0.6` | hr | 366, 543.2, 1110×1 | separator |
| `.7` | 70 | `…0.7` | h3 | 366, 564.2, 1110×26.398 | **"Extra Admin Users"** |
| `.8` | 71 | `…0.8` | div.row | 351, 600.6, 1140×178 | **Admin users section** |
| `.9` | 72 | `…0.9` | hr | 366, 798.6, 1110×1 | separator |
| `.10` | 73 | `…0.10` | h3 | 366, 819.6, 1110×26.398 | **"API Keys"** |
| `.11` | 74 | `…0.11` | div.row | 351, 856, 1140×173 | **API keys section** |

(`…` = `r.0.1.1.0.0.0.0`.) Cites: `nodes-000.txt` #63 (1759), #64 (1784), #65 (1809), #66 (1834), #67 (1868), #68 (1893), #69 (1918), #70 (1952), #71 (1977), #72 (2002), #73 (2036), #74 (2061).

All four `.row` divs are `margin-left/right: -15px`, `width:1140px`, with clearfix `::before`/`::after` `content:" "`. All four `<hr>` are `box-sizing:content-box; height:0; margin 20px 0; border-top:1px solid rgb(238,238,238); border-right/bottom/left-color rgb(128,128,128); color rgb(128,128,128); overflow hidden`.

#### E. Section internals (visible only)

| # | path | tag | rect | detail |
|---|---|---|---|---|
| 77 | `…0.0.0` | span | 410.7, 104, 75×21.5 | "Sessions", `ng-click="showNewRoom=showNewRoom+1;"`, font 18px/19.8px, weight 500 |
| 78 | `…0.1.0` | div | 351, 134.8, 380×36 | `.col-md-4.panel.pane-default` — white panel, radius 4px, `box-shadow rgba(0,0,0,0.05) 0 1px 1px`, border 1px solid `rgba(0,0,0,0)` |
| 89 | `…0.1.0.0` | input | 367, 135.8, 348×34 | search box (see §6.4) |
| 79 | `…0.1.1` | button | 731, 134.8, 102.68×30 | "Archived" `.btn.btn-sm.btn-default` |
| 90 | `…0.1.1.0` | span | 742, 142.8, 30.4×14 | "Show" (`ng-show="!showArchivedRooms"`) |
| 91 | `…0.1.1.1` | span | 0×0 `display:none` | "Hide" (`ng-show="showArchivedRooms"`) |
| 80 | `…0.2.0` | div | 351, 190.8, 1140×109 | `.col-md-12.panel.pane-default` |
| 92 | `…0.2.0.0` | div | 367, 191.8, 1108×107 | `.table-responsive`, `overflow:auto`, `min-height:0.01%` |
| 111 | `…0.2.0.0.0` | table | 367, 191.8, 1108×107 | **Table 1 — Sessions** (§4.1) |
| 81 | `…0.2.1` | div | 0×0 `display:none` | `.col-md-2`, `ng-show="showNewRoom>=5"` — hidden "New Room" column (easter-egg gated on 5 clicks of "Sessions") |
| 93 | `…0.2.1.0` | a | 0×0 `display:block` (ancestor none) | "New Room" `.btn.btn-warning.mb.btn-block`, `ng-click="createNew()"` |
| 82 | `…0.5.0` | div | 0×0 `display:none` | `.panel.panel-default.col-md-6`, `ng-show="showAddBadge"` — badge editor panel |
| 83 | `…0.5.1` | div | 351, 397.2, **855**×106 | `.col-md-9.panel.pane-default` — badge toolbar + table |
| 96 | `…0.5.1.0` | a | 367, 398.2, 128.664×34 | "Add New Badge" `.btn.btn-warning.mb` |
| 97 | `…0.5.1.1` | a | 499.6, 398.2, 177.656×34 | "Upload Image Badge" `.btn.btn-info.mb`, `ngf-select` |
| 117 | `…0.5.1.1.0` | i | 512.6, 408.2, 15×14 | `.fa.fa-cloud-upload` white |
| 98 | `…0.5.1.2` | a | 681.1, 398.2, 119.078×34 | "Export Badges" `.btn.btn-default.mb`, `ng-click="exportBadges()"` |
| 99 | `…0.5.1.3` | h3 | 0×0 `display:none` | "No Badges defined", `ng-show="!badgesList"` |
| 100 | `…0.5.1.4` | div | 367, 442.2, 823×60 | `.table-responsive`, `ng-show="badgesList"`, `ng-init="showBadgeID=false"` |
| 118 | `…0.5.1.4.0` | table | 367, 442.2, 823×60 | **Table 2 — Badges** (§4.2) |
| 84 | `…0.8.0` | div | 351, 600.6, 1140×158 | `.col-md-12.panel.pane-default` |
| 101 | `…0.8.0.0` | button | 367, 601.6, 128.961×34 | "Add Admin User" `.btn.btn-success.mb` |
| 102 | `…0.8.0.1` | button | 0×0 `display:none` | "Close Add Admin User" `.btn.btn-secondary.mb` |
| 103 | `…0.8.0.2` | div | 0×0 `display:none` | `.panel.panel-default`, `ng-show="showAddAdminUser"`, `margin-top:15px` |
| 104 | `…0.8.0.3` | div | 367, 660.6, 1108×97 | `.table-responsive`, `margin-top:15px` |
| 121 | `…0.8.0.3.0` | table | 367, 660.6, 1108×97 | **Table 3 — Admin users** (§4.3) |
| 85 | `…0.11.0` | div | 351, 856, 1140×153 | `.col-md-12.panel.pane-default` |
| 105 | `…0.11.0.0` | div | 367, 857, 1108×151 | `.table-responsive` |
| 122 | `…0.11.0.0.0` | div.row | 352, 857, 1138×44 | button row, inline `margin-bottom:10px` |
| 152 | `…0.11.0.0.0.0` | div | 352, 857, 189.664×44 | `.col-md-2` |
| 179 | `…0.11.0.0.0.0.0` | button | 367, 857, 104.289×34 | "New Api key" `.btn.btn-success.mb`, `ng-click="createApiKey()"` |
| 153 | `…0.11.0.0.0.1` | div | 541.7, 857, 189.664×44 | `.col-md-2` |
| 180 | `…0.11.0.0.0.1.0` | a | 556.7, 857, 84.078×34 | "API Docs" `.btn.btn-primary.mb`, `target="_blank"` |
| 123 | `…0.11.0.0.1` | table | 367, 911, 1108×97 | **Table 4 — API keys** (§4.4) |

#### F. Page footer include (`r.0.1.1.0.2`, y 1029…1120)

| # | path | tag | rect | content |
|---|---|---|---|---|
| 51 | `r.0.1.1.0.2.0` | hr | 366, 1064, 1110×1 | separator |
| 52 | `r.0.1.1.0.2.1` | span | 838.3, 1086.5, 11.2×16.5 | `©` (`class="mr-sm ng-scope"`, margin-right 5px) |
| 53 | `r.0.1.1.0.2.2` | span | 858.4, 1086.5, 31.1×16.5 | `2026` — `ng-bind="app.year"` |
| 54 | `r.0.1.1.0.2.3` | span | 898.4, 1086.5, 105.3×16.5 | `ProTradingRoom` — `ng-bind="app.name"` |
| 55 | `r.0.1.1.0.2.4` | br | 1003.7, 1086.5, 0×16.5 | line break |
| 56 | `r.0.1.1.0.2.5` | span | 921, 1105, **0×0** | `.ng-binding.ng-scope` — **empty**, renders nothing (honest gap: the binding expression was not captured) |

Cites: `nodes-000.txt` #51 (1443), #52 (1476), #53 (1497), #54 (1519), #55 (1540), #56 (1559).

Content ends at y ≈ 1120 in a 1265-tall viewport → **≈145 px of empty white below the footer** (body background `rgb(255,255,255)`).

---

## 3. Exhaustive component inventory

Every property below is the node's *full* computed value = `caps/00-baseline-room/DEFAULTS.txt` COMMON table overridden by that node's printed `style-deviations`.

### 3.1 Top navbar (`r.0.0.0`, `nodes-000.txt` #31, lines 894-924)

| Property | Value |
|---|---|
| box | `x=0 y=0 w=1842 h=50`, `min-height:50px`, `position:relative`, `display:block` |
| background | `rgb(0, 0, 0)` (inline `style="background-color: black;"`) |
| padding / margin | 0 / 0 (`.topnavbar{margin-bottom:0}` `09.css:57`) |
| border / radius | none / 0 (`.topnavbar{border-radius:0;border:0}` `09.css:57`) |
| typography | `"Helvetica Neue", Helvetica, Arial, sans-serif` 14px / 20px, `text-align:start`, `color rgb(51,51,51)` (inherited default; children override) |
| z-index | `auto` on the nav; `.app-container > header{z-index:410}` does **not** apply — there is no `<header>` element |
| pseudo | `::before` and `::after` both `content:" "` (bootstrap clearfix, `02.css:1472`) |
| overflow | visible |

### 3.2 Nav items

**`.navbar-brand` `r.0.0.0.0.0`** (#41, 1175-1206): `320×50` at x=15; `margin: 0 15px` (`09.css:64` ≥768px); `padding: 0 5px`; `line-height:50px`; `font-size:18px`; `color rgb(250,250,250)`; `z-index:1`; `position:relative`.

**Logo `<img>` `r.0.0.0.0.0.0.0`** (#57, 1578-1610):
- attrs: `ng-hide="hideLogo || !sess.logoURL"`, `ng-src="/public/images/ptr_logo.png"`, `src="/public/images/ptr_logo.png"`, `height="35px"`, `class="brand-logo"`, `style="max-width: 200px; height: auto; max-height: 40px;"`
- computed: `display:inline-block`, `199.992 × 24.539`, `max-width:200px`, `max-height:40px`, `overflow:clip`, `color rgb(51,122,183)` (inherited from the `<a>`), `font-size:18px`, `line-height:50px`.
- Note the render is **width-constrained** (200 px cap) not height-constrained: natural aspect ⇒ 24.54 px tall.

**"Account" link `r.0.0.0.1.0.0.0`** (#58, 1612-1650):
- attrs: `href="#/page/welcome"` · `ui-sref="page.welcome"` · `style="color: #FFFFFF"` · `class="icon fa  fa-cog"` (note the double space) · `tooltip-placement="bottom"` · `tooltip="Account Settings"`
- text: `"Account"`
- computed: `display:block`, `96.4297 × 50`, `padding:15px` all sides, `color rgb(255,255,255)`, `font-family FontAwesome`, `font-size:14px`, `line-height:20px`, `border-*-color rgb(255,255,255)`, `outline-color rgb(255,255,255)`, `position:relative`, `list-style-type:none`, `transform: matrix(1,0,0,1,0,0)`.
- `::before`: `content:""` (fa-cog, rendered as a PUA glyph), `color rgb(255,255,255)`, `font-family FontAwesome`, `font-size:14px`, `background-color rgba(0,0,0,0)`.
- **Because `font-family: FontAwesome` is set on the `<a>` itself, the literal word "Account" is rendered in the FontAwesome font** — FontAwesome has no Latin glyphs mapped, so this text falls back per-glyph or renders as the browser's fallback. This is a real quirk of the original page, faithfully captured.

**Logout link `r.0.0.0.1.0.1.0`** (#59, 1652-1688):
- attrs: `href=""` · `ng-click="doLogout()"` · `style="color: #FFFFFF"` · `class="icon fa fa-2x fa-power-off"` · `tooltip-placement="bottom"` · `tooltip="Logout"` — **no text node**
- computed: `display:block`, `54 × 50`, `padding:15px`, `color rgb(255,255,255)`, `font-family FontAwesome`, `line-height:20px` (font-size = COMMON 28px via `.fa-2x{font-size:2em}` `10.css:5`).
- `::before`: `content:""` (fa-power-off), `font-size:28px`, white.

### 3.3 Panels (`.panel.pane-default`) — the four white cards

All four visible section panels (#78 sessions toolbar, #80 sessions table, #83 badges, #84 admin users, #85 api keys) share this computed box (e.g. #80, `nodes-000.txt:2240-2282`):

| Property | Value |
|---|---|
| display / position | `block` / `relative`, `float:left`, `min-height:1px` |
| padding | `0 15px 0 15px` (bootstrap grid column padding) |
| margin | `margin-bottom: 20px` |
| border | `1px solid rgba(0, 0, 0, 0)` on all 4 sides (transparent — `.panel{border:1px solid transparent}` `02.css:1291`) |
| radius | `4px` all corners |
| background | `rgb(255, 255, 255)` |
| box-shadow | `rgba(0, 0, 0, 0.05) 0px 1px 1px 0px` |
| typography | Helvetica Neue 14px / 20px, `text-align:start` |

Widths: `.col-md-4` → 380 px (#78), `.col-md-9` → 855 px (#83), `.col-md-12` → 1140 px (#80, #84, #85).
Note the class is `pane-default` (typo for `panel-default`) — it matches **no** CSS rule in any of the 15 sheets, which is why the borders stay transparent instead of `rgb(221,221,221)`.

The **hidden** panels do use the correct class and therefore would render with `border-color rgb(221,221,221)`: #82 `.panel.panel-default.col-md-6.ng-hide` (`nodes-000.txt:2312-2349`) and #103 `.panel.panel-default.ng-hide` (`nodes-000.txt:3036-3071`).

### 3.4 `.table-responsive` wrappers

#92 (1108×107), #100 (823×60), #104 (1108×97), #105 (1108×151): `display:block`, `max-width:100%`, `min-height:0.01%`, `overflow-x:auto`, `overflow-y:auto`, padding 0. (`02.css:675` + `09.css:53`.)

### 3.5 Buttons — complete inventory (12 `<button>` + 12 `<a>`)

| # | path | text | classes | rect | bg | border | color | font | radius | padding |
|---|---|---|---|---|---|---|---|---|---|---|
| 79 | `…0.1.1` | Archived | `btn btn-sm btn-default` | 731,134.8 102.68×30 | `rgb(255,255,255)` | 1px solid `rgb(230,233,238)` | inherit `rgb(51,51,51)` | 12px/18px | 3px | 5px 10px (v from `.btn-sm`) |
| 101 | `…0.8.0.0` | Add Admin User | `btn btn-success mb` | 367,601.6 128.961×34 | `rgb(92,184,92)` | 1px solid `rgb(76,174,76)` | `rgb(255,255,255)` | 14px/20px | 4px | 6px 12px |
| 102 | `…0.8.0.1` | Close Add Admin User | `btn btn-secondary mb ng-hide` | hidden | `rgb(239,239,239)` (UA default) | 1px solid `rgba(0,0,0,0)` | — | 14px/20px | 4px | 6px 12px |
| 130 | `…login…4.0` | Login | `btn btn-block btn-info mb` | hidden | `rgb(91,192,222)` | 1px solid `rgb(70,184,218)` | `rgb(255,255,255)` | 14px/20px | 4px | 6px 12px; `width:100%` |
| 141 | `…0.5.0.1.0.6` | Add New Badge | `btn btn btn-warning pull-right ng-binding` | hidden | `rgb(240,173,78)` | 1px solid `rgb(238,162,54)` | `rgb(255,255,255)` | 14px/20px | 4px | 6px 12px; `float:right` |
| 142 | `…0.5.0.1.0.7` | Save Edit for New Badge | `btn btn btn-primary pull-right ng-binding ng-hide` | hidden | `rgb(51,122,183)` | 1px solid `rgb(46,109,164)` | `rgb(255,255,255)` | 14px/20px | 4px | 6px 12px |
| 143 | `…0.5.0.1.0.8` | Close | `btn btn btn-default pull-right` | hidden | `rgb(255,255,255)` | 1px solid `rgb(230,233,238)` | — | 14px/20px | 4px | 6px 12px |
| 163 | `…0.5.0.1.0.0.2` | Transparent | `btn btn-tiny btn-default` | hidden | `rgb(255,255,255)` | 1px solid `rgb(230,233,238)` | — | 14px/20px | 4px | 6px 12px (`.btn-tiny` matches no rule) |
| 168 | `…0.5.0.1.0.0.7` | *(icon only)* `id="emoji-picker"` | `btn btn-default btn-sm` | hidden | `rgb(255,255,255)` | 1px solid `rgb(230,233,238)` | — | 12px/18px | 3px | ph 10px |
| 179 | `…0.11.0.0.0.0.0` | New Api key | `btn btn btn-success mb` | 367,857 104.289×34 | `rgb(92,184,92)` | 1px solid `rgb(76,174,76)` | `rgb(255,255,255)` | 14px/20px | 4px | 6px 12px |
| 206 | `…0.8.0.2.1.0.3.0` | Add Admin User (submit) | `btn btn-primary` | hidden | `rgb(51,122,183)` | 1px solid `rgb(46,109,164)` | `rgb(255,255,255)` | 14px/20px | 4px | 6px 12px |
| 207 | `…0.8.0.2.1.0.3.1` | Cancel | `btn btn-default` | hidden | `rgb(255,255,255)` | 1px solid `rgb(230,233,238)` | — | 14px/20px | 4px | 6px 12px |

Anchor-buttons and links:

| # | path | text | classes | rect | bg / border / color |
|---|---|---|---|---|---|
| 46 | `r.0.0.0.0.0.0` | *(wraps logo)* | — | 20,14.5 200×21 | transparent / — / `rgb(51,122,183)` |
| 58 | nav | Account | `icon fa  fa-cog` | 1691.6,0 96.43×50 | transparent / — / `rgb(255,255,255)` |
| 59 | nav | *(icon)* | `icon fa fa-2x fa-power-off` | 1788,0 54×50 | transparent / — / `rgb(255,255,255)` |
| 93 | `…0.2.1.0` | New Room | `btn btn btn-warning mb btn-block` | hidden | `rgb(240,173,78)` / 1px `rgb(238,162,54)` / white; `width:100%` |
| 96 | `…0.5.1.0` | Add New Badge | `btn btn btn-warning mb` | 367,398.2 128.664×34 | `rgb(240,173,78)` / 1px `rgb(238,162,54)` / white |
| 97 | `…0.5.1.1` | Upload Image Badge | `btn btn-info mb` | 499.6,398.2 177.656×34 | `rgb(91,192,222)` / 1px `rgb(70,184,218)` / white |
| 98 | `…0.5.1.2` | Export Badges | `btn btn btn-default mb` | 681.1,398.2 119.078×34 | `rgb(255,255,255)` / 1px `rgb(230,233,238)` / inherit |
| 156 | login form | Forgot your password? | `text-muted` | hidden | — / — / `rgb(119,119,119)`; `text-align:right` |
| 180 | `…0.11.0.0.0.1.0` | API Docs | `btn btn-primary mb` | 556.7,857 84.078×34 | `rgb(51,122,183)` / 1px `rgb(46,109,164)` / white |
| 226 | sessions td | Launch | `btn btn-sm btn-info` | 1073.6,260.8 76.914×30 | `rgb(91,192,222)` / 1px `rgb(70,184,218)` / white; 12px/18px; radius 3px |
| 227 | sessions td | Manage | `btn btn-sm btn-inverse` | 1154.4,260.8 81.547×30 | `rgb(54,63,69)` / 1px `rgb(54,63,69)` / white; 12px/18px; radius 3px |
| 228 | sessions td | Marketplace | `btn btn-sm btn-default ng-hide` | hidden | `rgb(255,255,255)` / 1px `rgb(230,233,238)` / inherit |

All `.btn` share `white-space:nowrap`, `user-select:none`, `transition-property:all`, `transition-duration:0s`, `appearance:none`, `outline:none !important` (`09.css:321`).

### 3.6 Headings

| # | tag | text | rect | font-size / line-height / weight | margins |
|---|---|---|---|---|---|
| 63 | h4 | "Total : 1" | 366,105 1110×19.797 | 18px / 19.8px / 500 | 10px top, 10px bottom |
| 67 | h3 | "Badges" | 366,360.8 1110×26.398 | 24px / 26.4px / 500 | 20px top, 10px bottom |
| 70 | h3 | "Extra Admin Users" | 366,564.2 1110×26.398 | 24px / 26.4px / 500 | 20/10 |
| 73 | h3 | "API Keys" | 366,819.6 1110×26.398 | 24px / 26.4px / 500 | 20/10 |
| 99 | h3 | "No Badges defined" | hidden | 24px / 26.4px / 500 | 20/10 |
| 112 | h3 | "New Badge" (`.panel-title`) | hidden | 16px / 17.6px / 500 | 0 |
| 113 | h3 | "Edit Badge" (`.panel-title.ng-hide`) | hidden | 16px / 17.6px / 500 | 0 |
| 114 | h4 | "Preview:" | hidden | 18px / 19.8px / 500 | 10/10 |
| 148 | h3 | "Add Admin User" (`.panel-title`) | hidden | 16px / 17.6px / 500 | 0 |

Heading `font-weight:500` and `line-height:1.1` come from `02.css:342`. Sizes from `02.css:350-351`.

### 3.7 Icons (5 `<i>` + 2 icon `<div>` + 2 feedback `<span>`)

| # | path | class | rect | glyph / colour |
|---|---|---|---|---|
| 117 | `…0.5.1.1.0` | `fa fa-cloud-upload` | 512.6,408.2 15×14 | `::before` FontAwesome 14px, `rgb(255,255,255)` |
| 195 | `…0.5.0.1.0.0.7#emoji-picker.0` | `fa fa-smile-o fa-1x` | hidden | FontAwesome 12px, `rgb(51,51,51)` |
| 232 | sessions Launch | `icon fa fa-external-link` | 1084.6,269.8 12×12 | FontAwesome 12px, white |
| 233 | sessions Manage | `icon fa fa-cogs` | 1165.4,269.8 12.859×12 | FontAwesome 12px, white |
| 234 | sessions Marketplace | `icon fa fa-credit-card` | hidden | FontAwesome 12px, `rgb(51,51,51)` |
| 218 | th "Session ID" | `icon fa fa-sort-alpha-asc` (div) | 449.9,214.8 13×14 | FontAwesome 14px, `rgb(51,51,51)`, `text-align:left` |
| 219 | th "Name" | `icon fa fa-sort-alpha-asc` (div) | 724,214.8 13×14 | FontAwesome 14px, `rgb(51,51,51)` |
| 125 | login email field | `fa fa-envelope form-control-feedback text-muted` (span) | hidden | FontAwesome 14px, `rgb(119,119,119)`; `position:absolute; top:10px; right:0; 34×34; pointer-events:none; z-index:2` |
| 127 | login password field | `fa fa-lock form-control-feedback text-muted` (span) | hidden | same box, `rgb(119,119,119)` |

All `<i>`/icon elements resolve `font-family: FontAwesome` from `10.css:3` `.fa{…font-family:FontAwesome;font-size:inherit;line-height:1;transform:translate(0,0)}`.

### 3.8 Images (3)

| # | path | src | rect | box |
|---|---|---|---|---|
| 57 | nav brand | `/public/images/ptr_logo.png` | 20,14.6 199.992×24.539 | `max-width:200px; max-height:40px; overflow:clip; display:inline-block` |
| 87 | login "logging in" | `app/img/ajax_loader.gif` | 0×0 (ancestor `display:none`) | `display:inline`, overflow clip |
| 133 | badge preview | `ng-src=""`, `alt=""`, `class="user-badge-img ng-hide"` | 0×0, `display:none` | `height:100%; max-height:20px; margin 0 4px` (`09.css:2564`) |

### 3.9 The Intercom emoji-picker overlay (the 635-span iceberg)

Root `#116 r.0.1.1.0.0.0.0.5.0.1.1` `class="intercom-composer-popover intercom-composer-emoji-popover"` (`nodes-000.txt:3350-3378`):
`position:absolute; right:10px; bottom:50px; z-index:2147483003; background rgb(255,255,255); border-radius 6px; box-shadow rgba(0,0,0,0.08) 0 1px 15px 1px; opacity:0; transition 0.2s; visibility:hidden` (visibility from COMMON). `right:10px` is the app override `09.css:1251 .intercom-composer-popover{right:10px !important}`.

Children:
- `#144 .intercom-emoji-picker` — `330 × 260` (`14.css:6`).
- `#145 .intercom-composer-popover-caret` — `0×0`, `border-top:8px solid rgb(255,255,255)`, `border-left/right:8px solid rgba(0,0,0,0)`, `bottom:-8px; left:20px; right:0`.
- `#170 .intercom-composer-popover-header` — `height:40px; top:0; left:20px; right:20px; border-bottom 1px solid rgb(237,239,241)`.
- `#196 input.intercom-composer-popover-input` — `placeholder="Search"`, `width:100%; height:40px; padding-left:25px; color rgb(110,122,137); font-family intercom-font,…; background-image url("https://js.intercomcdn.com/images/search@2x.9f02b9f3.png") no-repeat 0 12px / 16px 16px`.
- `#197 .intercom-composer-popover-body` — `position:absolute; inset 40px 0 5px; padding 0 20px; overflow-y:scroll`.
- `#229 .intercom-emoji-picker-groups` → **6 `.intercom-emoji-picker-group` blocks** (#235-#240), each `margin:10px -5px`.
- Group titles (`.intercom-emoji-picker-group-title`, `color rgb(184,195,202)`, 13px/18.571px, margin 5px): **"Frequently used"** (#241), **"People"** (#249), **"Nature"** (#428), **"Objects"** (#508), **"Places"** (#711), **"Symbols"** (#777).
- **635 `<span class="intercom-emoji-picker-emoji" title="…">` glyph spans**, records #242-#248, #250-#427, #429-#507, #509-#710, #712-#776, #778-#881. Each has **zero style deviations** — they are exactly the COMMON table.

Group sizes (counted from record ranges): Frequently used 7, People 178, Nature 79, Objects 202, Places 65, Symbols 104 → **635**.

---

## 4. All 4 tables in full

All four use `class="table table-striped table-bordered table-hover"`.
Shared cell metrics from `02.css:652-660` + `09.css:41`: `th` padding `20px 8px` (`!important` from `09.css:41`), `vertical-align:bottom`, `font-weight:700`; `td` padding `8px`, `vertical-align:top`; all borders `1px solid rgb(221,221,221)`; striped odd rows `rgb(249,249,249)`.

### 4.1 Table 1 — **Sessions** (`r.0.1.1.0.0.0.0.2.0.0.0`, #111)

Box: `x=367 y=191.8 w=1108 h=107`, `display:table`, `max-width:100%`, corner radii 3px on all four corners.

**thead** #131 (`367,191.8 1108×60.5`) → **tr** #159 (`60.5` tall, radii 3px top corners):

| col | # | text | width | align | extra |
|---|---|---|---|---|---|
| 1 | 185 | **Session ID** | 239.281 | left | `ng-click="sortByUUID()"`; `border-top-left-radius:3px`; contains sort icon #218 `.icon.fa.fa-sort-alpha-asc` at `449.9,214.8 13×14` |
| 2 | 186 | **Name** | 205.406 | center (`.text-center`) | `ng-click="sortByName()"`; contains sort icon #219 at `724,214.8 13×14` |
| 3 | 187 | **State** | 125.305 | center | — |
| 4 | 188 | **Users** | 128.102 | center | — |
| 5 | 189 | **Actions** | 409.906 | center | `border-top-right-radius:3px` |

**tbody** #132 (`367,252.3 1108×46.5`) → **1 data row**, #160 `r.0.1.1.0.0.0.0.2.0.0.0.1.0`:
`ng-repeat="s in login.sessions | filter: sessSearch"`, `ng-hide="s.isArchivedRoom && !showArchivedRooms"`, `class="ng-scope"`, `background-color rgb(249,249,249)` (striped), `46.5` tall, bottom corner radii 3px.

| col | # | rect | rendered content |
|---|---|---|---|
| 1 `<td>` | 190 | 367,252.3 239.281×46.5 | `<strong class="ng-binding">` **3625** (#220, `375,262.3 31.1×16.5`, 700 weight) · hidden `<span ng-show="s.isClonedRoom">` (#221) · hidden `<div ng-show="showNewRoom">` (#222) whose text is `")"` and which contains `<br>` (#230) and `<muted class="ng-binding">` (#231) with text `"( 6a628a99731b9f77ae9bf505 - ownerID: 6a628a98731b9f77ae9bf504"` |
| 2 `<td class="ng-binding">` | 191 | 606.3,252.3 205.406×46.5 | **Room 3625** |
| 3 `<td class="text-center">` | 192 | 811.7,252.3 125.305×46.5 | `<div class="label label-orange ng-binding" ng-hide="s.isArchivedRoom">` **open** (#223, `855.5,263.7 37.7×17.7`, bg `rgb(254,86,33)`, color white, 10.5px/10.5px, weight 700, padding `2.1px 6.3px 3.15px 6.3px`, radius 2.625px) · hidden `<div class="label label-warning ng-hide">` **archived** (#224, bg `rgb(240,173,78)`) |
| 4 `<td class="text-center">` | 193 | 937,252.3 128.102×46.5 | `<div class="text-muted ng-binding">` **1 / 2** (#225, `945.5,260.8 111.102×20`, colour `rgb(119,119,119)`) |
| 5 `<td class="">` | 194 | 1065.1,252.3 409.906×46.5 | **Launch** (#226) · **Manage** (#227) · hidden **Marketplace** (#228) — see §3.5 |

`<td>` #190 also carries `border-bottom-left-radius:3px`; #194 carries `border-bottom-right-radius:3px`.

**Reading of the data:** exactly one session exists (matching `h4` "Total : 1"); it is room **3625**, named **"Room 3625"**, state **open**, occupancy **1 / 2**, internal `_id` `6a628a99731b9f77ae9bf505`, `ownerID` `6a628a98731b9f77ae9bf504`.

### 4.2 Table 2 — **Badges** (`r.0.1.1.0.0.0.0.5.1.4.0`, #118)

Box: `x=367 y=442.2 w=823 h=60`; bottom corner radii 3px (no top radii — the header row supplies none here).

**thead** #146 (`823×60`) → **tr** #172 (`823×60`):

| col | # | text | width | align | extra |
|---|---|---|---|---|---|
| 1 | 198 | **Badge** | 387.094 | left | `ng-dblclick="showBadgeID=!showBadgeID;"` |
| 2 | 199 | **Actions** | 435.906 | center | — |

**tbody** #147: `x=367 y=502.2 w=823 **h=0**` — **zero rows rendered**.
The container #100 is `ng-show="badgesList"` and *is* displayed, while the "No Badges defined" heading (#99, `ng-show="!badgesList"`) is `display:none`. In Angular, an **empty array is truthy**, so `badgesList` is an empty array: the account has **0 badges**, but the empty-state message does not fire. That is a real bug in the reference page, reproduced faithfully here.

### 4.3 Table 3 — **Extra Admin Users** (`r.0.1.1.0.0.0.0.8.0.3.0`, #121)

Box: `x=367 y=660.6 w=1108 h=97`; bottom corner radii 3px.

**thead** #150 (`1108×60.5`) → **tr** #177:

| col | # | text | width | align |
|---|---|---|---|---|
| 1 | 208 | **Name** | 260.094 | left |
| 2 | 209 | **Email** | 252.570 | left |
| 3 | 210 | **Added** | 281.859 | left |
| 4 | 211 | **Actions** | 313.477 | center |

**tbody** #151 (`1108×36.5`) → **tr** #178 `ng-show="!adminUsers || adminUsers.length===0"`, bg `rgb(249,249,249)`, bottom radii 3px →
**td** #212 `colspan="4"`, `class="text-center text-muted"`, `1108×36.5`, colour `rgb(119,119,119)`, text **"No admin users added yet"**.

### 4.4 Table 4 — **API Keys** (`r.0.1.1.0.0.0.0.11.0.0.1`, #123)

Box: `x=367 y=911 w=1108 h=97`; bottom corner radii 3px.

**thead** #154 (`1108×60.5`) → **tr** #181:

| col | # | text | width | align |
|---|---|---|---|---|
| 1 | 213 | **_id** | 244.773 | left |
| 2 | 214 | **secret** | 403.141 | left |
| 3 | 215 | **Actions** | 460.086 | center |

**tbody** #155 (`1108×36.5`) → **tr** #182 `ng-show="!apiKeys || apiKeys.length===0"`, bg `rgb(249,249,249)` →
**td** #216 `colspan="3"`, `class="text-center text-muted"`, text **"No API keys yet"**.

Preceding the table (inside the same `.table-responsive` #105) is the button row #122 (`352,857 1138×44`, inline `margin-bottom:10px`) with two `.col-md-2` cells: **New Api key** (#179) and **API Docs** (#180).

---

## 5. All 5 iframes

Every iframe on the page is Google reCAPTCHA. **None** of them is application content (no video, no screen-share, no chat embed — this is the account page, not a room).

| # | path | title / name | src | rect | attrs |
|---|---|---|---|---|---|
| 35 | `r.12.3.0` | `title="recaptcha challenge expires in two minutes"`, `name="c-g8o2ifrad64d"` | `https://www.google.com/recaptcha/api2/bframe?hl=en&v=A7KpaEASfhDcK0nXxgQEyyYv&k=6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx&bft=0dAFcWeA4YbSQP1DurnKHZ3cEoiRDL6-QM4GOeI1w3Xu8NNITZpKY9_SvlEct1fp-xvB0KCgqwtFH6ltmvBtilk2sLo5IXAKB0yw` | `x=1 y=-9984 0×0` | `frameborder="0"`, `scrolling="no"`, `style="width:0px;height:0px;"`, sandbox ↓ |
| 36 | `r.13.3.0` | same title, `name="c-nso17np7r7zv"` | `…bframe?…&bft=0dAFcWeA5K94K7q-ETS5tRqpX3jOra9hYzhiknfrb0JbudetKvrQRlyF_lQaSFN7qHI9zaxdpAQacIcZhPrNy6BV_N5UvYavBRZA` | `x=1 y=-9999 300×150` | `style="width:100%;height:100%;"` |
| 37 | `r.15.3.0` | same title, `name="c-4ecrn9oay2le"` | `…bframe?…&bft=0dAFcWeA7uzktQT7KX2xKy2Nl49PCiZKU1s-Z8oObOyaItOzpiEFJwJbOVjg7gdwDT3xhh7K9qU6IEAhkbZSib8tJmlyaOLgCr3g` | `x=1 y=-9999 300×150` | `style="width:100%;height:100%;"` |
| 158 | `r.0.1.1.0.1.0.1.0.0.3.0.1` | *(no title/name)* | *(no src attribute captured)* | `0×0`, `display:none` | `style="display: none;"`; UA default `border:2px inset` |
| 217 | `r.0.1.1.0.1.0.1.0.0.3.0.0.0` | `title="reCAPTCHA"`, `name="a-4ecrn9oay2le"`, `role="presentation"` | `https://www.google.com/recaptcha/api2/anchor?ar=1&k=6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx&co=aHR0cHM6Ly9wcm90cmFkaW5ncm9vbS5jb206NDQz&hl=en&v=A7KpaEASfhDcK0nXxgQEyyYv&size=normal&anchor-ms=20000&execute-ms=30000&cb=b47umiriyero` | `0×0` (ancestor `display:none`); `width="304" height="78"`, computed `304×78` | `frameborder="0"`, `scrolling="no"` |

**Sandbox attribute (identical on #35, #36, #37, #217):**
`allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation allow-modals allow-popups-to-escape-sandbox allow-storage-access-by-user-activation`

Site key (all): `6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx` — also on the `.g-recaptcha` div #129 `data-sitekey` (`nodes-001.txt:284`).
`co=` decodes (base64) to `https://protradingroom.com:443`.
Widget host: #157 `r.0.1.1.0.1.0.1.0.0.3.0.0` `style="width: 304px; height: 78px;"` (`nodes-001.txt:1059-1078`).

Cites: `nodes-000.txt` #35 (993-1023), #36 (1025-1055), #37 (1057-1087); `nodes-001.txt` #158 (1080-1108), #217 (2796-2829).

---

## 6. All 3 forms + 12 inputs + 2 textareas + 5 labels

### 6.1 Form 1 — **Login** (`r.0.1.1.0.1.0.1`, #62)

Container chain: `#44 .panel.ng-hide[ng-hide="login.isLoggedIn "]` → `#50 .panel-body` → `#61 <p class="pv text-bold">` "Login to your ProTradingRoom.com account" (font-weight 700, padding 10px 0, margin-bottom 10px) → `#62 <form>`.

Form attrs: `role="form"`, `class="ng-pristine ng-valid ng-valid-email"`, **`ng-submit="submitLogin()"`**. No `action`/`method` attributes. (`nodes-000.txt:1737-1757`.)

Structure (`#75 .row` → `#86 .col-md-6`):

| # | element | id | type | placeholder | ng-model | validation | notes |
|---|---|---|---|---|---|---|---|
| 106 | `div.form-group.has-feedback.mb` | — | — | — | — | — | `position:relative; margin-bottom:10px` |
| 124 | `<input>` | `exampleInputEmail1` | `email` | `Your email` | `signup.email` | class carries `ng-valid-email`; `autocomplete="off"`, `autocorrect="off"` | `.form-control`: `width:100%; height:34px; padding 6px 42.5px 6px 18px` (right padding from `.has-feedback`), border `1px solid rgb(219,217,217)`, radius 4px, bg white, colour `rgb(85,85,85)`, `box-shadow rgb(0,0,0) 0 0 0 0` (app override `09.css:33`), `transition border-color,box-shadow 0.15s` |
| 125 | `<span>` | — | — | — | — | — | `fa fa-envelope form-control-feedback text-muted` (see §3.7) |
| 107 | `<br>` | — | — | — | — | — | — |
| 108 | `div.form-group.has-feedback` | — | — | — | — | — | `margin-bottom:15px` |
| 126 | `<input>` | `exampleInputPassword1` | `password` | `Your password` | `signup.pass` | — | same `.form-control` metrics |
| 127 | `<span>` | — | — | — | — | — | `fa fa-lock form-control-feedback text-muted` |
| 128 | `div.text-right.mt` | — | — | — | — | — | `margin-top:10px; text-align:right` |
| 156 | `<a>` | — | — | — | — | — | `ui-sref="page.forgot-password"`, `href="#/page/forgot-password"`, `class="text-muted"`, text **"Forgot your password?"**, colour `rgb(119,119,119)` |
| 109 | `div.form-group.has-feedback.ng-hide` | — | — | — | — | **`ng-show="failedLoginCount >= 3"`** | the reCAPTCHA gate |
| 129 | `div.g-recaptcha` | — | — | — | — | `data-sitekey="6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx"` | hosts #157 → #217 iframe + #158 iframe |
| 184 | `<textarea>` | `g-recaptcha-response-4` | — | — | — | `name="g-recaptcha-response"` | `class="g-recaptcha-response"`, inline `width:250px;height:40px;border:1px solid rgb(193,193,193);margin:10px 25px;padding:0;resize:none;display:none` |
| 110 | `div.form-group.has-feedback` | — | — | — | — | — | `margin-bottom:15px` |
| 130 | `<button>` | — | `submit` | — | — | — | text **"Login"**, `btn btn-block btn-info mb`, `width:100%` |

Also inside the login card but outside the form: `#76 div.div.ng-hide[ng-show="loggingIn"]` `style="padding: 25px; text-align: center"` containing `#87 <img src="app/img/ajax_loader.gif">` and `#88 <label>` **"Logging In, please wait..."**.

### 6.2 Form 2 — **Badge editor** (`r.0.1.1.0.0.0.0.5.0.1.0`, #115)

Inside hidden panel `#82 .panel.panel-default.col-md-6.ng-hide[ng-show="showAddBadge"]`, whose `.panel-heading` #94 contains `h3.panel-title[ng-show="badges.mode=='add'"]` **"New Badge"** (#112), `h3.panel-title.ng-hide[ng-show="badges.mode=='edit';"]` **"Edit Badge"** (#113), `h4` **"Preview:"** (#114), badge preview `<img class="user-badge-img ng-hide" ng-show="badges.hasOwnProperty('imgURL') && badges.imgURL" ng-src="" alt="">` (#133), and preview chip `<span ng-hide="badges.hasOwnProperty('imgURL') && badges.imgURL" class="label ng-binding" style="background-color: #ffcc00; color: #FFFFFF">` **"New Badge"** (#134; computed bg `rgb(255,204,0)`, colour `rgb(255,255,255)`, `font-size:13.5px`, `line-height:13.5px`, weight 700, padding `2.7px`, radius `3.375px`, `margin-right:-4px` from `09.css:1255 span.label`).

Form attrs: `class="ng-pristine ng-valid"` — **no `ng-submit`, no `action`, no `method`** (submission is via the buttons' `ng-click`). (`nodes-000.txt:3330-3348`.)

Fields, in DOM order (all inside `#135 <div ng-hide="badges.hasOwnProperty('imgURL') && badges.imgURL">` and its siblings):

| # | element | id | type | value / placeholder | ng-model | computed box |
|---|---|---|---|---|---|---|
| 161 | `<span>` | — | — | text **"Background:"** | — | inline |
| 162 | `<input>` | — | `color` | — | `badges.bkcolor` | `50×27`, `display:inline-block`, border `1px solid rgb(0,0,0)`, bg `rgb(239,239,239)`, padding `1px 2px`, `appearance:auto` |
| 163 | `<button>` | — | — | text **"Transparent"** | `ng-click="badges.bkcolor='rgba(1,0,0,0)';"` | `.btn.btn-tiny.btn-default` |
| 164 | `<span>` | — | — | text **"Text:"** | — | inline |
| 165 | `<input>` | — | `color` | — | `badges.color` | as #162 |
| 166 | `<span>` | — | — | text **"Badge Text:"** | — | inline |
| 167 | `<input>` | `badgeInputTxt` | `text` | `value="TEST"` | `badges.text` | `class="input-emoji-txt …"`, UA-default box: border `2px inset rgb(118,118,118)`, padding `1px 2px`, bg white |
| 168 | `<button>` | `emoji-picker` | — | *(icon `#195 .fa.fa-smile-o.fa-1x`)* | — | `.btn.btn-default.btn-sm` |
| 169 | `<hr>` | — | — | — | — | margin `20px auto` |
| 136 | `<span>` | — | — | text **"Name:"** | — | inline |
| 137 | `<input>` | `badgeNameTxt` | `text` | `value=""`, `placeholder="Badge Name"` | `badges.name` | `class="input-name-txt …"`, UA-default box |
| 138 | `<label>` | — | — | text **"Auto assign this badge to this WP roles (comma separated):"** | — | `display:inline-block; max-width:100%; margin-bottom:5px; font-weight:700` |
| 139 | `<textarea>` | `badgeRolesTxt` | `type="text"` (invalid on textarea) | `cols="70" rows="2"` | `badges.roles` | `class="input-text …"`, border `1px solid rgb(118,118,118)`, padding 2px, `white-space:pre-wrap`, `overflow-wrap:break-word`, `overflow:auto`, `resize:both`, `appearance:auto` |
| 140 | `<hr>` | — | — | — | — | margin `20px auto` |
| 141 | `<button>` | — | `button` | text **"Add New Badge"** | `ng-click="addBadge(false)"`, `ng-show="badges.mode=='add'"` | `.btn.btn-warning.pull-right` |
| 142 | `<button>` | — | `button` | text **"Save Edit for New Badge"** | `ng-click="addBadge(true); showAddBadge=false;"`, `ng-show="badges.mode=='edit'"` | `.btn.btn-primary.pull-right.ng-hide` |
| 143 | `<button>` | — | `button` | text **"Close"** | `ng-click="badges.badgeID=''; badges.mode='add'; showAddBadge=false;"` | `.btn.btn-default.pull-right` |

### 6.3 Form 3 — **Add Admin User** (`r.0.1.1.0.0.0.0.8.0.2.1.0`, #149)

Inside hidden panel #103 (`ng-show="showAddAdminUser"`), heading #148 `h3.panel-title` **"Add Admin User"**.
Form attrs: **`ng-submit="addAdminUser()"`**, `class="ng-pristine ng-invalid ng-invalid-required ng-valid-email"` — i.e. the form is currently **invalid because required fields are empty**. No `action`/`method`. (`nodes-001.txt:874-893`.)

| group # | label # / text | input # | type | placeholder | ng-model | required |
|---|---|---|---|---|---|---|
| 173 `.form-group` | 200 **"Name"** | 201 | `text` | `Enter name` | `adminUser.name` | **yes** (`required=""`; class `ng-invalid-required`) |
| 174 `.form-group` | 202 **"Email"** | 203 | `email` | `Enter email` | `adminUser.email` | **yes** (class `ng-valid-email ng-valid-required`) |
| 175 `.form-group` | 204 **"Password"** | 205 | `password` | `Enter password` | `adminUser.password` | **yes** |
| 176 `.form-group` | — | 206 `<button type="submit">` **"Add Admin User"** `.btn.btn-primary`; 207 `<button type="button">` **"Cancel"** `.btn.btn-default` with `ng-click="showAddAdminUser=false; adminUser={name:'',email:'',password:'',perms:{}}"` | | | | |

Each `.form-group` is `margin-bottom:15px`. All three inputs are `.form-control` (`width:100%; height:34px; padding 6px 18px`; border `1px solid rgb(219,217,217)`; radius 4px; colour `rgb(85,85,85)`).
Note `adminUser` also carries a `perms:{}` object (from the Cancel reset expression) that has **no UI in this capture** — an honest gap: permissions editing exists in the data model but is not rendered here.

### 6.4 The 12 `<input>` elements — complete list

| # | path | id | type | placeholder / value | ng-model | visible? |
|---|---|---|---|---|---|---|
| 15 | `r.14` | — | `file` | — | — | no — `visibility:hidden; position:absolute; width:0;height:0; z-index:-100000; tabindex="-1"`; `ngf-select`, `ngf-change="onImageSelect($files, '')"` |
| 89 | `…0.1.0.0` | — | `text` | `placeholder="search"` | **`sessSearch`** | **YES** — `367,135.8 348×34`, `.form-control` |
| 124 | login | `exampleInputEmail1` | `email` | `Your email` | `signup.email` | no (login card hidden) |
| 126 | login | `exampleInputPassword1` | `password` | `Your password` | `signup.pass` | no |
| 137 | badge form | `badgeNameTxt` | `text` | `Badge Name` / `value=""` | `badges.name` | no |
| 162 | badge form | — | `color` | — | `badges.bkcolor` | no |
| 165 | badge form | — | `color` | — | `badges.color` | no |
| 167 | badge form | `badgeInputTxt` | `text` | `value="TEST"` | `badges.text` | no |
| 196 | intercom popover | — | *(no type ⇒ text)* | `placeholder="Search"`, `value=""` | — | no (`visibility:hidden`) |
| 201 | admin form | — | `text` | `Enter name` | `adminUser.name` | no |
| 203 | admin form | — | `email` | `Enter email` | `adminUser.email` | no |
| 205 | admin form | — | `password` | `Enter password` | `adminUser.password` | no |

**Only one input is on screen: the sessions search box.**

### 6.5 The 2 `<textarea>` elements

| # | path | id | attrs | computed |
|---|---|---|---|---|
| 139 | `…0.5.0.1.0.4` | `badgeRolesTxt` | `class="input-text ng-pristine ng-untouched ng-valid"`, `type="text"`, `ng-model="badges.roles"`, `cols="70"`, `rows="2"` | `display:inline-block`, border `1px solid rgb(118,118,118)`, padding 2px, `resize:both`, `appearance:auto`, `white-space:pre-wrap` |
| 184 | login/recaptcha | `g-recaptcha-response-4` | `name="g-recaptcha-response"`, `class="g-recaptcha-response"` | `display:none`, `250×40`, `margin 10px 25px`, border `1px solid rgb(193,193,193)`, `resize:none` |

### 6.6 The 5 `<label>` elements

| # | path | text | style |
|---|---|---|---|
| 88 | login "logging in" block | `Logging In, please wait...` | `display:inline-block; max-width:100%; margin-bottom:5px; font-weight:700; cursor:default` |
| 138 | badge form | `Auto assign this badge to this WP roles (comma separated):` | same |
| 200 | admin form | `Name` | same |
| 202 | admin form | `Email` | same |
| 204 | admin form | `Password` | same |

None of the five has a `for` attribute — labels are positional only (accessibility gap in the original).

---

## 7. Theme system

### 7.1 CSS custom properties: **none**

`00-META.txt:20-23` records `cssVars` for all four captures as:
```
[00] baseline-room:     {"root":{},"body":{}}
[01] forced-darkTheme:  {"root":{},"body":{}}
[02] forced-lightTheme: {"root":{},"body":{}}
[03] final-room:        {"root":{},"body":{}}
```
Both `:root` and `body` expose **zero** custom properties. Independently confirmed against the stylesheets: `grep -c 'var(--' 01-stylesheets/*.css` returns 0 for all 15 files.

**Conclusion: the app does not use CSS custom properties at all.** Every colour in this page is a literal `rgb()`/`rgba()` in bootstrap.min.css or styles.css, or a literal in an inline `style=` attribute.

### 7.2 Forcing `darkTheme` changes **nothing**

`caps/01-forced-darkTheme/INFO.txt:10-12`: 855/882 identical, 27 differing, 0 removed.
The 27 "differing" records are `caps/01-forced-darkTheme/nodes-000.txt` and break down as:

1. **#0 `<body>`** — the only real change: `attr class: "footer-hidden" -> "footer-hidden darkTheme"` (`nodes-000.txt:4`).
2. **The other 26 records are false positives.** Each prints only `::before` / `::after` before-and-after values that are **byte-identical**. Verified with `od -c` on line 7 of that file: both sides are exactly `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`. This is a decoder artifact (object-identity comparison instead of deep equality), not a rendering difference.

**Zero computed-style properties change on any node, and zero rects change.** Corroborating evidence: `caps/01-forced-darkTheme/DEFAULTS.txt` lines 5-100 are **byte-identical** to `caps/00-baseline-room/DEFAULTS.txt` lines 5-100 (verified by `diff`). If any node's colour, background, or box had changed, the COMMON-value/count columns would shift.

### 7.3 Forcing `lightTheme` changes **nothing** — and the two diffs are the same file

`caps/02-forced-lightTheme/INFO.txt:10-12`: 855/882 identical, 27 differing, 0 removed.
`caps/02-forced-lightTheme/nodes-000.txt` is **byte-identical** to `caps/01-forced-darkTheme/nodes-000.txt` after normalising `darkTheme`↔`lightTheme` and the capture index — verified by `diff` (only line 1 differs, `capture[1]` vs `capture[2]`).
`caps/02-forced-lightTheme/IDENTICAL-TO-BASELINE.txt` is byte-identical to the dark one.
`caps/02-forced-lightTheme/DEFAULTS.txt` (lines 5-100) is byte-identical to baseline's.

### 7.4 Why nothing changes — the mechanism, from the stylesheets

`grep 'darkTheme\|lightTheme' 01-stylesheets/*.css` → **zero matches in all 15 stylesheets**. There is no selector anywhere that reacts to a `darkTheme` or `lightTheme` class on `<body>` (or anywhere else).

What the app **does** have is a per-element `.dark` / `.light` class, defined in `styles.css` and scoped to room/chat components (`01-stylesheets/09.css`):

| line | rule |
|---|---|
| 1195 | `.dark { background-color: black; color: white; }` |
| 1196 | `.light { }` — **empty rule** |
| 1197 | `div.l-row.dark { background-color: black; color: rgb(224, 224, 224); }` |
| 1198 | `div.l-row.dark a { color: rgb(208, 208, 208); }` |
| 1199 | `div.chatHeader.dark { color: rgb(136,136,136); background-color: rgb(72,72,72); border: none; }` |
| 1200 | `div.p.bt.dark { color: rgb(136,136,136); background-color: rgb(72,72,72); border: none; }` |
| 1201 | `input.form-control.dark, .btn.btn-default.dark { background-color: rgb(0, 0, 0); }` |
| 1131-1132 | `.dark .chat-msg-txt a:hover {color: rgb(0,0,255)} / a:visited,a:link {color: rgb(50,176,213)}` |
| 1158 | `li.chatUpvoted.light { border: 2px solid rgb(0,0,0); }` |
| 2565 | `.dark-theme-badge-id { font-size: 10px; }` |

None of those selectors matches any node on this page (there is no `.l-row`, `.chatHeader`, `.chat-msg-txt`, or element carrying `.dark`/`.light` in the 882-node dump).

### 7.5 Colour-token map — baseline → dark → light

| Token / surface | baseline | forced dark | forced light | source |
|---|---|---|---|---|
| body background | `rgb(255,255,255)` | `rgb(255,255,255)` | `rgb(255,255,255)` | `nodes-000.txt` #0; unchanged in diffs |
| navbar background | `rgb(0,0,0)` | `rgb(0,0,0)` | `rgb(0,0,0)` | inline `style="background-color: black"` #31 |
| navbar text/icons | `rgb(255,255,255)` | unchanged | unchanged | inline `style="color: #FFFFFF"` #58/#59 |
| brand text colour | `rgb(250,250,250)` | unchanged | unchanged | `09.css:62` |
| default body text | `rgb(51,51,51)` | unchanged | unchanged | `02.css:327` |
| muted text | `rgb(119,119,119)` | unchanged | unchanged | `02.css:369` |
| panel background | `rgb(255,255,255)` | unchanged | unchanged | `02.css:1291` |
| table border | `rgb(221,221,221)` | unchanged | unchanged | `02.css:659` |
| striped row | `rgb(249,249,249)` | unchanged | unchanged | `02.css:661` |
| hr | `rgb(238,238,238)` | unchanged | unchanged | `02.css:338` |
| btn-default border | `rgb(230,233,238)` | unchanged | unchanged | `09.css:323` |
| label "open" | `rgb(254,86,33)` on white text | unchanged | unchanged | `09.css:2359 .label-orange` |
| btn-inverse ("Manage") | `rgb(54,63,69)` | unchanged | unchanged | `09.css:1602` |

**Which theme does baseline correspond to?** Neither — `baseline-room` has `themeClass "footer-hidden"` with **no theme class at all** (`00-META.txt:13`), and the page renders in the app's single, hard-coded light-on-white palette with a black navbar. There is no dark variant of this page in the reference. Rebuilding it needs exactly one visual theme.

---

## 8. `final-room` vs `baseline-room`

`caps/03-final-room/INFO.txt:10-12`: **856/882 identical, 26 differing, 0 removed.**

The 26 differing records in `caps/03-final-room/nodes-000.txt` are **exactly the 26 false-positive pseudo-element records** from the theme diffs (#31, #38, #39, #40, #42, #50, #58, #59, #64, #65, #68, #71, #74, #75, #95, #117, #120, #122, #125, #127, #195, #218, #219, #232, #233, #234). Every one prints byte-identical before/after values.

Verified: `diff caps/01-forced-darkTheme/IDENTICAL-TO-BASELINE.txt caps/03-final-room/IDENTICAL-TO-BASELINE.txt` shows only two changes — the header count line (855→856) and the addition of `r` (the `<body>` node) to the identical list.

**Implication:** between the baseline capture at `15:59:40.487Z` and the final capture at `15:59:42.441Z` (1.954 s later), **the page did not change at all**. The capture harness applied `darkTheme`, then `lightTheme`, then removed both, and the DOM returned byte-for-byte to the baseline state — `<body class="footer-hidden">`, same 882 nodes, same rects, same computed styles, same text. No async data arrived, no animation advanced, no socket message mutated the view.

Path-set integrity check (run over the slices): for dark, 855 identical paths + 27 differing paths = the full 882 baseline path set; for final, 856 + 26 = 882. No node was added or dropped in any capture.

---

## 9. Stylesheet inventory

15 sheets, in load order (`00-META.txt:26-40`). "Rules" = `ruleCount` the decoder read from `cssRules`.

| # | file | href | rules | bytes | role | drives this page? |
|---|---|---|---|---|---|---|
| 00 | `01-stylesheets/00.css` | (inline) | 2 | 78 | video.js sizing shim: `.video-js{width:300px;height:150px}`, `.vjs-fluid{padding-top:56.25%}` | **no** (no video on this page) |
| 01 | `01.css` | (inline) | 2 | 169 | AngularJS bootstrap css: `[ng-cloak]…{display:none!important}`, `ng\:form{display:block}` | yes — the `.ng-hide` rule here is what hides all 31 `display:none` nodes |
| 02 | `02.css` | `https://protradingroom.com/public/app/css/bootstrap.min.css` | 1187 | 134,760 | **Bootstrap 3.3.x** (normalize + grid + type + tables + forms + buttons + navbar + panels + labels + modals + utilities) | **YES — primary** |
| 03 | `03.css` | `https://vjs.zencdn.net/7.3.0/video-js.min.css` | 0 | 12 | **CORS-BLOCKED** — rules unreadable | no |
| 04 | `04.css` | `…/vendor/angularjs-color-picker/angularjs-color-picker.min.css` | 48 | 30,377 | colour-picker widget (`.color-picker-*`) | no — no `.color-picker-wrapper` node exists |
| 05 | `05.css` | `…/angularjs-color-picker-bootstrap.min.css` | 3 | 254 | colour-picker bootstrap skin | no |
| 06 | `06.css` | `…/vendor/angular-xeditable/dist/css/xeditable.min.css` | 23 | 2,643 | inline-edit widget (`.editable-*`, `.popover-wrapper`) | no — but `09.css:1194` overrides `.editable-click{color:rgb(10,10,10)}` |
| 07 | `07.css` | `https://cdnjs.cloudflare.com/…/angularjs-toaster/2.2.0/toaster.min.css` | 0 | 12 | **CORS-BLOCKED** | no |
| 08 | `08.css` | `…/vendor/textAngular/src/textAngular.css` | 26 | 3,412 | rich-text editor + a second `.popover` definition | no |
| 09 | `09.css` | `https://protradingroom.com/public/app/css/styles.css` | 2290 | 195,160 | **the app theme** — layout shell (`.app-container`, `.app-fh`, `.l-table`), colour utilities (`.bg-*`, `.text-*`, `.br-*`), spacing utilities (`.m*`, `.p*`), buttons, switches, chat/room components, settings drawer, webcam/presentation, badges | **YES — primary** |
| 10 | `10.css` | `…/vendor/font-awesome/css/font-awesome.min.css` | 551 | 24,767 | **Font Awesome 4.3.0** (`@font-face FontAwesome`, `.fa`, 500+ `.fa-*::before`) | **YES** — every icon on the page |
| 11 | `11.css` | `…/vendor/feather/webfont/feather-webfont/feather.css` | 135 | 5,946 | Feather icon webfont (`[class^="icon-"]{font-family:feather}`) | **partly / conflicting** — see note below |
| 12 | `12.css` | `…/vendor/animate.css/animate.min.css` | 226 | 36,536 | animate.css keyframes | **yes** — `.animated.fadeInDown` on the content container (#40) |
| 13 | `13.css` | (inline) | 4 | 235 | videojs-youtube shims (`.vjs-youtube …`) | no |
| 14 | `14.css` | (inline) | 15 | 4,353 | **Intercom composer/emoji-picker styles** + `body{overflow:auto}` | **YES** — defines the 635-span popover and overrides body overflow |

**Sheet-11 conflict (real, and it matters for a rebuild):** `11.css:4` sets `[class^="icon-"], [class*=" icon-"] { font-family: feather; }`. Several page elements carry `class="icon fa fa-…"` (#58, #59, #218, #219, #232, #233, #234). The substring `" icon-"` does not match `"icon "`, and `[class^="icon-"]` requires the attribute to *start* with `icon-`; `"icon fa fa-cog"` starts with `icon ` — so **feather does not win**, and the captured computed `font-family` on those nodes is `FontAwesome` (e.g. `nodes-000.txt:1641`). Confirmed by evidence, not assumption.

**Duplication note:** `09.css` (styles.css) contains its own content **twice** — the block at lines 2-1248 is repeated verbatim at lines 1273-2519, with a unique tail at 2543-2574 (`.roomArea`, `.alertsChatArea`, `.wrapper-bg-image`, `#permissionsModal`, `#badgesForm`, `.user-badge-img`, `.room-badge-*`, `.chat-tab-row`, `.badge-preview`, `.add-tab-btn`, `.cursor-pointer:hover`). Two near-identical concatenations were shipped in one file. The tail rules `.user-badge-img{width:auto;height:100%;max-height:20px;margin:0 4px}` (2564) and `span.label{padding:0.2em;margin-right:-4px!important}` (2525) are the ones that shape the badge preview chip (#134).

### 9.1 The rules that actually paint this page

| Selector | Sheet:line | Effect here |
|---|---|---|
| `body{font:14px/1.42857 "Helvetica Neue",…; color:rgb(51,51,51); background:#fff}` | 02:327 | global type |
| `body{overflow:auto}` | 14:2 | overrides `09.css:95 body{overflow:hidden}` → page scrolls |
| `.footer-hidden .app{padding-bottom:0}` / `… > footer{display:none}` | 09:136-137 | no app footer |
| `.topnavbar{position:relative;margin-bottom:0;border-radius:0;border:0}` | 09:57 | nav bar |
| `.navbar{min-height:50px}` | 02:994 | 50px header |
| `.navbar-header{width:350px}` | 09:1137 | brand column 350px |
| `.topnavbar>.navbar-header>.navbar-brand{padding:0 5px;line-height:50px;margin:0 50px;color:rgb(250,250,250)}` + `@media ≥768 {margin:0 15px}` | 09:62-65 | brand box |
| `.container{width:1170px}` @≥1200px | 02:429 | content column width |
| `.row{margin:0 -15px}` / `.col-md-*` | 02:432, 541-553 | grid |
| `.panel{margin-bottom:20px;background:#fff;border:1px solid transparent;border-radius:4px;box-shadow:rgba(0,0,0,.05) 0 1px 1px}` | 02:1291 | cards |
| `.table>thead>tr>th{padding-top:20px!important;padding-bottom:20px!important;border-bottom-width:1px}` | 09:41 | tall table headers (60.5px) |
| `.table-bordered …{border:1px solid #ddd}` / `.table-striped>tbody>tr:nth-of-type(2n+1){background:#f9f9f9}` | 02:659, 661 | grid lines + zebra |
| `.form-control{…height:34px;border:1px solid …;border-radius:4px}` + `.form-control{padding-left:18px;padding-right:18px;box-shadow:#000 0 0 0!important}` + `{border-color:rgb(219,217,217)}` | 02:695, 09:33-34 | all text inputs |
| `.btn{…padding:6px 12px;font-size:14px;border-radius:4px}` + `.btn{appearance:none;outline:none!important}` + `.btn.btn-default{border-color:rgb(230,233,238)}` | 02:782, 09:321-323 | all buttons |
| `.btn-sm{padding:5px 10px;font-size:12px;line-height:1.5;border-radius:3px}` | 02:842 | Archived/Launch/Manage |
| `.label{display:inline;padding:.2em .6em .3em;font-size:75%;font-weight:700;color:#fff;border-radius:.25em}` + `.label-orange{background:rgb(254,86,33)}` + `span.label{padding:.2em;margin-right:-4px!important}` | 02:1163, 09:2359, 09:2525 | "open" chip |
| `.text-muted{color:rgb(119,119,119)}` | 02:369 | "1 / 2", empty-state cells |
| `.mt-xl{margin-top:30px!important}` / `.p-lg{padding:15px!important}` / `.mb{margin-bottom:10px!important}` | 09:829, 846, 815 | spacing utilities in use |
| `.fa{font-family:FontAwesome;font-size:inherit;line-height:1}` + `.fa-2x{font-size:2em}` | 10:3, 10:5 | icons |
| `.animated{animation-duration:.5s;animation-fill-mode:both}` (app override of animate.css `1s`) + `@keyframes fadeInDown` | 09:224, 12:269 | container entry animation |
| `.ng-hide:not(.ng-hide-animate){display:none!important}` | 01:2 | all 31 hidden nodes |
| `.intercom-composer-popover{…opacity:0;visibility:hidden}` + `.intercom-emoji-picker-emoji{…}` | 14:4, 14:13 | the 635-span iceberg |
| `.intercom-composer-popover{right:10px!important}` | 09:1251 | popover pinned right |

---

## 10. All text content verbatim (copy deck)

### 10.1 Visible on screen, in DOM order

| # | path | element | text (verbatim) |
|---|---|---|---|
| 58 | `r.0.0.0.1.0.0.0` | a | `Account` |
| 63 | `r.0.1.1.0.0.0.0.0` | h4 | `Total : 1` |
| 77 | `r.0.1.1.0.0.0.0.0.0` | span | `Sessions` |
| 79 | `r.0.1.1.0.0.0.0.1.1` | button | `Archived` |
| 90 | `r.0.1.1.0.0.0.0.1.1.0` | span | `Show` |
| 185 | `…2.0.0.0.0.0.0` | th | `Session ID` |
| 186 | `…2.0.0.0.0.0.1` | th | `Name` |
| 187 | `…2.0.0.0.0.0.2` | th | `State` |
| 188 | `…2.0.0.0.0.0.3` | th | `Users` |
| 189 | `…2.0.0.0.0.0.4` | th | `Actions` |
| 220 | `…2.0.0.0.1.0.0.0` | strong | `3625` |
| 191 | `…2.0.0.0.1.0.1` | td | `Room 3625` |
| 223 | `…2.0.0.0.1.0.2.0` | div.label | `open` |
| 225 | `…2.0.0.0.1.0.3.0` | div | `1 / 2` |
| 226 | `…2.0.0.0.1.0.4.0` | a | `Launch` |
| 227 | `…2.0.0.0.1.0.4.1` | a | `Manage` |
| 67 | `r.0.1.1.0.0.0.0.4` | h3 | `Badges` |
| 96 | `…5.1.0` | a | `Add New Badge` |
| 97 | `…5.1.1` | a | `Upload Image Badge` |
| 98 | `…5.1.2` | a | `Export Badges` |
| 198 | `…5.1.4.0.0.0.0` | th | `Badge` |
| 199 | `…5.1.4.0.0.0.1` | th | `Actions` |
| 70 | `r.0.1.1.0.0.0.0.7` | h3 | `Extra Admin Users` |
| 101 | `…8.0.0` | button | `Add Admin User` |
| 208 | `…8.0.3.0.0.0.0` | th | `Name` |
| 209 | `…8.0.3.0.0.0.1` | th | `Email` |
| 210 | `…8.0.3.0.0.0.2` | th | `Added` |
| 211 | `…8.0.3.0.0.0.3` | th | `Actions` |
| 212 | `…8.0.3.0.1.0.0` | td | `No admin users added yet` |
| 73 | `r.0.1.1.0.0.0.0.10` | h3 | `API Keys` |
| 179 | `…11.0.0.0.0.0` | button | `New Api key` |
| 180 | `…11.0.0.0.1.0` | a | `API Docs` |
| 213 | `…11.0.0.1.0.0.0` | th | `_id` |
| 214 | `…11.0.0.1.0.0.1` | th | `secret` |
| 215 | `…11.0.0.1.0.0.2` | th | `Actions` |
| 216 | `…11.0.0.1.1.0.0` | td | `No API keys yet` |
| 52 | `r.0.1.1.0.2.1` | span | `©` |
| 53 | `r.0.1.1.0.2.2` | span | `2026` |
| 54 | `r.0.1.1.0.2.3` | span | `ProTradingRoom` |

The complete visible copy of the page, read top-to-bottom, is:

```
Account
Total : 1 Sessions
[search]  Archived Show
Session ID | Name | State | Users | Actions
3625  Room 3625  open  1 / 2  Launch  Manage
Badges
Add New Badge   Upload Image Badge   Export Badges
Badge | Actions
Extra Admin Users
Add Admin User
Name | Email | Added | Actions
No admin users added yet
API Keys
New Api key   API Docs
_id | secret | Actions
No API keys yet
© 2026 ProTradingRoom
```

### 10.2 Present in the DOM but hidden

| # | element | text |
|---|---|---|
| 91 | span | `Hide` |
| 93 | a | `New Room` |
| 99 | h3 | `No Badges defined` |
| 102 | button | `Close Add Admin User` |
| 112 | h3 | `New Badge` |
| 113 | h3 | `Edit Badge` |
| 114 | h4 | `Preview:` |
| 134 | span.label | `New Badge` |
| 136 | span | `Name:` |
| 138 | label | `Auto assign this badge to this WP roles (comma separated):` |
| 141 | button | `Add New Badge` |
| 142 | button | `Save Edit for New Badge` |
| 143 | button | `Close` |
| 148 | h3 | `Add Admin User` |
| 161 | span | `Background:` |
| 163 | button | `Transparent` |
| 164 | span | `Text:` |
| 166 | span | `Badge Text:` |
| 200 | label | `Name` |
| 202 | label | `Email` |
| 204 | label | `Password` |
| 206 | button | `Add Admin User` |
| 207 | button | `Cancel` |
| 61 | p | `Login to your ProTradingRoom.com account` |
| 88 | label | `Logging In, please wait...` |
| 130 | button | `Login` |
| 156 | a | `Forgot your password?` |
| 222 | div | `)` |
| 224 | div.label | `archived` |
| 228 | a | `Marketplace` |
| 231 | muted | `( 6a628a99731b9f77ae9bf505 - ownerID: 6a628a98731b9f77ae9bf504` |

### 10.3 Placeholder / value strings

`search` (#89) · `Your email` (#124) · `Your password` (#126) · `Badge Name` (#137) · `TEST` (#167 `value`) · `Search` (#196) · `Enter name` (#201) · `Enter email` (#203) · `Enter password` (#205).

### 10.4 Tooltip strings

`Account Settings` (#58) · `Logout` (#59) · `recaptcha challenge expires in two minutes` (iframes #35/#36/#37 `title`) · `reCAPTCHA` (#217 `title`).

### 10.5 Intercom emoji-picker copy (hidden)

Group titles: `Frequently used` · `People` · `Nature` · `Objects` · `Places` · `Symbols`.
Plus 635 emoji glyph spans with `title` shortcodes. Group 1 ("Frequently used") is, in order:
`thumbs_up 👍` · `-1 👎` · `sob 😭` · `fire 🔥` · `frowning 😦` · `smile 😄` · `heart_eyes 😍` (records #242-#248).
The remaining 628 span the standard Intercom emoji set (People #250-#427; Nature #429-#507; Objects #509-#710; Places #712-#776; Symbols #778-#881), each `<span class="intercom-emoji-picker-emoji" title="<shortcode>">` with the glyph as its text. They are visually irrelevant (all `visibility:hidden`, `0×0`) but they are 72 % of the node budget — any rebuild that mounts an emoji picker eagerly will reproduce this cost.

---

## 11. Data & assets

### 11.1 Scripts (12 `<script>` elements, all `display:none`, `0×0`)

| # | path | src / inline |
|---|---|---|
| 2 | `r.1` | `/public/dist/vendor.min.js?v=2.18.100` |
| 3 | `r.2` | inline — `var __h264 = 'false'; var __isReg = 'false'; …` **(truncated at 250 chars)** |
| 4 | `r.3` | `https://cdnjs.cloudflare.com/ajax/libs/adapterjs/0.15.5/adapter.min.js` (`integrity="sha512-8HaugtT+4c0rhgZIggNCv7I2N0u5OuCXQutD91XdRLqtBl4kD5z2B6QmHczDFMpeENZV060Fip3S954njcfv9A=="`, `crossorigin="anonymous"`) |
| 5 | `r.4` | `/public/vendor/janus3.js?v=2.18.100` |
| 6 | `r.5` | `//vjs.zencdn.net/7.3.0/video.min.js` |
| 7 | `r.6` | `//cdnjs.cloudflare.com/ajax/libs/videojs-youtube/2.6.0/Youtube.min.js` |
| 8 | `r.7` | `https://cdnjs.cloudflare.com/ajax/libs/angularjs-toaster/2.2.0/toaster.min.js` |
| 9 | `r.8` | `https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.4.0/sockjs.min.js` |
| 10 | `r.9` | `https://w.soundcloud.com/player/api.js` (`type="text/javascript"`) |
| 11 | `r.10` | `/public/dist/app.min.js?v=1784623769671` |
| 12 | `r.11` | inline (`type="text/javascript"`) — `var __cver = '1784623769671'; var ua = navigator.userAgent.toLowerCase(); var is_chrome = …` **(truncated)** |
| 34 | `r.0.1.2` | `https://www.google.com/recaptcha/api.js` (`class="ng-scope"`) |

**App version markers:** vendor bundle `v=2.18.100`; app bundle cache-buster `1784623769671` (also `__cver`). Janus (WebRTC gateway), adapter.js, SockJS, video.js + YouTube tech, SoundCloud API — the full room stack is loaded on the account page even though none of it is used here.

### 11.2 Images & fonts

| asset | where |
|---|---|
| `/public/images/ptr_logo.png` | nav brand `<img>` #57 (`src` and `ng-src`) |
| `app/img/ajax_loader.gif` | login spinner `<img>` #87 |
| `https://js.intercomcdn.com/images/search@2x.9f02b9f3.png` | background-image of the Intercom search input #196 |
| `../fonts/fontawesome-webfont.woff2?v=4.3.0` (+ woff, ttf) | `@font-face FontAwesome`, `10.css:2` |
| `fonts/feather-webfont.woff` (+ ttf) | `@font-face feather`, `11.css:2` |
| `../fonts/glyphicons-halflings-regular.woff2` (+ woff, ttf) | `@font-face "Glyphicons Halflings"`, `02.css:60` — **overridden**: `09.css:2` remaps `.glyphicon{font-family:FontAwesome}` |
| `/public/app/img/ajax_loader.gif` | `09.css:2456 .loadingBkg` (not used on this page) |
| `../img/bg1.jpg` … `bg6.jpg` | `09.css:2071-2076 .bg-pic1..6` (not used on this page) |

### 11.3 Every `href` on the page

| # | href |
|---|---|
| 46 | `""` (brand link — no target) |
| 58 | `#/page/welcome` |
| 59 | `""` (logout is `ng-click` only) |
| 156 | `#/page/forgot-password` |
| 180 | `/public/html/api-docs.html?src=/public/html/API_Documentation.md` (`target="_blank"`) |
| 226 | `/session?id=3625&jwtSite=<JWT>` (`target="_blank"`; also `ng-href` with the same value) |
| 227 | `#/page/manageSession/6a628a99731b9f77ae9bf505` |

Routes exposed: `page.welcome`, `page.forgot-password`, `page/manageSession/:id`, and the non-Angular `/session?id=…` room entry point.

### 11.4 ⚠ Captured session credential was present in the DOM

`nodes-001.txt` #226 (lines 3036-3041) showed that the **Launch** link carried a
live JWT in both `ng-href` and `href`. The credential is now redacted from the
tracked decode:

```
/session?id=3625&jwtSite=[REDACTED_CAPTURE_JWT]
```

Header/payload decode (base64url, from the captured string):
- header `{"alg":"HS256","typ":"JWT"}`
- payload `{"name":"[OWNER_JWT_NAME]","email":"[OWNER_EMAIL]","id":"[OWNER_USER_ID]","type":"site","issued":1784840082215,"iat":1784840082,"exp":1815944082}`
- signature is **truncated** by the capture (`AqpORjtpJqPb-q`, cut at the 250-char attribute limit).

Other live identifiers in the DOM:
- session/room numeric id **3625**, name **"Room 3625"** (#191, #220)
- session `_id` **`6a628a99731b9f77ae9bf505`** (#227 href, #231 muted text)
- session `ownerID` **`6a628a98731b9f77ae9bf504`** (#231)
- account user id **`[OWNER_USER_ID]`** (JWT)
- reCAPTCHA site key `6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx`, and three per-session `bft=` challenge tokens (§5)
- app version `2.18.100` / build `1784623769671`

**Any rebuild must not hard-code these.** They are per-account, per-session, and time-limited (`exp` 1815944082 ≈ 2027-07-19).

### 11.5 Every `ng-*` / Angular binding expression, verbatim (the data model)

**Scope / controller / routing**

| attr | value | node |
|---|---|---|
| `ng-controller` | `CoreController` | #1 |
| `data-ui-view` / `ui-view` | `""` | #1, #18, #33, #60 |
| `data-autoscroll` / `autoscroll` | `"false"` | #1, #18, #33 |
| `ng-class` | `{ 'layout-fixed': app.layout.isFixed, 'layout-boxed': app.layout.isBoxed, 'layout-dock': app.layout.isDocked, 'layout-material': app.layout.isMaterial, 'aside-offscreen': app.sidebar.isOffscreen, 'footer-hidden': app.footer.hidden, 'in-app': !$state.includes` **(truncated)** | #0 body |
| `ng-class` | `app.views.animation` | #60 |
| `ng-init` | `showNewRoom=0;` | #33 |
| `ng-init` | `showBadgeID=false` | #100 |
| `ng-include` | `'app/views/page.footer.html'` | #45 |
| `ui-sref` | `page.welcome` | #58 |
| `ui-sref` | `page.forgot-password` | #156 |
| `collapse` | `headerMenuCollapsed` | #39 |

**Auth / session**

| attr | value | node |
|---|---|---|
| `ng-show` | `login.isLoggedIn` | #42, #49 |
| `ng-hide` | `login.isLoggedIn ` (trailing space) | #44 |
| `ng-submit` | `submitLogin()` | #62 |
| `ng-click` | `doLogout()` | #59 |
| `ng-model` | `signup.email` | #124 |
| `ng-model` | `signup.pass` | #126 |
| `ng-show` | `loggingIn` | #76 |
| `ng-show` | `failedLoginCount >= 3` | #109 |
| `ng-bind` | `app.year` → `2026` | #53 |
| `ng-bind` | `app.name` → `ProTradingRoom` | #54 |

**Sessions / rooms**

| attr | value | node |
|---|---|---|
| `ng-repeat` | `s in login.sessions | filter: sessSearch` | #160 |
| `ng-model` | `sessSearch` | #89 |
| `ng-hide` | `s.isArchivedRoom && !showArchivedRooms` | #160 |
| `ng-click` | `toggleArchivedRooms()` | #79 |
| `ng-show` | `!showArchivedRooms` / `showArchivedRooms` | #90 / #91 |
| `ng-click` | `sortByUUID()` / `sortByName()` | #185 / #186 |
| `ng-show` | `s.isClonedRoom` | #221 |
| `ng-show` | `showNewRoom` | #222 |
| `ng-hide` | `s.isArchivedRoom` | #223 |
| `ng-show` | `s.isArchivedRoom` | #224 |
| `ng-click` | `showNewRoom=showNewRoom+1;` | #77 |
| `ng-show` | `showNewRoom>=5` | #81 |
| `ng-click` | `createNew()` | #93 |
| `ng-href` | `/session?id=3625&jwtSite=…` | #226 |
| `ng-hide` | `disableMarketplace` | #228 |
| `ng-click` | `manageMarketplaceSession(s._id, s)` | #228 |

**Badges**

| attr | value | node |
|---|---|---|
| `ng-click` | `showAddBadge=!showAddBadge` | #96 |
| `ngf-select` / `ngf-change` | `ngf-select` / `onImageSelect($files, '')` | #15, #97 |
| `ng-show` | `badgesList` / `!badgesList` | #98, #100 / #99 |
| `ng-click` | `exportBadges()` | #98 |
| `ng-show` | `showAddBadge` | #82 |
| `ng-show` | `badges.mode=='add'` | #112, #141 |
| `ng-show` | `badges.mode=='edit';` | #113 |
| `ng-show` | `badges.mode=='edit'` | #142 |
| `ng-show` / `ng-hide` | `badges.hasOwnProperty('imgURL') && badges.imgURL` | #133 / #134, #135 |
| `ng-src` | `""` | #133 |
| `ng-model` | `badges.bkcolor`, `badges.color`, `badges.text`, `badges.name`, `badges.roles` | #162, #165, #167, #137, #139 |
| `ng-click` | `badges.bkcolor='rgba(1,0,0,0)';` | #163 |
| `ng-click` | `addBadge(false)` | #141 |
| `ng-click` | `addBadge(true); showAddBadge=false;` | #142 |
| `ng-click` | `badges.badgeID=''; badges.mode='add'; showAddBadge=false;` | #143 |
| `ng-dblclick` | `showBadgeID=!showBadgeID;` | #198 |

**Admin users**

| attr | value | node |
|---|---|---|
| `ng-show` | `!showAddAdminUser` / `showAddAdminUser` | #101 / #102, #103 |
| `ng-click` | `showAddAdminUser=!showAddAdminUser` | #101, #102 |
| `ng-submit` | `addAdminUser()` | #149 |
| `ng-model` | `adminUser.name`, `adminUser.email`, `adminUser.password` | #201, #203, #205 |
| `ng-click` | `showAddAdminUser=false; adminUser={name:'',email:'',password:'',perms:{}}` | #207 |
| `ng-show` | `!adminUsers || adminUsers.length===0` | #178 |

**API keys**

| attr | value | node |
|---|---|---|
| `ng-click` | `createApiKey()` | #179 |
| `ng-show` | `!apiKeys || apiKeys.length===0` | #182 |

**Derived data model**

```
app          : { year, name, layout:{isFixed,isBoxed,isDocked,isMaterial}, sidebar:{isOffscreen},
                 footer:{hidden}, views:{animation} }
login        : { isLoggedIn, sessions: [ Session ] }
Session (s)  : { _id, isArchivedRoom, isClonedRoom, ... }   // rendered: id 3625, name "Room 3625",
                                                            //  state open, users "1 / 2", ownerID
signup       : { email, pass }
badges       : { mode:'add'|'edit', badgeID, name, text, roles, color, bkcolor, imgURL? }
badgesList   : Badge[]          // truthy-but-empty in this capture
adminUser    : { name, email, password, perms:{} }
adminUsers   : AdminUser[]      // empty
apiKeys      : ApiKey[]         // empty; columns _id, secret
flags        : showNewRoom, showArchivedRooms, showAddBadge, showAddAdminUser,
               showBadgeID, disableMarketplace, loggingIn, failedLoginCount, sessSearch,
               headerMenuCollapsed, hideLogo, sess.logoURL
```

### 11.6 Icon-class inventory

`fa fa-cog` (#58) · `fa fa-2x fa-power-off` (#59) · `fa fa-cloud-upload` (#117) · `fa fa-smile-o fa-1x` (#195) · `fa fa-external-link` (#232) · `fa fa-cogs` (#233) · `fa fa-credit-card` (#234) · `icon fa fa-sort-alpha-asc` ×2 (#218, #219) · `fa fa-envelope form-control-feedback text-muted` (#125) · `fa fa-lock form-control-feedback text-muted` (#127).

---

## 12. Honest gaps

1. **Truncated attribute/text values.** The capture caps long strings at ~250 characters. Confirmed truncations:
   - `#0 <body> ng-class` — cut mid-expression at `'in-app': !$state.includes` (`nodes-000.txt:5`). The remainder of the layout class map is unknown.
   - `#3 <script>` inline text — cut at `__isReg = __isReg == 'true' ? true :` (`nodes-000.txt:82`).
   - `#12 <script>` inline text — cut at `var is_msie = ua.indexOf('msie') > -1 || ua.indexOf('trident') > -1;\n ` (`nodes-000.txt:266`).
   - `#32 <style>` inline text — cut at `font-weight: 400;\n    fo` (`nodes-000.txt:929`). (The full sheet is recoverable as `01-stylesheets/14.css`.)
   - `#226 <a> ng-href` and `href` — the JWT signature is cut to `AqpORjtpJqPb-q` (`nodes-001.txt:3038, 3041`).
   - `#231 <muted>` text — `( 6a628a99731b9f77ae9bf505 - ownerID: 6a628a98731b9f77ae9bf504` has **no closing `)`**; the `)` lives on the parent `<div>` #222, so this may be intact rather than truncated. Cannot fully disambiguate — flagged.
2. **No `truncated=true` containers.** All four captures report `truncated=false` (`00-META.txt:13-16`; `INFO.txt:5` in each capture dir). No region was dropped for size.
3. **Two stylesheets are CORS-blocked and their rules are unknown**: `video-js.min.css` (sheet 03, `01-stylesheets/03.css:2 CORS-BLOCKED`) and `angularjs-toaster/2.2.0/toaster.min.css` (sheet 07). Neither has a matching element in this DOM, so the visual impact here is nil — but I cannot *prove* that from the dump, only observe that no `.video-js`, `.vjs-*`, or `#toast-container` node exists.
4. **`ng-bind` target for footer span #56 is unknown.** The node is `<span class="ng-binding ng-scope">` with **no `ng-bind` attribute captured and no text** (`nodes-000.txt:1559-1576`). It renders `0×0`. What it would show (a version string? a tagline?) cannot be determined.
5. **Pseudo-element coverage is partial.** The decoder records `::before`/`::after` only where present, and only 5 properties (`content`, `color`, `font-family`, `font-size`, `background-color`). Other pseudo properties (padding, position, transform, border) are **not** in the dump. E.g. `.g-recaptcha-bubble-arrow` borders come from inline styles, but `.btn-label::after`, `.settings-inner::after` etc. are unverifiable from node data.
6. **FontAwesome glyph code points are not readable.** All `::before` `content` values for `.fa-*` icons print as `""` (the Private-Use-Area character is not rendered in the slice text). I have identified the icons **by class name** cross-referenced to `01-stylesheets/10.css`, not by reading the code point. Cited class names are exact; glyph code points are inferred from the FA 4.3.0 sheet in the same dump.
7. **The theme-diff "26 false positives" claim is evidence-based but the decoder is at fault, not the page.** I verified byte-identity with `od -c` on one representative line and by whole-file `diff` of the dark vs light diff files and of all four `DEFAULTS.txt`. I did **not** hexdump all 52 pseudo lines individually.
8. **No screenshot / pixel raster is in this dump.** Everything above is DOM + computed style + rects. A pixel-perfect claim cannot be closed from prt2.json alone; it needs a rendered screenshot diff.
9. **No scroll state, no `document.title`, no `<head>`.** The dump starts at `<body>`. Page title, meta tags, favicon, and `<html>` attributes are absent.
10. **Hover/focus/active states are not captured.** All `:hover`, `:focus`, `:active` rules in the stylesheets are documented in §9 but were never exercised.
11. **`meta.role = "member"` vs owner-grade UI.** Unresolved contradiction; the DOM shows owner tooling. Reported, not rationalised.
12. **The "New Room" button is gated behind an undocumented interaction** — `ng-show="showNewRoom>=5"` on the column, driven by `ng-click="showNewRoom=showNewRoom+1"` on the word "Sessions" (#77) with `ng-init="showNewRoom=0"` (#33). Five clicks on the heading reveal it. Nothing in the capture shows what the revealed column looks like beyond the single `New Room` button (#93) and the row-level `( <id> - ownerID: <id>` debug text (#222/#231) that the same flag reveals.
13. **Badges empty-state is broken in the reference** (see §4.2). Reproducing it faithfully means reproducing a bug; flagging it so the choice is deliberate.

---

## Verification

- **Files read: 42 of 42.** `00-META.txt`; all 15 files in `01-stylesheets/` (`00.css`–`14.css`); `02-MANIFEST.txt`; and every file in all four capture directories: `caps/00-baseline-room/` (INFO, DEFAULTS, `nodes-000.txt` … `nodes-007.txt` = 10 files), `caps/01-forced-darkTheme/` (INFO, DEFAULTS, nodes-000, IDENTICAL-TO-BASELINE, NODES-REMOVED = 5), `caps/02-forced-lightTheme/` (5), `caps/03-final-room/` (5).
- **Lines read: 20,654 of 20,654.** Large files were read in successive full offset/limit chunks with no gaps: `01-stylesheets/02.css` (1–500, 500–1049, 1049–1577), `01-stylesheets/09.css` (1–400, 400–799, 799–1248, 1248–1697, 1697–2146, 2146–2574), `01-stylesheets/12.css` (1–400, 400–790), `caps/00-baseline-room/nodes-000.txt` (1–700, 700–1399, 1399–2098, 2098–2797, 2797–3461), `caps/00-baseline-room/nodes-001.txt` (1–700, 700–1399, 1399–2098, 2098–2797, 2796–3406), `caps/02-forced-lightTheme/nodes-000.txt` (1–40, 40–98).
  Two files were read partly via targeted whole-file `diff`/`od` rather than line-by-line in the transcript, and I state that plainly: the three `IDENTICAL-TO-BASELINE.txt` files (857 + 857 + 858 = 2,572 lines of bare DOM paths). For those I read the header line, the first 8 and last 3 entries, and then verified the *entire* contents programmatically: (a) all three files cross-`diff`ed against each other, and (b) `IDENTICAL ∪ differing == the full 882-path baseline set` for both the dark and the final capture. That is stronger than eyeballing 2,572 path strings, but it is not a literal line-by-line read, and I am flagging it rather than claiming otherwise.
- **Node records covered: 882 of 882 in `baseline-room`**, plus 27 diff records in `forced-darkTheme`, 27 in `forced-lightTheme`, 26 in `final-room` — **962 records total.**
- **Per-capture last-record confirmation:**
  - `caps/00-baseline-room` — last node file is `nodes-007.txt`; last record reached is **`#881 path=r.0.1.1.0.0.0.0.5.0.1.1.0.1.0.0.5.104 <span>` `title="small_blue_diamond"` text `🔹`** (`nodes-007.txt:290-294`), which is record 881 of 0…881. ✔ reached end.
  - `caps/01-forced-darkTheme` — single node file `nodes-000.txt`, header says "records 0..26 of 27"; last record reached is **`#234 path=r.0.1.1.0.0.0.0.2.0.0.0.1.0.4.2.0 <i>`** (`nodes-000.txt:96-97`), the 27th and final entry. ✔
  - `caps/02-forced-lightTheme` — same, last record **`#234 …4.2.0 <i>`** (`nodes-000.txt:96-97`). ✔
  - `caps/03-final-room` — header "records 0..25 of 26"; last record reached is **`#234 path=r.0.1.1.0.0.0.0.2.0.0.0.1.0.4.2.0 <i>`** (`nodes-000.txt:93-94`), the 26th and final entry. ✔
- **Cross-checks run against the slices (not against memory):** tag census (882 tags, matching the brief's counts exactly); zero-rect count 756 / non-zero 126; `visibility: visible` deviation count 208; `display` deviation histogram summing with the 635 COMMON `inline-table` to 882; `DEFAULTS.txt` byte-equality across all four captures; dark-vs-light diff-file byte-equality; `grep` for `darkTheme|lightTheme` and `var(--` across all 15 stylesheets (0 hits each); `od -c` byte-comparison of a representative pseudo-element "diff" line.
- **Not read / not available:** nothing inside `/tmp/ptr-decode/prt2/` was skipped. `evidence-dumps/NEXT-STEP/ptr1.json` and `/tmp/ptr-decode/ptr1` were not touched, per the task boundary. The original `prt2.json` was not re-parsed; all evidence is from the decoded slices.
