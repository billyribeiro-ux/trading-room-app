//! The one place an error becomes an HTTP response.
//!
//! Two rules, both from `tradingroom-media`:
//!
//! * **A stable machine code, separate from the human message.** Clients branch on
//!   `error.code`; the message is for humans and may be reworded at any time.
//! * **Opaque on the wire, detailed in the log.** An internal failure returns
//!   `{"code":"internal"}` and nothing else, while the full chain goes to `tracing`.
//!   Echoing a database error to the caller is how schema details leak.

use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;

use crate::auth::password::PasswordError;
use crate::auth::refresh::RefreshError;
use crate::auth::token::TokenError;
use crate::db::DbError;

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("unauthorized")]
    Unauthorized,
    #[error("forbidden")]
    Forbidden,
    /// A capability refusal, carrying *which rule* refused.
    ///
    /// Distinct from [`Self::Forbidden`] on purpose: "you are muted", "your trial expired"
    /// and "the room is muted for non-staff" are all states a client should say out loud and
    /// can act on, and collapsing them into one blank 403 turns a temporary, explicable
    /// condition into an unexplained wall. None of them leaks anything the member does not
    /// already know about their own membership.
    #[error("{0}")]
    Denied(crate::capability::Denied),
    #[error("not found")]
    NotFound,
    #[error("conflict")]
    Conflict,
    #[error("{0}")]
    Invalid(String),
    #[error("too many requests")]
    RateLimited,
    #[error("service unavailable")]
    Unavailable,
    /// Carries the cause for the log only. Never rendered to the client.
    #[error("internal error")]
    Internal(#[source] Box<dyn std::error::Error + Send + Sync>),
}

impl ApiError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Unauthorized => "unauthorized",
            Self::Forbidden => "forbidden",
            Self::Denied(denied) => denied.code(),
            Self::NotFound => "notFound",
            Self::Conflict => "conflict",
            Self::Invalid(_) => "invalid",
            Self::RateLimited => "rateLimited",
            Self::Unavailable => "unavailable",
            Self::Internal(_) => "internal",
        }
    }

    pub fn status(&self) -> StatusCode {
        match self {
            Self::Unauthorized => StatusCode::UNAUTHORIZED,
            Self::Forbidden | Self::Denied(_) => StatusCode::FORBIDDEN,
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::Conflict => StatusCode::CONFLICT,
            Self::Invalid(_) => StatusCode::BAD_REQUEST,
            Self::RateLimited => StatusCode::TOO_MANY_REQUESTS,
            Self::Unavailable => StatusCode::SERVICE_UNAVAILABLE,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    pub fn internal(error: impl std::error::Error + Send + Sync + 'static) -> Self {
        Self::Internal(Box::new(error))
    }
}

#[derive(Serialize)]
struct ErrorBody<'a> {
    error: ErrorDetail<'a>,
}

#[derive(Serialize)]
struct ErrorDetail<'a> {
    code: &'a str,
    message: &'a str,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        // The message is only ever emitted for errors the caller can act on. Everything
        // else gets the generic text, so internals cannot leak through the message field.
        let message = match &self {
            Self::Invalid(detail) => detail.clone(),
            // Safe to surface: it describes the caller's own membership state.
            Self::Denied(denied) => denied.to_string(),
            other => other.to_string(),
        };

        if let Self::Internal(cause) = &self {
            tracing::error!(error = %cause, code = self.code(), "request failed");
        }

        (
            self.status(),
            Json(ErrorBody {
                error: ErrorDetail {
                    code: self.code(),
                    message: &message,
                },
            }),
        )
            .into_response()
    }
}

impl From<DbError> for ApiError {
    fn from(error: DbError) -> Self {
        match error {
            // Under RLS an absent row and another tenant's row are the same observation.
            DbError::NotFound => Self::NotFound,
            // An RLS write rejection means *we* built a row for the wrong tenant. That is
            // our bug, so it must not masquerade as the caller lacking permission.
            DbError::RlsRejected => Self::internal(error),
            DbError::Unavailable(_) | DbError::Retryable => Self::Unavailable,
            DbError::UniqueViolation { .. } => Self::Invalid("already exists".into()),
            DbError::CheckViolation { .. }
            | DbError::NotNullViolation { .. }
            | DbError::ForeignKeyViolation { .. } => Self::Invalid("invalid request".into()),
            other => Self::internal(other),
        }
    }
}

impl From<TokenError> for ApiError {
    fn from(_: TokenError) -> Self {
        // Every token failure is one opaque refusal; distinguishing them is free
        // reconnaissance for an attacker.
        Self::Unauthorized
    }
}

impl From<RefreshError> for ApiError {
    fn from(_: RefreshError) -> Self {
        Self::Unauthorized
    }
}

impl From<PasswordError> for ApiError {
    fn from(error: PasswordError) -> Self {
        match error {
            PasswordError::TooLong { max } => {
                Self::Invalid(format!("password exceeds {max} bytes"))
            }
            PasswordError::Busy => Self::Unavailable,
            // A malformed stored hash is a data problem on our side, not the user's.
            other => Self::internal(other),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_internal_error_never_reveals_its_cause_on_the_wire() {
        let error = ApiError::internal(DbError::UniqueViolation {
            constraint: "users_email_unique".into(),
        });
        assert_eq!(error.code(), "internal");
        assert_eq!(error.status(), StatusCode::INTERNAL_SERVER_ERROR);
        // The Display text is the generic one; the constraint name stays in the source
        // chain, which only the logger reads.
        assert_eq!(error.to_string(), "internal error");
    }

    #[test]
    fn an_rls_rejection_is_a_server_error_not_a_403() {
        let error = ApiError::from(DbError::RlsRejected);
        assert_eq!(error.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[test]
    fn token_and_refresh_failures_are_indistinguishable() {
        assert_eq!(ApiError::from(TokenError::Expired).code(), "unauthorized");
        assert_eq!(
            ApiError::from(TokenError::BadSignature).code(),
            "unauthorized"
        );
        assert_eq!(
            ApiError::from(RefreshError::Rejected).code(),
            "unauthorized"
        );
    }

    #[test]
    fn pool_exhaustion_is_a_503_so_it_is_retryable_and_alertable() {
        assert_eq!(
            ApiError::from(DbError::Unavailable("pool".into())).status(),
            StatusCode::SERVICE_UNAVAILABLE
        );
    }
}
