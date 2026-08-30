# proroom-control

The room controller: where an account owner logs in, creates rooms, and configures
every aspect of how a room behaves — the SaaS control plane that sits in front of the
live trading room.

Engineering changes are governed by the normative
[`docs/ENGINEERING-SSOT.md`](docs/ENGINEERING-SSOT.md). Start there before changing
architecture, Svelte behavior, evidence-backed UI, security boundaries, or quality
gates.

The dated, full-corpus Svelte/SvelteKit implementation audit and agent rerun
instructions live in
[`docs/SVELTE-CONFORMANCE-AUDIT.md`](docs/SVELTE-CONFORMANCE-AUDIT.md).

For the current framework API surface — which functions to use, how to use them,
and the repo rules that override a framework default — see
[`CLAUDE.md`](CLAUDE.md). It is the day-to-day companion to the audit above.

**Production boundary.** ADR 0003 selects SvelteKit/Vercel as the UI+BFF,
Rust/Axum as the control API, PostgreSQL as the system of record, and a separately
deployed mediasoup SFU. The controller now runs on PostgreSQL, so the UI+BFF and
the system of record are both in their selected form; the Rust control API and the
SFU are the parts still ahead. See `docs/ARCHITECTURE.md` and
`docs/PRODUCTION-CUTOVER-PLAN.md`; the former file-move amendment is superseded.

---

## Stack

| Layer                     | Choice                                                  | Why                                                                                                                          |
| ------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Framework                 | SvelteKit 2.70 · Svelte 5.56 (runes)                    | pinned and verified by the repository gate                                                                                   |
| Language                  | TypeScript 6.0, strict                                  |                                                                                                                              |
| Controller database       | PostgreSQL via `postgres` 3.4 (postgres-js)             | one driver for local and serverless; pooled endpoint in production                                                           |
| Production data authority | PostgreSQL behind the Rust/Axum API                     | selected in ADR 0003; cutover is gated                                                                                       |
| Controller ORM            | Drizzle 0.45 (stable)                                   | the 1.0 line is a release candidate and is deliberately not adopted mid-migration                                            |
| Adapter                   | `@sveltejs/adapter-vercel` 6.3                          | official production target for the control-plane frontend                                                                    |
| Icons                     | Font Awesome 4.3.0 and 5.8.1                            | the controller and room entry are separate captured visual systems; their exact ownership is documented in the font contract |
| Styling                   | evidence-derived `src/{account,manage,public,auth}.css` | isolated visual systems with executable pixel/breakpoint contracts                                                           |
| Environment validation    | Valibot 1.4                                             | documented Standard Schema boundary for explicit SvelteKit environment variables                                             |
| Test                      | Vitest 4                                                |                                                                                                                              |

pnpm is the only supported JavaScript package manager. `package.json#packageManager`
pins the pnpm release, `pnpm-workspace.yaml` fixes the repository boundary and
native build allow-list, and `pnpm-lock.yaml` is the sole JavaScript dependency
lock; do not create npm, Yarn, or Bun lockfiles. The Rust workspace uses the
repository-pinned toolchain and the sole `services/Cargo.lock`; nested crate locks
are invalid. Dependency review remains an explicit release gate—pinning is not an
audit claim. Alignment with a sibling checkout does not override either lock or
ADR 0003. Typography and icon-version ownership are defined in
[`docs/reference/font-contract.md`](docs/reference/font-contract.md).

## Run it

```bash
pnpm install
cp .env.example .env
pnpm dev          # http://127.0.0.1:5300
```

Local operation requires `CONTROL_PLANE_MODE=postgres` and a `DATABASE_URL`
pointing at a PostgreSQL server. Bootstrap is forward-only and idempotent: every
CREATE is `IF NOT EXISTS` and every ALTER is `ADD COLUMN IF NOT EXISTS`, so it may
add missing columns, backfill missing public room IDs, and seat a missing owner
membership, but it never resets or deletes an existing database.

```bash
createdb tradingroom_dev
# DATABASE_URL=postgres://<user>@localhost:5432/tradingroom_dev
```

On a serverless host, point `DATABASE_URL` at the provider's **pooled** endpoint.
Each function instance opens its own connection, so the pool that matters is the
one in front of the database rather than one held in the process; the driver is
configured with `max: 1` and `prepare: false` to match a transaction-mode pooler.

### Why this is no longer SQLite

The controller previously kept a local SQLite file, hardened by roughly 300 lines
of descriptor, mode and symlink checks, with a documented refusal to run on Vercel
at all. That was a containment control for a single-OS-user reconstruction, and it
could never be the deployed shape: Vercel's filesystem is ephemeral and
per-instance, so writes were lost between requests and no two instances agreed.
PostgreSQL is reachable over the network, so the platform prohibition is gone and
Vercel is now the intended host. The hardening module retired with the file it
protected.

Set `API_KEY_ENCRYPTION_KEY` to independent random secret material in production
so customer API credentials can be displayed to their authenticated owner while
remaining encrypted at rest. Existing local setups fall back to
`ROOM_JWT_SECRET`; production should not share those keys.

```bash
pnpm check           # svelte-check
pnpm test            # schema, evidence, runtime contracts + vitest
pnpm quality         # zero-warning check + tests + production build
pnpm privacy:verify  # reject current-tree captured owner identifiers
pnpm runtime:http    # prove the public runtime fails closed without a database
pnpm schema:extract  # regenerate the settings schema from tracked evidence
pnpm schema:verify   # prove deterministic generation and exact committed bytes
pnpm backend:check   # locked non-database Rust gate; DB-backed CI is separate
pnpm backend:release:verify # static API artifact/tool/vulnerability-policy contract
pnpm backend:postgres:attest --format json # read-only target proof; requires both DB URLs
```

## Layout

```
evidence-dumps/               raw reference artifacts, isolated from application code
src/
  account.css manage.css      active controller styles, measured and contracted
  public.css auth.css         active marketing and room-entry visual systems
  app.html app.d.ts env.ts hooks.server.ts
  lib/
    room-settings-schema.ts   GENERATED — 268 extracted + 1 reviewed = 269. Do not hand-edit.
    room-config.ts            the precedence seam (policy vs default vs room-only)
    server/
      auth.ts                 scrypt passwords, session cookies, requireOwnedRoom()
      rooms.ts                repository + the updateUser opcode map
      db/{index,schema}.ts    local Drizzle schema, forward-only bootstrap
  routes/
    (public)/                 marketing, login, and room-entry routes
    (app-auth)/               registration under controller chrome
    (app)/account/            rooms · badges · admins · API keys · room manager
scripts/
  capture-ptr-reference.js        paste into DevTools to capture a reference page
  decode-ptr-dump.mjs             explode a dump into readable slices
  extract-manage-schema.mjs       tracked served DOM → typed settings schema
  verify-room-settings-schema.mjs deterministic regeneration + exact-byte gate
services/
  Cargo.toml Cargo.lock        Rust workspace and sole Rust dependency lock
  api/ media/                  independently deployable control API and SFU
CLAUDE.md                      current framework API surface and repo overrides
docs/
  SVELTE-CONFORMANCE-AUDIT.md  official-doc audit, changes, exceptions, rerun guide
  EVIDENCE-DUMPS-REORGANIZATION-REPORT.md  relocation audit and complete evidence inventory
  PROCESS.md                  how the specification was produced, and its limits
  ARCHITECTURE.md             the two tiers, the seam, roles, authorization
  AMENDMENT.md                superseded historical file-move design
  reference/                  decoded specification, manifests, and non-runtime CSS evidence
```

## The specification

This project is built from evidence, not from memory. Two pages of the live reference
app were captured to the DOM node, decoded, and read end to end; the result is 44
component-level documents in `docs/reference/pieces/`, each carrying a full node
table, every attribute, resolved absolute computed styles, the verbatim copy deck,
and its own honest gaps.

Start at **`docs/reference/pieces/INDEX.md`**. It includes a supersession table for
the 12 claims that later passes overturned — where two documents disagree, that table
decides.

`docs/PROCESS.md` explains how the evidence was produced, including the three bugs
found in the tooling along the way and what each would have caused.

## What is real today

- 268 settings extracted with real labels, help text, types and captured values,
  plus the reviewed `roomType` product deviation: 269 total
- The precedence seam, classifying all 268 as policy / default / room-only
- Data model for accounts, rooms, settings, membership, badges, admin users, API keys
- Password auth with per-account room scoping

**104 of 269 settings are wired**, measured 2026-08-30 and checked on every run by
`scripts/verify-room-settings-schema.mjs`. The exact names are explicit input to
`scripts/extract-manage-schema.mjs`, each backed by a real consumer. The other
165 entries remain `wired: false`: the controller can store them, but the room does
not yet consume them. The flag changes only with a real consumer and its test.

> **Superseded 2026-08-29.** This paragraph read _"33 of 269 settings are wired … the other 257
> entries remain `wired: false`"_. Both halves were wrong: the count had tripled without the sentence
> moving, and 33 + 257 is 290 rather than 269, so the arithmetic never described this schema at all.

Superseded numbers are kept in a blockquote, here and in the three sibling documents. That is a
convention `scripts/verify-room-settings-schema.mjs` relies on: it checks every live wired and
unwired count in these files and skips blockquoted lines, so history can be recorded without a stale
number failing the build — or, worse, without the gate being loosened to let it pass.

## What the evidence cannot support

Named here rather than discovered later. Full list in `docs/PROCESS.md` §6.

- **No screenshot exists in either capture**, so pixel-perfection can be specified
  from this evidence but not verified against it.
- **The tracked Manage capture leaves 114 of its 268 extracted settings unset**;
  154 carry a captured value. The reviewed `roomType` deviation has no captured
  value. Populated badge, API-key, admin-user, and multi-room states require their
  own evidence and must not be inferred from this setting capture.
- **Login and registration forms are captured, but acquisition is not complete.**
  `evidence-dumps/login-page/login` and
  `evidence-dumps/register-page/register-page-file` preserve the original forms.
  Contact, plan selection, checkout/payment, populated marketplace, and other
  populated-account states remain uncaptured. See `docs/reference/public-site.md`.
- **The `authMode` option list is not in the DOM** — only the selected label.

Each is one capture away from being closed: run `scripts/capture-ptr-reference.js` on
the relevant page of a populated account.

## Personal data

The captures originally contained real member names, emails, reversible Gravatar
identifiers, and a live JWT. The current tracked tree is redacted to stable tokens
and guarded by `pnpm privacy:verify`; sensitive original JSON remains gitignored.
Legacy public Git objects require a separately authorized history rewrite for full
erasure. See `docs/reference/REDACTIONS.md`.

No user-identifying value from the capture may be hard-coded. Every such value comes
from the database at runtime or renders as an explicit empty state.
