# ptr1 · P12 — M3.a · `Permissions` submenu (`ul.dropdown-menu`)

> **Evidence base for this file (read in full, line by line):**
> `/tmp/ptr-decode/ptr1/caps/05-dropdown_dropdown-menu.show/{INFO.txt,DEFAULTS.txt,nodes-000.txt}` (row 1, 28 nodes),
> `/tmp/ptr-decode/ptr1/caps/10-dropdown_dropdown-menu.show/{INFO.txt,DEFAULTS.txt,nodes-000.txt}` (row 2, 28 nodes),
> `/tmp/ptr-decode/ptr1/caps/15-dropdown_dropdown-menu.show/{INFO.txt,DEFAULTS.txt,nodes-000.txt}` (row 3, 28 nodes),
> plus the same subtree seen in-place as `r.0.1.*` inside `04-/09-/14-dropdown_dropdown-menu.dropdown-menu-right.show` and as `…4.0.1.0.1.*` in `00-baseline-room`.
>
> **All values are RESOLVED ABSOLUTE** (each capture's own `DEFAULTS.txt` COMMON table applied, then overridden by that node's `style-deviations`). Arithmetic derivations are marked **[DERIVED]**.

---

## 1. Purpose

`M3.a` is the role-and-sanction submenu of the per-user row menu: it changes the user's `role` (Presenter / Admin / Participant / Trial), applies the two sanctions (MUTE, BAN), and — below a divider — reverses a ban and refreshes the login timestamp. Every one of its eight items is a single `updateUser(opcode, user._id, user.userName, $index)` call, making it the densest opcode surface in the app.

---

## 2. Trigger / parent item

The submenu is `r.0.1` inside the row menu; its parent item is `r.0` / `r.0.0` (see `ptr1-P11-menu-user-row.md` §3 row 0).

```html
<li class="dropdown-submenu" ng-class="{open: submenuOpen.permissions}">
  <a href="" ng-click="submenuOpen.permissions=!submenuOpen.permissions; submenuOpen.granular=false; submenuOpen.app=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();">
    <i class="fa fa-shield"></i> Permissions <i class="fa fa-caret-right pull-right"></i>
  </a>
  <ul class="dropdown-menu"> … </ul>
</li>
```

| element | path (row-menu capture) | text | icon class | rect (cap 09, row 2) | rect (cap 14, row 3) |
|---|---|---|---|---|---|
| parent `<li>` | `r.0` | — | — | `x=1417.7 y=641 w=197.2 h=24.6` | `x=1417.7 y=703.4 w=197.2 h=24.6` |
| parent `<a>` | `r.0.0` | `Permissions` | — | `x=1417.7 y=641 w=197.2 h=24.6` | `x=1417.7 y=703.4 w=197.2 h=24.6` |
| leading icon | `r.0.0.0` | — | `fa fa-shield` | `x=1437.7 y=647 w=9.3 h=13` | `x=1437.7 y=709.4 w=9.3 h=13` |
| caret | `r.0.0.1` | — | `fa fa-caret-right pull-right` | `x=1590.2 y=644 w=4.6 h=13` | `x=1590.2 y=706.4 w=4.6 h=13` |

Resolved style of the parent `<li>` (cap 09 `#1`): as P11 §5.2 plus `position: relative; top: 0px; right: 0px; bottom: 0px; left: 0px; width: 197.227px; height: 24.5703px`.
Resolved style of the parent `<a>` (cap 09 `#14`): P11 §5.4 verbatim.
Resolved style of `i.fa-shield` (cap 09 `#28`): `display:inline-block; width:9.28906px; height:13px; font-family:FontAwesome; font-size:13px; line-height:13px; color:rgb(51,51,51); transform:matrix(1,0,0,1,0,0)`; `::before {"content":"\"\"","color":"rgb(51, 51, 51)","font-family":"FontAwesome","font-size":"13px","background-color":"rgba(0, 0, 0, 0)"}`.
Resolved style of the caret (cap 09 `#29`): as above plus `display:block; float:right; width:4.64844px; margin-left:3.9px`.

**Opener:** the `ng-click` above. There is **no `data-toggle`** on this parent. The expression flips `submenuOpen.permissions`, hard-clears `submenuOpen.granular/app/badges`, then `preventDefault()` (the `href=""` must not navigate) and `stopPropagation()` (so the Angular-UI `dropdown` outside-click handler does not close the whole row menu). `ng-class="{open: submenuOpen.permissions}"` is what puts `.open` on the `<li>`.

---

## 3. Item list in exact DOM order

Paths are the standalone-capture paths (`r.…`); the in-row-menu path is `r.0.1.…` (add the `0.1` prefix).
**No rect exists for any node in this piece** — see §9 gap 1.

| # | path (standalone / in-menu) | label (verbatim) | icon class(es) | `ng-click` verbatim | `ng-if`/`ng-show`/`ng-hide` | divider | opcode |
|---|---|---|---|---|---|---|---|
| 0 | `r.0` / `r.0.1.0` | `Make Presenter` | `fa fa-microphone` + `fa fa-desktop` | `updateUser(1,user._id,user.userName,$index)` | **none** | no | **1** |
| 1 | `r.1` / `r.0.1.1` | `Make Admin` | `fa fa-cog` (`aria-hidden="true"`) + `fa fa-user-md` | `updateUser(5,user._id,user.userName,$index)` | **none** | no | **5** |
| 2 | `r.2` / `r.0.1.2` | `Make Participant` | `fa fa-user` | `updateUser(2,user._id,user.userName,$index)` | **none** | no | **2** |
| 3 | `r.3` / `r.0.1.3` | `Make Trial` | `fa fa-user` | `updateUser(6,user._id,user.userName,$index)` | **none** | no | **6** |
| 4 | `r.4` / `r.0.1.4` | `MUTE Participant` | `fa fa-user-times` | `updateUser(3,user._id,user.userName,$index)` | **none** | no | **3** |
| 5 | `r.5` / `r.0.1.5` | `BAN` | `fa fa-user-times` | `updateUser(4,user._id,user.userName,$index)` | **none** | no | **4** |
| 6 | `r.6` / `r.0.1.6` | *(divider)* | — | — | — | **yes** | — |
| 7 | `r.7` / `r.0.1.7` | `Unban` | `fa fa-user` | `updateUser(2,user._id,user.userName,$index)` | **none** | no | **2** |
| 8 | `r.8` / `r.0.1.8` | `Freshen Login Date` | `fa fa-clock-o` | `updateUser(9,user._id,user.userName,$index)` | **none** | no | **9** |

Every `<a>` is `<a href="">`. **Not one node in this submenu carries `ng-if`, `ng-show`, `ng-hide`, `ng-class`, `data-toggle` or `data-target`** — verified by reading all 28 records of `05/10/15-…/nodes-000.txt`; the only attributes present anywhere are `class`, `style`, `href`, `ng-click` and one `aria-hidden`. **The Permissions submenu is fully unconditional.**

### 3.1 Opcode map — verified against this evidence

| opcode | label(s) found here | path |
|---|---|---|
| **1** | `Make Presenter` | `r.0.0` |
| **2** | `Make Participant` **and** `Unban` — the *same* opcode used twice | `r.2.0`, `r.7.0` |
| **3** | `MUTE Participant` | `r.4.0` |
| **4** | `BAN` | `r.5.0` |
| **5** | `Make Admin` | `r.1.0` |
| **6** | `Make Trial` | `r.3.0` |
| **9** | `Freshen Login Date` | `r.8.0` |

Matches the supplied map exactly (`1 Presenter · 2 Participant/Unban · 3 Mute · 4 Ban · 5 Admin · 6 Trial · 9 freshen login`). Opcodes `7`, `8`, `10`, `11`, `13`, `14` do **not** appear in this submenu — they live in Granular Perms (P13). Opcode `12` appears nowhere in the entire 128-node row-menu subtree (`grep "updateUser(12" 04*/nodes-*.txt` → no hits), confirming it is unused.

> **Behavioural note grounded in the markup:** `Unban` and `Make Participant` fire the *identical* call `updateUser(2,…)`. Unbanning is implemented as "set role back to Participant". A rebuild must not invent a separate unban opcode.

---

## 4. Node table — all 28 nodes

Standalone capture 05/10/15. **`renders` is `no` for every node**: every rect is `x=0 y=0 w=0 h=0` (see §9 gap 1). The `display` column is the resolved absolute value.

| # | path | tag | class / attrs | resolved `display` | rect | renders |
|---|---|---|---|---|---|---|
| 0 | `r` | `ul` | `class="dropdown-menu show"` `style="display: block;"` | `block` | `0,0,0,0` | no |
| 1 | `r.0` | `li` | *(none)* | `list-item` | `0,0,0,0` | no |
| 2 | `r.1` | `li` | *(none)* | `list-item` | `0,0,0,0` | no |
| 3 | `r.2` | `li` | *(none)* | `list-item` | `0,0,0,0` | no |
| 4 | `r.3` | `li` | *(none)* | `list-item` | `0,0,0,0` | no |
| 5 | `r.4` | `li` | *(none)* | `list-item` | `0,0,0,0` | no |
| 6 | `r.5` | `li` | *(none)* | `list-item` | `0,0,0,0` | no |
| 7 | `r.6` | `li` | `class="divider"` | `list-item` | `0,0,0,0` | no |
| 8 | `r.7` | `li` | *(none)* | `list-item` | `0,0,0,0` | no |
| 9 | `r.8` | `li` | *(none)* | `list-item` | `0,0,0,0` | no |
| 10 | `r.0.0` | `a` | `href=""` `ng-click="updateUser(1,user._id,user.userName,$index)"` | `block` | `0,0,0,0` | no |
| 11 | `r.1.0` | `a` | `href=""` `ng-click="updateUser(5,user._id,user.userName,$index)"` | `block` | `0,0,0,0` | no |
| 12 | `r.2.0` | `a` | `href=""` `ng-click="updateUser(2,user._id,user.userName,$index)"` | `block` | `0,0,0,0` | no |
| 13 | `r.3.0` | `a` | `href=""` `ng-click="updateUser(6,user._id,user.userName,$index)"` | `block` | `0,0,0,0` | no |
| 14 | `r.4.0` | `a` | `href=""` `ng-click="updateUser(3,user._id,user.userName,$index)"` | `block` | `0,0,0,0` | no |
| 15 | `r.5.0` | `a` | `href=""` `ng-click="updateUser(4,user._id,user.userName,$index)"` | `block` | `0,0,0,0` | no |
| 16 | `r.7.0` | `a` | `href=""` `ng-click="updateUser(2,user._id,user.userName,$index)"` | `block` | `0,0,0,0` | no |
| 17 | `r.8.0` | `a` | `href=""` `ng-click="updateUser(9,user._id,user.userName,$index)"` | `block` | `0,0,0,0` | no |
| 18 | `r.0.0.0` | `i` | `class="fa fa-microphone"` | `inline-block` | `0,0,0,0` | no |
| 19 | `r.0.0.1` | `i` | `class="fa fa-desktop"` | `inline-block` | `0,0,0,0` | no |
| 20 | `r.1.0.0` | `i` | `class="fa fa-cog"` `aria-hidden="true"` | `inline-block` | `0,0,0,0` | no |
| 21 | `r.1.0.1` | `i` | `class="fa fa-user-md"` | `inline-block` | `0,0,0,0` | no |
| 22 | `r.2.0.0` | `i` | `class="fa fa-user"` | `inline-block` | `0,0,0,0` | no |
| 23 | `r.3.0.0` | `i` | `class="fa fa-user"` | `inline-block` | `0,0,0,0` | no |
| 24 | `r.4.0.0` | `i` | `class="fa fa-user-times"` | `inline-block` | `0,0,0,0` | no |
| 25 | `r.5.0.0` | `i` | `class="fa fa-user-times"` | `inline-block` | `0,0,0,0` | no |
| 26 | `r.7.0.0` | `i` | `class="fa fa-user"` | `inline-block` | `0,0,0,0` | no |
| 27 | `r.8.0.0` | `i` | `class="fa fa-clock-o"` | `inline-block` | `0,0,0,0` | no |

Census: `1 <ul>` + `9 <li>` + `8 <a>` + `10 <i>` = 28 ✔ (matches `INFO.txt`: `node count : 28 (declared 28, truncated=false)`).
Cross-check with the capture's own `DEFAULTS.txt`: `display | inline-block | 10/28 | 3` → 10 `<i>`; the other two values are `block` (8 `<a>` + 1 `<ul>` = 9) and `list-item` (9 `<li>`); `10+9+9 = 28` ✔.
`white-space | nowrap | 18/28` → the 8 `<a>` + 10 `<i>`; the remaining 10 (`<ul>` + 9 `<li>`) are `normal` ✔.
`cursor | pointer | 18/28` → same 18; the 10 container nodes are `auto` ✔.
**All 10 `<i>` carry a `::before` record** — no blank-glyph bug in this submenu.

---

## 5. Resolved computed style (absolute)

### 5.1 Submenu container `ul.dropdown-menu` (`#0`, path `r`)

Two authoritative readings agree exactly — the standalone capture 05/10/15 `#0`, and the in-place closed node `r.0.1` (`#15`) of captures 04/09/14. Only `display` differs (`block` when the harness forced it open, `none` in its natural closed state).

| prop | value |
|---|---|
| display | `block` (forced open) / `none` (natural closed state, captures 04/09/14 `#15`) |
| visibility | `visible` |
| position | `absolute` |
| top | `100%` |
| right | `auto` |
| bottom | `auto` |
| **left** | **`0px`** |
| z-index | `1000` |
| float | `none` |
| box-sizing | `border-box` |
| width | `auto` |
| height | `auto` |
| min-width | `160px` |
| max-width / min-height / max-height | `none` / `0px` / `none` |
| margin-top / right / bottom / left | `2px` / `0px` / `0px` / `0px` |
| padding-top / right / bottom / left | `5px` / `0px` / `5px` / `0px` |
| border-width (T/R/B/L) | `1px` / `1px` / `1px` / `1px` |
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

> **`top: 100%; left: 0px`** — the submenu drops **below** its parent `<li>` (which is `position: relative`), left-aligned to it, with a `2px` gap. There is no `left: 100%` fly-out rule in this build.

### 5.2 Item `<li>` — `r.0`–`r.5`, `r.7`, `r.8`

`display: list-item; visibility: visible; position: static; top/right/bottom/left: auto; z-index: auto; float: none; box-sizing: border-box; width: auto; height: auto; min-width: 0px; max-width: none; min-height: 0px; max-height: none; margin: 0px ×4; padding: 0px ×4; border-width: 0px ×4; border-style: none ×4; border-color: rgb(51,51,51) ×4; border-radius: 0px ×4; background-color: rgba(0,0,0,0); background-image: none; background-clip: border-box; color: rgb(51,51,51); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 400; font-style: normal; line-height: 18.5714px; letter-spacing: normal; text-align: left; text-transform: none; text-decoration-line: none; text-shadow: none; text-overflow: clip; white-space: normal; vertical-align: baseline; word-break: normal; overflow-wrap: normal; overflow-x: visible; overflow-y: visible; opacity: 1; box-shadow: none; outline-style: none; outline-width: 3px; outline-color: rgb(51,51,51); cursor: auto; pointer-events: auto; user-select: auto; transition-property: all; transition-duration: 0s; transform: none; filter: none; object-fit: fill; list-style-type: none; content: normal; resize: none; appearance: none; fill: rgb(0,0,0); stroke: none`

**[DERIVED]** height when rendered: `24.5703px` (the identical `<li>`/`<a>` box measured in the row menu, P11 §3).

### 5.3 Divider `<li class="divider">` — `r.6`

Same as §5.2 except: `height: 1px; margin-top: 9px; margin-bottom: 9px; background-color: rgb(229, 229, 229); overflow-x: hidden; overflow-y: hidden`. **[DERIVED]** vertical footprint `19px`.

### 5.4 Item `<a>` — all 8

`display: block; visibility: visible; position: static; float: none; box-sizing: border-box; width: auto; height: auto; margin: 0px ×4; padding-top: 3px; padding-right: 20px; padding-bottom: 3px; padding-left: 20px; border-width: 0px ×4; border-style: none ×4; border-color: rgb(51,51,51) ×4; border-radius: 0px ×4; background-color: rgba(0,0,0,0); background-clip: border-box; color: rgb(51, 51, 51); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 400; font-style: normal; line-height: 18.5714px; letter-spacing: normal; text-align: left; text-transform: none; text-decoration-line: none; text-shadow: none; text-overflow: clip; white-space: nowrap; vertical-align: baseline; word-break: normal; overflow-wrap: normal; overflow-x: visible; overflow-y: visible; opacity: 1; box-shadow: none; outline-style: none; outline-width: 3px; outline-color: rgb(51, 51, 51); cursor: pointer; pointer-events: auto; user-select: auto; transition-property: all; transition-duration: 0s; transform: none; filter: none; object-fit: fill; list-style-type: none; content: normal; resize: none; appearance: none; fill: rgb(0,0,0); stroke: none`

### 5.5 Icons `<i class="fa fa-…">` — all 10

`display: inline-block; visibility: visible; position: static; float: none; box-sizing: border-box; width: auto; height: auto; margin: 0px ×4; padding: 0px ×4; border-width: 0px ×4; background-color: rgba(0,0,0,0); color: rgb(51, 51, 51); font-family: FontAwesome; font-size: 13px; font-weight: 400; font-style: normal; line-height: 13px; letter-spacing: normal; text-align: left; white-space: nowrap; vertical-align: baseline; overflow-x: visible; overflow-y: visible; opacity: 1; box-shadow: none; cursor: pointer; pointer-events: auto; user-select: auto; transform: none; list-style-type: none; fill: rgb(0,0,0); stroke: none`
`::before` (all 10, identical): `{"content":"\"\"","color":"rgb(51, 51, 51)","font-family":"FontAwesome","font-size":"13px","background-color":"rgba(0, 0, 0, 0)"}`

### 5.6 Theme invariance

`19-forced-darkTheme/IDENTICAL-TO-BASELINE.txt` / `20-forced-lightTheme/IDENTICAL-TO-BASELINE.txt`: 2155 of 2156 nodes byte-identical to the baseline including **all computed style props**; the only delta is `<body class>`. This submenu's colours are the same in both themes.

---

## 6. Verbatim text (every string, with path)

| path (standalone / in-menu) | verbatim text |
|---|---|
| `r.0.0` / `r.0.1.0.0` | `Make Presenter` |
| `r.1.0` / `r.0.1.1.0` | `Make Admin` |
| `r.2.0` / `r.0.1.2.0` | `Make Participant` |
| `r.3.0` / `r.0.1.3.0` | `Make Trial` |
| `r.4.0` / `r.0.1.4.0` | `MUTE Participant` |
| `r.5.0` / `r.0.1.5.0` | `BAN` |
| `r.7.0` / `r.0.1.7.0` | `Unban` |
| `r.8.0` / `r.0.1.8.0` | `Freshen Login Date` |

8 strings, one per `<a>`. The `<ul>`, the 9 `<li>` and the 10 `<i>` carry no text.
**Truncation: none.** `INFO.txt` of captures 05/10/15 all read `node count : 28 (declared 28, truncated=false)`; no ellipsis or truncation marker occurs in any of the three files. Note the exact casing: `MUTE Participant` (MUTE upper-case, Participant title-case), `BAN` (all caps, no noun), `Unban` (title-case).

---

## 7. Three-row comparison — capture 05 vs 10 vs 15

**The three captures are BYTE-IDENTICAL apart from the capture index in the header line.**

```
$ diff 05-…/nodes-000.txt 10-…/nodes-000.txt
1c1
< FULL node dump — capture[5] dropdown:dropdown-menu.show — records 0..27 of 28
---
> FULL node dump — capture[10] dropdown:dropdown-menu.show — records 0..27 of 28

$ diff 05-…/nodes-000.txt 15-…/nodes-000.txt
1c1
< FULL node dump — capture[5] …
---
> FULL node dump — capture[15] …

$ diff 05-…/DEFAULTS.txt 10-…/DEFAULTS.txt     # (no output)
$ diff 05-…/DEFAULTS.txt 15-…/DEFAULTS.txt     # (no output)
```

Both `DEFAULTS.txt` tables are identical too — including `display | inline-block | 10/28 | 3`, i.e. **28 nodes, 9 visible `<li>`, in all three rows**. There is no `ng-show`/`ng-hide` anywhere in this submenu, so nothing can vary.

**Verification of the 42/42/41 finding against MY menu:** the row-3 `role === 1` divergence is real and provable, but it does **not** occur in this piece. It occurs one submenu over, at `r.1.1.0` in Granular Perms (`ng-show="user.role !== 1"`, P13). Independent confirmation from the full-DOM baseline, where all three rows' Permissions submenus are present in place:

| row | first Permissions item, baseline path | attrs |
|---|---|---|
| 1 | `r.0.1.1.0.1.3.1.0.0.3.1.0.4.0.1.0.0` | `href=""` `ng-click="updateUser(1,…)"` |
| 2 | `r.0.1.1.0.1.3.1.0.0.3.1.1.4.0.1.0.0` | `href=""` `ng-click="updateUser(1,…)"` |
| 3 | `r.0.1.1.0.1.3.1.0.0.3.1.2.4.0.1.0.0` | `href=""` `ng-click="updateUser(1,…)"` |

All three rows' full menus have exactly **127 descendants** of the row `<ul>` (`grep -c` over `00-baseline-room/nodes-*.txt`), so no item is added or removed anywhere for any row.

**Conclusion for P12: the Permissions submenu is IDENTICAL across all three user rows — 28 nodes, 8 items, 1 divider, no conditionals, no per-row variation of any kind.** Row 1's copy simply never becomes reachable because the whole Actions control is `ng-hide`-ed by `user.role==0` (P11 §7.4).

---

## 8. Rebuild spec

### 8.1 HTML

```html
<ul class="dropdown-menu">
  <li><a href="" ng-click="updateUser(1,user._id,user.userName,$index)"><i class="fa fa-microphone"></i><i class="fa fa-desktop"></i> Make Presenter</a></li>
  <li><a href="" ng-click="updateUser(5,user._id,user.userName,$index)"><i class="fa fa-cog" aria-hidden="true"></i><i class="fa fa-user-md"></i> Make Admin</a></li>
  <li><a href="" ng-click="updateUser(2,user._id,user.userName,$index)"><i class="fa fa-user"></i> Make Participant</a></li>
  <li><a href="" ng-click="updateUser(6,user._id,user.userName,$index)"><i class="fa fa-user"></i> Make Trial</a></li>
  <li><a href="" ng-click="updateUser(3,user._id,user.userName,$index)"><i class="fa fa-user-times"></i> MUTE Participant</a></li>
  <li><a href="" ng-click="updateUser(4,user._id,user.userName,$index)"><i class="fa fa-user-times"></i> BAN</a></li>

  <li class="divider"></li>

  <li><a href="" ng-click="updateUser(2,user._id,user.userName,$index)"><i class="fa fa-user"></i> Unban</a></li>
  <li><a href="" ng-click="updateUser(9,user._id,user.userName,$index)"><i class="fa fa-clock-o"></i> Freshen Login Date</a></li>
</ul>
```

Child order inside each `<a>` is exactly as captured (`.0` then `.1`). The text-node position relative to the icons is **not** captured for this submenu (§9 gap 3); the icon-then-text order shown here is what the *measured* root-menu items exhibit (`icon.x = li.x + a.padding-left`, P11 §3) and is flagged as an inference, not evidence.

### 8.2 CSS

```css
.dropdown-submenu                    { position:relative; }
.dropdown-submenu > ul.dropdown-menu {
  display:none;                       /* .open on the parent li reveals it */
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

.dropdown-menu > li          { display:list-item; position:static; margin:0; padding:0;
                               white-space:normal; cursor:auto; list-style:none; }
.dropdown-menu > li > a      { display:block; box-sizing:border-box; padding:3px 20px; margin:0; border:0;
                               color:rgb(51,51,51); text-decoration:none; white-space:nowrap;
                               font:400 13px/18.5714px "Helvetica Neue",Helvetica,Arial,sans-serif;
                               text-align:left; background-color:rgba(0,0,0,0); cursor:pointer; }
.dropdown-menu .divider      { display:list-item; height:1px; margin:9px 0; padding:0;
                               overflow:hidden; background-color:rgb(229,229,229);
                               white-space:normal; cursor:auto; }
.fa                          { display:inline-block; font-family:FontAwesome; font-size:13px;
                               line-height:13px; font-style:normal; font-weight:400;
                               color:rgb(51,51,51); white-space:nowrap; }
```

**[DERIVED]** rendered box, from the item metrics measured in the row menu:
`8 items × 24.5703 + 1 divider × 19 + 5 + 5 (padding) + 1 + 1 (border) = 196.5624 + 19 + 12 = 227.56px` tall; width `max(160px, shrink-to-fit)`; anchored at the parent `<li>`'s bottom-left `+ 2px` (P11 §8.4).

### 8.3 Conditional logic

**There is none.** Zero `ng-if` / `ng-show` / `ng-hide` / `ng-class` in all 28 nodes. All 8 items render for every user for whom the parent Actions menu renders at all — i.e. for every `user.role !== 0`. The submenu's *visibility* is controlled solely by `submenuOpen.permissions` on the parent `<li>` (P11 §8.4), which the parent `ng-click` toggles while force-closing the other three submenus.

Opcode semantics to wire in a rebuild (all verbatim from `ng-click`):

```
updateUser(1, user._id, user.userName, $index)   →  Presenter
updateUser(5, …)                                 →  Admin
updateUser(2, …)                                 →  Participant   (also used for Unban)
updateUser(6, …)                                 →  Trial
updateUser(3, …)                                 →  Mute
updateUser(4, …)                                 →  Ban
updateUser(9, …)                                 →  Freshen login date
```

---

## 9. Honest gaps

1. **No geometry whatsoever.** All 28 rects are `x=0 y=0 w=0 h=0` in captures 05, 10 **and** 15. Cause: the harness forced `style="display: block;"` onto the submenu `<ul>` after the parent row menu had already reverted to `display:none`, so nothing was laid out. Submenu width, height and per-item x/y are therefore **unknown**; the `227.56px` height in §8.2 is arithmetic from the row-menu item metrics, not a measurement.
2. **Hover / focus / `.open` styling is not captured.** No `:hover` background, no focus ring, no evidence of what `.open` does visually beyond revealing the submenu. Do not fill this in from Bootstrap memory.
3. **Text position inside two-icon items is unknown.** `Make Presenter` has children `[i.fa-microphone, i.fa-desktop]` and `Make Admin` has `[i.fa-cog, i.fa-user-md]`. The element-only dump does not record where the text node sits relative to them, and there are no rects to infer from. §8.1 places the text last by analogy with the measured root-menu items — flagged as inference.
4. **FontAwesome glyph codepoints unrecoverable.** All ten `::before` records serialise `content` as `"\"\""`; the PUA character did not survive transcoding. Only class names are evidence.
5. **No rendered screenshot.** Nothing in this evidence set shows the submenu painted, so no pixel diff has been performed.
6. **Row-1 unreachability is inferred from the parent, not from this piece.** Capture 05 exists and is complete, but the row-1 Actions control is `ng-hide`-ed (`user.role==0`), so in the live app this submenu can never be opened for row 1. That conclusion rests on baseline node `#1570`, not on capture 05 itself.
