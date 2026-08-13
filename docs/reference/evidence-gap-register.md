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
| T2-11 | JWT rows (JWT Secret Key, Token Expiration, Allow PW logins on SSO) | set `authMode = jwt` | **CLOSED 2026-08-13 13:13 EDT** — `page.manageSession.html:768-773`. Both JWT rows live in the SETTINGS tab, not a tab of their own, each gated `ng-show="sess.authMode=='jwt'"`. JWT Secret Key is `editable-textarea="sess.ssoJWTSecret"` with `e-label="Secret:"`; its muted help carries TWO typos that are the reference's own — "WordPRess" and "hard to getss" — and must not be corrected. "Allow PW based logins on SSO?" follows in a nested `<p class="form-control-static">`. |
| T2-12 | Webinar rows (Date, email preview populated, Registration Link) | `roomType = webinar` + a `webinarTimeTxt` value | **CLOSED 2026-08-13 13:16 EDT** — `page.manageSession.html:39-97`. Date row is `ng-show="sess.roomType=='webinar'"`, `editable-combodate="sess.webinarDate"`, `e-data-format="DD-MM-YYYY h:mm a"`, `data-format="DD-MM-YYYY +-HH:mm"`, `e-min-year="{{thisYear}}"`, `e-max-year="{{thisYear+2}}"`, displaying `MM/dd/yyyy @ hh:mm a` — note `hh`, zero-padded 12-hour, unlike the `h:mma` used everywhere else. Its note sits in a NON-STANDARD `<muted>` element. Registration Link is `https://{{hostname}}/r/{{sess._id}}` — the `/r/` prefix. Email preview is a `<pre style="height: 130px; overflow: scroll;">` whose time reads `FILL TIME ABOVE` until `webinarTimeTxt` is set. The send handler is misspelled in the reference: `sendWeminarEmailReminder`, not Webinar. |
| T2-13 | Room Password / Temp Password ×2 / Free Trial Password rows | `authMode = webinarRoom` | **CLOSED 2026-08-13 13:16 EDT** — `page.manageSession.html:791-827`. SEVEN password rows, not three. `webinarPW` ("Room Password", `e-label="Password:"`), `webinarPW2` ("Temp Room Password"), `webinarPW3` ("Temp Room Password 2"), `webinarPWFreeTrial` ("Free Trial Password") plus `deleteAlertPW`, `allRoomsWelcomeMatPW` and `needPasswordForUserNotes`. The first three are gated `ng-show="authMode=='webinarRoom' || allowPWLoginWithSSO"`; the Free Trial one adds `|| authMode=='unamePW'` AND its `<p>` carries NO `form-control-static` class, unlike every sibling. The last three are ungated. All seven are present in our 269-setting schema — checked by name, not assumed. |
| T2-14 | SSO Setup tab in its own right | `authMode = sso` | **CLOSED 2026-08-13 13:13 EDT** — `page.manageSession.html:641-652`. `<tab heading="SSO Setup ">` (trailing space), gated `ng-show="sess.authMode=='sso'"`, `form-horizontal`, and EXACTLY ONE row: SSO Host, `editable-text="sess.ssoHost"`, `col-sm-4` label / `col-sm-8` field. Ours renders the `sso-setup` section, whose sole member is `ssoHost` labelled "SSO Host" — a match. |
| T2-15 | Text List tab populated | set a Twilio token | OPEN |
| T2-16 | App Pair Link populated shape + pair sample URL | `hasAppPairLink = true` + a `pairSecretKey` | **CLOSED 2026-08-13 13:16 EDT** — `page.manageSession.html:138-152`. `ng-show="sess.hasAppPairLink"`, and the input's value is `https://{{hostname}}/room/` — the bare PREFIX with no id appended, which is what the capture showed and is not a capture artifact. Copy button only; its Edit button is commented out in the source. So the populated shape IS the prefix. |
| T2-17 | Profanity sub-rows (Ignore List, Extra Bad list) | `hasProfanityFilter = true` | **CLOSED 2026-08-13 15:05 EDT — already implemented; the template confirms it and adds two details.** `page.manageSession.html:1880-1897`. Parent is `hasProfanityFilter`; the two sub-rows are BOTH `ng-show="sess.hasProfanityFilter"`. The setting is spelled **`ingnoreBadWordsList`** — the reference's own typo, which our schema keeps, because correcting it would orphan every stored value. Its help reads "Comma separated list OK words to remove from the filter" (also the reference's, missing an "of"), and BOTH sub-row helps are bare `<label>` with NO `class="muted"` and no preceding `<br>` — captured in the schema as `helpShape: "bare"`. Now pinned by `settings-row-gates.test.ts`, which extracts all TEN gated settings from the template and asserts each is handled. |
| T2-18 | `showAdServer` block (Add Server / Remove Server) | click the muted repeater-list label | **CLOSED 2026-08-13 15:05 EDT — fully read; it is an EASTER EGG, and building it needs endpoints we do not have.** `page.manageSession.html:2414-2423`. The reveal is a click on the muted help label under Repeater List: `<label class="muted" ng-click="showAdServer=true;">(Comma separated list op IPs IE: localhost|127.0.0.1,somehostname|10.10.10.10)</label>` — note the reference's "list **op** IPs". Once set, it reveals a `btn-warning` calling `applyRepeaterToAccount()` labelled "Apply  server / repeaters to entire account?" (two spaces after Apply), then an `<hr/>` and two `btn-inverse` pairs: `input#addServerTxt` + `addLiveServer()`, and `input#removeServerTxt` + `removeLiveServer()`. **Not built:** all three handlers are operations against media-relay infrastructure for which this repository holds no endpoint. The `media_relays` SETTING itself is in our schema and editable. Markup recorded in full so it can be built the day the endpoints exist. |
| T2-19 | textAngular editor with real content | `OPEN_EDITOR: true` + a room whose `description` is set | **CLOSED 2026-08-13 13:13 EDT** — `page.manageSession.html:634-636`. `<h3 style="text-align: center; margin-bottom: 20px;">Login Landing Page Editor` with a `pull-right` `btn btn-info` calling `htmlDescChanged()` and carrying `fa-save` + " Save Editor Changes" INSIDE the h3. The editor itself is `<div text-angular="" ng-model="sess.description" name="wysiswyg-editor" class="btn-group-small">` — note the reference's own "wysiswyg" misspelling in the name attribute. |
| T2-20 | bootbox variants beyond the badge prompt | `OPEN_BOOTBOX: true` | OPEN |
| T2-21 | Clone Room / Delete Room / Marketplace header buttons | `canClone` / `isClonedRoom` / `disableMarketplace=false` | **CLOSED 2026-08-13 13:16 EDT** — `page.manageSession.html:10-16`. Clone Room is `ng-show="sess.canClone || sess.isClonedRoom || canCloneClicks"` — THREE conditions, the third being a click-counter unlocked by `ng-dblclick="canCloneDblClick()"` on the room-id span. Delete Room is `ng-show="sess.isClonedRoom"` — clones only. Marketplace is `ng-hide="disableMarketplace"`. All three are `btn btn-sm pull-right … mr`, with `fa-copy`, `fa-trash` and `fa-credit-card`. |
| T2-22 | Login-form rendered geometry + failed-login error state | capture logged OUT | OPEN |
| T2-23 | Sorted-state icon for `sortByUUID()` / `sortByName()` | click a sort header | **CLOSED 2026-08-13 15:00 EDT — there IS no sorted-state icon, and that is the finding.** `page.welcome.html:351-358`: both sortable headers carry a literal `<div class="icon fa fa-sort-alpha-asc"></div>` with **no `ng-class`**, so the glyph never changes — it reads "ascending" whether the table is sorted ascending, descending, or not at all. A `<div>` inside the `<th>`, not an `<i>`. Ours already renders the same static icon, having reasoned it from two captures; the template now proves it rather than inferring it. A rebuild must NOT add a toggling icon. |

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
| T5-5 | `updateUser` code **12** is unused in the template. Does the server accept it? Dead code or an unreachable branch? | **CLOSED 2026-08-13 14:55 EDT.** Code 12 appears NOWHERE in `page.manageSession.html` — not in live markup and not in commented-out markup either, which matters because eight settings keys in the same file exist only in comments. The live sets are `updateUser` [1-11,13,14] and `updateManyUsers` [1-6,10], and our two maps are exactly those. Whether the REFERENCE's server accepts a 12 is unanswerable from any artifact here and is not our server; ours refuses it, because `USER_OPCODES` is the allow-list. Pinned by `opcode-sets-match-template.test.ts`, which also asserts the two enums stay distinct — 10 is "Hide Pers User Data" in one and "Remove All" in the other. |
| T5-6 | `btn-small` (Bootstrap **2** spelling) on the APPROVE button — inert in BS3. Confirm it renders as an unstyled `.btn` and do not "correct" it. | **CLOSED 2026-08-13 12:27 EDT.** Confirmed INERT by reading three stylesheets for the name: absent from `evidence-bootstrap-3.3.7.css` (which DOES carry `.btn-sm` and `.btn-xs`), absent from `TIER1-fetched/styles.css`, absent from `theme.css`. Pinned by `manage-user-row-reference-fields.test.ts` — including the negative control that "correcting" it to `btn-sm` shrinks the button and goes red. |
| T5-7 | ~3,300 lines of `page.manageSession.html` + `page.welcome.html` still unread end to end. Read so far: manageSession 340-634 + 710-769; welcome 360-417 + 1285-1354. **2026-08-13 12:31 EDT: the four SMALL templates are now read END TO END — `page.stats.html` (100), `users.html` (37), `page.recordings.html` (27), `page.avatars.html` (17) = 181 lines, written up as PART 4 of `evidence-dumps-full-read.md`.** The two large ones remain. | **MOSTLY CLOSED 2026-08-13 13:59 EDT.** The four small templates are read END TO END; `page.manageSession.html` is read through :912 plus :634-780. **The settings surface of that file is now proven complete by machine**: `settings-schema-covers-template.test.ts` extracts every live `saveSessField('x')` and `editable-*="sess.x"` from the template — 267 names — and asserts NONE is absent from our 269. The two extras are `description` (the textAngular editor, bound by `ng-model`, so neither spelling catches it) and the documented `roomType` deviation. Eight further names appear ONLY inside commented-out markup and are named individually so a ninth is visible. `page.welcome.html` remains unread below :360. | OPEN — welcome.html only |
| T5-8 | **API keys support `restrictToSessions` and `restrictToEndpoints`** (`page.welcome.html:1339`) — a per-session AND per-endpoint authorisation dimension the 545-line API documentation never mentions. `manageApiKeyRestrictions(k)` drives it. | **CLOSED 2026-08-13 15:12 EDT.** `restrictToEndpoints` was already ours as `scopes`. `restrictToSessions` was NOT, and it is a genuinely different axis: scopes say which COMMANDS a key may call, sessions say which ROOMS it may call them against — a key scoped to `sessions/list` with no room restriction still enumerates every room on the account. Added as `restrictions.sessions`, a list of room SHORT CODES, empty meaning every room (the reference's own sense — its padlock shows when a list is non-empty). The padlock now counts it, matching the reference's gate exactly. Server-side the posted codes are filtered against the ACCOUNT's own rooms, because a key restricted to somebody else's short code is a typo that reads as a restriction. Rows written before the field parse as `[]` and keep working. **Honest gap kept:** `manageApiKeyRestrictions(k)` drives the reference's editor and its shape is in no capture, so the widget follows our own pattern for `ips`/`scopes` — stated in the code, not implied. |
| T5-9 | The API secret is rendered in PLAIN TEXT in the account page table (`page.welcome.html:1341`). Decide whether our rebuild reproduces that or masks it. | **CLOSED 2026-08-13 15:12 EDT — we already match the original, deliberately.** `page.welcome.html:1341` is `<td>{{k.apiSecret}}</td>`, plain text, and ours renders `{key.secret}` with that citation in the component. Owner ruling: the original files are the decision. The two states the reference has no equivalent for — a legacy hash-only row and one encrypted under a retired `API_KEY_ENCRYPTION_KEY` — render distinct honest messages pointing at `regen secret`, rather than a fake masked credential. |
| T5-10 | `s.ownerdID` (`page.welcome.html:368`) — the label reads `ownerID:` but the binding has a stray `d`. It rendered a real value, so the MODEL property is genuinely `ownerdID`. Do not "correct" it. | **CLOSED 2026-08-13 14:55 EDT — confirmed, and it is the reference's bug.** `page.welcome.html:368`: `<div ng-show="showNewRoom"><br /><muted>( {{s._id}} - ownerID: {{s.ownerdID}}</muted> )</div>`. The label reads `ownerID:` and the binding is `s.ownerdID` — a stray `d` — so the value renders EMPTY. Two further details in the same line: `<muted>` is a NON-STANDARD element (it also appears at `page.manageSession.html:46`), and the closing parenthesis sits OUTSIDE `</muted>` while the opening one is inside. The whole line is behind `ng-show="showNewRoom"`, a click-counter reveal — see T5-11 — so it is a debug line, which is why a permanently-empty field was never noticed. NOT reproduced: we do not render this line at all. |
| T5-11 | `showNewRoom>=5` gates the **New Room** button (`page.welcome.html:396`) — a click-counter easter egg, not a permission. Confirm what increments it. | **CLOSED 2026-08-13 15:00 EDT — the whole mechanism is now read, and ours already implements it.** `ng-init="showNewRoom=0;"` on the outer div (`page.welcome.html:328`); the counter is incremented by clicking the word **Sessions** — `<span ng-click="showNewRoom=showNewRoom+1;">Sessions</span>` (:334); **one** click reveals the per-row id/ownerID line (`ng-show="showNewRoom"`, :368) and **five** reveal the New Room button (`ng-show="showNewRoom>=5"`, :396). Ours reproduces the counter and the one-click reveal, and renders New Room ALWAYS — a deliberate owner-decided divergence documented in the component: an account at zero rooms would otherwise have no Manage, no Launch and no visible way back. Ours also renders a REAL `accountId` where the reference's `s.ownerdID` typo (T5-10) leaves the field permanently empty. |
| T5-13 | **FOUR CONDITIONAL ICONS ARE HARDCODED HIDDEN IN OUR USER ROW.** `page.manageSession.html:351-354` shows they interpolate — `{{sess.fileAccessCaseByCase && user.hasFileAccess}}`, `{{sess.ptrMobileAppCaseByCaseEnabled && user.hasMobileApp}}`, `{{!…CaseByCase && user.alerterAppTokens.length >0}}`, `{{!…CaseByCase && user.alerterAppFCMUserOff}}`. The DOM capture showed `ng-show="false"` only because that room had both settings off and no users, and our comment concluded they were dead markup. Needs `hasFileAccess`, `hasMobileApp`, `alerterAppTokens`, `alerterAppFCMUserOff` on the member — schema, loader and render. | **CLOSED 2026-08-13.** All four wired. `alerterAppTokens` was already here as `pushTokensJson`; the loader exposes it as `pushTokenCount` so the raw device tokens are stripped before the payload leaves the server. Each gate is asserted in BOTH states, and the mutual exclusion of the large/small phone is exhausted over all eight flag combinations. `manage-row-actions-render.test.ts` had pinned the OLD wrong belief — that the four are unconditionally present and `hidden` — and was rewritten. |
| T5-14 | `mobilePairCode` exists in our schema (`db/schema.ts:334`) but is not surfaced on the user row. | **CLOSED — the entry was already stale when written.** It IS surfaced: `+page.svelte:1639` renders `{#if member.mobilePairCode}` as a pipe, the mobile glyph and the code, matching `ng-show="showPins && user.mobilePairCode"`. `showPins` occurs exactly twice in the whole template — `ng-init="showPins=true;"` on the table (:334) and the read on the row (:397) — and nothing ever sets it false, so rendering unconditionally is behaviourally identical. Verified 2026-08-13 12:27 EDT by reading every occurrence, not by searching for the name. |
| T5-12 | Stats rows use a per-row `ng-hide="filterOnline && !userStat.isOnline"`, so `table-striped` counts hidden rows — same trap as archived rooms. | **CLOSED 2026-08-13 13:13 EDT — CONFIRMED, and it is the reference's behaviour.** `page.manageSession.html:739`: `<tr ng-repeat="userStat in statXrefs | filter: uSearchStat " ng-hide="filterOnline &amp;&amp; !userStat.isOnline">`. The filter is a per-row `ng-hide`, so hidden rows still occupy `nth-of-type` positions and `table-striped` alternation counts them — turning on "Show Online Users Only" produces visibly irregular banding in the original. Recorded, not corrected. |
| T5-15 | **`openStripeDetails(user)` — what does the Details link open?** The reference ends the Stripe block with an anchor: empty `href`, classes `label label-info`, a `fa-info-circle` icon, the text "Details", `ng-click="openStripeDetails(user)"` (`page.manageSession.html:386-388`). Looked for and NOT found in: `views/page.manageSession.html` (whole file), every DOM capture under `evidence-dumps/`, and the handlers transcribed out of `app.min.js` in `evidence-dumps-full-read.md` — `getStripeStatusClass` and `formatStripeAmount` are there, this is not. **Blocks:** the sixth child of the Stripe block. Deliberately NOT rendered — an anchor with invented contents behind it, or none, is a control whose only effect is its own presence. `manage-user-row-reference-fields.test.ts` asserts its ABSENCE, so it fails and names the work when the evidence arrives. **Needs:** run `apps/controller/scripts/collect-stripe-details.js` in the Chrome console on the live manage page. It reads the handler's own SOURCE off the Angular scope — debug info is on, the captures carry 324 `ng-scope` classes — so it needs NO marketplace member and NO clicks, then follows any `templateUrl` that source names. A rendered block and modal are captured as corroboration if the room happens to have one. Smoke-tested by `collect-stripe-details.smoke.mjs`. | OPEN — SCRIPT READY |
| T5-16 | **The RECORDINGS page is not built in either app.** `views/page.recordings.html`, read end to end 2026-08-13. `LoginCtrl`, container `width: 70%`, a `list-group` of `rec` records: `fa-file-video-o`, `{{rec.created \| date:'MM/dd/yyyy @ h:mma'}}` (the format `formatLastLogin` already implements), `{{(rec.length/60000) \| number:2}} Minutes` (length is MILLISECONDS), a `<video controls width="640">`, and a Download anchor. Empty state is a BARE `<li>No Recordings...</li>` with no `list-group-item` class. Checked `apps/controller` and `apps/room` — neither implements it. **Blocks:** the page. **Needs:** the contract for the endpoint behind `recs` (vidPath, contentType, name, created, length). NOT built: inventing a data source to make a page render is what these rules forbid. | OPEN — NO DATA CONTRACT |
| T5-17 | **The AVATARS page is not built in either app.** `views/page.avatars.html`, read end to end 2026-08-13. `AvatarsCtrl`, `ng-repeat="avatar in avatars"` over `col-md-1` cells, each an `<a class="avatarChooser" ng-click="selectAvatar(avatar)">` around `<img class="thumb80">`. Rules confirmed real in `styles.css`: `.avatarChooser` (a `transition` with NO `:hover` rule anywhere in the file — kept as a finding, not corrected), `.thumb80`, `.thumb40`, `.list-block`. **Needs:** the avatar set behind `avatars` and the endpoint `selectAvatar` posts to. | OPEN — NO DATA CONTRACT |
| T5-18 | **A DEAD CONTROL IN THE REFERENCE.** `page.recordings.html:21` — `<a href="" class="btn btn-default"><i class="fa fa-share"></i> Share</a>`, with no `ng-click`, no `ng-href` and no handler of any kind. It renders and does nothing. This repository forbids shipping a control whose only effect is its own presence, so a faithful rebuild has to choose. **Recommendation: omit it and record why** — the same call already taken for the Stripe Details link (T5-15), for the same reason. | OPEN — DECISION NEEDED |
| T5-19 | **The stats page's period `<select>` is doubly inert, and both halves are the reference's own bugs.** `page.stats.html:31-36` — it has NO `ng-model`, so nothing reads it, AND all four options carry `value="hourly"` (`Hourly`, `Daily`, `Weekly`, `Monthly` all submit `hourly`). Do not "fix" either half when rebuilding. Also on that page: the download endpoint is `/users/v1/sessions/stats/{{sessionID}}/{{tok}}` returning **JSON** named `{{sessionID}}.json`, where ours exports CSV from `account/rooms/[id]/stats.csv` — a different route and a different format. | **CLOSED 2026-08-13 14:55 EDT — recorded, correctly, as the reference's own defect.** The select has no `ng-model` and all four options carry `value="hourly"`. Both halves are pinned by `reference-defects-not-reproduced.test.ts` so neither gets "fixed" if that page is ever built. Nothing further to do until there is a page to build. |
| T5-20 | **Nothing writes `recorded_max_capacity`.** Migration `0011` adds the column and the panel title reads it, but a high-water mark needs LIVE OCCUPANCY and the controller receives no occupancy signal — only the room service knows who is connected. Deliberately NOT faked with the roster size: the number of people who ever registered is not the number ever simultaneously present. **Needs:** the room to report peak concurrent occupancy to the controller. **Blocks:** the "Max" figure, which honestly reads 0 for every room until then. | OPEN — NEEDS A ROOM SIGNAL |
| T5-21 | **"Batch User Invite" is not built.** `page.manageSession.html:178-183` — a menu item gated on `ng-if="sess.authMode === 'unamePW'"`, icon `fa-users`, label "Batch User Invite", `ng-click="doBatchInvite()"`, FIRST in the User List Actions menu and followed by a divider gated on the same condition. The item, its icon, its position and its gate are all captured; **the prompt it opens is not** — `doBatchInvite` is in no template and no capture. Our `inviteRoomUser()` already provides the underlying capability, so the only missing piece is the input widget's shape. `scripts/collect-stripe-details.js` now reads `doBatchInvite` off the scope alongside the Stripe handlers, so one console run captures it. | OPEN — SCRIPT READY |
| T5-22 | **The User Stats table renders MEMBER rows where the reference renders ARRIVAL rows** — DECISION NEEDED. `page.manageSession.html:739-754` shows five cells per row: `{{$index}}`; avatar + userName + TRIAL badge; email + phone + `IP: <a href="http://ip-api.com/#{{userStat.ip}}" target="_blank">{{userStat.ip}} (lookup)</a>` + a mobile/desktop icon + `{{userStat.browser}}`; `In:` / `Out` stamps; and `{{userStat.duration / 3600 \| number: 2}}`. Ours renders one row per PERSON with an em dash for Duration and no IP, browser or Out time. **We hold the data** — `roomSessions` carries `ip`, `browser`, `isMobile`, `joinedAt`, `leftAt`. It was deliberately REMOVED from this payload after two reviews on 2026-08-11: 5,000 rows each carrying a visitor's IP address and email travelling in the page HTML, `TODO.md` item W, which is why the export moved to `GET .../stats.csv`. Rendering the reference's row puts those addresses back into a page payload. **Not done unilaterally** — it partially reverses a reviewed privacy decision, and that is the owner's call. A tab-gated, bounded re-add would match the reference and keep IPs off every other tab. | **CLOSED 2026-08-13 13:42 EDT — owner ruled: match the original.** The table now renders `data.visits` (`room_sessions`), one row per ARRIVAL, with all five reference cells: zero-based `$index`; avatar + name + TRIAL badge (LEFT-joined from `room_users`, since a visit is not a membership and a guest has none); email + `IP: <a href="http://ip-api.com/#…">… (lookup)</a>` + a mobile/desktop glyph + browser; `In:` / `Out` in `MM/dd/yyyy @ h:mma`; and duration in hours to two decimals. Out and Duration are EMPTY for an open visit, as `ng-hide="userStat.isOnline"` gives. The online filter HIDES rows rather than removing them (T5-12), so the striping artifact is reproduced. The item-W shape survives: Stats tab only, capped at 5,000, newest first, and `stats.csv` still reads uncapped at request time. |
| T5-23 | **A REAL DEFECT IN THE REFERENCE, deliberately not reproduced.** `page.manageSession.html:854` — the Logout Webhook row is `onaftersave="saveSessField('logout_webhook_url')" editable-textarea="sess.login_webhook_url"` and displays `{{sess.logout_webhook_url}}`. Three references to a webhook field and one is the wrong one: the editor binds and shows the LOGIN webhook, while the label, the display and the save target all say logout. An owner who opens the row to check it and saves without editing has copied their login webhook over their logout webhook. Cannot occur here — every settings row renders `<Editable {def} value={settingValue(def.name)}>` in a loop, so label, value and save target are one identifier. Pinned by `reference-defects-not-reproduced.test.ts`, which also asserts the defect is still IN the evidence so the citation cannot rot. | **CLOSED — recorded, not carried** |
| T5-24 | **The WordPress shortcode renders the JWT secret in plain text on screen.** `page.manageSession.html:781-782` — `[protradingroom room='{{sess._id}}' key='{{sess.ssoJWTSecret}}' …]`, and it is UNGATED, unlike the JWT rows above it which are `ng-show="sess.authMode=='jwt'"`. So a room using any auth mode displays its signing secret to anyone who can see the Settings tab. Same family as T5-9 (the API secret in plain text) and needs the same decision. | OPEN — DECISION NEEDED |
| T5-25 | **The app-pair SAMPLE URL block is not rendered at all.** `page.manageSession.html:1138-1142`, gated `ng-show="sess.hasAppPairLink && sess.pairSecretKey"`: a `<label>` reading "Sample link you would need to use to add each user: (replace email/name with the real user email/name" — the reference's own unclosed parenthesis — above a readonly `input#pairURLLink` whose value is `https://chat.protradingroom.com/ptr_app/sessions/v2/addUser/{{sess._id}}/?sec={{sess.pairSecretKey}}&email=__userEmail__&name=__userName__`. Checked for `pairURLLink`, `Sample link`, `ptr_app/sessions`, `pairSecretKey` and `addUser` in our page: none present. **Same decision family as T5-24** — the URL embeds the room's pairing secret in displayed, copyable text, so it is recorded rather than built. The `pairSecretKey` SETTING itself is already in our schema and editable; what is missing is this derived sample link. | OPEN — DECISION NEEDED (same as T5-24) |

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
