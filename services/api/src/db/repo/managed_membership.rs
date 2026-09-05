//! Account-administrator membership reads and mutations.
//!
//! Every entry point requires an already tenant-scoped transaction. Callers take the account
//! authority lock before entering this module; RLS then makes a foreign room/member id identical
//! to an absent one. Mutations lock the selected rows, compare revisions, and return the committed
//! projection used by the controller's temporary read model.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::db::{DbError, TenantTx};

const MEMBER_SELECT: &str = "SELECT m.id, m.room_id, m.user_id, u.email::text AS email, \
    COALESCE(m.display_name, u.display_name) AS display_name, m.role, m.revision, \
    COALESCE((SELECT jsonb_agg(rmb.badge_id::text ORDER BY rmb.badge_id) \
        FROM room_member_badges rmb WHERE rmb.enterprise_id = m.enterprise_id \
        AND rmb.member_id = m.id), '[]'::jsonb) AS badges, \
    m.can_publish_mic, m.can_publish_screen, m.can_publish_cam, m.can_use_admin_chat, \
    m.can_edit_notes, m.can_access_files, m.can_access_archives, m.is_muted, m.is_banned, \
    m.is_pm_restricted, m.is_trial, m.hide_personal_info, m.hide_user_count, m.is_paused, \
    m.admin_note, m.approval_status, m.has_mobile_app, (u.password_hash IS NOT NULL) AS has_password, \
    m.last_seen_at, m.invited_at, m.joined_at, m.created_at \
    FROM room_members m JOIN users u ON u.id = m.user_id";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ManagedMember {
    pub id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub email: String,
    pub display_name: String,
    pub role: String,
    pub revision: i64,
    pub badges: Value,
    pub can_publish_mic: bool,
    pub can_publish_screen: bool,
    pub can_publish_cam: bool,
    pub can_use_admin_chat: bool,
    pub can_edit_notes: bool,
    pub can_access_files: bool,
    pub can_access_archives: bool,
    pub is_muted: bool,
    pub is_banned: bool,
    pub is_pm_restricted: bool,
    pub is_trial: bool,
    pub hide_personal_info: bool,
    pub hide_user_count: bool,
    pub is_paused: bool,
    pub admin_note: Option<String>,
    pub approval_status: String,
    pub has_mobile_app: bool,
    pub has_password: bool,
    #[serde(with = "time::serde::rfc3339::option")]
    pub last_seen_at: Option<OffsetDateTime>,
    #[serde(with = "time::serde::rfc3339::option")]
    pub invited_at: Option<OffsetDateTime>,
    #[serde(with = "time::serde::rfc3339::option")]
    pub joined_at: Option<OffsetDateTime>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

#[derive(Debug, Clone, Copy)]
pub struct Target {
    pub id: Uuid,
    pub expected_revision: i64,
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct LockedTarget {
    id: Uuid,
    user_id: Uuid,
    role: String,
    revision: i64,
}

#[derive(Debug, Clone)]
pub struct Permissions {
    pub publish_mic: bool,
    pub publish_screen: bool,
    pub publish_cam: bool,
    pub use_admin_chat: bool,
    pub edit_notes: bool,
}

#[derive(Debug, Clone)]
pub enum Mutation {
    Role(String),
    Muted(bool),
    Banned(bool),
    Trial(bool),
    HideUserCount(bool),
    HidePersonalInfo(bool),
    ArchiveAccess(bool),
    PmRestricted(bool),
    Approval(String),
    MobileApp(bool),
    FileAccess(bool),
    Note(Option<String>),
    Permissions(Permissions),
    FreshenLogin,
    Rename(String),
    PasswordHash(String),
    Remove,
}

impl Mutation {
    #[must_use]
    pub const fn event_name(&self) -> &'static str {
        match self {
            Self::Role(_) => "room.members.role-updated",
            Self::Muted(_) => "room.members.mute-updated",
            Self::Banned(_) => "room.members.ban-updated",
            Self::Trial(_) => "room.members.trial-updated",
            Self::HideUserCount(_) => "room.members.user-count-visibility-updated",
            Self::HidePersonalInfo(_) => "room.members.personal-info-visibility-updated",
            Self::ArchiveAccess(_) => "room.members.archive-access-updated",
            Self::PmRestricted(_) => "room.members.private-message-access-updated",
            Self::Approval(_) => "room.members.approval-updated",
            Self::MobileApp(_) => "room.members.mobile-access-updated",
            Self::FileAccess(_) => "room.members.file-access-updated",
            Self::Note(_) => "room.members.admin-note-updated",
            Self::Permissions(_) => "room.members.permissions-updated",
            Self::FreshenLogin => "room.members.login-freshened",
            Self::Rename(_) => "room.members.name-updated",
            Self::PasswordHash(_) => "room.members.password-updated",
            Self::Remove => "room.members.removed",
        }
    }

    #[must_use]
    pub const fn allows_all_rooms(&self) -> bool {
        matches!(
            self,
            Self::Role(_) | Self::Muted(_) | Self::Banned(_) | Self::Trial(_) | Self::Remove
        )
    }

    #[must_use]
    pub const fn requires_one_target(&self) -> bool {
        matches!(
            self,
            Self::HideUserCount(_)
                | Self::HidePersonalInfo(_)
                | Self::ArchiveAccess(_)
                | Self::PmRestricted(_)
                | Self::Approval(_)
                | Self::MobileApp(_)
                | Self::FileAccess(_)
                | Self::Note(_)
                | Self::Permissions(_)
                | Self::FreshenLogin
                | Self::Rename(_)
                | Self::PasswordHash(_)
        )
    }
}

#[derive(Debug, thiserror::Error)]
pub enum MutationError {
    #[error(transparent)]
    Database(#[from] DbError),
    #[error("a selected member changed after it was read")]
    Conflict,
    #[error("an owner membership cannot be changed through member management")]
    OwnerProtected,
}

pub async fn list(tx: &mut TenantTx<'_>, room_id: Uuid) -> Result<Vec<ManagedMember>, DbError> {
    let sql = format!(
        "{MEMBER_SELECT} WHERE m.room_id = $1 ORDER BY lower(COALESCE(m.display_name, u.display_name)), m.id"
    );
    sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(room_id)
        .fetch_all(tx.conn())
        .await
        .map_err(DbError::from)
}

pub async fn room_exists(tx: &mut TenantTx<'_>, room_id: Uuid) -> Result<bool, DbError> {
    sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM rooms WHERE id = $1)")
        .bind(room_id)
        .fetch_one(tx.conn())
        .await
        .map_err(DbError::from)
}

pub async fn list_by_ids(
    tx: &mut TenantTx<'_>,
    ids: &[Uuid],
) -> Result<Vec<ManagedMember>, DbError> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let sql = format!("{MEMBER_SELECT} WHERE m.id = ANY($1) ORDER BY m.room_id, m.id");
    sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(ids)
        .fetch_all(tx.conn())
        .await
        .map_err(DbError::from)
}

/// Locks the actor and target membership together for the live-room control boundary. The caller
/// is re-authorized from these locked rows, so a concurrent presenter revocation cannot race a
/// ban, mute, or permission mutation.
pub async fn lock_control_pair(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    ids: &[Uuid],
) -> Result<Vec<ManagedMember>, DbError> {
    let sql = format!(
        "{MEMBER_SELECT} WHERE m.room_id = $1 AND m.id = ANY($2) ORDER BY m.id FOR UPDATE OF m"
    );
    sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(room_id)
        .bind(ids)
        .fetch_all(tx.conn())
        .await
        .map_err(DbError::from)
}

pub async fn replay(
    tx: &mut TenantTx<'_>,
    request_id: Uuid,
) -> Result<Option<(String, Value)>, DbError> {
    sqlx::query_as(
        "SELECT request_digest, response FROM membership_mutations \
         WHERE enterprise_id = $1 AND request_id = $2",
    )
    .bind(tx.ctx().enterprise_id)
    .bind(request_id)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)
}

pub async fn record(
    tx: &mut TenantTx<'_>,
    request_id: Uuid,
    actor_user_id: Uuid,
    request_digest: &str,
    response: &Value,
    now: OffsetDateTime,
) -> Result<(), DbError> {
    sqlx::query(
        "INSERT INTO membership_mutations \
           (enterprise_id, request_id, actor_user_id, request_digest, response, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(tx.ctx().enterprise_id)
    .bind(request_id)
    .bind(actor_user_id)
    .bind(request_digest)
    .bind(response)
    .bind(now)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;
    Ok(())
}

pub async fn lock_request(tx: &mut TenantTx<'_>, request_id: Uuid) -> Result<(), DbError> {
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 917))")
        .bind(request_id)
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?;
    Ok(())
}

pub async fn invite(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    email: &str,
    display_name: &str,
    now: OffsetDateTime,
) -> Result<ManagedMember, DbError> {
    let user_id = sqlx::query_scalar::<_, Uuid>(
        "WITH inserted AS ( \
           INSERT INTO users (email, email_hash, display_name) \
           VALUES ($1, md5(lower($1)), $2) \
           ON CONFLICT (email) DO NOTHING RETURNING id \
         ) SELECT id FROM inserted UNION ALL SELECT id FROM users WHERE email = $1 LIMIT 1",
    )
    .bind(email)
    .bind(display_name)
    .fetch_one(tx.conn())
    .await
    .map_err(DbError::from)?;

    let member_id = sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO room_members \
           (enterprise_id, room_id, user_id, role, display_name, invited_at, created_at, updated_at) \
         SELECT enterprise_id, id, $2, 'member', $3, $4, $4, $4 FROM rooms WHERE id = $1 \
         RETURNING id",
    )
    .bind(room_id)
    .bind(user_id)
    .bind(display_name)
    .bind(now)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?
    .ok_or(DbError::NotFound)?;

    list_by_ids(tx, &[member_id])
        .await?
        .into_iter()
        .next()
        .ok_or(DbError::NotFound)
}

async fn lock_targets(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    requested: &[Target],
    all_rooms: bool,
) -> Result<Vec<LockedTarget>, MutationError> {
    let ids = requested.iter().map(|target| target.id).collect::<Vec<_>>();
    let selected = sqlx::query_as::<_, LockedTarget>(
        "SELECT id, user_id, role, revision FROM room_members \
         WHERE room_id = $1 AND id = ANY($2) ORDER BY id FOR UPDATE",
    )
    .bind(room_id)
    .bind(&ids)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)?;
    if selected.len() != requested.len() {
        return Err(DbError::NotFound.into());
    }
    for row in &selected {
        let expected = requested
            .iter()
            .find(|target| target.id == row.id)
            .expect("selected id came from requested targets")
            .expected_revision;
        if row.revision != expected {
            return Err(MutationError::Conflict);
        }
        if row.role == "owner" {
            return Err(MutationError::OwnerProtected);
        }
    }
    if !all_rooms {
        return Ok(selected);
    }

    let user_ids = selected.iter().map(|row| row.user_id).collect::<Vec<_>>();
    sqlx::query_as::<_, LockedTarget>(
        "SELECT m.id, m.user_id, m.role, m.revision \
           FROM room_members m JOIN rooms r ON r.id = m.room_id AND r.enterprise_id = m.enterprise_id \
          WHERE m.user_id = ANY($1) AND m.role <> 'owner' \
          ORDER BY m.room_id, m.id FOR UPDATE OF m",
    )
    .bind(&user_ids)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
    .map_err(MutationError::from)
}

async fn changed_ids(
    tx: &mut TenantTx<'_>,
    sql: &'static str,
    ids: &[Uuid],
    value: bool,
    now: OffsetDateTime,
) -> Result<Vec<Uuid>, MutationError> {
    sqlx::query_scalar(sql)
        .bind(ids)
        .bind(value)
        .bind(now)
        .fetch_all(tx.conn())
        .await
        .map_err(DbError::from)
        .map_err(MutationError::from)
}

pub async fn mutate(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    requested: &[Target],
    all_rooms: bool,
    mutation: &Mutation,
    now: OffsetDateTime,
) -> Result<(Vec<ManagedMember>, Vec<Uuid>, usize), MutationError> {
    let locked = lock_targets(tx, room_id, requested, all_rooms).await?;
    let ids = locked.iter().map(|target| target.id).collect::<Vec<_>>();
    let changed = match mutation {
        Mutation::Role(role) => {
            sqlx::query_scalar(
                "UPDATE room_members SET role = $2, is_muted = false, is_banned = false, \
                    revision = revision + 1, updated_at = $3 \
                 WHERE id = ANY($1) AND (role, is_muted, is_banned) IS DISTINCT FROM ($2, false, false) \
                 RETURNING id",
            )
            .bind(&ids)
            .bind(role)
            .bind(now)
            .fetch_all(tx.conn())
            .await
            .map_err(DbError::from)?
        }
        Mutation::Muted(value) => {
            changed_ids(tx, "UPDATE room_members SET is_muted = $2, is_banned = CASE WHEN $2 THEN false ELSE is_banned END, revision = revision + 1, updated_at = $3 WHERE id = ANY($1) AND (is_muted IS DISTINCT FROM $2 OR ($2 AND is_banned)) RETURNING id", &ids, *value, now).await?
        }
        Mutation::Banned(value) => {
            changed_ids(tx, "UPDATE room_members SET is_banned = $2, is_muted = CASE WHEN $2 THEN false ELSE is_muted END, revision = revision + 1, updated_at = $3 WHERE id = ANY($1) AND (is_banned IS DISTINCT FROM $2 OR ($2 AND is_muted)) RETURNING id", &ids, *value, now).await?
        }
        Mutation::Trial(value) => {
            changed_ids(tx, "UPDATE room_members SET is_trial = $2, trial_expires_at = CASE WHEN $2 THEN trial_expires_at ELSE NULL END, revision = revision + 1, updated_at = $3 WHERE id = ANY($1) AND is_trial IS DISTINCT FROM $2 RETURNING id", &ids, *value, now).await?
        }
        Mutation::HideUserCount(value) => {
            changed_ids(tx, "UPDATE room_members SET hide_user_count = $2, revision = revision + 1, updated_at = $3 WHERE id = ANY($1) AND hide_user_count IS DISTINCT FROM $2 RETURNING id", &ids, *value, now).await?
        }
        Mutation::HidePersonalInfo(value) => {
            changed_ids(tx, "UPDATE room_members SET hide_personal_info = $2, revision = revision + 1, updated_at = $3 WHERE id = ANY($1) AND hide_personal_info IS DISTINCT FROM $2 RETURNING id", &ids, *value, now).await?
        }
        Mutation::ArchiveAccess(value) => {
            changed_ids(tx, "UPDATE room_members SET can_access_archives = $2, capabilities_overridden = true, revision = revision + 1, updated_at = $3 WHERE id = ANY($1) AND can_access_archives IS DISTINCT FROM $2 RETURNING id", &ids, *value, now).await?
        }
        Mutation::PmRestricted(value) => {
            changed_ids(tx, "UPDATE room_members SET is_pm_restricted = $2, revision = revision + 1, updated_at = $3 WHERE id = ANY($1) AND is_pm_restricted IS DISTINCT FROM $2 RETURNING id", &ids, *value, now).await?
        }
        Mutation::Approval(value) => {
            sqlx::query_scalar("UPDATE room_members SET approval_status = $2, is_paused = ($2 = 'pending'), revision = revision + 1, updated_at = $3 WHERE id = ANY($1) AND (approval_status, is_paused) IS DISTINCT FROM ($2, ($2 = 'pending')) RETURNING id")
                .bind(&ids).bind(value).bind(now).fetch_all(tx.conn()).await.map_err(DbError::from)?
        }
        Mutation::MobileApp(value) => {
            changed_ids(tx, "UPDATE room_members SET has_mobile_app = $2, revision = revision + 1, updated_at = $3 WHERE id = ANY($1) AND has_mobile_app IS DISTINCT FROM $2 RETURNING id", &ids, *value, now).await?
        }
        Mutation::FileAccess(value) => {
            changed_ids(tx, "UPDATE room_members SET can_access_files = $2, capabilities_overridden = true, revision = revision + 1, updated_at = $3 WHERE id = ANY($1) AND can_access_files IS DISTINCT FROM $2 RETURNING id", &ids, *value, now).await?
        }
        Mutation::Note(value) => {
            sqlx::query_scalar("UPDATE room_members SET admin_note = $2, revision = revision + 1, updated_at = $3 WHERE id = ANY($1) AND admin_note IS DISTINCT FROM $2 RETURNING id")
                .bind(&ids).bind(value).bind(now).fetch_all(tx.conn()).await.map_err(DbError::from)?
        }
        Mutation::Permissions(value) => {
            sqlx::query_scalar("UPDATE room_members SET can_publish_mic = $2, can_publish_screen = $3, can_publish_cam = $4, can_use_admin_chat = $5, can_edit_notes = $6, capabilities_overridden = true, revision = revision + 1, updated_at = $7 WHERE id = ANY($1) AND (can_publish_mic, can_publish_screen, can_publish_cam, can_use_admin_chat, can_edit_notes, capabilities_overridden) IS DISTINCT FROM ($2, $3, $4, $5, $6, true) RETURNING id")
                .bind(&ids).bind(value.publish_mic).bind(value.publish_screen).bind(value.publish_cam)
                .bind(value.use_admin_chat).bind(value.edit_notes).bind(now)
                .fetch_all(tx.conn()).await.map_err(DbError::from)?
        }
        Mutation::FreshenLogin => {
            sqlx::query_scalar("UPDATE room_members SET last_seen_at = $2, revision = revision + 1, updated_at = $2 WHERE id = ANY($1) RETURNING id")
                .bind(&ids).bind(now).fetch_all(tx.conn()).await.map_err(DbError::from)?
        }
        Mutation::Rename(value) => {
            let user_ids = locked.iter().map(|target| target.user_id).collect::<Vec<_>>();
            sqlx::query("UPDATE users SET display_name = $2, updated_at = $3 WHERE id = ANY($1) AND display_name IS DISTINCT FROM $2")
                .bind(&user_ids).bind(value).bind(now).execute(tx.conn()).await.map_err(DbError::from)?;
            sqlx::query_scalar("UPDATE room_members SET display_name = $2, revision = revision + 1, updated_at = $3 WHERE id = ANY($1) AND display_name IS DISTINCT FROM $2 RETURNING id")
                .bind(&ids).bind(value).bind(now).fetch_all(tx.conn()).await.map_err(DbError::from)?
        }
        Mutation::PasswordHash(value) => {
            let user_ids = locked.iter().map(|target| target.user_id).collect::<Vec<_>>();
            sqlx::query("UPDATE users SET password_hash = $2, updated_at = $3 WHERE id = ANY($1)")
                .bind(&user_ids).bind(value).bind(now).execute(tx.conn()).await.map_err(DbError::from)?;
            sqlx::query_scalar("UPDATE room_members SET revision = revision + 1, updated_at = $2 WHERE id = ANY($1) RETURNING id")
                .bind(&ids).bind(now).fetch_all(tx.conn()).await.map_err(DbError::from)?
        }
        Mutation::Remove => {
            sqlx::query_scalar("DELETE FROM room_members WHERE id = ANY($1) RETURNING id")
                .bind(&ids).fetch_all(tx.conn()).await.map_err(DbError::from)?
        }
    };

    if matches!(mutation, Mutation::Remove) {
        let changed_count = changed.len();
        return Ok((Vec::new(), changed, changed_count));
    }
    Ok((list_by_ids(tx, &ids).await?, Vec::new(), changed.len()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_the_captured_bulk_operations_cross_room_boundaries() {
        assert!(Mutation::Role("member".into()).allows_all_rooms());
        assert!(Mutation::Muted(true).allows_all_rooms());
        assert!(Mutation::Banned(true).allows_all_rooms());
        assert!(Mutation::Trial(true).allows_all_rooms());
        assert!(Mutation::Remove.allows_all_rooms());
        assert!(!Mutation::Rename("name".into()).allows_all_rooms());
        assert!(!Mutation::FreshenLogin.allows_all_rooms());
        assert!(
            !Mutation::Permissions(Permissions {
                publish_mic: false,
                publish_screen: false,
                publish_cam: false,
                use_admin_chat: false,
                edit_notes: false,
            })
            .allows_all_rooms()
        );
    }

    #[test]
    fn credential_material_never_appears_in_the_member_projection() {
        let fields = serde_json::to_value(ManagedMember {
            id: Uuid::nil(),
            room_id: Uuid::nil(),
            user_id: Uuid::nil(),
            email: "member@example.test".into(),
            display_name: "Member".into(),
            role: "member".into(),
            revision: 0,
            badges: serde_json::json!([]),
            can_publish_mic: false,
            can_publish_screen: false,
            can_publish_cam: false,
            can_use_admin_chat: false,
            can_edit_notes: false,
            can_access_files: false,
            can_access_archives: true,
            is_muted: false,
            is_banned: false,
            is_pm_restricted: false,
            is_trial: false,
            hide_personal_info: false,
            hide_user_count: false,
            is_paused: false,
            admin_note: None,
            approval_status: "approved".into(),
            has_mobile_app: false,
            has_password: true,
            last_seen_at: None,
            invited_at: None,
            joined_at: None,
            created_at: OffsetDateTime::UNIX_EPOCH,
        })
        .unwrap();
        let object = fields.as_object().unwrap();
        assert_eq!(object.get("hasPassword"), Some(&Value::Bool(true)));
        assert!(!object.contains_key("password"));
        assert!(!object.contains_key("passwordHash"));
    }
}
