# ptr1 · P05 — Tabset: `nav.nav-tabs` header strip + the 6 `.tab-pane` containers

**Capture:** `/tmp/ptr-decode/ptr1/caps/00-baseline-room/` — 2,156 records, viewport 1842×1265 @dpr2
**Page:** Manage Room, room 3625

> **Every computed value in this file is the RESOLVED ABSOLUTE value** = the `DEFAULTS.txt` COMMON table overridden by that node's `style-deviations`. You do not need `DEFAULTS.txt` to read this document.

---

## 1. Purpose

This piece is the AngularUI-Bootstrap `uib-tabset` that fills the bottom half of the panel body: a 42px-tall `<ul class="nav nav-tabs">` with **six** `<li>` tabs (four visible, two conditionally hidden), and the `.tab-content` box below it holding **six** `.tab-pane` container divs — one per tab, of which exactly one (`Users`) is `active`. Only the tab strip and the pane *containers* are decoded here; **the contents of every pane belong to other agents.**

## 2. Path anchors and record counts

| anchor | records | note |
|---|---|---|
| `r.0.1.1.0.1.3` | 1 | `#41` — the `uib-tabset` host (`div.ng-isolate-scope`). Included as the parent frame; it is excluded from P04 by that piece's "everything under `r.0.1.1.0.1.` EXCEPT `.3`" rule. |
| `r.0.1.1.0.1.3.0` + descendants | 13 | the `<ul class="nav nav-tabs">`, its 6 `<li>` and their 6 `<a>` |
| `r.0.1.1.0.1.3.1` | 1 | `#61` — `div.tab-content` |
| `r.0.1.1.0.1.3.1.{0..5}` | 6 | `#97`–`#102`, the six `.tab-pane` divs (containers only) |
| **total** | **21** | |

`.tab-content` has **exactly six children** — verified: the only records matching `r.0.1.1.0.1.3.1.<n>` are `#97`…`#102`. There is no seventh pane.

## 2.1 Structure (document order)

```
<div class="ng-isolate-scope">                     uib-tabset host   #41  16,309,1810,476.8
├── <ul class="nav nav-tabs"
│       ng-class="{'nav-stacked': vertical, 'nav-justified': justified}"
│       ng-transclude>                                               #60  16,309,1810,42
│   ├── <li heading="Users" class="ng-isolate-scope active">         #91  16,309,70.3,42     VISIBLE · ACTIVE
│   │   └── <a href="" ng-click="select()" tab-heading-transclude class="ng-binding">Users</a>          #131  16,309,68.3,42
│   ├── <li heading="Text List" ng-show="sess.twillioApiToken"
│   │       class="ng-isolate-scope ng-hide">                        #92  HIDDEN
│   │   └── <a …>Text List</a>                                                                          #132  HIDDEN
│   ├── <li heading="Branding (Logo / Landing Page)" class="ng-isolate-scope">   #93  86.3,309,232.6,42  VISIBLE
│   │   └── <a …>Branding (Logo / Landing Page)</a>                                                     #133  86.3,309,230.6,42
│   ├── <li heading="SSO Setup" ng-show="sess.authMode=='sso'"
│   │       class="ng-isolate-scope ng-hide">                        #94  HIDDEN
│   │   └── <a …>SSO Setup</a>                                                                          #134  HIDDEN
│   ├── <li heading="User Stats" class="ng-isolate-scope">           #95  318.9,309,99.6,42  VISIBLE
│   │   └── <a …>User Stats</a>                                                                         #135  318.9,309,97.6,42
│   └── <li heading="Settings" class="ng-isolate-scope">             #96  418.5,309,85.3,42  VISIBLE
│       └── <a …>Settings</a>                                                                           #136  418.5,309,83.3,42
└── <div class="tab-content">                                        #61  16,351,1810,434.8
    ├── <div class="tab-pane ng-scope active" ng-repeat="tab in tabs"
    │        ng-class="{active: tab.active}" tab-content-transclude="tab">   #97   37,361,1768,393.8   ← Users, RENDERS
    ├── <div class="tab-pane ng-scope" …>                            #98   display:none  ← Text List
    ├── <div class="tab-pane ng-scope" …>                            #99   display:none  ← Branding
    ├── <div class="tab-pane ng-scope" …>                            #100  display:none  ← SSO Setup
    ├── <div class="tab-pane ng-scope" …>                            #101  display:none  ← User Stats
    └── <div class="tab-pane ng-scope" …>                            #102  display:none  ← Settings
```

**Pane ↔ tab mapping** is positional (`ng-repeat="tab in tabs"` over the same array that produced the `<li>`s), so pane index _n_ belongs to `<li>` index _n_. First child of each pane (for cross-referencing to the agents who own the pane contents):

| pane | # | tab | first child records |
|---|---|---|---|
| `…3.1.0` | #97 | Users | `#137 <fieldset class="ng-scope">` |
| `…3.1.1` | #98 | Text List | `#138 <div>` |
| `…3.1.2` | #99 | Branding (Logo / Landing Page) | `#139 <fieldset>` |
| `…3.1.3` | #100 | SSO Setup | `#140 <div>` |
| `…3.1.4` | #101 | User Stats | `#141 <fieldset>`, `#142 <h3>`, `#143 <div>`, `#144 <div>`, `#145 <table>` |
| `…3.1.5` | #102 | Settings | `#146 <div>` |

## 2.2 Measured geometry — every number closes exactly

```
tabset host       x=16   y=309   w=1810  h=476.766       309 → 785.766
  ul.nav-tabs     x=16   y=309   w=1810  h=42            309 → 351   (border-bottom 1px at 350→351)
  .tab-content    x=16   y=351   w=1810  h=434.766       351 → 785.766                       ✓ 42+434.766=476.766

tab strip (all float:left, each <li> = <a> width + the <a>'s 2px margin-right):
  li #91  x=16      w= 70.2891   a #131 w= 68.2891 + 2      → next x =  86.2891  (reported 86.3)
  li #93  x= 86.3   w=232.625    a #133 w=230.625  + 2      → next x = 318.914   (reported 318.9)
  li #95  x=318.9   w= 99.5938   a #135 w= 97.5938 + 2      → next x = 418.508   (reported 418.5)
  li #96  x=418.5   w= 85.3438   a #136 w= 83.3438 + 2      → right edge = 503.85
  (the remaining 1810 − 487.85 = 1322.15px of the ul is empty)

<a> height 42 = padding-top 10 + line-height 20 + padding-bottom 10 + border-top 1 + border-bottom 1   ✓
<a> text width = w − 15 − 15 − 1 − 1:
  Users                            68.2891 → 36.2891 px of text
  Branding (Logo / Landing Page)  230.625  → 198.625  px
  User Stats                       97.5938 → 65.5938  px
  Settings                         83.3438 → 51.3438  px

.tab-content box:  border-top-width 0px (!) · border-right/bottom/left 1px · padding 10px 20px
  active pane x = 16 + 1 (border-left) + 20 (padding-left) = 37                                ✓
  active pane w = 1810 − 1 − 1 − 20 − 20 = 1768                                                ✓
  active pane y = 351 + 0 (no top border) + 10 (padding-top) = 361                             ✓
  active pane h = 393.766
  content-box height = 434.766 − 10 − 10 − 0 − 1 = 413.766
  413.766 − 393.766 = 20px  →  accounted for by the pane's child <fieldset> #137
                              which has `margin-bottom: 20px` (its margin collapses
                              through the zero-border, zero-padding .tab-pane)          ✓
```

---

## 3–5. Node table, verbatim attributes, resolved absolute computed styles

### Node table

| # | path | tag | id | class | rect x,y,w,h | renders |
|---|---|---|---|---|---|---|
| 41 | `r.0.1.1.0.1.3` | `<div>` | — | `ng-isolate-scope` | 16, 309, 1810, 476.8 | YES |
| 60 | `r.0.1.1.0.1.3.0` | `<ul>` | — | `nav nav-tabs` | 16, 309, 1810, 42 | YES |
| 61 | `r.0.1.1.0.1.3.1` | `<div>` | — | `tab-content` | 16, 351, 1810, 434.8 | YES |
| 91 | `r.0.1.1.0.1.3.0.0` | `<li>` | — | `ng-isolate-scope active` | 16, 309, 70.3, 42 | YES |
| 92 | `r.0.1.1.0.1.3.0.1` | `<li>` | — | `ng-isolate-scope ng-hide` | 0, 0, 0, 0 | NO (display:none) |
| 93 | `r.0.1.1.0.1.3.0.2` | `<li>` | — | `ng-isolate-scope` | 86.3, 309, 232.6, 42 | YES |
| 94 | `r.0.1.1.0.1.3.0.3` | `<li>` | — | `ng-isolate-scope ng-hide` | 0, 0, 0, 0 | NO (display:none) |
| 95 | `r.0.1.1.0.1.3.0.4` | `<li>` | — | `ng-isolate-scope` | 318.9, 309, 99.6, 42 | YES |
| 96 | `r.0.1.1.0.1.3.0.5` | `<li>` | — | `ng-isolate-scope` | 418.5, 309, 85.3, 42 | YES |
| 97 | `r.0.1.1.0.1.3.1.0` | `<div>` | — | `tab-pane ng-scope active` | 37, 361, 1768, 393.8 | YES |
| 98 | `r.0.1.1.0.1.3.1.1` | `<div>` | — | `tab-pane ng-scope` | 0, 0, 0, 0 | NO (display:none) |
| 99 | `r.0.1.1.0.1.3.1.2` | `<div>` | — | `tab-pane ng-scope` | 0, 0, 0, 0 | NO (display:none) |
| 100 | `r.0.1.1.0.1.3.1.3` | `<div>` | — | `tab-pane ng-scope` | 0, 0, 0, 0 | NO (display:none) |
| 101 | `r.0.1.1.0.1.3.1.4` | `<div>` | — | `tab-pane ng-scope` | 0, 0, 0, 0 | NO (display:none) |
| 102 | `r.0.1.1.0.1.3.1.5` | `<div>` | — | `tab-pane ng-scope` | 0, 0, 0, 0 | NO (display:none) |
| 131 | `r.0.1.1.0.1.3.0.0.0` | `<a>` | — | `ng-binding` | 16, 309, 68.3, 42 | YES |
| 132 | `r.0.1.1.0.1.3.0.1.0` | `<a>` | — | `ng-binding` | 0, 0, 0, 0 | NO (zero rect) |
| 133 | `r.0.1.1.0.1.3.0.2.0` | `<a>` | — | `ng-binding` | 86.3, 309, 230.6, 42 | YES |
| 134 | `r.0.1.1.0.1.3.0.3.0` | `<a>` | — | `ng-binding` | 0, 0, 0, 0 | NO (zero rect) |
| 135 | `r.0.1.1.0.1.3.0.4.0` | `<a>` | — | `ng-binding` | 318.9, 309, 97.6, 42 | YES |
| 136 | `r.0.1.1.0.1.3.0.5.0` | `<a>` | — | `ng-binding` | 418.5, 309, 83.3, 42 | YES |

### Attributes (verbatim) & text

**#41 `r.0.1.1.0.1.3` `<div>`**

- `class` = "ng-isolate-scope"

**#60 `r.0.1.1.0.1.3.0` `<ul>`**

- `class` = "nav nav-tabs"
- `ng-class` = "{'nav-stacked': vertical, 'nav-justified': justified}"
- `ng-transclude` = ""
- **::before** = `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`
- **::after** = `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

**#61 `r.0.1.1.0.1.3.1` `<div>`**

- `class` = "tab-content"

**#91 `r.0.1.1.0.1.3.0.0` `<li>`**

- `ng-class` = "{active: active, disabled: disabled}"
- `heading` = "Users"
- `class` = "ng-isolate-scope active"

**#92 `r.0.1.1.0.1.3.0.1` `<li>`**

- `ng-class` = "{active: active, disabled: disabled}"
- `heading` = "Text List"
- `ng-show` = "sess.twillioApiToken"
- `class` = "ng-isolate-scope ng-hide"

**#93 `r.0.1.1.0.1.3.0.2` `<li>`**

- `ng-class` = "{active: active, disabled: disabled}"
- `heading` = "Branding (Logo / Landing Page)"
- `class` = "ng-isolate-scope"

**#94 `r.0.1.1.0.1.3.0.3` `<li>`**

- `ng-class` = "{active: active, disabled: disabled}"
- `heading` = "SSO Setup"
- `ng-show` = "sess.authMode=='sso'"
- `class` = "ng-isolate-scope ng-hide"

**#95 `r.0.1.1.0.1.3.0.4` `<li>`**

- `ng-class` = "{active: active, disabled: disabled}"
- `heading` = "User Stats"
- `class` = "ng-isolate-scope"

**#96 `r.0.1.1.0.1.3.0.5` `<li>`**

- `ng-class` = "{active: active, disabled: disabled}"
- `heading` = "Settings"
- `class` = "ng-isolate-scope"

**#97 `r.0.1.1.0.1.3.1.0` `<div>`**

- `class` = "tab-pane ng-scope active"
- `ng-repeat` = "tab in tabs"
- `ng-class` = "{active: tab.active}"
- `tab-content-transclude` = "tab"

**#98 `r.0.1.1.0.1.3.1.1` `<div>`**

- `class` = "tab-pane ng-scope"
- `ng-repeat` = "tab in tabs"
- `ng-class` = "{active: tab.active}"
- `tab-content-transclude` = "tab"

**#99 `r.0.1.1.0.1.3.1.2` `<div>`**

- `class` = "tab-pane ng-scope"
- `ng-repeat` = "tab in tabs"
- `ng-class` = "{active: tab.active}"
- `tab-content-transclude` = "tab"

**#100 `r.0.1.1.0.1.3.1.3` `<div>`**

- `class` = "tab-pane ng-scope"
- `ng-repeat` = "tab in tabs"
- `ng-class` = "{active: tab.active}"
- `tab-content-transclude` = "tab"

**#101 `r.0.1.1.0.1.3.1.4` `<div>`**

- `class` = "tab-pane ng-scope"
- `ng-repeat` = "tab in tabs"
- `ng-class` = "{active: tab.active}"
- `tab-content-transclude` = "tab"

**#102 `r.0.1.1.0.1.3.1.5` `<div>`**

- `class` = "tab-pane ng-scope"
- `ng-repeat` = "tab in tabs"
- `ng-class` = "{active: tab.active}"
- `tab-content-transclude` = "tab"

**#131 `r.0.1.1.0.1.3.0.0.0` `<a>`**

- `href` = ""
- `ng-click` = "select()"
- `tab-heading-transclude` = ""
- `class` = "ng-binding"
- **text** = "Users"

**#132 `r.0.1.1.0.1.3.0.1.0` `<a>`**

- `href` = ""
- `ng-click` = "select()"
- `tab-heading-transclude` = ""
- `class` = "ng-binding"
- **text** = "Text List"

**#133 `r.0.1.1.0.1.3.0.2.0` `<a>`**

- `href` = ""
- `ng-click` = "select()"
- `tab-heading-transclude` = ""
- `class` = "ng-binding"
- **text** = "Branding (Logo / Landing Page)"

**#134 `r.0.1.1.0.1.3.0.3.0` `<a>`**

- `href` = ""
- `ng-click` = "select()"
- `tab-heading-transclude` = ""
- `class` = "ng-binding"
- **text** = "SSO Setup"

**#135 `r.0.1.1.0.1.3.0.4.0` `<a>`**

- `href` = ""
- `ng-click` = "select()"
- `tab-heading-transclude` = ""
- `class` = "ng-binding"
- **text** = "User Stats"

**#136 `r.0.1.1.0.1.3.0.5.0` `<a>`**

- `href` = ""
- `ng-click` = "select()"
- `tab-heading-transclude` = ""
- `class` = "ng-binding"
- **text** = "Settings"

### Resolved absolute computed style — every node

#### #41 `r.0.1.1.0.1.3` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1810px / 476.766px |
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

#### #60 `r.0.1.1.0.1.3.0` `<ul>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1810px / 42px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 1px / 0px |
| border-style T R B L | none / none / solid / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(221, 221, 221) / rgb(51, 51, 51) |
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

#### #61 `r.0.1.1.0.1.3.1` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1810px / 434.766px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 10px / 20px / 10px / 20px |
| border-width T R B L | 0px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(230, 233, 238) / rgb(230, 233, 238) / rgb(230, 233, 238) / rgb(230, 233, 238) |
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

#### #91 `r.0.1.1.0.1.3.0.0` `<li>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 70.2891px / 42px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / -1px / 0px |
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

#### #92 `r.0.1.1.0.1.3.0.1` `<li>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / -1px / 0px |
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

#### #93 `r.0.1.1.0.1.3.0.2` `<li>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 232.625px / 42px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / -1px / 0px |
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

#### #94 `r.0.1.1.0.1.3.0.3` `<li>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / -1px / 0px |
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

#### #95 `r.0.1.1.0.1.3.0.4` `<li>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 99.5938px / 42px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / -1px / 0px |
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

#### #96 `r.0.1.1.0.1.3.0.5` `<li>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 85.3438px / 42px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / -1px / 0px |
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

#### #97 `r.0.1.1.0.1.3.1.0` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1768px / 393.766px |
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

#### #98 `r.0.1.1.0.1.3.1.1` `<div>` — NO (display:none)

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

#### #99 `r.0.1.1.0.1.3.1.2` `<div>` — NO (display:none)

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

#### #100 `r.0.1.1.0.1.3.1.3` `<div>` — NO (display:none)

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

#### #101 `r.0.1.1.0.1.3.1.4` `<div>` — NO (display:none)

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

#### #102 `r.0.1.1.0.1.3.1.5` `<div>` — NO (display:none)

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

#### #131 `r.0.1.1.0.1.3.0.0.0` `<a>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 68.2891px / 42px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 2px / 0px / 0px |
| padding T R B L | 10px / 15px / 10px / 15px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(221, 221, 221) / rgb(221, 221, 221) / rgba(0, 0, 0, 0) / rgb(221, 221, 221) |
| border-radius TL TR BL BR | 4px / 4px / 0px / 0px |
| background-color | rgb(255, 255, 255) |
| background-image | none |
| color | rgb(85, 85, 85) |
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
| cursor | default |
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
| outline-width / outline-color | 3px / rgb(85, 85, 85) |

#### #132 `r.0.1.1.0.1.3.0.1.0` `<a>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 2px / 0px / 0px |
| padding T R B L | 10px / 15px / 10px / 15px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) |
| border-radius TL TR BL BR | 4px / 4px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 122, 183) |
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
| cursor | pointer |
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
| outline-width / outline-color | 3px / rgb(51, 122, 183) |

#### #133 `r.0.1.1.0.1.3.0.2.0` `<a>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 230.625px / 42px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 2px / 0px / 0px |
| padding T R B L | 10px / 15px / 10px / 15px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) |
| border-radius TL TR BL BR | 4px / 4px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 122, 183) |
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
| cursor | pointer |
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
| outline-width / outline-color | 3px / rgb(51, 122, 183) |

#### #134 `r.0.1.1.0.1.3.0.3.0` `<a>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 2px / 0px / 0px |
| padding T R B L | 10px / 15px / 10px / 15px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) |
| border-radius TL TR BL BR | 4px / 4px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 122, 183) |
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
| cursor | pointer |
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
| outline-width / outline-color | 3px / rgb(51, 122, 183) |

#### #135 `r.0.1.1.0.1.3.0.4.0` `<a>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 97.5938px / 42px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 2px / 0px / 0px |
| padding T R B L | 10px / 15px / 10px / 15px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) |
| border-radius TL TR BL BR | 4px / 4px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 122, 183) |
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
| cursor | pointer |
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
| outline-width / outline-color | 3px / rgb(51, 122, 183) |

#### #136 `r.0.1.1.0.1.3.0.5.0` `<a>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 83.3438px / 42px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 2px / 0px / 0px |
| padding T R B L | 10px / 15px / 10px / 15px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) / rgba(0, 0, 0, 0) |
| border-radius TL TR BL BR | 4px / 4px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 122, 183) |
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
| cursor | pointer |
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
| outline-width / outline-color | 3px / rgb(51, 122, 183) |


---

## 6. Verbatim text

Every string in this piece, with its path. **Nothing is truncated** (longest is 29 chars; limits are 300 for attributes and 250 for text).

| path | # | element | text / `heading` attribute |
|---|---|---|---|
| `…3.0.0` | #91 | `<li>` | `heading = "Users"` |
| `…3.0.0.0` | #131 | `<a>` | `"Users"` |
| `…3.0.1` | #92 | `<li>` | `heading = "Text List"` |
| `…3.0.1.0` | #132 | `<a>` | `"Text List"` |
| `…3.0.2` | #93 | `<li>` | `heading = "Branding (Logo / Landing Page)"` |
| `…3.0.2.0` | #133 | `<a>` | `"Branding (Logo / Landing Page)"` |
| `…3.0.3` | #94 | `<li>` | `heading = "SSO Setup"` |
| `…3.0.3.0` | #134 | `<a>` | `"SSO Setup"` |
| `…3.0.4` | #95 | `<li>` | `heading = "User Stats"` |
| `…3.0.4.0` | #135 | `<a>` | `"User Stats"` |
| `…3.0.5` | #96 | `<li>` | `heading = "Settings"` |
| `…3.0.5.0` | #136 | `<a>` | `"Settings"` |

The `<ul>`, the `.tab-content` and all six `.tab-pane` divs carry **no text of their own**.

### Pseudo-elements
`#60 ul.nav.nav-tabs` carries **both** `::before` and `::after` with `{"content":"\" \"", "color":"rgb(51, 51, 51)", "font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif", "font-size":"14px", "background-color":"rgba(0, 0, 0, 0)"}` — the Bootstrap 3 clearfix. **No other node in this piece has any pseudo-element**, and there are **no icons** anywhere in the tab strip.

---

## 7. Rebuild spec (SvelteKit)

### 7.1 Markup

```svelte
<div class="tabset">
  <ul class="nav nav-tabs">
    {#each tabs as tab, i}
      {#if tab.visible}
        <li class:active={tab.active}>
          <a href="" onclick={(e) => { e.preventDefault(); select(i); }}>{tab.heading}</a>
        </li>
      {/if}
    {/each}
  </ul>

  <div class="tab-content">
    {#each tabs as tab, i}
      <div class="tab-pane" class:active={tab.active}>
        <!-- pane contents — owned by other pieces -->
      </div>
    {/each}
  </div>
</div>
```

Tab definitions exactly as captured:

```js
const tabs = [
  { heading: 'Users',                          visible: true,                       active: true  },
  { heading: 'Text List',                      visible: !!sess.twillioApiToken,     active: false },
  { heading: 'Branding (Logo / Landing Page)', visible: true,                       active: false },
  { heading: 'SSO Setup',                      visible: sess.authMode === 'sso',    active: false },
  { heading: 'User Stats',                     visible: true,                       active: false },
  { heading: 'Settings',                       visible: true,                       active: false },
];
```

Note: in the original, hidden tabs are **still rendered in the DOM** with `class="ng-hide"` (`display:none`), and their panes are always rendered. If the rebuild uses `{#if}` the DOM differs but the pixels do not.

### 7.2 CSS — resolved absolute values

```css
/* r.0.1.1.0.1.3 — uib-tabset host. No box styling of its own. */
.tabset {
  display: block; position: static; float: none; box-sizing: border-box;
  width: 1810px; height: 476.766px;
  margin: 0; padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  overflow: visible;
}

.nav.nav-tabs {
  display: block; position: static; float: none; box-sizing: border-box;
  width: 1810px; height: 42px;
  margin: 0; padding: 0;
  border: 0;
  border-bottom: 1px solid rgb(221, 221, 221);
  border-top-color: rgb(51,51,51); border-right-color: rgb(51,51,51); border-left-color: rgb(51,51,51);
  border-radius: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  list-style-type: none;
  text-align: start; white-space: normal;
  overflow: visible; opacity: 1; box-shadow: none; cursor: auto;
}
.nav.nav-tabs::before, .nav.nav-tabs::after { content: " "; }   /* clearfix */

.nav-tabs > li {
  display: block;
  position: relative; top: 0; right: 0; bottom: 0; left: 0;
  z-index: auto; float: left; box-sizing: border-box;
  height: 42px;
  margin: 0 0 -1px 0;              /* pulls the tab down over the ul's bottom border */
  padding: 0; border: 0; border-radius: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  list-style-type: none;
  overflow: visible; cursor: auto;
}
.nav-tabs > li:nth-child(1) { width:  70.2891px; }   /* Users */
.nav-tabs > li:nth-child(3) { width: 232.625px;  }   /* Branding (Logo / Landing Page) */
.nav-tabs > li:nth-child(5) { width:  99.5938px; }   /* User Stats */
.nav-tabs > li:nth-child(6) { width:  85.3438px; }   /* Settings */

/* INACTIVE tab link */
.nav-tabs > li > a {
  display: block;
  position: relative; top: 0; right: 0; bottom: 0; left: 0;
  z-index: auto; float: none; box-sizing: border-box;
  height: 42px;
  margin: 0 2px 0 0;
  padding: 10px 15px 10px 15px;
  border: 1px solid rgba(0, 0, 0, 0);          /* transparent, but 1px WIDE */
  border-top-left-radius: 4px; border-top-right-radius: 4px;
  border-bottom-left-radius: 0; border-bottom-right-radius: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 122, 183);
  outline-color: rgb(51, 122, 183);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px; font-weight: 400; line-height: 20px;
  letter-spacing: normal; text-align: start; text-transform: none;
  text-decoration-line: none; white-space: normal; vertical-align: baseline;
  list-style-type: none;
  overflow: visible; opacity: 1; box-shadow: none;
  cursor: pointer;
  transition: all 0s;
}
.nav-tabs > li:nth-child(1) > a { width:  68.2891px; }
.nav-tabs > li:nth-child(3) > a { width: 230.625px;  }
.nav-tabs > li:nth-child(5) > a { width:  97.5938px; }
.nav-tabs > li:nth-child(6) > a { width:  83.3438px; }

/* ACTIVE tab link */
.nav-tabs > li.active > a {
  border-top-color:   rgb(221, 221, 221);
  border-right-color: rgb(221, 221, 221);
  border-left-color:  rgb(221, 221, 221);
  border-bottom-color: rgba(0, 0, 0, 0);       /* 1px wide, transparent → white shows through */
  background-color: rgb(255, 255, 255);
  color: rgb(85, 85, 85);
  outline-color: rgb(85, 85, 85);
  cursor: default;                             /* NOT pointer */
}

.tab-content {
  display: block; position: static; float: none; box-sizing: border-box;
  width: 1810px; height: 434.766px;
  margin: 0;
  padding: 10px 20px 10px 20px;
  border-top-width: 0;                         /* ← NO top border */
  border-right-width: 1px; border-bottom-width: 1px; border-left-width: 1px;
  border-style: solid;                         /* all four sides are `solid`… */
  border-color: rgb(230, 233, 238);            /* …but the top has zero width */
  border-radius: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  overflow: visible;
}

.tab-pane          { display: none; }
.tab-pane.active   {
  display: block; position: static; float: none; box-sizing: border-box;
  width: 1768px;
  margin: 0; padding: 0; border: 0; border-radius: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  overflow: visible; opacity: 1; box-shadow: none; cursor: auto;
}
```

### 7.3 Non-obvious things a rebuild will get wrong if it guesses

* **`.tab-content` has `border-top-width: 0px`** even though `border-top-style: solid` and `border-top-color: rgb(230, 233, 238)` are set. The visual "top edge" of the content box is the `<ul>`'s own `border-bottom: 1px solid rgb(221, 221, 221)`. Two different greys, two different elements.
* **The `.tab-content` border colour `rgb(230, 233, 238)` differs from the `.nav-tabs` border colour `rgb(221, 221, 221)`.** They are not the same grey; do not unify them.
* **Inactive tab links have a 1px *transparent* border, not a zero border.** All four sides are `border-width: 1px; border-style: solid; border-color: rgba(0, 0, 0, 0)`. This is what keeps active and inactive tabs the same height (42px) and the same text baseline.
* **The active tab's bottom border is 1px transparent over a white background**, and the `<li>`'s `margin-bottom: -1px` slides that transparent strip exactly over the `<ul>`'s bottom border — that is the entire "tab joins the panel" trick. There is no `z-index` involved (`z-index: auto` on all of them).
* **The active tab is `cursor: default`, the inactive tabs are `cursor: pointer`**, and the active tab's text is `rgb(85, 85, 85)` while inactive tabs are link-blue `rgb(51, 122, 183)`.
* **The `<a>` `margin-right: 2px` is what separates the tabs**, and it is inside the `<li>` box (li width = a width + 2). There is no gap property, no padding on the `<li>`.
* **The active pane has no padding, no border and no margin** — its 393.766px height is entirely its child `<fieldset>`, whose `margin-bottom: 20px` collapses through the pane and expands `.tab-content` by 20px.
* Every `<a href="">` uses `ng-click="select()"` with an **empty href** — a rebuild must `preventDefault()` or the router will navigate.
* `ng-transclude` on the `<ul>` and `tab-heading-transclude` on each `<a>` are AngularUI-Bootstrap plumbing; they carry no styling and can be dropped.
* The `<ul>`'s `ng-class="{'nav-stacked': vertical, 'nav-justified': justified}"` evaluated to **neither** class at capture time — the rendered `class` is exactly `"nav nav-tabs"`. Vertical/justified variants are unused here.

---

## 8. Honest gaps

1. **Only the `Users` tab was open.** The five other panes are `display:none` with `rect 0,0,0,0`. Their **rendered layout, heights and any scroll behaviour cannot be verified from this capture** — a separate capture per tab is required for a pixel-perfect rebuild of those panes. This applies to the pane *containers* documented here as well: their non-active resolved style is simply `display: none` plus COMMON.
2. **Two tabs were never visible**: `Text List` (`ng-show="sess.twillioApiToken"` — the room has no Twilio token) and `SSO Setup` (`ng-show="sess.authMode=='sso'"` — auth mode is `open`). Their `<li>`/`<a>` widths are therefore unknown; only their percentage-free, un-laid-out styles were captured. The heading strings are known exactly.
3. **No hover / focus / `:active` states** are captured for any tab link. Bootstrap normally greys the inactive tab background on hover; the value is not in this dump.
4. **No disabled tab exists in the capture**, so the `disabled` branch of `ng-class="{active: active, disabled: disabled}"` has no observed styling.
5. **`ng-repeat="tab in tabs"` — the `tabs` array itself is not in the DOM.** The pane→tab mapping asserted above is positional, which is guaranteed by `ng-repeat` semantics and corroborated by the six `<li>` / six pane one-to-one count, but the array contents are not directly captured.
6. The **1322.15px of empty `<ul>` to the right of the last tab** contains nothing — no right-aligned controls anywhere in the strip. Confirmed by the record count (13 nodes under `r.0.1.1.0.1.3.0`, all accounted for).
