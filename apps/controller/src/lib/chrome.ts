export type Chrome = 'none' | 'controller' | 'marketing';

/**
 * Which shell a path renders inside.
 *
 * ## Why this is a function in `$lib` rather than four lines in the layout
 *
 * It was four lines in the layout, and a page was filed under the wrong shell without anything
 * noticing. `/forgot-password` and `/reset-password` were added to `(public)/` and fell through to
 * `marketing`, so they rendered inside `.pub-root` while wearing the controller's `acc-*` classes.
 *
 * That is not a cosmetic mismatch. `account.css` scopes its grid under `.acc-body`
 * (`.acc-body .row > [class*='col-']`, `.acc-body .acc-panel-narrow .col-md-6`) and `public.css`
 * scopes its own under `.pub-root` — deliberately, so the two Bootstrap builds cannot fight. Under
 * the wrong ancestor the controller rules simply do not match. Measured in Chromium at 1280px:
 * every field on the reset page rendered **508px instead of 254px**, in a column that never
 * floated, because `.pub-root .row { margin: 0 -15px }` applied and the `.acc-body` rules did not.
 *
 * Nothing in `svelte-check`, the unit suite or a source review catches that. A computed-style read
 * catches it, and so does this: a pure function over a pathname, with the pages that must be
 * controller-shelled written down as cases.
 *
 * ## The rule
 *
 * The grouping directory does NOT decide the shell — `/login` lives in `(public)/` and is a
 * controller page. What decides it is which stylesheet the page's markup is written against, and
 * that is a property of the page, not of its folder.
 */

/**
 * Paths that get the controller shell, matched exactly or as a path prefix.
 *
 * `/account` covers `/account/rooms/*` by prefix. `/forgot-password` and `/reset-password` are here
 * because they are the login flow: reached from `/login`, returning to `/login`, and built from the
 * same `.acc-panel-narrow` markup.
 */
export const CONTROLLER_PATHS = [
  '/login',
  '/register',
  '/account',
  '/logout',
  '/forgot-password',
  '/reset-password'
] as const;

/**
 * Paths that get no shell at all.
 *
 * The room entry screen owns its whole field, and the API document is a separate first-party HTML
 * surface with its own topbar — letting `/account` win there would add a second navbar.
 */
export function resolveChrome(pathname: string): Chrome {
  if (pathname.startsWith('/session/')) return 'none';
  if (pathname === '/account/api-docs') return 'none';
  if (CONTROLLER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return 'controller';
  return 'marketing';
}
