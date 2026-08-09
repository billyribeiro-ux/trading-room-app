# prt2 — Q10 · The Intercom-classed emoji picker

**Purpose.** Decode the emoji-picker subtree that accounts for the overwhelming majority of this
capture's node count: its container chain, its resolved styles, its exact glyph count, and its full
glyph inventory. Establish, from evidence only, **what it actually is** — because the prior report's
characterisation of it does not survive the raw slices.

**Evidence root.** `/tmp/ptr-decode/prt2/`
**Capture.** `caps/00-baseline-room/` — 882 records, `truncated=false`.
**Path anchor.** `r.0.1.1.0.0.0.0.5.0.1.1` → **655 records (#116 … #881)**, i.e.
**74.26 % of the entire 882-record capture**.
**Supporting sheet.** `01-stylesheets/14.css` — 15 rules, `href=(inline)` (`00-META.txt:38`).

---

## ⛔ 1. HEADLINE CORRECTION — this is NOT runtime-injected third-party DOM

The prompt asks me to "state clearly that this is injected third-party DOM and NOT part of the app's
own UI". **The evidence does not support that statement, and I will not assert it.** What the
evidence supports is a materially different claim, which I set out with citations below.

### 1.1 The Intercom Messenger is not loaded on this page — at all

Every `<script src>` in the capture (11 of the 12 `<script>` records carry a `src`; the other two are
inline). Complete list, `nodes-000.txt` records `#2 #4 #5 #6 #7 #8 #9 #10 #11 #34` + the three
reCAPTCHA frames and two images:

```
/public/dist/vendor.min.js?v=2.18.100
https://cdnjs.cloudflare.com/ajax/libs/adapterjs/0.15.5/adapter.min.js
/public/vendor/janus3.js?v=2.18.100
//vjs.zencdn.net/7.3.0/video.min.js
//cdnjs.cloudflare.com/ajax/libs/videojs-youtube/2.6.0/Youtube.min.js
https://cdnjs.cloudflare.com/ajax/libs/angularjs-toaster/2.2.0/toaster.min.js
https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.4.0/sockjs.min.js
https://w.soundcloud.com/player/api.js
/public/dist/app.min.js?v=1784623769671
https://www.google.com/recaptcha/api.js
```

**There is no `widget.intercom.io`, no `js.intercomcdn.com/…/shim.js`, no `app.intercom.io`, no
Intercom snippet of any kind.** A repo-wide grep of the decoded capture for
`intercom-container|intercom-launcher|intercom-frame|intercom-app|widget.intercom|intercom.io|intercomcdn`
returns **exactly one hit**, and it is a CSS background-image URL, not a script or a container:

```
caps/00-baseline-room/nodes-001.txt:2156
    background-image: url("https://js.intercomcdn.com/images/search@2x.9f02b9f3.png")
```

Injected Intercom DOM always arrives inside `div#intercom-container` / `iframe.intercom-*` at
`<body>` level. Neither exists here. The five iframes in the capture are all Google reCAPTCHA
(`prt2-Q09-iframes-recaptcha.md`).

### 1.2 The markup lives inside the app's own AngularJS template

Container chain, decoded record by record:

```
r.0.1.1.0.0.0.0.5        <div class="row">                                  #68  rect 351,397.2 1140×126
r.0.1.1.0.0.0.0.5.0      <div class="panel panel-default col-md-6 ng-hide"  #82  display:none
                              ng-show="showAddBadge">      ← APP Angular directive
r.0.1.1.0.0.0.0.5.0.1    <div class="panel-body">                           #95
r.0.1.1.0.0.0.0.5.0.1.0  <form class="ng-pristine ng-valid">                #115 ← the badge editor
r.0.1.1.0.0.0.0.5.0.1.1  <div class="intercom-composer-popover              #116 ← THE PICKER
                                     intercom-composer-emoji-popover">
```

The picker is the **second child of the badge editor's `.panel-body`**, sibling of the app's own
`<form>`, inside a Bootstrap `.panel.panel-default.col-md-6` that is gated by the app's own
`ng-show="showAddBadge"`. Runtime-injected third-party DOM does not get parented four levels inside
an Angular-gated Bootstrap panel.

Its trigger is the app's own `button#emoji-picker.btn.btn-default.btn-sm` (`#168`,
`r.0.1.1.0.0.0.0.5.0.1.0.0.7`) with a `<i class="fa fa-smile-o fa-1x">` (`#195`,
`::before content ""`) — a FontAwesome icon inside a Bootstrap button, inside the app's form.

### 1.3 The app ships the picker's CSS itself, in its own inline `<style>`

`01-stylesheets/14.css` (`href=(inline)`, 15 rules) is the serialisation of record
**`#32 path=r.0.1.0 <style class="ng-scope">`** (`nodes-000.txt:926-929`). Its captured text preview
begins `body {\n overflow: auto;\n}\n\n .intercom-composer-popover-input {…` — matching `14.css`'s
first two rules exactly. `class="ng-scope"` proves AngularJS compiled it, i.e. **it is part of an app
view template**, not an injected `<style>` in `<head>`.

That sheet defines every one of the picker's classes:

| selector | declarations (verbatim from `14.css`) |
|---|---|
| `.intercom-composer-popover` | `z-index: 2147483003; position: absolute; bottom: 50px; right: calc(50% - 390px); box-shadow: rgba(0, 0, 0, 0.08) 0px 1px 15px 1px; background-color: rgb(255, 255, 255); border-radius: 6px; transform-style: flat; transform-origin: 50% 50% 0px; opacity: 0; transition: 0.2s linear; visibility: hidden;` |
| `.intercom-composer-popover.active` | `visibility: visible; opacity: 1; bottom: 145px;` |
| `.intercom-emoji-picker` | `width: 330px; height: 260px;` |
| `.intercom-composer-popover-header` | `position: absolute; top: 0px; left: 20px; right: 20px; height: 40px; border-bottom: 1px solid rgb(237, 239, 241);` |
| `.intercom-composer-popover-input` | `background-size: 16px 16px; background-repeat: no-repeat; background-position: 0px 12px; font-weight: 400; font-size: 14px; color: rgb(110, 122, 137); padding-left: 25px; height: 40px; width: 100%; box-sizing: border-box; background-image: url("https://js.intercomcdn.com/images/search@2x.9f02b9f3.png"); border-width: medium; border-style: none; border-color: currentcolor; border-image: none; outline: none;` |
| `.intercom-composer-popover-body` | `position: absolute; inset: 40px 0px 5px; padding: 0px 20px; overflow-y: scroll;` |
| `.intercom-emoji-picker-group` | `margin: 10px -5px;` — **declared twice, identically, in the same sheet** |
| `.intercom-emoji-picker-group-title` | `color: rgb(184, 195, 202); font-weight: 400; font-size: 13px; margin: 5px;` |
| `.intercom-emoji-picker-emoji` | `padding: 5px; width: 30px; line-height: 30px; display: inline-table; text-align: center; cursor: pointer; vertical-align: middle; font-size: 28px; transition: transform 60ms ease-out 60ms, -webkit-transform 60ms ease-out; font-family: "Apple Color Emoji", "Segoe UI Emoji", NotoColorEmoji, "Segoe UI Symbol", "Android Emoji", EmojiSymbols;` |
| `.intercom-emoji-picker-emoji:hover` | `transition-delay: 0ms; transform: scale(1.4);` |
| `.intercom-composer-popover-caret` | `position: absolute; bottom: -8px; right: 0px; width: 0px; height: 0px; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid rgb(255, 255, 255); left: 20px;` |

Plus a 12th, unrelated app rule in the same sheet: `.chat-input-tool { background-color: rgb(50, 168, 230); … }`.

### 1.4 The app's *main* stylesheet overrides the picker's position

`01-stylesheets/09.css` — `https://protradingroom.com/public/app/css/styles.css`, the app's own
2290-rule sheet — contains, at **lines 1251 and 2521** (the file ships its content twice; see
`prt2-Q11-css-and-theme.md §5`):

```css
.intercom-composer-popover { right: 10px !important; }
```

You do not write `!important` overrides for a class in your first-party stylesheet unless the class
belongs to markup you control and render. And the computed style on `#116` **is** `right: 10px`,
not `calc(50% - 390px)` — the override wins.

### 1.5 VERDICT — stated precisely

> The emoji picker is **first-party, app-shipped markup and CSS that has been copied verbatim from
> Intercom's Messenger composer** (class names, layout, and the `js.intercomcdn.com` search-icon
> asset all retained). It is **third-party-*derived* code vendored into the app**, not third-party
> DOM injected at runtime. It is part of the app's own UI: it is the badge editor's emoji palette,
> triggered by the app's own `button#emoji-picker`, gated by the app's own `ng-show="showAddBadge"`,
> and repositioned by the app's own `styles.css`.

Everything downstream — whether it is in scope for the rebuild, whether the repo's own
`EmojiPicker.svelte` supersedes it — follows from that corrected reading. See §7.

---

## 2. Container chain and its resolved absolute styles

All 20 non-glyph records of the subtree, in DOM order. Rects are `0×0 @ 0,0` for every one of them
(the whole `r.0.1.1.0.0.0.0.5.0` panel is `display:none`).

### `#116` — `r.0.1.1.0.0.0.0.5.0.1.1` — `div.intercom-composer-popover.intercom-composer-emoji-popover`

`nodes-000.txt:3350-3378` — 25 deviations. Resolved absolute:

```
display: block                       visibility: hidden   [COMMON DEFAULTS.txt:7]
position: absolute                   top: auto            [COMMON:9]
right: 10px            ← styles.css !important override, NOT 14.css's calc(50% - 390px)
bottom: 50px                         left: auto           [COMMON:12]
z-index: 2147483003
width: auto                          height: auto         [COMMON:20]
margin: 0px ×4         [COMMON:34-37]
padding-top/right/bottom/left: 0px
border-*-width: 0px    [COMMON:41-44]    border-*-style: none  [COMMON:45-48]
border-*-color: rgb(51, 51, 51)          [COMMON:49-52]
border-top-left-radius: 6px          border-top-right-radius: 6px
border-bottom-left-radius: 6px       border-bottom-right-radius: 6px
background-color: rgb(255, 255, 255)
background-image: none [COMMON:57]   background-clip: border-box [COMMON:61]
color: rgb(51, 51, 51) [COMMON:62]
font-family: "Helvetica Neue", Helvetica, Arial, sans-serif
font-size: 14px                      font-weight: 400     [COMMON:65]
line-height: 20px                    letter-spacing: normal [COMMON:69]
text-align: start                    vertical-align: baseline
white-space: normal    [COMMON:75]
overflow-x: visible    [COMMON:79]   overflow-y: visible  [COMMON:80]
opacity: 0             ← the popover is FULLY TRANSPARENT in this capture
box-shadow: rgba(0, 0, 0, 0.08) 0px 1px 15px 1px
outline-style: none    [COMMON:83]   outline-color: rgb(51, 51, 51) [COMMON:85]
cursor: auto                         pointer-events: auto [COMMON:87]
user-select: auto      [COMMON:88]
transition-property: all             transition-duration: 0.2s
transform: none        [COMMON:91]   filter: none         [COMMON:92]
```

**Two independent reasons it is invisible:** `opacity: 0` **and** `visibility: hidden` (resolved from
the COMMON table, sourced from `14.css .intercom-composer-popover { visibility: hidden; }`), on top
of a `display:none` ancestor. The `.active` class — which `14.css` defines as
`visibility: visible; opacity: 1; bottom: 145px;` — is **not** present on `#116`.

### `#144` — `…5.0.1.1.0` — `div.intercom-emoji-picker`

15 deviations (`nodes-001.txt:759-777`). Resolved: `display: block` · **`width: 330px`** ·
**`height: 260px`** · `visibility: hidden [COMMON:7]` · `padding: 0px ×4` · `position: static [COMMON:8]` ·
`font-family: "Helvetica Neue", Helvetica, Arial, sans-serif` · `font-size: 14px` ·
`line-height: 20px` · `text-align: start` · `vertical-align: baseline` · `cursor: auto` ·
`transition: all 0s` · `background-color: rgba(0,0,0,0) [COMMON:56]`.

### `#145` — `…5.0.1.1.1` — `div.intercom-composer-popover-caret`

28 deviations (`nodes-001.txt:779-810`). Resolved: `display: block` · `position: absolute` ·
`top: auto [COMMON:9]` · `right: 0px` · `bottom: −8px` · `left: 20px` · `width: 0px` · `height: 0px` ·
`padding: 0px ×4` · `border-top-width: 8px` · `border-right-width: 8px` · `border-left-width: 8px` ·
`border-bottom-width: 0px [COMMON:43]` · `border-top/right/left-style: solid` ·
`border-bottom-style: none [COMMON:47]` · `border-top-color: rgb(255, 255, 255)` ·
`border-right-color: rgba(0, 0, 0, 0)` · `border-left-color: rgba(0, 0, 0, 0)` ·
`border-bottom-color: rgb(51,51,51) [COMMON:51]` · `font 14px/20px Helvetica Neue…` ·
`text-align: start` · `vertical-align: baseline` · `cursor: auto` · `transition: all 0s`.
→ a classic 8px white CSS triangle pointing down.

### `#170` — `…5.0.1.1.0.0` — `div.intercom-composer-popover-header`

22 deviations. Resolved: `display: block` · `position: absolute` · `top: 0px` · `right: 20px` ·
`left: 20px` · `bottom: auto [COMMON:11]` · `width: auto` · **`height: 40px`** · `padding: 0px ×4` ·
`border-bottom-width: 1px` · `border-bottom-style: solid` ·
**`border-bottom-color: rgb(237, 239, 241)`** · other borders `0px/none/rgb(51,51,51)` `[COMMON]` ·
`font 14px/20px Helvetica Neue…` · `text-align: start` · `vertical-align: baseline` ·
`cursor: auto` · `transition: all 0s`.

### `#196` — `…5.0.1.1.0.0.0` — `input.intercom-composer-popover-input`

Full attribute set and resolved style are in `prt2-Q08-forms-and-inputs.md §4.5`. Summary:
`placeholder="Search"`, `value=""`, **no `type`, no `id`, no `ng-model`** —
`width: 100%` · `height: 40px` · `padding-left: 25px` · `color: rgb(110, 122, 137)` ·
`font-family: intercom-font, "Helvetica Neue", Helvetica, Arial, sans-serif` ·
`background-image: url("https://js.intercomcdn.com/images/search@2x.9f02b9f3.png")` ·
`background-position: 0px 12px` · `background-size: 16px 16px` · `background-repeat: no-repeat` ·
`appearance: auto`.

**Note:** `font-family` names **`intercom-font`** first. No `@font-face` for `intercom-font` exists in
any of the 15 sheets (grep across `01-stylesheets/*.css` returns the family name only inside this one
rule), so it always falls through to `"Helvetica Neue"`. Honest gap: the intended webfont is not
loaded.

### `#171` — `…5.0.1.1.0.1` — `div.intercom-composer-popover-body-container`

14 deviations. Resolved: `display: block` · `visibility: hidden [COMMON:7]` · `width: auto` ·
`position: static [COMMON:8]` · `padding: 0px ×4` · `font 14px/20px Helvetica Neue…` ·
`text-align: start` · `vertical-align: baseline` · `cursor: auto` · `transition: all 0s`.
**No rule for this class exists in `14.css`** — it is an unstyled structural wrapper.

### `#197` — `…5.0.1.1.0.1.0` — `div.intercom-composer-popover-body`

21 deviations. Resolved: `display: block` · `position: absolute` · `top: 40px` · `right: 0px` ·
`bottom: 5px` · `left: 0px` · `width: auto` · `padding: 0px 20px 0px 20px` ·
`overflow-x: auto` · **`overflow-y: scroll`** · `font 14px/20px Helvetica Neue…` ·
`text-align: start` · `vertical-align: baseline` · `cursor: auto` · `transition: all 0s`.
→ the scrolling glyph pane, inset below the 40px search header.

### `#229` — `…5.0.1.1.0.1.0.0` — `div.intercom-emoji-picker-groups`

14 deviations. Resolved: `display: block` · `width: auto` · `visibility: hidden [COMMON:7]` ·
`padding: 0px ×4` · `font 14px/20px Helvetica Neue…` · `text-align: start` ·
`vertical-align: baseline` · `cursor: auto` · `transition: all 0s`. No `14.css` rule — unstyled wrapper.

### `#235 #236 #237 #238 #239 #240` — the six `div.intercom-emoji-picker-group`

All six carry **identical** 18-deviation sets. Resolved: `display: block` · `width: auto` ·
`visibility: hidden [COMMON:7]` · **`margin: 10px −5px 10px −5px`** · `padding: 0px ×4` ·
`font 14px/20px Helvetica Neue…` · `text-align: start` · `vertical-align: baseline` ·
`cursor: auto` · `transition: all 0s`.

### `#241 #249 #428 #508 #711 #777` — the six `div.intercom-emoji-picker-group-title`

All six carry **identical** 24-deviation sets. Resolved: `display: block` · `width: auto` ·
`visibility: hidden [COMMON:7]` · `margin: 5px ×4` · `padding: 0px ×4` ·
**`color: rgb(184, 195, 202)`** (and the four `border-*-color` + `outline-color` follow it) ·
`font-family: "Helvetica Neue", Helvetica, Arial, sans-serif` · **`font-size: 13px`** ·
**`line-height: 18.5714px`** · `font-weight: 400 [COMMON:65]` · `text-align: start` ·
`vertical-align: baseline` · `cursor: auto` · `transition: all 0s`.

---

## 3. The 635 glyph spans — exhaustively verified, not sampled

I did **not** sample. I ran a structural fingerprint over every record whose class is
`intercom-emoji-picker-emoji`, normalising only the record index and the two variable values.
Result:

```
635 × "#REC"
635 × "  rect: x=0 y=0 w=0 h=0"
635 × "  attr class = <V>"
635 × "  attr title = <V>"
635 × "  text: <V>"
635 × "  style-deviations (0; all other props == COMMON in DEFAULTS.txt):"
```

**Every single one of the 635 spans has exactly five lines and ZERO style deviations.** There is no
outlier. Their resolved absolute style is therefore, verbatim, the entire `DEFAULTS.txt` COMMON
table:

```
display: inline-table                visibility: hidden
position: static                     top/right/bottom/left: auto
z-index: auto                        float: none
box-sizing: border-box
width: 30px                          height: auto
min-width: 0px    max-width: none    min-height: 0px    max-height: none
flex: 0 1 auto  flex-direction: row  flex-wrap: nowrap
flex-grow: 0    flex-shrink: 1       flex-basis: auto
align-items: normal   align-self: auto   justify-content: normal
gap: normal      order: 0            grid-template-columns: none
margin-top/right/bottom/left: 0px
padding-top: 5px  padding-right: 5px  padding-bottom: 5px  padding-left: 5px
border-*-width: 0px    border-*-style: none    border-*-color: rgb(51, 51, 51)
border-*-radius: 0px
background-color: rgba(0, 0, 0, 0)   background-image: none
background-position: 0% 0%           background-size: auto
background-repeat: repeat            background-clip: border-box
color: rgb(51, 51, 51)
font-family: "Apple Color Emoji", "Segoe UI Emoji", NotoColorEmoji,
             "Segoe UI Symbol", "Android Emoji", EmojiSymbols
font-size: 28px      font-weight: 400      font-style: normal
line-height: 30px    letter-spacing: normal
text-align: center   text-transform: none  text-decoration-line: none
text-shadow: none    text-overflow: clip   white-space: normal
vertical-align: middle    word-break: normal    overflow-wrap: normal
overflow-x: visible  overflow-y: visible
opacity: 1           box-shadow: none
outline-style: none  outline-width: 3px    outline-color: rgb(51, 51, 51)
cursor: pointer      pointer-events: auto  user-select: auto
transition-property: transform, -webkit-transform
transition-duration: 0.06s, 0.06s
transform: none      filter: none          object-fit: fill
list-style-type: disc  content: normal     resize: none
appearance: none     fill: rgb(0, 0, 0)    stroke: none
```

This is the **direct cause** of the skewed COMMON table warned about in the brief: `display:
inline-table` 635/882, `width: 30px` 635/882, `line-height: 30px` 635/882, `font-size: 28px`
636/882, and the six-family Apple-Color-Emoji stack 635/882 — every one of those "most-frequent"
values comes **only** from this palette (`DEFAULTS.txt:7,11,20,63,64,66`).

### Exact count and grouping

**Exactly 635 glyphs.** Six groups, counted programmatically from the path segment:

| group | path | title record | title text | glyph records | count |
|---|---|---|---|---|---|
| 0 | `…0.1.0.0.0` | `#241` | `Frequently used` | `#242`–`#248` | **7** |
| 1 | `…0.1.0.0.1` | `#249` | `People` | `#250`–`#427` | **178** |
| 2 | `…0.1.0.0.2` | `#428` | `Nature` | `#429`–`#507` | **79** |
| 3 | `…0.1.0.0.3` | `#508` | `Objects` | `#509`–`#710` | **202** |
| 4 | `…0.1.0.0.4` | `#711` | `Places` | `#712`–`#776` | **65** |
| 5 | `…0.1.0.0.5` | `#777` | `Symbols` | `#778`–`#881` | **104** |
| | | | **total** | | **635** ✔ |

`7 + 178 + 79 + 202 + 65 + 104 = 635`.

### Distinct glyphs

635 spans carry **628 distinct `title` values**. The 7 duplicates are exactly the 7 members of the
"Frequently used" group, each of which also appears in its home group:
`thumbs_up`, `-1`, `sob`, `fire`, `frowning`, `smile`, `heart_eyes`.
So the palette holds **628 unique emoji, rendered as 635 spans.**

### Readability

**The glyph characters ARE readable in the slices** — this is not a gap. Each span's `text:` field
carries the literal emoji character and the `title` attribute carries its shortname. The full
635-row inventory is in §8 below.

---

## 4. How much of the page's apparent complexity this accounts for

| measure | picker subtree | whole capture | share |
|---|---|---|---|
| DOM records | **655** | 882 | **74.26 %** |
| `<span>` elements | 635 | 650 | **97.7 %** |
| `title` attributes | 635 | 639 | **99.4 %** |
| on-screen pixels | **0** | 1842 × 1265 | **0 %** |
| rendered box area | `0 × 0` on all 655 | — | **0 %** |
| CSS rules backing it | 12 of `14.css`'s 15 + 2 in `09.css` | 4 512 rules across 15 sheets | 0.31 % |

**Three quarters of this capture's node count is an invisible emoji palette.** Strip it and the
Account Settings page is **227 records** — a navbar, four Bootstrap panels, four tables, three
forms, a footer, and 25 records of reCAPTCHA machinery. Any "this page is complex" impression drawn
from the raw node count is an artifact of this one subtree.

---

## 5. What the picker looks like when open (derived from CSS, flagged as such)

The capture never shows it open (`opacity: 0`, `visibility: hidden`, `display:none` ancestor), so
the following is read **from the stylesheet, not from a rendered box**, and is labelled accordingly:

```
popover      330 × 260  (.intercom-emoji-picker)
             position absolute; right 10px; bottom 50px   (bottom 145px when .active)
             background #ffffff; border-radius 6px
             box-shadow rgba(0,0,0,.08) 0 1px 15px 1px
             z-index 2147483003; transition .2s linear
caret        8px white triangle, bottom -8px, left 20px
header       absolute; top 0; left/right 20px; height 40px
             border-bottom 1px solid rgb(237,239,241)
search input width 100%; height 40px; padding-left 25px; color rgb(110,122,137)
             16×16 magnifier at 0px 12px, from js.intercomcdn.com
body         absolute; inset 40px 0 5px; padding 0 20px; overflow-y scroll
group        margin 10px -5px
group title  13px / 18.5714px; color rgb(184,195,202)
glyph        30px wide, 5px padding, line-height 30px, font-size 28px
             display inline-table; text-align center; vertical-align middle
             cursor pointer; transform scale(1.4) on hover after 0ms delay
```

Per-row glyph capacity: body inner width = `330 − 40 (padding) = 290px`; each glyph occupies
`30 + 5 + 5 = 40px`; group margin `−5px` each side adds `10px` → `300 / 40 = 7` glyphs per row.
**This is arithmetic on captured values, not a measured layout** — flagged as derived.

---

## 6. Full record map of the subtree

```
#116  r.0.1.1.0.0.0.0.5.0.1.1            div.intercom-composer-popover.intercom-composer-emoji-popover
#144  └ .0                               div.intercom-emoji-picker                       330×260
#170    └ .0.0                           div.intercom-composer-popover-header            h 40
#196      └ .0.0.0                       input.intercom-composer-popover-input           "Search"
#171    └ .0.1                           div.intercom-composer-popover-body-container    (unstyled)
#197      └ .0.1.0                       div.intercom-composer-popover-body              scroll pane
#229        └ .0.1.0.0                   div.intercom-emoji-picker-groups                (unstyled)
#235          ├ .0.1.0.0.0               div.intercom-emoji-picker-group
#241          │   ├ .0                   div…group-title  "Frequently used"
#242–248      │   └ .1–.7                span…emoji  ×7
#236          ├ .0.1.0.0.1               div.intercom-emoji-picker-group
#249          │   ├ .0                   div…group-title  "People"
#250–427      │   └ .1–.178              span…emoji  ×178
#237          ├ .0.1.0.0.2               div.intercom-emoji-picker-group
#428          │   ├ .0                   div…group-title  "Nature"
#429–507      │   └ .1–.79               span…emoji  ×79
#238          ├ .0.1.0.0.3               div.intercom-emoji-picker-group
#508          │   ├ .0                   div…group-title  "Objects"
#509–710      │   └ .1–.202              span…emoji  ×202
#239          ├ .0.1.0.0.4               div.intercom-emoji-picker-group
#711          │   ├ .0                   div…group-title  "Places"
#712–776      │   └ .1–.65               span…emoji  ×65
#240          └ .0.1.0.0.5               div.intercom-emoji-picker-group
#777              ├ .0                   div…group-title  "Symbols"
#778–881          └ .1–.104              span…emoji  ×104
#145  └ .1                               div.intercom-composer-popover-caret
```

---

## 7. SCOPE QUESTION — raised, deliberately not answered

The repo already has its own emoji stack:

* `src/lib/components/EmojiPicker.svelte` (modified in the working tree),
* `src/lib/emoji-data.ts` (modified),
* `scripts/extract-clean-emoji-data.mjs` (modified),
* `scripts/audit-emoji-computed.mjs` (untracked),
* an `emojis` data file (modified).

The reference's picker is a vendored copy of Intercom's Messenger composer palette: **6 categories,
628 unique glyphs, shortname titles, a 330×260 popover with a non-functional search box, and a
glyph-span style that would have to be reproduced exactly (`display: inline-table`, `width: 30px`,
`line-height: 30px`, `font-size: 28px`, `padding: 5px`, `transform: scale(1.4)` hover) for a
pixel-perfect match.**

The genuine open questions this raises for the rebuild — which are **product/architecture decisions,
not decode findings, and which I am not answering**:

1. Is the badge editor's emoji palette in scope at all? It is `display:none` in the reference and
   contributes **zero pixels** to any screenshot diff of `#/page/welcome`.
2. If it is in scope, does `EmojiPicker.svelte` replace it, or must the rebuild reproduce
   Intercom's exact 6-category / 628-glyph inventory and shortnames to match?
3. Do the repo's emoji data pipeline and the reference's 628-glyph set agree? If they diverge, which
   is authoritative?
4. Should the vendored Intercom class names (`intercom-*`) be carried over, or renamed? Carrying
   them over preserves the `styles.css` `!important` override; renaming breaks it.
5. Is the `https://js.intercomcdn.com/images/search@2x.9f02b9f3.png` search icon acceptable as a
   third-party runtime dependency, or must it be self-hosted?

**These are raised for the human to decide. Nothing in this dump answers them.**

---

## 8. HONEST GAPS for this piece

1. **Nothing about this subtree is verifiable against a rendered screenshot.** `prt2.json` contains
   no image (`00-META.txt` lists 4 DOM captures + 1 meta record). §5's open-state geometry is CSS
   arithmetic, explicitly flagged as derived.
2. **The search input is inert in the capture.** `#196` has no `ng-model`, no `id`, no `type`, and
   no handler attribute. Whether it filters anything is not derivable from the DOM.
3. **`#168 button#emoji-picker` has no `ng-click`.** Its wiring is by `id` in JavaScript
   (`/public/dist/app.min.js?v=1784623769671`, not captured). The open/close mechanism — presumably
   toggling `.active` on `#116` — is **inferred from `14.css`'s `.intercom-composer-popover.active`
   rule, not observed.**
4. **`intercom-font` is referenced but never defined.** No `@font-face` for it in any of the 15
   sheets. It silently falls back to `"Helvetica Neue"`.
5. **`.intercom-composer-popover-body-container` and `.intercom-emoji-picker-groups` have no CSS
   rule** in any sheet. They are unstyled structural wrappers; that is a finding, not a gap, but it
   means their layout is purely inherited.
6. **`.intercom-emoji-picker-group { margin: 10px -5px; }` is declared twice in `14.css`.** Harmless
   duplication, recorded for fidelity.
7. **Emoji rendering is platform-dependent.** The font stack starts with `"Apple Color Emoji"`. The
   capture's `meta.ua` claims Android/Pixel 9 (`00-META.txt:7`), which has no Apple Color Emoji —
   so the actual rendered glyph shapes in the reference session are **unknown**. Only the
   code points are certain.
8. **No `aria-*` and no keyboard affordance** on any of the 635 spans — they are bare `<span>`s with
   `cursor: pointer`. A rebuild that adds `role="button"`/`tabindex` is an explicit, agreed
   divergence.

---

## 9. FULL GLYPH INVENTORY — all 635 spans

Format: `record | group.index | title | glyph`.
Group key: `0` = Frequently used · `1` = People · `2` = Nature · `3` = Objects · `4` = Places ·
`5` = Symbols.

Every row below is transcribed verbatim from the `attr title` and `text:` fields of the
corresponding record in `caps/00-baseline-room/nodes-002.txt` … `nodes-007.txt`. All 635 share the
identical resolved style given in §3.


### Group 0 — Frequently used (7 glyphs)

| record | index | title | glyph |
|---|---|---|---|
| `#242` | `0.1` | `thumbs_up` | 👍 |
| `#243` | `0.2` | `-1` | 👎 |
| `#244` | `0.3` | `sob` | 😭 |
| `#245` | `0.4` | `fire` | 🔥 |
| `#246` | `0.5` | `frowning` | 😦 |
| `#247` | `0.6` | `smile` | 😄 |
| `#248` | `0.7` | `heart_eyes` | 😍 |

### Group 1 — People (178 glyphs)

| record | index | title | glyph |
|---|---|---|---|
| `#250` | `1.1` | `smile` | 😄 |
| `#251` | `1.2` | `smiley` | 😃 |
| `#252` | `1.3` | `grinning` | 😀 |
| `#253` | `1.4` | `blush` | 😊 |
| `#254` | `1.5` | `wink` | 😉 |
| `#255` | `1.6` | `heart_eyes` | 😍 |
| `#256` | `1.7` | `kissing_heart` | 😘 |
| `#257` | `1.8` | `kissing_closed_eyes` | 😚 |
| `#258` | `1.9` | `kissing` | 😗 |
| `#259` | `1.10` | `kissing_smiling_eyes` | 😙 |
| `#260` | `1.11` | `stuck_out_tongue_winking_eye` | 😜 |
| `#261` | `1.12` | `stuck_out_tongue_closed_eyes` | 😝 |
| `#262` | `1.13` | `stuck_out_tongue` | 😛 |
| `#263` | `1.14` | `flushed` | 😳 |
| `#264` | `1.15` | `grin` | 😁 |
| `#265` | `1.16` | `pensive` | 😔 |
| `#266` | `1.17` | `relieved` | 😌 |
| `#267` | `1.18` | `unamused` | 😒 |
| `#268` | `1.19` | `disappointed` | 😞 |
| `#269` | `1.20` | `persevere` | 😣 |
| `#270` | `1.21` | `cry` | 😢 |
| `#271` | `1.22` | `joy` | 😂 |
| `#272` | `1.23` | `sob` | 😭 |
| `#273` | `1.24` | `sleepy` | 😪 |
| `#274` | `1.25` | `disappointed_relieved` | 😥 |
| `#275` | `1.26` | `cold_sweat` | 😰 |
| `#276` | `1.27` | `sweat_smile` | 😅 |
| `#277` | `1.28` | `sweat` | 😓 |
| `#278` | `1.29` | `weary` | 😩 |
| `#279` | `1.30` | `tired_face` | 😫 |
| `#280` | `1.31` | `fearful` | 😨 |
| `#281` | `1.32` | `scream` | 😱 |
| `#282` | `1.33` | `angry` | 😠 |
| `#283` | `1.34` | `rage` | 😡 |
| `#284` | `1.35` | `triumph` | 😤 |
| `#285` | `1.36` | `confounded` | 😖 |
| `#286` | `1.37` | `laughing` | 😆 |
| `#287` | `1.38` | `yum` | 😋 |
| `#288` | `1.39` | `mask` | 😷 |
| `#289` | `1.40` | `sunglasses` | 😎 |
| `#290` | `1.41` | `sleeping` | 😴 |
| `#291` | `1.42` | `dizzy_face` | 😵 |
| `#292` | `1.43` | `astonished` | 😲 |
| `#293` | `1.44` | `worried` | 😟 |
| `#294` | `1.45` | `frowning` | 😦 |
| `#295` | `1.46` | `anguished` | 😧 |
| `#296` | `1.47` | `imp` | 👿 |
| `#297` | `1.48` | `open_mouth` | 😮 |
| `#298` | `1.49` | `grimacing` | 😬 |
| `#299` | `1.50` | `neutral_face` | 😐 |
| `#300` | `1.51` | `confused` | 😕 |
| `#301` | `1.52` | `hushed` | 😯 |
| `#302` | `1.53` | `smirk` | 😏 |
| `#303` | `1.54` | `expressionless` | 😑 |
| `#304` | `1.55` | `man_with_gua_pi_mao` | 👲 |
| `#305` | `1.56` | `man_with_turban` | 👳 |
| `#306` | `1.57` | `cop` | 👮 |
| `#307` | `1.58` | `construction_worker` | 👷 |
| `#308` | `1.59` | `guardsman` | 💂 |
| `#309` | `1.60` | `baby` | 👶 |
| `#310` | `1.61` | `boy` | 👦 |
| `#311` | `1.62` | `girl` | 👧 |
| `#312` | `1.63` | `man` | 👨 |
| `#313` | `1.64` | `woman` | 👩 |
| `#314` | `1.65` | `older_man` | 👴 |
| `#315` | `1.66` | `older_woman` | 👵 |
| `#316` | `1.67` | `person_with_blond_hair` | 👱 |
| `#317` | `1.68` | `angel` | 👼 |
| `#318` | `1.69` | `princess` | 👸 |
| `#319` | `1.70` | `smiley_cat` | 😺 |
| `#320` | `1.71` | `smile_cat` | 😸 |
| `#321` | `1.72` | `heart_eyes_cat` | 😻 |
| `#322` | `1.73` | `kissing_cat` | 😽 |
| `#323` | `1.74` | `smirk_cat` | 😼 |
| `#324` | `1.75` | `scream_cat` | 🙀 |
| `#325` | `1.76` | `crying_cat_face` | 😿 |
| `#326` | `1.77` | `joy_cat` | 😹 |
| `#327` | `1.78` | `pouting_cat` | 😾 |
| `#328` | `1.79` | `japanese_ogre` | 👹 |
| `#329` | `1.80` | `japanese_goblin` | 👺 |
| `#330` | `1.81` | `see_no_evil` | 🙈 |
| `#331` | `1.82` | `hear_no_evil` | 🙉 |
| `#332` | `1.83` | `speak_no_evil` | 🙊 |
| `#333` | `1.84` | `skull` | 💀 |
| `#334` | `1.85` | `alien` | 👽 |
| `#335` | `1.86` | `hankey` | 💩 |
| `#336` | `1.87` | `fire` | 🔥 |
| `#337` | `1.88` | `sparkles` | ✨ |
| `#338` | `1.89` | `star2` | 🌟 |
| `#339` | `1.90` | `dizzy` | 💫 |
| `#340` | `1.91` | `boom` | 💥 |
| `#341` | `1.92` | `anger` | 💢 |
| `#342` | `1.93` | `sweat_drops` | 💦 |
| `#343` | `1.94` | `droplet` | 💧 |
| `#344` | `1.95` | `zzz` | 💤 |
| `#345` | `1.96` | `dash` | 💨 |
| `#346` | `1.97` | `ear` | 👂 |
| `#347` | `1.98` | `eyes` | 👀 |
| `#348` | `1.99` | `nose` | 👃 |
| `#349` | `1.100` | `tongue` | 👅 |
| `#350` | `1.101` | `lips` | 👄 |
| `#351` | `1.102` | `thumbs_up` | 👍 |
| `#352` | `1.103` | `-1` | 👎 |
| `#353` | `1.104` | `ok_hand` | 👌 |
| `#354` | `1.105` | `facepunch` | 👊 |
| `#355` | `1.106` | `fist` | ✊ |
| `#356` | `1.107` | `wave` | 👋 |
| `#357` | `1.108` | `hand` | ✋ |
| `#358` | `1.109` | `open_hands` | 👐 |
| `#359` | `1.110` | `point_up_2` | 👆 |
| `#360` | `1.111` | `point_down` | 👇 |
| `#361` | `1.112` | `point_right` | 👉 |
| `#362` | `1.113` | `point_left` | 👈 |
| `#363` | `1.114` | `raised_hands` | 🙌 |
| `#364` | `1.115` | `pray` | 🙏 |
| `#365` | `1.116` | `clap` | 👏 |
| `#366` | `1.117` | `muscle` | 💪 |
| `#367` | `1.118` | `walking` | 🚶 |
| `#368` | `1.119` | `runner` | 🏃 |
| `#369` | `1.120` | `dancer` | 💃 |
| `#370` | `1.121` | `couple` | 👫 |
| `#371` | `1.122` | `family` | 👪 |
| `#372` | `1.123` | `couplekiss` | 💏 |
| `#373` | `1.124` | `couple_with_heart` | 💑 |
| `#374` | `1.125` | `dancers` | 👯 |
| `#375` | `1.126` | `ok_woman` | 🙆 |
| `#376` | `1.127` | `no_good` | 🙅 |
| `#377` | `1.128` | `information_desk_person` | 💁 |
| `#378` | `1.129` | `raising_hand` | 🙋 |
| `#379` | `1.130` | `massage` | 💆 |
| `#380` | `1.131` | `haircut` | 💇 |
| `#381` | `1.132` | `nail_care` | 💅 |
| `#382` | `1.133` | `bride_with_veil` | 👰 |
| `#383` | `1.134` | `person_with_pouting_face` | 🙎 |
| `#384` | `1.135` | `person_frowning` | 🙍 |
| `#385` | `1.136` | `bow` | 🙇 |
| `#386` | `1.137` | `tophat` | 🎩 |
| `#387` | `1.138` | `crown` | 👑 |
| `#388` | `1.139` | `womans_hat` | 👒 |
| `#389` | `1.140` | `athletic_shoe` | 👟 |
| `#390` | `1.141` | `mans_shoe` | 👞 |
| `#391` | `1.142` | `sandal` | 👡 |
| `#392` | `1.143` | `high_heel` | 👠 |
| `#393` | `1.144` | `boot` | 👢 |
| `#394` | `1.145` | `shirt` | 👕 |
| `#395` | `1.146` | `necktie` | 👔 |
| `#396` | `1.147` | `womans_clothes` | 👚 |
| `#397` | `1.148` | `dress` | 👗 |
| `#398` | `1.149` | `running_shirt_with_sash` | 🎽 |
| `#399` | `1.150` | `jeans` | 👖 |
| `#400` | `1.151` | `kimono` | 👘 |
| `#401` | `1.152` | `bikini` | 👙 |
| `#402` | `1.153` | `briefcase` | 💼 |
| `#403` | `1.154` | `handbag` | 👜 |
| `#404` | `1.155` | `pouch` | 👝 |
| `#405` | `1.156` | `purse` | 👛 |
| `#406` | `1.157` | `eyeglasses` | 👓 |
| `#407` | `1.158` | `ribbon` | 🎀 |
| `#408` | `1.159` | `closed_umbrella` | 🌂 |
| `#409` | `1.160` | `lipstick` | 💄 |
| `#410` | `1.161` | `yellow_heart` | 💛 |
| `#411` | `1.162` | `blue_heart` | 💙 |
| `#412` | `1.163` | `purple_heart` | 💜 |
| `#413` | `1.164` | `green_heart` | 💚 |
| `#414` | `1.165` | `broken_heart` | 💔 |
| `#415` | `1.166` | `heartpulse` | 💗 |
| `#416` | `1.167` | `heartbeat` | 💓 |
| `#417` | `1.168` | `two_hearts` | 💕 |
| `#418` | `1.169` | `sparkling_heart` | 💖 |
| `#419` | `1.170` | `revolving_hearts` | 💞 |
| `#420` | `1.171` | `cupid` | 💘 |
| `#421` | `1.172` | `love_letter` | 💌 |
| `#422` | `1.173` | `kiss` | 💋 |
| `#423` | `1.174` | `ring` | 💍 |
| `#424` | `1.175` | `gem` | 💎 |
| `#425` | `1.176` | `bust_in_silhouette` | 👤 |
| `#426` | `1.177` | `speech_balloon` | 💬 |
| `#427` | `1.178` | `footprints` | 👣 |

### Group 2 — Nature (79 glyphs)

| record | index | title | glyph |
|---|---|---|---|
| `#429` | `2.1` | `dog` | 🐶 |
| `#430` | `2.2` | `wolf` | 🐺 |
| `#431` | `2.3` | `cat` | 🐱 |
| `#432` | `2.4` | `mouse` | 🐭 |
| `#433` | `2.5` | `hamster` | 🐹 |
| `#434` | `2.6` | `rabbit` | 🐰 |
| `#435` | `2.7` | `frog` | 🐸 |
| `#436` | `2.8` | `tiger` | 🐯 |
| `#437` | `2.9` | `koala` | 🐨 |
| `#438` | `2.10` | `bear` | 🐻 |
| `#439` | `2.11` | `pig` | 🐷 |
| `#440` | `2.12` | `pig_nose` | 🐽 |
| `#441` | `2.13` | `cow` | 🐮 |
| `#442` | `2.14` | `boar` | 🐗 |
| `#443` | `2.15` | `monkey_face` | 🐵 |
| `#444` | `2.16` | `monkey` | 🐒 |
| `#445` | `2.17` | `horse` | 🐴 |
| `#446` | `2.18` | `sheep` | 🐑 |
| `#447` | `2.19` | `elephant` | 🐘 |
| `#448` | `2.20` | `panda_face` | 🐼 |
| `#449` | `2.21` | `penguin` | 🐧 |
| `#450` | `2.22` | `bird` | 🐦 |
| `#451` | `2.23` | `baby_chick` | 🐤 |
| `#452` | `2.24` | `hatched_chick` | 🐥 |
| `#453` | `2.25` | `hatching_chick` | 🐣 |
| `#454` | `2.26` | `chicken` | 🐔 |
| `#455` | `2.27` | `snake` | 🐍 |
| `#456` | `2.28` | `turtle` | 🐢 |
| `#457` | `2.29` | `bug` | 🐛 |
| `#458` | `2.30` | `bee` | 🐝 |
| `#459` | `2.31` | `ant` | 🐜 |
| `#460` | `2.32` | `beetle` | 🐞 |
| `#461` | `2.33` | `snail` | 🐌 |
| `#462` | `2.34` | `octopus` | 🐙 |
| `#463` | `2.35` | `shell` | 🐚 |
| `#464` | `2.36` | `tropical_fish` | 🐠 |
| `#465` | `2.37` | `fish` | 🐟 |
| `#466` | `2.38` | `dolphin` | 🐬 |
| `#467` | `2.39` | `whale` | 🐳 |
| `#468` | `2.40` | `racehorse` | 🐎 |
| `#469` | `2.41` | `dragon_face` | 🐲 |
| `#470` | `2.42` | `blowfish` | 🐡 |
| `#471` | `2.43` | `camel` | 🐫 |
| `#472` | `2.44` | `poodle` | 🐩 |
| `#473` | `2.45` | `feet` | 🐾 |
| `#474` | `2.46` | `bouquet` | 💐 |
| `#475` | `2.47` | `cherry_blossom` | 🌸 |
| `#476` | `2.48` | `tulip` | 🌷 |
| `#477` | `2.49` | `four_leaf_clover` | 🍀 |
| `#478` | `2.50` | `rose` | 🌹 |
| `#479` | `2.51` | `sunflower` | 🌻 |
| `#480` | `2.52` | `hibiscus` | 🌺 |
| `#481` | `2.53` | `maple_leaf` | 🍁 |
| `#482` | `2.54` | `leaves` | 🍃 |
| `#483` | `2.55` | `fallen_leaf` | 🍂 |
| `#484` | `2.56` | `herb` | 🌿 |
| `#485` | `2.57` | `ear_of_rice` | 🌾 |
| `#486` | `2.58` | `mushroom` | 🍄 |
| `#487` | `2.59` | `cactus` | 🌵 |
| `#488` | `2.60` | `palm_tree` | 🌴 |
| `#489` | `2.61` | `chestnut` | 🌰 |
| `#490` | `2.62` | `seedling` | 🌱 |
| `#491` | `2.63` | `blossom` | 🌼 |
| `#492` | `2.64` | `new_moon` | 🌑 |
| `#493` | `2.65` | `first_quarter_moon` | 🌓 |
| `#494` | `2.66` | `moon` | 🌔 |
| `#495` | `2.67` | `full_moon` | 🌕 |
| `#496` | `2.68` | `first_quarter_moon_with_face` | 🌛 |
| `#497` | `2.69` | `crescent_moon` | 🌙 |
| `#498` | `2.70` | `earth_asia` | 🌏 |
| `#499` | `2.71` | `volcano` | 🌋 |
| `#500` | `2.72` | `milky_way` | 🌌 |
| `#501` | `2.73` | `stars` | 🌠 |
| `#502` | `2.74` | `partly_sunny` | ⛅ |
| `#503` | `2.75` | `snowman` | ⛄ |
| `#504` | `2.76` | `cyclone` | 🌀 |
| `#505` | `2.77` | `foggy` | 🌁 |
| `#506` | `2.78` | `rainbow` | 🌈 |
| `#507` | `2.79` | `ocean` | 🌊 |

### Group 3 — Objects (202 glyphs)

| record | index | title | glyph |
|---|---|---|---|
| `#509` | `3.1` | `bamboo` | 🎍 |
| `#510` | `3.2` | `gift_heart` | 💝 |
| `#511` | `3.3` | `dolls` | 🎎 |
| `#512` | `3.4` | `school_satchel` | 🎒 |
| `#513` | `3.5` | `mortar_board` | 🎓 |
| `#514` | `3.6` | `flags` | 🎏 |
| `#515` | `3.7` | `fireworks` | 🎆 |
| `#516` | `3.8` | `sparkler` | 🎇 |
| `#517` | `3.9` | `wind_chime` | 🎐 |
| `#518` | `3.10` | `rice_scene` | 🎑 |
| `#519` | `3.11` | `jack_o_lantern` | 🎃 |
| `#520` | `3.12` | `ghost` | 👻 |
| `#521` | `3.13` | `santa` | 🎅 |
| `#522` | `3.14` | `christmas_tree` | 🎄 |
| `#523` | `3.15` | `gift` | 🎁 |
| `#524` | `3.16` | `tanabata_tree` | 🎋 |
| `#525` | `3.17` | `tada` | 🎉 |
| `#526` | `3.18` | `confetti_ball` | 🎊 |
| `#527` | `3.19` | `balloon` | 🎈 |
| `#528` | `3.20` | `crossed_flags` | 🎌 |
| `#529` | `3.21` | `crystal_ball` | 🔮 |
| `#530` | `3.22` | `movie_camera` | 🎥 |
| `#531` | `3.23` | `camera` | 📷 |
| `#532` | `3.24` | `video_camera` | 📹 |
| `#533` | `3.25` | `vhs` | 📼 |
| `#534` | `3.26` | `cd` | 💿 |
| `#535` | `3.27` | `dvd` | 📀 |
| `#536` | `3.28` | `minidisc` | 💽 |
| `#537` | `3.29` | `floppy_disk` | 💾 |
| `#538` | `3.30` | `computer` | 💻 |
| `#539` | `3.31` | `iphone` | 📱 |
| `#540` | `3.32` | `telephone_receiver` | 📞 |
| `#541` | `3.33` | `pager` | 📟 |
| `#542` | `3.34` | `fax` | 📠 |
| `#543` | `3.35` | `satellite` | 📡 |
| `#544` | `3.36` | `tv` | 📺 |
| `#545` | `3.37` | `radio` | 📻 |
| `#546` | `3.38` | `loud_sound` | 🔊 |
| `#547` | `3.39` | `bell` | 🔔 |
| `#548` | `3.40` | `loudspeaker` | 📢 |
| `#549` | `3.41` | `mega` | 📣 |
| `#550` | `3.42` | `hourglass_flowing_sand` | ⏳ |
| `#551` | `3.43` | `hourglass` | ⌛ |
| `#552` | `3.44` | `alarm_clock` | ⏰ |
| `#553` | `3.45` | `watch` | ⌚ |
| `#554` | `3.46` | `unlock` | 🔓 |
| `#555` | `3.47` | `lock` | 🔒 |
| `#556` | `3.48` | `lock_with_ink_pen` | 🔏 |
| `#557` | `3.49` | `closed_lock_with_key` | 🔐 |
| `#558` | `3.50` | `key` | 🔑 |
| `#559` | `3.51` | `mag_right` | 🔎 |
| `#560` | `3.52` | `bulb` | 💡 |
| `#561` | `3.53` | `flashlight` | 🔦 |
| `#562` | `3.54` | `electric_plug` | 🔌 |
| `#563` | `3.55` | `battery` | 🔋 |
| `#564` | `3.56` | `mag` | 🔍 |
| `#565` | `3.57` | `bath` | 🛀 |
| `#566` | `3.58` | `toilet` | 🚽 |
| `#567` | `3.59` | `wrench` | 🔧 |
| `#568` | `3.60` | `nut_and_bolt` | 🔩 |
| `#569` | `3.61` | `hammer` | 🔨 |
| `#570` | `3.62` | `door` | 🚪 |
| `#571` | `3.63` | `smoking` | 🚬 |
| `#572` | `3.64` | `bomb` | 💣 |
| `#573` | `3.65` | `gun` | 🔫 |
| `#574` | `3.66` | `hocho` | 🔪 |
| `#575` | `3.67` | `pill` | 💊 |
| `#576` | `3.68` | `syringe` | 💉 |
| `#577` | `3.69` | `moneybag` | 💰 |
| `#578` | `3.70` | `yen` | 💴 |
| `#579` | `3.71` | `dollar` | 💵 |
| `#580` | `3.72` | `credit_card` | 💳 |
| `#581` | `3.73` | `money_with_wings` | 💸 |
| `#582` | `3.74` | `calling` | 📲 |
| `#583` | `3.75` | `e-mail` | 📧 |
| `#584` | `3.76` | `inbox_tray` | 📥 |
| `#585` | `3.77` | `outbox_tray` | 📤 |
| `#586` | `3.78` | `envelope_with_arrow` | 📩 |
| `#587` | `3.79` | `incoming_envelope` | 📨 |
| `#588` | `3.80` | `mailbox` | 📫 |
| `#589` | `3.81` | `mailbox_closed` | 📪 |
| `#590` | `3.82` | `postbox` | 📮 |
| `#591` | `3.83` | `package` | 📦 |
| `#592` | `3.84` | `memo` | 📝 |
| `#593` | `3.85` | `page_facing_up` | 📄 |
| `#594` | `3.86` | `page_with_curl` | 📃 |
| `#595` | `3.87` | `bookmark_tabs` | 📑 |
| `#596` | `3.88` | `bar_chart` | 📊 |
| `#597` | `3.89` | `chart_with_upwards_trend` | 📈 |
| `#598` | `3.90` | `chart_with_downwards_trend` | 📉 |
| `#599` | `3.91` | `scroll` | 📜 |
| `#600` | `3.92` | `clipboard` | 📋 |
| `#601` | `3.93` | `date` | 📅 |
| `#602` | `3.94` | `calendar` | 📆 |
| `#603` | `3.95` | `card_index` | 📇 |
| `#604` | `3.96` | `file_folder` | 📁 |
| `#605` | `3.97` | `open_file_folder` | 📂 |
| `#606` | `3.98` | `pushpin` | 📌 |
| `#607` | `3.99` | `paperclip` | 📎 |
| `#608` | `3.100` | `straight_ruler` | 📏 |
| `#609` | `3.101` | `triangular_ruler` | 📐 |
| `#610` | `3.102` | `closed_book` | 📕 |
| `#611` | `3.103` | `green_book` | 📗 |
| `#612` | `3.104` | `blue_book` | 📘 |
| `#613` | `3.105` | `orange_book` | 📙 |
| `#614` | `3.106` | `notebook` | 📓 |
| `#615` | `3.107` | `notebook_with_decorative_cover` | 📔 |
| `#616` | `3.108` | `ledger` | 📒 |
| `#617` | `3.109` | `books` | 📚 |
| `#618` | `3.110` | `book` | 📖 |
| `#619` | `3.111` | `bookmark` | 🔖 |
| `#620` | `3.112` | `name_badge` | 📛 |
| `#621` | `3.113` | `newspaper` | 📰 |
| `#622` | `3.114` | `art` | 🎨 |
| `#623` | `3.115` | `clapper` | 🎬 |
| `#624` | `3.116` | `microphone` | 🎤 |
| `#625` | `3.117` | `headphones` | 🎧 |
| `#626` | `3.118` | `musical_score` | 🎼 |
| `#627` | `3.119` | `musical_note` | 🎵 |
| `#628` | `3.120` | `notes` | 🎶 |
| `#629` | `3.121` | `musical_keyboard` | 🎹 |
| `#630` | `3.122` | `violin` | 🎻 |
| `#631` | `3.123` | `trumpet` | 🎺 |
| `#632` | `3.124` | `saxophone` | 🎷 |
| `#633` | `3.125` | `guitar` | 🎸 |
| `#634` | `3.126` | `space_invader` | 👾 |
| `#635` | `3.127` | `video_game` | 🎮 |
| `#636` | `3.128` | `black_joker` | 🃏 |
| `#637` | `3.129` | `flower_playing_cards` | 🎴 |
| `#638` | `3.130` | `mahjong` | 🀄 |
| `#639` | `3.131` | `game_die` | 🎲 |
| `#640` | `3.132` | `dart` | 🎯 |
| `#641` | `3.133` | `football` | 🏈 |
| `#642` | `3.134` | `basketball` | 🏀 |
| `#643` | `3.135` | `soccer` | ⚽ |
| `#644` | `3.136` | `baseball` | ⚾ |
| `#645` | `3.137` | `tennis` | 🎾 |
| `#646` | `3.138` | `8ball` | 🎱 |
| `#647` | `3.139` | `bowling` | 🎳 |
| `#648` | `3.140` | `golf` | ⛳ |
| `#649` | `3.141` | `checkered_flag` | 🏁 |
| `#650` | `3.142` | `trophy` | 🏆 |
| `#651` | `3.143` | `ski` | 🎿 |
| `#652` | `3.144` | `snowboarder` | 🏂 |
| `#653` | `3.145` | `swimmer` | 🏊 |
| `#654` | `3.146` | `surfer` | 🏄 |
| `#655` | `3.147` | `fishing_pole_and_fish` | 🎣 |
| `#656` | `3.148` | `tea` | 🍵 |
| `#657` | `3.149` | `sake` | 🍶 |
| `#658` | `3.150` | `beer` | 🍺 |
| `#659` | `3.151` | `beers` | 🍻 |
| `#660` | `3.152` | `cocktail` | 🍸 |
| `#661` | `3.153` | `tropical_drink` | 🍹 |
| `#662` | `3.154` | `wine_glass` | 🍷 |
| `#663` | `3.155` | `fork_and_knife` | 🍴 |
| `#664` | `3.156` | `pizza` | 🍕 |
| `#665` | `3.157` | `hamburger` | 🍔 |
| `#666` | `3.158` | `fries` | 🍟 |
| `#667` | `3.159` | `poultry_leg` | 🍗 |
| `#668` | `3.160` | `meat_on_bone` | 🍖 |
| `#669` | `3.161` | `spaghetti` | 🍝 |
| `#670` | `3.162` | `curry` | 🍛 |
| `#671` | `3.163` | `fried_shrimp` | 🍤 |
| `#672` | `3.164` | `bento` | 🍱 |
| `#673` | `3.165` | `sushi` | 🍣 |
| `#674` | `3.166` | `fish_cake` | 🍥 |
| `#675` | `3.167` | `rice_ball` | 🍙 |
| `#676` | `3.168` | `rice_cracker` | 🍘 |
| `#677` | `3.169` | `rice` | 🍚 |
| `#678` | `3.170` | `ramen` | 🍜 |
| `#679` | `3.171` | `stew` | 🍲 |
| `#680` | `3.172` | `oden` | 🍢 |
| `#681` | `3.173` | `dango` | 🍡 |
| `#682` | `3.174` | `egg` | 🍳 |
| `#683` | `3.175` | `bread` | 🍞 |
| `#684` | `3.176` | `doughnut` | 🍩 |
| `#685` | `3.177` | `custard` | 🍮 |
| `#686` | `3.178` | `icecream` | 🍦 |
| `#687` | `3.179` | `ice_cream` | 🍨 |
| `#688` | `3.180` | `shaved_ice` | 🍧 |
| `#689` | `3.181` | `birthday` | 🎂 |
| `#690` | `3.182` | `cake` | 🍰 |
| `#691` | `3.183` | `cookie` | 🍪 |
| `#692` | `3.184` | `chocolate_bar` | 🍫 |
| `#693` | `3.185` | `candy` | 🍬 |
| `#694` | `3.186` | `lollipop` | 🍭 |
| `#695` | `3.187` | `honey_pot` | 🍯 |
| `#696` | `3.188` | `apple` | 🍎 |
| `#697` | `3.189` | `green_apple` | 🍏 |
| `#698` | `3.190` | `tangerine` | 🍊 |
| `#699` | `3.191` | `cherries` | 🍒 |
| `#700` | `3.192` | `grapes` | 🍇 |
| `#701` | `3.193` | `watermelon` | 🍉 |
| `#702` | `3.194` | `strawberry` | 🍓 |
| `#703` | `3.195` | `peach` | 🍑 |
| `#704` | `3.196` | `melon` | 🍈 |
| `#705` | `3.197` | `banana` | 🍌 |
| `#706` | `3.198` | `pineapple` | 🍍 |
| `#707` | `3.199` | `sweet_potato` | 🍠 |
| `#708` | `3.200` | `eggplant` | 🍆 |
| `#709` | `3.201` | `tomato` | 🍅 |
| `#710` | `3.202` | `corn` | 🌽 |

### Group 4 — Places (65 glyphs)

| record | index | title | glyph |
|---|---|---|---|
| `#712` | `4.1` | `house` | 🏠 |
| `#713` | `4.2` | `house_with_garden` | 🏡 |
| `#714` | `4.3` | `school` | 🏫 |
| `#715` | `4.4` | `office` | 🏢 |
| `#716` | `4.5` | `post_office` | 🏣 |
| `#717` | `4.6` | `hospital` | 🏥 |
| `#718` | `4.7` | `bank` | 🏦 |
| `#719` | `4.8` | `convenience_store` | 🏪 |
| `#720` | `4.9` | `love_hotel` | 🏩 |
| `#721` | `4.10` | `hotel` | 🏨 |
| `#722` | `4.11` | `wedding` | 💒 |
| `#723` | `4.12` | `church` | ⛪ |
| `#724` | `4.13` | `department_store` | 🏬 |
| `#725` | `4.14` | `city_sunrise` | 🌇 |
| `#726` | `4.15` | `city_sunset` | 🌆 |
| `#727` | `4.16` | `japanese_castle` | 🏯 |
| `#728` | `4.17` | `european_castle` | 🏰 |
| `#729` | `4.18` | `tent` | ⛺ |
| `#730` | `4.19` | `factory` | 🏭 |
| `#731` | `4.20` | `tokyo_tower` | 🗼 |
| `#732` | `4.21` | `japan` | 🗾 |
| `#733` | `4.22` | `mount_fuji` | 🗻 |
| `#734` | `4.23` | `sunrise_over_mountains` | 🌄 |
| `#735` | `4.24` | `sunrise` | 🌅 |
| `#736` | `4.25` | `night_with_stars` | 🌃 |
| `#737` | `4.26` | `statue_of_liberty` | 🗽 |
| `#738` | `4.27` | `bridge_at_night` | 🌉 |
| `#739` | `4.28` | `carousel_horse` | 🎠 |
| `#740` | `4.29` | `ferris_wheel` | 🎡 |
| `#741` | `4.30` | `fountain` | ⛲ |
| `#742` | `4.31` | `roller_coaster` | 🎢 |
| `#743` | `4.32` | `ship` | 🚢 |
| `#744` | `4.33` | `boat` | ⛵ |
| `#745` | `4.34` | `speedboat` | 🚤 |
| `#746` | `4.35` | `rocket` | 🚀 |
| `#747` | `4.36` | `seat` | 💺 |
| `#748` | `4.37` | `station` | 🚉 |
| `#749` | `4.38` | `bullettrain_side` | 🚄 |
| `#750` | `4.39` | `bullettrain_front` | 🚅 |
| `#751` | `4.40` | `metro` | 🚇 |
| `#752` | `4.41` | `railway_car` | 🚃 |
| `#753` | `4.42` | `bus` | 🚌 |
| `#754` | `4.43` | `blue_car` | 🚙 |
| `#755` | `4.44` | `car` | 🚗 |
| `#756` | `4.45` | `taxi` | 🚕 |
| `#757` | `4.46` | `truck` | 🚚 |
| `#758` | `4.47` | `rotating_light` | 🚨 |
| `#759` | `4.48` | `police_car` | 🚓 |
| `#760` | `4.49` | `fire_engine` | 🚒 |
| `#761` | `4.50` | `ambulance` | 🚑 |
| `#762` | `4.51` | `bike` | 🚲 |
| `#763` | `4.52` | `barber` | 💈 |
| `#764` | `4.53` | `busstop` | 🚏 |
| `#765` | `4.54` | `ticket` | 🎫 |
| `#766` | `4.55` | `traffic_light` | 🚥 |
| `#767` | `4.56` | `construction` | 🚧 |
| `#768` | `4.57` | `beginner` | 🔰 |
| `#769` | `4.58` | `fuelpump` | ⛽ |
| `#770` | `4.59` | `izakaya_lantern` | 🏮 |
| `#771` | `4.60` | `slot_machine` | 🎰 |
| `#772` | `4.61` | `moyai` | 🗿 |
| `#773` | `4.62` | `circus_tent` | 🎪 |
| `#774` | `4.63` | `performing_arts` | 🎭 |
| `#775` | `4.64` | `round_pushpin` | 📍 |
| `#776` | `4.65` | `triangular_flag_on_post` | 🚩 |

### Group 5 — Symbols (104 glyphs)

| record | index | title | glyph |
|---|---|---|---|
| `#778` | `5.1` | `keycap_ten` | 🔟 |
| `#779` | `5.2` | `1234` | 🔢 |
| `#780` | `5.3` | `symbols` | 🔣 |
| `#781` | `5.4` | `capital_abcd` | 🔠 |
| `#782` | `5.5` | `abcd` | 🔡 |
| `#783` | `5.6` | `abc` | 🔤 |
| `#784` | `5.7` | `arrow_up_small` | 🔼 |
| `#785` | `5.8` | `arrow_down_small` | 🔽 |
| `#786` | `5.9` | `rewind` | ⏪ |
| `#787` | `5.10` | `fast_forward` | ⏩ |
| `#788` | `5.11` | `arrow_double_up` | ⏫ |
| `#789` | `5.12` | `arrow_double_down` | ⏬ |
| `#790` | `5.13` | `ok` | 🆗 |
| `#791` | `5.14` | `new` | 🆕 |
| `#792` | `5.15` | `up` | 🆙 |
| `#793` | `5.16` | `cool` | 🆒 |
| `#794` | `5.17` | `free` | 🆓 |
| `#795` | `5.18` | `ng` | 🆖 |
| `#796` | `5.19` | `signal_strength` | 📶 |
| `#797` | `5.20` | `cinema` | 🎦 |
| `#798` | `5.21` | `koko` | 🈁 |
| `#799` | `5.22` | `u6307` | 🈯 |
| `#800` | `5.23` | `u7a7a` | 🈳 |
| `#801` | `5.24` | `u6e80` | 🈵 |
| `#802` | `5.25` | `u5408` | 🈴 |
| `#803` | `5.26` | `u7981` | 🈲 |
| `#804` | `5.27` | `ideograph_advantage` | 🉐 |
| `#805` | `5.28` | `u5272` | 🈹 |
| `#806` | `5.29` | `u55b6` | 🈺 |
| `#807` | `5.30` | `u6709` | 🈶 |
| `#808` | `5.31` | `u7121` | 🈚 |
| `#809` | `5.32` | `restroom` | 🚻 |
| `#810` | `5.33` | `mens` | 🚹 |
| `#811` | `5.34` | `womens` | 🚺 |
| `#812` | `5.35` | `baby_symbol` | 🚼 |
| `#813` | `5.36` | `wc` | 🚾 |
| `#814` | `5.37` | `no_smoking` | 🚭 |
| `#815` | `5.38` | `u7533` | 🈸 |
| `#816` | `5.39` | `accept` | 🉑 |
| `#817` | `5.40` | `cl` | 🆑 |
| `#818` | `5.41` | `sos` | 🆘 |
| `#819` | `5.42` | `id` | 🆔 |
| `#820` | `5.43` | `no_entry_sign` | 🚫 |
| `#821` | `5.44` | `underage` | 🔞 |
| `#822` | `5.45` | `no_entry` | ⛔ |
| `#823` | `5.46` | `negative_squared_cross_mark` | ❎ |
| `#824` | `5.47` | `white_check_mark` | ✅ |
| `#825` | `5.48` | `heart_decoration` | 💟 |
| `#826` | `5.49` | `vs` | 🆚 |
| `#827` | `5.50` | `vibration_mode` | 📳 |
| `#828` | `5.51` | `mobile_phone_off` | 📴 |
| `#829` | `5.52` | `ab` | 🆎 |
| `#830` | `5.53` | `diamond_shape_with_a_dot_inside` | 💠 |
| `#831` | `5.54` | `ophiuchus` | ⛎ |
| `#832` | `5.55` | `six_pointed_star` | 🔯 |
| `#833` | `5.56` | `atm` | 🏧 |
| `#834` | `5.57` | `chart` | 💹 |
| `#835` | `5.58` | `heavy_dollar_sign` | 💲 |
| `#836` | `5.59` | `currency_exchange` | 💱 |
| `#837` | `5.60` | `x` | ❌ |
| `#838` | `5.61` | `exclamation` | ❗ |
| `#839` | `5.62` | `question` | ❓ |
| `#840` | `5.63` | `grey_exclamation` | ❕ |
| `#841` | `5.64` | `grey_question` | ❔ |
| `#842` | `5.65` | `o` | ⭕ |
| `#843` | `5.66` | `top` | 🔝 |
| `#844` | `5.67` | `end` | 🔚 |
| `#845` | `5.68` | `back` | 🔙 |
| `#846` | `5.69` | `on` | 🔛 |
| `#847` | `5.70` | `soon` | 🔜 |
| `#848` | `5.71` | `arrows_clockwise` | 🔃 |
| `#849` | `5.72` | `clock12` | 🕛 |
| `#850` | `5.73` | `clock1` | 🕐 |
| `#851` | `5.74` | `clock2` | 🕑 |
| `#852` | `5.75` | `clock3` | 🕒 |
| `#853` | `5.76` | `clock4` | 🕓 |
| `#854` | `5.77` | `clock5` | 🕔 |
| `#855` | `5.78` | `clock6` | 🕕 |
| `#856` | `5.79` | `clock7` | 🕖 |
| `#857` | `5.80` | `clock8` | 🕗 |
| `#858` | `5.81` | `clock9` | 🕘 |
| `#859` | `5.82` | `clock10` | 🕙 |
| `#860` | `5.83` | `clock11` | 🕚 |
| `#861` | `5.84` | `heavy_plus_sign` | ➕ |
| `#862` | `5.85` | `heavy_minus_sign` | ➖ |
| `#863` | `5.86` | `heavy_division_sign` | ➗ |
| `#864` | `5.87` | `white_flower` | 💮 |
| `#865` | `5.88` | `100` | 💯 |
| `#866` | `5.89` | `radio_button` | 🔘 |
| `#867` | `5.90` | `link` | 🔗 |
| `#868` | `5.91` | `curly_loop` | ➰ |
| `#869` | `5.92` | `trident` | 🔱 |
| `#870` | `5.93` | `small_red_triangle` | 🔺 |
| `#871` | `5.94` | `black_square_button` | 🔲 |
| `#872` | `5.95` | `white_square_button` | 🔳 |
| `#873` | `5.96` | `red_circle` | 🔴 |
| `#874` | `5.97` | `large_blue_circle` | 🔵 |
| `#875` | `5.98` | `small_red_triangle_down` | 🔻 |
| `#876` | `5.99` | `white_large_square` | ⬜ |
| `#877` | `5.100` | `black_large_square` | ⬛ |
| `#878` | `5.101` | `large_orange_diamond` | 🔶 |
| `#879` | `5.102` | `large_blue_diamond` | 🔷 |
| `#880` | `5.103` | `small_orange_diamond` | 🔸 |
| `#881` | `5.104` | `small_blue_diamond` | 🔹 |

---

**Inventory total: 635 rows — matching the 635 records whose class is `intercom-emoji-picker-emoji`,
and matching the `display: inline-table` / `width: 30px` / `line-height: 30px` counts of 635/882 in
`DEFAULTS.txt:7,11,66`. 628 of the 635 titles are distinct; the 7 repeats are the
"Frequently used" duplicates listed in §3.**
