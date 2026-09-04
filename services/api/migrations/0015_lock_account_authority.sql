-- Make account authorization part of the same transaction as the room mutation it protects.
--
-- The discovery resolver in 0011 intentionally runs before a tenant is known. Reusing it for a
-- write leaves a time-of-check/time-of-use window: an administrator can be revoked after the
-- resolver returns but before the tenant transaction commits. This bounded resolver requires the
-- tenant GUC first and takes a row lock that is held through the caller's transaction. A concurrent
-- role change therefore commits either entirely before authorization (and is observed) or after the
-- protected operation; it cannot interleave with it.

CREATE FUNCTION public.auth_lock_enterprise_admin(p_user_id uuid)
RETURNS boolean
    LANGUAGE plpgsql VOLATILE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
    matched_role text;
BEGIN
    SELECT membership.role
      INTO matched_role
      FROM public.enterprise_memberships AS membership
     WHERE membership.enterprise_id =
               NULLIF(current_setting('app.enterprise_id', true), '')::uuid
       AND membership.user_id = p_user_id
       AND membership.role IN ('owner', 'admin')
       FOR SHARE;

    RETURN matched_role IS NOT NULL;
END
$$;

REVOKE ALL ON FUNCTION public.auth_lock_enterprise_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_lock_enterprise_admin(uuid) TO tradingroom_app;

COMMENT ON FUNCTION public.auth_lock_enterprise_admin(uuid) IS
    'Transaction-scoped account authorization; requires the tenant GUC and locks the matched authority row.';
