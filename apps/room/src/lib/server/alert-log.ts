import { and, asc, desc, eq, gte, inArray, like, lte } from 'drizzle-orm';

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
 * The cap on a server-side advanced search, and it is OURS rather than the capture's.
 *
 * The reference asks its own server (`getAlertsAdvancedSearch`) and the bundle shows only the
 * request, so whatever bound that server applies is uncaptured. A number had to be chosen; this one
 * is stated as a choice instead of being presented as transcribed.
 *
 * 500 because the modal renders every hit in one list with no paging of its own — ten times the
 * fifty a page load carries, and still a list a browser can draw. The count is returned with the
 * rows so a search that reaches it can SAY so; a cap the reader cannot see is the silent wrong
 * answer this whole change exists to remove.
 */
export { ALERT_SEARCH_LIMIT } from '../alert-search-limit.js';
import { ALERT_SEARCH_LIMIT } from '../alert-search-limit.js';

/**
 * `getAlertsAdvancedSearch` — `#alerts-advanced-search-modal`, answered by the DATABASE.
 *
 * ## The defect this closes
 *
 * The modal filtered `data.alerts`, which is `loadAlertPage`'s newest **fifty** rows. Every
 * predicate the reader typed was applied to those fifty and to nothing else, and the date range is
 * what makes it sharp: setting `startDate` to last month searched fifty rows that were all from
 * today and returned nothing at all. Not an error, not an empty-because-nothing-matched — a
 * confident "no results" over a log that had them.
 *
 * `filterAlerts` in `#lib/alerts-advanced-search.js` is unchanged and still applies, for the reason
 * its own docblock gives about the reference filtering the RESULTS: the trader predicate matches on
 * `senderEmailHash`, which is COMPUTED at read time from the sender's address and is not a column,
 * so no SQL can express it. What moves here are the three predicates that ARE columns, and moving
 * them is what makes the set they narrow the whole room rather than one page.
 *
 * ## `like` on the body, and what that is not
 *
 * A substring match, case-insensitive because SQLite's `LIKE` is for ASCII by default — the same
 * comparison `filterAlerts` does with `toLowerCase().includes()`, so a term behaves identically
 * whichever side evaluates it. It is not full-text search and does not pretend to be; `alerts` has
 * no FTS index and adding one is a schema change nobody has asked for.
 *
 * The term is escaped for `%` and `_` before it is wrapped, or a reader searching for a literal
 * percent sign would match every alert in the room and be told that was the answer.
 */
export function searchAlertLog(
  roomShortCode: string,
  criteria: { txt: string; startDate: string; endDate: string; nonTradeAlert: boolean }
) {
  const conditions = [eq(alerts.roomShortCode, roomShortCode)];

  const needle = criteria.txt.trim();
  // `\` first, or it would re-escape the escapes added after it.
  if (needle) {
    const escaped = needle.replace(/\\/g, '\\\\').replace(/[%_]/g, (c) => `\\${c}`);
    conditions.push(like(alerts.body, `%${escaped}%`));
  }

  /*
    `datetime-local` strings, parsed as LOCAL time exactly as `filterAlerts` parses them, so the two
    halves of this search cannot disagree about what "the 3rd" means. An unparseable value is
    IGNORED rather than treated as epoch 0 — the input is free text and a half-typed date must not
    silently become "everything since 1970".
  */
  const start = criteria.startDate ? new Date(criteria.startDate) : null;
  if (start && !Number.isNaN(start.getTime())) conditions.push(gte(alerts.createdAt, start));
  const end = criteria.endDate ? new Date(criteria.endDate) : null;
  if (end && !Number.isNaN(end.getTime())) conditions.push(lte(alerts.createdAt, end));

  // Only when SET. `false` means "do not restrict", not "trade alerts only" — the capture's
  // checkbox has two states and this is the unticked one.
  if (criteria.nonTradeAlert) conditions.push(eq(alerts.nonTrade, true));

  const rows = db
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
    .where(and(...conditions))
    /* Newest first so the LIMIT keeps the NEWEST matches — the same ordering and the same tie-break
       `loadAlertPage` uses, and for the same reason. */
    .orderBy(desc(alerts.createdAt), desc(alerts.id))
    // One over the cap, so "there were more" is known rather than guessed from a full page.
    .limit(ALERT_SEARCH_LIMIT + 1)
    .all();

  const truncated = rows.length > ALERT_SEARCH_LIMIT;
  return {
    truncated,
    alerts: rows.slice(0, ALERT_SEARCH_LIMIT).map(({ senderEmail, reactionsJson, ...alert }) => ({
      ...alert,
      reactions: parseReactions(reactionsJson),
      senderEmailHash: hashEmail(senderEmail)
    }))
  };
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
