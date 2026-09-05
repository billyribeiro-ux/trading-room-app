//! Canonical enterprise badge definitions and referential room-member assignments.
//!
//! Every operation runs inside the caller's tenant transaction. Definitions use optimistic
//! revisions; assignments lock and revision their member rows so the controller projection can
//! never combine a new badge relation with an old member revision.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::db::repo::managed_membership::{self, ManagedMember};
use crate::db::{DbError, TenantTx};

const BADGE_SELECT: &str = "SELECT id, revision, label, text_color, background_color, emoji, \
    image_data_url, dark_theme_badge_id, auto_assign_roles, created_at, updated_at \
    FROM enterprise_badges";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ManagedBadge {
    pub id: Uuid,
    pub revision: i64,
    pub label: String,
    pub text_color: String,
    pub background_color: String,
    pub emoji: Option<String>,
    pub image_data_url: Option<String>,
    pub dark_theme_badge_id: Option<Uuid>,
    pub auto_assign_roles: Vec<String>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
}

#[derive(Debug, Clone)]
pub struct BadgeInput {
    pub label: String,
    pub text_color: String,
    pub background_color: String,
    pub emoji: Option<String>,
    pub image_data_url: Option<String>,
    pub dark_theme_badge_id: Option<Uuid>,
    pub auto_assign_roles: Vec<String>,
}

#[derive(Debug, Clone, Copy)]
pub struct Target {
    pub id: Uuid,
    pub expected_revision: i64,
}

#[derive(Debug, Clone, Copy)]
pub struct AssignmentChange {
    pub badge_id: Uuid,
    pub assigned: bool,
    pub actor_user_id: Uuid,
    pub now: OffsetDateTime,
}

#[derive(Debug, thiserror::Error)]
pub enum MutationError {
    #[error(transparent)]
    Database(#[from] DbError),
    #[error("the badge or member changed after it was read")]
    Conflict,
}

pub async fn list(tx: &mut TenantTx<'_>) -> Result<Vec<ManagedBadge>, DbError> {
    let sql = format!("{BADGE_SELECT} ORDER BY created_at, id");
    sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .fetch_all(tx.conn())
        .await
        .map_err(DbError::from)
}

async fn list_by_ids(tx: &mut TenantTx<'_>, ids: &[Uuid]) -> Result<Vec<ManagedBadge>, DbError> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let sql = format!("{BADGE_SELECT} WHERE id = ANY($1) ORDER BY created_at, id");
    sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(ids)
        .fetch_all(tx.conn())
        .await
        .map_err(DbError::from)
}

pub async fn lock_request(tx: &mut TenantTx<'_>, request_id: Uuid) -> Result<(), DbError> {
    let mut bytes = [0_u8; 8];
    bytes.copy_from_slice(&request_id.as_bytes()[..8]);
    sqlx::query("SELECT pg_advisory_xact_lock($1)")
        .bind(i64::from_be_bytes(bytes))
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?;
    Ok(())
}

pub async fn replay(
    tx: &mut TenantTx<'_>,
    request_id: Uuid,
) -> Result<Option<(String, Value)>, DbError> {
    sqlx::query_as(
        "SELECT request_digest, response FROM badge_mutations \
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
    mutation_kind: &str,
    request_digest: &str,
    response: &Value,
    now: OffsetDateTime,
) -> Result<(), DbError> {
    sqlx::query(
        "INSERT INTO badge_mutations \
            (enterprise_id, request_id, actor_user_id, mutation_kind, request_digest, response, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(tx.ctx().enterprise_id)
    .bind(request_id)
    .bind(actor_user_id)
    .bind(mutation_kind)
    .bind(request_digest)
    .bind(response)
    .bind(now)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;
    Ok(())
}

pub async fn create(
    tx: &mut TenantTx<'_>,
    input: &BadgeInput,
    now: OffsetDateTime,
) -> Result<ManagedBadge, DbError> {
    sqlx::query_as(
        "INSERT INTO enterprise_badges \
            (enterprise_id, label, text_color, background_color, emoji, image_data_url, \
             dark_theme_badge_id, auto_assign_roles, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) \
         RETURNING id, revision, label, text_color, background_color, emoji, image_data_url, \
                   dark_theme_badge_id, auto_assign_roles, created_at, updated_at",
    )
    .bind(tx.ctx().enterprise_id)
    .bind(&input.label)
    .bind(&input.text_color)
    .bind(&input.background_color)
    .bind(&input.emoji)
    .bind(&input.image_data_url)
    .bind(input.dark_theme_badge_id)
    .bind(&input.auto_assign_roles)
    .bind(now)
    .fetch_one(tx.conn())
    .await
    .map_err(DbError::from)
}

pub async fn update(
    tx: &mut TenantTx<'_>,
    badge_id: Uuid,
    expected_revision: i64,
    input: &BadgeInput,
    now: OffsetDateTime,
) -> Result<(ManagedBadge, bool), MutationError> {
    let revision: Option<i64> =
        sqlx::query_scalar("SELECT revision FROM enterprise_badges WHERE id = $1 FOR UPDATE")
            .bind(badge_id)
            .fetch_optional(tx.conn())
            .await
            .map_err(DbError::from)?;
    let revision = revision.ok_or(DbError::NotFound)?;
    if revision != expected_revision {
        return Err(MutationError::Conflict);
    }

    let changed: Option<Uuid> = sqlx::query_scalar(
        "UPDATE enterprise_badges SET label = $2, text_color = $3, background_color = $4, \
            emoji = $5, image_data_url = $6, dark_theme_badge_id = $7, auto_assign_roles = $8, \
            revision = revision + 1, updated_at = $9 \
         WHERE id = $1 AND (label, text_color, background_color, emoji, image_data_url, \
            dark_theme_badge_id, auto_assign_roles) IS DISTINCT FROM ($2, $3, $4, $5, $6, $7, $8) \
         RETURNING id",
    )
    .bind(badge_id)
    .bind(&input.label)
    .bind(&input.text_color)
    .bind(&input.background_color)
    .bind(&input.emoji)
    .bind(&input.image_data_url)
    .bind(input.dark_theme_badge_id)
    .bind(&input.auto_assign_roles)
    .bind(now)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?;
    let badge = list_by_ids(tx, &[badge_id])
        .await?
        .into_iter()
        .next()
        .ok_or(DbError::NotFound)?;
    Ok((badge, changed.is_some()))
}

pub async fn delete(
    tx: &mut TenantTx<'_>,
    badge_id: Uuid,
    expected_revision: i64,
    now: OffsetDateTime,
) -> Result<(Vec<ManagedBadge>, Vec<ManagedMember>, usize), MutationError> {
    let revision: Option<i64> =
        sqlx::query_scalar("SELECT revision FROM enterprise_badges WHERE id = $1 FOR UPDATE")
            .bind(badge_id)
            .fetch_optional(tx.conn())
            .await
            .map_err(DbError::from)?;
    let revision = revision.ok_or(DbError::NotFound)?;
    if revision != expected_revision {
        return Err(MutationError::Conflict);
    }

    let referencing_badges: Vec<Uuid> = sqlx::query_scalar(
        "UPDATE enterprise_badges SET dark_theme_badge_id = NULL, revision = revision + 1, \
            updated_at = $2 WHERE dark_theme_badge_id = $1 RETURNING id",
    )
    .bind(badge_id)
    .bind(now)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)?;
    let member_ids: Vec<Uuid> = sqlx::query_scalar(
        "SELECT m.id FROM room_members m JOIN room_member_badges rmb \
            ON rmb.enterprise_id = m.enterprise_id AND rmb.room_id = m.room_id \
            AND rmb.member_id = m.id WHERE rmb.badge_id = $1 ORDER BY m.id FOR UPDATE OF m",
    )
    .bind(badge_id)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)?;
    let deleted = sqlx::query("DELETE FROM enterprise_badges WHERE id = $1")
        .bind(badge_id)
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?
        .rows_affected();
    if deleted != 1 {
        return Err(DbError::NotFound.into());
    }
    if !member_ids.is_empty() {
        sqlx::query(
            "UPDATE room_members SET revision = revision + 1, updated_at = $2 \
             WHERE id = ANY($1)",
        )
        .bind(&member_ids)
        .bind(now)
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?;
    }
    let badges = list_by_ids(tx, &referencing_badges).await?;
    let members = managed_membership::list_by_ids(tx, &member_ids).await?;
    Ok((
        badges,
        members,
        1 + referencing_badges.len() + member_ids.len(),
    ))
}

async fn lock_targets(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    requested: &[Target],
    all_rooms: bool,
) -> Result<Vec<Uuid>, MutationError> {
    let ids = requested.iter().map(|target| target.id).collect::<Vec<_>>();
    let selected: Vec<(Uuid, Uuid, i64)> = sqlx::query_as(
        "SELECT id, user_id, revision FROM room_members \
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
    for (id, _, revision) in &selected {
        let expected = requested
            .iter()
            .find(|target| target.id == *id)
            .expect("selected id came from requested targets")
            .expected_revision;
        if *revision != expected {
            return Err(MutationError::Conflict);
        }
    }
    if !all_rooms {
        return Ok(ids);
    }
    let user_ids = selected
        .iter()
        .map(|(_, user_id, _)| *user_id)
        .collect::<Vec<_>>();
    sqlx::query_scalar(
        "SELECT m.id FROM room_members m JOIN rooms r \
            ON r.enterprise_id = m.enterprise_id AND r.id = m.room_id \
         WHERE m.user_id = ANY($1) ORDER BY m.room_id, m.id FOR UPDATE OF m",
    )
    .bind(&user_ids)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
    .map_err(MutationError::from)
}

pub async fn set_assignment(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    requested: &[Target],
    all_rooms: bool,
    change: AssignmentChange,
) -> Result<(Vec<ManagedMember>, usize), MutationError> {
    let badge_exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM enterprise_badges WHERE id = $1)")
            .bind(change.badge_id)
            .fetch_one(tx.conn())
            .await
            .map_err(DbError::from)?;
    if !badge_exists {
        return Err(DbError::NotFound.into());
    }
    let ids = lock_targets(tx, room_id, requested, all_rooms).await?;
    let changed: Vec<Uuid> = if change.assigned {
        sqlx::query_scalar(
            "INSERT INTO room_member_badges \
                (enterprise_id, room_id, member_id, badge_id, assigned_by_user_id, assigned_at) \
             SELECT m.enterprise_id, m.room_id, m.id, $2, $3, $4 FROM room_members m \
             WHERE m.id = ANY($1) ON CONFLICT DO NOTHING RETURNING member_id",
        )
        .bind(&ids)
        .bind(change.badge_id)
        .bind(change.actor_user_id)
        .bind(change.now)
        .fetch_all(tx.conn())
        .await
        .map_err(DbError::from)?
    } else {
        sqlx::query_scalar(
            "DELETE FROM room_member_badges WHERE member_id = ANY($1) AND badge_id = $2 \
             RETURNING member_id",
        )
        .bind(&ids)
        .bind(change.badge_id)
        .fetch_all(tx.conn())
        .await
        .map_err(DbError::from)?
    };
    if !changed.is_empty() {
        sqlx::query(
            "UPDATE room_members SET revision = revision + 1, updated_at = $2 \
             WHERE id = ANY($1)",
        )
        .bind(&changed)
        .bind(change.now)
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?;
    }
    Ok((
        managed_membership::list_by_ids(tx, &ids).await?,
        changed.len(),
    ))
}

pub async fn clear_assignments(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    requested: &[Target],
    all_rooms: bool,
    now: OffsetDateTime,
) -> Result<(Vec<ManagedMember>, usize), MutationError> {
    let ids = lock_targets(tx, room_id, requested, all_rooms).await?;
    let changed: Vec<Uuid> = sqlx::query_scalar(
        "DELETE FROM room_member_badges WHERE member_id = ANY($1) RETURNING member_id",
    )
    .bind(&ids)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)?;
    let mut changed = changed;
    changed.sort_unstable();
    changed.dedup();
    if !changed.is_empty() {
        sqlx::query(
            "UPDATE room_members SET revision = revision + 1, updated_at = $2 \
             WHERE id = ANY($1)",
        )
        .bind(&changed)
        .bind(now)
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?;
    }
    Ok((
        managed_membership::list_by_ids(tx, &ids).await?,
        changed.len(),
    ))
}
