//! The realtime outbox: appending events, and replaying them for a reconnecting client.
//!
//! [`append`] takes a `&mut TenantTx` like every other repository function, which is what
//! makes the transactional guarantee structural rather than a convention: an event can only be
//! written inside a transaction, and the natural thing to have in hand is the transaction that
//! is already performing the mutation. There is no `append(&Db, ..)` overload that would let a
//! caller publish after `COMMIT` and open the window this table exists to close.

use serde::Serialize;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::capability::MemberRole;
use crate::db::{DbError, TenantTx};

/// Who an event is for.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Scope {
    /// Everyone in the room.
    Room,
    /// Owner, moderator, presenter and limited presenter - everyone but `member`.
    Staff,
    /// One member, named by `audience_member_id`.
    Member,
}

impl Scope {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Room => "room",
            Self::Staff => "staff",
            Self::Member => "member",
        }
    }

    /// Whether a given subscriber should receive this event.
    ///
    /// The single place the fan-out filter is decided, so a new event type cannot be leaked to
    /// the wrong audience by a handler that filters slightly differently.
    #[must_use]
    pub fn reaches(self, role: MemberRole, member_id: Uuid, audience: Option<Uuid>) -> bool {
        match self {
            Self::Room => true,
            Self::Staff => role.is_staff(),
            // An absent audience on a member-scoped event reaches nobody. The CHECK
            // constraint makes that unstorable; this is the belt to its braces, and it fails
            // closed rather than broadcasting.
            Self::Member => audience == Some(member_id),
        }
    }
}

/// An event as it is written.
pub struct NewEvent<'a> {
    pub enterprise_id: Uuid,
    pub room_id: Uuid,
    pub kind: &'a str,
    pub scope: Scope,
    pub audience_member_id: Option<Uuid>,
    pub payload: serde_json::Value,
    pub origin_member_id: Option<Uuid>,
}

/// An event as it is read back and sent to a client.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    /// The resume cursor. Opaque and increasing; **not** a counter - the sequence is global,
    /// so a room's events have gaps, which is fine and documented in `0003`.
    pub seq: i64,
    pub id: Uuid,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(skip)]
    pub scope: String,
    #[serde(skip)]
    pub audience_member_id: Option<Uuid>,
    pub payload: serde_json::Value,
    pub origin_member_id: Option<Uuid>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

impl Event {
    /// Parses the stored scope. An unrecognised value fails **closed** - to `Member` with no
    /// audience, which reaches nobody - rather than defaulting to `Room` and broadcasting
    /// something whose visibility this build does not understand.
    #[must_use]
    pub fn scope(&self) -> Scope {
        match self.scope.as_str() {
            "room" => Scope::Room,
            "staff" => Scope::Staff,
            _ => Scope::Member,
        }
    }

    #[must_use]
    pub fn reaches(&self, role: MemberRole, member_id: Uuid) -> bool {
        self.scope()
            .reaches(role, member_id, self.audience_member_id)
    }
}

/// The `LISTEN`/`NOTIFY` channel every instance watches. See [`crate::realtime::relay`].
pub const NOTIFY_CHANNEL: &str = "room_events";

/// Appends one event **in the caller's transaction**.
///
/// Returns the assigned sequence, so a handler can tell its own caller where its write landed.
pub async fn append(tx: &mut TenantTx<'_>, new: NewEvent<'_>) -> Result<Event, DbError> {
    let event: Event = sqlx::query_as(
        "INSERT INTO room_events \
           (enterprise_id, room_id, type, scope, audience_member_id, payload, origin_member_id) \
         VALUES ($1, $2, $3, $4, $5, $6, $7) \
         RETURNING seq, id, type, scope, audience_member_id, payload, origin_member_id, created_at",
    )
    .bind(new.enterprise_id)
    .bind(new.room_id)
    .bind(new.kind)
    .bind(new.scope.as_str())
    .bind(new.audience_member_id)
    .bind(sqlx::types::Json(new.payload))
    .bind(new.origin_member_id)
    .fetch_one(tx.conn())
    .await
    .map_err(DbError::from)?;

    // Wakes the other instances. Issued inside the transaction on purpose: Postgres holds a
    // NOTIFY until COMMIT and discards it on ROLLBACK, so this cannot announce an event that
    // did not happen - the delivery guarantee comes free from the transaction the event is
    // already in.
    //
    // The payload is only a *pointer* (`enterprise:room:seq`), never the event itself. That
    // sidesteps NOTIFY's 8 KB ceiling entirely and, more importantly, keeps `room_events` the
    // single source of truth: a listener re-reads the row rather than trusting a copy that
    // could disagree with it.
    sqlx::query("SELECT pg_notify($1, $2)")
        .bind(NOTIFY_CHANNEL)
        .bind(format!(
            "{}:{}:{}",
            new.enterprise_id, new.room_id, event.seq
        ))
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?;

    Ok(event)
}

/// One event by sequence, for a listener that has been told it exists.
pub async fn by_seq(tx: &mut TenantTx<'_>, seq: i64) -> Result<Option<Event>, DbError> {
    sqlx::query_as(
        "SELECT seq, id, type, scope, audience_member_id, payload, origin_member_id, created_at \
         FROM room_events WHERE seq = $1",
    )
    .bind(seq)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)
}

/// Everything in this room after `after_seq`, oldest first, capped at `limit`.
///
/// The caller gets them in the order they must be applied. A client that receives fewer than
/// it asked for has caught up; one that receives exactly `limit` should ask again from the
/// last `seq` it saw.
pub async fn replay(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    after_seq: i64,
    limit: i64,
) -> Result<Vec<Event>, DbError> {
    sqlx::query_as(
        "SELECT seq, id, type, scope, audience_member_id, payload, origin_member_id, created_at \
         FROM room_events \
         WHERE room_id = $1 AND seq > $2 \
         ORDER BY seq ASC \
         LIMIT $3",
    )
    .bind(room_id)
    .bind(after_seq)
    .bind(limit)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

/// The newest sequence in this room, or 0 if it has no events.
///
/// A client connecting for the first time starts here rather than at 0, so it is not sent the
/// room's entire history as "what you missed".
pub async fn latest_seq(tx: &mut TenantTx<'_>, room_id: Uuid) -> Result<i64, DbError> {
    let seq: Option<i64> =
        sqlx::query_scalar("SELECT max(seq) FROM room_events WHERE room_id = $1")
            .bind(room_id)
            .fetch_one(tx.conn())
            .await
            .map_err(DbError::from)?;
    Ok(seq.unwrap_or(0))
}

/// Drops events older than `before`. Returns how many.
///
/// Retention, not correctness: a client whose cursor falls off the end of the log is told to
/// resync rather than silently given a partial history. Called by an operator or a job, never
/// on a request path.
pub async fn prune(tx: &mut TenantTx<'_>, before: OffsetDateTime) -> Result<u64, DbError> {
    let result = sqlx::query("DELETE FROM room_events WHERE created_at < $1")
        .bind(before)
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?;
    Ok(result.rows_affected())
}

#[cfg(test)]
mod tests {
    use super::*;

    const MEMBER: Uuid = Uuid::from_u128(1);
    const OTHER: Uuid = Uuid::from_u128(2);

    #[test]
    fn a_room_scoped_event_reaches_everyone() {
        for role in MemberRole::ALL {
            assert!(Scope::Room.reaches(role, MEMBER, None));
        }
    }

    #[test]
    fn a_staff_scoped_event_never_reaches_a_plain_member() {
        assert!(!Scope::Staff.reaches(MemberRole::Member, MEMBER, None));
        for role in MemberRole::ALL
            .into_iter()
            .filter(|role| *role != MemberRole::Member)
        {
            assert!(Scope::Staff.reaches(role, MEMBER, None), "{role:?}");
        }
    }

    #[test]
    fn a_member_scoped_event_reaches_only_its_audience() {
        assert!(Scope::Member.reaches(MemberRole::Member, MEMBER, Some(MEMBER)));
        assert!(!Scope::Member.reaches(MemberRole::Member, OTHER, Some(MEMBER)));
        // Even an owner does not get another member's private event by virtue of rank.
        assert!(!Scope::Member.reaches(MemberRole::Owner, OTHER, Some(MEMBER)));
    }

    #[test]
    fn a_member_scoped_event_with_no_audience_reaches_nobody() {
        // The CHECK constraint makes this unstorable; if one ever appears it must fail
        // closed rather than broadcast.
        for role in MemberRole::ALL {
            assert!(!Scope::Member.reaches(role, MEMBER, None), "{role:?}");
        }
    }

    #[test]
    fn an_unknown_scope_fails_closed() {
        let event = Event {
            seq: 1,
            id: Uuid::nil(),
            kind: "something.new".into(),
            scope: "a-scope-this-build-does-not-know".into(),
            audience_member_id: None,
            payload: serde_json::json!({}),
            origin_member_id: None,
            created_at: OffsetDateTime::UNIX_EPOCH,
        };
        // Not `Room`. A future scope must not become a broadcast on an older build.
        for role in MemberRole::ALL {
            assert!(!event.reaches(role, MEMBER), "{role:?}");
        }
    }

    #[test]
    fn the_wire_form_hides_the_routing_fields() {
        let event = Event {
            seq: 7,
            id: Uuid::from_u128(3),
            kind: "message.created".into(),
            scope: "member".into(),
            audience_member_id: Some(MEMBER),
            payload: serde_json::json!({"body": "hi"}),
            origin_member_id: Some(OTHER),
            created_at: OffsetDateTime::UNIX_EPOCH,
        };
        let json = serde_json::to_value(&event).expect("serialises");

        assert_eq!(json["seq"], 7);
        assert_eq!(json["type"], "message.created");
        // `scope` and `audienceMemberId` decide *who* gets the event; telling the recipient
        // that it was addressed to them specifically, or that a staff-only channel exists,
        // is routing metadata they have no use for.
        assert!(json.get("scope").is_none(), "{json}");
        assert!(json.get("audienceMemberId").is_none(), "{json}");
    }
}
