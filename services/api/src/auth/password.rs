//! Argon2id password hashing.
//!
//! Not a preference: the schema mandates it. `rooms_access_tiers_argon2id_check` requires
//! every room access tier's `passwordHash` to match `^[$]argon2id[$]`, so user passwords
//! use the same algorithm rather than keeping two hashers alive.
//!
//! Hashing runs on `spawn_blocking` behind a semaphore. Argon2id is *designed* to be slow
//! and memory-hungry; running it on an async worker would stall every other task sharing
//! that thread, and running it unbounded would let a burst of logins allocate
//! `MAX_CONCURRENT_HASHES * ARGON2_M_COST_KIB` several times over.

use std::sync::{Arc, LazyLock};

use argon2::{Algorithm, Argon2, Params, Version};
// `OsRng` comes from password-hash's own rand_core re-export, not from the top-level
// `rand` crate: they resolve to different rand_core majors, and mixing them fails the
// `CryptoRngCore` bound.
use password_hash::rand_core::OsRng;
use password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use tokio::sync::{OwnedSemaphorePermit, Semaphore};

use crate::limits;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum PasswordError {
    #[error("password exceeds {max} bytes")]
    TooLong { max: usize },
    #[error("stored password hash is malformed")]
    MalformedHash,
    #[error("password hashing failed")]
    HashingFailed,
    #[error("password hashing capacity is temporarily exhausted")]
    Busy,
}

static HASH_PERMITS: LazyLock<Arc<Semaphore>> =
    LazyLock::new(|| Arc::new(Semaphore::new(limits::MAX_CONCURRENT_HASHES)));
static HASH_QUEUE_SLOTS: LazyLock<Arc<Semaphore>> =
    LazyLock::new(|| Arc::new(Semaphore::new(limits::MAX_QUEUED_HASHES)));

async fn acquire_hash_permit(
    queue: Arc<Semaphore>,
    workers: Arc<Semaphore>,
) -> Result<OwnedSemaphorePermit, PasswordError> {
    // Admission is non-waiting, so this semaphore is a hard task-count bound rather than
    // another queue. Once admitted, at most MAX_QUEUED_HASHES callers may wait for a worker.
    let queue_slot = queue.try_acquire_owned().map_err(|_| PasswordError::Busy)?;
    let worker = workers
        .acquire_owned()
        .await
        .map_err(|_| PasswordError::HashingFailed)?;
    drop(queue_slot);
    Ok(worker)
}

fn hasher() -> Argon2<'static> {
    let params = Params::new(
        limits::ARGON2_M_COST_KIB,
        limits::ARGON2_T_COST,
        limits::ARGON2_P_COST,
        None,
    )
    .expect("the OWASP Argon2id profile in limits.rs is a valid parameter set");

    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
}

/// A pre-computed hash used to equalise timing when no user matches.
///
/// Without it, "unknown email" returns in microseconds while "wrong password" takes the
/// full Argon2 cost, which is a user-enumeration oracle any stopwatch can read.
static DUMMY_HASH: LazyLock<String> = LazyLock::new(|| {
    let salt = SaltString::generate(&mut OsRng);
    hasher()
        .hash_password(b"a password that matches nothing", &salt)
        .expect("hashing a fixed input with valid params cannot fail")
        .to_string()
});

pub async fn hash_password(plain: String) -> Result<String, PasswordError> {
    if plain.len() > limits::PASSWORD_MAX_BYTES {
        return Err(PasswordError::TooLong {
            max: limits::PASSWORD_MAX_BYTES,
        });
    }

    let permit = acquire_hash_permit(HASH_QUEUE_SLOTS.clone(), HASH_PERMITS.clone()).await?;

    tokio::task::spawn_blocking(move || {
        let _permit = permit;
        let salt = SaltString::generate(&mut OsRng);
        hasher()
            .hash_password(plain.as_bytes(), &salt)
            .map(|hash| hash.to_string())
            .map_err(|_| PasswordError::HashingFailed)
    })
    .await
    .map_err(|_| PasswordError::HashingFailed)?
}

/// Verifies `plain` against a PHC string.
///
/// Parameters travel inside the hash, so hashes written with older cost settings keep
/// verifying after the constants are raised - which is what makes raising them possible.
pub async fn verify_password(plain: String, stored: Option<String>) -> Result<bool, PasswordError> {
    if plain.len() > limits::PASSWORD_MAX_BYTES {
        return Err(PasswordError::TooLong {
            max: limits::PASSWORD_MAX_BYTES,
        });
    }

    // Absent hash (a guest row, or no such user) still performs a full verification
    // against the dummy, then returns false. Same work, same time, no oracle.
    let (phc, is_real) = match stored {
        Some(hash) => (hash, true),
        None => (DUMMY_HASH.clone(), false),
    };

    let permit = acquire_hash_permit(HASH_QUEUE_SLOTS.clone(), HASH_PERMITS.clone()).await?;

    tokio::task::spawn_blocking(move || {
        let _permit = permit;
        let parsed = PasswordHash::new(&phc).map_err(|_| PasswordError::MalformedHash)?;
        let matched = hasher().verify_password(plain.as_bytes(), &parsed).is_ok();
        Ok(matched && is_real)
    })
    .await
    .map_err(|_| PasswordError::HashingFailed)?
}

/// True when a stored hash was produced with weaker parameters than we now require, so the
/// caller can transparently re-hash during a successful login.
pub fn needs_rehash(stored: &str) -> bool {
    let Ok(parsed) = PasswordHash::new(stored) else {
        return true;
    };
    if parsed.algorithm.as_str() != "argon2id" {
        return true;
    }
    let Ok(params) = Params::try_from(&parsed) else {
        return true;
    };
    params.m_cost() < limits::ARGON2_M_COST_KIB || params.t_cost() < limits::ARGON2_T_COST
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn a_password_verifies_against_its_own_hash() {
        let hash = hash_password("correct horse battery staple".into())
            .await
            .expect("hashing should succeed");
        assert!(
            hash.starts_with("$argon2id$"),
            "the schema's CHECK constraint requires this exact prefix, got: {hash}"
        );
        assert!(
            verify_password("correct horse battery staple".into(), Some(hash.clone()))
                .await
                .unwrap()
        );
        assert!(!verify_password("wrong".into(), Some(hash)).await.unwrap());
    }

    #[tokio::test]
    async fn the_encoded_parameters_are_the_owasp_profile() {
        let hash = hash_password("x".into()).await.unwrap();
        assert!(
            hash.contains(&format!("m={}", limits::ARGON2_M_COST_KIB)),
            "{hash}"
        );
        assert!(
            hash.contains(&format!("t={}", limits::ARGON2_T_COST)),
            "{hash}"
        );
        assert!(
            hash.contains(&format!("p={}", limits::ARGON2_P_COST)),
            "{hash}"
        );
    }

    #[tokio::test]
    async fn two_hashes_of_one_password_differ() {
        // Distinct salts; equal hashes would mean the salt was not random.
        let a = hash_password("same".into()).await.unwrap();
        let b = hash_password("same".into()).await.unwrap();
        assert_ne!(a, b);
    }

    #[tokio::test]
    async fn a_missing_hash_verifies_to_false_rather_than_erroring() {
        // The unknown-user path: full work, false answer, no enumeration signal.
        assert!(!verify_password("anything".into(), None).await.unwrap());
    }

    #[tokio::test]
    async fn an_over_long_password_is_refused_before_hashing() {
        let long = "a".repeat(limits::PASSWORD_MAX_BYTES + 1);
        assert_eq!(
            hash_password(long.clone()).await,
            Err(PasswordError::TooLong {
                max: limits::PASSWORD_MAX_BYTES
            })
        );
        assert_eq!(
            verify_password(long, None).await,
            Err(PasswordError::TooLong {
                max: limits::PASSWORD_MAX_BYTES
            })
        );
    }

    #[tokio::test]
    async fn a_malformed_stored_hash_is_reported_not_silently_false() {
        assert_eq!(
            verify_password("x".into(), Some("not-a-phc-string".into())).await,
            Err(PasswordError::MalformedHash)
        );
    }

    #[tokio::test]
    async fn excess_hash_work_is_shed_instead_of_queued() {
        // Local semaphores prove the admission primitive without racing the other password
        // tests that legitimately share the process-global production semaphores.
        let queue = Arc::new(Semaphore::new(1));
        let workers = Arc::new(Semaphore::new(1));
        let _occupied_queue = queue.clone().acquire_owned().await.unwrap();
        assert_eq!(
            acquire_hash_permit(queue, workers).await.unwrap_err(),
            PasswordError::Busy
        );
    }

    #[tokio::test]
    async fn scrypt_hashes_from_the_retired_backend_are_flagged_for_rehash() {
        // The SQLite backend stored `scrypt$<salt>$<key>`, which is not even a PHC string.
        assert!(needs_rehash("scrypt$deadbeef$cafebabe"));
        let current = hash_password("x".into()).await.unwrap();
        assert!(!needs_rehash(&current));
    }
}
