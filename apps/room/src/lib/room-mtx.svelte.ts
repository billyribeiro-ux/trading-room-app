import {
  applyMtxStartStream,
  applyMtxStopStream,
  applySessionMediaState,
  emptyMtxState,
  selectMtxStreamTab,
  type MtxStream,
  type MtxStreamState
} from './mtx-streams';

/*
  The MediaMTX stream list, taken out of `+page.svelte` — the first `.svelte.ts` module in this
  repository, and the pattern the rest of the extraction follows.

  WHY THIS IS A CLASS AND NOT AN EXPORTED `let`. The official guidance is explicit that reassigned
  state cannot be exported from a `.svelte.js` / `.svelte.ts` module: the importing side would bind
  the VALUE, not the reactive box, and every transition here replaces the whole object rather than
  mutating it. A class field keeps the box behind `this`, so `+page.svelte` reads through a getter
  and stays reactive. An exported `let mtxState` would compile and then silently stop updating,
  which is the worst failure this codebase can ship — it looks fine until a stream never appears.

  WHY IT OWNS STATE AND NOT THE BUTTONS. `bringEveryoneToStream` and `toggleLockStreamMtx` stay in
  the component deliberately. They are a `fetch` and a documented upstream stub — neither reads or
  writes this state, and dragging them in would trade a large component for a module that does two
  unrelated jobs. The boundary is: this module owns the reactive list and every transition of it;
  the component owns actions that talk to the server.

  `$state.raw` rather than `$state`, for the reason the original declaration gave and which survives
  the move intact: `mtx-streams.ts` returns a whole new object from every transition and nothing
  ever mutates one in place, so a deep proxy over the list would be pure overhead on every read.

  This is a SEPARATE list from `sharedScreens` and the two must not be merged. They carry different
  objects (an MTX stream versus a `ScreenTab`), they are selected by different fields, and their
  panes play different transports — WebRTC for a screenshare, HLS over https for a stream.
*/
export class MtxStreamTabs {
  #state = $state.raw<MtxStreamState>(emptyMtxState());

  /** The stream list. Read-only to callers: every change goes through a transition below. */
  get streams(): readonly MtxStream[] {
    return this.#state.streams;
  }

  /** `selectedTabID` — null when nothing is selected, which is the reference's initial value. */
  get selectedTabID(): string | null {
    return this.#state.selectedTabID;
  }

  /**
   * A stream tab the USER clicked — the counterpart of the screenshare path, and deliberately NOT
   * the same function.
   *
   * `onStreamTabChange(e)` (`app-room.full.js:2722-2725`) is two assignments and nothing else. It
   * does not emit the
   * `stopWatchScreenOf` / `startWatchScreenOf` pair that the screenshare path does, because every
   * stream pane stays mounted and only its classes change, and it does not broadcast — the
   * `makeUsersFollowMyScreens` clause lives on the screenshare path alone.
   */
  selectByUser(streamId: string): void {
    this.#state = selectMtxStreamTab(this.#state, streamId);
  }

  /** `mtxStartStream` — the server announcing a stream it already holds. */
  started(stream: MtxStream): void {
    this.#state = applyMtxStartStream(this.#state, stream);
  }

  /** `mtxStopStream` — the same, in reverse. */
  stopped(stream: MtxStream): void {
    this.#state = applyMtxStopStream(this.#state, stream);
  }

  /**
   * `getSessionMediaStateMTX` — a REPLACE of the whole list, not a merge.
   *
   * The selection moves to the first stream only when the incoming list is non-empty, which is why
   * an empty refresh leaves the previous selection alone rather than clearing it. That rule lives
   * in `applySessionMediaState`; this method exists so the component never assigns the field.
   */
  replaceFromSession(list: MtxStream[]): void {
    this.#state = applySessionMediaState(list);
  }
}
