-- Canonical, revisioned account-administrator authority.
--
-- `enterprise_memberships` has always been the authorization relation, but the controller's
-- account editor still wrote an unrelated `admin_users` password row.  That row was never read by
-- login and therefore could not grant usable authority.  This migration makes administrator
-- creation/removal a bounded mutation of the relation every account endpoint already locks.

ALTER TABLE public.enterprise_memberships
    ADD COLUMN revision bigint DEFAULT 0 NOT NULL,
    ADD CONSTRAINT enterprise_memberships_revision_nonnegative CHECK (revision >= 0);

CREATE TABLE public.administrator_mutations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    request_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    mutation_kind text NOT NULL,
    request_digest character(64) NOT NULL,
    response jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT administrator_mutations_pkey PRIMARY KEY (enterprise_id, request_id),
    CONSTRAINT administrator_mutations_tenant_id_unique UNIQUE (enterprise_id, id),
    CONSTRAINT administrator_mutations_kind_check
        CHECK (mutation_kind IN ('administrator.created', 'administrator.removed')),
    CONSTRAINT administrator_mutations_digest_check CHECK (request_digest ~ '^[0-9a-f]{64}$'),
    CONSTRAINT administrator_mutations_response_object_check CHECK (jsonb_typeof(response) = 'object'),
    CONSTRAINT administrator_mutations_actor_fk
        FOREIGN KEY (actor_user_id) REFERENCES public.users (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT administrator_mutations_actor_tenant_fk
        FOREIGN KEY (enterprise_id, actor_user_id)
        REFERENCES public.enterprise_memberships (enterprise_id, user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX administrator_mutations_created_idx
    ON public.administrator_mutations (enterprise_id, created_at);

ALTER TABLE public.administrator_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrator_mutations FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.administrator_mutations
    TO tradingroom_app
    USING (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid)
    WITH CHECK (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid);

REVOKE ALL ON TABLE public.administrator_mutations FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.administrator_mutations TO tradingroom_app;

-- Direct runtime access to enterprise_memberships remains denied.  Each routine is deliberately
-- narrower than a table grant: it re-checks the supplied actor inside the tenant selected by the
-- transaction GUC, exposes only administrator rows, can create only the `admin` role, and can
-- delete only the `admin` role.  No routine can create, update, or remove an owner.
CREATE FUNCTION public.account_list_administrators(p_actor_user_id uuid)
RETURNS TABLE(
    user_id uuid,
    revision bigint,
    display_name text,
    email text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  SELECT target.user_id, target.revision, identity.display_name, identity.email::text,
         target.created_at, target.updated_at
    FROM public.enterprise_memberships AS actor
    JOIN public.enterprise_memberships AS target
      ON target.enterprise_id = actor.enterprise_id AND target.role = 'admin'
    JOIN public.users AS identity ON identity.id = target.user_id
   WHERE actor.enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid
     AND actor.user_id = p_actor_user_id
     AND actor.role IN ('owner', 'admin')
   ORDER BY target.created_at ASC, target.user_id ASC
$$;

CREATE FUNCTION public.account_create_administrator(p_actor_user_id uuid, p_target_user_id uuid)
RETURNS bigint
    LANGUAGE plpgsql VOLATILE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
    selected_enterprise uuid;
    resulting_revision bigint;
BEGIN
    SELECT actor.enterprise_id INTO selected_enterprise
      FROM public.enterprise_memberships AS actor
     WHERE actor.enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid
       AND actor.user_id = p_actor_user_id
       AND actor.role IN ('owner', 'admin')
     FOR SHARE;

    IF selected_enterprise IS NULL THEN
        RETURN NULL;
    END IF;

    -- This capability may enroll only a newly created, non-guest identity. It cannot attach an
    -- existing identity from this or another enterprise even if a caller guesses its UUID.
    INSERT INTO public.enterprise_memberships (enterprise_id, user_id, role)
    SELECT selected_enterprise, identity.id, 'admin'
      FROM public.users AS identity
     WHERE identity.id = p_target_user_id
       AND NOT identity.is_guest
       AND NOT EXISTS (
             SELECT 1 FROM public.enterprise_memberships AS existing
              WHERE existing.user_id = p_target_user_id
       )
    RETURNING revision INTO resulting_revision;
    RETURN resulting_revision;
END
$$;

CREATE FUNCTION public.account_lock_administrator(p_actor_user_id uuid, p_target_user_id uuid)
RETURNS bigint
    LANGUAGE plpgsql VOLATILE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
    selected_enterprise uuid;
    current_revision bigint;
BEGIN
    SELECT actor.enterprise_id INTO selected_enterprise
      FROM public.enterprise_memberships AS actor
     WHERE actor.enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid
       AND actor.user_id = p_actor_user_id
       AND actor.role IN ('owner', 'admin')
     FOR SHARE;

    IF selected_enterprise IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT target.revision INTO current_revision
      FROM public.enterprise_memberships AS target
     WHERE target.enterprise_id = selected_enterprise
       AND target.user_id = p_target_user_id
       AND target.role = 'admin'
     FOR UPDATE;
    RETURN current_revision;
END
$$;

CREATE FUNCTION public.account_delete_administrator(p_actor_user_id uuid, p_target_user_id uuid)
RETURNS boolean
    LANGUAGE plpgsql VOLATILE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
    selected_enterprise uuid;
BEGIN
    SELECT actor.enterprise_id INTO selected_enterprise
      FROM public.enterprise_memberships AS actor
     WHERE actor.enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid
       AND actor.user_id = p_actor_user_id
       AND actor.role IN ('owner', 'admin')
     FOR SHARE;

    IF selected_enterprise IS NULL THEN
        RETURN false;
    END IF;

    DELETE FROM public.enterprise_memberships
     WHERE enterprise_id = selected_enterprise
       AND user_id = p_target_user_id
       AND role = 'admin';
    RETURN FOUND;
END
$$;

REVOKE ALL ON FUNCTION public.account_list_administrators(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.account_create_administrator(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.account_lock_administrator(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.account_delete_administrator(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_list_administrators(uuid) TO tradingroom_app;
GRANT EXECUTE ON FUNCTION public.account_create_administrator(uuid, uuid) TO tradingroom_app;
GRANT EXECUTE ON FUNCTION public.account_lock_administrator(uuid, uuid) TO tradingroom_app;
GRANT EXECUTE ON FUNCTION public.account_delete_administrator(uuid, uuid) TO tradingroom_app;

COMMENT ON TABLE public.administrator_mutations IS
    'Append-only exactly-once ledger for account-administrator mutations; responses exclude credentials.';
COMMENT ON COLUMN public.enterprise_memberships.revision IS
    'Monotonic optimistic-concurrency token for canonical account authority.';
COMMENT ON FUNCTION public.account_list_administrators(uuid) IS
    'Bounded tenant-GUC-scoped administrator projection for a current account authority actor.';
COMMENT ON FUNCTION public.account_create_administrator(uuid, uuid) IS
    'Creates only an admin membership after re-checking the actor; cannot create an owner.';
COMMENT ON FUNCTION public.account_lock_administrator(uuid, uuid) IS
    'Locks only an admin target and returns its revision; owner rows are intentionally invisible.';
COMMENT ON FUNCTION public.account_delete_administrator(uuid, uuid) IS
    'Deletes only an admin membership after re-checking the actor; cannot delete an owner.';
