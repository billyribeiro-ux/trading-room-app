import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { z } from 'zod';
import { MAX_ALERT_BODY } from '#lib/message-bounds.js';
import { presenterRoom, requireUser } from '#lib/server/auth.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { alerts } from '#lib/server/db/schema.js';
import { consumeRateLimit } from '#lib/server/rate-limit.js';
import { publishToRoom } from '#lib/server/room-events.js';
import { enqueueAlertDelivery } from '#lib/server/alert-delivery-outbox.js';

/*
  Posting an alert — the presenter act the whole room is watching for.

  A module of one, split from `alert-questions.remote.ts` on the GATE and not on the subject: this is
  presenter-only, asking a question about an alert is open to every member. Two different answers to
  "who may do this" behind one name is how the looser one gets tightened, or the stricter one
  loosened, by whoever adds the third function.
*/

/**
 * `postAlert` — writes the row and fans it out.
 *
 * ## The publish is the line the product was missing
 *
 * Writing the row made the alert exist; it did not make anyone see it. Every other member's page
 * only refetches after that member's OWN action, so a posted alert sat invisible until they happened
 * to reload — measured: zero `/api/v1` calls, no second socket, no polling.
 *
 * The capture fans this out on a dedicated channel, `/sess/{sessionID}/alerts/`, and each client
 * pushes the row into `alertsLog` and emits `alertMsg`. `publishToRoom` is that channel;
 * `src/routes/sess/[room]/events/+server.ts` is the wire.
 *
 * ## The gate is `presenterRoom()` now, and that is a tightening
 *
 * The action wrote the role test out by hand — `role === 'staff' || role === 'admin'` — which is
 * `isPresenterRole` spelled out, in a file that already imported it. `presenterRoom()` is the same
 * test plus the room, returned only after it passes, so "who may post" and "which room they post
 * into" are one decision instead of two that can be applied separately.
 *
 * The alert row and its delivery-outbox row commit together. This is what makes `dontPush` an
 * operative suppression and prevents a controller outage between two writes from losing a send.
 */
export const postAlert = command(
  z.strictObject({
    /*
      The capture's three kinds. `media` is the only one that keeps a `targetUrl`, which is why the
      insert below nulls it for the other two rather than storing a value nothing reads.
    */
    kind: z.enum(['text', 'url', 'media']),
    body: z.string().min(1).max(MAX_ALERT_BODY),
    targetUrl: z.string().nullable().optional(),
    nonTradeAlert: z.boolean(),
    dontPush: z.boolean().optional(),
    dontCrossPost: z.boolean().optional()
  }),
  async ({ kind, body, targetUrl, nonTradeAlert, dontPush = false, dontCrossPost = false }) => {
    ensureDatabase();
    const { locals } = getRequestEvent();
    const user = requireUser(locals);

    /*
      Rate limit BEFORE the gate, exactly as the action had it. A non-presenter probing this still
      spends their own budget doing it, which is the point of a limit that is keyed by user rather
      than by permission.
    */
    const limit = consumeRateLimit('alert', user.id);
    if (!limit.allowed) {
      error(
        429,
        `You are posting alerts too quickly. Try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`
      );
    }

    const room = presenterRoom();

    const now = new Date();
    const inserted = db.transaction((transaction) => {
      const row = transaction
        .insert(alerts)
        .values({
          // `/sess/${sessionID}/alerts/` — an alert belongs to one room.
          roomShortCode: room,
          senderId: user.id,
          kind,
          body,
          targetUrl: kind === 'media' ? (targetUrl ?? null) : null,
          nonTrade: nonTradeAlert,
          createdAt: now
        })
        .returning()
        .get();
      if (!row) error(500, 'The alert could not be stored.');
      enqueueAlertDelivery(transaction, {
        alertId: row.id,
        roomShortCode: room,
        dontPush,
        dontCrossPost,
        now
      });
      return row;
    });

    publishToRoom(room, {
      channel: 'alerts',
      data: {
        id: inserted?.id ?? null,
        senderId: user.id,
        senderName: user.displayName,
        body,
        kind,
        nonTrade: nonTradeAlert
      }
    });
  }
);
