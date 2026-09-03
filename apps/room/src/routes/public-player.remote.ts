import { command, getRequestEvent, query } from '$app/server';
import { randomBytes, createHash } from 'node:crypto';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { presenterRoom, requireUser } from '#lib/server/auth.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { publicPlayerGrants } from '#lib/server/db/schema.js';

const TTL_MS = 12 * 60 * 60 * 1_000;

export const publicPlayerStatus = query(z.void(), async () => {
  ensureDatabase();
  const roomShortCode = presenterRoom();
  const row = db
    .select({ expiresAt: publicPlayerGrants.expiresAt })
    .from(publicPlayerGrants)
    .where(
      and(
        eq(publicPlayerGrants.roomShortCode, roomShortCode),
        isNull(publicPlayerGrants.revokedAt),
        gt(publicPlayerGrants.expiresAt, new Date())
      )
    )
    .orderBy(desc(publicPlayerGrants.id))
    .limit(1)
    .get();
  return { enabled: Boolean(row), expiresAt: row?.expiresAt.getTime() ?? null };
});

export const enablePublicPlayer = command(z.void(), async () => {
  ensureDatabase();
  const { locals, url } = getRequestEvent();
  const user = requireUser(locals);
  const roomShortCode = presenterRoom();
  const now = new Date();
  db.update(publicPlayerGrants)
    .set({ revokedAt: now })
    .where(
      and(eq(publicPlayerGrants.roomShortCode, roomShortCode), isNull(publicPlayerGrants.revokedAt))
    )
    .run();
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(now.getTime() + TTL_MS);
  db.insert(publicPlayerGrants)
    .values({
      roomShortCode,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      createdByUserId: user.id,
      expiresAt,
      createdAt: now
    })
    .run();
  return {
    enabled: true,
    expiresAt: expiresAt.getTime(),
    playerUrl: `${url.origin}/player/${encodeURIComponent(roomShortCode)}?grant=${token}`
  };
});

export const disablePublicPlayer = command(z.void(), async () => {
  ensureDatabase();
  const roomShortCode = presenterRoom();
  const now = new Date();
  db.update(publicPlayerGrants)
    .set({ revokedAt: now })
    .where(
      and(eq(publicPlayerGrants.roomShortCode, roomShortCode), isNull(publicPlayerGrants.revokedAt))
    )
    .run();
  return { enabled: false as const };
});
