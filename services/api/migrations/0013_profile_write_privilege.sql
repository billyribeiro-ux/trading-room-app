-- Permit the reviewed profile write and nothing broader.
--
-- `users` has no RLS, so the runtime role remains column-scoped and the authenticated user id is
-- mandatory in the repository UPDATE predicate. A relation-wide UPDATE grant would also permit
-- privilege escalation through `is_platform_admin`; this migration grants only `display_name`.
-- `preferences` and `updated_at` were already granted by 0006.
GRANT UPDATE (display_name)
    ON TABLE public.users TO tradingroom_app;

DO $$
BEGIN
  IF has_table_privilege('tradingroom_app', 'public.users', 'UPDATE') THEN
    RAISE EXCEPTION 'profile grant widened to relation-level UPDATE';
  END IF;
  IF NOT has_column_privilege('tradingroom_app', 'public.users', 'display_name', 'UPDATE') THEN
    RAISE EXCEPTION 'profile display_name UPDATE grant is absent';
  END IF;
  IF has_column_privilege('tradingroom_app', 'public.users', 'is_platform_admin', 'UPDATE') THEN
    RAISE EXCEPTION 'profile grant permits platform-admin mutation';
  END IF;
END
$$;
