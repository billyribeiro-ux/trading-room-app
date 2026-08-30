import type { SvelteMap } from 'svelte/reactivity';

import type { ScreenTab } from '#lib/components/ScreenTabs.svelte';
import {
  type MediaCaptureKind,
  type MediaPermissionKind,
  captureErrorMessage,
  captureErrorName,
  mediaCaptureErrorMessage,
  permissionForCapture
} from '#lib/media-capture-error.js';
import { audioCaptureConstraints, type CaptureSettings } from '#lib/capture-settings.js';
import type { AutoRecordTrigger } from '#lib/auto-record.js';
import type { MediaSession } from '#lib/media/session.js';
import type { SignallingClient } from '#lib/media/signalling.js';
import type { WebcamPresenter } from '#lib/types.js';

import type { RoomDialogs } from './dialogs.svelte';
import type { RoomMedia } from './media.svelte';
import type { TransportSession } from './media-transport.svelte';
import type { RoomScreenOverlay, WrappedScreen } from './screen-overlay';
import type { RoomScreens } from './screens.svelte';
import type { RoomToasts } from './toasts.svelte';

/*
  WHAT THIS BROWSER PUBLISHES, as opposed to what it consumes.

  ## Why the split exists, and why it is this line and not another

  `media-transport.svelte.ts` crossed the CODE backstop — 812 lines against 800 — on 2026-08-26, and
  that gate's message is deliberately not a number to edit: *"A module this size has stopped being a
  module; find the domain seam rather than raising the backstop."*

  The seam is the direction media travels. One class acquired microphones, cameras and screens from
  this machine and pushed them at the SFU; the same class also consumed everybody else's and
  managed the socket that carried both. Those are three jobs and only the middle one was named.
  What moved here is the first: every path that starts at a `getUserMedia` / `getDisplayMedia`
  prompt and ends at a producer.

  ## The cost, stated rather than discovered later

  **The tab list has two writers.** `#sharedScreens` and `#screenStreams` describe every screen the
  viewer can select, and screens arrive from both directions — this peer's own shares and other
  people's, consumed. They therefore stay owned by `RoomMediaTransport` and are reached from here
  through the `#tabs` port. That was measured before the split rather than met during it: of the 27
  private members crossing the seam, 5 moved cleanly, 10 are collaborators both sides already share,
  and these two are the genuine tangle.

  A port rather than a setter pair because `#tabs.list = next` reads as an assignment at both ends,
  which is what the moved code already said. Callbacks would have turned every one of those lines
  into something that no longer looks like the statement it replaced.

  ## The transport keeps its public surface

  Nothing outside this pair changed. `RoomMediaTransport.toggleMicrophone()`, `.screenStream`,
  `.localScreenStreams` and the rest still exist and now delegate here, so the page, `RoomRecording`,
  `RoomEventStream` and every contract test that reads them are untouched. A refactor that also
  rewrote fifty call sites would have made the two changes impossible to tell apart in review.
*/

/** Ends every track in a stream. Pure, so both classes call the same one rather than each holding a copy. */
export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Mutes or unmutes without releasing the device.
 *
 * `enabled = false` stops the peer sending while the capture stays open, which is what the capture's
 * `muteMic()` does and is why the microphone light does not go out — releasing the track would make
 * every unmute a fresh permission prompt.
 */
export function setStreamEnabled(stream: MediaStream | null, enabled: boolean): void {
  stream?.getTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

/**
 * "Name for this screen?" - the step that runs BEFORE anything is captured.
 *
 * Transcribed from the captured `startScreenSharing(e)` (`docs/source/main.d6d3c112b59b7d0d.js`):
 *
 * ```js
 * this.mediaSoupService.connected
 *   ? pa.prompt({ value: `Screen ${this.mediaSoupService.screenProducers.size+1}`,
 *       title: "Name for this screen ? Press OK for default. (You can share multiple screens
 *               from the same room and name each one here)",
 *       inputType: "text",
 *       callback: o => { if (!o) return; let r = o; r || (r = `Screen ${…length+1}`);
 *                        this.mediaSoupService.startScreenSharing(e, r, …) } })
 *   : pa.alert("Not connected to media server yet, please wait a second or two...")
 * ```
 *
 * Three things that were not obvious and are worth stating, because I got one of them wrong
 * before this line was found:
 *
 * 1. **There IS a generated default** - `Screen ${screenProducers.size + 1}` - prefilled into the
 *    input. A live room showing `FUTURES` and `MAIN / SPX` was the presenter typing over it, not
 *    evidence against a generator. Both are true: the name is free text, and the box starts
 *    populated.
 * 2. **Cancel aborts the share entirely.** `if (!o) return` runs before any capture, so no
 *    getDisplayMedia prompt appears. The `r || (r = …)` line after it is dead in the original -
 *    `o` is already truthy there - so the fallback it describes can never fire, and it is not
 *    reproduced.
 * 3. **Disconnected refuses instead of sharing**, with its own message. Sharing a screen the
 *    SFU cannot carry is the failure this exists to prevent: the presenter's own preview would
 *    look perfect while the room saw nothing.
 */
const SCREEN_NAME_PROMPT =
  'Name for this screen ? Press OK for default. (You can share multiple screens from the same room and name each one here)';

const MEDIA_NOT_CONNECTED_ALERT =
  'Not connected to media server yet, please wait a second or two... Or reload the page if it takes too long... *** If nothing else works, use the Gear icon on the right to open the Session Control and reset the media server...';

/**
 * The screen tabs, which this class WRITES but does not OWN.
 *
 * See the module header: screens reach the tab bar from both directions, so the list lives on the
 * transport and both writers reach it through this shape.
 */
export interface ScreenTabPort {
  /** The current tabs. A CALL, not a property — see the transport's note on `no-this-alias`. */
  list(): ScreenTab[];
  setList(next: ScreenTab[]): void;
  readonly streams: SvelteMap<string, MediaStream>;
  select(id: string): void;
}

/** The webcam card list, owned by the transport for the same reason as the tabs. */
export interface WebcamPresenterPort {
  add(presenter: WebcamPresenter): void;
  remove(producerId: string): void;
}

export class RoomLocalCapture {
  readonly #dialogs: RoomDialogs;
  readonly #toasts: RoomToasts;
  readonly #media: RoomMedia;
  readonly #screens: RoomScreens;
  readonly #overlay: RoomScreenOverlay;
  readonly #session: () => TransportSession;
  readonly #beginSpeech: () => void;
  readonly #endSpeech: () => void;
  readonly #stopRecording: () => void;
  readonly #autoRecord: (trigger: AutoRecordTrigger) => void;
  readonly #checkPermissionState: (kind: MediaPermissionKind, userAgent: string) => Promise<string>;
  readonly #closeScreenMenu: () => void;
  /** Every device and processing flag the A/V pane saves. See `#lib/capture-settings.ts`. */
  readonly #capture: () => CaptureSettings;
  readonly #mediaSession: () => MediaSession | null;
  readonly #mediaSignalling: () => SignallingClient | null;
  readonly #tabs: ScreenTabPort;
  readonly #webcams: WebcamPresenterPort;

  #microphoneStream: MediaStream | null;
  #webcamStream: MediaStream | null;
  #screenStream: MediaStream | null;
  #localMicProducerId: string | null;
  #localWebcamProducerId: string | null;
  #localScreenProducerId: string | null;
  #localScreenStreams: Map<string, MediaStream>;

  constructor(options: {
    dialogs: RoomDialogs;
    toasts: RoomToasts;
    media: RoomMedia;
    screens: RoomScreens;
    overlay: RoomScreenOverlay;
    session: () => TransportSession;
    beginSpeech: () => void;
    endSpeech: () => void;
    stopRecording: () => void;
    /**
     * `autoRecord` / `dontStopRecOnMicMute` — this class REPORTS the three moments and decides
     * nothing.
     *
     * `RoomRecording.autoRecord` reads the live state and applies `#lib/auto-record.ts`. Upstream
     * reacts to `micMuted`, `startTalking` and `startScreenSharing` on two event buses; this room
     * has no bus, so the three events are named at the three places they happen.
     */
    autoRecord: (trigger: AutoRecordTrigger) => void;
    checkPermissionState: (kind: MediaPermissionKind, userAgent: string) => Promise<string>;
    closeScreenMenu: () => void;
    capture: () => CaptureSettings;
    mediaSession: () => MediaSession | null;
    mediaSignalling: () => SignallingClient | null;
    tabs: ScreenTabPort;
    webcams: WebcamPresenterPort;
  }) {
    this.#dialogs = options.dialogs;
    this.#toasts = options.toasts;
    this.#media = options.media;
    this.#screens = options.screens;
    this.#overlay = options.overlay;
    this.#session = options.session;
    this.#beginSpeech = options.beginSpeech;
    this.#endSpeech = options.endSpeech;
    this.#stopRecording = options.stopRecording;
    this.#autoRecord = options.autoRecord;
    this.#checkPermissionState = options.checkPermissionState;
    this.#closeScreenMenu = options.closeScreenMenu;
    this.#capture = options.capture;
    this.#mediaSession = options.mediaSession;
    this.#mediaSignalling = options.mediaSignalling;
    this.#tabs = options.tabs;
    this.#webcams = options.webcams;

    this.#microphoneStream = null;

    /**
     * Reactive, unlike the other capture streams, because a `<video>` has to follow it.
     *
     * As a plain `let` this held a live camera track that nothing could observe: `toggleWebcam`
     * acquired it and enabled it, so the browser lit the in-use indicator, and the preview stayed
     * black because no attachment re-ran and no element ever received it. Both halves had to change
     * - see {@link attachLocalWebcam}.
     */
    this.#webcamStream = $state<MediaStream | null>(null);
    this.#screenStream = null;

    /**
     * The capture's `micProducer`. Muting PAUSES it rather than closing it - `muteMic()` calls
     * `micProducer.pause()` and emits `pauseProducer`, while only `disableMic()` closes it and stops
     * the track. Keeping the producer across a mute is what lets unmuting resume without a new
     * transport negotiation.
     */
    this.#localMicProducerId = null;

    /**
     * The capture's `camProducer`. Its presence is what `toggleCam()` branches on, and `stopCam()`
     * is a no-op without it - `stopCam() { if (this.camProducer) { … } }`.
     */
    this.#localWebcamProducerId = null;

    /**
     * The most recent local screen producer — this peer's own, so stopping the share can close it.
     * Kept for the single-screen callers (`applyScreenLayers` skipping our own producer) that only
     * need "one of ours".
     */
    this.#localScreenProducerId = null;

    /**
     * Every screen THIS presenter is currently sharing, producer id -> its capture stream.
     *
     * The mirror of the capture's `this.screenProducers = new Map` (byte 1072217). A plain Map, not
     * a SvelteMap: nothing renders from it - the tab bar renders from `sharedScreens`, which comes
     * back from the SFU - so making it reactive would buy a dependency and no redraw.
     */
    this.#localScreenStreams = new Map<string, MediaStream>();
  }

  get microphoneStream(): MediaStream | null {
    return this.#microphoneStream;
  }

  get webcamStream(): MediaStream | null {
    return this.#webcamStream;
  }

  get screenStream(): MediaStream | null {
    return this.#screenStream;
  }

  set screenStream(next: MediaStream | null) {
    this.#screenStream = next;
  }

  get localScreenStreams(): Map<string, MediaStream> {
    return this.#localScreenStreams;
  }

  get localScreenProducerId(): string | null {
    return this.#localScreenProducerId;
  }

  /**
   * Is this peer PUBLISHING anything?
   *
   * A muted microphone still counts: muting disables the track and keeps the producer, so a peer
   * that has muted itself is still a producer as far as the grant is concerned. That distinction is
   * why this reads the producer id rather than `media.micMuted`.
   */
  get isProducing(): boolean {
    return Boolean(
      this.#localMicProducerId || this.#webcamStream || this.#localScreenStreams.size > 0
    );
  }

  /** Releases every local device. Called on teardown, where the transport used to do it inline. */
  releaseAll(): void {
    stopStream(this.#microphoneStream);
    stopStream(this.#webcamStream);
    for (const stream of this.#localScreenStreams.values()) stopStream(stream);
    this.#localScreenStreams.clear();
    this.#microphoneStream = null;
    this.#webcamStream = null;
    this.#screenStream = null;
    this.#localMicProducerId = null;
    this.#localWebcamProducerId = null;
    this.#localScreenProducerId = null;
  }

  /**
   * Turn a capture failure into the one sentence the user sees.
   *
   * The DECISION moved to `media-capture-error.ts`; what stays here is the part that is genuinely
   * the page's: the async permission round trip and the assignment to `dialogs.alert`.
   *
   * The `NotAllowedError` path is why this is still async. `mediaCaptureErrorMessage` returns null
   * for it because the answer depends on what the Permissions API says, and the room deliberately
   * stays SILENT unless that comes back denied - somebody who just dismissed the prompt themselves
   * does not need to be told they dismissed it. The `Permission denied` prefix is the test, because
   * every other state comes back as a sentinel rather than prose.
   */
  async #reportCaptureError(kind: MediaCaptureKind, error: unknown) {
    const errorName = captureErrorName(error);

    if (errorName === 'NotAllowedError') {
      const guidance = await this.#checkPermissionState(
        permissionForCapture(kind),
        navigator.userAgent
      );
      if (guidance.startsWith('Permission denied')) this.#dialogs.alert = guidance;
      return;
    }

    const message = mediaCaptureErrorMessage({
      kind,
      errorName,
      errorMessage: captureErrorMessage(error),
      isSecureContext: window.isSecureContext
    });
    if (message) this.#dialogs.alert = message;
  }

  async #enableMicrophone(retryCount = 0) {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException('Microphone access is not supported', 'NotSupportedError');
      }
      // `{ audio: true }` until 2026-08-30, so the A/V pane's microphone select and its three
      // processing checkboxes wrote preferences and changed nothing. `audioCaptureConstraints`
      // carries the reference's rule, and why `retryCount` is what decides it.
      const audio = audioCaptureConstraints(this.#capture(), retryCount);
      this.#microphoneStream ??= await navigator.mediaDevices.getUserMedia({ audio });
      setStreamEnabled(this.#microphoneStream, true);
      this.#media.micMuted = false;

      /*
        Publish it, or nobody hears anything.

        `MediaSession.produceMicrophone` (`src/lib/media/session.ts:571`) was written and never
        called, so this room acquired a microphone, lit the browser's in-use indicator, ran speech
        recognition on it - and never sent a single packet. The capture produces here:
        `enableMic` creates `micProducer`, and every later control (`muteMic`, `unmuteMic`,
        `disableMic`) is a no-op without it.

        Produced once and kept: a mute pauses this producer rather than replacing it.
      */
      const micTrack = this.#microphoneStream.getAudioTracks()[0];
      const sessionForMic = this.#mediaSession();
      if (micTrack && sessionForMic && !this.#localMicProducerId) {
        try {
          const producer = await sessionForMic.produceMicrophone(micTrack);
          this.#localMicProducerId = producer.id;
        } catch (error) {
          console.error('[media] the microphone could not be published', error);
          this.#toasts.show({
            kind: 'error',
            message: 'Your microphone could not be shared with the room.',
            enableHtml: false
          });
        }
      }
      // An open mic is what "talking" means here - see `audioProducerOwners`.
      this.#media.startTalking({
        userID: this.#session().user.id,
        mediaValue: { name: this.#session().user.displayName }
      });
      // `autoRecord` — upstream's `startTalking` subscriber, for our own user id.
      this.#autoRecord('micOpened');
      this.#beginSpeech();
    } catch (error) {
      if (retryCount === 0) {
        await this.#enableMicrophone(1);
        return;
      }
      this.#media.micMuted = true;
      this.#media.stopTalking(this.#session().user.id);
      await this.#reportCaptureError('microphone', error);
    }
  }

  async toggleMicrophone() {
    if (!this.#media.micMuted) {
      /*
        The TOOLBAR is `toggleMute()`, and its mute branch is `disableMic()` - not `muteMic()`.

        ```js
        toggleMute() { this.micProducer ? (this.micMuted ? this.enableMic(!1) : this.disableMic())
                                        : this.enableMic(!1) }

        disableMic() {
          if (this.micProducer) {
            this.micMuted = !0; this.guiEventBus.emit("media.micMuted", this.micMuted);
            this.stopSpeechRecognition(); this.micStream = null;
            this.micProducer.close();
            this.prevMicStream.getAudioTracks()[0].stop();
          }
        }
        ```

        `muteMic()`/`unmuteMic()` - the pause/resume pair - are the REMOTE-ADMIN controls, reached
        from a presenter command, not from this button. Using them here left the producer alive: a
        member kept an `<audio>` element and a live consumer for a microphone that had stopped
        sending, which is exactly the "presenter is off but still showing" report. Closing it is
        what makes `producerClosed` reach the room.
      */
      const sessionForMute = this.#mediaSession();
      if (this.#localMicProducerId && sessionForMute) {
        void sessionForMute.closeProducer(this.#localMicProducerId);
      }
      this.#localMicProducerId = null;
      stopStream(this.#microphoneStream);
      this.#microphoneStream = null;
      this.#media.micMuted = true;
      /*
        BEFORE `stopTalking`, and the order is the rule rather than a preference.

        `autoRecord`'s stop is gated on `talkingUsers.length <= 1` — "nobody ELSE has an open mic" —
        and upstream evaluates that with the muting user still in the array, because its subscriber
        runs on a gui event that precedes the server's `stopTalking` round trip. This room removes
        the user locally and synchronously, so calling this afterwards would count one fewer and
        stop the recording while somebody else is still speaking. `#lib/auto-record.ts` says the same
        thing at the field it belongs to.
      */
      this.#autoRecord('micClosed');
      this.#media.stopTalking(this.#session().user.id);
      this.#endSpeech();
      return;
    }

    this.#media.micLaunching = true;
    try {
      await this.#enableMicrophone();
    } finally {
      this.#media.micLaunching = false;
    }
  }

  /**
   * The toolbar's webcam control - `toggleCam()`, and the half that actually ends a camera.
   *
   * ```js
   * toggleCam() { this.connected ? (this.camProducer ? this.stopCam() : this.enableCam(!1)) : … }
   *
   * stopCam() {
   *   if (this.camProducer) {
   *     this.camMuted = !0; this.guiEventBus.emit("camMuted", this.camMuted);
   *     if (this.localWebcamStream)
   *       this.localWebcamStream.getTracks().forEach(e => { e.stop() });     // releases the device
   *     this.prevCamStream = null;
   *     this.socket.emit("cmd", {cmd:"closeProducer", kind:"video", producerId:…}, …);
   *   }
   * }
   * ```
   *
   * The capture never toggles `track.enabled` for the camera: it STOPS every track and re-acquires
   * with a fresh `getUserMedia` on the way back in (`enableCam` -> "enableWebcam() | calling
   * getUserMedia()"). This room had been caching the stream with `webcamStream ??= …` and flipping
   * `enabled`, which left `readyState: "live"` forever - measured after pressing the control:
   * the track stayed live and the browser kept reporting the camera in use, with no path in the UI
   * that ever released it. `stopStream` (which calls `track.stop()`) was wired only into page
   * teardown.
   *
   * The SFU half - `closeProducer` - is not reproduced; this room has no camera producer yet.
   */
  async toggleWebcam() {
    this.#media.camLaunching = true;
    try {
      if (!this.#media.camMuted) {
        // `stopCam()` closes the producer as well as stopping the tracks:
        //   socket.emit("cmd", {cmd:"closeProducer", kind:"video", producerId: camProducer.id},
        //              () => { this.camProducer.close(); this.camProducer = null })
        // Closing it server-side is what tears down every viewer's consumer; without it a member
        // keeps a frozen last frame instead of losing the camera.
        const sessionForCamStop = this.#mediaSession();
        if (this.#localWebcamProducerId && sessionForCamStop) {
          void sessionForCamStop.closeProducer(this.#localWebcamProducerId);
        }
        this.#localWebcamProducerId = null;
        stopStream(this.#webcamStream);
        this.#webcamStream = null;
        this.#media.camMuted = true;
        this.#webcams.remove(String(this.#session().user.id));
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException('Camera access is not supported', 'NotSupportedError');
      }
      /*
        A fresh acquire, not a cached stream: the previous one was stopped and cannot be revived.

        Only the device is constrained, NOT the resolution - and that is deliberate. `enableCam()`
        reads `const {resolution: _} = this.webcam` and spreads `JN[_]`, but `this.webcam` is
        initialised `{device: null, resolution: "sd"}` and nothing in the bundle ever writes to it.
        `JN` has no `sd` key, so `JN["sd"]` is `undefined` and `{...undefined}` contributes nothing:
        the original's webcam runs unconstrained. Adding 1080p here would be an improvement the
        capture does not make, so it stays out until it is asked for - see `docs/streaming-choices.md`.
      */
      this.#webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { ideal: this.#capture().videoDeviceId || undefined } }
      });
      this.#media.camMuted = false;
      // `webcamingUsers.push(r)` then `guiEventBus.emit("newWebcamPresenter", r)`.
      this.#webcams.add({
        id: String(this.#session().user.id),
        name: this.#session().user.displayName,
        isMe: true
      });

      /*
        Publish it. Without this the camera is purely local - the presenter sees their own preview
        and no member sees anything, which is exactly what this room did: `toggleWebcam` had no
        produce call of any kind, while `MediaSession.produceWebcam` sat written and uncalled at
        `src/lib/media/session.ts:592`.

        The capture creates a producer here too - `camProducer = yield producerTransport.produce({
        stopTracks:!1, …})` - and `toggleCam()` branches on its existence.

        Failure is reported rather than swallowed, matching the screen path: the local preview will
        still be running, so a silent failure looks to the presenter exactly like success.
      */
      const track = this.#webcamStream.getVideoTracks()[0];
      const sessionForCam = this.#mediaSession();
      if (track && sessionForCam) {
        try {
          const producer = await sessionForCam.produceWebcam(track);
          this.#localWebcamProducerId = producer.id;
        } catch (error) {
          console.error('[media] the webcam could not be published', error);
          this.#toasts.show({
            kind: 'error',
            message: 'Your camera could not be shared with the room.',
            enableHtml: false
          });
        }
      }
    } catch (error) {
      this.#media.camMuted = true;
      await this.#reportCaptureError('camera', error);
    } finally {
      this.#media.camLaunching = false;
    }
  }

  /** The navbar's stop control: ends every screen this presenter is sharing. */
  stopScreenSharing() {
    this.#closeScreenMenu();
    this.#stopRecording();
    for (const producerId of [...this.#localScreenStreams.keys()]) this.stopLocalScreen(producerId);
    // A share that never reached the SFU has no producer id to key on, so it is not in the map.
    stopStream(this.#screenStream);
    this.#screenStream = null;
    this.#localScreenProducerId = null;
    this.#media.screenSharing = false;
  }

  promptForScreenName(source: 'screen' | 'camera') {
    // `this.mediaSoupService.connected` in the capture. Deliberately not `sessionReady`: that is a
    // Promise, so it is truthy the moment load() is CALLED - including after it rejected - and it
    // says nothing about whether the socket is currently up.
    const session = this.#mediaSession();
    if (!session || !this.#mediaSignalling()?.connected) {
      this.#dialogs.alert = MEDIA_NOT_CONNECTED_ALERT;
      this.#closeScreenMenu();
      return;
    }
    this.#dialogs.prompt = {
      title: SCREEN_NAME_PROMPT,
      // `screenProducers.size + 1` - what this session is already sharing, so a second screen
      // opens on "Screen 2" rather than on "Screen 1" again.
      value: `Screen ${session.screenNames.length + 1}`,
      onconfirm: (value) => {
        this.#dialogs.prompt = null;
        const screenName = value.trim();
        // `if (!o) return`: cancelling, or clearing the box, shares nothing at all.
        if (!screenName) return;
        void this.startScreenSharing(source, screenName);
      }
    };
  }

  async startScreenSharing(source: 'screen' | 'camera', screenName: string) {
    // Deliberately NOT stopping the screen already being shared.
    //
    // This used to open with `stopStream(screenStream)`, which killed the previous screen's track
    // while leaving its producer open at the SFU. The result was the worst shape a media bug takes:
    // viewers kept the tab, the <video> stayed unpaused, the track still reported
    // readyState "live" - and no frame ever arrived again. Measured directly: sharing a second
    // screen left the first stuck at currentTime 6.50 for as long as it was watched, with nothing
    // anywhere reporting a fault.
    //
    // Multiple concurrent screens are the point - the naming prompt says so in its own text ("You
    // can share multiple screens from the same room and name each one here") and the capture holds
    // them in a Map (`this.screenProducers=new Map`, byte 1072217), stopping them individually by
    // producer id (byte 1099342). So each share keeps its own stream, keyed by its producer id.

    if (!navigator.mediaDevices?.getDisplayMedia) {
      this.#dialogs.alert =
        'Screen sharing is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.';
      return;
    }

    let stream: MediaStream | null = null;
    /*
      Declared OUT HERE so the catch below can release it. An overlay allocates a canvas, a hidden
      `<video>` and a 33ms interval before anything is published; a publish that then throws would
      otherwise leave all three running with nothing pointing at them, drawing frames forever into a
      stream nobody consumes.
    */
    let wrapped: WrappedScreen | null = null;
    try {
      stream =
        source === 'camera'
          ? await navigator.mediaDevices.getUserMedia({
              // `getUserMedia({video:{deviceId:{ideal: globals.videoDeviceID}, ...JN.hdd}})` in
              // `enableShare()`, where the capture's constraint table is
              //
              //   JN = { qvga:{320x240}, vga:{640x480}, hd:{1280x720},
              //          hdd:{width:{ideal:1920}, height:{ideal:1080}} }
              //
              // This path took a bare `{video: true}`, which is the browser default - MEASURED at
              // 640x480. Every member watching an OBS / XSPLIT / virtual-cam share was receiving a
              // ninth of the pixels the original sends. The selected camera was ignored too.
              video: {
                deviceId: { ideal: this.#capture().videoDeviceId || undefined },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              }
            })
          : await navigator.mediaDevices.getDisplayMedia({
              audio: false,
              video: {
                width: { max: 1920 },
                height: { max: 1080 },
                frameRate: { max: 30 }
              }
            });
      /*
        `alertsOverlayOnScreenshare` — a CANVAS between this capture and the wire, when the room asked
        for one. `#lib/room/screen-overlay.ts` decides; this line does not branch, because the
        wrapper it returns carries the raw stream unchanged whenever no overlay was created.

        The presenter's own preview follows the wrapped stream too, deliberately: a presenter who
        cannot see the overlay cannot tell that alerts are being burned into what everybody else is
        watching, and this is a setting whose whole effect is on other people's screens.
      */
      wrapped = await this.#overlay.wrap(stream, source, (producerId) =>
        this.stopLocalScreen(producerId)
      );

      this.#screenStream = wrapped.stream;
      this.#media.screenSharing = true;
      this.#closeScreenMenu();
      const track = wrapped.stream.getVideoTracks()[0];

      /*
        `contentHint = 'detail'` — `docs/streaming-choices.md` row 2, and the reasoning is the wire
        measurement in that document rather than a preference.

        Presenter-to-member, 12 seconds with a member attached: full 1920x1080 leaves the presenter,
        arrives at the member, paints at 1920x1080, VP9 end to end, ZERO dropped frames. And
        `qualityLimitationReason: none` with cumulative `bandwidth: 0, cpu: 0` — the encoder spent
        **zero seconds constrained**.

        So a soft-looking share is not a limit to lift. Nothing is throttling it; nothing is ASKING
        the encoder to spend more. With `encodings: undefined` there is no floor, no ceiling and no
        content hint, so libvpx's own heuristic decides — and that heuristic is tuned for camera
        video, where blurring a moving background is free. For candlesticks, gridlines and 13px
        quote text it is exactly the wrong trade.

        This is the one line that tells it otherwise. Applied to the SCREEN capture only, never to
        the camera path above, where the default heuristic is correct.

        Two honest caveats, both from the doc:

        * **Its cost is unmeasured.** It may raise the bitrate, and under genuine congestion it
          degrades frame rate rather than resolution — a share may end up sharper and choppier. The
          doc previously called this free; that was an assumption and it was wrong.
        * **It is a divergence.** The capture sets `contentHint = "detail"` on its alert-overlay
          canvas stream and never on the raw screen track.

        Chosen anyway because the measurement says the headroom is real and unused, and because it
        is one property on one track: reverting is deleting this line. The `getStats()` read that
        would settle it needs a presenter sharing a REAL desktop with a member attached, which is
        `scripts/collect-share-stats.js`.
      */
      if (track) track.contentHint = 'detail';

      /*
       * Send it to the SFU. Without this the capture is purely local - the presenter sees their own
       * preview and nobody else sees anything, which is what this room did until now.
       *
       * The name came from the prompt in `promptForScreenName`, which the captured app raises
       * before any capture happens. It is what the tab bar renders as `{name}-{screenName}`.
       */
      const sessionForScreen = this.#mediaSession();
      if (track && sessionForScreen) {
        try {
          const producer = await sessionForScreen.produceScreen(track, screenName);
          this.#localScreenProducerId = producer.id;
          /*
            The overlay learns its producer id HERE and not a line earlier, because until the publish
            succeeded there was no share for the browser's own "Stop sharing" bar to end. `keep` is
            what arms that path as well as what makes `stopLocalScreen` able to release the canvas.
          */
          wrapped.keep(producer.id);
          this.#localScreenStreams.set(producer.id, wrapped.stream);
          this.#addLocalScreen(producer.id, screenName, wrapped.stream);
          // Ending the capture - the browser's own "Stop sharing" bar - closes THIS screen only,
          // not every screen this presenter is sharing.
          track.addEventListener('ended', () => this.stopLocalScreen(producer.id), { once: true });
          /*
            `autoRecord` — upstream's `startScreenSharing` subscriber, narrowed to OUR OWN share.

            After the produce, not before it: upstream reacts to a share that reached the room, and a
            recording of a share nobody can see is the one outcome worse than no recording at all.
          */
          this.#autoRecord('screenShared');
        } catch (error) {
          /*
            The local preview still works; only the sharing half failed, and saying so beats a
            presenter believing the room can see them.

            THE OVERLAY GOES, AND THE RAW CAPTURE STAYS. Nothing was published, so nothing will ever
            call `stopLocalScreen` for this share and nothing would ever release the canvas — the
            33ms interval would draw for the rest of the page's life. `detach` releases exactly that
            and leaves the raw tracks running, which is what the preview needs and what
            `stopScreenSharing` reaches through `#screenStream`. Restoring `#screenStream` to the RAW
            stream is the other half: left pointing at the canvas, the presenter's own "Stop" would
            end the canvas and leave the browser still sharing their screen.
          */
          wrapped.detach();
          this.#screenStream = stream;
          console.error('[media] the screen could not be published', error);
          this.#toasts.show({
            kind: 'error',
            message: 'Your screen could not be shared with the room.',
            enableHtml: false
          });
        }
      }
    } catch (error) {
      // Only this attempt failed. Screens already being shared are untouched, and `media.screenSharing`
      // stays true if any of them survive - flipping it off would hide the stop control for shares
      // that are still running.
      // The overlay first: it holds the raw tracks as well as its own, so stopping it is what takes
      // the browser's "sharing your screen" indicator down. `stopStream` after it is the unwrapped
      // case and a no-op on tracks that are already ended.
      wrapped?.abandon();
      stopStream(stream);
      this.#screenStream = this.#localScreenStreams.values().next().value ?? null;
      this.#media.screenSharing = this.#localScreenStreams.size > 0;
      await this.#reportCaptureError('screen', error);
    }
  }

  /**
   * `restartScreen` — re-publish every screen this peer is sharing, WITHOUT re-prompting for it.
   *
   * ## The capture, read whole rather than summarised
   *
   * ```js
   * case "restartScreen":
   *   if (this.screenSharingUsers.length)
   *     for (let a of this.screenSharingUsers)
   *       this.globals.user.id == a.userID && (P("MediaHandlerService reconnecting screen: ", a),
   *         this.mediaSoupService.restartScreenSharing(a));
   *   break;                                                        // byte 1119400
   *
   * restartScreenSharing(e) {
   *   let s = this.screenProducers.get(e.producerID), r = s.localStream,
   *       a = r.getVideoTracks()[0];
   *   f = yield this.producerTransport.produce({ stopTracks:!1, track:a, …,
   *         appData:{ share:!0, screenName:e.mediaValue.screenName, isReconnect:!0, … } });
   *   this.appEventBus.emit("swapScreenProducers", {oldProducerID:_, newProducerID:f.id}),
   *   this.screenProducers.set(f.id, f), this.screenProducers.delete(_);
   * }                                                               // byte 1106692
   * ```
   *
   * **`stopTracks: !1` is the whole reason this can exist.** A screen capture is only obtainable
   * from a user gesture — `getDisplayMedia` refuses otherwise — so a command arriving over a socket
   * can never acquire one. It does not need to: the track is already live, and a restart re-produces
   * THE SAME TRACK onto a fresh producer. `session.ts:562` already passes `stopTracks: false` on
   * every produce in this room, for the reason recorded there, so closing the old producer leaves
   * the capture running and the browser never asks again.
   *
   * That is also why this is NOT `stopLocalScreen` followed by a share: `stopLocalScreen` calls
   * `#stopStream`, which ends the track. Going through it would drop the capture and leave the
   * presenter's "Restart Screens" looking exactly like "Stop Screens".
   *
   * ## Produce first, then close — the capture's order, and it is load-bearing
   *
   * `screenProducers.set(f.id, f)` precedes `screenProducers.delete(_)`. Closing first would leave
   * the room with no producer for that screen for the length of a round trip, and every viewer's
   * consumer torn down by `producerClosed`; producing first means the tab swaps under them. The cost
   * is that both producers exist for a moment, which the server tolerates and a black pane does not.
   *
   * ## What a failure does
   *
   * Nothing, loudly. `produce` throwing leaves the OLD producer untouched and still carrying the
   * screen — `return void P("screenProducer exception:", …)` is the capture's own answer — so the
   * worst case is the restart not happening rather than the share ending. Each screen is attempted
   * independently for the same reason `startLocalScreen` catches per attempt: one failing must not
   * take the presenter's other shares with it.
   */
  async restartLocalScreens(): Promise<void> {
    const session = this.#mediaSession();
    if (!session) return;

    // A copy, because the loop reassigns `#localScreenStreams` through `#addLocalScreen` and
    // `stopLocalScreen`'s bookkeeping below. Iterating the live map would skip entries.
    for (const [oldProducerId, stream] of [...this.#localScreenStreams]) {
      const track = stream.getVideoTracks()[0];
      // `readyState` and not just presence: a track the user has already ended cannot be re-produced,
      // and asking the SFU to carry a dead one would publish a frozen pane rather than a picture.
      if (!track || track.readyState !== 'live') continue;

      const screenName =
        this.#tabs.list().find((screen) => screen.id === oldProducerId)?.screenName ?? '';

      try {
        const producer = await session.produceScreen(track, screenName, { isReconnect: true });

        this.#localScreenStreams.set(producer.id, stream);
        this.#addLocalScreen(producer.id, screenName, stream);
        // The overlay is keyed by producer id and the id just changed. Without this it stays keyed
        // by one the SFU has closed, so the eventual `stopLocalScreen` releases nothing and the raw
        // capture keeps running after the presenter has stopped sharing.
        this.#overlay.rekey(oldProducerId, producer.id);
        track.addEventListener('ended', () => this.stopLocalScreen(producer.id), { once: true });
        if (this.#localScreenProducerId === oldProducerId) {
          this.#localScreenProducerId = producer.id;
        }

        /*
          The old one goes only once the new one is up. `closeProducer` closes the producer and not
          the track — `stopTracks: false` above — so this drops the SFU's copy and leaves the capture
          alone, which is the difference between this and `stopLocalScreen`.
        */
        await session.closeProducer(oldProducerId);
        this.#dropLocalScreen(oldProducerId, producer.id);
      } catch (error) {
        // The old producer is still carrying this screen; the restart simply did not happen.
        console.error('[media] a screen could not be restarted', error);
      }
    }

    this.#screenStream = this.#localScreenStreams.values().next().value ?? null;
  }

  /**
   * Forgets one local screen's tab, popout and stream entry. Touches no track and no producer.
   *
   * Shared by `stopLocalScreen` and `restartLocalScreens`, which agree on every line of this and
   * disagree on everything around it: stopping ends the track and closes the producer, restarting
   * ends neither. Written twice it drifted immediately — the restart path forgot `closePopout`,
   * leaving a detached window pointed at a producer id the SFU no longer knew.
   *
   * `nextSelectedId` is what the tab bar moves to. `stopLocalScreen` passes whichever share is left;
   * a restart passes the NEW producer, so the viewer stays on the screen they were already watching
   * rather than being thrown to the first tab in the list.
   */
  #dropLocalScreen(producerId: string, nextSelectedId: string | null) {
    this.#screens.closePopout(producerId);
    this.#localScreenStreams.delete(producerId);
    // Our own tab is ours to remove: no `producerClosed` comes back for a producer we closed, so
    // nothing else would ever drop it.
    this.#tabs.setList(this.#tabs.list().filter((entry) => entry.id !== producerId));
    this.#tabs.streams.delete(producerId);
    this.#screens.screenRemoved(producerId, nextSelectedId);
  }

  /**
   * Stops one shared screen, leaving the presenter's others running.
   *
   * The capture stops them individually by producer id (byte 1099342), which is the only thing
   * that makes "share multiple screens" usable - a presenter finishing with one chart should not
   * drop the other two.
   */
  stopLocalScreen(producerId: string) {
    const stream = this.#localScreenStreams.get(producerId);
    // Ends the draw interval and the raw capture behind it. A no-op for a share with no overlay,
    // which is every share in a room that did not tick `alertsOverlayOnScreenshare`.
    this.#overlay.release(producerId);

    // Close the producer before dropping the track: the server tears the room's consumers down
    // from `producerClosed`, so viewers lose the tab instead of keeping a frozen last frame.
    const sessionForClose = this.#mediaSession();
    if (sessionForClose) void sessionForClose.closeProducer(producerId);
    stopStream(stream ?? null);

    /*
      The first tab that is NOT this one, computed BEFORE the drop and deliberately not
      `list()[0]`. The line this replaced read the list AFTER the filter had already removed this
      entry, so the two are only the same expression if the filter moves with it — and passing it as
      an argument evaluates it first. Stopping the leftmost of three screens would then have
      re-selected the tab that was being removed.
    */
    const nextSelectedId = this.#tabs.list().find((entry) => entry.id !== producerId)?.id ?? null;
    this.#dropLocalScreen(producerId, nextSelectedId);

    if (this.#localScreenProducerId === producerId) this.#localScreenProducerId = null;
    // The recorder and the local preview follow whichever share is still running, if any.
    this.#screenStream = this.#localScreenStreams.values().next().value ?? null;
    if (this.#localScreenStreams.size === 0) {
      this.#stopRecording();
      this.#media.screenSharing = false;
    }
  }
  /**
   * Gives the presenter a tab for a screen they are sharing themselves.
   *
   * `addRemoteScreen` refuses our own producer on purpose - consuming yourself is refused by the
   * server with `unknownTransport` - which left a presenter sharing a screen with no tab for it at
   * all, seeing only other people's. The capture does not consume its own screen either; it adds a
   * LOCAL one:
   *
   * ```js
   * this.globals.user.id == r.userID && (
   *   this.isScreenSharing = !0, this.addLocalStream(r), …,
   *   setTimeout(() => { this.guiEventBus.emit("selectScreenTabOfId", r) }, 500))
   * ```
   *
   * So the stream behind this tab is the capture itself, straight from getDisplayMedia, never a
   * round trip through the SFU - which is also why it costs nothing and cannot fail.
   */
  #addLocalScreen(producerId: string, screenName: string, stream: MediaStream) {
    if (this.#tabs.list().some((screen) => screen.id === producerId)) return;
    this.#tabs.setList([
      ...this.#tabs.list(),
      {
        id: producerId,
        name: this.#session().user.displayName,
        screenName,
        avatarUrl: this.#session().user.avatarUrl,
        // Null, not this member's id: `RoomScreens.stop` asks `isLocalScreen` first, so a screen
        // shared from here is stopped here and no frame is ever addressed for it.
        ownerId: null
      }
    ]);
    this.#tabs.streams.set(producerId, stream);

    // `setTimeout(() => guiEventBus.emit("selectScreenTabOfId", r), 500)` in the capture: the view
    // moves to the new screen a moment after it appears rather than in the same frame.
    globalThis.setTimeout(() => {
      if (this.#tabs.list().some((screen) => screen.id === producerId)) {
        this.#tabs.select(producerId);
      }
    }, 500);
  }
}
