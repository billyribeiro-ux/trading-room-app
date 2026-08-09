import { recordAdminAccess, requireSuperadmin } from '$lib/server/superadmin';
import type { LayoutServerLoad } from './$types';

/**
 * The structural guard for everything under `/admin`.
 *
 * ## Why this exists even though the page already guards itself
 *
 * The first version put `requireSuperadmin` in `+page.server.ts` and nowhere else, which makes the
 * guard OPT-IN: every future route under this directory has to remember one line, and forgetting it
 * exposes every customer's data with no error, no warning and no failing test. Security that
 * depends on remembering is not security; it is a countdown.
 *
 * A layout `load` runs before any child route's `load` in the same request, so placing it here
 * makes the guard opt-OUT — a new route is protected by existing, and unprotecting one requires
 * deliberately removing this file.
 *
 * ## Why the page-level guard STAYS
 *
 * SvelteKit's own documentation is explicit that a layout `load` does not run on every request:
 * during client-side navigation between child routes it can be skipped, and layout and page `load`
 * functions run concurrently unless the page awaits `parent()`. So a layout guard alone is
 * necessary and not sufficient. Both together is the belt-and-braces the docs recommend, and
 * `admin-guard-contract.test.ts` proves both are present rather than trusting that they are.
 *
 * ## Why not `hooks.server.ts`
 *
 * A hook would cover this too, and the framework docs suggest it for exactly this case. It is not
 * used here because the hook already carries the control-plane boundary decision, and stacking a
 * second, unrelated authorization rule into one function is how that function becomes the place
 * nobody dares change. This is one directory with one rule; it belongs beside the routes it
 * protects, where somebody editing them will see it.
 */
export const load: LayoutServerLoad = async ({ locals, url, getClientAddress }) => {
  const remoteIp = getClientAddress();

  let operator;
  try {
    operator = requireSuperadmin(locals);
  } catch (refusal) {
    /*
      Recorded BEFORE rethrowing. A refusal is the more interesting of the two outcomes — it means
      somebody found a URL that is not advertised anywhere — and it is the one a naive
      implementation drops, because the guard throws and the happy path never runs.
    */
    recordAdminAccess({
      userId: locals.user?.id ?? null,
      outcome: 'refused',
      path: url.pathname,
      remoteIp
    });
    throw refusal;
  }

  recordAdminAccess({ userId: operator.id, outcome: 'granted', path: url.pathname, remoteIp });

  return { operator: { email: operator.email, displayName: operator.displayName } };
};
