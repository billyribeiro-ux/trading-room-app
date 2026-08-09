# P16 — `#permissionsModal` (Adjust Mic/Cam/Screen permissions)

**Evidence used (both views, read in full, line by line):**

| View | Path | What it gives |
|---|---|---|
| OPEN — **mid-transition** | `/tmp/ptr-decode/ptr1/caps/01-modal_permissionsModal/nodes-000.txt` (22/22 records, `truncated=false`) + `.../DEFAULTS.txt` + `.../INFO.txt` | the `#permissionsModal` subtree re-rooted at `path=r`, laid out |
| CLOSED (true page position) | `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-*.txt` records `#27`, `#33`, `#42`, `#62`, `#63`, `#64`, `#103`, `#104`, `#105`–`#109`, `#110`, `#111`, `#147`, `#148`, `#149`–`#153` (22 nodes) + `.../DEFAULTS.txt` | closed-state style, the page z-index stack, and the trigger |

Both captures: viewport `{"w":1842,"h":1265,"dpr":2}`, `themeClass "footer-hidden"`, `cssVars {"root":{},"body":{}}` → **no CSS custom properties** (verified in both `INFO.txt` files). Cap01 `DEFAULTS.txt`: `flex | 0 1 auto | 22/22 | 1`, `grid-template-columns | none | 22/22 | 1` → **no flexbox, no grid**; the footer buttons are laid out by `text-align: right` on inline-blocks and the close `×` by `float: right`. Float/table Bootstrap 3, verified.

**All computed values below are RESOLVED ABSOLUTE values.**

> ⚠️ **The modal was captured mid-transition.** `#permissionsModal` has `opacity: 0` and `.modal-dialog` has `transform: matrix(1, 0, 0, 1, 0, -82.1777)` — i.e. `translateY(-82.1777px)`. Every rect in cap01 is therefore the **captured (pre-`in`) position**. §5.4 derives the **resting** position and labels which is which. Nothing below silently mixes the two.

---

## 1. Purpose

A single 600px-wide Bootstrap-3 dialog (`z-index: 1050`) that toggles five per-user capability flags — microphone, screenshare, webcam, admin chat, note editing — for whichever user was passed to `setPermissions(user)`. It is opened by a per-row menu item and committed by a green "Save Changes" button wired to `saveUserPermissions()`.

---

## 2. Trigger

There are **three** identical trigger nodes in the baseline — one per rendered user row, each inside that row's own (closed) actions dropdown. All three are byte-identical:

| baseline `#` | path | rect |
|---|---|---|
| `#1996` | `r.0.1.1.0.1.3.1.0.0.3.1.**0**.4.0.1.1.1.0.0` | x=0 y=0 w=0 h=0 |
| `#2021` | `r.0.1.1.0.1.3.1.0.0.3.1.**1**.4.0.1.1.1.0.0` | x=0 y=0 w=0 h=0 |
| `#2046` | `r.0.1.1.0.1.3.1.0.0.3.1.**2**.4.0.1.1.1.0.0` | x=0 y=0 w=0 h=0 |

Tag: `<a>`. Attributes, verbatim, all four:

```
href        = ""
ng-click    = "setPermissions(user)"
data-toggle = "modal"
data-target = "#permissionsModal"
```

Text, verbatim: **`Adjust Mic/Cam/Screen/Chat/Notes`** (note: this differs from the modal's own title string — see §6).

Resolved computed style (baseline COMMON + the 10 printed deviations), identical on all three:

| prop | value |
|---|---|
| display | `block` |
| position | `static`; top/right/bottom/left `auto`; z-index `auto`; float `none` |
| box-sizing | `border-box` |
| width / height | `auto` / `auto` (rect 0×0 — ancestor `.dropdown-menu` is `display:none`) |
| margin T/R/B/L | `0px` ×4 |
| padding T/R/B/L | `3px` / `20px` / `3px` / `20px` |
| border width / style / colour | `0px` ×4 / `none` ×4 / `rgb(51, 51, 51)` ×4 |
| radius | `0px` ×4 |
| background-color / -image | `rgba(0, 0, 0, 0)` / `none` |
| color | `rgb(51, 51, 51)` |
| font-family | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| font-size / font-weight / font-style | `13px` / `400` / `normal` |
| line-height | `18.5714px` |
| text-align | `left` |
| text-decoration-line | `none` |
| white-space | `nowrap` |
| overflow | `visible` |
| opacity / box-shadow | `1` / `none` |
| cursor | `pointer` |
| list-style-type | `none` |
| transform / transition | `none` / `all 0s` |

**Open mechanism:** Bootstrap-3 declarative `data-toggle="modal" data-target="#permissionsModal"` (the JS adds `.in` / `display:block` and normally injects `.modal-backdrop`), plus the Angular `ng-click="setPermissions(user)"` which populates the `userPermissions` scope object the five checkboxes bind to. Both fire on the same click.

**`renders`:** all three triggers have rect `0×0` in the baseline because their parent row-dropdown is closed. Their geometry when open is **not in this evidence set** (those row dropdowns are captures 04–18, which are outside this piece's scope).

---

## 3. Node table — every node in capture 01 (22/22) mapped to its baseline twin

`renders` = has a non-zero rect in that view. cap01 rects are the **mid-transition captured** rects.

| cap01 `#` | cap01 path | baseline `#` | baseline path | tag | classes / id / key attrs | rect (captured, mid-transition) | renders cap01 | renders baseline |
|---|---|---|---|---|---|---|---|---|
| 0 | `r` | 27 | `r.0.1.1.1#permissionsModal` | `div` | `class="modal fade show"` `id="permissionsModal"` `tabindex="-1"` `role="dialog"` `aria-labelledby="permissionsModalLabel"` `style="display: block; visibility: visible;"` | x=0 y=0 w=1842 h=1265 | yes (but `opacity: 0`) | **no** (0×0, `display:none`, class `modal fade`, no inline style) |
| 1 | `r.0` | 33 | `…#permissionsModal.0` | `div` | `class="modal-dialog"` `role="document"` | x=621 y=**−52.2** w=600 h=328.7 | yes | no |
| 2 | `r.0.0` | 42 | `….0.0` | `div` | `class="modal-content"` | x=621 y=**−52.2** w=600 h=328.7 | yes | no |
| 3 | `r.0.0.0` | 62 | `….0.0.0` | `div` | `class="modal-header"` (has `::before`/`::after` clearfix) | x=642 y=**−31.2** w=558 h=56.7 | yes | no |
| 4 | `r.0.0.1` | 63 | `….0.0.1` | `div` | `class="modal-body"` | x=642 y=25.5 w=558 h=165 | yes | no |
| 5 | `r.0.0.2` | 64 | `….0.0.2` | `div` | `class="modal-footer text-right"` (has `::before`/`::after` clearfix) | x=642 y=190.5 w=558 h=65 | yes | no |
| 6 | `r.0.0.0.0` | 103 | `….0.0.0.0` | `button` | `type="button"` `class="close"` `data-dismiss="modal"` `aria-label="Close"` | x=1172.4 y=**−18.2** w=12.6 h=21 | yes | no |
| 7 | `r.0.0.0.1#permissionsModalLabel` | 104 | `….0.0.0.1#permissionsModalLabel` | `h4` | `class="modal-title"` `id="permissionsModalLabel"` | x=657 y=**−16.2** w=528 h=25.7 | yes | no |
| 8 | `r.0.0.1.0` | 105 | `….0.0.1.0` | `label` | `class="d-block"` | x=657 y=40.5 w=528 h=22 | yes | no |
| 9 | `r.0.0.1.1` | 106 | `….0.0.1.1` | `label` | `class="d-block"` | x=657 y=67.5 w=528 h=22 | yes | no |
| 10 | `r.0.0.1.2` | 107 | `….0.0.1.2` | `label` | `class="d-block"` | x=657 y=94.5 w=528 h=22 | yes | no |
| 11 | `r.0.0.1.3` | 108 | `….0.0.1.3` | `label` | `class="d-block"` | x=657 y=121.5 w=528 h=22 | yes | no |
| 12 | `r.0.0.1.4` | 109 | `….0.0.1.4` | `label` | `class="d-block"` | x=657 y=148.5 w=528 h=22 | yes | no |
| 13 | `r.0.0.2.0` | 110 | `….0.0.2.0` | `button` | `type="button"` `class="btn btn-default"` `data-dismiss="modal"` | x=997.6 y=206.5 w=61.8 h=34 | yes | no |
| 14 | `r.0.0.2.1` | 111 | `….0.0.2.1` | `button` | `type="button"` `ng-click="saveUserPermissions()"` `class="btn btn-success"` | x=1068.3 y=206.5 w=116.8 h=34 | yes | no |
| 15 | `r.0.0.0.0.0` | 147 | `….0.0.0.0.0` | `span` | `aria-hidden="true"` | x=1172.4 y=**−20.2** w=12.6 h=25 | yes | no |
| 16 | `r.0.0.0.1#permissionsModalLabel.0` | 148 | `…#permissionsModalLabel.0` | `i` | `class="ng-binding"` | x=1034.2 y=**−14.2** **w=0** h=21.5 | yes (zero-width) | no |
| 17 | `r.0.0.1.0.0` | 149 | `….0.0.1.0.0` | `input` | `ng-change="toggleHasMic()"` `ng-model="userPermissions.hasMic"` `type="checkbox"` `name="checkbox"` `class="ng-pristine ng-untouched ng-valid"` | x=657 y=44.5 w=13 h=13 | yes | no |
| 18 | `r.0.0.1.1.0` | 150 | `….0.0.1.1.0` | `input` | `ng-change="toggleHasScreen()"` `ng-model="userPermissions.hasScreen"` `type="checkbox"` `name="checkbox"` `class="ng-pristine ng-untouched ng-valid"` | x=657 y=71.5 w=13 h=13 | yes | no |
| 19 | `r.0.0.1.2.0` | 151 | `….0.0.1.2.0` | `input` | `ng-change="toggleHasCam()"` `ng-model="userPermissions.hasCam"` `type="checkbox"` `name="checkbox"` `class="ng-pristine ng-untouched ng-valid"` | x=657 y=98.5 w=13 h=13 | yes | no |
| 20 | `r.0.0.1.3.0` | 152 | `….0.0.1.3.0` | `input` | `ng-change="toggleHasAdminChat()"` `ng-model="userPermissions.hasAdminChat"` `type="checkbox"` `name="checkbox"` `class="ng-pristine ng-untouched ng-valid"` | x=657 y=125.5 w=13 h=13 | yes | no |
| 21 | `r.0.0.1.4.0` | 153 | `….0.0.1.4.0` | `input` | `ng-change="toggleCanEditNotes()"` `ng-model="userPermissions.canEditNotes"` `type="checkbox"` `name="checkbox"` `class="ng-pristine ng-untouched ng-valid"` | x=657 y=152.5 w=13 h=13 | yes | no |

Reconciliation: cap01 `node count : 22 (declared 22, truncated=false)`; the baseline twin set is exactly 22 nodes (`#27, #33, #42, #62, #63, #64, #103, #104, #105–#109, #110, #111, #147, #148, #149–#153`). **The two views agree node-for-node with zero structural difference.** ✔

`ng-if` / `ng-show` / `ng-hide`: **none anywhere in this modal** — every record's attribute block is printed in full in both views and contains none of the three. The only Angular directives present are `ng-click` (Save), `ng-change` ×5, `ng-model` ×5, plus the `ng-binding` / `ng-pristine ng-untouched ng-valid` marker classes.

---

## 4. The five checkboxes, in DOM order

| # | `<label class="d-block">` path | label text (verbatim) | `<input>` path | `ng-model` (verbatim) | `ng-change` (verbatim) | label rect (captured) | input rect (captured) |
|---|---|---|---|---|---|---|---|
| 0 | `r.0.0.1.0` | `Microphone` | `r.0.0.1.0.0` | `userPermissions.hasMic` | `toggleHasMic()` | x=657 y=40.5 w=528 h=22 | x=657 y=44.5 w=13 h=13 |
| 1 | `r.0.0.1.1` | `Screenshare` | `r.0.0.1.1.0` | `userPermissions.hasScreen` | `toggleHasScreen()` | x=657 y=67.5 w=528 h=22 | x=657 y=71.5 w=13 h=13 |
| 2 | `r.0.0.1.2` | `WebCam` | `r.0.0.1.2.0` | `userPermissions.hasCam` | `toggleHasCam()` | x=657 y=94.5 w=528 h=22 | x=657 y=98.5 w=13 h=13 |
| 3 | `r.0.0.1.3` | `AdminChat` | `r.0.0.1.3.0` | `userPermissions.hasAdminChat` | `toggleHasAdminChat()` | x=657 y=121.5 w=528 h=22 | x=657 y=125.5 w=13 h=13 |
| 4 | `r.0.0.1.4` | `CanEditNotes` | `r.0.0.1.4.0` | `userPermissions.canEditNotes` | `toggleCanEditNotes()` | x=657 y=148.5 w=528 h=22 | x=657 y=152.5 w=13 h=13 |

All five inputs additionally carry `type="checkbox"`, `name="checkbox"` (yes — the **same** `name` on all five, verbatim), and `class="ng-pristine ng-untouched ng-valid"`.
Row pitch: **27px** (22px label + 5px `margin-bottom`). Input sits 4px below the label top (`margin-top: 4px`) and is flush with the label's left edge — the labels carry **no `padding-left`**, so the checkbox is at x=657, i.e. the body content-box left edge, with the text following it inline.

**Checked state: NOT RECORDED.** The dump emits no `checked` attribute, no `:checked` pseudo-style, and no property carrying the boolean. All five are `ng-pristine ng-untouched`, which tells us only that the user had not interacted — **not** whether the boxes rendered ticked. This is an honest gap (§8) — do not invent tick marks.

---

## 5. Resolved computed style — absolute values

### 5.1 `div#permissionsModal.modal.fade.show` — cap01 `#0` (COMMON + 16 deviations)

| prop | resolved value (CAPTURED, mid-transition) |
|---|---|
| display | `block` (via `style="display: block; visibility: visible;"`) |
| visibility | `visible` |
| position | `fixed` |
| top / right / bottom / left | `0px` / `0px` / `0px` / `0px` |
| **z-index** | **`1050`** |
| float | `none` |
| box-sizing | `border-box` |
| width / height | `1842px` / `1265px` (= the full viewport) |
| min-width / max-width / min-height / max-height | `0px` / `none` / `0px` / `none` |
| margin T/R/B/L | `0px` ×4 |
| padding T/R/B/L | `0px` ×4 |
| border width / style / colour | `0px` ×4 / `none` ×4 / `rgb(51, 51, 51)` ×4 |
| radius | `0px` ×4 |
| background-color / -image / -clip | `rgba(0, 0, 0, 0)` / `none` / `border-box` |
| color | `rgb(51, 51, 51)` |
| font-family | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| font-size / font-weight / font-style | `14px` / `400` / `normal` |
| line-height | `20px` |
| letter-spacing | `normal` |
| text-align | `start` |
| text-transform / text-decoration-line / text-shadow / text-overflow | `none` / `none` / `none` / `clip` |
| white-space | `normal` |
| vertical-align | `baseline` |
| **overflow-x / overflow-y** | **`hidden` / `hidden`** |
| **opacity** | **`0`** ← mid-transition |
| box-shadow | `none` |
| outline-style / -width / -color | `none` / `0px` / `rgb(51, 51, 51)` |
| cursor | `auto` |
| pointer-events / user-select | `auto` / `auto` |
| **transition-property / -duration** | **`opacity` / `0.15s`** |
| transform | `none` |
| filter / object-fit | `none` / `fill` |
| list-style-type | `disc` |
| content / resize / appearance | `normal` / `none` / `none` |
| fill / stroke | `rgb(0, 0, 0)` / `none` |

**CLOSED** (baseline `#27`, COMMON + 13 deviations) — identical **except**: `display: none`, `visibility` COMMON `visible`, rect `0×0`, class is `modal fade` (no `show`), and there is **no inline `style` attribute**. Every other value (fixed, 0/0/0/0, z-index 1050, overflow hidden, opacity 0, outline-width 0px, transition `opacity 0.15s`) is byte-identical. So `opacity: 0` is the CSS **resting value for `.modal.fade`** in both views; the `.in` class that would raise it to `1` was not yet applied at capture time.

### 5.2 `div.modal-dialog` — cap01 `#1` (COMMON + 16 deviations)

| prop | resolved value (CAPTURED) |
|---|---|
| display | `block` |
| position | `relative` |
| top / right / bottom / left | `0px` ×4 |
| z-index | `auto`; float `none`; box-sizing `border-box` |
| width / height | `600px` / `328.711px` |
| max-width | `none` |
| **margin T/R/B/L** | **`30px` / `621px` / `30px` / `621px`** (the `auto` horizontal margins resolved against the 1842px viewport: 621 + 600 + 621 = 1842 ✔) |
| padding / border / radius | `0px` ×4 / `0px none rgb(51,51,51)` ×4 / `0px` ×4 |
| background-color / -image | `rgba(0, 0, 0, 0)` / `none` |
| color | `rgb(51, 51, 51)` |
| font | `400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif` |
| text-align / white-space | `start` / `normal` |
| overflow | `visible` |
| opacity | `1` (the fade lives on the parent) |
| box-shadow | `none` |
| cursor | `auto` |
| **transition-property / -duration** | **`transform` / `0.3s`** |
| **transform** | **`matrix(1, 0, 0, 1, 0, -82.1777)`** ← mid-transition (see §5.4) |

**CLOSED** (baseline `#33`, COMMON + 8 deviations): `position: relative`, `width: 600px`, `height: auto`, `margin: 30px auto`, `transition: transform 0.3s`, `transform: none`(COMMON), rect `0×0`. Note the closed record reports the **authored** `margin-right/left: auto`; the open record reports the **used** `621px`. Same declaration, two resolutions.

### 5.3 `div.modal-content` — cap01 `#2` (COMMON + 33 deviations)

| prop | resolved value |
|---|---|
| display | `block` |
| position | `relative`; top/right/bottom/left `0px` ×4 |
| z-index | `auto`; float `none`; box-sizing `border-box` |
| width / height | `600px` / `328.711px` |
| margin T/R/B/L | `0px` ×4 |
| padding T/R/B/L | `20px` / `20px` / `20px` / `20px` |
| border-width T/R/B/L | `1px` ×4 |
| border-style T/R/B/L | `solid` ×4 |
| border-colour T/R/B/L | `rgba(0, 0, 0, 0.2)` ×4 |
| radius TL/TR/BL/BR | `6px` ×4 |
| background-color | `rgb(255, 255, 255)` |
| background-image / -clip | `none` / `padding-box` |
| color | `rgb(51, 51, 51)` |
| font | `400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif` |
| text-align / white-space / vertical-align | `start` / `normal` / `baseline` |
| overflow | `visible` |
| opacity | `1` |
| **box-shadow** | **`rgba(0, 0, 0, 0.5) 0px 5px 15px 0px`** |
| outline-style / -width / -color | `none` / `0px` / `rgb(51, 51, 51)` |
| cursor | `auto` |
| transform / transition | `none` / `all 0s` |

Baseline `#42` is identical (25 deviations, all the same values) except rect `0×0` and `width/height: auto`.
Box-model check: `1 + 20 + 56.7109 (header) + 165 (body) + 65 (footer) + 20 + 1 = 328.7109` ✔ = the reported height.

### 5.4 The transition — CAPTURED vs RESTING (derived)

**CAPTURED (what cap01 literally contains):**
* `#permissionsModal` — `opacity: 0`, `transition: opacity 0.15s`
* `.modal-dialog` — `transform: matrix(1, 0, 0, 1, 0, -82.1777)`, `transition: transform 0.3s`

**DERIVATION (arithmetic on captured numbers, not memory):** the dialog's border-box height is `328.711px`; `328.711 × 0.25 = 82.1777` — exactly the captured Y translation. So the authored rule is a **−25% Y translate**, i.e. Bootstrap 3's `.modal.fade .modal-dialog { transform: translate(0, -25%) }`, and the resting rule is `.modal.in .modal-dialog { transform: translate(0, 0) }` with `.modal.in { opacity: 1 }`. Independent confirmation: the captured dialog top is `−52.1777`, and `−52.1777 + 82.1777 = 30.0000` = exactly the dialog's `margin-top: 30px`. Two independent numbers land on the same answer.

**RESTING geometry (derived = captured Y + 82.1777; label these as DERIVED, not captured):**

| element | CAPTURED rect | DERIVED resting rect |
|---|---|---|
| `#permissionsModal` | x=0 y=0 w=1842 h=1265, `opacity: 0` | x=0 y=0 w=1842 h=1265, `opacity: 1`, `transform: none` on dialog |
| `.modal-dialog` | x=621 **y=−52.178** w=600 h=328.711 | x=621 **y=30** w=600 h=328.711 |
| `.modal-content` | x=621 **y=−52.178** w=600 h=328.711 | x=621 **y=30** w=600 h=328.711 |
| `.modal-header` | x=642 **y=−31.178** w=558 h=56.711 | x=642 **y=51** w=558 h=56.711 |
| `button.close` | x=1172.4 **y=−18.178** w=12.602 h=21 | x=1172.4 **y=64** w=12.602 h=21 |
| `span` (`×`) | x=1172.4 **y=−20.178** w=12.602 h=25 | x=1172.4 **y=62** w=12.602 h=25 |
| `h4#permissionsModalLabel` | x=657 **y=−16.178** w=528 h=25.711 | x=657 **y=66** w=528 h=25.711 |
| `i.ng-binding` | x=1034.2 **y=−14.2** w=0 h=21.5 | x=1034.2 **y≈67.98** w=0 h=21.5 |
| `.modal-body` | x=642 y=25.533 w=558 h=165 | x=642 **y=107.711** w=558 h=165 |
| label 0 / input 0 | y=40.533 / y=44.533 | **y=122.711** / **y=126.711** |
| label 1 / input 1 | y=67.533 / y=71.533 | **y=149.711** / **y=153.711** |
| label 2 / input 2 | y=94.533 / y=98.533 | **y=176.711** / **y=180.711** |
| label 3 / input 3 | y=121.533 / y=125.533 | **y=203.711** / **y=207.711** |
| label 4 / input 4 | y=148.533 / y=152.533 | **y=230.711** / **y=234.711** |
| `.modal-footer` | x=642 y=190.533 w=558 h=65 | x=642 **y=272.711** w=558 h=65 |
| `button.btn-default` (Close) | x=997.6 y=206.533 w=61.773 h=34 | x=997.6 **y=288.711** |
| `button.btn-success` (Save) | x=1068.25 y=206.533 w=116.75 h=34 | x=1068.25 **y=288.711** |
| dialog bottom edge | 276.533 | **358.711** |

X coordinates are unaffected by the transform — every x above is **captured**, not derived.

### 5.5 `div.modal-header` — cap01 `#3` (COMMON + 11 deviations)

| prop | value |
|---|---|
| display | `block`; position `static`; float `none`; box-sizing `border-box` |
| width / height | `558px` / `56.7109px` |
| margin | `0px` ×4 |
| padding T/R/B/L | `15px` ×4 |
| border-width T/R/B/L | `0px` / `0px` / **`1px`** / `0px` |
| border-style T/R/B/L | `none` / `none` / **`solid`** / `none` |
| border-colour T/R/B/L | `rgb(51,51,51)` / `rgb(51,51,51)` / **`rgb(229, 229, 229)`** / `rgb(51,51,51)` |
| radius | `0px` ×4 |
| background-color / -image | `rgba(0, 0, 0, 0)` / `none` |
| color | `rgb(51, 51, 51)` |
| font | `400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif` |
| text-align / white-space | `start` / `normal` |
| overflow / opacity / box-shadow | `visible` / `1` / `none` |
| cursor | `auto` |
| `::before` | `content: " "`, `color: rgb(51,51,51)`, `font-family: "Helvetica Neue", Helvetica, Arial, sans-serif`, `font-size: 14px`, `background-color: rgba(0,0,0,0)` |
| `::after` | identical to `::before` (the Bootstrap `.clearfix` pair — required, because `button.close` is `float: right`) |

Baseline `#62` is the same (7 deviations) with `width/height: auto`.

### 5.6 `div.modal-body` — cap01 `#4` (COMMON + 13 deviations)

`display: block`; `position: relative`; `top/right/bottom/left: 0px`; `width: 558px`; `height: 165px`; `margin: 0px` ×4; `padding: 15px` ×4; `border: 0px none rgb(51,51,51)` ×4; `radius: 0px` ×4; `background-color: rgba(0,0,0,0)`; `color: rgb(51,51,51)`; `400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif`; `text-align: start`; `white-space: normal`; `overflow: visible`; `opacity: 1`; `box-shadow: none`; `cursor: auto`; **no `::before`/`::after`**.
Height check: `15 + (5 × 22 label) + (5 × 5 margin-bottom) + 15 = 15 + 110 + 25 + 15 = 165` ✔.

### 5.7 `div.modal-footer.text-right` — cap01 `#5` (COMMON + 12 deviations)

| prop | value |
|---|---|
| display | `block`; position `static`; box-sizing `border-box` |
| width / height | `558px` / `65px` |
| margin | `0px` ×4 |
| padding T/R/B/L | `15px` ×4 |
| border-width T/R/B/L | **`1px`** / `0px` / `0px` / `0px` |
| border-style T/R/B/L | **`solid`** / `none` / `none` / `none` |
| border-colour T/R/B/L | **`rgb(229, 229, 229)`** / `rgb(51,51,51)` ×3 |
| background-color | `rgba(0, 0, 0, 0)` |
| color | `rgb(51, 51, 51)` |
| font | `400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif` |
| **text-align** | **`right`** ← this is what right-aligns the two buttons (no flex) |
| white-space / overflow / opacity / box-shadow / cursor | `normal` / `visible` / `1` / `none` / `auto` |
| `::before` / `::after` | both `content: " "`, `color: rgb(51,51,51)`, `font-family: "Helvetica Neue", Helvetica, Arial, sans-serif`, `font-size: 14px`, `background-color: rgba(0,0,0,0)` |

Height check: `1 (border-top) + 15 + 34 (button) + 15 = 65` ✔.

### 5.8 `h4#permissionsModalLabel.modal-title` — cap01 `#7` (COMMON + 5 deviations)

`display: block`; `position: static`; `width: 528px`; `height: 25.7109px`; `margin: 0px` ×4 (Bootstrap zeroes the `h4` margins); `padding: 0px` ×4; `border: 0px none rgb(51,51,51)`; `background-color: rgba(0,0,0,0)`; `color: rgb(51, 51, 51)`; `font-family: "Helvetica Neue", Helvetica, Arial, sans-serif`; **`font-size: 18px`**; **`font-weight: 500`**; `font-style: normal`; **`line-height: 25.7143px`**; `text-align: start`; `white-space: normal`; `overflow: visible`; `opacity: 1`; `box-shadow: none`; `cursor: auto`.

### 5.9 `i.ng-binding` inside the title — cap01 `#16` (COMMON + 8 deviations)

`display: inline`; `width: auto`; `height: auto`; rect **w=0** h=21.5 at x=1034.2; `font-size: 18px`; `font-weight: 500`; **`font-style: italic`**; `line-height: 25.7143px`; `color: rgb(51, 51, 51)`; `cursor: auto`; margin/padding/border all `0`.
It is the Angular interpolation slot for the user's name and it is **EMPTY** at capture time (width exactly 0, and the `h4`'s `text:` contains only the static title). Its x=1034.2 marks where the title text ends (1034.2 − 657 = 377.2px of rendered title at 18px/500). Honest data: the modal was captured with **no user name bound** — do not fabricate one.

### 5.10 `button.close` and its `span` — cap01 `#6`, `#15`

`button.close` (COMMON + 17 deviations):

| prop | value |
|---|---|
| display | `block` |
| **float** | **`right`** |
| position | `static`; z-index `auto` |
| width / height | `12.6016px` / `21px` |
| margin T/R/B/L | **`-2px`** / `0px` / `0px` / `0px` |
| padding | `0px` ×4 |
| border width / style | `0px` ×4 / `none` ×4 |
| border colour | `rgb(0, 0, 0)` ×4 |
| radius | `0px` ×4 |
| background-color / -image / **-position** | `rgba(0, 0, 0, 0)` / `none` / **`0px 0px`** |
| color | `rgb(0, 0, 0)` |
| font-family | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| **font-size / font-weight** | **`21px` / `700`** |
| line-height | `21px` |
| **text-align** | **`center`** |
| **text-shadow** | **`rgb(255, 255, 255) 0px 1px 0px`** |
| white-space | `normal` |
| **opacity** | **`0.2`** |
| box-shadow | `none` |
| outline-style / -width / -color | `none` / `3px` / `rgb(0, 0, 0)` |
| **cursor** | **`pointer`** |
| appearance | `none` |
| transform / transition | `none` / `all 0s` |

Inner `span[aria-hidden="true"]` (`#15`, COMMON + 14 deviations): `display: inline`; `width: auto`; `height: auto` (rect 12.6016 × 25); `color: rgb(0,0,0)`; `font-size: 21px`; `font-weight: 700`; `line-height: 21px`; `text-align: center`; `text-shadow: rgb(255,255,255) 0px 1px 0px`; `cursor: pointer`; border colours `rgb(0,0,0)` ×4; margin/padding `0px`.

**Baseline confirms both**, with one presentational difference in how the dump reported it, not in the value: baseline `#103`/`#147` print `font-weight: 700` as an explicit deviation (baseline COMMON is 400), while cap01 inherits 700 from its own COMMON. Same resolved value — no conflict.

### 5.11 `button.btn.btn-default` — "Close" — cap01 `#13` (COMMON + 30 deviations)

| prop | value |
|---|---|
| display | `inline-block` |
| position | `static`; float `none`; box-sizing `border-box` |
| width / height | `61.7734px` / `34px` |
| margin | `0px` ×4 |
| padding T/R/B/L | `6px` / `12px` / `6px` / `12px` |
| border-width T/R/B/L | `1px` ×4 |
| border-style T/R/B/L | `solid` ×4 |
| border-colour T/R/B/L | `rgb(230, 233, 238)` ×4 |
| radius TL/TR/BL/BR | `4px` ×4 |
| background-color / -image | `rgb(255, 255, 255)` / `none` |
| color | `rgb(51, 51, 51)` |
| font-family | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| font-size / font-weight / font-style | `14px` / `400` / `normal` |
| line-height | `20px` |
| **text-align** | **`center`** |
| text-shadow | `none` |
| **white-space** | **`nowrap`** |
| **vertical-align** | **`middle`** |
| overflow / opacity / box-shadow | `visible` / `1` / `none` |
| outline-style / -width / -color | `none` / `3px` / `rgb(51, 51, 51)` |
| **cursor / user-select** | **`pointer` / `none`** |
| transform / transition | `none` / `all 0s` |
| `data-dismiss` | `"modal"` — closes the dialog with **no Angular handler** |

Height check: `6 + 20 + 6 + 1 + 1 = 34` ✔.

### 5.12 `button.btn.btn-success` — "Save Changes" — cap01 `#14` (COMMON + 33 deviations)

Identical to §5.11 **except**:

| prop | value |
|---|---|
| width | `116.75px` |
| **margin-left** | **`5px`** |
| border-colour T/R/B/L | **`rgb(76, 174, 76)`** ×4 |
| **background-color** | **`rgb(92, 184, 92)`** |
| **color** | **`rgb(255, 255, 255)`** |
| outline-color | `rgb(255, 255, 255)` |
| `ng-click` | **`saveUserPermissions()`** |
| `data-dismiss` | **absent** — this button does NOT dismiss the modal declaratively |

Footer horizontal maths (all captured): footer content-box right edge = `642 + 558 − 15 = 1185`. Save right = `1068.25 + 116.75 = 1185.0` ✔. Close right = `997.6 + 61.7734 = 1059.373`. Gap Close→Save = `1068.25 − 1059.373 = 8.877px` = `5px margin-left` + `≈3.877px` for the one whitespace text node between the two inline-blocks at 14px Helvetica.

### 5.13 `label.d-block` ×5 — cap01 `#8`–`#12` (COMMON + 2 deviations each)

| prop | value |
|---|---|
| display | `block` |
| position | `static`; float `none`; box-sizing `border-box` |
| width / height | `528px` / `22px` |
| **max-width** | **`100%`** |
| margin T/R/B/L | `0px` / `0px` / **`5px`** / `0px` |
| padding | `0px` ×4 (no `padding-left` — the checkbox is NOT hanging-indented here) |
| border / radius | `0px none rgb(51,51,51)` ×4 / `0px` ×4 |
| background-color | `rgba(0, 0, 0, 0)` |
| color | `rgb(51, 51, 51)` |
| font-family | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| font-size / **font-weight** / font-style | `14px` / **`700`** / `normal` |
| line-height | `20px` |
| text-align | `start` |
| white-space | `normal` |
| overflow / opacity / box-shadow | `visible` / `1` / `none` |
| **cursor** | **`default`** |
| transform / transition | `none` / `all 0s` |

(`font-weight: 700` and `cursor: default` come from cap01's COMMON table and are printed explicitly as deviations in the baseline records `#105`–`#109` — both views agree.)

### 5.14 `input[type=checkbox]` ×5 — cap01 `#17`–`#21` (COMMON + 6 deviations each)

| prop | value |
|---|---|
| display | `inline-block` |
| position | `static`; float `none`; box-sizing `border-box` |
| width / height | `13px` / `13px` |
| **margin T/R/B/L** | **`4px`** / `0px` / `0px` / `0px` |
| padding | `0px` ×4 |
| border / radius | `0px none rgb(51,51,51)` ×4 / `0px` ×4 |
| background-color / -image | `rgba(0, 0, 0, 0)` / `none` |
| color | `rgb(51, 51, 51)` |
| font-family / -size / **-weight** | `"Helvetica Neue", Helvetica, Arial, sans-serif` / `14px` / **`700`** |
| **line-height** | **`normal`** |
| text-align | `start` |
| vertical-align | `baseline` |
| opacity / box-shadow | `1` / `none` |
| outline-style / -width / -color | `none` / `3px` / `rgb(51, 51, 51)` |
| **cursor** | **`default`** |
| **appearance** | **`auto`** ← native OS checkbox, not a restyled control |
| transform / transition | `none` / `all 0s` |

### 5.15 The z-index stack (exhaustive — every `z-index` deviation in all 18 baseline node files)

| z-index | count | element(s) |
|---|---|---|
| `2000000000` | 5 | `#13 r.12` (inline-styled reCAPTCHA bubble, `visibility: hidden`, `top: -10000px`) + `#16`–`#19` (`.g-recaptcha-bubble-arrow` ×2 and two unclassed children) |
| `1060` | 1 | `#1640 r.0.1.1.0.1.3.1.2.0.0.5.1.1.0 div.popover.fade.bottom` |
| **`1050`** | **1** | **`#27 div#permissionsModal.modal.fade`** ← this piece |
| `1000` | 17 | the 17 dropdown menus — exactly `14 × class="dropdown-menu"` + `3 × class="dropdown-menu dropdown-menu-right"` (verified by `grep 'attr class = ".*dropdown-menu'` over all 18 node files); these include M1 (P09) and M2 (P10) |
| `100` | 1 | `#1641 div.ta-resizer-handle-overlay` |
| `2` | 13 | — |
| `1` | 2 | — |

So in the captured page the modal sits **above every dropdown (1000) but below the textAngular popover (1060)** and below the reCAPTCHA bubble. **There is NO element at z-index 1040** and **no `.modal-backdrop` node anywhere in the 2156-node baseline** (`grep -c "modal-backdrop"` over `nodes-000..017` = 0). See §8.

`#permissionsModal` is the **2nd and last child** of `#22 r.0.1.1 <div ui-view autoscroll="false" class="ng-fadeOutZoom ng-fluid ng-scope" style="background-color: 0A0A0A; ">` (that inline `style` value is verbatim and is an **invalid** colour token — no `#`). Its only sibling is `#26 r.0.1.1.0 div.panel.panel-default` (x=0 y=50 w=1842 h=772.8). Exhaustive `grep 'attr class = "modal'` over the whole baseline returns exactly one `"modal fade"` — **this is the only modal in the page**.

### 5.16 Hover / focus / active / `:checked`

**NOT CAPTURED.** No `:hover`, `:focus`, `:active`, or `:checked` block is emitted anywhere in cap01 or in the baseline modal records — only `::before` / `::after`. See §8.

---

## 6. Verbatim text, with paths

| path (open) | path (baseline) | string (verbatim) |
|---|---|---|
| `r.0.0.0.1#permissionsModalLabel` | `r.0.1.1.1#permissionsModal.0.0.0.1#permissionsModalLabel` (`#104`) | `Adjust Mic/Cam/Screen permissions for user:` |
| `r.0.0.0.1#permissionsModalLabel.0` | `…#permissionsModalLabel.0` (`#148`) | *(empty — `i.ng-binding`, width 0)* |
| `r.0.0.0.0.0` | `…0.0.0.0.0` (`#147`) | `×` (U+00D7 MULTIPLICATION SIGN) |
| `r.0.0.1.0` | `…0.0.1.0` (`#105`) | `Microphone` |
| `r.0.0.1.1` | `…0.0.1.1` (`#106`) | `Screenshare` |
| `r.0.0.1.2` | `…0.0.1.2` (`#107`) | `WebCam` |
| `r.0.0.1.3` | `…0.0.1.3` (`#108`) | `AdminChat` |
| `r.0.0.1.4` | `…0.0.1.4` (`#109`) | `CanEditNotes` |
| `r.0.0.2.0` | `…0.0.2.0` (`#110`) | `Close` |
| `r.0.0.2.1` | `…0.0.2.1` (`#111`) | `Save Changes` |
| — | `r.0.1.1.0.1.3.1.0.0.3.1.{0,1,2}.4.0.1.1.1.0.0` (`#1996`, `#2021`, `#2046`) | `Adjust Mic/Cam/Screen/Chat/Notes` (the trigger) |

Also captured as attribute strings: `aria-label = "Close"` on `button.close`; `aria-labelledby = "permissionsModalLabel"` on the modal; `role="dialog"` / `role="document"`; `tabindex="-1"`.

**Truncation: none flagged.** `INFO.txt` reports `truncated=false`, `22 (declared 22)`; every string is identical between the open and the closed capture — no conflict to resolve.

**Naming inconsistency, as captured (do not normalise):** the trigger says `Adjust Mic/Cam/Screen/**Chat/Notes**` (5 capabilities) while the dialog title says `Adjust Mic/Cam/Screen permissions for user:` (3), yet the body offers all 5 controls. Reproduce both strings verbatim.

---

## 7. Rebuild spec

### 7.1 HTML (exact structure)

```html
<!-- last child of div[ui-view].ng-fadeOutZoom.ng-fluid.ng-scope -->
<!-- CLOSED: class="modal fade", NO inline style                   -->
<!-- OPEN:   class="modal fade show" style="display: block; visibility: visible;" -->
<div class="modal fade" id="permissionsModal" tabindex="-1" role="dialog"
     aria-labelledby="permissionsModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">

      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
        <h4 class="modal-title" id="permissionsModalLabel">
          Adjust Mic/Cam/Screen permissions for user: <i class="ng-binding"></i>
        </h4>
      </div>

      <div class="modal-body">
        <label class="d-block">
          <input ng-change="toggleHasMic()"       ng-model="userPermissions.hasMic"       type="checkbox" name="checkbox"> Microphone
        </label>
        <label class="d-block">
          <input ng-change="toggleHasScreen()"    ng-model="userPermissions.hasScreen"    type="checkbox" name="checkbox"> Screenshare
        </label>
        <label class="d-block">
          <input ng-change="toggleHasCam()"       ng-model="userPermissions.hasCam"       type="checkbox" name="checkbox"> WebCam
        </label>
        <label class="d-block">
          <input ng-change="toggleHasAdminChat()" ng-model="userPermissions.hasAdminChat" type="checkbox" name="checkbox"> AdminChat
        </label>
        <label class="d-block">
          <input ng-change="toggleCanEditNotes()" ng-model="userPermissions.canEditNotes" type="checkbox" name="checkbox"> CanEditNotes
        </label>
      </div>

      <div class="modal-footer text-right">
        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
        <button type="button" ng-click="saveUserPermissions()" class="btn btn-success">Save Changes</button>
      </div>

    </div>
  </div>
</div>

<!-- the trigger, once per user row, inside that row's dropdown-menu -->
<a href="" ng-click="setPermissions(user)" data-toggle="modal" data-target="#permissionsModal">Adjust Mic/Cam/Screen/Chat/Notes</a>
```

Note: the `class="ng-pristine ng-untouched ng-valid"` on each input is Angular-applied at runtime; it is in the capture but must not be authored by hand.

### 7.2 CSS (absolute values; no custom properties, no flex, no grid)

```css
/* ---- overlay / closed state ---- */
#permissionsModal.modal {
  display: none;                      /* CLOSED */
  position: fixed;
  top: 0; right: 0; bottom: 0; left: 0;
  z-index: 1050;
  width: 1842px; height: 1265px;      /* = the viewport, from the inset:0 fixed box */
  margin: 0; padding: 0; border: 0; border-radius: 0;
  background-color: rgba(0, 0, 0, 0); background-image: none;
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: start; white-space: normal;
  overflow: hidden;
  opacity: 0;                         /* .fade resting value */
  box-shadow: none;
  outline: none; outline-width: 0;
  cursor: auto;
  transition: opacity 0.15s;
  transform: none;
  box-sizing: border-box;
}
/* OPEN, as literally captured (mid-transition): add class `show` +
   style="display: block; visibility: visible;"  — opacity is still 0     */
#permissionsModal.modal.show { display: block; visibility: visible; }
/* RESTING open state (DERIVED, Bootstrap 3 `.in`): */
#permissionsModal.modal.in { opacity: 1; }

/* ---- dialog ---- */
#permissionsModal .modal-dialog {
  position: relative;
  width: 600px;
  margin: 30px auto;                  /* resolves to 30px 621px at 1842px wide */
  padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  opacity: 1; box-shadow: none; cursor: auto;
  transition: transform 0.3s;
  transform: translate(0, -25%);      /* CAPTURED = matrix(1,0,0,1,0,-82.1777) */
  box-sizing: border-box;
}
#permissionsModal.modal.in .modal-dialog { transform: translate(0, 0); }  /* DERIVED resting */

/* ---- content shell ---- */
#permissionsModal .modal-content {
  position: relative;
  width: 600px;                       /* height 328.711px is content-driven */
  margin: 0;
  padding: 20px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  background-color: rgb(255, 255, 255);
  background-clip: padding-box; background-image: none;
  box-shadow: rgba(0, 0, 0, 0.5) 0 5px 15px 0;
  outline: none; outline-width: 0;
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: start; white-space: normal;
  opacity: 1; cursor: auto;
  box-sizing: border-box;
}

/* ---- header ---- */
#permissionsModal .modal-header {
  width: 558px;                       /* height resolves to 56.7109px */
  margin: 0; padding: 15px;
  border-bottom: 1px solid rgb(229, 229, 229);
  background-color: rgba(0, 0, 0, 0);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  cursor: auto;
  box-sizing: border-box;
}
#permissionsModal .modal-header::before,
#permissionsModal .modal-header::after { content: " "; display: table; }  /* clearfix for the floated × */

#permissionsModal .modal-header .close {
  float: right;
  width: 12.6016px; height: 21px;
  margin: -2px 0 0 0; padding: 0;
  border: 0 none rgb(0, 0, 0);
  background-color: rgba(0, 0, 0, 0); background-image: none; background-position: 0 0;
  color: rgb(0, 0, 0);
  font-size: 21px; font-weight: 700; line-height: 21px;
  text-align: center;
  text-shadow: rgb(255, 255, 255) 0 1px 0;
  opacity: 0.2;
  outline: none; outline-width: 3px; outline-color: rgb(0, 0, 0);
  cursor: pointer;
  appearance: none;
}
#permissionsModal .modal-header .close > span {
  display: inline;
  color: rgb(0, 0, 0);
  font-size: 21px; font-weight: 700; line-height: 21px;
  text-align: center; text-shadow: rgb(255, 255, 255) 0 1px 0;
  cursor: pointer;
}

#permissionsModal .modal-title {
  width: 528px; height: 25.7109px;
  margin: 0; padding: 0; border: 0;
  color: rgb(51, 51, 51);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 18px; font-weight: 500; line-height: 25.7143px;
  text-align: start; white-space: normal;
  cursor: auto;
}
#permissionsModal .modal-title > i.ng-binding {
  display: inline;
  font-size: 18px; font-weight: 500; font-style: italic; line-height: 25.7143px;
  color: rgb(51, 51, 51);
}

/* ---- body ---- */
#permissionsModal .modal-body {
  position: relative;
  width: 558px;                       /* height resolves to 165px */
  margin: 0; padding: 15px; border: 0;
  background-color: rgba(0, 0, 0, 0);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  cursor: auto;
  box-sizing: border-box;
}
#permissionsModal .modal-body > label.d-block {
  display: block;
  width: 528px; height: 22px;
  max-width: 100%;
  margin: 0 0 5px 0;
  padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px; font-weight: 700; line-height: 20px;
  text-align: start; white-space: normal;
  cursor: default;
  box-sizing: border-box;
}
#permissionsModal .modal-body input[type="checkbox"] {
  display: inline-block;
  width: 13px; height: 13px;
  margin: 4px 0 0 0; padding: 0; border: 0;
  line-height: normal;
  vertical-align: baseline;
  appearance: auto;                   /* native control */
  cursor: default;
  font-weight: 700;                   /* inherited, as captured */
  box-sizing: border-box;
}

/* ---- footer ---- */
#permissionsModal .modal-footer {
  width: 558px; height: 65px;
  margin: 0; padding: 15px;
  border-top: 1px solid rgb(229, 229, 229);
  background-color: rgba(0, 0, 0, 0);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: right;                  /* right-aligns the inline-block buttons — NO flex */
  cursor: auto;
  box-sizing: border-box;
}
#permissionsModal .modal-footer::before,
#permissionsModal .modal-footer::after { content: " "; display: table; }

#permissionsModal .modal-footer .btn {
  display: inline-block;
  height: 34px;
  margin: 0; padding: 6px 12px;
  border-width: 1px; border-style: solid;
  border-radius: 4px;
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: center; white-space: nowrap; vertical-align: middle;
  background-image: none; box-shadow: none; opacity: 1;
  outline: none; outline-width: 3px;
  cursor: pointer; user-select: none;
  transition: all 0s; transform: none;
  box-sizing: border-box;
}
#permissionsModal .modal-footer .btn-default {
  width: 61.7734px;
  border-color: rgb(230, 233, 238);
  background-color: rgb(255, 255, 255);
  color: rgb(51, 51, 51);
  outline-color: rgb(51, 51, 51);
}
#permissionsModal .modal-footer .btn-success {
  width: 116.75px;
  margin-left: 5px;
  border-color: rgb(76, 174, 76);
  background-color: rgb(92, 184, 92);
  color: rgb(255, 255, 255);
  outline-color: rgb(255, 255, 255);
}
```

The single space between `</button>` and `<button class="btn btn-success">` in the footer markup is load-bearing: it contributes ≈3.877px of the 8.877px measured gap (§5.12).

### 7.3 Absolute coordinates (1842×1265, dpr 2) — CAPTURED and DERIVED side by side

```
                                CAPTURED (opacity 0, dialog translateY -82.1777)   DERIVED RESTING (.in)
div#permissionsModal            x=0      y=0        w=1842    h=1265                same
  div.modal-dialog              x=621    y=-52.178  w=600     h=328.711             y=30
  div.modal-content             x=621    y=-52.178  w=600     h=328.711             y=30
    div.modal-header            x=642    y=-31.178  w=558     h=56.711              y=51
      button.close              x=1172.4 y=-18.178  w=12.602  h=21                  y=64
        span "×"                x=1172.4 y=-20.178  w=12.602  h=25                  y=62
      h4#permissionsModalLabel  x=657    y=-16.178  w=528     h=25.711              y=66
        i.ng-binding            x=1034.2 y=-14.2    w=0       h=21.5                y≈67.98
    div.modal-body              x=642    y=25.533   w=558     h=165                 y=107.711
      label "Microphone"        x=657    y=40.533   w=528     h=22                  y=122.711
        input                   x=657    y=44.533   w=13      h=13                  y=126.711
      label "Screenshare"       x=657    y=67.533   w=528     h=22                  y=149.711
        input                   x=657    y=71.533   w=13      h=13                  y=153.711
      label "WebCam"            x=657    y=94.533   w=528     h=22                  y=176.711
        input                   x=657    y=98.533   w=13      h=13                  y=180.711
      label "AdminChat"         x=657    y=121.533  w=528     h=22                  y=203.711
        input                   x=657    y=125.533  w=13      h=13                  y=207.711
      label "CanEditNotes"      x=657    y=148.533  w=528     h=22                  y=230.711
        input                   x=657    y=152.533  w=13      h=13                  y=234.711
    div.modal-footer            x=642    y=190.533  w=558     h=65                  y=272.711
      button "Close"            x=997.6  y=206.533  w=61.773  h=34                  y=288.711
      button "Save Changes"     x=1068.25 y=206.533 w=116.75  h=34                  y=288.711
    dialog bottom edge                   y=276.533                                  y=358.711
```

Every x is captured. Every DERIVED y = captured y + 82.1777 (see §5.4 for the two independent proofs of that constant).

---

## 8. Honest gaps

1. **No `.modal-backdrop` was captured — anywhere.** `grep -c "modal-backdrop"` across all 18 baseline node files and cap01 returns **0**, and the baseline z-index census (§5.15) contains no `1040`. Bootstrap 3 normally injects `<div class="modal-backdrop fade in">` at `z-index: 1040, background-color: #000, opacity: .5`, but **none of those values are in this evidence** — they must not be asserted. The backdrop's existence, colour, opacity and z-index are an **uncaptured region**.
2. **Checked states of the five checkboxes were not recorded.** No `checked` attribute, no `:checked` style block, no property in the dump carries the boolean. `ng-pristine ng-untouched` proves only "not interacted with". The rendered tick/no-tick per box is **unknown** — render them from real `userPermissions` data or an explicit pending state; never fabricate ticks for a screenshot.
3. **The modal was captured mid-transition** (`opacity: 0`, dialog `translateY(-82.1777px)`). Everything labelled "resting" in §5.4 and §7.3 is **derived arithmetic** on captured numbers, not a captured measurement. A true resting-state capture does not exist in this evidence set.
4. **The bound user name is empty.** `i.ng-binding` has width exactly `0` and the `h4` carries only the static title. The capture therefore does not tell us the name format, whether it is quoted, or how a long name wraps. Do not invent a name.
5. **Hover / focus / active / disabled states are absent** — no `:hover`, `:focus`, `:active`, `:disabled` block anywhere in cap01 or the baseline modal records. `button.close`'s `opacity: 0.2` is only its resting value; its hover value (BS3 raises it) is **not captured**. Same for `.btn-default`, `.btn-success`.
6. **The `.in` class name is inferred, not captured.** What IS captured is `class="modal fade show"` on the open node — so this build uses a `show` class on the `.modal` element. Whether the resting opacity/transform come from `.in`, from `.show`, or from a delayed style is **not determinable** from a single mid-transition frame; only the target values (opacity 1, translate 0) are derivable, and those come from arithmetic, not from a rule the dump recorded.
7. **The trigger's rendered geometry is unknown.** All three trigger `<a>` nodes have rect `0×0` because their row dropdowns are closed in the baseline, and cap01 is re-rooted at the modal so it does not contain them. Their open rects live in captures 04–18, which are outside this piece.
8. **Only 3 user rows were present** — baseline `#467`/`#468`/`#469` at `r.0.1.1.0.1.3.1.0.0.3.1.{0,1,2}` are the only `<tr>` under the table body — so exactly 3 triggers exist in this capture. The row count is data-dependent, not a layout constant.
9. **The parent `div[ui-view]` carries `style="background-color: 0A0A0A; "` — an invalid CSS colour** (missing `#`). It is reproduced verbatim above; the browser discards it, so the effective background is whatever the cascade gives. Do not "fix" it to `#0A0A0A` without separate evidence.
10. **No screenshot was in this evidence set.** This decode is DOM + computed-style only; the rule-3 pixel-diff of a built page against a rendered reference has **not** been performed and remains outstanding.
