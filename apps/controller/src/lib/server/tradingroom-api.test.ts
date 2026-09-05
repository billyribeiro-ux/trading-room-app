import type { Cookies } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  UnsafeApiCookieError,
  apiCookieHeader,
  applyApiCookies,
  clearApiCookies,
  createAccountRoom,
  getAccountRoomSettings,
  getAccountBootstrap,
  isArchiveAccountRoomRequest,
  isCreateAccountRoomRequest,
  isLoginRequest,
  isPatchAccountRoomSettingsRequest,
  isPreferenceRequest,
  isPreferencesRequest,
  isProfileUpdateRequest,
  listAccountRooms,
  login,
  logout,
  patchAccountRoomSettings,
  setAccountRoomArchived,
  updateAccountProfile
} from './tradingroom-api';

const USER_ID = 'a0000001-0000-4000-8000-000000000001';
const ACCOUNT_ID = 'a0000000-0000-4000-8000-000000000001';
const ROOM_ID = 'a0000003-0000-4000-8000-000000000001';
const MEMBER_ID = 'a0000002-0000-4000-8000-000000000001';

function cookieJar(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const set = vi.fn((name: string, value: string) => values.set(name, value));
  return {
    cookies: {
      get: vi.fn((name: string) => values.get(name)),
      set
    } as unknown as Cookies,
    set,
    values
  };
}

function sessionHeaders(): Headers {
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.append('set-cookie', `${ACCESS_COOKIE}=access-value; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`);
  headers.append(
    'set-cookie',
    `${REFRESH_COOKIE}=refresh-value; Max-Age=1209600; Path=/; HttpOnly; Secure; SameSite=Strict`
  );
  return headers;
}

function expiredSessionHeaders(): Headers {
  const headers = new Headers();
  headers.append('set-cookie', `${ACCESS_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`);
  headers.append('set-cookie', `${REFRESH_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`);
  return headers;
}

describe('Rust API cookie boundary', () => {
  it('accepts only the exact access and refresh cookie attributes', () => {
    const jar = cookieJar();
    applyApiCookies(sessionHeaders().getSetCookie(), jar.cookies);

    expect(jar.set).toHaveBeenCalledTimes(2);
    expect(jar.set).toHaveBeenNthCalledWith(1, ACCESS_COOKIE, 'access-value', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600
    });
    expect(jar.set).toHaveBeenNthCalledWith(2, REFRESH_COOKIE, 'refresh-value', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1_209_600
    });
  });

  it.each([
    `${ACCESS_COOKIE}=x; Max-Age=600; Path=/; HttpOnly; SameSite=Lax`,
    `${ACCESS_COOKIE}=x; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=None`,
    `${ACCESS_COOKIE}=x; Max-Age=601; Path=/; HttpOnly; Secure; SameSite=Lax`,
    `${ACCESS_COOKIE}=x; Max-Age=600; Path=/wrong; HttpOnly; Secure; SameSite=Lax`,
    `${ACCESS_COOKIE}=x; Max-Age=600; Path=/; Domain=example.test; HttpOnly; Secure; SameSite=Lax`,
    `unreviewed=x; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`
  ])('rejects a downgraded or unreviewed header: %s', (header) => {
    const jar = cookieJar();
    expect(() => applyApiCookies([header], jar.cookies)).toThrow(UnsafeApiCookieError);
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('validates every header before mutating the response cookie jar', () => {
    const jar = cookieJar();
    const [access] = sessionHeaders().getSetCookie();
    expect(() =>
      applyApiCookies(
        [access, `${REFRESH_COOKIE}=x; Max-Age=1209600; Path=/api/auth; HttpOnly; Secure; SameSite=Strict`],
        jar.cookies
      )
    ).toThrow(UnsafeApiCookieError);
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('forwards only Rust session cookies', () => {
    const jar = cookieJar({
      control_session: 'controller-secret',
      impersonation: 'operator-secret',
      [ACCESS_COOKIE]: 'access',
      [REFRESH_COOKIE]: 'refresh'
    });
    expect(apiCookieHeader(jar.cookies)).toBe(`${ACCESS_COOKIE}=access; ${REFRESH_COOKIE}=refresh`);
  });

  it('expires both Rust cookies locally without touching controller credentials', () => {
    const jar = cookieJar({ control_session: 'controller-secret' });
    clearApiCookies(jar.cookies);
    expect(jar.set).toHaveBeenNthCalledWith(1, ACCESS_COOKIE, '', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0
    });
    expect(jar.set).toHaveBeenNthCalledWith(2, REFRESH_COOKIE, '', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0
    });
    expect(jar.values.get('control_session')).toBe('controller-secret');
  });
});

describe('typed Rust API transport', () => {
  it.each([
    null,
    [],
    {},
    { email: 'owner@example.test' },
    { email: 'owner@example.test', password: 123 },
    { email: 'owner@example.test', password: 'test-password', role: 'owner' }
  ])('rejects malformed or over-posted login input before transport: %j', (input) => {
    expect(isLoginRequest(input)).toBe(false);
  });

  it('accepts only the exact login request shape', () => {
    expect(
      isLoginRequest({
        email: 'owner@example.test',
        password: 'test-password'
      })
    ).toBe(true);
  });

  it('accepts only exact profile and preference request envelopes', () => {
    expect(
      isProfileUpdateRequest({
        displayName: 'Ada',
        preferences: { chatTextSize: 16 }
      })
    ).toBe(true);
    expect(
      isProfileUpdateRequest({
        displayName: 'Ada',
        preferences: {},
        isPlatformAdmin: true
      })
    ).toBe(false);
    expect(isProfileUpdateRequest({ displayName: 'Ada', preferences: [] })).toBe(false);
    expect(isPreferenceRequest({ key: 'chatTextSize', value: 16 })).toBe(true);
    expect(isPreferenceRequest({ key: 'chatTextSize' })).toBe(false);
    expect(isPreferenceRequest({ key: 'x', value: true, userId: USER_ID })).toBe(false);
    expect(isPreferencesRequest({ theme: 'darkTheme' })).toBe(true);
    expect(isPreferencesRequest([])).toBe(false);
  });

  it('accepts only exact room lifecycle request envelopes', () => {
    expect(isCreateAccountRoomRequest({ requestId: ROOM_ID, name: 'Main' })).toBe(true);
    expect(isCreateAccountRoomRequest({ requestId: 'not-a-uuid', name: 'Main' })).toBe(false);
    expect(
      isCreateAccountRoomRequest({
        requestId: ROOM_ID,
        name: 'Main',
        owner: USER_ID
      })
    ).toBe(false);
    expect(isArchiveAccountRoomRequest({ archived: true })).toBe(true);
    expect(isArchiveAccountRoomRequest({ archived: 'true' })).toBe(false);
    expect(isArchiveAccountRoomRequest({ archived: true, roomId: ROOM_ID })).toBe(false);
  });

  it('validates login before applying both host-only cookies', async () => {
    const jar = cookieJar({ control_session: 'must-not-leak' });
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('cookie')).toBeNull();
      expect(headers.get('origin')).toBe('https://www.example.test');
      expect(headers.get('sec-fetch-site')).toBe('same-origin');
      expect(headers.get('x-forwarded-for')).toBe('203.0.113.10');
      expect(JSON.parse(String(init?.body))).toEqual({
        email: 'owner@example.test',
        password: 'test-password'
      });
      return new Response(
        JSON.stringify({
          userId: USER_ID,
          displayName: 'Ada Owner',
          isPlatformAdmin: false,
          expiresAt: 2_000_000_000
        }),
        { status: 200, headers: sessionHeaders() }
      );
    });

    const result = await login(
      {
        cookies: jar.cookies,
        origin: 'https://www.example.test',
        clientAddress: '203.0.113.10',
        fetch
      },
      { email: 'owner@example.test', password: 'test-password' }
    );

    expect(result).toEqual({
      ok: true,
      status: 200,
      data: {
        userId: USER_ID,
        displayName: 'Ada Owner',
        isPlatformAdmin: false,
        expiresAt: 2_000_000_000
      }
    });
    expect(jar.set).toHaveBeenCalledTimes(2);
  });

  it('rejects a success body with an undeclared identity field before applying cookies', async () => {
    const jar = cookieJar();
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            userId: USER_ID,
            displayName: 'Ada Owner',
            isPlatformAdmin: false,
            expiresAt: 2_000_000_000,
            email: 'must-not-cross@example.test'
          }),
          { status: 200, headers: sessionHeaders() }
        )
    );

    const result = await login(
      { cookies: jar.cookies, origin: 'https://www.example.test', fetch },
      { email: 'owner@example.test', password: 'test-password' }
    );

    expect(result).toMatchObject({
      ok: false,
      status: 502,
      code: 'invalidUpstreamResponse'
    });
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('rejects a successful login unless both live session cookies are present', async () => {
    const jar = cookieJar();
    const [access] = sessionHeaders().getSetCookie();
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            userId: USER_ID,
            displayName: 'Ada Owner',
            isPlatformAdmin: false,
            expiresAt: 2_000_000_000
          }),
          { status: 200, headers: { 'set-cookie': access } }
        )
    );

    await expect(
      login(
        { cookies: jar.cookies, origin: 'https://www.example.test', fetch },
        { email: 'owner@example.test', password: 'test-password' }
      )
    ).resolves.toMatchObject({
      ok: false,
      status: 502,
      code: 'invalidUpstreamCookie'
    });
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('requires logout to return both expired cookies, never live replacements', async () => {
    const jar = cookieJar({
      [ACCESS_COOKIE]: 'access',
      [REFRESH_COOKIE]: 'refresh'
    });
    const fetch = vi.fn(async () => new Response(null, { status: 204, headers: sessionHeaders() }));

    await expect(
      logout({
        cookies: jar.cookies,
        origin: 'https://www.example.test',
        fetch
      })
    ).resolves.toMatchObject({
      ok: false,
      status: 502,
      code: 'invalidUpstreamCookie'
    });
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('accepts the complete expired-cookie contract on logout', async () => {
    const jar = cookieJar({
      [ACCESS_COOKIE]: 'access',
      [REFRESH_COOKIE]: 'refresh'
    });
    const fetch = vi.fn(async () => new Response(null, { status: 204, headers: expiredSessionHeaders() }));

    await expect(
      logout({
        cookies: jar.cookies,
        origin: 'https://www.example.test',
        fetch
      })
    ).resolves.toEqual({
      ok: true,
      status: 204,
      data: null
    });
    expect(jar.set).toHaveBeenNthCalledWith(1, ACCESS_COOKIE, '', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0
    });
    expect(jar.set).toHaveBeenNthCalledWith(2, REFRESH_COOKIE, '', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0
    });
  });

  it('accepts the exact account bootstrap and rejects identity leakage', async () => {
    const body = {
      user: {
        id: USER_ID,
        displayName: 'Ada Owner',
        isPlatformAdmin: false,
        isGuest: false,
        preferences: {}
      },
      accounts: [
        {
          id: ACCOUNT_ID,
          name: 'Acme Trading',
          slug: 'acme-trading',
          role: 'owner',
          rooms: [
            {
              id: ROOM_ID,
              name: 'Main Room',
              state: 'open',
              memberId: MEMBER_ID,
              role: 'owner'
            }
          ]
        }
      ]
    };
    const jar = cookieJar({ [ACCESS_COOKIE]: 'access-only' });
    const validFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('cookie')).toBe(`${ACCESS_COOKIE}=access-only`);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    });

    await expect(
      getAccountBootstrap({
        cookies: jar.cookies,
        origin: 'https://www.example.test',
        fetch: validFetch
      })
    ).resolves.toEqual({ ok: true, status: 200, data: body });

    const leakingFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ...body,
            user: { ...body.user, email: 'leaked@example.test' }
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
    );
    await expect(
      getAccountBootstrap({
        cookies: jar.cookies,
        origin: 'https://www.example.test',
        fetch: leakingFetch
      })
    ).resolves.toMatchObject({
      ok: false,
      status: 502,
      code: 'invalidUpstreamResponse'
    });
  });

  it('refuses session mutation on the read-only account bootstrap', async () => {
    const jar = cookieJar({ [ACCESS_COOKIE]: 'access-only' });
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            user: {
              id: USER_ID,
              displayName: 'Ada Owner',
              isPlatformAdmin: false,
              isGuest: false,
              preferences: {}
            },
            accounts: []
          }),
          { status: 200, headers: sessionHeaders() }
        )
    );

    await expect(
      getAccountBootstrap({
        cookies: jar.cookies,
        origin: 'https://www.example.test',
        fetch
      })
    ).resolves.toMatchObject({
      ok: false,
      status: 502,
      code: 'invalidUpstreamCookie'
    });
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('sends the exact profile patch and accepts only an exact current-user response', async () => {
    const jar = cookieJar({ [ACCESS_COOKIE]: 'access-only' });
    const body = {
      id: USER_ID,
      displayName: 'Canonical Name',
      isPlatformAdmin: false,
      isGuest: false,
      preferences: { chatTextSize: 18 }
    };
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('http://127.0.0.1:8080/api/v1/account');
      expect(init?.method).toBe('PATCH');
      expect(new Headers(init?.headers).get('origin')).toBe('https://www.example.test');
      expect(new Headers(init?.headers).get('cookie')).toBe(`${ACCESS_COOKIE}=access-only`);
      expect(JSON.parse(String(init?.body))).toEqual({
        displayName: 'Canonical Name',
        preferences: { chatTextSize: 18 }
      });
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    });

    await expect(
      updateAccountProfile(
        { cookies: jar.cookies, origin: 'https://www.example.test', fetch },
        { displayName: 'Canonical Name', preferences: { chatTextSize: 18 } }
      )
    ).resolves.toEqual({ ok: true, status: 200, data: body });
    expect(jar.set).not.toHaveBeenCalled();

    const leakingFetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ ...body, email: 'must-not-cross@example.test' }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
    );
    await expect(
      updateAccountProfile(
        {
          cookies: jar.cookies,
          origin: 'https://www.example.test',
          fetch: leakingFetch
        },
        { displayName: 'Canonical Name', preferences: {} }
      )
    ).resolves.toMatchObject({
      ok: false,
      status: 502,
      code: 'invalidUpstreamResponse'
    });
  });

  it('refuses cookies on profile and preference data operations', async () => {
    const jar = cookieJar({ [ACCESS_COOKIE]: 'access-only' });
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: USER_ID,
            displayName: 'Canonical',
            isPlatformAdmin: false,
            isGuest: false,
            preferences: {}
          }),
          { status: 200, headers: sessionHeaders() }
        )
    );
    await expect(
      updateAccountProfile(
        { cookies: jar.cookies, origin: 'https://www.example.test', fetch },
        { displayName: 'Canonical', preferences: {} }
      )
    ).resolves.toMatchObject({
      ok: false,
      status: 502,
      code: 'invalidUpstreamCookie'
    });
  });

  it('substitutes only UUID path variables and validates exact canonical room responses', async () => {
    const jar = cookieJar({ [ACCESS_COOKIE]: 'access-only' });
    const managed = {
      id: ROOM_ID,
      shortCode: '3627',
      name: 'Main Room',
      state: 'open' as const,
      maxCapacity: 100,
      memberCount: 2,
      archivedAt: null,
      createdAt: '2026-01-01T00:00:00Z'
    };
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(`http://127.0.0.1:8080/api/v1/accounts/${ACCOUNT_ID}/rooms`);
      expect(init?.method).toBe('GET');
      return new Response(JSON.stringify([managed]), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    });
    await expect(
      listAccountRooms({ cookies: jar.cookies, origin: 'https://www.example.test', fetch }, ACCOUNT_ID)
    ).resolves.toEqual({ ok: true, status: 200, data: [managed] });

    const leakingFetch = vi.fn(
      async () =>
        new Response(JSON.stringify([{ ...managed, integrations: { secret: true } }]), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
    );
    await expect(
      listAccountRooms(
        {
          cookies: jar.cookies,
          origin: 'https://www.example.test',
          fetch: leakingFetch
        },
        ACCOUNT_ID
      )
    ).resolves.toMatchObject({
      ok: false,
      status: 502,
      code: 'invalidUpstreamResponse'
    });

    const invalidTimestampFetch = vi.fn(
      async () =>
        new Response(JSON.stringify([{ ...managed, createdAt: 'January 1, 2026' }]), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
    );
    await expect(
      listAccountRooms(
        {
          cookies: jar.cookies,
          origin: 'https://www.example.test',
          fetch: invalidTimestampFetch
        },
        ACCOUNT_ID
      )
    ).resolves.toMatchObject({
      ok: false,
      status: 502,
      code: 'invalidUpstreamResponse'
    });

    const unreachable = vi.fn();
    await expect(
      listAccountRooms(
        {
          cookies: jar.cookies,
          origin: 'https://www.example.test',
          fetch: unreachable
        },
        'not-a-uuid'
      )
    ).resolves.toEqual({
      ok: false,
      status: 400,
      code: 'invalid',
      message: 'Invalid API resource identifier.'
    });
    expect(unreachable).not.toHaveBeenCalled();
  });

  it('sends idempotent create and absolute archive requests to the addressed room only', async () => {
    const jar = cookieJar({ [ACCESS_COOKIE]: 'access-only' });
    const managed = {
      id: ROOM_ID,
      shortCode: '3627',
      name: 'Main Room',
      state: 'open' as const,
      maxCapacity: 100,
      memberCount: 1,
      archivedAt: null,
      createdAt: '2026-01-01T00:00:00Z'
    };
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('origin')).toBe('https://www.example.test');
      if (init?.method === 'POST') {
        expect(String(input)).toBe(`http://127.0.0.1:8080/api/v1/accounts/${ACCOUNT_ID}/rooms`);
        expect(JSON.parse(String(init.body))).toEqual({
          requestId: ROOM_ID,
          name: 'Main Room'
        });
      } else {
        expect(init?.method).toBe('PATCH');
        expect(String(input)).toBe(`http://127.0.0.1:8080/api/v1/accounts/${ACCOUNT_ID}/rooms/${ROOM_ID}`);
        expect(JSON.parse(String(init?.body))).toEqual({ archived: true });
      }
      return new Response(JSON.stringify(managed), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    });

    await expect(
      createAccountRoom({ cookies: jar.cookies, origin: 'https://www.example.test', fetch }, ACCOUNT_ID, {
        requestId: ROOM_ID,
        name: 'Main Room'
      })
    ).resolves.toEqual({ ok: true, status: 200, data: managed });
    await expect(
      setAccountRoomArchived({ cookies: jar.cookies, origin: 'https://www.example.test', fetch }, ACCOUNT_ID, ROOM_ID, {
        archived: true
      })
    ).resolves.toEqual({ ok: true, status: 200, data: managed });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('validates and transports revisioned room settings without accepting unknown values', async () => {
    const jar = cookieJar({ [ACCESS_COOKIE]: 'access-only' });
    const snapshot = { roomId: ROOM_ID, revision: 8, settings: { isLocked: true, customCSS: 'body{}' } };
    const request = {
      requestId: USER_ID,
      expectedRevision: 7,
      base: { isLocked: false },
      updates: { isLocked: true }
    };
    expect(isPatchAccountRoomSettingsRequest(request)).toBe(true);
    expect(
      isPatchAccountRoomSettingsRequest({ ...request, updates: { invented: true }, base: { invented: null } })
    ).toBe(false);
    expect(isPatchAccountRoomSettingsRequest({ ...request, base: {} })).toBe(false);

    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(`http://127.0.0.1:8080/api/v1/accounts/${ACCOUNT_ID}/rooms/${ROOM_ID}/settings`);
      if (init?.method === 'PATCH') expect(JSON.parse(String(init.body))).toEqual(request);
      return new Response(JSON.stringify(snapshot), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const context = { cookies: jar.cookies, origin: 'https://www.example.test', fetch };
    await expect(getAccountRoomSettings(context, ACCOUNT_ID, ROOM_ID)).resolves.toEqual({
      ok: true,
      status: 200,
      data: snapshot
    });
    await expect(patchAccountRoomSettings(context, ACCOUNT_ID, ROOM_ID, request)).resolves.toEqual({
      ok: true,
      status: 200,
      data: snapshot
    });
    await expect(
      patchAccountRoomSettings(context, ACCOUNT_ID, ROOM_ID, {
        ...request,
        base: { invented: null },
        updates: { invented: true }
      })
    ).resolves.toMatchObject({ ok: false, status: 400, code: 'invalid' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('preserves the API stable error without accepting response cookies', async () => {
    const jar = cookieJar({ [ACCESS_COOKIE]: 'expired' });
    const headers = sessionHeaders();
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: { code: 'unauthorized', message: 'unauthorized' }
          }),
          {
            status: 401,
            headers
          }
        )
    );
    await expect(
      getAccountBootstrap({
        cookies: jar.cookies,
        origin: 'https://www.example.test',
        fetch
      })
    ).resolves.toEqual({
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'unauthorized'
    });
    expect(jar.set).not.toHaveBeenCalled();
  });
});
