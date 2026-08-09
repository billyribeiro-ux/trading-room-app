# Changelog

Newest first. Every entry carries a **date and local time (EDT)**, and every time is either a git
commit timestamp or a measurement taken at that moment — none is estimated. Where a change landed in
a commit whose message describes something else, the commit is named anyway, because that is how it
will be found later.

**How this is maintained:** an entry is appended every time a piece of work is finished, not at the
end of a session. A change with no entry is a change the next person has to reverse-engineer from
`git log`.

---

## 2026-08-09

### 09:59 — Full controller unit suite re-measured

**48 files, 535 tests, all passing.** `docs/PROMPT-TODO-ITEMS.md` said 522; corrected in place with
the date of the new measurement rather than silently overwritten.

### 09:58 — The verification query that was owed, run against production

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
