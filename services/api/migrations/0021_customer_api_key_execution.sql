-- External customer API-key authentication and activity read model.
--
-- Discovery must happen before the tenant is known, so the runtime role receives EXECUTE on one
-- bounded SECURITY DEFINER lookup rather than SELECT across all customer_api_keys. It returns the
-- verifier to application memory for constant-time comparison; neither plaintext nor ciphertext is
-- accepted by this database function.

CREATE FUNCTION public.customer_api_key_auth_lookup(p_key_id text)
RETURNS TABLE (enterprise_id uuid, secret_hash text, restrictions jsonb)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
    SELECT key.enterprise_id, key.secret_hash::text, key.restrictions
      FROM public.customer_api_keys AS key
     WHERE key.id = p_key_id
$$;

REVOKE ALL ON FUNCTION public.customer_api_key_auth_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_api_key_auth_lookup(text) TO tradingroom_app;

-- `/stats/v1/sessions/users` returns the canonical last-login timestamp. Preserve
-- the non-RLS identity boundary by granting this one column only; relation-level
-- SELECT and credential/account-administration fields remain unavailable.
GRANT SELECT (last_login_at) ON TABLE public.users TO tradingroom_app;

COMMENT ON FUNCTION public.customer_api_key_auth_lookup(text) IS
    'Bounded pre-tenant verifier lookup for constant-time external API authentication.';

-- The legacy recordings response carries both duration (whole minutes) and length (milliseconds),
-- plus the original MKV name. Byte size is a different fact and must never be substituted for
-- duration. Nullable columns preserve existing file rows; the API emits zero/filename when older
-- producers have no recording metadata.
ALTER TABLE public.files
    ADD COLUMN recording_duration_ms bigint,
    ADD COLUMN recording_source_filename text,
    ADD CONSTRAINT files_recording_duration_check CHECK (
        recording_duration_ms IS NULL OR recording_duration_ms BETWEEN 0 AND 86400000
    ),
    ADD CONSTRAINT files_recording_source_filename_size CHECK (
        recording_source_filename IS NULL
        OR octet_length(recording_source_filename) BETWEEN 1 AND 1024
    );

-- A canonical visit ledger for the stats API and the later room-launch slice. It intentionally
-- snapshots email/name because account identity may be renamed after an historical visit.
CREATE TABLE public.room_visit_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    user_id uuid NOT NULL,
    launch_request_id uuid,
    email_snapshot text NOT NULL,
    display_name_snapshot text NOT NULL,
    ip inet,
    user_agent text,
    browser text DEFAULT 'unknown' NOT NULL,
    entered_at timestamp with time zone NOT NULL,
    exited_at timestamp with time zone,
    is_mobile boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT room_visit_sessions_pkey PRIMARY KEY (enterprise_id, id),
    CONSTRAINT room_visit_sessions_tenant_id_unique UNIQUE (enterprise_id, id),
    CONSTRAINT room_visit_sessions_room_tenant_fk FOREIGN KEY (enterprise_id, room_id)
        REFERENCES public.rooms (enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT room_visit_sessions_user_fk FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT room_visit_sessions_email_size CHECK (
        octet_length(email_snapshot) BETWEEN 3 AND 320
    ),
    CONSTRAINT room_visit_sessions_name_size CHECK (
        octet_length(display_name_snapshot) BETWEEN 1 AND 200
    ),
    CONSTRAINT room_visit_sessions_user_agent_size CHECK (
        user_agent IS NULL OR octet_length(user_agent) BETWEEN 1 AND 2048
    ),
    CONSTRAINT room_visit_sessions_browser_size CHECK (
        octet_length(browser) BETWEEN 1 AND 64
    ),
    CONSTRAINT room_visit_sessions_order CHECK (
        exited_at IS NULL OR exited_at >= entered_at
    )
);

CREATE INDEX room_visit_sessions_room_entered_idx
    ON public.room_visit_sessions (enterprise_id, room_id, entered_at DESC, id DESC);

-- Browser retries must converge on the same visit. Nullable preserves imported historical rows,
-- while every canonical launch supplies an id and is unique across the enterprise.
CREATE UNIQUE INDEX room_visit_sessions_launch_request_idx
    ON public.room_visit_sessions (enterprise_id, launch_request_id)
    WHERE launch_request_id IS NOT NULL;

ALTER TABLE public.room_visit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_visit_sessions FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.room_visit_sessions
    TO tradingroom_app
    USING (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid)
    WITH CHECK (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid);

REVOKE ALL ON TABLE public.room_visit_sessions FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.room_visit_sessions TO tradingroom_app;

COMMENT ON TABLE public.room_visit_sessions IS
    'Tenant-bound room entry/exit facts consumed by the external stats API.';
