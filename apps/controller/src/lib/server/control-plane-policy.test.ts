import { describe, expect, it } from 'vitest';
import {
  applySecurityHeaders,
  assertControlPlaneConfiguration,
  controlPlaneUnavailableResponse,
  decideControlPlaneRequest,
  resolveControlPlaneMode
} from './control-plane-policy';

describe('control-plane deployment policy', () => {
  it('fails closed to marketing-only when configuration is absent or explicitly empty', () => {
    expect(resolveControlPlaneMode(undefined)).toBe('marketing-only');
    expect(resolveControlPlaneMode('')).toBe('marketing-only');
  });

  it('accepts only the two reviewed modes', () => {
    expect(resolveControlPlaneMode('marketing-only')).toBe('marketing-only');
    expect(resolveControlPlaneMode('postgres')).toBe('postgres');
    expect(() => resolveControlPlaneMode(' postgres ')).toThrow(
      'CONTROL_PLANE_MODE must be one of: marketing-only, postgres.'
    );
    expect(() => resolveControlPlaneMode('production')).toThrow(
      'CONTROL_PLANE_MODE must be one of: marketing-only, postgres.'
    );
    // The retired SQLite mode must not quietly resolve to anything.
    expect(() => resolveControlPlaneMode('local-sqlite')).toThrow(
      'CONTROL_PLANE_MODE must be one of: marketing-only, postgres.'
    );
  });

  it('requires a connection string before the application can be enabled', () => {
    expect(() => assertControlPlaneConfiguration('postgres', undefined)).toThrow(
      'DATABASE_URL is required when CONTROL_PLANE_MODE=postgres.'
    );
    expect(() => assertControlPlaneConfiguration('postgres', '  ')).toThrow(
      'DATABASE_URL is required when CONTROL_PLANE_MODE=postgres.'
    );
    expect(assertControlPlaneConfiguration('postgres', 'postgres://user:pw@host/db')).toBeUndefined();
    expect(assertControlPlaneConfiguration('marketing-only', undefined)).toBeUndefined();
  });

  it.each([
    ['/(public)', 'GET'],
    ['/(public)', 'HEAD'],
    ['/(public)/contact', 'GET'],
    ['/(public)/privacy', 'GET'],
    ['/(public)/terms', 'GET']
  ])('allows the reviewed marketing request %s %s', (routeId, method) => {
    expect(decideControlPlaneRequest('marketing-only', routeId, method)).toEqual({ allowed: true });
  });

  it.each([
    ['/(public)/contact', 'POST'],
    ['/(public)/login', 'GET'],
    ['/(public)/login', 'POST'],
    ['/(app-auth)/register', 'GET'],
    ['/(app-auth)/register', 'POST'],
    ['/(app)/account', 'GET'],
    ['/(app)/account/api-docs', 'GET'],
    ['/(app)/account/rooms/[id]', 'GET'],
    ['/(app)/launch/[id]', 'GET'],
    ['/(app)/logout', 'POST'],
    ['/api/auth/login', 'POST'],
    ['/api/auth/refresh', 'POST'],
    ['/api/auth/logout', 'POST'],
    ['/api/v1/account', 'GET'],
    ['/api/v1/account', 'PATCH'],
    ['/api/v1/account/preferences', 'GET'],
    ['/api/v1/account/preferences', 'PATCH'],
    ['/api/v1/account/theme', 'PUT'],
    ['/(public)/session/[code]', 'GET'],
    ['/(public)/session/[code]/joined', 'GET'],
    ['/(future)', 'GET']
  ])('blocks the control-plane request %s %s', (routeId, method) => {
    expect(decideControlPlaneRequest('marketing-only', routeId, method)).toEqual({
      allowed: false,
      status: 503,
      reason: 'control-plane-disabled'
    });
  });

  it('allows unresolved routes to reach the normal SvelteKit 404', () => {
    expect(decideControlPlaneRequest('marketing-only', null, 'GET')).toEqual({ allowed: true });
  });

  it('does not alter route behavior once the database is configured', () => {
    expect(decideControlPlaneRequest('postgres', '/(app)/account', 'POST')).toEqual({
      allowed: true
    });
  });

  it('returns a non-cacheable, non-indexable guarded 503', async () => {
    const response = controlPlaneUnavailableResponse('GET');

    expect(response.status).toBe(503);
    expect(await response.text()).toBe('Application services are not available yet.');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('permissions-policy')).toContain('microphone=()');
  });

  it('adds the same protections to successful responses', () => {
    const response = applySecurityHeaders(new Response('ok', { status: 200 }));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('referrer-policy')).toBe('same-origin');
  });

  /*
    The regression this file did not have.

    `applySecurityHeaders` was always correct in isolation, and the test above always passed —
    it just was not reached on the enabled branch of `handle`. Production ran with the control
    plane on and served a live login form with no CSP, no `nosniff`, no `DENY` and no `noindex`,
    and every unit test stayed green because none of them asserted the complete set.

    So assert the complete set, and assert it on a response that is nothing like a marketing
    page: authenticated, non-GET, already carrying a permissive `cache-control` that must be
    overwritten rather than merged.
  */
  it('protects an authenticated response, overwriting a permissive cache-control', () => {
    const authenticated = new Response('{"account":1}', {
      status: 200,
      headers: { 'cache-control': 'public, max-age=0, must-revalidate', 'content-type': 'application/json' }
    });

    const response = applySecurityHeaders(authenticated);

    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(response.headers.get('permissions-policy')).toContain('microphone=()');
    // The response's own headers survive; only the guarded set is replaced.
    expect(response.headers.get('content-type')).toBe('application/json');
  });

  /*
    Getting the referrer policy wrong breaks every form on the site, so pin the value.

    `no-referrer` also suppresses `Origin` on a form POST, so SvelteKit's CSRF check sees
    `Origin: null` and refuses with "Cross-site POST form submissions are forbidden". Applying it
    to an enabled deployment broke registration, login and logout across all four Playwright
    projects.

    It was briefly mode-dependent, keeping `no-referrer` for marketing-only. That was the wrong
    seam: the hazard belongs to the page, and `/contact` posts a form in either mode. One value,
    asserted here, for every response.
  */
  it('never uses a referrer policy that would null Origin on a form POST', () => {
    const response = applySecurityHeaders(new Response('ok'));

    expect(response.headers.get('referrer-policy')).toBe('same-origin');
    expect(response.headers.get('referrer-policy')).not.toBe('no-referrer');
  });

  /*
    `cache-control` is the one guarded header a route may legitimately set more strictly, and
    the first version of this change clobbered it — the account load's `private, no-store`
    became a plain `no-store`, silently dropping the directive that stops a shared cache
    storing an authenticated page. The deployed HTTP contract caught it; this pins it.
  */
  it('keeps a stricter cache-control the route already set', () => {
    const response = applySecurityHeaders(
      new Response('ok', { status: 200, headers: { 'cache-control': 'private, no-store' } })
    );

    expect(response.headers.get('cache-control')).toBe('private, no-store');
    // The floor still applies to everything else.
    expect(response.headers.get('x-frame-options')).toBe('DENY');
  });
});
