-- Canonical room lifecycle fields for the Gate 3 rooms slice.
--
-- `archived_at` is a timestamp rather than a boolean so incident and retention questions keep
-- their answer. `creation_request_id` is the caller-generated idempotency key: a controller retry
-- after an uncertain network result converges on the same room instead of creating another one.

ALTER TABLE public.rooms
    ADD COLUMN archived_at timestamp with time zone,
    ADD COLUMN creation_request_id uuid;

CREATE UNIQUE INDEX rooms_enterprise_creation_request_unique
    ON public.rooms (enterprise_id, creation_request_id)
    WHERE creation_request_id IS NOT NULL;

CREATE INDEX rooms_enterprise_archived_name_idx
    ON public.rooms (enterprise_id, archived_at NULLS FIRST, name, id);

COMMENT ON COLUMN public.rooms.archived_at IS
    'Canonical room archive time; NULL means active.';
COMMENT ON COLUMN public.rooms.creation_request_id IS
    'Caller-generated idempotency key for room creation; scoped by enterprise.';
