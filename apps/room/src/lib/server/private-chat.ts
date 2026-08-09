import { and, desc, eq, like, or } from 'drizzle-orm';
import { db } from './db';
import { privateMessages, users } from './db/schema';

/**
 * The private-chat store, shaped by the capture's four server commands:
 *
 *   getAllPCLogs                          -> every conversation, for the tab strip
 *   getPCLog      {page, peerID}          -> one thread, paged
 *   deletePeerPCLog {peerID}              -> drop a whole conversation
 *   doPCLogSearch {searchTerm, peerID}    -> search within a thread
 */

/** `chatLogPageSize = 50` in the capture's globals. */
export const PC_LOG_PAGE_SIZE = 50;

/**
 * The conversation two users share, independent of who spoke first.
 *
 * Sorted numerically, not lexically: `[9, 10]` sorted as strings is `["10","9"]`, which would give
 * one pair two different keys depending on direction and split a thread in half.
 */
export function pairKeyFor(a: number, b: number) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/**
 * A message in the shape the capture's client expects.
 *
 * `uid` is the sender and `recvdID` the recipient, because that is what the receiving code reads:
 * `isMine = te.uid == myUserID` then `peer = isMine ? te.recvdID : te.uid`. `isMine` is deliberately
 * NOT stored - it is a property of who is looking, so each side computes it.
 */
export type PrivateChatMessage = {
  _id: string;
  t: number;
  n: string;
  txt: string;
  uid: number;
  recvdID: number;
  avt: string;
  pic: string;
  isA: boolean;
};

type Row = typeof privateMessages.$inferSelect;
type UserRow = typeof users.$inferSelect;

function toMessage(row: Row, sender: UserRow, recipientId: number): PrivateChatMessage {
  return {
    _id: String(row.id),
    t: row.createdAt.getTime(),
    n: sender.displayName,
    txt: row.body,
    uid: row.senderId,
    recvdID: recipientId,
    avt: sender.email,
    pic: sender.avatarUrl,
    isA: sender.role === 'staff' || sender.role === 'admin'
  };
}

/** One page of a thread, oldest-first for rendering - the capture pages backwards from newest. */
export function loadThread(
  room: string,
  userId: number,
  peerId: number,
  page = 0
): PrivateChatMessage[] {
  const rows = db
    .select({ message: privateMessages, sender: users })
    .from(privateMessages)
    .innerJoin(users, eq(users.id, privateMessages.senderId))
    .where(
      and(
        eq(privateMessages.roomShortCode, room),
        eq(privateMessages.pairKey, pairKeyFor(userId, peerId))
      )
    )
    .orderBy(desc(privateMessages.createdAt), desc(privateMessages.id))
    .limit(PC_LOG_PAGE_SIZE)
    .offset(page * PC_LOG_PAGE_SIZE)
    .all();

  return rows
    .reverse()
    .map(({ message, sender }) =>
      toMessage(message, sender, message.senderId === userId ? peerId : userId)
    );
}

/** `doPCLogSearch` - within one thread, never across every conversation. */
export function searchThread(
  room: string,
  userId: number,
  peerId: number,
  term: string
): PrivateChatMessage[] {
  const needle = term.trim();
  if (!needle) return [];
  const rows = db
    .select({ message: privateMessages, sender: users })
    .from(privateMessages)
    .innerJoin(users, eq(users.id, privateMessages.senderId))
    .where(
      and(
        eq(privateMessages.roomShortCode, room),
        eq(privateMessages.pairKey, pairKeyFor(userId, peerId)),
        // `%` and `_` are wildcards in LIKE, so a search for "100%" would match far too much.
        like(privateMessages.body, `%${needle.replace(/[%_\\]/g, '\\$&')}%`)
      )
    )
    .orderBy(desc(privateMessages.createdAt))
    .limit(PC_LOG_PAGE_SIZE)
    .all();

  return rows
    .reverse()
    .map(({ message, sender }) =>
      toMessage(message, sender, message.senderId === userId ? peerId : userId)
    );
}

/**
 * `getAllPCLogs` - one tab per conversation this user is part of.
 *
 * The tab shape is the capture's:
 * `{name, uid, avt, pic, unread, isA, online}`. `online` is filled in by the client from the
 * roster (`checkUserOnlineStatus`), so it is false here rather than guessed.
 */
export type PrivateChatTab = {
  name: string;
  uid: number;
  avt: string;
  pic: string;
  unread: number;
  isA: boolean;
  online: boolean;
  lastAt: number;
};

export function loadConversations(room: string, userId: number): PrivateChatTab[] {
  const rows = db
    .select({ message: privateMessages })
    .from(privateMessages)
    .where(
      and(
        eq(privateMessages.roomShortCode, room),
        or(eq(privateMessages.senderId, userId), eq(privateMessages.recipientId, userId))
      )
    )
    .orderBy(desc(privateMessages.createdAt))
    .all();

  const seen = new Map<number, number>();
  for (const { message } of rows) {
    const peerId = message.senderId === userId ? message.recipientId : message.senderId;
    if (!seen.has(peerId)) seen.set(peerId, message.createdAt.getTime());
  }
  if (seen.size === 0) return [];

  const peers = db.select().from(users).all();
  const tabs: PrivateChatTab[] = [];
  for (const [peerId, lastAt] of seen) {
    const peer = peers.find((candidate) => candidate.id === peerId);
    if (!peer) continue;
    tabs.push({
      name: peer.displayName,
      uid: peer.id,
      avt: peer.email,
      pic: peer.avatarUrl,
      unread: 0,
      isA: peer.role === 'staff' || peer.role === 'admin',
      online: false,
      lastAt
    });
  }
  // Oldest conversation first: `newMessage()` splices an existing tab out and pushes it to the end,
  // so the most recently active tab sits last.
  return tabs.sort((a, b) => a.lastAt - b.lastAt);
}

export function insertPrivateMessage(
  room: string,
  senderId: number,
  recipientId: number,
  body: string
) {
  return db
    .insert(privateMessages)
    .values({
      roomShortCode: room,
      pairKey: pairKeyFor(senderId, recipientId),
      senderId,
      recipientId,
      body,
      createdAt: new Date()
    })
    .returning()
    .get();
}

/** `deletePeerPCLog` - both directions, because the thread is the pair, not one side of it. */
export function deleteThread(room: string, userId: number, peerId: number) {
  return db
    .delete(privateMessages)
    .where(
      and(
        eq(privateMessages.roomShortCode, room),
        eq(privateMessages.pairKey, pairKeyFor(userId, peerId))
      )
    )
    .run();
}
