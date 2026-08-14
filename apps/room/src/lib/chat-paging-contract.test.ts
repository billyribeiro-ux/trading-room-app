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
const DB = readFileSync(new URL('./server/db/index.ts', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const serverCode = stripComments(SERVER);
const pageCode = stripComments(PAGE);
const chatLogCode = stripComments(CHAT_LOG);

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
    expect(pageCode).toContain(
      'mergeOlderChatMessages(olderChatMessages[chatTab] ?? [], data.messages)'
    );
  });

  it('the trim runs AFTER the merge, so the cap still holds', () => {
    /*
      Trimming `data.messages` and then prepending older pages would let the held log exceed
      `trimLogSize` by exactly the pages this feature adds — the preference would stop meaning
      anything for the readers most likely to have it on.
    */
    const from = pageCode.indexOf('const visibleChatMessages = $derived(');
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
    expect(serverCode).toContain('page < 1 || page > MAX_CHAT_LOG_PAGE');
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
    const from = serverCode.indexOf('loadOlderChatMessages: async');
    const action = serverCode.slice(from, serverCode.indexOf('deletePrivateChatLog', from));
    expect(action).toContain('requireRoomShortCode(locals)');
    expect(action).not.toContain("data.get('roomShortCode')");
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
