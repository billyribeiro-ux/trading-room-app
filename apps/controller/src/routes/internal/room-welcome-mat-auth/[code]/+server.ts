import { error, json } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { getDb } from '#lib/server/db/index.js';
import { rooms } from '#lib/server/db/schema.js';
import { readSettings } from '#lib/server/rooms.js';
import { resolveRoomConfig } from '#lib/room-config.js';
import { verifyConfigReadToken } from '#lib/server/room-handoff.js';
import { answerCredentialPrompt } from '#lib/server/room-credential-prompt.js';
import type { RequestHandler } from './$types';

/**
 * `POST /internal/room-welcome-mat-auth/<shortCode>` — may this presenter replace EVERY room's
 * welcome mat, and which rooms are they?
 *
 * ## The gap this closes
 *
 * `note-editor-welcome-mat-all-rooms-password`, and a gap `+page.server.ts` had already recorded
 * against itself: *"the all-rooms variant needs a controller endpoint that enumerates the account's
 * rooms and verifies `allRoomsWelcomeMatPW`."* Until now `allRooms: true` set this room's mat and no
 * other, silently — the password branch did not exist anywhere, and `pw` was never sent.
 *
 * ```js
 * setAsWelcomeTab(e) {                                            // reference byte 1,474,217
 *   e ? this.appService.globals.sessData.allRoomsWelcomeMatPW
 *       ? bootbox.prompt({
 *           title: "Please enter the password to replace all the rooms Welcome Mats:", value: "",
 *           callback: i => { if (i) { const o = i.trim();
 *             o === this.appService.globals.sessData.allRoomsWelcomeMatPW
 *               ? this.appService.sendServerAdminCommand("setWelcomeMatNoteTab", {id: this.tab._id, allRooms: e, pw: o})
 *               : bootbox.alert("Wrong password!") } } })
 *       : bootbox.confirm("Are you sure you want to replace all the rooms Welcome Mats with this note?")
 *     : …
 * }
 * ```
 *
 * ## Why the comparison is HERE and not in the room, as upstream does it
 *
 * `allRoomsWelcomeMatPW` is one of the seven credential-shaped settings that may never reach the
 * room — the room serialises its config into SSR HTML and into the `__sveltekit` payload, so a
 * room-visible setting reaches the browser, every cache in front of the room, and any HAR attached
 * to a support ticket. Upstream can compare in the browser because `sessData` already holds the
 * value. This reconstruction must not put it there, so the credential stays and the QUESTION
 * travels — the same split `internal/room-entry` and `internal/room-notes-auth` already make.
 *
 * Note also that upstream's client-side compare is not merely a place we cannot copy: it is
 * decorative. A member who can read `sessData` can send `setWelcomeMatNoteTab` with any `pw` at all,
 * because the check that mattered never ran on a server. Moving it here is the fix, not the
 * workaround.
 *
 * ## WHY THE ROOM LIST COMES BACK FROM THE SAME CALL
 *
 * Two endpoints would have been the obvious shape — one to check the password, one to list the
 * rooms — and it is the wrong one. A separate list endpoint answers to a `config-read` token alone,
 * so any holder of one could enumerate every room on the account without knowing the password. Here
 * the list is returned only on `ok`, so a wrong answer returns `{required, ok:false}` and nothing
 * else. **The gate and the data it unlocks are one round trip, and a failure cannot leak past it.**
 *
 * The rooms returned are the account's OWN, found through the room the caller already holds a token
 * for. There is no room id or account id on the wire: the request names one short code, the token
 * proves the caller may read that room's config, and the account is derived from the row. A caller
 * cannot ask about somebody else's account because there is nowhere to say whose.
 *
 * ## `required` beside `ok`, for the reason `room-credential-prompt.ts` gives
 *
 * The reference's first branch is `allRoomsWelcomeMatPW ? prompt : confirm` — with nothing
 * configured it asks for confirmation rather than a password. A room that cannot see the setting
 * cannot make that choice locally, so the room asks once with an empty candidate: `required:false`
 * means raise the plain confirmation, exactly as upstream does.
 *
 * With nothing configured `answerCredentialPrompt` returns `{required:false, ok:true}`, and the room
 * list comes back with it — which is correct and is the branch upstream takes: an unset password
 * means the owner did not gate this action, not that the action is forbidden.
 */
export const POST: RequestHandler = async ({ params, request }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) {
    // Same posture as `room-config`, `room-entry` and `room-notes-auth`: fail loudly rather than
    // accept an unauthenticated read, and do not name the private variable in a response body.
    error(500, 'Welcome mat authorisation is not available.');
  }

  /*
    The READ capability. This endpoint changes nothing — it answers a question and returns a list of
    short codes the caller's own account owns. The WRITE happens in the room application, against its
    own database, and is gated on this answer.
  */
  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const verified = verifyConfigReadToken(secret, params.code, presented);
  if (!verified.ok) {
    // One status and one message for every failure reason; the reason is for the log, not the body.
    console.warn('[room-welcome-mat-auth] rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }

  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');

  const configured = String(resolveRoomConfig(await readSettings(room.id)).values.allRoomsWelcomeMatPW ?? '');

  const attempt = (await request.json()) as { candidate?: unknown };
  const answer = answerCredentialPrompt(configured, typeof attempt.candidate === 'string' ? attempt.candidate : '');

  /* Nothing about the account leaves here unless the answer was yes. */
  if (!answer.ok) return json({ required: answer.required, ok: false, rooms: [] });

  /*
    Ordered so the room application applies them in a stable order and a partial failure is
    reproducible rather than arbitrary. `shortCode` and nothing else: the room needs the key its own
    `notes.room_short_code` is written against, and a name or an id would be data it has no use for.
  */
  const owned = await getDb()
    .select({ shortCode: rooms.shortCode })
    .from(rooms)
    .where(eq(rooms.accountId, room.accountId))
    .orderBy(asc(rooms.shortCode));

  return json({
    required: answer.required,
    ok: true,
    rooms: owned.map(({ shortCode }) => shortCode)
  });
};
