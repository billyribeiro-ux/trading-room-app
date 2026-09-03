import { describe, expect, it } from 'vitest';
import {
  assertProfileAuthorityConfiguration,
  authorityBindingFailure,
  resolveProfileAuthorityMode
} from './profile-authority-policy';
import type { AccountBootstrap } from './tradingroom-api.generated';

const USER_ID = 'a0000001-0000-4000-8000-000000000001';
const ENTERPRISE_ID = 'a0000000-0000-4000-8000-000000000001';

function bootstrap(): AccountBootstrap {
  return {
    user: { id: USER_ID, displayName: 'Canonical', isPlatformAdmin: false, isGuest: false, preferences: {} },
    accounts: [{ id: ENTERPRISE_ID, name: 'Acme', slug: 'acme', role: 'owner', rooms: [] }]
  };
}

describe('profile authority cutover policy', () => {
  it('defaults to the rollback-safe legacy authority and parses only explicit modes', () => {
    expect(resolveProfileAuthorityMode(undefined)).toBe('legacy');
    expect(resolveProfileAuthorityMode('')).toBe('legacy');
    expect(resolveProfileAuthorityMode('rust')).toBe('rust');
    expect(() => resolveProfileAuthorityMode('dual')).toThrow(
      'PROFILE_AUTHORITY_MODE must be one of: legacy, rust.'
    );
    expect(() => resolveProfileAuthorityMode(' rust ')).toThrow();
  });

  it('will not activate Rust authority without an explicit private origin', () => {
    expect(() => assertProfileAuthorityConfiguration('rust', undefined)).toThrow(
      'TRADINGROOM_API_URL is required when PROFILE_AUTHORITY_MODE=rust.'
    );
    expect(() => assertProfileAuthorityConfiguration('rust', '  ')).toThrow();
    expect(assertProfileAuthorityConfiguration('legacy', undefined)).toBeUndefined();
    expect(assertProfileAuthorityConfiguration('rust', 'https://authority.example.test')).toBeUndefined();
  });

  it('binds both immutable ids and refuses every fallback-shaped mismatch', () => {
    const mapped = { authorityUserId: USER_ID, authorityEnterpriseId: ENTERPRISE_ID };
    expect(authorityBindingFailure(mapped, bootstrap())).toBeUndefined();
    expect(authorityBindingFailure({ ...mapped, authorityUserId: null }, bootstrap())).toBe(
      'legacy identity is not reconciled'
    );
    expect(
      authorityBindingFailure(
        { ...mapped, authorityUserId: 'b0000001-0000-4000-8000-000000000001' },
        bootstrap()
      )
    ).toContain('user id');
    expect(authorityBindingFailure(mapped, { ...bootstrap(), accounts: [] })).toContain('enterprise membership');
    expect(
      authorityBindingFailure(mapped, {
        ...bootstrap(),
        user: { ...bootstrap().user, isGuest: true }
      })
    ).toContain('guest');
  });
});
