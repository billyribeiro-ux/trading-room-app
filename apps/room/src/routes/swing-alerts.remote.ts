import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import {
  deleteSwingAlertMsgSchema,
  editSwingAlertMsgSchema,
  swingAlertMsgSchema
} from '#lib/swing-alerts-command.js';
import { swingAlertsTabVisible } from '#lib/swing-alerts.js';
import { isPresenterRole, requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import { consumeRateLimit } from '#lib/server/rate-limit.js';
import { readRoomConfig } from '#lib/server/room-config-client.js';
import { publishToRoom } from '#lib/server/room-events.js';
import {
  createSwingAlert,
  deleteSwingAlert as deleteSwingAlertRow,
  editSwingAlert as editSwingAlertRow
} from '#lib/server/swing-alerts-repository.js';
import type { User } from '#lib/server/db/schema.js';

/*
  THE THREE SWING TRADE ALERT MUTATIONS.

  ## What they were

  Three form actions in `+page.server.ts`, reached by `RoomTradeAlerts.submit(action, values)` —
  ``fetch(`?/${action}`)`` over an exported type alias, with a hand-built `FormData` body. The
  endpoint was assembled while the page ran, so nothing — not the compiler, not a search, not the
  build — connected the call site to the action it reached. That is the `presenterCommand` failure
  in its least visible form, and `remote-call-sites-contract.test.ts` opens with what it cost.

  ## Why this is a SEPARATE module from `day-trade-alerts.remote.ts`

  Split on the GATE, which is this repository's rule, and here the two gates genuinely differ: the
  entitlement one consults is a different room setting (`swingAlertsTabVisible` against
  `dayTradeAlertsTabVisible`) and the sentence it refuses with names a different feature. A shared
  guard taking a predicate would be one place where turning Swing off could be made to turn Day
  Trade off too — which is the reason `+page.server.ts` kept `refuseSwingAlert` and
  `refuseDayTradeAlert` as two functions with the same shape rather than one parameterised one. That
  decision is carried across, not re-litigated.

  The bodies of the two modules are near-identical and that is deliberate: `swing-alerts-repository`
  and `day-trade-alerts-repository` are already separate, the schemas are already separate, and the
  six values that differ between the features are pinned against each other in
  `day-trade-alerts-contract.test.ts` precisely because *"it equals Swing"* is the bug.

  ## Two gates, in COST ORDER, and neither of them is the browser's

  The role check is a field read on a row already in memory. The entitlement is a call to the
  controller with a two-second timeout. Asking the cheap question first means a member who should
  never have reached this endpoint does not cost a round trip, and it means a controller outage
  cannot be used to probe for whether a room has the feature.

  The entitlement is re-asked on every mutation rather than trusted from the page load, because the
  load ran against a different request: a presenter whose owner turned the feature off mid-session
  must stop being able to write, and this is the only place that can know. `readRoomConfig` throws
  when the controller cannot be reached, which fails CLOSED — the correct direction for a feature
  switch, and the same behaviour the page load has.

  **A hidden form is not a check.** The composer is inside `{#if isPresenter}` in the pane as well,
  and that has never been an authorization decision here.
*/

/**
 * Presenter, entitlement, and the caller's own room — resolved together and in that order.
 *
 * Returns the room and the CALLER, because every one of the three needs both: the room to scope the
 * write, and the account to record who made it. Returning the room only after the role check is
 * what makes "may they" and "which room" one event; handed out separately they can be applied
 * separately, and the failure mode of applying only the first is a presenter of one room reaching
 * another — the 2026-08-07 privilege escalation.
 *
 * `verb` completes *"You cannot …"*, which is how the action phrased each refusal.
 */
async function swingAlertsRoom(verb: string): Promise<{ room: string; user: User }> {
  const { locals } = getRequestEvent();
  const user = requireUser(locals);
  if (!isPresenterRole(user.role)) error(403, `You cannot ${verb}.`);

  const room = requireRoomShortCode(locals);
  /*
    `locals` is the per-request cache key `readRoomConfig` uses, which is the same object every
    remote function on this request sees — so a page that posts two alerts in one request pays for
    one controller round trip, and a page that posts one pays for one.
  */
  const { settings } = await readRoomConfig(locals, room, user.email);
  if (!swingAlertsTabVisible(settings)) {
    // 404 rather than 403: in a room without the entitlement the feature does not exist, and
    // saying "forbidden" would confirm that it exists somewhere and this member is not allowed it.
    error(404, 'Swing Trade Alerts are not enabled for this room.');
  }
  return { room, user };
}

/**
 * `swingAlertMsg` — post a swing alert.
 *
 * Two writes, in one transaction: the row, and the mirrored message the reference also posts into
 * the main alerts feed with `alertMsg`. See `swing-alerts-repository.ts`.
 *
 * **Create is `swingAlertMsg`, never `newSwingAlertMsg`.** That name is a payload KEY on the edit
 * command and, separately, the server→client push. Two independent decodes had to correct it, and
 * `swing-alerts-contract.test.ts` pins it.
 *
 * ## The rate limit is the SAME bucket the composer spends
 *
 * This command's second write lands in the main alerts feed, so without the limiter it is a way to
 * post alerts at whatever rate the network allows, straight past the one guarding `postAlert` — the
 * composer that writes the identical row. That omission shipped once and was found by re-reading a
 * diff rather than by a test; `day-trade-alerts-contract.test.ts` is now the test.
 *
 * Only the CREATE spends it: an edit rewrites a message that already exists, and a delete removes
 * one.
 */
export const postSwingAlert = command(swingAlertMsgSchema.shape.data, async (alert) => {
  ensureDatabase();
  const { room, user } = await swingAlertsRoom('post swing trade alerts');

  const limit = consumeRateLimit('alert', user.id);
  if (!limit.allowed) {
    error(
      429,
      `You are posting alerts too quickly. Try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`
    );
  }

  const created = createSwingAlert({
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
 * `editSwingAlertMsg` — rewrite a swing alert and its mirrored feed message.
 *
 * The reference sends `editAlertMessageSwing` as a second command to update the mirror; here the
 * repository does both halves in one transaction, keyed by the recorded `alert_id` rather than by
 * re-deriving the old text and scanning the feed for it.
 *
 * `null` from the repository means "no such row IN THIS ROOM", which is a 404 rather than a crash
 * or a success — the same translation the action performed, and the thing a rewrite drops.
 */
export const editSwingAlert = command(
  editSwingAlertMsgSchema.shape.data,
  async ({ swingAlertID, ...alert }) => {
    ensureDatabase();
    const { room, user } = await swingAlertsRoom('edit swing trade alerts');

    const updated = editSwingAlertRow({
      room,
      swingAlertID,
      alert,
      senderName: user.displayName,
      userId: user.id
    });
    if (updated === null) error(404, 'That swing alert was not found.');
  }
);

/** `deleteSwingAlertMsg` — soft-delete the row, hard-delete its mirrored feed message. */
export const deleteSwingAlert = command(
  deleteSwingAlertMsgSchema.shape.data,
  async ({ swingAlertID }) => {
    ensureDatabase();
    const { room, user } = await swingAlertsRoom('delete swing trade alerts');

    const deleted = deleteSwingAlertRow({ room, swingAlertID, now: new Date(), userId: user.id });
    if (deleted === null) error(404, 'That swing alert was not found.');
  }
);
