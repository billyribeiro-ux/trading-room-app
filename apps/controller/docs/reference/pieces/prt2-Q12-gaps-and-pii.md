# prt2 — Q12 · Honest gap register and sensitive-data register

**Purpose.** Two registers for the SECOND reference capture: **(a)** every place where the dump is
incomplete, truncated, or silent — what is missing, why, and what would close it; and **(b)** every
credential, token, identifier and piece of PII the dump contains, where it is, what it exposes, and
the standing instruction about it. Plus a direct investigation of the `meta.role` contradiction.

**Evidence root.** `/tmp/ptr-decode/prt2/`
**Captures.** `caps/00-baseline-room` (882 records, `truncated=false`) + 3 diff captures.
**Sheets.** `01-stylesheets/00.css` … `14.css`.

---

# (a) HONEST GAP REGISTER

Sixteen gaps. Each is *what is missing · why · what would close it*. Prior-report claims are
re-verified; four are corrected.

---

### a.1 — `<body ng-class>` is truncated mid-expression ✔ CONFIRMED

**What is missing.** `nodes-000.txt:5`, record `#0 path=r <body>`:

```
attr ng-class = "{\n      'layout-fixed': app.layout.isFixed,\n      'layout-boxed': app.layout.isBoxed,\n      'layout-dock': app.layout.isDocked,\n      'layout-material': app.layout.isMaterial,\n      'aside-offscreen': app.sidebar.isOffscreen,\n      'footer-hidden': app.footer.hidden,\n      'in-app': !$state.includes"
```

It stops at `!$state.includes` — the argument to `.includes(…)` and any further class bindings are
lost. Six layout classes are visible (`layout-fixed`, `layout-boxed`, `layout-dock`,
`layout-material`, `aside-offscreen`, `footer-hidden`) plus a seventh, `in-app`, whose condition is
cut.

**Why.** Attribute values are truncated at **exactly 300 raw characters**. Measured across the whole
dump: `ng-class` raw length **300**, `ng-href` **300**, `href` **300** — three independent values all
landing on 300 is a cap, not a coincidence.

**What would close it.** Re-capture with a higher attribute cap, or read
`/public/dist/app.min.js?v=1784623769671` / the `app/views/*.html` templates directly.

---

### a.2 — Three inline `<script>` / `<style>` texts truncated ✔ CONFIRMED (all three, at 250 chars)

**What is missing.** Text-node capture is truncated at **exactly 250 raw characters**. Three records
hit it:

| rec | path | element | raw len | last visible characters |
|---|---|---|---|---|
| `#3` | `r.2` | `<script>` (inline) | **250** | `__isReg = __isReg == 'true' ? true :` |
| `#12` | `r.11` | `<script type="text/javascript">` | **250** | `var is_msie = ua.indexOf('msie') > -1 \|\| ua.indexOf('trident') > -1;` |
| `#32` | `r.0.1.0` | `<style class="ng-scope">` | **250** | `font-weight: 400;\n    fo` |

No other text node in the 882 records reaches 250 characters.

**Correction to prior work:** the third truncated record is a `<style>`, not a script — the prior
report said "three inline scripts truncated". Two are `<script>`, one is `<style>`.

**Mitigation already achieved:** `#32`'s full content **is** recoverable — it is serialised in full
as `01-stylesheets/14.css` (15 rules, 4 353 source bytes), verified by matching the truncated preview
to the sheet's first two rules. So this gap is **closed for `#32`** and open only for `#3` and `#12`.

**What would close `#3` and `#12`.** Fetch `https://protradingroom.com/ptrApp` and read the shell
HTML. From the visible fragments: `#3` sets `__h264` and `__isReg` feature flags; `#12` sets
`__cver = '1784623769671'` and does UA sniffing for chrome/firefox/msie/trident.

---

### a.3 — The JWT signature is truncated ✔ CONFIRMED

**What is missing.** The `href`/`ng-href` on `#226` are capped at 300 characters (a.1), which lands
mid-signature. The captured signature segment is **`AqpORjtpJqPb-q` — 14 characters**. An HS256
signature is 43 base64url characters, so **29 characters are missing**.

**Why.** The 300-character attribute cap.

**What would close it.** Nothing should. **This gap is a feature, not a defect** — see §b.1. The
header and payload decode cleanly and completely; only the signature is cut, which means the token
as captured is **cryptographically unusable**. Do not attempt to close this gap.

---

### a.4 — Footer span has `ng-binding` but no captured expression and no text ✔ CONFIRMED

**What is missing.** `nodes-000.txt:1559-1576`, record `#56`:

```
#56 path=r.0.1.1.0.2.5 <span>
  rect: x=921 y=1105 w=0 h=0
  attr class = "ng-binding ng-scope"
  (no ng-bind attribute, no text: line)
```

Angular's `ng-binding` class is added *only* to elements that carry a binding, so a binding exists —
but the dump shows neither the expression nor a rendered value. Its two siblings do show both:
`#53` `ng-bind="app.year"` → `"2026"`, `#54` `ng-bind="app.name"` → `"ProTradingRoom"`.

**Why.** Most likely a `{{ }}` interpolation binding (which produces `ng-binding` without an
`ng-bind` attribute) that evaluated to an empty string. The rect confirms it: `w=0 h=0` at
`x=921 y=1105` — positioned, laid out, and rendering nothing. **I state that as observation; I am
not asserting the cause.**

**What would close it.** Read `app/views/page.footer.html` — the include is named at `#45`
(`ng-include="'app/views/page.footer.html'"`).

Full footer content as captured (`r.0.1.1.0.2.*`, records `#45 #51 #52 #53 #54 #55 #56`):

| rec | element | text | rect |
|---|---|---|---|
| `#45` | `div.p-lg.text-center` `ng-include="'app/views/page.footer.html'"` | — | `351,1029 1140×91` |
| `#51` | `hr.ng-scope` | — | `366,1064 1110×1` |
| `#52` | `span.mr-sm.ng-scope` | `©` | `838.3,1086.5 11.2×16.5` |
| `#53` | `span.mr-sm.ng-binding.ng-scope` `ng-bind="app.year"` | `2026` | `858.4,1086.5 31.1×16.5` |
| `#54` | `span.ng-binding.ng-scope` `ng-bind="app.name"` | `ProTradingRoom` | `898.4,1086.5 105.3×16.5` |
| `#55` | `br.ng-scope` | — | `1003.7,1086.5 0×16.5` |
| `#56` | `span.ng-binding.ng-scope` | **(none)** | `921,1105 0×0` |

Rendered footer line: `© 2026 ProTradingRoom` followed by an empty second line.

---

### a.5 — Pseudo-elements captured for only 5 properties ✔ CONFIRMED, exactly

**What is missing.** Every `::before` / `::after` record is a 5-key JSON object. Verified
programmatically over **all 41** pseudo-element lines in the dump: **41 of 41** have the key set

```
('background-color', 'color', 'content', 'font-family', 'font-size')
```

and no other. Missing: `width`, `height`, `display`, `position`, `top/right/bottom/left`, `margin`,
`padding`, `border-*`, `line-height`, `transform`, `opacity`, `z-index`, `float`, `text-align`,
`vertical-align`, `content-visibility` — i.e. everything geometric.

**Coverage.** 26 elements carry pseudo-elements: 15 with both `::before` and `::after` (the
Bootstrap `.row` / `.navbar` / `.panel-body` clearfixes, `content: " "`), 11 with `::before` only
(the FontAwesome icons).

| host records with both | `#31 #38 #39 #40 #42 #50 #64 #65 #68 #71 #74 #75 #95 #120 #122` |
|---|---|
| **host records with `::before` only** | `#58 #59 #117 #125 #127 #195 #218 #219 #232 #233 #234` |

**Impact.** Bootstrap clearfix pseudo-elements (`content: " "`) need `display: table` + `clear: both`
to function; those are **not captured**, so clearfix behaviour must be reconstructed from
`bootstrap.min.css` (`02.css`) rather than from the capture. FontAwesome glyph *sizing* (the
`::before` box) is likewise uncaptured — only its `font-size` and `color`.

**What would close it.** A capture that serialises the full computed style of pseudo-elements, or
reading `02.css` / `10.css` for the `.clearfix::after` and `.fa::before` definitions (both are
present and uncorrupted in this dump, so this gap is **closable from the evidence already on disk**).

---

### a.6 — "FontAwesome glyphs identified by class name not code point" ✘ **FALSE — gap does not exist**

The prior report lists this as a gap. It is **wrong**. The code points **are** captured, inside the
`content` value of each `::before`. I verified with `od -c`, which shows the raw UTF-8 bytes
`357 200 223` = `EF 80 93` = **U+F013**. Complete decoded inventory of all 11 FontAwesome glyphs:

| rec | path | class | `::before` code point | FontAwesome name | `color` | `font-size` |
|---|---|---|---|---|---|---|
| `#58` | `r.0.0.0.1.0.0.0` | `icon fa  fa-cog` | **U+F013** | `fa-cog` | `rgb(255,255,255)` | `14px` |
| `#59` | `r.0.0.0.1.0.1.0` | `icon fa fa-2x fa-power-off` | **U+F011** | `fa-power-off` | `rgb(255,255,255)` | `28px` |
| `#117` | `r.0.1.1.0.0.0.0.5.1.1.0` | `fa fa-cloud-upload` | **U+F0EE** | `fa-cloud-upload` | `rgb(255,255,255)` | `14px` |
| `#125` | `r.0.1.1.0.1.0.1.0.0.0.1` | `fa fa-envelope form-control-feedback text-muted` | **U+F0E0** | `fa-envelope` | `rgb(119,119,119)` | `14px` |
| `#127` | `r.0.1.1.0.1.0.1.0.0.2.1` | `fa fa-lock form-control-feedback text-muted` | **U+F023** | `fa-lock` | `rgb(119,119,119)` | `14px` |
| `#195` | `…5.0.1.0.0.7#emoji-picker.0` | `fa fa-smile-o fa-1x` | **U+F118** | `fa-smile-o` | `rgb(51,51,51)` | `12px` |
| `#218` | `…2.0.0.0.0.0.0` | `icon fa fa-sort-alpha-asc` | **U+F15D** | `fa-sort-alpha-asc` | `rgb(51,51,51)` | `14px` |
| `#219` | `…2.0.0.0.0.1.0` | `icon fa fa-sort-alpha-asc` | **U+F15D** | `fa-sort-alpha-asc` | `rgb(51,51,51)` | `14px` |
| `#232` | `…2.0.0.0.1.0.4.0.0` | `icon fa fa-external-link` | **U+F08E** | `fa-external-link` | `rgb(255,255,255)` | `12px` |
| `#233` | `…2.0.0.0.1.0.4.1.0` | `icon fa fa-cogs` | **U+F085** | `fa-cogs` | `rgb(255,255,255)` | `12px` |
| `#234` | `…2.0.0.0.1.0.4.2.0` | `icon fa fa-credit-card` | **U+F09D** | `fa-credit-card` | `rgb(51,51,51)` | `12px` |

All eleven `font-family` values are `FontAwesome`. **Class name AND code point are both available**,
and they corroborate each other. **This gap is CLOSED.** (The residual gap is a.5: the *geometry* of
those `::before` boxes.)

---

### a.7 — No screenshot in this dump ✔ CONFIRMED — pixel-perfection cannot be closed from prt2 alone

**What is missing.** `00-META.txt:11-16` lists 5 captures: four `fullDom` (`baseline-room`,
`forced-darkTheme`, `forced-lightTheme`, `final-room`) and one `meta` record. **No image, no
`kind=screenshot`, no data URI, no `bodyText` slice.** `02-MANIFEST.txt` lists only
`INFO.txt`/`DEFAULTS.txt`/`nodes-*.txt` per capture.

**Why.** The capture harness serialised DOM + computed styles only.

**Impact — stated plainly.** Rule 3 requires "a real screenshot of the built page diffed against the
reference." **That diff cannot be produced from `prt2.json`.** What *can* be verified from this dump
is: every element's rect to 0.001px, every computed style property, every text node (≤250 chars),
every class, and every colour. That is necessary but not sufficient — antialiasing, font rasterisation,
image assets (`/public/images/ptr_logo.png`, `app/img/ajax_loader.gif`), and FontAwesome/Feather
webfont rendering are all unverifiable here.

**What would close it.** A screenshot capture of `#/page/welcome` at `1842×1265 @dpr2` while logged
in as an owner, diffed against a build. Until then, **pixel-perfection for this route is an open
item, and I will not claim it is closed.**

---

### a.8 — No `<head>`, no `<title>` ✔ CONFIRMED

**What is missing.** Record `#0` is `path=r <body>`. There is **no `r.-1`, no `<head>`, no `<html>`**.
Consequently: no `<title>`, no `<meta charset>`, no `<meta name="viewport">`, no `<link rel="icon">`,
no `<link rel="stylesheet">` ordering, no `<base>`, no OG/Twitter meta.

**Why.** The serialiser rooted at `document.body`.

**Impact.** Stylesheet cascade order is known only from `00-META.txt`'s `document.styleSheets` index,
which I take at face value. Three of the four inline sheets (00, 01, 13) have **no element in the
dump** — only one `<style>` record exists (`#32`) — so they must live in the uncaptured head.

**What would close it.** Fetch `https://protradingroom.com/ptrApp` and read the served HTML head.

---

### a.9 — Two CORS-blocked stylesheets ✔ CONFIRMED

`01-stylesheets/03.css` and `07.css` contain only their header comment plus the literal
`CORS-BLOCKED`. `ruleCount=0` for both (`00-META.txt:27,31`).

| sheet | href | why blocked |
|---|---|---|
| 03 | `https://vjs.zencdn.net/7.3.0/video-js.min.css` | third-party CDN, no `Access-Control-Allow-Origin`, `cssRules` throws |
| 07 | `https://cdnjs.cloudflare.com/ajax/libs/angularjs-toaster/2.2.0/toaster.min.css` | same |

**Impact on THIS route: zero.** No `.video-js`, `.vjs-*`, `toaster` or `toast-*` element exists in
the 882 records. **Closable**: both URLs are public and pinned to exact versions — `curl` them.

---

### a.10 — Iframe `src` missing on one of the five iframes

`#158` (`r.0.1.1.0.1.0.1.0.0.3.0.1`) has **only** `style="display: none;"` — no `src`, `title`,
`name`, `sandbox` or `allow`. What it embeds is unknown. Full analysis in
`prt2-Q09-iframes-recaptcha.md §1 IFRAME 4`. **What would close it:** a network log, or a capture
that serialises empty/`about:blank` `src` attributes.

---

### a.11 — Iframe *contents* are not captured

All five iframes are cross-origin `www.google.com`. Nothing inside any of them — checkbox, puzzle,
branding — exists in the dump. **Unavoidable and permanent.** Impact on pixels: zero, because all
five have a `0×0` rect or sit at `y ≈ −10000`.

---

### a.12 — AngularJS controller/scope state is never captured

`showAddBadge`, `showAddAdminUser`, `showNewRoom`, `showArchivedRooms`, `showBadgeID`,
`badges.mode`, `failedLoginCount`, `loggingIn`, `disableMarketplace`, `adminUser`, `signup`,
`login.isLoggedIn`, `login.sessions`, `badgesList`, `adminUsers`, `apiKeys`, `sess.logoURL`,
`app.layout.*`, `app.sidebar.*`, `app.footer.hidden`, `app.views.animation` — **none** of these
values is in the dump. Their truthiness is inferred **only** from the resulting `ng-hide` / `ng-show`
class outcomes. **What would close it:** an `angular.element(document.body).scope()` snapshot.

---

### a.13 — Only one `<style>` element for four inline sheets

Element census: `style` ×1. Sheets 00, 01 and 13 are attributed to video.js / AngularJS /
videojs-youtube **by content**, not by a captured element. Flagged as inference in
`prt2-Q11-css-and-theme.md §1.2`.

---

### a.14 — No `:hover` / `:focus` / `:active` / `::placeholder` states

Only `::before` and `::after` are captured. Every interactive state must be read from CSS text.
Notable examples that will matter for a pixel/interaction match:
`.intercom-emoji-picker-emoji:hover { transform: scale(1.4); transition-delay: 0ms; }` (`14.css`),
`.cursor-pointer:hover { cursor: pointer; }` (`09.css:2574`),
`.dark .chat-msg-txt a:hover { color: rgb(0, 0, 255); }` (`09.css:1131`).

---

### a.15 — `meta.ua` contradicts the captured layout

`00-META.txt:7`:

```
meta.ua : Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
```

But `00-META.txt:9` gives `meta.viewport {"w":1842,"h":1265,"dpr":2}` and the DOM renders the
**desktop** Bootstrap grid: `.col-md-12`, `.col-md-9`, `.col-md-6`, `.col-md-4`, `.col-md-2`, a
`.container.container-sm` at `1170px` with `336px` side margins (`#40`), and
`.nav-wrapper.collapse.navbar-collapse.in` expanded (`#39`).

**A Pixel 9 does not render `col-md-*` at 1842 CSS pixels.** Either the UA string was spoofed/overridden
by the capture harness, or `meta.ua` is a harness default that does not describe the real browser.
**Recorded as an unresolved contradiction; it is not rationalised.** It matters because it means
`meta.*` fields in this dump cannot be trusted as descriptions of the captured session — which bears
directly on the `meta.role` question (§c).

**What would close it.** A capture that records `navigator.userAgent` from inside the page and
`window.innerWidth` in the same breath.

---

### a.16 — A browser extension left a fingerprint in the DOM

`nodes-000.txt:7`, record `#0 path=r <body>`:

```
attr cz-shortcut-listen = "true"
```

This attribute is injected by a browser extension (ColorZilla / Grammarly-family shortcut listener),
not by the application. **It is capture-environment contamination and must not be ported.** No other
extension artifact was found in the 882 records.

---

# (b) SENSITIVE-DATA REGISTER

> ## ⛔ STANDING INSTRUCTION — applies to every item in this register
>
> **None of the values in this section may be hard-coded, committed, fixtured, seeded, screenshotted
> or replayed in the rebuild.** They are live capture artifacts from a real logged-in owner session
> at `2026-07-24T15:59:42.449Z`. Every one of them must come from real runtime data or an explicit
> honest-pending state. Reproducing any of them as a literal in source would be exactly the
> fabricated-data failure that the project's non-negotiable rule 4 forbids — and, for the JWT, a
> credential leak.

---

### b.1 — 🔴 CRITICAL: a live JWT on the "Launch" link

**Where.** Record `#226`, `path=r.0.1.1.0.0.0.0.2.0.0.0.1.0.4.0` — the `<a class="btn btn-sm btn-info">`
labelled **"Launch"** in the Sessions table's Actions column, `rect x=1073.6 y=260.8 w=76.9 h=30`.
`nodes-001.txt:3038` (`ng-href`) and `nodes-001.txt:3041` (`href`) — the token appears **twice**,
identically.

**Value (as captured, truncated at the 300-char attribute cap):**

```
/session?id=3625&jwtSite=[REDACTED_CAPTURE_JWT]
```

**Decoded header** (base64url, verified):

```json
{ "alg": "HS256", "typ": "JWT" }
```

**Decoded payload** (base64url, verified — decodes cleanly and completely):

```json
{
  "name":   "[OWNER_JWT_NAME]",
  "email":  "[OWNER_EMAIL]",
  "id":     "[OWNER_USER_ID]",
  "type":   "site",
  "issued": 1784840082215,
  "iat":    1784840082,
  "exp":    1815944082
}
```

**Timestamps decoded:**

| claim | raw | UTC |
|---|---|---|
| `issued` (ms) | `1784840082215` | `2026-07-23T20:54:42.215Z` |
| `iat` (s) | `1784840082` | `2026-07-23T20:54:42Z` |
| `exp` (s) | `1815944082` | **`2027-07-18T20:54:42Z`** |

**Lifetime: 31 104 000 seconds = 360 days.** The token was issued ~19 hours before the capture and
is valid for nearly a year.

**Signature: TRUNCATED.** Captured segment `AqpORjtpJqPb-q` = **14 of the required 43** base64url
characters (a.3). **29 characters are missing.**

**What it exposes:**
* a real person's **full name** — `[OWNER_JWT_NAME]`;
* a real **email address** — `[OWNER_EMAIL]` (this is the repository owner's own
  account email);
* a **user ObjectId** — `[OWNER_USER_ID]`;
* an **account type** — `"site"`;
* the token's **signing algorithm** (`HS256` — a shared-secret HMAC, meaning the server holds a
  symmetric key that signs every one of these);
* a **360-day session lifetime** — an application-security observation worth raising with the human
  independently of the rebuild.

**Mitigating fact.** Because the signature is cut, the token **as captured cannot be used**. That is
the single reason this is a "handle carefully" item and not an active incident. **Do not attempt to
reconstruct the signature.**

**Instruction.** The rebuild's Launch link must build its URL at runtime from the authenticated
session. `jwtSite` must **never** appear as a literal in any `.svelte`, `.ts`, `.rs`, test fixture,
`.env.example`, seed file, or committed screenshot.

---

### b.2 — 🔴 PII: name and email

| datum | value | where |
|---|---|---|
| full name | `[OWNER_JWT_NAME]` | JWT payload `name` claim, `#226` ×2 |
| email | `[OWNER_EMAIL]` | JWT payload `email` claim, `#226` ×2 |

Both appear **only** inside the JWT — there is no rendered element in the 882 records displaying
either. **Instruction:** never a fixture value, never a seed row, never a placeholder. Use
`user@example.com` / `Test User` if a placeholder is needed.

---

### b.3 — 🟠 MongoDB ObjectIds — three distinct ids, and they do not agree

| id | value | where | record |
|---|---|---|---|
| **JWT subject** | `[OWNER_USER_ID]` | JWT `id` claim | `#226` |
| **room / session `_id`** | `6a628a99731b9f77ae9bf505` | `<muted class="ng-binding">` text, and the Manage `href` | `#231`, `#227` |
| **ownerID** | `6a628a98731b9f77ae9bf504` | `<muted class="ng-binding">` text | `#231` |

Verbatim text of `#231` (`path=r.0.1.1.0.0.0.0.2.0.0.0.1.0.0.2.1`, `nodes-001.txt:3195`):

```
( 6a628a99731b9f77ae9bf505 - ownerID: 6a628a98731b9f77ae9bf504
```

*(unterminated — the closing `)` is a separate element, `#222`
`div ng-show="showNewRoom" class="ng-hide"` text `")"`, currently hidden)*

Verbatim `href` of `#227` (`nodes-001.txt:3079`):

```
#/page/manageSession/6a628a99731b9f77ae9bf505
```

**⚠ Observation, not rationalised:** the JWT's subject id (`…f501`) is **not** the room's ownerID
(`…f504`). Three different ObjectIds are in play for what the UI presents as one owner viewing one
owned room. I record this and leave it standing — see §c.

MongoDB ObjectIds embed a creation timestamp in their first 4 bytes and a machine/process identifier
in the next 5, so these are **not** opaque. **Instruction:** never hard-code. Any rebuild fixture must
generate its own ids.

---

### b.4 — 🟠 Session / room identifiers

| datum | value | where |
|---|---|---|
| numeric session id | `3625` | `#220` `<strong class="ng-binding">` text `"3625"`; `#191` `<td class="ng-binding">` text `"Room 3625"`; `#226` `href` `?id=3625` |
| room display name | `Room 3625` | `#191` |
| room state | `open` | `#223` `div.label.label-orange.ng-binding` |
| user count | `1 / 2` | `#225` `div.text-muted.ng-binding` |
| session total | `Total : 1` | `#63` `<h4 class="ng-binding">` |

Not credentials, but **real production data from a real account**. **Instruction:** none of these may
appear as a hard-coded row in the rebuild. Rule 4 applies: real data or an explicit honest-pending
state. If the sessions table has no data source yet, render an empty state — do **not** ship
`Room 3625 · open · 1 / 2` as a placeholder.

---

### b.5 — 🟡 reCAPTCHA session tokens

Three `bft=` challenge tokens plus one `cb=` anchor nonce. Full values are recorded in
`prt2-Q09-iframes-recaptcha.md §5`. Summary:

| iframe | `name` | token prefix |
|---|---|---|
| `#35` | `c-g8o2ifrad64d` | `0dAFcWeA4YbSQP1DurnKHZ3cEoiRDL6-QM4GOeI1w3Xu…` |
| `#36` | `c-nso17np7r7zv` | `0dAFcWeA5K94K7q-ETS5tRqpX3jOra9hYzhiknfrb0Jb…` |
| `#37` | `c-4ecrn9oay2le` | `0dAFcWeA7uzktQT7KX2xKy2Nl49PCiZKU1s-Z8oObOya…` |
| `#217` | `a-4ecrn9oay2le` | `cb=b47umiriyero` |

**What they expose:** the reCAPTCHA challenge state of one browser session. Each iframe's own `title`
says `recaptcha challenge expires in two minutes`, so all four are long dead.
**Instruction:** never hard-code, never replay. Google's `api.js` mints these at runtime.

---

### b.6 — 🟢 reCAPTCHA sitekey — public, but environment configuration

`6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx`, appearing **5 times**: `data-sitekey` on `#129`, and the
`k=` parameter of the four Google iframe `src`s.

Not a secret — a v2 sitekey is public by design. But it is **domain-bound**: the `co` parameter on
`#217` base64-decodes to **`https://protradingroom.com:443`** (verified). A build served from any
other origin gets `ERROR for site owner: Invalid domain for site key`.
**Instruction:** read it from `PUBLIC_RECAPTCHA_SITE_KEY`; do not inline it.

---

### b.7 — 🟢 Build and version identifiers

| datum | value | where |
|---|---|---|
| app build/cache-bust | `1784623769671` | `#11` `src="/public/dist/app.min.js?v=1784623769671"`; `#12` inline `var __cver = '1784623769671';` |
| vendor build | `2.18.100` | `#2` `vendor.min.js?v=2.18.100`; `#5` `janus3.js?v=2.18.100` |
| reCAPTCHA JS build | `A7KpaEASfhDcK0nXxgQEyyYv` | `v=` on all four Google frames |
| adapter.js SRI hash | `sha512-8HaugtT+4c0rhgZIggNCv7I2N0u5OuCXQutD91XdRLqtBl4kD5z2B6QmHczDFMpeENZV060Fip3S954njcfv9A==` | `#4` `integrity` |

Low sensitivity. `1784623769671` decodes as epoch-ms `2026-07-21T21:29:29.671Z` — the app build
timestamp. **Instruction:** the rebuild generates its own build ids; do not carry these over.

---

### b.8 — 🟢 GOOD NEWS: no API keys or admin credentials leaked

Both privileged tables are **empty** in this capture, and I verified there is no hidden row:

| table | empty-state record | text |
|---|---|---|
| API Keys (`th`: `_id`, `secret`, `Actions`) | `#216` `<td colspan="3" class="text-center text-muted">` | **`"No API keys yet"`** |
| Extra Admin Users (`th`: `Name`, `Email`, `Added`, `Actions`) | `#212` `<td colspan="4" class="text-center text-muted">` | **`"No admin users added yet"`** |

Both `<tbody>`s (`#155`, `#151`) contain exactly one `<tr>` each (`#182`, `#178`), and each `<tr>`
contains exactly one `<td>` — the empty-state cell. **No `secret` value, no admin email, and no admin
password hash is present anywhere in the 882 records.** The Badges table is likewise empty
(`#147 <tbody>` has `height: 0px` and no child records).

This is the one place the capture is clean, and it is worth stating explicitly.

---

### b.9 — 🟢 Application asset paths (disclosure only)

`/public/dist/vendor.min.js`, `/public/vendor/janus3.js`, `/public/dist/app.min.js`,
`/public/images/ptr_logo.png`, `app/img/ajax_loader.gif`,
`/public/html/api-docs.html?src=/public/html/API_Documentation.md` (`#180`),
`app/views/page.footer.html` (`#45` `ng-include`),
plus the whole `/public/vendor/*` stylesheet tree in `00-META.txt`.
Structural disclosure, no credentials. Useful for the rebuild's route map; carries no handling
restriction.

---

### b.10 — Sensitive-data summary matrix

| # | item | severity | occurrences | records | port to rebuild? |
|---|---|---|---|---|---|
| b.1 | JWT (sig truncated) | 🔴 critical | 2 | `#226` | **NEVER** |
| b.2 | Name + email | 🔴 PII | 2 (inside b.1) | `#226` | **NEVER** |
| b.3 | 3 × ObjectId | 🟠 identifier | 4 | `#226 #227 #231` | **NEVER** |
| b.4 | Session 3625 + room row | 🟠 prod data | 5 | `#63 #191 #220 #223 #225 #226` | **NEVER** as literal |
| b.5 | reCAPTCHA tokens ×4 | 🟡 session | 4 | `#35 #36 #37 #217` | **NEVER** |
| b.6 | reCAPTCHA sitekey | 🟢 public | 5 | `#129 #35 #36 #37 #217` | **env var only** |
| b.7 | Build ids | 🟢 low | 5 | `#2 #4 #5 #11 #12` | regenerate |
| b.8 | API keys / admin users | 🟢 **none present** | 0 | `#212 #216` | n/a |
| b.9 | Asset paths | 🟢 structural | many | many | fine |
| a.16 | `cz-shortcut-listen` | 🟢 contamination | 1 | `#0` | **NEVER** |

---

# (c) THE `meta.role` CONTRADICTION — investigated, and left standing

## c.1 The contradiction

`00-META.txt:8`:

```
meta.role        : member
```

But the rendered page is unambiguously **owner-grade**. Hard evidence from the capture:

| owner-grade capability | evidence |
|---|---|
| section heading **"Extra Admin Users"** | `#70` `<h3>` text |
| button **"Add Admin User"** | `#101` `<button class="btn btn-success mb" ng-click="showAddAdminUser=!showAddAdminUser">` — `display: inline-block`, `rect 367,601.6 129×34`, **visibly rendered** |
| a real admin-creation form | `#149` `<form ng-submit="addAdminUser()">` with name / email / password |
| section heading **"API Keys"** | `#73` `<h3>` text |
| button **"New Api key"** | `#179` `ng-click="createApiKey()"` — **visibly rendered**, `rect 367,857 104.3×34` |
| API-key table exposing `_id` and **`secret`** columns | `#213`, `#214` `<th>` |
| button **"New Room"** | `#93` `ng-click="createNew()"` |
| badge CRUD (**"Add New Badge"**, **"Upload Image Badge"**, **"Export Badges"**) | `#96 #97 #98` — all visibly rendered |
| per-room **"Manage"** link | `#227` `href="#/page/manageSession/6a628a99731b9f77ae9bf505"` |
| **ownerID surfaced in the UI** | `#231` `( 6a628a99731b9f77ae9bf505 - ownerID: 6a628a98731b9f77ae9bf504` |
| navbar **"Account Settings"** cog + **Logout** | `#58`, `#59`, both `ng-show="login.isLoggedIn"` on `#42` |

Meanwhile the JWT — the only authorisation artifact actually present in the DOM — says
**`"type": "site"`**, not `"member"` (§b.1).

So the dump contains **three mutually inconsistent role signals**: harness `meta.role = "member"`,
JWT `type = "site"`, and a rendered UI that is owner-grade.

## c.2 What I checked

1. **Full-text search of every capture slice for `member`** —
   `grep -rn -i 'member' caps/ 01-stylesheets/ 00-META.txt 02-MANIFEST.txt`
   → **exactly one hit: `00-META.txt:8` itself.** The string `member` appears **nowhere** in the DOM,
   in any of the 882 records, in any of the 15 stylesheets, or in the manifest.
2. **Search for `role`** across `caps/00-baseline-room/` → 5 hits, all unrelated:
   `role="navigation"` (`#31`), `role="form"` (`#62`), `role="presentation"` (`#217`), and the badge
   editor's WP-roles label/textarea (`#138`, `#139`).
3. **Search for `owner`** → 1 hit: the `ownerID:` text in `#231`.
4. **Is there a role-gated element that is hidden?** Every `ng-hide`/`ng-show` in the dump gates on
   UI state (`showAddBadge`, `showAddAdminUser`, `showNewRoom`, `showArchivedRooms`,
   `badges.mode`, `s.isArchivedRoom`, `s.isClonedRoom`, `disableMarketplace`, `failedLoginCount`,
   `loggingIn`, `badgesList`, `apiKeys`, `adminUsers`, `login.isLoggedIn`) — **not one gates on a
   role, permission, or capability expression.** There is no `ng-if="isOwner"`, no
   `ng-show="user.role==='owner'"`, no permission directive anywhere.
5. **Is `meta.role` derived from the page?** No mechanism for it exists — no element, attribute,
   text node or CSS class in the dump carries a role value the harness could have read.
6. **Corroborating precedent:** `meta.ua` in the same block is *also* contradicted by the capture
   (a.15) — it claims an Android Pixel 9 while the DOM renders a 1842px desktop Bootstrap grid.

## c.3 VERDICT

> **`meta.role` is a capture-harness field, not an observation of the page — and it is wrong.**
>
> The evidence is decisive on the *provenance*: the string `member` occurs exactly once in the entire
> decoded dump, in `00-META.txt` itself, and there is no element, attribute, class, text node or CSS
> rule anywhere in the 882 records or 15 stylesheets from which a harness could have derived it. It
> is a harness-supplied label. The same `meta.*` block also carries a `meta.ua` that its own capture
> contradicts, which establishes that this block is not a trustworthy description of the session.
>
> The evidence is equally decisive on the *page*: this is an owner dashboard. Twelve independent,
> visibly-rendered owner capabilities are cited in §c.1, including a **`secret`** column and a live
> **ownerID** printed into the DOM. No role gate of any kind exists in the markup.
>
> **What I cannot explain, and will not paper over:** *why* the harness recorded `member`, and why
> the JWT's subject id (`[OWNER_USER_ID]`) differs from the room's ownerID
> (`6a628a98731b9f77ae9bf504`). Three plausible readings exist — a harness default, a role captured
> from a different tab/session, or a genuine authorisation defect in which a `member`-role principal
> is served the owner UI. **The dump does not contain the evidence to choose between them**, and the
> third possibility is serious enough that guessing would be irresponsible.

## c.4 Consequences for the rebuild — actionable

1. **Build the Account Settings page as an owner-grade page.** That is what the capture shows, to the
   pixel. `meta.role` must not be used to gate anything.
2. **`meta.role` must not be treated as evidence in any other decode piece.** Anything in the prior
   report that leans on it is unsupported.
3. **Raise the authorisation question with the human, separately from the rebuild.** If a
   `member`-role principal really can reach "New Api key", the `secret` column, and
   `addAdminUser()`, that is a live privilege-escalation bug in the reference application — not a
   decode detail. **This piece raises it; it does not resolve it.**
4. **The rebuild must implement its own server-side authorisation** for these endpoints regardless of
   what the reference does. The reference's markup contains **zero** client-side role gates, so a
   faithful port inherits zero access control.

---

## Cross-references

| topic | piece |
|---|---|
| Forms, inputs, textareas, labels, validation states | `prt2-Q08-forms-and-inputs.md` |
| The five iframes, reCAPTCHA plumbing, challenge tokens | `prt2-Q09-iframes-recaptcha.md` |
| The 655-record emoji picker, 635 glyphs, provenance | `prt2-Q10-intercom-emoji-picker.md` |
| 15 stylesheets, theme verdict, `styles.css` duplication | `prt2-Q11-css-and-theme.md` |
