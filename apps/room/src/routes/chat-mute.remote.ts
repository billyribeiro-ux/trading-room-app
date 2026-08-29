import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { isPresenterRole, requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { applyChatMute } from '#lib/server/chat-mute.js';
import { chatMutes, users } from '#lib/server/db/schema.js';
import { publishToUsers } from '#lib/server/room-events.js';
import { writeRoomMute } from '#lib/server/room-config-client.js';

/*
  `unmuteChat` — the lift, and the half of the pair that was never built.

  The mute existed end to end: `mute24` in `+page.server.ts` writes the row, `sendMessage` refuses
  while one is live, and the loader exposes the viewer's own `chatMutedTill` so the composer can say
  why. The UNMUTE existed only as a button. `ModalHost.svelte` renders "Unmute Chat", it calls
  `onUserAction('unmute-chat', …)`, and the handler's only effect was to raise the reference's alert
  string. A presenter could mute somebody permanently-by-accident and had no way back except waiting
  out the 24 hours, while the UI told them the unmute had worked.

  Upstream it is a command of its own on the wire (`{user}`, main bundle bytes 996325, 1430505,
  2080257 and 2376996) reached only through `muteChat(-1)` — there is no button bound directly to
  it, which is why an identifier search for `unmuteChat` in our source found nothing to match.

  WHY THIS IS A REMOTE COMMAND AND NOT A FORM ACTION. It began as `?/unmuteChat` in
  `+page.server.ts`, posted by hand with `fetch` and a `FormData` body. Nothing about that was
  type-checked: the endpoint was a string, the id was stringified on the way out and re-parsed with
  `Number()` on the way in, and failure came back as a boolean on a `Response`. As a command the
  client calls a function with a real signature, the argument is validated once by the schema below,
  and a refusal is a rejected promise rather than `response.ok === false` — which the caller was
  free to ignore, and which is exactly how the original silent-success bug was able to exist.

  It is a `command` rather than a `form` because there is no `<form>`. `form` is the better default
  precisely because it degrades without JavaScript, but this control is a menu item inside a modal
  that only exists once the room's client has booted; wrapping it in a form to satisfy the
  preference would be scaffolding around a submit button nobody can reach without JS.
*/

/**
 * The one argument, validated on the server and nowhere else.
 *
 * `positive()` is deliberately tighter than the `Number.isInteger(targetUserId)` guard it replaces,
 * which admitted `0` and negatives and let them reach the WHERE clause to match nothing. `users.id`
 * is `primaryKey({ autoIncrement: true })`, so every real id is ≥ 1 and nothing legitimate is
 * refused. Matches the shape already used by `notes-command.ts` and its siblings.
 */
const unmuteChatArgs = z.strictObject({
  targetUserId: z.number().int().positive()
});

/**
 * *" Mute Chat for 24hrs "* — the user modal's button, which until now raised an alert and stopped.
 *
 * ## Two doors, one act
 *
 * The message context menu's `mute24` has written a real row since the port began. This modal button
 * sat in `EXACT_ALERTS` raising the reference's own *"user chat muted"* over nothing at all, and the
 * table's docblock named it: *"`mute-chat-24` from this modal does not mute"*. Both doors now call
 * `applyChatMute`, so there is one insert and one announcement rather than two of each.
 *
 * ## Why here and not beside `mute24`
 *
 * `messageAction` is keyed by a MESSAGE — `kind` and `id` are required on every branch of its union,
 * because every other operation acts on one. This button acts on a PERSON and has no message in
 * hand; reaching `mute24` from it would mean inventing a message id to satisfy a schema. It belongs
 * beside `unmuteChat`, which is the command it undoes and which takes exactly the same one argument.
 *
 * The reference agrees on the shape. Both directions are one method there —
 * `muteChat(e){ e >= 0 ? sendServerAdminCommand("muteChat", {user, time:e}) : … "unmuteChat" … }` at
 * bundle byte 2080089 — and the menu calls it with the strings `"24"`, `"0"` and `"-1"`. Splitting
 * the sign into two named commands is this repository's boundary, not a divergence in behaviour:
 * `"-1"` is not a duration, it is a different verb wearing one.
 *
 * **`"0"` — *" Mute Chat indefinately "*, the reference's own spelling — is NOT built here**, and is
 * not silently folded into 24 hours. An indefinite mute already exists in this system as the
 * controller's opcode 3 (`role = 3`, `muted = true`), which `refuseIfChatMuted` already enforces
 * through `member.muted`; what is missing is a door from the room to it, the way `internal/room-ban`
 * is the door for a ban. That is its own change and `TODO.md` carries it with this evidence.
 */
export const muteChat = command(unmuteChatArgs, async ({ targetUserId }) => {
  ensureDatabase();

  const { locals } = getRequestEvent();

  // Identical authority to the unmute below, and for the identical reason. A member who POSTs this
  // endpoint directly gets a 403 rather than the power to silence somebody.
  const roomShortCode = requireRoomShortCode(locals);
  const caller = requireUser(locals);
  if (!isPresenterRole(caller.role)) error(403, 'Presenters only.');

  applyChatMute(roomShortCode, targetUserId, caller.id);
});

/**
 * *" Mute Chat indefinately "* — the reference's own spelling, and the LAST control in this room that
 * reported success and sent nothing.
 *
 * ## What it was
 *
 * A key of `EXACT_ALERTS` with no branch anywhere: the presenter clicked it, read the capture's own
 * *"user chat muted"*, and the member kept posting. It stayed there deliberately while its neighbour
 * `mute-chat-24` was fixed, with the reason recorded rather than guessed — an indefinite mute ALREADY
 * exists in this system as the controller's opcode 3, and the missing piece was a door from the room
 * to it. `internal/room-mute` is that door and this is the room's half.
 *
 * ## Why it does not just write a very long `chat_mutes` row
 *
 * Because that would be a different fact wearing the same label. `refuseIfChatMuted` reads TWO
 * sources — the room's SQLite row for the 24-hour mute, and `member.muted` off the membership the
 * controller hands over on every load — and only the second survives a room restart, a second
 * instance, or a look at the manage page. A member muted "indefinitely" in SQLite would show as
 * unmuted everywhere the owner actually administers their room.
 *
 * ## The target crosses the seam by EMAIL
 *
 * `users.id` here and `users.id` on the controller are different rows in different databases. This
 * resolves the address the same way `kickUser` does for its ban, and refuses a self-target here as
 * well as there — the controller refuses it regardless, and refusing early saves a member's click a
 * round trip.
 *
 * The alert is raised by the caller through `#announceThenSend`, as it is for every other control in
 * this family: the reference alerts immediately, not on the response.
 */
export const muteChatIndefinitely = command(unmuteChatArgs, async ({ targetUserId }) => {
  ensureDatabase();

  const { locals } = getRequestEvent();

  // Identical authority to its two neighbours, from data the server owns. A member POSTing this
  // endpoint directly gets a 403 rather than the power to silence somebody permanently.
  const roomShortCode = requireRoomShortCode(locals);
  const caller = requireUser(locals);
  if (!isPresenterRole(caller.role)) error(403, 'Presenters only.');

  const target = db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, targetUserId))
    .get();
  if (!target) error(404, 'No such user.');
  if (target.email.trim().toLowerCase() === caller.email.trim().toLowerCase()) {
    error(403, 'You cannot mute yourself.');
  }

  await writeRoomMute(roomShortCode, caller.email, target.email, true);

  /*
    The member is TOLD, on the same channel and with the same frame the 24-hour mute uses.

    Without this the composer stays open until something else happens to invalidate the load, and the
    member types a message into a box that will refuse it. `muteChat` is the capture's own command
    name and `RoomChatMute.muted` is the receiver; `mutedTill` is absent because there is no expiry,
    which is the one honest difference between the two mutes and is what the receiver renders.
  */
  publishToUsers(roomShortCode, [targetUserId], {
    channel: 'privCmds',
    data: { cmd: 'muteChat', targetUserId }
  });
});

export const unmuteChat = command(unmuteChatArgs, async ({ targetUserId }) => {
  ensureDatabase();

  const { locals } = getRequestEvent();

  /*
    Server-side authority, from data the server owns. `role` comes off the session, never from the
    client — a member who POSTs this command's endpoint directly gets a 403 rather than the power to
    unmute themselves the moment a presenter mutes them.

    `error(403)` rather than the `fail(403)` this used as a form action: `fail` returns a value that
    only a form action's caller understands, and a command has no such caller. `error` rejects the
    client's promise, which is the failure the call site can actually see.
  */
  const roomShortCode = requireRoomShortCode(locals);
  if (!isPresenterRole(requireUser(locals).role)) error(403, 'Presenters only.');

  db.delete(chatMutes)
    .where(
      and(
        /*
          Room-scoped for the same reason the mute is: authority here is per room, and a presenter
          of this room must not reach into a room they hold nothing in.
        */
        eq(chatMutes.roomShortCode, roomShortCode),
        eq(chatMutes.targetUserId, targetUserId),
        /*
          Only LIVE mutes. Rows whose `expiresAt` has passed are already inert — the loader and
          `sendMessage` both compare against `now` — so deleting them would destroy the record of
          past mutes to no effect.
        */
        gt(chatMutes.expiresAt, new Date())
      )
    )
    .run();

  /*
    One conditional DELETE, no SELECT first: reading the row and then deleting it is the TOCTOU this
    repository fixes everywhere else, and the delete is already idempotent, so a double click is a
    no-op rather than a race.

    `/privCmdsIn/{uid}-{id}/` — the per-user private channel, the same one `forceReload` uses.
    Without this the unmuted member keeps the disabled composer until they happen to reload, which
    is the same silence the mute already had: the state changed and nobody was told.
  */
  /*
    ADDRESSED — 2026-08-19. This channel's own docblock says "Both are addressed to ONE member,
    which is what this channel is for", and it was published to the whole room with the browser
    doing the filtering. Being muted is a disciplinary state; who has just been un-muted is between
    the presenter and that member.
  */
  publishToUsers(roomShortCode, [targetUserId], {
    channel: 'privCmds',
    data: { cmd: 'unmuteChat', targetUserId }
  });
});
