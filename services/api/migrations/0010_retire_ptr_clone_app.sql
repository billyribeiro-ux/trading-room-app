-- Retire `ptr_clone_app`: revoke everything it holds, then drop it — and REFUSE unless the runtime
-- role has already taken over.
--
-- ## What this finishes
--
-- `0009_provision_tradingroom_app.sql` mirrored every privilege of `ptr_clone_app` onto
-- `tradingroom_app` and retargeted all 22 RLS policies to the runtime role alone. Measured on a
-- PostgreSQL 16.13 cluster built from `0001` forward on 2026-08-31: 87 table grants each, 22
-- policies naming `tradingroom_app` and none naming `ptr_clone_app`, and — the point of the whole
-- exercise — `ptr_clone_app` reading **zero rows** from a tenant table with a valid tenant GUC set,
-- because under FORCE ROW LEVEL SECURITY a role named by no policy sees nothing.
--
-- So the baseline role is already inert with respect to tenant data. What it still holds is object
-- privilege: 87 table grants, 26 column grants, 6 routine grants, USAGE on `public` and CONNECT on
-- the database. That is a login-capable identity with broad DML rights on every table in a
-- multi-tenant fintech database, kept alive only because `0001_baseline.sql` names it. Removing
-- exactly that, on every database, is what this migration is for.
--
-- ## Why this is a migration and not an operator step
--
-- `0001_baseline.sql` is byte-pinned forensic evidence and RE-CREATES this role on every new
-- database, so retirement cannot assume absence and cannot be done once by hand. It has to run in
-- the chain, after `0009`, on every database that will ever exist. That is the same convergence
-- argument `0009` makes about policies, and it is why the withdrawn `ALTER ROLE … RENAME` was wrong:
-- roles are cluster-global, so a rename collided on the second database.
--
-- This migration is therefore PER-DATABASE and revoke-only. It removes every privilege the baseline
-- role holds here and leaves the cluster-global role in place, because a chain that drops a
-- cluster-global role cannot be applied to the next database — see the long note at the end, and
-- the test run that established it.
--
-- ## THE INTERLOCK, which is the most important thing here
--
-- This migration REFUSES to drop the baseline role unless `tradingroom_app` exists and already
-- carries the policy membership that makes it the tenant-visible identity. Without that check, a
-- database where `0009` had not run — or had been rolled back — would lose its only privileged
-- application role and every tenant read would return nothing. Failing loudly on a database that is
-- not ready is correct; leaving it with no working runtime role is not.
--
-- Deliberately NOT `DROP OWNED BY … CASCADE`. Cascade would silently remove dependencies this
-- migration has not enumerated, which is precisely the class of quiet action a schema change to a
-- fintech database must not take. Everything revoked below is counted first and asserted to be zero
-- afterwards, so a `DROP ROLE` that still fails on a dependency is a real finding and must be read
-- rather than forced.
DO $$
DECLARE
  entry            record;
  runtime_policies bigint;
  residual         bigint;
BEGIN
  -- Idempotent: on a re-run the role is already gone and there is nothing to do.
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'ptr_clone_app') THEN
    RAISE NOTICE 'ptr_clone_app is already retired';
    RETURN;
  END IF;

  -- THE INTERLOCK. `0009` retargets all 22 policies to the runtime role; if that has not happened,
  -- dropping the baseline role would leave this database with no identity the policies admit.
  SELECT count(*) INTO runtime_policies
    FROM pg_catalog.pg_policy
   WHERE 'tradingroom_app'::regrole::oid = ANY (polroles);

  IF runtime_policies = 0 THEN
    RAISE EXCEPTION
      'refusing to retire ptr_clone_app: tradingroom_app is named by no RLS policy, so 0009 has not taken effect on this database';
  END IF;

  -- Revoke, catalogue-driven, in the order that leaves nothing behind: routines and columns are
  -- covered by the table-level revoke in most cases, but are enumerated separately because a column
  -- grant can outlive its table grant and a routine grant is not a table grant at all.
  FOR entry IN
    SELECT DISTINCT quote_ident(table_schema) || '.' || quote_ident(table_name) AS relation
      FROM information_schema.role_table_grants
     WHERE grantee = 'ptr_clone_app'
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %s FROM ptr_clone_app', entry.relation);
  END LOOP;

  /*
    COLUMN-LEVEL ACLs, and they need their own loop — this migration's own assertion is what proved
    it. `REVOKE ALL PRIVILEGES ON TABLE` does not touch a grant made on a COLUMN: the two are stored
    separately, `pg_class.relacl` against `pg_attribute.attacl`. The first draft revoked tables and
    routines only, counted the residue, and refused to drop with *"still holds 26 privilege facts"* —
    which is the interlock doing exactly what it is for.

    Read from `pg_attribute.attacl` rather than from `information_schema.column_privileges`, because
    that view reflects table-level grants down onto every column and would have this loop revoking
    922 things that are not column grants at all. The catalogue distinguishes them; the view does not.
  */
  FOR entry IN
    SELECT attribute.attrelid::regclass::text AS relation,
           quote_ident(attribute.attname)     AS column_name
      FROM pg_catalog.pg_attribute AS attribute
      CROSS JOIN LATERAL aclexplode(attribute.attacl) AS acl
     WHERE attribute.attacl IS NOT NULL
       AND acl.grantee = 'ptr_clone_app'::regrole::oid
     GROUP BY 1, 2
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES (%s) ON TABLE %s FROM ptr_clone_app',
                   entry.column_name, entry.relation);
  END LOOP;

  FOR entry IN
    SELECT DISTINCT quote_ident(routine_schema) || '.' || quote_ident(routine_name) AS routine
      FROM information_schema.role_routine_grants
     WHERE grantee = 'ptr_clone_app'
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON FUNCTION %s FROM ptr_clone_app', entry.routine);
  END LOOP;

  FOR entry IN
    SELECT DISTINCT quote_ident(nspname) AS schema_name
      FROM pg_catalog.pg_namespace
     WHERE has_schema_privilege('ptr_clone_app', nspname, 'USAGE')
       AND nspname NOT LIKE 'pg\_%'
       AND nspname <> 'information_schema'
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON SCHEMA %s FROM ptr_clone_app', entry.schema_name);
  END LOOP;

  /*
    THE DATABASE ITSELF, and leaving it out is what made the first run fail — correctly.

    `CONNECT` is granted on the DATABASE, which is a different ACL from anything above, and
    `DROP ROLE` refuses while it stands: `ERROR: role "ptr_clone_app" cannot be dropped because
    some objects depend on it / DETAIL: privileges for database …`. That is the interlock working
    rather than an obstacle to route around — the role is a LOGIN role, so a deployment that has
    ever let it connect holds exactly this grant, and a retirement that forgot it would leave a
    droppable-looking role that is not.

    `current_database()` rather than a literal: this migration runs on whatever database the chain
    is applied to, and naming one would work on the developer's and fail on the tenant's.
  */
  EXECUTE format('REVOKE ALL PRIVILEGES ON DATABASE %I FROM ptr_clone_app', current_database());

  /*
    Counted, not assumed — a revoke loop that matched nothing looks identical to one that worked.

    Read from the CATALOGUE rather than from `information_schema`, and across every class an ACL can
    live in, because those are the entries `DROP ROLE` itself walks. The view-based count that stood
    here was both too narrow (no database, schema or type ACL) and too wide (`column_privileges`
    reflects table grants onto every column, so it reported 922 where 26 column ACLs existed). A
    residual check that disagrees with the thing it is protecting is not a check.
  */
  SELECT (SELECT count(*) FROM pg_catalog.pg_database  d, aclexplode(d.datacl)  a WHERE a.grantee = 'ptr_clone_app'::regrole::oid)
       + (SELECT count(*) FROM pg_catalog.pg_namespace n, aclexplode(n.nspacl)  a WHERE a.grantee = 'ptr_clone_app'::regrole::oid)
       + (SELECT count(*) FROM pg_catalog.pg_class     c, aclexplode(c.relacl)  a WHERE a.grantee = 'ptr_clone_app'::regrole::oid)
       + (SELECT count(*) FROM pg_catalog.pg_attribute t, aclexplode(t.attacl)  a WHERE a.grantee = 'ptr_clone_app'::regrole::oid)
       + (SELECT count(*) FROM pg_catalog.pg_proc      p, aclexplode(p.proacl)  a WHERE a.grantee = 'ptr_clone_app'::regrole::oid)
       + (SELECT count(*) FROM pg_catalog.pg_type      y, aclexplode(y.typacl)  a WHERE a.grantee = 'ptr_clone_app'::regrole::oid)
       + (SELECT count(*) FROM pg_catalog.pg_default_acl f, aclexplode(f.defaclacl) a WHERE a.grantee = 'ptr_clone_app'::regrole::oid)
    INTO residual;

  IF residual <> 0 THEN
    RAISE EXCEPTION 'ptr_clone_app still holds % privilege facts after the revoke; refusing to drop', residual;
  END IF;

  /*
    ── AND IT STOPS HERE. THE ROLE IS NOT DROPPED, AND THAT IS THE WHOLE DESIGN ──────────────────

    This migration ended with `DROP ROLE ptr_clone_app` until 2026-08-31, tolerating
    `dependent_objects_still_exist` for the mid-rollout case. `migration_reappliability.rs` refused
    it, and the refusal was right. Two runs, one cluster, measured:

        the_chain_applies_to_a_second_database_on_the_same_cluster ... FAILED

    The first database applied the chain and dropped the role, because by then it was the only one
    granting. The SECOND database then could not start its chain at all: the migrate preflight
    requires `ptr_clone_app` to exist BEFORE `0001` runs, since `0001` would otherwise reach its
    forensic branch and create the role with the placeholder password committed at its line 26.

    That is the exact rule this repository already states, in that file's own header:

        A migration may mutate cluster-global state only if that mutation is convergent under
        repeated application from version 1 on the same cluster.

    A dropped role is not convergent. `0001` restores it only through the branch the preflight
    forbids, so the drop destroys a starting condition the chain cannot legitimately rebuild. It is
    the same shape as the withdrawn `0009` rename, arriving by a different route — and it would have
    reached production as "the second tenant database can never be created".

    ── WHAT IS ACTUALLY REMOVED, WHICH IS THE ENTIRE RISK ────────────────────────────────────────

    The risk was never that a row existed in `pg_authid`. It was a login-capable identity holding
    DML on every table of a multi-tenant fintech database. After the revokes above, on this database
    `ptr_clone_app` holds: no table grant, no column grant, no routine grant, no schema USAGE, no
    default ACL, and no CONNECT. `0009` already removed it from all 22 RLS policies, so under FORCE
    ROW LEVEL SECURITY it reads zero rows from every tenant table even where a policy-free path
    exists. The residual assertion above proves each of those by count rather than by claim.

    What remains is a role that can authenticate and reach nothing. That is a bounded, stated
    residual, and it is the price of a chain that converges on every database the cluster will ever
    hold.

    ── THE ROLE ITSELF IS AN OPERATOR STEP, DELIBERATELY, AND IT IS SAFE ─────────────────────────

    Once a cluster will take no further NEW databases — the only case that needs `0001` to run
    again — an operator may finish the job by hand:

        DROP ROLE ptr_clone_app;   -- refuses, correctly, while any database still grants

    `DROP ROLE` without CASCADE is its own interlock: it refuses while any database in the cluster
    still holds a grant, so it cannot succeed before every database has run this migration. Nothing
    here needs to force it, and nothing here should.

    That step does not brick the deployment, and that is not an assumption either:
    `db::migrate::baseline_role_absence_policy` accepts an absent baseline role on exactly the
    databases whose ledger already records `0001` applied and successful — where the branch the
    fence guards can no longer run. Measured on a live PostgreSQL 16.13 cluster on 2026-08-31, the
    `migrate` binary against such a database went from `exit 1` to `exit 0` with the tenancy intact
    at 87 grants and 22 policies. On a database that has NOT applied `0001`, an absent role is still
    refused, so the fence is untouched where it can act.

    No CASCADE appears in this migration, in any branch. Cascade would remove dependencies this
    migration has not enumerated, in databases it cannot see — the class of quiet action a schema
    change to a fintech cluster must never take.
  */
  RAISE NOTICE
    'ptr_clone_app RETIRED in this database: every privilege revoked, 0 residual, % policies name tradingroom_app. The role is left in place because dropping it is not convergent across a cluster; see this migration.',
    runtime_policies;
END
$$;
