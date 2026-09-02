//! Refresh tokens: rotation with family-wide reuse detection.
//!
//! This design is not a preference; the schema asks for it. `refresh_tokens` carries both
//! `family_id` and `revoked_at`, and that pair exists for exactly one purpose: when a
//! token that has already been rotated is presented again, the only safe conclusion is
//! that someone copied it, and the whole family must die. The supporting indexes are
//! there too - `refresh_tokens_token_hash_unique` for the lookup and a family index for
//! the revocation sweep.
//!
//! Tokens are 32 random bytes, stored only as a SHA-256 hash. SHA-256 rather than Argon2
//! because the input already carries 256 bits of entropy - there is nothing to brute
//! force. The hash exists so that a database dump does not hand over live credentials.
//!
//! `refresh_tokens` has no `enterprise_id` and no RLS, so this module works through
//! [`crate::db::IdentityDb`] - the one narrow door for identity tables.

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use ipnetwork::IpNetwork;
// `Rng`, not `RngCore`: rand 0.10 re-exports `Rng` from rand_core at the crate root and no longer
// re-exports `RngCore`, which survives only as the marker supertrait `trait RngCore: Rng {}`.
// `fill_bytes` is declared on `Rng` (rand_core 0.10.1 src/lib.rs:62), so this import is what makes
// the call below resolve.
use rand::Rng;
use sha2::{Digest, Sha256};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::db::{Db, DbError};
use crate::limits;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum RefreshError {
    /// One variant for every rejection, on purpose: the caller must not be able to tell
    /// "no such token" from "expired" from "reused". Only the trace records which.
    #[error("refresh token rejected")]
    Rejected,
}

impl RefreshError {
    pub fn code(&self) -> &'static str {
        "unauthorized"
    }
}

/// Why a refresh attempt failed. Never reaches the client; drives logs and metrics.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RejectionReason {
    Unknown,
    Expired,
    FamilyTooOld,
    /// A token that had already been rotated was presented again.
    Reused,
}

pub struct IssuedRefresh {
    /// The raw token. Returned to the caller exactly once, never stored.
    pub token: String,
    pub family_id: Uuid,
    pub expires_at: OffsetDateTime,
}

/// Hand-written rather than derived: this type holds a live credential, and a derived
/// `Debug` would print it into the first `tracing` call or `assert!` message that touches
/// the struct. Redaction has to be the default, not a thing to remember.
impl std::fmt::Debug for IssuedRefresh {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("IssuedRefresh")
            .field("token", &"<redacted>")
            .field("family_id", &self.family_id)
            .field("expires_at", &self.expires_at)
            .finish()
    }
}

fn hash_token(raw: &str) -> String {
    hex::encode(Sha256::digest(raw.as_bytes()))
}

fn generate_token() -> String {
    let mut bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

fn truncate_user_agent(user_agent: Option<&str>) -> Option<String> {
    user_agent.map(|ua| {
        let mut owned = ua.to_owned();
        // `user_agent` is diagnostic, not a document store.
        owned.truncate(limits::USER_AGENT_MAX_BYTES);
        owned
    })
}

/// Starts a new rotation family. Called on login and on guest creation.
pub async fn issue_family(
    db: &Db,
    user_id: Uuid,
    ip: Option<IpNetwork>,
    user_agent: Option<&str>,
    now: OffsetDateTime,
) -> Result<IssuedRefresh, DbError> {
    let family_id = Uuid::new_v4();
    insert(db, user_id, family_id, ip, user_agent, now).await
}

async fn insert(
    db: &Db,
    user_id: Uuid,
    family_id: Uuid,
    ip: Option<IpNetwork>,
    user_agent: Option<&str>,
    now: OffsetDateTime,
) -> Result<IssuedRefresh, DbError> {
    let token = generate_token();
    let expires_at = now + limits::REFRESH_TOKEN_TTL;

    sqlx::query(
        "INSERT INTO refresh_tokens \
           (user_id, token_hash, expires_at, user_agent, ip, family_id, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)",
    )
    .bind(user_id)
    .bind(hash_token(&token))
    .bind(expires_at)
    .bind(truncate_user_agent(user_agent))
    .bind(ip)
    .bind(family_id)
    .bind(now)
    .execute(db.identity().pool())
    .await
    .map_err(DbError::from)?;

    Ok(IssuedRefresh {
        token,
        family_id,
        expires_at,
    })
}

/// Revokes every live token in a family. Returns how many were killed.
pub async fn revoke_family(db: &Db, family_id: Uuid, now: OffsetDateTime) -> Result<u64, DbError> {
    let result = sqlx::query(
        "UPDATE refresh_tokens SET revoked_at = $2, updated_at = $2 \
         WHERE family_id = $1 AND revoked_at IS NULL",
    )
    .bind(family_id)
    .bind(now)
    .execute(db.identity().pool())
    .await
    .map_err(DbError::from)?;

    Ok(result.rows_affected())
}

#[derive(Debug)]
pub struct Rotated {
    pub user_id: Uuid,
    /// Its `Debug` redacts the token, so printing a `Rotated` is safe.
    pub refresh: IssuedRefresh,
}

/// Rotates a presented token, or refuses and explains why (to the log, not the caller).
///
/// The whole operation runs in one transaction with `SELECT ... FOR UPDATE`, so two
/// concurrent rotations of the same token serialise. The loser then observes
/// `revoked_at` set and trips the reuse path. That is strict - a genuine double-refresh
/// race from one browser costs a re-login - and it is the right trade for an enterprise
/// posture, because the alternative is letting a stolen token through whenever it races
/// the legitimate one.
pub async fn rotate(
    db: &Db,
    presented: &str,
    ip: Option<IpNetwork>,
    user_agent: Option<&str>,
    now: OffsetDateTime,
) -> Result<Rotated, (RefreshError, RejectionReason)> {
    let reject = |reason| (RefreshError::Rejected, reason);

    let mut tx = db
        .identity()
        .pool()
        .begin()
        .await
        .map_err(|_| reject(RejectionReason::Unknown))?;

    let row: Option<(Uuid, Uuid, Uuid, OffsetDateTime, Option<OffsetDateTime>)> = sqlx::query_as(
        "SELECT id, user_id, family_id, expires_at, revoked_at \
         FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE",
    )
    .bind(hash_token(presented))
    .fetch_optional(&mut *tx)
    .await
    .map_err(|_| reject(RejectionReason::Unknown))?;

    let Some((id, user_id, family_id, expires_at, revoked_at)) = row else {
        return Err(reject(RejectionReason::Unknown));
    };

    if revoked_at.is_some() {
        // Replay. Kill the family inside this transaction so the decision is atomic with
        // the detection.
        sqlx::query(
            "UPDATE refresh_tokens SET revoked_at = $2, updated_at = $2 \
             WHERE family_id = $1 AND revoked_at IS NULL",
        )
        .bind(family_id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .map_err(|_| reject(RejectionReason::Unknown))?;
        tx.commit()
            .await
            .map_err(|_| reject(RejectionReason::Reused))?;

        tracing::warn!(
            %user_id,
            %family_id,
            "refresh token reuse detected; revoked the entire family"
        );
        return Err(reject(RejectionReason::Reused));
    }

    if expires_at <= now {
        // Revoke rather than merely refusing. Left live, an expired row stays a valid
        // lookup target forever, so a copy taken years ago still classifies as "expired"
        // instead of "reused" and never triggers family revocation.
        sqlx::query("UPDATE refresh_tokens SET revoked_at = $2, updated_at = $2 WHERE id = $1")
            .bind(id)
            .bind(now)
            .execute(&mut *tx)
            .await
            .map_err(|_| reject(RejectionReason::Unknown))?;
        tx.commit()
            .await
            .map_err(|_| reject(RejectionReason::Expired))?;
        return Err(reject(RejectionReason::Expired));
    }

    // A continuously-refreshed family would otherwise live forever.
    let family_started: Option<OffsetDateTime> =
        sqlx::query_scalar("SELECT min(created_at) FROM refresh_tokens WHERE family_id = $1")
            .bind(family_id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|_| reject(RejectionReason::Unknown))?;

    if let Some(started) = family_started
        && now - started > limits::SESSION_ABSOLUTE_TTL
    {
        sqlx::query("UPDATE refresh_tokens SET revoked_at = $2, updated_at = $2 WHERE family_id = $1 AND revoked_at IS NULL")
            .bind(family_id)
            .bind(now)
            .execute(&mut *tx)
            .await
            .map_err(|_| reject(RejectionReason::Unknown))?;
        tx.commit()
            .await
            .map_err(|_| reject(RejectionReason::FamilyTooOld))?;
        return Err(reject(RejectionReason::FamilyTooOld));
    }

    // Retire the presented token and mint its successor in the same family.
    sqlx::query("UPDATE refresh_tokens SET revoked_at = $2, updated_at = $2 WHERE id = $1")
        .bind(id)
        .bind(now)
        .execute(&mut *tx)
        .await
        .map_err(|_| reject(RejectionReason::Unknown))?;

    let token = generate_token();
    let expires_at = now + limits::REFRESH_TOKEN_TTL;
    sqlx::query(
        "INSERT INTO refresh_tokens \
           (user_id, token_hash, expires_at, user_agent, ip, family_id, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)",
    )
    .bind(user_id)
    .bind(hash_token(&token))
    .bind(expires_at)
    .bind(truncate_user_agent(user_agent))
    .bind(ip)
    .bind(family_id)
    .bind(now)
    .execute(&mut *tx)
    .await
    .map_err(|_| reject(RejectionReason::Unknown))?;

    tx.commit()
        .await
        .map_err(|_| reject(RejectionReason::Unknown))?;

    Ok(Rotated {
        user_id,
        refresh: IssuedRefresh {
            token,
            family_id,
            expires_at,
        },
    })
}

/// Revokes the family a presented token belongs to, without rotating.
///
/// Used by logout: ending a session must end it everywhere, including a successor another
/// tab has already minted. An unknown token is not an error - logging out with a stale
/// cookie should still clear it.
pub async fn revoke_family_for_token(
    db: &Db,
    presented: &str,
    now: OffsetDateTime,
) -> Result<u64, DbError> {
    // ONE STATEMENT, and the two it replaced were not wrong - they were two round trips.
    //
    // This read `family_id` and then called `revoke_family` with it, outside a transaction. A
    // carried-forward note called that a TOCTOU; RE-MEASURED 2026-09-02, and it was not one. Every
    // way the row can change between the read and the write lands on the same answer: a concurrent
    // rotation inserts into the SAME family, so the revoke still catches the successor; a family
    // already revoked matches nothing under `revoked_at IS NULL`; and a deleted row does not make
    // the `family_id` already in hand wrong. There was no window in which the wrong thing happened,
    // and saying otherwise would have been inheriting a label instead of measuring one.
    //
    // What IS true is the shape, and `CLAUDE.md` states the rule without reference to races: one
    // atomic conditional `UPDATE ... WHERE ... RETURNING`. Logout is on the request path, so the
    // second round trip is a network hop a member waits for, and the subquery resolves through
    // `refresh_tokens_token_hash_unique`.
    //
    // The refusal semantics are preserved exactly, and this was PROVED rather than reasoned: the
    // statement was run against a throwaway PostgreSQL 16 on 2026-09-02, over a table holding one
    // family of three rows (two live, one already revoked) plus a second family that must not be
    // touched.
    //
    //   a known token         -> 2 rows affected  (the two LIVE rows; `revoked_at IS NULL` skips
    //                                              the third, which keeps its original timestamp)
    //   the second family     -> untouched, `updated_at` still NULL
    //   an UNKNOWN token      -> 0 rows affected  (the subquery is NULL, `family_id = NULL` is
    //                                              never true - this is the `Ok(0)` the `None` arm
    //                                              returned, and logging out with a stale cookie
    //                                              must not be an error)
    //   replaying the same    -> 0 rows affected  (idempotent)
    //
    // Worth stating because `sqlx::query` is NOT compile-time checked: the compiler had nothing to
    // say about this SQL, so running it was the only way to know.
    let result = sqlx::query(
        "UPDATE refresh_tokens SET revoked_at = $2, updated_at = $2 \
         WHERE family_id = (SELECT family_id FROM refresh_tokens WHERE token_hash = $1) \
           AND revoked_at IS NULL",
    )
    .bind(hash_token(presented))
    .bind(now)
    .execute(db.identity().pool())
    .await
    .map_err(DbError::from)?;

    Ok(result.rows_affected())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_token_is_never_stored_in_the_clear() {
        let token = generate_token();
        let hash = hash_token(&token);
        assert_ne!(hash, token);
        assert_eq!(hash.len(), 64, "sha256 hex");
        // Deterministic, so lookup by hash works.
        assert_eq!(hash, hash_token(&token));
    }

    #[test]
    fn tokens_carry_full_entropy_and_do_not_repeat() {
        let a = generate_token();
        let b = generate_token();
        assert_ne!(a, b);
        // 32 bytes base64url-nopad.
        assert_eq!(a.len(), 43, "{a}");
        assert!(
            !a.contains('='),
            "padding would break the cookie round-trip"
        );
    }

    #[test]
    fn an_over_long_user_agent_is_truncated_before_insert() {
        let long = "u".repeat(limits::USER_AGENT_MAX_BYTES * 2);
        let stored = truncate_user_agent(Some(&long)).unwrap();
        assert_eq!(stored.len(), limits::USER_AGENT_MAX_BYTES);
        assert_eq!(truncate_user_agent(None), None);
    }

    #[test]
    fn every_rejection_looks_the_same_to_the_caller() {
        // The reason is for us; the client sees one word.
        assert_eq!(RefreshError::Rejected.code(), "unauthorized");
    }
}
