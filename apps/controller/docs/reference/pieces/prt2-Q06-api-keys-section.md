# prt2 — Q06 — The **API Keys** section

**Evidence base:** `/tmp/ptr-decode/prt2/caps/00-baseline-room/` (`DEFAULTS.txt`, `nodes-000.txt` … `nodes-007.txt`, 882 records, `truncated=false`).
**Page:** `https://protradingroom.com/ptrApp#/page/welcome`, `role=member`, viewport `1842×1265 @dpr2`.

> **RESOLUTION NOTE.** prt2's `DEFAULTS.txt` COMMON table is skewed by 635 Intercom emoji `<span>`s (`display:inline-table`, `visibility:hidden`, `width:30px`, `padding:5px`, `font-size:28px`, `line-height:30px`, `text-align:center`, `vertical-align:middle`, `cursor:pointer`). **All values below are RESOLVED ABSOLUTE values.**

---

## 1. Purpose

This piece decodes the **API Keys** section — the last content block on the page: its `<h3>` heading, the green "New Api key" button and the blue "API Docs" link (each in its own `.col-md-2`), and the three-column `_id` / `secret` / `Actions` table whose only row is the `colspan="3"` empty state **"No API keys yet"**. It is the **only section on the page in which every captured node renders** — there are no hidden branches at all.

## 2. Path anchor + record count

**Anchors:** `path=r.0.1.1.0.0.0.0.10` (the `h3`) and `path=r.0.1.1.0.0.0.0.11` (the `.row`) plus all descendants.

```
cd /tmp/ptr-decode/prt2/caps/00-baseline-room
awk -v RS='' -v ORS='\n\n' '/path=r\.0\.1\.1\.0\.0\.0\.0\.1(0|1)([. ]|$)/' nodes-*.txt
```

**18 records found:** `#73`, `#74`, `#85`, `#105`, `#122`, `#123`, `#152`, `#153`, `#154`, `#155`, `#179`, `#180`, `#181`, `#182`, `#213`, `#214`, `#215`, `#216`.
**All 18 render** (every one has a non-zero rect and `visibility: visible`).

Vertical extent: **y = 819.6 → y = 1029** (`h3` top → `.row` `#74` bottom = 856 + 173). y = 1029 is where the `ng-include` footer starts (Q07).

### Structural oddity worth flagging
The buttons `.row` (`#122`) is nested **inside** the `.table-responsive` (`#105`), not beside it:

```
#85  div.col-md-12.panel.pane-default        351, 856  1140 × 153
 └── #105 div.table-responsive               367, 857  1108 × 151
      ├── #122 div.row[style="margin-bottom: 10px"]  352, 857  1138 × 44
      │    ├── #152 div.col-md-2   352,   857  189.664 × 44  →  #179 button "New Api key"
      │    └── #153 div.col-md-2   541.7, 857  189.664 × 44  →  #180 a "API Docs"
      └── #123 table               367, 911  1108 × 97
```
Because `.row` carries `margin: 0 -15px`, `#122` starts at **x = 352**, i.e. **15px to the LEFT of its `.table-responsive` parent (x = 367)** and 1138px wide inside a 1108px box — it overhangs by 15px on each side. `.table-responsive` has `overflow-x: auto`, so this row is technically inside a scroll container it overflows. Reproduce the geometry exactly; do not "tidy" it.

---

## 3. Node table

| # | path | tag | id | class (verbatim) | x | y | w | h | renders? |
|---|---|---|---|---|---|---|---|---|---|
| 73 | `r.0.1.1.0.0.0.0.10` | `h3` | — | *(no attributes at all)* | 366 | 819.6 | 1110 | 26.3984 | **yes** |
| 74 | `r.0.1.1.0.0.0.0.11` | `div` | — | `row` | 351 | 856 | 1140 | 173 | **yes** |
| 85 | `…11.0` | `div` | — | `col-md-12 panel pane-default` | 351 | 856 | 1140 | 153 | **yes** |
| 105 | `…11.0.0` | `div` | — | `table-responsive` | 367 | 857 | 1108 | 151 | **yes** |
| 122 | `…11.0.0.0` | `div` | — | `row` | 352 | 857 | 1138 | 44 | **yes** |
| 152 | `…11.0.0.0.0` | `div` | — | `col-md-2` | 352 | 857 | 189.664 | 44 | **yes** |
| 179 | `…11.0.0.0.0.0` | `button` | — | `btn btn btn-success mb` | 367 | 857 | 104.289 | 34 | **yes** |
| 153 | `…11.0.0.0.1` | `div` | — | `col-md-2` | 541.7 | 857 | 189.664 | 44 | **yes** |
| 180 | `…11.0.0.0.1.0` | `a` | — | `btn btn-primary mb` | 556.7 | 857 | 84.0781 | 34 | **yes** |
| 123 | `…11.0.0.1` | `table` | — | `table table-striped table-bordered table-hover` | 367 | 911 | 1108 | 97 | **yes** |
| 154 | `…11.0.0.1.0` | `thead` | — | *(none)* | 367 | 911 | 1108 | 60.5 | **yes** |
| 181 | `…11.0.0.1.0.0` | `tr` | — | *(none)* | 367 | 911 | 1108 | 60.5 | **yes** |
| 213 | `…11.0.0.1.0.0.0` | `th` | — | *(no class)* | 367 | 911 | 244.773 | 60.5 | **yes** — `_id` |
| 214 | `…11.0.0.1.0.0.1` | `th` | — | *(no class)* | 611.8 | 911 | 403.141 | 60.5 | **yes** — `secret` |
| 215 | `…11.0.0.1.0.0.2` | `th` | — | `text-center` | 1014.9 | 911 | 460.086 | 60.5 | **yes** — `Actions` |
| 155 | `…11.0.0.1.1` | `tbody` | — | *(none)* | 367 | 971.5 | 1108 | 36.5 | **yes** |
| 182 | `…11.0.0.1.1.0` | `tr` | — | *(no class)* | 367 | 971.5 | 1108 | 36.5 | **yes** |
| 216 | `…11.0.0.1.1.0.0` | `td` | — | `text-center text-muted` | 367 | 971.5 | 1108 | 36.5 | **yes** — the empty state |

Column geometry (sums to 1108.0): `_id 367 → 244.773` · `secret 611.773 → 403.141` · `Actions 1014.914 → 460.086`.

---

## 4. The empty state is correctly wired

| # | element | binding | class | resolved `display` | rect |
|---|---|---|---|---|---|
| 182 | `<tr>` | `ng-show = "!apiKeys \|\| apiKeys.length===0"` | *(no `ng-hide` added)* | **`table-row`** | `367, 971.5 → 1108 × 36.5` |
| 216 | `<td colspan="3" class="text-center text-muted">` | — | — | **`table-cell`** | `367, 971.5 → 1108 × 36.5` |

Like Q05 and unlike Q04, the guard uses **`.length===0`**, so the empty state renders correctly: **"No API keys yet" in `rgb(119,119,119)`, centred across all 1108px, on a `rgb(249,249,249)` striped row.**

`apiKeys` is falsy or empty. Nothing in this section is hidden — there is no add-key panel; the "New Api key" button calls `createApiKey()` directly with no form.

---

## 5. Every attribute, verbatim

### `#73` `<h3>`
```
attrs: (none)
text: "API Keys"
```

### `#74` `<div class="row">`
```
class = "row"
::before / ::after : content "\" \"" (U+0022 U+0020 U+0022); color rgb(51,51,51); font "Helvetica Neue", Helvetica, Arial, sans-serif; font-size 14px; background-color rgba(0,0,0,0)
```

### `#85` `<div class="col-md-12 panel pane-default">`
```
class = "col-md-12 panel pane-default"
```
(⚠️ `pane-default`, not `panel-default` — the same reference typo as in Q03/Q04/Q05.)

### `#105` `<div class="table-responsive">`
```
class = "table-responsive"
```
(No inline `style` here — contrast Q05's `#104`, which has `style="margin-top: 15px"`.)

### `#122` `<div class="row" style="margin-bottom: 10px">`
```
class = "row"
style = "margin-bottom: 10px"
::before / ::after : content "\" \"" (U+0022 U+0020 U+0022); color rgb(51,51,51); font "Helvetica Neue", …; font-size 14px; background-color rgba(0,0,0,0)
```

### `#152` / `#153` `<div class="col-md-2">`
```
class = "col-md-2"      (both identical)
```

### `#179` `<button class="btn btn btn-success mb">`
```
type     = "button"
class    = "btn btn btn-success mb"     ← doubled "btn btn"
ng-click = "createApiKey()"
text     = "New Api key"
```
(Verbatim capitalisation: **"New Api key"** — lower-case `key`, mixed-case `Api`.)

### `#180` `<a class="btn btn-primary mb">`
```
type   = "button"
class  = "btn btn-primary mb"
href   = "/public/html/api-docs.html?src=/public/html/API_Documentation.md"
target = "_blank"
text   = "API Docs"
```
⚠️ `target="_blank"` with **no `rel="noopener noreferrer"`** — same omission as the Launch link in Q03, though here the URL carries no credential. `type="button"` on an `<a>` is inert.

### `#123` `<table>`, `#154` `<thead>`, `#181` `<tr>`, `#155` `<tbody>`
```
#123  class = "table table-striped table-bordered table-hover"
#154  attrs: (none)
#181  attrs: (none)
#155  attrs: (none)
```

### `#213`–`#215` — header cells
```
#213  attrs: (none)             text = "_id"
#214  attrs: (none)             text = "secret"
#215  class = "text-center"     text = "Actions"
```
> **The two data headers are raw MongoDB field names — `_id` and `secret` — surfaced verbatim to the end user.** Not sortable (no `ng-click` anywhere in this thead). Flag for the rebuild: showing a column literally headed `secret` implies API secrets are rendered in plain text once keys exist.

### `#182` `<tr>` — empty-state row
```
ng-show = "!apiKeys || apiKeys.length===0"
```
(No `class` attribute at all — proving Angular did not add `ng-hide`.)

### `#216` `<td>` — empty-state cell
```
colspan = "3"
class   = "text-center text-muted"
text    = "No API keys yet"
```

---

## 6. Resolved computed style — all 18 rendering nodes

### `#73` `h3` "API Keys"
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

### `#74` `div.row` (outer)
`display:block` · `visible` · `static` · `float:none` · `width:1140px` `height:173px` · **margin `0 / -15px / 0 / -15px`** · padding `0`×4 · border `0px none rgb(51,51,51)`×4 · radius `0px`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto` · clearfix pseudos.

### `#85` `div.col-md-12.panel.pane-default`
`display:block` · `visible` · **`position:relative`** inset `0/0/0/0` · **`float:left`** · **`width:1140px` `height:153px` `min-height:1px`** · margin `0 / 0 / **20px** / 0` · **padding `0 / 15px / 0 / 15px`** · border-width `1px`×4 / style `solid`×4 / **colour `rgba(0, 0, 0, 0)`**×4 · **radius `4px`**×4 · **bg `rgb(255, 255, 255)`** · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · **box-shadow `rgba(0, 0, 0, 0.05) 0px 1px 1px 0px`** · cursor `auto`.

### `#105` `div.table-responsive`
`display:block` · `visible` · `static` · **`width:1108px` `height:151px`, `max-width:100%`, `min-height:0.01%`** · margin `0`×4 · padding `0`×4 · border `0px none rgb(51,51,51)`×4 · radius `0px`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · **overflow-x/-y `auto`/`auto`** · opacity `1` · box-shadow `none` · cursor `auto`.

### `#122` `div.row[style="margin-bottom: 10px"]`
`display:block` · `visible` · `static` · `float:none` · **`width:1138px` `height:44px`** · **margin `0 / -15px / 10px / -15px`** · padding `0`×4 · border `0px none rgb(51,51,51)`×4 · radius `0px`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto` · clearfix pseudos.
(Width 1138 = 1108 + 15 + 15. Left edge 352 = 367 − 15. Height 44 = 34 button + 10 `.mb` margin.)

### `#152` / `#153` `div.col-md-2` — identical except x
`display:block` · `visible` · **`position:relative`** inset `0/0/0/0` · **`float:left`** · **`width:189.664px` `height:44px` `min-height:1px`** · margin `0`×4 · **padding `0 / 15px / 0 / 15px`** · border `0px none rgb(51,51,51)`×4 · radius `0px`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.
(`.col-md-2` = 1/6 of 1138 = 189.667 ✔ — the row is 1138 wide, not 1140, because of the nesting described in §2.)

### `#179` `button.btn.btn.btn-success.mb` — "New Api key"
| prop | value |
|---|---|
| display / visibility | `inline-block` / `visible` |
| position / float | `static` / `none` |
| width / height | `104.289px` / `34px` |
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

### `#180` `a.btn.btn-primary.mb` — "API Docs"
Identical to `#179` except **`width: 84.0781px`**, **`background-color: rgb(51, 122, 183)`**, **`border-colour: rgb(46, 109, 164)`**×4, `x = 556.7`.

### `#123` `table.table.table-striped.table-bordered.table-hover`
`display:table` · `visible` · `static` · **`width:1108px` `height:97px`, `max-width:100%`** · margin `0`×4 · padding `0`×4 · border-width `0`×4 / style `none`×4 / colour `rgb(51,51,51)`×4 · **radius: top-left `0`, top-right `0`, bottom-left `3px`, bottom-right `3px`** · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.

### `#154` `thead` / `#155` `tbody`
| prop | `#154` | `#155` |
|---|---|---|
| display | `table-header-group` | `table-row-group` |
| visibility | `visible` | `visible` |
| width / height | `1108px` / `60.5px` | `1108px` / `36.5px` |
| rect y | `911` | `971.5` |
| margin / padding | `0`×4 / `0`×4 | `0`×4 / `0`×4 |
| border / radius | `0px none rgb(51,51,51)` / `0px`×4 | same |
| bg / color | `rgba(0,0,0,0)` / `rgb(51,51,51)` | same |
| font / line-height | Helvetica `14px` `400` / `20px` | same |
| text-align / vertical-align | `start` / `middle` | `start` / `middle` |
| cursor | `auto` | `auto` |

### `#181` `tr` (header row)
`display:table-row` · `visible` · `width:1108px` `height:60.5px` · margin/padding `0`×4 · border `0px none rgb(51,51,51)`×4 · **radius `0px`×4** · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `middle` · cursor `auto`.

### `#182` `tr` (empty-state row)
`display:table-row` · `visible` · `width:1108px` `height:36.5px` · margin/padding `0`×4 · border `0px none rgb(51,51,51)`×4 · **radius: top `0`, bottom-left `3px`, bottom-right `3px`** · **background-color `rgb(249, 249, 249)`** ← `.table-striped` stripe · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `middle` · cursor `auto`.

### Header cells `#213`–`#215`
Common: `display:table-cell` · `visible` · height `60.5px` · margin `0`×4 · **padding `20px / 8px / 20px / 8px`** · border-top/bottom `0px none` · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px` / **`700`** / `20px` · letter-spacing `normal` · **vertical-align `bottom`** · white-space `normal` · **radius `0px`×4** · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.

| # | text | width | border-left | border-right | text-align |
|---|---|---|---|---|---|
| 213 | `_id` | `244.773px` | `0px none` | **`1px solid rgb(221,221,221)`** | **`left`** |
| 214 | `secret` | `403.141px` | **`1px solid rgb(221,221,221)`** | **`1px solid rgb(221,221,221)`** | **`left`** |
| 215 | `Actions` | `460.086px` | **`1px solid rgb(221,221,221)`** | `0px none` | **`center`** |

### `#216` `td[colspan="3"].text-center.text-muted` — "No API keys yet"
| prop | value |
|---|---|
| display / visibility | `table-cell` / `visible` |
| **width / height** | **`1108px` / `36.5px`** (spans all three columns) |
| margin T/R/B/L | `0px`×4 |
| **padding T/R/B/L** | **`8px / 8px / 8px / 8px`** |
| **border-top** | **`1px solid rgb(221, 221, 221)`** |
| border-right / bottom / left | `0px none rgb(119,119,119)` |
| **radius** | top-left `0`, top-right `0`, **bottom-left `3px`, bottom-right `3px`** |
| background-color | `rgba(0, 0, 0, 0)` (stripe comes from `#182`) |
| **color** | **`rgb(119, 119, 119)`** |
| font-family / size / weight | `"Helvetica Neue", …` / `14px` / `400` |
| line-height | `20px` |
| letter-spacing | `normal` |
| **text-align** | **`center`** |
| **vertical-align** | **`top`** |
| white-space / overflow / opacity / box-shadow / cursor | `normal` / `visible` / `1` / `none` / `auto` |
| outline-color | `rgb(119, 119, 119)` |

---

## 7. Verbatim text (every string, with path)

| path | element | text (verbatim) | renders? |
|---|---|---|---|
| `r.0.1.1.0.0.0.0.10` | `h3` | `API Keys` | **yes** |
| `…11.0.0.0.0.0` | `button.btn-success` | `New Api key` | **yes** |
| `…11.0.0.0.1.0` | `a.btn-primary` | `API Docs` | **yes** |
| `…11.0.0.1.0.0.0` | `th` | `_id` | **yes** |
| `…11.0.0.1.0.0.1` | `th` | `secret` | **yes** |
| `…11.0.0.1.0.0.2` | `th.text-center` | `Actions` | **yes** |
| `…11.0.0.1.1.0.0` | `td[colspan="3"]` | `No API keys yet` | **yes** |

**Every string in this section renders. No truncation** — longest text is 15 chars (cap 250); longest attribute value is `#180`'s `href` at 63 chars (cap 300).

---

## 8. Rebuild spec (pixel-for-pixel)

```html
<h3>API Keys</h3>

<div class="row">
  <div class="col-md-12 panel pane-default">
    <div class="table-responsive">

      <!-- NOTE: this .row is nested INSIDE .table-responsive in the reference. -->
      <div class="row" style="margin-bottom:10px">
        <div class="col-md-2">
          <button type="button" class="btn btn-success mb" on:click={createApiKey}>New Api key</button>
        </div>
        <div class="col-md-2">
          <a class="btn btn-primary mb" target="_blank" rel="noopener noreferrer"
             href="/public/html/api-docs.html?src=/public/html/API_Documentation.md">API Docs</a>
        </div>
      </div>

      <table class="table table-striped table-bordered table-hover">
        <thead>
          <tr><th>_id</th><th>secret</th><th class="text-center">Actions</th></tr>
        </thead>
        <tbody>
          {#if !apiKeys || apiKeys.length === 0}
            <tr><td colspan="3" class="text-center text-muted">No API keys yet</td></tr>
          {:else}
            {#each apiKeys as k}<tr>…</tr>{/each}
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

.row                { display:block; margin:0 -15px; padding:0; }
.row::before,.row::after { content:" "; display:table; } .row::after { clear:both; }
.col-md-12          { position:relative; float:left; width:1140px;   min-height:1px; padding:0 15px; }
.col-md-2           { position:relative; float:left; width:189.664px;min-height:1px; padding:0 15px; }

.panel.pane-default { margin:0 0 20px; border:1px solid rgba(0,0,0,0); border-radius:4px;
                      background:#fff; box-shadow:rgba(0,0,0,.05) 0 1px 1px 0; }

.table-responsive   { display:block; width:1108px; max-width:100%; min-height:.01%;
                      overflow-x:auto; overflow-y:auto; }
/* the nested buttons row: 1138px wide, overhanging the 1108px parent by 15px each side */
.table-responsive > .row { width:1138px; height:44px; margin:0 -15px 10px; }

.btn                { display:inline-block; margin:0; padding:6px 12px; border:1px solid transparent;
                      border-radius:4px; font:400 14px/20px "Helvetica Neue",Helvetica,Arial,sans-serif;
                      text-align:center; vertical-align:middle; white-space:nowrap;
                      cursor:pointer; user-select:none; }
.btn-success        { background:rgb(92,184,92);  border-color:rgb(76,174,76);  color:#fff; outline-color:#fff; }
.btn-primary        { background:rgb(51,122,183); border-color:rgb(46,109,164); color:#fff; outline-color:#fff; }
.mb                 { margin-bottom:10px; }

table.table         { display:table; width:1108px; height:97px; max-width:100%; margin:0; padding:0;
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
table.table > thead > tr > th:nth-child(1){width:244.773px}
table.table > thead > tr > th:nth-child(2){width:403.141px}
table.table > thead > tr > th:nth-child(3){width:460.086px}

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

Measured checkpoints: `h3` `366,819.6 1110×26.4` · outer `.row` `351,856 1140×173` · panel `351,856 1140×153` · `.table-responsive` `367,857 1108×151` · nested `.row` **`352,857 1138×44`** · New Api key `367,857 104.289×34` · API Docs `556.7,857 84.078×34` · table `367,911 1108×97` · thead `60.5` tall · tbody `36.5` tall · empty-state `td` `367,971.5 1108×36.5`, centred, `rgb(119,119,119)`.

---

## 9. 2026-08-02 populated-row source audit

The baseline capture above had no keys, so it could not prove the populated row.
That gap was closed by fetching the public template and controller bundle used by
the same original application:

| Original asset | Bytes | SHA-256 |
|---|---:|---|
| `https://protradingroom.com/public/app/views/page.welcome.html` | 94,152 | `b4faa02ee4698b2eb66e280e6caa890054b4b49f5e1d482ae54fb3e26918964b` |
| `https://protradingroom.com/public/dist/app.min.js?v=2.18.100` | 454,912 | `340b376e42ac7169a8f9198edf46b748d628b90af0755c72f63210e0e3bf6580` |

The original row template is unambiguous:

```html
<tr ng-repeat="k in apiKeys">
  <td>{{k._id}}
    <i class="fa fa-lock text-warning" title="Restricted"
       ng-show="(k.restrictToSessions && k.restrictToSessions.length) ||
                (k.restrictToEndpoints && k.restrictToEndpoints.length)"></i>
  </td>
  <td>{{k.apiSecret}}</td>
  <td class="text-center">
    <label><a href="" ng-click="rotateApiKey(k._id)">regen secret</a></label>
    &nbsp; | &nbsp;
    <label><a href="" ng-click="manageApiKeyRestrictions(k)">restrictions</a></label>
    &nbsp; | &nbsp;
    <label><a href="" ng-click="deleteApiKey(k._id)">delete</a></label>
  </td>
</tr>
```

This proves all of the following:

- `_id` and `secret` are left-aligned. Neither cell has `text-center`.
- Only the `Actions` header and populated action cell are centered.
- The complete `k.apiSecret` value is rendered directly. There is no masking,
  last-four transform, ellipsis, reveal control, copy control, or success
  paragraph in the original frontend.
- The three actions and both `&nbsp; | &nbsp;` separators are literal source.
- A restricted key adds the yellow lock to the `_id` cell.

The exact responsive cascade is also intentional:

- `.panel > .table-responsive { max-width:100%; overflow:auto }` wins at every
  width.
- Below `768px`, Bootstrap additionally applies `white-space:nowrap` to every
  responsive-table cell.
- The table uses automatic column layout. No original rule adds `word-break`,
  `overflow-wrap`, truncation, an ellipsis, a fixed secret-column width, or
  whole-table centering.
- Consequently, an unbroken key wider than the available panel produces a
  horizontal scrollbar. That is the original responsive behavior, not a
  centering failure.

`pnpm account:responsive` now asserts all six header/data-cell alignments plus
the wrapper overflow and grid reflow against the reconstructed original at
320, 479, 480, 767, 768, 991, 992, 1199, 1200, and 1989 CSS pixels. The current
result is **500/500 comparisons within 0.22 CSS px**; the tolerance covers only
the documented accumulated rounding from serialized CSSOM percentages.

## 10. Honest gaps

1. **The original account-key generation format remains unknowable from the
   public frontend.** `createApiKey()` and `rotateApiKey()` send no random value,
   length, alphabet, or format; the backend returns `apiSecret`. A captured
   UUID-shaped value is one sample, not a universal contract. The rebuild's
   64-character lowercase hexadecimal secret is a local security choice and can
   be wider than that sample.
2. **`createApiKey()` has no confirmation UI in this capture** — the green button
   appears to mint a key on a single click, with no modal captured anywhere in
   the 882 nodes.
3. **The nested `.row` inside `.table-responsive`** produces a 1138px box inside
   a 1108px `overflow:auto` container. It is deliberately reproduced rather than
   “tidied.”
4. **No hover / focus / active styling** was captured for either button, and
   `.table-hover` cannot be verified with a single non-data row; those states are
   reconstructed from the original stylesheet cascade and tested separately.
