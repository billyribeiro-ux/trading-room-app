import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  CHAT_CHANNELS,
  CHAT_LOG_PAGE_SIZE,
  MAX_CHAT_LOG_PAGE,
  isChatChannel
} from './server/chat-log';

/*
  The chat log read is BOUNDED, and the history it no longer sends is still reachable.

  The defect, recorded as row Z: the page load selected every row in `messages` for the room — no
  LIMIT, `.all()` — and every SSE event calls `invalidateAll()`. A room with 50,000 messages re-read
  and re-serialised all 50,000 every time anybody said anything.

  The fix is a feature, not a limit clause, and this file is here because the difference is easy to
  lose later. `.limit(300)` alone would be WORSE than the bug: it would silently make older history
  unreachable, with nothing to say so. So the assertions below come in pairs — the read is bounded,
  AND there is a way to ask for what it left out.
*/

const SERVER = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
const PAGE = readFileSync(new URL('./room/feed-scroll.ts', import.meta.url), 'utf8');
/*
  Added 2026-08-15: the two paging ACTIONS became remote `query` functions and moved out of
  `+page.server.ts`. Every assertion below that named an action was re-pointed here in the same
  commit rather than deleted — an extraction that leaves them behind turns `not.toContain` guards
  green at the exact moment they stop guarding, which is the failure this suite has already shipped
  once (see `source-size-contract.test.ts`).
*/
const REMOTE = readFileSync(new URL('../routes/log-pages.remote.ts', import.meta.url), 'utf8');
const CHAT_LOG = readFileSync(new URL('./server/chat-log.ts', import.meta.url), 'utf8');
const ALERT_LOG = readFileSync(new URL('./server/alert-log.ts', import.meta.url), 'utf8');
const DB = readFileSync(new URL('./server/db/index.ts', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const serverCode = stripComments(SERVER);
/*
  The read pipelines left the page for `RoomFeeds` in Phase 5 slice 9. Read as their own source, so
  an assertion about what a pane renders cannot pass against a file that no longer builds it.
*/
const feedsModule = readFileSync(new URL('room/feeds.svelte.ts', import.meta.url), 'utf8');
const pageCode = stripComments(PAGE);
const remoteCode = stripComments(REMOTE);
const chatLogCode = stripComments(CHAT_LOG);
const alertLogCode = stripComments(ALERT_LOG);

/*
  The two paging queries, sliced apart by their own boundaries.

  They sit next to each other and carry near-identical guards, so any assertion that searches the
  whole file proves nothing about either. `loadOlderChatMessages` runs to `loadOlderAlerts`, and
  `loadOlderAlerts` runs to the end of the module, which is why its end marker is the final `});`.

  This used to slice `+page.server.ts`; it slices `log-pages.remote.ts` now. The boundaries changed
  shape with the conversion — `X: async` became `export const X = query(` — and getting that wrong
  would not fail loudly, it would return an empty slice that every `not.toContain` below passes
  against. So `between` asserts BOTH markers were found, and it did before the move too.
*/
const between = (start: string, end: string) => {
  const from = remoteCode.indexOf(start);
  const to = end === '' ? remoteCode.length : remoteCode.indexOf(end, from);
  expect(from, `${start} must exist`).toBeGreaterThan(-1);
  expect(to, `${end} must follow ${start}`).toBeGreaterThan(from);
  return remoteCode.slice(from, to);
};
const chatAction = () =>
  between('export const loadOlderChatMessages = query(', 'export const loadOlderAlerts = query(');
const alertsAction = () => between('export const loadOlderAlerts = query(', '');

describe('the read is bounded', () => {
  it('the page size is the reference constant', () => {
    // `this.chatLogPageSize = 50`, byte 977432, from the same object as `trimLogSize = 300`.
    expect(CHAT_LOG_PAGE_SIZE).toBe(50);
  });

  it('every page query carries a LIMIT', () => {
    expect(chatLogCode).toContain('.limit(CHAT_LOG_PAGE_SIZE)');
    expect(chatLogCode).toContain('.offset(page * CHAT_LOG_PAGE_SIZE)');
  });

  it('the load no longer selects the whole table', () => {
    /*
      The specific shape that was there: a select from `messages` ordered ascending and terminated
      with `.all()` and no limit. Asserted as the absence of the unbounded ORDER BY, because that
      is the line that made it unbounded — `asc(messages.createdAt)` followed by `.all()`.
    */
    expect(serverCode).toContain('loadNewestChatPages(requireRoomShortCode(locals))');
    expect(serverCode).not.toContain('.orderBy(asc(messages.createdAt))');
  });

  it('the THIRD unbounded read is bounded too — alert questions', () => {
    /*
      Found 2026-08-15 and fixed the same day. `messages` and `alerts` were both `.all()` with no
      LIMIT until 2026-08-14; `alert_questions` was the same defect in the same load and was missed,
      so every SSE event re-read and re-serialised every question the room had ever had — bodies,
      sender names, avatars and roles — into the SSR HTML and the payload.

      Bounded differently from the other two ON PURPOSE, and that is the assertion worth having. A
      LIMIT here would drop questions belonging to an alert that IS on screen. Questions exist only
      for alerts, and the load already ships ONE PAGE of alerts, so scoping the questions to exactly
      those alerts bounds them by that page and needs no second cursor to keep in step with the
      first.
    */
    // The load hands the alert page's ids to the module that owns alert paging, and reads nothing
    // from `alert_questions` itself any more.
    expect(serverCode).toContain('loadQuestionsForAlerts(');
    expect(serverCode).toContain('alertRows.map((alert) => alert.id)');
    expect(serverCode, 'the page must not query that table directly').not.toContain(
      '.from(alertQuestions)'
    );

    /*
      ANCHORED TO THE FUNCTION, not to the file. `alert-log.ts` holds TWO room-scoped reads —
      `loadAlertPage` filters by `eq(alerts.roomShortCode, roomShortCode)` as well — so asserting
      "the module contains a room filter" passed with the filter DELETED from this one. Found by
      running the control, which is the third time today a guard has matched the wrong one of two
      sites; the same shape as the two `.from(rooms)` reads in the controller's account page.
    */
    const at = alertLogCode.indexOf('export function loadQuestionsForAlerts');
    expect(at, 'loadQuestionsForAlerts is not in alert-log.ts').toBeGreaterThan(-1);
    const read = alertLogCode.slice(at);

    // The bound itself: the alert id list.
    expect(read).toContain('inArray(alertQuestions.alertId, alertIds)');

    // The tenancy term stays IN the statement beside the id list. An id list is not a substitute:
    // this read was a cross-tenant leak until 2026-08-14 and the filter is why it is not one now.
    expect(read).toContain('eq(alerts.roomShortCode, roomShortCode)');
  });

  it('asks nothing at all when the page holds no alerts', () => {
    // `IN ()` is not a statement worth generating, and a room with no alerts has no question.
    expect(alertLogCode).toContain('if (alertIds.length === 0) return [];');
  });

  it('and pages per CHANNEL, so the quiet one is not starved', () => {
    /*
      A single global page of 50 would leave `off-topic` empty in any room where `main` is busy.
      The reference sends `getChatLog` once per channel for the same reason.
    */
    expect([...CHAT_CHANNELS]).toEqual(['main', 'off-topic']);
    expect(chatLogCode).toContain('eq(messages.room, channel)');
    expect(chatLogCode).toContain('CHAT_CHANNELS.flatMap((channel) => loadChatPage(');
  });

  it('the index answers the WHERE and the ORDER BY together', () => {
    /*
      Without it the single-column room index narrows to the room and leaves SQLite to sort the
      whole channel on every page request — which is the cost the paging was added to remove.
    */
    expect(DB).toContain('messages_channel_paging_idx');
    expect(DB).toContain('ON messages(room_short_code, room, created_at DESC, id DESC)');
    // Idempotent, like every other index here: this runs on every boot.
    expect(DB).toContain('CREATE INDEX IF NOT EXISTS messages_channel_paging_idx');
  });
});

/*
  The paging STATE moved to `room/log-pages.svelte.ts` on 2026-08-15, where the alerts half and the
  chat half stopped being two shapes of the same machinery. The assertions below follow it; the ones
  read out of the reference dumps are untouched, because the evidence did not move.

  THAT LAST SENTENCE USED TO NAME THE DUMP DIRECTORY, and `evidence-partition.test.ts` went red on
  it — correctly, and this is worth recording where it happened. Discovery marks a test file as
  evidence-bound by looking for a capture root followed by a slash ANYWHERE in it, comments
  included, and `vite.config.ts` then excludes those files on every CI checkout because the captures
  are off-repo. So one path in one comment would have dropped this entire contract from CI while the
  suite went on reporting green: coverage lost with nobody informed, which is the failure that file
  exists to hold shut. It is the same trap its own header records about itself.
*/
const pagesClass = readFileSync(
  new URL('./room/log-pages.svelte.ts', import.meta.url),
  'utf8'
).replace(/\/\*[\s\S]*?\*\//g, '');

describe('and nothing became unreachable', () => {
  it('there is a query that serves older pages', () => {
    expect(remoteCode).toContain('export const loadOlderChatMessages = query(');
    expect(remoteCode).toContain('loadChatPage(requireRoomShortCode(locals), channel, page)');
  });

  it('the client asks for them, and folds them in', () => {
    expect(pageCode).toContain('await loadOlderChatPage({ channel, page })');
    expect(pageCode).toContain('chatPages.arrived(channel, incoming, page);');
    expect(pagesClass).toContain('mergeOlderChatMessages(incoming, this.older(key))');
  });

  it('older pages survive the invalidateAll that every SSE event triggers', () => {
    /*
      THE POINT OF THE WHOLE DESIGN. `data.messages` is replaced on every invalidate; if the older
      pages lived there too, one new chat message would throw away everything the reader had
      scrolled back to. They are held in client state and merged at render.
    */
    /*
      Inside `chatMessagesFor(tab)` since 2026-08-14, when the extra chat column arrived: BOTH
      columns run the same pipeline and differ only in which channel they read, so the merge is
      keyed by the parameter rather than by the main column's tab. A second derived would have been
      a second copy of six steps, and the copies drift.
    */
    /*
      GETTERS since slice 9, not \`$derived\` — a derived class field initialises before the
      constructor assigns the thunks it reads. The property this test is about is unchanged: ONE
      function, called twice, keyed on the channel parameter.
    */
    expect(feedsModule).toContain('chatMessagesFor(tab: ChatTab) {');
    expect(feedsModule).toContain(
      'mergeOlderChatMessages(this.#chatPages.older(tab), this.#session().messages)'
    );
    expect(feedsModule).toContain('get visibleChat() {');
    expect(feedsModule).toContain('return this.chatMessagesFor(this.#chat.tab);');
    expect(feedsModule).toContain('get visibleExtraChat() {');
    expect(feedsModule).toContain('return this.chatMessagesFor(this.#chat.extraTab);');
  });

  it('the trim runs AFTER the merge, so the cap still holds', () => {
    /*
      Trimming `data.messages` and then prepending older pages would let the held log exceed
      `trimLogSize` by exactly the pages this feature adds — the preference would stop meaning
      anything for the readers most likely to have it on.
    */
    const from = feedsModule.indexOf('chatMessagesFor(tab: ChatTab) {');
    const derived = feedsModule.slice(from, feedsModule.indexOf('.filter(', from));
    expect(derived).toContain('trimChatLog(');
    expect(derived).toContain('mergeOlderChatMessages(');
    expect(derived.indexOf('trimChatLog(')).toBeLessThan(
      derived.indexOf('mergeOlderChatMessages(')
    );
  });
});

describe('the action refuses what it should', () => {
  it('the channel is an allow-list, not a string that reaches a WHERE clause', () => {
    expect(isChatChannel('main')).toBe(true);
    expect(isChatChannel('off-topic')).toBe(true);
    expect(isChatChannel('admin')).toBe(false);
    expect(isChatChannel('')).toBe(false);
    /*
      The allow-list survived the move into the schema. `typeof value === 'string'` is not padding:
      `z.custom` hands its predicate `unknown` off the wire, and `isChatChannel` is declared over
      `string`, so without it a non-string reaches `.includes` and its answer is trusted.
    */
    expect(chatAction()).toContain("typeof value === 'string' && isChatChannel(value)");
  });

  it('page 0 is refused, because the load already sent it', () => {
    /*
      SCOPED to the chat query. A bare `toContain` over the whole file once passed while the guard
      was deleted from this action, because the alerts action carries the identical line — caught by
      a negative control that stayed green when it should have gone red.

      The conversion changed the shape of that risk rather than removing it. There is now ONE
      `pageNumber` schema and both queries reference it, so they cannot drift apart the way two
      hand-written guards could. What has to be asserted is therefore different: that each query
      really uses the shared schema, and that the schema really carries the bound.
    */
    expect(chatAction()).toContain('page: pageNumber');
    expect(alertsAction()).toContain('query(pageNumber,');
    expect(remoteCode).toContain('z.number().int().min(1).max(MAX_CHAT_LOG_PAGE)');
  });

  it('and the offset is capped, because OFFSET is a scan', () => {
    /*
      `OFFSET n` makes SQLite walk and discard n rows. An unvalidated page number turns one request
      into a full table scan; this is the bound on that walk, not a limit on how far a reader may
      legitimately go.
    */
    expect(MAX_CHAT_LOG_PAGE).toBe(2_000);
  });

  it('the room comes from the session, never from the request', () => {
    /*
      A `roomShortCode` field on this form would be the 2026-08-07 privilege escalation in a new
      place: one tenant reading another tenant's chat log by editing a form field.
    */
    expect(chatAction()).toContain('requireRoomShortCode(locals)');
    /*
      `data.get('roomShortCode')` was the shape to refuse while this was a `FormData` action. There
      is no `FormData` now, so the equivalent is a `roomShortCode` FIELD on the schema — and
      `strictObject` is what makes adding one a validation error rather than a silently ignored key.
    */
    expect(chatAction()).not.toContain('roomShortCode:');
    expect(chatAction()).toContain('z.strictObject({');
  });
});

describe('the client stops asking at the end of history', () => {
  it('an EMPTY page is the terminator, as it is upstream', () => {
    // `0 == o.length && (this.hasMoreData = !1)`.
    expect(pageCode).toContain('if (incoming.length === 0) {');
    expect(pageCode).toContain('chatPages.exhausted(channel);');
    expect(pagesClass).toContain('this.#hasMore = { ...this.#hasMore, [key]: false };');
  });

  it('and paging is re-armed when the reader returns to the bottom', () => {
    /*
      `hasMoreData = !0` on the way down. Without it a reader who once reached the start of history
      could not page again for the rest of the session, however much the log grew.

      PER CHANNEL, and that was a real bug in the first draft: one shared flag meant reaching the
      start of `main` also stopped `off-topic` from ever paging. The reference keeps this state on
      the roomlog component, and it renders one per channel.
    */
    expect(pageCode).toContain('if (!this.#chatScrollingUp) this.#chatPages.arm(this.#chat.tab);');
    // PER CHANNEL is now structural: `arm` takes the key, so there is no shared flag to reach for.
    expect(pagesClass).toContain('arm(key: string): void {');
    expect(pagesClass).toContain('this.#hasMore = { ...this.#hasMore, [key]: true };');
  });
});

describe('the alerts log is paged by the same machinery', () => {
  /*
    Upstream renders ONE roomlog component for both logs, switched on `logType`. The scroll trigger,
    the two guards, the empty-page terminator and both nudges are literally the same code there, so
    they are the same code here — `shouldLoadOlderMessages` and `mergeOlderChatMessages` are shared.
    What differs is only the wire: `getAlertsLog {page}` has no channel.
  */

  it('the read is bounded, and by the CHAT constant, because upstream has no separate one', () => {
    /*
      There is no `alertLogPageSize` anywhere in the bundle. `trimAlertsLog` splices the alerts log
      down to `globals.chatLogPageSize`, so the same fifty governs both. Importing it rather than
      declaring a second constant is what stops the two drifting.
    */
    expect(alertLogCode).toContain("import { CHAT_LOG_PAGE_SIZE } from './chat-log';");
    expect(alertLogCode).toContain('.limit(CHAT_LOG_PAGE_SIZE)');
    expect(alertLogCode).toContain('.offset(page * CHAT_LOG_PAGE_SIZE)');
    expect(serverCode).toContain('loadAlertPage(requireRoomShortCode(locals))');
    expect(serverCode).not.toContain('.orderBy(asc(alerts.createdAt))');
  });

  it('pages on the room alone — alerts are one stream, not per channel', () => {
    expect(alertLogCode).toContain('.where(eq(alerts.roomShortCode, roomShortCode))');
    expect(alertLogCode).not.toContain('alerts.room,');
  });

  it('has its own paging index', () => {
    expect(DB).toContain('CREATE INDEX IF NOT EXISTS alerts_paging_idx');
    expect(DB).toContain('ON alerts(room_short_code, created_at DESC, id DESC)');
  });

  it('older pages are fetched and survive the invalidate', () => {
    expect(remoteCode).toContain('export const loadOlderAlerts = query(pageNumber,');
    expect(pageCode).toContain('await loadOlderAlertsPage(page)');
    expect(feedsModule).toContain(
      'mergeOlderChatMessages(this.#alertPages.older(this.#alertsLogKey), this.#session().alerts)'
    );
  });

  it('and it refuses page 0 and an unbounded offset, like the chat query', () => {
    /*
      Both bounds now come from the one `pageNumber` schema — see the chat assertion above for why
      that changes what is worth asserting. The alerts query takes the page as its WHOLE argument
      rather than a field, so there is no object for a `roomShortCode` to be smuggled onto at all;
      what remains to prove is that the room still comes from the session.
    */
    expect(alertsAction()).toContain('query(pageNumber,');
    expect(alertsAction()).toContain('requireRoomShortCode(locals)');
    expect(alertsAction()).not.toContain('roomShortCode:');
  });

  it('the alerts search term REALLY gates paging, unlike the chat one', () => {
    /*
      The chat log has no live filter, so its call site passes `''` and says so. The alerts pane
      does have one — `matchesAlertSearch` filters the rendered list — so upstream's refusal to page
      while a term is set is load-bearing here: asking for page 2 of a filter the server knows
      nothing about would interleave unfiltered history into a filtered view.
    */
    expect(pageCode).toContain('searchTerm: this.#alerts.search,');
  });

  it('and stops at the first empty page, re-arming at the bottom', () => {
    expect(pageCode).toContain('alertPages.exhausted(ALERTS_LOG);');
    expect(pageCode).toContain('if (!this.#alertsScrollingUp) this.#alertPages.arm(ALERTS_LOG);');
  });
});

describe('both logs nudge twice, which is what upstream does', () => {
  it('+30 the instant the request goes out, and +1 when a later page arrives', () => {
    /*
      Two different jobs. The 30 moves the reader off the trigger zone so a continuing gesture is
      not fighting the threshold mid-flight; the 1 makes the browser recompute its scroll anchor
      after fifty rows are prepended, without visibly moving anybody.

      The first draft of the chat side applied 30 on ARRIVAL and nothing at request time — one nudge
      doing neither job. Found by reading the arrival handler while porting the alerts side.
    */
    /*
      THREE request nudges since the extra chat column landed — main chat, alerts, and the extra
      column — against TWO arrival nudges, because the extra column shares the main chat's
      `loadOlderChatMessages` and therefore its arrival path. Pinned as separate numbers precisely
      so that asymmetry is visible rather than looking like a miscount.
    */
    expect(pageCode.match(/scrollTop \+= CHAT_PAGE_REQUEST_NUDGE;/g)).toHaveLength(3);
    expect(pageCode.match(/scrollTop \+= CHAT_PAGE_ARRIVAL_NUDGE;/g)).toHaveLength(2);
  });
});
