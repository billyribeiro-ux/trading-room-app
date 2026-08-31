// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import type { ChatArchiveLog, ChatArchiveView } from '#lib/server/chat-archive.js';

import { RoomChatArchiveLog } from './chat-archive-log.svelte';

/**
 * THE ARCHIVED-LOG VIEWER, EXECUTED — `toggleShowLogs`, and the search over what it opens.
 *
 * `chat-archive-log-contract.test.ts` reads this class and its component as SOURCE and pins what
 * they transcribe. What reading cannot do is run the thing, and three of the rules below only exist
 * at runtime: that opening drops the previous log before awaiting, that emptying the search box ends
 * the search without a submit, and that Download Log writes the WHOLE archive rather than the
 * filtered view.
 */

const ARCHIVE: ChatArchiveView = Object.freeze({
  id: 7,
  channel: 'main',
  olderThan: Date.UTC(2026, 7, 1),
  archivedAt: Date.UTC(2026, 7, 30, 14, 5),
  messageCount: 3
});

const message = (id: number, senderName: string, body: string) => ({
  id,
  senderName,
  body,
  isAdmin: false,
  createdAt: new Date(Date.UTC(2026, 6, 4, 15, 30))
});

const LOG: ChatArchiveLog = Object.freeze({
  archive: ARCHIVE,
  messages: [
    message(1, 'Ada', 'opening bell'),
    message(2, 'Grace', 'AAPL at 190'),
    message(3, 'Ada', 'flat')
  ],
  truncated: false
});

const viewer = (read = vi.fn(async () => LOG)) => ({ log: new RoomChatArchiveLog(read), read });

describe('opening one archive', () => {
  it('starts on the LIST — nothing is open until something is opened', () => {
    const { log } = viewer();
    expect(log.archive).toBeNull();
    expect(log.messages).toEqual([]);
    expect(log.loading).toBe(false);
  });

  it('asks for the archive it was given, and shows what came back', async () => {
    const { log, read } = viewer();
    await log.open(ARCHIVE);
    expect(read).toHaveBeenCalledWith(7);
    expect(log.archive).toEqual(ARCHIVE);
    expect(log.messages).toHaveLength(3);
  });

  it('DROPS the previous log before awaiting, not after', async () => {
    /*
      The runtime rule. Leaving the old log up would show one archive's messages under another
      archive's header for the length of a round trip, so a presenter who clicked the wrong row would
      read the right-looking wrong log. Asserted by opening a second archive against a read that has
      not resolved, and looking at the state IN that gap.
    */
    let release: (value: ChatArchiveLog) => void = () => {};
    const read = vi.fn(
      () =>
        new Promise<ChatArchiveLog>((resolve) => {
          release = resolve;
        })
    );
    const log = new RoomChatArchiveLog(read);

    const first = log.open(ARCHIVE);
    release(LOG);
    await first;
    expect(log.messages).toHaveLength(3);

    const second = log.open({ ...ARCHIVE, id: 8 });
    expect(log.archive, 'the previous archive must not still be showing').toBeNull();
    expect(log.messages).toEqual([]);
    expect(log.loading).toBe(true);
    release({ ...LOG, archive: { ...ARCHIVE, id: 8 }, messages: [] });
    await second;
  });

  it('shows a failure instead of an empty log, because they look identical', async () => {
    const { log } = viewer(vi.fn(async () => Promise.reject(new Error('nope'))));
    await log.open(ARCHIVE);
    expect(log.error).toBe('Could not open that archived log.');
    expect(log.loading).toBe(false);
  });

  it('Back returns to the list and clears the search, as upstream clears it', async () => {
    const { log } = viewer();
    await log.open(ARCHIVE);
    log.term = 'AAPL';
    log.search();
    log.back();
    expect(log.archive).toBeNull();
    expect(log.term).toBe('');
    expect(log.visible).toEqual([]);
  });
});

describe('the search over one log', () => {
  it('does not filter until it is SUBMITTED', async () => {
    const { log } = viewer();
    await log.open(ARCHIVE);
    log.term = 'AAPL';
    flushSync();
    expect(log.visible, 'typing alone is not a search').toHaveLength(3);
    log.search();
    flushSync();
    expect(log.visible).toHaveLength(1);
    expect(log.visible[0].body).toBe('AAPL at 190');
  });

  it('matches the SENDER as well as the body', async () => {
    const { log } = viewer();
    await log.open(ARCHIVE);
    log.term = 'ada';
    log.search();
    flushSync();
    expect(log.visible.map((row) => row.id)).toEqual([1, 3]);
  });

  it('ENDS the search the moment the box empties, with no submit', async () => {
    /*
      Upstream's `onInputChange` clears `searchTxt` before it looks at the key at all. The rule lives
      on the write here rather than in a keydown handler, so a paste or the clear button cannot miss
      it — which is what this asserts: the term is emptied WITHOUT calling `search()`.
    */
    const { log } = viewer();
    await log.open(ARCHIVE);
    log.term = 'AAPL';
    log.search();
    flushSync();
    expect(log.visible).toHaveLength(1);

    log.term = '';
    flushSync();
    expect(log.visible, 'emptying the box restores the whole log').toHaveLength(3);
  });

  it('a whitespace-only term is a clear, not a match-everything', async () => {
    const { log } = viewer();
    await log.open(ARCHIVE);
    log.term = '   ';
    log.search();
    flushSync();
    expect(log.visible).toHaveLength(3);
  });
});

describe('Download Log', () => {
  it('writes the WHOLE archive, never the filtered view', async () => {
    /*
      Upstream reads `e.msgs` and not the pipe's output, and this keeps that: a file named ChatLog
      that silently held only what was typed in a search box is the more surprising of the two.
    */
    const { log } = viewer();
    await log.open(ARCHIVE);
    log.term = 'AAPL';
    log.search();
    flushSync();
    expect(log.visible).toHaveLength(1);

    const text = log.downloadText();
    expect(text).toContain('[Ada]: opening bell');
    expect(text).toContain('[Grace]: AAPL at 190');
    expect(text).toContain('[Ada]: flat');
  });

  it('is the capture s own line shape, CRLF included', async () => {
    const { log } = viewer();
    await log.open(ARCHIVE);
    /* `<stamp> [name]: body\r\n` — byte 2,304,904. The stamp is a locale format, so only its shape. */
    expect(log.downloadText()).toMatch(/^[^[\r\n]+ \[Ada\]: opening bell\r\n/);
    expect(log.downloadText().split('\r\n')).toHaveLength(4);
  });

  it('names the file after the archive, and never crashes with none open', () => {
    const { log } = viewer();
    expect(log.downloadName()).toBe('ChatLog.txt');
    expect(log.downloadText()).toBe('');
  });
});
