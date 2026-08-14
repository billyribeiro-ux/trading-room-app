/**
 * The MediaMTX stream list, and which tab is selected — `MtxHandlerService`, transcribed.
 *
 * Read from `docs/source/main.d6d3c112b59b7d0d.js` at byte 1137300, in full:
 *
 * ```js
 * initWithGlobalsAndEventHandler(e, i, o) {
 *   this.mtxStreams = [];
 *   this.appEventBus.subscribe("softResetDone", () => {
 *     this.mtxStreams = [];
 *     setTimeout(() => { this.appEventBus.emit("fetchSessionMediaStateMTX") }, 1e3);
 *   });
 *   this.appEventBus.subscribe("getSessionMediaStateMTX", () => {
 *     this.mtxStreams = this.globals.roomMediaStateMTX;
 *     this.mtxStreams.length > 0 && this.guiEventBus.emit("selectStreamTabOfId", this.mtxStreams[0]);
 *   });
 *   this.appEventBus.subscribe("mtxStartStream", s => {
 *     this.mtxStreams.push(s);
 *     (!this.selectedTabID || 1 === this.mtxStreams.length)
 *       && this.guiEventBus.emit("selectStreamTabOfId", s);
 *   });
 *   this.appEventBus.subscribe("mtxStopStream", s => {
 *     for (let r = 0; r < this.mtxStreams.length; r++)
 *       if (this.mtxStreams[r]._id === s._id) {
 *         this.mtxStreams.splice(r, 1),
 *         this.selectedTabID === s._id && this.mtxStreams.length > 0
 *           ? this.guiEventBus.emit("selectStreamTabOfId", this.mtxStreams[0])
 *           : this.selectedTabID === s._id && (this.selectedTabID = null);
 *         break;
 *       }
 *     this.connectToMTX(s);
 *   });
 *   setTimeout(() => { this.appEventBus.emit("fetchSessionMediaStateMTX") }, 1e3);
 * }
 * disconnectAll() { this.mtxStreams = []; this.selectedTabID = null; … }
 * disconnectFromMTX(e){}  handleStreamsMTX(){}  connectToMTX(e){}
 * ```
 *
 * ## The three empty methods are not a capture gap
 *
 * `connectToMTX`, `disconnectFromMTX` and `handleStreamsMTX` have **empty bodies in the shipped
 * bundle**. Upstream makes no client-side connection to MediaMTX at all — the service keeps a list
 * and chooses a tab, and the `<video>` element does the fetching (see `StreamingView.svelte`).
 * Anyone who assumes there is a connection routine to reproduce will look for something that does
 * not exist. `connectToMTX(s)` IS still called at the end of the stop handler, which is why the
 * call is noted here even though it does nothing.
 *
 * ## Why this is a pure module rather than component state
 *
 * Every rule above is a decision about a list, and each one is a place to get it subtly wrong: push
 * versus replace, select-on-first versus select-always, splice-by-identity versus by index, and what
 * happens to the selection when the selected stream is the one that stopped. A component cannot be
 * tested on those without a browser; this can, and is.
 */

/**
 * One MediaMTX stream, as the server sends it.
 *
 * Every field here is one the reference's own views READ — nothing is added speculatively:
 *
 * - `_id`          — identity. `mtxStopStream` matches on it (byte 1137300), the tab id is
 *                    `${_id}-tab` and the pane id is `_id`
 *                    (`app-presentationarea.full.js:574`, `:594`), and the player's video element
 *                    is `video-${muser._id}` (`app-streaming-view.full.js:384`).
 * - `sessionID`    — first path segment of the playlist URL (`app-streaming-view.full.js:113`).
 * - `producerID`   — second path segment. NOTE this is NOT the presenter's name: an ingest path is
 *                    `room__{sessionID}__{yourName}` but a PLAYBACK path is
 *                    `room__{sessionID}__{producerID}`.
 * - `mediaValue.name`       — the tab label (`app-presentationarea.full.js:582`).
 * - `mediaValue.serverName` — compared against `streamServerMTX` to decide the `__reb` suffix
 *                    (`app-streaming-view.full.js:114`).
 *
 * `mediaValue` is the same shape ordinary media users carry — `app-presentationarea.full.js:228-230`
 * reads `mediaValue.avt` and `mediaValue.screenName` off a screenshare — so an MTX stream is simply
 * another `muser`. That is also why the wire calls the payload key `muser`.
 */
export interface MtxStream {
  _id: string;
  sessionID: string;
  producerID: string;
  mediaValue: {
    name: string;
    serverName?: string;
  };
}

/** The list plus the selected tab, kept together because every rule below changes both. */
export interface MtxStreamState {
  streams: MtxStream[];
  /** `selectedTabID`. Null when nothing is selected — the reference's own initial value. */
  selectedTabID: string | null;
}

/** `this.mtxStreams = []; this.selectedTabID = null` — the constructor, and `disconnectAll()`. */
export function emptyMtxState(): MtxStreamState {
  return { streams: [], selectedTabID: null };
}

/**
 * `getSessionMediaStateMTX` — the full list, replacing whatever was held.
 *
 * A REPLACE, not a merge: `this.mtxStreams = this.globals.roomMediaStateMTX`. And the selection is
 * moved to the first stream only when the incoming list is non-empty, which is why an empty refresh
 * leaves the previous selection alone rather than clearing it.
 */
export function applySessionMediaState(list: MtxStream[]): MtxStreamState {
  return {
    streams: [...list],
    selectedTabID: list.length > 0 ? list[0]._id : null
  };
}

/**
 * `mtxStartStream` — append, and select only if nothing is selected or this is the first stream.
 *
 * `(!this.selectedTabID || 1 === this.mtxStreams.length)`. The second term is evaluated AFTER the
 * push, so it means "this is now the only stream". The effect is that a second presenter going live
 * does not yank every viewer's tab away from the one they are watching.
 */
export function applyMtxStartStream(state: MtxStreamState, stream: MtxStream): MtxStreamState {
  const streams = [...state.streams, stream];
  const takesSelection = !state.selectedTabID || streams.length === 1;
  return { streams, selectedTabID: takesSelection ? stream._id : state.selectedTabID };
}

/**
 * `mtxStopStream` — remove by `_id`, and move the selection only if the stopped stream held it.
 *
 * Three behaviours, all from the transcription and all easy to get wrong:
 *
 *  1. The loop `break`s at the first match, so exactly one entry is removed even if `_id` somehow
 *     repeated. Reproduced with `findIndex` + a single `splice`.
 *  2. An `_id` that is not present removes nothing and changes no selection — the loop simply never
 *     matches. It is NOT an error.
 *  3. If the stopped stream was selected: fall back to `streams[0]` of the REMAINING list, or null
 *     when none remain. If it was not selected, the selection is untouched.
 */
export function applyMtxStopStream(state: MtxStreamState, stream: MtxStream): MtxStreamState {
  const index = state.streams.findIndex((candidate) => candidate._id === stream._id);
  if (index === -1) return state;

  const streams = [...state.streams.slice(0, index), ...state.streams.slice(index + 1)];
  if (state.selectedTabID !== stream._id) return { streams, selectedTabID: state.selectedTabID };
  return { streams, selectedTabID: streams.length > 0 ? streams[0]._id : null };
}

/**
 * `selectStreamTabOfId` — the user picking a tab.
 *
 * `onStreamTabChange(e)` sets `this.selectedMTXStreamTab = e` and `mtxHandlerService.selectedTabID = e`
 * (`app-presentationarea.full.js:2724-2725`), so the component and the service hold the same value.
 * Here there is one value, which removes the possibility of the two disagreeing.
 */
export function selectMtxStreamTab(state: MtxStreamState, id: string): MtxStreamState {
  return { streams: state.streams, selectedTabID: id };
}

/**
 * The playlist path for a stream — `app-streaming-view.full.js:113-115`, verbatim:
 *
 * ```js
 * let e = `room__${this.muser.sessionID}__${this.muser.producerID}`;
 * this.muser.mediaValue.serverName !== this.appService.globals.streamServerMTX && (e += "__reb");
 * ```
 *
 * The `__reb` suffix marks a stream relayed from a DIFFERENT MediaMTX host than the one this viewer
 * is pointed at. Note the comparison is `!==` against the viewer's own `streamServerMTX`, so a
 * stream with no `serverName` at all also gets the suffix — that is the reference's behaviour and
 * it is reproduced rather than "fixed", because a missing `serverName` genuinely is not this host.
 */
export function mtxPlaybackPath(stream: MtxStream, streamServerMTX: string): string {
  const base = `room__${stream.sessionID}__${stream.producerID}`;
  return stream.mediaValue.serverName !== streamServerMTX ? `${base}__reb` : base;
}

/**
 * The full playlist URL — `app-streaming-view.full.js:116`, verbatim:
 *
 * ```js
 * this.videoSrc = `https://${globals.streamServerMTX}/${e}/index.m3u8?jwt=${globals.mtxToken}`;
 * ```
 *
 * `https` and NO port, unlike the ingest URLs: HLS is served on 443 through a TLS proxy while WHIP
 * ingest names 8889 explicitly. The token rides as `jwt`, the same parameter name the RTMP ingest
 * URL uses, which is why the controller's media-auth reads `jwt` for both.
 */
export function mtxPlaylistUrl(stream: MtxStream, streamServerMTX: string, mtxToken: string): string {
  return `https://${streamServerMTX}/${mtxPlaybackPath(stream, streamServerMTX)}/index.m3u8?jwt=${mtxToken}`;
}
