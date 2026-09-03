import { error, redirect } from '@sveltejs/kit';

/**
 * Redirects to a same-origin path or an explicitly configured HTTP(S) origin.
 *
 * SvelteKit 3 denies absolute redirects unless the destination origin is explicitly allowed. The
 * caller has already selected the configured destination; this helper validates its protocol and
 * grants only that exact origin instead of using the unrestricted `{ external: true }` escape hatch.
 */
export function redirectToConfiguredLocation(location: string | URL): never {
  const value = location.toString();
  let absolute: URL | null = null;
  try {
    absolute = new URL(value);
  } catch {
    // Root/path-relative locations are same-origin. Scheme-relative URLs are external but have no
    // trusted base here, so reject them rather than interpreting them against the request host.
    if (value.startsWith('//')) error(500, 'Configured redirect is invalid.');
  }

  if (!absolute) redirect(303, value);
  if (absolute.protocol !== 'http:' && absolute.protocol !== 'https:') {
    error(500, 'Configured redirect is invalid.');
  }
  redirect(303, absolute, { external: [absolute.origin] });
}
