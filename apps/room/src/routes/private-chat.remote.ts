import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { isPresenterRole, requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { MAX_CHAT_LOG_PAGE } from '#lib/server/chat-log.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { users } from '#lib/server/db/schema.js';
import {
  deleteThread,
  insertPrivateMessage,
  loadThread,
  searchThread
} from '#lib/server/private-chat.js';
import { hashEmail } from '#lib/server/connection.js';
import { consumeRateLimit } from '#lib/server/rate-limit.js';
import { publishToUsers } from '#lib/server/room-events.js';

/*
  The private-chat wire: read a thread, send to it, delete it.

  CONVERTED AS A GROUP, ON PURPOSE, and this is the shape the rest of the conversions should take.
  Doing them one action at a time would have produced three files, three copies of the peer-id
  schema, and three chances for the room scope to be written slightly differently. They are one
  feature — they share a peer id, a room, a `privChat` channel and a repository module
  (`#lib/server/private-chat.ts`) — so they are one module, and the things they share are declared
  once. The unit of conversion is the FEATURE, not the call site.

  ALL THREE ARE COMMANDS, INCLUDING THE READ, AND THAT IS THE INTERESTING PART.

  The rule so far: `query` is for reads that are pure, `command` for everything else. `loadThread`
  and `searchThread` are pure SELECTs, so by that rule alone `loadPrivateChatLog` would be a query.
  It is not, and the reason sharpens the rule rather than breaking it.

  A query is CACHED BY ARGUMENT. `log-pages.remote.ts` is safe under that because the client asks
  for each page exactly once — page 3 is requested, merged into component state, and never asked for
  again. This one is the opposite: `switchChatToUser` calls `loadPrivateChatLog(peerId, 0)` EVERY
  time a conversation is opened, with the same argument each time, and the answer REPLACES the held
  log. Its whole job is to be the authoritative, current state of that conversation.

  So the rule, extended: `query` is for a pure read that is also safe to SERVE AGAIN. A read asked
  repeatedly with the same argument, whose freshness is what it is for, is a command — because
  `command` runs every time by construction, and correctness that depends on when a cache entry
  happens to be released is not correctness.

  Nothing here trusts the client for identity. The capture's `sendPrivChat` puts
  `{peerID, msg, n, recvdNick, recvdAvt, recvdPic, recvdIsA}` on the wire — everything after the
  first two is display data about the RECIPIENT supplied by the SENDER. None of it is accepted: the
  row stores ids, and names and avatars are read back from `users` when the thread loads. A client
  that lies about `recvdNick` changes nothing. `z.strictObject` is what makes sending those fields a
  validation error rather than a silently ignored extra key.
*/

/**
 * The other party. `users.id` is an autoincrement primary key, so every real peer is >= 1.
 *
 * Declared once and used by all three, which is the point of converting them together: the previous
 * three actions each parsed this with their own `Number(data.get('peerID') ?? NaN)` and their own
 * `Number.isInteger` check, and three copies of a guard are three things that can drift.
 */
const peerId = z.number().int().positive();

/**
 * The page of thread history.
 *
 * **This is a BOUND THAT DID NOT EXIST, and it is a fix rather than a move.** The action read
 * `Number(data.get('page') ?? 0) || 0` with no upper limit, so a caller could ask for page
 * 10,000,000 and make SQLite walk and discard that many rows — an OFFSET is a scan, which is the
 * exact reasoning that put `MAX_CHAT_LOG_PAGE` on the room log and the alerts log. The private
 * thread was the one log without it. The same constant is reused rather than a second one declared,
 * for the same reason `alert-log.ts` imports `CHAT_LOG_PAGE_SIZE` instead of redeclaring 50.
 *
 * `.min(0)` and not `.min(1)`: unlike the room log, page 0 here is requested through this path —
 * `switchChatToUser` asks for it on every open, because there is no loader that sends it.
 */
const threadPage = z.number().int().min(0).max(MAX_CHAT_LOG_PAGE);

/** `getPCLog {page, peerID}`, and `doPCLogSearch {searchTerm, peerID}` when a term is given. */
export const loadPrivateChatLog = command(
  z.strictObject({
    peerId,
    page: threadPage,
    /*
      A search REPLACES the log rather than paging it, which is why the term and the page are not
      combined below: upstream sends `doPCLogSearch` as a different command entirely, and its result
      is the whole answer. Bounded so the term cannot be a megabyte of pattern.
    */
    searchTerm: z.string().trim().max(200).default('')
  }),
  async ({ peerId: peer, page, searchTerm }) => {
    ensureDatabase();

    const { locals } = getRequestEvent();
    const user = requireUser(locals);
    const room = requireRoomShortCode(locals);

    /*
      Both reads are scoped by `(room, user.id, peer)`, so a caller can only ever read a thread they
      are a party to. The peer id is the ONLY thing taken from the request; the room and the reader
      both come from the session.
    */
    return searchTerm
      ? searchThread(room, user.id, peer, searchTerm)
      : loadThread(room, user.id, peer, page);
  }
);

/**
 * `sendPrivChat(peerID, msg, recvdUser)` — published to BOTH parties.
 *
 * The refusals are `error()` and not a validation failure wherever the STRING is the capture's own,
 * because the client shows `body.message` verbatim. `Chatting with yourself again?` in particular is
 * `bootbox.alert("Chatting with yourself again?")` from the reference and must survive to the pixel;
 * letting the schema reject that case would have replaced it with a generic 400.
 */
export const sendPrivateMessage = command(
  z.strictObject({ peerId, body: z.string() }),
  async ({ peerId: peer, body }) => {
    ensureDatabase();

    const { locals } = getRequestEvent();
    const user = requireUser(locals);
    const room = requireRoomShortCode(locals);

    const text = body.trim();
    if (!text) error(400, 'Empty message.');
    if (peer === user.id) error(400, 'Chatting with yourself again?');

    const recipient = db.select().from(users).where(eq(users.id, peer)).get();
    if (!recipient) error(404, 'No such user.');

    /*
      The same bucket public chat uses. A private message is a message; giving it its own quota
      would let one user spend both budgets at once.
    */
    if (!consumeRateLimit('message', user.id).allowed) {
      error(429, 'You are sending messages too quickly.');
    }

    const row = insertPrivateMessage(room, user.id, peer, text);
    const message = {
      _id: String(row.id),
      t: row.createdAt.getTime(),
      n: user.displayName,
      txt: row.body,
      uid: user.id,
      recvdID: peer,
      /*
        THE HASH, not the address — `avt` is the avatar key. Every sibling in this codebase already
        does it (`chat-messages.remote.ts` sends `senderEmailHash: hashEmail(...)`, both alert
        repositories send `senderAvt: hashEmail(...)`) and the reference's own comparison is
        `hashEmail(user.email) !== e.avt`. This line alone carried the raw address, so a private
        message handed the recipient the sender's email for no reader that wanted it.
      */
      avt: hashEmail(user.email),
      pic: user.avatarUrl,
      isA: isPresenterRole(user.role)
    };

    /*
      Both parties, and ONLY both parties.

      The sender's own copy is how their message reaches their log — the client deliberately inserts
      nothing locally, so losing this publish would make a sent message vanish until a reload. That
      part is the capture's design and is unchanged.

      What changed on 2026-08-19 is the DELIVERY. These were `publishToRoom`, which hands the
      identical object to EVERY listener in the room, and `events.svelte.ts` dropped the ones not
      addressed to it — so every member received every private message in plaintext and their
      browser threw it away. `publishToUsers` addresses them at the hub, where the subscriber map
      knows which connections belong to a person.
    */
    publishToUsers(room, [peer], {
      channel: 'privChat',
      data: { toUserId: peer, fromUserId: user.id, message }
    });
    publishToUsers(room, [user.id], {
      channel: 'privChat',
      data: { toUserId: user.id, fromUserId: user.id, message }
    });

    return message;
  }
);

/** `deletePeerPCLog {peerID}` — the whole conversation, both directions. */
export const deletePrivateChatLog = command(
  z.strictObject({ peerId }),
  async ({ peerId: peer }) => {
    ensureDatabase();

    const { locals } = getRequestEvent();
    const user = requireUser(locals);
    const room = requireRoomShortCode(locals);

    deleteThread(room, user.id, peer);
    /*
      The peer's copy is gone too, so their open tab is now lying to them. Addressed for the same
      reason as the message publishes: who deleted a conversation with whom is not the room's
      business, even though this frame carries no body.
    */
    publishToUsers(room, [peer], {
      channel: 'privChat',
      data: { toUserId: peer, fromUserId: user.id }
    });
  }
);
