import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const controller = vi.hoisted(() => ({
  request: vi.fn()
}));

vi.mock('./room-config-client.js', () => ({
  requestAlertDelivery: controller.request
}));

import { db, ensureDatabase } from './db/index.js';
import { alertDeliveryJobs, alerts, users } from './db/schema.js';
import {
  claimDueAlertDeliveries,
  enqueueAlertDelivery,
  sweepAlertDeliveries
} from './alert-delivery-outbox.js';

let senderId = 0;

beforeAll(() => {
  ensureDatabase();
  const existing = db
    .select()
    .from(users)
    .all()
    .find((row) => row.email === 'outbox@example.test');
  senderId =
    existing?.id ??
    db
      .insert(users)
      .values({
        displayName: 'Outbox Presenter',
        email: 'outbox@example.test',
        authSource: 'handoff',
        createdAt: new Date()
      })
      .returning({ id: users.id })
      .get()!.id;
});

beforeEach(() => {
  controller.request.mockReset();
  db.delete(alertDeliveryJobs).run();
  db.delete(alerts).run();
});

function queued(now = new Date()) {
  const alert = db
    .insert(alerts)
    .values({ roomShortCode: '7101', senderId, body: 'Market open', createdAt: now })
    .returning()
    .get()!;
  enqueueAlertDelivery(db, {
    alertId: alert.id,
    roomShortCode: '7101',
    dontPush: false,
    dontCrossPost: false,
    now
  });
  return alert;
}

describe('alert delivery outbox', () => {
  it('claims a due row atomically and cannot claim it twice', () => {
    const alert = queued(new Date('2026-09-03T13:00:00Z'));
    expect(claimDueAlertDeliveries(new Date('2026-09-03T13:00:01Z'))).toEqual([
      expect.objectContaining({ alertId: alert.id, status: 'dispatching', attemptCount: 1 })
    ]);
    expect(claimDueAlertDeliveries(new Date('2026-09-03T13:00:01Z'))).toEqual([]);
  });

  it('marks a controller-completed dispatch delivered', async () => {
    const alert = queued();
    controller.request.mockResolvedValue({ completed: true });
    await expect(sweepAlertDeliveries(new Date(Date.now() + 1))).resolves.toBe(1);
    expect(controller.request).toHaveBeenCalledWith({
      shortCode: '7101',
      alertId: alert.id,
      body: 'Market open',
      dontCrossPost: false
    });
    expect(db.select().from(alertDeliveryJobs).get()).toEqual(
      expect.objectContaining({ status: 'delivered', nextAttemptAt: null, lastError: null })
    );
  });

  it('carries per-alert linked-room suppression through the durable retry boundary', async () => {
    const now = new Date();
    const alert = db
      .insert(alerts)
      .values({ roomShortCode: '7101', senderId, body: 'Local only', createdAt: now })
      .returning()
      .get()!;
    enqueueAlertDelivery(db, {
      alertId: alert.id,
      roomShortCode: '7101',
      dontPush: false,
      dontCrossPost: true,
      now
    });
    controller.request.mockResolvedValue({ completed: true });

    await sweepAlertDeliveries(new Date(now.getTime() + 1));

    expect(controller.request).toHaveBeenCalledWith(
      expect.objectContaining({ alertId: alert.id, dontCrossPost: true })
    );
  });

  it('persists a bounded retry instead of losing an unavailable controller send', async () => {
    queued(new Date('2026-09-03T13:00:00Z'));
    controller.request.mockRejectedValue(new Error('controller unavailable'));
    await expect(sweepAlertDeliveries(new Date('2026-09-03T13:00:01Z'))).resolves.toBe(1);
    expect(db.select().from(alertDeliveryJobs).get()).toEqual(
      expect.objectContaining({
        status: 'failed',
        attemptCount: 1,
        lastError: 'controller unavailable'
      })
    );
    expect(db.select().from(alertDeliveryJobs).get()!.nextAttemptAt?.getTime()).toBe(
      Date.parse('2026-09-03T13:00:06Z')
    );
  });
});
