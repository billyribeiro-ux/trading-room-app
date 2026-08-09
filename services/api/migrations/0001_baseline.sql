-- ═══════════════════════════════════════════════════════════════════════════
-- ptr-clone — COMPLETE DATABASE RECREATION SCRIPT
-- ═══════════════════════════════════════════════════════════════════════════
-- Generated from the live database ptr-clone-postgres-1 (PostgreSQL 17.10).
-- Self-contained and ordered: run top to bottom on an empty cluster.
--
--   psql -U postgres -f RECREATE.sql
--
-- Contains: 2 roles · 3 extensions · 24 tables · 290 columns · 141 constraints
--           31 indexes · 6 functions · 22 triggers · 20 RLS-enabled tables
--           20 policies · 29 grants.  No sequences, no views, no PG enums.
--
-- IMPORTANT — replace both placeholder passwords before running.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. ROLES ───────────────────────────────────────────────────────────────
-- ptr_clone      : owner / migrator. SUPERUSER, implicitly BYPASSRLS.
-- ptr_clone_app  : runtime. NOSUPERUSER + NOBYPASSRLS so RLS actually applies.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ptr_clone') THEN
    CREATE ROLE ptr_clone LOGIN PASSWORD 'CHANGE_ME_OWNER'
      SUPERUSER CREATEDB CREATEROLE BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ptr_clone_app') THEN
    CREATE ROLE ptr_clone_app LOGIN PASSWORD 'CHANGE_ME_APP'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT;
  END IF;
END $$;

-- ── 1. DATABASE ────────────────────────────────────────────────────────────
-- Run this separately if the database does not yet exist, then \c into it:
--   CREATE DATABASE ptr_clone OWNER ptr_clone ENCODING 'UTF8';
--   \c ptr_clone
GRANT USAGE ON SCHEMA public TO ptr_clone_app;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2..N — EXTENSIONS, TABLES, CONSTRAINTS, INDEXES, FUNCTIONS, TRIGGERS,
--        RLS, POLICIES, GRANTS   (verbatim pg_dump --schema-only)
-- ═══════════════════════════════════════════════════════════════════════════

-- PostgreSQL database dump

-- Dumped from database version 17.10 (Debian 17.10-1.pgdg12+1)
-- Dumped by pg_dump version 17.10 (Debian 17.10-1.pgdg12+1)

-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: ptr_clone

CREATE SCHEMA drizzle;

ALTER SCHEMA drizzle OWNER TO ptr_clone;

-- Name: citext; Type: EXTENSION; Schema: -; Owner: -

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;

-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';

-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';

-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: ptr_clone

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	NEW."updated_at" = now();
	RETURN NEW;
END;
$$;

ALTER FUNCTION public.set_updated_at() OWNER TO ptr_clone;

-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: ptr_clone

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);

ALTER TABLE drizzle.__drizzle_migrations OWNER TO ptr_clone;

-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: ptr_clone

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO ptr_clone;

-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: ptr_clone

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;

-- Name: alert_media; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.alert_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    alert_id uuid NOT NULL,
    file_id uuid,
    external_url text,
    "position" integer NOT NULL,
    CONSTRAINT alert_media_external_https_check CHECK (((external_url IS NULL) OR (external_url ~ '^https://'::text))),
    CONSTRAINT alert_media_position_check CHECK ((("position" >= 0) AND ("position" <= 4))),
    CONSTRAINT alert_media_source_check CHECK ((num_nonnulls(file_id, external_url) = 1))
);

ALTER TABLE ONLY public.alert_media FORCE ROW LEVEL SECURITY;

ALTER TABLE public.alert_media OWNER TO ptr_clone;

-- Name: alert_questions; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.alert_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    alert_id uuid NOT NULL,
    user_id uuid NOT NULL,
    member_id uuid NOT NULL,
    display_name text NOT NULL,
    body text NOT NULL,
    is_answer boolean DEFAULT false NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by_id uuid
);

ALTER TABLE ONLY public.alert_questions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.alert_questions OWNER TO ptr_clone;

-- Name: alerts; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    user_id uuid NOT NULL,
    member_id uuid NOT NULL,
    display_name text NOT NULL,
    avatar_hash text,
    body text NOT NULL,
    alert_kind text DEFAULT 'trade'::text NOT NULL,
    is_answered boolean DEFAULT false NOT NULL,
    bg_color text,
    font_color text,
    dispatch jsonb DEFAULT '{"sms": false, "push": false, "email": false, "twitter": false, "crossPost": false}'::jsonb NOT NULL,
    scheduled_for timestamp with time zone,
    sent_at timestamp with time zone,
    edited_at timestamp with time zone,
    deleted_at timestamp with time zone,
    deleted_by_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    trade_style text,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, COALESCE(body, ''::text))) STORED,
    direction text,
    symbol text,
    entry_price numeric(18,6),
    stop_price numeric(18,6),
    target_price numeric(18,6),
    legal_disclosure text,
    CONSTRAINT alerts_direction_check CHECK (((direction IS NULL) OR (direction = ANY (ARRAY['long'::text, 'short'::text])))),
    CONSTRAINT alerts_dispatch_shape_check CHECK (((jsonb_typeof(dispatch) = 'object'::text) AND (dispatch ?& ARRAY['sms'::text, 'email'::text, 'twitter'::text, 'push'::text, 'crossPost'::text]) AND ((((((dispatch - 'sms'::text) - 'email'::text) - 'twitter'::text) - 'push'::text) - 'crossPost'::text) = '{}'::jsonb) AND (jsonb_typeof((dispatch -> 'sms'::text)) = 'boolean'::text) AND (jsonb_typeof((dispatch -> 'email'::text)) = 'boolean'::text) AND (jsonb_typeof((dispatch -> 'twitter'::text)) = 'boolean'::text) AND (jsonb_typeof((dispatch -> 'push'::text)) = 'boolean'::text) AND (jsonb_typeof((dispatch -> 'crossPost'::text)) = 'boolean'::text))),
    CONSTRAINT alerts_kind_check CHECK ((alert_kind = ANY (ARRAY['trade'::text, 'non_trade'::text]))),
    CONSTRAINT alerts_trade_style_check CHECK (((trade_style IS NULL) OR (trade_style = ANY (ARRAY['swing'::text, 'day'::text]))))
);

ALTER TABLE ONLY public.alerts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.alerts OWNER TO ptr_clone;

-- Name: audit_log; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    actor_user_id uuid,
    actor_name text,
    event_name text NOT NULL,
    event_detail text NOT NULL,
    target_type text,
    target_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.audit_log FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audit_log OWNER TO ptr_clone;

-- Name: enterprises; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.enterprises (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.enterprises OWNER TO ptr_clone;

-- Name: files; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    uploaded_by_id uuid,
    filename text NOT NULL,
    mime_type text,
    byte_size bigint,
    storage_key text NOT NULL,
    url text,
    kind text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    declared_byte_size bigint,
    status text DEFAULT 'ready'::text NOT NULL,
    content_sha256 text,
    finalized_at timestamp with time zone,
    expires_at timestamp with time zone,
    CONSTRAINT files_alert_image_mime_check CHECK (((kind <> 'alert_image'::text) OR (mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/gif'::text, 'image/webp'::text])))),
    CONSTRAINT files_status_check CHECK ((status = ANY (ARRAY['pending_upload'::text, 'quarantined'::text, 'ready'::text, 'rejected'::text])))
);

ALTER TABLE ONLY public.files FORCE ROW LEVEL SECURITY;

ALTER TABLE public.files OWNER TO ptr_clone;

-- Name: follows; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.follows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    follower_member_id uuid NOT NULL,
    followed_member_id uuid NOT NULL,
    chat_style jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT follows_no_self_check CHECK ((follower_member_id <> followed_member_id))
);

ALTER TABLE ONLY public.follows FORCE ROW LEVEL SECURITY;

ALTER TABLE public.follows OWNER TO ptr_clone;

-- Name: invite_tokens; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.invite_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    token_hash text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    is_trial boolean DEFAULT false NOT NULL,
    display_name text,
    email public.citext,
    max_uses integer DEFAULT 1 NOT NULL,
    use_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_by_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invite_tokens_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'presenter'::text, 'limited_presenter'::text, 'moderator'::text, 'member'::text]))),
    CONSTRAINT invite_tokens_untrusted_role_check CHECK (((role = 'member'::text) OR (created_by_id IS NOT NULL))),
    CONSTRAINT invite_tokens_use_count_check CHECK (((use_count >= 0) AND (use_count <= max_uses)))
);

ALTER TABLE ONLY public.invite_tokens FORCE ROW LEVEL SECURITY;

ALTER TABLE public.invite_tokens OWNER TO ptr_clone;

-- Name: member_notes; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.member_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    subject_member_id uuid NOT NULL,
    author_user_id uuid,
    author_name text NOT NULL,
    author_avatar_hash text,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by_user_id uuid
);

ALTER TABLE ONLY public.member_notes FORCE ROW LEVEL SECURITY;

ALTER TABLE public.member_notes OWNER TO ptr_clone;

-- Name: message_reactions; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.message_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    message_id uuid NOT NULL,
    member_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_reactions_emoji_not_empty CHECK ((length(emoji) > 0))
);

ALTER TABLE ONLY public.message_reactions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.message_reactions OWNER TO ptr_clone;

-- Name: messages; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    user_id uuid NOT NULL,
    member_id uuid NOT NULL,
    display_name text NOT NULL,
    avatar_hash text,
    body text NOT NULL,
    body_html text,
    is_presenter_message boolean DEFAULT false NOT NULL,
    is_trial_author boolean DEFAULT false NOT NULL,
    badges jsonb DEFAULT '[]'::jsonb NOT NULL,
    bg_color text,
    font_color text,
    reply_to_id uuid,
    mentions jsonb DEFAULT '[]'::jsonb NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    edited_at timestamp with time zone,
    deleted_at timestamp with time zone,
    deleted_by_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_answered boolean DEFAULT false NOT NULL,
    answered_at timestamp with time zone,
    answered_by_id uuid,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, COALESCE(body, ''::text))) STORED
);

ALTER TABLE ONLY public.messages FORCE ROW LEVEL SECURITY;

ALTER TABLE public.messages OWNER TO ptr_clone;

-- Name: mutes; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.mutes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    member_id uuid NOT NULL,
    muted_member_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mutes_no_self_check CHECK ((member_id <> muted_member_id))
);

ALTER TABLE ONLY public.mutes FORCE ROW LEVEL SECURITY;

ALTER TABLE public.mutes OWNER TO ptr_clone;

-- Name: note_versions; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.note_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    note_id uuid NOT NULL,
    content_html text,
    updated_by_id uuid,
    version integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.note_versions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.note_versions OWNER TO ptr_clone;

-- Name: notes; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    name text NOT NULL,
    content_html text,
    is_welcome_mat boolean DEFAULT false NOT NULL,
    "position" integer,
    updated_by_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by_id uuid
);

ALTER TABLE ONLY public.notes FORCE ROW LEVEL SECURITY;

ALTER TABLE public.notes OWNER TO ptr_clone;

-- Name: poll_responses; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.poll_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    poll_id uuid NOT NULL,
    member_id uuid NOT NULL,
    choice_index integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.poll_responses FORCE ROW LEVEL SECURITY;

ALTER TABLE public.poll_responses OWNER TO ptr_clone;

-- Name: polls; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.polls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    created_by_id uuid NOT NULL,
    question text NOT NULL,
    choices jsonb NOT NULL,
    state text DEFAULT 'active'::text NOT NULL,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT polls_state_check CHECK ((state = ANY (ARRAY['active'::text, 'closed'::text])))
);

ALTER TABLE ONLY public.polls FORCE ROW LEVEL SECURITY;

ALTER TABLE public.polls OWNER TO ptr_clone;

-- Name: private_messages; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.private_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    sender_member_id uuid NOT NULL,
    recipient_member_id uuid NOT NULL,
    sender_name text NOT NULL,
    sender_avatar_hash text,
    body text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    read_at timestamp with time zone,
    edited_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    recipient_name text NOT NULL,
    recipient_avatar_hash text,
    recipient_is_presenter boolean DEFAULT false NOT NULL,
    deleted_for_sender_at timestamp with time zone,
    deleted_for_recipient_at timestamp with time zone,
    CONSTRAINT no_self_pm CHECK ((sender_member_id <> recipient_member_id))
);

ALTER TABLE ONLY public.private_messages FORCE ROW LEVEL SECURITY;

ALTER TABLE public.private_messages OWNER TO ptr_clone;

-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    user_agent text,
    ip inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    family_id uuid NOT NULL
);

ALTER TABLE public.refresh_tokens OWNER TO ptr_clone;

-- Name: room_channels; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.room_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    channel_type text DEFAULT 'regular'::text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT room_channels_type_check CHECK ((channel_type = ANY (ARRAY['regular'::text, 'presenter_only'::text, 'private'::text])))
);

ALTER TABLE ONLY public.room_channels FORCE ROW LEVEL SECURITY;

ALTER TABLE public.room_channels OWNER TO ptr_clone;

-- Name: room_members; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.room_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    display_name text,
    tagline text,
    badges jsonb DEFAULT '[]'::jsonb NOT NULL,
    can_post boolean DEFAULT true NOT NULL,
    can_post_images boolean DEFAULT false NOT NULL,
    can_edit_own_message boolean DEFAULT false NOT NULL,
    can_delete_own_message boolean DEFAULT false NOT NULL,
    can_public_reply boolean DEFAULT false NOT NULL,
    can_edit_notes boolean DEFAULT false NOT NULL,
    can_edit_username boolean DEFAULT false NOT NULL,
    can_publish_mic boolean DEFAULT false NOT NULL,
    can_publish_cam boolean DEFAULT false NOT NULL,
    can_publish_screen boolean DEFAULT false NOT NULL,
    can_use_admin_chat boolean DEFAULT false NOT NULL,
    can_use_group_chat boolean DEFAULT true NOT NULL,
    can_pm_users boolean DEFAULT false NOT NULL,
    can_pm_admins boolean DEFAULT false NOT NULL,
    can_access_files boolean DEFAULT false NOT NULL,
    can_access_archives boolean DEFAULT true NOT NULL,
    is_muted boolean DEFAULT false NOT NULL,
    is_pm_restricted boolean DEFAULT false NOT NULL,
    is_trial boolean DEFAULT false NOT NULL,
    trial_expires_at timestamp with time zone,
    hide_personal_info boolean DEFAULT false NOT NULL,
    capabilities_overridden boolean DEFAULT false NOT NULL,
    invited_at timestamp with time zone,
    joined_at timestamp with time zone,
    last_seen_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    muted_until timestamp with time zone,
    alert_filter_for jsonb DEFAULT '{"mode": "exclude", "memberIds": []}'::jsonb NOT NULL,
    CONSTRAINT room_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'presenter'::text, 'limited_presenter'::text, 'moderator'::text, 'member'::text])))
);

ALTER TABLE ONLY public.room_members FORCE ROW LEVEL SECURITY;

ALTER TABLE public.room_members OWNER TO ptr_clone;

-- Name: room_state; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.room_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    room_id uuid NOT NULL,
    roster_count integer DEFAULT 0 NOT NULL,
    is_recording boolean DEFAULT false NOT NULL,
    is_recording_paused boolean DEFAULT false NOT NULL,
    recording_user_id uuid,
    recording_started_at timestamp with time zone,
    media_playback jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_message_at timestamp with time zone,
    last_alert_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    global_mute_non_staff boolean DEFAULT false NOT NULL
);

ALTER TABLE ONLY public.room_state FORCE ROW LEVEL SECURITY;

ALTER TABLE public.room_state OWNER TO ptr_clone;

-- Name: rooms; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    uuid_short text NOT NULL,
    name text NOT NULL,
    room_type text DEFAULT 'room'::text NOT NULL,
    state text DEFAULT 'open'::text NOT NULL,
    auth_mode text DEFAULT 'open'::text NOT NULL,
    max_capacity integer DEFAULT 100 NOT NULL,
    config jsonb NOT NULL,
    branding jsonb DEFAULT '{}'::jsonb NOT NULL,
    integrations jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_ping_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rooms_access_tiers_argon2id_check CHECK ((jsonb_array_length((config #> '{access,tiers}'::text[])) = jsonb_array_length(jsonb_path_query_array(config, '$."access"."tiers"[*]?(@."passwordHash".type() == "string" && @."passwordHash" like_regex "^[$]argon2id[$]")'::jsonpath)))),
    CONSTRAINT rooms_access_tiers_array_check CHECK (COALESCE(((jsonb_typeof((config #> '{access,tiers}'::text[])) = 'array'::text) AND (jsonb_array_length((config #> '{access,tiers}'::text[])) <= 10)), false)),
    CONSTRAINT rooms_access_tiers_member_role_check CHECK ((jsonb_array_length((config #> '{access,tiers}'::text[])) = jsonb_array_length(jsonb_path_query_array(config, '$."access"."tiers"[*]?(@."role" == "member")'::jsonpath)))),
    CONSTRAINT rooms_access_tiers_trial_check CHECK ((jsonb_array_length((config #> '{access,tiers}'::text[])) = jsonb_array_length(jsonb_path_query_array(config, '$."access"."tiers"[*]?(((@."isTrial" == true && @."trialDays".type() == "number") && @."trialDays" > 0) && @."trialDays".floor() == @."trialDays" || @."isTrial" == false && @."trialDays" == null)'::jsonpath)))),
    CONSTRAINT rooms_auth_mode_check CHECK ((auth_mode = ANY (ARRAY['open'::text, 'password'::text, 'invite'::text]))),
    CONSTRAINT rooms_state_check CHECK ((state = ANY (ARRAY['open'::text, 'closed'::text, 'locked'::text])))
);

ALTER TABLE ONLY public.rooms FORCE ROW LEVEL SECURITY;

ALTER TABLE public.rooms OWNER TO ptr_clone;

-- Name: users; Type: TABLE; Schema: public; Owner: ptr_clone

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email public.citext NOT NULL,
    email_hash text NOT NULL,
    password_hash text,
    display_name text NOT NULL,
    avatar_url text,
    phone text,
    discord_id text,
    is_platform_admin boolean DEFAULT false NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_guest boolean DEFAULT false NOT NULL,
    guest_created_in_room_id uuid,
    CONSTRAINT users_guest_password_check CHECK (((NOT is_guest) OR (password_hash IS NULL))),
    CONSTRAINT users_preferences_object_check CHECK ((jsonb_typeof(preferences) = 'object'::text))
);

ALTER TABLE public.users OWNER TO ptr_clone;

-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: ptr_clone

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);

-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: ptr_clone

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);

-- Name: alert_media alert_media_alert_position_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alert_media
    ADD CONSTRAINT alert_media_alert_position_unique UNIQUE (enterprise_id, room_id, alert_id, "position");

-- Name: alert_media alert_media_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alert_media
    ADD CONSTRAINT alert_media_pkey PRIMARY KEY (id);

-- Name: alert_media alert_media_uploaded_file_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alert_media
    ADD CONSTRAINT alert_media_uploaded_file_unique UNIQUE (enterprise_id, room_id, file_id);

-- Name: alert_questions alert_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alert_questions
    ADD CONSTRAINT alert_questions_pkey PRIMARY KEY (id);

-- Name: alert_questions alert_questions_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alert_questions
    ADD CONSTRAINT alert_questions_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);

-- Name: alerts alerts_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: alerts alerts_tenant_room_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_tenant_room_id_unique UNIQUE (enterprise_id, room_id, id);

-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);

-- Name: audit_log audit_log_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: enterprises enterprises_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.enterprises
    ADD CONSTRAINT enterprises_pkey PRIMARY KEY (id);

-- Name: enterprises enterprises_slug_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.enterprises
    ADD CONSTRAINT enterprises_slug_unique UNIQUE (slug);

-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);

-- Name: files files_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: files files_tenant_room_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_tenant_room_id_unique UNIQUE (enterprise_id, room_id, id);

-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (id);

-- Name: follows follows_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: follows follows_tenant_room_members_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_tenant_room_members_unique UNIQUE (enterprise_id, room_id, follower_member_id, followed_member_id);

-- Name: invite_tokens invite_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.invite_tokens
    ADD CONSTRAINT invite_tokens_pkey PRIMARY KEY (id);

-- Name: invite_tokens invite_tokens_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.invite_tokens
    ADD CONSTRAINT invite_tokens_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: invite_tokens invite_tokens_token_hash_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.invite_tokens
    ADD CONSTRAINT invite_tokens_token_hash_unique UNIQUE (token_hash);

-- Name: member_notes member_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.member_notes
    ADD CONSTRAINT member_notes_pkey PRIMARY KEY (id);

-- Name: member_notes member_notes_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.member_notes
    ADD CONSTRAINT member_notes_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (id);

-- Name: message_reactions message_reactions_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: message_reactions message_reactions_tenant_message_member_emoji_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_tenant_message_member_emoji_unique UNIQUE (enterprise_id, room_id, message_id, member_id, emoji);

-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

-- Name: messages messages_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: messages messages_tenant_room_channel_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_tenant_room_channel_id_unique UNIQUE (enterprise_id, room_id, channel_id, id);

-- Name: messages messages_tenant_room_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_tenant_room_id_unique UNIQUE (enterprise_id, room_id, id);

-- Name: mutes mutes_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.mutes
    ADD CONSTRAINT mutes_pkey PRIMARY KEY (id);

-- Name: mutes mutes_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.mutes
    ADD CONSTRAINT mutes_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: mutes mutes_tenant_room_members_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.mutes
    ADD CONSTRAINT mutes_tenant_room_members_unique UNIQUE (enterprise_id, room_id, member_id, muted_member_id);

-- Name: note_versions note_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.note_versions
    ADD CONSTRAINT note_versions_pkey PRIMARY KEY (id);

-- Name: note_versions note_versions_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.note_versions
    ADD CONSTRAINT note_versions_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: note_versions note_versions_tenant_note_version_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.note_versions
    ADD CONSTRAINT note_versions_tenant_note_version_unique UNIQUE (enterprise_id, note_id, version);

-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);

-- Name: notes notes_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: poll_responses poll_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.poll_responses
    ADD CONSTRAINT poll_responses_pkey PRIMARY KEY (id);

-- Name: poll_responses poll_responses_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.poll_responses
    ADD CONSTRAINT poll_responses_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: poll_responses poll_responses_tenant_poll_member_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.poll_responses
    ADD CONSTRAINT poll_responses_tenant_poll_member_unique UNIQUE (enterprise_id, poll_id, member_id);

-- Name: polls polls_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_pkey PRIMARY KEY (id);

-- Name: polls polls_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: private_messages private_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.private_messages
    ADD CONSTRAINT private_messages_pkey PRIMARY KEY (id);

-- Name: private_messages private_messages_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.private_messages
    ADD CONSTRAINT private_messages_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);

-- Name: refresh_tokens refresh_tokens_token_hash_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_unique UNIQUE (token_hash);

-- Name: room_channels room_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_channels
    ADD CONSTRAINT room_channels_pkey PRIMARY KEY (id);

-- Name: room_channels room_channels_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_channels
    ADD CONSTRAINT room_channels_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: room_channels room_channels_tenant_room_name_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_channels
    ADD CONSTRAINT room_channels_tenant_room_name_unique UNIQUE (enterprise_id, room_id, name);

-- Name: room_members room_members_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_members
    ADD CONSTRAINT room_members_pkey PRIMARY KEY (id);

-- Name: room_members room_members_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_members
    ADD CONSTRAINT room_members_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: room_members room_members_tenant_room_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_members
    ADD CONSTRAINT room_members_tenant_room_id_unique UNIQUE (enterprise_id, room_id, id);

-- Name: room_members room_members_tenant_room_user_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_members
    ADD CONSTRAINT room_members_tenant_room_user_unique UNIQUE (enterprise_id, room_id, user_id);

-- Name: room_state room_state_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_state
    ADD CONSTRAINT room_state_pkey PRIMARY KEY (id);

-- Name: room_state room_state_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_state
    ADD CONSTRAINT room_state_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: room_state room_state_tenant_room_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_state
    ADD CONSTRAINT room_state_tenant_room_unique UNIQUE (enterprise_id, room_id);

-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);

-- Name: rooms rooms_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_tenant_id_unique UNIQUE (enterprise_id, id);

-- Name: rooms rooms_tenant_uuid_short_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_tenant_uuid_short_unique UNIQUE (enterprise_id, uuid_short);

-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- Name: alert_media_file_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX alert_media_file_idx ON public.alert_media USING btree (enterprise_id, room_id, file_id);

-- Name: alert_questions_tenant_alert_created_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX alert_questions_tenant_alert_created_idx ON public.alert_questions USING btree (enterprise_id, alert_id, created_at, id);

-- Name: alerts_search_vector_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX alerts_search_vector_idx ON public.alerts USING gin (search_vector);

-- Name: alerts_tenant_room_created_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX alerts_tenant_room_created_idx ON public.alerts USING btree (enterprise_id, room_id, created_at DESC NULLS LAST, id DESC NULLS LAST);

-- Name: alerts_tenant_room_scheduled_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX alerts_tenant_room_scheduled_idx ON public.alerts USING btree (enterprise_id, room_id, scheduled_for, id);

-- Name: alerts_tenant_room_style_created_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX alerts_tenant_room_style_created_idx ON public.alerts USING btree (enterprise_id, room_id, trade_style, created_at DESC NULLS LAST, id DESC NULLS LAST);

-- Name: alerts_tenant_room_symbol_created_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX alerts_tenant_room_symbol_created_idx ON public.alerts USING btree (enterprise_id, room_id, symbol, created_at DESC NULLS LAST, id DESC NULLS LAST);

-- Name: audit_log_tenant_room_created_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX audit_log_tenant_room_created_idx ON public.audit_log USING btree (enterprise_id, room_id, created_at DESC NULLS LAST, id DESC NULLS LAST);

-- Name: files_tenant_room_created_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX files_tenant_room_created_idx ON public.files USING btree (enterprise_id, room_id, created_at DESC NULLS LAST, id DESC NULLS LAST);

-- Name: invite_tokens_tenant_created_by_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX invite_tokens_tenant_created_by_idx ON public.invite_tokens USING btree (enterprise_id, created_by_id);

-- Name: invite_tokens_tenant_expires_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX invite_tokens_tenant_expires_idx ON public.invite_tokens USING btree (enterprise_id, expires_at);

-- Name: invite_tokens_tenant_room_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX invite_tokens_tenant_room_idx ON public.invite_tokens USING btree (enterprise_id, room_id);

-- Name: member_notes_tenant_room_subject_created_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX member_notes_tenant_room_subject_created_idx ON public.member_notes USING btree (enterprise_id, room_id, subject_member_id, created_at DESC NULLS LAST);

-- Name: message_reactions_tenant_message_emoji_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX message_reactions_tenant_message_emoji_idx ON public.message_reactions USING btree (enterprise_id, room_id, message_id, emoji);

-- Name: messages_search_vector_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX messages_search_vector_idx ON public.messages USING gin (search_vector);

-- Name: messages_tenant_active_created_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX messages_tenant_active_created_idx ON public.messages USING btree (enterprise_id, room_id, created_at DESC NULLS LAST, id DESC NULLS LAST) WHERE (deleted_at IS NULL);

-- Name: messages_tenant_room_channel_created_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX messages_tenant_room_channel_created_idx ON public.messages USING btree (enterprise_id, room_id, channel_id, created_at DESC NULLS LAST, id DESC NULLS LAST);

-- Name: messages_tenant_user_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX messages_tenant_user_idx ON public.messages USING btree (enterprise_id, user_id);

-- Name: mutes_tenant_room_member_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX mutes_tenant_room_member_idx ON public.mutes USING btree (enterprise_id, room_id, member_id);

-- Name: notes_tenant_room_active_position_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX notes_tenant_room_active_position_idx ON public.notes USING btree (enterprise_id, room_id, "position", id) WHERE (deleted_at IS NULL);

-- Name: private_messages_peer_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX private_messages_peer_idx ON public.private_messages USING btree (enterprise_id, room_id, LEAST(sender_member_id, recipient_member_id), GREATEST(sender_member_id, recipient_member_id), created_at DESC NULLS LAST, id DESC NULLS LAST);

-- Name: private_messages_tenant_recipient_unread_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX private_messages_tenant_recipient_unread_idx ON public.private_messages USING btree (enterprise_id, room_id, recipient_member_id, created_at DESC NULLS LAST, id DESC NULLS LAST) WHERE ((read_at IS NULL) AND (deleted_at IS NULL));

-- Name: refresh_tokens_family_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX refresh_tokens_family_idx ON public.refresh_tokens USING btree (family_id);

-- Name: refresh_tokens_user_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX refresh_tokens_user_idx ON public.refresh_tokens USING btree (user_id);

-- Name: room_members_tenant_room_role_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX room_members_tenant_room_role_idx ON public.room_members USING btree (enterprise_id, room_id, role);

-- Name: room_members_tenant_room_seen_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX room_members_tenant_room_seen_idx ON public.room_members USING btree (enterprise_id, room_id, last_seen_at);

-- Name: room_members_tenant_user_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX room_members_tenant_user_idx ON public.room_members USING btree (enterprise_id, user_id);

-- Name: rooms_tenant_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX rooms_tenant_idx ON public.rooms USING btree (enterprise_id);

-- Name: rooms_tenant_owner_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX rooms_tenant_owner_idx ON public.rooms USING btree (enterprise_id, owner_id);

-- Name: users_email_hash_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX users_email_hash_idx ON public.users USING btree (email_hash);

-- Name: users_guest_created_in_room_idx; Type: INDEX; Schema: public; Owner: ptr_clone

CREATE INDEX users_guest_created_in_room_idx ON public.users USING btree (guest_created_in_room_id);

-- Name: alert_questions alert_questions_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER alert_questions_set_updated_at BEFORE UPDATE ON public.alert_questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: alerts alerts_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER alerts_set_updated_at BEFORE UPDATE ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: audit_log audit_log_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER audit_log_set_updated_at BEFORE UPDATE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: enterprises enterprises_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER enterprises_set_updated_at BEFORE UPDATE ON public.enterprises FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: files files_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER files_set_updated_at BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: follows follows_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER follows_set_updated_at BEFORE UPDATE ON public.follows FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: invite_tokens invite_tokens_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER invite_tokens_set_updated_at BEFORE UPDATE ON public.invite_tokens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: member_notes member_notes_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER member_notes_set_updated_at BEFORE UPDATE ON public.member_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: message_reactions message_reactions_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER message_reactions_set_updated_at BEFORE UPDATE ON public.message_reactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: messages messages_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER messages_set_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: mutes mutes_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER mutes_set_updated_at BEFORE UPDATE ON public.mutes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: note_versions note_versions_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER note_versions_set_updated_at BEFORE UPDATE ON public.note_versions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: notes notes_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER notes_set_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: poll_responses poll_responses_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER poll_responses_set_updated_at BEFORE UPDATE ON public.poll_responses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: polls polls_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER polls_set_updated_at BEFORE UPDATE ON public.polls FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: private_messages private_messages_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER private_messages_set_updated_at BEFORE UPDATE ON public.private_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: refresh_tokens refresh_tokens_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER refresh_tokens_set_updated_at BEFORE UPDATE ON public.refresh_tokens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: room_channels room_channels_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER room_channels_set_updated_at BEFORE UPDATE ON public.room_channels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: room_members room_members_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER room_members_set_updated_at BEFORE UPDATE ON public.room_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: room_state room_state_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER room_state_set_updated_at BEFORE UPDATE ON public.room_state FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: rooms rooms_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER rooms_set_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: users users_set_updated_at; Type: TRIGGER; Schema: public; Owner: ptr_clone

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Name: alert_media alert_media_alert_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alert_media
    ADD CONSTRAINT alert_media_alert_fk FOREIGN KEY (enterprise_id, room_id, alert_id) REFERENCES public.alerts(enterprise_id, room_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: alert_media alert_media_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alert_media
    ADD CONSTRAINT alert_media_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: alert_media alert_media_file_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alert_media
    ADD CONSTRAINT alert_media_file_fk FOREIGN KEY (enterprise_id, room_id, file_id) REFERENCES public.files(enterprise_id, room_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Name: alert_media alert_media_tenant_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alert_media
    ADD CONSTRAINT alert_media_tenant_room_fk FOREIGN KEY (enterprise_id, room_id) REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: alert_questions alert_questions_deleted_by_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alert_questions
    ADD CONSTRAINT alert_questions_deleted_by_fk FOREIGN KEY (deleted_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Name: alert_questions alert_questions_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alert_questions
    ADD CONSTRAINT alert_questions_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: alert_questions alert_questions_tenant_alert_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alert_questions
    ADD CONSTRAINT alert_questions_tenant_alert_fk FOREIGN KEY (enterprise_id, alert_id) REFERENCES public.alerts(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: alert_questions alert_questions_tenant_member_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alert_questions
    ADD CONSTRAINT alert_questions_tenant_member_fk FOREIGN KEY (enterprise_id, member_id) REFERENCES public.room_members(enterprise_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Name: alert_questions alert_questions_tenant_parent_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alert_questions
    ADD CONSTRAINT alert_questions_tenant_parent_fk FOREIGN KEY (enterprise_id, parent_id) REFERENCES public.alert_questions(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: alert_questions alert_questions_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alert_questions
    ADD CONSTRAINT alert_questions_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Name: alerts alerts_deleted_by_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_deleted_by_fk FOREIGN KEY (deleted_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Name: alerts alerts_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: alerts alerts_tenant_member_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_tenant_member_fk FOREIGN KEY (enterprise_id, member_id) REFERENCES public.room_members(enterprise_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Name: alerts alerts_tenant_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_tenant_room_fk FOREIGN KEY (enterprise_id, room_id) REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: alerts alerts_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Name: audit_log audit_log_actor_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_actor_user_fk FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Name: audit_log audit_log_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: audit_log audit_log_tenant_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_tenant_room_fk FOREIGN KEY (enterprise_id, room_id) REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: files files_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: files files_tenant_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_tenant_room_fk FOREIGN KEY (enterprise_id, room_id) REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: files files_uploaded_by_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_uploaded_by_fk FOREIGN KEY (uploaded_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Name: follows follows_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: follows follows_tenant_followed_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_tenant_followed_fk FOREIGN KEY (enterprise_id, room_id, followed_member_id) REFERENCES public.room_members(enterprise_id, room_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: follows follows_tenant_follower_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_tenant_follower_fk FOREIGN KEY (enterprise_id, room_id, follower_member_id) REFERENCES public.room_members(enterprise_id, room_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: follows follows_tenant_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_tenant_room_fk FOREIGN KEY (enterprise_id, room_id) REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: invite_tokens invite_tokens_created_by_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.invite_tokens
    ADD CONSTRAINT invite_tokens_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Name: invite_tokens invite_tokens_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.invite_tokens
    ADD CONSTRAINT invite_tokens_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: invite_tokens invite_tokens_tenant_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.invite_tokens
    ADD CONSTRAINT invite_tokens_tenant_room_fk FOREIGN KEY (enterprise_id, room_id) REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: member_notes member_notes_author_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.member_notes
    ADD CONSTRAINT member_notes_author_fk FOREIGN KEY (author_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Name: member_notes member_notes_deleted_by_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.member_notes
    ADD CONSTRAINT member_notes_deleted_by_user_fk FOREIGN KEY (deleted_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Name: member_notes member_notes_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.member_notes
    ADD CONSTRAINT member_notes_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: member_notes member_notes_tenant_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.member_notes
    ADD CONSTRAINT member_notes_tenant_room_fk FOREIGN KEY (enterprise_id, room_id) REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: member_notes member_notes_tenant_subject_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.member_notes
    ADD CONSTRAINT member_notes_tenant_subject_fk FOREIGN KEY (enterprise_id, room_id, subject_member_id) REFERENCES public.room_members(enterprise_id, room_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: message_reactions message_reactions_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: message_reactions message_reactions_tenant_member_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_tenant_member_fk FOREIGN KEY (enterprise_id, room_id, member_id) REFERENCES public.room_members(enterprise_id, room_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: message_reactions message_reactions_tenant_message_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_tenant_message_fk FOREIGN KEY (enterprise_id, room_id, message_id) REFERENCES public.messages(enterprise_id, room_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: message_reactions message_reactions_tenant_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_tenant_room_fk FOREIGN KEY (enterprise_id, room_id) REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: messages messages_answered_by_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_answered_by_fk FOREIGN KEY (answered_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Name: messages messages_deleted_by_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_deleted_by_fk FOREIGN KEY (deleted_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Name: messages messages_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: messages messages_tenant_channel_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_tenant_channel_fk FOREIGN KEY (enterprise_id, channel_id) REFERENCES public.room_channels(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: messages messages_tenant_member_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_tenant_member_fk FOREIGN KEY (enterprise_id, member_id) REFERENCES public.room_members(enterprise_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Name: messages messages_tenant_reply_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_tenant_reply_fk FOREIGN KEY (enterprise_id, room_id, channel_id, reply_to_id) REFERENCES public.messages(enterprise_id, room_id, channel_id, id) ON UPDATE CASCADE;

-- Name: messages messages_tenant_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_tenant_room_fk FOREIGN KEY (enterprise_id, room_id) REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: messages messages_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Name: mutes mutes_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.mutes
    ADD CONSTRAINT mutes_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: mutes mutes_tenant_member_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.mutes
    ADD CONSTRAINT mutes_tenant_member_fk FOREIGN KEY (enterprise_id, room_id, member_id) REFERENCES public.room_members(enterprise_id, room_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: mutes mutes_tenant_muted_member_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.mutes
    ADD CONSTRAINT mutes_tenant_muted_member_fk FOREIGN KEY (enterprise_id, room_id, muted_member_id) REFERENCES public.room_members(enterprise_id, room_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: mutes mutes_tenant_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.mutes
    ADD CONSTRAINT mutes_tenant_room_fk FOREIGN KEY (enterprise_id, room_id) REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: note_versions note_versions_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.note_versions
    ADD CONSTRAINT note_versions_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: note_versions note_versions_tenant_note_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.note_versions
    ADD CONSTRAINT note_versions_tenant_note_fk FOREIGN KEY (enterprise_id, note_id) REFERENCES public.notes(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: note_versions note_versions_updated_by_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.note_versions
    ADD CONSTRAINT note_versions_updated_by_fk FOREIGN KEY (updated_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Name: notes notes_deleted_by_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_deleted_by_fk FOREIGN KEY (deleted_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Name: notes notes_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: notes notes_tenant_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_tenant_room_fk FOREIGN KEY (enterprise_id, room_id) REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: notes notes_updated_by_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_updated_by_fk FOREIGN KEY (updated_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Name: poll_responses poll_responses_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.poll_responses
    ADD CONSTRAINT poll_responses_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: poll_responses poll_responses_tenant_member_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.poll_responses
    ADD CONSTRAINT poll_responses_tenant_member_fk FOREIGN KEY (enterprise_id, member_id) REFERENCES public.room_members(enterprise_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Name: poll_responses poll_responses_tenant_poll_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.poll_responses
    ADD CONSTRAINT poll_responses_tenant_poll_fk FOREIGN KEY (enterprise_id, poll_id) REFERENCES public.polls(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: polls polls_created_by_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Name: polls polls_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: polls polls_tenant_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_tenant_room_fk FOREIGN KEY (enterprise_id, room_id) REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: private_messages private_messages_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.private_messages
    ADD CONSTRAINT private_messages_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: private_messages private_messages_tenant_recipient_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.private_messages
    ADD CONSTRAINT private_messages_tenant_recipient_fk FOREIGN KEY (enterprise_id, room_id, recipient_member_id) REFERENCES public.room_members(enterprise_id, room_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: private_messages private_messages_tenant_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.private_messages
    ADD CONSTRAINT private_messages_tenant_room_fk FOREIGN KEY (enterprise_id, room_id) REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: private_messages private_messages_tenant_sender_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.private_messages
    ADD CONSTRAINT private_messages_tenant_sender_fk FOREIGN KEY (enterprise_id, room_id, sender_member_id) REFERENCES public.room_members(enterprise_id, room_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: refresh_tokens refresh_tokens_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: room_channels room_channels_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_channels
    ADD CONSTRAINT room_channels_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: room_channels room_channels_tenant_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_channels
    ADD CONSTRAINT room_channels_tenant_room_fk FOREIGN KEY (enterprise_id, room_id) REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: room_members room_members_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_members
    ADD CONSTRAINT room_members_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: room_members room_members_tenant_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_members
    ADD CONSTRAINT room_members_tenant_room_fk FOREIGN KEY (enterprise_id, room_id) REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: room_members room_members_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_members
    ADD CONSTRAINT room_members_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Name: room_state room_state_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_state
    ADD CONSTRAINT room_state_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: room_state room_state_recording_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_state
    ADD CONSTRAINT room_state_recording_user_fk FOREIGN KEY (recording_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Name: room_state room_state_tenant_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.room_state
    ADD CONSTRAINT room_state_tenant_room_fk FOREIGN KEY (enterprise_id, room_id) REFERENCES public.rooms(enterprise_id, id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: rooms rooms_enterprise_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_enterprise_fk FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Name: rooms rooms_owner_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_owner_fk FOREIGN KEY (owner_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Name: users users_guest_created_in_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: ptr_clone

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_guest_created_in_room_fk FOREIGN KEY (guest_created_in_room_id) REFERENCES public.rooms(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Name: alert_media; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.alert_media ENABLE ROW LEVEL SECURITY;

-- Name: alert_questions; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.alert_questions ENABLE ROW LEVEL SECURITY;

-- Name: alerts; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Name: files; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Name: follows; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Name: invite_tokens; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Name: member_notes; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;

-- Name: message_reactions; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Name: mutes; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.mutes ENABLE ROW LEVEL SECURITY;

-- Name: note_versions; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;

-- Name: notes; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════════════════════
-- SQL-LANGUAGE FUNCTIONS — deferred until after tables exist.
-- pg_dump emits these alphabetically BEFORE the tables they reference, which
-- fails: PostgreSQL validates LANGUAGE sql bodies at CREATE time. Moved here.
-- (set_updated_at stays above; LANGUAGE plpgsql bodies are not validated.)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE FUNCTION public.auth_locate_invite_tenant(p_token_hash text) RETURNS TABLE(enterprise_id uuid, room_id uuid, invite_id uuid)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  SELECT invite.enterprise_id, invite.room_id, invite.id
  FROM public.invite_tokens AS invite
  WHERE invite.token_hash = p_token_hash
$$;
ALTER FUNCTION public.auth_locate_invite_tenant(p_token_hash text) OWNER TO ptr_clone;

CREATE FUNCTION public.auth_locate_room_tenant(p_room_id uuid) RETURNS TABLE(enterprise_id uuid, room_state text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  SELECT room.enterprise_id, room.state
  FROM public.rooms AS room
  WHERE room.id = p_room_id
$$;
ALTER FUNCTION public.auth_locate_room_tenant(p_room_id uuid) OWNER TO ptr_clone;

CREATE FUNCTION public.auth_resolve_membership(p_user_id uuid, p_room_id uuid) RETURNS TABLE(enterprise_id uuid, member_id uuid, member_role text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  SELECT room.enterprise_id, member.id, member.role
  FROM public.rooms AS room
  INNER JOIN public.room_members AS member
    ON member.enterprise_id = room.enterprise_id
    AND member.room_id = room.id
    AND member.user_id = p_user_id
  WHERE room.id = p_room_id
$$;
ALTER FUNCTION public.auth_resolve_membership(p_user_id uuid, p_room_id uuid) OWNER TO ptr_clone;

CREATE FUNCTION public.delete_expired_alert_media(p_storage_key text, p_now timestamp with time zone) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  WITH deleted AS (
    DELETE FROM public.files AS file
    WHERE file.kind = 'alert_image'
      AND file.status = 'rejected'
      AND file.storage_key = p_storage_key
      AND file.expires_at IS NOT NULL
      AND file.expires_at <= p_now
      AND NOT EXISTS (
        SELECT 1
        FROM public.alert_media AS media
        WHERE media.enterprise_id = file.enterprise_id
          AND media.file_id = file.id
      )
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM deleted)
$$;
ALTER FUNCTION public.delete_expired_alert_media(p_storage_key text, p_now timestamp with time zone) OWNER TO ptr_clone;

CREATE FUNCTION public.expire_unattached_alert_media(p_now timestamp with time zone) RETURNS TABLE(storage_key text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  UPDATE public.files AS file
  SET status = 'rejected',
      updated_at = p_now
  WHERE file.kind = 'alert_image'
    AND file.expires_at IS NOT NULL
    AND file.expires_at <= p_now
    AND NOT EXISTS (
      SELECT 1
      FROM public.alert_media AS media
      WHERE media.enterprise_id = file.enterprise_id
        AND media.file_id = file.id
    )
  RETURNING file.storage_key
$$;
ALTER FUNCTION public.expire_unattached_alert_media(p_now timestamp with time zone) OWNER TO ptr_clone;

-- Name: private_messages pm_participant_only; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY pm_participant_only ON public.private_messages TO ptr_clone_app USING (((enterprise_id = (current_setting('app.enterprise_id'::text, true))::uuid) AND ((current_setting('app.member_id'::text, true) = ''::text) OR ((sender_member_id)::text = current_setting('app.member_id'::text, true)) OR ((recipient_member_id)::text = current_setting('app.member_id'::text, true)))));

-- Name: poll_responses; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;

-- Name: polls; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

-- Name: private_messages; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- Name: room_channels; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.room_channels ENABLE ROW LEVEL SECURITY;

-- Name: room_members; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- Name: room_state; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.room_state ENABLE ROW LEVEL SECURITY;

-- Name: rooms; Type: ROW SECURITY; Schema: public; Owner: ptr_clone

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Name: alert_media tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.alert_media TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: alert_questions tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.alert_questions TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: alerts tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.alerts TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: audit_log tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.audit_log TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: files tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.files TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: follows tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.follows TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: invite_tokens tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.invite_tokens TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: member_notes tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.member_notes TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: message_reactions tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.message_reactions TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: messages tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.messages TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: mutes tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.mutes TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: note_versions tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.note_versions TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: notes tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.notes TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: poll_responses tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.poll_responses TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: polls tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.polls TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: room_channels tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.room_channels TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: room_members tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.room_members TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: room_state tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.room_state TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: rooms tenant_isolation; Type: POLICY; Schema: public; Owner: ptr_clone

CREATE POLICY tenant_isolation ON public.rooms TO ptr_clone_app USING ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)) WITH CHECK ((enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid));

-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner

GRANT USAGE ON SCHEMA public TO ptr_clone_app;

-- Name: FUNCTION auth_locate_invite_tenant(p_token_hash text); Type: ACL; Schema: public; Owner: ptr_clone

REVOKE ALL ON FUNCTION public.auth_locate_invite_tenant(p_token_hash text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.auth_locate_invite_tenant(p_token_hash text) TO ptr_clone_app;

-- Name: FUNCTION auth_locate_room_tenant(p_room_id uuid); Type: ACL; Schema: public; Owner: ptr_clone

REVOKE ALL ON FUNCTION public.auth_locate_room_tenant(p_room_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.auth_locate_room_tenant(p_room_id uuid) TO ptr_clone_app;

-- Name: FUNCTION auth_resolve_membership(p_user_id uuid, p_room_id uuid); Type: ACL; Schema: public; Owner: ptr_clone

REVOKE ALL ON FUNCTION public.auth_resolve_membership(p_user_id uuid, p_room_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.auth_resolve_membership(p_user_id uuid, p_room_id uuid) TO ptr_clone_app;

-- Name: FUNCTION delete_expired_alert_media(p_storage_key text, p_now timestamp with time zone); Type: ACL; Schema: public; Owner: ptr_clone

REVOKE ALL ON FUNCTION public.delete_expired_alert_media(p_storage_key text, p_now timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_expired_alert_media(p_storage_key text, p_now timestamp with time zone) TO ptr_clone_app;

-- Name: FUNCTION expire_unattached_alert_media(p_now timestamp with time zone); Type: ACL; Schema: public; Owner: ptr_clone

REVOKE ALL ON FUNCTION public.expire_unattached_alert_media(p_now timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.expire_unattached_alert_media(p_now timestamp with time zone) TO ptr_clone_app;

-- Name: TABLE alert_media; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.alert_media TO ptr_clone_app;

-- Name: TABLE alert_questions; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.alert_questions TO ptr_clone_app;

-- Name: TABLE alerts; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.alerts TO ptr_clone_app;

-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log TO ptr_clone_app;

-- Name: TABLE enterprises; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.enterprises TO ptr_clone_app;

-- Name: TABLE files; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.files TO ptr_clone_app;

-- Name: TABLE follows; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.follows TO ptr_clone_app;

-- Name: TABLE invite_tokens; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.invite_tokens TO ptr_clone_app;

-- Name: TABLE member_notes; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.member_notes TO ptr_clone_app;

-- Name: TABLE message_reactions; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.message_reactions TO ptr_clone_app;

-- Name: TABLE messages; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.messages TO ptr_clone_app;

-- Name: TABLE mutes; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.mutes TO ptr_clone_app;

-- Name: TABLE note_versions; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.note_versions TO ptr_clone_app;

-- Name: TABLE notes; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notes TO ptr_clone_app;

-- Name: TABLE poll_responses; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.poll_responses TO ptr_clone_app;

-- Name: TABLE polls; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.polls TO ptr_clone_app;

-- Name: TABLE private_messages; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.private_messages TO ptr_clone_app;

-- Name: TABLE refresh_tokens; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.refresh_tokens TO ptr_clone_app;

-- Name: TABLE room_channels; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.room_channels TO ptr_clone_app;

-- Name: TABLE room_members; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.room_members TO ptr_clone_app;

-- Name: TABLE room_state; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.room_state TO ptr_clone_app;

-- Name: TABLE rooms; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.rooms TO ptr_clone_app;

-- Name: TABLE users; Type: ACL; Schema: public; Owner: ptr_clone

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.users TO ptr_clone_app;

-- PostgreSQL database dump complete


-- ═══════════════════════════════════════════════════════════════════════════
-- RUNTIME CONTRACT — the app MUST do this or it sees zero rows
-- ═══════════════════════════════════════════════════════════════════════════
-- Connect as ptr_clone_app, then per transaction:
--     SET LOCAL app.enterprise_id = '<enterprise uuid>';
--     SET LOCAL app.member_id     = '<room_member uuid>';   -- '' for server ctx
--
-- Bootstrap (before the tenant is known) uses the SECURITY DEFINER helpers:
--     SELECT * FROM auth_locate_room_tenant('<room uuid>');
--     SELECT * FROM auth_locate_invite_tenant('<token hash>');
--     SELECT * FROM auth_resolve_membership('<user uuid>', '<room uuid>');
--
-- Verify isolation after install:
--     SET ROLE ptr_clone_app;
--     SELECT count(*) FROM messages;              -- expect 0 (GUC unset)
--     SET LOCAL app.enterprise_id = '<uuid>';
--     SELECT count(*) FROM messages;              -- expect that tenant's rows
-- ═══════════════════════════════════════════════════════════════════════════
