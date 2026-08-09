# ptr1-P27 — Theme verdict (definitive)

**Evidence root:** `/tmp/ptr-decode/ptr1/` (decoded from `evidence-dumps/NEXT-STEP/ptr1.json`, 23,535,138 bytes, 23 captures).
**Page under test:** `https://protradingroom.com/ptrApp#/page/manageSession/6a628a99731b9f77ae9bf505` (`00-META.txt:6`), role `member` (`00-META.txt:8`).

---

## Purpose

Answer one question with zero inference: **does this page ship one palette or two?** Every count below was re-run against the raw slices for this pass; nothing is repeated from an earlier report without re-verification. Where a prior pass was wrong, the correction is called out explicitly.

---

## VERDICT

> **ONE palette.** The `manageSession` page ships a single light palette, hard-coded as literal `rgb()`/hex values in the stylesheets. There is **no second compiled palette** anywhere in the 15 captured sheets: zero CSS custom properties, zero `prefers-color-scheme`, zero `darkTheme`/`lightTheme` selectors, and an **empty `.light { }` rule**.
>
> A dark mode *does* exist in the product — but it is **(a)** a per-room **session setting** (`sess.darkThemeAsDefault`, currently `"No"`), **(b)** implemented by a bare `.dark` class that is scoped to **chat/room** widgets, and **(c)** it appears on **zero elements** in all 23 captures. The forced-`darkTheme` and forced-`lightTheme` captures changed **exactly one node out of 2,156** — the `<body>` `class` string — and changed **no style value and no rectangle anywhere in the document.**
>
> **For the rebuild of this page: implement one palette. Do not build a theme switch for `manageSession`.** The dark palette belongs to the room view, which this dump does not contain.

---

## Table 1 — `cssVars` is empty in every DOM capture (21/21)

`00-META.txt` prints `cssVars` verbatim per capture (`00-META.txt:37-59`). Every DOM capture reports the same object. (Capture `[22]` is the `__meta__` pseudo-capture and has `cssVars=null`/`themeClass=null`, `00-META.txt:35`.)

| capture | label | cssVars | line |
|---|---|---|---|
| [00] | baseline-room | `{"root":{},"body":{}}` | `00-META.txt:38` |
| [01] | modal:permissionsModal | `{"root":{},"body":{}}` | `00-META.txt:39` |
| [02] | dropdown:dropdown-menu.show | `{"root":{},"body":{}}` | `00-META.txt:40` |
| [03] | dropdown:dropdown-menu.show | `{"root":{},"body":{}}` | `00-META.txt:41` |
| [04] | dropdown:…-right.show | `{"root":{},"body":{}}` | `00-META.txt:42` |
| [05] | dropdown:dropdown-menu.show | `{"root":{},"body":{}}` | `00-META.txt:43` |
| [06] | dropdown:dropdown-menu.show | `{"root":{},"body":{}}` | `00-META.txt:44` |
| [07] | dropdown:dropdown-menu.show | `{"root":{},"body":{}}` | `00-META.txt:45` |
| [08] | dropdown:dropdown-menu.show | `{"root":{},"body":{}}` | `00-META.txt:46` |
| [09] | dropdown:…-right.show | `{"root":{},"body":{}}` | `00-META.txt:47` |
| [10] | dropdown:dropdown-menu.show | `{"root":{},"body":{}}` | `00-META.txt:48` |
| [11] | dropdown:dropdown-menu.show | `{"root":{},"body":{}}` | `00-META.txt:49` |
| [12] | dropdown:dropdown-menu.show | `{"root":{},"body":{}}` | `00-META.txt:50` |
| [13] | dropdown:dropdown-menu.show | `{"root":{},"body":{}}` | `00-META.txt:51` |
| [14] | dropdown:…-right.show | `{"root":{},"body":{}}` | `00-META.txt:52` |
| [15] | dropdown:dropdown-menu.show | `{"root":{},"body":{}}` | `00-META.txt:53` |
| [16] | dropdown:dropdown-menu.show | `{"root":{},"body":{}}` | `00-META.txt:54` |
| [17] | dropdown:dropdown-menu.show | `{"root":{},"body":{}}` | `00-META.txt:55` |
| [18] | dropdown:dropdown-menu.show | `{"root":{},"body":{}}` | `00-META.txt:56` |
| [19] | forced-darkTheme | `{"root":{},"body":{}}` | `00-META.txt:57` |
| [20] | forced-lightTheme | `{"root":{},"body":{}}` | `00-META.txt:58` |
| [21] | final-room | `{"root":{},"body":{}}` | `00-META.txt:59` |

Per-capture `INFO.txt` agrees (e.g. `caps/00-baseline-room/INFO.txt:8`, `caps/19-forced-darkTheme/INFO.txt:8`, `caps/20-forced-lightTheme/INFO.txt:8`, `caps/21-final-room/INFO.txt:8`).

**Result: 21/21 DOM captures — `{"root":{},"body":{}}`. No custom property is set on `:root` or `body` at any point.**

---

## Table 2 — `var(--…)` and custom-property *declarations*: zero across all 15 sheets

Commands run this pass, over `01-stylesheets/*.css`:

| grep | result |
|---|---|
| `grep -o 'var(--' *.css \| wc -l` | **0** |
| `grep -c 'var(--' 00…14.css` | `0` for every one of the 15 files |
| `grep -oE '(^\|[;{ ])--[a-zA-Z]' *.css \| wc -l` | **0** (no `--name:` declaration anywhere) |
| `grep -c 'darkTheme' 00…14.css` | `0` for every one of the 15 files |
| `grep -c 'lightTheme' 00…14.css` | `0` for every one of the 15 files |
| `grep -c 'prefers-color-scheme' 00…14.css` | `0` for every one of the 15 files |

Per-file zero counts (from the run): `00.css:0 01.css:0 02.css:0 03.css:0 04.css:0 05.css:0 06.css:0 07.css:0 08.css:0 09.css:0 10.css:0 11.css:0 12.css:0 13.css:0 14.css:0` — identical for `var(--`, `darkTheme`, `lightTheme`, and `prefers-color-scheme`.

**There is no token layer. Every colour in this build is a literal.** (Sheets `03.css` and `07.css` are CORS-blocked stubs — see P31 — so "zero" for those two files is a *known gap*, not a measured zero. Both are third-party chrome, Video.js and angularjs-toaster.)

---

## Table 3 — the only `.dark` / `.light` selectors in the entire cascade

`grep -nE '\.dark[ ,.:{)>~+]|\.dark$' 01-stylesheets/*.css` and the same for `.light` return hits in **`09.css` only** (`styles.css`). `09.css` ships **the whole stylesheet twice concatenated** (see P30 §B7), so each rule appears at two line numbers; the first copy is authoritative.

| # | line (copy A) | line (copy B) | selector | declaration |
|---|---|---|---|---|
| 1 | `09.css:1131` | `09.css:2401` | `.dark .chat-msg-txt a:hover` | `color: rgb(0, 0, 255);` |
| 2 | `09.css:1132` | `09.css:2402` | `.dark .chat-msg-txt a:visited, .dark .chat-msg-txt a:link` | `color: rgb(50, 176, 213);` |
| 3 | `09.css:1158` | `09.css:2428` | `li.chatUpvoted.light` | `border: 2px solid rgb(0, 0, 0);` |
| 4 | `09.css:1195` | `09.css:2465` | `.dark` | `background-color: black; color: white;` |
| 5 | **`09.css:1196`** | **`09.css:2466`** | **`.light`** | **`{ }` — EMPTY RULE, zero declarations** |
| 6 | `09.css:1197` | `09.css:2467` | `div.l-row.dark` | `background-color: black; color: rgb(224, 224, 224);` |
| 7 | `09.css:1198` | `09.css:2468` | `div.l-row.dark a` | `color: rgb(208, 208, 208);` |
| 8 | `09.css:1199` | `09.css:2469` | `div.chatHeader.dark` | `color: rgb(136, 136, 136); background-color: rgb(72, 72, 72); border-width: medium; border-style: none; border-color: currentcolor; border-image: none;` |
| 9 | `09.css:1200` | `09.css:2470` | `div.p.bt.dark` | `color: rgb(136, 136, 136); background-color: rgb(72, 72, 72); border-width: medium; border-style: none; border-color: currentcolor; border-image: none;` |
| 10 | `09.css:1201` | `09.css:2471` | `input.form-control.dark, .btn.btn-default.dark` | `background-color: rgb(0, 0, 0);` |

That is the **entire** dark/light primitive: **9 `.dark` rules and 2 `.light` rules**, of which one `.light` rule is empty. Their selectors are `.chat-msg-txt`, `li.chatUpvoted`, `div.l-row`, `div.chatHeader`, `div.p.bt`, `input.form-control`, `.btn.btn-default` — i.e. **chat and room-layout widgets**, none of which exist on `manageSession`.

Related but *not* a theme selector: `09.css:2565 .dark-theme-badge-id { font-size: 10px; }` — a badge-ID label class that happens to contain the substring `dark-theme`. It exists only in copy B of `09.css` (it is one of the 31 rules copy B adds, see P30 §B7) and it sets **font-size only**, no colour. `grep -noiE '[a-z-]*theme[a-z-]*' 01-stylesheets/*.css` returns exactly **one** hit in the whole cascade: `09.css:2565:dark-theme-badge-id`.

---

## Table 4 — forcing `darkTheme` / `lightTheme` changed exactly 1 node of 2,156

Both forced captures are emitted as exhaustive diffs vs baseline.

| | cap [19] forced-darkTheme | cap [20] forced-lightTheme | cap [21] final-room |
|---|---|---|---|
| `themeClass` | `"footer-hidden darkTheme"` (`19/INFO.txt:7`) | `"footer-hidden lightTheme"` (`20/INFO.txt:7`) | `"footer-hidden"` (`21/INFO.txt:7`) |
| node count | 2156 (`19/INFO.txt:5`) | 2156 (`20/INFO.txt:5`) | 2156 (`21/INFO.txt:5`) |
| identical to baseline | **2155 / 2156** (`19/INFO.txt:11`) | **2155 / 2156** (`20/INFO.txt:11`) | **2156 / 2156** (`21/INFO.txt:11`) |
| differing | **1** (`19/INFO.txt:12`) | **1** (`20/INFO.txt:12`) | **0** (`21/INFO.txt:12`) |
| removed vs baseline | **0** (`19/INFO.txt:13`, `19/NODES-REMOVED-VS-BASELINE.txt:1`) | **0** (`20/INFO.txt:13`, `20/NODES-REMOVED-VS-BASELINE.txt:1`) | **0** (`21/INFO.txt:13`) |
| the one differing node | `#0 path=r <body>` — `attr class: "footer-hidden" -> "footer-hidden darkTheme"` (`19/nodes-000.txt:3-4`) | `#0 path=r <body>` — `attr class: "footer-hidden" -> "footer-hidden lightTheme"` (`20/nodes-000.txt:3-4`) | *(no nodes-*.txt emitted — `02-MANIFEST.txt:25` `nodeFiles=0`)* |

Independent re-verification performed this pass (not taken from the INFO header):

- `grep -c '^r' 19/IDENTICAL-TO-BASELINE.txt` → **2155**; same for `20` → **2155**; `21` → **2156**.
- `grep -cx 'r' 19/IDENTICAL-TO-BASELINE.txt` → **0**; `20` → **0**; `21` → **1**. The bare path `r` (= `<body>`) is the *only* path missing from the 19/20 identical-lists, and it is present in 21's.
- `diff 19/IDENTICAL-TO-BASELINE.txt 20/IDENTICAL-TO-BASELINE.txt` → **byte-identical** (the two forced captures diverge from baseline at exactly the same single node).
- `diff 21/IDENTICAL-TO-BASELINE.txt 19/IDENTICAL-TO-BASELINE.txt` → the *only* differences are the header count line and the extra `r` line.

The identical-list header states the comparison basis verbatim (`19/IDENTICAL-TO-BASELINE.txt:1`):

> `2155 of 2156 nodes are byte-identical to baseline-room (rect, attrs, tag, text, ::before, ::after, and ALL computed style props).`

So the 2,155 unchanged nodes are unchanged **including every computed style property and every rectangle**.

### Table 4b — the COMMON computed-style tables are byte-identical too

`DEFAULTS.txt` is the per-capture table of most-frequent computed values across all 2,156 nodes. If a second palette existed, this table would move.

| diff | result |
|---|---|
| `diff 00-baseline-room/DEFAULTS.txt 19-forced-darkTheme/DEFAULTS.txt` | **only line 1 differs** — the capture *label*: `"baseline-room"` → `"forced-darkTheme"` |
| `diff 00-baseline-room/DEFAULTS.txt 20-forced-lightTheme/DEFAULTS.txt` | **only line 1 differs** — `"baseline-room"` → `"forced-lightTheme"` |
| `diff 00-baseline-room/DEFAULTS.txt 21-final-room/DEFAULTS.txt` | **only line 1 differs** — `"baseline-room"` → `"final-room"` |

All 100 property rows (`DEFAULTS.txt:6-101`) are byte-for-byte equal across the four full-DOM captures, including:

- `color | rgb(51, 51, 51) | 1732/2156 | 10` (`DEFAULTS.txt:64`)
- `background-color | rgba(0, 0, 0, 0) | 1999/2156 | 18` (`DEFAULTS.txt:58`)
- `border-top-color | rgb(51, 51, 51) | 1644/2156 | 26` (`DEFAULTS.txt:50`)
- `font-family | "Helvetica Neue", Helvetica, Arial, sans-serif | 1906/2156 | 3` (`DEFAULTS.txt:65`)

**Adding `darkTheme` (or `lightTheme`) to `<body>` moved not a single computed pixel or colour.**

---

## Table 5 — no element carries `class="dark"` or `class="light"` (0 hits, all 23 captures)

`grep -rn 'dark' --include='*.txt' caps/` filtered to exclude the harness-injected `darkTheme` string returns **exactly one line in the whole evidence tree**, and it is *body text*, not a class:

```
caps/00-baseline-room/nodes-006.txt:652:  text: "If enabled, dark theme will be set as default"
```

`grep -rni 'light' --include='*.txt' caps/` filtered to exclude `lightTheme` returns **zero lines**.

Every `attr class = "…"` line in all 23 captures (1,932 class attributes total) was scanned. **No node anywhere carries `dark`, `light`, `dark-theme-badge-id`, `chatUpvoted`, `l-row`, `chatHeader`, or `p bt`.** Consequently **not one of the 9 `.dark` rules and neither `.light` rule can match anything on this page.**

---

## Table 6 — where dark mode actually lives: it is a session setting, not a stylesheet

The single `dark` hit above is the help text of a Settings-tab toggle. The three consecutive records:

| record | path | element | evidence |
|---|---|---|---|
| `#764` | `r.0.1.1.0.1.3.1.5.0.0.77.0` | `<label class="col-sm-2 control-label">` | `text: "Set Dark Theme As Default?"` (`caps/00-baseline-room/nodes-006.txt:608-611`) |
| `#765` | `r.0.1.1.0.1.3.1.5.0.0.77.1` | `<a href="" …>` | `onaftersave = "saveSessField('darkThemeAsDefault')"`, `editable-checkbox = "sess.darkThemeAsDefault"`, `e-title = "Dark Theme As Default?"`, **`text: "No"`** (`caps/00-baseline-room/nodes-006.txt:624-631`) |
| `#767` | `r.0.1.1.0.1.3.1.5.0.0.77.3` | `<label class="muted">` | `text: "If enabled, dark theme will be set as default"` (`caps/00-baseline-room/nodes-006.txt:649-652`) |

And, in the "DON'T TOUCH" section, a per-room **custom dark stylesheet** field:

| record | path | evidence |
|---|---|---|
| `#1458` | `r.0.1.1.0.1.3.1.5.0.4.0.37.0` | `<label class="col-sm-2 control-label">` `text: "Dark Theme Style"` |
| `#1459` | `r.0.1.1.0.1.3.1.5.0.4.0.37.1` | `onaftersave = "saveSessField('darkThemeStyle')"`, `editable-textarea = "sess.darkThemeStyle"`, `e-label = "Dark Theme Style:"`, **`text: "empty"`** |
| `#1461` | `r.0.1.1.0.1.3.1.5.0.4.0.37.3` | `<label class="muted">` `text: "Dark theme style to custimize colors."` *(sic — "custimize")* |
| `#1455` | `r.0.1.1.0.1.3.1.5.0.4.0.36.1` | sibling: `saveSessField('customCSS')` / `editable-textarea="sess.customCSS"` / `e-label="customCSS:"` / `text: "empty"` |

**Reading:** the product's dark mode is a **per-room boolean** (`sess.darkThemeAsDefault`) plus an **optional per-room CSS blob** (`sess.darkThemeStyle`), and it is applied by toggling the bare `.dark` class on room/chat elements **in the room view**. On this capture the boolean is `"No"` and the blob is `"empty"`, so the room would render light and the `.dark` rules would be inert even in the room.

---

## Table 7 — every distinct colour actually rendered on this page (from `DEFAULTS.txt` + all 537 style deviations)

Re-derived this pass by aggregating every `style-deviations` line across `caps/00-baseline-room/nodes-000..017.txt` (537 distinct `prop: value` pairs) plus the `DEFAULTS.txt` COMMON table. All are literals; **not one is a `var()`**.

| role | value | evidence |
|---|---|---|
| default text / borders | `rgb(51, 51, 51)` | `DEFAULTS.txt:50-53,64,86` (COMMON for `color`, all 4 border colours, `outline-color`) |
| default background | `rgba(0, 0, 0, 0)` | `DEFAULTS.txt:58` |
| page background | `rgb(255, 255, 255)` | `#0 <body>` style-deviation `background-color: rgb(255, 255, 255)` (`nodes-000.txt:11`); 67 nodes total |
| xeditable link text | `rgb(10, 10, 10)` ×269 | style-deviation aggregate; matches `09.css` `.editable-click, a.editable-click { color: rgb(10, 10, 10); }` (`09.css:1194`) |
| xeditable underline | `rgb(66, 139, 202)` ×269 (`border-bottom-color`) | style-deviation aggregate |
| inverse text on dark chrome | `rgb(255, 255, 255)` ×78 | style-deviation aggregate |
| danger / red | `rgb(255, 0, 0)` ×27 (text), `rgb(217, 83, 79)` ×2 (bg), `rgb(212, 63, 58)` ×2 (border) | style-deviation aggregate |
| primary blue | `rgb(51, 122, 183)` ×9 (bg), ×11 (text) | style-deviation aggregate |
| info cyan | `rgb(91, 192, 222)` ×17 (bg) / `rgb(70, 184, 218)` ×17 (border) | style-deviation aggregate |
| warning | `rgb(240, 173, 78)` ×7 (bg) / `rgb(238, 162, 54)` ×7 (border) | style-deviation aggregate |
| success | `rgb(92, 184, 92)` ×1 (bg) / `rgb(76, 174, 76)` ×1 (border) | style-deviation aggregate |
| topnav | `background-color: black` (inline) | `#20 <nav class="navbar topnavbar" style="background-color: black;">` (`nodes-000.txt:…`, dense `#20`) |
| muted text | `rgb(119, 119, 119)` ×3, `rgb(128, 128, 128)` ×9, `rgb(85, 85, 85)` ×24 | style-deviation aggregate |

Single font stack: `"Helvetica Neue", Helvetica, Arial, sans-serif` (COMMON, 1906/2156, `DEFAULTS.txt:65`), plus `FontAwesome` on 247 icon nodes and `Menlo, Monaco, Consolas, "Courier New", monospace` on 3 `<pre>` nodes.

---

## What a rebuild must do about this

1. **Build one palette.** Hard-code the light values in Table 7. Do **not** add a theme toggle, `data-theme` attribute, `.dark`/`.light` class hook, or `prefers-color-scheme` block to the `manageSession` route — the reference has none and adding one guarantees a diff.
2. **Do add CSS custom properties if you want them** — that is a *free* internal improvement, because the reference has zero custom properties and therefore zero observable behaviour depending on them. Just make sure the resolved values match Table 7 exactly.
3. **Model the dark theme as data, not as CSS**: `sess.darkThemeAsDefault: boolean` and `sess.darkThemeStyle: string` are two of the 269 session fields the settings form must round-trip (see P29). On this page they are just two more editable rows — value `"No"` and `"empty"` respectively.
4. **Do not port the `.dark` rules to this page.** They belong to the room view. If/when the room is rebuilt, the 9 rules in Table 3 are the complete reference primitive.
5. **`.light { }` is dead.** Ship nothing for it. (If you keep the class for parity, keep it empty.)

---

## Honest gaps in this piece

| gap | why it matters | what would close it |
|---|---|---|
| `03.css` (`video-js.min.css`) and `07.css` (`toaster.min.css`) are **CORS-blocked stubs** — `ruleCount=0`, body is the literal string `CORS-BLOCKED` (`01-stylesheets/03.css:2`, `01-stylesheets/07.css:2`; declared in `00-META.txt:65,69`) | I cannot prove those two sheets contain no custom properties or no dark rules. Neither renders on `manageSession` (no `.video-js` and no `#toast-container` node exists in any capture), so the risk to *this page* is nil — but the claim "zero `var(--` in the cascade" is measured over 13 of 15 sheets, not 15 of 15. | Re-capture with the sheets proxied same-origin, or fetch `https://vjs.zencdn.net/7.3.0/video-js.min.css` and `https://cdnjs.cloudflare.com/ajax/libs/angularjs-toaster/2.2.0/toaster.min.css` directly. |
| **No screenshot in the dump.** | The verdict "one palette" is proven from the DOM+CSSOM, which is authoritative for *computed* colour. It is not a pixel diff. | A real screenshot of the reference at 1842×1265 dpr=2, diffed against the built page. |
| **The room view is not in this dump.** The `.dark` rules, `sess.darkThemeAsDefault=true`, and `sess.darkThemeStyle` all take effect on `/session?id=3625&…` (`#49`'s `href`), which was not captured. | Everything asserted about how dark mode *looks* is out of scope; I only assert where the switch lives and which 9 rules exist. | A capture of the room route with `darkThemeAsDefault` toggled on. |
| The forced-theme captures only prove `darkTheme`/`lightTheme` on `<body>` are **inert**. They do **not** prove the app has no dark mode — Table 6 proves it *does*, under a different mechanism. | Prevents the wrong conclusion "this app has no dark mode". | — (already resolved by Table 6). |
| Decoder-count reconciliation: `00-META.txt:71` declares `09.css ruleCount=2290`; the emitted file has **2,289 top-level rule lines** (plus 88 `@`-lines and 196 indented nested lines). `02.css` declares 1187, emits 1185 top-level. | A 1–2 rule accounting difference between the declared count and the serialized lines. It does not touch any `.dark`/`.light`/`var(--)` finding (all of those were grepped over the full file text, including nested lines). | Compare against the raw `styles.css`/`bootstrap.min.css` from the server. |
