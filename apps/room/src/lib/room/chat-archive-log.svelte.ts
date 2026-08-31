import type { ChatArchiveLog, ChatArchiveView } from '#lib/server/chat-archive.js';

/**
 * THE OTHER HALF OF `app-chat-logs-modal` — one archived log, opened and read.
 *
 * ## What was missing, and why it is a gap rather than a stub
 *
 * Upstream's modal is two views. `RoomChatArchive` and `ChatArchivePane` are the first: the list of
 * sweeps, with Archive All, Archive Older Than and Unarchive. `toggleShowLogs(entry)` at bundle byte
 * **2,304,726** swaps that list for the second — a Back button, a search box, Download Log, a
 * presenter-only Unarchive, and the messages (`jxe`, byte **2,309,873**, and its twin in
 * `app-alert-logs-modal`).
 *
 * This room could sweep and could restore, and offered no way to SEE what was in an archive before
 * restoring it — which is the one thing a presenter standing at that dialog wants to know. It was
 * found by `reference-const-coverage-contract.test.ts`: six values missing from each of the two log
 * modals, and all six belong to this view (`log-header-container`, `log-header`, `search-addon`,
 * `Enter search term`, `btn-ligth`, `fa-box-open`).
 *
 * ## Why a SECOND class rather than more of `RoomChatArchive`
 *
 * `source-size-contract.test.ts` refused it: `chat-archive.svelte.ts` sits at 182 against a ceiling
 * of 183, and the ratchet's instruction is to extract rather than raise. Following it produced the
 * better arrangement, which is the usual outcome — the browser owns a LIST and four mutations, this
 * owns ONE log and a search over it, and neither reads the other's state.
 *
 * ## The read is a function, not a port object
 *
 * `chat-archive-port.ts` exists because `RoomChatArchive` makes three calls. This makes one, and a
 * frozen object wrapping a single function would be a layer whose only content is its own name.
 */
export class RoomChatArchiveLog {
  readonly #read: (archiveId: number) => Promise<ChatArchiveLog>;

  /*
    `$state.raw` — the log is fetched whole and REPLACED whole, and nothing mutates a message. A deep
    proxy over up to two thousand rows would be built on open and read on every keystroke of the
    search below, to make writes possible that never happen.
  */
  #log = $state.raw<ChatArchiveLog | null>(null);
  #loading = $state(false);
  #error = $state<string | null>(null);

  /** What is TYPED. Upstream's `inputTxt`. */
  #term = $state('');
  /** What is SEARCHED. Upstream's `searchTxt` — set on Enter or the button, not on every keystroke. */
  #applied = $state('');

  /**
   * The rows the viewer draws.
   *
   * `$derived` and not an `$effect` that assigns a filtered array: the value is a function of the log
   * and the applied term and of nothing else, so an effect would be a second copy of the list kept in
   * step by hand — the exact shape the root standard names.
   */
  readonly #visible = $derived.by(() => {
    const messages = this.#log?.messages ?? [];
    const needle = this.#applied.trim().toLowerCase();
    if (!needle) return messages;
    return messages.filter(
      (message) =>
        message.body.toLowerCase().includes(needle) ||
        message.senderName.toLowerCase().includes(needle)
    );
  });

  constructor(read: (archiveId: number) => Promise<ChatArchiveLog>) {
    this.#read = read;
  }

  /** The archive being viewed, or null while the LIST is showing. Upstream's `showLogs`. */
  get archive(): ChatArchiveView | null {
    return this.#log?.archive ?? null;
  }

  /** True from the moment an entry is clicked until the log arrives — upstream's `loading`. */
  get loading(): boolean {
    return this.#loading;
  }

  /** Shown instead of the messages, never swallowed. An empty log and a failed read look alike. */
  get error(): string | null {
    return this.#error;
  }

  /** Whether the server truncated the read. The viewer says so; see `CHAT_ARCHIVE_LOG_LIMIT`. */
  get truncated(): boolean {
    return this.#log?.truncated ?? false;
  }

  /** Every message in the archive, unfiltered — what Download Log writes. */
  get messages(): readonly ChatArchiveLog['messages'][number][] {
    return this.#log?.messages ?? [];
  }

  /** The messages after the search. Equal to {@link messages} when nothing is being searched. */
  get visible(): readonly ChatArchiveLog['messages'][number][] {
    return this.#visible;
  }

  get term(): string {
    return this.#term;
  }

  set term(value: string) {
    this.#term = value;
    /*
      Upstream's `onInputChange` clears the SEARCH the moment the box empties, before it looks at the
      key at all — `if (!this.inputTxt || 0 === this.inputTxt.length) return this.searchTxt = "", !1`.
      That is the same rule `ChatSearchBar` records for the live log ("emptying the box ENDS the
      search with no submit"), so it lives on the write rather than in a keydown handler, where a
      paste or a clear button would miss it.
    */
    if (value.length === 0) this.#applied = '';
  }

  /** Whether the search is filtering. Drives the `×` upstream shows only when the box has content. */
  get searching(): boolean {
    return this.#term.length > 0;
  }

  /**
   * `toggleShowLogs(entry)` — open one archive.
   *
   * The previous log is dropped BEFORE the await rather than after it. Leaving it up would show one
   * archive's messages under another archive's header for the length of a round trip, and a
   * presenter who clicked the wrong row would read the right-looking wrong log.
   */
  async open(archive: ChatArchiveView): Promise<void> {
    this.#log = null;
    this.#error = null;
    this.#loading = true;
    this.clearInput();
    try {
      const log = await this.#read(archive.id);
      this.#log = log;
    } catch {
      this.#error = 'Could not open that archived log.';
    } finally {
      this.#loading = false;
    }
  }

  /** `toggleShowLogs(false)` — back to the list, with the search cleared as upstream clears it. */
  back(): void {
    this.#log = null;
    this.#error = null;
    this.#loading = false;
    this.clearInput();
  }

  /** `searchLogs()` — the button, and Enter. An empty box is a CLEAR, which is upstream's own rule. */
  search(): void {
    this.#applied = this.#term.trim().length === 0 ? '' : this.#term;
  }

  /** `clearInput()` — the `×`. Both fields, because upstream sets both. */
  clearInput(): void {
    this.#term = '';
    this.#applied = '';
  }

  /**
   * `downloadLog()` — the file's TEXT. Writing it is the component's job; this is testable without a DOM.
   *
   * Transcribed by value from byte 2,304,904:
   *
   * ```js
   * new Date(c.t).toLocaleTimeString("en-us", {year:"numeric",month:"numeric",day:"numeric",
   *                                            hour:"2-digit",minute:"2-digit"})
   *   + " [" + c.n + "]: " + c.txt + "\\r\\n"
   * ```
   *
   * **The whole log, never the filtered view**, which is upstream's own choice — it reads `e.msgs`
   * and not the pipe's output. A download named "ChatLog" that silently held only what was typed in a
   * search box would be the more surprising of the two behaviours.
   *
   * `\\r\\n` is kept: the file is opened in Notepad as often as anywhere else.
   */
  downloadText(): string {
    const stamp = new Intl.DateTimeFormat('en-us', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    return this.messages
      .map(
        (message) =>
          `${stamp.format(message.createdAt)} [${message.senderName}]: ${message.body}\r\n`
      )
      .join('');
  }

  /** `ChatLog_${date}.txt`, upstream's own name, with its `date` — the archive's `updated` stamp. */
  downloadName(): string {
    const archive = this.archive;
    if (!archive) return 'ChatLog.txt';
    return `ChatLog_${new Date(archive.archivedAt).toISOString().slice(0, 10)}.txt`;
  }
}
