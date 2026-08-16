import { error, json } from '@sveltejs/kit';
import { requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import { readRoomConfig } from '#lib/server/room-config-client.js';
import { getDayTradeAlerts } from '#lib/server/day-trade-alerts-repository.js';
import { dayTradeAlertsLogDaysSchema } from '#lib/day-trade-alerts-command.js';
import { dayTradeAlertsTabVisible } from '#lib/day-trade-alerts.js';
import type { RequestHandler } from './$types';

/**
 * `getDayTradeAlertsLog` — one room's day trade log for a window of days.
 *
 * ## Why a GET route and not a form action
 *
 * It changes nothing. Going through a form action would mean `invalidateAll()` on every change of
 * the months select, re-running every load function on the page — the chat log, the alerts log, the
 * roster, the room configuration — to answer a question about one table. `/api/swing-alerts` is the
 * same route for the sibling feature and this follows it.
 *
 * ## What is NOT a parameter
 *
 * The room. The reference sends `{ sessionID, days }` and takes `sessionID` from
 * `sessData.linkedRoomDayTradeAlertsOther` when that is set (built by the template literal
 * `` `linkedRoom${e}AlertsOther` `` at byte 1,993,783, and again at 1,010,164 on the initial load),
 * which lets one room display another's log. Here the room comes from the SESSION row, never from
 * the request: a client that can name the room it reads is a client that can read any room. That
 * setting is deliberately not carried at all — see the note on `hasDayTradeAlerts` in
 * `room-config-client.ts` for what it would take to support the linked-room case safely.
 *
 * ## Gated twice, like the mutations
 *
 * The entitlement is re-checked here, so a room without the feature answers 404 for the log as well
 * as for the writes. `days` is bounded by the schema — the select offers at most 15 months and
 * `4 * 15 * 7` is 420 — so a hand-edited query string cannot ask for an unbounded scan.
 */
export const GET: RequestHandler = async ({ request, locals, url }) => {
  ensureDatabase();
  const user = requireUser(locals);
  const room = requireRoomShortCode(locals);

  const { settings } = await readRoomConfig(request, room, user.email);
  if (!dayTradeAlertsTabVisible(settings)) {
    error(404, 'Day Trade Alerts are not enabled for this room.');
  }

  const days = dayTradeAlertsLogDaysSchema.safeParse(Number(url.searchParams.get('days')));
  if (!days.success) error(400, 'A valid window in days is required.');

  return json(getDayTradeAlerts(room, days.data, new Date()));
};
