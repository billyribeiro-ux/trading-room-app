//! Minting media grants for the SFU.
//!
//! The SFU holds only an Ed25519 **public** key: it can check a grant but not mint one, so a
//! compromised media host cannot promote anybody. This is the other half - the only place a
//! grant is signed.
//!
//! # Two keypairs, not one
//!
//! The media grant and the access token share a wire format (`payload.signature`, no header
//! segment, so `alg` confusion is unrepresentable) but **not** a key. `MEDIA_GRANT_PRIVATE_KEY`
//! signs grants; `AUTH_TOKEN_PRIVATE_KEY` signs access tokens. With one key an access token
//! would be a structurally valid grant and vice versa, and only the disjoint claim sets plus
//! `deny_unknown_fields` would stand between them. Separate keys make it arithmetic rather
//! than parsing.
//!
//! # The role mapping lives here, deliberately
//!
//! `tradingroom-media` takes the *answer* (`presenter` or `member`) and never guesses, because it
//! cannot see a `room_members` row. This service can, so the mapping from the five-value
//! `room_members.role` to the SFU's two-value vocabulary is made here - and it is made from
//! **capabilities, not the role name**: a presenter who has had `can_publish_mic`,
//! `can_publish_cam` and `can_publish_screen` all revoked is not a presenter as far as media
//! is concerned, and minting one that says otherwise would hand out a broadcast right the
//! room has already taken away.

use ed25519_dalek::{Signer, SigningKey};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::auth::extract::RoomMember;
use crate::capability::Capability;

/// How long a minted grant is valid.
///
/// Well inside `tradingroom_media::grant::MAX_GRANT_TTL_SECONDS` (300), which the SFU enforces and
/// would refuse anything larger. A grant is an admission ticket presented once at connect
/// time, not a session token: sixty seconds covers a slow page load and an immediate
/// reconnect, and the browser can always ask for another because it still holds the session
/// cookie.
pub const GRANT_TTL_SECONDS: i64 = 60;

/// The v2 claim set, as `tradingroom-media` expects to parse it.
///
/// Field order **is** the JSON key order and must match `tradingroom_media::grant::ClaimsV2`
/// exactly; `mints_a_grant_the_sfu_accepts` verifies that against the SFU's own verifier
/// rather than against this comment.
#[derive(Debug, Clone, serde::Serialize)]
struct ClaimsV2 {
    v: u8,
    room: String,
    sub: Uuid,
    name: String,
    role: &'static str,
    iat: i64,
    exp: i64,
}

/// What the SFU calls this member.
///
/// Derived from effective capabilities rather than from `room_members.role`, so a mute, an
/// expired trial or `global_mute_non_staff` all correctly demote a would-be presenter.
fn media_role(member: &RoomMember, now: OffsetDateTime) -> &'static str {
    let may_publish = [
        Capability::PublishMic,
        Capability::PublishCam,
        Capability::PublishScreen,
    ]
    .into_iter()
    .any(|capability| member.capabilities.require(capability, now).is_ok());

    if may_publish { "presenter" } else { "member" }
}

/// Mints a grant admitting this member to this room.
///
/// `now` is a parameter rather than read here, so the pinned test vector is reproducible -
/// the same discipline `tradingroom-media`'s `UnixTime` follows on the verifying side.
#[must_use]
pub fn mint(key: &SigningKey, member: &RoomMember, now: OffsetDateTime) -> String {
    let issued = now.unix_timestamp();
    let claims = ClaimsV2 {
        v: 2,
        // Hyphenated uuid: 36 bytes, well inside the SFU's MAX_ROOM_ID_BYTES of 128.
        room: member.room_id.to_string(),
        sub: member.user.user_id,
        name: member.user.display_name.clone(),
        role: media_role(member, now),
        iat: issued,
        exp: issued + GRANT_TTL_SECONDS,
    };

    sign(key, &claims)
}

fn sign(key: &SigningKey, claims: &ClaimsV2) -> String {
    use base64::Engine;
    use base64::engine::general_purpose::URL_SAFE_NO_PAD;

    // `expect` is honest here: the struct has no map keys, no non-finite floats and no
    // borrowed lifetimes, so serde_json has no failure mode available to it.
    let json = serde_json::to_vec(claims).expect("ClaimsV2 always serialises");
    let payload = URL_SAFE_NO_PAD.encode(json);
    // Signed over the ASCII of the *encoded* segment, so signer and verifier never have to
    // agree on a canonical JSON encoding.
    let signature = key.sign(payload.as_bytes());
    format!("{payload}.{}", URL_SAFE_NO_PAD.encode(signature.to_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::extract::CurrentUser;
    use crate::capability::{
        Capabilities, Capability, EffectiveCapabilities, MemberFlags, MemberRole, RoleDefaults,
        RoomRestrictions,
    };

    const ROOM: Uuid = uuid::uuid!("a0000003-0000-4000-8000-000000000001");
    const USER: Uuid = uuid::uuid!("00000000-0000-4000-8000-000000004242");

    fn key() -> SigningKey {
        SigningKey::from_bytes(&[7u8; 32])
    }

    fn now() -> OffsetDateTime {
        OffsetDateTime::from_unix_timestamp(1_753_920_000).expect("valid")
    }

    fn member(role: MemberRole, flags: MemberFlags, room: RoomRestrictions) -> RoomMember {
        RoomMember {
            user: CurrentUser {
                user_id: USER,
                display_name: "Test Presenter".into(),
                is_platform_admin: false,
                is_guest: false,
                jti: Uuid::from_u128(9),
            },
            room_id: ROOM,
            enterprise_id: Uuid::from_u128(1),
            member_id: Uuid::from_u128(2),
            capabilities: EffectiveCapabilities::resolve(
                role,
                Capabilities::NONE,
                flags,
                &RoleDefaults::COMPILED_IN,
                room,
            ),
        }
    }

    /// The contract test: a grant this service mints must be one the SFU actually accepts.
    /// Asserting against `tradingroom_media`'s own verifier rather than against a copy of its rules
    /// is what stops the two drifting.
    #[test]
    fn mints_a_grant_the_sfu_accepts() {
        use tradingroom_media::grant::{Admission, GrantVerifier, MediaUserId, Role, UnixTime};

        let key = key();
        let public = base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            key.verifying_key().as_bytes(),
        );
        let verifier = GrantVerifier::new(Some(&public), Admission::RequireGrant)
            .expect("a well-formed key builds an enforcing verifier");

        let token = mint(
            &key,
            &member(
                MemberRole::Presenter,
                MemberFlags::default(),
                RoomRestrictions::default(),
            ),
            now(),
        );

        let verified = verifier
            .verify(&token, UnixTime::from_secs(now().unix_timestamp()))
            .expect("the SFU must accept what we mint");

        assert_eq!(verified.v, 2, "we mint v2, not the retired v1");
        assert_eq!(
            verified.user,
            MediaUserId::User(USER),
            "identity must be the real users.id uuid"
        );
        assert_eq!(verified.room, ROOM.to_string());
        assert_eq!(verified.name, "Test Presenter");
        assert_eq!(verified.role, Role::Presenter);
        assert!(verified.role.can_produce());
    }

    /// A `const` block, so this is a **compile** error rather than a test failure: the two
    /// constants are known at compile time, and a build that mints grants the SFU would
    /// refuse should not get as far as producing a binary.
    #[test]
    fn the_ttl_is_inside_what_the_sfu_will_tolerate() {
        const {
            assert!(
                GRANT_TTL_SECONDS > 0
                    && GRANT_TTL_SECONDS <= tradingroom_media::grant::MAX_GRANT_TTL_SECONDS,
                "a grant this service mints must not exceed the SFU's cap, or every peer \
                 would be refused"
            );
        }
    }

    #[test]
    fn a_member_is_not_given_a_presenter_grant() {
        assert_eq!(
            media_role(
                &member(
                    MemberRole::Member,
                    MemberFlags::default(),
                    RoomRestrictions::default()
                ),
                now()
            ),
            "member"
        );
    }

    /// The reason the mapping reads capabilities instead of the role name. A muted presenter
    /// that still received `role: "presenter"` would be handed a broadcast right the room has
    /// explicitly taken away, and the SFU has no way to know better.
    #[test]
    fn a_muted_presenter_is_demoted_rather_than_handed_a_broadcast_right() {
        let muted = member(
            MemberRole::Presenter,
            MemberFlags {
                is_muted: true,
                ..MemberFlags::default()
            },
            RoomRestrictions::default(),
        );
        assert_eq!(media_role(&muted, now()), "member");
    }

    #[test]
    fn an_expired_trial_cannot_publish() {
        let expired = member(
            MemberRole::Presenter,
            MemberFlags {
                is_trial: true,
                trial_expires_at: Some(now()),
                ..MemberFlags::default()
            },
            RoomRestrictions::default(),
        );
        assert_eq!(media_role(&expired, now()), "member");
    }

    #[test]
    fn a_global_mute_does_not_silence_staff() {
        let room = RoomRestrictions {
            global_mute_non_staff: true,
        };
        // A presenter is staff, so the room-wide mute leaves them able to broadcast.
        assert_eq!(
            media_role(
                &member(MemberRole::Presenter, MemberFlags::default(), room),
                now()
            ),
            "presenter"
        );
        // A plain member is not.
        assert_eq!(
            media_role(
                &member(MemberRole::Member, MemberFlags::default(), room),
                now()
            ),
            "member"
        );
    }

    /// A presenter whose three publish capabilities have been individually revoked has
    /// nothing left to publish with, so calling them a presenter on the wire would be a lie.
    #[test]
    fn revoking_every_publish_capability_demotes_a_presenter() {
        let mut stripped = member(
            MemberRole::Presenter,
            MemberFlags {
                capabilities_overridden: true,
                ..MemberFlags::default()
            },
            RoomRestrictions::default(),
        );
        stripped.capabilities = EffectiveCapabilities::resolve(
            MemberRole::Presenter,
            Capabilities::all()
                .without(Capability::PublishMic)
                .without(Capability::PublishCam)
                .without(Capability::PublishScreen),
            MemberFlags {
                capabilities_overridden: true,
                ..MemberFlags::default()
            },
            &RoleDefaults::COMPILED_IN,
            RoomRestrictions::default(),
        );

        assert_eq!(media_role(&stripped, now()), "member");
    }
}
