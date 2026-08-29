import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { getDb } from '#lib/server/db/index.js';
import { ACCOUNT_ACTIVE, accounts, roomUsers, rooms, users } from '#lib/server/db/schema.js';
import { isRoomPresenter } from '#lib/room-member-role.js';
import { userOpcodePatch } from '#lib/server/rooms.js';
import { verifyConfigWriteToken } from '#lib/server/room-handoff.js';
import type { RequestHandler } from './$types';

/**
 * `POST /internal/room-mute/<shortCode>?email=<caller>` — the room muting one member INDEFINITELY.
 *
 * ## The defect this closes
 *
 * *" Mute Chat indefinately "* — the reference's own spelling — was the last entry in `EXACT_ALERTS`
 * with no branch anywhere: it raised the capture's *"user chat muted"* and sent nothing. Its
 * neighbour `mute-chat-24` was fixed on 2026-08-23 and this one deliberately was not, with the
 * reason recorded at three separate sites: an indefinite mute ALREADY EXISTS in this system as the
 * controller's opcode 3, and what was missing was a door from the room to it. This is that door.
 *
 * ## Why the 24-hour mute and this one do not share a mechanism
 *
 * Upstream they are one command distinguished by a number — `muteChat(e)` sends `{user, time:e}` with
 * `"24"` or `"0"` (bundle byte 2080089). Here they are two, because the two durations are held in two
 * different STORES and always have been:
 *
 *   24 hours     the room's own SQLite `chat_mutes` row, enforced by `refuseIfChatMuted`
 *   indefinite   the controller's `roomUsers.role = 3, muted = true`, enforced by the same function
 *                reading `member.muted` off the membership the room asks for on every load
 *
 * **HONEST GAP, inherited rather than introduced: the `time` VALUE does not survive the seam.** A
 * room that later wanted to mute somebody for six hours could not express it — the SQLite row carries
 * an expiry and the controller flag does not, and neither store is the other's shape. Recorded here
 * because it is invisible from either side alone, and because the reference's single-command design
 * is what a future unification would have to reach for.
 *
 * ## The trade opcode 3 makes, stated because it is destructive
 *
 * **A muted presenter comes back a participant.** Role holds ONE value, so `role = 3` overwrites
 * whatever the member was, exactly as `role = 4` does for a ban. `internal/room-ban` records the same
 * trade and the same reason: inventing a role-restore means storing a prior role nothing in the
 * reference stores. Unmuting is opcode 2, which is also Unban and also lands on participant.
 *
 * That is a real cost, so the endpoint refuses the case where it would be worst: **a presenter may not
 * mute the room's owner**, for the same reason they may not ban them — a room whose owner can be
 * demoted to a muted participant by one of their own presenters is a room that can be taken from its
 * account holder. And **nobody may mute themselves**, following `room-permissions` and `room-ban`.
 *
 * ## Everything else is `internal/room-ban`'s shape, deliberately
 *
 * The target is named by EMAIL because ids do not cross the seam. The caller must be the owner or a
 * true presenter OF THIS ROOM. A suspended account's rooms stop serving. The write is ONE conditional
 * UPDATE re-scoped by `roomId`, calling `userOpcodePatch` rather than mirroring it, so there is one
 * definition of what an opcode means. Zero rows is a 409 rather than a success nobody performed.
 *
 * ## The credential
 *
 * `config-write:`, verified by `verifyConfigWriteToken`. This door was written after the read/write
 * split, so it never inherited the caveat its three siblings carried — which is the point of having
 * done the split first.
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
    console.warn('[room-mute] rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }

  let payload: { targetEmail?: unknown; muted?: unknown };
  try {
    payload = (await request.json()) as { targetEmail?: unknown; muted?: unknown };
  } catch {
    error(400, 'A JSON body is required.');
  }

  const targetEmail = typeof payload.targetEmail === 'string' ? payload.targetEmail.trim().toLowerCase() : '';
  if (!targetEmail) error(400, 'A target member is required.');

  /*
    An explicit boolean, never a truthy value — `internal/room-ban`'s rule, and it matters more here
    for being the same field shape: `true` silences somebody indefinitely and `false` restores them,
    so accepting `"false"` or `0` and coercing would make the difference depend on how a caller
    happened to serialise it.
  */
  if (typeof payload.muted !== 'boolean') error(400, 'A muted flag is required.');
  const muted = payload.muted;

  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');

  // A suspended account's rooms stop serving, reads and writes alike — `internal/room-config`'s rule.
  const [account] = await getDb()
    .select({ status: accounts.status })
    .from(accounts)
    .where(eq(accounts.id, room.accountId))
    .limit(1);
  if (!account || account.status !== ACCOUNT_ACTIVE) {
    console.warn('[room-mute] refused: account not active', {
      code: params.code,
      status: account?.status ?? 'missing'
    });
    error(404, 'Room not found');
  }

  const callerEmail = url.searchParams.get('email')?.trim().toLowerCase();
  if (!callerEmail) error(400, 'A member is required.');

  // One read for both memberships. Scoped to this room by the WHERE, which is what keeps a
  // presenter of room A out of room B.
  const memberships = await getDb()
    .select({ roomUser: roomUsers, user: users })
    .from(roomUsers)
    .innerJoin(users, eq(roomUsers.userId, users.id))
    .where(eq(roomUsers.roomId, room.id));

  const caller = memberships.find((row) => row.user.email.trim().toLowerCase() === callerEmail);
  if (!caller) error(403, 'Not a member of this room.');

  const callerIsPresenter = caller.roomUser.role === 0 || isRoomPresenter(caller.roomUser);
  if (!callerIsPresenter) {
    console.warn('[room-mute] refused: not a presenter', { code: params.code });
    error(403, 'Presenters only.');
  }

  const target = memberships.find((row) => row.user.email.trim().toLowerCase() === targetEmail);
  if (!target) {
    console.warn('[room-mute] refused: target not in this room', { code: params.code });
    error(404, 'That member is not in this room.');
  }

  if (target.roomUser.id === caller.roomUser.id) {
    error(403, 'You cannot mute yourself.');
  }

  // See the docblock. Opcode 3 overwrites the role, so muting the owner would demote them inside
  // their own room — the same reason a presenter may not ban them.
  if (target.roomUser.role === 0) {
    console.warn('[room-mute] refused: target is the owner', { code: params.code });
    error(403, "You cannot mute this room's owner.");
  }

  /*
    THE ROLE IS THE MUTE, and the column beside it is the mirror.

    Written this way because the ban door next to it shipped once with the column ALONE and became a
    member of the class it was built to end: it reported success and changed nothing that enforces
    anything. `internal/room-config` answers `muted: membership.roomUser.muted`, and the manage page
    renders role 3, so a mute that set one and not the other would disagree with itself depending on
    which surface a person looked at.

    `userOpcodePatch(3)` and `(2)` are CALLED rather than mirrored — one definition of what an opcode
    means, no second copy to drift. Opcode 2 is also Unban, and lands on participant with both flags
    cleared: see the docblock for why that is the reference's trade rather than ours.

    ONE conditional UPDATE, re-scoped to the room in its own WHERE. Not a SELECT-then-UPDATE: the
    membership was read above to decide authority, and re-deciding the row from that read would be
    the TOCTOU this repository removes everywhere else.
  */
  const [updated] = await getDb()
    .update(roomUsers)
    .set(userOpcodePatch(muted ? 3 : 2))
    .where(and(eq(roomUsers.id, target.roomUser.id), eq(roomUsers.roomId, room.id)))
    .returning({ id: roomUsers.id, role: roomUsers.role, muted: roomUsers.muted });

  // Zero rows means the row moved between the read and the write. Report it rather than claiming a
  // mute that did not happen — the whole defect class this endpoint was built to end.
  if (!updated) {
    console.warn('[room-mute] refused: membership vanished during the write', { code: params.code });
    error(409, 'That membership changed while the mute was being applied.');
  }

  return json({ muted: updated.muted });
};
