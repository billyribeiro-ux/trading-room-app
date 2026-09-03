-- Make enterprise ownership explicit instead of inferring it from a room role.
--
-- A room owner administers one room. An enterprise owner administers the account that contains
-- rooms, billing and integrations. Treating those as the same role made an account with no room
-- impossible to administer and made room-role changes capable of silently changing account
-- authority. This table is the canonical account boundary.

CREATE TABLE public.enterprise_memberships (
    enterprise_id uuid NOT NULL
        REFERENCES public.enterprises(id) ON DELETE CASCADE,
    user_id uuid NOT NULL
        REFERENCES public.users(id),
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT enterprise_memberships_pkey PRIMARY KEY (enterprise_id, user_id),
    CONSTRAINT enterprise_memberships_role_check CHECK (role IN ('owner', 'admin'))
);

-- The resolver starts with a user id, so the primary key's enterprise-first order cannot serve it.
CREATE INDEX enterprise_memberships_user_id_idx
    ON public.enterprise_memberships (user_id, enterprise_id);

-- Owner transfer is a transaction, never a period with two owners. Zero owners remains possible
-- during account creation and explicit decommissioning, but the database refuses split authority.
CREATE UNIQUE INDEX enterprise_memberships_one_owner_per_enterprise_idx
    ON public.enterprise_memberships (enterprise_id)
    WHERE role = 'owner';

CREATE TRIGGER enterprise_memberships_set_updated_at
    BEFORE UPDATE ON public.enterprise_memberships
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Refuse to invent account authority if historic rooms disagree about their owner. This is a
-- migration-time data-quality fence: an operator must resolve the ambiguity explicitly.
DO $$
DECLARE
    conflicting_enterprise uuid;
BEGIN
    SELECT room.enterprise_id
      INTO conflicting_enterprise
      FROM public.rooms AS room
     GROUP BY room.enterprise_id
    HAVING count(DISTINCT room.owner_id) > 1
     ORDER BY room.enterprise_id
     LIMIT 1;

    IF conflicting_enterprise IS NOT NULL THEN
        RAISE EXCEPTION
          'enterprise % has multiple historic room owners; explicit account ownership is required before migration',
          conflicting_enterprise;
    END IF;
END
$$;

INSERT INTO public.enterprise_memberships (enterprise_id, user_id, role)
SELECT DISTINCT room.enterprise_id, room.owner_id, 'owner'
  FROM public.rooms AS room
ON CONFLICT (enterprise_id, user_id) DO UPDATE
    SET role = 'owner', updated_at = now();

ALTER TABLE public.enterprise_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_memberships FORCE ROW LEVEL SECURITY;

CREATE POLICY enterprise_memberships_tenant_isolation
    ON public.enterprise_memberships
    TO tradingroom_app
    USING (
        enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid
    )
    WITH CHECK (
        enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid
    );

-- No handler needs arbitrary table access. Account discovery goes through the bounded resolver
-- below, while owner-side provisioning writes through its dedicated transaction.
REVOKE ALL ON TABLE public.enterprise_memberships FROM PUBLIC;
REVOKE ALL ON TABLE public.enterprise_memberships FROM tradingroom_app;

-- Break the same bootstrap cycle as auth_list_memberships: before a request knows its enterprise,
-- it cannot set the tenant GUC needed by RLS. The function returns only memberships for the
-- authenticated user id supplied by the API and only non-secret account identity.
CREATE FUNCTION public.auth_list_enterprise_memberships(p_user_id uuid)
RETURNS TABLE(
    enterprise_id uuid,
    enterprise_name text,
    enterprise_slug text,
    account_role text
)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  SELECT enterprise.id, enterprise.name, enterprise.slug, membership.role
    FROM public.enterprise_memberships AS membership
    INNER JOIN public.enterprises AS enterprise
      ON enterprise.id = membership.enterprise_id
   WHERE membership.user_id = p_user_id
   ORDER BY enterprise.name ASC, enterprise.id ASC
$$;

REVOKE ALL ON FUNCTION public.auth_list_enterprise_memberships(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_list_enterprise_memberships(uuid) TO tradingroom_app;

COMMENT ON TABLE public.enterprise_memberships IS
    'Canonical enterprise owner/admin authority; intentionally independent of room roles.';
COMMENT ON FUNCTION public.auth_list_enterprise_memberships(uuid) IS
    'Bounded pre-RLS account discovery for one authenticated user.';
