//! Access tokens.
//!
//! Deliberately the same wire shape as the media grant (`services/media/src/grant.rs`):
//!
//! ```text
//! base64url-nopad(JSON claims) "." base64url-nopad(Ed25519 signature over the payload segment)
//! ```
//!
//! Reasons for reusing it rather than reaching for a JWT library:
//!
//! * There is no header segment, so there is no `alg` field, so algorithm-confusion is not
//!   representable. That property is why the media grant was built this way, and it is
//!   worth more than JWT's ecosystem here.
//! * The repository already contains a hardened verifier for this format with a
//!   byte-for-byte golden vector, so there is one audited parsing path instead of two.
//! * The signature covers the *encoded* segment, so no canonical-JSON agreement is needed
//!   between signer and verifier.
//!
//! What keeps the two token systems apart: a different signing key, a disjoint claim set,
//! and `deny_unknown_fields` on both. A media grant presented as an access token fails to
//! parse before it even fails to verify.
//!
//! Verification order matters and mirrors the media grant: length cap, split, decode the
//! signature, **verify**, and only then parse the payload. Parsing attacker-controlled
//! JSON before checking the signature is how parser bugs become vulnerabilities.

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use ed25519_dalek::{Signature, Signer, SigningKey, VerifyingKey};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::limits;

pub const ACCESS_TOKEN_VERSION: u8 = 1;

/// Refuse absurd input before doing any work. Matches the media grant's own cap.
const MAX_TOKEN_BYTES: usize = 4096;
const SIGNATURE_BYTES: usize = 64;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum TokenError {
    #[error("token is malformed")]
    Malformed,
    #[error("token signature is invalid")]
    BadSignature,
    #[error("token has expired")]
    Expired,
    #[error("token is not yet valid")]
    NotYetValid,
    #[error("unsupported token version {found}, expected {expected}")]
    UnsupportedVersion { found: u8, expected: u8 },
}

impl TokenError {
    /// Everything collapses to one opaque refusal on the wire. Telling a caller *why*
    /// their token failed is free reconnaissance; the detail belongs in the trace.
    pub fn code(&self) -> &'static str {
        "unauthorized"
    }
}

/// Field order here is the JSON key order. Disjoint from the media grant's
/// `{v, room, uid, name, role, iat, exp}` by construction.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AccessClaims {
    pub v: u8,
    /// `users.id`. A UUID, not the media grant's i64 - these are different systems.
    pub sub: Uuid,
    pub name: String,
    /// `users.is_platform_admin`. Re-checked against the database for admin-plane
    /// operations; carried here only so ordinary requests need no extra lookup.
    pub adm: bool,
    /// `users.is_guest`.
    pub gst: bool,
    /// Unique per token, so a single session can be revoked without touching the family.
    pub jti: Uuid,
    /// Seconds since the epoch, like the media grant. Never milliseconds.
    pub iat: i64,
    pub exp: i64,
}

impl AccessClaims {
    pub fn new(sub: Uuid, name: String, adm: bool, gst: bool, now_unix: i64) -> Self {
        Self {
            v: ACCESS_TOKEN_VERSION,
            sub,
            name,
            adm,
            gst,
            jti: Uuid::new_v4(),
            iat: now_unix,
            exp: now_unix + limits::ACCESS_TOKEN_TTL.as_secs() as i64,
        }
    }

    /// `now` is a parameter rather than read inside, so expiry is a pure function and
    /// tests need no sleeping. Same discipline as the media grant's `UnixTime`.
    fn validate(&self, now_unix: i64) -> Result<(), TokenError> {
        if self.v != ACCESS_TOKEN_VERSION {
            return Err(TokenError::UnsupportedVersion {
                found: self.v,
                expected: ACCESS_TOKEN_VERSION,
            });
        }
        let leeway = limits::CLOCK_SKEW_LEEWAY.as_secs() as i64;
        if now_unix + leeway < self.iat {
            return Err(TokenError::NotYetValid);
        }
        if now_unix - leeway >= self.exp {
            return Err(TokenError::Expired);
        }
        Ok(())
    }
}

pub fn sign(key: &SigningKey, claims: &AccessClaims) -> String {
    let json = serde_json::to_vec(claims).expect("AccessClaims always serialises");
    let payload = URL_SAFE_NO_PAD.encode(json);
    // Signed over the ASCII bytes of the encoded segment, so the verifier never
    // re-serialises and the two sides need not agree on JSON formatting.
    let signature = key.sign(payload.as_bytes());
    format!("{payload}.{}", URL_SAFE_NO_PAD.encode(signature.to_bytes()))
}

pub fn verify(key: &VerifyingKey, token: &str, now_unix: i64) -> Result<AccessClaims, TokenError> {
    if token.len() > MAX_TOKEN_BYTES {
        return Err(TokenError::Malformed);
    }

    let (payload, signature) = token.split_once('.').ok_or(TokenError::Malformed)?;
    if payload.is_empty() || signature.is_empty() || signature.contains('.') {
        return Err(TokenError::Malformed);
    }

    let signature_bytes = URL_SAFE_NO_PAD
        .decode(signature)
        .map_err(|_| TokenError::Malformed)?;
    let signature_bytes: [u8; SIGNATURE_BYTES] = signature_bytes
        .try_into()
        .map_err(|_| TokenError::Malformed)?;

    // verify_strict rejects both forms of signature malleability.
    key.verify_strict(payload.as_bytes(), &Signature::from_bytes(&signature_bytes))
        .map_err(|_| TokenError::BadSignature)?;

    // Only now is it safe to parse.
    let json = URL_SAFE_NO_PAD
        .decode(payload)
        .map_err(|_| TokenError::Malformed)?;
    let claims: AccessClaims = serde_json::from_slice(&json).map_err(|_| TokenError::Malformed)?;

    claims.validate(now_unix)?;
    Ok(claims)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn key() -> SigningKey {
        // Fixed key: Ed25519 signing is deterministic, so tests are reproducible.
        SigningKey::from_bytes(&[7u8; 32])
    }

    fn claims(now: i64) -> AccessClaims {
        AccessClaims::new(
            Uuid::from_u128(1),
            "Test Presenter".into(),
            false,
            false,
            now,
        )
    }

    #[test]
    fn a_signed_token_round_trips() {
        let signing = key();
        let now = 1_784_840_082;
        let token = sign(&signing, &claims(now));
        let decoded = verify(&signing.verifying_key(), &token, now).expect("should verify");
        assert_eq!(decoded.sub, Uuid::from_u128(1));
        assert_eq!(decoded.v, ACCESS_TOKEN_VERSION);
    }

    #[test]
    fn the_token_has_exactly_two_segments_and_no_header() {
        // A JWT would have three. This format has no header, hence no `alg`, hence no
        // algorithm-confusion attack surface.
        let token = sign(&key(), &claims(0));
        assert_eq!(token.matches('.').count(), 1, "{token}");
    }

    #[test]
    fn a_tampered_payload_fails_verification() {
        let signing = key();
        let token = sign(&signing, &claims(0));
        let (payload, signature) = token.split_once('.').unwrap();

        // Re-encode claims with escalated privileges, keep the original signature.
        let mut forged = claims(0);
        forged.adm = true;
        let forged_payload = URL_SAFE_NO_PAD.encode(serde_json::to_vec(&forged).unwrap());
        assert_ne!(forged_payload, payload);

        let attack = format!("{forged_payload}.{signature}");
        assert_eq!(
            verify(&signing.verifying_key(), &attack, 0),
            Err(TokenError::BadSignature)
        );
    }

    #[test]
    fn a_token_from_another_key_is_refused() {
        let token = sign(&key(), &claims(0));
        let other = SigningKey::from_bytes(&[9u8; 32]);
        assert_eq!(
            verify(&other.verifying_key(), &token, 0),
            Err(TokenError::BadSignature)
        );
    }

    #[test]
    fn expiry_is_enforced_with_the_documented_leeway() {
        let signing = key();
        let now = 1_000_000;
        let token = sign(&signing, &claims(now));
        let ttl = limits::ACCESS_TOKEN_TTL.as_secs() as i64;
        let leeway = limits::CLOCK_SKEW_LEEWAY.as_secs() as i64;

        // Still inside the window, allowing for skew.
        assert!(verify(&signing.verifying_key(), &token, now + ttl - 1).is_ok());
        // Past expiry plus leeway.
        assert_eq!(
            verify(&signing.verifying_key(), &token, now + ttl + leeway + 1),
            Err(TokenError::Expired)
        );
    }

    #[test]
    fn a_media_grant_cannot_be_used_as_an_access_token() {
        // The real grant payload from services/media/src/grant.rs:741, signed with our
        // key so that *only* the claim shape can be what rejects it.
        let grant_json = br#"{"v":1,"room":"trading-floor","uid":4242,"name":"Test Presenter","role":"presenter","iat":1753920000,"exp":1753920060}"#;
        let signing = key();
        let payload = URL_SAFE_NO_PAD.encode(grant_json);
        let signature = signing.sign(payload.as_bytes());
        let token = format!("{payload}.{}", URL_SAFE_NO_PAD.encode(signature.to_bytes()));

        // Signature is valid; `deny_unknown_fields` plus the disjoint claim set is what
        // stops it. In production the keys differ too, so this is defence in depth.
        assert_eq!(
            verify(&signing.verifying_key(), &token, 1_753_920_030),
            Err(TokenError::Malformed)
        );
    }

    #[test]
    fn malformed_shapes_are_refused_without_panicking() {
        let verifying = key().verifying_key();
        for bad in [
            "",
            ".",
            "onlyonesegment",
            "a.b.c",
            ".sig",
            "payload.",
            "!!!.???",
            &"x".repeat(MAX_TOKEN_BYTES + 1),
        ] {
            let result = verify(&verifying, bad, 0);
            assert!(result.is_err(), "{bad:?} should be refused");
        }
    }

    #[test]
    fn every_failure_looks_identical_on_the_wire() {
        assert_eq!(TokenError::Expired.code(), "unauthorized");
        assert_eq!(TokenError::BadSignature.code(), "unauthorized");
        assert_eq!(TokenError::Malformed.code(), "unauthorized");
    }
}
