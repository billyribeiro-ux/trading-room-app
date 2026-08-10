# A brief for the session that clears the TODO items

Written 2026-08-09, straight after password reset (item A) and the mail transport (item B) were
closed. This covers **what is left on `TODO.md`**, in the order it is worth doing, with what is
already known about each so the next session does not re-derive it.

**Closed items have been removed from this file rather than struck through**, matching the
convention at the top of `TODO.md`: two places recording the same thing is how one of them goes
stale. Their history is in `CHANGELOG.md`, dated and timed, with the commit that closed each.
Removed on 2026-08-10: **item I** (four unstyled public pages — closed 2026-08-09 09:57, commit
`6e7a151`, `CHANGELOG.md` 09:57) and **the verification query that was owed** against the production
`users` table (run 2026-08-09 09:58; one row, both timestamps equal, nobody gated out —
`CHANGELOG.md` 09:58).

**The SFU is not in here.** Moving it to Hetzner is done — `docs/SFU-MIGRATION.md` is the record.
Shutting down the OLD one on AWS is `docs/RETIRE-AWS-SFU.md`, and it is the owner's to run because
it needs an interactive `aws login`.

---

## The prompt to open that session with

> Read `TODO.md`, `docs/LOCAL-DEV.md` and this file before touching anything.
>
> Work the open items in `TODO.md` in this order: **C** (`push_tokens_json` has no writer), then
> **N** (the connectivity test does not test this deployment's relay), then the evidence gaps
> 1/2/3/6/7 if and only if the owner has run `scripts/collect-create-new.js` against the live
> original — without that capture those five cannot be closed honestly and must not be guessed at.
>
> **O is the owner's, not yours.** Retiring the old AWS SFU needs an interactive browser sign-in
> (`aws login`). `docs/RETIRE-AWS-SFU.md` has every command; run them only once the owner has
> authenticated, and stop the instance before terminating it.
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
> and every expected class present in the SSR HTML — it was only visible in computed styles. Item J
> carried the numbers and has been removed as closed; the two lessons that survived it are in the
> next section, and `CHANGELOG.md` 2026-08-09 09:50 and 09:57 have the detail.

---

## Two lessons that outlived their item

Item I (four public pages rendering with classes that had no CSS rule) closed 2026-08-09 09:57 in
`6e7a151`. The item is gone; these two findings from it are not, because both cost real time and
both will cost it again.

1. **Scope every new rule in `public.css` under `.pub-root`, and every rule in `account.css` under
   `.acc-body`.** This is load-bearing, not a style preference. The layout's own comment records
   what happened when those sheets were loaded unscoped: they fought the controller bundle over
   `.container`, `.row`, `.col-md-*`, `hr`, `img`, `.navbar`, `.caret` and `.dropdown-menu` on every
   controller page, and the bulk-actions menu rendered **376px instead of 238px** because
   `.dropdown-menu { right: 0 }` leaked. Related: which shell a page renders in is decided by
   `$lib/chrome.ts`, **not** by the `(public)/` folder — `/login` lives in `(public)/` and is a
   controller page. "Which stylesheet" and "which shell" are one question and must be answered
   together.

2. **A computed-style probe is only as good as the properties it reads.** `contact`'s submit button
   was reported as invisible white-on-white on the strength of `background-color: rgba(0,0,0,0)`.
   It renders blue: `.pub-root .button` sets `background-color: #4589e3` and then a `background:`
   shorthand, and the shorthand resets `background-color` to transparent while setting
   `background-image` to the gradient that actually paints. For anything painted, read
   `background-image`, `background-color` **and** the shorthand together — or take a screenshot.

And the method that produced the item in the first place, which is still the right one: **render the
page and compare computed styles against a bare element of the same tag.** A class with no rule and
a class whose rule matches the UA default are indistinguishable in source and obvious in a computed
read. Measure against a **Vercel preview deployment, not localhost** — the owner's standing
instruction is that nothing runs on local ports for this project, because more than one agent works
in it and a stray dev server on 5173 means the next person measures somebody else's code believing
it is their own. `vercel deploy` without `--prod` gives a preview URL on the same adapter and build
as production.

---

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
five of the twelve remaining gaps.**

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
