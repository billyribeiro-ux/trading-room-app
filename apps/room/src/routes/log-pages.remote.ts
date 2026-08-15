import { getRequestEvent, query } from '$app/server';
import { z } from 'zod';
import { requireRoomShortCode, requireUser } from '$lib/server/auth';
import { ensureDatabase } from '$lib/server/db';
import {
  MAX_CHAT_LOG_PAGE,
  isChatChannel,
  loadChatPage,
  type ChatChannel
} from '$lib/server/chat-log';
import { loadAlertPage } from '$lib/server/alert-log';

/*
  One page older of chat, and one page older of alerts. `loadMoreLogs({type, channel, page})`
  upstream, which becomes `getChatLog {channel, page}` and `getAlertsLog {page}` on the wire.

  THESE ARE THE FIRST `query` FUNCTIONS HERE, AND THE FIRST READS THAT EARN ONE.

  The previous conversion (`mobile-pin.remote.ts`) is a read that had to be a `command`, because it
  MINTS a pin and `query` caches. These do not mint. `loadChatPage` and `loadAlertPage` are two
  SELECTs with a LIMIT and an OFFSET and no write anywhere on the path, which is the whole test:
  `query` is for reads that are pure, and these are.

  WHY THE CACHE IS SAFE HERE, WHICH IS THE QUESTION PAGINATION ALWAYS RAISES. A query's cache key is
  its serialised argument, so page 2 and page 3 are separate entries and cannot be confused for one
  another. Two things then make staleness a non-issue rather than a risk taken:

  1. The client asks for each page exactly ONCE. `alertsPage` / `chatPage[channel]` only advance on a
     non-empty answer, so a page is never re-requested with the same argument.
  2. Every page it receives is already merged into `olderAlerts` / `olderChatMessages` and held in
     component state for the life of the page — `+page.server.ts` says so where it explains why
     `invalidateAll()` cannot disturb them. The client has been caching these pages permanently
     since long before this conversion. A per-request query cache, released as soon as nothing holds
     the resource, is strictly SHORTER-lived than the state it feeds.

  THE EMPTY ANSWER IS THE TERMINATOR and is preserved exactly: upstream reads
  `0 == o.length && (this.hasMoreData = !1)`. The server never says how much history remains and
  does not need to, because running out is something you discover by asking once too often. Returning
  an empty array is therefore a SUCCESS, not an error, and must never become a 404.

  HOW A FAILURE IS HANDLED AT THE CALL SITES, because both of them `catch` and return and that looks
  like the swallowed `.catch(() => {})` this repository forbids. It is not, and the distinction is
  the whole reason it is written down here rather than trusted to a reader:

  - `hasMoreData` is deliberately left TRUE, so the next scroll to the top asks again. The form
    actions these replaced returned early on a non-success in exactly the same way, and upstream has
    no error state for a failed page — a toast at the top of the log every time the network hiccups
    would be a change to what the room shows, not a fix.
  - The loading flag is cleared in a `finally`, and that is the part that must never be moved into
    the success path. Without it a single failure leaves `alertsLoadingMore` / `chatLoadingMore`
    stuck on, `shouldLoadOlderMessages` refuses forever, and the pane silently stops paging — a
    dead scrollback that throws nothing and logs nothing. `log-pages-remote-contract.test.ts` pins
    the `finally`, and that assertion has been seen red.
*/

/**
 * The page bound, shared by both.
 *
 * Page 0 is the newest page and the route's `load` already sent it, so asking for it here would
 * duplicate what the client holds rather than reach further back. Bounded at the top too: an
 * unvalidated OFFSET lets a caller ask for page 10,000,000 and make SQLite count its way there,
 * which is a scan with a request attached.
 *
 * This was two hand-written `Number.isInteger(page) || page < 1 || page > MAX` guards, one per
 * action. It is now one schema used twice, which is the point of the boundary.
 */
const pageNumber = z.number().int().min(1).max(MAX_CHAT_LOG_PAGE);

/**
 * `getChatLog {channel, page}` — one page older for one channel.
 *
 * `z.custom<ChatChannel>` rather than `z.string()`, so the validated value NARROWS to the union
 * `loadChatPage` requires instead of being cast at the call. `isChatChannel` is the same deny-by-
 * default predicate the action used; the channel list is fixed by the room, never by the request.
 */
export const loadOlderChatMessages = query(
  z.strictObject({
    /*
      The `typeof` is not redundant. `z.custom` hands its predicate `unknown` — the argument comes
      off the wire and could be a number, an object, anything — while `isChatChannel` is declared
      over `string`. Passing it bare type-errors, and casting the error away would mean handing a
      non-string to `.includes` and trusting the result.
    */
    channel: z.custom<ChatChannel>((value) => typeof value === 'string' && isChatChannel(value), {
      message: 'No such channel.'
    }),
    page: pageNumber
  }),
  async ({ channel, page }) => {
    ensureDatabase();

    /*
      Scoped like every other read here: `requireRoomShortCode(locals)` takes the room from the
      SESSION, never from the request. A `roomShortCode` field on this argument would be the
      2026-08-07 privilege escalation again, in a new place.
    */
    const { locals } = getRequestEvent();
    requireUser(locals);

    return loadChatPage(requireRoomShortCode(locals), channel, page);
  }
);

/**
 * `getAlertsLog {page}` — the sibling, minus the channel.
 *
 * Alerts are one stream per room, so upstream's command carries a page and nothing else.
 */
export const loadOlderAlerts = query(pageNumber, async (page) => {
  ensureDatabase();

  const { locals } = getRequestEvent();
  requireUser(locals);

  return loadAlertPage(requireRoomShortCode(locals), page);
});
