import { and, desc, eq } from 'drizzle-orm';

import { db } from './db';
import { messages, users } from './db/schema';
import { hashEmail } from './connection';
import { parseReactions } from './reactions';

/**
 * The chat log read, bounded and paged.
 *
 * ## The defect this closes
 *
 * The page load used to select every row in `messages` for the room — no LIMIT, ordered ascending,
 * `.all()`. Every SSE event calls `invalidateAll()`, so a room with 50,000 messages re-read and
 * re-serialised all 50,000 on every single chat message anybody sent. That is exactly what the
 * root standard names: an unbounded SELECT that grows with usage, whose cost at 10,000 rows nobody
 * asked before writing it.
 *
 * The client-side trim shipped earlier bounds the DOM, not the query. It is the reference's own
 * `trimLogSize` behaviour and does nothing whatsoever about the read.
 *
 * ## Why paging and not a LIMIT
 *
 * `.limit(300)` alone would be WORSE than the bug: history older than 300 messages would silently
 * become unreachable, with no way to ask for it. The reference pages, so this pages.
 *
 * ## Per CHANNEL, because the reference pages per channel
 *
 * `send("getChatLog", {channel: "main", page: 0})`, and again for `offTopic` when the extra column
 * is on. A single global page would starve whichever channel is quieter: fifty messages in a busy
 * `main` would leave `off-topic` with nothing, however much history it has.
 *
 * ## Offset paging, matching `loadThread`
 *
 * `desc(createdAt), desc(id)` then `limit`/`offset`, then reversed into chronological order — the
 * shape `private-chat.ts` already uses here, and the same page model the reference's wire has. It
 * carries the known property of offset paging over a live tail: a message arriving between two
 * page requests can shift the window and re-deliver one row. Upstream has it too. The client
 * merges by identity rather than trusting the boundary, so a repeat is dropped rather than shown
 * twice — see `mergeOlderChatMessages`.
 */

/**
 * `this.chatLogPageSize = 50` — the reference's own constant, from the same globals object as
 * `trimLogSize = 300` (byte 977432).
 *
 * NOT to be confused with that 300. They are different mechanisms that happen to live side by side:
 * this one bounds what the SERVER sends per request, and `trimLogSize` bounds what the client keeps
 * in memory once `preferences.trimChatLogs` is on.
 */
export const CHAT_LOG_PAGE_SIZE = 50;

/**
 * The highest page a request may ask for — 100,000 messages back.
 *
 * A DoS bound, NOT a product limit, and the distinction matters. `OFFSET n` in SQLite is not free:
 * the engine walks and discards those n rows, so an unvalidated page number is an invitation to
 * make one HTTP request scan the whole table. This caps that walk.
 *
 * No legitimate client reaches it. The reader stops asking when a page comes back EMPTY, which
 * happens at the true end of the history, and the reference does the same
 * (`0 == o.length && (this.hasMoreData = !1)`). A room that genuinely holds more than 100,000
 * messages in one channel would need this raised, and that should be a deliberate edit with a
 * measurement behind it rather than a number nobody chose.
 */
export const MAX_CHAT_LOG_PAGE = 2_000;

/**
 * The channels this room renders, and therefore the channels worth reading.
 *
 * `messages.room` is a channel label rather than a foreign key, so an arbitrary string can be
 * written into it. Only these two are ever displayed — `ChatTab` in `#lib/types.js` is a closed union
 * of exactly these — so a row in any other channel is invisible today whatever this returns.
 * Reading only what is rendered is the same fail-closed rule the settings allow-list follows.
 */
export const CHAT_CHANNELS = ['main', 'off-topic'] as const;

export type ChatChannel = (typeof CHAT_CHANNELS)[number];

export function isChatChannel(value: string): value is ChatChannel {
  return (CHAT_CHANNELS as readonly string[]).includes(value);
}

/**
 * One page of one channel, oldest-first.
 *
 * Page 0 is the NEWEST page — the messages a reader sees when the room opens. Page 1 is the fifty
 * before those, and so on backwards, which is the direction the scroll-up gesture asks for.
 */
export function loadChatPage(roomShortCode: string, channel: ChatChannel, page = 0) {
  return (
    db
      .select({
        id: messages.id,
        room: messages.room,
        senderId: messages.senderId,
        body: messages.body,
        isAdmin: messages.isAdmin,
        backgroundColor: messages.backgroundColor,
        fontColor: messages.fontColor,
        answered: messages.answered,
        replyToMessageId: messages.replyToMessageId,
        replyToName: messages.replyToName,
        replyToBody: messages.replyToBody,
        reactionsJson: messages.reactionsJson,
        createdAt: messages.createdAt,
        bodyHtml: messages.bodyHtml,
        senderName: users.displayName,
        senderEmail: users.email,
        senderAvatarUrl: users.avatarUrl,
        senderRole: users.role,
        senderStatus: users.status
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      // `/sess/${sessionID}/chat/${channel}/` — this room's chat, and one channel of it.
      .where(and(eq(messages.roomShortCode, roomShortCode), eq(messages.room, channel)))
      /* Newest first so the LIMIT keeps the newest, with `id` breaking ties: two messages in the same
       millisecond would otherwise page in an order SQLite is free to change between calls, which is
       how a row gets delivered twice or not at all. */
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(CHAT_LOG_PAGE_SIZE)
      .offset(page * CHAT_LOG_PAGE_SIZE)
      .all()
      /* Back into chronological order, because every reader downstream — the renderer, the date
       separators, the autoscroll — assumes oldest-first. `loadThread` does the same. */
      .reverse()
      .map(({ senderEmail, reactionsJson, ...message }) => ({
        ...message,
        reactions: parseReactions(reactionsJson),
        senderEmailHash: hashEmail(senderEmail)
      }))
  );
}

/** Page 0 of every rendered channel, which is what a page load needs. */
export function loadNewestChatPages(roomShortCode: string) {
  return CHAT_CHANNELS.flatMap((channel) => loadChatPage(roomShortCode, channel)).sort(
    /* One array again, chronological across channels. The client filters by channel for display;
       everything else here — the popup, the mention rule, the unread counts — reads the whole set
       and expects it ordered. `getTime()` on the Date the driver already parsed. */
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime()
  );
}
