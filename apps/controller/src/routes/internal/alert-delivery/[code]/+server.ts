import { error, json } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { ROOM_JWT_SECRET } from '$app/env/private';

import {
  dispatchAlertPush,
  linkAlertDispatch,
  linkedAlertRoomIds,
  readAlertDeliveryReport
} from '#lib/server/alert-delivery.js';
import { getDb } from '#lib/server/db/index.js';
import { ACCOUNT_ACTIVE, accounts, rooms } from '#lib/server/db/schema.js';
import { FcmNotConfigured } from '#lib/server/fcm.js';
import { readSettings } from '#lib/server/rooms.js';
import { verifyConfigReadToken, verifyConfigWriteToken } from '#lib/server/room-handoff.js';
import type { RequestHandler } from './$types';

async function activeRoom(shortCode: string) {
  const [row] = await getDb()
    .select({ room: rooms, accountStatus: accounts.status })
    .from(rooms)
    .innerJoin(accounts, eq(accounts.id, rooms.accountId))
    .where(eq(rooms.shortCode, shortCode))
    .limit(1);
  if (!row || row.accountStatus !== ACCOUNT_ACTIVE) error(404, 'Room not found');
  return row.room;
}

function bearer(request: Request): string | undefined {
  return request.headers.get('authorization')?.replace(/^Bearer /, '');
}

/** Server-to-server creation/resumption of one idempotent push dispatch. */
export const POST: RequestHandler = async ({ params, request }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) error(500, 'Room configuration is not available.');
  const verified = verifyConfigWriteToken(secret, params.code, bearer(request));
  if (!verified.ok) {
    console.warn('[alert-delivery] write rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    error(400, 'A JSON body is required.');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    error(400, 'A JSON object is required.');
  }
  const payload = input as Record<string, unknown>;
  if (
    Object.keys(payload).some(
      (key) => key !== 'alertId' && key !== 'idempotencyKey' && key !== 'body' && key !== 'dontCrossPost'
    )
  ) {
    error(400, 'The alert delivery payload contains an unknown field.');
  }
  const alertId = typeof payload.alertId === 'string' ? payload.alertId.trim() : '';
  const idempotencyKey = typeof payload.idempotencyKey === 'string' ? payload.idempotencyKey.trim() : '';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  const dontCrossPost = payload.dontCrossPost === true;
  if (payload.dontCrossPost !== undefined && typeof payload.dontCrossPost !== 'boolean') {
    error(400, 'dontCrossPost must be a boolean.');
  }
  if (!/^\d{1,20}$/.test(alertId)) error(400, 'A valid alert id is required.');
  if (!/^[A-Za-z0-9:_-]{1,200}$/.test(idempotencyKey)) {
    error(400, 'A valid idempotency key is required.');
  }
  if (!body || body.length > 8_000) error(400, 'Alert body must be between 1 and 8000 characters.');

  const room = await activeRoom(params.code);
  try {
    await dispatchAlertPush({
      roomId: room.id,
      externalAlertId: alertId,
      idempotencyKey,
      body,
      dontCrossPost
    });

    const settings = await readSettings(room.id);
    const linkedIds = linkedAlertRoomIds(settings.linkedRoomAlerts, room.id, dontCrossPost);
    if (linkedIds.length > 0) {
      const targets = await getDb()
        .select({ id: rooms.id, name: rooms.name, shortCode: rooms.shortCode })
        .from(rooms)
        .where(and(eq(rooms.accountId, room.accountId), inArray(rooms.id, linkedIds)));
      for (const target of targets) {
        const targetIdempotencyKey = `${idempotencyKey}:linked:${target.id}`;
        await dispatchAlertPush({
          roomId: target.id,
          externalAlertId: alertId,
          idempotencyKey: targetIdempotencyKey,
          body,
          dontCrossPost: true
        });
        await linkAlertDispatch({
          sourceRoomId: room.id,
          sourceIdempotencyKey: idempotencyKey,
          targetRoom: target,
          targetIdempotencyKey
        });
      }
    }
    const report = await readAlertDeliveryReport(room.id, alertId);
    if (!report) throw new Error('alert delivery report could not be read after dispatch');
    return json(report);
  } catch (cause) {
    if (cause instanceof FcmNotConfigured) {
      error(503, 'Push notifications are not configured for this deployment.');
    }
    throw cause;
  }
};

/** Presenter-facing report read, proxied by the authenticated room application. */
export const GET: RequestHandler = async ({ params, request, url }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) error(500, 'Room configuration is not available.');
  const verified = verifyConfigReadToken(secret, params.code, bearer(request));
  if (!verified.ok) {
    console.warn('[alert-delivery] read rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }
  const alertId = url.searchParams.get('alertId')?.trim() ?? '';
  if (!/^\d{1,20}$/.test(alertId)) error(400, 'A valid alert id is required.');

  const room = await activeRoom(params.code);
  const report = await readAlertDeliveryReport(room.id, alertId);
  if (!report) error(404, 'No delivery report exists for this alert.');
  return json(report);
};
