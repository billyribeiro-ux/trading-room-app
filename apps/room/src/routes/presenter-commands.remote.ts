import { command } from '$app/server';
import { z } from 'zod';
import { presenterRoom } from '$lib/server/auth';
import { ensureDatabase } from '$lib/server/db';
import { publishToRoom } from '$lib/server/room-events';

/*
  A presenter commands the room: mute somebody's mic, or pull everybody to one screen.

  Both broadcast on the `cmds` channel, both are refused to non-presenters, and both scope the
  broadcast to the caller's own room — which is why they are one module. What they do NOT share is a
  payload, and that separation is load-bearing rather than incidental:

    `presenterCommand`  names a PERSON  — `{subCmd, targetUserId}`, target validated as an integer
    `focusOnScreen`     names a SCREEN  — `{screenId}`, a string

  `focus-on-screen-contract.test.ts` exists because folding the second into the first was tried and
  is wrong: `presenterCommand` refuses anything without an integer target, so carrying a screen id
  through it would have meant loosening a check to fit a payload it was never for. Two shapes, two
  schemas — and now one gate and one room scope, written once instead of twice.

  THE GATE IS THE POINT OF THE MODULE. Both actions previously inlined
  `requireUser(locals).role === 'staff' || requireUser(locals).role === 'admin'`, which is
  `isPresenterRole` spelled out by hand, twice, next to each other. That is the duplication this
  whole conversion exists to remove: an invariant repeated per call site is an invariant that can be
  fixed in one place and left wrong in the other.

  It became `presenterRoom()` in this file, and then MOVED AGAIN to `$lib/server/auth.ts` the moment
  `for-all-broadcast.remote.ts` needed the same gate — because leaving it here would have recreated
  the duplication one level up, between modules instead of between actions. It returns the room only
  after the role check, so "gated" and "scoped to the caller's tenant" are the same event and cannot
  be applied separately.

  Authority is decided on the SERVER, from the session's own role, and never asserted by the client.
  The clients do check `isPresenter` before calling — but that is responsiveness, not security, and
  the 2026-08-07 privilege escalation was exactly the mistake of believing otherwise.

  HOW A REFUSAL SURFACES. Every call site is fire-and-forget: upstream shows the presenter nothing
  when a broadcast fails, and inventing a toast would be a change to what the room does. But a
  rejection that is simply dropped is the swallowed catch this repository forbids, and these can
  only reject for real faults — a network failure, or a 403 meaning the client and server disagree
  about who is a presenter. So the call sites `catch` to `console.error`: loud in the one place that
  costs the room nothing, and honest that the user has not been told.
*/

/**
 * `remotePresCommand` — a presenter mutes one member's mic, camera or screens.
 *
 * The three subCmds are the capture's own and the list is deny-by-default. An unknown string would
 * be forwarded to every client in the room and dispatched by none: a silent no-op, which is worse
 * than a refusal because nothing anywhere reports it. `z.enum` is the allow-list that was a
 * `new Set([...])` check — same three values, now refused before the handler runs rather than inside
 * it.
 */
export const presenterCommand = command(
  z.strictObject({
    subCmd: z.enum(['mutemic', 'mutecam', 'mutescreens']),
    // Names a PERSON. `users.id` is an autoincrement primary key, so every real target is >= 1.
    targetUserId: z.number().int().positive()
  }),
  async ({ subCmd, targetUserId }) => {
    ensureDatabase();
    publishToRoom(presenterRoom(), {
      channel: 'cmds',
      data: { cmd: 'remotePresCommand', subCmd, targetUserId }
    });
  }
);

/**
 * `focusOnScreen` — a presenter pulls the whole room to one screen.
 *
 * `bringFocusToScreen(e) { e && this.appService.sendServerAdminCommand("focusOnScreen", {id: e}) }`
 * (`main.d6d3c112b59b7d0d.js` byte 1918706 for the menu item, and the method itself). It is a SERVER
 * command upstream and has to be one here: the room learns about it over the same `cmds` channel
 * every other broadcast uses, and the authority to send it belongs to the server.
 *
 * `.min(1)` after `.trim()` is the reference's `e &&`. It sends nothing for an empty id, and an
 * empty broadcast would ask every client in the room to focus a screen that does not exist.
 */
export const focusOnScreen = command(z.string().trim().min(1), async (screenId) => {
  ensureDatabase();
  publishToRoom(presenterRoom(), { channel: 'cmds', data: { cmd: 'focusOnScreen', screenId } });
});
