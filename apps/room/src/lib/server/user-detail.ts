import { and, eq } from 'drizzle-orm';

import type { UserDetail } from '../user-detail-shape';

import { db } from './db';
import { messages, users } from './db/schema';
import { liveConnectionFor, roomRoster } from './room-events';

/*
  The two rows of the user modal that no client has ever been able to fill: Last Login, and the
  address of somebody who is not on the roster.

  ## The gap, measured rather than assumed

  `ModalHost.svelte` has rendered both cells since it was written —
  `{targetUser.loggedIn ? … : 'n/a'}` and `{targetUser.email ?? 'n/a'}`. `loggedIn` had NO producer
  anywhere in the room: one consumer, one type declaration, and nothing that ever assigned it. So
  the cell read `n/a` for everybody, always, on every path. `email` had one producer — `targetFor`,
  which reads a live ROSTER entry — so it filled for somebody standing in the room and read `n/a`
  the moment the modal was opened from a chat message instead.

  ## What the reference does, and why it needed a server at all

  Every `getUserInfo` call site in the bundle passes `socketID` as null except the roster's:

  ```js
  getUserInfo(e, i) { return I(function*(s, r, a = null, l = null, c = !1) {
    a ? (P("getUserInfo socketID was NOT null"), o.socketService.getUserInfo(s, r, a, l, c))
      : (P("getUserInfoDB socketID was null"), o.getUserInfoDB(s, r))
  }).apply(this, arguments) }
  ```

  — bundle byte 1,159,275. A chat message (`doUserInfo(e, i)`, two arguments, byte 1,352,046), the
  followed-users modal (`getUserInfo(e, i, null, null)`, byte 2,356,520) and Random User
  (byte 2,516,476) all take the second branch, which asks the SERVER:
  `serverInvoke("userInfoDB", {uid: e, rid: i})`, and fills `nick` from `userName`, `loggedIn` from
  `lastLogin`, `privData.email` from `email`. The roster is the one caller that passes a live
  `o.socketID` (byte 2,032,939) and gets the socket branch instead.

  So the offline lookup is not a fallback the reference reaches for rarely. It is how the modal is
  filled everywhere except the roster, and this room has never had it.

  ## Two divergences, both deliberate, both stricter than the original

  **The reference caches forever.** `serverInvokeUserInfoDB` memoises per uid in `userInfoDBCache`
  with no invalidation (byte 990,107), so a presenter who opens a member's card twice in a session
  sees the first answer both times. Not copied: this returns the row.

  ## The five System-tab cells, and why only two of them are filled here

  `ModalHost.svelte` renders `targetUser.ip`, `.userAgent`, `.appVersion`, `.streamServer` and
  `.serverId`. Measured 2026-08-31: **none of the five had a producer anywhere in this room.** One
  consumer each, one declaration each on `ModalTargetUser`, and nothing that ever assigned them —
  the same shape as `loggedIn` above, five more times over.

  Two are answered, and the reason is that the server OBSERVES them: `ip` and `userAgent` come from
  the request that opened the SSE stream, which is where the reference's socket branch gets them too
  (`socketService.getUserInfo(uid, rid, socketID, …)`, byte 1,159,275 — an invoke naming a live
  SOCKET, answered by the server holding it; the member's browser is never asked and could not
  answer, since a page cannot learn its own public address).

  Three are NOT, and are left reading `n/a` rather than filled with something unfalsifiable:

    `appVersion`    upstream's `data.cver`. Only the CLIENT knows its build, so it would have to
                    report it — and a member whose browser is misbehaving can report any string,
                    which is precisely the case the cell exists for.
    `streamServer`  the media plane. Blocked on a `STREAM_SERVER_MTX` host, the same blocker
    `serverId`      `TODO.md` rows X, AC and R name.

  `location` (`privData.locStr`, byte 2,061,069) is the sixth and does NOT come from here at all —
  it reaches the modal on the ROSTER row, through `RosterRowForTarget.locStr`, and has been supplied
  since 2026-09-01. This paragraph used to claim it needed a geo-IP service this repository does not
  have; that was wrong, and the correction is at `modal-target.ts`. It is named here only so the next
  reader does not come looking for a producer in this file.

  **The reference decides visibility in the browser.** Its markup gates the whole block on
  `O(17, e.user.hidePrivateInfo ? -1 : 17)` (byte 2,068,096) — a flag the server puts on the payload
  and the component obeys. The data still arrives. Here the caller's authority decides what the
  query RETURNS, so a member gets no address to hide. That is `CLAUDE.md`'s rule and it is the same
  correction `roster-privacy.test.ts` records: a render gate is a decoration over an authority
  decision nobody made.
*/

/*
  The shape is `#lib/user-detail-shape.ts`, declared once and imported by both ends of the round
  trip. It used to be declared here AND in `room/user-detail.ts`, and the two agreed by hand until
  this function started answering two more fields.
*/
export type { UserDetail };

/**
 * Has this account any standing in this room at all?
 *
 * The room owns no membership table — that lives on the controller, per room — so the question is
 * answered from what the room DOES own: presence, and authorship.
 *
 * **Presence** is the live roster, which is the hub's own subscriber map and therefore the server's
 * own fact rather than anything a client said.
 *
 * **Authorship** is a message in this room. It is durable, which presence is not, and it is exactly
 * the case that motivated this module: the presenter is looking at somebody's chat message and
 * wants to know who wrote it. Archived messages COUNT — `archive_id` is not tested — because
 * sweeping a log into the archive does not undo the fact that its author was here.
 *
 * A `LIMIT 1` over `messages_room_sender_idx`, so the cost does not grow with the room's history.
 *
 * What this deliberately does NOT accept: a bare user id. A presenter of room A naming an account
 * that has never been in room A gets nothing, which is the multi-tenant rule this repository exists
 * under. It is deny-by-default: a new way of being "in" a room has to be added here explicitly.
 */
function isKnownInRoom(room: string, userId: number): boolean {
  if (roomRoster(room).some((entry) => entry.id === userId)) return true;
  const authored = db
    .select({ id: messages.id })
    .from(messages)
    .where(and(eq(messages.roomShortCode, room), eq(messages.senderId, userId)))
    .limit(1)
    .all();
  return authored.length > 0;
}

/**
 * The private half of one account's card, for a caller the ROUTE has already established may see it.
 *
 * This function does not check who is asking — `user-detail.remote.ts` does, with `presenterRoom()`,
 * before it is reached. Two checks in two places for one question is the shape of the 2026-08-07
 * escalation; the split here is deliberate and narrow: the route owns "may this CALLER ask", this
 * owns "is this TARGET askable about", and neither can answer the other's question.
 *
 * Null means no — either the account does not exist, or it has no standing in this room. One answer
 * for both, so a refusal cannot be used to test which user ids exist.
 */
export function readUserDetail(room: string, userId: number): UserDetail | null {
  if (!isKnownInRoom(room, userId)) return null;

  const [row] = db
    .select({ email: users.email, lastLoginAt: users.lastLoginAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .all();
  if (!row) return null;

  /*
    THE LIVE HALF, and it is asked LAST on purpose.

    `isKnownInRoom` admits two kinds of target: somebody standing in the room, and somebody who once
    wrote a message here and has since left. The second has a row and no connection, so this is null
    for them — which is the honest answer and is what the reference's own split produces: its DB
    branch carries `privData = {email}` and nothing else (bundle byte 1,159,628), while the address
    and the agent come only from the socket branch.
  */
  const connection = liveConnectionFor(room, userId);

  return {
    email: row.email,
    loggedIn: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
    ip: connection?.address ?? null,
    userAgent: connection?.userAgent ?? null,
    appVersion: connection?.appVersion ?? null,
    streamServer: connection?.streamServer ?? null,
    serverId: connection?.serverId ?? null
  };
}
