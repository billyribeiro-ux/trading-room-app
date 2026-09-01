import { describe, expect, it } from 'vitest';
import { error } from '@sveltejs/kit';

import { RoomDialogs } from './dialogs.svelte';
import {
  CHAT_LOG_RANGE_OPTIONS,
  promptForChatLog,
  writeChatLog,
  type ChatLogRow
} from './chat-log-save';

/**
 * `downloadLog("chat")`'s flow, driven.
 *
 * It was two functions on `+page.svelte` and had no test that did not involve mounting a page and a
 * network. Extracting it — forced by that file's ceiling, and better than the line count — made
 * three things assertable that were not:
 *
 *   * confirming without choosing downloads NOTHING, which is upstream's `o && …`;
 *   * a failed read SAYS so, where upstream's click silently does nothing;
 *   * the row shape is mapped to the file's three keys, not passed through.
 */

const ROWS: readonly ChatLogRow[] = [
  { createdAt: new Date(Date.UTC(2026, 8, 1, 9, 0)), senderName: 'Dana Vero', body: 'morning' },
  { createdAt: new Date(Date.UTC(2026, 8, 1, 9, 5)), senderName: 'Sam Ito', body: 'morning all' }
];

const harness = (
  fetchLog: (input: {
    channel: string;
    range: string;
  }) => Promise<readonly ChatLogRow[]> = async () => ROWS
) => {
  const dialogs = new RoomDialogs();
  const saved: { text: string; name: string }[] = [];
  return {
    dialogs,
    saved,
    deps: {
      dialogs,
      fetchLog,
      saveFile: (text: string, name: string) => saved.push({ text, name })
    }
  };
};

describe('the prompt is the capture s', () => {
  it('offers the three ranges, in order, with NOTHING preselected', () => {
    /*
      `o && this.downloadLogType(e, !1, o)` — bootbox's callback receives null when the presenter
      confirms without choosing. A preselected option would turn a mis-click into a download of the
      entire history, which is the one outcome nobody asked for.
    */
    const { deps, dialogs } = harness();
    promptForChatLog(deps, 'main');

    expect(dialogs.prompt?.title).toBe('Chat Log');
    expect(dialogs.prompt?.message).toBe('Please select an option below:');
    expect(dialogs.prompt?.value, 'nothing may be preselected').toBe('');
    expect(dialogs.prompt?.options).toEqual([
      { text: 'Entire chat history', value: 'all' },
      { text: 'Last 24 hours', value: '24hrs' },
      { text: 'Last 7 days', value: '7days' }
    ]);
    expect(CHAT_LOG_RANGE_OPTIONS).toHaveLength(3);
  });

  it('confirming with NO choice downloads nothing and closes the dialog', async () => {
    /*
      ── THIS CASE PASSED FOR THE WRONG REASON UNTIL ITS CONTROL WAS RUN ─────────────────────────

      It was synchronous, and `onconfirm` starts an async download it does not await. So deleting the
      `if (!range) return;` guard left it GREEN: the read had not resolved by the time `saved` was
      checked, and an empty array is what an unfinished download looks like too.

      It also has to prove the read was never ASKED, not merely that no file appeared — a guard
      placed after the fetch would still write nothing on an empty result, and would still have sent
      the request.
    */
    const asked: { channel: string; range: string }[] = [];
    const { deps, dialogs, saved } = harness(async (input) => {
      asked.push(input);
      return ROWS;
    });
    promptForChatLog(deps, 'main');
    dialogs.prompt?.onconfirm('');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(asked, 'an empty choice must not even reach the server').toEqual([]);
    expect(saved, 'and must not write a file').toEqual([]);
    expect(dialogs.prompt, 'the dialog closes either way').toBeNull();
  });

  it('confirming WITH a choice writes the file', async () => {
    const asked: { channel: string; range: string }[] = [];
    const { deps, dialogs, saved } = harness(async (input) => {
      asked.push(input);
      return ROWS;
    });
    promptForChatLog(deps, 'extra');
    dialogs.prompt?.onconfirm('7days');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(asked, 'the channel and the chosen range both reach the read').toEqual([
      { channel: 'extra', range: '7days' }
    ]);
    expect(saved).toHaveLength(1);
  });
});

describe('the file it writes', () => {
  it('maps the room s row shape onto the reference s three wire keys', async () => {
    /*
      `chatLogForDownload` returns `createdAt` / `senderName` / `body`, shared with four other
      readers. `t` / `n` / `txt` belong to the download, and the mapping is here rather than in the
      query so the file format's vocabulary stays out of it.
    */
    const { deps, saved } = harness();
    await writeChatLog(deps, 'main', 'all');
    expect(saved[0].text).toContain('[Dana Vero]: morning\r\n');
    expect(saved[0].text).toContain('[Sam Ito]: morning all\r\n');
    expect(saved[0].name).toMatch(/^ChatLog_.+\.txt$/);
  });

  it('an empty range writes an empty file, not an error', async () => {
    /* A room with nothing in the last 24 hours downloads an empty file, which is honest. */
    const { deps, saved, dialogs } = harness(async () => []);
    await writeChatLog(deps, 'main', '24hrs');
    expect(saved).toEqual([{ text: '', name: saved[0].name }]);
    expect(dialogs.alert).toBeNull();
  });
});

describe('a failed read SAYS so, which the capture does not', () => {
  it('shows the server s own message on a refusal', async () => {
    /*
      `downloadLogType` has no error branch — a rejected `invokeServerCommand` leaves the click doing
      nothing at all, indistinguishable from a button that was never wired. The server's own sentence
      is shown, because "No such channel." is more use than a generic failure.
    */
    const { deps, dialogs, saved } = harness(async () => {
      error(403, 'No such channel.');
    });
    await writeChatLog(deps, 'nope', 'all');
    expect(dialogs.alert).toBe('No such channel.');
    expect(saved, 'and no file is written').toEqual([]);
  });

  it('and a non-HTTP failure still says something rather than nothing', async () => {
    const { deps, dialogs } = harness(async () => {
      throw new TypeError('offline');
    });
    await writeChatLog(deps, 'main', 'all');
    expect(dialogs.alert).toBe('The chat log could not be read.');
  });
});
