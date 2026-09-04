import { describe, expect, it } from 'vitest';
import { assertRoomAuthorityConfiguration, resolveRoomAuthorityMode } from './room-authority-policy.js';

describe('room authority deployment policy', () => {
  it('defaults to the reversible legacy path and accepts only named modes', () => {
    expect(resolveRoomAuthorityMode(undefined)).toBe('legacy');
    expect(resolveRoomAuthorityMode('')).toBe('legacy');
    expect(resolveRoomAuthorityMode('rust')).toBe('rust');
    expect(() => resolveRoomAuthorityMode('dual')).toThrow('ROOM_AUTHORITY_MODE must be one of: legacy, rust.');
  });

  it('requires the profile bridge and a private API origin before Rust room authority can boot', () => {
    expect(() => assertRoomAuthorityConfiguration('rust', 'legacy', 'https://api.test')).toThrow(
      'PROFILE_AUTHORITY_MODE=rust is required when ROOM_AUTHORITY_MODE=rust.'
    );
    expect(() => assertRoomAuthorityConfiguration('rust', 'rust', '')).toThrow(
      'TRADINGROOM_API_URL is required when ROOM_AUTHORITY_MODE=rust.'
    );
    expect(() => assertRoomAuthorityConfiguration('rust', 'rust', 'https://api.test')).not.toThrow();
    expect(() => assertRoomAuthorityConfiguration('legacy', 'legacy', undefined)).not.toThrow();
  });
});
