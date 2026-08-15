-- Provision `tradingroom_app` with exact parity to `ptr_clone_app`, catalogue-driven.
--
-- ## What this replaces, and why the previous attempt could not work
--
-- The first `0009` did `ALTER ROLE ptr_clone_app RENAME TO tradingroom_app`. PostgreSQL roles are
-- CLUSTER-global; the sqlx ledger in `_sqlx_migrations` is PER-DATABASE. `0001_baseline.sql`
-- re-creates `ptr_clone_app` whenever it is absent, so the SECOND database migrated on the same
-- cluster reached the rename with both names present and it refused by its own design. The chain was
-- applicable exactly once per cluster. Reproduced on seven databases.
--
-- Two further consequences were measured, and either alone disqualifies a rename:
--   * on a cluster where the rename had SUCCEEDED, the next database's `0001` re-created
--     `ptr_clone_app` through the baseline's forensic branch - a working TCP login whose password
--     `CHANGE_ME_APP` is committed at `0001_baseline.sql:26`, holding DML on the tenant tables;
--   * `src/db/mod.rs` pins the expected runtime role and `main.rs` asserts it at boot, so the API
--     could not start against a cluster the rename had succeeded on.
--
-- `0001` cannot be edited to fix this: it is BYTE-IDENTICAL to the captured schema of the original
-- system (sha256 c8baed85...27d9, 1960 lines), pinned as a migration by `verify-backend.mjs` and as
-- evidence by `verify-postgres-schema-artifacts.mjs`. That identity is the proof the reconstruction
-- is faithful. `ptr_clone_app` therefore stays in the migration TEXT permanently while the live role
-- becomes `tradingroom_app`. `ops/naming-provenance.md` records that mapping.
--
-- So: ADD the role, never rename it. This migration is convergent - `0001` re-creating
-- `ptr_clone_app` on the next database is harmless, because nothing here depends on that role being
-- absent. Note the asymmetry, which is the whole lesson: ROLES are cluster-global and are therefore
-- added beside the baseline, while POLICIES are per-database and are therefore RETARGETED onto the
-- runtime role alone. Both halves reach the same end state on every database. See the policy block.
--
-- ## Why catalogue-driven rather than a list
--
-- Parity is 142 privilege-bearing facts plus 11 role-level invariants: 1 schema grant, 87 relation
-- privileges, 922 column privileges, 6 routine privileges, and membership of 22 RLS policies. Nobody
-- maintains that by hand correctly for twenty years, and a table added next year must be covered
-- without anyone remembering. Every statement below discovers its subjects from `pg_catalog`.
--
-- ## The failure mode this is written against
--
-- Object privileges alone are NOT parity, and the gap fails open in exactly one place. A role with
-- byte-identical grants but no RLS policy membership sees ZERO rows on the 22 protected tables -
-- deny-by-default, so that direction fails CLOSED and is merely broken.
--
-- But `users`, `enterprises` and `refresh_tokens` carry grants and NO row-level security. There the
-- COLUMN GRANT IS THE ENTIRE TENANT BOUNDARY. Granting `SELECT ON users` instead of the exact
-- columns silently exposes `email_hash`, `avatar_url`, `phone` and `discord_id` cluster-wide, and
-- nothing fails. That is why column privileges are replayed at column precision below, and why the
-- final assertion compares column counts and not just relation counts.

DO $$
DECLARE
  source_role  CONSTANT name := 'ptr_clone_app';
  target_role  CONSTANT name := 'tradingroom_app';
BEGIN
  -- Cluster-global, and every other database on this cluster shares it. Serialised for the same
  -- reason `0005` takes this lock: parallel migration runs reproduced PostgreSQL's
  -- "tuple concurrently updated" on `pg_authid` and this migration writes there too.
  LOCK TABLE pg_catalog.pg_authid IN SHARE ROW EXCLUSIVE MODE;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = source_role) THEN
    RAISE EXCEPTION
      'runtime role % is absent; provisioning must create it before this migration', source_role;
  END IF;

  -- Deliberately created WITHOUT a password. A role that cannot authenticate is useless until
  -- provisioning sets one, which is strictly safer than `0001`'s committed `CHANGE_ME_APP`
  -- placeholder - the very branch `src/db/migrate.rs` keeps a preflight fence against. The posture
  -- mirrors `10-provision-roles.sh` and `0005`: NOBYPASSRLS is the one that matters, because a role
  -- that bypasses RLS passes every isolation test for entirely the wrong reason.
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = target_role) THEN
    EXECUTE format(
      'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS',
      target_role
    );
    RAISE NOTICE 'created runtime role %', target_role;
  ELSE
    EXECUTE format(
      'ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS',
      target_role
    );
  END IF;
END
$$;

-- Schema privileges.
--
-- One fact, and it is easy to miss: `information_schema.usage_privileges` does NOT cover schemas -
-- it reports collations, domains, foreign servers and sequences, and returns zero rows for this
-- role. Reading it would conclude no schema grant is needed and ship a role that cannot resolve
-- `public`. The ACL on `pg_namespace` is the truth.
DO $$
DECLARE
  privilege text;
BEGIN
  FOR privilege IN
    SELECT DISTINCT acl.privilege_type
    FROM pg_catalog.pg_namespace AS schema_entry
    CROSS JOIN LATERAL aclexplode(schema_entry.nspacl) AS acl
    WHERE schema_entry.nspname = 'public'
      AND acl.grantee = 'ptr_clone_app'::regrole::oid
  LOOP
    EXECUTE format('GRANT %s ON SCHEMA public TO %I', privilege, 'tradingroom_app');
  END LOOP;
END
$$;

-- Relation privileges, replayed exactly as held.
DO $$
DECLARE
  entry record;
BEGIN
  FOR entry IN
    SELECT DISTINCT
           relation.oid::regclass AS relation_name,
           acl.privilege_type
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS schema_entry ON schema_entry.oid = relation.relnamespace
    CROSS JOIN LATERAL aclexplode(relation.relacl) AS acl
    WHERE schema_entry.nspname = 'public'
      AND acl.grantee = 'ptr_clone_app'::regrole::oid
    ORDER BY 1, 2
  LOOP
    EXECUTE format('GRANT %s ON TABLE %s TO %I',
                   entry.privilege_type, entry.relation_name, 'tradingroom_app');
  END LOOP;
END
$$;

-- Column privileges, replayed at COLUMN precision.
--
-- This is the block that keeps `users`, `enterprises` and `refresh_tokens` safe. Those three carry
-- no row-level security, so the set of granted columns is the whole tenant boundary. Widening it to
-- a relation-level grant would expose `email_hash`, `avatar_url`, `phone` and `discord_id` across
-- every tenant, silently.
DO $$
DECLARE
  entry record;
BEGIN
  FOR entry IN
    SELECT DISTINCT
           attribute.attrelid::regclass AS relation_name,
           attribute.attname           AS column_name,
           acl.privilege_type
    FROM pg_catalog.pg_attribute AS attribute
    JOIN pg_catalog.pg_class     AS relation     ON relation.oid = attribute.attrelid
    JOIN pg_catalog.pg_namespace AS schema_entry ON schema_entry.oid = relation.relnamespace
    CROSS JOIN LATERAL aclexplode(attribute.attacl) AS acl
    WHERE schema_entry.nspname = 'public'
      AND acl.grantee = 'ptr_clone_app'::regrole::oid
    ORDER BY 1, 2, 3
  LOOP
    EXECUTE format('GRANT %s (%I) ON TABLE %s TO %I',
                   entry.privilege_type, entry.column_name, entry.relation_name, 'tradingroom_app');
  END LOOP;
END
$$;

-- Routine privileges.
DO $$
DECLARE
  entry record;
BEGIN
  FOR entry IN
    SELECT DISTINCT routine.oid::regprocedure AS routine_signature, acl.privilege_type
    FROM pg_catalog.pg_proc      AS routine
    JOIN pg_catalog.pg_namespace AS schema_entry ON schema_entry.oid = routine.pronamespace
    CROSS JOIN LATERAL aclexplode(routine.proacl) AS acl
    WHERE schema_entry.nspname = 'public'
      AND acl.grantee = 'ptr_clone_app'::regrole::oid
    ORDER BY 1, 2
  LOOP
    EXECUTE format('GRANT %s ON FUNCTION %s TO %I',
                   entry.privilege_type, entry.routine_signature, 'tradingroom_app');
  END LOOP;
END
$$;

-- RLS policy membership: RETARGET, not append.
--
-- The half that grants alone cannot buy. A policy names its roles; a role no policy names gets
-- nothing under FORCE ROW LEVEL SECURITY.
--
-- Each policy is retargeted to the runtime role ALONE, and the baseline role is dropped from it.
-- Two reasons, and the first is a contract this repository already enforces:
--
--   * `postgres-release-attestation` requires the tenant policy to target ONLY the runtime role -
--     `[room_events_policy_mismatch] public.room_events must have exactly the reviewed tenant policy
--     targeted only to the runtime role`. An earlier draft of this migration appended instead of
--     replacing, and that check caught it on CI. Widening a policy to two roles to make a migration
--     easier is exactly the kind of quiet weakening that assertion exists to refuse.
--   * It is strictly safer. After this runs, `ptr_clone_app` holds object privileges but is named by
--     no policy, so under FORCE ROW LEVEL SECURITY it reads zero rows from every tenant table. The
--     baseline role becomes inert with respect to tenant data while it waits to be retired.
--
-- This is still convergent, and the reason is worth stating because it is the exact distinction the
-- withdrawn rename got wrong: POLICIES ARE PER-DATABASE OBJECTS, roles are cluster-global. On every
-- new database `0001` re-creates each policy targeting the baseline role and this migration
-- retargets it, reaching the identical end state every time. Retargeting a policy costs nothing on
-- the next database; renaming a role broke it.
DO $$
DECLARE
  entry record;
  expected_policies bigint;
  targeted_policies bigint;
  residual_policies bigint;
BEGIN
  -- Counted BEFORE the loop, and counted over EITHER role, which is what makes the assertion below
  -- hold identically on a first run and on a re-run. On a fresh database this is the 22 policies
  -- `0001` created naming the baseline role; on a re-run it is the same 22, already retargeted.
  SELECT count(*) INTO expected_policies
    FROM pg_catalog.pg_policy AS policy
   WHERE 'ptr_clone_app'::regrole::oid   = ANY (policy.polroles)
      OR 'tradingroom_app'::regrole::oid = ANY (policy.polroles);

  FOR entry IN
    SELECT policy.polname                         AS policy_name,
           policy.polrelid::regclass              AS relation_name,
           array_agg(DISTINCT member.rolname ORDER BY member.rolname) AS role_names
    FROM pg_catalog.pg_policy AS policy
    CROSS JOIN LATERAL unnest(policy.polroles) AS role_oid
    JOIN pg_catalog.pg_roles AS member ON member.oid = role_oid
    WHERE EXISTS (
            SELECT 1
            FROM unnest(policy.polroles) AS candidate
            WHERE candidate = 'ptr_clone_app'::regrole::oid
          )
    GROUP BY policy.polname, policy.polrelid
    ORDER BY 2, 1
  LOOP
    -- Idempotent: a policy already targeting exactly the runtime role is left alone, so a re-run
    -- and a second database both reach the same place without churning the catalogue.
    IF entry.role_names <> ARRAY['tradingroom_app'::name] THEN
      EXECUTE format('ALTER POLICY %I ON %s TO %I',
                     entry.policy_name,
                     entry.relation_name,
                     'tradingroom_app');
    END IF;
  END LOOP;

  SELECT count(*) FILTER (WHERE 'tradingroom_app'::regrole::oid = ANY (policy.polroles)),
         count(*) FILTER (WHERE 'ptr_clone_app'::regrole::oid   = ANY (policy.polroles))
    INTO targeted_policies, residual_policies
    FROM pg_catalog.pg_policy AS policy;

  -- FAIL LOUD, and the residual check is the one that matters. A policy still naming the baseline
  -- role is a two-role tenant policy, which is exactly what `postgres-release-attestation` refuses
  -- with `room_events_policy_mismatch`. Catching it here means the migration refuses to commit
  -- rather than leaving a widened boundary for the attestation step to discover later.
  IF residual_policies <> 0 THEN
    RAISE EXCEPTION 'RLS retarget incomplete: % policies still name %. A tenant policy naming two roles is a widened boundary',
      residual_policies, 'ptr_clone_app';
  END IF;

  IF targeted_policies <> expected_policies THEN
    RAISE EXCEPTION 'RLS retarget incomplete: % of % policies name %. A role no policy names sees nothing under FORCE ROW LEVEL SECURITY',
      targeted_policies, expected_policies, 'tradingroom_app';
  END IF;
END
$$;

-- Parity assertion. FAIL LOUD.
--
-- A migration that half-applies parity is worse than one that refuses, because the result is a role
-- that works for most queries and silently returns nothing - or, on the three unprotected tables,
-- silently returns everything. Every category is compared, and column privileges are compared
-- separately from relation privileges for the reason given above.
DO $$
DECLARE
  source_relations  bigint;
  target_relations  bigint;
  source_columns    bigint;
  target_columns    bigint;
  target_policies   bigint;
  bypasses_rls      boolean;
  memberships       bigint;
BEGIN
  SELECT count(*) FILTER (WHERE acl.grantee = 'ptr_clone_app'::regrole::oid),
         count(*) FILTER (WHERE acl.grantee = 'tradingroom_app'::regrole::oid)
    INTO source_relations, target_relations
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS schema_entry ON schema_entry.oid = relation.relnamespace
    CROSS JOIN LATERAL aclexplode(relation.relacl) AS acl
   WHERE schema_entry.nspname = 'public';

  SELECT count(*) FILTER (WHERE acl.grantee = 'ptr_clone_app'::regrole::oid),
         count(*) FILTER (WHERE acl.grantee = 'tradingroom_app'::regrole::oid)
    INTO source_columns, target_columns
    FROM pg_catalog.pg_attribute AS attribute
    JOIN pg_catalog.pg_class     AS relation     ON relation.oid = attribute.attrelid
    JOIN pg_catalog.pg_namespace AS schema_entry ON schema_entry.oid = relation.relnamespace
    CROSS JOIN LATERAL aclexplode(attribute.attacl) AS acl
   WHERE schema_entry.nspname = 'public';

  -- Policies are asserted in the retarget block above, not here: after retargeting, the baseline
  -- role is named by ZERO policies, so comparing the two counts would compare 0 against 22 and
  -- fail on a correct migration. Read here only for the NOTICE.
  SELECT count(*) FILTER (WHERE 'tradingroom_app'::regrole::oid = ANY (policy.polroles))
    INTO target_policies
    FROM pg_catalog.pg_policy AS policy;

  IF target_relations <> source_relations THEN
    RAISE EXCEPTION 'relation privilege parity incomplete: % has %, % has %',
      'ptr_clone_app', source_relations, 'tradingroom_app', target_relations;
  END IF;

  IF target_columns <> source_columns THEN
    RAISE EXCEPTION 'column privilege parity incomplete: % has %, % has %. On users, enterprises and refresh_tokens the column grant IS the tenant boundary',
      'ptr_clone_app', source_columns, 'tradingroom_app', target_columns;
  END IF;

  SELECT rolbypassrls INTO bypasses_rls
    FROM pg_catalog.pg_roles WHERE rolname = 'tradingroom_app';
  IF bypasses_rls THEN
    RAISE EXCEPTION 'tradingroom_app has BYPASSRLS; it would read every tenant and pass every isolation test for the wrong reason';
  END IF;

  SELECT count(*) INTO memberships
    FROM pg_catalog.pg_auth_members
   WHERE member = 'tradingroom_app'::regrole::oid;
  IF memberships <> 0 THEN
    RAISE EXCEPTION 'tradingroom_app holds % role membership(s); the runtime role must be membership-free', memberships;
  END IF;

  RAISE NOTICE 'parity verified: % relation, % column, % policy facts mirrored to tradingroom_app',
    target_relations, target_columns, target_policies;
END
$$;
