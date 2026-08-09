#!/usr/bin/env bash
#
# Provision the runtime role, before any migration runs.
#
# ## Why this exists at all
#
# `migrations/0001_baseline.sql` is the imported forensic baseline. Its sha256 is pinned by the
# repository-root `scripts/verify-backend.mjs` gate and independently by
# `tradingroom_api::db::migrate::BASELINE_SHA256`. It opens with a `DO` block that creates both
# roles **with placeholder passwords** (`CHANGE_ME_OWNER`, `CHANGE_ME_APP`) if they do not already
# exist. Those bytes cannot be edited without breaking both pins.
#
# The fix is ordering, not editing. `docker-entrypoint-initdb.d` runs before anything else
# touches the database, and the baseline's `DO` block is guarded by `IF NOT EXISTS`. So if the
# roles are already here, with real passwords, the block is a no-op and the placeholders are
# never created.
#
# The owner (`ptr_clone`) is created by the postgres image itself from `POSTGRES_USER` /
# `POSTGRES_PASSWORD`. Only the runtime role is left to do here.
#
# ## Properties checked before the cluster is accepted
#
# The whole tenancy model is row-level security. A superuser or `BYPASSRLS` runtime role makes
# every policy inert; administrative/replication attributes, `INHERIT`, a different current role,
# or any role membership add privilege paths. The server repeats the complete posture check before
# binding, but it is better not to create the role wrong.

set -euo pipefail

: "${POSTGRES_APP_USER:?POSTGRES_APP_USER must be set}"
: "${POSTGRES_APP_PASSWORD:?POSTGRES_APP_PASSWORD must be set}"

if [[ "$POSTGRES_APP_USER" != "ptr_clone_app" ]]; then
	echo "POSTGRES_APP_USER must be ptr_clone_app; migrations and RLS policies name that role" >&2
	exit 1
fi

psql \
	--username "$POSTGRES_USER" \
	--dbname "$POSTGRES_DB" \
	--set ON_ERROR_STOP=1 <<'SQL'
	-- Read the secret inside psql instead of putting it in the process argument list,
	-- where another local process could inspect it. `\getenv` copies the existing
	-- environment value into a psql variable without evaluating it as SQL.
	\getenv app_password POSTGRES_APP_PASSWORD

	-- The role name is intentionally static: migrations and policies name it
	-- explicitly. `:'app_password'` makes psql quote the value as a SQL literal,
	-- and format(%L) quotes it again in the generated DDL. Shell or SQL metacharacters
	-- therefore remain password bytes rather than executable SQL.
	SELECT format(
	  'CREATE ROLE ptr_clone_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT NOREPLICATION',
	  :'app_password'
	)
	WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ptr_clone_app')
	\gexec

	SELECT format(
	  'ALTER ROLE ptr_clone_app WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT NOREPLICATION',
	  :'app_password'
	)
	\gexec

	-- Belt and braces: assert the posture this role exists to have, so a hand-edited
	-- cluster fails here rather than silently serving with RLS disabled.
	DO $$
	BEGIN
	  IF EXISTS (
	    SELECT 1 FROM pg_catalog.pg_roles
	    WHERE rolname = 'ptr_clone_app'
	      AND (NOT rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolreplication OR rolbypassrls)
	  ) THEN
	    RAISE EXCEPTION 'ptr_clone_app has unsafe runtime-role attributes';
	  END IF;

	  IF EXISTS (
	    SELECT 1
	    FROM pg_catalog.pg_auth_members AS membership
	    INNER JOIN pg_catalog.pg_roles AS runtime_role ON runtime_role.oid = membership.member
	    WHERE runtime_role.rolname = 'ptr_clone_app'
	  ) THEN
	    RAISE EXCEPTION 'ptr_clone_app has role memberships; explicit review is required';
	  END IF;
	END
	$$;
SQL

echo "provisioned ${POSTGRES_APP_USER} (restricted, membership-free runtime role)"
