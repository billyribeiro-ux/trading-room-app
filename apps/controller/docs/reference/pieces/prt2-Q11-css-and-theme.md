# prt2 — Q11 · Stylesheet inventory and the theme verdict

**Purpose.** Full inventory of the 15 stylesheets attached to the SECOND reference capture, and a
hard-evidence verdict on how (and whether) this page is themed. Every prior claim is re-verified
against the raw slices; three of them turn out to be wrong or imprecise and are corrected.

**Evidence root.** `/tmp/ptr-decode/prt2/`
**Sheets.** `01-stylesheets/00.css` … `14.css` (15 files), indexed by `00-META.txt:24-39`.
**Captures.** `caps/00-baseline-room` (full, 882 records) + three diff captures
`01-forced-darkTheme`, `02-forced-lightTheme`, `03-final-room`.

---

## 1. THE 15 SHEETS — full inventory

| # | `href` (from `00-META.txt`) | rules | source bytes | decoded file | body captured? |
|---|---|---|---|---|---|
| 00 | `(inline)` | 2 | 78 | `00.css` (119 B) | ✔ |
| 01 | `(inline)` | 2 | 169 | `01.css` (210 B) | ✔ |
| 02 | `https://protradingroom.com/public/app/css/bootstrap.min.css` | **1187** | 134 760 | `02.css` (135 384 B) | ✔ |
| 03 | `https://vjs.zencdn.net/7.3.0/video-js.min.css` | **0** | 12 | `03.css` (90 B) | ✘ **CORS-BLOCKED** |
| 04 | `https://protradingroom.com/public/vendor/angularjs-color-picker/angularjs-color-picker.min.css` | 48 | 30 377 | `04.css` (30 505 B) | ✔ |
| 05 | `https://protradingroom.com/public/vendor/angularjs-color-picker/angularjs-color-picker-bootstrap.min.css` | 3 | 254 | `05.css` (391 B) | ✔ |
| 06 | `https://protradingroom.com/public/vendor/angular-xeditable/dist/css/xeditable.min.css` | 23 | 2 643 | `06.css` (2 762 B) | ✔ |
| 07 | `https://cdnjs.cloudflare.com/ajax/libs/angularjs-toaster/2.2.0/toaster.min.css` | **0** | 12 | `07.css` (123 B) | ✘ **CORS-BLOCKED** |
| 08 | `https://protradingroom.com/public/vendor/textAngular/src/textAngular.css` | 26 | 3 412 | `08.css` (3 518 B) | ✔ |
| 09 | `https://protradingroom.com/public/app/css/styles.css` | **2290** | 195 160 | `09.css` (195 272 B) | ✔ |
| 10 | `https://protradingroom.com/public/vendor/font-awesome/css/font-awesome.min.css` | 551 | 24 767 | `10.css` (25 919 B) | ✔ |
| 11 | `https://protradingroom.com/public/vendor/feather/webfont/feather-webfont/feather.css` | 135 | 5 946 | `11.css` (6 330 B) | ✔ |
| 12 | `https://protradingroom.com/public/vendor/animate.css/animate.min.css` | 226 | 36 536 | `12.css` (36 640 B) | ✔ |
| 13 | `(inline)` | 4 | 235 | `13.css` (277 B) | ✔ |
| 14 | `(inline)` | 15 | 4 353 | `14.css` (4 396 B) | ✔ |
| | **TOTAL** | **4 512** | **438 714** | | 13 of 15 |

*(Decoded file sizes are larger than source bytes because each decoded file begins with a
`/* sheet[n] href=… ruleCount=… */` header line.)*

### 1.1 The two CORS-blocked sheets — CONFIRMED

Both files contain **nothing but the header and the literal marker**:

```
$ cat 01-stylesheets/03.css
/* sheet[3] href=https://vjs.zencdn.net/7.3.0/video-js.min.css ruleCount=0 */
CORS-BLOCKED

$ cat 01-stylesheets/07.css
/* sheet[7] href=https://cdnjs.cloudflare.com/ajax/libs/angularjs-toaster/2.2.0/toaster.min.css ruleCount=0 */
CORS-BLOCKED
```

Both are third-party CDN sheets served without `Access-Control-Allow-Origin`, so
`document.styleSheets[n].cssRules` throws and `ruleCount` is 0. **Verdict on prior claim: CONFIRMED,
and it is exactly these two — video-js and angularjs-toaster.** Both are recoverable outside the
dump (public CDN URLs), so this gap is closable — see `prt2-Q12-gaps-and-pii.md §a.9`.

### 1.2 The four inline sheets, and where they come from

| sheet | contents | attributable to |
|---|---|---|
| `00.css` | `.video-js { width: 300px; height: 150px; }` · `.vjs-fluid { padding-top: 56.25%; }` | video.js runtime injection |
| `01.css` | `[ng\:cloak], [ng-cloak], [data-ng-cloak], [x-ng-cloak], .ng-cloak, .x-ng-cloak, .ng-hide:not(.ng-hide-animate) { display: none !important; }` · `ng\:form { display: block; }` | **AngularJS core** — this is the rule that makes every `.ng-hide` node in the capture invisible |
| `13.css` | 4 `.vjs-youtube*` rules | videojs-youtube plugin injection |
| `14.css` | 15 rules: `body{overflow:auto}`, 12 `intercom-*` rules, `.chat-input-tool` | **the app itself** — this is record `#32 path=r.0.1.0 <style class="ng-scope">` |

**`14.css` is provably the app's own template `<style>`.** The record's captured text preview
(`nodes-000.txt:929`) begins:

```
body {\n    overflow: auto;\n  }\n\n  .intercom-composer-popover-input {\n    font-size-adjust: none;\n …
```

— matching `14.css`'s first two rules in order. Its `class="ng-scope"` means AngularJS compiled it,
so it is inside a view template, not the static shell. This is load-bearing evidence for
`prt2-Q10-intercom-emoji-picker.md §1.3`.

⚠ **Only ONE `<style>` element exists in the whole 882-record capture** (element census: `style` ×1).
So sheets 00, 01 and 13 have **no corresponding element in the dump** — they live in the uncaptured
`<head>`, or were inserted via CSSOM without a `<style>` node the serialiser walked. Honest gap,
recorded.

### 1.3 Media queries

144 `@media` blocks total, in only three sheets: `02.css` (bootstrap) 68, `09.css` (styles.css) 74,
`06.css` (xeditable) 2. **Zero `@media (prefers-color-scheme: …)` anywhere** (grep count 0 across all
15 files). The page has no OS-level dark-mode response.

---

## 2. CUSTOM PROPERTIES — none, anywhere

### 2.1 `cssVars` is `{}` for all four captures — CONFIRMED

`00-META.txt:17-21`, verbatim:

```
[00] baseline-room:     {"root":{},"body":{}}
[01] forced-darkTheme:  {"root":{},"body":{}}
[02] forced-lightTheme: {"root":{},"body":{}}
[03] final-room:        {"root":{},"body":{}}
```

Corroborated per-capture in each `INFO.txt:9` (`cssVars : {"root":{},"body":{}}`).

### 2.2 `var(--` returns zero across all sheets — CONFIRMED

Per-file grep count of `var(--`:

| sheet | 00 | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `var(--` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

**Total: 0.** A grep for the bare token `--` across all 15 sheets also returns **0**, so there is not
even a *declaration* of a custom property anywhere. `:root` appears 6 times and never carries one:

```
02.css:20   svg:not(:root) { overflow: hidden; }
10.css:34   :root .fa-rotate-90, :root .fa-rotate-180, :root .fa-rotate-270,
            :root .fa-flip-horizontal, :root .fa-flip-vertical { filter: none; }
```

**This is a pre-custom-property codebase.** A Svelte rebuild that themes via `--color-*` tokens is
architecturally *better* but is a deliberate divergence from the reference, not a match.

---

## 3. `darkTheme` / `lightTheme` — the class the harness set has NO CSS behind it

### 3.1 Zero hits in the stylesheets — CONFIRMED

Per-file grep count for `darkTheme` and `lightTheme` (case-insensitive):

| sheet | 00 | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hits | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

**Total: 0.** Also 0 for `body.dark`, 0 for `data-theme`, 0 for `prefers-color-scheme`.

`00-META.txt:12-14` records the harness setting `themeClass="footer-hidden darkTheme"` and
`themeClass="footer-hidden lightTheme"` on `<body>`. **Those class names match no selector in any of
the 4 512 rules.** The forced-theme experiment therefore had, and could have had, no effect.

### 3.2 The real theming: a per-element `.dark` / `.light` class

Complete list of `.dark` / `.light` selectors in `styles.css` (`09.css`), first copy — the file ships
its content twice (§5), so every line below repeats at `+1270`:

| line (copy A) | line (copy B) | rule |
|---|---|---|
| 1131 | 2401 | `.dark .chat-msg-txt a:hover { color: rgb(0, 0, 255); }` |
| 1132 | 2402 | `.dark .chat-msg-txt a:visited, .dark .chat-msg-txt a:link { color: rgb(50, 176, 213); }` |
| 1158 | 2428 | `li.chatUpvoted.light { border: 2px solid rgb(0, 0, 0); }` |
| **1195** | **2465** | **`.dark { background-color: black; color: white; }`** |
| **1196** | **2466** | **`.light { }`** ← **completely empty** |
| 1197 | 2467 | `div.l-row.dark { background-color: black; color: rgb(224, 224, 224); }` |
| 1198 | 2468 | `div.l-row.dark a { color: rgb(208, 208, 208); }` |
| 1199 | 2469 | `div.chatHeader.dark { color: rgb(136, 136, 136); background-color: rgb(72, 72, 72); border-width: medium; border-style: none; border-color: currentcolor; border-image: none; }` |
| 1200 | 2470 | `div.p.bt.dark { color: rgb(136, 136, 136); background-color: rgb(72, 72, 72); border-width: medium; border-style: none; border-color: currentcolor; border-image: none; }` |
| 1201 | 2471 | `input.form-control.dark, .btn.btn-default.dark { background-color: rgb(0, 0, 0); }` |

**Verdict on prior claim "the real theming is a per-element `.dark`/`.light` class scoped to
chat/room components (`styles.css:1195-1201`) with `.light { }` empty" — CONFIRMED, exactly.**
Lines 1195–1201 of the decoded `09.css` are precisely the theming block; `.light` is an empty rule
set; and every other `.dark` selector targets chat/room primitives
(`.chat-msg-txt`, `div.l-row`, `div.chatHeader`, `div.p.bt`, `input.form-control`,
`.btn.btn-default`) plus `li.chatUpvoted.light`.

One near-miss to keep separate: **`.dark-theme-badge-id { font-size: 10px; }`** at `09.css:2565` is a
distinct class name, not a `.dark` variant, and it appears **only once** (it lives in the file's
unique 31-line tail, §5).

### 3.3 None of these classes are on this page

Attribute census across all 882 records of `caps/00-baseline-room`: no element carries `dark`,
`light`, `chat-msg-txt`, `l-row`, `chatHeader`, or `chatUpvoted`. The Account-Settings route has
**zero themed elements**. Theming lives entirely in the chat/room views, which this capture does not
reach.

---

## 4. THE THEME EXPERIMENT — what the three diff captures actually prove

### 4.1 All four `DEFAULTS.txt` tables are byte-identical — CONFIRMED (modulo the label line)

`diff` of `00-baseline-room/DEFAULTS.txt` against each of the other three returns **exactly one
changed line — line 1, the capture label**:

```
< COMMON (most-frequent) computed-style values for capture "baseline-room" — 882 nodes.
> COMMON (most-frequent) computed-style values for capture "forced-darkTheme" — 882 nodes.
```

…and likewise for `forced-lightTheme` and `final-room`. All 99 property rows — value, count and
distinct-count — are identical in all four. File sizes differ only by the label length
(3841 / 3844 / 3845 / 3838 bytes).

**Verdict: CONFIRMED.** Forcing a theme class changed **not one computed value** anywhere in the
page.

### 4.2 Forcing dark/light changes only the body class — CONFIRMED IN SUBSTANCE, with a precision correction

The diff captures declare **27 differing nodes**, not 1:

| capture | identical to baseline | differing | removed |
|---|---|---|---|
| `01-forced-darkTheme` | 855/882 | **27** | 0 |
| `02-forced-lightTheme` | 855/882 | **27** | 0 |
| `03-final-room` | 856/882 | **26** | 0 |

I checked every one of those difference lines mechanically, splitting each on `" -> "` and comparing
left-hand to right-hand:

| capture | lines where LHS == RHS (no real change) | lines with a REAL change |
|---|---|---|
| `01-forced-darkTheme` | **41** | **1** — `attr class: "footer-hidden" -> "footer-hidden darkTheme"` |
| `02-forced-lightTheme` | **41** | **1** — `attr class: "footer-hidden" -> "footer-hidden lightTheme"` |
| `03-final-room` | **41** | **0** |

So: the **only** substantive change in either forced-theme capture is the `class` attribute on
`<body>` (`#0 path=r`). The other 26 records are **pseudo-element records whose printed before→after
values are byte-identical strings** — a decoder artifact (the diff engine compares `::before`/
`::after` by object identity, not by value). I verified byte-identity with `od -c` on a sample line:
both sides render `{"content":"\"\357\200\223\"","color":"rgb(255, 255, 255)","font-family":"FontAwesome",…}`.

The 26 phantom records are exactly the 26 elements that have a `::before` and/or `::after` (15 with
both = 30 lines, 11 with `::before` only = 11 lines, total 41 pseudo lines).

**Verdict: the prior claim is right in substance and slightly wrong in letter.** Corrected statement:
*forcing `darkTheme`/`lightTheme` changes the `<body>` `class` attribute and nothing else; 26
further nodes are reported as "differing" but their captured values are byte-identical.*

### 4.3 The dark and light diff files are byte-identical to each other — **FALSE**

`diff caps/01-forced-darkTheme/nodes-000.txt caps/02-forced-lightTheme/nodes-000.txt`:

```
1c1
< DIFF vs baseline — capture[1] forced-darkTheme — records 0..26 of 27
---
> DIFF vs baseline — capture[2] forced-lightTheme — records 0..26 of 27
4c4
<   attr class: "footer-hidden" -> "footer-hidden darkTheme"
---
>   attr class: "footer-hidden" -> "footer-hidden lightTheme"
```

**Two lines differ.** The files are **not** byte-identical.

What *is* byte-identical is the pair of `IDENTICAL-TO-BASELINE.txt` manifests:

```
md5 caps/01-forced-darkTheme/IDENTICAL-TO-BASELINE.txt = 07a7bbb66749581814b391e73a670dc2
md5 caps/02-forced-lightTheme/IDENTICAL-TO-BASELINE.txt = 07a7bbb66749581814b391e73a670dc2
md5 caps/03-final-room/IDENTICAL-TO-BASELINE.txt        = 6f63903b0d683a91edabab623bd4f6f0
```

`diff` between the dark and light manifests is empty. **Corrected claim: the dark and light captures'
`IDENTICAL-TO-BASELINE.txt` manifests are byte-identical; their `nodes-000.txt` diff files differ in
exactly two lines (the header label and the theme class name).**

Both `NODES-REMOVED-VS-BASELINE.txt` files read `0 baseline node path(s) absent from this capture:` —
no node was added or removed by either theme.

### 4.4 `final-room` == `baseline-room`, byte for byte — VERIFIED (with the right definition)

The two captures are serialised in **different formats** (`00-baseline-room` is a FULL dump across 8
files; `03-final-room` is a DIFF dump in 1 file), so a raw file `cmp` is meaningless. The correct,
and stronger, verification is:

1. `03-final-room/INFO.txt` — `node count : 882 (declared 882, truncated=false)`, same 882 nodes.
2. `03-final-room/NODES-REMOVED-VS-BASELINE.txt` — `0 baseline node path(s) absent`.
3. `03-final-room/IDENTICAL-TO-BASELINE.txt:1` — **`856 of 882 nodes are byte-identical to
   baseline-room (rect, attrs, tag, text, ::before, ::after, and ALL computed style props).`**
4. The remaining **26** records are the phantom pseudo-element records, and I proved mechanically
   that **0 of their 41 difference lines carry a real change** (§4.2 table, `03-final-room` row:
   `identical-printed: 41  real: 0`).
5. `03-final-room/DEFAULTS.txt` is identical to baseline's on all 99 property rows (§4.1).
6. `03-final-room/nodes-000.txt` contains **no `#0 path=r <body>` record at all** — unlike the two
   forced-theme captures — confirming the body class returned to plain `"footer-hidden"`
   (`00-META.txt:15`: `themeClass="footer-hidden"`).

**VERDICT: `final-room` is content-identical to `baseline-room` on every captured attribute, text
node, rect, pseudo-element and computed style property, for all 882 nodes.** The theme experiment
left no residue. (Stating this as "byte for byte" would be false at file level and true at content
level; I state the content-level claim, which is what matters.)

### 4.5 What the theme experiment proves, and what it does not

**Proves:** on `#/page/welcome`, `darkTheme` and `lightTheme` on `<body>` are inert. There is no
selector for them in 4 512 rules, no custom property to flip, and no computed value changes.

**Does not prove:** that the *app* has no theming. It plainly does — the `.dark`/`.light` block at
`09.css:1195-1201` is real, and the repo's git log references chat/alerts detach work on room
components. This capture simply never renders a themed element. **Honest gap: the room/chat route
where `.dark` actually applies is not in this dump.**

---

## 5. `styles.css` ships its own content twice — CONFIRMED, with the exact boundary

`09.css` has **2 574 lines**: 1 header comment + **2 573 rule lines**.

| measure | value |
|---|---|
| rule lines | 2 573 |
| **distinct** rule lines | **1 224** |
| lines appearing exactly twice | 1 176 |
| lines appearing exactly once | 36 |
| lines appearing >2× (shared boilerplate) | 12 distinct lines, at 4×–88× |

The file's first rule, `.glyphicon { … }`, occurs at **line 2** and again at **line 1273** — an
offset of **1 271 lines**. Diffing the two blocks:

```
$ diff <(sed -n '2,1272p' 09.css) <(sed -n '1273,2543p' 09.css)
1047,1048c1047
< .thumb16 { margin-right: 5px; width: 16px !important; height: 16px !important; line-height: 16px !important; }
< .thumb20 { margin-right: 5px; width: 20px !important; height: 20px !important; line-height: 20px !important; }
---
> .thumb16 { width: 16px !important; height: 16px !important; line-height: 16px !important; }
1271a1271
> .roomArea { height: 100%; display: flex !important; flex-direction: column !important; }
```

**Only 4 differing lines out of 2 542.** Copy B drops `.thumb20`, drops `margin-right: 5px` from
`.thumb16`, and gains `.roomArea` — i.e. copy B is a slightly *newer* build of the same sheet
concatenated after copy A. Lines **2544–2574** are a unique 31-line tail present in neither copy
(`.alertsChatArea`, `.l-cell-presentation-sections`, `.room-bg-image*`, `.chat-tab-row`,
`.badge-preview`, `.dark-theme-badge-id`, `.cursor-pointer:hover`, …).

**Verdict on prior claim: CONFIRMED.** Roughly **49 % of `styles.css` (1 271 of 2 573 rule lines) is
literally duplicated**, meaning ~95 KB of the 195 KB sheet is dead weight. Because CSS cascade
resolves later-identical rules to the same value, this is invisible in the computed styles — but it
is a real, citable build defect in the reference. **A rebuild must not reproduce it.**

Consequence for later-wins specificity: any rule in copy B silently overrides its copy-A twin. The
only place this matters is `.thumb16` — copy B's version (no `margin-right`) wins. No element in
this capture carries `.thumb16`, so it is moot here, but it is a live trap for the room views.

---

## 6. Third-party CSS that the app then overrides

| overridden selector | overriding rule | source |
|---|---|---|
| `.intercom-composer-popover` (`14.css`: `right: calc(50% - 390px)`) | `.intercom-composer-popover { right: 10px !important; }` | `09.css:1251` **and** `09.css:2521` |

Confirmed against the computed style: `#116` resolves `right: 10px`, not `calc(50% - 390px)`
(`nodes-000.txt:3356`). This is the load-bearing evidence that the app *owns* the Intercom-classed
markup — see `prt2-Q10-intercom-emoji-picker.md §1.4`.

`grep -c -i intercom` per sheet: `14.css` = 13, `09.css` = 2, all others = 0.

---

## 7. THEME VERDICT — stated plainly

> **This page has no theme system.**
>
> * No CSS custom properties exist anywhere (`var(--` count 0; `--` count 0; `cssVars` `{}` ×4).
> * No `prefers-color-scheme` query exists (count 0).
> * No `data-theme` attribute selector exists (count 0).
> * The `darkTheme` / `lightTheme` class names the capture harness set on `<body>` match **zero** of
>   the 4 512 rules, and provably changed **zero** computed values.
> * The app's only theming mechanism is a hand-rolled, **per-element** `.dark` / `.light` class
>   defined at `09.css:1195-1201`, whose `.light` rule is **empty** — meaning "light" is not a theme
>   at all, it is the absence of `.dark`.
> * That mechanism is scoped to chat/room primitives, and **not one element on `#/page/welcome`
>   carries it.**
>
> The reference page therefore renders in exactly one appearance: a white `<body>`
> (`background-color: rgb(255, 255, 255)`, `nodes-000.txt:17`) with a black `<nav>`
> (`background-color: rgb(0, 0, 0)` from inline `style="background-color: black;"`,
> `nodes-000.txt:898,916`) and default Bootstrap 3 panels.

---

## 8. REBUILD SPEC

1. **Do not port a theme toggle for this route.** The reference has none that works. If the rebuild
   already has one (`app.css`, project tokens), it must be **off/neutral** for `#/page/welcome` or
   the screenshot diff will not close.
2. **Base palette to reproduce exactly** (all values from `caps/00-baseline-room/nodes-*.txt`):

   | element | value | record |
   |---|---|---|
   | `<body>` background | `rgb(255, 255, 255)` | `#0` |
   | `<body>` font | `14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif` | `#0` |
   | `<nav.navbar.topnavbar>` background | `rgb(0, 0, 0)` (inline `background-color: black`) | `#31` |
   | nav height / min-height | `50px` / `50px` | `#31` |
   | nav link colour | `rgb(255, 255, 255)` (inline `color: #FFFFFF`) | `#58`, `#59` |
   | `.navbar-brand` colour | `rgb(250, 250, 250)`, `18px/50px` | `#41` |
   | panel background / radius | `rgb(255, 255, 255)` / `4px` | `#78`, `#80`, `#83`, `#84`, `#85` |
   | panel shadow | `rgba(0, 0, 0, 0.05) 0px 1px 1px 0px` | same |
   | panel border | `1px solid rgba(0, 0, 0, 0)` | same |
   | `hr` | `1px solid rgb(238, 238, 238)`, `margin 20px 0` | `#51`, `#66`, `#69`, `#72` |
   | table cell border | `1px solid rgb(221, 221, 221)` | `#185`–`#216` |
   | striped row background | `rgb(249, 249, 249)` | `#160`, `#178`, `#182` |
   | `.text-muted` colour | `rgb(119, 119, 119)` | `#212`, `#216`, `#225` |
   | `.form-control` border | `1px solid rgb(219, 217, 217)` | `#89` etc. |
   | `.btn-warning` bg / border | `rgb(240, 173, 78)` / `rgb(238, 162, 54)` | `#93`, `#96`, `#141` |
   | `.btn-info` bg / border | `rgb(91, 192, 222)` / `rgb(70, 184, 218)` | `#97`, `#130`, `#226` |
   | `.btn-success` bg / border | `rgb(92, 184, 92)` / `rgb(76, 174, 76)` | `#101`, `#179` |
   | `.btn-primary` bg / border | `rgb(51, 122, 183)` / `rgb(46, 109, 164)` | `#142`, `#180`, `#206` |
   | `.btn-default` bg / border | `rgb(255, 255, 255)` / `rgb(230, 233, 238)` | `#79`, `#98`, `#143` |
   | `.btn-inverse` bg / border | `rgb(54, 63, 69)` / `rgb(54, 63, 69)` | `#227` |
   | `.label-orange` bg | `rgb(254, 86, 33)` | `#223` |
   | `.label` "New Badge" bg | `rgb(255, 204, 0)` (inline `#ffcc00`) | `#134` |

3. **Custom properties are an allowed improvement**, not a match. If the rebuild uses
   `--color-panel-bg` etc., the *resolved* values must equal the table above to the byte.
4. **Do not duplicate `styles.css`.** Ship it once.
5. **`.light { }` is empty** — do not invent light-mode declarations for it.
6. **Chat/room `.dark` rules are out of scope for this route** but must be preserved for the room
   views; carry `09.css:1195-1201` forward verbatim when those views are rebuilt.
7. **The `<style>` that ships the `intercom-*` CSS lives in the app's view template**
   (`r.0.1.0`). In Svelte that becomes a scoped `<style>` in the component — but note the
   `.intercom-*` classes are also referenced by `styles.css`'s global `!important` override, so
   scoping them would break that override. Flag as a real decision, not a mechanical port.

---

## 9. HONEST GAPS for this piece

1. **Sheets 03 and 07 are CORS-blocked** — `video-js.min.css` and `angularjs-toaster/2.2.0/toaster.min.css`.
   0 rules captured for either. **Closable**: both are public CDN URLs; fetch them directly.
   Impact on this route: video-js styles nothing here (no `<video>`/`.video-js` element in the 882
   records) and toaster styles nothing here (no `toaster`/`toast-*` element), so the pixel risk is
   currently zero — but that is only true for *this* route.
2. **No `<head>` captured.** The dump root is `<body>` (`#0 path=r`). Any `<link rel=stylesheet>`
   ordering, `<meta name=viewport>`, `<title>`, or `<base>` is unknown. Sheet **order** in
   `00-META.txt` is the only cascade evidence available, and it is the `document.styleSheets` order,
   which I am taking at face value.
3. **Three of the four inline sheets have no element in the dump** (only one `<style>` record
   exists, `#32`). Sheets 00, 01 and 13 are attributed to video.js / AngularJS / videojs-youtube by
   *content*, not by a captured element. That attribution is an inference, flagged as such.
4. **No screenshot in `prt2.json`.** The palette in §8 is read from computed styles, which is
   authoritative for colour but cannot confirm antialiasing, font rendering, or image assets.
5. **`:hover`, `:focus`, `:active` and `::placeholder` states are not captured.** Only `::before`
   and `::after`, and only for 5 properties (see `prt2-Q12 §a.6`). The `.intercom-emoji-picker-emoji:hover
   { transform: scale(1.4) }` rule is known from CSS text only.
6. **`@font-face` blocks were not separately extracted.** FontAwesome (`10.css`), Feather
   (`11.css`) and the `intercom-font` reference in `14.css` all imply web fonts; the actual font
   files and their load state are outside the dump. `intercom-font` in particular has **no
   `@font-face` rule in any sheet** and silently falls back.
7. **The theme experiment could only ever be negative on this route**, because no element here
   carries `.dark`/`.light`. A capture of the room/chat route is required to positively verify the
   theming that `09.css:1195-1201` describes.
