# ptr1 · P11 — M3 · Per-user row menu (`ul.dropdown-menu.dropdown-menu-right`)

> **Evidence base for this file (read in full, line by line):**
> `/tmp/ptr-decode/ptr1/caps/04-dropdown_dropdown-menu.dropdown-menu-right.show/{INFO.txt,DEFAULTS.txt,nodes-000.txt,nodes-001.txt}` (row 1, 128 nodes),
> `/tmp/ptr-decode/ptr1/caps/09-dropdown_dropdown-menu.dropdown-menu-right.show/{INFO.txt,DEFAULTS.txt,nodes-000.txt,nodes-001.txt}` (row 2, 128 nodes),
> `/tmp/ptr-decode/ptr1/caps/14-dropdown_dropdown-menu.dropdown-menu-right.show/{INFO.txt,DEFAULTS.txt,nodes-000.txt,nodes-001.txt}` (row 3, 128 nodes),
> `/tmp/ptr-decode/ptr1/caps/00-baseline-room/{INFO.txt,DEFAULTS.txt,nodes-000.txt … nodes-017.txt}` (full DOM, 2156 nodes),
> `/tmp/ptr-decode/ptr1/caps/19-forced-darkTheme/`, `/tmp/ptr-decode/ptr1/caps/20-forced-lightTheme/`, `/tmp/ptr-decode/ptr1/caps/21-final-room/` (theme deltas).
>
> **Every value below is a RESOLVED ABSOLUTE** — each capture's own `DEFAULTS.txt` COMMON table has been applied and then overridden by that node's printed `style-deviations`. Values that are *arithmetic derived* from captured numbers rather than captured directly are labelled **[DERIVED]**. Everything else is a direct read from the cited file.

---

## 1. Purpose

`M3` is the per-user "Actions" dropdown in the room's user-management table: one `ul[role=menu].dropdown-menu.dropdown-menu-right` per `ng-repeat="user in xrefs"` row, holding 4 submenu parents (Permissions, Granular Perms, App and Notifications, Badges) plus 6 direct actions separated by 3 dividers. It is the entry point for every per-user administrative operation in the app and is the only surface from which the four submenus (P12–P15) can be opened.

---

## 2. Trigger / parent item

### 2.1 The dropdown container (Angular-UI `dropdown` directive)

Baseline node `#1602`, path `r.0.1.1.0.1.3.1.0.0.3.1.1.4.0` (row 2) — `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-*.txt`:

```html
<div ng-hide="user.role==0"
     dropdown="dropdown"
     class="btn-group mb-sm mr"
     ng-init="submenuOpen={permissions:false, granular:false, app:false, badges:false}"
     on-toggle="!open && (submenuOpen={permissions:false, granular:false, app:false, badges:false})">
```

| row | baseline node | path | rect | class attr | resolved `display` |
|---|---|---|---|---|---|
| 1 | `#1570` | `r.0.1.1.0.1.3.1.0.0.3.1.0.4.0` | `x=0 y=0 w=0 h=0` | `btn-group mb-sm mr ng-hide` | **`none`** |
| 2 | `#1602` | `r.0.1.1.0.1.3.1.0.0.3.1.1.4.0` | `x=1527.2 y=599 w=88.7 h=34` | `btn-group mb-sm mr` | `inline-block` |
| 3 | `#1634` | `r.0.1.1.0.1.3.1.0.0.3.1.2.4.0` | `x=1527.2 y=661.4 w=88.7 h=34` | `btn-group mb-sm mr` | `inline-block` |

Resolved absolute style of the container (rows 2 & 3, from `#1602`/`#1634` deviations over the baseline COMMON table):
`display: inline-block; position: relative; top: 0px; right: 0px; bottom: 0px; left: 0px; z-index: auto; float: none; box-sizing: border-box; width: 88.7188px; height: 34px; min-width: 0px; max-width: none; min-height: 0px; max-height: none; margin: 0px 10px 5px 0px; padding: 0px; border-width: 0px; border-style: none; border-color: rgb(51,51,51); border-radius: 0px; background-color: rgba(0,0,0,0); background-image: none; background-clip: border-box; color: rgb(51,51,51); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 400; font-style: normal; line-height: 20px; letter-spacing: normal; text-align: start; text-transform: none; text-decoration-line: none; text-shadow: none; text-overflow: clip; white-space: normal; vertical-align: middle; word-break: normal; overflow-wrap: normal; overflow-x: visible; overflow-y: visible; opacity: 1; box-shadow: none; outline-style: none; outline-width: 3px; outline-color: rgb(51,51,51); cursor: auto; pointer-events: auto; user-select: auto; transition-property: all; transition-duration: 0s; transform: none; filter: none; object-fit: fill; list-style-type: disc; content: normal; resize: none; appearance: none; fill: rgb(0,0,0); stroke: none; visibility: visible`
For row 1 the same node resolves with `display: none` and every rect `0` (see §7).

### 2.2 The `Actions` trigger button

Baseline node `#1686`, path `r.0.1.1.0.1.3.1.0.0.3.1.1.4.0.0` (row 2):

```html
<button type="button" ng-disabled="disabled" dropdown-toggle=""
        class="btn dropdown-toggle btn-primary" aria-haspopup="true" aria-expanded="false">
  Actions <span class="caret"></span><span><span style="width: 107px; height: 107px; left: -10.6719px; top: -42.5px;"></span></span>
</button>
```

* `text: "Actions"` (`#1686`, `#1694`, `#1678`).
* **Opener:** `dropdown-toggle=""` — the Angular-UI Bootstrap `dropdownToggle` directive. There is **no `ng-click` and no `data-toggle` on this button**; the directive toggles the sibling `ul.dropdown-menu`'s `.show` class + inline `display:block`. `aria-expanded="false"` in the closed baseline; the open captures carry `class="dropdown-menu dropdown-menu-right show"` + `attr style = "display: block;"` (capture 04/09/14 `#0`).
* `on-toggle` on the parent container resets all four `submenuOpen.*` flags to `false` whenever the menu closes.

| row | node | rect |
|---|---|---|
| 1 | `#1678` | `x=0 y=0 w=0 h=0` (ancestor `display:none`) |
| 2 | `#1686` | `x=1527.2 y=599 w=88.7 h=34` |
| 3 | `#1694` | `x=1527.2 y=661.4 w=88.7 h=34` |

Resolved absolute style (rows 2 & 3):
`display: block` (COMMON `block`; blockified by `float:left`)`; visibility: visible; position: relative; top/right/bottom/left: 0px; z-index: auto; float: left; box-sizing: border-box; width: 88.7188px; height: 34px; min-width: 0px; max-width: none; min-height: 0px; max-height: none; margin: 0px; padding: 6px 12px 6px 12px; border-width: 1px 1px 1px 1px; border-style: solid; border-color: rgb(46,109,164); border-radius: 4px 4px 4px 4px; background-color: rgb(51,122,183); background-image: none; background-position: 0% 0%; background-size: auto; background-repeat: repeat; background-clip: border-box; color: rgb(255,255,255); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 400; font-style: normal; line-height: 20px; letter-spacing: normal; text-align: center; text-transform: none; text-decoration-line: none; text-shadow: none; text-overflow: clip; white-space: nowrap; vertical-align: middle; word-break: normal; overflow-wrap: normal; overflow-x: visible; overflow-y: visible; opacity: 1; box-shadow: none; outline-style: none; outline-width: 3px; outline-color: rgb(255,255,255); cursor: pointer; pointer-events: auto; user-select: none; transition-property: all; transition-duration: 0s; transform: none; filter: none; object-fit: fill; content: normal; resize: none; appearance: none; fill: rgb(0,0,0); stroke: none`
Box check: `20 (line-height) + 6 + 6 (padding) + 1 + 1 (border) = 34px` ✔ matches the captured `h=34`.

`span.caret` (`#1758`, path `…1.4.0.0.0`, row 2, rect `x=1594.9 y=615.4 w=8 h=4`):
`display: inline-block; width: 8px; height: 4px; border-top: 4px dashed rgb(255,255,255); border-right: 4px solid rgba(0,0,0,0); border-left: 4px solid rgba(0,0,0,0); border-bottom-width: 0px; border-bottom-style: none; border-bottom-color: rgb(255,255,255); color: rgb(255,255,255); text-align: center; white-space: nowrap; vertical-align: middle; outline-color: rgb(255,255,255); cursor: pointer; user-select: none` (row 3 `#1773`, rect `x=1594.9 y=677.8 w=8 h=4`).

The second `<span>` (`#1759` / `#1774`, rect `x=1602.9 y=607.5 w=0 h=16.5`) wraps `#1826` / `#1841`, a `<span style="width: 107px; height: 107px; left: -10.6719px; top: -42.5px;">` — a click-ripple element injected by a third-party "waves" style script. Not part of the menu; recorded here for completeness.

---

## 3. Item list in exact DOM order

Menu root path in the subtree captures is `r`; in the baseline full DOM it is `r.0.1.1.0.1.3.1.0.0.3.1.{0,1,2}.4.0.1`.
Rects below are from **capture 09 (row 2)** — the only geometry-bearing capture besides 14. Row-3 y-values (capture 14) are `+62.4px`; row 1 has **no geometry at all** (see §7).

| # | `path` | label (verbatim) | icon class(es) | directive verbatim | `rect` (row 2 / row 3) | divider | `updateUser` opcode |
|---|---|---|---|---|---|---|---|
| 0 | `r.0` → `r.0.0` | `Permissions` | `fa fa-shield` + `fa fa-caret-right pull-right` | `<li class="dropdown-submenu" ng-class="{open: submenuOpen.permissions}">` ; `<a href="" ng-click="submenuOpen.permissions=!submenuOpen.permissions; submenuOpen.granular=false; submenuOpen.app=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();">` | li `x=1417.7 y=641 w=197.2 h=24.6` / `y=703.4` | no | — |
| 1 | `r.1` → `r.1.0` | `Granular Perms` | `fa fa-sliders` + `fa fa-caret-right pull-right` | `<li class="dropdown-submenu" ng-class="{open: submenuOpen.granular}">` ; `<a href="" ng-click="submenuOpen.granular=!submenuOpen.granular; submenuOpen.permissions=false; submenuOpen.app=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();">` | li `x=1417.7 y=665.6 w=197.2 h=24.6` / `y=728` | no | — |
| 2 | `r.2` → `r.2.0` | `App and Notifications` | `fa fa-mobile` + `fa fa-caret-right pull-right` | `<li class="dropdown-submenu" ng-class="{open: submenuOpen.app}">` ; `<a href="" ng-click="submenuOpen.app=!submenuOpen.app; submenuOpen.permissions=false; submenuOpen.granular=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();">` | li `x=1417.7 y=690.1 w=197.2 h=24.6` / `y=752.5` | no | — |
| 3 | `r.3` → `r.3.0` | `Badges` | `fa fa-certificate` + `fa fa-caret-right pull-right` | `<li class="dropdown-submenu" ng-class="{open: submenuOpen.badges}">` ; `<a href="" ng-click="submenuOpen.badges=!submenuOpen.badges; submenuOpen.permissions=false; submenuOpen.granular=false; submenuOpen.app=false; $event.preventDefault(); $event.stopPropagation();">` | li `x=1417.7 y=714.7 w=197.2 h=24.6` / `y=777.1` | no | — |
| 4 | `r.4` | *(divider)* | — | `<li class="divider">` | `x=1417.7 y=748.3 w=197.2 h=1` / `y=810.7` | **yes** | — |
| 5 | `r.5` → `r.5.0` | `Set Note` | `fa fa-pencil-square-o` | `<a href="" ng-click="setNoteUser(user._id,user.userName,$index)">` | li `x=1417.7 y=758.3 w=197.2 h=24.6` / `y=820.7` | no | — |
| 6 | `r.6` → `r.6.0` | `Edit Username` | `fa fa-edit` | `<a href="" ng-click="editUsername(user._id, user.userName)">` | li `x=1417.7 y=782.9 w=197.2 h=24.6` / `y=845.2` | no | — |
| 7 | `r.7` → `r.7.0` | `Remove User` | `fa fa-trash` | `<a href="" ng-click="deleteParticipant(user.userName,user._id,$index)">` | li `x=1417.7 y=807.4 w=197.2 h=24.6` / `y=869.8` | no | — |
| 8 | `r.8` | *(divider)* | — | `<li class="divider">` | `x=1417.7 y=841 w=197.2 h=1` / `y=903.4` | **yes** | — |
| 9 | `r.9` → `r.9.0` | `Set/Change Password` | `fa fa-lock` | `<a href="" ng-click="setUserPW(user._id,user.userName,$index)">` | li `x=1417.7 y=851 w=197.2 h=24.6` / `y=913.4` | no | — |
| 10 | `r.10` → `r.10.0` | `Resend Welcome Email` | `fa fa-envelope` | `<a href="" ng-click="sendWelcomeEmail(user._id,user.userName,$index)">` | li `x=1417.7 y=875.6 w=197.2 h=24.6` / `y=937.9` | no | — |
| 11 | `r.11` | *(divider)* | — | `<li class="divider">` | `x=1417.7 y=909.1 w=197.2 h=1` / `y=971.5` | **yes** | — |
| 12 | `r.12` → `r.12.0` | `Pause / Pending` | `fa fa-pause` | `<a href="" ng-click="approveUser(user.userName,user._id,$index,'pending')">` | li `x=1417.7 y=919.1 w=197.2 h=24.6` / `y=981.5` | no | — |

**No `updateUser(...)` opcode appears at this level.** All 14 `updateUser` call-sites live inside the Permissions (P12) and Granular Perms (P13) submenus. Verified: `grep "updateUser" 04*/nodes-*.txt` returns only paths under `r.0.1.*` and `r.1.1.*`.

**No `ng-if` / `ng-show` / `ng-hide` exists on any of the 13 top-level `<li>`.** Every one of them is unconditional. The only conditionals inside the whole 128-node subtree are `ng-show="user.role !== 1"` (`r.1.1.0`), `ng-show="!user.denyArchivesAccess"` (`r.1.1.4`) and `ng-show="user.denyArchivesAccess"` (`r.1.1.5`) — all in the Granular Perms submenu (P13). The *menu as a whole* is gated one level up by `ng-hide="user.role==0"` on the `div.btn-group` (§2.1).

Icon geometry (row 2 / row 3 y):

| icon path | class | rect row 2 | rect row 3 |
|---|---|---|---|
| `r.0.0.0` | `fa fa-shield` | `x=1437.7 y=647 w=9.3 h=13` | `y=709.4` |
| `r.0.0.1` | `fa fa-caret-right pull-right` | `x=1590.2 y=644 w=4.6 h=13` | `y=706.4` |
| `r.1.0.0` | `fa fa-sliders` | `x=1437.7 y=671.6 w=11.1 h=13` | `y=734` |
| `r.1.0.1` | `fa fa-caret-right pull-right` | `x=1590.2 y=668.6 w=4.6 h=13` | `y=731` |
| `r.2.0.0` | `fa fa-mobile` | `x=1437.7 y=696.1 w=5.6 h=13` | `y=758.5` |
| `r.2.0.1` | `fa fa-caret-right pull-right` | `x=1590.2 y=693.1 w=4.6 h=13` | `y=755.5` |
| `r.3.0.0` | `fa fa-certificate` | `x=1437.7 y=720.7 w=11.1 h=13` | `y=783.1` |
| `r.3.0.1` | `fa fa-caret-right pull-right` | `x=1590.2 y=717.7 w=4.6 h=13` | `y=780.1` |
| `r.5.0.0` | `fa fa-pencil-square-o` | `x=1437.7 y=764.3 w=13 h=13` | `y=826.7` |
| `r.6.0.0` | `fa fa-edit` | `x=1437.7 y=788.9 w=13 h=13` | `y=851.2` |
| `r.7.0.0` | `fa fa-trash` | `x=1437.7 y=813.4 w=10.2 h=13` | `y=875.8` |
| `r.9.0.0` | `fa fa-lock` | `x=1437.7 y=857 w=8.4 h=13` | `y=919.4` |
| `r.10.0.0` | `fa fa-envelope` | `x=1437.7 y=881.6 w=13 h=13` | `y=943.9` |
| `r.12.0.0` | `fa fa-pause` | `x=1437.7 y=925.1 w=11.1 h=13` | `y=987.5` |

Alignment maths, fully consistent with the box model:
`icon.x 1437.7 = li.x 1417.7 + a.padding-left 20` ✔ — the leading icon sits flush at the `<a>` content-box left edge, i.e. **icon precedes the label text**.
`caret right edge 1590.2 + 4.648 = 1594.85 ≈ li.x 1417.7 + li.w 197.227 − a.padding-right 20 = 1594.93` ✔ — the `pull-right` caret is flush at the content-box right edge.

---

## 4. Node table — all 128 nodes

`renders` = the node has a non-zero layout box in **capture 09 / 14** (row 2 / row 3). In **capture 04 (row 1) NOT ONE of the 128 nodes renders** — every rect is `x=0 y=0 w=0 h=0` — because the whole `div.btn-group` ancestor is `ng-hide`/`display:none` (§7).
Rect column shows capture 09 (row 2); `—` means rect `0 0 0 0` in every capture.

| # | path | tag | class / key attrs | rect (cap 09) | renders |
|---|---|---|---|---|---|
| 0 | `r` | `ul` | `role="menu"` `dropdown-menu dropdown-menu-right show` `style="display: block;"` | `1416.7, 635, 199.2, 314.7` | yes |
| 1 | `r.0` | `li` | `dropdown-submenu` `ng-class="{open: submenuOpen.permissions}"` | `1417.7, 641, 197.2, 24.6` | yes |
| 2 | `r.1` | `li` | `dropdown-submenu` `ng-class="{open: submenuOpen.granular}"` | `1417.7, 665.6, 197.2, 24.6` | yes |
| 3 | `r.2` | `li` | `dropdown-submenu` `ng-class="{open: submenuOpen.app}"` | `1417.7, 690.1, 197.2, 24.6` | yes |
| 4 | `r.3` | `li` | `dropdown-submenu` `ng-class="{open: submenuOpen.badges}"` | `1417.7, 714.7, 197.2, 24.6` | yes |
| 5 | `r.4` | `li` | `divider` | `1417.7, 748.3, 197.2, 1` | yes |
| 6 | `r.5` | `li` | *(no attrs)* | `1417.7, 758.3, 197.2, 24.6` | yes |
| 7 | `r.6` | `li` | *(no attrs)* | `1417.7, 782.9, 197.2, 24.6` | yes |
| 8 | `r.7` | `li` | *(no attrs)* | `1417.7, 807.4, 197.2, 24.6` | yes |
| 9 | `r.8` | `li` | `divider` | `1417.7, 841, 197.2, 1` | yes |
| 10 | `r.9` | `li` | *(no attrs)* | `1417.7, 851, 197.2, 24.6` | yes |
| 11 | `r.10` | `li` | *(no attrs)* | `1417.7, 875.6, 197.2, 24.6` | yes |
| 12 | `r.11` | `li` | `divider` | `1417.7, 909.1, 197.2, 1` | yes |
| 13 | `r.12` | `li` | *(no attrs)* | `1417.7, 919.1, 197.2, 24.6` | yes |
| 14 | `r.0.0` | `a` | `href=""` + submenu toggle (Permissions) | `1417.7, 641, 197.2, 24.6` | yes |
| 15 | `r.0.1` | `ul` | `dropdown-menu` (Permissions submenu, closed) | — | **no** (`display:none`) |
| 16 | `r.1.0` | `a` | `href=""` + submenu toggle (Granular) | `1417.7, 665.6, 197.2, 24.6` | yes |
| 17 | `r.1.1` | `ul` | `dropdown-menu` (Granular submenu, closed) | — | **no** (`display:none`) |
| 18 | `r.2.0` | `a` | `href=""` + submenu toggle (App) | `1417.7, 690.1, 197.2, 24.6` | yes |
| 19 | `r.2.1` | `ul` | `dropdown-menu` (App submenu, closed) | — | **no** (`display:none`) |
| 20 | `r.3.0` | `a` | `href=""` + submenu toggle (Badges) | `1417.7, 714.7, 197.2, 24.6` | yes |
| 21 | `r.3.1` | `ul` | `dropdown-menu` (Badges submenu, closed, **0 children**) | — | **no** (`display:none`) |
| 22 | `r.5.0` | `a` | `href=""` `ng-click="setNoteUser(user._id,user.userName,$index)"` | `1417.7, 758.3, 197.2, 24.6` | yes |
| 23 | `r.6.0` | `a` | `href=""` `ng-click="editUsername(user._id, user.userName)"` | `1417.7, 782.9, 197.2, 24.6` | yes |
| 24 | `r.7.0` | `a` | `href=""` `ng-click="deleteParticipant(user.userName,user._id,$index)"` | `1417.7, 807.4, 197.2, 24.6` | yes |
| 25 | `r.9.0` | `a` | `href=""` `ng-click="setUserPW(user._id,user.userName,$index)"` | `1417.7, 851, 197.2, 24.6` | yes |
| 26 | `r.10.0` | `a` | `href=""` `ng-click="sendWelcomeEmail(user._id,user.userName,$index)"` | `1417.7, 875.6, 197.2, 24.6` | yes |
| 27 | `r.12.0` | `a` | `href=""` `ng-click="approveUser(user.userName,user._id,$index,'pending')"` | `1417.7, 919.1, 197.2, 24.6` | yes |
| 28 | `r.0.0.0` | `i` | `fa fa-shield` | `1437.7, 647, 9.3, 13` | yes |
| 29 | `r.0.0.1` | `i` | `fa fa-caret-right pull-right` | `1590.2, 644, 4.6, 13` | yes |
| 30 | `r.0.1.0` | `li` | *(no attrs)* — Make Presenter | — | no |
| 31 | `r.0.1.1` | `li` | *(no attrs)* — Make Admin | — | no |
| 32 | `r.0.1.2` | `li` | *(no attrs)* — Make Participant | — | no |
| 33 | `r.0.1.3` | `li` | *(no attrs)* — Make Trial | — | no |
| 34 | `r.0.1.4` | `li` | *(no attrs)* — MUTE Participant | — | no |
| 35 | `r.0.1.5` | `li` | *(no attrs)* — BAN | — | no |
| 36 | `r.0.1.6` | `li` | `divider` | — | no |
| 37 | `r.0.1.7` | `li` | *(no attrs)* — Unban | — | no |
| 38 | `r.0.1.8` | `li` | *(no attrs)* — Freshen Login Date | — | no |
| 39 | `r.1.0.0` | `i` | `fa fa-sliders` | `1437.7, 671.6, 11.1, 13` | yes |
| 40 | `r.1.0.1` | `i` | `fa fa-caret-right pull-right` | `1590.2, 668.6, 4.6, 13` | yes |
| 41 | `r.1.1.0` | `li` | `ng-show="user.role !== 1"` (rows 1–2) / **`+ class="ng-hide"` (row 3)** | — | no |
| 42 | `r.1.1.1` | `li` | `divider` | — | no |
| 43 | `r.1.1.2` | `li` | *(no attrs)* — Show User Count | — | no |
| 44 | `r.1.1.3` | `li` | *(no attrs)* — Hide User Count | — | no |
| 45 | `r.1.1.4` | `li` | `ng-show="!user.denyArchivesAccess"` | — | no |
| 46 | `r.1.1.5` | `li` | `ng-show="user.denyArchivesAccess"` `class="ng-hide"` | — | no (`display:none` in all 3 rows) |
| 47 | `r.1.1.6` | `li` | *(no attrs)* — Hide Pers User Data | — | no |
| 48 | `r.1.1.7` | `li` | *(no attrs)* — Don't Hide Pers User Data | — | no |
| 49 | `r.1.1.8` | `li` | `divider` | — | no |
| 50 | `r.1.1.9` | `li` | *(no attrs)* — Disallow User2User PM | — | no |
| 51 | `r.1.1.10` | `li` | *(no attrs)* — Allow User2User PM | — | no |
| 52 | `r.1.1.11` | `li` | `divider` | — | no |
| 53 | `r.2.0.0` | `i` | `fa fa-mobile` | `1437.7, 696.1, 5.6, 13` | yes |
| 54 | `r.2.0.1` | `i` | `fa fa-caret-right pull-right` | `1590.2, 693.1, 4.6, 13` | yes |
| 55 | `r.2.1.0` | `li` | *(no attrs)* — Get App PIN | — | no |
| 56 | `r.2.1.1` | `li` | *(no attrs)* — Show App Tokens | — | no |
| 57 | `r.2.1.2` | `li` | *(no attrs)* — Get FCM Tokens | — | no |
| 58 | `r.2.1.3` | `li` | `divider` | — | no |
| 59 | `r.2.1.4` | `li` | *(no attrs)* — PAUSE Mobile Notifs | — | no |
| 60 | `r.2.1.5` | `li` | *(no attrs)* — RESUME Mobile Notifs | — | no |
| 61 | `r.2.1.6` | `li` | *(no attrs)* — Remove Mobile Notifs | — | no |
| 62 | `r.2.1.7` | `li` | *(no attrs)* — Send Test Mobile Notifs | — | no |
| 63 | `r.2.1.8` | `li` | *(no attrs)* — Reset Mobile Notifs | — | no |
| 64 | `r.3.0.0` | `i` | `fa fa-certificate` | `1437.7, 720.7, 11.1, 13` | yes |
| 65 | `r.3.0.1` | `i` | `fa fa-caret-right pull-right` | `1590.2, 717.7, 4.6, 13` | yes |
| 66 | `r.5.0.0` | `i` | `fa fa-pencil-square-o` | `1437.7, 764.3, 13, 13` | yes |
| 67 | `r.6.0.0` | `i` | `fa fa-edit` | `1437.7, 788.9, 13, 13` | yes |
| 68 | `r.7.0.0` | `i` | `fa fa-trash` | `1437.7, 813.4, 10.2, 13` | yes |
| 69 | `r.9.0.0` | `i` | `fa fa-lock` | `1437.7, 857, 8.4, 13` | yes |
| 70 | `r.10.0.0` | `i` | `fa fa-envelope` | `1437.7, 881.6, 13, 13` | yes |
| 71 | `r.12.0.0` | `i` | `fa fa-pause` | `1437.7, 925.1, 11.1, 13` | yes |
| 72 | `r.0.1.0.0` | `a` | `ng-click="updateUser(1,user._id,user.userName,$index)"` — Make Presenter | — | no |
| 73 | `r.0.1.1.0` | `a` | `ng-click="updateUser(5,…)"` — Make Admin | — | no |
| 74 | `r.0.1.2.0` | `a` | `ng-click="updateUser(2,…)"` — Make Participant | — | no |
| 75 | `r.0.1.3.0` | `a` | `ng-click="updateUser(6,…)"` — Make Trial | — | no |
| 76 | `r.0.1.4.0` | `a` | `ng-click="updateUser(3,…)"` — MUTE Participant | — | no |
| 77 | `r.0.1.5.0` | `a` | `ng-click="updateUser(4,…)"` — BAN | — | no |
| 78 | `r.0.1.7.0` | `a` | `ng-click="updateUser(2,…)"` — Unban | — | no |
| 79 | `r.0.1.8.0` | `a` | `ng-click="updateUser(9,…)"` — Freshen Login Date | — | no |
| 80 | `r.1.1.0.0` | `a` | `ng-click="setPermissions(user)"` `data-toggle="modal"` `data-target="#permissionsModal"` | — | no |
| 81 | `r.1.1.2.0` | `a` | `ng-click="updateUser(8,…)"` — Show User Count | — | no |
| 82 | `r.1.1.3.0` | `a` | `ng-click="updateUser(7,…)"` — Hide User Count | — | no |
| 83 | `r.1.1.4.0` | `a` | `ng-click="updateUser(13,…)"` — Deny Archives Access | — | no |
| 84 | `r.1.1.5.0` | `a` | `ng-click="updateUser(14,…)"` — Allow Archives Access | — | no |
| 85 | `r.1.1.6.0` | `a` | `ng-click="updateUser(10,…)"` — Hide Pers User Data | — | no |
| 86 | `r.1.1.7.0` | `a` | `ng-click="updateUser(11,…)"` — Don't Hide Pers User Data | — | no |
| 87 | `r.1.1.9.0` | `a` | `ng-click="setUserRestrictPM(true,user._id,user.userName)"` | — | no |
| 88 | `r.1.1.10.0` | `a` | `ng-click="setUserRestrictPM(false,user._id,user.userName)"` | — | no |
| 89 | `r.2.1.0.0` | `a` | `ng-click="getAppPin(user.email,user.userName,$index)"` | — | no |
| 90 | `r.2.1.1.0` | `a` | `ng-click="showAlerterAppTokens(user.userName,user.alerterAppTokens)"` | — | no |
| 91 | `r.2.1.2.0` | `a` | `ng-click="getFCMTokens(user._id,user.userName,$index)"` | — | no |
| 92 | `r.2.1.4.0` | `a` | `ng-click="pauseUserNotifs(user._id,user.userName,$index,'pause')"` | — | no |
| 93 | `r.2.1.5.0` | `a` | `ng-click="pauseUserNotifs(user._id,user.userName,$index,'resume')"` | — | no |
| 94 | `r.2.1.6.0` | `a` | `ng-click="pauseUserNotifs(user._id,user.userName,$index,'unsub')"` | — | no |
| 95 | `r.2.1.7.0` | `a` | `ng-click="sendTestFCM(user._id,user.userName,$index)"` | — | no |
| 96 | `r.2.1.8.0` | `a` | `ng-click="resetFCMForuser(user._id,user.userName,$index)"` | — | no |
| 97 | `r.0.1.0.0.0` | `i` | `fa fa-microphone` | — | no |
| 98 | `r.0.1.0.0.1` | `i` | `fa fa-desktop` | — | no |
| 99 | `r.0.1.1.0.0` | `i` | `fa fa-cog` `aria-hidden="true"` | — | no |
| 100 | `r.0.1.1.0.1` | `i` | `fa fa-user-md` | — | no |
| 101 | `r.0.1.2.0.0` | `i` | `fa fa-user` | — | no |
| 102 | `r.0.1.3.0.0` | `i` | `fa fa-user` | — | no |
| 103 | `r.0.1.4.0.0` | `i` | `fa fa-user-times` | — | no |
| 104 | `r.0.1.5.0.0` | `i` | `fa fa-user-times` | — | no |
| 105 | `r.0.1.7.0.0` | `i` | `fa fa-user` | — | no |
| 106 | `r.0.1.8.0.0` | `i` | `fa fa-clock-o` | — | no |
| 107 | `r.1.1.2.0.0` | `i` | `fa fa-user-circle` — **no `::before` recorded** | — | no |
| 108 | `r.1.1.3.0.0` | `i` | `fa fa-user-circle` — **no `::before` recorded** | — | no |
| 109 | `r.1.1.4.0.0` | `i` | `fa fa-hdd-o` | — | no |
| 110 | `r.1.1.5.0.0` | `i` | `fa fa-hdd-o` | — | no |
| 111 | `r.1.1.6.0.0` | `i` | `fa fa-lock` | — | no |
| 112 | `r.1.1.7.0.0` | `i` | `fa fa-user` | — | no |
| 113 | `r.1.1.9.0.0` | `i` | `fa fa-comment-o` | — | no |
| 114 | `r.1.1.10.0.0` | `i` | `fa fa-comment-o` | — | no |
| 115 | `r.2.1.0.0.0` | `i` | `fa fa-mobile` | — | no |
| 116 | `r.2.1.1.0.0` | `i` | `fa fa-mobile` | — | no |
| 117 | `r.2.1.2.0.0` | `i` | `fa fa-mobile` `aria-hidden="true"` | — | no |
| 118 | `r.2.1.4.0.0` | `i` | `fa fa-mobile` `aria-hidden="true"` | — | no |
| 119 | `r.2.1.4.0.1` | `i` | **`fa fa fa-bell-o`** (duplicate `fa`) | — | no |
| 120 | `r.2.1.5.0.0` | `i` | `fa fa-mobile` `aria-hidden="true"` | — | no |
| 121 | `r.2.1.5.0.1` | `i` | `fa fa-play` | — | no |
| 122 | `r.2.1.6.0.0` | `i` | `fa fa-mobile` `aria-hidden="true"` | — | no |
| 123 | `r.2.1.6.0.1` | `i` | `fa fa-trash` | — | no |
| 124 | `r.2.1.7.0.0` | `i` | `fa fa-mobile` `aria-hidden="true"` | — | no |
| 125 | `r.2.1.7.0.1` | `i` | **`fa fa fa-bell-o`** (duplicate `fa`) | — | no |
| 126 | `r.2.1.8.0.0` | `i` | `fa fa-mobile` `aria-hidden="true"` | — | no |
| 127 | `r.2.1.8.0.1` | `i` | **`fa fa-reload`** — **no `::before` recorded** | — | no |

**Census (identical in all three captures):** `5 <ul>` + `43 <li>` + `35 <a>` + `45 <i>` = 128.
Breakdown of the 43 `<li>`: root 13 (4 submenu parents + 3 dividers + 6 actions) · Permissions 9 (8 items + 1 divider) · Granular 12 (9 items + 3 dividers) · App 9 (8 items + 1 divider) · Badges **0**.
Breakdown of the 35 `<a>`: root 10 · Permissions 8 · Granular 9 · App 8 · Badges 0.
Breakdown of the 45 `<i>`: root 14 (4×2 + 6×1) · Permissions 10 · Granular 8 · App 13 · Badges 0.

Nodes carrying `display:none` — capture 04 and 09: `r.0.1`, `r.1.1`, `r.2.1`, `r.3.1`, `r.1.1.5` (5 nodes). Capture 14: those five **plus `r.1.1.0`** (6 nodes).

---

## 5. Resolved computed style (absolute)

### 5.1 Menu container `ul.dropdown-menu.dropdown-menu-right.show` (`#0`, path `r`)

| prop | capture 04 (row 1, no layout) | capture 09 / 14 (rows 2 / 3, laid out) |
|---|---|---|
| display | `block` | `block` |
| visibility | `visible` | `visible` |
| position | `absolute` | `absolute` |
| top | `100%` *(specified)* | `34px` *(used)* |
| right | `0px` | `0px` |
| bottom | `auto` | `-316.703px` *(used)* |
| left | `auto` | `-110.508px` *(used)* |
| z-index | `1000` | `1000` |
| float | `none` | `none` |
| box-sizing | `border-box` | `border-box` |
| width | `auto` | `199.227px` |
| height | `auto` | `314.703px` |
| min-width | `160px` | `160px` |
| max-width / min-height / max-height | `none` / `0px` / `none` | same |
| margin-top / right / bottom / left | `2px` / `0px` / `0px` / `0px` | same |
| padding-top / right / bottom / left | `5px` / `0px` / `5px` / `0px` | same |
| border-top/right/bottom/left-width | `1px` ×4 | same |
| border-top/right/bottom/left-style | `solid` ×4 | same |
| border-top/right/bottom/left-color | `rgba(0, 0, 0, 0.15)` ×4 | same |
| border-*-radius (TL/TR/BL/BR) | `2px` ×4 | same |
| background-color | `rgb(255, 255, 255)` | same |
| background-image / position / size / repeat | `none` / `0% 0%` / `auto` / `repeat` | same |
| background-clip | `padding-box` | same |
| color | `rgb(51, 51, 51)` | same |
| font-family | `"Helvetica Neue", Helvetica, Arial, sans-serif` | same |
| font-size / font-weight / font-style | `13px` / `400` / `normal` | same |
| line-height | `18.5714px` | same |
| letter-spacing | `normal` | same |
| text-align | `left` | same |
| text-transform / text-decoration-line / text-shadow / text-overflow | `none` / `none` / `none` / `clip` | same |
| white-space | `normal` | same |
| vertical-align | `baseline` | same |
| word-break / overflow-wrap | `normal` / `normal` | same |
| overflow-x / overflow-y | `visible` / `visible` | same |
| opacity | `1` | same |
| box-shadow | `rgba(0, 0, 0, 0.176) 0px 6px 12px 0px` | same |
| outline-style / width / color | `none` / `3px` / `rgb(51, 51, 51)` | same |
| cursor | `auto` | same |
| pointer-events / user-select | `auto` / `auto` | same |
| transition-property / duration | `all` / `0s` | same |
| transform / filter / object-fit | `none` / `none` / `fill` | same |
| list-style-type | `none` | same |
| content / resize / appearance | `normal` / `none` / `none` | same |
| fill / stroke | `rgb(0, 0, 0)` / `none` | same |

Height verification from the captured parts: `10 items × 24.5703 + 3 dividers × (1 + 9 + 9) + 5 + 5 (padding) + 1 + 1 (border) = 245.703 + 57 + 10 + 2 = 314.703` ✔ exactly the captured `h=314.703px`.

### 5.2 Item `<li>` (non-divider) — e.g. `r.5` (`#6` cap 09)

`display: list-item; visibility: visible; position: static; top/right/bottom/left: auto; z-index: auto; float: none; box-sizing: border-box; width: 197.227px; height: 24.5703px; min-width: 0px; max-width: none; min-height: 0px; max-height: none; margin: 0px 0px 0px 0px; padding: 0px 0px 0px 0px; border-width: 0px ×4; border-style: none ×4; border-color: rgb(51,51,51) ×4; border-radius: 0px ×4; background-color: rgba(0,0,0,0); background-image: none; background-position: 0% 0%; background-size: auto; background-repeat: repeat; background-clip: border-box; color: rgb(51,51,51); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 400; font-style: normal; line-height: 18.5714px; letter-spacing: normal; text-align: left; text-transform: none; text-decoration-line: none; text-shadow: none; text-overflow: clip; white-space: normal; vertical-align: baseline; word-break: normal; overflow-wrap: normal; overflow-x: visible; overflow-y: visible; opacity: 1; box-shadow: none; outline-style: none; outline-width: 3px; outline-color: rgb(51,51,51); cursor: auto; pointer-events: auto; user-select: auto; transition-property: all; transition-duration: 0s; transform: none; filter: none; object-fit: fill; list-style-type: none; content: normal; resize: none; appearance: none; fill: rgb(0,0,0); stroke: none`

The four `li.dropdown-submenu` (`r.0`–`r.3`) are identical except `position: relative` and, in cap 09/14, the used offsets `top: 0px; right: 0px; bottom: 0px; left: 0px`.

### 5.3 Divider `<li class="divider">` — `r.4`, `r.8`, `r.11` (and `r.0.1.6`, `r.1.1.1`, `r.1.1.8`, `r.1.1.11`, `r.2.1.3`)

Same as §5.2 except: `height: 1px; margin-top: 9px; margin-bottom: 9px; background-color: rgb(229, 229, 229); overflow-x: hidden; overflow-y: hidden` (width `197.227px` in cap 09/14). Total vertical footprint `1 + 9 + 9 = 19px`.

### 5.4 Item `<a>` — e.g. `r.0.0` (`#14` cap 09)

`display: block; visibility: visible; position: static; top/right/bottom/left: auto; z-index: auto; float: none; box-sizing: border-box; width: 197.227px; height: 24.5703px; min-width: 0px; max-width: none; min-height: 0px; max-height: none; margin: 0px ×4; padding-top: 3px; padding-right: 20px; padding-bottom: 3px; padding-left: 20px; border-width: 0px ×4; border-style: none ×4; border-color: rgb(51,51,51) ×4; border-radius: 0px ×4; background-color: rgba(0,0,0,0); background-clip: border-box; color: rgb(51, 51, 51); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 400; font-style: normal; line-height: 18.5714px; letter-spacing: normal; text-align: left; text-transform: none; text-decoration-line: none; text-shadow: none; text-overflow: clip; white-space: nowrap; vertical-align: baseline; word-break: normal; overflow-wrap: normal; overflow-x: visible; overflow-y: visible; opacity: 1; box-shadow: none; outline-style: none; outline-width: 3px; outline-color: rgb(51, 51, 51); cursor: pointer; pointer-events: auto; user-select: auto; transition-property: all; transition-duration: 0s; transform: none; filter: none; object-fit: fill; list-style-type: none; content: normal; resize: none; appearance: none; fill: rgb(0,0,0); stroke: none`

Height check: `18.5714 + 3 + 3 = 24.5714 ≈ 24.5703px` captured (sub-pixel rounding). Line-height ratio `18.5714 / 13 = 1.428569…`.

### 5.5 Leading icon `<i class="fa fa-…">` — e.g. `r.0.0.0` (`#28` cap 09)

`display: inline-block; visibility: visible; position: static; float: none; box-sizing: border-box; width: 9.28906px; height: 13px; margin: 0px ×4; padding: 0px ×4; border-width: 0px ×4; background-color: rgba(0,0,0,0); color: rgb(51, 51, 51); font-family: FontAwesome; font-size: 13px; font-weight: 400; font-style: normal; line-height: 13px; text-align: left; white-space: nowrap; vertical-align: baseline; overflow: visible; opacity: 1; box-shadow: none; cursor: pointer; user-select: auto; transform: matrix(1, 0, 0, 1, 0, 0); list-style-type: none`
`::before` = `{"content":"\"\"","color":"rgb(51, 51, 51)","font-family":"FontAwesome","font-size":"13px","background-color":"rgba(0, 0, 0, 0)"}`
Per-icon captured widths (cap 09): shield `9.28906`, sliders `11.1484`, mobile `5.57812`, certificate `11.1484`, pencil-square-o `13`, edit `13`, trash `10.2188`, lock `8.35938`, envelope `13`, pause `11.1484`. Height `13px` for all.

### 5.6 Caret `<i class="fa fa-caret-right pull-right">` — `r.0.0.1` etc. (`#29` cap 09)

Same as §5.5 except: `display: block` (blockified by the float); `float: right`; `width: 4.64844px`; `height: 13px`; `margin-left: 3.9px` (= `.3em × 13px`); `margin-right/top/bottom: 0px`.

### 5.7 Closed submenu `<ul class="dropdown-menu">` — `r.0.1`, `r.1.1`, `r.2.1`, `r.3.1` (`#15/#17/#19/#21`)

Identical in all three captures and to §5.1 **except**: `display: none`; `top: 100%`; **`left: 0px`**; `right: auto`; `bottom: auto`; `width: auto`; `height: auto`.

> **This is the single most important layout fact for the submenus.** There is **no** `.dropdown-submenu > .dropdown-menu { top: 0; left: 100% }` rule in this build — the computed offsets are `top: 100%; left: 0`. Combined with `position: relative` on the `li.dropdown-submenu` (§5.2), **each submenu opens *directly below* its parent row, left-aligned with the parent `<li>`, offset by `margin-top: 2px`** — it does not fly out to the side.

### 5.8 Theme invariance — hard evidence

`/tmp/ptr-decode/ptr1/caps/19-forced-darkTheme/IDENTICAL-TO-BASELINE.txt` line 1: *"2155 of 2156 nodes are byte-identical to baseline-room (rect, attrs, tag, text, ::before, ::after, and ALL computed style props)."* The single differing node is `#0 path=r <body>`, `attr class: "footer-hidden" -> "footer-hidden darkTheme"` (`19-forced-darkTheme/nodes-000.txt`). `20-forced-lightTheme` is identical in form. `21-final-room/IDENTICAL-TO-BASELINE.txt`: 2156 of 2156 identical.
**⇒ The row menu renders identically in dark and light theme: white background, `#333` text, `#e5e5e5` dividers. No theme variant to build.**

---

## 6. Verbatim text (every string, with path)

| path | verbatim text |
|---|---|
| `r.0.0` | `Permissions` |
| `r.1.0` | `Granular Perms` |
| `r.2.0` | `App and Notifications` |
| `r.3.0` | `Badges` |
| `r.5.0` | `Set Note` |
| `r.6.0` | `Edit Username` |
| `r.7.0` | `Remove User` |
| `r.9.0` | `Set/Change Password` |
| `r.10.0` | `Resend Welcome Email` |
| `r.12.0` | `Pause / Pending` |
| `r.0.1.0.0` | `Make Presenter` |
| `r.0.1.1.0` | `Make Admin` |
| `r.0.1.2.0` | `Make Participant` |
| `r.0.1.3.0` | `Make Trial` |
| `r.0.1.4.0` | `MUTE Participant` |
| `r.0.1.5.0` | `BAN` |
| `r.0.1.7.0` | `Unban` |
| `r.0.1.8.0` | `Freshen Login Date` |
| `r.1.1.0.0` | `Adjust Mic/Cam/Screen/Chat/Notes` |
| `r.1.1.2.0` | `Show User Count` |
| `r.1.1.3.0` | `Hide User Count` |
| `r.1.1.4.0` | `Deny Archives Access` |
| `r.1.1.5.0` | `Allow Archives Access` |
| `r.1.1.6.0` | `Hide Pers User Data` |
| `r.1.1.7.0` | `Don't Hide Pers User Data` |
| `r.1.1.9.0` | `Disallow User2User PM` |
| `r.1.1.10.0` | `Allow User2User PM` |
| `r.2.1.0.0` | `Get App PIN` |
| `r.2.1.1.0` | `Show App Tokens` |
| `r.2.1.2.0` | `Get FCM Tokens` |
| `r.2.1.4.0` | `PAUSE Mobile Notifs` |
| `r.2.1.5.0` | `RESUME Mobile Notifs` |
| `r.2.1.6.0` | `Remove Mobile Notifs` |
| `r.2.1.7.0` | `Send Test Mobile Notifs` |
| `r.2.1.8.0` | `Reset Mobile Notifs` |
| baseline `…4.0.0` | `Actions` (trigger button) |

**Truncation:** none. `INFO.txt` for captures 04/09/14 all say `node count : 128 (declared 128, truncated=false)`; no `…` ellipsis and no `truncat` marker appears anywhere in the node files (`grep` over all 15 menu/submenu node files returned zero hits). `Don't` uses ASCII apostrophe `U+0027` (verified by `od -c`).
The 35 `text:` values are all 35 `<a>` elements — the 43 `<li>`, 5 `<ul>` and 45 `<i>` carry no text.

---

## 7. Three-row comparison — capture 04 vs 09 vs 14

### 7.1 Structural diff — verdict

Diffing all attributes, tags, texts, `::before` records and every non-geometric computed property across the three 128-node dumps yields **exactly ONE structural difference in the whole subtree**:

```
09 (row 2) → 14 (row 3), node #41 path=r.1.1.0 <li>
+   attr class = "ng-hide"
+     display: none
```

Everything else in `nodes-000.txt` differs only by rect/`top`/`left`/`bottom`/`width`/`height`/`transform` (pure geometry) — and `nodes-001.txt` (records 120–127) is **byte-identical** between 09 and 14 apart from the header line.
Capture 04 vs 09: **zero** attribute/text/class/style-value differences; capture 04 simply prints fewer deviation lines because none of its nodes have geometry.

### 7.2 The `display: list-item` counts — verified on MY menu

| capture | row | `DEFAULTS.txt` line 6 | reading |
|---|---|---|---|
| 04 | 1 | `display \| list-item \| 42/128 \| 4` | **42** |
| 09 | 2 | `display \| list-item \| 42/128 \| 4` | **42** |
| 14 | 3 | `display \| list-item \| 41/128 \| 4` | **41** |

Reconciles exactly with the census: `43 <li>` total, minus `r.1.1.5` (always `ng-hide`) = 42 for rows 1–2; minus additionally `r.1.1.0` (`ng-hide` only in row 3) = 41 for row 3.
The other three `display` values in the 4-value set: `block` (35 `<a>` + 1 root `<ul>` + 4 floated caret `<i>` = 40), `inline-block` (41 non-floated `<i>`), `none` (5 for rows 1–2 → 4 closed submenu `<ul>` + `r.1.1.5`; 6 for row 3). `42+40+41+5 = 128` ✔ ; `41+40+41+6 = 128` ✔.

> ⚠️ **Precision note:** 42/42/41 is the count of nodes whose computed `display` is `list-item`, i.e. *visible `<li>` elements across the entire menu **including all four closed submenus***. It is **not** the number of visible menu rows — the root menu itself always shows 13 `<li>` in all three rows.

### 7.3 What that one difference means — `user.role === 1` on row 3

`r.1.1.0` carries `ng-show="user.role !== 1"`. Angular adds `.ng-hide` when the expression is falsy. Row 3 has it → `user.role !== 1` is **false** → **row 3's user has `role === 1` (Presenter)**.
Independently confirmed in the full-DOM baseline (`00-baseline-room`), which contains all three menus' 127 descendants each:

| baseline node | path | attrs | display |
|---|---|---|---|
| `#1869` | `r.0.1.1.0.1.3.1.0.0.3.1.0.4.0.1.1.1.0` (row 1) | `ng-show="user.role !== 1"` | `list-item` |
| `#1913` | `r.0.1.1.0.1.3.1.0.0.3.1.1.4.0.1.1.1.0` (row 2) | `ng-show="user.role !== 1"` | `list-item` |
| `#1957` | `r.0.1.1.0.1.3.1.0.0.3.1.2.4.0.1.1.1.0` (row 3) | `ng-show="user.role !== 1"` **`class="ng-hide"`** | **`none`** |

Also common to all three rows: `#1874 / #1918 / #1962` (`ng-show="user.denyArchivesAccess"`) all carry `class="ng-hide"` → **all three users have `denyArchivesAccess` falsy**.

### 7.4 The row-1 geometry blackout — a real, evidenced finding

**Capture 04 has 0 non-zero rects out of 128.** Captures 09 and 14 have **38** each. Cause, with hard evidence:

* Baseline `#1570`, path `r.0.1.1.0.1.3.1.0.0.3.1.0.4.0`: `attr class = "btn-group mb-sm mr ng-hide"`, resolved `display: none`, rect `0 0 0 0`. The gating attribute is `ng-hide="user.role==0"`.
* Rows 2 and 3 (`#1602`, `#1634`) carry the same `ng-hide="user.role==0"` **without** the `ng-hide` class and render at `x=1527.2 y=599 / 661.4 w=88.7 h=34`.
* Corroborated on the same row: baseline `#1539`, path `…3.1.0.1.0` `<input type="checkbox" ng-show="user.role!==0" class="ng-hide">`, `display: none` — `user.role !== 0` is false.

**⇒ Row 1's user has `role === 0`.** Its entire Actions button + menu is inside a `display:none` ancestor, so when the capture harness forced `style="display: block;"` onto the row-1 `<ul>` it produced a fully-resolved computed style but **no layout boxes at all**. Every geometric value in capture 04 is therefore an honest gap, not a mismatch — and in the live app **row 1 shows no Actions button at all**.

### 7.5 Row 2 vs row 3 geometry — the row pitch

`Δy = +62.4px` for every single node (menu `y=635 → 697.4`; last item `y=919.1 → 981.5`). This matches the baseline row heights exactly: row 2 `<tr>` `#468` `y=590.5 h=62.3828`, row 3 `<tr>` `#469` `y=652.9 h=61.8828`, i.e. `652.9 − 590.5 = 62.4`. Widths, heights and x-coordinates are **identical to the last captured decimal** between rows 2 and 3 (`w=199.2 h=314.7`, `x=1416.7`).

### 7.6 The three baselines all carry the full menu

`grep -c` over `00-baseline-room/nodes-*.txt` for descendants of `…3.1.{0,1,2}.4.0.1.`: **127 / 127 / 127** — 128 nodes each with the root `<ul>`, exactly matching the three subtree captures. The three rows are provably three renders of one `ng-repeat="user in xrefs  "` template (note the two trailing spaces inside the `ng-repeat` expression, verbatim on `#467`/`#468`/`#469`).

---

## 8. Rebuild spec

### 8.1 HTML (Angular 1 source, reconstructed from the node dump)

```html
<!-- one per ng-repeat="user in xrefs  " row -->
<div ng-hide="user.role==0"
     dropdown="dropdown"
     class="btn-group mb-sm mr"
     ng-init="submenuOpen={permissions:false, granular:false, app:false, badges:false}"
     on-toggle="!open && (submenuOpen={permissions:false, granular:false, app:false, badges:false})">

  <button type="button" ng-disabled="disabled" dropdown-toggle=""
          class="btn dropdown-toggle btn-primary"
          aria-haspopup="true" aria-expanded="false">Actions <span class="caret"></span></button>

  <ul role="menu" class="dropdown-menu dropdown-menu-right">

    <li class="dropdown-submenu" ng-class="{open: submenuOpen.permissions}">
      <a href="" ng-click="submenuOpen.permissions=!submenuOpen.permissions; submenuOpen.granular=false; submenuOpen.app=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();"><i class="fa fa-shield"></i> Permissions <i class="fa fa-caret-right pull-right"></i></a>
      <ul class="dropdown-menu"><!-- P12: 9 <li> --></ul>
    </li>

    <li class="dropdown-submenu" ng-class="{open: submenuOpen.granular}">
      <a href="" ng-click="submenuOpen.granular=!submenuOpen.granular; submenuOpen.permissions=false; submenuOpen.app=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();"><i class="fa fa-sliders"></i> Granular Perms <i class="fa fa-caret-right pull-right"></i></a>
      <ul class="dropdown-menu"><!-- P13: 12 <li> --></ul>
    </li>

    <li class="dropdown-submenu" ng-class="{open: submenuOpen.app}">
      <a href="" ng-click="submenuOpen.app=!submenuOpen.app; submenuOpen.permissions=false; submenuOpen.granular=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();"><i class="fa fa-mobile"></i> App and Notifications <i class="fa fa-caret-right pull-right"></i></a>
      <ul class="dropdown-menu"><!-- P14: 9 <li> --></ul>
    </li>

    <li class="dropdown-submenu" ng-class="{open: submenuOpen.badges}">
      <a href="" ng-click="submenuOpen.badges=!submenuOpen.badges; submenuOpen.permissions=false; submenuOpen.granular=false; submenuOpen.app=false; $event.preventDefault(); $event.stopPropagation();"><i class="fa fa-certificate"></i> Badges <i class="fa fa-caret-right pull-right"></i></a>
      <ul class="dropdown-menu"></ul><!-- P15: EMPTY, 0 children -->
    </li>

    <li class="divider"></li>

    <li><a href="" ng-click="setNoteUser(user._id,user.userName,$index)"><i class="fa fa-pencil-square-o"></i> Set Note</a></li>
    <li><a href="" ng-click="editUsername(user._id, user.userName)"><i class="fa fa-edit"></i> Edit Username</a></li>
    <li><a href="" ng-click="deleteParticipant(user.userName,user._id,$index)"><i class="fa fa-trash"></i> Remove User</a></li>

    <li class="divider"></li>

    <li><a href="" ng-click="setUserPW(user._id,user.userName,$index)"><i class="fa fa-lock"></i> Set/Change Password</a></li>
    <li><a href="" ng-click="sendWelcomeEmail(user._id,user.userName,$index)"><i class="fa fa-envelope"></i> Resend Welcome Email</a></li>

    <li class="divider"></li>

    <li><a href="" ng-click="approveUser(user.userName,user._id,$index,'pending')"><i class="fa fa-pause"></i> Pause / Pending</a></li>
  </ul>
</div>
```

### 8.2 CSS (exact, from the resolved computed values)

```css
.btn-group.mb-sm.mr           { display:inline-block; position:relative; vertical-align:middle;
                                margin:0 10px 5px 0; box-sizing:border-box; }

.btn.dropdown-toggle.btn-primary {
  float:left; position:relative; box-sizing:border-box;
  width:88.7188px; height:34px;                 /* measured; = content + 12 + 2 */
  padding:6px 12px; margin:0;
  border:1px solid rgb(46,109,164); border-radius:4px;
  background-color:rgb(51,122,183); color:rgb(255,255,255);
  font:400 14px/20px "Helvetica Neue",Helvetica,Arial,sans-serif;
  text-align:center; white-space:nowrap; vertical-align:middle;
  cursor:pointer; user-select:none; outline:none;
}
.btn.dropdown-toggle .caret {
  display:inline-block; width:8px; height:4px; vertical-align:middle;
  border-top:4px dashed rgb(255,255,255);
  border-right:4px solid rgba(0,0,0,0);
  border-left:4px solid rgba(0,0,0,0);
  border-bottom:0 none rgb(255,255,255);
}

ul.dropdown-menu {
  display:none; position:absolute; top:100%; left:0; z-index:1000;
  box-sizing:border-box; min-width:160px; width:auto;
  margin:2px 0 0 0; padding:5px 0;
  list-style:none; text-align:left; white-space:normal;
  color:rgb(51,51,51); font:400 13px/18.5714px "Helvetica Neue",Helvetica,Arial,sans-serif;
  background-color:rgb(255,255,255); background-clip:padding-box;
  border:1px solid rgba(0,0,0,.15); border-radius:2px;
  box-shadow:rgba(0,0,0,.176) 0 6px 12px 0;
  cursor:auto; opacity:1; overflow:visible;
}
ul.dropdown-menu.dropdown-menu-right { right:0; left:auto; }
ul.dropdown-menu.show,
ul.dropdown-menu[style*="display: block"] { display:block; }

.dropdown-menu > li            { display:list-item; position:static; margin:0; padding:0;
                                 white-space:normal; cursor:auto; list-style:none; }
.dropdown-menu > li.dropdown-submenu { position:relative; }

.dropdown-menu > li > a {
  display:block; box-sizing:border-box;
  padding:3px 20px; margin:0; border:0;
  color:rgb(51,51,51); font:400 13px/18.5714px "Helvetica Neue",Helvetica,Arial,sans-serif;
  text-align:left; text-decoration:none; white-space:nowrap;
  background-color:rgba(0,0,0,0); cursor:pointer;
}

.dropdown-menu .divider {
  display:list-item; height:1px; margin:9px 0; padding:0;
  overflow:hidden; background-color:rgb(229,229,229);
  white-space:normal; cursor:auto;
}

.fa            { display:inline-block; font-family:FontAwesome; font-size:13px;
                 line-height:13px; font-style:normal; font-weight:400;
                 color:rgb(51,51,51); white-space:nowrap; }
.fa.pull-right { float:right; margin-left:3.9px; }   /* = .3em × 13px */
```

Derived positioning constants (all confirmed against captured rects):
`item row height 24.5703px` · `divider footprint 19px` · `menu chrome 12px (5+5 padding + 1+1 border)` · `icon column starts at li.x + 20` · `caret right edge at li.x + li.width − 20`.

### 8.3 Conditional logic — which items appear for which `user.role`

| gate | expression (verbatim) | location | observed effect |
|---|---|---|---|
| whole Actions control | `ng-hide="user.role==0"` | `div.btn-group` (baseline `#1570/#1602/#1634`) | `role === 0` ⇒ **no button, no menu** (row 1) |
| Adjust Mic/Cam/… item | `ng-show="user.role !== 1"` | `r.1.1.0` | `role === 1` (Presenter) ⇒ item hidden (row 3) |
| Deny Archives Access | `ng-show="!user.denyArchivesAccess"` | `r.1.1.4` | shown when access is currently allowed |
| Allow Archives Access | `ng-show="user.denyArchivesAccess"` | `r.1.1.5` | hidden in all three captured rows |

Every other item in the row menu — all 13 top-level `<li>` and the whole Permissions/App submenus — is **unconditional**. `role` values proven by this capture set: `0` (row 1), some value `≠0 and ≠1` (row 2), `1` (row 3).

### 8.4 Submenu open/close behaviour (from the `ng-click` expressions, verbatim)

Each submenu toggle sets its own flag with `!` and force-clears the other three, then calls `$event.preventDefault(); $event.stopPropagation();` — so:
* only **one** submenu can be open at a time (radio behaviour, not accordion);
* clicking the parent `<a>` never navigates (`href=""` + `preventDefault`) and never closes the outer menu (`stopPropagation` keeps the Angular-UI `dropdown` outside-click handler from firing);
* closing the outer menu resets all four flags via `on-toggle` on the container.
`ng-class="{open: submenuOpen.X}"` puts `.open` on the `li.dropdown-submenu` — that class is what the stylesheet must key the submenu's `display:block` off.

**[DERIVED]** Submenu anchor points, computed from the captured `li` rects + the captured submenu `position:absolute; top:100%; left:0; margin-top:2px`:

| submenu | row 2 top-left of submenu border box | row 3 |
|---|---|---|
| Permissions (`r.0.1`) | `x = 1417.7, y = 641 + 24.5703 + 2 = 667.57` | `y = 703.4 + 26.57 = 729.97` |
| Granular (`r.1.1`) | `x = 1417.7, y = 665.6 + 26.57 = 692.17` | `y = 728 + 26.57 = 754.57` |
| App (`r.2.1`) | `x = 1417.7, y = 690.1 + 26.57 = 716.67` | `y = 752.5 + 26.57 = 779.07` |
| Badges (`r.3.1`) | `x = 1417.7, y = 714.7 + 26.57 = 741.27` | `y = 777.1 + 26.57 = 803.67` |

---

## 9. Honest gaps

1. **Row 1 has zero geometry.** All 128 rects in capture 04 are `0 0 0 0` because the row-1 user has `role === 0` and the whole `div.btn-group` ancestor is `display:none`. This is not a capture failure — in the live app there is nothing to measure. Rows 2 and 3 supply the geometry.
2. **Submenu geometry is not captured anywhere.** In captures 04/09/14 the four submenu `<ul>` are `display:none` (rect `0 0 0 0`, and so are all 90 of their descendants). In the dedicated submenu captures (05–08, 10–13, 15–18) the submenu was forced to `display:block` while its parent menu had already closed, so those are *also* all-zero. **No submenu width, height, or item x/y exists in this evidence set.** The anchor points in §8.4 are arithmetic derivations, and the widths are unknown beyond the captured `min-width: 160px` floor and `width: auto` shrink-to-fit.
3. **Hover / focus / active / `.open` states are not captured.** The dumps hold one static computed style per node. There is no evidence for `.dropdown-menu > li > a:hover` colours, no `:focus` ring, no `.open > a` styling, and no evidence for what visual change `ng-class="{open: …}"` produces beyond making the submenu visible. Do not invent Bootstrap defaults here.
4. **FontAwesome glyph codepoints are not recoverable.** Every `::before` record serialises `content` as `"\"\""` — the PUA character did not survive transcoding. Only the class names are evidence; the actual glyph must come from the FontAwesome version this build ships.
5. **Text-node position inside multi-icon `<a>` is not directly captured.** The dump is element-only. For the 10 root-menu items the leading `<i>` measurably sits at the `<a>` content-box left edge (`x = li.x + 20`), which proves *icon → text* for those. For the submenu items that carry two icons (`r.0.1.0.0`, `r.0.1.1.0`, and the five `r.2.1.*` PAUSE/RESUME/Remove/Send-Test/Reset items) there are no rects, so whether the text sits between or after the two icons is **unknown**.
6. **Rendered pixels were never diffed.** This decode is DOM + computed-style only; no screenshot of the open menu exists in the evidence set. A pixel diff of a rebuilt menu against a real screenshot is still owed.
7. **Upstream icon bugs — 3 of the 45 `<i>` will render blank.** Exactly three `<i>` elements have **no `::before` record at all** while the other 42 do — meaning no FontAwesome rule matches them:
   * `r.2.1.8.0.1` `class="fa fa-reload"` (Reset Mobile Notifs) — `fa-reload` is not a FontAwesome 4 class. *(Known bug, confirmed.)*
   * `r.1.1.2.0.0` and `r.1.1.3.0.0` `class="fa fa-user-circle"` (Show / Hide User Count) — **new finding, not in the known-bug list**: `fa-user-circle` was introduced in FontAwesome 4.7; this deployment's build predates it, so both icons render blank.
   `class="fa fa fa-bell-o"` (`r.2.1.4.0.1`, `r.2.1.7.0.1`) **does** carry a `::before` — the duplicated `fa` token is harmless and the bell renders. *(Known bug, confirmed harmless.)*
8. **Row-2 user's exact `role` value is unknown.** Evidence proves only `role ≠ 0` (button renders) and `role ≠ 1` (Adjust Mic item shows). Nothing in this capture set pins it to 2, 5 or 6.
