import { redirect, type Actions, type ServerLoad } from '@sveltejs/kit';
import { logout, requireUser } from '$lib/server/auth';
import { signedOutDestination } from '$lib/server/control-plane';

export const load: ServerLoad = async ({ locals }) => {
  const user = requireUser(locals);
  return { displayName: user.displayName, role: user.role };
};

export const actions: Actions = {
  default: async ({ cookies, locals }) => {
    logout(cookies);
    // handle() already ran for this request and will not run again before the redirect's load.
    locals.user = null;
    locals.sessionId = undefined;
    // Back to the controller, which is where signing in happens now.
    redirect(303, signedOutDestination());
  }
};
