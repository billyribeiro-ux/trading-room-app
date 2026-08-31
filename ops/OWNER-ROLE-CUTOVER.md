# Cutting the owner role over: `ptr_clone` → `tradingroom`

**Status: the code half is done and proven. Steps 2–4 below are operator steps, each rehearsed on a
live PostgreSQL 16.13 cluster on 2026-08-31 and reproduced here verbatim.**

`TODO.md` prescribes the shape and names the failure to avoid:

> Same shape as the role: **add, prove, cut over, retire — never rename**, which is the mistake the
> withdrawn `0009_rename_runtime_roles` made.

A rename is not convergent. Roles are cluster-global while the migration ledger is per-database, so
renaming the owner changes a world every other database on the cluster still expects — including
databases created later. The four steps below never rename a role.

## Why the code had to change first

`EXPECTED_MIGRATOR_ROLE` was a single `&str`, and a single accepted name forces a **flag day**: the
database's ownership and the deployed binary must change in the same instant, and in the window
between them either the old binary refuses the new owner or the new binary refuses the old one.
Every deploy in that window fails closed against a database that is perfectly healthy.

`ACCEPTED_MIGRATOR_ROLES` is that window, expressed as an ordered allow-list of exactly two names.
It is **not** the tolerance that was removed from the runtime-role preflight: that one was a
catalogue lookup (`WHERE rolname IN ($1, $2) … LIMIT 1`) which returned role Y's posture when asked
about role X and so failed open. This is an equality test against three facts the server states
about the current connection, and all three must name the **same** accepted entry. See the docblock
on the constant.

The release attestation resolves the owner from the connection **once** and pins every downstream
check to that one name (`resolve_attested_owner`). So a database whose connection says one owner
while its tables still say the other — a half-finished `REASSIGN OWNED` — fails attestation, which
is the state a two-name comparison at each site would have waved through.

## Step 1 — add (done, in code)

Deployed as part of the change that added `ACCEPTED_MIGRATOR_ROLES`. Nothing to run.

Then, on the cluster, create the role. It is a superuser because it owns the schema and runs DDL;
that is the same posture `ptr_clone` has and it is why the runtime role is a different role entirely.

```sql
CREATE ROLE tradingroom LOGIN SUPERUSER PASSWORD '<from the secret store>';
```

## Step 2 — prove

Rehearsed with the real `migrate` binary, on a live cluster. Four cases, all four measured:

| # | connection | database owner | result |
| --- | --- | --- | --- |
| A | `tradingroom` | `tradingroom` | **exit 0** — 10 migrations, 10 successful; 3 tables, 22 RLS policies |
| B | `ptr_clone` | `ptr_clone` | **exit 0** — no regression for a cluster that has not moved |
| C | `stranger_owner` (a superuser) | `tradingroom` | **exit 1** — refused |
| D | `tradingroom`, then `SET ROLE ptr_clone` | `tradingroom` | **exit 1** — refused |

Case D is the one the allow-list has to keep refusing, and it is why the three facts are checked
together for one entry at a time rather than each against the list:

```
migrate failed: migration preflight requires the authenticated identity, session_user, and
current_user to all be tradingroom or ptr_clone; got session_user=tradingroom, current_user=ptr_clone
```

Reproduce D with `?options=-c%20role%3Dptr_clone` on the connection string.

## Step 3 — cut over, per database

Two statements, and they were run against a database carrying the full chain:

```sql
REASSIGN OWNED BY ptr_clone TO tradingroom;   -- run IN each database
ALTER DATABASE <db> OWNER TO tradingroom;     -- run from any database
```

Measured before and after on a fully-migrated database:

| | before | after |
| --- | --- | --- |
| database owner | `ptr_clone` | `tradingroom` |
| relations in `public` | `ptr_clone` × 129 | `tradingroom` × 129 |
| RLS policies | 22 | **22** |
| grants to `tradingroom_app` | 87 | **87** |

Neither the policies nor the runtime grants are touched by `REASSIGN OWNED`, which is the property
that makes this safe to do while the application is running. Afterwards the chain applies as
**either** owner — both were run, both exit 0 — which is exactly the window step 1 bought.

`REASSIGN OWNED` is per-database and does not reach objects in databases you are not connected to.
Run it in every database on the cluster, `postgres` included if anything there is owned.

### Renaming the database itself

Separate, and last:

```sql
ALTER DATABASE ptr_clone RENAME TO tradingroom;
```

It needs no open connections to that database. Rehearsed; the chain then applies to the renamed
database unchanged (`exit 0`). Update every `MIGRATE_DATABASE_URL` and `DATABASE_URL` before
cutting traffic back.

## Step 4 — retire

```sql
DROP ROLE ptr_clone;
```

**It refuses while any database still owns objects as that role, and it names them.** Measured:

```
ERROR:  role "ptr_clone" cannot be dropped because some objects depend on it
DETAIL:  33 objects in database interlock_probe
         154 objects in database tr_test
```

That is the fail-closed retirement `TODO.md` asks for — a `DROP ROLE` that refuses rather than one
that `CASCADE`s. Do not add `CASCADE`. The refusal is the checklist: work through the databases it
names, run step 3 in each, and try again.

## Step 5 — shrink the allow-list back to one name

Once every database on every cluster is owned by `tradingroom` and `ptr_clone` is gone:

1. `ACCEPTED_MIGRATOR_ROLES` becomes `["tradingroom"]`, and `EXPECTED_MIGRATOR_ROLE` becomes
   `"tradingroom"` — the constant that says what a cluster is PROVISIONED with, which is separate
   from the accept-list on purpose.
2. `the_migrator_allow_list_is_an_allow_list_and_not_a_shape` asserts both the length and
   `EXPECTED_MIGRATOR_ROLE`'s current value, so it fails on that edit and has to be updated
   deliberately. That is the point of asserting a constant's value: the shrink is a decision
   somebody makes, not something that drifts.

**`0001_baseline.sql` is not edited, ever.** It creates `ptr_clone` and is byte-identical to the
captured schema; its sha256 is pinned in `migrate.rs` and independently in
`scripts/verify-backend.mjs`. A cluster provisioned from the baseline after step 5 still gets a
`ptr_clone` role from that forensic branch, and the preflight will then refuse it — which is
correct, and is why step 5 waits for the operator to confirm no new cluster will be built from the
bare baseline. `ops/naming-provenance.md` records why the old name is permanent in the applied
migrations.
