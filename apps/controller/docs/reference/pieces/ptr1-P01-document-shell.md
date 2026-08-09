# ptr1 · P01 — Document shell

**Capture:** `/tmp/ptr-decode/ptr1/caps/00-baseline-room/` — `DEFAULTS.txt` + `nodes-000.txt`…`nodes-017.txt`, 2,156 records
**Page:** `https://protradingroom.com/ptrApp#/page/manageSession/6a628a99731b9f77ae9bf505` (Manage Room, room 3625)
**Capture meta (`INFO.txt` lines 1–9):** `capture index : 0`, `label : baseline-room`, `ts : 2026-07-24T15:59:18.276Z`, `kind : fullDom`, `node count : 2156 (declared 2156, truncated=false)`, `themeClass : "footer-hidden"`, `viewport : {"w":1842,"h":1265,"dpr":2}`, `cssVars : {"root":{},"body":{}}`, `emitted as : FULL node dump`

> **Every computed value in this file is the RESOLVED ABSOLUTE value** = the `DEFAULTS.txt` COMMON table overridden by that node's `style-deviations`. You do not need `DEFAULTS.txt` to read this document.

---

## 1. Purpose

This piece is the outermost scaffolding of the page: the `<body>` root of the capture, the 11 `<script>` tags that boot the AngularJS app, the single injected `<style class="ng-scope">` that sets `body { overflow: auto }`, the `div.app-container` that hosts the whole SPA, and the off-screen Google reCAPTCHA v2 invisible-badge subtree (`r.12`). Nothing here is visible chrome except `div.app-container` itself, which is the 1842×1265 positioning context for the navbar (P02) and the routed page (P03–P05).

## 2. Path anchors and record count

| anchor | records found | contents |
|---|---|---|
| `r` | 1 | `<body>` |
| `r.1` … `r.11` | 11 | the `<script>` elements |
| `r.0` | 1 | `div.app-container` |
| `r.0.0` | 1 | navbar host wrapper (its child `r.0.0.0` is P02) |
| `r.0.1` | 1 | `ui-view` router outlet (its child `r.0.1.1` is P03) |
| `r.0.1.0` | 1 | injected `<style class="ng-scope">` |
| `r.12`, `r.12.0`–`r.12.3`, `r.12.3.0` | 6 | Google reCAPTCHA bubble + challenge `<iframe>` |
| **total** | **22** | |

**Correction to the brief (evidence-driven):** the brief says "the 12 `<script>` nodes `r.1`–`r.11`". The capture contains **11** `<script>` elements, at paths `r.1` through `r.11` inclusive (`#2`–`#12`). There is no `r.13` and no twelfth script anywhere in the 2,156 records. `r.12` is a `<div>`, not a script.

**Structure of the shell (document order, derived from paths):**

```
<body class="footer-hidden">                            #0   r
├── <div class="app-container ng-scope">                #1   r.0
│   ├── <div class="ng-fadeOutZoom ng-fluid ng-scope">  #14  r.0.0     ← hosts the navbar (P02)
│   │   └── <nav class="navbar topnavbar">              #20  r.0.0.0   ← P02
│   └── <div ui-view class="ng-fluid ng-scope">         #15  r.0.1     ← router outlet
│       ├── <style class="ng-scope">                    #21  r.0.1.0
│       └── <div ui-view class="ng-fadeOutZoom …">      #22  r.0.1.1   ← P03
├── <script src="/public/dist/vendor.min.js?v=2.18.100">       #2  r.1
├── <script>  (inline, truncated)                              #3  r.2
├── <script src="…adapterjs/0.15.5/adapter.min.js">            #4  r.3
├── <script src="/public/vendor/janus3.js?v=2.18.100">         #5  r.4
├── <script src="//vjs.zencdn.net/7.3.0/video.min.js">         #6  r.5
├── <script src="//…videojs-youtube/2.6.0/Youtube.min.js">     #7  r.6
├── <script src="…angularjs-toaster/2.2.0/toaster.min.js">     #8  r.7
├── <script src="…sockjs-client/1.4.0/sockjs.min.js">          #9  r.8
├── <script src="https://w.soundcloud.com/player/api.js">      #10 r.9
├── <script src="/public/dist/app.min.js?v=1784623769671">     #11 r.10
├── <script type="text/javascript"> (inline, truncated)        #12 r.11
└── <div style="…z-index:2000000000…">  reCAPTCHA bubble       #13 r.12
    ├── <div>  full-screen dimmer                              #16 r.12.0
    ├── <div class="g-recaptcha-bubble-arrow"> 22px            #17 r.12.1
    ├── <div class="g-recaptcha-bubble-arrow"> 20px            #18 r.12.2
    └── <div>                                                  #19 r.12.3
        └── <iframe title="recaptcha challenge …">             #23 r.12.3.0
```

---

## 3–5. Node table, verbatim attributes, resolved absolute computed styles

### Node table

| # | path | tag | id | class | rect x,y,w,h | renders |
|---|---|---|---|---|---|---|
| 0 | `r` | `<body>` | — | `footer-hidden` | 0, 0, 1842, 1265 | YES |
| 1 | `r.0` | `<div>` | — | `app-container ng-scope` | 0, 0, 1842, 1265 | YES |
| 2 | `r.1` | `<script>` | — | `—` | 0, 0, 0, 0 | NO (display:none) |
| 3 | `r.2` | `<script>` | — | `—` | 0, 0, 0, 0 | NO (display:none) |
| 4 | `r.3` | `<script>` | — | `—` | 0, 0, 0, 0 | NO (display:none) |
| 5 | `r.4` | `<script>` | — | `—` | 0, 0, 0, 0 | NO (display:none) |
| 6 | `r.5` | `<script>` | — | `—` | 0, 0, 0, 0 | NO (display:none) |
| 7 | `r.6` | `<script>` | — | `—` | 0, 0, 0, 0 | NO (display:none) |
| 8 | `r.7` | `<script>` | — | `—` | 0, 0, 0, 0 | NO (display:none) |
| 9 | `r.8` | `<script>` | — | `—` | 0, 0, 0, 0 | NO (display:none) |
| 10 | `r.9` | `<script>` | — | `—` | 0, 0, 0, 0 | NO (display:none) |
| 11 | `r.10` | `<script>` | — | `—` | 0, 0, 0, 0 | NO (display:none) |
| 12 | `r.11` | `<script>` | — | `—` | 0, 0, 0, 0 | NO (display:none) |
| 13 | `r.12` | `<div>` | — | `—` | 0, -10000, 2, 2 | NO (visibility:hidden) |
| 14 | `r.0.0` | `<div>` | — | `ng-fadeOutZoom ng-fluid ng-scope` | 0, 0, 1842, 50 | YES |
| 15 | `r.0.1` | `<div>` | — | `ng-fluid ng-scope` | 0, 50, 1842, 772.8 | YES |
| 16 | `r.12.0` | `<div>` | — | `—` | 0, 0, 1842, 1265 | NO (visibility:hidden) |
| 17 | `r.12.1` | `<div>` | — | `g-recaptcha-bubble-arrow` | 1, -10010, 22, 22 | NO (visibility:hidden) |
| 18 | `r.12.2` | `<div>` | — | `g-recaptcha-bubble-arrow` | 1, -10009, 20, 20 | NO (visibility:hidden) |
| 19 | `r.12.3` | `<div>` | — | `—` | 1, -9999, 0, 0 | NO (visibility:hidden) |
| 21 | `r.0.1.0` | `<style>` | — | `ng-scope` | 0, 0, 0, 0 | NO (display:none) |
| 23 | `r.12.3.0` | `<iframe>` | — | `—` | 1, -9984, 0, 0 | NO (visibility:hidden) |

### Attributes (verbatim) & text

**#0 `r` `<body>`**

- `ng-class` = "{\n      'layout-fixed': app.layout.isFixed,\n      'layout-boxed': app.layout.isBoxed,\n      'layout-dock': app.layout.isDocked,\n      'layout-material': app.layout.isMaterial,\n      'aside-offscreen': app.sidebar.isOffscreen,\n      'footer-hidden': app.footer.hidden,\n      'in-app': !$state.includes"
- `class` = "footer-hidden"
- `cz-shortcut-listen` = "true"

**#1 `r.0` `<div>`**

- `data-ui-view` = ""
- `data-autoscroll` = "false"
- `ng-controller` = "CoreController"
- `class` = "app-container ng-scope"

**#2 `r.1` `<script>`**

- `src` = "/public/dist/vendor.min.js?v=2.18.100"

**#3 `r.2` `<script>`**

- _(no attributes)_
- **text** = "var __h264 = 'false';\n    var __isReg = 'false';\n    if (typeof __h264 === 'boolean') {\n    } else {\n      __h264 = __h264 == 'true' ? true : false;\n    }\n    if (typeof __isReg === 'boolean') {\n    } else {\n      __isReg = __isReg == 'true' ? true :"

**#4 `r.3` `<script>`**

- `src` = "https://cdnjs.cloudflare.com/ajax/libs/adapterjs/0.15.5/adapter.min.js"
- `integrity` = "sha512-8HaugtT+4c0rhgZIggNCv7I2N0u5OuCXQutD91XdRLqtBl4kD5z2B6QmHczDFMpeENZV060Fip3S954njcfv9A=="
- `crossorigin` = "anonymous"

**#5 `r.4` `<script>`**

- `src` = "/public/vendor/janus3.js?v=2.18.100"

**#6 `r.5` `<script>`**

- `src` = "//vjs.zencdn.net/7.3.0/video.min.js"

**#7 `r.6` `<script>`**

- `src` = "//cdnjs.cloudflare.com/ajax/libs/videojs-youtube/2.6.0/Youtube.min.js"

**#8 `r.7` `<script>`**

- `src` = "https://cdnjs.cloudflare.com/ajax/libs/angularjs-toaster/2.2.0/toaster.min.js"

**#9 `r.8` `<script>`**

- `src` = "https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.4.0/sockjs.min.js"

**#10 `r.9` `<script>`**

- `src` = "https://w.soundcloud.com/player/api.js"
- `type` = "text/javascript"

**#11 `r.10` `<script>`**

- `src` = "/public/dist/app.min.js?v=1784623769671"

**#12 `r.11` `<script>`**

- `type` = "text/javascript"
- **text** = "var __cver = '1784623769671';\n\n    var ua = navigator.userAgent.toLowerCase();\n\n    var is_chrome = ua.indexOf('chrome') > -1;\n    var is_firefox = ua.indexOf('firefox') > -1;\n    var is_msie = ua.indexOf('msie') > -1 || ua.indexOf('trident') > -1;\n "

**#13 `r.12` `<div>`**

- `style` = "background-color: rgb(255, 255, 255); border: 1px solid rgb(204, 204, 204); box-shadow: rgba(0, 0, 0, 0.2) 2px 2px 3px; position: absolute; transition: visibility linear 0.3s, opacity 0.3s linear; opacity: 0; visibility: hidden; z-index: 2000000000; left: 0px; top: -10000px;"

**#14 `r.0.0` `<div>`**

- `class` = "ng-fadeOutZoom ng-fluid ng-scope"

**#15 `r.0.1` `<div>`**

- `ui-view` = ""
- `autoscroll` = "false"
- `class` = "ng-fluid ng-scope"

**#16 `r.12.0` `<div>`**

- `style` = "width: 100%; height: 100%; position: fixed; top: 0px; left: 0px; z-index: 2000000000; background-color: rgb(255, 255, 255); opacity: 0.05;"

**#17 `r.12.1` `<div>`**

- `class` = "g-recaptcha-bubble-arrow"
- `style` = "border: 11px solid transparent; width: 0px; height: 0px; position: absolute; pointer-events: none; margin-top: -11px; z-index: 2000000000;"

**#18 `r.12.2` `<div>`**

- `class` = "g-recaptcha-bubble-arrow"
- `style` = "border: 10px solid transparent; width: 0px; height: 0px; position: absolute; pointer-events: none; margin-top: -10px; z-index: 2000000000;"

**#19 `r.12.3` `<div>`**

- `style` = "z-index: 2000000000; position: relative; width: 0px; height: 0px;"

**#21 `r.0.1.0` `<style>`**

- `class` = "ng-scope"
- **text** = "body {\n        overflow: auto;\n    }"

**#23 `r.12.3.0` `<iframe>`**

- `title` = "recaptcha challenge expires in two minutes"
- `name` = "c-g8o2ifrad64d"
- `frameborder` = "0"
- `scrolling` = "no"
- `sandbox` = "allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation allow-modals allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
- `src` = "https://www.google.com/recaptcha/api2/bframe?hl=en&v=A7KpaEASfhDcK0nXxgQEyyYv&k=6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx&bft=0dAFcWeA4YbSQP1DurnKHZ3cEoiRDL6-QM4GOeI1w3Xu8NNITZpKY9_SvlEct1fp-xvB0KCgqwtFH6ltmvBtilk2sLo5IXAKB0yw"
- `style` = "width: 0px; height: 0px;"

### Resolved absolute computed style — every node

#### #0 `r` `<body>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1842px / 1265px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgb(255, 255, 255) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | auto / auto |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #1 `r.0` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1842px / 1265px |
| min-width / max-width | 0px / none |
| min-height / max-height | 100% / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #2 `r.1` `<script>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #3 `r.2` `<script>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #4 `r.3` `<script>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #5 `r.4` `<script>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #6 `r.5` `<script>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #7 `r.6` `<script>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #8 `r.7` `<script>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #9 `r.8` `<script>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #10 `r.9` `<script>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #11 `r.10` `<script>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #12 `r.11` `<script>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #13 `r.12` `<div>` — NO (visibility:hidden)

| property | resolved value |
|---|---|
| display | block |
| position | absolute |
| top / right / bottom / left | -10000px / 1840px / 11263px / 0px |
| z-index | 2000000000 |
| float | none |
| box-sizing | border-box |
| width / height | 2px / 2px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(204, 204, 204) / rgb(204, 204, 204) / rgb(204, 204, 204) / rgb(204, 204, 204) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgb(255, 255, 255) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 0 |
| box-shadow | rgba(0, 0, 0, 0.2) 2px 2px 3px 0px |
| cursor | auto |
| transition-property | visibility, opacity |
| transition-duration | 0s, 0.3s |
| visibility | hidden |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #14 `r.0.0` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1842px / 50px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #15 `r.0.1` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1842px / 772.766px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #16 `r.12.0` `<div>` — NO (visibility:hidden)

| property | resolved value |
|---|---|
| display | block |
| position | fixed |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | 2000000000 |
| float | none |
| box-sizing | border-box |
| width / height | 1842px / 1265px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgb(255, 255, 255) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 0.05 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | hidden |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #17 `r.12.1` `<div>` — NO (visibility:hidden)

| property | resolved value |
|---|---|
| display | block |
| position | absolute |
| top / right / bottom / left | 0px / -22px / -11px / 0px |
| z-index | 2000000000 |
| float | none |
| box-sizing | border-box |
| width / height | 22px / 22px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | -11px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 11px / 11px / 11px / 11px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | hidden |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | none |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #18 `r.12.2` `<div>` — NO (visibility:hidden)

| property | resolved value |
|---|---|
| display | block |
| position | absolute |
| top / right / bottom / left | 0px / -20px / -10px / 0px |
| z-index | 2000000000 |
| float | none |
| box-sizing | border-box |
| width / height | 20px / 20px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | -10px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 10px / 10px / 10px / 10px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | hidden |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | none |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #19 `r.12.3` `<div>` — NO (visibility:hidden)

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | 2000000000 |
| float | none |
| box-sizing | border-box |
| width / height | 0px / 0px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | hidden |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #21 `r.0.1.0` `<style>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #23 `r.12.3.0` `<iframe>` — NO (visibility:hidden)

| property | resolved value |
|---|---|
| display | inline |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 0px / 0px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | inset / inset / inset / inset |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | clip / clip |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | hidden |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |


---

## 6. Verbatim text

| path | # | text (exactly as captured) | truncated? |
|---|---|---|---|
| `r.2` | #3 | `var __h264 = 'false';\n    var __isReg = 'false';\n    if (typeof __h264 === 'boolean') {\n    } else {\n      __h264 = __h264 == 'true' ? true : false;\n    }\n    if (typeof __isReg === 'boolean') {\n    } else {\n      __isReg = __isReg == 'true' ? true :` | **YES** — 250 chars, cut mid-statement |
| `r.11` | #12 | `var __cver = '1784623769671';\n\n    var ua = navigator.userAgent.toLowerCase();\n\n    var is_chrome = ua.indexOf('chrome') > -1;\n    var is_firefox = ua.indexOf('firefox') > -1;\n    var is_msie = ua.indexOf('msie') > -1 \|\| ua.indexOf('trident') > -1;\n ` | **YES** — 250 chars, cut mid-statement |
| `r.0.1.0` | #21 | `body {\n        overflow: auto;\n    }` | no (36 chars) |

No other node in this piece carries text. `<body>`, `div.app-container`, `r.0.0`, `r.0.1`, and the whole `r.12` subtree have **no** `text:` line in the dump.

### Truncated attribute
`r` `#0` `ng-class` is **truncated at exactly 300 characters** (measured: the printed value unescapes to 300 chars and ends mid-token):

```
{
      'layout-fixed': app.layout.isFixed,
      'layout-boxed': app.layout.isBoxed,
      'layout-dock': app.layout.isDocked,
      'layout-material': app.layout.isMaterial,
      'aside-offscreen': app.sidebar.isOffscreen,
      'footer-hidden': app.footer.hidden,
      'in-app': !$state.includes            ← CUT HERE
```

The only class actually applied at capture time is `footer-hidden` (`attr class = "footer-hidden"`, and `INFO.txt` line 6 `themeClass : "footer-hidden"`). So of the seven candidate classes, `app.footer.hidden` was the only truthy one: **no `layout-fixed`, no `layout-boxed`, no `layout-dock`, no `layout-material`, no `aside-offscreen`, no `in-app`.**

---

## 7. Rebuild spec (SvelteKit)

### 7.1 HTML skeleton

```html
<!-- app.html <body> -->
<body class="footer-hidden">
  <div class="app-container" data-ui-view data-autoscroll="false">
    <div class="ng-fadeOutZoom ng-fluid">   <!-- navbar host -->
      <!-- P02 <nav class="navbar topnavbar"> -->
    </div>
    <div class="ng-fluid">                   <!-- router outlet -->
      <style>body { overflow: auto; }</style>
      <!-- P03 <div class="ng-fadeOutZoom ng-fluid"> -->
    </div>
  </div>
</body>
```

### 7.2 CSS (absolute values, taken from the resolved tables above)

```css
body {
  display: block; position: static; box-sizing: border-box;
  width: 1842px;              /* = viewport width; in the rebuild use 100% */
  height: 1265px;             /* = viewport height */
  margin: 0; padding: 0; border: 0;
  background-color: rgb(255, 255, 255);
  color: rgb(51, 51, 51);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px; font-weight: 400; font-style: normal;
  line-height: 20px; letter-spacing: normal;
  text-align: start; text-transform: none; text-decoration-line: none;
  white-space: normal;
  overflow-x: auto; overflow-y: auto;   /* from the injected <style> at r.0.1.0 */
  opacity: 1; box-shadow: none; cursor: auto;
  transition: all 0s;
}

.app-container {
  display: block;
  position: relative; top: 0; right: 0; bottom: 0; left: 0;
  z-index: auto; float: none; box-sizing: border-box;
  width: 1842px; height: 1265px; min-height: 100%;
  margin: 0; padding: 0; border: 0; border-radius: 0;
  background-color: rgba(0, 0, 0, 0);   /* transparent — the white comes from body */
  background-image: none;
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  letter-spacing: normal; text-align: start; text-transform: none;
  text-decoration-line: none; white-space: normal;
  overflow: visible; opacity: 1; box-shadow: none; cursor: auto;
  transition: all 0s;
}

/* r.0.0 — navbar host. NO positioning of its own; it is a plain block. */
.app-container > .ng-fadeOutZoom.ng-fluid {
  display: block; position: static; box-sizing: border-box;
  width: 1842px; height: 50px;
  margin: 0; padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  overflow: visible;
}

/* r.0.1 — router outlet, starts at y=50 purely because r.0.0 is 50px tall (normal flow) */
.app-container > .ng-fluid[ui-view] {
  display: block; position: static; box-sizing: border-box;
  width: 1842px; height: 772.766px;   /* content-driven; do not hard-code in the rebuild */
  margin: 0; padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  overflow: visible;
}
```

### 7.3 Layout facts a rebuild must reproduce

* **No flexbox, no CSS grid, no CSS custom properties.** `INFO.txt` line 8 records `cssVars : {"root":{},"body":{}}` — both empty. Every flex property in `DEFAULTS.txt` (lines 22–33: `flex`, `flex-direction`, `flex-wrap`, `flex-grow`, `flex-shrink`, `flex-basis`, `align-items`, `align-self`, `justify-content`, `gap`, `order`, `grid-template-columns`) has **`2156/2156` nodes at the initial value and `1` distinct value** — i.e. *not one node in the entire page uses flex or grid.* Layout is pure normal-flow + `float` + `position` + `display:table`.
* `body` is `1842×1265`, exactly the viewport; `.app-container` matches it and additionally carries `min-height: 100%`.
* Vertical stack in `.app-container` is plain normal flow: `r.0.0` (h=50) then `r.0.1` (y=50, h=772.766). Total painted content ends at y≈822.8; the remaining 442px of the 1265px viewport is empty white `body`.
* `body { overflow: auto }` comes **only** from the runtime-injected `<style class="ng-scope">` at `r.0.1.0` — i.e. the router template injects it, it is not in a stylesheet. Reproduce it as a `<svelte:head>` style or a global rule.
* The scripts must load in this order for the app to boot: vendor bundle → inline `__h264`/`__isReg` flags → adapter.js → janus3 → video.js → videojs-youtube → toaster → sockjs → SoundCloud API → `app.min.js` → inline cache-version/UA sniff. Cache-busting query strings observed: `?v=2.18.100` (vendor + janus3) and `?v=1784623769671` / `var __cver = '1784623769671'` (app bundle).

### 7.4 reCAPTCHA subtree — do NOT rebuild by hand

`r.12` is DOM injected by Google's `recaptcha/api2` script, not by the app. It is entirely invisible at capture time (`visibility: hidden` on `r.12`, `r.12.0`, `r.12.1`, `r.12.2`, `r.12.3`, `r.12.3.0`; `opacity: 0` on `r.12`). If the rebuild needs reCAPTCHA, include the Google script and let it inject its own nodes. For reference the exact geometry is:

| node | role | rect | key resolved style |
|---|---|---|---|
| `r.12` #13 | bubble container | 0, −10000, 2, 2 | `position:absolute; top:-10000px; left:0; z-index:2000000000; width:2px; height:2px; border:1px solid rgb(204,204,204); background:rgb(255,255,255); opacity:0; visibility:hidden; box-shadow: rgba(0,0,0,0.2) 2px 2px 3px 0px; transition-property: visibility, opacity; transition-duration: 0s, 0.3s` |
| `r.12.0` #16 | full-viewport dimmer | 0, 0, 1842, 1265 | `position:fixed; inset:0; z-index:2000000000; width:1842px; height:1265px; background:rgb(255,255,255); opacity:0.05; visibility:hidden` |
| `r.12.1` #17 | bubble arrow (outer) | 1, −10010, 22, 22 | `position:absolute; top:0; left:0; right:-22px; bottom:-11px; z-index:2000000000; width:22px; height:22px; margin-top:-11px; border:11px solid rgba(0,0,0,0); pointer-events:none; visibility:hidden` |
| `r.12.2` #18 | bubble arrow (inner) | 1, −10009, 20, 20 | `position:absolute; top:0; left:0; right:-20px; bottom:-10px; z-index:2000000000; width:20px; height:20px; margin-top:-10px; border:10px solid rgba(0,0,0,0); pointer-events:none; visibility:hidden` |
| `r.12.3` #19 | challenge host | 1, −9999, 0, 0 | `position:relative; inset:0; z-index:2000000000; width:0; height:0; visibility:hidden` |
| `r.12.3.0` #23 | challenge `<iframe>` | 1, −9984, 0, 0 | `display:inline; width:0; height:0; border-style:inset ×4; overflow:clip; visibility:hidden` |

The iframe's site key is visible in its `src`: **`k=6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx`**, api version `v=A7KpaEASfhDcK0nXxgQEyyYv`, `hl=en`, `bft=0dAFcWeA4YbSQP1DurnKHZ3cEoiRDL6-QM4GOeI1w3Xu8NNITZpKY9_SvlEct1fp-xvB0KCgqwtFH6ltmvBtilk2sLo5IXAKB0yw`, frame name `c-g8o2ifrad64d`.

---

## 8. Honest gaps

1. **No `<head>` was captured.** The dump root is `<body>` (`#0 path=r <body>`). There is therefore **no evidence at all** for `<title>`, `<meta>`, `<link rel="stylesheet">`, favicons, or the `<html>` element's attributes/classes. The Bootstrap 3, Font Awesome and app stylesheets are *inferred to exist from their effects* (computed styles, `font-family: FontAwesome`) but **their URLs, versions and contents are not in this capture.**
2. **Both inline scripts are truncated at 250 characters** (`r.2` `#3`, `r.11` `#12`). Their full bodies are unknown. What is known: `r.2` defines `__h264 = 'false'` and `__isReg = 'false'` and coerces them to booleans; `r.11` defines `__cver = '1784623769671'` and begins a UA sniff computing `is_chrome`, `is_firefox`, `is_msie`.
3. **`body`'s `ng-class` is truncated at 300 characters**, cut inside `'in-app': !$state.includes…`. The remainder of that expression (and any further keys after `in-app`) is unknown.
4. **No footer node exists in the capture.** `body.footer-hidden` is applied, so the footer is presumably `display:none`/not rendered — but there is no footer element in the 2,156 records to confirm what it would contain.
5. **`r.0`'s `data-ui-view` is empty (`""`)** — the ui-router state name for the shell is not recorded in the DOM. Only `ng-controller = "CoreController"` is known.
6. The `r.12` reCAPTCHA subtree is **third-party injected DOM**; its inner iframe document is cross-origin and was not (and could not be) captured. Its rendered appearance is unknown — at capture time it is fully hidden.
7. `background-position` for `r`/`r.0` and all shell nodes resolves to the COMMON `0% 0%`; the one node in the capture with a different `background-position` is not in this piece.
