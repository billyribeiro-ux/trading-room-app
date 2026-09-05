import { describe, expect, it } from 'vitest';
import {
  assertMembershipAuthorityConfiguration,
  resolveMembershipAuthorityMode
} from './membership-authority-policy.js';

describe('membership authority policy', () => {
  it('defaults safely and accepts only explicit authority modes', () => {
    expect(resolveMembershipAuthorityMode(undefined)).toBe('legacy');
    expect(resolveMembershipAuthorityMode('')).toBe('legacy');
    expect(resolveMembershipAuthorityMode('legacy')).toBe('legacy');
    expect(resolveMembershipAuthorityMode('rust')).toBe('rust');
    expect(() => resolveMembershipAuthorityMode('dual')).toThrow(
      'MEMBERSHIP_AUTHORITY_MODE must be one of: legacy, rust.'
    );
  });

  it('refuses a partial Rust authority topology', () => {
    expect(() =>
      assertMembershipAuthorityConfiguration('rust', 'rust', 'rust', 'legacy', 'http://api', 'x'.repeat(32))
    ).toThrow(
      'PROFILE_AUTHORITY_MODE=rust, ROOM_AUTHORITY_MODE=rust, and ROOM_SETTINGS_AUTHORITY_MODE=rust are required'
    );
    expect(() =>
      assertMembershipAuthorityConfiguration('rust', 'legacy', 'rust', 'rust', 'http://api', 'x'.repeat(32))
    ).toThrow(
      'PROFILE_AUTHORITY_MODE=rust, ROOM_AUTHORITY_MODE=rust, and ROOM_SETTINGS_AUTHORITY_MODE=rust are required'
    );
    expect(() => assertMembershipAuthorityConfiguration('rust', 'rust', 'rust', 'rust', '', 'x'.repeat(32))).toThrow(
      'TRADINGROOM_API_URL is required when MEMBERSHIP_AUTHORITY_MODE=rust.'
    );
    expect(() => assertMembershipAuthorityConfiguration('rust', 'rust', 'rust', 'rust', 'http://api', 'short')).toThrow(
      'TRADINGROOM_INTERNAL_SECRET must contain 32 to 256 non-whitespace ASCII characters'
    );
  });

  it('accepts the complete ordered Rust topology and never constrains legacy mode', () => {
    expect(() =>
      assertMembershipAuthorityConfiguration('rust', 'rust', 'rust', 'rust', 'http://api', 'x'.repeat(32))
    ).not.toThrow();
    expect(() =>
      assertMembershipAuthorityConfiguration('legacy', 'legacy', 'legacy', 'legacy', undefined, undefined)
    ).not.toThrow();
  });
});
