//! Ed25519 admission grants: how the SFU learns who a peer is without touching the app's database.
//!
//! The SvelteKit app owns identity - it holds the session cookie, the `users` row and the role
//! (`src/lib/server/auth.ts:8`, `src/lib/server/connection.ts:27-32`). The SFU owns media. Those are
//! two processes, and on the deployed stack two machines. The obvious ways to bridge them are both
//! wrong for this service:
//!
//! * **Give the SFU a database connection.** It would then need the app's schema, its migrations and
//!   its credentials, and every media connection would cost a query on the path a peer is already
//!   waiting on. It also makes the SFU independently able to read `users.password_hash`.
//! * **Have the SFU call the app to check the cookie.** That puts a synchronous network hop, and the
//!   app's availability, in front of every join - a media server that cannot admit anyone because a
//!   web process is restarting.
//!
//! So the app hands the browser a short-lived, signed statement of who it is and what room it may
//! enter, and the browser presents that to the SFU. The SFU holds only an Ed25519 **public** key
//! (`config::Config::grant_public_key` from `MEDIA_GRANT_PUBLIC_KEY`); it can check a grant but not
//! mint one, so a compromised media host cannot promote anybody. Verification is a few microseconds
//! of local arithmetic with no I/O.
//!
//! `router_registry` deliberately leaves room-id validation to this module - "Room ids are opaque
//! strings and are *not* validated here. Deciding which room ids exist is an admission question (see
//! `config::Config::grant_public_key`)" (`router_registry.rs:33-35`). This is that layer.
//!
//! # Wire format
//!
//! A grant is one ASCII string of two dot-separated segments:
//!
//! ```text
//! <payload> "." <signature>
//!
//! payload   = base64url-nopad( UTF-8 JSON claims )
//! signature = base64url-nopad( Ed25519 signature over the ASCII bytes of `payload` )
//! ```
//!
//! Two properties of that definition matter, and both exist to make a byte-for-byte compatible
//! TypeScript signer possible:
//!
//! * **The signature covers the encoded segment, not the JSON.** So the two sides never have to
//!   agree on a canonical JSON encoding - key order, whitespace and number formatting are whatever
//!   `JSON.stringify` produced, and this module never re-serialises the claims to check them. It
//!   only ever *decodes* the exact bytes that were signed.
//! * **base64url without padding** (RFC 4648 §5: `-` and `_`, no `=`), which is exactly what Node's
//!   `Buffer.toString('base64url')` emits. Decoding is strict on both counts:
//!   `base64::engine::general_purpose::URL_SAFE_NO_PAD` is built from `NO_PAD`, which sets
//!   `DecodePaddingMode::RequireNone` and leaves `decode_allow_trailing_bits` false
//!   (`base64-0.22.1/src/engine/general_purpose/mod.rs:341,350-352` and `:245-262`). A padded or
//!   standard-alphabet grant is refused rather than silently accepted.
//!
//! **This is not a JWT.** There is no header segment and no `alg` field, so there is no algorithm to
//! confuse: the verifier hard-codes Ed25519, and `"alg":"none"` is not representable. The `iat`/`exp`
//! claim *names* are borrowed from RFC 7519 because they are familiar; nothing else is.
//!
//! ## Claims
//!
//! Exactly seven keys, no more and no fewer - each version's payload is deserialised with
//! `#[serde(deny_unknown_fields)]`, so a signer that adds a claim fails loudly at the first grant
//! instead of having it silently ignored:
//!
//! | key    | JSON type | v1 | v2 | meaning                                                    |
//! |--------|-----------|----|----|------------------------------------------------------------|
//! | `v`    | number    | 1  | 2  | wire version                                               |
//! | `room` | string    | ✓  | ✓  | room id, 1..=[`MAX_ROOM_ID_BYTES`] bytes                   |
//! | `uid`  | number    | ✓  | -  | the retired SQLite rowid, a positive integer               |
//! | `sub`  | string    | -  | ✓  | `users.id`, a hyphenated uuid                              |
//! | `name` | string    | ✓  | ✓  | `users.display_name`, the peer's display name              |
//! | `role` | string    | ✓  | ✓  | `"presenter"` or `"member"`                                |
//! | `iat`  | number    | ✓  | ✓  | issued at, **seconds** since the Unix epoch                |
//! | `exp`  | number    | ✓  | ✓  | expires at, **seconds** since the Unix epoch, exclusive    |
//!
//! # Why there are two versions
//!
//! v1's `uid` is an integer because the app's ids were SQLite autoincrement rowids, which start
//! at 1 - hence the "positive" requirement. The PostgreSQL schema that replaced it makes
//! `users.id` a **uuid** (`second-dump/db/RECREATE.sql`), and a uuid does not fit in an `i64`.
//!
//! The expedient fix - hash the uuid down to a deterministic `i64` surrogate - was rejected. It is
//! a permanently one-way mapping: the moment the SFU needs to attribute anything to a real user
//! (recording ownership, per-user media policy, moderation, analytics) the surrogate cannot be
//! inverted, and by then it is baked into every stored artifact. It also buys a birthday-collision
//! surface for no benefit.
//!
//! So the claim set is versioned instead, which is what the `v` field was put there for. **This
//! build accepts both** ([`SUPPORTED_GRANT_VERSIONS`]) for one deploy cycle, so the signer and the
//! SFU can be rolled independently in either order. Once v1 traffic reaches zero - visible because
//! [`Grant::v`] records which version each peer arrived on - `GRANT_VERSION_V1`, [`ClaimsV1`] and
//! [`MediaUserId::Legacy`] are deleted together and the compiler finds every site.
//!
//! A v1 grant and a v2 grant are never confusable: the version is read first, and the chosen claim
//! set is `deny_unknown_fields`, so a v1 payload labelled `"v":2` is refused for carrying `uid`
//! rather than quietly parsed as something it is not.
//!
//! `name` is carried even though it is not needed to *admit* anyone: the whole point of this design
//! is that the SFU never queries the app's database, and a roster that had to label a tile with a
//! human name would otherwise have to. `users.display_name` is `notNull` in the app's schema, so a
//! signer always has one.
//!
//! `iat` and `exp` are **seconds**, not milliseconds. This is the single most likely way a
//! JavaScript signer gets it wrong, because `Date.now()` returns milliseconds: `Math.floor(Date.now()
//! / 1000)`. A millisecond `iat` lands roughly 50,000 years in the future and every grant is refused
//! as [`GrantError::NotYetValid`], which is at least a loud and self-describing failure.
//!
//! ## Signing it in TypeScript
//!
//! ```js
//! import { createPrivateKey, sign } from 'node:crypto';
//!
//! // The Rust API contract is a raw 32-byte Ed25519 seed in standard base64. Wrap those
//! // bytes in the fixed RFC 8410 PKCS#8 prefix only to construct Node's in-memory KeyObject.
//! const encoded = process.env.MEDIA_GRANT_PRIVATE_KEY?.trim() ?? '';
//! const seed = Buffer.from(encoded, 'base64');
//! if (seed.length !== 32 || seed.toString('base64') !== encoded) {
//!   throw new Error('MEDIA_GRANT_PRIVATE_KEY must be 32 raw bytes in padded standard base64');
//! }
//! const prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
//! const key = createPrivateKey({
//!   key: Buffer.concat([prefix, seed]),
//!   format: 'der',
//!   type: 'pkcs8'
//! });
//!
//! const now = Math.floor(Date.now() / 1000);   // SECONDS
//! const claims = {
//!   v: 2,
//!   room: roomId,          // rooms.id, hyphenated uuid
//!   sub: user.id,          // users.id, hyphenated uuid
//!   name: user.displayName,
//!   role: user.role === 'staff' || user.role === 'admin' ? 'presenter' : 'member',
//!   iat: now,
//!   exp: now + 60
//! };
//!
//! const payload = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
//! // `null` as the algorithm is required for Ed25519: the curve fixes the hash.
//! const signature = sign(null, Buffer.from(payload, 'ascii'), key).toString('base64url');
//! const grant = `${payload}.${signature}`;
//! ```
//!
//! `the_wire_format_is_pinned_byte_for_byte` in this module's tests holds a golden token built from a
//! fixed key and fixed claims. Ed25519 signatures are deterministic (RFC 8032 derives the nonce from
//! the key and the message), so the TypeScript signer can assert against that exact string.
//!
//! ## Configuring the public key
//!
//! `MEDIA_GRANT_PUBLIC_KEY` is the **raw 32 public-key bytes in standard base64, with padding** -
//! 44 characters ending in `=`. Not base64url, not DER/SPKI, not PEM. From the private key:
//!
//! ```js
//! import { createPublicKey } from 'node:crypto';
//! // The JWK `x` member of an Ed25519 key is the raw 32 bytes, base64url encoded (RFC 8037 §2).
//! const { x } = createPublicKey(key).export({ format: 'jwk' });
//! console.log(Buffer.from(x, 'base64url').toString('base64'));
//! ```
//!
//! The configured key is logged at startup. It is public by definition, and "the app and the SFU are
//! holding different halves of different keypairs" is the misconfiguration this whole mechanism fails
//! most opaquely on - every peer refused, no other symptom - so it is worth being able to eyeball.
//!
//! # No public key configured
//!
//! [`GrantVerifier::new`] takes the answer as an explicit [`Admission`] argument rather than
//! inferring it, and the four combinations are:
//!
//! | key         | admission        | result                                                    |
//! |-------------|------------------|-----------------------------------------------------------|
//! | set         | `RequireGrant`   | enforcing verifier                                        |
//! | **absent**  | `RequireGrant`   | **[`GrantConfigError::MissingPublicKey`] - refuse to start** |
//! | absent      | `AllowAnonymous` | anonymous development mode, logged at `warn`              |
//! | **set**     | `AllowAnonymous` | **[`GrantConfigError::ContradictoryAdmission`] - refuse to start** |
//!
//! The two refusals are the point. A missing key cannot degrade into "let everyone in": that is the
//! failure where nothing looks wrong until strangers are in a paid room, so it is a startup crash
//! with a message naming the variable. And a *configured* key cannot be disabled by the anonymous
//! flag either - a stale `AllowAnonymous` left in a production environment alongside a real key would
//! otherwise silently turn admission off, so the contradiction is refused instead of resolved.
//!
//! In anonymous mode [`GrantVerifier::admit`] returns [`Admitted::Anonymous`] for a peer that
//! presents nothing, and **refuses** a peer that presents a grant with
//! [`GrantError::NoVerifyingKey`]: a peer holding a grant is asserting a specific identity and role,
//! and quietly downgrading that to "some anonymous member" would be a fabricated identity rather than
//! an honest failure.
//!
//! # Constant-time verification
//!
//! Nothing here compares signature bytes. The entire check is
//! [`ed25519_dalek::VerifyingKey::verify_strict`], which additionally rejects both forms of
//! signature malleability - it refuses small-order `R` and small-order public keys, and its scalar
//! decode goes through `Scalar::from_canonical_bytes` returning a `subtle::CtOption`
//! (`ed25519-dalek-2.2.0/src/verifying.rs:357-379` and `src/signature.rs:91-96`). The plain
//! `Verifier::verify` impl does neither, which is why it is not used.
//!
//! Honest note on scope: base64 decoding is not constant time
//! (`base64-0.22.1/src/engine/general_purpose/mod.rs:20-21` says so explicitly), and neither is
//! serde_json. That is fine here because every byte those two touch - the token, the signature, the
//! public key - is public data. There is no secret on the verify path at all; the private key exists
//! only in the SvelteKit process.
//!
//! # What a grant does not do
//!
//! * **Replay.** A grant is a bearer token: anyone holding it can present it until it expires.
//!   The signalling server caps concurrent sockets per verified identity so one replayable grant
//!   cannot monopolize a node. It does not make the token single-use across time or across SFU
//!   nodes; that requires a node/audience-bound nonce coordinated by the control plane.
//! * **Revocation.** There is no revocation list; a grant is valid until it expires. Kicking a peer
//!   is a signalling-layer action against a live session, not something the admission layer can undo.
//! * **Deciding which room ids exist.** Only the structural bounds below are enforced. The SFU trusts
//!   any room id the app signed, because it has no way not to: there is no room entity in the app's
//!   schema at all (`messages.room` is a chat-channel label, and `alerts` has no room column), so
//!   there is nothing here to validate a room id *against*. That is an honest gap in the evidence,
//!   not a decision this module can make.
//! * **Choosing the TTL.** [`MAX_GRANT_TTL_SECONDS`] is a policy decision, not a value read off
//!   anything: the app's `sessions` table has no expiry column, so a grant's lifetime cannot be
//!   derived from the session's (`src/lib/server/db/schema.ts:193-204`).

use crate::config::Config;
use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use base64::Engine;
use ed25519_dalek::{Signature, VerifyingKey, PUBLIC_KEY_LENGTH, SIGNATURE_LENGTH};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;

/// The original wire version: identity is `uid`, a positive integer.
///
/// Retained only for the transition described in the module docs. Once every signer emits v2 this
/// constant, [`ClaimsV1`] and the `uid` half of [`MediaUserId`] are deleted together.
pub const GRANT_VERSION_V1: u8 = 1;

/// The current wire version: identity is `sub`, a `users.id` uuid.
pub const GRANT_VERSION_V2: u8 = 2;

/// Every version this build will verify.
///
/// Two entries is a deliberate, temporary state. A version field that only ever holds one value
/// has never earned its keep; this is the migration it was put there for.
pub const SUPPORTED_GRANT_VERSIONS: [u8; 2] = [GRANT_VERSION_V1, GRANT_VERSION_V2];

/// The longest `exp - iat` a grant may declare.
///
/// A grant is an admission ticket presented once at connect time, not a session token, so it does
/// not need to outlive the handshake. Capping it here means a signer bug that mints thirty-day
/// grants fails at the SFU rather than quietly creating long-lived bearer credentials; five minutes
/// leaves room for a slow page load and an immediate reconnect. The browser can always ask the app
/// for a fresh one - it still holds the session cookie.
pub const MAX_GRANT_TTL_SECONDS: i64 = 300;

/// How far the SFU's clock may disagree with the signer's before valid grants start failing.
///
/// The app and the SFU are different processes and, deployed, different hosts. Without this a
/// grant minted "now" by a host whose clock is two seconds ahead is refused as not-yet-valid on
/// arrival, which is a maddening intermittent failure. Applied at both ends, so the effective
/// window is `[iat - leeway, exp + leeway)`.
pub const CLOCK_SKEW_LEEWAY_SECONDS: i64 = 30;

/// Room ids are map keys in [`crate::router_registry`], so they are length-bounded here rather than
/// left free for a signer bug to turn into unbounded memory.
pub const MAX_ROOM_ID_BYTES: usize = 128;

/// A whole grant is a few hundred bytes. The cap stops a peer forcing a large base64 allocation
/// before anything has been authenticated - checked before any decoding happens.
pub const MAX_GRANT_BYTES: usize = 4096;

/// Seconds since the Unix epoch.
///
/// A newtype rather than a bare `i64` because the unit is the trap: JavaScript's `Date.now()` is
/// milliseconds, and a grant signed with millisecond timestamps is not a rounding error, it is a
/// grant that expires in the year 51,000. Naming the unit in the type makes the conversion a
/// deliberate act on both sides of the wire.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct UnixTime(i64);

impl UnixTime {
    #[must_use]
    pub const fn from_secs(seconds: i64) -> Self {
        Self(seconds)
    }

    #[must_use]
    pub const fn as_secs(self) -> i64 {
        self.0
    }

    /// Reads the host clock.
    ///
    /// Deliberately *not* called anywhere inside verification: [`GrantVerifier::verify`] takes the
    /// time as an argument so that expiry is a pure function of its inputs and can be tested at an
    /// exact instant rather than by sleeping. Signalling code calls this once, at the point it
    /// handles a connect, and passes the result down.
    #[must_use]
    pub fn now() -> Self {
        match SystemTime::now().duration_since(UNIX_EPOCH) {
            Ok(elapsed) => Self(i64::try_from(elapsed.as_secs()).unwrap_or(i64::MAX)),
            // A host clock set before 1970. Clamping negative rather than to zero keeps the
            // comparison honest: every real grant then reads as not-yet-valid and admission fails
            // loudly, instead of a broken clock silently accepting expired grants.
            Err(before) => Self(-i64::try_from(before.duration().as_secs()).unwrap_or(i64::MAX)),
        }
    }
}

/// What a peer is allowed to do, normalised to the two cases the SFU acts on.
///
/// The app's own role vocabulary is *not* used on the wire. The live database holds
/// `guest` / `member` / `staff` while the code branches on `'user'` and `'admin'`, and
/// `users.role` defaults to `'staff'` - so the mapping from a `users` row to a media role is an
/// unsettled product question that belongs to the signer, which can see the row. The SFU receives
/// only the answer, and never has to guess which of five strings means "may broadcast".
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    /// May broadcast: microphone, webcam, screen share.
    Presenter,
    /// May receive only.
    Member,
}

impl Role {
    /// Whether this role may create producers.
    ///
    /// Presenter-only, matching the app: every broadcast control - recording, mic, screen share,
    /// webcam, session control - lives inside a single `{#if isPresenter}` block, and a reader's
    /// toolbar has Volume and Reload (`src/routes/+page.svelte:2864-3127`, `isPresenter` derived at
    /// `:313`). A member that asks to produce is a client bug or an attack, either way a refusal.
    #[must_use]
    pub const fn can_produce(self) -> bool {
        matches!(self, Role::Presenter)
    }
}

/// Who a grant says the peer is.
///
/// Two shapes because the wire has two live versions, not because identity is genuinely ambiguous.
/// Making that explicit in the type is the point: every consumer has to decide what it does with a
/// legacy id rather than silently coercing one into the other. When v1 is deleted this collapses to
/// a `Uuid` newtype and the compiler finds every site.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum MediaUserId {
    /// v1's `uid`: the retired SQLite autoincrement rowid. Not resolvable to a `users` row.
    Legacy(i64),
    /// v2's `sub`: `users.id`, the actual primary key.
    User(uuid::Uuid),
}

impl std::fmt::Display for MediaUserId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            // Tagged, so a log line can never be misread as the other kind of id.
            Self::Legacy(uid) => write!(f, "legacy:{uid}"),
            Self::User(id) => write!(f, "{id}"),
        }
    }
}

/// Always a **string** on the wire, for both variants.
///
/// The tempting alternative - a number for v1 and a string for v2 - would make `userId` change
/// JSON type depending on which version the *other* peer connected with, forcing every client to
/// handle both. One type, self-describing in both cases, is the smaller cost. `legacy:` is not
/// decoration: a v1 id does not identify a `users` row, and a client must not treat it as if it
/// did.
impl Serialize for MediaUserId {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.collect_str(self)
    }
}

/// The v1 claim set. Identity is `uid`, an integer.
///
/// Field order is the documented JSON key order, and the short names are the wire names - there is
/// no `#[serde(rename)]` anywhere, so what is written here is literally what crosses the wire.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ClaimsV1 {
    /// Wire version. Must equal [`GRANT_VERSION_V1`].
    pub v: u8,
    /// The room this peer may join, and only this room.
    pub room: String,
    /// The retired SQLite rowid.
    pub uid: i64,
    /// `users.display_name`.
    pub name: String,
    pub role: Role,
    /// Issued at, seconds since the Unix epoch.
    pub iat: i64,
    /// Expires at, seconds since the Unix epoch. Exclusive: at exactly `exp` the grant is spent.
    pub exp: i64,
}

/// The v2 claim set. Identity is `sub`, a uuid.
///
/// `sub` replaces `uid` rather than joining it: carrying both would mean a grant could disagree
/// with itself about who the peer is, and there would be no principled way to decide which claim
/// wins.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ClaimsV2 {
    /// Wire version. Must equal [`GRANT_VERSION_V2`].
    pub v: u8,
    /// The room this peer may join. `rooms.id`, hyphenated - 36 bytes, well inside
    /// [`MAX_ROOM_ID_BYTES`].
    pub room: String,
    /// `users.id`, hyphenated. The claim `uid` should always have been.
    pub sub: uuid::Uuid,
    /// `users.display_name`.
    pub name: String,
    pub role: Role,
    /// Issued at, seconds since the Unix epoch.
    pub iat: i64,
    /// Expires at, seconds since the Unix epoch. Exclusive: at exactly `exp` the grant is spent.
    pub exp: i64,
}

/// Reads only the version, so the right claim set can be chosen before the payload is parsed
/// against it.
///
/// Deliberately *not* `deny_unknown_fields`: its whole job is to look at one key of a payload whose
/// other keys it does not yet know how to interpret. The version-specific struct that follows is
/// strict, so nothing is actually admitted loosely.
#[derive(Deserialize)]
struct VersionProbe {
    v: u8,
}

/// The verified claims of an admission grant, normalised across wire versions.
///
/// Not `Serialize`: this is the *result* of verification, not a wire type. Only [`ClaimsV1`] and
/// [`ClaimsV2`] cross the wire, which keeps "what we accept" and "what we produce" from drifting
/// into one another.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Grant {
    /// The version this grant arrived as. Kept so a deployment can watch v1 traffic fall to zero
    /// before deleting it, rather than guessing when that happened.
    pub v: u8,
    /// The room this peer may join, and only this room.
    pub room: String,
    /// Who the peer is, in whichever form its version expressed.
    pub user: MediaUserId,
    /// `users.display_name`.
    pub name: String,
    pub role: Role,
    /// Issued at, seconds since the Unix epoch.
    pub iat: i64,
    /// Expires at, seconds since the Unix epoch. Exclusive: at exactly `exp` the grant is spent.
    pub exp: i64,
}

impl From<ClaimsV1> for Grant {
    fn from(claims: ClaimsV1) -> Self {
        Self {
            v: claims.v,
            room: claims.room,
            user: MediaUserId::Legacy(claims.uid),
            name: claims.name,
            role: claims.role,
            iat: claims.iat,
            exp: claims.exp,
        }
    }
}

impl From<ClaimsV2> for Grant {
    fn from(claims: ClaimsV2) -> Self {
        Self {
            v: claims.v,
            room: claims.room,
            user: MediaUserId::User(claims.sub),
            name: claims.name,
            role: claims.role,
            iat: claims.iat,
            exp: claims.exp,
        }
    }
}

impl Grant {
    /// Everything checkable about a grant once its signature is known to be genuine.
    ///
    /// Split out from signature checking so the two concerns stay legible: a failure here means the
    /// app signed something it should not have (or the grant is simply old), never that someone
    /// forged one.
    fn validate(&self, now: UnixTime) -> Result<(), GrantError> {
        if !SUPPORTED_GRANT_VERSIONS.contains(&self.v) {
            return Err(GrantError::UnsupportedVersion { version: self.v });
        }
        if self.room.is_empty() || self.room.len() > MAX_ROOM_ID_BYTES {
            return Err(GrantError::InvalidRoomId {
                bytes: self.room.len(),
            });
        }
        match self.user {
            // v1's ids are SQLite autoincrement rowids, which start at 1.
            MediaUserId::Legacy(uid) if uid <= 0 => {
                return Err(GrantError::InvalidUserId { uid });
            }
            // The nil uuid is what an uninitialised variable serialises to, so it is far more
            // likely to be a signer bug than a real `users.id`. Refuse it rather than admit a
            // peer as all-zeroes.
            MediaUserId::User(id) if id.is_nil() => {
                return Err(GrantError::NilSubject);
            }
            _ => {}
        }

        // Saturating rather than checked: a claim pair engineered to overflow (`iat` at `i64::MIN`,
        // `exp` at `i64::MAX`) must land in a refusal, not a panic in a debug build.
        let ttl = self.exp.saturating_sub(self.iat);
        if ttl <= 0 {
            return Err(GrantError::ExpiryBeforeIssue {
                issued_at: self.iat,
                expires_at: self.exp,
            });
        }
        if ttl > MAX_GRANT_TTL_SECONDS {
            return Err(GrantError::TtlTooLong { ttl });
        }

        let now = now.as_secs();
        if now < self.iat.saturating_sub(CLOCK_SKEW_LEEWAY_SECONDS) {
            return Err(GrantError::NotYetValid {
                issued_at: self.iat,
                now,
            });
        }
        if now >= self.exp.saturating_add(CLOCK_SKEW_LEEWAY_SECONDS) {
            return Err(GrantError::Expired {
                expires_at: self.exp,
                now,
            });
        }

        Ok(())
    }
}

/// Whether this SFU may serve peers that present no grant at all.
///
/// An explicit argument to [`GrantVerifier::new`] rather than a bool or an inference from the
/// config, so that turning admission off is a thing someone has to write down.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Admission {
    /// Every peer must present a grant that verifies. The only setting for a deployment.
    RequireGrant,
    /// Peers that present no grant are admitted with no verified identity. Development only.
    AllowAnonymous,
}

/// Who a peer turned out to be.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Admitted {
    /// A grant that verified. Its claims are trustworthy.
    Verified(Grant),
    /// No grant was presented, and this SFU is in anonymous development mode. The peer has **no**
    /// verified identity, room or role - a caller must not treat it as a presenter, and must take
    /// the room it joins from the peer's own request in full knowledge that nothing vouches for it.
    Anonymous,
}

/// Refusing to build a verifier at all. Every variant is a reason to exit rather than to serve.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum GrantConfigError {
    #[error(
        "MEDIA_GRANT_PUBLIC_KEY must be set: without it no peer's identity can be checked, and this SFU will not start with admission silently disabled"
    )]
    MissingPublicKey,
    #[error(
        "MEDIA_GRANT_PUBLIC_KEY is set, so anonymous admission cannot also be enabled: refusing to start rather than serve a configured deployment with its grant checks turned off"
    )]
    ContradictoryAdmission,
    #[error("MEDIA_GRANT_PUBLIC_KEY is not standard base64 (padded): {message}")]
    PublicKeyNotBase64 { message: String },
    #[error(
        "MEDIA_GRANT_PUBLIC_KEY decodes to {bytes} bytes; an Ed25519 public key is {PUBLIC_KEY_LENGTH}. It must be the raw key bytes, not DER, PEM or a JWK"
    )]
    PublicKeyWrongLength { bytes: usize },
    #[error("MEDIA_GRANT_PUBLIC_KEY is not a point on the Ed25519 curve: {message}")]
    PublicKeyInvalid { message: String },
}

/// Refusing one peer.
///
/// These are for the SFU's own logs. Signalling code should map the lot to one opaque refusal on the
/// wire: telling a caller *which* check failed turns the endpoint into an oracle for probing grants,
/// and none of the detail is actionable by a legitimate client, whose only correct response to any
/// of them is to fetch a fresh grant from the app.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum GrantError {
    #[error("no admission grant was presented")]
    Missing,
    #[error("this SFU has no grant public key, so a presented grant cannot be verified")]
    NoVerifyingKey,
    #[error("the grant is {bytes} bytes, over the {MAX_GRANT_BYTES} byte limit")]
    TooLong { bytes: usize },
    #[error("the grant is not two non-empty dot-separated segments")]
    Malformed,
    #[error("the grant's {segment} segment is not base64url without padding: {message}")]
    NotBase64 {
        segment: &'static str,
        message: String,
    },
    #[error("the grant's signature is {bytes} bytes; an Ed25519 signature is {SIGNATURE_LENGTH}")]
    SignatureWrongLength { bytes: usize },
    #[error("the grant's signature does not verify against this SFU's public key")]
    BadSignature,
    #[error("the grant's payload is not the expected JSON: {message}")]
    BadPayload { message: String },
    #[error("the grant declares version {version}; this SFU speaks {SUPPORTED_GRANT_VERSIONS:?}")]
    UnsupportedVersion { version: u8 },
    #[error("the grant's room id is {bytes} bytes; it must be 1 to {MAX_ROOM_ID_BYTES}")]
    InvalidRoomId { bytes: usize },
    #[error("the grant's user id {uid} is not a positive integer")]
    InvalidUserId { uid: i64 },
    #[error("the grant's `sub` claim is the nil uuid, which is not a real users.id")]
    NilSubject,
    #[error("the grant expires at {expires_at}, at or before it was issued at {issued_at}")]
    ExpiryBeforeIssue { issued_at: i64, expires_at: i64 },
    #[error("the grant's lifetime of {ttl}s exceeds the {MAX_GRANT_TTL_SECONDS}s maximum")]
    TtlTooLong { ttl: i64 },
    #[error("the grant was issued at {issued_at}, which is still in the future at {now}")]
    NotYetValid { issued_at: i64, now: i64 },
    #[error("the grant expired at {expires_at}; it is now {now}")]
    Expired { expires_at: i64, now: i64 },
}

/// Boxed because `VerifyingKey` carries a decompressed `EdwardsPoint` alongside its 32 compressed
/// bytes (192 bytes in all) and the other variant carries nothing, so the unboxed enum would size
/// every `GrantVerifier` for the larger arm. It is built once per process, so the indirection costs
/// nothing that matters and keeps the type small enough to embed in shared state without thought.
enum Mode {
    Enforcing(Box<VerifyingKey>),
    AnonymousDevelopment,
}

/// Checks admission grants against one Ed25519 public key.
///
/// Cheap to share (`&self` throughout, no interior mutability, no I/O), so signalling code can hold
/// one for the life of the process.
pub struct GrantVerifier {
    mode: Mode,
}

impl GrantVerifier {
    /// Builds a verifier, or refuses to build one at all.
    ///
    /// See the module docs for the four `(key, admission)` combinations and why two of them are
    /// startup failures.
    pub fn new(
        public_key_base64: Option<&str>,
        admission: Admission,
    ) -> Result<Self, GrantConfigError> {
        match (public_key_base64, admission) {
            (Some(encoded), Admission::RequireGrant) => {
                let key = parse_public_key(encoded)?;
                tracing::info!(
                    public_key = %STANDARD.encode(key.as_bytes()),
                    "admission grants are required; verifying against this public key"
                );
                Ok(Self {
                    mode: Mode::Enforcing(Box::new(key)),
                })
            }
            (Some(_), Admission::AllowAnonymous) => Err(GrantConfigError::ContradictoryAdmission),
            (None, Admission::RequireGrant) => Err(GrantConfigError::MissingPublicKey),
            (None, Admission::AllowAnonymous) => {
                tracing::warn!(
                    "MEDIA_GRANT_PUBLIC_KEY is not set and anonymous admission was requested: \
                     ANY peer may join ANY room with no verified identity. Development only."
                );
                Ok(Self {
                    mode: Mode::AnonymousDevelopment,
                })
            }
        }
    }

    /// [`GrantVerifier::new`] reading the key from [`Config::grant_public_key`].
    pub fn from_config(config: &Config, admission: Admission) -> Result<Self, GrantConfigError> {
        Self::new(config.grant_public_key.as_deref(), admission)
    }

    /// Whether a peer must present a grant to be admitted.
    #[must_use]
    pub fn requires_grant(&self) -> bool {
        matches!(self.mode, Mode::Enforcing(_))
    }

    /// The configured public key, standard base64. `None` in anonymous development mode.
    #[must_use]
    pub fn public_key_base64(&self) -> Option<String> {
        match &self.mode {
            Mode::Enforcing(key) => Some(STANDARD.encode(key.as_bytes())),
            Mode::AnonymousDevelopment => None,
        }
    }

    /// Decides who a peer is from whatever it presented.
    ///
    /// `now` is supplied by the caller rather than read here - see [`UnixTime::now`].
    pub fn admit(&self, grant: Option<&str>, now: UnixTime) -> Result<Admitted, GrantError> {
        match (&self.mode, grant) {
            (Mode::Enforcing(_), Some(token)) => self.verify(token, now).map(Admitted::Verified),
            (Mode::Enforcing(_), None) => Err(GrantError::Missing),
            (Mode::AnonymousDevelopment, None) => Ok(Admitted::Anonymous),
            // A peer holding a grant is asserting an identity and a role. With no key we cannot
            // check either, and admitting it as an anonymous member would be inventing an answer.
            (Mode::AnonymousDevelopment, Some(_)) => Err(GrantError::NoVerifyingKey),
        }
    }

    /// Verifies one presented grant.
    ///
    /// The signature is checked **before** the payload is decoded or parsed, so no unauthenticated
    /// bytes ever reach serde_json. Refuses unconditionally in anonymous development mode, where
    /// there is no key to check against.
    pub fn verify(&self, grant: &str, now: UnixTime) -> Result<Grant, GrantError> {
        let key = match &self.mode {
            Mode::Enforcing(key) => key,
            Mode::AnonymousDevelopment => return Err(GrantError::NoVerifyingKey),
        };

        if grant.len() > MAX_GRANT_BYTES {
            return Err(GrantError::TooLong { bytes: grant.len() });
        }

        let (payload_segment, signature_segment) =
            grant.split_once('.').ok_or(GrantError::Malformed)?;
        if payload_segment.is_empty()
            || signature_segment.is_empty()
            // `split_once` splits at the FIRST dot, so a third segment would otherwise ride along
            // inside the signature segment and be silently rejected as bad base64 instead.
            || signature_segment.contains('.')
        {
            return Err(GrantError::Malformed);
        }

        let signature_bytes: [u8; SIGNATURE_LENGTH] = URL_SAFE_NO_PAD
            .decode(signature_segment)
            .map_err(|error| GrantError::NotBase64 {
                segment: "signature",
                message: error.to_string(),
            })?
            .try_into()
            .map_err(|bytes: Vec<u8>| GrantError::SignatureWrongLength { bytes: bytes.len() })?;

        // The signed message is the payload segment's own ASCII, which is why neither side ever has
        // to agree on a canonical JSON encoding.
        key.verify_strict(
            payload_segment.as_bytes(),
            &Signature::from_bytes(&signature_bytes),
        )
        // The dalek error distinguishes "malleable scalar" from "wrong signature"; collapsing
        // them is deliberate, since to a caller they mean the same thing - present a real grant.
        .map_err(|_| GrantError::BadSignature)?;

        // Authenticated from here down: these bytes were signed by the holder of the private key.
        let payload =
            URL_SAFE_NO_PAD
                .decode(payload_segment)
                .map_err(|error| GrantError::NotBase64 {
                    segment: "payload",
                    message: error.to_string(),
                })?;
        // Two passes over a few hundred authenticated bytes: which version, then that version's
        // claim set. The alternative - one permissive struct with both `uid` and `sub` optional -
        // would accept a grant carrying neither, or both, and leave the contradiction to be
        // resolved somewhere further down.
        let probe: VersionProbe =
            serde_json::from_slice(&payload).map_err(|error| GrantError::BadPayload {
                message: error.to_string(),
            })?;

        let bad_payload = |error: serde_json::Error| GrantError::BadPayload {
            message: error.to_string(),
        };

        let grant: Grant = match probe.v {
            GRANT_VERSION_V1 => serde_json::from_slice::<ClaimsV1>(&payload)
                .map_err(bad_payload)?
                .into(),
            GRANT_VERSION_V2 => serde_json::from_slice::<ClaimsV2>(&payload)
                .map_err(bad_payload)?
                .into(),
            version => return Err(GrantError::UnsupportedVersion { version }),
        };

        grant.validate(now)?;
        Ok(grant)
    }
}

impl std::fmt::Debug for GrantVerifier {
    /// Names the mode and the (public) key, so a `Debug` of the service's state answers "is
    /// admission actually on, and against which key" without a second look.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self.mode {
            Mode::Enforcing(key) => f
                .debug_struct("GrantVerifier")
                .field("admission", &"require-grant")
                .field("public_key", &STANDARD.encode(key.as_bytes()))
                .finish(),
            Mode::AnonymousDevelopment => f
                .debug_struct("GrantVerifier")
                .field("admission", &"allow-anonymous")
                .finish(),
        }
    }
}

fn parse_public_key(encoded: &str) -> Result<VerifyingKey, GrantConfigError> {
    let bytes =
        STANDARD
            .decode(encoded.trim())
            .map_err(|error| GrantConfigError::PublicKeyNotBase64 {
                message: error.to_string(),
            })?;
    let bytes: [u8; PUBLIC_KEY_LENGTH] = bytes
        .try_into()
        .map_err(|bytes: Vec<u8>| GrantConfigError::PublicKeyWrongLength { bytes: bytes.len() })?;
    VerifyingKey::from_bytes(&bytes).map_err(|error| GrantConfigError::PublicKeyInvalid {
        message: error.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::engine::general_purpose::URL_SAFE_NO_PAD as B64;
    use ed25519_dalek::{Signer, SigningKey};

    /// A fixed test key. Ed25519 signing is deterministic (RFC 8032 derives the nonce from the key
    /// and the message), so a fixed key plus fixed claims gives a fixed token. The golden tests pin
    /// the human-readable synthetic payload and the signature independently, then assemble and
    /// verify the complete token at runtime. Not generated from an RNG for exactly that reason.
    fn signing_key() -> SigningKey {
        SigningKey::from_bytes(&[
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
            24, 25, 26, 27, 28, 29, 30, 31,
        ])
    }

    /// A second, unrelated keypair, for the "signed by someone else" case.
    fn other_signing_key() -> SigningKey {
        SigningKey::from_bytes(&[9u8; 32])
    }

    fn public_key_base64(key: &SigningKey) -> String {
        STANDARD.encode(key.verifying_key().as_bytes())
    }

    fn verifier(key: &SigningKey) -> GrantVerifier {
        GrantVerifier::new(Some(&public_key_base64(key)), Admission::RequireGrant)
            .expect("a well-formed key builds an enforcing verifier")
    }

    /// The signer, in Rust, doing exactly what the documented TypeScript does: base64url the payload
    /// bytes, sign that segment's ASCII, base64url the signature, join with a dot.
    fn sign_payload(key: &SigningKey, payload_json: &[u8]) -> String {
        sign_segment(key, &B64.encode(payload_json))
    }

    /// Signs a payload *segment* verbatim, without encoding it. Lets a test present a genuinely
    /// signed grant whose payload segment is not valid base64 at all.
    fn sign_segment(key: &SigningKey, payload_segment: &str) -> String {
        let signature = key.sign(payload_segment.as_bytes());
        format!(
            "{payload_segment}.{}",
            B64.encode(signature.to_bytes().as_slice())
        )
    }

    const NOW: i64 = 1_753_920_000;

    fn now() -> UnixTime {
        UnixTime::from_secs(NOW)
    }

    /// A version this build does not speak, for the unsupported-version tests. Deliberately not
    /// `GRANT_VERSION_V2 + 1`: when v3 is added, this constant should start failing and be
    /// consciously moved, rather than silently continuing to test the wrong thing.
    const UNSUPPORTED_VERSION: u8 = 99;

    /// `users.id` for the v2 fixtures. A fixed uuid, for the same reason the key is fixed: the v2
    /// golden vector has to be a literal a TypeScript signer can be asserted against.
    const SUB: uuid::Uuid = uuid::uuid!("00000000-0000-4000-8000-000000004242");

    fn grant() -> ClaimsV1 {
        ClaimsV1 {
            v: GRANT_VERSION_V1,
            room: "trading-floor".into(),
            uid: 4242,
            name: "Test Presenter".into(),
            role: Role::Presenter,
            iat: NOW,
            exp: NOW + 60,
        }
    }

    /// What [`grant`] becomes once verified.
    fn verified_v1() -> Grant {
        grant().into()
    }

    fn grant_v2() -> ClaimsV2 {
        ClaimsV2 {
            v: GRANT_VERSION_V2,
            room: "trading-floor".into(),
            sub: SUB,
            name: "Test Presenter".into(),
            role: Role::Presenter,
            iat: NOW,
            exp: NOW + 60,
        }
    }

    /// Signs a `Grant` through serde. Only the tests do this - the verifier never re-serialises a
    /// grant, which is the whole reason JSON canonicalisation is a non-issue on this wire.
    fn sign<C: Serialize>(key: &SigningKey, grant: &C) -> String {
        sign_payload(
            key,
            serde_json::to_string(grant)
                .expect("a grant serialises")
                .as_bytes(),
        )
    }

    // ---------------------------------------------------------------- the happy path

    #[test]
    fn a_signed_grant_verifies_and_carries_every_claim() {
        let key = signing_key();
        let token = sign(&key, &grant());

        let verified = verifier(&key).verify(&token, now()).expect("it verifies");

        assert_eq!(verified, verified_v1());
        assert_eq!(verified.room, "trading-floor");
        assert_eq!(verified.user, MediaUserId::Legacy(4242));
        assert_eq!(verified.name, "Test Presenter");
        assert_eq!(verified.role, Role::Presenter);
        assert!(verified.role.can_produce());
    }

    #[test]
    fn a_member_may_not_produce_but_a_presenter_may() {
        assert!(!Role::Member.can_produce());
        assert!(Role::Presenter.can_produce());
    }

    /// The contract the TypeScript signer has to match byte for byte. The readable payload and the
    /// deterministic signature are pinned separately so committed source contains no reversible
    /// encoded identity blob. A claim-set, field-order, alphabet or signed-message change still
    /// changes the signature and fails this test. Regenerating it is a deliberate wire change.
    ///
    /// The same three values in Node:
    ///
    /// ```js
    /// const claims = {v:1,room:"trading-floor",uid:4242,name:"Test Presenter",role:"presenter",iat:1753920000,exp:1753920060};
    /// const payload = Buffer.from(JSON.stringify(claims),'utf8').toString('base64url');
    /// const signature = sign(null, Buffer.from(payload,'ascii'), key).toString('base64url');
    /// ```
    #[test]
    fn the_wire_format_is_pinned_byte_for_byte() {
        const PAYLOAD_JSON: &str = r#"{"v":1,"room":"trading-floor","uid":4242,"name":"Test Presenter","role":"presenter","iat":1753920000,"exp":1753920060}"#;
        const SIGNATURE_BASE64URL: &str =
            "ioJB3u4-V2R6bRdtghm1biTeBFrXKSWIA3mmGXXUjrqV_I0lhwahKdOBWLhq9xdcMCgF8A_GrxzPkcIFyLzjCw";
        const PUBLIC_KEY: &str = "A6EHv/POEL4dcN0Y50vAmWfk1jCbpQ1fHdyGZBJVMbg=";

        let key = signing_key();
        assert_eq!(
            public_key_base64(&key),
            PUBLIC_KEY,
            "MEDIA_GRANT_PUBLIC_KEY is the raw 32 key bytes in padded standard base64"
        );
        // The Rust field order IS the documented JSON key order; if they drift, the docs lie.
        assert_eq!(
            serde_json::to_string(&grant()).expect("a grant serialises"),
            PAYLOAD_JSON
        );
        let token = sign_payload(&key, PAYLOAD_JSON.as_bytes());
        let (payload_segment, signature_segment) = token.split_once('.').expect("two segments");
        assert_eq!(payload_segment, B64.encode(PAYLOAD_JSON));
        assert_eq!(signature_segment, SIGNATURE_BASE64URL);

        // And the runtime-assembled golden token is a grant this build actually accepts.
        assert_eq!(
            verifier(&key).verify(&token, now()).expect("it verifies"),
            verified_v1()
        );
    }

    // ---------------------------------------------------------------- wire version 2

    /// v2's own golden vector. Each version gets one: a single shared vector would mean the wire
    /// was only ever pinned for whichever version happened to be current.
    ///
    /// ```js
    /// const claims = {v:2,room:"trading-floor",sub:"00000000-0000-4000-8000-000000004242",name:"Test Presenter",role:"presenter",iat:1753920000,exp:1753920060};
    /// const payload = Buffer.from(JSON.stringify(claims),'utf8').toString('base64url');
    /// const signature = sign(null, Buffer.from(payload,'ascii'), key).toString('base64url');
    /// ```
    #[test]
    fn the_v2_wire_format_is_pinned_byte_for_byte() {
        const PAYLOAD_JSON: &str = r#"{"v":2,"room":"trading-floor","sub":"00000000-0000-4000-8000-000000004242","name":"Test Presenter","role":"presenter","iat":1753920000,"exp":1753920060}"#;
        const SIGNATURE_BASE64URL: &str =
            "N1APHAVv9saqU-4fzBzhoTqBTj8vkaU0S4d2rZdAb1mjN9J7yo5MWbrOSXi9hJrHm2fqd-J6fQu0kfALPMxBDg";

        let key = signing_key();
        // The uuid is hyphenated lowercase on the wire - serde_json's `Uuid` is `Display`, which
        // is the same thing Node's `crypto.randomUUID()` and Postgres's `uuid` text form emit.
        assert_eq!(
            serde_json::to_string(&grant_v2()).expect("a grant serialises"),
            PAYLOAD_JSON
        );
        let token = sign_payload(&key, PAYLOAD_JSON.as_bytes());
        let (payload_segment, signature_segment) = token.split_once('.').expect("two segments");
        assert_eq!(payload_segment, B64.encode(PAYLOAD_JSON));
        assert_eq!(signature_segment, SIGNATURE_BASE64URL);

        let verified = verifier(&key).verify(&token, now()).expect("it verifies");
        assert_eq!(verified, Grant::from(grant_v2()));
        assert_eq!(verified.user, MediaUserId::User(SUB));
        assert_eq!(verified.v, GRANT_VERSION_V2);
    }

    #[test]
    fn both_wire_versions_are_accepted_during_the_transition() {
        let key = signing_key();
        let verifier = verifier(&key);

        // The whole point of the transition: one SFU build, two signer generations.
        let v1 = verifier
            .verify(&sign(&key, &grant()), now())
            .expect("v1 still verifies");
        let v2 = verifier
            .verify(&sign(&key, &grant_v2()), now())
            .expect("v2 verifies");

        assert_eq!(v1.user, MediaUserId::Legacy(4242));
        assert_eq!(v2.user, MediaUserId::User(SUB));
        // Everything except identity is identical across versions, so nothing else silently
        // changed meaning under cover of the bump.
        assert_eq!(v1.room, v2.room);
        assert_eq!(v1.name, v2.name);
        assert_eq!(v1.role, v2.role);
        assert_eq!((v1.iat, v1.exp), (v2.iat, v2.exp));
    }

    /// The version field selects the claim set, so a payload cannot wear the wrong version's
    /// clothes. Both directions, because only testing one would leave the other free to be parsed
    /// leniently.
    #[test]
    fn a_payload_may_not_use_the_other_version_s_claim_set() {
        let key = signing_key();
        let verifier = verifier(&key);

        // v1 claims labelled v2: `uid` is unknown to ClaimsV2 and `sub` is missing.
        let v1_body_v2_label = ClaimsV1 {
            v: GRANT_VERSION_V2,
            ..grant()
        };
        let error = verifier
            .verify(&sign(&key, &v1_body_v2_label), now())
            .expect_err("a v1 body labelled v2 must be refused");
        assert!(
            matches!(&error, GrantError::BadPayload { message } if message.contains("uid")),
            "the log must name the offending claim: {error}"
        );

        // v2 claims labelled v1: `sub` is unknown to ClaimsV1 and `uid` is missing.
        let v2_body_v1_label = ClaimsV2 {
            v: GRANT_VERSION_V1,
            ..grant_v2()
        };
        let error = verifier
            .verify(&sign(&key, &v2_body_v1_label), now())
            .expect_err("a v2 body labelled v1 must be refused");
        assert!(
            matches!(&error, GrantError::BadPayload { message } if message.contains("sub")),
            "the log must name the offending claim: {error}"
        );
    }

    /// The nil uuid is what an uninitialised or defaulted variable serialises to. Admitting a peer
    /// as all-zeroes would be inventing an identity.
    #[test]
    fn a_nil_subject_is_refused() {
        let key = signing_key();
        let nil = ClaimsV2 {
            sub: uuid::Uuid::nil(),
            ..grant_v2()
        };
        assert_eq!(
            verifier(&key).verify(&sign(&key, &nil), now()),
            Err(GrantError::NilSubject)
        );
    }

    /// Every check that guards v1 has to guard v2 as well. A new version is exactly where a
    /// forgotten bound gets reintroduced.
    #[test]
    fn v2_is_bound_by_the_same_rules_as_v1() {
        let key = signing_key();
        let verifier = verifier(&key);

        let too_long = ClaimsV2 {
            exp: NOW + MAX_GRANT_TTL_SECONDS + 1,
            ..grant_v2()
        };
        assert_eq!(
            verifier.verify(&sign(&key, &too_long), now()),
            Err(GrantError::TtlTooLong {
                ttl: MAX_GRANT_TTL_SECONDS + 1
            })
        );

        let expired = ClaimsV2 { ..grant_v2() };
        assert!(matches!(
            verifier.verify(
                &sign(&key, &expired),
                UnixTime::from_secs(NOW + 60 + CLOCK_SKEW_LEEWAY_SECONDS)
            ),
            Err(GrantError::Expired { .. })
        ));

        let bad_room = ClaimsV2 {
            room: "r".repeat(MAX_ROOM_ID_BYTES + 1),
            ..grant_v2()
        };
        assert_eq!(
            verifier.verify(&sign(&key, &bad_room), now()),
            Err(GrantError::InvalidRoomId {
                bytes: MAX_ROOM_ID_BYTES + 1
            })
        );

        // And a forged v2 grant is still a forgery.
        let theirs = other_signing_key();
        assert_eq!(
            verifier.verify(&sign(&theirs, &grant_v2()), now()),
            Err(GrantError::BadSignature)
        );
    }

    /// A `users.id` uuid is 36 bytes hyphenated, and `rooms.id` is too - both well inside the room
    /// id cap, which is the sizing assumption v2 depends on.
    #[test]
    fn a_hyphenated_uuid_room_id_fits_the_wire() {
        let key = signing_key();
        let room = uuid::Uuid::nil().to_string();
        assert_eq!(room.len(), 36);
        assert!(room.len() <= MAX_ROOM_ID_BYTES);

        let grant = ClaimsV2 {
            room: room.clone(),
            ..grant_v2()
        };
        let verified = verifier(&key)
            .verify(&sign(&key, &grant), now())
            .expect("a uuid room id verifies");
        assert_eq!(verified.room, room);
    }

    /// `userId` must be one JSON type regardless of which version the peer arrived on, or every
    /// client has to handle both.
    #[test]
    fn a_media_user_id_is_always_a_string_on_the_wire() {
        assert_eq!(
            serde_json::to_string(&MediaUserId::User(SUB)).expect("serialises"),
            format!("\"{SUB}\"")
        );
        assert_eq!(
            serde_json::to_string(&MediaUserId::Legacy(4242)).expect("serialises"),
            "\"legacy:4242\"",
            "a v1 id does not identify a users row and must not be mistakable for one"
        );
    }

    // ---------------------------------------------------------------- forgery

    /// A real signature over a real payload, with one payload byte changed afterwards. This is the
    /// case that matters: an attacker editing `"role":"member"` into `"role":"presenter"`.
    #[test]
    fn a_tampered_payload_is_refused() {
        let key = signing_key();
        let member = ClaimsV1 {
            role: Role::Member,
            ..grant()
        };
        let token = sign(&key, &member);

        let (payload_segment, signature_segment) = token.split_once('.').expect("two segments");
        let mut claims: serde_json::Value =
            serde_json::from_slice(&B64.decode(payload_segment).expect("payload decodes"))
                .expect("payload parses");
        claims["role"] = serde_json::json!("presenter");
        let forged = format!(
            "{}.{signature_segment}",
            B64.encode(serde_json::to_vec(&claims).expect("claims serialise"))
        );

        assert_eq!(
            verifier(&key).verify(&forged, now()),
            Err(GrantError::BadSignature)
        );
        // The unedited grant still verifies, so the refusal above is about the edit and nothing else.
        assert_eq!(
            verifier(&key)
                .verify(&token, now())
                .expect("the original verifies")
                .role,
            Role::Member
        );
    }

    /// A structurally perfect signature that is simply not the right one.
    #[test]
    fn a_corrupted_signature_is_refused() {
        let key = signing_key();
        let token = sign(&key, &grant());
        let (payload_segment, signature_segment) = token.split_once('.').expect("two segments");

        let mut signature = B64.decode(signature_segment).expect("signature decodes");
        assert_eq!(signature.len(), SIGNATURE_LENGTH);
        // Flip a bit in `s`, the scalar half, so the length and the `R` half stay valid.
        signature[SIGNATURE_LENGTH - 2] ^= 0b0000_0001;

        let forged = format!("{payload_segment}.{}", B64.encode(&signature));
        assert_eq!(
            verifier(&key).verify(&forged, now()),
            Err(GrantError::BadSignature)
        );
    }

    /// A grant minted by a different, real keypair - the "wrong key" case, and the one a
    /// misconfigured `MEDIA_GRANT_PUBLIC_KEY` produces for every single peer.
    #[test]
    fn a_grant_signed_by_another_key_is_refused() {
        let ours = signing_key();
        let theirs = other_signing_key();
        assert_ne!(public_key_base64(&ours), public_key_base64(&theirs));

        let token = sign(&theirs, &grant());

        assert_eq!(
            verifier(&ours).verify(&token, now()),
            Err(GrantError::BadSignature)
        );
        // The very same token verifies against its own key, so the refusal is the key, not the token.
        assert_eq!(
            verifier(&theirs)
                .verify(&token, now())
                .expect("it verifies under its own key"),
            verified_v1()
        );
    }

    #[test]
    fn a_signature_of_the_wrong_length_is_refused() {
        let key = signing_key();
        let token = sign(&key, &grant());
        let payload_segment = token.split_once('.').expect("two segments").0;

        let short = format!("{payload_segment}.{}", B64.encode([0u8; 32]));
        assert_eq!(
            verifier(&key).verify(&short, now()),
            Err(GrantError::SignatureWrongLength { bytes: 32 })
        );
    }

    // ---------------------------------------------------------------- time

    /// Expiry is a pure function of the caller's timestamp: one token, two clocks, two answers. This
    /// is what "no `SystemTime::now()` on the verify path" buys - a deterministic test with no sleep.
    #[test]
    fn an_expired_grant_is_refused() {
        let key = signing_key();
        let token = sign(&key, &grant());
        let verifier = verifier(&key);

        assert!(verifier.verify(&token, now()).is_ok());

        // Past `exp` and past the skew leeway on top of it.
        let late = UnixTime::from_secs(NOW + 60 + CLOCK_SKEW_LEEWAY_SECONDS);
        assert_eq!(
            verifier.verify(&token, late),
            Err(GrantError::Expired {
                expires_at: NOW + 60,
                now: late.as_secs()
            })
        );
        // Long past, for good measure.
        assert!(matches!(
            verifier.verify(&token, UnixTime::from_secs(NOW + 86_400)),
            Err(GrantError::Expired { .. })
        ));
    }

    #[test]
    fn a_grant_from_the_future_is_refused() {
        let key = signing_key();
        let future = ClaimsV1 {
            iat: NOW + 600,
            exp: NOW + 660,
            ..grant()
        };
        let token = sign(&key, &future);

        assert_eq!(
            verifier(&key).verify(&token, now()),
            Err(GrantError::NotYetValid {
                issued_at: NOW + 600,
                now: NOW
            })
        );
        // And it becomes valid once its own time arrives, so the refusal was about the clock.
        assert!(verifier(&key)
            .verify(&token, UnixTime::from_secs(NOW + 600))
            .is_ok());
    }

    /// Clock skew between the app host and the media host must not refuse honest grants, at either
    /// end of the window. Without this the failure is intermittent and looks like a network fault.
    #[test]
    fn clock_skew_inside_the_leeway_is_tolerated_at_both_ends() {
        let key = signing_key();
        let token = sign(&key, &grant());
        let verifier = verifier(&key);

        let barely_early = UnixTime::from_secs(NOW - CLOCK_SKEW_LEEWAY_SECONDS);
        let barely_late = UnixTime::from_secs(NOW + 60 + CLOCK_SKEW_LEEWAY_SECONDS - 1);
        assert!(verifier.verify(&token, barely_early).is_ok());
        assert!(verifier.verify(&token, barely_late).is_ok());

        // One second outside each end, refused.
        assert!(matches!(
            verifier.verify(
                &token,
                UnixTime::from_secs(NOW - CLOCK_SKEW_LEEWAY_SECONDS - 1)
            ),
            Err(GrantError::NotYetValid { .. })
        ));
        assert!(matches!(
            verifier.verify(
                &token,
                UnixTime::from_secs(NOW + 60 + CLOCK_SKEW_LEEWAY_SECONDS)
            ),
            Err(GrantError::Expired { .. })
        ));
    }

    /// The cap that stops a signer bug minting month-long bearer credentials.
    #[test]
    fn a_lifetime_over_the_maximum_is_refused() {
        let key = signing_key();
        let long = ClaimsV1 {
            exp: NOW + MAX_GRANT_TTL_SECONDS + 1,
            ..grant()
        };

        assert_eq!(
            verifier(&key).verify(&sign(&key, &long), now()),
            Err(GrantError::TtlTooLong {
                ttl: MAX_GRANT_TTL_SECONDS + 1
            })
        );
        // Exactly at the cap is fine, so the boundary is where the docs say it is.
        let at_cap = ClaimsV1 {
            exp: NOW + MAX_GRANT_TTL_SECONDS,
            ..grant()
        };
        assert!(verifier(&key).verify(&sign(&key, &at_cap), now()).is_ok());
    }

    #[test]
    fn an_expiry_at_or_before_the_issue_time_is_refused() {
        let key = signing_key();
        for exp in [NOW, NOW - 1] {
            let backwards = ClaimsV1 { exp, ..grant() };
            assert_eq!(
                verifier(&key).verify(&sign(&key, &backwards), now()),
                Err(GrantError::ExpiryBeforeIssue {
                    issued_at: NOW,
                    expires_at: exp
                })
            );
        }
    }

    /// Claims engineered to overflow `exp - iat` must refuse, not panic (an `i64` subtraction here
    /// would abort a debug build, which is a remote crash on attacker-controlled input).
    #[test]
    fn timestamps_at_the_edges_of_i64_refuse_rather_than_overflow() {
        let key = signing_key();
        let extreme = ClaimsV1 {
            iat: i64::MIN,
            exp: i64::MAX,
            ..grant()
        };

        assert!(matches!(
            verifier(&key).verify(&sign(&key, &extreme), now()),
            Err(GrantError::TtlTooLong { .. })
        ));
    }

    // ---------------------------------------------------------------- malformed input

    /// Not base64 at all - and genuinely signed, so the refusal is the encoding rather than the
    /// signature. This is why the signature is checked over the *segment* and before decoding.
    #[test]
    fn a_payload_segment_that_is_not_base64_is_refused() {
        let key = signing_key();
        let token = sign_segment(&key, "not base64!!");

        assert!(matches!(
            verifier(&key).verify(&token, now()),
            Err(GrantError::NotBase64 {
                segment: "payload",
                ..
            })
        ));
    }

    /// Padded base64url is refused too: the format is `NO_PAD` and decoding requires it.
    #[test]
    fn a_padded_payload_segment_is_refused() {
        let key = signing_key();
        let padded = base64::engine::general_purpose::URL_SAFE.encode(b"{}");
        assert!(padded.ends_with('='), "the fixture must actually be padded");

        assert!(matches!(
            verifier(&key).verify(&sign_segment(&key, &padded), now()),
            Err(GrantError::NotBase64 {
                segment: "payload",
                ..
            })
        ));
    }

    #[test]
    fn a_signature_segment_that_is_not_base64_is_refused() {
        let key = signing_key();
        let token = sign(&key, &grant());
        let payload_segment = token.split_once('.').expect("two segments").0;

        assert!(matches!(
            verifier(&key).verify(&format!("{payload_segment}.not base64!!"), now()),
            Err(GrantError::NotBase64 {
                segment: "signature",
                ..
            })
        ));
    }

    /// The documented ordering, tested directly: a grant that is *both* unsigned and unparseable
    /// must be refused for the signature, because nothing unauthenticated should reach the base64
    /// decoder or serde_json at all. If the checks were reordered this would report `NotBase64`.
    #[test]
    fn the_signature_is_checked_before_anything_is_parsed() {
        let key = signing_key();
        let unsigned_and_unparseable =
            format!("not base64!!.{}", B64.encode([0u8; SIGNATURE_LENGTH]));

        assert_eq!(
            verifier(&key).verify(&unsigned_and_unparseable, now()),
            Err(GrantError::BadSignature)
        );
    }

    /// Valid base64, correctly signed, and not JSON.
    #[test]
    fn a_payload_that_is_not_json_is_refused() {
        let key = signing_key();
        let token = sign_payload(&key, b"this is not json");

        assert!(matches!(
            verifier(&key).verify(&token, now()),
            Err(GrantError::BadPayload { .. })
        ));
    }

    /// `deny_unknown_fields`: a signer that invents a claim finds out immediately instead of having
    /// it silently dropped and wondering why the SFU ignores it.
    #[test]
    fn a_payload_with_an_unknown_claim_is_refused() {
        let key = signing_key();
        let token = sign_payload(
            &key,
            br#"{"v":1,"room":"a","uid":1,"name":"A","role":"member","iat":1753920000,"exp":1753920060,"admin":true}"#,
        );

        let error = verifier(&key)
            .verify(&token, now())
            .expect_err("an unknown claim is refused");
        assert!(
            matches!(&error, GrantError::BadPayload { message } if message.contains("admin")),
            "the log must name the offending claim: {error}"
        );
    }

    #[test]
    fn a_payload_missing_a_claim_is_refused() {
        let key = signing_key();
        // No `name`.
        let token = sign_payload(
            &key,
            br#"{"v":1,"room":"a","uid":1,"role":"member","iat":1753920000,"exp":1753920060}"#,
        );

        let error = verifier(&key)
            .verify(&token, now())
            .expect_err("a missing claim is refused");
        assert!(
            matches!(&error, GrantError::BadPayload { message } if message.contains("name")),
            "the log must name the missing claim: {error}"
        );
    }

    /// The role vocabulary on the wire is exactly two strings. An app role that leaked through
    /// unmapped ("staff", "guest") must fail loudly rather than default to anything.
    #[test]
    fn an_unmapped_role_is_refused() {
        let key = signing_key();
        for role in ["staff", "guest", "admin", "Presenter", ""] {
            let payload = format!(
                r#"{{"v":1,"room":"a","uid":1,"name":"A","role":"{role}","iat":1753920000,"exp":1753920060}}"#
            );
            assert!(
                matches!(
                    verifier(&key).verify(&sign_payload(&key, payload.as_bytes()), now()),
                    Err(GrantError::BadPayload { .. })
                ),
                "role {role:?} must not be accepted"
            );
        }
    }

    #[test]
    fn an_unsupported_version_is_refused() {
        let key = signing_key();
        let future = ClaimsV1 {
            v: UNSUPPORTED_VERSION,
            ..grant()
        };

        assert_eq!(
            verifier(&key).verify(&sign(&key, &future), now()),
            Err(GrantError::UnsupportedVersion {
                version: UNSUPPORTED_VERSION
            })
        );
    }

    #[test]
    fn a_grant_that_is_not_two_segments_is_refused() {
        let key = signing_key();
        let token = sign(&key, &grant());
        let (payload_segment, signature_segment) = token.split_once('.').expect("two segments");

        for malformed in [
            String::new(),
            payload_segment.to_owned(),
            format!(".{signature_segment}"),
            format!("{payload_segment}."),
            format!("{payload_segment}.{signature_segment}.extra"),
            ".".to_owned(),
        ] {
            assert_eq!(
                verifier(&key).verify(&malformed, now()),
                Err(GrantError::Malformed),
                "{malformed:?} must be refused as malformed"
            );
        }
    }

    /// Refused on length before a single byte is decoded, so a peer cannot force a large allocation
    /// with an unauthenticated string.
    #[test]
    fn an_oversized_grant_is_refused_before_it_is_decoded() {
        let key = signing_key();
        let huge = "A".repeat(MAX_GRANT_BYTES + 1);

        assert_eq!(
            verifier(&key).verify(&huge, now()),
            Err(GrantError::TooLong {
                bytes: MAX_GRANT_BYTES + 1
            })
        );
    }

    #[test]
    fn an_empty_or_oversized_room_id_is_refused() {
        let key = signing_key();
        for room in ["".to_owned(), "r".repeat(MAX_ROOM_ID_BYTES + 1)] {
            let bad = ClaimsV1 {
                room: room.clone(),
                ..grant()
            };
            assert_eq!(
                verifier(&key).verify(&sign(&key, &bad), now()),
                Err(GrantError::InvalidRoomId { bytes: room.len() })
            );
        }

        // Exactly at the cap is accepted, so the boundary is where the docs say it is.
        let at_cap = ClaimsV1 {
            room: "r".repeat(MAX_ROOM_ID_BYTES),
            ..grant()
        };
        assert!(verifier(&key).verify(&sign(&key, &at_cap), now()).is_ok());
    }

    #[test]
    fn a_non_positive_user_id_is_refused() {
        let key = signing_key();
        for uid in [0, -1, i64::MIN] {
            let bad = ClaimsV1 { uid, ..grant() };
            assert_eq!(
                verifier(&key).verify(&sign(&key, &bad), now()),
                Err(GrantError::InvalidUserId { uid })
            );
        }
    }

    // ---------------------------------------------------------------- configuration

    /// The headline configuration decision: no key plus no explicit dev mode is a startup failure,
    /// never a silently open door.
    #[test]
    fn a_deployment_without_a_public_key_refuses_to_start() {
        assert_eq!(
            GrantVerifier::new(None, Admission::RequireGrant).unwrap_err(),
            GrantConfigError::MissingPublicKey
        );

        let config = Config {
            bind_address: "127.0.0.1:0".into(),
            announced_address: std::net::IpAddr::V4(std::net::Ipv4Addr::LOCALHOST),
            rtc_port_min: 40000,
            rtc_port_max: 49999,
            workers: 1,
            grant_public_key: None,
            allowed_origin: None,
        };
        assert_eq!(
            GrantVerifier::from_config(&config, Admission::RequireGrant).unwrap_err(),
            GrantConfigError::MissingPublicKey
        );
    }

    /// A configured key cannot be switched off by a stale flag - that is the production accident
    /// this refusal exists for.
    #[test]
    fn anonymous_mode_alongside_a_configured_key_refuses_to_start() {
        let key = signing_key();
        assert_eq!(
            GrantVerifier::new(Some(&public_key_base64(&key)), Admission::AllowAnonymous)
                .unwrap_err(),
            GrantConfigError::ContradictoryAdmission
        );
    }

    /// Explicit development mode: a peer with no grant is admitted, and is honestly labelled as
    /// carrying no identity rather than being handed a fabricated one.
    #[test]
    fn anonymous_development_mode_admits_a_peer_that_presents_nothing() {
        let verifier = GrantVerifier::new(None, Admission::AllowAnonymous)
            .expect("explicit development mode builds");

        assert!(!verifier.requires_grant());
        assert_eq!(verifier.public_key_base64(), None);
        assert_eq!(verifier.admit(None, now()), Ok(Admitted::Anonymous));
    }

    /// ...but it refuses a grant it cannot check, rather than downgrading the claimed identity to
    /// anonymous. Both the `verify` and the `admit` entry points.
    #[test]
    fn anonymous_development_mode_refuses_a_grant_it_cannot_check() {
        let key = signing_key();
        let token = sign(&key, &grant());
        let verifier = GrantVerifier::new(None, Admission::AllowAnonymous)
            .expect("explicit development mode builds");

        assert_eq!(
            verifier.admit(Some(&token), now()),
            Err(GrantError::NoVerifyingKey)
        );
        assert_eq!(
            verifier.verify(&token, now()),
            Err(GrantError::NoVerifyingKey)
        );
    }

    #[test]
    fn an_enforcing_verifier_refuses_a_peer_that_presents_no_grant() {
        let key = signing_key();
        let verifier = verifier(&key);

        assert!(verifier.requires_grant());
        assert_eq!(verifier.admit(None, now()), Err(GrantError::Missing));
        assert_eq!(
            verifier.admit(Some(&sign(&key, &grant())), now()),
            Ok(Admitted::Verified(verified_v1()))
        );
    }

    /// Every way `MEDIA_GRANT_PUBLIC_KEY` can be wrong is a startup failure with a message that says
    /// which way. The last case is a 32-byte string that is not a point on the curve, which is the
    /// only one that needs the crypto library to notice.
    #[test]
    fn a_malformed_public_key_refuses_to_start() {
        assert!(matches!(
            GrantVerifier::new(Some("not base64!!"), Admission::RequireGrant).unwrap_err(),
            GrantConfigError::PublicKeyNotBase64 { .. }
        ));

        // base64url of the real key: the right bytes in the wrong alphabet must not be accepted
        // silently. This one happens to contain a `-`, which is not in the standard alphabet.
        let url_safe = B64.encode(signing_key().verifying_key().as_bytes());
        assert!(url_safe.contains('-') || url_safe.contains('_'));
        assert!(matches!(
            GrantVerifier::new(Some(&url_safe), Admission::RequireGrant).unwrap_err(),
            GrantConfigError::PublicKeyNotBase64 { .. }
        ));

        assert_eq!(
            GrantVerifier::new(Some(&STANDARD.encode([0u8; 16])), Admission::RequireGrant)
                .unwrap_err(),
            GrantConfigError::PublicKeyWrongLength { bytes: 16 }
        );

        // 32 bytes whose y-coordinate has no matching x on the curve, so decompression fails. The
        // right length and the right alphabet are not enough to be a key.
        let not_a_point = STANDARD.encode([0x02u8; PUBLIC_KEY_LENGTH]);
        assert!(matches!(
            GrantVerifier::new(Some(&not_a_point), Admission::RequireGrant).unwrap_err(),
            GrantConfigError::PublicKeyInvalid { .. }
        ));
    }

    /// Whitespace around a pasted key is the most common way an operator's `.env` differs from the
    /// key they copied.
    #[test]
    fn a_public_key_with_surrounding_whitespace_is_accepted() {
        let key = signing_key();
        let padded = format!("  {}\n", public_key_base64(&key));

        let verifier = GrantVerifier::new(Some(&padded), Admission::RequireGrant)
            .expect("a trimmed key parses");
        assert_eq!(verifier.public_key_base64(), Some(public_key_base64(&key)));
        assert!(verifier.verify(&sign(&key, &grant()), now()).is_ok());
    }

    /// `Debug` has to say whether admission is actually on - it is what a health dump will show.
    #[test]
    fn debug_names_the_admission_mode() {
        let key = signing_key();
        let enforcing = format!("{:?}", verifier(&key));
        assert!(enforcing.contains("require-grant"));
        assert!(enforcing.contains(&public_key_base64(&key)));

        let anonymous = format!(
            "{:?}",
            GrantVerifier::new(None, Admission::AllowAnonymous).expect("builds")
        );
        assert!(anonymous.contains("allow-anonymous"));
    }

    /// `UnixTime::now()` is the only clock reader in the module, and it lives outside the verify
    /// path. It must at least be in the right era and the right unit - a millisecond value here
    /// would be the exact bug the newtype exists to prevent.
    #[test]
    fn unix_time_now_is_in_seconds() {
        let now = UnixTime::now().as_secs();
        assert!(
            (1_700_000_000..4_000_000_000).contains(&now),
            "UnixTime::now() returned {now}, which is not plausible seconds since the epoch"
        );
    }
}
