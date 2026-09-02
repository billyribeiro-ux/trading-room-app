//! Password login against the `users` table.
//!
//! `users` carries no `enterprise_id` and no RLS, by design: identity is global and
//! cross-tenant isolation for it is enforced here, in application code. That is exactly
//! why this lives in one small module instead of being spread across handlers.

use ipnetwork::IpNetwork;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::auth::password;
use crate::auth::refresh::{self, IssuedRefresh};
use crate::db::{Db, DbError};

pub struct Identity {
    pub user_id: Uuid,
    pub display_name: String,
    pub is_platform_admin: bool,
    pub is_guest: bool,
}

pub struct LoggedIn {
    pub identity: Identity,
    pub refresh: IssuedRefresh,
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum LoginError {
    /// One variant for "no such account" and "wrong password" together. Splitting them
    /// would turn the login form into an account-existence oracle.
    #[error("invalid credentials")]
    InvalidCredentials,
    /// The attempt could not be evaluated - the database was unreachable, or the write
    /// that issues the session failed.
    ///
    /// Kept strictly separate from `InvalidCredentials`. Collapsing the two, which this
    /// module previously did, tells every user "wrong password" during an outage: the
    /// operator sees a spike of authentication failures rather than a database problem,
    /// and the user is told something untrue about their own credentials.
    #[error("login temporarily unavailable")]
    Unavailable,
    #[error("password error")]
    Password(#[from] password::PasswordError),
}

struct UserRow {
    id: Uuid,
    display_name: String,
    password_hash: Option<String>,
    is_platform_admin: bool,
    is_guest: bool,
}

/// Verifies an email/password pair and starts a refresh-token family.
///
/// The unknown-email path still performs a full Argon2 verification against a dummy hash
/// (see [`password::verify_password`]), so the two failure modes take the same time.
pub async fn login(
    db: &Db,
    email: &str,
    plain_password: String,
    ip: Option<IpNetwork>,
    user_agent: Option<&str>,
    now: OffsetDateTime,
) -> Result<LoggedIn, LoginError> {
    // `users.email` is citext, so the comparison is case-insensitive in the database and
    // no lowercasing is needed here. Trim only: a trailing space is a typo, not an
    // identity.
    let row: Option<(Uuid, String, Option<String>, bool, bool)> = sqlx::query_as(
        "SELECT id, display_name, password_hash, is_platform_admin, is_guest \
         FROM users WHERE email = $1",
    )
    .bind(email.trim())
    .fetch_optional(db.identity().pool())
    .await
    .map_err(|error| {
        tracing::error!(%error, "login lookup failed");
        LoginError::Unavailable
    })?;

    let user = row.map(
        |(id, display_name, password_hash, is_platform_admin, is_guest)| UserRow {
            id,
            display_name,
            password_hash,
            is_platform_admin,
            is_guest,
        },
    );

    let stored = user.as_ref().and_then(|u| u.password_hash.clone());
    let verified = password::verify_password(plain_password.clone(), stored.clone()).await?;

    let Some(user) = user else {
        return Err(LoginError::InvalidCredentials);
    };
    if !verified {
        return Err(LoginError::InvalidCredentials);
    }
    // A guest row has no password by CHECK constraint, so it can never authenticate this
    // way; the verify above would already have failed, but state it explicitly.
    if user.is_guest {
        return Err(LoginError::InvalidCredentials);
    }

    /*
      Transparent upgrade: a hash written with weaker parameters is replaced on a successful login,
      so raising the cost constants does not require a password reset.

      `AND password_hash = $4` IS A SECURITY GUARD, not defensive tidiness, and it was missing until
      2026-09-02. Hashing takes real time by design — that is what a permit and `spawn_blocking` are
      for — so the window between reading `stored` and writing `upgraded` is long enough to lose a
      race a member can start themselves. A password CHANGE committing inside it was overwritten by
      this statement with a hash of the OLD password: the member's new password stopped working, the
      old one kept working, and nothing anywhere reported it.

      Proved on a throwaway PostgreSQL 16 rather than reasoned, because `sqlx::query` is not
      compile-checked. With a change committing one second into the login, the unguarded statement
      left `OLD-strong-params` in the column and the guarded one left the member's own
      `NEW-password-chosen-by-the-member`. With nothing else touching the row the upgrade still
      lands, which is the half that keeps this feature working.

      The result stays ignored on purpose. Zero rows means somebody else won the race and their
      write is the correct one; a failure means the upgrade did not happen and the login is still
      valid. Neither is the member's problem, and neither may turn a correct password into an error.
    */
    if let Some(existing) = stored
        && password::needs_rehash(&existing)
        && let Ok(upgraded) = password::hash_password(plain_password).await
    {
        let _ = sqlx::query(
            "UPDATE users SET password_hash = $2, updated_at = $3 \
             WHERE id = $1 AND password_hash = $4",
        )
        .bind(user.id)
        .bind(upgraded)
        .bind(now)
        .bind(&existing)
        .execute(db.identity().pool())
        .await;
    }

    let _ = sqlx::query("UPDATE users SET last_login_at = $2, updated_at = $2 WHERE id = $1")
        .bind(user.id)
        .bind(now)
        .execute(db.identity().pool())
        .await;

    // The password was correct; failing to persist the session is our problem, not a
    // credential problem, and must not be reported as one.
    let refresh = refresh::issue_family(db, user.id, ip, user_agent, now)
        .await
        .map_err(|error: DbError| {
            tracing::error!(%error, user_id = %user.id, "could not issue a refresh family");
            LoginError::Unavailable
        })?;

    Ok(LoggedIn {
        identity: Identity {
            user_id: user.id,
            display_name: user.display_name,
            is_platform_admin: user.is_platform_admin,
            is_guest: user.is_guest,
        },
        refresh,
    })
}
