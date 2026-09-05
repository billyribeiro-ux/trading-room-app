import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { getDb } from '#lib/server/db/index.js';
import { ACCOUNT_ACTIVE, accounts, roomUsers, rooms, users } from '#lib/server/db/schema.js';
import { isRoomPresenter } from '#lib/room-member-role.js';
import { userOpcodePatch } from '#lib/server/rooms.js';
import { verifyConfigWriteToken } from '#lib/server/room-handoff.js';
import { membershipAuthorityMode } from '#lib/server/control-plane-runtime.js';
import { applyRoomMembershipControl, RoomMembershipControlError } from '#lib/server/room-membership-control.js';
import type { RequestHandler } from './$types';

/**
 * `POST /internal/room-ban/<shortCode>?email=<caller>` — the room banning one member.
 *
 * ## The defect this closes
 *
 * `kick-ban` shared a branch with `kick` that alerted *"User kicked OK"* and sent nothing, because
 * the room had no kick command at all. `kick` was given one on 2026-08-23; `kick-ban` deliberately
 * was NOT, and the recorded reason was that a ban "needs durable storage this room does not have".
 *
 * **That reason was false, twice over, and the audit that disproved it is why this file exists.**
 * `roomUsers.banned` has been in the schema all along (`schema.ts:335`,
 * `boolean('banned').notNull().default(false)`), and the role model directly above it reads
 * *"0 owner · 1 presenter · 2 participant · 3 chat muted · 4 banned"*. The store was never missing;
 * the door from the room to it was.
 *
 * **And the first version of this door wrote the wrong half.** It set `banned` alone. Everything that
 * enforces a ban reads the ROLE, so the ban recorded nothing anyone asks about and the member walked
 * back in. Corrected the same day, on the mapping `applyUserOpcode` has always held; the write below
 * carries the full account.
 *
 * ## Why a controller endpoint rather than a room-side write
 *
 * The same argument `internal/room-permissions` makes next door. `roomUsers` lives in this app's
 * PostgreSQL and is what `internal/room-config` reads on every page load. A room-side ban would be a
 * second answer to "may this person be here", and it would lose on the next load.
 *
 * A ban must also outlive the frame. `kickUser` disconnects a socket; that is the immediate half and
 * it is the room's. This is the half that is still true tomorrow.
 *
 * ## THE TARGET IS NAMED BY EMAIL, because ids do not cross the seam
 *
 * The room's `users.id` and this app's `users.id` are different rows in different databases and
 * nothing keeps them aligned. Email is the key the seam already uses on every sibling endpoint.
 * Sending a room-side id here would ban somebody else, silently.
 *
 * ## Two authority checks, and a third that is specific to this one
 *
 * The CALLER must be the owner or a true presenter of this room — the same disjunction
 * `internal/room-config` computes for `isP`. The TARGET must be a member of THIS room, stated as its
 * own rule so the scope is a decision rather than an accident of how the SELECT was written.
 *
 * **A presenter may not ban themselves, and may not ban the owner.** The self-check follows
 * `room-permissions`, which refuses a self-target because `giveMicScreen` refuses one on the
 * neighbouring control upstream. The owner check is stricter than anything the reference states and
 * is applied deliberately: a room whose owner can be banned by one of their own presenters is a room
 * that can be taken from its account holder, and no capture is needed to know that must not be
 * possible. It fails CLOSED, which is the direction this repository resolves silence in.
 *
 * ## The credential
 *
 * A bearer MAC over `<code>.<timestamp>`, domain-separated as `config-write:` and verified by
 * `verifyConfigWriteToken`. **A `config-read:` capability is REFUSED here** — this row used to carry
 * the opposite as an honest caveat, calling the split "the one follow-up all of these endpoints
 * share", and 2026-08-27 is when it was done. A capability minted to read a room's settings can no
 * longer ban somebody from it. `config-read-cannot-write-contract.test.ts` asserts the refusal.
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
    console.warn('[room-ban] rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }

  let payload: { targetEmail?: unknown; banned?: unknown };
  try {
    payload = (await request.json()) as { targetEmail?: unknown; banned?: unknown };
  } catch {
    error(400, 'A JSON body is required.');
  }

  const targetEmail = typeof payload.targetEmail === 'string' ? payload.targetEmail.trim().toLowerCase() : '';
  if (!targetEmail) error(400, 'A target member is required.');

  /*
    An explicit boolean, never a truthy value.

    The room sends `true` to ban and `false` to lift one, and this is the field that decides whether
    somebody may come back. Accepting `"false"` or `0` and coercing would make the difference between
    banning and unbanning depend on how a caller happened to serialise it.
  */
  if (typeof payload.banned !== 'boolean') error(400, 'A banned flag is required.');
  const banned = payload.banned;

  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');

  // A suspended account's rooms stop serving, reads and writes alike — `internal/room-config`'s rule.
  const [account] = await getDb()
    .select({ status: accounts.status, authorityEnterpriseId: accounts.authorityEnterpriseId })
    .from(accounts)
    .where(eq(accounts.id, room.accountId))
    .limit(1);
  if (!account || account.status !== ACCOUNT_ACTIVE) {
    console.warn('[room-ban] refused: account not active', {
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
    console.warn('[room-ban] refused: not a presenter', { code: params.code });
    error(403, 'Presenters only.');
  }

  const target = memberships.find((row) => row.user.email.trim().toLowerCase() === targetEmail);
  if (!target) {
    console.warn('[room-ban] refused: target not in this room', { code: params.code });
    error(404, 'That member is not in this room.');
  }

  if (target.roomUser.id === caller.roomUser.id) {
    error(403, 'You cannot ban yourself.');
  }

  // See the docblock. A room whose owner can be banned by their own presenter is a room that can be
  // taken from its account holder.
  if (target.roomUser.role === 0) {
    console.warn('[room-ban] refused: target is the owner', { code: params.code });
    error(403, "You cannot ban this room's owner.");
  }

  if (membershipAuthorityMode === 'rust') {
    try {
      const committed = await applyRoomMembershipControl({
        accountId: room.accountId,
        authorityEnterpriseId: account.authorityEnterpriseId,
        authorityRoomId: room.authorityRoomId,
        actor: caller.roomUser,
        target: target.roomUser,
        operation: { type: 'setBanned', banned }
      });
      const canonical = committed.members.find((member) => member.id === target.roomUser.authorityMemberId);
      if (!canonical) error(502, 'Membership authority returned no target member.');
      return json({ banned: canonical.isBanned });
    } catch (reason) {
      if (reason instanceof RoomMembershipControlError) error(reason.status, reason.message);
      throw reason;
    }
  }

  /*
    THE ROLE IS THE BAN. The column beside it is the mirror, not the record.

    This endpoint shipped on 2026-08-23 setting `banned` ALONE, and that made it a member of the very
    class it was built to end: it reported success and changed nothing that enforces a ban. Every
    consumer in this repository reads the ROLE —

      internal/room-config/[code]/+server.ts:244   banned: membership.roomUser.role === 4
      internal/stream-read/[code]/+server.ts:92    if (member.roomUser.role === 4) …
      account/rooms/[id]/[[tab]]/+page.svelte:1795 {#if member.role === 4} BANNED

    — so a member banned from the room kept `role = 2`, `internal/room-config` kept answering
    `banned: false`, and they walked straight back in on the next page load. Found by re-reading the
    diff against `applyUserOpcode`, which is and always was the authority on this mapping:

      case 4:  patch.role = 4; patch.banned = true;                          // Ban
      case 2:  patch.role = 2; patch.banned = false; patch.muted = false;    // Participant, also Unban

    It does not mirror those two cases — it CALLS them. `userOpcodePatch` was split out of
    `applyUserOpcode` for this, so there is one definition of what an opcode means and no second copy
    to drift. A test asserting two copies agree would have been the weaker answer to the same defect.

    ## Why lifting a ban ALSO clears `muted`, which is opcode 2's behaviour and not an extra

    Role holds one value. A banned member is role 4, so whatever they were before — participant,
    muted, presenter — is already gone by the time there is a ban to lift. Restoring role 2 with
    `muted: false` therefore discards nothing that survived the ban; leaving `muted: true` beside
    role 2 would recreate exactly the role/column disagreement this comment exists to record.

    The same argument says a banned PRESENTER comes back as a participant. That is upstream's
    behaviour too — one opcode, one destination — and it is reproduced rather than improved on,
    because inventing a role-restore means storing a prior role nothing in the reference stores.

    ONE conditional UPDATE, re-scoped to the room in its own WHERE. Not a SELECT-then-UPDATE: the
    membership was read above to decide authority, and re-deciding the row from that read would be
    the TOCTOU this repository removes everywhere else. The `roomId` in the predicate is redundant
    against `roomUsers.id` being a primary key, and it is kept because it makes the scope true of the
    STATEMENT rather than of the query that happened to precede it.
  */
  const [updated] = await getDb()
    .update(roomUsers)
    .set(userOpcodePatch(banned ? 4 : 2))
    .where(and(eq(roomUsers.id, target.roomUser.id), eq(roomUsers.roomId, room.id)))
    .returning({ id: roomUsers.id, role: roomUsers.role, banned: roomUsers.banned });

  // Zero rows means the row moved between the read and the write. Report it rather than claiming a
  // ban that did not happen — the whole defect class this endpoint was built to end.
  if (!updated) {
    console.warn('[room-ban] refused: membership vanished during the write', { code: params.code });
    error(409, 'That membership changed while the ban was being applied.');
  }

  return json({ banned: updated.banned });
};
