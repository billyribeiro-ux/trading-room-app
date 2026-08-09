# ptr1 · P13 — M3.b · `Granular Perms` submenu (`ul.dropdown-menu`)

> **Evidence base for this file (read in full, line by line):**
> `/tmp/ptr-decode/ptr1/caps/06-dropdown_dropdown-menu.show/{INFO.txt,DEFAULTS.txt,nodes-000.txt}` (row 1, 30 nodes),
> `/tmp/ptr-decode/ptr1/caps/11-dropdown_dropdown-menu.show/{INFO.txt,DEFAULTS.txt,nodes-000.txt}` (row 2, 30 nodes),
> `/tmp/ptr-decode/ptr1/caps/16-dropdown_dropdown-menu.show/{INFO.txt,DEFAULTS.txt,nodes-000.txt}` (row 3, 30 nodes),
> plus the same subtree in place as `r.1.1.*` inside `04-/09-/14-dropdown_dropdown-menu.dropdown-menu-right.show`, and as `…4.0.1.1.1.*` in `00-baseline-room`.
>
> **All values are RESOLVED ABSOLUTE.** Capture 16 has a *different* `DEFAULTS.txt` COMMON row for `display` (`block`, not `list-item`), so its deviation lines read differently for the same underlying style — every value below has been resolved against its own capture's table before being written down. Arithmetic derivations are marked **[DERIVED]**.

---

## 1. Purpose

`M3.b` is the fine-grained permission submenu: it opens the media-permissions modal, toggles the user-count badge, grants or revokes archive access, hides or reveals the user's personal data, and switches user-to-user private messaging on or off. It is the **only** submenu in the row menu that contains conditional items — three `ng-show` gates, one of which is the single node that differs between the three user rows.

---

## 2. Trigger / parent item

The submenu is `r.1.1` inside the row menu; its parent item is `r.1` / `r.1.0`.

```html
<li class="dropdown-submenu" ng-class="{open: submenuOpen.granular}">
  <a href="" ng-click="submenuOpen.granular=!submenuOpen.granular; submenuOpen.permissions=false; submenuOpen.app=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();">
    <i class="fa fa-sliders"></i> Granular Perms <i class="fa fa-caret-right pull-right"></i>
  </a>
  <ul class="dropdown-menu"> … </ul>
</li>
```

| element | path (row-menu capture) | text | icon class | rect (cap 09, row 2) | rect (cap 14, row 3) |
|---|---|---|---|---|---|
| parent `<li>` | `r.1` | — | — | `x=1417.7 y=665.6 w=197.2 h=24.6` | `x=1417.7 y=728 w=197.2 h=24.6` |
| parent `<a>` | `r.1.0` | `Granular Perms` | — | `x=1417.7 y=665.6 w=197.2 h=24.6` | `x=1417.7 y=728 w=197.2 h=24.6` |
| leading icon | `r.1.0.0` | — | `fa fa-sliders` | `x=1437.7 y=671.6 w=11.1 h=13` | `x=1437.7 y=734 w=11.1 h=13` |
| caret | `r.1.0.1` | — | `fa fa-caret-right pull-right` | `x=1590.2 y=668.6 w=4.6 h=13` | `x=1590.2 y=731 w=4.6 h=13` |

Resolved style of the parent `<li>` (cap 09 `#2`): P11 §5.2 plus `position: relative; top/right/bottom/left: 0px; width: 197.227px; height: 24.5703px`.
Resolved style of the parent `<a>` (cap 09 `#16`): P11 §5.4 verbatim (`display:block; width:197.227px; height:24.5703px; padding:3px 20px`).
`i.fa-sliders` (cap 09 `#39`): `display:inline-block; width:11.1484px; height:13px; font-family:FontAwesome; font-size:13px; line-height:13px; color:rgb(51,51,51); transform:matrix(1,0,0,1,0,0)`; `::before {"content":"\"\"","color":"rgb(51, 51, 51)","font-family":"FontAwesome","font-size":"13px","background-color":"rgba(0, 0, 0, 0)"}`.
Caret (cap 09 `#40`): as above plus `display:block; float:right; width:4.64844px; margin-left:3.9px`.

**Opener:** the `ng-click` above — flips `submenuOpen.granular`, hard-clears the other three flags, `preventDefault()` + `stopPropagation()`. **No `data-toggle` on the parent.** The single `data-toggle`/`data-target` pair in this whole subtree is on the first *item* (see §3).

---

## 3. Item list in exact DOM order

Paths given as standalone-capture / in-row-menu (`r.1.1.` prefix).
**No rect exists for any node in this piece** — see §9 gap 1.

| # | path (standalone / in-menu) | label (verbatim) | icon class | `ng-click` / `data-*` verbatim | `ng-show` verbatim | divider | opcode |
|---|---|---|---|---|---|---|---|
| 0 | `r.0` / `r.1.1.0` | `Adjust Mic/Cam/Screen/Chat/Notes` | *(none — this item has NO icon)* | `ng-click="setPermissions(user)"` `data-toggle="modal"` `data-target="#permissionsModal"` | **`ng-show="user.role !== 1"`** | no | — |
| 1 | `r.1` / `r.1.1.1` | *(divider)* | — | — | — | **yes** | — |
| 2 | `r.2` / `r.1.1.2` | `Show User Count` | `fa fa-user-circle` ⚠ | `ng-click="updateUser(8,user._id,user.userName,$index)"` | none | no | **8** |
| 3 | `r.3` / `r.1.1.3` | `Hide User Count` | `fa fa-user-circle` ⚠ | `ng-click="updateUser(7,user._id,user.userName,$index)"` | none | no | **7** |
| 4 | `r.4` / `r.1.1.4` | `Deny Archives Access` | `fa fa-hdd-o` | `ng-click="updateUser(13,user._id,user.userName,$index)"` | **`ng-show="!user.denyArchivesAccess"`** | no | **13** |
| 5 | `r.5` / `r.1.1.5` | `Allow Archives Access` | `fa fa-hdd-o` | `ng-click="updateUser(14,user._id,user.userName,$index)"` | **`ng-show="user.denyArchivesAccess"`** (+ `class="ng-hide"` in all 3 rows) | no | **14** |
| 6 | `r.6` / `r.1.1.6` | `Hide Pers User Data` | `fa fa-lock` | `ng-click="updateUser(10,user._id,user.userName,$index)"` | none | no | **10** |
| 7 | `r.7` / `r.1.1.7` | `Don't Hide Pers User Data` | `fa fa-user` | `ng-click="updateUser(11,user._id,user.userName,$index)"` | none | no | **11** |
| 8 | `r.8` / `r.1.1.8` | *(divider)* | — | — | — | **yes** | — |
| 9 | `r.9` / `r.1.1.9` | `Disallow User2User PM` | `fa fa-comment-o` | `ng-click="setUserRestrictPM(true,user._id,user.userName)"` | none | no | — |
| 10 | `r.10` / `r.1.1.10` | `Allow User2User PM` | `fa fa-comment-o` | `ng-click="setUserRestrictPM(false,user._id,user.userName)"` | none | no | — |
| 11 | `r.11` / `r.1.1.11` | *(divider)* | — | — | — | **yes** | — |

Structural notes, all directly evidenced:

* **The Adjust item has no icon.** `r.0.0` (`#13` cap 06) has zero element children — the first `<i>` in the capture is `r.2.0.0` (`#22`). Every other item in this submenu has exactly one `<i>`. Do not add an icon in a rebuild.
* **`r.11` is a TRAILING divider.** It is the last child of the `<ul>` with nothing after it. Confirmed in cap 06/11/16 (`#12`, path `r.11`, last `<li>`) and in the row-menu captures (`#52`, path `r.1.1.11`, no `r.1.1.12` exists). This renders as a stray `1px` line + `9px` margins immediately above the menu's bottom `5px` padding. It is a real feature of the reference markup, not a decode artefact.
* **`r.1` is a LEADING-area divider** — it sits between the (conditional) Adjust item and the user-count pair, so when `user.role === 1` hides the Adjust item, the submenu opens with a divider as its **first visible child**.
* The **Deny / Allow Archives Access pair is swapped by `denyArchivesAccess`**: `r.4` shows when the flag is falsy, `r.5` when truthy. Exactly one of the two is ever visible.
* The **Show / Hide User Count pair (`8` / `7`) is NOT gated** — both render simultaneously, unconditionally.
* The **Hide / Don't-Hide Pers User Data pair (`10` / `11`) is NOT gated** — both render simultaneously.
* The **Disallow / Allow User2User PM pair is NOT gated** and does **not** use `updateUser`; it calls `setUserRestrictPM(true|false, user._id, user.userName)` — note the different argument list (**no `$index`**).

### 3.1 Opcode map — verified against this evidence

| opcode | label | path |
|---|---|---|
| **7** | `Hide User Count` | `r.3.0` |
| **8** | `Show User Count` | `r.2.0` |
| **10** | `Hide Pers User Data` | `r.6.0` |
| **11** | `Don't Hide Pers User Data` | `r.7.0` |
| **13** | `Deny Archives Access` | `r.4.0` |
| **14** | `Allow Archives Access` | `r.5.0` |

Matches the supplied map exactly (`7/8 hide/show user count · 10/11 personal data · 13/14 archives`). Note the **inverted numeric order** of the user-count pair: the *Show* item is opcode **8** and the *Hide* item is opcode **7** — easy to transpose in a rebuild.
Opcodes `1`–`6` and `9` are not used here (they are in P12). **Opcode `12` appears nowhere in the entire 128-node row-menu subtree** (`grep "updateUser(12" 04*/nodes-*.txt` → no hits) — confirmed unused.

---

## 4. Node table — all 30 nodes

Standalone captures 06 / 11 / 16. **`renders` is `no` for every node**: every rect is `x=0 y=0 w=0 h=0` (§9 gap 1). The two `display` columns are the resolved absolute values for rows 1–2 and for row 3.

| # | path | tag | class / attrs | `display` rows 1–2 | `display` row 3 | rect | renders |
|---|---|---|---|---|---|---|---|
| 0 | `r` | `ul` | `class="dropdown-menu show"` `style="display: block;"` | `block` | `block` | `0,0,0,0` | no |
| 1 | `r.0` | `li` | `ng-show="user.role !== 1"` · **row 3 adds `class="ng-hide"`** | `list-item` | **`none`** | `0,0,0,0` | no |
| 2 | `r.1` | `li` | `class="divider"` | `list-item` | `list-item` | `0,0,0,0` | no |
| 3 | `r.2` | `li` | *(none)* | `list-item` | `list-item` | `0,0,0,0` | no |
| 4 | `r.3` | `li` | *(none)* | `list-item` | `list-item` | `0,0,0,0` | no |
| 5 | `r.4` | `li` | `ng-show="!user.denyArchivesAccess"` | `list-item` | `list-item` | `0,0,0,0` | no |
| 6 | `r.5` | `li` | `ng-show="user.denyArchivesAccess"` `class="ng-hide"` | **`none`** | **`none`** | `0,0,0,0` | no |
| 7 | `r.6` | `li` | *(none)* | `list-item` | `list-item` | `0,0,0,0` | no |
| 8 | `r.7` | `li` | *(none)* | `list-item` | `list-item` | `0,0,0,0` | no |
| 9 | `r.8` | `li` | `class="divider"` | `list-item` | `list-item` | `0,0,0,0` | no |
| 10 | `r.9` | `li` | *(none)* | `list-item` | `list-item` | `0,0,0,0` | no |
| 11 | `r.10` | `li` | *(none)* | `list-item` | `list-item` | `0,0,0,0` | no |
| 12 | `r.11` | `li` | `class="divider"` | `list-item` | `list-item` | `0,0,0,0` | no |
| 13 | `r.0.0` | `a` | `href=""` `ng-click="setPermissions(user)"` `data-toggle="modal"` `data-target="#permissionsModal"` | `block` | `block` | `0,0,0,0` | no |
| 14 | `r.2.0` | `a` | `href=""` `ng-click="updateUser(8,user._id,user.userName,$index)"` | `block` | `block` | `0,0,0,0` | no |
| 15 | `r.3.0` | `a` | `href=""` `ng-click="updateUser(7,user._id,user.userName,$index)"` | `block` | `block` | `0,0,0,0` | no |
| 16 | `r.4.0` | `a` | `href=""` `ng-click="updateUser(13,user._id,user.userName,$index)"` | `block` | `block` | `0,0,0,0` | no |
| 17 | `r.5.0` | `a` | `href=""` `ng-click="updateUser(14,user._id,user.userName,$index)"` | `block` | `block` | `0,0,0,0` | no |
| 18 | `r.6.0` | `a` | `href=""` `ng-click="updateUser(10,user._id,user.userName,$index)"` | `block` | `block` | `0,0,0,0` | no |
| 19 | `r.7.0` | `a` | `href=""` `ng-click="updateUser(11,user._id,user.userName,$index)"` | `block` | `block` | `0,0,0,0` | no |
| 20 | `r.9.0` | `a` | `href=""` `ng-click="setUserRestrictPM(true,user._id,user.userName)"` | `block` | `block` | `0,0,0,0` | no |
| 21 | `r.10.0` | `a` | `href=""` `ng-click="setUserRestrictPM(false,user._id,user.userName)"` | `block` | `block` | `0,0,0,0` | no |
| 22 | `r.2.0.0` | `i` | `class="fa fa-user-circle"` — **no `::before` recorded** ⚠ | `inline-block` | `inline-block` | `0,0,0,0` | no |
| 23 | `r.3.0.0` | `i` | `class="fa fa-user-circle"` — **no `::before` recorded** ⚠ | `inline-block` | `inline-block` | `0,0,0,0` | no |
| 24 | `r.4.0.0` | `i` | `class="fa fa-hdd-o"` | `inline-block` | `inline-block` | `0,0,0,0` | no |
| 25 | `r.5.0.0` | `i` | `class="fa fa-hdd-o"` | `inline-block` | `inline-block` | `0,0,0,0` | no |
| 26 | `r.6.0.0` | `i` | `class="fa fa-lock"` | `inline-block` | `inline-block` | `0,0,0,0` | no |
| 27 | `r.7.0.0` | `i` | `class="fa fa-user"` | `inline-block` | `inline-block` | `0,0,0,0` | no |
| 28 | `r.9.0.0` | `i` | `class="fa fa-comment-o"` | `inline-block` | `inline-block` | `0,0,0,0` | no |
| 29 | `r.10.0.0` | `i` | `class="fa fa-comment-o"` | `inline-block` | `inline-block` | `0,0,0,0` | no |

Census: `1 <ul>` + `12 <li>` + `9 <a>` + `8 <i>` = 30 ✔ (`INFO.txt`: `node count : 30 (declared 30, truncated=false)`).
Cross-check with capture 06's `DEFAULTS.txt`: `display | list-item | 11/30 | 4` → 11 visible `<li>` (12 minus `r.5`); the other three values are `block` (9 `<a>` + 1 `<ul>` = 10), `inline-block` (8 `<i>`), `none` (1 = `r.5`); `11+10+8+1 = 30` ✔.
Capture 16's `DEFAULTS.txt`: `display | block | 10/30 | 4` → `block` is now the modal value (10), with `list-item` = 10, `inline-block` = 8, `none` = 2; `10+10+8+2 = 30` ✔.
`white-space | nowrap | 17/30` (cap 06) → the 9 `<a>` + 8 `<i>`; the remaining 13 (`<ul>` + 12 `<li>`) are `normal` ✔. `cursor | pointer | 17/30` → same split ✔.

**⚠ Two of the eight `<i>` have NO `::before` record at all** (`r.2.0.0`, `r.3.0.0` — both `fa fa-user-circle`), while the other six do. See §9 gap 6.

---

## 5. Resolved computed style (absolute)

### 5.1 Submenu container `ul.dropdown-menu` (`#0`, path `r`)

Identical byte-for-byte across captures 06, 11 and 16, and identical to the in-place closed node `r.1.1` (`#17`) of captures 04/09/14 apart from `display`.

| prop | value |
|---|---|
| display | `block` (forced open) / `none` (natural closed state, captures 04/09/14 `#17`) |
| visibility | `visible` |
| position | `absolute` |
| top | `100%` |
| right / bottom | `auto` / `auto` |
| **left** | **`0px`** |
| z-index | `1000` |
| float | `none` |
| box-sizing | `border-box` |
| width / height | `auto` / `auto` |
| min-width | `160px` |
| max-width / min-height / max-height | `none` / `0px` / `none` |
| margin-top / right / bottom / left | `2px` / `0px` / `0px` / `0px` |
| padding-top / right / bottom / left | `5px` / `0px` / `5px` / `0px` |
| border-width (T/R/B/L) | `1px` ×4 |
| border-style (T/R/B/L) | `solid` ×4 |
| border-color (T/R/B/L) | `rgba(0, 0, 0, 0.15)` ×4 |
| border-radius (TL/TR/BL/BR) | `2px` ×4 |
| background-color | `rgb(255, 255, 255)` |
| background-image / position / size / repeat / clip | `none` / `0% 0%` / `auto` / `repeat` / `padding-box` |
| color | `rgb(51, 51, 51)` |
| font-family | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| font-size / weight / style | `13px` / `400` / `normal` |
| line-height | `18.5714px` |
| letter-spacing | `normal` |
| text-align | `left` |
| text-transform / decoration-line / shadow / overflow | `none` / `none` / `none` / `clip` |
| white-space | `normal` |
| vertical-align | `baseline` |
| word-break / overflow-wrap | `normal` / `normal` |
| overflow-x / overflow-y | `visible` / `visible` |
| opacity | `1` |
| box-shadow | `rgba(0, 0, 0, 0.176) 0px 6px 12px 0px` |
| outline-style / width / color | `none` / `3px` / `rgb(51, 51, 51)` |
| cursor | `auto` |
| pointer-events / user-select | `auto` / `auto` |
| transition-property / duration | `all` / `0s` |
| transform / filter / object-fit | `none` / `none` / `fill` |
| list-style-type | `none` |
| content / resize / appearance | `normal` / `none` / `none` |
| fill / stroke | `rgb(0, 0, 0)` / `none` |

### 5.2 Item `<li>` (visible, non-divider) — `r.0` (rows 1–2), `r.2`, `r.3`, `r.4`, `r.6`, `r.7`, `r.9`, `r.10`

`display: list-item; visibility: visible; position: static; top/right/bottom/left: auto; z-index: auto; float: none; box-sizing: border-box; width: auto; height: auto; min-width: 0px; max-width: none; min-height: 0px; max-height: none; margin: 0px ×4; padding: 0px ×4; border-width: 0px ×4; border-style: none ×4; border-color: rgb(51,51,51) ×4; border-radius: 0px ×4; background-color: rgba(0,0,0,0); background-clip: border-box; color: rgb(51,51,51); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 400; font-style: normal; line-height: 18.5714px; letter-spacing: normal; text-align: left; text-transform: none; text-decoration-line: none; text-shadow: none; text-overflow: clip; white-space: normal; vertical-align: baseline; word-break: normal; overflow-wrap: normal; overflow-x: visible; overflow-y: visible; opacity: 1; box-shadow: none; outline-style: none; outline-width: 3px; outline-color: rgb(51,51,51); cursor: auto; pointer-events: auto; user-select: auto; transition-property: all; transition-duration: 0s; transform: none; filter: none; object-fit: fill; list-style-type: none; content: normal; resize: none; appearance: none; fill: rgb(0,0,0); stroke: none`

### 5.3 Hidden item `<li class="ng-hide">` — `r.5` (all rows) and `r.0` (row 3 only)

Identical to §5.2 except **`display: none`**. Every other computed property — including `background-color`, `color`, `font`, `white-space`, `cursor` — is byte-identical to the visible items (verified: `diff` of all non-`display` deviation lines between captures 06 and 16 produces **no output**).

### 5.4 Divider `<li class="divider">` — `r.1`, `r.8`, `r.11`

Same as §5.2 except: `height: 1px; margin-top: 9px; margin-bottom: 9px; background-color: rgb(229, 229, 229); overflow-x: hidden; overflow-y: hidden`. **[DERIVED]** vertical footprint `19px` each.

### 5.5 Item `<a>` — all 9

`display: block; visibility: visible; position: static; float: none; box-sizing: border-box; width: auto; height: auto; margin: 0px ×4; padding-top: 3px; padding-right: 20px; padding-bottom: 3px; padding-left: 20px; border-width: 0px ×4; border-style: none ×4; border-color: rgb(51,51,51) ×4; border-radius: 0px ×4; background-color: rgba(0,0,0,0); background-clip: border-box; color: rgb(51, 51, 51); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 400; font-style: normal; line-height: 18.5714px; letter-spacing: normal; text-align: left; text-transform: none; text-decoration-line: none; text-shadow: none; text-overflow: clip; white-space: nowrap; vertical-align: baseline; word-break: normal; overflow-wrap: normal; overflow-x: visible; overflow-y: visible; opacity: 1; box-shadow: none; outline-style: none; outline-width: 3px; outline-color: rgb(51, 51, 51); cursor: pointer; pointer-events: auto; user-select: auto; transition-property: all; transition-duration: 0s; transform: none; filter: none; object-fit: fill; list-style-type: none; content: normal; resize: none; appearance: none; fill: rgb(0,0,0); stroke: none`

Note: `r.0.0` (the modal-opening Adjust item) has **exactly the same** resolved style as the other eight — `data-toggle="modal"` adds no styling.

### 5.6 Icons `<i class="fa fa-…">` — all 8

`display: inline-block; visibility: visible; position: static; float: none; box-sizing: border-box; width: auto; height: auto; margin: 0px ×4; padding: 0px ×4; border-width: 0px ×4; background-color: rgba(0,0,0,0); color: rgb(51, 51, 51); font-family: FontAwesome; font-size: 13px; font-weight: 400; font-style: normal; line-height: 13px; letter-spacing: normal; text-align: left; white-space: nowrap; vertical-align: baseline; overflow-x: visible; overflow-y: visible; opacity: 1; box-shadow: none; cursor: pointer; pointer-events: auto; user-select: auto; transform: none; list-style-type: none; fill: rgb(0,0,0); stroke: none`

`::before` — present on 6 of 8, identical where present: `{"content":"\"\"","color":"rgb(51, 51, 51)","font-family":"FontAwesome","font-size":"13px","background-color":"rgba(0, 0, 0, 0)"}`.
**Absent on `r.2.0.0` and `r.3.0.0` (`fa fa-user-circle`)** — no FontAwesome rule matches, so those two icons paint nothing. See §9 gap 6.

### 5.7 Theme invariance

`19-forced-darkTheme/IDENTICAL-TO-BASELINE.txt` and `20-forced-lightTheme/IDENTICAL-TO-BASELINE.txt`: *"2155 of 2156 nodes are byte-identical to baseline-room (rect, attrs, tag, text, ::before, ::after, and ALL computed style props)"*; the only delta is `<body class>`. This submenu is theme-invariant.

---

## 6. Verbatim text (every string, with path)

| path (standalone / in-menu) | verbatim text |
|---|---|
| `r.0.0` / `r.1.1.0.0` | `Adjust Mic/Cam/Screen/Chat/Notes` |
| `r.2.0` / `r.1.1.2.0` | `Show User Count` |
| `r.3.0` / `r.1.1.3.0` | `Hide User Count` |
| `r.4.0` / `r.1.1.4.0` | `Deny Archives Access` |
| `r.5.0` / `r.1.1.5.0` | `Allow Archives Access` |
| `r.6.0` / `r.1.1.6.0` | `Hide Pers User Data` |
| `r.7.0` / `r.1.1.7.0` | `Don't Hide Pers User Data` |
| `r.9.0` / `r.1.1.9.0` | `Disallow User2User PM` |
| `r.10.0` / `r.1.1.10.0` | `Allow User2User PM` |

9 strings, one per `<a>`. The `<ul>`, the 12 `<li>` and the 8 `<i>` carry no text.
**Truncation: none.** `INFO.txt` of captures 06/11/16 all read `node count : 30 (declared 30, truncated=false)`; no ellipsis or truncation marker appears in any of the three files.
`Don't` uses the ASCII apostrophe `U+0027` — verified with `od -c` on the raw line: `D o n ' t   H i d e   P e r s   U s e r   D a t a`.
`Adjust Mic/Cam/Screen/Chat/Notes` uses plain `/` with no surrounding spaces. `User2User` is one token with a digit `2`. `Pers` is the abbreviation as-shipped — not `Personal`.

---

## 7. Three-row comparison — capture 06 vs 11 vs 16

### 7.1 Row 1 vs row 2 — byte-identical

```
$ diff 06-…/nodes-000.txt 11-…/nodes-000.txt
1c1
< FULL node dump — capture[6] dropdown:dropdown-menu.show — records 0..29 of 30
---
> FULL node dump — capture[11] dropdown:dropdown-menu.show — records 0..29 of 30

$ diff 06-…/DEFAULTS.txt 11-…/DEFAULTS.txt     # (no output)
```

### 7.2 Row 3 — exactly ONE difference in the whole 30-node subtree

Filtering out the `display` re-basing caused by capture 16's shifted COMMON row, the *only* real change is on node `#1`:

```
$ diff <(attrs/text/tag lines of 06) <(attrs/text/tag lines of 16)
4a5
>   attr class = "ng-hide"

$ diff <(non-display deviations of 06) <(non-display deviations of 16)
(no output)
```

| node | rows 1 & 2 | row 3 |
|---|---|---|
| `#1` `r.0` `<li>` — `Adjust Mic/Cam/Screen/Chat/Notes` | `ng-show="user.role !== 1"`, resolved `display: list-item` | `ng-show="user.role !== 1"` **`class="ng-hide"`**, resolved **`display: none`** |

Every other attribute, every text, every `::before`, and **every non-`display` computed property** is byte-identical across all three captures.

### 7.3 What it means, and the 42/42/41 verification

`ng-show="user.role !== 1"` + `.ng-hide` ⇒ `user.role !== 1` evaluated **false** ⇒ **row 3's user has `role === 1` (Presenter)**. A Presenter cannot have their mic/cam/screen/chat/notes permissions adjusted through this menu.

The prior finding is confirmed on my own captures, at the row-menu level where the counts are stated:

| capture | row | `DEFAULTS.txt` line 6 | visible `<li>` in the whole 128-node menu |
|---|---|---|---|
| 04 | 1 | `display \| list-item \| 42/128 \| 4` | **42** |
| 09 | 2 | `display \| list-item \| 42/128 \| 4` | **42** |
| 14 | 3 | `display \| list-item \| 41/128 \| 4` | **41** |

and the `display:none` node lists for those same captures are:
04 → `r.0.1`, `r.1.1`, `r.2.1`, `r.3.1`, `r.1.1.5` (5)
09 → `r.0.1`, `r.1.1`, `r.2.1`, `r.3.1`, `r.1.1.5` (5)
14 → `r.0.1`, `r.1.1`, `r.2.1`, `r.3.1`, `r.1.1.5`, **`r.1.1.0`** (6)
`43 <li> − 1 = 42` for rows 1–2; `43 − 2 = 41` for row 3 ✔. **The single node responsible for the 42→41 drop is `r.1.1.0` — the first item of THIS submenu.**

### 7.4 Independent confirmation from the full-DOM baseline

`00-baseline-room` contains all three rows' menus in place (127 descendants each):

| baseline node | path | attrs | resolved `display` |
|---|---|---|---|
| `#1869` | `…3.1.0.4.0.1.1.1.0` (row 1) | `ng-show="user.role !== 1"` | `list-item` |
| `#1913` | `…3.1.1.4.0.1.1.1.0` (row 2) | `ng-show="user.role !== 1"` | `list-item` |
| `#1957` | `…3.1.2.4.0.1.1.1.0` (row 3) | `ng-show="user.role !== 1"` **`class="ng-hide"`** | **`none`** |
| `#1874` | `…3.1.0.4.0.1.1.1.5` (row 1) | `ng-show="user.denyArchivesAccess"` `class="ng-hide"` | `none` |
| `#1918` | `…3.1.1.4.0.1.1.1.5` (row 2) | `ng-show="user.denyArchivesAccess"` `class="ng-hide"` | `none` |
| `#1962` | `…3.1.2.4.0.1.1.1.5` (row 3) | `ng-show="user.denyArchivesAccess"` `class="ng-hide"` | `none` |

**⇒ all three users currently have `denyArchivesAccess` falsy**, so `Deny Archives Access` (opcode 13) is the visible half of that pair in every captured row and `Allow Archives Access` (opcode 14) was never observed rendered.

### 7.5 Visible-item summary per row

| row | `user.role` | visible items | visible `<li>` of 12 |
|---|---|---|---|
| 1 | `0` (menu unreachable — see P11 §7.4) | 8 items + 3 dividers *(if it could be opened)* | 11 |
| 2 | `≠0`, `≠1` | Adjust · Show Count · Hide Count · Deny Archives · Hide Pers · Don't-Hide Pers · Disallow PM · Allow PM (8) + 3 dividers | 11 |
| 3 | `1` (Presenter) | Show Count · Hide Count · Deny Archives · Hide Pers · Don't-Hide Pers · Disallow PM · Allow PM (7) + 3 dividers | 10 |

---

## 8. Rebuild spec

### 8.1 HTML

```html
<ul class="dropdown-menu">
  <li ng-show="user.role !== 1">
    <a href="" ng-click="setPermissions(user)" data-toggle="modal" data-target="#permissionsModal">Adjust Mic/Cam/Screen/Chat/Notes</a>
  </li>

  <li class="divider"></li>

  <li><a href="" ng-click="updateUser(8,user._id,user.userName,$index)"><i class="fa fa-user-circle"></i> Show User Count</a></li>
  <li><a href="" ng-click="updateUser(7,user._id,user.userName,$index)"><i class="fa fa-user-circle"></i> Hide User Count</a></li>
  <li ng-show="!user.denyArchivesAccess"><a href="" ng-click="updateUser(13,user._id,user.userName,$index)"><i class="fa fa-hdd-o"></i> Deny Archives Access</a></li>
  <li ng-show="user.denyArchivesAccess"><a href="" ng-click="updateUser(14,user._id,user.userName,$index)"><i class="fa fa-hdd-o"></i> Allow Archives Access</a></li>
  <li><a href="" ng-click="updateUser(10,user._id,user.userName,$index)"><i class="fa fa-lock"></i> Hide Pers User Data</a></li>
  <li><a href="" ng-click="updateUser(11,user._id,user.userName,$index)"><i class="fa fa-user"></i> Don't Hide Pers User Data</a></li>

  <li class="divider"></li>

  <li><a href="" ng-click="setUserRestrictPM(true,user._id,user.userName)"><i class="fa fa-comment-o"></i> Disallow User2User PM</a></li>
  <li><a href="" ng-click="setUserRestrictPM(false,user._id,user.userName)"><i class="fa fa-comment-o"></i> Allow User2User PM</a></li>

  <li class="divider"></li><!-- trailing, no items after it — reproduce as-is -->
</ul>
```

The first item deliberately carries **no `<i>`** (evidenced: `r.0.0` has zero element children). Icon-then-text order is inferred from the measured root-menu items (§9 gap 3).

### 8.2 CSS

```css
.dropdown-submenu                    { position:relative; }
.dropdown-submenu > ul.dropdown-menu {
  display:none;
  position:absolute; top:100%; left:0; z-index:1000;
  box-sizing:border-box; min-width:160px; width:auto;
  margin:2px 0 0 0; padding:5px 0;
  list-style:none; text-align:left; white-space:normal;
  color:rgb(51,51,51); font:400 13px/18.5714px "Helvetica Neue",Helvetica,Arial,sans-serif;
  background-color:rgb(255,255,255); background-clip:padding-box;
  border:1px solid rgba(0,0,0,.15); border-radius:2px;
  box-shadow:rgba(0,0,0,.176) 0 6px 12px 0;
  cursor:auto; opacity:1; overflow:visible;
}
.dropdown-submenu.open > ul.dropdown-menu,
ul.dropdown-menu.show { display:block; }

.dropdown-menu > li      { display:list-item; position:static; margin:0; padding:0;
                           white-space:normal; cursor:auto; list-style:none; }
.dropdown-menu > li.ng-hide,
.dropdown-menu > li[ng-show]:not(.shown) { display:none; }   /* Angular .ng-hide semantics */
.dropdown-menu > li > a  { display:block; box-sizing:border-box; padding:3px 20px; margin:0; border:0;
                           color:rgb(51,51,51); text-decoration:none; white-space:nowrap;
                           font:400 13px/18.5714px "Helvetica Neue",Helvetica,Arial,sans-serif;
                           text-align:left; background-color:rgba(0,0,0,0); cursor:pointer; }
.dropdown-menu .divider  { display:list-item; height:1px; margin:9px 0; padding:0;
                           overflow:hidden; background-color:rgb(229,229,229);
                           white-space:normal; cursor:auto; }
.fa                      { display:inline-block; font-family:FontAwesome; font-size:13px;
                           line-height:13px; font-style:normal; font-weight:400;
                           color:rgb(51,51,51); white-space:nowrap; }
```

**[DERIVED]** rendered box height, using the item metrics measured in the row menu (`item 24.5703px`, `divider 19px`, `chrome 12px`):

| case | visible items | height |
|---|---|---|
| `role ∉ {0,1}`, `denyArchivesAccess` falsy (row 2) | 8 | `8 × 24.5703 + 3 × 19 + 12 = 265.56px` |
| `role === 1` (row 3) | 7 | `7 × 24.5703 + 3 × 19 + 12 = 240.99px` |
| `denyArchivesAccess` truthy | same counts (the pair swaps 1-for-1) | unchanged |

Width: `max(160px, shrink-to-fit)`; the longest string is `Adjust Mic/Cam/Screen/Chat/Notes` — but that item is the one that disappears for Presenters, so **the submenu is measurably narrower for `role === 1`**. The exact widths are not captured (§9 gap 1).

### 8.3 Conditional logic — which items appear for which `user.role` / flags

```
li[0]  Adjust Mic/Cam/Screen/Chat/Notes   visible ⟺ user.role !== 1
li[1]  divider                            always
li[2]  Show User Count       (opcode 8)   always
li[3]  Hide User Count       (opcode 7)   always
li[4]  Deny Archives Access  (opcode 13)  visible ⟺ !user.denyArchivesAccess
li[5]  Allow Archives Access (opcode 14)  visible ⟺  user.denyArchivesAccess
li[6]  Hide Pers User Data      (op 10)   always
li[7]  Don't Hide Pers User Data(op 11)   always
li[8]  divider                            always
li[9]  Disallow User2User PM              always   setUserRestrictPM(true, …)
li[10] Allow User2User PM                 always   setUserRestrictPM(false, …)
li[11] divider                            always   (trailing)
```

The whole submenu is additionally gated by the row menu itself (`ng-hide="user.role==0"` on the `div.btn-group`) and revealed by `submenuOpen.granular` on the parent `<li>` (P11 §8.4).

The `Adjust` item opens the shared modal `#permissionsModal` through Bootstrap's `data-toggle="modal"` **and** sets up its scope via `ng-click="setPermissions(user)"` — both must fire. That modal is captured separately as `/tmp/ptr-decode/ptr1/caps/01-modal_permissionsModal/` and is **out of scope for this piece**.

---

## 9. Honest gaps

1. **No geometry whatsoever.** All 30 rects are `x=0 y=0 w=0 h=0` in captures 06, 11 **and** 16. Cause: the harness forced `style="display: block;"` onto the submenu `<ul>` after the parent row menu had reverted to `display:none`, so nothing was laid out. Submenu width, height and per-item x/y are **unknown**; the `265.56 / 240.99px` figures in §8.2 are arithmetic from row-menu metrics, not measurements.
2. **Hover / focus / `.open` styling is not captured.** No `:hover` background, no focus ring, no evidence of what `.open` looks like beyond revealing the submenu.
3. **Text position inside each `<a>` is not directly captured** for this submenu (element-only dump, no rects). Every item here has at most one icon, so the ambiguity is only "icon before or after the label"; §8.1 places it before, matching the *measured* root-menu items where `icon.x = li.x + a.padding-left` (P11 §3). Flagged as inference.
4. **FontAwesome glyph codepoints unrecoverable.** Every `::before` serialises `content` as `"\"\""`.
5. **`Allow Archives Access` was never observed in a rendered state.** All three captured users have `denyArchivesAccess` falsy, so only the `Deny` half of the pair was ever visible. Its markup is fully captured, but nothing in this evidence set shows it rendered.
6. **⚠ Upstream icon bug — `fa fa-user-circle` renders blank.** `r.2.0.0` (`Show User Count`) and `r.3.0.0` (`Hide User Count`) are the **only** two `<i>` in this submenu with **no `::before` record**, while the other six have one. `fa-user-circle` was introduced in FontAwesome **4.7**; this deployment's FontAwesome build predates it, so both icons paint nothing and the two labels sit at the same left offset as icon-bearing items with a blank gutter. **This is a new finding — it was not in the supplied known-bug list** (which named only `fa fa-reload` and the duplicated `fa fa fa-bell-o`). Verified by scanning every `<i>` record in captures 04, 05, 06, 07, 09 and 14 for a missing `::before`: the complete set of offenders across the whole row menu is `fa fa-user-circle` ×2 (here) and `fa fa-reload` ×1 (in P14).
7. **No rendered screenshot.** This decode is DOM + computed-style only; no pixel diff has been performed.
8. **Row-2 user's exact role value is unknown** — proven only to be `≠0` and `≠1`.
9. **The `#permissionsModal` target is not decoded here.** Its capture (`01-modal_permissionsModal`) is a separate piece; this file asserts only that the item carries `data-toggle="modal"` `data-target="#permissionsModal"` and `ng-click="setPermissions(user)"`.
