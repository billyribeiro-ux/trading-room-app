//! Every limit in one place, each with the reason it has the value it has.
//!
//! A magic number scattered through a handler is a number nobody dares change. A named
//! constant with a rationale is one a future maintainer can reason about.

use std::time::Duration;

/// Longest legitimate request is a login: an Argon2id verify behind a bounded semaphore.
/// Anything past this is stuck rather than slow, and the platform edge would cut it anyway.
pub const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

/// Largest legitimate JSON body is a message with attachment metadata. File bytes never
/// pass through this service - uploads go straight to object storage via a presigned URL -
/// so 1 MiB is roughly ten times the real ceiling.
pub const BODY_LIMIT_BYTES: usize = 1024 * 1024;

/// Saturation should surface as fast 503s plus a spike in the acquire histogram, not as
/// clients timing out with no server-side signal.
pub const DB_ACQUIRE_TIMEOUT: Duration = Duration::from_secs(5);

/// Per instance. Managed Postgres connection budgets are shared across every instance,
/// migrations and any admin session; a modest per-instance pool is what keeps headroom.
pub const DB_POOL_MAX: u32 = 10;

/// No user-facing query has any business running this long. Bounds the damage one bad
/// plan can do to the whole pool.
pub const DB_STATEMENT_TIMEOUT_MS: u32 = 5_000;

/// `SELECT ... FOR UPDATE` on refresh-token rotation must fail fast rather than queue:
/// a contended rotation is nearly always a replay, and replays should be refused quickly.
pub const DB_LOCK_TIMEOUT_MS: u32 = 2_000;

/// A leaked transaction would otherwise pin a pooled connection that still carries a
/// tenant GUC. This makes such a leak self-healing instead of permanent.
pub const DB_IDLE_IN_TX_TIMEOUT_MS: u32 = 10_000;

/// Argon2id, OWASP's first-choice profile (m=19456 KiB, t=2, p=1).
pub const ARGON2_M_COST_KIB: u32 = 19_456;
pub const ARGON2_T_COST: u32 = 2;
/// Parallelism above 1 buys little on shared vCPUs while multiplying memory bandwidth.
pub const ARGON2_P_COST: u32 = 1;

/// Bounds worst-case hashing memory at `ARGON2_M_COST_KIB * MAX_CONCURRENT_HASHES`
/// (~78 MiB). An unbounded queue of password hashes is a memory-exhaustion primitive.
pub const MAX_CONCURRENT_HASHES: usize = 4;

/// Requests allowed to wait for one of the four hashing workers. This turns the semaphore
/// into a bounded admission queue: a distributed burst may retain at most this many waiting
/// tasks, while excess requests fail fast with a retryable 503.
pub const MAX_QUEUED_HASHES: usize = 16;

/// Refuse before hashing: Argon2's cost grows with input length, so an unbounded password
/// field is a cheap way to buy expensive server work.
pub const PASSWORD_MAX_BYTES: usize = 512;

/// Longest normalized email accepted by password login, measured in bytes.
///
/// RFC 5321 section 4.5.3.1.3 caps an SMTP path at 256 octets including the surrounding
/// angle brackets, leaving 254 octets for the mailbox. `users.email` is unbounded `citext`,
/// so the application must enforce this before either a limiter key or a SQL bind is built.
pub const LOGIN_EMAIL_MAX_BYTES: usize = 254;

/// Short enough that revoking a refresh-token family ends a stolen session in minutes.
pub const ACCESS_TOKEN_TTL: Duration = Duration::from_secs(600);

/// Matches the media grant's tolerance (`services/media/src/grant.rs`), so both token
/// systems agree about what "expired" means on a machine with a drifting clock.
pub const CLOCK_SKEW_LEEWAY: Duration = Duration::from_secs(30);

/// Per refresh token. Rotation issues a fresh one on every use.
pub const REFRESH_TOKEN_TTL: Duration = Duration::from_secs(14 * 24 * 60 * 60);

/// Ceiling on a whole rotation family, regardless of how often it is refreshed. Without
/// this, a continuously-used token never expires.
pub const SESSION_ABSOLUTE_TTL: Duration = Duration::from_secs(30 * 24 * 60 * 60);

/// Truncate before insert; `refresh_tokens.user_agent` is diagnostic, not a document store.
pub const USER_AGENT_MAX_BYTES: usize = 512;

// ---------------------------------------------------------------- rate limiting
//
// Quotas are per instance. That is a deliberate simplification: these limits exist to
// blunt brute force and abuse, not to meter billing, and a shared store would put a
// network round trip in front of every request to buy exactness nobody needs. With N
// instances an attacker gets N times the quota, which is still four orders of magnitude
// short of what offline cracking needs against Argon2id.

/// Failed logins per email address per minute. Deliberately tight: a legitimate human
/// mistypes a password two or three times, not ten. Successful logins are not counted,
/// so a correct password is never locked out by someone else guessing at the account.
pub const LOGIN_FAILURES_PER_EMAIL_PER_MINUTE: u32 = 5;

/// Login attempts per client IP per minute, counted whether they succeed or fail. Higher
/// than the per-email limit because one NAT or office egress is legitimately many users.
pub const LOGIN_ATTEMPTS_PER_IP_PER_MINUTE: u32 = 20;

/// Refresh attempts per client IP per minute. A browser refreshes roughly once per access
/// token lifetime; anything near this ceiling is a loop or an attack.
pub const REFRESH_ATTEMPTS_PER_IP_PER_MINUTE: u32 = 30;

// ---------------------------------------------------------------- pagination
//
// Keyset, not OFFSET. `messages_tenant_room_channel_created_idx` is
// `(enterprise_id, room_id, channel_id, created_at DESC, id DESC)` - an index shaped for
// exactly this, and the reason the read model seeks on `(created_at, id)` rather than
// counting rows. OFFSET makes the database walk and discard every skipped row, so page 200
// costs two hundred times page 1; a keyset seek costs the same at any depth. The old
// SvelteKit load had no pagination at all and returned the whole room.

/// Messages per page when the caller does not say.
pub const MESSAGE_PAGE_DEFAULT: i64 = 50;

/// Ceiling on `?limit=`. A caller asking for the whole room is the thing pagination exists to
/// prevent, so the parameter is clamped rather than refused - a 400 here would just make
/// clients guess.
pub const MESSAGE_PAGE_MAX: i64 = 200;

/// Longest chat message body.
///
/// The old SvelteKit action capped this at the same value; keeping it means the cutover does
/// not silently change what a client may post. Comfortably inside `BODY_LIMIT_BYTES`.
pub const MESSAGE_BODY_MAX_BYTES: usize = 4_000;

/// Longest note body. Notes are rich-text documents, so this is far larger than a message -
/// but still bounded, because `notes.content_html` has no ceiling of its own and every save
/// also writes a `note_versions` row.
pub const NOTE_BODY_MAX_BYTES: usize = 256 * 1024;

/// A note tab label, not a document.
pub const NOTE_NAME_MAX_BYTES: usize = 120;

/// Revisions returned in one history request. A note edited all day has thousands.
pub const NOTE_VERSION_PAGE_MAX: i64 = 100;

/// Alerts returned in one request.
pub const ALERT_PAGE_MAX: i64 = 100;

/// An alert is a trading signal with a rationale, not an essay.
pub const ALERT_BODY_MAX_BYTES: usize = 8_000;

/// Choices in one poll. Bounds the tally vector, which is allocated from this length.
pub const POLL_MAX_CHOICES: usize = 20;

/// Longest timed mute. Beyond a week, the honest action is removal rather than a mute nobody
/// remembers setting.
pub const MAX_MUTE_HOURS: i64 = 24 * 7;

/// An emoji is a handful of bytes; this stops the column becoming a text store.
pub const REACTION_MAX_BYTES: usize = 64;

/// A per-room display name.
pub const DISPLAY_NAME_MAX_BYTES: usize = 80;

/// A room title shown in navigation, tables, and browser titles; not a document field.
pub const ROOM_NAME_MAX_BYTES: usize = 160;

/// One owner-authored room setting. Custom HTML/CSS legitimately exceeds a chat payload, while
/// the complete room-settings document must remain below the global request ceiling.
pub const ROOM_SETTING_VALUE_MAX_BYTES: usize = 256 * 1024;
pub const ROOM_SETTINGS_MAX_BYTES: usize = 768 * 1024;

/// `users.preferences` is jsonb on a table with **no RLS and no other ceiling**, so without
/// these it is an unbounded per-user store that any signed-in caller can grow.
pub const PREFERENCE_KEY_MAX_BYTES: usize = 64;
pub const PREFERENCE_VALUE_MAX_BYTES: usize = 16 * 1024;

/// How long `room_events` are kept.
///
/// A client that has been away longer than this is told to `resync` rather than given a partial
/// history - the same answer `MAX_REPLAY` gives for a gap that is merely large, so retention
/// adds no new failure mode. Seven days covers a long weekend plus a deploy.
pub const EVENT_RETENTION: Duration = Duration::from_secs(7 * 24 * 60 * 60);

/// How often the pruner wakes. Hourly: the table is indexed on `created_at`, so the sweep is a
/// range delete rather than a scan, and doing it more often buys nothing.
pub const EVENT_PRUNE_INTERVAL: Duration = Duration::from_secs(60 * 60);

/// A trial granted by an invite, in days.
///
/// `invite_tokens` carries `is_trial` but no duration - unlike an access tier, which has
/// `trialDays`. Rather than invent a column, an invited trial gets this compiled-in length, and
/// the fact that it is a policy default rather than data is stated here instead of hidden in a
/// handler.
pub const INVITE_TRIAL_DAYS: i64 = 14;

/// Guest entries per client IP per minute. This endpoint creates a `users` row without any
/// prior identity, so it is the one place a stranger can add rows - and the only key available
/// is the address.
pub const GUESTS_PER_IP_PER_MINUTE: u32 = 5;

/// Join attempts per user per minute. A password room is a guessing target and each attempt
/// costs an Argon2id verify per configured tier.
pub const JOIN_ATTEMPTS_PER_USER_PER_MINUTE: u32 = 10;

/// Media grants per member per minute. A grant is a 60-second admission ticket, so a healthy
/// client needs one per join and perhaps one per reconnect; anything near this is a loop.
pub const GRANTS_PER_MEMBER_PER_MINUTE: u32 = 12;

/// Messages a member may post per minute. Generous for a human in a busy room, and the
/// difference between a chatty user and a script.
pub const MESSAGES_PER_MEMBER_PER_MINUTE: u32 = 30;

/// The captured customer API contract promises one request per second for each key/command pair.
/// The limiter is still per instance (as documented above); it is an abuse brake, not billing.
pub const CUSTOMER_API_COMMANDS_PER_SECOND: u32 = 1;

/// Upper bound on distinct keys held by one rate limiter.
///
/// Without this, every unique email or spoofed IP an attacker sends allocates a cell and
/// the limiter becomes the memory-exhaustion vector it was added to prevent.
pub const RATE_LIMIT_MAX_KEYS: usize = 20_000;

/// How often expired limiter cells are reclaimed.
pub const RATE_LIMIT_GC_INTERVAL: Duration = Duration::from_secs(60);
