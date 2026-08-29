# 0003 — Adopt the Vercel, Rust, PostgreSQL, and mediasoup production boundary

- Status: accepted
- Date: 2026-08-02
- Supersedes: the SQLite/file-move outcome in `docs/AMENDMENT.md`
- Affects: architecture, deployment modes, authentication, authorization, data ownership, media admission

## Context

The control UI now targets Vercel. Its current server code opens a process-local
SQLite file, but Vercel functions do not provide a shared durable application
filesystem. Vercel documents a read-only function filesystem with writable
`/tmp` scratch space, not durable shared storage. The repository already records
that SQLite is a local reconstruction boundary and must not become the product
data authority on Vercel.

The sibling `new-room` repository at exact commit
`f84bae3e92ed266a762b6cab68afc97bf36b4dcc` contains the selected Rust/Axum,
PostgreSQL/SQLx, and Rust mediasoup implementation. The forensic inventory proves
24 PostgreSQL domain tables, 327 domain columns, 21 tables with both enabled and
forced RLS, and four applied migrations. A full workspace test run on 2026-08-02
passed 230 API tests and 105 media tests.

That backend is not yet a complete SaaS control plane. It lacks routed signup,
tenant provisioning, room creation/administration, badges, account administrators,
customer API keys, subscriptions, and payment endpoints. Its untracked
`provision.rs` is not compiled and calls a nonexistent database method. Two
security drifts are also proven: the installed runtime role has `INHERIT`, contrary
to the intended `NOINHERIT`, and the `room_events` RLS policy targets `PUBLIC`
rather than only `ptr_clone_app`.

## Decision

The production topology is:

```text
browser
  -> SvelteKit UI/BFF on Vercel
  -> Rust/Axum control API
  -> PostgreSQL system of record
  -> separately deployed Rust mediasoup SFU for ephemeral live media
```

The responsibilities are fixed as follows:

- Vercel owns rendering, progressive web interactions, and a same-origin BFF
  boundary. It does not own durable product data or authorization policy.
- Rust/Axum owns authentication, account/tenant operations, validation,
  authorization, media-session issuance, and payment-webhook processing.
- PostgreSQL owns tenants, identities, sessions/refresh-token families,
  subscriptions, rooms, memberships, capabilities, durable room data, and audit/
  outbox records. Tenant RLS and application authorization remain distinct layers.
- mediasoup owns only ephemeral live media state. It accepts short-lived,
  audience/node-bound grants issued by the Rust control API.
- Redis remains deferred until a measured coordination or cache requirement exists.

The product will use one source repository with independently deployable surfaces.
The exact tracked Rust service tree will be imported as a reviewed follow-up slice;
the untracked provisioning prototype will not be imported.

Until the Rust/PostgreSQL boundary is deployed and integrated, Vercel defaults to
`CONTROL_PLANE_MODE=marketing-only`. That mode must not open a database connection,
expose account or room mutations, accept contact submissions, or advertise
Login/Register. That default is unchanged.

**Update — the SQLite half of this ADR is now executed.** The second mode is
`postgres`, not `local-sqlite`. It requires an explicit mode and a nonblank
`DATABASE_URL` and refuses to start without one. The PostgreSQL selection this ADR
made is therefore realised for the controller itself; what remains ahead is the
Rust/Axum API in front of it, which is a separate item and is not implied by this
change.

The `VERCEL=1` prohibition recorded below is withdrawn with the mode it guarded.
It existed because the platform's filesystem is ephemeral and per-instance, so a
SQLite file written there was lost between requests and no two instances agreed.
A network database has neither property, so Vercel is the intended host rather
than a rejected one, and `VERCEL` is no longer a declared environment variable.

The remainder of this section is the superseded local-SQLite boundary, kept as the
dated record of what was decided and implemented at the time. The module it
describes, `src/lib/server/db/private-sqlite.ts`, has been deleted. None of it is a
current claim; access control for the store is now the database server's own.

> Local SQLite accepts only the exact canonical `<root>/.data/control.sqlite`
> shape. The direct root must be canonical, process-owned, and not group- or
> other-writable. On supported POSIX hosts, bootstrap creates `.data`
> non-recursively, repairs a newly created directory after even a restrictive
> umask, and validates the directory and database through no-follow, nonblocking
> descriptors. An inaccessible pre-existing mode-`0000` directory fails for manual
> owner repair. The boundary requires a regular single-link database and exact
> post-repair modes `0700`/`0600`, but repairs only accessible existing files. A
> pre-existing owner-inaccessible mode-`0000` database, WAL, or SHM fails closed
> unchanged for manual owner repair. SQLite opens with `fileMustExist`, verifies
> writable WAL mode and foreign-key enforcement, and revalidates accessible
> existing WAL/SHM files after WAL initialization. The application and seed script
> share this one opener.

The locked bundled SQLite Unix VFS derives sidecar modes from the database mode,
so this boundary does not read or mutate the process umask. These checks contain
ordinary accidental exposure and stable symlink/FIFO/hard-link substitution for
the local single-user harness. They do not close path-swap races by any actor
able to mutate path ancestry, including a same-UID process or a principal with
write access to an ancestor, and are not a multi-user security boundary. The
direct-root validation does not prove that every ancestor is immutable.

The operational signal for a boundary violation is a startup or first-database-
use exception before a connection is returned; local account operations remain
unavailable. Recovery is deliberately non-destructive: quiesce every actor able
to mutate the path, inspect the trusted root, `.data`, and database/sidecars for
topology, ownership, and mode violations, restore the expected files or a
trusted local backup, then restart. This includes manual owner repair of
inaccessible `.data`, database, WAL, or SHM modes. The application does not
delete, replace, reset, or path-chmod an existing inaccessible database or
sidecar.

The Rust API's existing `__Host-` cookie contract requires same-origin browser
transport. The eventual BFF/proxy design must preserve that property or replace it
through a separate reviewed decision; a casual cross-origin token handoff is not
allowed.

## First backend slice

1. Import the exact tracked Rust services from commit `f84bae3…` without ambient
   untracked files.
2. Add a forward-only migration that scopes `room_events_tenant_isolation` to
   `ptr_clone_app`.
3. Enforce and test `NOBYPASSRLS`, `NOINHERIT`, no unexpected role memberships,
   and the intended policy role target at startup/integration boundaries.
4. Preserve the embedded migration checksums and rerun all Rust workspace tests.
5. Only then design an authenticated, read-only account/session bootstrap API.

Signup, payment, tenant provisioning, and account-page mutations are explicitly
outside that first slice because their authorization model is not yet proven.

## Consequences

- The old SQLite amendment is retained only as historical context and must not be
  executed.
- Existing SvelteKit account behavior remains useful for evidence and local UI
  verification, but it is not production backend behavior.
- The official domain can safely carry the marketing preview before the backend
  cutover, but it must remain non-indexable and collect no customer data.
- Each later endpoint moves as a vertical slice with cross-tenant denial,
  missing-session, malformed-input, expiry/replay, and leakage tests.
- Subscription entitlements and RBAC/ABAC remain separate server-side decisions.

## Verification

- `CONTROL_PLANE_MODE=marketing-only` boots with an intentionally impossible
  `DATABASE_URL`, serves only reviewed marketing GET/HEAD routes, and returns a
  guarded 503 for control-plane and mutation routes.
- Live marketing requests through the current reviewed route matrix, including
  matched route modules, perform no SQLite filesystem I/O. The SSOT makes import
  safety a standing rule for future server modules.
- The repository privacy gate rejects raw non-test email addresses, captured
  owner/JWT identity, encoded identity claims, and reversible Gravatar
  identifiers in the current tree.
- `pnpm quality` is required before this decision's implementation commit lands.
