import { query } from '$app/server';
import { z } from 'zod';

import { presenterRoom } from '#lib/server/auth.js';
import {
  checkWelcomeMatPasswordRemotely,
  RoomConfigUnavailable
} from '#lib/server/room-config-client.js';

/**
 * `welcomeMatPasswordRequired` — does the all-rooms welcome mat ask for a password here?
 *
 * ## The branch this exists to reproduce
 *
 * ```js
 * setAsWelcomeTab(e) {                                          // reference byte 1,474,217
 *   e ? this.appService.globals.sessData.allRoomsWelcomeMatPW
 *         ? bootbox.prompt({ title: "Please enter the password to replace all the rooms Welcome Mats:", … })
 *         : bootbox.confirm("Are you sure you want to replace all the rooms Welcome Mats with this note?")
 *     : …
 * }
 * ```
 *
 * Upstream reads the setting to decide which dialog to raise. `allRoomsWelcomeMatPW` is one of the
 * seven credential-shaped settings that may never reach this room, so the room cannot make that
 * choice locally — it asks the controller, which answers `required` without ever returning the
 * value. `room-credential-prompt.ts` carries why `required` is a safe thing to cross where the
 * credential is not.
 *
 * ## A `query`, and it takes NO ARGUMENT
 *
 * It reads and writes nothing here. The room comes from the session through {@link presenterRoom},
 * which makes the presenter gate and the room scope one event — a `roomShortCode` on the arguments
 * would let a presenter of room A ask about room B's account, which is the 2026-08-07 escalation in
 * a new place.
 *
 * ## An empty candidate is not a probe
 *
 * It is the reference's own first branch asked of the only machine that can answer it. A password of
 * `''` never matches a configured one — `answerCredentialPrompt` returns `{required:true, ok:false}`
 * — and this discards `ok` and the room list regardless, because neither is this question's answer.
 *
 * ## FAILS CLOSED, and closed here means "ask for the password"
 *
 * An unreachable controller throws, and this reports `required: true` rather than propagating. The
 * two failure modes are not symmetric: reporting `false` would raise a plain confirmation for an
 * action the owner chose to gate, and the presenter would then be refused by the write path anyway.
 * Reporting `true` shows a prompt whose answer the write path re-checks against the same controller
 * — so a genuine outage costs a presenter one dialog, and never lets one past the gate.
 */
export const welcomeMatPasswordRequired = query(z.void(), async () => {
  const room = presenterRoom();
  try {
    const decision = await checkWelcomeMatPasswordRemotely(room, '');
    return { required: decision.required };
  } catch (error) {
    if (error instanceof RoomConfigUnavailable) return { required: true };
    throw error;
  }
});
