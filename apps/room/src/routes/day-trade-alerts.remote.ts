import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import {
  dayTradeAlertMsgSchema,
  deleteDayTradeAlertMsgSchema,
  editDayTradeAlertMsgSchema
} from '#lib/day-trade-alerts-command.js';
import { dayTradeAlertsTabVisible } from '#lib/day-trade-alerts.js';
import { isPresenterRole, requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import {
  createDayTradeAlert,
  deleteDayTradeAlert as deleteDayTradeAlertRow,
  editDayTradeAlert as editDayTradeAlertRow
} from '#lib/server/day-trade-alerts-repository.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import { consumeRateLimit } from '#lib/server/rate-limit.js';
import { readRoomConfig } from '#lib/server/room-config-client.js';
import { publishToRoom } from '#lib/server/room-events.js';
import type { User } from '#lib/server/db/schema.js';

/*
  THE THREE DAY TRADE ALERT MUTATIONS.

  ## What they were

  Three form actions in `+page.server.ts`, reached by the SAME dispatcher the Swing three were:
  ``fetch(`?/${action}`)`` inside one generic `RoomTradeAlerts.submit`, instantiated twice. One
  `fetch`, two unions, six action names assembled at runtime and connected to nothing.

  ## Why this is a SEPARATE module from `swing-alerts.remote.ts`

  Split on the GATE. The two features look alike and their gates are NOT the same gate: this one
  consults `dayTradeAlertsTabVisible` and refuses with a sentence naming Day Trade Alerts. A shared
  guard taking a predicate would be one place where turning one feature off could be made to turn
  the other off too — which is the reason `+page.server.ts` kept `refuseSwingAlert` and
  `refuseDayTradeAlert` as two functions with the same shape rather than one parameterised one. That
  decision is carried across rather than re-litigated.

  **Create is `dayTradeAlertMsg`, never `newDayTradeAlertMsg`.** That name is a payload KEY on the
  edit command AND, separately, the server→client push; it is the create command nowhere. It is the
  same trap the Swing build hit, with the same shape and a different word in the middle, and
  `day-trade-alerts-contract.test.ts` pins it.

  **The edit's mirror command keeps the word `Swing`.** `editAlertMessageSwing` is sent by this
  feature too (byte 1,987,189); `editAlertMessageDayTrade` exists nowhere in the bundle. The
  repository does both halves of that edit in one transaction rather than sending two commands, so
  nothing here is named for it — but the name is pinned in the contract test, because inventing the
  analogous one is the port's most tempting mistake.
*/

/**
 * Presenter, entitlement, and the caller's own room — resolved together and in that order.
 *
 * The port of `swingAlertsRoom`, and a SEPARATE function for the reason the module header gives.
 *
 * **Presenter first, entitlement second.** The role check is a field read on a row already in
 * memory; the entitlement is a call to the controller with a two-second timeout. Asking the cheap
 * question first means a member who should never have reached this endpoint does not cost a round
 * trip, and it means a controller outage cannot be used to probe for the feature.
 *
 * The entitlement is re-asked here rather than trusted from the page load, because the load ran
 * against a different request: a presenter whose owner turned the feature off mid-session must stop
 * being able to write, and this is the only place that can know. `readRoomConfig` throws when the
 * controller cannot be reached, which fails CLOSED — the correct direction for a feature switch,
 * and the same behaviour the page load has.
 */
async function dayTradeAlertsRoom(verb: string): Promise<{ room: string; user: User }> {
  const { locals } = getRequestEvent();
  const user = requireUser(locals);
  if (!isPresenterRole(user.role)) error(403, `You cannot ${verb}.`);

  const room = requireRoomShortCode(locals);
  /* `locals` is the per-request cache key `readRoomConfig` uses — one round trip per request. */
  const { settings } = await readRoomConfig(locals, room, user.email);
  if (!dayTradeAlertsTabVisible(settings)) {
    // 404 rather than 403: in a room without the entitlement the feature does not exist, and
    // saying "forbidden" would confirm that it exists somewhere and this member is not allowed it.
    error(404, 'Day Trade Alerts are not enabled for this room.');
  }
  return { room, user };
}

/**
 * `dayTradeAlertMsg` — post a day trade alert.
 *
 * Two writes, in one transaction: the row, and the mirrored message the reference also posts into
 * the main alerts feed with `alertMsg`. See `day-trade-alerts-repository.ts`.
 *
 * ## The rate limit is the SAME bucket, and that is the point rather than a copy-paste
 *
 * This command's second write lands in the main alerts feed, so without the limiter it is a way to
 * post alerts at whatever rate the network allows, straight past the one guarding the composer that
 * writes the identical row. The Swing action shipped WITHOUT it and the omission was found by
 * re-reading a diff, not by a test.
 *
 * ONE bucket for both features and not two, deliberately: `alert` names the FEED being written, and
 * two buckets would mean a presenter could post at twice the rate by alternating tabs. Only the
 * create spends it — an edit rewrites a message that already exists and a delete removes one.
 */
export const postDayTradeAlert = command(dayTradeAlertMsgSchema.shape.data, async (alert) => {
  ensureDatabase();
  const { room, user } = await dayTradeAlertsRoom('post day trade alerts');

  const limit = consumeRateLimit('alert', user.id);
  if (!limit.allowed) {
    error(
      429,
      `You are posting alerts too quickly. Try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`
    );
  }

  const created = createDayTradeAlert({
    room,
    alert,
    now: new Date(),
    // `senderName: globals.user.nick || globals.user.name` — taken from the session, never sent
    // by the client, because a client-supplied author is a client-supplied identity.
    senderName: user.displayName,
    userId: user.id
  });

  /*
    Tell the room about the mirrored message, on the same channel and in the same shape as
    `postAlert` — writing the row made the alert exist, it did not make anyone see it.

    Only the CREATE announces. Edits and deletes of an alert are not published anywhere in this
    room today, so they reach other members on their next load. Publishing an edit on this channel
    would append a SECOND copy of the alert to every open feed, which is worse than the delay.
    Named here rather than left as a surprise.
  */
  if (created.mirror.alertId !== null) {
    publishToRoom(room, {
      channel: 'alerts',
      data: {
        id: created.mirror.alertId,
        senderId: user.id,
        senderName: user.displayName,
        body: created.mirror.body ?? '',
        kind: 'text',
        nonTrade: false
      }
    });
  }
});

/**
 * `editDayTradeAlertMsg` — rewrite a day trade alert and its mirrored feed message.
 *
 * The reference sends `editAlertMessageSwing` as a second command to update the mirror — that exact
 * literal, on this path — while here the repository does both halves in one transaction, keyed by
 * the recorded `alert_id` rather than by re-deriving the old text and scanning the feed for it.
 * That scan is worse on this feature than on Swing: its loop has no `break`, so it walks the whole
 * feed and the last match wins.
 */
export const editDayTradeAlert = command(
  editDayTradeAlertMsgSchema.shape.data,
  async ({ dayTradeAlertID, ...alert }) => {
    ensureDatabase();
    const { room, user } = await dayTradeAlertsRoom('edit day trade alerts');

    const updated = editDayTradeAlertRow({
      room,
      dayTradeAlertID,
      alert,
      senderName: user.displayName,
      userId: user.id
    });
    if (updated === null) error(404, 'That day trade alert was not found.');
  }
);

/** `deleteDayTradeAlertMsg` — soft-delete the row, hard-delete its mirrored feed message. */
export const deleteDayTradeAlert = command(
  deleteDayTradeAlertMsgSchema.shape.data,
  async ({ dayTradeAlertID }) => {
    ensureDatabase();
    const { room, user } = await dayTradeAlertsRoom('delete day trade alerts');

    const deleted = deleteDayTradeAlertRow({
      room,
      dayTradeAlertID,
      now: new Date(),
      userId: user.id
    });
    if (deleted === null) error(404, 'That day trade alert was not found.');
  }
);
