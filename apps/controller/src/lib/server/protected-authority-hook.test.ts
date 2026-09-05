import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

const { clearApiCookies, destroyLoginSession, readProfileAuthority, readUser } = vi.hoisted(() => ({
  clearApiCookies: vi.fn(),
  destroyLoginSession: vi.fn(),
  readProfileAuthority: vi.fn(),
  readUser: vi.fn()
}));

vi.mock('#lib/server/control-plane-runtime.js', () => ({
  controlPlaneMode: 'postgres',
  profileAuthorityMode: 'rust'
}));
vi.mock('#lib/server/control-plane-policy.js', () => ({
  decideControlPlaneRequest: () => ({ allowed: true }),
  controlPlaneUnavailableResponse: () => new Response('unavailable', { status: 503 }),
  applySecurityHeaders: (response: Response) => response
}));
vi.mock('#lib/server/auth.js', () => ({ destroyLoginSession, readUser }));
vi.mock('#lib/server/profile-authority.js', () => ({ readProfileAuthority }));
vi.mock('#lib/server/tradingroom-api.js', () => ({
  apiRequestContext: () => ({ cookies: {}, origin: 'https://controller.example.test' }),
  clearApiCookies
}));

const localUser = {
  id: 41,
  accountId: 9,
  email: 'admin@example.test',
  displayName: 'Account Admin',
  authorityUserId: '10000000-0000-4000-8000-000000000001',
  authorityEnterpriseId: '20000000-0000-4000-8000-000000000001'
};

const bootstrap = {
  user: {
    id: localUser.authorityUserId,
    displayName: localUser.displayName,
    isPlatformAdmin: false,
    isGuest: false,
    preferences: {}
  },
  accounts: [
    {
      id: localUser.authorityEnterpriseId,
      name: 'Account',
      slug: 'account',
      role: 'admin',
      rooms: []
    }
  ]
};

function event(routeId = '/(app)/account') {
  return {
    cookies: {},
    fetch: globalThis.fetch,
    getClientAddress: () => '127.0.0.1',
    isDataRequest: false,
    isRemoteRequest: false,
    isSubRequest: false,
    locals: {},
    params: {},
    platform: undefined,
    request: new Request('https://controller.example.test/account'),
    route: { id: routeId },
    setHeaders: () => undefined,
    tracing: {},
    url: new URL('https://controller.example.test/account')
  } as unknown as RequestEvent;
}

describe('protected controller session authority revalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readUser.mockResolvedValue(localUser);
  });

  it('caches an exactly bound canonical bootstrap before resolving an app route', async () => {
    const { handle } = await import('../../hooks.server');
    readProfileAuthority.mockResolvedValue({ ok: true, status: 200, data: bootstrap });
    const request = event();
    const resolve = vi.fn(async () => new Response('account'));

    const response = await handle({ event: request, resolve });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('account');
    expect(resolve).toHaveBeenCalledOnce();
    expect(request.locals.user).toEqual(localUser);
    expect(request.locals.authorityBootstrap).toEqual(bootstrap);
    expect(destroyLoginSession).not.toHaveBeenCalled();
  });

  it('revokes both local and canonical cookies when Rust says the session is unauthorized', async () => {
    const { handle } = await import('../../hooks.server');
    readProfileAuthority.mockResolvedValue({
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'unauthorized'
    });
    const request = event();
    const resolve = vi.fn(async () => new Response('must not render'));

    const response = await handle({ event: request, resolve });

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(resolve).not.toHaveBeenCalled();
    expect(destroyLoginSession).toHaveBeenCalledWith(request.cookies);
    expect(clearApiCookies).toHaveBeenCalledWith(request.cookies);
    expect(request.locals.user).toBeUndefined();
  });

  it('fails closed but preserves the recoverable local session on an authority dependency outage', async () => {
    const { handle } = await import('../../hooks.server');
    readProfileAuthority.mockResolvedValue({
      ok: false,
      status: 503,
      code: 'unavailable',
      message: 'unavailable'
    });
    const request = event();
    const resolve = vi.fn(async () => new Response('must not render'));

    const response = await handle({ event: request, resolve });

    expect(response.status).toBe(503);
    expect(resolve).not.toHaveBeenCalled();
    expect(destroyLoginSession).not.toHaveBeenCalled();
    expect(clearApiCookies).not.toHaveBeenCalled();
    expect(request.locals.user).toEqual(localUser);
  });

  it('destroys a locally authenticated session whose UUID/account binding disagrees', async () => {
    const { handle } = await import('../../hooks.server');
    readProfileAuthority.mockResolvedValue({
      ok: true,
      status: 200,
      data: { ...bootstrap, user: { ...bootstrap.user, id: '30000000-0000-4000-8000-000000000001' } }
    });
    const request = event();
    const resolve = vi.fn(async () => new Response('must not render'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await handle({ event: request, resolve });

    expect(response.status).toBe(401);
    expect(resolve).not.toHaveBeenCalled();
    expect(destroyLoginSession).toHaveBeenCalledOnce();
    expect(clearApiCookies).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('does not attach an impersonated support session to canonical user authority', async () => {
    const { handle } = await import('../../hooks.server');
    readUser.mockResolvedValue({ ...localUser, impersonatedBy: 1 });
    const request = event();
    const resolve = vi.fn(async () => new Response('impersonated'));

    const response = await handle({ event: request, resolve });

    expect(response.status).toBe(200);
    expect(readProfileAuthority).not.toHaveBeenCalled();
    expect(resolve).toHaveBeenCalledOnce();
  });
});
