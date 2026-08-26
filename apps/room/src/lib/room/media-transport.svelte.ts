import { SvelteMap } from 'svelte/reactivity';

import type { ScreenTab } from '#lib/components/ScreenTabs.svelte';
import { type MediaPermissionKind } from '#lib/media-capture-error.js';
import { MediaSession } from '#lib/media/session.js';
import { joinsMediaAsProducer } from '#lib/roster-gates.js';
import { SignallingClient, legacyUserId, type ProducerInfo } from '#lib/media/signalling.js';
import type { WebcamPresenter } from '#lib/types.js';

import type { RoomDialogs } from './dialogs.svelte';
import { RoomLocalCapture } from './local-capture.svelte';
import type { RoomMedia } from './media.svelte';
import type { RoomScreens } from './screens.svelte';
import type { RoomToasts } from './toasts.svelte';
import type { RoomVolume } from './volume.svelte';

/**
 * Keeps every consumer's layer in step with what the viewer is actually looking at.
 *
 * The selected screen gets the producer's top layer; every other screen drops to spatial layer 0.
 * Without this, N shared screens cost N times the bandwidth and N times the decode no matter
 * which tab is on top - a viewer with four presenters sharing pays for four full-resolution
 * streams to look at one.
 *
 * Layer 9 rather than a real maximum: mediasoup clamps a request above what the producer offers
 * (proven in `session.rs`'s `a_consumers_preferred_layers_can_be_set_and_clamped`), so asking
 * high is how a client says "the best you have" without knowing whether the producer sent SVC,
 * simulcast or a single layer.
 */
const TOP_SPATIAL_LAYER = 9;

/** The load values the transport reads, taken as a thunk so a navigation reaches them. */
export interface TransportSession {
  user: {
    id: number;
    displayName: string;
    emailHash: string;
    avatarUrl: string;
    /*
      The three capability flags the GRANT is minted from, added in slice 26 when `connect` moved.

      `joinsMediaAsProducer(isPresenter || hasCam || hasMic || hasScreen)` is the reference's own
      rule and it is decided on the SERVER — `/api/media/grant` reads the controller's membership.
      These are read here only to send the request, never to decide anything.
    */
    hasMic: boolean;
    hasCam: boolean;
    hasScreen: boolean;
  };
  sessionHandle: string;
  connectedUsers: readonly { id: number; avatarUrl: string }[];
  /** The SFU's websocket, from the load. Dialled once, in `connect`. */
  mediaWsUrl: string;
}

/*
  The SFU TRANSPORT: the session, the producers this browser publishes, the consumers it subscribes
  to, and every stream on either side.

  Phase 5 slice 4, the largest of the phase — forty declarations and functions, 1,026 lines. It went
  last of the domain slices because everything else reads it and it reads almost nothing back.

  ## Why this is one class and `RoomMedia` is another

  `RoomMedia` holds what the UI ASKS FOR — mic muted, camera on, who is talking, is a recording
  running. This holds what the wire actually did about it. The split is not size: it is that a
  member can want their microphone on while the SFU has not connected, and collapsing the two loses
  the difference between "asked" and "happened".

  `media.svelte.ts` recorded "STATE moved, TRANSPORT did not" as a deliberate boundary in Phase 1.
  This is the other half of that sentence, and the boundary is unchanged.

  ## The stream maps belong HERE, and that resolves the sharing with `RoomScreens`

  `sharedScreens`, `screenStreams`, `webcamStreams`, `remoteAudioStreams`, `localScreenStreams`
  and `audioProducerOwners` are the transport's bookkeeping — filled when a producer arrives,
  emptied when it goes. `RoomScreens` reads the list through a thunk and asks for a removal through
  a receiver, which is exactly the shape slice 11 was built to, one slice early.

  ## What it does NOT decide

  **Whether a capture is allowed.** `describeMediaCaptureError` turns a `DOMException` into the
  sentence the member sees; the browser decides, and the server re-checks every elevation.

  **What the room is told.** Publishing a producer is this class's; announcing it is the event
  stream's. They meet at the wire and nowhere else.
*/
export class RoomMediaTransport {
  readonly #dialogs: RoomDialogs;
  readonly #toasts: RoomToasts;
  readonly #media: RoomMedia;
  readonly #screens: RoomScreens;
  readonly #session: () => TransportSession;
  readonly #roomVolume: RoomVolume;
  readonly #beginSpeech: () => void;
  readonly #endSpeech: () => void;
  readonly #stopRecording: () => void;
  readonly #showScreensTab: () => void;
  readonly #checkPermissionState: (kind: MediaPermissionKind, userAgent: string) => Promise<string>;
  readonly #closeScreenMenu: () => void;
  readonly #videoDeviceId: () => string | undefined;
  /*
    RE-ADDED in slice 26, having been removed in slice 4 as a collaborator with no reader.

    That removal was correct at the time and is correct now: nothing in the moved regions read it.
    `connect` does — it is one of the four flags `joinsMediaAsProducer` is asked about when the
    grant is requested. Recorded rather than quietly restored, because "this had no reader" and
    "this has a reader again" are different facts and the first one is still true of slice 4.
  */
  readonly #isPresenter: () => boolean;
  readonly #onCaption: (
    caption: { timestamp: number; sender: string; text: string; live: boolean },
    isFinal: boolean
  ) => void;

  #sessionReady: Promise<void> | null;
  #mediaSignalling: SignallingClient | null;
  #webcamPresenters: WebcamPresenter[];
  #sharedScreens: ScreenTab[];
  #screenStreams: SvelteMap<string, MediaStream>;
  #webcamStreams: SvelteMap<string, MediaStream>;
  #mediaSession: MediaSession | null;
  readonly #localCapture: RoomLocalCapture;
  #audioProducerOwners: Map<string, { userID: number; name: string }>;
  #remoteAudioStreams: SvelteMap<string, MediaStream>;
  #reconnectToastId: number | null;
  #presenterReconnectToastId: number | null;
  #saveData: boolean;
  #deferredScreens: Map<string, ProducerInfo>;

  constructor(options: {
    dialogs: RoomDialogs;
    toasts: RoomToasts;
    media: RoomMedia;
    screens: RoomScreens;
    session: () => TransportSession;
    roomVolume: RoomVolume;
    /** Speech recognition is a browser API the PAGE owns, because it writes into the caption list. */
    beginSpeech: () => void;
    endSpeech: () => void;
    /** Stopping a screen share stops the recording riding on it. */
    stopRecording: () => void;
    /** `mainTab = 'screens'` — the tab strip is the page's. */
    showScreensTab: () => void;
    /** Takes the permission KIND and the user agent, and always answers with a sentence. */
    checkPermissionState: (kind: MediaPermissionKind, userAgent: string) => Promise<string>;
    /** `menus.set('screen', false)` — the menu belongs to `RoomMenus`. */
    closeScreenMenu: () => void;
    /** The saved camera, from the preferences this class does not otherwise read. */
    videoDeviceId: () => string | undefined;
    /** Read only to request the grant; the SERVER decides what the grant may do. */
    isPresenter: () => boolean;
    /**
     * One transcribed line. `isFinal` says whether it replaces the live caption or joins history.
     *
     * The list itself stays on the page — the overlay renders it and the transcript page reads it.
     */
    onCaption: (
      caption: { timestamp: number; sender: string; text: string; live: boolean },
      isFinal: boolean
    ) => void;
  }) {
    this.#dialogs = options.dialogs;
    this.#toasts = options.toasts;
    this.#media = options.media;
    this.#screens = options.screens;
    this.#session = options.session;
    this.#roomVolume = options.roomVolume;
    this.#beginSpeech = options.beginSpeech;
    this.#endSpeech = options.endSpeech;
    this.#stopRecording = options.stopRecording;
    this.#showScreensTab = options.showScreensTab;
    this.#checkPermissionState = options.checkPermissionState;
    this.#closeScreenMenu = options.closeScreenMenu;
    this.#videoDeviceId = options.videoDeviceId;
    this.#isPresenter = options.isPresenter;
    this.#onCaption = options.onCaption;

    /**
     * Resolves once `MediaSession.load()` has completed.
     *
     * `newProducer` can arrive before the `connected` handler has finished loading the Device - the
     * server pushes it the moment another peer produces, which may be the same tick we joined. Every
     * consume path awaits this instead of racing it; without it the tab appeared with no picture and
     * the only symptom was `load() must resolve before this is available` in the console.
     */
    this.#sessionReady = null;

    /** The live socket, so the caption sender can issue commands without reaching into MediaSession. */
    this.#mediaSignalling = null;

    /**
     * `webcamingUsers`, as far as this room can populate it.
     *
     * The capture pushes an entry when a camera comes on ("<name> webcam on") and emits
     * `newWebcamPresenter`, which creates the card; `removePresenterWebcam` destroys it. So the
     * list IS the card set, and an empty list means no cards at all - which is why nothing should
     * be on screen before anyone opens a camera.
     *
     * Only this peer is in it. Remote cameras arrive over the SFU through
     * `connectToScreenOfProducer` / the `newWebcamStream` event, which is not wired yet, so a
     * remote presenter's card is honestly absent rather than rendered empty.
     */
    this.#webcamPresenters = $state<WebcamPresenter[]>([]);

    /**
     * Screens currently being shared, one tab each.
     *
     * A presenter can share several at once - the captured client keeps them in a Map
     * (`this.screenProducers=new Map`) and the captured tab bar rendered three tabs all belonging to
     * one presenter - so this is a flat list of screens, NOT a list of presenters. The label is
     * `{name}-{screenName}`, where `screenName` is free text the sharer typed (`FUTURES`,
     * `MAIN / SPX`), never generated.
     *
     * Empty until the media session is wired in: nothing in this app produces or consumes screen
     * media yet, so inventing entries here would put fabricated presenters on screen.
     */
    this.#sharedScreens = $state.raw<ScreenTab[]>([]);

    /**
     * The live MediaStream behind each screen tab, keyed by producer id.
     *
     * Kept beside `sharedScreens` rather than inside it because a tab is a label and a stream is a
     * resource: the tab can render the moment `newProducer` arrives, while `consume()` is still in
     * flight, and the pane simply has no picture until the stream lands. Merging them would mean
     * either a tab that appears late or a `ScreenTab` carrying a nullable MediaStream.
     */
    this.#screenStreams = new SvelteMap<string, MediaStream>();

    /**
     * The live MediaStream behind each REMOTE webcam card, keyed by producer id.
     *
     * Separate from {@link screenStreams} because the two are different surfaces: a screen becomes a
     * tab in the presentation area, a camera becomes a floating `app-presenter-cams` card.
     */
    this.#webcamStreams = new SvelteMap<string, MediaStream>();

    /**
     * The live media session, hoisted out of onMount so the screen-share button can produce into it.
     * Null until the socket is up; every call guards on it rather than assuming.
     */
    this.#mediaSession = null;

    /**
     * producer id -> the peer that audio producer belongs to.
     *
     * "Talking" in the capture means A MICROPHONE IS OPEN, not that anyone is making noise: the room
     * socket pushes `case "startTalking"` / `case "stopTalking"` carrying a `muser` (bundle byte
     * 1014120), and the client only ever SENDS those on `presUnmuted` / `presMuted` (byte 1141591).
     * There is no level detection anywhere in it - the bundle's single `createAnalyser` is the
     * AV-settings mic-test waveform, and `audioLevel`, `activeSpeaker` and `volumeChange` do not
     * occur at all.
     *
     * That second socket does not exist here, so the same fact is taken from the one that does: an
     * audio producer appearing means a mic opened, `producerPaused`/`producerResumed` mean it was
     * muted and unmuted, and `producerClosed` means it went away. `services/media/src/server.rs:1428`
     * says this is exactly what those announcements are for - "if the SFU that just paused the
     * producer does not say so, nothing does".
     */
    this.#audioProducerOwners = new Map<string, { userID: number; name: string }>();

    /**
     * Every remote peer's microphone, keyed by producer id.
     *
     * Audio needs an element to come out of. Nothing in this room consumed audio at all: both
     * `info.kind` guards were `!== 'video'`, so a remote microphone was discarded on arrival.
     */
    this.#remoteAudioStreams = new SvelteMap<string, MediaStream>();

    /**
     * The two sticky reconnect toasts, read out of the reference's own room bundle.
     *
     * `docs/source/main.d6d3c112b59b7d0d.js`, in the mediasoup socket's `disconnect` handler:
     *
     *     i.reconnectToast || (i.reconnectToast = i.toastr.info(
     *       'Reconnecting to media... <i class="fas fa-cog fa-spin ms-2"></i>', "Media",
     *       { disableTimeOut: !0, tapToDismiss: !0, closeButton: !0, enableHtml: !0 }))
     *
     *     (i.liveMicTrack || i.liveCamTrack || i.liveScreenTrack) && !i.presenterReconnectToast && (
     *       i.presenterReconnectToast = i.toastr.info(
     *         "Reconnecting media (presenter)... re-sharing mic/cam/screen", "Presenter",
     *         { disableTimeOut: !0, tapToDismiss: !1, closeButton: !1 }))
     *
     * These are DISTINCT from the `mediaServerConnected`/`mediaServerDisconnected` bus toasts already
     * handled below — the reference raises both, and its bundle still carries "Connected to Media
     * Server" and "Disconnected from Media Server" alongside these.
     *
     * `disableTimeOut` is why they are held by id: a banner that says "reconnecting" must not expire
     * while the thing is still disconnected, so it is cleared by the event that makes it false rather
     * than by a timer. The `||` guard is the reference's own — one at a time, however many redials
     * the backoff runs.
     *
     * The presenter one is raised only when this peer holds a live track, and the reference makes it
     * **undismissable** (`tapToDismiss: false, closeButton: false`) where the member one can be
     * dismissed. That asymmetry is deliberate there and reproduced here: a presenter whose mic is
     * being re-shared needs to know it, and the toast goes when the re-share finishes.
     */
    this.#reconnectToastId = null;

    this.#presenterReconnectToastId = null;

    /**
     * `mediaService.saveData` — "Disable Video (saves bandwidth)", from the AV settings modal.
     *
     * DISTINCT from `prefs.videoDisabled` above, which is `preferences.disableVideo` from the USER settings
     * modal and swaps the screens and streams panes for a message. Both exist upstream, each with its
     * own control, and the original row in `TODO.md` conflated them. This one is the media-layer
     * switch, and it does something the pane preference does not: upstream
     * `callScreenOfUserWEBRTC` opens with
     * `this.saveData ? P("callScreenOfUserWEBRTC saveData on.. nop...") : (…)`
     * (`main.d6d3c112b59b7d0d.js` byte 1132193), so **the consumer is never created and no screen
     * stream is requested at all**. The `Video Disabled` h3 and the hidden `<video>` are only what the
     * viewer sees; the bandwidth saving is that nothing is fetched.
     *
     * Not persisted, matching the reference: the writer is
     * `toggleDisableVideo(){this.saveData=!this.saveData}` (byte 1136736) on the media service, which
     * calls no `setPreference`. It lasts the session.
     */
    this.#saveData = $state(false);

    /**
     * Screens whose stream was NOT fetched because `saveData` was on when they arrived.
     *
     * The reference re-consumes by a different route — selecting a tab calls
     * `startWatchScreenOf` -> `mediaService.startWatchingScreenOf`, so turning video back on and
     * clicking a tab re-requests it. This room consumes on producer ARRIVAL instead, so without
     * keeping the `ProducerInfo` a viewer who re-enabled video would see nothing until the presenter
     * happened to restart their share.
     *
     * A plain `Map`, not `SvelteMap`: nothing renders from it. It is bounded by the number of screens
     * in the room, and every entry is removed the moment it is consumed.
     */
    this.#deferredScreens = new Map<string, ProducerInfo>();

    /*
      THE LOCAL PUBLISHER — `#lib/room/local-capture.svelte.ts`.

      Built LAST, and that ordering is load-bearing: every port below closes over a field of this
      class, and two of them (`tabs.list`, `tabs.streams`) are read through arrows rather than
      captured by value, so the tab list stays a single object with two writers rather than becoming
      two lists that drift. Constructing it earlier throws on the temporal dead zone, which is how
      the ordering was established rather than chosen.
    */
    this.#localCapture = new RoomLocalCapture({
      dialogs: this.#dialogs,
      toasts: this.#toasts,
      media: this.#media,
      screens: this.#screens,
      session: () => this.#session(),
      beginSpeech: () => this.#beginSpeech(),
      endSpeech: () => this.#endSpeech(),
      stopRecording: () => this.#stopRecording(),
      checkPermissionState: (kind, agent) => this.#checkPermissionState(kind, agent),
      closeScreenMenu: () => this.#closeScreenMenu(),
      videoDeviceId: () => this.#videoDeviceId(),
      mediaSession: () => this.#mediaSession,
      mediaSignalling: () => this.#mediaSignalling,
      tabs: {
        /*
          ARROWS, not an object getter/setter pair. A literal's own accessor binds `this` to the
          literal, so reaching a private field of this class from inside one needs `const owner =
          this`, which `@typescript-eslint/no-this-alias` refuses — correctly, because the alias is
          exactly the thing that makes it unclear which object a line is talking about. An arrow
          closes over `this` lexically and needs no alias at all.
        */
        list: () => this.#sharedScreens,
        setList: (next: ScreenTab[]) => {
          this.#sharedScreens = next;
        },
        streams: this.#screenStreams,
        select: (id) => this.selectScreenTabOfId(id)
      },
      webcams: {
        add: (presenter) => this.addWebcamPresenter(presenter),
        remove: (producerId) => this.removeWebcamPresenter(producerId)
      }
    });
  }

  get screens(): ScreenTab[] {
    return this.#sharedScreens;
  }

  get screenStreams(): SvelteMap<string, MediaStream> {
    return this.#screenStreams;
  }

  get webcamStreams(): SvelteMap<string, MediaStream> {
    return this.#webcamStreams;
  }

  get remoteAudioStreams(): SvelteMap<string, MediaStream> {
    return this.#remoteAudioStreams;
  }

  get saveData(): boolean {
    return this.#saveData;
  }

  /** `RoomScreens` asks for this when a viewer stops somebody else's share. */
  removeScreen(screenId: string): void {
    this.#sharedScreens = this.#sharedScreens.filter((entry) => entry.id !== screenId);
  }

  isLocalScreen(screenId: string): boolean {
    return this.#localCapture.localScreenStreams.has(screenId);
  }

  get sessionReady(): Promise<void> | null {
    return this.#sessionReady;
  }

  set sessionReady(next: Promise<void> | null) {
    this.#sessionReady = next;
  }

  get signalling(): SignallingClient | null {
    return this.#mediaSignalling;
  }

  set signalling(next: SignallingClient | null) {
    this.#mediaSignalling = next;
  }

  /*
    THE LOCAL PUBLISHER'S SURFACE, kept here and delegated.

    `#lib/room/local-capture.svelte.ts` owns these now. The accessors stay because the page,
    `RoomRecording`, `RoomEventStream` and eleven contract tests read them off the transport, and
    re-pointing every one of those in the same commit as the extraction would have made the two
    changes impossible to tell apart in review.
  */
  get localCapture(): RoomLocalCapture {
    return this.#localCapture;
  }

  get microphoneStream(): MediaStream | null {
    return this.#localCapture.microphoneStream;
  }

  get webcamStream(): MediaStream | null {
    return this.#localCapture.webcamStream;
  }

  get screenStream(): MediaStream | null {
    return this.#localCapture.screenStream;
  }

  set screenStream(next: MediaStream | null) {
    this.#localCapture.screenStream = next;
  }

  get localScreenStreams(): Map<string, MediaStream> {
    return this.#localCapture.localScreenStreams;
  }

  toggleMicrophone(): Promise<void> {
    return this.#localCapture.toggleMicrophone();
  }

  toggleWebcam(): Promise<void> {
    return this.#localCapture.toggleWebcam();
  }

  stopScreenSharing(): void {
    this.#localCapture.stopScreenSharing();
  }

  promptForScreenName(source: 'screen' | 'camera'): void {
    this.#localCapture.promptForScreenName(source);
  }

  startScreenSharing(source: 'screen' | 'camera', screenName: string): Promise<void> {
    return this.#localCapture.startScreenSharing(source, screenName);
  }

  stopLocalScreen(producerId: string): void {
    this.#localCapture.stopLocalScreen(producerId);
  }

  restartLocalScreens(): Promise<void> {
    return this.#localCapture.restartLocalScreens();
  }

  get audioProducerOwners(): Map<string, { userID: number; name: string }> {
    return this.#audioProducerOwners;
  }

  get webcamPresenters(): WebcamPresenter[] {
    return this.#webcamPresenters;
  }

  /*
    Everything this peer consumed from other people, dropped in one place.

    This has to reset the DEDUPE GUARDS, not just the visible streams, and that distinction is the
    whole reason it exists. `addRemoteScreen` returns early on
    `sharedScreens.some(entry => entry.id === info.producerId)`, `addRemoteWebcam` on
    `webcamPresenters.some(...)`, and `addRemoteAudio` on `remoteAudioStreams.has(...)`. Clearing
    `screenStreams` — which is a DIFFERENT map from `sharedScreens` — cleared no guard at all, so
    the rebuild from `getProducers` that both callers below rely on found every producer already
    "known" and consumed none of them. The result was a room that reconnected to silence and a
    blank tab bar.

    Found by the adversarial review of 2026-08-11. The reconnect half predates that day's work;
    the role-change half arrived with it.

    Dropping remote state is always safe here: both callers are points where the far side has
    already closed every consumer, so what is on screen is a still frame pretending to be live.
    `audioProducerOwners` goes too — it is keyed by producer id and would otherwise attribute a
    recycled id to whoever held it last.

    A RECEIVER, not five setters, and that is the point of moving it: the five collections have to
    clear TOGETHER or the dedupe guards go out of step with the streams, which is the exact bug the
    paragraph above records. Five public setters would let a caller clear four of them.
  */
  dropRemoteMedia(): void {
    this.#sharedScreens = [];
    this.#screenStreams.clear();
    // Emptied in place rather than reassigned; reassigning would replace the array every other
    // reader is holding. (On the page this was a `const` $state array; here it is a `$state`
    // field, and the reason it must not be replaced is unchanged.)
    this.#webcamPresenters.splice(0, this.#webcamPresenters.length);
    this.#remoteAudioStreams.clear();
    this.#audioProducerOwners.clear();
  }

  /**
   * Stop every track on a stream and forget it.
   *
   * Public because three page-level teardowns stop a track they did not open, and a second copy of
   * "stop every track, then null the reference" is how one of them forgets the second half.
   */
  stopStream(stream: MediaStream | null): void {
    this.#stopStream(stream);
  }

  /**
   * Open the SFU session and wire every handler. The returned function closes it.
   *
   * **The teardown is returned rather than written on the page**, and that is the point of moving
   * this: the session opened here is the session closed here, and the streams started here are the
   * streams stopped here. Those two halves used to sit 240 lines apart in `onMount`, and the
   * adversarial review of 2026-08-11 found the gap between them — the teardown closed the ORIGINAL
   * session after a role change, leaving the rebuilt one holding the peer slot with the microphone
   * light on.
   *
   * Called from `onMount`, because a socket is not something to open during SSR.
   */
  connect(): () => void {
    const signalling = new SignallingClient({
      url: this.#session().mediaWsUrl,
      grant: async () => {
        const response = await fetch('/api/media/grant', { method: 'POST' });
        if (!response.ok) throw new Error(`grant request failed: ${response.status}`);
        const minted = (await response.json()) as {
          grant: string;
          iceServers?: RTCIceServer[];
        };
        // Component-level now, not a local: the connectivity test reads the same value, so it
        // tests THIS deployment's relay instead of Google's STUN. See `media.iceServers`.
        this.#media.iceServers = minted.iceServers ?? [];
        return minted.grant;
      }
    });
    /*
     * A MediaSession on top of the socket: it owns the Device, the recv transport and every
     * consumer. `canProduce` is the room's own presenter predicate - the server refuses `produce`
     * from a member with `forbidden`, so asking for a send transport as a reader would buy a
     * transport and a refusal.
     */
    /*
    `canProduce` must be the SAME predicate the SFU grant is minted from.

    It was `isPresenter` — the room's account role — while `/api/media/grant` mints its role from
    `joinsMediaAsProducer(...)`, the reference's `isPresenter || hasCam || hasMic || hasScreen`.
    The two disagreed for exactly the case the permissions modal exists to create: a Participant
    granted a microphone received a `presenter` grant from the server and was then refused a send
    transport by their own browser. Half a fix is worse than none, because the server-side half
    looks correct in isolation.

    One formula, one import, both halves.
  */
    const session = new MediaSession({
      signalling,
      canProduce: joinsMediaAsProducer({
        isPresenter: this.#isPresenter(),
        hasMic: this.#session().user.hasMic,
        hasCam: this.#session().user.hasCam,
        hasScreen: this.#session().user.hasScreen
      }),
      iceServers: () => this.#media.iceServers
    });
    this.attachSession(session);
    this.signalling = signalling;

    signalling.on('socketopen', ({ reconnected }) => this.serverConnected(reconnected));
    signalling.on('disconnected', () => {
      this.serverDisconnected();
      // The far side closed every consumer with the socket. Drop them so a stale picture is never
      // left frozen on screen pretending to be live; the tabs rebuild from `getProducers` on the
      // next connect.
      this.dropRemoteMedia();
    });

    /*
     * `connected` is the server's own notification, sent once before any command is accepted, and
     * it is the first moment `getProducers` can be issued. Producers that already exist arrive in
     * that snapshot; ones that appear later arrive as `newProducer`. Both paths funnel into
     * addRemoteScreen, which dedupes - the two overlap by design, because losing a producer is a
     * permanently blank tile.
     */
    signalling.on('connected', () => {
      void (async () => {
        try {
          /*
           * `load()` first, and it is not optional. It runs getRouterRtpCapabilities and
           * `device.load()`, and until it resolves the Device has no capabilities - every
           * produce/consume call throws `load() must resolve before this is available`. Omitting it
           * is what made the first working build fail silently: the presenter's share threw, the
           * viewer's tab never appeared, and the only trace was one console error.
           */
          /*
          `mediaSession`, not the `session` this handler closed over.

          `giveMicScreen` REPLACES the session (see `restartMediaSession`), and `MediaSession.close()`
          latches `#closed` permanently — `load()` calls `#assertOpen()` and throws `sessionClosed`
          on a closed instance. A handler holding the original const would therefore throw on the
          first reconnect after a role change, and the room would silently stop consuming.
        */
          const active = this.session;
          if (!active) return;
          this.sessionReady = active.load();
          await this.sessionReady;
          const { producers } = await signalling.request('getProducers');
          for (const producer of producers) {
            await this.addRemoteScreen(active, producer);
            await this.addRemoteWebcam(active, producer);
            await this.addRemoteAudio(active, producer);
          }
        } catch (error) {
          // Leaving `sessionReady` pending would hang every future consume on a promise that can
          // never settle, so it is reset and the next connect retries from scratch.
          this.sessionReady = null;
          console.error('[media] the session could not be initialised', error);
        }
      })();
    });

    /*
    `mediaSession`, never the captured `session`.

    `session` is the const built at the top of this block. `restartMediaSession` replaces it —
    it must, because `close()` latches `#closed` permanently — and every handler registered here
    closes over the ORIGINAL. Reading it after a role change consumes on a session whose
    transports are gone, so every producer arriving after a mic hand-over rendered nothing, in
    silence, with no error. Found by the adversarial review of 2026-08-11.

    The null check is not defensive padding: `restartMediaSession` sets `mediaSession = null` for
    the window between closing the old session and the new one being assigned, and a producer can
    arrive inside it.
  */
    signalling.on('newProducer', (info) => {
      const active = this.session;
      if (!active) return;
      void this.addRemoteScreen(active, info);
      void this.addRemoteWebcam(active, info);
      void this.addRemoteAudio(active, info);
    });

    /*
     * Captions from whoever is speaking.
     *
     * An interim result replaces the line being spoken; a final one commits it to the transcript.
     * That is what `speechRecoHistoryMode` reads, and it is why interim lines are not appended -
     * recognition revises the same sentence repeatedly as it hears more of it.
     */
    signalling.on('speechReco', (line) => {
      const caption = {
        timestamp: line.timestamp,
        sender: line.sender ?? 'Presenter',
        text: line.text,
        live: !line.isFinal
      };
      /*
        A RECEIVER, because the caption LIST is the page's: the overlay renders it and the
        transcript page reads it. The transport knows when a line arrives and nothing else about
        what is done with it, which is the same split every other feature here draws.
      */
      this.#onCaption(caption, line.isFinal === true);
    });
    // `producerPaused` / `producerResumed` are declared in `src/lib/media/signalling.ts:162,164`
    // and were listened for by nothing. They are the capture's `presMuted` / `presUnmuted`.
    signalling.on('producerPaused', ({ producerId }) => this.remoteAudioPaused(producerId));
    signalling.on('producerResumed', ({ producerId }) => this.remoteAudioResumed(producerId));
    signalling.on('producerClosed', ({ producerId }) => {
      this.removeRemoteScreen(producerId);
      this.removeRemoteWebcam(producerId);
      this.removeRemoteAudio(producerId);
    });
    signalling.on('peerClosed', ({ peerId }) => {
      // The current session, for the same reason as `newProducer` above: after a role change the
      // captured `session` holds the streams of a connection that no longer exists, so a peer
      // leaving would tear down nothing and leave their tile painted.
      for (const remote of this.session?.remoteStreams.values() ?? []) {
        if (remote.peerId === peerId) {
          this.removeRemoteScreen(remote.producerId);
          this.removeRemoteWebcam(remote.producerId);
          this.removeRemoteAudio(remote.producerId);
        }
      }
    });
    /*
     * A dial that fails AFTER the socket exists surfaces through `disconnected`, because #onClose
     * runs even when the open never settled. A dial that fails BEFORE it - an unreachable SFU, or
     * a grant request the deployment cannot mint (503 when MEDIA_GRANT_PRIVATE_KEY is unset) -
     * never creates a socket, so nothing emits and the rejection was being swallowed here. That is
     * precisely the case a reader hits on a deployment with no media server, and it is the case
     * that must not be silent.
     *
     * toasts.show() already dedupes on title+message, so the socket path firing as well cannot
     * produce two identical toasts.
     */
    void signalling.connect().catch(() => {
      // The first connect never reached `socketopen`, so `media.connected` is still false and the
      // transition guard would swallow this. A first failure is a real disconnect to report.
      this.#media.connected = true;
      this.serverDisconnected();
    });

    /*
    The poll and its visibility handling live at component scope now — see `onVisibilityChange`.
    There were TWO `visibilitychange` listeners on this document, in this component: one tracking
    focus and catching the chat up, one pausing and resuming this timer. Different concerns, both
    correct, and still a duplication nobody would have found by reading either one.

    All that is left here is starting it, because a tab that is already hidden at mount must not.
  */

    return () => {
      /*
      Close whichever session is LIVE, which after a role change is not the captured `session`.

      This read `session.close()`, so leaving a room in which a mic had been handed over closed
      the already-closed original and left the REBUILT session's transports and
      RTCPeerConnections open — they survived the component, held the SFU peer slot, and kept the
      microphone light on. Found by the adversarial review of 2026-08-11.

      Closing `mediaSession` alone covers both cases exactly, with no double close: if no restart
      happened it IS `session`, and if one did, `restartMediaSession` already closed the original
      before replacing it.
    */
      const live = this.session;
      this.attachSession(null);
      live?.close();
      signalling.close();
      this.stopStream(this.microphoneStream);
      this.stopStream(this.webcamStream);
      // Every shared screen, not just the newest: leaving the others running holds the camera or
      // the screen-capture indicator on after the room is gone.
      for (const stream of this.localScreenStreams.values()) this.stopStream(stream);
      this.localScreenStreams.clear();
      this.stopStream(this.screenStream);
    };
  }

  /*
    `disconnectAll()` + re-init, from the capture's own handler:

      subscribe("giveMicScreen", e => {
        globals.user.isPresenter = globals.isLimitedPresenter = globals.isPresenter = e.give,
        this.mediaHandlerService.disconnectAll(),
        setTimeout(() => this.mediaHandlerService.initWithGlobalsAndEventHandler(...), 3e3)
      })

    A new MediaSession rather than a reused one: `close()` latches `#closed` permanently, so the
    old instance can never `load()` again. Everything else is deliberately reused — the same
    signalling client, the same ICE getter — because a second socket would leave the SFU holding
    two peers for one person.
  */
  /**
   * Tears the media session down and builds a new one — the capture's `disconnectAll()` plus
   * re-init, for `giveMicScreen` (`TODO.md` gap 22).
   *
   * A closure assigned in `onMount` rather than a top-level function, because building a session
   * needs the signalling client and the ICE getter that live in that scope. Duplicating the
   * construction here is how the two copies drift.
   */
  async restart(): Promise<void> {
    const previous = this.session;
    this.attachSession(null);
    this.sessionReady = null;
    // Closes every transport, producer and consumer this peer held. What was consumed must go
    // with them, or the tab bar keeps painting a stream whose transport no longer exists — and
    // the dedupe guards would refuse to re-consume any of it below.
    previous?.close();
    this.dropRemoteMedia();

    const socket = this.#mediaSignalling;
    if (!socket) return;
    const rebuilt = new MediaSession({
      signalling: socket,
      canProduce: joinsMediaAsProducer({
        isPresenter: this.#isPresenter(),
        hasMic: this.#session().user.hasMic,
        hasCam: this.#session().user.hasCam,
        hasScreen: this.#session().user.hasScreen
      }),
      iceServers: () => this.#media.iceServers
    });
    this.attachSession(rebuilt);

    try {
      this.sessionReady = rebuilt.load();
      await this.sessionReady;
      const { producers } = await socket.request('getProducers');
      for (const producer of producers) {
        await this.addRemoteScreen(rebuilt, producer);
        await this.addRemoteWebcam(rebuilt, producer);
        await this.addRemoteAudio(rebuilt, producer);
      }
    } catch (error) {
      this.sessionReady = null;
      console.error('[media] the session could not be rebuilt after a role change', error);
    }
  }

  /**
   * `reconnectAudio()` — re-consume every microphone in the room, and touch nothing else.
   *
   * The member's half of `remoteRestartAudio`. A presenter presses *" Restart Audio "* on somebody
   * whose sound has gone one-way, and THAT PERSON'S browser does the work; the authority to ask is
   * checked on the server, never here.
   *
   * ## What upstream does, and why this is narrower than `restart()`
   *
   * Byte 1133537, in full:
   *
   * ```js
   * reconnectAudio(){
   *   "closed" != this.globals.sessData.currentState
   *     ? ($("[id^='msRemAudio-']").remove(),
   *        this.talkingUsers.forEach(e => this.mediaSoupService.startListeningToPresenter(e)))
   *     : P("reconnectAudio called.. but session closed. abort...")
   * }
   * ```
   *
   * Two steps: drop the remote audio, then listen again. **It does not touch transports, producers,
   * screens or webcams**, which is exactly what separates it from `restart()` directly above —
   * `restart()` rebuilds the whole session after a role change and is far too large a hammer for a
   * one-way microphone. Reproducing that narrowness is the point; a presenter fixing one member's
   * audio must not blank their screen tabs.
   *
   * ## Clearing the two maps IS the equivalent of removing the elements
   *
   * There are no `msRemAudio-` nodes to remove by hand here — Svelte owns them, keyed off
   * `remoteAudioStreams`. Emptying that map unmounts every sink AND releases the dedupe guard, which
   * is the half that matters: `addRemoteAudio` returns early on `remoteAudioStreams.has(...)`, so
   * without the clear the `getProducers` snapshot below would find every producer already "known"
   * and consume none of them. That is the failure `dropRemoteMedia` documents at length, and it is
   * why this clears rather than re-requesting over the top.
   *
   * `audioProducerOwners` goes with it — it is keyed by producer id and would otherwise attribute a
   * recycled id to whoever held it last. It is cleared DIRECTLY rather than through
   * `removeRemoteAudio`, and that is deliberate: that method calls `stopTalking` per producer, which
   * would empty the talking list this is trying to restore. Upstream keeps `talkingUsers` and
   * re-listens to each; keeping the map's contents out of `RoomMedia` is how the same thing happens
   * here, with `addRemoteAudio` re-populating the owners as it re-consumes.
   *
   * ## The closed-session guard is upstream's, in this room's terms
   *
   * `"closed" != sessData.currentState` becomes "there is a live session and a socket". A room with
   * neither has nothing to re-consume from, and issuing `getProducers` against it would reject.
   *
   * **NOT VERIFIED AT RUNTIME.** The state transitions are unit-tested; that a real second peer's
   * microphone becomes audible again needs two browsers in a live room and is the owner's to
   * confirm. Recorded rather than implied.
   */
  async reconnectAudio(): Promise<void> {
    const active = this.session;
    const socket = this.#mediaSignalling;
    // Upstream's `"closed" != currentState` abort, in this room's terms.
    if (!active || !socket) return;

    this.#remoteAudioStreams.clear();
    this.#audioProducerOwners.clear();

    try {
      const { producers } = await socket.request('getProducers');
      for (const producer of producers) {
        // AUDIO ONLY. Screens and webcams were never dropped, so re-consuming them would be
        // refused by their own dedupe guards anyway — and asking is a round trip for nothing.
        await this.addRemoteAudio(active, producer);
      }
    } catch (error) {
      // Loud, and NOT a state reset: `sessionReady` belongs to the session, which this never
      // touched. Swallowing it would leave a member silently deaf with the presenter told it worked.
      console.error('[media] audio could not be reconnected', error);
      throw error;
    }
  }

  /** The SFU session, handed over once it has connected. */
  attachSession(session: MediaSession | null): void {
    this.#mediaSession = session;
  }

  get session(): MediaSession | null {
    return this.#mediaSession;
  }

  /**
   * `globals.videoDeviceID` - the camera chosen in AV settings, which both camera paths pass as
   * `deviceId: {ideal: ...}`. The modal already saves it (`onPreferenceChange('videoDeviceID', ...)`);
   * nothing read it back, so the choice was written and then ignored.
   *
   * `ideal`, never `exact`: a camera that has been unplugged since it was chosen must fall back to
   * another one rather than reject the whole call.
   */
  get selectedVideoDeviceId() {
    return typeof this.#videoDeviceId() === 'string' && this.#videoDeviceId()
      ? this.#videoDeviceId()
      : undefined;
  }

  /**
   * `addPresenterdWebcam(e)` - note the guard, which is the capture's own:
   *
   * ```js
   * if (this.webcamsIdxs.includes(e._id)) return void P("...already have entry for this muser.. NOP");
   * ```
   */
  addWebcamPresenter(presenter: WebcamPresenter) {
    if (this.#webcamPresenters.some((entry) => entry.id === presenter.id)) return;
    this.#webcamPresenters.push(presenter);
  }

  /** `removePresenterWebcam(e)` - `container.remove(idx)`, i.e. the card is destroyed. */
  removeWebcamPresenter(id: string) {
    const at = this.#webcamPresenters.findIndex((entry) => entry.id === id);
    if (at > -1) this.#webcamPresenters.splice(at, 1);
  }

  /**
   * The media server's connection toasts, verbatim from the captured room:
   *
   *   appEventBus.subscribe("mediaServerConnected", e => {
   *     this.isMediaConnected = !0, this.alertService.success("Connected to Media Server") })
   *   appEventBus.subscribe("mediaServerDisconnected", e => {
   *     this.isMediaConnected = !1,
   *     this.alertService.error("Disconnected from Media Server... reconnecting...") })
   *
   * `success` and `error` are toastr skins, so the geometry and colour come from the captured
   * stylesheet with nothing declared here: `.ngx-toastr` is 300px wide with
   * `padding: 15px 15px 15px 50px`, `border-radius: 3px` and a 24px icon inset 15px from the left,
   * `.toast-success` is `rgb(81, 163, 81)` and `.toast-error` `rgb(189, 54, 47)`. Both messages are
   * passed with no title, exactly as the capture calls them.
   */
  serverConnected(_reconnected: boolean) {
    this.#media.connected = true;
    /*
      Cleared here, on the socket's `connect`, exactly where the reference clears them — inline in
      that handler beside `emit("mediaServerConnected")` and `reproduceLocalTracksIfAny()`.

      Its own `clearReconnectToasts()` method duplicates this body and is never called from
      anywhere in the bundle; that is dead code upstream, not a second path, so there is nothing
      else to reproduce.
    */
    if (this.#reconnectToastId !== null) {
      this.#toasts.dismiss(this.#reconnectToastId);
      this.#reconnectToastId = null;
    }
    if (this.#presenterReconnectToastId !== null) {
      this.#toasts.dismiss(this.#presenterReconnectToastId);
      this.#presenterReconnectToastId = null;
    }
    // ALWAYS, not just on a redial. A toast that says "reconnecting..." is false the instant the
    // socket opens, and gating this on `reconnected` left the error on screen forever whenever the
    // first connect of a session happened to follow a failed one.
    this.#toasts.dismissMatching('Disconnected from Media Server');
    this.#toasts.show({ kind: 'success', message: 'Connected to Media Server', enableHtml: false });
  }

  /**
   * Raised on the TRANSITION into a disconnected state, never per redial attempt.
   *
   * The capture subscribes to an event bus - `appEventBus.subscribe("mediaServerDisconnected", ...)`
   * - which is a state change. Our signalling client emits `disconnected` from `#onClose`, and
   * `#onClose` also runs for every FAILED reconnect attempt, so this was firing on a backoff
   * schedule that climbs to one every 30s (`maxReconnectDelayMs: 30_000`).
   *
   * `toasts.show` dedupes an identical message, but its 5s timer still expires, so each retry raised
   * a fresh toast the moment the previous one cleared. With the media server down the banner was
   * permanent - which is exactly what it did when I killed the SFU and left it dead.
   */
  serverDisconnected() {
    if (!this.#media.connected) return;
    this.#media.connected = false;
    this.#toasts.show({
      kind: 'error',
      message: 'Disconnected from Media Server... reconnecting...',
      enableHtml: false
    });

    // The sticky pair, raised beside the bus toast exactly as the reference raises them.
    if (this.#reconnectToastId === null) {
      this.#reconnectToastId = this.#toasts.show(
        {
          kind: 'info',
          title: 'Media',
          message: 'Reconnecting to media... <i class="fas fa-cog fa-spin ms-2"></i>',
          enableHtml: true
        },
        0
      );
    }
    // Only when this peer is actually producing something to re-share.
    /*
      The reference's `liveMicTrack || liveCamTrack || liveScreenTrack`, mapped onto what this room
      actually holds: `localMicProducerId` is its `micProducer`, `webcamStream` its camera, and
      `localScreenStreams` its screen shares. A mic that is MUTED still counts — muting pauses the
      producer rather than closing it, so there is still a track to re-share.
    */
    const holdsLiveTrack = Boolean(this.#localCapture.isProducing);
    if (holdsLiveTrack && this.#presenterReconnectToastId === null) {
      this.#presenterReconnectToastId = this.#toasts.show(
        {
          kind: 'info',
          title: 'Presenter',
          message: 'Reconnecting media (presenter)... re-sharing mic/cam/screen',
          enableHtml: false
        },
        0
      );
    }
  }

  /**
   * The one place `saveData` changes, so the re-consume cannot be forgotten at a second call site.
   *
   * Turning it ON does NOT tear down consumers that already exist, and that is the reference's
   * behaviour rather than an oversight on our part: `saveData` is read in exactly three places
   * upstream — `callScreenOfUserWEBRTC`, the `hidden` class and the `Video Disabled` h3 — and none
   * of them closes a consumer. So a screen already being watched keeps arriving and is hidden,
   * while screens that arrive AFTER the switch are never fetched. Stating it plainly because it
   * looks like a bug until you have read all three sites.
   */
  async setSaveData(enabled: boolean) {
    this.#saveData = enabled;
    if (enabled || this.#deferredScreens.size === 0) return;
    /* `sessionReady` resolves to void — it is a barrier, not a handle. The session lives in
       `mediaSession`, which `restartMediaSession` sets to null while it rebuilds, so it is read
       AFTER the await rather than before. */
    await this.#sessionReady;
    const session = this.#mediaSession;
    if (!session) return;
    for (const [producerId, info] of [...this.#deferredScreens]) {
      this.#deferredScreens.delete(producerId);
      const remote = await session.consume(info);
      if (remote) this.#screenStreams.set(producerId, remote.stream);
    }
  }

  /**
   * Turns one remote producer into a screen tab with a live picture.
   *
   * Only screen shares are handled here: the producing client tags them `{share: true, screenName}`
   * in `appData` and the server echoes that back verbatim, which is the only thing distinguishing a
   * screen from a webcam on the same `video` kind.
   *
   * Ordering matters. The tab is added BEFORE `consume()` resolves so the bar reflects the room
   * immediately, and the stream is filled in when it arrives - a tab with no picture is honest,
   * a picture with no tab is unreachable.
   */
  async addRemoteScreen(session: MediaSession, info: ProducerInfo) {
    const share = info.appData as { share?: unknown; screenName?: unknown } | null;
    if (info.kind !== 'video' || share?.share !== true) return;
    /*
     * Never consume your own screen.
     *
     * `newProducer` already excludes the producing peer (`notify_room(..., except: identity.id)`),
     * but the `getProducers` snapshot does not - it lists everything in the room, including what
     * this peer is producing. Consuming yourself asks the server for a consumer on a transport the
     * producing session does not own, which it refuses with
     * `unknownTransport: this session has no transport …`, and a presenter would see a duplicate
     * tab of their own screen.
     */
    if (legacyUserId(info.userId) === this.#session().user.id) return;
    if (this.#sharedScreens.some((screen) => screen.id === info.producerId)) return;
    // The Device must be loaded before `consume()` will do anything.
    await this.#sessionReady;

    const screenName = typeof share.screenName === 'string' ? share.screenName : '';
    this.#sharedScreens = [
      ...this.#sharedScreens,
      {
        id: info.producerId,
        name: info.displayName ?? 'Presenter',
        screenName,
        // The producer carries no avatar. Resolve it from the roster when the peer is known;
        // gravatar's own `d=mm` placeholder otherwise, rather than inventing a hash.
        avatarUrl:
          this.#session().connectedUsers.find((user) => user.id === legacyUserId(info.userId))
            ?.avatarUrl ?? 'https://secure.gravatar.com/avatar/?d=mm&s=20'
      }
    ];
    // A viewer is brought to the screen too, not just the presenter sharing it. The capture emits
    // `selectScreenTabOfId` from the viewer's side as well - `callScreenOfUserWEBRTC` when a
    // viewer starts watching a screen, and `handleScreenSwitchToTalking` when the presenter who
    // starts talking has one - and without it a member sitting on Notes never learns a screen
    // exists. `selectScreenTabOfId` honours the lock, so a forced screen still cannot be stolen.
    this.selectScreenTabOfId(info.producerId);

    /*
      The gate, and it sits AFTER the tab is added on purpose. Upstream `saveData` stops
      `callScreenOfUserWEBRTC` from creating the consumer, but the screenshare view still renders —
      that is where the `Video Disabled` h3 lives — so the tab must exist for there to be anything
      to show. Skipping the tab as well would hide the fact that a presenter is sharing at all,
      which is not what the switch says it does.

      The `ProducerInfo` is kept so re-enabling can fetch it; see `setSaveData`.
    */
    if (this.#saveData) {
      this.#deferredScreens.set(info.producerId, info);
      return;
    }

    const remote = await session.consume(info);
    // `consume` returns null when this producer is already being consumed, which is the dedupe the
    // server's at-least-once `newProducer` requires.
    if (remote) this.#screenStreams.set(info.producerId, remote.stream);
  }

  /**
   * Turns one remote WEBCAM producer into a floating presenter card.
   *
   * The sibling of {@link addRemoteScreen}, and the reason a member saw nothing when a presenter
   * turned their camera on. `appData.share` is the only thing separating a screen from a camera on
   * the same `video` kind - `produceScreen` tags `{share: true, screenName}` and `produceWebcam`
   * tags `{share: false}` - and `addRemoteScreen` returns early on anything that is not a share.
   * Nothing picked the remainder up, so a webcam producer was consumed by no one.
   *
   * The capture routes it the same way, by identity rather than by kind: `app-presenter-cams`'
   * `ngOnInit` does
   * `muser.isMe ? (pStream = localWebcamStream) : (subscribe('newWebcamStream', …),
   * connectToScreenOfProducer(muser))`.
   *
   * Card first, stream second - the same ordering `addRemoteScreen` uses and for the same reason:
   * a card with no picture is honest, a picture with no card is unreachable.
   */
  async addRemoteWebcam(session: MediaSession, info: ProducerInfo) {
    const share = info.appData as { share?: unknown } | null;
    /*
      An EXPLICIT `share === false` is required, not merely "not true".

      The capture tags both kinds positively - `appData:{share:!1,isReconnect:o,prevMuserID:s}` for
      a camera and `appData:{share:!0,screenName:i,…}` for a screen - and this room's own
      `produceWebcam`/`produceScreen` do the same (`src/lib/media/session.ts:601,630`). So a video
      producer carrying NEITHER tag is neither a camera nor a screen, and guessing costs something:
      with `share !== true` this branch adopted every untagged or unknown video producer as a
      webcam and built a floating card for it that nothing could ever remove, because no
      `removeWebcamPresenter` would match a producer the room never really understood.
    */
    if (info.kind !== 'video' || share?.share !== false) return;
    // Never consume your own camera: the `getProducers` snapshot lists it, and the server refuses
    // a consumer on a transport the producing session owns.
    if (legacyUserId(info.userId) === this.#session().user.id) return;
    if (this.#webcamPresenters.some((entry) => entry.id === info.producerId)) return;
    await this.#sessionReady;

    this.addWebcamPresenter({
      id: info.producerId,
      name: info.displayName ?? 'Presenter',
      isMe: false
    });

    const remote = await session.consume(info);
    // `consume` returns null when this producer is already being consumed - the dedupe the
    // server's at-least-once `newProducer` requires.
    if (remote) this.#webcamStreams.set(info.producerId, remote.stream);
  }

  /**
   * Consumes one remote MICROPHONE and gives it somewhere to come out.
   *
   * This branch did not exist. Both `info.kind` guards in this room were `!== 'video'`
   * ({@link addRemoteScreen} and {@link addRemoteWebcam}), so an audio producer arriving from the
   * SFU was matched by nothing and dropped - which is the second half of "no voice in the members
   * room". The first half was that no microphone was ever produced.
   *
   * The stream is put in {@link remoteAudioStreams} and rendered as a hidden `<audio autoplay>`;
   * audio needs an element to play through, and there is no visible control for it.
   */
  async addRemoteAudio(session: MediaSession, info: ProducerInfo) {
    if (info.kind !== 'audio') return;
    // Never consume your own microphone: the server refuses a consumer on the producing session's
    // own transport, and you would hear yourself.
    if (legacyUserId(info.userId) === this.#session().user.id) return;
    if (this.#remoteAudioStreams.has(info.producerId)) return;
    await this.#sessionReady;

    const remote = await session.consume(info);
    if (remote) {
      this.#remoteAudioStreams.set(info.producerId, remote.stream);
      // An open microphone IS the talking signal. Without this the room reports
      // "( No one is speaking )" while that peer's voice is plainly coming out of the speakers.
      const ownerId = legacyUserId(info.userId);
      if (ownerId !== null) {
        const owner = { userID: ownerId, name: info.displayName ?? 'Presenter' };
        this.#audioProducerOwners.set(info.producerId, owner);
        this.#media.startTalking({ userID: owner.userID, mediaValue: { name: owner.name } });
      }
    }
  }

  /** `producerPaused` - the capture's `presMuted`, i.e. that peer stopped talking. */
  remoteAudioPaused(producerId: string) {
    const owner = this.#audioProducerOwners.get(producerId);
    if (owner) this.#media.stopTalking(owner.userID);
  }

  /** `producerResumed` - the capture's `presUnmuted`, i.e. that peer is talking again. */
  remoteAudioResumed(producerId: string) {
    const owner = this.#audioProducerOwners.get(producerId);
    if (owner) this.#media.startTalking({ userID: owner.userID, mediaValue: { name: owner.name } });
  }

  removeRemoteAudio(producerId: string) {
    this.#remoteAudioStreams.delete(producerId);
    const owner = this.#audioProducerOwners.get(producerId);
    if (owner) this.#media.stopTalking(owner.userID);
    this.#audioProducerOwners.delete(producerId);
  }

  /**
   * Attaches a consumed microphone to its element.
   *
   * NOT muted - this is someone else talking, which is the entire point. The room's master volume
   * applies, matching how every other remote stream is played here. A rejected `play()` is
   * surfaced: Chrome blocks audible autoplay without a gesture, and silence caused by policy looks
   * exactly like silence caused by a dead producer.
   */
  attachRemoteAudio(producerId: string) {
    return (node: HTMLAudioElement) => {
      const stream = this.#remoteAudioStreams.get(producerId) ?? null;
      if (node.srcObject !== stream) node.srcObject = stream;
      /*
        The master volume is deliberately NOT read here.

        An attachment re-runs when reactive state it reads changes, and its return value is the
        teardown - so reading `volume` inside it meant every tick of the slider destroyed the
        attachment (pausing the element and nulling `srcObject`) and rebuilt it, replaying `play()`
        each time. Dragging the slider produced a pause/replay storm and a stream of AbortErrors.
        `setMasterVolume` sets the level instead, by the `msRemAudio-` id the capture uses.
      */
      node.volume = Math.min(1, Math.max(0, this.#roomVolume.volume / 100));

      if (stream) {
        node.play().catch((error: unknown) => {
          console.warn(`[media] remote audio ${producerId} could not play`, error);
        });
      }

      return () => {
        node.pause();
        node.srcObject = null;
      };
    };
  }

  /** `removePresenterWebcam` - the card is destroyed and its stream dropped. */
  removeRemoteWebcam(producerId: string) {
    this.#webcamStreams.delete(producerId);
    this.removeWebcamPresenter(producerId);
  }

  /**
   * `selectScreenTabOfId` - bring the presentation area to a screen.
   *
   * Transcribed from the capture, and the FIRST line is the one that matters:
   *
   * ```js
   * guiEventBus.subscribe("selectScreenTabOfId", e => {
   *   if (!globals.lockedScreenID || globals.lockedScreenID === e._id) {
   *     this.selectedMainTab = "presAreaTabs-screens";
   *     if (this.selectedScreenShareTab == e._id) return;
   *     this.selectedScreenShareTab = e._id;
   *     this.onScreenShareTabChange(e._id, !1)
   *   }
   * })
   * ```
   *
   * Selecting the screen's own tab was already done here; switching the MAIN tab was not, and that
   * is why a shared screen appeared to render nothing. This room opens on Notes
   * (`mainTab = 'notes'`), so the screen, its tab and its video were all being built inside
   * `#screensTabsContent` while that entire pane sat hidden behind another tab. Every check that
   * asked the `<video>` for `videoWidth` or `currentTime` passed, because a hidden pane does not
   * invalidate the element - which is exactly how it went unnoticed.
   *
   * The lock is the capture's own guard: while a presenter has forced everyone to one screen, a
   * newly arriving screen must not steal the view.
   */
  selectScreenTabOfId(producerId: string) {
    // A detached window exists to show ONE screen. Anything else arriving must not steal it.
    if (this.#screens.detachedScreenId !== null && this.#screens.detachedScreenId !== producerId)
      return;
    if (this.#screens.lockedId && this.#screens.lockedId !== producerId) return;
    this.#showScreensTab();
    this.#screens.screenAdded(producerId);
  }

  async applyScreenLayers() {
    const session = this.#mediaSession;
    if (!session) return;
    for (const screen of this.#sharedScreens) {
      if (!this.#screenStreams.has(screen.id)) continue;
      // Our own screens play from the local capture and are never consumed, so there is no
      // consumer whose layers could be preferred - asking would earn one `unknownConsumer` warning
      // per tab switch for a stream that was never going over the network in the first place.
      if (this.#localCapture.localScreenStreams.has(screen.id)) continue;
      try {
        await session.setPreferredLayers(
          screen.id,
          screen.id === this.#screens.selectedTab ? TOP_SPATIAL_LAYER : 0
        );
      } catch (error) {
        // Not fatal: the stream keeps playing at whatever layer it already had.
        console.warn(`[media] could not set layers for screen ${screen.id}`, error);
      }
    }
  }

  removeRemoteScreen(producerId: string) {
    this.#screens.closePopout(producerId);
    this.#screenStreams.delete(producerId);
    this.#screens.stop(producerId);
  }

  #stopStream(stream: MediaStream | null) {
    stream?.getTracks().forEach((track) => track.stop());
  }

  #setStreamEnabled(stream: MediaStream | null, enabled: boolean) {
    stream?.getTracks().forEach((track) => {
      track.enabled = enabled;
    });
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
      this.#microphoneStream ??= await navigator.mediaDevices.getUserMedia({ audio: true });
      this.#setStreamEnabled(this.#microphoneStream, true);
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
      if (micTrack && this.#mediaSession && !this.#localMicProducerId) {
        try {
          const producer = await this.#mediaSession.produceMicrophone(micTrack);
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
      if (this.#localMicProducerId && this.#mediaSession) {
        void this.#mediaSession.closeProducer(this.#localMicProducerId);
      }
      this.#localMicProducerId = null;
      this.#stopStream(this.#microphoneStream);
      this.#microphoneStream = null;
      this.#media.micMuted = true;
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
        if (this.#localWebcamProducerId && this.#mediaSession) {
          void this.#mediaSession.closeProducer(this.#localWebcamProducerId);
        }
        this.#localWebcamProducerId = null;
        this.#stopStream(this.#webcamStream);
        this.#webcamStream = null;
        this.#media.camMuted = true;
        this.removeWebcamPresenter(String(this.#session().user.id));
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
        video: { deviceId: { ideal: this.selectedVideoDeviceId } }
      });
      this.#media.camMuted = false;
      // `webcamingUsers.push(r)` then `guiEventBus.emit("newWebcamPresenter", r)`.
      this.addWebcamPresenter({
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
      if (track && this.#mediaSession) {
        try {
          const producer = await this.#mediaSession.produceWebcam(track);
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
    this.#stopStream(this.#screenStream);
    this.#screenStream = null;
    this.#localScreenProducerId = null;
    this.#media.screenSharing = false;
  }

  promptForScreenName(source: 'screen' | 'camera') {
    // `this.mediaSoupService.connected` in the capture. Deliberately not `sessionReady`: that is a
    // Promise, so it is truthy the moment load() is CALLED - including after it rejected - and it
    // says nothing about whether the socket is currently up.
    if (!this.#mediaSession || !this.#mediaSignalling?.connected) {
      this.#dialogs.alert = MEDIA_NOT_CONNECTED_ALERT;
      this.#closeScreenMenu();
      return;
    }
    this.#dialogs.prompt = {
      title: SCREEN_NAME_PROMPT,
      // `screenProducers.size + 1` - what this session is already sharing, so a second screen
      // opens on "Screen 2" rather than on "Screen 1" again.
      value: `Screen ${this.#mediaSession.screenNames.length + 1}`,
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
                deviceId: { ideal: this.selectedVideoDeviceId },
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
      this.#screenStream = stream;
      this.#media.screenSharing = true;
      this.#closeScreenMenu();
      const track = stream.getVideoTracks()[0];

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
      if (track && this.#mediaSession) {
        try {
          const producer = await this.#mediaSession.produceScreen(track, screenName);
          this.#localScreenProducerId = producer.id;
          this.#localScreenStreams.set(producer.id, stream);
          this.#addLocalScreen(producer.id, screenName, stream);
          // Ending the capture - the browser's own "Stop sharing" bar - closes THIS screen only,
          // not every screen this presenter is sharing.
          track.addEventListener('ended', () => this.stopLocalScreen(producer.id), { once: true });
        } catch (error) {
          // The local preview still works; only the sharing half failed, and saying so beats a
          // presenter believing the room can see them.
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
      this.#stopStream(stream);
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
    const session = this.#mediaSession;
    if (!session) return;

    // A copy, because the loop reassigns `#localScreenStreams` through `#addLocalScreen` and
    // `stopLocalScreen`'s bookkeeping below. Iterating the live map would skip entries.
    for (const [oldProducerId, stream] of [...this.#localScreenStreams]) {
      const track = stream.getVideoTracks()[0];
      // `readyState` and not just presence: a track the user has already ended cannot be re-produced,
      // and asking the SFU to carry a dead one would publish a frozen pane rather than a picture.
      if (!track || track.readyState !== 'live') continue;

      const screenName =
        this.#sharedScreens.find((screen) => screen.id === oldProducerId)?.screenName ?? '';

      try {
        const producer = await session.produceScreen(track, screenName, { isReconnect: true });

        this.#localScreenStreams.set(producer.id, stream);
        this.#addLocalScreen(producer.id, screenName, stream);
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
   * Stops one shared screen, leaving the presenter's others running.
   *
   * The capture stops them individually by producer id (byte 1099342), which is the only thing
   * that makes "share multiple screens" usable - a presenter finishing with one chart should not
   * drop the other two.
   */
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
    this.#sharedScreens = this.#sharedScreens.filter((entry) => entry.id !== producerId);
    this.#screenStreams.delete(producerId);
    this.#screens.screenRemoved(producerId, nextSelectedId);
  }

  stopLocalScreen(producerId: string) {
    const stream = this.#localScreenStreams.get(producerId);

    // Close the producer before dropping the track: the server tears the room's consumers down
    // from `producerClosed`, so viewers lose the tab instead of keeping a frozen last frame.
    if (this.#mediaSession) void this.#mediaSession.closeProducer(producerId);
    this.#stopStream(stream ?? null);

    /*
      The first screen that is NOT this one, computed BEFORE the drop and deliberately not
      `#sharedScreens[0]`. The line this replaced read `#sharedScreens[0]?.id` AFTER the filter had
      already removed this entry, so the two are only the same expression if you also move the
      filter — and passing it as an argument evaluates it first. Stopping the leftmost of three
      screens would then have re-selected the tab that was being removed.
    */
    const nextSelectedId = this.#sharedScreens.find((entry) => entry.id !== producerId)?.id ?? null;
    this.#dropLocalScreen(producerId, nextSelectedId);

    if (this.#localScreenProducerId === producerId) this.#localScreenProducerId = null;
    // The recorder and the local preview follow whichever share is still running, if any.
    this.#screenStream = this.#localScreenStreams.values().next().value ?? null;
    if (this.#localScreenStreams.size === 0) {
      this.#stopRecording();
      this.#media.screenSharing = false;
    }
  }
}
