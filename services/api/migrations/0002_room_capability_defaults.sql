-- Per-room capability defaults.
--
-- `room_members.capabilities_overridden` only means something against a default that exists
-- somewhere, and the baseline schema never says where. This puts that default on the room -
-- `rooms.config.capabilities.<role>` - rather than in Rust, because changing a room's
-- permission policy must not require a deploy, and the captured admin console shows the real
-- product configuring permissions per room.
--
-- `rooms.config` is where the access tiers already live under CHECK validation, so this is the
-- home the schema already chose for exactly this kind of policy.
--
-- Forward-only and idempotent: `0001_baseline.sql` stays byte-identical, so the sha256 that
-- `scripts/verify-postgres-schema-artifacts.mjs` and `tradingroom_api::db::migrate` both pin is
-- untouched.

-- ── 1. Validate the shape ──────────────────────────────────────────────────
--
-- Written in the schema's own idiom: CHECK cannot contain a subquery, so universal
-- quantification is expressed as "the count of all elements equals the count of matching
-- elements", exactly as `rooms_access_tiers_argon2id_check` does.
--
-- Three things are asserted, and nothing more:
--   1. `capabilities`, if present, is an object;
--   2. every value under it is an array;
--   3. every element of those arrays is one of the sixteen known capability names.
--
-- The sixteen names are the `room_members.can_*` columns with the `can_` prefix removed.
-- `tradingroom_api::capability::tests::the_capability_set_matches_the_room_members_columns` parses the
-- baseline DDL and asserts the Rust enum matches those columns, so the list below cannot drift
-- from the table without a test failing.
--
-- NOT VALID then VALIDATE: the validation pass takes only a SHARE UPDATE EXCLUSIVE lock, so an
-- existing table is not blocked for writes while it runs.
--
-- Two jsonpath details that were established by running them, not by reading the manual, and
-- that a future editor will otherwise get wrong:
--
--   * `CASE`, not `AND`. `strict $."capabilities".*` RAISES on a non-object ("jsonpath wildcard
--     member accessor can only be applied to an object"), so the type guard has to be
--     *sequenced* before it. Postgres guarantees CASE does not evaluate arms it does not need;
--     it guarantees no such thing about the operands of AND.
--   * `[*]` on BOTH sides of the element comparison. In lax mode a filter expression
--     auto-unwraps arrays but a bare `.*` does not, so `.*` vs `.* ? (...)` compares two arrays
--     against three strings and fails on perfectly valid input. Spelling the unwrap out with
--     `strict ... .*[*]` keeps both sides counting the same things.

ALTER TABLE public.rooms
  DROP CONSTRAINT IF EXISTS rooms_capability_defaults_check;

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_capability_defaults_check CHECK (
    CASE
      -- A room that predates this migration. The compiled-in defaults cover it.
      WHEN NOT (config ? 'capabilities') THEN true
      -- (1) capabilities is an object
      WHEN jsonb_typeof(config -> 'capabilities') <> 'object' THEN false
      -- (2) every role's value is an array
      WHEN jsonb_array_length(jsonb_path_query_array(config, 'strict $."capabilities".*'))
        <> jsonb_array_length(jsonb_path_query_array(config, 'strict $."capabilities".* ? (@.type() == "array")'))
        THEN false
      -- (3) every element is one of the sixteen known capability names
      ELSE jsonb_array_length(jsonb_path_query_array(config, 'strict $."capabilities".*[*]'))
        = jsonb_array_length(jsonb_path_query_array(config, 'strict $."capabilities".*[*] ? (@.type() == "string" && @ like_regex "^(post|post_images|edit_own_message|delete_own_message|public_reply|edit_notes|edit_username|publish_mic|publish_cam|publish_screen|use_admin_chat|use_group_chat|pm_users|pm_admins|access_files|access_archives)$")'))
    END
  ) NOT VALID;

ALTER TABLE public.rooms
  VALIDATE CONSTRAINT rooms_capability_defaults_check;

-- ── 2. Seed the initial policy ─────────────────────────────────────────────
--
-- HONEST NOTE ON EVIDENCE. The `member` row below is not a judgement call: it is exactly the
-- `room_members` column DEFAULTs (`can_post`, `can_use_group_chat` and `can_access_archives`
-- are `true`; the other thirteen are `false`), which is the schema's own statement about an
-- ordinary member. `tradingroom_api::capability::tests::the_member_default_is_exactly_the_column_defaults`
-- checks that against the DDL.
--
-- The other four rows ARE a product judgement. The captured admin console uses an older and
-- different vocabulary (`hasMic`, `nonPresenter`, role integers 0-4) that does not map cleanly
-- onto these five roles, so no capture can settle them. They ship here, in a reviewable
-- migration, rather than as a hidden constant, precisely so they can be argued with - and so a
-- room can override them without a deploy. The reasoning:
--
--   owner             - everything; the owner is who would be granting the rest.
--   moderator         - everything except the three publish_*: moderation is chat-side,
--                       broadcasting is a presenter function.
--   presenter         - full participation and broadcast, but not moderation (use_admin_chat)
--                       and not self-rename.
--   limited_presenter - a presenter without screen share and without public_reply; "limited"
--                       has to limit something, and those are the two the name most plausibly
--                       refers to.
--
-- These must stay identical to `tradingroom_api::capability::RoleDefaults::COMPILED_IN`, which is the
-- fallback for rooms that predate this migration; a room must not change behaviour merely by
-- being configured. `the_config_json_round_trips_through_the_reader` pins the JSON shape.
--
-- Idempotent by construction: only rooms that have not already been given a policy are
-- touched, so re-running never overwrites an operator's edits.

UPDATE public.rooms
SET config = jsonb_set(
      config,
      '{capabilities}',
      '{
        "owner": ["post","post_images","edit_own_message","delete_own_message","public_reply","edit_notes","edit_username","publish_mic","publish_cam","publish_screen","use_admin_chat","use_group_chat","pm_users","pm_admins","access_files","access_archives"],
        "presenter": ["post","post_images","edit_own_message","delete_own_message","public_reply","edit_notes","publish_mic","publish_cam","publish_screen","use_group_chat","pm_admins","access_files","access_archives"],
        "limited_presenter": ["post","post_images","edit_own_message","delete_own_message","edit_notes","publish_mic","publish_cam","use_group_chat","pm_admins","access_files","access_archives"],
        "moderator": ["post","post_images","edit_own_message","delete_own_message","public_reply","edit_notes","edit_username","use_admin_chat","use_group_chat","pm_users","pm_admins","access_files","access_archives"],
        "member": ["post","use_group_chat","access_archives"]
      }'::jsonb,
      true
    ),
    updated_at = now()
WHERE NOT (config ? 'capabilities');
