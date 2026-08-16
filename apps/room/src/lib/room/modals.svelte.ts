import { invalidateAll } from '$app/navigation';

import { saveTheme } from '../../routes/user-settings.remote';
import type { AlertTab, ModalName, SessionControlTab, SettingsTab, Theme } from '$lib/types';

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
    userActions: { loadManaged(): void };
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
  }) {
    this.#menus = options.menus;
    this.#polls = options.polls;
    this.#messageActions = options.messageActions;
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
  readonly #userActions: { loadManaged(): void };
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
    this.#modal = null;
  }

  async submitPollAction(
    action: 'savePoll' | 'deleteSavedPoll' | 'sendPoll' | 'sendPollAnswer' | 'pollDone',
    values: Record<string, string | number> = {}
  ) {
    const body = new FormData();
    for (const [key, value] of Object.entries(values)) body.set(key, String(value));

    const response = await fetch(`?/${action}`, { method: 'POST', body });
    if (!response.ok) return false;
    await invalidateAll();
    return true;
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

  downloadImage(url: string) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onload = () => {
      const urlCreator = window.URL;
      const imageUrl = urlCreator.createObjectURL(xhr.response);
      const tag = document.createElement('a');
      let imageName = url.split('/').pop() || 'image.jpg';
      imageName = imageName.replace(/^[^_]+_/, '').replace(/_[^_]+(\.[^.]+)$/, '$1');
      tag.href = imageUrl;
      tag.download = imageName;
      tag.style.display = 'none';
      document.body.appendChild(tag);
      tag.click();
      tag.remove();
      urlCreator.revokeObjectURL(imageUrl);
    };
    xhr.send();
  }

  toggleTopMenu(menu: 'recording' | 'soundcloud' | 'screen') {
    this.#menus.toggleTop(menu);
  }
}
