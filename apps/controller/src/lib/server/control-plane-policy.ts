export const CONTROL_PLANE_MODES = ['marketing-only', 'postgres'] as const;

export type ControlPlaneMode = (typeof CONTROL_PLANE_MODES)[number];

type RouteDecision = { allowed: true } | { allowed: false; status: 503; reason: 'control-plane-disabled' };

const MARKETING_ROUTE_IDS = new Set(['/(public)', '/(public)/contact', '/(public)/privacy', '/(public)/terms']);

export function resolveControlPlaneMode(configuredMode: string | undefined): ControlPlaneMode {
  if (configuredMode === undefined || configuredMode === '') return 'marketing-only';
  if (configuredMode === 'marketing-only' || configuredMode === 'postgres') {
    return configuredMode;
  }

  throw new Error(`CONTROL_PLANE_MODE must be one of: ${CONTROL_PLANE_MODES.join(', ')}.`);
}

/**
 * `marketing-only` stays the default, so a deployment that has not been given a
 * database serves the four marketing routes and 503s everything else rather than
 * failing at the first query.
 *
 * The previous mode was `local-sqlite`, and it was prohibited on Vercel because the
 * platform's filesystem is ephemeral and per-instance — a database written there was
 * lost on the next request. PostgreSQL is reachable over the network from anywhere,
 * so that prohibition is gone: Vercel is now the intended host, not a rejected one.
 */
export function assertControlPlaneConfiguration(mode: ControlPlaneMode, databaseUrl: string | undefined): void {
  if (mode === 'postgres' && !databaseUrl?.trim()) {
    throw new Error('DATABASE_URL is required when CONTROL_PLANE_MODE=postgres.');
  }
}

/**
 * This is an operational containment boundary, not product authorization.
 * Product authorization remains the Rust/PostgreSQL control API's responsibility.
 */
export function decideControlPlaneRequest(
  mode: ControlPlaneMode,
  routeId: string | null,
  method: string
): RouteDecision {
  if (mode === 'postgres') return { allowed: true };

  // Let SvelteKit produce its ordinary 404 for an unresolved route. Static assets
  // bypass the server hook entirely, as documented by SvelteKit.
  if (routeId === null) return { allowed: true };

  const normalizedMethod = method.toUpperCase();
  if (MARKETING_ROUTE_IDS.has(routeId) && (normalizedMethod === 'GET' || normalizedMethod === 'HEAD')) {
    return { allowed: true };
  }

  return { allowed: false, status: 503, reason: 'control-plane-disabled' };
}

export function controlPlaneUnavailableResponse(method: string): Response {
  const body = method.toUpperCase() === 'HEAD' ? null : 'Application services are not available yet.';

  return new Response(body, {
    status: 503,
    headers: securityResponseHeaders()
  });
}

/**
 * Applied to every response in every mode.
 *
 * It was previously reached only from the `marketing-only` branch of `handle`, because when it
 * was written that was the only branch a deployment could be in. The moment production was
 * switched to an enabled mode, the enabled branch returned `resolve(event)` directly and every
 * one of these headers silently disappeared from the live site — no CSP, no `nosniff`, no
 * `DENY`, and no `noindex` on a reachable login form.
 *
 * Nothing here is specific to marketing mode. Framing, sniffing, referrer leakage and indexing
 * are hazards for an authenticated page too, and more so. The old name said otherwise, which is
 * part of why the gap read as intentional.
 */
export function applySecurityHeaders(response: Response): Response {
  const guarded = new Response(response.body, response);
  for (const [name, value] of securityResponseHeaders()) {
    /*
      `cache-control` is a floor, not an override. The account load sets `private, no-store`,
      which is strictly stronger than `no-store` — it additionally forbids a shared cache from
      storing an authenticated page. Overwriting it here would have quietly downgraded the one
      response that most needs the stronger value.

      So a route's own directive is kept when it already contains `no-store`, and replaced when
      it does not. That covers the case this whole change exists for: Vercel's default
      `public, max-age=0, must-revalidate` carries no `no-store` and is replaced. Every other
      header is unconditional; none of them has a legitimate stronger variant a route might set.
    */
    if (name === 'cache-control' && guarded.headers.get('cache-control')?.includes('no-store')) {
      continue;
    }
    guarded.headers.set(name, value);
  }
  return guarded;
}

function securityResponseHeaders(): Headers {
  return new Headers({
    'cache-control': 'no-store',
    'content-security-policy': "base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
    'permissions-policy': 'camera=(), geolocation=(), microphone=()',
    /*
      `same-origin`, not `no-referrer`, and it is not a downgrade.

      `no-referrer` does not only suppress `Referer`. It also suppresses `Origin` on a form POST —
      the browser sends `Origin: null` — and SvelteKit's CSRF check compares `Origin` against the
      server's origin and refuses with "Cross-site POST form submissions are forbidden". Any page
      that posts a form cannot carry this header, which is every page that matters here: login,
      register, contact, and every account action.

      It was briefly made mode-dependent to keep `no-referrer` for marketing-only. That was the
      wrong seam. The hazard belongs to the page, not the deployment mode, and `/contact` posts a
      form in either mode — so the mode could never be the thing that decides it. One value for
      every response is both simpler and correct.

      Nothing leaks: `same-origin` still sends no referrer whatsoever to a cross-origin
      destination, which is the disclosure this header exists to prevent. It differs from
      `no-referrer` only in sending a referrer to this same site, where the URLs are already known.
    */
    'referrer-policy': 'same-origin',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'x-robots-tag': 'noindex, nofollow'
  });
}
