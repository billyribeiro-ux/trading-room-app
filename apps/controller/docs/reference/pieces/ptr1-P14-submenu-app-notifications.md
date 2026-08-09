# ptr1 · P14 — M3.c · `App and Notifications` submenu (`ul.dropdown-menu`)

> **Evidence base for this file (read in full, line by line):**
> `/tmp/ptr-decode/ptr1/caps/07-dropdown_dropdown-menu.show/{INFO.txt,DEFAULTS.txt,nodes-000.txt}` (row 1, 31 nodes),
> `/tmp/ptr-decode/ptr1/caps/12-dropdown_dropdown-menu.show/{INFO.txt,DEFAULTS.txt,nodes-000.txt}` (row 2, 31 nodes),
> `/tmp/ptr-decode/ptr1/caps/17-dropdown_dropdown-menu.show/{INFO.txt,DEFAULTS.txt,nodes-000.txt}` (row 3, 31 nodes),
> plus the same subtree in place as `r.2.1.*` inside `04-/09-/14-dropdown_dropdown-menu.dropdown-menu-right.show`, and as `…4.0.1.2.1.*` in `00-baseline-room`.
>
> **All values are RESOLVED ABSOLUTE** (each capture's own `DEFAULTS.txt` COMMON table applied, then overridden by that node's `style-deviations`). Arithmetic derivations are marked **[DERIVED]**.

---

## 1. Purpose

`M3.c` is the mobile-companion-app submenu: it retrieves the user's pairing PIN and push tokens, and — below a divider — controls the lifecycle of that user's mobile push notifications (pause, resume, unsubscribe, send a test, full reset). It is the only submenu whose items all address the external mobile/FCM subsystem rather than the room's own permission model, and it contains no `updateUser` opcode at all.

---

## 2. Trigger / parent item

The submenu is `r.2.1` inside the row menu; its parent item is `r.2` / `r.2.0`.

```html
<li class="dropdown-submenu" ng-class="{open: submenuOpen.app}">
  <a href="" ng-click="submenuOpen.app=!submenuOpen.app; submenuOpen.permissions=false; submenuOpen.granular=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();">
    <i class="fa fa-mobile"></i> App and Notifications <i class="fa fa-caret-right pull-right"></i>
  </a>
  <ul class="dropdown-menu"> … </ul>
</li>
```

| element | path (row-menu capture) | text | icon class | rect (cap 09, row 2) | rect (cap 14, row 3) |
|---|---|---|---|---|---|
| parent `<li>` | `r.2` | — | — | `x=1417.7 y=690.1 w=197.2 h=24.6` | `x=1417.7 y=752.5 w=197.2 h=24.6` |
| parent `<a>` | `r.2.0` | `App and Notifications` | — | `x=1417.7 y=690.1 w=197.2 h=24.6` | `x=1417.7 y=752.5 w=197.2 h=24.6` |
| leading icon | `r.2.0.0` | — | `fa fa-mobile` | `x=1437.7 y=696.1 w=5.6 h=13` | `x=1437.7 y=758.5 w=5.6 h=13` |
| caret | `r.2.0.1` | — | `fa fa-caret-right pull-right` | `x=1590.2 y=693.1 w=4.6 h=13` | `x=1590.2 y=755.5 w=4.6 h=13` |

`App and Notifications` is the **longest label in the row menu** and is what drives the parent menu's measured width of `199.227px` (`li` content `197.227px`, `<a>` content box `197.227 − 40 = 157.227px`).

Resolved style of the parent `<li>` (cap 09 `#3`): P11 §5.2 plus `position: relative; top/right/bottom/left: 0px; width: 197.227px; height: 24.5703px`.
Resolved style of the parent `<a>` (cap 09 `#18`): P11 §5.4 verbatim.
`i.fa-mobile` (cap 09 `#53`): `display:inline-block; width:5.57812px; height:13px; font-family:FontAwesome; font-size:13px; line-height:13px; color:rgb(51,51,51); transform:matrix(1,0,0,1,0,0)`; `::before {"content":"\"\"","color":"rgb(51, 51, 51)","font-family":"FontAwesome","font-size":"13px","background-color":"rgba(0, 0, 0, 0)"}`.
Caret (cap 09 `#54`): as above plus `display:block; float:right; width:4.64844px; margin-left:3.9px`.

**Opener:** the `ng-click` above — flips `submenuOpen.app`, hard-clears `submenuOpen.permissions/granular/badges`, `preventDefault()` + `stopPropagation()`. **No `data-toggle` anywhere in this submenu or on its parent** (verified across all 31 records of captures 07/12/17 — the only attributes present are `class`, `style`, `href`, `ng-click`, `aria-hidden`).

---

## 3. Item list in exact DOM order

Paths given as standalone-capture / in-row-menu (`r.2.1.` prefix).
**No rect exists for any node in this piece** — see §9 gap 1.

| # | path (standalone / in-menu) | label (verbatim) | icon class(es), DOM order | `ng-click` verbatim | `ng-if`/`ng-show`/`ng-hide` | divider | opcode |
|---|---|---|---|---|---|---|---|
| 0 | `r.0` / `r.2.1.0` | `Get App PIN` | `fa fa-mobile` | `getAppPin(user.email,user.userName,$index)` | **none** | no | — |
| 1 | `r.1` / `r.2.1.1` | `Show App Tokens` | `fa fa-mobile` | `showAlerterAppTokens(user.userName,user.alerterAppTokens)` | **none** | no | — |
| 2 | `r.2` / `r.2.1.2` | `Get FCM Tokens` | `fa fa-mobile` (`aria-hidden="true"`) | `getFCMTokens(user._id,user.userName,$index)` | **none** | no | — |
| 3 | `r.3` / `r.2.1.3` | *(divider)* | — | — | — | **yes** | — |
| 4 | `r.4` / `r.2.1.4` | `PAUSE Mobile Notifs` | `fa fa-mobile` (`aria-hidden="true"`) **+** `fa fa fa-bell-o` ⚠ | `pauseUserNotifs(user._id,user.userName,$index,'pause')` | **none** | no | — |
| 5 | `r.5` / `r.2.1.5` | `RESUME Mobile Notifs` | `fa fa-mobile` (`aria-hidden="true"`) **+** `fa fa-play` | `pauseUserNotifs(user._id,user.userName,$index,'resume')` | **none** | no | — |
| 6 | `r.6` / `r.2.1.6` | `Remove Mobile Notifs` | `fa fa-mobile` (`aria-hidden="true"`) **+** `fa fa-trash` | `pauseUserNotifs(user._id,user.userName,$index,'unsub')` | **none** | no | — |
| 7 | `r.7` / `r.2.1.7` | `Send Test Mobile Notifs` | `fa fa-mobile` (`aria-hidden="true"`) **+** `fa fa fa-bell-o` ⚠ | `sendTestFCM(user._id,user.userName,$index)` | **none** | no | — |
| 8 | `r.8` / `r.2.1.8` | `Reset Mobile Notifs` | `fa fa-mobile` (`aria-hidden="true"`) **+** `fa fa-reload` ⚠⚠ | `resetFCMForuser(user._id,user.userName,$index)` | **none** | no | — |

Every `<a>` is `<a href="">`. **Not one node in this submenu carries `ng-if`, `ng-show`, `ng-hide`, `ng-class`, `data-toggle` or `data-target`** — verified by reading all 31 records of `07/12/17-…/nodes-000.txt`. **The App and Notifications submenu is fully unconditional.**

Structural notes, all directly evidenced:

* **The divider splits the submenu 3 / 5.** Items 0–2 are read-only lookups (PIN, app tokens, FCM tokens); items 4–8 are mutating notification-lifecycle actions.
* **Items 0–2 have exactly ONE icon; items 4–8 have exactly TWO** (`fa-mobile` first, then an action glyph). Confirmed by the child paths: `r.0.0.0`, `r.1.0.0`, `r.2.0.0` are singletons, while `r.4.0.{0,1}`, `r.5.0.{0,1}`, `r.6.0.{0,1}`, `r.7.0.{0,1}`, `r.8.0.{0,1}` are pairs.
* **`aria-hidden="true"` is applied inconsistently**: present on `r.2.0.0` and on the five leading `fa-mobile` icons of items 4–8, **absent** on `r.0.0.0` and `r.1.0.0`, and absent on all five trailing action glyphs. Reproduce as-is; do not normalise.
* **Three of the five lifecycle items share one handler**: `pauseUserNotifs(user._id, user.userName, $index, MODE)` with `MODE ∈ {'pause', 'resume', 'unsub'}`. `Send Test` and `Reset` use their own functions.
* **Handler-name typo, as-shipped:** `resetFCMForuser` — lower-case `u` in `user`, unlike every sibling. Verbatim from `r.8.0`.
* **`showAlerterAppTokens` takes a different argument shape** from every other handler in the whole row menu: `(user.userName, user.alerterAppTokens)` — no `_id`, no `$index`. It reads a value straight off the scope object.
* **`getAppPin` is the only handler keyed on `user.email`** rather than `user._id`.
* **No `updateUser(...)` call exists anywhere in this submenu.** `grep "updateUser" 07*/nodes-000.txt` → no hits. Opcodes are entirely a P12/P13 concern.

---

## 4. Node table — all 31 nodes

Standalone captures 07 / 12 / 17. **`renders` is `no` for every node**: every rect is `x=0 y=0 w=0 h=0` (§9 gap 1). The `display` column is the resolved absolute value.

| # | path | tag | class / attrs | resolved `display` | rect | renders |
|---|---|---|---|---|---|---|
| 0 | `r` | `ul` | `class="dropdown-menu show"` `style="display: block;"` | `block` | `0,0,0,0` | no |
| 1 | `r.0` | `li` | *(none)* | `list-item` | `0,0,0,0` | no |
| 2 | `r.1` | `li` | *(none)* | `list-item` | `0,0,0,0` | no |
| 3 | `r.2` | `li` | *(none)* | `list-item` | `0,0,0,0` | no |
| 4 | `r.3` | `li` | `class="divider"` | `list-item` | `0,0,0,0` | no |
| 5 | `r.4` | `li` | *(none)* | `list-item` | `0,0,0,0` | no |
| 6 | `r.5` | `li` | *(none)* | `list-item` | `0,0,0,0` | no |
| 7 | `r.6` | `li` | *(none)* | `list-item` | `0,0,0,0` | no |
| 8 | `r.7` | `li` | *(none)* | `list-item` | `0,0,0,0` | no |
| 9 | `r.8` | `li` | *(none)* | `list-item` | `0,0,0,0` | no |
| 10 | `r.0.0` | `a` | `href=""` `ng-click="getAppPin(user.email,user.userName,$index)"` | `block` | `0,0,0,0` | no |
| 11 | `r.1.0` | `a` | `href=""` `ng-click="showAlerterAppTokens(user.userName,user.alerterAppTokens)"` | `block` | `0,0,0,0` | no |
| 12 | `r.2.0` | `a` | `href=""` `ng-click="getFCMTokens(user._id,user.userName,$index)"` | `block` | `0,0,0,0` | no |
| 13 | `r.4.0` | `a` | `href=""` `ng-click="pauseUserNotifs(user._id,user.userName,$index,'pause')"` | `block` | `0,0,0,0` | no |
| 14 | `r.5.0` | `a` | `href=""` `ng-click="pauseUserNotifs(user._id,user.userName,$index,'resume')"` | `block` | `0,0,0,0` | no |
| 15 | `r.6.0` | `a` | `href=""` `ng-click="pauseUserNotifs(user._id,user.userName,$index,'unsub')"` | `block` | `0,0,0,0` | no |
| 16 | `r.7.0` | `a` | `href=""` `ng-click="sendTestFCM(user._id,user.userName,$index)"` | `block` | `0,0,0,0` | no |
| 17 | `r.8.0` | `a` | `href=""` `ng-click="resetFCMForuser(user._id,user.userName,$index)"` | `block` | `0,0,0,0` | no |
| 18 | `r.0.0.0` | `i` | `class="fa fa-mobile"` | `inline-block` | `0,0,0,0` | no |
| 19 | `r.1.0.0` | `i` | `class="fa fa-mobile"` | `inline-block` | `0,0,0,0` | no |
| 20 | `r.2.0.0` | `i` | `class="fa fa-mobile"` `aria-hidden="true"` | `inline-block` | `0,0,0,0` | no |
| 21 | `r.4.0.0` | `i` | `class="fa fa-mobile"` `aria-hidden="true"` | `inline-block` | `0,0,0,0` | no |
| 22 | `r.4.0.1` | `i` | **`class="fa fa fa-bell-o"`** (duplicate `fa`) | `inline-block` | `0,0,0,0` | no |
| 23 | `r.5.0.0` | `i` | `class="fa fa-mobile"` `aria-hidden="true"` | `inline-block` | `0,0,0,0` | no |
| 24 | `r.5.0.1` | `i` | `class="fa fa-play"` | `inline-block` | `0,0,0,0` | no |
| 25 | `r.6.0.0` | `i` | `class="fa fa-mobile"` `aria-hidden="true"` | `inline-block` | `0,0,0,0` | no |
| 26 | `r.6.0.1` | `i` | `class="fa fa-trash"` | `inline-block` | `0,0,0,0` | no |
| 27 | `r.7.0.0` | `i` | `class="fa fa-mobile"` `aria-hidden="true"` | `inline-block` | `0,0,0,0` | no |
| 28 | `r.7.0.1` | `i` | **`class="fa fa fa-bell-o"`** (duplicate `fa`) | `inline-block` | `0,0,0,0` | no |
| 29 | `r.8.0.0` | `i` | `class="fa fa-mobile"` `aria-hidden="true"` | `inline-block` | `0,0,0,0` | no |
| 30 | `r.8.0.1` | `i` | **`class="fa fa-reload"`** — **no `::before` recorded** ⚠⚠ | `inline-block` | `0,0,0,0` | no |

Census: `1 <ul>` + `9 <li>` + `8 <a>` + `13 <i>` = 31 ✔ (`INFO.txt`: `node count : 31 (declared 31, truncated=false)`).
Cross-check with the capture's own `DEFAULTS.txt`: `display | inline-block | 13/31 | 3` → 13 `<i>`; the other two values are `block` (8 `<a>` + 1 `<ul>` = 9) and `list-item` (9 `<li>`); `13+9+9 = 31` ✔.
`white-space | nowrap | 21/31` → the 8 `<a>` + 13 `<i>`; the remaining 10 (`<ul>` + 9 `<li>`) are `normal` ✔. `cursor | pointer | 21/31` → same split ✔.
`display` has **no `none` value** in this capture — nothing in this submenu is ever hidden.

**⚠ `r.8.0.1` (`fa fa-reload`) is the only `<i>` in this submenu with NO `::before` record**; the other 12 all have one. See §9 gap 5.

---

## 5. Resolved computed style (absolute)

### 5.1 Submenu container `ul.dropdown-menu` (`#0`, path `r`)

Byte-identical across captures 07, 12 and 17, and identical to the in-place closed node `r.2.1` (`#19`) of captures 04/09/14 apart from `display`.

| prop | value |
|---|---|
| display | `block` (forced open) / `none` (natural closed state, captures 04/09/14 `#19`) |
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

> **`top: 100%; left: 0px`** — this submenu drops **below** its parent `<li>` (which is `position: relative`), left-aligned to it, with a `2px` gap. No side fly-out rule exists in this build.

### 5.2 Item `<li>` (non-divider) — `r.0`, `r.1`, `r.2`, `r.4`–`r.8`

`display: list-item; visibility: visible; position: static; top/right/bottom/left: auto; z-index: auto; float: none; box-sizing: border-box; width: auto; height: auto; min-width: 0px; max-width: none; min-height: 0px; max-height: none; margin: 0px ×4; padding: 0px ×4; border-width: 0px ×4; border-style: none ×4; border-color: rgb(51,51,51) ×4; border-radius: 0px ×4; background-color: rgba(0,0,0,0); background-image: none; background-clip: border-box; color: rgb(51,51,51); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 400; font-style: normal; line-height: 18.5714px; letter-spacing: normal; text-align: left; text-transform: none; text-decoration-line: none; text-shadow: none; text-overflow: clip; white-space: normal; vertical-align: baseline; word-break: normal; overflow-wrap: normal; overflow-x: visible; overflow-y: visible; opacity: 1; box-shadow: none; outline-style: none; outline-width: 3px; outline-color: rgb(51,51,51); cursor: auto; pointer-events: auto; user-select: auto; transition-property: all; transition-duration: 0s; transform: none; filter: none; object-fit: fill; list-style-type: none; content: normal; resize: none; appearance: none; fill: rgb(0,0,0); stroke: none`

**[DERIVED]** height when rendered: `24.5703px` (identical `<li>`/`<a>` box measured in the row menu, P11 §3).

### 5.3 Divider `<li class="divider">` — `r.3`

Same as §5.2 except: `height: 1px; margin-top: 9px; margin-bottom: 9px; background-color: rgb(229, 229, 229); overflow-x: hidden; overflow-y: hidden`. **[DERIVED]** vertical footprint `19px`.

### 5.4 Item `<a>` — all 8

`display: block; visibility: visible; position: static; float: none; box-sizing: border-box; width: auto; height: auto; margin: 0px ×4; padding-top: 3px; padding-right: 20px; padding-bottom: 3px; padding-left: 20px; border-width: 0px ×4; border-style: none ×4; border-color: rgb(51,51,51) ×4; border-radius: 0px ×4; background-color: rgba(0,0,0,0); background-clip: border-box; color: rgb(51, 51, 51); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 400; font-style: normal; line-height: 18.5714px; letter-spacing: normal; text-align: left; text-transform: none; text-decoration-line: none; text-shadow: none; text-overflow: clip; white-space: nowrap; vertical-align: baseline; word-break: normal; overflow-wrap: normal; overflow-x: visible; overflow-y: visible; opacity: 1; box-shadow: none; outline-style: none; outline-width: 3px; outline-color: rgb(51, 51, 51); cursor: pointer; pointer-events: auto; user-select: auto; transition-property: all; transition-duration: 0s; transform: none; filter: none; object-fit: fill; list-style-type: none; content: normal; resize: none; appearance: none; fill: rgb(0,0,0); stroke: none`

### 5.5 Icons `<i class="fa fa-…">` — all 13

`display: inline-block; visibility: visible; position: static; float: none; box-sizing: border-box; width: auto; height: auto; margin: 0px ×4; padding: 0px ×4; border-width: 0px ×4; background-color: rgba(0,0,0,0); color: rgb(51, 51, 51); font-family: FontAwesome; font-size: 13px; font-weight: 400; font-style: normal; line-height: 13px; letter-spacing: normal; text-align: left; white-space: nowrap; vertical-align: baseline; overflow-x: visible; overflow-y: visible; opacity: 1; box-shadow: none; cursor: pointer; pointer-events: auto; user-select: auto; transform: none; list-style-type: none; fill: rgb(0,0,0); stroke: none`

`::before` — present on 12 of 13, identical where present: `{"content":"\"\"","color":"rgb(51, 51, 51)","font-family":"FontAwesome","font-size":"13px","background-color":"rgba(0, 0, 0, 0)"}`.
**Absent on `r.8.0.1` (`fa fa-reload`)** — no FontAwesome rule matches, so that icon paints nothing.
**`fa fa fa-bell-o` (`r.4.0.1`, `r.7.0.1`) DOES have a `::before`** — the duplicated `fa` token is a harmless authoring slip and the bell renders normally. Measured widths for `fa-mobile` in the row menu: `5.57812px` (`r.2.0.0`, cap 09 `#53`).

### 5.6 Theme invariance

`19-forced-darkTheme/IDENTICAL-TO-BASELINE.txt` and `20-forced-lightTheme/IDENTICAL-TO-BASELINE.txt`: *"2155 of 2156 nodes are byte-identical to baseline-room (rect, attrs, tag, text, ::before, ::after, and ALL computed style props)"*; the only delta is `<body class>`. This submenu is theme-invariant.

---

## 6. Verbatim text (every string, with path)

| path (standalone / in-menu) | verbatim text |
|---|---|
| `r.0.0` / `r.2.1.0.0` | `Get App PIN` |
| `r.1.0` / `r.2.1.1.0` | `Show App Tokens` |
| `r.2.0` / `r.2.1.2.0` | `Get FCM Tokens` |
| `r.4.0` / `r.2.1.4.0` | `PAUSE Mobile Notifs` |
| `r.5.0` / `r.2.1.5.0` | `RESUME Mobile Notifs` |
| `r.6.0` / `r.2.1.6.0` | `Remove Mobile Notifs` |
| `r.7.0` / `r.2.1.7.0` | `Send Test Mobile Notifs` |
| `r.8.0` / `r.2.1.8.0` | `Reset Mobile Notifs` |

8 strings, one per `<a>`. The `<ul>`, the 9 `<li>` and the 13 `<i>` carry no text.
**Truncation: none.** `INFO.txt` of captures 07/12/17 all read `node count : 31 (declared 31, truncated=false)`; no ellipsis or truncation marker appears in any of the three files.
Exact casing to reproduce: `PIN` all-caps · `FCM` all-caps · `PAUSE` and `RESUME` all-caps but `Remove`, `Send Test` and `Reset` title-case · `Notifs` is the shipped abbreviation, **not** `Notifications` · the parent item, by contrast, spells it out as `App and Notifications` with a lower-case `and`.

---

## 7. Three-row comparison — capture 07 vs 12 vs 17

**The three captures are BYTE-IDENTICAL apart from the capture index in the header line.**

```
$ diff 07-…/nodes-000.txt 12-…/nodes-000.txt
1c1
< FULL node dump — capture[7] dropdown:dropdown-menu.show — records 0..30 of 31
---
> FULL node dump — capture[12] dropdown:dropdown-menu.show — records 0..30 of 31

$ diff 07-…/nodes-000.txt 17-…/nodes-000.txt
1c1
< FULL node dump — capture[7] …
---
> FULL node dump — capture[17] …

$ diff 07-…/DEFAULTS.txt 12-…/DEFAULTS.txt     # (no output)
$ diff 07-…/DEFAULTS.txt 17-…/DEFAULTS.txt     # (no output)
```

Both `DEFAULTS.txt` tables are identical too — including `display | inline-block | 13/31 | 3` with **no `none` bucket**, i.e. **31 nodes, all 9 `<li>` visible, in all three rows**. There is no `ng-show`/`ng-hide`/`ng-if` anywhere in this submenu, so nothing can vary by user.

**Verification of the 42/42/41 finding against MY menu:** the divergence is real and provable but does **not** occur in this piece. It occurs in Granular Perms, at `r.1.1.0` (`ng-show="user.role !== 1"`, P13), which gains `class="ng-hide"` only for row 3. Evidence at the row-menu level, where those counts are stated:

| capture | row | `DEFAULTS.txt` line 6 | `display:none` nodes in the 128-node menu |
|---|---|---|---|
| 04 | 1 | `display \| list-item \| 42/128 \| 4` | `r.0.1`, `r.1.1`, `r.2.1`, `r.3.1`, `r.1.1.5` |
| 09 | 2 | `display \| list-item \| 42/128 \| 4` | `r.0.1`, `r.1.1`, `r.2.1`, `r.3.1`, `r.1.1.5` |
| 14 | 3 | `display \| list-item \| 41/128 \| 4` | `r.0.1`, `r.1.1`, `r.2.1`, `r.3.1`, `r.1.1.5`, **`r.1.1.0`** |

**Not one of `r.2.1.*` — this submenu's 30 in-menu nodes — appears in any `display:none` list**, in any of the three rows. Independent confirmation from the full-DOM baseline, which holds all three rows' menus in place with **127 descendants each** (`grep -c` over `00-baseline-room/nodes-*.txt` for `…3.1.{0,1,2}.4.0.1.`): no item is added or removed for any row.

**Conclusion for P14: the App and Notifications submenu is IDENTICAL across all three user rows — 31 nodes, 8 items, 1 divider, no conditionals, no per-row variation of any kind.** Row 1's copy is simply never reachable because the whole Actions control is `ng-hide`-ed by `user.role==0` (P11 §7.4).

---

## 8. Rebuild spec

### 8.1 HTML

```html
<ul class="dropdown-menu">
  <li><a href="" ng-click="getAppPin(user.email,user.userName,$index)"><i class="fa fa-mobile"></i> Get App PIN</a></li>
  <li><a href="" ng-click="showAlerterAppTokens(user.userName,user.alerterAppTokens)"><i class="fa fa-mobile"></i> Show App Tokens</a></li>
  <li><a href="" ng-click="getFCMTokens(user._id,user.userName,$index)"><i class="fa fa-mobile" aria-hidden="true"></i> Get FCM Tokens</a></li>

  <li class="divider"></li>

  <li><a href="" ng-click="pauseUserNotifs(user._id,user.userName,$index,'pause')"><i class="fa fa-mobile" aria-hidden="true"></i><i class="fa fa fa-bell-o"></i> PAUSE Mobile Notifs</a></li>
  <li><a href="" ng-click="pauseUserNotifs(user._id,user.userName,$index,'resume')"><i class="fa fa-mobile" aria-hidden="true"></i><i class="fa fa-play"></i> RESUME Mobile Notifs</a></li>
  <li><a href="" ng-click="pauseUserNotifs(user._id,user.userName,$index,'unsub')"><i class="fa fa-mobile" aria-hidden="true"></i><i class="fa fa-trash"></i> Remove Mobile Notifs</a></li>
  <li><a href="" ng-click="sendTestFCM(user._id,user.userName,$index)"><i class="fa fa-mobile" aria-hidden="true"></i><i class="fa fa fa-bell-o"></i> Send Test Mobile Notifs</a></li>
  <li><a href="" ng-click="resetFCMForuser(user._id,user.userName,$index)"><i class="fa fa-mobile" aria-hidden="true"></i><i class="fa fa-reload"></i> Reset Mobile Notifs</a></li>
</ul>
```

Child order inside each `<a>` is exactly as captured (`.0` then `.1`). `aria-hidden="true"` is reproduced exactly where captured and omitted exactly where absent. The `fa fa fa-bell-o` duplication and the `fa fa-reload` non-class are reproduced verbatim — they are what the reference ships (see §9 gap 5 for what they actually paint).
The text-node position relative to the icons is **not** captured (§9 gap 3); the icon(s)-then-text order shown here matches the *measured* root-menu items (`icon.x = li.x + a.padding-left`, P11 §3) and is flagged as an inference.

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

.dropdown-menu > li     { display:list-item; position:static; margin:0; padding:0;
                          white-space:normal; cursor:auto; list-style:none; }
.dropdown-menu > li > a { display:block; box-sizing:border-box; padding:3px 20px; margin:0; border:0;
                          color:rgb(51,51,51); text-decoration:none; white-space:nowrap;
                          font:400 13px/18.5714px "Helvetica Neue",Helvetica,Arial,sans-serif;
                          text-align:left; background-color:rgba(0,0,0,0); cursor:pointer; }
.dropdown-menu .divider { display:list-item; height:1px; margin:9px 0; padding:0;
                          overflow:hidden; background-color:rgb(229,229,229);
                          white-space:normal; cursor:auto; }
.fa                     { display:inline-block; font-family:FontAwesome; font-size:13px;
                          line-height:13px; font-style:normal; font-weight:400;
                          color:rgb(51,51,51); white-space:nowrap; }
```

**[DERIVED]** rendered box, using the item metrics measured in the row menu:
`8 items × 24.5703 + 1 divider × 19 + 5 + 5 (padding) + 1 + 1 (border) = 196.5624 + 19 + 12 = 227.56px` tall; width `max(160px, shrink-to-fit)` — the longest label here is `Send Test Mobile Notifs` preceded by two icons. Anchored at the parent `<li>`'s bottom-left `+ 2px`: **[DERIVED]** `x = 1417.7, y = 716.67` for row 2 and `x = 1417.7, y = 779.07` for row 3 (P11 §8.4).

### 8.3 Conditional logic

**There is none.** Zero `ng-if` / `ng-show` / `ng-hide` / `ng-class` in all 31 nodes, and the capture's `display` value set contains no `none`. All 8 items render for every user for whom the parent Actions menu renders at all — i.e. every `user.role !== 0`. The submenu's *visibility* is controlled solely by `submenuOpen.app` on the parent `<li>` (P11 §8.4), which the parent `ng-click` toggles while force-closing the other three submenus.

Handler contract to wire in a rebuild (all verbatim from `ng-click`):

```
getAppPin(user.email, user.userName, $index)                       →  read pairing PIN   (keyed on EMAIL)
showAlerterAppTokens(user.userName, user.alerterAppTokens)         →  display tokens already on scope (no _id, no $index)
getFCMTokens(user._id, user.userName, $index)                      →  fetch FCM tokens
pauseUserNotifs(user._id, user.userName, $index, 'pause')          →  pause push
pauseUserNotifs(user._id, user.userName, $index, 'resume')         →  resume push
pauseUserNotifs(user._id, user.userName, $index, 'unsub')          →  unsubscribe / remove push
sendTestFCM(user._id, user.userName, $index)                       →  send a test push
resetFCMForuser(user._id, user.userName, $index)                   →  full reset   (note the lower-case "user" in the name)
```

---

## 9. Honest gaps

1. **No geometry whatsoever.** All 31 rects are `x=0 y=0 w=0 h=0` in captures 07, 12 **and** 17. Cause: the harness forced `style="display: block;"` onto the submenu `<ul>` after the parent row menu had already reverted to `display:none`, so nothing was laid out. Submenu width, height and per-item x/y are **unknown**; the `227.56px` height in §8.2 is arithmetic from row-menu metrics, not a measurement.
2. **Hover / focus / `.open` styling is not captured.** No `:hover` background, no focus ring, no evidence of what `.open` does visually beyond revealing the submenu. Do not fill this in from Bootstrap memory.
3. **Text position inside the five two-icon items is unknown.** `PAUSE / RESUME / Remove / Send Test / Reset Mobile Notifs` each have children `[i.fa-mobile, i.<action>]`; the element-only dump does not record where the text node sits relative to them and there are no rects to infer from. §8.1 places the text last by analogy with the measured root-menu items — flagged as inference.
4. **FontAwesome glyph codepoints unrecoverable.** All 12 present `::before` records serialise `content` as `"\"\""`; the PUA character did not survive transcoding. Only class names are evidence.
5. **⚠ Upstream icon bugs in this submenu.**
   * `r.8.0.1` `class="fa fa-reload"` (`Reset Mobile Notifs`) — the **only** `<i>` here with **no `::before` record**. `fa-reload` is not a FontAwesome 4 class, so the icon paints nothing and the item shows only the leading `fa-mobile`. *(Known bug — confirmed by direct evidence.)*
   * `r.4.0.1` and `r.7.0.1` `class="fa fa fa-bell-o"` — the duplicated `fa` token is an authoring slip, but both nodes **do** carry a `::before`, so the bell renders correctly. *(Known bug — confirmed harmless.)*
   * For completeness across the whole row menu, the other blank-glyph offender is `fa fa-user-circle` ×2, which lives in Granular Perms (P13), not here.
6. **No rendered screenshot.** This decode is DOM + computed-style only; no pixel diff has been performed.
7. **Row-1 unreachability is inferred from the parent, not from this piece.** Capture 07 is complete, but the row-1 Actions control is `ng-hide`-ed (`user.role==0`), so in the live app this submenu can never be opened for row 1. That conclusion rests on baseline node `#1570`, not on capture 07 itself.
8. **`user.alerterAppTokens` content is not captured.** `showAlerterAppTokens` reads it straight off the scope object; nothing in this evidence set reveals its shape or whether it is populated for the captured users. Any rebuild must treat it as an honest-pending value, never a fabricated token list.
