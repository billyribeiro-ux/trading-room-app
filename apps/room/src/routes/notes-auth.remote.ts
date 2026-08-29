import { command } from '$app/server';
import { z } from 'zod';
import { presenterRoom } from '#lib/server/auth.js';
import { checkNotesPasswordRemotely } from '#lib/server/room-config-client.js';

/*
  `admin-notes-password` — the last of row W's lying controls, and the smallest possible fix for it.

  `RoomUserActions.handle` raised the reference's own prompt and then set `'Wrong password!'`
  UNCONDITIONALLY. Its `onconfirm` took no parameter, so the typed value was never received — not
  merely uncompared. A presenter typing the correct password was told it was wrong, every time.

  The primitive was never the problem: `RoomPrompt.onconfirm` is `(value: string) => void` and
  `BootboxDialog.svelte` calls `onconfirm?.(promptResult())`. The value arrived and was discarded.
  What was missing was somewhere for it to GO.

  WHY THE COMPARISON IS NOT DONE HERE. `needPasswordForUserNotes` is one of the seven
  credential-shaped settings that may never reach the room — `room-config-boundary.test.ts` enforces
  it — so the room cannot hold the password to compare against. The reference can, because its room
  and its site are one system and `sessData` already carries it (bundle byte 2,081,768). This
  reconstruction split them, so the credential stays on the controller and the QUESTION travels:
  `internal/room-notes-auth/[code]` compares and answers two booleans. That is the same shape
  `internal/room-entry` uses for the room passwords, for the reason its own header gives.

  WHY A COMMAND AND NOT A FORM. There is no `<form>`. This is a button inside a modal that only
  exists once the room's client has booted, and its answer is consumed by a dialog callback rather
  than by a navigation — the same argument `chat-mute.remote.ts` records for `unmuteChat`.
*/

/**
 * The candidate, and the only thing the client may send.
 *
 * `z.strictObject` rather than `z.object`, so a field the caller invents is REFUSED rather than
 * ignored — the room must not be able to smuggle a room code, a target user or an `allow` flag past
 * a schema that silently drops what it does not know. The room comes from the session below and
 * nowhere else.
 *
 * The empty string is deliberately VALID. The first call of every interaction carries it: it is how
 * the room asks *"is a password required at all?"*, which is the reference's own first branch
 * (`needPasswordForUserNotes && !allowToManageNotes`) asked of the only machine that can answer it.
 *
 * Length-capped because this string is compared against a secret. Nothing legitimate is near 512
 * characters, and an unbounded body on a comparison endpoint is work a caller can ask for for free.
 */
const CANDIDATE = z.strictObject({ candidate: z.string().max(512) });

/**
 * Whether this presenter may manage a member's notes, decided on the controller.
 *
 * Returns the controller's answer unchanged: `required` says whether the room has a notes password
 * configured at all, `ok` whether access is granted. The room grants on `ok` and prompts only when
 * `required` — it never sees, caches or derives the password itself.
 *
 * **Presenters only, and the room comes from the session.** `presenterRoom()` reads both from
 * `locals`, so neither is assertable by the caller. That is the 2026-08-07 privilege escalation's
 * rule applied here: an authority decision is made on the server from data the server owns.
 *
 * A controller that cannot be reached throws `RoomConfigUnavailable` out of this command rather than
 * resolving to `{ok:false}`. Both directions of the alternative are wrong: a network failure must not
 * read as a granted request, and it must not tell a presenter their correct password was refused.
 */
export const checkNotesPassword = command(CANDIDATE, async ({ candidate }) => {
  const room = presenterRoom();
  return await checkNotesPasswordRemotely(room, candidate);
});
