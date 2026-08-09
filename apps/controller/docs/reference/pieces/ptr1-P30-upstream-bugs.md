# ptr1-P30 — Defects in the reference app itself

**Evidence root:** `/tmp/ptr-decode/ptr1/`
**Scope:** bugs in **protradingroom.com's own code**, observable in the capture. Decoder/pipeline artifacts are in P32; things the dump simply cannot see are in P31.

---

## Purpose

A reference-match rebuild has to decide, defect by defect, whether to **reproduce** the bug (because it is visible and a screenshot diff will catch you) or **fix** it (because it is invisible and reproducing it would ship a known defect). Each entry below states which, and why.

**Legend for the verdict column**
- **REPRODUCE** — the defect is visible in the rendered page; not reproducing it creates a pixel/text diff.
- **FIX** — the defect is invisible to a screenshot; reproducing it would ship a real bug for no diff benefit.
- **REPRODUCE-VISUAL / FIX-BEHAVIOUR** — the *appearance* must match but the *behaviour* must not be copied.

---

## Table A — Summary

| id | severity | class | where | verdict |
|---|---|---|---|---|
| **B1** | **HIGH — data loss** | wrong model bound | `#550` | **FIX** |
| **B2** | MED — visual | invalid CSS value | `#22` | **REPRODUCE-VISUAL / FIX-BEHAVIOUR** |
| **B3** | MED — behaviour | opcode collision | `#1530` vs `#1533`; `#1990` vs `#1994` | **REPRODUCE-VISUAL / investigate** |
| **B4** | MED — visual | non-existent FontAwesome class | `fa-reload` ×9 | **REPRODUCE-VISUAL / FIX-CLASS** |
| **B5** | MED — visual | FontAwesome class newer than the shipped font | `fa-user-circle` ×18 | **REPRODUCE-VISUAL / FIX-CLASS** |
| **B6** | LOW — visual | duplicate class token | `fa fa fa-bell-o` ×6 | FIX (no visual effect) |
| **B7** | MED — payload | stylesheet shipped twice concatenated | `09.css` | **FIX** |
| **B8** | LOW — behaviour | page-level `<style>` overrides the app's global `body{overflow}` | `#21` / `14.css` | **REPRODUCE** |
| **B9** | LOW — copy | copy-pasted `e-title` / `e-label` on 8 fields | `#556`, `#648`, `#843`, `#847`, `#889`, + 8 mislabelled `email:` + 3 mislabelled `URL:` | **REPRODUCE** (they are visible in the edit popover) |
| **B10** | LOW — copy | stray/typo whitespace in labels | `#1451`, `#1425`, `#1447`, `#485`, `#1405` | **REPRODUCE** |
| **B11** | LOW — copy | ~20 spelling errors in user-visible text | see Table K | **REPRODUCE** |
| **B12** | LOW — dead markup | 12 nodes with `ng-show="false"` | `#1540`–`#1543` ×3 rows | FIX (delete) |
| **B13** | LOW — dead logic | `ng-show="statXrefs.length>0 \|\| true"` | `#180` | FIX (delete the condition) |
| **B14** | LOW — a11y | `<button>` styled as dropdown toggle with no menu | `#464` | FIX |
| **B15** | LOW — a11y/CLS | `<img>` with no width/height and no `src` | `#1550`, `#470`, `#58`, `#218` | FIX |
| **B16** | INFO | `updateUser(12)` opcode never bound | — | ignore |

---

## B1 — `#550` binds `sess.login_webhook_url` but saves `logout_webhook_url` (**data-loss bug**)

**Evidence** — `caps/00-baseline-room/nodes-004.txt`, records `#548` and `#550`:

```
#548 path=r.0.1.1.0.1.3.1.5.0.0.16.1 <a>
  attr onaftersave      = "saveSessField('login_webhook_url')"
  attr editable-textarea = "sess.login_webhook_url"
  attr e-label           = "Login Webhook URL:"
  text: "empty"

#550 path=r.0.1.1.0.1.3.1.5.0.0.17.1 <a>
  attr onaftersave      = "saveSessField('logout_webhook_url')"
  attr editable-textarea = "sess.login_webhook_url"        <-- WRONG MODEL
  attr e-label           = "Logout Webhook URL:"
  text: "empty"
```

Sibling labels: `#547` `"Login Webhook URL"`, `#549` `"Logout Webhook URL"`.

**Systematic check performed this pass:** every one of the 269 editable bindings was tested for `onaftersave='saveSessField(X)'` vs `editable-*="sess.X"`. **Exactly one mismatch exists — `#550`.** All 268 others agree.

**What it breaks:** the *Logout Webhook URL* row displays and edits `sess.login_webhook_url`. Typing a logout URL overwrites the **login** webhook in the in-memory model, and `saveSessField('logout_webhook_url')` then persists that same value to the **logout** field. Net effect: (a) the Logout row always mirrors whatever the Login row shows, (b) editing Logout silently clobbers Login in the UI, (c) the persisted logout value is whatever the login field held. Both rows render `empty` in this capture, so **the bug is invisible on this screenshot** — it only manifests once either field is non-empty.

**Verdict: FIX.** Bind `sess.logout_webhook_url`. Reproducing it would ship silent data corruption and, since both render `empty`, produces zero diff benefit.

---

## B2 — `#22` `style="background-color: 0A0A0A; "` — missing `#`, the declaration is dropped

**Evidence** — `caps/00-baseline-room/nodes-000.txt`, record `#22`:

```
#22 path=r.0.1.1 <div>
  rect: x=0 y=50 w=1842 h=772.8
  attr ui-view    = ""
  attr autoscroll = "false"
  attr class      = "ng-fadeOutZoom ng-fluid ng-scope"
  attr style      = "background-color: 0A0A0A; "
  style-deviations (2; all other props == COMMON in DEFAULTS.txt):
    width: 1842px
    height: 772.766px
```

`0A0A0A` is not a valid `<color>` (a hex colour needs `#`). The CSS parser discards the declaration. Proof from the capture itself: **`background-color` is NOT among `#22`'s style deviations**, so its computed value equals the COMMON value `rgba(0, 0, 0, 0)` (`caps/00-baseline-room/DEFAULTS.txt:58`) — fully transparent. Corroborating: aggregating all 537 distinct style-deviation values across the 18 baseline node files yields **no `rgb(10, 10, 10)` background anywhere** (`rgb(10,10,10)` appears 269× but only as `color`/`outline-color`/`border-*-color` on the xeditable links, from `09.css:1194 .editable-click, a.editable-click { color: rgb(10, 10, 10); }`).

**What it breaks:** the route container was meant to be near-black `#0A0A0A`. It renders transparent, so the white `<body>` (`#0` deviation `background-color: rgb(255, 255, 255)`) shows through for the full `1842×772.8` region.

**Verdict: REPRODUCE-VISUAL / FIX-BEHAVIOUR.** The rendered page has a **white** content area — the rebuild must be white there too. Do **not** copy the broken literal; just don't paint `#0A0A0A`. (If you "fix" it to `#0A0A0A` you will produce a catastrophic full-page diff.)

---

## B3 — `updateManyUsers(2)` and `updateUser(2)` are each bound to two contradictory labels

**Evidence (bulk menu, `caps/03-dropdown_dropdown-menu.show/nodes-000.txt`):**

| record | `ng-click` | label |
|---|---|---|
| `#1530` / cap03 `#12` | `updateManyUsers(2)` | **`UNBAN Participant`** |
| `#1533` / cap03 `#15` | `updateManyUsers(2)` | **`Make Participant`** |

**Evidence (per-user menu, `caps/00-baseline-room/nodes-016.txt` + caps 04/09/14):**

| record | `ng-click` | label |
|---|---|---|
| `#1990` | `updateUser(2,user._id,user.userName,$index)` | **`Make Participant`** |
| `#1994` | `updateUser(2,user._id,user.userName,$index)` | **`Unban`** |

Confirmed by occurrence counts across all 23 captures: every `updateUser` opcode occurs 9×, **except `2`, which occurs 18×** — exactly double.

**What it breaks:** two menu entries that read as different operations invoke the identical server call. Either (a) "set role = 2 (Participant)" genuinely *is* the unban operation (because BANNED is `role==4`, so demoting to `2` clears the ban) — in which case the duplication is harmless but confusing, or (b) unban is supposed to preserve the prior role and does not. **The dump cannot distinguish these** — no network capture. But note the `<li>` at index 6 of the Permissions submenu is a `divider` separating `BAN` (op 4) from `Unban` (op 2), which is consistent with (a).

**Verdict: REPRODUCE-VISUAL** (both menu items must appear, in the captured order and with the captured icons) **/ investigate before wiring**. Do not silently invent a distinct `unban` opcode — that is not in evidence.

---

## B4 — `class="fa fa-reload"` — not a FontAwesome class, renders blank (×9)

**Evidence:**

```
#2093  path=r.0.1.1.0.1.3.1.0.0.3.1.0.4.0.1.2.1.8.0.1 <i> ¦ class = "fa fa-reload"
#2124  path=…3.1.1.4.0.1.2.1.8.0.1                     <i> ¦ class = "fa fa-reload"
#2155  path=…3.1.2.4.0.1.2.1.8.0.1                     <i> ¦ class = "fa fa-reload"
```
plus captures `04 #127`, `07 #30`, `09 #127`, `12 #30`, `14 #127`, `17 #30` — **9 occurrences total**.

Two independent proofs it renders nothing:

1. `grep -c 'fa-reload' 01-stylesheets/10.css` → **0**. The class does not exist in the shipped FontAwesome sheet.
2. **Every other `<i class="fa fa-…">` in the dump carries a `::before` line with a real PUA codepoint. These 9 nodes have NO `::before` line at all** — the browser generated no pseudo-element content.

Context: this is the second icon of the `Reset Mobile Notifs` menu item, next to `<i class="fa fa-mobile">`. The intended class is almost certainly `fa-refresh` (FA4's reload glyph, ``, which *is* used at `#67` and `#1292`).

**Verdict: REPRODUCE-VISUAL / FIX-CLASS.** The reference renders **`[mobile-icon] Reset Mobile Notifs`** with a blank gap where the second icon should be. Match that (emit nothing, or an empty span of the same width). Do **not** substitute `fa-refresh` — that would add a glyph the reference does not draw.

---

## B5 — `class="fa fa-user-circle"` — added in FontAwesome 4.4, but the app ships **4.3.0** (×18)

**Evidence:**

```
01-stylesheets/10.css:2  @font-face { font-family: FontAwesome;
    src: url("../fonts/fontawesome-webfont.woff2?v=4.3.0") format("woff2"),
         url("../fonts/fontawesome-webfont.woff?v=4.3.0")  format("woff"),
         url("../fonts/fontawesome-webfont.ttf?v=4.3.0")   format("truetype"); … }
```

`grep -c 'fa-user-circle' 01-stylesheets/10.css` → **0**.

The 18 nodes (2 per row × 3 rows in the baseline = 6, plus captures 04/06/09/11/14/16):
`#2073`, `#2074`, `#2104`, `#2105`, `#2135`, `#2136` and their subtree twins — the icons for `Show User Count` (`updateUser(8)`) and `Hide User Count` (`updateUser(7)`).

Same two proofs as B4: absent from the sheet, and **these 18 nodes have no `::before` line** while all 468 other FontAwesome icon nodes do.

**Cross-check performed:** every `fa-*` class used anywhere in the DOM (62 distinct) was diffed against the 593 `.fa-*::before` rules in `10.css`. The complete set of *undefined* classes is:

| class | uses | status |
|---|---|---|
| `fa-2x` | 7 | **not a bug** — a size modifier (`.fa-2x { font-size: 2em; }`), no `::before` expected |
| `fa-reload` | 9 | **B4** |
| `fa-user-circle` | 18 | **B5** |

So B4 and B5 are the *only* two broken-icon defects in the whole page.

**Verdict: REPRODUCE-VISUAL / FIX-CLASS.** `Show User Count` and `Hide User Count` render with **no leading icon** in the reference (unlike every sibling item in that submenu). Match that. Upgrading FontAwesome to ≥4.4 would light up two glyphs the reference does not show.

---

## B6 — `class="fa fa fa-bell-o"` — duplicated `fa` token (×6)

**Evidence:** `#2085`, `#2091`, `#2116`, `#2122`, `#2147`, `#2153`, plus captures `04 #119/#125`, `07 #22/#28`, `09 #119/#125`, `12 #22/#28`, `14 #119/#125`, `17 #22/#28`.

```
#2085 path=r.0.1.1.0.1.3.1.0.0.3.1.0.4.0.1.2.1.4.0.1 <i> ¦ class = "fa fa fa-bell-o"
```

These are the second icons of `PAUSE Mobile Notifs` and `Send Test Mobile Notifs`.

**Effect: none visually.** `fa-bell-o` IS defined (`10.css:256 .fa-bell-o::before { content: ""; }`) and these nodes DO carry `::before` with `content: ""` (21 occurrences of `` counted across the dump). Duplicate class tokens are idempotent in HTML.

**Verdict: FIX** (write `class="fa fa-bell-o"`). Zero visual difference, so there is no diff cost to cleaning it up.

---

## B7 — `styles.css` is shipped **twice, concatenated** — ~50% of the CSS payload is dead weight

**Evidence** — `01-stylesheets/09.css` (`href=https://protradingroom.com/public/app/css/styles.css`, `00-META.txt:71`, `bytes=195160`).

Measured this pass:

| measurement | value |
|---|---|
| rule lines emitted (excluding the header comment) | **2,573** |
| distinct rule lines | **1,224** |
| lines that also occur elsewhere in the file | **1,188** |
| the file's first rule `.glyphicon { … }` occurs at | **line 2 and line 1273** — exactly twice |
| longest exactly-repeating run at offset 1271 | **lines 2..1047 ↔ lines 1273..2318** (1,046 consecutive identical rules) |
| copy A | lines **2–1272** (1,271 lines) |
| copy B | lines **1273–2574** (1,302 lines) |
| `diff copyA copyB` | **2 lines removed, 33 lines added** |

Copy B is a **newer build** of the same file:

- Removed from B: `.thumb20 { margin-right: 5px; width: 20px !important; … }` — deleted entirely.
- Modified in B: `.thumb16` lost its `margin-right: 5px`.
- Added in B (31 rules): `.roomArea`, `.alertsChatArea`, `.l-cell-presentation-sections…`, `.room-bg-image-show…`, `.wrapper-bg-image`, `.l-table-block/.l-row-block`, `.room-bg-image`, `.webcamScreenVideo`, `.btn-random-user`, `.texarea-alt-wrapper`, `.texarea-alt`, `.input-group-alt`, `.typing-indicator`, `.l-cell-wrapper-overflow`, `.user-info-block`, `.roster-user-icon`, `.disclosure-input`, `.d-block`, `#permissionsModal .modal-content`, `#badgesForm input`, `.label-badge-img`, `.user-badge-img`, `.dark-theme-badge-id`, `.room-badge-id/.room-badge-name`, `.room-badge-name`, `.users-many-actions`, `.checkbox-apply-to-all-rooms`, `.checkbox-apply-to-all-rooms input:checked + span`, `.chat-tab-row`, `.badge-preview`, `.add-tab-btn`, `.cursor-pointer:hover`.

Note that the **newer** copy is second, so it wins the cascade — which is why the page renders correctly despite the duplication. But: **`.thumb20` from copy A is still live** (copy B never overrides it), and `.thumb16`'s `margin-right: 5px` from copy A is still live. The build is therefore not just wasteful, it is *stale-leaking*.

**What it breaks:** ~95 KB of the 190 KB `styles.css` transfer is redundant. It also means any rule the newer build *deleted* is still applied from the older copy.

**Verdict: FIX.** Ship one copy. No visual consequence for this page (verified: the rules that differ — `.thumb16`, `.thumb20`, and the 31 additions — are not used by any node here except `#permissionsModal .modal-content { padding: 20px; }` and `.d-block`, `.users-many-actions`, `.checkbox-apply-to-all-rooms`, all of which live only in copy B and therefore apply identically either way).

---

## B8 — a page-injected `<style>` overrides the app's global `body { overflow: hidden }`

**Evidence:**

```
#21 path=r.0.1.0 <style class="ng-scope">
  text: "body {\n        overflow: auto;\n    }"
```

That element **is** sheet `[14]` (`00-META.txt:76` `ruleCount=1 bytes=24 href=(inline)`, `01-stylesheets/14.css:2 body { overflow: auto; }`), and being last in document order it beats:

```
01-stylesheets/09.css:95    body { overflow: hidden; height: 100%; }
01-stylesheets/09.css:1366  body { overflow: hidden; height: 100%; }   (the copy-B duplicate, B7)
```

Confirmed in the computed styles: `#0 <body>` carries deviations `overflow-x: auto` and `overflow-y: auto` (`caps/00-baseline-room/nodes-000.txt:12-13`) against a COMMON of `visible` (`DEFAULTS.txt:80-81`), and `height: 1265px` (viewport), not the `100%` that `09.css` also asks for.

**What it breaks:** nothing here — the manageSession page is long and *needs* to scroll, so the override is deliberate. It is listed because it is a **cascade smell**: a route template mutating a global via an injected `<style>` rather than a route class. A rebuild that scopes `overflow: hidden` to the *room* route only, and leaves the admin route at `auto`, gets the same result cleanly.

**Verdict: REPRODUCE** (the page must scroll: `overflow-x/y: auto` on the scroll container). Implement it as a route-scoped rule, not an injected `<style>`.

---

## B9 — Copy-pasted `e-title` / `e-label` on the xeditable popovers

The popover heading is the **only** label the user sees while editing, so these are user-visible.

### B9a — same label reused for a *different* field

| record | field | wrong label | should read |
|---|---|---|---|
| `#556` `r.0.1.1.0.1.3.1.5.0.0.19.1` | `allowedProducts` | `e-label = "MemberPlan Filter:"` (copied from `#552` `allowedMemberships`) | *Product Filter:* — form label is `Product filter:` (`#555`) |
| `#648` `r.0.1.1.0.1.3.1.5.0.0.42.1` | `disableEditingUsername` | `e-title = "Show Only Usernames in Roster?"` (copied from `#640` `showOnlyUsernames`) | *Disable Editing Username?* — form label is `Disable Editing Username` (`#647`) |
| `#843` `r.0.1.1.0.1.3.1.5.0.0.97.1` | `chatAutoClearSpecialHour` | `e-label = "Nick Filter:"` (copied from `#538` `nickFilter`) | *Overwrite Clear Hour:* — form label is `Overwrite Clear Hour:` (`#842`) |
| `#847` `r.0.1.1.0.1.3.1.5.0.0.98.1` | `chatAutoClearWeekend` | `e-title = "Auto Clear Chat?"` (copied from `#835` `chatAutoClear`) | *Auto Clear Chat Weekend?* — form label is `Auto Clear Chat Weekend?` (`#846`) |
| `#889` `r.0.1.1.0.1.3.1.5.0.0.109.1` | `enableQAReactions` | `e-title = "Enable Reactions?"` (copied from `#885` `enableReactions`) | *Enable QA Reactions?* — form label is `Enable QA Reactions?` (`#888`) |

**Systematic derivation:** every `e-title` and `e-label` value in the 269 bindings was counted; the duplicates are exactly `Linked Rooms:`×6 (legitimately six linked-room fields), `MemberPlan Filter:`×2, `Nick Filter:`×2, `Secret:`×3, `Server`×3, `Text:`×3, `Token`×2, `Token SID`×2, `URL`×2, `URL:`×14, `email:`×8, `text:`×2, `Show Only Usernames in Roster?`×2, `Auto Clear Chat?`×2, `Enable Reactions?`×2. The five above are the ones where the duplicate is demonstrably wrong for the field.

### B9b — `e-label = "email:"` on 5 fields that are not emails

| record | field | actual content per the help text |
|---|---|---|
| `#793` | `banIPList` | `"Comma separated list of banned IPs"` (`#795`) |
| `#1044` | `extraAdminChannels` | `"Comma separated list of extra admin channels"` (`#1046`) |
| `#1048` | `extraRegChannels` | `"Comma separated list of extra regular (anyone can post) channels"` (`#1050`) |
| `#1052` | `altGenChannelName` | `"Rename the Main Chat channel to..."` (`#1054`) |
| `#1056` | `altOffTopicChannelName` | `"Rename the Off-Topic channel to..."` (`#1058`) |

(The other three `email:` uses — `#777 showArchivesToSpecificPresenters`, `#797 reportEmail`, `#805 sendOpenCloseEmail` — are correct.)

### B9c — `e-label = "URL:"` on 3 fields that are not URLs

| record | field |
|---|---|
| `#969` | `xuserAccessToken` |
| `#971` | `xuserAccessTokenSecret` |
| `#984` | `apiSecret` |

(The other 11 `URL:` uses are correct.)

Also `#1182 x264_encArgs` uses `e-label="Rec Params"`, `#1184 twillioApiSID` uses `"Twillio SID"` but `#1186 twillioApiToken` and `#1188 twilioPhone` both use `"Token SID"` — the phone field labelled "Token SID" is a third mislabel.

**Verdict for all of B9: REPRODUCE.** These strings paint into the popover the user sees. Changing them creates a text diff. Note them as known upstream defects and fix them only in a follow-up that also updates the reference expectation.

---

## B10 — Stray/typo whitespace in user-visible strings

| record | attribute / text | exact value (whitespace shown) |
|---|---|---|
| `#1451` `r.0.1.1.0.1.3.1.5.0.4.0.35.1` (`modAlertFilterList`) | `e-label` | `"Nick␣␣␣Filter:"` — **three** spaces |
| `#1425` `r.0.1.1.0.1.3.1.5.0.4.0.26.1` (`force_mp3_audio`) | `e-title` | `"Force␣␣MP3 Audio?"` — **two** spaces |
| `#1447` `r.0.1.1.0.1.3.1.5.0.4.0.34.1` (`alt_roomjs`) | `e-title` | `"Alr RoomJS:"` — **"Alr"** should be "Alt" (form label at `#1446` reads `Alt Room.js`) |
| `#485` `r.0.1.1.0.1.3.1.4.0.1.1.3` | `text` | `"Show␣␣Only?"` — an interpolation collapsed to nothing between "Show" and "Only?"; the adjacent `<span class="badge badge-danger">Free Trials</span>` (`#1345`) is what the sentence was supposed to name |
| `#1405` `r.0.1.1.0.1.3.1.5.0.4.0.18.5` | button text | `"Apply␣␣server / repeaters to entire account?"` — same collapsed-interpolation pattern |
| `#1403` | `<label class="muted">` | `"(Comma separated list op IPs IE: …)"` — **"op"** should be "of" |

Also, non-visible but load-bearing for exact-match parsing: `ng-repeat = "user in xrefs␣␣"`, `ng-model = "uSearch␣"`, `ng-model = "uSearchStat␣"`, `editable-select = "sess.authMode␣"`, `gravatar-src-once = "user.email␣"`, `ng-click = "htmlDescChanged()␣"`, `ng-click = "resetLogo()␣"`, `ng-click = "openFileChooser(␣'logos')␣"`, `class = "␣control-label␣"` (`#458`), `class = "thumb24␣"`, `class = "navLogo␣"`, `class = "btn btn-assertive␣"`, `ng-show = "user.role==0␣"` etc.

**Verdict: REPRODUCE.** All of these paint. HTML collapses runs of whitespace when rendering, so `Force␣␣MP3` and `Show␣␣Only?` render with a single space — but the string in the DOM must match if you diff the DOM. `"Alr RoomJS:"` and `"op IPs"` are unambiguous visible typos.

---

## Table K — B11: spelling errors in user-visible or API-visible strings

| record / symbol | as written | correct |
|---|---|---|
| `#163` handler | `sendWeminarEmailReminder(...)` | `sendWebinarEmailReminder` |
| `#479`/`#480`/`#481` handlers | `loadMontlyStats`, `downloadMontlyStats` | `loadMonthlyStats`, `downloadMonthlyStats` |
| `#142`, `#144`, `#479`–`#481` scope var | `statXrefsMontly` | `statXrefsMonthly` |
| `#1368` handler + label | `swapCLusterIDs()` | `swapClusterIDs` |
| `#2012` handler | `resetFCMForuser(...)` | `resetFCMForUser` |
| `#474`, `#1334` | `name="wysiswyg-editor"` | `wysiwyg-editor` |
| `#990` field | `sess.diasableFCMAlerts` | `disableFCMAlerts` |
| `#1068` field | `sess.ingnoreBadWordsList` | `ignoreBadWordsList` |
| `#823` field | `sess.styckyNonTradeAlert` | `stickyNonTradeAlert` |
| `#781` field + label | `sess.disalowSporadicMultiLogins` | `disallow…` |
| `#785` field + `e-title "Disalow Multi-Logins?"` + label `"Disalow Multi-logins?"` | `disalowMultiLogins` | `disallowMultiLogins` |
| `#1389` field + labels | `sess.backupMediaMTXClustterID`, `"Backup MediaMTX ClustterID"` | `Cluster` |
| `#1222` label (field `stAppScheduleID` at `#1223`) | `"Scheudle ID (GCal)"` | `Schedule` |
| `#1457`, `#1461` help text | `"custimize"` | `customize` |
| `#915`, `#927` help text | `"cofigure"` | `configure` |
| `#554`, `#558`, `#562` help text | `"seprated"` | `separated` |
| `#634` help text | `"mobile app info wiil be hidden"` | `will` |
| `#546` help text | `"it will play instead of the chash.mp3"` | `cash.mp3` |
| `#498` help text | `"make it hard to getss"`, `"WordPRess plugin"` | `guess`, `WordPress` |
| `#1219` help text | `"agree to thisDisclosure to enter."` | `this Disclosure` |
| `#743` help text | `"auto disable the chat (chat disabed)"` | `disabled` |
| `#787` help text | `"users could can only log in once per room"` | grammar |
| `#1403`, `#1429`, `#1433` help text | `"Comma separated list op IPs"` | `of` |
| `#1137`/`#1138` help text | `"will  have mic/screenshare"`, `"***** CAREFULL ******"` | `CAREFUL` |
| `#1162` `e-title` | `"Save Recordings to saveRecsToVimeo?"` | leaked variable name into the label |
| `#1205` `e-title` | `"UIframe Cookie Fix ?"` | stray leading `U` |
| `#831` `e-title` | `"Disable Screen & Audio?"` for field `isChatOnlyRoom` (label `Chat Only Room?`) | label/field mismatch |
| `#188` `<h3>` | `"DON'T  These below unless you know what you are doing..."` | a word (`TOUCH`) was extracted into `#450`'s `<span ng-click>`, leaving a double space and a broken sentence |
| `#1258` `<p>` | `"These  vars allow to server altertaive code version for this room"` | `serve alternative` |

**Verdict: REPRODUCE** for every string that renders (all `label`/`<p>`/`<h3>`/`e-title`/`e-label`/button text above). **FIX** for the identifiers that are internal only (`statXrefsMontly`, `swapCLusterIDs`, `resetFCMForuser`, `wysiswyg-editor`) — but note the `sess.*` **field names** (`diasableFCMAlerts`, `ingnoreBadWordsList`, `styckyNonTradeAlert`, `disalow*`, `backupMediaMTXClustterID`) are **wire-format keys**; they must be reproduced exactly or the API breaks.

---

## B12 — 12 permanently-hidden `<i>` icons per the roster template (`ng-show="false"`)

**Evidence** — four per row, in all three rows:

```
#1540 …3.1.0.1.1 <i> ng-show="false" class="fa fa-folder-o fa-2x ng-hide" aria-hidden="true"
#1541 …3.1.0.1.2 <i> ng-show="false" class="fa fa-mobile fa-2x ng-hide"  aria-hidden="true"
#1542 …3.1.0.1.3 <i> ng-show="false" class="fa fa-mobile ng-hide"        aria-hidden="true"
#1543 …3.1.0.1.4 <i> ng-show="false" class="fa fa-mobile ng-hide" style="color: red;" aria-hidden="true"
```
plus `#1572`–`#1575` (row 1) and `#1604`–`#1607` (row 2). Total 12 nodes; `ng-show="false"` occurs **12×** in the dump and nowhere else.

**Verdict: FIX (delete).** They render nothing (`ng-hide` → `display: none !important` from `01.css:2`). Deleting them removes 12 of 2,156 nodes with zero visual change. If you are diffing the DOM node-for-node rather than pixel-for-pixel, keep them.

---

## B13 — `ng-show="statXrefs.length>0 || true"` — a condition that is always true

**Evidence:** `#180 r.0.1.1.0.1.3.1.4.0.1 <div> ¦ ng-show = "statXrefs.length>0 || true"`.

`|| true` short-circuits the whole expression to `true`. The element (the User-Stats search row wrapper) is always shown. Almost certainly a debugging edit that was never reverted.

**Verdict: FIX (drop the `ng-show` entirely).** Identical rendering.

---

## B14 — `#464` is styled as a dropdown toggle but has no dropdown

**Evidence:**

```
#463 <button class="btn dropdown-toggle btn-primary" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Actions With Selected</button>
#464 <button class="btn dropdown-toggle btn-primary" ng-click="actionsWithEmailList()">Actions With the Email List</button>
#465 <ul role="menu" class="dropdown-menu">   <-- belongs to #463
```

`#464` carries `dropdown-toggle` (which paints Bootstrap's caret styling and the toggle affordance) but has **no `data-toggle="dropdown"`, no `aria-haspopup`, no `aria-expanded`, and no sibling `<ul>`**. Corroborating: `#1299 <span class="caret">` exists as a child of `#463` (rect `195.7 471.4 8 4`) — `#464` has no `.caret` child.

**Verdict: FIX** — drop the `dropdown-toggle` class in the rebuild **only if** it changes nothing visually. Check: `#464`'s rect is `220.6 455 193 34`, same height/padding as `#463` (`37 455 179.7 34`); Bootstrap's `.dropdown-toggle` sets no box properties on its own (only `.dropdown-toggle:focus{outline:0}` and the `.caret` margin), so removing it is visually neutral. Removing the class is the a11y-correct choice.

---

## B15 — `<img>` elements with neither dimensions nor (in one case) a `src`

| record | element | problem |
|---|---|---|
| `#1550` `…3.1.0.1.11` | `<img gravatar-src-once="user.email " style="margin-right:5px " class="thumb24 ">` | **no `src` attribute at all** — while its row-1/row-2 twins `#1582` and `#1614` both resolved to `https://secure.gravatar.com/avatar/…`. The Owner row has no email, so the `gravatar-src-once` directive never wrote a `src`. The element still occupies `24×24` (`rect: x=104.3 y=558 w=24 h=24`) via `.thumb24`, so there is no layout shift — but the browser fires a broken-image request/paint. |
| `#470` | `<img ng-src="/public/images/ptr_logo.png" class="navLogo " src="…">` | no `width`/`height` attribute; sized by `.navLogo { max-height: 25px; max-width: 300px; width: auto; height: 25px; }` (`09.css:1191`) — acceptable |
| `#43` | `<img ng-hide="hideLogo || !sess.logoURL" ng-src="…" height="35px" class="brand-logo" style="max-width: 200px; height: auto; max-height: 40px;" src="…">` | has `height="35px"` (invalid — the HTML attribute takes a bare number, not a unit) **and** an inline `height: auto` that overrides it. Rendered `200×24.5`. |
| `#58`, `#218` | `<img src="app/img/ajax_loader.gif">` (relative, no leading slash) — the two loading spinners | no dimensions; both are inside `ng-hide` containers so never painted |

**Verdict: FIX** (add `width`/`height` or `aspect-ratio`; give the empty-avatar case an explicit placeholder). Visually neutral because the CSS already fixes the boxes.

---

## B16 — `updateUser(12)` is never bound (informational)

`grep -r 'updateUser(12' caps/` → **0 hits in all 23 captures**. Opcodes 1–11, 13, 14 are bound; 12 is a hole in the enum. Either the operation was removed from the UI but kept server-side, or the numbering skipped. Not a defect in the capture — recorded so the rebuild does not "helpfully" renumber.

---

## What a rebuild must do about this — consolidated

| do | items |
|---|---|
| **Reproduce exactly (visible)** | B2 (white content area), B3 (both menu items), B4/B5 (two icons missing), B8 (page scrolls), B9 (all popover labels), B10 (all whitespace/typos in visible strings), B11 (all visible spelling) |
| **Fix silently (invisible)** | B1 (bind the right model), B6 (dedupe class token), B7 (ship one stylesheet), B12 (delete dead icons), B13 (delete dead condition), B14 (drop the toggle class), B15 (image dimensions) |
| **Preserve as wire format even though misspelled** | `sess.diasableFCMAlerts`, `sess.ingnoreBadWordsList`, `sess.styckyNonTradeAlert`, `sess.disalowMultiLogins`, `sess.disalowSporadicMultiLogins`, `sess.backupMediaMTXClustterID`, `sess.twillioApiSID`, `sess.twillioApiToken` (vs `sess.twilioPhone` — **one `l`**, inconsistent within the same three-field group) |

---

## Honest gaps in this piece

| gap | limit on the claim |
|---|---|
| **No JavaScript source.** Every "what it breaks" statement about `saveSessField`, `updateUser`, `updateManyUsers` is reasoned from the DOM binding, not from reading the handler. B1's data-loss mechanism is certain (the binding is the model); B3's actual server behaviour is **not** determinable from this dump. |
| **No network capture.** Cannot confirm that `saveSessField('logout_webhook_url')` actually PUTs the login value, only that the *model it reads* is the login model. |
| **Two stylesheets are CORS-blocked** (`03.css`, `07.css`, both `ruleCount=0`, body `CORS-BLOCKED`). Bugs inside Video.js's and angularjs-toaster's CSS are invisible to this audit. Neither renders on this page. |
| **Only three roster rows and one auth mode** were captured. Bugs that only appear at `authMode=='sso'`/`'jwt'`/`'registrationA'`, with `enableBadges` on, or with >3 users, cannot be seen. |
| **No hover/focus/active/`:disabled` state was captured**, so styling bugs in those states are out of scope (P31). |
| **B4/B5 "renders blank" is proven by the absence of a `::before` record**, which is strong (all 468 working icons have one) but is an absence-of-evidence argument for the specific *visual* claim. A screenshot would make it direct. |
| **B7's "no visual consequence for this page"** was verified by checking that the diverging rules (`.thumb16`, `.thumb20`, and copy-B's 31 additions) match no node here except ones present in both copies. It is not verified for other routes. |
