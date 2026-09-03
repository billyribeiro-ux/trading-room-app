import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAccountBootstrap, refreshSession } = vi.hoisted(() => ({
  getAccountBootstrap: vi.fn(),
  refreshSession: vi.fn()
}));

vi.mock('./tradingroom-api', () => ({ getAccountBootstrap, refreshSession }));

import { readProfileAuthority } from './profile-authority';

const context = {} as Parameters<typeof readProfileAuthority>[0];
const success = {
  ok: true as const,
  status: 200,
  data: {
    user: {
      id: 'a0000001-0000-4000-8000-000000000001',
      displayName: 'Canonical',
      isPlatformAdmin: false,
      isGuest: false,
      preferences: {}
    },
    accounts: []
  }
};

describe('canonical profile read with bounded refresh', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a current access-token read without rotating anything', async () => {
    getAccountBootstrap.mockResolvedValueOnce(success);
    await expect(readProfileAuthority(context)).resolves.toEqual(success);
    expect(refreshSession).not.toHaveBeenCalled();
    expect(getAccountBootstrap).toHaveBeenCalledTimes(1);
  });

  it('refreshes exactly once after 401 and re-reads committed state', async () => {
    getAccountBootstrap
      .mockResolvedValueOnce({ ok: false, status: 401, code: 'unauthorized', message: 'unauthorized' })
      .mockResolvedValueOnce(success);
    refreshSession.mockResolvedValueOnce({ ok: true, status: 200, data: {} });

    await expect(readProfileAuthority(context)).resolves.toEqual(success);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(getAccountBootstrap).toHaveBeenCalledTimes(2);
  });

  it('never retries a dependency failure or a failed refresh', async () => {
    const unavailable = { ok: false, status: 503, code: 'unavailable', message: 'unavailable' };
    getAccountBootstrap.mockResolvedValueOnce(unavailable);
    await expect(readProfileAuthority(context)).resolves.toEqual(unavailable);
    expect(refreshSession).not.toHaveBeenCalled();

    getAccountBootstrap.mockResolvedValueOnce({
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'unauthorized'
    });
    refreshSession.mockResolvedValueOnce(unavailable);
    await expect(readProfileAuthority(context)).resolves.toEqual(unavailable);
    expect(getAccountBootstrap).toHaveBeenCalledTimes(2);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });
});
