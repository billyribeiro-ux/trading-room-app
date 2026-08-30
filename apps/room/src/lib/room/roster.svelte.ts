import {
  RANDOM_USER_MINIMUM,
  type RosterEntryFlags,
  filterRosterToTrials,
  randomUserCandidates,
  searchRoster,
  sortRosterByNick
} from '#lib/roster-gates.js';
import { clampSimUserCount } from '#lib/sim-user-count.js';

/*
  Who is in the room — the live roster, the four header controls that filter it, the badge count and
  the random-user draw.

  ## What it does NOT own, deliberately

  **The gates.** `archivesAvailableTo`, `rosterBlockVisible`, `rosterCountVisibleTo` and
  `rosterRowVisible` are transcriptions in `#lib/roster-gates.js`, tested there against their truth
  tables, and they take a VIEWER and a SESSION. Both come from the page load. Pulling them in here
  would make this class the owner of the room's authority model, which is the opposite of the
  standard's "every authority decision is made on the server from data the server owns".

  **`isLimitedPresenter`.** It looks like it belongs here because the gates read it, and it does not:
  it is what a member BECOMES when a presenter hands them mic and screen
  (`globals.user.isPresenter = globals.isLimitedPresenter = globals.isPresenter = e.give`), written
  by a media command and read by three unrelated places. It stays in the page until `RoomMedia`
  lands, which is where its writer is. Moving it here for the convenience of one reader would be
  choosing the wrong owner and then having to explain it forever.

  **`talkingUsers`.** The phase plan grouped "talking" with the roster and the evidence disagreed.
  Its declaration sits between `micMuted` and `webcamMuted`, its writers are `startTalking` /
  `stopTalking` driven by SFU audio-producer announcements, and the comment above it says "talking"
  means A MICROPHONE IS OPEN rather than anything about presence. That is media state that happens
  to be keyed by user id. It goes to `RoomMedia`.

  ## The one external dependency, and how it is taken

  `rosterUsers` falls back to the page load's `connectedUsers` until the first `getRoster` frame
  lands, and the badge adds the session's `simUserCount`. Both live on `data`, which is a `$props()`
  value this module cannot import.

  They are taken as THUNKS read inside `$derived`, which is the documented shape: `$state`'s
  "passing state into functions" section shows exactly this — pass `() => a` rather than `a`, because
  "when you call a function, the arguments are the VALUES rather than the variables". Reading the
  thunk inside a derived tracks whatever it touches, so a navigation that replaces `data` still
  reaches the badge.
*/

/** The minimum an entry must have for the four list helpers to work on it. */
export type RosterMember = RosterEntryFlags & {
  id: number;
  displayName: string;
  email: string;
  emailHash?: string;
};

/** The random draw's dialog state: who was picked, and whether the suspense is over. */
export interface RandomUserPick<Entry> {
  readonly entry: Entry;
  readonly revealed: boolean;
}

/**
 * The three seconds between the giphy spinner and the name.
 *
 * `a.init(() => { setTimeout(() => { a.find('.bootbox-body').html('<h2 …>' + r.nick + '</h2>'),
 * $('.btn-random-user').css('display','inline-block') }, 3e3) })` — the suspense IS the dialog, and
 * "User Info" only becomes clickable once the name is up.
 */
export const RANDOM_USER_REVEAL_MS = 3000;

export class RoomRoster<Entry extends RosterMember> {
  /**
   * `globals.rosterCount`, from `case "getRosterCount": globals.rosterCount = parseInt(i.data)`.
   *
   * Null until the first frame lands, which is NOT the same as 0: the server-rendered roster stands
   * in until then rather than the badge flashing through zero on every page load.
   *
   * The defect it closed, recorded here because it is invisible from the field alone: before the
   * `/roster/` channel wrote this, the badge only ever showed the value baked in at page load, so a
   * member joining or leaving never changed it for anyone else.
   */
  #count = $state<number | null>(null);

  /**
   * `globals.roster` — who is actually in the room, pushed by the hub.
   *
   * Empty until the first `getRoster` frame, because the page load can only ever describe THIS
   * connection (`connectedUsers: [connectedUser]`). Until this existed the badge counted every
   * subscriber while the list rendered one hard-coded entry, so a presenter saw "Users: 2" over a
   * list containing only themselves.
   */
  #live = $state.raw<readonly Entry[]>([]);

  /*
    The roster header's four controls, every one of which was rendered and inert before this.

    `#sortByNick` / `#trialsOnly` are the two pipe arguments the capture applies to the list —
    `roster | sortUsers:isSortUsers | sortFTUsers:isSortFTUsers` — and `#searchOpen` / `#searchTerm`
    drive the input that `O(22, showUserSearch ? 22 : -1)` reveals.
  */
  #sortByNick = $state(false);
  #trialsOnly = $state(false);
  #searchOpen = $state(false);
  #searchTerm = $state('');

  /**
   * The search result as a SNAPSHOT, which is what the capture holds.
   *
   * `searchUsers()` assigns `visibleRoster = globals.roster.filter(...)` ONCE; the filtered list
   * then stays put until `clearSearch()` or the next `getRoster` frame resets it. Deriving it live
   * instead would silently re-run the filter as people join and leave, which reads as results
   * appearing under the cursor. Null means no search is active — distinct from an empty array,
   * which is a search that matched nobody.
   */
  #searched = $state.raw<readonly Entry[] | null>(null);

  #pick = $state.raw<RandomUserPick<Entry> | null>(null);
  /** Not `$state`: nothing renders from a timer handle. */
  #revealTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

  /*
    Given a value at DECLARATION and again in the constructor, which is not redundant.

    Every class field initialiser runs before the constructor body, so the `$derived` fields below
    are created while these are still unset. Nothing observes the placeholders — `$derived` is lazy,
    and by the time anything reads `#users` the constructor has long since run — but TypeScript
    checks declaration order rather than evaluation order, and it is right to: swap that laziness
    for an eager computation one day and an empty roster with a zero count is exactly what you get.

    The alternative is `this.#users = $derived(...)` inside the constructor, which Svelte allows.
    It puts twelve lines of geometry in a constructor to avoid two placeholders, so this is the
    smaller of the two costs and the reason is written down rather than left as a puzzle.
  */
  readonly #seed: () => readonly Entry[] = () => [];
  readonly #simUserCount: () => number = () => 0;

  constructor(sources: { seed: () => readonly Entry[]; simUserCount: () => number }) {
    this.#seed = sources.seed;
    this.#simUserCount = sources.simUserCount;
  }

  /*
    `$state.raw` on all three lists, and `$state` on nothing that holds one.

    Every one is REPLACED wholesale and never mutated in place: `#live` by a `getRoster` frame,
    `#searched` by `searchRoster` returning a fresh array, `#pick` by a new object on reveal. A deep
    proxy over a roster of 200 people would be paid for on every read of every field for no
    granular update anyone wants.

    `startTalking` in the page does `talkingUsers.push(...)` on a plain `$state` array, and that is
    the pattern this is NOT — which is one more reason that field belongs to whichever class ends up
    owning it rather than being copied here.
  */
  #users = $derived(this.#live.length > 0 ? this.#live : this.#seed());
  #visible = $derived(this.#searched ?? this.#users);
  #display = $derived(
    filterRosterToTrials(sortRosterByNick(this.#visible, this.#sortByNick), this.#trialsOnly)
  );
  /**
   * `globals.rosterCount + this.simUserCount` — the one number the navbar and the sidebar badge
   * both show.
   *
   * ## G14 — THE PADDING IS CLAMPED, and it was rendered verbatim
   *
   * ```js
   * e && (this.simUserCount = Number(e),
   *       this.simUserCount > 5e3 && (this.simUserCount = 5e3),
   *       this.simUserCount <= 0  && (this.simUserCount = 0))
   * ```
   * (bundle byte 2,499,409.) `simUserCount` is an owner-typed number that pads the headcount, and
   * neither end of it was bounded here: 50000 rendered as 50000 and -5 SUBTRACTED five from a real
   * roster, so a room of twelve could publish "7". A number that lies downwards is worse than one
   * that lies upwards, because nobody looks twice at it.
   *
   * `clampSimUserCount` carries the transcription, including that the reference's upper test is
   * `>` and its lower is `<=` — which makes 0 assign 0 and changes nothing, and is kept because a
   * transcription that tidies a redundant branch is no longer one. `Number(e)` is also upstream's,
   * so a non-numeric setting arrives as `NaN`; that case is ours to answer and the module says how.
   */
  #connectedCount = $derived(
    (this.#count ?? this.#users.length) + clampSimUserCount(this.#simUserCount())
  );

  /** Everyone in the room, live if the hub has spoken and the page load's seed if it has not. */
  get users(): readonly Entry[] {
    return this.#users;
  }

  /** The list after a search, before sorting. */
  get visible(): readonly Entry[] {
    return this.#visible;
  }

  /** The list as the sidebar renders it: searched, then sorted, then narrowed to trials. */
  get display(): readonly Entry[] {
    return this.#display;
  }

  get connectedCount(): number {
    return this.#connectedCount;
  }

  get sortByNick(): boolean {
    return this.#sortByNick;
  }

  get trialsOnly(): boolean {
    return this.#trialsOnly;
  }

  get searchOpen(): boolean {
    return this.#searchOpen;
  }

  get searchTerm(): string {
    return this.#searchTerm;
  }

  set searchTerm(term: string) {
    this.#searchTerm = term;
  }

  get pick(): RandomUserPick<Entry> | null {
    return this.#pick;
  }

  /** `case "getRosterCount": globals.rosterCount = parseInt(i.data)`. */
  countArrived(count: number): void {
    this.#count = count;
  }

  /**
   * A `getRoster` frame.
   *
   * `subscribe("getRoster", () => { this.visibleRoster = globals.roster; this.userSearchTermTxt = "" })`
   * — a new roster clears the search, term and all. The two are one event upstream and are one
   * method here, because a frame that replaced the list and left a stale filtered snapshot over it
   * would show a roster nobody is in.
   */
  rosterArrived(users: readonly Entry[]): void {
    this.#live = users;
    this.#searched = null;
    this.#searchTerm = '';
  }

  /** `sortUsers(){ this.isSortUsers = !this.isSortUsers; emit("sortUsers", …) }` */
  toggleSortByNick(): void {
    this.#sortByNick = !this.#sortByNick;
  }

  /** `sortFTUsers(){ this.isSortFTUsers = !this.isSortFTUsers; emit("sortFTUsers", …) }` */
  toggleTrialsOnly(): void {
    this.#trialsOnly = !this.#trialsOnly;
  }

  /**
   * `toggleUserSearch(){ this.showUserSearch = !this.showUserSearch;
   *   this.showUserSearch && setTimeout(() => document.getElementById('userSearchTermInput').focus(), 300) }`
   *
   * The 300ms is the input's reveal, and focusing before it exists does nothing. The page focuses it
   * with an attachment when it is actually in the DOM instead, which is the same intent without a
   * timer that can outlive the element.
   */
  toggleSearch(): void {
    this.#searchOpen = !this.#searchOpen;
  }

  /**
   * `searchUsers(){ this.visibleRoster = globals.roster.filter(…) }`
   *
   * Filters the LIVE roster, never the currently-displayed one. Searching a search would narrow
   * results with every Enter and there would be no way back to the full list except clearing.
   */
  search(): void {
    this.#searched = searchRoster(this.#users, this.#searchTerm);
  }

  /** `clearUserSearch(){ this.visibleRoster = globals.roster }` */
  clearSearch(): void {
    this.#searched = null;
  }

  /**
   * `doUserSearch(e){ 13 == e.keyCode && (this.userSearchTermTxt ? this.searchUsers() : this.clearUserSearch()) }`
   *
   * An empty term on Enter CLEARS rather than matching everything. Those are the same list today and
   * stop being the same the moment `searchRoster` gains a rule about the empty string.
   */
  submitSearch(): void {
    if (this.#searchTerm) this.search();
    else this.clearSearch();
  }

  /**
   * `getRandomUser()`'s draw, from the candidate set:
   *
   * ```js
   * let o = globals.roster.filter(r => !r.isP);
   * let {uniqueUsers: s} = uniqueRoster(o);
   * i && (s = s.filter(r => r.isFT));
   * randomUser(s)
   * ```
   *
   * Presenters only may run it, and it draws from NON-presenters. Both answers to "Only select from
   * Trials?" run this — "Yes" only adds the last line — so the No branch is not a dismissal to be
   * ignored.
   *
   * `if (o >= 2)` has NO else upstream: fewer than two candidates and nothing opens at all. That is
   * deliberate, not an oversight — drawing a "random" user from a field of one is not a draw — and
   * it is why this returns rather than picking. An earlier version alerted "No users to pick from."
   * on an empty field and named the only candidate on a field of one, neither of which the capture
   * does.
   *
   * ## Why the reveal is on a TIMER, which is the part that looks like a bug
   *
   * `#pick` is set with `revealed: false` and only flips true after `RANDOM_USER_REVEAL_MS`. That
   * delay is not a loading state and there is nothing to wait for — the winner is already chosen on
   * the line above. **The three-second suspense IS the point of the dialog:** upstream shows a giphy
   * spinner, then replaces it with the name and only THEN makes "User Info" clickable —
   *
   * ```js
   * a.init(() => { setTimeout(() => {
   *   a.find(".bootbox-body").html('<h2 class="text-center flash animated">' + r.nick + "</h2>"),
   *   $(".btn-random-user").css("display","inline-block") }, 3e3) })
   * ```
   *
   * — so removing the timer to "make it instant" would delete the feature. That sentence lived on
   * `+page.svelte` until 2026-08-17, forty lines from the timer it explains and the only part of
   * that docblock not already duplicated here.
   */
  draw(trialsOnly: boolean): void {
    const candidates = randomUserCandidates(this.#users, trialsOnly);
    if (candidates.length < RANDOM_USER_MINIMUM) return;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    this.#pick = { entry: picked, revealed: false };
    globalThis.clearTimeout(this.#revealTimer);
    this.#revealTimer = globalThis.setTimeout(() => {
      if (this.#pick) this.#pick = { ...this.#pick, revealed: true };
    }, RANDOM_USER_REVEAL_MS);
  }

  /**
   * Closing the dialog.
   *
   * What stops a dismissed draw coming back three seconds later is the `if (this.#pick)` in the
   * reveal callback above, NOT the `clearTimeout` here — and that distinction is written down
   * because a comment in this spot claimed the opposite. There is no resurrection path for the
   * cancel to close: `draw()` clears the handle before scheduling its own, so a second draw already
   * disposes of the first timer, and a close with no second draw leaves a callback that finds
   * `#pick` null and does nothing.
   *
   * The `clearTimeout` stays anyway, as hygiene rather than as a fix: it releases a pending timer
   * and the closure it holds the moment the dialog is gone, instead of three seconds later. Small,
   * real, and not what the test below is guarding.
   */
  closeDraw(): void {
    globalThis.clearTimeout(this.#revealTimer);
    this.#pick = null;
  }
}
