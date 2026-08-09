# PTR1 · P17 — "Text List" tab pane

**Evidence base:** `/tmp/ptr-decode/ptr1/caps/00-baseline-room/` — `DEFAULTS.txt` + `nodes-000.txt`…`nodes-017.txt`
(capture `baseline-room`, `kind=fullDom`, `node count 2156`, `truncated=false`, `ts 2026-07-24T15:59:18.276Z`,
`viewport {"w":1842,"h":1265,"dpr":2}`, `themeClass "footer-hidden"`, `cssVars {"root":{},"body":{}}` — `INFO.txt`).
Page: Manage Room admin page, room 3625.

**Extraction command used (breadth-first by path prefix, not by `#index`):**
```
awk -v RS='' -v ORS='\n\n' '/path=r\.0\.1\.1\.0\.1\.3\.1\.1([. ])/' nodes-*.txt
```

---

## 1. Purpose and reveal condition

This is the **2nd `tab-pane`** (`ng-repeat="tab in tabs"`, index 1) of the uib-tabset at
`r.0.1.1.0.1.3`. It is the SMS / texting "Text List" editor: a single free-text
`<textarea id="textListTxt">` plus one **Save List** button wired to `ng-click="saveTextList()"`
(#175, `/tmp/ptr-decode/ptr1/caps/00-baseline-room` records `#175`, `#176`).

**Exact reveal condition — verbatim from the evidence.** The pane element itself (`#98`) carries
**no** `ng-if` and **no** `ng-show`; its only visibility attributes are:

```
attr ng-repeat = "tab in tabs"
attr ng-class  = "{active: tab.active}"
```

The gate lives on the *tab heading* `<li>` (`#92 path=r.0.1.1.0.1.3.0.1`), verbatim:

```
attr ng-class = "{active: active, disabled: disabled}"
attr heading  = "Text List"
attr ng-show  = "sess.twillioApiToken"
attr class    = "ng-isolate-scope ng-hide"
```

So the pane is revealed by **two** conditions, both citable:
1. `sess.twillioApiToken` must be truthy — otherwise the heading `<li>` gets Angular's `ng-hide`
   class and the tab cannot be clicked. In this capture the `<li>` **does** carry `ng-hide` and its
   computed `display` is `none` (#92 style-deviations), therefore `sess.twillioApiToken` evaluated
   **falsy** at capture time. (Note the app's own spelling: `twillio`, double-L, not `twilio`.)
2. `tab.active` must be true, which adds `active` to the pane's class list. In this capture the pane
   class is `"tab-pane ng-scope"` **without** `active`, and the active pane is index 0 ("Users",
   `#97`, class `"tab-pane ng-scope active"`, rect `x=37 y=361 w=1768 h=393.766`).

---

## 2. Path anchor + record count

* Anchor: `r.0.1.1.0.1.3.1.1`
* **Records found under the anchor (inclusive): 5** — `#98`, `#138`, `#175`, `#176`, `#206`.
* Every one of those 5 records was read in full, line by line. No record under this anchor contains a
  truncated attribute (all `attr` values < 290 chars) or truncated text (all `text:` values < 240 chars).

Parent chain for orientation (read from the same dump):
`#41 r.0.1.1.0.1.3 div.ng-isolate-scope` (rect 16,309 1810×476.766)
→ `#61 r.0.1.1.0.1.3.1 div.tab-content` (rect 16,351 1810×434.766)
→ `#98 r.0.1.1.0.1.3.1.1` (this pane).

---

## 3. Node table (all 5 nodes)

Every rect below is literally `x=0 y=0 w=0 h=0` in the dump — see §9.

| # | path | tag | id | classes | rect (as captured) | self `display:none`? |
|---|---|---|---|---|---|---|
| 98 | `r.0.1.1.0.1.3.1.1` | `div` | — | `tab-pane`, `ng-scope` | 0,0 0×0 | **yes** (`display: none` is an explicit style-deviation on #98) |
| 138 | `r.0.1.1.0.1.3.1.1.0` | `div` | — | `form-vertical`, `ng-scope` | 0,0 0×0 | no (`display: block`, inherited from COMMON — record lists 0 deviations) |
| 175 | `r.0.1.1.0.1.3.1.1.0.0` | `button` | — | `btn`, `btn-info`, `pull-right` | 0,0 0×0 | no (`display: block`; see §5 note) |
| 176 | `r.0.1.1.0.1.3.1.1.0.1` | `textarea` | `textListTxt` | *(none)* | 0,0 0×0 | no (`display: inline-block`) |
| 206 | `r.0.1.1.0.1.3.1.1.0.0.0` | `i` | — | `fa`, `fa-save` | 0,0 0×0 | no (`display: inline-block`) |

Tree shape:

```
#98   div.tab-pane.ng-scope                       r.0.1.1.0.1.3.1.1
└── #138  div.form-vertical.ng-scope              …1.0
    ├── #175  button.btn.btn-info.pull-right      …1.0.0   "Save List"
    │   └── #206  i.fa.fa-save                    …1.0.0.0
    └── #176  textarea#textListTxt                …1.0.1   (empty)
```

---

## 4. Every attribute, verbatim

**#98 `r.0.1.1.0.1.3.1.1` `<div>`**
```
attr class                = "tab-pane ng-scope"
attr ng-repeat            = "tab in tabs"
attr ng-class             = "{active: tab.active}"
attr tab-content-transclude = "tab"
```

**#138 `r.0.1.1.0.1.3.1.1.0` `<div>`**
```
attr class = "form-vertical ng-scope"
```

**#175 `r.0.1.1.0.1.3.1.1.0.0` `<button>`**
```
attr class    = "btn btn-info pull-right"
attr ng-click = "saveTextList()"
```
(No `type` attribute is present — so the button defaults to `type="submit"`.)

**#176 `r.0.1.1.0.1.3.1.1.0.1` `<textarea id="textListTxt">`**
```
attr id    = "textListTxt"
attr style = "width: 100%; height:100%"
attr rows  = "40"
```
No `ng-model`, no `name`, no `placeholder`, no `required`, no `ng-*` of any kind. **Finding:** this
textarea is *not* Angular-bound; it is addressed by DOM id (`#textListTxt`) — `saveTextList()` must
read it imperatively.

**#206 `r.0.1.1.0.1.3.1.1.0.0.0` `<i>`**
```
attr class = "fa fa-save"
```
Pseudo-element captured on #206:
```
::before: {"content":"\"\"","color":"rgb(255, 255, 255)","font-family":"FontAwesome","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}
```
The `content` glyph byte-decodes to **U+F0C7** (verified by decoding the raw UTF-8 in the dump), i.e.
the FontAwesome 4 floppy-disk/save glyph, rendered white at 14px in family `FontAwesome`.

---

## 5. Resolved computed style — absolute values

Values below are `DEFAULTS.txt` COMMON overridden by each record's listed deviations. Nothing inferred.

### #98 `div.tab-pane.ng-scope`
| prop | resolved |
|---|---|
| display | **none** *(deviation)* |
| position | static |
| float | none |
| width / height | auto / auto |
| margin T/R/B/L | 0px / 0px / 0px / 0px |
| padding T/R/B/L | 0px / 0px / 0px / 0px |
| border-width T/R/B/L | 0px / 0px / 0px / 0px |
| border-style T/R/B/L | none ×4 |
| border-color T/R/B/L | rgb(51, 51, 51) ×4 |
| radius TL/TR/BL/BR | 0px ×4 |
| background-color | rgba(0, 0, 0, 0) |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size / font-weight | 14px / 400 |
| line-height | 20px |
| text-align | start |
| opacity | 1 |
| cursor | auto |
| pointer-events | auto |

### #138 `div.form-vertical.ng-scope` — record states **0 deviations**, so every property equals COMMON
| prop | resolved |
|---|---|
| display | block |
| position | static |
| float | none |
| width / height | auto / auto |
| margin ×4 | 0px |
| padding ×4 | 0px |
| border-width ×4 | 0px |
| border-style ×4 | none |
| border-color ×4 | rgb(51, 51, 51) |
| radius ×4 | 0px |
| background-color | rgba(0, 0, 0, 0) |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size / weight / line-height | 14px / 400 / 20px |
| text-align | start |
| opacity | 1 |
| cursor | auto |
| pointer-events | auto |

*(`.form-vertical` contributes nothing computable here — it is a layout hook only.)*

### #175 `button.btn.btn-info.pull-right`  (29 deviations)
| prop | resolved |
|---|---|
| display | **block** — COMMON; the record does **not** deviate `display`, so the captured computed value is `block`, not `inline-block`. Contrast #477/#478 in the User Stats pane, which *do* deviate to `inline-block`. Here `float: right` (from `.pull-right`) blockifies the box, which is why `display` computes `block`. |
| position | static |
| float | **right** *(deviation — `.pull-right`)* |
| width / height | auto / auto |
| margin T/R/B/L | 0px / 0px / 0px / 0px |
| padding T/R/B/L | **6px / 12px / 6px / 12px** |
| border-width T/R/B/L | **1px ×4** |
| border-style T/R/B/L | **solid ×4** |
| border-color T/R/B/L | **rgb(70, 184, 218) ×4** |
| radius TL/TR/BL/BR | **4px ×4** |
| background-color | **rgb(91, 192, 222)** |
| color | **rgb(255, 255, 255)** |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size / font-weight | 14px / 400 |
| line-height | 20px |
| text-align | **center** |
| white-space | **nowrap** |
| vertical-align | **middle** |
| outline-color | rgb(255, 255, 255) |
| opacity | 1 |
| cursor | **pointer** |
| user-select | **none** |
| pointer-events | auto |

### #176 `textarea#textListTxt` (27 deviations)
| prop | resolved |
|---|---|
| display | **inline-block** |
| position | static |
| float | none |
| width | **100%** (from the inline `style` attribute) |
| height | **100%** (from the inline `style` attribute) |
| margin ×4 | 0px |
| padding T/R/B/L | **2px / 2px / 2px / 2px** (UA default for `<textarea>`; no app CSS overrides it) |
| border-width ×4 | **1px** |
| border-style ×4 | **solid** |
| border-color ×4 | **rgb(118, 118, 118)** (UA default field border) |
| radius ×4 | 0px |
| background-color | **rgb(255, 255, 255)** |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size / weight / line-height | 14px / 400 / 20px |
| text-align | start |
| white-space | **pre-wrap** |
| overflow-wrap | **break-word** |
| overflow-x / overflow-y | **auto / auto** |
| opacity | 1 |
| cursor | **text** |
| resize | **both** |
| appearance | **auto** |
| pointer-events | auto |

**Finding:** the textarea has **no** `.form-control` class, so it gets *none* of Bootstrap's field
styling (no 4px radius, no `rgb(219,217,217)` border, no 34px min height). It is a raw UA textarea
stretched to `width:100%; height:100%`.

### #206 `i.fa.fa-save` (13 deviations)
| prop | resolved |
|---|---|
| display | **inline-block** |
| position | static |
| float | none |
| width / height | auto / auto |
| margin ×4 | 0px |
| padding ×4 | 0px |
| border-width ×4 | 0px |
| border-style ×4 | none |
| border-color ×4 | **rgb(255, 255, 255)** |
| radius ×4 | 0px |
| background-color | rgba(0, 0, 0, 0) |
| color | **rgb(255, 255, 255)** |
| font-family | **FontAwesome** |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal (COMMON — note FA4's `.fa` normally sets `font-style: normal`; the captured value agrees) |
| line-height | **14px** |
| text-align | **center** |
| white-space | **nowrap** |
| outline-color | rgb(255, 255, 255) |
| opacity | 1 |
| cursor | **pointer** |
| user-select | **none** |
| pointer-events | auto |

---

## 6. Verbatim text

| path | node | verbatim text |
|---|---|---|
| `r.0.1.1.0.1.3.1.1.0.0` | #175 `<button>` | `Save List` |
| `r.0.1.1.0.1.3.1.1.0.0.0` (`::before`) | #206 `<i class="fa fa-save">` | U+F0C7 (FontAwesome glyph, not a literal string) |
| `r.0.1.1.0.1.3.1.1.0.1` | #176 `<textarea id="textListTxt">` | **no `text:` line in the record → the textarea is EMPTY at capture time** |

Truncation check: no `attr` value in this slice reaches the 300-char cap and no `text:` value reaches
the 250-char cap (max attr payload here is 38 chars, max text 9 chars). **Nothing is truncated.**

The tab label itself, for completeness, lives outside the anchor:
`#92 attr heading = "Text List"` and `#132 r.0.1.1.0.1.3.0.1.0 <a> text: "Text List"`.

---

## 7. Field / control inventory

| control | path | element | label | binding | handler | captured value |
|---|---|---|---|---|---|---|
| Text list body | `…1.0.1` | `<textarea id="textListTxt" rows="40" style="width: 100%; height:100%">` | **none** — there is no `<label>` anywhere under this anchor | **none** (no `ng-model`; addressed by DOM id `textListTxt`) | n/a (read imperatively by `saveTextList()`) | **empty string** (record #176 has no `text:` line) |
| Save button | `…1.0.0` | `<button class="btn btn-info pull-right">` | inline text `Save List` + leading `<i class="fa fa-save">` | n/a | `ng-click="saveTextList()"` | n/a |

* **x-editables in this pane: zero.** No `editable-*` attribute appears under `r.0.1.1.0.1.3.1.1`.
  (For contrast, the SSO pane at `…3.1.3` does have one — see P19.) Therefore the italic literal
  `empty` placeholder does **not** occur in this pane.
* **Selects / checkboxes / radios: zero.** The only two controls are the textarea and the button.

---

## 8. Rebuild spec

### HTML (reconstructed strictly from the captured paths, attributes and text)

```html
<!-- r.0.1.1.0.1.3.1.1 — 2nd child of div.tab-content -->
<div class="tab-pane ng-scope"
     ng-repeat="tab in tabs"
     ng-class="{active: tab.active}"
     tab-content-transclude="tab">

  <!-- …1.0 -->
  <div class="form-vertical ng-scope">

    <!-- …1.0.0 -->
    <button class="btn btn-info pull-right" ng-click="saveTextList()">
      <i class="fa fa-save"></i> Save List
    </button>

    <!-- …1.0.1 -->
    <textarea id="textListTxt" style="width: 100%; height:100%" rows="40"></textarea>

  </div>
</div>
```

### CSS — resolved absolute declarations (all values below are *captured computed values*, not guesses)

```css
/* #98 — pane, hidden because it is not the active tab */
.tab-content > .tab-pane            { display: none; }        /* captured on #98 */
.tab-content > .tab-pane.active     { display: block; }        /* captured on #97 (active pane, display=block) */

/* #175 — Save List */
.btn.btn-info.pull-right {
  display: block;                       /* captured; blockified by float */
  float: right;
  padding: 6px 12px;
  border: 1px solid rgb(70, 184, 218);
  border-radius: 4px;
  background-color: rgb(91, 192, 222);
  color: rgb(255, 255, 255);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
  cursor: pointer;
  -webkit-user-select: none; user-select: none;
}

/* #206 — icon */
.btn.btn-info .fa.fa-save {
  display: inline-block;
  font-family: FontAwesome;
  font-size: 14px;
  line-height: 14px;
  color: rgb(255, 255, 255);
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  -webkit-user-select: none; user-select: none;
}
.btn.btn-info .fa.fa-save::before { content: "\f0c7"; }

/* #176 — the text list body */
#textListTxt {
  display: inline-block;
  width: 100%;            /* inline style */
  height: 100%;           /* inline style */
  padding: 2px;
  border: 1px solid rgb(118, 118, 118);
  border-radius: 0;
  background-color: rgb(255, 255, 255);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow: auto;
  cursor: text;
  resize: both;
  -webkit-appearance: auto; appearance: auto;
}
```

### Geometry — measured vs CSS-derived

| dimension | source | value |
|---|---|---|
| every node in this pane: x, y, w, h | **NOT measured** | `0,0 0×0` in the dump — the pane was never laid out |
| pane content width when active | **CSS-derived**, from the *sibling* active pane #97 | `.tab-content` inner box is `1810px` wide with `padding: 10px 20px` and `1px` L/R borders (#61), leaving **1768px** for the pane — measured on #97 (`w=1768`), so a revealed Text List pane would also be 1768px wide at this viewport |
| Save List button box | **CSS-derived** | content + `6px/12px` padding + `1px` border; no width/height is set, so it shrink-wraps `Save List` at 14px/20px |
| textarea | **CSS-derived from the inline style** | `width:100%` of the 1768px pane = 1768px; `height:100%` resolves against the pane's *auto* height, i.e. it collapses — the `rows="40"` fallback would then govern. **Not verifiable from this capture.** |

---

## 9. Honest gaps

1. **This pane was never laid out.** Every one of the 5 records reports `rect: x=0 y=0 w=0 h=0`.
   That is the direct consequence of `#98` computing `display: none` (it is not the active tab and its
   heading `<li>` is itself `ng-hide`n). **No pixel geometry for this pane exists in the capture and
   none is invented here.** Every dimension in §8 is labelled measured-vs-CSS-derived accordingly.
2. **Child-node source order relative to the button's text node is not captured.** The dump records
   `#175 text: "Save List"` and a child `<i>` at `…1.0.0.0`, but not whether the text node precedes or
   follows the `<i>`. §8 renders it icon-first because that is the arrangement used by the structurally
   identical button `#1330` in the Branding pane — **flagged as the one ordering assumption in this file.**
3. **Runtime content of the textarea is unknown beyond "empty at capture".** The record has no `text:`
   line, so it was empty when the DOM was dumped. Whether `saveTextList()`/the controller populates it
   on tab activation cannot be determined from a static DOM dump.
4. **`saveTextList()` implementation is not in the capture** — only the `ng-click` string. The wire
   format, endpoint and the meaning of the list (one phone number per line? one nick per line?) are
   not evidenced anywhere in `nodes-*.txt`.
5. **`sess.twillioApiToken` value is not in the capture.** It is only observable *indirectly*: the
   heading `<li>` carries `ng-hide`, so the expression was falsy. The actual token string never appears.
6. **Hover / focus / active states are not captured.** The dump records one computed style per node
   in its resting state; `:hover` colours for `.btn-info` and focus ring for the textarea are unknown.
