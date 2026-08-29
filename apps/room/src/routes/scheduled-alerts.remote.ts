import { command, getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

import { MAX_ALERT_BODY } from '#lib/message-bounds.js';
import { REPEAT_MODES } from '#lib/scheduled-alert.js';
import { presenterRoom, requireUser } from '#lib/server/auth.js';
import { readRoomConfig } from '#lib/server/room-config-client.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import { consumeRateLimit } from '#lib/server/rate-limit.js';
import {
  pendingScheduledAlerts,
  removeScheduledAlert as removeScheduledAlertRow,
  scheduleAlert
} from '#lib/server/scheduled-alerts.js';

/*
  `hasAlertScheduler` — the three commands the reference sends, as remote functions.

  `alertMsgLater`, `getScheduledAlerts` and `removeScheduledAlert` (bundle bytes 2,130,937 /
  1,009,767 / 2,406,725). One module, because all three are the same gate on the same subject —
  which is the split `post-alert.remote.ts` records: on the GATE, not on the noun.

  ## PRESENTER-ONLY, on all three, and the read as much as the writes

  The reference gates the composer's send-later pane and the manage modal behind the presenter UI and
  nothing else — the commands themselves are ungated in the browser, which is a gate anyone can step
  past with a console. Here `presenterRoom()` decides, on the server, from data the server owns. That
  covers the LIST too: a room's pending alerts are what a presenter intends to say and has not said
  yet, and handing that to every member turns a scheduler into a leak of unpublished trade calls.

  ## The setting is checked HERE as well as drawn

  `sessData.hasAlertScheduler` gates the button in the reference. A gate that only removes a control
  is not a gate, which is the rule `enableQAReactions` was corrected under: a room whose owner has
  the scheduler switched off must REFUSE a schedule, not merely fail to offer one.
*/

/**
 * The room's own setting, read from the control plane exactly as `reactToQuestion` reads
 * `enableQAReactions`.
 *
 * `=== true` is the fail-closed read every optional control-plane field takes here: a config
 * response that omitted the field refuses rather than defaulting the feature open.
 */
const requireScheduler = async (room: string, email: string): Promise<void> => {
  const { locals } = getRequestEvent();
  const config = await readRoomConfig(locals, room, email);
  if (config.settings?.hasAlertScheduler !== true) {
    error(403, 'This room does not have the alert scheduler.');
  }
};

/**
 * `alertMsgLater` — schedule one alert.
 *
 * ## What is accepted, and what is refused at the boundary
 *
 * The reference's payload carries twelve fields. Six of them — `sendTxt`, `sendEmail`, `sendTweet`,
 * `sendLaterAsNick`, `sendLaterAsEmail`, `dontCrossPost` — are instructions to downstreams this
 * deployment does not have: SMS, the mailer's alert path, Twitter, and the cross-post fan-out that
 * `linkedRoomAlerts` is itself blocked on. They are left OUT of the schema rather than accepted and
 * dropped, so `z.strictObject` refuses them loudly. Accepting a field nothing reads is how a
 * presenter comes to believe an alert was texted to their members.
 *
 * `sendLaterAs*` deserves its own sentence, because refusing it is a SECURITY decision and not only
 * a scope one: it is the client naming who an alert is from. The sender is taken from the session,
 * server-side, which is the rule this repository records as the 2026-08-07 privilege escalation and
 * will not reintroduce.
 */
export const scheduleAlertLater = command(
  z.strictObject({
    body: z.string().min(1).max(MAX_ALERT_BODY),
    nonTradeAlert: z.boolean(),
    repeat: z.enum(REPEAT_MODES),
    ignoreWeekends: z.boolean(),
    /** An epoch millisecond, because a serialised Date across the wire is a string nobody validates. */
    sendOn: z.number().int().finite()
  }),
  async ({ body, nonTradeAlert, repeat, ignoreWeekends, sendOn }) => {
    ensureDatabase();
    const { locals } = getRequestEvent();
    const user = requireUser(locals);

    // Before the gate, as `postAlert` has it: a non-presenter probing this spends their own budget.
    const limit = consumeRateLimit('alert', user.id);
    if (!limit.allowed) {
      error(
        429,
        `You are posting alerts too quickly. Try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`
      );
    }

    const room = presenterRoom();
    await requireScheduler(room, user.email);

    const scheduledId = scheduleAlert({
      roomShortCode: room,
      senderId: user.id,
      // The SERVER's name for this user, never the client's — see the docblock.
      senderName: user.displayName,
      body,
      nonTrade: nonTradeAlert,
      repeat,
      ignoreWeekends,
      sendOn: new Date(sendOn)
    });

    /*
      The composer's own refusal — *"Please select a date in the future"* — reaching the browser as a
      status rather than as a silent no-op. `scheduleAlert` returns null for exactly this, and the
      store is where it is decided, so a caller cannot skip it.
    */
    if (scheduledId === null) error(400, 'Please select a date in the future.');

    return { id: scheduledId };
  }
);

/**
 * `getScheduledAlerts` — this room's pending alerts, soonest first.
 *
 * A `query` rather than a `command`, so the manage modal refetches it after a removal instead of
 * splicing a local copy — the reference splices (`globals.scheduledAlerts.splice(se, 1)`), and this
 * room's rule after a mutation is to reassign from the SERVER response rather than from the local
 * guess. `sendOn` crosses as an epoch millisecond for the reason the schedule does.
 */
export const listScheduledAlerts = query(async () => {
  ensureDatabase();
  const { locals } = getRequestEvent();
  const user = requireUser(locals);
  const room = presenterRoom();
  await requireScheduler(room, user.email);

  return pendingScheduledAlerts(room).map((row) => ({
    id: row.id,
    senderName: row.senderName,
    body: row.body,
    repeat: row.repeat,
    ignoreWeekends: row.ignoreWeekends,
    sendOn: row.sendOn.getTime()
  }));
});

/**
 * `removeScheduledAlert` — drop one pending alert.
 *
 * **404 and not 403 when the row is not this room's.** The store puts the room in the WHERE, so a
 * presenter of room A asking to delete room B's alert gets the same answer as one asking to delete
 * an id that never existed — which is the only answer that does not confirm the row exists. The same
 * shape `chat-messages.remote.ts` uses for a reply into an unreadable channel.
 */
export const removeScheduledAlert = command(
  z.strictObject({ id: z.number().int().positive() }),
  async ({ id }) => {
    ensureDatabase();
    const { locals } = getRequestEvent();
    const user = requireUser(locals);
    const room = presenterRoom();
    await requireScheduler(room, user.email);

    if (!removeScheduledAlertRow(room, id)) error(404, 'No such scheduled alert.');
  }
);
