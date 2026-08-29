import type { UserNoteView } from '#lib/server/user-notes.js';
import type { RoomDialogs } from './dialogs.svelte';

/**
 * The per-member ADMIN NOTES list — what is behind the door `RoomNotesAccess` opens.
 *
 * ## Why it is a second module and not part of that one
 *
 * They are two different things that happen to be adjacent. `RoomNotesAccess` answers one question
 * — may this presenter manage notes — and holds one flag. This holds a list, three async calls and
 * two dialogs, and it is meaningless until that question has been answered yes.
 *
 * Merging them would also merge their failure modes: a password check that could not reach the
 * controller and a note that could not be written are different sentences to a presenter, and a
 * class that owned both would end up with one `#error` for both.
 *
 * ## The capture (bundle byte 2,079,597), which is where the two prompts come from
 *
 * ```js
 * addNote()        { bootbox.prompt("Enter your note below", note => …addUserNote {user, note}) }
 * deleteNode(e, i) { bootbox.confirm("Are you sure you want to delete this note by "+e.name+" ?",
 *                                     ok => …delUserNote {user, noteIDX: i}) }
 * ```
 *
 * Both strings are transcribed exactly, including the space before the `?`, which is upstream's.
 * The confirm names the note's AUTHOR — not its subject — because that is what it asks about: the
 * note you are deleting is somebody's, and the presenter deleting it may not be the one who wrote
 * it.
 *
 * ## `$state.raw`, and why it is the right rune here
 *
 * `#notes` is only ever REPLACED — every mutation returns the whole new list from the server and it
 * is assigned wholesale, exactly as upstream does with `user.notes = resp.notes`. A deep `$state`
 * proxy over an array that is never mutated in place is overhead on every read, which is the trap
 * `CLAUDE.md` names first.
 */
export interface UserNotesPort {
  list(subjectUserId: number): Promise<UserNoteView[]>;
  add(subjectUserId: number, note: string): Promise<UserNoteView[]>;
  remove(subjectUserId: number, noteId: number): Promise<UserNoteView[]>;
}

export class RoomUserNotes {
  readonly #dialogs: RoomDialogs;
  readonly #port: UserNotesPort;
  readonly #granted: () => boolean;

  #notes = $state.raw<readonly UserNoteView[]>([]);
  #subjectUserId: number | null = null;
  #loading = $state(false);
  #error = $state<string | null>(null);

  constructor(dialogs: RoomDialogs, port: UserNotesPort, granted: () => boolean) {
    this.#dialogs = dialogs;
    this.#port = port;
    this.#granted = granted;
  }

  /**
   * Upstream's `allowToManageNotes`, READ from the door rather than held again.
   *
   * A thunk and not a copy: `RoomNotesAccess` owns the flag, and two classes holding their own
   * version of "is the door open" is how one of them ends up stale — the failure `room-defaults.ts`
   * and the tenancy kernel both record in different words.
   *
   * The direction of the coupling is the only one that makes sense, and it is the one this class's
   * header already states: the list is meaningless until the door is open, so the list asks the
   * door. Nothing flows back.
   */
  get canManage(): boolean {
    return this.#granted();
  }

  get notes(): readonly UserNoteView[] {
    return this.#notes;
  }

  get loading(): boolean {
    return this.#loading;
  }

  /**
   * Why the failure is SHOWN rather than swallowed.
   *
   * An empty list and a list that could not be loaded look identical, and one of them means "this
   * member has no notes" — which a presenter would act on. `CLAUDE.md`: invalid input fails loud, no
   * silent fallbacks. The panel renders this instead of the list when it is set.
   */
  get error(): string | null {
    return this.#error;
  }

  /**
   * Load the notes for one member.
   *
   * Called when the notes tab is opened AND the door is already open — never speculatively, because
   * every call is a server round trip that the password gate would refuse anyway.
   *
   * The subject is remembered so `add` and `remove` cannot be called for a member the panel is not
   * showing. They take no id of their own for exactly that reason: a second parameter is a second
   * chance to pass the wrong one.
   */
  async open(subjectUserId: number): Promise<void> {
    /*
      The gate is checked HERE and not at the two call sites, because there are two: the notes tab
      being clicked, and the door announcing that it just opened. A guard duplicated at both is a
      guard one of them eventually loses — and the server refuses either way, so the only thing this
      saves is a request that would come back 403 and paint an error over an empty panel.
    */
    if (!this.canManage) return;

    this.#subjectUserId = subjectUserId;
    this.#notes = [];
    this.#error = null;
    this.#loading = true;
    try {
      this.#notes = await this.#port.list(subjectUserId);
    } catch {
      this.#error = 'Could not load this member’s notes.';
    } finally {
      this.#loading = false;
    }
  }

  /** Forget everything when the modal closes, so the next member never flashes the last one's notes. */
  close(): void {
    this.#subjectUserId = null;
    this.#notes = [];
    this.#error = null;
    this.#loading = false;
  }

  /** `addNote()` — the reference's prompt, then the write, then the server's own list. */
  add(): void {
    const subjectUserId = this.#subjectUserId;
    if (subjectUserId === null) return;

    this.#dialogs.prompt = {
      title: 'Enter your note below',
      value: '',
      onconfirm: (typed) => {
        this.#dialogs.prompt = null;
        const note = typed.trim();
        /*
          Upstream's `i && …`: an empty answer closes the dialog and says nothing. The server rejects
          an empty note too — `z.string().trim().min(1)` — so this is the cheap half of a check that
          is also made where it cannot be edited out.
        */
        if (note === '') return;
        void this.#apply(() => this.#port.add(subjectUserId, note), 'Could not add that note.');
      }
    };
  }

  /**
   * `deleteNode(note, index)` — with the INDEX replaced by the note's own id.
   *
   * The divergence is recorded on the table itself; the short version is that an ordinal addresses
   * a note by where it happened to be in the list the browser was rendering, and two presenters
   * with the modal open delete different notes.
   */
  remove(note: UserNoteView): void {
    const subjectUserId = this.#subjectUserId;
    if (subjectUserId === null) return;

    /*
      `dialogs.confirm(message, onconfirm)` and NOT an assignment to `dialogs.confirmation`. The
      method closes the dialog before running the handler; every call site that built the object by
      hand had to remember that as its own first line, and the one that forgot left the dialog on
      screen behind whatever happened next. That file records it; this is the file taking the advice.
    */
    this.#dialogs.confirm(
      `Are you sure you want to delete this note by ${note.authorName} ?`,
      () =>
        void this.#apply(
          () => this.#port.remove(subjectUserId, note.id),
          'Could not delete that note.'
        )
    );
  }

  /**
   * Run a mutation and take the server's list as the answer.
   *
   * NOT optimistic, and not because optimism is hard here. `CLAUDE.md` records the specific trap —
   * an optimistic delete followed by a reload flips the loading skeleton — and the reason it does
   * not apply is simpler: these two calls are the only writers, both return the authoritative list,
   * and a note is a durable record about a person. Showing one as saved before it is would be the
   * `admin-notes-password` defect in a new place: a control that reports success it does not have.
   *
   * `#loading` is deliberately NOT set. The list is already on screen and stays on screen; raising
   * the skeleton for a one-row change is the flicker the same note warns about.
   */
  async #apply(run: () => Promise<UserNoteView[]>, failure: string): Promise<void> {
    this.#error = null;
    try {
      this.#notes = await run();
    } catch {
      this.#error = failure;
    }
  }
}
