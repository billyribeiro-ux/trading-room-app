import { error } from '@sveltejs/kit';
import { getRequestEvent, query } from '$app/server';
import { z } from 'zod';
import { MAX_CHAT_TAB_NAME } from '#lib/chat-tabs.js';
import { requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import { MAX_CHAT_LOG_PAGE, loadChatPage, searchChatChannel } from '#lib/server/chat-log.js';
import { isMemberChatChannel, memberChatChannels } from '#lib/server/chat-channels.js';
import { loadAlertPage } from '#lib/server/alert-log.js';

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
 * ## The channel is checked against THIS MEMBER's list, not against a constant
 *
 * It used to be `z.custom<ChatChannel>(… isChatChannel …)` over the fixed pair `['main',
 * 'off-topic']`, and that was the whole check because every room had exactly those two.
 * `chatTabsWithBadges` (2026-08-28) lets an owner configure extra channels behind badges, so a name
 * being a channel SOMEWHERE is no longer evidence that this member may read it.
 *
 * The schema therefore accepts a bounded string and the AUTHORISATION happens in the body, against
 * `memberChatChannels` — which resolves the list on the server from the room's configuration and
 * this member's own badges. It has to be there rather than in the schema because it needs the
 * request's user, and a Zod predicate has none.
 *
 * A channel the member may not read is a 403 with the same message a nonexistent one gets, so the
 * refusal does not enumerate the room's private channels.
 */
export const loadOlderChatMessages = query(
  z.strictObject({
    /*
      A bound, not an allow-list — the allow-list is in the body. `MAX_CHAT_TAB_NAME` is the same
      bound the parser applies to an owner-configured name, so a value that could never be a channel
      is refused before anything else runs.
    */
    channel: z.string().min(1).max(MAX_CHAT_TAB_NAME),
    page: pageNumber
  }),
  async ({ channel, page }) => {
    ensureDatabase();

    /*
      Scoped like every other read here: `requireRoomShortCode(locals)` takes the room from the
      SESSION, never from the request. A `roomShortCode` field on this argument would be the
      2026-08-07 privilege escalation again, in a new place.
    */
    const { locals, request } = getRequestEvent();
    const user = requireUser(locals);
    const shortCode = requireRoomShortCode(locals);

    const channels = await memberChatChannels(request, shortCode, user);
    if (!isMemberChatChannel(channels, channel)) error(403, 'No such channel.');

    return loadChatPage(shortCode, channel, page);
  }
);

/**
 * `doChatLogSearch {searchTerm, channel, type:"chat"}` — the whole channel, not the loaded page.
 *
 * ## Why this is a search and not a filter, when the alerts toolbar is the other way round
 *
 * `alert-toolbar-search-scope.ts` argues at length that the ALERTS toolbar should stay a local
 * filter, and the argument turns entirely on a premise that does not hold here: *"a correct search
 * already exists and is one click away"* — the Advanced Search modal, which asks the database. The
 * chat columns had nothing. No field, no filter, and no way to reach a message older than the fifty
 * a page delivers. So the resolution that was right there is not available here, and this is the one
 * upstream chose: byte 1,439,114 sends the term to the server and its handler REPLACES the log with
 * what comes back.
 *
 * ## The channel gate is `loadOlderChatMessages`'s, and that is the point of putting it here
 *
 * A search that reads the table directly would be a second door onto the same rows. Badge channels
 * are visible to some members and not others (`chatTabsWithBadges`, 2026-08-28), so a name being a
 * channel SOMEWHERE is not evidence that this member may read it — and a search is exactly the shape
 * that would make such a leak useful to an attacker, since it takes a term as well as a channel.
 * Same `memberChatChannels` resolution, same `isMemberChatChannel` check, same refusal message so a
 * 403 does not enumerate the room's private channels.
 *
 * ## A `query`, like its neighbours
 *
 * It reads and writes nothing, so it is a `query` — the rule this module's header states. The term
 * is part of the cache key, which is what makes retyping the same search free and is why the term is
 * an argument rather than something the client holds and the server infers.
 *
 * ## The destructive half of the upstream command is NOT here
 *
 * `doChatLogSearch` also carries `del: true` — a bulk delete of everything the term matched. It is
 * refused rather than omitted: a destructive operation whose blast radius is a LIKE pattern the
 * caller typed needs its own authority argument and its own confirmation, and putting it behind this
 * endpoint's flag would mean one door for reading and erasing. See `searchChatChannel`.
 */
export const searchChatMessages = query(
  z.strictObject({
    channel: z.string().min(1).max(MAX_CHAT_TAB_NAME),
    /*
      Bounded at 200 like `searchAlerts`, and trimmed before it is bounded so trailing whitespace
      cannot be used to sit under the limit with a longer term. An empty term returns nothing rather
      than everything — the refusal is in `searchChatChannel`, where the LIKE is built.
    */
    searchTerm: z.string().trim().max(200)
  }),
  async ({ channel, searchTerm }) => {
    ensureDatabase();

    const { locals, request } = getRequestEvent();
    const user = requireUser(locals);
    const shortCode = requireRoomShortCode(locals);

    const channels = await memberChatChannels(request, shortCode, user);
    if (!isMemberChatChannel(channels, channel)) error(403, 'No such channel.');

    return searchChatChannel(shortCode, channel, searchTerm);
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
