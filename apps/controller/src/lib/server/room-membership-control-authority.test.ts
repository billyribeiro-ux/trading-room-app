import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/env/private', () => ({
  TRADINGROOM_API_URL: 'https://authority.example.test',
  TRADINGROOM_INTERNAL_SECRET: 'controller-membership-secret-32-bytes-minimum'
}));

import { mutateRoomMembershipFromController } from './room-membership-control-authority.js';

const enterpriseId = 'a0000000-0000-4000-8000-000000000001';
const roomId = 'a0000003-0000-4000-8000-000000000001';
const requestId = 'a0000004-0000-4000-8000-000000000001';
const actorMemberId = 'a0000002-0000-4000-8000-000000000001';
const targetMemberId = 'a0000002-0000-4000-8000-000000000002';
const member = {
  id: targetMemberId,
  roomId,
  userId: 'a0000001-0000-4000-8000-000000000002',
  email: 'member@example.test',
  displayName: 'Member',
  role: 'member' as const,
  revision: 2,
  badges: [],
  canPublishMic: false,
  canPublishScreen: false,
  canPublishCam: false,
  canUseAdminChat: false,
  canEditNotes: false,
  canAccessFiles: false,
  canAccessArchives: true,
  isMuted: true,
  isBanned: false,
  isPmRestricted: false,
  isTrial: false,
  hidePersonalInfo: false,
  hideUserCount: false,
  isPaused: false,
  adminNote: null,
  approvalStatus: 'approved' as const,
  hasMobileApp: false,
  hasPassword: false,
  lastSeenAt: null,
  invitedAt: null,
  joinedAt: null,
  createdAt: '2026-09-04T10:00:00Z'
};

describe('controller-to-Rust room membership control', () => {
  it('sends only the exact service-authenticated, revision-locked request', async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        `https://authority.example.test/internal/v1/accounts/${enterpriseId}/rooms/${roomId}/members`
      );
      expect(init?.method).toBe('POST');
      expect(new Headers(init?.headers).get('authorization')).toBe(
        'Bearer controller-membership-secret-32-bytes-minimum'
      );
      expect(JSON.parse(String(init?.body))).toEqual({
        requestId,
        actorMemberId,
        target: { memberId: targetMemberId, expectedRevision: 1 },
        operation: { type: 'setMuted', muted: true }
      });
      return new Response(JSON.stringify({ members: [member], removedMemberIds: [], changed: 1 }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    });
    await expect(
      mutateRoomMembershipFromController({
        enterpriseId,
        roomId,
        requestId,
        actorMemberId,
        target: { memberId: targetMemberId, expectedRevision: 1 },
        operation: { type: 'setMuted', muted: true },
        fetch
      })
    ).resolves.toEqual({
      ok: true,
      status: 200,
      data: { members: [member], removedMemberIds: [], changed: 1 }
    });
  });

  it('rejects credentials or cookies in an otherwise successful response', async () => {
    const input = {
      enterpriseId,
      roomId,
      requestId,
      actorMemberId,
      target: { memberId: targetMemberId, expectedRevision: 1 },
      operation: { type: 'setBanned' as const, banned: true }
    };
    const leakingBody = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ members: [{ ...member, passwordHash: 'secret' }], removedMemberIds: [], changed: 1 }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
    );
    await expect(mutateRoomMembershipFromController({ ...input, fetch: leakingBody })).resolves.toMatchObject({
      ok: false,
      status: 502,
      code: 'invalidUpstreamResponse'
    });

    const leakingCookie = vi.fn(
      async () =>
        new Response(JSON.stringify({ members: [member], removedMemberIds: [], changed: 1 }), {
          status: 200,
          headers: { 'content-type': 'application/json', 'set-cookie': 'session=forbidden; Path=/; HttpOnly' }
        })
    );
    await expect(mutateRoomMembershipFromController({ ...input, fetch: leakingCookie })).resolves.toMatchObject({
      ok: false,
      status: 502,
      code: 'invalidUpstreamCookie'
    });
  });
});
