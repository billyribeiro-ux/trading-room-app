import type { ProfileAuthorityMode } from './profile-authority-policy.js';
import type { RoomAuthorityMode } from './room-authority-policy.js';
import type { RoomSettingsAuthorityMode } from './room-settings-authority-policy.js';

export const MEMBERSHIP_AUTHORITY_MODES = ['legacy', 'rust'] as const;
export type MembershipAuthorityMode = (typeof MEMBERSHIP_AUTHORITY_MODES)[number];

export function resolveMembershipAuthorityMode(configured: string | undefined): MembershipAuthorityMode {
  if (configured === undefined || configured === '') return 'legacy';
  if (MEMBERSHIP_AUTHORITY_MODES.includes(configured as MembershipAuthorityMode)) {
    return configured as MembershipAuthorityMode;
  }
  throw new Error(`MEMBERSHIP_AUTHORITY_MODE must be one of: ${MEMBERSHIP_AUTHORITY_MODES.join(', ')}.`);
}

export function assertMembershipAuthorityConfiguration(
  membershipMode: MembershipAuthorityMode,
  settingsMode: RoomSettingsAuthorityMode,
  roomMode: RoomAuthorityMode,
  profileMode: ProfileAuthorityMode,
  apiUrl: string | undefined,
  internalSecret: string | undefined
): void {
  if (membershipMode !== 'rust') return;
  if (profileMode !== 'rust' || roomMode !== 'rust' || settingsMode !== 'rust') {
    throw new Error(
      'PROFILE_AUTHORITY_MODE=rust, ROOM_AUTHORITY_MODE=rust, and ROOM_SETTINGS_AUTHORITY_MODE=rust are required when MEMBERSHIP_AUTHORITY_MODE=rust.'
    );
  }
  if (!apiUrl?.trim()) {
    throw new Error('TRADINGROOM_API_URL is required when MEMBERSHIP_AUTHORITY_MODE=rust.');
  }
  if (
    !internalSecret ||
    internalSecret.length < 32 ||
    internalSecret.length > 256 ||
    !/^[!-~]+$/.test(internalSecret)
  ) {
    throw new Error(
      'TRADINGROOM_INTERNAL_SECRET must contain 32 to 256 non-whitespace ASCII characters when MEMBERSHIP_AUTHORITY_MODE=rust.'
    );
  }
}
