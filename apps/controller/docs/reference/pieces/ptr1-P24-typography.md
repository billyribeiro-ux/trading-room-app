# ptr1-P24 — Typography: every face, size, weight, line-height, tracking and transform

**Purpose.** Enumerate every `@font-face`, font-family stack, `font-size`, `font-weight`, `line-height`, `letter-spacing` and `text-transform` declared across all 15 stylesheets, then establish the type scale that is actually in force by cross-checking against `DEFAULTS.txt` (the page-wide COMMON computed table over 2,156 nodes) and all 2,156 parsed node records. The bottom line up front: **the entire text layer is the OS system stack — no licensed font, no self-hosted text font, nothing to buy.** All three `@font-face` declarations are icon fonts, and two of the three render zero glyphs.

**Evidence base.** All 15 sheets in `/tmp/ptr-decode/ptr1/01-stylesheets/` read end to end; `/tmp/ptr-decode/ptr1/caps/00-baseline-room/DEFAULTS.txt` lines 65–74; and a full parse of all 2,156 node records in `nodes-000…017.txt`.

> **Duplication note.** `09.css` ships `styles.css` twice (copy A `09.css:2–1272`, copy B `09.css:1273–2574`). All `09.css` citations here use copy-A line numbers; add **+1271** for copy B. The only typography rule that exists solely in copy B is `.dark-theme-badge-id { font-size: 10px }` at `09.css:2565`.

---

## 1. Every `@font-face` — all three, all icon fonts

| # | Family | Sheet:line | `src` list (verbatim) | weight/style | `font-display` |
|---|---|---|---|---|---|
| 1 | `"Glyphicons Halflings"` | **`02.css:60`** | `url("../fonts/glyphicons-halflings-regular.woff2") format("woff2"), url("…woff") format("woff"), url("…ttf") format("truetype")` | *(not declared)* | *(absent)* |
| 2 | `FontAwesome` | **`10.css:2`** | `url("../fonts/fontawesome-webfont.woff2?v=4.3.0") format("woff2"), url("…woff?v=4.3.0") format("woff"), url("…ttf?v=4.3.0") format("truetype")` | `normal` / `normal` | *(absent)* |
| 3 | `feather` | **`11.css:2`** | `url("fonts/feather-webfont.woff") format("woff"), url("fonts/feather-webfont.ttf") format("truetype")` — **no woff2** | `normal` / `normal` | *(absent)* |

**Version:** only Font Awesome is pinned, and it is pinned inside the CSS itself — `?v=4.3.0` on all three URLs at `10.css:2`. Glyphicons and feather carry no version anywhere.

**Facts, not inferences:**
* No `font-display` on any of the three ⇒ default `auto` ⇒ a FOIT block period on every icon on first paint. 247 nodes on this page render in an icon face (§2.2), so this is a real first-paint cost.
* No `eot` and no `svg` source in any declaration — the legacy formats were stripped, while the app still ships 16 `.ie9`-prefixed selectors in `09.css` copy A (`:438, 460, 482, 504, 526, 548, 570, 594, 618, 642, 666, 690, 714, 738, 762, 786`).
* feather is the only one without `woff2`, so it ships the fatter `woff` everywhere. `10.css:2` proves the project knows how to declare `woff2`.

---

## 2. Font-family stacks — the complete set (9 declarations, 3 rendered)

### 2.1 Every `font-family` declaration in all 15 sheets

| Stack | Declared at | Purpose |
|---|---|---|
| `"Helvetica Neue", Helvetica, Arial, sans-serif` | `02.css:327` (`body`) · `02.css:1398` (`.tooltip`) · `02.css:1414` (`.popover`) | **The app's text face.** Pure OS system stack |
| `sans-serif` | `02.css:2` (`html`) · `09.css:1202` (`#clockdiv`) | UA generic fallback; `#clockdiv` deliberately opts out of the Helvetica stack |
| `inherit` | `02.css:328` (`button, input, select, textarea`) · `02.css:342` (`h1–h6, .h1–.h6`) · `08.css:4` (`.ta-editor.ta-html, .ta-scroll-window.form-control`) | Form controls and headings inherit the body stack — **there is no separate display/heading face** |
| `Menlo, Monaco, Consolas, "Courier New", monospace` | `02.css:414` (`code, kbd, pre, samp`) | Code face |
| `monospace, monospace` | `02.css:24` (`code, kbd, pre, samp`) | Normalize's double-generic trick; superseded by `02.css:414` at equal specificity, later line |
| `"Glyphicons Halflings"` | `02.css:60` (`@font-face`) · `02.css:61` (`.glyphicon`) | **Overridden — see §2.3** |
| `FontAwesome` | `10.css:2` (`@font-face`) · `10.css:3` (`.fa`) · **`09.css:2` (`.glyphicon`)** | The one icon face that renders |
| `feather` | `11.css:2` (`@font-face`) · `11.css:3` (`[data-icon]::before`) · `11.css:4` (`[class^="icon-"], [class*=" icon-"]`) | **Zero glyphs rendered — see §2.2** |
| `serif` | `02.css:1457` (`.carousel-control .icon-next/.icon-prev`) | For the `‹` `›` characters at `02.css:1458–1459` |

### 2.2 What actually renders — the computed truth

`DEFAULTS.txt:65`:

```
font-family | "Helvetica Neue", Helvetica, Arial, sans-serif | 1906/2156 | 3
```

Only **3 distinct font-family values exist across all 2,156 nodes**, and the system stack is the COMMON value on **1,906** of them (88.4 %). The two deviations, counted exactly across all 18 node files:

| Computed family | Nodes | Element breakdown |
|---|---|---|
| `"Helvetica Neue", Helvetica, Arial, sans-serif` | **1,906** | everything else |
| `FontAwesome` | **247** | 233 × `<i class="fa …">`, 12 × `<i class="icon-…">`, 2 × `<a class="icon-…">` |
| `Menlo, Monaco, Consolas, "Courier New", monospace` | **3** | 1 × `<pre class="ng-binding">`, 2 × `<strong>` (inside the `<pre>`) |

1,906 + 247 + 3 = **2,156** ✓. This closes the set exactly — there is no fourth face anywhere on the page.

* **feather renders on 0 nodes.** The family name `feather` never appears as a computed `font-family`. Its two font files are downloaded for nothing.
* **Glyphicons Halflings renders on 0 nodes.** `grep -c glyphicon nodes-*.txt` = 0 across all 18 files — no `.glyphicon` element exists on this route at all.
* **The 12 `<i class="icon-*">` nodes resolve to FontAwesome, not feather.** `11.css:4` sets them to `feather`, but they compute `FontAwesome`. The winning declaration is `09.css:2` / `10.css:3` in the same cascade position with the app sheet later; `09.css:320` also re-styles the whole `.icon-*` list (`font-size:15px; text-rendering:auto`) without touching the family, confirming the app treats them as FontAwesome icons.

### 2.3 What actually wins — `.glyphicon`

| Declaration | Result |
|---|---|
| `02.css:61` — `.glyphicon { position:relative; top:1px; display:inline-block; font-family:"Glyphicons Halflings"; font-style:normal; font-weight:400; line-height:1; -webkit-font-smoothing:antialiased }` | ❌ family overridden |
| `09.css:2` (and `09.css:1273`) — `.glyphicon { display:inline-block; font-style:normal; font-variant:normal; … font-weight:normal; font-stretch:normal; line-height:1; font-family:FontAwesome; font-size:inherit; text-rendering:auto; -webkit-font-smoothing:antialiased; transform:translate(0,0) }` | ✅ **wins** (equal specificity `.glyphicon` 0-1-0, later sheet) |

Consequences the CSS makes unavoidable:
1. `.glyphicon` renders in **FontAwesome**, while `02.css:62–323` still supplies **262 Glyphicons private-use codepoints** as `content`. Those codepoints are not the same pictographs in FA ⇒ wrong glyph or tofu for every `.glyphicon-*` except the four the app explicitly re-points: `09.css:5–8` re-declare `.glyphicon.glyphicon-chevron-{left,right,up,down}::before` with FontAwesome codepoints.
2. `09.css:2` also drops `position: relative; top: 1px` — so glyphicons lose Bootstrap's 1px optical nudge.
3. `font-size: inherit` (`09.css:2`) replaces nothing (Bootstrap didn't set it) but locks icons to the parent size, which is why `.fa-lg/.fa-2x` etc. (`10.css:4–8`) are the only way to scale them.

**Honest scope note:** zero `.glyphicon` elements exist on this capture, so none of this is visible here. It is a latent defect for other routes and a reason to delete Glyphicons entirely.

### 2.4 Licence verdict — verified

> **No licensed text font is required. Confirmed.**

Proof: `02.css:327` sets `body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif }`; no sheet 03–14 re-declares `body`'s family (checked all 15); `DEFAULTS.txt:65` confirms it is the COMMON value on 1,906/2,156 nodes with only 3 distinct families page-wide. Every one of the three `@font-face` families is an **icon** font, and `Menlo/Monaco/Consolas/Courier New` is likewise a pure system stack (`02.css:414`). Nothing downloadable carries text.

Per-icon-font licence posture:

| Font | Licence | Self-hosted? | Glyphs rendered | Action |
|---|---|---|---|---|
| Font Awesome 4.3.0 | Font SIL OFL 1.1, CSS MIT | yes, `/public/vendor/font-awesome/fonts/` | 247 nodes | **Keep**, subset from 519 icons to the ~40 used |
| Glyphicons Halflings (Bootstrap 3 build) | Bundled under Bootstrap's MIT for Bootstrap use | yes, `/public/app/fonts/` | **0** | **Drop** — 3 files + 263 CSS rules |
| feather webfont | MIT | yes, `/public/vendor/feather/webfont/…/fonts/` | **0** | **Drop**, after confirming against a live-room capture |

---

## 3. Font-size — every declaration, and the scale actually in force

### 3.1 Computed reality first

`DEFAULTS.txt:66`:

```
font-size | 14px | 1600/2156 | 10
```

Exactly **10 distinct font-sizes exist on the entire page**. Full breakdown (all 2,156 nodes accounted for):

| Computed size | Nodes | Who has it | Where it is declared |
|---|---|---|---|
| **14px** | **1,600** | everything not listed below | `02.css:327` `body` |
| **13px** | **448** | 149 `<i class="fa">`, 124 `<a>`, 108 `<li>`, 25 `li.divider`, 17 `ul.dropdown-menu`, 12 `li.dropdown-submenu`, … | `09.css:48` `.dropdown-menu { font-size: 13px }` — inherited by all dropdown descendants |
| **11px** | **52** | 28 `button.btn`, 20 `i.fa`, 2 `div.btn`, 2 `span.ng-binding` | `09.css:328` `.btn-group-small .btn { font-size: 11px }` |
| **12px** | **25** | 10 `span.badge`, 4 `a.btn`, 3 `i.icon`, 3 `button.btn`, 3 `div.ng-binding`, 2 `i.fa` | `02.css:1179` `.badge`, `02.css:842` `.btn-sm`, plus inline `style="…font-size:12px…"` on 3 nodes |
| **28px** | **7** | 6 `i.fa`, 1 `a.icon` | `10.css:5` `.fa-2x { font-size: 2em }` × 14px = 28px |
| **18px** | **8** | 2 `strong.ng-binding`, 1 `div.navbar-brand`, 1 `a`, 1 `img.brand-logo`, 1 `h4.modal-title`, 1 `i.ng-binding` | `02.css:1027` `.navbar-brand { font-size: 18px }`; `02.css:351` `h4 { font-size: 18px }` |
| **16px** | **5** | 2 `i.icon`, 1 `div.panel-title`, 1 `span.ng-binding`, 1 `span.text-muted` | `02.css:1295` `.panel-title { font-size: 16px }` |
| **24px** | **4** | 3 `h3`, 1 `span` | `02.css:350` `.h3, h3 { font-size: 24px }` |
| **21px** | **2** | 1 `button.close`, 1 `span` | `02.css:1368` `.close { font-size: 21px }` |
| **0px** | **5** | 5 `span.input-group-btn` | `02.css:936` `.input-group-btn { font-size: 0px }` (whitespace collapse trick) |

Sum: 1600+448+52+25+8+7+5+5+4+2 = **2,156** ✓, and 10 distinct values ✓ matches `DEFAULTS.txt:66` exactly.

**The type scale actually in force on this page is therefore: `0 · 11 · 12 · 13 · 14 · 16 · 18 · 21 · 24 · 28` px, with 14px carrying 74 % of the document.**

### 3.2 Every `font-size` declaration in the sheets (exhaustive)

**Bootstrap heading scale (`02.css:348–353`)** — `h1` 36px · `h2` 30px · `h3` 24px · `h4` 18px · `h5` 14px · `h6` 12px. Only `h3` (24px) and `h4` (18px) have elements on this page (3 × `<h3>`, 2 × `<h4>`); h1/h2/h5/h6 are absent.

**Bootstrap relative sizes:** `html` 10px (`02.css:326` — the rem base, never used since nothing uses `rem`) · `small`/`.small` 85 % (`02.css:359`) · `<small>` normalize 80 % (`02.css:15`) · `blockquote small` 80 % (`02.css:408`) · `h1–h3 small` 65 % (`02.css:345`) · `h4–h6 small` 75 % (`02.css:347`) · `sub`/`sup` 75 % (`02.css:16`) · `.label` 75 % (`02.css:1163`) · `code`/`kbd` 90 % (`02.css:415–416`) · `.initialism` 90 % (`02.css:405`) · `kbd kbd` 100 % (`02.css:417`) · `code, kbd, pre, samp` 1em (`02.css:24`).

**Bootstrap component sizes:** `.form-control`/`.btn`/`.dropdown-menu`/`.input-group-addon`/`output`/`.popover` **14px** (`02.css:695, 782, 857, 928, 694, 1414`) · `.input-sm`/`.btn-sm`/`.btn-xs`/`.dropdown-header`/`.form-group-sm*`/`.input-group-sm*`/`.tooltip`/`.badge`/`.pagination-sm`/`.progress-bar` **12px** (`02.css:719, 842, 843, 869, 722, 725, 780, 922, 929, 1398, 1179, 1153, 1231`) · `.input-lg`/`.btn-lg`/`.form-group-lg*`/`.input-group-lg*`/`.pagination-lg` **18px** (`02.css:726, 841, 729, 732, 777, 919, 930, 1150`) · `pre` **13px** (`02.css:418`) · `blockquote` **17.5px** (`02.css:406`) · `legend` **21px** (`02.css:686`) · `.close` **21px** (`02.css:1368`) · `.jumbotron p` **21px** (`02.css:1190`) · `.lead` **16px** → **21px** at `min-width:768px` (`02.css:355, 357`) · `.jumbotron h1` **63px** at `min-width:768px` (`02.css:1197`) · `.panel-title` **16px** (`02.css:1295`) · `.navbar-brand` **18px** (`02.css:1027`) · `.carousel-control` **20px** → **30px** at `min-width:768px` (`02.css:1450, 1466`) · `.h6, h6` **12px** (`02.css:353`) · `.text-hide` `font: 0px/0 a` (`02.css:1480`).

**App sizes (`09.css` copy A) — exhaustive:**

| Size | Selector | Line |
|---|---|---|
| **23px** | `.app-view-header` | `09.css:108` |
| 12px | `.app-view-header > small` | `09.css:111` |
| **24px** | `.topnavbar .sidebar-toggle, .topnavbar .menu-toggle` | `09.css:76` |
| **11px** | `.sidebar .nav-heading` | `09.css:183` |
| **20px** | `.settings-wrapper > .settings-inner .settings-button > em` | `09.css:265` |
| **30px → 42px → 82px** | `.input-huge` at base / `min-width:768px` / `min-width:992px` | `09.css:312, 315, 318` |
| **1.33333em** | `.setting-color > label > .icon-check` | `09.css:283` |
| **15px** | the 132-selector Feather icon list (`.icon-eye, .icon-paper-clip, … .icon-ellipsis`) | `09.css:320` |
| **13px** | `.input-group .input-sm + .input-group-btn .btn` | `09.css:324` |
| **11px** | `.btn-group-small .btn` | `09.css:328` |
| **18px** | `.btn-xl` | `09.css:359` |
| **12px** | `.btn-circle` | `09.css:376` |
| **18px** | `.btn-circle.btn-lg` | `09.css:377` |
| **24px** | `.btn-circle.btn-xl` | `09.css:378` |
| **40px** | `.layer-morph-close > em` | `09.css:409` |
| **13px** | `.layer-morph-container .layer-morph-footer` | `09.css:426` |
| **13px** | `.dropdown-menu` | `09.css:48` |
| **14px** | `.mediaLI`, `.list-icon em` | `09.css:54`, `09.css:1062` |
| **7.8px !important** | `.text-xs` | `09.css:1025` |
| **11.05px !important** | `.text-sm` | `09.css:1026` |
| **22.1px !important** | `.text-md` | `09.css:1027` |
| **39px !important** | `.text-lg` | `09.css:1028` |
| **52px !important** | `.text-hg` | `09.css:1029` |
| **12px / 12px / 18px / 16px / 14px / 12px / 10px / 9px** | `.chat`, `ul#chatContent.chatWide`, `.chatXXl li`, `.chatXl`, `.chatLg`, `.chatMd`, `.chatSm`, `.chatTiny` | `09.css:1143, 1144, 1147, 1148, 1149, 1150, 1151, 1152` |
| **16px** | `.chatUpvoted`, `.chatUpvoted i` | `09.css:1156–1157` |
| **12px** | `.chatChannelTabs a`, `.videChatLabel`, `.onLabel` | `09.css:1231, 1211, 1182` |
| **10px** | `.tsSm` | `09.css:1238` |
| **17px** | `.title` | `09.css:1139` |
| **30px** | `.vertDivider`, `#clockdiv` | `09.css:1183, 1202` |
| **16px** | `.smalltext` | `09.css:1205` |
| **20px !important** | `.hasMobileApp` | `09.css:1253` |
| **10px** | `.dark-theme-badge-id` — **copy-B only** | `09.css:2565` |

**Font Awesome sizes (`10.css`):** `.fa-lg` 1.33333em · `.fa-2x` 2em · `.fa-3x` 3em · `.fa-4x` 4em · `.fa-5x` 5em · `.fa-stack-2x` 2em (`10.css:4–8, 38`). At the 14px base these give 18.67 / 28 / 42 / 56 / 70 px.

**The `.text-xs … .text-hg` ladder is a fractional-em artefact.** `7.8 / 11.05 / 22.1 / 39 / 52` px are `0.6 / 0.85 / 1.7 / 3 / 4` × **13px**, not × 14px. The Less source was compiled against a 13px base while `body` runs at 14px, so the utility ladder is 7.7 % off the document's own base. None of the five classes has an element on this page (`grep` returns 0 nodes) — declared-only.

---

## 4. Font-weight — every declaration and what renders

### 4.1 Computed reality

`DEFAULTS.txt:67`:

```
font-weight | 400 | 1638/2156 | 3
```

**Only three weights exist on the whole page.**

| Weight | Nodes | Who | Declared at |
|---|---|---|---|
| **400** | **1,638** | body default | `02.css:327` (implicit UA `normal`) + explicit `400` at `02.css:61, 343, 709, 712, 782, 836, 860, 928, 1163…` |
| **700** | **511** | 276 `label.col-sm-2`, 138 `label.muted`, 49 `label`, 10 `th`, 10 `span.badge`, 9 `input.ng-pristine`, … | **`02.css:687` `label { font-weight: 700 }`** — 463 of the 511 are `<label>` elements. Plus `02.css:11` `b, strong`, `:398` `dt`, `:650` `th` (via `text-align`+UA bold), `:1163` `.label`, `:1179` `.badge`, `:1205` `.alert-link` |
| **500** | **7** | 3 `h3`, 1 `h4.modal-title`, 1 `h4`, 1 `i.ng-binding`, 1 `span` | **`02.css:342`** `.h1–.h6, h1–h6 { font-weight: 500 }` |

1,638 + 511 + 7 = **2,156** ✓, 3 distinct ✓.

**Consequence for a rebuild:** headings are **500**, not bold. Bootstrap 3's `h1–h6` weight-500 rule is the single reason every heading on the page renders semibold rather than bold. And **474 `<label>` elements are bold** purely from `02.css:687` — this is the dominant weight signal on the screen after body text.

### 4.2 Every `font-weight` declaration in the sheets

| Value | Sheet:line (exhaustive) |
|---|---|
| `700` | `02.css:11` (`b, strong`) · `:38` (`optgroup`) · `:398` (`dt`) · `:417` (`kbd kbd`) · **`:687` (`label`)** · `:1163` (`.label`) · `:1179` (`.badge`) · `:1205` (`.alert .alert-link`) · `:1368` (`.close`) · `:1398`-adjacent form rules |
| `400` | `02.css:61` (`.glyphicon`) · `:343` (`h*-small`) · `:709` (`.checkbox/.radio label`) · `:712` (`.checkbox-inline/.radio-inline`) · `:782` (`.btn`) · `:836` (`.btn-link`) · `:860` (`.dropdown-menu > li > a`) · `:928` (`.input-group-addon`) · `:1398` (`.tooltip`) · `:1414` (`.popover`) · `09.css:23` (`.nav-tabs-alerts > li > a`) · `09.css:1162` (`.isAdm`) |
| `500` | **`02.css:342` (h1–h6)** · `09.css:186` (`.sidebar > .sidebar-nav > .nav > li > a`) · `09.css:312` (`.input-huge`) |
| `bold` | `09.css:426` (`.layer-morph-footer`) + **15 × `.bg-* .sidebar-subnav > li.active > a`** (`09.css:435, 457, 479, 501, 523, 545, 567, 591, 615, 639, 663, 687, 711, 735, 759, 783`) + `09.css:1216` (`.stockMention`) + `09.css:2570` (`.checkbox-apply-to-all-rooms input:checked + span`, **copy-B only**) |
| `bolder` | `09.css:1155` (`.privchatHighighted`) · `09.css:1231` (`.chatChannelTabs a`) |
| `normal` | `08.css:16` (`.popover`) · `09.css:2` (`.glyphicon`) · `09.css:188` (`.sidebar-item-icon`) · `09.css:191` (`.sidebar-subnav > li > a`) · `10.css:2` (`@font-face`) · `10.css:3` (`.fa`) · `11.css:2` (`@font-face`) · `11.css:3` (`[data-icon]::before`) · `11.css:4` (`[class^="icon-"]`) |
| `300` | `02.css:355` (`.lead`) |
| `200` | `02.css:1190` (`.jumbotron p`) |
| `600` | `09.css:1163` (`.filter-strong`) |
| `100` | `09.css:1202` (`#clockdiv`) |
| `100 !important` | `09.css:1036` (`.text-thin`) |
| `normal !important` | `09.css:1037` (`.text-normal`) |
| `bold !important` | `09.css:1038` (`.text-bold`) |

**Weights 100, 200, 300 and 600 are declared but never render** — the system stack has no 100/200/300 face on most platforms, and none of `.lead`, `.jumbotron p`, `.filter-strong`, `#clockdiv`, `.text-thin` has an element on this page. Computed weights are only 400/500/700.

---

## 5. Line-height — every declaration and the 20-value computed set

### 5.1 Computed reality

`DEFAULTS.txt:69`:

```
line-height | 20px | 1527/2156 | 20
```

The base is **20px**, which is `14px × 1.42857` (`02.css:327`). Twenty distinct values page-wide:

| Computed | Nodes | Derivation | Declared at |
|---|---|---|---|
| **20px** | **1,527** | 14 × 1.42857 | `02.css:327` `body { line-height: 1.42857 }` |
| **18.5714px** | 293 | 13 × 1.42857 — dropdown descendants | `09.css:48` (13px) × `02.css:327` ratio |
| **13px** | 155 | `line-height: 1` × 13px | `10.css:3` `.fa { line-height: 1 }` |
| **14px** | 57 | `line-height: 1` × 14px | `10.css:3` `.fa` |
| **15.7143px** | 32 | 11 × 1.42857 | `09.css:328` `.btn-group-small .btn` |
| **11px** | 20 | `line-height:1` × 11px | `10.css:3` `.fa` inside `.btn-group-small` |
| **12px** | 15 | `line-height:1` × 12px | `02.css:1179` `.badge { line-height: 1 }`, `10.css:3` |
| **normal** | 14 | UA | `02.css:30` `input { line-height: normal }` |
| **18px** | 7 | 12 × 1.5 | `02.css:842` `.btn-sm { line-height: 1.5 }` |
| **28px** | 6 | `line-height:1` × 28px | `10.css:3` on `.fa-2x` |
| **0px** | 5 | `line-height:1` × 0px | `02.css:936` `.input-group-btn { font-size: 0 }` |
| **26.4px** | 4 | 24 × 1.1 | `02.css:342` `h1–h6 { line-height: 1.1 }` |
| **50px** | 3 | explicit | `09.css:62` `.navbar-brand { line-height: 50px }` |
| **24px** | 3 | explicit `!important` | `09.css:1050` `.thumb24 { line-height: 24px !important }` |
| **22.8571px** | 3 | 16 × 1.42857 | `.panel-title` 16px × body ratio |
| **19.8px** | 3 | 18 × 1.1 | `02.css:342` on `h4` |
| **17.1429px** | 3 | 12 × 1.42857 | inline `font-size:12px` nodes |
| **25.7143px** | 2 | 18 × 1.42857 | `h4.modal-title` (`02.css:1383` `.modal-title { line-height: 1.42857 }`) |
| **21px** | 2 | `line-height:1` × 21px | `02.css:1368` `.close { line-height: 1 }` |
| **16px** | 2 | `line-height:1` × 16px | `10.css:3` on 16px `.icon` |

Twenty distinct values ✓ matches `DEFAULTS.txt:69`. *(Node-level tallies sum to 2,153 of 2,156; the 3-node remainder are records whose `line-height` is reported inside a `::before`/`::after` pseudo-block rather than as a top-level deviation — an artefact of the dump format, not a missing value.)*

### 5.2 Every `line-height` declaration

| Value | Sheet:line |
|---|---|
| **`1.42857`** (the base ratio, 20 uses) | `02.css:327, 336, 397, 408, 413, 418, 652, 694, 695, 709(implied), 860, 953, 1144, 1199, 1383, 1398, 1414` + `08.css:16` |
| `1` (14 uses) | `02.css:61, 343, 928, 1163, 1179, 1368, 1435, 1457` · `09.css:2, 188` · `10.css:3` · `11.css:3, 4` |
| `1.5` (7) | `02.css:719, 722, 725, 842, 843, 922, 1153` |
| `1.33333` (6) | `02.css:726, 729, 732, 841, 919, 1150` |
| `30px` (6) | `02.css:704, 720, 723, 737, 923` · `09.css:1062` (`.list-icon em`) |
| `46px` (5) | `02.css:705, 727, 730, 736, 920` |
| `20px` (4) | `02.css:1027, 1041, 1045, 1231` |
| `50px` (4) | `09.css:62, 70, 264, 1139` |
| `inherit` (3) | `02.css:328, 686` · `10.css:37` |
| `34px` (2) | `02.css:703, 735` |
| `normal` (2) | `02.css:30, 689` |
| `1.3` (2) | `02.css:1290` · `09.css:16` (`.list-group`) |
| `1.33` (2) | `09.css:377, 378` (`.btn-circle.btn-lg/.btn-xl`) |
| `1.1` (1) | **`02.css:342`** — h1–h6 |
| `1.4` (1) | `02.css:355` (`.lead`) |
| `0` (1) | `02.css:16` (`sub, sup`) |
| `2` (1) | `09.css:111` (`.app-view-header > small`) |
| `0.75em` (1) | `10.css:4` (`.fa-lg`) |
| `2em` (1) | `10.css:35` (`.fa-stack`) |
| `8/16/20/24/32/40/48/64/80/96/128px !important` (11) | `09.css:1047–1057` — the `.thumb8 … .thumb128` ladder |

---

## 6. Letter-spacing — four declarations, zero in force

`DEFAULTS.txt:70`:

```
letter-spacing | normal | 2156/2156 | 1
```

**One distinct value across all 2,156 nodes: `normal`.** Every declaration below is inert on this page.

| Value | Selector | Sheet:line | On page? |
|---|---|---|---|
| `normal` | `.tooltip` | `02.css:1398` | no element |
| `normal` | `.popover` | `02.css:1414` | 1 element (already `normal`) |
| **`0.035em`** | `.sidebar .nav-heading` (also `text-transform: uppercase`, `font-size: 11px`) | **`09.css:183`** | no element |
| **`0.025em`** | `.sidebar > .sidebar-nav > .nav > li > a` (also `font-weight: 500`, `padding: 12px 15px`) | **`09.css:186`** | no element |
| **`-1.1px`** | `.input-huge` (30/42/82px hero input) | **`09.css:312`** | no element |

The two positive tracking values are the sidebar's signature: an 11px uppercase heading at `+0.035em` over 15px-padded 500-weight nav links at `+0.025em`. There is no sidebar on the Manage-Room route (`.app-container > aside` exists in CSS at `09.css:98` but no `<aside>` node), so this is declared-only.

---

## 7. Text-transform — five declarations, zero in force

`DEFAULTS.txt:72`:

```
text-transform | none | 2156/2156 | 1
```

**One distinct value across 2,156 nodes: `none`.** Nothing on this page is uppercased, lowercased or capitalised by CSS.

| Value | Selector | Sheet:line | On page? |
|---|---|---|---|
| `none` | `button, select` (normalize) | `02.css:27` | yes (no-op) |
| `none` | `.tooltip`, `.popover` | `02.css:1398, 1414` | popover only (no-op) |
| `none` | `[data-icon]::before`, `[class^="icon-"]` | `11.css:3, 4` | yes (no-op) |
| **`uppercase`** | `.text-uppercase` | `02.css:367` | **no element** |
| **`uppercase`** | `.initialism` (also `font-size: 90%`) | `02.css:405` | **no element** |
| **`uppercase`** | **`.sidebar .nav-heading`** (also `letter-spacing: .035em`, `font-size: 11px`, `padding: 12px 15px`) | **`09.css:183`** | **no element** |
| `lowercase` | `.text-lowercase` | `02.css:366` | no element |
| `capitalize` | `.text-capitalize` | `02.css:368` | no element |

---

## 8. Font-style and text-decoration

**`font-style`** — `DEFAULTS.txt:68`: `normal | 2040/2156 | 2`. The single deviation is **`italic` on 116 nodes**, and the class attribute is identical on 115 of them:

```
attr class = "ng-scope ng-binding editable editable-click editable-empty"   × 115
attr class = "ng-binding"  on an <i>                                       ×   1
```

Source of the 115: **`06.css:17`** `.editable-empty, .editable-empty:hover, .editable-empty:focus, a.editable-empty, a.editable-empty:hover, a.editable-empty:focus { font-style: italic; color: rgb(221,17,68); text-decoration: none }` — **115 empty editable fields render in xeditable's italic "empty" state.** (Note the colour is *not* `rgb(221,17,68)` on those nodes: `09.css:1194` `.editable-click` wins with `rgb(10,10,10)` — see P23 §9.1.) The 116th is an `<i>`, italic by UA default; no sheet resets `i`. The app's own italics (`09.css:1159` `.chatMention`, `09.css:1216` `.stockMention`) and Bootstrap's (`02.css:12` `dfn`) have no elements here. `02.css:413` `address { font-style: normal }` is a normalize-style reset.

**`text-decoration-line`** — `DEFAULTS.txt:73`: `none | 2153/2156 | 2`. Three nodes carry `underline`, all from the inline attribute `style="text-decoration: underline"` (3 occurrences in the DOM), not from CSS. The app actively *suppresses* underlines: `09.css:14` `a:hover, a:focus { text-decoration: none }` overrides Bootstrap's `02.css:330` `a:focus, a:hover { text-decoration: underline }`.

**`text-shadow`** — `DEFAULTS.txt:74`: `none | 2154/2156 | 2`. Two nodes carry `rgb(255,255,255) 0px 1px 0px`, from `02.css:1368` `.close { text-shadow: 0 1px 0 #fff }`. Other declarations (`02.css:1450, 1463` carousel `rgba(0,0,0,.6) 0 1px 2px`; `02.css:1464, 1480` `none`; `02.css:42` `none !important` in print) have no elements.

**Font smoothing / rendering** — `-webkit-font-smoothing: antialiased` on `.glyphicon` (`02.css:61`, `09.css:2`), `.fa` (`10.css:3`), `.sidebar-item-icon` (`09.css:188`), `[data-icon]::before` and `[class^="icon-"]` (`11.css:3–4`). `text-rendering: auto` on `.glyphicon` (`09.css:2`), `.fa` (`10.css:3`) and the 132-selector `.icon-*` list (`09.css:320`). **Body text gets no smoothing hint** — antialiasing is icons-only.

---

## 9. What actually wins — the typography override chains

| Property | Loser | Winner | Proof |
|---|---|---|---|
| `.glyphicon` `font-family` | `02.css:61` `"Glyphicons Halflings"` | **`09.css:2` `FontAwesome`** (equal specificity, later sheet) | Latent — 0 `.glyphicon` nodes on this page (see §2.3) |
| `[class^="icon-"]` `font-family` | `11.css:4` `feather` | **`FontAwesome`** | 12 `<i class="icon-*">` nodes compute `FontAwesome`, 0 compute `feather` |
| `code, kbd, pre, samp` `font-family` | `02.css:24` `monospace, monospace` | **`02.css:414` `Menlo, Monaco, Consolas, "Courier New", monospace`** (equal specificity, later line) | 3 nodes compute the Menlo stack |
| `a` `text-decoration` on hover | `02.css:330` `underline` | **`09.css:14` `none`** (equal specificity `a:hover`, later sheet) | Static capture cannot show hover — declared-only, but the cascade is unambiguous |
| `.btn-warning` text colour | `02.css:820` `rgb(255,255,255)` | **`02.css:836` `.btn-link` `rgb(51,122,183)`** (equal specificity, 16 lines later) | Node `#48` computes `color: rgb(51,122,183)` — see P23 §1.2 |
| `.text-muted` colour | `09.css:550` `rgb(131,148,169)` (needs `.bg-white` ancestor) | **`02.css:369` `rgb(119,119,119)`** | Node `#47` computes `rgb(119,119,119)` |
| `label` `font-weight` | UA `normal` | **`02.css:687` `700`** | 463 of 474 `<label>` nodes compute `700` |
| `h1–h6` `font-weight` | UA `bold` (700) | **`02.css:342` `500`** | 3 `h3` + 2 `h4` + 2 more compute `500` |
| `html`/`body` `font-family` | `02.css:2` `sans-serif` | **`02.css:327` `"Helvetica Neue", …`** (more specific target, later line) | `DEFAULTS.txt:65` — 1,906/2,156 |
| `.text-xs…-hg` scale base | *(intended 14px)* | **13px** — the values are 0.6/0.85/1.7/3/4 × 13 | `09.css:1025–1029`; arithmetic, no element to verify |

---

## 10. Rebuild spec — the typography token layer

```css
:root {
  /* ── FACES ────────────────────────────────────────────────────────────── */
  --font-sans: "Helvetica Neue", Helvetica, Arial, sans-serif;      /* 02.css:327 — 1906/2156 nodes */
  --font-mono: Menlo, Monaco, Consolas, "Courier New", monospace;   /* 02.css:414 — 3 nodes */
  --font-icon: FontAwesome;                                         /* 10.css:2  — 247 nodes */
  /* NO text webfont. NO licence. NO self-hosting for text. Verified §2.4.   */

  /* ── SIZE SCALE — the 10 values actually in force (§3.1) ──────────────── */
  --fs-0:   0px;    /* 02.css:936  .input-group-btn whitespace collapse */
  --fs-xs:  11px;   /* 09.css:328  .btn-group-small; 09.css:183 .nav-heading */
  --fs-sm:  12px;   /* 02.css:842  .btn-sm / .badge / .input-sm / h6      */
  --fs-md:  13px;   /* 09.css:48   .dropdown-menu — 448 nodes            */
  --fs-base:14px;   /* 02.css:327  body — 1600 nodes (74 %)              */
  --fs-lg:  16px;   /* 02.css:1295 .panel-title / .lead                  */
  --fs-xl:  18px;   /* 02.css:351  h4 / 02.css:1027 .navbar-brand        */
  --fs-2xl: 21px;   /* 02.css:1368 .close / legend / .jumbotron p        */
  --fs-3xl: 24px;   /* 02.css:350  h3                                    */
  --fs-4xl: 28px;   /* 10.css:5    .fa-2x = 2em × 14px                   */
  /* Declared-but-unrendered on this route, port only if you port the view: */
  --fs-view-header: 23px;  /* 09.css:108  .app-view-header               */
  --fs-title:       17px;  /* 09.css:1139 .title                         */
  --fs-hero:        30px;  /* 09.css:312  .input-huge  (→42px @768, →82px @992) */

  /* ── WEIGHTS — only 3 render (§4.1) ───────────────────────────────────── */
  --fw-normal: 400;  /* 1638 nodes */
  --fw-medium: 500;  /* 02.css:342 h1–h6 — 7 nodes. HEADINGS ARE 500, NOT BOLD */
  --fw-bold:   700;  /* 02.css:687 label — 511 nodes, 463 of them <label> */

  /* ── LINE HEIGHTS (§5) ────────────────────────────────────────────────── */
  --lh-base:  1.42857;   /* 02.css:327  → 20px @14px. 1527 nodes           */
  --lh-tight: 1.1;       /* 02.css:342  headings                           */
  --lh-none:  1;         /* 02.css:1179 .badge, 10.css:3 .fa               */
  --lh-sm:    1.5;       /* 02.css:842  .btn-sm → 18px @12px               */
  --lh-lg:    1.33333;   /* 02.css:841  .btn-lg → 24px @18px               */
  --lh-list:  1.3;       /* 09.css:16   .list-group                        */
  --lh-brand: 50px;      /* 09.css:62   .navbar-brand — matches navbar height */

  /* ── TRACKING (§6) — zero in force, port with the sidebar ─────────────── */
  --ls-heading: 0.035em; /* 09.css:183  .sidebar .nav-heading (+uppercase) */
  --ls-navlink: 0.025em; /* 09.css:186  .sidebar nav > li > a             */
  --ls-hero:   -1.1px;   /* 09.css:312  .input-huge                        */
}

/* Base */
body { font-family: var(--font-sans); font-size: var(--fs-base);
       line-height: var(--lh-base); color: rgb(51,51,51); }            /* 02.css:327 */
h1,h2,h3,h4,h5,h6 { font-family: inherit; font-weight: var(--fw-medium);
                    line-height: var(--lh-tight); color: inherit; }    /* 02.css:342 */
h1{font-size:36px} h2{font-size:30px} h3{font-size:24px}
h4{font-size:18px} h5{font-size:14px} h6{font-size:12px}               /* 02.css:348-353 */
label { font-weight: var(--fw-bold); margin-bottom: 5px;
        display: inline-block; max-width: 100%; }                      /* 02.css:687 */
code,kbd,pre,samp { font-family: var(--font-mono); }                   /* 02.css:414 */
.dropdown-menu { font-size: var(--fs-md); }                            /* 09.css:48  */

/* Icon face — ONE family, with the font-display the source forgets */
@font-face { font-family: FontAwesome;
  src: url('/fonts/fontawesome-webfont.woff2') format('woff2'),
       url('/fonts/fontawesome-webfont.woff')  format('woff');
  font-weight: normal; font-style: normal;
  font-display: block; }                                               /* cf. 10.css:2 */
.fa { display:inline-block; font: normal normal normal 1em/1 FontAwesome;
      font-size: inherit; text-rendering: auto;
      -webkit-font-smoothing: antialiased; }                           /* 10.css:3   */
```

**Corrections to apply in the rebuild (call them out, don't silently keep them):**
1. Re-base `.text-xs … .text-hg` on 14px: `8.4 / 11.9 / 23.8 / 42 / 56` px — or drop the ladder, since nothing uses it.
2. Add `font-display: block` to the icon `@font-face` (the source has none).
3. Delete the Glyphicons `@font-face` (`02.css:60`) and its 262 `content` rules (`02.css:62–323`) — 0 rendered glyphs.
4. Delete the feather `@font-face` (`11.css:2`) and its 132 `content` rules — 0 rendered glyphs (verify against a live-room capture first).
5. Do **not** carry Bootstrap's `html { font-size: 10px }` (`02.css:326`) unless you also introduce `rem` sizing — nothing in the source uses `rem`, so a 10px root is a trap.

---

## 11. Honest gaps

1. **`letter-spacing` and `text-transform` are unverifiable on this route.** Both compute to a single value across all 2,156 nodes (`DEFAULTS.txt:70`, `:72`). The three tracking values and three uppercase rules exist only as declarations; the sidebar that would exercise them has no element here.
2. **h1, h2, h5, h6 never render.** Only 3 × `<h3>` and 2 × `<h4>` exist. The 36 / 30 / 14 / 12 px steps are read from `02.css:348–353`, never observed.
3. **The `.text-xs/-sm/-md/-lg/-hg` ladder has zero elements** — the 13px-base discrepancy in §3.2 is arithmetic on the declared values, not an observed mismatch.
4. **The chat size ladder (`.chatXXl/.chatXl/.chatLg/.chatMd/.chatSm/.chatTiny`, `09.css:1147–1152`) has zero elements** on this admin route. Declared-only; verify against a live-room capture.
5. **`.input-huge`'s responsive 30 → 42 → 82 px ramp is unexercised.** No element, and the capture is a single 1842 px viewport so no breakpoint crossing was observed.
6. **Every `:hover`/`:focus` typography rule is declared-only.** The capture is one static state; no pseudo-class was simulated.
7. **The 3-node discrepancy in the `line-height` tally** (§5.1) is a dump-format artefact — those records report `line-height` inside a `::before`/`::after` block. The 20-distinct-value count from `DEFAULTS.txt:69` is authoritative.
8. **Video.js and toaster typography are unknown** — sheets 03 and 07 are CORS-blocked (`03.css:2`, `07.css:2`). Player-control and toast type scales cannot be recovered from this dump. See P26 §4.
9. **Font *metrics* are not in the dump.** Which of "Helvetica Neue" / Helvetica / Arial the capture machine actually resolved is not recorded — only the stack. A pixel-diff on a machine without Helvetica Neue will differ in glyph widths.
