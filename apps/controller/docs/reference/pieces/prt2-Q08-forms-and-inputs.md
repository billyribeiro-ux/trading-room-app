# prt2 — Q08 · Forms and Inputs

**Purpose.** Exhaustive decode of every `<form>`, `<input>`, `<textarea>` and `<label>` in the SECOND
reference capture (`prt2.json`), capture `[00] baseline-room`, route `#/page/welcome` (AngularJS
"Account Settings"). Every field is given with its full attribute set, its label association (or lack
of one), its AngularJS validation classes, its rect, and its **resolved absolute** computed style.

**Evidence root.** `/tmp/ptr-decode/prt2/`
**Capture.** `caps/00-baseline-room/` — `DEFAULTS.txt` + `nodes-000.txt` … `nodes-007.txt`, **882 records**
(`INFO.txt:6` — `node count : 882 (declared 882, truncated=false)`).
**Viewport.** `1842 × 1265 @dpr 2` (`00-META.txt:9`).

---

## 0. How to read the resolved styles in this file

`DEFAULTS.txt` is a COMMON (most-frequent) table; a node record prints **only deviations**.
Resolved style = COMMON table **overridden by** that record's deviations.

⚠ **The COMMON table is badly skewed.** 635 of the 882 nodes are Intercom emoji-picker glyph spans
(see `prt2-Q10-intercom-emoji-picker.md`), and every one of them has **zero** deviations, so they
dominate the COMMON column. Concretely (`DEFAULTS.txt:7,11,20,27,63,64,66,68,74,82,84`):

| prop | COMMON value | nodes at COMMON | why it is skewed |
|---|---|---|---|
| `display` | `inline-table` | 635/882 | emoji spans only |
| `visibility` | `hidden` | 674/882 | emoji spans + hidden panels |
| `width` | `30px` | 635/882 | emoji spans only |
| `font-family` | `"Apple Color Emoji", "Segoe UI Emoji", NotoColorEmoji, "Segoe UI Symbol", "Android Emoji", EmojiSymbols` | 635/882 | emoji spans only |
| `font-size` | `28px` | 636/882 | emoji spans only |
| `line-height` | `30px` | 635/882 | emoji spans only |
| `text-align` | `center` | 690/882 | emoji spans + `.text-center` |
| `vertical-align` | `middle` | 673/882 | emoji spans + table cells |
| `cursor` | `pointer` | 667/882 | emoji spans + buttons |
| `padding-*` | `5px` | 636–640/882 | emoji spans + `.btn-sm` |

I verified programmatically that **every one of the 12 inputs / 2 textareas / 5 labels / 3 forms
explicitly deviates on `display`, `width`, `font-family`, `font-size`, `line-height` and all four
`padding-*`**, so none of them silently inherits an emoji value. All resolved values below are
therefore hard, not inferred.

Values that resolve **from** the COMMON table (i.e. not printed in the record) and that I state below
are marked `[COMMON]` with the `DEFAULTS.txt` line.

---

## 1. Path anchor and record census

Everything on the rendered Account-Settings page hangs off `r.0.1.1.0.` — decoded chain:

```
r                       <body class="footer-hidden">                         nodes-000.txt:#0
r.0                     <div class="app-container ng-scope"                  nodes-000.txt:#1
                              ng-controller="CoreController" data-ui-view>
r.0.1                   <div ui-view class="ng-fluid ng-scope">              nodes-000.txt:#18
r.0.1.1                 <div ui-view class="ng-fadeOutZoom ng-fluid ng-scope"nodes-000.txt:#33
                              style="background-color: 0A0A0A"
                              ng-init="showNewRoom=0;">
r.0.1.1.0               <div class="container container-sm animated          nodes-000.txt:#40
                              fadeInDown ng-scope">     rect 336,50 1170×1070
r.0.1.1.0.0             <div class="center-block mt-xl"> rect 351,80 1140×949 nodes-000.txt:#43
r.0.1.1.0.0.0           <div ng-show="login.isLoggedIn">                     nodes-000.txt:#49
r.0.1.1.0.0.0.0         <div ui-view ng-class="app.views.animation"          nodes-000.txt:#60
                              class="app ng-scope ng-fadeInLeft2">
r.0.1.1.0.1             <div class="panel ng-hide" ng-hide="login.isLoggedIn "> nodes-000.txt:#44
                              ← the logged-OUT login panel, display:none
```

Element census over all 882 records (`grep -o '<tag>'` across `nodes-*.txt`):

| tag | count |
|---|---|
| `span` | 650 (635 = emoji glyphs) |
| `div` | 94 |
| `th` | 14 |
| `script` | 12 |
| **`input`** | **12** |
| `button` | 12 |
| `a` | 12 |
| `tr` | 7 · `td` 7 · `h3` 7 |
| `hr` | 6 |
| **`label`** | **5** |
| `iframe` | 5 · `i` 5 |
| `thead` 4 · `tbody` 4 · `table` 4 |
| `img` | 3 · **`form` 3** · `br` 3 |
| **`textarea`** | **2** · `li` 2 · `h4` 2 |
| `ul` 1 · `style` 1 · `strong` 1 · `p` 1 · `nav` 1 · `muted` 1 · `body` 1 |

**Confirmed: 3 forms, 12 inputs, 2 textareas, 5 labels.**

---

## 2. THE THREE FORMS

### FORM 1 — Login form (hidden; user is logged in)

`nodes-000.txt:#62` — `path=r.0.1.1.0.1.0.1`

| property | value (verbatim from record) |
|---|---|
| `action` | **absent** — no `action` attribute is present on any of the 3 forms |
| `method` | **absent** |
| `ng-submit` | `"submitLogin()"` |
| `role` | `"form"` |
| `class` | `"ng-pristine ng-valid ng-valid-email"` |
| rect | `x=0 y=0 w=0 h=0` (ancestor `r.0.1.1.0.1` is `.panel.ng-hide`, `display:none`) |

Resolved computed style (record lists 15 deviations; everything else = COMMON):
`display: block` · `visibility: visible` · `width: auto` · `padding: 0px 0px 0px 0px` ·
`font-family: "Helvetica Neue", Helvetica, Arial, sans-serif` · `font-size: 14px` ·
`line-height: 20px` · `text-align: start` · `vertical-align: baseline` · `cursor: auto` ·
`transition-property: all` · `transition-duration: 0s` · `height: auto` `[COMMON DEFAULTS.txt:20]` ·
`position: static` `[COMMON DEFAULTS.txt:8]` · `color: rgb(51, 51, 51)` `[COMMON DEFAULTS.txt:62]`.

Field list of FORM 1 (in DOM order):

| # | record | path | tag | role |
|---|---|---|---|---|
| 1 | `#106` | `r.0.1.1.0.1.0.1.0.0.0` | `div.form-group.has-feedback.mb` | wrapper |
| 2 | `#124` | `…0.0.0.0#exampleInputEmail1` | `input[type=email]` | email |
| 3 | `#125` | `…0.0.0.1` | `span.fa.fa-envelope.form-control-feedback.text-muted` | icon (U+F0E0) |
| 4 | `#107` | `…0.0.1` | `br` | — |
| 5 | `#108` | `…0.0.2` | `div.form-group.has-feedback` | wrapper |
| 6 | `#126` | `…0.0.2.0#exampleInputPassword1` | `input[type=password]` | password |
| 7 | `#127` | `…0.0.2.1` | `span.fa.fa-lock.form-control-feedback.text-muted` | icon (U+F023) |
| 8 | `#128` | `…0.0.2.2` | `div.text-right.mt` | wrapper |
| 9 | `#156` | `…0.0.2.2.0` | `a[ui-sref=page.forgot-password]` | "Forgot your password?" |
| 10 | `#109` | `…0.0.3` | `div.form-group.has-feedback.ng-hide` `ng-show="failedLoginCount >= 3"` | reCAPTCHA gate |
| 11 | `#129` | `…0.0.3.0` | `div.g-recaptcha` `data-sitekey="6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx"` | widget mount |
| 12 | `#157` | `…0.0.3.0.0` | `div style="width: 304px; height: 78px;"` | anchor wrapper |
| 13 | `#217` | `…0.0.3.0.0.0` | `iframe title="reCAPTCHA"` | anchor frame |
| 14 | `#184` | `…0.0.3.0.0.1#g-recaptcha-response-4` | **`textarea`** | reCAPTCHA token sink |
| 15 | `#158` | `…0.0.3.0.1` | `iframe style="display: none;"` | reCAPTCHA (no `src` captured) |
| 16 | `#110` | `…0.0.4` | `div.form-group.has-feedback` | wrapper |
| 17 | `#130` | `…0.0.4.0` | `button[type=submit].btn.btn-block.btn-info.mb` | "Login" |

Sibling of the form, inside the same `.panel-body` (`#50`, `r.0.1.1.0.1.0`):
`#61` `<p class="pv text-bold">` text **`"Login to your ProTradingRoom.com account"`**
(`nodes-000.txt:1717`), and `#76` `div.div.ng-hide` `ng-show="loggingIn"` containing
`#87 <img src="app/img/ajax_loader.gif">` and `#88 <label>` text `"Logging In, please wait..."`.

**Verdict on the prior claim `ng-submit="submitLogin()"` — CONFIRMED** (`nodes-000.txt:1741`).

---

### FORM 2 — Badge editor (hidden; `showAddBadge` is falsy)

`nodes-000.txt:#115` — `path=r.0.1.1.0.0.0.0.5.0.1.0`

| property | value |
|---|---|
| `action` | **absent** |
| `method` | **absent** |
| `ng-submit` | **absent** — this form has **no submit handler at all**; submission is done by `ng-click` on `#141`/`#142` |
| `class` | `"ng-pristine ng-valid"` |
| rect | `x=0 y=0 w=0 h=0` (ancestor `#82 r.0.1.1.0.0.0.0.5.0` is `.panel.panel-default.col-md-6.ng-hide`, `ng-show="showAddBadge"`, `display:none`) |

Resolved computed style (15 deviations): identical to FORM 1's resolved style
(`display: block`, `visibility: visible`, `width: auto`, `padding 0px`,
`font-family "Helvetica Neue", Helvetica, Arial, sans-serif`, `font-size 14px`, `line-height 20px`,
`text-align start`, `vertical-align baseline`, `cursor auto`, `transition all 0s`).

Field list of FORM 2 (DOM order under `r.0.1.1.0.0.0.0.5.0.1.0`):

| # | record | child path | tag / class | text or role |
|---|---|---|---|---|
| 1 | `#135` | `.0` | `div` `ng-hide="badges.hasOwnProperty('imgURL') && badges.imgURL"` | colour-row wrapper |
| 2 | `#161` | `.0.0` | `span` | text `"Background:"` |
| 3 | `#162` | `.0.1` | **`input[type=color]`** `ng-model="badges.bkcolor"` | background colour picker |
| 4 | `#163` | `.0.2` | `button.btn.btn-tiny.btn-default` `ng-click="badges.bkcolor='rgba(1,0,0,0)';"` | text `"Transparent"` |
| 5 | `#164` | `.0.3` | `span` | text `"Text:"` |
| 6 | `#165` | `.0.4` | **`input[type=color]`** `ng-model="badges.color"` | text colour picker |
| 7 | `#166` | `.0.5` | `span` | text `"Badge Text:"` |
| 8 | `#167` | `.0.6` | **`input[type=text]#badgeInputTxt`** `.input-emoji-txt` `ng-model="badges.text"` `value="TEST"` | badge label text |
| 9 | `#168` | `.0.7` | **`button#emoji-picker.btn.btn-default.btn-sm`** | emoji trigger (no `ng-click`!) |
| 10 | `#195` | `.0.7.0` | `i.fa.fa-smile-o.fa-1x` `::before content ""` | smiley glyph |
| 11 | `#169` | `.0.8` | `hr` | — |
| 12 | `#136` | `.1` | `span` | text `"Name:"` |
| 13 | `#137` | `.2` | **`input[type=text]#badgeNameTxt`** `.input-name-txt` `ng-model="badges.name"` `value=""` `placeholder="Badge Name"` | badge name |
| 14 | `#138` | `.3` | **`label`** (no `for`) | `"Auto assign this badge to this WP roles (comma separated):"` |
| 15 | `#139` | `.4` | **`textarea#badgeRolesTxt`** `.input-text` `ng-model="badges.roles"` `cols="70" rows="2"` | WP roles |
| 16 | `#140` | `.5` | `hr` | — |
| 17 | `#141` | `.6` | `button` `ng-show="badges.mode=='add'"` `ng-click="addBadge(false)"` `.btn.btn.btn-warning.pull-right.ng-binding` | `"Add New Badge"` |
| 18 | `#142` | `.7` | `button` `ng-show="badges.mode=='edit'"` `ng-click="addBadge(true); showAddBadge=false;"` `.btn.btn.btn-primary.pull-right.ng-binding.ng-hide` | `"Save Edit for New Badge"` |
| 19 | `#143` | `.8` | `button` `ng-click="badges.badgeID=''; badges.mode='add'; showAddBadge=false;"` `.btn.btn.btn-default.pull-right` | `"Close"` |

**Verdict on the prior claim "a badge editor with two `type=color` pickers + an emoji button" —
CONFIRMED** (`nodes-001.txt:1180` `type=color` `badges.bkcolor`; `nodes-001.txt:1278` `type=color`
`badges.color`; `nodes-001.txt:1375-1378` `button#emoji-picker`).

**New, un-flagged finding:** `button#emoji-picker` (`#168`) carries **no `ng-click`, no `ng-*` binding
of any kind** — only `id="emoji-picker"` and `class="btn btn-default btn-sm"`. Its behaviour is wired
from JavaScript by `id`, not from the template. A rebuild must replicate the id hook or replace it
with an explicit handler.

The badge panel's sibling markup (outside FORM 2, inside the same `.panel-body` `#95`) is the
Intercom-classed emoji popover — see §5 and `prt2-Q10`.

---

### FORM 3 — Add Admin User (hidden; `showAddAdminUser` falsy)

`nodes-001.txt:#149` — `path=r.0.1.1.0.0.0.0.8.0.2.1.0`

| property | value |
|---|---|
| `action` | **absent** |
| `method` | **absent** |
| `ng-submit` | `"addAdminUser()"` |
| `class` | `"ng-pristine ng-invalid ng-invalid-required ng-valid-email"` |
| rect | `x=0 y=0 w=0 h=0` (ancestor `#103` `div.panel.panel-default.ng-hide` `ng-show="showAddAdminUser"` `style="margin-top: 15px"`, `display:none`) |

Resolved computed style (15 deviations): same shape as FORMS 1 & 2 —
`display: block` · `visibility: visible` · `width: auto` · `padding 0px` ·
`font-family "Helvetica Neue", Helvetica, Arial, sans-serif` · `font-size 14px` · `line-height 20px` ·
`text-align start` · `vertical-align baseline` · `cursor auto` · `transition all 0s`.

Field list of FORM 3:

| # | record | child path | tag | detail |
|---|---|---|---|---|
| 1 | `#173` | `.0` | `div.form-group` | wrapper (`margin-bottom: 15px`) |
| 2 | `#200` | `.0.0` | **`label`** (no `for`) | text `"Name"` |
| 3 | `#201` | `.0.1` | **`input[type=text]`** `ng-model="adminUser.name"` `placeholder="Enter name"` `required=""` | class `form-control ng-pristine ng-untouched ng-invalid ng-invalid-required` |
| 4 | `#174` | `.1` | `div.form-group` | wrapper |
| 5 | `#202` | `.1.0` | **`label`** (no `for`) | text `"Email"` |
| 6 | `#203` | `.1.1` | **`input[type=email]`** `ng-model="adminUser.email"` `placeholder="Enter email"` `required=""` | class `form-control ng-pristine ng-untouched ng-valid ng-valid-email ng-valid-required` |
| 7 | `#175` | `.2` | `div.form-group` | wrapper |
| 8 | `#204` | `.2.0` | **`label`** (no `for`) | text `"Password"` |
| 9 | `#205` | `.2.1` | **`input[type=password]`** `ng-model="adminUser.password"` `placeholder="Enter password"` `required=""` | class `form-control ng-pristine ng-untouched ng-valid ng-valid-required` |
| 10 | `#176` | `.3` | `div.form-group` | wrapper |
| 11 | `#206` | `.3.0` | `button[type=submit].btn.btn-primary` | text `"Add Admin User"` |
| 12 | `#207` | `.3.1` | `button[type=button].btn.btn-default` `ng-click="showAddAdminUser=false; adminUser={name:'',email:'',password:'',perms:{}}"` | text `"Cancel"` |

**Verdict on the prior claim "an add-admin form `ng-submit="addAdminUser()"` with three `required`
fields currently `ng-invalid-required`" — HALF WRONG. CORRECTED:**

* `ng-submit="addAdminUser()"` — **CONFIRMED** (`nodes-001.txt:876`).
* Three `required` fields — **CONFIRMED** (`nodes-001.txt:2281, 2352, 2423`).
* "currently `ng-invalid-required`" — **FALSE for two of the three.** Only `adminUser.name` (`#201`)
  carries `ng-invalid ng-invalid-required` (`nodes-001.txt:2278`). `adminUser.email` (`#203`) carries
  `ng-valid ng-valid-email ng-valid-required` (`nodes-001.txt:2349`) and `adminUser.password`
  (`#205`) carries `ng-valid ng-valid-required` (`nodes-001.txt:2420`).
* This is internally inconsistent in the capture itself: all three are `ng-pristine ng-untouched`
  (nothing typed), all three are `required`, yet two report `ng-valid-required`. I record the raw
  evidence and **do not rationalise it** — see the "open anomalies" note in §7.

---

## 3. ALL 12 INPUTS — full field table

Path column omits the shared `r.0.1.1.0.` prefix where it applies (marked `…`).

| # | rec | path | `id` | `type` | `name` | `placeholder` | `value` | `required` | `ng-model` | `ng-required` / `pattern` | label text | in form |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#15` | `r.14` | — | `file` | — | — | — | no | — | none | **none** | none (body-level) |
| 2 | `#89` | `…0.0.0.1.0.0` | — | `text` | — | `search` | — | no | `sessSearch` | none | **none** | none |
| 3 | `#124` | `…1.0.1.0.0.0.0` | `exampleInputEmail1` | `email` | — | `Your email` | — | no | `signup.email` | none | **none** | FORM 1 |
| 4 | `#126` | `…1.0.1.0.0.2.0` | `exampleInputPassword1` | `password` | — | `Your password` | — | no | `signup.pass` | none | **none** | FORM 1 |
| 5 | `#137` | `…0.0.0.5.0.1.0.2` | `badgeNameTxt` | `text` | — | `Badge Name` | `""` (empty) | no | `badges.name` | none | **none** | FORM 2 |
| 6 | `#162` | `…0.0.0.5.0.1.0.0.1` | — | `color` | — | — | — | no | `badges.bkcolor` | none | `span` `"Background:"` (`#161`, **not** a `<label>`) | FORM 2 |
| 7 | `#165` | `…0.0.0.5.0.1.0.0.4` | — | `color` | — | — | — | no | `badges.color` | none | `span` `"Text:"` (`#164`, not a `<label>`) | FORM 2 |
| 8 | `#167` | `…0.0.0.5.0.1.0.0.6` | `badgeInputTxt` | `text` | — | — | `TEST` | no | `badges.text` | none | `span` `"Badge Text:"` (`#166`, not a `<label>`) | FORM 2 |
| 9 | `#196` | `…0.0.0.5.0.1.1.0.0.0` | — | **no `type` attr** (defaults to `text`) | — | `Search` | `""` | no | **none** | none | **none** | none (Intercom popover) |
| 10 | `#201` | `…0.0.0.8.0.2.1.0.0.1` | — | `text` | — | `Enter name` | — | **yes** (`required=""`) | `adminUser.name` | none | `<label>` `"Name"` (`#200`, **no `for`**) | FORM 3 |
| 11 | `#203` | `…0.0.0.8.0.2.1.0.1.1` | — | `email` | — | `Enter email` | — | **yes** | `adminUser.email` | none | `<label>` `"Email"` (`#202`, no `for`) | FORM 3 |
| 12 | `#205` | `…0.0.0.8.0.2.1.0.2.1` | — | `password` | — | `Enter password` | — | **yes** | `adminUser.password` | none | `<label>` `"Password"` (`#204`, no `for`) | FORM 3 |

**`ng-required` is used nowhere.** **`pattern` is used nowhere.** **`name` is used on no `<input>`** —
the only `name` attributes in the whole 882-record dump are on the reCAPTCHA `<textarea>`
(`name="g-recaptcha-response"`) and on four `<iframe>`s (attribute census: `name` ×5).

### Rects — only ONE input is on screen

| rec | rect |
|---|---|
| `#89` | **`x=367 y=135.8 w=348 h=34`** ← the only input with a non-zero box |
| `#15` | `x=0 y=1265 w=0 h=0` (parked below the fold, `visibility:hidden`) |
| `#124 #126 #137 #162 #165 #167 #196 #201 #203 #205` | all `x=0 y=0 w=0 h=0` |

**Verdict on the prior claim "only one input is on screen (the sessions search box, 348×34)" —
CONFIRMED, exactly.** `nodes-000.txt:2559` `rect: x=367 y=135.8 w=348 h=34`.

---

## 4. RESOLVED ABSOLUTE COMPUTED STYLE — per input

### 4.1 `#89` — sessions search (`nodes-000.txt:2558-2602`) — THE ONLY VISIBLE FIELD

Full resolved style (38 deviations + COMMON remainder):

```
display: block                      visibility: visible
position: static [COMMON:8]         top/right/bottom/left: auto [COMMON:9-12]
z-index: auto [COMMON:13]           float: none [COMMON:14]
box-sizing: border-box [COMMON:15]
width: 348px                        height: 34px
min-width: 0px [COMMON:17]          max-width: none [COMMON:18]
min-height: 0px [COMMON:19]         max-height: none [COMMON:21]
flex: 0 1 auto [COMMON:22]          flex-direction: row [COMMON:23]
flex-wrap: nowrap [COMMON:24]       flex-grow: 0 · flex-shrink: 1 · flex-basis: auto [COMMON:25-27]
align-items: normal [COMMON:28]     align-self: auto [COMMON:29]
justify-content: normal [COMMON:30] gap: normal [COMMON:31] · order: 0 [COMMON:32]
grid-template-columns: none [COMMON:33]
margin: 0px 0px 0px 0px [COMMON:34-37]
padding-top: 6px  padding-right: 18px  padding-bottom: 6px  padding-left: 18px
border-width: 1px 1px 1px 1px       border-style: solid solid solid solid
border-color: rgb(219, 217, 217) ×4
border-radius: 4px 4px 4px 4px
background-color: rgb(255, 255, 255)
background-image: none [COMMON:57]  background-position: 0% 0% [COMMON:58]
background-size: auto [COMMON:59]   background-repeat: repeat [COMMON:60]
background-clip: border-box [COMMON:61]
color: rgb(85, 85, 85)
font-family: "Helvetica Neue", Helvetica, Arial, sans-serif
font-size: 14px                     font-weight: 400 [COMMON:65]
font-style: normal [COMMON:67]      line-height: 20px
letter-spacing: normal [COMMON:69]  text-align: start
text-transform: none [COMMON:71]    text-decoration-line: none [COMMON:72]
text-shadow: none [COMMON:73]       text-overflow: clip [COMMON:74]
white-space: normal [COMMON:75]     vertical-align: baseline
word-break: normal [COMMON:77]      overflow-wrap: normal [COMMON:78]
overflow-x: clip                    overflow-y: clip
opacity: 1 [COMMON:81]
box-shadow: rgb(0, 0, 0) 0px 0px 0px 0px
outline-style: none [COMMON:83]     outline-width: 3px [COMMON:84]
outline-color: rgb(85, 85, 85)
cursor: text                        pointer-events: auto [COMMON:87]
user-select: auto [COMMON:88]
transition-property: border-color, box-shadow
transition-duration: 0.15s, 0.15s
transform: none [COMMON:91]         filter: none [COMMON:92]
object-fit: fill [COMMON:93]        list-style-type: disc [COMMON:94]
content: normal [COMMON:95]         resize: none [COMMON:96]
appearance: none [COMMON:97]
fill: rgb(0, 0, 0) [COMMON:98]      stroke: none [COMMON:99]
```

Its parent `#78` (`r.0.1.1.0.0.0.0.1.0`, `div.col-md-4.panel.pane-default`) is
`rect x=351 y=134.8 w=380 h=36`, `padding: 0 15px`, `background rgb(255,255,255)`,
`border 1px solid rgba(0,0,0,0)`, `border-radius 4px`,
`box-shadow rgba(0, 0, 0, 0.05) 0px 1px 1px 0px` (`nodes-000.txt:2156-2198`).

### 4.2 The four `.form-control` fields (`#124 #126 #201 #203 #205`)

`#124`, `#126`, `#201`, `#203`, `#205` all resolve to the **same box** as `#89` except:

| prop | `#89` | `#124 #126` | `#201 #203 #205` |
|---|---|---|---|
| `width` | `348px` | `100%` | `100%` |
| `height` | `34px` | `34px` | `34px` |
| `padding-right` | `18px` | **`42.5px`** (icon gutter, `.has-feedback`) | `18px` |
| `padding-left` | `18px` | `18px` | `18px` |

Everything else is byte-identical: `padding-top/bottom 6px`, `border 1px solid rgb(219,217,217)`,
`border-radius 4px`, `background rgb(255,255,255)`, `color rgb(85,85,85)`,
`font 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif`, `text-align start`,
`vertical-align baseline`, `overflow clip/clip`, `box-shadow rgb(0,0,0) 0 0 0 0`,
`outline-color rgb(85,85,85)`, `cursor text`,
`transition border-color 0.15s, box-shadow 0.15s`.
(`nodes-001.txt:109-147`, `188-226`, `2282-2320`, `2353-2391`, `2424-2462`.)

### 4.3 The two `type=color` pickers (`#162`, `#165`) — identical resolved style

`nodes-001.txt:1183-1215` and `1281-1313`:

```
display: inline-block   visibility: visible
width: 50px             height: 27px
padding: 1px 2px 1px 2px
border-width: 1px ×4    border-style: solid ×4    border-color: rgb(0, 0, 0) ×4
background-color: rgb(239, 239, 239)
font: 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif
text-align: start       vertical-align: baseline
overflow-x: clip        overflow-y: clip
cursor: default
transition-property: all   transition-duration: 0s
appearance: auto        (COMMON is `none` — DEFAULTS.txt:97 — these two deviate)
```

### 4.4 The two bare `input-*-txt` fields (`#137` badgeNameTxt, `#167` badgeInputTxt)

Identical resolved style (`nodes-001.txt:497-527`, `1343-1373`) — these are **unstyled UA inputs**,
not `.form-control`:

```
display: inline-block   visibility: visible   width: auto   height: auto [COMMON:20]
padding: 1px 2px 1px 2px
border-width: 2px ×4    border-style: inset ×4    border-color: rgb(118, 118, 118) ×4
border-radius: 0px ×4 [COMMON:49-52]
background-color: rgb(255, 255, 255)
color: rgb(51, 51, 51) [COMMON:62]
font: 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif
text-align: start   vertical-align: baseline
overflow-x: clip    overflow-y: clip
cursor: text        transition: all 0s
appearance: none [COMMON:97]
```

Note `styles.css` line 2564 (`01-stylesheets/09.css:2564`) declares
`#badgesForm input { vertical-align: text-bottom; }` — that rule does **not** apply here, because the
badge form (`#115`) carries **no `id`**. Honest gap: either the id was removed in this build or the
rule is dead CSS.

### 4.5 `#196` — Intercom popover search input (NOT app-Angular)

`nodes-001.txt:2139-2172`. Only `class`, `placeholder="Search"`, `value=""` — no `ng-model`, no
`type`, no `id`. Resolved:

```
display: inline-block   width: 100%   height: 40px
padding: 0px 0px 0px 25px
border-color: rgb(110, 122, 137) ×4   border-style: none (from 14.css `border-style: none`)
background-image: url("https://js.intercomcdn.com/images/search@2x.9f02b9f3.png")
background-position: 0px 12px   background-size: 16px 16px   background-repeat: no-repeat
color: rgb(110, 122, 137)
font-family: intercom-font, "Helvetica Neue", Helvetica, Arial, sans-serif
font-size: 14px   line-height: 20px
text-align: start   vertical-align: baseline
overflow-x: clip  overflow-y: clip
outline-color: rgb(110, 122, 137)   cursor: auto
transition: all 0s   appearance: auto
```

Source rule: `01-stylesheets/14.css` (**an inline `<style>` shipped by the app itself**, record `#32`
`path=r.0.1.0`), selector `.intercom-composer-popover-input`.

### 4.6 `#15` — the hidden `ngf-select` file input

`nodes-000.txt:366-399`. `type="file"`, `ngf-select="ngf-select"`,
`ngf-change="onImageSelect($files, '')"`, `tabindex="-1"`, and inline
`style="visibility: hidden; position: absolute; overflow: hidden; width: 0px; height: 0px;
z-index: -100000; border-width: medium; border-style: none; border-color: currentcolor;
border-image: none; margin: 0px; padding: 0px;"`.
Resolved: `display: block`, `visibility: hidden [COMMON:7]`, `position: absolute`,
`top: 1265px right: 1842px bottom: 0px left: 0px`, `z-index: -100000`, `width/height 0px`,
`align-items: baseline`, `padding 0px`, `text-overflow: ellipsis`, `white-space: pre`,
`overflow-x/y: clip`, `cursor: default`, `transition all 0s`.
Its visible twin is `#97` `<a class="btn btn-info mb" ngf-select ngf-change="onImageSelect($files, '')">`
text `"Upload Image Badge"`, `rect x=499.6 y=398.2 w=177.7 h=34`.

---

## 5. THE TWO `<textarea>`s

| | `#139` badgeRolesTxt | `#184` g-recaptcha-response-4 |
|---|---|---|
| record | `nodes-001.txt:553-595` | `nodes-001.txt:1789-1833` |
| path | `r.0.1.1.0.0.0.0.5.0.1.0.4` | `r.0.1.1.0.1.0.1.0.0.3.0.0.1` |
| `id` | `badgeRolesTxt` | `g-recaptcha-response-4` |
| `name` | — | **`g-recaptcha-response`** |
| `class` | `input-text ng-pristine ng-untouched ng-valid` | `g-recaptcha-response` |
| `type` | `text` (invalid on a textarea, but present) | — |
| `ng-model` | `badges.roles` | — |
| `cols` / `rows` | `70` / `2` | — |
| inline `style` | — | `width: 250px; height: 40px; border: 1px solid rgb(193, 193, 193); margin: 10px 25px; padding: 0px; resize: none; display: none;` |
| label | `#138 <label>` (no `for`) `"Auto assign this badge to this WP roles (comma separated):"` | **none** |
| rect | `0×0 @ 0,0` | `0×0 @ 0,0` |

Resolved style `#139`: `display: inline-block`, `visibility: visible`, `width: auto`,
`padding 2px ×4`, `border 1px solid rgb(118,118,118) ×4`, `background rgb(255,255,255)`,
`font 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif`, `text-align start`,
`white-space: pre-wrap`, `vertical-align baseline`, `overflow-wrap: break-word`,
`overflow-x/y: auto`, `cursor: text`, `transition all 0s`, **`resize: both`**
(COMMON is `none`, `DEFAULTS.txt:96`), **`appearance: auto`**.

Resolved style `#184`: `display: none`, `visibility: visible`, `width 250px`, `height 40px`,
`margin 10px 25px 10px 25px`, `padding 0px`, `border 1px solid rgb(193,193,193) ×4`,
`background rgb(255,255,255)`, `font 14px/20px`, `white-space: pre-wrap`,
`overflow-wrap: break-word`, `overflow-x/y: auto`, `cursor: text`, `appearance: auto`.

---

## 6. THE FIVE `<label>`s — and the accessibility verdict

| # | rec | path | `for` | text | resolved style |
|---|---|---|---|---|---|
| 1 | `#88` | `r.0.1.1.0.1.0.1.1.1` | **absent** | `"Logging In, please wait..."` | `display: inline-block`, `width auto`, `max-width 100%`, `margin-bottom 5px`, `padding 0`, `font 700 14px/20px Helvetica Neue…`, `vertical-align baseline`, `cursor default`, `transition all 0s` |
| 2 | `#138` | `r.0.1.1.0.0.0.0.5.0.1.0.3` | **absent** | `"Auto assign this badge to this WP roles (comma separated):"` | same as above + `text-align: start` |
| 3 | `#200` | `r.0.1.1.0.0.0.0.8.0.2.1.0.0.0` | **absent** | `"Name"` | same as #138 |
| 4 | `#202` | `r.0.1.1.0.0.0.0.8.0.2.1.0.1.0` | **absent** | `"Email"` | same as #138 |
| 5 | `#204` | `r.0.1.1.0.0.0.0.8.0.2.1.0.2.0` | **absent** | `"Password"` | same as #138 |

All five rects are `x=0 y=0 w=0 h=0`.

**Verdict on the prior claim "there is no `<label for>` anywhere" — CONFIRMED, and stronger than
stated:** the attribute census over all 882 records shows **zero** occurrences of the attribute name
`for` anywhere in the dump (attr counts: `class` 804, `title` 639, `style` 34, `type` 28, `ng-show`
24, `ng-click` 17, `src` 16, `ng-model` 11, `placeholder` 8, `ng-hide` 7, `id` 7, `href` 7, `name` 5,
… — no `for`, no `aria-*`, no `aria-label`, no `aria-labelledby`).

Consequence: **no input in the page is programmatically labelled.** Three inputs are labelled only
by a preceding `<span>` (`#161` `"Background:"`, `#164` `"Text:"`, `#166` `"Badge Text:"`), and six
inputs (`#15 #89 #124 #126 #137 #167 #196`) have no textual label at all — only a `placeholder` or
nothing.

---

## 7. FULL VALIDATION-STATE TABLE

AngularJS validity classes as captured, verbatim.

### Forms

| form | rec | class attribute (verbatim) | pristine? | valid? | which flags |
|---|---|---|---|---|---|
| FORM 1 login | `#62` | `ng-pristine ng-valid ng-valid-email` | ✔ pristine | ✔ valid | `ng-valid-email` |
| FORM 2 badge | `#115` | `ng-pristine ng-valid` | ✔ pristine | ✔ valid | (none) |
| FORM 3 admin | `#149` | `ng-pristine ng-invalid ng-invalid-required ng-valid-email` | ✔ pristine | ✘ **invalid** | `ng-invalid-required` + `ng-valid-email` |

### Fields

| rec | control | `required` | pristine | touched | valid | full class attribute (verbatim) |
|---|---|---|---|---|---|---|
| `#15` | file input | no | — | — | — | *(no `class` attribute at all)* |
| `#89` | `sessSearch` | no | `ng-pristine` | `ng-untouched` | `ng-valid` | `form-control ng-pristine ng-untouched ng-valid` |
| `#124` | `signup.email` | no | `ng-pristine` | `ng-untouched` | `ng-valid` | `form-control ng-pristine ng-untouched ng-valid ng-valid-email` |
| `#126` | `signup.pass` | no | `ng-pristine` | `ng-untouched` | `ng-valid` | `form-control ng-pristine ng-untouched ng-valid` |
| `#137` | `badges.name` | no | `ng-pristine` | `ng-untouched` | `ng-valid` | `input-name-txt ng-pristine ng-untouched ng-valid` |
| `#139` | `badges.roles` (textarea) | no | `ng-pristine` | `ng-untouched` | `ng-valid` | `input-text ng-pristine ng-untouched ng-valid` |
| `#162` | `badges.bkcolor` | no | `ng-pristine` | `ng-untouched` | `ng-valid` | `ng-pristine ng-untouched ng-valid` |
| `#165` | `badges.color` | no | `ng-pristine` | `ng-untouched` | `ng-valid` | `ng-pristine ng-untouched ng-valid` |
| `#167` | `badges.text` | no | `ng-pristine` | `ng-untouched` | `ng-valid` | `input-emoji-txt ng-pristine ng-untouched ng-valid` |
| `#184` | reCAPTCHA textarea | no | — | — | — | `g-recaptcha-response` *(not Angular-bound)* |
| `#196` | Intercom search | no | — | — | — | `intercom-composer-popover-input` *(not Angular-bound)* |
| `#201` | `adminUser.name` | **yes** | `ng-pristine` | `ng-untouched` | ✘ **`ng-invalid`** | `form-control ng-pristine ng-untouched ng-invalid ng-invalid-required` |
| `#203` | `adminUser.email` | **yes** | `ng-pristine` | `ng-untouched` | ✔ `ng-valid` | `form-control ng-pristine ng-untouched ng-valid ng-valid-email ng-valid-required` |
| `#205` | `adminUser.password` | **yes** | `ng-pristine` | `ng-untouched` | ✔ `ng-valid` | `form-control ng-pristine ng-untouched ng-valid ng-valid-required` |

**Open anomaly (not rationalised):** `#201`, `#203`, `#205` are all `required`, all `ng-pristine
ng-untouched`, yet only `#201` is `ng-invalid-required`. The form aggregate (`#149`) is
`ng-invalid ng-invalid-required`, consistent with exactly one invalid child. The capture gives no
`value` attribute for any of the three, and no controller state was captured, so **I cannot say why
email and password report `ng-valid-required`.** Recorded as an open contradiction.

---

## 8. Interaction surface adjacent to the forms (for completeness)

Every `ng-click` / `ng-submit` / `ng-dblclick` / `ng-init` in the whole dump — 22 handlers total:

| rec | element | handler |
|---|---|---|
| `#33` | `div` `r.0.1.1` | `ng-init="showNewRoom=0;"` |
| `#59` | `a.icon.fa.fa-2x.fa-power-off` (navbar) | `ng-click="doLogout()"` |
| `#62` | `form` | `ng-submit="submitLogin()"` |
| `#77` | `span` "Sessions" | `ng-click="showNewRoom=showNewRoom+1;"` |
| `#79` | `button` "Archived" | `ng-click="toggleArchivedRooms()"` |
| `#93` | `a` "New Room" | `ng-click="createNew()"` |
| `#96` | `a` "Add New Badge" | `ng-click="showAddBadge=!showAddBadge"` |
| `#98` | `a` "Export Badges" | `ng-click="exportBadges()"` |
| `#100` | `div.table-responsive` | `ng-init="showBadgeID=false"` |
| `#101` | `button` "Add Admin User" | `ng-click="showAddAdminUser=!showAddAdminUser"` |
| `#102` | `button` "Close Add Admin User" | `ng-click="showAddAdminUser=!showAddAdminUser"` |
| `#141` | `button` "Add New Badge" | `ng-click="addBadge(false)"` |
| `#142` | `button` "Save Edit for New Badge" | `ng-click="addBadge(true); showAddBadge=false;"` |
| `#143` | `button` "Close" | `ng-click="badges.badgeID=''; badges.mode='add'; showAddBadge=false;"` |
| `#149` | `form` | `ng-submit="addAdminUser()"` |
| `#163` | `button` "Transparent" | `ng-click="badges.bkcolor='rgba(1,0,0,0)';"` |
| `#179` | `button` "New Api key" | `ng-click="createApiKey()"` |
| `#185` | `th` "Session ID" | `ng-click="sortByUUID()"` |
| `#186` | `th` "Name" | `ng-click="sortByName()"` |
| `#198` | `th` "Badge" | `ng-dblclick="showBadgeID=!showBadgeID;"` |
| `#207` | `button` "Cancel" | `ng-click="showAddAdminUser=false; adminUser={name:'',email:'',password:'',perms:{}}"` |
| `#228` | `a` "Marketplace" | `ng-click="manageMarketplaceSession(s._id, s)"` |

Plus the two `ngf-*` pairs: `#15` and `#97`, both `ngf-select="ngf-select"`
`ngf-change="onImageSelect($files, '')"`.

---

## 9. REBUILD SPEC

### 9.1 Sessions search (the only visible field) — must be pixel-exact

```
container  div.col-md-4.panel.pane-default
           rect 351,134.8  380×36 ; padding 0 15px
           background #ffffff ; border 1px solid rgba(0,0,0,0) ; radius 4px
           box-shadow rgba(0,0,0,0.05) 0 1px 1px 0 ; margin-bottom 20px
input      type=text ; placeholder "search" ; bound to sessSearch
           rect 367,135.8  348×34
           padding 6px 18px ; border 1px solid #dbd9d9 ; radius 4px
           background #ffffff ; color #555555
           font 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif
           box-shadow 0 0 0 0 #000 ; outline-color #555555 ; cursor text
           transition border-color .15s, box-shadow .15s
```

Svelte 5: bind with `$state` + `bind:value`, and derive the filtered session list with `$derived`
(not `$effect`) — per the project landmine on per-keystroke `$effect`.

### 9.2 The three forms

* **Login form** — render only when logged out. No `action`/`method`; submit handler only.
  reCAPTCHA block is gated on `failedLoginCount >= 3`. Fields: email (`type=email`,
  placeholder `Your email`, `autocomplete="off"`, `autocorrect="off"`), password
  (`type=password`, placeholder `Your password`). Right-aligned "Forgot your password?" link to
  `#/page/forgot-password`. Full-width `btn-block btn-info` submit labelled "Login".
* **Badge editor** — gated on `showAddBadge`. Panel heading shows `"New Badge"` or `"Edit Badge"`
  by `badges.mode`. Two `<input type="color">` at `50×27`, a "Transparent" tiny button that sets
  `bkcolor` to `rgba(1,0,0,0)`, a bare text input for badge text (`value="TEST"` in this capture),
  an emoji trigger button (see 9.4), a bare name input, a 70×2 textarea for WP roles, then
  Add / Save / Close buttons all `pull-right`.
* **Add Admin User** — gated on `showAddAdminUser`. Three `required` fields
  (name / email / password), a `btn-primary` submit and a `btn-default` Cancel that resets
  `adminUser` to `{name:'',email:'',password:'',perms:{}}`.

### 9.3 Accessibility — deliberate divergence, flag it to the user

The reference has **zero** `<label for>` and **zero** `aria-*`. A faithful pixel rebuild can keep the
visual result identical while adding `for`/`id` pairs and `aria-label` on the six unlabelled inputs.
That is a **behavioural improvement, not a pixel change** — it must be an explicit, agreed
divergence, not a silent one.

### 9.4 `#emoji-picker` button

Reproduce as a real event handler. Do **not** reproduce the `id`-only, handler-less markup — that is
a jQuery-era wiring pattern and would be dead markup in Svelte.

### 9.5 Honest data

`badgeInputTxt` carries `value="TEST"` in this capture — that is **live captured state from the
logged-in owner's session**, not a design default. Do not hard-code `"TEST"` into the rebuild.
Ship the field empty with placeholder-only, or bind it to real data.

---

## 10. HONEST GAPS for this piece

1. **No screenshot exists in `prt2.json`.** `00-META.txt` lists 5 captures, four `fullDom`/diff and
   one `meta`; no image. Pixel-perfection for these forms cannot be *closed* from this dump — only
   the geometry and computed styles can. The only form-adjacent element with a real on-screen box is
   `#89`; everything else is `0×0` and its layout is asserted from computed style, not from a
   rendered box.
2. **`ng-class` on `<body>` is truncated at exactly 300 raw characters** (`nodes-000.txt:5`), ending
   mid-expression at `'in-app': !$state.includes`. The remaining layout classes are unknown.
3. **No `<head>`, no `<title>`.** The dump's root record `#0` is `<body>`. Any `<meta>`, favicon,
   or `<title>` is uncaptured.
4. **Controller state is not captured.** `badges.mode`, `showAddBadge`, `showAddAdminUser`,
   `failedLoginCount`, `loggingIn`, `adminUser`, `signup` — all inferred as falsy *only* from the
   resulting `ng-hide` classes, never read directly.
5. **`#196`'s `type` is genuinely absent**, not truncated — the record prints all three of its
   attributes (`class`, `placeholder`, `value`) and there are only three.
6. **The `ng-valid-required` anomaly on `#203`/`#205` is unexplained** (see §7). Left standing.
7. **`#badgesForm input { vertical-align: text-bottom; }`** (`09.css:2564`) targets an `id` that does
   not exist on any node in this capture. Either dead CSS or a build-version skew.
