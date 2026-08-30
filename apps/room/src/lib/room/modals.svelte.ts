import { invalidateAll } from '$app/navigation';

import {
  deleteSavedPoll,
  pollDone,
  savePoll,
  sendPoll,
  sendPollAnswer
} from '../../routes/polls.remote';
import { saveTheme } from '../../routes/user-settings.remote';
import type { AlertTab, ModalName, SessionControlTab, SettingsTab, Theme } from '#lib/types.js';

import type { RoomMenus } from './menus.svelte';
import type { RoomPolls } from './polls.svelte';

/**
 * WHICH OVERLAY IS SHOWING, and how it is configured.
 *
 * Phase 5 slice 24. Ten functions and five fields: the modal name, the tab each modal opens on, the
 * image the lightbox is holding, and the two actions — poll submission and image download — that
 * are reached only from inside one.
 *
 * **The STATE moved with the functions, which is why this slice has no shared fields.** An earlier
 * measurement of the same ten functions reported `modal`, `sessionControlInitialTab` and
 * `selectedImageUrl` as written on both sides — because the functions were leaving and their state
 * was not. Taking both makes this class the single writer, and the reader-plus-receiver plumbing
 * that would otherwise have crossed the boundary three times simply does not exist.
 *
 * That is the difference between extracting a domain and extracting a list of functions, and the
 * dependency scan is what makes it visible before the code is written rather than after.
 *
 * **`theme` deliberately did NOT come.** `setTheme` writes it, so it looked like part of this — but
 * thirteen other places read it, including the sidebar, the feeds and the modal host, and a field
 * this widely read belongs where everything can see it. It crosses as a receiver instead.
 *
 * A plain `.ts`: these are `$state` fields, so it is `.svelte.ts` — see the note on the rune below.
 */
export class RoomModals {
  #modal: ModalName;
  #settingsTab: SettingsTab;
  #alertTab: AlertTab;
  #sessionControlInitialTab: SessionControlTab;
  #selectedImageUrl: string | null;
  constructor(options: {
    menus: RoomMenus;
    polls: RoomPolls;
    /** What a closing modal reaches for: the selection it was about, and the managed list. */
    messageActions: { clearSelected(): void; readonly selected: { id: number } | null };
    userActions: { loadManaged(): void; hydrateDetail(): void };
    /** The Q&A unread marker, cleared when the questions modal is opened. */
    unreadQaAlertIds: { clear(): void; delete(id: number): boolean };
    /**
     * A RECEIVER, because `theme` did not travel.
     *
     * `setTheme` writes it, so it looked like part of this domain — but thirteen other places
     * READ it, including the sidebar, the feeds and the modal host. A field that widely read
     * belongs where everything can see it.
     */
    setTheme: (next: Theme) => void;
    /**
     * Forget the debug log a presenter was reading.
     *
     * A STRUCTURAL TYPE rather than `RoomDebugLog`, like `messageActions` and `userActions` above:
     * this class needs one method, and naming the whole class would couple the modal registry to a
     * feature it otherwise knows nothing about.
     */
    debugLog: { clearReceived(): void };
  }) {
    this.#menus = options.menus;
    this.#polls = options.polls;
    this.#messageActions = options.messageActions;
    this.#debugLog = options.debugLog;
    this.#userActions = options.userActions;
    this.#unreadQaAlertIds = options.unreadQaAlertIds;
    this.#setTheme = options.setTheme;

    this.#modal = $state(null);

    this.#settingsTab = $state('app');

    this.#alertTab = $state('text');

    this.#sessionControlInitialTab = $state<SessionControlTab>('reset-session');

    this.#selectedImageUrl = $state<string | null>(null);
  }

  readonly #menus: RoomMenus;
  readonly #polls: RoomPolls;
  readonly #messageActions: { clearSelected(): void; readonly selected: { id: number } | null };
  readonly #debugLog: { clearReceived(): void };
  readonly #userActions: { loadManaged(): void; hydrateDetail(): void };
  readonly #unreadQaAlertIds: { clear(): void; delete(id: number): boolean };
  readonly #setTheme: (next: Theme) => void;

  /*
    Every field is READ by the template and WRITTEN here, so each is a getter plus a setter rather
    than a getter plus a receiver.

    That is the opposite of the choice `RoomFeedScroll` made for its scroll flags, and the reason is
    the number of writers. A scroll flag had two, and collapsing them to one was the point. These
    have exactly one — this class — and the setters exist so `RoomOverlays` can bind, which is what
    a dialog closing itself is.
  */
  get modal(): ModalName {
    return this.#modal;
  }

  set modal(next: ModalName) {
    this.#modal = next;
  }

  get settingsTab(): SettingsTab {
    return this.#settingsTab;
  }

  set settingsTab(next: SettingsTab) {
    this.#settingsTab = next;
  }

  get alertTab(): AlertTab {
    return this.#alertTab;
  }

  set alertTab(next: AlertTab) {
    this.#alertTab = next;
  }

  get sessionControlInitialTab(): SessionControlTab {
    return this.#sessionControlInitialTab;
  }

  get selectedImageUrl(): string | null {
    return this.#selectedImageUrl;
  }

  set selectedImageUrl(next: string | null) {
    this.#selectedImageUrl = next;
  }

  open(name: Exclude<ModalName, null>) {
    if (name === 'muted' || name === 'followed' || name === 'user') this.#userActions.loadManaged();
    // HERE because this is the one place the card is SHOWN, which the selection is not:
    // `RoomUserActions.hydrateDetail` records what hanging it off the selection instead cost.
    if (name === 'user') this.#userActions.hydrateDetail();
    this.#modal = name;
    this.#menus.closeForModal();
  }

  openPollUI() {
    /*
      `requestOpen` restores a minimised poll rather than rebuilding it, and says so by bumping the
      token the modal watches. Both paths open the modal; only a fresh one goes through `openModal`,
      which closes the floating menus on the way.
    */
    const wasMinimized = this.#polls.minimized;
    this.#polls.requestOpen();
    if (wasMinimized) this.#modal = 'poll';
    else this.open('poll');
  }

  minimizePoll() {
    this.#polls.minimize();
    this.#modal = null;
  }

  closeActive() {
    if (this.#modal === 'poll') this.#polls.closed();
    // The modal component clears the marker again on the way out, which is the path that matters
    // when an answer lands while the modal is already open - that update sets unreadQA and emits
    // `openAlertQAModal` with `openModal: !1`, so only the close can clear it:
    //   yi(`.${e._id}`).on('hidden.bs.modal', () => { ... delete e.unreadQA })
    if (this.#modal === 'qa' && this.#messageActions.selected)
      this.#unreadQaAlertIds.delete(this.#messageActions.selected.id);
    /*
      One member's console does not sit in a presenter's page for the rest of the session. Without
      this, re-opening the Debug Log modal for any reason would show whoever answered LAST, under
      whatever title that answer carried — which reads as a fresh reply and is not one.
    */
    if (this.#modal === 'debug') this.#debugLog.clearReceived();
    this.#modal = null;
  }

  /**
   * THE FIVE POLL MUTATIONS, one method each, and the failure policy they share.
   *
   * ## What this replaced
   *
   * One `submitPollAction(action, values)` that built its endpoint at runtime —
   * ``fetch(`?/${action}`)`` over a five-member union, with a hand-built `FormData` body. Nothing
   * connected either end: the endpoint was a string assembled while the page ran, the values were
   * `Record<string, string | number>` stringified on the way out and re-parsed on the way in, and a
   * refusal arrived as `response.ok === false`. `remote-call-sites-contract.test.ts` opens with what
   * that costs — `presenterCommand` was deleted while its call site kept posting to it for three
   * commits, compiling the whole way.
   *
   * Each method below names an imported symbol. Delete one of the commands in `polls.remote.ts` and
   * this file stops compiling, which is the property the union could never have.
   *
   * ## Why they still return `boolean`, and why that is not a swallowed error
   *
   * `PollPanel` reads the answer — `if (await onsave(…)) onalert(POLL_SAVED_ALERT)` — so a refusal
   * must be FALSE rather than a rejection, or the panel raises *"Poll Saved to Pre-Canned
   * polls..."* over a poll that was refused and then loses the rejection to an unhandled promise.
   * That contract predates the conversion and is kept.
   *
   * What changed is that the cause is no longer thrown away. `submitPollAction` answered `false` and
   * discarded the response; {@link #mutate} logs the rejection before answering `false`, for the
   * reason {@link setTheme} gives one line further down — a `void`-ed rejection is a swallowed
   * error, and this repository does not write `.catch(() => {})`.
   */
  async #mutate(name: string, run: () => Promise<unknown>): Promise<boolean> {
    try {
      await run();
    } catch (cause) {
      // Surfaced, not swallowed: `false` tells the panel not to claim success, the log says why.
      console.error(`[poll] ${name}`, cause);
      return false;
    }
    /*
      The poll lists, the active poll and its tally are all built by the page LOAD, not by a remote
      query — so nothing refreshes them on its own and `invalidateAll()` is what the presenter sees.
      Kept from `submitPollAction`, and deliberately AFTER the mutation resolved: refetching over a
      refusal would redraw the same state and read as success.
    */
    await invalidateAll();
    return true;
  }

  /** *"Save Poll"* — add this draft to the room's Pre-Canned list. */
  savePoll(question: string, choices: readonly string[]): Promise<boolean> {
    return this.#mutate('savePoll', () => savePoll({ question, choices: [...choices] }));
  }

  /** Remove one Pre-Canned entry. Any presenter of the room may remove any of them. */
  deleteSavedPoll(pollId: number): Promise<boolean> {
    return this.#mutate('deleteSavedPoll', () => deleteSavedPoll({ pollId }));
  }

  /** *"Send Poll"* — close whatever this room had open and open this one. */
  sendPoll(question: string, choices: readonly string[]): Promise<boolean> {
    return this.#mutate('sendPoll', () => sendPoll({ question, choices: [...choices] }));
  }

  /** A member's vote. The INDEX is the vote, which is why the panel keys its list by index. */
  sendPollAnswer(choiceIndex: number): Promise<boolean> {
    return this.#mutate('sendPollAnswer', () => sendPollAnswer({ choiceIndex }));
  }

  /** *"End Poll"* — close the poll this presenter opened. */
  pollDone(): Promise<boolean> {
    return this.#mutate('pollDone', () => pollDone());
  }

  openSessionControl(tab: SessionControlTab = 'reset-session') {
    this.#sessionControlInitialTab = tab;
    this.open('session');
  }

  setTheme(nextTheme: Theme) {
    this.#setTheme(nextTheme);
    // Optimistic as always; the catch is here because a `void`-ed rejection is a swallowed error.
    void saveTheme(nextTheme).catch((cause) => console.error('saveTheme', nextTheme, cause));
  }

  openImage(event: MouseEvent | undefined, url: string) {
    const ctrlClick = (event as (MouseEvent & { ctrlClick?: boolean }) | undefined)?.ctrlClick;
    if (event && (event.shiftKey || event.altKey || ctrlClick)) {
      const imageWindow = window.open('', '', 'toolbar=0,location=0,resizable=1,scrollbars=1');
      if (!imageWindow) return;
      imageWindow.document.write(`<!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${url}</title>
                <style>
                  html,
                  body {
                      height: 100%;
                      width: 100%;
                      overflow-x: hidden;
                      overflow-y: auto;
                      background-color: #000;
                  }

                  body {
                      display: flex;
                      align-items: center;
                      justify-content: center;
                  }
                </style>
              </head>
              <body>
                <img src="${url}" alt="${url}" />
              </body>
            </html>`);
      return;
    }
    this.#selectedImageUrl = url;
  }

  toggleTopMenu(menu: 'recording' | 'soundcloud' | 'screen') {
    this.#menus.toggleTop(menu);
  }
}
