import { query } from '$app/server';
import { z } from 'zod';

import { presenterRoom } from '#lib/server/auth.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import { readSessionHistory, type SessionHistoryEntry } from '#lib/server/session-history.js';

/**
 * `getSessionHistory` — the Session History pane's one call.
 *
 * ```js
 * fetchSessionHistory() {                                        // bundle byte 1,145,917
 *   const i = yield this.invokeServerCommand("getSessionHistory", {});
 *   i && i.data && (this.globals.sessionHistory = i.data)
 * }
 * ```
 *
 * **It sends `{}`** — the server knows which room from the session — so this takes no argument
 * either, and the room comes from `locals`. A `roomShortCode` on the arguments would let a presenter
 * of room A read room B's history, which is the 2026-08-07 escalation in a new place.
 *
 * ## A `query` and not a `command`
 *
 * It reads and writes nothing, and the pane calls it twice by design — once from `Load History` on
 * the empty state, once from `Refresh` on the populated one. `command` is for mutations; a `query`
 * is also what lets the pane await a fresh answer without a page navigation.
 *
 * ## PRESENTER-ONLY, on the server
 *
 * The pane lives inside the session-control modal, which is presenter-only in the room — and a
 * hidden control has never been an authorization check here. The history names what presenters have
 * done to the room and when, which is not a member's business, so {@link presenterRoom} makes the
 * role check and the room scope one event.
 *
 * `z.void()` rather than an empty object: this has no argument at all, and giving it one would be
 * inventing a field for a caller to fill in — the same call `refreshRoster` and `clearPresenterColors`
 * make.
 */
export const getSessionHistory = query(z.void(), async (): Promise<SessionHistoryEntry[]> => {
  ensureDatabase();
  return readSessionHistory(presenterRoom());
});
