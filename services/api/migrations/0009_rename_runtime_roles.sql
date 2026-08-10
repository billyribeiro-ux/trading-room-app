-- Rename the runtime role: ptr_clone_app -> tradingroom_app.
--
-- `ptr_clone` is the last holdout of the old name. Everything else settled on `tradingroom` long
-- ago — the crates (`tradingroom-api`, `tradingroom-media`), the cookies
-- (`__Host-tradingroom_access`), `TRADINGROOM_API_URL`, and the domain itself. See
-- `apps/room/TODO.md` entry 1 for the decision and the traps.
--
-- ## Why a new migration instead of editing the five that name the old role
--
-- `0001`, `0003`, `0004`, `0005` and `0006` all reference `ptr_clone_app`, and they are applied.
-- Editing an applied migration changes its sqlx checksum and every existing database refuses to
-- migrate — which has already happened once on this project, to a legacy local database whose
-- recorded checksums for migrations 2 and 3 no longer match their files, so it can never be
-- migrated forward again.
--
-- `0001_baseline.sql` is pinned twice over besides: by the repository-root
-- `scripts/verify-backend.mjs` and independently by `tradingroom_api::db::migrate::BASELINE_SHA256`.
-- Its bytes are not editable by anyone.
--
-- So the rename is forward-only. The old migrations keep granting to `ptr_clone_app`, this one
-- renames the role afterwards, and RLS policies follow automatically because policy targets are
-- stored by OID rather than by name.
--
-- ## Why this renames the RUNTIME role and not the owner
--
-- MEASURED on PostgreSQL 16.13, not assumed:
--
--     connected AS the role:      ALTER ROLE tr_probe RENAME TO tr_probe2;
--                                 ERROR:  session user cannot be renamed
--     from a different session:   ALTER ROLE tr_probe RENAME TO tr_probe2;
--                                 ALTER ROLE
--
-- Migrations run as the owner role (`ptr_clone`, created by the postgres image from
-- `POSTGRES_USER`). A migration that tried to rename it would therefore fail on every database,
-- every time. Renaming the owner is an operator step run from a separate superuser session and is
-- documented in `ops/postgres-runtime-role-hardening.md`; it is deliberately not attempted here.
--
-- ## Why the provisioning script still creates the OLD name
--
-- `services/docker/postgres/10-provision-roles.sh` runs in `docker-entrypoint-initdb.d`, before any
-- migration. Migrations `0001`-`0006` then `GRANT` to `ptr_clone_app`, so that role must exist
-- under its old name when they run. A fresh database therefore ends at `tradingroom_app` having
-- passed through `ptr_clone_app`, which reads like a mistake and is not. Do not "tidy" it.
--
-- ## Password survival
--
-- `ALTER ROLE ... RENAME TO` clears the password when it is stored as md5, and keeps it when it is
-- scram-sha-256. Verify per target before running:
--
--     SELECT rolname, substring(rolpassword from 1 for 14) FROM pg_authid
--     WHERE rolname IN ('ptr_clone_app', 'tradingroom_app');
--
-- A cleared password is a login that stops working with no other symptom, which is the worst way to
-- find out.

DO $$
BEGIN
  -- Idempotent in both directions: nothing to do if the rename already happened, and nothing to do
  -- on a cluster that never had the old role. Both are normal — the second is every fresh
  -- deployment created after this migration ships, where provisioning made `ptr_clone_app` and an
  -- earlier run of this migration already renamed it.
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'ptr_clone_app')
     AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'tradingroom_app') THEN

    EXECUTE 'ALTER ROLE ptr_clone_app RENAME TO tradingroom_app';
    RAISE NOTICE 'renamed runtime role ptr_clone_app -> tradingroom_app';

  ELSIF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'tradingroom_app')
        AND EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'ptr_clone_app') THEN

    -- Both present. Renaming would fail on the name collision, and picking one silently would
    -- decide which role owns the grants — that is an operator's decision, not a migration's.
    RAISE EXCEPTION
      'both ptr_clone_app and tradingroom_app exist; resolve by hand before migrating (see 0009)';

  END IF;
END
$$;

-- The posture the runtime role exists to have, re-asserted under its new name.
--
-- The whole tenancy model is row-level security: a SUPERUSER or BYPASSRLS runtime role makes every
-- policy inert. `10-provision-roles.sh` checks this at creation and the server repeats it before
-- binding; this is the third place, and the only one that runs against a database somebody has
-- since edited by hand.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname = 'tradingroom_app'
      AND (NOT rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole
           OR rolinherit OR rolreplication OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'tradingroom_app has unsafe runtime-role attributes after rename';
  END IF;
END
$$;
