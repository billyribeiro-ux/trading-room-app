import { DIRECT_EVIDENCE_CONTRACT } from '#lib/direct-evidence-contract.js';
import { DUMP_CONTRACT } from '#lib/dump-contract.js';
import { NO_PENDING_CLICK, gutterRelease, togglePresentationSplit } from '#lib/split-gutter.js';

/*
  The room's two nested splits — the outer presentation/chat-alerts pair and the inner alerts/chat
  one — and every number the layout is drawn from.

  ## Why this is one class and not seven `let`s

  Seven pieces of reactive state, five plain ones and twenty derived values were interleaved across
  600 lines of `+page.svelte`, from the seed at line 1217 to the drag handlers at 7383. Nothing
  named the set, so the only way to know whether a change to `mainSplit` was complete was to read
  the whole file. That is the cost this extraction removes; the line count is a symptom.

  A class rather than exported `$state`, for the reason `RoomPolls` records: `svelte/svelte-js-files`
  says reassigned state cannot be exported from a `.svelte.ts` module, and `svelte/context` says
  reassigning a shared value breaks the link for everything reading it. Keeping the reactive box
  behind `this` and reading through getters is the only shape that survives leaving the component.

  ## What reading them together found

  The two default fractions are the SAME KIND of measurement — a percentage read off the captured
  populated room — and they were sourced two different ways, three lines apart:

  ```js
  const defaultMainSplit = $derived(
    splitIsHorizontal ? DIRECT_EVIDENCE_CONTRACT.populatedRoom.primaryPercent / 100 : 0.5
  );
  const defaultChatAlertsSplit = $derived(splitIsHorizontal ? 40.136530587668595 / 100 : 0.3);
  ```

  The first cites the evidence module. The second is a bare literal with seventeen significant
  figures and no stated origin, and it could stay bare because `DIRECT_EVIDENCE_CONTRACT` records
  `primaryPercent` and has no `alertsPercent` beside it.

  It is NOT moved into that contract, and that is deliberate rather than lazy: `dump-contract.test.ts:314`
  pins `populatedRoom` with `toEqual`, so adding a key there is a change to a pinned evidence object
  made for a reader's convenience. Instead the literal is named here as {@link CAPTURED_ALERTS_PERCENT}
  and `split.svelte.test.ts` PROVES it is the origin of the captured string — `40.136530587668595`
  and the 11px gutter reproduce `calc(40.1365% - 4.41502px)` and `calc(59.8635% - 6.58498px)`
  exactly, at the precision the browser serialises computed styles to. The same test does it for
  `primaryPercent`. Nobody has to take either number on trust now, and neither can drift from the
  string it is supposed to explain.

  ## What did NOT move, and why

  `settingsSplitPair` and `storedSplitPair` stay in the page: one reads the decoded preference
  snapshot and the other reads `localStorage`, and both are the page's to own. The class takes a
  reader function instead, which is also what makes the seeding testable — the constructor's
  behaviour on a browser with no stored sizes is a fixture here rather than a browser session.

  Persistence is RETURNED rather than performed, the same decision/effect split `RoomPolls` uses:
  {@link RoomSplit.endDrag} answers "which preference key should be written, and with what pair",
  and the page hands that to `savePreference` — which also mirrors into the settings snapshot, sets
  `globalChatStyle` and re-seeds the direction. A geometry class calling that would own half the
  room's preference system by accident.
*/

/** The four values `sessData.roomSplitDir` takes. Declared inline in the page before this. */
export type RoomSplitDir = 'ltr' | 'ttb' | 'rtl' | 'btt';

export function isRoomSplitDir(value: unknown): value is RoomSplitDir {
  return value === 'ltr' || value === 'ttb' || value === 'rtl' || value === 'btt';
}

/** Which of the two nested splits a pointer is dragging. */
export type SplitTarget = 'main' | 'chat-alerts';

/** A persisted size, as the reference stores it: `[firstPercent, secondPercent]`, summing to 100. */
export type SplitPair = [number, number];

/** What {@link RoomSplit.endDrag} decided should be written, or `null` for "nothing to persist". */
export interface SplitWrite {
  readonly key: string;
  readonly pair: SplitPair;
}

/** How a stored pair is read. The page supplies one for the settings snapshot. */
export type SplitPairReader = (key: string) => SplitPair | null;

/**
 * The chat/alerts share of the captured populated room, at full precision.
 *
 * `DIRECT_EVIDENCE_CONTRACT.populatedRoom` records this measurement only as the two rendered flex
 * STRINGS — `alertsFlex` and `chatFlex` — which are the browser's rounded serialisation of it. The
 * number itself lived as an uncited literal in `+page.svelte`; naming it here, next to the code
 * that uses it, is the smaller of the two available fixes. The larger one edits a `toEqual`-pinned
 * evidence object, which is not a thing to do for tidiness.
 *
 * `split.svelte.test.ts` reproduces both captured strings from this constant and the 11px gutter,
 * so the citation is executed rather than asserted in prose.
 */
export const CAPTURED_ALERTS_PERCENT = 40.136530587668595;

/**
 * The chat/alerts share on a VERTICAL room, where the capture says nothing.
 *
 * `DIRECT_EVIDENCE_CONTRACT` records one rendered room and that room was horizontal, so every
 * branch reaching for a captured flex string tests `isHorizontal` — which is false on a phone —
 * rather than `roomIsHorizontal`. These two are the fallbacks for everything the capture does not
 * cover, and they are the reference's own `presAreaSize`/`chatAlertsSize` defaults, not a guess.
 */
export const VERTICAL_MAIN_SPLIT = 0.5;
export const VERTICAL_CHAT_ALERTS_SPLIT = 0.3;

/**
 * `chatAlertsSizeMobile` — 50, beside `presAreaSizeMobile` at 50 (`app-room.full.js:1852-1853`).
 *
 * A SEPARATE number from the desktop main split, exactly as upstream keeps a separate field: the
 * phone's 50/50 and the desktop's 70/30 (`:1848-1849`) do not overwrite each other, so rotating a
 * tablet does not destroy the geometry the user dragged on either side of the threshold.
 *
 * Not seeded from the persisted sizes and never written to them, because `K4e`'s outer split binds
 * `dragStart` and NO `dragEnd` (`app-room.render-helpers.js:1786-1791`) — the desktop `j4e` binds
 * both (`:1620-1623`). Upstream therefore never records a mobile drag, and neither does this: the
 * gutter moves, and the size is gone on reload.
 */
export const MOBILE_CHAT_ALERTS_SPLIT = 0.5;

/**
 * `window.innerWidth <= 601`, the threshold that selects an entirely different template upstream:
 * `O(5, o.isMobileScreen ? 6 : 5)` (`app-room.full.js:4061`).
 *
 * `601`, not 600 and not a breakpoint from the stylesheet. The scoped sheet's own media query next
 * to it is `max-width: 600px` (`app-room.component.css`), so the two do NOT agree and the 1px seam
 * is the reference's. Copied rather than tidied — a room at exactly 601px takes the mobile TEMPLATE
 * and the desktop CSS, and "fixing" that would be inventing a behaviour nobody has seen.
 */
export const MOBILE_BREAKPOINT_WIDTH = 601;

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/** A stored preference is only a split pair if it really is two numbers. Anything else is ignored. */
export function splitPairFromValue(value: unknown): SplitPair | null {
  return Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
    ? [value[0], value[1]]
    : null;
}

/**
 * The preference keys a given direction reads and writes.
 *
 * Upstream keeps two pairs of keys rather than one, so a user who arranges a left/right room and
 * then switches to top/bottom gets the geometry they last chose for THAT arrangement back, instead
 * of a width reinterpreted as a height.
 */
export function splitStorageKeys(direction: RoomSplitDir) {
  const horizontalRoom = direction === 'ltr' || direction === 'rtl';
  return {
    horizontalRoom,
    roomKey: horizontalRoom ? 'roomSizes' : 'roomSizes-bottom',
    chatKey: horizontalRoom ? 'chatAlertSizes' : 'chatAlertSizes-bottom'
  } as const;
}

/**
 * Read both stored pairs for a direction and turn them into the two fractions the layout uses.
 *
 * `null` means "nothing stored", which is NOT the same as a stored 0: a null main split is what
 * makes the captured flex string apply verbatim, and a stored 0 is a user who collapsed the pane.
 * Collapsing the two would put a computed `calc(0% - 0px)` where the capture's own string belongs.
 *
 * The room pair is stored presentation-first on a vertical room and chat-alerts-first on a
 * horizontal one, which is why the index depends on `horizontalRoom`. The chat pair is always
 * alerts-first.
 */
export function resolveSplitSizes(direction: RoomSplitDir, read: SplitPairReader) {
  const { horizontalRoom, roomKey, chatKey } = splitStorageKeys(direction);
  const roomSizes = read(roomKey);
  const chatSizes = read(chatKey);
  return {
    mainSplit: roomSizes ? clamp((horizontalRoom ? roomSizes[0] : roomSizes[1]) / 100, 0, 1) : null,
    chatAlertsSplit: chatSizes ? clamp(chatSizes[0] / 100, 0, 1) : null
  };
}

export class RoomSplit {
  /*
    The reactive seven. Plain `$state` and not `$state.raw`: every one is a primitive or null, so
    there is no deep proxy to avoid — `$state.raw` earns its place on the logs and stream lists that
    are replaced wholesale, not here.
  */
  #direction = $state<RoomSplitDir>('ltr');
  /** The CHAT/ALERTS share of the outer split, or null for "the capture's own flex string". */
  #main = $state<number | null>(null);
  /** The ALERTS share of the inner split, same null meaning. */
  #chatAlerts = $state<number | null>(null);
  #mobile = $state(MOBILE_CHAT_ALERTS_SPLIT);
  #viewportWidth = $state(0);
  #target = $state<SplitTarget | null>(null);
  #chatCollapsed = $state(false);

  /*
    The five that are deliberately NOT reactive. Nothing renders from any of them, and making them
    reactive would invalidate on every pointer event for no observer — `#moved` and `#pointerOffset`
    change on every frame of a drag.

    `#lastClickAt` starts at `NO_PENDING_CLICK` rather than 0, and that is a bug a test caught rather
    than a reader: `performance.now()` counts from page load, so 0 is a real timestamp and using it
    as "nothing pending" collapsed the presentation on the first single click of the session.
  */
  #pointerAxis: 'x' | 'y' = 'x';
  #pointerOffset = 0;
  #moved = false;
  #lastClickAt = NO_PENDING_CLICK;
  #beforeCollapse: number | null = null;

  /**
   * `acA-08` — `preferences.extraChatColumn`, the viewer's second-column setting.
   *
   * A THUNK and not a copy: the viewer turns the column on from the settings modal mid-session, and
   * a value read at construction would leave the layout believing the old answer forever. The same
   * trap `RoomChat` records for `extraColumnEnabled`.
   *
   * The COLLAPSE half of "is it on screen" is not passed in, because it is `#chatCollapsed` — this
   * class already owns it, and asking a caller for it would be asking them to restate what they read
   * from here.
   *
   * This class needs the answer for one thing: in a `ttb`/`btt` room the extra column is a FOURTH
   * area of the inner stack, so the three inner sizes have to be renormalised. Defaults to "no
   * second column" so every existing construction — the tests included — is unchanged.
   */
  readonly #extraChatColumnEnabled: () => boolean = () => false;

  /**
   * Seeded from the server-persisted sizes so the very first paint already has the user's pane
   * geometry. Leaving these null until `onMount` made SSR emit the default flex and hydration then
   * rewrite it, which is a layout shift the size of the whole room.
   */
  constructor(
    direction: RoomSplitDir,
    read: SplitPairReader,
    options: { extraChatColumnEnabled?: () => boolean } = {}
  ) {
    this.#direction = direction;
    if (options.extraChatColumnEnabled)
      this.#extraChatColumnEnabled = options.extraChatColumnEnabled;
    const seeded = resolveSplitSizes(direction, read);
    this.#main = seeded.mainSplit;
    this.#chatAlerts = seeded.chatAlertsSplit;
  }

  get direction(): RoomSplitDir {
    return this.#direction;
  }

  get main(): number | null {
    return this.#main;
  }

  get chatAlerts(): number | null {
    return this.#chatAlerts;
  }

  get mobile(): number {
    return this.#mobile;
  }

  get target(): SplitTarget | null {
    return this.#target;
  }

  get chatCollapsed(): boolean {
    return this.#chatCollapsed;
  }

  /**
   * `bind:innerWidth` on `<svelte:window>` writes this, which is the same value as upstream's
   * resize listener by a shorter path — the binding is reactive and needs no listener to remove.
   *
   * `svelte/reactivity/window` exports an `innerWidth.current` that would remove the binding
   * entirely, and it is deliberately not used: `0` here means "never measured", which is load
   * bearing twice over. `isMobileScreen` returns false at 0 so SSR renders the desktop tree, and
   * the page's resize-refetch effect uses the same 0 to skip the refetch on first paint. Upstream
   * gets that second property from `isMobileScreen = onResizeChange = …` in one statement at init
   * (`app-room.full.js:1889`). Swapping the measurement for one that is `undefined` on the server
   * and live on the client would change both, which is a behaviour change dressed as a refactor.
   */
  get viewportWidth(): number {
    return this.#viewportWidth;
  }

  set viewportWidth(width: number) {
    this.#viewportWidth = width;
  }

  /*
    Everything below is `$derived` and not a plain computing getter, and the difference is
    measurable rather than stylistic.

    `bind:innerWidth` writes `#viewportWidth` on EVERY frame of a window resize. A plain getter
    would rebuild all five flex strings on each of those frames. `$derived` is push-pull: the resize
    marks the chain dirty, `#isMobileScreen` recomputes to the same boolean, and — per `$derived`'s
    "if the new value is referentially identical to its previous value, downstream updates will be
    skipped" — nothing past it runs at all. That is how the page behaved before this extraction,
    because these were `$derived` there; writing them as getters here would have been a silent
    performance regression carried in on a refactor.

    They are private with a public getter rather than public fields because a `$derived` field is
    reassignable from outside (deriveds are overridable unless declared `const`, which a class field
    cannot be). Nothing should be able to write the room's geometry except by moving a gutter.
  */

  /** Whether the user's ARRANGEMENT is left/right, before the phone overrides it. */
  #roomIsHorizontal = $derived(this.#direction === 'ltr' || this.#direction === 'rtl');

  /** SSR renders the desktop tree, because no server knows the viewport. See {@link viewportWidth}. */
  #isMobileScreen = $derived(
    this.#viewportWidth > 0 && this.#viewportWidth <= MOBILE_BREAKPOINT_WIDTH
  );

  #isHorizontal = $derived(this.#roomIsHorizontal && !this.#isMobileScreen);
  #innerIsVertical = $derived(this.#roomIsHorizontal || this.#isMobileScreen);
  #primaryIsFirst = $derived(this.#direction === 'ltr' || this.#direction === 'ttb');

  #defaultMainSplit = $derived(
    this.#isHorizontal
      ? DIRECT_EVIDENCE_CONTRACT.populatedRoom.primaryPercent / 100
      : VERTICAL_MAIN_SPLIT
  );
  #defaultChatAlertsSplit = $derived(
    this.#isHorizontal ? CAPTURED_ALERTS_PERCENT / 100 : VERTICAL_CHAT_ALERTS_SPLIT
  );

  #resolvedMainSplit = $derived(
    this.#isMobileScreen ? this.#mobile : (this.#main ?? this.#defaultMainSplit)
  );
  #resolvedChatAlertsSplit = $derived(this.#chatAlerts ?? this.#defaultChatAlertsSplit);

  /*
    The captured flex strings below are a DESKTOP measurement — `DIRECT_EVIDENCE_CONTRACT` records
    one rendered room, and that room was horizontal. Every branch that reaches for them therefore
    tests `#isHorizontal` rather than `#roomIsHorizontal`, so the mobile layout takes the computed
    branch instead of inheriting a width measured at a viewport it never has.
  */
  #primaryColumn = $derived(
    this.#main === null && this.#isHorizontal
      ? DIRECT_EVIDENCE_CONTRACT.populatedRoom.primaryFlex
      : flexSize(this.#resolvedMainSplit)
  );
  #presentationColumn = $derived(
    this.#main === null && this.#isHorizontal
      ? DIRECT_EVIDENCE_CONTRACT.populatedRoom.presentationFlex
      : flexSize(1 - this.#resolvedMainSplit)
  );
  /**
   * `acA-08` — whether the extra chat column is a fourth area of the INNER stack.
   *
   * ```js
   * H(6, j4e, 2, 1, "as-split-area", 211)                                    // byte 2,490,857
   * O(6, !preferences.extraChatColumn ||
   *      "ttb" !== preferences.roomSplitDir && "btt" !== preferences.roomSplitDir ? -1 : 6)
   * ```
   *
   * `roomIsHorizontal` and not `isHorizontal`: the gate upstream reads the PREFERENCE, and the phone
   * has its own template (`nRe`, byte 2,496,359) whose extra-column gate carries no direction term
   * at all — `O(3, !hideChatAlerts && preferences.extraChatColumn ? 3 : -1)`. So a phone always
   * places it at the top level, whatever the arrangement says, and `!isMobileScreen` is what says so.
   */
  #extraChatIsInside = $derived(
    this.#extraChatColumnEnabled() &&
      !this.#chatCollapsed &&
      !this.#roomIsHorizontal &&
      !this.#isMobileScreen
  );

  /**
   * What the inner sizes are multiplied by when there are THREE areas in the stack instead of two.
   *
   * The reference binds `size` to `chatSize` on the extra area — the SAME number the chat area gets
   * (`z("size", e.chatSize)` in both `V4e` and `j4e`) — and `as-split` treats sizes as proportions,
   * normalising them across however many areas there are. Flex-basis percentages do not normalise:
   * emitting `alerts + chat + chat` verbatim would come to more than 100% of the stack and overflow
   * it. So the proportions are reproduced and the arithmetic `as-split` does for free is done here.
   *
   * With `a` the alerts share, the three proportions are `a : (1-a) : (1-a)`, summing to `2-a`.
   */
  #innerScale = $derived(this.#extraChatIsInside ? 1 / (2 - this.#resolvedChatAlertsSplit) : 1);

  #alertsRow = $derived(
    this.#chatAlerts === null && this.#isHorizontal
      ? DIRECT_EVIDENCE_CONTRACT.populatedRoom.alertsFlex
      : flexSize(this.#resolvedChatAlertsSplit * this.#innerScale)
  );
  #chatRow = $derived(
    this.#chatAlerts === null && this.#isHorizontal
      ? DIRECT_EVIDENCE_CONTRACT.populatedRoom.chatFlex
      : flexSize((1 - this.#resolvedChatAlertsSplit) * this.#innerScale)
  );

  /*
    `order` is dropped entirely on mobile, and that is read from the const table rather than chosen.

    The desktop areas are placed by CSS order because the direction can reverse them without
    touching the DOM. `K4e`'s areas carry no order at all — const 225 is
    `['minSize','0',1,'presentation-box',3,'size']` and const 226 the same shape for
    `alert-chat-box`; the ONLY mobile area with an order binding is const 227, the extra chat column
    (`['minSize','0',1,'alert-chat-box',3,'size','order']`).

    So on a phone the DOM order is the layout, which is why the page emits the two panes in a
    different sequence rather than restyling them. Leaving `order` on while reordering the DOM would
    have produced a room that reads presentation-first to a screen reader and chat-first to the eye.
  */
  #primaryAreaStyle = $derived(
    this.#isMobileScreen
      ? `flex: 0 0 ${this.#primaryColumn};`
      : `order: ${this.#primaryIsFirst ? 0 : 2}; flex: 0 0 ${this.#primaryColumn};`
  );
  #presentationAreaStyle = $derived(
    this.#isMobileScreen
      ? `flex: 0 0 ${this.#presentationColumn};`
      : `order: ${this.#primaryIsFirst ? 2 : 0}; flex: 0 0 ${this.#presentationColumn};`
  );
  /**
   * The extra chat column, as its own area.
   *
   * `K4e` places it as index 3, gated `!e.hideChatAlerts && preferences.extraChatColumn`, and `q4e`
   * gives it `size = chatAlertsSize` — the same width as the chat/alerts column it sits beside,
   * which is why this reads `#primaryColumn` rather than computing a third number. The order puts
   * it after that column, which is what `orderChatAlerts()` resolves to when the extra column is
   * present.
   */
  #extraChatAreaStyle = $derived(
    this.#isMobileScreen
      ? `flex: 0 0 ${this.#primaryColumn};`
      : `order: ${this.#primaryIsFirst ? 1 : 3}; flex: 0 0 ${this.#primaryColumn};`
  );
  #alertsAreaStyle = $derived(`order: 0; flex: 0 0 ${this.#alertsRow};`);
  #chatAreaStyle = $derived(`order: 2; flex: 0 0 ${this.#chatRow};`);
  /**
   * The extra column when it sits INSIDE the inner stack — const 211, the same `chat-box` the main
   * column uses, with the same size. `order: 2` as well: the gutter holds order 1, both chat areas
   * hold 2, and DOM order decides between them, which is `j4e` being node 6 to the chat area's 4.
   */
  #innerExtraChatAreaStyle = $derived(`order: 2; flex: 0 0 ${this.#chatRow};`);

  /** The two `aria-valuenow` figures the gutters report to a screen reader. */
  #primaryPercent = $derived(this.#resolvedMainSplit * 100);
  #alertsPercent = $derived(this.#resolvedChatAlertsSplit * 100);

  get roomIsHorizontal(): boolean {
    return this.#roomIsHorizontal;
  }

  get isMobileScreen(): boolean {
    return this.#isMobileScreen;
  }

  /**
   * The direction the OUTER split is actually drawn in.
   *
   * On mobile it is hardcoded vertical, and that is a static attribute rather than a binding: const
   * 224 is
   * `['minSize','0','direction','vertical','id','mainAreaSplit','gutterDblClickDuration','400',3,'gutterDblClick','dragStart','ngClass']`
   * (`app-room.compiled.js`). The desktop pair binds direction instead — const 8 ends
   * `3,'direction','ngClass'` and const 209 is `['minSize','0',3,'dragEnd','direction']`, both fed
   * by `directionRoom()`.
   *
   * So a phone gets a stacked room whatever the direction says, and the user's left/right
   * preference simply does not apply at that width.
   */
  get isHorizontal(): boolean {
    return this.#isHorizontal;
  }

  /**
   * The INNER chat/alerts split's direction, which is NOT simply the inverse of the outer one.
   *
   * On desktop it is: a left/right room stacks alerts above chat, a top/bottom room puts them side
   * by side, which is what `directionChatAlerts()` returns. On mobile BOTH splits are vertical —
   * const 228 is `['direction','vertical','minSize','0']`, a static attribute, exactly like const
   * 224 for the outer. So a phone stacks presentation, then alerts, then chat, all the way down.
   *
   * Writing this as `isHorizontal` would have made the inner split HORIZONTAL on a phone, putting
   * alerts and chat side by side in a column barely wide enough for one of them. Caught against
   * const 228 rather than by looking at it.
   */
  get innerIsVertical(): boolean {
    return this.#innerIsVertical;
  }

  /** Whether the chat/alerts column is drawn before the presentation one. */
  get primaryIsFirst(): boolean {
    return this.#primaryIsFirst;
  }

  get defaultMainSplit(): number {
    return this.#defaultMainSplit;
  }

  get defaultChatAlertsSplit(): number {
    return this.#defaultChatAlertsSplit;
  }

  get resolvedMainSplit(): number {
    return this.#resolvedMainSplit;
  }

  get resolvedChatAlertsSplit(): number {
    return this.#resolvedChatAlertsSplit;
  }

  get primaryColumn(): string {
    return this.#primaryColumn;
  }

  get presentationColumn(): string {
    return this.#presentationColumn;
  }

  get alertsRow(): string {
    return this.#alertsRow;
  }

  get chatRow(): string {
    return this.#chatRow;
  }

  get primaryAreaStyle(): string {
    return this.#primaryAreaStyle;
  }

  get presentationAreaStyle(): string {
    return this.#presentationAreaStyle;
  }

  get extraChatAreaStyle(): string {
    return this.#extraChatAreaStyle;
  }

  get alertsAreaStyle(): string {
    return this.#alertsAreaStyle;
  }

  get chatAreaStyle(): string {
    return this.#chatAreaStyle;
  }

  /** Whether the extra chat column belongs to the inner stack rather than the outer split. */
  get extraChatIsInside(): boolean {
    return this.#extraChatIsInside;
  }

  get innerExtraChatAreaStyle(): string {
    return this.#innerExtraChatAreaStyle;
  }

  get primaryPercent(): number {
    return this.#primaryPercent;
  }

  get alertsPercent(): number {
    return this.#alertsPercent;
  }

  /**
   * The user chose a different arrangement.
   *
   * Re-seeding from storage is the whole reason this is not a plain assignment: each direction has
   * its own pair of preference keys, so switching brings back the geometry last chosen for THAT
   * arrangement rather than reinterpreting a width as a height.
   */
  setDirection(direction: RoomSplitDir, read: SplitPairReader): void {
    this.#direction = direction;
    const resolved = resolveSplitSizes(direction, read);
    this.#main = resolved.mainSplit;
    this.#chatAlerts = resolved.chatAlertsSplit;
  }

  /**
   * A pointer went down on a gutter.
   *
   * The drag axis follows the direction actually drawn, which mobile forces to vertical. The offset
   * is where inside the gutter the pointer landed, so the pane does not jump by up to 11px on the
   * first move.
   */
  beginDrag(event: PointerEvent, target: SplitTarget, gutter: HTMLElement): void {
    this.#moved = false;
    this.#target = target;
    this.#pointerAxis =
      target === 'main' ? (this.isHorizontal ? 'x' : 'y') : this.innerIsVertical ? 'y' : 'x';
    const gutterRect = gutter.getBoundingClientRect();
    this.#pointerOffset =
      this.#pointerAxis === 'x' ? event.clientX - gutterRect.left : event.clientY - gutterRect.top;
  }

  /**
   * The pointer moved while a gutter is held.
   *
   * Both elements are passed because the page owns the `bind:this` refs; which one is measured
   * follows the target, so a caller cannot mis-pair them.
   */
  dragTo(
    event: PointerEvent,
    mainElement: HTMLElement | undefined,
    alertChatElement: HTMLElement | undefined
  ): void {
    // Any movement at all makes this a drag rather than a click — see `#lastClickAt` above.
    this.#moved = true;

    if (this.#target === 'main' && mainElement) {
      const firstAreaFraction = this.#fractionWithin(event, mainElement);
      /*
        Mobile drags move the mobile split, never the desktop one, and the first pane is the
        PRESENTATION there — so the fraction has to be inverted, because both numbers mean "the
        chat/alerts share". `primaryIsFirst` is a direction question and does not apply at this
        width; the mobile order is fixed by `K4e`'s child sequence.
      */
      if (this.isMobileScreen) this.#mobile = 1 - firstAreaFraction;
      else this.#main = this.primaryIsFirst ? firstAreaFraction : 1 - firstAreaFraction;
    }

    if (this.#target === 'chat-alerts' && alertChatElement) {
      this.#chatAlerts = this.#fractionWithin(event, alertChatElement);
    }
  }

  /**
   * `hideShowPresentationArea()` — `app-room.full.js:2693-2698`, bound to `gutterDblClick` on the
   * outer split in both of the reference's layouts (`app-room.render-helpers.js:1622-1623` and
   * `:1787-1788`).
   *
   * The decision itself is in `#lib/split-gutter.js`, with the citations and the reasoning, because a
   * two-click state machine whose entire content is timing has to be drivable by a test.
   *
   * `K4e` binds `gutterDblClick` to this same handler (`:1787-1788`), so the toggle exists on a
   * phone too — and it has to move the number that layout is drawn from, or it would silently
   * rewrite the desktop geometry while the user is looking at the mobile one.
   *
   * Deliberately NOT persisted: upstream this ends in `printSizes()`, a `console.log` and nothing
   * else (`:2708-2712`), unlike `dragEnd` which does write. Persisting here would let a transient
   * toggle overwrite the geometry the user actually chose by dragging — which is why
   * {@link endDrag} returns null on this path rather than a write.
   */
  togglePresentation(): void {
    if (this.isMobileScreen) this.#mobile = togglePresentationSplit(this.resolvedMainSplit);
    else this.#main = togglePresentationSplit(this.resolvedMainSplit);
  }

  /**
   * The pointer was released. Returns the preference write the page should perform, or null.
   *
   * `now` is passed in rather than read from `performance.now()` here so the double-click window is
   * drivable by a test instead of by two real clicks 400ms apart.
   *
   * Three ways this ends in null, and they are different things:
   *
   * 1. **No drag was in progress.** This runs on every `pointerup` in the room, because the
   *    listener is on the window.
   * 2. **A double-click on the main gutter.** A gutter that never moved is a CLICK, and two of them
   *    inside the window are the reference's `gutterDblClick`. Only the main gutter carries it:
   *    upstream the binding is on the OUTER split in both layouts, never on the nested chat/alerts
   *    one. The toggle IS the geometry change and upstream persists none. The counter resets on use
   *    rather than tracking a running pair, so three clicks are one double-click and a leftover.
   * 3. **A mobile drag of the MAIN split**, because `K4e`'s outer split binds `dragStart` and no
   *    `dragEnd` (`app-room.render-helpers.js:1786-1791`) where the desktop `j4e` binds both
   *    (`:1620-1623`). `dragEnd` is the only thing that calls `resizeEndRoom` upstream, so there is
   *    nothing to record.
   *
   * The inner chat/alerts gutter is a separate question and keeps persisting on mobile: `W4e` drops
   * its `dragEnd` too, but our inner gutter writes the SAME `chatAlertSizes` key the desktop layout
   * reads, and dropping the write would mean a phone silently reverting a size the user had set on
   * a laptop. That is a divergence, and it is here rather than silent.
   */
  endDrag(now: number): SplitWrite | null {
    const target = this.#target;
    this.#target = null;
    if (target === null) return null;

    if (target === 'main') {
      const release = gutterRelease(this.#lastClickAt, now, this.#moved);
      this.#lastClickAt = release.lastClickAt;
      if (release.doubleClick) {
        this.togglePresentation();
        return null;
      }
      if (this.isMobileScreen) return null;
    }

    return this.#writeFor(target);
  }

  /**
   * `hideChat` — the chat pane collapses for NON-presenters while the room's chat mode is `d`.
   *
   * ```js
   * guiEventBus.subscribe('changeChatMode', e => { …
   *   setTimeout(() => { guiEventBus.emit('resizeChatView');
   *     this.isPresenter || guiEventBus.emit('hideChat', 'd' == e); }, 1e3) })
   *
   * guiEventBus.subscribe('hideChat', i => {
   *   if (i) { this.chatSize = 0; this.alertSize = 100;
   *     preferences.extraChatColumn && (preferences.extraChatColumn = !1,
   *                                     this.extraChatColumnWasEnabled = !0) }
   *   else { this.extraChatColumnWasEnabled && (preferences.extraChatColumn = !0, …)
   *          … restore alertSize/chatSize from localStorage … } })
   * ```
   *
   * A presenter keeps their pane: they are the one who turned chat off and still has to read it.
   *
   * Sizes are restored from what they were rather than from `localStorage` keys: upstream reads
   * `chatAlertSizes` or `chatAlertSizes-bottom` depending on split direction because its sizes live
   * in those keys, and ours live in `#chatAlerts`. Same outcome, one source of truth.
   *
   * `extraChatColumnWasEnabled` has NO counterpart here, and its absence is the point. Upstream
   * needs that flag because it MUTATES the preference and has to remember what it was. Here the
   * preference is never written — the page derives the column's visibility from the preference AND
   * `chatCollapsed`, so clearing the collapse restores the column by construction and there is
   * nothing to remember. Keeping a flag that records an answer nothing asks would be a second
   * source of truth for one fact.
   */
  collapseChatForMode(shouldHide: boolean): void {
    if (shouldHide === this.#chatCollapsed) return;
    if (shouldHide) {
      this.#beforeCollapse = this.#chatAlerts;
      // `chatSize = 0; alertSize = 100` — the alerts pane takes the whole column.
      this.#chatAlerts = 1;
      this.#chatCollapsed = true;
      return;
    }
    this.#chatAlerts = this.#beforeCollapse;
    this.#chatCollapsed = false;
  }

  /**
   * Where the pointer sits inside a split container, as a 0–1 fraction of the space the two panes
   * share.
   *
   * The gutter's own width is subtracted before dividing, because the panes only get what is left
   * of the container; dividing by the full width would make a pointer at the far edge resolve to
   * less than 1 and the pane would never quite fill. `Math.max(1, …)` is the divide-by-zero guard
   * for a container narrower than its own gutter, which happens mid-transition.
   */
  #fractionWithin(event: PointerEvent, element: HTMLElement): number {
    const rect = element.getBoundingClientRect();
    const availableSize = Math.max(
      1,
      (this.#pointerAxis === 'x' ? rect.width : rect.height) -
        DUMP_CONTRACT.baseline.splitGutterWidth
    );
    const pointer =
      this.#pointerAxis === 'x' ? event.clientX - rect.left : event.clientY - rect.top;
    return clamp(pointer - this.#pointerOffset, 0, availableSize) / availableSize;
  }

  /**
   * The pair to persist for a completed drag.
   *
   * The room pair is written presentation-first on a vertical room, which is the inverse of how
   * {@link resolveSplitSizes} reads it — one place stores `[chatAlerts, presentation]` and the
   * other `[presentation, chatAlerts]`, and they have to agree or a reload transposes the room.
   * That agreement is asserted in `split.svelte.test.ts` by writing and reading back.
   *
   * `roomIsHorizontal` and not `isHorizontal`: what is STORED belongs to the arrangement the user
   * chose, not to the width they happen to be at. A laptop narrowed below 601px must not start
   * writing its sizes into the other direction's slot.
   */
  #writeFor(target: SplitTarget): SplitWrite | null {
    const { roomKey, chatKey } = splitStorageKeys(this.#direction);

    if (target === 'main' && this.#main !== null) {
      const main = this.#main;
      return {
        key: roomKey,
        pair: this.roomIsHorizontal
          ? [main * 100, (1 - main) * 100]
          : [(1 - main) * 100, main * 100]
      };
    }

    if (target === 'chat-alerts' && this.#chatAlerts !== null) {
      const chatAlerts = this.#chatAlerts;
      return { key: chatKey, pair: [chatAlerts * 100, (1 - chatAlerts) * 100] };
    }

    return null;
  }
}

/**
 * The flex basis for one pane of a split, as the reference's own `as-split` writes it.
 *
 * The gutter is shared between the two panes in proportion to their sizes, which is where the
 * second term comes from: a pane at 25.5107% carries 25.5107% of the 11px gutter. Reproducing the
 * captured strings exactly is what `split.svelte.test.ts` checks.
 */
function flexSize(fraction: number): string {
  return `calc(${fraction * 100}% - ${fraction * DUMP_CONTRACT.baseline.splitGutterWidth}px)`;
}
