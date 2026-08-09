# ptr1-P25 — Spacing ladder, radii, shadows, breakpoints, z-index layers, motion

**Purpose.** Enumerate the complete geometric token layer: the spacing ladder and every padding/margin value in force, every `border-radius`, **every** `box-shadow` (including the six-step `.shadow-z1`–`z5` set), every `@media` block across all 15 sheets with the rules inside it, the full z-index stack, and every transition/animation duration. Every value is cited to `file:line` and, where an element exists, cross-checked against the 2,156-node computed capture.

**Evidence base.** All 15 sheets in `/tmp/ptr-decode/ptr1/01-stylesheets/`; `/tmp/ptr-decode/ptr1/caps/00-baseline-room/DEFAULTS.txt` and a full parse of `nodes-000…017.txt` (2,156 records).

> **Duplication note.** `09.css` ships twice (copy A `09.css:2–1272`, copy B `09.css:1273–2574`). Citations use copy-A lines; add **+1271** for copy B. Rules that exist only in copy B are cited at their real lines `09.css:2543–2574`. See P26 §2.

---

## 1. The spacing ladder

### 1.1 The app's own utility ladder — `09.css:806–860`, exhaustive

**Margin ladder — 5 steps: `0 · 5 · 10 · 15 · 30` px.** Every rule uses `!important`.

| Step | Class family | Lines |
|---|---|---|
| **0** | `.m0` · `.ml0` · `.mr0` · `.mt0` · `.mb0` | `09.css:806–810` |
| **10** (base) | `.m` · `.ml`/`.mh` · `.mr`/`.mh` · `.mt`/`.mv` · `.mb`/`.mv` | `09.css:811–815` |
| **5** (`-sm`) | `.m-sm` · `.ml-sm`/`.mh-sm` · `.mr-sm`/`.mh-sm` · `.mt-sm`/`.mv-sm` · `.mb-sm`/`.mv-sm` | `09.css:816–820` |
| **15** (`-lg`) | `.m-lg` · `.ml-lg`/`.mh-lg` · `.mr-lg`/`.mh-lg` · `.mt-lg`/`.mv-lg` · `.mb-lg`/`.mv-lg` | `09.css:821–825` |
| **30** (`-xl`) | `.m-xl` · `.ml-xl` · `.mr-xl` · `.mt-xl` · `.mb-xl` | `09.css:826–830` |

**Padding ladder — 6 steps: `0 · 5 · 10 · 15 · 20 · 25` px.** Every rule uses `!important`.

| Step | Class family | Lines |
|---|---|---|
| **0** | `.p0` · `.pl0`/`.ph0` · `.pr0`/`.ph0` · `.pt0`/`.pv0` · `.pb0`/`.pv0` | `09.css:831–835` |
| **10** (base) | `.p` · `.pl`/`.ph` · `.pr`/`.ph` · `.pt`/`.pv` · `.pb`/`.pv` | `09.css:836–840` |
| **5** (`-sm`) | `.p-sm` · `.pl-sm`/`.ph-sm` · `.pr-sm`/`.ph-sm` · `.pt-sm`/`.pv-sm` · `.pb-sm`/`.pv-sm` | `09.css:841–845` |
| **15** (`-lg`) | `.p-lg` · `.pl-lg`/`.ph-lg` · `.pr-lg`/`.ph-lg` · `.pt-lg`/`.pv-lg` · `.pb-lg`/`.pv-lg` | `09.css:846–850` |
| **20** (`-xl`) | `.p-xl` · `.pl-xl`/`.ph-xl` · `.pr-xl`/`.ph-xl` · `.pt-xl`/`.pv-xl` · `.pb-xl`/`.pv-xl` | `09.css:851–855` |
| **25** (`-xxl`) | `.p-xxl` · `.pl-xxl`/`.ph-xxl` · `.pr-xxl`/`.ph-xxl` · `.pt-xxl`/`.pv-xxl` · `.pb-xxl`/`.pv-xxl` | `09.css:856–860` |

**The two ladders are asymmetric.** Margin tops out at 30 with no 20 or 25; padding tops out at 25 with no 30. The union — **`0 · 5 · 10 · 15 · 20 · 25 · 30`** — is the app's declared spacing scale, and the `-xl` suffix means **30 for margin and 20 for padding**. A rebuild that maps `-xl → 30` uniformly will over-pad every `.p-xl` element by 10 px.

Naming: `h` = horizontal (left+right), `v` = vertical (top+bottom); `sm/lg/xl/xxl` are the size steps.

### 1.2 Border-width utility ladder — `09.css:861–933`

`.b0` / `.bl0` / `.br0` / `.bt0` / `.bb0` set `border-*-width: 0 !important` (`09.css:861–865`). `.b` / `.br` / `.bl` / `.bt` / `.bb` set `1px solid rgb(236,238,238)` (`09.css:866–869`). Then **17 coloured variants** × 4 sides = 68 rules: `-primary` `rgb(29,31,33)` (`:870–873`), `-success` (`:874–877`), `-info` (`:878–881`), `-warning` (`:882–885`), `-danger` (`:886–889`), `-amber` (`:890–893`), `-pink` (`:894–897`), `-purple` (`:898–901`), `-inverse` (`:902–905`), `-orange` (`:906–909`), `-gray-darker` (`:910–913`), `-gray-dark` (`:914–917`), `-gray` (`:918–921`), `-gray-light` (`:922–925`), `-gray-lighter` (`:926–929`), `-muted` (`:930–933`). All `1px solid`. **Border width in this system is always 1px** except the explicit exceptions in §1.5.

Responsive variants `-sm` / `-md` / `-lg` live inside three `max-width` blocks — see §4.2.

### 1.3 The height ladder — `09.css:1174–1181`

`.ch0` 0 · `.ch10` 10 % · `.ch20` 20 % · `.ch30` 30 % · `.ch70` 70 % · `.ch80` 80 % · `.ch90` 90 % · `.ch100` 100 %. **40/50/60 % are missing** — a genuine gap in the source, not an omission here.

### 1.4 The thumb (avatar) ladder — `09.css:1047–1057`

`.thumb8 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96 / 128` each set `width`, `height` and `line-height` to the same px value, all `!important`. `.thumb16` and `.thumb20` additionally set `margin-right: 5px` (`09.css:1048–1049`). Copy B's `.thumb16` (`09.css:2319`) omits `margin-right` but does not reset it, so 5 px still applies; `.thumb20` is absent from copy B entirely but present and un-overridden in copy A — see P26 §2 for the full correction.

Only `.thumb24` has elements on this page (3 gravatar avatars), computing exactly `24 × 24 px`, `line-height: 24px`, `vertical-align: middle` (`nodes-012.txt` `#1550`).

### 1.5 The width ladder — `09.css:1068–1080`

`.wd-tiny` 50 · `.wd-xxs` 60 · `.wd-xs` 90 · `.wd-sm` 150 · `.wd-sd` 200 · `.wd-md` 240 · `.wd-lg` 280 · `.wd-xl` 320 · `.wd-xxl` 360 px · `.wd-wide` 100 % · `.wd-80` **90 %** (the class name says 80, the value is 90 — a real mismatch in the source) · `.wd-auto` auto · `.wd-hide` `display:none`.

### 1.6 The layout constants

| Constant | Value | Where |
|---|---|---|
| Header / navbar height | **50px** | `09.css:57` `.topnavbar` via Bootstrap `02.css:994` `min-height:50px`; `09.css:98` `aside { top: 50px }`; `09.css:128` `padding-top: 50px`; `09.css:138` `.app-fh { inset: 50px 0 0 }` |
| Sidebar width | **240px** | `09.css:98` `aside { width: 240px }`; `09.css:103` `margin-left: 240px`; `09.css:120` `margin-left: -240px`; `09.css:124` `translate3d(-240px,0,0)`; `09.css:140` `.app-fh { left: 240px }`; `09.css:184` `.sidebar-nav { width: 240px }` |
| Sidebar **scroll** width | **257px** | `09.css:181` `.sidebar { width: 257px }` — 17px wider than the nav, to hide the scrollbar |
| Footer height | **60px**, `padding: 15px` | `09.css:100` |
| App padding | **15px 15px 80px** | `09.css:105` `.app` |
| Boxed max-width | **1140px** | `09.css:129, 131` |
| Dock max-width | **1100px** | `09.css:134` |
| Navbar-header width | **350px** | `09.css:1137` |
| Layout-material offsets | header z 109 / aside `top:100px` z 108 / section `right:100px; left:240px; margin-top:50px; height: calc(100% - 50px)` | `09.css:167–176` |
| `.l-table` min-height | **240px** | `09.css:145` (overridden to `inherit` by `09.css:1173`) |

Verified against the capture: `<body>` is `1842 × 1265` (`nodes-000.txt:9–10`), `.app-container` fills it (`nodes-000.txt:27–28`), and the navbar computes `height: 50px; min-height: 50px` (`nodes-000.txt:251–252`).

### 1.7 Bootstrap's spacing constants (`02.css`)

| Value | Where |
|---|---|
| **15px** grid gutter | `.container`/`.container-fluid` padding (`02.css:421, 431`), `.row` margin `-15px` (`02.css:432`), all `.col-*` padding (`02.css:433`) |
| **20px** vertical rhythm | `hr` (`:338`), `.h1–.h3` margin-top (`:344`), `.lead` (`:355`), `dl` (`:396`), `blockquote` (`:406`), `address` (`:413`), `.table` (`:651`), `legend` (`:686`), `.breadcrumb` (`:1138`), `.pagination`/`.pager` (`:1142, 1156`), `.thumbnail` (`:1199`), `.alert` (`:1203`), `.progress` (`:1230`), `.list-group` (`:1255`), `.panel`/`.panel-group` (`:1291, 1323`), `.well` (`:1364`) |
| **10px** | `p` margin-bottom (`:354`), `ol/ul` (`:391`), `.h1–.h3` margin-bottom (`:344`), `.h4–.h6` margin (`:346`), `pre` (`:418`), `.checkbox/.radio` (`:708`), `.media-left/-right` (`:1248–1249`), `.modal-dialog` (`:1376`), `.popover` offsets (`:1415–1418`) |
| **5px** | `label` margin-bottom (`:687`), `.help-block` margin-top (`:755`), `.btn-block + .btn-block` (`:845`), `.btn-toolbar` (`:882–884`), `.list-inline > li` (`:395`), `.media-heading` (`:1253`), `.panel-group .panel + .panel` (`:1325`) |
| Component padding | `.btn` **6px 12px** (`:782`) · `.btn-sm`/`.input-sm` **5px 10px** (`:842, 719`) · `.btn-xs` **1px 5px** (`:843`) · `.btn-lg`/`.input-lg` **10px 16px** (`:841, 726`) · `.form-control` **6px 12px** (`:695`) · `.input-group-addon` **6px 12px** (`:928`) · `.nav > li > a` **10px 15px** (`:944`) · `.dropdown-menu` **5px 0** (`:857`), item **3px 20px** (`:860`) · `.panel-body` **15px** (`:1292`) · `.panel-heading`/`.panel-footer` **10px 15px** (`:1293, 1297`) · `.list-group-item` **10px 15px** (`:1256`) · `.alert` **15px** (`:1203`) · `.modal-header/-body/-footer` **15px** (`:1381, 1384, 1385`) · `.well` **19px** (`:1364`), `-sm` **9px** (`:1367`), `-lg` **24px** (`:1366`) · `.jumbotron` **30px** vertical (`:1188`) · `.thumbnail`/`.img-thumbnail` **4px** (`:1199, 336`) · `.table td/th` **8px** (`:652`), condensed **5px** (`:657`) · `.breadcrumb` **8px 15px** (`:1138`) · `.pagination` **6px 12px** (`:1144`) · `.pager` **5px 14px** (`:1158`) · `.label` **.2em .6em .3em** (`:1163`) · `.badge` **3px 7px** (`:1179`) · `.popover-title` **8px 14px** (`:1419`), `-content` **9px 14px** (`:1420`) · `.tooltip-inner` **3px 8px** (`:1404`) · `code`/`kbd` **2px 4px** (`:415–416`) · `pre` **9.5px** (`:418`) · `blockquote` **10px 20px** (`:406`) |
| **`.navbar-nav` 7.5px -15px** | `02.css:1040` |
| **`.navbar-brand` 15px** | `02.css:1027` |
| **`.navbar-toggle` 9px 10px** | `02.css:1033` |

### 1.8 App overrides of Bootstrap spacing

| Rule | Value | Line |
|---|---|---|
| `.list-group .list-group-item` | `padding: 10px` (was `10px 15px`) | `09.css:17` |
| `.jumbotron` | `padding: 30px` (was `30px 0`) | `09.css:20` |
| `.nav-tabs-alerts > li > a` | `padding: 8px 18px` | `09.css:23` |
| `.nav-tabs-alerts > li.active > a` | `padding: 12px 22px` | `09.css:24` |
| `.nav-tabs-alerts > li` | `padding: 4px`; `.active` `0`; `.active + li` `padding-left: 4px`; `:first-child` `padding-left: 0` | `09.css:26–29` |
| `.tab-content` | `padding: 10px 20px`, `border-width: 0 1px 1px` | `09.css:30` |
| `.form-control` | `padding-left/right: 18px` (was 12px) | `09.css:33` |
| `.input-sm, select.input-sm` | `height: 31px` (Bootstrap says 30px, `02.css:719`) | `09.css:36` |
| `fieldset` | `padding-bottom: 20px`, `margin-bottom: 20px`, `border-bottom: 1px dashed rgb(238,238,238)` | `09.css:37` |
| `.table > thead > tr > th` | `padding-top/bottom: 20px !important` | `09.css:41` |
| `.btn-group-small .btn` | `padding: 10px`, `margin-bottom: 5px` | `09.css:328` |
| `.btn-xl` | `padding: 20px 16px` | `09.css:359` |
| `.btn-label` | `padding: 8px 18px`, `left: -24px`; `-lg` `14px 18px / -26px`; `-sm` `5px 18px / -18px`; `-xs` `1px 18px / -5px` | `09.css:364–372` |
| `.btn-circle` | `35 × 35`, `padding: 6px 0`; `-lg` `50 × 50`, `10px 16px`; `-xl` `70 × 70`, `10px 16px` | `09.css:376–378` |
| `.sidebar .nav-heading` | `padding: 12px 15px` | `09.css:183` |
| `.sidebar-nav > .nav > li > a` | `padding: 12px 15px` | `09.css:186` |
| `.sidebar-subnav > li > a` | `padding: 10px 20px 10px 40px` | `09.css:191` |
| `.chat` | `padding: 0 6px 0 0` | `09.css:1121` |
| `.chat li .chat-msg` | `padding: 3px 5px 5px` | `09.css:1128` |
| `.chat-top` | `padding: 0 10px`, `min-height: 40px` | `09.css:1229` |
| `.chatChannelTabs a` | `padding: 5px 4px !important`, `height: 33px`, `margin-top: 9px` | `09.css:1231` |
| `.drop-area` | `margin: 10px`, `padding: 20px 0`, `border: 2px dashed`, `radius 5px` | `09.css:1218` |
| `.toolbarBtn` | `padding-left/right: 10px` | `09.css:1171` |
| `.screenShareStatsElem` | `padding: 10px` | `09.css:1214` |
| `.wrapper-bg-image` | `padding: 25px` — **copy-B only** | `09.css:2547` |
| `#permissionsModal .modal-content` | `padding: 20px` — **copy-B only** | `09.css:2561` |
| `.texarea-alt-wrapper` / `.texarea-alt` / `.input-group-alt` | `2px` / `3.5px` / `1px 10px`, all `!important` — **copy-B only** | `09.css:2552–2554` |
| `.chat-tab-row` | `gap: 10px`, `padding: 5px 0` — **copy-B only** | `09.css:2571` |
| `.badge-preview` | `gap: 5px` — **copy-B only** | `09.css:2572` |

### 1.9 What the page actually computes

Exhaustive deviation counts from `DEFAULTS.txt` (COMMON = `0px` for every side) plus the parsed node records:

| Padding value | Nodes (T/R/B/L) | Origin |
|---|---|---|
| **15px** | 306 / 306 | `02.css:433` `.col-*` — the grid gutter dominates the page |
| **20px** | 11 / 126 / 14 / 128 | `02.css:860` `.dropdown-menu > li > a { padding: 3px 20px }` (horizontal); `09.css:2561` `#permissionsModal .modal-content` (all four, 1 node) |
| **12px** | 40 | `02.css:695` `.form-control`, `02.css:782` `.btn` (horizontal) |
| **10px** | 39 / 37 | `02.css:842` `.btn-sm`, `02.css:944` `.nav > li > a` |
| **8px** | 15 / 25 | `02.css:652` table cells |
| **7px** | **269 / 10 / 268** | `02.css:717` `.form-control-static { padding-top: 7px; padding-bottom: 7px }` — **268 nodes** (260 `p.form-control-static` + 8 with `ng-hide`); the biggest padding footprint on the page. The 269th is a `label.col-sm-4.control-label` from `02.css:773` `.form-horizontal .control-label { padding-top: 7px }` **inside `@media (min-width: 768px)`** — further live proof the 768 breakpoint is active |
| **3px** | **134 / 0 / 134** | `02.css:860` `.dropdown-menu > li > a` (vertical) + `02.css:1179` `.badge` |
| **6px** | 49 | `02.css:782` `.btn` (vertical) |
| **5px** | 27 | `02.css:842` `.btn-sm` (vertical) |
| **18px** | 9 | `09.css:33` `.form-control { padding-left/right: 18px }` |
| **25px** | 2 | `09.css:2547` `.wrapper-bg-image` — *(only 2 nodes; from an inline `style="padding: 25px; text-align: center;"`, not the class)* |
| **9.5px / 9px / 4px / 2px / 1px / 14px** | 1 / 1 / 1 / 4 / 4 / 1 | `pre`, `.popover-content`, `.thumbnail`, `.badge`-xs, `.btn-xs`, `.pager` |

| Margin value | Nodes | Origin |
|---|---|---|
| **5px** (bottom) | **503** | `02.css:687` `label { margin-bottom: 5px }` — the single biggest margin fact on the page |
| **9px** (top+bottom) | 25 each | `02.css:859` `.dropdown-menu .divider { margin: 9px 0 }` (25 `li.divider` nodes) |
| **20px** (top/bottom) | 12 / 17 | `02.css:338` `hr`, `02.css:651` `.table` |
| **10px** (top/bottom/right) | 7 / 14 / 7 | `02.css:354` `p`, `02.css:708` `.checkbox/.radio` |
| **-1px** (left) | **33** | `02.css:881` `.btn-group .btn + .btn { margin-left: -1px }` and `02.css:938` `.input-group-btn > .btn + .btn` |
| **-1px** (bottom) | 6 | `02.css:952` `.nav-tabs > li`, `02.css:1256` `.list-group-item` |
| **2px** (top) | 17 | `02.css:857` `.dropdown-menu { margin: 2px 0 0 }` (17 dropdowns) |
| **4px** (top) | 14 | `02.css:689` `input[type=checkbox]/[type=radio] { margin: 4px 0 0 }` |
| **3.9px** (left) | **12** | `10.css:18` `.fa.pull-right { margin-left: 0.3em }` × 13px = **3.9px** — 12 `<i class="fa fa-caret-right pull-right">` |
| **auto** (left+right) | 10 | `02.css:338` `hr` in a centred context |
| **30px** | 2 top / 1 bottom | `02.css:1391` `.modal-dialog { margin: 30px auto }` inside `@media(min-width:768px)`; `09.css:2568` `.users-many-actions` |
| **-2px / -10px / -11px / -20px / -5px / 15px** | 1 each | `.close` (`02.css:1382`), reCAPTCHA arrows (inline), `.sidebar-subnav` (`09.css:190`), `.navbar-text` (`02.css:1081`) |

| Border width | Nodes (T/R/B/L) | Origin |
|---|---|---|
| **1px** | 147 / 121 / **403** / 122 | The universal hairline. Bottom dominates: `02.css:951` `.nav-tabs`, `06.css:15` `.editable-click { border-bottom: 1px dashed }` on **269** nodes |
| **2px** | 3 each | `02.css:653` `.table > thead > tr > th { border-bottom: 2px }`, `09.css:46` `.popover { border-bottom-width: 2px }` |
| **4px** | 5 T/L/R | `02.css:854` `.caret { border 4px }` |
| **10px / 11px** | 1 / 2 each | reCAPTCHA bubble arrows (inline styles), `02.css:1422` `.popover > .arrow { border-width: 11px }` |

`DEFAULTS.txt:42–45` confirms the counts (`border-top-width` COMMON `0px` on 1999/2156, 6 distinct; `border-bottom-width` COMMON `0px` on 1746/2156, 5 distinct).

---

## 2. Border-radius — every declaration

### 2.1 The radius scale in force

`DEFAULTS.txt:54–57` — COMMON `0px` on 2067/2156 (top corners) and 2073/2156 (bottom corners), **6 distinct values each**.

| Computed radius | Nodes (TL/TR/BL/BR) | Origin |
|---|---|---|
| **0px** | 2067 / 2067 / 2073 / 2073 | default |
| **4px** | 52 / 52 / 46 / 46 | `02.css:782` `.btn`, `02.css:695` `.form-control`, `02.css:857` `.dropdown-menu`, `02.css:928` `.input-group-addon` |
| **2px** | 18 / 18 / 18 / 18 | **`09.css:48` `.dropdown-menu { border-radius: 2px }`** — the app's own radius, overriding Bootstrap's 4px |
| **10px** | 10 / 10 / 10 / 10 | `02.css:1179` `.badge` |
| **3px** | 8 / 8 / 8 / 8 | `02.css:842` `.btn-sm`, `02.css:719` `.input-sm`, `02.css:1293` `.panel-heading` |
| **6px** | 1 / 1 / 1 / 1 | `02.css:1377` `.modal-content` |

The 4-vs-6 asymmetry on `4px` (52 top, 46 bottom) is `02.css:887–892`: `.btn-group > .btn:first-child` zeroes only the right corners, `:last-child` only the left, so 6 buttons in groups keep top-4/bottom-0 combinations.

**Scale actually in force: `0 · 2 · 3 · 4 · 6 · 10` px.**

### 2.2 Every `border-radius` declaration, all 15 sheets

| Value | Count | Selectors (cited) |
|---|---|---|
| **4px** | 23 | `02.css:336` `.img-thumbnail` · `:415` `code` · `:418` `pre` · `:695` `.form-control` · `:782` `.btn` · `:857` `.dropdown-menu` · `:928` `.input-group-addon` · `:964` `.nav-tabs.nav-justified > li > a` · `:971` `.nav-pills > li > a` · `:985` `.nav-tabs-justified > li > a` · `:996` `.navbar` (@768) · `:1033` `.navbar-toggle` · `:1138` `.breadcrumb` · `:1142` `.pagination` · `:1203` `.alert` · `:1199` `.thumbnail` · `:1230` `.progress` · `:1324` `.panel-group .panel` · `:1291` `.panel` · `:1364` `.well` · `:1404` `.tooltip-inner` + 2 more |
| **0px** | 14 | `02.css:419` `pre code` · `:836` `.btn-link` · `:885, 890, 904, 907, 926` btn-group/input-group middles · `:1019` `.navbar-static-top` (@768) · `:1023` `.navbar-fixed-*` (@768) · `09.css:23` `.nav-tabs-alerts > li > a` · `09.css:57` `.topnavbar` · `09.css:358` `.btn-flat` · `09.css:360` `.btn-square` + 1 |
| **3px** | 12 | `02.css:416` `kbd` · `:719` `.input-sm` · `:722` `.form-group-sm .form-control` · `:842` `.btn-sm` · `:843` `.btn-xs` · `:922` `.input-group-sm` · `:929` `.input-group-addon.input-sm` · `:1367` `.well-sm` · `04.css:13` `.color-picker-swatch` · `05.css:4` addon · `09.css:272` `.setting-color > label` · `09.css:1203` `#clockdiv > div`, `:1204` `#clockdiv div > span` |
| **6px** | 11 | `02.css:335` `.img-rounded` · `:726` `.input-lg` · `:729` `.form-group-lg .form-control` · `:841` `.btn-lg` · `:919` `.input-group-lg` · `:930` `.input-group-addon.input-lg` · `:1192` `.jumbotron` in container · `:1366` `.well-lg` · `:1377` `.modal-content` · `:1414` `.popover` · `08.css:16` `.popover` |
| **`4px 4px 0 0`** | 5 | `02.css:905` `.btn-group-vertical > .btn:first-child` · `:953` `.nav-tabs > li > a` · `:967` `.nav-tabs.nav-justified > li > a` (@768) · `:988` `.nav-tabs-justified > li > a` (@768) · `:1075` `.navbar-fixed-bottom .navbar-nav > li > .dropdown-menu` |
| **10px** | 4 | `02.css:1179` `.badge` · `:1461` `.carousel-indicators li` · `04.css:27` picker handle · `09.css:244` `#loading-bar-spinner .spinner-icon` |
| **2px** | 4 | **`09.css:44` `.progress` · `09.css:46` `.popover` · `09.css:48` `.dropdown-menu` · `09.css:1128` `.chat li .chat-msg`** |
| **50%** | 3 | `02.css:337` `.img-circle` · `04.css:41` round picker panel · `09.css:383` `.angular-ripple` |
| **`5px 5px 0 0`** | 2 | `02.css:1419` `.popover-title` · `08.css:19` `.popover-title` |
| **5px** | 2 | `06.css:20` `.popover-wrapper form` · `09.css:1218` `.drop-area-alert, .drop-area` |
| **100%** | 2 | `09.css:242` `#loading-bar .peg` · `09.css:407` `.layer-morph-inner` |
| **100px** | 2 | `09.css:289` `.switch span` · `09.css:308` `.form-control-rounded` |
| **`1px 0 0 1px`** / **`0 1px 1px 0`** | 2 / 2 | `09.css:369–372` `.btn-sm/.btn-xs .btn-label` |
| **`2px 0 0 2px`** / **`0 2px 2px 0`** | 1 / 1 | `09.css:364–365` `.btn-label` |
| **`3px 0 0 3px`** / **`0 3px 3px 0`** | 1 / 1 | `09.css:367–368` `.btn-lg .btn-label` |
| **`0 0 4px 4px`** | 1 | `02.css:906` `.btn-group-vertical > .btn:last-child` |
| **1px** | 1 | `02.css:1035` `.navbar-toggle .icon-bar`; also `09.css:241` `#loading-bar .bar` bottom-right/top-right |
| **15px** | 1 | `02.css:1158` `.pager li > a` |
| **0.25em** | 1 | `02.css:1163` `.label` |
| **8px** | 1 | `04.css:28` picker handle inner |
| **400px** | 1 | `09.css:290` `.switch span::after` |
| **500px** | 1 | `09.css:376` `.btn-circle` |
| **25px / 35px** | 1 / 1 | `09.css:377` `.btn-circle.btn-lg` · `09.css:378` `.btn-circle.btn-xl` |
| **0.1em** | 1 | `10.css:14` `.fa-border` |
| **`0px !important`** | 2 | `09.css:396` `.slimScrollRail` · `09.css:967` `.radius-clear` |
| **`1px !important`** | 1 | `09.css:394` `.slimScrollBar` |
| **`50% !important`** | 1 | `09.css:968` `.circle` |
| **`3px !important`** | 1 | `09.css:969` `.rounded` |

Plus 4 per-corner families in `02.css` (`border-top-left-radius` etc., `02.css:887–892, 908–909, 932–934, 993, 1074, 1145–1155, 1257–1258, 1293–1314`) with values `0 / 3px / 4px / 6px`, and `09.css:361–362` `.btn-pill-left/-right/.btn-oval { …-radius: 50px }`.

---

## 3. Box-shadow — every declaration, all 15 sheets

### 3.1 The `.shadow-z1`–`z5` Material elevation set — `09.css:1115–1120`, verbatim

```
09.css:1115  .shadow-z1       { box-shadow: rgba(0,0,0,0.12) 0px 1px  6px,  rgba(0,0,0,0.12) 0px 1px  6px  !important; }
09.css:1116  .shadow-z2       { box-shadow: rgba(0,0,0,0.23) 0px 3px 10px,  rgba(0,0,0,0.16) 0px 3px 10px  !important; }
09.css:1117  .shadow-z2-hover { box-shadow: rgba(0,0,0,0.23) 0px 6px 10px,  rgba(0,0,0,0.19) 0px 10px 30px !important; }
09.css:1118  .shadow-z3       { box-shadow: rgba(0,0,0,0.23) 0px 6px 10px,  rgba(0,0,0,0.19) 0px 10px 30px !important; }
09.css:1119  .shadow-z4       { box-shadow: rgba(0,0,0,0.22) 0px 10px 18px, rgba(0,0,0,0.25) 0px 14px 45px !important; }
09.css:1120  .shadow-z5       { box-shadow: rgba(0,0,0,0.22) 0px 15px 20px, rgba(0,0,0,0.30) 0px 19px 60px !important; }
09.css:970   .shadow-clear, .no-shadow { box-shadow: rgb(0,0,0) 0px 0px 0px !important; }
```

**Six classes, five distinct values.** `.shadow-z2-hover` (`:1117`) and `.shadow-z3` (`:1118`) are **byte-identical** — so "z3" is not a distinct elevation, it is the hover state of z2 under a second name. A rebuild should ship four elevations plus a hover, not five elevations.

`.shadow-z1` is doubly redundant: both of its layers are the same `rgba(0,0,0,0.12) 0 1px 6px`, so it renders as a single 6px shadow at 12 % — it just paints it twice.

**Reuse of the z-values elsewhere in `09.css`** (all verbatim, without the class):

| Value | Also used by | Lines |
|---|---|---|
| z1 (`.12 0 1px 6px` ×2) | `.layout-material .app-container > section > .app` | `09.css:172` |
| z2 (`.23 0 3px 10px, .16 0 3px 10px`) | `.jumbotron` `!important` · `.well` `!important` · `.settings-inner` `!important` · `.settings-button` `!important` · `.btn:active/.active/:hover/:focus` (no `!important`) · `.btn-group.open .dropdown-toggle` · `.btn-image:hover/:focus` | `09.css:20, 22, 263, 264, 325, 327, 330` |

So **z2 is the app's interactive elevation**: every button hover/focus/active lifts to it (`09.css:325`).

### 3.2 Every other `box-shadow` in the app sheet

| Value | Selector | Line |
|---|---|---|
| `rgba(0,0,0,0.26) 0 2px 5px 0` | `.thumbnail` | `09.css:21` |
| `rgb(0,0,0) 0 0 0 !important` (the "no shadow" sentinel) | `.form-control` · `.btn.btn-link` · `.shadow-clear/.no-shadow` | `09.css:33, 322, 970` |
| `rgb(0,0,0) 0 0 0` (no `!important`) | `.progress` · `.progress .progress-bar` · `.popover` · `.btn.disabled/[disabled]/…` · `.btn-flat` | `09.css:44, 45, 46, 326, 358` |
| `rgba(0,0,0,0.14) 0 0 4px, rgba(0,0,0,0.28) 0 4px 8px` | `.app-container > header` | `09.css:97` |
| `rgba(0,0,0,0.14) 0 0 4px, rgba(0,0,0,0.28) 2px 4px 8px` | `.app-container > aside` (note the 2px x-offset) | `09.css:98` |
| `rgb(54,63,69) 1px 0 6px 1px` | `#loading-bar .peg` | `09.css:242` |
| `rgba(0,0,0,0.25) 1px 1px 5px inset` | `.switch span` | `09.css:289` |
| `rgba(0,0,0,0.4) 1px 1px 3px` | `.switch span::after` (the knob) | `09.css:290` |
| `none !important` | `.settings-wrapper.visible .settings-button` | `09.css:269` |
| `rgb(255,255,255) 0 -15px 15px inset` | `.smoothy::after` (fade-out mask) | `09.css:398` |
| `rgba(0,0,0,0.05) 0 1px 1px` | `.chat li .chat-body` | `09.css:1123` |

### 3.3 Every vendor `box-shadow`

| Value | Selector | Line |
|---|---|---|
| `rgba(0,0,0,0.075) 0 1px 1px inset` | `.form-control` · `.has-success/.has-warning/.has-error .form-control` | `02.css:695, 739, 744, 749` |
| `…inset, rgba(102,175,233,0.6) 0 0 8px` | `.form-control:focus` · `.ta-root.focussed > .ta-scroll-window` | `02.css:696`, `08.css:3` |
| `…inset, rgb(103,177,104) 0 0 6px` / `rgb(192,161,107)` / `rgb(206,132,131)` | `.has-success/.has-warning/.has-error .form-control:focus` | `02.css:740, 745, 750` |
| `rgba(0,0,0,0.25) 0 -1px 0 inset` | `kbd` | `02.css:416` |
| `rgba(0,0,0,0.125) 0 3px 5px inset` | `.btn.active/:active` · `.btn-group.open .dropdown-toggle` | `02.css:785, 896` |
| **`rgba(0,0,0,0.176) 0 6px 12px`** | `.dropdown-menu` | `02.css:857` |
| `rgba(255,255,255,0.1) 0 1px 0 inset` | `.navbar-collapse` | `02.css:1001` |
| `rgba(255,255,255,0.1) 0 1px 0 inset, rgba(255,255,255,0.1) 0 1px 0` | `.navbar-form` | `02.css:1053` |
| `rgba(0,0,0,0.1) 0 1px 2px inset` | `.progress` | `02.css:1230` |
| `rgba(0,0,0,0.15) 0 -1px 0 inset` | `.progress-bar` | `02.css:1231` |
| `rgba(0,0,0,0.05) 0 1px 1px` | `.panel` | `02.css:1291` |
| `rgba(0,0,0,0.05) 0 1px 1px inset` | `.well` | `02.css:1364` |
| **`rgba(0,0,0,0.5) 0 3px 9px`** → **`0 5px 15px`** @768 | `.modal-content` | `02.css:1377, 1392` |
| **`rgba(0,0,0,0.2) 0 5px 10px`** | `.popover` | `02.css:1414`, `08.css:16` |
| `rgba(0,0,0,0.5) 0 0 20px` | `.color-picker-panel` | `04.css:16` |
| `none` | `kbd kbd` · `.btn.disabled` · `.btn-link` · `.btn-group.open .dropdown-toggle.btn-link` · `.navbar-collapse` @768 · `.navbar-nav .open .dropdown-menu` @<768 · `.navbar-form` @768 | `02.css:417, 786, 837, 897, 1004, 1043, 1072` |
| `none !important` | `*, ::after, ::before` in `@media print` | `02.css:42` |

### 3.4 What actually renders

`DEFAULTS.txt:83` — COMMON `none` on **2,094/2,156**, only **6 distinct values**. Exhaustive:

| Computed shadow | Nodes | Who | Source |
|---|---|---|---|
| `none` | 2,094 | everything else | — |
| **`rgb(0,0,0) 0 0 0 0`** | **42** | 29 `button.btn`, 8 `input.form-control`, 2 `div.btn`, 1 `.ta-scroll-window`, 1 `textarea`, 1 `.popover` | `09.css:33` `.form-control` + `09.css:326` `.btn.disabled` + `09.css:322` `.btn.btn-link` + `09.css:46` `.popover` |
| **`rgba(0,0,0,0.176) 0 6px 12px 0`** | **17** | 17 `ul.dropdown-menu` | `02.css:857` |
| `rgba(0,0,0,0.5) 0 5px 15px 0` | 1 | `div.modal-content` | `02.css:1392` (the `@media(min-width:768px)` value, so the breakpoint is active — see §4.1) |
| `rgba(0,0,0,0.2) 2px 2px 3px 0` | 1 | reCAPTCHA badge `div` | inline `style` (`nodes-000.txt:104`) |
| `rgba(0,0,0,0.05) 0 1px 1px 0` | 1 | `div.panel` | `02.css:1291` |

**Not one `.shadow-z*` class is used on this page** — zero elements carry any of the six. Same for `.app-container > header/aside` (no `<header>`/`<aside>` node) and `.thumbnail`. **The entire Material elevation system is declared and inert on the Manage-Room route.** Honest gap: it must be re-verified against a route that uses it.

Also note the app's "kill the shadow" idiom: `box-shadow: rgb(0,0,0) 0 0 0` rather than `none`. It renders identically (a zero-size shadow) but it *is* a shadow value, so `DEFAULTS` counts it as a deviation — that is why 42 nodes appear to "have" a shadow.

---

## 4. Every `@media` block, all 15 sheets

**144 `@media` blocks total**: `02.css` 68 · `09.css` 74 (37 per copy × 2) · `06.css` 2 · all other sheets 0.

### 4.1 The breakpoint set

| Breakpoint | Query forms | Blocks | Active on this capture (1842px)? |
|---|---|---|---|
| **480** | `only screen and (min-width: 480px)` | 2 (1 per `09.css` copy) | ✅ yes |
| **479** | `only screen and (max-width: 479px)` | 2 | ❌ no |
| **767** | `(max-width: 767px)` ×9 · `only screen and (max-width: 767px)` ×6 · `screen and (max-width: 767px)` ×1 | 16 | ❌ no |
| **768** | `(min-width: 768px)` ×27 · `only screen and (min-width: 768px)` ×26 · `screen and (min-width: 768px)` ×2 | 55 | ✅ yes |
| **768–991** | `(min-width: 768px) and (max-width: 991px)` | 5 | ❌ no |
| **991** | `only screen and (max-width: 991px)` | 2 | ❌ no |
| **992** | `(min-width: 992px)` ×3 · `only screen and (min-width: 992px)` ×2 | 5 | ✅ yes |
| **992–1199** | `(min-width: 992px) and (max-width: 1199px)` | 5 | ❌ no |
| **1200** | `(min-width: 1200px)` | 7 | ✅ yes |
| **750** (vendor) | `screen and (max-width: 750px)` ×1 · `screen and (min-width: 750px)` ×1 | 2 | min-750 ✅ / max-750 ❌ |
| `print` | `@media print` | **40** (6 in `02.css`, 34 in `09.css`) | ❌ no |
| `(-webkit-min-device-pixel-ratio: 0)` | `screen and …` | 1 | ✅ yes (Chrome) |
| `(transform-3d), (-webkit-transform-3d)` | feature query | 1 | ✅ yes |
| `(max-device-width: 480px) and (orientation: landscape)` | | 1 | ❌ no |

**Breakpoint scale: `480 · 768 · 992 · 1200` px** (with `479 / 767 / 991 / 1199` as the max-width mirrors). This is stock Bootstrap 3 (`768 / 992 / 1200`) plus one app-only 480 step (`09.css:112`) and one app-only 479 step (`09.css:934`). Vendor sheet 06 adds a stray non-standard **750** (`06.css:23, 28`).

**Only the ≥768, ≥992, ≥1200 and ≥480 branches are exercised by this capture** (viewport 1842 px, `00-META.txt:9`). Every `max-width` branch and every `print` block is untested — see §8.

### 4.2 `09.css` — all 37 blocks per copy, with contents

**`@media only screen and (min-width: 768px)` — 13 blocks**

| Block | Contents |
|---|---|
| `09.css:59–61` | `.topnavbar > .navbar-header { background-image: none; z-index: 1 }` |
| `09.css:63–65` | `.topnavbar > .navbar-header > .navbar-brand { margin: 0 15px }` (base is `0 50px`) |
| `09.css:73–75` | `.topnavbar .mobile-toggles { display: none }` |
| `09.css:79–81` | `.topnavbar .nav > li > a:hover, …:focus { background-color: rgba(54,63,69,0.05) }` |
| `09.css:87–93` | `.nav-wrapper { position: relative }` + `::before/::after { content:" "; display:table }` + `::after{clear:both}` + `.navbar-nav .open .dropdown-menu { left:auto; right:auto }` + `.navbar-nav.navbar-right .open .dropdown-menu { left:auto; right:0 }` |
| `09.css:102–104` | `.app-container > section, .app-container > footer { margin-left: 240px }` |
| `09.css:116–118` | `.app-view-header > button, > .btn { margin: 0 }` |
| `09.css:139–142` | `.app-fh { left: 240px }` · `.app-display-flex { display: flex !important }` |
| `09.css:166–177` | The 10-rule `layout-material` block (header z 109 + `padding-top:50px`; navbar-nav `margin-top:-50px`; aside `top:100px` z 108 `margin-left:0!important`; section absolute `right:100px left:240px margin-top:50px height:calc(100% - 50px)`; `.app` white + z1 shadow; footer `display:none`; `.btn-offset { padding-top:50px; right:30px }`; `.app { min-height:100%; padding-bottom:20px }`; `.app-fh { top:0; left:0 }`) |
| `09.css:194–198` | `.sidebar > .sidebar-nav > .nav { padding-right: 0 }` · `.label, .sidebar-item-caret { margin: 2px 0 0; overflow: hidden }` · `.sidebar-item-caret + .label { margin-right: 5px }` |
| `09.css:235–237` | `.layout-material #loading-bar { height: 100px }` |
| `09.css:314–316` | `.input-huge { font-size: 42px }` |
| `09.css:419–421` | `.layer-morph-container .layer-morph-wrapper { padding-left: 70px }` |

**`@media only screen and (min-width: 480px)` — 1 block**
`09.css:112–114` — `.app-view-header > small { display: inline-block }` (base is `display: block`).

**`@media only screen and (min-width: 992px)` — 1 block**
`09.css:317–319` — `.input-huge { font-size: 82px }`.

**`@media only screen and (max-width: 767px)` — 3 blocks**
* `09.css:121–125` — `.csstransforms3d1 .app-container { backface-visibility: hidden }` · `> aside { margin-left:0; transform-style:preserve-3d; transform:translate3d(0,0,0) }` · `.aside-offscreen … > aside { transform: translate3d(-240px,0,0) }`
* `09.css:151–153` — `#cssLogo { display: none }`
* `09.css:945–955` — the 9 `-md` border utilities (`.b0-md`, `.bl0-md`, `.br0-md`, `.bt0-md`, `.bb0-md`, `.br-md`, `.bl-md`, `.bt-md`, `.bb-md`)

**`@media only screen and (max-width: 479px)` — 1 block**
`09.css:934–944` — the 9 `-sm` border utilities.

**`@media only screen and (max-width: 991px)` — 1 block**
`09.css:956–966` — the 9 `-lg` border utilities.

**`@media print` — 17 blocks**
* `09.css:253–259` (5 rules): `.sidebar, .topnavbar, .settings, .btn { display:none!important; width:0!important; height:0!important }` · `.app-container, > section, .app { margin:0!important; width:100%!important }` · `> aside, > footer { display:none }` · `.app { overflow:hidden!important }` · `.text-muted { color: rgb(230,233,238) !important }`
* 16 single-rule blocks, one per `.bg-*` family, each `{ color: rgb(0,0,0) !important }`: `09.css:443` `.bg-gray` · `:465` `.bg-gray-darker` · `:487` `.bg-gray-dark` · `:509` `.bg-gray-light` · `:531` `.bg-gray-lighter` · `:553` `#bg-white, .bg-white` · `:575` `.bg-inverse` · `:599` `.bg-primary` · `:623` `.bg-success` · `:647` `.bg-info` · `:671` `.bg-warning` · `:695` `.bg-danger` · `:719` `.bg-amber` · `:743` `.bg-pink` · `:767` `.bg-purple` · `:791` `.bg-orange`

### 4.3 `02.css` — all 68 blocks, grouped by what they govern

| Group | Blocks | Lines |
|---|---|---|
| **Print reset** (17 rules) | 1 | `02.css:41–59` |
| `.lead` 16 → 21px | 1 @768 | `02.css:356–358` |
| `.dl-horizontal` two-column | 1 @768 | `02.css:400–403` |
| `.container` width 750 / 970 / 1170 | 3 @768/992/1200 | `02.css:422–430` |
| **Grid** `.col-sm-*` / `.col-md-*` / `.col-lg-*` — 52 rules each (float + 12 widths + 13 pull + 13 push + 13 offset) | 3 @768/992/1200 | `02.css:486–539`, `:540–593`, `:594–647` |
| `.table-responsive` | 1 screen@≤767 (7 rules) | `02.css:676–684` |
| Date-input line-heights | 1 `-webkit-min-device-pixel-ratio: 0` (3 rules) | `02.css:702–706` |
| `.form-inline` | 1 @768 (11 rules) | `02.css:756–768` |
| `.form-horizontal .control-label` | 3 @768 | `02.css:772–781` |
| `.navbar-right .dropdown-menu` | 1 @768 | `02.css:874–877` |
| `.nav-tabs.nav-justified` / `.nav-justified` / `.nav-tabs-justified` | 4 @768 | `02.css:960–963, 966–969, 980–983, 987–990` |
| Navbar geometry (`.navbar` radius, `.navbar-header` float, `.navbar-collapse`, `.container* > .navbar-*`, `.navbar-static-top`, `.navbar-fixed-*`, `.navbar-brand`, `.navbar-toggle`, `.navbar-nav`, `.navbar-form`, `.navbar-text`, `.navbar-left/-right`) | 12 @768 | `02.css:995–1000, 1003–1008, 1014–1016, 1018–1024, 1030–1032, 1037–1039, 1048–1052, 1054–1066, 1071–1073, 1080–1087` |
| Navbar collapsed-menu (`.navbar-nav .open .dropdown-menu`, `.navbar-form .form-group`, `.navbar-default`, `.navbar-inverse` dropdown colours) | 4 @≤767 | `02.css:1042–1047, 1067–1070, 1101–1106, 1125–1132` |
| Landscape phone collapse max-height 200px | 1 `(max-device-width:480px) and (orientation:landscape)` | `02.css:1010–1012` |
| `.jumbotron` 48px + 60px + h1 63px | 1 screen@768 | `02.css:1194–1198` |
| **`.modal-dialog` 600px + `margin:30px auto`, `.modal-content` shadow `0 5px 15px`, `.modal-sm` 300px** | 1 @768 | `02.css:1390–1394` |
| `.modal-lg` 900px | 1 @992 | `02.css:1395–1397` |
| Carousel 3D transforms | 1 `(transform-3d),(-webkit-transform-3d)` (4 rules) | `02.css:1436–1441` |
| Carousel controls 30×30 + captions | 1 screen@768 (5 rules) | `02.css:1465–1471` |
| **`.visible-xs*`** (4 blocks) | 4 @≤767 | `02.css:1485–1499` |
| **`.visible-sm*`** (4) | 4 @768–991 | `02.css:1500–1514` |
| **`.visible-md*`** (4) | 4 @992–1199 | `02.css:1515–1529` |
| **`.visible-lg*`** (4) | 4 @1200 | `02.css:1530–1544` |
| **`.hidden-xs/-sm/-md/-lg`** (4) | 4 | `02.css:1545–1556` |
| **`.visible-print*` / `.hidden-print`** (5) | 5 print | `02.css:1558–1577` |

**Verified live at 1842 px:** `.modal-dialog` computes `width: 600px; margin: 30px 621px` (`caps/01-modal_permissionsModal/nodes-000.txt:35–46`) and `.modal-content` computes `box-shadow: rgba(0,0,0,0.5) 0 5px 15px 0` — both the `@media (min-width: 768px)` values from `02.css:1391–1392`, not the base values. Direct proof the 768 breakpoint is active.

### 4.4 `06.css` — 2 blocks (the only vendor breakpoints)

```
06.css:23–27  @media screen and (max-width: 750px) { .popover-wrapper form { margin-left: -60px }
                                                     .popover-wrapper form::before { left: 50px }
                                                     .popover-wrapper form::after  { left: 51px } }
06.css:28–32  @media screen and (min-width: 750px) { .popover-wrapper form { margin-left: -110px }
                                                     .popover-wrapper form::before { left: 100px }
                                                     .popover-wrapper form::after  { left: 101px } }
```

A non-standard 750 px breakpoint that exists nowhere else in the stack. It is a hard-coded xeditable value; a rebuild should normalise it to 768 or drop the plugin.

---

## 5. Z-index layers — the complete stack

`DEFAULTS.txt:13` — COMMON `auto` on 2,116/2,156, **8 distinct values**.

### 5.1 Every `z-index` declaration, all 15 sheets, ordered high → low

| z | Selector(s) | Line |
|---|---|---|
| **2000000000** | *(5 reCAPTCHA nodes, all from inline `style`, no CSS rule)* | `nodes-000.txt:104, 151, 168, 197, 225` |
| **99999** | `.color-picker-panel` · **`.btn-offset`** | `04.css:16`, `09.css:379` |
| **90002** | `#loading-bar-spinner` | `09.css:243` |
| **9999** | `.smoothy::after` | `09.css:398` |
| **9003** | `.layer-morph-close` | `09.css:408` |
| **9002** | `.layer-morph-container` | `09.css:417` |
| **9001** | `.layer-morph-overlay` | `09.css:406` |
| **3001** | `.topnavbar .sidebar-toggle, .topnavbar .menu-toggle` · `.settings-wrapper` | `09.css:76`, `09.css:262` |
| **1070** | `.tooltip` | `02.css:1398` |
| **1060** | `.popover` | `02.css:1414`, `08.css:16` |
| **1050** | `.modal` | `02.css:1372` |
| **1040** | `.modal-backdrop` | `02.css:1378` |
| **1030** | `.navbar-fixed-bottom, .navbar-fixed-top` | `02.css:1021` |
| **1000** | `.dropdown-menu` · `.navbar-static-top` · `#webcamCamDiv` · `.posted-video-container` | `02.css:857, 1017`, `09.css:1187, 1263` |
| **999** | `.abs-center.abs-fixed` | `09.css:1108` |
| **990** | `.dropdown-backdrop` | `02.css:870` |
| **410** | **`.app-container > header`** | `09.css:97` |
| **310** | **`.app-container > aside`** | `09.css:98` |
| **210** | **`.app-container > footer`** | `09.css:100` |
| **110** | **`.app-container > section`** | `09.css:99` |
| **109 / 108** | `.layout-material` header / aside (inside `@media(min-width:768px)`) | `09.css:167, 170` |
| **101** | `.popover-wrapper form` | `06.css:20` |
| **100** | `.ta-resizer-handle-overlay` · `.wrapper-bg-image` (**copy-B only**) | `08.css:8`, `09.css:2547` |
| **99** | picker `.color-picker-picker` | `04.css:27` |
| **15** | `.carousel-indicators` | `02.css:1460` |
| **10** | `.carousel-caption` | `02.css:1463` |
| **9** | picker `.color-picker-grid-inner` | `04.css:25` |
| **5** | `.carousel-control .glyphicon-chevron-*` · `.carousel .carousel-control em` | `02.css:1454`, `09.css:52` |
| **3** | `.input-group .form-control:focus` · `.pagination > .active > a` · `.color-picker-swatch` · `.color-picker-slider` | `02.css:918, 1148`, `04.css:12, 22` |
| **2** | `.form-control-feedback` · `.btn-group-vertical > .btn.active/:active/:focus/:hover` · `.input-group .form-control` · `.input-group-btn > .btn:active/:focus/:hover` · `.input-group-btn:last-child > .btn` · `.pagination > li > a:focus/:hover` · `.list-group-item.active` · `.color-picker-input` · `.color-picker-overlay` | `02.css:735, 880, 917, 939, 941, 1147, 1266`, `04.css:6, 19` |
| **1** | `.topnavbar > .navbar-header` (@768) · `.navbar-brand` · `.smoothy` · `.layer-morph-inner` | `09.css:60, 62, 397, 407` |
| **-1** | `#loading-bar` · `.switch input` · `.show-behind` | `09.css:234, 288, 1042` |

### 5.2 The app's own 4-layer shell (`09.css:97–100`) — the load-bearing design decision

```
header  410      ← .app-container > header, position: relative
aside   310      ← .app-container > aside,  position: absolute, top:50px, width:240px
footer  210      ← .app-container > footer, position: absolute, bottom:0, height:60px
section 110      ← .app-container > section, height:100%
```

Spaced by **100** so intermediate values are available inside each region. The `layout-material` variant re-stacks header/aside to **109 / 108** (`09.css:167, 170`), i.e. *below* `section`'s 110 — that is how the material layout tucks the chrome under the content card.

### 5.3 What actually stacks on the page

| z | Nodes | Who |
|---|---|---|
| `auto` | 2,116 | default |
| **1000** | **17** | `ul.dropdown-menu` (`02.css:857`) |
| **2** | 13 | 8 `button.btn` (`02.css:939/941`), 5 `input.form-control` (`02.css:917`) |
| **2000000000** | 5 | reCAPTCHA (inline styles) |
| **1** | 2 | `div.navbar-header`, `div.navbar-brand` (`09.css:60, 62` — the `@media(min-width:768px)` branch) |
| **1060** | 1 | `div.popover` |
| **1050** | 1 | `div.modal` |
| **100** | 1 | `div.ta-resizer-handle-overlay` |

8 distinct values ✓ matches `DEFAULTS.txt:13`. **The 410/310/210/110 shell never appears** — this page has no `<header>`, `<aside>` or `<footer>` element inside `.app-container`; the layout uses `ui-view` divs instead. The shell is declared and inert on this route.

**Third-party z-index domination:** reCAPTCHA's inline `2000000000` beats every CSS-declared layer by five orders of magnitude. A rebuild's own stacking context must stay under it or the challenge dialog will be occluded.

---

## 6. Transitions and animations

### 6.1 Every `transition` declaration

| Duration | Property / easing | Selector | Line |
|---|---|---|---|
| **0.15s** | `opacity … linear` | `.fade` | `02.css:847` |
| **0.15s** | `border-color ease-in-out, box-shadow ease-in-out` | `.form-control` | `02.css:695` |
| **0.2s** | `ease-in-out` (all) | `.img-thumbnail` | `02.css:336` |
| **0.2s** | `border … ease-in-out` | `.thumbnail` | `02.css:1199` |
| **0.2s** | *(all)* | `.switch span::after`, `.switch input:checked + span::after` | `09.css:290, 296` |
| **0.2s** | `opacity` | `.layer-morph-close` | `09.css:408` |
| **0.2s + 0.4s delay** | `opacity` | `.layer-morph-active .layer-morph-close` | `09.css:414` |
| **0.25s** | *(all)* | `.avatarChooser` | `09.css:1141` |
| **0.3s** | `transform … ease-out` | `.modal.fade .modal-dialog` | `02.css:1373` |
| **0.3s** | `opacity` | `.slimScrollBar` | `09.css:394` |
| **0.3s** | `right … cubic-bezier(0.86, 0, 0.07, 1)` | `.settings-wrapper` | `09.css:262` |
| **0.3s (×5, staged)** | `top .3s .1s, right .3s .1s, box-shadow linear .3s, border .3s linear .3s, background linear .3s` | `.settings-button` | `09.css:264` |
| **0.3s + 0.1s delay (×2)** | `top, right` | `.settings-wrapper.visible .settings-button` | `09.css:269` |
| **0.35s** | `ease` (height, visibility) | `.collapsing` | `02.css:853` |
| **350ms** | `linear` (all) | `#loading-bar, #loading-bar-spinner` | `09.css:238` |
| **350ms** | `width` | `#loading-bar .bar` | `09.css:241` |
| **0.4s** | `content linear` | `.settings-button > em::before` | `09.css:266` |
| **0.5s** | *(all)* | `.switch span`, `.switch input:checked + span` | `09.css:289, 295` |
| **0.5s** | `visibility linear` | `.layer-morph-overlay` | `09.css:406` |
| **0.5s** | `transform … cubic-bezier(0.42, 0, 0.58, 1)` | `.layer-morph-inner`, `.layer-morph-active .layer-morph-inner` | `09.css:407, 413` |
| **0.5s** | `opacity` | `.layer-morph-container .layer-morph` | `09.css:422` |
| **0.6s** | `width` | `.progress-bar` | `02.css:1231` |
| **0.6s** | `left … ease-in-out` | `.carousel-inner > .item` | `02.css:1434` |
| **0.6s** | `transform … ease-in-out` (inside `@media (transform-3d)`) | `.carousel-inner > .item` | `02.css:1437` |

**The duration scale in force: `0.15 · 0.2 · 0.25 · 0.3 · 0.35 · 0.4 · 0.5 · 0.6` s.**
**Two custom easing curves:** `cubic-bezier(0.86, 0, 0.07, 1)` (settings drawer, `09.css:262`) and `cubic-bezier(0.42, 0, 0.58, 1)` (= `ease-in-out`, layer-morph, `09.css:407, 413`). Everything else is `ease`, `linear` or `ease-in-out`.

**Computed** — `DEFAULTS.txt:90–91`: COMMON `transition-property: all` / `transition-duration: 0s` on **2,142/2,156**, 5 distinct values.

| Computed | Nodes | Source |
|---|---|---|
| `border-color, box-shadow` @ `0.15s, 0.15s` | 10 | `02.css:695` `.form-control` (8 inputs + 1 `.ta-scroll-window` + 1 `textarea`) |
| `opacity` @ `0.15s` | 2 | `02.css:847` `.fade` — `div.modal`, `div.popover` |
| `visibility, opacity` @ `0s, 0.3s` | 1 | reCAPTCHA badge (inline) |
| `transform` @ `0.3s` | 1 | `02.css:1373` `.modal-dialog` |

Only **14 of 2,156 nodes have any transition at all.**

### 6.2 Every keyframe animation

| Sheet | `@keyframes` blocks | Names |
|---|---|---|
| `02.css` | 2 (`@-webkit-` + std) | `progress-bar-stripes` — `02.css:1222, 1226`; used by `.progress-bar.active` @ `2s linear infinite` (`02.css:1233`) |
| `10.css` | 2 | `fa-spin` (0° → 359°) — `10.css:21, 25`; used by `.fa-spin` @ `2s linear infinite` (`10.css:19`) and `.fa-pulse` @ `1s steps(8) infinite` (`10.css:20`) |
| `12.css` | **148** (74 `@-webkit-` + 74 std) | The full animate.css v3 surface — see P26 §3 |
| `09.css` (copy A) | 7 | `fadeInLeft2` (`:226, 230`), `loading-bar-spinner` (`:245, 249`), `ripple` (`:385, 389`), `showYtBtns` (`:1268`) |

**App-local keyframes, verbatim:**

```
09.css:226/230  fadeInLeft2         0%{opacity:0; transform:translate3d(-18px,0,0)} 100%{opacity:1; transform:none}
09.css:245/249  loading-bar-spinner 0%{rotate(0deg)} 100%{rotate(360deg)}
09.css:385/389  ripple              0%{scale(0); opacity:.4} 100%{scale(3); opacity:0}
09.css:1268     showYtBtns          0%{opacity:0} 90%{opacity:0} 100%{opacity:1}
```

**Every `animation` shorthand in `09.css` copy A — the AngularJS view transitions (`09.css:202–223`), all `0.35s ease` except the last two:**

| Class | enter | leave |
|---|---|---|
| `.ng-fadeInLeft2` | `fadeInLeft2` | `fadeOutRight` |
| `.ng-fadeIn` | `fadeIn` | `fadeOut` |
| `.ng-fadeInUp` | `fadeInUp` | `fadeOutDown` |
| `.ng-fadeInDown` | `fadeInDown` | `fadeOutUp` |
| `.ng-fadeInRight` | `fadeInRight` | `fadeOutLeft` |
| `.ng-fadeInLeft` | `fadeInLeft` | `fadeOutRight` |
| `.ng-fadeInUpBig` | `fadeIn**Down**Big` ⚠ | `fadeOutDownBig` |
| `.ng-fadeInDownBig` | `fadeIn**Up**Big` ⚠ | `fadeOutUpBig` |
| `.ng-fadeInRightBig` | `fadeInRightBig` | `fadeOutLeftBig` |
| `.ng-fadeInLeftBig` | `fadeInLeftBig` | `fadeOutRightBig` |
| **`.ng-fadeOutZoom`** | `zoomIn` @ **`1s cubic-bezier(0.23, 1, 0.32, 1)`** | `fadeOut` @ same |

⚠ `.ng-fadeInUpBig` runs `fadeInDownBig` and `.ng-fadeInDownBig` runs `fadeInUpBig` (`09.css:214, 216`) — the two are swapped relative to their class names. Reproduce or fix deliberately, but note it.

**`.ng-fadeOutZoom` is the one that actually runs on this page.** Two nodes carry it: `nodes-000.txt:135` `<div class="ng-fadeOutZoom ng-fluid ng-scope">` (the navbar wrapper) and `nodes-000.txt:266` `<div ui-view class="ng-fadeOutZoom ng-fluid ng-scope">` (the route wrapper). So the route transition is a **1 s `zoomIn` on `cubic-bezier(0.23, 1, 0.32, 1)`** (an aggressive ease-out) — 2.9× longer than every other view transition.

**Other `animation` shorthands:** `.animated { animation-duration: 0.5s; animation-fill-mode: both }` (`09.css:224`) — **which conflicts with `12.css:2` `.animated { animation-duration: 1s; animation-fill-mode: both }`.** Sheet 12 (animate.css) loads **after** sheet 09, so **1 s wins**. `12.css:4` `.animated.hinge { 2s }` and `12.css:5` `.animated.bounceIn/.bounceOut/.flipOutX/.flipOutY { 0.75s }` also survive. Then `#loading-bar-spinner .spinner-icon` `400ms linear infinite` (`09.css:244`), `.angular-ripple.animate` `0.35s linear` (`09.css:384`), `.yt-btn` `5s ease forwards showYtBtns` (`09.css:1267`).

**Computed:** `DEFAULTS.txt:92` — `transform: none` on 2,141/2,156, 2 distinct; the 15 deviating nodes all compute `matrix(1, 0, 0, 1, 0, 0)` (identity) except the modal dialog at `matrix(1,0,0,1,0,-82.1777)`. No animation was mid-flight at capture time, so **every animation above is declared-only** — an honest gap.

---

## 7. Rebuild spec

```css
:root {
  /* ── SPACING (09.css:806-860) — margin tops at 30, padding at 25 ─────── */
  --sp-0:  0;      /* .m0  .p0                        09.css:806, 831 */
  --sp-1:  5px;    /* .m-sm .p-sm                     09.css:816, 841 */
  --sp-2:  10px;   /* .m   .p     (base)              09.css:811, 836 */
  --sp-3:  15px;   /* .m-lg .p-lg + BS grid gutter    09.css:821, 846 · 02.css:421 */
  --sp-4:  20px;   /* .p-xl  ONLY — no margin step    09.css:851 */
  --sp-5:  25px;   /* .p-xxl ONLY — no margin step    09.css:856 */
  --sp-6:  30px;   /* .m-xl  ONLY — no padding step   09.css:826 */
  /* BS component paddings that must be reproduced verbatim: */
  --pad-btn:      6px 12px;   /* 02.css:782  */
  --pad-btn-sm:   5px 10px;   /* 02.css:842  */
  --pad-btn-xs:   1px 5px;    /* 02.css:843  */
  --pad-btn-lg:   10px 16px;  /* 02.css:841  */
  --pad-input:    6px 18px;   /* 02.css:695 vertical + 09.css:33 horizontal — THE APP OVERRIDE */
  --pad-cell:     8px;        /* 02.css:652  */
  --pad-nav-item: 10px 15px;  /* 02.css:944  */
  --pad-dd-item:  3px 20px;   /* 02.css:860  */
  --pad-panel:    15px;       /* 02.css:1292 */
  --pad-badge:    3px 7px;    /* 02.css:1179 */

  /* ── RADII (§2.1) ───────────────────────────────────────────────────── */
  --r-0:    0;      --r-sm: 2px;   /* 09.css:48  the app's own dropdown radius */
  --r-md:   3px;    /* 02.css:842 .btn-sm / .input-sm */
  --r-base: 4px;    /* 02.css:782 .btn / .form-control */
  --r-lg:   6px;    /* 02.css:1377 .modal-content */
  --r-pill: 10px;   /* 02.css:1179 .badge */
  --r-full: 50%;    /* 02.css:337 .img-circle */

  /* ── ELEVATION (09.css:1115-1120) — 4 real levels + hover ───────────── */
  --shadow-none: none;
  --shadow-z1: 0 1px  6px  rgba(0,0,0,.12);                                 /* 09.css:1115 (source paints it twice) */
  --shadow-z2: 0 3px 10px  rgba(0,0,0,.23), 0 3px 10px rgba(0,0,0,.16);     /* 09.css:1116 — the interactive level */
  --shadow-z3: 0 6px 10px  rgba(0,0,0,.23), 0 10px 30px rgba(0,0,0,.19);    /* 09.css:1117 === 09.css:1118 */
  --shadow-z4: 0 10px 18px rgba(0,0,0,.22), 0 14px 45px rgba(0,0,0,.25);    /* 09.css:1119 */
  --shadow-z5: 0 15px 20px rgba(0,0,0,.22), 0 19px 60px rgba(0,0,0,.30);    /* 09.css:1120 */
  --shadow-header:   0 0 4px rgba(0,0,0,.14), 0 4px 8px rgba(0,0,0,.28);    /* 09.css:97  */
  --shadow-aside:    0 0 4px rgba(0,0,0,.14), 2px 4px 8px rgba(0,0,0,.28);  /* 09.css:98  */
  --shadow-dropdown: 0 6px 12px rgba(0,0,0,.176);                           /* 02.css:857 — 17 nodes */
  --shadow-modal:    0 5px 15px rgba(0,0,0,.5);                             /* 02.css:1392 @768 */
  --shadow-panel:    0 1px 1px  rgba(0,0,0,.05);                            /* 02.css:1291 */
  --shadow-inset:    inset 0 1px 1px rgba(0,0,0,.075);                      /* 02.css:695  */

  /* ── BREAKPOINTS (§4.1) ─────────────────────────────────────────────── */
  --bp-xs:  480px;  /* APP-ONLY  09.css:112 */
  --bp-sm:  768px;  /* 55 blocks — by far the dominant breakpoint */
  --bp-md:  992px;
  --bp-lg: 1200px;

  /* ── Z-INDEX (§5.2) ─────────────────────────────────────────────────── */
  --z-behind:    -1;    /* 09.css:234, 288, 1042 */
  --z-section:   110;   /* 09.css:99  */
  --z-footer:    210;   /* 09.css:100 */
  --z-aside:     310;   /* 09.css:98  */
  --z-header:    410;   /* 09.css:97  */
  --z-dropdown: 1000;   /* 02.css:857 */
  --z-backdrop: 1040;   /* 02.css:1378 */
  --z-modal:    1050;   /* 02.css:1372 */
  --z-popover:  1060;   /* 02.css:1414 */
  --z-tooltip:  1070;   /* 02.css:1398 */
  --z-drawer:   3001;   /* 09.css:262, 76 */
  --z-morph:    9001;   /* 09.css:406-417 (9001/9002/9003) */
  --z-spinner: 90002;   /* 09.css:243 */
  /* reCAPTCHA occupies 2000000000 via inline style — stay below it. */

  /* ── MOTION (§6.1) ──────────────────────────────────────────────────── */
  --dur-fast:   0.15s;  /* 02.css:695 .form-control, 02.css:847 .fade */
  --dur-base:   0.2s;   /* 09.css:290 switch knob */
  --dur-md:     0.3s;   /* 02.css:1373 modal, 09.css:262 drawer */
  --dur-slow:   0.35s;  /* 02.css:853 collapse, 09.css:202-221 view transitions */
  --dur-slower: 0.5s;   /* 09.css:289 switch track, 09.css:406 layer-morph */
  --dur-route:  1s;     /* 09.css:222 .ng-fadeOutZoom zoomIn — the one that runs */
  --ease-drawer: cubic-bezier(0.86, 0, 0.07, 1);   /* 09.css:262 */
  --ease-morph:  cubic-bezier(0.42, 0, 0.58, 1);   /* 09.css:407 */
  --ease-route:  cubic-bezier(0.23, 1, 0.32, 1);   /* 09.css:222 */

  /* ── LAYOUT CONSTANTS (§1.6) ────────────────────────────────────────── */
  --h-header: 50px;  --w-aside: 240px;  --w-aside-scroll: 257px;
  --h-footer: 60px;  --w-boxed: 1140px; --w-dock: 1100px;
}
@media (prefers-reduced-motion: reduce) { :root { --dur-fast:0s; --dur-base:0s; --dur-md:0s;
  --dur-slow:0s; --dur-slower:0s; --dur-route:0s; } }  /* the source has NO reduced-motion guard */
```

**Corrections to make deliberately, not silently:**
1. `.shadow-z2-hover` and `.shadow-z3` are identical (`09.css:1117` = `:1118`) — ship 4 elevations + 1 hover, not 5.
2. `.shadow-z1` paints the same layer twice (`09.css:1115`) — emit it once.
3. `.wd-80` is 90 % (`09.css:1078`) — rename or fix.
4. `.ch40/.ch50/.ch60` are missing from the height ladder (`09.css:1174–1181`).
5. `.ng-fadeInUpBig` ↔ `.ng-fadeInDownBig` are swapped (`09.css:214, 216`).
6. `.animated`'s 0.5 s (`09.css:224`) is dead — animate.css's 1 s (`12.css:2`) wins.
7. `06.css`'s 750 px breakpoint is off-scale — normalise to 768 or drop xeditable.
8. The source has **no `prefers-reduced-motion` guard anywhere** (`grep` across all 15 sheets = 0). Add one.
9. `.input-sm` is 31px in the app (`09.css:36`) vs 30px in Bootstrap (`02.css:719`) — a deliberate 1px app override; keep it if you want the pixel match.

---

## 8. Honest gaps

1. **Not one `.shadow-z1`–`z5` class has an element on this page.** The entire elevation system is read from declarations only. Re-verify against a route that uses it.
2. **The 410/310/210/110 layout-shell z-index stack never materialises** — no `<header>`, `<aside>` or `<footer>` inside `.app-container` on this route.
3. **Every `max-width` media block is untested.** The capture is a single 1842 px viewport, so none of these was evaluated: `≤479` (2 blocks), `≤767` (16), `≤991` (2), `768–991` (5), `992–1199` (5), `max-device-width:480 and landscape` (1), `screen and (max-width:750px)` (1) = **32 blocks**. Add the **40** `@media print` blocks and **72 of the 144 blocks (50 %) are unverified**.
4. **All 40 `@media print` blocks are unverified.** No print rendering exists in the dump.
5. **Every animation is declared-only.** `DEFAULTS.txt:92` shows `transform: none` on 2,141/2,156 and the 15 deviations are identity matrices — nothing was mid-animation at capture. Durations, easings and keyframes are read from CSS, never observed.
6. **Every `:hover`/`:focus`/`:active` elevation is declared-only** — including `09.css:325`, the rule that lifts every button to z2. A static capture cannot show it.
7. **`.thumb16` / `.thumb20` margin behaviour** rests on cascade analysis, not observation — neither class is in the DOM (P26 §2).
8. **Video.js and toaster geometry are unrecoverable** — sheets 03 and 07 are CORS-blocked (`03.css:2`, `07.css:2`, both `ruleCount=0`). Player-control spacing/radii/shadows and toast padding/radius/position are hard gaps. See P26 §4.
9. **The 27 copy-B-only room rules with no elements here** (`09.css:2543–2574`, incl. `gap: 10px`/`gap: 5px`, `padding: 25px`, `calc(-50px + 100vh)`) are declared-only on this route.
10. **`gap` is declared 3 times but computes `normal` on all 2,156 nodes** (`DEFAULTS.txt:31`, 1 distinct value) — the three `gap`-using rules (`09.css:2571, 2572`) have no elements here.
