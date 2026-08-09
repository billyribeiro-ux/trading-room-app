# ptr1 · P02 — Top navbar

**Capture:** `/tmp/ptr-decode/ptr1/caps/00-baseline-room/` — 2,156 records, viewport 1842×1265 @dpr2
**Page:** Manage Room, room 3625

> **Every computed value in this file is the RESOLVED ABSOLUTE value** = the `DEFAULTS.txt` COMMON table overridden by that node's `style-deviations`. You do not need `DEFAULTS.txt` to read this document.

---

## 1. Purpose

This piece is the full-width black application header bar that sits at `y=0` across the top of every page: a left-floated brand block containing the ProTradingRoom logo image, and a right-floated `<ul>` with exactly two items — an "Account" cog link and a power-off logout link. It is 1842×50 and is pure Bootstrap 3 float layout — no flexbox anywhere.

## 2. Path anchor

Anchor: **`r.0.0.0` and every descendant.**
Records found under that prefix: **11** (`#20`, `#24`, `#25`, `#28`, `#29`, `#34`, `#35`, `#36`, `#43`, `#44`, `#45`). All 11 render.

Its parent `r.0.0` (`#14`, `div.ng-fadeOutZoom.ng-fluid.ng-scope`, rect 0,0,1842,50) belongs to P01.

**Document-order tree:**

```
<nav role="navigation" class="navbar topnavbar" style="background-color: black;">   #20  r.0.0.0        0,0,1842,50
├── <div class="navbar-header">                                                     #24  r.0.0.0.0      0,0,350,50    float:left
│   └── <div class="navbar-brand">                                                  #28  r.0.0.0.0.0    15,0,320,50
│       └── <a href="">                                                             #34  r.0.0.0.0.0.0  20,14.5,200,21
│           └── <img class="brand-logo" src="/public/images/ptr_logo.png">          #43  …0.0.0.0.0.0.0 20,14.6,200,24.5
└── <div collapse="headerMenuCollapsed" class="nav-wrapper collapse navbar-collapse in" style="height: auto;">
                                                                                    #25  r.0.0.0.1      0,0,1842,50   padding 0 15px
    └── <ul class="nav navbar-nav navbar-right hidden-material" ng-show="login.isLoggedIn">
                                                                                    #29  r.0.0.0.1.0    1691.6,0,150.4,50  float:right
        ├── <li>                                                                    #35  r.0.0.0.1.0.0  1691.6,0,96.4,50
        │   └── <a href="#/page/welcome" class="icon fa  fa-cog">Account</a>        #44  …1.0.0.0       1691.6,0,96.4,50
        └── <li>                                                                    #36  r.0.0.0.1.0.1  1788,0,54,50
            └── <a href="" class="icon fa fa-2x fa-power-off">                      #45  …1.0.1.0       1788,0,54,50
```

**Geometry chain (all values measured, not derived):**
`nav` x=0 w=1842 → `.navbar-header` floats left at x=0 w=350 → `.navbar-brand` x=15 (15px left margin) w=320 → `<a>` x=20 (5px brand padding-left) w=200 → `<img>` x=20 w=199.992.
`.nav-wrapper` spans the full 1842 with 15px side padding → the right-floated `<ul>` has `margin-right:-15px`, so it ends flush at x=1842 (1691.6 + 150.4 = 1842.0) and begins at x=1691.6.
`<li>` #35 = 96.4297px wide, `<li>` #36 = 54px wide; 96.4297 + 54 = 150.4297 = the `<ul>` width. Both `<li>` are `float:left` inside the right-floated `<ul>`.

---

## 3–5. Node table, verbatim attributes, resolved absolute computed styles

### Node table

| # | path | tag | id | class | rect x,y,w,h | renders |
|---|---|---|---|---|---|---|
| 20 | `r.0.0.0` | `<nav>` | — | `navbar topnavbar` | 0, 0, 1842, 50 | YES |
| 24 | `r.0.0.0.0` | `<div>` | — | `navbar-header` | 0, 0, 350, 50 | YES |
| 25 | `r.0.0.0.1` | `<div>` | — | `nav-wrapper collapse navbar-collapse in` | 0, 0, 1842, 50 | YES |
| 28 | `r.0.0.0.0.0` | `<div>` | — | `navbar-brand` | 15, 0, 320, 50 | YES |
| 29 | `r.0.0.0.1.0` | `<ul>` | — | `nav navbar-nav navbar-right hidden-material` | 1691.6, 0, 150.4, 50 | YES |
| 34 | `r.0.0.0.0.0.0` | `<a>` | — | `—` | 20, 14.5, 200, 21 | YES |
| 35 | `r.0.0.0.1.0.0` | `<li>` | — | `—` | 1691.6, 0, 96.4, 50 | YES |
| 36 | `r.0.0.0.1.0.1` | `<li>` | — | `—` | 1788, 0, 54, 50 | YES |
| 43 | `r.0.0.0.0.0.0.0` | `<img>` | — | `brand-logo` | 20, 14.6, 200, 24.5 | YES |
| 44 | `r.0.0.0.1.0.0.0` | `<a>` | — | `icon fa  fa-cog` | 1691.6, 0, 96.4, 50 | YES |
| 45 | `r.0.0.0.1.0.1.0` | `<a>` | — | `icon fa fa-2x fa-power-off` | 1788, 0, 54, 50 | YES |

### Attributes (verbatim) & text

**#20 `r.0.0.0` `<nav>`**

- `role` = "navigation"
- `class` = "navbar topnavbar"
- `style` = "background-color: black;"
- **::before** = `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`
- **::after** = `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

**#24 `r.0.0.0.0` `<div>`**

- `class` = "navbar-header"
- **::before** = `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`
- **::after** = `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

**#25 `r.0.0.0.1` `<div>`**

- `collapse` = "headerMenuCollapsed"
- `class` = "nav-wrapper collapse navbar-collapse in"
- `style` = "height: auto;"
- **::before** = `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`
- **::after** = `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

**#28 `r.0.0.0.0.0` `<div>`**

- `class` = "navbar-brand"

**#29 `r.0.0.0.1.0` `<ul>`**

- `class` = "nav navbar-nav navbar-right hidden-material"
- `ng-show` = "login.isLoggedIn"
- `style` = ""
- **::before** = `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`
- **::after** = `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

**#34 `r.0.0.0.0.0.0` `<a>`**

- `href` = ""

**#35 `r.0.0.0.1.0.0` `<li>`**

- _(no attributes)_

**#36 `r.0.0.0.1.0.1` `<li>`**

- _(no attributes)_

**#43 `r.0.0.0.0.0.0.0` `<img>`**

- `ng-hide` = "hideLogo || !sess.logoURL"
- `ng-src` = "/public/images/ptr_logo.png"
- `height` = "35px"
- `class` = "brand-logo"
- `style` = "max-width: 200px; height: auto; max-height: 40px;"
- `src` = "/public/images/ptr_logo.png"

**#44 `r.0.0.0.1.0.0.0` `<a>`**

- `href` = "#/page/welcome"
- `ui-sref` = "page.welcome"
- `style` = "color: #FFFFFF"
- `class` = "icon fa  fa-cog"
- `tooltip-placement` = "bottom"
- `tooltip` = "Account Settings"
- **text** = "Account"
- **::before** = `{"content":"\"\"","color":"rgb(255, 255, 255)","font-family":"FontAwesome","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

**#45 `r.0.0.0.1.0.1.0` `<a>`**

- `href` = ""
- `ng-click` = "doLogout()"
- `style` = "color: #FFFFFF"
- `class` = "icon fa fa-2x fa-power-off"
- `tooltip-placement` = "bottom"
- `tooltip` = "Logout"
- **::before** = `{"content":"\"\"","color":"rgb(255, 255, 255)","font-family":"FontAwesome","font-size":"28px","background-color":"rgba(0, 0, 0, 0)"}`

### Resolved absolute computed style — every node

#### #20 `r.0.0.0` `<nav>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1842px / 50px |
| min-width / max-width | 0px / none |
| min-height / max-height | 50px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgb(0, 0, 0) |
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

#### #24 `r.0.0.0.0` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | 1 |
| float | left |
| box-sizing | border-box |
| width / height | 350px / 50px |
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

#### #25 `r.0.0.0.1` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1842px / 50px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 15px / 0px / 15px |
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

#### #28 `r.0.0.0.0.0` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | 1 |
| float | none |
| box-sizing | border-box |
| width / height | 320px / 50px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 15px / 0px / 15px |
| padding T R B L | 0px / 5px / 0px / 5px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(250, 250, 250) / rgb(250, 250, 250) / rgb(250, 250, 250) / rgb(250, 250, 250) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(250, 250, 250) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 18px |
| font-weight | 400 |
| font-style | normal |
| line-height | 50px |
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
| outline-width / outline-color | 3px / rgb(250, 250, 250) |

#### #29 `r.0.0.0.1.0` `<ul>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | right |
| box-sizing | border-box |
| width / height | 150.43px / 50px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / -15px / 0px / 0px |
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
| list-style-type | none |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #34 `r.0.0.0.0.0.0` `<a>` — YES

| property | resolved value |
|---|---|
| display | inline |
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
| border-color T R B L | rgb(51, 122, 183) / rgb(51, 122, 183) / rgb(51, 122, 183) / rgb(51, 122, 183) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 122, 183) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 18px |
| font-weight | 400 |
| font-style | normal |
| line-height | 50px |
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
| cursor | pointer |
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
| outline-width / outline-color | 3px / rgb(51, 122, 183) |

#### #35 `r.0.0.0.1.0.0` `<li>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 96.4297px / 50px |
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
| list-style-type | none |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #36 `r.0.0.0.1.0.1` `<li>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 54px / 50px |
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
| list-style-type | none |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #43 `r.0.0.0.0.0.0.0` `<img>` — YES

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 199.992px / 24.5391px |
| min-width / max-width | 0px / 200px |
| min-height / max-height | 0px / 40px |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 122, 183) / rgb(51, 122, 183) / rgb(51, 122, 183) / rgb(51, 122, 183) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 122, 183) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 18px |
| font-weight | 400 |
| font-style | normal |
| line-height | 50px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | middle |
| overflow-x / overflow-y | clip / clip |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
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
| outline-width / outline-color | 3px / rgb(51, 122, 183) |

#### #44 `r.0.0.0.1.0.0.0` `<a>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 96.4297px / 50px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 15px / 15px / 15px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | FontAwesome |
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
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | none |
| user-select | auto |
| transform | matrix(1, 0, 0, 1, 0, 0) |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |

#### #45 `r.0.0.0.1.0.1.0` `<a>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 54px / 50px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 15px / 15px / 15px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | FontAwesome |
| font-size | 28px |
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
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | none |
| user-select | auto |
| transform | matrix(1, 0, 0, 1, 0, 0) |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |


---

## 6. Verbatim text

| path | # | text |
|---|---|---|
| `r.0.0.0.1.0.0.0` | #44 | `"Account"` |

That is the **only** text node in the entire navbar. Nothing is truncated in this piece — no attribute reaches the 300-char limit and no text reaches the 250-char limit.

### Icon glyphs (from the captured `::before` pseudo-elements)

| node | class | `::before` content | codepoint | `::before` colour / font / size |
|---|---|---|---|---|
| #44 `r.0.0.0.1.0.0.0` | `icon fa  fa-cog` | Font Awesome cog | **U+F013** | `rgb(255, 255, 255)` / `FontAwesome` / `14px` / bg `rgba(0, 0, 0, 0)` |
| #45 `r.0.0.0.1.0.1.0` | `icon fa fa-2x fa-power-off` | Font Awesome power-off | **U+F011** | `rgb(255, 255, 255)` / `FontAwesome` / `28px` / bg `rgba(0, 0, 0, 0)` |

### Clearfix pseudo-elements

`#20 nav`, `#24 .navbar-header`, `#25 .nav-wrapper`, `#29 ul` each carry **both** `::before` and `::after` with:
`{"content":"\" \"", "color":"rgb(51, 51, 51)", "font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif", "font-size":"14px", "background-color":"rgba(0, 0, 0, 0)"}`
— i.e. the Bootstrap 3 `.clearfix` `content:" "` pattern. `.navbar-brand` (#28), the `<a>`s, the `<li>`s and the `<img>` have **no** pseudo-elements other than the two icon `::before`s above.

---

## 7. Rebuild spec (SvelteKit)

### 7.1 Markup

```svelte
<nav class="navbar topnavbar" role="navigation">
  <div class="navbar-header">
    <div class="navbar-brand">
      <a href="">
        <img class="brand-logo" src="/public/images/ptr_logo.png" alt="" width="200" height="25" />
      </a>
    </div>
  </div>

  <div class="nav-wrapper collapse navbar-collapse in" style="height: auto;">
    <ul class="nav navbar-nav navbar-right hidden-material">
      <li>
        <a href="#/page/welcome" class="icon fa fa-cog" title="Account Settings">Account</a>
      </li>
      <li>
        <a href="" class="icon fa fa-2x fa-power-off" title="Logout" onclick={doLogout}></a>
      </li>
    </ul>
  </div>
</nav>
```

Angular bindings to port:
* `#29 <ul>` — `ng-show="login.isLoggedIn"` → render the `<ul>` only when logged in. At capture time it **was** shown (`style=""`, no `ng-hide` class, rect 150.4×50).
* `#43 <img>` — `ng-hide="hideLogo || !sess.logoURL"` → hide the logo when `hideLogo` is true or the session has no `logoURL`. At capture time it **was** shown (class is just `brand-logo`, no `ng-hide`).
* `#45 <a>` — `ng-click="doLogout()"`.
* `#44 <a>` — `ui-sref="page.welcome"` → SvelteKit `href="/welcome"` (the rendered `href` was `#/page/welcome`).
* `#25` — `collapse="headerMenuCollapsed"` is the ui-bootstrap collapse directive; it was **expanded** (`class="… collapse navbar-collapse in"`, inline `style="height: auto;"`).
* Tooltips: `tooltip-placement="bottom"` + `tooltip="Account Settings"` (#44) and `tooltip="Logout"` (#45).

### 7.2 CSS — resolved absolute values

```css
.navbar.topnavbar {
  display: block;
  position: relative; top: 0; right: 0; bottom: 0; left: 0;
  z-index: auto; float: none; box-sizing: border-box;
  width: 1842px;                 /* full viewport; use 100% in the rebuild */
  height: 50px; min-height: 50px;
  margin: 0; padding: 0; border: 0; border-radius: 0;
  background-color: rgb(0, 0, 0);   /* inline style="background-color: black;" */
  background-image: none;
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  letter-spacing: normal; text-align: start; text-transform: none;
  text-decoration-line: none; white-space: normal; vertical-align: baseline;
  overflow: visible; opacity: 1; box-shadow: none; cursor: auto;
  transition: all 0s;
}
.navbar.topnavbar::before,
.navbar.topnavbar::after { content: " "; }   /* clearfix */

.navbar-header {
  display: block;
  position: relative; top: 0; right: 0; bottom: 0; left: 0;
  z-index: 1; float: left; box-sizing: border-box;
  width: 350px; height: 50px;
  margin: 0; padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  overflow: visible;
}
.navbar-header::before, .navbar-header::after { content: " "; }

.navbar-brand {
  display: block;
  position: relative; top: 0; right: 0; bottom: 0; left: 0;
  z-index: 1; float: none; box-sizing: border-box;
  width: 320px; height: 50px;
  margin: 0 15px 0 15px;
  padding: 0 5px 0 5px;
  border: 0; border-color: rgb(250, 250, 250);
  background-color: rgba(0, 0, 0, 0);
  color: rgb(250, 250, 250);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 18px; font-weight: 400;
  line-height: 50px;
  text-align: start; white-space: normal;
  overflow: visible; cursor: auto;
  outline-color: rgb(250, 250, 250);
}

.navbar-brand > a {
  display: inline;
  position: static; float: none; box-sizing: border-box;
  width: auto; height: auto;
  margin: 0; padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 122, 183);
  border-color: rgb(51, 122, 183);
  outline-color: rgb(51, 122, 183);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 18px; font-weight: 400;
  line-height: 50px;
  text-decoration-line: none;
  cursor: pointer;
}

.brand-logo {                     /* the <img> */
  display: inline-block;
  position: static; float: none; box-sizing: border-box;
  width: 199.992px; height: 24.5391px;      /* rendered size */
  max-width: 200px; max-height: 40px;       /* from the inline style */
  margin: 0; padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 122, 183); border-color: rgb(51, 122, 183);
  outline-color: rgb(51, 122, 183);
  font-size: 18px; line-height: 50px;
  vertical-align: middle;
  overflow: clip;
  object-fit: fill;
  cursor: pointer;
}

.nav-wrapper.navbar-collapse.in {
  display: block;
  position: relative; top: 0; right: 0; bottom: 0; left: 0;
  z-index: auto; float: none; box-sizing: border-box;
  width: 1842px; height: 50px;              /* inline style="height: auto;" */
  margin: 0; padding: 0 15px 0 15px; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  overflow: visible;
}
.nav-wrapper::before, .nav-wrapper::after { content: " "; }

.nav.navbar-nav.navbar-right.hidden-material {
  display: block;
  position: static; float: right; box-sizing: border-box;
  width: 150.43px; height: 50px;
  margin: 0 -15px 0 0;
  padding: 0; border: 0;
  list-style-type: none;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  overflow: visible;
}
.nav.navbar-nav::before, .nav.navbar-nav::after { content: " "; }

.navbar-nav > li {
  display: block;
  position: relative; top: 0; right: 0; bottom: 0; left: 0;
  float: left; box-sizing: border-box;
  height: 50px;
  margin: 0; padding: 0; border: 0;
  list-style-type: none;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  overflow: visible; cursor: auto;
}
.navbar-nav > li:nth-child(1) { width: 96.4297px; }   /* Account */
.navbar-nav > li:nth-child(2) { width: 54px; }        /* Logout  */

.navbar-nav > li > a.icon.fa {
  display: block;
  position: relative; top: 0; right: 0; bottom: 0; left: 0;
  z-index: auto; float: none; box-sizing: border-box;
  height: 50px;
  margin: 0;
  padding: 15px 15px 15px 15px;
  border: 0; border-color: rgb(255, 255, 255);
  border-radius: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(255, 255, 255);          /* inline style="color: #FFFFFF" */
  outline-color: rgb(255, 255, 255);
  font-family: FontAwesome;           /* NOTE: on the <a> itself, not just ::before */
  font-weight: 400;
  letter-spacing: normal; text-align: start; text-transform: none;
  text-decoration-line: none; white-space: normal;
  list-style-type: none;
  overflow: visible; opacity: 1; box-shadow: none;
  cursor: pointer;
  transform: matrix(1, 0, 0, 1, 0, 0);
  transition: all 0s;
}
.navbar-nav > li:nth-child(1) > a { width: 96.4297px; font-size: 14px; line-height: 20px; }
.navbar-nav > li:nth-child(2) > a { width: 54px;      font-size: 28px; line-height: 20px; }  /* .fa-2x */

.navbar-nav > li:nth-child(1) > a::before {
  content: "\f013"; font-family: FontAwesome; font-size: 14px; color: rgb(255, 255, 255);
}
.navbar-nav > li:nth-child(2) > a::before {
  content: "\f011"; font-family: FontAwesome; font-size: 28px; color: rgb(255, 255, 255);
}
```

### 7.3 Non-obvious things a rebuild will get wrong if it guesses

* The navbar background is **`rgb(0, 0, 0)` pure black**, and it comes from an **inline `style="background-color: black;"` on the `<nav>`**, not from a class. Any Bootstrap `.topnavbar` colour must be overridden.
* `.navbar-brand` colour is `rgb(250, 250, 250)` but the `<a>` inside it resets to link blue `rgb(51, 122, 183)`. Neither is visible — the only painted content in the brand block is the `<img>`.
* Both header `<a>` elements have **`font-family: FontAwesome` applied to the element itself**, so the literal word "Account" renders in the FontAwesome face (which falls back per-glyph for Latin characters). This is why "Account" measures 66.43px of text inside a 96.43px box (96.4297 − 15 − 15 padding).
* The `<img>` carries an **invalid `height="35px"` attribute** (HTML `height` must be unitless) alongside `style="max-width: 200px; height: auto; max-height: 40px;"`. The inline style wins: rendered **199.992 × 24.5391** px. Reproduce with `width:200px; height:auto` and a `24.54px` intrinsic-ratio box to avoid CLS.
* The right `<ul>` uses `margin-right: -15px` to cancel the wrapper's 15px right padding and sit flush at x=1842.
* `.navbar-header` and `.navbar-brand` both have `z-index: 1` (with `position: relative`), stacking above the `.nav-wrapper` which is `z-index: auto`.

---

## 8. Honest gaps

1. **No hover/focus/active states are captured.** The dump is a single static snapshot; `:hover` colours for the two header links and the brand are unknown.
2. **The logo bitmap itself is not in the capture** — only its URL `/public/images/ptr_logo.png` and its rendered box (199.992 × 24.5391, so a natural aspect ratio of ≈8.15:1). Its pixel content, transparency and intrinsic dimensions are unknown.
3. **`#34 <a href="">` has no `ng-click`, no `ui-sref` and an empty `href`** — there is no evidence of where clicking the logo navigates. Do not invent a destination.
4. **The tooltips are directive attributes, not rendered DOM.** `tooltip="Account Settings"` / `tooltip="Logout"` with `tooltip-placement="bottom"` exist as attributes only; no tooltip element was open at capture time, so the tooltip's own styling is not captured.
5. **`collapse="headerMenuCollapsed"` responsive behaviour is not captured.** At 1842px the menu is expanded (`.in`, `height: auto`). The collapsed/mobile rendering, the hamburger toggle button, and the breakpoint are absent from this capture — there is **no `navbar-toggle` element** anywhere in the 11 records.
6. `.hidden-material` on the `<ul>` implies a "material layout" theme variant that hides it; that variant is not active here (`body` has no `layout-material` class) and its styling is not captured.
7. **`#45` has no text node**, so the logout control is icon-only with no accessible name in the DOM other than the `tooltip` attribute — a rebuild should add `aria-label="Logout"` (this is an improvement, not something the capture shows).
