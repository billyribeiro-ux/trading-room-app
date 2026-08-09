# PTR1 · P18 — "Branding (Logo / Landing Page)" tab pane

**Evidence base:** `/tmp/ptr-decode/ptr1/caps/00-baseline-room/` — `DEFAULTS.txt` + `nodes-000.txt`…`nodes-017.txt`
(capture `baseline-room`, `kind=fullDom`, `node count 2156`, `truncated=false`, `ts 2026-07-24T15:59:18.276Z`,
`viewport {"w":1842,"h":1265,"dpr":2}`, `themeClass "footer-hidden"`, `cssVars {"root":{},"body":{}}` — `INFO.txt`).
Page: Manage Room admin page, room 3625.

**Extraction command used (breadth-first by path prefix, not by `#index`):**
```
awk -v RS='' -v ORS='\n\n' '/path=r\.0\.1\.1\.0\.1\.3\.1\.2([. ])/' nodes-*.txt
```

---

## 1. Purpose and reveal condition

This is the **3rd `tab-pane`** (`ng-repeat="tab in tabs"`, index 2) of the uib-tabset at
`r.0.1.1.0.1.3`. It does two jobs:

1. **Room logo** — a preview of the current logo on a black swatch, plus **Upload/Change** and **Reset**.
2. **Login landing page editor** — a full **textAngular** WYSIWYG bound to `sess.description`, with a
   30-item toolbar, a `contenteditable` rich-text surface, a hidden HTML source `<textarea>`, a
   pre-rendered (hidden) popover, a pre-rendered (hidden) resizer overlay, and a **Save Editor Changes**
   button wired to `htmlDescChanged()`.

**Exact reveal condition — verbatim from the evidence.** The pane element (`#99`) carries **no** `ng-if`
and **no** `ng-show`; its only visibility attributes are:

```
attr ng-repeat = "tab in tabs"
attr ng-class  = "{active: tab.active}"
```

Like User Stats and unlike Text List / SSO Setup, **the Branding tab heading is NOT gated**.
`#93 path=r.0.1.1.0.1.3.0.2`, verbatim:

```
attr ng-class = "{active: active, disabled: disabled}"
attr heading  = "Branding (Logo / Landing Page)"
attr class    = "ng-isolate-scope"
```

— no `ng-show`, no `ng-if`, no `ng-hide`, and it is **measured** at
`rect: x=86.3 y=309 w=232.625 h=42` (its `<a>` `#133` measures `x=86.3 y=309 w=230.625 h=42`,
text `Branding (Logo / Landing Page)`). So the pane's sole reveal condition is:

> **`tab.active === true`** — the admin clicks the visible "Branding (Logo / Landing Page)" tab;
> Angular adds `active` to `#99` and Bootstrap's `.tab-content > .tab-pane.active { display: block }`
> reveals it.

In this capture `#99`'s class is `"tab-pane ng-scope"` **without** `active`, so it computes
`display: none`. The active pane is index 0 ("Users", `#97`, rect 37,361 1768×393.766).

### Inner conditions

| path | attribute (verbatim) | class in capture | resolved display | what it proves |
|---|---|---|---|---|
| `…2.0.0.5.1.1` (#1332, rich-text surface) | `ng-hide = "showHtml"` | `ta-scroll-window ng-scope ta-text ta-editor form-control` (**no** `ng-hide`) | `block` | `showHtml` is **falsy** → the editor is in **Rich Text** mode |
| `…2.0.0.5.1.2` (#1333, HTML source textarea) | `ng-show = "showHtml"` | `… ta-bind ta-html ta-editor form-control ng-hide` | `none` | same conclusion, from the mirror gate |
| all 29 disabled toolbar items | `ng-disabled = "isDisabled()"` + literal `disabled="disabled"` | `btn btn-default ng-scope` | `block` (floated) at `opacity: 0.65` | textAngular disables the whole toolbar when the editor has no focus/selection |
| `…2.0.0.5.1.0.2.1` (#1715, justifyCenter) | `ng-class = "displayActiveToolClass(active)"` | `btn btn-default ng-scope **active**` | `block` | the caret's default block alignment resolves to **centre** |

---

## 2. Path anchor + record count

* Anchor: `r.0.1.1.0.1.3.1.2`
* **Records found under the anchor (inclusive): 89** —
  `#99`, `#139`, `#177`, `#207`–`#212` (6), `#470`–`#474` (5), `#1330`–`#1334` (5),
  `#1635`–`#1642` (8), `#1696`–`#1725` (30), `#1726`–`#1734` (9), `#1788`–`#1810` (23).
* All 89 read in full, line by line (2 357 lines of slice). Truncation scan run over the whole slice:
  **no `attr` value ≥ 290 chars (cap 300), no `text:` value ≥ 240 chars (cap 250) → nothing truncated.**

---

## 3. Node table (all 89 nodes)

Every rect below is literally `x=0 y=0 w=0 h=0` in the dump — see §9.

### 3a. Logo block + frame

| # | path | tag | id | classes | self `display:none`? |
|---|---|---|---|---|---|
| 99 | `…3.1.2` | `div` | — | `tab-pane` `ng-scope` | **yes** |
| 139 | `…2.0` | `fieldset` | — | `ng-scope` | no (`block`) |
| 177 | `…2.0.0` | `div` | — | `form-group` *(trailing space in attr)* | no (`block`) |
| 207 | `…2.0.0.0` | `label` | — | `col-sm-2` `control-label` *(trailing space)* | no (`block`) |
| 208 | `…2.0.0.1` | `div` | — | `col-sm-3` *(trailing space)* | no (`block`) |
| 470 | `…2.0.0.1.0` | `img` | — | `navLogo` *(trailing space)* | no (`inline`) |
| 209 | `…2.0.0.2` | `div` | — | `col-sm-4` *(trailing space)* | no (`block`) |
| 471 | `…2.0.0.2.0` | `button` | — | `btn` `btn-assertive` *(trailing space)* | no (`inline-block`) |
| 472 | `…2.0.0.2.1` | `button` | — | `btn` `btn-assertive` *(trailing space)* | no (`inline-block`) |
| 210 | `…2.0.0.3` | `br` | — | *(none)* | no (`inline`) |
| 211 | `…2.0.0.4` | `hr` | — | *(none)* | no (`block`) |
| 212 | `…2.0.0.5` | `div` | — | `col-sm-10` | no (`block`) |

### 3b. Editor header

| # | path | tag | id | classes | self `display:none`? |
|---|---|---|---|---|---|
| 473 | `…2.0.0.5.0` | `h3` | — | *(none)* | no (`block`) |
| 1330 | `…2.0.0.5.0.0` | `button` | — | `btn` `btn-info` `pull-right` | no (`block`, blockified by `float: right`) |
| 1635 | `…2.0.0.5.0.0.0` | `i` | — | `fa` `fa-save` | no (`inline-block`) |

### 3c. textAngular root, toolbar shell, editor shell

| # | path | tag | id | classes | self `display:none`? |
|---|---|---|---|---|---|
| 474 | `…2.0.0.5.1` | `div` | — | `btn-group-small` `ng-pristine` `ng-untouched` `ng-valid` `ng-isolate-scope` `ta-root` | no (`block`, **0 deviations**) |
| 1331 | `…2.0.0.5.1.0` | `div` | — | `ng-scope` `ng-isolate-scope` `ta-toolbar` `btn-toolbar` | no (`block`) |
| 1636 | `…2.0.0.5.1.0.0` | `div` | — | `btn-group` | no (`block`, floated) |
| 1637 | `…2.0.0.5.1.0.1` | `div` | — | `btn-group` | no |
| 1638 | `…2.0.0.5.1.0.2` | `div` | — | `btn-group` | no |
| 1639 | `…2.0.0.5.1.0.3` | `div` | — | `btn-group` | no |
| 1332 | `…2.0.0.5.1.1` | `div` | — | `ta-scroll-window` `ng-scope` `ta-text` `ta-editor` `form-control` | no (`block`) |
| 1333 | `…2.0.0.5.1.2` | `textarea` | **`taHtmlElement7346242129359551`** | `ng-pristine` `ng-untouched` `ng-valid` `ng-scope` `ta-bind` `ta-html` `ta-editor` `form-control` `ng-hide` | **yes** |
| 1334 | `…2.0.0.5.1.3` | `input` | — | *(no class)* | **yes** (`type="hidden"` + inline `display: none;`) |

### 3d. Toolbar items — all 30, in DOM order

| # | path | tag | id | `name` | `title` | label / icon | `disabled`? | classes |
|---|---|---|---|---|---|---|---|---|
| 1696 | `…5.1.0.0.0` | `button` | — | `h1` | `Heading 1` | text `H1` | **yes** | `btn btn-default ng-scope` |
| 1697 | `…5.1.0.0.1` | `button` | — | `h2` | `Heading 2` | text `H2` | **yes** | `btn btn-default ng-scope` |
| 1698 | `…5.1.0.0.2` | `button` | — | `h3` | `Heading 3` | text `H3` | **yes** | `btn btn-default ng-scope` |
| 1699 | `…5.1.0.0.3` | `button` | — | `h4` | `Heading 4` | text `H4` | **yes** | `btn btn-default ng-scope` |
| 1700 | `…5.1.0.0.4` | `button` | — | `h5` | `Heading 5` | text `H5` | **yes** | `btn btn-default ng-scope` |
| 1701 | `…5.1.0.0.5` | `button` | — | `h6` | `Heading 6` | text `H6` | **yes** | `btn btn-default ng-scope` |
| 1702 | `…5.1.0.0.6` | `button` | — | `p` | `Paragraph` | text `P` | **yes** | `btn btn-default ng-scope` |
| 1703 | `…5.1.0.0.7` | `button` | — | `pre` | `Preformatted text` | text `pre` | **yes** | `btn btn-default ng-scope` |
| 1704 | `…5.1.0.0.8` | `button` | — | `quote` | `Quote/unquote selection or paragraph` | icon `fa-quote-right` (#1788, U+F10E) | **yes** | `btn btn-default ng-scope` |
| 1705 | `…5.1.0.1.0` | `button` | — | `bold` | `Bold` | icon `fa-bold` (#1789, U+F032) | **yes** | `btn btn-default ng-scope` |
| 1706 | `…5.1.0.1.1` | `button` | — | `italics` | `Italic` | icon `fa-italic` (#1790, U+F033) | **yes** | `btn btn-default ng-scope` |
| 1707 | `…5.1.0.1.2` | `button` | — | `underline` | `Underline` | icon `fa-underline` (#1791, U+F0CD) | **yes** | `btn btn-default ng-scope` |
| 1708 | `…5.1.0.1.3` | `button` | — | `strikeThrough` | `Strikethrough` | icon `fa-strikethrough` (#1792, U+F0CC) | **yes** | `btn btn-default ng-scope` |
| 1709 | `…5.1.0.1.4` | `button` | — | `ul` | `Unordered List` | icon `fa-list-ul` (#1793, U+F0CA) | **yes** | `btn btn-default ng-scope` |
| 1710 | `…5.1.0.1.5` | `button` | — | `ol` | `Ordered List` | icon `fa-list-ol` (#1794, U+F0CB) | **yes** | `btn btn-default ng-scope` |
| 1711 | `…5.1.0.1.6` | `button` | — | `redo` | `Redo` | icon `fa-repeat` (#1795, U+F01E) | **yes** | `btn btn-default ng-scope` |
| 1712 | `…5.1.0.1.7` | `button` | — | `undo` | `Undo` | icon `fa-undo` (#1796, U+F0E2) | **yes** | `btn btn-default ng-scope` |
| 1713 | `…5.1.0.1.8` | `button` | — | `clear` | `Clear formatting` | icon `fa-ban` (#1797, U+F05E) | **yes** | `btn btn-default ng-scope` |
| 1714 | `…5.1.0.2.0` | `button` | — | `justifyLeft` | `Align text left` | icon `fa-align-left` (#1798, U+F036) | **yes** | `btn btn-default ng-scope` |
| **1715** | `…5.1.0.2.1` | `button` | — | `justifyCenter` | `Center` | icon `fa-align-center` (#1799, U+F037) | **yes** | `btn btn-default ng-scope` **`active`** |
| 1716 | `…5.1.0.2.2` | `button` | — | `justifyRight` | `Align text right` | icon `fa-align-right` (#1800, U+F038) | **yes** | `btn btn-default ng-scope` |
| 1717 | `…5.1.0.2.3` | `button` | — | `justifyFull` | `Justify text` | icon `fa-align-justify` (#1801, U+F039) | **yes** | `btn btn-default ng-scope` |
| 1718 | `…5.1.0.2.4` | `button` | — | `indent` | `Increase indent` | icon `fa-indent` (#1802, U+F03C) | **yes** | `btn btn-default ng-scope` |
| 1719 | `…5.1.0.2.5` | `button` | — | `outdent` | `Decrease indent` | icon `fa-outdent` (#1803, U+F03B) | **yes** | `btn btn-default ng-scope` |
| **1720** | `…5.1.0.3.0` | `button` | — | `html` | `Toggle html / Rich Text` | icon `fa-code` (#1804, U+F121) | **NO — the only enabled item** | `btn btn-default ng-scope` |
| 1721 | `…5.1.0.3.1` | `button` | — | `insertImage` | `Insert image` | icon `fa-picture-o` (#1805, U+F03E) | **yes** | `btn btn-default ng-scope` |
| 1722 | `…5.1.0.3.2` | `button` | — | `insertLink` | `Insert / edit link` | icon `fa-link` (#1806, U+F0C1) | **yes** | `btn btn-default ng-scope` |
| 1723 | `…5.1.0.3.3` | `button` | — | `insertVideo` | `Insert video` | icon `fa-youtube-play` (#1807, U+F16A) | **yes** | `btn btn-default ng-scope` |
| 1724 | `…5.1.0.3.4` | **`div`** | **`toolbarWC`** | `wordcount` | *(no `title`)* | text `Words:` + `<span ng-bind="wordcount">0</span>` (#1808) | **yes** | `btn btn-default ng-scope` |
| 1725 | `…5.1.0.3.5` | **`div`** | **`toolbarCC`** | `charcount` | *(no `title`)* | text `Characters:` + `<span ng-bind="charcount">0</span>` (#1809) | **yes** | `btn btn-default ng-scope` |

**Counts, verified against the records — not assumed:**
* 4 `.btn-group`s: sizes **9 / 9 / 6 / 6 = 30 items**.
* **28** are `<button>`; **2** (`#toolbarWC`, `#toolbarCC`) are `<div>` wearing `class="btn btn-default"`.
* **29** carry the literal attribute `disabled="disabled"`; **only `name="html"` (#1720) does not.**
* **1** carries `active` in its class list: `name="justifyCenter"` (#1715).
* **28** carry a `title`; the two counter `<div>`s do not.
* 20 items render a FontAwesome `<i>`; 8 render literal text (`H1`…`H6`, `P`, `pre`); 2 render text + a bound `<span>`.

### 3e. Popover, resizer overlay, contenteditable

| # | path | tag | id | classes | self `display:none`? |
|---|---|---|---|---|---|
| 1640 | `…5.1.1.0` | `div` | — | `popover` `fade` `bottom` | **yes** (also `opacity: 0`) |
| 1726 | `…5.1.1.0.0` | `div` | — | `arrow` | no |
| 1727 | `…5.1.1.0.1` | `div` | — | `popover-content` | no |
| 1641 | `…5.1.1.1` | `div` | — | `ta-resizer-handle-overlay` | **yes** |
| 1728 | `…5.1.1.1.0` | `div` | — | `ta-resizer-handle-background` | no |
| 1729 | `…5.1.1.1.1` | `div` | — | `ta-resizer-handle-corner` `ta-resizer-handle-corner-tl` | no |
| 1730 | `…5.1.1.1.2` | `div` | — | `ta-resizer-handle-corner` `ta-resizer-handle-corner-tr` | no |
| 1731 | `…5.1.1.1.3` | `div` | — | `ta-resizer-handle-corner` `ta-resizer-handle-corner-bl` | no |
| 1732 | `…5.1.1.1.4` | `div` | — | `ta-resizer-handle-corner` `ta-resizer-handle-corner-br` | no |
| 1733 | `…5.1.1.1.5` | `div` | — | `ta-resizer-handle-info` | no |
| **1642** | `…5.1.1.2` | `div` | **`taTextElement7346242129359551`** | `ng-pristine` `ng-untouched` `ng-valid` `ta-bind` | no (`block`) |
| 1734 | `…5.1.1.2.0` | `p` | — | *(none)* | no (`block`) |
| 1810 | `…5.1.1.2.0.0` | `br` | — | *(none)* | no (`inline`) |

### Tree shape

```
#99   div.tab-pane.ng-scope                                     r.0.1.1.0.1.3.1.2
└── #139  fieldset.ng-scope                                     …2.0
    └── #177  div.form-group                                    …2.0.0
        ├── #207  label.col-sm-2.control-label   "Logo"         …2.0.0.0
        ├── #208  div.col-sm-3  [bg #000, pad 15px]             …2.0.0.1
        │   └── #470  img.navLogo  /public/images/ptr_logo.png  …2.0.0.1.0
        ├── #209  div.col-sm-4                                  …2.0.0.2
        │   ├── #471  button.btn.btn-assertive  "Upload/Change" …2.0.0.2.0
        │   └── #472  button.btn.btn-assertive  "Reset"         …2.0.0.2.1
        ├── #210  br                                            …2.0.0.3
        ├── #211  hr                                            …2.0.0.4
        └── #212  div.col-sm-10                                 …2.0.0.5
            ├── #473  h3  "Login Landing Page Editor"           …2.0.0.5.0
            │   └── #1330 button.btn.btn-info.pull-right  "Save Editor Changes"   …5.0.0
            │       └── #1635 i.fa.fa-save                                        …5.0.0.0
            └── #474  div[text-angular].ta-root                 …2.0.0.5.1
                ├── #1331 div[text-angular-toolbar].ta-toolbar.btn-toolbar        …5.1.0
                │   ├── #1636 div.btn-group  (9)  h1 h2 h3 h4 h5 h6 p pre quote   …5.1.0.0
                │   ├── #1637 div.btn-group  (9)  bold italics underline strikeThrough ul ol redo undo clear   …5.1.0.1
                │   ├── #1638 div.btn-group  (6)  justifyLeft justifyCenter* justifyRight justifyFull indent outdent   …5.1.0.2
                │   └── #1639 div.btn-group  (6)  html† insertImage insertLink insertVideo #toolbarWC #toolbarCC     …5.1.0.3
                ├── #1332 div.ta-scroll-window.ta-text.ta-editor.form-control     …5.1.1
                │   ├── #1640 div.popover.fade.bottom  [w 305px, z 1060]          …5.1.1.0
                │   │   ├── #1726 div.arrow                                       …5.1.1.0.0
                │   │   └── #1727 div.popover-content                             …5.1.1.0.1
                │   ├── #1641 div.ta-resizer-handle-overlay                       …5.1.1.1
                │   │   ├── #1728 .ta-resizer-handle-background                   …5.1.1.1.0
                │   │   ├── #1729 .ta-resizer-handle-corner-tl                    …5.1.1.1.1
                │   │   ├── #1730 .ta-resizer-handle-corner-tr                    …5.1.1.1.2
                │   │   ├── #1731 .ta-resizer-handle-corner-bl                    …5.1.1.1.3
                │   │   ├── #1732 .ta-resizer-handle-corner-br                    …5.1.1.1.4
                │   │   └── #1733 .ta-resizer-handle-info                         …5.1.1.1.5
                │   └── #1642 div#taTextElement7346242129359551 [contenteditable] …5.1.1.2
                │       └── #1734 p                                               …5.1.1.2.0
                │           └── #1810 br                                          …5.1.1.2.0.0
                ├── #1333 textarea#taHtmlElement7346242129359551 (hidden)         …5.1.2
                └── #1334 input[type=hidden][name="wysiswyg-editor"]              …5.1.3

*  = carries class `active`     † = the ONLY item without disabled="disabled"
```

---

## 4. Every attribute, verbatim

> Trailing spaces inside attribute values are reproduced exactly — this template is full of them.

```
#99   …3.1.2         class="tab-pane ng-scope"  ng-repeat="tab in tabs"  ng-class="{active: tab.active}"  tab-content-transclude="tab"
#139  …2.0           class="ng-scope"
#177  …2.0.0         class="form-group "                                        ← trailing space
#207  …2.0.0.0       class="col-sm-2 control-label "                            ← trailing space
#208  …2.0.0.1       class="col-sm-3 "   style="background-color: #000; padding: 15px; "
#470  …2.0.0.1.0     ng-src="/public/images/ptr_logo.png"   class="navLogo "   src="/public/images/ptr_logo.png"
#209  …2.0.0.2       class="col-sm-4 "
#471  …2.0.0.2.0     class="btn btn-assertive "   ng-click="openFileChooser( 'logos') "    ← spaces inside the expression
#472  …2.0.0.2.1     class="btn btn-assertive "   ng-click="resetLogo() "
#210  …2.0.0.3       (none)
#211  …2.0.0.4       (none)
#212  …2.0.0.5       class="col-sm-10"
#473  …2.0.0.5.0     style="text-align: center; margin-bottom: 20px;"
#1330 …2.0.0.5.0.0   class="btn btn-info pull-right"   ng-click="htmlDescChanged() "
#1635 …2.0.0.5.0.0.0 class="fa fa-save"
#474  …2.0.0.5.1     text-angular=""   ng-model="sess.description"   name="wysiswyg-editor"
                     class="btn-group-small ng-pristine ng-untouched ng-valid ng-isolate-scope ta-root"
#1331 …5.1.0         text-angular-toolbar=""   name="textAngularToolbar7346242129359551"
                     class="ng-scope ng-isolate-scope ta-toolbar btn-toolbar"
#1636 …5.1.0.0       class="btn-group"
#1637 …5.1.0.1       class="btn-group"
#1638 …5.1.0.2       class="btn-group"
#1639 …5.1.0.3       class="btn-group"
#1332 …5.1.1         class="ta-scroll-window ng-scope ta-text ta-editor form-control"   ng-hide="showHtml"
#1640 …5.1.1.0       class="popover fade bottom"   style="max-width: none; width: 305px;"
#1726 …5.1.1.0.0     class="arrow"
#1727 …5.1.1.0.1     class="popover-content"
#1641 …5.1.1.1       class="ta-resizer-handle-overlay"
#1728 …5.1.1.1.0     class="ta-resizer-handle-background"
#1729 …5.1.1.1.1     class="ta-resizer-handle-corner ta-resizer-handle-corner-tl"
#1730 …5.1.1.1.2     class="ta-resizer-handle-corner ta-resizer-handle-corner-tr"
#1731 …5.1.1.1.3     class="ta-resizer-handle-corner ta-resizer-handle-corner-bl"
#1732 …5.1.1.1.4     class="ta-resizer-handle-corner ta-resizer-handle-corner-br"
#1733 …5.1.1.1.5     class="ta-resizer-handle-info"
#1642 …5.1.1.2       id="taTextElement7346242129359551"  contenteditable="true"  ta-bind="ta-bind"  ng-model="html"
                     class="ng-pristine ng-untouched ng-valid ta-bind"
#1734 …5.1.1.2.0     (none)
#1810 …5.1.1.2.0.0   (none)
#1333 …5.1.2         id="taHtmlElement7346242129359551"  ng-show="showHtml"  ta-bind="ta-bind"  ng-model="html"
                     class="ng-pristine ng-untouched ng-valid ng-scope ta-bind ta-html ta-editor form-control ng-hide"
#1334 …5.1.3         type="hidden"  tabindex="-1"  style="display: none;"  name="wysiswyg-editor"  value=""
```

### Toolbar items — every attribute (the 28 `<button>`s share an identical attribute *shape*)

```
type        = "button"
class       = "btn btn-default ng-scope"           (#1715 additionally: " active")
name        = <see the table in §3d>
ta-button   = "ta-button"
ng-disabled = "isDisabled()"
tabindex    = "-1"
ng-click    = "executeAction()"
ng-class    = "displayActiveToolClass(active)"
title       = <see the table in §3d>
unselectable= "on"
disabled    = "disabled"                            (present on 29 of 30; ABSENT on #1720 name="html")
```

The two counter `<div>`s deviate from that shape as follows (verbatim):
```
#1724  id="toolbarWC"  style="display:block; min-width:100px;"   class="btn btn-default ng-scope"
       name="wordcount"  ta-button="ta-button"  ng-disabled="isDisabled()"  tabindex="-1"
       ng-click="executeAction()"  ng-class="displayActiveToolClass(active)"  unselectable="on"  disabled="disabled"
       (NO type, NO title)

#1725  id="toolbarCC"  style="display:block; min-width:120px;"   class="btn btn-default ng-scope"
       name="charcount"  ta-button="ta-button"  ng-disabled="isDisabled()"  tabindex="-1"
       ng-click="executeAction()"  ng-class="displayActiveToolClass(active)"  unselectable="on"  disabled="disabled"
       (NO type, NO title)
```

The 20 toolbar icons are all `<i class="fa fa-…">` with **no other attribute** (no `aria-hidden`,
unlike the User Stats icons). The two counter spans:
```
#1808  …5.1.0.3.4.0   ng-bind="wordcount"   class="ng-binding"
#1809  …5.1.0.3.5.0   ng-bind="charcount"   class="ng-binding"
```

### Pseudo-elements captured under this anchor

```
#1331 (.ta-toolbar.btn-toolbar)
  ::before {"content":"\" \"","color":"rgb(51, 51, 51)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}
  ::after  {…identical…}

#1635 (i.fa.fa-save, inside the white Save button)
  ::before {"content":"\"\"","color":"rgb(255, 255, 255)","font-family":"FontAwesome","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}   glyph U+F0C7

#1788…#1807 (the 20 toolbar icons)
  ::before {"content":"\"<glyph>\"","color":"rgb(51, 51, 51)","font-family":"FontAwesome","font-size":"11px","background-color":"rgba(0, 0, 0, 0)"}

  fa-quote-right U+F10E · fa-bold U+F032 · fa-italic U+F033 · fa-underline U+F0CD ·
  fa-strikethrough U+F0CC · fa-list-ul U+F0CA · fa-list-ol U+F0CB · fa-repeat U+F01E ·
  fa-undo U+F0E2 · fa-ban U+F05E · fa-align-left U+F036 · fa-align-center U+F037 ·
  fa-align-right U+F038 · fa-align-justify U+F039 · fa-indent U+F03C · fa-outdent U+F03B ·
  fa-code U+F121 · fa-picture-o U+F03E · fa-link U+F0C1 · fa-youtube-play U+F16A

#1726 (.arrow)
  ::after  {"content":"\" \"","color":"rgb(85, 85, 85)","font-family":"\"Helvetica Neue\", Helvetica, Arial, sans-serif","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}
```
(Codepoints obtained by byte-decoding the UTF-8 in the dump, not from memory.)

---

## 5. Resolved computed style — absolute values

COMMON baseline from `DEFAULTS.txt` (applies wherever a property is not listed as a deviation):
`display:block · visibility:visible · position:static · top/right/bottom/left:auto · z-index:auto ·
float:none · box-sizing:border-box · width:auto · height:auto · min-width:0px · max-width:none ·
min-height:0px · max-height:none · margin 0px ×4 · padding 0px ×4 · border-width 0px ×4 ·
border-style none ×4 · border-color rgb(51,51,51) ×4 · radius 0px ×4 · background-color rgba(0,0,0,0) ·
color rgb(51,51,51) · font-family "Helvetica Neue", Helvetica, Arial, sans-serif · font-size 14px ·
font-weight 400 · font-style normal · line-height 20px · text-align start · white-space normal ·
vertical-align baseline · overflow visible · opacity 1 · box-shadow none · outline-color rgb(51,51,51) ·
cursor auto · pointer-events auto · user-select auto`.

| node | resolved absolute style (deviations in **bold**) |
|---|---|
| **#99** `div.tab-pane` | display **none** |
| **#139** `fieldset.ng-scope` | display block · margin-bottom **20px** · padding-bottom **20px** · **no border at all** (contrast the User Stats fieldset #141, which has a `1px dashed rgb(238,238,238)` bottom rule) |
| **#177** `div.form-group ` | **0 deviations** → display block, margin 0px ×4, padding 0, no border |
| **#207** `label.col-sm-2.control-label ` | display block · position **relative** · float **left** · width **16.6667%** · max-width **100%** · min-height **1px** · margin-bottom **5px** · padding-right **15px** · padding-left **15px** · font-weight **700** · cursor **default** · text-align start · color rgb(51,51,51) |
| **#208** `div.col-sm-3 ` | display block · position **relative** · float **left** · width **25%** · min-height **1px** · padding **15px / 15px / 15px / 15px** (inline style; overrides the grid's `0 15px`) · background-color **rgb(0, 0, 0)** |
| **#470** `img.navLogo ` | display **inline** · height **25px** · max-width **300px** · max-height **25px** · width auto · vertical-align **middle** · overflow-x **clip** · overflow-y **clip** |
| **#209** `div.col-sm-4 ` | display block · position **relative** · float **left** · width **33.3333%** · min-height **1px** · padding-right **15px** · padding-left **15px** |
| **#471 / #472** `button.btn.btn-assertive ` (identical 27-deviation sets) | display **inline-block** · padding **6px / 12px / 6px / 12px** · border-width **1px ×4** · border-style **solid ×4** · border-color **rgba(0, 0, 0, 0) ×4** · radius **4px ×4** · background-color **rgb(239, 239, 239)** · color rgb(51,51,51) · font 400 14px/20px · text-align **center** · white-space **nowrap** · vertical-align **middle** · cursor **pointer** · user-select **none** |
| **#210** `br` | display **inline** |
| **#211** `hr` | box-sizing **content-box** · display block · height **0px** · margin **20px / auto / 20px / auto** · border-top-width **1px** · border-top-style **solid** · border-top-color **rgb(238, 238, 238)** · border R/B/L width 0px, style none, colour **rgb(128, 128, 128)** · color **rgb(128, 128, 128)** · overflow-x **hidden** · overflow-y **hidden** |
| **#212** `div.col-sm-10` | display block · position **relative** · float **left** · width **83.3333%** · min-height **1px** · padding-right **15px** · padding-left **15px** |
| **#473** `h3` | display block · margin-top **20px** · margin-bottom **20px** (inline style) · font-size **24px** · font-weight **500** · line-height **26.4px** · text-align **center** (inline style) |
| **#1330** `button.btn.btn-info.pull-right` | display block (COMMON — blockified by the float) · float **right** · padding **6px / 12px / 6px / 12px** · border **1px solid rgb(70, 184, 218) ×4** · radius **4px ×4** · background-color **rgb(91, 192, 222)** · color **rgb(255, 255, 255)** · text-align **center** · white-space **nowrap** · vertical-align **middle** · outline-color **rgb(255,255,255)** · cursor **pointer** · user-select **none** |
| **#1635** `i.fa.fa-save` | display **inline-block** · border-color **rgb(255,255,255) ×4** · color **rgb(255, 255, 255)** · font-family **FontAwesome** · font-size 14px · line-height **14px** · text-align **center** · white-space **nowrap** · outline-color **rgb(255,255,255)** · cursor **pointer** · user-select **none** |
| **#474** `div.ta-root` | **0 deviations** → display block, everything COMMON. `.btn-group-small` contributes nothing at this level |
| **#1331** `div.ta-toolbar.btn-toolbar` | display block · margin-left **-5px** · `::before`/`::after` `content: " "`, colour rgb(51,51,51), font 14px |
| **#1636 / #1637 / #1638 / #1639** `div.btn-group` | display block (COMMON, floated) · position **relative** · float **left** · margin-left **5px** · vertical-align **middle** |
| **toolbar item — DISABLED, plain middle of group** (20 of them: #1697–#1703, #1706–#1712, #1716–#1718, #1721–#1723; the other two middles, #1715 and #1724, are listed separately below because they add one property each) | display block (COMMON, blockified by the float) · position **relative** · float **left** · margin-bottom **5px** · margin-left **-1px** · padding **10px / 10px / 10px / 10px** · border-width **1px ×4** · border-style **solid ×4** · border-color **rgb(230, 233, 238) ×4** · radius **0px ×4** · background-color **rgb(255, 255, 255)** · color rgb(51, 51, 51) · font-family "Helvetica Neue", Helvetica, Arial, sans-serif · font-size **11px** · font-weight 400 · line-height **15.7143px** · text-align **center** · white-space **nowrap** · vertical-align **middle** · **opacity 0.65** · box-shadow **rgb(0, 0, 0) 0px 0px 0px 0px** · **cursor not-allowed** · user-select **none** |
| **toolbar item — DISABLED, FIRST in group** (#1696 `h1`, #1705 `bold`, #1714 `justifyLeft`) | as above but **margin-left 0px** and **border-top-left-radius 4px**, **border-bottom-left-radius 4px** |
| **toolbar item — DISABLED, LAST in group** (#1704 `quote`, #1713 `clear`, #1719 `outdent`, #1725 `charcount`) | as above but **border-top-right-radius 4px**, **border-bottom-right-radius 4px** |
| **#1715** `justifyCenter` **`.active`** | as the disabled-middle set, **plus z-index 2**, **background-color rgb(230, 230, 230)** (instead of white). Radii all 0px. Note: **no** inset box-shadow — the captured value is the disabled reset `rgb(0, 0, 0) 0px 0px 0px 0px` |
| **#1720** `html` — **the only enabled item** | position **relative** · float **left** · margin-bottom **5px** · margin-left **0px** · padding **10px ×4** · border **1px solid rgb(230, 233, 238) ×4** · border-top-left-radius **4px** · border-bottom-left-radius **4px** · background-color **rgb(255, 255, 255)** · color rgb(51,51,51) · font-size **11px** · line-height **15.7143px** · text-align **center** · white-space **nowrap** · vertical-align **middle** · **opacity 1** (COMMON — no deviation) · **box-shadow none** (COMMON) · **cursor pointer** · user-select **none** |
| **#1724** `div#toolbarWC` | disabled-middle set **plus min-width 100px** |
| **#1725** `div#toolbarCC` | disabled-middle set **plus min-width 120px** and the last-in-group right radii |
| **the 20 toolbar `<i class="fa …">`** (#1788–#1807) | display **inline-block** · font-family **FontAwesome** · font-size **11px** · line-height **11px** · text-align **center** · white-space **nowrap** · color rgb(51, 51, 51) (COMMON) · **cursor not-allowed** — except **#1804 `fa-code`, which is `cursor: pointer`** (it lives in the one enabled button) · user-select **none** |
| **#1808 / #1809** `span.ng-binding` | display **inline** · font-size **11px** · line-height **15.7143px** · text-align **center** · white-space **nowrap** · cursor **not-allowed** · user-select **none** |
| **#1332** `div.ta-scroll-window.ta-text.ta-editor.form-control` | display block · position **relative** · width **100%** · **min-height 300px** · border **1px solid rgb(219, 217, 217) ×4** · radius **4px ×4** · background-color **rgb(255, 255, 255)** · color **rgb(85, 85, 85)** · overflow-x **auto** · overflow-y **auto** · box-shadow **rgb(0, 0, 0) 0px 0px 0px 0px** · outline-color **rgb(85,85,85)** · transition-property **border-color, box-shadow** · transition-duration **0.15s, 0.15s** |
| **#1640** `div.popover.fade.bottom` | display **none** · position **absolute** · top **0px** · left **0px** · **z-index 1060** · **width 305px** · max-width **none** (inline style; also the COMMON value) · margin-top **10px** · padding **1px ×4** · border-width **T 1px / R 1px / B 2px / L 1px** · border-style **solid ×4** · border-color **T rgb(238,238,238) / R rgb(238,238,238) / B rgb(230, 233, 238) / L rgb(238,238,238)** · radius **2px ×4** · background-color **rgb(255, 255, 255)** · background-clip **padding-box** · color **rgb(85, 85, 85)** · text-align **left** · **opacity 0** · box-shadow **rgb(0, 0, 0) 0px 0px 0px 0px** · outline-color **rgb(85,85,85)** · transition-property **opacity** · transition-duration **0.15s** |
| **#1726** `div.arrow` | display block · position **absolute** · top **-11px** · left **50%** · width **0px** · height **0px** · margin-left **-11px** · border-width **T 0px / R 11px / B 11px / L 11px** · border-style **solid ×4** · border-color **T rgba(0,0,0,0) / R rgba(0,0,0,0) / B rgba(0, 0, 0, 0.25) / L rgba(0,0,0,0)** · color rgb(85,85,85) · text-align **left** · `::after` `content: " "` |
| **#1727** `div.popover-content` | display block · padding **9px / 14px / 9px / 14px** · border-color rgb(85,85,85) ×4 · color **rgb(85, 85, 85)** · text-align **left** |
| **#1641** `div.ta-resizer-handle-overlay` | display **none** · position **absolute** · **z-index 100** · border-color rgb(85,85,85) ×4 · color rgb(85,85,85) |
| **#1728** `.ta-resizer-handle-background` | display block · position **absolute** · top **5px** · right **5px** · bottom **5px** · left **5px** · border **1px solid rgb(0, 0, 0) ×4** · background-color **rgba(0, 0, 0, 0.2)** · color rgb(85,85,85) |
| **#1729** `-corner-tl` | position **absolute** · top **0px** · left **0px** · width **10px** · height **10px** · border-top **1px solid rgb(0,0,0)** · border-left **1px solid rgb(0,0,0)** · border R/B width 0px, style none, colour rgb(85,85,85) |
| **#1730** `-corner-tr` | position **absolute** · top **0px** · right **0px** · width **10px** · height **10px** · border-top **1px solid rgb(0,0,0)** · border-right **1px solid rgb(0,0,0)** |
| **#1731** `-corner-bl` | position **absolute** · bottom **0px** · left **0px** · width **10px** · height **10px** · border-bottom **1px solid rgb(0,0,0)** · border-left **1px solid rgb(0,0,0)** |
| **#1732** `-corner-br` | position **absolute** · right **0px** · bottom **0px** · width **10px** · height **10px** · border **1px solid rgb(0,0,0) ×4** · background-color **rgb(255, 255, 255)** · **cursor se-resize** |
| **#1733** `.ta-resizer-handle-info` | position **absolute** · right **16px** · bottom **16px** · padding-right **4px** · padding-left **4px** · border **1px solid rgb(0,0,0) ×4** · background-color **rgb(255, 255, 255)** · color rgb(85,85,85) · **opacity 0.7** |
| **#1642** `div#taTextElement…` `[contenteditable]` | display block · **min-height 300px** · padding **6px / 12px / 6px / 12px** · border-color rgb(85, 85, 85) ×4 (width 0) · color **rgb(85, 85, 85)** · font 400 14px/20px · overflow-wrap **break-word** · outline-style **none** · outline-color rgb(85,85,85) · cursor auto |
| **#1734** `p` | display block · margin-bottom **10px** · colour **rgb(85, 85, 85)** · overflow-wrap **break-word** |
| **#1810** `br` | display **inline** · colour rgb(85,85,85) · overflow-wrap break-word |
| **#1333** `textarea#taHtmlElement…` | display **none** · width **100%** · **min-height 300px** · padding **6px / 18px / 6px / 18px** · border **1px solid rgb(219, 217, 217) ×4** · radius **4px ×4** · background-color **rgb(255, 255, 255)** · color **rgb(85, 85, 85)** · white-space **pre-wrap** · overflow-wrap **break-word** · overflow-x **auto** · overflow-y **auto** · box-shadow **rgb(0,0,0) 0px 0px 0px 0px** · outline-color rgb(85,85,85) · cursor **text** · transition-property **border-color, box-shadow** · transition-duration **0.15s, 0.15s** · resize **both** · appearance **auto** |
| **#1334** `input[type=hidden]` | display **none** · overflow-x **clip** · overflow-y **clip** · cursor **default** |

### Verified orientation claims (checked against the records, not assumed)

* **`.btn-assertive` is a dead class.** `#471`/`#472` resolve `background-color: rgb(239, 239, 239)`
  (the UA `buttonface` grey) and `color: rgb(51, 51, 51)` and `border-color: rgba(0,0,0,0)` — i.e.
  exactly stock `.btn` with no theme colour applied. Same species of finding as `.muted`.
* **`.btn-group-small` on the ta-root contributes nothing at that element** (#474 lists **0**
  deviations); its effect shows up on the descendants as `font-size: 11px` / `line-height: 15.7143px`
  / `padding: 10px` on the toolbar buttons.
* **No CSS custom properties, no flexbox, no grid.** `INFO.txt` gives `cssVars {"root":{},"body":{}}`;
  `DEFAULTS.txt` reports 2156/2156 nodes at the common value for `flex`, `flex-direction`,
  `align-items`, `justify-content`, `gap`, `grid-template-columns` — **no node in the capture deviates**.
  This pane is float + Bootstrap-3 grid throughout.

---

## 6. Verbatim text (every string, with its path)

| path | node | verbatim text |
|---|---|---|
| `…2.0.0.0` | #207 `label` | `Logo` |
| `…2.0.0.2.0` | #471 `button` | `Upload/Change` |
| `…2.0.0.2.1` | #472 `button` | `Reset` |
| `…2.0.0.5.0` | #473 `h3` | `Login Landing Page Editor` |
| `…2.0.0.5.0.0` | #1330 `button` | `Save Editor Changes` |
| `…5.1.0.0.0` | #1696 `button[name=h1]` | `H1` |
| `…5.1.0.0.1` | #1697 `button[name=h2]` | `H2` |
| `…5.1.0.0.2` | #1698 `button[name=h3]` | `H3` |
| `…5.1.0.0.3` | #1699 `button[name=h4]` | `H4` |
| `…5.1.0.0.4` | #1700 `button[name=h5]` | `H5` |
| `…5.1.0.0.5` | #1701 `button[name=h6]` | `H6` |
| `…5.1.0.0.6` | #1702 `button[name=p]` | `P` |
| `…5.1.0.0.7` | #1703 `button[name=pre]` | `pre` (lower-case, verbatim) |
| `…5.1.0.3.4` | #1724 `div#toolbarWC` | `Words:` |
| `…5.1.0.3.4.0` | #1808 `span[ng-bind=wordcount]` | `0` |
| `…5.1.0.3.5` | #1725 `div#toolbarCC` | `Characters:` |
| `…5.1.0.3.5.0` | #1809 `span[ng-bind=charcount]` | `0` |
| `…5.1.1.2` | #1642 `div[contenteditable]` | *(no `text:` line — no text content; but see §9 item 2: it holds `<p><br></p>`)* |
| `…5.1.1.2.0` | #1734 `p` | *(no `text:` line — empty)* |
| `…5.1.2` | #1333 `textarea` | *(no `text:` line — empty)* |
| `…5.1.1.0.1` | #1727 `div.popover-content` | *(no `text:` line — empty)* |

Every remaining node under this anchor has **no** `text:` line. Every `title` string is listed in §3d.

**Truncation:** none. Verified programmatically over the whole 2 357-line slice — the longest `attr`
value is `class="btn-group-small ng-pristine ng-untouched ng-valid ng-isolate-scope ta-root"` (75 chars,
cap 300); the longest `title` is `Quote/unquote selection or paragraph` (36 chars); the longest `text:`
is `Login Landing Page Editor` (25 chars, cap 250).

**Honest-data reading:** `sess.description` is **empty**. Evidence, four independent ways:
`<input type="hidden" name="wysiswyg-editor" value="">` (#1334, `value=""`);
`<textarea id="taHtmlElement…">` has no text (#1333); the contenteditable holds only `<p><br></p>`
(#1642 → #1734 → #1810); and both counters read `0` (#1808 `wordcount`, #1809 `charcount`).
No landing-page copy is invented here.

---

## 7. Field / control inventory

### Logo controls

| control | path | element | label | binding | handler (verbatim) | current value |
|---|---|---|---|---|---|---|
| Logo preview | `…2.0.0.1.0` | `<img class="navLogo ">` | `Logo` (#207, no `for`) | **`ng-src="/public/images/ptr_logo.png"`** — a *static* string, not an interpolation | — | resolved `src="/public/images/ptr_logo.png"`; rendered at height **25px**, max-width 300px, on a `rgb(0,0,0)` swatch with 15px padding |
| Upload/Change | `…2.0.0.2.0` | `<button class="btn btn-assertive ">` | inline text `Upload/Change` | — | `ng-click="openFileChooser( 'logos') "` | — |
| Reset | `…2.0.0.2.1` | `<button class="btn btn-assertive ">` | inline text `Reset` | — | `ng-click="resetLogo() "` | — |

**Finding:** `ng-src` is set to a literal path with **no `{{ }}`**, so the logo preview shows the
*default product logo*, not a room-specific upload. `ptr_logo.png` is the same asset family as the
page's own nav logo. There is no room-logo field bound anywhere under this anchor.

### Landing-page editor

| control | path | element | binds | handler | current value |
|---|---|---|---|---|---|
| **textAngular root** | `…2.0.0.5.1` | `<div text-angular name="wysiswyg-editor">` | **`ng-model="sess.description"`** | — | **empty** (see §6) · form state `ng-pristine ng-untouched ng-valid` |
| Rich-text surface | `…5.1.1.2` | `<div id="taTextElement7346242129359551" contenteditable="true" ta-bind="ta-bind">` | `ng-model="html"` (textAngular's internal scope model) | — | `<p><br></p>` — visually empty |
| HTML source | `…5.1.2` | `<textarea id="taHtmlElement7346242129359551" ta-bind="ta-bind">` | `ng-model="html"` | — | empty; hidden (`showHtml` falsy) |
| Form-submit shadow field | `…5.1.3` | `<input type="hidden" name="wysiswyg-editor" tabindex="-1" value="">` | — | — | `value=""` |
| **Save Editor Changes** | `…2.0.0.5.0.0` | `<button class="btn btn-info pull-right">` | — | **`ng-click="htmlDescChanged() "`** | — |
| Word counter | `…5.1.0.3.4` (+ `.0`) | `<div id="toolbarWC" name="wordcount">` + `<span ng-bind="wordcount">` | `wordcount` | `executeAction()` | **`0`** |
| Char counter | `…5.1.0.3.5` (+ `.0`) | `<div id="toolbarCC" name="charcount">` + `<span ng-bind="charcount">` | `charcount` | `executeAction()` | **`0`** |
| 28 toolbar buttons | `…5.1.0.{0..3}.*` | `<button ta-button ng-click="executeAction()" ng-disabled="isDisabled()" tabindex="-1" unselectable="on">` | per-button `name` (see §3d) | `executeAction()` | 29 of 30 items disabled; `justifyCenter` `.active` |

* **x-editables in this pane: zero.** No `editable-*` attribute appears under `r.0.1.1.0.1.3.1.2`, so
  the literal italic `empty` placeholder does **not** occur here.
* **Selects / checkboxes / radios / file inputs: zero.** (The Upload/Change button opens a chooser
  through `openFileChooser('logos')`; there is no `<input type="file">` in this subtree.)
* **`name="wysiswyg-editor"` is the app's own misspelling** ("wysiswyg", not "wysiwyg") — it appears
  twice, on the ta-root (#474) and on the hidden input (#1334), verbatim in both.
* **`textAngularToolbar7346242129359551`, `taTextElement7346242129359551`,
  `taHtmlElement7346242129359551`** all share the instance suffix `7346242129359551` — a textAngular
  per-instance random id. A rebuild must generate its own; the literal is capture-specific.

---

## 8. Rebuild spec

### HTML (reconstructed strictly from the captured paths, attributes and text)

```html
<!-- r.0.1.1.0.1.3.1.2 — 3rd child of div.tab-content -->
<div class="tab-pane ng-scope" ng-repeat="tab in tabs"
     ng-class="{active: tab.active}" tab-content-transclude="tab">

 <fieldset class="ng-scope">                                          <!-- …2.0 -->
  <div class="form-group ">                                           <!-- …2.0.0 -->

    <label class="col-sm-2 control-label ">Logo</label>               <!-- …2.0.0.0 -->

    <div class="col-sm-3 " style="background-color: #000; padding: 15px; ">
      <img ng-src="/public/images/ptr_logo.png" class="navLogo "
           src="/public/images/ptr_logo.png">
    </div>

    <div class="col-sm-4 ">
      <button class="btn btn-assertive " ng-click="openFileChooser( 'logos') ">Upload/Change</button>
      <button class="btn btn-assertive " ng-click="resetLogo() ">Reset</button>
    </div>

    <br>
    <hr>

    <div class="col-sm-10">                                           <!-- …2.0.0.5 -->

      <h3 style="text-align: center; margin-bottom: 20px;">
        Login Landing Page Editor
        <button class="btn btn-info pull-right" ng-click="htmlDescChanged() ">
          <i class="fa fa-save"></i> Save Editor Changes
        </button>
      </h3>

      <div text-angular="" ng-model="sess.description" name="wysiswyg-editor"
           class="btn-group-small ng-pristine ng-untouched ng-valid ng-isolate-scope ta-root">

        <div text-angular-toolbar="" name="textAngularToolbar7346242129359551"
             class="ng-scope ng-isolate-scope ta-toolbar btn-toolbar">

          <div class="btn-group">
            <button type="button" class="btn btn-default ng-scope" name="h1"  ta-button="ta-button" ng-disabled="isDisabled()" tabindex="-1" ng-click="executeAction()" ng-class="displayActiveToolClass(active)" title="Heading 1" unselectable="on" disabled="disabled">H1</button>
            <button type="button" class="btn btn-default ng-scope" name="h2"  … title="Heading 2" … disabled="disabled">H2</button>
            <button type="button" class="btn btn-default ng-scope" name="h3"  … title="Heading 3" … disabled="disabled">H3</button>
            <button type="button" class="btn btn-default ng-scope" name="h4"  … title="Heading 4" … disabled="disabled">H4</button>
            <button type="button" class="btn btn-default ng-scope" name="h5"  … title="Heading 5" … disabled="disabled">H5</button>
            <button type="button" class="btn btn-default ng-scope" name="h6"  … title="Heading 6" … disabled="disabled">H6</button>
            <button type="button" class="btn btn-default ng-scope" name="p"   … title="Paragraph" … disabled="disabled">P</button>
            <button type="button" class="btn btn-default ng-scope" name="pre" … title="Preformatted text" … disabled="disabled">pre</button>
            <button type="button" class="btn btn-default ng-scope" name="quote" … title="Quote/unquote selection or paragraph" … disabled="disabled"><i class="fa fa-quote-right"></i></button>
          </div>

          <div class="btn-group">
            <button … name="bold"          title="Bold"             disabled="disabled"><i class="fa fa-bold"></i></button>
            <button … name="italics"       title="Italic"           disabled="disabled"><i class="fa fa-italic"></i></button>
            <button … name="underline"     title="Underline"        disabled="disabled"><i class="fa fa-underline"></i></button>
            <button … name="strikeThrough" title="Strikethrough"    disabled="disabled"><i class="fa fa-strikethrough"></i></button>
            <button … name="ul"            title="Unordered List"   disabled="disabled"><i class="fa fa-list-ul"></i></button>
            <button … name="ol"            title="Ordered List"     disabled="disabled"><i class="fa fa-list-ol"></i></button>
            <button … name="redo"          title="Redo"             disabled="disabled"><i class="fa fa-repeat"></i></button>
            <button … name="undo"          title="Undo"             disabled="disabled"><i class="fa fa-undo"></i></button>
            <button … name="clear"         title="Clear formatting" disabled="disabled"><i class="fa fa-ban"></i></button>
          </div>

          <div class="btn-group">
            <button … name="justifyLeft"   title="Align text left"  disabled="disabled"><i class="fa fa-align-left"></i></button>
            <button … name="justifyCenter" title="Center"           disabled="disabled"
                    class="btn btn-default ng-scope active"><i class="fa fa-align-center"></i></button>
            <button … name="justifyRight"  title="Align text right" disabled="disabled"><i class="fa fa-align-right"></i></button>
            <button … name="justifyFull"   title="Justify text"     disabled="disabled"><i class="fa fa-align-justify"></i></button>
            <button … name="indent"        title="Increase indent"  disabled="disabled"><i class="fa fa-indent"></i></button>
            <button … name="outdent"       title="Decrease indent"  disabled="disabled"><i class="fa fa-outdent"></i></button>
          </div>

          <div class="btn-group">
            <!-- the ONE enabled item: no disabled attribute -->
            <button type="button" class="btn btn-default ng-scope" name="html" ta-button="ta-button"
                    ng-disabled="isDisabled()" tabindex="-1" ng-click="executeAction()"
                    ng-class="displayActiveToolClass(active)" title="Toggle html / Rich Text"
                    unselectable="on"><i class="fa fa-code"></i></button>
            <button … name="insertImage" title="Insert image"      disabled="disabled"><i class="fa fa-picture-o"></i></button>
            <button … name="insertLink"  title="Insert / edit link" disabled="disabled"><i class="fa fa-link"></i></button>
            <button … name="insertVideo" title="Insert video"      disabled="disabled"><i class="fa fa-youtube-play"></i></button>
            <div id="toolbarWC" style="display:block; min-width:100px;" class="btn btn-default ng-scope"
                 name="wordcount" ta-button="ta-button" ng-disabled="isDisabled()" tabindex="-1"
                 ng-click="executeAction()" ng-class="displayActiveToolClass(active)"
                 unselectable="on" disabled="disabled">Words:<span ng-bind="wordcount" class="ng-binding">0</span></div>
            <div id="toolbarCC" style="display:block; min-width:120px;" class="btn btn-default ng-scope"
                 name="charcount" ta-button="ta-button" ng-disabled="isDisabled()" tabindex="-1"
                 ng-click="executeAction()" ng-class="displayActiveToolClass(active)"
                 unselectable="on" disabled="disabled">Characters:<span ng-bind="charcount" class="ng-binding">0</span></div>
          </div>
        </div>

        <div class="ta-scroll-window ng-scope ta-text ta-editor form-control" ng-hide="showHtml">
          <div class="popover fade bottom" style="max-width: none; width: 305px;">
            <div class="arrow"></div>
            <div class="popover-content"></div>
          </div>
          <div class="ta-resizer-handle-overlay">
            <div class="ta-resizer-handle-background"></div>
            <div class="ta-resizer-handle-corner ta-resizer-handle-corner-tl"></div>
            <div class="ta-resizer-handle-corner ta-resizer-handle-corner-tr"></div>
            <div class="ta-resizer-handle-corner ta-resizer-handle-corner-bl"></div>
            <div class="ta-resizer-handle-corner ta-resizer-handle-corner-br"></div>
            <div class="ta-resizer-handle-info"></div>
          </div>
          <div id="taTextElement7346242129359551" contenteditable="true" ta-bind="ta-bind"
               ng-model="html" class="ng-pristine ng-untouched ng-valid ta-bind"><p><br></p></div>
        </div>

        <textarea id="taHtmlElement7346242129359551" ng-show="showHtml" ta-bind="ta-bind" ng-model="html"
                  class="ng-pristine ng-untouched ng-valid ng-scope ta-bind ta-html ta-editor form-control ng-hide"></textarea>

        <input type="hidden" tabindex="-1" style="display: none;" name="wysiswyg-editor" value="">
      </div>
    </div>
  </div>
 </fieldset>
</div>
```
*(The `…` elisions inside the toolbar repeat the identical attribute block printed in full on the first
button of each group and listed exhaustively in §4 — nothing is omitted from the evidence, only from the
snippet's repetition.)*

### CSS — resolved absolute declarations (captured computed values only)

```css
.tab-content > .tab-pane        { display: none; }
.tab-content > .tab-pane.active { display: block; }
.ng-hide                        { display: none !important; }

fieldset.ng-scope { margin-bottom: 20px; padding-bottom: 20px; }   /* NO border here */
.form-group       { margin: 0; }

.col-sm-2.control-label { position: relative; float: left; width: 16.6667%; max-width: 100%;
  min-height: 1px; margin-bottom: 5px; padding: 0 15px; font-weight: 700;
  color: rgb(51,51,51); cursor: default; }
.col-sm-3  { position: relative; float: left; width: 25%;      min-height: 1px; padding: 0 15px; }
.col-sm-4  { position: relative; float: left; width: 33.3333%; min-height: 1px; padding: 0 15px; }
.col-sm-10 { position: relative; float: left; width: 83.3333%; min-height: 1px; padding: 0 15px; }

img.navLogo { display: inline; height: 25px; max-width: 300px; max-height: 25px;
  vertical-align: middle; overflow: clip; }

.btn.btn-assertive {            /* .btn-assertive adds NOTHING — plain UA/Bootstrap button */
  display: inline-block; padding: 6px 12px;
  border: 1px solid rgba(0, 0, 0, 0); border-radius: 4px;
  background-color: rgb(239, 239, 239); color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: center; white-space: nowrap; vertical-align: middle;
  cursor: pointer; -webkit-user-select: none; user-select: none; }

hr { box-sizing: content-box; height: 0; margin: 20px auto;
     border-top: 1px solid rgb(238, 238, 238); color: rgb(128, 128, 128); overflow: hidden; }

h3 { margin: 20px 0; font-size: 24px; font-weight: 500; line-height: 26.4px; }

.btn.btn-info.pull-right {
  display: block; float: right; padding: 6px 12px;
  border: 1px solid rgb(70, 184, 218); border-radius: 4px;
  background-color: rgb(91, 192, 222); color: rgb(255, 255, 255);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: center; white-space: nowrap; vertical-align: middle;
  cursor: pointer; -webkit-user-select: none; user-select: none; }
.btn.btn-info .fa.fa-save { display: inline-block; font-family: FontAwesome; font-size: 14px;
  line-height: 14px; color: rgb(255,255,255); text-align: center; white-space: nowrap;
  cursor: pointer; user-select: none; }
.fa-save::before { content: "\f0c7"; }

/* ---- textAngular ---- */
.ta-toolbar.btn-toolbar     { margin-left: -5px; }
.ta-toolbar.btn-toolbar::before,
.ta-toolbar.btn-toolbar::after { content: " "; display: table; }
.ta-toolbar .btn-group      { position: relative; float: left; margin-left: 5px;
                              vertical-align: middle; }

/* every toolbar item (28 <button> + 2 <div class="btn">) */
.btn-group-small .ta-toolbar .btn.btn-default {
  display: block;                 /* blockified by the float */
  position: relative; float: left;
  margin: 0 0 5px -1px;           /* first-in-group resets margin-left to 0 */
  padding: 10px;
  border: 1px solid rgb(230, 233, 238);
  border-radius: 0;
  background-color: rgb(255, 255, 255);
  color: rgb(51, 51, 51);
  font: 400 11px/15.7143px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: center; white-space: nowrap; vertical-align: middle;
  -webkit-user-select: none; user-select: none; }
.ta-toolbar .btn-group > .btn:first-child { margin-left: 0;
  border-top-left-radius: 4px; border-bottom-left-radius: 4px; }
.ta-toolbar .btn-group > .btn:last-child  {
  border-top-right-radius: 4px; border-bottom-right-radius: 4px; }
.ta-toolbar .btn.btn-default[disabled] {
  opacity: .65; box-shadow: rgb(0,0,0) 0 0 0 0; cursor: not-allowed; }
.ta-toolbar .btn.btn-default:not([disabled]) {          /* only name="html" */
  opacity: 1; box-shadow: none; cursor: pointer; }
.ta-toolbar .btn.btn-default.active {                   /* only name="justifyCenter" */
  z-index: 2; background-color: rgb(230, 230, 230); }
#toolbarWC { display: block; min-width: 100px; }
#toolbarCC { display: block; min-width: 120px; }
.ta-toolbar .btn .fa { display: inline-block; font-family: FontAwesome;
  font-size: 11px; line-height: 11px; color: rgb(51,51,51);
  text-align: center; white-space: nowrap; cursor: not-allowed; user-select: none; }
.ta-toolbar .btn:not([disabled]) .fa { cursor: pointer; }   /* fa-code only */
.ta-toolbar .btn > span.ng-binding { display: inline; font-size: 11px; line-height: 15.7143px;
  text-align: center; white-space: nowrap; cursor: not-allowed; user-select: none; }

.ta-scroll-window.ta-text.ta-editor.form-control {
  position: relative; width: 100%; min-height: 300px;
  border: 1px solid rgb(219, 217, 217); border-radius: 4px;
  background-color: rgb(255, 255, 255); color: rgb(85, 85, 85);
  overflow: auto; box-shadow: rgb(0,0,0) 0 0 0 0;
  transition: border-color .15s, box-shadow .15s; }

#taTextElement7346242129359551 {   /* generate your own suffix */
  min-height: 300px; padding: 6px 12px; color: rgb(85, 85, 85);
  overflow-wrap: break-word; outline: none; }
#taTextElement7346242129359551 > p { margin: 0 0 10px; color: rgb(85,85,85);
  overflow-wrap: break-word; }

#taHtmlElement7346242129359551 {
  display: none;                 /* ng-hide, because showHtml is false */
  width: 100%; min-height: 300px; padding: 6px 18px;
  border: 1px solid rgb(219, 217, 217); border-radius: 4px;
  background-color: rgb(255, 255, 255); color: rgb(85, 85, 85);
  white-space: pre-wrap; overflow-wrap: break-word; overflow: auto;
  box-shadow: rgb(0,0,0) 0 0 0 0; cursor: text;
  transition: border-color .15s, box-shadow .15s;
  resize: both; -webkit-appearance: auto; appearance: auto; }

.ta-scroll-window .popover.fade.bottom {
  display: none; position: absolute; top: 0; left: 0;
  z-index: 1060; width: 305px; max-width: none; margin-top: 10px; padding: 1px;
  border: 1px solid rgb(238, 238, 238); border-bottom: 2px solid rgb(230, 233, 238);
  border-radius: 2px; background-color: rgb(255, 255, 255); background-clip: padding-box;
  color: rgb(85, 85, 85); text-align: left; opacity: 0;
  box-shadow: rgb(0,0,0) 0 0 0 0; transition: opacity .15s; }
.popover.bottom > .arrow {
  position: absolute; top: -11px; left: 50%; width: 0; height: 0; margin-left: -11px;
  border-width: 0 11px 11px 11px; border-style: solid;
  border-color: rgba(0,0,0,0) rgba(0,0,0,0) rgba(0, 0, 0, .25) rgba(0,0,0,0); }
.popover.bottom > .arrow::after { content: " "; }
.popover-content { padding: 9px 14px; color: rgb(85, 85, 85); text-align: left; }

.ta-resizer-handle-overlay { display: none; position: absolute; z-index: 100; }
.ta-resizer-handle-background { position: absolute; inset: 5px;
  border: 1px solid rgb(0,0,0); background-color: rgba(0, 0, 0, .2); }
.ta-resizer-handle-corner    { position: absolute; width: 10px; height: 10px; }
.ta-resizer-handle-corner-tl { top: 0;    left: 0;  border-top: 1px solid rgb(0,0,0);
                               border-left: 1px solid rgb(0,0,0); }
.ta-resizer-handle-corner-tr { top: 0;    right: 0; border-top: 1px solid rgb(0,0,0);
                               border-right: 1px solid rgb(0,0,0); }
.ta-resizer-handle-corner-bl { bottom: 0; left: 0;  border-bottom: 1px solid rgb(0,0,0);
                               border-left: 1px solid rgb(0,0,0); }
.ta-resizer-handle-corner-br { bottom: 0; right: 0; border: 1px solid rgb(0,0,0);
                               background-color: rgb(255,255,255); cursor: se-resize; }
.ta-resizer-handle-info      { position: absolute; right: 16px; bottom: 16px; padding: 0 4px;
  border: 1px solid rgb(0,0,0); background-color: rgb(255,255,255); opacity: .7; }
```

### Geometry — measured vs CSS-derived

| dimension | source | value |
|---|---|---|
| every node in this pane: x, y, w, h | **NOT measured** | `0,0 0×0` — the pane was never laid out |
| tab heading `<li>` / `<a>` | **measured** (#93 / #133) | 86.3,309 232.625×42 / 86.3,309 230.625×42 |
| pane content width when active | **measured** on sibling #97 | **1768px** at this 1842×1265 dpr2 viewport |
| `.col-sm-2` label | **CSS-derived** | 16.6667% of 1768 = 294.67px |
| `.col-sm-3` logo swatch | **CSS-derived** | 25% of 1768 = 442px, inner box 442 − 30 = 412px (border-box, 15px padding all round) |
| logo `<img>` | **CSS-derived** from computed `height:25px`, `max-width:300px` | 25px tall; width = 25 × the PNG's intrinsic aspect ratio, capped at 300px — **the PNG's intrinsic size is not in the capture** |
| `.col-sm-4` button column | **CSS-derived** | 33.3333% of 1768 = 589.33px |
| `.col-sm-10` editor column | **CSS-derived** | 83.3333% of 1768 = 1473.33px, inner 1443.33px after 15px L/R padding |
| `hr` | **CSS-derived** | height 0, `margin: 20px auto`, 1px top rule |
| toolbar row | **CSS-derived** | `.btn-toolbar` margin-left −5px; each `.btn-group` float left + margin-left 5px; each button `padding: 10px`, `font-size: 11px`, `line-height: 15.7143px`, `margin-bottom: 5px`, overlapping neighbours by `margin-left: -1px` → **button height = 10 + 15.7143 + 10 + 2×1px border ≈ 37.71px** |
| editor surface | **CSS-derived** | `width: 100%` of 1443.33px, `min-height: 300px`, 1px border, 4px radius |
| contenteditable | **CSS-derived** | `min-height: 300px`, `padding: 6px 12px` |
| popover | **CSS-derived (explicit)** | `width: 305px`, `z-index: 1060`, `margin-top: 10px`, arrow 11px, `top: 0 / left: 0` until JS positions it |
| resizer corners | **CSS-derived (explicit)** | 10px × 10px each; background inset 5px; info box at right 16px / bottom 16px |

---

## 9. Honest gaps

1. **This pane was never laid out.** All 89 records report `rect: x=0 y=0 w=0 h=0` — the direct
   consequence of `#99` computing `display: none` because `tab.active` is false (the heading `<li>` #93
   *is* visible and measured, so nothing else gates it). **No pixel geometry for this pane exists in
   the capture and none is invented here.** Every §8 dimension is labelled measured-vs-CSS-derived.
2. **Correction to the briefing: the contenteditable is *visually* empty but *not* markup-empty.**
   `#1642` has a child `<p>` (`#1734`) which has a child `<br>` (`#1810`). So the captured content is
   exactly `<p><br></p>` — textAngular's canonical "empty document". There is **no** text content
   anywhere inside it (`#1642` and `#1734` both lack a `text:` line), and `wordcount`/`charcount` both
   read `0`, so "empty" is right about the *value* and wrong about the *DOM*. Reported as captured.
3. **The `<h3>`'s internal ordering is not captured.** `#473` carries `text: "Login Landing Page Editor"`
   and a child `<button>` at `…5.0.0`; the dump does not record whether the text node precedes or
   follows the button. §8 puts the text first (the button floats right, so visually it does not matter),
   and puts the `<i>` before `Save Editor Changes` inside the button — **flagged as the two ordering
   assumptions in this file.**
4. **The popover is pre-rendered but empty and unpositioned.** `#1727 .popover-content` has no children
   and no text; `#1640` sits at `top: 0 / left: 0` with `opacity: 0` and `display: none`. Which tool
   populates it (`insertLink`? `insertImage`? `insertVideo`?) and what it contains is **not decodable
   from this capture** — textAngular fills it on demand.
5. **The instance-id suffix `7346242129359551` is capture-specific.** It appears in
   `textAngularToolbar7346242129359551`, `taTextElement7346242129359551` and
   `taHtmlElement7346242129359551`. A rebuild must generate its own; matching this literal would be
   meaningless.
6. **`ptr_logo.png` is a URL only.** `/public/images/ptr_logo.png` — the image binary, its intrinsic
   width/height and its aspect ratio are not in the capture, so the rendered logo width cannot be
   stated (only that it is 25px tall and capped at 300px wide).
7. **`htmlDescChanged()`, `openFileChooser('logos')` and `resetLogo()` implementations are not in the
   capture** — only the `ng-click` strings. Endpoints, payloads and the upload flow are unknown.
8. **Hover / focus / `:active` states are not captured** — one resting computed style per node. In
   particular the enabled `name="html"` button's hover appearance and textAngular's focused-toolbar
   appearance (when `isDisabled()` flips false and all 30 items become interactive) are unknown.
9. **`sess.description` is empty, so the landing page's real copy cannot be reproduced.** That is the
   honest state of room 3625 at `2026-07-24T15:59:18.276Z`, not a gap in the capture — and no
   placeholder copy is invented to fill it.
