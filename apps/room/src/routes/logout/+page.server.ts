import { type Actions, type ServerLoad } from '@sveltejs/kit';
import { logout, requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { redirectSignedOut } from '#lib/server/control-plane.js';
import { notifyRoomVisitExit } from '#lib/server/room-config-client.js';

export const load: ServerLoad = async ({ locals }) => {
  const user = requireUser(locals);
  return { displayName: user.displayName, role: user.role };
};

export const actions: Actions = {
  default: async ({ cookies, locals }) => {
    const user = requireUser(locals);
    const room = requireRoomShortCode(locals);
    try {
      await notifyRoomVisitExit(room, user.email);
    } catch (cause) {
      // A reporting write must never trap a member in a live-room session. The next canonical
      // launch closes any stale row before it creates a successor.
      console.error('[room-visit-exit] could not close the visit before logout', {
        errorType: cause instanceof Error ? cause.name : typeof cause
      });
    }
    logout(cookies);
    // handle() already ran for this request and will not run again before the redirect's load.
    locals.user = null;
    locals.sessionId = undefined;
    // Back to the controller, which is where signing in happens now.
    redirectSignedOut();
  }
};
