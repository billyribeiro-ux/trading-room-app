# ptr1-P32 — Capture metadata & quiescence forensics

**Evidence root:** `/tmp/ptr-decode/ptr1/`
**Primary sources:** `00-META.txt` (read in full, lines 1–77), `02-MANIFEST.txt` (read in full, lines 1–26), and every `caps/*/INFO.txt`.

---

## Purpose

Establish, from the metadata alone, exactly **what was captured, by whom, on what device, when, and how much of it moved.** Then answer the quiescence question honestly in both directions: what the zero-drift result *gives* the rebuild, and what it *costs* it.

---

## §1 — Dump-level metadata (verbatim from `00-META.txt:1-10`)

| key | value | line |
|---|---|---|
| `SOURCE FILE` | `evidence-dumps/NEXT-STEP/ptr1.json` | `00-META.txt:1` |
| `BYTES` | **23,535,138** (≈22.4 MiB) | `00-META.txt:2` |
| `dump.part` | **1** | `00-META.txt:3` |
| `capture count` | **23** | `00-META.txt:4` |
| `meta.capturedAt` | **`2026-07-24T15:59:21.704Z`** | `00-META.txt:5` |
| `meta.url` | `https://protradingroom.com/ptrApp#/page/manageSession/6a628a99731b9f77ae9bf505` | `00-META.txt:6` |
| `meta.ua` | `Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36` | `00-META.txt:7` |
| `meta.role` | **`member`** | `00-META.txt:8` |
| `meta.viewport` | **`{"w":1842,"h":1265,"dpr":2}`** | `00-META.txt:9` |
| `meta.errors` | **`[]`** | `00-META.txt:10` |

### Reading the metadata

- **`dump.part = 1`** — this is **part 1 of a multi-part dump**. `00-META.txt` does not state the total part count. Whatever is in parts ≥2 is not in this evidence tree. *(gap)*
- **The UA is a spoofed mobile UA on a desktop-sized viewport.** `Android 15; Pixel 9 … Mobile Safari` claims a phone, but the viewport is `1842×1265` at `dpr=2` — that is a large desktop/laptop window, not a Pixel 9 (`1080×2424` physical, `412×915` CSS). A real Pixel 9 could never report `w:1842`. So either the harness overrode `navigator.userAgent`, or the capture ran in a desktop browser with device emulation for the UA string only. **Consequence:** any UA-sniffing branch in the app took the *mobile* path while the layout took the *desktop* path. The page contains a UA sniffer — `#12 r.11 <script>`: `var ua = navigator.userAgent.toLowerCase(); var is_chrome = ua.indexOf('chrome') > -1; var is_firefox = …; var is_msie = …` (truncated at 250 chars). A rebuild should **not** assume the reference was rendered on a phone. All 163 real rects are desktop-width rects.
- **`meta.role = member`** — the session that produced this capture is a *member*, yet the page rendered is the room-owner admin console and row 0 of the roster is `role==0` (**Owner**). The `role` here is the harness's own label for the captured identity, not `user.role`. The JWT on `#49` decodes (base64, header+payload readable before the 300-char cut) to `{"name":"[OWNER_JWT_NAME]","email":"[OWNER_EMAIL]","id":"[OWNER_USER_ID]","type":"site","issued":1784840082215,"iat":1784840082,"exp":1815944082}`. `exp − iat = 31,104,000 s = 360 days`. **Treat this token as a live secret.**
- **`meta.errors = []`** — this is the **harness's** error list, not the page's. It says the decoder hit no exception. It does **not** say the page logged no errors — and we know it should have (the invalid `background-color: 0A0A0A` on `#22`, and the `src`-less `<img>` at `#1550`). See P31/G23.
- **`viewport.dpr = 2`** — every rect is in CSS pixels; a pixel diff must be rendered at 2× and downsampled, or captured at `deviceScaleFactor: 2`.
- **Room identity:** room id `3625`, session `_id` `6a628a99731b9f77ae9bf505` (`#46` text `Manage Room id: 3625  ( 6a628a99731b9f77ae9bf505 )`, note the double space). Room links captured: `https://protradingroom.com/u/6a628a99731b9f77ae9bf505` (`#123`), `https://protradingroom.com/r/6a628a99731b9f77ae9bf505` (`#159`), `https://protradingroom.com/room/[yournamehere]` (`#125`), `https://protradingroom.com/room/[youruniquelinkhere]` (`#127`), `https://protradingroom.com/room/` (`#169`).
- **Build versions embedded in the page:** `vendor.min.js?v=2.18.100` (`#2`), `janus3.js?v=2.18.100` (`#5`), `app.min.js?v=1784623769671` (`#11`), and `#12` sets `var __cver = '1784623769671'`. `1784623769671` as an epoch-ms is **2026-07-21T08:49:29.671Z** — the app bundle is ~3 days older than the capture. The JWT's `iat` (`1784840082` → **2026-07-23T20:54:42Z**) is ~19 h before the capture; `exp − iat = 31,104,000 s = exactly 360 days`.

---

## §2 — The complete 23-capture index

Columns: index, kind, label, timestamp, Δ from the previous capture, node count, `truncated`, `themeClass`, viewport, directory. All values verbatim from `00-META.txt:13-35`, cross-checked against each `caps/*/INFO.txt` and `02-MANIFEST.txt:4-25`.

| # | kind | label | ts (`2026-07-24T15:59:…Z`) | Δ prev | nodes | trunc | themeClass | dir |
|---|---|---|---|---|---|---|---|---|
| 00 | `fullDom` | `baseline-room` | `18.276` | — | **2156** | false | `"footer-hidden"` | `caps/00-baseline-room` |
| 01 | `subtree` | `modal:permissionsModal` | `18.443` | +167 ms | 22 | false | `"footer-hidden"` | `caps/01-modal_permissionsModal` |
| 02 | `subtree` | `dropdown:dropdown-menu.show` | `18.507` | +64 ms | 28 | false | `"footer-hidden"` | `caps/02-…` |
| 03 | `subtree` | `dropdown:dropdown-menu.show` | `18.570` | +63 ms | 33 | false | `"footer-hidden"` | `caps/03-…` |
| 04 | `subtree` | `dropdown:dropdown-menu.dropdown-menu-right.show` | `18.641` | +71 ms | **128** | false | `"footer-hidden"` | `caps/04-…` |
| 05 | `subtree` | `dropdown:dropdown-menu.show` | `18.706` | +65 ms | 28 | false | `"footer-hidden"` | `caps/05-…` |
| 06 | `subtree` | `dropdown:dropdown-menu.show` | `18.771` | +65 ms | 30 | false | `"footer-hidden"` | `caps/06-…` |
| 07 | `subtree` | `dropdown:dropdown-menu.show` | `18.836` | +65 ms | 31 | false | `"footer-hidden"` | `caps/07-…` |
| 08 | `subtree` | `dropdown:dropdown-menu.show` | `18.898` | +62 ms | **1** | false | `"footer-hidden"` | `caps/08-…` |
| 09 | `subtree` | `dropdown:dropdown-menu.dropdown-menu-right.show` | `18.968` | +70 ms | **128** | false | `"footer-hidden"` | `caps/09-…` |
| 10 | `subtree` | `dropdown:dropdown-menu.show` | `19.032` | +64 ms | 28 | false | `"footer-hidden"` | `caps/10-…` |
| 11 | `subtree` | `dropdown:dropdown-menu.show` | `19.097` | +65 ms | 30 | false | `"footer-hidden"` | `caps/11-…` |
| 12 | `subtree` | `dropdown:dropdown-menu.show` | `19.162` | +65 ms | 31 | false | `"footer-hidden"` | `caps/12-…` |
| 13 | `subtree` | `dropdown:dropdown-menu.show` | `19.224` | +62 ms | **1** | false | `"footer-hidden"` | `caps/13-…` |
| 14 | `subtree` | `dropdown:dropdown-menu.dropdown-menu-right.show` | `19.294` | +70 ms | **128** | false | `"footer-hidden"` | `caps/14-…` |
| 15 | `subtree` | `dropdown:dropdown-menu.show` | `19.359` | +65 ms | 28 | false | `"footer-hidden"` | `caps/15-…` |
| 16 | `subtree` | `dropdown:dropdown-menu.show` | `19.423` | +64 ms | 30 | false | `"footer-hidden"` | `caps/16-…` |
| 17 | `subtree` | `dropdown:dropdown-menu.show` | `19.487` | +64 ms | 31 | false | `"footer-hidden"` | `caps/17-…` |
| 18 | `subtree` | `dropdown:dropdown-menu.show` | `19.550` | +63 ms | **1** | false | `"footer-hidden"` | `caps/18-…` |
| 19 | `fullDom` | `forced-darkTheme` | `20.397` | **+847 ms** | **2156** | false | `"footer-hidden darkTheme"` | `caps/19-forced-darkTheme` |
| 20 | `fullDom` | `forced-lightTheme` | `21.244` | **+847 ms** | **2156** | false | `"footer-hidden lightTheme"` | `caps/20-forced-lightTheme` |
| 21 | `fullDom` | `final-room` | `21.690` | +446 ms | **2156** | false | `"footer-hidden"` | `caps/21-final-room` |
| 22 | `meta` | `__meta__` | `-` | — | `-` | `-` | `null` | `-` |

Viewport is `{"w":1842,"h":1265,"dpr":2}` for **all 22 real captures** — no resize occurred mid-run.
`truncated=false` for **all 22** — no capture hit a node-count ceiling. (The per-*field* caps of 300/250 chars still applied; see P31/C2.)

### Timing structure — what the deltas reveal

- **`00 → 01` = 167 ms.** The single largest non-theme gap; the harness had to locate and force-open the modal.
- **`01 → 18` = 17 captures in 1,107 ms**, mean **65.1 ms**, range 62–71 ms, σ = **2.61 ms**. Extremely regular — a tight synchronous loop over `document.querySelectorAll('.dropdown-menu, .modal')`-style targets, one `display:block` + read per tick. The three 70–71 ms ticks (04, 09, 14) are exactly the three 128-node captures; the three 62 ms ticks (08, 13, 18) are exactly the three 1-node captures. **Capture cost scales with node count** — consistent with a real DOM+CSSOM walk, not a cached read.
- **`18 → 19` = 847 ms** and **`19 → 20` = 847 ms.** Identical to the millisecond. Each full-DOM re-walk of 2,156 nodes with `getComputedStyle` costs ~847 ms — and the harness clearly did a class-set → forced reflow → full walk for each theme.
- **`20 → 21` = 446 ms.** Roughly half of 847 ms — consistent with `final-room` being emitted as a *diff* (`02-MANIFEST.txt:25` `mode=diff nodeFiles=0`), so it walked but wrote almost nothing.
- **`21 → meta.capturedAt` = 14 ms.** The meta record is stamped immediately after the last capture.

### Wall-clock span

| measurement | value |
|---|---|
| first capture (`[00]`) | `2026-07-24T15:59:18.276Z` |
| last capture (`[21]`) | `2026-07-24T15:59:21.690Z` |
| **span, first → last capture** | **3.414 s** |
| `meta.capturedAt` | `2026-07-24T15:59:21.704Z` |
| **span, first capture → meta stamp** | **3.428 s** |
| interaction phase (`[00]`→`[18]`) | 1.274 s |
| theme phase (`[18]`→`[21]`) | 2.140 s |

**The entire evidence base is a 3.4-second window.**

### The three-user-row interaction pattern

Captures `04`–`08`, `09`–`13`, and `14`–`18` are three identical 5-capture groups — one per roster row. Within each group: the row's **Actions** menu (128 nodes), then its four submenus — **Permissions** (28), **Granular Perms** (30), **App and Notifications** (31), **Badges** (**1** — empty, P31/G5). Node counts are byte-stable across the three groups: `128/28/30/31/1` each time. Captures `02` (User List Actions, 28) and `03` (Actions With Selected, 33) are the two page-level menus. Capture `01` is the modal. **9 distinct menus + 1 modal = the complete interactive surface the harness could reach.**

---

## §3 — Quiescence: `final-room` vs `baseline-room`

### The claim, independently re-verified

`caps/21-final-room/INFO.txt:11-13`:

```
nodes identical to baseline: 2156/2156
nodes differing            : 0
nodes removed vs baseline  : 0
```

**Independent verification performed this pass (not read from the INFO header):**

| check | command | result |
|---|---|---|
| path count in the identical-list | `grep -c '^r' 21-final-room/IDENTICAL-TO-BASELINE.txt` | **2156** |
| does it include the root `<body>` (`r`)? | `grep -cx 'r' 21-final-room/IDENTICAL-TO-BASELINE.txt` | **1** (yes) |
| removed-node list | `cat 21-final-room/NODES-REMOVED-VS-BASELINE.txt` | `0 baseline node path(s) absent from this capture:` — **empty list** |
| node-record files emitted | `02-MANIFEST.txt:25` | `mode=diff nodeFiles=0` — **no diff records exist because there is nothing to record** |
| COMMON computed-style table | `diff 00-baseline-room/DEFAULTS.txt 21-final-room/DEFAULTS.txt` | **only line 1 differs** (the capture label). All 100 property rows byte-identical. |
| declared node count | `21-final-room/INFO.txt:5` | `2156 (declared 2156, truncated=false)` |

The identical-list's own header states the comparison basis (`21-final-room/IDENTICAL-TO-BASELINE.txt:1`):

> `2156 of 2156 nodes are byte-identical to baseline-room (rect, attrs, tag, text, ::before, ::after, and ALL computed style props).`

**Verdict: 2,156 / 2,156 identical · 0 differing · 0 removed. Confirmed.**

Across `15:59:18.276Z → 15:59:21.690Z` (**3.414 s**), during which the harness force-opened a modal, force-opened 9 dropdown menus, and set and cleared two `<body>` classes, **not one node, attribute, text run, rectangle, pseudo-element, or computed style property changed.**

### Reading 1 — the good news: this is a clean screenshot-diff target

- The page is **fully settled**. No skeleton, no spinner (`#40 ng-show="dataLoading"` and `#143 ng-show="loadingUsersStats"` are both `ng-hide`), no in-flight XHR that later repaints, no CSS animation mid-flight (`transition-duration: 0s` is COMMON on 2142/2156 nodes, `DEFAULTS.txt:91`), no lazy image swapping in.
- The harness's own manipulations were **fully reverted** — `themeClass` is back to `"footer-hidden"` at `[21]`, all forced `.show`/`display:block` are gone, and the DOM is byte-identical to before they were applied. That means the interaction captures did **not** contaminate the baseline, and the baseline is a legitimate reference state.
- Therefore **any diff a rebuild produces against `baseline-room` is a real defect in the rebuild**, not capture noise. There is no "wait for it to settle" ambiguity, no flaky-timing excuse. This is unusually strong ground for a reference match.
- It also means `baseline-room`, `forced-darkTheme`, `forced-lightTheme`, and `final-room` can be treated as **one** reference state (they differ only in the `<body>` class string), so the rebuild has exactly one target to hit, not four.

### Reading 2 — the honest cost: zero evidence of the app's dynamic behaviour

The same fact that makes the target clean makes it **static**. A 3.4-second window with zero drift means:

- **No socket traffic was observed.** SockJS is loaded (`#9 src="…/sockjs-client/1.4.0/sockjs.min.js"`), and the app is a live trading room — yet nothing arrived, nothing repainted. Either the admin console holds no live subscription, or nothing happened to publish in those 3.4 s. **The dump cannot distinguish these.**
- **No polling, no clock, no timer.** `#1321` renders `[MEMBER_A_LAST_LOGIN]` as a static string; there is no observed relative-time refresh. `09.css` ships a `#clockdiv` component — no `#clockdiv` node exists here.
- **Nothing about state transitions.** Tab switching, xeditable open→edit→save→cancel, dropdown open/close animation, toast lifecycle, `donttouchShow` / `showAdServer` reveals, textAngular html↔rich toggle — **all unobserved** (P31/G13).
- **Nothing about optimistic UI, loading skeletons, or error states.** The two spinners exist in the DOM but never rendered. Neither did any error banner.
- **The forced-theme captures prove the *class* is inert, not that a theme system is absent.** P27 resolves that separately (it is a session setting, not a class).
- **Quiescence is not a proof of correctness.** A page that is broken in a *stable* way is also quiescent. The zero-drift result says "nothing moved", not "everything is right".

**Both readings must be stated together.** The dump gives a rock-solid *static* target and **zero** *dynamic* coverage. A rebuild verified only against this evidence is verified only in one frozen state.

---

## §4 — Known evidence-pipeline defect (decoder-side, already fixed)

> **The decoder's first run compared `::before` / `::after` by reference rather than by value.** Two structurally equal pseudo-element records therefore compared as unequal, producing **phantom diffs in the theme captures** — nodes reported as "differing" between `baseline-room` and `forced-darkTheme` / `forced-lightTheme` purely because their pseudo-element objects were distinct instances, not because any value changed.
>
> **It was fixed and the slices were regenerated before this pass.** Every count in P27 and in §3 above comes from the **corrected** data.

Consistency checks against the corrected slices (all pass):

| check | expectation if the fix held | measured |
|---|---|---|
| `forced-darkTheme` differing nodes | 1 (the `<body>` class only) | **1** (`19/INFO.txt:12`) |
| `forced-lightTheme` differing nodes | 1 | **1** (`20/INFO.txt:12`) |
| `final-room` differing nodes | 0 | **0** (`21/INFO.txt:12`) |
| the two forced captures' identical-lists | should be identical to each other | `diff 19/IDENTICAL 20/IDENTICAL` → **no output** |
| `::before`/`::after` JSON parseability | all should parse | **493 objects, 0 parse failures** |
| the header's stated comparison basis | must include `::before, ::after` | `IDENTICAL-TO-BASELINE.txt:1` explicitly lists `rect, attrs, tag, text, ::before, ::after, and ALL computed style props` |

**Residual risk:** the fix is verified by *outcome* (the diffs collapsed to the 1 expected node, and the pseudo-element JSON round-trips cleanly), not by re-reading the decoder source, which is not in this evidence tree. If any downstream consumer still holds pre-fix slices, its theme conclusions are wrong.

### One other pipeline note (not a defect, a consumption hazard)

`DEFAULTS.txt:2-3` states the reconstruction rule:

> `A node line prints ONLY properties whose value differs from the COMMON value below.`
> `Node full style = COMMON table, overridden by that node's style-deviations. Nothing is discarded.`

This is **lossless**, but any tool that reads a node record without applying the 100-row COMMON table silently gets up to 100 properties wrong per node. (Example: `#22`'s `background-color` is absent from its deviations — which is the *proof* that the invalid `0A0A0A` was dropped, P30/B2 — but a naive reader would report "no background-color known".)

---

## §5 — Small accounting discrepancies (recorded, not resolved)

| item | declared | measured | note |
|---|---|---|---|
| `09.css` rule count | `ruleCount=2290` (`00-META.txt:71`) | **2,289** top-level rule lines (+88 `@`-lines, +196 indented nested lines) | 1-off |
| `09.css` bytes | `bytes=195160` | file is 195,272 B; minus the 88-byte header comment line = **195,184** | +24 |
| `02.css` rule count | `ruleCount=1187` (`00-META.txt:64`) | **1,185** top-level rule lines (+71 `@`, +320 indented) | 2-off |
| `02.css` bytes | `bytes=134760` | file is 135,384 B; minus the 95-byte header comment line = **135,289** | +529 |

These are counting-convention differences between the harness's `CSSRuleList` walk and the serialized text (at-rules, nested rules, and whether the injected header comment counts). **They do not affect any selector-level finding** — every `.dark`/`.light`/`var(--)`/`fa-*` grep in P27 and P30 ran over the full file text including nested lines.

---

## §6 — What a rebuild must do about this

1. **Render at `1842×1265` CSS px, `deviceScaleFactor: 2`.** Every one of the 163 real rects is in that frame.
2. **Do not emulate a Pixel 9.** The UA is spoofed; the layout is desktop. If your build has UA-conditional code, feed it the exact string in `00-META.txt:7` so any sniffing branch matches — while keeping the desktop viewport.
3. **Target `baseline-room` as the single canonical state.** All four full-DOM captures are the same state modulo the `<body>` class.
4. **Any diff is yours.** Quiescence is proven; there is no timing excuse. Iterate until clean.
5. **Do not claim dynamic parity.** Nothing in this dump verifies a single transition, save, load, or socket update. Mark all dynamic behaviour **honest-pending** until an interaction-trace capture exists.
6. **Rotate the JWT** in `#49` if this dump has left a controlled environment.
7. **Check for `dump.part ≥ 2`** before treating this tree as complete.

---

## §7 — Honest gaps in this piece

| gap | limit |
|---|---|
| **`dump.part = 1` and no total-part count.** `00-META.txt:3` says part 1; nothing says of how many. Parts ≥2 may contain further captures (other tabs, the room route) that would close P31/G14. |
| **`meta.errors = []` is the harness's list, not the page's.** No console or network log exists (P31/G23). The page almost certainly logged at least the invalid-CSS and broken-image events. |
| **The quiescence window is 3.414 s.** That is long enough to prove *this* page does not self-animate or self-poll on a sub-second cadence. It is **far** too short to prove there is no minute-scale poll, no socket reconnect, no session-expiry timer, no auto-refresh. **Do not read "0 differing" as "this page never changes."** |
| **The decoder-fix verification is outcome-based.** The decoder source is not in the evidence tree; the fix is confirmed by the diffs collapsing to exactly the expected single node and by 493/493 pseudo-element objects parsing cleanly, not by code review. |
| **No timezone or locale metadata.** Timestamps are UTC (`Z`), but rendered dates are locale-formatted (`07/23/2026 @ 05:41 PM` at `#155`, `07-22-2026` at `#1644`, `[MEMBER_A_LAST_LOGIN]` at `#1322`) with **two different date formats and inconsistent AM/PM spacing**. The capture machine's locale/TZ is unknown, so a rebuild cannot be sure whether those strings are server-rendered or client-formatted. `#155` carries `e-data-format = "DD-MM-YYYY h:mm a"` and `data-format = "DD-MM-YYYY +-HH:mm"` — which contradict the rendered `07/23/2026 @ 05:41 PM` (a `MM/DD/YYYY` string). That inconsistency is real and unexplained by this dump. |
| **No `document.readyState`, no performance timing, no paint timestamps.** "Fully settled" is inferred from the 0-diff result and the absence of spinners, not measured. |
