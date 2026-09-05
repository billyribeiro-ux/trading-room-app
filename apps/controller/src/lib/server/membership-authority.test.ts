import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./tradingroom-api.js', () => ({
  inviteAccountRoomMember: vi.fn(),
  listAccountRoomMembers: vi.fn(),
  manageAccountRoomMembers: vi.fn(),
  refreshSession: vi.fn()
}));

import {
  inviteAccountRoomMember,
  listAccountRoomMembers,
  manageAccountRoomMembers,
  refreshSession
} from './tradingroom-api.js';
import {
  inviteMembershipAuthority,
  mutateMembershipAuthority,
  readMembershipAuthority
} from './membership-authority.js';

const context = {} as Parameters<typeof readMembershipAuthority>[0];
const enterpriseId = 'a0000000-0000-4000-8000-000000000001';
const roomId = 'a0000003-0000-4000-8000-000000000001';
const successfulList = { ok: true as const, status: 200, data: [] };
const successfulMutation = {
  ok: true as const,
  status: 200,
  data: { members: [], removedMemberIds: [], changed: 0 }
};

describe('membership authority transport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads, invites, and mutates the exact account/room coordinates', async () => {
    vi.mocked(listAccountRoomMembers).mockResolvedValue(successfulList);
    vi.mocked(inviteAccountRoomMember).mockResolvedValue(successfulMutation);
    vi.mocked(manageAccountRoomMembers).mockResolvedValue(successfulMutation);
    const invitation = { requestId: enterpriseId, email: 'member@example.test', displayName: 'Member' };
    const mutation = {
      requestId: enterpriseId,
      targets: [{ memberId: roomId, expectedRevision: 3 }],
      operation: { type: 'setMuted' as const, muted: true }
    };

    await expect(readMembershipAuthority(context, enterpriseId, roomId)).resolves.toEqual(successfulList);
    await expect(inviteMembershipAuthority(context, enterpriseId, roomId, invitation)).resolves.toEqual(
      successfulMutation
    );
    await expect(mutateMembershipAuthority(context, enterpriseId, roomId, mutation)).resolves.toEqual(
      successfulMutation
    );
    expect(listAccountRoomMembers).toHaveBeenCalledWith(context, enterpriseId, roomId);
    expect(inviteAccountRoomMember).toHaveBeenCalledWith(context, enterpriseId, roomId, invitation);
    expect(manageAccountRoomMembers).toHaveBeenCalledWith(context, enterpriseId, roomId, mutation);
  });

  it('refreshes once after expiry and never loops', async () => {
    vi.mocked(listAccountRoomMembers)
      .mockResolvedValueOnce({ ok: false, status: 401, code: 'unauthorized', message: 'unauthorized' })
      .mockResolvedValueOnce(successfulList);
    vi.mocked(refreshSession).mockResolvedValue({
      ok: true,
      status: 200,
      data: { userId: roomId, displayName: 'Owner', isPlatformAdmin: false, expiresAt: 1 }
    });
    await expect(readMembershipAuthority(context, enterpriseId, roomId)).resolves.toEqual(successfulList);
    expect(listAccountRoomMembers).toHaveBeenCalledTimes(2);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('returns a refresh refusal without repeating a mutation', async () => {
    vi.mocked(manageAccountRoomMembers).mockResolvedValue({
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'unauthorized'
    });
    const refused = { ok: false as const, status: 401, code: 'unauthorized', message: 'unauthorized' };
    vi.mocked(refreshSession).mockResolvedValue(refused);
    await expect(
      mutateMembershipAuthority(context, enterpriseId, roomId, {
        requestId: enterpriseId,
        targets: [{ memberId: roomId, expectedRevision: 3 }],
        operation: { type: 'remove' }
      })
    ).resolves.toEqual(refused);
    expect(manageAccountRoomMembers).toHaveBeenCalledTimes(1);
  });
});
