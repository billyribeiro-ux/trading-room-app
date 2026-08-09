# Running it locally

Written 2026-08-09, the day the controller was first run locally against a real database in this
repository. Everything below was executed, not planned.

---

## The one thing that makes the difference

**Without `DATABASE_URL`, the app is not broken — it is in `marketing-only` mode**, which serves
four static routes and answers **503** to everything else, including `/login`, `/account` and the
password-reset pages. `resolveControlPlaneMode` defaults to it when the variable is absent
(`control-plane-policy.ts`), and it is a deliberate fail-closed default rather than a bug.

So a local server that 503s the whole app is telling you the truth about its configuration. Set the
two variables below and it becomes the real thing.

---

## Setup, once

```bash
# 1. A local PostgreSQL. It was already running on this machine via Homebrew.
brew services start postgresql@16
createdb -h 127.0.0.1 -p 5432 tradingroom_dev

# 2. Point the app at it. In apps/controller/.env:
#      CONTROL_PLANE_MODE=postgres
#      DATABASE_URL=postgres://127.0.0.1:5432/tradingroom_dev

# 3. Run it. The schema builds itself on the first request — `ensureDatabase()` runs the
#    migrator, so an empty database is the expected starting point, not a problem.
cd apps/controller && pnpm dev          # http://127.0.0.1:5173
```

**`tradingroom_dev` is a NEW database, created empty.** The older `newroom_control_dev` on the same
cluster is from before the consolidation and was left untouched — it still holds two user rows.
Nothing in this repository points at it.

**Never point this at Neon.** The production database is one connection string away, and a dev
server aimed at it makes every experiment a production write. That is what the local cluster is for.

---

## Mail is deliberately OFF locally, and that is the safe state

`apps/controller/.env` is loaded by Vite, so everything in it configures the dev server.
`RESEND_API_KEY` and `MAIL_FROM` used to live there **and** be the source `scripts/set-vercel-env.sh`
pushed to production from — one file doing two jobs.

The consequence was not hypothetical. Testing password reset on a local server sent **live email
through the production Resend key**, to a fake `@example.test` address, which hard-bounces against a
sending domain that is days old. Nothing in the output said so: the provider accepted the message,
so no error was logged, and only the absence of an error revealed it.

They now live in **`apps/controller/.env.deploy`**, which nothing reads at runtime. A local server
is therefore mail-unconfigured, and `mail.ts` is explicitly built for that state — it sends nothing
and does not enforce verification, rather than half-working. `/forgot-password` renders "not
available on this deployment yet" instead of accepting an address it cannot help.

**Do not put a real Resend key back in `.env` to test the reset flow.** Mint a token instead.

---

## Exercising password reset locally

The token is never stored — only its SHA-256 — so it cannot be read back out of the database. Mint
one through the app's own `issueToken`, against the dev database:

```ts
// apps/controller/src/lib/server/zz-mint.db.test.ts — TEMPORARY, delete after use.
import { expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
vi.mock('$app/env/private', () => ({
  get DATABASE_URL() { return 'postgres://127.0.0.1:5432/tradingroom_dev'; },
  get SUPERADMIN_EMAILS() { return ''; },
  get RESEND_API_KEY() { return ''; },
  get MAIL_FROM() { return ''; }
}));
it('mints', async () => {
  const { issueToken } = await import('./email-verification');
  const { RESET_TTL_MS } = await import('./password-reset');
  const t = await issueToken({ userId: 1, email: 'you@example.test', purpose: 'reset-password', ttlMs: RESET_TTL_MS });
  writeFileSync(process.env.TOKEN_OUT!, t);
  expect(t.length).toBeGreaterThan(20);
});
```

```bash
TOKEN_OUT=/tmp/token.txt pnpm vitest run --config vitest.db.config.ts src/lib/server/zz-mint.db.test.ts
rm src/lib/server/zz-mint.db.test.ts     # it is scaffolding; do not leave it in the tree
open "http://127.0.0.1:5173/reset-password?token=$(cat /tmp/token.txt)"
```

Note that issuing a token **consumes any previous unconsumed one** for the same user and purpose, so
minting twice invalidates the first — which is the intended behaviour, not a quirk of the harness.

---

## What was verified this way

Driven end to end against the running server and a real PostgreSQL on 2026-08-09:

| | |
| --- | --- |
| register | account, user and first room created; `email_verified_at` NULL as designed |
| `GET /reset-password?token=…` | renders the form and **does not consume** — proven by re-reading the row after two GETs |
| POST with mismatched confirm | refused, and the link **survives** — one live token before and after |
| POST with a short password | same |
| POST, valid | 303 to `/account`, token consumed, address marked proved, fresh session cookie set |
| the new password | signs in; two further sign-ins made three live sessions |
| a second reset | **3 sessions → 1**, and both older device cookies then got 303 off `/account` |
| the old password | "Those credentials are not valid." |
| `/forgot-password` POST | byte-identical acknowledgement for an address that exists, one that does not, and one inside its cooldown |
| the cooldown | second request within a minute issued no second token |

---

## Ports

`5173` controller, `5174` room, and both are declared rather than defaulted — `vite.config.ts`
explains why. **Other projects on this Desktop use the same range**, so check what owns a port before
concluding anything from what answers on it.

```bash
lsof -ti :5173
```
