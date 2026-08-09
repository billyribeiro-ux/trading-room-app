# A brief for the session that clears the TODO items

Written 2026-08-09, straight after password reset (item A) and the mail transport (item B) were
closed. This covers **what is left on `TODO.md`**, in the order it is worth doing, with what is
already known about each so the next session does not re-derive it.

**The SFU is not in here.** It has its own brief — `docs/SFU-MIGRATION.md` — and its own session.

---

## The prompt to open that session with

> Read `TODO.md`, `docs/LOCAL-DEV.md` and this file before touching anything.
>
> Work the open items in `TODO.md` in this order: **I** (four public pages render with classes that
> have no CSS rule), then **C** (`push_tokens_json` has no writer), then the evidence gaps 1/2/3/6/7
> if and only if the owner has run `scripts/collect-create-new.js` against the live original —
> without that capture those five cannot be closed honestly and must not be guessed at.
>
> **G and H are the owner's calls, not yours.** They are recorded so they are not lost. Do not
> implement either; if you have something to add, add evidence to the write-up.
>
> Get the app running first (`docs/LOCAL-DEV.md`) and keep it running while you work — every claim
> in here is expected to be checked against a real server and a real PostgreSQL, not against a
> reading of the source. Two things in this codebase were green in tests and wrong in the product,
> and both are documented in the files above.
>
> The house rules apply and are not optional: evidence is READ, never grepped; anything absent gets
> reported and written into `TODO.md` rather than invented; no dead scaffolding; re-read your own
> diff before saying done.
>
> One specific warning, because it has already cost this project a shipped defect. **For anything
> about styling, measure the rendered page — do not read the stylesheet and conclude.** A page can
> contain every correct class and still lay out wrong, because `account.css` is scoped under
> `.acc-body` and `public.css` under `.pub-root`, and which one applies is decided by
> `$lib/chrome.ts` rather than by the route folder. That exact mistake shipped on 2026-08-09 with
> `svelte-check` clean, the whole unit suite green (522 then; **535 measured 2026-08-09 09:59 EDT**)
> and every expected class present in the SSR HTML — it
> was only visible in computed styles. `TODO.md` item J has the numbers.

---

## Item I — four public pages have no styling at all

> **CLOSED 2026-08-09 09:57 EDT.** `public.css` now defines all seven classes, every rule scoped
> `.pub-root …`, in a section headed NOT TRANSCRIBED. The owner's decision below was followed
> exactly: `pub-*` rules written, nothing restyled onto `acc-*`, nothing added to
> `CONTROLLER_PATHS`. Deliberately fluid with no `@media` block, because
> `scripts/verify-breakpoints.mjs` asserts `public.css` carries exactly the thresholds
> 767/768/991/992/1200 — a new one fails that gate. `contact` was rebuilt with labelled fields and
> an honest not-delivered state; `privacy` and `terms` were written from the source code with an
> explicit "not reviewed by a lawyer" notice. Verified: breakpoint contract passes, `svelte-check`
> 0 errors, 535 tests pass, autofixer clean. **Honest gap:** `verify-home-fidelity.mjs` could not be
> run — it reads `evidence-dumps/`, which is outside this repo — so its two `public.css` reject
> patterns were checked by hand (0 matches).
>
> The section below is kept as the record of how it was decided, not as open work.

**Severity: cosmetic, but it is four pages a paying customer sees.**

### What is measured, not read

Rendered in Chromium at 1280px, each element compared against a bare sibling of the same tag —
identical computed styles means no rule reaches it:

| class | pages | result |
| --- | --- | --- |
| `.pub-auth` | contact, verify-email | **no rule** |
| `.pub-container` | privacy, terms | **no rule** |
| `.pub-form-card` | all four | **no rule** |
| `.pub-field` | contact | **no rule** |
| `.pub-hint` | contact, privacy, verify-email | **no rule** |
| `.pub-error`, `.pub-success` | contact, verify-email | **not measured** — they render only on states that run did not reach |

**Seven classes, not six.** An earlier version of this item listed six and missed `pub-container`,
because it was written from reading the pages instead of rendering them. That is the whole lesson of
item J below; do not repeat it.

One thing that is NOT unstyled: `contact`'s submit is `class="button"`, and it computes
`padding: 13px 32px`, `border-radius: 5px`, a box-shadow, `font-size: 17px` — and
`background: rgba(0,0,0,0)` with `color: rgb(255,255,255)`. **Check whether that is white text on a
white background before assuming that page merely lacks polish.**

> **CHECKED 2026-08-09: it is not white-on-white, and the reading was an artifact of the
> measurement.** `.pub-root .button` (`public.css:421-439`) declares `background-color: #4589e3` and
> then `background: linear-gradient(#5da4ff, #417bff)`. The shorthand resets `background-color` to
> its initial `transparent` — which is exactly the `rgba(0,0,0,0)` that was measured — while setting
> `background-image` to the gradient. The button paints blue under white text. **Reading
> `background-color` alone misses `background-image`**, which is worth remembering for the next
> computed-style pass: this document is otherwise right that measuring beats reading, and this is the
> one case where a measurement needs a second property to be read correctly.

### Read this before choosing an approach

The shell a page renders in is decided by **`$lib/chrome.ts`**, not by the `(public)/` folder.
`/login` lives in `(public)/` and is a controller page. So "which stylesheet should this page use"
and "which shell is it in" are the same question and must be answered together — see item J, where
answering only the first produced a page with flawless markup and every field twice its intended
width.

### DECIDED BY THE OWNER 2026-08-09 — this is not an open question

**Use the `pub-*` classes. Write the missing rules; do not restyle these pages onto `acc-*`.**

The owner's instruction, given directly, and the reason is to avoid making a mess. An earlier
version of this document offered two routes and leaned the other way for `verify-email`. That
recommendation is **withdrawn** — it is recorded here only so nobody re-derives it and reopens a
settled call.

Three consequences that follow from it, and all three matter:

1. **These pages STAY in the marketing shell.** Do **not** add them to `CONTROLLER_PATHS` in
   `$lib/chrome.ts`. `pub-*` rules only reach them inside `.pub-root`, so moving the page and
   keeping the classes would break them the same way item J broke — just in the other direction.
2. **Scope every new rule under `.pub-root`.** Every existing rule in `public.css` is written
   `.pub-root …`, and that is not a style preference — it is load-bearing. The layout's own comment
   records what happened when these sheets were loaded unscoped: they fought with the controller
   bundle over `.container`, `.row`, `.col-md-*`, `hr`, `img`, `.navbar`, `.caret` and
   `.dropdown-menu` on every controller page, and the bulk-actions menu came out **376px instead of
   238px** because `.dropdown-menu { right: 0 }` leaked. A bare `.pub-form-card { … }` is the same
   class of bug waiting to happen.
3. **`contact`'s submit already has a rule**, and the white-on-white worry an earlier version of
   this document raised is **RETRACTED — it was my measurement, not a defect.** `.pub-root .button`
   sets `background-color: #4589e3` and then a `background:` shorthand, and the shorthand resets
   `background-color` to transparent while setting `background-image` to the gradient that actually
   paints. Reading `backgroundColor` alone sees `rgba(0,0,0,0)` and concludes the button is
   invisible; it renders blue under white text.

   Worth keeping as a lesson rather than deleting: **a computed-style probe is only as good as the
   properties it reads.** For anything painted, read `background-image`, `background-color` AND the
   shorthand together, or take a screenshot.

### How to verify it — not by reading the CSS

Render the page and compare computed styles against a bare element, which is how the table above
was produced. A class with no rule and a class whose rule happens to match the UA default are
indistinguishable in source and obvious in a computed-style read.

**Measure against a Vercel PREVIEW deployment, not localhost.** The owner's standing instruction is
that nothing runs on local ports for this project — it is deployed, more than one agent is working
in it, and a stray dev server on 5173 means the next person measures somebody else's code and
believes it is their own. `vercel deploy` (without `--prod`) gives a preview URL to point the
browser at, and it exercises the same adapter and the same build as production, which localhost
does not.

If you do need a local server for something a preview cannot give you, say so first, and stop it the
moment you are done.

## Item C — `push_tokens_json` has no writer

**Severity: blocks the mobile app entirely.**

The column exists on `room_users`. Nothing ever writes it, because the endpoint a device would call
to register its FCM token does not exist. `MOBILE-APP.md` §4 and §7b.3 carry the analysis.

### What is already built, and what is not

- **Built:** `fcm.ts`, against FCM **HTTP v1** with an OAuth2 token minted from a service-account
  key. It refuses rather than degrades when `FCM_SERVICE_ACCOUNT_JSON` is unset — "Get FCM Tokens"
  and "Send Test Mobile Notifs" report the variable is missing instead of returning an empty list,
  because a push subsystem that quietly answers "nothing to do" is indistinguishable from one that
  works.
- **Not built:** the registration endpoint, and the pairing route. `MOBILE-APP.md` §4 records that
  the reference renders an app-pair link at `…/ptr_app/sessions/v2/addUser/<publicId>/?sec=<pairSecretKey>&…`
  and **we have no `addUser` route** — that is evidence gap 12, and it is a gap in OUR
  implementation rather than in the evidence.

### Before writing anything

Read `MOBILE-APP.md` end to end. It contains a proposed endpoint contract that was derived from the
decoded server surface, and the point of writing it down was so this work would not start from
scratch. Check it against what is in the repository now, since it predates the consolidation.

**Two constraints that are easy to get wrong and expensive to get wrong:**

- A push token is a credential-shaped device identifier. It belongs to a membership row, so every
  read and write goes through the same account scoping as everything else in `rooms.ts` — one
  account's room id must never reach another's tokens. `requireOwnedRoom` exists for this.
- `FCM_SERVICE_ACCOUNT_JSON` is a private key. Hosts that take secrets through a web form store PEM
  newlines as literal backslash-n; `fcm.ts` already unescapes both forms. Do not add a second
  parser.

---

## Evidence gaps 1, 2, 3, 6, 7 — blocked on one file

All five live in `/public/dist/app.min.js` on the live original, which is **not present anywhere on
disk**. They are: `createNew()` (where a new room's name comes from), `htmlDescChanged()` (whether
the original shows anything at all on save), why 29 of 30 editor toolbar buttons carry
`disabled="disabled"` even after typing, the three never-rendered `ptrMobileAppCaseByCaseEnabled`
branches, and what `customMobileAppLaunchWord` does.

`scripts/collect-create-new.js` already fetches it. It is a GET of a public static asset — it clicks
nothing, submits nothing and mutates nothing. **Running it once against the live original closes
five of thirteen gaps.**

That is the owner's action, not the next session's: it needs a logged-in browser on the original.
If it has not been run, say so and work on I and C instead. **Do not fill any of these five in from
a plausible reading of the minified bundle you happen to find elsewhere** — three of them are
already recorded with the exact files that were searched.

---

## G and H — recorded, deferred, and the owner's to decide

Both were raised by the owner on 2026-08-09 and explicitly deferred. They are in `TODO.md` so they
are not lost, not so they get implemented by whoever reads the list next.

- **G — Neon may not hold up under volume.** Serverless Postgres autoscales compute, but the
  pressure here is sustained *connections* from long-lived room sessions, which is a different
  curve. Alternatives to weigh when it comes up: Crunchy Bridge, RDS, or self-managed alongside the
  app tier. Not urgent — current load is one account.
- **H — production should separate the media plane from the app tier.** What is deployed today is a
  five-day *test* topology: the room and the SFU share one Hetzner box, which means a shared failure
  domain, a shared attack surface (~10,000 open UDP ports beside your session cookies) and a shared
  lifecycle. Hetzner earns its place on egress economics; the rest of the app has the opposite
  shape. Separating later is a redeploy, not a migration.

If either comes up, the useful contribution is **measurement** — connection counts under a realistic
room, or a costed topology — added to the write-up. Not a migration.

---

## One thing that is owed before any of this

`docs/EMAIL.md` §5 carries a query that must be re-run against the production database:

```sql
SELECT id, email, created_at, email_verified_at FROM users ORDER BY id;
```

`RESEND_API_KEY` and `MAIL_FROM` went live on 2026-08-09, which flipped `verificationEnforced()` to
`true` and made the room-creation gate real. The measurement in §5 proving nobody would be locked
out was taken *before* that. Anyone who registered between migration 1 and that day has a NULL
`email_verified_at` and is now gated out of creating a room — and until that day, the link that
would clear it could not be sent to them.

It was not run in the session that flipped the switch, because obtaining a production connection
string means `vercel env pull`, which writes every other production secret to disk alongside it.
That is a worse trade than leaving one read-only query for the owner. If the query returns such a
row, the fix is one `UPDATE` for that user, or a resend from the account page — **not** a change to
the gate.

> **RUN 2026-08-09 09:58 EDT, after the switch was flipped. Nothing is gated out.**
>
> ```
> id | email                    | created_at                 | email_verified_at
>  1 | billy.ribeiro@icloud.com | 2026-08-07 22:46:34.438+00 | 2026-08-07 22:46:34.438+00
> ```
>
> One row, and the two timestamps are equal to the millisecond — the signature of migration 1's
> `UPDATE users SET email_verified_at = created_at`. No `UPDATE` and no resend is needed.
>
> **The stated obstacle above is not one, and that is worth correcting rather than leaving to cost
> somebody the same hesitation.** A production connection string was already on disk at
> `~/Desktop/new-room-control/.env.vercel-pull`, which is where `scripts/set-vercel-env.sh` reads
> `DATABASE_URL` from (lines 23 and 128). Reading one variable out of a file that already exists
> writes nothing and exposes nothing further, so `vercel env pull` was never required for this.
>
> This measurement expires with the next registration. Re-run it before assuming it still holds.
