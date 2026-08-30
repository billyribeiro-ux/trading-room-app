import { command, getRequestEvent } from '$app/server';
import { z } from 'zod';
import { presenterRoom, requireSessionId } from '#lib/server/auth.js';
import { grantAlertDeleteAccess } from '#lib/server/alert-delete-access.js';
import { checkAlertDeletePasswordRemotely } from '#lib/server/room-config-client.js';

/*
  `deleteAlertPW` — TODO row AL, and the room's half of a door whose credential lives elsewhere.

  The setting's own help text is "If set, Presenters will need to enter the password to delete an
  alert". Nothing in this product read it until 2026-08-30: `message-actions.remote.ts`'s delete
  branch asked `usersCanDeleteOwnMsgs` of a member and let a presenter through unconditionally.

  WHY THE COMPARISON IS NOT DONE HERE. `deleteAlertPW` is one of the seven credential-shaped settings
  that may never reach the room — `room-config-boundary.test.ts` enforces it and
  `setting-coverage-contract.test.ts` names it — so the room cannot hold the password to compare
  against. The reference can, because its room and its site are one system and `sessData` already
  carries it (bundle byte 2,048,641). This reconstruction split them, so the credential stays on the
  controller and the QUESTION travels: `internal/room-alert-delete-auth/[code]` compares and answers
  two booleans.

  WHY A SECOND ROUTE AND NOT `internal/room-notes-auth` WITH A `credential` FIELD. A credential NAME
  on the wire is an oracle: any holder of a `config-read` token could ask "is this string the value
  of `obsStreamKey`" and walk all seven a guess at a time. `room-credential-prompt.ts` on the
  controller carries the full argument; what is shared between the two doors is the constant-time
  comparison, which is the part that is written wrongly when it is written twice.

  WHY A COMMAND AND NOT A FORM. There is no `<form>`. This is a context-menu item inside a booted
  room client, and its answer is consumed by a dialog callback rather than by a navigation — the same
  argument `notes-auth.remote.ts` and `chat-mute.remote.ts` record for themselves.
*/

/**
 * The candidate, and the only thing the client may send.
 *
 * `z.strictObject` rather than `z.object`, so a field the caller invents is REFUSED rather than
 * ignored — the room must not be able to smuggle a room code, an alert id or an `allow` flag past a
 * schema that silently drops what it does not know. The room comes from the session below and
 * nowhere else.
 *
 * **There is deliberately no alert id.** The grant this command writes is per SESSION, not per row,
 * exactly as the reference's is per prompt: `archiveChatDate` compares and then sends, with nothing
 * naming the target in between. An id here would imply a per-alert grant that neither the column nor
 * the check implements, and a parameter nothing reads is a parameter the next reader will start
 * reading.
 *
 * The empty string is deliberately VALID. The first call of every interaction carries it: it is how
 * the room asks *"is a password required at all?"*, which is the reference's own first branch
 * (`sessData.deleteAlertPW ? prompt : send`) asked of the only machine that can answer it.
 *
 * Length-capped because this string is compared against a secret. Nothing legitimate is near 512
 * characters, and an unbounded body on a comparison endpoint is work a caller can ask for for free.
 */
const CANDIDATE = z.strictObject({ candidate: z.string().max(512) });

/**
 * Whether this presenter may delete an alert, decided on the controller.
 *
 * Returns the controller's answer unchanged: `required` says whether the room has an alert-delete
 * password configured at all, `ok` whether access is granted. The room prompts only when `required`
 * and proceeds on `ok` — it never sees, caches or derives the password itself.
 *
 * **Presenters only, and the room comes from the session.** `presenterRoom()` reads both from
 * `locals`, so neither is assertable by the caller. That is the 2026-08-07 privilege escalation's
 * rule applied here: an authority decision is made on the server from data the server owns.
 *
 * Presenters only is also what makes the gate in `message-actions.remote.ts` coherent rather than a
 * trap: that gate fires for `isPresenter && kind === 'alert'`, so every caller it can refuse is a
 * caller this command will answer. A member cannot be gated and therefore never needs this door.
 *
 * A controller that cannot be reached throws `RoomConfigUnavailable` out of this command rather than
 * resolving to `{ok:false}`. Both directions of the alternative are wrong: a network failure must
 * not read as a granted request, and it must not tell a presenter their correct password was
 * refused.
 */
export const checkAlertDeletePassword = command(CANDIDATE, async ({ candidate }) => {
  const room = presenterRoom();
  const decision = await checkAlertDeletePasswordRemotely(room, candidate);

  /*
    THE GRANT IS RECORDED HERE AND NOWHERE ELSE.

    The room's dialog knows the answer too, and that knowledge decides only what to DRAW. What may be
    DELETED is decided by `requireAlertDeleteAccess` reading this column on the LATER request, and the
    only version of the answer the room could send with that request is a boolean the room controls —
    which is the 2026-08-07 escalation arriving through a feature instead of a token.

    Only on `ok`. A refused attempt writes nothing, so a wrong password cannot extend a grant that is
    about to expire.
  */
  if (decision.ok) grantAlertDeleteAccess(requireSessionId(getRequestEvent().locals));

  return decision;
});
