-- Reduce the long-running API login to the object privileges exercised by the
-- current Rust SQL surface. The immutable baseline granted table-wide CRUD on
-- these objects, which allowed a stolen runtime credential to rewrite the
-- enterprise catalog, promote users, or alter/delete audit evidence.
--
-- `enterprises` is read only by the retention job, and that query selects only
-- `id` (`Db::enterprise_ids`).
--
-- `users` is the non-RLS identity boundary. Runtime SQL needs:
--   * SELECT for login/refresh identity and preferences;
--   * INSERT only for guest identities;
--   * UPDATE only for password-cost upgrades, login timestamps, and preferences.
-- It has no runtime account-provisioning, platform-admin mutation, profile,
-- email, or delete path.
--
-- `audit_log` is append-only in current code. Moderation inserts the record in
-- the same tenant transaction as the action; no runtime path reads, updates, or
-- deletes audit evidence.
--
-- Revoke both relation-level and column-level grants first. PostgreSQL treats
-- them as independent privilege paths: revoking a table grant does not remove a
-- separately granted column privilege.

REVOKE ALL PRIVILEGES ON TABLE public.enterprises FROM ptr_clone_app;
REVOKE ALL PRIVILEGES (
    id,
    name,
    slug,
    settings,
    created_at,
    updated_at
) ON TABLE public.enterprises FROM ptr_clone_app;

REVOKE ALL PRIVILEGES ON TABLE public.users FROM ptr_clone_app;
REVOKE ALL PRIVILEGES (
    id,
    email,
    email_hash,
    password_hash,
    display_name,
    avatar_url,
    phone,
    discord_id,
    is_platform_admin,
    last_login_at,
    created_at,
    updated_at,
    preferences,
    is_guest,
    guest_created_in_room_id
) ON TABLE public.users FROM ptr_clone_app;

REVOKE ALL PRIVILEGES ON TABLE public.audit_log FROM ptr_clone_app;
REVOKE ALL PRIVILEGES (
    id,
    enterprise_id,
    room_id,
    actor_user_id,
    actor_name,
    event_name,
    event_detail,
    target_type,
    target_id,
    metadata,
    created_at,
    updated_at
) ON TABLE public.audit_log FROM ptr_clone_app;

GRANT SELECT (id)
    ON TABLE public.enterprises TO ptr_clone_app;

GRANT SELECT (
    id,
    email,
    password_hash,
    display_name,
    is_platform_admin,
    preferences,
    is_guest
) ON TABLE public.users TO ptr_clone_app;

GRANT INSERT (
    email,
    email_hash,
    display_name,
    is_guest,
    guest_created_in_room_id
) ON TABLE public.users TO ptr_clone_app;

GRANT UPDATE (
    password_hash,
    last_login_at,
    updated_at,
    preferences
) ON TABLE public.users TO ptr_clone_app;

GRANT INSERT (
    enterprise_id,
    room_id,
    actor_user_id,
    actor_name,
    event_name,
    event_detail,
    target_type,
    target_id,
    metadata
) ON TABLE public.audit_log TO ptr_clone_app;
