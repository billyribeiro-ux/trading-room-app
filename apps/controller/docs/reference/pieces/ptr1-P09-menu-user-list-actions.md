# P09 — Top-level dropdown M1: "User List Actions"

**Evidence used (both views, read in full, line by line):**

| View | Path | What it gives |
|---|---|---|
| OPEN (real geometry) | `/tmp/ptr-decode/ptr1/caps/02-dropdown_dropdown-menu.show/nodes-000.txt` (28/28 records, `truncated=false`) + `.../DEFAULTS.txt` + `.../INFO.txt` | the `<ul.dropdown-menu.show>` subtree re-rooted at `path=r`, laid out |
| CLOSED (true page position) | `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-*.txt` records `#457`, `#1293`, `#1294`, `#1518`, `#1519`–`#1528`, `#1651`–`#1659`, `#1735`–`#1742` + `.../DEFAULTS.txt` | where it lives in the page, and the closed-state style |

Both captures: viewport `{"w":1842,"h":1265,"dpr":2}`, `themeClass "footer-hidden"`, `cssVars {"root":{},"body":{}}` (i.e. **no CSS custom properties** — verified in `00-baseline-room/INFO.txt` and `02-…/INFO.txt`). No `display:flex`, `display:grid`, `grid-template-columns` other than `none` appears on any node of either capture (`DEFAULTS.txt`: `flex | 0 1 auto | 28/28 | 1`, `grid-template-columns | none | 28/28 | 1`) — this is float/table Bootstrap 3.

**All computed values below are RESOLVED ABSOLUTE values**: each capture's own `DEFAULTS.txt` COMMON table overridden by that node's printed `style-deviations`.

---

## 1. Purpose

A Bootstrap-3 `.dropdown` in the top-right of the "users" panel that filters which cohort of users the admin user-list shows (free trials, banned, mobile, non-mobile, presenters, marketplace). Below a divider it holds three destructive bulk actions that strip users or badges out of the current list.

---

## 2. Trigger

### 2.1 Positioning container (the `.dropdown` wrapper)

Baseline `#457`, `path=r.0.1.1.0.1.3.1.0.0.0.0.3` — `<div>`

* `attr class = "dropdown"`
* `attr style = "display: inline-block; vertical-align: middle;"` (inline style, verbatim)
* rect: **x=1230.7 y=405 w=148.1 h=44**
* No `ng-*` attributes on this node (record prints exactly the two attrs above).
* It is the **4th and last child** (index `.3`) of `#200 path=r.0.1.1.0.1.3.1.0.0.0.0` `<div class="col-sm-4 pull-right">` rect `x=1215.7 y=361 w=589.3 h=88`, `float: right`, `padding-left/right: 15px`. Its three preceding siblings are:
  * `#454 …0.0.0.0.0` `<button class="btn btn-md btn-info mt" ng-click="doInvite()">` text `"Add User / Invite"`, rect x=1230.7 y=371 w=150.6 h=34
  * `#455 …0.0.0.0.1` `<button class="btn btn-md btn-info mt" ng-click="exportListToCSV()">` text `"Export"`, rect x=1385.2 y=371 w=83.1 h=34
  * `#456 …0.0.0.0.2` `<button class="btn btn-md btn-primary mt" ng-click="loadUsers()">` text `"Load / Reload Users"`, rect x=1472.2 y=371 w=174.1 h=34
* Ancestor chain (baseline): `#1 r.0 div.app-container.ng-scope` → `#15 r.0.1 div.ng-fluid.ng-scope` → `#22 r.0.1.1 div.ng-fadeOutZoom.ng-fluid.ng-scope` → `#26 r.0.1.1.0 div.panel.panel-default` (x=0 y=50 w=1842 h=772.8) → `#31 …0.1 div.panel-body` → `#41 …0.1.3 div.ng-isolate-scope` → `#61 …3.1 div.tab-content` → `#97 …3.1.0 div.tab-pane.ng-scope.active` (`ng-repeat="tab in tabs"`) → `#137 …1.0.0 fieldset.ng-scope` → `#171 …0.0.0 div.form-group ` (rect h=0, float-collapsed) → `#200 div.col-sm-4.pull-right` → `#457`.

Resolved computed style of `#457` (baseline COMMON + its 9 deviations):

| prop | value |
|---|---|
| display | `inline-block` |
| position | `relative` |
| top / right / bottom / left | `0px` / `0px` / `0px` / `0px` |
| z-index | `auto` |
| float | `none` |
| box-sizing | `border-box` |
| width / height | `148.094px` / `44px` |
| min-width / max-width / min-height / max-height | `0px` / `none` / `0px` / `none` |
| margin T/R/B/L | `0px` / `0px` / `0px` / `0px` |
| padding T/R/B/L | `0px` / `0px` / `0px` / `0px` |
| border width T/R/B/L | `0px` ×4 |
| border style T/R/B/L | `none` ×4 |
| border colour T/R/B/L | `rgb(51, 51, 51)` ×4 |
| radius TL/TR/BL/BR | `0px` ×4 |
| background-color / background-image | `rgba(0, 0, 0, 0)` / `none` |
| color | `rgb(51, 51, 51)` |
| font-family | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| font-size / font-weight / font-style | `14px` / `400` / `normal` |
| line-height | `20px` |
| text-align | `start` |
| white-space | `normal` |
| overflow-x / overflow-y | `visible` / `visible` |
| opacity | `1` |
| box-shadow | `none` |
| cursor | `auto` |
| vertical-align | `middle` |
| transform | `none` |
| transition-property / -duration | `all` / `0s` |

### 2.2 The button that opens it

Baseline `#1293`, `path=r.0.1.1.0.1.3.1.0.0.0.0.3.0` — `<button>`

* `attr class = "btn btn-md dropdown-toggle btn-primary mt"`
* `attr data-toggle = "dropdown"`  ← **the open mechanism (Bootstrap 3 JS), there is no `ng-click` on this node**
* `attr aria-haspopup = "true"`
* `attr aria-expanded = "false"` (closed state as captured)
* `text: "User List Actions"`
* rect: **x=1230.7 y=415 w=148.1 h=34**

Resolved computed style of `#1293` (baseline COMMON + its 32 deviations):

| prop | value |
|---|---|
| display | `inline-block` |
| position | `static` |
| top / right / bottom / left | `auto` ×4 |
| z-index | `auto` |
| float | `none` |
| box-sizing | `border-box` |
| width / height | `148.094px` / `34px` |
| margin T/R/B/L | `10px` / `0px` / `0px` / `0px` |
| padding T/R/B/L | `6px` / `12px` / `6px` / `12px` |
| border width T/R/B/L | `1px` ×4 |
| border style T/R/B/L | `solid` ×4 |
| border colour T/R/B/L | `rgb(46, 109, 164)` ×4 |
| radius TL/TR/BL/BR | `4px` ×4 |
| background-color / background-image | `rgb(51, 122, 183)` / `none` |
| color | `rgb(255, 255, 255)` |
| font-family | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| font-size / font-weight / font-style | `14px` / `400` / `normal` |
| line-height | `20px` |
| text-align | `center` |
| white-space | `nowrap` |
| vertical-align | `middle` |
| overflow-x / overflow-y | `visible` / `visible` |
| opacity | `1` |
| box-shadow | `none` |
| outline-style / -width / -color | `none` / `3px` / `rgb(255, 255, 255)` |
| cursor | `pointer` |
| user-select | `none` |
| transform | `none` |
| transition-property / -duration | `all` / `0s` |

Container height check: `34px` (button) + `10px` (button `margin-top`) = `44px` = `#457` height. ✔

### 2.3 The caret inside the button

Baseline `#1518`, `path=r.0.1.1.0.1.3.1.0.0.0.0.3.0.0` — `<span class="caret">`, rect **x=1357.8 y=431.4 w=8 h=4**.
Resolved: `display: inline-block`, `width: 8px`, `height: 4px`, `border-top-width: 4px`, `border-right-width: 4px`, `border-left-width: 4px`, `border-bottom-width: 0px` (COMMON), `border-top-style: dashed`, `border-right-style: solid`, `border-left-style: solid`, `border-bottom-style: none` (COMMON), `border-top-color: rgb(255, 255, 255)`, `border-right-color: rgba(0, 0, 0, 0)`, `border-bottom-color: rgb(255, 255, 255)`, `border-left-color: rgba(0, 0, 0, 0)`, `color: rgb(255, 255, 255)`, `text-align: center`, `white-space: nowrap`, `vertical-align: middle`, `cursor: pointer`, `user-select: none`, `margin` all `0px`, `padding` all `0px`, `background-color: rgba(0,0,0,0)`.

---

## 3. Item list in exact DOM order

Menu = `<ul role="menu" class="dropdown-menu">` (closed: baseline `#1294 path=…3.1`; open: cap02 `#0 path=r`, which also carries `class="dropdown-menu show"` and `style="display: block;"`).

Rects below are the **open** (cap02) rects. `ng-if` / `ng-show` / `ng-hide` / `ng-model`: **none of the 10 `<li>` and none of the 9 `<a>` carry any of these four attributes** — every record's attribute block is printed in full in both captures and contains only `href` + `ng-click` (on `<a>`) or nothing (on `<li>`). Every `<a>` has `href = ""` (empty string, verbatim).

| # | `<li>` path (open / baseline node) | Divider? | `<a>` label (verbatim) | icon class | `ng-click` (verbatim) | `<a>` rect (open) | icon rect (open) |
|---|---|---|---|---|---|---|---|
| 0 | `r.0` / `#1519` | no | `Show Free Trials` | **none — this item has no `<i>` child** | `loadUsersFT()` | x=1231.7 y=457 w=198.5 h=24.6 | — |
| 1 | `r.1` / `#1520` | no | `Show BANNED` | `fa fa-ban` | `loadBannedUsers()` | x=1231.7 y=481.6 w=198.5 h=24.6 | x=1251.7 y=487.6 w=11.1 h=13 |
| 2 | `r.2` / `#1521` | no | `Show Mobile` | `fa fa-mobile` | `loadMobileUsers()` | x=1231.7 y=506.1 w=198.5 h=24.6 | x=1251.7 y=512.1 w=5.6 h=13 |
| 3 | `r.3` / `#1522` | no | `Show Non-Mobile` | `fa fa-mobile` | `loadNonMobileUsers()` | x=1231.7 y=530.7 w=198.5 h=24.6 | x=1251.7 y=536.7 w=5.6 h=13 |
| 4 | `r.4` / `#1523` | no | `Show Presenters` | `fa fa-microphone` | `loadPresentersUsers()` | x=1231.7 y=555.3 w=198.5 h=24.6 | x=1251.7 y=561.3 w=8.4 h=13 |
| 5 | `r.5` / `#1524` | no | `Marketplace Users` | `fa fa-credit-card` | `loadMarketplaceUsers()` | x=1231.7 y=579.9 w=198.5 h=24.6 | x=1251.7 y=585.9 w=13.9 h=13 |
| 6 | `r.6` / `#1525` | **YES** — `role="separator"`, `class="divider"`, no children | — | — | — | li rect x=1231.7 y=613.4 w=198.5 h=1 | — |
| 7 | `r.7` / `#1526` | no | `Remove non-presenters` | `fa fa-trash-o` | `clearUserList()` | x=1231.7 y=623.4 w=198.5 h=24.6 | x=1251.7 y=629.4 w=10.2 h=13 |
| 8 | `r.8` / `#1527` | no | `Remove Free Trials` | `fa fa-trash-o` | `removeUsersFT()` | x=1231.7 y=648 w=198.5 h=24.6 | x=1251.7 y=654 w=10.2 h=13 |
| 9 | `r.9` / `#1528` | no | `Remove All User Badges` | `fa fa-trash-o` | `removeBadgesForUsers()` | x=1231.7 y=672.6 w=198.5 h=24.6 | x=1251.7 y=678.6 w=10.2 h=13 |

Icon glyphs: each `<i>` prints `::before: {"content":"\"\"","color":"rgb(51, 51, 51)","font-family":"FontAwesome","font-size":"13px","background-color":"rgba(0, 0, 0, 0)"}`. The `content` string is captured as an **empty-looking pair of quotes** because the FontAwesome PUA codepoint did not survive the dump's JSON encoding — the glyph codepoint per item is an **honest gap** (see §8); only the class name is hard evidence.

Vertical rhythm (derived from the rects, all exact): item pitch **24.5703px**; item 5 bottom = 579.9+24.6 = 604.5, divider top = 613.4 → divider `margin-top: 9px` (604.47+9 = 613.47 ✔); divider bottom 614.47 + `margin-bottom: 9px` = 623.47 = item 7 top ✔.

---

## 4. Node table — every node in capture 02 (28/28) mapped to its baseline twin

`renders` = has a non-zero rect in that view.

| cap02 `#` | cap02 path | baseline `#` | baseline path suffix (under `r.0.1.1.0.1.3.1.0.0.0.0.3`) | tag | classes / attrs | rect (open) | renders open | renders baseline |
|---|---|---|---|---|---|---|---|---|
| 0 | `r` | 1294 | `.1` | `ul` | `role="menu"`, `class="dropdown-menu show"`, `style="display: block;"` | x=1230.7 y=451 w=200.5 h=252.1 | yes | **no** (0×0, `display:none`, class is just `dropdown-menu`) |
| 1 | `r.0` | 1519 | `.1.0` | `li` | (no attrs) | x=1231.7 y=457 w=198.5 h=24.6 | yes | no (0×0) |
| 2 | `r.1` | 1520 | `.1.1` | `li` | (no attrs) | x=1231.7 y=481.6 w=198.5 h=24.6 | yes | no |
| 3 | `r.2` | 1521 | `.1.2` | `li` | (no attrs) | x=1231.7 y=506.1 w=198.5 h=24.6 | yes | no |
| 4 | `r.3` | 1522 | `.1.3` | `li` | (no attrs) | x=1231.7 y=530.7 w=198.5 h=24.6 | yes | no |
| 5 | `r.4` | 1523 | `.1.4` | `li` | (no attrs) | x=1231.7 y=555.3 w=198.5 h=24.6 | yes | no |
| 6 | `r.5` | 1524 | `.1.5` | `li` | (no attrs) | x=1231.7 y=579.9 w=198.5 h=24.6 | yes | no |
| 7 | `r.6` | 1525 | `.1.6` | `li` | `role="separator" class="divider"` | x=1231.7 y=613.4 w=198.5 h=1 | yes | no |
| 8 | `r.7` | 1526 | `.1.7` | `li` | (no attrs) | x=1231.7 y=623.4 w=198.5 h=24.6 | yes | no |
| 9 | `r.8` | 1527 | `.1.8` | `li` | (no attrs) | x=1231.7 y=648 w=198.5 h=24.6 | yes | no |
| 10 | `r.9` | 1528 | `.1.9` | `li` | (no attrs) | x=1231.7 y=672.6 w=198.5 h=24.6 | yes | no |
| 11 | `r.0.0` | 1651 | `.1.0.0` | `a` | `href="" ng-click="loadUsersFT()"` | x=1231.7 y=457 w=198.5 h=24.6 | yes | no |
| 12 | `r.1.0` | 1652 | `.1.1.0` | `a` | `href="" ng-click="loadBannedUsers()"` | x=1231.7 y=481.6 w=198.5 h=24.6 | yes | no |
| 13 | `r.2.0` | 1653 | `.1.2.0` | `a` | `href="" ng-click="loadMobileUsers()"` | x=1231.7 y=506.1 w=198.5 h=24.6 | yes | no |
| 14 | `r.3.0` | 1654 | `.1.3.0` | `a` | `href="" ng-click="loadNonMobileUsers()"` | x=1231.7 y=530.7 w=198.5 h=24.6 | yes | no |
| 15 | `r.4.0` | 1655 | `.1.4.0` | `a` | `href="" ng-click="loadPresentersUsers()"` | x=1231.7 y=555.3 w=198.5 h=24.6 | yes | no |
| 16 | `r.5.0` | 1656 | `.1.5.0` | `a` | `href="" ng-click="loadMarketplaceUsers()"` | x=1231.7 y=579.9 w=198.5 h=24.6 | yes | no |
| 17 | `r.7.0` | 1657 | `.1.7.0` | `a` | `href="" ng-click="clearUserList()"` | x=1231.7 y=623.4 w=198.5 h=24.6 | yes | no |
| 18 | `r.8.0` | 1658 | `.1.8.0` | `a` | `href="" ng-click="removeUsersFT()"` | x=1231.7 y=648 w=198.5 h=24.6 | yes | no |
| 19 | `r.9.0` | 1659 | `.1.9.0` | `a` | `href="" ng-click="removeBadgesForUsers()"` | x=1231.7 y=672.6 w=198.5 h=24.6 | yes | no |
| 20 | `r.1.0.0` | 1735 | `.1.1.0.0` | `i` | `class="fa fa-ban"` | x=1251.7 y=487.6 w=11.1 h=13 | yes | no |
| 21 | `r.2.0.0` | 1736 | `.1.2.0.0` | `i` | `class="fa fa-mobile"` | x=1251.7 y=512.1 w=5.6 h=13 | yes | no |
| 22 | `r.3.0.0` | 1737 | `.1.3.0.0` | `i` | `class="fa fa-mobile"` | x=1251.7 y=536.7 w=5.6 h=13 | yes | no |
| 23 | `r.4.0.0` | 1738 | `.1.4.0.0` | `i` | `class="fa fa-microphone"` | x=1251.7 y=561.3 w=8.4 h=13 | yes | no |
| 24 | `r.5.0.0` | 1739 | `.1.5.0.0` | `i` | `class="fa fa-credit-card"` | x=1251.7 y=585.9 w=13.9 h=13 | yes | no |
| 25 | `r.7.0.0` | 1740 | `.1.7.0.0` | `i` | `class="fa fa-trash-o"` | x=1251.7 y=629.4 w=10.2 h=13 | yes | no |
| 26 | `r.8.0.0` | 1741 | `.1.8.0.0` | `i` | `class="fa fa-trash-o"` | x=1251.7 y=654 w=10.2 h=13 | yes | no |
| 27 | `r.9.0.0` | 1742 | `.1.9.0.0` | `i` | `class="fa fa-trash-o"` | x=1251.7 y=678.6 w=10.2 h=13 | yes | no |

Node-count reconciliation: 1 ul + 10 li + 9 a + 8 i = **28** = cap02 `node count : 28 (declared 28, truncated=false)`. Nothing is missing from this decode.
Baseline twins: `#1294` + `#1519`–`#1528` (10) + `#1651`–`#1659` (9) + `#1735`–`#1742` (8) = 28. ✔ Both views agree on structure exactly, item for item.

Trigger-side extras present in baseline only: `#457` (`div.dropdown`), `#1293` (`button`), `#1518` (`span.caret`).

---

## 5. Resolved computed style — absolute values

### 5.1 `ul.dropdown-menu` — OPEN (cap02 `#0`, COMMON + 33 deviations)

| prop | resolved value |
|---|---|
| display | `block` (also forced by inline `style="display: block;"`) |
| visibility | `visible` |
| position | `absolute` |
| top / right / bottom / left | `44px` / `-52.4297px` / `-254.133px` / `0px` |
| z-index | `1000` |
| float | `none` |
| box-sizing | `border-box` |
| width / height | `200.523px` / `252.133px` |
| min-width / max-width | `160px` / `none` |
| min-height / max-height | `0px` / `none` |
| margin T/R/B/L | `2px` / `0px` / `0px` / `0px` |
| padding T/R/B/L | `5px` / `0px` / `5px` / `0px` |
| border-width T/R/B/L | `1px` / `1px` / `1px` / `1px` |
| border-style T/R/B/L | `solid` ×4 |
| border-color T/R/B/L | `rgba(0, 0, 0, 0.15)` ×4 |
| radius TL/TR/BL/BR | `2px` / `2px` / `2px` / `2px` |
| background-color | `rgb(255, 255, 255)` |
| background-image / -position / -size / -repeat / -clip | `none` / `0% 0%` / `auto` / `repeat` / `padding-box` |
| color | `rgb(51, 51, 51)` |
| font-family | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| font-size / font-weight / font-style | `13px` / `400` / `normal` |
| line-height | `18.5714px` |
| letter-spacing | `normal` |
| text-align | `left` |
| text-transform / text-decoration-line / text-shadow / text-overflow | `none` / `none` / `none` / `clip` |
| white-space | `normal` |
| vertical-align | `baseline` |
| word-break / overflow-wrap | `normal` / `normal` |
| overflow-x / overflow-y | `visible` / `visible` |
| opacity | `1` |
| box-shadow | `rgba(0, 0, 0, 0.176) 0px 6px 12px 0px` |
| outline-style / -width / -color | `none` / `3px` / `rgb(51, 51, 51)` |
| cursor | `auto` |
| pointer-events / user-select | `auto` / `auto` |
| transition-property / -duration | `all` / `0s` |
| transform | `none` |
| filter / object-fit | `none` / `fill` |
| list-style-type | `none` |
| content / resize / appearance | `normal` / `none` / `none` |
| fill / stroke | `rgb(0, 0, 0)` / `none` |

Geometry proof that `top`/`right` are *used* values, not authored ones: authored (baseline `#1294`) is `top: 100%; left: 0px; right: auto; bottom: auto`. Container `#457` height = 44px → `100%` = **44px** ✔. Container width 148.094 − menu border-box width 200.523 = **−52.429px** = the reported `right` ✔. Container height 44 − (44 + 2 + 252.133) = **−254.133px** = the reported `bottom` ✔. Page position of the open menu: `#457.x + 0 = 1230.7` ✔ (cap02 rect x=1230.7); `#457.y + 44 + 2 = 405+46 = 451` ✔ (cap02 rect y=451).

### 5.2 `ul.dropdown-menu` — CLOSED (baseline `#1294`, baseline COMMON + 32 deviations)

Identical to §5.1 **except**:

| prop | closed value |
|---|---|
| display | `none` |
| top / right / bottom / left | `100%` / `auto` / `auto` / `0px` |
| width / height | `auto` / `auto` |
| class attribute | `dropdown-menu` (no `show`), and **no inline `style` attribute** |
| rect | `x=0 y=0 w=0 h=0` |

Everything else (z-index 1000, min-width 160px, margin-top 2px, padding 5px/0, 1px solid rgba(0,0,0,0.15), radius 2px, `rgb(255,255,255)`, `padding-box`, 13px/18.5714px, `text-align:left`, `box-shadow: rgba(0,0,0,0.176) 0px 6px 12px 0px`, `list-style-type: none`) is byte-identical between the two views. So the ONLY delta between closed and open is `display: none` → `display: block` plus the `show` class.

### 5.3 `li` (normal item) — cap02 `#1`–`#6`, `#8`–`#10`

| prop | resolved value |
|---|---|
| display | `list-item` |
| position | `static`; top/right/bottom/left `auto`; z-index `auto`; float `none` |
| box-sizing | `border-box` |
| width / height | `198.523px` / `24.5703px` |
| margin T/R/B/L | `0px` ×4 |
| padding T/R/B/L | `0px` ×4 |
| border width / style / colour | `0px` ×4 / `none` ×4 / `rgb(51, 51, 51)` ×4 |
| radius | `0px` ×4 |
| background-color / -image | `rgba(0, 0, 0, 0)` / `none` |
| color | `rgb(51, 51, 51)` |
| font-family / -size / -weight | `"Helvetica Neue", Helvetica, Arial, sans-serif` / `13px` / `400` |
| line-height | `18.5714px` |
| text-align | `left` |
| white-space | `normal` |
| overflow-x / overflow-y | `visible` / `visible` |
| opacity / box-shadow | `1` / `none` |
| cursor | `auto` |
| transform / transition | `none` / `all 0s` |
| list-style-type | `none` |

### 5.4 `li.divider` — cap02 `#7`

Same as §5.3 except:

| prop | value |
|---|---|
| height | `1px` |
| margin-top / margin-bottom | `9px` / `9px` |
| background-color | `rgb(229, 229, 229)` |
| overflow-x / overflow-y | `hidden` / `hidden` |

(width `198.523px`, `display: list-item`, `cursor: auto`, `white-space: normal` unchanged.)

### 5.5 `a` (menu item link, **resting state**) — cap02 `#11`–`#19`

| prop | resolved value |
|---|---|
| display | `block` |
| position | `static`; top/right/bottom/left `auto`; z-index `auto`; float `none` |
| box-sizing | `border-box` |
| width / height | `198.523px` / `24.5703px` |
| min-width / max-width / min-height / max-height | `0px` / `none` / `0px` / `none` |
| margin T/R/B/L | `0px` ×4 |
| **padding T/R/B/L** | **`3px` / `20px` / `3px` / `20px`** |
| border width / style / colour | `0px` ×4 / `none` ×4 / `rgb(51, 51, 51)` ×4 |
| radius | `0px` ×4 |
| background-color / -image | `rgba(0, 0, 0, 0)` / `none` |
| color | `rgb(51, 51, 51)` |
| font-family | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| font-size / font-weight / font-style | `13px` / `400` / `normal` |
| line-height | `18.5714px` |
| text-align | `left` |
| text-decoration-line | `none` |
| text-shadow / text-overflow | `none` / `clip` |
| white-space | `nowrap` |
| vertical-align | `baseline` |
| overflow-x / overflow-y | `visible` / `visible` |
| opacity / box-shadow | `1` / `none` |
| outline-style / -width / -color | `none` / `3px` / `rgb(51, 51, 51)` |
| cursor | `pointer` |
| user-select | `auto` |
| transform | `none` |
| transition-property / -duration | `all` / `0s` |
| list-style-type | `none` |

Height check: `18.5714 + 3 + 3 = 24.5714` vs reported `24.5703` (sub-pixel rounding in the layout engine). ✔

### 5.6 `i.fa` icons — cap02 `#20`–`#27`

| prop | resolved value |
|---|---|
| display | `inline-block` |
| position | `static` |
| width | per-icon: `11.1484px` (fa-ban) / `5.57812px` (fa-mobile) / `8.35938px` (fa-microphone) / `13.9297px` (fa-credit-card) / `10.2188px` (fa-trash-o) |
| height | `13px` |
| margin / padding / border | all `0px`, `none`, `rgb(51,51,51)` |
| background-color | `rgba(0, 0, 0, 0)` |
| color | `rgb(51, 51, 51)` |
| font-family | `FontAwesome` |
| font-size / font-weight / font-style | `13px` / `400` / `normal` |
| line-height | `13px` |
| text-align | `left` |
| white-space | `nowrap` |
| vertical-align | `baseline` |
| opacity | `1` |
| cursor | `pointer` |
| transform | `matrix(1, 0, 0, 1, 0, 0)` (identity — printed as a deviation from `none`) |
| `::before` | `content: ""`, `color: rgb(51, 51, 51)`, `font-family: FontAwesome`, `font-size: 13px`, `background-color: rgba(0, 0, 0, 0)` |

### 5.7 Hover / focus / active / open-trigger states

**NOT CAPTURED.** Neither `DEFAULTS.txt` nor any node record in cap02 or the baseline contains a `:hover`, `:focus`, or `:active` style block (only `::before` / `::after` pseudo blocks are ever emitted, and only where they exist). See §8.

---

## 6. Verbatim text, with paths

| path (open) | path (baseline) | string (verbatim, as printed by the dump) |
|---|---|---|
| — | `r.0.1.1.0.1.3.1.0.0.0.0.3.0` (`#1293`) | `User List Actions` |
| `r.0.0` | `…3.1.0.0` (`#1651`) | `Show Free Trials` |
| `r.1.0` | `…3.1.1.0` (`#1652`) | `Show BANNED` |
| `r.2.0` | `…3.1.2.0` (`#1653`) | `Show Mobile` |
| `r.3.0` | `…3.1.3.0` (`#1654`) | `Show Non-Mobile` |
| `r.4.0` | `…3.1.4.0` (`#1655`) | `Show Presenters` |
| `r.5.0` | `…3.1.5.0` (`#1656`) | `Marketplace Users` |
| `r.7.0` | `…3.1.7.0` (`#1657`) | `Remove non-presenters` |
| `r.8.0` | `…3.1.8.0` (`#1658`) | `Remove Free Trials` |
| `r.9.0` | `…3.1.9.0` (`#1659`) | `Remove All User Badges` |

Truncation: **none flagged.** `INFO.txt` for cap02 says `truncated=false` and `node count : 28 (declared 28)`; no string in either view ends in an ellipsis or is marked cut. All 10 strings are identical between the open and the closed capture — no conflict.

Whitespace caveat: the dump emits a node's text as a single trimmed string, so the exact separator between the `<i>` glyph and the label (almost certainly one space — see the M2 evidence in P10 where two adjacent icons sit 3.64px apart, i.e. exactly one 13px-Helvetica space) is **inferred from geometry for M2, not directly measurable here** because M1 never has two adjacent icons. Treated as a gap in §8.

---

## 7. Rebuild spec

### 7.1 HTML (exact structure, both states)

```html
<!-- 4th child of div.col-sm-4.pull-right -->
<div class="dropdown" style="display: inline-block; vertical-align: middle;">
  <button class="btn btn-md dropdown-toggle btn-primary mt"
          data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
    User List Actions <span class="caret"></span>
  </button>

  <!-- CLOSED: class="dropdown-menu", no inline style -->
  <!-- OPEN:   class="dropdown-menu show" style="display: block;" -->
  <ul role="menu" class="dropdown-menu">
    <li><a href="" ng-click="loadUsersFT()">Show Free Trials</a></li>
    <li><a href="" ng-click="loadBannedUsers()"><i class="fa fa-ban"></i> Show BANNED</a></li>
    <li><a href="" ng-click="loadMobileUsers()"><i class="fa fa-mobile"></i> Show Mobile</a></li>
    <li><a href="" ng-click="loadNonMobileUsers()"><i class="fa fa-mobile"></i> Show Non-Mobile</a></li>
    <li><a href="" ng-click="loadPresentersUsers()"><i class="fa fa-microphone"></i> Show Presenters</a></li>
    <li><a href="" ng-click="loadMarketplaceUsers()"><i class="fa fa-credit-card"></i> Marketplace Users</a></li>
    <li role="separator" class="divider"></li>
    <li><a href="" ng-click="clearUserList()"><i class="fa fa-trash-o"></i> Remove non-presenters</a></li>
    <li><a href="" ng-click="removeUsersFT()"><i class="fa fa-trash-o"></i> Remove Free Trials</a></li>
    <li><a href="" ng-click="removeBadgesForUsers()"><i class="fa fa-trash-o"></i> Remove All User Badges</a></li>
  </ul>
</div>
```

### 7.2 CSS (absolute values only; no custom properties, no flex, no grid — matching the capture)

```css
/* positioning context — resolved from baseline #457 */
.dropdown {
  display: inline-block;          /* via inline style attr */
  vertical-align: middle;         /* via inline style attr */
  position: relative;
  width: 148.094px;               /* shrink-to-fit around the button */
  height: 44px;                   /* 34px button + 10px margin-top */
  margin: 0; padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: start; white-space: normal;
  box-shadow: none; opacity: 1; cursor: auto; transform: none;
  transition: all 0s;
}

/* trigger — resolved from baseline #1293 */
.dropdown > .btn.dropdown-toggle.btn-primary.mt {
  display: inline-block;
  width: 148.094px; height: 34px;
  margin: 10px 0 0 0;
  padding: 6px 12px;
  border: 1px solid rgb(46, 109, 164);
  border-radius: 4px;
  background-color: rgb(51, 122, 183); background-image: none;
  color: rgb(255, 255, 255);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: center; white-space: nowrap; vertical-align: middle;
  box-shadow: none; opacity: 1;
  outline: none; outline-width: 3px; outline-color: rgb(255, 255, 255);
  cursor: pointer; user-select: none; transform: none; transition: all 0s;
  box-sizing: border-box;
}

/* caret — resolved from baseline #1518 */
.dropdown-toggle .caret {
  display: inline-block;
  width: 8px; height: 4px;
  margin: 0; padding: 0;
  border-top: 4px dashed rgb(255, 255, 255);
  border-right: 4px solid rgba(0, 0, 0, 0);
  border-left: 4px solid rgba(0, 0, 0, 0);
  border-bottom: 0 none rgb(255, 255, 255);
  vertical-align: middle;
  background-color: rgba(0, 0, 0, 0);
}

/* the menu — CLOSED */
.dropdown > .dropdown-menu {
  display: none;                  /* the ONLY closed/open delta */
  position: absolute;
  top: 100%;                      /* == 44px against this container */
  left: 0;
  right: auto; bottom: auto;
  z-index: 1000;
  min-width: 160px;
  margin: 2px 0 0 0;
  padding: 5px 0;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 2px;
  background-color: rgb(255, 255, 255);
  background-clip: padding-box;
  background-image: none;
  color: rgb(51, 51, 51);
  font: 400 13px/18.5714px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: left;
  white-space: normal;
  list-style-type: none;
  box-shadow: rgba(0, 0, 0, 0.176) 0 6px 12px 0;
  opacity: 1;
  overflow: visible;
  cursor: auto;
  box-sizing: border-box;
}

/* the menu — OPEN (add class `show` + inline display:block) */
.dropdown > .dropdown-menu.show { display: block; }
/* used values then resolve to exactly:
   top: 44px; right: -52.4297px; bottom: -254.133px; left: 0;
   width: 200.523px; height: 252.133px;
   page rect: x=1230.7  y=451  w=200.5  h=252.1                    */

.dropdown-menu > li {
  display: list-item;
  width: 198.523px;               /* menu 200.523 − 2×1px border */
  height: 24.5703px;
  margin: 0; padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  white-space: normal;
  list-style-type: none;
  cursor: auto;
}

.dropdown-menu > li.divider {
  height: 1px;
  margin: 9px 0;
  overflow: hidden;
  background-color: rgb(229, 229, 229);
}

.dropdown-menu > li > a {
  display: block;
  width: 198.523px; height: 24.5703px;
  margin: 0;
  padding: 3px 20px;
  border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 13px/18.5714px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: left;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: none; opacity: 1; transform: none; transition: all 0s;
  box-sizing: border-box;
}

.dropdown-menu > li > a > i.fa {
  display: inline-block;
  height: 13px;
  font-family: FontAwesome;
  font-size: 13px;
  line-height: 13px;
  color: rgb(51, 51, 51);
  vertical-align: baseline;
  transform: matrix(1, 0, 0, 1, 0, 0);
}
/* measured glyph advance widths @13px:
   .fa-ban 11.1484px | .fa-mobile 5.57812px | .fa-microphone 8.35938px
   .fa-credit-card 13.9297px | .fa-trash-o 10.2188px                    */
```

### 7.3 Absolute open-state coordinates (for a pixel diff at 1842×1265, dpr 2)

```
.dropdown container  x=1230.7  y=405    w=148.094  h=44
  button             x=1230.7  y=415    w=148.094  h=34
    span.caret       x=1357.8  y=431.4  w=8        h=4
  ul.dropdown-menu   x=1230.7  y=451    w=200.523  h=252.133
    li[0] / a[0]     x=1231.7  y=457    w=198.523  h=24.5703   (no icon)
    li[1] / a[1]     x=1231.7  y=481.6              icon x=1251.7 y=487.6 w=11.1484
    li[2] / a[2]     x=1231.7  y=506.1              icon x=1251.7 y=512.1 w=5.57812
    li[3] / a[3]     x=1231.7  y=530.7              icon x=1251.7 y=536.7 w=5.57812
    li[4] / a[4]     x=1231.7  y=555.3              icon x=1251.7 y=561.3 w=8.35938
    li[5] / a[5]     x=1231.7  y=579.9              icon x=1251.7 y=585.9 w=13.9297
    li[6] divider    x=1231.7  y=613.4  w=198.523  h=1
    li[7] / a[7]     x=1231.7  y=623.4              icon x=1251.7 y=629.4 w=10.2188
    li[8] / a[8]     x=1231.7  y=648                icon x=1251.7 y=654   w=10.2188
    li[9] / a[9]     x=1231.7  y=672.6              icon x=1251.7 y=678.6 w=10.2188
menu bottom edge = 451 + 252.133 = 703.133
```

Icon left edge 1251.7 = menu content-box left (1230.7 + 1px border) + `<a>` `padding-left: 20px` = 1231.7 + 20. ✔

---

## 8. Honest gaps

1. **Hover / focus / active / `.open` styles are not in the dump.** No `:hover` block is emitted anywhere in `02-…/nodes-000.txt` or `00-baseline-room/nodes-*.txt`. The Bootstrap-3 hover fill for `.dropdown-menu > li > a` and the pressed/`.open` variant of `.btn-primary` are therefore **unknown from this evidence** — do not assert values for them.
2. **FontAwesome glyph codepoints are lost.** Every `<i>` `::before` prints `content: ""` — the PUA character did not survive the dump's JSON escaping. Only the class names (`fa-ban`, `fa-mobile`, `fa-microphone`, `fa-credit-card`, `fa-trash-o`) are hard evidence; the exact glyph must come from the FontAwesome version in use, which is **not identified in the capture**.
3. **`fa-mobile` is used for BOTH "Show Mobile" and "Show Non-Mobile"** (cap02 `#21` and `#22`, baseline `#1736` and `#1737` — identical class, identical 5.57812px width). This is what the page does; it is not a decode error.
4. **"Show Free Trials" has no icon.** Confirmed in both views (cap02 has no node at `r.0.0.0`; baseline has no node at `…3.1.0.0.0`). Asymmetry is real, not a capture gap.
5. **Exact whitespace between icon and label is not directly measurable for M1** (no two adjacent icons in this menu to measure a space against). One space is the strong inference from the sibling menu M2; treat as inference, not evidence.
6. **`aria-expanded` in the open state is not captured.** Cap 02 is re-rooted at the `<ul>`, so the trigger button is absent from it; the only `aria-expanded` we have is the baseline's `"false"`. Whether Bootstrap flips it to `"true"` on open is **not verifiable from this dump**.
7. **No `.open` class evidence on the wrapper.** In the open capture the `<ul>` carries `class="dropdown-menu show"` + `style="display: block;"`, but because the capture is re-rooted at the `<ul>` we cannot see whether `div.dropdown` simultaneously gained `.open`. Unknown.
8. **Icon widths are advance widths of the specific FontAwesome build.** If a different FA version/subset is shipped, the 11.1484 / 5.57812 / 8.35938 / 13.9297 / 10.2188 px widths will not reproduce, and label x-offsets will drift.
9. **No screenshot was available to me in this evidence set** — this decode is from the DOM+computed-style dump only. The rule-3 "verified pixel-perfect screenshot diff" step has **not** been performed here and remains outstanding for whoever implements the rebuild.
