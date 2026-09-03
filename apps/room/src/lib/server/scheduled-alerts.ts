import { and, asc, eq, isNull, lte, sql } from 'drizzle-orm';

import {
  MAX_REPEAT_ADVANCES,
  isSchedulableDate,
  nextSendOn,
  type RepeatMode
} from '../scheduled-alert';

import { db } from './db';
import { alerts, scheduledAlerts } from './db/schema';
import { publishToRoom } from './room-events';
import { enqueueAlertDelivery } from './alert-delivery-outbox';

/**
 * `hasAlertScheduler` — the STORE and the SWEEP.
 *
 * `#lib/scheduled-alert.ts` owns the arithmetic and is pure. This owns the rows, the claim that
 * makes firing exactly-once, and the timer. The split is the same one the alert overlay took, and
 * for the same reason: the part that is easy to get subtly wrong is the arithmetic, and it must be
 * testable without a database or a clock.
 *
 * ## Where the scheduler runs, which was the recorded blocker and was wrong
 *
 * `missing-settings-triage.md` sized this row at *"a scheduler process in `services/api`, and the
 * crate's TEST targets cannot build here."* Both halves are true and neither is a reason to put it
 * there. The reference's scheduler is its own Node server, and this stack's equivalent long-lived
 * Node process is the ROOM — which `docs/NEXT-SESSION.md` establishes cannot be serverless at all,
 * on two independent grounds it already documents: a WAL SQLite file that Vercel's read-only
 * filesystem cannot hold, and a `text/event-stream` a bounded function duration cuts. The room owns
 * the `alerts` table this writes to and the fan-out that announces it. Putting the sweep in a Rust
 * crate would have it reach across a process boundary into a SQLite file it does not own.
 *
 * When `TODO.md` entry 5 moves the room onto the API and deletes SQLite, this moves with it — the
 * same note `room-events.ts` carries about itself.
 */

/** How often the sweep looks for due rows. */
export const SWEEP_INTERVAL_MS = 15_000;

/**
 * The most rows one sweep will fire.
 *
 * A bound rather than "all of them", because the pathological case is real: a room down for a week
 * with several daily series comes back with a backlog, and posting it in one pass would put a wall
 * of alerts on every member's screen in a single tick. `nextSendOn` already collapses a missed
 * series to its next occurrence, so this only bounds distinct alerts — and the next sweep is fifteen
 * seconds away, so nothing is dropped, only paced.
 */
export const MAX_PER_SWEEP = 20;

/** One pending alert, as the manage modal renders it. */
export interface PendingScheduledAlert {
  readonly id: number;
  readonly senderName: string;
  readonly body: string;
  readonly repeat: RepeatMode;
  readonly ignoreWeekends: boolean;
  readonly sendOn: Date;
}

/**
 * Schedule one alert.
 *
 * @returns the new row's id, or `null` when the date is not in the future.
 *
 * The date check is repeated HERE and not only in the composer. The reference checks it in the
 * browser alone (`o <= i ? bootbox.alert("Please select a date in the future")`), which anyone can
 * step past with a console; a date is the one field on this form whose being wrong schedules
 * something rather than refusing something.
 */
export function scheduleAlert(input: {
  roomShortCode: string;
  senderId: number;
  senderName: string;
  body: string;
  nonTrade: boolean;
  dontPush?: boolean;
  dontCrossPost?: boolean;
  repeat: RepeatMode;
  ignoreWeekends: boolean;
  sendOn: Date;
  now?: Date;
}): number | null {
  const now = input.now ?? new Date();
  if (!isSchedulableDate(input.sendOn, now)) return null;

  const inserted = db
    .insert(scheduledAlerts)
    .values({
      roomShortCode: input.roomShortCode,
      senderId: input.senderId,
      senderName: input.senderName,
      body: input.body,
      nonTrade: input.nonTrade,
      dontPush: input.dontPush ?? false,
      dontCrossPost: input.dontCrossPost ?? false,
      repeatMode: input.repeat,
      /*
        `ignoreWeekends: "daily" === repeat && ignoreWeekends` — the composer's own expression,
        reproduced at the store rather than trusted from the wire. A weekly series cannot land on a
        weekend it did not start on, so the flag is meaningless there; persisting a true one would
        put a "no weekends" badge on a row whose behaviour it does not describe.
      */
      ignoreWeekends: input.repeat === 'daily' && input.ignoreWeekends,
      sendOn: input.sendOn,
      createdAt: now
    })
    .returning({ id: scheduledAlerts.id })
    .get();

  return inserted?.id ?? null;
}

/** One room's pending alerts, soonest first — `getScheduledAlerts`. */
export function pendingScheduledAlerts(roomShortCode: string): PendingScheduledAlert[] {
  return db
    .select()
    .from(scheduledAlerts)
    .where(and(eq(scheduledAlerts.roomShortCode, roomShortCode), isNull(scheduledAlerts.claimedAt)))
    .orderBy(asc(scheduledAlerts.sendOn), asc(scheduledAlerts.id))
    .all()
    .map((row) => ({
      id: row.id,
      senderName: row.senderName,
      body: row.body,
      repeat: row.repeatMode as RepeatMode,
      ignoreWeekends: row.ignoreWeekends,
      sendOn: row.sendOn
    }));
}

/**
 * `removeScheduledAlert` — drop one pending row.
 *
 * **The room is part of the WHERE, not checked before it.** A scheduled-alert id is a small integer
 * a member could guess, and a delete that verified the room in a separate SELECT would be the same
 * TOCTOU the claim below exists to avoid. Returns whether a row in THIS room was actually removed,
 * so a caller can answer 404 rather than reporting success for somebody else's alert.
 */
export function removeScheduledAlert(roomShortCode: string, id: number): boolean {
  const removed = db
    .delete(scheduledAlerts)
    .where(and(eq(scheduledAlerts.id, id), eq(scheduledAlerts.roomShortCode, roomShortCode)))
    .returning({ id: scheduledAlerts.id })
    .all();
  return removed.length > 0;
}

/**
 * Take ownership of up to {@link MAX_PER_SWEEP} due rows, atomically.
 *
 * ONE conditional `UPDATE … WHERE claimed_at IS NULL … RETURNING`, which is the pattern `CLAUDE.md`
 * names: a SELECT-then-UPDATE is a TOCTOU, and two sweeps that both read a due row would both post
 * it. Zero rows back means there was nothing due or another sweep won, and losing that race is the
 * normal path rather than an error.
 *
 * The subquery is what bounds the batch — SQLite has no `UPDATE … LIMIT` without a compile flag, so
 * the ids are chosen by the same predicate and the update is keyed on them. Still one statement, so
 * still atomic.
 */
export function claimDueScheduledAlerts(now: Date): (typeof scheduledAlerts.$inferSelect)[] {
  /*
    MILLISECONDS, matching the column's `timestamp_ms` mode. Drizzle renders the bound parameters
    above for us; this subquery is hand-written SQL and has to agree with the storage unit itself.
    Dividing by 1000 here — which the first draft did, copying the second-precision convention every
    other table in this database uses — made the comparison off by a factor of a thousand and the
    sweep claim nothing at all after the epoch. The schema's own docblock says why this table differs.
  */
  const cutoff = now.getTime();
  return db
    .update(scheduledAlerts)
    .set({ claimedAt: now })
    .where(
      and(
        isNull(scheduledAlerts.claimedAt),
        lte(scheduledAlerts.sendOn, now),
        sql`${scheduledAlerts.id} IN (SELECT id FROM scheduled_alerts
              WHERE claimed_at IS NULL AND send_on <= ${cutoff}
              ORDER BY send_on ASC, id ASC LIMIT ${MAX_PER_SWEEP})`
      )
    )
    .returning()
    .all();
}

/**
 * Post one claimed row as a real alert, and re-arm it if it repeats.
 *
 * Exported so a test can drive a single occurrence deterministically rather than waiting on the
 * timer — the sweep below is the only other caller.
 *
 * **The insert comes before the re-arm**, and the order is load-bearing: re-arming first and then
 * failing to insert would move the series forward past an occurrence that never fired. Failing the
 * other way round posts the alert and leaves a claimed row that no longer repeats, which is visible
 * and recoverable.
 */
export function fireScheduledAlert(row: typeof scheduledAlerts.$inferSelect, now: Date): void {
  const inserted = db.transaction((transaction) => {
    const alert = transaction
      .insert(alerts)
      .values({
        roomShortCode: row.roomShortCode,
        senderId: row.senderId,
        kind: 'text',
        body: row.body,
        nonTrade: row.nonTrade,
        createdAt: now
      })
      .returning()
      .get();
    if (!alert) throw new Error('the scheduled alert could not be stored');
    enqueueAlertDelivery(transaction, {
      alertId: alert.id,
      roomShortCode: row.roomShortCode,
      dontPush: row.dontPush,
      dontCrossPost: row.dontCrossPost,
      now
    });
    return alert;
  });

  /*
    The same frame `post-alert.remote.ts` publishes, so every member's room updates without a reload
    exactly as it does for a live alert. A scheduled alert that only appeared on the next refetch
    would be a different feature from the one the setting promises.
  */
  publishToRoom(row.roomShortCode, {
    channel: 'alerts',
    data: {
      id: inserted?.id ?? null,
      senderId: row.senderId,
      senderName: row.senderName,
      body: row.body,
      kind: 'text',
      nonTrade: row.nonTrade
    }
  });

  const next = nextSendOn(row.sendOn, row.repeatMode as RepeatMode, row.ignoreWeekends, now);
  if (next === null) {
    /*
      Not repeating, or the series ran past `MAX_REPEAT_ADVANCES`. Either way the row is finished and
      is deleted rather than left claimed: a claimed row is invisible to the manage modal and to the
      sweep alike, so keeping it would accumulate rows nothing can ever read or remove.
    */
    db.delete(scheduledAlerts).where(eq(scheduledAlerts.id, row.id)).run();
    return;
  }

  // Re-armed in place, keeping the id the manage modal and any open "Remove" button already hold.
  db.update(scheduledAlerts)
    .set({ sendOn: next, claimedAt: null })
    .where(eq(scheduledAlerts.id, row.id))
    .run();
}

/**
 * One pass: claim what is due, fire each, re-arm what repeats.
 *
 * @returns how many fired, which is what the interval logs and what a test asserts.
 */
export function sweepScheduledAlerts(now: Date = new Date()): number {
  const claimed = claimDueScheduledAlerts(now);
  for (const row of claimed) {
    try {
      fireScheduledAlert(row, now);
    } catch (error) {
      /*
        ONE row failing must not take the rest of the batch with it, and the claim means it will not
        be retried — deliberately. A row that throws on insert throws again on the next sweep, and a
        scheduler that retries a poison row forever posts nothing at all thereafter. It stays claimed
        and is reported, which is the loud failure `CLAUDE.md` asks for rather than a silent loop.
      */
      console.error('[scheduler] a scheduled alert could not be posted', row.id, error);
    }
  }
  return claimed.length;
}

/**
 * Start the sweep, and hand back the way to stop it.
 *
 * The interval is the ONLY process-lifetime state this feature has, and it holds no schedule: every
 * question it asks is answered from the table, so a restart resumes rather than recovers. That is
 * the property that lets a `setInterval` be an acceptable answer here where it would not be for
 * anything durable — and `MAX_REPEAT_ADVANCES` is why a process that was down for a month does not
 * come back and replay it.
 */
export function startAlertScheduler(): () => void {
  const timer = setInterval(() => {
    try {
      sweepScheduledAlerts();
    } catch (error) {
      // The sweep must never be able to kill its own interval; a thrown error here would leave the
      // room with no scheduler until somebody restarted it, and nothing would say so.
      console.error('[scheduler] sweep failed', error);
    }
  }, SWEEP_INTERVAL_MS);

  // `unref` so the timer cannot hold a test runner or a shutdown open. Guarded because the method
  // is Node's and does not exist on the DOM `setInterval` the type resolves to in some configs.
  (timer as unknown as { unref?: () => void }).unref?.();

  return () => clearInterval(timer);
}

export { MAX_REPEAT_ADVANCES };
