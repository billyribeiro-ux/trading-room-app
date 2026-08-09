//! Authorization: what a member may do in a room.
//!
//! **RLS is tenancy; capabilities are permissions.** Row-level security answers "may this
//! connection see this row at all", and it answers it in the database, fail-closed. This
//! module answers a different question - "may this member post, publish, or read the
//! archives" - and it is deliberately not RLS's job: a policy that encoded permissions
//! would have to be redeployed to change one member's rights.
//!
//! # The shape comes from the schema, not from taste
//!
//! `room_members` carries exactly **16 `can_*` booleans** and **5 state flags**, counted
//! from `migrations/0001_baseline.sql` (and asserted by
//! [`tests::the_capability_set_matches_the_room_members_columns`], which parses the DDL
//! rather than trusting this comment).
//!
//! The 16 are modelled as a bitset. The 5 - `is_muted`, `is_pm_restricted`, `is_trial`,
//! `hide_personal_info`, `capabilities_overridden` - are kept **separate**, because folding
//! them in would invert their sense (a restriction is not a permission) and orphan their
//! temporal companions: `muted_until` and `trial_expires_at` are meaningless without the
//! flag they qualify.
//!
//! # Where the defaults live - on the room, not in Rust
//!
//! `capabilities_overridden` only means anything against a default that exists *somewhere*,
//! and the schema never says where. Hardcoding a role table in Rust is the expedient answer
//! and the wrong one: it makes changing a room's permission policy a deploy, and the
//! captured admin console shows the real product configuring permissions **per room**.
//!
//! So the per-room defaults live in `rooms.config.capabilities.<role>`, validated by
//! `rooms_capability_defaults_check` (migration `0002`), which is the same jsonpath-counting
//! idiom the schema already uses for `rooms_access_tiers_*`.
//! [`RoleDefaults::COMPILED_IN`] is the fallback for rooms that predate that migration - a
//! floor, not the policy.
//!
//! `capabilities_overridden = false` then reads exactly as written: inherit the room's
//! default for your role. `true`: use the member's own 16 columns. One function owns that
//! rule - [`EffectiveCapabilities::resolve`].
//!
//! # Time is a parameter
//!
//! [`EffectiveCapabilities::require`] takes `now` rather than reading the clock, so mute
//! and trial expiry are deterministically testable at an exact instant instead of by
//! sleeping. Same discipline as `tradingroom-media`'s `UnixTime`.

use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

/// The five values `room_members_role_check` permits.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MemberRole {
    Owner,
    Presenter,
    LimitedPresenter,
    Moderator,
    Member,
}

impl MemberRole {
    /// Every role the CHECK allows, in the order the CHECK lists them.
    pub const ALL: [Self; 5] = [
        Self::Owner,
        Self::Presenter,
        Self::LimitedPresenter,
        Self::Moderator,
        Self::Member,
    ];

    /// The `room_members.role` text value.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Owner => "owner",
            Self::Presenter => "presenter",
            Self::LimitedPresenter => "limited_presenter",
            Self::Moderator => "moderator",
            Self::Member => "member",
        }
    }

    /// Parses `room_members.role`. `None` for anything the CHECK would have rejected, so an
    /// unrecognised role fails closed rather than defaulting to something permissive.
    #[must_use]
    pub fn parse(value: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|role| role.as_str() == value)
    }

    /// Whether `room_state.global_mute_non_staff` leaves this role alone.
    ///
    /// Everyone but `member` is staff. The flag's own name is the evidence: it exists to
    /// silence the audience without silencing the people running the room.
    #[must_use]
    pub const fn is_staff(self) -> bool {
        !matches!(self, Self::Member)
    }
}

/// One `room_members.can_*` column.
///
/// Discriminants are bit positions in [`Capabilities`] and are declared in **column order**,
/// so the bitset and the table read the same way round.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Capability {
    Post,
    PostImages,
    EditOwnMessage,
    DeleteOwnMessage,
    PublicReply,
    EditNotes,
    EditUsername,
    PublishMic,
    PublishCam,
    PublishScreen,
    UseAdminChat,
    UseGroupChat,
    PmUsers,
    PmAdmins,
    AccessFiles,
    AccessArchives,
}

impl Capability {
    /// All 16, in `room_members` column order.
    pub const ALL: [Self; 16] = [
        Self::Post,
        Self::PostImages,
        Self::EditOwnMessage,
        Self::DeleteOwnMessage,
        Self::PublicReply,
        Self::EditNotes,
        Self::EditUsername,
        Self::PublishMic,
        Self::PublishCam,
        Self::PublishScreen,
        Self::UseAdminChat,
        Self::UseGroupChat,
        Self::PmUsers,
        Self::PmAdmins,
        Self::AccessFiles,
        Self::AccessArchives,
    ];

    /// The `room_members` column this capability is stored in.
    #[must_use]
    pub const fn column(self) -> &'static str {
        match self {
            Self::Post => "can_post",
            Self::PostImages => "can_post_images",
            Self::EditOwnMessage => "can_edit_own_message",
            Self::DeleteOwnMessage => "can_delete_own_message",
            Self::PublicReply => "can_public_reply",
            Self::EditNotes => "can_edit_notes",
            Self::EditUsername => "can_edit_username",
            Self::PublishMic => "can_publish_mic",
            Self::PublishCam => "can_publish_cam",
            Self::PublishScreen => "can_publish_screen",
            Self::UseAdminChat => "can_use_admin_chat",
            Self::UseGroupChat => "can_use_group_chat",
            Self::PmUsers => "can_pm_users",
            Self::PmAdmins => "can_pm_admins",
            Self::AccessFiles => "can_access_files",
            Self::AccessArchives => "can_access_archives",
        }
    }

    /// The name used in `rooms.config.capabilities` and on the wire: the column without its
    /// `can_` prefix.
    #[must_use]
    pub const fn wire_name(self) -> &'static str {
        // `split_at` rather than a second hand-written table: one source of truth, and a
        // typo becomes impossible rather than merely unlikely.
        let (_, name) = self.column().split_at("can_".len());
        name
    }

    #[must_use]
    pub fn parse(value: &str) -> Option<Self> {
        Self::ALL
            .into_iter()
            .find(|capability| capability.wire_name() == value)
    }

    const fn bit(self) -> u16 {
        1 << (self as u16)
    }

    /// Whether exercising this capability *writes* something others can see.
    ///
    /// Drives the expired-trial degradation, which is defined as "read-only" rather than as
    /// a hand-listed set, so a capability added later cannot quietly stay available to an
    /// expired trial by being forgotten.
    #[must_use]
    pub const fn is_write(self) -> bool {
        match self {
            // Produces a message, a reply, a note revision, a stream or a rename.
            Self::Post
            | Self::PostImages
            | Self::EditOwnMessage
            | Self::DeleteOwnMessage
            | Self::PublicReply
            | Self::EditNotes
            | Self::EditUsername
            | Self::PublishMic
            | Self::PublishCam
            | Self::PublishScreen
            | Self::UseAdminChat
            | Self::PmUsers
            | Self::PmAdmins => true,
            // Reaching a channel or an archive. Reading only.
            Self::UseGroupChat | Self::AccessFiles | Self::AccessArchives => false,
        }
    }
}

/// A set of [`Capability`], one bit each.
///
/// A `u16` because there are exactly 16 of them; a 17th is a compile error in
/// [`Capability::bit`]'s shift, which is the right place to find out.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Capabilities(u16);

impl Capabilities {
    pub const NONE: Self = Self(0);

    #[must_use]
    pub fn all() -> Self {
        Self::from_iter(Capability::ALL)
    }

    #[must_use]
    pub const fn contains(self, capability: Capability) -> bool {
        self.0 & capability.bit() != 0
    }

    #[must_use]
    pub const fn with(self, capability: Capability) -> Self {
        Self(self.0 | capability.bit())
    }

    #[must_use]
    pub const fn without(self, capability: Capability) -> Self {
        Self(self.0 & !capability.bit())
    }

    // No `#[must_use]`: `impl Iterator` already carries one, and doubling it is a clippy error.
    pub fn iter(self) -> impl Iterator<Item = Capability> {
        Capability::ALL
            .into_iter()
            .filter(move |capability| self.contains(*capability))
    }

    /// Drops every capability that writes. The expired-trial and read-only degradations.
    #[must_use]
    pub fn read_only(self) -> Self {
        self.iter()
            .filter(|capability| !capability.is_write())
            .collect()
    }
}

impl FromIterator<Capability> for Capabilities {
    fn from_iter<I: IntoIterator<Item = Capability>>(iter: I) -> Self {
        iter.into_iter()
            .fold(Self::NONE, |set, capability| set.with(capability))
    }
}

/// The per-role default sets a room publishes in `rooms.config.capabilities`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RoleDefaults {
    owner: Capabilities,
    presenter: Capabilities,
    limited_presenter: Capabilities,
    moderator: Capabilities,
    member: Capabilities,
}

impl RoleDefaults {
    #[must_use]
    pub fn for_role(&self, role: MemberRole) -> Capabilities {
        match role {
            MemberRole::Owner => self.owner,
            MemberRole::Presenter => self.presenter,
            MemberRole::LimitedPresenter => self.limited_presenter,
            MemberRole::Moderator => self.moderator,
            MemberRole::Member => self.member,
        }
    }

    /// The fallback for rooms whose `config` predates `0002`.
    ///
    /// **The `member` row is evidence**: it is exactly the `room_members` column `DEFAULT`s
    /// (`can_post`, `can_use_group_chat` and `can_access_archives` are `true`; the other
    /// thirteen are `false`), which is the schema's own opinion of an ordinary member.
    ///
    /// **The other four rows are a product judgement**, not evidence, and are recorded as
    /// such: the captured admin console uses an older, different vocabulary (`hasMic`,
    /// `nonPresenter`, role integers 0-4) that does not map cleanly onto these five roles.
    /// They ship as a reviewable seed in `0002` precisely so they can be argued with per
    /// room instead of being a hidden constant. The reasoning:
    ///
    /// * **owner** - everything; the owner is who would be granting the rest.
    /// * **moderator** - everything except the three `publish_*`: moderation is chat-side,
    ///   broadcasting is a presenter function.
    /// * **presenter** - may broadcast and take part fully, but not moderate
    ///   (`use_admin_chat`) or rename themselves.
    /// * **limited_presenter** - a presenter without screen share and without
    ///   `public_reply`; "limited" has to limit something, and those are the two the name
    ///   most plausibly refers to.
    pub const COMPILED_IN: Self = Self {
        owner: Capabilities(u16::MAX >> (16 - Capability::ALL.len() as u16)),
        presenter: Capabilities(
            Capability::Post.bit()
                | Capability::PostImages.bit()
                | Capability::EditOwnMessage.bit()
                | Capability::DeleteOwnMessage.bit()
                | Capability::PublicReply.bit()
                | Capability::EditNotes.bit()
                | Capability::PublishMic.bit()
                | Capability::PublishCam.bit()
                | Capability::PublishScreen.bit()
                | Capability::UseGroupChat.bit()
                | Capability::PmAdmins.bit()
                | Capability::AccessFiles.bit()
                | Capability::AccessArchives.bit(),
        ),
        limited_presenter: Capabilities(
            Capability::Post.bit()
                | Capability::PostImages.bit()
                | Capability::EditOwnMessage.bit()
                | Capability::DeleteOwnMessage.bit()
                | Capability::EditNotes.bit()
                | Capability::PublishMic.bit()
                | Capability::PublishCam.bit()
                | Capability::UseGroupChat.bit()
                | Capability::PmAdmins.bit()
                | Capability::AccessFiles.bit()
                | Capability::AccessArchives.bit(),
        ),
        moderator: Capabilities(
            Capability::Post.bit()
                | Capability::PostImages.bit()
                | Capability::EditOwnMessage.bit()
                | Capability::DeleteOwnMessage.bit()
                | Capability::PublicReply.bit()
                | Capability::EditNotes.bit()
                | Capability::EditUsername.bit()
                | Capability::UseAdminChat.bit()
                | Capability::UseGroupChat.bit()
                | Capability::PmUsers.bit()
                | Capability::PmAdmins.bit()
                | Capability::AccessFiles.bit()
                | Capability::AccessArchives.bit(),
        ),
        // The `room_members` column defaults, verbatim.
        member: Capabilities(
            Capability::Post.bit()
                | Capability::UseGroupChat.bit()
                | Capability::AccessArchives.bit(),
        ),
    };

    /// Reads `rooms.config.capabilities`, falling back per role.
    ///
    /// A role the room does not mention falls back to [`Self::COMPILED_IN`] rather than to
    /// "no capabilities": a room that configures only `member` must not accidentally lock
    /// its own owner out.
    #[must_use]
    pub fn from_room_config(config: &serde_json::Value) -> Self {
        let configured = config.get("capabilities").and_then(|v| v.as_object());
        let Some(configured) = configured else {
            return Self::COMPILED_IN;
        };

        let mut defaults = Self::COMPILED_IN;
        for role in MemberRole::ALL {
            let Some(list) = configured.get(role.as_str()).and_then(|v| v.as_array()) else {
                continue;
            };
            // Unknown names are skipped, not fatal: the CHECK already refuses to store one,
            // so reaching here means the constraint was added after the row - and refusing
            // to serve the room would be a worse answer than serving it the names we know.
            let set = list
                .iter()
                .filter_map(|value| value.as_str())
                .filter_map(Capability::parse)
                .collect();
            defaults.set(role, set);
        }
        defaults
    }

    fn set(&mut self, role: MemberRole, capabilities: Capabilities) {
        match role {
            MemberRole::Owner => self.owner = capabilities,
            MemberRole::Presenter => self.presenter = capabilities,
            MemberRole::LimitedPresenter => self.limited_presenter = capabilities,
            MemberRole::Moderator => self.moderator = capabilities,
            MemberRole::Member => self.member = capabilities,
        }
    }

    /// The JSON this writes is exactly what [`Self::from_room_config`] reads, which is what
    /// makes `0002`'s seed and this fallback the same policy rather than two.
    #[must_use]
    pub fn to_config_json(&self) -> serde_json::Value {
        serde_json::Value::Object(
            MemberRole::ALL
                .into_iter()
                .map(|role| {
                    let names: Vec<_> = self
                        .for_role(role)
                        .iter()
                        .map(|capability| serde_json::Value::from(capability.wire_name()))
                        .collect();
                    (role.as_str().to_owned(), serde_json::Value::Array(names))
                })
                .collect(),
        )
    }
}

/// The five `room_members` state flags, plus the two timestamps that qualify them.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct MemberFlags {
    pub is_muted: bool,
    /// `NULL` with `is_muted` means an indefinite mute, not an expired one.
    pub muted_until: Option<OffsetDateTime>,
    pub is_pm_restricted: bool,
    pub is_trial: bool,
    pub trial_expires_at: Option<OffsetDateTime>,
    pub hide_personal_info: bool,
    pub capabilities_overridden: bool,
}

impl MemberFlags {
    /// Whether the mute is in force *now*.
    ///
    /// A `muted_until` in the past is a mute that has served its time; the flag is left set
    /// so the history is visible, which is why this is a question about `now` and not just
    /// about `is_muted`.
    #[must_use]
    pub fn muted_at(&self, now: OffsetDateTime) -> bool {
        self.is_muted && self.muted_until.is_none_or(|until| now < until)
    }

    /// Whether this is a trial that has run out.
    #[must_use]
    pub fn trial_expired_at(&self, now: OffsetDateTime) -> bool {
        self.is_trial && self.trial_expires_at.is_some_and(|expires| now >= expires)
    }
}

/// Room-wide state that can override an individual's capabilities.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct RoomRestrictions {
    /// `room_state.global_mute_non_staff`.
    pub global_mute_non_staff: bool,
}

/// Why a capability was refused.
///
/// Distinguished because the client should say different things: a mute is temporary and
/// has an end, an expired trial is a billing state with an action attached, and a plain
/// absence is not worth explaining at all.
#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
pub enum Denied {
    #[error("this member does not have {}", .0.wire_name())]
    NotGranted(Capability),
    #[error("this member is muted")]
    Muted,
    #[error("private messages to members are restricted for this member")]
    PmRestricted,
    #[error("this trial has expired")]
    TrialExpired,
    #[error("the room is muted for non-staff")]
    GloballyMuted,
}

impl Denied {
    /// The stable machine code a client branches on.
    ///
    /// Deliberately more than one value. A blank `forbidden` for a mute or an expired trial
    /// gives the UI nothing to render but a wall, when the correct response is a countdown or
    /// a renewal prompt. None of these codes reveals anything about the room the member
    /// cannot already see about their own membership.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::NotGranted(_) => "forbidden",
            Self::Muted => "muted",
            Self::PmRestricted => "pmRestricted",
            Self::TrialExpired => "trialExpired",
            Self::GloballyMuted => "globallyMuted",
        }
    }
}

/// A member's capabilities in one room, with every suppression already applied.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EffectiveCapabilities {
    pub role: MemberRole,
    granted: Capabilities,
    flags: MemberFlags,
    room: RoomRestrictions,
}

impl EffectiveCapabilities {
    /// The one place `capabilities_overridden` is interpreted.
    ///
    /// `false` - the overwhelmingly common case - means the member's own 16 columns are
    /// **ignored** and the room's default for their role is used. That is what the column
    /// name says, and reading the stored booleans anyway would make the room's policy
    /// unenforceable for every member created before it changed.
    #[must_use]
    pub fn resolve(
        role: MemberRole,
        stored: Capabilities,
        flags: MemberFlags,
        defaults: &RoleDefaults,
        room: RoomRestrictions,
    ) -> Self {
        let granted = if flags.capabilities_overridden {
            stored
        } else {
            defaults.for_role(role)
        };

        Self {
            role,
            granted,
            flags,
            room,
        }
    }

    /// What was granted before suppression. For rendering an admin UI, never for deciding.
    #[must_use]
    pub const fn granted(&self) -> Capabilities {
        self.granted
    }

    #[must_use]
    pub const fn flags(&self) -> MemberFlags {
        self.flags
    }

    /// The decision. Suppressions are checked **before** the grant, so the reason a member
    /// is refused is the interesting one - "you are muted", not "you cannot post".
    ///
    /// # Errors
    /// [`Denied`], naming which rule refused.
    pub fn require(&self, capability: Capability, now: OffsetDateTime) -> Result<(), Denied> {
        // An expired trial degrades to read-only rather than to a 403 storm, and surfaces a
        // state the client can act on.
        if capability.is_write() && self.flags.trial_expired_at(now) {
            return Err(Denied::TrialExpired);
        }

        if self.flags.muted_at(now) && Self::silenced_by_mute(capability) {
            return Err(Denied::Muted);
        }

        // Staff are exempt: the flag exists to silence the audience, not the room's own
        // presenters.
        if self.room.global_mute_non_staff
            && !self.role.is_staff()
            && Self::silenced_by_mute(capability)
        {
            return Err(Denied::GloballyMuted);
        }

        // A restricted member may still reach the people who could lift the restriction.
        // Folding `PmAdmins` in here would make the restriction unappealable.
        if self.flags.is_pm_restricted && capability == Capability::PmUsers {
            return Err(Denied::PmRestricted);
        }

        if !self.granted.contains(capability) {
            return Err(Denied::NotGranted(capability));
        }

        Ok(())
    }

    /// Whether a mute silences this capability.
    ///
    /// A mute stops a member being *heard*: posting, replying and publishing. It does not
    /// revoke reading, file access, or the ability to message an admin about it.
    const fn silenced_by_mute(capability: Capability) -> bool {
        matches!(
            capability,
            Capability::Post
                | Capability::PostImages
                | Capability::PublicReply
                | Capability::PublishMic
                | Capability::PublishCam
                | Capability::PublishScreen
        )
    }

    /// Everything this member may do right now, suppressions included.
    #[must_use]
    pub fn effective(&self, now: OffsetDateTime) -> Capabilities {
        Capability::ALL
            .into_iter()
            .filter(|capability| self.require(*capability, now).is_ok())
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use time::Duration;

    const BASELINE: &str = include_str!("../migrations/0001_baseline.sql");

    fn now() -> OffsetDateTime {
        OffsetDateTime::from_unix_timestamp(1_753_920_000).expect("a valid timestamp")
    }

    /// Reads the `room_members` DDL out of the pinned baseline. Every claim this module
    /// makes about the table is checked against this rather than against memory.
    fn room_members_columns() -> Vec<String> {
        BASELINE
            .split("CREATE TABLE public.room_members (")
            .nth(1)
            .expect("room_members must exist in the baseline")
            .split("\n);")
            .next()
            .expect("a terminated CREATE TABLE")
            .lines()
            .filter_map(|line| line.trim().split_once(' ').map(|(name, _)| name.to_owned()))
            .collect()
    }

    /// The load-bearing structural test: the bitset is the table.
    #[test]
    fn the_capability_set_matches_the_room_members_columns() {
        let columns = room_members_columns();
        let can_columns: Vec<_> = columns
            .iter()
            .filter(|name| name.starts_with("can_"))
            .cloned()
            .collect();

        assert_eq!(
            can_columns.len(),
            16,
            "room_members carries 16 can_* columns; found {can_columns:?}"
        );

        let modelled: Vec<_> = Capability::ALL
            .into_iter()
            .map(|capability| capability.column().to_owned())
            .collect();
        assert_eq!(
            modelled, can_columns,
            "Capability::ALL must match the can_* columns, in column order"
        );
    }

    /// The five flags are deliberately *not* in the bitset. If one ever migrates in, this
    /// is where it gets noticed.
    #[test]
    fn the_five_state_flags_exist_and_are_not_capabilities() {
        let columns = room_members_columns();
        for flag in [
            "is_muted",
            "is_pm_restricted",
            "is_trial",
            "hide_personal_info",
            "capabilities_overridden",
        ] {
            assert!(columns.iter().any(|c| c == flag), "missing column {flag}");
            assert!(
                Capability::parse(flag).is_none(),
                "{flag} is a state flag, not a capability"
            );
        }
        // Their temporal companions, which is why they are not folded into the bitset.
        assert!(columns.iter().any(|c| c == "muted_until"));
        assert!(columns.iter().any(|c| c == "trial_expires_at"));
    }

    #[test]
    fn the_roles_match_the_check_constraint() {
        let check = BASELINE
            .lines()
            .find(|line| line.contains("room_members_role_check"))
            .expect("the role CHECK must exist");
        for role in MemberRole::ALL {
            assert!(
                check.contains(&format!("'{}'::text", role.as_str())),
                "{} is not in room_members_role_check",
                role.as_str()
            );
        }
        // And nothing else is: one `'<role>'::text` literal per role, five modelled. Without
        // this the test would pass while the CHECK quietly gained a sixth role.
        assert_eq!(check.matches("::text").count(), MemberRole::ALL.len());
    }

    #[test]
    fn wire_names_are_the_columns_without_their_prefix() {
        assert_eq!(Capability::Post.wire_name(), "post");
        assert_eq!(Capability::PublishScreen.wire_name(), "publish_screen");
        for capability in Capability::ALL {
            assert_eq!(Capability::parse(capability.wire_name()), Some(capability));
        }
        assert_eq!(
            Capability::parse("can_post"),
            None,
            "the prefix is stripped"
        );
        assert_eq!(Capability::parse("nonsense"), None);
    }

    #[test]
    fn an_unknown_role_fails_closed() {
        assert_eq!(MemberRole::parse("owner"), Some(MemberRole::Owner));
        // Not a value the CHECK allows. Falling back to `member` would be a guess.
        assert_eq!(MemberRole::parse("admin"), None);
        assert_eq!(MemberRole::parse(""), None);
    }

    #[test]
    fn the_bitset_holds_all_sixteen_independently() {
        let all = Capabilities::all();
        for capability in Capability::ALL {
            assert!(all.contains(capability));
            assert!(!Capabilities::NONE.contains(capability));

            // One bit each: setting one must not set another.
            let only = Capabilities::NONE.with(capability);
            assert_eq!(
                only.iter().count(),
                1,
                "{capability:?} overlaps another bit"
            );
            assert!(!only.without(capability).contains(capability));
        }
        assert_eq!(all.iter().count(), 16);
    }

    /// The `member` defaults are not a judgement call - they are the column DEFAULTs.
    #[test]
    fn the_member_default_is_exactly_the_column_defaults() {
        let ddl = BASELINE
            .split("CREATE TABLE public.room_members (")
            .nth(1)
            .expect("room_members")
            .split("\n);")
            .next()
            .expect("terminated");

        let member = RoleDefaults::COMPILED_IN.for_role(MemberRole::Member);
        for capability in Capability::ALL {
            let line = ddl
                .lines()
                .find(|line| {
                    line.trim()
                        .starts_with(&format!("{} ", capability.column()))
                })
                .unwrap_or_else(|| panic!("no DDL line for {}", capability.column()));
            let default_true = line.contains("DEFAULT true");
            assert_eq!(
                member.contains(capability),
                default_true,
                "{} defaults to {default_true} in the schema but {} in COMPILED_IN",
                capability.column(),
                member.contains(capability)
            );
        }
    }

    #[test]
    fn an_owner_defaults_to_everything_and_a_member_does_not() {
        assert_eq!(
            RoleDefaults::COMPILED_IN.for_role(MemberRole::Owner),
            Capabilities::all()
        );
        assert!(
            RoleDefaults::COMPILED_IN
                .for_role(MemberRole::Member)
                .iter()
                .count()
                < 16
        );
    }

    #[test]
    fn only_members_are_non_staff() {
        assert!(!MemberRole::Member.is_staff());
        for role in MemberRole::ALL
            .into_iter()
            .filter(|r| *r != MemberRole::Member)
        {
            assert!(role.is_staff(), "{role:?} should be staff");
        }
    }

    // ------------------------------------------------------------ resolve

    fn resolve(
        role: MemberRole,
        stored: Capabilities,
        flags: MemberFlags,
        room: RoomRestrictions,
    ) -> EffectiveCapabilities {
        EffectiveCapabilities::resolve(role, stored, flags, &RoleDefaults::COMPILED_IN, room)
    }

    /// The whole reason `capabilities_overridden` exists. Getting this backwards would make
    /// a room's policy silently unenforceable for every existing member.
    #[test]
    fn stored_columns_are_used_only_when_the_override_flag_is_set() {
        // A member row whose columns say "everything", but which is not overridden.
        let inherited = resolve(
            MemberRole::Member,
            Capabilities::all(),
            MemberFlags::default(),
            RoomRestrictions::default(),
        );
        assert_eq!(
            inherited.granted(),
            RoleDefaults::COMPILED_IN.for_role(MemberRole::Member),
            "without the flag the room's default wins, not the stored columns"
        );
        assert!(inherited.require(Capability::PublishScreen, now()).is_err());

        let overridden = resolve(
            MemberRole::Member,
            Capabilities::all(),
            MemberFlags {
                capabilities_overridden: true,
                ..MemberFlags::default()
            },
            RoomRestrictions::default(),
        );
        assert_eq!(overridden.granted(), Capabilities::all());
        assert!(overridden.require(Capability::PublishScreen, now()).is_ok());
    }

    // ------------------------------------------------------------ suppression

    #[test]
    fn a_mute_silences_speech_and_nothing_else() {
        let muted = resolve(
            MemberRole::Owner,
            Capabilities::NONE,
            MemberFlags {
                is_muted: true,
                ..MemberFlags::default()
            },
            RoomRestrictions::default(),
        );

        for silenced in [
            Capability::Post,
            Capability::PostImages,
            Capability::PublicReply,
            Capability::PublishMic,
            Capability::PublishCam,
            Capability::PublishScreen,
        ] {
            assert_eq!(muted.require(silenced, now()), Err(Denied::Muted));
        }

        // A mute is not a ban: reading and appealing survive it.
        assert!(muted.require(Capability::AccessArchives, now()).is_ok());
        assert!(muted.require(Capability::PmAdmins, now()).is_ok());
        assert!(muted.require(Capability::UseGroupChat, now()).is_ok());
    }

    #[test]
    fn a_mute_that_has_run_out_stops_applying_without_being_cleared() {
        let flags = MemberFlags {
            is_muted: true,
            muted_until: Some(now() + Duration::hours(24)),
            ..MemberFlags::default()
        };
        let member = resolve(
            MemberRole::Owner,
            Capabilities::NONE,
            flags,
            RoomRestrictions::default(),
        );

        assert_eq!(member.require(Capability::Post, now()), Err(Denied::Muted));
        // The row still says `is_muted`, but the clock has moved past `muted_until`.
        assert!(
            member
                .require(Capability::Post, now() + Duration::hours(25))
                .is_ok()
        );
    }

    #[test]
    fn an_indefinite_mute_has_no_end() {
        let member = resolve(
            MemberRole::Owner,
            Capabilities::NONE,
            MemberFlags {
                is_muted: true,
                muted_until: None,
                ..MemberFlags::default()
            },
            RoomRestrictions::default(),
        );
        // NULL `muted_until` must not read as "expired at the epoch".
        assert_eq!(
            member.require(Capability::Post, now() + Duration::days(3650)),
            Err(Denied::Muted)
        );
    }

    #[test]
    fn a_pm_restriction_still_allows_messaging_an_admin() {
        let member = resolve(
            MemberRole::Owner,
            Capabilities::NONE,
            MemberFlags {
                is_pm_restricted: true,
                ..MemberFlags::default()
            },
            RoomRestrictions::default(),
        );
        assert_eq!(
            member.require(Capability::PmUsers, now()),
            Err(Denied::PmRestricted)
        );
        // Otherwise the restriction would be unappealable.
        assert!(member.require(Capability::PmAdmins, now()).is_ok());
    }

    #[test]
    fn an_expired_trial_degrades_to_read_only_rather_than_a_403_storm() {
        let flags = MemberFlags {
            is_trial: true,
            trial_expires_at: Some(now()),
            ..MemberFlags::default()
        };
        let member = resolve(
            MemberRole::Owner,
            Capabilities::NONE,
            flags,
            RoomRestrictions::default(),
        );

        // A named state the client can act on, not a bare refusal.
        assert_eq!(
            member.require(Capability::Post, now()),
            Err(Denied::TrialExpired)
        );
        // Reading survives, which is what "read-only" has to mean to be worth the name.
        assert!(member.require(Capability::AccessArchives, now()).is_ok());
        assert_eq!(
            member.effective(now()),
            RoleDefaults::COMPILED_IN
                .for_role(MemberRole::Owner)
                .read_only()
        );

        // Before expiry, nothing is suppressed.
        assert!(
            member
                .require(Capability::Post, now() - Duration::seconds(1))
                .is_ok()
        );
    }

    #[test]
    fn a_trial_with_no_expiry_never_expires() {
        let member = resolve(
            MemberRole::Owner,
            Capabilities::NONE,
            MemberFlags {
                is_trial: true,
                trial_expires_at: None,
                ..MemberFlags::default()
            },
            RoomRestrictions::default(),
        );
        assert!(
            member
                .require(Capability::Post, now() + Duration::days(3650))
                .is_ok()
        );
    }

    #[test]
    fn a_global_mute_silences_members_but_not_staff() {
        let room = RoomRestrictions {
            global_mute_non_staff: true,
        };

        let member = resolve(
            MemberRole::Member,
            Capabilities::NONE,
            MemberFlags::default(),
            room,
        );
        assert_eq!(
            member.require(Capability::Post, now()),
            Err(Denied::GloballyMuted)
        );
        // Not a lockout: they can still read.
        assert!(member.require(Capability::AccessArchives, now()).is_ok());

        for staff in MemberRole::ALL
            .into_iter()
            .filter(|role| *role != MemberRole::Member)
        {
            let member = resolve(staff, Capabilities::NONE, MemberFlags::default(), room);
            assert!(
                member.require(Capability::Post, now()).is_ok(),
                "{staff:?} is staff and must not be globally muted"
            );
        }
    }

    #[test]
    fn a_capability_that_was_never_granted_says_so() {
        let member = resolve(
            MemberRole::Member,
            Capabilities::NONE,
            MemberFlags::default(),
            RoomRestrictions::default(),
        );
        assert_eq!(
            member.require(Capability::PublishScreen, now()),
            Err(Denied::NotGranted(Capability::PublishScreen))
        );
        assert!(
            member.require(Capability::Post, now()).is_ok(),
            "a member may post by default"
        );
    }

    // ------------------------------------------------------------ room config

    #[test]
    fn a_room_can_override_the_defaults_per_role() {
        let config = serde_json::json!({
            "capabilities": {
                "member": ["post", "post_images", "public_reply", "access_archives"]
            }
        });
        let defaults = RoleDefaults::from_room_config(&config);

        let member = defaults.for_role(MemberRole::Member);
        assert!(
            member.contains(Capability::PostImages),
            "the room granted it"
        );
        assert!(
            !member.contains(Capability::UseGroupChat),
            "the room did not"
        );

        // A role the room did not mention keeps the compiled-in floor, so configuring one
        // role cannot lock the owner out.
        assert_eq!(
            defaults.for_role(MemberRole::Owner),
            RoleDefaults::COMPILED_IN.for_role(MemberRole::Owner)
        );
    }

    #[test]
    fn a_room_with_no_capability_config_uses_the_compiled_in_defaults() {
        for config in [
            serde_json::json!({}),
            serde_json::json!({"access": {"tiers": []}}),
            // Wrong shape: not an object. Fall back rather than fail the room.
            serde_json::json!({"capabilities": []}),
        ] {
            assert_eq!(
                RoleDefaults::from_room_config(&config),
                RoleDefaults::COMPILED_IN,
                "config {config} should fall back"
            );
        }
    }

    #[test]
    fn a_room_may_grant_a_role_nothing_at_all() {
        // Distinct from "not configured": an explicit empty list is a policy.
        let config = serde_json::json!({ "capabilities": { "member": [] } });
        let defaults = RoleDefaults::from_room_config(&config);
        assert_eq!(defaults.for_role(MemberRole::Member), Capabilities::NONE);
    }

    /// The seed `0002` writes and the fallback this module holds have to be the same
    /// policy, or a room would change behaviour the moment it was configured.
    #[test]
    fn the_config_json_round_trips_through_the_reader() {
        let json = serde_json::json!({
            "capabilities": RoleDefaults::COMPILED_IN.to_config_json()
        });
        assert_eq!(
            RoleDefaults::from_room_config(&json),
            RoleDefaults::COMPILED_IN
        );
    }

    /// The load-bearing cross-check between the two halves of the decision: `0002` seeds a
    /// room's policy, and [`RoleDefaults::COMPILED_IN`] is the fallback for rooms that
    /// predate it. If they disagree, a room silently changes behaviour the moment it is
    /// seeded - so the SQL literal is parsed here and compared, rather than trusted.
    #[test]
    fn the_migration_seed_is_the_compiled_in_policy() {
        const MIGRATION: &str = include_str!("../migrations/0002_room_capability_defaults.sql");

        let literal = MIGRATION
            .split("      '{\n")
            .nth(1)
            .and_then(|rest| rest.split("      }'::jsonb").next())
            .expect("0002 must contain the seed object literal");

        let seeded: serde_json::Value =
            serde_json::from_str(&format!("{{{literal}}}")).expect("the seed must be valid JSON");

        assert_eq!(
            RoleDefaults::from_room_config(&serde_json::json!({ "capabilities": seeded })),
            RoleDefaults::COMPILED_IN,
            "migration 0002's seed and RoleDefaults::COMPILED_IN have drifted apart"
        );
    }

    /// The CHECK in `0002` names all sixteen capabilities in a regex. A capability added to
    /// the enum without being added there would be storable in Rust and rejected by the
    /// database - the sort of mismatch that only shows up in production.
    #[test]
    fn the_migration_check_lists_every_capability() {
        const MIGRATION: &str = include_str!("../migrations/0002_room_capability_defaults.sql");

        let alternation = MIGRATION
            .split("like_regex \"^(")
            .nth(1)
            .and_then(|rest| rest.split(")$\"").next())
            .expect("0002 must constrain capability names with a regex");

        let named: Vec<_> = alternation.split('|').collect();
        let modelled: Vec<_> = Capability::ALL
            .into_iter()
            .map(Capability::wire_name)
            .collect();
        assert_eq!(
            named, modelled,
            "0002's CHECK and Capability::ALL must name the same sixteen capabilities"
        );
    }

    #[test]
    fn an_unknown_capability_name_in_a_room_config_is_ignored_not_fatal() {
        let config = serde_json::json!({
            "capabilities": { "member": ["post", "can_fly", "access_archives"] }
        });
        let member = RoleDefaults::from_room_config(&config).for_role(MemberRole::Member);
        assert!(member.contains(Capability::Post));
        assert!(member.contains(Capability::AccessArchives));
        assert_eq!(member.iter().count(), 2);
    }
}
