# prt2 — Q04 — The **Badges** section (and the empty-state bug in the reference)

**Evidence base:** `/tmp/ptr-decode/prt2/caps/00-baseline-room/` (`DEFAULTS.txt`, `nodes-000.txt` … `nodes-007.txt`, 882 records, `truncated=false`).
**Page:** `https://protradingroom.com/ptrApp#/page/welcome`, `role=member`, viewport `1842×1265 @dpr2`.

> **RESOLUTION NOTE — this is the section that causes the DEFAULTS skew.** 635 of the capture's 650 `<span>`s live inside this section's Intercom emoji popover (`r.0.1.1.0.0.0.0.5.0.1.1.…`). They pushed the COMMON table to `display:inline-table`, `visibility:hidden`, `width:30px`, `padding:5px`, `font-size:28px`, `line-height:30px`, `text-align:center`, `vertical-align:middle`, `cursor:pointer`, the Apple-Color-Emoji font stack and `transition: transform 0.06s`. **Every value printed below is a RESOLVED ABSOLUTE value.** Where I state a resolved value that happens to equal a skewed COMMON value, I say so explicitly.

---

## 1. Purpose

This piece decodes the whole **Badges** section: the `<h3>Badges</h3>` heading, the three action buttons (Add New Badge / Upload Image Badge / Export Badges), the hidden "New Badge" editor panel with its colour pickers and Intercom emoji picker, and the two-column badges table. It then **verifies precisely** the reference bug in which the badges table renders with a 0-height `<tbody>` containing zero rows *while* the "No Badges defined" empty state is simultaneously hidden — so the user sees a headers-only table and no explanation.

## 2. Path anchor + record count

**Anchors:** `path=r.0.1.1.0.0.0.0.4` (the `h3`) and `path=r.0.1.1.0.0.0.0.5` (the `.row`) plus all descendants.

```
cd /tmp/ptr-decode/prt2/caps/00-baseline-room
awk -v RS='' -v ORS='\n\n' '/path=r\.0\.1\.1\.0\.0\.0\.0\.(4|5)([. ]|$)/' nodes-*.txt
```

**698 records found** — by far the largest section:
* **51 non-emoji records**: `#67`, `#68`, `#82`, `#83`, `#94`–`#100`, `#112`–`#118`, `#133`–`#147`, `#161`–`#172`, `#195`–`#199`, `#229`.
* **647 Intercom emoji-popover records**: 6 `div.intercom-emoji-picker-group` (`#235`–`#240`), 6 `div.intercom-emoji-picker-group-title` (`#241`, `#249`, `#428`, `#508`, `#711`, `#777`) and **635 `span.intercom-emoji-picker-emoji`**.

Only **9 of the 698 render**: `#67`, `#68`, `#83`, `#96`, `#97`, `#98`, `#100`, `#117`, `#118` — plus the table internals `#146`, `#147`, `#172`, `#198`, `#199` (14 rendering nodes total). Everything else is `display:none` or inside a `display:none` ancestor.

Vertical extent: **y = 360.8 → y = 523.2** (`h3` top → `.row` `#68` bottom = 397.2 + 126).

---

## 3. Node table

### 3a. The rendering nodes

| # | path | tag | id | class (verbatim) | x | y | w | h | renders? |
|---|---|---|---|---|---|---|---|---|---|
| 67 | `r.0.1.1.0.0.0.0.4` | `h3` | — | *(no attributes at all)* | 366 | 360.8 | 1110 | 26.3984 | **yes** |
| 68 | `r.0.1.1.0.0.0.0.5` | `div` | — | `row` | 351 | 397.2 | 1140 | 126 | **yes** |
| 83 | `r.0.1.1.0.0.0.0.5.1` | `div` | — | `col-md-9 panel pane-default` | 351 | 397.2 | 855 | 106 | **yes** |
| 96 | `…5.1.0` | `a` | — | `btn btn btn-warning mb` | 367 | 398.2 | 128.664 | 34 | **yes** |
| 97 | `…5.1.1` | `a` | — | `btn btn-info mb` | 499.6 | 398.2 | 177.656 | 34 | **yes** |
| 117 | `…5.1.1.0` | `i` | — | `fa fa-cloud-upload` | 512.6 | 408.2 | 15 | 14 | **yes** |
| 98 | `…5.1.2` | `a` | — | `btn btn btn-default mb` | 681.1 | 398.2 | 119.078 | 34 | **yes** |
| 99 | `…5.1.3` | `h3` | — | `ng-hide` | 0 | 0 | 0 | 0 | **NO** ← the bug |
| 100 | `…5.1.4` | `div` | — | `table-responsive` | 367 | 442.2 | 823 | 60 | **yes** |
| 118 | `…5.1.4.0` | `table` | — | `table table-striped table-bordered table-hover` | 367 | 442.2 | 823 | **60** | **yes** |
| 146 | `…5.1.4.0.0` | `thead` | — | *(none)* | 367 | 442.2 | 823 | 60 | **yes** |
| 172 | `…5.1.4.0.0.0` | `tr` | — | *(none)* | 367 | 442.2 | 823 | 60 | **yes** |
| 198 | `…5.1.4.0.0.0.0` | `th` | — | *(no class)* | 367 | 442.2 | 387.094 | 60 | **yes** — "Badge" |
| 199 | `…5.1.4.0.0.0.1` | `th` | — | `text-center` | 754.1 | 442.2 | 435.906 | 60 | **yes** — "Actions" |
| **147** | `…5.1.4.0.1` | **`tbody`** | — | *(none)* | 367 | **502.2** | 823 | **0** | **yes, but ZERO-HEIGHT — no rows** |

### 3b. The hidden "New Badge" editor panel (`r.0.1.1.0.0.0.0.5.0`, all rects `0 × 0`)

| # | path | tag | id | class (verbatim) | renders? |
|---|---|---|---|---|---|
| 82 | `…5.0` | `div` | — | `panel panel-default col-md-6 ng-hide` | **no** — `display:none` (root of the editor) |
| 94 | `…5.0.0` | `div` | — | `panel-heading` | no |
| 112 | `…5.0.0.0` | `h3` | — | `panel-title` | no |
| 113 | `…5.0.0.1` | `h3` | — | `panel-title ng-hide` | no (double-hidden) |
| 114 | `…5.0.0.2` | `h4` | — | *(no attributes at all)* | no |
| 133 | `…5.0.0.2.0` | `img` | — | `user-badge-img ng-hide` | no (double-hidden) |
| 134 | `…5.0.0.2.1` | `span` | — | `label ng-binding` | no |
| 95 | `…5.0.1` | `div` | — | `panel-body` | no |
| 115 | `…5.0.1.0` | `form` | — | `ng-pristine ng-valid` | no |
| 135 | `…5.0.1.0.0` | `div` | — | *(no class)* | no |
| 161 | `…5.0.1.0.0.0` | `span` | — | *(no attributes at all)* | no |
| 162 | `…5.0.1.0.0.1` | `input` | — | `ng-pristine ng-untouched ng-valid` | no — `type="color"` |
| 163 | `…5.0.1.0.0.2` | `button` | — | `btn btn-tiny btn-default` | no |
| 164 | `…5.0.1.0.0.3` | `span` | — | *(no attributes at all)* | no |
| 165 | `…5.0.1.0.0.4` | `input` | — | `ng-pristine ng-untouched ng-valid` | no — `type="color"` |
| 166 | `…5.0.1.0.0.5` | `span` | — | *(no attributes at all)* | no |
| 167 | `…5.0.1.0.0.6` | `input` | **`badgeInputTxt`** | `input-emoji-txt ng-pristine ng-untouched ng-valid` | no |
| 168 | `…5.0.1.0.0.7` | `button` | **`emoji-picker`** | `btn btn-default btn-sm` | no |
| 195 | `…5.0.1.0.0.7.0` | `i` | — | `fa fa-smile-o fa-1x` | no |
| 169 | `…5.0.1.0.0.8` | `hr` | — | *(no attributes at all)* | no |
| 136 | `…5.0.1.0.1` | `span` | — | *(no attributes at all)* | no |
| 137 | `…5.0.1.0.2` | `input` | **`badgeNameTxt`** | `input-name-txt ng-pristine ng-untouched ng-valid` | no |
| 138 | `…5.0.1.0.3` | `label` | — | *(no attributes at all)* | no |
| 139 | `…5.0.1.0.4` | `textarea` | **`badgeRolesTxt`** | `input-text ng-pristine ng-untouched ng-valid` | no |
| 140 | `…5.0.1.0.5` | `hr` | — | *(no attributes at all)* | no |
| 141 | `…5.0.1.0.6` | `button` | — | `btn btn btn-warning pull-right ng-binding` | no |
| 142 | `…5.0.1.0.7` | `button` | — | `btn btn btn-primary pull-right ng-binding ng-hide` | no (double-hidden) |
| 143 | `…5.0.1.0.8` | `button` | — | `btn btn btn-default pull-right` | no |

### 3c. The Intercom emoji popover (`r.0.1.1.0.0.0.0.5.0.1.1`, all rects `0 × 0`)

| # | path | tag | class (verbatim) | renders? |
|---|---|---|---|---|
| 116 | `…5.0.1.1` | `div` | `intercom-composer-popover intercom-composer-emoji-popover` | no (`opacity: 0` + hidden ancestor) |
| 144 | `…5.0.1.1.0` | `div` | `intercom-emoji-picker` | no — but sized `330 × 260` |
| 170 | `…5.0.1.1.0.0` | `div` | `intercom-composer-popover-header` | no |
| 196 | `…5.0.1.1.0.0.0` | `input` | `intercom-composer-popover-input` | no |
| 171 | `…5.0.1.1.0.1` | `div` | `intercom-composer-popover-body-container` | no |
| 197 | `…5.0.1.1.0.1.0` | `div` | `intercom-composer-popover-body` | no |
| 229 | `…5.0.1.1.0.1.0.0` | `div` | `intercom-emoji-picker-groups` | no |
| 235–240 | `…5.0.1.1.0.1.0.0.{0..5}` | `div` ×6 | `intercom-emoji-picker-group` | no |
| 241, 249, 428, 508, 711, 777 | `…{group}.0` | `div` ×6 | `intercom-emoji-picker-group-title` | no |
| **635 spans** | `…{group}.{1..n}` | `span` | `intercom-emoji-picker-emoji` | no |
| 145 | `…5.0.1.1.1` | `div` | `intercom-composer-popover-caret` | no |

Emoji counts per group (verified by path prefix): Frequently used **7**, People **178**, Nature **79**, Objects **202**, Places **65**, Symbols **104** → **635**. All 635 have `rect x=0 y=0 w=0 h=0` and **`style-deviations (0)`** — i.e. they *are* the skewed COMMON row exactly.

---

## 4. 🐞 THE BUG — verified precisely

### 4.1 The three bindings that produce it

| # | path | element | binding (verbatim) | resulting class | resolved `display` | rect |
|---|---|---|---|---|---|---|
| **98** | `r.0.1.1.0.0.0.0.5.1.2` | `<a>Export Badges</a>` | `ng-show = "badgesList"` | `btn btn btn-default mb` — **no `ng-hide`** | **`inline-block`** | `681.1, 398.2 → 119.078 × 34` |
| **99** | `r.0.1.1.0.0.0.0.5.1.3` | `<h3>No Badges defined</h3>` | `ng-show = "!badgesList"` | `ng-hide` **present** | **`none`** | `0,0 0 × 0` |
| **100** | `r.0.1.1.0.0.0.0.5.1.4` | `<div class="table-responsive">` | `ng-show = "badgesList"`, `ng-init = "showBadgeID=false"` | `table-responsive` — **no `ng-hide`** | **`block`** | `367, 442.2 → 823 × 60` |

### 4.2 The zero-row table

| # | path | element | rect | children |
|---|---|---|---|---|
| 118 | `…5.1.4.0` | `<table class="table table-striped table-bordered table-hover">` | `367, 442.2 → 823 × **60**` | `thead`, `tbody` |
| 146 | `…5.1.4.0.0` | `<thead>` | `367, 442.2 → 823 × **60**` | one `<tr>` (`#172`) with two `<th>` |
| **147** | `…5.1.4.0.1` | `<tbody>` | `367, **502.2** → 823 × **0**` | **ZERO** |

Verified mechanically — there is **no record anywhere in the 882 whose path begins `r.0.1.1.0.0.0.0.5.1.4.0.1.`**:
```
$ grep -h '^#[0-9]' nodes-*.txt | grep -c 'path=r\.0\.1\.1\.0\.0\.0\.0\.5\.1\.4\.0\.1\.'
0
```
The table's total height (60) exactly equals the `thead` height (60), and the `tbody` top (502.2) = 442.2 + 60. **The `<tbody>` is empty and occupies zero pixels.**

### 4.3 Diagnosis

`badgesList` is **truthy** (it makes `#98` and `#100` visible and forces `ng-hide` onto `#99`) **and simultaneously contains zero items** (`ng-repeat` emitted no `<tr>`). In JavaScript, `[]` is truthy, so:

* `ng-show="badgesList"` → **true** for `[]` → the table and the *Export Badges* button both show.
* `ng-show="!badgesList"` → **false** for `[]` → "No Badges defined" is suppressed.
* the `ng-repeat` inside `<tbody>` produces nothing.

**Net user-visible result in the reference: a 823 × 60 headers-only table ("Badge" | "Actions") with a hairline under it and absolutely no explanatory text — plus an "Export Badges" button that would export nothing.** This is a real bug in the reference, not a capture artefact.

*Alternative truthy values that would produce identical evidence:* `{}` (empty object), `""`-not-possible (falsy), `0`-not-possible (falsy). The evidence proves only "truthy with zero repeated items"; the most likely value is `[]`. That distinction is an **honest gap** — the dump captures DOM and computed style, not scope values.

### 4.4 What the rebuild must do

Do **not** reproduce the bug. Use `badgesList?.length` for both branches:
```svelte
<a class="btn btn-default mb" hidden={!badgesList?.length} on:click={exportBadges}>Export Badges</a>
<h3 hidden={badgesList?.length > 0}>No Badges defined</h3>
<div class="table-responsive" hidden={!badgesList?.length}> … </div>
```
If parity with the reference is mandated for a visual diff, gate the fix behind a flag and screenshot both — but ship the fixed version.

---

## 5. Every attribute, verbatim

### `#67` `<h3>` — the section heading
```
attrs: (none)
text: "Badges"
```

### `#68` `<div class="row">`
```
class = "row"
::before / ::after : content "\" \"" (U+0022 U+0020 U+0022); color rgb(51,51,51); font "Helvetica Neue", Helvetica, Arial, sans-serif; font-size 14px; background-color rgba(0,0,0,0)
```

### `#82` `<div class="panel panel-default col-md-6 ng-hide">`
```
class   = "panel panel-default col-md-6 ng-hide"
ng-show = "showAddBadge"
```

### `#83` `<div class="col-md-9 panel pane-default">`
```
class = "col-md-9 panel pane-default"
```
(⚠️ `pane-default`, not `panel-default` — same typo as in Q03.)

### `#94` `<div class="panel-heading">` / `#95` `<div class="panel-body">`
```
#94  class = "panel-heading"
#95  class = "panel-body"
     ::before / ::after : content "\" \"" …
```

### `#96` `<a class="btn btn btn-warning mb">`
```
type     = "button"
ng-click = "showAddBadge=!showAddBadge"
class    = "btn btn btn-warning mb"        ← doubled "btn btn"
text     = "Add New Badge"
```
(`type="button"` on an `<a>` is inert.)

### `#97` `<a class="btn btn-info mb">`
```
type       = "button"
ngf-select = "ngf-select"
ngf-change = "onImageSelect($files, '')"
class      = "btn btn-info mb"
text       = "Upload Image Badge"
```
This `ngf-select` pairs with the body-level `<input type="file">` at `r.14` (`#15`, documented in Q01).

### `#117` `<i class="fa fa-cloud-upload">`
```
class = "fa fa-cloud-upload"
::before { content: "" (U+F0EE); color: rgb(255, 255, 255); font-family: FontAwesome; font-size: 14px; background-color: rgba(0, 0, 0, 0) }
```

### `#98` `<a class="btn btn btn-default mb">`
```
type     = "button"
ng-show  = "badgesList"
class    = "btn btn btn-default mb"        ← doubled "btn btn"
ng-click = "exportBadges()"
text     = "Export Badges"
```

### `#99` `<h3 class="ng-hide">`
```
ng-show = "!badgesList"
class   = "ng-hide"
text    = "No Badges defined"
```

### `#100` `<div class="table-responsive">`
```
class   = "table-responsive"
ng-show = "badgesList"
ng-init = "showBadgeID=false"
```

### `#118` `<table>`, `#146` `<thead>`, `#172` `<tr>`, `#147` `<tbody>`
```
#118  class = "table table-striped table-bordered table-hover"
#146  attrs: (none)
#172  attrs: (none)
#147  attrs: (none)
```

### `#198` / `#199` — the two header cells
```
#198  ng-dblclick = "showBadgeID=!showBadgeID;"      text = "Badge"
#199  class = "text-center"                           text = "Actions"
```
> Note: `#198` reveals the badge id on **double-click**, matching `#100`'s `ng-init="showBadgeID=false"`.

### Editor panel — `#112`, `#113`, `#114`, `#133`, `#134`
```
#112  class = "panel-title"           ng-show = "badges.mode=='add'"        text = "New Badge"
#113  class = "panel-title ng-hide"   ng-show = "badges.mode=='edit';"      text = "Edit Badge"    ← note the stray semicolon INSIDE the expression
#114  attrs: (none)                                                          text = "Preview:"
#133  class   = "user-badge-img ng-hide"
      ng-show = "badges.hasOwnProperty('imgURL') && badges.imgURL"
      ng-src  = ""
      alt     = ""
#134  ng-hide = "badges.hasOwnProperty('imgURL') && badges.imgURL"
      class   = "label ng-binding"
      style   = "background-color: #ffcc00; color: #FFFFFF"
      text    = "New Badge"
```
`#113`'s `ng-show="badges.mode=='edit';"` carries a **trailing semicolon inside the expression** — recorded verbatim (Angular tolerates it). `#112`'s is clean.

### Editor form — `#115` and its children
```
#115  class   = "ng-pristine ng-valid"                                 ← <form>, no ng-submit
#135  ng-hide = "badges.hasOwnProperty('imgURL') && badges.imgURL"     ← <div>, no class
#161  attrs: (none)                                text = "Background:"
#162  type = "color" · ng-model = "badges.bkcolor" · class = "ng-pristine ng-untouched ng-valid"
#163  class = "btn btn-tiny btn-default" · ng-click = "badges.bkcolor='rgba(1,0,0,0)';"    text = "Transparent"
#164  attrs: (none)                                text = "Text:"
#165  type = "color" · ng-model = "badges.color"   · class = "ng-pristine ng-untouched ng-valid"
#166  attrs: (none)                                text = "Badge Text:"
#167  class = "input-emoji-txt ng-pristine ng-untouched ng-valid" · id = "badgeInputTxt"
      type = "text" · ng-model = "badges.text" · value = "TEST"
#168  id = "emoji-picker" · class = "btn btn-default btn-sm"          ← no text, icon only
#195  class = "fa fa-smile-o fa-1x"
      ::before { content: "" (U+F118); color: rgb(51,51,51); font-family: FontAwesome; font-size: 12px }
#169  attrs: (none)                                                    ← <hr>
#136  attrs: (none)                                text = "Name:"
#137  class = "input-name-txt ng-pristine ng-untouched ng-valid" · id = "badgeNameTxt"
      type = "text" · ng-model = "badges.name" · value = "" · placeholder = "Badge Name"
#138  attrs: (none)   text = "Auto assign this badge to this WP roles (comma separated):"
#139  class = "input-text ng-pristine ng-untouched ng-valid" · id = "badgeRolesTxt"
      type = "text" · ng-model = "badges.roles" · cols = "70" · rows = "2"
#140  attrs: (none)                                                    ← <hr>
#141  ng-show = "badges.mode=='add'"  · type = "button" · ng-click = "addBadge(false)"
      class = "btn btn btn-warning pull-right ng-binding"     text = "Add New Badge"
#142  ng-show = "badges.mode=='edit'" · type = "button" · ng-click = "addBadge(true); showAddBadge=false;"
      class = "btn btn btn-primary pull-right ng-binding ng-hide"   text = "Save Edit for New Badge"
#143  type = "button" · ng-click = "badges.badgeID=''; badges.mode='add'; showAddBadge=false;"
      class = "btn btn btn-default pull-right"                text = "Close"
```
> **`#167` carries a literal `value="TEST"` attribute** — a leftover dev placeholder shipped in the reference template. `ng-model="badges.text"` will overwrite it at runtime, but the raw attribute is in the HTML. Do **not** carry `TEST` into the rebuild.
> `#139` is a `<textarea>` that also carries `type="text"` (meaningless on a textarea) and `cols="70" rows="2"`.
> `#138` is a `<label>` with **no `for`** — consistent with the whole page having zero `label[for]`.

### Intercom emoji popover
```
#116  class = "intercom-composer-popover intercom-composer-emoji-popover"
#144  class = "intercom-emoji-picker"
#170  class = "intercom-composer-popover-header"
#196  class = "intercom-composer-popover-input" · placeholder = "Search" · value = ""
#171  class = "intercom-composer-popover-body-container"
#197  class = "intercom-composer-popover-body"
#229  class = "intercom-emoji-picker-groups"
#235–#240  class = "intercom-emoji-picker-group"        (×6)
#241/#249/#428/#508/#711/#777  class = "intercom-emoji-picker-group-title"   (×6)
635 × span  class = "intercom-emoji-picker-emoji" · title = "<shortcode>"    (text = the emoji glyph)
#145  class = "intercom-composer-popover-caret"
```

---

## 6. Resolved computed style

### `#67` `h3` "Badges"
| prop | value |
|---|---|
| display / visibility | `block` / `visible` |
| position / float | `static` / `none` |
| width / height | `1110px` / `26.3984px` |
| margin T/R/B/L | `20px / 0px / 10px / 0px` |
| padding T/R/B/L | `0px`×4 |
| border-width / style / colour | `0px`×4 / `none`×4 / `rgb(51,51,51)`×4 |
| radius | `0px`×4 |
| background-color | `rgba(0, 0, 0, 0)` |
| color | `rgb(51, 51, 51)` |
| font-family | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| **font-size / weight** | **`24px` / `500`** |
| **line-height** | **`26.4px`** |
| letter-spacing / text-align / vertical-align | `normal` / `start` / `baseline` |
| white-space / overflow / opacity / box-shadow / cursor | `normal` / `visible` / `1` / `none` / `auto` |

### `#68` `div.row`
`display:block` · `visible` · `static` · `float:none` · `width:1140px` `height:126px` · **margin `0 / -15px / 0 / -15px`** · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto` · clearfix pseudos.

### `#83` `div.col-md-9.panel.pane-default`
`display:block` · `visible` · **`position:relative`** inset `0/0/0/0` · **`float:left`** · **`width:855px` `height:106px` `min-height:1px`** · margin `0 / 0 / **20px** / 0` · **padding `0 / 15px / 0 / 15px`** · border-width `1px`×4 / style `solid`×4 / **colour `rgba(0, 0, 0, 0)`**×4 · **radius `4px`**×4 · **bg `rgb(255, 255, 255)`** · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · **box-shadow `rgba(0, 0, 0, 0.05) 0px 1px 1px 0px`** · cursor `auto`.
(`.col-md-9` of a 1140px row = 855px. ✔)

### `#96` `a.btn.btn.btn-warning.mb` — Add New Badge
| prop | value |
|---|---|
| display / visibility | `inline-block` / `visible` |
| width / height | `128.664px` / `34px` |
| margin T/R/B/L | `0 / 0 / **10px** / 0` |
| padding T/R/B/L | `6px / 12px / 6px / 12px` |
| border-width / style | `1px`×4 / `solid`×4 |
| **border-colour** | **`rgb(238, 162, 54)`**×4 |
| radius | `4px`×4 |
| **background-color** | **`rgb(240, 173, 78)`** |
| **color** | **`rgb(255, 255, 255)`** |
| font-family / size / weight | `"Helvetica Neue", …` / `14px` / `400` |
| line-height | `20px` |
| letter-spacing / text-align / vertical-align | `normal` / `center` / `middle` |
| **white-space** | **`nowrap`** |
| overflow / opacity / box-shadow | `visible` / `1` / `none` |
| **cursor / user-select** | **`pointer` / `none`** |
| outline-color | `rgb(255, 255, 255)` |

### `#97` `a.btn.btn-info.mb` — Upload Image Badge
Identical to `#96` except **`width: 177.656px`**, **`background-color: rgb(91, 192, 222)`**, **`border-colour: rgb(70, 184, 218)`**×4, `x = 499.6`.

### `#98` `a.btn.btn.btn-default.mb` — Export Badges
Identical to `#96` except **`width: 119.078px`**, **`background-color: rgb(255, 255, 255)`**, **`border-colour: rgb(230, 233, 238)`**×4, **`color: rgb(51, 51, 51)`**, `x = 681.1`.

### `#117` `i.fa.fa-cloud-upload`
`display:inline-block` · `visible` · `width:15px` `height:14px` · margin `0`×4 · padding `0`×4 · border-width `0`×4 / style `none`×4 / colour `rgb(255,255,255)`×4 · radius `0`×4 · bg transparent · **color `rgb(255, 255, 255)`** · **font-family `FontAwesome`** `14px` `400` / **line-height `14px`** · **white-space `nowrap`** · text-align `center` (inherited from `.btn`) · vertical-align `baseline` · **cursor `pointer`** · **user-select `none`** · `transform: matrix(1,0,0,1,0,0)` · `::before content "\F0EE"`.

### `#99` `h3.ng-hide` "No Badges defined" — **the hidden empty state**
**`display: none`** · `visibility: visible` · `static` · width/height `auto` · margin `20px / 0 / 10px / 0` · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg transparent · color `rgb(51,51,51)` · Helvetica **`24px`** / **`500`** / **`26.4px`** · text-align `start` · vertical-align `baseline` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.
**If the bug were fixed, this element would render as a 24px/500 heading directly under the three buttons, indented to x = 367.**

### `#100` `div.table-responsive`
`display:block` · `visible` · `static` · **`width:823px` `height:60px`, `max-width:100%`, `min-height:0.01%`** · margin `0`×4 · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg transparent · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · **overflow-x/-y `auto`/`auto`** · opacity `1` · box-shadow `none` · cursor `auto`.

### `#118` `table.table.table-striped.table-bordered.table-hover`
`display:table` · `visible` · `static` · **`width:823px` `height:60px`, `max-width:100%`** · margin `0`×4 · padding `0`×4 · border-width `0`×4 / style `none`×4 / colour `rgb(51,51,51)`×4 · **radius: top-left `0`, top-right `0`, bottom-left `3px`, bottom-right `3px`** · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.
> ⚠️ **Measured difference from the sessions table (Q03 `#111`), which has `3px` on all four corners.** The badges, admin-users and API-keys tables all resolve to `0 / 0 / 3px / 3px`. Recorded as measured; the CSS rule that produces the asymmetry is not in the evidence.

### `#146` `thead` / `#147` `tbody`
| prop | `#146` thead | `#147` tbody |
|---|---|---|
| display | `table-header-group` | `table-row-group` |
| visibility | `visible` | `visible` |
| width / height | `823px` / **`60px`** | `823px` / **`0px`** |
| rect y | `442.2` | **`502.2`** |
| margin / padding | `0`×4 / `0`×4 | `0`×4 / `0`×4 |
| border / radius | `0px none rgb(51,51,51)` ×4 / `0px`×4 | same |
| background-color / color | `rgba(0,0,0,0)` / `rgb(51,51,51)` | same |
| font / line-height | Helvetica `14px` `400` / `20px` | same |
| text-align / vertical-align | `start` / `middle` | `start` / `middle` |
| cursor | `auto` | `auto` |

### `#172` `tr` (header row)
`display:table-row` · `visible` · `width:823px` `height:60px` · margin/padding `0`×4 · border `0px none rgb(51,51,51)`×4 · **radius `0px`×4** (unlike the sessions header row, which has `3px` top corners) · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `middle` · cursor `auto`.

### `#198` `th` "Badge" / `#199` `th.text-center` "Actions"
Common: `display:table-cell` · `visible` · height `60px` · margin `0`×4 · **padding `20px / 8px / 20px / 8px`** · border-top/bottom `0px none` · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px` / **`700`** / `20px` · letter-spacing `normal` · **vertical-align `bottom`** · white-space `normal` · **radius `0px`×4** · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.

| # | width | border-left | border-right | text-align |
|---|---|---|---|---|
| 198 "Badge" | `387.094px` | `0px none` | **`1px solid rgb(221, 221, 221)`** | **`left`** |
| 199 "Actions" | `435.906px` | **`1px solid rgb(221, 221, 221)`** | `0px none` | **`center`** |

(387.094 + 435.906 = 823. ✔)

### Hidden editor panel — resolved styles

* **`#82`** `div.panel.panel-default.col-md-6.ng-hide` — **`display:none`** · `visible` · `position:relative` · `float:left` · **`width:50%`** · `min-height:1px` · margin `0 / 0 / 20px / 0` · padding `0 / 15px / 0 / 15px` · border `1px solid` **`rgb(221, 221, 221)`**×4 · radius `4px`×4 · bg `rgb(255,255,255)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · box-shadow `rgba(0,0,0,0.05) 0 1px 1px 0` · cursor `auto`.
* **`#94`** `.panel-heading` — `display:block` · padding **`10px / 15px / 10px / 15px`** · **border-bottom `1px solid rgb(221,221,221)`** (other sides `0px none`, colour `rgb(221,221,221)`) · **radius `3px` top-left & top-right, `0` bottom** · **bg `rgb(245, 245, 245)`** · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · cursor `auto`.
* **`#95`** `.panel-body` — `display:block` · **padding `15px`×4** · border `0px none rgb(51,51,51)` · radius `0`×4 · bg transparent · Helvetica `14px`/`400`/`20px` · text-align `start` · clearfix pseudos.
* **`#112`/`#113`** `h3.panel-title` — `display:block` · width/height `auto` · margin `0`×4 · padding `0`×4 · **font-size `16px`, weight `500`, line-height `17.6px`** · color `rgb(51,51,51)` · text-align `start` · vertical-align `baseline` · cursor `auto`. `#113` additionally `display:none`.
* **`#114`** `h4` "Preview:" — `display:block` · margin `10px / 0 / 10px / 0` · padding `0`×4 · **`18px` / `500` / `19.8px`** · text-align `start`.
* **`#133`** `img.user-badge-img.ng-hide` — **`display:none`** · **width `auto`, height `100%`, max-height `20px`** · **margin `0 / 4px / 0 / 4px`** · padding `0`×4 · border `0px none rgb(51,51,51)` · radius `0`×4 · bg transparent · `18px`/`500`/`19.8px` · text-align `start` · **vertical-align `middle`** · **overflow-x/-y `clip`** · **cursor `pointer`** · object-fit `fill`.
* **`#134`** `span.label` — `display:inline` · **margin `0 / -4px / 0 / 0`** · **padding `2.7px`×4** · border-width `0`×4 / style `none`×4 / colour `rgb(255,255,255)`×4 · **radius `3.375px`**×4 · **bg `rgb(255, 204, 0)`** · **color `rgb(255, 255, 255)`** · Helvetica **`13.5px`** / **`700`** / **line-height `13.5px`** · **white-space `nowrap`** · text-align `start` · vertical-align `baseline` · cursor `auto` · outline-color `rgb(255,255,255)`.
* **`#115`** `form` — `display:block` · width/height `auto` · margin/padding `0`×4 · border `0px none rgb(51,51,51)` · radius `0`×4 · bg transparent · Helvetica `14px`/`400`/`20px` · text-align `start`.
* **`#135`** `div[ng-hide]` — `display:block` · margin/padding `0`×4 · Helvetica `14px`/`400`/`20px` · text-align `start`.
* **`#161`/`#164`/`#166`/`#136`** `span` labels ("Background:", "Text:", "Badge Text:", "Name:") — `display:inline` · width/height `auto` · margin/padding `0`×4 · border `0px none rgb(51,51,51)` · radius `0`×4 · bg transparent · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · cursor `auto`.
* **`#162`/`#165`** `input[type=color]` — `display:inline-block` · **`width:50px` `height:27px`** · margin `0`×4 · **padding `1px / 2px / 1px / 2px`** · border `1px solid` **`rgb(0, 0, 0)`**×4 · radius `0`×4 · **bg `rgb(239, 239, 239)`** · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · overflow-x/-y `clip` · **cursor `default`** · **`appearance: auto`**.
* **`#163`** `button.btn.btn-tiny.btn-default` "Transparent" — `display:inline-block` · width/height `auto` · margin `0`×4 · padding `6px / 12px / 6px / 12px` · border `1px solid rgb(230,233,238)`×4 · radius `4px`×4 · bg `rgb(255,255,255)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `center` · vertical-align `middle` · **white-space `nowrap`** · **cursor `pointer`** · **user-select `none`**.
  (`btn-tiny` is not a Bootstrap class and resolves to nothing — padding stays at the base `.btn` `6px 12px`.)
* **`#167`** `input#badgeInputTxt.input-emoji-txt` and **`#137`** `input#badgeNameTxt.input-name-txt` — `display:inline-block` · width/height `auto` · margin `0`×4 · **padding `1px / 2px / 1px / 2px`** · **border `2px inset rgb(118, 118, 118)`**×4 · radius `0`×4 · bg `rgb(255,255,255)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · overflow-x/-y `clip` · **cursor `text`**. **These are raw, unstyled UA inputs — no `.form-control`.**
* **`#168`** `button#emoji-picker.btn.btn-default.btn-sm` — `display:inline-block` · width/height `auto` · margin `0`×4 · **padding `5px / 10px / 5px / 10px`** · border `1px solid rgb(230,233,238)`×4 · **radius `3px`**×4 · bg `rgb(255,255,255)` · color `rgb(51,51,51)` · Helvetica **`12px`** / `400` / **`18px`** · text-align `center` · vertical-align `middle` · white-space `nowrap` · **cursor `pointer`** · **user-select `none`**.
* **`#195`** `i.fa.fa-smile-o.fa-1x` — `display:inline-block` · width/height `auto` · margin/padding `0`×4 · **font-family `FontAwesome`** `12px`/`400`/**`12px`** · **white-space `nowrap`** · text-align `center` (inherited) · vertical-align `baseline` · **cursor `pointer`** (inherited) · **user-select `none`** · `::before content "\F118"`, colour `rgb(51,51,51)`, 12px.
* **`#169`/`#140`** `hr` — `display:block` · **`box-sizing: content-box`** · width `auto`, **height `0px`** · **margin `20px auto 20px auto`** · padding `0`×4 · **border-top `1px solid rgb(238, 238, 238)`**, other sides `0px none rgb(128,128,128)` · radius `0`×4 · bg transparent · **color `rgb(128, 128, 128)`** · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · **overflow-x/-y `hidden`** · cursor `auto` · outline-color `rgb(128,128,128)`.
* **`#138`** `label` — `display:inline-block` · width `auto`, **`max-width:100%`** · margin `0 / 0 / 5px / 0` · padding `0`×4 · Helvetica `14px` / **`700`** / `20px` · text-align `start` · vertical-align `baseline` · **cursor `default`**.
* **`#139`** `textarea#badgeRolesTxt.input-text` — `display:inline-block` · width/height `auto` · margin `0`×4 · **padding `2px`×4** · **border `1px solid rgb(118, 118, 118)`**×4 · radius `0`×4 · bg `rgb(255,255,255)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · **white-space `pre-wrap`**, **overflow-wrap `break-word`** · vertical-align `baseline` · **overflow-x/-y `auto`** · **cursor `text`** · **`resize: both`** · **`appearance: auto`**.
* **`#141`** `button.btn.btn.btn-warning.pull-right` — **`display:block`** · **`float:right`** · width/height `auto` · margin `0`×4 · padding `6px 12px` · border `1px solid rgb(238,162,54)`×4 · radius `4px`×4 · bg `rgb(240,173,78)` · color `rgb(255,255,255)` · Helvetica `14px`/`400`/`20px` · text-align `center` · vertical-align `middle` · white-space `nowrap` · cursor `pointer` · user-select `none` · outline-color `rgb(255,255,255)`.
* **`#142`** same as `#141` but **`display:none`**, bg **`rgb(51, 122, 183)`**, border **`rgb(46, 109, 164)`**×4.
* **`#143`** `button.btn.btn.btn-default.pull-right` "Close" — **`display:block`** · **`float:right`** · bg `rgb(255,255,255)` · border `rgb(230,233,238)`×4 · color `rgb(51,51,51)` · radius `4px`×4 · padding `6px 12px` · text-align `center` · vertical-align `middle` · white-space `nowrap` · cursor `pointer` · user-select `none`.

### Intercom popover — resolved styles

* **`#116`** `.intercom-composer-popover.intercom-composer-emoji-popover` — `display:block` · **`visibility: hidden`** · **`position:absolute; top:auto; right:10px; bottom:50px; left:auto; z-index:2147483003`** · width/height `auto` · margin `0`×4 · padding `0`×4 · border `0px none rgb(51,51,51)`×4 · **radius `6px`**×4 · **bg `rgb(255, 255, 255)`** · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · **opacity `0`** · **box-shadow `rgba(0, 0, 0, 0.08) 0px 1px 15px 1px`** · cursor `auto` · **transition `all 0.2s`**.
* **`#144`** `.intercom-emoji-picker` — `display:block` · `visibility:hidden` · **`width:330px` `height:260px`** · margin/padding `0`×4 · Helvetica `14px`/`400`/`20px` · text-align `start` · cursor `auto`.
* **`#170`** `.intercom-composer-popover-header` — `display:block` · `visibility:hidden` · **`position:absolute; top:0; right:20px; left:20px`** · width `auto`, **`height:40px`** · margin/padding `0`×4 · **border-bottom `1px solid rgb(237, 239, 241)`** · Helvetica `14px`/`400`/`20px` · text-align `start` · cursor `auto`.
* **`#196`** `input.intercom-composer-popover-input` — `display:inline-block` · `visibility:hidden` · **`width:100%` `height:40px`** · margin `0`×4 · **padding `0 / 0 / 0 / 25px`** · border-width `0`×4 / style `none`×4 / **colour `rgb(110, 122, 137)`**×4 · radius `0`×4 · bg `rgba(0,0,0,0)` with **`background-image: url("https://js.intercomcdn.com/images/search@2x.9f02b9f3.png")`, `background-position: 0px 12px`, `background-size: 16px 16px`, `background-repeat: no-repeat`** · **color `rgb(110, 122, 137)`** · **font-family `intercom-font, "Helvetica Neue", Helvetica, Arial, sans-serif`** `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · overflow-x/-y `clip` · cursor `auto` · **`appearance: auto`**.
* **`#171`** `.intercom-composer-popover-body-container` — `display:block` · `visibility:hidden` · width/height `auto` · margin/padding `0`×4 · text-align `start`.
* **`#197`** `.intercom-composer-popover-body` — `display:block` · `visibility:hidden` · **`position:absolute; top:40px; right:0; bottom:5px; left:0`** · width `auto` · margin `0`×4 · **padding `0 / 20px / 0 / 20px`** · text-align `start` · **overflow-x `auto`, overflow-y `scroll`**.
* **`#229`** `.intercom-emoji-picker-groups` — `display:block` · `visibility:hidden` · width/height `auto` · margin/padding `0`×4 · text-align `start`.
* **`#235`–`#240`** `.intercom-emoji-picker-group` (×6) — `display:block` · `visibility:hidden` · width/height `auto` · **margin `10px / -5px / 10px / -5px`** · padding `0`×4 · Helvetica `14px`/`400`/`20px` · text-align `start` · cursor `auto`.
* **6 × `.intercom-emoji-picker-group-title`** — `display:block` · `visibility:hidden` · width/height `auto` · **margin `5px`×4** · padding `0`×4 · border-colour **`rgb(184, 195, 202)`**×4 · **color `rgb(184, 195, 202)`** · Helvetica **`13px`** / `400` / **line-height `18.5714px`** · text-align `start` · cursor `auto` · outline-color `rgb(184,195,202)`.
* **635 × `span.intercom-emoji-picker-emoji`** — `style-deviations (0)`, i.e. **exactly the COMMON row**: `display: inline-table` · **`visibility: hidden`** · `position: static` · `float: none` · **`width: 30px`**, `height: auto` · margin `0px`×4 · **padding `5px`×4** · border `0px none rgb(51,51,51)`×4 · radius `0px`×4 · background-color `rgba(0, 0, 0, 0)` · color `rgb(51, 51, 51)` · **font-family `"Apple Color Emoji", "Segoe UI Emoji", NotoColorEmoji, "Segoe UI Symbol", "Android Emoji", EmojiSymbols`** · **font-size `28px`**, weight `400` · **line-height `30px`** · letter-spacing `normal` · **text-align `center`** · **vertical-align `middle`** · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · **cursor `pointer`** · **transition `transform 0.06s, -webkit-transform 0.06s`**.

---

## 7. Verbatim text (every string, with path)

| path | element | text (verbatim) | renders? |
|---|---|---|---|
| `r.0.1.1.0.0.0.0.4` | `h3` | `Badges` | **yes** |
| `…5.1.0` | `a.btn-warning` | `Add New Badge` | **yes** |
| `…5.1.1` | `a.btn-info` | `Upload Image Badge` | **yes** |
| `…5.1.2` | `a.btn-default` | `Export Badges` | **yes** |
| `…5.1.3` | `h3.ng-hide` | `No Badges defined` | **NO — the bug** |
| `…5.1.4.0.0.0.0` | `th` | `Badge` | **yes** |
| `…5.1.4.0.0.0.1` | `th.text-center` | `Actions` | **yes** |
| `…5.0.0.0` | `h3.panel-title` | `New Badge` | no |
| `…5.0.0.1` | `h3.panel-title.ng-hide` | `Edit Badge` | no |
| `…5.0.0.2` | `h4` | `Preview:` | no |
| `…5.0.0.2.1` | `span.label` | `New Badge` | no |
| `…5.0.1.0.0.0` | `span` | `Background:` | no |
| `…5.0.1.0.0.2` | `button.btn-tiny` | `Transparent` | no |
| `…5.0.1.0.0.3` | `span` | `Text:` | no |
| `…5.0.1.0.0.5` | `span` | `Badge Text:` | no |
| `…5.0.1.0.0.6` | `input#badgeInputTxt` | *(attribute)* `value="TEST"` | no |
| `…5.0.1.0.1` | `span` | `Name:` | no |
| `…5.0.1.0.2` | `input#badgeNameTxt` | *(placeholder)* `Badge Name` | no |
| `…5.0.1.0.3` | `label` | `Auto assign this badge to this WP roles (comma separated):` | no |
| `…5.0.1.0.6` | `button` | `Add New Badge` | no |
| `…5.0.1.0.7` | `button.ng-hide` | `Save Edit for New Badge` | no |
| `…5.0.1.0.8` | `button` | `Close` | no |
| `…5.0.1.1.0.0.0` | `input` | *(placeholder)* `Search` | no |
| `…5.0.1.1.0.1.0.0.0.0` | `div.…-group-title` | `Frequently used` | no |
| `…5.0.1.1.0.1.0.0.1.0` | `div.…-group-title` | `People` | no |
| `…5.0.1.1.0.1.0.0.2.0` | `div.…-group-title` | `Nature` | no |
| `…5.0.1.1.0.1.0.0.3.0` | `div.…-group-title` | `Objects` | no |
| `…5.0.1.1.0.1.0.0.4.0` | `div.…-group-title` | `Places` | no |
| `…5.0.1.1.0.1.0.0.5.0` | `div.…-group-title` | `Symbols` | no |

**No text in this section is truncated** (longest = 57 chars; cap = 250). **No attribute value is truncated** (longest = 62 chars; cap = 300).

### Appendix — all 635 emoji spans (glyph + `title` shortcode, in DOM order)

These are third-party Intercom widget content, not ProTradingRoom content. **Do not port them.** Recorded in full for completeness, as required.

**Frequently used** (7): 👍 thumbs_up · 👎 -1 · 😭 sob · 🔥 fire · 😦 frowning · 😄 smile · 😍 heart_eyes

**People** (178): 😄 smile · 😃 smiley · 😀 grinning · 😊 blush · 😉 wink · 😍 heart_eyes · 😘 kissing_heart · 😚 kissing_closed_eyes · 😗 kissing · 😙 kissing_smiling_eyes · 😜 stuck_out_tongue_winking_eye · 😝 stuck_out_tongue_closed_eyes · 😛 stuck_out_tongue · 😳 flushed · 😁 grin · 😔 pensive · 😌 relieved · 😒 unamused · 😞 disappointed · 😣 persevere · 😢 cry · 😂 joy · 😭 sob · 😪 sleepy · 😥 disappointed_relieved · 😰 cold_sweat · 😅 sweat_smile · 😓 sweat · 😩 weary · 😫 tired_face · 😨 fearful · 😱 scream · 😠 angry · 😡 rage · 😤 triumph · 😖 confounded · 😆 laughing · 😋 yum · 😷 mask · 😎 sunglasses · 😴 sleeping · 😵 dizzy_face · 😲 astonished · 😟 worried · 😦 frowning · 😧 anguished · 👿 imp · 😮 open_mouth · 😬 grimacing · 😐 neutral_face · 😕 confused · 😯 hushed · 😏 smirk · 😑 expressionless · 👲 man_with_gua_pi_mao · 👳 man_with_turban · 👮 cop · 👷 construction_worker · 💂 guardsman · 👶 baby · 👦 boy · 👧 girl · 👨 man · 👩 woman · 👴 older_man · 👵 older_woman · 👱 person_with_blond_hair · 👼 angel · 👸 princess · 😺 smiley_cat · 😸 smile_cat · 😻 heart_eyes_cat · 😽 kissing_cat · 😼 smirk_cat · 🙀 scream_cat · 😿 crying_cat_face · 😹 joy_cat · 😾 pouting_cat · 👹 japanese_ogre · 👺 japanese_goblin · 🙈 see_no_evil · 🙉 hear_no_evil · 🙊 speak_no_evil · 💀 skull · 👽 alien · 💩 hankey · 🔥 fire · ✨ sparkles · 🌟 star2 · 💫 dizzy · 💥 boom · 💢 anger · 💦 sweat_drops · 💧 droplet · 💤 zzz · 💨 dash · 👂 ear · 👀 eyes · 👃 nose · 👅 tongue · 👄 lips · 👍 thumbs_up · 👎 -1 · 👌 ok_hand · 👊 facepunch · ✊ fist · 👋 wave · ✋ hand · 👐 open_hands · 👆 point_up_2 · 👇 point_down · 👉 point_right · 👈 point_left · 🙌 raised_hands · 🙏 pray · 👏 clap · 💪 muscle · 🚶 walking · 🏃 runner · 💃 dancer · 👫 couple · 👪 family · 💏 couplekiss · 💑 couple_with_heart · 👯 dancers · 🙆 ok_woman · 🙅 no_good · 💁 information_desk_person · 🙋 raising_hand · 💆 massage · 💇 haircut · 💅 nail_care · 👰 bride_with_veil · 🙎 person_with_pouting_face · 🙍 person_frowning · 🙇 bow · 🎩 tophat · 👑 crown · 👒 womans_hat · 👟 athletic_shoe · 👞 mans_shoe · 👡 sandal · 👠 high_heel · 👢 boot · 👕 shirt · 👔 necktie · 👚 womans_clothes · 👗 dress · 🎽 running_shirt_with_sash · 👖 jeans · 👘 kimono · 👙 bikini · 💼 briefcase · 👜 handbag · 👝 pouch · 👛 purse · 👓 eyeglasses · 🎀 ribbon · 🌂 closed_umbrella · 💄 lipstick · 💛 yellow_heart · 💙 blue_heart · 💜 purple_heart · 💚 green_heart · 💔 broken_heart · 💗 heartpulse · 💓 heartbeat · 💕 two_hearts · 💖 sparkling_heart · 💞 revolving_hearts · 💘 cupid · 💌 love_letter · 💋 kiss · 💍 ring · 💎 gem · 👤 bust_in_silhouette · 💬 speech_balloon · 👣 footprints

**Nature** (79): 🐶 dog · 🐺 wolf · 🐱 cat · 🐭 mouse · 🐹 hamster · 🐰 rabbit · 🐸 frog · 🐯 tiger · 🐨 koala · 🐻 bear · 🐷 pig · 🐽 pig_nose · 🐮 cow · 🐗 boar · 🐵 monkey_face · 🐒 monkey · 🐴 horse · 🐑 sheep · 🐘 elephant · 🐼 panda_face · 🐧 penguin · 🐦 bird · 🐤 baby_chick · 🐥 hatched_chick · 🐣 hatching_chick · 🐔 chicken · 🐍 snake · 🐢 turtle · 🐛 bug · 🐝 bee · 🐜 ant · 🐞 beetle · 🐌 snail · 🐙 octopus · 🐚 shell · 🐠 tropical_fish · 🐟 fish · 🐬 dolphin · 🐳 whale · 🐎 racehorse · 🐲 dragon_face · 🐡 blowfish · 🐫 camel · 🐩 poodle · 🐾 feet · 💐 bouquet · 🌸 cherry_blossom · 🌷 tulip · 🍀 four_leaf_clover · 🌹 rose · 🌻 sunflower · 🌺 hibiscus · 🍁 maple_leaf · 🍃 leaves · 🍂 fallen_leaf · 🌿 herb · 🌾 ear_of_rice · 🍄 mushroom · 🌵 cactus · 🌴 palm_tree · 🌰 chestnut · 🌱 seedling · 🌼 blossom · 🌑 new_moon · 🌓 first_quarter_moon · 🌔 moon · 🌕 full_moon · 🌛 first_quarter_moon_with_face · 🌙 crescent_moon · 🌏 earth_asia · 🌋 volcano · 🌌 milky_way · 🌠 stars · ⛅ partly_sunny · ⛄ snowman · 🌀 cyclone · 🌁 foggy · 🌈 rainbow · 🌊 ocean

**Objects** (202): 🎍 bamboo · 💝 gift_heart · 🎎 dolls · 🎒 school_satchel · 🎓 mortar_board · 🎏 flags · 🎆 fireworks · 🎇 sparkler · 🎐 wind_chime · 🎑 rice_scene · 🎃 jack_o_lantern · 👻 ghost · 🎅 santa · 🎄 christmas_tree · 🎁 gift · 🎋 tanabata_tree · 🎉 tada · 🎊 confetti_ball · 🎈 balloon · 🎌 crossed_flags · 🔮 crystal_ball · 🎥 movie_camera · 📷 camera · 📹 video_camera · 📼 vhs · 💿 cd · 📀 dvd · 💽 minidisc · 💾 floppy_disk · 💻 computer · 📱 iphone · 📞 telephone_receiver · 📟 pager · 📠 fax · 📡 satellite · 📺 tv · 📻 radio · 🔊 loud_sound · 🔔 bell · 📢 loudspeaker · 📣 mega · ⏳ hourglass_flowing_sand · ⌛ hourglass · ⏰ alarm_clock · ⌚ watch · 🔓 unlock · 🔒 lock · 🔏 lock_with_ink_pen · 🔐 closed_lock_with_key · 🔑 key · 🔎 mag_right · 💡 bulb · 🔦 flashlight · 🔌 electric_plug · 🔋 battery · 🔍 mag · 🛀 bath · 🚽 toilet · 🔧 wrench · 🔩 nut_and_bolt · 🔨 hammer · 🚪 door · 🚬 smoking · 💣 bomb · 🔫 gun · 🔪 hocho · 💊 pill · 💉 syringe · 💰 moneybag · 💴 yen · 💵 dollar · 💳 credit_card · 💸 money_with_wings · 📲 calling · 📧 e-mail · 📥 inbox_tray · 📤 outbox_tray · 📩 envelope_with_arrow · 📨 incoming_envelope · 📫 mailbox · 📪 mailbox_closed · 📮 postbox · 📦 package · 📝 memo · 📄 page_facing_up · 📃 page_with_curl · 📑 bookmark_tabs · 📊 bar_chart · 📈 chart_with_upwards_trend · 📉 chart_with_downwards_trend · 📜 scroll · 📋 clipboard · 📅 date · 📆 calendar · 📇 card_index · 📁 file_folder · 📂 open_file_folder · 📌 pushpin · 📎 paperclip · 📏 straight_ruler · 📐 triangular_ruler · 📕 closed_book · 📗 green_book · 📘 blue_book · 📙 orange_book · 📓 notebook · 📔 notebook_with_decorative_cover · 📒 ledger · 📚 books · 📖 book · 🔖 bookmark · 📛 name_badge · 📰 newspaper · 🎨 art · 🎬 clapper · 🎤 microphone · 🎧 headphones · 🎼 musical_score · 🎵 musical_note · 🎶 notes · 🎹 musical_keyboard · 🎻 violin · 🎺 trumpet · 🎷 saxophone · 🎸 guitar · 👾 space_invader · 🎮 video_game · 🃏 black_joker · 🎴 flower_playing_cards · 🀄 mahjong · 🎲 game_die · 🎯 dart · 🏈 football · 🏀 basketball · ⚽ soccer · ⚾ baseball · 🎾 tennis · 🎱 8ball · 🎳 bowling · ⛳ golf · 🏁 checkered_flag · 🏆 trophy · 🎿 ski · 🏂 snowboarder · 🏊 swimmer · 🏄 surfer · 🎣 fishing_pole_and_fish · 🍵 tea · 🍶 sake · 🍺 beer · 🍻 beers · 🍸 cocktail · 🍹 tropical_drink · 🍷 wine_glass · 🍴 fork_and_knife · 🍕 pizza · 🍔 hamburger · 🍟 fries · 🍗 poultry_leg · 🍖 meat_on_bone · 🍝 spaghetti · 🍛 curry · 🍤 fried_shrimp · 🍱 bento · 🍣 sushi · 🍥 fish_cake · 🍙 rice_ball · 🍘 rice_cracker · 🍚 rice · 🍜 ramen · 🍲 stew · 🍢 oden · 🍡 dango · 🍳 egg · 🍞 bread · 🍩 doughnut · 🍮 custard · 🍦 icecream · 🍨 ice_cream · 🍧 shaved_ice · 🎂 birthday · 🍰 cake · 🍪 cookie · 🍫 chocolate_bar · 🍬 candy · 🍭 lollipop · 🍯 honey_pot · 🍎 apple · 🍏 green_apple · 🍊 tangerine · 🍒 cherries · 🍇 grapes · 🍉 watermelon · 🍓 strawberry · 🍑 peach · 🍈 melon · 🍌 banana · 🍍 pineapple · 🍠 sweet_potato · 🍆 eggplant · 🍅 tomato · 🌽 corn

**Places** (65): 🏠 house · 🏡 house_with_garden · 🏫 school · 🏢 office · 🏣 post_office · 🏥 hospital · 🏦 bank · 🏪 convenience_store · 🏩 love_hotel · 🏨 hotel · 💒 wedding · ⛪ church · 🏬 department_store · 🌇 city_sunrise · 🌆 city_sunset · 🏯 japanese_castle · 🏰 european_castle · ⛺ tent · 🏭 factory · 🗼 tokyo_tower · 🗾 japan · 🗻 mount_fuji · 🌄 sunrise_over_mountains · 🌅 sunrise · 🌃 night_with_stars · 🗽 statue_of_liberty · 🌉 bridge_at_night · 🎠 carousel_horse · 🎡 ferris_wheel · ⛲ fountain · 🎢 roller_coaster · 🚢 ship · ⛵ boat · 🚤 speedboat · 🚀 rocket · 💺 seat · 🚉 station · 🚄 bullettrain_side · 🚅 bullettrain_front · 🚇 metro · 🚃 railway_car · 🚌 bus · 🚙 blue_car · 🚗 car · 🚕 taxi · 🚚 truck · 🚨 rotating_light · 🚓 police_car · 🚒 fire_engine · 🚑 ambulance · 🚲 bike · 💈 barber · 🚏 busstop · 🎫 ticket · 🚥 traffic_light · 🚧 construction · 🔰 beginner · ⛽ fuelpump · 🏮 izakaya_lantern · 🎰 slot_machine · 🗿 moyai · 🎪 circus_tent · 🎭 performing_arts · 📍 round_pushpin · 🚩 triangular_flag_on_post

**Symbols** (104): 🔟 keycap_ten · 🔢 1234 · 🔣 symbols · 🔠 capital_abcd · 🔡 abcd · 🔤 abc · 🔼 arrow_up_small · 🔽 arrow_down_small · ⏪ rewind · ⏩ fast_forward · ⏫ arrow_double_up · ⏬ arrow_double_down · 🆗 ok · 🆕 new · 🆙 up · 🆒 cool · 🆓 free · 🆖 ng · 📶 signal_strength · 🎦 cinema · 🈁 koko · 🈯 u6307 · 🈳 u7a7a · 🈵 u6e80 · 🈴 u5408 · 🈲 u7981 · 🉐 ideograph_advantage · 🈹 u5272 · 🈺 u55b6 · 🈶 u6709 · 🈚 u7121 · 🚻 restroom · 🚹 mens · 🚺 womens · 🚼 baby_symbol · 🚾 wc · 🚭 no_smoking · 🈸 u7533 · 🉑 accept · 🆑 cl · 🆘 sos · 🆔 id · 🚫 no_entry_sign · 🔞 underage · ⛔ no_entry · ❎ negative_squared_cross_mark · ✅ white_check_mark · 💟 heart_decoration · 🆚 vs · 📳 vibration_mode · 📴 mobile_phone_off · 🆎 ab · 💠 diamond_shape_with_a_dot_inside · ⛎ ophiuchus · 🔯 six_pointed_star · 🏧 atm · 💹 chart · 💲 heavy_dollar_sign · 💱 currency_exchange · ❌ x · ❗ exclamation · ❓ question · ❕ grey_exclamation · ❔ grey_question · ⭕ o · 🔝 top · 🔚 end · 🔙 back · 🔛 on · 🔜 soon · 🔃 arrows_clockwise · 🕛 clock12 · 🕐 clock1 · 🕑 clock2 · 🕒 clock3 · 🕓 clock4 · 🕔 clock5 · 🕕 clock6 · 🕖 clock7 · 🕗 clock8 · 🕘 clock9 · 🕙 clock10 · 🕚 clock11 · ➕ heavy_plus_sign · ➖ heavy_minus_sign · ➗ heavy_division_sign · 💮 white_flower · 💯 100 · 🔘 radio_button · 🔗 link · ➰ curly_loop · 🔱 trident · 🔺 small_red_triangle · 🔲 black_square_button · 🔳 white_square_button · 🔴 red_circle · 🔵 large_blue_circle · 🔻 small_red_triangle_down · ⬜ white_large_square · ⬛ black_large_square · 🔶 large_orange_diamond · 🔷 large_blue_diamond · 🔸 small_orange_diamond · 🔹 small_blue_diamond

---

## 8. Rebuild spec (pixel-for-pixel)

```html
<h3>Badges</h3>

<div class="row">

  <!-- hidden editor panel, r.0.1.1.0.0.0.0.5.0 -->
  <div class="panel panel-default col-md-6" hidden={!showAddBadge}>
    <div class="panel-heading">
      <h3 class="panel-title" hidden={badges.mode !== 'add'}>New Badge</h3>
      <h3 class="panel-title" hidden={badges.mode !== 'edit'}>Edit Badge</h3>
      <h4>Preview:
        <img class="user-badge-img" src={badges.imgURL} alt="" hidden={!badges.imgURL}>
        <span class="label" hidden={!!badges.imgURL}
              style="background-color:{badges.bkcolor}; color:{badges.color}">{badges.text}</span>
      </h4>
    </div>
    <div class="panel-body">
      <form>
        <div hidden={!!badges.imgURL}>
          <span>Background:</span>
          <input type="color" bind:value={badges.bkcolor}>
          <button class="btn btn-tiny btn-default"
                  on:click={() => badges.bkcolor='rgba(1,0,0,0)'}>Transparent</button>
          <span>Text:</span>
          <input type="color" bind:value={badges.color}>
          <span>Badge Text:</span>
          <input id="badgeInputTxt" class="input-emoji-txt" type="text" bind:value={badges.text}>
          <button id="emoji-picker" class="btn btn-default btn-sm"><i class="fa fa-smile-o fa-1x"></i></button>
          <hr>
        </div>
        <span>Name:</span>
        <input id="badgeNameTxt" class="input-name-txt" type="text"
               placeholder="Badge Name" bind:value={badges.name}>
        <label>Auto assign this badge to this WP roles (comma separated):</label>
        <textarea id="badgeRolesTxt" class="input-text" cols="70" rows="2" bind:value={badges.roles}></textarea>
        <hr>
        <button class="btn btn-warning pull-right" hidden={badges.mode !== 'add'}
                on:click={() => addBadge(false)}>Add New Badge</button>
        <button class="btn btn-primary pull-right" hidden={badges.mode !== 'edit'}
                on:click={() => { addBadge(true); showAddBadge = false; }}>Save Edit for New Badge</button>
        <button class="btn btn-default pull-right"
                on:click={() => { badges.badgeID=''; badges.mode='add'; showAddBadge=false; }}>Close</button>
      </form>
      <!-- NOTE: the Intercom emoji popover is 3rd-party. Do NOT port it. -->
    </div>
  </div>

  <!-- badges list, r.0.1.1.0.0.0.0.5.1 -->
  <div class="col-md-9 panel pane-default">
    <a class="btn btn-warning mb" on:click={() => showAddBadge = !showAddBadge}>Add New Badge</a>
    <a class="btn btn-info mb" on:click={pickImage}><i class="fa fa-cloud-upload"></i> Upload Image Badge</a>
    <a class="btn btn-default mb" hidden={!badgesList?.length} on:click={exportBadges}>Export Badges</a>

    <!-- BUG FIX: use .length on both branches, not truthiness -->
    <h3 hidden={!!badgesList?.length}>No Badges defined</h3>
    <div class="table-responsive" hidden={!badgesList?.length}>
      <table class="table table-striped table-bordered table-hover">
        <thead>
          <tr>
            <th on:dblclick={() => showBadgeID = !showBadgeID}>Badge</th>
            <th class="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each badgesList as b}<tr>…</tr>{/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
```

```css
h3                    { display:block; width:1110px; height:26.3984px; margin:20px 0 10px; padding:0;
                        color:#333; font:500 24px/26.4px "Helvetica Neue",Helvetica,Arial,sans-serif;
                        text-align:start; }

.row                  { display:block; width:1140px; margin:0 -15px; padding:0; }
.row::before,.row::after { content:" "; display:table; } .row::after { clear:both; }
.col-md-9             { position:relative; float:left; width:855px; min-height:1px; padding:0 15px; }
.col-md-6             { position:relative; float:left; width:50%;   min-height:1px; padding:0 15px; }
.panel.pane-default   { margin:0 0 20px; border:1px solid rgba(0,0,0,0); border-radius:4px;
                        background:#fff; box-shadow:rgba(0,0,0,.05) 0 1px 1px 0; }
.panel.panel-default  { margin:0 0 20px; border:1px solid rgb(221,221,221); border-radius:4px;
                        background:#fff; box-shadow:rgba(0,0,0,.05) 0 1px 1px 0; }
.panel-heading        { display:block; padding:10px 15px; background:rgb(245,245,245);
                        border-bottom:1px solid rgb(221,221,221);
                        border-radius:3px 3px 0 0; }
.panel-title          { display:block; margin:0; padding:0; font:500 16px/17.6px "Helvetica Neue",Helvetica,Arial,sans-serif; }
.panel-body           { display:block; padding:15px; }

.btn                  { display:inline-block; margin:0; padding:6px 12px; border:1px solid transparent;
                        border-radius:4px; font:400 14px/20px "Helvetica Neue",Helvetica,Arial,sans-serif;
                        text-align:center; vertical-align:middle; white-space:nowrap;
                        cursor:pointer; user-select:none; }
.btn-sm               { padding:5px 10px; border-radius:3px; font-size:12px; line-height:18px; }
.btn-warning          { background:rgb(240,173,78); border-color:rgb(238,162,54); color:#fff; outline-color:#fff; }
.btn-info             { background:rgb(91,192,222); border-color:rgb(70,184,218); color:#fff; outline-color:#fff; }
.btn-primary          { background:rgb(51,122,183); border-color:rgb(46,109,164); color:#fff; outline-color:#fff; }
.btn-default          { background:#fff; border-color:rgb(230,233,238); color:#333; }
.mb                   { margin-bottom:10px; }
.pull-right           { display:block; float:right; }

.fa                   { display:inline-block; font-family:FontAwesome; font-weight:400;
                        white-space:nowrap; vertical-align:baseline; user-select:none;
                        transform:matrix(1,0,0,1,0,0); }
.btn .fa-cloud-upload { width:15px; height:14px; font-size:14px; line-height:14px; color:#fff; }
.fa-cloud-upload::before { content:"\f0ee"; }
.fa-smile-o::before      { content:"\f118"; }

.table-responsive     { display:block; width:823px; max-width:100%; min-height:.01%;
                        overflow-x:auto; overflow-y:auto; }
table.table           { display:table; width:823px; max-width:100%; margin:0; padding:0;
                        border-radius:0 0 3px 3px;      /* measured: only bottom corners */
                        border-collapse:separate; border-spacing:0; }
table.table > thead > tr > th {
                        display:table-cell; height:60px; padding:20px 8px;
                        border:0; border-right:1px solid rgb(221,221,221);
                        font-weight:700; font-size:14px; line-height:20px;
                        vertical-align:bottom; text-align:left; border-radius:0; }
table.table > thead > tr > th.text-center { text-align:center; }
table.table > thead > tr > th:last-child  { border-right:0; border-left:1px solid rgb(221,221,221); }
/* measured column widths */
table.table > thead > tr > th:nth-child(1){ width:387.094px; }
table.table > thead > tr > th:nth-child(2){ width:435.906px; }

/* hidden-editor raw inputs — the reference does NOT use .form-control here */
.input-name-txt, .input-emoji-txt { display:inline-block; padding:1px 2px;
                        border:2px inset rgb(118,118,118); background:#fff;
                        font:400 14px/20px "Helvetica Neue",Helvetica,Arial,sans-serif;
                        overflow:clip; cursor:text; }
.input-text           { display:inline-block; padding:2px; border:1px solid rgb(118,118,118);
                        background:#fff; white-space:pre-wrap; overflow-wrap:break-word;
                        overflow:auto; cursor:text; resize:both; appearance:auto; }
input[type=color]     { display:inline-block; width:50px; height:27px; padding:1px 2px;
                        border:1px solid #000; background:rgb(239,239,239);
                        cursor:default; appearance:auto; }
.label                { display:inline; margin-right:-4px; padding:2.7px; border-radius:3.375px;
                        color:#fff; font:700 13.5px/13.5px "Helvetica Neue",Helvetica,Arial,sans-serif;
                        white-space:nowrap; }
.user-badge-img       { display:inline-block; height:100%; max-height:20px; margin:0 4px;
                        vertical-align:middle; overflow:clip; cursor:pointer; }
hr                    { display:block; box-sizing:content-box; height:0; margin:20px auto;
                        border:0; border-top:1px solid rgb(238,238,238);
                        color:rgb(128,128,128); overflow:hidden; }
label                 { display:inline-block; max-width:100%; margin:0 0 5px;
                        font-weight:700; cursor:default; }
```

Measured checkpoints: `h3` `366,360.8 1110×26.4` · `.row` `351,397.2 1140×126` · `.col-md-9` `351,397.2 855×106` · Add New Badge `367,398.2 128.664×34` · Upload Image Badge `499.6,398.2 177.656×34` (icon `512.6,408.2 15×14`) · Export Badges `681.1,398.2 119.078×34` · table `367,442.2 823×60` · `th Badge` `367,442.2 387.094×60` · `th Actions` `754.1,442.2 435.906×60` · **`tbody` `367,502.2 823×0`**.

---

## 9. Honest gaps

1. **The exact value of `badgesList` is not in the evidence.** The dump captures DOM + computed style, not AngularJS scope. The evidence proves *truthy with zero repeated rows*; `[]` is the overwhelmingly likely value but is **not directly proven**.
2. **The badge row markup is completely unknown.** With zero `<tr>`s the repeater template never instantiated, so we do not know what a rendered badge row's cells contain (a `.label` pill? an `<img>`? which action buttons?). Any rebuilt row body would be **invention** and must instead be driven by real data or an honest-pending state.
3. **The hidden editor panel has zero layout evidence.** All 27 of its nodes have `rect 0×0`. Widths quoted as `50%` / `auto` are computed values, not measured boxes. A logged-in capture with `showAddBadge=true` would be needed to verify it pixel-for-pixel.
4. **The Intercom emoji popover has zero layout evidence** (`opacity:0`, `visibility:hidden`, all rects `0×0`). Its `330 × 260` picker box is a computed value only.
5. **`badges.mode` is `'add'`** (proven: `#112` has no `ng-hide`, `#113` does; `#141` has no `ng-hide`, `#142` does). The `'edit'` variant's layout is unverified.
6. **`badges.imgURL` is falsy** (proven: `#133` has `ng-hide`, `#134` does not, `#135` does not). The image-badge branch is unverified.
7. **The `value="TEST"` on `#badgeInputTxt` is a shipped dev artefact.** It is real evidence of the reference's HTML, but must **not** be reproduced as user-facing data.
8. **The corner-radius asymmetry** (this table `0/0/3px/3px` vs the sessions table `3px`×4) is recorded as measured; the CSS rule producing it was not captured (`styles.css` has 2290 rules and is not in the feedable slices).
9. **No hover state** was captured for `.table-hover`, and with zero rows the `.table-striped` alternation is unverifiable here.
10. **`#198`'s `ng-dblclick="showBadgeID=!showBadgeID;"`** implies a hidden badge-id column or inline id text that never rendered — unknown.
