//! Database errors, classified by SQLSTATE rather than by string matching.

/// SQLSTATE codes we care about. Named because `"23505"` at a call site is unreadable.
mod sqlstate {
    pub const UNIQUE_VIOLATION: &str = "23505";
    pub const FOREIGN_KEY_VIOLATION: &str = "23503";
    pub const CHECK_VIOLATION: &str = "23514";
    pub const NOT_NULL_VIOLATION: &str = "23502";
    /// Raised when a row-level security `WITH CHECK` expression rejects a write.
    pub const INSUFFICIENT_PRIVILEGE: &str = "42501";
    pub const SERIALIZATION_FAILURE: &str = "40001";
    pub const DEADLOCK_DETECTED: &str = "40P01";
}

#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("unique constraint {constraint} violated")]
    UniqueViolation { constraint: String },

    #[error("check constraint {constraint} violated")]
    CheckViolation { constraint: String },

    #[error("foreign key {constraint} violated")]
    ForeignKeyViolation { constraint: String },

    #[error("not-null constraint violated on {column}")]
    NotNullViolation { column: String },

    /// Row-level security refused a write.
    ///
    /// This is never a legitimate user outcome. It means the application composed a row
    /// whose `enterprise_id` disagrees with the GUC it set - a bug in *our* code, not bad
    /// input - so it must surface as a 500 and a loud log, never as a 403 that invites
    /// someone to "fix" it by loosening a policy.
    #[error("row-level security rejected the write")]
    RlsRejected,

    /// Transient by nature; the caller may retry the whole transaction.
    #[error("serialization failure, retryable")]
    Retryable,

    /// The authenticated database role violates the fail-closed runtime-role contract.
    ///
    /// `reason` is always one of the static strings selected by the posture validator. It
    /// never contains a query, credential, membership name, or database-supplied value.
    #[error("refusing to run as {role}: unsafe runtime-role posture ({reason})")]
    UnsafeRuntimeRole { role: String, reason: &'static str },

    /// Zero rows where exactly one was expected.
    ///
    /// Under RLS this is deliberately ambiguous: a row belonging to another tenant and a row
    /// that does not exist are byte-identical, both being "no rows". Distinguishing them
    /// would build a cross-tenant existence oracle, so this one variant covers both and the
    /// HTTP layer renders it 404 either way.
    #[error("no such row")]
    NotFound,

    #[error("database unavailable: {0}")]
    Unavailable(String),

    #[error("database error")]
    Other(#[source] sqlx::Error),
}

impl DbError {
    /// A stable machine-readable code, separate from the human message. Clients branch on
    /// this; they must never parse the message.
    pub fn code(&self) -> &'static str {
        match self {
            Self::UniqueViolation { .. } => "conflict",
            Self::CheckViolation { .. } | Self::NotNullViolation { .. } => "invalid",
            Self::ForeignKeyViolation { .. } => "invalidReference",
            Self::RlsRejected | Self::UnsafeRuntimeRole { .. } | Self::Other(_) => "internal",
            Self::Retryable => "retryable",
            Self::NotFound => "notFound",
            Self::Unavailable(_) => "unavailable",
        }
    }
}

impl From<sqlx::Error> for DbError {
    fn from(error: sqlx::Error) -> Self {
        if let sqlx::Error::Database(ref db) = error {
            let constraint = db.constraint().unwrap_or("<unnamed>").to_string();
            return match db.code().as_deref() {
                Some(sqlstate::UNIQUE_VIOLATION) => Self::UniqueViolation { constraint },
                Some(sqlstate::CHECK_VIOLATION) => Self::CheckViolation { constraint },
                Some(sqlstate::FOREIGN_KEY_VIOLATION) => Self::ForeignKeyViolation { constraint },
                Some(sqlstate::NOT_NULL_VIOLATION) => Self::NotNullViolation {
                    // `constraint()` is empty for not-null; the message names the column.
                    column: constraint,
                },
                Some(sqlstate::INSUFFICIENT_PRIVILEGE) => Self::RlsRejected,
                Some(sqlstate::SERIALIZATION_FAILURE) | Some(sqlstate::DEADLOCK_DETECTED) => {
                    Self::Retryable
                }
                _ => Self::Other(error),
            };
        }

        match error {
            sqlx::Error::PoolTimedOut => Self::Unavailable("connection pool exhausted".into()),
            sqlx::Error::PoolClosed => Self::Unavailable("connection pool closed".into()),
            sqlx::Error::Io(ref io) => Self::Unavailable(format!("io: {}", io.kind())),
            other => Self::Other(other),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn codes_are_stable_and_never_leak_internals() {
        assert_eq!(DbError::RlsRejected.code(), "internal");
        assert_eq!(
            DbError::UnsafeRuntimeRole {
                role: "runtime".into(),
                reason: "has role memberships",
            }
            .code(),
            "internal"
        );
        assert_eq!(
            DbError::UniqueViolation {
                constraint: "users_email_unique".into()
            }
            .code(),
            "conflict"
        );
        assert_eq!(DbError::Retryable.code(), "retryable");
    }

    #[test]
    fn an_rls_rejection_is_internal_not_forbidden() {
        // Deliberate: a WITH CHECK failure means our code built a row for the wrong
        // tenant. Reporting 403 would suggest the *user* lacked permission and send the
        // next person to widen a policy.
        assert_eq!(DbError::RlsRejected.code(), "internal");
    }
}
