import { error } from '@sveltejs/kit';
import { getRequestEvent, query } from '$app/server';
import { z } from 'zod';

import { presenterRoom, requireUser } from '#lib/server/auth.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import { readLocalAlertDelivery } from '#lib/server/alert-delivery-outbox.js';
import { requestAlertDeliveryReport } from '#lib/server/room-config-client.js';

/** Presenter-only report. Recipient contact data never crosses to an ordinary member. */
export const getAlertDeliveryReport = query(z.number().int().positive(), async (alertId) => {
  ensureDatabase();
  const { locals } = getRequestEvent();
  requireUser(locals);
  const room = presenterRoom();
  const local = readLocalAlertDelivery(alertId, room);
  if (!local) error(404, 'No delivery job exists for this alert.');

  if (local.status === 'suppressed') {
    return {
      alertId: String(alertId),
      completed: true,
      createdAt: '',
      completedAt: null,
      localStatus: local.status,
      attemptCount: local.attemptCount,
      nextAttemptAt: null,
      lastError: local.lastError,
      rows: []
    };
  }

  const remote = await requestAlertDeliveryReport(room, alertId);
  return {
    alertId: String(alertId),
    completed: remote?.completed ?? false,
    createdAt: remote?.createdAt ?? '',
    completedAt: remote?.completedAt ?? null,
    localStatus: local.status,
    attemptCount: local.attemptCount,
    nextAttemptAt: local.nextAttemptAt?.getTime() ?? null,
    lastError: local.lastError,
    rows: remote?.rows ?? []
  };
});
