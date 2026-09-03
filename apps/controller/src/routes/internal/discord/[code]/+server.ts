import { error, json } from '@sveltejs/kit';
import { randomBytes, createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
  ROOM_BASE_URL,
  ROOM_JWT_SECRET
} from '$app/env/private';
import { getDb } from '#lib/server/db/index.js';
import { ACCOUNT_ACTIVE, accounts, discordOauthStates, rooms, roomUsers, users } from '#lib/server/db/schema.js';
import { readSettings } from '#lib/server/rooms.js';
import { isRoomPresenter } from '#lib/room-member-role.js';
import { verifyConfigReadToken, verifyConfigWriteToken } from '#lib/server/room-handoff.js';
import type { RequestHandler } from './$types';

function bearer(request: Request): string | undefined {
  return request.headers.get('authorization')?.replace(/^Bearer /, '');
}

async function context(code: string, email: string) {
  const [row] = await getDb()
    .select({ room: rooms, accountStatus: accounts.status })
    .from(rooms)
    .innerJoin(accounts, eq(accounts.id, rooms.accountId))
    .where(eq(rooms.shortCode, code))
    .limit(1);
  if (!row || row.accountStatus !== ACCOUNT_ACTIVE) error(404, 'Room not found');
  const members = await getDb()
    .select({ roomUser: roomUsers, userEmail: users.email })
    .from(roomUsers)
    .innerJoin(users, eq(users.id, roomUsers.userId))
    .where(eq(roomUsers.roomId, row.room.id));
  const member = members.find((candidate) => candidate.userEmail.trim().toLowerCase() === email);
  if (!member || !isRoomPresenter(member.roomUser)) error(403, 'Forbidden.');
  const settings = await readSettings(row.room.id);
  if (settings.enableDiscord !== true) error(403, 'Discord linking is not enabled for this room.');
  return member.roomUser;
}

function verified(request: Request, code: string, write: boolean): void {
  const secret = ROOM_JWT_SECRET;
  if (!secret) error(500, 'Discord linking is not available.');
  const result = write
    ? verifyConfigWriteToken(secret, code, bearer(request))
    : verifyConfigReadToken(secret, code, bearer(request));
  if (!result.ok) error(401, 'Unauthorized.');
}

export const GET: RequestHandler = async ({ params, request, url }) => {
  verified(request, params.code, false);
  const email = url.searchParams.get('email')?.trim().toLowerCase() ?? '';
  if (!email) error(400, 'An email is required.');
  const member = await context(params.code, email);
  return json({
    checked: true,
    connected: Boolean(member.discordUserId),
    userId: member.discordUserId,
    username: member.discordUsername,
    configured: Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET && DISCORD_REDIRECT_URI && ROOM_BASE_URL)
  });
};

export const POST: RequestHandler = async ({ params, request, url }) => {
  verified(request, params.code, true);
  const email = url.searchParams.get('email')?.trim().toLowerCase() ?? '';
  if (!email) error(400, 'An email is required.');
  const member = await context(params.code, email);
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI || !ROOM_BASE_URL) {
    error(503, 'Discord OAuth is not configured for this deployment.');
  }
  const rawState = randomBytes(32).toString('hex');
  await getDb()
    .insert(discordOauthStates)
    .values({
      stateHash: createHash('sha256').update(rawState).digest('hex'),
      roomUserId: member.id,
      expiresAt: new Date(Date.now() + 10 * 60_000),
      createdAt: new Date()
    });
  const authorization = new URL('https://discord.com/oauth2/authorize');
  authorization.searchParams.set('client_id', DISCORD_CLIENT_ID);
  authorization.searchParams.set('redirect_uri', DISCORD_REDIRECT_URI);
  authorization.searchParams.set('response_type', 'code');
  authorization.searchParams.set('scope', 'identify');
  authorization.searchParams.set('state', rawState);
  authorization.searchParams.set('prompt', 'consent');
  return json({ authorizationUrl: authorization.toString() });
};

export const DELETE: RequestHandler = async ({ params, request, url }) => {
  verified(request, params.code, true);
  const email = url.searchParams.get('email')?.trim().toLowerCase() ?? '';
  if (!email) error(400, 'An email is required.');
  const member = await context(params.code, email);
  await getDb()
    .update(roomUsers)
    .set({ discordUserId: null, discordUsername: null })
    .where(and(eq(roomUsers.id, member.id), eq(roomUsers.roomId, member.roomId)));
  return json({ connected: false });
};
