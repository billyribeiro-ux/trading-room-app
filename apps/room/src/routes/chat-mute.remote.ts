import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { isPresenterRole, requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { chatMutes } from '#lib/server/db/schema.js';
import { publishToUsers } from '#lib/server/room-events.js';

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
