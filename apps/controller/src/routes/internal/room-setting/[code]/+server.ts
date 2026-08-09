import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { getDb } from '$lib/server/db';
import { ACCOUNT_ACTIVE, accounts, roomUsers, rooms, users } from '$lib/server/db/schema';
import { saveSetting } from '$lib/server/rooms';
import { isRoomWritableSetting } from '$lib/room-config';
import { isRoomPresenter } from '$lib/room-member-role';
import { verifyConfigReadToken } from '$lib/server/room-handoff';
import type { RequestHandler } from './$types';

/**
 * `POST /internal/room-setting/<shortCode>?email=<member>` — the room writing one setting back.
 *
 * ## Why the room needs to write at all
 *
 * Almost every setting is edited on the Manage page and only read by the room. One is not:
 * `overwriteCashRegisterSound` — the mp3 that replaces `chash.mp3` for alerts — is chosen from the
 * room's own Files pane. The reference's two `set-alert-sound-btn` buttons call
 * `overwriteCashRegisterSound(url, bool)`, which sends the admin command with `{url}`
 * (`app-presentationarea.full.js:3084-3086`).
 *
 * That is a durable per-room choice, not a broadcast. Sending it over the room's event channel
 * would change what every browser currently in the room believes and persist nothing, so the first
 * reload would put the old sound back and nobody would know why.
 *
 * ## Two allow-lists, not one
 *
 * `ROOM_VISIBLE_SETTINGS` decides what may be READ. `ROOM_WRITABLE_SETTINGS` — checked here through
 * `isRoomWritableSetting` — is strictly narrower and decides what may be WRITTEN. A room that could
 * write `hideFiles` could switch off a section its own owner turned off.
 *
 * ## Authentication, and what it is not
 *
 * The same credential as the other two internal endpoints: a bearer MAC over `<code>.<timestamp>`,
 * verified by `verifyConfigReadToken`, valid for 60 seconds. Deliberately the existing convention
 * rather than a new one.
 *
 * Recorded honestly: that token's domain prefix is `config-read:`, so a capability minted to READ a
 * room's configuration now also authorises this narrow write. Only the room application holds
 * `ROOM_JWT_SECRET`, and it already holds it for both reads, so this widens no party's reach — but
 * a `config-write:` prefix would be the stricter shape, and splitting the two is a deliberate
 * follow-up rather than something to invent in passing here.
 *
 * ## Presenter-gated on THIS side too
 *
 * The room hides the buttons from a member and rejects the action for one, but a hidden button is
 * not an authorization check: this endpoint is reachable with the shared secret and a URL. So the
 * caller must name a member, that member must belong to this room, and they must be the owner or a
 * true presenter — the same disjunction `internal/room-config` computes for `isP`. The reasoning is
 * `internal/mobile-pin`'s: the condition that decides whether the write should happen at all
 * belongs on this side as well.
 */
export const POST: RequestHandler = async ({ params, request, url }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) {
    // Same posture as the sibling endpoints: fail loudly, and do not name the private variable.
    error(500, 'Room configuration is not available.');
  }

  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const verified = verifyConfigReadToken(secret, params.code, presented);
  if (!verified.ok) {
    // One status and one message for all three reasons; the reason is for the log, not the caller.
    console.warn('[room-setting] rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }

  let payload: { name?: unknown; value?: unknown };
  try {
    payload = (await request.json()) as { name?: unknown; value?: unknown };
  } catch {
    error(400, 'A JSON body is required.');
  }

  const name = typeof payload.name === 'string' ? payload.name : '';
  if (!isRoomWritableSetting(name)) {
    console.warn('[room-setting] refused: not writable by the room', { code: params.code, name });
    error(403, 'That setting cannot be written from the room.');
  }

  /*
    The value.

    `saveSetting` coerces per the generated schema and rejects unknown keys, but it does not bound
    a string, and this one is stored and later handed to every browser in the room as an audio
    `src`. `''` is the documented "unset" — it is what the reference sends to REMOVE the override —
    so an empty string is a value here, not a missing field.
  */
  if (typeof payload.value !== 'string') error(400, 'A string value is required.');
  const value = payload.value;
  if (value.length > 2048) error(400, 'That value is too long.');

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
    console.warn('[room-setting] refused: account not active', {
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
    console.warn('[room-setting] refused: not a presenter', { code: params.code, name });
    error(403, 'Presenters only.');
  }

  const stored = await saveSetting(room.id, name, value);
  return json({ name, value: stored });
};
