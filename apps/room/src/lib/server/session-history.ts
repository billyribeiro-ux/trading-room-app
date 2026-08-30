import { desc, eq } from 'drizzle-orm';

import { db } from './db/index.js';
import { sessionHistory } from './db/schema.js';

/**
 * What has happened to this room, as the Session History pane shows it — `SC-01`.
 *
 * ## The defect this closes
 *
 * The pane rendered `No session history.` unconditionally, above a `Load History` button with **no
 * `onclick` at all**. Not a handler that did nothing — no handler. `CLAUDE.md` names that shape
 * exactly: a control whose only effect is nothing.
 *
 * ## What is evidence here, and what is this room's decision
 *
 * EVIDENCE — the wire and the row shape. `fetchSessionHistory()` at bundle byte 1,145,917:
 *
 * ```js
 * const i = yield this.invokeServerCommand("getSessionHistory", {});
 * i && i.data && (this.globals.sessionHistory = i.data)
 * ```
 *
 * and the renderer `TDe` at byte 2,146,069 reads three fields per entry: `eventName`, `created`
 * (through Angular's `date:'medium'`) and `eventValue`.
 *
 * DECISION — WHICH events. The reference's server is not in the capture, so which acts it logs and
 * what it writes into `eventValue` for each is unknowable from anything held here. Rather than
 * guess at a vocabulary, this room records the acts it already has a presenter-gated, room-scoped
 * command for — the ones that change the room for everybody and outlive the click:
 *
 * | event | written by |
 * | --- | --- |
 * | `Chat mode changed` | `chat-mode.remote.ts` |
 * | `Session reset` | `session-commands.remote.ts` — soft and hard, distinguished in the value |
 * | `Session opened` | `session-commands.remote.ts` |
 * | `Close message saved` | `session-commands.remote.ts` |
 *
 * The same test `room_state` applies: a fact somebody arriving later has to be able to find. A
 * reaction or a typing signal is momentary and is not here.
 *
 * ## Recording NEVER fails the act it describes
 *
 * {@link recordSessionEvent} is called after the thing it records has already been written and
 * broadcast, and it swallows nothing — it has nothing to swallow, because it is one INSERT with no
 * conditions. What it deliberately is NOT is part of the caller's transaction: a history row that
 * could roll back a chat-mode change would make the log's own failure a room outage, and a log is
 * never worth that. Ordering is the other half of the same rule — the row is written last, so a
 * history entry can only ever describe something that actually happened.
 */
export function recordSessionEvent(room: string, eventName: string, eventValue: string): void {
  db.insert(sessionHistory)
    .values({ roomShortCode: room, eventName, eventValue, createdAt: new Date() })
    .run();
}

/**
 * The most rows this pane will ever render.
 *
 * The reference has no cap: `pt(globals.sessionHistory)` renders whatever its server sent, inside a
 * `list-group` with no scroll container of its own. That is the unbounded read this repository asks
 * about — a room open for a year accumulates every presenter act, and the pane would render all of
 * them into a modal.
 *
 * 100 is far above what a presenter reads in one sitting and far below a modal that takes a second
 * to lay out. NEWEST first, so the cap drops the oldest, which is the right end: the pane is for
 * "what just happened", and a cap that hid today's events to keep last month's would be useless.
 */
export const SESSION_HISTORY_LIMIT = 100;

export interface SessionHistoryEntry {
  readonly id: number;
  readonly eventName: string;
  readonly eventValue: string;
  /** Epoch milliseconds. A `Date` would not survive the remote function's serialisation unchanged. */
  readonly created: number;
}

/**
 * This room's history, newest first.
 *
 * Room-scoped by the caller's SESSION, never by an argument — see `session-history.remote.ts`. The
 * `(room, created_at)` index is what makes the ordering and the limit one range scan rather than a
 * sort over every room's rows.
 */
export function readSessionHistory(room: string): SessionHistoryEntry[] {
  return (
    db
      .select({
        id: sessionHistory.id,
        eventName: sessionHistory.eventName,
        eventValue: sessionHistory.eventValue,
        createdAt: sessionHistory.createdAt
      })
      .from(sessionHistory)
      .where(eq(sessionHistory.roomShortCode, room))
      /* `id` as the tie-break, the same pair `loadAlertPage` and `searchAlertLog` use: two events in
       the same millisecond would otherwise order arbitrarily and could repeat across a refresh. */
      .orderBy(desc(sessionHistory.createdAt), desc(sessionHistory.id))
      .limit(SESSION_HISTORY_LIMIT)
      .all()
      .map(({ createdAt, ...entry }) => ({ ...entry, created: createdAt.getTime() }))
  );
}
