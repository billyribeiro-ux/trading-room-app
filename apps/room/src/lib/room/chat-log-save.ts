import { isHttpError } from '@sveltejs/kit';

import { chatLogFileName, chatLogFileText } from '#lib/chat-log-download.js';

import type { RoomDialogs } from './dialogs.svelte';

/**
 * `downloadLog("chat")` — ask which range, fetch it, write the file. `ACA-06`, byte 1,415,703.
 *
 * ```js
 * bootbox.prompt({ title: "Chat Log", message: "<p>Please select an option below:</p>",
 *   inputType: "radio", inputOptions: [
 *     { text: "Entire chat history", value: "all" },
 *     { text: "Last 24 hours",       value: "24hrs" },
 *     { text: "Last 7 days",         value: "7days" }],
 *   callback: o => { o && this.downloadLogType(e, !1, o) } })
 * ```
 *
 * ## The blocker this closes named the reference's TRANSPORT, not this room's capability
 *
 * `ChatSearchBar.svelte` recorded the save control as unbuilt because *"`downloadLogType` awaits
 * `invokeServerCommand("getAllLog", …)`. **There is no such command in this repository** — so the
 * button would open a dialog whose every option fails."* Both sentences are true and the conclusion
 * does not follow: `getAllLog` is how the REFERENCE asks its server for history its page has never
 * seen, and this room keeps that history itself. It needed a query, not a command.
 *
 * Third blocker of that shape re-measured this week, after `G08`'s waveform and `SP2-04`'s local
 * preview.
 *
 * ## A module and not two functions on the page
 *
 * `+page.svelte` went 125 lines past its ceiling when this was written there, which is what raised
 * the question — but the answer is better than the line count. This is a self-contained flow with
 * one collaborator (the dialog stack) and one injected read, so it is testable without mounting a
 * page, and the page keeps a one-line call. Same seam, and the same argument, as `media-replay.ts`.
 *
 * `fetchLog` is INJECTED rather than imported for exactly that reason: importing the remote function
 * here would make every test of this flow a test of the network.
 */

/** What the file needs from a row, whatever shape the reader hands back. */
export interface ChatLogRow {
  readonly createdAt: Date | number | string;
  readonly senderName: string;
  readonly body: string;
}

/*
  There is deliberately NO `ChatLogRange` union here, and it was written and deleted the same hour.

  It looked right — three known values, so name them — and it had no consumer: `writeChatLog` takes
  the string the DIALOG hands back, which is whatever a radio input carried, and narrowing it here
  would be this module asserting a fact it cannot check. The real gate is `log-pages.remote.ts`'s
  `z.enum(CHAT_DOWNLOAD_RANGES)`, on the server, where an unexpected value is refused rather than
  cast. `dead-export-contract` caught the orphan; the reasoning is why it is not simply re-used.
*/

/**
 * The dialog's three options, in the capture's own order and wording.
 *
 * Exported so the contract reads them rather than restating them, and so the page cannot drift into
 * a fourth or reword one.
 */
export const CHAT_LOG_RANGE_OPTIONS: readonly { readonly text: string; readonly value: string }[] =
  [
    { text: 'Entire chat history', value: 'all' },
    { text: 'Last 24 hours', value: '24hrs' },
    { text: 'Last 7 days', value: '7days' }
  ];

/** Everything this flow needs that is not its own. */
export interface ChatLogSaveDeps {
  readonly dialogs: RoomDialogs;
  /** `downloadChatLog` from `log-pages.remote`, injected so a test is not a network test. */
  readonly fetchLog: (input: { channel: string; range: string }) => Promise<readonly ChatLogRow[]>;
  /**
   * Writing the file — the four lines of DOM, separated so everything above them can be driven.
   *
   * Defaulted to the real one, because a caller that had to supply it would be a caller that could
   * forget to and get nothing, silently.
   */
  readonly saveFile?: (text: string, name: string) => void;
}

/** The real writer: a blob, an anchor, a click, and a revoke the reference does not do. */
function downloadTextFile(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  /*
    Upstream's object URL lives until the tab closes. Ours is released the moment the click has taken
    it, because a blob of twenty thousand chat lines is a real allocation and a presenter may take
    several in a sitting.
  */
  URL.revokeObjectURL(url);
}

/**
 * Raise the range prompt. The download happens on confirm.
 *
 * `o && this.downloadLogType(…)` is reproduced as an empty initial value plus a guard: bootbox hands
 * the callback `null` when nothing is chosen, so confirming without a choice is a no-op. Nothing is
 * preselected for the same reason — a default would turn a mis-click into a download of the whole
 * history.
 */
export function promptForChatLog(deps: ChatLogSaveDeps, channel: string): void {
  deps.dialogs.prompt = {
    title: 'Chat Log',
    /* The capture wraps this in a `<p>`; the dialog renders it as one, so the tag is not carried. */
    message: 'Please select an option below:',
    value: '',
    options: CHAT_LOG_RANGE_OPTIONS,
    onconfirm: (range) => {
      deps.dialogs.prompt = null;
      if (!range) return;
      void writeChatLog(deps, channel, range);
    }
  };
}

/**
 * Fetch the range and write the file.
 *
 * **Failure is SAID, not swallowed.** `downloadLogType` has no error branch — a rejected
 * `invokeServerCommand` leaves the click doing nothing at all, which is indistinguishable from a
 * button that was never wired.
 */
export async function writeChatLog(
  deps: ChatLogSaveDeps,
  channel: string,
  range: string
): Promise<void> {
  let rows: readonly ChatLogRow[];
  try {
    rows = await deps.fetchLog({ channel, range });
  } catch (cause) {
    deps.dialogs.alert = isHttpError(cause)
      ? cause.body.message
      : 'The chat log could not be read.';
    return;
  }

  /*
    The room's row shape into the reference's three wire keys, HERE rather than on the server.

    `chatLogForDownload` returns what every other reader of that module returns — `createdAt`,
    `senderName`, `body` — because four call sites share the projection, and bending one of them to
    a file format would put the format's vocabulary in the query.
  */
  const text = chatLogFileText(
    rows.map((row) => ({
      t: new Date(row.createdAt).getTime(),
      n: row.senderName,
      txt: row.body
    }))
  );

  (deps.saveFile ?? downloadTextFile)(text, chatLogFileName());
}
