import { type AlertFilterFor, alertPassesFilter, hasActiveAlertFilter } from '$lib/alert-filter';

/*
  The alerts pane's own state — the two-state toolbar, the viewer's Alert Filter, the archive
  cut-off and the search term.

  ## The scope, and what is deliberately left behind

  `visibleAlerts` and `searchableAlerts` STAY in the page, and that is a boundary rather than an
  omission. Both thread `data.alerts` through evidence-hidden rules, an unread-Q&A set and the page's
  own merge of older pages; pulling them here would make this class depend on four things it has no
  other business with, to save two `$derived` lines. What moves is every PREDICATE it owns, so the
  page's chain reads as a list of named filters instead of five inline closures.

  The alerts PAGING — `olderAlerts`, `alertsPage`, `alertsHasMoreData`, `alertsLoadingMore` — also
  stays, and for a stronger reason: it is not alerts machinery. Upstream renders ONE roomlog
  component for both logs, switched on `logType`, so the trigger, the guards, the terminator and both
  scroll nudges are the same code for chat and alerts. Moving the alerts half here would split a
  thing that is deliberately one thing, and leave the chat half looking for its twin.

  ## Why the two toolbar flags are not one

  `app-alerts` carries a second flag and two separate toggles
  (`docs/source/components/app-alerts.compiled.js:16-17,134-150`), and its template gates three
  regions on the second one (`app-alerts.render-helpers.js:160-196`):

  ```
  div.alertsToolbar                      <- showAlertsToolbar
    div.d-flex…justify-content-between   <- showAlertsToolbarExtended   (checkbox, Detach, buttons)
    form#alert-settings                  <- always
      input + span#addon-chat-clear      <- always
      span#addon-chat-save + archive     <- showAlertsToolbarExtended
  ```

  So the magnifier opens a search-only strip and the gear opens the full one. This room had a single
  flag, so the magnifier opened everything and the gear opened the alert-filter modal instead of
  expanding the toolbar.
*/

/** One rendered alert, as much of it as the predicates here need. */
export interface AlertRow {
  readonly body: string;
  readonly senderName: string;
  readonly senderEmailHash?: string | null;
  readonly createdAt: string | number | Date;
}

/** What {@link RoomAlerts.filterChanged} decided should be persisted, for the page to write. */
export interface AlertFilterWrite {
  readonly alertFilterFor: AlertFilterFor;
  readonly showAlertsFrom: boolean;
}

export class RoomAlerts {
  /*
    The captured alerts toolbar (`alert-section/datach-alerts-1`) is a strip between the alerts
    header and the scroller. It is absent from the default capture (`alert-section/1.html` states
    "No alertsToolbar search strip in this snapshot"), so it is toggled, not permanent.
  */
  #toolbarOpen = $state(false);
  #toolbarExtended = $state(false);
  #inlineEntry = $state(false);
  #search = $state('');

  /**
   * `globals.user.alertFilterFor` and `preferences.showAlertsFrom` — the Alert Filter.
   *
   * `$state.raw` on the map for the same reason `presenterAudio` uses it: every transition in
   * `$lib/alert-filter` REPLACES the object rather than mutating it, so a deep proxy would cost a
   * proxy per key and buy nothing.
   */
  #filterFor = $state.raw<AlertFilterFor>({});
  #showFrom = $state(false);

  /**
   * "Archive Alerts Messages" records a CUT-OFF rather than deleting anything.
   *
   * Alerts at or before it drop out of the list and the alerts themselves stay in the database. The
   * capture gives the control a title and a trash icon but no evidence of its server semantics, so
   * this is the conservative reading — nothing is destroyed, and clearing the stored preference
   * restores the full list.
   *
   * `null` means no archive has been taken, which is NOT the same as a cut-off of 0. Captured alerts
   * carry `createdAt: new Date(0)` (`captured-room.ts`), so a 0 default made the `createdAt > cutoff`
   * test false for every one of them and silently hid the entire captured alert list until the
   * reader archived something.
   */
  #archivedAt = $state<number | null>(null);

  /**
   * Seeded from the stored preferences, which is where `updateAlertFilter` persists them — the
   * reference sends the map to the server AND calls `setPreference('showAlertsFrom', …)` in the same
   * expression, byte 1,221,491.
   *
   * The three values are taken by the caller from its decoded settings snapshot rather than read
   * here, because reading a preference store is the page's job and this class has no writer for one
   * — {@link filterChanged} and {@link archive} RETURN what should be persisted.
   */
  constructor(seed: {
    alertFilterFor: AlertFilterFor;
    showAlertsFrom: boolean;
    archivedAt: number | null;
  }) {
    this.#filterFor = seed.alertFilterFor;
    this.#showFrom = seed.showAlertsFrom;
    this.#archivedAt = seed.archivedAt;
  }

  /**
   * The stored map, taken strictly rather than coerced.
   *
   * Same posture as `readPresenterMuteMap`: the value is `avatar hash -> username`, and an entry
   * whose value is not a string is DROPPED rather than turned into a truthy placeholder. A junk
   * entry that survived would filter out a trader nobody selected, and in the allow-list direction
   * it would hide almost every alert in the room.
   */
  static readFilterFor(stored: unknown): AlertFilterFor {
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
    const map: AlertFilterFor = {};
    for (const [hash, username] of Object.entries(stored as Record<string, unknown>)) {
      if (typeof username === 'string') map[hash] = username;
    }
    return map;
  }

  get toolbarOpen(): boolean {
    return this.#toolbarOpen;
  }

  get toolbarExtended(): boolean {
    return this.#toolbarExtended;
  }

  get inlineEntry(): boolean {
    return this.#inlineEntry;
  }

  set inlineEntry(on: boolean) {
    this.#inlineEntry = on;
  }

  get search(): string {
    return this.#search;
  }

  set search(term: string) {
    this.#search = term;
  }

  /*
    WRITABLE, both of them, because the alert-filter modal edits them live through `bind:` and that
    is the captured behaviour rather than an accident: clicking a trader updates the header badge
    immediately, before anything is saved. `alertFilterActive` derives from `filterSelected`, so a
    read-only pair would have frozen the badge until the modal was closed.

    So there are two write paths and they are different things. These setters are the modal's DRAFT.
    {@link filterChanged} is the COMMIT — it takes the final pair and returns what the page should
    persist. Collapsing them would either lose the live badge or persist on every click of a trader
    row.
  */
  get filterFor(): AlertFilterFor {
    return this.#filterFor;
  }

  set filterFor(next: AlertFilterFor) {
    this.#filterFor = next;
  }

  get showFrom(): boolean {
    return this.#showFrom;
  }

  set showFrom(on: boolean) {
    this.#showFrom = on;
  }

  get archivedAt(): number | null {
    return this.#archivedAt;
  }

  /**
   * `globals.doFilteredAlerts` (byte 1,221,430) — is a selection currently in force?
   *
   * Drives the header badge ALONE, and its gate in the capture is the conjunction rather than this
   * value by itself: `O(6, sessData.modAlertFilterList && doFilteredAlerts ? 6 : -1)` at byte
   * 2,056,460. The room half of that conjunction is session config and stays in the page, so this
   * answers only "has this viewer selected anybody".
   */
  get filterSelected(): boolean {
    return hasActiveAlertFilter(this.#filterFor);
  }

  /**
   * `toggleAlertsToolbar()` — the gear (`app-alerts.compiled.js:134-140`):
   *
   * ```js
   * this.showAlertsToolbar && !this.showAlertsToolbarExtended
   *   ? (this.showAlertsToolbarExtended = !0)
   *   : ((this.showAlertsToolbar = !this.showAlertsToolbar),
   *      this.showAlertsToolbar && (this.showAlertsToolbarExtended = !0)),
   * this.appService.guiEventBus.emit('scrollAlertLogToBottom');
   * ```
   *
   * Note the first branch: with a search-only strip already open the gear EXPANDS it rather than
   * closing it, so the two controls do not fight each other.
   *
   * The `scrollAlertLogToBottom` emit is NOT here — the strip changes height, so the log has to be
   * re-pinned, and the scroller is the page's element. Returning nothing and letting the caller
   * scroll keeps this class free of the DOM.
   */
  toggleToolbar(): void {
    if (this.#toolbarOpen && !this.#toolbarExtended) {
      this.#toolbarExtended = true;
      return;
    }
    this.#toolbarOpen = !this.#toolbarOpen;
    if (this.#toolbarOpen) this.#toolbarExtended = true;
  }

  /**
   * `toggleAlertsToolbarSearchOnly()` — the magnifier (`app-alerts.compiled.js:141-150`):
   *
   * ```js
   * (this.showAlertsToolbar && this.showAlertsToolbarExtended) ||
   *   (this.showAlertsToolbar = !this.showAlertsToolbar),
   * this.showAlertsToolbarExtended = !1,
   * this.showAlertsToolbar && setTimeout(() => { … focus the search box … });
   * ```
   *
   * The mirror of the gear: from the FULL toolbar it collapses to search-only instead of closing,
   * and it always ends with the extended regions hidden. Returns whether the strip is now open, so
   * the caller knows whether there is a search box to focus.
   */
  toggleSearchOnly(): boolean {
    if (!(this.#toolbarOpen && this.#toolbarExtended)) this.#toolbarOpen = !this.#toolbarOpen;
    this.#toolbarExtended = false;
    return this.#toolbarOpen;
  }

  /**
   * `updateAlertFilter` — the reference persists the map server-side AND sets the preference.
   *
   * This room has one mechanism for both: `savePreference` already stores arbitrary JSON per user
   * and already carries map-shaped values, so no new endpoint is needed. The observable result is
   * the reference's — the selection survives a reload — and the write is RETURNED rather than
   * performed, which is the same decision/effect split `RoomSplit.endDrag` uses.
   */
  filterChanged(next: AlertFilterWrite): AlertFilterWrite {
    this.#filterFor = next.alertFilterFor;
    this.#showFrom = next.showAlertsFrom;
    return next;
  }

  /**
   * Take an archive cut-off. Returns the timestamp to persist.
   *
   * `now` is a parameter rather than `Date.now()` so the cut-off is drivable by a test, and so the
   * one clock reading is shared by the state and the preference — two calls could straddle an alert
   * arriving and archive it out of the list while storing a cut-off that does not cover it.
   */
  archive(now: number): number {
    this.#archivedAt = now;
    return now;
  }

  /**
   * The captured search field reads "Type your search term, then press Enter", so the term filters
   * the alert list. It is applied against the rendered body and the sender NAME only — the fields
   * the reader can actually see — rather than against metadata they cannot.
   */
  matchesSearch = (item: AlertRow): boolean => {
    const term = this.#search.trim().toLowerCase();
    if (!term) return true;
    return item.body.toLowerCase().includes(term) || item.senderName.toLowerCase().includes(term);
  };

  /**
   * Alerts at or before the cut-off drop out of the list. No cut-off keeps everything.
   *
   * `svelte-autofixer` suggests `SvelteDate` for the construction below and it is wrong here, which
   * is worth writing down because the suggestion will come back every time this file is checked.
   * `SvelteDate` earns its place when a Date is MUTATED and read reactively — a clock, a picker.
   * This one is parsed from a row, read once, and discarded inside a predicate; making it reactive
   * would allocate a signal per alert per render and nothing would ever invalidate it.
   */
  afterArchive = (item: AlertRow): boolean =>
    this.#archivedAt === null || new Date(item.createdAt).getTime() > this.#archivedAt;

  /**
   * THE ALERT FILTER, as a predicate this viewer can be asked for directly.
   *
   * `senderEmailHash` is this room's name for what the reference calls `avt`: the gravatar hash of
   * the sender's email, which is what the selection is keyed by. `alerts-advanced-search.ts` matches
   * on the same field for the same reason.
   *
   * The decision itself stays in `$lib/alert-filter` because it fails OPEN in three distinct ways;
   * what this adds is that the two viewer-owned halves no longer have to be passed in at each of the
   * call sites, which is where they used to drift apart.
   *
   * An ARROW FIELD rather than a method, here and above, so `.filter(alerts.passesFilter(raw))` and
   * `.filter(alerts.matchesSearch)` keep their `this` — a plain method handed to `filter` loses it
   * and would throw on the first private-field read.
   */
  passesFilter =
    (modAlertFilterListRaw: string | null | undefined) =>
    (item: AlertRow): boolean =>
      alertPassesFilter({
        avatarHash: item.senderEmailHash,
        alertFilterFor: this.#filterFor,
        showAlertsFrom: this.#showFrom,
        modAlertFilterListRaw
      });
}
