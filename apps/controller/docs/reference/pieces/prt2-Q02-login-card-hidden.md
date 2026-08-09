# prt2 — Q02 — The logged-out login card (present in the DOM at `display:none`)

**Evidence base:** `/tmp/ptr-decode/prt2/caps/00-baseline-room/` (`DEFAULTS.txt`, `nodes-000.txt` … `nodes-007.txt`, 882 records, `truncated=false`).
**Page:** `https://protradingroom.com/ptrApp#/page/welcome` — the dual-purpose `page.welcome` route. Captured **logged in** (`role=member`), so the login card is in the DOM but hidden.

> **RESOLUTION NOTE.** prt2's `DEFAULTS.txt` COMMON table is skewed by the 635 Intercom emoji `<span>`s (`display:inline-table`, `visibility:hidden`, `width:30px`, `padding:5px`, `font-size:28px`, `line-height:30px`, `text-align:center`, `vertical-align:middle`, `cursor:pointer`, Apple-Color-Emoji font stack, `transition: transform 0.06s`). **All values below are RESOLVED ABSOLUTE values** — DEFAULTS.txt is not needed to read this file.

---

## 1. Purpose

This piece decodes the complete logged-out login UI of `page.welcome`: the Bootstrap `.panel` that is switched off by `ng-hide="login.isLoggedIn "` (note the **trailing space** inside the expression), including the email/password form with its FontAwesome feedback icons, the "Forgot your password?" link, the failed-login reCAPTCHA gate, the submit button and the "Logging In, please wait…" spinner. Every node is in the DOM and fully styled; none of it renders in this capture, so every rect is `0 × 0`.

## 2. Path anchor + record count

**Anchor:** `path=r.0.1.1.0.1` and all descendants.

```
cd /tmp/ptr-decode/prt2/caps/00-baseline-room
awk -v RS='' -v ORS='\n\n' '/path=r\.0\.1\.1\.0\.1\./' nodes-*.txt
```

**27 records found** (`#44`, `#50`, `#61`, `#62`, `#75`, `#76`, `#86`, `#87`, `#88`, `#106`–`#110`, `#124`–`#130`, `#156`, `#157`, `#158`, `#183`, `#184`, `#217`).
**Every one of the 27 has `rect: x=0 y=0 w=0 h=0`** — the whole subtree is layout-suppressed because the root `#44` resolves to `display: none`.

Sibling context: `r.0.1.1.0` is the Bootstrap `.container` (Q07). Its three children are
`r.0.1.1.0.0` = the logged-in dashboard (`.center-block.mt-xl`, Q03–Q06),
`r.0.1.1.0.1` = **this login card**,
`r.0.1.1.0.2` = the `ng-include` footer (Q07).

---

## 3. Node table

| # | path | tag | id | class (verbatim) | rect | renders? |
|---|---|---|---|---|---|---|
| 44 | `r.0.1.1.0.1` | `div` | — | `panel ng-hide` | 0,0 0×0 | **no** — `display:none` (root of the hidden card) |
| 50 | `r.0.1.1.0.1.0` | `div` | — | `panel-body` | 0,0 0×0 | no (inside hidden root) |
| 61 | `r.0.1.1.0.1.0.0` | `p` | — | `pv text-bold` | 0,0 0×0 | no |
| 62 | `r.0.1.1.0.1.0.1` | `form` | — | `ng-pristine ng-valid ng-valid-email` | 0,0 0×0 | no |
| 75 | `r.0.1.1.0.1.0.1.0` | `div` | — | `row` | 0,0 0×0 | no |
| 76 | `r.0.1.1.0.1.0.1.1` | `div` | — | `div ng-hide` | 0,0 0×0 | **no** — second, independent `display:none` (`ng-show="loggingIn"`) |
| 86 | `r.0.1.1.0.1.0.1.0.0` | `div` | — | `col-md-6` | 0,0 0×0 | no |
| 87 | `r.0.1.1.0.1.0.1.1.0` | `img` | — | *(no class)* | 0,0 0×0 | no |
| 88 | `r.0.1.1.0.1.0.1.1.1` | `label` | — | *(no attributes at all)* | 0,0 0×0 | no |
| 106 | `r.0.1.1.0.1.0.1.0.0.0` | `div` | — | `form-group has-feedback mb` | 0,0 0×0 | no |
| 107 | `r.0.1.1.0.1.0.1.0.0.1` | `br` | — | *(no attributes at all)* | 0,0 0×0 | no |
| 108 | `r.0.1.1.0.1.0.1.0.0.2` | `div` | — | `form-group has-feedback` | 0,0 0×0 | no |
| 109 | `r.0.1.1.0.1.0.1.0.0.3` | `div` | — | `form-group has-feedback ng-hide` | 0,0 0×0 | **no** — third, independent `display:none` (`ng-show="failedLoginCount >= 3"`) |
| 110 | `r.0.1.1.0.1.0.1.0.0.4` | `div` | — | `form-group has-feedback` | 0,0 0×0 | no |
| 124 | `r.0.1.1.0.1.0.1.0.0.0.0` | `input` | **`exampleInputEmail1`** | `form-control ng-pristine ng-untouched ng-valid ng-valid-email` | 0,0 0×0 | no |
| 125 | `r.0.1.1.0.1.0.1.0.0.0.1` | `span` | — | `fa fa-envelope form-control-feedback text-muted` | 0,0 0×0 | no |
| 126 | `r.0.1.1.0.1.0.1.0.0.2.0` | `input` | **`exampleInputPassword1`** | `form-control ng-pristine ng-untouched ng-valid` | 0,0 0×0 | no |
| 127 | `r.0.1.1.0.1.0.1.0.0.2.1` | `span` | — | `fa fa-lock form-control-feedback text-muted` | 0,0 0×0 | no |
| 128 | `r.0.1.1.0.1.0.1.0.0.2.2` | `div` | — | `text-right mt` | 0,0 0×0 | no |
| 129 | `r.0.1.1.0.1.0.1.0.0.3.0` | `div` | — | `g-recaptcha` | 0,0 0×0 | no |
| 130 | `r.0.1.1.0.1.0.1.0.0.4.0` | `button` | — | `btn btn-block btn-info mb` | 0,0 0×0 | no |
| 156 | `r.0.1.1.0.1.0.1.0.0.2.2.0` | `a` | — | `text-muted` | 0,0 0×0 | no |
| 157 | `r.0.1.1.0.1.0.1.0.0.3.0.0` | `div` | — | *(no class)* | 0,0 0×0 | no |
| 158 | `r.0.1.1.0.1.0.1.0.0.3.0.1` | `iframe` | — | *(no class)* | 0,0 0×0 | **no** — own `style="display: none;"` |
| 183 | `r.0.1.1.0.1.0.1.0.0.3.0.0.0` | `div` | — | *(no attributes at all)* | 0,0 0×0 | no |
| 184 | `r.0.1.1.0.1.0.1.0.0.3.0.0.1` | `textarea` | **`g-recaptcha-response-4`** | `g-recaptcha-response` | 0,0 0×0 | **no** — own `style="… display: none;"` |
| 217 | `r.0.1.1.0.1.0.1.0.0.3.0.0.0.0` | `iframe` | — | *(no class)* | 0,0 0×0 | no |

DOM ordering note: the `<form>` `#62` has **two** children — `#75` (`.row`, the actual form) and `#76` (the "logging in" spinner). Inside `#86` (`.col-md-6`) the five children are, in order: `#106` email group, `#107` `<br>`, `#108` password group, `#109` reCAPTCHA group, `#110` submit group.

---

## 4. Every attribute, verbatim

### `#44` `r.0.1.1.0.1` `<div>` — **the hide switch**
```
class   = "panel ng-hide"
ng-hide = "login.isLoggedIn "
```
> ⚠️ **Recorded verbatim: the `ng-hide` expression is `"login.isLoggedIn "` — with a TRAILING SPACE before the closing quote.** This is exactly how it appears in the dump (`nodes-000.txt` `#44`). It is harmless to AngularJS (the parser trims), but it is a real artefact of the reference template and is reproduced here as required. Contrast with the *logged-in* sibling `#49` `r.0.1.1.0.0.0`, whose expression is `ng-show="login.isLoggedIn"` **without** a trailing space, and with the navbar `<ul>` `#42`, also `ng-show="login.isLoggedIn"` without a trailing space. The trailing space appears **only** on this one binding in the entire 882-node capture.

### `#50` `<div class="panel-body">`
```
class = "panel-body"
::before { content: "\" \"" (U+0022 U+0020 U+0022); color: rgb(51, 51, 51); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 14px; background-color: rgba(0, 0, 0, 0) }
::after  { identical }
```

### `#61` `<p class="pv text-bold">`
```
class = "pv text-bold"
text  = "Login to your ProTradingRoom.com account"
```

### `#62` `<form>`
```
role      = "form"
class     = "ng-pristine ng-valid ng-valid-email"
ng-submit = "submitLogin()"
```

### `#75` `<div class="row">`
```
class = "row"
::before / ::after : content "\" \"", color rgb(51,51,51), "Helvetica Neue" 14px, bg rgba(0,0,0,0)
```

### `#76` `<div>` — the "logging in" overlay
```
ng-show = "loggingIn"
style   = "padding: 25px; text-align: center"
class   = "div ng-hide"
```
(Note the literal class token `div`.)

### `#86` `<div class="col-md-6">`
```
class = "col-md-6"
```

### `#87` `<img>`
```
src = "app/img/ajax_loader.gif"
```
⚠️ Relative URL with **no leading slash** — resolves against the AngularJS base, i.e. `https://protradingroom.com/app/img/ajax_loader.gif`. No `width`/`height` attributes → CLS risk if ported as-is.

### `#88` `<label>`
```
attrs: (none)
text: "Logging In, please wait..."
```
**There is no `for` attribute — and there is no `<label for=…>` anywhere in the entire 882-node capture.** (Verified: 5 `<label>` elements total — `#88`, `#138`, `#200`, `#202`, `#204` — none has `for`.)

### `#106` / `#108` / `#109` / `#110` — the four form groups
```
#106  class = "form-group has-feedback mb"
#107  attrs: (none)                              ← <br>
#108  class = "form-group has-feedback"
#109  class   = "form-group has-feedback ng-hide"
      ng-show = "failedLoginCount >= 3"
#110  class = "form-group has-feedback"
```

### `#124` `<input id="exampleInputEmail1">`
```
id           = "exampleInputEmail1"
type         = "email"
placeholder  = "Your email"
autocomplete = "off"
class        = "form-control ng-pristine ng-untouched ng-valid ng-valid-email"
ng-model     = "signup.email"
autocorrect  = "off"
```
(No `value` attribute — the field is empty/pristine.)

### `#125` `<span class="fa fa-envelope form-control-feedback text-muted">`
```
class = "fa fa-envelope form-control-feedback text-muted"
::before { content: "" (U+F0E0, FontAwesome fa-envelope); color: rgb(119, 119, 119); font-family: FontAwesome; font-size: 14px; background-color: rgba(0, 0, 0, 0) }
```

### `#126` `<input id="exampleInputPassword1">`
```
id          = "exampleInputPassword1"
type        = "password"
placeholder = "Your password"
class       = "form-control ng-pristine ng-untouched ng-valid"
ng-model    = "signup.pass"
```
(No `autocomplete`, no `value`.)

### `#127` `<span class="fa fa-lock form-control-feedback text-muted">`
```
class = "fa fa-lock form-control-feedback text-muted"
::before { content: "" (U+F023, FontAwesome fa-lock); color: rgb(119, 119, 119); font-family: FontAwesome; font-size: 14px; background-color: rgba(0, 0, 0, 0) }
```

### `#128` `<div class="text-right mt">`
```
class = "text-right mt"
```

### `#156` `<a class="text-muted">`
```
ui-sref = "page.forgot-password"
class   = "text-muted"
href    = "#/page/forgot-password"
text    = "Forgot your password?"
```

### `#129` `<div class="g-recaptcha">`
```
class        = "g-recaptcha"
data-sitekey = "6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx"
```
This is a **public** reCAPTCHA v2 site key; safe to hard-code (unlike the JWT in Q03).

### `#157` `<div>` (reCAPTCHA-injected sizing wrapper)
```
style = "width: 304px; height: 78px;"
```

### `#183` `<div>` (reCAPTCHA-injected)
```
attrs: (none)
```

### `#217` `<iframe title="reCAPTCHA">` (the anchor widget)
```
title       = "reCAPTCHA"
width       = "304"
height      = "78"
role        = "presentation"
name        = "a-4ecrn9oay2le"
frameborder = "0"
scrolling   = "no"
sandbox     = "allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation allow-modals allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
src         = "https://www.google.com/recaptcha/api2/anchor?ar=1&k=6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx&co=aHR0cHM6Ly9wcm90cmFkaW5ncm9vbS5jb206NDQz&hl=en&v=A7KpaEASfhDcK0nXxgQEyyYv&size=normal&anchor-ms=20000&execute-ms=30000&cb=b47umiriyero"
```
(`co=` decodes from base64 to `https://protradingroom.com:443`.)

### `#184` `<textarea id="g-recaptcha-response-4">`
```
id    = "g-recaptcha-response-4"
name  = "g-recaptcha-response"
class = "g-recaptcha-response"
style = "width: 250px; height: 40px; border: 1px solid rgb(193, 193, 193); margin: 10px 25px; padding: 0px; resize: none; display: none;"
```

### `#158` `<iframe>` (reCAPTCHA hidden helper)
```
style = "display: none;"
```

### `#130` `<button>` — submit
```
type  = "submit"
class = "btn btn-block btn-info mb"
text  = "Login"
```

---

## 5. Resolved computed style — every node (absolute values)

Nothing in this subtree paints (all rects `0 × 0`), but the resolved styles below are exactly what the browser computed and are what the rebuild must reproduce **when `login.isLoggedIn` is false**.

### `#44` `div.panel.ng-hide` — the card
| prop | value |
|---|---|
| **display** | **`none`** |
| visibility | `visible` |
| position / float | `static` / `none` |
| width / height | `auto` / `auto` |
| margin T/R/B/L | `0px / 0px / 20px / 0px` |
| padding T/R/B/L | `0px / 0px / 0px / 0px` |
| border-width T/R/B/L | `1px / 1px / 1px / 1px` |
| border-style T/R/B/L | `solid / solid / solid / solid` |
| border-color T/R/B/L | `rgba(0, 0, 0, 0)` ×4 (fully transparent border) |
| radius TL/TR/BL/BR | `4px / 4px / 4px / 4px` |
| background-color | `rgb(255, 255, 255)` |
| color | `rgb(51, 51, 51)` |
| font-family / size / weight | `"Helvetica Neue", Helvetica, Arial, sans-serif` / `14px` / `400` |
| line-height | `20px` |
| letter-spacing / text-align / vertical-align | `normal` / `start` / `baseline` |
| white-space / overflow | `normal` / `visible`, `visible` |
| opacity | `1` |
| **box-shadow** | **`rgba(0, 0, 0, 0.05) 0px 1px 1px 0px`** |
| cursor | `auto` |

### `#50` `div.panel-body`
`display:block` · `visible` · `static` · width/height `auto` · margin `0`×4 · **padding `15px`×4** · border `0px`/`none`/`rgb(51,51,51)` ×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`. Clearfix `::before`/`::after`.

### `#61` `p.pv.text-bold`
`display:block` · `visible` · `static` · width/height `auto` · margin `0 / 0 / 10px / 0` · **padding `10px / 0 / 10px / 0`** (`.pv` = padding vertical) · border `0`/`none`/`rgb(51,51,51)` ×4 · radius `0` ×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · font Helvetica `14px` / **`700`** / `20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.

### `#62` `form[role=form]`
`display:block` · `visible` · `static` · `auto`/`auto` · margin `0`×4 · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.

### `#75` `div.row`
`display:block` · `visible` · `static` · `auto`/`auto` · **margin `0 / -15px / 0 / -15px`** · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`. Clearfix pseudos.

### `#76` `div.div.ng-hide` — the spinner overlay
**`display:none`** · `visibility:visible` · `static` · `auto`/`auto` · margin `0`×4 · **padding `25px`×4** · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · **`text-align: center`** (from the inline style; note this coincides with the emoji-skewed COMMON value, but here the inline `text-align: center` makes it authoritative) · vertical-align `baseline` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.

### `#86` `div.col-md-6`
`display:block` · `visible` · **`position:relative`** · **`float:left`** · **`width:50%`** · height `auto` · **`min-height:1px`** · margin `0`×4 · **padding `0 / 15px / 0 / 15px`** · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.

### `#87` `img[src="app/img/ajax_loader.gif"]`
`display:inline` · `visible` · `static` · width/height `auto` · margin `0`×4 · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align **`center`** (inherited from `#76`'s inline centre) · **vertical-align `middle`** · white-space `normal` · **overflow-x/-y `clip`/`clip`** · opacity `1` · box-shadow `none` · **cursor `pointer`** · object-fit `fill`.

### `#88` `label` "Logging In, please wait..."
`display:inline-block` · `visible` · `static` · width `auto` · **`max-width:100%`** · margin `0 / 0 / 5px / 0` · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px` / **`700`** / `20px` · text-align **`center`** (inherited) · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · **cursor `default`**.

### `#106` `div.form-group.has-feedback.mb`
`display:block` · `visible` · **`position:relative`** · `auto`/`auto` · margin `0 / 0 / **10px** / 0` · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.

### `#107` `br`
`display:inline` · `visible` · `static` · `auto`/`auto` · margin `0`×4 · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · cursor `auto`.

### `#108` / `#110` `div.form-group.has-feedback`
Identical to `#106` except **`margin-bottom: 15px`** (Bootstrap default, not `.mb`).

### `#109` `div.form-group.has-feedback.ng-hide`
Identical to `#108` except **`display: none`**.

### `#124` `input#exampleInputEmail1.form-control` and `#126` `input#exampleInputPassword1.form-control`
Both resolve identically:
| prop | value |
|---|---|
| display / visibility | `block` / `visible` |
| position / float | `static` / `none` |
| **width / height** | **`100%` / `34px`** |
| margin T/R/B/L | `0px`×4 |
| **padding T/R/B/L** | **`6px / 42.5px / 6px / 18px`** (the 42.5px right pad is `.has-feedback` making room for the icon) |
| border-width / style | `1px`×4 / `solid`×4 |
| **border-colour** | **`rgb(219, 217, 217)`**×4 |
| radius | `4px`×4 |
| background-color | `rgb(255, 255, 255)` |
| **color** | **`rgb(85, 85, 85)`** |
| font-family / size / weight | `"Helvetica Neue", …` / `14px` / `400` |
| line-height | `20px` |
| letter-spacing / text-align / vertical-align | `normal` / `start` / `baseline` |
| white-space / overflow-x/-y | `normal` / `clip` / `clip` |
| opacity | `1` |
| **box-shadow** | **`rgb(0, 0, 0) 0px 0px 0px 0px`** (a zero-spread shadow — Bootstrap's `inset` reset resolved) |
| **cursor** | **`text`** |
| outline-color | `rgb(85, 85, 85)` |
| **transition** | **`border-color 0.15s, box-shadow 0.15s`** |

### `#125` `span.fa.fa-envelope.form-control-feedback.text-muted` and `#127` `span.fa.fa-lock.form-control-feedback.text-muted`
Both resolve identically:
`display:block` · `visible` · **`position:absolute`, `top:10px`, `right:0px`, `bottom:auto`, `left:auto`, `z-index:2`** · float `none` · **`width:34px` `height:34px`** · margin `0`×4 · padding `0`×4 · border-width `0`×4 / style `none`×4 / **colour `rgb(119, 119, 119)`×4** · radius `0`×4 · bg `rgba(0,0,0,0)` · **color `rgb(119, 119, 119)`** · **font-family `FontAwesome`** / `14px` / `400` · **line-height `14px`** · letter-spacing `normal` · **text-align `center`** · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto` · **`pointer-events: none`**.
`::before` glyph: `#125` = **U+F0E0** (`fa-envelope`), `#127` = **U+F023** (`fa-lock`); both `color: rgb(119,119,119)`, `font-family: FontAwesome`, `font-size: 14px`.

> ⚠️ `top: 10px` (not `0`) is the resolved value — this is what vertically parks the 34×34 icon over the 34px-tall input inside the `.form-group` that also has a label-less layout. Reproduce `top:10px` exactly.

### `#128` `div.text-right.mt`
`display:block` · `visible` · `static` · `auto`/`auto` · margin `10px / 0 / 0 / 0` · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · **`text-align: right`** · vertical-align `baseline` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.

### `#156` `a.text-muted[href="#/page/forgot-password"]`
`display:inline` · `visible` · `static` · `auto`/`auto` · margin `0`×4 · padding `0`×4 · border-width `0`×4 / style `none`×4 / colour **`rgb(119, 119, 119)`**×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · **color `rgb(119, 119, 119)`** · Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · **text-align `right`** (inherited) · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · **cursor `pointer`** · outline-color `rgb(119,119,119)`.

### `#129` `div.g-recaptcha`
`display:block` · `visible` · `static` · `auto`/`auto` · margin `0`×4 · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · cursor `auto`.

### `#157` `div[style="width: 304px; height: 78px;"]`
`display:block` · `visible` · `static` · **`width:304px` `height:78px`** · margin `0`×4 · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · cursor `auto`.

### `#183` `div` (unattributed reCAPTCHA wrapper)
`display:block` · `visible` · `static` · `auto`/`auto` · margin `0`×4 · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · cursor `auto`.

### `#217` `iframe[title="reCAPTCHA"]`
`display:inline` · `visible` · `static` · **`width:304px` `height:78px`** · margin `0`×4 · padding `0`×4 · border-width `0`×4 / **style `inset`×4** / colour `rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · **overflow-x/-y `clip`/`clip`** · opacity `1` · box-shadow `none` · cursor `auto`.

### `#184` `textarea#g-recaptcha-response-4`
**`display:none`** · `visible` · `static` · **`width:250px` `height:40px`** · **margin `10px / 25px / 10px / 25px`** · padding `0`×4 · border-width `1px`×4 / style `solid`×4 / colour **`rgb(193, 193, 193)`**×4 · radius `0`×4 · bg `rgb(255, 255, 255)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · **white-space `pre-wrap`**, **overflow-wrap `break-word`** · vertical-align `baseline` · overflow-x/-y `auto`/`auto` · opacity `1` · box-shadow `none` · **cursor `text`** · **`appearance: auto`**, `resize: none`.

### `#158` `iframe[style="display: none;"]`
**`display:none`** · `visible` · width/height `auto` · margin `0`×4 · padding `0`×4 · border-width **`2px`**×4 / style **`inset`**×4 / colour `rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · overflow-x/-y `clip`/`clip` · cursor `auto`.

### `#130` `button.btn.btn-block.btn-info.mb` — Login
| prop | value |
|---|---|
| display / visibility | `block` / `visible` |
| position / float | `static` / `none` |
| **width / height** | **`100%`** / `auto` |
| margin T/R/B/L | `0px / 0px / **10px** / 0px` |
| padding T/R/B/L | `6px / 12px / 6px / 12px` |
| border-width / style | `1px`×4 / `solid`×4 |
| **border-colour** | **`rgb(70, 184, 218)`**×4 |
| radius | `4px`×4 |
| **background-color** | **`rgb(91, 192, 222)`** |
| **color** | **`rgb(255, 255, 255)`** |
| font-family / size / weight | `"Helvetica Neue", …` / `14px` / `400` |
| line-height | `20px` |
| letter-spacing / text-align / vertical-align | `normal` / `center` / `middle` |
| **white-space** | **`nowrap`** |
| overflow | `visible` |
| opacity / box-shadow | `1` / `none` |
| **cursor** | **`pointer`** |
| **user-select** | **`none`** |
| outline-color | `rgb(255, 255, 255)` |

---

## 6. Verbatim text (every string, with path)

| path | element | text (verbatim) |
|---|---|---|
| `r.0.1.1.0.1.0.0` | `p.pv.text-bold` | `Login to your ProTradingRoom.com account` |
| `r.0.1.1.0.1.0.1.0.0.0.0` | `input#exampleInputEmail1` | *(placeholder)* `Your email` |
| `r.0.1.1.0.1.0.1.0.0.2.0` | `input#exampleInputPassword1` | *(placeholder)* `Your password` |
| `r.0.1.1.0.1.0.1.0.0.2.2.0` | `a.text-muted` | `Forgot your password?` |
| `r.0.1.1.0.1.0.1.0.0.4.0` | `button[type=submit]` | `Login` |
| `r.0.1.1.0.1.0.1.1.1` | `label` | `Logging In, please wait...` (three ASCII full stops, **not** an ellipsis character) |
| `r.0.1.1.0.1.0.1.0.0.0.1` | `span.fa-envelope` | *(glyph only)* U+F0E0 |
| `r.0.1.1.0.1.0.1.0.0.2.1` | `span.fa-lock` | *(glyph only)* U+F023 |

**No text in this subtree is truncated** — the longest string is 40 characters, well under the dumper's 250-char cap. The only truncated value in this subtree is none; all attribute values are under the 300-char cap except the reCAPTCHA `src` on `#217`, which measures 246 chars and is complete.

---

## 7. Rebuild spec (pixel-for-pixel)

```html
<!-- r.0.1.1.0.1 — rendered ONLY when NOT logged in -->
<div class="panel" hidden={loggedIn}>            <!-- reference: ng-hide="login.isLoggedIn " -->
  <div class="panel-body">

    <p class="pv text-bold">Login to your ProTradingRoom.com account</p>

    <form role="form" on:submit|preventDefault={submitLogin}>
      <div class="row">
        <div class="col-md-6">

          <div class="form-group has-feedback mb">
            <input id="exampleInputEmail1" type="email" placeholder="Your email"
                   autocomplete="off" autocorrect="off" class="form-control"
                   bind:value={signup.email}>
            <span class="fa fa-envelope form-control-feedback text-muted"></span>
          </div>

          <br>

          <div class="form-group has-feedback">
            <input id="exampleInputPassword1" type="password" placeholder="Your password"
                   class="form-control" bind:value={signup.pass}>
            <span class="fa fa-lock form-control-feedback text-muted"></span>
            <div class="text-right mt">
              <a class="text-muted" href="#/page/forgot-password">Forgot your password?</a>
            </div>
          </div>

          <!-- shown only after 3 failed logins -->
          <div class="form-group has-feedback" hidden={failedLoginCount < 3}>
            <div class="g-recaptcha" data-sitekey="6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx"></div>
          </div>

          <div class="form-group has-feedback">
            <button type="submit" class="btn btn-block btn-info mb">Login</button>
          </div>

        </div>
      </div>

      <div class="div" style="padding:25px; text-align:center" hidden={!loggingIn}>
        <img src="/app/img/ajax_loader.gif" width="32" height="32" alt="">
        <label>Logging In, please wait...</label>
      </div>
    </form>

  </div>
</div>
```

```css
/* All values are the RESOLVED computed values from the capture. */
.panel               { display:block; margin:0 0 20px; padding:0;
                       border:1px solid rgba(0,0,0,0); border-radius:4px;
                       background:#fff; box-shadow:rgba(0,0,0,.05) 0 1px 1px 0;
                       color:#333; font:400 14px/20px "Helvetica Neue",Helvetica,Arial,sans-serif;
                       text-align:start; }
.panel-body          { display:block; padding:15px; }
.panel-body::before, .panel-body::after,
.row::before, .row::after { content:" "; display:table; }
.panel-body::after, .row::after { clear:both; }

.pv.text-bold        { display:block; margin:0 0 10px; padding:10px 0; font-weight:700; }

.row                 { display:block; margin:0 -15px; padding:0; }
.col-md-6            { position:relative; float:left; width:50%; min-height:1px;
                       margin:0; padding:0 15px; }

.form-group.has-feedback     { position:relative; margin:0 0 15px; padding:0; }
.form-group.has-feedback.mb  { margin-bottom:10px; }

.form-control        { display:block; width:100%; height:34px;
                       margin:0; padding:6px 18px;
                       border:1px solid rgb(219,217,217); border-radius:4px;
                       background:#fff; color:#555; outline-color:#555;
                       font:400 14px/20px "Helvetica Neue",Helvetica,Arial,sans-serif;
                       text-align:start; overflow:clip;
                       box-shadow:rgb(0,0,0) 0 0 0 0; cursor:text;
                       transition:border-color .15s, box-shadow .15s; }
.has-feedback .form-control { padding-right:42.5px; }   /* resolved 42.5px, not 34px */

.form-control-feedback { display:block; position:absolute; top:10px; right:0; z-index:2;
                       width:34px; height:34px; margin:0; padding:0;
                       color:#777; border-color:#777; outline-color:#777;
                       font-family:FontAwesome; font-size:14px; line-height:14px;
                       text-align:center; pointer-events:none; }
.fa-envelope::before { content:"\f0e0"; }
.fa-lock::before     { content:"\f023"; }

.text-right.mt       { display:block; margin-top:10px; text-align:right; }
a.text-muted         { display:inline; color:#777; border-color:#777; outline-color:#777;
                       text-align:right; cursor:pointer; }

.btn                 { display:inline-block; margin:0; padding:6px 12px;
                       border:1px solid transparent; border-radius:4px;
                       font:400 14px/20px "Helvetica Neue",Helvetica,Arial,sans-serif;
                       text-align:center; vertical-align:middle; white-space:nowrap;
                       cursor:pointer; user-select:none; }
.btn-block           { display:block; width:100%; }
.btn-info            { background:rgb(91,192,222); border-color:rgb(70,184,218);
                       color:#fff; outline-color:#fff; }
.mb                  { margin-bottom:10px; }

.div                 { display:block; padding:25px; text-align:center; }
.div label           { display:inline-block; max-width:100%; margin:0 0 5px;
                       font-weight:700; cursor:default; }
.div img             { display:inline; vertical-align:middle; overflow:clip; cursor:pointer; }
```

Geometry that must be reproduced when the card is shown (the capture gives every box's intrinsic sizing but no positions, because it never laid out):
* card = `.panel` inside the 1170px `.container` → 1140px content width (see Q07), `border-radius:4px`, transparent 1px border, `box-shadow rgba(0,0,0,.05) 0 1px 1px 0`.
* `.panel-body` 15px pad → 1110px inner; `.row` `-15px` gutters → 1140px; `.col-md-6` = 570px with 15px pads → **540px of form content**.
* Each `.form-control` is `100% × 34px`; feedback icon is `34 × 34` at `top:10px; right:0`.
* Submit button is `.btn-block` = 100% width, `padding:6px 12px`, `background rgb(91,192,222)`, `border rgb(70,184,218)`, `color #fff`, `border-radius:4px`, `margin-bottom:10px`.

---

## 8. Honest gaps

1. **No layout evidence.** Every node here has `rect 0×0` because the card is `display:none`. Widths like `540px` above are *derived* from the container arithmetic in Q07 plus the captured `%`/`px` computed values — they are **not** measured boxes. A screenshot of the logged-out route would be required to verify the card pixel-for-pixel; that route was not captured.
2. **`ajax_loader.gif` is not in the dump** — only the relative URL `app/img/ajax_loader.gif`. Its intrinsic dimensions are unknown (`width`/`height` computed to `auto`); the `width="32" height="32"` in the rebuild is a **placeholder to prevent CLS**, not evidence.
3. **The reCAPTCHA widget's own visual** is inside a cross-origin iframe (`#217`) and is not captured. Only its 304 × 78 box is evidence.
4. **No `:hover` / `:focus` / `:invalid` / error states** were captured for the inputs or the button. The AngularJS classes present (`ng-pristine ng-untouched ng-valid ng-valid-email`) tell us the form was untouched; the `ng-dirty` / `ng-invalid` styling is unknown.
5. **The `failedLoginCount >= 3` branch (`#109`) is hidden**, so the reCAPTCHA group's laid-out height (it would push the submit button down by 78px + 15px margin) is unverified.
6. **The `<p>` copy is the only prose** — there is no heading, logo or legal text inside the card in this capture. If the live logged-out page has more, it is not in this evidence.
7. **`<label for>`**: the reference has **no** `for` attribute on any label, and the two inputs carry `id`s that nothing references. The rebuild above preserves the reference exactly; if accessibility is a goal, adding `for=` is a deliberate *deviation* from pixel-parity and must be signed off.
