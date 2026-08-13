# Evidence gap register

Every gap found by the full read of `apps/controller/evidence-dumps/`, with a status and — when
closed — the evidence that closed it. The full read itself is in
[`evidence-dumps-full-read.md`](./evidence-dumps-full-read.md).

**This file is the tracker.** A gap is only `CLOSED` when a specific citation is written next to it.
`OPEN` means nobody has done it. `WON'T FIX` means a decision was taken and the reason is recorded.
Never mark a row closed on reasoning alone.

Status counts are at the bottom and must be updated whenever a row changes.

---

## Tier 0 — closable locally, no capture, no network

| id | gap | status | evidence that closed it |
|---|---|---|---|
| T0-1 | Glyphicon `content:` codepoints unreadable (sheet-2, ~249 rules) | **CLOSED** | Decoded from the file's own bytes: 268 content-rules, 249 PUA + 19 real Unicode. The Read tool renders PUA blank; the bytes were always there. |
| T0-2 | Font Awesome `content:` codepoints unreadable (sheet-10) | **CLOSED** | 519 rules decoded, all PUA. |
| T0-3 | feather `content:` codepoints unreadable (sheet-11) | **CLOSED** | 132 rules decoded, all PUA. |
| T0-4 | video.js `content:` codepoints unreadable (sheet-3) | **CLOSED** | 32 rules decoded. Different form from the others — escaped `\f101`, not literal characters. |
| T0-5 | Is `sheet-2.css` really Bootstrap 3.3.7? No version banner survives the CSSOM re-serialisation. | **CLOSED** | Selector-set comparison against the in-repo `apps/controller/evidence-bootstrap-3.3.7.css` (which DOES carry `/*! Bootstrap v3.3.7 */` + `normalize.css v3.0.3`). 1856 vs 1851 selectors; after normalising pseudo-element colons the delta is 3 vs 8, all explained below. **It is stock 3.3.7 with zero customisation.** |
| T0-6 | Are the missing `.eot` / `.svg` `@font-face` sources a build customisation, or Chrome? | **CLOSED** | **Chrome.** The in-repo 3.3.7 original has TWO `src:` declarations — a bare `.eot` for IE8 then a five-format list incl. `.eot?#iefix` (embedded-opentype) and `.svg#glyphicons_halflingsregular`. The capture (`sheet-2.css:59`) has only woff2/woff/truetype. Chrome drops `format()` keywords it cannot use. |
| T0-7 | Are the prefix/precision deltas (`appearance`, `text-size-adjust`, `2n+1`, `1.42857`, expanded shorthands) customisation or re-serialisation? | **CLOSED** | All re-serialisation, proven by the same comparison. Chrome discards vendor-prefixed selectors entirely (`button::-moz-focus-inner`, `input::-moz-focus-inner`, `.form-control::-moz-placeholder`, `.form-control:-ms-input-placeholder`, `.form-control::-ms-expand`) and normalises `*::before`→`::before` and `nth-of-type(odd)`→`nth-of-type(2n + 1)`. |

### The 19 non-PUA glyphicon values (T0-1) — real Unicode, worth knowing
`*` U+002A · `+` U+002B · `€` U+20AC · `−` U+2212 (minus sign, NOT hyphen) · `☁` U+2601 ·
`✉` U+2709 · `✏` U+270F · `⛺` U+26FA · `⌛` U+231B · `¥` U+00A5 (yen AND jpy) ·
`₽` U+20BD (ruble AND rub) · blockquote `— ` U+2014 U+00A0 and ` —` U+00A0 U+2014 ·
carousel `‹` U+2039 / `›` U+203A · plus `a[href]::after` and `abbr[title]::after` print-mode
`attr()` rules.

---

## Tier 1 — static fetches. No login, no interaction, no mutation.

`app.min.js` is the highest-value single artifact: the AngularJS `ngRepeat` templates we are missing
are compiled into it. One fetch may close the whole row-markup cluster with no capture at all.

| id | artifact | closes | status |
|---|---|---|---|
| T1-1 | `/public/dist/app.min.js?v=1785053347467` | — | **CLOSED** — fetched, 455,329 B. Contains NO templates (`templateCache.put`: 0, `ng-repeat`: 0). It references 42 `.html` partials loaded by `templateUrl`, which is what actually closed T2-1..T2-6. |
| T1-2 | `/public/dist/vendor.min.js?v=2.18.100` | xeditable/bootbox internals | **CLOSED** — fetched, 1,265,906 B. |
| T1-3 | `/public/app/css/bootstrap.min.css` raw bytes | already closed by T0-5/6/7; fetch only if a byte-level diff is ever wanted | WON'T FIX — superseded by T0-5 |
| T1-4 | `/public/app/css/styles.css` raw bytes | banners + rules Chrome dropped from sheet-9 | **CLOSED** — fetched, 218,719 B (vs 194,754 B re-serialised: Chrome dropped ~24 KB). |
| T1-5 | `/public/html/POST_ROUTE_API_DOCUMENTATION.md` | authoritative API source | **CLOSED** — fetched, 20,699 B. |
| T1-6 | `glyphicons-halflings-regular.*` | — | **CLOSED AS NOT-DEPLOYED.** Every path soft-404s (HTTP 200 + `not the page you are looking for`). Corroborates `meta.json` `fonts[]` `Glyphicons Halflings: unloaded` AND `sheet-9.css:1` overriding `.glyphicon{font-family:FontAwesome}`. The font was replaced by FA and never shipped, so the 249 decoded glyphicon codepoints are dead slots. |
| T1-7 | `fontawesome-webfont.woff2` (v4.3.0) | renders the decoded FA codepoints | **CLOSED** — fetched, 56,780 B. |
| T1-8 | `theme.css`, `vendor/animate.css`, `main.css` | all public-site colour/spacing | **CLOSED** — fetched, 232,979 + 63,376 + 2,103 B. |
| T1-9 | Public-site images | referenced by path only | OPEN — not yet attempted. |
| T1-10 | Angular-17 room build assets | the room's real stylesheet | OPEN — both soft-404 at the app origin. They are served from the ROOM's origin/base, not `protradingroom.com/`. Needs the room's real host before retrying. |

---

## Tier 2 — needs one seeded room and one capture run

Seed for BRANCH COVERAGE, not volume. ~6 users is enough.
Collector config must change: `OPEN_EDITOR: true`, `OPEN_BOOTBOX: true`, `LOAD_STATS: true` — all
three were `false` in the capture we have, which is why those panes came back empty
(`meta.json` `config`).

| id | gap | seed / action needed | status |
|---|---|---|---|
| T2-1 | User-row markup | — | **CLOSED + READ END TO END** — `page.manageSession.html:346-603`. Full transcription in `evidence-dumps-full-read.md` PART 3. |
| T2-2 | User Stats row markup | — | **CLOSED + READ** — `page.manageSession.html:739-754`. |
| T2-3 | Monthly report row markup | — | **CLOSED + READ** — `page.manageSession.html:718-721`. No thead/tbody; month is a `<th>`. |
| T2-4 | Badge row markup | — | **CLOSED** — same file, line 392, nested inside the user row. |
| T2-5 | Admin-user row markup | — | **CLOSED + READ** — `page.welcome.html:1291-1301`, incl. the empty state. |
| T2-6 | API-key row markup | — | **CLOSED + READ** — `page.welcome.html:1336-1352`. Secret rendered in PLAIN TEXT; keys support per-session/per-endpoint restrictions. |
| T2-7 | `table-striped` alternation + hover | 2+ rooms, 4+ users | OPEN — **markup no longer the issue**; this is now purely a RENDERED-GEOMETRY gap (which rows stripe, computed hover values). |
| T2-8 | Archived-row branch | — | **CLOSED** — `page.welcome.html:372-373`: `.label.label-orange` `{{s.currentState \|\| 'open'}}` vs `.label.label-warning` `archived`. |
| T2-9 | Cloned-room indicator contents | — | **CLOSED AS DEAD MARKUP** — `page.welcome.html:367` `<span ng-show="s.isClonedRoom"></span>` is EMPTY in the SOURCE. There is nothing to discover; do not invent an indicator. |
| T2-10 | The two `unamePW` ngIf items | — | **CLOSED** — same file, lines 178 and 183. |
| T2-11 | JWT rows (JWT Secret Key, Token Expiration, Allow PW logins on SSO) | set `authMode = jwt` | OPEN |
| T2-12 | Webinar rows (Date, email preview populated, Registration Link) | `roomType = webinar` + a `webinarTimeTxt` value | OPEN |
| T2-13 | Room Password / Temp Password ×2 / Free Trial Password rows | `authMode = webinarRoom` | OPEN |
| T2-14 | SSO Setup tab in its own right | `authMode = sso` | OPEN |
| T2-15 | Text List tab populated | set a Twilio token | OPEN |
| T2-16 | App Pair Link populated shape + pair sample URL | `hasAppPairLink = true` + a `pairSecretKey` | OPEN |
| T2-17 | Profanity sub-rows (Ignore List, Extra Bad list) | `hasProfanityFilter = true` | OPEN |
| T2-18 | `showAdServer` block (Add Server / Remove Server) | click the muted repeater-list label | OPEN |
| T2-19 | textAngular editor with real content | `OPEN_EDITOR: true` + a room whose `description` is set | OPEN |
| T2-20 | bootbox variants beyond the badge prompt | `OPEN_BOOTBOX: true` | OPEN |
| T2-21 | Clone Room / Delete Room / Marketplace header buttons | `canClone` / `isClonedRoom` / `disableMarketplace=false` | OPEN |
| T2-22 | Login-form rendered geometry + failed-login error state | capture logged OUT | OPEN |
| T2-23 | Sorted-state icon for `sortByUUID()` / `sortByName()` | click a sort header | OPEN |

**Already closed without a capture:** editable `:hover` / `:focus` — derived from `sheet-6.css:14-16`
+ `sheet-9.css:1193` and shipped. See CHANGELOG 2026-08-12 20:15 EDT.

---

## Tier 3 — API wire contract. Needs one authenticated GET each.

**Parked** unless we reimplement the Sessions API. Their auth puts `apiSecret` in the URL query
string, so any script doing this leaks the secret into access logs, proxies and `Referer` headers.

| id | gap | status |
|---|---|---|
| T3-1 | `role` integer → name mapping | **CLOSED — no API call needed.** `page.manageSession.html:416-422`: `0`=Owner, `1`+`!nonPresenter`=Presenter, `1`+`nonPresenter`=Admin, `2`=Participant, `3`=CHAT MUTED, `4`=BANNED. |
| T3-2 | `uuid` type conflict | **PARTLY CLOSED** — `page.welcome.html:367` binds `{{s.uuid}}` as the SHORT NUMERIC room id (3625), agreeing with cloneSession's `42`. The API doc's "string" typing is the outlier. |
| T3-3 | `/sessions/alertlogs` response array keyed `chatlogs` — real contract or copy-paste bug? | PARKED |
| T3-4 | `duration` unit | **CLOSED — no API call needed.** `page.manageSession.html:752` renders `{{userStat.duration / 3600 \| number: 2 }}`, so `duration` is **SECONDS**. |
| T3-5 | `fromDate`/`toDate` timezone handling | PARKED |
| T3-6 | `isMobile` value format (true/false vs 1/0 vs presence) | PARKED |
| T3-7 | Error response body shapes (status codes documented, no JSON) | PARKED |
| T3-8 | Full `currentState` enum ("active"/"inactive" seen only) | PARKED |
| T3-9 | `contentType` full list for recordings ("mp4, webm, etc.") | PARKED |
| T3-10 | Which host serves `cloneSession` — `ptrv3.` vs bare `protradingroom.com` | PARKED |
| T3-11 | Pagination/limit/offset for the 8 list endpoints (none documented) | PARKED |

---

## Tier 5 — NEW, opened 2026-08-13 by reading the uncompiled templates

Reading source rather than rendered DOM surfaced features no capture ever showed.

| id | gap | status |
|---|---|---|
| T5-1 | **The Stripe / marketplace subscription block on the user row** (`page.manageSession.html:366-389`) — `isMarketPlaceUser`, `stripeSubscriptionStatus`, `stripeLastPaidAt`, `stripeCurrentPeriodEnd`, `stripeLastPaymentFailureAt`, `stripeLastPaidAmount`, `openStripeDetails`, `getStripeStatusClass`, `formatStripeAmount`. We had NO evidence this existed — `ng-if` REMOVES the element, so no capture could contain it. | **CLOSED 2026-08-13.** Owner ruled it in scope. Migration `0010` added the seven columns; `stripe-status.ts` ports `getStripeStatusClass` verbatim; amounts render through `$lib/money`, NOT the reference's 100×-low formatter. Five labels rendered, gated on `isMarketplaceUser`. 18 assertions in `manage-user-row-reference-fields.test.ts`, four negative controls run. The sixth child — the Details link — is NOT built: see T5-15. |
| T5-2 | `getStripeStatusClass()` | **CLOSED** — `app.min.js`@183507. default/success/warning/danger/info mapping transcribed in the full-read PART 3. |
| T5-3 | `formatStripeAmount()` | **CLOSED.** The float-division concern was MINE and is REFUTED — exhaustive test over all 2,000,001 cent values $0–$20,000 shows zero mismatches. **But a real 100× bug exists**: `/100` is applied unconditionally, so Stripe ZERO-DECIMAL currencies (JPY, KRW, VND, CLP, ISK) render 100× low — `formatStripeAmount(1999,'JPY')` = `"19.99 JPY"`. Also `"$-19.99"` for negatives. DO NOT COPY. |
| T5-4 | `gravatar-src-once` | **CLOSED** — `vendor.min.js`@278041, the `ui.gravatar` module. Deregisters its watcher after the first non-null value; URL `//www.gravatar.com/avatar/<md5>` (secure:false by default). **PRIVACY: every user email is MD5-hashed in-browser and sent to gravatar.com** on each render of the users and stats tables. |
| T5-5 | `updateUser` code **12** is unused in the template. Does the server accept it? Dead code or an unreachable branch? | OPEN |
| T5-6 | `btn-small` (Bootstrap **2** spelling) on the APPROVE button — inert in BS3. Confirm it renders as an unstyled `.btn` and do not "correct" it. | OPEN |
| T5-7 | ~3,300 lines of `page.manageSession.html` + `page.welcome.html` still unread end to end. Read so far: manageSession 340-634 + 710-769; welcome 360-417 + 1285-1354. | OPEN |
| T5-8 | **API keys support `restrictToSessions` and `restrictToEndpoints`** (`page.welcome.html:1339`) — a per-session AND per-endpoint authorisation dimension the 545-line API documentation never mentions. `manageApiKeyRestrictions(k)` drives it. | OPEN |
| T5-9 | The API secret is rendered in PLAIN TEXT in the account page table (`page.welcome.html:1341`). Decide whether our rebuild reproduces that or masks it. | OPEN — DECISION NEEDED |
| T5-10 | `s.ownerdID` (`page.welcome.html:368`) — the label reads `ownerID:` but the binding has a stray `d`. It rendered a real value, so the MODEL property is genuinely `ownerdID`. Do not "correct" it. | OPEN |
| T5-11 | `showNewRoom>=5` gates the **New Room** button (`page.welcome.html:396`) — a click-counter easter egg, not a permission. Confirm what increments it. | OPEN |
| T5-13 | **FOUR CONDITIONAL ICONS ARE HARDCODED HIDDEN IN OUR USER ROW.** `page.manageSession.html:351-354` shows they interpolate — `{{sess.fileAccessCaseByCase && user.hasFileAccess}}`, `{{sess.ptrMobileAppCaseByCaseEnabled && user.hasMobileApp}}`, `{{!…CaseByCase && user.alerterAppTokens.length >0}}`, `{{!…CaseByCase && user.alerterAppFCMUserOff}}`. The DOM capture showed `ng-show="false"` only because that room had both settings off and no users, and our comment concluded they were dead markup. Needs `hasFileAccess`, `hasMobileApp`, `alerterAppTokens`, `alerterAppFCMUserOff` on the member — schema, loader and render. | **CLOSED 2026-08-13.** All four wired. `alerterAppTokens` was already here as `pushTokensJson`; the loader exposes it as `pushTokenCount` so the raw device tokens are stripped before the payload leaves the server. Each gate is asserted in BOTH states, and the mutual exclusion of the large/small phone is exhausted over all eight flag combinations. `manage-row-actions-render.test.ts` had pinned the OLD wrong belief — that the four are unconditionally present and `hidden` — and was rewritten. |
| T5-14 | `mobilePairCode` exists in our schema (`db/schema.ts:334`) but is not surfaced on the user row. The reference shows it behind `ng-show="showPins && user.mobilePairCode"` — which is what `ng-init="showPins=true;"` on the table is for. | OPEN |
| T5-12 | Stats rows use a per-row `ng-hide="filterOnline && !userStat.isOnline"`, so `table-striped` counts hidden rows — same trap as archived rooms. | OPEN |
| T5-15 | **`openStripeDetails(user)` — what does the Details link open?** The reference ends the Stripe block with an anchor: empty `href`, classes `label label-info`, a `fa-info-circle` icon, the text "Details", `ng-click="openStripeDetails(user)"` (`page.manageSession.html:386-388`). Looked for and NOT found in: `views/page.manageSession.html` (whole file), every DOM capture under `evidence-dumps/`, and the handlers transcribed out of `app.min.js` in `evidence-dumps-full-read.md` — `getStripeStatusClass` and `formatStripeAmount` are there, this is not. **Blocks:** the sixth child of the Stripe block. Deliberately NOT rendered — an anchor with invented contents behind it, or none, is a control whose only effect is its own presence. `manage-user-row-reference-fields.test.ts` asserts its ABSENCE, so it fails and names the work when the evidence arrives. **Needs:** run `apps/controller/scripts/collect-stripe-details.js` in the Chrome console on the live manage page. It reads the handler's own SOURCE off the Angular scope — debug info is on, the captures carry 324 `ng-scope` classes — so it needs NO marketplace member and NO clicks, then follows any `templateUrl` that source names. A rendered block and modal are captured as corroboration if the room happens to have one. Smoke-tested by `collect-stripe-details.smoke.mjs`. | OPEN — SCRIPT READY |

---

## The user-row field gap, quantified (2026-08-13) — the spec for T5-13/T5-14

Measured, not estimated: every `user.*` reference in `page.manageSession.html:346-603` against
`src/lib/server/db/schema.ts` + `src/lib/server/rooms.ts`.

**39 fields referenced · 24 present · 15 absent.** Two of the 15 (`fcmTokens`, `fcmUnreged`) occur
ONLY inside a commented-out block in the reference, so **13 are real**.

| group | fields | drives | decision |
|---|---|---|---|
| Stripe / marketplace | `isMarketPlaceUser`, `stripeSubscriptionStatus`, `stripeLastPaidAt`, `stripeCurrentPeriodEnd`, `stripeLastPaymentFailureAt`, `stripeLastPaidAmount`, `stripeLastPaidCurrency` | the six-label subscription block, `getStripeStatusClass()`, `formatStripeAmount()` | **T5-1 — DONE 2026-08-13.** All seven columns in migration `0010`; five labels rendered. Sixth label (Details) held open as T5-15. |
| Mobile / FCM | `hasMobileApp`, `alerterAppFCMUserOff` | 3 of the 4 dead icons | build |
| File access | `hasFileAccess` | the 4th dead icon, with `sess.fileAccessCaseByCase` | build |
| Row detail | `discordUsername`, `pw`, `restrictPMUser` | the Discord line, the "PW set" marker, "User PMs disabled" | build |
| NOT NEEDED | `fcmTokens`, `fcmUnreged` | commented out in the reference | skip |

**Do it as ONE forward-only migration.** Three migrations as each icon surfaces is how a schema
becomes archaeology. The two `sess.*` gates (`fileAccessCaseByCase`, `ptrMobileAppCaseByCaseEnabled`)
already exist in the settings schema — only the per-member columns are missing.

`money.ts` already exists and handles the zero-decimal currencies the reference gets wrong, so
`formatStripeAmount`'s 100x bug will not be inherited if the Stripe group is built.

---

## Tier 4 — won't fix

| id | gap | reason |
|---|---|---|
| T4-1 | Marketplace section markup | Styled in the head but never rendered; `__disableMarketplace='true'`. We are not building it. |
| T4-2 | The redacted JWT in `main-nav-login-clicked/file:472` | Deliberately redacted. Must stay that way. |
| T4-3 | Public-site runtime third-party DOM (ShareThis, Tawk iframes) | Vendor-injected, not ours to match. |
| T4-4 | `background-color: 0A0A0A` actual paint | Invalid CSS (no `#`), so it never paints. Nothing to match. |
| T4-5 | Which of 260 settings are server-authorised vs client-asserted | Not answerable from any DOM capture; it is a backend question. |

---

## Status

| tier | closed | open | parked / won't fix | total |
|---|---|---|---|---|
| T0 | 7 | 0 | 0 | 7 |
| T1 | 7 | 2 | 1 | 10 |
| T2 | 8 | 15 | 0 | 23 |
| T3 | 1 | 0 | 10 | 11 |
| T4 | 0 | 0 | 5 | 5 |
| T5 | 3 | 11 | 0 | 14 |
| **total** | **31** | **25** | **14** | **70** |

### Acted on, not just recorded (2026-08-13)
- **T5-3 → `src/lib/money.ts` + 20 tests.** The zero-decimal 100× bug is now un-introducible: the
  reference implementation is a negative control inside the test file. 5 negative controls, all RED.
- **Two pre-existing RED tests fixed**, both caused by this session's own join/leave + Tawk work
  failing to update the `consumers` map and the wired-count note. Full `src/lib`: 734 tests green.

**Progress 2026-08-13: 7 → 23 closed.** The turn came from realising `app.min.js` holds no
templates at all — it references 42 `.html` partials by `templateUrl`. Fetching those partials gave
the UNCOMPILED source for every `ngRepeat` in the product, which closed the entire row-markup
cluster (T2-1..T2-6, T2-8, T2-9 markup) with **no seeded room and no capture run**, and answered a
parked API question (T3-1, the role enum) for free.

**Every `ngRepeat` template in the product, located:**
`page.manageSession.html` — :346 `user in xrefs` · :392 `b in badgesList` ·
:718 `montlyStat in statXrefsMontly` · :739 `userStat in statXrefs | filter: uSearchStat`
`page.welcome.html` — :365 `s in login.sessions | filter: sessSearch` ·
:1166 `b in badgesList | filter: sessSearch` · :1197 `roomBadge in badgesList` ·
:1291 `au in adminUsers` · :1336 `k in apiKeys`

**What Tier 2 still needs a capture for:** rendered geometry only — striping, hover, and the
config-gated panes (`OPEN_EDITOR`/`OPEN_BOOTBOX`/`LOAD_STATS`). The MARKUP question is settled.

The full read recorded 73 raw gap statements; several were duplicates of each other across readers,
and several ("this file has no CSS in it", "I did not read outside my range") are statements of
scope rather than gaps. The 56 above are the deduplicated, actionable set.
