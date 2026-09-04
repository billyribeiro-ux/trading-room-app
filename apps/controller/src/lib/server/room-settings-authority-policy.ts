import type { ProfileAuthorityMode } from './profile-authority-policy.js';
import type { RoomAuthorityMode } from './room-authority-policy.js';

export const ROOM_SETTINGS_AUTHORITY_MODES = ['legacy', 'rust'] as const;
export type RoomSettingsAuthorityMode = (typeof ROOM_SETTINGS_AUTHORITY_MODES)[number];

export function resolveRoomSettingsAuthorityMode(configured: string | undefined): RoomSettingsAuthorityMode {
  if (configured === undefined || configured === '') return 'legacy';
  if (ROOM_SETTINGS_AUTHORITY_MODES.includes(configured as RoomSettingsAuthorityMode)) {
    return configured as RoomSettingsAuthorityMode;
  }
  throw new Error(`ROOM_SETTINGS_AUTHORITY_MODE must be one of: ${ROOM_SETTINGS_AUTHORITY_MODES.join(', ')}.`);
}

export function assertRoomSettingsAuthorityConfiguration(
  settingsMode: RoomSettingsAuthorityMode,
  roomMode: RoomAuthorityMode,
  profileMode: ProfileAuthorityMode,
  apiUrl: string | undefined
): void {
  if (settingsMode !== 'rust') return;
  if (profileMode !== 'rust' || roomMode !== 'rust') {
    throw new Error(
      'PROFILE_AUTHORITY_MODE=rust and ROOM_AUTHORITY_MODE=rust are required when ROOM_SETTINGS_AUTHORITY_MODE=rust.'
    );
  }
  if (!apiUrl?.trim()) {
    throw new Error('TRADINGROOM_API_URL is required when ROOM_SETTINGS_AUTHORITY_MODE=rust.');
  }
}
