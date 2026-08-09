# ptr1 — P06 — Users-pane toolbar (search form, action buttons, select-all, the two dropdown triggers)

## 1. Purpose

This piece decodes the entire toolbar strip that sits above the users table on the **Manage Room** admin
page (room 3625): the right-floated `Add User / Invite` + `Export` + `Load / Reload Users` buttons and the
`User List Actions` dropdown (`#1293`), the inline `Search Users` form, and the `Select All` /
`Apply to all rooms?` checkbox row with the `Actions With Selected` (`#463`) and
`Actions With the Email List` dropdown triggers. Every node, attribute, resolved computed style and text
string below is taken verbatim from the capture `00-baseline-room` (2,156 nodes, viewport 1842×1265 @dpr2).

## 2. Path anchor + record count

| Anchor | Records found |
|---|---|
| `r.0.1.1.0.1.3.1.0.0.0` and descendants | 39 |
| `r.0.1.1.0.1.3.1.0.0.1` and descendants | 5 |
| `r.0.1.1.0.1.3.1.0.0.2` and descendants | 45 |
| **Total for P06** | **89** |

Verification command (run in `/tmp/ptr-decode/ptr1/caps/00-baseline-room`):

```
for f in nodes-*.txt; do awk -v RS='' -v ORS='\n\n' \
  '/path=r\.0\.1\.1\.0\.1\.3\.1\.0\.0\.[012]([. ]|$)/' $f; done | grep -c '^#'
# => 89
```

Sub-tree census (`sort | uniq -c` over the two-level path prefix), which is how the 89 was proved complete:

```
  1 r.0.1.1.0.1.3.1.0.0.0        (div.form-group)
 38 r.0.1.1.0.1.3.1.0.0.0.0      (div.col-sm-4.pull-right + everything under it)
  1 r.0.1.1.0.1.3.1.0.0.1        (form.form-inline)
  4 r.0.1.1.0.1.3.1.0.0.1.0      (div.form-group + label + input + button)
  1 r.0.1.1.0.1.3.1.0.0.2        (div.users-many-actions)
  7 r.0.1.1.0.1.3.1.0.0.2.0      (div.checkbox + 2 labels + 2 inputs + 2 spans)
 37 r.0.1.1.0.1.3.1.0.0.2.1      (span.dropdown + everything under it)
```

### Ancestor chain (context, not part of P06 — quoted so the geometry below is anchored)

| # | path | tag | class / attrs | rect x/y/w/h |
|---|---|---|---|---|
| #22 | `r.0.1.1` | `div` | `ui-view=""` `autoscroll="false"` `class="ng-fadeOutZoom ng-fluid ng-scope"` `style="background-color: 0A0A0A; "` | 0 / 50 / 1842 / 772.766 |
| #26 | `r.0.1.1.0` | `div` | `class="panel panel-default"` | 0 / 50 / 1842 / 772.766 |
| #31 | `r.0.1.1.0.1` | `div` | `class="panel-body"` (padding 15px, `::before`/`::after` `content:" "`) | 1 / 104 / 1840 / 696.766 |
| #41 | `r.0.1.1.0.1.3` | `div` | `class="ng-isolate-scope"` | 16 / 309 / 1810 / 476.766 |
| #61 | `r.0.1.1.0.1.3.1` | `div` | `class="tab-content"`, padding 10px 20px, border 1px solid `rgb(230,233,238)` on right/bottom/left (top width 0) | 16 / 351 / 1810 / 434.766 |
| #97 | `r.0.1.1.0.1.3.1.0` | `div` | `class="tab-pane ng-scope active"` `ng-repeat="tab in tabs"` `ng-class="{active: tab.active}"` `tab-content-transclude="tab"` | 37 / 361 / 1768 / 393.766 |
| #137 | `r.0.1.1.0.1.3.1.0.0` | `fieldset` | `class="ng-scope"`, `margin-bottom:20px`, `padding-bottom:20px` | 37 / 361 / 1768 / 393.766 |

The fieldset's four children in DOM order are: `.form-group` (P06), `form.form-inline` (P06),
`.users-many-actions` (P06), `table.table.table-striped` (P07/P08).

---

## 3. Node table — every node in P06

`renders` = has a non-degenerate paint box (rect w>0 **and** h>0 **and** `display` ≠ `none`).

| # | path (suffix after `r.0.1.1.0.1.3.1.0.0.`) | tag | id | classes | rect x | y | w | h | renders |
|---|---|---|---|---|---|---|---|---|---|
| 171 | `0` | div | — | `form-group` (trailing space in attr) | 37 | 361 | 1768 | 0 | no (zero height; in flow only) |
| 172 | `1` | form | — | `form-inline ng-pristine ng-valid` | 37 | 361 | 1768 | 34 | yes |
| 173 | `2` | div | — | `users-many-actions` | 37 | 425 | 1768 | 64 | yes |
| 200 | `0.0` | div | — | `col-sm-4 pull-right` | 1215.7 | 361 | 589.328 | 88 | yes |
| 201 | `1.0` | div | — | `form-group` (trailing space) | 37 | 361 | 423.062 | 34 | yes |
| 202 | `2.0` | div | — | `checkbox ng-scope` | 37 | 425 | 1768 | 20 | yes |
| 203 | `2.1` | span | — | `dropdown` | 37 | 462.1 | 376.6 | 16.5 | yes (inline box) |
| 454 | `0.0.0` | button | — | `btn btn-md btn-info mt` | 1230.7 | 371 | 150.641 | 34 | yes |
| 455 | `0.0.1` | button | — | `btn btn-md btn-info mt` | 1385.2 | 371 | 83.109 | 34 | yes |
| 456 | `0.0.2` | button | — | `btn btn-md btn-primary mt` | 1472.2 | 371 | 174.125 | 34 | yes |
| 457 | `0.0.3` | div | — | `dropdown` | 1230.7 | 405 | 148.094 | 44 | yes |
| 458 | `1.0.0` | label | — | ` control-label ` (leading + trailing spaces) | 37 | 368 | 89.477 | 20 | yes |
| 459 | `1.0.1` | input | — | `form-control  ng-pristine ng-untouched ng-valid` (double space) | 130.4 | 361 | 194 | 34 | yes |
| 460 | `1.0.2` | button | — | `btn btn-sm btn-primary` | 328.3 | 363 | 131.789 | 30 | yes |
| 461 | `2.0.0` | label | — | *(no class attribute)* | 37 | 425 | 78.328 | 20 | yes |
| 462 | `2.0.1` | label | — | `checkbox-apply-to-all-rooms` | 129.2 | 425 | 140.852 | 20 | yes |
| 463 | `2.1.0` | button | — | `btn dropdown-toggle btn-primary` | 37 | 455 | 179.727 | 34 | yes |
| 464 | `2.1.1` | button | — | `btn dropdown-toggle btn-primary` | 220.6 | 455 | 193.008 | 34 | yes |
| 465 | `2.1.2` | ul | — | `dropdown-menu` | 0 | 0 | 0 | 0 | no (`display:none`) |
| 1290 | `0.0.0.0` | i | — | `fa fa-user-plus` | 1243.7 | 381 | 16 | 14 | yes |
| 1291 | `0.0.1.0` | i | — | `fa fa-floppy-o` | 1398.2 | 381 | 12 | 14 | yes |
| 1292 | `0.0.2.0` | i | — | `fa fa-refresh` | 1485.2 | 381 | 12 | 14 | yes |
| 1293 | `0.0.3.0` | button | — | `btn btn-md dropdown-toggle btn-primary mt` | 1230.7 | 415 | 148.094 | 34 | yes |
| 1294 | `0.0.3.1` | ul | — | `dropdown-menu` | 0 | 0 | 0 | 0 | no (`display:none`) |
| 1295 | `2.0.0.0` | input | — | *(no class attribute)* | 37 | 429 | 13 | 13 | yes |
| 1296 | `2.0.0.1` | span | — | `ng-scope` | 57 | 426.5 | 58.328 | 16.5 | yes |
| 1297 | `2.0.1.0` | input | — | `ng-pristine ng-untouched ng-valid` | 129.2 | 429 | 13 | 13 | yes |
| 1298 | `2.0.1.1` | span | — | *(none)* | 149.2 | 426.5 | 120.852 | 16.5 | yes |
| 1299 | `2.1.0.0` | span | — | `caret` | 195.7 | 471.4 | 8 | 4 | yes |
| 1300 | `2.1.2.0` | li | — | *(none)* | 0 | 0 | 0 | 0 | no (menu closed) |
| 1301 | `2.1.2.1` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1302 | `2.1.2.2` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1303 | `2.1.2.3` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1304 | `2.1.2.4` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1305 | `2.1.2.5` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1306 | `2.1.2.6` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1307 | `2.1.2.7` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1308 | `2.1.2.8` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1309 | `2.1.2.9` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1518 | `0.0.3.0.0` | span | — | `caret` | 1357.8 | 431.4 | 8 | 4 | yes |
| 1519 | `0.0.3.1.0` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1520 | `0.0.3.1.1` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1521 | `0.0.3.1.2` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1522 | `0.0.3.1.3` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1523 | `0.0.3.1.4` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1524 | `0.0.3.1.5` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1525 | `0.0.3.1.6` | li | — | `divider` (`role="separator"`) | 0 | 0 | 0 | 0 | no |
| 1526 | `0.0.3.1.7` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1527 | `0.0.3.1.8` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1528 | `0.0.3.1.9` | li | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1529 | `2.1.2.0.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1530 | `2.1.2.1.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1531 | `2.1.2.2.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1532 | `2.1.2.3.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1533 | `2.1.2.4.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1534 | `2.1.2.5.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1535 | `2.1.2.6.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1536 | `2.1.2.7.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1537 | `2.1.2.8.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1538 | `2.1.2.9.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1651 | `0.0.3.1.0.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1652 | `0.0.3.1.1.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1653 | `0.0.3.1.2.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1654 | `0.0.3.1.3.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1655 | `0.0.3.1.4.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1656 | `0.0.3.1.5.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1657 | `0.0.3.1.7.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1658 | `0.0.3.1.8.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1659 | `0.0.3.1.9.0` | a | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 1660 | `2.1.2.0.0.0` | i | — | `icon fa fa-trash` | 0 | 0 | 0 | 0 | no |
| 1661 | `2.1.2.1.0.0` | i | — | `icon fa fa-user` | 0 | 0 | 0 | 0 | no |
| 1662 | `2.1.2.2.0.0` | i | — | `fa fa-microphone` | 0 | 0 | 0 | 0 | no |
| 1663 | `2.1.2.2.0.1` | i | — | `fa fa-desktop` | 0 | 0 | 0 | 0 | no |
| 1664 | `2.1.2.3.0.0` | i | — | `fa fa-cog` | 0 | 0 | 0 | 0 | no |
| 1665 | `2.1.2.3.0.1` | i | — | `fa fa-user-md` | 0 | 0 | 0 | 0 | no |
| 1666 | `2.1.2.4.0.0` | i | — | `icon fa fa-user` | 0 | 0 | 0 | 0 | no |
| 1667 | `2.1.2.5.0.0` | i | — | `icon fa fa-user` | 0 | 0 | 0 | 0 | no |
| 1668 | `2.1.2.6.0.0` | i | — | `fa fa-user-times` | 0 | 0 | 0 | 0 | no |
| 1669 | `2.1.2.7.0.0` | i | — | `fa fa-user-times` | 0 | 0 | 0 | 0 | no |
| 1670 | `2.1.2.8.0.0` | i | — | `icon fa fa-user` | 0 | 0 | 0 | 0 | no |
| 1671 | `2.1.2.9.0.0` | i | — | `icon fa fa-user` | 0 | 0 | 0 | 0 | no |
| 1735 | `0.0.3.1.1.0.0` | i | — | `fa fa-ban` | 0 | 0 | 0 | 0 | no |
| 1736 | `0.0.3.1.2.0.0` | i | — | `fa fa-mobile` | 0 | 0 | 0 | 0 | no |
| 1737 | `0.0.3.1.3.0.0` | i | — | `fa fa-mobile` | 0 | 0 | 0 | 0 | no |
| 1738 | `0.0.3.1.4.0.0` | i | — | `fa fa-microphone` | 0 | 0 | 0 | 0 | no |
| 1739 | `0.0.3.1.5.0.0` | i | — | `fa fa-credit-card` | 0 | 0 | 0 | 0 | no |
| 1740 | `0.0.3.1.7.0.0` | i | — | `fa fa-trash-o` | 0 | 0 | 0 | 0 | no |
| 1741 | `0.0.3.1.8.0.0` | i | — | `fa fa-trash-o` | 0 | 0 | 0 | 0 | no |
| 1742 | `0.0.3.1.9.0.0` | i | — | `fa fa-trash-o` | 0 | 0 | 0 | 0 | no |

**No node in P06 carries an `id` attribute** (verified: `grep 'attr id' == 0 hits` across all 89 records).
Nothing in P06 has a `data-*` attribute other than the two `data-toggle="dropdown"` on `#463` and `#1293`.
No `src`, no `href` other than the empty `href=""` on the 19 menu anchors. No `colspan` (no table markup in P06).

**Note the gap at `0.0.3.1.6`:** `#1525` is `li.divider[role="separator"]` and is the only `li` in the
`User List Actions` menu with no `<a>` child — hence anchors jump `…3.1.5.0` → `…3.1.7.0`.

---

## 4. Every attribute, verbatim

```
#171  r…0.0.0        <div>     class = "form-group "
#172  r…0.0.1        <form>    class = "form-inline ng-pristine ng-valid"
#173  r…0.0.2        <div>     class = "users-many-actions"

#200  r…0.0.0.0      <div>     class = "col-sm-4 pull-right"
#201  r…0.0.1.0      <div>     class = "form-group "
#202  r…0.0.2.0      <div>     class  = "checkbox ng-scope"
                               ng-if  = "completeUserList && completeUserList.length>0"
#203  r…0.0.2.1      <span>    class = "dropdown"

#454  r…0.0.0.0.0    <button>  class    = "btn btn-md btn-info mt"
                               ng-click = "doInvite()"
#455  r…0.0.0.0.1    <button>  class    = "btn btn-md btn-info mt"
                               ng-click = "exportListToCSV()"
#456  r…0.0.0.0.2    <button>  class    = "btn btn-md btn-primary mt"
                               ng-click = "loadUsers()"
#457  r…0.0.0.0.3    <div>     class = "dropdown"
                               style = "display: inline-block; vertical-align: middle;"
#458  r…0.0.1.0.0    <label>   class = " control-label "
#459  r…0.0.1.0.1    <input>   type     = "search"
                               name     = "title"
                               ng-enter = "loadUsers(uSearch)"
                               class    = "form-control  ng-pristine ng-untouched ng-valid"
                               ng-model = "uSearch "
#460  r…0.0.1.0.2    <button>  class    = "btn btn-sm btn-primary"
                               ng-click = "loadUsers(uSearch)"
#461  r…0.0.2.0.0    <label>   ng-click = "getCheckedAllUserIds()"
#462  r…0.0.2.0.1    <label>   class = "checkbox-apply-to-all-rooms"
#463  r…0.0.2.1.0    <button>  class         = "btn dropdown-toggle btn-primary"
                               data-toggle   = "dropdown"
                               aria-haspopup = "true"
                               aria-expanded = "false"
#464  r…0.0.2.1.1    <button>  class    = "btn dropdown-toggle btn-primary"
                               ng-click = "actionsWithEmailList()"
#465  r…0.0.2.1.2    <ul>      role  = "menu"
                               class = "dropdown-menu"

#1290 r…0.0.0.0.0.0  <i>       class = "fa fa-user-plus"   aria-hidden = "true"
#1291 r…0.0.0.0.1.0  <i>       class = "fa fa-floppy-o"    aria-hidden = "true"
#1292 r…0.0.0.0.2.0  <i>       class = "fa fa-refresh"     (no aria-hidden)
#1293 r…0.0.0.0.3.0  <button>  class         = "btn btn-md dropdown-toggle btn-primary mt"
                               data-toggle   = "dropdown"
                               aria-haspopup = "true"
                               aria-expanded = "false"
#1294 r…0.0.0.0.3.1  <ul>      role = "menu"   class = "dropdown-menu"
#1295 r…0.0.2.0.0.0  <input>   type       = "checkbox"
                               ng-click   = "getCheckedAllUserIds()"
                               ng-checked = "checkedAllUsers"
#1296 r…0.0.2.0.0.1  <span>    ng-if = "!checkedAllUsers"   class = "ng-scope"
#1297 r…0.0.2.0.1.0  <input>   ng-change = "toggleApplyToAllRooms()"
                               type      = "checkbox"
                               ng-model  = "applyToAllRooms"
                               class     = "ng-pristine ng-untouched ng-valid"
#1298 r…0.0.2.0.1.1  <span>    (none)
#1299 r…0.0.2.1.0.0  <span>    class = "caret"
#1300–#1309 r…0.0.2.1.2.{0..9} <li>  (none)

#1518 r…0.0.0.0.3.0.0 <span>   class = "caret"
#1519 r…0.0.0.0.3.1.0 <li>     (none)
#1520 r…0.0.0.0.3.1.1 <li>     (none)
#1521 r…0.0.0.0.3.1.2 <li>     (none)
#1522 r…0.0.0.0.3.1.3 <li>     (none)
#1523 r…0.0.0.0.3.1.4 <li>     (none)
#1524 r…0.0.0.0.3.1.5 <li>     (none)
#1525 r…0.0.0.0.3.1.6 <li>     role = "separator"   class = "divider"
#1526 r…0.0.0.0.3.1.7 <li>     (none)
#1527 r…0.0.0.0.3.1.8 <li>     (none)
#1528 r…0.0.0.0.3.1.9 <li>     (none)

# "Actions With Selected" menu anchors — all have href=""
#1529 r…0.0.2.1.2.0.0 <a>  href=""  ng-click = "updateManyUsers(10)"
#1530 r…0.0.2.1.2.1.0 <a>  href=""  ng-click = "updateManyUsers(2)"
#1531 r…0.0.2.1.2.2.0 <a>  href=""  ng-click = "updateManyUsers(1)"
#1532 r…0.0.2.1.2.3.0 <a>  href=""  ng-click = "updateManyUsers(5)"
#1533 r…0.0.2.1.2.4.0 <a>  href=""  ng-click = "updateManyUsers(2)"
#1534 r…0.0.2.1.2.5.0 <a>  href=""  ng-click = "updateManyUsers(6)"
#1535 r…0.0.2.1.2.6.0 <a>  href=""  ng-click = "updateManyUsers(3)"
#1536 r…0.0.2.1.2.7.0 <a>  href=""  ng-click = "updateManyUsers(4)"
#1537 r…0.0.2.1.2.8.0 <a>  href=""  ng-click = "updateManyUsersBadgePrompt('add')"
#1538 r…0.0.2.1.2.9.0 <a>  href=""  ng-click = "updateManyUsersBadgePrompt('remove')"

# "User List Actions" menu anchors — all have href=""
#1651 r…0.0.0.0.3.1.0.0 <a>  href=""  ng-click = "loadUsersFT()"
#1652 r…0.0.0.0.3.1.1.0 <a>  href=""  ng-click = "loadBannedUsers()"
#1653 r…0.0.0.0.3.1.2.0 <a>  href=""  ng-click = "loadMobileUsers()"
#1654 r…0.0.0.0.3.1.3.0 <a>  href=""  ng-click = "loadNonMobileUsers()"
#1655 r…0.0.0.0.3.1.4.0 <a>  href=""  ng-click = "loadPresentersUsers()"
#1656 r…0.0.0.0.3.1.5.0 <a>  href=""  ng-click = "loadMarketplaceUsers()"
#1657 r…0.0.0.0.3.1.7.0 <a>  href=""  ng-click = "clearUserList()"
#1658 r…0.0.0.0.3.1.8.0 <a>  href=""  ng-click = "removeUsersFT()"
#1659 r…0.0.0.0.3.1.9.0 <a>  href=""  ng-click = "removeBadgesForUsers()"

# menu-item icons — class only, except the two noted
#1660 r…0.0.2.1.2.0.0.0 <i> class="icon fa fa-trash"
#1661 r…0.0.2.1.2.1.0.0 <i> class="icon fa fa-user"
#1662 r…0.0.2.1.2.2.0.0 <i> class="fa fa-microphone"
#1663 r…0.0.2.1.2.2.0.1 <i> class="fa fa-desktop"
#1664 r…0.0.2.1.2.3.0.0 <i> class="fa fa-cog"      aria-hidden="true"
#1665 r…0.0.2.1.2.3.0.1 <i> class="fa fa-user-md"
#1666 r…0.0.2.1.2.4.0.0 <i> class="icon fa fa-user"
#1667 r…0.0.2.1.2.5.0.0 <i> class="icon fa fa-user"
#1668 r…0.0.2.1.2.6.0.0 <i> class="fa fa-user-times"
#1669 r…0.0.2.1.2.7.0.0 <i> class="fa fa-user-times"
#1670 r…0.0.2.1.2.8.0.0 <i> class="icon fa fa-user"
#1671 r…0.0.2.1.2.9.0.0 <i> class="icon fa fa-user"
#1735 r…0.0.0.0.3.1.1.0.0 <i> class="fa fa-ban"
#1736 r…0.0.0.0.3.1.2.0.0 <i> class="fa fa-mobile"
#1737 r…0.0.0.0.3.1.3.0.0 <i> class="fa fa-mobile"
#1738 r…0.0.0.0.3.1.4.0.0 <i> class="fa fa-microphone"
#1739 r…0.0.0.0.3.1.5.0.0 <i> class="fa fa-credit-card"
#1740 r…0.0.0.0.3.1.7.0.0 <i> class="fa fa-trash-o"
#1741 r…0.0.0.0.3.1.8.0.0 <i> class="fa fa-trash-o"
#1742 r…0.0.0.0.3.1.9.0.0 <i> class="fa fa-trash-o"
```

**Explicitly absent attributes worth recording (do not invent them):**
`#459` the search input has **no `placeholder`**, **no `value`**, **no `id`**, **no `required`**, **no
`autocomplete`**. `#1295` / `#1297` checkboxes have **no `checked`** attribute (state is bound via
`ng-checked` / `ng-model`). `#461` has **no `class`** and **no `for`** attribute. `#1292` (`fa-refresh`)
is the only one of the three button icons **without** `aria-hidden="true"`.

---

## 5. Resolved computed style — absolute values, per rendering node

The capture prints only deviations from a COMMON table. Everything below is **already resolved**: COMMON
value substituted where the node had no deviation. You never need `DEFAULTS.txt`.

**COMMON baseline (applies to every property not restated for a node):**
`display:block · position:static · float:none · width:auto · height:auto · margin 0px/0px/0px/0px ·
padding 0px/0px/0px/0px · border-width 0px ×4 · border-style none ×4 · border-color rgb(51,51,51) ×4 ·
border-radius 0px ×4 · background-color rgba(0,0,0,0) · color rgb(51,51,51) ·
font-family "Helvetica Neue", Helvetica, Arial, sans-serif · font-size 14px · font-weight 400 ·
line-height 20px · letter-spacing normal · text-align start · vertical-align baseline · white-space normal ·
overflow-x visible · overflow-y visible · opacity 1 · box-shadow none · cursor auto · box-sizing border-box`

### #171 `div.form-group ` — `r…0.0.0`

| prop | resolved |
|---|---|
| display | block |
| position | static |
| float | none |
| width / height | **1768px** / **0px** |
| margin T/R/B/L | 0px / 0px / 0px / 0px |
| padding T/R/B/L | 0px / 0px / 0px / 0px |
| border-width T/R/B/L | 0px / 0px / 0px / 0px |
| border-style T/R/B/L | none / none / none / none |
| border-color T/R/B/L | rgb(51,51,51) ×4 |
| border-radius TL/TR/BL/BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| color | rgb(51, 51, 51) |
| font-family / size / weight | "Helvetica Neue", Helvetica, Arial, sans-serif / 14px / 400 |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| vertical-align | baseline |
| white-space | normal |
| overflow-x / -y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |

> Bootstrap's `.form-group { margin-bottom: 15px }` is **not** applied here — the capture shows
> `margin-bottom: 0px` (no deviation). Height is 0 because its sole child `#200` is `float:right`.

### #172 `form.form-inline.ng-pristine.ng-valid` — `r…0.0.1`
Identical to #171 except: **height 34px**. (width 1768px; all other props COMMON.)

### #173 `div.users-many-actions` — `r…0.0.2`
Identical to #171 except: **width 1768px**, **height 64px**, **margin-top 30px**.

### #200 `div.col-sm-4.pull-right` — `r…0.0.0.0`

| prop | resolved |
|---|---|
| display | block |
| position | **relative** (top 0px, right 0px, bottom 0px, left 0px) |
| float | **right** |
| width / height | **589.328px** / **88px** |
| min-height | **1px** |
| margin T/R/B/L | 0px / 0px / 0px / 0px |
| padding T/R/B/L | 0px / **15px** / 0px / **15px** |
| border-width / style / color / radius | 0px ×4 / none ×4 / rgb(51,51,51) ×4 / 0px ×4 |
| background-color | rgba(0, 0, 0, 0) |
| color | rgb(51, 51, 51) |
| font | "Helvetica Neue", Helvetica, Arial, sans-serif / 14px / 400 / line-height 20px |
| letter-spacing / text-align / vertical-align / white-space | normal / start / baseline / normal |
| overflow-x / -y / opacity / box-shadow / cursor | visible / visible / 1 / none / auto |

Content box = x 1230.7 → 1790.0 (589.328 − 30 padding = 559.328px usable).

### #201 `div.form-group ` — `r…0.0.1.0`
COMMON except: **display inline-block**, **width 423.062px**, **height 34px**, **vertical-align middle**.

### #202 `div.checkbox.ng-scope` — `r…0.0.2.0`
COMMON except: **position relative** (top 0px, right 0px, bottom 0px, left 0px), **width 1768px**,
**height 20px**, **margin-top 10px**, **margin-bottom 10px**. (This is the positioned ancestor for the two
absolutely-positioned checkbox inputs.)

### #203 `span.dropdown` — `r…0.0.2.1`
COMMON except: **display inline**, **position relative** (top/right/bottom/left all 0px).
Inline box rect 37 / 462.1 / 376.6 / 16.5 — it has no paint of its own; its two child buttons paint.

### #454 `button.btn.btn-md.btn-info.mt` — "Add User / Invite"

| prop | resolved |
|---|---|
| display | **inline-block** |
| position | static |
| float | none |
| width / height | **150.641px** / **34px** |
| margin T/R/B/L | **10px** / 0px / 0px / 0px |
| padding T/R/B/L | **6px / 12px / 6px / 12px** |
| border-width T/R/B/L | **1px / 1px / 1px / 1px** |
| border-style T/R/B/L | **solid ×4** |
| border-color T/R/B/L | **rgb(70, 184, 218) ×4** |
| border-radius TL/TR/BL/BR | **4px ×4** |
| background-color | **rgb(91, 192, 222)** |
| color | **rgb(255, 255, 255)** |
| font-family / size / weight | "Helvetica Neue", Helvetica, Arial, sans-serif / 14px / 400 |
| line-height | 20px |
| letter-spacing | normal |
| text-align | **center** |
| vertical-align | **middle** |
| white-space | **nowrap** |
| overflow-x / -y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | **pointer** |
| user-select | **none**; outline-color rgb(255,255,255) |

### #455 `button.btn.btn-md.btn-info.mt` — "Export"
Byte-identical resolved style to #454 except **width 83.109px**. (Same `btn-info` palette:
bg `rgb(91,192,222)`, border `rgb(70,184,218)`, colour `rgb(255,255,255)`.)

### #456 `button.btn.btn-md.btn-primary.mt` — "Load / Reload Users"
Same as #454 except **width 174.125px**, **background-color rgb(51, 122, 183)**,
**border-color rgb(46, 109, 164) ×4**.

### #457 `div.dropdown` (inline style) — `r…0.0.0.0.3`
COMMON except: **display inline-block**, **position relative** (t/r/b/l 0px), **width 148.094px**,
**height 44px**, **vertical-align middle**. (44px = the child button's 10px margin-top + 34px box.)

### #458 `label. control-label ` — "Search Users"

| prop | resolved |
|---|---|
| display | **inline-block** |
| position / float | static / none |
| width / height | **89.477px** / **20px** |
| max-width | **100%** |
| margin ×4 / padding ×4 | 0px ×4 / 0px ×4 |
| border width/style/color/radius | 0px ×4 / none ×4 / rgb(51,51,51) ×4 / 0px ×4 |
| background-color / color | rgba(0,0,0,0) / rgb(51, 51, 51) |
| font-family / size / **weight** | "Helvetica Neue", Helvetica, Arial, sans-serif / 14px / **700** |
| line-height / letter-spacing | 20px / normal |
| text-align / **vertical-align** | start / **middle** |
| white-space / overflow / opacity / box-shadow | normal / visible / 1 / none |
| **cursor** | **default** |

> Bootstrap's `.control-label` `margin-bottom:5px` is **not** present — resolved `margin-bottom: 0px`.

### #459 `input[type=search].form-control` — the search box

| prop | resolved |
|---|---|
| display | **inline-block** |
| position / float | static / none |
| width / height | **194px** / **34px** |
| margin T/R/B/L | 0px / 0px / 0px / 0px |
| padding T/R/B/L | **6px / 18px / 6px / 18px** |
| border-width T/R/B/L | **1px ×4** |
| border-style T/R/B/L | **solid ×4** |
| border-color T/R/B/L | **rgb(219, 217, 217) ×4** |
| border-radius TL/TR/BL/BR | **4px ×4** |
| background-color | **rgb(255, 255, 255)** |
| color | **rgb(85, 85, 85)** |
| font-family / size / weight | "Helvetica Neue", Helvetica, Arial, sans-serif / 14px / 400 |
| line-height / letter-spacing | 20px / normal |
| text-align / **vertical-align** | start / **middle** |
| white-space | normal |
| **overflow-x / -y** | **clip / clip** |
| opacity | 1 |
| **box-shadow** | **rgb(0, 0, 0) 0px 0px 0px 0px** (present but zero-size — paints nothing) |
| **cursor** | **text** |
| transition | property `border-color, box-shadow`, duration `0.15s, 0.15s`; outline-color rgb(85,85,85) |

> Note the **18px** left/right padding — this is *not* stock Bootstrap `.form-control` (12px); it is a
> project override and must be reproduced or the 194px box will not match.

### #460 `button.btn.btn-sm.btn-primary` — "Search / Load Users"

| prop | resolved |
|---|---|
| display | **inline-block** |
| width / height | **131.789px** / **30px** |
| margin ×4 | 0px ×4 |
| padding T/R/B/L | **5px / 10px / 5px / 10px** |
| border-width / style | **1px ×4** / **solid ×4** |
| border-color ×4 | **rgb(46, 109, 164)** |
| border-radius ×4 | **3px** |
| background-color | **rgb(51, 122, 183)** |
| color | **rgb(255, 255, 255)** |
| font-size / **line-height** | **12px** / **18px** |
| font-family / weight | "Helvetica Neue", Helvetica, Arial, sans-serif / 400 |
| text-align / vertical-align / white-space | **center** / **middle** / **nowrap** |
| overflow / opacity / box-shadow | visible / 1 / none |
| cursor | **pointer** (user-select none; outline-color rgb(255,255,255)) |

### #461 `label` (Select All wrapper) — `r…0.0.2.0.0`
COMMON except: **display inline-block**, **width 78.328px**, **height 20px**, **max-width 100%**,
**min-height 20px**, **padding-left 20px**, **cursor pointer**. Colour rgb(51,51,51), font-weight 400
(this label is *not* bold — `.checkbox label` overrides `label{font-weight:700}`).

### #462 `label.checkbox-apply-to-all-rooms` — `r…0.0.2.0.1`
Same as #461 plus **margin-left 10px**; **width 140.852px**.

### #463 `button.btn.dropdown-toggle.btn-primary` — "Actions With Selected"

| prop | resolved |
|---|---|
| display | **inline-block** |
| position / float | static / none |
| width / height | **179.727px** / **34px** |
| margin ×4 | 0px ×4 |
| padding T/R/B/L | **6px / 12px / 6px / 12px** |
| border-width / style / colour | **1px ×4** / **solid ×4** / **rgb(46, 109, 164) ×4** |
| border-radius ×4 | **4px** |
| background-color | **rgb(51, 122, 183)** |
| color | **rgb(255, 255, 255)** |
| font-family / size / weight / line-height | "Helvetica Neue", Helvetica, Arial, sans-serif / 14px / 400 / 20px |
| letter-spacing | normal |
| text-align / vertical-align / white-space | **center** / **middle** / **nowrap** |
| overflow / opacity / box-shadow | visible / 1 / none |
| cursor | **pointer** (user-select none; outline-color rgb(255,255,255)) |

### #464 `button.btn.dropdown-toggle.btn-primary` — "Actions With the Email List"
Identical resolved style to #463 except **width 193.008px**.

### #1290 `i.fa.fa-user-plus` (inside #454)

| prop | resolved |
|---|---|
| display | **inline-block** |
| width / height | **16px** / **14px** |
| margin ×4 / padding ×4 | 0px ×4 / 0px ×4 |
| border-width / style | 0px ×4 / none ×4 |
| border-colour ×4 | **rgb(255, 255, 255)** |
| border-radius ×4 | 0px |
| background-color | rgba(0, 0, 0, 0) |
| color | **rgb(255, 255, 255)** |
| font-family | **FontAwesome** |
| font-size / weight | 14px / 400 |
| line-height | **14px** |
| letter-spacing | normal |
| text-align / vertical-align / white-space | **center** / baseline / **nowrap** |
| overflow / opacity / box-shadow | visible / 1 / none |
| cursor | **pointer** |
| transform | **matrix(1, 0, 0, 1, 0, 0)** |
| `::before` | `content:""` · color `rgb(255,255,255)` · font-family `FontAwesome` · font-size `14px` · background `rgba(0,0,0,0)` |

### #1291 `i.fa.fa-floppy-o`, #1292 `i.fa.fa-refresh`
Identical to #1290 except **width 12px** (both). `::before` identical (glyph differs — the capture stores
the literal PUA glyph as `content:""`, which the dump renders as an empty-looking string).

### #1293 `button.btn.btn-md.dropdown-toggle.btn-primary.mt` — "User List Actions"
Identical resolved style to #456 (`btn-primary` + `mt`) except **width 148.094px** and it also carries
`data-toggle="dropdown"`. Full absolute values: display inline-block; width 148.094px; height 34px;
margin-top 10px, other margins 0px; padding 6px 12px 6px 12px; border 1px solid rgb(46,109,164) ×4;
radius 4px ×4; background rgb(51,122,183); colour rgb(255,255,255); font "Helvetica Neue", Helvetica,
Arial, sans-serif 14px/20px weight 400; letter-spacing normal; text-align center; vertical-align middle;
white-space nowrap; overflow visible; opacity 1; box-shadow none; cursor pointer; user-select none.

### #1295 `input[type=checkbox]` — Select All box

| prop | resolved |
|---|---|
| display | block |
| **position** | **absolute** — top `0px`, right `1755px`, bottom `3px`, left `20px` (relative to #202) |
| float | none |
| width / height | **13px** / **13px** |
| margin T/R/B/L | **4px** / 0px / 0px / **-20px** |
| padding ×4 | 0px |
| border width/style/colour/radius | 0px ×4 / none ×4 / rgb(51,51,51) ×4 / 0px ×4 |
| background-color | rgba(0, 0, 0, 0) |
| color | rgb(51, 51, 51) |
| font-family / size / weight | "Helvetica Neue", Helvetica, Arial, sans-serif / 14px / 400 |
| **line-height** | **normal** |
| letter-spacing / text-align / vertical-align / white-space | normal / start / baseline / normal |
| overflow / opacity / box-shadow | visible / 1 / none |
| **cursor** | **default** |
| **appearance** | **auto** (native checkbox rendering) |

### #1297 `input[type=checkbox]` — Apply-to-all-rooms box
Identical to #1295 except **right `1662.77px`**, **left `112.227px`**.

### #1296 `span.ng-scope` — "Select All"
COMMON except: **display inline**, **cursor pointer**. colour rgb(51,51,51), 14px/20px, weight 400.
Rect 57 / 426.5 / 58.328 / 16.5.

### #1298 `span` — "Apply to all rooms?"
Identical to #1296 (display inline, cursor pointer). Rect 149.2 / 426.5 / 120.852 / 16.5.

### #1299 / #1518 `span.caret` (the two visible carets)

| prop | resolved |
|---|---|
| display | **inline-block** |
| width / height | **8px** / **4px** |
| margin ×4 / padding ×4 | 0px / 0px |
| border-width T/R/B/L | **4px / 4px / 0px / 4px** |
| border-style T/R/B/L | **dashed / solid / none / solid** |
| border-color T/R/B/L | **rgb(255,255,255) / rgba(0,0,0,0) / rgb(255,255,255) / rgba(0,0,0,0)** |
| border-radius ×4 | 0px |
| background-color | rgba(0, 0, 0, 0) |
| color | **rgb(255, 255, 255)** |
| font-family / size / weight / line-height | "Helvetica Neue", Helvetica, Arial, sans-serif / 14px / 400 / 20px |
| text-align / vertical-align / white-space | **center** / **middle** / **nowrap** |
| overflow / opacity / box-shadow | visible / 1 / none |
| cursor | **pointer** (user-select none) |

Rects: `#1299` (Actions With Selected) 195.7 / 471.4 / 8 / 4 · `#1518` (User List Actions) 1357.8 / 431.4 / 8 / 4.

### Non-rendering nodes — resolved values (for completeness; none of these paint in the baseline)

**`ul.dropdown-menu` (`#465`, `#1294`)** — both `display:none`, rect 0×0. Resolved:
`position absolute · top 100% · left 0px · z-index 1000 · min-width 160px · margin-top 2px ·
padding 5px 0px 5px 0px · border 1px solid rgba(0,0,0,0.15) ×4 · border-radius 2px ×4 ·
background-color rgb(255,255,255) · background-clip padding-box · font-size 13px · line-height 18.5714px ·
text-align left · box-shadow rgba(0,0,0,0.176) 0px 6px 12px 0px · list-style-type none · colour rgb(51,51,51)`.

**`li` menu items (`#1300`–`#1309`, `#1519`–`#1528` except `#1525`)** — resolved:
`display list-item · font-size 13px · line-height 18.5714px · text-align left · list-style-type none`,
everything else COMMON. Rect 0×0 because the parent `ul` is `display:none`.

**`li.divider` (`#1525`)** — resolved: `display list-item · height 1px · margin 9px 0px 9px 0px ·
background-color rgb(229,229,229) · font-size 13px · line-height 18.5714px · text-align left ·
overflow-x hidden · overflow-y hidden · list-style-type none`.

**menu `<a>` (`#1529`–`#1538`, `#1651`–`#1659`)** — resolved:
`display block · padding 3px 20px 3px 20px · font-size 13px · line-height 18.5714px · text-align left ·
white-space nowrap · cursor pointer · list-style-type none · colour rgb(51,51,51) ·
background rgba(0,0,0,0)`, everything else COMMON.

**menu `<i>` icons (`#1660`–`#1671`, `#1735`–`#1742`)** — resolved:
`display inline-block · font-family FontAwesome · font-size 13px · line-height 13px · text-align left ·
white-space nowrap · cursor pointer · list-style-type none`; `::before` = `content:"" · colour
rgb(51,51,51) · font-family FontAwesome · font-size 13px · background rgba(0,0,0,0)`.

---

## 6. Verbatim text — every string with its path

| path | text (verbatim, between the quotes) |
|---|---|
| `r…0.0.0.0.0` (#454) | `Add User / Invite` |
| `r…0.0.0.0.1` (#455) | `Export` |
| `r…0.0.0.0.2` (#456) | `Load / Reload Users` |
| `r…0.0.0.0.3.0` (#1293) | `User List Actions` |
| `r…0.0.1.0.0` (#458) | `Search Users` |
| `r…0.0.1.0.2` (#460) | `Search / Load Users` |
| `r…0.0.2.0.0.1` (#1296) | `Select All` |
| `r…0.0.2.0.1.1` (#1298) | `Apply to all rooms?` |
| `r…0.0.2.1.0` (#463) | `Actions With Selected` |
| `r…0.0.2.1.1` (#464) | `Actions With the Email List` |
| `r…0.0.0.0.3.1.0.0` (#1651) | `Show Free Trials` |
| `r…0.0.0.0.3.1.1.0` (#1652) | `Show BANNED` |
| `r…0.0.0.0.3.1.2.0` (#1653) | `Show Mobile` |
| `r…0.0.0.0.3.1.3.0` (#1654) | `Show Non-Mobile` |
| `r…0.0.0.0.3.1.4.0` (#1655) | `Show Presenters` |
| `r…0.0.0.0.3.1.5.0` (#1656) | `Marketplace Users` |
| `r…0.0.0.0.3.1.7.0` (#1657) | `Remove non-presenters` |
| `r…0.0.0.0.3.1.8.0` (#1658) | `Remove Free Trials` |
| `r…0.0.0.0.3.1.9.0` (#1659) | `Remove All User Badges` |
| `r…0.0.2.1.2.0.0` (#1529) | `Remove All` |
| `r…0.0.2.1.2.1.0` (#1530) | `UNBAN Participant` |
| `r…0.0.2.1.2.2.0` (#1531) | `Make Presenter` |
| `r…0.0.2.1.2.3.0` (#1532) | `Make Admin (Non-Presenter)` |
| `r…0.0.2.1.2.4.0` (#1533) | `Make Participant` |
| `r…0.0.2.1.2.5.0` (#1534) | `Make TRIAL user` |
| `r…0.0.2.1.2.6.0` (#1535) | `MUTE Participant` |
| `r…0.0.2.1.2.7.0` (#1536) | `BAN Participant` |
| `r…0.0.2.1.2.8.0` (#1537) | `Add Badge` |
| `r…0.0.2.1.2.9.0` (#1538) | `Remove Badge` |

**Truncation check:** the dump truncates a `text:` field at **250 raw characters** (verified: exactly four
nodes in the whole 2,156-node capture hit 250; the next-longest is 248). The longest string in P06 is
`Make Admin (Non-Presenter)` at 26 characters. **No text in P06 is truncated.**

All FontAwesome `::before` contents are the literal private-use glyph, which the dump serialises as
`"content":"\"\""`. The glyph identity is therefore **not recoverable from the dump** — use the class name
(`fa-user-plus`, `fa-floppy-o`, `fa-refresh`, `fa-trash`, …) as the source of truth.

---

## 7. Rebuild spec — exact HTML + CSS

### 7.1 HTML (DOM order exactly as captured)

```html
<fieldset class="ng-scope"><!-- #137 -->

  <!-- ============ #171 : right-floated button block ============ -->
  <div class="form-group ">
    <div class="col-sm-4 pull-right">
      <button class="btn btn-md btn-info mt" ng-click="doInvite()">
        <i class="fa fa-user-plus" aria-hidden="true"></i> Add User / Invite
      </button>
      <button class="btn btn-md btn-info mt" ng-click="exportListToCSV()">
        <i class="fa fa-floppy-o" aria-hidden="true"></i> Export
      </button>
      <button class="btn btn-md btn-primary mt" ng-click="loadUsers()">
        <i class="fa fa-refresh"></i> Load / Reload Users
      </button>
      <div class="dropdown" style="display: inline-block; vertical-align: middle;">
        <button class="btn btn-md dropdown-toggle btn-primary mt" data-toggle="dropdown"
                aria-haspopup="true" aria-expanded="false">
          User List Actions <span class="caret"></span>
        </button>
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
    </div>
  </div>

  <!-- ============ #172 : inline search form ============ -->
  <form class="form-inline ng-pristine ng-valid">
    <div class="form-group ">
      <label class=" control-label ">Search Users</label>
      <input type="search" name="title" ng-enter="loadUsers(uSearch)"
             class="form-control  ng-pristine ng-untouched ng-valid" ng-model="uSearch ">
      <button class="btn btn-sm btn-primary" ng-click="loadUsers(uSearch)">Search / Load Users</button>
    </div>
  </form>

  <!-- ============ #173 : select-all + bulk-action block ============ -->
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
      <button class="btn dropdown-toggle btn-primary" data-toggle="dropdown"
              aria-haspopup="true" aria-expanded="false">
        Actions With Selected <span class="caret"></span>
      </button>
      <button class="btn dropdown-toggle btn-primary" ng-click="actionsWithEmailList()">
        Actions With the Email List
      </button>
      <ul role="menu" class="dropdown-menu">
        <li><a href="" ng-click="updateManyUsers(10)"><i class="icon fa fa-trash"></i> Remove All</a></li>
        <li><a href="" ng-click="updateManyUsers(2)"><i class="icon fa fa-user"></i> UNBAN Participant</a></li>
        <li><a href="" ng-click="updateManyUsers(1)"><i class="fa fa-microphone"></i><i class="fa fa-desktop"></i> Make Presenter</a></li>
        <li><a href="" ng-click="updateManyUsers(5)"><i class="fa fa-cog" aria-hidden="true"></i><i class="fa fa-user-md"></i> Make Admin (Non-Presenter)</a></li>
        <li><a href="" ng-click="updateManyUsers(2)"><i class="icon fa fa-user"></i> Make Participant</a></li>
        <li><a href="" ng-click="updateManyUsers(6)"><i class="icon fa fa-user"></i> Make TRIAL user</a></li>
        <li><a href="" ng-click="updateManyUsers(3)"><i class="fa fa-user-times"></i> MUTE Participant</a></li>
        <li><a href="" ng-click="updateManyUsers(4)"><i class="fa fa-user-times"></i> BAN Participant</a></li>
        <li><a href="" ng-click="updateManyUsersBadgePrompt('add')"><i class="icon fa fa-user"></i> Add Badge</a></li>
        <li><a href="" ng-click="updateManyUsersBadgePrompt('remove')"><i class="icon fa fa-user"></i> Remove Badge</a></li>
      </ul>
    </span>
  </div>

  <!-- table -> see P07 / P08 -->
</fieldset>
```

> The exact position of each `<i>` relative to its label text inside the two closed menus **cannot be read
> from the dump** (child index only tells us the icon precedes the text node in `2.1.2.2.0` etc.). The
> ordering above follows the recorded child indices (`…0.0` = icon, text node follows). This is an
> **honest inference from child index**, not from a rendered rect — see §8.

### 7.2 CSS — resolved, no variables, no flex, no grid

```css
/* ---- containers ------------------------------------------------------ */
fieldset.ng-scope           { box-sizing:border-box; width:1768px; margin:0 0 20px 0; padding:0 0 20px 0; }
.form-group                 { box-sizing:border-box; width:1768px; margin:0; padding:0; }
form.form-inline            { box-sizing:border-box; width:1768px; height:34px; margin:0; padding:0; }
.users-many-actions         { box-sizing:border-box; width:1768px; height:64px; margin:30px 0 0 0; }

.col-sm-4.pull-right        { position:relative; top:0; right:0; bottom:0; left:0;
                              float:right; width:589.328px; min-height:1px;
                              padding:0 15px; box-sizing:border-box; }

form.form-inline .form-group{ display:inline-block; width:423.062px; height:34px;
                              vertical-align:middle; margin:0; padding:0; }

.users-many-actions .checkbox{ position:relative; top:0; right:0; bottom:0; left:0;
                              width:1768px; height:20px; margin:10px 0; }
.users-many-actions .dropdown{ display:inline; position:relative; top:0; right:0; bottom:0; left:0; }

/* ---- base typography (inherited from body) --------------------------- */
fieldset.ng-scope, fieldset.ng-scope * {
  font-family:"Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size:14px; font-weight:400; line-height:20px; letter-spacing:normal;
  color:rgb(51,51,51);
}

/* ---- buttons --------------------------------------------------------- */
.btn { display:inline-block; margin:0; padding:6px 12px; box-sizing:border-box;
       border:1px solid rgb(46,109,164); border-radius:4px;
       background-color:rgb(51,122,183); color:rgb(255,255,255);
       font-size:14px; font-weight:400; line-height:20px;
       text-align:center; vertical-align:middle; white-space:nowrap;
       overflow:visible; opacity:1; box-shadow:none; cursor:pointer;
       -webkit-user-select:none; user-select:none; outline-color:rgb(255,255,255); }
.btn-info  { background-color:rgb(91,192,222); border-color:rgb(70,184,218); }
.btn-primary{ background-color:rgb(51,122,183); border-color:rgb(46,109,164); }
.mt        { margin-top:10px; }
.btn-sm    { padding:5px 10px; border-radius:3px; font-size:12px; line-height:18px; }

/* explicit widths measured from the capture (text-driven; keep the font identical
   and they fall out naturally — listed so a diff can be asserted) */
button[ng-click="doInvite()"]          { width:150.641px; height:34px; }
button[ng-click="exportListToCSV()"]   { width:83.109px;  height:34px; }
button[ng-click="loadUsers()"]         { width:174.125px; height:34px; }
.col-sm-4 .dropdown                    { display:inline-block; vertical-align:middle;
                                         position:relative; top:0;right:0;bottom:0;left:0;
                                         width:148.094px; height:44px; }
.col-sm-4 .dropdown > .btn             { width:148.094px; height:34px; }
form.form-inline .btn-sm               { width:131.789px; height:30px; }
.users-many-actions .dropdown > .btn:nth-of-type(1) { width:179.727px; height:34px; }
.users-many-actions .dropdown > .btn:nth-of-type(2) { width:193.008px; height:34px; }

/* ---- label + input --------------------------------------------------- */
.control-label { display:inline-block; width:89.477px; height:20px; max-width:100%;
                 margin:0; padding:0; font-weight:700; vertical-align:middle;
                 cursor:default; color:rgb(51,51,51); }

.form-control  { display:inline-block; width:194px; height:34px; margin:0;
                 padding:6px 18px;                    /* NOT 12px — project override */
                 box-sizing:border-box;
                 border:1px solid rgb(219,217,217); border-radius:4px;
                 background-color:rgb(255,255,255); color:rgb(85,85,85);
                 font-size:14px; line-height:20px; vertical-align:middle;
                 overflow:clip; box-shadow:rgb(0,0,0) 0 0 0 0; cursor:text;
                 transition-property:border-color, box-shadow;
                 transition-duration:.15s, .15s; outline-color:rgb(85,85,85); }

/* ---- checkbox row ---------------------------------------------------- */
.checkbox label { display:inline-block; max-width:100%; min-height:20px;
                  padding-left:20px; margin-bottom:0; font-weight:400; cursor:pointer; }
.checkbox label:nth-of-type(1)          { width:78.328px;  height:20px; }
.checkbox label.checkbox-apply-to-all-rooms { width:140.852px; height:20px; margin-left:10px; }
.checkbox input[type="checkbox"] { position:absolute; width:13px; height:13px;
                                   margin-top:4px; margin-left:-20px;
                                   line-height:normal; cursor:default;
                                   -webkit-appearance:auto; appearance:auto; }
.checkbox label:nth-of-type(1) input[type="checkbox"]          { top:0; left:20px;      right:1755px;    bottom:3px; }
.checkbox label.checkbox-apply-to-all-rooms input[type=checkbox]{ top:0; left:112.227px; right:1662.77px; bottom:3px; }
.checkbox span { display:inline; cursor:pointer; }

/* ---- caret ----------------------------------------------------------- */
.caret { display:inline-block; width:8px; height:4px; margin:0; padding:0;
         border-top:4px dashed rgb(255,255,255);
         border-right:4px solid rgba(0,0,0,0);
         border-bottom:0 none rgb(255,255,255);
         border-left:4px solid rgba(0,0,0,0);
         color:rgb(255,255,255); text-align:center; vertical-align:middle;
         white-space:nowrap; cursor:pointer; -webkit-user-select:none; user-select:none; }

/* ---- font-awesome icons inside the visible buttons ------------------- */
.btn > .fa { display:inline-block; height:14px; font-family:FontAwesome; font-size:14px;
             line-height:14px; color:rgb(255,255,255); border-color:rgb(255,255,255);
             text-align:center; white-space:nowrap; cursor:pointer;
             -webkit-user-select:none; user-select:none;
             transform:matrix(1,0,0,1,0,0); }
.fa-user-plus { width:16px; }  .fa-floppy-o { width:12px; }  .fa-refresh { width:12px; }

/* ---- closed dropdown menus (0×0 in the baseline, styles recorded) ---- */
.dropdown-menu { display:none; position:absolute; top:100%; left:0; z-index:1000;
                 min-width:160px; margin-top:2px; padding:5px 0;
                 border:1px solid rgba(0,0,0,.15); border-radius:2px;
                 background-color:rgb(255,255,255); background-clip:padding-box;
                 font-size:13px; line-height:18.5714px; text-align:left;
                 box-shadow:rgba(0,0,0,.176) 0 6px 12px 0; list-style-type:none; }
.dropdown-menu > li          { display:list-item; font-size:13px; line-height:18.5714px;
                               text-align:left; list-style-type:none; }
.dropdown-menu > li > a      { display:block; padding:3px 20px; font-size:13px;
                               line-height:18.5714px; text-align:left; white-space:nowrap;
                               cursor:pointer; color:rgb(51,51,51); }
.dropdown-menu li.divider    { height:1px; margin:9px 0; background-color:rgb(229,229,229);
                               overflow:hidden; }
.dropdown-menu .fa           { display:inline-block; font-family:FontAwesome; font-size:13px;
                               line-height:13px; text-align:left; white-space:nowrap;
                               cursor:pointer; color:rgb(51,51,51); }
```

### 7.3 Geometry assertions (Playwright / screenshot diff)

Every value below is a direct rect from the capture.

```
fieldset                 x=37     y=361   w=1768     h=393.766
div.form-group           x=37     y=361   w=1768     h=0
  .col-sm-4.pull-right   x=1215.7 y=361   w=589.328  h=88
    Add User / Invite    x=1230.7 y=371   w=150.641  h=34
      i.fa-user-plus     x=1243.7 y=381   w=16       h=14
    Export               x=1385.2 y=371   w=83.109   h=34
      i.fa-floppy-o      x=1398.2 y=381   w=12       h=14
    Load / Reload Users  x=1472.2 y=371   w=174.125  h=34
      i.fa-refresh       x=1485.2 y=381   w=12       h=14
    div.dropdown         x=1230.7 y=405   w=148.094  h=44      <- wraps to line 2
      User List Actions  x=1230.7 y=415   w=148.094  h=34
        span.caret       x=1357.8 y=431.4 w=8        h=4
form.form-inline         x=37     y=361   w=1768     h=34
  .form-group            x=37     y=361   w=423.062  h=34
    label Search Users   x=37     y=368   w=89.477   h=20
    input[type=search]   x=130.4  y=361   w=194      h=34
    btn Search/Load      x=328.3  y=363   w=131.789  h=30
.users-many-actions      x=37     y=425   w=1768     h=64
  .checkbox              x=37     y=425   w=1768     h=20
    label(Select All)    x=37     y=425   w=78.328   h=20
      input[checkbox]    x=37     y=429   w=13       h=13
      span "Select All"  x=57     y=426.5 w=58.328   h=16.5
    label(apply-to-all)  x=129.2  y=425   w=140.852  h=20
      input[checkbox]    x=129.2  y=429   w=13       h=13
      span "Apply to…"   x=149.2  y=426.5 w=120.852  h=16.5
  span.dropdown          x=37     y=462.1 w=376.6    h=16.5
    Actions With Selected x=37    y=455   w=179.727  h=34
      span.caret         x=195.7  y=471.4 w=8        h=4
    Actions With Email   x=220.6  y=455   w=193.008  h=34
(next sibling: table)    x=37     y=489   w=1768     h=225.766
```

Cross-checks that must hold: `1215.7 + 589.328 = 1805.0` = fieldset right edge (`37 + 1768`). ✓
`425 + 64 = 489` = table top. ✓ `361 + 34 = 395`, `395 + 30 (margin-top) = 425`. ✓
Inter-button gap on the button row is `3.86px` (a single collapsed space at 14px Helvetica) —
`1230.7 + 150.641 = 1381.341`, next button at `1385.2`.

---

## 8. Honest gaps

1. **Both dropdown menus were closed at capture time.** `#465` and `#1294` are `display:none`, so all 20
   `li`, 19 `a` and 20 `i` inside them have `rect 0×0`. Their **computed styles are fully recorded** (and
   reproduced above), but their **rendered geometry is not in the capture** — do not claim menu widths,
   item heights or open-state positions from this evidence.
2. **Icon/text ordering inside closed menu items** is inferred from child index only (icon = child 0,
   the label is an untracked text node). The dump does not record text-node positions, so I cannot prove
   from a rect that the icon precedes the text. Flagged as inference, not evidence.
3. **FontAwesome glyphs are unrecoverable.** Every `::before` serialises as `"content":"\"\""`. The class
   names (`fa-user-plus`, `fa-floppy-o`, `fa-refresh`, `fa-ban`, `fa-mobile`, `fa-microphone`,
   `fa-credit-card`, `fa-trash-o`, `fa-trash`, `fa-user`, `fa-desktop`, `fa-cog`, `fa-user-md`,
   `fa-user-times`) are the only reliable identity.
4. **The `!checkedAllUsers` branch only.** `#1296` carries `ng-if="!checkedAllUsers"`; the sibling
   "deselect" span (if one exists in the template) was **not instantiated** at capture time and therefore
   does not appear in the dump. The un-checked state is the only state I have evidence for.
5. **`.form-group` margin.** The capture shows `margin-bottom: 0px` on both `.form-group` elements, i.e.
   the Bootstrap default 15px is overridden somewhere. I have the *result*, not the *rule* — the dump
   carries no stylesheet, so I cannot cite the selector that does it.
6. **`ng-enter` on `#459`** is a custom directive; its behaviour is not in the capture.
7. **No `.muted` and no `badge-danger` element exists anywhere in P06** (verified by grep over all 89
   records). Their "dead class" status is asserted in P07/P08 where they do occur, not here.
8. **No CSS custom properties, no flexbox, no grid** anywhere in P06 — confirmed from `INFO.txt`
   (`cssVars: {"root":{},"body":{}}`) and from `DEFAULTS.txt`, which reports `flex`, `flex-direction`,
   `flex-wrap`, `flex-grow`, `flex-shrink`, `flex-basis`, `align-items`, `align-self`, `justify-content`,
   `gap`, `order`, `grid-template-columns` as having **1 distinct value across all 2,156 nodes** (the
   initial value). Layout here is float + inline-block only.
