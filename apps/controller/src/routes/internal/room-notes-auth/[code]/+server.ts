import { error, json } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { getDb } from '#lib/server/db/index.js';
import { rooms } from '#lib/server/db/schema.js';
import { readSettings } from '#lib/server/rooms.js';
import { resolveRoomConfig } from '#lib/room-config.js';
import { verifyConfigReadToken } from '#lib/server/room-handoff.js';
import type { RequestHandler } from './$types';

/**
 * `POST /internal/room-notes-auth/<shortCode>` — may this presenter manage a member's notes?
 *
 * ## The defect this closes
 *
 * `TODO.md` row W's last remaining liar. `user-actions.svelte.ts`'s `admin-notes-password` raised the
 * reference's own prompt and then set `'Wrong password!'` **unconditionally** — its `onconfirm` took
 * no parameter, so the typed value was never even received. A presenter typing the correct password
 * was told it was wrong, every time, and nothing in the room could tell them otherwise.
 *
 * ## Why the ROOM cannot answer this, and why that is not a limitation
 *
 * The reference compares in the browser, at bundle byte 2,081,768:
 *
 * ```js
 * manageAdminNotes(){
 *   this.appService.globals.sessData.needPasswordForUserNotes && !this.allowToManageNotes
 *     ? bootbox.prompt({ title:"Please enter the password to manage user's notes:", value:"",
 *         callback: e => { e && (e.trim() === this.appService.globals.sessData.needPasswordForUserNotes
 *           ? this.allowToManageNotes = !0 : bootbox.alert("Wrong password!")) } })
 *     : this.allowToManageNotes = !0
 * }
 * ```
 *
 * It can do that because `sessData` already holds the password. **This reconstruction must not put it
 * there.** `needPasswordForUserNotes` is one of the seven credential-shaped settings that may never
 * reach the room: the room serialises its config into SSR HTML and into the `__sveltekit` payload, so
 * a room-visible setting reaches the browser, every cache in front of the room, and any HAR attached
 * to a support ticket. So the credential stays here and the QUESTION travels — the same split
 * `internal/room-entry` makes for the room passwords, and for the same recorded reason.
 *
 * ## One endpoint answers BOTH questions, which is what makes the behaviour match
 *
 * The reference's first branch is `needPasswordForUserNotes && !allowToManageNotes`: when **no
 * password is configured it never prompts at all** and grants access immediately. A room that cannot
 * see the setting cannot make that decision locally, and inventing a second crossing boolean would
 * put a fact derived from a credential onto the wire for one caller.
 *
 * So `required` is returned beside `ok`. The room asks once with an empty candidate: `required:false`
 * means grant without prompting, exactly as upstream does; `required:true` means raise the prompt and
 * ask again with what was typed. One round trip in the case that already opens a modal, and nothing
 * derived from the credential is ever cached in the room.
 *
 * ## The comparison
 *
 * `candidate.trim() === configured` — the CANDIDATE is trimmed and the stored value is not, which is
 * upstream's `e.trim() === …` reproduced rather than tidied. An owner who configured a password with
 * a trailing space has a password with a trailing space, and matching that is the point.
 *
 * Constant-time, over equal-length buffers, because a length-varying compare on a secret is the one
 * shape that leaks it a character at a time. `timingSafeEqual` throws on unequal lengths, so the
 * length check comes first and the comparison only runs when it can be meaningful.
 */
export const POST: RequestHandler = async ({ params, request }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) {
    // Same posture as `room-config` and `room-entry`: fail loudly rather than accept an
    // unauthenticated read, and do not name the private configuration variable in a response body.
    error(500, 'Notes authorisation is not available.');
  }

  /*
    The READ capability, not the write one. This endpoint changes nothing — it answers a question
    about a value the controller holds — and `config-write-capability-contract.test.ts` draws that
    line: a write token is refused here, and a read token is refused by every write route.
  */
  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const verified = verifyConfigReadToken(secret, params.code, presented);
  if (!verified.ok) {
    // One status and one message for every failure reason; the reason is for the log, not the body.
    console.warn('[room-notes-auth] rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }

  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');

  const attempt = (await request.json()) as { candidate?: unknown };
  const candidate = typeof attempt.candidate === 'string' ? attempt.candidate : '';

  const configured = String(
    resolveRoomConfig(await readSettings(room.id)).values.needPasswordForUserNotes ?? ''
  );

  if (configured === '') {
    /*
      No password configured — upstream grants immediately and never prompts. `required:false` is what
      lets the room reproduce that without ever holding the setting.
    */
    return json({ required: false, ok: true });
  }

  const offered = Buffer.from(candidate.trim());
  const expected = Buffer.from(configured);
  const ok = offered.length === expected.length && timingSafeEqual(offered, expected);

  return json({ required: true, ok });
};
