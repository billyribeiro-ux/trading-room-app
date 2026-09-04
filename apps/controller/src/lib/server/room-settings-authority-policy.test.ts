import { describe, expect, it } from 'vitest';
import {
  assertRoomSettingsAuthorityConfiguration,
  resolveRoomSettingsAuthorityMode
} from './room-settings-authority-policy.js';

describe('room settings authority policy', () => {
  it('defaults safely and rejects invented modes', () => {
    expect(resolveRoomSettingsAuthorityMode(undefined)).toBe('legacy');
    expect(resolveRoomSettingsAuthorityMode('')).toBe('legacy');
    expect(resolveRoomSettingsAuthorityMode('rust')).toBe('rust');
    expect(() => resolveRoomSettingsAuthorityMode('dual')).toThrow(
      'ROOM_SETTINGS_AUTHORITY_MODE must be one of: legacy, rust.'
    );
  });

  it('requires every upstream authority and the private API origin', () => {
    expect(() => assertRoomSettingsAuthorityConfiguration('rust', 'legacy', 'rust', 'https://api.test')).toThrow(
      'PROFILE_AUTHORITY_MODE=rust and ROOM_AUTHORITY_MODE=rust are required'
    );
    expect(() => assertRoomSettingsAuthorityConfiguration('rust', 'rust', 'legacy', 'https://api.test')).toThrow();
    expect(() => assertRoomSettingsAuthorityConfiguration('rust', 'rust', 'rust', '')).toThrow(
      'TRADINGROOM_API_URL is required'
    );
    expect(() => assertRoomSettingsAuthorityConfiguration('rust', 'rust', 'rust', 'https://api.test')).not.toThrow();
    expect(() => assertRoomSettingsAuthorityConfiguration('legacy', 'legacy', 'legacy', undefined)).not.toThrow();
  });
});
