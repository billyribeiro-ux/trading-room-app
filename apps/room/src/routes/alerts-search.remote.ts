import { query, getRequestEvent } from '$app/server';
import { z } from 'zod';
import { requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import { searchAlertLog } from '#lib/server/alert-log.js';

/**
 * `getAlertsAdvancedSearch` — the advanced search modal, answered by the database.
 *
 * ## Why this exists
 *
 * The modal used to filter `data.alerts`, which is the newest FIFTY rows. Every predicate the
 * reader typed was applied to those fifty, so a date range pointing at last month searched fifty
 * rows from today and reported "no results" — a confident wrong answer over a log that had them.
 * `searchAlertLog` carries the full reasoning and the three predicates that became SQL.
 *
 * ## A `query`, not a `command`
 *
 * It reads and changes nothing, so it is idempotent and safe to re-run — which is also what makes
 * the loading state in `ModalHost` honest rather than decorative, because there is now a real round
 * trip for it to describe.
 *
 * ## Scope and authority
 *
 * The room comes from the SESSION through `requireRoomShortCode`, never from the argument — the same
 * rule every other remote function here follows, and the reason none of them takes a room. There is
 * deliberately no presenter gate: these are the room's alerts, every one of which the load already
 * delivers to every member, so searching further back reaches nothing a member could not already
 * scroll to. `requireUser` refuses an anonymous caller, which is the gate that matters.
 *
 * Stated because the absence of a role check should read as a decision: adding one here would be
 * inventing a restriction the capture does not describe and the data does not need.
 *
 * ## The bounds are on the ARGUMENT, not just the SQL
 *
 * `txt` is capped at 200 characters and the two dates at 40. Neither is a guess about the UI — they
 * are what stops an unbounded string reaching a `LIKE` pattern, which is the one input here that a
 * caller controls and the database has to scan with.
 */
export const searchAlerts = query(
  z.strictObject({
    txt: z.string().max(200),
    /* `datetime-local` values. Bounded as strings and PARSED in `searchAlertLog`, which ignores an
       unparseable one rather than letting it become epoch 0. */
    startDate: z.string().max(40),
    endDate: z.string().max(40),
    nonTradeAlert: z.boolean()
  }),
  async (criteria) => {
    ensureDatabase();
    const { locals } = getRequestEvent();
    requireUser(locals);
    return searchAlertLog(requireRoomShortCode(locals), criteria);
  }
);
