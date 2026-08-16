import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { db } from './db';
import { alertQuestions, alerts, users } from './db/schema';
import { hashEmail } from './connection';
import { parseReactions } from './reactions';
import { CHAT_LOG_PAGE_SIZE } from './chat-log';

/**
 * The alerts log read, bounded and paged — the same defect and the same cure as the chat log.
 *
 * This selected every alert row for the room until 2026-08-14: no LIMIT, `.all()`, re-read on every
 * `invalidateAll()` and therefore on every SSE event. Chat was paged first because it grows fastest;
 * alerts grow more slowly and without bound, which is the same problem with a longer fuse.
 *
 * ## The page size is the CHAT constant, and that is upstream's doing
 *
 * There is no `alertLogPageSize` anywhere in the bundle. `trimAlertsLog` splices the alerts log down
 * to `globals.chatLogPageSize`, and the arrival handler that reads a page is shared between the two
 * log types — one component, switched on `logType`. So the same fifty applies to both, and importing
 * it here records that rather than declaring a second constant that would silently drift.
 *
 * ## No channel, unlike chat
 *
 * `send("getChatLog", {channel, page})` against `send("getAlertsLog", {page})`. Alerts are one
 * stream per room, so this pages on the room alone.
 */

/** Page 0 is the newest page; page 1 is the fifty before it. Oldest-first, like `loadChatPage`. */
export function loadAlertPage(roomShortCode: string, page = 0) {
  return (
    db
      .select({
        id: alerts.id,
        senderId: alerts.senderId,
        kind: alerts.kind,
        body: alerts.body,
        targetUrl: alerts.targetUrl,
        nonTrade: alerts.nonTrade,
        isAdmin: alerts.isAdmin,
        backgroundColor: alerts.backgroundColor,
        fontColor: alerts.fontColor,
        questionCount: alerts.questionCount,
        questionAnswered: alerts.questionAnswered,
        reactionsJson: alerts.reactionsJson,
        createdAt: alerts.createdAt,
        senderName: users.displayName,
        senderEmail: users.email,
        senderAvatarUrl: users.avatarUrl,
        senderRole: users.role,
        senderStatus: users.status
      })
      .from(alerts)
      .innerJoin(users, eq(alerts.senderId, users.id))
      // `/sess/${sessionID}/alerts/` — this room's alerts.
      .where(eq(alerts.roomShortCode, roomShortCode))
      /* Newest first so the LIMIT keeps the newest, `id` breaking ties so two alerts posted in the
       same millisecond cannot page in an order SQLite is free to change between calls. */
      .orderBy(desc(alerts.createdAt), desc(alerts.id))
      .limit(CHAT_LOG_PAGE_SIZE)
      .offset(page * CHAT_LOG_PAGE_SIZE)
      .all()
      /* Chronological again: the renderer, the date separators and the autoscroll all assume it. */
      .reverse()
      .map(({ senderEmail, reactionsJson, ...alert }) => ({
        ...alert,
        reactions: parseReactions(reactionsJson),
        senderEmailHash: hashEmail(senderEmail)
      }))
  );
}

/**
 * The alert questions for a page of alerts — the THIRD unbounded read in the page load, and the last.
 *
 * `messages` and `alerts` were both `.all()` with no LIMIT until 2026-08-14. `alert_questions` was
 * the same defect in the same load and was missed: every SSE event calls `invalidateAll()`, so a room
 * that had accumulated ten thousand questions re-read and re-serialised all of them — each body, and
 * the name, avatar and role of whoever asked — into the SSR HTML and the `__sveltekit` payload, every
 * time anybody said anything.
 *
 * ## Bounded by the ALERT page, not by a limit of its own
 *
 * A `LIMIT` here would be wrong in the way `chat-log.ts` describes for a bare `.limit(300)`: it would
 * silently drop the questions belonging to an alert that IS on screen. Questions exist only for
 * alerts, and `loadAlertPage` above already returns one page of them — so reading the questions for
 * exactly those alerts bounds this by that page, loses nothing the client can display, and needs no
 * second pagination cursor to be kept in step with the first.
 *
 * Both consumers are satisfied by that scope: the per-alert question counts the page derives, and the
 * list the Q&A modal reads — which is only ever opened FROM one of these alerts.
 *
 * Captured alerts carry NEGATIVE ids and have no rows in this table at all; the page reads their
 * fixture count instead. So they are correctly absent from `alertIds`.
 *
 * ## The room filter stays, beside the id list
 *
 * SCOPED TO THIS ROOM — added 2026-08-14, and it was a cross-tenant leak until then.
 * `alert_questions` is the one room-owned table with NO `room_short_code` column: it reaches its room
 * through `alert_id`. This read had no filter of any kind, so every browser in every room received
 * every alert question in the deployment. What the client chose to RENDER was never the point; the
 * data had already crossed.
 *
 * The ids passed in come from a room-scoped read, so they are already this room's — and the tenancy
 * term still belongs in the statement that reads the rows. An id list is not a substitute for it.
 *
 * An empty page short-circuits rather than generating `IN ()`: a room with no alerts has no question.
 */
export function loadQuestionsForAlerts(roomShortCode: string, alertIds: readonly number[]) {
  if (alertIds.length === 0) return [];

  return (
    db
      .select({
        id: alertQuestions.id,
        alertId: alertQuestions.alertId,
        senderId: alertQuestions.senderId,
        body: alertQuestions.body,
        answeredAt: alertQuestions.answeredAt,
        createdAt: alertQuestions.createdAt,
        senderName: users.displayName,
        senderEmail: users.email,
        senderAvatarUrl: users.avatarUrl,
        /*
        Drives `msg-box-adm` / the reversed layout on each Q&A entry. The captured reader-side modal
        renders another reader's question as plain `msg-box pb-1` and the presenter's answer as
        `msg-box pb-1 msg-box-adm`, so this follows the SENDER, not the viewer.
      */
        senderRole: users.role
      })
      .from(alertQuestions)
      /*
      Joining through `alerts` applies the room the same way every other read here does. The
      alternative — adding `room_short_code` to the table — would denormalise a fact this schema
      already derives, and would need a backfill this join makes unnecessary.
    */
      .innerJoin(alerts, eq(alerts.id, alertQuestions.alertId))
      .innerJoin(users, eq(alertQuestions.senderId, users.id))
      .where(
        and(eq(alerts.roomShortCode, roomShortCode), inArray(alertQuestions.alertId, alertIds))
      )
      .orderBy(asc(alertQuestions.createdAt), asc(alertQuestions.id))
      .all()
      .map(({ senderEmail, ...question }) => ({
        ...question,
        senderEmailHash: hashEmail(senderEmail)
      }))
  );
}
