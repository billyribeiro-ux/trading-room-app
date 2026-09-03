import { createHash } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI, ROOM_BASE_URL } from '$app/env/private';
import { getDb } from '#lib/server/db/index.js';
import { discordOauthStates, roomUsers } from '#lib/server/db/schema.js';
import { redirectToConfiguredLocation } from '#lib/server/configured-redirect.js';
import type { RequestHandler } from './$types';

function finish(status: 'connected' | 'failed'): never {
  const destination = ROOM_BASE_URL?.trim() || '/';
  const url = new URL(destination, 'http://localhost');
  url.searchParams.set('discord', status);
  redirectToConfiguredLocation(url.origin === 'http://localhost' ? `${url.pathname}${url.search}` : url);
}

export const GET: RequestHandler = async ({ url, fetch }) => {
  const state = url.searchParams.get('state') ?? '';
  const code = url.searchParams.get('code') ?? '';
  if (!/^[a-f0-9]{64}$/.test(state) || !code || !DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI) {
    finish('failed');
  }
  const consumed = await getDb()
    .update(discordOauthStates)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(discordOauthStates.stateHash, createHash('sha256').update(state).digest('hex')),
        isNull(discordOauthStates.usedAt),
        gt(discordOauthStates.expiresAt, new Date())
      )
    )
    .returning({ roomUserId: discordOauthStates.roomUserId });
  if (consumed.length !== 1) finish('failed');

  try {
    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT_URI
      }),
      signal: AbortSignal.timeout(8_000)
    });
    if (!tokenResponse.ok) finish('failed');
    const token = (await tokenResponse.json()) as { access_token?: unknown; token_type?: unknown };
    if (typeof token.access_token !== 'string' || !token.access_token) finish('failed');
    const identityResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(8_000)
    });
    if (!identityResponse.ok) finish('failed');
    const identity = (await identityResponse.json()) as {
      id?: unknown;
      username?: unknown;
      global_name?: unknown;
      discriminator?: unknown;
    };
    if (typeof identity.id !== 'string' || !/^\d{5,30}$/.test(identity.id)) finish('failed');
    const baseName =
      typeof identity.global_name === 'string' && identity.global_name.trim()
        ? identity.global_name.trim()
        : typeof identity.username === 'string'
          ? identity.username.trim()
          : '';
    if (!baseName) finish('failed');
    const username =
      typeof identity.discriminator === 'string' && identity.discriminator !== '0'
        ? `${baseName}#${identity.discriminator}`
        : baseName;
    await getDb()
      .update(roomUsers)
      .set({ discordUserId: identity.id, discordUsername: username.slice(0, 100) })
      .where(eq(roomUsers.id, consumed[0].roomUserId));
  } catch (cause) {
    console.error('[discord] OAuth callback failed', cause);
    finish('failed');
  }
  finish('connected');
};
