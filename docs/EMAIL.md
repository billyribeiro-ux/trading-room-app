# Email — sending, receiving, and what is still missing

Written 2026-08-09. Same rule as the other documents: sourced or labelled.

---

## 1. Two different products, routinely confused

| | what it does | who sells it |
| --- | --- | --- |
| **Transactional sending** | *sends* verification links, password resets, invites | Resend, Postmark, SES |
| **Mailbox hosting** | *receives* mail at `support@tradingroom.app` | Google Workspace, Fastmail, Zoho |

You need **both**. A transactional provider will not give you an inbox, and a mailbox provider is
the wrong tool for programmatic sending at volume.

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
| `AbortSignal.timeout` on the request | 45 | a hung provider must not hold a registration request open |
| `mailConfigured()` needs **both** `RESEND_API_KEY` **and** `MAIL_FROM` | 65-67 | a key with no from-address produces a provider rejection at send time; being obviously off is better |
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

**Resend.** The adapter is already written against it, the free tier is 3,000/month, and DNS setup
is three records.

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

| record | purpose | consequence of omitting |
| --- | --- | --- |
| **SPF** | authorises the provider to send as you | receivers treat it as forged |
| **DKIM** | cryptographically signs the message; the provider supplies the keys | Gmail and Outlook junk it |
| **DMARC** | tells receivers what to do on failure, and where to report | no visibility, weaker placement |

Start DMARC at `p=none` and read the reports for a week before tightening to `p=quarantine`.
Tightening first, on an unverified setup, blackholes your own mail.

### Step 4 — set the variables

```
RESEND_API_KEY=…
MAIL_FROM=noreply@mail.tradingroom.app
```

Use `scripts/set-vercel-env.sh`, which refuses blank values and localhost addresses at write time —
see `NEXT-SESSION.md` §8 for why that guard exists.

### Step 5 — verify by RECEIVING, not by sending

Register a test account and confirm the mail **arrives in an inbox**, and check where: inbox or
spam. "The API returned 200" is not the same as "the user got it", and the difference is the entire
point of steps 2 and 3.

### Step 6 — a real mailbox

Google Workspace (~$6/user/month), or Fastmail / Zoho for less. You need somewhere `support@` and
your DMARC reports actually land. Resend will not receive mail for you.

### Step 7 — build password reset

The last piece, and straightforward once mail sends. Reuse the token design already proven in
`email-verification.ts`: issue, store only a hash, expire, single-use, and invalidate on use.

---

## 5. The trap to know about before you flip it on

**`verificationEnforced()` becomes `true` the moment mail is configured.**

That is correct behaviour — it is what makes the room-creation gate real — but it has an immediate
consequence: **accounts created while mail was unconfigured have `email_verified_at IS NULL`**, and
that includes the owner's own account. The instant `RESEND_API_KEY` and `MAIL_FROM` are set, those
accounts are gated out of creating rooms until they confirm.

There is a resend-the-link action on the account page, so the route back exists — but know this
before you set the variables, not after you are locked out of your own admin.

Check first:

```sql
SELECT id, email, email_verified_at FROM users WHERE email_verified_at IS NULL;
```

---

## 6. What email is NOT blocking

Worth stating, so this does not become a false dependency:

- The room deployment (`NEXT-SESSION.md` §3) needs no mail.
- The SFU and the hosting move need no mail.
- The mobile app's pairing flow uses a **six-digit PIN read off the screen**, not an emailed link —
  see `MOBILE-APP.md` §2a. No mail on that path either.

Email gates **real customer signups**, and nothing else. Sequence it accordingly: it is required
before you sell to anyone, and not required to get the product running end to end.
