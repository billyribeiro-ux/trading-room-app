import { and, desc, eq, like, or } from 'drizzle-orm';
import { db } from './db';
import { privateMessages, users } from './db/schema';
import { hashEmail } from './connection';

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
    /*
      ── A HASH, NEVER THE ADDRESS ────────────────────────────────────────────────────────────

      This read `sender.email` until 2026-08-30, so every page of every thread handed the OTHER
      participant's raw address to the browser that asked for it.

      `private-chat-delivery.test.ts` already records this exact leak and the fix for it — *"the
      same frame also carried `avt: user.email`, the sender's raw address, where every sibling in
      this codebase sends `hashEmail(...)`"* — but its assertion reads ONE file,
      `private-chat.remote.ts`. The live broadcast was fixed; these two read paths were not, and
      nothing looked at them. That contract now covers every producer of `avt`, which is what turns
      a fixed instance into a fixed class.

      `avt` is the AVATAR KEY and nothing else: `hashEmail` is `md5(email.trim().toLowerCase())`,
      which is gravatar's own identifier scheme and what the reference sends. Stated plainly: an MD5
      of an address is not a strong protection and a known address can be confirmed against it. What
      it stops is the plaintext being handed out and forwarded into a third-party image URL — which
      is precisely what the gravatar fallback beside it would have done with the value that was here.
    */
    avt: hashEmail(sender.email),
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

/**
 * `getAllUserPM {peerID}` - EVERY private message one member sent or received in this room.
 *
 * ## What this is, and why it is bounded where the thread reads are not
 *
 * The reference reaches this through `invokeAdminCmd("getAllUserPM", {peerID})` (bundle byte
 * 2,417,900), from a button in the user-info modal gated on `sessData.enablePrivateMessageHistory`.
 * It is a MODERATION read: a presenter looking at one member sees that member's private
 * conversations with everybody, not the presenter's own thread with them.
 *
 * That makes it the widest read in this module by a distance, and it is the only one with a hard
 * cap. `loadThread` is bounded because it pages; this one has no page in the reference at all - the
 * modal asks once and renders the answer. Unbounded, it is a SELECT whose cost grows with every
 * message a busy member ever sent, executed synchronously on a click. `MAX_PEER_HISTORY` is the
 * bound, newest first, and the caller is told when the answer was cut so the modal can say so
 * rather than quietly presenting a truncated history as complete.
 *
 * ## The recipient is read from the ROW here, not computed
 *
 * `loadThread` computes `recvdID` from the pair because it knows both parties. This read spans many
 * conversations, so there is no "other party" to infer - `message.recipientId` is the answer and is
 * used directly. Computing it from the peer would be wrong for exactly the rows that matter: a
 * message from the peer to a third member would come back addressed to the peer.
 *
 * ## Authority is NOT decided here
 *
 * This function answers what it is asked. `getPeerPrivateMessageHistory` in
 * `routes/private-chat.remote.ts` is where the role is checked, on the server, from the session -
 * see the note there for why the entitlement is checked there too and not only in the markup.
 */
export const MAX_PEER_HISTORY = 500;

export function loadPeerHistory(
  room: string,
  peerId: number
): { messages: PrivateChatMessage[]; truncated: boolean } {
  const rows = db
    .select({ message: privateMessages, sender: users })
    .from(privateMessages)
    .innerJoin(users, eq(users.id, privateMessages.senderId))
    .where(
      and(
        eq(privateMessages.roomShortCode, room),
        or(eq(privateMessages.senderId, peerId), eq(privateMessages.recipientId, peerId))
      )
    )
    /*
      Newest first, then reversed - so a member with more than `MAX_PEER_HISTORY` messages loses the
      OLDEST rather than the newest. A moderator looking at a member is looking at what they did
      recently; cutting from the other end would answer the question with the least useful half.
    */
    .orderBy(desc(privateMessages.createdAt), desc(privateMessages.id))
    .limit(MAX_PEER_HISTORY + 1)
    .all();

  const truncated = rows.length > MAX_PEER_HISTORY;
  return {
    messages: rows
      .slice(0, MAX_PEER_HISTORY)
      .reverse()
      .map(({ message, sender }) => toMessage(message, sender, message.recipientId)),
    truncated
  };
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
 *
 * `avt` is the gravatar key — `hashEmail(peer.email)`, never the address itself. It read
 * `peer.email` until 2026-08-30; see `toMessage`.
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
      /* A hash and not the address — see `toMessage` above, and the contract that now covers both. */
      avt: hashEmail(peer.email),
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
