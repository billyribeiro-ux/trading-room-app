import { beforeEach, describe, expect, test, vi } from 'vitest';

const privateEnv = vi.hoisted(() => ({
  TRADINGROOM_API_URL: 'https://authority.example.test',
  TRADINGROOM_INTERNAL_SECRET: 's'.repeat(32)
}));
vi.mock('$app/env/private', () => privateEnv);

import { closeRoomVisitInAuthority, launchGuestRoomVisitInAuthority } from './room-visit-authority';

const enterpriseId = 'a0000000-0000-4000-8000-000000000001';
const roomId = 'a0000003-0000-4000-8000-000000000001';
const userId = 'a0000001-0000-4000-8000-000000000001';

describe('canonical visit close transport', () => {
  beforeEach(() => {
    privateEnv.TRADINGROOM_API_URL = 'https://authority.example.test';
    privateEnv.TRADINGROOM_INTERNAL_SECRET = 's'.repeat(32);
  });

  test('sends only the scoped ids and fixed service credential', async () => {
    const fetch: typeof globalThis.fetch = vi.fn(async (url: URL | RequestInfo, init?: RequestInit) => {
      expect(String(url)).toBe(
        `https://authority.example.test/internal/v1/accounts/${enterpriseId}/rooms/${roomId}/visits/close`
      );
      expect(init?.headers).toEqual({ authorization: `Bearer ${'s'.repeat(32)}`, 'content-type': 'application/json' });
      expect(JSON.parse(String(init?.body))).toEqual({ userId });
      return new Response(JSON.stringify({ closed: true }), { status: 200 });
    });
    await expect(closeRoomVisitInAuthority({ enterpriseId, roomId, userId, fetch })).resolves.toEqual({
      ok: true,
      status: 200,
      data: { closed: true }
    });
  });

  test('fails closed on mappings, cookies, response shape, and missing configuration', async () => {
    expect((await closeRoomVisitInAuthority({ enterpriseId: 'bad', roomId, userId })).ok).toBe(false);
    expect(
      (
        await closeRoomVisitInAuthority({
          enterpriseId,
          roomId,
          userId,
          fetch: async () => new Response(JSON.stringify({ closed: true }), { headers: { 'set-cookie': 'x=y' } })
        })
      ).ok
    ).toBe(false);
    expect(
      (
        await closeRoomVisitInAuthority({
          enterpriseId,
          roomId,
          userId,
          fetch: async () => new Response(JSON.stringify({ closed: true, extra: true }))
        })
      ).ok
    ).toBe(false);
    privateEnv.TRADINGROOM_INTERNAL_SECRET = 'short';
    expect((await closeRoomVisitInAuthority({ enterpriseId, roomId, userId })).status).toBe(503);
  });

  test('forwards guest attribution and accepts only the exact canonical visit', async () => {
    const visit = {
      visitId: 'a0000008-0000-4000-8000-000000000001',
      roomId,
      shortCode: 'room-code',
      userId,
      email: 'guest@example.test',
      displayName: 'Guest User',
      enteredAt: '2026-09-05T12:00:00Z'
    };
    const fetch: typeof globalThis.fetch = vi.fn(async (url: URL | RequestInfo, init?: RequestInit) => {
      expect(String(url)).toContain('/visits/guest-launch');
      const headers = new Headers(init?.headers);
      expect(headers.get('authorization')).toBe(`Bearer ${'s'.repeat(32)}`);
      expect(headers.get('x-forwarded-for')).toBe('203.0.113.4');
      expect(headers.get('user-agent')).toBe('guest-agent');
      expect(JSON.parse(String(init?.body))).toEqual({
        requestId: userId,
        email: 'guest@example.test',
        displayName: 'Guest User'
      });
      return new Response(JSON.stringify(visit), { status: 200 });
    });
    await expect(
      launchGuestRoomVisitInAuthority({
        enterpriseId,
        roomId,
        requestId: userId,
        email: 'GUEST@example.test',
        displayName: ' Guest User ',
        clientAddress: '203.0.113.4',
        userAgent: 'guest-agent',
        fetch
      })
    ).resolves.toEqual({ ok: true, status: 200, data: visit });
  });
});
