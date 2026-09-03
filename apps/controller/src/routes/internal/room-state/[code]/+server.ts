import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { getDb } from '#lib/server/db/index.js';
import { ACCOUNT_ACTIVE, accounts, roomUsers, rooms, users } from '#lib/server/db/schema.js';
import { isRoomPresenter } from '#lib/room-member-role.js';
import { verifyConfigWriteToken } from '#lib/server/room-handoff.js';
import type { RequestHandler } from './$types';

/**
 * `POST /internal/room-state/<shortCode>?email=<member>` — the room OPENING or CLOSING itself.
 *
 * ## The defect this closes, measured 2026-09-03
 *
 * `rooms.state` is the column `decideRoomEntry` enforces: `attempt.roomState !== 'open'` refuses
 * entry with the presenter's own close message (`room-entry.ts:224`). The enforcement has always
 * been correct. **Nothing could ever set it.**
 *
 *   * It is written at CREATION and nowhere else — `provision-room.ts:137` and the clone action.
 *   * `setState` exists as a form action on the Manage page and **no form anywhere posts to it**.
 *     Measured: one occurrence of the name in the whole application, its own declaration.
 *   * The ROOM's "Save Message and Close Session" wrote `savePreference('sessionOpen', false)` —
 *     the clicking presenter's own settings blob — and `sessionOpen` had **zero readers anywhere**.
 *     It was not even on `DEAD_PREFERENCE_KEYS`.
 *
 * So a presenter closed the session, was told the message was saved, and the door stayed open to
 * everybody. The same LEVEL error as the Lock Session buttons one door over, and the same shape as
 * the Stream Player pane and the chat-mode radio: a room-level act modelled as a per-user
 * preference, invisible because the pane shows the value back to the person who set it.
 *
 * ## Why a route of its own rather than `internal/room-setting`
 *
 * `room-setting` writes `room_settings.settings_json` through `saveSetting`, which is keyed by the
 * generated schema. `state` is not a setting — it is a COLUMN on `rooms`, alongside `name` and
 * `shortCode`, and it is what `internal/room-config` already projects as `room.state`. Routing it
 * through the settings door would mean either inventing a schema entry for a column or teaching that
 * handler a second storage shape, and the second is how one handler comes to have two rules.
 *
 * `isLocked` went the other way on 2026-09-02 for the same reason read forwards: it IS a setting,
 * so it belongs on the settings door.
 *
 * ## Authentication and authority are the sibling's, deliberately
 *
 * A `config-write:` bearer MAC over `<code>.<timestamp>`, verified by `verifyConfigWriteToken` —
 * the domain-separated prefix, so a read capability cannot reach a write. Then the caller must name
 * a member, that member must belong to this room, and they must be the owner or a true presenter.
 *
 * The room hides these controls from a member and refuses the action for one, and a hidden button is
 * not an authorization check: this endpoint is reachable with the shared secret and a URL.
 *
 * ## Two states and no others
 *
 * `open` and `closed`. The column's type admits any string and its default is `'closed'`, so an
 * unchecked value here would let the room park a room in a state `decideRoomEntry` reads as closed
 * and no control can leave — which is exactly the trap the clone action's own comment records
 * hitting once already.
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
    console.warn('[room-state] rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }

  /*
    `null` parses, and `null.state` throws — the sibling's recorded gap, applied here rather than
    rediscovered. A 500 is this application saying "I broke", and it must not be the answer to input.
  */
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    error(400, 'A JSON body is required.');
  }
  if (!body || typeof body !== 'object') error(400, 'A JSON body is required.');
  const payload = body as { state?: unknown };

  const state = payload.state;
  if (state !== 'open' && state !== 'closed') {
    console.warn('[room-state] refused: unknown state', { code: params.code });
    error(400, 'A state of "open" or "closed" is required.');
  }

  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');

  // A suspended account's rooms stop serving, reads and writes alike. 404 for the same reason
  // `internal/room-config` gives: a suspended room is indistinguishable from one that never was.
  const [account] = await getDb()
    .select({ status: accounts.status })
    .from(accounts)
    .where(eq(accounts.id, room.accountId))
    .limit(1);
  if (!account || account.status !== ACCOUNT_ACTIVE) {
    console.warn('[room-state] refused: account not active', {
      code: params.code,
      status: account?.status ?? 'missing'
    });
    error(404, 'Room not found');
  }

  const email = url.searchParams.get('email')?.trim().toLowerCase();
  if (!email) error(400, 'A member is required.');

  const membership = (
    await getDb()
      .select({ roomUser: roomUsers, user: users })
      .from(roomUsers)
      .innerJoin(users, eq(roomUsers.userId, users.id))
      .where(eq(roomUsers.roomId, room.id))
  ).find((row) => row.user.email.trim().toLowerCase() === email);

  // A guest has no membership row and therefore no authority. Not an error the room can retry —
  // 403, because the caller is authenticated and the answer will not change.
  if (!membership) error(403, 'Not a member of this room.');

  // The owner counts, exactly as `internal/room-config` computes `isP`.
  const isPresenter = membership.roomUser.role === 0 || isRoomPresenter(membership.roomUser);
  if (!isPresenter) {
    console.warn('[room-state] refused: not a presenter', { code: params.code });
    error(403, 'Presenters only.');
  }

  await getDb().update(rooms).set({ state }).where(eq(rooms.id, room.id));
  return json({ state });
};
