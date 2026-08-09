# PTR1 · P19 — "SSO Setup" tab pane

**Evidence base:** `/tmp/ptr-decode/ptr1/caps/00-baseline-room/` — `DEFAULTS.txt` + `nodes-000.txt`…`nodes-017.txt`
(capture `baseline-room`, `kind=fullDom`, `node count 2156`, `truncated=false`, `ts 2026-07-24T15:59:18.276Z`,
`viewport {"w":1842,"h":1265,"dpr":2}`, `themeClass "footer-hidden"`, `cssVars {"root":{},"body":{}}` — `INFO.txt`).
Page: Manage Room admin page, room 3625.

**Extraction command used (breadth-first by path prefix, not by `#index`):**
```
awk -v RS='' -v ORS='\n\n' '/path=r\.0\.1\.1\.0\.1\.3\.1\.3([. ])/' nodes-*.txt
```

---

## 1. Purpose and reveal condition

This is the **4th `tab-pane`** (`ng-repeat="tab in tabs"`, index 3) of the uib-tabset at
`r.0.1.1.0.1.3`. It is the single-sign-on configuration pane. In this capture it contains exactly
**one editable field: "SSO Host"** (`#1335`), an x-editable text field bound to `sess.ssoHost`.

**Exact reveal condition — verbatim from the evidence.** The pane element itself (`#100`) carries
**no** `ng-if` and **no** `ng-show`; its only visibility attributes are:

```
attr ng-repeat = "tab in tabs"
attr ng-class  = "{active: tab.active}"
```

The gate lives on the *tab heading* `<li>` (`#94 path=r.0.1.1.0.1.3.0.3`), verbatim:

```
attr ng-class = "{active: active, disabled: disabled}"
attr heading  = "SSO Setup"
attr ng-show  = "sess.authMode=='sso'"
attr class    = "ng-isolate-scope ng-hide"
```

So the pane is revealed by **two** conditions, both citable:
1. `sess.authMode=='sso'` must be true — otherwise the heading `<li>` gets Angular's `ng-hide` class.
   In this capture the `<li>` **does** carry `ng-hide` and computes `display: none`, therefore
   `sess.authMode` was **not** `'sso'` at capture time.
2. `tab.active` must be true. This pane's class is `"tab-pane ng-scope"` **without** `active`; the
   active pane is index 0 ("Users", `#97`, class `"tab-pane ng-scope active"`, rect 37,361 1768×393.766).

Corroborating evidence for the same `authMode` switch elsewhere on the page (outside this anchor, cited
for completeness of the reveal logic — these are *sibling* gates in the top form, not part of this pane):
* `#56 r.0.1.1.0.1.0.3` — `ng-show = "sess.authMode=='registrationA' || sess.authMode=='registrationM'"`, class `ng-hide` → hidden.
* `#57 r.0.1.1.0.1.0.4` — `ng-show = "sess.authMode=='webinarRoom' || sess.authMode=='open' || sess.authMode=='unamePW' || sess.allowPWLoginWithSSO"`, class `""`, rect 16,119 1810×170 → **visible**.

That last one is *hard evidence* that `sess.authMode` is one of `webinarRoom` / `open` / `unamePW`
(or that `sess.allowPWLoginWithSSO` is truthy) — in any case **not `'sso'`**, consistent with the
hidden SSO tab.

---

## 2. Path anchor + record count

* Anchor: `r.0.1.1.0.1.3.1.3`
* **Records found under the anchor (inclusive): 7** — `#100`, `#140`, `#178`, `#213`, `#214`, `#475`, `#1335`.
* All 7 read in full, line by line. No truncated attribute (max attr payload 33 chars, cap 300) and no
  truncated text (max text 8 chars, cap 250).

---

## 3. Node table (all 7 nodes)

Every rect below is literally `x=0 y=0 w=0 h=0` in the dump — see §9.

| # | path | tag | id | classes | rect (as captured) | self `display:none`? |
|---|---|---|---|---|---|---|
| 100 | `r.0.1.1.0.1.3.1.3` | `div` | — | `tab-pane`, `ng-scope` | 0,0 0×0 | **yes** (`display: none` deviation) |
| 140 | `r.0.1.1.0.1.3.1.3.0` | `div` | — | `form-horizontal`, `ng-scope` | 0,0 0×0 | no — record lists **0 deviations** → `display: block` |
| 178 | `r.0.1.1.0.1.3.1.3.0.0` | `div` | — | `form-group`, `m0` | 0,0 0×0 | no — **0 deviations** → `display: block`; has `::before` + `::after` clearfix |
| 213 | `r.0.1.1.0.1.3.1.3.0.0.0` | `label` | — | `col-sm-4`, `control-label` | 0,0 0×0 | no (`display: block` — COMMON; `.control-label` in `.form-horizontal` is not `inline-block` here) |
| 214 | `r.0.1.1.0.1.3.1.3.0.0.1` | `div` | — | `col-sm-8` | 0,0 0×0 | no (`display: block`) |
| 475 | `r.0.1.1.0.1.3.1.3.0.0.1.0` | `p` | — | `form-control-static` | 0,0 0×0 | no (`display: block`) |
| 1335 | `r.0.1.1.0.1.3.1.3.0.0.1.0.0` | `a` | — | `ng-scope`, `ng-binding`, `editable`, `editable-click`, `editable-empty` | 0,0 0×0 | no (`display: inline`) |

Tree shape:

```
#100  div.tab-pane.ng-scope                              r.0.1.1.0.1.3.1.3
└── #140   div.form-horizontal.ng-scope                  …3.0
    └── #178   div.form-group.m0                         …3.0.0
        ├── #213   label.col-sm-4.control-label          …3.0.0.0    "SSO Host"
        └── #214   div.col-sm-8                          …3.0.0.1
            └── #475   p.form-control-static             …3.0.0.1.0
                └── #1335  a.editable.editable-click.editable-empty   …3.0.0.1.0.0   "empty"
```

**Finding:** the SSO pane is a *single-row* form. There is exactly **one** `.form-group` under the
anchor. There is no SSO certificate field, no entity-ID field, no ACS-URL field, no save button —
nothing beyond "SSO Host" exists in the captured DOM.

---

## 4. Every attribute, verbatim

**#100 `r.0.1.1.0.1.3.1.3` `<div>`**
```
attr class                  = "tab-pane ng-scope"
attr ng-repeat              = "tab in tabs"
attr ng-class               = "{active: tab.active}"
attr tab-content-transclude = "tab"
```

**#140 `r.0.1.1.0.1.3.1.3.0` `<div>`**
```
attr class = "form-horizontal ng-scope"
```

**#178 `r.0.1.1.0.1.3.1.3.0.0` `<div>`**
```
attr class = "form-group m0"
```
Pseudo-elements captured (Bootstrap 3 `.form-group` clearfix):
```
::before: {"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}
::after:  {"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}
```

**#213 `r.0.1.1.0.1.3.1.3.0.0.0` `<label>`**
```
attr class = "col-sm-4 control-label"
```
(No `for` attribute — the label is not programmatically associated with any control.)

**#214 `r.0.1.1.0.1.3.1.3.0.0.1` `<div>`**
```
attr class = "col-sm-8"
```

**#475 `r.0.1.1.0.1.3.1.3.0.0.1.0` `<p>`**
```
attr class = "form-control-static"
```

**#1335 `r.0.1.1.0.1.3.1.3.0.0.1.0.0` `<a>`**
```
attr href          = ""
attr editable-text = "sess.ssoHost"
attr onaftersave   = "saveSessField('ssoHost')"
attr class         = "ng-scope ng-binding editable editable-click editable-empty"
```
No `e-*` attributes (`e-name`, `e-form`, `e-required`, …) are present. No `buttons`, no `blur`, no
`onbeforesave`, no `e-placeholder`. The x-editable trigger mode is `editable-click` (class), which is
angular-xeditable's default.

---

## 5. Resolved computed style — absolute values

Values = `DEFAULTS.txt` COMMON overridden by each record's listed deviations.

### #100 `div.tab-pane.ng-scope` (1 deviation)
display **none** · position static · float none · width auto · height auto · margin 0px ×4 ·
padding 0px ×4 · border-width 0px ×4 · border-style none ×4 · border-color rgb(51,51,51) ×4 ·
radius 0px ×4 · background-color rgba(0,0,0,0) · color rgb(51,51,51) ·
font-family `"Helvetica Neue", Helvetica, Arial, sans-serif` · font-size 14px · font-weight 400 ·
line-height 20px · text-align start · opacity 1 · cursor auto · pointer-events auto.

### #140 `div.form-horizontal.ng-scope` (0 deviations — everything is COMMON)
display **block** · position static · float none · width auto · height auto · margin 0px ×4 ·
padding 0px ×4 · border-width 0px ×4 · border-style none ×4 · border-color rgb(51,51,51) ×4 ·
radius 0px ×4 · background-color rgba(0,0,0,0) · color rgb(51,51,51) ·
font-family `"Helvetica Neue", Helvetica, Arial, sans-serif` · font-size 14px · font-weight 400 ·
line-height 20px · text-align start · opacity 1 · cursor auto · pointer-events auto.

### #178 `div.form-group.m0` (0 deviations — everything is COMMON)
display **block** · position static · float none · width auto · height auto ·
**margin 0px ×4** (this is the point of the `m0` utility class: stock Bootstrap `.form-group` has
`margin-bottom: 15px`; here the resolved value is `0px`, so `m0` really is `margin: 0`) ·
padding 0px ×4 · border-width 0px ×4 · border-style none ×4 · border-color rgb(51,51,51) ×4 ·
radius 0px ×4 · background-color rgba(0,0,0,0) · color rgb(51,51,51) ·
font 400 14px/20px `"Helvetica Neue", Helvetica, Arial, sans-serif` · text-align start · opacity 1 ·
cursor auto · pointer-events auto.
`::before` and `::after` both resolve `content: " "`, `color rgb(51,51,51)`, `font-family "Helvetica Neue", Helvetica, Arial, sans-serif`, `font-size 14px`, `background-color rgba(0,0,0,0)`.

### #213 `label.col-sm-4.control-label` (11 deviations)
| prop | resolved |
|---|---|
| display | block |
| position | **relative** |
| float | **left** |
| width | **33.3333%** |
| height | auto |
| max-width | **100%** |
| min-height | **1px** |
| margin T/R/B/L | 0px / 0px / **0px** / 0px — note: **no** `margin-bottom: 5px` here, unlike the labels in the User Stats pane; `.control-label` inside `.form-horizontal` zeroes it |
| padding T/R/B/L | **7px** / **15px** / 0px / **15px** |
| border-width ×4 | 0px · border-style ×4 none · border-color ×4 rgb(51,51,51) |
| radius ×4 | 0px |
| background-color | rgba(0, 0, 0, 0) |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | **700** |
| line-height | 20px |
| text-align | **right** |
| opacity | 1 |
| cursor | **default** |
| pointer-events | auto |

### #214 `div.col-sm-8` (6 deviations)
display block · position **relative** · float **left** · width **66.6667%** · height auto ·
min-height **1px** · margin 0px ×4 · padding T 0px / R **15px** / B 0px / L **15px** ·
border-width 0px ×4 · border-style none ×4 · border-color rgb(51,51,51) ×4 · radius 0px ×4 ·
background-color rgba(0,0,0,0) · color rgb(51,51,51) · font 400 14px/20px `"Helvetica Neue", …` ·
text-align start · opacity 1 · cursor auto · pointer-events auto.

### #475 `p.form-control-static` (3 deviations)
display block · position static · float none · width auto · height auto · **min-height 34px** ·
margin 0px ×4 (note: `<p>`'s UA `margin-bottom: 1em` is overridden away — the captured value is the
COMMON `0px`) · padding T **7px** / R 0px / B **7px** / L 0px · border-width 0px ×4 ·
border-style none ×4 · border-color rgb(51,51,51) ×4 · radius 0px ×4 ·
background-color rgba(0,0,0,0) · color rgb(51,51,51) · font 400 14px/20px `"Helvetica Neue", …` ·
text-align start · opacity 1 · cursor auto · pointer-events auto.

### #1335 `a.editable.editable-click.editable-empty` (11 deviations) — the SSO Host x-editable
| prop | resolved |
|---|---|
| display | **inline** |
| position | static |
| float | none |
| width / height | auto / auto |
| margin ×4 | 0px |
| padding ×4 | 0px |
| border-top-width | 0px · border-right-width 0px · **border-bottom-width 1px** · border-left-width 0px |
| border-top-style | none · border-right-style none · **border-bottom-style dashed** · border-left-style none |
| border-top-color | **rgb(10, 10, 10)** · border-right-color **rgb(10, 10, 10)** · **border-bottom-color rgb(66, 139, 202)** · border-left-color **rgb(10, 10, 10)** |
| radius ×4 | 0px |
| background-color | rgba(0, 0, 0, 0) |
| color | **rgb(10, 10, 10)** |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | **italic** ← this is the `.editable-empty` state |
| line-height | 20px |
| text-align | start |
| text-decoration-line | none |
| opacity | 1 |
| cursor | **pointer** |
| pointer-events | auto |

**Finding:** an *unset* x-editable renders as `rgb(10,10,10)` **italic** text with a dashed
`rgb(66,139,202)` (Bootstrap `@brand-primary` #428bca) underline. Compare the *set* x-editables in the
User Stats pane (`#1644`, `#1648`): identical colours and dashed underline, but `font-style: normal`
(they list only 10 deviations, no `font-style`). The **only** visual difference between an empty and a
filled x-editable is the italic and the literal word.

---

## 6. Verbatim text

| path | node | verbatim text |
|---|---|---|
| `r.0.1.1.0.1.3.1.3.0.0.0` | #213 `<label>` | `SSO Host` |
| `r.0.1.1.0.1.3.1.3.0.0.1.0.0` | #1335 `<a editable-text="sess.ssoHost">` | `empty` |

`empty` is **real, literal UI copy** rendered by angular-xeditable for an unset value (class
`editable-empty`, computed `font-style: italic`). It is *not* a capture artefact and *not* a
placeholder I invented — it is the string the record itself carries.

Truncation check: no `attr` reaches the 300-char cap, no `text:` reaches the 250-char cap.
**Nothing under this anchor is truncated.**

The tab label itself, outside the anchor: `#94 attr heading = "SSO Setup"` and
`#134`-adjacent `<a>` at `r.0.1.1.0.1.3.0.3.0` (heading transclude) — the `<li>` is `ng-hide`n.

---

## 7. Field / control inventory

Exactly **one** control exists under this anchor.

| control | path | element | label | `editable-*` type | binds | `onaftersave` | captured value |
|---|---|---|---|---|---|---|---|
| SSO Host | `…3.0.0.1.0.0` | `<a href="">` | `SSO Host` (#213, `label.col-sm-4.control-label`, **no `for`**) | `editable-text` | **`sess.ssoHost`** | `saveSessField('ssoHost')` | **unset** — renders the literal italic word `empty`; class list contains `editable-empty` |

* **`<input>` count under the anchor: 0.**
* **`<textarea>` count: 0.**
* **`<select>` count: 0.**
* **`<button>` count: 0.** There is no Save button in this pane — persistence is per-field via
  `onaftersave="saveSessField('ssoHost')"`.
* **Checkbox / radio count: 0.**

---

## 8. Rebuild spec

### HTML (reconstructed strictly from the captured paths, attributes and text)

```html
<!-- r.0.1.1.0.1.3.1.3 — 4th child of div.tab-content -->
<div class="tab-pane ng-scope"
     ng-repeat="tab in tabs"
     ng-class="{active: tab.active}"
     tab-content-transclude="tab">

  <!-- …3.0 -->
  <div class="form-horizontal ng-scope">

    <!-- …3.0.0 -->
    <div class="form-group m0">

      <!-- …3.0.0.0 -->
      <label class="col-sm-4 control-label">SSO Host</label>

      <!-- …3.0.0.1 -->
      <div class="col-sm-8">
        <!-- …3.0.0.1.0 -->
        <p class="form-control-static">
          <!-- …3.0.0.1.0.0 -->
          <a href=""
             editable-text="sess.ssoHost"
             onaftersave="saveSessField('ssoHost')"
             class="ng-scope ng-binding editable editable-click editable-empty">empty</a>
        </p>
      </div>

    </div>
  </div>
</div>
```

### CSS — resolved absolute declarations (captured computed values)

```css
.tab-content > .tab-pane        { display: none; }   /* captured on #100 */
.tab-content > .tab-pane.active { display: block; }  /* captured on #97 */

/* #178 */
.form-horizontal .form-group.m0 { margin: 0; }
.form-horizontal .form-group.m0::before,
.form-horizontal .form-group.m0::after { content: " "; display: table; }

/* #213 */
.form-horizontal .col-sm-4.control-label {
  position: relative;
  float: left;
  width: 33.3333%;
  max-width: 100%;
  min-height: 1px;
  margin: 0;
  padding: 7px 15px 0 15px;
  font: 700 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  color: rgb(51, 51, 51);
  text-align: right;
  cursor: default;
}

/* #214 */
.col-sm-8 {
  position: relative;
  float: left;
  width: 66.6667%;
  min-height: 1px;
  padding: 0 15px;
}

/* #475 */
.form-control-static {
  min-height: 34px;
  margin: 0;
  padding: 7px 0;
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  color: rgb(51, 51, 51);
}

/* #1335 */
a.editable.editable-click {
  display: inline;
  border-bottom: 1px dashed rgb(66, 139, 202);
  color: rgb(10, 10, 10);
  text-decoration: none;
  cursor: pointer;
}
a.editable.editable-click.editable-empty {
  font-style: italic;   /* the "empty" state — the ONLY delta vs a filled x-editable */
}
```

### Geometry — measured vs CSS-derived

| dimension | source | value |
|---|---|---|
| every node in this pane: x, y, w, h | **NOT measured** | `0,0 0×0` in the dump — pane never laid out |
| pane content width when active | **CSS-derived** from the measured sibling #97 | 1768px at this 1842px viewport (`.tab-content` #61 measured 1810px wide, `padding: 10px 20px`, `1px` L/R borders) |
| `label.col-sm-4` | **CSS-derived** | `33.3333%` of 1768px = 589.33px, of which 15px L + 15px R is padding |
| `div.col-sm-8` | **CSS-derived** | `66.6667%` of 1768px = 1178.67px |
| `p.form-control-static` | **CSS-derived** | `min-height: 34px`, `padding: 7px 0` |
| row height | **NOT determinable** | depends on the rendered x-editable line box; not captured |

---

## 9. Honest gaps

1. **This pane was never laid out.** All 7 records report `rect: x=0 y=0 w=0 h=0`, a direct consequence
   of `#100` computing `display: none` (not the active tab; its heading `<li>` is additionally
   `ng-hide`n because `sess.authMode != 'sso'`). **No pixel geometry exists in this capture and none is
   invented here.**
2. **The pane may be *incomplete* rather than genuinely one-field.** `#178` is the only `.form-group`
   present. Nothing in the dump proves whether the SSO pane's template is truly just one row or whether
   further rows are behind an `ng-if` that never instantiated (an `ng-if` that is false leaves **no**
   element at all, only a comment node, and comment nodes are not in this dump). This is an **honest
   gap**: I can only assert what the DOM contains, which is one row.
3. **`sess.ssoHost` value: unset.** Evidenced by `editable-empty` + the literal text `empty` + italic.
   The real value is not in the capture because there is none.
4. **`sess.authMode` exact value: not directly captured.** Only inferable as a set-membership from the
   `ng-show`/`ng-hide` outcomes of #56 / #57 / #94 (it is one of `webinarRoom` / `open` / `unamePW`, or
   `sess.allowPWLoginWithSSO` is truthy). The literal string never appears in `nodes-*.txt`.
5. **`saveSessField('ssoHost')` implementation, endpoint and payload are not in the capture** — only
   the attribute string.
6. **x-editable's popover markup is absent.** angular-xeditable builds the edit form lazily on first
   click; because the pane was never rendered, there is no `.editable-container` / `.popover` node under
   this anchor to decode. (Contrast the Branding pane, where textAngular *does* pre-render a popover —
   see P18.)
7. **Hover / focus states are not captured** (one resting computed style per node only).
