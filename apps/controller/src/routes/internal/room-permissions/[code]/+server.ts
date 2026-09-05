import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { getDb } from '#lib/server/db/index.js';
import { ACCOUNT_ACTIVE, accounts, roomUsers, rooms, users } from '#lib/server/db/schema.js';
import { PERMISSION_KEYS, savePermissions, type PermissionKey } from '#lib/server/rooms.js';
import { isRoomPresenter } from '#lib/room-member-role.js';
import { verifyConfigWriteToken } from '#lib/server/room-handoff.js';
import { membershipAuthorityMode } from '#lib/server/control-plane-runtime.js';
import { applyRoomMembershipControl, RoomMembershipControlError } from '#lib/server/room-membership-control.js';
import type { RequestHandler } from './$types';

/**
 * `POST /internal/room-permissions/<shortCode>?email=<caller>` — the room saving one member's five
 * permission checkboxes.
 *
 * ## The defect this closes
 *
 * `#permissionsModal`'s Save button raised the reference's alert — *"Permissions applied, user will
 * reload the page now to apply..."* — closed the modal, and sent NOTHING. Worse than a dead button,
 * because it reported success: an owner ticking "Admin Chat" watched the box tick, read that it had
 * applied, and the member's membership never changed.
 *
 * The reference's own method, bundle byte 2077194, read rather than searched:
 *
 * ```js
 * saveCustomPerms() {
 *   console.log(`perms now: Mic: ${this.user.hasMic}. Screen: ${this.user.hasScreen}. …`),
 *   this.appService.sendServerAdminCommand("changeUserPerms", {user: this.user}),
 *   this.doCloseModal(),
 *   bootbox.alert("Permissions applied, user will reload the page now to apply..."),
 *   this.appService.loadRoster()
 * }
 * ```
 *
 * FIVE keys, and the log line names all five — they are exactly `PERMISSION_KEYS`, which the Manage
 * page has always written through `savePermissions`. So this endpoint adds no storage and no schema:
 * it gives the ROOM a door to a write the controller already performs.
 *
 * ## Why a controller endpoint and not a room-side write
 *
 * The two apps hold two databases. `roomUsers.permissionsJson` lives here, is read by
 * `internal/room-config` and is what `readRoomConfig` hands the room on every page load. A room-side
 * copy would be a second answer to "what may this member do", and the room's own copy would lose on
 * the next load — which is the same argument `internal/room-setting` makes for
 * `overwriteCashRegisterSound`.
 *
 * ## THE TARGET IS NAMED BY EMAIL, because ids do not cross the seam
 *
 * The room's `users.id` is a row in the room's own SQLite; this app's `users.id` is a different row
 * in PostgreSQL. They are not the same number and nothing keeps them aligned. Email is the key the
 * seam already uses — `readRoomConfig(requestKey, code, email)` and `?email=` on both sibling
 * endpoints — so the target is named the same way the caller is. Sending a room-side id here would
 * write somebody else's permissions, silently, and the two systems would have to drift only once.
 *
 * ## Two authority checks, and they are different questions
 *
 * The CALLER (`?email=`) must be the owner or a true presenter of this room — the same disjunction
 * `internal/room-config` computes for `isP`, and re-checked here for `internal/room-setting`'s
 * reason: the room hides the button from a member, and a hidden button is not an authorization
 * check.
 *
 * The TARGET must be a member of THIS room. Without that, a presenter of room A could name any
 * email in the deployment and grant it permissions — the membership row would simply not be found,
 * but only because the query happens to be scoped; stating it as its own check makes the scope a
 * rule rather than an accident of how the SELECT was written.
 *
 * **A presenter may not edit their own permissions.** Nothing upstream says so in as many words, and
 * it is not invented from taste: `giveMicScreen` two lines below `saveCustomPerms` in the same
 * component refuses exactly this — *"Can't give 'Mic/Screenshare' to yourself."* — so the reference
 * does draw this line on the neighbouring control. The narrow reading is applied to the control that
 * can remove `hasAdminChat` from the person pressing it.
 *
 * ## The credential
 *
 * A bearer MAC over `<code>.<timestamp>`, valid for 60 seconds, domain-separated as `config-write:`
 * and verified by `verifyConfigWriteToken`. **A `config-read:` capability is REFUSED here.** This
 * used to inherit `internal/room-setting`'s caveat that a read capability authorised the write; the
 * prefixes were split on 2026-08-27 and the refusal is asserted by
 * `config-read-cannot-write-contract.test.ts` rather than described here.
 */
export const POST: RequestHandler = async ({ params, request, url }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) {
    // Same posture as the sibling endpoints: fail loudly, and do not name the private variable.
    error(500, 'Room configuration is not available.');
  }

  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const verified = verifyConfigWriteToken(secret, params.code, presented);
  if (!verified.ok) {
    // One status and one message for all three reasons; the reason is for the log, not the caller.
    console.warn('[room-permissions] rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }

  let payload: { targetEmail?: unknown; granted?: unknown };
  try {
    payload = (await request.json()) as { targetEmail?: unknown; granted?: unknown };
  } catch {
    error(400, 'A JSON body is required.');
  }

  const targetEmail = typeof payload.targetEmail === 'string' ? payload.targetEmail.trim().toLowerCase() : '';
  if (!targetEmail) error(400, 'A target member is required.');

  /*
    DENY BY DEFAULT, and the shape is what enforces it.

    `granted` is a list of keys to turn ON; `savePermissions` writes `false` for every key not in it,
    so an omitted key is a REVOCATION rather than "leave it alone". That is what the modal means —
    it posts the state of five checkboxes, not a diff — and it is why an unknown key is refused
    outright instead of ignored: a client sending `hasMicrophone` would otherwise read as having
    turned the microphone off.
  */
  if (!Array.isArray(payload.granted)) error(400, 'A granted list is required.');
  const granted: PermissionKey[] = [];
  for (const key of payload.granted) {
    if (typeof key !== 'string' || !(PERMISSION_KEYS as readonly string[]).includes(key)) {
      console.warn('[room-permissions] refused: unknown key', { code: params.code, key });
      error(400, 'Unknown permission.');
    }
    if (!granted.includes(key as PermissionKey)) granted.push(key as PermissionKey);
  }

  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');

  // A suspended account's rooms stop serving, reads and writes alike. 404 for the same reason
  // `internal/room-config` gives: a suspended room is indistinguishable from one that never was.
  const [account] = await getDb()
    .select({ status: accounts.status, authorityEnterpriseId: accounts.authorityEnterpriseId })
    .from(accounts)
    .where(eq(accounts.id, room.accountId))
    .limit(1);
  if (!account || account.status !== ACCOUNT_ACTIVE) {
    console.warn('[room-permissions] refused: account not active', {
      code: params.code,
      status: account?.status ?? 'missing'
    });
    error(404, 'Room not found');
  }

  const callerEmail = url.searchParams.get('email')?.trim().toLowerCase();
  if (!callerEmail) error(400, 'A member is required.');

  // One read for both memberships: the caller's, to check authority, and the target's, to write.
  // Scoped to this room by the WHERE, which is also what keeps a presenter of room A out of room B.
  const memberships = await getDb()
    .select({ roomUser: roomUsers, user: users })
    .from(roomUsers)
    .innerJoin(users, eq(roomUsers.userId, users.id))
    .where(eq(roomUsers.roomId, room.id));

  const caller = memberships.find((row) => row.user.email.trim().toLowerCase() === callerEmail);
  // A guest has no membership row and therefore no authority. Not an error the room can retry —
  // 403, because the caller is authenticated and the answer will not change.
  if (!caller) error(403, 'Not a member of this room.');

  // The owner counts, exactly as `internal/room-config` computes `isP`.
  const callerIsPresenter = caller.roomUser.role === 0 || isRoomPresenter(caller.roomUser);
  if (!callerIsPresenter) {
    console.warn('[room-permissions] refused: not a presenter', { code: params.code });
    error(403, 'Presenters only.');
  }

  const target = memberships.find((row) => row.user.email.trim().toLowerCase() === targetEmail);
  if (!target) {
    console.warn('[room-permissions] refused: target not in this room', { code: params.code });
    error(404, 'That member is not in this room.');
  }

  // See the docblock: `giveMicScreen` refuses the same self-target one control over.
  if (target.roomUser.id === caller.roomUser.id) {
    error(403, 'You cannot change your own permissions.');
  }

  if (membershipAuthorityMode === 'rust') {
    const permissions = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, granted.includes(key)])) as Record<
      PermissionKey,
      boolean
    >;
    try {
      await applyRoomMembershipControl({
        accountId: room.accountId,
        authorityEnterpriseId: account.authorityEnterpriseId,
        authorityRoomId: room.authorityRoomId,
        actor: caller.roomUser,
        target: target.roomUser,
        operation: {
          type: 'setPermissions',
          publishMic: permissions.hasMic,
          publishScreen: permissions.hasScreen,
          publishCam: permissions.hasCam,
          useAdminChat: permissions.hasAdminChat,
          editNotes: permissions.canEditNotes
        }
      });
      return json({ permissions });
    } catch (reason) {
      if (reason instanceof RoomMembershipControlError) error(reason.status, reason.message);
      throw reason;
    }
  }

  const stored = await savePermissions(room.id, target.roomUser.id, granted);
  return json({ permissions: stored });
};
