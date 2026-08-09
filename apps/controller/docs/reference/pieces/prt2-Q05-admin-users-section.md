# prt2 — Q05 — The **Extra Admin Users** section

**Evidence base:** `/tmp/ptr-decode/prt2/caps/00-baseline-room/` (`DEFAULTS.txt`, `nodes-000.txt` … `nodes-007.txt`, 882 records, `truncated=false`).
**Page:** `https://protradingroom.com/ptrApp#/page/welcome`, `role=member`, viewport `1842×1265 @dpr2`.

> **RESOLUTION NOTE.** prt2's `DEFAULTS.txt` COMMON table is skewed by 635 Intercom emoji `<span>`s (`display:inline-table`, `visibility:hidden`, `width:30px`, `padding:5px`, `font-size:28px`, `line-height:30px`, `text-align:center`, `vertical-align:middle`, `cursor:pointer`, Apple-Color-Emoji stack). **All values below are RESOLVED ABSOLUTE values.** A `<td>`/`<th>` that omits `text-align` resolves to `center` — and in every such case here the element carries `class="text-center"`, so the skew and the truth agree.

---

## 1. Purpose

This piece decodes the **Extra Admin Users** section: its `<h3>` heading, the green "Add Admin User" button, the hidden add-admin-user panel with its three-field form, and the four-column table whose only row is the `colspan="4"` empty state **"No admin users added yet"**. Unlike the Badges section (Q04), this empty state is *correctly* wired and does render.

## 2. Path anchor + record count

**Anchors:** `path=r.0.1.1.0.0.0.0.7` (the `h3`) and `path=r.0.1.1.0.0.0.0.8` (the `.row`) plus all descendants.

```
cd /tmp/ptr-decode/prt2/caps/00-baseline-room
awk -v RS='' -v ORS='\n\n' '/path=r\.0\.1\.1\.0\.0\.0\.0\.(7|8)([. ]|$)/' nodes-*.txt
```

**33 records found:** `#70`, `#71`, `#84`, `#101`, `#102`, `#103`, `#104`, `#119`, `#120`, `#121`, `#148`, `#149`, `#150`, `#151`, `#173`–`#176`, `#177`, `#178`, `#200`–`#207`, `#208`–`#211`, `#212`.

**14 render** (`#70`, `#71`, `#84`, `#101`, `#104`, `#121`, `#150`, `#151`, `#177`, `#178`, `#208`–`#211`, `#212`); **19 do not**.

Vertical extent: **y = 564.2 → y = 778.6** (`h3` top → `.row` `#71` bottom = 600.6 + 178).

---

## 3. Node table

| # | path | tag | id | class (verbatim) | x | y | w | h | renders? |
|---|---|---|---|---|---|---|---|---|---|
| 70 | `r.0.1.1.0.0.0.0.7` | `h3` | — | *(no attributes at all)* | 366 | 564.2 | 1110 | 26.3984 | **yes** |
| 71 | `r.0.1.1.0.0.0.0.8` | `div` | — | `row` | 351 | 600.6 | 1140 | 178 | **yes** |
| 84 | `…8.0` | `div` | — | `col-md-12 panel pane-default` | 351 | 600.6 | 1140 | 158 | **yes** |
| 101 | `…8.0.0` | `button` | — | `btn btn-success mb` | 367 | 601.6 | 128.961 | 34 | **yes** |
| 102 | `…8.0.1` | `button` | — | `btn btn-secondary mb ng-hide` | 0 | 0 | 0 | 0 | no |
| 103 | `…8.0.2` | `div` | — | `panel panel-default ng-hide` | 0 | 0 | 0 | 0 | **no** — root of the hidden add-panel |
| 119 | `…8.0.2.0` | `div` | — | `panel-heading` | 0 | 0 | 0 | 0 | no |
| 148 | `…8.0.2.0.0` | `h3` | — | `panel-title` | 0 | 0 | 0 | 0 | no |
| 120 | `…8.0.2.1` | `div` | — | `panel-body` | 0 | 0 | 0 | 0 | no |
| 149 | `…8.0.2.1.0` | `form` | — | `ng-pristine ng-invalid ng-invalid-required ng-valid-email` | 0 | 0 | 0 | 0 | no |
| 173 | `…8.0.2.1.0.0` | `div` | — | `form-group` | 0 | 0 | 0 | 0 | no |
| 200 | `…8.0.2.1.0.0.0` | `label` | — | *(no attributes at all)* | 0 | 0 | 0 | 0 | no |
| 201 | `…8.0.2.1.0.0.1` | `input` | — | `form-control ng-pristine ng-untouched ng-invalid ng-invalid-required` | 0 | 0 | 0 | 0 | no |
| 174 | `…8.0.2.1.0.1` | `div` | — | `form-group` | 0 | 0 | 0 | 0 | no |
| 202 | `…8.0.2.1.0.1.0` | `label` | — | *(no attributes at all)* | 0 | 0 | 0 | 0 | no |
| 203 | `…8.0.2.1.0.1.1` | `input` | — | `form-control ng-pristine ng-untouched ng-valid ng-valid-email ng-valid-required` | 0 | 0 | 0 | 0 | no |
| 175 | `…8.0.2.1.0.2` | `div` | — | `form-group` | 0 | 0 | 0 | 0 | no |
| 204 | `…8.0.2.1.0.2.0` | `label` | — | *(no attributes at all)* | 0 | 0 | 0 | 0 | no |
| 205 | `…8.0.2.1.0.2.1` | `input` | — | `form-control ng-pristine ng-untouched ng-valid ng-valid-required` | 0 | 0 | 0 | 0 | no |
| 176 | `…8.0.2.1.0.3` | `div` | — | `form-group` | 0 | 0 | 0 | 0 | no |
| 206 | `…8.0.2.1.0.3.0` | `button` | — | `btn btn-primary` | 0 | 0 | 0 | 0 | no |
| 207 | `…8.0.2.1.0.3.1` | `button` | — | `btn btn-default` | 0 | 0 | 0 | 0 | no |
| 104 | `…8.0.3` | `div` | — | `table-responsive` | 367 | 660.6 | 1108 | 97 | **yes** |
| 121 | `…8.0.3.0` | `table` | — | `table table-striped table-bordered table-hover` | 367 | 660.6 | 1108 | 97 | **yes** |
| 150 | `…8.0.3.0.0` | `thead` | — | *(none)* | 367 | 660.6 | 1108 | 60.5 | **yes** |
| 177 | `…8.0.3.0.0.0` | `tr` | — | *(none)* | 367 | 660.6 | 1108 | 60.5 | **yes** |
| 208 | `…8.0.3.0.0.0.0` | `th` | — | *(no class)* | 367 | 660.6 | 260.094 | 60.5 | **yes** — "Name" |
| 209 | `…8.0.3.0.0.0.1` | `th` | — | *(no class)* | 627.1 | 660.6 | 252.57 | 60.5 | **yes** — "Email" |
| 210 | `…8.0.3.0.0.0.2` | `th` | — | *(no class)* | 879.7 | 660.6 | 281.859 | 60.5 | **yes** — "Added" |
| 211 | `…8.0.3.0.0.0.3` | `th` | — | `text-center` | 1161.5 | 660.6 | 313.477 | 60.5 | **yes** — "Actions" |
| 151 | `…8.0.3.0.1` | `tbody` | — | *(none)* | 367 | 721.1 | 1108 | 36.5 | **yes** |
| 178 | `…8.0.3.0.1.0` | `tr` | — | *(no class)* | 367 | 721.1 | 1108 | 36.5 | **yes** |
| 212 | `…8.0.3.0.1.0.0` | `td` | — | `text-center text-muted` | 367 | 721.1 | 1108 | 36.5 | **yes** — the empty state |

Column geometry (sums to 1108.0): `Name 367 → 260.094` · `Email 627.094 → 252.570` · `Added 879.664 → 281.859` · `Actions 1161.523 → 313.477`.

> **Note the header labels are `Name / Email / Added / Actions` — four columns — and `#212` uses `colspan="4"`.** ✔ consistent.
> Also note **three of the four headers carry no `class`** (so they resolve to `text-align: left`), only "Actions" is `.text-center`. In the Sessions table (Q03) all but the first were `.text-center`.

---

## 4. The empty state is correctly wired (contrast with Q04)

| # | element | binding | class | resolved `display` | rect |
|---|---|---|---|---|---|
| 178 | `<tr>` | `ng-show = "!adminUsers \|\| adminUsers.length===0"` | *(no `ng-hide`)* | **`table-row`** | `367, 721.1 → 1108 × 36.5` |
| 212 | `<td colspan="4" class="text-center text-muted">` | — | — | **`table-cell`** | `367, 721.1 → 1108 × 36.5` |

`adminUsers` is either falsy or an empty array, and because the binding uses **`.length===0`** (not bare truthiness) the row shows correctly. **The user sees "No admin users added yet" in muted grey, centred across the full 1108px table.** This is exactly the fix that the Badges section (Q04 `#99`) is missing.

Also visible: `#101` "Add Admin User" renders (`ng-show="!showAddAdminUser"` → no `ng-hide`), while `#102` "Close Add Admin User" and `#103` (the add panel) are `display:none` → **`showAddAdminUser` is falsy.**

---

## 5. Every attribute, verbatim

### `#70` `<h3>`
```
attrs: (none)
text: "Extra Admin Users"
```

### `#71` `<div class="row">`
```
class = "row"
::before / ::after : content "\" \"" (U+0022 U+0020 U+0022); color rgb(51,51,51); font "Helvetica Neue", Helvetica, Arial, sans-serif; font-size 14px; background-color rgba(0,0,0,0)
```

### `#84` `<div class="col-md-12 panel pane-default">`
```
class = "col-md-12 panel pane-default"
```
(⚠️ `pane-default`, not `panel-default` — the same reference typo as in Q03/Q04.)

### `#101` `<button class="btn btn-success mb">`
```
ng-show  = "!showAddAdminUser"
type     = "button"
class    = "btn btn-success mb"
ng-click = "showAddAdminUser=!showAddAdminUser"
text     = "Add Admin User"
```

### `#102` `<button class="btn btn-secondary mb ng-hide">`
```
ng-show  = "showAddAdminUser"
type     = "button"
class    = "btn btn-secondary mb ng-hide"
ng-click = "showAddAdminUser=!showAddAdminUser"
text     = "Close Add Admin User"
```
⚠️ `btn-secondary` is a **Bootstrap 4** class name; this page loads Bootstrap **3** (`01-stylesheets/02.css`, 1187 rules). It therefore matches nothing and the button resolves to the UA button default (`background-color: rgb(239, 239, 239)`, transparent border) — see §6. Recorded as a real reference inconsistency.

### `#103` `<div class="panel panel-default ng-hide">`
```
class   = "panel panel-default ng-hide"
ng-show = "showAddAdminUser"
style   = "margin-top: 15px"
```

### `#119` `<div class="panel-heading">` / `#148` `<h3 class="panel-title">`
```
#119  class = "panel-heading"
#148  class = "panel-title"      text = "Add Admin User"
```

### `#120` `<div class="panel-body">`
```
class = "panel-body"
::before / ::after : content "\" \"" …
```

### `#149` `<form>`
```
ng-submit = "addAdminUser()"
class     = "ng-pristine ng-invalid ng-invalid-required ng-valid-email"
```
(The `ng-invalid-required` class is present because the Name field `#201` is empty and `required`.)

### `#173`–`#176` `<div class="form-group">` ×4
```
class = "form-group"        (all four identical)
```

### `#200`/`#201` — Name
```
#200  attrs: (none)                text = "Name"
#201  type        = "text"
      class       = "form-control ng-pristine ng-untouched ng-invalid ng-invalid-required"
      ng-model    = "adminUser.name"
      placeholder = "Enter name"
      required    = ""
```

### `#202`/`#203` — Email
```
#202  attrs: (none)                text = "Email"
#203  type        = "email"
      class       = "form-control ng-pristine ng-untouched ng-valid ng-valid-email ng-valid-required"
      ng-model    = "adminUser.email"
      placeholder = "Enter email"
      required    = ""
```

### `#204`/`#205` — Password
```
#204  attrs: (none)                text = "Password"
#205  type        = "password"
      class       = "form-control ng-pristine ng-untouched ng-valid ng-valid-required"
      ng-model    = "adminUser.password"
      placeholder = "Enter password"
      required    = ""
```

> **All three `<label>`s have NO `for` attribute** and none of the three `<input>`s has an `id`. This is consistent with the whole page: **zero `label[for]` in all 882 nodes.**

### `#206`/`#207` — the form buttons
```
#206  type  = "submit"
      class = "btn btn-primary"
      text  = "Add Admin User"
#207  type     = "button"
      class    = "btn btn-default"
      ng-click = "showAddAdminUser=false; adminUser={name:'',email:'',password:'',perms:{}}"
      text     = "Cancel"
```
> The reset object `{name:'',email:'',password:'',perms:{}}` reveals a **`perms` field** on the admin-user model that has **no UI anywhere in this capture** — an honest gap (see §9).

### `#104` `<div class="table-responsive">`
```
class = "table-responsive"
style = "margin-top: 15px"
```

### `#121` `<table>`, `#150` `<thead>`, `#177` `<tr>`, `#151` `<tbody>`
```
#121  class = "table table-striped table-bordered table-hover"
#150  attrs: (none)
#177  attrs: (none)
#151  attrs: (none)
```

### `#208`–`#211` — header cells
```
#208  attrs: (none)                text = "Name"
#209  attrs: (none)                text = "Email"
#210  attrs: (none)                text = "Added"
#211  class = "text-center"        text = "Actions"
```
**None of the four is sortable** — no `ng-click` anywhere in this thead (contrast Q03, where "Session ID" and "Name" have `sortByUUID()` / `sortByName()`).

### `#178` `<tr>` — the empty-state row
```
ng-show = "!adminUsers || adminUsers.length===0"
```
(No `class` attribute at all — Angular did **not** add `ng-hide`, proving the expression is true.)

### `#212` `<td>` — the empty-state cell
```
colspan = "4"
class   = "text-center text-muted"
text    = "No admin users added yet"
```

---

## 6. Resolved computed style

### `#70` `h3` "Extra Admin Users"
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

### `#71` `div.row`
`display:block` · `visible` · `static` · `float:none` · `width:1140px` `height:178px` · **margin `0 / -15px / 0 / -15px`** · padding `0`×4 · border `0px none rgb(51,51,51)`×4 · radius `0px`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto` · clearfix `::before`/`::after` `content:" "`.

### `#84` `div.col-md-12.panel.pane-default`
`display:block` · `visible` · **`position:relative`** inset `0/0/0/0` · **`float:left`** · **`width:1140px` `height:158px` `min-height:1px`** · margin `0 / 0 / **20px** / 0` · **padding `0 / 15px / 0 / 15px`** · border-width `1px`×4 / style `solid`×4 / **colour `rgba(0, 0, 0, 0)`**×4 · **radius `4px`**×4 · **bg `rgb(255, 255, 255)`** · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · **box-shadow `rgba(0, 0, 0, 0.05) 0px 1px 1px 0px`** · cursor `auto`.

### `#101` `button.btn.btn-success.mb` — "Add Admin User"
| prop | value |
|---|---|
| display / visibility | `inline-block` / `visible` |
| position / float | `static` / `none` |
| width / height | `128.961px` / `34px` |
| margin T/R/B/L | `0px / 0px / **10px** / 0px` |
| padding T/R/B/L | `6px / 12px / 6px / 12px` |
| border-width / style | `1px`×4 / `solid`×4 |
| **border-colour** | **`rgb(76, 174, 76)`**×4 |
| radius | `4px`×4 |
| **background-color** | **`rgb(92, 184, 92)`** |
| **color** | **`rgb(255, 255, 255)`** |
| font-family / size / weight | `"Helvetica Neue", …` / `14px` / `400` |
| line-height | `20px` |
| letter-spacing / text-align / vertical-align | `normal` / `center` / `middle` |
| **white-space** | **`nowrap`** |
| overflow / opacity / box-shadow | `visible` / `1` / `none` |
| **cursor / user-select** | **`pointer` / `none`** |
| outline-color | `rgb(255, 255, 255)` |

### `#102` `button.btn.btn-secondary.mb.ng-hide` — "Close Add Admin User"
**`display: none`** · `visible` · width/height `auto` · margin `0 / 0 / 10px / 0` · padding `6px / 12px / 6px / 12px` · border-width `1px`×4 / style `solid`×4 / **colour `rgba(0, 0, 0, 0)`**×4 · radius `4px`×4 · **background-color `rgb(239, 239, 239)`** ← the UA default, because `.btn-secondary` does not exist in Bootstrap 3 · **color `rgb(51, 51, 51)`** · Helvetica `14px`/`400`/`20px` · text-align `center` · vertical-align `middle` · **white-space `nowrap`** · overflow `visible` · opacity `1` · box-shadow `none` · **cursor `pointer`** · **user-select `none`**.

### `#103` `div.panel.panel-default.ng-hide` (the add panel)
**`display: none`** · `visible` · `static` · width/height `auto` · **margin `15px / 0 / 20px / 0`** · padding `0`×4 · border-width `1px`×4 / style `solid`×4 / **colour `rgb(221, 221, 221)`**×4 · **radius `4px`**×4 · **bg `rgb(255, 255, 255)`** · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · **box-shadow `rgba(0, 0, 0, 0.05) 0px 1px 1px 0px`** · cursor `auto`.

### `#119` `div.panel-heading`
`display:block` · `visible` · width/height `auto` · margin `0`×4 · **padding `10px / 15px / 10px / 15px`** · border-top/right/left `0px none`, **border-bottom `1px solid rgb(221, 221, 221)`**; border-colour `rgb(221,221,221)`×4 · **radius: top-left `3px`, top-right `3px`, bottom `0`** · **bg `rgb(245, 245, 245)`** · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · cursor `auto`.

### `#148` `h3.panel-title` "Add Admin User"
`display:block` · `visible` · width/height `auto` · margin `0`×4 · padding `0`×4 · border `0px none rgb(51,51,51)`×4 · radius `0`×4 · bg transparent · color `rgb(51,51,51)` · Helvetica **`16px`** / **`500`** / **line-height `17.6px`** · text-align `start` · vertical-align `baseline` · cursor `auto`.

### `#120` `div.panel-body`
`display:block` · `visible` · width/height `auto` · margin `0`×4 · **padding `15px`×4** · border `0px none rgb(51,51,51)`×4 · radius `0`×4 · bg transparent · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · cursor `auto` · clearfix pseudos.

### `#149` `form`
`display:block` · `visible` · width/height `auto` · margin `0`×4 · padding `0`×4 · border `0px none rgb(51,51,51)`×4 · radius `0`×4 · bg transparent · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · cursor `auto`.

### `#173`–`#176` `div.form-group` (all four identical)
`display:block` · `visible` · `static` · width/height `auto` · **margin `0 / 0 / 15px / 0`** · padding `0`×4 · border `0px none rgb(51,51,51)`×4 · radius `0`×4 · bg transparent · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.
(Note: these are plain `.form-group` — **no `position:relative`**, unlike the login card's `.form-group.has-feedback` in Q02.)

### `#200`, `#202`, `#204` `label` ("Name", "Email", "Password") — all identical
`display:inline-block` · `visible` · `static` · width `auto`, **`max-width:100%`** · margin `0 / 0 / **5px** / 0` · padding `0`×4 · border `0px none rgb(51,51,51)`×4 · radius `0`×4 · bg transparent · color `rgb(51,51,51)` · Helvetica `14px` / **`700`** / `20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · **cursor `default`**.

### `#201`, `#203`, `#205` `input.form-control` — all identical
| prop | value |
|---|---|
| display / visibility | `block` / `visible` |
| position / float | `static` / `none` |
| **width / height** | **`100%` / `34px`** |
| margin T/R/B/L | `0px`×4 |
| **padding T/R/B/L** | **`6px / 18px / 6px / 18px`** (no `.has-feedback` here, so both sides are 18px — contrast Q02's 42.5px right pad) |
| border-width / style | `1px`×4 / `solid`×4 |
| **border-colour** | **`rgb(219, 217, 217)`**×4 |
| radius | `4px`×4 |
| background-color | `rgb(255, 255, 255)` |
| **color** | **`rgb(85, 85, 85)`** |
| font-family / size / weight | `"Helvetica Neue", …` / `14px` / `400` |
| line-height | `20px` |
| letter-spacing / text-align / vertical-align | `normal` / `start` / `baseline` |
| white-space / overflow-x/-y | `normal` / `clip` / `clip` |
| opacity | `1` |
| box-shadow | `rgb(0, 0, 0) 0px 0px 0px 0px` |
| **cursor** | **`text`** |
| outline-color | `rgb(85, 85, 85)` |
| **transition** | **`border-color 0.15s, box-shadow 0.15s`** |

### `#206` `button.btn.btn-primary` "Add Admin User"
`display:inline-block` · `visible` · width/height `auto` · margin `0`×4 · padding `6px / 12px / 6px / 12px` · border-width `1px`×4 / style `solid`×4 / **colour `rgb(46, 109, 164)`**×4 · radius `4px`×4 · **bg `rgb(51, 122, 183)`** · **color `rgb(255, 255, 255)`** · Helvetica `14px`/`400`/`20px` · text-align `center` · vertical-align `middle` · **white-space `nowrap`** · overflow `visible` · opacity `1` · box-shadow `none` · **cursor `pointer`** · **user-select `none`** · outline-color `rgb(255,255,255)`.

### `#207` `button.btn.btn-default` "Cancel"
Identical to `#206` except **border-colour `rgb(230, 233, 238)`×4**, **bg `rgb(255, 255, 255)`**, **color `rgb(51, 51, 51)`**, outline-color `rgb(51,51,51)`.

### `#104` `div.table-responsive`
`display:block` · `visible` · `static` · **`width:1108px` `height:97px`, `max-width:100%`, `min-height:0.01%`** · **margin `15px / 0 / 0 / 0`** (from the inline `style="margin-top: 15px"`) · padding `0`×4 · border `0px none rgb(51,51,51)`×4 · radius `0`×4 · bg transparent · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · **overflow-x/-y `auto`/`auto`** · opacity `1` · box-shadow `none` · cursor `auto`.

### `#121` `table.table.table-striped.table-bordered.table-hover`
`display:table` · `visible` · `static` · **`width:1108px` `height:97px`, `max-width:100%`** · margin `0`×4 · padding `0`×4 · border-width `0`×4 / style `none`×4 / colour `rgb(51,51,51)`×4 · **radius: top-left `0`, top-right `0`, bottom-left `3px`, bottom-right `3px`** · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.
(Same asymmetric radius as the Badges and API-Keys tables; the Sessions table is the only one with all four corners at 3px.)

### `#150` `thead` / `#151` `tbody`
| prop | `#150` | `#151` |
|---|---|---|
| display | `table-header-group` | `table-row-group` |
| visibility | `visible` | `visible` |
| width / height | `1108px` / `60.5px` | `1108px` / `36.5px` |
| rect y | `660.6` | `721.1` |
| margin / padding | `0`×4 / `0`×4 | `0`×4 / `0`×4 |
| border / radius | `0px none rgb(51,51,51)` / `0px`×4 | same |
| bg / color | `rgba(0,0,0,0)` / `rgb(51,51,51)` | same |
| font / line-height | Helvetica `14px` `400` / `20px` | same |
| text-align / vertical-align | `start` / `middle` | `start` / `middle` |
| cursor | `auto` | `auto` |

### `#177` `tr` (header row)
`display:table-row` · `visible` · `width:1108px` `height:60.5px` · margin/padding `0`×4 · border `0px none rgb(51,51,51)`×4 · **radius `0px`×4** · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `middle` · cursor `auto`.

### `#178` `tr` (the empty-state row)
`display:table-row` · `visible` · `width:1108px` `height:36.5px` · margin/padding `0`×4 · border `0px none rgb(51,51,51)`×4 · **radius: top `0`, bottom-left `3px`, bottom-right `3px`** · **background-color `rgb(249, 249, 249)`** ← `.table-striped` odd-row stripe · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `middle` · cursor `auto`.

### Header cells `#208`–`#211`
Common: `display:table-cell` · `visible` · height `60.5px` · margin `0`×4 · **padding `20px / 8px / 20px / 8px`** · border-top/bottom `0px none` · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px` / **`700`** / `20px` · letter-spacing `normal` · **vertical-align `bottom`** · white-space `normal` · **radius `0px`×4** · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.

| # | text | width | border-left | border-right | text-align |
|---|---|---|---|---|---|
| 208 | Name | `260.094px` | `0px none` | **`1px solid rgb(221,221,221)`** | **`left`** |
| 209 | Email | `252.57px` | **`1px solid rgb(221,221,221)`** | **`1px solid rgb(221,221,221)`** | **`left`** |
| 210 | Added | `281.859px` | **`1px solid rgb(221,221,221)`** | **`1px solid rgb(221,221,221)`** | **`left`** |
| 211 | Actions | `313.477px` | **`1px solid rgb(221,221,221)`** | `0px none` | **`center`** |

### `#212` `td[colspan="4"].text-center.text-muted` — "No admin users added yet"
| prop | value |
|---|---|
| display / visibility | `table-cell` / `visible` |
| **width / height** | **`1108px` / `36.5px`** (spans all four columns) |
| margin T/R/B/L | `0px`×4 |
| **padding T/R/B/L** | **`8px / 8px / 8px / 8px`** |
| **border-top** | **`1px solid rgb(221, 221, 221)`** |
| border-right / bottom / left | `0px none rgb(119,119,119)` |
| **radius** | top-left `0`, top-right `0`, **bottom-left `3px`, bottom-right `3px`** |
| background-color | `rgba(0, 0, 0, 0)` (the `rgb(249,249,249)` stripe comes from `#178`) |
| **color** | **`rgb(119, 119, 119)`** |
| font-family / size / weight | `"Helvetica Neue", …` / `14px` / `400` |
| line-height | `20px` |
| letter-spacing | `normal` |
| **text-align** | **`center`** |
| **vertical-align** | **`top`** |
| white-space / overflow / opacity / box-shadow | `normal` / `visible` / `1` / `none` |
| cursor | `auto` |
| outline-color | `rgb(119, 119, 119)` |

---

## 7. Verbatim text (every string, with path)

| path | element | text (verbatim) | renders? |
|---|---|---|---|
| `r.0.1.1.0.0.0.0.7` | `h3` | `Extra Admin Users` | **yes** |
| `…8.0.0` | `button.btn-success` | `Add Admin User` | **yes** |
| `…8.0.1` | `button.btn-secondary.ng-hide` | `Close Add Admin User` | no |
| `…8.0.2.0.0` | `h3.panel-title` | `Add Admin User` | no |
| `…8.0.2.1.0.0.0` | `label` | `Name` | no |
| `…8.0.2.1.0.0.1` | `input` | *(placeholder)* `Enter name` | no |
| `…8.0.2.1.0.1.0` | `label` | `Email` | no |
| `…8.0.2.1.0.1.1` | `input` | *(placeholder)* `Enter email` | no |
| `…8.0.2.1.0.2.0` | `label` | `Password` | no |
| `…8.0.2.1.0.2.1` | `input` | *(placeholder)* `Enter password` | no |
| `…8.0.2.1.0.3.0` | `button.btn-primary` | `Add Admin User` | no |
| `…8.0.2.1.0.3.1` | `button.btn-default` | `Cancel` | no |
| `…8.0.3.0.0.0.0` | `th` | `Name` | **yes** |
| `…8.0.3.0.0.0.1` | `th` | `Email` | **yes** |
| `…8.0.3.0.0.0.2` | `th` | `Added` | **yes** |
| `…8.0.3.0.0.0.3` | `th.text-center` | `Actions` | **yes** |
| `…8.0.3.0.1.0.0` | `td[colspan="4"]` | `No admin users added yet` | **yes** |

**No truncation** anywhere in this section: the longest text is 24 characters (cap 250) and the longest attribute value is the `ng-click` on `#207` at 74 characters (cap 300).

---

## 8. Rebuild spec (pixel-for-pixel)

```html
<h3>Extra Admin Users</h3>

<div class="row">
  <div class="col-md-12 panel pane-default">

    <button type="button" class="btn btn-success mb" hidden={showAddAdminUser}
            on:click={() => showAddAdminUser = !showAddAdminUser}>Add Admin User</button>
    <button type="button" class="btn btn-secondary mb" hidden={!showAddAdminUser}
            on:click={() => showAddAdminUser = !showAddAdminUser}>Close Add Admin User</button>

    <div class="panel panel-default" style="margin-top:15px" hidden={!showAddAdminUser}>
      <div class="panel-heading"><h3 class="panel-title">Add Admin User</h3></div>
      <div class="panel-body">
        <form on:submit|preventDefault={addAdminUser}>
          <div class="form-group">
            <label>Name</label>
            <input type="text" class="form-control" placeholder="Enter name"
                   required bind:value={adminUser.name}>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" class="form-control" placeholder="Enter email"
                   required bind:value={adminUser.email}>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" class="form-control" placeholder="Enter password"
                   required bind:value={adminUser.password}>
          </div>
          <div class="form-group">
            <button type="submit" class="btn btn-primary">Add Admin User</button>
            <button type="button" class="btn btn-default"
                    on:click={() => { showAddAdminUser = false;
                                      adminUser = {name:'',email:'',password:'',perms:{}}; }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <div class="table-responsive" style="margin-top:15px">
      <table class="table table-striped table-bordered table-hover">
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Added</th><th class="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if !adminUsers || adminUsers.length === 0}
            <tr><td colspan="4" class="text-center text-muted">No admin users added yet</td></tr>
          {:else}
            {#each adminUsers as u}<tr>…</tr>{/each}
          {/if}
        </tbody>
      </table>
    </div>

  </div>
</div>
```

```css
h3                  { display:block; width:1110px; height:26.3984px; margin:20px 0 10px; padding:0;
                      color:#333; font:500 24px/26.4px "Helvetica Neue",Helvetica,Arial,sans-serif;
                      text-align:start; }
.row                { display:block; width:1140px; margin:0 -15px; padding:0; }
.row::before,.row::after { content:" "; display:table; } .row::after { clear:both; }
.col-md-12          { position:relative; float:left; width:1140px; min-height:1px; padding:0 15px; }
.panel.pane-default { margin:0 0 20px; border:1px solid rgba(0,0,0,0); border-radius:4px;
                      background:#fff; box-shadow:rgba(0,0,0,.05) 0 1px 1px 0; }
.panel.panel-default{ margin:0 0 20px; border:1px solid rgb(221,221,221); border-radius:4px;
                      background:#fff; box-shadow:rgba(0,0,0,.05) 0 1px 1px 0; }
.panel-heading      { display:block; padding:10px 15px; background:rgb(245,245,245);
                      border-bottom:1px solid rgb(221,221,221); border-radius:3px 3px 0 0; }
.panel-title        { display:block; margin:0; font:500 16px/17.6px "Helvetica Neue",Helvetica,Arial,sans-serif; }
.panel-body         { display:block; padding:15px; }
.panel-body::before,.panel-body::after { content:" "; display:table; }
.panel-body::after  { clear:both; }

.form-group         { display:block; margin:0 0 15px; padding:0; }
label               { display:inline-block; max-width:100%; margin:0 0 5px;
                      font-weight:700; cursor:default; }
.form-control       { display:block; width:100%; height:34px; margin:0; padding:6px 18px;
                      border:1px solid rgb(219,217,217); border-radius:4px;
                      background:#fff; color:#555; outline-color:#555;
                      font:400 14px/20px "Helvetica Neue",Helvetica,Arial,sans-serif;
                      text-align:start; overflow:clip; box-shadow:rgb(0,0,0) 0 0 0 0;
                      cursor:text; transition:border-color .15s, box-shadow .15s; }

.btn                { display:inline-block; margin:0; padding:6px 12px; border:1px solid transparent;
                      border-radius:4px; font:400 14px/20px "Helvetica Neue",Helvetica,Arial,sans-serif;
                      text-align:center; vertical-align:middle; white-space:nowrap;
                      cursor:pointer; user-select:none; }
.btn-success        { background:rgb(92,184,92);  border-color:rgb(76,174,76);   color:#fff; outline-color:#fff; }
.btn-primary        { background:rgb(51,122,183); border-color:rgb(46,109,164);  color:#fff; outline-color:#fff; }
.btn-default        { background:#fff;            border-color:rgb(230,233,238); color:#333; }
/* reference bug: .btn-secondary is BS4 and matches nothing → UA default */
.btn-secondary      { background:rgb(239,239,239); border-color:rgba(0,0,0,0);   color:#333; }
.mb                 { margin-bottom:10px; }

.table-responsive   { display:block; width:1108px; max-width:100%; min-height:.01%;
                      overflow-x:auto; overflow-y:auto; }
table.table         { display:table; width:1108px; max-width:100%; margin:0; padding:0;
                      border-radius:0 0 3px 3px; border-collapse:separate; border-spacing:0; }
table.table > thead > tr > th {
                      display:table-cell; height:60.5px; padding:20px 8px;
                      border:0; border-right:1px solid rgb(221,221,221);
                      border-left:1px solid rgb(221,221,221);
                      font-weight:700; font-size:14px; line-height:20px;
                      vertical-align:bottom; text-align:left; }
table.table > thead > tr > th:first-child { border-left:0; }
table.table > thead > tr > th:last-child  { border-right:0; }
table.table > thead > tr > th.text-center { text-align:center; }
/* measured column widths, sum 1108 */
table.table > thead > tr > th:nth-child(1){width:260.094px}
table.table > thead > tr > th:nth-child(2){width:252.570px}
table.table > thead > tr > th:nth-child(3){width:281.859px}
table.table > thead > tr > th:nth-child(4){width:313.477px}

table.table.table-striped > tbody > tr:nth-of-type(odd) { background:rgb(249,249,249); }
table.table > tbody > tr > td {
                      display:table-cell; height:36.5px; padding:8px;
                      border:0; border-top:1px solid rgb(221,221,221);
                      font-size:14px; line-height:20px; vertical-align:top; text-align:start; }
table.table > tbody > tr > td.text-center { text-align:center; }
table.table > tbody > tr:last-child > td[colspan] {
                      border-bottom-left-radius:3px; border-bottom-right-radius:3px; }
.text-muted         { color:rgb(119,119,119); outline-color:rgb(119,119,119); }
```

Measured checkpoints: `h3` `366,564.2 1110×26.4` · `.row` `351,600.6 1140×178` · `.col-md-12 panel` `351,600.6 1140×158` · Add Admin User button `367,601.6 128.961×34` · `.table-responsive` `367,660.6 1108×97` (with `margin-top:15px`) · thead `60.5` tall · tbody `36.5` tall · empty-state `td` `367,721.1 1108×36.5`, `#777` text, centred.

---

## 9. Honest gaps

1. **Zero admin-user rows exist**, so the rendered row template is entirely unknown: what the `Added` column formats (a date? a relative time?), and what the `Actions` column contains (edit? delete? permissions?) are **not in the evidence**. Any rebuilt row body would be invention — drive it from real data or show the honest empty state.
2. **`adminUser.perms` has no UI** anywhere in the 882 nodes. The `Cancel` handler resets `perms:{}`, proving the field exists in the model, but no control for it was captured. Honest gap.
3. **The add-admin-user panel has zero layout evidence** (all 19 nodes `rect 0×0`). Its `100%`-wide inputs, `15px` group gaps and panel padding are computed values, not measured boxes.
4. **`.btn-secondary` is a Bootstrap 4 class on a Bootstrap 3 page** and therefore resolves to the browser default grey (`rgb(239,239,239)`). This is a genuine reference defect. Reproducing it exactly means shipping an unstyled grey button; the rebuild CSS above mirrors the resolved values so the diff stays clean, but the correct fix is `.btn-default`.
5. **No hover / focus / `:invalid` styling** was captured for any control here, and `.table-hover` cannot be verified with a single non-data row.
6. **The corner-radius asymmetry** (`0/0/3px/3px` on this table vs `3px`×4 on the Sessions table) is recorded as measured; the CSS rule causing it is in the uncaptured 2290-rule `styles.css`.
7. **`border-collapse` / `border-spacing` are not in the dump**; `separate` / `0` are asserted from the single-line 1px borders plus corner radii and must be confirmed against a rebuilt screenshot.
8. **`label` elements have no `for`, inputs have no `id`.** Reproduced verbatim above. Adding them is a deliberate accessibility deviation from the reference.
