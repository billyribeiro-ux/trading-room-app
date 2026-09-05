import { error, json } from '@sveltejs/kit';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { eq } from 'drizzle-orm';
import { roomLaunchAuthorityMode } from '#lib/server/control-plane-runtime.js';
import { getDb } from '#lib/server/db/index.js';
import { ACCOUNT_ACTIVE, accounts, roomUsers, rooms, users } from '#lib/server/db/schema.js';
import { verifyConfigWriteToken } from '#lib/server/room-handoff.js';
import { closeVisit } from '#lib/server/room-visits.js';
import { closeRoomVisitInAuthority } from '#lib/server/room-visit-authority.js';
import type { RequestHandler } from './$types';

/** Closes the caller's current visit after the live room logs its local session out. */
export const POST: RequestHandler = async ({ params, request }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) error(500, 'Room configuration is not available.');

  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const verified = verifyConfigWriteToken(secret, params.code, presented);
  if (!verified.ok) {
    console.warn('[room-visit-exit] rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    error(400, 'Invalid visit-close payload.');
  }
  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload) ||
    Object.keys(payload).length !== 1 ||
    typeof (payload as { email?: unknown }).email !== 'string'
  ) {
    error(400, 'Invalid visit-close payload.');
  }
  const email = (payload as { email: string }).email.trim().toLowerCase();
  if (email.length < 3 || email.length > 320 || !email.includes('@')) {
    error(400, 'Invalid visit-close payload.');
  }

  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');
  const [account] = await getDb()
    .select({ status: accounts.status, authorityEnterpriseId: accounts.authorityEnterpriseId })
    .from(accounts)
    .where(eq(accounts.id, room.accountId))
    .limit(1);
  if (!account || account.status !== ACCOUNT_ACTIVE) error(404, 'Room not found');

  const member = (
    await getDb()
      .select({ roomUser: roomUsers, user: users })
      .from(roomUsers)
      .innerJoin(users, eq(roomUsers.userId, users.id))
      .where(eq(roomUsers.roomId, room.id))
  ).find((row) => row.user.email.trim().toLowerCase() === email);
  if (roomLaunchAuthorityMode === 'rust') {
    if (!account.authorityEnterpriseId || !room.authorityRoomId || !room.authorityReconciledAt) {
      error(409, 'Room visit authority is not reconciled.');
    }
    if (
      member &&
      (!member.user.authorityUserId || !member.roomUser.authorityMemberId || !member.roomUser.authorityReconciledAt)
    ) {
      error(409, 'Room visit authority is not reconciled.');
    }
    const closed = await closeRoomVisitInAuthority({
      enterpriseId: account.authorityEnterpriseId,
      roomId: room.authorityRoomId,
      ...(member ? { userId: member.user.authorityUserId! } : { email })
    });
    if (!closed.ok) {
      if (closed.status === 401) error(502, 'Room visit authority refused the controller credential.');
      if (closed.status === 404) error(404, 'Room not found');
      if (closed.status === 409) error(409, closed.message);
      error(503, 'Room visit authority is temporarily unavailable.');
    }
    return json(closed.data);
  }

  return json({ closed: await closeVisit(room.id, member?.user.email ?? email) });
};
