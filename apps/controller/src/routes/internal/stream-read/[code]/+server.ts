import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ROOM_JWT_SECRET, STREAM_SERVER_MTX } from '$app/env/private';
import { getDb } from '#lib/server/db/index.js';
import { ACCOUNT_ACTIVE, accounts, roomUsers, rooms, users } from '#lib/server/db/schema.js';
import { verifyConfigReadToken } from '#lib/server/room-handoff.js';
import { READ_TOKEN_TTL_SECONDS, mintRoomReadToken } from '#lib/server/stream-ingest.js';
import type { RequestHandler } from './$types';

/**
 * `POST /internal/stream-read/<shortCode>` — the VIEWER's playback credential.
 *
 * ## Where this right comes from
 *
 * `userLoggedIn`, byte 994430 of `main.d6d3c112b59b7d0d.js`:
 *
 * ```js
 * B.mtxToken && (e.globals.mtxToken = B.mtxToken),
 * B.streamServerMTX && (e.globals.streamServerMTX = B.streamServerMTX),
 * ```
 *
 * The reference hands **every session** a token at login, presenter or not, and
 * `app-streaming-view` spends it on the playlist:
 *
 * ```js
 * this.videoSrc = `https://${globals.streamServerMTX}/${e}/index.m3u8?jwt=${globals.mtxToken}`;
 * ```
 *
 * So playback is authenticated for everyone, and a room's video is not readable by whoever guesses
 * a path. This endpoint is that half.
 *
 * ## Why it is separate from `/internal/stream-ingest`
 *
 * Three reasons, each of which would be a bug if they shared a route:
 *
 *  1. **Different audience.** Ingest is presenter-only; this is every member.
 *  2. **Ingest ROTATES.** A member opening a room must not revoke the presenter's live stream key,
 *     which is exactly what would happen if watching called the minting endpoint.
 *  3. **Different scope in the token.** A read token cannot publish and a publish token cannot be
 *     used to watch another room. `decideIngestAuth` refuses the crossover as `wrong-scope`.
 *
 * ## Membership is still re-derived here
 *
 * A guest who never joined this room gets 403. The room says who is asking; this decides whether
 * they are on the roster, from the roster.
 */
export const POST: RequestHandler = async ({ params, request }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) error(500, 'Stream playback is not available.');

  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const verified = verifyConfigReadToken(secret, params.code, presented);
  if (!verified.ok) {
    console.warn('[stream-read] rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }

  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');

  const [account] = await getDb()
    .select({ status: accounts.status })
    .from(accounts)
    .where(eq(accounts.id, room.accountId))
    .limit(1);
  if (!account || account.status !== ACCOUNT_ACTIVE) error(404, 'Room not found');

  const body = (await request.json()) as { email?: string };
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase();
  if (!email) error(400, 'An email is required.');

  const member = (
    await getDb()
      .select({ roomUser: roomUsers, user: users })
      .from(roomUsers)
      .innerJoin(users, eq(roomUsers.userId, users.id))
      .where(eq(roomUsers.roomId, room.id))
  ).find((row) => row.user.email.trim().toLowerCase() === email);

  if (!member) {
    console.warn('[stream-read] refused: not a member', { code: params.code });
    error(403, 'Forbidden.');
  }
  /*
    A BANNED member may not watch. Role 4 is banned and role 3 is chat-muted — muted is a chat
    restriction and says nothing about video, so only 4 is refused here. Reading the role rather
    than a boolean is deliberate: `/internal/room-config` documents that the legacy columns can go
    stale and the role is what the reference renders.
  */
  if (member.roomUser.role === 4) {
    console.warn('[stream-read] refused: banned', { code: params.code });
    error(403, 'Forbidden.');
  }

  const host = STREAM_SERVER_MTX?.trim() ?? '';

  return json({
    /* The reference's own global name. The room stores it as `globals.mtxToken`. */
    mtxToken: mintRoomReadToken(secret, room.shortCode),
    streamServerMTX: host,
    configured: host !== '',
    /* So the room can refresh before it lapses rather than discovering it mid-playback. */
    expiresInSeconds: READ_TOKEN_TTL_SECONDS
  });
};
