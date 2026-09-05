import { describe, expect, it } from 'vitest';
import type { ManagedMember } from './tradingroom-api.generated.js';
import { membershipAuthorityContentHash } from './membership-projection.js';

function member(): ManagedMember {
  return {
    id: '40000000-0000-8000-8000-000000000001',
    roomId: '20000000-0000-8000-8000-000000000001',
    userId: '30000000-0000-8000-8000-000000000001',
    email: 'member@example.test',
    displayName: 'Member',
    role: 'member',
    revision: 3,
    badges: [],
    canPublishMic: false,
    canPublishScreen: false,
    canPublishCam: false,
    canUseAdminChat: false,
    canEditNotes: false,
    canAccessFiles: false,
    canAccessArchives: true,
    isMuted: false,
    isBanned: false,
    isPmRestricted: false,
    isTrial: false,
    hidePersonalInfo: false,
    hideUserCount: false,
    isPaused: false,
    adminNote: null,
    approvalStatus: 'approved',
    hasMobileApp: false,
    hasPassword: false,
    lastSeenAt: '2026-09-04T10:00:00Z',
    invitedAt: null,
    joinedAt: '2026-09-04T10:00:00Z',
    createdAt: '2026-09-04T10:00:00Z'
  };
}

describe('membership projection content proof', () => {
  it('is insensitive to equivalent RFC3339 spellings but sensitive to authoritative data', () => {
    const canonical = member();
    const equivalent = {
      ...canonical,
      lastSeenAt: '2026-09-04T10:00:00.000+00:00',
      joinedAt: '2026-09-04T10:00:00.000Z',
      createdAt: '2026-09-04T06:00:00-04:00'
    };
    expect(membershipAuthorityContentHash(equivalent)).toBe(membershipAuthorityContentHash(canonical));
    expect(membershipAuthorityContentHash({ ...canonical, canPublishMic: true })).not.toBe(
      membershipAuthorityContentHash(canonical)
    );
  });

  it('refuses an invalid timestamp instead of manufacturing a durable proof', () => {
    expect(() => membershipAuthorityContentHash({ ...member(), createdAt: 'not-a-time' })).toThrow(
      'invalid-created-time'
    );
  });
});
