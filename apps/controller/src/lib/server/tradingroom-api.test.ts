import type { Cookies } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  UnsafeApiCookieError,
  apiCookieHeader,
  applyApiCookies,
  getAccountBootstrap,
  isLoginRequest,
  login,
  logout
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
    expect(isLoginRequest({ email: 'owner@example.test', password: 'test-password' })).toBe(true);
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

    expect(result).toMatchObject({ ok: false, status: 502, code: 'invalidUpstreamResponse' });
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
    ).resolves.toMatchObject({ ok: false, status: 502, code: 'invalidUpstreamCookie' });
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('requires logout to return both expired cookies, never live replacements', async () => {
    const jar = cookieJar({ [ACCESS_COOKIE]: 'access', [REFRESH_COOKIE]: 'refresh' });
    const fetch = vi.fn(async () => new Response(null, { status: 204, headers: sessionHeaders() }));

    await expect(logout({ cookies: jar.cookies, origin: 'https://www.example.test', fetch })).resolves.toMatchObject({
      ok: false,
      status: 502,
      code: 'invalidUpstreamCookie'
    });
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('accepts the complete expired-cookie contract on logout', async () => {
    const jar = cookieJar({ [ACCESS_COOKIE]: 'access', [REFRESH_COOKIE]: 'refresh' });
    const fetch = vi.fn(async () => new Response(null, { status: 204, headers: expiredSessionHeaders() }));

    await expect(logout({ cookies: jar.cookies, origin: 'https://www.example.test', fetch })).resolves.toEqual({
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
          rooms: [{ id: ROOM_ID, name: 'Main Room', state: 'open', memberId: MEMBER_ID, role: 'owner' }]
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
      getAccountBootstrap({ cookies: jar.cookies, origin: 'https://www.example.test', fetch: validFetch })
    ).resolves.toEqual({ ok: true, status: 200, data: body });

    const leakingFetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ ...body, user: { ...body.user, email: 'leaked@example.test' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
    );
    await expect(
      getAccountBootstrap({ cookies: jar.cookies, origin: 'https://www.example.test', fetch: leakingFetch })
    ).resolves.toMatchObject({ ok: false, status: 502, code: 'invalidUpstreamResponse' });
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
      getAccountBootstrap({ cookies: jar.cookies, origin: 'https://www.example.test', fetch })
    ).resolves.toMatchObject({ ok: false, status: 502, code: 'invalidUpstreamCookie' });
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('preserves the API stable error without accepting response cookies', async () => {
    const jar = cookieJar({ [ACCESS_COOKIE]: 'expired' });
    const headers = sessionHeaders();
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { code: 'unauthorized', message: 'unauthorized' } }), {
          status: 401,
          headers
        })
    );
    await expect(
      getAccountBootstrap({ cookies: jar.cookies, origin: 'https://www.example.test', fetch })
    ).resolves.toEqual({ ok: false, status: 401, code: 'unauthorized', message: 'unauthorized' });
    expect(jar.set).not.toHaveBeenCalled();
  });
});
