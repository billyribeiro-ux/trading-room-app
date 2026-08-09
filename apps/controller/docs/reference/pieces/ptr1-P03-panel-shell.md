# ptr1 · P03 — Bootstrap panel shell

**Capture:** `/tmp/ptr-decode/ptr1/caps/00-baseline-room/` — 2,156 records, viewport 1842×1265 @dpr2
**Page:** Manage Room, room 3625

> **Every computed value in this file is the RESOLVED ABSOLUTE value** = the `DEFAULTS.txt` COMMON table overridden by that node's `style-deviations`. You do not need `DEFAULTS.txt` to read this document.

---

## 1. Purpose

This piece is the routed page's outer container (`r.0.1.1`) and the single Bootstrap 3 `.panel.panel-default` that holds the entire Manage Room screen: a grey `.panel-heading` carrying the room title, the live/max counter and the Launch / Clone / Delete / Marketplace action buttons; a white `.panel-body` wrapper (structure only — its contents are P04 and P05); and an **empty** grey `.panel-footer`. It also documents the sibling `#permissionsModal` dialog, which is `display:none` at capture time.

## 2. Path anchors and record counts

| anchor | records | contents |
|---|---|---|
| `r.0.1.1` | 1 | `#22` — the routed-page `ui-view` div (the invalid-colour node) |
| `r.0.1.1.0` | 1 | `#26` — `div.panel.panel-default` |
| `r.0.1.1.0.0` + descendants | 16 | `.panel-heading` → `.panel-title` → 2 spans, 1 button, 4 anchors, 7 `<i>` icons |
| `r.0.1.1.0.1` | 1 | `#31` — `.panel-body` (structure only; children are P04/P05) |
| `r.0.1.1.0.2` + descendants | 1 | `#32` — `.panel-footer text-center` — **no children, no text** |
| **panel subtotal** | **20** | |
| `r.0.1.1.1#permissionsModal` + descendants | 22 | the hidden Mic/Cam/Screen permissions modal (appendix) |
| **total in this file** | **42** | |

### The invalid-colour node — `#22 r.0.1.1`

```
attr style = "background-color: 0A0A0A; "
```

`0A0A0A` is **not a valid CSS colour** — the `#` is missing. The declaration is therefore dropped by the CSS parser, and the node's `style-deviations` list confirms it: only `width` and `height` deviate; **`background-color` resolves to the COMMON value `rgba(0, 0, 0, 0)` (fully transparent)**, *not* to `rgb(10, 10, 10)`. The dark colour the author intended never paints. A pixel-perfect rebuild must reproduce the *observed* transparent background, not the intended near-black.

(For contrast: `#20 r.0.0.0` in P02 has a *valid* inline `style="background-color: black;"` and does resolve to `rgb(0, 0, 0)`.)

### Vertical geometry — every number measured, and it closes exactly

```
y=50      .panel top edge                                    (r.0.1.1.0, x=0 w=1842 h=772.766)
  +1      border-top: 1px solid rgb(221,221,221)
y=51      .panel-heading                x=1  w=1840  h=53
             padding-top 10 + content 32 + padding-bottom 10 + border-bottom 1 = 53   ✓
y=61        .panel-title                x=16 w=1810  h=32
y=104     .panel-body                   x=1  w=1840  h=696.766   (padding 15 all round)
y=800.766 .panel-footer                 x=1  w=1840  h=21
             border-top 1 + padding-top 10 + content 0 + padding-bottom 10 = 21       ✓
y=821.766 .panel bottom content edge
  +1      border-bottom: 1px
y=822.766 = 50 + 772.766                                                              ✓
```

`.panel` also has `margin-bottom: 20px`, which is why `r.0.1.1` (`h=772.766`) and `r.0.1` (`h=772.766`) match the panel's border box without the margin.

**Document-order tree:**

```
<div ui-view autoscroll="false" class="ng-fadeOutZoom ng-fluid ng-scope"
     style="background-color: 0A0A0A; ">                       #22 r.0.1.1        0,50,1842,772.8
├── <div class="panel panel-default">                          #26 r.0.1.1.0      0,50,1842,772.8
│   ├── <div class="panel-heading">                            #30 …0.0           1,51,1840,53
│   │   └── <div class="panel-title">                          #37 …0.0.0         16,61,1810,32
│   │       ├── <span ng-dblclick="canCloneDblClick()">        #46 …0.0.0.0       16,66.1,398.4,18.5
│   │       ├── <span class="text-muted ng-binding">           #47 …0.0.0.1       418.9,66.1,168,18.5
│   │       │   ├── <i class="icon fa fa-user">                #65 …0.0.0.1.0     476.7,67.6,12.6,16
│   │       │   └── <i class="icon fa fa-user">                #66 …0.0.0.1.1     556.5,67.6,12.6,16
│   │       ├── <button class="btn btn-link btn-warning">      #48 …0.0.0.2       586.9,61,124.9,32
│   │       │   └── <i class="icon fa fa-refresh">             #67 …0.0.0.2.0     598.9,70,12,14
│   │       ├── <a class="btn btn-sm pull-right btn-info mr">  #49 …0.0.0.3       1739.1,61,76.9,30
│   │       │   └── <i class="icon fa fa-external-link">       #68 …0.0.0.3.0     1750.1,70,12,12
│   │       ├── <a class="… btn-warning mr ng-hide">           #50 …0.0.0.4       HIDDEN
│   │       │   └── <i class="icon fa fa-copy">                #69 …0.0.0.4.0     HIDDEN
│   │       ├── <a class="… btn-danger mr ng-hide">            #51 …0.0.0.5       HIDDEN
│   │       │   └── <i class="icon fa fa-trash">               #70 …0.0.0.5.0     HIDDEN
│   │       └── <a class="… btn-default mr ng-hide">           #52 …0.0.0.6       HIDDEN
│   │           └── <i class="fa fa-credit-card">              #71 …0.0.0.6.0     HIDDEN
│   ├── <div class="panel-body">                               #31 …0.1           1,104,1840,696.8
│   │   ├── r.0.1.1.0.1.0  form-vertical      → P04
│   │   ├── r.0.1.1.0.1.1  <br>               → P04
│   │   ├── r.0.1.1.0.1.2  loading spinner    → P04
│   │   └── r.0.1.1.0.1.3  uib-tabset         → P05
│   └── <div class="panel-footer text-center ">                #32 …0.2           1,800.8,1840,21   EMPTY
└── <div class="modal fade" id="permissionsModal">             #27 r.0.1.1.1      display:none
```

---

## 3–5. Node table, verbatim attributes, resolved absolute computed styles

### Node table

| # | path | tag | id | class | rect x,y,w,h | renders |
|---|---|---|---|---|---|---|
| 22 | `r.0.1.1` | `<div>` | — | `ng-fadeOutZoom ng-fluid ng-scope` | 0, 50, 1842, 772.8 | YES |
| 26 | `r.0.1.1.0` | `<div>` | — | `panel panel-default` | 0, 50, 1842, 772.8 | YES |
| 27 | `r.0.1.1.1#permissionsModal` | `<div>` | permissionsModal | `modal fade` | 0, 0, 0, 0 | NO (display:none) |
| 30 | `r.0.1.1.0.0` | `<div>` | — | `panel-heading` | 1, 51, 1840, 53 | YES |
| 31 | `r.0.1.1.0.1` | `<div>` | — | `panel-body` | 1, 104, 1840, 696.8 | YES |
| 32 | `r.0.1.1.0.2` | `<div>` | — | `panel-footer text-center ` | 1, 800.8, 1840, 21 | YES |
| 33 | `r.0.1.1.1#permissionsModal.0` | `<div>` | — | `modal-dialog` | 0, 0, 0, 0 | NO (zero rect) |
| 37 | `r.0.1.1.0.0.0` | `<div>` | — | `panel-title` | 16, 61, 1810, 32 | YES |
| 42 | `r.0.1.1.1#permissionsModal.0.0` | `<div>` | — | `modal-content` | 0, 0, 0, 0 | NO (zero rect) |
| 46 | `r.0.1.1.0.0.0.0` | `<span>` | — | `ng-binding` | 16, 66.1, 398.4, 18.5 | YES |
| 47 | `r.0.1.1.0.0.0.1` | `<span>` | — | `text-muted ng-binding` | 418.9, 66.1, 168, 18.5 | YES |
| 48 | `r.0.1.1.0.0.0.2` | `<button>` | — | `btn btn-link btn-warning` | 586.9, 61, 124.9, 32 | YES |
| 49 | `r.0.1.1.0.0.0.3` | `<a>` | — | `btn btn-sm pull-right btn-info mr` | 1739.1, 61, 76.9, 30 | YES |
| 50 | `r.0.1.1.0.0.0.4` | `<a>` | — | `btn btn-sm pull-right btn-warning mr ng-hide` | 0, 0, 0, 0 | NO (display:none) |
| 51 | `r.0.1.1.0.0.0.5` | `<a>` | — | `btn btn-sm pull-right btn-danger mr ng-hide` | 0, 0, 0, 0 | NO (display:none) |
| 52 | `r.0.1.1.0.0.0.6` | `<a>` | — | `btn btn-sm pull-right btn-default mr ng-hide` | 0, 0, 0, 0 | NO (display:none) |
| 62 | `r.0.1.1.1#permissionsModal.0.0.0` | `<div>` | — | `modal-header` | 0, 0, 0, 0 | NO (zero rect) |
| 63 | `r.0.1.1.1#permissionsModal.0.0.1` | `<div>` | — | `modal-body` | 0, 0, 0, 0 | NO (zero rect) |
| 64 | `r.0.1.1.1#permissionsModal.0.0.2` | `<div>` | — | `modal-footer text-right` | 0, 0, 0, 0 | NO (zero rect) |
| 65 | `r.0.1.1.0.0.0.1.0` | `<i>` | — | `icon fa fa-user` | 476.7, 67.6, 12.6, 16 | YES |
| 66 | `r.0.1.1.0.0.0.1.1` | `<i>` | — | `icon fa fa-user` | 556.5, 67.6, 12.6, 16 | YES |
| 67 | `r.0.1.1.0.0.0.2.0` | `<i>` | — | `icon fa fa-refresh` | 598.9, 70, 12, 14 | YES |
| 68 | `r.0.1.1.0.0.0.3.0` | `<i>` | — | `icon fa fa-external-link` | 1750.1, 70, 12, 12 | YES |
| 69 | `r.0.1.1.0.0.0.4.0` | `<i>` | — | `icon fa fa-copy` | 0, 0, 0, 0 | NO (zero rect) |
| 70 | `r.0.1.1.0.0.0.5.0` | `<i>` | — | `icon fa fa-trash` | 0, 0, 0, 0 | NO (zero rect) |
| 71 | `r.0.1.1.0.0.0.6.0` | `<i>` | — | `fa fa-credit-card` | 0, 0, 0, 0 | NO (zero rect) |
| 103 | `r.0.1.1.1#permissionsModal.0.0.0.0` | `<button>` | — | `close` | 0, 0, 0, 0 | NO (zero rect) |
| 104 | `r.0.1.1.1#permissionsModal.0.0.0.1#permissionsModalLabel` | `<h4>` | permissionsModalLabel | `modal-title` | 0, 0, 0, 0 | NO (zero rect) |
| 105 | `r.0.1.1.1#permissionsModal.0.0.1.0` | `<label>` | — | `d-block` | 0, 0, 0, 0 | NO (zero rect) |
| 106 | `r.0.1.1.1#permissionsModal.0.0.1.1` | `<label>` | — | `d-block` | 0, 0, 0, 0 | NO (zero rect) |
| 107 | `r.0.1.1.1#permissionsModal.0.0.1.2` | `<label>` | — | `d-block` | 0, 0, 0, 0 | NO (zero rect) |
| 108 | `r.0.1.1.1#permissionsModal.0.0.1.3` | `<label>` | — | `d-block` | 0, 0, 0, 0 | NO (zero rect) |
| 109 | `r.0.1.1.1#permissionsModal.0.0.1.4` | `<label>` | — | `d-block` | 0, 0, 0, 0 | NO (zero rect) |
| 110 | `r.0.1.1.1#permissionsModal.0.0.2.0` | `<button>` | — | `btn btn-default` | 0, 0, 0, 0 | NO (zero rect) |
| 111 | `r.0.1.1.1#permissionsModal.0.0.2.1` | `<button>` | — | `btn btn-success` | 0, 0, 0, 0 | NO (zero rect) |
| 147 | `r.0.1.1.1#permissionsModal.0.0.0.0.0` | `<span>` | — | `—` | 0, 0, 0, 0 | NO (zero rect) |
| 148 | `r.0.1.1.1#permissionsModal.0.0.0.1#permissionsModalLabel.0` | `<i>` | — | `ng-binding` | 0, 0, 0, 0 | NO (zero rect) |
| 149 | `r.0.1.1.1#permissionsModal.0.0.1.0.0` | `<input>` | — | `ng-pristine ng-untouched ng-valid` | 0, 0, 0, 0 | NO (zero rect) |
| 150 | `r.0.1.1.1#permissionsModal.0.0.1.1.0` | `<input>` | — | `ng-pristine ng-untouched ng-valid` | 0, 0, 0, 0 | NO (zero rect) |
| 151 | `r.0.1.1.1#permissionsModal.0.0.1.2.0` | `<input>` | — | `ng-pristine ng-untouched ng-valid` | 0, 0, 0, 0 | NO (zero rect) |
| 152 | `r.0.1.1.1#permissionsModal.0.0.1.3.0` | `<input>` | — | `ng-pristine ng-untouched ng-valid` | 0, 0, 0, 0 | NO (zero rect) |
| 153 | `r.0.1.1.1#permissionsModal.0.0.1.4.0` | `<input>` | — | `ng-pristine ng-untouched ng-valid` | 0, 0, 0, 0 | NO (zero rect) |

### Attributes (verbatim) & text

**#22 `r.0.1.1` `<div>`**

- `ui-view` = ""
- `autoscroll` = "false"
- `class` = "ng-fadeOutZoom ng-fluid ng-scope"
- `style` = "background-color: 0A0A0A; "

**#26 `r.0.1.1.0` `<div>`**

- `class` = "panel panel-default"

**#27 `r.0.1.1.1#permissionsModal` `<div>`**

- `class` = "modal fade"
- `id` = "permissionsModal"
- `tabindex` = "-1"
- `role` = "dialog"
- `aria-labelledby` = "permissionsModalLabel"

**#30 `r.0.1.1.0.0` `<div>`**

- `class` = "panel-heading"

**#31 `r.0.1.1.0.1` `<div>`**

- `class` = "panel-body"
- **::before** = `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`
- **::after** = `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

**#32 `r.0.1.1.0.2` `<div>`**

- `class` = "panel-footer text-center "

**#33 `r.0.1.1.1#permissionsModal.0` `<div>`**

- `class` = "modal-dialog"
- `role` = "document"

**#37 `r.0.1.1.0.0.0` `<div>`**

- `class` = "panel-title"

**#42 `r.0.1.1.1#permissionsModal.0.0` `<div>`**

- `class` = "modal-content"

**#46 `r.0.1.1.0.0.0.0` `<span>`**

- `ng-dblclick` = "canCloneDblClick()"
- `class` = "ng-binding"
- **text** = "Manage Room id: 3625  ( 6a628a99731b9f77ae9bf505 )"

**#47 `r.0.1.1.0.0.0.1` `<span>`**

- `class` = "text-muted ng-binding"
- **text** = "Current : 0 / Max  0"

**#48 `r.0.1.1.0.0.0.2` `<button>`**

- `class` = "btn btn-link btn-warning"
- `ng-click` = "resetMaxCount()"
- **text** = "Reset Counts"

**#49 `r.0.1.1.0.0.0.3` `<a>`**

- `ng-href` = "/session?id=3625&jwtSite=[REDACTED_CAPTURE_JWT]"
- `target` = "_blank"
- `class` = "btn btn-sm pull-right btn-info mr"
- `href` = "/session?id=3625&jwtSite=[REDACTED_CAPTURE_JWT]"
- **text** = "Launch"

**#50 `r.0.1.1.0.0.0.4` `<a>`**

- `href` = ""
- `ng-show` = "sess.canClone || sess.isClonedRoom || canCloneClicks"
- `ng-click` = "cloneRoom(sess._id)"
- `class` = "btn btn-sm pull-right btn-warning mr ng-hide"
- **text** = "Clone Room"

**#51 `r.0.1.1.0.0.0.5` `<a>`**

- `href` = ""
- `ng-show` = "sess.isClonedRoom"
- `ng-click` = "deleteRoom(sess._id)"
- `class` = "btn btn-sm pull-right btn-danger mr ng-hide"
- **text** = "Delete Room"

**#52 `r.0.1.1.0.0.0.6` `<a>`**

- `href` = ""
- `ng-hide` = "disableMarketplace"
- `ng-click` = "manageMarketplaceSession(sess._id, sess)"
- `class` = "btn btn-sm pull-right btn-default mr ng-hide"
- **text** = "Marketplace"

**#62 `r.0.1.1.1#permissionsModal.0.0.0` `<div>`**

- `class` = "modal-header"
- **::before** = `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`
- **::after** = `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

**#63 `r.0.1.1.1#permissionsModal.0.0.1` `<div>`**

- `class` = "modal-body"

**#64 `r.0.1.1.1#permissionsModal.0.0.2` `<div>`**

- `class` = "modal-footer text-right"
- **::before** = `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`
- **::after** = `{"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

**#65 `r.0.1.1.0.0.0.1.0` `<i>`**

- `class` = "icon fa fa-user"
- **::before** = `{"content":"\"\"","color":"rgb(119, 119, 119)","font-family":"FontAwesome","font-size":"16px","background-color":"rgba(0, 0, 0, 0)"}`

**#66 `r.0.1.1.0.0.0.1.1` `<i>`**

- `class` = "icon fa fa-user"
- **::before** = `{"content":"\"\"","color":"rgb(119, 119, 119)","font-family":"FontAwesome","font-size":"16px","background-color":"rgba(0, 0, 0, 0)"}`

**#67 `r.0.1.1.0.0.0.2.0` `<i>`**

- `class` = "icon fa fa-refresh"
- **::before** = `{"content":"\"\"","color":"rgb(51, 122, 183)","font-family":"FontAwesome","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

**#68 `r.0.1.1.0.0.0.3.0` `<i>`**

- `class` = "icon fa fa-external-link"
- **::before** = `{"content":"\"\"","color":"rgb(51, 51, 51)","font-family":"FontAwesome","font-size":"12px","background-color":"rgba(0, 0, 0, 0)"}`

**#69 `r.0.1.1.0.0.0.4.0` `<i>`**

- `class` = "icon fa fa-copy"
- `aria-hidden` = "true"
- **::before** = `{"content":"\"\"","color":"rgb(51, 51, 51)","font-family":"FontAwesome","font-size":"12px","background-color":"rgba(0, 0, 0, 0)"}`

**#70 `r.0.1.1.0.0.0.5.0` `<i>`**

- `class` = "icon fa fa-trash"
- `aria-hidden` = "true"
- **::before** = `{"content":"\"\"","color":"rgb(51, 51, 51)","font-family":"FontAwesome","font-size":"12px","background-color":"rgba(0, 0, 0, 0)"}`

**#71 `r.0.1.1.0.0.0.6.0` `<i>`**

- `class` = "fa fa-credit-card"
- **::before** = `{"content":"\"\"","color":"rgb(51, 51, 51)","font-family":"FontAwesome","font-size":"12px","background-color":"rgba(0, 0, 0, 0)"}`

**#103 `r.0.1.1.1#permissionsModal.0.0.0.0` `<button>`**

- `type` = "button"
- `class` = "close"
- `data-dismiss` = "modal"
- `aria-label` = "Close"

**#104 `r.0.1.1.1#permissionsModal.0.0.0.1#permissionsModalLabel` `<h4>`**

- `class` = "modal-title"
- `id` = "permissionsModalLabel"
- **text** = "Adjust Mic/Cam/Screen permissions for user:"

**#105 `r.0.1.1.1#permissionsModal.0.0.1.0` `<label>`**

- `class` = "d-block"
- **text** = "Microphone"

**#106 `r.0.1.1.1#permissionsModal.0.0.1.1` `<label>`**

- `class` = "d-block"
- **text** = "Screenshare"

**#107 `r.0.1.1.1#permissionsModal.0.0.1.2` `<label>`**

- `class` = "d-block"
- **text** = "WebCam"

**#108 `r.0.1.1.1#permissionsModal.0.0.1.3` `<label>`**

- `class` = "d-block"
- **text** = "AdminChat"

**#109 `r.0.1.1.1#permissionsModal.0.0.1.4` `<label>`**

- `class` = "d-block"
- **text** = "CanEditNotes"

**#110 `r.0.1.1.1#permissionsModal.0.0.2.0` `<button>`**

- `type` = "button"
- `class` = "btn btn-default"
- `data-dismiss` = "modal"
- **text** = "Close"

**#111 `r.0.1.1.1#permissionsModal.0.0.2.1` `<button>`**

- `type` = "button"
- `ng-click` = "saveUserPermissions()"
- `class` = "btn btn-success"
- **text** = "Save Changes"

**#147 `r.0.1.1.1#permissionsModal.0.0.0.0.0` `<span>`**

- `aria-hidden` = "true"
- **text** = "×"

**#148 `r.0.1.1.1#permissionsModal.0.0.0.1#permissionsModalLabel.0` `<i>`**

- `class` = "ng-binding"

**#149 `r.0.1.1.1#permissionsModal.0.0.1.0.0` `<input>`**

- `ng-change` = "toggleHasMic()"
- `ng-model` = "userPermissions.hasMic"
- `type` = "checkbox"
- `name` = "checkbox"
- `class` = "ng-pristine ng-untouched ng-valid"

**#150 `r.0.1.1.1#permissionsModal.0.0.1.1.0` `<input>`**

- `ng-change` = "toggleHasScreen()"
- `ng-model` = "userPermissions.hasScreen"
- `type` = "checkbox"
- `name` = "checkbox"
- `class` = "ng-pristine ng-untouched ng-valid"

**#151 `r.0.1.1.1#permissionsModal.0.0.1.2.0` `<input>`**

- `ng-change` = "toggleHasCam()"
- `ng-model` = "userPermissions.hasCam"
- `type` = "checkbox"
- `name` = "checkbox"
- `class` = "ng-pristine ng-untouched ng-valid"

**#152 `r.0.1.1.1#permissionsModal.0.0.1.3.0` `<input>`**

- `ng-change` = "toggleHasAdminChat()"
- `ng-model` = "userPermissions.hasAdminChat"
- `type` = "checkbox"
- `name` = "checkbox"
- `class` = "ng-pristine ng-untouched ng-valid"

**#153 `r.0.1.1.1#permissionsModal.0.0.1.4.0` `<input>`**

- `ng-change` = "toggleCanEditNotes()"
- `ng-model` = "userPermissions.canEditNotes"
- `type` = "checkbox"
- `name` = "checkbox"
- `class` = "ng-pristine ng-untouched ng-valid"

### Resolved absolute computed style — every node

#### #22 `r.0.1.1` `<div>` — YES

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

#### #26 `r.0.1.1.0` `<div>` — YES

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
| margin T R B L | 0px / 0px / 20px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(221, 221, 221) / rgb(221, 221, 221) / rgb(221, 221, 221) / rgb(221, 221, 221) |
| border-radius TL TR BL BR | 4px / 4px / 4px / 4px |
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
| opacity | 1 |
| box-shadow | rgba(0, 0, 0, 0.05) 0px 1px 1px 0px |
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

#### #27 `r.0.1.1.1#permissionsModal` `<div>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | fixed |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | 1050 |
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
| overflow-x / overflow-y | hidden / hidden |
| opacity | 0 |
| box-shadow | none |
| cursor | auto |
| transition-property | opacity |
| transition-duration | 0.15s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 0px / rgb(51, 51, 51) |

#### #30 `r.0.1.1.0.0` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1840px / 53px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 10px / 15px / 10px / 15px |
| border-width T R B L | 0px / 0px / 1px / 0px |
| border-style T R B L | none / none / solid / none |
| border-color T R B L | rgb(221, 221, 221) / rgb(221, 221, 221) / rgb(221, 221, 221) / rgb(221, 221, 221) |
| border-radius TL TR BL BR | 3px / 3px / 0px / 0px |
| background-color | rgb(245, 245, 245) |
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

#### #31 `r.0.1.1.0.1` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1840px / 696.766px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 15px / 15px / 15px / 15px |
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

#### #32 `r.0.1.1.0.2` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1840px / 21px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 10px / 15px / 10px / 15px |
| border-width T R B L | 1px / 0px / 0px / 0px |
| border-style T R B L | solid / none / none / none |
| border-color T R B L | rgb(221, 221, 221) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 3px / 3px |
| background-color | rgb(245, 245, 245) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | center |
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

#### #33 `r.0.1.1.1#permissionsModal.0` `<div>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 600px / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 30px / auto / 30px / auto |
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
| transition-property | transform |
| transition-duration | 0.3s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #37 `r.0.1.1.0.0.0` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1810px / 32px |
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
| font-size | 16px |
| font-weight | 400 |
| font-style | normal |
| line-height | 22.8571px |
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

#### #42 `r.0.1.1.1#permissionsModal.0.0` `<div>` — NO (zero rect)

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
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 20px / 20px / 20px / 20px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgba(0, 0, 0, 0.2) / rgba(0, 0, 0, 0.2) / rgba(0, 0, 0, 0.2) / rgba(0, 0, 0, 0.2) |
| border-radius TL TR BL BR | 6px / 6px / 6px / 6px |
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
| opacity | 1 |
| box-shadow | rgba(0, 0, 0, 0.5) 0px 5px 15px 0px |
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
| background-clip | padding-box |
| outline-width / outline-color | 0px / rgb(51, 51, 51) |

#### #46 `r.0.1.1.0.0.0.0` `<span>` — YES

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
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 16px |
| font-weight | 400 |
| font-style | normal |
| line-height | 22.8571px |
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

#### #47 `r.0.1.1.0.0.0.1` `<span>` — YES

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
| border-color T R B L | rgb(119, 119, 119) / rgb(119, 119, 119) / rgb(119, 119, 119) / rgb(119, 119, 119) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(119, 119, 119) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 16px |
| font-weight | 400 |
| font-style | normal |
| line-height | 22.8571px |
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
| outline-width / outline-color | 3px / rgb(119, 119, 119) |

#### #48 `r.0.1.1.0.0.0.2` `<button>` — YES

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 124.945px / 32px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 6px / 12px / 6px / 12px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 122, 183) / rgb(51, 122, 183) / rgb(51, 122, 183) / rgb(51, 122, 183) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 122, 183) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | rgb(0, 0, 0) 0px 0px 0px 0px |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 122, 183) |

#### #49 `r.0.1.1.0.0.0.3` `<a>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | right |
| box-sizing | border-box |
| width / height | 76.9141px / 30px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 10px / 0px / 0px |
| padding T R B L | 5px / 10px / 5px / 10px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(70, 184, 218) / rgb(70, 184, 218) / rgb(70, 184, 218) / rgb(70, 184, 218) |
| border-radius TL TR BL BR | 3px / 3px / 3px / 3px |
| background-color | rgb(91, 192, 222) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 12px |
| font-weight | 400 |
| font-style | normal |
| line-height | 18px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #50 `r.0.1.1.0.0.0.4` `<a>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | right |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 10px / 0px / 0px |
| padding T R B L | 5px / 10px / 5px / 10px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(238, 162, 54) / rgb(238, 162, 54) / rgb(238, 162, 54) / rgb(238, 162, 54) |
| border-radius TL TR BL BR | 3px / 3px / 3px / 3px |
| background-color | rgb(240, 173, 78) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 12px |
| font-weight | 400 |
| font-style | normal |
| line-height | 18px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #51 `r.0.1.1.0.0.0.5` `<a>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | right |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 10px / 0px / 0px |
| padding T R B L | 5px / 10px / 5px / 10px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(212, 63, 58) / rgb(212, 63, 58) / rgb(212, 63, 58) / rgb(212, 63, 58) |
| border-radius TL TR BL BR | 3px / 3px / 3px / 3px |
| background-color | rgb(217, 83, 79) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 12px |
| font-weight | 400 |
| font-style | normal |
| line-height | 18px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #52 `r.0.1.1.0.0.0.6` `<a>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | right |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 10px / 0px / 0px |
| padding T R B L | 5px / 10px / 5px / 10px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(230, 233, 238) / rgb(230, 233, 238) / rgb(230, 233, 238) / rgb(230, 233, 238) |
| border-radius TL TR BL BR | 3px / 3px / 3px / 3px |
| background-color | rgb(255, 255, 255) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 12px |
| font-weight | 400 |
| font-style | normal |
| line-height | 18px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #62 `r.0.1.1.1#permissionsModal.0.0.0` `<div>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 15px / 15px / 15px / 15px |
| border-width T R B L | 0px / 0px / 1px / 0px |
| border-style T R B L | none / none / solid / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(229, 229, 229) / rgb(51, 51, 51) |
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

#### #63 `r.0.1.1.1#permissionsModal.0.0.1` `<div>` — NO (zero rect)

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
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 15px / 15px / 15px / 15px |
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

#### #64 `r.0.1.1.1#permissionsModal.0.0.2` `<div>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 15px / 15px / 15px / 15px |
| border-width T R B L | 1px / 0px / 0px / 0px |
| border-style T R B L | solid / none / none / none |
| border-color T R B L | rgb(229, 229, 229) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
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
| text-align | right |
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

#### #65 `r.0.1.1.0.0.0.1.0` `<i>` — YES

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 12.5781px / 16px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(119, 119, 119) / rgb(119, 119, 119) / rgb(119, 119, 119) / rgb(119, 119, 119) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(119, 119, 119) |
| font-family | FontAwesome |
| font-size | 16px |
| font-weight | 400 |
| font-style | normal |
| line-height | 16px |
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
| transform | matrix(1, 0, 0, 1, 0, 0) |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(119, 119, 119) |

#### #66 `r.0.1.1.0.0.0.1.1` `<i>` — YES

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 12.5781px / 16px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(119, 119, 119) / rgb(119, 119, 119) / rgb(119, 119, 119) / rgb(119, 119, 119) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(119, 119, 119) |
| font-family | FontAwesome |
| font-size | 16px |
| font-weight | 400 |
| font-style | normal |
| line-height | 16px |
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
| transform | matrix(1, 0, 0, 1, 0, 0) |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(119, 119, 119) |

#### #67 `r.0.1.1.0.0.0.2.0` `<i>` — YES

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 12px / 14px |
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
| font-family | FontAwesome |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 14px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | matrix(1, 0, 0, 1, 0, 0) |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 122, 183) |

#### #68 `r.0.1.1.0.0.0.3.0` `<i>` — YES

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 12px / 12px |
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
| font-family | FontAwesome |
| font-size | 12px |
| font-weight | 400 |
| font-style | normal |
| line-height | 12px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | matrix(1, 0, 0, 1, 0, 0) |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #69 `r.0.1.1.0.0.0.4.0` `<i>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
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
| font-family | FontAwesome |
| font-size | 12px |
| font-weight | 400 |
| font-style | normal |
| line-height | 12px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #70 `r.0.1.1.0.0.0.5.0` `<i>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
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
| font-family | FontAwesome |
| font-size | 12px |
| font-weight | 400 |
| font-style | normal |
| line-height | 12px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #71 `r.0.1.1.0.0.0.6.0` `<i>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
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
| font-family | FontAwesome |
| font-size | 12px |
| font-weight | 400 |
| font-style | normal |
| line-height | 12px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #103 `r.0.1.1.1#permissionsModal.0.0.0.0` `<button>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | right |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | -2px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(0, 0, 0) / rgb(0, 0, 0) / rgb(0, 0, 0) / rgb(0, 0, 0) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(0, 0, 0) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 21px |
| font-weight | 700 |
| font-style | normal |
| line-height | 21px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | rgb(255, 255, 255) 0px 1px 0px |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 0.2 |
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
| outline-width / outline-color | 3px / rgb(0, 0, 0) |

#### #104 `r.0.1.1.1#permissionsModal.0.0.0.1#permissionsModalLabel` `<h4>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
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
| font-size | 18px |
| font-weight | 500 |
| font-style | normal |
| line-height | 25.7143px |
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

#### #105 `r.0.1.1.1#permissionsModal.0.0.1.0` `<label>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / 100% |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 5px / 0px |
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
| font-weight | 700 |
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
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #106 `r.0.1.1.1#permissionsModal.0.0.1.1` `<label>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / 100% |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 5px / 0px |
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
| font-weight | 700 |
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
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #107 `r.0.1.1.1#permissionsModal.0.0.1.2` `<label>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / 100% |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 5px / 0px |
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
| font-weight | 700 |
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
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #108 `r.0.1.1.1#permissionsModal.0.0.1.3` `<label>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / 100% |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 5px / 0px |
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
| font-weight | 700 |
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
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #109 `r.0.1.1.1#permissionsModal.0.0.1.4` `<label>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / 100% |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 5px / 0px |
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
| font-weight | 700 |
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
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #110 `r.0.1.1.1#permissionsModal.0.0.2.0` `<button>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 6px / 12px / 6px / 12px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(230, 233, 238) / rgb(230, 233, 238) / rgb(230, 233, 238) / rgb(230, 233, 238) |
| border-radius TL TR BL BR | 4px / 4px / 4px / 4px |
| background-color | rgb(255, 255, 255) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #111 `r.0.1.1.1#permissionsModal.0.0.2.1` `<button>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 5px |
| padding T R B L | 6px / 12px / 6px / 12px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(76, 174, 76) / rgb(76, 174, 76) / rgb(76, 174, 76) / rgb(76, 174, 76) |
| border-radius TL TR BL BR | 4px / 4px / 4px / 4px |
| background-color | rgb(92, 184, 92) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |

#### #147 `r.0.1.1.1#permissionsModal.0.0.0.0.0` `<span>` — NO (zero rect)

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
| border-color T R B L | rgb(0, 0, 0) / rgb(0, 0, 0) / rgb(0, 0, 0) / rgb(0, 0, 0) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(0, 0, 0) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 21px |
| font-weight | 700 |
| font-style | normal |
| line-height | 21px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | rgb(255, 255, 255) 0px 1px 0px |
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
| outline-width / outline-color | 3px / rgb(0, 0, 0) |

#### #148 `r.0.1.1.1#permissionsModal.0.0.0.1#permissionsModalLabel.0` `<i>` — NO (zero rect)

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
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 18px |
| font-weight | 500 |
| font-style | italic |
| line-height | 25.7143px |
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

#### #149 `r.0.1.1.1#permissionsModal.0.0.1.0.0` `<input>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 4px / 0px / 0px / 0px |
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
| font-weight | 700 |
| font-style | normal |
| line-height | normal |
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
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | auto |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #150 `r.0.1.1.1#permissionsModal.0.0.1.1.0` `<input>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 4px / 0px / 0px / 0px |
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
| font-weight | 700 |
| font-style | normal |
| line-height | normal |
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
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | auto |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #151 `r.0.1.1.1#permissionsModal.0.0.1.2.0` `<input>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 4px / 0px / 0px / 0px |
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
| font-weight | 700 |
| font-style | normal |
| line-height | normal |
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
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | auto |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #152 `r.0.1.1.1#permissionsModal.0.0.1.3.0` `<input>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 4px / 0px / 0px / 0px |
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
| font-weight | 700 |
| font-style | normal |
| line-height | normal |
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
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | auto |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #153 `r.0.1.1.1#permissionsModal.0.0.1.4.0` `<input>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 4px / 0px / 0px / 0px |
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
| font-weight | 700 |
| font-style | normal |
| line-height | normal |
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
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | auto |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |


---

## 6. Verbatim text

### Panel (rendering)

| path | # | text (verbatim) | notes |
|---|---|---|---|
| `r.0.1.1.0.0.0.0` | #46 | `"Manage Room id: 3625  ( 6a628a99731b9f77ae9bf505 )"` | **two spaces** after `3625`; spaces inside the parentheses. 16px, `rgb(51,51,51)`, measured 398.4px wide |
| `r.0.1.1.0.0.0.1` | #47 | `"Current : 0 / Max  0"` | **two spaces** between `Max` and `0`. `rgb(119,119,119)` (`.text-muted`), 16px |
| `r.0.1.1.0.0.0.2` | #48 | `"Reset Counts"` | button label, `rgb(51,122,183)` |
| `r.0.1.1.0.0.0.3` | #49 | `"Launch"` | 12px, colour `rgb(51,51,51)` — see §7.3 |

### Panel (present in DOM but `display:none`)

| path | # | text | why hidden |
|---|---|---|---|
| `r.0.1.1.0.0.0.4` | #50 | `"Clone Room"` | `ng-show="sess.canClone \|\| sess.isClonedRoom \|\| canCloneClicks"` → all falsy; class has `ng-hide` |
| `r.0.1.1.0.0.0.5` | #51 | `"Delete Room"` | `ng-show="sess.isClonedRoom"` → falsy |
| `r.0.1.1.0.0.0.6` | #52 | `"Marketplace"` | `ng-hide="disableMarketplace"` → truthy |

`.panel-footer` (`#32`) has **no `text:` line and no child records** — it is genuinely empty, painting only its grey bar.

### Icon glyphs (captured `::before`)

| node | class | codepoint | `::before` colour / font-size |
|---|---|---|---|
| #65 `…0.0.0.1.0` | `icon fa fa-user` | **U+F007** | `rgb(119, 119, 119)` / 16px |
| #66 `…0.0.0.1.1` | `icon fa fa-user` | **U+F007** | `rgb(119, 119, 119)` / 16px |
| #67 `…0.0.0.2.0` | `icon fa fa-refresh` | **U+F021** | `rgb(51, 122, 183)` / 14px |
| #68 `…0.0.0.3.0` | `icon fa fa-external-link` | **U+F08E** | `rgb(51, 51, 51)` / 12px |
| #69 `…0.0.0.4.0` | `icon fa fa-copy` (hidden) | **U+F0C5** | `rgb(51, 51, 51)` / 12px |
| #70 `…0.0.0.5.0` | `icon fa fa-trash` (hidden) | **U+F1F8** | `rgb(51, 51, 51)` / 12px |
| #71 `…0.0.0.6.0` | `fa fa-credit-card` (hidden) | **U+F09D** | `rgb(51, 51, 51)` / 12px |

### Clearfix pseudo-elements
`#31 .panel-body` carries **both** `::before` and `::after` with `content: " "` (colour `rgb(51,51,51)`, font `"Helvetica Neue", Helvetica, Arial, sans-serif`, 14px, transparent background). `#26 .panel`, `#30 .panel-heading`, `#37 .panel-title` and `#32 .panel-footer` have **no** pseudo-elements.

### Truncated values in this piece
`#49` `ng-href` **and** `href` are both **truncated at exactly 300 characters** (measured). Captured prefix:

```
/session?id=3625&jwtSite=[REDACTED_CAPTURE_JWT]     ← CUT
```

The JWT header + payload decode cleanly (base64url):
* header `{"alg":"HS256","typ":"JWT"}`
* payload `{"name":"[OWNER_JWT_NAME]","email":"[OWNER_EMAIL]","id":"[OWNER_USER_ID]","type":"site","issued":1784840082215,"iat":1784840082,"exp":1815944082}`
* signature **truncated** (`AqpORjtpJqPb-q…`).

No other attribute or text in this piece hits a truncation limit.

---

## 7. Rebuild spec (SvelteKit)

### 7.1 Markup

```svelte
<div class="ng-fadeOutZoom ng-fluid">        <!-- r.0.1.1 : NO background (invalid decl dropped) -->
  <div class="panel panel-default">
    <div class="panel-heading">
      <div class="panel-title">
        <span ondblclick={canCloneDblClick}>Manage Room id: {roomId}  ( {sessionId} )</span>
        <span class="text-muted">Current : <i class="icon fa fa-user"></i>{current} / Max <i class="icon fa fa-user"></i> {max}</span>
        <button class="btn btn-link btn-warning" onclick={resetMaxCount}><i class="icon fa fa-refresh"></i>Reset Counts</button>

        <a class="btn btn-sm pull-right btn-info mr" target="_blank" href={launchUrl}><i class="icon fa fa-external-link"></i>Launch</a>
        {#if canClone}   <a class="btn btn-sm pull-right btn-warning mr" onclick={() => cloneRoom(sess._id)}><i class="icon fa fa-copy" aria-hidden="true"></i>Clone Room</a>{/if}
        {#if isCloned}   <a class="btn btn-sm pull-right btn-danger  mr" onclick={() => deleteRoom(sess._id)}><i class="icon fa fa-trash" aria-hidden="true"></i>Delete Room</a>{/if}
        {#if !disableMarketplace}<a class="btn btn-sm pull-right btn-default mr" onclick={() => manageMarketplaceSession(sess._id, sess)}><i class="fa fa-credit-card"></i>Marketplace</a>{/if}
      </div>
    </div>

    <div class="panel-body">
      <!-- P04: form-vertical, <br>, loading spinner -->
      <!-- P05: uib-tabset -->
    </div>

    <div class="panel-footer text-center"></div>
  </div>
</div>
```

### 7.2 CSS — resolved absolute values

```css
/* r.0.1.1 — routed page wrapper. Background stays TRANSPARENT. */
.page-view {
  display: block; position: static; box-sizing: border-box;
  width: 1842px; height: 772.766px;
  margin: 0; padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  overflow: visible;
}

.panel.panel-default {
  display: block; position: static; float: none; box-sizing: border-box;
  width: 1842px; height: 772.766px;
  margin: 0 0 20px 0;
  padding: 0;
  border: 1px solid rgb(221, 221, 221);
  border-radius: 4px;
  background-color: rgb(255, 255, 255);
  background-image: none;
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: start; white-space: normal;
  overflow: visible; opacity: 1;
  box-shadow: rgba(0, 0, 0, 0.05) 0px 1px 1px 0px;
  cursor: auto; transition: all 0s;
}

.panel-heading {
  display: block; position: static; box-sizing: border-box;
  width: 1840px; height: 53px;
  margin: 0;
  padding: 10px 15px 10px 15px;
  border: 0;
  border-bottom: 1px solid rgb(221, 221, 221);
  border-color: rgb(221, 221, 221);           /* all four sides */
  border-top-left-radius: 3px; border-top-right-radius: 3px;
  border-bottom-left-radius: 0; border-bottom-right-radius: 0;
  background-color: rgb(245, 245, 245);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  overflow: visible;
}

.panel-title {
  display: block; position: static; box-sizing: border-box;
  width: 1810px; height: 32px;
  margin: 0; padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 16px; font-weight: 400;
  line-height: 22.8571px;                     /* NOT 20px — panel-title bumps it */
  text-align: start; white-space: normal;
  overflow: visible;
}

.panel-title > span:first-child { display: inline; font-size: 16px; line-height: 22.8571px; color: rgb(51,51,51); }
.panel-title > span.text-muted  { display: inline; font-size: 16px; line-height: 22.8571px;
                                  color: rgb(119,119,119); border-color: rgb(119,119,119); outline-color: rgb(119,119,119); }
.panel-title .icon.fa.fa-user   { display: inline-block; width: 12.5781px; height: 16px;
                                  font-family: FontAwesome; font-size: 16px; line-height: 16px;
                                  color: rgb(119,119,119); transform: matrix(1,0,0,1,0,0); }

/* "Reset Counts" — btn-link wins the colour, btn-warning contributes nothing visible */
.btn.btn-link.btn-warning {
  display: inline-block; position: static; float: none; box-sizing: border-box;
  width: 124.945px; height: 32px;
  margin: 0;
  padding: 6px 12px 6px 12px;
  border: 0;                                   /* border-width is 0px on all four sides */
  border-color: rgb(51, 122, 183);
  border-radius: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 122, 183);
  outline-color: rgb(51, 122, 183);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px; font-weight: 400; line-height: 20px;
  text-align: center; white-space: nowrap; vertical-align: middle;
  box-shadow: rgb(0, 0, 0) 0px 0px 0px 0px;    /* zero-spread shadow, i.e. invisible */
  cursor: pointer; user-select: none;
  transition: all 0s;
}
.btn.btn-link .icon.fa.fa-refresh { display:inline-block; width:12px; height:14px;
  font-family: FontAwesome; font-size:14px; line-height:14px; color: rgb(51,122,183);
  text-align:center; white-space:nowrap; cursor:pointer; user-select:none; transform: matrix(1,0,0,1,0,0); }

/* "Launch" */
a.btn.btn-sm.pull-right.btn-info.mr {
  display: block;                              /* resolved display is `block`, not inline-block */
  position: static; float: right; box-sizing: border-box;
  width: 76.9141px; height: 30px;
  margin: 0 10px 0 0;                          /* .mr */
  padding: 5px 10px 5px 10px;
  border: 1px solid rgb(70, 184, 218);
  border-radius: 3px;
  background-color: rgb(91, 192, 222);
  color: rgb(51, 51, 51);                      /* NOT white — see §7.3 */
  outline-color: rgb(51, 51, 51);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 12px; font-weight: 400; line-height: 18px;
  text-align: center; white-space: nowrap; vertical-align: middle;
  text-decoration-line: none;
  cursor: pointer; user-select: none;
}
a.btn .icon.fa.fa-external-link { display:inline-block; width:12px; height:12px;
  font-family: FontAwesome; font-size:12px; line-height:12px; color: rgb(51,51,51);
  text-align:center; white-space:nowrap; cursor:pointer; user-select:none; transform: matrix(1,0,0,1,0,0); }

/* the three hidden action buttons — same box model as Launch, different palette */
a.btn.btn-sm.btn-warning.mr { border: 1px solid rgb(238,162,54); background-color: rgb(240,173,78); }
a.btn.btn-sm.btn-danger.mr  { border: 1px solid rgb(212, 63,58); background-color: rgb(217, 83, 79); }
a.btn.btn-sm.btn-default.mr { border: 1px solid rgb(230,233,238); background-color: rgb(255,255,255); }
/* all three: color rgb(51,51,51); border-radius 3px; padding 5px 10px; font 12px/18px; margin-right 10px */

.panel-body {
  display: block; position: static; box-sizing: border-box;
  width: 1840px; height: 696.766px;
  margin: 0;
  padding: 15px 15px 15px 15px;
  border: 0; border-radius: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  overflow: visible;
}
.panel-body::before, .panel-body::after { content: " "; }   /* clearfix */

.panel-footer.text-center {
  display: block; position: static; box-sizing: border-box;
  width: 1840px; height: 21px;
  margin: 0;
  padding: 10px 15px 10px 15px;
  border: 0;
  border-top: 1px solid rgb(221, 221, 221);
  border-top-left-radius: 0; border-top-right-radius: 0;
  border-bottom-left-radius: 3px; border-bottom-right-radius: 3px;
  background-color: rgb(245, 245, 245);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: center;
  overflow: visible;
}
```

### 7.3 Non-obvious things a rebuild will get wrong if it guesses

* **`#22`'s background is transparent, not `#0A0A0A`.** See §2 — the inline declaration is malformed and dropped.
* **The "Launch" anchor's text colour is `rgb(51, 51, 51)`, not white.** Its `style-deviations` list (32 entries) contains no `color` entry, so `color` falls through to the COMMON `rgb(51, 51, 51)`. The `::before` of its `fa-external-link` icon confirms it: `"color":"rgb(51, 51, 51)"`. This differs from every `<button class="btn btn-info">` in P04, which *does* carry `color: rgb(255, 255, 255)`. So: dark text on `rgb(91,192,222)` for this one anchor.
* **"Launch" resolves to `display: block`** (its deviations list has no `display` entry → COMMON `block`), while the `<button>` siblings resolve to `display: inline-block`. Its 30px height comes from `5 + 18 + 5 + 1 + 1 = 30`.
* **"Reset Counts" has zero border width on all four sides** but a border *colour* of `rgb(51,122,183)`, and a `box-shadow: rgb(0,0,0) 0px 0px 0px 0px` (a fully-degenerate shadow that paints nothing). `.btn-link` beats `.btn-warning` for both colour and background.
* **`.panel-title` line-height is `22.8571px`** (16px × 1.428571), not 20px. Both title spans inherit it.
* **`.panel-footer` is empty.** It still paints a 21px grey bar with a 1px top border and 3px bottom corner radii. Do not omit it, and do not put anything in it.
* **The panel-heading border-colour is `rgb(221,221,221)` on all four sides** even though only the bottom has non-zero width.
* `#46` has `ng-dblclick="canCloneDblClick()"` — a hidden double-click affordance on the room title that reveals the Clone Room button (`ng-show` includes `canCloneClicks`).

### 7.4 Real data captured (do not fabricate — these are the actual values)

| datum | value | source |
|---|---|---|
| room numeric id | `3625` | `#46` text; `#49` `href` query `id=3625` |
| room object id | `6a628a99731b9f77ae9bf505` | `#46` text; page URL |
| current viewers / max | `0` / `0` | `#47` text `"Current : 0 / Max  0"` |
| launch URL path | `/session?id=3625&jwtSite=<JWT>` | `#49` `ng-href` / `href` (JWT truncated) |
| launch target | `_blank` | `#49` `target` |
| admin identity in JWT | name `[OWNER_JWT_NAME]`, email `[OWNER_EMAIL]`, id `[OWNER_USER_ID]`, type `site` | decoded `#49` JWT payload |

---

## 8. Honest gaps

1. **The internal text/icon ordering inside `#47` is not directly recorded.** The dump gives one flat string, `"Current : 0 / Max  0"`, plus two `<i>` children with rects. The measured segments are: text 418.9→476.7 (57.8px), icon 476.7→489.3, text 489.3→556.5 (67.2px), icon 556.5→569.1, text 569.1→586.9 (17.8px). That geometry is *consistent with* `Current : <i/>0 / Max <i/> 0`, but the dump does not record text-node order, so **the exact interleaving is an inference, not evidence.** Flagged rather than asserted.
2. **`#49`'s `href`/`ng-href` JWT signature is truncated at 300 characters.** The full token cannot be recovered from this capture. Its expiry (`exp: 1815944082` → 2027-07-18 20:54:42 UTC) and issue time (`iat: 1784840082` / `issued: 1784840082215` → 2026-07-23 20:54:42 UTC) are recoverable from the payload. (Capture timestamp was 2026-07-24T15:59:18.276Z, so the token was ~19 h old.)
3. **No hover/focus/active/disabled states** are captured for any button or anchor.
4. **`.panel-footer`'s intended content is unknown.** It is empty in this snapshot; whether it is conditionally populated (e.g. a save bar) cannot be determined from the capture.
5. **The `#permissionsModal` is `display:none` with all rects `0,0,0,0`.** Every layout number in the appendix below is the *un-laid-out* resolved style; nothing about its rendered size, position or the checkbox row spacing can be verified from this capture. Its `<h4 id="permissionsModalLabel">` contains an empty `<i class="ng-binding">` (`#148`) that would carry the user's name — the actual name is **not** in the capture.
6. `#50`/`#51`/`#52` are hidden, so their **rendered widths are unknown**; only their palette and box model are captured.
7. There is no `.modal-backdrop` element anywhere in the 2,156 records — consistent with the modal never having been opened.

---

## Appendix — `#permissionsModal` (`r.0.1.1.1`, 22 records, `display: none`)

A Bootstrap 3 modal, sibling of the panel, never opened during the capture.

```
<div class="modal fade" id="permissionsModal" tabindex="-1" role="dialog"
     aria-labelledby="permissionsModalLabel">                                   #27
└── <div class="modal-dialog" role="document">          width 600px, margin 30px auto   #33
    └── <div class="modal-content">                     padding 20px, radius 6px        #42
        ├── <div class="modal-header">                                                  #62
        │   ├── <button type="button" class="close" data-dismiss="modal" aria-label="Close">  #103
        │   │   └── <span aria-hidden="true">×</span>                                   #147
        │   └── <h4 class="modal-title" id="permissionsModalLabel">
        │         "Adjust Mic/Cam/Screen permissions for user:"                         #104
        │       └── <i class="ng-binding">  (empty — would hold the user name)          #148
        ├── <div class="modal-body">                                                    #63
        │   ├── <label class="d-block">Microphone</label>                               #105
        │   │   └── <input type="checkbox" name="checkbox" ng-model="userPermissions.hasMic"        ng-change="toggleHasMic()">        #149
        │   ├── <label class="d-block">Screenshare</label>                              #106
        │   │   └── <input type="checkbox" name="checkbox" ng-model="userPermissions.hasScreen"     ng-change="toggleHasScreen()">     #150
        │   ├── <label class="d-block">WebCam</label>                                   #107
        │   │   └── <input type="checkbox" name="checkbox" ng-model="userPermissions.hasCam"        ng-change="toggleHasCam()">        #151
        │   ├── <label class="d-block">AdminChat</label>                                #108
        │   │   └── <input type="checkbox" name="checkbox" ng-model="userPermissions.hasAdminChat"  ng-change="toggleHasAdminChat()">  #152
        │   └── <label class="d-block">CanEditNotes</label>                             #109
        │       └── <input type="checkbox" name="checkbox" ng-model="userPermissions.canEditNotes"  ng-change="toggleCanEditNotes()">  #153
        └── <div class="modal-footer text-right">                                       #64
            ├── <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>            #110
            └── <button type="button" class="btn btn-success" ng-click="saveUserPermissions()">Save Changes</button>  #111
```

All five checkboxes are `class="ng-pristine ng-untouched ng-valid"` — **untouched, so their checked state is not recorded**. Key resolved styles: `#27` `position: fixed; inset: 0; z-index: 1050; display: none; overflow: hidden; opacity: 0; outline-width: 0; transition: opacity 0.15s`. `#42` `border: 1px solid rgba(0,0,0,0.2); border-radius: 6px; background: rgb(255,255,255); background-clip: padding-box; box-shadow: rgba(0,0,0,0.5) 0px 5px 15px 0px; padding: 20px`. `#62`/`#64` have clearfix `::before`/`::after`. `#111` `.btn-success` = `background rgb(92,184,92)`, `border 1px solid rgb(76,174,76)`, `color rgb(255,255,255)`, `margin-left: 5px`. Full per-node tables are in §3–5 above.
