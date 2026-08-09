-- Close the two privilege-expansion paths around the realtime outbox.
--
-- `0003_room_events.sql` omitted a `TO` clause from its policy. PostgreSQL therefore
-- treats that policy as applying to PUBLIC. Ordinary table privileges still prevented
-- access, but the policy boundary was broader than every tenant policy in the pinned
-- baseline. Scope it to the one runtime role that owns no schema objects.
--
-- Role attributes and memberships are cluster-wide, not database-local. The provisioner
-- creates this role with the restricted posture below, but an existing cluster can drift.
-- Correct attributes deterministically without changing the password, then fail the
-- migration if any membership remains. Membership is not auto-revoked: it may represent an
-- operator decision and must be reviewed explicitly rather than silently destroyed.

-- Roles live in the shared `pg_authid` catalog. Serialise its mutation across every database
-- in the cluster: parallel migration tests reproduced PostgreSQL's `tuple concurrently
-- updated` error when independent databases altered the same role at once. This mode is
-- self-exclusive and conflicts with catalog writers, but it does not block ordinary reads.
LOCK TABLE pg_catalog.pg_authid IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  -- Avoid a no-op write to the cluster-wide role catalog. Besides reducing catalog churn,
  -- this lets independent scratch databases migrate concurrently when the provisioner has
  -- already established the required posture.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname = 'ptr_clone_app'
      AND (
        NOT rolcanlogin
        OR rolsuper
        OR rolcreatedb
        OR rolcreaterole
        OR rolinherit
        OR rolreplication
        OR rolbypassrls
      )
  ) THEN
    ALTER ROLE ptr_clone_app WITH
        LOGIN
        NOSUPERUSER
        NOCREATEDB
        NOCREATEROLE
        NOINHERIT
        NOREPLICATION
        NOBYPASSRLS;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_auth_members AS membership
    INNER JOIN pg_catalog.pg_roles AS runtime_role
      ON runtime_role.oid = membership.member
    WHERE runtime_role.rolname = 'ptr_clone_app'
  ) THEN
    RAISE EXCEPTION
      'ptr_clone_app has role memberships; review and revoke them before migrating'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname = 'ptr_clone_app'
      AND (
        NOT rolcanlogin
        OR rolsuper
        OR rolcreatedb
        OR rolcreaterole
        OR rolinherit
        OR rolreplication
        OR rolbypassrls
      )
  ) THEN
    RAISE EXCEPTION 'ptr_clone_app does not have the required restricted posture'
      USING ERRCODE = '42501';
  END IF;
END
$$;

DROP POLICY IF EXISTS room_events_tenant_isolation ON public.room_events;
CREATE POLICY room_events_tenant_isolation ON public.room_events
    AS PERMISSIVE
    FOR ALL
    TO ptr_clone_app
    USING (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid)
    WITH CHECK (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid);
