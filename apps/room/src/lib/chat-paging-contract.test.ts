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
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const CHAT_LOG = readFileSync(new URL('./server/chat-log.ts', import.meta.url), 'utf8');
const ALERT_LOG = readFileSync(new URL('./server/alert-log.ts', import.meta.url), 'utf8');
const DB = readFileSync(new URL('./server/db/index.ts', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const serverCode = stripComments(SERVER);
const pageCode = stripComments(PAGE);
const chatLogCode = stripComments(CHAT_LOG);
const alertLogCode = stripComments(ALERT_LOG);

/*
  The two paging actions, sliced apart by their own boundaries.

  They sit next to each other and carry identical guards, so any assertion that searches the whole
  file proves nothing about either. `loadOlderChatMessages` runs to `loadOlderAlerts`, and
  `loadOlderAlerts` runs to `deletePrivateChatLog`, which is the next action after it.
*/
const between = (start: string, end: string) => {
  const from = serverCode.indexOf(start);
  const to = serverCode.indexOf(end, from);
  expect(from, `${start} must exist`).toBeGreaterThan(-1);
  expect(to, `${end} must follow ${start}`).toBeGreaterThan(from);
  return serverCode.slice(from, to);
};
const chatAction = () => between('loadOlderChatMessages: async', 'loadOlderAlerts: async');
const alertsAction = () => between('loadOlderAlerts: async', 'deletePrivateChatLog: async');

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

describe('and nothing became unreachable', () => {
  it('there is an action that serves older pages', () => {
    expect(serverCode).toContain('loadOlderChatMessages: async ({ request, locals }) => {');
    expect(serverCode).toContain('loadChatPage(requireRoomShortCode(locals), channel, page)');
  });

  it('the client asks for them, and folds them in', () => {
    expect(pageCode).toContain("await fetch('?/loadOlderChatMessages'");
    expect(pageCode).toContain(
      'mergeOlderChatMessages(incoming, olderChatMessages[channel] ?? [])'
    );
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
    expect(pageCode).toContain('function chatMessagesFor(tab: ChatTab) {');
    expect(pageCode).toContain(
      'mergeOlderChatMessages(olderChatMessages[tab] ?? [], data.messages)'
    );
    expect(pageCode).toContain('const visibleChatMessages = $derived(chatMessagesFor(chatTab));');
    expect(pageCode).toContain(
      'const visibleExtraChatMessages = $derived(chatMessagesFor(extraChatTab));'
    );
  });

  it('the trim runs AFTER the merge, so the cap still holds', () => {
    /*
      Trimming `data.messages` and then prepending older pages would let the held log exceed
      `trimLogSize` by exactly the pages this feature adds — the preference would stop meaning
      anything for the readers most likely to have it on.
    */
    const from = pageCode.indexOf('function chatMessagesFor(tab: ChatTab) {');
    const derived = pageCode.slice(from, pageCode.indexOf('.filter(', from));
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
    expect(serverCode).toContain('if (!isChatChannel(channel)) return fail(400,');
  });

  it('page 0 is refused, because the load already sent it', () => {
    /*
      SCOPED to the chat action. A bare `toContain` over the whole file passed while the guard was
      deleted from this action, because the alerts action added later carries the identical line —
      caught by a negative control that stayed green when it should have gone red. Two actions with
      the same guard need two assertions that can tell them apart.
    */
    expect(chatAction()).toContain('page < 1 || page > MAX_CHAT_LOG_PAGE');
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
    expect(chatAction()).not.toContain("data.get('roomShortCode')");
  });
});

describe('the client stops asking at the end of history', () => {
  it('an EMPTY page is the terminator, as it is upstream', () => {
    // `0 == o.length && (this.hasMoreData = !1)`.
    expect(pageCode).toContain('if (incoming.length === 0) {');
    expect(pageCode).toContain('chatHasMoreData = { ...chatHasMoreData, [channel]: false };');
  });

  it('and paging is re-armed when the reader returns to the bottom', () => {
    /*
      `hasMoreData = !0` on the way down. Without it a reader who once reached the start of history
      could not page again for the rest of the session, however much the log grew.

      PER CHANNEL, and that was a real bug in the first draft: one shared flag meant reaching the
      start of `main` also stopped `off-topic` from ever paging. The reference keeps this state on
      the roomlog component, and it renders one per channel.
    */
    expect(pageCode).toContain(
      'if (!chatScrollingUp) chatHasMoreData = { ...chatHasMoreData, [chatTab]: true };'
    );
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
    expect(serverCode).toContain('loadOlderAlerts: async ({ request, locals }) => {');
    expect(pageCode).toContain("await fetch('?/loadOlderAlerts'");
    expect(pageCode).toContain('mergeOlderChatMessages(olderAlerts, data.alerts)');
  });

  it('and it refuses page 0 and an unbounded offset, like the chat action', () => {
    expect(alertsAction()).toContain('page < 1 || page > MAX_CHAT_LOG_PAGE');
    expect(alertsAction()).toContain('requireRoomShortCode(locals)');
    expect(alertsAction()).not.toContain("data.get('roomShortCode')");
  });

  it('the alerts search term REALLY gates paging, unlike the chat one', () => {
    /*
      The chat log has no live filter, so its call site passes `''` and says so. The alerts pane
      does have one — `matchesAlertSearch` filters the rendered list — so upstream's refusal to page
      while a term is set is load-bearing here: asking for page 2 of a filter the server knows
      nothing about would interleave unfiltered history into a filtered view.
    */
    expect(pageCode).toContain('searchTerm: alertSearch,');
  });

  it('and stops at the first empty page, re-arming at the bottom', () => {
    expect(pageCode).toContain('alertsHasMoreData = false;');
    expect(pageCode).toContain('if (!alertsScrollingUp) alertsHasMoreData = true;');
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
