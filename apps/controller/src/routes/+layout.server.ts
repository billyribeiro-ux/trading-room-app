import type { LayoutServerLoad } from './$types';
import { controlPlaneMode } from '#lib/server/control-plane-runtime.js';

export const load: LayoutServerLoad = ({ locals, url }) => ({
  user: locals.user,
  accountAccessEnabled: controlPlaneMode === 'postgres',
  // Request-local input for the chrome decision. Reading `$app/state.page.url` from a lazy derived
  // during a dev SSR module reload can escape component context under Kit 3; this value cannot.
  pathname: url.pathname
});
