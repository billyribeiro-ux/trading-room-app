-- Durable, owner-only evidence for the Gate 3 strangler migration.
--
-- The controller and Rust stores cannot commit one distributed transaction. A conversion can
-- therefore stop after the target commit and before the legacy mapping columns commit. These two
-- tables make that state resumable and provable: every source identity has at most one target,
-- every target can be claimed by at most one source identity, and every run records the source and
-- reconciled target digests/counts without copying email addresses or password hashes into logs.

ALTER TABLE public.enterprises
    ADD COLUMN status text DEFAULT 'active'::text NOT NULL,
    ADD COLUMN suspended_at timestamp with time zone,
    ADD COLUMN suspended_by text,
    ADD COLUMN suspended_reason text,
    ADD CONSTRAINT enterprises_status_check CHECK (status IN ('active', 'suspended')),
    ADD CONSTRAINT enterprises_suspension_shape_check CHECK (
        status = 'suspended' OR
        (suspended_at IS NULL AND suspended_by IS NULL AND suspended_reason IS NULL)
    );

CREATE TABLE public.legacy_cutover_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_system text NOT NULL,
    source_fingerprint text NOT NULL,
    scope text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    source_counts jsonb DEFAULT '{}'::jsonb NOT NULL,
    target_counts jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_digest text,
    target_digest text,
    failure_code text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    target_committed_at timestamp with time zone,
    verified_at timestamp with time zone,
    rolled_back_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT legacy_cutover_runs_pkey PRIMARY KEY (id),
    CONSTRAINT legacy_cutover_runs_source_system_check
        CHECK (source_system ~ '^[a-z][a-z0-9-]{2,63}$'),
    CONSTRAINT legacy_cutover_runs_source_fingerprint_check
        CHECK (source_fingerprint ~ '^[0-9a-f]{64}$'),
    CONSTRAINT legacy_cutover_runs_scope_check
        CHECK (scope IN ('profile', 'rooms', 'room-settings', 'membership', 'badges',
                         'account-administrators', 'customer-api-keys', 'room-launch')),
    CONSTRAINT legacy_cutover_runs_status_check
        CHECK (status IN ('running', 'target-committed', 'verified', 'failed', 'rolled-back')),
    CONSTRAINT legacy_cutover_runs_source_counts_object_check
        CHECK (jsonb_typeof(source_counts) = 'object'),
    CONSTRAINT legacy_cutover_runs_target_counts_object_check
        CHECK (jsonb_typeof(target_counts) = 'object'),
    CONSTRAINT legacy_cutover_runs_source_digest_check
        CHECK (source_digest IS NULL OR source_digest ~ '^[0-9a-f]{64}$'),
    CONSTRAINT legacy_cutover_runs_target_digest_check
        CHECK (target_digest IS NULL OR target_digest ~ '^[0-9a-f]{64}$')
);

CREATE INDEX legacy_cutover_runs_source_scope_idx
    ON public.legacy_cutover_runs (source_system, source_fingerprint, scope, started_at DESC);

-- One unfinished writer per source and slice. A crashed run must be resumed or explicitly marked
-- failed/rolled-back before a new one begins, preventing two operators from importing the same ids
-- concurrently under different snapshots.
CREATE UNIQUE INDEX legacy_cutover_runs_one_active_idx
    ON public.legacy_cutover_runs (source_system, source_fingerprint, scope)
    WHERE status IN ('running', 'target-committed');

CREATE TRIGGER legacy_cutover_runs_set_updated_at
    BEFORE UPDATE ON public.legacy_cutover_runs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.legacy_entity_mappings (
    source_system text NOT NULL,
    source_fingerprint text NOT NULL,
    entity_type text NOT NULL,
    legacy_id text NOT NULL,
    target_id uuid NOT NULL,
    run_id uuid NOT NULL REFERENCES public.legacy_cutover_runs(id),
    source_digest text NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    verified_at timestamp with time zone,
    CONSTRAINT legacy_entity_mappings_pkey
        PRIMARY KEY (source_system, source_fingerprint, entity_type, legacy_id),
    CONSTRAINT legacy_entity_mappings_target_unique
        UNIQUE (source_system, source_fingerprint, entity_type, target_id),
    CONSTRAINT legacy_entity_mappings_source_system_check
        CHECK (source_system ~ '^[a-z][a-z0-9-]{2,63}$'),
    CONSTRAINT legacy_entity_mappings_source_fingerprint_check
        CHECK (source_fingerprint ~ '^[0-9a-f]{64}$'),
    CONSTRAINT legacy_entity_mappings_entity_type_check
        CHECK (entity_type IN ('enterprise', 'user', 'room', 'badge',
                               'account-administrator', 'customer-api-key')),
    CONSTRAINT legacy_entity_mappings_legacy_id_check
        CHECK (length(legacy_id) BETWEEN 1 AND 128),
    CONSTRAINT legacy_entity_mappings_source_digest_check
        CHECK (source_digest ~ '^[0-9a-f]{64}$')
);

CREATE INDEX legacy_entity_mappings_run_id_idx
    ON public.legacy_entity_mappings (run_id);

-- These are migration-control records, not request-path domain data. They are intentionally owned
-- by the migrator and have no RLS policy because the application cannot access them at all.
REVOKE ALL ON TABLE public.legacy_cutover_runs FROM PUBLIC;
REVOKE ALL ON TABLE public.legacy_cutover_runs FROM tradingroom_app;
REVOKE ALL ON TABLE public.legacy_entity_mappings FROM PUBLIC;
REVOKE ALL ON TABLE public.legacy_entity_mappings FROM tradingroom_app;
REVOKE ALL ON TABLE public.legacy_cutover_runs FROM ptr_clone_app;
REVOKE ALL ON TABLE public.legacy_entity_mappings FROM ptr_clone_app;

COMMENT ON TABLE public.legacy_cutover_runs IS
    'Owner-only Gate 3 conversion/reconciliation evidence; contains hashes and counts, never source PII.';
COMMENT ON TABLE public.legacy_entity_mappings IS
    'Stable one-to-one legacy-to-canonical ids for resumable Gate 3 conversion.';
