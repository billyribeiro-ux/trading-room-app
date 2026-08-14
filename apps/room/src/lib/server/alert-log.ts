import { desc, eq } from 'drizzle-orm';

import { db } from './db';
import { alerts, users } from './db/schema';
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
