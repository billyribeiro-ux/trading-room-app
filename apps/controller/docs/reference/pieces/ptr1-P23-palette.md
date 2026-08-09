# ptr1-P23 — The complete colour palette, declared vs. computed

**Purpose.** Enumerate every colour literal the application's own CSS defines (`09.css`, 240 distinct values in the primary copy), separate them from the vendor defaults that ship alongside (`02.css` Bootstrap, 111 distinct values; plus sheets 04/06/08), and reconcile the two against what actually renders on the 2,156-node capture. The headline result is §1: **the app declares a full Material-ish palette and then never uses it for buttons — every button on the page renders in Bootstrap's stock colours.** A rebuild that ports the declared palette to its buttons will not match the reference.

**Evidence base.** All 15 sheets in `/tmp/ptr-decode/ptr1/01-stylesheets/` read end to end; `/tmp/ptr-decode/ptr1/caps/00-baseline-room/DEFAULTS.txt` (page-wide COMMON computed table) and `nodes-000…017.txt` (all 2,156 node records parsed). Every value below carries a `file:line` citation; every "wins/loses" claim carries a computed-style citation.

> **Duplication note.** `09.css` ships `styles.css` twice (copy A = `09.css:2–1272`, copy B = `09.css:1273–2574`; see P26 §2). Copies are byte-identical for every colour rule. **All `09.css` citations in this file use copy-A line numbers**; add **+1271** for the copy-B line. The 32 room rules that exist only in copy B are cited at their real lines `09.css:2543–2574`.

---

## 1. THE RECONCILIATION — declared palette vs. computed reality

This is the most important table in this piece. Left column = what the app's own `styles.css` declares. Right column = what the browser actually painted on this capture. **They disagree for every single semantic button.**

| Component | App declares (`09.css`) | Renders as (computed) | Source that wins | Nodes |
|---|---|---|---|---|
| `.btn-primary` | *nothing* — `09.css` never declares `.btn-primary` | bg `rgb(51,122,183)` · border `rgb(46,109,164)` · color `rgb(255,255,255)` | **Bootstrap** `02.css:796` | 10 (9 painted, 1 neutralised — see §1.2) |
| `.btn-success` | *nothing* | bg `rgb(92,184,92)` · border `rgb(76,174,76)` · color `rgb(255,255,255)` | **Bootstrap** `02.css:804` | 1 |
| `.btn-info` | *nothing* | bg `rgb(91,192,222)` · border `rgb(70,184,218)` | **Bootstrap** `02.css:812` | 17 |
| `.btn-warning` | *nothing* | bg `rgb(240,173,78)` · border `rgb(238,162,54)` | **Bootstrap** `02.css:820` | 8 (7 painted, 1 neutralised — see §1.2) |
| `.btn-danger` | *nothing* | bg `rgb(217,83,79)` · border `rgb(212,63,58)` | **Bootstrap** `02.css:828` | 2 |
| `.btn-default` | border only: `rgb(230,233,238)` `09.css:323` | bg `rgb(255,255,255)` · border **`rgb(230,233,238)`** | **split**: Bootstrap fill `02.css:788` + **app border** `09.css:323` | 34 |
| `.btn-inverse` | bg + border `rgb(54,63,69)`, color `#fff` `09.css:331` | bg `rgb(54,63,69)` · border `rgb(54,63,69)` · color `rgb(255,255,255)` | **App** `09.css:331` — Bootstrap has no `.btn-inverse` | 2 |
| `.btn-amber / -purple / -pink / -orange` | `09.css:336/341/346/351` | *(no element on this page)* | App-only classes | 0 |
| `.badge` (default) | *nothing* | bg `rgb(119,119,119)` · color `#fff` · radius 10px | **Bootstrap** `02.css:1179` | 7 |
| `.badge-danger-chat` | bg `rgb(255,0,0)` `09.css:1234` | bg `rgb(255,0,0)` on 3 nodes, `color rgb(255,0,0)` on 27 | **App** `09.css:1234` | 3 |
| `.text-muted` | `rgb(131,148,169)` — but only under `.bg-white`/`#bg-white` (`09.css:550`) | `rgb(119,119,119)` | **Bootstrap** `02.css:369` — the app rule needs a `.bg-white` ancestor that does not exist here | 1 |
| `.editable-click` | color `rgb(10,10,10)` `09.css:1194` | color **`rgb(10,10,10)`** · border-bottom **`1px dashed rgb(66,139,202)`** | **split**: app colour + **xeditable** border `06.css:15` | **269** |
| Top navbar | `.topnavbar` has no background rule in `09.css` | `rgb(0,0,0)` | **inline attribute** `style="background-color: black;"` on `<nav class="navbar topnavbar">` (`nodes-000.txt:241`) | 1 |
| Page background | `body` background not set in `09.css` | `rgb(255,255,255)` | **Bootstrap** `02.css:327` | 1 (`nodes-000.txt:11`) |
| Body text | not set in `09.css` | `rgb(51,51,51)` on **1,732/2,156** nodes | **Bootstrap** `02.css:327` | 1,732 (`DEFAULTS.txt:64`) |

### 1.1 The one-line summary a rebuild needs

> **The `09.css` semantic palette — primary `rgb(29,31,33)`, success `rgb(76,175,80)`, info `rgb(32,149,242)`, warning `rgb(254,151,0)`, danger `rgb(243,66,53)` — is used for `.switch-*` toggles, `.text-*` helpers, `.b*-*` hairlines, `.bg-*` context blocks, `.label-*`, `.alert-*` and toasts. It is *never* used for buttons. Buttons are stock Bootstrap 3. Both palettes are live on the same screen at the same time.**

Which set to use, per component:

| Use the APP palette (`09.css`) for | Use the BOOTSTRAP palette (`02.css`) for |
|---|---|
| `.switch-*` toggle fills (`09.css:295–307`) | `.btn-primary/-success/-info/-warning/-danger/-default` fill + border |
| `.text-primary/-success/-warning/-danger/-info/-inverse/-amber/-pink/-purple/-orange/-gray*` (`09.css:971–1024`) | `.badge` default `rgb(119,119,119)` |
| `.br-*/.bl-*/.bt-*/.bb-*` hairlines (`09.css:866–933`) | `.label-default/-primary/-success/-info/-warning/-danger` |
| `.bg-*` context blocks and their 22-rule cascades (`09.css:427–799`) | `.alert-success/-info/-warning/-danger` |
| `.label-inverse/-amber/-pink/-purple/-orange` (`09.css:1081–1090`) | `.panel-*`, `.list-group-item-*`, `.progress-bar-*`, table row states |
| `.alert-purple/-amber/-pink/-inverse/-orange` (`09.css:1091–1105`) | `a` link colour `rgb(51,122,183)` / hover `rgb(35,82,124)` (`02.css:329–330`) |
| `body .toast*` (`09.css:399–405`) | `body` text `rgb(51,51,51)` and background `rgb(255,255,255)` (`02.css:327`) |
| `.btn-inverse` and the 4 app-only button variants | `.form-control` focus ring `rgb(102,175,233)` / `rgba(102,175,233,.6)` (`02.css:696`) |
| All chat colours (§6) | `.dropdown-menu` shadow `rgba(0,0,0,.176)` (`02.css:857`) |

### 1.2 A real defect in the reference, recorded honestly — `.btn-link` silently kills the variant colour, twice

**Case 1.** `nodes-000.txt` node `#48` is `<button class="btn btn-link btn-warning" ng-click="resetMaxCount()">Reset Counts</button>`. It computes:

```
color: rgb(51, 122, 183)          ← .btn-link, 02.css:836
border-*-color: rgb(51, 122, 183) ← currentColor via .btn-link border-color:transparent, 02.css:838
box-shadow: rgb(0,0,0) 0 0 0 0    ← .btn.btn-link, 09.css:322
(no background-color deviation ⇒ transparent, COMMON rgba(0,0,0,0))
```

**Case 2.** A second element carries `class="btn btn-primary btn-link"` and computes the same way — `background-color` stays at the COMMON `rgba(0,0,0,0)` and `border-top-color` is `rgb(51,122,183)`, not `rgb(46,109,164)`.

`.btn-warning` (`02.css:820`) and `.btn-primary` (`02.css:796`) set their fills and `color: rgb(255,255,255)`, but `.btn-link` (`02.css:836–838`) comes **later in the same sheet at equal specificity** and re-sets `color` to `rgb(51,122,183)` and `background-color` to `transparent`. **On both buttons the variant class does nothing** — they render as plain blue text links.

That is exactly why the computed counts fall one short of the class counts:

| Class | Elements with the class | Elements actually painted | Missing one is |
|---|---|---|---|
| `.btn-warning` | 8 | **7** with `background-color: rgb(240,173,78)` | `btn btn-link btn-warning` |
| `.btn-primary` | 10 | **9** with `background-color: rgb(51,122,183)` | `btn btn-primary btn-link` |

Do not "fix" this in a pixel-match rebuild — reproduce it, and flag it separately.

### 1.3 Two more colour facts the CSS alone would hide

* **`.bg-primary` is black, not `rgb(29,31,33)`.** `09.css:583` declares `.bg-primary { background-color: rgb(0, 0, 0); color: rgb(133, 141, 148); }` — literally `rgb(0,0,0)`. Every *other* member of the `.bg-primary` family is derived from `rgb(29,31,33)`: `.bg-primary .sidebar-subnav` `rgb(29,31,33)` (`09.css:590`), `.bg-primary.bg-light` `rgb(43,46,49)` (`09.css:605`), `.bg-primary.bg-dark` `rgb(15,16,17)` (`09.css:606`), `.bg-primary .nav > li.active` `rgb(19,21,22)` (`09.css:587`). The theme mixin was fed `rgb(29,31,33)` and then `.bg-primary`'s own background was hand-edited to pure black.
* **`.bg-primary` is the only `.bg-*` without `!important`.** All thirteen siblings use `background-color: … !important` (`09.css:427, 449, 471, 493, 515, 537, 559, 607, 631, 655, 679, 703, 727, 751, 775, 799`); `09.css:583` does not. So `.bg-primary` loses to Bootstrap's `.bg-primary` (`02.css:380`, `rgb(51,122,183)`) only on specificity ties broken by order — and since `09.css` is the later sheet, the app still wins here. But any future sheet, or a `.bg-*` combination, breaks `.bg-primary` alone.

---

## 2. The app base palette — 24 semantic tokens

Each row is the *seed* colour: the value the theme mixin was fed and from which the whole `bg-*` family in §4 is derived.

| Token | Value | Hex | Declared at (representative) | Uses in `09.css` copy A | What it's for |
|---|---|---|---|---|---|
| **primary** | `rgb(29, 31, 33)` | `#1D1F21` | `09.css:295` `.switch input:checked + span` | 15 | Near-black brand. Switch fill, `.text-primary`, `.br/bl/bt/bb-primary`, `.toast`, `.btn-outline` hover text, `.text-link` hover, `.bg-primary` derivatives |
| **success** | `rgb(76, 175, 80)` | `#4CAF50` | `09.css:299` `.switch-success…` | 12 | Material Green 500. Switch, `.text-success`, hairlines, `.toast-success`, `.bg-success` |
| **info** | `rgb(32, 149, 242)` | `#2095F2` | `09.css:300` `.switch-info…` | 14 | Material-ish Blue. Switch, `.text-info`, hairlines, `.toast-info`, `.bg-info`, `.list-icon div:hover`, **`.chatQuestion`** |
| **warning** | `rgb(254, 151, 0)` | `#FE9700` | `09.css:301` `.switch-warning…` | 12 | Material Orange 500. Switch, `.text-warning`, hairlines, `.toast-warning`, `.bg-warning` |
| **danger** | `rgb(243, 66, 53)` | `#F34235` | `09.css:302` `.switch-danger…` | 12 | Material Red 500. Switch, `.text-danger`, hairlines, `.toast-error`, `.bg-danger` |
| **inverse** | `rgb(54, 63, 69)` | `#363F45` | `09.css:331` `.btn-inverse` | 23 | Dark slate. **The only semantic colour that reaches a button.** Also `#loading-bar .bar`/`.peg`, `.switch-inverse`, `.label-inverse`, `.alert-inverse`, `.text-inverse`, `.bg-inverse`, topnavbar hover `rgba(54,63,69,.05)` |
| **amber** | `rgb(255, 193, 7)` | `#FFC107` | `09.css:304` `.switch-amber…` | 17 | Material Amber 500 |
| **pink** | `rgb(233, 30, 99)` | `#E91E63` | `09.css:305` `.switch-pink…` | 17 | Material Pink 500 |
| **purple** | `rgb(102, 57, 182)` | `#6639B6` | `09.css:306` `.switch-purple…` | 18 | Deep Purple. Also `.toast-wait` |
| **orange** | `rgb(254, 86, 33)` | `#FE5621` | `09.css:307` `.switch-orange…` | 17 | Deep Orange |
| **gray-darker** | `rgb(43, 61, 81)` | `#2B3D51` | `09.css:449` `.bg-gray-darker` | 9 | Darkest neutral (sidebar-dark theme) |
| **gray-dark** | `rgb(81, 93, 110)` | `#515D6E` | `09.css:471` `.bg-gray-dark` | 13 | Also `.chatChannelTabs li.activeTab a` colour, `.bg-white a:hover` |
| **gray** | `rgb(160, 170, 178)` | `#A0AAB2` | `09.css:427` `.bg-gray` | 19 | Mid neutral. `.settings-inner` border, `.setting-color > label` border |
| **gray-light** | `rgb(230, 233, 238)` | `#E6E9EE` | `09.css:493` `.bg-gray-light` | 17 | **Component hairline.** `.page-header` bottom, `.nav-tabs-alerts` border, `.tab-content` border, **`.btn.btn-default` border**, `.switch:disabled` |
| **gray-lighter** | `rgb(244, 245, 245)` | `#F4F5F5` | `09.css:515` `.bg-gray-lighter` | 12 | Surface tint. `.jumbotron` border, `.nav-tabs-alerts > li > a` fill, `.app-container > footer` top border |
| **muted** | `rgb(131, 148, 169)` | `#8394A9` | `09.css:111` `.app-view-header > small` | 11 | Secondary text under `.bg-white`. Also `.br/bl/bt/bb-muted`, **`.chat li .chat-body p`**, `.settings-button > em` |
| **text-body-alt** | `rgb(88, 95, 105)` | `#585F69` | `09.css:23` `.nav-tabs-alerts > li > a` | 11 | Body text on light `bg-*` contexts, `.text-link` |
| **hairline** | `rgb(236, 238, 238)` | `#ECEEEE` | `09.css:866` `.br, .b` | 17 | The `.b/.br/.bl/.bt/.bb` utility border + responsive `-sm/-md/-lg` variants + `.chatHeader` border |
| **white** | `rgb(255, 255, 255)` | `#FFFFFF` | 89 uses, e.g. `09.css:263` | 89 | Most-used literal in the app sheet |
| **black** | `rgb(0, 0, 0)` / `black` | `#000000` | 29 + 4 keyword uses | 33 | `.bg-primary` fill, zero-shadow sentinel `rgb(0,0,0) 0 0 0`, `.dark` background |
| **input-border** | `rgb(219, 217, 217)` | `#DBD9D9` | `09.css:34` `.form-control, .input-group-addon` | 1 | Overrides Bootstrap's `rgb(204,204,204)` |
| **input-addon-bg** | `rgb(248, 249, 251)` | `#F8F9FB` | `09.css:35` `.input-group-addon` | 1 | Overrides Bootstrap's `rgb(238,238,238)` |
| **editable-ink** | `rgb(10, 10, 10)` | `#0A0A0A` | `09.css:1194` `.editable-click, a.editable-click` | 1 | **Largest computed footprint on the page: 269 nodes** |
| **footer-bg** | `rgb(240, 240, 240)` | `#F0F0F0` | `09.css:100` `.app-container > footer` | 1 | Footer fill (footer is `display:none` here via `.footer-hidden`, `09.css:137`) |

### 2.1 Semantic hover/active shades (button + label)

| Base | Hover/active bg | Hover border | `[href]:hover` label bg | Cites |
|---|---|---|---|---|
| inverse `rgb(54,63,69)` | `rgb(45,53,58)` | `rgb(36,42,46)` | `rgb(32,37,40)` | `09.css:332`, `09.css:1082` |
| amber `rgb(255,193,7)` | `rgb(242,181,0)` | `rgba(0,0,0,0)` | `rgb(211,158,0)` | `09.css:337`, `09.css:1084` |
| purple `rgb(102,57,182)` | `rgb(93,52,166)` | `rgba(0,0,0,0)` | `rgb(80,45,143)` | `09.css:342`, `09.css:1088` |
| pink `rgb(233,30,99)` | `rgb(221,22,89)` | `rgba(0,0,0,0)` | `rgb(193,19,78)` | `09.css:347`, `09.css:1086` |
| orange `rgb(254,86,33)` | `rgb(254,71,13)` | `rgba(0,0,0,0)` | `rgb(235,57,1)` | `09.css:352`, `09.css:1090` |

### 2.2 `.text-*` link-hover alphas — a complete 16-value family

Every `.text-*` helper pairs with an `a.text-*:hover/:focus` at **70 % alpha of the same base**. Exhaustive:

| Selector | Base | Hover | Cite |
|---|---|---|---|
| `a.text-primary` | `rgb(29,31,33)` | `rgba(29,31,33,0.7)` | `09.css:973` |
| `a.text-success` | `rgb(76,175,80)` | `rgba(76,175,80,0.7)` | `09.css:976` |
| `a.text-warning` | `rgb(254,151,0)` | `rgba(254,151,0,0.7)` | `09.css:979` |
| `a.text-danger` | `rgb(243,66,53)` | `rgba(243,66,53,0.7)` | `09.css:982` |
| `a.text-info` | `rgb(32,149,242)` | `rgba(32,149,242,0.7)` | `09.css:985` |
| `a.text-white` | `rgb(255,255,255)` | `rgba(255,255,255,0.7)` | `09.css:988` |
| `a.text-inverse` | `rgb(54,63,69)` | `rgba(54,63,69,0.7)` | `09.css:991` |
| `a.text-alpha` | `rgba(255,255,255,0.5)` | `rgba(255,255,255,0.7)` | `09.css:992–994` |
| `a.text-pink` | `rgb(233,30,99)` | `rgba(233,30,99,0.7)` | `09.css:997` |
| `a.text-purple` | `rgb(102,57,182)` | `rgba(102,57,182,0.7)` | `09.css:1000` |
| `a.text-alpha-inverse` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` | `09.css:1001–1003` |
| `a.text-amber` | `rgb(255,193,7)` | `rgba(255,193,7,0.7)` | `09.css:1006` |
| `a.text-orange` | `rgb(254,86,33)` | `rgba(254,86,33,0.7)` | `09.css:1009` |
| `a.text-gray-darker` | `rgb(43,61,81)` | `rgba(43,61,81,0.7)` | `09.css:1012` |
| `a.text-gray-dark` | `rgb(81,93,110)` | `rgba(81,93,110,0.7)` | `09.css:1015` |
| `a.text-gray` | `rgb(160,170,178)` | `rgba(160,170,178,0.7)` | `09.css:1018` |
| `a.text-gray-light` | `rgb(230,233,238)` | `rgba(230,233,238,0.7)` | `09.css:1021` |
| `a.text-gray-lighter` | `rgb(244,245,245)` | `rgba(244,245,245,0.7)` | `09.css:1024` |

---

## 3. Alpha blacks and whites — the complete overlay scale

Every `rgba(0,0,0,α)` and `rgba(255,255,255,α)` in the app sheet, with every use.

| Value | Uses | Where |
|---|---|---|
| `rgba(0,0,0,0.04)` | 1 | `.chatHeader` bg `09.css:1169` |
| `rgba(0,0,0,0.05)` | 1 | `.chat li .chat-body` shadow `09.css:1123` |
| `rgba(0,0,0,0.1)` | 2 | `.btn-label::after` divider `09.css:366`; `.videChatLabel` bg `09.css:1211` |
| `rgba(0,0,0,0.12)` | 4 | `.shadow-z1` (×2) `09.css:1115`; `.layout-material … > .app` (×2) `09.css:172` |
| `rgba(0,0,0,0.14)` | 2 | `.app-container > header` `09.css:97`; `> aside` `09.css:98` |
| `rgba(0,0,0,0.15)` | 2 | `.sidebar-wrapper hr` border `09.css:180`; `.slimScrollRail` bg `09.css:396` |
| `rgba(0,0,0,0.16)` | 8 | `.shadow-z2` `09.css:1116` + `.jumbotron` `:20`, `.well` `:22`, settings `:263,:264`, `.btn:hover` `:325`, `.btn-group.open` `:327`, `.btn-image:hover` `:330` |
| `rgba(0,0,0,0.19)` | 2 | `.shadow-z2-hover` `09.css:1117`; `.shadow-z3` `09.css:1118` |
| `rgba(0,0,0,0.22)` | 2 | `.shadow-z4` `09.css:1119`; `.shadow-z5` `09.css:1120` |
| `rgba(0,0,0,0.23)` | 10 | `.shadow-z2/-z2-hover/-z3` + `.jumbotron`, `.well`, settings ×2, `.btn:hover`, `.btn-group.open`, `.btn-image:hover` |
| `rgba(0,0,0,0.25)` | 2 | `.switch span` inset `09.css:289`; `.shadow-z4` `09.css:1119` |
| `rgba(0,0,0,0.26)` | 1 | `.thumbnail` `09.css:21` |
| `rgba(0,0,0,0.28)` | 2 | `.app-container > header`/`> aside` `09.css:97–98` |
| `rgba(0,0,0,0.3)` | 1 | `.shadow-z5` `09.css:1120` |
| `rgba(0,0,0,0.35)` | 1 | `.slimScrollBar` bg `09.css:394` |
| `rgba(0,0,0,0.4)` | 1 | `.switch span::after` shadow `09.css:290` |
| `rgba(0,0,0,0.5)` | 7 | `.text-alpha-inverse` `:1001–1002`; `.chatToolbar` all four borders `:1135`; `#webcamCamDiv` bg `:1187` |
| `rgba(0,0,0,0.7)` | 1 | `a.text-alpha-inverse:hover` `09.css:1003` |
| `rgba(0,0,0,0)` | 4 | `.btn-amber/-purple/-pink/-orange:hover` border `09.css:337,342,347,352` |
| `rgba(255,255,255,0.5)` | 3 | `.layer-morph-close > em` `:409`; `.text-alpha` `:992–993` |
| `rgba(255,255,255,0.6)` | 1 | `.input-huge::-webkit-input-placeholder` `09.css:313` |
| `rgba(255,255,255,0.7)` | 2 | `a.text-white:hover` `:988`; `a.text-alpha:hover` `:994` |
| `rgba(54,63,69,0.05)` | 1 | `.topnavbar .nav > li > a:hover` inside `@media(min-width:768px)` `09.css:80` |

---

## 4. The 14 `.bg-*` context families — exhaustive derived palettes

Each `.bg-X` block is a 22-rule cascade emitted by the theme mixin: base bg + base text, link, link-hover, `.nav > li > a`, `.nav > li.active` bg, hover/active text, hover/active bg, `.sidebar-subnav` bg, active-subnav (transparent), `.navbar-form .form-control` bg + text, placeholder, `.ie9` bottom border, feedback/addon, `.text-muted`, `.text-loud`, `small` (inherit), `@media print` black, `.help-block`, `.flot-tick-label`, `hr` border, and (for 8 of them) `.bg-light`/`.bg-dark` variants.

| Family | Base bg | Base text | link | link:hover | nav-active bg | nav-hover bg | placeholder / muted / help | text-loud | hr border | `.bg-light` | `.bg-dark` | First line |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `.bg-gray` | `rgb(160,170,178)` | `rgb(255,255,255)` | `rgb(227,230,232)` | `rgb(255,255,255)` | `rgb(149,160,169)` | `rgb(137,150,160)` | `rgb(233,236,237)` | `rgb(255,255,255)` | `rgba(233,236,237,.26)` | — | — | `09.css:427` |
| `.bg-gray-darker` | `rgb(43,61,81)` | `rgb(146,170,197)` | `rgb(136,154,173)` | `rgb(176,194,213)` | `rgb(36,51,68)` | `rgb(29,41,54)` | `rgb(89,126,167)` | `rgb(176,194,213)` | `rgba(89,126,167,.26)` | — | — | `09.css:449` |
| `.bg-gray-dark` | `rgb(81,93,110)` | `rgb(198,204,213)` | `rgb(181,187,196)` | `rgb(224,227,232)` | `rgb(72,83,98)` | `rgb(64,73,87)` | `rgb(148,159,176)` | `rgb(224,227,232)` | `rgba(148,159,176,.26)` | — | — | `09.css:471` |
| `.bg-gray-light` | `rgb(230,233,238)` | `rgb(88,95,105)` | `rgb(171,172,174)` | `rgb(145,146,147)` | `rgb(243,244,247)` | `rgb(255,255,255)` | `rgb(160,170,178)` | `rgb(233,236,237)` | `rgba(160,170,178,.26)` | — | — | `09.css:493` |
| `.bg-gray-lighter` | `rgb(244,245,245)` | `rgb(88,95,105)` | `rgb(175,176,176)` | `rgb(145,146,147)` | `rgb(250,250,250)` | `rgb(255,255,255)` | `rgb(160,170,178)` | `rgb(233,236,237)` | `rgba(160,170,178,.26)` | — | — | `09.css:515` |
| `#bg-white`, `.bg-white` | `rgb(255,255,255)` | `rgb(88,95,105)` | `rgb(133,142,154)` | `rgb(81,93,110)` | `rgb(248,249,249)` | `rgb(241,242,243)` | `rgb(131,148,169)` | `rgb(209,216,223)` | `rgba(131,148,169,.26)` | — | — | `09.css:537` |
| `.bg-inverse` | `rgb(54,63,69)` | `rgb(161,173,181)` | `rgb(147,156,162)` | `rgb(187,196,202)` | `rgb(45,53,58)` | `rgb(36,42,46)` | `rgb(112,131,143)` | `rgb(187,196,202)` | `rgba(112,131,143,.26)` | `rgb(67,79,86)` | `rgb(41,47,52)` | `09.css:559` |
| `.bg-primary` | **`rgb(0,0,0)`** ⚠ | `rgb(133,141,148)` | `rgb(119,124,129)` | `rgb(158,164,169)` | `rgb(19,21,22)` | `rgb(10,11,11)` | `rgb(91,97,104)` | `rgb(158,164,169)` | `rgba(91,97,104,.26)` | `rgb(43,46,49)` | `rgb(15,16,17)` | `09.css:583` |
| `.bg-success` | `rgb(76,175,80)` | `rgb(227,243,228)` | `rgb(201,231,203)` | `rgb(255,255,255)` | `rgb(70,161,73)` | `rgb(64,147,67)` | `rgb(167,217,169)` | `rgb(255,255,255)` | `rgba(167,217,169,.26)` | `rgb(96,186,99)` | `rgb(67,154,70)` | `09.css:607` |
| `.bg-info` | `rgb(32,149,242)` | `rgb(239,247,254)` | `rgb(188,223,251)` | `rgb(255,255,255)` | `rgb(22,139,231)` | `rgb(13,128,220)` | `rgb(157,209,249)` | `rgb(255,255,255)` | `rgba(157,209,249,.26)` | `rgb(61,163,244)` | `rgb(13,134,230)` | `09.css:631` |
| `.bg-warning` | `rgb(254,151,0)` | `rgb(255,240,218)` | `rgb(255,224,179)` | `rgb(255,255,255)` | `rgb(234,139,0)` | `rgb(213,127,0)` | `rgb(255,205,132)` | `rgb(255,255,255)` | `rgba(255,205,132,.26)` | `rgb(255,164,30)` | `rgb(223,133,0)` | `09.css:655` |
| `.bg-danger` | `rgb(243,66,53)` | `rgb(255,255,255)` | `rgb(251,198,194)` | `rgb(255,255,255)` | `rgb(242,48,34)` | `rgb(241,30,14)` | `rgb(250,183,178)` | `rgb(255,255,255)` | `rgba(250,183,178,.26)` | `rgb(245,93,82)` | `rgb(241,39,24)` | `09.css:679` |
| `.bg-amber` | `rgb(255,193,7)` | `rgb(255,248,226)` | `rgb(255,236,181)` | `rgb(255,255,255)` | `rgb(238,179,4)` | `rgb(221,166,0)` | `rgb(255,226,140)` | `rgb(255,255,255)` | `rgba(255,226,140,.26)` | `rgb(255,201,38)` | `rgb(231,174,0)` | `09.css:703` |
| `.bg-pink` | `rgb(233,30,99)` | `rgb(253,230,238)` | `rgb(248,188,208)` | `rgb(255,255,255)` | `rgb(218,25,90)` | `rgb(202,20,82)` | `rgb(245,151,183)` | `rgb(255,255,255)` | `rgba(245,151,183,.26)` | `rgb(236,58,118)` | `rgb(212,21,86)` | `09.css:727` |
| `.bg-purple` | `rgb(102,57,182)` | `rgb(225,216,243)` | `rgb(207,193,232)` | `rgb(252,251,254)` | `rgb(93,52,166)` | `rgb(85,47,151)` | `rgb(176,150,222)` | `rgb(252,251,254)` | `rgba(176,150,222,.26)` | `rgb(117,72,198)` | `rgb(89,50,159)` | `09.css:751` |
| `.bg-orange` | `rgb(254,86,33)` | `rgb(255,252,251)` | `rgb(255,204,188)` | `rgb(255,255,255)` | `rgb(250,73,17)` | `rgb(245,60,1)` | `rgb(255,186,165)` | `rgb(255,255,255)` | `rgba(255,186,165,.26)` | `rgb(254,109,63)` | `rgb(254,63,3)` | `09.css:775` |

Plus `.bg-transparent { background-color: transparent !important }` (`09.css:799`) and the six `.bg-pic1…6` image backgrounds (`09.css:800–805`, see P28 §5.2).

Every family also emits an `.ie9 … .navbar-form .form-control { border-bottom: 1px solid rgba(<muted>, 0.15) }` rule — 15 in total at `09.css:438, 460, 482, 504, 526, 548, 570, 594, 618, 642, 666, 690, 714, 738, 762, 786`. All dead in a modern rebuild.

**Runtime status: all 14 families are inert on this capture.** No node carries a `bg-*` class; `background-color` deviates from `rgba(0,0,0,0)` on only 157 of 2,156 nodes (`DEFAULTS.txt:58`) and none of the deviating values matches a family base except `rgb(54,63,69)` (2 nodes, which are `.btn-inverse`, not `.bg-inverse`).

---

## 5. Component / one-off app colours

| Colour | Selector | Cite |
|---|---|---|
| `rgb(238,238,238)` | `fieldset` bottom dashed border; `.popover` top/right border | `09.css:37`, `09.css:46` |
| `rgb(230,233,238)` | `.popover` **bottom** border (2px) | `09.css:46` |
| `rgb(225,225,225)` | `.nav-wrapper .navbar-nav .open .dropdown-menu` top+bottom | `09.css:86` |
| `rgb(241,241,241)` | `.progress` border; `.drop-area.highlight` bg | `09.css:44`, `09.css:1219` |
| `rgb(250,250,250)` | `.navbar-brand` colour; `.bg-gray-lighter .nav > li.active`; `.whiteborder` | `09.css:62`, `:519`, `:1215` |
| `rgb(161,162,163)` | `.dropdown-header` colour | `09.css:49` |
| `rgb(221,221,221)` | `.switch span::after` border | `09.css:290` |
| `rgb(209,210,211)` | `[ripple] > .ripple > .angular-ripple` fill | `09.css:383` |
| `rgb(29,41,54)` | `.drop-area-alert, .drop-area` 2px dashed border | `09.css:1218` |
| `rgb(2,90,168)` | `.drop-area.highlight` border | `09.css:1219` |
| `rgb(230,230,230)` | `.alert-*` `.alert-link` colour, all 5 app alerts | `09.css:1093,1096,1099,1102,1105` |
| `rgb(91,51,163)` / `rgb(236,177,0)` / `rgb(216,21,87)` / `rgb(43,50,55)` / `rgb(254,67,8)` | `.alert-purple/-amber/-pink/-inverse/-orange hr` top border | `09.css:1092,1095,1098,1101,1104` |
| `rgb(51,51,51)` | `.videoChatAuto` / `.videoChatAutoSM` background | `09.css:1208–1209` |
| `rgb(34,34,34)` | `.gutter` background (split-pane divider) | `09.css:1240` |
| `rgb(0,191,150)` | `#clockdiv > div` background (teal countdown chip) | `09.css:1203` |
| `rgb(244,244,244)` | `#basic-addonSaveYoutube:hover` etc. | `09.css:1264` |
| `rgb(85,85,85)` | `.yt-url:hover` colour | `09.css:1266` |
| `rgb(176,176,176)` | `.smChatLi .isAdm` bottom border | `09.css:1166` |
| `rgba(220,220,220,0.46)` | `.smChatLi` bottom border | `09.css:1165` |
| `rgba(191,255,0,0.494)` | `#webcamCamDiv` 2px border (chartreuse) | `09.css:1187` |
| `rgb(0,0,0)` (`black` kw) | `.filter-strong` colour; `.badge-warning` colour; `.dark` / `div.l-row.dark` bg | `09.css:1163,1236,1195,1197` |
| `white` (kw) | `.topnavbar .sidebar-toggle/.menu-toggle`; `.vertDivider`; `.dark`; `.hasMobileApp` | `09.css:76,1183,1195,1253` |
| `yellow` (kw) | `.avatarChooser:hover` border; `.chatHighighted` bg; `.privchatHighighted` bg | `09.css:1142,1154,1155` |
| `rgb(224,224,224)` / `rgb(208,208,208)` | `div.l-row.dark` text / its links | `09.css:1197–1198` |
| `rgb(136,136,136)` on `rgb(72,72,72)` | `div.chatHeader.dark`, `div.p.bt.dark` | `09.css:1199–1200` |
| `rgb(0,0,0)` | `#filesDrive .dropdown-menu::after` arrow (left border) | `09.css:1258` |
| `rgb(0,0,0)` | `.room-badge-id, .room-badge-name` colour — **copy-B-only rule** | `09.css:2566` |
| `rgb(238,238,238)` | `.chat-tab-row` bottom border — **copy-B-only rule** | `09.css:2571` |

---

## 6. Chat-only colours — the complete set

| Purpose | Value | Selector | Cite |
|---|---|---|---|
| Chat message body text | `rgb(131,148,169)` | `.chat li .chat-body p` | `09.css:1124` |
| Chat link (light theme) | `rgb(2,90,168)` | `.chat-msg-txt a:visited, .chat-msg-txt a:link` | `09.css:1130` |
| Chat link hover | `rgb(0,0,255)` | `.chat-msg-txt a:hover` | `09.css:1129` |
| Chat link (dark theme) | `rgb(50,176,213)` | `.dark .chat-msg-txt a:visited/:link` | `09.css:1132` |
| Chat link hover (dark) | `rgb(0,0,255)` | `.dark .chat-msg-txt a:hover` | `09.css:1131` |
| Chat body shadow | `rgba(0,0,0,0.05) 0 1px 1px` | `.chat li .chat-body` | `09.css:1123` |
| Chat toolbar borders | `rgba(0,0,0,0.5)` (all 4 sides) | `.chatToolbar` | `09.css:1135` |
| **@mention text** | `rgba(4,141,4,0.9)` + `font-style: italic` | `.chatMention` | `09.css:1159` |
| **@mention background** | `rgba(255,0,0,0.06)` | `.chat li .chat-body .chatMention` | `09.css:1168` |
| Question flag | `rgb(32,149,242)` (= info) | `.chatQuestion` | `09.css:1153` |
| Search highlight | `yellow` | `.chatHighighted` | `09.css:1154` |
| Private-chat highlight | `yellow` + `font-weight: bolder` | `.privchatHighighted` | `09.css:1155` |
| Upvoted (light) border | `2px solid rgb(0,0,0)` | `li.chatUpvoted.light` | `09.css:1158` |
| Chat header | text `rgb(136,136,136)`, bg `rgba(0,0,0,0.04)`, border `1px solid rgb(236,238,238)` | `.chatHeader` | `09.css:1169` |
| Chat header (dark) | text `rgb(136,136,136)`, bg `rgb(72,72,72)`, border **none** | `div.chatHeader.dark` | `09.css:1199` |
| Chat tab (idle) | `rgb(133,142,154)` `!important` | `.chatChannelTabs a` | `09.css:1231` |
| **Chat tab (active)** | text `rgb(81,93,110)` on bg `rgb(232,232,232)`, both `!important` | `.chatChannelTabs li.activeTab a` | `09.css:1232` |
| Chat tab (hover/focus) | identical to active | `.chatChannelTabs a:hover, …:focus` | `09.css:1233` |
| Chat top divider | `1px solid rgb(232,232,232)` | `.chat-top` | `09.css:1229` |
| **Unread badge** | `rgb(255,0,0)` | `.badge-danger-chat` | `09.css:1234` |
| **Private-chat label** | `rgb(255,204,0)` | `.private-chat-label` | `09.css:1235` |
| Warning badge | bg `rgb(255,204,0)`, text `black` | `.badge-warning` | `09.css:1236` |
| Small-chat row divider | `rgba(220,220,220,0.46)` | `.smChatLi` | `09.css:1165` |
| Admin marker underline | `rgb(176,176,176)` | `.smChatLi .isAdm` | `09.css:1166` |
| Filter emphasis | `black`, `font-weight: 600` | `.filter-strong` | `09.css:1163` |

**All prior-pass chat values verified.** link `rgb(2,90,168)` ✓ · mention `rgba(4,141,4,.9)` on `rgba(255,0,0,.06)` ✓ · active tab `rgb(81,93,110)` on `rgb(232,232,232)` ✓ · unread `rgb(255,0,0)` ✓ · private `rgb(255,204,0)` ✓.

**Computed footprint on this page:** `rgb(255,0,0)` appears as `color` on **27** nodes, as `background-color` on **3**, as `border-*-color` on **27**. The 27 text uses are *not* the chat badge — they come from **inline `style="color: red;"` on 18 elements** plus `style="color: red; font-size: 12px; margin-left: 10px;"` on 3 (`nodes-012.txt` `#1551` and siblings). The 3 background uses are the `.badge-danger-chat` elements, all of which carry `ng-hide` (`attr class = "badge badge-danger-chat ng-hide"`). So the chat unread badge is styled correctly but hidden on this route.

---

## 7. Vendor palettes (kept separate, as required)

### 7.1 Bootstrap 3.3.x — `02.css`, 111 distinct colour values

**Brand set** (this is the set that actually paints the buttons — see §1):

| Role | Base | Border | Hover bg | Hover border | Focus bg | Focus border | Active-focus bg | Cites |
|---|---|---|---|---|---|---|---|---|
| primary | `rgb(51,122,183)` | `rgb(46,109,164)` | `rgb(40,96,144)` | `rgb(32,77,116)` | `rgb(40,96,144)` | `rgb(18,43,64)` | `rgb(32,77,116)` | `02.css:796–802` |
| success | `rgb(92,184,92)` | `rgb(76,174,76)` | `rgb(68,157,68)` | `rgb(57,132,57)` | `rgb(68,157,68)` | `rgb(37,86,37)` | `rgb(57,132,57)` | `02.css:804–810` |
| info | `rgb(91,192,222)` | `rgb(70,184,218)` | `rgb(49,176,213)` | `rgb(38,154,188)` | `rgb(49,176,213)` | `rgb(27,109,133)` | `rgb(38,154,188)` | `02.css:812–818` |
| warning | `rgb(240,173,78)` | `rgb(238,162,54)` | `rgb(236,151,31)` | `rgb(213,133,18)` | `rgb(236,151,31)` | `rgb(152,95,13)` | `rgb(213,133,18)` | `02.css:820–826` |
| danger | `rgb(217,83,79)` | `rgb(212,63,58)` | `rgb(201,48,44)` | `rgb(172,41,37)` | `rgb(201,48,44)` | `rgb(118,28,25)` | `rgb(172,41,37)` | `02.css:828–834` |
| default | `rgb(255,255,255)` | `rgb(204,204,204)` | `rgb(230,230,230)` | `rgb(173,173,173)` | `rgb(230,230,230)` | `rgb(140,140,140)` | `rgb(212,212,212)` | `02.css:788–794` |

**Neutrals & text:** body `rgb(51,51,51)` on `rgb(255,255,255)` (`02.css:327`) · link `rgb(51,122,183)` / hover `rgb(35,82,124)` (`02.css:329–330`) · `.text-muted` + `.badge`/`.label-default` + `caption` + disabled `rgb(119,119,119)` (`02.css:369, 1179, 1167, 649`) · `.help-block` `rgb(115,115,115)` (`02.css:755`) · form text `rgb(85,85,85)` (`02.css:695`) · `.form-control` border `rgb(204,204,204)` (`02.css:695`) · disabled fill `rgb(238,238,238)` (`02.css:698`) · placeholder `rgb(153,153,153)` (`02.css:697`) · `hr`/`.page-header` `rgb(238,238,238)` (`02.css:338, 390`) · table borders `rgb(221,221,221)` (`02.css:652`) · zebra `rgb(249,249,249)` (`02.css:661`) · hover row / active row `rgb(245,245,245)` (`02.css:662, 665`) · divider `rgb(229,229,229)` (`02.css:859`).

**Contextual state 4-tuples** (text / bg / border / darker link), all in `02.css`:

| State | Text | Background | Border | Link |
|---|---|---|---|---|
| success | `rgb(60,118,61)` | `rgb(223,240,216)` | `rgb(214,233,198)` | `rgb(43,84,44)` |
| info | `rgb(49,112,143)` | `rgb(217,237,247)` | `rgb(188,232,241)` | `rgb(36,82,105)` |
| warning | `rgb(138,109,59)` | `rgb(252,248,227)` | `rgb(250,235,204)` | `rgb(102,81,44)` |
| danger | `rgb(169,68,66)` | `rgb(242,222,222)` | `rgb(235,204,209)` | `rgb(132,53,52)` |

Cites: `02.css:372–379` (`.text-*`), `:382–389` (`.bg-*`), `:1210–1221` (`.alert-*`), `:1269–1288` (`.list-group-item-*`), `:1340–1359` (`.panel-*`), `:667–674` (table rows), `:738–752` (`.has-success/-warning/-error`).

**Other Bootstrap one-offs:** focus ring `rgb(102,175,233)` + `rgba(102,175,233,0.6)` (`02.css:696`) · `code` `rgb(199,37,78)` on `rgb(249,242,244)` (`02.css:415`) · `kbd` white on `rgb(51,51,51)` (`02.css:416`) · `mark` `rgb(252,248,227)` (`02.css:360`), `<mark>` UA-ish `rgb(255,255,0)` (`02.css:14`) · `navbar-default` `rgb(248,248,248)`/`rgb(231,231,231)` (`02.css:1088`) · `navbar-inverse` `rgb(34,34,34)`/`rgb(8,8,8)`/`rgb(16,16,16)`/`rgb(157,157,157)`/`rgb(68,68,68)` (`02.css:1112–1137`) · tooltip `rgb(0,0,0)` (`02.css:1404`) · `.well` `rgb(245,245,245)`/`rgb(227,227,227)` (`02.css:1364`) · `.popover-title` `rgb(247,247,247)`/`rgb(235,235,235)` (`02.css:1419`) · `.list-group-item.active` text `rgb(199,221,239)` (`02.css:1268`) · `fieldset` border `silver` (`02.css:35`) · `.jumbotron > hr` `rgb(213,213,213)` (`02.css:1191`) · `.breadcrumb` separator `rgb(204,204,204)` (`02.css:1140`).

### 7.2 angular-xeditable — `06.css`

| Colour | Selector | Cite |
|---|---|---|
| `rgb(66,139,202)` | `.editable-click, a.editable-click` — colour **and** `border-bottom: 1px dashed` | `06.css:15` |
| `rgb(42,100,150)` | `.editable-click:hover` colour + border | `06.css:16` |
| `rgb(221,17,68)` | `.editable-empty` (italic) | `06.css:17` |
| `rgb(170,170,170)` / `rgb(255,255,255)` | `.popover-wrapper form` border/bg + its ::before/::after arrows | `06.css:20–22` |

**This is the single most visible vendor colour on the page.** `09.css:1194` overrides only `color`, so the *dashed underline* stays `rgb(66,139,202)` on all **269** editable elements while the text becomes `rgb(10,10,10)`. Verified in `nodes-*.txt`: 269 nodes carry `border-bottom-color: rgb(66, 139, 202)` and `color: rgb(10, 10, 10)` together.

### 7.3 angularjs-color-picker — `04.css` / `05.css`

`rgb(85,85,85)` addon text, `rgb(238,238,238)` addon bg, `rgb(204,204,204)` addon + swatch border (`04.css:7`, `:13`, `:45`) · panel `rgb(255,255,255)` bg + border, shadow `rgba(0,0,0,0.5) 0 0 20px`, `z-index: 99999` (`04.css:16`) · alpha checkerboard `grey` in four `linear-gradient(±45deg)` layers (`04.css:20`) · slider `rgb(255,255,255)` on `rgb(0,0,0)` 1px (`04.css:22`) · picker ring `rgb(0,0,0)` outer + `rgb(255,255,255)` 2px inner (`04.css:27–28`). Zero elements on this page.

### 7.4 textAngular — `08.css`

Focus `rgb(102,175,233)` + `rgba(102,175,233,0.6)` (`08.css:3`, a verbatim copy of `02.css:696`) · resizer handles `black` 1px, info box `rgb(255,255,255)` @ 0.7 opacity, background overlay `rgba(0,0,0,0.2)`, corner-br fill `white` (`08.css:9–15`) · plus a full duplicate of Bootstrap's `.popover` colours (`08.css:16–27`).

### 7.5 Colours that come from the User Agent, not any stylesheet

Recording these so a rebuild does not hunt for a rule that does not exist:

| Computed value | Nodes | Where it comes from |
|---|---|---|
| `rgb(128,128,128)` as `color` + right/bottom/left `border-color` on `<hr>` | 9 | Chrome UA `hr { color: gray }`. `02.css:338` sets only `border-color: rgb(238,238,238) currentcolor currentcolor`, so three sides resolve to the UA `currentColor` |
| `rgb(239,239,239)` background on `<button class="btn btn-assertive">` | 2 | Chrome UA button background. `.btn` (`02.css:782`) sets `background-image:none` but **no `background-color`**, and `.btn-assertive` does not exist in any sheet (§8) |
| `rgb(0,0,0)` on `<nav class="navbar topnavbar">` | 1 | Inline `style="background-color: black;"` (`nodes-000.txt:241`) — not a CSS rule |

---

## 8. Dead classes — present in the DOM, absent from all 15 stylesheets

Verified by `grep` across all 15 sheets returning **zero** selector matches, cross-checked against computed styles.

| Class | Nodes | `grep` result | Computes to | Why |
|---|---|---|---|---|
| **`.muted`** | 138 `<label class="muted">` + more | `grep -n "\.muted\b" *.css` → **0 hits** | `color: rgb(51,51,51)` (the page COMMON, `DEFAULTS.txt:64`), `font-weight: 700` | `.muted` is a **Bootstrap 2** class. Bootstrap 3 renamed it `.text-muted` and the app never re-added it. Node `#287` (`nodes-002.txt:377–386`) has **no `color` deviation at all** — proof it inherits the default. The `font-weight:700` comes from `label` (`02.css:687`), not from `.muted` |
| **`badge-danger`** | 7 (`badge badge-danger`, 6 with `ng-hide`) | `grep -n "badge-danger" *.css` → only `.badge-danger-**chat**` at `09.css:1234` / `09.css:2504` | bg `rgb(119,119,119)`, color `rgb(255,255,255)`, radius 10px, font-size 12px, weight 700 | Bootstrap 3 has `.label-danger` but **no `.badge-danger`** (contextual badges are a Bootstrap **4** feature). The app defined `.badge-danger-chat` and never `.badge-danger`. Node `#1345` (`nodes-011.txt:467–489`) computes the plain `.badge` (`02.css:1179`) |
| **`.btn-assertive`** | 2 | `grep -c btn-assertive *.css` → **0** | bg `rgb(239,239,239)` (UA button), border `rgba(0,0,0,0)` 1px, radius 4px, colour = COMMON `rgb(51,51,51)` | An **Ionic** class name that leaked in. Only `.btn` (`02.css:782`) applies. Node `#471` (`nodes-003.txt`) |
| **`.btn-md`** | 11 | **0** | Nothing added — inherits `.btn` | Bootstrap 3 has `-lg/-sm/-xs`, no `-md` |
| **`.btn-small`** | 3 | **0** | Nothing added | Bootstrap **2** name; Bootstrap 3 is `.btn-sm` |
| **`darkTheme` / `lightTheme`** | 1 (on `<body>`, forced in captures 19/20) | `grep -n "darkTheme\|lightTheme" *.css` → **0** | **Zero computed change on any of 2,156 nodes** | See §9 |

---

## 9. What actually wins — the six confirmed override chains

**9.1 `.editable-click` — partial override, 269 nodes.** `06.css:15` (colour `rgb(66,139,202)` + dashed border) → `09.css:1194` overrides **only** `color` → `rgb(10,10,10)`. Border survives. Computed: 269 nodes with both. *(This is the biggest single colour fact on the page and the prior pass did not mention it.)*

**9.2 `.btn-default` border — app beats Bootstrap.** `02.css:788` `border-color: rgb(204,204,204)` (0-1-0) → `09.css:323` `.btn.btn-default { border-color: rgb(230,233,238) }` (0-2-0) wins. Computed on all 34 `.btn-default` nodes.

**9.3 `.form-control` border + addon fill — app beats Bootstrap.** `02.css:695` `rgb(204,204,204)` → `09.css:34` `rgb(219,217,217)`; `02.css:928` addon bg `rgb(238,238,238)` → `09.css:35` `rgb(248,249,251)`. Computed: 10 nodes carry `border-*-color: rgb(219,217,217)`.

**9.4 `.text-muted` — Bootstrap wins, app rule is context-gated.** `02.css:369` `rgb(119,119,119)` applies; `09.css:550`'s `rgb(131,148,169)` needs a `.bg-white`/`#bg-white` ancestor which does not exist here. Computed on the single `.text-muted` node (`nodes-000.txt` `#47`): `rgb(119,119,119)`.

**9.5 `.btn-warning` and `.btn-primary` neutralised by `.btn-link`, twice** — see §1.2.

**9.6 `darkTheme` / `lightTheme` do absolutely nothing.** This is a striking, hard result. Captures 19 and 20 force `<body class="footer-hidden darkTheme">` and `…lightTheme` respectively. Both report:

```
caps/19-forced-darkTheme/INFO.txt   nodes identical to baseline: 2155/2156 · nodes differing: 1
caps/19-forced-darkTheme/nodes-000.txt:3-4
    #0 path=r <body> — 1 difference(s) vs baseline
       attr class: "footer-hidden" -> "footer-hidden darkTheme"
caps/20-forced-lightTheme/INFO.txt  nodes identical to baseline: 2155/2156 · nodes differing: 1
```

The **only** difference is the class attribute itself. **Not one computed style on any of the 2,156 nodes changes.** `grep -n "darkTheme\|lightTheme" *.css` across all 15 sheets returns zero. The theming that *does* exist is a different, unscoped mechanism: bare `.dark` / `.light` classes applied per-element (`09.css:1195–1201`, `:1131–1132`, `:1158`), which the app toggles in JS. A rebuild must implement dark mode with `.dark` on the *component*, not a theme class on `<body>`.

---

## 10. Rebuild spec — the token set

Two token namespaces, because the reference genuinely uses two palettes side by side (§1). Do not merge them or the buttons will not match.

```css
:root {
  /* ─── APP PALETTE (09.css) — switches, text-*, hairlines, bg-*, labels, alerts, toasts ─── */
  --app-primary:        rgb(29, 31, 33);    /* #1D1F21  09.css:295  */
  --app-success:        rgb(76, 175, 80);   /* #4CAF50  09.css:299  */
  --app-info:           rgb(32, 149, 242);  /* #2095F2  09.css:300  */
  --app-warning:        rgb(254, 151, 0);   /* #FE9700  09.css:301  */
  --app-danger:         rgb(243, 66, 53);   /* #F34235  09.css:302  */
  --app-inverse:        rgb(54, 63, 69);    /* #363F45  09.css:331  ← the ONE that reaches a button */
  --app-amber:          rgb(255, 193, 7);   /* #FFC107  09.css:304  */
  --app-pink:           rgb(233, 30, 99);   /* #E91E63  09.css:305  */
  --app-purple:         rgb(102, 57, 182);  /* #6639B6  09.css:306  */
  --app-orange:         rgb(254, 86, 33);   /* #FE5621  09.css:307  */

  --app-gray-darker:    rgb(43, 61, 81);    /* #2B3D51  09.css:449  */
  --app-gray-dark:      rgb(81, 93, 110);   /* #515D6E  09.css:471  */
  --app-gray:           rgb(160, 170, 178); /* #A0AAB2  09.css:427  */
  --app-gray-light:     rgb(230, 233, 238); /* #E6E9EE  09.css:493  ← .btn-default border */
  --app-gray-lighter:   rgb(244, 245, 245); /* #F4F5F5  09.css:515  */
  --app-muted:          rgb(131, 148, 169); /* #8394A9  09.css:111  */
  --app-text-alt:       rgb(88, 95, 105);   /* #585F69  09.css:23   */
  --app-hairline:       rgb(236, 238, 238); /* #ECEEEE  09.css:866  ← .b/.br/.bl/.bt/.bb */
  --app-input-border:   rgb(219, 217, 217); /* #DBD9D9  09.css:34   */
  --app-input-addon-bg: rgb(248, 249, 251); /* #F8F9FB  09.css:35   */
  --app-editable-ink:   rgb(10, 10, 10);    /* #0A0A0A  09.css:1194 ← 269 nodes */
  --app-footer-bg:      rgb(240, 240, 240); /* #F0F0F0  09.css:100  */

  /* ─── BOOTSTRAP PALETTE (02.css) — buttons, badges, labels, alerts, links, body ─── */
  --bs-body-text:       rgb(51, 51, 51);    /* #333333  02.css:327  ← 1732/2156 nodes */
  --bs-body-bg:         rgb(255, 255, 255); /* #FFFFFF  02.css:327  */
  --bs-link:            rgb(51, 122, 183);  /* #337AB7  02.css:329  */
  --bs-link-hover:      rgb(35, 82, 124);   /* #23527C  02.css:330  */
  --bs-muted:           rgb(119, 119, 119); /* #777777  02.css:369  ← .badge, .label-default too */
  --bs-btn-primary:     rgb(51, 122, 183);  --bs-btn-primary-bd: rgb(46, 109, 164);  /* 02.css:796 */
  --bs-btn-success:     rgb(92, 184, 92);   --bs-btn-success-bd: rgb(76, 174, 76);   /* 02.css:804 */
  --bs-btn-info:        rgb(91, 192, 222);  --bs-btn-info-bd:    rgb(70, 184, 218);  /* 02.css:812 */
  --bs-btn-warning:     rgb(240, 173, 78);  --bs-btn-warning-bd: rgb(238, 162, 54);  /* 02.css:820 */
  --bs-btn-danger:      rgb(217, 83, 79);   --bs-btn-danger-bd:  rgb(212, 63, 58);   /* 02.css:828 */
  --bs-btn-default-bg:  rgb(255, 255, 255); /* 02.css:788 — border comes from --app-gray-light */
  --bs-focus-ring:      rgb(102, 175, 233); /* #66AFE9  02.css:696  */
  --bs-border:          rgb(221, 221, 221); /* #DDDDDD  02.css:652  tables */
  --bs-divider:         rgb(238, 238, 238); /* #EEEEEE  02.css:338  hr, page-header */

  /* ─── CHAT (09.css:1121-1240) ─── */
  --chat-body-text:     rgb(131, 148, 169);      /* 09.css:1124 */
  --chat-link:          rgb(2, 90, 168);         /* 09.css:1130 */
  --chat-link-hover:    rgb(0, 0, 255);          /* 09.css:1129 */
  --chat-link-dark:     rgb(50, 176, 213);       /* 09.css:1132 */
  --chat-mention-fg:    rgba(4, 141, 4, 0.9);    /* 09.css:1159 + font-style: italic */
  --chat-mention-bg:    rgba(255, 0, 0, 0.06);   /* 09.css:1168 */
  --chat-question:      rgb(32, 149, 242);       /* 09.css:1153 = --app-info */
  --chat-highlight:     yellow;                  /* 09.css:1154 */
  --chat-tab-fg:        rgb(133, 142, 154);      /* 09.css:1231 */
  --chat-tab-active-fg: rgb(81, 93, 110);        /* 09.css:1232 = --app-gray-dark */
  --chat-tab-active-bg: rgb(232, 232, 232);      /* 09.css:1232 */
  --chat-unread:        rgb(255, 0, 0);          /* 09.css:1234 */
  --chat-private:       rgb(255, 204, 0);        /* 09.css:1235 */
  --chat-header-bg:     rgba(0, 0, 0, 0.04);     /* 09.css:1169 */
  --chat-header-bg-dark:rgb(72, 72, 72);         /* 09.css:1199 */
  --chat-header-fg-dark:rgb(136, 136, 136);      /* 09.css:1199 */
  --chat-row-divider:   rgba(220, 220, 220, 0.46); /* 09.css:1165 */

  /* ─── OVERLAY SCALE (§3) ─── */
  --ov-04:  rgba(0,0,0,.04);  --ov-05:  rgba(0,0,0,.05);  --ov-10: rgba(0,0,0,.10);
  --ov-12:  rgba(0,0,0,.12);  --ov-14:  rgba(0,0,0,.14);  --ov-15: rgba(0,0,0,.15);
  --ov-16:  rgba(0,0,0,.16);  --ov-19:  rgba(0,0,0,.19);  --ov-22: rgba(0,0,0,.22);
  --ov-23:  rgba(0,0,0,.23);  --ov-25:  rgba(0,0,0,.25);  --ov-26: rgba(0,0,0,.26);
  --ov-28:  rgba(0,0,0,.28);  --ov-30:  rgba(0,0,0,.30);  --ov-35: rgba(0,0,0,.35);
  --ov-40:  rgba(0,0,0,.40);  --ov-50:  rgba(0,0,0,.50);  --ov-70: rgba(0,0,0,.70);
  --ov-w50: rgba(255,255,255,.5); --ov-w60: rgba(255,255,255,.6); --ov-w70: rgba(255,255,255,.7);
}
```

**Component mapping that reproduces the reference exactly:**

```css
.btn-primary { background: var(--bs-btn-primary); border-color: var(--bs-btn-primary-bd); color:#fff }
.btn-success { background: var(--bs-btn-success); border-color: var(--bs-btn-success-bd); color:#fff }
.btn-info    { background: var(--bs-btn-info);    border-color: var(--bs-btn-info-bd) }
.btn-warning { background: var(--bs-btn-warning); border-color: var(--bs-btn-warning-bd) }
.btn-danger  { background: var(--bs-btn-danger);  border-color: var(--bs-btn-danger-bd) }
.btn-default { background: var(--bs-btn-default-bg); border-color: var(--app-gray-light) } /* ← the split */
.btn-inverse { background: var(--app-inverse); border-color: var(--app-inverse); color:#fff }
.switch-success input:checked + span { background: var(--app-success); border-color: var(--app-success) }
.text-success{ color: var(--app-success) }   /* NOTE: NOT the same green as .btn-success */
.badge       { background: var(--bs-muted) }
.editable    { color: var(--app-editable-ink); border-bottom: 1px dashed rgb(66,139,202) } /* 06.css:15 */
```

**Do not port:** the 15 `.ie9` rules; `.muted`, `.badge-danger`, `.btn-assertive`, `.btn-md`, `.btn-small` (define them or delete the class attributes — do not leave both); `darkTheme`/`lightTheme` on `<body>` (implement `.dark` per-component instead).

---

## 11. Honest gaps

1. **`.bg-*` context families (14 × ~22 rules = ~310 colour declarations) have zero elements on this capture.** Their values are read verbatim from `09.css:427–799`, but nothing on this page exercises them. They must be re-verified against a route that uses a coloured sidebar.
2. **The four app-only button variants** (`.btn-amber/-purple/-pink/-orange`, `09.css:336–355`) and the five app-only alerts (`09.css:1091–1105`) and five app-only labels (`09.css:1081–1090`) have **zero** matching elements. Declared values only, no computed confirmation.
3. **Toast colours are known; toast geometry is not.** `09.css:399–405` gives the six background colours exactly, but sheet 07 (angularjs-toaster 2.2.0) is CORS-blocked (`07.css:2`), so padding, radius, size, close-button and animation are unrecoverable. Also, no `#toast-container` exists in the DOM here.
4. **Video.js palette entirely unknown** — sheet 03 CORS-blocked (`03.css:2`). See P26 §4.
5. **`.thumb16`/`.thumb20` cascade** is argued from CSS, not observed — neither class is in the DOM (see P26 §2).
6. **`@media print` colour overrides** (14 `.bg-* { color: rgb(0,0,0) !important }` blocks in `09.css` + the global `*{color:#000!important}` at `02.css:42`) are completely unverified — no print rendering exists in the dump.
7. **Hover / focus / active / disabled colours are declared but never rendered.** The capture is a single static state; no `:hover` was simulated. Every hover value above is a declaration, not an observation.
8. **`.dark`/`.light` theming is partially unverifiable.** `09.css:1195–1201` declares dark-mode rules, but no element on this capture carries `.dark`; the 3 subtree captures with dark styling do not exist. The two forced-theme captures prove only that `darkTheme`/`lightTheme` do nothing.
9. **`grep -c "var(--"` = 0 across all 15 sheets** and all 22 captures report `cssVars: {"root":{},"body":{}}` (`00-META.txt:38–59`). Every value above is a hard-coded literal; the token layer in §10 is new work, not a port.

---

## Appendix A — exhaustive colour index for `09.css` copy A

Machine-extracted from `09.css:2–1272`: **240 distinct colour values**, every occurrence with line, property and selector. Generated by parsing each declaration block; nothing is sampled or summarised. The per-value use counts referenced throughout this document come from this index.

*(Index body: 240 entries. The full per-line listing is reproduced verbatim below.)*

```
=== rgb(255, 255, 255)  (89 uses)
   09.css:25    border-bottom-color    .nav-tabs-alerts > li.active > a, .nav-tabs-alerts > li.active > a:hover, .nav-tabs-alerts > li.active > a:focus
   09.css:44    background-color       .progress
   09.css:172   background-color       .layout-material .app-container > section > .app
   09.css:263   background-color       .settings-wrapper > .settings-inner
   09.css:264   border-right           .settings-wrapper > .settings-inner .settings-button
   09.css:267   background-color       .settings-wrapper > .settings-inner::after
   09.css:283   color                  .setting-color > label > .icon-check
   09.css:290   background-color       .switch span::after
   09.css:312   color                  .input-huge
   09.css:331   color                  .btn-inverse
   09.css:332   color                  .btn-inverse:hover, .btn-inverse:focus, .btn-inverse.focus, .btn-inverse:active, .btn-inverse.active, .open > .dropdown-toggle.btn-inverse
   09.css:335   background-color       .btn-inverse .badge
   09.css:336   color                  .btn-amber
   09.css:337   color                  .btn-amber:hover, .btn-amber:focus, .btn-amber.focus, .btn-amber:active, .btn-amber.active, .open > .dropdown-toggle.btn-amber
   09.css:340   background-color       .btn-amber .badge
   09.css:341   color                  .btn-purple
   09.css:342   color                  .btn-purple:hover, .btn-purple:focus, .btn-purple.focus, .btn-purple:active, .btn-purple.active, .open > .dropdown-toggle.btn-purple
   09.css:345   background-color       .btn-purple .badge
   09.css:346   color                  .btn-pink
   09.css:347   color                  .btn-pink:hover, .btn-pink:focus, .btn-pink.focus, .btn-pink:active, .btn-pink.active, .open > .dropdown-toggle.btn-pink
   09.css:350   background-color       .btn-pink .badge
   09.css:351   color                  .btn-orange
   09.css:352   color                  .btn-orange:hover, .btn-orange:focus, .btn-orange.focus, .btn-orange:active, .btn-orange.active, .open > .dropdown-toggle.btn-orange
   09.css:355   background-color       .btn-orange .badge
   09.css:356   border-color           .btn-outline
   09.css:357   background-color       .btn-outline:hover, .btn-outline:focus
   09.css:398   box-shadow             .smoothy::after
   09.css:408   color                  .layer-morph-close
   09.css:410   color                  .layer-morph-close:hover > em
   09.css:426   color                  .layer-morph-container .layer-morph-footer
   09.css:427   color                  .bg-gray
   09.css:429   color                  .bg-gray a:focus, .bg-gray a:hover
   09.css:430   color                  .bg-gray .nav > li > a
   09.css:432   color                  .bg-gray .nav > li:hover > a, .bg-gray .nav > li.active > a
   09.css:436   color                  .bg-gray .navbar-form .form-control
   09.css:441   color                  .bg-gray .text-loud
   09.css:447   color                  .bg-gray .flot-tick-label
   09.css:499   background-color       .bg-gray-light .nav > li:hover > a, .bg-gray-light .nav > li.active > a
   09.css:521   background-color       .bg-gray-lighter .nav > li:hover > a, .bg-gray-lighter .nav > li.active > a
   09.css:537   background-color       #bg-white, .bg-white
   09.css:544   background-color       #bg-white .sidebar-subnav, .bg-white .sidebar-subnav
   09.css:546   background-color       #bg-white .navbar-form .form-control, .bg-white .navbar-form .form-control
   09.css:609   color                  .bg-success a:focus, .bg-success a:hover
   09.css:610   color                  .bg-success .nav > li > a
   09.css:612   color                  .bg-success .nav > li:hover > a, .bg-success .nav > li.active > a
   09.css:621   color                  .bg-success .text-loud
   09.css:633   color                  .bg-info a:focus, .bg-info a:hover
   09.css:634   color                  .bg-info .nav > li > a
   09.css:636   color                  .bg-info .nav > li:hover > a, .bg-info .nav > li.active > a
   09.css:645   color                  .bg-info .text-loud
   09.css:657   color                  .bg-warning a:focus, .bg-warning a:hover
   09.css:658   color                  .bg-warning .nav > li > a
   09.css:660   color                  .bg-warning .nav > li:hover > a, .bg-warning .nav > li.active > a
   09.css:669   color                  .bg-warning .text-loud
   09.css:679   color                  .bg-danger
   09.css:681   color                  .bg-danger a:focus, .bg-danger a:hover
   09.css:682   color                  .bg-danger .nav > li > a
   09.css:684   color                  .bg-danger .nav > li:hover > a, .bg-danger .nav > li.active > a
   09.css:688   color                  .bg-danger .navbar-form .form-control
   09.css:693   color                  .bg-danger .text-loud
   09.css:699   color                  .bg-danger .flot-tick-label
   09.css:705   color                  .bg-amber a:focus, .bg-amber a:hover
   09.css:706   color                  .bg-amber .nav > li > a
   09.css:708   color                  .bg-amber .nav > li:hover > a, .bg-amber .nav > li.active > a
   09.css:717   color                  .bg-amber .text-loud
   09.css:729   color                  .bg-pink a:focus, .bg-pink a:hover
   09.css:730   color                  .bg-pink .nav > li > a
   09.css:732   color                  .bg-pink .nav > li:hover > a, .bg-pink .nav > li.active > a
   09.css:741   color                  .bg-pink .text-loud
   09.css:756   color                  .bg-purple .nav > li:hover > a, .bg-purple .nav > li.active > a
   09.css:777   color                  .bg-orange a:focus, .bg-orange a:hover
   09.css:778   color                  .bg-orange .nav > li > a
   09.css:780   color                  .bg-orange .nav > li:hover > a, .bg-orange .nav > li.active > a
   09.css:789   color                  .bg-orange .text-loud
   09.css:986   color                  .text-white
   09.css:987   color                  a.text-white
   09.css:1063  color                  .list-icon div:hover
   09.css:1091  color                  .alert-purple
   09.css:1094  color                  .alert-amber
   09.css:1097  color                  .alert-pink
   09.css:1100  color                  .alert-inverse
   09.css:1103  color                  .alert-orange
   09.css:1139  color                  .title
   09.css:1189  background-color       object#webcam
   09.css:1202  color                  #clockdiv
   09.css:1208  outline                .videoChatAuto
   09.css:1211  color                  .videChatLabel
   09.css:1213  color                  .highlighted
   09.css:1240  color                  .gutter
=== transparent  (39 uses)
   09.css:82    border-color           .search-form .form-control
   09.css:83    border-color           .search-form .input-group-addon
   09.css:83    background-color       .search-form .input-group-addon
   09.css:193   background-color       .sidebar-subnav > .sidebar-subnav-header > a
   09.css:244   border-color           #loading-bar-spinner .spinner-icon
   09.css:244   border-color           #loading-bar-spinner .spinner-icon
   09.css:269   background-color       .settings-wrapper.visible .settings-button
   09.css:289   background-color       .switch span
   09.css:312   background             .input-huge
   09.css:336   border-color           .btn-amber
   09.css:339   border-color           .btn-amber.disabled, .btn-amber[disabled], fieldset[disabled] .btn-amber, .btn-amber.disabled:hover, .btn-amber[disabled]:hover, fieldset[disabled] .b
   09.css:341   border-color           .btn-purple
   09.css:344   border-color           .btn-purple.disabled, .btn-purple[disabled], fieldset[disabled] .btn-purple, .btn-purple.disabled:hover, .btn-purple[disabled]:hover, fieldset[disable
   09.css:346   border-color           .btn-pink
   09.css:349   border-color           .btn-pink.disabled, .btn-pink[disabled], fieldset[disabled] .btn-pink, .btn-pink.disabled:hover, .btn-pink[disabled]:hover, fieldset[disabled] .btn-pi
   09.css:351   border-color           .btn-orange
   09.css:354   border-color           .btn-orange.disabled, .btn-orange[disabled], fieldset[disabled] .btn-orange, .btn-orange.disabled:hover, .btn-orange[disabled]:hover, fieldset[disable
   09.css:356   background-color       .btn-outline
   09.css:364   background             .btn-label
   09.css:435   background-color       .bg-gray .sidebar-subnav > li.active > a
   09.css:457   background-color       .bg-gray-darker .sidebar-subnav > li.active > a
   09.css:479   background-color       .bg-gray-dark .sidebar-subnav > li.active > a
   09.css:501   background-color       .bg-gray-light .sidebar-subnav > li.active > a
   09.css:523   background-color       .bg-gray-lighter .sidebar-subnav > li.active > a
   09.css:545   background-color       #bg-white .sidebar-subnav > li.active > a, .bg-white .sidebar-subnav > li.active > a
   09.css:567   background-color       .bg-inverse .sidebar-subnav > li.active > a
   09.css:591   background-color       .bg-primary .sidebar-subnav > li.active > a
   09.css:615   background-color       .bg-success .sidebar-subnav > li.active > a
   09.css:639   background-color       .bg-info .sidebar-subnav > li.active > a
   09.css:663   background-color       .bg-warning .sidebar-subnav > li.active > a
   09.css:687   background-color       .bg-danger .sidebar-subnav > li.active > a
   09.css:711   background-color       .bg-amber .sidebar-subnav > li.active > a
   09.css:735   background-color       .bg-pink .sidebar-subnav > li.active > a
   09.css:759   background-color       .bg-purple .sidebar-subnav > li.active > a
   09.css:783   background-color       .bg-orange .sidebar-subnav > li.active > a
   09.css:799   background-color       .bg-transparent
   09.css:1258  border-color           #filesDrive .dropdown-menu::after
   09.css:1258  border-color           #filesDrive .dropdown-menu::after
   09.css:1258  border-color           #filesDrive .dropdown-menu::after
=== rgb(0, 0, 0)  (29 uses)
   09.css:33    box-shadow             .form-control
   09.css:44    box-shadow             .progress
   09.css:45    box-shadow             .progress .progress-bar
   09.css:46    box-shadow             .popover
   09.css:322   box-shadow             .btn.btn-link
   09.css:326   box-shadow             .btn.disabled, .btn[disabled], fieldset[disabled] .btn, .btn.disabled:hover, .btn[disabled]:hover, fieldset[disabled] .btn:hover, .btn.disabled:focus,
   09.css:358   box-shadow             .btn-flat
   09.css:444   color                  .bg-gray
   09.css:466   color                  .bg-gray-darker
   09.css:488   color                  .bg-gray-dark
   09.css:510   color                  .bg-gray-light
   09.css:532   color                  .bg-gray-lighter
   09.css:554   color                  #bg-white, .bg-white
   09.css:576   color                  .bg-inverse
   09.css:583   background-color       .bg-primary
   09.css:600   color                  .bg-primary
   09.css:624   color                  .bg-success
   09.css:648   color                  .bg-info
   09.css:672   color                  .bg-warning
   09.css:696   color                  .bg-danger
   09.css:720   color                  .bg-amber
   09.css:744   color                  .bg-pink
   09.css:768   color                  .bg-purple
   09.css:792   color                  .bg-orange
   09.css:970   box-shadow             .shadow-clear, .no-shadow
   09.css:1158  border                 li.chatUpvoted.light
   09.css:1201  background-color       input.form-control.dark, .btn.btn-default.dark
   09.css:1204  background             #clockdiv div > span
   09.css:1258  border-color           #filesDrive .dropdown-menu::after
=== rgb(54, 63, 69)  (23 uses)
   09.css:241   background             #loading-bar .bar
   09.css:242   box-shadow             #loading-bar .peg
   09.css:244   border-color           #loading-bar-spinner .spinner-icon
   09.css:244   border-color           #loading-bar-spinner .spinner-icon
   09.css:303   background-color       .switch-inverse.switch input:checked + span
   09.css:303   border-color           .switch-inverse.switch input:checked + span
   09.css:331   background-color       .btn-inverse
   09.css:331   border-color           .btn-inverse
   09.css:334   background-color       .btn-inverse.disabled, .btn-inverse[disabled], fieldset[disabled] .btn-inverse, .btn-inverse.disabled:hover, .btn-inverse[disabled]:hover, fieldset[di
   09.css:334   border-color           .btn-inverse.disabled, .btn-inverse[disabled], fieldset[disabled] .btn-inverse, .btn-inverse.disabled:hover, .btn-inverse[disabled]:hover, fieldset[di
   09.css:335   color                  .btn-inverse .badge
   09.css:559   background-color       .bg-inverse
   09.css:566   background-color       .bg-inverse .sidebar-subnav
   09.css:568   background-color       .bg-inverse .navbar-form .form-control
   09.css:902   border-right           .br-inverse
   09.css:903   border-left            .bl-inverse
   09.css:904   border-top             .bt-inverse
   09.css:905   border-bottom          .bb-inverse
   09.css:989   color                  .text-inverse
   09.css:990   color                  a.text-inverse
   09.css:1081  background-color       .label-inverse
   09.css:1100  background-color       .alert-inverse
   09.css:1100  border-color           .alert-inverse
=== rgb(160, 170, 178)  (19 uses)
   09.css:263   border                 .settings-wrapper > .settings-inner
   09.css:272   border                 .setting-color > label
   09.css:427   background-color       .bg-gray
   09.css:434   background-color       .bg-gray .sidebar-subnav
   09.css:436   background-color       .bg-gray .navbar-form .form-control
   09.css:503   color                  .bg-gray-light .navbar-form .form-control::-webkit-input-placeholder
   09.css:505   color                  .bg-gray-light .navbar-form .form-control-feedback, .bg-gray-light .navbar-form .input-group-addon
   09.css:506   color                  .bg-gray-light .text-muted
   09.css:512   color                  .bg-gray-light .help-block
   09.css:525   color                  .bg-gray-lighter .navbar-form .form-control::-webkit-input-placeholder
   09.css:527   color                  .bg-gray-lighter .navbar-form .form-control-feedback, .bg-gray-lighter .navbar-form .input-group-addon
   09.css:528   color                  .bg-gray-lighter .text-muted
   09.css:534   color                  .bg-gray-lighter .help-block
   09.css:918   border-right           .br-gray
   09.css:919   border-left            .bl-gray
   09.css:920   border-top             .bt-gray
   09.css:921   border-bottom          .bb-gray
   09.css:1016  color                  .text-gray
   09.css:1017  color                  a.text-gray
=== rgb(102, 57, 182)  (18 uses)
   09.css:306   background-color       .switch-purple.switch input:checked + span
   09.css:306   border-color           .switch-purple.switch input:checked + span
   09.css:341   background-color       .btn-purple
   09.css:344   background-color       .btn-purple.disabled, .btn-purple[disabled], fieldset[disabled] .btn-purple, .btn-purple.disabled:hover, .btn-purple[disabled]:hover, fieldset[disable
   09.css:345   color                  .btn-purple .badge
   09.css:404   background-color       body .toast-wait
   09.css:751   background-color       .bg-purple
   09.css:758   background-color       .bg-purple .sidebar-subnav
   09.css:760   background-color       .bg-purple .navbar-form .form-control
   09.css:898   border-right           .br-purple
   09.css:899   border-left            .bl-purple
   09.css:900   border-top             .bt-purple
   09.css:901   border-bottom          .bb-purple
   09.css:998   color                  .text-purple
   09.css:999   color                  a.text-purple
   09.css:1087  background-color       .label-purple
   09.css:1091  background-color       .alert-purple
   09.css:1091  border-color           .alert-purple
=== rgb(230, 233, 238)  (17 uses)
   09.css:19    border-bottom-color    .page-header
   09.css:23    border                 .nav-tabs-alerts > li > a
   09.css:30    border-color           .tab-content
   09.css:46    border-color           .popover
   09.css:258   color                  .text-muted
   09.css:297   background-color       .switch input:disabled + span
   09.css:297   border-color           .switch input:disabled + span
   09.css:323   border-color           .btn.btn-default
   09.css:493   background-color       .bg-gray-light
   09.css:500   background-color       .bg-gray-light .sidebar-subnav
   09.css:502   background-color       .bg-gray-light .navbar-form .form-control
   09.css:922   border-right           .br-gray-light
   09.css:923   border-left            .bl-gray-light
   09.css:924   border-top             .bt-gray-light
   09.css:925   border-bottom          .bb-gray-light
   09.css:1019  color                  .text-gray-light
   09.css:1020  color                  a.text-gray-light
=== rgb(233, 30, 99)  (17 uses)
   09.css:305   background-color       .switch-pink.switch input:checked + span
   09.css:305   border-color           .switch-pink.switch input:checked + span
   09.css:346   background-color       .btn-pink
   09.css:349   background-color       .btn-pink.disabled, .btn-pink[disabled], fieldset[disabled] .btn-pink, .btn-pink.disabled:hover, .btn-pink[disabled]:hover, fieldset[disabled] .btn-pi
   09.css:350   color                  .btn-pink .badge
   09.css:727   background-color       .bg-pink
   09.css:734   background-color       .bg-pink .sidebar-subnav
   09.css:736   background-color       .bg-pink .navbar-form .form-control
   09.css:894   border-right           .br-pink
   09.css:895   border-left            .bl-pink
   09.css:896   border-top             .bt-pink
   09.css:897   border-bottom          .bb-pink
   09.css:995   color                  .text-pink
   09.css:996   color                  a.text-pink
   09.css:1085  background-color       .label-pink
   09.css:1097  background-color       .alert-pink
   09.css:1097  border-color           .alert-pink
=== rgb(236, 238, 238)  (17 uses)
   09.css:866   border-right           .br, .b
   09.css:867   border-left            .bl, .b
   09.css:868   border-top             .bt, .b
   09.css:869   border-bottom          .bb, .b
   09.css:940   border-right           .br-sm
   09.css:941   border-left            .bl-sm
   09.css:942   border-top             .bt-sm
   09.css:943   border-bottom          .bb-sm
   09.css:951   border-right           .br-md
   09.css:952   border-left            .bl-md
   09.css:953   border-top             .bt-md
   09.css:954   border-bottom          .bb-md
   09.css:962   border-right           .br-lg
   09.css:963   border-left            .bl-lg
   09.css:964   border-top             .bt-lg
   09.css:965   border-bottom          .bb-lg
   09.css:1169  border                 .chatHeader
=== rgb(254, 86, 33)  (17 uses)
   09.css:307   background-color       .switch-orange.switch input:checked + span
   09.css:307   border-color           .switch-orange.switch input:checked + span
   09.css:351   background-color       .btn-orange
   09.css:354   background-color       .btn-orange.disabled, .btn-orange[disabled], fieldset[disabled] .btn-orange, .btn-orange.disabled:hover, .btn-orange[disabled]:hover, fieldset[disable
   09.css:355   color                  .btn-orange .badge
   09.css:775   background-color       .bg-orange
   09.css:782   background-color       .bg-orange .sidebar-subnav
   09.css:784   background-color       .bg-orange .navbar-form .form-control
   09.css:906   border-right           .br-orange
   09.css:907   border-left            .bl-orange
   09.css:908   border-top             .bt-orange
   09.css:909   border-bottom          .bb-orange
   09.css:1007  color                  .text-orange
   09.css:1008  color                  a.text-orange
   09.css:1089  background-color       .label-orange
   09.css:1103  background-color       .alert-orange
   09.css:1103  border-color           .alert-orange
=== rgb(255, 193, 7)  (17 uses)
   09.css:304   background-color       .switch-amber.switch input:checked + span
   09.css:304   border-color           .switch-amber.switch input:checked + span
   09.css:336   background-color       .btn-amber
   09.css:339   background-color       .btn-amber.disabled, .btn-amber[disabled], fieldset[disabled] .btn-amber, .btn-amber.disabled:hover, .btn-amber[disabled]:hover, fieldset[disabled] .b
   09.css:340   color                  .btn-amber .badge
   09.css:703   background-color       .bg-amber
   09.css:710   background-color       .bg-amber .sidebar-subnav
   09.css:712   background-color       .bg-amber .navbar-form .form-control
   09.css:890   border-right           .br-amber
   09.css:891   border-left            .bl-amber
   09.css:892   border-top             .bt-amber
   09.css:893   border-bottom          .bb-amber
   09.css:1004  color                  .text-amber
   09.css:1005  color                  a.text-amber
   09.css:1083  background-color       .label-amber
   09.css:1094  background-color       .alert-amber
   09.css:1094  border-color           .alert-amber
=== rgb(29, 31, 33)  (15 uses)
   09.css:295   background-color       .switch input:checked + span
   09.css:295   border-color           .switch input:checked + span
   09.css:298   background-color       .switch-primary.switch input:checked + span
   09.css:298   border-color           .switch-primary.switch input:checked + span
   09.css:357   color                  .btn-outline:hover, .btn-outline:focus
   09.css:400   background-color       body .toast
   09.css:590   background-color       .bg-primary .sidebar-subnav
   09.css:592   background-color       .bg-primary .navbar-form .form-control
   09.css:870   border-right           .br-primary
   09.css:871   border-left            .bl-primary
   09.css:872   border-top             .bt-primary
   09.css:873   border-bottom          .bb-primary
   09.css:971   color                  .text-primary
   09.css:972   color                  a.text-primary
   09.css:1041  color                  .text-link:hover, .text-link:focus
=== rgb(32, 149, 242)  (14 uses)
   09.css:300   background-color       .switch-info.switch input:checked + span
   09.css:300   border-color           .switch-info.switch input:checked + span
   09.css:403   background-color       body .toast-info
   09.css:631   background-color       .bg-info
   09.css:638   background-color       .bg-info .sidebar-subnav
   09.css:640   background-color       .bg-info .navbar-form .form-control
   09.css:878   border-right           .br-info
   09.css:879   border-left            .bl-info
   09.css:880   border-top             .bt-info
   09.css:881   border-bottom          .bb-info
   09.css:983   color                  .text-info
   09.css:984   color                  a.text-info
   09.css:1063  background-color       .list-icon div:hover
   09.css:1153  color                  .chatQuestion
=== rgb(81, 93, 110)  (13 uses)
   09.css:471   background-color       .bg-gray-dark
   09.css:478   background-color       .bg-gray-dark .sidebar-subnav
   09.css:480   background-color       .bg-gray-dark .navbar-form .form-control
   09.css:539   color                  #bg-white a:focus, .bg-white a:focus, #bg-white a:hover, .bg-white a:hover
   09.css:540   color                  #bg-white .nav > li > a, .bg-white .nav > li > a
   09.css:914   border-right           .br-gray-dark
   09.css:915   border-left            .bl-gray-dark
   09.css:916   border-top             .bt-gray-dark
   09.css:917   border-bottom          .bb-gray-dark
   09.css:1013  color                  .text-gray-dark
   09.css:1014  color                  a.text-gray-dark
   09.css:1232  color                  .chatChannelTabs li.activeTab a
   09.css:1233  color                  .chatChannelTabs a:hover, .chatChannelTabs a:focus
=== rgb(243, 66, 53)  (12 uses)
   09.css:302   background-color       .switch-danger.switch input:checked + span
   09.css:302   border-color           .switch-danger.switch input:checked + span
   09.css:402   background-color       body .toast-error
   09.css:679   background-color       .bg-danger
   09.css:686   background-color       .bg-danger .sidebar-subnav
   09.css:688   background-color       .bg-danger .navbar-form .form-control
   09.css:886   border-right           .br-danger
   09.css:887   border-left            .bl-danger
   09.css:888   border-top             .bt-danger
   09.css:889   border-bottom          .bb-danger
   09.css:980   color                  .text-danger
   09.css:981   color                  a.text-danger
=== rgb(244, 245, 245)  (12 uses)
   09.css:20    border                 .jumbotron
   09.css:23    background-color       .nav-tabs-alerts > li > a
   09.css:100   border-top             .app-container > footer
   09.css:515   background-color       .bg-gray-lighter
   09.css:522   background-color       .bg-gray-lighter .sidebar-subnav
   09.css:524   background-color       .bg-gray-lighter .navbar-form .form-control
   09.css:926   border-right           .br-gray-lighter
   09.css:927   border-left            .bl-gray-lighter
   09.css:928   border-top             .bt-gray-lighter
   09.css:929   border-bottom          .bb-gray-lighter
   09.css:1022  color                  .text-gray-lighter
   09.css:1023  color                  a.text-gray-lighter
=== rgb(254, 151, 0)  (12 uses)
   09.css:301   background-color       .switch-warning.switch input:checked + span
   09.css:301   border-color           .switch-warning.switch input:checked + span
   09.css:405   background-color       body .toast-warning
   09.css:655   background-color       .bg-warning
   09.css:662   background-color       .bg-warning .sidebar-subnav
   09.css:664   background-color       .bg-warning .navbar-form .form-control
   09.css:882   border-right           .br-warning
   09.css:883   border-left            .bl-warning
   09.css:884   border-top             .bt-warning
   09.css:885   border-bottom          .bb-warning
   09.css:977   color                  .text-warning
   09.css:978   color                  a.text-warning
=== rgb(76, 175, 80)  (12 uses)
   09.css:299   background-color       .switch-success.switch input:checked + span
   09.css:299   border-color           .switch-success.switch input:checked + span
   09.css:401   background-color       body .toast-success
   09.css:607   background-color       .bg-success
   09.css:614   background-color       .bg-success .sidebar-subnav
   09.css:616   background-color       .bg-success .navbar-form .form-control
   09.css:874   border-right           .br-success
   09.css:875   border-left            .bl-success
   09.css:876   border-top             .bt-success
   09.css:877   border-bottom          .bb-success
   09.css:974   color                  .text-success
   09.css:975   color                  a.text-success
=== rgb(131, 148, 169)  (11 uses)
   09.css:111   color                  .app-view-header > small
   09.css:265   color                  .settings-wrapper > .settings-inner .settings-button > em
   09.css:547   color                  #bg-white .navbar-form .form-control::-webkit-input-placeholder, .bg-white .navbar-form .form-control::-webkit-input-placeholder
   09.css:549   color                  #bg-white .navbar-form .form-control-feedback, .bg-white .navbar-form .form-control-feedback, #bg-white .navbar-form .input-group-addon, .bg-white .na
   09.css:550   color                  #bg-white .text-muted, .bg-white .text-muted
   09.css:556   color                  #bg-white .help-block, .bg-white .help-block
   09.css:930   border-right           .br-muted
   09.css:931   border-left            .bl-muted
   09.css:932   border-top             .bt-muted
   09.css:933   border-bottom          .bb-muted
   09.css:1124  color                  .chat li .chat-body p
=== rgb(88, 95, 105)  (11 uses)
   09.css:23    color                  .nav-tabs-alerts > li > a
   09.css:493   color                  .bg-gray-light
   09.css:502   color                  .bg-gray-light .navbar-form .form-control
   09.css:513   color                  .bg-gray-light .flot-tick-label
   09.css:515   color                  .bg-gray-lighter
   09.css:524   color                  .bg-gray-lighter .navbar-form .form-control
   09.css:535   color                  .bg-gray-lighter .flot-tick-label
   09.css:537   color                  #bg-white, .bg-white
   09.css:546   color                  #bg-white .navbar-form .form-control, .bg-white .navbar-form .form-control
   09.css:557   color                  #bg-white .flot-tick-label, .bg-white .flot-tick-label
   09.css:1040  color                  .text-link
=== rgba(0, 0, 0, 0.23)  (10 uses)
   09.css:20    box-shadow             .jumbotron
   09.css:22    box-shadow             .well
   09.css:263   box-shadow             .settings-wrapper > .settings-inner
   09.css:264   box-shadow             .settings-wrapper > .settings-inner .settings-button
   09.css:325   box-shadow             .btn:active, .btn.active, .btn:hover, .btn:focus
   09.css:327   box-shadow             .btn-group.open .dropdown-toggle
   09.css:330   box-shadow             .btn-image:hover, .btn-image:focus
   09.css:1116  box-shadow             .shadow-z2
   09.css:1117  box-shadow             .shadow-z2-hover
   09.css:1118  box-shadow             .shadow-z3
=== rgb(43, 61, 81)  (9 uses)
   09.css:449   background-color       .bg-gray-darker
   09.css:456   background-color       .bg-gray-darker .sidebar-subnav
   09.css:458   background-color       .bg-gray-darker .navbar-form .form-control
   09.css:910   border-right           .br-gray-darker
   09.css:911   border-left            .bl-gray-darker
   09.css:912   border-top             .bt-gray-darker
   09.css:913   border-bottom          .bb-gray-darker
   09.css:1010  color                  .text-gray-darker
   09.css:1011  color                  a.text-gray-darker
=== rgba(0, 0, 0, 0.16)  (8 uses)
   09.css:20    box-shadow             .jumbotron
   09.css:22    box-shadow             .well
   09.css:263   box-shadow             .settings-wrapper > .settings-inner
   09.css:264   box-shadow             .settings-wrapper > .settings-inner .settings-button
   09.css:325   box-shadow             .btn:active, .btn.active, .btn:hover, .btn:focus
   09.css:327   box-shadow             .btn-group.open .dropdown-toggle
   09.css:330   box-shadow             .btn-image:hover, .btn-image:focus
   09.css:1116  box-shadow             .shadow-z2
=== rgba(0, 0, 0, 0.5)  (7 uses)
   09.css:1001  color                  .text-alpha-inverse
   09.css:1002  color                  a.text-alpha-inverse
   09.css:1135  border-top             .chatToolbar
   09.css:1135  border-right-color     .chatToolbar
   09.css:1135  border-bottom-color    .chatToolbar
   09.css:1135  border-left-color      .chatToolbar
   09.css:1187  background             #webcamCamDiv
=== rgb(233, 236, 237)  (6 uses)
   09.css:437   color                  .bg-gray .navbar-form .form-control::-webkit-input-placeholder
   09.css:439   color                  .bg-gray .navbar-form .form-control-feedback, .bg-gray .navbar-form .input-group-addon
   09.css:440   color                  .bg-gray .text-muted
   09.css:446   color                  .bg-gray .help-block
   09.css:507   color                  .bg-gray-light .text-loud
   09.css:529   color                  .bg-gray-lighter .text-loud
=== rgb(230, 230, 230)  (5 uses)
   09.css:1093  color                  .alert-purple .alert-link
   09.css:1096  color                  .alert-amber .alert-link
   09.css:1099  color                  .alert-pink .alert-link
   09.css:1102  color                  .alert-inverse .alert-link
   09.css:1105  color                  .alert-orange .alert-link
=== black  (4 uses)
   09.css:1163  color                  .filter-strong
   09.css:1195  background-color       .dark
   09.css:1197  background-color       div.l-row.dark
   09.css:1236  color                  .badge-warning
=== rgb(112, 131, 143)  (4 uses)
   09.css:569   color                  .bg-inverse .navbar-form .form-control::-webkit-input-placeholder
   09.css:571   color                  .bg-inverse .navbar-form .form-control-feedback, .bg-inverse .navbar-form .input-group-addon
   09.css:572   color                  .bg-inverse .text-muted
   09.css:578   color                  .bg-inverse .help-block
=== rgb(145, 146, 147)  (4 uses)
   09.css:495   color                  .bg-gray-light a:focus, .bg-gray-light a:hover
   09.css:496   color                  .bg-gray-light .nav > li > a
   09.css:517   color                  .bg-gray-lighter a:focus, .bg-gray-lighter a:hover
   09.css:518   color                  .bg-gray-lighter .nav > li > a
=== rgb(148, 159, 176)  (4 uses)
   09.css:481   color                  .bg-gray-dark .navbar-form .form-control::-webkit-input-placeholder
   09.css:483   color                  .bg-gray-dark .navbar-form .form-control-feedback, .bg-gray-dark .navbar-form .input-group-addon
   09.css:484   color                  .bg-gray-dark .text-muted
   09.css:490   color                  .bg-gray-dark .help-block
=== rgb(157, 209, 249)  (4 uses)
   09.css:641   color                  .bg-info .navbar-form .form-control::-webkit-input-placeholder
   09.css:643   color                  .bg-info .navbar-form .form-control-feedback, .bg-info .navbar-form .input-group-addon
   09.css:644   color                  .bg-info .text-muted
   09.css:650   color                  .bg-info .help-block
=== rgb(167, 217, 169)  (4 uses)
   09.css:617   color                  .bg-success .navbar-form .form-control::-webkit-input-placeholder
   09.css:619   color                  .bg-success .navbar-form .form-control-feedback, .bg-success .navbar-form .input-group-addon
   09.css:620   color                  .bg-success .text-muted
   09.css:626   color                  .bg-success .help-block
=== rgb(176, 150, 222)  (4 uses)
   09.css:761   color                  .bg-purple .navbar-form .form-control::-webkit-input-placeholder
   09.css:763   color                  .bg-purple .navbar-form .form-control-feedback, .bg-purple .navbar-form .input-group-addon
   09.css:764   color                  .bg-purple .text-muted
   09.css:770   color                  .bg-purple .help-block
=== rgb(245, 151, 183)  (4 uses)
   09.css:737   color                  .bg-pink .navbar-form .form-control::-webkit-input-placeholder
   09.css:739   color                  .bg-pink .navbar-form .form-control-feedback, .bg-pink .navbar-form .input-group-addon
   09.css:740   color                  .bg-pink .text-muted
   09.css:746   color                  .bg-pink .help-block
=== rgb(250, 183, 178)  (4 uses)
   09.css:689   color                  .bg-danger .navbar-form .form-control::-webkit-input-placeholder
   09.css:691   color                  .bg-danger .navbar-form .form-control-feedback, .bg-danger .navbar-form .input-group-addon
   09.css:692   color                  .bg-danger .text-muted
   09.css:698   color                  .bg-danger .help-block
=== rgb(255, 186, 165)  (4 uses)
   09.css:785   color                  .bg-orange .navbar-form .form-control::-webkit-input-placeholder
   09.css:787   color                  .bg-orange .navbar-form .form-control-feedback, .bg-orange .navbar-form .input-group-addon
   09.css:788   color                  .bg-orange .text-muted
   09.css:794   color                  .bg-orange .help-block
=== rgb(255, 205, 132)  (4 uses)
   09.css:665   color                  .bg-warning .navbar-form .form-control::-webkit-input-placeholder
   09.css:667   color                  .bg-warning .navbar-form .form-control-feedback, .bg-warning .navbar-form .input-group-addon
   09.css:668   color                  .bg-warning .text-muted
   09.css:674   color                  .bg-warning .help-block
=== rgb(255, 226, 140)  (4 uses)
   09.css:713   color                  .bg-amber .navbar-form .form-control::-webkit-input-placeholder
   09.css:715   color                  .bg-amber .navbar-form .form-control-feedback, .bg-amber .navbar-form .input-group-addon
   09.css:716   color                  .bg-amber .text-muted
   09.css:722   color                  .bg-amber .help-block
=== rgb(89, 126, 167)  (4 uses)
   09.css:459   color                  .bg-gray-darker .navbar-form .form-control::-webkit-input-placeholder
   09.css:461   color                  .bg-gray-darker .navbar-form .form-control-feedback, .bg-gray-darker .navbar-form .input-group-addon
   09.css:462   color                  .bg-gray-darker .text-muted
   09.css:468   color                  .bg-gray-darker .help-block
=== rgb(91, 97, 104)  (4 uses)
   09.css:593   color                  .bg-primary .navbar-form .form-control::-webkit-input-placeholder
   09.css:595   color                  .bg-primary .navbar-form .form-control-feedback, .bg-primary .navbar-form .input-group-addon
   09.css:596   color                  .bg-primary .text-muted
   09.css:602   color                  .bg-primary .help-block
=== rgba(0, 0, 0, 0)  (4 uses)
   09.css:337   border-color           .btn-amber:hover, .btn-amber:focus, .btn-amber.focus, .btn-amber:active, .btn-amber.active, .open > .dropdown-toggle.btn-amber
   09.css:342   border-color           .btn-purple:hover, .btn-purple:focus, .btn-purple.focus, .btn-purple:active, .btn-purple.active, .open > .dropdown-toggle.btn-purple
   09.css:347   border-color           .btn-pink:hover, .btn-pink:focus, .btn-pink.focus, .btn-pink:active, .btn-pink.active, .open > .dropdown-toggle.btn-pink
   09.css:352   border-color           .btn-orange:hover, .btn-orange:focus, .btn-orange.focus, .btn-orange:active, .btn-orange.active, .open > .dropdown-toggle.btn-orange
=== rgba(0, 0, 0, 0.12)  (4 uses)
   09.css:172   box-shadow             .layout-material .app-container > section > .app
   09.css:172   box-shadow             .layout-material .app-container > section > .app
   09.css:1115  box-shadow             .shadow-z1
   09.css:1115  box-shadow             .shadow-z1
=== white  (4 uses)
   09.css:76    color                  .topnavbar .sidebar-toggle, .topnavbar .menu-toggle
   09.css:1183  color                  .vertDivider
   09.css:1195  color                  .dark
   09.css:1253  color                  .hasMobileApp
=== rgb(133, 141, 148)  (3 uses)
   09.css:583   color                  .bg-primary
   09.css:592   color                  .bg-primary .navbar-form .form-control
   09.css:603   color                  .bg-primary .flot-tick-label
=== rgb(146, 170, 197)  (3 uses)
   09.css:449   color                  .bg-gray-darker
   09.css:458   color                  .bg-gray-darker .navbar-form .form-control
   09.css:469   color                  .bg-gray-darker .flot-tick-label
=== rgb(158, 164, 169)  (3 uses)
   09.css:585   color                  .bg-primary a:focus, .bg-primary a:hover
   09.css:586   color                  .bg-primary .nav > li > a
   09.css:597   color                  .bg-primary .text-loud
=== rgb(161, 173, 181)  (3 uses)
   09.css:559   color                  .bg-inverse
   09.css:568   color                  .bg-inverse .navbar-form .form-control
   09.css:579   color                  .bg-inverse .flot-tick-label
=== rgb(176, 194, 213)  (3 uses)
   09.css:451   color                  .bg-gray-darker a:focus, .bg-gray-darker a:hover
   09.css:452   color                  .bg-gray-darker .nav > li > a
   09.css:463   color                  .bg-gray-darker .text-loud
=== rgb(187, 196, 202)  (3 uses)
   09.css:561   color                  .bg-inverse a:focus, .bg-inverse a:hover
   09.css:562   color                  .bg-inverse .nav > li > a
   09.css:573   color                  .bg-inverse .text-loud
=== rgb(198, 204, 213)  (3 uses)
   09.css:471   color                  .bg-gray-dark
   09.css:480   color                  .bg-gray-dark .navbar-form .form-control
   09.css:491   color                  .bg-gray-dark .flot-tick-label
=== rgb(224, 227, 232)  (3 uses)
   09.css:473   color                  .bg-gray-dark a:focus, .bg-gray-dark a:hover
   09.css:474   color                  .bg-gray-dark .nav > li > a
   09.css:485   color                  .bg-gray-dark .text-loud
=== rgb(225, 216, 243)  (3 uses)
   09.css:751   color                  .bg-purple
   09.css:760   color                  .bg-purple .navbar-form .form-control
   09.css:771   color                  .bg-purple .flot-tick-label
=== rgb(227, 243, 228)  (3 uses)
   09.css:607   color                  .bg-success
   09.css:616   color                  .bg-success .navbar-form .form-control
   09.css:627   color                  .bg-success .flot-tick-label
=== rgb(232, 232, 232)  (3 uses)
   09.css:1229  border-bottom          .chat-top
   09.css:1232  background-color       .chatChannelTabs li.activeTab a
   09.css:1233  background-color       .chatChannelTabs a:hover, .chatChannelTabs a:focus
=== rgb(238, 238, 238)  (3 uses)
   09.css:37    border-bottom          fieldset
   09.css:46    border-color           .popover
   09.css:46    border-color           .popover
=== rgb(239, 247, 254)  (3 uses)
   09.css:631   color                  .bg-info
   09.css:640   color                  .bg-info .navbar-form .form-control
   09.css:651   color                  .bg-info .flot-tick-label
=== rgb(250, 250, 250)  (3 uses)
   09.css:62    color                  .topnavbar > .navbar-header > .navbar-brand
   09.css:519   background-color       .bg-gray-lighter .nav > li.active
   09.css:1215  border                 .whiteborder
=== rgb(252, 251, 254)  (3 uses)
   09.css:753   color                  .bg-purple a:focus, .bg-purple a:hover
   09.css:754   color                  .bg-purple .nav > li > a
   09.css:765   color                  .bg-purple .text-loud
=== rgb(253, 230, 238)  (3 uses)
   09.css:727   color                  .bg-pink
   09.css:736   color                  .bg-pink .navbar-form .form-control
   09.css:747   color                  .bg-pink .flot-tick-label
=== rgb(255, 240, 218)  (3 uses)
   09.css:655   color                  .bg-warning
   09.css:664   color                  .bg-warning .navbar-form .form-control
   09.css:675   color                  .bg-warning .flot-tick-label
=== rgb(255, 248, 226)  (3 uses)
   09.css:703   color                  .bg-amber
   09.css:712   color                  .bg-amber .navbar-form .form-control
   09.css:723   color                  .bg-amber .flot-tick-label
=== rgb(255, 252, 251)  (3 uses)
   09.css:775   color                  .bg-orange
   09.css:784   color                  .bg-orange .navbar-form .form-control
   09.css:795   color                  .bg-orange .flot-tick-label
=== rgba(255, 255, 255, 0.5)  (3 uses)
   09.css:409   color                  .layer-morph-close > em
   09.css:992   color                  .text-alpha
   09.css:993   color                  a.text-alpha
=== yellow  (3 uses)
   09.css:1142  border                 .avatarChooser:hover
   09.css:1154  background-color       .chatHighighted
   09.css:1155  background-color       .privchatHighighted
=== currentcolor  (2 uses)
   09.css:1199  border-color           div.chatHeader.dark
   09.css:1200  border-color           div.p.bt.dark
=== rgb(0, 0, 255)  (2 uses)
   09.css:1129  color                  .chat-msg-txt a:hover
   09.css:1131  color                  .dark .chat-msg-txt a:hover
=== rgb(133, 142, 154)  (2 uses)
   09.css:538   color                  #bg-white a, .bg-white a
   09.css:1231  color                  .chatChannelTabs a
=== rgb(136, 136, 136)  (2 uses)
   09.css:1199  color                  div.chatHeader.dark
   09.css:1200  color                  div.p.bt.dark
=== rgb(158, 159, 160)  (2 uses)
   09.css:498   color                  .bg-gray-light .nav > li:hover > a, .bg-gray-light .nav > li.active > a
   09.css:520   color                  .bg-gray-lighter .nav > li:hover > a, .bg-gray-lighter .nav > li.active > a
=== rgb(2, 90, 168)  (2 uses)
   09.css:1130  color                  .chat-msg-txt a:visited, .chat-msg-txt a:link
   09.css:1219  border-color           .drop-area-alert.highlight, .drop-area.highlight
=== rgb(225, 225, 225)  (2 uses)
   09.css:86    border-top             .nav-wrapper .navbar-nav .open .dropdown-menu
   09.css:86    border-bottom          .nav-wrapper .navbar-nav .open .dropdown-menu
=== rgb(241, 241, 241)  (2 uses)
   09.css:44    border                 .progress
   09.css:1219  background-color       .drop-area-alert.highlight, .drop-area.highlight
=== rgb(255, 204, 0)  (2 uses)
   09.css:1235  color                  .private-chat-label
   09.css:1236  background-color       .badge-warning
=== rgb(29, 41, 54)  (2 uses)
   09.css:455   background-color       .bg-gray-darker .nav > li:hover > a, .bg-gray-darker .nav > li.active > a
   09.css:1218  border                 .drop-area-alert, .drop-area
=== rgb(36, 42, 46)  (2 uses)
   09.css:332   border-color           .btn-inverse:hover, .btn-inverse:focus, .btn-inverse.focus, .btn-inverse:active, .btn-inverse.active, .open > .dropdown-toggle.btn-inverse
   09.css:565   background-color       .bg-inverse .nav > li:hover > a, .bg-inverse .nav > li.active > a
=== rgb(45, 53, 58)  (2 uses)
   09.css:332   background-color       .btn-inverse:hover, .btn-inverse:focus, .btn-inverse.focus, .btn-inverse:active, .btn-inverse.active, .open > .dropdown-toggle.btn-inverse
   09.css:563   background-color       .bg-inverse .nav > li.active
=== rgb(51, 51, 51)  (2 uses)
   09.css:1208  background             .videoChatAuto
   09.css:1209  background             .videoChatAutoSM
=== rgb(72, 72, 72)  (2 uses)
   09.css:1199  background-color       div.chatHeader.dark
   09.css:1200  background-color       div.p.bt.dark
=== rgb(93, 52, 166)  (2 uses)
   09.css:342   background-color       .btn-purple:hover, .btn-purple:focus, .btn-purple.focus, .btn-purple:active, .btn-purple.active, .open > .dropdown-toggle.btn-purple
   09.css:755   background-color       .bg-purple .nav > li.active
=== rgba(0, 0, 0, 0.1)  (2 uses)
   09.css:366   background             .btn-label::after
   09.css:1211  background-color       .videChatLabel
=== rgba(0, 0, 0, 0.14)  (2 uses)
   09.css:97    box-shadow             .app-container > header
   09.css:98    box-shadow             .app-container > aside
=== rgba(0, 0, 0, 0.15)  (2 uses)
   09.css:180   border-top-color       .sidebar-wrapper hr
   09.css:396   background-color       .slimScrollRail
=== rgba(0, 0, 0, 0.19)  (2 uses)
   09.css:1117  box-shadow             .shadow-z2-hover
   09.css:1118  box-shadow             .shadow-z3
=== rgba(0, 0, 0, 0.22)  (2 uses)
   09.css:1119  box-shadow             .shadow-z4
   09.css:1120  box-shadow             .shadow-z5
=== rgba(0, 0, 0, 0.25)  (2 uses)
   09.css:289   box-shadow             .switch span
   09.css:1119  box-shadow             .shadow-z4
=== rgba(0, 0, 0, 0.28)  (2 uses)
   09.css:97    box-shadow             .app-container > header
   09.css:98    box-shadow             .app-container > aside
=== rgba(160, 170, 178, 0.15)  (2 uses)
   09.css:504   border-bottom          .ie9 .bg-gray-light .navbar-form .form-control
   09.css:526   border-bottom          .ie9 .bg-gray-lighter .navbar-form .form-control
=== rgba(160, 170, 178, 0.26)  (2 uses)
   09.css:514   border-top-color       .bg-gray-light hr
   09.css:536   border-top-color       .bg-gray-lighter hr
=== rgba(255, 255, 255, 0.7)  (2 uses)
   09.css:988   color                  a.text-white:hover, a.text-white:focus
   09.css:994   color                  a.text-alpha:hover, a.text-alpha:focus
=== rgb(0, 191, 150)  (1 uses)
   09.css:1203  background             #clockdiv > div
=== rgb(10, 10, 10)  (1 uses)
   09.css:1194  color                  .editable-click, a.editable-click
=== rgb(10, 11, 11)  (1 uses)
   09.css:589   background-color       .bg-primary .nav > li:hover > a, .bg-primary .nav > li.active > a
=== rgb(117, 72, 198)  (1 uses)
   09.css:773   background-color       .bg-purple.bg-light
=== rgb(119, 124, 129)  (1 uses)
   09.css:584   color                  .bg-primary a
=== rgb(13, 128, 220)  (1 uses)
   09.css:637   background-color       .bg-info .nav > li:hover > a, .bg-info .nav > li.active > a
=== rgb(13, 134, 230)  (1 uses)
   09.css:654   background-color       .bg-info.bg-dark
=== rgb(136, 154, 173)  (1 uses)
   09.css:450   color                  .bg-gray-darker a
=== rgb(137, 150, 160)  (1 uses)
   09.css:433   background-color       .bg-gray .nav > li:hover > a, .bg-gray .nav > li.active > a
=== rgb(147, 156, 162)  (1 uses)
   09.css:560   color                  .bg-inverse a
=== rgb(149, 160, 169)  (1 uses)
   09.css:431   background-color       .bg-gray .nav > li.active
=== rgb(15, 16, 17)  (1 uses)
   09.css:606   background-color       .bg-primary.bg-dark
=== rgb(161, 162, 163)  (1 uses)
   09.css:49    color                  .dropdown-header
=== rgb(171, 172, 174)  (1 uses)
   09.css:494   color                  .bg-gray-light a
=== rgb(171, 176, 181)  (1 uses)
   09.css:588   color                  .bg-primary .nav > li:hover > a, .bg-primary .nav > li.active > a
=== rgb(175, 176, 176)  (1 uses)
   09.css:516   color                  .bg-gray-lighter a
=== rgb(176, 176, 176)  (1 uses)
   09.css:1166  border-bottom          .smChatLi .isAdm
=== rgb(181, 187, 196)  (1 uses)
   09.css:472   color                  .bg-gray-dark a
=== rgb(188, 223, 251)  (1 uses)
   09.css:632   color                  .bg-info a
=== rgb(19, 21, 22)  (1 uses)
   09.css:587   background-color       .bg-primary .nav > li.active
=== rgb(193, 19, 78)  (1 uses)
   09.css:1086  background-color       .label-pink[href]:hover, .label-pink[href]:focus
=== rgb(193, 207, 222)  (1 uses)
   09.css:454   color                  .bg-gray-darker .nav > li:hover > a, .bg-gray-darker .nav > li.active > a
=== rgb(201, 208, 213)  (1 uses)
   09.css:564   color                  .bg-inverse .nav > li:hover > a, .bg-inverse .nav > li.active > a
=== rgb(201, 231, 203)  (1 uses)
   09.css:608   color                  .bg-success a
=== rgb(202, 20, 82)  (1 uses)
   09.css:733   background-color       .bg-pink .nav > li:hover > a, .bg-pink .nav > li.active > a
=== rgb(207, 193, 232)  (1 uses)
   09.css:752   color                  .bg-purple a
=== rgb(208, 208, 208)  (1 uses)
   09.css:1198  color                  div.l-row.dark a
=== rgb(209, 210, 211)  (1 uses)
   09.css:383   background-color       [ripple] > .ripple > .angular-ripple
=== rgb(209, 216, 223)  (1 uses)
   09.css:551   color                  #bg-white .text-loud, .bg-white .text-loud
=== rgb(211, 158, 0)  (1 uses)
   09.css:1084  background-color       .label-amber[href]:hover, .label-amber[href]:focus
=== rgb(212, 21, 86)  (1 uses)
   09.css:750   background-color       .bg-pink.bg-dark
=== rgb(213, 127, 0)  (1 uses)
   09.css:661   background-color       .bg-warning .nav > li:hover > a, .bg-warning .nav > li.active > a
=== rgb(216, 21, 87)  (1 uses)
   09.css:1098  border-top-color       .alert-pink hr
=== rgb(218, 25, 90)  (1 uses)
   09.css:731   background-color       .bg-pink .nav > li.active
=== rgb(219, 217, 217)  (1 uses)
   09.css:34    border-color           .form-control, .input-group-addon
=== rgb(22, 139, 231)  (1 uses)
   09.css:635   background-color       .bg-info .nav > li.active
=== rgb(221, 166, 0)  (1 uses)
   09.css:709   background-color       .bg-amber .nav > li:hover > a, .bg-amber .nav > li.active > a
=== rgb(221, 22, 89)  (1 uses)
   09.css:347   background-color       .btn-pink:hover, .btn-pink:focus, .btn-pink.focus, .btn-pink:active, .btn-pink.active, .open > .dropdown-toggle.btn-pink
=== rgb(221, 221, 221)  (1 uses)
   09.css:290   border                 .switch span::after
=== rgb(223, 133, 0)  (1 uses)
   09.css:678   background-color       .bg-warning.bg-dark
=== rgb(224, 224, 224)  (1 uses)
   09.css:1197  color                  div.l-row.dark
=== rgb(227, 230, 232)  (1 uses)
   09.css:428   color                  .bg-gray a
=== rgb(231, 174, 0)  (1 uses)
   09.css:726   background-color       .bg-amber.bg-dark
=== rgb(234, 139, 0)  (1 uses)
   09.css:659   background-color       .bg-warning .nav > li.active
=== rgb(235, 57, 1)  (1 uses)
   09.css:1090  background-color       .label-orange[href]:hover, .label-orange[href]:focus
=== rgb(236, 177, 0)  (1 uses)
   09.css:1095  border-top-color       .alert-amber hr
=== rgb(236, 58, 118)  (1 uses)
   09.css:749   background-color       .bg-pink.bg-light
=== rgb(238, 179, 4)  (1 uses)
   09.css:707   background-color       .bg-amber .nav > li.active
=== rgb(239, 240, 243)  (1 uses)
   09.css:476   color                  .bg-gray-dark .nav > li:hover > a, .bg-gray-dark .nav > li.active > a
=== rgb(240, 240, 240)  (1 uses)
   09.css:100   background-color       .app-container > footer
=== rgb(241, 242, 243)  (1 uses)
   09.css:543   background-color       #bg-white .nav > li:hover > a, .bg-white .nav > li:hover > a, #bg-white .nav > li.active > a, .bg-white .nav > li.active > a
=== rgb(241, 30, 14)  (1 uses)
   09.css:685   background-color       .bg-danger .nav > li:hover > a, .bg-danger .nav > li.active > a
=== rgb(241, 39, 24)  (1 uses)
   09.css:702   background-color       .bg-danger.bg-dark
=== rgb(242, 181, 0)  (1 uses)
   09.css:337   background-color       .btn-amber:hover, .btn-amber:focus, .btn-amber.focus, .btn-amber:active, .btn-amber.active, .open > .dropdown-toggle.btn-amber
=== rgb(242, 48, 34)  (1 uses)
   09.css:683   background-color       .bg-danger .nav > li.active
=== rgb(243, 244, 247)  (1 uses)
   09.css:497   background-color       .bg-gray-light .nav > li.active
=== rgb(244, 244, 244)  (1 uses)
   09.css:1264  background-color       #basic-addonSaveYoutube:hover, #basic-addonClearYoutube:hover, #basic-addonYoutube:hover
=== rgb(245, 60, 1)  (1 uses)
   09.css:781   background-color       .bg-orange .nav > li:hover > a, .bg-orange .nav > li.active > a
=== rgb(245, 93, 82)  (1 uses)
   09.css:701   background-color       .bg-danger.bg-light
=== rgb(248, 188, 208)  (1 uses)
   09.css:728   color                  .bg-pink a
=== rgb(248, 249, 249)  (1 uses)
   09.css:541   background-color       #bg-white .nav > li.active, .bg-white .nav > li.active
=== rgb(248, 249, 251)  (1 uses)
   09.css:35    background-color       .input-group-addon
=== rgb(250, 73, 17)  (1 uses)
   09.css:779   background-color       .bg-orange .nav > li.active
=== rgb(251, 198, 194)  (1 uses)
   09.css:680   color                  .bg-danger a
=== rgb(254, 109, 63)  (1 uses)
   09.css:797   background-color       .bg-orange.bg-light
=== rgb(254, 63, 3)  (1 uses)
   09.css:798   background-color       .bg-orange.bg-dark
=== rgb(254, 67, 8)  (1 uses)
   09.css:1104  border-top-color       .alert-orange hr
=== rgb(254, 71, 13)  (1 uses)
   09.css:352   background-color       .btn-orange:hover, .btn-orange:focus, .btn-orange.focus, .btn-orange:active, .btn-orange.active, .open > .dropdown-toggle.btn-orange
=== rgb(255, 0, 0)  (1 uses)
   09.css:1234  background-color       .badge-danger-chat
=== rgb(255, 164, 30)  (1 uses)
   09.css:677   background-color       .bg-warning.bg-light
=== rgb(255, 201, 38)  (1 uses)
   09.css:725   background-color       .bg-amber.bg-light
=== rgb(255, 204, 188)  (1 uses)
   09.css:776   color                  .bg-orange a
=== rgb(255, 224, 179)  (1 uses)
   09.css:656   color                  .bg-warning a
=== rgb(255, 236, 181)  (1 uses)
   09.css:704   color                  .bg-amber a
=== rgb(32, 37, 40)  (1 uses)
   09.css:1082  background-color       .label-inverse[href]:hover, .label-inverse[href]:focus
=== rgb(34, 34, 34)  (1 uses)
   09.css:1240  background-color       .gutter
=== rgb(36, 51, 68)  (1 uses)
   09.css:453   background-color       .bg-gray-darker .nav > li.active
=== rgb(41, 47, 52)  (1 uses)
   09.css:582   background-color       .bg-inverse.bg-dark
=== rgb(43, 46, 49)  (1 uses)
   09.css:605   background-color       .bg-primary.bg-light
=== rgb(43, 50, 55)  (1 uses)
   09.css:1101  border-top-color       .alert-inverse hr
=== rgb(50, 176, 213)  (1 uses)
   09.css:1132  color                  .dark .chat-msg-txt a:visited, .dark .chat-msg-txt a:link
=== rgb(61, 163, 244)  (1 uses)
   09.css:653   background-color       .bg-info.bg-light
=== rgb(64, 147, 67)  (1 uses)
   09.css:613   background-color       .bg-success .nav > li:hover > a, .bg-success .nav > li.active > a
=== rgb(64, 73, 87)  (1 uses)
   09.css:477   background-color       .bg-gray-dark .nav > li:hover > a, .bg-gray-dark .nav > li.active > a
=== rgb(67, 154, 70)  (1 uses)
   09.css:630   background-color       .bg-success.bg-dark
=== rgb(67, 79, 86)  (1 uses)
   09.css:581   background-color       .bg-inverse.bg-light
=== rgb(70, 161, 73)  (1 uses)
   09.css:611   background-color       .bg-success .nav > li.active
=== rgb(72, 83, 98)  (1 uses)
   09.css:475   background-color       .bg-gray-dark .nav > li.active
=== rgb(80, 45, 143)  (1 uses)
   09.css:1088  background-color       .label-purple[href]:hover, .label-purple[href]:focus
=== rgb(85, 47, 151)  (1 uses)
   09.css:757   background-color       .bg-purple .nav > li:hover > a, .bg-purple .nav > li.active > a
=== rgb(85, 85, 85)  (1 uses)
   09.css:1266  color                  .yt-url:hover
=== rgb(89, 50, 159)  (1 uses)
   09.css:774   background-color       .bg-purple.bg-dark
=== rgb(91, 51, 163)  (1 uses)
   09.css:1092  border-top-color       .alert-purple hr
=== rgb(92, 105, 125)  (1 uses)
   09.css:542   color                  #bg-white .nav > li:hover > a, .bg-white .nav > li:hover > a, #bg-white .nav > li.active > a, .bg-white .nav > li.active > a
=== rgb(96, 186, 99)  (1 uses)
   09.css:629   background-color       .bg-success.bg-light
=== rgba(0, 0, 0, 0.04)  (1 uses)
   09.css:1169  background-color       .chatHeader
=== rgba(0, 0, 0, 0.05)  (1 uses)
   09.css:1123  box-shadow             .chat li .chat-body
=== rgba(0, 0, 0, 0.26)  (1 uses)
   09.css:21    box-shadow             .thumbnail
=== rgba(0, 0, 0, 0.3)  (1 uses)
   09.css:1120  box-shadow             .shadow-z5
=== rgba(0, 0, 0, 0.35)  (1 uses)
   09.css:394   background-color       .slimScrollBar
=== rgba(0, 0, 0, 0.4)  (1 uses)
   09.css:290   box-shadow             .switch span::after
=== rgba(0, 0, 0, 0.7)  (1 uses)
   09.css:1003  color                  a.text-alpha-inverse:hover, a.text-alpha-inverse:focus
=== rgba(102, 57, 182, 0.7)  (1 uses)
   09.css:1000  color                  a.text-purple:hover, a.text-purple:focus
=== rgba(112, 131, 143, 0.15)  (1 uses)
   09.css:570   border-bottom          .ie9 .bg-inverse .navbar-form .form-control
=== rgba(112, 131, 143, 0.26)  (1 uses)
   09.css:580   border-top-color       .bg-inverse hr
=== rgba(131, 148, 169, 0.15)  (1 uses)
   09.css:548   border-bottom          .ie9 #bg-white .navbar-form .form-control, .ie9 .bg-white .navbar-form .form-control
=== rgba(131, 148, 169, 0.26)  (1 uses)
   09.css:558   border-top-color       #bg-white hr, .bg-white hr
=== rgba(148, 159, 176, 0.15)  (1 uses)
   09.css:482   border-bottom          .ie9 .bg-gray-dark .navbar-form .form-control
=== rgba(148, 159, 176, 0.26)  (1 uses)
   09.css:492   border-top-color       .bg-gray-dark hr
=== rgba(157, 209, 249, 0.15)  (1 uses)
   09.css:642   border-bottom          .ie9 .bg-info .navbar-form .form-control
=== rgba(157, 209, 249, 0.26)  (1 uses)
   09.css:652   border-top-color       .bg-info hr
=== rgba(160, 170, 178, 0.7)  (1 uses)
   09.css:1018  color                  a.text-gray:hover, a.text-gray:focus
=== rgba(167, 217, 169, 0.15)  (1 uses)
   09.css:618   border-bottom          .ie9 .bg-success .navbar-form .form-control
=== rgba(167, 217, 169, 0.26)  (1 uses)
   09.css:628   border-top-color       .bg-success hr
=== rgba(176, 150, 222, 0.15)  (1 uses)
   09.css:762   border-bottom          .ie9 .bg-purple .navbar-form .form-control
=== rgba(176, 150, 222, 0.26)  (1 uses)
   09.css:772   border-top-color       .bg-purple hr
=== rgba(191, 255, 0, 0.494)  (1 uses)
   09.css:1187  border                 #webcamCamDiv
=== rgba(220, 220, 220, 0.46)  (1 uses)
   09.css:1165  border-bottom          .smChatLi
=== rgba(230, 233, 238, 0.7)  (1 uses)
   09.css:1021  color                  a.text-gray-light:hover, a.text-gray-light:focus
=== rgba(233, 236, 237, 0.15)  (1 uses)
   09.css:438   border-bottom          .ie9 .bg-gray .navbar-form .form-control
=== rgba(233, 236, 237, 0.26)  (1 uses)
   09.css:448   border-top-color       .bg-gray hr
=== rgba(233, 30, 99, 0.7)  (1 uses)
   09.css:997   color                  a.text-pink:hover, a.text-pink:focus
=== rgba(243, 66, 53, 0.7)  (1 uses)
   09.css:982   color                  a.text-danger:hover, a.text-danger:focus
=== rgba(244, 245, 245, 0.7)  (1 uses)
   09.css:1024  color                  a.text-gray-lighter:hover, a.text-gray-lighter:focus
=== rgba(245, 151, 183, 0.15)  (1 uses)
   09.css:738   border-bottom          .ie9 .bg-pink .navbar-form .form-control
=== rgba(245, 151, 183, 0.26)  (1 uses)
   09.css:748   border-top-color       .bg-pink hr
=== rgba(250, 183, 178, 0.15)  (1 uses)
   09.css:690   border-bottom          .ie9 .bg-danger .navbar-form .form-control
=== rgba(250, 183, 178, 0.26)  (1 uses)
   09.css:700   border-top-color       .bg-danger hr
=== rgba(254, 151, 0, 0.7)  (1 uses)
   09.css:979   color                  a.text-warning:hover, a.text-warning:focus
=== rgba(254, 86, 33, 0.7)  (1 uses)
   09.css:1009  color                  a.text-orange:hover, a.text-orange:focus
=== rgba(255, 0, 0, 0.06)  (1 uses)
   09.css:1168  background-color       .chat li .chat-body .chatMention
=== rgba(255, 186, 165, 0.15)  (1 uses)
   09.css:786   border-bottom          .ie9 .bg-orange .navbar-form .form-control
=== rgba(255, 186, 165, 0.26)  (1 uses)
   09.css:796   border-top-color       .bg-orange hr
=== rgba(255, 193, 7, 0.7)  (1 uses)
   09.css:1006  color                  a.text-amber:hover, a.text-amber:focus
=== rgba(255, 205, 132, 0.15)  (1 uses)
   09.css:666   border-bottom          .ie9 .bg-warning .navbar-form .form-control
=== rgba(255, 205, 132, 0.26)  (1 uses)
   09.css:676   border-top-color       .bg-warning hr
=== rgba(255, 226, 140, 0.15)  (1 uses)
   09.css:714   border-bottom          .ie9 .bg-amber .navbar-form .form-control
=== rgba(255, 226, 140, 0.26)  (1 uses)
   09.css:724   border-top-color       .bg-amber hr
=== rgba(255, 255, 255, 0.6)  (1 uses)
   09.css:313   color                  .input-huge::-webkit-input-placeholder
=== rgba(29, 31, 33, 0.7)  (1 uses)
   09.css:973   color                  a.text-primary:hover, a.text-primary:focus
=== rgba(32, 149, 242, 0.7)  (1 uses)
   09.css:985   color                  a.text-info:hover, a.text-info:focus
=== rgba(4, 141, 4, 0.9)  (1 uses)
   09.css:1159  color                  .chatMention
=== rgba(43, 61, 81, 0.7)  (1 uses)
   09.css:1012  color                  a.text-gray-darker:hover, a.text-gray-darker:focus
=== rgba(54, 63, 69, 0.05)  (1 uses)
   09.css:80    background-color       .topnavbar .nav > li > a:hover, .topnavbar .nav > li > a:focus
=== rgba(54, 63, 69, 0.7)  (1 uses)
   09.css:991   color                  a.text-inverse:hover, a.text-inverse:focus
=== rgba(76, 175, 80, 0.7)  (1 uses)
   09.css:976   color                  a.text-success:hover, a.text-success:focus
=== rgba(81, 93, 110, 0.7)  (1 uses)
   09.css:1015  color                  a.text-gray-dark:hover, a.text-gray-dark:focus
=== rgba(89, 126, 167, 0.15)  (1 uses)
   09.css:460   border-bottom          .ie9 .bg-gray-darker .navbar-form .form-control
=== rgba(89, 126, 167, 0.26)  (1 uses)
   09.css:470   border-top-color       .bg-gray-darker hr
=== rgba(91, 97, 104, 0.15)  (1 uses)
   09.css:594   border-bottom          .ie9 .bg-primary .navbar-form .form-control
=== rgba(91, 97, 104, 0.26)  (1 uses)
   09.css:604   border-top-color       .bg-primary hr
```
