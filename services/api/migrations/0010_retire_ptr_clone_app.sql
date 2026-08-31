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
-- privilege: 87 table grants, 922 column grants, 6 routine grants and USAGE on `public`. That is a
-- login-capable identity with broad DML rights on every table in a multi-tenant fintech database,
-- kept alive only because `0001_baseline.sql` names it.
--
-- ## Why this is a migration and not an operator step
--
-- `0001_baseline.sql` is byte-pinned forensic evidence and RE-CREATES this role on every new
-- database, so retirement cannot assume absence and cannot be done once by hand. It has to run in
-- the chain, after `0009`, on every database that will ever exist. That is the same convergence
-- argument `0009` makes about policies, and it is why the withdrawn `ALTER ROLE … RENAME` was wrong:
-- roles are cluster-global, so a rename collided on the second database, while a
-- revoke-then-drop reaches the identical end state every time.
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
    ── THE DROP IS BEST-EFFORT, AND THAT IS THE CLUSTER'S SHAPE RATHER THAN A COMPROMISE ─────────

    Everything above is PER-DATABASE and is this migration's actual contract: after it runs, this
    database grants `ptr_clone_app` nothing, and the assertion above proves it by count. The ROLE,
    though, is CLUSTER-GLOBAL — the same distinction `0009` draws about policies, arriving here with
    more force — so `DROP ROLE` fails while any OTHER database in the cluster still grants to it:

        ERROR:  role "ptr_clone_app" cannot be dropped because some objects depend on it
        DETAIL: 72 objects in database interlock_probe

    That is not hypothetical and it is not an error to route around. It is the normal state of a
    multi-tenant cluster part-way through a rollout: `0001` re-creates this role on every new
    database, so until the LAST database has run this migration, the role is legitimately still in
    use somewhere. A migration that failed there would block the chain on every database but the
    final one, in an order nobody controls.

    So the drop is attempted and exactly ONE failure is tolerated — `dependent_objects_still_exist`,
    SQLSTATE 2BP01, which is the specific answer meaning "another database still grants". Anything
    else propagates. This is not a silent catch: both outcomes announce themselves, and the one that
    leaves the role standing says why and what finishes it.

    No CASCADE, in either branch. Cascade would remove dependencies this migration has not
    enumerated, in databases it cannot see, which is the class of quiet action a schema change to a
    fintech cluster must never take.
  */
  BEGIN
    DROP ROLE ptr_clone_app;
    RAISE NOTICE
      'ptr_clone_app RETIRED: privileges revoked and role dropped; % policies name tradingroom_app',
      runtime_policies;
  EXCEPTION
    WHEN dependent_objects_still_exist THEN
      RAISE NOTICE
        'ptr_clone_app revoked in this database (% policies name tradingroom_app), and NOT dropped: another database in this cluster still grants to it. The role is inert here. It disappears when the last database has run this migration; until then it is correctly still present.',
        runtime_policies;
  END;
END
$$;
