import type { LayoutServerLoad } from './$types';
import { controlPlaneMode } from '#lib/server/control-plane-runtime.js';

export const load: LayoutServerLoad = ({ locals }) => ({
  user: locals.user,
  accountAccessEnabled: controlPlaneMode === 'postgres'
});
