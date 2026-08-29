import type { ChatArchiveBrowser, ChatArchiveView } from '#lib/server/chat-archive.js';

/**
 * The two dialogs this needs, as CALLBACKS rather than `RoomDialogs` itself.
 *
 * The owner is `LogArchiveModals.svelte`, which already receives `onAlert` and `onConfirm` from
 * `ModalHost` — so taking the class would mean threading a thirty-seventh state object through
 * three files that are each at their size ceiling, to reach a component that already holds both
 * functions. Narrowing to what is used is also what lets the test drive this with two spies.
 */
export interface ArchiveDialogs {
  alert(message: string): void;
  confirm(message: string, onconfirm: () => void): void;
}

/**
 * The chat archive, client side — `archiveOptions()` and the archives browser.
 *
 * ## The three strings are the capture's, including its punctuation
 *
 * From `archiveOptions()` at bundle byte 1,444,182 and `unarchiveLog()` at 2,304,726:
 *
 * ```
 * "Are you sure you want to archive the chats for everyone?"
 * "Are you sure you want to archive the chats older than selected date?"
 * "Please select a date."
 * "Are you sure you want to unarchive (restore) this chatlog?"
 * "Chatlog restored"
 * ```
 *
 * ## `$state.raw`, because the list is only ever replaced
 *
 * Every mutation answers with the server's whole list and it is assigned in one go. A deep proxy
 * over an array nothing mutates in place is overhead on every read.
 */
export interface ChatArchivePort {
  list(): Promise<ChatArchiveBrowser>;
  archive(channel: string, olderThan: number): Promise<{ messageCount: number }>;
  restore(archiveId: number): Promise<{ restored: number }>;
}

export class RoomChatArchive {
  readonly #dialogs: ArchiveDialogs;
  readonly #port: ChatArchivePort;

  /**
   * Which chat column the sweep acts on — upstream's `this.channel` on the send.
   *
   * A THUNK and not a constructor value, because the answer changes: the presenter switches between
   * the main log, the off-topic tab and the extra column while this object lives for the session.
   * Read at the moment the button is pressed, so the sweep is always the log they were looking at.
   */
  readonly #channel: () => string;

  #archives = $state.raw<readonly ChatArchiveView[]>([]);
  #channels = $state.raw<readonly string[]>([]);
  #loading = $state(false);
  #error = $state<string | null>(null);

  constructor(dialogs: ArchiveDialogs, port: ChatArchivePort, channel: () => string) {
    this.#dialogs = dialogs;
    this.#port = port;
    this.#channel = channel;
  }

  get archives(): readonly ChatArchiveView[] {
    return this.#archives;
  }

  /** The channels this presenter may sweep, named by the server. See `ChatArchiveBrowser`. */
  get channels(): readonly string[] {
    return this.#channels;
  }

  get loading(): boolean {
    return this.#loading;
  }

  /**
   * Shown instead of the list, never swallowed.
   *
   * An empty list and a list that would not load are the same picture, and one of them means "this
   * room has no archives" — which a presenter would act on by sweeping again.
   */
  get error(): string | null {
    return this.#error;
  }

  /** `loadLogs()` — the browser's own refresh, and what the modal calls when it opens. */
  async reload(): Promise<void> {
    this.#error = null;
    this.#loading = true;
    try {
      const browser = await this.#port.list();
      this.#archives = browser.archives;
      this.#channels = browser.channels;
    } catch {
      this.#error = 'Could not load the archive list.';
    } finally {
      this.#loading = false;
    }
  }

  /**
   * "Archive All" — upstream passes `new Date()`, so this is the same command with `now`.
   *
   * The moment is taken HERE rather than on the server, which is a deliberate difference from a
   * server-side `now()`: the confirmation a presenter agreed to named the log as it stood when they
   * clicked, and a round trip later "everything older than now" is a slightly larger set. Anything
   * posted in between stays live, which is the direction that cannot surprise anybody.
   */
  archiveAll(): void {
    const channel = this.#channel();
    this.#dialogs.confirm(
      'Are you sure you want to archive the chats for everyone?',
      () => void this.#sweep(channel, Date.now())
    );
  }

  /** "Archive Older than Selected Date", with upstream's own `isNaN` guard and its exact string. */
  archiveOlderThan(value: string): void {
    const channel = this.#channel();
    const picked = new Date(value);
    if (Number.isNaN(picked.getTime())) {
      this.#dialogs.alert('Please select a date.');
      return;
    }
    this.#dialogs.confirm(
      'Are you sure you want to archive the chats older than selected date?',
      () => void this.#sweep(channel, picked.getTime())
    );
  }

  /** `unarchiveLog()` — the confirm, the send, and upstream's own success alert. */
  restore(archive: ChatArchiveView): void {
    this.#dialogs.confirm(
      'Are you sure you want to unarchive (restore) this chatlog?',
      () =>
        void this.#run(
          () => this.#port.restore(archive.id),
          'Chatlog restored',
          'Could not restore that archive.'
        )
    );
  }

  async #sweep(channel: string, olderThan: number): Promise<void> {
    await this.#run(
      async () => {
        const { messageCount } = await this.#port.archive(channel, olderThan);
        return { restored: messageCount };
      },
      null,
      'Could not archive the chat log.'
    );
  }

  /**
   * Run one mutation, then take the server's list as the answer.
   *
   * The list is re-read rather than patched, for the reason the server returns counts rather than
   * rows: an archive is a set of messages this client is not holding, so there is nothing local to
   * reconcile and a guess would be a second implementation of the query.
   *
   * The failure message is SHOWN rather than swallowed — and the archive path deliberately has no
   * success alert, because upstream's has none either: its own feedback is the log emptying.
   */
  async #run(
    mutate: () => Promise<{ restored: number }>,
    success: string | null,
    failure: string
  ): Promise<void> {
    this.#error = null;
    try {
      await mutate();
      if (success) this.#dialogs.alert(success);
      await this.reload();
    } catch {
      this.#error = failure;
    }
  }
}
