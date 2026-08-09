# prt2 — Q03 — The **Sessions** section (heading, search box, sessions table, the one real room)

**Evidence base:** `/tmp/ptr-decode/prt2/caps/00-baseline-room/` (`DEFAULTS.txt`, `nodes-000.txt` … `nodes-007.txt`, 882 records, `truncated=false`).
**Page:** `https://protradingroom.com/ptrApp#/page/welcome`, `role=member`, viewport `1842×1265 @dpr2`, captured `2026-07-24T15:59:42.449Z`.

> **RESOLUTION NOTE.** prt2's `DEFAULTS.txt` COMMON table is skewed by 635 Intercom emoji `<span>`s (`display:inline-table`, `visibility:hidden`, `width:30px`, `padding:5px`, `font-size:28px`, `line-height:30px`, `text-align:center`, `vertical-align:middle`, `cursor:pointer`, Apple-Color-Emoji stack). **All values in this file are RESOLVED ABSOLUTE values.** Where a table cell does not list `text-align`, the resolved value is `center` — and that is correct, because those cells carry `class="text-center"`. Where a `<th>` *does* list `text-align: left`, that is Bootstrap's `th{text-align:left}` beating the skew.

---

## 1. Purpose

This piece decodes everything from the `Total Sessions : 1` heading down to the bottom of the sessions table: the clickable "Sessions" span, the 348 × 34 search input (`ng-model="sessSearch"` — the only visible input on the entire page), the Archived toggle, the hidden "New Room" button, and the five-column table with its one real data row for room **3625**. It records the live JWT carried by the Launch link as evidence and flags it as a credential.

## 2. Path anchor + record count

**Anchors:** `path=r.0.1.1.0.0.0.0.0` (the `h4`), `path=r.0.1.1.0.0.0.0.1` (the search/Archived row) and `path=r.0.1.1.0.0.0.0.2` (the table row), plus all descendants.

```
cd /tmp/ptr-decode/prt2/caps/00-baseline-room
awk -v RS='' -v ORS='\n\n' '/path=r\.0\.1\.1\.0\.0\.0\.0\.(0|1|2)([. ]|$)/' nodes-*.txt
```

**44 records found:** `#63`, `#64`, `#65`, `#77`, `#78`, `#79`, `#80`, `#81`, `#89`, `#90`, `#91`, `#92`, `#93`, `#111`, `#131`, `#132`, `#159`, `#160`, `#185`–`#194`, `#218`, `#219`, `#220`–`#228`, `#230`–`#234`.

Of those, **34 render** (non-zero rect) and **10 do not** (`#81`, `#91`, `#93`, `#221`, `#222`, `#228`, `#230`, `#231`, `#234`, plus `#190`'s hidden inner content).

Vertical extent of this section: **y = 104 → y = 319.8** (the `.row` `#65` bottom edge = 190.8 + 129).

---

## 3. Node table

| # | path | tag | id | class (verbatim) | x | y | w | h | renders? |
|---|---|---|---|---|---|---|---|---|---|
| 63 | `r.0.1.1.0.0.0.0.0` | `h4` | — | `ng-binding` | 366 | 105 | 1110 | 19.8 | **yes** |
| 77 | `r.0.1.1.0.0.0.0.0.0` | `span` | — | *(no class attribute)* | 410.7 | 104 | 75 | 21.5 | **yes** |
| 64 | `r.0.1.1.0.0.0.0.1` | `div` | — | `row` | 351 | 134.8 | 1140 | 56 | **yes** |
| 78 | `r.0.1.1.0.0.0.0.1.0` | `div` | — | `col-md-4 panel pane-default` | 351 | 134.8 | 380 | 36 | **yes** |
| 89 | `r.0.1.1.0.0.0.0.1.0.0` | `input` | — | `form-control ng-pristine ng-untouched ng-valid` | 367 | 135.8 | **348** | **34** | **yes** — the **only visible input on the page** |
| 79 | `r.0.1.1.0.0.0.0.1.1` | `button` | — | `btn btn-sm btn-default` | 731 | 134.8 | 102.68 | 30 | **yes** |
| 90 | `r.0.1.1.0.0.0.0.1.1.0` | `span` | — | *(no class attribute)* | 742 | 142.8 | 30.4 | 14 | **yes** |
| 91 | `r.0.1.1.0.0.0.0.1.1.1` | `span` | — | `ng-hide` | 0 | 0 | 0 | 0 | no (`display:none`) |
| 65 | `r.0.1.1.0.0.0.0.2` | `div` | — | `row` | 351 | 190.8 | 1140 | 129 | **yes** |
| 80 | `r.0.1.1.0.0.0.0.2.0` | `div` | — | `col-md-12 panel pane-default` | 351 | 190.8 | 1140 | 109 | **yes** |
| 92 | `r.0.1.1.0.0.0.0.2.0.0` | `div` | — | `table-responsive` | 367 | 191.8 | 1108 | 107 | **yes** |
| 111 | `r.0.1.1.0.0.0.0.2.0.0.0` | `table` | — | `table table-striped table-bordered table-hover` | 367 | 191.8 | 1108 | 107 | **yes** |
| 131 | `r.0.1.1.0.0.0.0.2.0.0.0.0` | `thead` | — | *(none)* | 367 | 191.8 | 1108 | 60.5 | **yes** |
| 159 | `r.0.1.1.0.0.0.0.2.0.0.0.0.0` | `tr` | — | *(none)* | 367 | 191.8 | 1108 | 60.5 | **yes** |
| 185 | `…0.0.0.0.0.0` | `th` | — | *(no class)* | 367 | 191.8 | 239.281 | 60.5 | **yes** — "Session ID" |
| 218 | `…0.0.0.0.0.0.0` | `div` | — | `icon fa fa-sort-alpha-asc` | 449.9 | 214.8 | 13 | 14 | **yes** |
| 186 | `…0.0.0.0.0.1` | `th` | — | `text-center` | 606.3 | 191.8 | 205.406 | 60.5 | **yes** — "Name" |
| 219 | `…0.0.0.0.0.1.0` | `div` | — | `icon fa fa-sort-alpha-asc` | 724 | 214.8 | 13 | 14 | **yes** |
| 187 | `…0.0.0.0.0.2` | `th` | — | `text-center` | 811.7 | 191.8 | 125.305 | 60.5 | **yes** — "State" |
| 188 | `…0.0.0.0.0.3` | `th` | — | `text-center` | 937 | 191.8 | 128.102 | 60.5 | **yes** — "Users" |
| 189 | `…0.0.0.0.0.4` | `th` | — | `text-center` | 1065.1 | 191.8 | 409.906 | 60.5 | **yes** — "Actions" |
| 132 | `r.0.1.1.0.0.0.0.2.0.0.0.1` | `tbody` | — | *(none)* | 367 | 252.3 | 1108 | 46.5 | **yes** |
| 160 | `…0.0.0.1.0` | `tr` | — | `ng-scope` | 367 | 252.3 | 1108 | 46.5 | **yes** — the one real row |
| 190 | `…0.0.0.1.0.0` | `td` | — | *(no class)* | 367 | 252.3 | 239.281 | 46.5 | **yes** |
| 220 | `…0.0.0.1.0.0.0` | `strong` | — | `ng-binding` | 375 | 262.3 | 31.1 | 16.5 | **yes** — `3625` |
| 221 | `…0.0.0.1.0.0.1` | `span` | — | `ng-hide` | 0 | 0 | 0 | 0 | no |
| 222 | `…0.0.0.1.0.0.2` | `div` | — | `ng-hide` | 0 | 0 | 0 | 0 | **no** — hides the `_id`/`ownerID` line |
| 230 | `…0.0.0.1.0.0.2.0` | `br` | — | *(none)* | 0 | 0 | 0 | 0 | no |
| 231 | `…0.0.0.1.0.0.2.1` | `muted` | — | `ng-binding` | 0 | 0 | 0 | 0 | no — **non-standard `<muted>` tag** |
| 191 | `…0.0.0.1.0.1` | `td` | — | `ng-binding` | 606.3 | 252.3 | 205.406 | 46.5 | **yes** — `Room 3625` |
| 192 | `…0.0.0.1.0.2` | `td` | — | `text-center` | 811.7 | 252.3 | 125.305 | 46.5 | **yes** |
| 223 | `…0.0.0.1.0.2.0` | `div` | — | `label label-orange ng-binding` | 855.5 | 263.7 | 37.7 | 17.7 | **yes** — `open` |
| 224 | `…0.0.0.1.0.2.1` | `div` | — | `label label-warning ng-hide` | 0 | 0 | 0 | 0 | no — `archived` |
| 193 | `…0.0.0.1.0.3` | `td` | — | `text-center` | 937 | 252.3 | 128.102 | 46.5 | **yes** |
| 225 | `…0.0.0.1.0.3.0` | `div` | — | `text-muted ng-binding` | 945.5 | 260.8 | 111.102 | 20 | **yes** — `1 / 2` |
| 194 | `…0.0.0.1.0.4` | `td` | — | `""` (empty class attribute) | 1065.1 | 252.3 | 409.906 | 46.5 | **yes** |
| 226 | `…0.0.0.1.0.4.0` | `a` | — | `btn btn-sm btn-info` | 1073.6 | 260.8 | 76.914 | 30 | **yes** — **Launch (captured JWT now redacted)** |
| 232 | `…0.0.0.1.0.4.0.0` | `i` | — | `icon fa fa-external-link` | 1084.6 | 269.8 | 12 | 12 | **yes** |
| 227 | `…0.0.0.1.0.4.1` | `a` | — | `btn btn-sm btn-inverse` | 1154.4 | 260.8 | 81.547 | 30 | **yes** — Manage |
| 233 | `…0.0.0.1.0.4.1.0` | `i` | — | `icon fa fa-cogs` | 1165.4 | 269.8 | 12.859 | 12 | **yes** |
| 228 | `…0.0.0.1.0.4.2` | `a` | — | `btn btn-sm btn-default ng-hide` | 0 | 0 | 0 | 0 | no — Marketplace |
| 234 | `…0.0.0.1.0.4.2.0` | `i` | — | `icon fa fa-credit-card` | 0 | 0 | 0 | 0 | no |
| 81 | `r.0.1.1.0.0.0.0.2.1` | `div` | — | `col-md-2 ng-hide` | 0 | 0 | 0 | 0 | no |
| 93 | `r.0.1.1.0.0.0.0.2.1.0` | `a` | — | `btn btn btn-warning mb btn-block` | 0 | 0 | 0 | 0 | no — "New Room" |

Column geometry of the sessions table (left edge → width, sums to 1108):
`Session ID 367 → 239.281` · `Name 606.281 → 205.406` · `State 811.688 → 125.305` · `Users 936.992 → 128.102` · `Actions 1065.094 → 409.906`.

---

## 4. Every attribute, verbatim

### `#63` `<h4 class="ng-binding">`
```
class = "ng-binding"
text  = "Total : 1"
```

### `#77` `<span>` — the clickable "Sessions" heading
```
ng-click = "showNewRoom=showNewRoom+1;"
text     = "Sessions"
```
(That is the *entire* attribute set — no class, no id, no cursor styling.)

### `#64` `<div class="row">` / `#65` `<div class="row">`
```
class = "row"
::before / ::after : content "\" \"" (U+0022 U+0020 U+0022); color rgb(51,51,51); font "Helvetica Neue", Helvetica, Arial, sans-serif; font-size 14px; background-color rgba(0,0,0,0)
```

### `#78` `<div class="col-md-4 panel pane-default">`
```
class = "col-md-4 panel pane-default"
```
⚠️ `pane-default` (not `panel-default`) — recorded verbatim; it is not a Bootstrap class and contributes nothing, which is why the panel's border resolves to `rgba(0,0,0,0)` instead of `rgb(221,221,221)`.

### `#89` `<input>` — **the search box**
```
type        = "text"
ng-model    = "sessSearch"
placeholder = "search"
class       = "form-control ng-pristine ng-untouched ng-valid"
```
No `id`, no `name`, **no associated `<label>`** (the page has zero `label[for]`). `placeholder` is lower-case `search`.

### `#79` `<button class="btn btn-sm btn-default">`
```
class    = "btn btn-sm btn-default"
ng-click = "toggleArchivedRooms()"
text     = "Archived"
```

### `#90` `<span>` / `#91` `<span class="ng-hide">`
```
#90  ng-show = "!showArchivedRooms"     text = "Show"
#91  ng-show = "showArchivedRooms"      class = "ng-hide"     text = "Hide"
```

### `#80` `<div class="col-md-12 panel pane-default">`
```
class = "col-md-12 panel pane-default"
```

### `#81` `<div class="col-md-2 ng-hide">` and `#93` `<a>` — the hidden "New Room" affordance
```
#81  class   = "col-md-2 ng-hide"
     ng-show = "showNewRoom>=5"
#93  type     = "button"
     ng-click = "createNew()"
     class    = "btn btn btn-warning mb btn-block"      ← note the doubled "btn btn"
     text     = "New Room"
```
> This is an easter-egg: `#77`'s `ng-click="showNewRoom=showNewRoom+1;"` increments a counter that `r.0.1.1` initialises with `ng-init="showNewRoom=0;"`; after **5 clicks on the word "Sessions"** the New Room button appears.

### `#92` `<div class="table-responsive">`
```
class = "table-responsive"
```

### `#111` `<table>`
```
class = "table table-striped table-bordered table-hover"
```

### `#131` `<thead>`, `#159` `<tr>`, `#132` `<tbody>`
```
attrs: (none)   ×3
```

### Header cells `#185`–`#189`
```
#185  ng-click = "sortByUUID()"                       text = "Session ID"
#186  class = "text-center" · ng-click = "sortByName()"   text = "Name"
#187  class = "text-center"                            text = "State"
#188  class = "text-center"                            text = "Users"
#189  class = "text-center"                            text = "Actions"
```
Only the first two headers are sortable. `#187`/`#188`/`#189` have **no** `ng-click`.

### Sort icons `#218`, `#219`
```
class = "icon fa fa-sort-alpha-asc"
::before { content: "" (U+F15D); color: rgb(51, 51, 51); font-family: FontAwesome; font-size: 14px; background-color: rgba(0, 0, 0, 0) }
```

### `#160` `<tr class="ng-scope">` — the repeater row
```
ng-hide   = "s.isArchivedRoom && !showArchivedRooms"
ng-repeat = "s in login.sessions | filter: sessSearch"
class     = "ng-scope"
```
**This is the only `ng-repeat` on the page and it emitted exactly one row → `login.sessions.length === 1`, consistent with the `Total … : 1` heading.**

### Row cells
```
#190  attrs: (none)
#191  class = "ng-binding"        text = "Room 3625"
#192  class = "text-center"
#193  class = "text-center"
#194  class = ""                  ← empty class attribute, present in the DOM
```

### `#220` `<strong class="ng-binding">`
```
class = "ng-binding"
text  = "3625"
```

### `#221` `<span class="ng-hide">` / `#222` `<div class="ng-hide">` / `#230` `<br>` / `#231` `<muted class="ng-binding">`
```
#221  ng-show = "s.isClonedRoom"   class = "ng-hide"     (no text)
#222  ng-show = "showNewRoom"      class = "ng-hide"     text = ")"
#230  attrs: (none)                                       ← <br>
#231  class = "ng-binding"
      text  = "( 6a628a99731b9f77ae9bf505 - ownerID: 6a628a98731b9f77ae9bf504"
```
> ⚠️ **`<muted>` is not a valid HTML element.** It is an unknown tag that the browser treats as an inline `HTMLUnknownElement`; it inherits everything (`display:inline`, `color:rgb(51,51,51)`, 14px/20px). The reference almost certainly meant Bootstrap 2's `.muted` class. **Do not port `<muted>` — use `<span class="text-muted">`** (and note that would change the colour to `rgb(119,119,119)`, a deliberate deviation).
>
> ⚠️ **The `_id` / `ownerID` text does NOT render in this capture.** It lives inside `#222`, which is `display:none` because `showNewRoom` is `0` (set by `ng-init="showNewRoom=0;"` on `r.0.1.1`). The values are real and in the DOM — `_id = 6a628a99731b9f77ae9bf505`, `ownerID = 6a628a98731b9f77ae9bf504` — but the visible Session-ID cell shows **only the bold `3625`**. The closing `)` is `#222`'s own text node, so the full hidden string would read `( 6a628a99731b9f77ae9bf505 - ownerID: 6a628a98731b9f77ae9bf504 )`.

### `#223` / `#224` — the State labels
```
#223  ng-hide = "s.isArchivedRoom"    class = "label label-orange ng-binding"     text = "open"
#224  ng-show = "s.isArchivedRoom"    class = "label label-warning ng-hide"       text = "archived"
```

### `#225` — the Users cell
```
class = "text-muted ng-binding"
text  = "1 / 2"        ← spaces around the slash, verbatim
```

### `#226` `<a class="btn btn-sm btn-info">` — **Launch (CARRIES A LIVE CREDENTIAL)**
```
ng-href = "/session?id=3625&jwtSite=[REDACTED_CAPTURE_JWT]"
target  = "_blank"
class   = "btn btn-sm btn-info"
href    = "/session?id=3625&jwtSite=…identical value…"
text    = "Launch"
```

#### 🔒 SECURITY EVIDENCE — the Launch link is a bearer credential

Both `ng-href` and `href` are **exactly 300 characters**, which is the dumper's attribute-value cap → **the token is truncated in the evidence.** Decoding the two complete segments that are present:

| segment | decoded |
|---|---|
| header | `{"alg":"HS256","typ":"JWT"}` |
| payload | `{"name":"[OWNER_JWT_NAME]","email":"[OWNER_EMAIL]","id":"[OWNER_USER_ID]","type":"site","issued":1784840082215,"iat":1784840082,"exp":1815944082}` |
| `iat` | 1784840082 → **2026-07-23 20:54:42 UTC** |
| `exp` | 1815944082 → **2027-07-18 20:54:42 UTC** (≈ **360-day lifetime**) |
| signature | `AqpORjtpJqPb-q` — only **14** of the expected 43 base64url chars survive the 300-char truncation |

**Flags, in order of severity:**
1. **This is a real, non-expired, user-identifying bearer token** carrying the account holder's full name, e-mail and user id, embedded in a plain `href` that is `target="_blank"` (so it leaks via `Referer` unless `rel="noopener noreferrer"` is set — the reference sets **neither**).
2. **It must NEVER be hard-coded** in the SvelteKit rebuild, committed to git, pasted into a fixture, or used to fill a screenshot. The rebuild must mint this token server-side per request (`+page.server.ts` / an Axum handler), and the row must render an honest-pending state if no token is available.
3. Because the signature is truncated at 14 chars, **the token in this dump cannot be replayed** — that is luck, not design. Treat the full value on the live page as compromised-if-shared.
4. A 360-day `exp` on a site-scoped session token is itself a finding worth raising.

### `#227` `<a class="btn btn-sm btn-inverse">` — Manage
```
href  = "#/page/manageSession/6a628a99731b9f77ae9bf505"
class = "btn btn-sm btn-inverse"
text  = "Manage"
```
(The session `_id` `6a628a99731b9f77ae9bf505` is the same one that appears in the hidden `<muted>` text — cross-verified.)

### `#228` `<a class="btn btn-sm btn-default ng-hide">` — Marketplace (hidden)
```
ng-hide  = "disableMarketplace"
ng-click = "manageMarketplaceSession(s._id, s)"
class    = "btn btn-sm btn-default ng-hide"
text     = "Marketplace"
```

### Action icons
```
#232  class = "icon fa fa-external-link"   ::before content "" (U+F08E), colour rgb(255,255,255), FontAwesome 12px
#233  class = "icon fa fa-cogs"            ::before content "" (U+F085), colour rgb(255,255,255), FontAwesome 12px
#234  class = "icon fa fa-credit-card"     ::before content "" (U+F09D), colour rgb(51,51,51),   FontAwesome 12px
```

---

## 5. Resolved computed style — every rendering node

### `#63` `h4.ng-binding` — "Total Sessions : 1"
| prop | value |
|---|---|
| display / visibility | `block` / `visible` |
| position / float | `static` / `none` |
| width / height | `1110px` / `19.7969px` |
| margin T/R/B/L | `10px / 0px / 10px / 0px` |
| padding T/R/B/L | `0px`×4 |
| border-width / style / colour | `0px`×4 / `none`×4 / `rgb(51,51,51)`×4 |
| radius | `0px`×4 |
| background-color | `rgba(0, 0, 0, 0)` |
| color | `rgb(51, 51, 51)` |
| font-family | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| **font-size / weight** | **`18px` / `500`** |
| **line-height** | **`19.8px`** |
| letter-spacing / text-align / vertical-align | `normal` / `start` / `baseline` |
| white-space / overflow | `normal` / `visible` |
| opacity / box-shadow / cursor | `1` / `none` / `auto` |

### `#77` `span[ng-click]` "Sessions"
`display:inline` · `visible` · `static` · width/height `auto` (**rendered box 75 × 21.5 at x=410.7 y=104**) · margin `0`×4 · padding `0`×4 · border `0px`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · font Helvetica **`18px`/`500`** / line-height **`19.8px`** · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · **`cursor: auto`**.

> ⚠️ **Usability finding, from hard evidence:** `#77` has `ng-click` but resolves to `cursor: auto`, not `pointer` — the "Sessions" word is clickable with no visual affordance. It also has **no** `role`, `tabindex` or `href`, so it is keyboard-inaccessible.

**Where the words sit.** `#63` `h4` content box starts at **x = 366** (padding 0). Its child span `#77` starts at **x = 410.7**, i.e. **44.7px** of the h4's own text renders before the span. At `18px` / weight 500 Helvetica Neue, the advance width of the string `"Total "` is ≈ 45.0px — an exact match — and the span's own 75px matches the advance width of `"Sessions"` (≈ 73px). The h4's own text nodes concatenate to `"Total : 1"`, so the source is `Total <span ng-click="…">Sessions</span>: 1` (or `… </span> : 1`), and **the rendered line reads `Total Sessions : 1`**, spanning x=366 → ≈561 on the line at y≈105.
*Honest caveat:* the dumper reports an element's own text nodes concatenated and whitespace-normalised, so it cannot distinguish `"Total "`+`": 1"` from `"Total "`+`" : 1"`. The exact whitespace immediately around the colon is an honest gap; everything else (the word order and the span's position) is measured.

### `#64` `div.row` (search row) and `#65` `div.row` (table row)
`display:block` · `visible` · `static` · `float:none` · width `1140px`; height **`56px`** (`#64`) / **`129px`** (`#65`) · **margin `0 / -15px / 0 / -15px`** · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`. Clearfix `::before`/`::after` `content:" "`.

### `#78` `div.col-md-4.panel.pane-default` and `#80` `div.col-md-12.panel.pane-default`
| prop | `#78` | `#80` |
|---|---|---|
| display / visibility | `block` / `visible` | `block` / `visible` |
| position | `relative`, inset `0/0/0/0` | `relative`, inset `0/0/0/0` |
| float | **`left`** | **`left`** |
| width / height / min-height | `380px` / `36px` / `1px` | `1140px` / `109px` / `1px` |
| margin T/R/B/L | `0 / 0 / **20px** / 0` | `0 / 0 / **20px** / 0` |
| padding T/R/B/L | `0 / **15px** / 0 / **15px**` | `0 / **15px** / 0 / **15px**` |
| border-width / style | `1px`×4 / `solid`×4 | `1px`×4 / `solid`×4 |
| border-colour | **`rgba(0, 0, 0, 0)`**×4 | **`rgba(0, 0, 0, 0)`**×4 |
| radius | `4px`×4 | `4px`×4 |
| background-color | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` |
| color | `rgb(51,51,51)` | `rgb(51,51,51)` |
| font / line-height | Helvetica `14px` `400` / `20px` | same |
| text-align / vertical-align | `start` / `baseline` | `start` / `baseline` |
| white-space / overflow / opacity | `normal` / `visible` / `1` | same |
| **box-shadow** | **`rgba(0, 0, 0, 0.05) 0px 1px 1px 0px`** | **same** |
| cursor | `auto` | `auto` |

(`.col-md-4` at a 1140px row = 380px; `.col-md-12` = 1140px. Confirmed by the rects.)

### `#89` `input.form-control` — **the search box**
| prop | value |
|---|---|
| display / visibility | `block` / `visible` |
| position / float | `static` / `none` |
| **width / height** | **`348px` / `34px`** |
| margin T/R/B/L | `0px`×4 |
| **padding T/R/B/L** | **`6px / 18px / 6px / 18px`** |
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
| box-shadow | `rgb(0, 0, 0) 0px 0px 0px 0px` |
| **cursor** | **`text`** |
| outline-color | `rgb(85, 85, 85)` |
| **transition** | **`border-color 0.15s, box-shadow 0.15s`** |

Position: `x=367` (= 351 col left + 15 col padding + 1 panel border), `y=135.8` (= 134.8 + 1 panel border). Right edge `715`.

### `#79` `button.btn.btn-sm.btn-default` — Archived
`display:inline-block` · `visible` · `static` · `float:none` · **`width:102.68px` `height:30px`** · margin `0`×4 · **padding `5px / 10px / 5px / 10px`** (top/bottom come from `.btn-sm`, resolved from COMMON `5px`) · border-width `1px`×4 / style `solid`×4 / **colour `rgb(230, 233, 238)`**×4 · **radius `3px`**×4 · **bg `rgb(255, 255, 255)`** · color `rgb(51,51,51)` · Helvetica **`12px`** / `400` / **line-height `18px`** · letter-spacing `normal` · **text-align `center`** · **vertical-align `middle`** · **white-space `nowrap`** · overflow `visible` · opacity `1` · box-shadow `none` · **cursor `pointer`** · **user-select `none`**.

### `#90` `span[ng-show="!showArchivedRooms"]` "Show"
`display:inline` · `visible` · width/height `auto` (box 30.4 × 14) · margin `0`×4 · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg transparent · color `rgb(51,51,51)` · Helvetica `12px`/`400`/`18px` · **white-space `nowrap`** · text-align `center` (inherited from the button) · vertical-align `baseline` · **cursor `pointer`** (inherited) · **user-select `none`** · opacity `1` · box-shadow `none`.

### `#92` `div.table-responsive`
`display:block` · `visible` · `static` · **`width:1108px` `height:107px`, `max-width:100%`, `min-height:0.01%`** · margin `0`×4 · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg transparent · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `baseline` · **overflow-x/-y `auto`/`auto`** · opacity `1` · box-shadow `none` · cursor `auto`.

### `#111` `table.table.table-striped.table-bordered.table-hover`
`display:table` · `visible` · `static` · **`width:1108px` `height:107px`, `max-width:100%`** · margin `0`×4 · padding `0`×4 · border-width `0`×4 / style `none`×4 / colour `rgb(51,51,51)`×4 · **radius `3px`×4 (all corners)** · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · text-align `start` · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.
*(The visible 1px grid comes from the per-cell borders below, not from the `<table>`.)*

### `#131` `thead` / `#132` `tbody`
`display: table-header-group` / `table-row-group` · `visible` · width `1108px` · height `60.5px` / `46.5px` · margin `0`×4 · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg transparent · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · **vertical-align `middle`** · cursor `auto`.

### `#159` `tr` (header row)
`display:table-row` · `visible` · width `1108px` height `60.5px` · margin/padding `0`×4 · border-width `0`×4 / style `none`×4 / colour `rgb(51,51,51)`×4 · **radius: `3px` top-left, `3px` top-right, `0` bottom-left, `0` bottom-right** · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `middle` · cursor `auto`.

### `#160` `tr.ng-scope` (the data row)
`display:table-row` · `visible` · width `1108px` height `46.5px` · margin/padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · **radius: `0` top, `3px` bottom-left, `3px` bottom-right** · **background-color `rgb(249, 249, 249)`** ← `.table-striped` odd-row stripe · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · text-align `start` · vertical-align `middle` · cursor `auto`.

### Header cells `#185`–`#189`
Common to all five: `display:table-cell` · `visible` · height `60.5px` · margin `0`×4 · **padding `20px / 8px / 20px / 8px`** · bg `rgba(0,0,0,0)` · color `rgb(51,51,51)` · Helvetica `14px` / **`700`** / `20px` · letter-spacing `normal` · **vertical-align `bottom`** · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.

| # | width | border-left | border-right | radius | text-align |
|---|---|---|---|---|---|
| 185 "Session ID" | `239.281px` | `0px none` | **`1px solid rgb(221,221,221)`** | **`3px` top-left**, rest 0 | **`left`** |
| 186 "Name" | `205.406px` | **`1px solid rgb(221,221,221)`** | **`1px solid rgb(221,221,221)`** | `0`×4 | **`center`** |
| 187 "State" | `125.305px` | **`1px solid rgb(221,221,221)`** | **`1px solid rgb(221,221,221)`** | `0`×4 | **`center`** |
| 188 "Users" | `128.102px` | **`1px solid rgb(221,221,221)`** | **`1px solid rgb(221,221,221)`** | `0`×4 | **`center`** |
| 189 "Actions" | `409.906px` | **`1px solid rgb(221,221,221)`** | `0px none` | **`3px` top-right**, rest 0 | **`center`** |

All five have `border-top-width: 0px` and `border-bottom-width: 0px`.

### Sort icons `#218` / `#219` `div.icon.fa.fa-sort-alpha-asc`
`display:inline-block` · `visible` · `static` · `width:13px` `height:14px` · margin `0`×4 · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg transparent · color `rgb(51,51,51)` · **font-family `FontAwesome`** `14px` `400` / **line-height `14px`** · text-align: **`left`** for `#218` (inherits th `text-align:left`), **`center`** for `#219` (inherits `.text-center`) · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto` · `transform: matrix(1, 0, 0, 1, 0, 0)` · `::before content "\F15D"`.

### Body cells `#190`–`#194`
Common: `display:table-cell` · `visible` · height `46.5px` · margin `0`×4 · **padding `8px`×4** · **border-top `1px solid rgb(221,221,221)`** · border-bottom `0px none` · bg `rgba(0,0,0,0)` (the stripe comes from the `<tr>`) · color `rgb(51,51,51)` · Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · **vertical-align `top`** · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto`.

| # | width | border-left | border-right | radius | text-align |
|---|---|---|---|---|---|
| 190 | `239.281px` | `0px none` | **`1px solid rgb(221,221,221)`** | **`3px` bottom-left** | **`start`** |
| 191 | `205.406px` | **`1px solid rgb(221,221,221)`** | **`1px solid rgb(221,221,221)`** | `0`×4 | **`start`** |
| 192 | `125.305px` | **`1px solid rgb(221,221,221)`** | **`1px solid rgb(221,221,221)`** | `0`×4 | **`center`** |
| 193 | `128.102px` | **`1px solid rgb(221,221,221)`** | **`1px solid rgb(221,221,221)`** | `0`×4 | **`center`** |
| 194 | `409.906px` | **`1px solid rgb(221,221,221)`** | `0px none` | **`3px` bottom-right** | **`start`** |

### `#220` `strong.ng-binding` "3625"
`display:inline` · `visible` · width/height `auto` (box 31.1 × 16.5 at 375, 262.3) · margin `0`×4 · padding `0`×4 · border `0`/`none`/`rgb(51,51,51)`×4 · radius `0`×4 · bg transparent · color `rgb(51,51,51)` · Helvetica `14px` / **`700`** / `20px` · text-align `start` · vertical-align `baseline` · white-space `normal` · cursor `auto`.

### `#223` `div.label.label-orange.ng-binding` "open"
| prop | value |
|---|---|
| display / visibility | **`inline`** / `visible` |
| width / height | `auto` / `auto` (box **37.7 × 17.7** at 855.5, 263.7) |
| margin | `0px`×4 |
| **padding T/R/B/L** | **`2.1px / 6.3px / 3.15px / 6.3px`** |
| border-width / style / colour | `0px`×4 / `none`×4 / `rgb(255, 255, 255)`×4 |
| **radius** | **`2.625px`**×4 |
| **background-color** | **`rgb(254, 86, 33)`** |
| **color** | **`rgb(255, 255, 255)`** |
| font-family / size / weight | `"Helvetica Neue", …` / **`10.5px`** / **`700`** |
| **line-height** | **`10.5px`** |
| letter-spacing / text-align / vertical-align | `normal` / `center` / `baseline` |
| **white-space** | **`nowrap`** |
| overflow / opacity / box-shadow / cursor | `visible` / `1` / `none` / `auto` |
| outline-color | `rgb(255, 255, 255)` |

(`#224` `.label.label-warning` is identical except `display:none` and `background-color: rgb(240, 173, 78)`.)

### `#225` `div.text-muted.ng-binding` "1 / 2"
`display:block` · `visible` · `static` · **`width:111.102px` `height:20px`** · margin `0`×4 · padding `0`×4 · border-width `0`×4 / style `none`×4 / **colour `rgb(119, 119, 119)`**×4 · radius `0`×4 · bg transparent · **color `rgb(119, 119, 119)`** · Helvetica `14px`/`400`/`20px` · letter-spacing `normal` · **text-align `center`** · vertical-align `baseline` · white-space `normal` · overflow `visible` · opacity `1` · box-shadow `none` · cursor `auto` · outline-color `rgb(119,119,119)`.

### `#226` `a.btn.btn-sm.btn-info` — Launch
| prop | value |
|---|---|
| display / visibility | `inline-block` / `visible` |
| width / height | **`76.9141px` / `30px`** |
| margin | `0px`×4 |
| **padding T/R/B/L** | **`5px / 10px / 5px / 10px`** |
| border-width / style | `1px`×4 / `solid`×4 |
| **border-colour** | **`rgb(70, 184, 218)`**×4 |
| **radius** | **`3px`**×4 |
| **background-color** | **`rgb(91, 192, 222)`** |
| **color** | **`rgb(255, 255, 255)`** |
| font-family / size / weight | `"Helvetica Neue", …` / **`12px`** / `400` |
| **line-height** | **`18px`** |
| letter-spacing / text-align / vertical-align | `normal` / `center` / `middle` |
| **white-space** | **`nowrap`** |
| overflow / opacity / box-shadow | `visible` / `1` / `none` |
| **cursor** | **`pointer`** |
| **user-select** | **`none`** |
| outline-color | `rgb(255, 255, 255)` |

### `#227` `a.btn.btn-sm.btn-inverse` — Manage
Identical to `#226` except **`width: 81.5469px`**, **`background-color: rgb(54, 63, 69)`**, **`border-colour: rgb(54, 63, 69)`**×4, and it sits at `x = 1154.4`.

### `#232` / `#233` `i.icon.fa.*`
`display:inline-block` · `visible` · width `12px` (`#232`) / `12.8594px` (`#233`) · height `12px` · margin/padding `0`×4 · border `0`/`none`/`rgb(255,255,255)`×4 · radius `0`×4 · bg transparent · **color `rgb(255, 255, 255)`** · **font-family `FontAwesome`** `12px` `400` / **line-height `12px`** · **white-space `nowrap`** · text-align `center` (inherited from `.btn`) · vertical-align `baseline` · **cursor `pointer`** (inherited) · **user-select `none`** · `transform: matrix(1,0,0,1,0,0)` · outline-color `rgb(255,255,255)` · `::before` U+F08E / U+F085.

---

## 6. Verbatim text (every string, with path)

| path | element | text (verbatim) | renders? |
|---|---|---|---|
| `r.0.1.1.0.0.0.0.0` | `h4.ng-binding` | `Total : 1` (own text nodes; see §5 for the rendered `Total Sessions : 1`) | yes |
| `r.0.1.1.0.0.0.0.0.0` | `span[ng-click]` | `Sessions` | yes |
| `r.0.1.1.0.0.0.0.1.0.0` | `input` | *(placeholder)* `search` | yes |
| `r.0.1.1.0.0.0.0.1.1` | `button` | `Archived` | yes |
| `r.0.1.1.0.0.0.0.1.1.0` | `span` | `Show` | yes |
| `r.0.1.1.0.0.0.0.1.1.1` | `span.ng-hide` | `Hide` | **no** |
| `r.0.1.1.0.0.0.0.2.1.0` | `a.btn-warning.btn-block` | `New Room` | **no** |
| `…2.0.0.0.0.0.0` | `th` | `Session ID` | yes |
| `…2.0.0.0.0.0.1` | `th.text-center` | `Name` | yes |
| `…2.0.0.0.0.0.2` | `th.text-center` | `State` | yes |
| `…2.0.0.0.0.0.3` | `th.text-center` | `Users` | yes |
| `…2.0.0.0.0.0.4` | `th.text-center` | `Actions` | yes |
| `…2.0.0.0.1.0.0.0` | `strong.ng-binding` | `3625` | yes |
| `…2.0.0.0.1.0.0.2` | `div.ng-hide` | `)` | **no** |
| `…2.0.0.0.1.0.0.2.1` | `muted.ng-binding` | `( 6a628a99731b9f77ae9bf505 - ownerID: 6a628a98731b9f77ae9bf504` | **no** |
| `…2.0.0.0.1.0.1` | `td.ng-binding` | `Room 3625` | yes |
| `…2.0.0.0.1.0.2.0` | `div.label.label-orange` | `open` | yes |
| `…2.0.0.0.1.0.2.1` | `div.label.label-warning.ng-hide` | `archived` | **no** |
| `…2.0.0.0.1.0.3.0` | `div.text-muted` | `1 / 2` | yes |
| `…2.0.0.0.1.0.4.0` | `a.btn-info` | `Launch` | yes |
| `…2.0.0.0.1.0.4.1` | `a.btn-inverse` | `Manage` | yes |
| `…2.0.0.0.1.0.4.2` | `a.btn-default.ng-hide` | `Marketplace` | **no** |

**Truncation:** none of these text nodes is truncated (longest = 61 chars, cap = 250). **The only truncated value in this section is the `Launch` link's `href` / `ng-href`, both cut at the 300-character cap mid-signature** (see §4).

**Honest data check:** every number here is real capture data — `Total … : 1`, `3625`, `Room 3625`, `open`, `1 / 2`, `_id 6a628a99731b9f77ae9bf505`, `ownerID 6a628a98731b9f77ae9bf504`, JWT subject id `[OWNER_USER_ID]`. Nothing is invented.

---

## 7. Rebuild spec (pixel-for-pixel)

```html
<!-- r.0.1.1.0.0.0.0.0 -->
<h4>Total <span on:click={() => showNewRoom++}>Sessions</span>: {sessions.length}</h4>

<!-- r.0.1.1.0.0.0.0.1 -->
<div class="row">
  <div class="col-md-4 panel pane-default">
    <input type="text" class="form-control" placeholder="search" bind:value={sessSearch}>
  </div>
  <button class="btn btn-sm btn-default" on:click={toggleArchivedRooms}>Archived
    <span hidden={showArchivedRooms}>Show</span><span hidden={!showArchivedRooms}>Hide</span>
  </button>
</div>

<!-- r.0.1.1.0.0.0.0.2 -->
<div class="row">
  <div class="col-md-12 panel pane-default">
    <div class="table-responsive">
      <table class="table table-striped table-bordered table-hover">
        <thead>
          <tr>
            <th on:click={sortByUUID}>Session ID<div class="icon fa fa-sort-alpha-asc"></div></th>
            <th class="text-center" on:click={sortByName}>Name<div class="icon fa fa-sort-alpha-asc"></div></th>
            <th class="text-center">State</th>
            <th class="text-center">Users</th>
            <th class="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as s}
          <tr hidden={s.isArchivedRoom && !showArchivedRooms}>
            <td>
              <strong>{s.uuid}</strong>
              <span hidden={!s.isClonedRoom}></span>
              <div hidden={!showNewRoom}><br><span class="text-muted">( {s._id} - ownerID: {s.ownerID}</span>)</div>
            </td>
            <td>{s.name}</td>
            <td class="text-center">
              <div class="label label-orange"   hidden={s.isArchivedRoom}>open</div>
              <div class="label label-warning"  hidden={!s.isArchivedRoom}>archived</div>
            </td>
            <td class="text-center"><div class="text-muted">{s.users} / {s.maxUsers}</div></td>
            <td class="">
              <!-- ⚠️ jwtSite MUST be minted server-side per request. NEVER hard-code. -->
              <a class="btn btn-sm btn-info" target="_blank" rel="noopener noreferrer"
                 href={launchUrl(s)}><i class="icon fa fa-external-link"></i> Launch</a>
              <a class="btn btn-sm btn-inverse"
                 href={`#/page/manageSession/${s._id}`}><i class="icon fa fa-cogs"></i> Manage</a>
              <a class="btn btn-sm btn-default" hidden={disableMarketplace}
                 on:click={() => manageMarketplaceSession(s._id, s)}><i class="icon fa fa-credit-card"></i> Marketplace</a>
            </td>
          </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
  <div class="col-md-2" hidden={showNewRoom < 5}>
    <a class="btn btn-warning mb btn-block" on:click={createNew}>New Room</a>
  </div>
</div>
```

```css
h4                { display:block; width:1110px; height:19.7969px; margin:10px 0; padding:0;
                    color:#333; font:500 18px/19.8px "Helvetica Neue",Helvetica,Arial,sans-serif;
                    text-align:start; }
h4 > span         { display:inline; cursor:auto; }   /* reference has NO pointer cursor */

.row              { display:block; width:1140px; margin:0 -15px; padding:0; }
.row::before, .row::after { content:" "; display:table; } .row::after { clear:both; }

.col-md-4         { position:relative; float:left; width:380px;  min-height:1px; padding:0 15px; }
.col-md-12        { position:relative; float:left; width:1140px; min-height:1px; padding:0 15px; }
.panel.pane-default { margin:0 0 20px; border:1px solid rgba(0,0,0,0); border-radius:4px;
                    background:#fff; box-shadow:rgba(0,0,0,.05) 0 1px 1px 0; }

.form-control     { display:block; width:348px; height:34px; margin:0; padding:6px 18px;
                    border:1px solid rgb(219,217,217); border-radius:4px;
                    background:#fff; color:#555; outline-color:#555;
                    font:400 14px/20px "Helvetica Neue",Helvetica,Arial,sans-serif;
                    text-align:start; overflow:clip; box-shadow:rgb(0,0,0) 0 0 0 0;
                    cursor:text; transition:border-color .15s, box-shadow .15s; }

.btn              { display:inline-block; margin:0; padding:6px 12px; border:1px solid transparent;
                    border-radius:4px; font:400 14px/20px "Helvetica Neue",Helvetica,Arial,sans-serif;
                    text-align:center; vertical-align:middle; white-space:nowrap;
                    cursor:pointer; user-select:none; }
.btn-sm           { padding:5px 10px; border-radius:3px; font-size:12px; line-height:18px; }
.btn-default      { background:#fff; border-color:rgb(230,233,238); color:#333; }
.btn-info         { background:rgb(91,192,222);  border-color:rgb(70,184,218); color:#fff; }
.btn-inverse      { background:rgb(54,63,69);    border-color:rgb(54,63,69);   color:#fff; }
.btn-warning      { background:rgb(240,173,78);  border-color:rgb(238,162,54);  color:#fff; }
.btn-block        { display:block; width:100%; }
.mb               { margin-bottom:10px; }

.table-responsive { display:block; width:1108px; max-width:100%; min-height:.01%;
                    overflow-x:auto; overflow-y:auto; }
table.table       { display:table; width:1108px; max-width:100%; margin:0; padding:0;
                    border-radius:3px; border-collapse:separate; border-spacing:0; }

table.table > thead > tr > th {
                    display:table-cell; padding:20px 8px; height:60.5px;
                    border-top:0; border-bottom:0;
                    border-right:1px solid rgb(221,221,221);
                    border-left :1px solid rgb(221,221,221);
                    font-weight:700; font-size:14px; line-height:20px;
                    vertical-align:bottom; text-align:left; }
table.table > thead > tr > th.text-center { text-align:center; }
table.table > thead > tr > th:first-child { border-left:0;  border-top-left-radius:3px; }
table.table > thead > tr > th:last-child  { border-right:0; border-top-right-radius:3px; }

table.table > tbody > tr           { background:transparent; }
table.table.table-striped > tbody > tr:nth-of-type(odd) { background:rgb(249,249,249); }
table.table > tbody > tr > td {
                    display:table-cell; padding:8px; height:46.5px;
                    border-top:1px solid rgb(221,221,221); border-bottom:0;
                    border-right:1px solid rgb(221,221,221);
                    border-left :1px solid rgb(221,221,221);
                    vertical-align:top; text-align:start; font-size:14px; line-height:20px; }
table.table > tbody > tr > td.text-center { text-align:center; }
table.table > tbody > tr > td:first-child { border-left:0;  border-bottom-left-radius:3px; }
table.table > tbody > tr > td:last-child  { border-right:0; border-bottom-right-radius:3px; }

/* fixed column widths measured from the capture (sum = 1108) */
table.table col:nth-child(1){width:239.281px} table.table col:nth-child(2){width:205.406px}
table.table col:nth-child(3){width:125.305px} table.table col:nth-child(4){width:128.102px}
table.table col:nth-child(5){width:409.906px}

.label            { display:inline; margin:0; padding:2.1px 6.3px 3.15px; border-radius:2.625px;
                    color:#fff; outline-color:#fff; border-color:#fff;
                    font:700 10.5px/10.5px "Helvetica Neue",Helvetica,Arial,sans-serif;
                    text-align:center; vertical-align:baseline; white-space:nowrap; }
.label-orange     { background:rgb(254,86,33);  }
.label-warning    { background:rgb(240,173,78); }

.text-muted       { color:rgb(119,119,119); border-color:rgb(119,119,119); outline-color:rgb(119,119,119); }
td.text-center > .text-muted { display:block; width:111.102px; height:20px; text-align:center; }

.icon.fa          { display:inline-block; font-family:FontAwesome; font-weight:400;
                    vertical-align:baseline; transform:matrix(1,0,0,1,0,0); }
th .icon.fa       { width:13px; height:14px; font-size:14px; line-height:14px; color:#333; }
.btn .icon.fa     { height:12px; font-size:12px; line-height:12px; color:#fff;
                    white-space:nowrap; user-select:none; }
.fa-sort-alpha-asc::before { content:"\f15d"; }
.fa-external-link::before  { content:"\f08e"; }
.fa-cogs::before           { content:"\f085"; }
.fa-credit-card::before    { content:"\f09d"; }
```

Measured checkpoints the rebuild must hit:
`h4` `366,105 1110×19.8` · span "Sessions" `410.7,104 75×21.5` · search input `367,135.8 348×34` · Archived button `731,134.8 102.68×30` · table `367,191.8 1108×107` · thead `60.5` tall, tbody `46.5` tall · `3625` bold at `375,262.3` · `open` pill `855.5,263.7 37.7×17.7` · `1 / 2` at `945.5,260.8 111.1×20` · Launch `1073.6,260.8 76.9×30` · Manage `1154.4,260.8 81.5×30`.

---

## 8. Honest gaps

1. **🔒 The JWT is truncated in the evidence** (300-char attribute cap; only 14 of ~43 signature characters). Its header and payload are complete and decoded above; the signature is not. **This is a credential and must be minted server-side — never hard-coded, never committed, never used to populate a screenshot.** The reference also omits `rel="noopener noreferrer"` on a `target="_blank"` link, which leaks the tokenised URL via `Referer`.
2. **Only ONE session exists in this account**, so `.table-striped`'s even-row colour, the hover state, the multi-row layout, the sort behaviour of `sortByUUID()`/`sortByName()`, and the `archived` state pill are all **unverified** — one sample only. Do not extrapolate.
3. **The `showNewRoom >= 5` branch is never rendered**, so the "New Room" button's laid-out box and the `.col-md-2` sibling's effect on the row width are unverified.
4. **The exact whitespace around the colon in the `h4`** cannot be recovered (the dumper normalises an element's own text nodes). See §5.
5. **`s.isClonedRoom` markup (`#221`) has no text in the capture** — what it renders when true is unknown.
6. **No hover/focus/active/`:disabled` styling** was captured for the search input, the Archived button, the sort headers or the three action buttons.
7. **`<muted>` is an invalid element** in the reference. Reproducing it literally is possible but the rebuild above substitutes `<span class="text-muted">`, which changes the colour from `rgb(51,51,51)` to `rgb(119,119,119)` — an intentional, flagged deviation. Since the element is `display:none` in this capture, no pixel diff results.
8. **`border-collapse`/`border-spacing` are not in the dump.** They are asserted as `separate`/`0` in the rebuild because the captured per-cell borders are single 1px lines with `3px` corner radii on the corner cells, which only renders that way with `border-collapse: separate`. Verify against a rebuilt screenshot.
