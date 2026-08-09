# prt2 — Q07 — Page frame, `<hr>` rhythm, `ng-include` footer, and the full vertical map

**Evidence base:** `/tmp/ptr-decode/prt2/caps/00-baseline-room/` (`DEFAULTS.txt`, `nodes-000.txt` … `nodes-007.txt`, 882 records, `truncated=false`), plus `/tmp/ptr-decode/prt2/00-META.txt`.
**Page:** `https://protradingroom.com/ptrApp#/page/welcome`, `role=member`, viewport `1842×1265 @dpr2`, `themeClass="footer-hidden"`.

> **RESOLUTION NOTE.** prt2's `DEFAULTS.txt` COMMON table is skewed by 635 Intercom emoji `<span>`s (`display:inline-table`, `visibility:hidden`, `width:30px`, `padding:5px`, `font-size:28px`, `line-height:30px`, **`text-align:center`**, `vertical-align:middle`, `cursor:pointer`). This matters most in *this* piece: the footer nodes do not list `text-align`, and they resolve to **`center`** — which is correct, because the footer carries `class="p-lg text-center"`. **All values below are RESOLVED ABSOLUTE values.**

---

## 1. Purpose

This piece decodes the page frame that holds the four content sections together: the 1170px Bootstrap `.container` auto-centred at x = 336, the `.center-block.mt-xl` content well, the four `ui-view` wrappers, the three `<hr>` separators between sections, and the `ng-include` footer reading "© 2026 ProTradingRoom". It ends with a complete top-to-bottom vertical rhythm map of every laid-out box on the page and a proof that no `<footer>`, `<header>` or `<aside>` element exists.

## 2. Path anchor + record count

**Anchors:** `path=r.0.1`, `path=r.0.1.1`, `path=r.0.1.1.0`, `path=r.0.1.1.0.0`, `path=r.0.1.1.0.0.0`, `path=r.0.1.1.0.0.0.0`, the three separator `<hr>`s at `path=r.0.1.1.0.0.0.0.{3,6,9}`, and the footer subtree `path=r.0.1.1.0.2`.

```
cd /tmp/ptr-decode/prt2/caps/00-baseline-room
awk -v RS='' -v ORS='\n\n' '/path=r\.0\.1\.1?([. ]|$)|path=r\.0\.1\.1\.0([. ]|$)|path=r\.0\.1\.1\.0\.0(\.0(\.0)?)?([. ]|$)|path=r\.0\.1\.1\.0\.0\.0\.0\.[369]([. ]|$)|path=r\.0\.1\.1\.0\.2/' nodes-*.txt
```

**16 records found:** `#18`, `#33`, `#40`, `#43`, `#49`, `#60`, `#66`, `#69`, `#72`, `#45`, `#51`, `#52`, `#53`, `#54`, `#55`, `#56`.
**15 render**; `#56` is a zero-size empty binding.

(The fourth child of the `.container`, `r.0.1.1.0.1`, is the hidden login card — decoded in Q02, cross-referenced here for the layout arithmetic.)

---

## 3. Node table

| # | path | tag | id | class (verbatim) | x | y | w | h | renders? |
|---|---|---|---|---|---|---|---|---|---|
| 18 | `r.0.1` | `div` | — | `ng-fluid ng-scope` | 0 | 50 | 1842 | **1069.99** | **yes** |
| 33 | `r.0.1.1` | `div` | — | `ng-fadeOutZoom ng-fluid ng-scope` | 0 | 50 | 1842 | **1069.99** | **yes** |
| 40 | `r.0.1.1.0` | `div` | — | `container container-sm animated fadeInDown ng-scope` | **336** | 50 | **1170** | 1069.99 | **yes** |
| 43 | `r.0.1.1.0.0` | `div` | — | `center-block mt-xl` | 351 | **80** | 1140 | 948.992 | **yes** |
| 49 | `r.0.1.1.0.0.0` | `div` | — | *(no class attribute)* | 351 | 80 | 1140 | 948.992 | **yes** |
| 60 | `r.0.1.1.0.0.0.0` | `div` | — | `app ng-scope ng-fadeInLeft2` | 351 | 80 | 1140 | 948.992 | **yes** |
| 66 | `r.0.1.1.0.0.0.0.3` | `hr` | — | *(no attributes at all)* | 366 | **339.8** | 1110 | 1 | **yes** — Sessions ↔ Badges |
| 69 | `r.0.1.1.0.0.0.0.6` | `hr` | — | *(no attributes at all)* | 366 | **543.2** | 1110 | 1 | **yes** — Badges ↔ Extra Admin Users |
| 72 | `r.0.1.1.0.0.0.0.9` | `hr` | — | *(no attributes at all)* | 366 | **798.6** | 1110 | 1 | **yes** — Extra Admin Users ↔ API Keys |
| 45 | `r.0.1.1.0.2` | `div` | — | `p-lg text-center ng-scope` | 351 | **1029** | 1140 | **91** | **yes** — the `ng-include` footer |
| 51 | `r.0.1.1.0.2.0` | `hr` | — | `ng-scope` | 366 | 1064 | 1110 | 1 | **yes** — footer rule |
| 52 | `r.0.1.1.0.2.1` | `span` | — | `mr-sm ng-scope` | 838.3 | 1086.5 | 11.2 | 16.5 | **yes** — `©` |
| 53 | `r.0.1.1.0.2.2` | `span` | — | `mr-sm ng-binding ng-scope` | 858.4 | 1086.5 | 31.1 | 16.5 | **yes** — `2026` |
| 54 | `r.0.1.1.0.2.3` | `span` | — | `ng-binding ng-scope` | 898.4 | 1086.5 | 105.3 | 16.5 | **yes** — `ProTradingRoom` |
| 55 | `r.0.1.1.0.2.4` | `br` | — | `ng-scope` | 1003.7 | 1086.5 | 0 | 16.5 | **yes** (line break) |
| 56 | `r.0.1.1.0.2.5` | `span` | — | `ng-binding ng-scope` | 921 | **1105** | 0 | 0 | **no content** — empty binding on line 2 |

**Cross-reference (Q02):** `#44` `r.0.1.1.0.1` `div.panel.ng-hide` — the login card — sits between `#43` and `#45` in DOM order and is `display:none` with `rect 0 × 0`, so it contributes **nothing** to the vertical flow.

### Layout arithmetic — verified
* `.container` width `1170px`, `margin-left = margin-right = 336px` → `336 + 1170 + 336 = 1842` ✔ **auto-centred**, left edge exactly **x = 336**.
* `.container` `padding: 0 15px` → content well `351 → 1491`, i.e. **1140px**. ✔ matches `#43`/`#49`/`#60` width.
* `#60` `.app` adds `padding: 15px 15px 0 15px` → its children start at **x = 366** and the four `.row`s (`#64`, `#65`, `#68`, `#71`, `#74`) use `margin: 0 -15px` to claw back to `x = 351, width 1140`. That is why headings and `<hr>`s sit at **x = 366, width 1110** while rows sit at **x = 351, width 1140**.
* `#43` `.center-block.mt-xl` `margin-top: 30px` → its top is `50 + 30 = 80`. ✔
* `#60` `padding-top: 15px` → first child (`h4` `#63`) content begins at `80 + 15 = 95`; the `h4`'s own `margin-top: 10px` puts it at **y = 105**. ✔

---

## 4. Every attribute, verbatim

### `#18` `r.0.1` `<div>`
```
ui-view    = ""
autoscroll = "false"
class      = "ng-fluid ng-scope"
```

### `#33` `r.0.1.1` `<div>`
```
ui-view    = ""
autoscroll = "false"
class      = "ng-fadeOutZoom ng-fluid ng-scope"
style      = "background-color: 0A0A0A"
ng-init    = "showNewRoom=0;"
```
> ⚠️ **`style="background-color: 0A0A0A"` is INVALID CSS** — no `#` prefix. The declaration is dropped, and the element's resolved `background-color` is `rgba(0, 0, 0, 0)` (transparent), letting the white `<body>` through. The author clearly intended `#0A0A0A` (near-black). **Reproduce the resolved result (transparent), not the author's intent** — the reference page is white here.
> `ng-init="showNewRoom=0;"` is the initialiser for the "click Sessions 5 times" easter-egg documented in Q03.

### `#40` `r.0.1.1.0` `<div>`
```
class = "container container-sm animated fadeInDown ng-scope"
::before { content: "\" \"" (U+0022 U+0020 U+0022); color: rgb(51, 51, 51); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 14px; background-color: rgba(0, 0, 0, 0) }
::after  { identical }
```

### `#43` `r.0.1.1.0.0` `<div>`
```
class = "center-block mt-xl"
```

### `#49` `r.0.1.1.0.0.0` `<div>`
```
ng-show = "login.isLoggedIn"
```
(That is the *entire* attribute set — no `class`. Angular did **not** add `ng-hide`, proving the session is logged in. Contrast with the login card's `ng-hide="login.isLoggedIn "` — **with a trailing space** — in Q02.)

### `#60` `r.0.1.1.0.0.0.0` `<div>`
```
ui-view    = ""
autoscroll = "false"
ng-class   = "app.views.animation"
class      = "app ng-scope ng-fadeInLeft2"
```

### `#66`, `#69`, `#72` — the three section separators
```
attrs: (none)          ×3
```
All three are bare `<hr>` with no class, no id, no attributes.

### `#45` `r.0.1.1.0.2` `<div>` — the footer
```
ng-include = "'app/views/page.footer.html'"
class      = "p-lg text-center ng-scope"
```
> The footer is an **AngularJS `ng-include` partial** at `app/views/page.footer.html` (a relative path, resolved against the app base → `https://protradingroom.com/app/views/page.footer.html`). It is **not** a `<footer>` element.

### `#51` `<hr class="ng-scope">`
```
class = "ng-scope"
```

### `#52` `<span class="mr-sm ng-scope">`
```
class = "mr-sm ng-scope"
text  = "©"
```

### `#53` `<span class="mr-sm ng-binding ng-scope">`
```
ng-bind = "app.year"
class   = "mr-sm ng-binding ng-scope"
text    = "2026"
```

### `#54` `<span class="ng-binding ng-scope">`
```
ng-bind = "app.name"
class   = "ng-binding ng-scope"
text    = "ProTradingRoom"
```

### `#55` `<br class="ng-scope">`
```
class = "ng-scope"
```

### `#56` `<span class="ng-binding ng-scope">`
```
class = "ng-binding ng-scope"
(no text, no ng-bind attribute captured)
```
> ⚠️ `#56` has the `ng-binding` class (so Angular *is* interpolating into it) but the dump records **no `ng-bind` attribute and no text**. That means the binding is a `{{…}}` interpolation whose expression evaluated to an empty string. **What that second footer line is meant to say is an honest gap.** Its zero-height box at `x=921, y=1105` is why the footer is 91px tall instead of ~111px.

---

## 5. Resolved computed style — every rendering node

### `#18` `div.ng-fluid.ng-scope` (page `ui-view`)
| prop | value |
|---|---|
| display / visibility | `block` / `visible` |
| position / float | `static` / `none` |
| width / height | `1842px` / **`1069.99px`** |
| margin T/R/B/L | `0px`×4 |
| padding T/R/B/L | `0px`×4 |
| border-width / style / colour | `0px`×4 / `none`×4 / `rgb(51,51,51)`×4 |
| radius | `0px`×4 |
| background-color | `rgba(0, 0, 0, 0)` |
| color | `rgb(51, 51, 51)` |
| font-family / size / weight | `"Helvetica Neue", Helvetica, Arial, sans-serif` / `14px` / `400` |
| line-height | `20px` |
| letter-spacing / text-align / vertical-align | `normal` / `start` / `baseline` |
| white-space / overflow-x/-y | `normal` / `visible` / `visible` |
| opacity / box-shadow / cursor | `1` / `none` / `auto` |
| transition | `all 0s` |

### `#33` `div.ng-fadeOutZoom.ng-fluid.ng-scope`
Identical to `#18` in every resolved property (`block`, `visible`, `1842 × 1069.99`, margin/padding `0`×4, border `0px none rgb(51,51,51)`, radius `0`×4, **`background-color: rgba(0, 0, 0, 0)`** ← the invalid `0A0A0A` was dropped, `color rgb(51,51,51)`, Helvetica `14px`/`400`/`20px`, text-align `start`, vertical-align `baseline`, overflow `visible`, opacity `1`, box-shadow `none`, cursor `auto`).

### `#40` `div.container.container-sm.animated.fadeInDown.ng-scope`
| prop | value |
|---|---|
| display / visibility | `block` / `visible` |
| position / float | `static` / `none` |
| **width / height** | **`1170px`** / `1069.99px` |
| **margin T/R/B/L** | **`0px / 336px / 0px / 336px`** ← auto-centred |
| **padding T/R/B/L** | **`0px / 15px / 0px / 15px`** |
| border-width / style / colour | `0px`×4 / `none`×4 / `rgb(51,51,51)`×4 |
| radius | `0px`×4 |
| background-color | `rgba(0, 0, 0, 0)` |
| color | `rgb(51, 51, 51)` |
| font-family / size / weight | `"Helvetica Neue", …` / `14px` / `400` |
| line-height | `20px` |
| letter-spacing / text-align / vertical-align | `normal` / `start` / `baseline` |
| white-space / overflow / opacity / box-shadow / cursor | `normal` / `visible` / `1` / `none` / `auto` |
| **transform** | **`matrix(1, 0, 0, 1, 0, 0)`** ← identity; the `animated fadeInDown` animation has completed |
| ::before / ::after | `content: " "` — Bootstrap `.container` clearfix |

### `#43` `div.center-block.mt-xl`
`display:block` · `visible` · `static` · `float:none` · **`width:1140px` `height:948.992px`** · **margin `30px / 0 / 0 / 0`** (`.mt-xl`) · padding `0`×4 · border `0px none rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.
> Note: despite the name, `.center-block` resolves to `margin-left: 0` / `margin-right: 0` here (the element is already full-width), **not** `auto`.

### `#49` `div[ng-show="login.isLoggedIn"]`
`display:block` · `visible` · `static` · **`width:1140px` `height:948.992px`** · margin `0`×4 · padding `0`×4 · border `0px none rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.

### `#60` `div.app.ng-scope.ng-fadeInLeft2`
`display:block` · `visible` · `static` · **`width:1140px` `height:948.992px`** · margin `0`×4 · **padding `15px / 15px / 0px / 15px`** ← note **zero bottom padding** · border `0px none rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.

### `#66` / `#69` / `#72` — the three section `<hr>`s (all resolve identically)
| prop | value |
|---|---|
| display / visibility | `block` / `visible` |
| **box-sizing** | **`content-box`** ← the only elements on the page that are not `border-box` (plus the footer `hr` and the two hidden badge `hr`s) |
| position / float | `static` / `none` |
| **width / height** | **`1110px` / `0px`** (rect reports `h=1` because of the 1px top border) |
| **margin T/R/B/L** | **`20px / 0px / 20px / 0px`** |
| padding T/R/B/L | `0px`×4 |
| **border-top** | **`1px solid rgb(238, 238, 238)`** |
| border-right / bottom / left | `0px none rgb(128, 128, 128)` |
| radius | `0px`×4 |
| background-color | `rgba(0, 0, 0, 0)` |
| **color** | **`rgb(128, 128, 128)`** |
| font-family / size / weight | `"Helvetica Neue", …` / `14px` / `400` |
| line-height | `20px` |
| letter-spacing / text-align / vertical-align | `normal` / `start` / `baseline` |
| white-space | `normal` |
| **overflow-x / -y** | **`hidden` / `hidden`** |
| opacity / box-shadow / cursor | `1` / `none` / `auto` |
| outline-color | `rgb(128, 128, 128)` |

### `#45` `div.p-lg.text-center.ng-scope` — the footer
| prop | value |
|---|---|
| display / visibility | `block` / `visible` |
| position / float | `static` / `none` |
| **width / height** | **`1140px` / `91px`** |
| margin T/R/B/L | `0px`×4 |
| **padding T/R/B/L** | **`15px / 15px / 15px / 15px`** (`.p-lg`) |
| border-width / style / colour | `0px`×4 / `none`×4 / `rgb(51,51,51)`×4 |
| radius | `0px`×4 |
| background-color | `rgba(0, 0, 0, 0)` |
| color | `rgb(51, 51, 51)` |
| font-family / size / weight | `"Helvetica Neue", Helvetica, Arial, sans-serif` / `14px` / `400` |
| line-height | `20px` |
| letter-spacing | `normal` |
| **text-align** | **`center`** (from `.text-center`) |
| vertical-align | `baseline` |
| white-space / overflow / opacity / box-shadow / cursor | `normal` / `visible` / `1` / `none` / `auto` |

**Height proof: `91 = 15` (pad-top) `+ 20` (hr margin-top) `+ 1` (hr border-top) `+ 20` (hr margin-bottom) `+ 20` (one 20px line box) `+ 15` (pad-bottom).** The `<br>` `#55` and the empty span `#56` add **zero** height.

### `#51` `hr.ng-scope` (footer rule)
Identical to `#66`/`#69`/`#72`: `display:block` · `box-sizing: content-box` · `width:1110px` `height:0px` · margin `20px 0` · padding `0`×4 · border-top `1px solid rgb(238, 238, 238)`, others `0px none rgb(128,128,128)` · radius `0`×4 · bg transparent · color `rgb(128,128,128)` · Helvetica `14px`/`400`/`20px` · **text-align `center`** (inherited from `.text-center`, unlike `#66`/`#69`/`#72` which inherit `start`) · vertical-align `baseline` · overflow-x/-y `hidden` · opacity `1` · box-shadow `none` · cursor `auto` · outline-color `rgb(128,128,128)`.

### `#52` `span.mr-sm.ng-scope` — `©`
`display:inline` · `visible` · `static` · width/height `auto` (**box 11.2 × 16.5 at 838.3, 1086.5**) · **margin `0 / 5px / 0 / 0`** (`.mr-sm`) · padding `0`×4 · border `0px none rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51, 51, 51)` · Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · **text-align `center`** (inherited) · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.

### `#53` `span.mr-sm.ng-binding.ng-scope` — `2026`
Identical to `#52` (`margin-right: 5px`), box **31.1 × 16.5 at 858.4, 1086.5**.

### `#54` `span.ng-binding.ng-scope` — `ProTradingRoom`
Identical but **`margin: 0px`×4**, box **105.3 × 16.5 at 898.4, 1086.5**.

### `#55` `br.ng-scope`
`display:inline` · `visible` · width `auto`, box **0 × 16.5 at 1003.7, 1086.5** · margin `0`×4 · padding `0`×4 · border `0px none rgb(51,51,51)`×4 · radius `0`×4 · bg transparent · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `center` (inherited) · vertical-align `baseline` · cursor `auto`.

### `#56` `span.ng-binding.ng-scope` — empty
`display:inline` · `visible` · width `auto`, **box 0 × 0 at 921, 1105** · margin `0`×4 · padding `0`×4 · border `0px none rgb(51,51,51)`×4 · radius `0`×4 · bg transparent · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `center` · vertical-align `baseline` · cursor `auto`.

### Footer inline run — measured horizontal layout
| element | left | width | right |
|---|---|---|---|
| `©` (`#52`) | 838.3 | 11.2 | 849.5 |
| *(5px `.mr-sm` gap + a literal space)* | | | |
| `2026` (`#53`) | 858.4 | 31.1 | 889.5 |
| *(5px `.mr-sm` gap + a literal space)* | | | |
| `ProTradingRoom` (`#54`) | 898.4 | 105.3 | **1003.7** |
| `<br>` (`#55`) | 1003.7 | 0 | 1003.7 |

Run spans **838.3 → 1003.7 = 165.4px**, centred inside the 1110px content box `366 → 1476`: midpoint of the run = `(838.3 + 1003.7)/2 = 921.0`; midpoint of the box = `(366 + 1476)/2 = 921.0`. ✔ **Perfectly centred** — and note `#56`'s `x = 921`, i.e. the empty line-2 caret sits exactly on that centre line.

**The rendered footer text is `© 2026 ProTradingRoom`.**

---

## 6. Verbatim text (every string, with path)

| path | element | text (verbatim) | renders? |
|---|---|---|---|
| `r.0.1.1.0.2.1` | `span.mr-sm` | `©` (U+00A9) | **yes** |
| `r.0.1.1.0.2.2` | `span.mr-sm.ng-binding` (`ng-bind="app.year"`) | `2026` | **yes** |
| `r.0.1.1.0.2.3` | `span.ng-binding` (`ng-bind="app.name"`) | `ProTradingRoom` | **yes** |
| `r.0.1.1.0.2.5` | `span.ng-binding` | *(empty)* | no content |

**Rendered footer line: `© 2026 ProTradingRoom`** — three separate spans plus the 5px `.mr-sm` gaps and inter-element whitespace. **No truncation** anywhere in this piece.

*Honest data note:* `2026` is bound to `app.year` and matches the capture timestamp (`meta.capturedAt = 2026-07-24T15:59:42.449Z`). A rebuild must compute the year, not hard-code `2026`.

---

## 7. FULL-PAGE VERTICAL RHYTHM MAP

Every laid-out box on the page, in y order. Owning piece in the last column. All 126 non-zero rects are accounted for: 13 are reCAPTCHA parked off-screen, leaving **113 on-page boxes**.

### 7a. Off-screen (reCAPTCHA scaffolding — never visible)
| y | box | node |
|---|---|---|
| −10010 | `1, −10010 → 22 × 22` ×3 | `#20`, `#24`, `#28` `div.g-recaptcha-bubble-arrow` |
| −10009 | `1, −10009 → 20 × 20` ×3 | `#21`, `#25`, `#29` `div.g-recaptcha-bubble-arrow` |
| −10000 | `0, −10000 → 2 × 2` | `#13` `r.12` |
| −10000 | `0, −10000 → 302 × 157` ×2 | `#14` `r.13`, `#16` `r.15` |
| −9999 | `1, −9999 → 300 × 155` ×2 | `#26` `r.13.3`, `#30` `r.15.3` |
| −9999 | `1, −9999 → 300 × 150` ×2 | `#36`, `#37` reCAPTCHA bframe `<iframe>` |

### 7b. On-page, top to bottom

| y range | height | box | node(s) | piece |
|---|---|---|---|---|
| **0 → 1265** | 1265 | `body` `0,0 1842×1265`, `div.app-container` `0,0 1842×1265` | `#0`, `#1` | Q01 |
| 0 → 1265 | 1265 | 3 × reCAPTCHA white veil `opacity:0.05`, `position:fixed` | `#19`, `#23`, `#27` | Q01 |
| **0 → 50** | **50** | **`nav.navbar.topnavbar`** `0,0 1842×50` — background `rgb(0,0,0)` | `#17`, `#31` | Q01 |
| 0 → 50 | 50 | `div.navbar-header` `0,0 350×50`; `div.nav-wrapper` `0,0 1842×50`; `div.navbar-brand` `15,0 320×50` | `#38`, `#39`, `#41` | Q01 |
| 0 → 50 | 50 | `ul.navbar-right` `1691.6,0 150.43×50`; `li` `1691.6,0 96.43×50`; `li` `1788,0 54×50`; `a` Account `1691.6,0 96.43×50`; `a` logout `1788,0 54×50` | `#42`, `#47`, `#48`, `#58`, `#59` | Q01 |
| 14.5 → 35.5 | 21 | `a[href=""]` (brand anchor) `20,14.5 200×21` | `#46` | Q01 |
| **14.6 → 39.1** | **24.5** | **`img.brand-logo` `20,14.6 200×24.5`** | `#57` | Q01 |
| **50 → 1120** | **1069.99** | page `ui-view` `0,50 1842×1069.99` ×2 | `#18`, `#33` | Q07 |
| **50 → 1120** | 1069.99 | **`.container` `336,50 1170×1069.99`** — auto-centred | `#40` | Q07 |
| **80 → 1029** | **948.99** | `.center-block.mt-xl` / logged-in `ng-show` / `.app` — all `351,80 1140×948.992` | `#43`, `#49`, `#60` | Q07 |
| **104 → 125.5** | 21.5 | `span` "Sessions" `410.7,104 75×21.5` | `#77` | Q03 |
| **105 → 124.8** | 19.8 | `h4` "Total … : 1" `366,105 1110×19.8` | `#63` | Q03 |
| **134.8 → 190.8** | **56** | `.row` (search) `351,134.8 1140×56` | `#64` | Q03 |
| 134.8 → 170.8 | 36 | `.col-md-4.panel` `351,134.8 380×36` | `#78` | Q03 |
| 134.8 → 164.8 | 30 | `button` Archived `731,134.8 102.68×30` | `#79` | Q03 |
| **135.8 → 169.8** | **34** | **`input[ng-model=sessSearch]` `367,135.8 348×34`** — the only visible input | `#89` | Q03 |
| 142.8 → 156.8 | 14 | `span` "Show" `742,142.8 30.4×14` | `#90` | Q03 |
| **190.8 → 319.8** | **129** | `.row` (sessions table) `351,190.8 1140×129` | `#65` | Q03 |
| 190.8 → 299.8 | 109 | `.col-md-12.panel` `351,190.8 1140×109` | `#80` | Q03 |
| 191.8 → 298.8 | 107 | `.table-responsive` + `table` `367,191.8 1108×107` | `#92`, `#111` | Q03 |
| 191.8 → 252.3 | 60.5 | `thead` / `tr` / 5 × `th` `367,191.8 1108×60.5` | `#131`, `#159`, `#185`–`#189` | Q03 |
| 214.8 → 228.8 | 14 | 2 × sort icon `449.9,214.8` and `724,214.8`, `13×14` | `#218`, `#219` | Q03 |
| 252.3 → 298.8 | 46.5 | `tbody` / `tr` / 5 × `td` `367,252.3 1108×46.5` | `#132`, `#160`, `#190`–`#194` | Q03 |
| 260.8 → 290.8 | 30 | `a` Launch `1073.6,260.8 76.9×30`; `a` Manage `1154.4,260.8 81.5×30` | `#226`, `#227` | Q03 |
| 260.8 → 280.8 | 20 | `div` "1 / 2" `945.5,260.8 111.1×20` | `#225` | Q03 |
| 262.3 → 278.8 | 16.5 | `strong` "3625" `375,262.3 31.1×16.5` | `#220` | Q03 |
| 263.7 → 281.4 | 17.7 | `div.label.label-orange` "open" `855.5,263.7 37.7×17.7` | `#223` | Q03 |
| 269.8 → 281.8 | 12 | 2 × action icon `1084.6,269.8 12×12`, `1165.4,269.8 12.9×12` | `#232`, `#233` | Q03 |
| **339.8 → 340.8** | **1** | **`<hr>` #1 — Sessions ↔ Badges** `366,339.8 1110×1` | `#66` | **Q07** |
| **360.8 → 387.2** | 26.4 | `h3` "Badges" `366,360.8 1110×26.4` | `#67` | Q04 |
| **397.2 → 523.2** | **126** | `.row` (badges) `351,397.2 1140×126` | `#68` | Q04 |
| 397.2 → 503.2 | 106 | `.col-md-9.panel` `351,397.2 855×106` | `#83` | Q04 |
| 398.2 → 432.2 | 34 | 3 × action button `367,398.2 128.66×34` · `499.6,398.2 177.66×34` · `681.1,398.2 119.08×34` | `#96`, `#97`, `#98` | Q04 |
| 408.2 → 422.2 | 14 | `i.fa-cloud-upload` `512.6,408.2 15×14` | `#117` | Q04 |
| 442.2 → 502.2 | 60 | `.table-responsive` + `table` + `thead` + `tr` + 2 × `th` `367,442.2 823×60` | `#100`, `#118`, `#146`, `#172`, `#198`, `#199` | Q04 |
| **502.2 → 502.2** | **0** | **`tbody` `367,502.2 823×0` — ZERO ROWS (the bug)** | `#147` | **Q04** |
| **543.2 → 544.2** | **1** | **`<hr>` #2 — Badges ↔ Extra Admin Users** `366,543.2 1110×1` | `#69` | **Q07** |
| **564.2 → 590.6** | 26.4 | `h3` "Extra Admin Users" `366,564.2 1110×26.4` | `#70` | Q05 |
| **600.6 → 778.6** | **178** | `.row` (admin) `351,600.6 1140×178` | `#71` | Q05 |
| 600.6 → 758.6 | 158 | `.col-md-12.panel` `351,600.6 1140×158` | `#84` | Q05 |
| 601.6 → 635.6 | 34 | `button` Add Admin User `367,601.6 128.96×34` | `#101` | Q05 |
| 660.6 → 757.6 | 97 | `.table-responsive` + `table` `367,660.6 1108×97` | `#104`, `#121` | Q05 |
| 660.6 → 721.1 | 60.5 | `thead` / `tr` / 4 × `th` `367,660.6 1108×60.5` | `#150`, `#177`, `#208`–`#211` | Q05 |
| 721.1 → 757.6 | 36.5 | `tbody` / `tr` / `td[colspan=4]` "No admin users added yet" `367,721.1 1108×36.5` | `#151`, `#178`, `#212` | Q05 |
| **798.6 → 799.6** | **1** | **`<hr>` #3 — Extra Admin Users ↔ API Keys** `366,798.6 1110×1` | `#72` | **Q07** |
| **819.6 → 846** | 26.4 | `h3` "API Keys" `366,819.6 1110×26.4` | `#73` | Q06 |
| **856 → 1029** | **173** | `.row` (api keys) `351,856 1140×173` | `#74` | Q06 |
| 856 → 1009 | 153 | `.col-md-12.panel` `351,856 1140×153` | `#85` | Q06 |
| 857 → 1008 | 151 | `.table-responsive` `367,857 1108×151` | `#105` | Q06 |
| 857 → 901 | 44 | nested `.row` `352,857 1138×44` + 2 × `.col-md-2` `189.66×44` | `#122`, `#152`, `#153` | Q06 |
| 857 → 891 | 34 | `button` New Api key `367,857 104.29×34`; `a` API Docs `556.7,857 84.08×34` | `#179`, `#180` | Q06 |
| 911 → 1008 | 97 | `table` `367,911 1108×97` | `#123` | Q06 |
| 911 → 971.5 | 60.5 | `thead` / `tr` / 3 × `th` `367,911 1108×60.5` | `#154`, `#181`, `#213`–`#215` | Q06 |
| 971.5 → 1008 | 36.5 | `tbody` / `tr` / `td[colspan=3]` "No API keys yet" `367,971.5 1108×36.5` | `#155`, `#182`, `#216` | Q06 |
| **1029 → 1120** | **91** | **footer `div[ng-include].p-lg.text-center` `351,1029 1140×91`** | `#45` | **Q07** |
| 1064 → 1065 | 1 | footer `<hr>` `366,1064 1110×1` | `#51` | Q07 |
| 1086.5 → 1103 | 16.5 | `© 2026 ProTradingRoom` run `838.3 → 1003.7` | `#52`–`#55` | Q07 |
| 1105 | 0 | empty line-2 binding at `x = 921` | `#56` | Q07 |
| **1120 → 1265** | **145** | **NOTHING — 145px of empty white below the content** | — | Q07 |

### 7c. Section-boundary summary (the "rhythm")

```
   0 ┬ navbar (black, 50)
  50 ┼ page ui-view / .container (1170 wide, centred at x=336)
  80 ┼ .center-block.mt-xl  →  .app (padding 15/15/0/15)
 105 │   ── Sessions ─────────────────────────────────────────
 339.8 ┼ <hr>  (margin 20 above, 20 below)
 360.8 │   ── Badges ───────────────────────────────────────────
 543.2 ┼ <hr>
 564.2 │   ── Extra Admin Users ────────────────────────────────
 798.6 ┼ <hr>
 819.6 │   ── API Keys ─────────────────────────────────────────
1029   ┼ footer ng-include (p-lg, text-center, 91 tall)
1064   │   <hr>
1086.5 │   © 2026 ProTradingRoom
1120   ┴ END OF CONTENT
       │
1265   ┴ END OF VIEWPORT   ← 145px of white
```

**Consistent inter-section pattern (all three separators identical):**
`section .row bottom` → **`+20px`** → `<hr>` (1px, `rgb(238,238,238)`, 1110 wide at x=366) → **`+20px`** → next `<h3>` top (24px/500, `margin: 20px 0 10px`… but its 20px top margin is **collapsed** with the `<hr>`'s 20px bottom margin, so the visual gap is 20px, not 40px).
Verify: hr#1 bottom `340.8` → h3 "Badges" top `360.8` = **20px** ✔. hr#2 `544.2` → h3 top `564.2` = **20px** ✔. hr#3 `799.6` → h3 top `819.6` = **20px** ✔.
And `h3` bottom → next `.row` top: `387.2 → 397.2 = 10px` ✔ (the `h3`'s `margin-bottom: 10px`), `590.6 → 600.6 = 10px` ✔, `846 → 856 = 10px` ✔.

### 7d. Proof: no `<footer>`, `<header>` or `<aside>`
Tag histogram over all 882 records:
```
650 span · 94 div · 14 th · 12 script · 12 input · 12 button · 12 a · 7 tr · 7 td · 7 h3
  6 hr · 5 label · 5 iframe · 5 i · 4 thead · 4 tbody · 4 table · 3 img · 3 form · 3 br
  2 textarea · 2 li · 2 h4 · 1 ul · 1 style · 1 strong · 1 p · 1 nav · 1 muted · 1 body
```
**Zero `<footer>`, zero `<header>`, zero `<aside>`, zero `<main>`, zero `<section>`, zero `<article>`.** The only semantic landmark element in the document is the single `<nav role="navigation">` (Q01). The page's "footer" is a plain `<div ng-include>`, and `<body class="footer-hidden">` refers to the *app chrome's* global footer being suppressed — not to this content footer.

### 7e. Why 145px of white
`body` height = **1265px** (= viewport). Content stack: `nav 50` + page `ui-view 1069.99` = **1119.99 ≈ 1120**. Nothing occupies `1120 → 1265`. `body` `background-color: rgb(255, 255, 255)`, so it renders as flat white. The 145px is **not** a spacer element — it is simply the unused remainder of the viewport (`body` overflow is `auto`, so the page does not scroll at this height).

---

## 8. Rebuild spec (pixel-for-pixel)

```html
<!-- r.0.1 → r.0.1.1 : two nested ui-views, both full-width -->
<div class="ng-fluid">
  <div class="ng-fluid ng-fadeOutZoom" style="background-color: 0A0A0A"><!-- invalid; resolves transparent -->

    <!-- r.0.1.1.0 : the frame -->
    <div class="container container-sm animated fadeInDown">

      <!-- r.0.1.1.0.0 : logged-in dashboard -->
      <div class="center-block mt-xl">
        <div hidden={!loggedIn}>
          <div class="app">
            <!-- Q03 --> <h4>…</h4> <div class="row">…</div> <div class="row">…</div>
            <hr>
            <!-- Q04 --> <h3>Badges</h3> <div class="row">…</div>
            <hr>
            <!-- Q05 --> <h3>Extra Admin Users</h3> <div class="row">…</div>
            <hr>
            <!-- Q06 --> <h3>API Keys</h3> <div class="row">…</div>
          </div>
        </div>
      </div>

      <!-- r.0.1.1.0.1 : login card, Q02 -->
      <div class="panel" hidden={loggedIn}>…</div>

      <!-- r.0.1.1.0.2 : ng-include 'app/views/page.footer.html' -->
      <div class="p-lg text-center">
        <hr>
        <span class="mr-sm">&copy;</span>
        <span class="mr-sm">{new Date().getFullYear()}</span>
        <span>{appName}</span>
        <br>
        <span><!-- empty in the reference --></span>
      </div>

    </div>
  </div>
</div>
```

```css
/* frame */
.ng-fluid              { display:block; width:1842px; margin:0; padding:0;
                         background:transparent; color:#333;
                         font:400 14px/20px "Helvetica Neue",Helvetica,Arial,sans-serif;
                         text-align:start; }

.container             { display:block; width:1170px; margin:0 auto;   /* resolves to 0 336px */
                         padding:0 15px; background:transparent;
                         transform:matrix(1,0,0,1,0,0); }
.container::before, .container::after { content:" "; display:table; }
.container::after      { clear:both; }

.center-block.mt-xl    { display:block; width:1140px; margin:30px 0 0; padding:0; }
.app                   { display:block; width:1140px; margin:0; padding:15px 15px 0; }

/* the three section separators AND the footer rule — identical */
hr                     { display:block; box-sizing:content-box;
                         width:1110px; height:0;
                         margin:20px 0; padding:0;
                         border:0; border-top:1px solid rgb(238,238,238);
                         color:rgb(128,128,128); outline-color:rgb(128,128,128);
                         overflow:hidden; }

/* headings own the rhythm: 20px above (collapses with the hr's 20px), 10px below */
h3                     { display:block; width:1110px; height:26.3984px;
                         margin:20px 0 10px; padding:0;
                         font:500 24px/26.4px "Helvetica Neue",Helvetica,Arial,sans-serif;
                         color:#333; text-align:start; }

/* footer */
.p-lg                  { padding:15px; }
.text-center           { text-align:center; }
.p-lg.text-center      { display:block; width:1140px; height:91px; margin:0;
                         background:transparent; color:#333;
                         font:400 14px/20px "Helvetica Neue",Helvetica,Arial,sans-serif; }
.p-lg.text-center hr   { text-align:center; }   /* inherited */
.mr-sm                 { margin-right:5px; }
.p-lg.text-center span { display:inline; margin:0; padding:0; vertical-align:baseline; }
.p-lg.text-center span.mr-sm { margin-right:5px; }
```

Measured checkpoints the rebuild must hit exactly:
* `.container` left edge **x = 336**, width **1170**, right edge **1506**.
* content well **x = 351 → 1491** (1140 wide); heading/hr well **x = 366 → 1476** (1110 wide).
* `<hr>` tops at **y = 339.8, 543.2, 798.6**; footer `<hr>` at **y = 1064**.
* `<h3>` tops at **y = 360.8, 564.2, 819.6**.
* footer box `351, 1029 → 1140 × 91`; text baseline run `838.3 → 1003.7` at `y = 1086.5`, centred on **x = 921**.
* content ends at **y = 1120**; `body` is **1265** tall → **145px of `rgb(255,255,255)` below**.

---

## 9. Honest gaps

1. **`#56`'s binding is empty.** The second footer line has an `ng-binding` span with no `ng-bind` attribute and no text captured, so **what it is meant to display is unknown** (a version string? a build id? a legal line?). Its presence adds a `<br>` and a zero-height line to the DOM. Do not invent content for it.
2. **`app/views/page.footer.html` is not in the dump.** Only its rendered output (4 spans + 1 `<br>` + 1 `<hr>`) is evidence; the partial's source markup and any conditional branches inside it are unknown.
3. **`style="background-color: 0A0A0A"` is invalid and dropped.** The reference renders transparent-over-white. If the intent (`#0A0A0A`, near-black) is ever "fixed", the whole page's colour scheme changes and every colour in Q01–Q06 would need re-verification. Do not fix it silently.
4. **`app.year` / `app.name` are AngularJS scope values.** The captured strings (`2026`, `ProTradingRoom`) are real, but `2026` must be computed at runtime in the rebuild — hard-coding it would be fabricated data next January.
5. **The `.container-sm`, `.animated`, `.fadeInDown`, `.ng-fadeOutZoom`, `.ng-fadeInLeft2` classes** all resolve to no measurable effect in this capture (the animation had completed; `transform` is the identity matrix). Their **animation keyframes are not in the evidence** — the entry animation cannot be reproduced from this dump.
6. **The 145px of white below the fold is viewport-dependent.** At a taller viewport it grows; at a shorter one the page would scroll (`body { overflow:auto }`). It is **not** a fixed spacer and must not be hard-coded as one.
7. **Margin collapsing between each `<hr>`'s 20px bottom margin and the following `<h3>`'s 20px top margin** is *inferred* from the measured 20px (not 40px) gaps. The rects prove the gap; the collapsing mechanism is the standard CSS explanation and is asserted, not directly captured.
8. **No scroll, resize, or narrower-breakpoint evidence.** All four captures in this dump are the same `1842×1265 @dpr2` viewport, so `.container`'s responsive breakpoints (`750/970/1170`) and `.col-md-*` stacking below 992px are **completely unverified**.
9. **The three body-level reCAPTCHA veils (`#19`, `#23`, `#27`) are `position:fixed`, full-viewport, `opacity:0.05` white, `z-index:2000000000`.** They technically sit *above* the whole page and tint it by 5%. Whether that is perceptible in a screenshot diff is untested — flag it before treating a 1–2% colour delta as a rebuild defect.
