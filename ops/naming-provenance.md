# Naming provenance: `ptr_clone` is the reference, `tradingroom` is the system

This repository reconstructs a live third-party application. Two naming schemes therefore coexist on
purpose, and confusing them is the single easiest way to break something here.

- **`ptr_clone*`** is the **reference**. It is what the original system called things. It appears in
  the captures, and in the one migration that IS a capture. It is evidence, and evidence is never
  edited.
- **`tradingroom*`** is **this system**. Every live object, every connection string, every
  environment variable, every crate.

If you are reading a capture and find a `ptr_clone*` name, this file tells you what it maps to. If
you are writing code and typing a `ptr_clone*` name, you are almost certainly making a mistake — see
"The boundary, and what enforces it" below.

## The mapping

| in the reference / captures | in this system | status |
| --- | --- | --- |
| `ptr_clone_app` — the runtime/application role | **`tradingroom_app`** | live role, renamed 2026-08-15 |
| `ptr_clone` — the owner/migrator role | `ptr_clone` | **not yet renamed** — see "Still open" |
| `ptr_clone` — the database name | `ptr_clone` | **not yet renamed** — see "Still open" |
| `ptr_clone` in `second-dump/**`, `docs/source/**`, the dumps | unchanged, forever | evidence |
| `ptr_clone_app` in migrations `0001`–`0007` | unchanged, forever | see below — this is the important one |

## Why the old name is permanent inside `0001_baseline.sql`

Not debt. Not an oversight. **`services/api/migrations/0001_baseline.sql` is byte-identical to the
captured schema of the original system.** Measured, not assumed:

```
services/api/migrations/0001_baseline.sql        c8baed853578437e18de0fae3406bfa1ee2791b2e625db8d13e2b72a51ac27d9
second-dump/db/RECREATE.sql                      c8baed853578437e18de0fae3406bfa1ee2791b2e625db8d13e2b72a51ac27d9
1960 lines, 95519 bytes, `cmp` reports identical
```

Two independent gates pin that hash from opposite directions — `apps/controller/scripts/verify-backend.mjs:47`
pins it as a migration, `apps/room/gate/verify-postgres-schema-artifacts.mjs:82` pins it as a
capture. That coincidence is the point: **the baseline being byte-identical to the capture is the
proof that the reconstruction is faithful.** Rewriting it with `tradingroom` names would not be
tidying up. It would destroy the only evidence that this schema is the schema that was rebuilt, and
it would edit a capture, which `CLAUDE.md` forbids for exactly this reason.

`0003`–`0007` grant to the literal `ptr_clone_app` and are byte-pinned by sqlx checksums. Editing any
of them makes every database that has already applied it refuse to migrate. They are history: a
record of what was applied, not a description of what exists now.

So the reference name survives in the migration *text* forever, while the live *role* is
`tradingroom_app`. Both statements are true simultaneously, and this table is where that is written
down.

## How the rename was actually done, and why not with `ALTER ROLE`

A rename is structurally impossible here, and the attempt is instructive.

`0009_rename_runtime_roles.sql` did `ALTER ROLE ptr_clone_app RENAME TO tradingroom_app`. PostgreSQL
roles are **cluster-global**; the sqlx ledger in `_sqlx_migrations` is **per-database**. So the second
database migrated on the same cluster ran `0001`, which re-creates `ptr_clone_app` when it is absent,
and then reached `0009` with both names present — where it raised
`P0001 both ptr_clone_app and tradingroom_app exist` by its own design.

Reproduced on seven databases on one cluster. Two further consequences were measured:

- On a cluster where the rename had **succeeded**, the next database's `0001` re-created
  `ptr_clone_app` through the baseline's forensic branch — a working TCP login whose password
  `CHANGE_ME_APP` is committed at `0001_baseline.sql:26`, holding DML on the tenant tables.
- `services/api/src/db/mod.rs` pins `EXPECTED_RUNTIME_ROLE` and `main.rs` asserts it at boot, so the
  API **could not start** against a cluster the rename had succeeded on.

The migration could therefore neither be deployed nor run twice. It was removed, and the rule it
broke is now enforced by `services/api/tests/migration_reappliability.rs`.

The replacement provisions `tradingroom_app` as an **additional** role with catalogue-driven parity —
every grant and every RLS policy membership discovered from `pg_catalog`, never a hand-typed list —
then the application, provisioning and CI cut over to it, and only then is `ptr_clone_app` retired by
a separate migration that refuses rather than cascades.

## The boundary, and what enforces it

**A `ptr_clone*` literal is allowed in exactly three places.** Anywhere else it is a bug.

1. Capture directories: `second-dump/**`, `docs/source/**`, the dumps and evidence trees.
2. Byte-pinned migrations `0001`–`0007`, where it is applied history.
3. This document, and prose that explains the mapping.

`naming-boundary` asserts that. **Its allow-list may shrink and must never grow.** If you find
yourself adding an entry, you are adding a live use of the reference name — which is the thing this
whole file exists to prevent.

## Still open

The **owner role** and the **database name** are both still `ptr_clone`. They should follow, as their
own change:

- Different mechanism: ownership and `CREATE DATABASE`, not RLS policy membership.
- Different blast radius: `EXPECTED_MIGRATOR_ROLE`, the preflight identity check, every
  `MIGRATE_DATABASE_URL`, and the provisioning scripts.
- Bundling them would mean one failure obscures the other.

Tracked in `TODO.md`. The same shape applies: add, prove, cut over, retire — never rename.
