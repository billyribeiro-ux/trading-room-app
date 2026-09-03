import { error } from '@sveltejs/kit';
import { createHash } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { publicPlayerGrants } from '#lib/server/db/schema.js';
import { liveMtxStreamsForRoom } from '#lib/server/mtx-reconciler.js';
import { requestPublicStreamReadToken } from '#lib/server/room-config-client.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
  ensureDatabase();
  const grant = url.searchParams.get('grant') ?? '';
  if (!/^[a-f0-9]{64}$/.test(grant)) error(403, 'This player link is not valid.');
  const tokenHash = createHash('sha256').update(grant).digest('hex');
  const valid = db
    .select({ id: publicPlayerGrants.id, expiresAt: publicPlayerGrants.expiresAt })
    .from(publicPlayerGrants)
    .where(
      and(
        eq(publicPlayerGrants.roomShortCode, params.room),
        eq(publicPlayerGrants.tokenHash, tokenHash),
        isNull(publicPlayerGrants.revokedAt),
        gt(publicPlayerGrants.expiresAt, new Date())
      )
    )
    .limit(1)
    .get();
  if (!valid) error(403, 'This player link has expired or was disabled.');

  const [playback, streams] = await Promise.all([
    requestPublicStreamReadToken(params.room),
    liveMtxStreamsForRoom(params.room)
  ]);
  if (!playback?.configured) error(503, 'Public playback is not configured.');
  setHeaders({ 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' });
  return {
    room: params.room,
    expiresAt: valid.expiresAt.getTime(),
    streams: streams ?? [],
    streamServerMTX: playback.streamServerMTX,
    mtxToken: playback.mtxToken
  };
};
