import { query } from '$app/server';
import { z } from 'zod';

import { presenterRoom } from '#lib/server/auth.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import { readUserDetail, type UserDetail } from '#lib/server/user-detail.js';

/*
  `userInfoDB` — the offline half of the reference's user lookup, as one presenter-only query.

  `#lib/server/user-detail.ts` carries the evidence for why this exists and what the original does.
  This file is the door, and it decides exactly two things.

  ## PRESENTERS ONLY, and that is stricter than the reference

  Upstream answers everybody and lets the component hide what it was handed
  (`O(17, e.user.hidePrivateInfo ? -1 : 17)`, bundle byte 2,068,096). This room already refuses that
  arrangement for the same two fields on a different wire: `roster-privacy.test.ts` records the
  2026-08-18 defect where `locStr` and `email` were published to every roster subscriber while the
  sidebar politely declined to draw them, and the correction was to filter the WIRE. A second door
  onto the same fields that answered members would reopen it from the other side.

  A member's modal is unchanged by this: those cells already read `n/a` for them and still do.

  ## FOUR FIELDS NOW, AND THE TWO ADDED ON 2026-08-31 SIT INSIDE THE SAME ENVELOPE ON PURPOSE

  `ip` and `userAgent` joined `email` and `loggedIn` here rather than getting a door of their own,
  because they are the same question — *may this caller see another member's private details* — and a
  second door is a second place to get the answer wrong. They are also strictly narrower than their
  neighbours: `email` and `loggedIn` are answered for anyone with STANDING in the room, including
  somebody who left years ago, while `liveConnectionFor` answers only about a connection this room's
  hub is holding right now, and null otherwise. So no account becomes readable that was not already.

  They are the server's own observation of the request that opened the stream, never anything the
  client said about itself — a page cannot learn its own public address, and a `User-Agent` a browser
  reports is a string it chose. `server/user-detail.ts` carries which of the System tab's five cells
  are filled and the measurement refusing the other three.

  ## THE ROOM IS NEVER AN ARGUMENT

  `presenterRoom()` takes it from the session. The reference sends `rid` from
  `globals.sessData.roomID` — a client-held value naming which room to ask about — and a presenter
  of room A could name room B. Here the only argument is which account, and
  `readUserDetail` refuses one with no standing in the room the SESSION says this caller presents.
*/

/**
 * One account's private card fields, or null when this room has nothing to say about them.
 *
 * Null rather than a 404 because the caller is a modal that is ALREADY OPEN: every path that opens
 * it has a name and an avatar in hand, and the two fields this fills are the only ones that would
 * change. Throwing would make an ordinary "we do not know this person" into an error the modal has
 * to catch and decide not to show, which is the same refusal spelled with more moving parts.
 */
export const userDetail = query(
  z.strictObject({ userId: z.number().int().positive() }),
  async ({ userId }): Promise<UserDetail | null> => {
    ensureDatabase();
    return readUserDetail(presenterRoom(), userId);
  }
);
