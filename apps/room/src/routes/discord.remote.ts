import { command, getRequestEvent, query } from '$app/server';
import { z } from 'zod';
import { presenterRoom, requireUser } from '#lib/server/auth.js';
import {
  requestDiscordAuthorization,
  requestDiscordStatus,
  unlinkDiscord
} from '#lib/server/room-config-client.js';

export const discordStatus = query(z.void(), async () => {
  const { locals } = getRequestEvent();
  const room = presenterRoom();
  const email = requireUser(locals).email;
  return requestDiscordStatus(room, email);
});

export const startDiscordAuthorization = command(z.void(), async () => {
  const { locals } = getRequestEvent();
  const room = presenterRoom();
  const email = requireUser(locals).email;
  return { authorizationUrl: await requestDiscordAuthorization(room, email) };
});

export const disconnectDiscord = command(z.void(), async () => {
  const { locals } = getRequestEvent();
  const room = presenterRoom();
  const email = requireUser(locals).email;
  await unlinkDiscord(room, email);
  return { connected: false as const };
});
