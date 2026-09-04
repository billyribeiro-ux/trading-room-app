-- Canonical, revisioned room settings and an append-only idempotency ledger.
--
-- Settings stay nested in rooms.config so existing capability/access policy remains one atomic
-- room document. A monotonically increasing revision makes stale same-field writes observable.
-- The request ledger makes a transport retry converge without applying the mutation twice.

ALTER TABLE public.rooms
    ADD COLUMN settings_revision bigint DEFAULT 0 NOT NULL,
    ADD CONSTRAINT rooms_settings_revision_nonnegative CHECK (settings_revision >= 0),
    ADD CONSTRAINT rooms_settings_object_check CHECK (
        config -> 'settings' IS NULL OR jsonb_typeof(config -> 'settings') = 'object'
    );

ALTER TABLE public.legacy_entity_mappings
    DROP CONSTRAINT legacy_entity_mappings_entity_type_check,
    ADD CONSTRAINT legacy_entity_mappings_entity_type_check
        CHECK (entity_type IN ('enterprise', 'user', 'room', 'room-settings', 'badge',
                               'account-administrator', 'customer-api-key'));

CREATE TABLE public.room_setting_mutations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    request_id uuid NOT NULL,
    room_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    request_digest character(64) NOT NULL,
    response_revision bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT room_setting_mutations_pkey PRIMARY KEY (enterprise_id, request_id),
    CONSTRAINT room_setting_mutations_tenant_id_unique UNIQUE (enterprise_id, id),
    CONSTRAINT room_setting_mutations_digest_check
        CHECK (request_digest ~ '^[0-9a-f]{64}$'),
    CONSTRAINT room_setting_mutations_revision_check CHECK (response_revision >= 0),
    CONSTRAINT room_setting_mutations_room_fk
        FOREIGN KEY (enterprise_id, room_id)
        REFERENCES public.rooms (enterprise_id, id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT room_setting_mutations_actor_fk
        FOREIGN KEY (actor_user_id)
        REFERENCES public.users (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX room_setting_mutations_created_idx
    ON public.room_setting_mutations (enterprise_id, created_at);

ALTER TABLE public.room_setting_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_setting_mutations FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.room_setting_mutations
    TO tradingroom_app
    USING (
        enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid
    )
    WITH CHECK (
        enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid
    );

REVOKE ALL ON TABLE public.room_setting_mutations FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.room_setting_mutations TO tradingroom_app;

COMMENT ON TABLE public.room_setting_mutations IS
    'Append-only request-id ledger for exactly-once room setting mutations; operator-retained.';
COMMENT ON COLUMN public.rooms.settings_revision IS
    'Monotonic optimistic-concurrency token for config.settings.';
