# Email — sending, receiving, and what is still missing

Written 2026-08-09. Same rule as the other documents: sourced or labelled.

---

## 1. Two different products, routinely confused

| | what it does | who sells it |
| --- | --- | --- |
| **Transactional sending** | *sends* verification links, password resets, invites | Resend, Postmark, SES |
| **Mailbox hosting** | *receives* mail at `support@tradingroom.app` | Google Workspace, Fastmail, Zoho |

You need **both** — but "both" does not mean "buy two things". A transactional provider will not
give you an inbox, and a mailbox provider is the wrong tool for programmatic sending at volume.
At this product's stage the whole pair is free: Resend's free tier for sending, and a Porkbun
forward for receiving (§4 steps 1 and 6). Paying starts at a second sending domain or a real
shared mailbox, neither of which is a launch prerequisite.

**Do not self-host sending from the app server.** A fresh VPS IP has no sending reputation, hosting
ranges are widely greylisted, and a password reset in the spam folder is indistinguishable from a
broken product. This is the one piece of infrastructure where consolidating onto your own box
(`NEXT-SESSION.md` §4c) is the wrong call.

---

## 2. What is already built

`apps/controller/src/lib/server/mail.ts` — a **Resend adapter behind one `sendMail` seam**. Written
2026-08-08, never configured. Reading it:

| property | line | why it matters |
| --- | --- | --- |
| Single seam | — | swapping providers is one file, not a search-and-replace |
| `RESEND_ENDPOINT = 'https://api.resend.com/emails'` | 42 | HTTP API, no SMTP, no long-lived connection |
| `AbortSignal.timeout` on the request | 48 (`TIMEOUT_MS = 8_000`), used at 99 | a hung provider must not hold a registration request open |
| `mailConfigured()` needs **both** `RESEND_API_KEY` **and** `MAIL_FROM` | 71-73 | a key with no from-address produces a provider rejection at send time; being obviously off is better |
| Throws `No mail transport is configured` | 52 | callers check `mailConfigured()` first rather than discovering it in a 500 |

The provider was **our decision, not a match**: no browser capture can reach the reference's
server-side sender, so nothing in the evidence names one. Recorded as such in `OUTSTANDING.md`
§1b.4.

### Email verification is wired end to end

- migration `0001-email-verification`
- `src/lib/server/email-verification.ts` — issue, hash, expire, single-use
- `/verify-email` route
- a resend-the-link action on the account page
- a gate on room creation

**`verificationEnforced()` returns `mailConfigured()`.** That is deliberate: the two honest states
are "send and enforce" and "neither". Enforcing a check you cannot deliver is a lockout, so the gate
is inert until mail works.

---

## 3. What does NOT exist

**There is no password reset flow.** `src/routes/(public)/` contains `login`, `contact`,
`verify-email`, `privacy`, `terms`, `session` — and no `forgot-password` or `reset-password`.
"Forgot your password?" links to `/contact`, and the contact action explicitly does not deliver.

`OUTSTANDING.md` §1b.3 marks this **HIGH — blocks real customers.** A user who loses their password
today has no route back that does not involve you editing the database.

---

## 4. What to do, in order

### Step 1 — a transactional provider

**Resend.** The adapter is already written against it, and the free tier covers this product's
volume several times over.

Read off `resend.com/pricing` and `resend.com/docs` on 2026-08-09, because "the free tier is
generous" is not a number:

| | free | notes |
| --- | --- | --- |
| per month | **3,000** | one account, no customers — not a constraint |
| per day | **100** | irrelevant for resets and verifications; a real ceiling if members are ever mailed in bulk |
| domains | **1** | `mail.tradingroom.app` uses it. A SECOND sending domain is what forces the paid tier, not volume |
| retention | 30 days | |
| next tier | **Pro, $20/mo** | 50,000/month |

Whether a card is required at signup is **not stated** on that pricing page and was not verified.

Two things their docs confirm that this plan depends on:

- **Subdomains are Resend's own recommendation**, for the reason in step 2: *"We recommend sending
  your emails from one or more subdomains … instead of your root domain to isolate your sending
  reputation."*
- **`noreply@` is not a mailbox and costs nothing to create**: *"Send and receive emails using any
  email address at your domain without any extra configuration."* It is a string in `MAIL_FROM`,
  nothing more.

Alternatives, if you want them: **Postmark** has the best deliverability reputation for
transactional mail and costs more; **SES** is the cheapest at volume and much the most setup. Both
are a one-file change because of the seam.

### Step 2 — send from a subdomain

```
MAIL_FROM=noreply@mail.tradingroom.app
```

Keeps transactional sending reputation separate from the apex, so anything you later send from
`tradingroom.app` — or any deliverability mistake — does not contaminate password resets.

### Step 3 — three DNS records, all required

**It is four records, not three, and one of them is an MX.** Read off Resend's own DNS setup page
2026-08-09: verification requires an **MX** on the `send` host as well as the two TXT records. An
earlier draft of this step listed SPF/DKIM/DMARC and would have left the domain unverifiable.

| record | host (as Resend shows it) | purpose | consequence of omitting |
| --- | --- | --- | --- |
| **MX** | `send.mail.tradingroom.app` | required for verification and sending | the domain never verifies |
| **TXT (SPF)** | `send.mail.tradingroom.app` | authorises the provider to send as you | receivers treat it as forged |
| **TXT (DKIM)** | `resend._domainkey.mail.tradingroom.app` | signs the message; Resend supplies the key | Gmail and Outlook junk it |
| **TXT (DMARC)** | `_dmarc.tradingroom.app` | what receivers do on failure, and where to report | no visibility, weaker placement |

DMARC is ours to add — Resend's setup page does not mention it — and at the apex it covers the
subdomains too.

**Porkbun's Host field is relative to the registered domain**, so strip the trailing
`.tradingroom.app` from everything Resend displays: `send.mail.tradingroom.app` is entered as
`send.mail`, and `_dmarc.tradingroom.app` as `_dmarc`. Pasting the full name creates
`send.mail.tradingroom.app.tradingroom.app`, which resolves to nothing and looks identical to a
propagation delay.

**The two MX sets do not collide.** Resend's MX sits on `send.mail.tradingroom.app`; Porkbun's
forwarding MX sits on the apex. Different hosts, both valid at once.

Start DMARC at `p=none` and read the reports for a week before tightening to `p=quarantine`.
Tightening first, on an unverified setup, blackholes your own mail.

**Where the records go: Porkbun, not Vercel.** `dig NS tradingroom.app` answers
`fortaleza / maceio / salvador / curitiba .ns.porkbun.com` — Vercel serves the sites but does not
hold the zone, so these are added in Porkbun's DNS panel. Checked 2026-08-09.

**The zone is empty of mail records today** — `dig MX tradingroom.app`, `dig TXT tradingroom.app`,
`dig TXT mail.tradingroom.app` and `dig TXT _dmarc.tradingroom.app` all return nothing. So there is
no existing SPF to merge into and nothing to conflict with, and equally: nothing receives mail at
this domain right now, which is step 6.

### Step 4 — set the variables

```
RESEND_API_KEY=…
MAIL_FROM=noreply@mail.tradingroom.app
```

**`scripts/set-vercel-env.sh` does NOT write these two variables yet.** Checked 2026-08-09: it
carries eight `set_var` calls — `CONTROL_PLANE_MODE`, `PUBLIC_SITE_ORIGIN`, `DATABASE_URL`,
`ROOM_JWT_SECRET`, `ROOM_BASE_URL`, `RECAPTCHA_SECRET_KEY`, `PUBLIC_RECAPTCHA_SITE_KEY`,
`SUPERADMIN_EMAILS` — and neither `RESEND_API_KEY` nor `MAIL_FROM` appears anywhere in it. Following
this step as written would set nothing.

Two lines have to be added to that script, reading from `$ENVF`
(`~/Desktop/new-room-control/.env`) the way the others do, and the values have to exist in that file
first. Its guard then applies as designed — it refuses blank values and localhost addresses at write
time, `NEXT-SESSION.md` §8 for why.

### Step 5 — verify by RECEIVING, not by sending

Register a test account and confirm the mail **arrives in an inbox**, and check where: inbox or
spam. "The API returned 200" is not the same as "the user got it", and the difference is the entire
point of steps 2 and 3.

### Step 6 — a real mailbox

**This step costs nothing today, and the earlier draft implying otherwise was wrong.**

Porkbun is the registrar (step 3), and `porkbun.com/products/email_forwarding`, read 2026-08-09,
states that each domain includes **up to 20 free forwarding addresses**, with extras at $3/address
/year. So `support@tradingroom.app` forwards to an inbox that already exists, and the DMARC `rua=`
can point at the same place. Both free.

The forwarding is **receive-only** — Porkbun says so plainly: it is *"ideal if you're only looking
to receive emails … but don't need to respond from that same email address."* That is sufficient
here, because nothing sends as `support@`; the app sends as `noreply@mail.` and a human replies from
whatever inbox the forward lands in.

**DECIDED 2026-08-09: the owner is buying Porkbun hosted email for `support@tradingroom.app`** —
$3/month per address billed yearly ($36/year), 10GB, and it can SEND as the address. The free
forward was offered and declined: a reply arriving from a personal gmail address undercuts a paid
product, and that is a judgement about how the business presents, not about cost.

This is a purchase, not a prerequisite — nothing in the codebase depends on it, and the free forward
remains the fallback if it is ever cancelled. Recorded so it is not later "optimised away" by
someone reading only the price.

Two consequences worth knowing:

- **Do not also create a `support` FORWARD.** Porkbun's own KB states standard forwarding cannot use
  the same address as a hosted account; to copy mail onward you use a redirect filter inside webmail
  (Settings → Filters → Create) instead.
- **It does not disturb Resend.** Porkbun's hosted-email MX lands on the apex; Resend's sits on
  `send.mail.tradingroom.app`. Different hosts, both valid at once.

Google Workspace (~$6/user/month) and Fastmail / Zoho remain the alternatives if the mailbox ever
needs to be more than one address.

### Step 7 — build password reset — ✅ DONE 2026-08-09

**Built. It is inert until steps 1–4 above are done, and it says so on screen rather than
pretending.** `resetEnabled()` is `mailConfigured()`, so with `RESEND_API_KEY` and `MAIL_FROM`
unset the request page renders "not available on this deployment yet" instead of accepting an
address it cannot help. Setting those two variables turns the whole flow on; nothing else is
needed.

| | |
| --- | --- |
| request | `(public)/forgot-password` — the login link points here now, not at `/contact` |
| redeem | `(public)/reset-password?token=…` |
| policy | `lib/server/password-reset.ts` |
| the write | `setPasswordFromReset` in `lib/server/auth.ts` |

The token design is reused wholesale from `email-verification.ts` — issued once, stored only as a
SHA-256, single-use through the conditional `UPDATE … WHERE consumed_at IS NULL`. Six decisions on
top of it are worth knowing, because each is the answer to a specific way this goes wrong:

- **One hour, not 24.** A verification link proves an address; a reset link changes the password
  and signs a session in, which makes it the strongest credential this product ever puts in an
  inbox. `issueToken` took a `ttlMs` parameter for this.
- **The GET inspects, it does not consume.** `inspectToken` is new and exists only for this: the
  link is redeemed by the POST that follows, minutes later. Consuming on arrival would make every
  reset fail on submit.
- **The password is validated BEFORE the token is spent.** Otherwise a mistyped confirmation burns
  the single-use link and the person needs a whole new email to fix a typo.
- **The request form is not an account oracle.** One sentence — `GENERIC_REQUEST_ACK` — for an
  address with an account, one without, one inside its cooldown, and one whose message the provider
  just refused. That last case is why a delivery failure is logged rather than shown: an error here
  could only ever appear for an address that *has* an account, so during a provider outage it would
  hand back exactly the enumeration the generic message prevents.
- **Redeeming revokes every session**, in the same transaction as the password write. The usual
  reason for a reset is believing somebody else has the password; if their cookie survives it, the
  reset accomplished nothing. One fresh session is minted afterwards so the reset does not end on
  the login page, and a suspended account is refused there instead of looping.
- **Redeeming also marks the address proved.** Clicking a link in that mailbox is the identical
  claim the verification link makes, so somebody who never confirmed at signup is not left blocked
  by `emailIsProved` after recovering their account.

One request per address per minute (`RESET_COOLDOWN_MS`), and reCAPTCHA runs before the account
lookup — same ordering as registration, so an unverified submission cannot probe which addresses
exist. Neither is a general rate limiter; that belongs at the edge, the same caveat
`login-attempts.ts` carries.

One trap worth knowing, because it looks like an omission in the code: the reset page deliberately
does **not** carry `<meta name="referrer" content="no-referrer">`, even though it has a token in its
URL and `verify-email` does set it. A request whose referrer policy is `no-referrer` serialises its
`Origin` as `null`, and SvelteKit's CSRF check refuses a POST whose Origin does not match — so the
tag would break every reset while the page still rendered perfectly. `control-plane-policy.ts`
records the same collision being hit once already. The global `referrer-policy: same-origin` already
stops the token reaching any cross-origin destination.

Covered by `password-reset.test.ts`, `password-reset-pages.test.ts`, the extended
`email-verification.test.ts`, and `password-reset.db.test.ts` against a real PostgreSQL — the last
because three guarantees live entirely in the SQL and a stub cannot see them: single-use under
genuine concurrency (two redemptions fired at once, exactly one wins), the password write and the
session revocation rolling back together, and the `created_at DESC` ordering. The cooldown boundary, the consumed-token exclusion, the newest-row
ordering and the login link were each verified by breaking the implementation and watching the test
go red — the ordering case passed a broken implementation on the first attempt, because the fixture
happened to insert its rows in the order the sort would have produced.

---

## 5. The trap to know about before you flip it on

**`verificationEnforced()` becomes `true` the moment mail is configured.** That is correct — it is
what makes the room-creation gate real. Who it catches is narrower than it first looks, and the
answer required reading three files rather than one.

**Migration 1 already grandfathered the accounts that existed when it ran.**
`0001-email-verification.js:24`:

```sql
UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL;
```

with the reason stated in its own header: *"Retroactively marking the owner's own account
unverified — on a deployment that cannot yet send mail — would lock them out of the product with no
way back in. Verification applies from here forward."* It is deliberately the first non-idempotent
migration, which is why the migrator exists at all.

So the risk is real but **bounded to a specific window**:

| account | `email_verified_at` |
| --- | --- |
| existed when migration 1 ran | **backfilled to `created_at`** — verified, unaffected |
| registered AFTER migration 1, while mail was unconfigured | **NULL** — will be gated |
| registered after mail is configured | NULL until the link is clicked, which is the intent |

Registration confirms the middle row: `register/+page.server.ts:79-88` inserts `accountId`, `email`,
`displayName`, `passwordHash` and `createdAt` and **omits `emailVerifiedAt`**, and `schema.ts:89`
declares it nullable and NOT defaulted — a default would mark every future row verified, which is
the opposite of the point.

**So check rather than assume.** Whether your own account is in the safe row or the caught one
depends on when it was created relative to migration 1:

```sql
SELECT id, email, created_at, email_verified_at FROM users ORDER BY id;
```

**Run 2026-08-09 against the production database — one row, and it is the safe one:**

```
id | email                    | created_at                    | email_verified_at
 1 | billy.ribeiro@icloud.com | 2026-08-07 22:46:34.438+00    | 2026-08-07 22:46:34.438+00
```

The two timestamps are equal to the millisecond, which is the backfill's own signature —
`email_verified_at = created_at` is what migration 1 wrote. So the owner's account is in the FIRST
row of the table above, and **configuring mail today gates nobody**. This measurement expires the
moment anyone registers: re-run it before flipping the variables, not instead of.

Any row with a NULL will be gated out of creating rooms the moment mail is configured. The
account page carries a resend-the-link action, so the route back exists — but it is worth knowing
which rows those are before you set the variables rather than after.

An earlier version of this section claimed every pre-configuration account would be caught,
"including the owner's own". That was wrong: it read the registration path and the column default
and stopped there, without reading the migration that backfills them.

---

## 6. What email is NOT blocking

Worth stating, so this does not become a false dependency:

- The room deployment (`NEXT-SESSION.md` §3) needs no mail.
- The SFU and the hosting move need no mail.
- The mobile app's pairing flow uses a **six-digit PIN read off the screen**, not an emailed link —
  see `MOBILE-APP.md` §2a. No mail on that path either.

Email gates **real customer signups**, and nothing else. Sequence it accordingly: it is required
before you sell to anyone, and not required to get the product running end to end.
