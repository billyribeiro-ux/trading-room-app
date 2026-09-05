-- Canonical enterprise badges and room-member badge assignments.
--
-- Badge definitions are enterprise-scoped. Assignments use a normalized relation rather than
-- trusting the baseline room_members.badges JSON blob, so a member cannot retain a deleted or
-- cross-tenant badge and every assignment is enforced by composite foreign keys.

-- The baseline audit stream was room-only. Badge definitions are account-scoped, and assigning an
-- arbitrary room here would manufacture provenance. PostgreSQL foreign keys permit NULL without
-- weakening any room-bound record, while enterprise_id remains mandatory and forced-RLS scoped.
ALTER TABLE public.audit_log ALTER COLUMN room_id DROP NOT NULL;
COMMENT ON COLUMN public.audit_log.room_id IS
    'The affected room for room-scoped events; NULL only for enterprise-scoped control-plane events.';

CREATE TABLE public.enterprise_badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    revision bigint DEFAULT 0 NOT NULL,
    label text NOT NULL,
    text_color text DEFAULT '#ffffff'::text NOT NULL,
    background_color text DEFAULT '#777777'::text NOT NULL,
    emoji text,
    image_data_url text,
    dark_theme_badge_id uuid,
    auto_assign_roles text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT enterprise_badges_pkey PRIMARY KEY (id),
    CONSTRAINT enterprise_badges_tenant_id_unique UNIQUE (enterprise_id, id),
    CONSTRAINT enterprise_badges_enterprise_fk
        FOREIGN KEY (enterprise_id) REFERENCES public.enterprises (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT enterprise_badges_dark_theme_fk
        FOREIGN KEY (enterprise_id, dark_theme_badge_id)
        REFERENCES public.enterprise_badges (enterprise_id, id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT enterprise_badges_revision_nonnegative CHECK (revision >= 0),
    CONSTRAINT enterprise_badges_label_size_check CHECK (octet_length(label) <= 160),
    CONSTRAINT enterprise_badges_has_content_check
        CHECK (length(btrim(label)) > 0 OR image_data_url IS NOT NULL),
    CONSTRAINT enterprise_badges_text_color_check
        CHECK (text_color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT enterprise_badges_background_color_check
        CHECK (background_color ~ '^#[0-9A-Fa-f]{6}$' OR background_color = 'rgba(1,0,0,0)'),
    CONSTRAINT enterprise_badges_emoji_size_check
        CHECK (emoji IS NULL OR octet_length(emoji) <= 128),
    CONSTRAINT enterprise_badges_image_size_check
        CHECK (image_data_url IS NULL OR octet_length(image_data_url) <= 360000),
    CONSTRAINT enterprise_badges_image_type_check
        CHECK (
            image_data_url IS NULL OR
            image_data_url ~ '^data:image/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$'
        ),
    CONSTRAINT enterprise_badges_dark_theme_not_self_check
        CHECK (dark_theme_badge_id IS NULL OR dark_theme_badge_id <> id),
    CONSTRAINT enterprise_badges_roles_count_check
        CHECK (cardinality(auto_assign_roles) <= 32)
);

CREATE INDEX enterprise_badges_tenant_created_idx
    ON public.enterprise_badges (enterprise_id, created_at, id);

ALTER TABLE public.enterprise_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_badges FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.enterprise_badges
    TO tradingroom_app
    USING (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid)
    WITH CHECK (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid);

REVOKE ALL ON TABLE public.enterprise_badges FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.enterprise_badges TO tradingroom_app;

CREATE TABLE public.room_member_badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    member_id uuid NOT NULL,
    badge_id uuid NOT NULL,
    assigned_by_user_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT room_member_badges_pkey PRIMARY KEY (enterprise_id, member_id, badge_id),
    CONSTRAINT room_member_badges_tenant_id_unique UNIQUE (enterprise_id, id),
    CONSTRAINT room_member_badges_member_fk
        FOREIGN KEY (enterprise_id, room_id, member_id)
        REFERENCES public.room_members (enterprise_id, room_id, id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT room_member_badges_room_fk
        FOREIGN KEY (enterprise_id, room_id)
        REFERENCES public.rooms (enterprise_id, id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT room_member_badges_badge_fk
        FOREIGN KEY (enterprise_id, badge_id)
        REFERENCES public.enterprise_badges (enterprise_id, id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT room_member_badges_actor_membership_fk
        FOREIGN KEY (enterprise_id, assigned_by_user_id)
        REFERENCES public.enterprise_memberships (enterprise_id, user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX room_member_badges_tenant_badge_idx
    ON public.room_member_badges (enterprise_id, badge_id, member_id);
CREATE INDEX room_member_badges_tenant_room_idx
    ON public.room_member_badges (enterprise_id, room_id, member_id);

ALTER TABLE public.room_member_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_member_badges FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.room_member_badges
    TO tradingroom_app
    USING (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid)
    WITH CHECK (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid);

REVOKE ALL ON TABLE public.room_member_badges FROM PUBLIC;
GRANT SELECT, INSERT, DELETE ON TABLE public.room_member_badges TO tradingroom_app;

CREATE TABLE public.badge_mutations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    request_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    mutation_kind text NOT NULL,
    request_digest character(64) NOT NULL,
    response jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT badge_mutations_pkey PRIMARY KEY (enterprise_id, request_id),
    CONSTRAINT badge_mutations_tenant_id_unique UNIQUE (enterprise_id, id),
    CONSTRAINT badge_mutations_actor_membership_fk
        FOREIGN KEY (enterprise_id, actor_user_id)
        REFERENCES public.enterprise_memberships (enterprise_id, user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT badge_mutations_kind_check
        CHECK (mutation_kind = ANY (ARRAY[
            'badge.created', 'badge.updated', 'badge.deleted',
            'room.members.badges-updated'
        ])),
    CONSTRAINT badge_mutations_digest_check CHECK (request_digest ~ '^[0-9a-f]{64}$'),
    CONSTRAINT badge_mutations_response_object_check CHECK (jsonb_typeof(response) = 'object')
);

CREATE INDEX badge_mutations_tenant_created_idx
    ON public.badge_mutations (enterprise_id, created_at);

ALTER TABLE public.badge_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_mutations FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.badge_mutations
    TO tradingroom_app
    USING (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid)
    WITH CHECK (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid);

REVOKE ALL ON TABLE public.badge_mutations FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.badge_mutations TO tradingroom_app;

COMMENT ON TABLE public.enterprise_badges IS
    'Canonical enterprise badge definitions with optimistic revisions and tenant RLS.';
COMMENT ON TABLE public.room_member_badges IS
    'Referentially enforced canonical badge assignments; the legacy JSON column is not authority.';
COMMENT ON TABLE public.badge_mutations IS
    'Append-only exactly-once ledger for badge definition and assignment mutations.';
