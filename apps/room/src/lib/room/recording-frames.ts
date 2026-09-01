import type { CmdsFrame } from './cmds-frame.js';
import type { RoomMedia } from './media.svelte.js';
import type { RoomMediaTransport } from './media-transport.svelte.js';
import type { RoomToasts } from './toasts.svelte.js';

/**
 * THE THREE RECORDING-AND-RESET FRAMES — and the one sentence that had been holding two of them.
 *
 * ## Why they are a module
 *
 * `for-all-broadcasts.ts` records the seam this follows: a group of `cmds` branches lifts out of
 * `RoomEventStream` cleanly when they SHARE their collaborators, and the rest of that chain does not
 * because each branch routes somewhere different. These three share `RoomMedia`, and two of the
 * three share `RoomMediaTransport` — they are the frames about what is being RECORDED and what
 * happens when the media plane is reset.
 *
 * `source-size-contract.test.ts` forced the timing, exactly as it did for `for-all-broadcasts.ts`:
 * transcribing all three took `events.svelte.ts` from 1,069 lines to 1,225, and that entry's rule is
 * extract rather than raise.
 *
 * The move is right on its own terms. Two of these three were recorded in `TODO.md` as unbuildable
 * for months, and the reason they were is worth keeping in one place a reader can open:
 *
 * > **A row that reasons from "our server does not send this frame" to "this cannot be built" has
 * > confused a PAYLOAD with a RECEIVER.**
 *
 * A receiver is transcribable whatever any server sends, and a receiver nothing triggers is exactly
 * what the reference has in a room whose server is quiet. Neither row's payload — the preview frame
 * URL, the recording message's wording — is invented here. What is transcribed is what the reference
 * DOES with them when they arrive.
 *
 * ## The contract
 *
 * `true` means "this frame was mine and is handled", `false` means "not mine" — never "nothing
 * happened". The same contract `handleForAllBroadcast`, `RoomSessionControl.handle`,
 * `RoomKicks.handle` and `RoomChatMute.handle` carry, for the reason `ModalHost` keeps one door:
 * making the caller decide which handler owns a string is the coupling that turned "Bring everyone
 * here" into a lie.
 */
/*
  Exported because the function's own signature names it, which is what makes a caller's object
  literal check rather than infer. `for-all-broadcasts.ts` takes positional parameters instead; four
  collaborators is where that stops reading well.
*/
export interface RecordingFrameDeps {
  media: RoomMedia;
  mediaTransport: RoomMediaTransport;
  toasts: RoomToasts;
  /** `globals.isPresenter`. A thunk, because `softResetDone` branches on it at delivery time. */
  isPresenter: () => boolean;
}

/**
 * The per-client jitter on a soft reset: `let oe = 3e3 * Math.random()`, byte 1,023,810.
 *
 * Declared here rather than in the router since 2026-09-01, with the only code that reads it — and
 * NOT exported, for the same reason it moved: an export nothing imports is a consumer-less symbol,
 * and this file is its only reader. It is a CEILING on a random spread rather than a duration, which
 * is why it stayed separate from the router's `RECONNECTED_FLASH_MS` when the two shared a value.
 */
const SOFT_RESET_JITTER_MS = 3_000;

export function handleRecordingFrame(
  command: CmdsFrame | undefined,
  deps: RecordingFrameDeps
): boolean {
  if (command?.cmd === 'setRecPreview') {
    /*
      `case "setRecPreview": console.log("setRecPreview: ", i),
         this.globals.sessData.recPreviewLocation = i.url; break;`   -- byte 1,023,704

      The server telling this browser where its own recording is being written as a still
      frame, and the ONLY writer of `recPreviewLocation` in the whole bundle. It arms three
      things at once: `app-rec-preview`'s subscriptions, the recording menu's Show/Hide pair,
      and the card's 1s refresh. See `RoomMedia.recPreviewLocation` for all three.

      `typeof` rather than a cast, for the reason `CmdsFrame` states at the top of its own
      file: everything on a socket frame is optional, and a handler that trusts the shape is
      asserting at the type level what no runtime check established. A frame carrying no
      `url`, or a non-string one, leaves the value alone rather than blanking a location the
      server already sent -- upstream would assign `undefined` here and lose it, which is the
      one place this differs and it differs by refusing to act on a malformed frame.

      The value reaches an `<img src>` and nothing else. It is never interpolated into markup,
      never run, and never used to authorise anything; the `cmds` channel is published by this
      room's own server (`#lib/server/room-events.ts`) and is not relayed from a client, which
      is the same trust the `url` on `playMP3ForAll` already rests on.

      The `console.log` is upstream's and is deliberately not transcribed -- a per-command log
      line in a room that receives these continuously is noise, and this file transcribes no
      other one.
    */
    if (typeof command.url === 'string') deps.media.recPreviewLocation = command.url;
    return true;
  }

  if (command?.cmd === 'stopRecMsg') {
    /*
      `case "stopRecMsg": this.guiEventBus.emit("stopRecMsg", i); break;`   -- byte 1,014,265

      and the subscriber, `app-room` at byte 2,505,283, verbatim:

      ```js
      this.appService.guiEventBus.subscribe("stopRecMsg", i => {
        -1 != i.data.indexOf("Stopped") ? this.alertsService.error(i.data)
                                : this.alertsService.info(i.data),
        new Notification(i.data, { body: i.data })
      })
      ```

      ## The row that held this said "the server does not send it", and that is not a blocker

      `TODO.md` row AC, twice re-audited, and its measurements are exact -- three occurrences,
      the emitter 35 bytes after its own `case` label, the subscriber at 2,505,283 (an offset
      that was itself wrong by 3,329 bytes until 2026-08-30 and was fixed by reading rather
      than trusting). Every one of them is confirmed again here.

      What the row got wrong is the same category error `setRecPreview` above was held by: it
      reasoned from "our server sends no such frame" to "this cannot be built". A RECEIVER is
      transcribable whatever the server sends, and a receiver nothing triggers is exactly what
      the reference has in a room whose server is quiet. The disposition of the row was right
      about the PAYLOAD -- the text is server-generated prose we cannot invent -- and wrong to
      conclude the handler could not exist. We do not invent the text; we transcribe what is
      done with it when it arrives.

      ## The `indexOf("Stopped")` test, kept exactly

      Case-sensitive, substring, on a capital S. It is the reference's own severity switch and
      it is not tidied into a status code or a regular expression: the wording it tests for is
      the reference server's, and any narrowing here would be this room deciding which of the
      server's sentences count as errors.

      ## Two things done differently, both stated

      The toast goes through `RoomToasts`, which sets `enableHtml: false`. `alertsService` is
      ngx-toastr, whose default is the same, so this is a match rather than a hardening -- but
      it is a match this room has to make deliberately, because `data` is text from a socket
      frame and a toast that rendered it as HTML would be a stored-XSS primitive fed by
      whatever produced the recording message.

      The browser notification goes through `RoomToasts.notify`, which tests `'Notification' in
      window` and asks for permission first. Upstream calls `new Notification(...)` raw, which
      on a browser that has never been asked shows nothing, and on several mobile browsers
      throws `Illegal constructor` -- inside a socket handler, where the throw would take the
      rest of the frame with it. The visible behaviour on a browser that has granted permission
      is identical, and that is the whole of the difference.

      `data` is narrowed rather than asserted, for `CmdsFrame`'s stated reason. An empty or
      non-string payload raises nothing at all: upstream would call `.indexOf` on it and throw.
    */
    const message = typeof command.data === 'string' ? command.data : '';
    if (!message) return true;
    if (message.includes('Stopped'))
      deps.toasts.show({ kind: 'error', message, enableHtml: false });
    else deps.toasts.info(message);
    deps.toasts.notify(message, message, null, '');
    return true;
  }

  if (command?.cmd === 'softResetDone') {
    /*
      A presenter reset the room's media. RE-READ WHOLE ON 2026-09-01, and the re-read changed
      what this does — the entry below used to describe one subscriber and there are FOUR, plus
      a fifth thing the command case itself does.

      ## The command case, byte 1,023,810

      ```js
      case "softResetDone":
        this.appEventBus.emit("softResetDone");
        let oe = 3e3 * Math.random();
        setTimeout(() => { this.send("getMyRepeater") }, oe);
        break;
      ```

      THE JITTER IS THE FEATURE. The frame reaches everybody in the same instant; without the
      delay every client would come back at once and the reset would arrive at the media plane
      as one burst from the whole room. That is the same thundering-herd reasoning
      `remoteRestartAudio` records for staying addressed to one member, and it is why the
      button's own text says the room reconnects *"gently"*.

      What waits for the jitter upstream is `send("getMyRepeater")` — asking the SERVER which
      media host to come back on. This room has no repeater negotiation, so `restart()` is what
      stands in its place: it is the same act, one hop shorter, and it is the one thing here
      that is an equivalence rather than a transcription.

      ## MediaHandler, byte 1,115,967

      ```js
      subscribe("softResetDone", () => {
        this.globals.roomState.isRecording = !1,
        this.globals.isPresenter && (this.mediaSoupService.disableMic(), this.mediaSoupService.stopCam());
        for (let r of this.webcamingUsers) this.guiEventBus.emit("removeWebcamPresenter", r);
        for (let r of this.screenSharingUsers);          // <- empty body, upstream's own
        this.disconnectAll(), this.handleTalkingString(), this.appEventBus.emit("screenBroadcastEnd")
      })
      ```

      `dropRemoteMedia()` is the webcam loop and `disconnectAll()` together, and it runs FIRST
      and immediately because that half is local and costs the media plane nothing: the tabs and
      sinks go now, the rebuild is what waits.

      **The presenter's own mic and camera go too, and until today they did not.** This entry
      carried that as a recorded divergence — *"a presenter silencing themselves by pressing a
      button labelled reset the media state of the room"* — and the owner's instruction is to
      match the dump, which overturns a reasoned preference. It is also less surprising than the
      note assumed: `restart()` rebuilds the SESSION, and a producer whose track was closed with
      it would come back muted anyway. `toggleMicrophone` / `toggleWebcam` are what this room
      calls `disableMic()` / `stopCam()` — see their own docblocks, where the toolbar's mute
      branch is `disableMic()` — and both are guarded on not-already-off, exactly as the
      `mutemic`/`mutecam` receivers below are.

      ## app-room, byte 2,501,883

      `roomState.isRecording = !1, this.recordingReminder = !1`. The recording flag is set by
      two different subscribers upstream and this is the one that also drops the reminder
      banner. `roomRecordingStopped()` clears three more fields than the reference does here —
      the name, the paused flag and `starting` — and none is observable: a paused-but-not-
      recording room renders nothing different, and the next `startRec` reassigns all three.

      ## The two subscribers with NOTHING to do in this room, measured rather than assumed

      `MtxHandlerService` (byte 1,137,494) clears `mtxStreams` and refetches after 1s:
      `setTimeout(() => emit("fetchSessionMediaStateMTX"), 1e3)`, which sends
      `getSessionMTXMediaState`. **This room has no client-side sender for that command** — the
      list is maintained by a SERVER-side reconciler (`#lib/mtx-reconcile.ts`), which is a
      stated divergence taken because our delivery path is weaker than a SocketCluster socket.
      So clearing the list here would be half of the reference's act and the worse half: the
      room would read "No one is streaming right now..." until the next reconcile tick, where
      upstream is dark for one second. Doing nothing is closer to the reference than doing half.

      `app-screenshare-preview` (byte 2,186,951) calls `$("#screenshareLocalPreviewHolder").hide()`.
      That holder is in `ModalHost.svelte` and `app-screenshare-preview .webcamsHolderScreen`
      carries `display: none` in the generated sheet with no writer in this room, so `.hide()`
      on it is a no-op here — the same shape `app-rec-preview` was in until this morning, and
      the same measurement.
    */
    deps.mediaTransport.dropRemoteMedia();
    deps.media.roomRecordingStopped();
    deps.media.recordingReminder = false;
    if (deps.isPresenter()) {
      if (!deps.media.micMuted) void deps.mediaTransport.toggleMicrophone();
      if (!deps.media.camMuted) void deps.mediaTransport.toggleWebcam();
    }
    globalThis.setTimeout(
      () => void deps.mediaTransport.restart(),
      Math.random() * SOFT_RESET_JITTER_MS
    );
    return true;
  }

  return false;
}
