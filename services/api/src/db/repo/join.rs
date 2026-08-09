//! Joining a room: the three `rooms.auth_mode` values, and guest creation.
//!
//! Everything here runs *before* a membership exists, which is why it is the only repository
//! module that also touches the identity tables. The tenant is located first through the
//! schema's `SECURITY DEFINER` resolvers - `auth_locate_room_tenant` and
//! `auth_locate_invite_tenant` - because the room row itself is tenant-scoped and cannot be
//! read without the GUC that reading it would provide.

use time::{Duration, OffsetDateTime};
use uuid::Uuid;

use crate::db::{DbError, TenantTx};

/// One entry of `rooms.config.access.tiers`.
///
/// `rooms_access_tiers_argon2id_check` requires every `passwordHash` to match `^[$]argon2id[$]`,
/// and `rooms_access_tiers_trial_check` ties `isTrial` to a positive whole `trialDays`. Both are
/// restated in the type so a malformed tier is a parse failure here rather than a surprise at
/// insert time.
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessTier {
    pub password_hash: String,
    /// The CHECK pins this to `member`; carried so a future widening is a data change, not a
    /// code change.
    #[serde(default = "member_role")]
    pub role: String,
    #[serde(default)]
    pub is_trial: bool,
    pub trial_days: Option<i64>,
    pub label: Option<String>,
}

fn member_role() -> String {
    "member".to_owned()
}

/// The access block of `rooms.config`.
#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessConfig {
    #[serde(default)]
    pub tiers: Vec<AccessTier>,
    #[serde(default)]
    pub allow_anonymous: bool,
    #[serde(default)]
    pub require_unique_nickname: bool,
}

impl AccessConfig {
    /// Reads `config.access`, defaulting rather than failing.
    ///
    /// A room whose config predates a field should still be joinable: the defaults here are the
    /// restrictive ones (`allow_anonymous = false`, no tiers), so a missing key closes the door
    /// rather than opening it.
    #[must_use]
    pub fn of(config: &serde_json::Value) -> Self {
        config
            .get("access")
            .and_then(|access| serde_json::from_value(access.clone()).ok())
            .unwrap_or_default()
    }
}

/// What the room requires of somebody trying to get in.
#[derive(Debug, Clone)]
pub struct RoomEntry {
    pub enterprise_id: Uuid,
    pub room_id: Uuid,
    pub auth_mode: String,
    pub room_state: String,
    pub max_capacity: i32,
    pub roster_count: i32,
    pub access: AccessConfig,
}

/// Reads the room's entry requirements under a tenant GUC obtained from the resolver.
pub async fn entry(
    tx: &mut TenantTx<'_>,
    enterprise_id: Uuid,
    room_id: Uuid,
) -> Result<RoomEntry, DbError> {
    let row: Option<(String, String, i32, serde_json::Value, Option<i32>)> = sqlx::query_as(
        "SELECT r.auth_mode, r.state, r.max_capacity, r.config, s.roster_count \
         FROM rooms r LEFT JOIN room_state s ON s.room_id = r.id \
         WHERE r.id = $1",
    )
    .bind(room_id)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?;

    let (auth_mode, room_state, max_capacity, config, roster_count) =
        row.ok_or(DbError::NotFound)?;

    Ok(RoomEntry {
        enterprise_id,
        room_id,
        auth_mode,
        room_state,
        max_capacity,
        roster_count: roster_count.unwrap_or(0),
        access: AccessConfig::of(&config),
    })
}

/// The membership a join produced.
#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct JoinedMembership {
    #[sqlx(rename = "id")]
    pub member_id: Uuid,
    pub room_id: Uuid,
    pub role: String,
    pub is_trial: bool,
}

/// Creates a membership, or returns the existing one.
///
/// `ON CONFLICT` on `(enterprise_id, room_id, user_id)`: joining a room twice is a re-entry, not
/// an error, and must not reset the role or the trial clock of somebody already inside. The
/// `DO UPDATE SET room_id = EXCLUDED.room_id` is a no-op write that exists solely so `RETURNING`
/// yields the row in both branches - `DO NOTHING` returns nothing on conflict, which would make
/// a second join look like a failure.
pub struct NewMembership<'a> {
    pub enterprise_id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub role: &'a str,
    pub is_trial: bool,
    pub trial_expires_at: Option<OffsetDateTime>,
    pub display_name: Option<&'a str>,
}

pub async fn ensure_membership(
    tx: &mut TenantTx<'_>,
    new: NewMembership<'_>,
) -> Result<JoinedMembership, DbError> {
    sqlx::query_as(
        "INSERT INTO room_members \
           (enterprise_id, room_id, user_id, role, is_trial, trial_expires_at, display_name, joined_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, now()) \
         ON CONFLICT (enterprise_id, room_id, user_id) DO UPDATE SET room_id = EXCLUDED.room_id \
         RETURNING id, room_id, role, is_trial",
    )
    .bind(new.enterprise_id)
    .bind(new.room_id)
    .bind(new.user_id)
    .bind(new.role)
    .bind(new.is_trial)
    .bind(new.trial_expires_at)
    .bind(new.display_name)
    .fetch_one(tx.conn())
    .await
    .map_err(DbError::from)
}

/// An invite, as far as redemption cares.
#[derive(Debug, Clone)]
pub struct Invite {
    pub id: Uuid,
    pub role: String,
    pub is_trial: bool,
    pub display_name: Option<String>,
    pub max_uses: i32,
    pub use_count: i32,
    pub expires_at: Option<OffsetDateTime>,
    pub revoked_at: Option<OffsetDateTime>,
}

impl Invite {
    /// Whether this invite may still be redeemed at `now`.
    #[must_use]
    pub fn is_redeemable(&self, now: OffsetDateTime) -> bool {
        self.revoked_at.is_none()
            && self.expires_at.is_none_or(|expiry| now < expiry)
            && self.use_count < self.max_uses
    }
}

/// The `invite_tokens` projection this module reads. Named rather than left as an eight-wide
/// anonymous tuple that has to be counted against the SELECT to be understood.
type InviteRow = (
    Uuid,
    String,
    bool,
    Option<String>,
    i32,
    i32,
    Option<OffsetDateTime>,
    Option<OffsetDateTime>,
);

pub async fn invite(tx: &mut TenantTx<'_>, invite_id: Uuid) -> Result<Invite, DbError> {
    let row: Option<InviteRow> = sqlx::query_as(
        "SELECT id, role, is_trial, display_name, max_uses, use_count, expires_at, revoked_at \
             FROM invite_tokens WHERE id = $1",
    )
    .bind(invite_id)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?;

    let (id, role, is_trial, display_name, max_uses, use_count, expires_at, revoked_at) =
        row.ok_or(DbError::NotFound)?;

    Ok(Invite {
        id,
        role,
        is_trial,
        display_name,
        max_uses,
        use_count,
        expires_at,
        revoked_at,
    })
}

/// Consumes one use of an invite.
///
/// A single conditional `UPDATE ... WHERE use_count < max_uses ... RETURNING`, not a read
/// followed by a write: two people redeeming the last use of an invite at the same moment would
/// otherwise both pass the check and both get in. Zero rows means somebody else took it, which
/// is why the caller treats that as "invalid invite" rather than retrying.
pub async fn consume_invite(
    tx: &mut TenantTx<'_>,
    invite_id: Uuid,
    now: OffsetDateTime,
) -> Result<(), DbError> {
    let claimed: Option<(i32,)> = sqlx::query_as(
        "UPDATE invite_tokens SET use_count = use_count + 1, updated_at = $2 \
         WHERE id = $1 \
           AND revoked_at IS NULL \
           AND (expires_at IS NULL OR expires_at > $2) \
           AND use_count < max_uses \
         RETURNING use_count",
    )
    .bind(invite_id)
    .bind(now)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?;

    claimed.map(|_| ()).ok_or(DbError::NotFound)
}

/// How long a tier's trial lasts from now.
#[must_use]
pub fn trial_expiry(tier: &AccessTier, now: OffsetDateTime) -> Option<OffsetDateTime> {
    if !tier.is_trial {
        return None;
    }
    // The CHECK guarantees a positive whole number when `isTrial` is true. `filter` rather than
    // an unwrap so a row that predates the constraint degrades to "no expiry" instead of
    // panicking on a live request.
    tier.trial_days
        .filter(|days| *days > 0)
        .map(|days| now + Duration::days(days))
}

/// Creates a guest account.
///
/// # The two constraints this has to satisfy
///
/// `users_guest_password_check` is `NOT is_guest OR password_hash IS NULL`: a guest has no
/// password by construction, which is also why `auth::login` can never authenticate one - the
/// verify against a `NULL` hash fails before the explicit `is_guest` check is even reached.
///
/// `guest_created_in_room_id` records where the guest came from. It is the only thing tying an
/// otherwise anonymous row to anything, and it is what a cleanup job would sweep on.
///
/// Runs against the identity pool, not a `TenantTx`: `users` carries no `enterprise_id` and no
/// RLS. That is why this takes a `&Db` rather than a transaction - there is no tenant context
/// to be inside yet, because the guest does not belong to one until the membership below.
pub async fn create_guest(
    db: &crate::db::Db,
    display_name: &str,
    room_id: Uuid,
) -> Result<Uuid, DbError> {
    // A synthetic address, because `users.email` is NOT NULL and citext-unique. It is not
    // routable and never mailed - a guest has no address to give, and inventing a plausible one
    // would put a fake into a column real accounts are looked up by.
    let handle = Uuid::new_v4();
    let email = format!("guest.{}@guests.invalid", handle.simple());

    sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name, is_guest, guest_created_in_room_id) \
         VALUES ($1, $2, $3, true, $4) \
         RETURNING id",
    )
    .bind(&email)
    .bind(handle.simple().to_string())
    .bind(display_name)
    .bind(room_id)
    .fetch_one(db.identity_pool())
    .await
    .map_err(DbError::from)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> OffsetDateTime {
        OffsetDateTime::from_unix_timestamp(1_753_920_000).expect("valid")
    }

    fn invite(max_uses: i32, use_count: i32) -> Invite {
        Invite {
            id: Uuid::nil(),
            role: "member".into(),
            is_trial: false,
            display_name: None,
            max_uses,
            use_count,
            expires_at: None,
            revoked_at: None,
        }
    }

    #[test]
    fn an_invite_at_its_use_limit_is_spent() {
        assert!(invite(1, 0).is_redeemable(now()));
        assert!(!invite(1, 1).is_redeemable(now()));
        assert!(invite(5, 4).is_redeemable(now()));
    }

    #[test]
    fn a_revoked_invite_is_refused_however_many_uses_remain() {
        let revoked = Invite {
            revoked_at: Some(now() - Duration::hours(1)),
            ..invite(10, 0)
        };
        assert!(!revoked.is_redeemable(now()));
    }

    #[test]
    fn an_expired_invite_is_refused_and_a_null_expiry_never_expires() {
        let expiring = Invite {
            expires_at: Some(now() + Duration::hours(1)),
            ..invite(1, 0)
        };
        assert!(expiring.is_redeemable(now()));
        assert!(!expiring.is_redeemable(now() + Duration::hours(2)));

        // NULL means no expiry, not "expired at the epoch".
        assert!(invite(1, 0).is_redeemable(now() + Duration::days(3650)));
    }

    #[test]
    fn a_trial_tier_expires_and_a_plain_tier_does_not() {
        let trial = AccessTier {
            password_hash: "$argon2id$...".into(),
            role: "member".into(),
            is_trial: true,
            trial_days: Some(7),
            label: None,
        };
        assert_eq!(trial_expiry(&trial, now()), Some(now() + Duration::days(7)));

        let permanent = AccessTier {
            is_trial: false,
            trial_days: None,
            ..trial.clone()
        };
        assert_eq!(trial_expiry(&permanent, now()), None);
    }

    #[test]
    fn a_trial_tier_with_a_missing_day_count_degrades_rather_than_panicking() {
        // `rooms_access_tiers_trial_check` makes this unstorable, so it can only appear on a
        // row that predates the constraint. No expiry is the safe reading.
        let malformed = AccessTier {
            password_hash: "$argon2id$...".into(),
            role: "member".into(),
            is_trial: true,
            trial_days: None,
            label: None,
        };
        assert_eq!(trial_expiry(&malformed, now()), None);
    }

    #[test]
    fn access_config_defaults_are_the_closed_ones() {
        // A room whose config has no `access` block must not become anonymous-friendly.
        let empty = AccessConfig::of(&serde_json::json!({}));
        assert!(!empty.allow_anonymous);
        assert!(empty.tiers.is_empty());
    }

    #[test]
    fn access_tiers_parse_from_the_shape_the_check_constraints_enforce() {
        let config = serde_json::json!({
            "access": {
                "tiers": [
                    { "passwordHash": "$argon2id$v=19$m=1$x$y", "role": "member",
                      "isTrial": true, "trialDays": 14, "label": "Trial" }
                ],
                "allowAnonymous": true
            }
        });
        let parsed = AccessConfig::of(&config);
        assert_eq!(parsed.tiers.len(), 1);
        assert!(parsed.allow_anonymous);
        assert_eq!(parsed.tiers[0].trial_days, Some(14));
        assert!(parsed.tiers[0].password_hash.starts_with("$argon2id$"));
    }
}
