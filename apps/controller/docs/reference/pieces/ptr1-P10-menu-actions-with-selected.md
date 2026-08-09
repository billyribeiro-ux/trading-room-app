# P10 — Top-level dropdown M2: "Actions With Selected"

**Evidence used (both views, read in full, line by line):**

| View | Path | What it gives |
|---|---|---|
| OPEN (real geometry) | `/tmp/ptr-decode/ptr1/caps/03-dropdown_dropdown-menu.show/nodes-000.txt` (33/33 records, `truncated=false`) + `.../DEFAULTS.txt` + `.../INFO.txt` | the `<ul.dropdown-menu.show>` subtree re-rooted at `path=r`, laid out |
| CLOSED (true page position) | `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-*.txt` records `#173`, `#202`, `#203`, `#461`–`#465`, `#1295`–`#1309`, `#1529`–`#1538`, `#1660`–`#1671` + `.../DEFAULTS.txt` | where it lives in the page, and the closed-state style |

Both captures: viewport `{"w":1842,"h":1265,"dpr":2}`, `themeClass "footer-hidden"`, `cssVars {"root":{},"body":{}}` — **no CSS custom properties**. Cap03 `DEFAULTS.txt` shows `flex | 0 1 auto | 33/33 | 1` and `grid-template-columns | none | 33/33 | 1` → **no flexbox, no grid**. Float/table Bootstrap 3, confirmed not assumed.

**All computed values below are RESOLVED ABSOLUTE values** (each capture's own COMMON table overridden by that node's printed deviations).

> ⚠️ **Correction to the brief.** The brief said "9 role/state ops via `updateManyUsers(n)`". The evidence says **10 items, no dividers**: 8 of them call `updateManyUsers(n)` with n ∈ {10, 2, 1, 5, 2, 6, 3, 4} and 2 call `updateManyUsersBadgePrompt('add'|'remove')`. Also the menu `<ul>` is at path `…0.0.2.1.**2**` (third child of the `span.dropdown`), not `…2.1.1` — `…2.1.1` is a second sibling button. Both facts are cross-verified in the open and closed views.

---

## 1. Purpose

A Bootstrap-3 dropdown sitting under the "Select All / Apply to all rooms?" checkbox row that applies a single role/state mutation to every currently-checked user in one call. Eight items funnel into `updateManyUsers(n)` (remove/unban/presenter/admin/participant/trial/mute/ban); the last two open the bulk badge prompt.

---

## 2. Trigger

### 2.1 Section wrapper

Baseline `#173`, `path=r.0.1.1.0.1.3.1.0.0.2` — `<div class="users-many-actions">`, rect **x=37 y=425 w=1768 h=64**, resolved deviations: `width: 1768px`, `height: 64px`, `margin-top: 30px`; everything else baseline COMMON (`display: block`, `position: static`, margin R/B/L `0px`, padding `0px` ×4, border `0px none rgb(51,51,51)`, `background-color: rgba(0,0,0,0)`, `color: rgb(51,51,51)`, `400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif`, `text-align: start`, `cursor: auto`).

It is the **3rd of 4 children** of `#137 fieldset.ng-scope` (`r.0.1.1.0.1.3.1.0.0`, rect x=37 y=361 w=1768 h=393.8):
* `.0` `#171 div.form-group ` (x=37 y=361 w=1768 **h=0**) — holds the M1 "User List Actions" cluster (see P09)
* `.1` `#172 form.form-inline.ng-pristine.ng-valid` (x=37 y=361 w=1768 h=34)
* `.2` `#173 div.users-many-actions` ← **this piece**
* `.3` `#174 table.table.table-striped ` (x=37 y=489 w=1768 h=225.8)

Its first child, `#202 path=…0.0.2.0` `<div class="checkbox ng-scope" ng-if="completeUserList && completeUserList.length>0">` rect x=37 y=425 w=1768 h=20, `position: relative`, `margin-top: 10px`, `margin-bottom: 10px`, contains the two checkboxes that feed this menu:
* `#461 …2.0.0` `<label ng-click="getCheckedAllUserIds()">` rect x=37 y=425 w=78.3 h=20, `display:inline-block`, `min-height:20px`, `padding-left:20px`, `cursor:pointer`
  * `#1295 …2.0.0.0` `<input type="checkbox" ng-click="getCheckedAllUserIds()" ng-checked="checkedAllUsers">` rect x=37 y=429 w=13 h=13, `position:absolute`, `margin-top:4px`, `margin-left:-20px`, `appearance:auto`
  * `#1296 …2.0.0.1` `<span ng-if="!checkedAllUsers" class="ng-scope">` text **`Select All`**, rect x=57 y=426.5 w=58.3 h=16.5
* `#462 …2.0.1` `<label class="checkbox-apply-to-all-rooms">` rect x=129.2 y=425 w=140.9 h=20, `margin-left:10px`, `padding-left:20px`
  * `#1297 …2.0.1.0` `<input ng-change="toggleApplyToAllRooms()" type="checkbox" ng-model="applyToAllRooms" class="ng-pristine ng-untouched ng-valid">` rect x=129.2 y=429 w=13 h=13
  * `#1298 …2.0.1.1` `<span>` text **`Apply to all rooms?`**, rect x=149.2 y=426.5 w=120.9 h=16.5

### 2.2 Positioning container (the `.dropdown` wrapper) — it is a `<span>`, not a `<div>`

Baseline `#203`, `path=r.0.1.1.0.1.3.1.0.0.2.1` — `<span class="dropdown">`

* rect: **x=37 y=462.1 w=376.6 h=16.5**  ← an **inline** box, not the buttons' box
* No `ng-*` attributes, no inline `style` attribute.
* Resolved computed style (baseline COMMON + 6 deviations):

| prop | value |
|---|---|
| display | `inline` |
| position | `relative` |
| top / right / bottom / left | `0px` / `0px` / `0px` / `0px` |
| z-index | `auto`; float `none`; box-sizing `border-box` |
| width / height | `auto` / `auto` (COMMON; the 376.6×16.5 rect is the inline box's union) |
| margin / padding / border | `0px` ×4 / `0px` ×4 / `0px none rgb(51,51,51)` ×4 |
| radius | `0px` ×4 |
| background-color / -image | `rgba(0, 0, 0, 0)` / `none` |
| color | `rgb(51, 51, 51)` |
| font | `400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif` |
| text-align / white-space | `start` / `normal` |
| overflow | `visible` / `visible` |
| opacity / box-shadow / cursor | `1` / `none` / `auto` |
| transform / transition | `none` / `all 0s` |

**This matters for the rebuild:** because the container is `display: inline`, the abs-pos containing block is the union of its inline boxes — height **16.5px**, not the 34px button height. That is why the open menu sits at `top: 16.5px` and visually **overlaps the buttons** (menu top y=480.6 vs buttons y=455…489). This overlap is the captured reality, verified twice.

### 2.3 The button that opens it

Baseline `#463`, `path=r.0.1.1.0.1.3.1.0.0.2.1.0` — `<button>`

* `attr class = "btn dropdown-toggle btn-primary"` (note: **no `btn-md`**, unlike M1)
* `attr data-toggle = "dropdown"`  ← **the open mechanism; no `ng-click` on this node**
* `attr aria-haspopup = "true"`, `attr aria-expanded = "false"`
* `text: "Actions With Selected"`
* rect: **x=37 y=455 w=179.7 h=34**

Resolved computed style (baseline COMMON + 31 deviations):

| prop | value |
|---|---|
| display | `inline-block` |
| position | `static`; top/right/bottom/left `auto`; z-index `auto`; float `none` |
| box-sizing | `border-box` |
| width / height | `179.727px` / `34px` |
| margin T/R/B/L | `0px` ×4 (**no `margin-top: 10px` — that's M1's `mt` class, absent here**) |
| padding T/R/B/L | `6px` / `12px` / `6px` / `12px` |
| border-width / -style / -color | `1px` ×4 / `solid` ×4 / `rgb(46, 109, 164)` ×4 |
| radius | `4px` ×4 |
| background-color / -image | `rgb(51, 122, 183)` / `none` |
| color | `rgb(255, 255, 255)` |
| font | `400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif` |
| text-align / white-space / vertical-align | `center` / `nowrap` / `middle` |
| overflow | `visible` |
| opacity / box-shadow | `1` / `none` |
| outline-style / -width / -color | `none` / `3px` / `rgb(255, 255, 255)` |
| cursor / user-select | `pointer` / `none` |
| transform / transition | `none` / `all 0s` |

Caret inside it: `#1299`, `path=…2.1.0.0` — `<span class="caret">`, rect **x=195.7 y=471.4 w=8 h=4**; resolved exactly as M1's caret (`display:inline-block; width:8px; height:4px; border-top:4px dashed rgb(255,255,255); border-right:4px solid rgba(0,0,0,0); border-left:4px solid rgba(0,0,0,0); border-bottom:0 none rgb(255,255,255); color:rgb(255,255,255); vertical-align:middle; cursor:pointer; user-select:none`).

### 2.4 Sibling button (NOT a trigger — decoded so the rebuild does not misplace the menu)

Baseline `#464`, `path=r.0.1.1.0.1.3.1.0.0.2.1.1` — `<button class="btn dropdown-toggle btn-primary" ng-click="actionsWithEmailList()">`, text **`Actions With the Email List`**, rect **x=220.6 y=455 w=193 h=34**. It carries the `dropdown-toggle` class but **no `data-toggle`** — it is an ordinary Angular action button, and it is the middle child between the trigger and the `<ul>`. Same resolved style as §2.3 except `width: 193.008px`.

Inter-button gap: 220.6 − (37 + 179.727) = **3.87px** — one whitespace text node at 14px Helvetica between the two inline-blocks.
`span.dropdown` inline-box width 376.633 = 179.727 + 3.87 + 193.008 ≈ 376.6 ✔

---

## 3. Item list in exact DOM order

Menu = `<ul role="menu" class="dropdown-menu">` (closed: baseline `#465 path=…0.0.2.1.2`; open: cap03 `#0 path=r`, with `class="dropdown-menu show"` + `style="display: block;"`).

Rects are the **open** (cap03) rects. **`ng-if` / `ng-show` / `ng-hide` / `ng-model`: none present on any `<li>` or `<a>` in this menu** — every record's attribute block is printed in full in both views and contains only `href` + `ng-click` (on `<a>`) or nothing (on `<li>`). Every `<a>` has `href = ""`. **There are no `li.divider` nodes in this menu** (no `role="separator"` anywhere in cap03; the 10 `<li>` are contiguous at a constant 24.5703px pitch, which also proves no divider was dropped).

| # | `<li>` path (open / baseline) | Divider? | label (verbatim) | icon class(es), in order | `ng-click` (verbatim) | `<a>` rect (open) | icon rect(s) (open) |
|---|---|---|---|---|---|---|---|
| 0 | `r.0` / `#1300` | no | `Remove All` | `icon fa fa-trash` | `updateManyUsers(10)` | x=38 y=486.6 w=236.7 h=24.6 | x=58 y=492.6 w=10.2 h=13 |
| 1 | `r.1` / `#1301` | no | `UNBAN Participant` | `icon fa fa-user` | `updateManyUsers(2)` | x=38 y=511.2 w=236.7 h=24.6 | x=58 y=517.2 w=10.2 h=13 |
| 2 | `r.2` / `#1302` | no | `Make Presenter` | `fa fa-microphone` **+** `fa fa-desktop` | `updateManyUsers(1)` | x=38 y=535.8 w=236.7 h=24.6 | x=58 y=541.8 w=8.4 h=13 ; x=70 y=541.8 w=13.9 h=13 |
| 3 | `r.3` / `#1303` | no | `Make Admin (Non-Presenter)` | `fa fa-cog` (`aria-hidden="true"`) **+** `fa fa-user-md` | `updateManyUsers(5)` | x=38 y=560.3 w=236.7 h=24.6 | x=58 y=566.3 w=11.1 h=13 ; x=72.8 y=566.3 w=10.2 h=13 |
| 4 | `r.4` / `#1304` | no | `Make Participant` | `icon fa fa-user` | `updateManyUsers(2)` | x=38 y=584.9 w=236.7 h=24.6 | x=58 y=590.9 w=10.2 h=13 |
| 5 | `r.5` / `#1305` | no | `Make TRIAL user` | `icon fa fa-user` | `updateManyUsers(6)` | x=38 y=609.5 w=236.7 h=24.6 | x=58 y=615.5 w=10.2 h=13 |
| 6 | `r.6` / `#1306` | no | `MUTE Participant` | `fa fa-user-times` | `updateManyUsers(3)` | x=38 y=634 w=236.7 h=24.6 | x=58 y=640 w=14.9 h=13 |
| 7 | `r.7` / `#1307` | no | `BAN Participant` | `fa fa-user-times` | `updateManyUsers(4)` | x=38 y=658.6 w=236.7 h=24.6 | x=58 y=664.6 w=14.9 h=13 |
| 8 | `r.8` / `#1308` | no | `Add Badge` | `icon fa fa-user` | `updateManyUsersBadgePrompt('add')` | x=38 y=683.2 w=236.7 h=24.6 | x=58 y=689.2 w=10.2 h=13 |
| 9 | `r.9` / `#1309` | no | `Remove Badge` | `icon fa fa-user` | `updateManyUsersBadgePrompt('remove')` | x=38 y=707.8 w=236.7 h=24.6 | x=58 y=713.8 w=10.2 h=13 |

**Action-code table as captured** (this is what the DOM says; do not "fix" it):

| n | items that pass it |
|---|---|
| `1` | Make Presenter |
| `2` | **UNBAN Participant AND Make Participant** — the same code, two labels (cap03 `#12` and `#15`; baseline `#1530` and `#1533`) |
| `3` | MUTE Participant |
| `4` | BAN Participant |
| `5` | Make Admin (Non-Presenter) |
| `6` | Make TRIAL user |
| `10` | Remove All |
| — | `updateManyUsersBadgePrompt('add')` / `('remove')` for the two badge items |

Codes `7`, `8`, `9` do not appear in this menu.

**Whitespace evidence (hard, from geometry):** item 2's two icons — fa-microphone ends at 58 + 8.35938 = 66.359, fa-desktop starts at 70.0 → gap **3.64px**. Item 3 — fa-cog ends at 58 + 11.1484 = 69.148, fa-user-md starts at 72.8 → gap **3.65px**. A single space in 13px Helvetica Neue advances ≈3.61px. So icons are separated by exactly **one space character**, and by extension one space precedes each label.

---

## 4. Node table — every node in capture 03 (33/33) mapped to its baseline twin

| cap03 `#` | cap03 path | baseline `#` | baseline path | tag | classes / attrs | rect (open) | renders open | renders baseline |
|---|---|---|---|---|---|---|---|---|
| 0 | `r` | 465 | `r.0.1.1.0.1.3.1.0.0.2.1.2` | `ul` | `role="menu" class="dropdown-menu show" style="display: block;"` | x=37 y=480.6 w=238.7 h=257.7 | yes | **no** (0×0, `display:none`, class `dropdown-menu`) |
| 1 | `r.0` | 1300 | `…2.1.2.0` | `li` | (none) | x=38 y=486.6 w=236.7 h=24.6 | yes | no |
| 2 | `r.1` | 1301 | `…2.1.2.1` | `li` | (none) | x=38 y=511.2 w=236.7 h=24.6 | yes | no |
| 3 | `r.2` | 1302 | `…2.1.2.2` | `li` | (none) | x=38 y=535.8 w=236.7 h=24.6 | yes | no |
| 4 | `r.3` | 1303 | `…2.1.2.3` | `li` | (none) | x=38 y=560.3 w=236.7 h=24.6 | yes | no |
| 5 | `r.4` | 1304 | `…2.1.2.4` | `li` | (none) | x=38 y=584.9 w=236.7 h=24.6 | yes | no |
| 6 | `r.5` | 1305 | `…2.1.2.5` | `li` | (none) | x=38 y=609.5 w=236.7 h=24.6 | yes | no |
| 7 | `r.6` | 1306 | `…2.1.2.6` | `li` | (none) | x=38 y=634 w=236.7 h=24.6 | yes | no |
| 8 | `r.7` | 1307 | `…2.1.2.7` | `li` | (none) | x=38 y=658.6 w=236.7 h=24.6 | yes | no |
| 9 | `r.8` | 1308 | `…2.1.2.8` | `li` | (none) | x=38 y=683.2 w=236.7 h=24.6 | yes | no |
| 10 | `r.9` | 1309 | `…2.1.2.9` | `li` | (none) | x=38 y=707.8 w=236.7 h=24.6 | yes | no |
| 11 | `r.0.0` | 1529 | `…2.1.2.0.0` | `a` | `href="" ng-click="updateManyUsers(10)"` | x=38 y=486.6 w=236.7 h=24.6 | yes | no |
| 12 | `r.1.0` | 1530 | `…2.1.2.1.0` | `a` | `href="" ng-click="updateManyUsers(2)"` | x=38 y=511.2 w=236.7 h=24.6 | yes | no |
| 13 | `r.2.0` | 1531 | `…2.1.2.2.0` | `a` | `href="" ng-click="updateManyUsers(1)"` | x=38 y=535.8 w=236.7 h=24.6 | yes | no |
| 14 | `r.3.0` | 1532 | `…2.1.2.3.0` | `a` | `href="" ng-click="updateManyUsers(5)"` | x=38 y=560.3 w=236.7 h=24.6 | yes | no |
| 15 | `r.4.0` | 1533 | `…2.1.2.4.0` | `a` | `href="" ng-click="updateManyUsers(2)"` | x=38 y=584.9 w=236.7 h=24.6 | yes | no |
| 16 | `r.5.0` | 1534 | `…2.1.2.5.0` | `a` | `href="" ng-click="updateManyUsers(6)"` | x=38 y=609.5 w=236.7 h=24.6 | yes | no |
| 17 | `r.6.0` | 1535 | `…2.1.2.6.0` | `a` | `href="" ng-click="updateManyUsers(3)"` | x=38 y=634 w=236.7 h=24.6 | yes | no |
| 18 | `r.7.0` | 1536 | `…2.1.2.7.0` | `a` | `href="" ng-click="updateManyUsers(4)"` | x=38 y=658.6 w=236.7 h=24.6 | yes | no |
| 19 | `r.8.0` | 1537 | `…2.1.2.8.0` | `a` | `href="" ng-click="updateManyUsersBadgePrompt('add')"` | x=38 y=683.2 w=236.7 h=24.6 | yes | no |
| 20 | `r.9.0` | 1538 | `…2.1.2.9.0` | `a` | `href="" ng-click="updateManyUsersBadgePrompt('remove')"` | x=38 y=707.8 w=236.7 h=24.6 | yes | no |
| 21 | `r.0.0.0` | 1660 | `…2.1.2.0.0.0` | `i` | `class="icon fa fa-trash"` | x=58 y=492.6 w=10.2 h=13 | yes | no |
| 22 | `r.1.0.0` | 1661 | `…2.1.2.1.0.0` | `i` | `class="icon fa fa-user"` | x=58 y=517.2 w=10.2 h=13 | yes | no |
| 23 | `r.2.0.0` | 1662 | `…2.1.2.2.0.0` | `i` | `class="fa fa-microphone"` | x=58 y=541.8 w=8.4 h=13 | yes | no |
| 24 | `r.2.0.1` | 1663 | `…2.1.2.2.0.1` | `i` | `class="fa fa-desktop"` | x=70 y=541.8 w=13.9 h=13 | yes | no |
| 25 | `r.3.0.0` | 1664 | `…2.1.2.3.0.0` | `i` | `class="fa fa-cog" aria-hidden="true"` | x=58 y=566.3 w=11.1 h=13 | yes | no |
| 26 | `r.3.0.1` | 1665 | `…2.1.2.3.0.1` | `i` | `class="fa fa-user-md"` | x=72.8 y=566.3 w=10.2 h=13 | yes | no |
| 27 | `r.4.0.0` | 1666 | `…2.1.2.4.0.0` | `i` | `class="icon fa fa-user"` | x=58 y=590.9 w=10.2 h=13 | yes | no |
| 28 | `r.5.0.0` | 1667 | `…2.1.2.5.0.0` | `i` | `class="icon fa fa-user"` | x=58 y=615.5 w=10.2 h=13 | yes | no |
| 29 | `r.6.0.0` | 1668 | `…2.1.2.6.0.0` | `i` | `class="fa fa-user-times"` | x=58 y=640 w=14.9 h=13 | yes | no |
| 30 | `r.7.0.0` | 1669 | `…2.1.2.7.0.0` | `i` | `class="fa fa-user-times"` | x=58 y=664.6 w=14.9 h=13 | yes | no |
| 31 | `r.8.0.0` | 1670 | `…2.1.2.8.0.0` | `i` | `class="icon fa fa-user"` | x=58 y=689.2 w=10.2 h=13 | yes | no |
| 32 | `r.9.0.0` | 1671 | `…2.1.2.9.0.0` | `i` | `class="icon fa fa-user"` | x=58 y=713.8 w=10.2 h=13 | yes | no |

Reconciliation: 1 ul + 10 li + 10 a + 12 i = **33** = cap03 `node count : 33 (declared 33, truncated=false)`.
Baseline twins: `#465` + `#1300`–`#1309` (10) + `#1529`–`#1538` (10) + `#1660`–`#1671` (12) = 33. ✔ Structures agree exactly.

Trigger-side extras present only in the baseline: `#173`, `#202`, `#203`, `#461`, `#462`, `#463`, `#464`, `#1295`–`#1299`.

---

## 5. Resolved computed style — absolute values

### 5.1 `ul.dropdown-menu` — OPEN (cap03 `#0`, COMMON + 34 deviations)

| prop | resolved value |
|---|---|
| display | `block` (deviation from cap03 COMMON `inline-block`; also forced by `style="display: block;"`) |
| visibility | `visible` |
| position | `absolute` |
| top / right / bottom / left | `16.5px` / `137.953px` / `-259.703px` / `0px` |
| z-index | `1000` |
| float | `none` |
| box-sizing | `border-box` |
| width / height | `238.68px` / `257.703px` |
| min-width / max-width | `160px` / `none` |
| min-height / max-height | `0px` / `none` |
| margin T/R/B/L | `2px` / `0px` / `0px` / `0px` |
| padding T/R/B/L | `5px` / `0px` / `5px` / `0px` |
| border-width T/R/B/L | `1px` ×4 |
| border-style T/R/B/L | `solid` ×4 |
| border-color T/R/B/L | `rgba(0, 0, 0, 0.15)` ×4 |
| radius TL/TR/BL/BR | `2px` ×4 |
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

Geometry proof that `top`/`right`/`bottom` are *used* values: authored (baseline `#465`) is `top: 100%; left: 0px; right: auto; bottom: auto`. The `span.dropdown` inline containing block is **16.5px** tall → `100%` = **16.5px** ✔. Its width 376.633 − menu 238.68 = **137.953px** = the reported `right` ✔. 16.5 − (16.5 + 2 + 257.703) = **−259.703px** = the reported `bottom` ✔. Page position: `#203.x + 0 = 37` ✔ (cap03 rect x=37); `#203.y + 16.5 + 2 = 462.1 + 18.5 = 480.6` ✔ (cap03 rect y=480.6).

### 5.2 `ul.dropdown-menu` — CLOSED (baseline `#465`, baseline COMMON + 32 deviations)

Identical to §5.1 **except**:

| prop | closed value |
|---|---|
| display | `none` |
| top / right / bottom / left | `100%` / `auto` / `auto` / `0px` |
| width / height | `auto` / `auto` |
| class attribute | `dropdown-menu` (no `show`); **no inline `style` attribute** |
| rect | `x=0 y=0 w=0 h=0` |

Every other property (z-index 1000, min-width 160px, margin-top 2px, padding 5px/0, `1px solid rgba(0,0,0,0.15)`, radius 2px, `rgb(255,255,255)`, `padding-box`, 13px/18.5714px, `text-align:left`, `box-shadow: rgba(0,0,0,0.176) 0px 6px 12px 0px`, `list-style-type:none`) is **byte-identical to M1's menu** (P09 §5.2) and identical between the two views here. Only `display` and the `show` class differ between states.

### 5.3 `li` — cap03 `#1`–`#10` (all ten; there is no divider variant here)

| prop | resolved value |
|---|---|
| display | `list-item` |
| position | `static`; top/right/bottom/left `auto`; z-index `auto`; float `none` |
| box-sizing | `border-box` |
| width / height | `236.68px` / `24.5703px` |
| min-width / max-width / min-height / max-height | `0px` / `none` / `0px` / `none` |
| margin T/R/B/L | `0px` ×4 |
| padding T/R/B/L | `0px` ×4 |
| border width / style / colour | `0px` ×4 / `none` ×4 / `rgb(51, 51, 51)` ×4 |
| radius | `0px` ×4 |
| background-color / -image | `rgba(0, 0, 0, 0)` / `none` |
| color | `rgb(51, 51, 51)` |
| font | `400 13px/18.5714px "Helvetica Neue", Helvetica, Arial, sans-serif` |
| text-align | `left` |
| white-space | `normal` |
| overflow-x / overflow-y | `visible` / `visible` |
| opacity / box-shadow | `1` / `none` |
| cursor | `auto` |
| transform / transition | `none` / `all 0s` |
| list-style-type | `none` |

### 5.4 `a` (menu item link, **resting state**) — cap03 `#11`–`#20`

| prop | resolved value |
|---|---|
| display | `block` |
| position | `static`; top/right/bottom/left `auto`; z-index `auto`; float `none` |
| box-sizing | `border-box` |
| width / height | `236.68px` / `24.5703px` |
| margin T/R/B/L | `0px` ×4 |
| **padding T/R/B/L** | **`3px` / `20px` / `3px` / `20px`** |
| border width / style / colour | `0px` ×4 / `none` ×4 / `rgb(51, 51, 51)` ×4 |
| radius | `0px` ×4 |
| background-color / -image | `rgba(0, 0, 0, 0)` / `none` |
| color | `rgb(51, 51, 51)` |
| font | `400 13px/18.5714px "Helvetica Neue", Helvetica, Arial, sans-serif` |
| text-align | `left` |
| text-decoration-line / text-shadow / text-overflow | `none` / `none` / `clip` |
| white-space | `nowrap` |
| vertical-align | `baseline` |
| overflow-x / overflow-y | `visible` / `visible` |
| opacity / box-shadow | `1` / `none` |
| outline-style / -width / -color | `none` / `3px` / `rgb(51, 51, 51)` |
| cursor | `pointer` |
| user-select | `auto` |
| transform / transition | `none` / `all 0s` |
| list-style-type | `none` |

### 5.5 `i.fa` icons — cap03 `#21`–`#32`

| prop | resolved value |
|---|---|
| display | `inline-block` (cap03 COMMON — printed as no-deviation) |
| position | `static` |
| width | `10.2188px` (`fa-trash`, `fa-user`, `fa-user-md`) / `8.35938px` (`fa-microphone`) / `13.9297px` (`fa-desktop`) / `11.1484px` (`fa-cog`) / `14.8594px` (`fa-user-times`) |
| height | `13px` |
| margin / padding / border | `0px` ×4 / `0px` ×4 / `0px none rgb(51,51,51)` ×4 |
| background-color | `rgba(0, 0, 0, 0)` |
| color | `rgb(51, 51, 51)` |
| font-family | `FontAwesome` |
| font-size / font-weight / font-style | `13px` / `400` / `normal` |
| line-height | `13px` |
| text-align / white-space / vertical-align | `left` / `nowrap` / `baseline` |
| opacity / box-shadow | `1` / `none` |
| cursor | `pointer` |
| transform | `matrix(1, 0, 0, 1, 0, 0)` (identity) |
| `::before` | `content: ""`, `color: rgb(51, 51, 51)`, `font-family: FontAwesome`, `font-size: 13px`, `background-color: rgba(0, 0, 0, 0)` |

### 5.6 Hover / focus / active / open states

**NOT CAPTURED** — no `:hover` / `:focus` / `:active` block appears anywhere in cap03 or in the baseline records for this subtree. See §8.

---

## 6. Verbatim text, with paths

| path (open) | path (baseline) | string (verbatim) |
|---|---|---|
| — | `r.0.1.1.0.1.3.1.0.0.2.0.0.1` (`#1296`) | `Select All` |
| — | `r.0.1.1.0.1.3.1.0.0.2.0.1.1` (`#1298`) | `Apply to all rooms?` |
| — | `r.0.1.1.0.1.3.1.0.0.2.1.0` (`#463`) | `Actions With Selected` |
| — | `r.0.1.1.0.1.3.1.0.0.2.1.1` (`#464`) | `Actions With the Email List` |
| `r.0.0` | `…2.1.2.0.0` (`#1529`) | `Remove All` |
| `r.1.0` | `…2.1.2.1.0` (`#1530`) | `UNBAN Participant` |
| `r.2.0` | `…2.1.2.2.0` (`#1531`) | `Make Presenter` |
| `r.3.0` | `…2.1.2.3.0` (`#1532`) | `Make Admin (Non-Presenter)` |
| `r.4.0` | `…2.1.2.4.0` (`#1533`) | `Make Participant` |
| `r.5.0` | `…2.1.2.5.0` (`#1534`) | `Make TRIAL user` |
| `r.6.0` | `…2.1.2.6.0` (`#1535`) | `MUTE Participant` |
| `r.7.0` | `…2.1.2.7.0` (`#1536`) | `BAN Participant` |
| `r.8.0` | `…2.1.2.8.0` (`#1537`) | `Add Badge` |
| `r.9.0` | `…2.1.2.9.0` (`#1538`) | `Remove Badge` |

Truncation: **none flagged.** `INFO.txt` reports `truncated=false`, `33 (declared 33)`. All 10 item strings match exactly between the open and closed views — no conflict.
Casing is as captured and is deliberately inconsistent (`UNBAN`, `MUTE`, `BAN`, `TRIAL` in caps; `Make Admin (Non-Presenter)` with parentheses) — reproduce verbatim.

---

## 7. Rebuild spec

### 7.1 HTML (exact structure, both states)

```html
<div class="users-many-actions">
  <div class="checkbox ng-scope" ng-if="completeUserList &amp;&amp; completeUserList.length>0">
    <label ng-click="getCheckedAllUserIds()">
      <input type="checkbox" ng-click="getCheckedAllUserIds()" ng-checked="checkedAllUsers">
      <span ng-if="!checkedAllUsers" class="ng-scope">Select All</span>
    </label>
    <label class="checkbox-apply-to-all-rooms">
      <input ng-change="toggleApplyToAllRooms()" type="checkbox" ng-model="applyToAllRooms"
             class="ng-pristine ng-untouched ng-valid">
      <span>Apply to all rooms?</span>
    </label>
  </div>

  <span class="dropdown">
    <button class="btn dropdown-toggle btn-primary"
            data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
      Actions With Selected <span class="caret"></span>
    </button>
    <button class="btn dropdown-toggle btn-primary" ng-click="actionsWithEmailList()">
      Actions With the Email List
    </button>

    <!-- CLOSED: class="dropdown-menu", no inline style -->
    <!-- OPEN:   class="dropdown-menu show" style="display: block;" -->
    <ul role="menu" class="dropdown-menu">
      <li><a href="" ng-click="updateManyUsers(10)"><i class="icon fa fa-trash"></i> Remove All</a></li>
      <li><a href="" ng-click="updateManyUsers(2)"><i class="icon fa fa-user"></i> UNBAN Participant</a></li>
      <li><a href="" ng-click="updateManyUsers(1)"><i class="fa fa-microphone"></i> <i class="fa fa-desktop"></i> Make Presenter</a></li>
      <li><a href="" ng-click="updateManyUsers(5)"><i class="fa fa-cog" aria-hidden="true"></i> <i class="fa fa-user-md"></i> Make Admin (Non-Presenter)</a></li>
      <li><a href="" ng-click="updateManyUsers(2)"><i class="icon fa fa-user"></i> Make Participant</a></li>
      <li><a href="" ng-click="updateManyUsers(6)"><i class="icon fa fa-user"></i> Make TRIAL user</a></li>
      <li><a href="" ng-click="updateManyUsers(3)"><i class="fa fa-user-times"></i> MUTE Participant</a></li>
      <li><a href="" ng-click="updateManyUsers(4)"><i class="fa fa-user-times"></i> BAN Participant</a></li>
      <li><a href="" ng-click="updateManyUsersBadgePrompt('add')"><i class="icon fa fa-user"></i> Add Badge</a></li>
      <li><a href="" ng-click="updateManyUsersBadgePrompt('remove')"><i class="icon fa fa-user"></i> Remove Badge</a></li>
    </ul>
  </span>
</div>
```

The single space between `</i>` and the label, and between the two `</i><i>` pairs on items 2 and 3, is load-bearing — it is the measured 3.64px gap (§3).

### 7.2 CSS (absolute values; no custom properties, no flex, no grid)

```css
.users-many-actions {
  width: 1768px; height: 64px;
  margin: 30px 0 0 0;
  padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: start; cursor: auto;
}

.users-many-actions > .checkbox {
  position: relative;
  width: 1768px; height: 20px;
  margin: 10px 0;
}
.users-many-actions > .checkbox > label {
  display: inline-block; height: 20px; min-height: 20px;
  max-width: 100%; padding-left: 20px; cursor: pointer;
}
.users-many-actions > .checkbox > label.checkbox-apply-to-all-rooms { margin-left: 10px; }
.users-many-actions > .checkbox input[type="checkbox"] {
  position: absolute; width: 13px; height: 13px;
  margin-top: 4px; margin-left: -20px;
  line-height: normal; appearance: auto; cursor: default;
}

/* positioning context — resolved from baseline #203. INLINE, on purpose. */
span.dropdown {
  display: inline;            /* => abs-pos CB height is the 16.5px inline box */
  position: relative;
  margin: 0; padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: start; white-space: normal;
  box-shadow: none; opacity: 1; cursor: auto; transform: none; transition: all 0s;
}

span.dropdown > .btn.dropdown-toggle.btn-primary {
  display: inline-block;
  height: 34px;
  margin: 0;                  /* NB: no `mt` class here, unlike M1 */
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
/* measured widths: trigger 179.727px ; "Actions With the Email List" 193.008px */

.dropdown-toggle .caret {
  display: inline-block; width: 8px; height: 4px;
  border-top: 4px dashed rgb(255, 255, 255);
  border-right: 4px solid rgba(0, 0, 0, 0);
  border-left: 4px solid rgba(0, 0, 0, 0);
  border-bottom: 0 none rgb(255, 255, 255);
  vertical-align: middle;
}

/* the menu — CLOSED */
span.dropdown > .dropdown-menu {
  display: none;
  position: absolute;
  top: 100%;                  /* == 16.5px against this inline container */
  left: 0; right: auto; bottom: auto;
  z-index: 1000;
  min-width: 160px;
  margin: 2px 0 0 0;
  padding: 5px 0;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 2px;
  background-color: rgb(255, 255, 255);
  background-clip: padding-box; background-image: none;
  color: rgb(51, 51, 51);
  font: 400 13px/18.5714px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: left; white-space: normal;
  list-style-type: none;
  box-shadow: rgba(0, 0, 0, 0.176) 0 6px 12px 0;
  opacity: 1; overflow: visible; cursor: auto;
  box-sizing: border-box;
}

/* the menu — OPEN */
span.dropdown > .dropdown-menu.show { display: block; }
/* used values then resolve to exactly:
   top: 16.5px; right: 137.953px; bottom: -259.703px; left: 0;
   width: 238.68px; height: 257.703px;
   page rect: x=37  y=480.6  w=238.7  h=257.7                        */

.dropdown-menu > li {
  display: list-item;
  width: 236.68px; height: 24.5703px;
  margin: 0; padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  white-space: normal; list-style-type: none; cursor: auto;
}

.dropdown-menu > li > a {
  display: block;
  width: 236.68px; height: 24.5703px;
  margin: 0; padding: 3px 20px; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 13px/18.5714px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: left; text-decoration: none; white-space: nowrap;
  cursor: pointer; box-shadow: none; opacity: 1;
  transform: none; transition: all 0s;
  box-sizing: border-box;
}

.dropdown-menu > li > a > i.fa {
  display: inline-block; height: 13px;
  font-family: FontAwesome; font-size: 13px; line-height: 13px;
  color: rgb(51, 51, 51); vertical-align: baseline;
  transform: matrix(1, 0, 0, 1, 0, 0);
}
/* measured glyph advance widths @13px:
   .fa-trash 10.2188 | .fa-user 10.2188 | .fa-user-md 10.2188
   .fa-microphone 8.35938 | .fa-desktop 13.9297 | .fa-cog 11.1484
   .fa-user-times 14.8594                                              */
```

### 7.3 Absolute open-state coordinates (1842×1265, dpr 2)

```
div.users-many-actions      x=37    y=425    w=1768    h=64
  div.checkbox              x=37    y=425    w=1768    h=20
    label[0]                x=37    y=425    w=78.328  h=20
      input                 x=37    y=429    w=13      h=13
      span "Select All"     x=57    y=426.5  w=58.3    h=16.5
    label[1]                x=129.2 y=425    w=140.852 h=20
      input                 x=129.2 y=429    w=13      h=13
      span "Apply to all…"  x=149.2 y=426.5  w=120.9   h=16.5
  span.dropdown (inline box)x=37    y=462.1  w=376.633 h=16.5
    button trigger          x=37    y=455    w=179.727 h=34
      span.caret            x=195.7 y=471.4  w=8       h=4
    button email-list       x=220.6 y=455    w=193.008 h=34
    ul.dropdown-menu.show   x=37    y=480.6  w=238.68  h=257.703
      li/a[0] Remove All             x=38 y=486.6   icon x=58   y=492.6 w=10.2188
      li/a[1] UNBAN Participant      x=38 y=511.2   icon x=58   y=517.2 w=10.2188
      li/a[2] Make Presenter         x=38 y=535.8   icons x=58 w=8.35938 ; x=70 w=13.9297  (y=541.8)
      li/a[3] Make Admin (Non-Pres.) x=38 y=560.3   icons x=58 w=11.1484 ; x=72.8 w=10.2188 (y=566.3)
      li/a[4] Make Participant       x=38 y=584.9   icon x=58   y=590.9 w=10.2188
      li/a[5] Make TRIAL user        x=38 y=609.5   icon x=58   y=615.5 w=10.2188
      li/a[6] MUTE Participant       x=38 y=634     icon x=58   y=640   w=14.8594
      li/a[7] BAN Participant        x=38 y=658.6   icon x=58   y=664.6 w=14.8594
      li/a[8] Add Badge              x=38 y=683.2   icon x=58   y=689.2 w=10.2188
      li/a[9] Remove Badge           x=38 y=707.8   icon x=58   y=713.8 w=10.2188
      (every a: w=236.68  h=24.5703)
menu bottom edge = 480.6 + 257.703 = 738.303
```

Icon left edge 58 = menu content-box left (37 + 1px border) + `<a>` `padding-left: 20px` = 38 + 20. ✔
The menu **overlaps** the two buttons vertically (buttons occupy y 455–489; menu starts at y 480.6) — reproduce this, it is captured behaviour caused by the `display:inline` container (§2.2).

---

## 8. Honest gaps

1. **Hover / focus / active / `.open` styles are absent from the dump.** No `:hover` / `:focus` / `:active` block is emitted anywhere in `03-…/nodes-000.txt` or the baseline. Bootstrap-3's item-hover fill and `.btn-primary:hover` are **unknown from this evidence**.
2. **FontAwesome glyph codepoints are lost** — every `<i>` `::before` prints `content: ""` (the PUA character did not survive JSON escaping). Only class names are hard evidence; the FA version shipped is not identified in the capture.
3. **`updateManyUsers(2)` is bound to two different labels** ("UNBAN Participant" and "Make Participant"). This is exactly what the DOM contains, verified in both views (cap03 `#12`/`#15`, baseline `#1530`/`#1533`). Whether that is an upstream bug is outside what the evidence can tell.
4. **`aria-expanded` in the open state is unknown.** Cap03 is re-rooted at the `<ul>`, so the trigger button is not in it; the only value we have is the baseline's `"false"`.
5. **Whether `span.dropdown` gains an `.open` class when open is unknown** for the same reason — we can only see that the `<ul>` gains `show` + `style="display: block;"`.
6. **`div.checkbox` is behind `ng-if="completeUserList && completeUserList.length>0"`**, so its presence in the capture proves the list was non-empty at capture time; its hidden state was **not captured**.
7. **`<span ng-if="!checkedAllUsers">Select All</span>` implies a sibling `Deselect All`-style branch** that was NOT rendered at capture time (only the `!checkedAllUsers` branch exists in the dump). The alternate label is a genuine uncaptured region — do not invent it.
8. **Icon advance widths are FA-build-specific**; a different FontAwesome subset will shift every label's x-offset off the numbers above.
9. **No screenshot was in this evidence set.** This decode is DOM + computed-style only; the rule-3 pixel-diff verification against a rendered reference has **not** been performed and remains outstanding.
