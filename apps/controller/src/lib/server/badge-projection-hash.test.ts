import { describe, expect, it } from 'vitest';
import type { ManagedBadge } from './tradingroom-api.generated.js';
import { badgeAuthorityContentHash } from './badge-projection.js';

function badge(): ManagedBadge {
  return {
    id: '40000000-0000-8000-8000-000000000001',
    revision: 3,
    label: 'Desk',
    textColor: '#ffffff',
    backgroundColor: '#123456',
    emoji: 'D',
    imageDataUrl: null,
    darkThemeBadgeId: null,
    autoAssignRoles: ['moderator'],
    createdAt: '2026-09-05T10:00:00Z',
    updatedAt: '2026-09-05T10:05:00Z'
  };
}

describe('badge projection content proof', () => {
  it('canonicalizes equivalent RFC3339 timestamps and covers every authoritative field', () => {
    const canonical = badge();
    expect(
      badgeAuthorityContentHash({
        ...canonical,
        createdAt: '2026-09-05T06:00:00-04:00',
        updatedAt: '2026-09-05T10:05:00.000+00:00'
      })
    ).toBe(badgeAuthorityContentHash(canonical));
    expect(badgeAuthorityContentHash({ ...canonical, revision: 4 })).not.toBe(badgeAuthorityContentHash(canonical));
    expect(badgeAuthorityContentHash({ ...canonical, autoAssignRoles: ['presenter'] })).not.toBe(
      badgeAuthorityContentHash(canonical)
    );
    expect(
      badgeAuthorityContentHash({
        ...canonical,
        darkThemeBadgeId: '40000000-0000-8000-8000-000000000002'
      })
    ).not.toBe(badgeAuthorityContentHash(canonical));
  });

  it('refuses an invalid timestamp instead of manufacturing a durable proof', () => {
    expect(() => badgeAuthorityContentHash({ ...badge(), updatedAt: 'not-a-time' })).toThrow('invalid-updated-time');
  });
});
