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

  -- Counted, not assumed. A revoke loop that matched nothing looks identical to one that worked.
  SELECT (SELECT count(*) FROM information_schema.role_table_grants   WHERE grantee = 'ptr_clone_app')
       + (SELECT count(*) FROM information_schema.column_privileges   WHERE grantee = 'ptr_clone_app')
       + (SELECT count(*) FROM information_schema.role_routine_grants WHERE grantee = 'ptr_clone_app')
    INTO residual;

  IF residual <> 0 THEN
    RAISE EXCEPTION 'ptr_clone_app still holds % privilege facts after the revoke; refusing to drop', residual;
  END IF;

  -- No CASCADE. If a dependency this migration did not enumerate still exists, PostgreSQL says so
  -- and the chain stops, which is the outcome to want.
  DROP ROLE ptr_clone_app;

  RAISE NOTICE 'ptr_clone_app retired: privileges revoked and role dropped; % policies name tradingroom_app', runtime_policies;
END
$$;
