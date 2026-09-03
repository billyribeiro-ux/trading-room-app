import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { getDb } from '#lib/server/db/index.js';
import { ACCOUNT_ACTIVE, accounts, rooms } from '#lib/server/db/schema.js';
import { verifyConfigReadToken } from '#lib/server/room-handoff.js';
import { mintRoomReadToken, PUBLIC_READ_TOKEN_TTL_SECONDS } from '#lib/server/stream-ingest.js';
import { readSettings } from '#lib/server/rooms.js';
import { resolveMediaCluster } from '#lib/server/media-cluster.js';
import type { RequestHandler } from './$types';

/**
 * Internal exchange used only after the room has validated a revocable public-player grant.
 * It issues read-only, room-scoped MediaMTX access for five minutes; it cannot publish.
 */
export const POST: RequestHandler = async ({ params, request }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) error(500, 'Stream playback is not available.');
  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const verified = verifyConfigReadToken(secret, params.code, presented);
  if (!verified.ok) error(401, 'Unauthorized.');

  const [row] = await getDb()
    .select({ room: rooms, accountStatus: accounts.status })
    .from(rooms)
    .innerJoin(accounts, eq(accounts.id, rooms.accountId))
    .where(eq(rooms.shortCode, params.code))
    .limit(1);
  if (!row || row.accountStatus !== ACCOUNT_ACTIVE || row.room.state !== 'open') {
    error(404, 'Room not found');
  }

  const cluster = await resolveMediaCluster(await readSettings(row.room.id));
  return json({
    mtxToken: mintRoomReadToken(secret, row.room.shortCode, undefined, PUBLIC_READ_TOKEN_TTL_SECONDS),
    streamServerMTX: cluster.host,
    configured: cluster.configured,
    expiresInSeconds: PUBLIC_READ_TOKEN_TTL_SECONDS
  });
};
