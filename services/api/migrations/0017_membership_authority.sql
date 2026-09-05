-- Canonical account-managed room membership.
--
-- The baseline already owns live-room roles and capabilities. This migration adds the controller
-- management state that was still missing, an optimistic-concurrency token, an append-only
-- request ledger, and database enforcement that a live room can never lose its final owner.

ALTER TABLE public.room_members
    ADD COLUMN revision bigint DEFAULT 0 NOT NULL,
    ADD COLUMN is_banned boolean DEFAULT false NOT NULL,
    ADD COLUMN is_paused boolean DEFAULT false NOT NULL,
    ADD COLUMN hide_user_count boolean DEFAULT false NOT NULL,
    ADD COLUMN admin_note text,
    ADD COLUMN approval_status text DEFAULT 'approved'::text NOT NULL,
    ADD COLUMN has_mobile_app boolean DEFAULT false NOT NULL,
    ADD CONSTRAINT room_members_revision_nonnegative CHECK (revision >= 0),
    ADD CONSTRAINT room_members_approval_status_check
        CHECK (approval_status IN ('approved', 'pending')),
    ADD CONSTRAINT room_members_admin_note_size_check
        CHECK (admin_note IS NULL OR octet_length(admin_note) <= 2000),
    ADD CONSTRAINT room_members_owner_state_check
        CHECK (role <> 'owner' OR (NOT is_banned AND NOT is_paused AND approval_status = 'approved'));

ALTER TABLE public.legacy_entity_mappings
    DROP CONSTRAINT legacy_entity_mappings_entity_type_check,
    ADD CONSTRAINT legacy_entity_mappings_entity_type_check
        CHECK (entity_type IN ('enterprise', 'user', 'room', 'room-settings', 'membership', 'badge',
                               'account-administrator', 'customer-api-key'));

CREATE TABLE public.membership_mutations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    request_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    request_digest character(64) NOT NULL,
    response jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT membership_mutations_pkey PRIMARY KEY (enterprise_id, request_id),
    CONSTRAINT membership_mutations_tenant_id_unique UNIQUE (enterprise_id, id),
    CONSTRAINT membership_mutations_digest_check CHECK (request_digest ~ '^[0-9a-f]{64}$'),
    CONSTRAINT membership_mutations_response_object_check CHECK (jsonb_typeof(response) = 'object'),
    CONSTRAINT membership_mutations_actor_fk
        FOREIGN KEY (actor_user_id) REFERENCES public.users (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX membership_mutations_created_idx
    ON public.membership_mutations (enterprise_id, created_at);

ALTER TABLE public.membership_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_mutations FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.membership_mutations
    TO tradingroom_app
    USING (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid)
    WITH CHECK (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid);

REVOKE ALL ON TABLE public.membership_mutations FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.membership_mutations TO tradingroom_app;

COMMENT ON TABLE public.membership_mutations IS
    'Append-only exactly-once ledger for account-managed membership mutations; response excludes credentials.';
COMMENT ON COLUMN public.room_members.revision IS
    'Monotonic optimistic-concurrency token for account-managed membership state.';

-- Every membership writer, including a future one outside the account API, is subject to this
-- invariant. Deferral permits legitimate room creation and owner transfer within one transaction.
CREATE FUNCTION public.enforce_room_has_owner()
RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
    IF TG_OP IN ('DELETE', 'UPDATE') THEN
        PERFORM 1 FROM public.rooms
         WHERE enterprise_id = OLD.enterprise_id AND id = OLD.room_id
         FOR UPDATE;
        IF FOUND AND NOT EXISTS (
            SELECT 1 FROM public.room_members
             WHERE enterprise_id = OLD.enterprise_id
               AND room_id = OLD.room_id
               AND role = 'owner'
        ) THEN
            RAISE EXCEPTION 'a live room must retain an owner' USING ERRCODE = '23514';
        END IF;
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE')
       AND (TG_OP = 'INSERT' OR NEW.enterprise_id <> OLD.enterprise_id OR NEW.room_id <> OLD.room_id)
    THEN
        PERFORM 1 FROM public.rooms
         WHERE enterprise_id = NEW.enterprise_id AND id = NEW.room_id
         FOR UPDATE;
        IF FOUND AND NOT EXISTS (
            SELECT 1 FROM public.room_members
             WHERE enterprise_id = NEW.enterprise_id
               AND room_id = NEW.room_id
               AND role = 'owner'
        ) THEN
            RAISE EXCEPTION 'a live room must retain an owner' USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NULL;
END
$$;

CREATE CONSTRAINT TRIGGER room_members_require_owner
    AFTER INSERT OR UPDATE OR DELETE ON public.room_members
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION public.enforce_room_has_owner();

-- Banned, paused, and pending rows remain visible to an account administrator but cannot resolve
-- into runtime room authority. Replacing both resolvers keeps direct room entry and account
-- bootstrap in the same state model.
CREATE OR REPLACE FUNCTION public.auth_resolve_membership(p_user_id uuid, p_room_id uuid)
RETURNS TABLE(enterprise_id uuid, member_id uuid, member_role text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  SELECT room.enterprise_id, member.id, member.role
  FROM public.rooms AS room
  INNER JOIN public.room_members AS member
    ON member.enterprise_id = room.enterprise_id
    AND member.room_id = room.id
    AND member.user_id = p_user_id
    AND NOT member.is_banned
    AND NOT member.is_paused
    AND member.approval_status = 'approved'
  WHERE room.id = p_room_id
$$;

REVOKE ALL ON FUNCTION public.auth_resolve_membership(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_resolve_membership(uuid, uuid) TO tradingroom_app;

CREATE OR REPLACE FUNCTION public.auth_list_memberships(p_user_id uuid)
RETURNS TABLE(
    enterprise_id uuid,
    room_id uuid,
    room_name text,
    room_state text,
    member_id uuid,
    member_role text
)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  SELECT room.enterprise_id, room.id, room.name, room.state, member.id, member.role
  FROM public.rooms AS room
  INNER JOIN public.room_members AS member
    ON member.enterprise_id = room.enterprise_id
    AND member.room_id = room.id
    AND member.user_id = p_user_id
    AND NOT member.is_banned
    AND NOT member.is_paused
    AND member.approval_status = 'approved'
  ORDER BY room.name ASC, room.id ASC
$$;

REVOKE ALL ON FUNCTION public.auth_list_memberships(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_list_memberships(uuid) TO tradingroom_app;
