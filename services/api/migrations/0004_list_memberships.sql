-- "Which rooms am I in?" - the fourth SECURITY DEFINER resolver.
--
-- ## The chicken-and-egg this breaks
--
-- Every tenant-scoped table is `FORCE ROW LEVEL SECURITY`, and the policies compare
-- `enterprise_id` against the `app.enterprise_id` GUC. To set that GUC you need the tenant id;
-- to find the tenant id you have to read `room_members`, which is itself tenant-scoped. A
-- request that knows only "who is signed in" cannot get started.
--
-- The baseline schema already solves this three times - `auth_resolve_membership`,
-- `auth_locate_room_tenant`, `auth_locate_invite_tenant` - each a `SECURITY DEFINER` function
-- with a pinned `search_path`, callable on a plain pooled connection with no GUC set. All three
-- answer "given an id I already have, what tenant is it in?".
--
-- None of them answers "given a *user*, what rooms are they in?", because the SvelteKit app had
-- one hardcoded room. A real client has to render a room list before it can ask about a room, so
-- this adds the fourth resolver in the same shape rather than inventing a different mechanism.
--
-- ## Why this is not a hole in the tenancy model
--
-- It returns only rows where `member.user_id = p_user_id`: the caller's own memberships, keyed
-- by an id the caller has already been authenticated as. It cannot enumerate other users, other
-- tenants, or anything about a room beyond its name and the caller's role in it. That is
-- strictly less than what the caller learns by opening any one of those rooms.
--
-- `STABLE`, not `VOLATILE`: it only reads. `SET search_path` is what stops a caller with CREATE
-- on some other schema shadowing `public.rooms` and having it resolved as the owner - the same
-- reasoning, and the same pinned value, as the three functions already in the baseline.

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
  ORDER BY room.name ASC
$$;

ALTER FUNCTION public.auth_list_memberships(p_user_id uuid) OWNER TO ptr_clone;

-- The runtime role calls it; the owner runs it. Without this grant the API would see
-- "permission denied for function", which is a confusing way to learn a migration was missed.
GRANT ALL ON FUNCTION public.auth_list_memberships(p_user_id uuid) TO ptr_clone_app;

-- REVOKE from PUBLIC, deliberately. `CREATE FUNCTION` grants EXECUTE to PUBLIC by default, and
-- a SECURITY DEFINER function executable by everyone is how a definer's privileges leak to a
-- role that was never meant to have them. Only the two named roles above may call it.
REVOKE ALL ON FUNCTION public.auth_list_memberships(p_user_id uuid) FROM PUBLIC;
