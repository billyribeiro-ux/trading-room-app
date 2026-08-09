-- `room_events` pairs its tenant keys, like every other room-scoped table.
--
-- ## What is wrong
--
-- `0003_room_events.sql` gave the table three INDEPENDENT foreign keys:
--
--     room_events_room_fk      FOREIGN KEY (room_id)             REFERENCES rooms(id)
--     room_events_audience_fk  FOREIGN KEY (audience_member_id)  REFERENCES room_members(id)
--     room_events_origin_fk    FOREIGN KEY (origin_member_id)    REFERENCES room_members(id)
--
-- Each one is satisfiable on its own, so nothing in the schema requires the `room_id` to belong
-- to the row's `enterprise_id`, or the two member ids to belong to that room. A row holding
-- tenant A's `enterprise_id` beside tenant B's `room_id` is well-formed as far as Postgres is
-- concerned.
--
-- RLS does not close it. `room_events_tenant_isolation` compares `enterprise_id` against
-- `app.enterprise_id`, which such a row satisfies - so it reads back as tenant A's event while
-- pointing into tenant B's room.
--
-- This table is the realtime fan-out. `scope` and `audience_member_id` are what decide who
-- receives an event, so a member id that resolves outside the row's own room is the difference
-- between a staff-scoped payload reaching staff and reaching someone else.
--
-- ## What the schema does everywhere else
--
-- Every room-scoped table in the reference pairs them - `second-dump/db/foreign_keys.tsv` holds
-- 14 `*_tenant_room_fk` constraints, all `(enterprise_id, room_id) REFERENCES rooms(enterprise_id,
-- id)`, and member references are three-column: `follows_tenant_follower_fk`,
-- `mutes_tenant_member_fk` and `member_notes_tenant_subject_fk` are all
-- `(enterprise_id, room_id, <member column>) REFERENCES room_members(enterprise_id, room_id, id)`.
--
-- `room_events` is ours, not the reference's, which is exactly why it missed the convention: it
-- was written without a sibling to copy. An audit of all 18 room-scoped tables found it to be the
-- only one, and `saved_polls` before it was corrected.
--
-- ## Why the nullable member columns are still safe
--
-- `audience_member_id` and `origin_member_id` are nullable, and a composite foreign key defaults
-- to MATCH SIMPLE: when any column of the key is NULL the constraint is not enforced. That is the
-- behaviour wanted here - a room-scoped event has no audience - and it is the same construction
-- the reference uses for `alert_questions_tenant_parent_fk`, whose `parent_id` is nullable.
--
-- ## Locking
--
-- Each `ADD CONSTRAINT` is `NOT VALID` first, which takes a brief `SHARE ROW EXCLUSIVE` and does
-- not scan the table, and is validated afterwards under `SHARE UPDATE EXCLUSIVE`, which does not
-- block reads or writes. `room_events` is an append-only log and is the one table here that grows
-- without bound, so the cheap form is the one worth having even though nothing is deployed yet.

-- The key that lets anything reference an event tenant-safely, matching the
-- `<table>_tenant_id_unique` every other tenant table carries.
ALTER TABLE public.room_events
    DROP CONSTRAINT IF EXISTS room_events_tenant_id_unique;
ALTER TABLE public.room_events
    ADD CONSTRAINT room_events_tenant_id_unique UNIQUE (enterprise_id, id);

-- ── The room ────────────────────────────────────────────────────────────────

ALTER TABLE public.room_events DROP CONSTRAINT IF EXISTS room_events_room_fk;
ALTER TABLE public.room_events DROP CONSTRAINT IF EXISTS room_events_tenant_room_fk;
ALTER TABLE public.room_events
    ADD CONSTRAINT room_events_tenant_room_fk
    FOREIGN KEY (enterprise_id, room_id)
    REFERENCES public.rooms(enterprise_id, id)
    ON UPDATE CASCADE ON DELETE CASCADE
    NOT VALID;
ALTER TABLE public.room_events VALIDATE CONSTRAINT room_events_tenant_room_fk;

-- ── The audience ────────────────────────────────────────────────────────────
--
-- Three columns, not two: an audience member must belong to the event's room, not merely to the
-- same enterprise. `room_members_tenant_room_id_unique UNIQUE (enterprise_id, room_id, id)` is
-- the key it references.

ALTER TABLE public.room_events DROP CONSTRAINT IF EXISTS room_events_audience_fk;
ALTER TABLE public.room_events DROP CONSTRAINT IF EXISTS room_events_tenant_audience_fk;
ALTER TABLE public.room_events
    ADD CONSTRAINT room_events_tenant_audience_fk
    FOREIGN KEY (enterprise_id, room_id, audience_member_id)
    REFERENCES public.room_members(enterprise_id, room_id, id)
    ON UPDATE CASCADE ON DELETE CASCADE
    NOT VALID;
ALTER TABLE public.room_events VALIDATE CONSTRAINT room_events_tenant_audience_fk;

-- ── The origin ──────────────────────────────────────────────────────────────
--
-- `ON DELETE SET NULL` is preserved from `0003`: an event is a record of something that
-- happened, and removing the member who caused it must not remove the record. Only the
-- attribution goes.

ALTER TABLE public.room_events DROP CONSTRAINT IF EXISTS room_events_origin_fk;
ALTER TABLE public.room_events DROP CONSTRAINT IF EXISTS room_events_tenant_origin_fk;
ALTER TABLE public.room_events
    ADD CONSTRAINT room_events_tenant_origin_fk
    FOREIGN KEY (enterprise_id, room_id, origin_member_id)
    REFERENCES public.room_members(enterprise_id, room_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL
    NOT VALID;
ALTER TABLE public.room_events VALIDATE CONSTRAINT room_events_tenant_origin_fk;

-- ── The enterprise ──────────────────────────────────────────────────────────
--
-- Unchanged in shape, recreated only to add the `ON UPDATE CASCADE` that all 78 foreign keys in
-- the reference schema carry and this one did not.

ALTER TABLE public.room_events DROP CONSTRAINT IF EXISTS room_events_enterprise_fk;
ALTER TABLE public.room_events
    ADD CONSTRAINT room_events_enterprise_fk
    FOREIGN KEY (enterprise_id)
    REFERENCES public.enterprises(id)
    ON UPDATE CASCADE ON DELETE CASCADE
    NOT VALID;
ALTER TABLE public.room_events VALIDATE CONSTRAINT room_events_enterprise_fk;
