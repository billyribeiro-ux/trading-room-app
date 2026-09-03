import { and, desc, eq } from 'drizzle-orm';

import { FcmNotConfigured, FcmUnreachable, fcmConfigured, sendPush } from './fcm.js';
import { getDb } from './db/index.js';
import { alertDeliveryAttempts, alertDispatchLinks, alertDispatches, roomUsers, rooms, users } from './db/schema.js';
import { readPushTokens, readSettings } from './rooms.js';

export type AlertDeliveryStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'suppressed' | 'no-registration';

export interface AlertDeliveryRow {
  roomName: string;
  roomShortCode: string;
  recipientName: string;
  recipientEmail: string;
  status: AlertDeliveryStatus;
  reason: string | null;
  registrationCount: number;
  sentCount: number;
  failedCount: number;
  prunedCount: number;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface AlertDeliveryReport {
  alertId: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  rows: AlertDeliveryRow[];
}

/** Parses the owner-validated room list and applies the per-alert suppression before any query. */
export function linkedAlertRoomIds(raw: unknown, sourceRoomId: number, dontCrossPost: boolean): number[] {
  if (dontCrossPost) return [];
  return Array.from(
    new Set(
      String(raw ?? '')
        .split(/[\s,]+/)
        .map(Number)
        .filter((value) => Number.isSafeInteger(value) && value > 0 && value !== sourceRoomId)
    )
  ).slice(0, 20);
}

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function reportOf(
  dispatch: typeof alertDispatches.$inferSelect,
  rows: (typeof alertDeliveryAttempts.$inferSelect)[],
  room: { name: string; shortCode: string }
): AlertDeliveryReport {
  return {
    alertId: dispatch.externalAlertId,
    completed: dispatch.completedAt !== null,
    createdAt: dispatch.createdAt.toISOString(),
    completedAt: iso(dispatch.completedAt),
    rows: rows.map((row) => ({
      roomName: room.name,
      roomShortCode: room.shortCode,
      recipientName: row.recipientName,
      recipientEmail: row.recipientEmail,
      status: row.status as AlertDeliveryStatus,
      reason: row.reason,
      registrationCount: row.registrationCount,
      sentCount: row.sentCount,
      failedCount: row.failedCount,
      prunedCount: row.prunedCount,
      startedAt: iso(row.startedAt),
      finishedAt: iso(row.finishedAt)
    }))
  };
}

async function readReportByDispatch(
  dispatch: typeof alertDispatches.$inferSelect,
  room: { name: string; shortCode: string }
): Promise<AlertDeliveryReport> {
  const rows = await getDb()
    .select()
    .from(alertDeliveryAttempts)
    .where(eq(alertDeliveryAttempts.dispatchId, dispatch.id))
    .orderBy(alertDeliveryAttempts.id);
  return reportOf(dispatch, rows, room);
}

/** Returns the newest versioned dispatch for one room-owned alert id. */
export async function readAlertDeliveryReport(
  roomId: number,
  externalAlertId: string
): Promise<AlertDeliveryReport | null> {
  const [dispatch] = await getDb()
    .select()
    .from(alertDispatches)
    .where(and(eq(alertDispatches.roomId, roomId), eq(alertDispatches.externalAlertId, externalAlertId)))
    .orderBy(desc(alertDispatches.createdAt), desc(alertDispatches.id))
    .limit(1);
  if (!dispatch) return null;
  const [sourceRoom] = await getDb()
    .select({ name: rooms.name, shortCode: rooms.shortCode })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (!sourceRoom) return null;

  const linked = await getDb()
    .select({
      dispatch: alertDispatches,
      roomName: alertDispatchLinks.targetRoomName,
      roomShortCode: alertDispatchLinks.targetRoomCode
    })
    .from(alertDispatchLinks)
    .innerJoin(alertDispatches, eq(alertDispatches.id, alertDispatchLinks.targetDispatchId))
    .where(eq(alertDispatchLinks.sourceDispatchId, dispatch.id))
    .orderBy(alertDispatchLinks.id);
  const reports = await Promise.all([
    readReportByDispatch(dispatch, sourceRoom),
    ...linked.map((row) =>
      readReportByDispatch(row.dispatch, {
        name: row.roomName,
        shortCode: row.roomShortCode
      })
    )
  ]);
  const completed = reports.every((report) => report.completed);
  const completionTimes = reports
    .map((report) => report.completedAt)
    .filter((value): value is string => value !== null)
    .sort();
  return {
    alertId: dispatch.externalAlertId,
    completed,
    createdAt: dispatch.createdAt.toISOString(),
    completedAt: completed ? (completionTimes.at(-1) ?? null) : null,
    rows: reports.flatMap((report) => report.rows)
  };
}

/** Idempotently records which linked-room dispatch belongs to the source alert. */
export async function linkAlertDispatch(input: {
  sourceRoomId: number;
  sourceIdempotencyKey: string;
  targetRoom: { id: number; name: string; shortCode: string };
  targetIdempotencyKey: string;
}): Promise<void> {
  const database = getDb();
  const [source] = await database
    .select({ id: alertDispatches.id })
    .from(alertDispatches)
    .where(
      and(
        eq(alertDispatches.roomId, input.sourceRoomId),
        eq(alertDispatches.idempotencyKey, input.sourceIdempotencyKey)
      )
    )
    .limit(1);
  const [target] = await database
    .select({ id: alertDispatches.id })
    .from(alertDispatches)
    .where(
      and(
        eq(alertDispatches.roomId, input.targetRoom.id),
        eq(alertDispatches.idempotencyKey, input.targetIdempotencyKey)
      )
    )
    .limit(1);
  if (!source || !target) throw new Error('linked alert dispatch could not be resolved');
  await database
    .insert(alertDispatchLinks)
    .values({
      sourceDispatchId: source.id,
      targetDispatchId: target.id,
      targetRoomId: input.targetRoom.id,
      targetRoomName: input.targetRoom.name,
      targetRoomCode: input.targetRoom.shortCode
    })
    .onConflictDoNothing();
}

export function deliverySuppressionReason(
  member: {
    role: number;
    banned: boolean;
    inactive: boolean;
    paused: boolean;
    inviteStatus: string;
    notificationsState: string;
    alerterAppFcmUserOff: boolean;
    isFreeTrial: boolean;
    hasMobileApp: boolean;
    isMarketplaceUser: boolean;
    stripeSubscriptionStatus: string | null;
    stripeCurrentPeriodEnd: Date | null;
    lastLoginAt: Date | null;
  },
  settings: Awaited<ReturnType<typeof readSettings>>,
  appEnabled: boolean,
  now: Date = new Date()
): string | null {
  if (!appEnabled) return 'room-app-disabled';
  if (settings.diasableFCMAlerts === true) return 'room-push-disabled';
  if (member.banned || member.role === 4 || member.inactive || member.inviteStatus !== 'approved') {
    return 'membership-ineligible';
  }
  if (member.paused || member.notificationsState !== 'active' || member.alerterAppFcmUserOff) {
    return 'notifications-disabled';
  }
  if (member.isFreeTrial && settings.freeTrialsGetApp !== true) return 'trial-app-disabled';
  if (settings.ptrMobileAppCaseByCaseEnabled === true && !member.hasMobileApp) {
    return 'member-app-disabled';
  }

  /*
   * Marketplace billing is checked at SEND time. Entry-time entitlement is insufficient for a
   * paired phone because the app can keep a registration after the website session has expired.
   * Stripe keeps a cancel-at-period-end subscription `active` until the paid period ends, so only
   * `active` and `trialing` are deliverable states. Unknown states fail closed.
   */
  if (member.isMarketplaceUser) {
    const status = member.stripeSubscriptionStatus?.trim().toLowerCase() ?? '';
    if (status !== 'active' && status !== 'trialing') return 'billing-ineligible';
    if (member.stripeCurrentPeriodEnd && member.stripeCurrentPeriodEnd.getTime() <= now.getTime()) {
      return 'billing-period-expired';
    }
  }

  /* The reference's login-decay rule is a backstop after explicit membership/billing checks. */
  const expiryDays = Number(settings.mobileAppExpireNotificationsDays ?? 14);
  if (Number.isFinite(expiryDays) && expiryDays > 0) {
    if (!member.lastLoginAt) return 'login-age-unknown';
    const expiresAt = member.lastLoginAt.getTime() + expiryDays * 24 * 60 * 60 * 1_000;
    if (expiresAt <= now.getTime()) return 'login-expired';
  }
  return null;
}

/**
 * Delivers one alert at most once per member for a versioned idempotency key.
 *
 * A row is claimed from `queued` to `sending` before talking to FCM. If a process died in that
 * narrow interval, the next invocation records the old `sending` row as failed with an uncertain
 * outcome and does not send it again. FCM has no idempotency key, so this explicit at-most-once
 * policy is safer for a trading alert than a retry that can duplicate an execution signal.
 */
export async function dispatchAlertPush(input: {
  roomId: number;
  externalAlertId: string;
  idempotencyKey: string;
  body: string;
  dontCrossPost: boolean;
}): Promise<AlertDeliveryReport> {
  const database = getDb();
  const [room] = await database
    .select({ id: rooms.id, name: rooms.name, shortCode: rooms.shortCode })
    .from(rooms)
    .where(eq(rooms.id, input.roomId))
    .limit(1);
  if (!room) throw new Error('room not found');

  await database
    .insert(alertDispatches)
    .values({
      roomId: room.id,
      idempotencyKey: input.idempotencyKey,
      externalAlertId: input.externalAlertId,
      title: room.name,
      body: input.body,
      dontCrossPost: input.dontCrossPost
    })
    .onConflictDoNothing();

  const [dispatch] = await database
    .select()
    .from(alertDispatches)
    .where(and(eq(alertDispatches.roomId, room.id), eq(alertDispatches.idempotencyKey, input.idempotencyKey)))
    .limit(1);
  if (!dispatch) throw new Error('alert dispatch could not be created');
  if (
    dispatch.externalAlertId !== input.externalAlertId ||
    dispatch.body !== input.body ||
    dispatch.dontCrossPost !== input.dontCrossPost
  ) {
    throw new Error('idempotency key was reused for a different alert payload');
  }
  if (dispatch.completedAt) return readReportByDispatch(dispatch, room);

  const settings = await readSettings(room.id);
  const appEnabled = settings.ptrMobileAppEnabled === true || settings.customMobileAppEnabled === true;
  const policyNow = new Date();
  const members = await database
    .select({
      roomUserId: roomUsers.id,
      role: roomUsers.role,
      banned: roomUsers.banned,
      inactive: roomUsers.inactive,
      paused: roomUsers.paused,
      inviteStatus: roomUsers.inviteStatus,
      notificationsState: roomUsers.notificationsState,
      alerterAppFcmUserOff: roomUsers.alerterAppFcmUserOff,
      isFreeTrial: roomUsers.isFreeTrial,
      hasMobileApp: roomUsers.hasMobileApp,
      isMarketplaceUser: roomUsers.isMarketplaceUser,
      stripeSubscriptionStatus: roomUsers.stripeSubscriptionStatus,
      stripeCurrentPeriodEnd: roomUsers.stripeCurrentPeriodEnd,
      lastLoginAt: roomUsers.lastLoginAt,
      pushTokensJson: roomUsers.pushTokensJson,
      recipientName: users.displayName,
      recipientEmail: users.email
    })
    .from(roomUsers)
    .innerJoin(users, eq(users.id, roomUsers.userId))
    .where(eq(roomUsers.roomId, room.id));

  if (
    members.some((member) => !deliverySuppressionReason(member, settings, appEnabled, policyNow)) &&
    !fcmConfigured()
  ) {
    throw new FcmNotConfigured();
  }

  await database
    .insert(alertDeliveryAttempts)
    .values(
      members.map((member) => ({
        dispatchId: dispatch.id,
        roomUserId: member.roomUserId,
        recipientKey: String(member.roomUserId),
        recipientName: member.recipientName,
        recipientEmail: member.recipientEmail
      }))
    )
    .onConflictDoNothing();

  // See the function docblock: an interrupted send is outcome-unknown and must not be duplicated.
  await database
    .update(alertDeliveryAttempts)
    .set({
      status: 'failed',
      reason: 'outcome-unknown-after-worker-interruption',
      finishedAt: new Date()
    })
    .where(and(eq(alertDeliveryAttempts.dispatchId, dispatch.id), eq(alertDeliveryAttempts.status, 'sending')));

  for (const member of members) {
    const recipientKey = String(member.roomUserId);
    const reason = deliverySuppressionReason(member, settings, appEnabled, policyNow);
    const tokens = readPushTokens(member.pushTokensJson);
    if (reason || tokens.length === 0) {
      await database
        .update(alertDeliveryAttempts)
        .set({
          status: reason ? 'suppressed' : 'no-registration',
          reason: reason ?? 'no-active-registration',
          registrationCount: tokens.length,
          finishedAt: new Date()
        })
        .where(
          and(
            eq(alertDeliveryAttempts.dispatchId, dispatch.id),
            eq(alertDeliveryAttempts.recipientKey, recipientKey),
            eq(alertDeliveryAttempts.status, 'queued')
          )
        );
      continue;
    }

    const startedAt = new Date();
    const claimed = await database
      .update(alertDeliveryAttempts)
      .set({ status: 'sending', startedAt, registrationCount: tokens.length })
      .where(
        and(
          eq(alertDeliveryAttempts.dispatchId, dispatch.id),
          eq(alertDeliveryAttempts.recipientKey, recipientKey),
          eq(alertDeliveryAttempts.status, 'queued')
        )
      )
      .returning({ id: alertDeliveryAttempts.id });
    if (claimed.length === 0) continue;

    let sentCount = 0;
    let failedCount = 0;
    const survivors: typeof tokens = [];
    for (const registration of tokens) {
      try {
        const outcome = await sendPush({
          registrationToken: registration.token,
          title: room.name,
          body: input.body
        });
        if (outcome.ok) sentCount += 1;
        else failedCount += 1;
        if (outcome.ok || outcome.reason !== 'unregistered') survivors.push(registration);
      } catch (cause) {
        failedCount += 1;
        survivors.push(registration);
        if (!(cause instanceof FcmUnreachable)) {
          console.error('[alert-delivery] FCM send failed', {
            dispatchId: dispatch.id,
            roomUserId: member.roomUserId,
            cause: cause instanceof Error ? cause.message : String(cause)
          });
        }
      }
    }
    const prunedCount = tokens.length - survivors.length;
    if (prunedCount > 0) {
      await database
        .update(roomUsers)
        .set({ pushTokensJson: JSON.stringify(survivors) })
        .where(and(eq(roomUsers.roomId, room.id), eq(roomUsers.id, member.roomUserId)));
    }

    await database
      .update(alertDeliveryAttempts)
      .set({
        status: sentCount > 0 ? 'sent' : 'failed',
        reason:
          failedCount === 0
            ? null
            : sentCount > 0
              ? `${failedCount}-of-${tokens.length}-registrations-failed`
              : 'all-registrations-failed',
        sentCount,
        failedCount,
        prunedCount,
        finishedAt: new Date()
      })
      .where(eq(alertDeliveryAttempts.id, claimed[0].id));
  }

  const remaining = await database
    .select({ id: alertDeliveryAttempts.id })
    .from(alertDeliveryAttempts)
    .where(and(eq(alertDeliveryAttempts.dispatchId, dispatch.id), eq(alertDeliveryAttempts.status, 'queued')))
    .limit(1);
  if (remaining.length === 0) {
    await database
      .update(alertDispatches)
      .set({ completedAt: new Date() })
      .where(and(eq(alertDispatches.id, dispatch.id), eq(alertDispatches.roomId, room.id)));
  }

  const [updated] = await database.select().from(alertDispatches).where(eq(alertDispatches.id, dispatch.id)).limit(1);
  return readReportByDispatch(updated, room);
}
