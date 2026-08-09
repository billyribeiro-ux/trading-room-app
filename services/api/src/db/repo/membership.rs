//! Reading a member's stored capabilities and the room state that can override them.

use uuid::Uuid;

use crate::auth::extract::MembershipProfile;
use crate::capability::{Capabilities, Capability, MemberFlags, RoomRestrictions};
use crate::db::{DbError, TenantTx};

/// Loads everything the capability layer needs for one member, in **one** round trip.
///
/// Three tables in a single statement rather than three queries: this runs on the authorized
/// path of every request, so it is the query most worth not multiplying. `rooms` and
/// `room_state` are both tenant-scoped, so the join is covered by the same RLS policies as
/// the member row itself - a cross-tenant room id yields zero rows rather than an error.
///
/// # Errors
/// [`DbError::NotFound`] if the member row is gone between resolution and this read - a race
/// with a removal, which is a 404 rather than a crash.
pub async fn load(
    tx: &mut TenantTx<'_>,
    member_id: Uuid,
    room_id: Uuid,
) -> Result<MembershipProfile, DbError> {
    // The 16 capability columns are listed via `Capability::column()` rather than typed out,
    // so the query and the enum cannot drift. Names come from a compiled-in table, never from
    // input, so the format! carries no injection surface.
    let capability_columns = Capability::ALL
        .into_iter()
        .map(|capability| format!("m.{}", capability.column()))
        .collect::<Vec<_>>()
        .join(", ");

    let sql = format!(
        "SELECT {capability_columns}, \
                m.is_muted, m.muted_until, m.is_pm_restricted, m.is_trial, \
                m.trial_expires_at, m.hide_personal_info, m.capabilities_overridden, \
                r.config, \
                COALESCE(s.global_mute_non_staff, false) \
         FROM room_members m \
         JOIN rooms r ON r.id = m.room_id \
         LEFT JOIN room_state s ON s.room_id = m.room_id \
         WHERE m.id = $1 AND m.room_id = $2"
    );

    let row: Option<CapabilityRow> = sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(member_id)
        .bind(room_id)
        .fetch_optional(tx.conn())
        .await
        .map_err(DbError::from)?;

    let row = row.ok_or(DbError::NotFound)?;
    Ok(row.into_profile())
}

/// Mirrors the SELECT above positionally. `sqlx::FromRow` on a tuple of this width is
/// unreadable, so the shape is named once here.
struct CapabilityRow {
    capabilities: [bool; 16],
    is_muted: bool,
    muted_until: Option<time::OffsetDateTime>,
    is_pm_restricted: bool,
    is_trial: bool,
    trial_expires_at: Option<time::OffsetDateTime>,
    hide_personal_info: bool,
    capabilities_overridden: bool,
    room_config: serde_json::Value,
    global_mute_non_staff: bool,
}

impl CapabilityRow {
    fn into_profile(self) -> MembershipProfile {
        let stored = Capability::ALL
            .into_iter()
            .enumerate()
            .filter(|(index, _)| self.capabilities[*index])
            .map(|(_, capability)| capability)
            .collect::<Capabilities>();

        MembershipProfile {
            stored,
            flags: MemberFlags {
                is_muted: self.is_muted,
                muted_until: self.muted_until,
                is_pm_restricted: self.is_pm_restricted,
                is_trial: self.is_trial,
                trial_expires_at: self.trial_expires_at,
                hide_personal_info: self.hide_personal_info,
                capabilities_overridden: self.capabilities_overridden,
            },
            room: RoomRestrictions {
                global_mute_non_staff: self.global_mute_non_staff,
            },
            room_config: self.room_config,
        }
    }
}

impl<'r> sqlx::FromRow<'r, sqlx::postgres::PgRow> for CapabilityRow {
    fn from_row(row: &'r sqlx::postgres::PgRow) -> Result<Self, sqlx::Error> {
        use sqlx::Row;

        // Positional, because the column list is generated. The capability block is first and
        // is exactly `Capability::ALL.len()` wide, which is what keeps these indices aligned
        // with the generated SELECT.
        let mut capabilities = [false; 16];
        for (index, slot) in capabilities.iter_mut().enumerate() {
            *slot = row.try_get(index)?;
        }
        let next = Capability::ALL.len();

        Ok(Self {
            capabilities,
            is_muted: row.try_get(next)?,
            muted_until: row.try_get(next + 1)?,
            is_pm_restricted: row.try_get(next + 2)?,
            is_trial: row.try_get(next + 3)?,
            trial_expires_at: row.try_get(next + 4)?,
            hide_personal_info: row.try_get(next + 5)?,
            capabilities_overridden: row.try_get(next + 6)?,
            room_config: row.try_get(next + 7)?,
            global_mute_non_staff: row.try_get(next + 8)?,
        })
    }
}

#[cfg(test)]
mod tests {
    use crate::capability::Capability;

    /// The `FromRow` impl above indexes the flag columns by `Capability::ALL.len()`, and the
    /// fixed-size array is 16 wide. If the capability set ever changes size, that array is a
    /// compile error and this is the test that explains why.
    #[test]
    fn the_capability_block_is_sixteen_columns_wide() {
        assert_eq!(
            Capability::ALL.len(),
            16,
            "CapabilityRow::capabilities is [bool; 16] and the flag offsets assume it"
        );
    }
}
