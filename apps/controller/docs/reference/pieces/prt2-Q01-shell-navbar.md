# prt2 — Q01 — App shell + black top navbar

**Evidence base:** `/tmp/ptr-decode/prt2/caps/00-baseline-room/` (`DEFAULTS.txt`, `nodes-000.txt` … `nodes-007.txt`, 882 records, `truncated=false`), plus `/tmp/ptr-decode/prt2/00-META.txt`.
**Comparison base (ptr1):** `/private/tmp/ptr-decode/ptr1/caps/00-baseline-room/` (`DEFAULTS.txt`, `nodes-000.txt`, 2156 records).
**Page:** `https://protradingroom.com/ptrApp#/page/welcome`, captured `2026-07-24T15:59:42.449Z`, viewport `1842×1265 @dpr2`, `role=member`, `themeClass="footer-hidden"`.

> **RESOLUTION NOTE (read once, applies to every file in this set).** `DEFAULTS.txt` for prt2 is the *most-frequent* value table, and it is **skewed by the 635 Intercom emoji `<span>`s** that dominate the capture (635/882 nodes). The skewed COMMON values are:
> `display: inline-table`, `visibility: hidden`, `width: 30px`, `padding: 5px` (all four sides), `font-family: "Apple Color Emoji", "Segoe UI Emoji", NotoColorEmoji, "Segoe UI Symbol", "Android Emoji", EmojiSymbols`, `font-size: 28px`, `line-height: 30px`, `text-align: center`, `vertical-align: middle`, `cursor: pointer`, `transition-property: transform, -webkit-transform`, `transition-duration: 0.06s, 0.06s`.
> Every real page element therefore *explicitly lists* overrides for display/visibility/width/padding/font-*/transition. Where a real element does **not** list `text-align`, `vertical-align` or `cursor`, the resolved value genuinely is `center` / `middle` / `pointer` — and in every case checked below that is also the correct Bootstrap-3 value (e.g. `.text-center` cells, `img` middle baseline, `a`/`button` pointer). **All values printed in this file are RESOLVED ABSOLUTE values; you never need DEFAULTS.txt.**

---

## 1. Purpose

This piece decodes the outermost DOM frame of the `page.welcome` capture: `<body class="footer-hidden">`, the AngularJS `ui-view` app container, and the 1842×50 black `nav.navbar.topnavbar` containing the 200×24.5 `ptr_logo.png` at the left and the right-floated "Account" (`fa-cog`) / logout (`fa-power-off`) links. It also verifies, node by node, whether this navbar is byte-for-byte the same app shell as in the ptr1 (room) capture.

## 2. Path anchor + record count

| Anchor | Meaning | Records found |
|---|---|---|
| `path=r` | `<body>` | 1 (`#0`) |
| `path=r.0` | `div.app-container` (ui-view, `CoreController`) | 1 (`#1`) |
| `path=r.0.0` … `path=r.0.0.0.1.0.1.0` | navbar subtree | **13** (`#17`, `#31`, `#38`, `#39`, `#41`, `#42`, `#46`, `#47`, `#48`, `#57`, `#58`, `#59` — 12 nodes; `#18` `r.0.1` is the page ui-view, owned by Q07) |
| `path=r.1` … `path=r.15` | body-level shell siblings (scripts, reCAPTCHA scaffolding, hidden file input) | 15 (`#2`–`#16`) |
| `path=r.12.*`, `r.13.*`, `r.15.*` | reCAPTCHA bframe scaffolding, parked at `y ≈ −10000` | 12 (`#19`–`#30`, `#35`–`#37`) |

**Total records covered by Q01: 42** of 882.

Structural facts verified across all 882 records:
* Tag histogram (`grep '^#' nodes-*.txt`): `span` 650, `div` 94, `th` 14, `script` 12, `input` 12, `button` 12, `a` 12, `tr` 7, `td` 7, `h3` 7, `hr` 6, `label` 5, `iframe` 5, `i` 5, `thead` 4, `tbody` 4, `table` 4, `img` 3, `form` 3, `br` 3, `textarea` 2, `li` 2, `h4` 2, `ul` 1, `style` 1, `strong` 1, `p` 1, `nav` 1, `muted` 1, `body` 1.
* **There is exactly one `<nav>` (`#31`) and zero `<header>`, `<footer>`, `<aside>`, `<main>`, `<section>` elements** in the whole document.
* 126 nodes have a non-zero rect; 13 of those sit at `y ≤ −9999` (reCAPTCHA) → **113 on-page boxes**. 756 nodes have `rect w=0 h=0`. 674 nodes resolve to `visibility: hidden` (all of them inside the Intercom emoji popover); 208 explicitly list `visibility: visible`.
* `00-META.txt` → `cssVars: {"root":{},"body":{}}` for **all four** captures → **the app defines zero CSS custom properties**. No flexbox / no grid anywhere (`flex: 0 1 auto`, `flex-direction: row`, `grid-template-columns: none` are the COMMON value for **882/882** nodes). Layout is Bootstrap-3 float/table.

---

## 3. Node table

| # | path | tag | id | class (verbatim) | rect x | y | w | h | renders? |
|---|---|---|---|---|---|---|---|---|---|
| 0 | `r` | `body` | — | `footer-hidden` | 0 | 0 | 1842 | 1265 | **yes** |
| 1 | `r.0` | `div` | — | `app-container ng-scope` | 0 | 0 | 1842 | 1265 | **yes** |
| 2 | `r.1` | `script` | — | — | 0 | 0 | 0 | 0 | no (`display:none`) |
| 3 | `r.2` | `script` | — | — | 0 | 0 | 0 | 0 | no |
| 4 | `r.3` | `script` | — | — | 0 | 0 | 0 | 0 | no |
| 5 | `r.4` | `script` | — | — | 0 | 0 | 0 | 0 | no |
| 6 | `r.5` | `script` | — | — | 0 | 0 | 0 | 0 | no |
| 7 | `r.6` | `script` | — | — | 0 | 0 | 0 | 0 | no |
| 8 | `r.7` | `script` | — | — | 0 | 0 | 0 | 0 | no |
| 9 | `r.8` | `script` | — | — | 0 | 0 | 0 | 0 | no |
| 10 | `r.9` | `script` | — | — | 0 | 0 | 0 | 0 | no |
| 11 | `r.10` | `script` | — | — | 0 | 0 | 0 | 0 | no |
| 12 | `r.11` | `script` | — | — | 0 | 0 | 0 | 0 | no |
| 13 | `r.12` | `div` | — | — | 0 | −10000 | 2 | 2 | off-screen (`opacity:0`) |
| 14 | `r.13` | `div` | — | — | 0 | −10000 | 302 | 157 | off-screen (`opacity:0`) |
| 15 | `r.14` | `input` | — | — | 0 | 1265 | 0 | 0 | no (0×0, z-index −100000) |
| 16 | `r.15` | `div` | — | — | 0 | −10000 | 302 | 157 | off-screen (`opacity:0`) |
| 17 | `r.0.0` | `div` | — | `ng-fadeOutZoom ng-fluid ng-scope` | 0 | 0 | 1842 | 50 | **yes** |
| 19 | `r.12.0` | `div` | — | — | 0 | 0 | 1842 | 1265 | yes but `opacity:0.05` white veil (reCAPTCHA) |
| 20 | `r.12.1` | `div` | — | `g-recaptcha-bubble-arrow` | 1 | −10010 | 22 | 22 | off-screen |
| 21 | `r.12.2` | `div` | — | `g-recaptcha-bubble-arrow` | 1 | −10009 | 20 | 20 | off-screen |
| 22 | `r.12.3` | `div` | — | — | 1 | −9999 | 0 | 0 | no |
| 23 | `r.13.0` | `div` | — | — | 0 | 0 | 1842 | 1265 | `opacity:0.05` veil |
| 24 | `r.13.1` | `div` | — | `g-recaptcha-bubble-arrow` | 1 | −10010 | 22 | 22 | off-screen |
| 25 | `r.13.2` | `div` | — | `g-recaptcha-bubble-arrow` | 1 | −10009 | 20 | 20 | off-screen |
| 26 | `r.13.3` | `div` | — | — | 1 | −9999 | 300 | 155 | off-screen |
| 27 | `r.15.0` | `div` | — | — | 0 | 0 | 1842 | 1265 | `opacity:0.05` veil |
| 28 | `r.15.1` | `div` | — | `g-recaptcha-bubble-arrow` | 1 | −10010 | 22 | 22 | off-screen |
| 29 | `r.15.2` | `div` | — | `g-recaptcha-bubble-arrow` | 1 | −10009 | 20 | 20 | off-screen |
| 30 | `r.15.3` | `div` | — | — | 1 | −9999 | 300 | 155 | off-screen |
| **31** | `r.0.0.0` | **`nav`** | — | `navbar topnavbar` | 0 | 0 | 1842 | 50 | **yes** |
| 32 | `r.0.1.0` | `style` | — | `ng-scope` | 0 | 0 | 0 | 0 | no |
| 34 | `r.0.1.2` | `script` | — | `ng-scope` | 0 | 0 | 0 | 0 | no |
| 35 | `r.12.3.0` | `iframe` | — | — | 1 | −9984 | 0 | 0 | no |
| 36 | `r.13.3.0` | `iframe` | — | — | 1 | −9999 | 300 | 150 | off-screen |
| 37 | `r.15.3.0` | `iframe` | — | — | 1 | −9999 | 300 | 150 | off-screen |
| **38** | `r.0.0.0.0` | `div` | — | `navbar-header` | 0 | 0 | 350 | 50 | **yes** |
| **39** | `r.0.0.0.1` | `div` | — | `nav-wrapper collapse navbar-collapse in` | 0 | 0 | 1842 | 50 | **yes** |
| **41** | `r.0.0.0.0.0` | `div` | — | `navbar-brand` | 15 | 0 | 320 | 50 | **yes** |
| **42** | `r.0.0.0.1.0` | `ul` | — | `nav navbar-nav navbar-right hidden-material` | 1691.6 | 0 | 150.4 | 50 | **yes** |
| **46** | `r.0.0.0.0.0.0` | `a` | — | *(no class attribute)* | 20 | 14.5 | 200 | 21 | **yes** |
| **47** | `r.0.0.0.1.0.0` | `li` | — | *(no attributes at all)* | 1691.6 | 0 | 96.4 | 50 | **yes** |
| **48** | `r.0.0.0.1.0.1` | `li` | — | *(no attributes at all)* | 1788 | 0 | 54 | 50 | **yes** |
| **57** | `r.0.0.0.0.0.0.0` | `img` | — | `brand-logo` | 20 | 14.6 | 200 | 24.5 | **yes** |
| **58** | `r.0.0.0.1.0.0.0` | `a` | — | `icon fa  fa-cog` *(two spaces)* | 1691.6 | 0 | 96.4 | 50 | **yes** |
| **59** | `r.0.0.0.1.0.1.0` | `a` | — | `icon fa fa-2x fa-power-off` | 1788 | 0 | 54 | 50 | **yes** |

Exact widths where the dump gives sub-pixel: `#42` `150.43px`, `#47`/`#58` `96.4297px`, `#57` `199.992px × 24.5391px`.

---

## 4. Every attribute, verbatim

### `#0` `r` `<body>`
```
ng-class = "{\n      'layout-fixed': app.layout.isFixed,\n      'layout-boxed': app.layout.isBoxed,\n      'layout-dock': app.layout.isDocked,\n      'layout-material': app.layout.isMaterial,\n      'aside-offscreen': app.sidebar.isOffscreen,\n      'footer-hidden': app.footer.hidden,\n      'in-app': !$state.includes"
class = "footer-hidden"
cz-shortcut-listen = "true"
```
⚠️ The `ng-class` value is **TRUNCATED by the dumper at 300 characters** — it ends mid-expression at `!$state.includes`. The remainder of the expression is an **honest gap**.
`cz-shortcut-listen="true"` is injected by a browser extension (ColorZilla), not by the app.

### `#1` `r.0` `<div>`
```
data-ui-view    = ""
data-autoscroll = "false"
ng-controller   = "CoreController"
class           = "app-container ng-scope"
```

### `#2`–`#12` `r.1` … `r.11` `<script>` (body-level, in DOM order)
| # | attributes |
|---|---|
| 2 | `src = "/public/dist/vendor.min.js?v=2.18.100"` |
| 3 | *(none)*; inline text (truncated at 250 chars): `"var __h264 = 'false';\n    var __isReg = 'false';\n    if (typeof __h264 === 'boolean') {\n    } else {\n      __h264 = __h264 == 'true' ? true : false;\n    }\n    if (typeof __isReg === 'boolean') {\n    } else {\n      __isReg = __isReg == 'true' ? true :"` |
| 4 | `src = "https://cdnjs.cloudflare.com/ajax/libs/adapterjs/0.15.5/adapter.min.js"`, `integrity = "sha512-8HaugtT+4c0rhgZIggNCv7I2N0u5OuCXQutD91XdRLqtBl4kD5z2B6QmHczDFMpeENZV060Fip3S954njcfv9A=="`, `crossorigin = "anonymous"` |
| 5 | `src = "/public/vendor/janus3.js?v=2.18.100"` |
| 6 | `src = "//vjs.zencdn.net/7.3.0/video.min.js"` |
| 7 | `src = "//cdnjs.cloudflare.com/ajax/libs/videojs-youtube/2.6.0/Youtube.min.js"` |
| 8 | `src = "https://cdnjs.cloudflare.com/ajax/libs/angularjs-toaster/2.2.0/toaster.min.js"` |
| 9 | `src = "https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.4.0/sockjs.min.js"` |
| 10 | `src = "https://w.soundcloud.com/player/api.js"`, `type = "text/javascript"` |
| 11 | `src = "/public/dist/app.min.js?v=1784623769671"` |
| 12 | `type = "text/javascript"`; inline text (truncated at 250 chars): `"var __cver = '1784623769671';\n\n    var ua = navigator.userAgent.toLowerCase();\n\n    var is_chrome = ua.indexOf('chrome') > -1;\n    var is_firefox = ua.indexOf('firefox') > -1;\n    var is_msie = ua.indexOf('msie') > -1 || ua.indexOf('trident') > -1;\n "` |

App build id: `v=2.18.100` (vendor/janus), `?v=1784623769671` (`app.min.js`), `__cver = '1784623769671'`.

### `#13`, `#14`, `#16` `r.12` / `r.13` / `r.15` `<div>` (reCAPTCHA bubble hosts)
All three carry the identical inline style:
```
style = "background-color: rgb(255, 255, 255); border: 1px solid rgb(204, 204, 204); box-shadow: rgba(0, 0, 0, 0.2) 2px 2px 3px; position: absolute; transition: visibility linear 0.3s, opacity 0.3s linear; opacity: 0; visibility: hidden; z-index: 2000000000; left: 0px; top: -10000px;"
```

### `#15` `r.14` `<input>` (hidden ng-file-upload picker — the shell's global one)
```
type       = "file"
ngf-select = "ngf-select"
ngf-change = "onImageSelect($files, '')"
tabindex   = "-1"
style      = "visibility: hidden; position: absolute; overflow: hidden; width: 0px; height: 0px; z-index: -100000; border-width: medium; border-style: none; border-color: currentcolor; border-image: none; margin: 0px; padding: 0px;"
```

### `#17` `r.0.0` `<div>`
```
class = "ng-fadeOutZoom ng-fluid ng-scope"
```

### `#19`/`#23`/`#27` `r.12.0` / `r.13.0` / `r.15.0`
```
style = "width: 100%; height: 100%; position: fixed; top: 0px; left: 0px; z-index: 2000000000; background-color: rgb(255, 255, 255); opacity: 0.05;"
```

### `#20`/`#24`/`#28` (22px arrows) and `#21`/`#25`/`#29` (20px arrows)
```
class = "g-recaptcha-bubble-arrow"
style = "border: 11px solid transparent; width: 0px; height: 0px; position: absolute; pointer-events: none; margin-top: -11px; z-index: 2000000000;"
```
```
class = "g-recaptcha-bubble-arrow"
style = "border: 10px solid transparent; width: 0px; height: 0px; position: absolute; pointer-events: none; margin-top: -10px; z-index: 2000000000;"
```

### `#22` `r.12.3`
```
style = "z-index: 2000000000; position: relative; width: 0px; height: 0px;"
```
### `#26`/`#30` `r.13.3` / `r.15.3`
```
style = "z-index: 2000000000; position: relative;"
```

### `#31` `r.0.0.0` `<nav>` — **the navbar**
```
role  = "navigation"
class = "navbar topnavbar"
style = "background-color: black;"
```
Pseudo-elements (Bootstrap clearfix):
```
::before { content: "\" \""  (U+0022 U+0020 U+0022); color: rgb(51, 51, 51); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 14px; background-color: rgba(0, 0, 0, 0) }
::after  { content: "\" \""  (identical) }
```

### `#32` `r.0.1.0` `<style class="ng-scope">`
Inline CSS, **truncated at 250 chars**:
```
"body {\n    overflow: auto;\n  }\n\n  .intercom-composer-popover-input {\n    font-size-adjust: none;\n    font-size: 100%;\n    font-style: normal;\n    letter-spacing: normal;\n    font-stretch: normal;\n    font-variant: normal;\n    font-weight: 400;\n    fo"
```
⚠️ Honest gap: the rest of this stylesheet was not captured.

### `#34` `r.0.1.2` `<script>`
```
src   = "https://www.google.com/recaptcha/api.js"
class = "ng-scope"
```

### `#35`/`#36`/`#37` reCAPTCHA bframe `<iframe>`s
```
title       = "recaptcha challenge expires in two minutes"
name        = "c-g8o2ifrad64d"   /  "c-nso17np7r7zv"  /  "c-4ecrn9oay2le"
frameborder = "0"
scrolling   = "no"
sandbox     = "allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation allow-modals allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
src         = "https://www.google.com/recaptcha/api2/bframe?hl=en&v=A7KpaEASfhDcK0nXxgQEyyYv&k=6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx&bft=…"
style       = "width: 0px; height: 0px;"  (#35)  /  "width: 100%; height: 100%;"  (#36, #37)
```
reCAPTCHA v2 site key (public, safe to hard-code): `6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx`.

### `#38` `r.0.0.0.0` `<div>`
```
class = "navbar-header"
::before / ::after : content "\" \"", color rgb(51,51,51), font "Helvetica Neue"/14px, background rgba(0,0,0,0)
```

### `#39` `r.0.0.0.1` `<div>`
```
collapse = "headerMenuCollapsed"
class    = "nav-wrapper collapse navbar-collapse in"
style    = "height: auto;"
::before / ::after : content "\" \"", color rgb(51,51,51), font "Helvetica Neue"/14px
```

### `#41` `r.0.0.0.0.0` `<div>`
```
class = "navbar-brand"
```
(no pseudo-elements captured)

### `#42` `r.0.0.0.1.0` `<ul>`
```
class   = "nav navbar-nav navbar-right hidden-material"
ng-show = "login.isLoggedIn"
style   = ""            ← empty string, present in the DOM
::before / ::after : content "\" \"", color rgb(51,51,51), font "Helvetica Neue"/14px
```
`ng-show="login.isLoggedIn"` is **satisfied** here: `#42` has no `ng-hide` class and resolves to `display:block`, i.e. the capture is a logged-in session.

### `#46` `r.0.0.0.0.0.0` `<a>`
```
href = ""
```
(That is the *entire* attribute set. Empty `href` — clicking it re-navigates to the current URL.)

### `#47` / `#48` `<li>`
```
attrs: (none)
```

### `#57` `r.0.0.0.0.0.0.0` `<img class="brand-logo">`
```
ng-hide = "hideLogo || !sess.logoURL"
ng-src  = "/public/images/ptr_logo.png"
height  = "35px"                        ← invalid HTML height (has a unit); browser ignores it
class   = "brand-logo"
style   = "max-width: 200px; height: auto; max-height: 40px;"
src     = "/public/images/ptr_logo.png"
```
Note: `ng-hide="hideLogo || !sess.logoURL"` evaluates **false** here (the element has no `ng-hide` class and renders), i.e. on `page.welcome` `sess.logoURL` is truthy / `hideLogo` falsy. No `width`/`height` attribute pair in px → the image is a **CLS risk**; the rebuild must set explicit `width`/`height`.

### `#58` `r.0.0.0.1.0.0.0` `<a>` — Account
```
href              = "#/page/welcome"
ui-sref           = "page.welcome"
style             = "color: #FFFFFF"
class             = "icon fa  fa-cog"        ← NOTE the DOUBLE SPACE between "fa" and "fa-cog"
tooltip-placement = "bottom"
tooltip           = "Account Settings"
text              = "Account"
::before { content: "" (U+F013, FontAwesome fa-cog); color: rgb(255, 255, 255); font-family: FontAwesome; font-size: 14px; background-color: rgba(0, 0, 0, 0) }
```
This is the element that names the route: **`tooltip="Account Settings"` → the page we are decoding.**

### `#59` `r.0.0.0.1.0.1.0` `<a>` — Logout
```
href              = ""
ng-click          = "doLogout()"
style             = "color: #FFFFFF"
class             = "icon fa fa-2x fa-power-off"
tooltip-placement = "bottom"
tooltip           = "Logout"
(no text node)
::before { content: "" (U+F011, FontAwesome fa-power-off); color: rgb(255, 255, 255); font-family: FontAwesome; font-size: 28px; background-color: rgba(0, 0, 0, 0) }
```

---

## 5. Resolved computed style — every rendering node (absolute values)

### `#0` `<body class="footer-hidden">`
| prop | value |
|---|---|
| display | `block` |
| visibility | `visible` |
| position | `static` (top/right/bottom/left `auto`) |
| float | `none` · box-sizing `border-box` · z-index `auto` |
| width / height | `1842px` / `1265px` (min-width 0, max-width none, min-height 0, max-height none) |
| margin T/R/B/L | `0px / 0px / 0px / 0px` |
| padding T/R/B/L | `0px / 0px / 0px / 0px` |
| border-width T/R/B/L | `0px / 0px / 0px / 0px` |
| border-style T/R/B/L | `none / none / none / none` |
| border-color T/R/B/L | `rgb(51, 51, 51)` ×4 |
| radius TL/TR/BL/BR | `0px / 0px / 0px / 0px` |
| background-color | `rgb(255, 255, 255)` (background-image `none`) |
| color | `rgb(51, 51, 51)` |
| font-family | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| font-size / weight | `14px` / `400` (font-style `normal`) |
| line-height | `20px` |
| letter-spacing | `normal` |
| text-align | `start` |
| vertical-align | `baseline` |
| white-space | `normal` |
| overflow-x / -y | `auto` / `auto` |
| opacity | `1` |
| box-shadow | `none` |
| cursor | `auto` |
| transition | `all 0s` |

### `#1` `<div class="app-container ng-scope">`
`display:block` · `visibility:visible` · `position:relative` with `top:0px right:0px bottom:0px left:0px` · `z-index:auto` · `float:none` · `width:1842px` `height:1265px` `min-height:100%` · margin `0/0/0/0` · padding `0/0/0/0` · border-width `0/0/0/0`, style `none`×4, color `rgb(51,51,51)`×4 · radius `0`×4 · background-color `rgba(0, 0, 0, 0)` · color `rgb(51,51,51)` · font `"Helvetica Neue", Helvetica, Arial, sans-serif` / `14px` / `400` / line-height `20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible/visible` · opacity `1` · box-shadow `none` · cursor `auto` · transition `all 0s`.

### `#17` `<div class="ng-fadeOutZoom ng-fluid ng-scope">` — navbar wrapper
`display:block` · `visibility:visible` · `position:static` · `float:none` · `width:1842px` `height:50px` · margin `0`×4 · padding `0`×4 · border-width `0`×4 / style `none`×4 / color `rgb(51,51,51)`×4 · radius `0`×4 · background-color `rgba(0, 0, 0, 0)` · color `rgb(51,51,51)` · font `"Helvetica Neue", …` `14px` `400` / `20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible/visible` · opacity `1` · box-shadow `none` · cursor `auto` · transition `all 0s`.

### `#31` `<nav role="navigation" class="navbar topnavbar" style="background-color: black;">`
| prop | value |
|---|---|
| display / visibility | `block` / `visible` |
| position | `relative`, `top:0px right:0px bottom:0px left:0px`, z-index `auto` |
| float | `none` |
| width / height / min-height | `1842px` / `50px` / **`50px`** |
| margin T/R/B/L | `0px / 0px / 0px / 0px` |
| padding T/R/B/L | `0px / 0px / 0px / 0px` |
| border-width / style / colour | `0px`×4 / `none`×4 / `rgb(51, 51, 51)`×4 |
| radius | `0px`×4 |
| **background-color** | **`rgb(0, 0, 0)`** (from the inline `background-color: black`) |
| color | `rgb(51, 51, 51)` |
| font-family / size / weight | `"Helvetica Neue", Helvetica, Arial, sans-serif` / `14px` / `400` |
| line-height | `20px` |
| letter-spacing / text-align / vertical-align | `normal` / `start` / `baseline` |
| white-space / overflow | `normal` / `visible`, `visible` |
| opacity / box-shadow / cursor | `1` / `none` / `auto` |
| ::before, ::after | `content:" "` — Bootstrap `.navbar` clearfix, `display:table` |

### `#38` `<div class="navbar-header">`
`display:block` · `visible` · `position:relative` `0/0/0/0` · **`z-index:1`** · **`float:left`** · `width:350px` `height:50px` · margin `0`×4 · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)` ×4 · radius `0`×4 · background `rgba(0,0,0,0)` · color `rgb(51,51,51)` · font Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`. Clearfix `::before`/`::after` `content:" "`.

### `#39` `<div class="nav-wrapper collapse navbar-collapse in" style="height: auto;">`
`display:block` · `visible` · `position:relative` `0/0/0/0` · `float:none` · `width:1842px` `height:50px` · margin `0`×4 · **padding `0px / 15px / 0px / 15px`** · border `0`/`none`/`rgb(51,51,51)` ×4 · radius `0`×4 · background `rgba(0,0,0,0)` · color `rgb(51,51,51)` · font Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`. Clearfix pseudos.

### `#41` `<div class="navbar-brand">`
| prop | value |
|---|---|
| display / visibility | `block` / `visible` |
| position | `relative`, `0/0/0/0`, **z-index `1`** |
| float | `none` |
| width / height | `320px` / `50px` |
| margin T/R/B/L | `0px / 15px / 0px / 15px` |
| padding T/R/B/L | **`0px / 5px / 0px / 5px`** |
| border-width / style | `0px`×4 / `none`×4 |
| border-colour | **`rgb(250, 250, 250)`**×4 |
| radius | `0px`×4 |
| background-color | `rgba(0, 0, 0, 0)` |
| **color** | **`rgb(250, 250, 250)`** |
| font-family / size / weight | `"Helvetica Neue", Helvetica, Arial, sans-serif` / **`18px`** / `400` |
| **line-height** | **`50px`** (vertically centres the 50px bar) |
| letter-spacing / text-align / vertical-align | `normal` / `start` / `baseline` |
| white-space / overflow / opacity / box-shadow / cursor | `normal` / `visible` / `1` / `none` / `auto` |
| outline-color | `rgb(250, 250, 250)` |

### `#42` `<ul class="nav navbar-nav navbar-right hidden-material" ng-show="login.isLoggedIn" style="">`
`display:block` · `visible` · `position:static` · **`float:right`** · `width:150.43px` `height:50px` · margin `0px / -15px / 0px / 0px` · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)` ×4 · radius `0`×4 · background `rgba(0,0,0,0)` · color `rgb(51,51,51)` · font Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto` · **`list-style-type: none`**. Clearfix pseudos.

### `#46` `<a href="">` (the brand anchor wrapping the logo)
`display:inline` · `visible` · `position:static` · `float:none` · width `auto` / height `auto` (**rendered box 200 × 21 at x=20 y=14.5**) · margin `0`×4 · padding `0`×4 · border-width `0`×4 / style `none`×4 / **colour `rgb(51, 122, 183)`×4** · radius `0`×4 · background `rgba(0,0,0,0)` · **color `rgb(51, 122, 183)`** · font `"Helvetica Neue", …` / **`18px`** / `400` · **line-height `50px`** · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · **cursor `pointer`** · outline-color `rgb(51, 122, 183)`.

### `#47` `<li>` (Account) / `#48` `<li>` (Logout)
Identical except width: `display:block` · `visible` · `position:relative` `0/0/0/0` · **`float:left`** · width **`96.4297px`** (`#47`) / **`54px`** (`#48`) · height `50px` · margin `0`×4 · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · background `rgba(0,0,0,0)` · color `rgb(51,51,51)` · font Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto` · `list-style-type: none`.

### `#57` `<img class="brand-logo">`
| prop | value |
|---|---|
| display / visibility | **`inline-block`** / `visible` |
| position / float | `static` / `none` |
| width / height | **`199.992px` / `24.5391px`** (max-width `200px`, max-height `40px`) |
| margin / padding | `0px`×4 / `0px`×4 |
| border-width / style / colour | `0px`×4 / `none`×4 / `rgb(51, 122, 183)`×4 |
| radius | `0px`×4 |
| background-color | `rgba(0, 0, 0, 0)` |
| color | `rgb(51, 122, 183)` |
| font-family / size / weight | `"Helvetica Neue", …` / `18px` / `400` |
| line-height | `50px` |
| letter-spacing / text-align | `normal` / `start` |
| **vertical-align** | **`middle`** |
| white-space | `normal` |
| overflow-x / -y | **`clip` / `clip`** |
| opacity / box-shadow | `1` / `none` |
| **cursor** | **`pointer`** |
| object-fit | `fill` |

Rendered position: x = 20, y = 14.6 → the logo is inset 20px from the left edge and vertically centred in the 50px bar ((50 − 24.54)/2 ≈ 12.7; the actual 14.6 comes from the 50px line-box baseline).

### `#58` `<a class="icon fa  fa-cog">Account`
| prop | value |
|---|---|
| display / visibility | **`block`** / `visible` |
| position | `relative`, `0/0/0/0`, z-index `auto` |
| float | `none` |
| width / height | `96.4297px` / `50px` |
| margin T/R/B/L | `0px`×4 |
| **padding T/R/B/L** | **`15px / 15px / 15px / 15px`** |
| border-width / style | `0px`×4 / `none`×4 |
| border-colour | `rgb(255, 255, 255)`×4 |
| radius | `0px`×4 |
| background-color | `rgba(0, 0, 0, 0)` |
| **color** | **`rgb(255, 255, 255)`** |
| **font-family** | **`FontAwesome`** (inherited by the text node too) |
| font-size / weight | `14px` / `400` |
| line-height | `20px` |
| letter-spacing / text-align / vertical-align | `normal` / `start` / `baseline` |
| white-space / overflow | `normal` / `visible` |
| opacity / box-shadow | `1` / `none` |
| **cursor** | **`pointer`** |
| transform | `matrix(1, 0, 0, 1, 0, 0)` |
| list-style-type | `none` |
| ::before | `content:"\F013"`, `color: rgb(255,255,255)`, `font-family: FontAwesome`, `font-size: 14px` |

### `#59` `<a class="icon fa fa-2x fa-power-off">` (no text)
Same as `#58` except: `width: 54px`; **`font-size: 28px`** (the `.fa-2x` rule — resolved from the COMMON table, matching ptr1's explicit `font-size: 28px`); no text node; `::before content:"\F011"` at `font-size: 28px`.

---

## 6. Verbatim text

| path | element | text (verbatim) |
|---|---|---|
| `r.0.0.0.1.0.0.0` (`#58`) | `<a class="icon fa  fa-cog">` | `Account` |
| `r.0.0.0.1.0.1.0` (`#59`) | `<a class="icon fa fa-2x fa-power-off">` | *(none — icon only)* |
| `r.2` (`#3`) | `<script>` | `var __h264 = 'false';\n    var __isReg = 'false';\n    if (typeof __h264 === 'boolean') {\n    } else {\n      __h264 = __h264 == 'true' ? true : false;\n    }\n    if (typeof __isReg === 'boolean') {\n    } else {\n      __isReg = __isReg == 'true' ? true :` ⚠️ **TRUNCATED at 250 chars** |
| `r.11` (`#12`) | `<script>` | `var __cver = '1784623769671';\n\n    var ua = navigator.userAgent.toLowerCase();\n\n    var is_chrome = ua.indexOf('chrome') > -1;\n    var is_firefox = ua.indexOf('firefox') > -1;\n    var is_msie = ua.indexOf('msie') > -1 \|\| ua.indexOf('trident') > -1;\n ` ⚠️ **TRUNCATED at 250 chars** |
| `r.0.1.0` (`#32`) | `<style class="ng-scope">` | `body {\n    overflow: auto;\n  }\n\n  .intercom-composer-popover-input {\n    font-size-adjust: none;\n    font-size: 100%;\n    font-style: normal;\n    letter-spacing: normal;\n    font-stretch: normal;\n    font-variant: normal;\n    font-weight: 400;\n    fo` ⚠️ **TRUNCATED at 250 chars** |

**The navbar renders exactly two strings of visible text: `Account`, plus the two FontAwesome PUA glyphs U+F013 and U+F011.** There is no brand *text* — only the `ptr_logo.png` image.

---

## 7. Rebuild spec (pixel-for-pixel)

```html
<body class="footer-hidden">
  <div class="app-container" data-ui-view data-autoscroll="false">

    <!-- navbar wrapper: r.0.0 -->
    <div class="ng-fadeOutZoom ng-fluid">
      <nav role="navigation" class="navbar topnavbar" style="background-color: black;">

        <div class="navbar-header">
          <div class="navbar-brand">
            <a href="">
              <img class="brand-logo"
                   src="/public/images/ptr_logo.png"
                   width="200" height="25"          <!-- ADD: reference has none → CLS -->
                   style="max-width:200px; height:auto; max-height:40px;" alt="ProTradingRoom">
            </a>
          </div>
        </div>

        <div class="nav-wrapper collapse navbar-collapse in" style="height:auto;">
          <ul class="nav navbar-nav navbar-right hidden-material">
            <li><a href="#/page/welcome" class="icon fa  fa-cog"
                   style="color:#FFFFFF" title="Account Settings">Account</a></li>
            <li><a href="" class="icon fa fa-2x fa-power-off"
                   style="color:#FFFFFF" title="Logout"></a></li>
          </ul>
        </div>

      </nav>
    </div>

    <div class="ng-fluid" data-ui-view><!-- page content: see Q07 --></div>
  </div>
</body>
```

```css
/* Exact resolved values — no CSS custom properties exist in the reference. */
html, body            { margin:0; padding:0; }
body.footer-hidden    { width:1842px; height:1265px;        /* = viewport */
                        background:#fff; color:#333;
                        font:400 14px/20px "Helvetica Neue",Helvetica,Arial,sans-serif;
                        text-align:start; overflow:auto; box-sizing:border-box; }
*                     { box-sizing:border-box; }

.app-container        { position:relative; inset:0; width:1842px; height:1265px;
                        min-height:100%; margin:0; padding:0; background:transparent; }

/* navbar wrapper */
.ng-fadeOutZoom.ng-fluid { display:block; width:1842px; height:50px; margin:0; padding:0; }

nav.navbar.topnavbar  { display:block; position:relative; inset:0;
                        width:1842px; height:50px; min-height:50px;
                        margin:0; padding:0; border:0; border-radius:0;
                        background-color:#000;                  /* rgb(0,0,0) */
                        color:#333; font:400 14px/20px "Helvetica Neue",Helvetica,Arial,sans-serif;
                        letter-spacing:normal; text-align:start; vertical-align:baseline;
                        white-space:normal; overflow:visible; opacity:1; box-shadow:none;
                        cursor:auto; }
nav.navbar.topnavbar::before,
nav.navbar.topnavbar::after,
.navbar-header::before, .navbar-header::after,
.nav-wrapper::before,   .nav-wrapper::after,
.nav.navbar-nav::before,.nav.navbar-nav::after { content:" "; display:table; }
nav.navbar.topnavbar::after,
.navbar-header::after, .nav-wrapper::after, .nav.navbar-nav::after { clear:both; }

.navbar-header        { position:relative; inset:0; z-index:1; float:left;
                        width:350px; height:50px; margin:0; padding:0; }

.navbar-brand         { position:relative; inset:0; z-index:1;
                        width:320px; height:50px;
                        margin:0 15px; padding:0 5px;
                        color:#fafafa; border-color:#fafafa; outline-color:#fafafa;
                        font-size:18px; font-weight:400; line-height:50px; }

.navbar-brand > a     { display:inline; margin:0; padding:0;
                        color:#337ab7; border-color:#337ab7; outline-color:#337ab7;
                        font-size:18px; font-weight:400; line-height:50px;
                        text-align:start; vertical-align:baseline; cursor:pointer; }

img.brand-logo        { display:inline-block;
                        width:199.992px; height:24.5391px;   /* natural 200×24.54 */
                        max-width:200px; max-height:40px;
                        margin:0; padding:0; border:0;
                        color:#337ab7; font-size:18px; line-height:50px;
                        vertical-align:middle; overflow:clip; cursor:pointer;
                        object-fit:fill; }

.nav-wrapper.navbar-collapse.in { position:relative; inset:0;
                        width:1842px; height:50px; margin:0; padding:0 15px; }

ul.nav.navbar-nav.navbar-right  { float:right; width:150.43px; height:50px;
                        margin:0 -15px 0 0; padding:0; list-style-type:none; }

ul.nav.navbar-nav > li          { position:relative; inset:0; float:left;
                        height:50px; margin:0; padding:0; list-style-type:none; }
ul.nav.navbar-nav > li:nth-child(1) { width:96.4297px; }
ul.nav.navbar-nav > li:nth-child(2) { width:54px; }

ul.nav.navbar-nav > li > a      { display:block; position:relative; inset:0;
                        height:50px; margin:0; padding:15px;
                        color:#fff; border-color:#fff; outline-color:#fff;
                        font-family:FontAwesome; font-weight:400; line-height:20px;
                        text-align:start; vertical-align:baseline;
                        white-space:normal; cursor:pointer;
                        transform:matrix(1,0,0,1,0,0); list-style-type:none;
                        background:transparent; border-width:0; border-radius:0; }
ul.nav.navbar-nav > li:nth-child(1) > a { width:96.4297px; font-size:14px; }
ul.nav.navbar-nav > li:nth-child(2) > a { width:54px;      font-size:28px; }

/* FontAwesome 4 glyphs, exact codepoints from the capture */
ul.nav.navbar-nav > li:nth-child(1) > a::before { content:"\f013"; font-family:FontAwesome;
                        font-size:14px; color:#fff; }   /* fa-cog        */
ul.nav.navbar-nav > li:nth-child(2) > a::before { content:"\f011"; font-family:FontAwesome;
                        font-size:28px; color:#fff; }   /* fa-power-off  */
```

Geometry checks that must hold in the rebuild:
* `nav` box `0,0 → 1842×50`, background `#000`.
* logo `20, 14.6 → 200×24.5`.
* `ul` right-floated, left edge at **x = 1691.6**; `li#1` `1691.6 → 96.43` wide; `li#2` starts at **x = 1788**, 54 wide, right edge `1842`.
  (1842 − 15 padding − (−15 margin) is absorbed by the `margin-right:-15px` on the `ul`; the resulting `ul` right edge sits flush at 1842.)
* Body-level shell siblings (`r.1`–`r.15`) are scripts / a hidden `input[type=file]` / reCAPTCHA scaffolding — **do not port them** except the file input if the badge upload is rebuilt.

---

## 8. ptr1 vs prt2 — is the navbar identical? **YES.**

Every navbar node was compared record-by-record after resolving both captures' different COMMON tables (ptr1's COMMON is `display:block / visibility:visible / width:auto / padding:0 / cursor:auto / font 14px "Helvetica Neue"`; prt2's is emoji-skewed as described above).

| node | ptr1 record | prt2 record | attributes | rect | resolved style |
|---|---|---|---|---|---|
| `<nav class="navbar topnavbar" style="background-color: black;">` | `#20` `r.0.0.0` | `#31` `r.0.0.0` | **identical** (`role`, `class`, `style`) | `0,0 1842×50` = `0,0 1842×50` | **identical** (`position:relative`, inset 0, min-height 50, bg `rgb(0,0,0)`); same `::before`/`::after` `content:" "` |
| `div.ng-fadeOutZoom.ng-fluid.ng-scope` | `#14` `r.0.0` | `#17` `r.0.0` | identical | `0,0 1842×50` both | identical |
| `div.navbar-header` | `#24` | `#38` | identical | `0,0 350×50` both | identical (`z-index:1`, `float:left`) |
| `div.nav-wrapper.collapse.navbar-collapse.in` | `#25` | `#39` | identical incl. `collapse="headerMenuCollapsed"` and `style="height: auto;"` | `0,0 1842×50` both | identical (`padding:0 15px`) |
| `div.navbar-brand` | `#28` | `#41` | identical | `15,0 320×50` both | identical → **padding resolves to `0 5px` in BOTH** (ptr1 lists `padding-right/left:5px`, prt2 lists `padding-top/bottom:0px`; different *deviation* lists, same *resolved* value) |
| `ul.nav.navbar-nav.navbar-right.hidden-material` | `#29` | `#42` | identical incl. `ng-show="login.isLoggedIn"` and `style=""` | `1691.6,0 150.43×50` both | identical (`float:right`, `margin-right:-15px`) |
| `a[href=""]` (brand anchor) | `#34` | `#46` | identical (`href=""` only) | `20,14.5 200×21` both | identical (`display:inline`, `#337ab7`, 18px/50px, `cursor:pointer`) |
| `li` #1 / `li` #2 | `#35` / `#36` | `#47` / `#48` | both `attrs: (none)` | `1691.6,0 96.4297×50` and `1788,0 54×50` — **identical to the sub-pixel** | identical |
| `img.brand-logo` | `#43` | `#57` | **identical** — same `ng-hide`, `ng-src`, `height="35px"`, `class`, inline `style`, `src` | `20,14.6 199.992×24.5391` — **identical to 4 decimals** | identical (incl. `vertical-align:middle`, `overflow:clip`, `cursor:pointer`) |
| `a.icon.fa..fa-cog` "Account" | `#44` | `#58` | **identical**, including the **double space** in `class="icon fa  fa-cog"` and `tooltip="Account Settings"` | `1691.6,0 96.4297×50` both | identical; `::before content "\F013"` `#fff` FontAwesome 14px in both |
| `a.icon.fa.fa-2x.fa-power-off` | `#45` | `#59` | **identical**, `ng-click="doLogout()"`, `tooltip="Logout"` | `1788,0 54×50` both | identical; `font-size:28px` in both (ptr1 lists it explicitly; prt2 inherits it from its COMMON table); `::before content "\F011"` `#fff` FontAwesome 28px in both |
| `<body class="footer-hidden">` | `#0` | `#0` | identical `ng-class` (both truncated at the same point), `class`, `cz-shortcut-listen` | `0,0 1842×1265` both | identical (`#fff`, `overflow:auto/auto`) |
| `div.app-container.ng-scope` | `#1` | `#1` | identical | `0,0 1842×1265` both | identical (`position:relative`, inset 0, `min-height:100%`) |

**Verdict: the navbar and the body/app-container shell are 100 % identical between ptr1 (`/session` room page) and prt2 (`#/page/welcome`). It is per-app chrome, not per-page.** Build it once as a SvelteKit layout.

Differences found **outside** the navbar (for completeness — they belong to Q07 / other pieces):
* `r.0.1` page `ui-view`: ptr1 `height 772.766px` vs prt2 `height 1069.99px`; ptr1 class `ng-fluid ng-scope`, prt2 class `ng-fluid ng-scope` (same) — only the height differs.
* `r.0.1.0 <style>`: ptr1 text is only `body {\n        overflow: auto;\n    }`; prt2 additionally injects Intercom `.intercom-composer-popover-input` rules (truncated).
* `r.0.1.1`: ptr1 `style="background-color: 0A0A0A; "` (trailing space) and **no** `ng-init`; prt2 `style="background-color: 0A0A0A"` **plus** `ng-init="showNewRoom=0;"`.
* prt2 has a `<script src="https://www.google.com/recaptcha/api.js" class="ng-scope">` at `r.0.1.2` that ptr1 does not have at that path.

---

## 9. Honest gaps

1. **`body[ng-class]` is truncated at 300 characters** (`… 'in-app': !$state.includes`). The tail of that AngularJS expression is not in the evidence.
2. **`<script>` inline sources and the `<style class="ng-scope">` block are truncated at 250 characters.** The full contents of `r.2`, `r.11` and `r.0.1.0` are unknown.
3. **`ptr_logo.png` itself is not in the dump** — only its URL, box (200 × 24.539) and `max-width/max-height` constraints. The artwork must be fetched from `/public/images/ptr_logo.png`; it cannot be reconstructed from the evidence.
4. **The FontAwesome font file is not in the dump.** The glyph codepoints (U+F013, U+F011) are captured exactly, but the rebuild must ship FontAwesome 4 (or map to an equivalent icon set and accept a glyph-shape diff).
5. **No hover/focus/active state was captured** for `.navbar-brand a`, `li > a`, or the logo. Only the resting state is evidence.
6. **`tooltip` / `tooltip-placement` are AngularJS-UI-Bootstrap directives, not native `title`.** The rendered tooltip popover was not open at capture time, so its box/style is an honest gap; the rebuild above substitutes native `title` which will differ visually on hover.
7. The `::before`/`::after` on `.navbar`, `.navbar-header`, `.nav-wrapper`, `.nav` are captured only as `content`, `color`, `font-family`, `font-size`, `background-color`. Their `display:table` / `clear:both` values are **not** in the dump — they are asserted in the rebuild from the captured `content:" "` plus the fact that Bootstrap 3's `.clearfix` is the only rule that produces that exact content on those four selectors (stylesheet index confirms `bootstrap.min.css` is loaded, `01-stylesheets/02.css`, 1187 rules).
