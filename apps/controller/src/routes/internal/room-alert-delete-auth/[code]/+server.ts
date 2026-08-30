import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { getDb } from '#lib/server/db/index.js';
import { rooms } from '#lib/server/db/schema.js';
import { readSettings } from '#lib/server/rooms.js';
import { resolveRoomConfig } from '#lib/room-config.js';
import { verifyConfigReadToken } from '#lib/server/room-handoff.js';
import { answerCredentialPrompt } from '#lib/server/room-credential-prompt.js';
import type { RequestHandler } from './$types';

/**
 * `POST /internal/room-alert-delete-auth/<shortCode>` — may this presenter delete an alert?
 *
 * ## The defect this closes
 *
 * `TODO.md` row AL. `deleteAlertPW`'s own help text in `room-settings-schema.ts` is *"If set,
 * Presenters will need to enter the password to delete an alert"*, and **nothing in this product
 * checked it.** The room's delete branch asked `usersCanDeleteOwnMsgs` of a MEMBER and let a
 * presenter through unconditionally, so an owner could configure this password and watch every
 * presenter delete alerts unchallenged. The setting is `wired: false`, so nothing LIED about it —
 * it simply did nothing, which is the quieter half of the same problem.
 *
 * ## The capture — SIX sites, and the one that matters is at byte 2,601,823
 *
 * `TODO.md` row AL cites `archiveChatDate` at byte 2,048,903. That byte is real and the method is
 * real (it opens at 2,048,641; `deleteAlertPW` is read at 2,048,693 and 2,048,849), but it is the
 * archive-a-whole-DAY sweep. **The per-alert delete has its own copy of the same prompt**, and it is
 * the surface the room actually gates:
 *
 * ```js
 * deleteAlertMessage(e){                                         // byte 2,601,823
 *   this.appService.globals.sessData.deleteAlertPW
 *     ? bootbox.prompt({ title:"Please enter the password to delete this alert:", value:"",
 *         callback: i => { i && (i.trim() === this.appService.globals.sessData.deleteAlertPW
 *           ? this.appService.deleteAlert(e) : bootbox.alert("Wrong password!")) } })
 *     : this.appService.deleteAlert(e)
 * }
 * ```
 *
 * Four more compare the same value the same way — `doSearchSubmit(del)` at 2,051,139,
 * `resetAllMediaServers()` at 2,167,386, `switchToBackup()` at 2,173,860, and the whole-log archive.
 * Every one is client-side, against a value `sessData` already holds. All offsets were measured with
 * `grep -abo` rather than inherited, because a quoted offset nobody re-opens is how a citation
 * drifts — and re-opening this one is what turned up `deleteAlertMessage`.
 *
 * ## Why the comparison is HERE and not in the room, as upstream does it
 *
 * `deleteAlertPW` is one of the seven credential-shaped settings that may never reach the room —
 * `room-config-boundary.test.ts` refuses it, and `apps/room/src/lib/setting-coverage-contract.test.ts`
 * names it in `CREDENTIALS_THE_REFERENCE_LEAKS`. The room serialises its config into SSR HTML and
 * into the `__sveltekit` payload, so a room-visible setting reaches the browser, every cache in
 * front of the room, and any HAR attached to a support ticket. Upstream can compare in the browser
 * because its room and its site are one system; this reconstruction split them, so the credential
 * stays where it was configured and the QUESTION travels.
 *
 * Note also that upstream's client-side compare is not merely a place we cannot copy: it is
 * decorative. A presenter who can read `sessData` can send `archiveLogs` with no password at all,
 * because the check that mattered never ran on a server. Moving it here is the fix, not the
 * workaround.
 *
 * ## WHY THIS IS A SECOND ROUTE AND NOT A `credential` PARAMETER ON `room-notes-auth`
 *
 * The tidier-looking shape is one endpoint taking a credential NAME. It is refused, and
 * `room-credential-prompt.ts` carries the full argument: **a name on the wire is an oracle.** Any
 * holder of a `config-read` token could then ask "is this string the value of `obsStreamKey`" and
 * walk any of the seven a guess at a time. So each question gets its own route, each route names its
 * own setting in its own source, and the request body carries nothing but the candidate. What is
 * shared is the comparison — the part that is written wrongly when it is written twice.
 *
 * ## `required` beside `ok`
 *
 * The reference's first branch is `deleteAlertPW ? prompt : send` — with nothing configured it never
 * prompts and deletes immediately. A room that cannot see the setting cannot decide that locally,
 * and a second crossing boolean would put a fact DERIVED from a credential on the wire. So the room
 * asks once with an empty candidate: `required:false` means delete without prompting, exactly as
 * upstream does; `required:true` means raise the prompt and ask again with what was typed.
 */
export const POST: RequestHandler = async ({ params, request }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) {
    // Same posture as `room-config`, `room-entry`, `room-notes-auth` and `room-welcome-mat-auth`:
    // fail loudly rather than accept an unauthenticated read, and do not name the private
    // configuration variable in a response body.
    error(500, 'Alert-delete authorisation is not available.');
  }

  /*
    The READ capability, not the write one. This endpoint changes nothing — it answers a question
    about a value the controller holds — and `config-read-cannot-write-contract.test.ts` draws that
    line: a write token is refused here, and a read token is refused by every write route.
  */
  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const verified = verifyConfigReadToken(secret, params.code, presented);
  if (!verified.ok) {
    // One status and one message for every failure reason; the reason is for the log, not the body.
    console.warn('[room-alert-delete-auth] rejected', {
      code: params.code,
      reason: verified.reason
    });
    error(401, 'Unauthorized.');
  }

  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');

  const attempt = (await request.json()) as { candidate?: unknown };
  const candidate = typeof attempt.candidate === 'string' ? attempt.candidate : '';

  const configured = String(resolveRoomConfig(await readSettings(room.id)).values.deleteAlertPW ?? '');

  /*
    `answerCredentialPrompt` and nothing else leaves this function: `{required, ok}`, two booleans.
    The configured value is never returned, never logged and never echoed back in an error, which is
    the property `alert-delete-password-contract.test.ts` asserts from the room's side.
  */
  return json(answerCredentialPrompt(configured, candidate));
};
