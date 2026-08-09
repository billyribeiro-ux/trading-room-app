# ptr1 decode — Part 04: Interaction captures (modal + 17 dropdowns)

Source: `evidence-dumps/NEXT-STEP/ptr1.json`, captures **[01]–[18]**, decoded slices under `/tmp/ptr-decode/ptr1/caps/`.
Page: `https://protradingroom.com/ptrApp#/page/manageSession/6a628a99731b9f77ae9bf505`, role=member,
viewport 1842×1265 @dpr2, captured 2026-07-24T15:59:18–19Z (`00-META.txt` lines 5–8).

Every claim below cites `caps/<dir>/nodes-NNN.txt #index path=<path>`. Node full style =
that capture's own `DEFAULTS.txt` COMMON table, overridden by the node's `style-deviations`.

---

## 0. How to read this part / what the harness did

All 18 captures are `kind = subtree` (`caps/01-modal_permissionsModal/INFO.txt` line 4, and the
same line in every other `INFO.txt`), and **every subtree is re-rooted at `path=r`**. Capture [02]'s
menu and capture [09]'s menu both report `#0 path=r` — the path therefore does **not** locate the
menu inside the baseline document tree. This is an honest limitation of the slice (see §7).

The harness evidently forced each `.dropdown-menu` open one at a time: the four submenus of the
per-user menu appear *inside* capture [04] with `attr class = "dropdown-menu"` and
`display: none` (`caps/04-…/nodes-000.txt #15 path=r.0.1`), yet the standalone captures of those
same elements carry `attr class = "dropdown-menu show"` + `attr style = "display: block;"`
(`caps/05-…/nodes-000.txt #0 path=r`). Timestamps are 62–71 ms apart and strictly sequential
(`00-META.txt` lines 15–31), consistent with a scripted walk, not user clicks.

Because of that forcing, most forced-open subtrees were never laid out: their rects are all
`x=0 y=0 w=0 h=0`. Real geometry exists only for captures **[02]**, **[03]**, **[09]** and **[14]**.
Rects are reported exactly as captured; no geometry is inferred.

---

## 1. The permissions modal — capture [01], 22 nodes

`caps/01-modal_permissionsModal/` — `INFO.txt` line 5: `node count : 22 (declared 22, truncated=false)`.

### 1.1 Dialog shell and box model

| # / path | tag | attrs | rect (CSS px) | key computed style |
|---|---|---|---|---|
| `#0 path=r` | `div` | `class="modal fade show"`, `id="permissionsModal"`, `tabindex="-1"`, `role="dialog"`, `aria-labelledby="permissionsModalLabel"`, `style="display: block; visibility: visible;"` | x=0 y=0 w=1842 h=1265 | `position: fixed`; `top/right/bottom/left: 0px`; **`z-index: 1050`**; `overflow-x/y: hidden`; **`opacity: 0`**; `transition-property: opacity`, `transition-duration: 0.15s` |
| `#1 path=r.0` | `div` | `class="modal-dialog"`, `role="document"` | x=621 y=-52.2 w=600 h=328.7 | `position: relative`; `width: 600px`; `margin: 30px 621px`; `transition-property: transform`, `duration 0.3s`; **`transform: matrix(1, 0, 0, 1, 0, -82.1777)`** |
| `#2 path=r.0.0` | `div` | `class="modal-content"` | x=621 y=-52.2 w=600 h=328.7 | `padding: 20px` all sides; `border: 1px solid rgba(0, 0, 0, 0.2)`; `border-radius: 6px`; `background-color: rgb(255, 255, 255)`; `background-clip: padding-box`; `box-shadow: rgba(0, 0, 0, 0.5) 0px 5px 15px 0px` |
| `#3 path=r.0.0.0` | `div` | `class="modal-header"` | x=642 y=-31.2 w=558 h=56.7 | `padding: 15px`; `border-bottom: 1px solid rgb(229, 229, 229)`; `::before`/`::after` both `content: " "` (clearfix) |
| `#4 path=r.0.0.1` | `div` | `class="modal-body"` | x=642 y=25.5 w=558 h=165 | `position: relative`; `padding: 15px` |
| `#5 path=r.0.0.2` | `div` | `class="modal-footer text-right"` | x=642 y=190.5 w=558 h=65 | `padding: 15px`; `border-top: 1px solid rgb(229, 229, 229)`; `text-align: right`; clearfix `::before`/`::after` |

**Capture state.** `#0` has `opacity: 0` and `#1` has `transform: translateY(-82.1777px)` — the modal
was captured **mid fade/slide-in**, before the Bootstrap `.in`/`.show` transition finished. The
negative `y=-52.2` on `#1`/`#2` is that translate applied to the resting position
(`margin-top: 30px` → resting top = 30; 30 − 82.1777 = −52.18, matching `y=-52.2`).
A rebuild should render the **resting** state: dialog 600×328.71 at x=621, top 30.

Text/base colours from `caps/01-…/DEFAULTS.txt`: `color: rgb(51, 51, 51)` (19/22 nodes, line 64),
`font-family: "Helvetica Neue", Helvetica, Arial, sans-serif` (22/22, line 65), `font-size: 14px`
(18/22, line 66).

### 1.2 Header

* `#6 path=r.0.0.0.0` `<button type="button" class="close" data-dismiss="modal" aria-label="Close">` —
  rect x=1172.4 y=-18.2 w=12.6 h=21; `float: right`; `margin-top: -2px`; `color: rgb(0, 0, 0)`;
  `font-size: 21px`; `line-height: 21px`; `text-shadow: rgb(255, 255, 255) 0px 1px 0px`;
  **`opacity: 0.2`**; `cursor: pointer`.
* `#15 path=r.0.0.0.0.0` `<span aria-hidden="true">` `text: "×"` — x=1172.4 y=-20.2 w=12.6 h=25.
* `#7 path=r.0.0.0.1#permissionsModalLabel` `<h4 class="modal-title" id="permissionsModalLabel">` —
  `text: "Adjust Mic/Cam/Screen permissions for user:"`; rect x=657 y=-16.2 w=528 h=25.7;
  `font-size: 18px`; `font-weight: 500`; `line-height: 25.7143px`.
* `#16 path=r.0.0.0.1#permissionsModalLabel.0` `<i class="ng-binding">` — rect x=1034.2 y=-14.2
  **w=0** h=21.5; `font-style: italic`. **The username binding rendered empty** (width 0, no `text:`
  line). The dialog title in the reference is therefore literally
  `Adjust Mic/Cam/Screen permissions for user:` with an empty italic slot after it — honest gap, §7.

### 1.3 Body — five permission checkboxes

All five `<label class="d-block">` share `max-width: 100%`, `margin-bottom: 5px`, rect w=528 h=22,
x=657. All five `<input type="checkbox" name="checkbox" class="ng-pristine ng-untouched ng-valid">`
share `display: inline-block`, `width/height: 13px`, `margin-top: 4px`, `line-height: normal`,
`appearance: auto`, rect 13×13 at x=657.

| label node | label text | y (label) | input node | `ng-model` | `ng-change` | y (input) |
|---|---|---|---|---|---|---|
| `#8 path=r.0.0.1.0` | `Microphone` | 40.5 | `#17 path=r.0.0.1.0.0` | `userPermissions.hasMic` | `toggleHasMic()` | 44.5 |
| `#9 path=r.0.0.1.1` | `Screenshare` | 67.5 | `#18 path=r.0.0.1.1.0` | `userPermissions.hasScreen` | `toggleHasScreen()` | 71.5 |
| `#10 path=r.0.0.1.2` | `WebCam` | 94.5 | `#19 path=r.0.0.1.2.0` | `userPermissions.hasCam` | `toggleHasCam()` | 98.5 |
| `#11 path=r.0.0.1.3` | `AdminChat` | 121.5 | `#20 path=r.0.0.1.3.0` | `userPermissions.hasAdminChat` | `toggleHasAdminChat()` | 125.5 |
| `#12 path=r.0.0.1.4` | `CanEditNotes` | 148.5 | `#21 path=r.0.0.1.4.0` | `userPermissions.canEditNotes` | `toggleCanEditNotes()` | 152.5 |

Row pitch = 27px (40.5 → 67.5 → 94.5 → 121.5 → 148.5). Each row is a block `<label>` with the
checkbox as its **first child**, so the text follows the box on the same line.

### 1.4 Footer buttons

* `#13 path=r.0.0.2.0` `<button type="button" class="btn btn-default" data-dismiss="modal">`
  `text: "Close"` — rect x=997.6 y=206.5 w=61.8 h=34; `padding: 6px 12px`;
  `border: 1px solid rgb(230, 233, 238)`; `border-radius: 4px`;
  `background-color: rgb(255, 255, 255)`; `text-align: center`; `white-space: nowrap`;
  `vertical-align: middle`; `cursor: pointer`; `user-select: none`.
* `#14 path=r.0.0.2.1` `<button type="button" class="btn btn-success" ng-click="saveUserPermissions()">`
  `text: "Save Changes"` — rect x=1068.3 y=206.5 w=116.8 h=34; `margin-left: 5px`;
  `padding: 6px 12px`; `border: 1px solid rgb(76, 174, 76)`; `border-radius: 4px`;
  **`background-color: rgb(92, 184, 92)`**; `color: rgb(255, 255, 255)`.

**There is no `<i>`/icon inside either button** — no child records exist under `r.0.0.2.0` or
`r.0.0.2.1` in the 22-node dump.

### 1.5 Backdrop and z-index stack

* Modal root `z-index: 1050` (`#0`).
* Every dropdown menu root `z-index: 1000` (e.g. `caps/02-…/nodes-000.txt #0 path=r`;
  `caps/08-…/DEFAULTS.txt` line 13).
* **No `.modal-backdrop` node exists in capture [01]** — the subtree is rooted at `#permissionsModal`
  and contains 22 nodes only. Backdrop styling is an honest gap (§7).

---

## 2. Dropdown catalogue — one section per capture

Shared chrome for **every** `.dropdown-menu` root in captures [02]–[18] (identical values in all of
them; cited from `caps/08-…/DEFAULTS.txt` lines 8–13, 34–57, 63, 66, 69, 71, 83, 95 and reproduced
as `style-deviations` on each root):

```
position: absolute;  z-index: 1000;  min-width: 160px;
margin-top: 2px;  padding: 5px 0;
border: 1px solid rgba(0, 0, 0, 0.15);  border-radius: 2px;
background-color: rgb(255, 255, 255);  background-clip: padding-box;
box-shadow: rgba(0, 0, 0, 0.176) 0px 6px 12px 0px;
color: rgb(51, 51, 51);  font-size: 13px;  font-weight: 400;
line-height: 18.5714px;  text-align: left;  list-style-type: none;
```

Shared item chrome: `<a href="" ng-click="…">` with `display: block` and `padding: 3px 20px`
(e.g. `caps/02-…/nodes-000.txt #11 path=r.0.0`); item `<li>` height **24.5703px**;
`cursor: pointer` on the anchors (`caps/02-…/DEFAULTS.txt` line 87).
Divider `<li class="divider">`: `height: 1px`, `margin: 9px 0`,
`background-color: rgb(229, 229, 229)`, `overflow: hidden`
(e.g. `caps/02-…/nodes-000.txt #7 path=r.6`).
Icons are FontAwesome `<i class="fa fa-…">` with `font-family: FontAwesome`, `line-height: 13px`,
`display: inline-block`, glyph delivered via `::before { content: "\f…" }`.

### [02] User-list filter / bulk-remove menu — 28 nodes, LAID OUT

`caps/02-dropdown_dropdown-menu.show/nodes-000.txt`.
Root `#0 path=r` `<ul role="menu" class="dropdown-menu show" style="display: block;">` —
**rect x=1230.7 y=451 w=200.5 h=252.1**; computed `top: 44px`, `right: -52.4297px`,
`bottom: -254.133px`, `left: 0px`. Items x=1231.7 w=198.5.

| order | li | rect y / h | label | `ng-click` | icon |
|---|---|---|---|---|---|
| 1 | `#1 r.0` | 457 / 24.6 | `Show Free Trials` (`#11 r.0.0`) | `loadUsersFT()` | **none** |
| 2 | `#2 r.1` | 481.6 / 24.6 | `Show BANNED` (`#12 r.1.0`) | `loadBannedUsers()` | `fa fa-ban` (`#20 r.1.0.0`, w=11.1) |
| 3 | `#3 r.2` | 506.1 / 24.6 | `Show Mobile` (`#13 r.2.0`) | `loadMobileUsers()` | `fa fa-mobile` (`#21 r.2.0.0`, w=5.6) |
| 4 | `#4 r.3` | 530.7 / 24.6 | `Show Non-Mobile` (`#14 r.3.0`) | `loadNonMobileUsers()` | `fa fa-mobile` (`#22 r.3.0.0`) |
| 5 | `#5 r.4` | 555.3 / 24.6 | `Show Presenters` (`#15 r.4.0`) | `loadPresentersUsers()` | `fa fa-microphone` (`#23 r.4.0.0`, w=8.4) |
| 6 | `#6 r.5` | 579.9 / 24.6 | `Marketplace Users` (`#16 r.5.0`) | `loadMarketplaceUsers()` | `fa fa-credit-card` (`#24 r.5.0.0`, w=13.9) |
| — | `#7 r.6` | 613.4 / **1** | `<li role="separator" class="divider">` | — | — |
| 7 | `#8 r.7` | 623.4 / 24.6 | `Remove non-presenters` (`#17 r.7.0`) | `clearUserList()` | `fa fa-trash-o` (`#25 r.7.0.0`, w=10.2) |
| 8 | `#9 r.8` | 648 / 24.6 | `Remove Free Trials` (`#18 r.8.0`) | `removeUsersFT()` | `fa fa-trash-o` (`#26 r.8.0.0`) |
| 9 | `#10 r.9` | 672.6 / 24.6 | `Remove All User Badges` (`#19 r.9.0`) | `removeBadgesForUsers()` | `fa fa-trash-o` (`#27 r.9.0.0`) |

The divider is the only node in this dump carrying `role="separator"` (`#7`); the dividers in every
other capture carry `class="divider"` alone.

### [03] Bulk "apply to many users" menu — 33 nodes, LAID OUT

`caps/03-dropdown_dropdown-menu.show/nodes-000.txt`.
Root `#0 path=r` `<ul role="menu" class="dropdown-menu show" style="display: block;">` —
**rect x=37 y=480.6 w=238.7 h=257.7**; computed `top: 16.5px`, `right: 137.953px`,
`bottom: -259.703px`, `left: 0px`. Items x=38 w=236.7 h=24.6, pitch 24.6, **no dividers**.

| order | li | y | label | `ng-click` | icon(s) |
|---|---|---|---|---|---|
| 1 | `#1 r.0` | 486.6 | `Remove All` (`#11 r.0.0`) | `updateManyUsers(10)` | `icon fa fa-trash` (`#21`) |
| 2 | `#2 r.1` | 511.2 | `UNBAN Participant` (`#12 r.1.0`) | `updateManyUsers(2)` | `icon fa fa-user` (`#22`) |
| 3 | `#3 r.2` | 535.8 | `Make Presenter` (`#13 r.2.0`) | `updateManyUsers(1)` | `fa fa-microphone` (`#23`) + `fa fa-desktop` (`#24`) |
| 4 | `#4 r.3` | 560.3 | `Make Admin (Non-Presenter)` (`#14 r.3.0`) | `updateManyUsers(5)` | `fa fa-cog aria-hidden="true"` (`#25`) + `fa fa-user-md` (`#26`) |
| 5 | `#5 r.4` | 584.9 | `Make Participant` (`#15 r.4.0`) | `updateManyUsers(2)` | `icon fa fa-user` (`#27`) |
| 6 | `#6 r.5` | 609.5 | `Make TRIAL user` (`#16 r.5.0`) | `updateManyUsers(6)` | `icon fa fa-user` (`#28`) |
| 7 | `#7 r.6` | 634 | `MUTE Participant` (`#17 r.6.0`) | `updateManyUsers(3)` | `fa fa-user-times` (`#29`, w=14.9) |
| 8 | `#8 r.7` | 658.6 | `BAN Participant` (`#18 r.7.0`) | `updateManyUsers(4)` | `fa fa-user-times` (`#30`) |
| 9 | `#9 r.8` | 683.2 | `Add Badge` (`#19 r.8.0`) | `updateManyUsersBadgePrompt('add')` | `icon fa fa-user` (`#31`) |
| 10 | `#10 r.9` | 707.8 | `Remove Badge` (`#20 r.9.0`) | `updateManyUsersBadgePrompt('remove')` | `icon fa fa-user` (`#32`) |

Note items 2 and 5 fire the **same** `updateManyUsers(2)` — "UNBAN Participant" and
"Make Participant" are the same role code (2) in the reference (`#12` vs `#15`).

### [04] / [09] / [14] Per-user row action menu — 128 nodes each

Roots: `caps/04-…/nodes-000.txt #0 path=r`, `caps/09-…/nodes-000.txt #0 path=r`,
`caps/14-…/nodes-000.txt #0 path=r` — all
`<ul role="menu" class="dropdown-menu dropdown-menu-right show" style="display: block;">`.

Geometry (the `dropdown-menu-right` variant computes `right: 0px`):

| capture | rect | computed top/right/bottom/left |
|---|---|---|
| [04] | **x=0 y=0 w=0 h=0** (not laid out) | `top: 100%`, `right: 0px` (no bottom/left deviation) |
| [09] | x=1416.7 **y=635** w=199.2 h=314.7 | `top: 34px`, `right: 0px`, `bottom: -316.703px`, `left: -110.508px` |
| [14] | x=1416.7 **y=697.4** w=199.2 h=314.7 | `top: 34px`, `right: 0px`, `bottom: -316.703px`, `left: -110.508px` |

Items (rects quoted from [09], x=1417.7 w=197.2 h=24.6; [14] is identical shifted +62.4px in y):

| order | li | [09] y | label / node | `ng-click` | icon(s) |
|---|---|---|---|---|---|
| 1 | `#1 r.0` `class="dropdown-submenu" ng-class="{open: submenuOpen.permissions}"` | 641 | `Permissions` (`#14 r.0.0`) | `submenuOpen.permissions=!submenuOpen.permissions; submenuOpen.granular=false; submenuOpen.app=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();` | `fa fa-shield` (`#28`) + `fa fa-caret-right pull-right` (`#29`, `float: right`, `margin-left: 3.9px`) |
| 2 | `#2 r.1` `ng-class="{open: submenuOpen.granular}"` | 665.6 | `Granular Perms` (`#16 r.1.0`) | `submenuOpen.granular=!submenuOpen.granular; …permissions=false; …app=false; …badges=false; preventDefault; stopPropagation` | `fa fa-sliders` (`#39`) + caret (`#40`) |
| 3 | `#3 r.2` `ng-class="{open: submenuOpen.app}"` | 690.1 | `App and Notifications` (`#18 r.2.0`) | `submenuOpen.app=!submenuOpen.app; …` | `fa fa-mobile` (`#53`) + caret (`#54`) |
| 4 | `#4 r.3` `ng-class="{open: submenuOpen.badges}"` | 714.7 | `Badges` (`#20 r.3.0`) | `submenuOpen.badges=!submenuOpen.badges; …` | `fa fa-certificate` (`#64`) + caret (`#65`) |
| — | `#5 r.4 class="divider"` | 748.3 (h=1) | — | — | — |
| 5 | `#6 r.5` | 758.3 | `Set Note` (`#22 r.5.0`) | `setNoteUser(user._id,user.userName,$index)` | `fa fa-pencil-square-o` (`#66`) |
| 6 | `#7 r.6` | 782.9 | `Edit Username` (`#23 r.6.0`) | `editUsername(user._id, user.userName)` | `fa fa-edit` (`#67`) |
| 7 | `#8 r.7` | 807.4 | `Remove User` (`#24 r.7.0`) | `deleteParticipant(user.userName,user._id,$index)` | `fa fa-trash` (`#68`) |
| — | `#9 r.8 class="divider"` | 841 (h=1) | — | — | — |
| 8 | `#10 r.9` | 851 | `Set/Change Password` (`#25 r.9.0`) | `setUserPW(user._id,user.userName,$index)` | `fa fa-lock` (`#69`) |
| 9 | `#11 r.10` | 875.6 | `Resend Welcome Email` (`#26 r.10.0`) | `sendWelcomeEmail(user._id,user.userName,$index)` | `fa fa-envelope` (`#70`) |
| — | `#12 r.11 class="divider"` | 909.1 (h=1) | — | — | — |
| 10 | `#13 r.12` | 919.1 | `Pause / Pending` (`#27 r.12.0`) | `approveUser(user.userName,user._id,$index,'pending')` | `fa fa-pause` (`#71`) |

The four submenu `<ul class="dropdown-menu">` (`#15 r.0.1`, `#17 r.1.1`, `#19 r.2.1`, `#21 r.3.1`)
are present but `display: none` in all three captures; `r.3.1` (**Badges**) has **no child records
at all** in any of [04]/[09]/[14] — the badges submenu is empty (see §5).

### [05] / [10] / [15] "Permissions" submenu (= `r.0.1` of the row menu) — 28 nodes

`caps/05-…/nodes-000.txt` (identical semantics in [10], [15] — proven in §4). Root `#0 path=r`
`<ul class="dropdown-menu show" style="display: block;">`, all rects 0×0 (forced open, never laid out).

| order | li | label | `ng-click` | icon(s) |
|---|---|---|---|---|
| 1 | `#1 r.0` | `Make Presenter` (`#10 r.0.0`) | `updateUser(1,user._id,user.userName,$index)` | `fa fa-microphone` (`#18`) + `fa fa-desktop` (`#19`) |
| 2 | `#2 r.1` | `Make Admin` (`#11 r.1.0`) | `updateUser(5,…)` | `fa fa-cog aria-hidden="true"` (`#20`) + `fa fa-user-md` (`#21`) |
| 3 | `#3 r.2` | `Make Participant` (`#12 r.2.0`) | `updateUser(2,…)` | `fa fa-user` (`#22`) |
| 4 | `#4 r.3` | `Make Trial` (`#13 r.3.0`) | `updateUser(6,…)` | `fa fa-user` (`#23`) |
| 5 | `#5 r.4` | `MUTE Participant` (`#14 r.4.0`) | `updateUser(3,…)` | `fa fa-user-times` (`#24`) |
| 6 | `#6 r.5` | `BAN` (`#15 r.5.0`) | `updateUser(4,…)` | `fa fa-user-times` (`#25`) |
| — | `#7 r.6 class="divider"` | — | — | — |
| 7 | `#8 r.7` | `Unban` (`#16 r.7.0`) | `updateUser(2,…)` | `fa fa-user` (`#26`) |
| 8 | `#9 r.8` | `Freshen Login Date` (`#17 r.8.0`) | `updateUser(9,…)` | `fa fa-clock-o` (`#27`) |

### [06] / [11] / [16] "Granular Perms" submenu (= `r.1.1`) — 30 nodes

`caps/06-…/nodes-000.txt`. Root `#0 path=r` as above; rects 0×0.

| order | li | conditional | label | `ng-click` | icon |
|---|---|---|---|---|---|
| 1 | `#1 r.0` | `ng-show="user.role !== 1"` | `Adjust Mic/Cam/Screen/Chat/Notes` (`#13 r.0.0`) | `setPermissions(user)` **+ `data-toggle="modal"` `data-target="#permissionsModal"`** | **none** |
| — | `#2 r.1 class="divider"` | — | — | — | — |
| 2 | `#3 r.2` | — | `Show User Count` (`#14 r.2.0`) | `updateUser(8,…)` | `fa fa-user-circle` (`#22`) |
| 3 | `#4 r.3` | — | `Hide User Count` (`#15 r.3.0`) | `updateUser(7,…)` | `fa fa-user-circle` (`#23`) |
| 4 | `#5 r.4` | `ng-show="!user.denyArchivesAccess"` | `Deny Archives Access` (`#16 r.4.0`) | `updateUser(13,…)` | `fa fa-hdd-o` (`#24`) |
| 5 | `#6 r.5` | `ng-show="user.denyArchivesAccess"` **+ `class="ng-hide"`, `display: none`** | `Allow Archives Access` (`#17 r.5.0`) | `updateUser(14,…)` | `fa fa-hdd-o` (`#25`) |
| 6 | `#7 r.6` | — | `Hide Pers User Data` (`#18 r.6.0`) | `updateUser(10,…)` | `fa fa-lock` (`#26`) |
| 7 | `#8 r.7` | — | `Don't Hide Pers User Data` (`#19 r.7.0`) | `updateUser(11,…)` | `fa fa-user` (`#27`) |
| — | `#9 r.8 class="divider"` | — | — | — | — |
| 8 | `#10 r.9` | — | `Disallow User2User PM` (`#20 r.9.0`) | `setUserRestrictPM(true,user._id,user.userName)` | `fa fa-comment-o` (`#28`) |
| 9 | `#11 r.10` | — | `Allow User2User PM` (`#21 r.10.0`) | `setUserRestrictPM(false,user._id,user.userName)` | `fa fa-comment-o` (`#29`) |
| — | `#12 r.11 class="divider"` | — | — | — | — |

Items 4/5 and 8/9 are mutually-exclusive toggle pairs; `r.11` is a **trailing** divider with nothing
after it (there is no `r.12` record) — a stray separator in the reference markup, reproduce as-is.
**This is the menu item that opens the capture-[01] modal** (`data-target="#permissionsModal"`).

### [07] / [12] / [17] "App and Notifications" submenu (= `r.2.1`) — 31 nodes

`caps/07-…/nodes-000.txt`. Root `#0 path=r` as above; rects 0×0.

| order | li | label | `ng-click` | icon(s) |
|---|---|---|---|---|
| 1 | `#1 r.0` | `Get App PIN` (`#10 r.0.0`) | `getAppPin(user.email,user.userName,$index)` | `fa fa-mobile` (`#18`) |
| 2 | `#2 r.1` | `Show App Tokens` (`#11 r.1.0`) | `showAlerterAppTokens(user.userName,user.alerterAppTokens)` | `fa fa-mobile` (`#19`) |
| 3 | `#3 r.2` | `Get FCM Tokens` (`#12 r.2.0`) | `getFCMTokens(user._id,user.userName,$index)` | `fa fa-mobile aria-hidden="true"` (`#20`) |
| — | `#4 r.3 class="divider"` | — | — | — |
| 4 | `#5 r.4` | `PAUSE Mobile Notifs` (`#13 r.4.0`) | `pauseUserNotifs(user._id,user.userName,$index,'pause')` | `fa fa-mobile` (`#21`) + `fa fa fa-bell-o` (`#22`) |
| 5 | `#6 r.5` | `RESUME Mobile Notifs` (`#14 r.5.0`) | `pauseUserNotifs(…,'resume')` | `fa fa-mobile` (`#23`) + `fa fa-play` (`#24`) |
| 6 | `#7 r.6` | `Remove Mobile Notifs` (`#15 r.6.0`) | `pauseUserNotifs(…,'unsub')` | `fa fa-mobile` (`#25`) + `fa fa-trash` (`#26`) |
| 7 | `#8 r.7` | `Send Test Mobile Notifs` (`#16 r.7.0`) | `sendTestFCM(user._id,user.userName,$index)` | `fa fa-mobile` (`#27`) + `fa fa fa-bell-o` (`#28`) |
| 8 | `#9 r.8` | `Reset Mobile Notifs` (`#17 r.8.0`) | `resetFCMForuser(user._id,user.userName,$index)` | `fa fa-mobile` (`#29`) + `fa fa-reload` (`#30`) |

Two class strings in the reference are malformed and must be copied verbatim if matching the DOM:
`class="fa fa fa-bell-o"` (duplicated `fa`, `#22`/`#28`) and `class="fa fa-reload"` (`#30`) —
**`fa-reload` is not a FontAwesome 4 class**, so that glyph renders blank. Consistent with `#30`
being the only icon record in [07] with **no `::before` line** at all (compare `#29`, which has one).
Same for `fa fa-user-circle` in [06] `#22`/`#23` — no `::before` captured either.

### [08] / [13] / [18] — 1 node each

See §5.

---

## 3. Which trigger owns each dropdown

**Hard limitation first:** every subtree capture is re-rooted at `path=r`
(`caps/02-…/nodes-000.txt #0 path=r`, `caps/09-…/nodes-000.txt #0 path=r`, …). The root path
therefore carries **no** information about the menu's location in the baseline DOM. Mapping menus to
baseline trigger elements requires capture [00] `baseline-room` (2156 nodes), which is **not in my
slice**. What follows is derived strictly from attributes and Angular scope expressions **inside my
own files**, and is labelled by confidence.

| capture | owning trigger — evidence | confidence |
|---|---|---|
| [02] | Handlers are list-scope, not user-scope: `loadUsersFT()`, `loadBannedUsers()`, `loadMobileUsers()`, `loadNonMobileUsers()`, `loadPresentersUsers()`, `loadMarketplaceUsers()`, `clearUserList()`, `removeUsersFT()`, `removeBadgesForUsers()` (`caps/02-…/nodes-000.txt #11–#19`). No `user.` or `$index` reference anywhere in the capture. It is laid out at x=1230.7 y=451, i.e. a menu hanging off a control on the right-hand side of the page at y≈451−44=407 (root `top: 44px`). → a **user-list toolbar / "Show…" filter button**. | High that it is list-scoped; the exact button element is **unverified** (needs [00]). |
| [03] | Every handler is `updateManyUsers(n)` / `updateManyUsersBadgePrompt('add'\|'remove')` (`#11–#20`) — bulk operations over a selection. Laid out at x=37 y=480.6, i.e. far **left** of the page, `top: 16.5px` under its trigger. → a **bulk-action ("apply to selected") button on the left column**. | High that it is bulk-scoped; exact element unverified. |
| [04]/[09]/[14] | Every handler passes `user._id, user.userName, $index` (`#22`–`#27`) and the root carries `dropdown-menu-right` → right-aligned to its trigger. `right: 0px`, `top: 34px`, item width 197.2 → a compact 34px-tall trigger. → the **per-row overflow/gear button in a user/participant list row** (one instance per `ng-repeat` row). | High. |
| [05]–[08], [10]–[13], [15]–[18] | Each is one of the four `<ul class="dropdown-menu">` children of the row menu — proven structurally: [05] item list ≡ `r.0.1.*` of [04] (`caps/04-…/nodes-000.txt #72–#79` + `#97–#106` vs `caps/05-…/nodes-000.txt #10–#17` + `#18–#27`); [06] ≡ `r.1.1.*` (`#80–#88`, `#107–#114`); [07] ≡ `r.2.1.*` (`#89–#96`, `#115–#127`); [08] ≡ `r.3.1` (childless). Their triggers are the four `dropdown-submenu` anchors `Permissions` / `Granular Perms` / `App and Notifications` / `Badges` (`caps/04-…/nodes-000.txt #14, #16, #18, #20`), driven by `submenuOpen.permissions/granular/app/badges`. | **Proven** from within my slice. |

---

## 4. The repeat structure — three groups of (128, 28, 30, 31, 1)

**Answer: three DIFFERENT DOM elements — three different rows of the same `ng-repeat`, showing
three different users — not one element captured three times.**

### 4.1 Evidence table

| evidence | group 1 ([04]–[08]) | group 2 ([09]–[13]) | group 3 ([14]–[18]) |
|---|---|---|---|
| parent root rect | `x=0 y=0 w=0 h=0` (`caps/04-…/nodes-000.txt #0`) | `x=1416.7 **y=635** w=199.2 h=314.7` (`caps/09-…/nodes-000.txt #0`) | `x=1416.7 **y=697.4** w=199.2 h=314.7` (`caps/14-…/nodes-000.txt #0`) |
| parent computed offsets | `top: 100%`, `right: 0px` | `top: 34px`, `right: 0px`, `bottom: -316.703px`, `left: -110.508px` | identical to group 2 |
| **`r.1.1.0` (`ng-show="user.role !== 1"`)** | `attr ng-show = "user.role !== 1"` only, **visible** (`caps/04-…/nodes-000.txt #41`) | same, **visible** (`caps/09-…/nodes-000.txt #41`) | **`attr class = "ng-hide"` + `display: none`** (`caps/14-…/nodes-000.txt #41`) |
| same fact in the standalone submenu | `caps/06-…/nodes-000.txt #1 path=r.0` — no `ng-hide` | `caps/11-…/nodes-000.txt #1 path=r.0` — no `ng-hide` | `caps/16-…/nodes-000.txt #1 path=r.0` — **`class="ng-hide"`, `display: none`** |
| `DEFAULTS.txt` `display\|list-item` count | 42/128 (`caps/04-…/DEFAULTS.txt` line 6) | 42/128 (`caps/09-…/DEFAULTS.txt` line 6) | **41/128** (`caps/14-…/DEFAULTS.txt` line 6) |
| capture timestamps | 18.641 → 18.898 | 18.968 → 19.224 | 19.294 → 19.550 (`00-META.txt` lines 17–31) |
| node counts | 128, 28, 30, 31, 1 | 128, 28, 30, 31, 1 | 128, 28, 30, 31, 1 |

### 4.2 Machine-verified diff (attributes + text only, rects/styles ignored)

Signature = all `#index path=`, `attr` and `text` lines of each capture, concatenated across its
`nodes-*.txt` parts:

```
04 vs 09 :  (no differences)          342 lines each
09 vs 14 :  110a111 >   attr class = "ng-hide"      (14 has 343 lines)
04 vs 14 :  110a111 >   attr class = "ng-hide"
05 vs 10 :  (none)      10 vs 15 : (none)
06 vs 11 :  (none)      11 vs 16 : 5a6 >   attr class = "ng-hide"
07 vs 12 :  (none)      12 vs 17 : (none)
08 vs 13 :  (none)      13 vs 18 : (none)
```

That single added line is node `#41 path=r.1.1.0` in [14] and node `#1 path=r.0` in [16] — the
`Adjust Mic/Cam/Screen/Chat/Notes` item guarded by `ng-show="user.role !== 1"`.

### 4.3 Conclusion

* The **template** behind all three groups is one and the same (identical labels, order, icons,
  handlers, dividers — zero diffs apart from the one node).
* The **instances** are three distinct elements bound to three distinct `user` objects:
  * group 3's user has `user.role === 1` (a Presenter) → `Adjust Mic/Cam/Screen/Chat/Notes` is
    `ng-hide`-den;
  * groups 1 and 2's users have `user.role !== 1` → that item is shown.
  * groups 2 and 3 are laid out **62.4 px apart vertically** (y=635 vs y=697.4) at the same x —
    exactly the pitch of consecutive rows in a list.
  * group 1 was not laid out at all (all rects 0×0) — its row's `.dropdown` ancestor was not
    rendered/positioned at capture time.
* All three users share `!user.denyArchivesAccess` (the `Allow Archives Access` item is `ng-hide`
  in [06] `#6`, [11] `#6`, [16] `#6`).

**Rebuild implication: implement ONE menu component, rendered per row, with the `role !== 1` guard
on the Adjust-permissions item.** Do not build three menus.

---

## 5. The three 1-node captures [08], [13], [18]

All three contain exactly one node and are byte-identical to each other
(`caps/08-…/nodes-000.txt`, `caps/13-…/nodes-000.txt`, `caps/18-…/nodes-000.txt`, plus identical
`DEFAULTS.txt`):

```
#0 path=r <ul>
  rect: x=0 y=0 w=0 h=0
  attr class = "dropdown-menu show"
  attr style = "display: block;"
  style-deviations (0; all other props == COMMON in DEFAULTS.txt):
```

**They are empty menus, not capture failures.** Evidence:

1. `INFO.txt` line 5 in each: `node count : 1 (declared 1, truncated=false)` — the harness declared
   1 node and did not truncate. Same in `00-META.txt` lines 21, 26, 31 (`truncated=false`).
2. The corresponding element inside the parent capture also has zero children: `r.3.1`
   (`caps/04-…/nodes-000.txt #21`, `caps/09-…/#21`, `caps/14-…/#21`) is a
   `<ul class="dropdown-menu">` with no `r.3.1.*` records anywhere in the 128-node dumps.
3. Position in the capture sequence (5th of each group of five, `00-META.txt`) matches the 4th
   submenu, **Badges** (`caps/04-…/nodes-000.txt #20 path=r.3.0`,
   `ng-click="submenuOpen.badges=!…"`, icon `fa fa-certificate`).

So: **the Badges submenu of the per-user row menu renders zero items** for all three users — the
badge list (presumably an `ng-repeat` over configured room badges) is empty in this session.
A rebuild should render the "Badges ▸" parent item and an empty submenu (or hide it) — it must
**not** invent badge entries.

One honest inconsistency: the root reports `rect 0×0` while its own computed style says
`min-width: 160px`, `padding: 5px 0`, `border: 1px` — an actually-laid-out empty menu would be
≥160×12. The element was therefore not laid out when measured (an ancestor was `display: none`),
same as everything else in group 1. Reported as captured; not explained away.

---

## 6. Deduplicated menu catalogue — what the rebuild implements

**5 genuinely distinct menus + 1 modal.** (17 dropdown captures → 5 unique, because the row menu
and its 4 submenus were each captured 3×, once per user row.)

| # | menu | source captures | items | opens from |
|---|---|---|---|---|
| **M1** | User-list filter / bulk-remove | [02] | 9 items + 1 divider after item 6 | list toolbar button (element unverified) |
| **M2** | Bulk "apply to many users" | [03] | 10 items, no dividers | bulk-action button (element unverified) |
| **M3** | Per-user row actions (`dropdown-menu-right`) | [04], [09], [14] | 4 submenu parents + 6 leaf items + 3 dividers | per-row overflow button |
| **M3.a** | ↳ Permissions | [05], [10], [15] | 8 items + 1 divider | M3 item 1 (`fa fa-shield`) |
| **M3.b** | ↳ Granular Perms | [06], [11], [16] | 9 items + 3 dividers (one trailing) | M3 item 2 (`fa fa-sliders`) |
| **M3.c** | ↳ App and Notifications | [07], [12], [17] | 8 items + 1 divider | M3 item 3 (`fa fa-mobile`) |
| **M3.d** | ↳ Badges | [08], [13], [18] | **0 items (empty)** | M3 item 4 (`fa fa-certificate`) |
| **D1** | `#permissionsModal` dialog | [01] | 5 checkboxes + 2 buttons + close × | M3.b item 1 (`data-target="#permissionsModal"`) |

Full item lists with labels, order, icons and handlers: M1 → §2 [02]; M2 → §2 [03];
M3 → §2 [04]/[09]/[14]; M3.a → §2 [05]; M3.b → §2 [06]; M3.c → §2 [07]; M3.d → §5; D1 → §1.

Conditionals the rebuild must honour (all cited above):
* `user.role !== 1` gates `Adjust Mic/Cam/Screen/Chat/Notes` (M3.b item 1).
* `!user.denyArchivesAccess` / `user.denyArchivesAccess` swap `Deny Archives Access` ↔
  `Allow Archives Access` (M3.b items 4/5).
* `submenuOpen.{permissions,granular,app,badges}` — opening one closes the other three, and the
  handler calls `$event.preventDefault(); $event.stopPropagation();`
  (`caps/04-…/nodes-000.txt #14, #16, #18, #20`).

Role-code mapping observable from the handlers (`updateUser(n,…)` / `updateManyUsers(n)`):
1 = Presenter, 2 = Participant / Unban, 3 = Mute, 4 = Ban, 5 = Admin, 6 = Trial, 7 = hide user count,
8 = show user count, 9 = freshen login date, 10 = hide personal data (**and** `updateManyUsers(10)` =
"Remove All"), 11 = don't hide personal data, 13 = deny archives, 14 = allow archives. Note code 10
means two different things in the two APIs (`caps/03-…/nodes-000.txt #11` vs
`caps/06-…/nodes-000.txt #18`) — flagged, not resolved.

---

## 7. Honest gaps

1. **Trigger elements are not identifiable from my slice.** All subtrees are re-rooted at `path=r`
   (`#0 path=r` in every capture), so the assignment of M1 and M2 to specific baseline buttons is
   *inferred from handler names and absolute position only*, not proven. Confirming it requires
   capture [00] `baseline-room` (2156 nodes) — another agent's file.
2. **No `.modal-backdrop`.** Capture [01] contains only the 22 nodes under `#permissionsModal`;
   backdrop colour/opacity/z-index are absent from this dump.
3. **Modal captured mid-transition** — `opacity: 0` and `transform: translateY(-82.1777px)`
   (`caps/01-…/nodes-000.txt #0`, `#1`). The resting geometry stated in §1.1 is derived arithmetically
   from `margin-top: 30px` minus the translate; no resting-state screenshot exists in the dump.
4. **Modal title's username is empty.** `#16 path=r.0.0.0.1#permissionsModalLabel.0`
   `<i class="ng-binding">` has `w=0` and no `text:` — the actual user name shown in the reference is
   **not recorded**. Do not fabricate one; render the binding slot empty or from real data.
5. **Checkbox checked state unknown.** All five inputs are `ng-pristine ng-untouched ng-valid`
   (`#17`–`#21`); the dump records no `checked` attribute or `:checked` state, so the reference
   on/off values of hasMic/hasScreen/hasCam/hasAdminChat/canEditNotes cannot be asserted.
6. **Group-1 geometry missing.** Every rect in [04]–[08] is `0×0`; likewise all forced-open submenu
   captures ([05]–[08], [10]–[13], [15]–[18]) and the empty menus of §5. Usable menu geometry exists
   only for [02], [03], [09], [14].
7. **Hover/active/focus states absent.** Only the resting computed style is captured; no
   `.dropdown-menu > li > a:hover` background is recorded anywhere in captures [01]–[18].
8. **Two malformed FontAwesome classes** — `fa fa fa-bell-o` and `fa fa-reload`
   (`caps/07-…/nodes-000.txt #22, #28, #30`) — plus `fa fa-user-circle`
   (`caps/06-…/nodes-000.txt #22, #23`) have **no `::before` content captured**, so those three
   glyphs are blank/undefined in the reference. Whether that is a reference bug or a capture gap
   cannot be determined from this slice.
9. **Which users the three rows belong to is unknown.** The row menus reference `user._id`,
   `user.userName`, `$index` as *unevaluated Angular expressions*; no user names, ids or `$index`
   values appear in captures [04]–[18]. Only `user.role === 1` for group 3 and `role !== 1` for
   groups 1–2 is provable.
10. **No truncation anywhere.** All 18 `INFO.txt` files report `truncated=false`; no text in this
    slice was cut off.

---

## Verification

Every file in `caps/01` … `caps/18` was read in full, in this agent's own context, record by record.
No reading was delegated. No file outside my slice was read except the shared `00-META.txt`.

| dir | INFO | DEFAULTS | nodes files | declared nodes | records read | lines |
|---|---|---|---|---|---|---|
| `caps/01-modal_permissionsModal` | ✓ | ✓ | `nodes-000.txt` | 22 | #0–#21 (22/22) | 9+100+407 = 516 |
| `caps/02-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 28 | #0–#27 (28/28) | 9+100+324 = 433 |
| `caps/03-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 33 | #0–#32 (33/33) | 9+100+376 = 485 |
| `caps/04-dropdown_dropdown-menu.dropdown-menu-right.show` | ✓ | ✓ | `nodes-000.txt`, `nodes-001.txt` | 128 | #0–#119, #120–#127 (128/128) | 9+100+1302+77 = 1488 |
| `caps/05-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 28 | #0–#27 (28/28) | 9+100+293 = 402 |
| `caps/06-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 30 | #0–#29 (30/30) | 9+100+322 = 431 |
| `caps/07-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 31 | #0–#30 (31/31) | 9+100+321 = 430 |
| `caps/08-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 1 | #0 (1/1) | 9+100+8 = 117 |
| `caps/09-dropdown_dropdown-menu.dropdown-menu-right.show` | ✓ | ✓ | `nodes-000.txt`, `nodes-001.txt` | 128 | #0–#119, #120–#127 (128/128) | 9+100+1407+77 = 1593 |
| `caps/10-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 28 | #0–#27 (28/28) | 9+100+293 = 402 |
| `caps/11-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 30 | #0–#29 (30/30) | 9+100+322 = 431 |
| `caps/12-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 31 | #0–#30 (31/31) | 9+100+321 = 430 |
| `caps/13-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 1 | #0 (1/1) | 9+100+8 = 117 |
| `caps/14-dropdown_dropdown-menu.dropdown-menu-right.show` | ✓ | ✓ | `nodes-000.txt`, `nodes-001.txt` | 128 | #0–#119, #120–#127 (128/128) | 9+100+1409+77 = 1595 |
| `caps/15-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 28 | #0–#27 (28/28) | 9+100+293 = 402 |
| `caps/16-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 30 | #0–#29 (30/30) | 9+100+324 = 433 |
| `caps/17-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 31 | #0–#30 (31/31) | 9+100+321 = 430 |
| `caps/18-dropdown_dropdown-menu.show` | ✓ | ✓ | `nodes-000.txt` | 1 | #0 (1/1) | 9+100+8 = 117 |

* **Directories: 18/18.** **Files: 60/60** (18 `INFO.txt` + 18 `DEFAULTS.txt` + 24 `nodes-*.txt`).
* **Lines read: 10,252** across those 60 files, plus `00-META.txt` (77 lines) = **10,329**.
* **Node records read: 815/815** (22+28+33+128+28+30+31+1+128+28+30+31+1+128+28+30+31+1), i.e. every
  record in every capture in my slice. `INFO.txt` line 5 of each directory confirms
  `truncated=false`, so 815 is the complete population.
* Cross-group identity claims in §4 were additionally machine-checked with `diff` over
  attribute/text signatures extracted from the same files I read; results reproduced verbatim in §4.2.
* **Not read (outside my slice, by instruction):** `caps/00-baseline-room/`,
  `caps/19-forced-darkTheme/`, `caps/20-forced-lightTheme/`, `caps/21-final-room/`,
  `01-stylesheets/`, and the 23 MB `evidence-dumps/NEXT-STEP/ptr1.json` source.
