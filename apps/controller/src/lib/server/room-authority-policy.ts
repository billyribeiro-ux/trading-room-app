export const ROOM_AUTHORITY_MODES = ['legacy', 'rust'] as const;
export type RoomAuthorityMode = (typeof ROOM_AUTHORITY_MODES)[number];

export function resolveRoomAuthorityMode(configured: string | undefined): RoomAuthorityMode {
  if (configured === undefined || configured === '') return 'legacy';
  if (configured === 'legacy' || configured === 'rust') return configured;
  throw new Error(`ROOM_AUTHORITY_MODE must be one of: ${ROOM_AUTHORITY_MODES.join(', ')}.`);
}

/** Rooms depend on the reconciled profile/session bridge and may never activate ahead of it. */
export function assertRoomAuthorityConfiguration(
  roomMode: RoomAuthorityMode,
  profileMode: 'legacy' | 'rust',
  tradingRoomApiUrl: string | undefined
): void {
  if (roomMode !== 'rust') return;
  if (profileMode !== 'rust') {
    throw new Error('PROFILE_AUTHORITY_MODE=rust is required when ROOM_AUTHORITY_MODE=rust.');
  }
  if (!tradingRoomApiUrl?.trim()) {
    throw new Error('TRADINGROOM_API_URL is required when ROOM_AUTHORITY_MODE=rust.');
  }
}
