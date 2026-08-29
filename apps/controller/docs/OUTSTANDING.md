# Outstanding work

Status: **normative backlog**
Last measured: 2026-08-07

Everything known to be missing, incomplete, or deliberately deferred, with the evidence for each.
This is the single authority for "what is left"; anything not here is either done or not yet known,
and finding a third case means this file is wrong and should be corrected in the same change.

Rules for this file, so it stays worth reading:

- Every entry cites where the claim comes from — a file and line, a measurement, or a capture. An
  item with no evidence is a guess and does not belong here.
- "Deferred" and "unknown" are different. Deferred means we decided; unknown means nobody has
  looked. They are separated below on purpose.
- An item moves out only when something proves it: a passing gate, a runtime measurement, or a
  screenshot. Not when it compiles.

---

## 1. Blocking the product working end to end

These are the difference between a working front door and a working product. Nothing in section 2
or later matters to a customer until these are done.

| #   | What                                                                                                                                                                                             | Evidence                                                                                                                                        | Unblocked by          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1.1 | **The room is not deployed anywhere.** `ROOM_BASE_URL` is unset in production, so `launch/[id]` takes its same-origin fallback and lands on the controller's own guest page instead of the room. | `src/routes/(app)/launch/[id]/+server.ts:32`; `vercel env ls production` shows no `ROOM_BASE_URL`                                               | a host for the room   |
| 1.2 | **No host for the room.** Its SSE hub is module state in one process, so serverless cannot hold it. Decision recorded: one Hetzner box, Ashburn. Not provisioned.                                | `src/lib/server/room-events.ts` module-scoped `subscribers`; the original does the same — `chat.protradingroom.com` is a persistent Express box | owner provisions it   |
| 1.3 | **Shared secrets not on the room side.** `ROOM_JWT_SECRET` (handoff) and the config-read HMAC must match on both sides. Set on Vercel; the room has no deployment to set them on.                | `src/lib/server/room-handoff.ts`                                                                                                                | 1.2                   |
| 1.4 | **Rust API not deployed.** `services/api` has 30 room-runtime routes, written and tested, never deployed, and the room has never called it. Room data still lives in the room's own store.       | `services/api/src/http/v1/`; `docs/CUTOVER-ROOM-TO-API.md`                                                                                      | 1.2, then the cutover |

## 1b. Found by testing the live site, 2026-08-07

Not theoretical. Each was hit on `https://www.tradingroom.app` within minutes of the first real
registration.

| #        | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Evidence                                                                                                        | Severity                         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| ~~1b.1~~ | **FIXED 2026-08-07.** reCAPTCHA is now verified server-side against `siteverify`, failing closed on every unhappy path, with a half-configured key pair refused at startup. 13 tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `src/lib/server/recaptcha.ts`; `recaptcha.test.ts`                                                              | resolved                         |
| ~~1b.2~~ | **FIXED 2026-08-07.** Real keys set on production; preview and development use Google's always-pass test pair, because v2 keys are domain-locked to `www.tradingroom.app`. Verified: secret absent from all 69 client bundle files.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | live `curl` of `/register`                                                                                      | resolved                         |
| 1b.3     | **There is no password change or reset flow.** "Forgot your password?" links to `/contact`, and the contact action explicitly does not deliver — there is no mail transport. A user who needs to rotate a credential cannot.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `src/routes/(public)/login/+page.svelte:84`; `src/routes/(public)/contact/+page.server.ts` logs "NOT delivered" | **HIGH — blocks real customers** |
| 1b.4     | **Mail transport BUILT 2026-08-08, and unconfigured.** `src/lib/server/mail.ts` is a Resend adapter behind one `sendMail` seam; email verification is wired end to end on top of it (migration 1, `email-verification.ts`, `/verify-email`, a Resend-the-link action, and a gate on room creation). It sends nothing today because `RESEND_API_KEY` and `MAIL_FROM` are unset, and `verificationEnforced()` is false in that state by design — enforcing a check that cannot be delivered is a lockout. **Blocked on three things only the owner can do: a provider account, a sending domain with DKIM/SPF, and a real mailbox.** The provider is OUR decision, not a match: no browser capture can reach the reference's server-side sender. | `src/lib/server/mail.ts`; `src/lib/server/email-verification.ts`; `.env.example`                                | **HIGH — blocked on the owner**  |
| 1b.5     | **"Create Room" is hidden behind five clicks on the word "Sessions".** This is FAITHFUL — the reference does exactly this (`ng-show="showNewRoom>=5"`) — but a paying customer who registers and cannot find how to create a room will conclude the product is broken. It happened to the owner on first use.                                                                                                                                                                                                                                                                                                                                                                                                                                  | `evidence-dumps/login-page/login:427` and `:464`                                                                | product decision                 |

## 1c. Two tenant models that do not map to each other — investigated 2026-08-07

Blocks the Rust cutover (1.4). Not a naming quibble: there is no function anywhere that turns one
key into the other.

|           | Controller                             | Rust API                         |
| --------- | -------------------------------------- | -------------------------------- |
| Table     | `accounts`                             | `enterprises`                    |
| Key       | `INTEGER` identity                     | `uuid`                           |
| Fields    | `name`, `owner_email`                  | `name`, `slug`, `settings jsonb` |
| Isolation | application-level (`requireOwnedRoom`) | PostgreSQL RLS on every table    |

`grep -rn enterprise src/` in the controller returns **nothing**. `grep -rn accounts` in
`services/api/src` returns four hits, all ordinary English inside comments. Today's
`accounts.id = 1` has no `enterprise_id` and nothing can produce one.

### Where `enterprises` came from — and where it did NOT

**The original application has no enterprise concept.** Measured across every source available:

- **1 occurrence** of the string in 2.9 MB of shipped bundle (`main.4a89421aa54e157c.js`), and it is
  a keyword on the 🏦 Bank emoji: `keywords:["bank","building","money","sales","cash","business","enterprise"]`.
- **0 occurrences** across every file in `evidence-dumps/`.
- The original's tenancy key is **`ownerID`**, a MongoDB ObjectId:
  `( 6a6529b318781e20ed81947d - ownerID: 6a6529b318781e20ed81947c )` in
  `evidence-dumps/login-page/logged-in-page`. Room `_id` and `ownerID` are sequential ObjectIds. Its
  model is `owner → sessions`, with no tenant table at all.

`enterprises` is this project's own invention. `0001_baseline.sql` contains
`CREATE TABLE drizzle.__drizzle_migrations`, so that baseline was dumped from a **Drizzle-managed
database** and frozen as the Rust starting point — a TypeScript-designed schema, not anything
derived from PTR, which is MongoDB and has never had a Drizzle ledger.

### What it is, precisely

Designed as a **real multi-tenant key**, not the app owner: every table's RLS policy enforces
`enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid`, and `provision.rs`
states the reasoning — _"Creating the first enterprise is not something the restricted runtime role
can do — by design, since a tenant that can create tenants is not isolated."_

But **only one is ever created**. The same file opens _"Provisioning the first tenant. One
enterprise, one room, one owner."_ Nothing creates a second, which is exactly why it reads as the
app owner's rather than a customer's.

### The decision this forces

One of these, taken deliberately rather than discovered during the cutover:

1. `enterprises` becomes the single tenant table and the controller's `accounts` is migrated onto
   it — UUID keys, RLS, one model. Largest change, correct destination.
2. `accounts` stays authoritative and the Rust API grows an `account_id`, with `enterprises`
   retired. Smaller, but discards the RLS isolation already built and tested.
3. A mapping table bridges them. Cheapest now and the worst of the three — two sources of truth for
   "who owns this", which is the exact defect class §3 of the seam audit was written about.

Recommendation is 1, precisely because the RLS in `0005`/`0006`/`0008` is real, tested isolation
that the controller does not have and would otherwise have to be rebuilt.

## 1d. Forensic read of `ptr1.json` — the Manage Room page, 2026-08-07

### What was read, and how

`~/Desktop/pro-trading-room-website/ptr1.json`, 23.5 MB, single-line minified, decoded locally and
read **line by line — not searched**. Header `{part:1, caps:[23]}`; `caps[22].__meta__` records
`capturedAt 2026-07-24T15:59:21.704Z`, `url https://protradingroom.com/ptrApp#/page/manageSession/6a628a99731b9f77ae9bf505`,
`role "member"`, `errors []`, viewport 1842×1265 @ dpr 2.

All 23 captures were read in full. Every one reports `truncated: false`, so nothing was sampled:

| Capture                                                            | Nodes | What it is                                          |
| ------------------------------------------------------------------ | ----- | --------------------------------------------------- |
| `[0] baseline-room`                                                | 2156  | the whole `<body>` of the Manage page               |
| `[1] modal:permissionsModal`                                       | 22    | the granular-permission modal                       |
| `[2] dropdown`                                                     | 28    | **User List Actions** (list filters + bulk deletes) |
| `[3] dropdown`                                                     | 33    | **Actions With Selected** (bulk `updateManyUsers`)  |
| `[4] [9] [14] dropdown-menu-right`                                 | 128   | the per-row **Actions** gear, one per user row      |
| `[5] [10] [15] dropdown`                                           | 28    | its **Permissions** submenu                         |
| `[6] [11] [16] dropdown`                                           | 30    | its **Granular Perms** submenu                      |
| `[7] [12] [17] dropdown`                                           | 31    | its **App and Notifications** submenu               |
| `[8] [13] [18] dropdown`                                           | 1     | its **Badges** submenu — **rendered empty**         |
| `[19] forced-darkTheme` `[20] forced-lightTheme` `[21] final-room` | 2156  | re-captures of `[0]`                                |

The three per-row gear captures are byte-identical except one line each, which is itself the
evidence for the presenter gate (below). `[21] final-room` is byte-identical to `[0]`.

**PII, stated plainly.** `caps[0]` node `r.0.1.1.0.0.0.3` carries the Launch `jwtSite` token, whose
payload contains the owner's real name and email in clear base64url, plus the live reCAPTCHA **site**
key `6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx` and two gravatar hashes of real addresses. I decoded
it redacted; none of it is copied into either repository, and the decoded slices live in `/tmp` only.

### 1d.1 The role model was right; the plan file's version of it is wrong

Two separate numeric domains exist and they are not the same domain. Reading only the menus would
have merged them.

**Stored `user.role` — the display badge, `caps[0]` nodes `r.0.1.1.0.1.3.1.0.0.3.1.<row>.3.1`
through `.7`, read verbatim from all three rendered rows:**

| Test                                 | Renders       |
| ------------------------------------ | ------------- |
| `user.role==0`                       | `Owner`       |
| `user.role==1 && !user.nonPresenter` | `Presenter`   |
| `user.role==1 && user.nonPresenter`  | `Admin`       |
| `user.role==2`                       | `Participant` |
| `user.role==3`                       | `CHAT MUTED`  |
| `user.role==4`                       | `BANNED`      |

There is **no `role==5` and no `role==6` anywhere in 2156 nodes.** Trial is not a role: it is
`user.isFreeTrial`, rendered by its own independent span (`TRIAL`, `badge badge-danger-chat`) in the
Name/Email cell, which is unconditional on role.

**Action opcodes — `updateUser(N, user._id, user.userName, $index)`:**

| N   | Label                    | N   | Label                     |
| --- | ------------------------ | --- | ------------------------- |
| 1   | Make Presenter           | 8   | Show User Count           |
| 2   | Make Participant / Unban | 9   | Freshen Login Date        |
| 3   | MUTE Participant         | 10  | Hide Pers User Data       |
| 4   | BAN                      | 11  | Don't Hide Pers User Data |
| 5   | **Make Admin**           | 13  | Deny Archives Access      |
| 6   | **Make Trial**           | 14  | Allow Archives Access     |

**Opcode 5 writes `role=1, nonPresenter=true`. Opcode 6 sets `isFreeTrial`.** Neither is a role
value. Opcode 12 never appears — honest gap, see 1d.9.

> **Correction to make before Phase 4 runs.** The plan at
> `~/.claude/plans/breezy-painting-wombat.md` says to map `0 owner · 1 presenter · 2 participant ·
5 admin · 6 trial`. That mistakes the opcode table for the role domain. Implementing it would
> store `role=5` and `role=6`, which the reference's own badge markup cannot render — every such
> user would display as a blank role. The correct mapping is the six-row table above, with trial as
> a flag. Our `room_users.is_free_trial` and `src/lib/room-member-role.ts`
> (`isRoomPresenter = role === 1 && !nonPresenter`) are already right and need no change.

`updateManyUsers(N)` shares the opcodes **except for 10**: per-row `10` is "Hide Pers User Data",
bulk `10` is **"Remove All"**. Same number, destructive divergence. Bulk adds
`updateManyUsersBadgePrompt('add'|'remove')`.

### 1d.2 The permission model, confirmed exactly

`caps[1]`, all 22 nodes. Five checkboxes, each with its own `ng-change`, one `saveUserPermissions()`:

`userPermissions.hasMic` · `hasScreen` · `hasCam` · `hasAdminChat` · `canEditNotes` — labelled
Microphone, Screenshare, WebCam, AdminChat, CanEditNotes. This is `PERMISSION_KEYS` in
`src/lib/server/rooms.ts:66`, same five, same order. No sixth key exists.

**One reference constraint we deliberately do NOT implement.** The menu item that opens this modal
is gated `ng-show="user.role !== 1"` (`caps[6]` node `r.0`). Captures `[6]`/`[11]` render it
visible; `[16]` renders it `ng-hide` — that row is the `Admin` row, `role==1, nonPresenter`. So in
the reference, **granular permissions cannot be adjusted for role 1 in either shape**, Presenter or
Admin; both implicitly hold all five.

> **Owner's decision, 2026-08-07: keep ours loose.** Our menu offers the modal for every non-owner
> row, role 1 included, so a Presenter's five permissions can be narrowed individually. This is an
> intentional divergence, not an oversight — do not "fix" it to match the reference. Everything else
> in §1d is matched.

### 1d.3 `logout_webhook_url` was missing from our generated schema — FIXED 2026-08-07

`caps[0]` node `r.0.1.1.0.1.3.1.5.0.0.<n>`, read in place:

```
<label>  "Logout Webhook URL"
<a> onaftersave="saveSessField('logout_webhook_url')"
    editable-textarea="sess.login_webhook_url"      ← binds the LOGIN field
```

The reference's own markup saves to `logout_webhook_url` while editing `login_webhook_url`. That is
a bug in PTR, and it propagated: `scripts/…/schema:extract` keys off the `editable-*` model, saw
`login_webhook_url` twice, and emitted it once. Independent count of `saveSessField('…')` in this
capture is **267 distinct names**; `ROOM_SETTINGS` has 268 entries. Set difference:

- only in `ptr1.json` — **`logout_webhook_url`**
- only in the schema — `roomType` (documented product deviation) and `description` (the branding
  WYSIWYG, `text-angular ng-model="sess.description"`, which has no `onaftersave` and so is
  correctly absent from a `saveSessField` count)

Every one of the 266 shared names agrees on control type — 0 disagreements. So the extraction was
sound and this was a single, specific hole.

**Fixed.** `scripts/outline.mjs` now keeps `onaftersave` (it kept `onbeforesave` and not
`onaftersave`, which is why no earlier pass could see the disagreement), and
`scripts/extract-manage-schema.mjs` keys the setting name off `onaftersave` — the field the
reference actually writes — instead of the `editable-*` binding. The three `EXPECTED_*_COUNT` pins
turned this into a build failure rather than a quiet extra row, which is what they are for.
`ROOM_SETTINGS` is now **268 extracted + 1 reviewed deviation = 269**, verified byte-for-byte by
`pnpm schema:verify`. **We do not replicate the crossed binding:** our editor edits the field it
saves. The same defect and its two predecessors are written up in `docs/PROCESS.md` §5.

### 1d.4 The Launch handoff JWT is minted for 360 days

`caps[0]` node `r.0.1.1.0.0.0.3` — `ng-href="/session?id=3625&jwtSite=…"`, header
`{"alg":"HS256","typ":"JWT"}`, payload `{name, email, id, type:"site", issued, iat:1784840082,
exp:1815944082}`. `exp − iat = 31,104,000 s = **360.0 days**`.

Ours is 60 seconds (`src/routes/(app)/launch/[id]/+server.ts`) plus a `jti` replay guard. The
reference has neither. **Keep ours.** A 360-day bearer token sitting in an `href` and in
`target="_blank"` history is a credential leak, and the token is the whole authentication. Recording
the divergence so nobody "restores fidelity" later: this is a deliberate, safety-motivated
deviation, not an omission.

### 1d.5 The theme classes do nothing on this page

`caps[19]` and `caps[20]` differ from `caps[0]` by exactly one line — `class="footer-hidden"`
becomes `footer-hidden darkTheme` / `footer-hidden lightTheme` on `<body>`. Comparing all **95
captured computed-style properties across all 2156 nodes: 0 nodes differ** in either capture.

The Manage page is theme-invariant; `darkTheme`/`lightTheme` are room-side only. No controller
theming work is implied by these two captures, and any future dark-mode task must get its evidence
from a room capture instead.

### 1d.6 Room identity, links and auth surface

From the panel heading and the Room Link block, all `caps[0]`:

- Title `Manage Room id: 3625 ( 6a628a99731b9f77ae9bf505 )` — a short numeric code **and** a Mongo
  ObjectId, which is the `shortCode` / `publicId` pair we already carry.
- `Current : 0 / Max 0` with a `resetMaxCount()` button — a concurrent/peak counter per room. **We
  have neither.**
- Four distinct entry URLs: `/u/<objectId>` (Room Link), `/room/[yournamehere]` (Vanity,
  `setCustomRoomURL()`), `/room/[youruniquelinkhere]` (Unique, `setUniqueRoomURL()` — generated, not
  typed), `/r/<objectId>` (Registration, shown only for `authMode` `registrationA`/`registrationM`).
  We implement one.
- `authMode` values reachable from the `ng-show` guards read across the page: `open`, `webinarRoom`,
  `unamePW`, `registrationA`, `registrationM`, `sso`, `jwt`, plus the orthogonal
  `allowPWLoginWithSSO`. The captured room is `open`.
- `Clone Room` / `Delete Room` / `Marketplace` exist and are all `ng-hide` for this room
  (`sess.canClone`, `sess.isClonedRoom`, `disableMarketplace`). Cloning is a real feature we do not
  have.
- Six tabs: Users · Text List (`ng-show="sess.twillioApiToken"`) · Branding (Logo / Landing Page) ·
  SSO Setup (`ng-show="sess.authMode=='sso'"`) · User Stats · Settings.

### 1d.7 Per-member state the reference stores and we do not

Read off the rendered `<tr ng-repeat="user in xrefs">` cells — every one of these is a real field on
the membership row, distinct from the five permissions:

`isFreeTrial` · `denyArchivesAccess` · `hideUserCount` · `hidePersInfo` · `restrictPMUser` ·
`inactive` · `note` (free text, `setNoteUser`) · `inviteStatus` (`pending` → `APPROVE` button) ·
`mobilePairCode` · `phone` · `pw` ("PW set") · `alerterAppTokens` · `discordUserId` · `nonPresenter`
· a login-source string rendered after the role (observed values `login` and `manual`).

**Correction to this entry's first draft.** It claimed eleven of these "do not exist on either side
of our seam". That was wrong: `room_users` already carried `is_free_trial`, `deny_archives_access`,
`hide_user_count`, `hide_pers_info`, `restrict_pm_user`, `inactive`, `note`, `has_password`,
`mobile_pair_code`, `push_tokens_json` / `notifications_state` and `non_presenter`. Three were
genuinely absent, and all three were added on 2026-08-07:

| Field           | Status                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `inviteStatus`  | **Built.** `room_users.invite_status`, `'approved'`/`'pending'`, with the row's APPROVE button and the menu's "Pause / Pending" |
| `discordUserId` | **Column + row render built. No writer** — the Discord integration behind `enableDiscord` is unbuilt                            |
| `phone`         | **Column + row render built. No writer** — collected and validated at room login, then discarded until guest-join lands (§1.1)  |

The two without writers are honest-pending, not wired: each renders only when its column is set, and
nothing sets it. They are listed again in §5 so the gap is not lost.

Still absent: the **login-source string** rendered after the role (`login`, `manual`) — its binding
expression is not in the capture, so there is nothing to implement against. See §1d.9.

The owner row is special and enforced in two places: the select-checkbox is `ng-show="user.role!==0"`
and the whole Actions gear is `ng-hide="user.role==0"`. Both were **already** implemented here, and
`applyManyOpcode` skipped role 0 server-side; the first draft of this entry was wrong to say
otherwise.

### 1d.8 Bulk actions can cross rooms — BUILT 2026-08-07

`caps[0]`: alongside "Select All" sits a second checkbox, `ng-model="applyToAllRooms"`,
`ng-change="toggleApplyToAllRooms()"`, labelled **"Apply to all rooms?"**. Every
`updateManyUsers(N)` — including `10 = Remove All` and `4 = BAN` — can therefore be applied across
the owner's entire estate in one click. It is not a per-room operation in the reference.

Both it and **"Select All"** (`getCheckedAllUserIds()`), which was also missing, are now built:

- `resolveBulkTargets()` in `src/lib/server/rooms.ts` expands the selection by **`user_id`, not
  `room_user_id`** — the selection names people, whose membership row differs per room.
- The account is read from the room being managed, never from the form, so the expansion cannot
  reach another tenant's rooms.
- **Role 0 is excluded in every room, not just the managed one.** Somebody who is a participant here
  and the owner of another room must not be removed there. This is the sharpest edge in the feature.
- It scopes **both** bulk menus — opcodes and badges — because the checkbox sits one level above
  both in `.users-many-actions`.
- The confirmation names the wider blast radius ("… in EVERY room on this account") before anything
  destructive runs.

CSS for the two checkboxes is transcribed from computed values on `caps[0]` node
`r.0.1.1.0.1.3.1.0.0.2.0` and its labels, spans and inputs — including the absolutely positioned
input at `margin-left: -20px` inside the label's 20px of padding — rather than Bootstrap recalled
from memory.

### 1d.9 Honest gaps — present in the capture, not answered by it

1. **Opcode 12 is never rendered.** 1–11, 13, 14 appear; 12 does not. Whether it is retired or lives
   on a surface this capture never opened is unknown. Looked in: all 23 captures of `ptr1.json`.
2. **The Badges submenu rendered empty** — `caps[8]`/`[13]`/`[18]` are a bare `<ul>` with one node.
   `sess.enableBadges` is `No` for this room, so the `ng-repeat` had nothing to fill. The badge
   _shape_ is known only from `ptr2.json` (`badges.roles`, "Auto assign this badge to this WP
   roles"). The in-room badge menu itself is uncaptured.
3. **The login-source string after the role** (`login`, `manual`) is rendered by an `ng-binding` with
   no expression in the attribute set, so the field name behind it is not in this evidence.
4. **`sessAuthTypes`** is referenced by `e-ng-options="s.value as s.text for s in sessAuthTypes"`;
   its option list is controller-side JS, never rendered. **Corrected in §1g:** the seven mode
   _values_ are proven, because the guards compare against the exact string literals. What is still
   unobserved is only each mode's human-readable _label_ in the dropdown, and one of those is known
   ("Open - Anyone with the room link can join with their email & name").
5. **Row 0 of the user table renders an empty Name/Email cell** and a `gravatar-src-once` with no
   resolved `src`, while showing `Owner`. Whether the owner membership genuinely carries no
   userName/email, or the binding failed, is not decidable from a DOM capture alone.

None of the five was filled in with a plausible value.

## 1e. Forensic read of `ptr2.json` — the account + login page, 2026-08-07

### What was read

`~/Desktop/pro-trading-room-website/ptr2.json`, 9.4 MB, decoded locally and read line by line.
`caps[4].__meta__`: `capturedAt 2026-07-24T15:59:42.449Z`, `url …/ptrApp#/page/welcome`, `role
"member"`, `errors []`, same viewport as `ptr1`.

Five captures, all `truncated:false`: `baseline-room` (882 nodes), `forced-darkTheme`,
`forced-lightTheme`, `final-room`. Measured across all 882 nodes and all 95 computed style
properties: **dark and light differ from baseline by exactly one attribute** — the `<body>` class —
**and zero styles**; `final-room` differs by nothing at all. Identical result to `ptr1` §1d.5, from
an independent page, so the finding is now confirmed twice: **the theme classes are room-side only.**

Nodes 99–753 of the decoded tree are the third-party **Intercom emoji picker**, reached from the
badge editor's `#emoji-picker` button. Verified as a contiguous block rather than assumed: the first
line at or after 99 that does not contain `intercom` is 754. It is not PTR markup and nothing is
built from it.

Same PII caution as `ptr1`: the Launch `jwtSite` token appears here too — byte-identical to the one
in `ptr1` `caps[0]` — carrying the owner's real name and email, plus the live reCAPTCHA site key.
Decoded slices stayed in `/tmp`.

### 1e.1 What this page confirms, independently

- **The reCAPTCHA threshold.** `ng-show="failedLoginCount >= 3"` wraps the widget. Our
  `login-attempts.ts` uses the same threshold; this is now proven from a second capture.
- **`#/page/forgot-password` exists** — `ui-sref="page.forgot-password"`, "Forgot your password?".
  Ours links to `/contact` instead, because there is no mail transport (§1b.3/§1b.4).
- **The Launch token is rendered into the DOM at page load here too**, in the sessions table's
  Actions cell, `target="_blank"`. Both surfaces embed it; neither mints on click. This is the
  evidence behind Phase 2 of the matching plan.
- **The 5-click reveal is wider than we implemented.** `ng-click="showNewRoom=showNewRoom+1"` on the
  word "Sessions" gates the New Room button at `>=5`, but `ng-show="showNewRoom"` **also** reveals a
  per-row line `( <_id> - ownerID: <ownerID> )` at the very first click. Two thresholds, one counter.
- **Registration is off at the build level.** The inline bootstrap script sets `var __isReg =
'false'`, and no register form exists anywhere in the capture — despite the login inputs binding
  `signup.email` / `signup.pass`.
- **The two API-doc links are different documents.** Account page → `API_Documentation.md`; manage
  page → `POST_ROUTE_API_DOCUMENTATION.md`.

### 1e.2 Gaps found — three buildable, one blocked

| #    | What                                                                                                                                                                                                                                                                                                      | Status                           |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 1e.a | ~~The sessions table does not sort.~~ **FIXED.** The reference's headers carry `ng-click="sortByUUID()"`/`sortByName()`; ours rendered the `fa-sort-alpha-asc` icon on both and wired neither. Now sorted, numeric-aware, with keyboard access the reference lacks.                                       | resolved                         |
| 1e.b | ~~`showBadgeID` is missing.~~ **FIXED.** `ondblclick` on the Badges "Badge" header reveals each badge id, the same idiom as `canCloneDblClick`.                                                                                                                                                           | resolved                         |
| 1e.c | ~~The `showNewRoom` first-click reveal~~ — **already built** in `account/+page.svelte`. Recorded only because the first gap list was derived from a search instead of from reading the page; reading it corrected this.                                                                                   | not a gap                        |
| 1e.d | **Extra Admin Users have a permission model we cannot see.** Cancel resets `adminUser={name:'',email:'',password:'',perms:{}}` — so `perms` exists — but the add form renders only Name, Email, Password, and the list is empty ("No admin users added yet"), so **no permission control ever rendered**. | **honest gap — needs a capture** |

1e.a was the serious one by category, not size: an icon that says a column sorts, on a column that
does not sort. That is the exact defect class `CLAUDE.md` names ("a control whose only effect is
changing its own label").

1e.d cannot be closed from this evidence and must not be guessed. It needs a capture of the account
page with at least one admin user present. Added to the Phase 1 collector's target list.

## 1f. The handoff token, matched to the reference — 2026-08-07

Owner instruction: match the reference exactly on hard evidence, test, then improve. This is the
first thing matched, and it deliberately removes two defences. They are listed here so restoring
them is a decision somebody makes, not a discovery somebody stumbles into.

**Evidence:** `ptr1.json` `caps[0]` node `r.0.1.1.0.0.0.3`, byte-identical in `ptr2.json`'s sessions
table. Payload `{ name, email, id, type:"site", issued, iat, exp }`, HS256,
`exp - iat = 31,104,000 = 360.0 days`, no `jti`.

| Was                                    | Now                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `{ name, email, id, type, jti, exp }`  | `{ name, email, id, type, issued, iat, exp }`, in the reference's key order |
| `exp = iat + 60`                       | `exp = iat + 31_104_000`                                                    |
| minted per click behind `/launch/[id]` | minted at page load, in the anchor's `href`, on both surfaces               |
| single-use, redeemed by the room       | re-usable, like the reference                                               |

Changed together across both repositories, because mint and verify must agree or the handoff simply
breaks: `new-room-control/src/lib/server/room-handoff.ts` (plus the new `launchHref`, used by the
account list and the manage page) and `new-room/src/lib/server/handoff-token.ts`,
`new-room/src/routes/session/+server.ts`.

**Deliberately given up — restore in the improvement phase:**

1. **Single use.** `handoff-redemption.ts` and its test were removed with `git rm`, recoverable,
   because with no `jti` there was nothing left to key on. The `spent_handoffs` table is kept:
   migrations are forward-only and an empty table costs nothing.
2. **Short life.** A Launch URL is now a working room credential for a year, sitting in the page
   `href`, in browser history and in referrer headers.

Note that (1) was not purely a loss. Single use was also a **behaviour difference**: a user whose
room failed to load could not retry, because their token was already spent. Refresh works again.

## 1g. The reference's conditional logic, extracted whole — 2026-08-07

**This entry exists because a previous claim in this file was wrong.** §1d.9 said the seven auth
modes were "inferred from `ng-show` guards, which is weaker evidence than an option list", and the
matching plan then made a live capture a prerequisite for building the entry layer. Both were
mistaken. A guard is not a hint about the logic — **it is the logic**, written by the reference, and
the captures contain all of it. Angular keeps `ng-show`/`ng-hide` elements in the DOM; only `ng-if`
removes them. The branches were coded not to show, not absent.

Extracted from every node of both files: **698 guarded nodes, 84 distinct expressions**, read in
full. The counts are per-node across all captures (the manage page is captured four times, so a
single guard shows as 4x or 12x).

### The `authMode` map — proven, not inferred

These are the exact string literals the reference compares against, so the mode set is complete:

| Guard, verbatim                                                                            | What it gates                                           |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `sess.authMode=='jwt'`                                                                     | `ssoJWTSecret`, `allowPWLoginWithSSO`, `tokenExpiresIn` |
| `sess.authMode=='webinarRoom' \|\| sess.allowPWLoginWithSSO`                               | `webinarPW`, `webinarPW2`, `webinarPW3`                 |
| `sess.authMode=='webinarRoom' \|\| sess.authMode=='unamePW' \|\| sess.allowPWLoginWithSSO` | `webinarPWFreeTrial`                                    |
| `sess.authMode=='registrationA' \|\| sess.authMode=='registrationM'`                       | registration link, event time, email preview            |
| `sess.authMode=='webinarRoom' \|\| 'open' \|\| 'unamePW' \|\| sess.allowPWLoginWithSSO`    | Room Link, Vanity Link, Unique Link                     |
| `sess.authMode=='sso'`                                                                     | the SSO Setup tab                                       |
| `sess.roomType=='webinar'`                                                                 | the Date row (roomType, not authMode)                   |

**Seven modes:** `open`, `webinarRoom`, `unamePW`, `registrationA`, `registrationM`, `sso`, `jwt`.
`allowPWLoginWithSSO` is orthogonal and widens three of them.

**Ungated, so they apply in every mode** — read off the rows that carry no `ng-show` at all:
`secTok`, `invalidTokens`, `enableTokenBadges`, `remToken`, `customJWTErrorMessage`,
`allowedMemberships`, `allowedProducts`, `allowedPerms`, `banIPList`, `isLocked`,
`disalowMultiLogins`, `disalowSporadicMultiLogins`, `customEnterDisclosure`, `loginErrorURL`,
`loginErrorMsg`, `openLoginLink`, `login_webhook_url`, `logout_webhook_url`.

### Other conditions worth having in one place

- **Feature gates:** `sess.twillioApiToken` (Text List tab), `sess.hasAppPairLink`,
  `sess.hasAppPairLink && sess.pairSecretKey`, `sess.hasProfanityFilter`,
  `sess.canClone || sess.isClonedRoom || canCloneClicks`, `sess.isClonedRoom`, `disableMarketplace`,
  `hideLogo || !sess.logoURL`.
- **Stats tab:** `loadingUsersStats`, `statXrefs.length>0`, `statXrefsMontly.length>0`,
  `statXrefsMontly.length===0`, and `statXrefs.length>0 || true` — the last is the reference's own
  dead condition, always true. Not copied.
- **Account page:** `login.isLoggedIn`, `loggingIn`, `failedLoginCount >= 3`, `showNewRoom`,
  `showNewRoom>=5`, `showArchivedRooms`, `s.isArchivedRoom && !showArchivedRooms`, `badgesList`,
  `badges.mode=='add'|'edit'`, `badges.hasOwnProperty('imgURL') && badges.imgURL`,
  and the two empty-state guards on the Extra Admin Users and API Keys tables, each of the form
  `!<collection> || <collection>.length === 0`.
- **`ng-show="false"`, 48 nodes.** Four `<i>` icons per user row, hard-disabled in the reference
  itself. Dead in the original; not reproduced.

### What this changes

The entry-layer work is **no longer blocked on a capture**. What a live capture would still add is
the _room login page's rendered appearance_ per mode — presentation, not logic — plus the two items
that genuinely have no evidence: the Extra Admin Users `perms` shape (§1e.d) and the inbound SSO
token's accepted claim set.

## 1h. New rooms now start with every feature on — 2026-08-08

Owner decision: the reference tenant we captured is **their free sample**, deliberately configured
to show as little as possible. Ours should give anyone evaluating it the full experience.

This corrects something worse than copying their values: `createRoom` wrote **no settings row at
all**, so a new room resolved to `{}` and every feature was off. A tester creating a room got the
emptiest room the product can produce.

`src/lib/room-settings-profile.ts` is the seed, applied by `createRoom`. It is a **seed, not a
lock** — the owner can change any key afterwards, and editing the table later affects only rooms
created after the edit.

**Why it is hand-written and not a filter.** "Turn on every checkbox" is actively wrong: 33 of the
141 checkboxes are negative polarity (`hideNotes`, `hideFiles`, `hideChatAlerts`, `disableEmojis`,
`hideWebcamForRoom`, `hasSpeechRecognitionDisabled` …), so flipping them all true builds the least
featured room possible. Several more read as positive and are not — `isChatOnlyRoom` removes audio
and video outright, `simplifiedEditor` takes tools away from the note editor, and `chatAutoClear`
wipes a tester's content nightly.

Both tables are data: `FULL_EXPERIENCE_SETTINGS` and `DELIBERATELY_OFF`, the latter carrying a
reason per exclusion. `room-settings-profile.test.ts` (11 tests) pins them to the generated schema
and asserts the traps directly — no negative-polarity key, nothing from the "DON'T TOUCH" block,
nothing needing credentials we do not have, and that the wired subset really is on so the seed is
not theatre.

**Three decisions recorded:**

1. `regUserCanPresent` stays **off**. It hands every visitor a microphone and screenshare with no
   grant step — the reference's own help text is `***** CAREFULL ******`. A tester still gets the
   full experience because the owner grants mic/cam/screen per person, which is exactly the path
   §2.2's fix made real.
2. Credential-gated features stay off — `hasAppPairLink`, `positionsIframe`, `tipMeBtnEnabled`,
   `sendReportEmails`, Tawk, S3, Vimeo, OBS, Twilio, Benzinga, Imgur. Enabling a control that
   cannot work is the dead-scaffolding defect in data form.
3. The 18 `dont-touch` settings (cluster IDs, `useV3`/`useV5`, media relays, MediaMTX) are
   untouched.

**Honest limit:** 103 of 269 settings have a consumer in the room today (measured 2026-08-29;
this line read **33** for months while the real count tripled underneath it, and it is now checked by
`scripts/verify-room-settings-schema.mjs`). The remaining 166 are stored and inert until a
consumer lands. "Enabled" in this seed does not mean "working", and the module says so.

## 1i. The entry/auth layer, built from §1g — 2026-08-08

`(public)/session/[code]` enforced four of the room's entry rules and got one of them wrong. The
decision now lives in `src/lib/room-entry.ts` as one ordered, pure function, tested in isolation
(27 tests) for the same reason `roster-gates.ts` is: a predicate reachable only by rendering a route
is a predicate nobody tests, and these decide who gets into a paying customer's room.

### The defect it fixes

The route demanded `webinarPW` in **every** auth mode. The reference only offers a room password
under `authMode=='webinarRoom' || allowPWLoginWithSSO` — so an `open` room carrying a stale password
in its settings blob refused everybody, and the owner had no field in the UI to clear it, because
the manage page hides those rows outside those modes.

### Now enforced, each from a cited guard or help string

| Gate                                    | Evidence                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| `isLocked`                              | "If session is locked, nobody will be able to log in..." — checked first, absolutely |
| `banIPList`                             | ptr1 `caps[0]`: "Comma separated list of banned IPs"                                 |
| `webinarPW` / `PW2` / `PW3`             | "Works in addition to the other passwords" — a set test, not a precedence chain      |
| `webinarPWFreeTrial`                    | wider guard than the room passwords: also `unamePW`                                  |
| `secTok`                                | "Leave blank to let all members in" — unset is not a gate                            |
| `customEnterDisclosure`                 | "Users will need to agree to thisDisclosure to enter" — checked last                 |
| `loginErrorMsg` / `loginErrorURL`       | the room's own copy, and its own redirect on refusal                                 |
| `nickFilter`, `hasRequiredPhoneInLogin` | already enforced; moved into the same decision                                       |

Order is deliberate: absolute refusals that do not depend on what was typed come first, so a locked
room or a banned address never reveals whether a password was right. The disclosure is last —
asking somebody to agree to terms for a room that would refuse them anyway is pointless.

`RoomLogin.svelte` grew the one control this needed: a required disclosure checkbox when the room
sets one. Its CSS is marked **inherited, not captured** — the reference never rendered that block.

### Deliberately NOT enforced, and why

`UNENFORCED_SETTINGS` in the module names each one with what it needs first, and a test asserts
every entry is a real setting so the list cannot rot:

- **`allowedMemberships` / `allowedProducts` / `allowedPerms`** — need an identity carrying claims.
  Only an SSO or JWT arrival has any, and neither is built; enforcing them against an email-only
  guest would refuse everybody.
- **`disalowMultiLogins` / `disalowSporadicMultiLogins`** — need live presence and reconnect timing,
  which only the room observes because it holds the socket.
- **`openLoginLink`, `login_webhook_url`, `logout_webhook_url`** — need a client hook and an
  outbound call with its own timeout and failure policy.

`RoomEntrySettings` declares only what the module reads, so handing it an entitlement filter is a
**type error rather than a silent no-op**. That is the design working.

### One value computed and not yet actable

`decision.asFreeTrial` — the free-trial password admits somebody AND should mark their membership,
which is what drives the `TRIAL` badge, `isFT` and `disablePMForTrials`. A guest has no membership
row to mark until guest-join exists (§1.1). It is logged rather than smuggled through the identity
cookie: that cookie is client-controlled, so a visitor could promote their own trial status.

## 2. Built, but knowingly incomplete

From `docs/SEAM-AUDIT-2026-08-07.md` §2. These are live defects, not future features.

| #       | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Evidence                                                           | Severity |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------- |
| ~~2.1~~ | **FIXED 2026-08-07.** All five permissions plus `restrictPmUser` and `muted` now reach `data.user`; the page-load allow-list test was updated deliberately, which is what it exists for. **Five of seven membership fields were fetched and dropped** — `internal/room-config` returns `hasMic`, `hasScreen`, `hasCam`, `canEditNotes`, `restrictPmUser`, `nonPresenter`, `muted`; the room reads only `hasAdminChat` and `denyArchivesAccess`.                                                                                                                                                                                                                                                                                                                                                                        | the reference loads all of them onto `globals.user` at join        | resolved |
| ~~2.2~~ | **FIXED 2026-08-07.** The media grant's role now comes from `joinsMediaAsProducer` — `isPresenter \|\| hasCam \|\| hasMic \|\| hasScreen`, transcribed byte-for-byte from the bundle's only `connectToRoom` emit at offset 1075893 — instead of from `users.role`. `/api/media/grant` resolves the controller membership and refuses with 503 rather than guessing. **Was:** The reference joins media with `isP: isPresenter \|\| hasCam \|\| hasMic \|\| hasScreen`. This room's `toggleMicrophone`, `toggleWebcam` and `startScreenSharing` have **no permission gate at all**.                                                                                                                                                                                                                                     | bundle offset 1075893, verified verbatim                           | resolved |
| ~~2.3~~ | **FIXED 2026-08-07.** Now reads the membership's `canEditNotes` permission. Was wrong in both directions: a participant granted it could not edit, a presenter without it could.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `src/routes/+page.server.ts` now uses `connectedUser.canEditNotes` | resolved |
| ~~2.4~~ | **FIXED 2026-08-08.** The SENDER now exists, so `isLimitedPresenter` can finally become true and the two surfaces gated on it can narrow. Located at bundle offset 2075481, on the same class as `saveCustomPerms` and `startPrivateChat` — the user-info modal. Every string transcribed: the self-target refusal, both confirmations, and the recipient's `success`/`error` toasts (offset 2499228). The self-target check is enforced SERVER-side too, which the reference does not do — a presenter posting straight to the endpoint would otherwise switch off their own presenter flag with no control left to switch it back. **Honest gap:** the calling ELEMENT is still not in the decoded template, so the buttons are a reasoned placement, and the media session is not restarted (TODO gap 22). 5 tests. | bundle offsets 2075481 and 2499228                                 | resolved |
| 2.5     | **`denyArchivesAccess ?? false` is fail-OPEN.** A missing membership grants access rather than withholding it. Not currently reachable — `load` throws when the config read fails — but the reasoning that makes it safe lives in another file.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `src/routes/+page.server.ts:217`                                   | LOW      |
| 2.6     | **SSE hub has a two-source fallback.** `isP: membership?.isP ?? isPresenterRole(user.role)`. Both derive from the same membership now, so they agree — but two ways to compute one fact is the exact shape of the privilege-escalation defect that survived a day.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `src/routes/sess/[room]/events/+server.ts:135`                     | LOW      |

## 3. Evidence gathered, not implemented

Fully transcribed from the shipped bundle. Ready to build; nothing to investigate first.

### 3.1 Roster `userLocation` — BUILT 2026-08-08

The roster now shows a member's city under their name, presenter-only.

- **String rule** — `formatUserLocation()`, 4 tests. `city` → `+= ", " + region_code` →
  `country_code` appends with a comma only if the string so far is non-empty, otherwise it becomes
  the whole string. `Waterbury, CT, US`, and `US` on its own rather than `, , US`.
- **Gate** — `locationVisibleTo()`, 3 tests. `globals.isPresenter && entry.privData`: a member
  never sees anyone's city, including their own row. Ungated this would disclose every member's
  city to every other member.
- **Markup** — `<p class="userLocation">` as a sibling of `.nickName` inside `.media-body`. The CSS
  was already present in the pinned captured stylesheet (`app-room-roster .userLocation`), so none
  was written.
- **Transport** — the browser resolves its own location via `reallyfreegeoip.org` JSONP (a
  `<script>` tag; the host serves no CORS headers) and posts it to `POST /api/roster/location`,
  which republishes the roster. `ip-api.com` appears in the reference only as a link in the User
  Info modal and is NOT the geolocation API.

**Deliberate deviation, and why:** the reference rides the location into `userLoggedIn` _at join_.
Here it arrives just after subscribe, because blocking the room's event stream on a third-party call
with no SLA would make a slow geolocation host delay every message in the room. Same rendered
result; a roster line appears a moment late instead.

**Privacy cost, stated not buried:** every member's browser discloses their IP to a third party.
Resolving server-side from the connection would give the same line without that disclosure, and is
on the improvement list. Matching the reference is the current instruction.

Server-side hardening the reference does not have: the posted string is stripped of control and
bidi characters and capped at 120 bytes, so a member cannot inflict a broken roster row on a
presenter.

### 3.2 The operator console is READ-ONLY. Everything that writes is unbuilt.

`/admin` lists every account with counts and nothing else. Writes are not merely unimplemented —
they are **blocked**: `admin-guard-contract.test.ts` fails if any route under `/admin` exports form
actions. Deleting that assertion is the deliberate first step of this work, not an incidental one.

Do not confuse this with the RBAC that already exists. That one is **per room** — roles 0 Owner,
1 Presenter, 1+`nonPresenter` Admin, 2 Participant, 3 Chat-muted, 4 Banned, plus the five
`PERMISSION_KEYS` — and it answers "what may this member do in this room". What is missing is a
second, **operator-level** model answering "what may the platform operator do to this customer".
They are different systems and merging them would be a mistake.

Ordered so each step is independently verifiable and the dangerous one comes last:

| #         | What                                                                                                                                                                                                                                                                                                                                                                                                                  | Why it is not trivial                                                                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~3.2.1~~ | **DONE 2026-08-08.** `accounts.status`, enforced at `readUser` (every cookie path), the login action (says WHY, checked AFTER the password so it is not a status oracle) and `internal/room-config` (a suspended account's rooms stop serving, 404). Anything not exactly `'active'` is refused, so an unrecognised status cannot read as permission. Proven against a real PostgreSQL, including a positive control. | Needs a state column that EVERY auth path honours. Miss one and a suspended owner keeps working, which is worse than no suspend because it reads as enforced.              |
| 3.2.2     | **Operator roles** — read-only, support, full.                                                                                                                                                                                                                                                                                                                                                                        | Today it is one boolean: on `SUPERADMIN_EMAILS` or not. That does not survive a second person needing partial access, and retrofitting roles after writes exist is harder. |
| ~~3.2.3~~ | **DONE for this write.** An operator cannot suspend the account they are signed in as — `readUser` would sign them out on the next request with no way back. Refused server-side AND the control is not rendered. "Cannot remove the last operator" is still open and belongs with 3.2.2.                                                                                                                             | An operator must not suspend the account they are signed in as, nor remove the last operator. Both lock you out of your own platform, and neither fails loudly beforehand. |
| ~~3.2.4~~ | **DONE for this write.** `recordAdminWrite` is AWAITED and brackets the change (`before`/`after`/`reason`/`action`/`target`), written BEFORE it applies — so the failure mode is "audited but not applied", never "applied but unaudited". Distinct from `recordAdminAccess`, which stays fire-and-forget for reads.                                                                                                  | `admin_audit` records reads — user, outcome, path, address. A write trail needs the before and after value, or it records that something changed without recording what.   |
| 3.2.5     | **Impersonation / support login.** LAST.                                                                                                                                                                                                                                                                                                                                                                              | Needs a hard time limit, a banner the impersonator cannot dismiss, one audit row per session, and a rule that it can never target another operator. Most dangerous by far. |

Billing sits on top of 3.2.1 and 3.2.2, because a plan is usually what suspension enforces. Starting
billing before those exist means building the enforcement twice.

### 3.2b Features present in the reference — evidence pass done 2026-08-08

Each was searched for in the shipped bundle by name and by behaviour. Three are built; three cannot
be built without evidence that does not exist; one is scoped and blocked on a decision.

**Built:**

- ~~**"Stop For All" and `mp3Playing`.**~~ The senders already existed and NOTHING RECEIVED THEM,
  and `<audio id="mp3player">` had `src=""` hardcoded — so "Play For All" was silent in every
  browser including the presenter's own. Receivers wired (bundle offset 1963827), `src` bound to
  `mp3Url`, and Stop For All gated on `isP && mp3Playing` — both, per
  `O(83, o.isP && o.mp3Playing ? 83 : -1)` at offset 2016079. 4 tests.
- ~~**A `giveMicScreen` sender.**~~ See §2.4.
- ~~**Media admission used two different formulas.**~~ Found while doing this pass, and not
  previously recorded: `/api/media/grant` mints its role from `joinsMediaAsProducer` while the
  browser's `canProduce` still used the account role. They disagreed for exactly the case the
  permissions modal exists to create — a Participant granted a microphone got a `presenter` grant
  from the server and was then refused a send transport by their own browser. One formula now,
  both halves, 2 tests.

**Cannot be built — no evidence, and inventing it is forbidden:**

- **The `???` self-chat variant.** Searched the bundle: no matching string. Nothing to transcribe.
- **Private chat title flash.** `titleFlash` — **0 occurrences**. `flashTitle` — **0 occurrences**.
- **Private chat image upload and online status.** `isOffline` appears 4 times and is used by
  `startPrivateChat` to pick `uid` over `userXrefID`; that is a peer-id fallback, not an online
  indicator, and it does not describe either feature.

  These three need a capture of the private-chat panel in a populated state. Recorded here rather
  than guessed, because a plausible-looking invention is the failure mode this file exists to stop.

**Scoped, and blocked on something real:**

- **The transcript page.** Well evidenced as a surface: a separate route
  `#/session-transcript?token=<sesionToken>&name=<sessionName>` opened with `window.open` by
  `openTranscriptPage()` (offset 1956878), with its own component carrying "Loading transcripts…",
  "No transcripts found." and "Clear search to see all transcripts", fed by `getSessionTranscripts()`.

  **It has no data source here.** This room persists no speech recognition at all — there is no
  transcripts table, and `sendSpeechReco` is transient. Building the route now would render
  "No transcripts found." forever, which is dead scaffolding. It needs persistence first, and the
  reference's persistence is server-side Express that no client capture can show.

- **Media renegotiation on role change.** The behaviour IS known — the `giveMicScreen` subscriber
  does `mediaHandlerService.disconnectAll()` then re-inits after a 3s timeout (offset 1142051) —
  and our receiver flips the flag without it, so a member handed mic and screen must reload.
  Implementing it needs the media setup extracted from `onMount` into a restartable function; the
  `MediaSession` captures `canProduce` at construction, so authority genuinely cannot change
  without rebuilding it. Bounded work, no missing evidence. `TODO.md` gap 22.

- **Three log-archive surfaces gated on `isLimitedPresenter`.** Now reachable at last — §2.4 built
  the sender, so the flag can become true — but which three surfaces, and what each renders when
  narrowed, still needs its own read.

## 4. Engineering debt, accepted deliberately

| #       | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Why it was accepted                                                                                               | When it comes due                                                 |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| ~~4.1~~ | **DONE 2026-08-08.** Versioned, forward-only, apply-exactly-once migrations: `src/lib/server/db/migrations/` + `migrator.js`, run inside the existing bootstrap advisory lock, each in its own transaction with its bookkeeping row. **Version 0 is the existing idempotent DDL verbatim**, so adopting migrations against the live database is a provable no-op — the alternative, a generated `CREATE TABLE` baseline hand-marked as applied, requires trusting a file nothing checks. From version 1 a migration need not be idempotent, which is the entire point. Checksums enforce "never edit a shipped migration" by refusing to boot. `applied_at` is `NOW()` — the database's clock, not an instance's. 7 pure tests + a real-PostgreSQL test with a positive control. **Was:** Cannot express a column rename, a type change, or a backfill that must run exactly once. | correct while the database is empty                                                                               | resolved                                                          |
| 4.2     | **`*_json` columns are `text`, not `jsonb`.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | changing the data representation in the same pass as the driver swap would make a failure impossible to attribute | any time; contained change                                        |
| 4.3     | **Drizzle stays on 0.45.2 stable.** 1.0 is in RC with a 25–30% latency win and the team's own note that "something will definitely break".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | never take two risky changes at once                                                                              | after Postgres is proven in production                            |
| 4.4     | **Neon free tier autosuspends** after ~5 min idle, so the first request after a break pays a cold start.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | fine for the controller                                                                                           | **when the Rust API goes live** — paid tier or Postgres on the VM |
| 4.5     | **`better-sqlite3` is still in the lockfile** as drizzle's optional peer, pinned `allowBuilds: false` so nothing native is compiled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | the application imports it nowhere                                                                                | when drizzle's peer set is next re-resolved                       |
| 4.6     | **A 35 GB stale copy of this repository sits inside `~/Desktop/new-room`**, gitignored, with its own `.git` at an older commit. It produces confusing `svelte-kit sync` errors and is not the real tree.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | harmless, ignored, and deleting somebody's directory is not mine to do                                            | owner deletes it                                                  |

## 5. Gate coverage still missing

Contracts of the shape "a literal that must mirror reality elsewhere". Three were closed on
2026-08-07 — the attestor's migration pin, the seal's documented file count, and the room's privacy
baseline — each after one of them cost a 25-minute CI job.

- `EXPECTED_PATH_LIST_SHA256` and `EXPECTED_MANIFEST_SHA256` in
  `scripts/verify-backend-provenance.mjs` are self-consistent but nothing independently proves they
  match a freshly computed tree.
- **No systematic sweep has been done.** Every pinned count, sealed hash, documented total and
  version list in both repositories should be enumerated and each confirmed to have a fast check.
  Until that sweep runs, the honest statement is that more of these exist and we do not know where.
- ~~**"Apply to all rooms?" has no runtime coverage.**~~ **CLOSED 2026-08-08.**
  `src/lib/server/bulk-scope.db.test.ts` proves all five properties against a REAL PostgreSQL:
  scoped stays scoped; all-rooms expands by `user_id` and reaches the same person elsewhere; an id
  from another account smuggled in the form is ignored; a participant here who OWNS another room
  survives `Remove All` across the account; and Remove All really does remove, in every room.

  Stood up with `initdb` into a temp directory on a random 127.0.0.1-only port, torn down after —
  no container runtime, no new dependency, and no possible way to reach Neon. Excluded from the
  default run (`vite.config.ts` filters `*.db.test.ts`, CI has no PostgreSQL binary) and invoked
  with **`pnpm test:db`**; a gate that silently skips itself is worse than one you have to run.

  **Verified by positive control**, not by a green tick: removing the owner filter makes it fail
  with "the role-0 row in room two survived Remove All", and restoring it makes it pass. The first
  attempt at that control silently did not apply, and the resulting pass proved nothing — which is
  the failure mode this note exists to warn about.

  Three URL forms connected SUCCESSFULLY to the wrong server on the way here, each failing with a
  message that pointed elsewhere; they are written up in the file so the next person does not lose
  the same hour.

- ~~**Original entry:** "Apply to all rooms?" has no runtime coverage.~~ `resolveBulkTargets()` is the highest-blast-
  radius code in the controller — `Remove All` across an account — and every one of its properties
  (expansion by `user_id`, account taken from the room, role 0 excluded in every room) is enforced
  in SQL. This repository has **no database test harness at all**; all 145 unit tests are pure. Only
  the pure guard in `setInviteStatus` gained a test. This needs either a throwaway-Postgres harness
  or a two-room manual check before it is trusted, and it should not be exercised on real data until
  then. Written on the day it was built rather than discovered later.
- **Two columns have no writer.** `room_users.discord_user_id` (needs the `enableDiscord`
  integration) and `room_users.phone` (needs guest-join, §1.1). Both render only when set, so they
  are invisible rather than wrong — but nothing proves that, because nothing can set them.

## 6. Decisions pending

- **PII already published.** 95 findings across 53 files in the room repository, which was public
  until 2026-08-07. Now private, and a baseline gate stops it growing. Removing what is already in
  the history needs a coordinated rewrite and is the owner's call.
- **Payment and checkout** — explicitly out of scope for now.
- **Email verification** — accounts are unverified by design at this stage.
- **Repo consolidation** — `TODO.md` entry 2 / ADR 0003, deliberately deferred.
- **The stack split is temporary.** Controller on SvelteKit/Drizzle, Rust for room runtime, one
  Hetzner box. Accepted to keep moving, explicitly to be improved.

## 6b. Evidence gaps — 2026-08-08

Named here because they are things I looked for and did not find. Nothing below has been filled in
with a plausible value.

- **The DON'T TOUCH block was never captured.** `collect-everything.js` logs the step
  `manage: DON'T TOUCH expanded`, then serialises the wrong element: all 72 nodes of the
  `manage:dontTouch` capture are byte-identical to `manage:header[18..89]`, and the capture's HTML
  occurs verbatim inside the header capture at offset 2102. The strings `TOUCH`, `useV3` and
  `Use v3` appear nowhere in the 18 MB file except the capture label and the step name.
  _Read looking for it:_ `collect-account-2026-08-08T20-19-23-396Z.json` (all captures),
  `manage:header`, `manage:tab:Settings`.
  _Blocks:_ the 49 `group: 'dont-touch'` settings in `room-settings-schema.ts` remain verified only
  against the older `ptr1` dump. _Fix:_ the collector must capture the element the toggle reveals,
  not the `.form-vertical` it was standing on, then be re-run.

- **`Show Mobile`, `Show Non-Mobile` and `Marketplace Users` have no observed predicate.** The
  reference resolves `loadMobileUsers()` / `loadMarketplaceUsers()` server-side and no capture shows
  the result. `room_users` has three columns that could each plausibly mean "mobile"
  (`mobilePairCode`, `pushTokensJson`, `notificationsState`); choosing one would be inventing the
  semantics. _Read looking for it:_ both collector runs, `ptr1.json` manage captures.
  _Current behaviour:_ the loader reports the filter as unsupported and says so on the page, rather
  than silently returning every member — which is what it did before 2026-08-08.

- **Two `User List Actions` items were never rendered.** `<!-- ngIf: sess.authMode === 'unamePW' -->`
  appears twice at the top of that menu; the captured room is not in `unamePW` mode, so Angular
  stripped the markup. Their labels, icons and handlers are not in this evidence.
  _Blocks:_ completeness of that menu for password-auth rooms.

- **The Settings capture is truncated twice over.** The node array stops at index 900 (`y = 7374`)
  in a pane that runs from `y = 361` to `y = 11,243` — **35.6%** of it has no measurements — and
  every tab's `html` stops at exactly 120,000 characters, mid-row at `Custom Alert secret`. Thirteen
  settings from `slackPostURL` onward have markup but no measurements; the 121 schema entries after
  `customClientAlertPostSecret` have neither.

  (This read "32%" until it was checked. That figure divided by the pane's height while measuring
  from the document origin — mixing two coordinate spaces. The pane does not start at zero.)

- **No hover, focus or open-menu state exists in any capture.** The collector's own `gaps[]` records
  `hover: .editable-click`, `.editable-empty`, `.nav-tabs a`, `.dropdown-menu a`, `table row` and
  `manage: open dropdown — no toggle produced a visible menu`. Every `:hover` and `:focus` rule in
  `manage.css` is therefore unverified, and the style gate deliberately does not judge them.

- **The app-pair sample link has no endpoint to point at.** The reference renders a readonly
  `#pairURLLink` reading
  `https://chat.protradingroom.com/ptr_app/sessions/v2/addUser/<publicId>/?sec=<pairSecretKey>&email=__userEmail__&name=__userName__`,
  under `ng-show="sess.hasAppPairLink && sess.pairSecretKey"`. We have no `addUser` route — a search
  of `src/routes` and `src/lib` returns nothing — so rendering it would hand an owner a link that
  404s, which is the failure the `siteOrigin()` note already calls out as worse than an obvious
  absence. The block is `ng-hide` in the capture too (both flags unset), so nothing visible is
  missing today. _Blocks:_ the mobile app-pairing flow, whose server side does not exist yet.

- **Whether the textAngular toolbar re-enables on focus is undetermined.** 29 of its 30 controls
  carry a literal `disabled` in the capture (`cursor: not-allowed`, `opacity: .65`); the sole
  exception is `html`, which has no `disabled` attribute. One resting capture cannot say whether
  that is permanent or a focus gate, and disabling ours permanently on that basis would break a
  working editor. Ours stay enabled and the question is open. _Needs:_ a capture taken with the
  editor focused.

- **The textAngular popover and the six image-resizer handle nodes are not reproduced.** They have
  real `textAngular.css` rules and all measure 0x0 in the capture, so nothing is known about them
  beyond their resting geometry. They only appear while dragging an image inside the editor.

- **Room archiving is not implemented, so its filter was removed.** The reference's
  "Show / Hide Archived" toggle drives `ng-hide="s.isArchivedRoom && !showArchivedRooms"` on every
  session row, and the State cell carries a `label-warning` "archived" chip beside the
  `label-orange` "open" one. We have no `archived` column on `rooms`, no action that sets one and no
  chip — so ours filtered nothing: `visibleRooms` read `search` alone and the button's only effect
  was swapping its own label. Removed rather than left standing as a dead control, because it told
  an owner their archived rooms were hidden while every room was always shown. _Needs, in order:_ a
  column, an archive/unarchive action, the chip, then the toggle back.

- **The badges row is missing two of its three actions.** The reference's Actions cell holds
  `Edit`, `Delete` and `Dark Theme`, each an `<a>` inside a `<label>`, separated by `|`. We render
  Delete only — and carry a `badgeMode` state with a whole "Save Edit for New Badge" branch that is
  unreachable, since `badgeMode` is only ever assigned `'add'`. _Blocks:_ editing a badge at all.

- **A reference bug we are NOT copying.** `Logout Webhook URL` binds
  `editable-textarea="sess.login_webhook_url"` while saving through
  `saveSessField('logout_webhook_url')` — it edits one field and writes another. It is the only one
  of 144 rows where the two names disagree. Ours reads and writes `logout_webhook_url` correctly.
  Recorded so the divergence is a decision rather than an accident.

- **`createNew()` — the New Room handler — was never captured.** The CONTROL is proven: three
  independent captures carry the identical anchor,
  `<a type="button" ng-click="createNew()" class="btn btn btn-warning mb btn-block">New Room</a>`
  (`login-page/logged-in-page:487`, `login-page/login:465`, `main-nav-login-clicked/file:487`), each
  inside `<div class="col-md-2 ng-hide" ng-show="showNewRoom&gt;=5">`. What the function DOES is
  not. Specifically unknown: where the room's NAME comes from — whether a bootbox prompt, a modal, a
  server-side default, or a generated one.
  _Read looking for it:_ all three captures above (the markup is all any of them holds — no handler
  body), and a search of `more-fucking-evidence/`, `new-evidence/` and `mising/` for the bundle.
  The function lives in `/public/dist/app.min.js?v=1785053347467`, referenced at
  `logged-in-page` but **not present anywhere on disk**.
  _Blocks:_ matching the New Room form's shape. The reference's `div.col-md-2` holds exactly ONE
  child — the anchor — and no text field; ours carries a required `name` input because `createRoom`
  reads `form.get('name')` and fails on a blank. Nothing is invented to close that: the input stays
  until the handler is captured.
  _Fix:_ `scripts/collect-create-new.js` fetches the bundle. It is a GET of a public static asset
  and clicks nothing.

- **The five-click gate is deliberately NOT copied.** The reference hides New Room behind
  `ng-show="showNewRoom>=5"`. Ours renders it always. This is a decision, not an oversight: the
  reference never reaches zero rooms (registration provisions one and its tenants do not delete
  their last), so for it the control is an easter egg. Here an account at zero rooms has no Manage,
  no Launch and no visible way back — the dead end that was actually hit. The standard is that every
  user, test accounts included, can create a room and exercise the product without being told a
  trick. `showNewRoom` still exists and still drives the per-row id/ownerID reveal, which does keep
  the reference's behaviour. Pinned by `account-new-room-reveal.test.ts`.

## 7. Known unknowns

Not deferred — nobody has looked. Listing them so they are not mistaken for done.

- **Does mediasoup 0.25.1 clear the OpenSSL 3.0.8 blocker?** Measured 2026-08-07: OpenSSL is absent
  from the entire Cargo graph, so it is vendored inside the C++ worker and is an upstream bump, not
  a dependency swap. We are pinned to 0.24.3. Nobody has checked what 0.25.1 vendors, and the answer
  decides whether media can be promoted at all.
- **reCAPTCHA CreateAssessment.** Google's console recommends migrating off `siteverify` to the
  Enterprise `CreateAssessment` API. `siteverify` remains correct and supported for the classic v2
  keys in use, and migrating needs a Google Cloud project, a service account and billing for risk
  scores nothing here consumes. Recorded so the recommendation is not mistaken for a deadline.
- **TURN.** The original runs its own at `flash.protradingroom.com:3478` with Google's public STUN
  for candidate discovery. We have no TURN deployment and no plan written for one.
- **The deployed reference build differs from the one we characterised.** Live is
  `main.4a89421aa54e157c.js`; `scripts/ptr-collect.js` pins `main.d6d3c112b59b7d0d.js`. Anything
  read from the older build may not describe what is running now.
