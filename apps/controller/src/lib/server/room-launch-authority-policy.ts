export const ROOM_LAUNCH_AUTHORITY_MODES = ['legacy', 'rust'] as const;
export type RoomLaunchAuthorityMode = (typeof ROOM_LAUNCH_AUTHORITY_MODES)[number];

export function resolveRoomLaunchAuthorityMode(configured: string | undefined): RoomLaunchAuthorityMode {
  if (configured === undefined || configured === '') return 'legacy';
  if (configured === 'legacy' || configured === 'rust') return configured;
  throw new Error(`ROOM_LAUNCH_AUTHORITY_MODE must be one of: ${ROOM_LAUNCH_AUTHORITY_MODES.join(', ')}.`);
}

/** Launch is the final Gate 3 slice and may activate only after every authority it consumes. */
export function assertRoomLaunchAuthorityConfiguration(
  launchMode: RoomLaunchAuthorityMode,
  customerApiKeyMode: 'legacy' | 'rust',
  tradingRoomApiUrl: string | undefined,
  tradingRoomInternalSecret: string | undefined,
  roomBaseUrl: string | undefined,
  roomJwtSecret: string | undefined
): void {
  if (launchMode !== 'rust') return;
  if (customerApiKeyMode !== 'rust') {
    throw new Error('CUSTOMER_API_KEY_AUTHORITY_MODE=rust is required when ROOM_LAUNCH_AUTHORITY_MODE=rust.');
  }
  if (!tradingRoomApiUrl?.trim()) {
    throw new Error('TRADINGROOM_API_URL is required when ROOM_LAUNCH_AUTHORITY_MODE=rust.');
  }
  if (!tradingRoomInternalSecret || tradingRoomInternalSecret.length < 32) {
    throw new Error('A 32+ character TRADINGROOM_INTERNAL_SECRET is required when ROOM_LAUNCH_AUTHORITY_MODE=rust.');
  }
  if (!roomBaseUrl?.trim()) {
    throw new Error('ROOM_BASE_URL is required when ROOM_LAUNCH_AUTHORITY_MODE=rust.');
  }
  if (!roomJwtSecret || roomJwtSecret.length < 32) {
    throw new Error('A 32+ character ROOM_JWT_SECRET is required when ROOM_LAUNCH_AUTHORITY_MODE=rust.');
  }
}
