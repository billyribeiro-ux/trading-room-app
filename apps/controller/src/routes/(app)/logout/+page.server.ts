import { redirect } from '@sveltejs/kit';
import { destroyLoginSession } from '#lib/server/auth.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(303, '/login');

export const actions: Actions = {
  default: async ({ cookies }) => {
    /*
      Awaited deliberately. `redirect` throws, so an un-awaited delete would be abandoned the
      instant the next line ran: the cookie would be cleared in the browser and the session row
      would stay live in the database, which is a logout that does not log anybody out.
    */
    await destroyLoginSession(cookies);
    redirect(303, '/login');
  }
};
