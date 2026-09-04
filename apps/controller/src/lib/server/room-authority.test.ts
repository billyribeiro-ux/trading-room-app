import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createAccountRoom, listAccountRooms, refreshSession, setAccountRoomArchived } = vi.hoisted(() => ({
  createAccountRoom: vi.fn(),
  listAccountRooms: vi.fn(),
  refreshSession: vi.fn(),
  setAccountRoomArchived: vi.fn()
}));

vi.mock('./tradingroom-api', () => ({
  createAccountRoom,
  listAccountRooms,
  refreshSession,
  setAccountRoomArchived
}));

import { archiveRoomInAuthority, createRoomInAuthority, readRoomAuthority } from './room-authority';

const context = {} as Parameters<typeof readRoomAuthority>[0];
const enterpriseId = 'a0000000-0000-4000-8000-000000000001';
const roomId = 'a0000003-0000-4000-8000-000000000001';
const success = { ok: true as const, status: 200, data: [] };
const unauthorized = {
  ok: false as const,
  status: 401,
  code: 'unauthorized',
  message: 'unauthorized'
};

describe('canonical room operations use one bounded access refresh', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not rotate a current read', async () => {
    listAccountRooms.mockResolvedValueOnce(success);
    await expect(readRoomAuthority(context, enterpriseId)).resolves.toEqual(success);
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('refreshes and replays an idempotent create exactly once', async () => {
    createAccountRoom.mockResolvedValueOnce(unauthorized).mockResolvedValueOnce(success);
    refreshSession.mockResolvedValueOnce({ ok: true, status: 200, data: {} });
    const request = { requestId: roomId, name: 'Main' };
    await expect(createRoomInAuthority(context, enterpriseId, request)).resolves.toEqual(success);
    expect(createAccountRoom).toHaveBeenNthCalledWith(1, context, enterpriseId, request);
    expect(createAccountRoom).toHaveBeenNthCalledWith(2, context, enterpriseId, request);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('refreshes and replays an absolute archive transition exactly once', async () => {
    setAccountRoomArchived.mockResolvedValueOnce(unauthorized).mockResolvedValueOnce(success);
    refreshSession.mockResolvedValueOnce({ ok: true, status: 200, data: {} });
    await expect(archiveRoomInAuthority(context, enterpriseId, roomId, { archived: true })).resolves.toEqual(success);
    expect(setAccountRoomArchived).toHaveBeenCalledTimes(2);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('does not retry dependency failures or a failed refresh', async () => {
    const unavailable = {
      ok: false as const,
      status: 503,
      code: 'unavailable',
      message: 'unavailable'
    };
    listAccountRooms.mockResolvedValueOnce(unavailable);
    await expect(readRoomAuthority(context, enterpriseId)).resolves.toEqual(unavailable);
    expect(refreshSession).not.toHaveBeenCalled();

    listAccountRooms.mockResolvedValueOnce(unauthorized);
    refreshSession.mockResolvedValueOnce(unavailable);
    await expect(readRoomAuthority(context, enterpriseId)).resolves.toEqual(unavailable);
    expect(listAccountRooms).toHaveBeenCalledTimes(2);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });
});
