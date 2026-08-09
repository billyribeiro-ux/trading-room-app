-- Pre-Canned Polls.
--
-- The reference's poll panel has two tabs: "Create New Poll" and "Pre-Canned Polls". A presenter
-- composes a poll, presses "Save To Canned", and it lands in a reusable list they can send again
-- later. That list has no home in the schema, which is the only thing keeping the room's
-- `savePoll` / `deleteSavedPoll` from moving to this API.
--
-- ## Why a table, when the reference uses a JSON blob
--
-- The shipped client stores the list on the session record and rewrites the whole thing on every
-- change:
--
--     savePollToStorage()  savedPolls.push({q, choices})
--                          sendServerCommand('savedSessionPolls',
--                                            {savedSessionPolls: JSON.stringify(savedPolls)})
--     deleteSavedPoll(i)   savedPolls.splice(i, 1)   -- then the same whole-array write
--
-- That is a property of its socket-command transport, which has no per-row endpoint, not a
-- statement about storage. Two facts make the blob the wrong shape here:
--
--   * Deleting by ARRAY INDEX is racy. Two presenters deleting concurrently each splice a
--     position computed against a list the other has already changed, and the second write wins
--     wholesale - so one of them silently removes a poll nobody asked to remove. A primary key
--     makes the delete address the row it names.
--   * A whole-array rewrite cannot be tenant-checked per row. RLS applies to rows; a JSON column
--     is one row whatever it contains.
--
-- Everything observable is preserved: one shared list per room, insertion-ordered, any staff
-- member may add or remove any entry. `created_by_id` is provenance, never a filter - the
-- reference has no per-user list and neither does this.
--
-- The row the client renders is `{id, q, choices}` and nothing else: `PollPanel.svelte` reads
-- `poll.id` (the `{#each}` key and the delete argument), `poll.q` and `poll.choices`. `created_at`
-- exists to order the list, not to be displayed, and does not go on the wire.
--
-- ## No anonymity column
--
-- The panel has an "Anonymous Poll (Does not show the voting name/email, just results)" checkbox,
-- but `savePollToStorage` pushes only `{q, choices}` - the flag is never stored on a template.
-- In the results view it gates rendering of the per-response list (`anonymousPoll ? -1 : 8`),
-- which is display state on the sender's own screen. It is not a property of a saved poll, and a
-- column here would be inventing one.

CREATE TABLE IF NOT EXISTS public.saved_polls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    -- `q` on the wire, `question` in the schema, matching `polls.question`.
    question text NOT NULL,
    -- Same shape and constraint as `polls.choices`: a JSON array of strings.
    choices jsonb NOT NULL,
    -- Who saved it, as a `users.id` - matching `polls.created_by_id`, which references `users`
    -- and not `room_members`. `db::repo::poll` carries a comment about that specifically because
    -- both are uuid and nothing but the name distinguishes a correct call from an FK violation.
    -- Provenance only; the list is shared and no read filters on this.
    -- Nullable so that removing the user who typed a poll does not remove the poll: the
    -- reference's list belongs to the session, not to whoever last edited it.
    created_by_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT saved_polls_pkey PRIMARY KEY (id),
    -- Every tenant-scoped table in the reference schema carries exactly this
    -- (`second-dump/db/unique.tsv`: 19 of them, one per tenant table), because it is what lets
    -- the table be the TARGET of a composite tenant foreign key. Adding it here keeps that
    -- available to anything that later references a saved poll.
    CONSTRAINT saved_polls_tenant_id_unique UNIQUE (enterprise_id, id),
    -- The only shape rule, and the only one either existing implementation has: the room's
    -- `parsePollChoices` accepts a value exactly when it parses to an array of strings. The
    -- element type is held by the handler's `Vec<String>`; this holds the container.
    --
    -- There is deliberately NO non-empty question check and NO minimum choice count. A saved
    -- poll is a draft - "You can store polls you use often here", loaded back into the compose
    -- box before sending - and both the shipped client (`{q: this.pollQuestion, choices: ...}`,
    -- unvalidated, `pollQuestion` null until typed into) and the room's `savePoll` action
    -- (`String(data.get('q') ?? '')`) store a blank one today. A CHECK here would reject rows
    -- the product accepts, which is a behaviour change wearing a data-integrity costume.
    CONSTRAINT saved_polls_choices_array_check CHECK ((jsonb_typeof(choices) = 'array'::text)),
    CONSTRAINT saved_polls_enterprise_fk FOREIGN KEY (enterprise_id)
        REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE,
    -- COMPOSITE, and that is the whole point.
    --
    -- The first version of this migration had `FOREIGN KEY (room_id) REFERENCES rooms(id)` -
    -- two independent keys instead of one paired key. Nothing in the schema then stopped a row
    -- holding enterprise A's `enterprise_id` next to enterprise B's `room_id`. RLS does not
    -- catch that: the policy compares `enterprise_id` to the GUC, which would match, so the row
    -- reads as tenant A's while pointing at tenant B's room.
    --
    -- Every room-scoped table in the reference schema pairs them instead
    -- (`second-dump/db/foreign_keys.tsv`: 14 `*_tenant_room_fk` constraints, all of the form
    -- `(enterprise_id, room_id) REFERENCES rooms(enterprise_id, id)`, including
    -- `polls_tenant_room_fk` on line 62). The pairing makes the mismatch unrepresentable rather
    -- than merely unreachable through today's handlers, and it is why `rooms` carries
    -- `rooms_tenant_id_unique UNIQUE (enterprise_id, id)` for it to reference.
    CONSTRAINT saved_polls_tenant_room_fk FOREIGN KEY (enterprise_id, room_id)
        REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE,
    -- `users`, not `room_members` - the same target `polls_created_by_fk` uses, so the two poll
    -- tables agree.
    --
    -- The delete action deliberately differs from `polls_created_by_fk`, which is RESTRICT over
    -- a NOT NULL column. The reference schema uses both actions and the split is consistent:
    -- RESTRICT guards a NOT NULL author of a live artifact (`polls`, `messages`, `alerts`,
    -- `rooms.owner_id`), while SET NULL sits under a nullable provenance column
    -- (`notes_updated_by_fk`, `member_notes_author_fk`, `files_uploaded_by_fk`,
    -- `audit_log_actor_user_fk` - `second-dump/db/foreign_keys.tsv` lines 53, 29, 21, 16).
    -- A saved poll is the second kind: the list belongs to the room, not to whoever typed it,
    -- and it must survive that account being removed exactly as the reference's does.
    CONSTRAINT saved_polls_created_by_fk FOREIGN KEY (created_by_id)
        REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- The only access pattern: "this room's saved polls, in the order they were added". Ordering by
-- `created_at, id` reproduces the reference's array order, and the id tiebreak keeps it total
-- when two inserts land in the same microsecond.
CREATE INDEX IF NOT EXISTS saved_polls_tenant_room_created_idx
    ON public.saved_polls USING btree (enterprise_id, room_id, created_at, id);

-- ── Tenancy ────────────────────────────────────────────────────────────────
--
-- The same ENABLE + FORCE + policy shape as the other tenant-scoped tables, with the `TO
-- ptr_clone_app` clause that `0005` had to retrofit onto `room_events` - a policy without it
-- applies to PUBLIC, which is broader than every other policy in the schema.

ALTER TABLE public.saved_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_polls FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_polls_tenant_isolation ON public.saved_polls;
CREATE POLICY saved_polls_tenant_isolation ON public.saved_polls
    AS PERMISSIVE
    FOR ALL
    TO ptr_clone_app
    USING (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid)
    WITH CHECK (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_polls TO ptr_clone_app;

-- `updated_at` is maintained by the baseline's trigger function rather than by the application,
-- so a direct UPDATE cannot forget it.
DROP TRIGGER IF EXISTS saved_polls_set_updated_at ON public.saved_polls;
CREATE TRIGGER saved_polls_set_updated_at
    BEFORE UPDATE ON public.saved_polls
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
