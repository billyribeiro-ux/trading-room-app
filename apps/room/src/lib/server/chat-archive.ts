import { and, desc, eq, isNull, lt } from 'drizzle-orm';
import { db } from './db/index.js';
import { chatArchives, messages } from './db/schema.js';

/**
 * `archiveLogs` / `getArchiveList` / `unarchiveLogs` — the chat half.
 *
 * ## The capture, read whole (bundle byte 1,444,182)
 *
 * `archiveOptions()` is a four-button dialog titled "Archive Chat Messages". Two of the four send:
 *
 * ```js
 * all:       confirm("Are you sure you want to archive the chats for everyone?")
 *              -> archiveChatDate(new Date)
 * dateRange: const o = new Date($("#date-archive-chat").val());
 *            if (isNaN(o.getTime())) return bootbox.alert("Please select a date."), !1;
 *            confirm("Are you sure you want to archive the chats older than selected date?")
 *              -> archiveChatDate(o)
 * ```
 *
 * with `archiveChatDate(e)` sending `{type:"chat", date:e, channel:this.channel}`. **"Archive All"
 * is not a second operation** — it passes `new Date()`, everything older than now — so one
 * predicate serves both buttons and `olderThan` is the sweep's only parameter.
 *
 * The browser is `app-chat-logs-modal` at byte 2,304,726: `loadLogs()` calls
 * `getArchiveList {type:"chat"}` and puts the answer in `logDates`, and `unarchiveLog()` confirms
 * *"Are you sure you want to unarchive (restore) this chatlog?"* then sends
 * `unarchiveLogs {type:"chat", roomID, archiveID}` and alerts "Chatlog restored".
 *
 * ## The fourth button is NOT built, and that is a decision rather than a gap
 *
 * `Delete Searched` (`btn btn-danger`) confirms *"Are you sure you want to DELETE the searched
 * results in chat for everyone?"* and calls `doSearchSubmit(true)` — the `del:true` flag on
 * `doChatLogSearch`. `chat-log.ts` already records why that stays out: a destructive operation whose
 * blast radius is defined by a LIKE pattern the caller typed needs its own authority argument and
 * its own confirmation flow, and it is its own row on the missing-command census. Archiving is
 * REVERSIBLE; that is not, and putting both behind one surface would blur the difference at exactly
 * the moment a presenter is deciding.
 *
 * ## `roomID` on the unarchive send is NOT reproduced
 *
 * Upstream sends `{type, roomID, archiveID}` and takes `roomID` from `globals.sessData.roomID` — a
 * client-held value naming which room to act on. This room takes the room from the SESSION and the
 * archive id is checked against it, so a presenter of room A naming room B's archive matches zero
 * rows. That is the 2026-08-07 rule, and it is why the argument is one integer.
 */

/**
 * What the archive browser needs to render itself: the archives, and the channels it may sweep.
 *
 * ## The channel list is SERVER-OWNED, and that is a deliberate improvement on the reference
 *
 * Upstream's dialog can only ever archive `this.channel` — the column whose toolbar it was opened
 * from — because it is a per-column control. This room's archive browser is a room-level modal, so
 * it has to name a channel, and the only two honest ways to get one are to guess `'main'` or to ask
 * the server. Guessing is a lie in any room that configured a second column.
 *
 * So the list comes from `memberChatChannels`, the same allow-list the sweep itself is checked
 * against — which means the picker cannot offer a channel the sweep would then refuse, and a badge
 * channel this presenter does not hold is absent from both.
 */
export interface ChatArchiveBrowser {
  readonly archives: readonly ChatArchiveView[];
  readonly channels: readonly string[];
}

/** One entry of the archive browser. Deliberately not the messages — those stay where they are. */
export interface ChatArchiveView {
  readonly id: number;
  readonly channel: string;
  readonly olderThan: number;
  readonly archivedAt: number;
  readonly messageCount: number;
}

/**
 * One message of an archived log, as the viewer reads it.
 *
 * NARROWER than a live message on purpose. A live one carries reactions, reply context, colours,
 * `bodyHtml` and the sender's avatar hash because the room renders all of it; an archived log is
 * read-only history where nothing can be reacted to or replied to, so the rest would be fields with
 * no consumer — and one of them, the avatar hash, is derived from an address, so the narrow
 * projection is also the smaller disclosure.
 */
export interface ChatArchiveMessage {
  readonly id: number;
  readonly senderName: string;
  readonly body: string;
  readonly isAdmin: boolean;
  readonly createdAt: Date;
}

/** One archived log, opened. The archive's own row travels with it so the header can name it. */
export interface ChatArchiveLog {
  readonly archive: ChatArchiveView;
  readonly messages: readonly ChatArchiveMessage[];
  /** The log is longer than the read limit. The viewer says so rather than hiding it. */
  readonly truncated: boolean;
}

/**
 * The most archives this room will list for one room.
 *
 * The reference has no limit — `logDates` is whatever its server answers and the modal scrolls. An
 * archive is created by hand, so this is not a list that grows on its own; the cap is here because
 * "grows only when somebody clicks" is not the same as bounded, and a read path with no ceiling is
 * the shape this repository asks about at 10,000 rows. Newest first, so the cap drops the oldest.
 */
export const ARCHIVE_LIST_LIMIT = 200;

export function listChatArchivesFor(room: string): ChatArchiveView[] {
  return db
    .select({
      id: chatArchives.id,
      channel: chatArchives.channel,
      olderThan: chatArchives.olderThan,
      archivedAt: chatArchives.archivedAt,
      messageCount: chatArchives.messageCount
    })
    .from(chatArchives)
    .where(eq(chatArchives.roomShortCode, room))
    .orderBy(desc(chatArchives.archivedAt), desc(chatArchives.id))
    .limit(ARCHIVE_LIST_LIMIT)
    .all()
    .map((row) => ({
      ...row,
      olderThan: row.olderThan.getTime(),
      archivedAt: row.archivedAt.getTime()
    }));
}

/**
 * ONE archive of this room, by id — or `null`, which the caller turns into a 404.
 *
 * The room is in the predicate rather than checked afterwards, so "not this room's" and "no longer
 * there" are the SAME answer and the refusal cannot be used to ask whether a given archive id exists
 * somewhere else. That is the same rule `chat-channels.ts` states for badge channels: a thing this
 * account cannot see must be indistinguishable from a thing that was never there.
 *
 * A primary-key read, so no limit and no order — the shape the list's cap exists for does not arise.
 */
export function chatArchiveById(room: string, archiveId: number): ChatArchiveView | null {
  const row = db
    .select({
      id: chatArchives.id,
      channel: chatArchives.channel,
      olderThan: chatArchives.olderThan,
      archivedAt: chatArchives.archivedAt,
      messageCount: chatArchives.messageCount
    })
    .from(chatArchives)
    .where(and(eq(chatArchives.id, archiveId), eq(chatArchives.roomShortCode, room)))
    .get();
  if (!row) return null;
  return { ...row, olderThan: row.olderThan.getTime(), archivedAt: row.archivedAt.getTime() };
}

/**
 * Sweep one channel's messages older than a moment into a new archive.
 *
 * ## Order, and why the count is taken from the UPDATE rather than a prior SELECT
 *
 * The archive row is inserted first, because the messages need something to point at. The stamp
 * then runs as a single conditional `UPDATE … WHERE … RETURNING`, and `messageCount` is the length
 * of what it returned.
 *
 * A `SELECT count(*)` before the update would be a TOCTOU: a message posted between the two lands
 * in the sweep and is not in the count, so the browser offers to restore forty when it holds
 * forty-one. This repository refuses select-then-write by name, and the counted-rows form removes
 * the window entirely rather than narrowing it.
 *
 * ## An empty sweep is REFUSED, not recorded
 *
 * Zero rows means the presenter archived nothing — an older-than date before the room's first
 * message, most likely. Writing the archive anyway would put an empty entry in the browser that
 * restores nothing, and the honest answer is that the operation did not happen. The caller turns
 * this into a message; the row is removed so no dangling archive survives.
 */
export function archiveChatChannel(
  room: string,
  channel: string,
  olderThan: Date,
  archivedByUserId: number
): { archiveId: number; messageCount: number } | null {
  const archive = db
    .insert(chatArchives)
    .values({
      roomShortCode: room,
      channel,
      olderThan,
      archivedAt: new Date(),
      archivedByUserId,
      messageCount: 0
    })
    .returning({ id: chatArchives.id })
    .get();

  const swept = db
    .update(messages)
    .set({ archiveId: archive.id })
    .where(
      and(
        eq(messages.roomShortCode, room),
        eq(messages.room, channel),
        /* Only LIVE rows: a message already in an older archive stays in the one it is in. */
        isNull(messages.archiveId),
        lt(messages.createdAt, olderThan)
      )
    )
    .returning({ id: messages.id })
    .all();

  if (swept.length === 0) {
    db.delete(chatArchives).where(eq(chatArchives.id, archive.id)).run();
    return null;
  }

  db.update(chatArchives)
    .set({ messageCount: swept.length })
    .where(eq(chatArchives.id, archive.id))
    .run();

  return { archiveId: archive.id, messageCount: swept.length };
}

/**
 * Put one archive back into the live log.
 *
 * Scoped by room in the same `WHERE` as the id, so an archive id belonging to another room matches
 * zero rows and the caller gets a 404 rather than a silent success — the same shape the per-member
 * notes delete uses, for the same reason.
 *
 * The archive ROW is deleted rather than kept as an empty shell. It exists to name a set of
 * messages; once they are live again it names nothing, and a browser listing restorable archives
 * that restore nothing is the inert-control shape this repository refuses.
 */
export function unarchiveChatLog(room: string, archiveId: number): number | null {
  const archive = db
    .select({ id: chatArchives.id })
    .from(chatArchives)
    .where(and(eq(chatArchives.id, archiveId), eq(chatArchives.roomShortCode, room)))
    .get();
  if (!archive) return null;

  const restored = db
    .update(messages)
    .set({ archiveId: null })
    .where(and(eq(messages.archiveId, archiveId), eq(messages.roomShortCode, room)))
    .returning({ id: messages.id })
    .all();

  db.delete(chatArchives).where(eq(chatArchives.id, archiveId)).run();
  return restored.length;
}
