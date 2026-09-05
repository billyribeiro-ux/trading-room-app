-- Canonical, revisioned customer API-key authority.
--
-- Plaintext keys never enter this database. The controller deterministically derives a secret
-- from its independently managed encryption key plus a one-use request UUID, sends only SHA-256
-- and last-four metadata, and keeps the recoverable ciphertext in its compatibility projection.

CREATE TABLE public.customer_api_keys (
    enterprise_id uuid NOT NULL,
    id text NOT NULL,
    revision bigint DEFAULT 0 NOT NULL,
    secret_hash character(64) NOT NULL,
    last_four character(4) NOT NULL,
    restrictions jsonb DEFAULT '{"ips":[],"scopes":[],"sessions":[]}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone,
    CONSTRAINT customer_api_keys_pkey PRIMARY KEY (enterprise_id, id),
    CONSTRAINT customer_api_keys_id_unique UNIQUE (id),
    CONSTRAINT customer_api_keys_enterprise_fk FOREIGN KEY (enterprise_id)
        REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT customer_api_keys_id_shape CHECK (id ~ '^[0-9a-f]{24}$'),
    CONSTRAINT customer_api_keys_revision_nonnegative CHECK (revision >= 0),
    CONSTRAINT customer_api_keys_secret_hash_shape CHECK (secret_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT customer_api_keys_last_four_shape CHECK (last_four ~ '^[0-9a-f]{4}$'),
    CONSTRAINT customer_api_keys_restrictions_shape CHECK (
        jsonb_typeof(restrictions) = 'object'
        AND restrictions ?& ARRAY['ips', 'scopes', 'sessions']
        AND restrictions - ARRAY['ips', 'scopes', 'sessions'] = '{}'::jsonb
        AND jsonb_typeof(restrictions->'ips') = 'array'
        AND jsonb_typeof(restrictions->'scopes') = 'array'
        AND jsonb_typeof(restrictions->'sessions') = 'array'
        AND NOT jsonb_path_exists(restrictions, '$.ips[*] ? (@.type() != "string")')
        AND NOT jsonb_path_exists(restrictions, '$.scopes[*] ? (@.type() != "string")')
        AND NOT jsonb_path_exists(restrictions, '$.sessions[*] ? (@.type() != "string")')
        AND jsonb_array_length(restrictions->'ips') <= 64
        AND jsonb_array_length(restrictions->'scopes') <= 11
        AND jsonb_array_length(restrictions->'sessions') <= 256
        AND pg_column_size(restrictions) <= 32768
    )
);

CREATE INDEX customer_api_keys_created_idx
    ON public.customer_api_keys (enterprise_id, created_at, id);

CREATE TRIGGER customer_api_keys_set_updated_at
    BEFORE UPDATE ON public.customer_api_keys
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.customer_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_api_keys FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.customer_api_keys
    TO tradingroom_app
    USING (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid)
    WITH CHECK (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid);

REVOKE ALL ON TABLE public.customer_api_keys FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_api_keys TO tradingroom_app;

CREATE TABLE public.customer_api_key_mutations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    request_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    mutation_kind text NOT NULL,
    request_digest character(64) NOT NULL,
    response jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customer_api_key_mutations_pkey PRIMARY KEY (enterprise_id, request_id),
    CONSTRAINT customer_api_key_mutations_tenant_id_unique UNIQUE (enterprise_id, id),
    CONSTRAINT customer_api_key_mutations_kind_check CHECK (
        mutation_kind IN ('customer-api-key.created', 'customer-api-key.rotated',
                          'customer-api-key.restricted', 'customer-api-key.deleted')
    ),
    CONSTRAINT customer_api_key_mutations_digest_check CHECK (request_digest ~ '^[0-9a-f]{64}$'),
    CONSTRAINT customer_api_key_mutations_response_object_check CHECK (jsonb_typeof(response) = 'object'),
    CONSTRAINT customer_api_key_mutations_actor_tenant_fk
        FOREIGN KEY (enterprise_id, actor_user_id)
        REFERENCES public.enterprise_memberships (enterprise_id, user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX customer_api_key_mutations_created_idx
    ON public.customer_api_key_mutations (enterprise_id, created_at);

ALTER TABLE public.customer_api_key_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_api_key_mutations FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.customer_api_key_mutations
    TO tradingroom_app
    USING (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid)
    WITH CHECK (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid);

REVOKE ALL ON TABLE public.customer_api_key_mutations FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.customer_api_key_mutations TO tradingroom_app;

COMMENT ON TABLE public.customer_api_keys IS
    'Canonical customer API-key verifier metadata and bounded restrictions; never plaintext secrets.';
COMMENT ON TABLE public.customer_api_key_mutations IS
    'Append-only exactly-once customer API-key management evidence; responses exclude credential material.';
