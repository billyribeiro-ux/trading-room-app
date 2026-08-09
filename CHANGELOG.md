# Changelog

Newest first. Every entry carries a **date and local time (EDT)**, and every time is either a git
commit timestamp or a measurement taken at that moment — none is estimated. Where a change landed in
a commit whose message describes something else, the commit is named anyway, because that is how it
will be found later.

**How this is maintained:** an entry is appended every time a piece of work is finished, not at the
end of a session. A change with no entry is a change the next person has to reverse-engineer from
`git log`.

**Branching: there isn't any, and that is deliberate.** Work is committed and pushed **straight to
`main`** — confirmed by the owner 2026-08-09. No feature branches, no PRs. The consequence is worth
stating once, here, rather than rediscovering it: **`main` auto-deploys**, so a push is a production
release, not a reviewable step. Two things follow, and both are conventions of this file:

1. **Every entry says whether it has runtime impact** — whether the push changed what the site
   serves, or only documentation, comments and tests. That is the first thing anyone reading back
   through an incident wants to know.
2. **Verification happens before the push, not after**, because there is no review gate to catch it.
   Each entry records what was run and what could not be.

---

## 2026-08-09

### 10:35 — `TODO.md` now lists only open work (pushed to `main`)

**No runtime impact** — one document.

Seven closed items removed rather than left struck through: evidence gap **13** (`ptr_logo.png`),
and work items **A** (password reset), **B** (mail transport), **D** (`ROOM_BASE_URL`),
**E** (`ROOM_JWT_SECRET`), **I** (four unstyled public pages) and **J** (the wrong-shell defect).

Nothing is lost — every one of them is in this file, dated, timed, and against the commit that
closed it. That is the point of the split: two places recording the same thing is how one of them
goes stale, and a list that is mostly strikethrough is a list nobody reads to the bottom of. The
header now says so, so the next person does not "helpfully" restore the history.

**Two counts repaired, which is the part a plain deletion would have got wrong:**

- "closes five of **thirteen** gaps" now reads "five of the **twelve remaining** gaps", because gap
  13 was one of the thirteen.
- checked for dangling references to the removed ids across the file — none.

**What is left, and it is now the whole file:** evidence gaps **1–12**, and work items **C**
(`push_tokens_json` has no writer), **G** (Neon under volume) and **H** (separate the media plane
from the app tier). G and H are the owner's calls, recorded rather than queued.


### 10:28 — The e2e harness could not run at all; written, plus the manage-page spec (pushed to `main`)

**No runtime impact** — test infrastructure and one `.gitignore` line. Nothing about what the site
serves changed.

**`test:e2e` is listed in the `quality` gate and could never have executed.** `e2e/` holds three
specs and `package.json` runs `playwright test`, but **there was no `playwright.config.*` anywhere in
the repository**. The specs navigate with `page.goto('/register')`, which needs a `baseURL` to
resolve. A gate in the quality chain that cannot run is worse than no gate, because it reads as
coverage.

- **`playwright.config.ts`** — `testDir: e2e`, baseURL on 5173, serial (`workers: 1`), and a
  `webServer` block so **Playwright owns the server's whole lifecycle**: it starts it, waits for
  `/login`, and tears it down when the run ends. That is what makes an e2e run compatible with the
  standing "nothing runs on local ports" rule — there is nothing left to forget about.
- **`reuseExistingServer: false`**, against the usual `!process.env.CI`. Other projects on this
  machine use this port range, and reusing a foreign server would run these assertions against a
  different application and report the result as this one's — exactly the failure the standing rule
  exists to prevent. Failing loudly on a busy port is the safer answer.
- **`playwright-report/` and `test-results/` added to `.gitignore`.** They were not ignored;
  `vite.config.ts` already excludes both from its watcher for the same reason, so this was an
  oversight rather than a decision. Without it the HTML report lands in the next commit.

**`e2e/manage-room.spec.ts`** covers the two things shipped earlier today that a unit test cannot
prove, and which `CHANGELOG.md` recorded as unverified in a browser:

- the URL a customer lands on carries the room's **short code** — read off the Manage link's own
  `href` and asserted to be four-or-more digits, never a hardcoded value, since the code comes from
  a database sequence;
- the stats date field **takes focus on click**, the label's `for` is absent at rest and present
  while editing, and **blur closes the row** — the half of the defect a stub cannot demonstrate,
  because `blur` is a browser behaviour rather than a function call.

The account is a throwaway registered through the real form, the same pattern
`critical-journey.spec.ts` already uses. Nothing is forged and no session is inserted.

**Verified:** the config parses and `playwright test --list` reports 9 tests across 4 files without
starting anything. `svelte-check` 0 errors, 3 warnings (unchanged); 547 unit tests passing.

**NOT yet executed, and that is the honest state.** Running it starts a dev server on 5173, which
is the owner's explicit standing boundary, so it waits on their word rather than being assumed.
Everything above is the harness being correct; none of it is the assertions having passed.


### 10:18 — Rooms are addressed by their short code, not the database id (pushed to `main`)

**Runtime impact: yes, and it changes a URL.** `/account/rooms/1?tab=users` is now
`/account/rooms/3625?tab=users`. Raised by the owner: the old form read as unfinished, and it was —
`1` is a row's primary key. It advertises how many rooms the database holds and belongs to the
database rather than to the product.

The short code is the room's own identity and the only number this product ever shows for it. The
reference's manage header reads `Manage Room id: 3627 ( 6a6529b318781e20ed81947d )`, its Sessions
table lists Session ID `3625`, and `provisionRoom` already names a new room `Room <shortCode>`.
`rooms.short_code` is `NOT NULL` with a unique index, so the lookup costs exactly what the primary
key did.

- `+page.server.ts` — the load, `ownedRoom`/`ownedRoomId`, and the clone redirect all resolve by
  short code. The clone's `returning` gained `shortCode` so the redirect reads the value that
  actually landed rather than a local.
- Eleven links updated: two on the account page, nine on the manage page.

**Old numeric links 404, deliberately.** Accepting both would be ambiguous — id and short code are
both digit strings, and nothing stops one room's code equalling another room's id, so a fallback
would silently resolve to the WRONG room. A 404 is the honest answer, and on a days-old deployment
whose rooms have four-digit codes and single-digit ids there is nothing bookmarked to break.

**`?tab=` is left alone.** A query parameter for a tabbed view is a normal, correct pattern; moving
it into the path would churn the most evidence-pinned page in the repository for no user-visible
gain. The complaint was the `1`, and the `1` is what changed.

**Verified before pushing:** `svelte-check` 0 errors, 3 warnings (unchanged). 50 files, 547 tests
(up 6 — `room-url-identity.test.ts`). **All 37 database tests pass**, and getting there mattered:
six of them failed on the first run because the harness passed numeric ids as the route param. That
is the change working, not a flake — the harness now resolves id to short code with a real lookup,
so the cases stay about the DON'T TOUCH actions.

The new cases can tell the two identifiers apart because the fixture's differ on purpose — **id 1,
short code 3625**. A fixture whose id happened to equal its code would pass on either
implementation. Mutation-checked: reverting one link to `${room.id}` turns two of them red.


### 10:12 — Both open manage-page audit defects fixed (pushed to `main`)

**Runtime impact: yes.** Two live UI bugs on the User Stats pane of a page already in production.
Both were found by the manage-page audit's own adversarial verifier and had been open since.

- **The stats date fields were a one-way trap.** Clicking either date swapped its anchor for an
  `<input type="date">` and stopped there — the field never took focus. The picker never opened,
  nothing could be typed without a second click, and **the row could not close**, because its only
  exits are `change` and `blur` and `blur` cannot fire on an element that never held focus. One
  click put the row into an edit state with no way out.

  Fixed with `{@attach focusDateField}` — an attachment rather than a `use:` action, which is what
  the current Svelte docs list as the replacement under "avoid legacy features", and which runs at
  element creation, exactly when focus needs to move.

- **`for="statsFrom"` / `for="statsTo"` were orphaned at rest.** Both pointed at ids that exist only
  while editing, so at rest the labels referenced nothing: a screen reader announces a label whose
  control cannot be found, and clicking it moves focus nowhere. `for` is now set only while the
  field exists.

  At rest the captioned thing is an `<a>`, which is not a labelable element — there is no id `for`
  could legally point at — so the label carries a documented `svelte-ignore` and the anchor gained
  an `aria-label` so the caption still reaches assistive tech. This is also the closer match: the
  reference's own labels carry no `for` at all (file2:904, 909), and attributes are invisible to the
  side-by-side comparison, which reads tag and classes only.

- **`focusDateField` was extracted to `$lib/focus-date-field.ts`** rather than left in a 2,000-line
  component, for the same reason as `chrome.ts`: it has three branches that are easy to get wrong
  and impossible to see in review — a browser with no `showPicker`, a `showPicker` that throws
  because the call is not user-activated, and the ordering of focus against it. **Focus runs first
  and unconditionally**, so a refused popup cannot take the stuck-row fix down with it; that
  ordering is pinned by a test.

**Verified before pushing:** `svelte-check` 0 errors, 3 warnings — unchanged, and all three are the
pre-existing `href=""` ones this block already documents. 49 files, 541 tests passing (up 6:
`focus-date-field.test.ts`). 47 manage-page tests still passing, so the side-by-side match is intact.

**Not verified in a browser**, and worth stating plainly: nothing runs on local ports for this
project by standing instruction, and the manage page needs a signed-in session and a room. The
picker opening is asserted against a stub, not against Chromium. The two behaviours a stub cannot
prove — that the native calendar actually appears, and that blur now fires — are the reason the
`showPicker` call is best-effort rather than assumed.


### 10:03 — This changelog started, and two comments corrected (`8c5dca3`, pushed to `main`)

**No runtime impact** — documentation, one code comment and one test comment. Nothing about what the
site serves changed in this push; the pages and CSS themselves went up earlier in `6e7a151`.

- **`CHANGELOG.md`** created at the repo root. It exists because several changes today landed in
  commits whose messages described something else — the four rebuilt public pages went in under a
  commit about the `pub-*` decision — which makes work unfindable without reading diffs.
- **Two comments that were true when written and had since reversed**, in
  `forgot-password/+page.svelte` and `password-reset-pages.test.ts`. Both stated that the `pub-*`
  classes have no rule anywhere in the app; `public.css` had defined all seven an hour earlier. A
  comment asserting a fact that has flipped is worse than no comment, because it is read as current.
  `forgot-password` still wears `acc-*` on purpose, and the comment now says why it should stay that
  way.

**Verified before pushing:** 48 files, 535 tests passing; `svelte-check` 0 errors, 3 warnings
(unchanged); breakpoint contract passing.

### 09:59 — Full controller unit suite re-measured

**No runtime impact** — a measurement, plus one documented count corrected.

**48 files, 535 tests, all passing.** `docs/PROMPT-TODO-ITEMS.md` said 522; corrected in place with
the date of the new measurement rather than silently overwritten.

### 09:58 — The verification query that was owed, run against production

**No runtime impact** — one read-only `SELECT`. Nothing was written to the database.

`docs/EMAIL.md` §5 and `docs/PROMPT-TODO-ITEMS.md` both recorded a query that had to be re-run
*after* `RESEND_API_KEY` and `MAIL_FROM` went live, because flipping them makes `verificationEnforced()`
true and gates any account with a NULL `email_verified_at` out of creating rooms.

Result: **one row, and it is the safe one.** `id 1 | billy.ribeiro@icloud.com`, `created_at` and
`email_verified_at` both `2026-08-07 22:46:34.438+00` — equal to the millisecond, which is the
signature of migration 1's backfill. **Nobody is locked out; no `UPDATE` and no resend needed.**

Also corrected the reason the brief gave for not having run it. It said obtaining a connection string
requires `vercel env pull`, which would write every other production secret to disk. It does not: a
`DATABASE_URL` was already on disk at `~/Desktop/new-room-control/.env.vercel-pull`, which is where
`scripts/set-vercel-env.sh` already reads it from.

*This measurement expires with the next registration.*

### 09:57 — TODO item I closed: the four unstyled public pages (`6e7a151`)

**RUNTIME IMPACT: yes.** Three public pages and a stylesheet, live on `main` and therefore deployed.
`/contact`, `/privacy` and `/terms` render differently to a visitor from this commit onward.

`contact`, `privacy`, `terms` and `verify-email` rendered with seven classes that had **no CSS rule
anywhere in the app**. `pub-hint`, `pub-error` and `pub-success` were therefore visually identical,
so on `/verify-email` "your address is confirmed" and "that link has expired" looked the same.

- **`src/public.css`** — added a section defining `pub-auth`, `pub-container`, `pub-form-card`,
  `pub-field`, `pub-hint`, `pub-error` and `pub-success`, every rule scoped `.pub-root …`, under a
  header marked NOT TRANSCRIBED because those pages were never captured. Values reuse what the app
  already has: Bootstrap 3.1.1 panel and `.form-control` geometry, `#777` from `.acc-text-muted`, and
  the two message colours literal-copied from `--btn-danger-bg` / `--btn-success-bg`.
- **Deliberately fluid, with no `@media` block** — `scripts/verify-breakpoints.mjs` asserts
  `public.css` carries exactly the thresholds 767/768/991/992/1200, so a new one fails that gate.
- **`(public)/contact/+page.svelte`** — rebuilt with labelled fields, all four server states handled
  (including `unavailable`, which the old page ignored), and an honest not-delivered state pointing
  at the real `support@tradingroom.app` mailbox.
- **`(public)/privacy/+page.svelte`, `(public)/terms/+page.svelte`** — written from the source code
  rather than a template, naming the third parties a template would miss: Gravatar's MD5-of-email
  lookup, reCAPTCHA, and Resend via Amazon SES `us-east-1`. Both carry an explicit "not reviewed by a
  lawyer" notice and list what is still undecided.
- **Checked, and it was an artifact:** the brief warned `contact`'s submit might be white-on-white
  because it computes `background: rgba(0,0,0,0)`. It is not. `.pub-root .button` sets
  `background-color: #4589e3` then `background: linear-gradient(...)`; the shorthand resets
  background-*color* to transparent while setting background-*image* to the gradient.
- Fixed two comments the change made false — in `forgot-password/+page.svelte` and
  `password-reset-pages.test.ts`, both of which still said the `pub-*` classes had no rule.

**Verified:** breakpoint contract passes; `svelte-check` 0 errors, 3 warnings (unchanged — none
added); 535 tests pass; Svelte autofixer clean on all three pages.
**Honest gap:** `verify-home-fidelity.mjs` could not be run — it reads `evidence-dumps/`, which lives
outside this repo — so its two `public.css` reject patterns were checked by hand (0 matches).

### 09:50 — `/forgot-password` and `/reset-password` moved to the correct shell (`4f36e89`)

Both were rendering in the marketing shell while wearing controller `acc-*` classes; measured in
Chromium, every field came out 508px instead of 254px. The shell is now decided by `$lib/chrome.ts`.

### 09:15 — Documentation corrected: mail is live (`17c1842`)

Three places still described the transport as unconfigured.

### 09:07–09:11 — Password reset built (`4291afc`, `178cbf4`)

The one flow with no route back into an account. Token design reused from `email-verification.ts`:
hashed at rest, single-use, one hour rather than 24, rate limited, reCAPTCHA before the lookup.

### ~08:50 — Email turned on end to end

- Porkbun hosted mailbox created for `support@tradingroom.app` ($36/yr — the free forward was
  offered and declined so replies do not come from a personal address).
- Resend domain `mail.tradingroom.app` verified; DKIM and the `send.mail` MX are live. **The SPF TXT
  and DMARC records did not save** and are still absent from the zone — confirmed against all four
  Porkbun nameservers. Sending works; inbox placement is weaker than it should be.
- `RESEND_API_KEY` and `MAIL_FROM` set on Vercel production, both marked Sensitive.
- `scripts/set-vercel-env.sh` extended to write both, with a minimum length for the key and a
  write-time check that `MAIL_FROM` is an address.

### 07:59 — The room is deployed (`77ac66d`)

`chat.tradingroom.app` on the Hetzner box, with `ROOM_JWT_SECRET` rotated to 64 hex characters on
the room and on Vercel in the same sitting.

### 05:04–05:33 — Documentation established

`TODO.md` at the repo root (`41ffe54`), `docs/EMAIL.md` (`12354fb`), `docs/MOBILE-APP.md`
(`f8a92f2`), and the white-label correction separating what the evidence proves from what it merely
permits (`38c74c0`).

### 04:19–04:47 — Rich text editor and hand-off notes

Editor toolbar focus ring, paragraph output, active-format highlighting, save toast
(`9755def`…`7ee434c`), and the hand-off notes (`2c620a4`).

### Earlier — manage-page side-by-side audit

Ran across 13 agents. The manage page went from **2,355 differing elements to 24**: tab strip 0/15,
Users 2/507, Text List 0/6, Branding 0/94, SSO Setup 0/9, User Stats 6/53, Settings 16/1501. The
first fix was a harness bug — the fixture omitted the `strip` property the page filters on, so the
tab strip scored 15/15 against an empty `<ul>`.

**Two defects from that work are still open**, both caught by its own adversarial verifier and
neither yet fixed: the stats date `<input>` is created on click but never focused, so the picker does
not open and the row sticks in edit state; and `for="statsFrom"`/`for="statsTo"` point at ids that
exist only while editing, so the labels are orphaned at rest.
