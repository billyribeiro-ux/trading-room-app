import { describe, expect, test } from 'vitest';
import { assertRoomLaunchAuthorityConfiguration, resolveRoomLaunchAuthorityMode } from './room-launch-authority-policy';

describe('room launch authority policy', () => {
  test('defaults reversibly to legacy and rejects unknown values', () => {
    expect(resolveRoomLaunchAuthorityMode(undefined)).toBe('legacy');
    expect(resolveRoomLaunchAuthorityMode('')).toBe('legacy');
    expect(resolveRoomLaunchAuthorityMode('rust')).toBe('rust');
    expect(() => resolveRoomLaunchAuthorityMode('dual')).toThrow(
      'ROOM_LAUNCH_AUTHORITY_MODE must be one of: legacy, rust.'
    );
  });

  test('requires the complete dependency and credential chain before activation', () => {
    const valid = [
      'rust',
      'rust',
      'https://api.example.test',
      'i'.repeat(32),
      'https://room.example.test',
      'j'.repeat(32)
    ] as const;
    expect(() => assertRoomLaunchAuthorityConfiguration(...valid)).not.toThrow();
    expect(() =>
      assertRoomLaunchAuthorityConfiguration('rust', 'legacy', valid[2], valid[3], valid[4], valid[5])
    ).toThrow('CUSTOMER_API_KEY_AUTHORITY_MODE=rust');
    expect(() => assertRoomLaunchAuthorityConfiguration('rust', 'rust', '', valid[3], valid[4], valid[5])).toThrow(
      'TRADINGROOM_API_URL'
    );
    expect(() => assertRoomLaunchAuthorityConfiguration('rust', 'rust', valid[2], 'short', valid[4], valid[5])).toThrow(
      'TRADINGROOM_INTERNAL_SECRET'
    );
    expect(() => assertRoomLaunchAuthorityConfiguration('rust', 'rust', valid[2], valid[3], '', valid[5])).toThrow(
      'ROOM_BASE_URL'
    );
    expect(() => assertRoomLaunchAuthorityConfiguration('rust', 'rust', valid[2], valid[3], valid[4], 'short')).toThrow(
      'ROOM_JWT_SECRET'
    );
    expect(() =>
      assertRoomLaunchAuthorityConfiguration('legacy', 'legacy', undefined, undefined, undefined, undefined)
    ).not.toThrow();
  });
});
