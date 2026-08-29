/*
  The room's floating menus — eleven booleans and ids that were declared separately and closed by
  two different functions with two different lists.

  ## What reading them together found

  Two closers existed and neither closed everything:

  | closer               | leaves open                                                    |
  |----------------------|----------------------------------------------------------------|
  | `openModal`          | `recording`, `soundcloud`, `screen`                             |
  | `closeFloatingMenus` | `emoji`, `giphy`                                                |

  So opening a modal left the recording, SoundCloud and screen-share dropdowns floating, and the
  outside-click closer left the emoji and GIF pickers open. Neither list is obviously wrong — the
  pickers live inside the chat composer and arguably should survive a top-bar click — but they were
  never *decided*, they drifted. Two hand-written lists of the same invariant is the failure this
  whole extraction exists to remove.

  **Both behaviours are preserved exactly**, as `closeForModal()` and `closeFloating()`. Changing
  what a control does needs capture evidence, and there is none either way; what changes is that the
  two lists are now named, adjacent, and pinned by tests, so the difference is a decision somebody
  can read and rule on instead of an accident nobody can see.

  ## Why the flags are NOT collapsed into one `open: MenuName | null`

  That was the obvious simplification and the evidence refused it. `toggleTopMenu` enforces mutual
  exclusion across `recording` / `soundcloud` / `screen` / `volume` by hand — so those four are
  exclusive — but `rosterSort`, `archives`, `notes` and `files` are each toggled independently and
  can genuinely be open together today. One field would silently make them exclusive, which is a UX
  change dressed as a refactor.

  `newNoteOpen` is deliberately NOT here. It looks like a twelfth menu and is not: it mirrors the
  notes editor's mounted state through a two-way binding with the child component, which is why no
  closer touches it.
*/

/** The three the top bar treats as mutually exclusive, per `toggleTopMenu`. */
export type TopMenu = 'recording' | 'soundcloud' | 'screen';

/** Every flag-shaped menu. The union is the allow-list a bare assignment never had. */
export type MenuName =
  | TopMenu
  | 'volume'
  | 'screenVolume'
  | 'streamBuffer'
  | 'rosterSort'
  | 'archives'
  | 'notes'
  | 'files'
  | 'emoji'
  | 'giphy';

export class RoomMenus {
  #volume = $state(false);
  /*
    The two dropdowns that had no state at all until 2026-08-29, so neither could be opened. Why,
    and what else it broke, is in `bootstrap-dropdown-contract.test.ts`, which now enforces it.

    They join this class rather than growing a private `$state` each, which is what makes the
    window-click closer below cover them for free. `screenVolume` is SEPARATE from `volume` on
    purpose: two different dropdowns, the navbar's and the presentation area's, and one flag would
    open both at once.
  */
  #screenVolume = $state(false);
  #streamBuffer = $state(false);
  #recording = $state(false);
  #soundcloud = $state(false);
  #screen = $state(false);
  #rosterSort = $state(false);
  #archives = $state(false);
  #notes = $state(false);
  #files = $state(false);
  #emoji = $state(false);
  #giphy = $state(false);
  /** The roster row whose per-user menu is open, or null. Not a boolean: it names WHICH row. */
  #userId = $state<number | null>(null);
  /** The same for a message's context menu, keyed by the message's string id. */
  #messageId = $state<string | null>(null);

  get volume(): boolean {
    return this.#volume;
  }
  get screenVolume(): boolean {
    return this.#screenVolume;
  }
  get streamBuffer(): boolean {
    return this.#streamBuffer;
  }
  get recording(): boolean {
    return this.#recording;
  }
  get soundcloud(): boolean {
    return this.#soundcloud;
  }
  get screen(): boolean {
    return this.#screen;
  }
  get rosterSort(): boolean {
    return this.#rosterSort;
  }
  get archives(): boolean {
    return this.#archives;
  }
  get notes(): boolean {
    return this.#notes;
  }
  get files(): boolean {
    return this.#files;
  }
  get emoji(): boolean {
    return this.#emoji;
  }
  get giphy(): boolean {
    return this.#giphy;
  }
  get userId(): number | null {
    return this.#userId;
  }
  get messageId(): string | null {
    return this.#messageId;
  }

  /**
   * `toggleTopMenu` — the four the top bar keeps mutually exclusive.
   *
   * Toggling the named one and closing the other three is what the hand-written version did across
   * four assignment lines; the exclusivity is structural here, so a fifth top menu cannot be added
   * without joining it.
   */
  toggleTop(menu: TopMenu): void {
    const next = { recording: false, soundcloud: false, screen: false };
    next[menu] = !this[menu];
    this.#recording = next.recording;
    this.#soundcloud = next.soundcloud;
    this.#screen = next.screen;
    this.#volume = false;
  }

  /**
   * Set or toggle one flag by name.
   *
   * A named setter per menu would be ten near-identical three-line methods; the call sites read
   * `menus.set('emoji', false)` and `menus.toggle('notes')`, which is what they said before as
   * `emojiOpen = false` and `notesMenuOpen = !notesMenuOpen`. The union type is the allow-list —
   * a menu that does not exist is a compile error, where the old assignments could name anything.
   */
  set(menu: MenuName, open: boolean): void {
    if (menu === 'volume') this.#volume = open;
    else if (menu === 'screenVolume') this.#screenVolume = open;
    else if (menu === 'streamBuffer') this.#streamBuffer = open;
    else if (menu === 'recording') this.#recording = open;
    else if (menu === 'soundcloud') this.#soundcloud = open;
    else if (menu === 'screen') this.#screen = open;
    else if (menu === 'rosterSort') this.#rosterSort = open;
    else if (menu === 'archives') this.#archives = open;
    else if (menu === 'notes') this.#notes = open;
    else if (menu === 'files') this.#files = open;
    else if (menu === 'emoji') this.#emoji = open;
    else this.#giphy = open;
  }

  toggle(menu: MenuName): void {
    this.set(menu, !this[menu]);
  }

  openUserMenu(userId: number | null): void {
    this.#userId = userId;
  }

  /** `userMenuId = userMenuId === user.id ? null : user.id` — clicking the open row closes it. */
  toggleUserMenu(userId: number): void {
    this.#userId = this.#userId === userId ? null : userId;
  }

  openMessageMenu(messageId: string | null): void {
    this.#messageId = messageId;
  }

  /** The same toggle-by-identity for a message's context menu. */
  toggleMessageMenu(messageId: string): void {
    this.#messageId = this.#messageId === messageId ? null : messageId;
  }

  /**
   * What `openModal` closed. Leaves the three top-bar dropdowns open — see the header; preserved,
   * not endorsed.
   */
  closeForModal(): void {
    this.#volume = false;
    this.#screenVolume = false;
    this.#streamBuffer = false;
    this.#rosterSort = false;
    this.#archives = false;
    this.#notes = false;
    this.#files = false;
    this.#userId = null;
    this.#messageId = null;
    this.#emoji = false;
    this.#giphy = false;
  }

  /** What `closeFloatingMenus` closed. Leaves the emoji and GIF pickers open — same note. */
  closeFloating(): void {
    this.#volume = false;
    this.#screenVolume = false;
    this.#streamBuffer = false;
    this.#recording = false;
    this.#soundcloud = false;
    this.#screen = false;
    this.#rosterSort = false;
    this.#archives = false;
    this.#notes = false;
    this.#files = false;
    this.#userId = null;
    this.#messageId = null;
  }
}
