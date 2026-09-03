import { and, eq, sql } from 'drizzle-orm';

import { requestAlertDelivery } from './room-config-client.js';
import { db } from './db/index.js';
import { alertDeliveryJobs, alerts } from './db/schema.js';

export const ALERT_DELIVERY_SWEEP_MS = 10_000;
export const ALERT_DELIVERY_BATCH = 10;
export const ALERT_DELIVERY_MAX_ATTEMPTS = 8;
const DISPATCH_LEASE_MS = 5 * 60_000;
const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000, 1_800_000, 3_600_000] as const;

export type LocalAlertDeliveryState =
  'queued' | 'dispatching' | 'delivered' | 'failed' | 'suppressed';

export interface LocalAlertDelivery {
  alertId: number;
  status: LocalAlertDeliveryState;
  attemptCount: number;
  nextAttemptAt: Date | null;
  lastError: string | null;
}

/** Called inside the same transaction that creates the alert. */
export function enqueueAlertDelivery(
  transaction: Pick<typeof db, 'insert'>,
  input: {
    alertId: number;
    roomShortCode: string;
    dontPush: boolean;
    dontCrossPost: boolean;
    now: Date;
  }
): void {
  transaction
    .insert(alertDeliveryJobs)
    .values({
      alertId: input.alertId,
      roomShortCode: input.roomShortCode,
      dontCrossPost: input.dontCrossPost,
      status: input.dontPush ? 'suppressed' : 'queued',
      nextAttemptAt: input.dontPush ? null : input.now,
      lastError: input.dontPush ? 'suppressed-by-sender' : null,
      createdAt: input.now,
      updatedAt: input.now
    })
    .onConflictDoNothing()
    .run();
}

export function readLocalAlertDelivery(
  alertId: number,
  roomShortCode: string
): LocalAlertDelivery | null {
  const row = db
    .select()
    .from(alertDeliveryJobs)
    .where(
      and(
        eq(alertDeliveryJobs.alertId, alertId),
        eq(alertDeliveryJobs.roomShortCode, roomShortCode)
      )
    )
    .get();
  return row
    ? {
        alertId: row.alertId,
        status: row.status as LocalAlertDeliveryState,
        attemptCount: row.attemptCount,
        nextAttemptAt: row.nextAttemptAt,
        lastError: row.lastError
      }
    : null;
}

function retryDelay(attemptCount: number): number {
  return RETRY_DELAYS_MS[Math.min(Math.max(attemptCount - 1, 0), RETRY_DELAYS_MS.length - 1)];
}

function safeError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  return message.replace(/[\r\n]+/g, ' ').slice(0, 500);
}

function recoverExpiredClaims(now: Date): void {
  const staleBefore = new Date(now.getTime() - DISPATCH_LEASE_MS);
  db.update(alertDeliveryJobs)
    .set({
      status: 'failed',
      nextAttemptAt: now,
      lastError: 'delivery worker lease expired before completion',
      updatedAt: now
    })
    .where(
      and(
        eq(alertDeliveryJobs.status, 'dispatching'),
        sql`${alertDeliveryJobs.updatedAt} <= ${staleBefore.getTime()}`
      )
    )
    .run();
}

export function claimDueAlertDeliveries(
  now: Date = new Date()
): (typeof alertDeliveryJobs.$inferSelect)[] {
  recoverExpiredClaims(now);
  return db
    .update(alertDeliveryJobs)
    .set({
      status: 'dispatching',
      attemptCount: sql`${alertDeliveryJobs.attemptCount} + 1`,
      nextAttemptAt: null,
      updatedAt: now
    })
    .where(
      sql`${alertDeliveryJobs.alertId} IN (
        SELECT alert_id FROM alert_delivery_jobs
         WHERE status IN ('queued', 'failed')
           AND next_attempt_at IS NOT NULL
           AND next_attempt_at <= ${now.getTime()}
         ORDER BY next_attempt_at ASC, alert_id ASC
         LIMIT ${ALERT_DELIVERY_BATCH}
      ) AND ${alertDeliveryJobs.status} IN ('queued', 'failed')`
    )
    .returning()
    .all();
}

async function processClaim(row: typeof alertDeliveryJobs.$inferSelect, now: Date): Promise<void> {
  const alert = db
    .select({ body: alerts.body })
    .from(alerts)
    .where(and(eq(alerts.id, row.alertId), eq(alerts.roomShortCode, row.roomShortCode)))
    .get();
  if (!alert) return;

  try {
    const report = await requestAlertDelivery({
      shortCode: row.roomShortCode,
      alertId: row.alertId,
      body: alert.body,
      dontCrossPost: row.dontCrossPost
    });
    if (!report.completed) throw new Error('controller dispatch is still in progress');
    db.update(alertDeliveryJobs)
      .set({ status: 'delivered', nextAttemptAt: null, lastError: null, updatedAt: new Date() })
      .where(
        and(eq(alertDeliveryJobs.alertId, row.alertId), eq(alertDeliveryJobs.status, 'dispatching'))
      )
      .run();
  } catch (cause) {
    const terminal = row.attemptCount >= ALERT_DELIVERY_MAX_ATTEMPTS;
    db.update(alertDeliveryJobs)
      .set({
        status: 'failed',
        nextAttemptAt: terminal ? null : new Date(now.getTime() + retryDelay(row.attemptCount)),
        lastError: safeError(cause),
        updatedAt: new Date()
      })
      .where(
        and(eq(alertDeliveryJobs.alertId, row.alertId), eq(alertDeliveryJobs.status, 'dispatching'))
      )
      .run();
  }
}

/** One durable outbox pass. Claims are database-owned, so overlapping timers cannot double-send. */
export async function sweepAlertDeliveries(now: Date = new Date()): Promise<number> {
  const claimed = claimDueAlertDeliveries(now);
  await Promise.all(claimed.map((row) => processClaim(row, now)));
  return claimed.length;
}

export function startAlertDeliveryWorker(): () => void {
  const run = () => {
    void sweepAlertDeliveries().catch((cause) => {
      console.error('[alert-delivery] outbox sweep failed', safeError(cause));
    });
  };
  run();
  const timer = setInterval(run, ALERT_DELIVERY_SWEEP_MS);
  (timer as unknown as { unref?: () => void }).unref?.();
  return () => clearInterval(timer);
}
