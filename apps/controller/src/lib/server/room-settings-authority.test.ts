import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./tradingroom-api.js', () => ({
  getAccountRoomSettings: vi.fn(),
  patchAccountRoomSettings: vi.fn(),
  refreshSession: vi.fn()
}));

import { getAccountRoomSettings, patchAccountRoomSettings, refreshSession } from './tradingroom-api.js';
import { patchRoomSettingsAuthority, readRoomSettingsAuthority } from './room-settings-authority.js';

const context = {} as Parameters<typeof readRoomSettingsAuthority>[0];
const enterpriseId = 'a0000000-0000-4000-8000-000000000001';
const roomId = 'a0000003-0000-4000-8000-000000000001';
const snapshot = { ok: true as const, status: 200, data: { roomId, revision: 3, settings: { isLocked: true } } };

describe('room settings authority transport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads and mutates the exact account/room coordinates', async () => {
    vi.mocked(getAccountRoomSettings).mockResolvedValue(snapshot);
    vi.mocked(patchAccountRoomSettings).mockResolvedValue(snapshot);
    const request = {
      requestId: '10000000-0000-4000-8000-000000000001',
      expectedRevision: 2,
      base: { isLocked: false },
      updates: { isLocked: true }
    };
    await expect(readRoomSettingsAuthority(context, enterpriseId, roomId)).resolves.toEqual(snapshot);
    await expect(patchRoomSettingsAuthority(context, enterpriseId, roomId, request)).resolves.toEqual(snapshot);
    expect(getAccountRoomSettings).toHaveBeenCalledWith(context, enterpriseId, roomId);
    expect(patchAccountRoomSettings).toHaveBeenCalledWith(context, enterpriseId, roomId, request);
  });

  it('refreshes once after an expired access cookie and never loops', async () => {
    vi.mocked(getAccountRoomSettings)
      .mockResolvedValueOnce({ ok: false, status: 401, code: 'unauthorized', message: 'unauthorized' })
      .mockResolvedValueOnce(snapshot);
    vi.mocked(refreshSession).mockResolvedValue({
      ok: true,
      status: 200,
      data: { userId: roomId, displayName: 'Owner', isPlatformAdmin: false, expiresAt: 1 }
    });
    await expect(readRoomSettingsAuthority(context, enterpriseId, roomId)).resolves.toEqual(snapshot);
    expect(getAccountRoomSettings).toHaveBeenCalledTimes(2);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('returns a refresh refusal without repeating the data mutation', async () => {
    vi.mocked(patchAccountRoomSettings).mockResolvedValue({
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'unauthorized'
    });
    const refused = { ok: false as const, status: 401, code: 'unauthorized', message: 'unauthorized' };
    vi.mocked(refreshSession).mockResolvedValue(refused);
    await expect(
      patchRoomSettingsAuthority(context, enterpriseId, roomId, {
        requestId: '10000000-0000-4000-8000-000000000001',
        expectedRevision: 0,
        base: { isLocked: null },
        updates: { isLocked: true }
      })
    ).resolves.toEqual(refused);
    expect(patchAccountRoomSettings).toHaveBeenCalledTimes(1);
  });
});
