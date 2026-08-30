import { SvelteMap } from 'svelte/reactivity';

import { INITIAL_ZOOM_LEVEL, type Pan, zoomIn, zoomOut } from '#lib/screen-zoom.js';

import type { RoomDialogs } from './dialogs.svelte';

/** Who to ask, and which of their shares — the payload `forceStopScreen` carries. */
export type ForceStopScreenTarget = { targetUserId: number; producerId: string };

/** One shared screen, as far as this class is concerned. */
export interface SharedScreen {
  id: string;
  /** Who is sharing it; read by `stop` alone, as who `forceStopScreen` is addressed to. */
  ownerId: number | null;
}

/*
  The screen VIEWER: which tab is showing, how far it is zoomed, where it is panned, and the popout
  windows a presenter can detach it into.

  Phase 5 slice 11. Nineteen declarations and functions, 178 lines.

  ## What it deliberately does NOT own: the screens themselves

  `sharedScreens` stays with the SFU transport, because that is what fills it — `addRemoteScreen`
  and `removeRemoteScreen` are the writers and they are slice 4's. This class reads the list through
  a thunk and asks for a removal through a receiver.

  That split is the rule slice 13 paid for: a field written on both sides of a boundary is not
  extracted, it is shared. `stopSharedScreen` is the one place the two meet — the transport drops
  the screen, and the three ids that pointed at it are cleaned up HERE, because they are this
  class's and nothing else knows they exist.

  ## The three ids are three different questions

  `selectedTab` is what this viewer is looking at. `forcedId` is what a presenter pushed everyone
  to. `lockedId` is what a presenter pinned. They are separate because a viewer can be looking at
  one screen while a presenter forces another, and collapsing them loses that.

  ## `detachedScreenId` reads the URL, and that is what makes the popout work

  A detached window is the SAME route with `dscreen` and `presID` in the query. The page renders
  one screen and nothing else when they are present, which is why this is read from the URL rather
  than passed in: the popout has no parent state to inherit.
*/
export class RoomScreens {
  readonly #dialogs: RoomDialogs;
  readonly #screens: () => readonly SharedScreen[];
  readonly #removeScreen: (screenId: string) => void;
  readonly #isLocalScreen: (screenId: string) => boolean;
  readonly #stopLocalScreen: (screenId: string) => void;
  readonly #selectTabOfId: (screenId: string) => void;
  readonly #searchParams: () => { has(name: string): boolean; get(name: string): string | null };
  readonly #sessionHandle: () => string;
  readonly #isPresenter: () => boolean;
  readonly #followMyScreens: () => boolean;
  readonly #focusOnScreen: (screenId: string) => Promise<unknown>;
  readonly #forceStopScreen: (target: ForceStopScreenTarget) => Promise<unknown>;

  #selectedScreenTab: string | null;
  #detachedHere: readonly string[];
  #forcedScreenId: string | null;
  #lockedScreenId: string | null;
  #isFullScreenshare: boolean;
  #showZoomCtrl: boolean;
  #zoomLevel: number;
  #screenPans: SvelteMap<string, Pan>;
  #screenPopouts: Map<string, Window>;

  constructor(options: {
    dialogs: RoomDialogs;
    /** The transport's list, read through a thunk because the transport owns it. */
    screens: () => readonly SharedScreen[];
    /** The transport's removal, because the transport owns the list. */
    removeScreen: (screenId: string) => void;
    isLocalScreen: (screenId: string) => boolean;
    stopLocalScreen: (screenId: string) => void;
    selectTabOfId: (screenId: string) => void;
    /** Read-only by design: `page.url.searchParams` is a ReadonlyURLSearchParams. */
    searchParams: () => { has(name: string): boolean; get(name: string): string | null };
    sessionHandle: () => string;
    isPresenter: () => boolean;
    followMyScreens: () => boolean;
    focusOnScreen: (screenId: string) => Promise<unknown>;
    /** Injected like `focusOnScreen` beside it, so this class needs no route import. */
    forceStopScreen: (target: ForceStopScreenTarget) => Promise<unknown>;
  }) {
    this.#dialogs = options.dialogs;
    this.#screens = options.screens;
    this.#removeScreen = options.removeScreen;
    this.#isLocalScreen = options.isLocalScreen;
    this.#stopLocalScreen = options.stopLocalScreen;
    this.#selectTabOfId = options.selectTabOfId;
    this.#searchParams = options.searchParams;
    this.#sessionHandle = options.sessionHandle;
    this.#isPresenter = options.isPresenter;
    this.#followMyScreens = options.followMyScreens;
    this.#focusOnScreen = options.focusOnScreen;
    this.#forceStopScreen = options.forceStopScreen;

    this.#selectedScreenTab = $state<string | null>(null);
    /*
      `SV-SP-02` — which screens THIS window has detached into a popout.

      NOT `detachedScreenId` below, and the two are easy to confuse because upstream names them alike.
      That one is `isDetachedCtrl`: the POPOUT asking "am I a popout?", read from the query string.
      This is the SOURCE window asking "have I sent this screen elsewhere?", which is what
      `isDetached` gates in `app-screenshare-view` — the blanked pane and its re-attach line.

      A `$state.raw` list rather than the `#screenPopouts` map it shadows, because that map is a plain
      `Map` holding `Window` handles and nothing renders from it. Two facts, two shapes: one is the
      handle to close, the other is what the pane draws.
    */
    this.#detachedHere = $state.raw<readonly string[]>([]);

    /** The screen every viewer is taken to; renders the eye badge on that tab. */
    this.#forcedScreenId = $state<string | null>(null);

    this.#lockedScreenId = $state<string | null>(null);

    /**
     * `isFullScreenshare` - `fullScreenshare() { this.isFullScreenshare = !this.isFullScreenshare }`.
     *
     * The screens pane takes `is-fullscreenshare` from it via
     * `UCe = (t, n) => ({'show active': t, 'is-fullscreenshare': n})`, which the captured sheet
     * makes `position: fixed; 100vw/100vh; z-index: 1030`.
     */
    this.#isFullScreenshare = $state(false);

    /**
     * Screen zoom, lifted here from `ScreenPane` because that is where the capture keeps it.
     *
     * `app-presentationarea` - the component this page reproduces - declares `this.showZoomCtrl = !1`
     * in its constructor and owns all five handlers
     * (`docs/source/components/app-presentationarea.compiled.js:12,480-499`). Its buttons live in the
     * tab bar's `li.nav-item.ms-auto` slot and drive every screen through a broadcast event bus, so
     * the state cannot sit inside one pane. `src/lib/screen-zoom.ts` carries the transcription and
     * the reasoning for what is global and what is per screen.
     */
    this.#showZoomCtrl = $state(false);

    this.#zoomLevel = $state(INITIAL_ZOOM_LEVEL);

    /** Per screen, because the drag is: `panZoomIn` is broadcast, a pointer drag is not. */
    this.#screenPans = new SvelteMap<string, Pan>();

    /**
     * Every screen this peer has popped out, producer id -> window. The capture's `screenPopputs`.
     */
    this.#screenPopouts = new Map<string, Window>();
  }

  get selectedTab(): string | null {
    return this.#selectedScreenTab;
  }

  /**
   * `SV-SP-02` — is this screen detached out of THIS window?
   *
   * ```js
   * detachScreen() { this.isDetached = !0, this.stopWatchScreenOf(this.muser._id), … }
   * reAttachScren() { this.isDetached = !1, … }                              // byte 1,499,638
   * ```
   *
   * The pane reads it to blank itself and offer the re-attach line. Before this the source window
   * kept rendering the same screen after detaching it, so one producer fed TWO live decoders and
   * there was no way back except closing the popout.
   */
  isDetachedHere(screenId: string): boolean {
    return this.#detachedHere.includes(screenId);
  }

  /**
   * `reAttachScren` — bring it back, which upstream does by clicking the blanked pane itself.
   *
   * Closing the popout is what re-attaches: its `beforeunload` already clears the flag and re-selects
   * the tab, so this has one job and the un-detaching is not written twice. A popout the viewer has
   * already closed by hand leaves the flag set until that handler runs, so the list is cleared here
   * too rather than trusted to arrive.
   */
  reattach(screenId: string): void {
    const popout = this.#screenPopouts.get(screenId);
    this.#screenPopouts.delete(screenId);
    this.#detachedHere = this.#detachedHere.filter((entry) => entry !== screenId);
    if (popout && !popout.closed) popout.close();
    this.#selectTabOfId(screenId);
  }

  /** The detached window selects its own screen on open; nothing else writes this directly. */
  set selectedTab(next: string | null) {
    this.#selectedScreenTab = next;
  }

  get forcedId(): string | null {
    return this.#forcedScreenId;
  }

  get lockedId(): string | null {
    return this.#lockedScreenId;
  }

  get isFullScreenshare(): boolean {
    return this.#isFullScreenshare;
  }

  set isFullScreenshare(next: boolean) {
    this.#isFullScreenshare = next;
  }

  get showZoomCtrl(): boolean {
    return this.#showZoomCtrl;
  }

  get zoomLevel(): number {
    return this.#zoomLevel;
  }

  get pans(): SvelteMap<string, Pan> {
    return this.#screenPans;
  }

  /**
   * The SSE dispatch's three receivers, named for the wire events rather than exposed as setters.
   *
   * `RoomBroadcasts` established this shape: a presenter forcing everyone to a screen writes TWO
   * fields, and a caller holding setters can write one. Each of these is one event and one whole
   * state change.
   */
  forcedTo(screenId: string): void {
    this.#forcedScreenId = screenId;
    this.#selectedScreenTab = screenId;
  }

  lockedTo(screenId: string | null): void {
    this.#lockedScreenId = screenId;
  }

  /**
   * A screen arriving from the transport, and one leaving.
   *
   * Receivers rather than three setters: a removal clears whichever of the three ids pointed at
   * the screen, and a caller holding setters can clear one and leave the other two pointing at
   * something that no longer exists. The FALLBACK tab is passed in because the transport has
   * already updated its list by the time it calls.
   */
  screenAdded(screenId: string): void {
    if (this.#selectedScreenTab === screenId) return;
    this.#selectedScreenTab = screenId;
  }

  screenRemoved(screenId: string, fallbackTab: string | null): void {
    if (this.#selectedScreenTab === screenId) this.#selectedScreenTab = fallbackTab;
    if (this.#forcedScreenId === screenId) this.#forcedScreenId = null;
    if (this.#lockedScreenId === screenId) this.#lockedScreenId = null;
  }

  /**
   * Is THIS window a detached screen popout?
   *
   * The capture's own test, from app-screenshare-view's ngOnInit:
   *
   *   const o = new URLSearchParams(window.location.search);
   *   this.isDetachedCtrl = o.has("dscreen") && o.has("presID");
   *
   * Both keys, not either: `dscreen` alone says "a popout" and `presID` says which screen, and a
   * window with only one of them has nothing to render.
   */
  get detachedScreenId() {
    const params = this.#searchParams();
    if (!params.has('dscreen') || !params.has('presID')) return null;
    return params.get('presID');
  }

  zoomIn() {
    this.#zoomLevel = zoomIn(this.#zoomLevel);
  }

  zoomOut() {
    this.#zoomLevel = zoomOut(this.#zoomLevel);
  }

  /**
   * `panZoomAPI.resetView()` on every subscribed view - back to the neutral level AND the
   * untranslated origin, for all screens rather than the selected one.
   */
  resetZoom() {
    this.#zoomLevel = INITIAL_ZOOM_LEVEL;
    this.#screenPans.clear();
  }

  /**
   * The capture resets on EVERY toggle, not only when leaving zoom mode. The subscriber runs
   * `this.showZoomCtrl = i; this.togglePanZoom()` and the view's own `togglePanZoom()` body is
   * exactly `this.panZoomReset()`
   * (`docs/source/components/app-screenshare-view.compiled.js:45-46,73-75`).
   */
  toggleZoomControls() {
    this.#showZoomCtrl = !this.#showZoomCtrl;
    this.resetZoom();
  }

  /**
   * "Detach Screen to a new window", transcribed from the capture's popout service:
   *
   * ```js
   * openPopoutModal(e, i) {
   *   "screen" == e && (i.id = globals.sessionID, i.presID = i.pres._id);
   *   const o = Object.keys(i).map(a => "pres" == a ? "" : enc(a) + "=" + enc(i[a])).join("&");
   *   const s = window.open(`/?dscreen=1&${o}`, "_blank",
   *     "toolbar=no,location=no,directories=no,status=no,menubar=no,titlebar=no,fullscreen=no,width=1280,height=1024");
   *   this.screenPopputs[i.pres._id] = { windowInstance: s, type: e, pres: i.pres };
   *   s.onbeforeunload = () => appEventBus.emit("reatachScreenShare", i.pres._id)
   * }
   * ```
   *
   * This used to open `/screen/<id>` at 1280x720 - a route that does not exist in this app, so
   * detaching a screen opened a window that redirected straight to the login page. The real
   * contract is the ROOM itself with `?dscreen=1`, which is also how the popout recognises itself:
   * the captured component reads `isDetachedCtrl = params.has("dscreen") && params.has("presID")`.
   */
  detach(screenId: string) {
    const screen = this.#screens().find((entry) => entry.id === screenId);
    if (!screen) return;

    const existing = this.#screenPopouts.get(screenId);
    if (existing && !existing.closed) {
      existing.focus();
      return;
    }

    const query = new URLSearchParams({
      dscreen: '1',
      id: this.#sessionHandle(),
      presID: screenId
    });
    const popout = window.open(
      `/?${query}`,
      '_blank',
      'toolbar=no,location=no,directories=no,status=no,menubar=no,titlebar=no,fullscreen=no,width=1280,height=1024'
    );
    if (!popout) {
      // Blocked by the popup blocker. Saying so beats a menu item that silently does nothing.
      this.#dialogs.alert =
        'Your browser blocked the detached screen window. Allow popups for this site and try again.';
      return;
    }
    this.#screenPopouts.set(screenId, popout);
    // `SV-SP-02` — the SOURCE pane blanks now. See `isDetachedHere`.
    if (!this.#detachedHere.includes(screenId)) {
      this.#detachedHere = [...this.#detachedHere, screenId];
    }

    // `s.onbeforeunload = () => appEventBus.emit("reatachScreenShare", i.pres._id)` - closing the
    // window puts the screen back in the room rather than leaving it detached and invisible.
    popout.addEventListener('beforeunload', () => {
      this.#screenPopouts.delete(screenId);
      this.#detachedHere = this.#detachedHere.filter((entry) => entry !== screenId);
      this.#selectTabOfId(screenId);
    });
  }

  /**
   * `postMessage({cmd:"screeenStopped", presID})` then drop it - the capture's own spelling.
   *
   * A popout showing a screen whose producer has gone would otherwise sit on a frozen last frame
   * with no way to know the share ended.
   */
  closePopout(screenId: string) {
    const popout = this.#screenPopouts.get(screenId);
    if (!popout) return;
    this.#screenPopouts.delete(screenId);
    if (popout.closed) return;
    try {
      popout.postMessage({ cmd: 'screeenStopped', presID: screenId }, window.location.origin);
    } catch {
      // A window already navigating away cannot be messaged; closing it below is enough.
    }
    popout.close();
  }

  /**
   * A tab the USER clicked, as opposed to `selectScreenTabOfId`, which is every programmatic path.
   *
   * That split is the reference's `i` parameter made structural: `onScreenShareTabChange(e, i = !0)`
   * broadcasts only when `i`, and callers pass false when the change came from a command. Keeping
   * two functions instead of a boolean means a new programmatic caller cannot accidentally opt into
   * broadcasting by forgetting an argument.
   */
  selectTab(screenId: string) {
    this.#selectedScreenTab = screenId;
    if (this.#isPresenter() && this.#followMyScreens()) this.bringEveryoneTo(screenId);
  }

  toggleLock(screenId: string) {
    this.#lockedScreenId = this.#lockedScreenId === screenId ? null : screenId;
  }

  bringEveryoneTo(screenId: string) {
    /*
      `bringFocusToScreen(e) { e && this.appService.sendServerAdminCommand("focusOnScreen", {id: e}) }`.
      This used to move only the presenter, with a comment saying the broadcast "needs the media
      signalling channel, which is not wired yet". It does not need that channel: the reference
      sends a SERVER command, and the room already carries server commands on the `cmds` channel —
      the same one `remotePresCommand` uses.

      The local move stays and happens FIRST, so the presenter's own view responds to their click
      without waiting for a round trip. The server re-checks that the caller is a presenter and
      scopes the broadcast to their room, so authority is decided there rather than here.
    */
    this.#forcedScreenId = screenId;
    this.#selectedScreenTab = screenId;
    if (!this.#isPresenter()) return;
    void this.#focusOnScreen(screenId).catch((cause) => console.error('[focusOnScreen]', cause));
  }

  /**
   * `SV-SP-08` — a presenter who unmutes while sharing pulls the room to the screen they last chose.
   *
   * ```js
   * subscribe("presUnmuted", e => { … , this.globals.isScreenSharing &&
   *   this.sendServerAdminCommand("focusOnScreen", {id: this.globals.currScreenID}) })
   * ```                                                                      // byte 1,141,836
   *
   * with `globals.currScreenID = this.selectedScreenShareTab` written by `onScreenShareTabChange`
   * (byte 1,968,960).
   *
   * **The write was never what was missing here.** `#selectedScreenTab` has held that value all
   * along; what did not exist was a READER outside the component tree, which is why the row is filed
   * against this surface and its consumer lives on the microphone one. So this is the reader, and it
   * takes no argument: the screen is whichever one this presenter is looking at, by definition.
   *
   * `bringEveryoneTo` rather than a second `focusOnScreen` call, because the two are the same act —
   * it re-checks the presenter role, moves this browser first so the presenter's own view responds
   * without a round trip, and the server re-checks authority regardless. A parallel path would be a
   * second place for that rule to drift.
   *
   * Silent when there is no selected screen. A presenter can be sharing a producer that has not yet
   * produced a tab, and `focusOnScreen` with nothing to focus on is a command the room would have to
   * ignore.
   */
  focusRoomOnSelectedScreen(): void {
    const screenId = this.#selectedScreenTab;
    if (!screenId) return;
    this.bringEveryoneTo(screenId);
  }

  stop(screenId: string) {
    // One of our own screens: stop it for real - close the producer and release the capture - so
    // the room loses it too. Dropping only the tab would leave the presenter believing they had
    // stopped sharing while every viewer kept watching.
    if (this.#isLocalScreen(screenId)) {
      this.#stopLocalScreen(screenId);
      return;
    }
    /*
      SOMEBODY ELSE'S, and this is what "Stop This Screen" is actually for.

      The comment that stood here said stopping their producer "is not ours to do, so this only drops
      the tab and is deliberately not pretending the remote share ended" — every clause true of the
      code and false of the control. A presenter clicked a presenter-only item, their own tab
      vanished, and the member kept broadcasting to everyone else. The argument, its byte offsets
      and the divergence from upstream are on `forceStopScreen` in `presenter-commands.remote.ts`.

      Order: the local drop is FIRST so the click is answered without a round trip, as
      `bringEveryoneHere` above. The send is skipped for a viewer, whose menu has no such item, and
      for a screen with no known owner — there is nobody to address, and dropping the tab without
      sending beats inventing a recipient. The server re-checks the role either way.
    */
    const owner = this.#screens().find((screen) => screen.id === screenId)?.ownerId ?? null;
    this.#removeScreen(screenId);
    this.screenRemoved(screenId, this.#screens()[0]?.id ?? null);
    if (!this.#isPresenter() || owner === null) return;
    void this.#forceStopScreen({ targetUserId: owner, producerId: screenId }).catch((cause) =>
      console.error('[forceStopScreen]', cause)
    );
  }
}
