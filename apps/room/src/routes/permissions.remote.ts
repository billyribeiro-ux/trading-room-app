import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { presenterRoom, requireUser } from '#lib/server/auth.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { users } from '#lib/server/db/schema.js';
import { RoomPermissionsRefused, writeRoomPermissions } from '#lib/server/room-config-client.js';
import { ROOM_PERMISSION_KEYS } from '#lib/permission-keys.js';

/*
  The five permission checkboxes, written through to the control plane.

  A module of one, for the reason `username.remote.ts` gives about itself: the GATE is the
  difference. Its neighbours in `presenter-commands.remote.ts` broadcast on this room's own event
  channel and change nothing durable; this one reaches across the seam into the controller's
  `roomUsers.permissionsJson` and changes what a member may do after the next reload. A function
  with that reach, filed among functions without it, is how the reach gets extended by whoever adds
  the next one.
*/

/**
 * `saveCustomPerms` — the Save button on `#permissionsModal`.
 *
 * ## The defect
 *
 * Until 2026-08-23 this button closed the modal and raised the reference's own alert — *"Permissions
 * applied, user will reload the page now to apply..."* — and sent nothing at all. The five checkbox
 * values were `$state` local to `ModalHost.svelte` and never crossed a prop boundary: `onUserAction`
 * carried `(action, targetUser)` and no permissions. So an owner ticked "Admin Chat", read that it
 * had applied, and the membership was untouched.
 *
 * That is the worst shape a defect can take here, and the repository's own standard names it: a
 * control that reports success is one nobody thinks to check. `user-action-intent.ts` already listed
 * the alert as EXACT and correct, which is true — the wording was faithful and the fact was not.
 *
 * ## The reference, byte 2077194, read rather than searched
 *
 * ```js
 * saveCustomPerms() {
 *   console.log(`perms now: Mic: … Screen: … Cam: … adminChat: … canEditNotes: …`),
 *   this.appService.sendServerAdminCommand("changeUserPerms", {user: this.user}),
 *   this.doCloseModal(),
 *   bootbox.alert("Permissions applied, user will reload the page now to apply..."),
 *   this.appService.loadRoster()
 * }
 * ```
 *
 * Its log line names exactly five keys and they are exactly the controller's `PERMISSION_KEYS`. So
 * nothing here is invented: the storage, the writer and the five names all existed, on the far side
 * of a door the room did not have.
 *
 * ## AUTHORITY IS DECIDED TWICE, deliberately
 *
 * `presenterRoom()` here refuses a member before a request leaves this process. The controller then
 * re-checks that the CALLER is an owner or presenter **of this room** and that the TARGET is a
 * member of it, because this room's role and that room's membership are two different facts and only
 * the controller owns the second. This side cannot be the only check — that was the 2026-08-07
 * escalation — and the controller cannot be the only one either, or a member's click would cost a
 * round trip to be told no.
 *
 * ## The target crosses as an EMAIL
 *
 * Ids do not survive the seam: this room's `users.id` is a SQLite row, the controller's is a
 * different Postgres row, and nothing aligns them. The email is looked up HERE from the id the modal
 * already holds, so the client never names the target directly — a client-supplied email would let a
 * presenter aim this at any address at all and rely on the controller's membership check alone.
 *
 * ## What is NOT sent, and why that is a gap rather than a decision
 *
 * `temporaryAccessOnly` is a sixth checkbox in our modal and is **not** one of the five. It is
 * absent from the reference's log line and absent from `PERMISSION_KEYS`, so there is nowhere to
 * put it and no captured behaviour to copy. Recorded in `TODO.md` rather than guessed into the
 * payload, where it would silently become a permission the controller does not know.
 */
export const savePermissions = command(
  z.strictObject({
    targetUserId: z.number().int().positive(),
    /*
      The full state of the five boxes, not a diff — the endpoint writes `false` for every key it
      does not receive. `z.enum` over the shared list is what makes an unknown key a 400 here rather
      than a silent revocation there.
    */
    granted: z.array(z.enum(ROOM_PERMISSION_KEYS)).max(ROOM_PERMISSION_KEYS.length)
  }),
  async ({ targetUserId, granted }) => {
    ensureDatabase();
    /*
      ONE call for both halves, and that is deliberate rather than terse. `presenterRoom()` checks
      the role and THEN returns the caller's own short code, so the authority to act and the tenant
      acted on cannot be applied separately — its own docblock records that splitting them is what
      the 2026-08-07 escalation was. A `roomShortCode` on this command's arguments would let a
      presenter of room A rewrite a membership in room B.
    */
    const room = presenterRoom();
    const actor = requireUser(getRequestEvent().locals);

    const target = db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, targetUserId))
      .get();
    if (!target) error(404, 'No such user.');

    if (target.email.trim().toLowerCase() === actor.email.trim().toLowerCase()) {
      // `giveMicScreen`, two lines below `saveCustomPerms` in the same captured component, refuses
      // the same self-target: "Can't give 'Mic/Screenshare' to yourself."
      error(403, 'You cannot change your own permissions.');
    }

    try {
      await writeRoomPermissions(room, actor.email, target.email, granted);
    } catch (cause) {
      // A refusal is an ANSWER and must not read as an outage; `RoomConfigUnavailable` is left to
      // propagate exactly as it does for every other control-plane call in this app.
      if (cause instanceof RoomPermissionsRefused)
        error(403, 'That permissions change was refused.');
      throw cause;
    }
  }
);
