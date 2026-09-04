import { redirect } from '@sveltejs/kit';
import { destroyLoginSession } from '#lib/server/auth.js';
import { profileAuthorityMode } from '#lib/server/control-plane-runtime.js';
import { apiRequestContext, clearApiCookies, logout } from '#lib/server/tradingroom-api.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(303, '/login');

export const actions: Actions = {
  default: async (event) => {
    const { cookies } = event;
    /*
      Awaited deliberately. `redirect` throws, so an un-awaited delete would be abandoned the
      instant the next line ran: the cookie would be cleared in the browser and the session row
      would stay live in the database, which is a logout that does not log anybody out.
    */
    if (profileAuthorityMode === 'rust') {
      const authorityLogout = await logout(apiRequestContext(event));
      if (!authorityLogout.ok) {
        console.error('[profile-authority] upstream logout failed', {
          status: authorityLogout.status,
          code: authorityLogout.code
        });
        // The upstream could not prove revocation, but the browser credential can still be removed
        // synchronously and must be. A successful response already applied the exact expired pair.
        clearApiCookies(cookies);
      }
    }
    await destroyLoginSession(cookies);
    redirect(303, '/login');
  }
};
