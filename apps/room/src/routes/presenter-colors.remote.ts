import { command, getRequestEvent } from '$app/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { isPresenterColor } from '#lib/presenter-colors.js';
import { presenterRoom, requireUser } from '#lib/server/auth.js';
import { hashEmail } from '#lib/server/connection.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { presenterColors } from '#lib/server/db/schema.js';
import { publishToRoom } from '#lib/server/room-events.js';

/*
  `sendServerAdminCommand('savePresenterColors', {key, val})` — the two colours every viewer in the
  room sees on this presenter's messages and alerts.

  `#lib/presenter-colors.ts` carries the transcription of all four reference sites, the render
  precedence and the defect this closes. This file is the WRITE, and the two things worth reading
  here are what it refuses to accept and what it does with the empty pair.

  ## THE KEY IS NOT ON THE WIRE, and that is the whole point

  The reference sends it:

  ```js
  sendServerAdminCommand("savePresenterColors", {
    key: hashEmail(globals.user.email),
    val: { bkgColor: this.presenterStyle.bgColor, color: this.presenterStyle.color }
  })
  ```

  `key` is the client telling the server WHOSE colours these are. Anyone who can reach that socket
  can therefore recolour any presenter's messages by sending somebody else's hash — and the hash of
  an email is not a secret, it is the gravatar identifier this room puts in every roster row and
  every rendered message.

  So the command below takes the two colours and nothing else. The row it writes is keyed by
  `hashEmail` of the SESSION's own account, resolved here, from data the server owns. This is the
  rule `CLAUDE.md` states as *"every authority decision is made on the server from data the server
  owns — never asserted by the client"*, and it is the shape the 2026-08-07 privilege escalation was
  fixed by. The divergence from the reference's wire format is deliberate and is not a candidate for
  "matching the capture more closely".

  ## The empty pair DELETES

  Reset upstream is a send, not a local revert: `{bkgColor:"", color:""}`, which its renderer then
  skips on `o.color && o.bkgColor`. Storing an empty row here would reproduce that two-state
  encoding in a table whose columns are `NOT NULL`, so `clearPresenterColors` deletes instead. "No
  override" is then exactly one thing — no row — and the render test is `entry !== undefined`
  rather than a truthiness check on two strings.

  ## Presenter-gated on the SERVER

  Both commands go through {@link presenterRoom}, which makes the role check and the room scope one
  event. The pickers are inside `{#if isPresenter}` in the modal too, and a hidden control has never
  been an authorization check here.
*/

/**
 * The payload, and the reason both halves are validated rather than trusted.
 *
 * `<input type="color">` cannot produce anything but `#rrggbb`, so a value that is not that shape
 * did not come from the control. It is refused rather than coerced: these two strings are
 * interpolated into a `style=` attribute on every message this presenter has ever sent, to every
 * viewer in the room, so the set of things that can reach that attribute is kept to seven
 * characters of hex by the narrowest check that admits the real control's output.
 *
 * `z.strictObject` for the reason every command in this room uses it — an unexpected field is a
 * caller that thinks it is talking to a different version of this endpoint, and accepting it
 * silently is how `key` would come back.
 */
const PresenterColorPayload = z.strictObject({
  color: z.string().refine(isPresenterColor, 'Expected #rrggbb'),
  bgColor: z.string().refine(isPresenterColor, 'Expected #rrggbb')
});

/** The caller's own hash — never a value that arrived with the request. */
function ownEmailHash(): string {
  const { locals } = getRequestEvent();
  return hashEmail(requireUser(locals).email);
}

/**
 * Stores this presenter's two colours for this room, and tells the room.
 *
 * One `INSERT … ON CONFLICT DO UPDATE` against the composite primary key, so a second save replaces
 * the presenter's pair rather than appending a second opinion about what it is — the same shape
 * `changeChatMode` uses, and for the same reason.
 *
 * ## No return value, because the client must not believe one
 *
 * The row the server wrote is the answer, and the broadcast makes every tab re-read it — including
 * the one that sent this. Handing the colours back for the caller to assign would create a second
 * source of truth, and the client's copy is the one nobody can audit.
 */
export const savePresenterColors = command(PresenterColorPayload, async ({ color, bgColor }) => {
  ensureDatabase();
  const room = presenterRoom();
  const senderEmailHash = ownEmailHash();
  const updatedAt = new Date();

  db.insert(presenterColors)
    .values({
      roomShortCode: room,
      senderEmailHash,
      textColor: color,
      backgroundColor: bgColor,
      updatedAt
    })
    .onConflictDoUpdate({
      target: [presenterColors.roomShortCode, presenterColors.senderEmailHash],
      set: { textColor: color, backgroundColor: bgColor, updatedAt }
    })
    .run();

  publishToRoom(room, { channel: 'cmds', data: { cmd: 'presenterColorsChanged' } });
});

/**
 * Clears this presenter's colours for this room, and tells the room.
 *
 * The reference's Reset, which sends the empty pair. Deleting is that with the two-state encoding
 * removed — see the note at the top of this file. Deleting a row that is not there is not an error
 * and is not reported as one: pressing Reset twice is a presenter saying the same true thing twice.
 *
 * `z.void()` rather than an empty object: this command has no argument at all, and giving it one
 * would be inventing a field for a caller to fill in.
 */
export const clearPresenterColors = command(z.void(), async () => {
  ensureDatabase();
  const room = presenterRoom();
  const senderEmailHash = ownEmailHash();

  db.delete(presenterColors)
    .where(
      and(
        eq(presenterColors.roomShortCode, room),
        eq(presenterColors.senderEmailHash, senderEmailHash)
      )
    )
    .run();

  publishToRoom(room, { channel: 'cmds', data: { cmd: 'presenterColorsChanged' } });
});
