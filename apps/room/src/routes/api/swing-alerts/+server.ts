import { error, json } from '@sveltejs/kit';
import { requireRoomShortCode, requireUser } from '$lib/server/auth';
import { ensureDatabase } from '$lib/server/db';
import { readRoomConfig } from '$lib/server/room-config-client';
import { getSwingAlerts } from '$lib/server/swing-alerts-repository';
import { swingAlertsLogDaysSchema } from '$lib/swing-alerts-command';
import { swingAlertsTabVisible } from '$lib/swing-alerts';
import type { RequestHandler } from './$types';

/**
 * `getSwingAlertsLog` — one room's swing log for a window of days.
 *
 * ## Why a GET route and not a form action
 *
 * It changes nothing. Going through a form action would mean `invalidateAll()` on every change of
 * the months select, re-running every load function on the page — the chat log, the alerts log, the
 * roster, the room configuration — to answer a question about one table. `/api/notes/[noteId]/versions`
 * exists for exactly this reason and this follows it.
 *
 * ## What is NOT a parameter
 *
 * The room. The reference sends `{ sessionID, days }` and takes `sessionID` from
 * `sessData.linkedRoomSwingAlertsOther` when that is set, which lets one room display another's
 * log. Here the room comes from the SESSION row, never from the request: a client that can name the
 * room it reads is a client that can read any room. See the note on `hasSwingTradeAlerts` in
 * `room-config-client.ts` for what it would take to support the linked-room case safely.
 *
 * ## Gated twice, like the mutations
 *
 * The entitlement is re-checked here, so a room without the feature answers 404 for the log as well
 * as for the writes. `days` is bounded by the schema — the select offers at most 20 months and
 * `30 * 20` is 600 — so a hand-edited query string cannot ask for an unbounded scan.
 */
export const GET: RequestHandler = async ({ request, locals, url }) => {
  ensureDatabase();
  const user = requireUser(locals);
  const room = requireRoomShortCode(locals);

  const { settings } = await readRoomConfig(request, room, user.email);
  if (!swingAlertsTabVisible(settings)) {
    error(404, 'Swing Trade Alerts are not enabled for this room.');
  }

  const days = swingAlertsLogDaysSchema.safeParse(Number(url.searchParams.get('days')));
  if (!days.success) error(400, 'A valid window in days is required.');

  return json(getSwingAlerts(room, days.data, new Date()));
};
