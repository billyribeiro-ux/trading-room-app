/**
 * One peer's media session: a mediasoup-client `Device`, its two transports, its producers and its
 * consumers, driven over {@link SignallingClient}.
 *
 * The API surface used here was read from the installed package, not recalled - mediasoup-client
 * **3.21.0** (`node_modules/mediasoup-client/package.json`), which is a different generation from
 * the 3.7.x family bundled in the capture (evidence: the bundle's handler table and its
 * `additionalSettings` rename). Every call below is checked against `node_modules/mediasoup-client/
 * lib/*.d.ts` and cited where it differs from the capture.
 *
 * # The handshake
 *
 * Same order as the captured client, because it is the order the library forces:
 *
 * 1. `getRouterRtpCapabilities` -> `device.load({ routerRtpCapabilities })` (bundle byte 1076868;
 *    the captured ack's field is `capabilities`, ours is `routerRtpCapabilities`, `server.rs:63-65`).
 * 2. `createWebRtcTransport` for send (presenters only) and recv (bundle byte 1079380).
 * 3. `connectTransport`, sent lazily from the transport's own `connect` event - first produce, first
 *    consume (bundle bytes 1080066 and 1081451).
 * 4. `produce` / `consume` on demand.
 *
 * Unlike the capture, the send and recv transports are **not** created in the same tick with the
 * recv one un-awaited (bundle byte 1080880). That is a race the captured client lives with; there
 * is no artefact to reproduce in it.
 *
 * # Codec order is the contract, and it is the server's
 *
 * The one thing here that is *not* ours to choose is the codec order. `device.load()` is called
 * without `preferLocalCodecsOrder`, and in 3.21.0 the **recv** capabilities are derived with
 * `preferLocalCodecsOrder` hardcoded `false` regardless of the option
 * (`node_modules/mediasoup-client/lib/Device.js:247-248`), so `getExtendedRtpCapabilities` iterates
 * the *remote* codec list (`lib/ortc.js:189-195`) and `device.recvRtpCapabilities.codecs` preserves
 * the router's order. Our router leads with VP9 (`services/media/src/codecs.rs:74`, asserted by its
 * `video_mime_types().first() == Vp9` test at `:119-126`).
 *
 * That matters because when no `codec` is pinned, mediasoup-client takes `codecs[0]` -
 * `reduceCodecs()` at `lib/ortc.js:447-455`, unchanged from the bundle's byte 2853366. "First video
 * codec wins" is a mechanism, not a convention.
 */

import { Device } from 'mediasoup-client';
import type {
  BuiltinHandlerName,
  Consumer,
  MediaKind,
  Producer,
  ProducerCodecOptions,
  RtpCapabilities,
  RtpCodecCapability,
  RtpEncodingParameters,
  Transport,
  TransportOptions
} from 'mediasoup-client/types';
import {
  SignallingError,
  type ProducerInfo,
  type SignallingClient,
  type MediaUserId
} from './signalling';

/**
 * VP9 SVC: one encoding, three spatial and three temporal layers, discontinuous transmission.
 *
 * Verbatim from the capture's `XS` constant:
 * `XS=[{scalabilityMode:"S3T3",dtx:!0}]` - `docs/source/main.d6d3c112b59b7d0d.js` byte **1071710**.
 *
 * Verified with `grep -abo 'XS=\[{scalabilityMode' docs/source/main.d6d3c112b59b7d0d.js`, which
 * reports exactly one match, at 1071710. (1071656 is `QS`, not `XS` - see
 * {@link SIMULCAST_ENCODINGS}. The two are adjacent in one comma-separated declaration, which is
 * how they are easy to transpose.)
 */
export const VP9_SVC_ENCODINGS: RtpEncodingParameters[] = [{ scalabilityMode: 'S3T3', dtx: true }];

/**
 * Two-layer simulcast at 1.5 Mbps and 6 Mbps.
 *
 * Verbatim from the capture's `QS` constant:
 * `QS=[{dtx:!0,maxBitrate:15e5},{dtx:!0,maxBitrate:6e6}]` - byte **1071656**.
 *
 * Verified with `grep -abo 'QS=\[{dtx' docs/source/main.d6d3c112b59b7d0d.js`: one match, at
 * 1071656. `15e5` is 1,500,000 and `6e6` is 6,000,000.
 *
 * The capture maps `dtx: true` over it again at the point of use
 * (`QS.map(w=>({...w,dtx:!0}))`, byte 1104100) even though both entries already carry it; that is a
 * no-op, so it is not reproduced here. The values are.
 */
export const SIMULCAST_ENCODINGS: RtpEncodingParameters[] = [
  { dtx: true, maxBitrate: 1_500_000 },
  { dtx: true, maxBitrate: 6_000_000 }
];

/**
 * `videoGoogleStartBitrate` for a webcam producer.
 *
 * `const f={videoGoogleStartBitrate:1e3}` in `enableCam` - byte 1088100, applied at the `produce()`
 * call at byte 1088520.
 */
export const WEBCAM_START_BITRATE = 1000;

/**
 * `videoGoogleStartBitrate` for a screen-share producer.
 *
 * `const _={videoGoogleStartBitrate:1e5}` - byte 1103666, applied at byte 1104332. A hundred times
 * the webcam value, which is what a screen share's detail-over-motion tradeoff wants.
 */
export const SCREEN_START_BITRATE = 100_000;

/**
 * Microphone codec options: every Opus feature off.
 *
 * `codecOptions:{opusStereo:!1,opusDtx:!1,opusFec:!1}` - byte 1083612. Note `opusDtx:false` on the
 * microphone, while both *video* encoding sets above carry `dtx:true`; that asymmetry is the
 * capture's, and is preserved rather than tidied.
 */
export const MICROPHONE_CODEC_OPTIONS: ProducerCodecOptions = {
  opusStereo: false,
  opusDtx: false,
  opusFec: false
};

/**
 * The capture's message when a forced H264 lookup finds nothing. Bytes 1103766-1103860.
 *
 * `grep -abo 'desired H264' docs/source/main.d6d3c112b59b7d0d.js` reports it at the cam site
 * (1088172-region) and both screen sites, identically spelled.
 */
export const H264_NOT_SUPPORTED = 'desired H264 codec+configuration is not supported';

/** The forced-VP9 counterpart, a few bytes later in the same `else if`. Bytes 1103969-1104023. */
export const VP9_NOT_SUPPORTED = 'desired VP9 codec+configuration is not supported';

/**
 * The captured encoding branch, reproduced **including its two guards**.
 *
 * {@link selectVideoEncodings} answers "which encodings would VP9-vs-not choose", which is the half
 * that has to match a reference. This function is the whole statement as the bundle writes it, and
 * the difference is the `useSharingSimulcast` guard - without it, a caller cannot express the
 * captured default at all, because the captured default is *no encodings key*:
 *
 * ```js
 * // byte 1077923, the screen re-produce path, quoted verbatim:
 * if (e.useSharingSimulcast) {
 *   const h = e.device.rtpCapabilities.codecs.find(f => "video" === f.kind);
 *   r = e.forceVP9 || "video/vp9" === h.mimeType.toLowerCase() ? XS : QS.map(f => ({...f, dtx: !0}))
 * }
 * ```
 *
 * `r` is declared (`let r,a,s=e.liveScreenTrack`) and assigned **only** inside that `if`, then passed
 * as `encodings:r` at byte 1078158. So `useSharingSimulcast === false` means `encodings: undefined`,
 * which is not the same thing as "simulcast with one layer" - it is the browser's own default
 * single-encoding behaviour. Returning `undefined` here is therefore load-bearing, not a null object.
 *
 * The `forceVP9` disjunct is the second guard. Two of the three sites write it as
 * `forceVP9 && <resolved codec> ||` (bytes 1104230, 1107257) and the third as plain `forceVP9 ||`
 * (byte 1078014); they cannot disagree, because at the two sites that add the conjunct a truthy
 * `forceVP9` with an unresolved codec has already thrown {@link VP9_NOT_SUPPORTED} a few bytes
 * earlier.
 *
 * The dominant spelling (2 of 3 sites) is the one implemented. It is unobservable which is "right":
 * `forceVP9` is assigned `!1` twice and never anything else - `this.forceVP9=!1` in the constructor
 * (byte 1072383) and again in `init` (byte 1073269) - so the disjunct's left arm is false at every
 * one of its read sites and the mimeType test decides on its own. Both spellings are therefore
 * equivalent in the deployed build, and the difference between them is theoretical.
 */
export type ScreenEncodingOptions = {
  /** The device's RECV capabilities - `device.rtpCapabilities` in the capture. */
  recvRtpCapabilities: RtpCapabilities;
  /** The capture's `useSharingSimulcast`. False in the captured constructor (byte 1072430). */
  useSharingSimulcast: boolean;
  /** The capture's `forceVP9`. False in the captured constructor (byte 1072383). */
  forceVP9?: boolean;
  /** The codec a `forceH264`/`forceVP9` lookup already resolved, if any. See above. */
  forcedCodec?: RtpCodecCapability;
};

export function selectScreenShareEncodings(
  options: ScreenEncodingOptions
): RtpEncodingParameters[] | undefined {
  const { recvRtpCapabilities, useSharingSimulcast, forceVP9 = false, forcedCodec } = options;

  // The guard, and the reason this returns `RtpEncodingParameters[] | undefined`.
  if (!useSharingSimulcast) return undefined;

  // `s.forceVP9 && f || "video/vp9" === S.mimeType.toLowerCase() ? XS : QS` - the conjunct is a
  // short-circuit, so a truthy `forceVP9` with an UNRESOLVED codec falls through to the mimeType
  // test rather than forcing XS. Verified verbatim at bytes 1104139 and 1107166.
  if (forceVP9 && forcedCodec !== undefined) {
    return VP9_SVC_ENCODINGS.map((encoding) => ({ ...encoding }));
  }

  return selectVideoEncodings(recvRtpCapabilities).map((encoding) => ({ ...encoding }));
}

/**
 * Chooses the video encodings the way the captured client does.
 *
 * The rule, from three call sites that all spell it identically - screen share (byte 1104100),
 * `reproduceLocalTracksIfAny` (byte 1077954) and `restartScreenSharing` (byte 1107197):
 *
 * ```js
 * const S = s.device.rtpCapabilities.codecs.find(w => "video" === w.kind);
 * h = s.forceVP9 && f || "video/vp9" === S.mimeType.toLowerCase() ? XS : QS.map(w => ({...w, dtx: !0}));
 * ```
 *
 * So: **the first `kind === 'video'` entry of the device's RECV capabilities**, lowercased, compared
 * to `'video/vp9'`. Recv, not send - the bundle's `get rtpCapabilities()` returns
 * `this._recvRtpCapabilities` (byte 2698259), and 3.21.0 keeps that exact aliasing
 * (`lib/Device.js:195-197`, `get rtpCapabilities() { return this.recvRtpCapabilities; }`). This
 * function therefore takes recv capabilities, and {@link MediaSession} passes
 * `device.recvRtpCapabilities` - the non-deprecated spelling of the same getter.
 *
 * ## Honest gap: this branch never executed in the deployed build
 *
 * All three call sites are guarded by `if (s.useSharingSimulcast)`, and `useSharingSimulcast` has
 * exactly one assignment in the entire bundle - `this.useSharingSimulcast=!1` in the constructor,
 * byte 1072430 - with three read sites and zero occurrences anywhere in `docs/source/components/*.js`
 * or `scripts.*.js`. So in the artifact we have, `encodings` was `undefined` on every `produce()`
 * call and neither `XS` nor `QS` was ever constructed.
 *
 * What is implemented here is therefore **the captured code's intent, not its observed deployed
 * behaviour**. That distinction is exactly what the evidence brief asks be stated rather than
 * blurred. The constants and the selection rule are transcribed from the bundle byte for byte; the
 * claim "production sent S3T3" is one this artifact cannot support and is not made.
 */
export function selectVideoEncodings(
  recvRtpCapabilities: RtpCapabilities
): RtpEncodingParameters[] {
  const firstVideoCodec = (recvRtpCapabilities.codecs ?? []).find(
    (codec) => codec.kind === 'video'
  );
  // `.find` on a router with no video codec at all yields undefined. The capture would throw a
  // TypeError reading `.mimeType` off it; falling back to simulcast is the honest answer to "we
  // cannot tell it is VP9", and the caller's produce would fail on its own terms anyway.
  const isVp9 = firstVideoCodec?.mimeType.toLowerCase() === 'video/vp9';
  // Copies, so a caller cannot mutate the exported constants for every later producer. Note this
  // is defensive only, not a fix for a live bug: 3.21.0's `produce()` already rebuilds every
  // encoding into a fresh object before the handler sees it
  // (`lib/Transport.js:332-364`, `normalizedEncodings = encodings.map(...)`), which is what keeps
  // the handler's `encoding.rid = \`r${idx}\`` rewrite (`lib/handlers/Chrome111.js:251`) off these
  // arrays.
  return (isVp9 ? VP9_SVC_ENCODINGS : SIMULCAST_ENCODINGS).map((encoding) => ({ ...encoding }));
}

/**
 * The `codec` a producer pins, or `undefined` to let the router's first video codec win.
 *
 * ## A deliberate, documented divergence from the capture
 *
 * The captured client pins H264 on **every** cam and screen produce:
 *
 * ```js
 * this.forceH264 = this.globals.sessData.h264Enabled || !0, this.forceVP9 = !1   // byte 1073216
 * // then, at 1088172 / 1103808 / 1106835:
 * h = i.device.rtpCapabilities.codecs.find(_ => "video/h264" === _.mimeType.toLowerCase());
 * if (!h) throw new Error("desired H264 codec+configuration is not supported")
 * ```
 *
 * `|| !0` is `|| true`, so `forceH264` is unconditionally true no matter what `h264Enabled` holds.
 * That is a typo, and reproducing it would be actively harmful here for two reasons:
 *
 * 1. It contradicts the other half of the capture. The same build selects `XS` (S3T3 VP9 SVC) from
 *    a VP9-first codec list while pinning H264 - two mutually incoherent decisions in one
 *    `produce()` call, only survivable because the encodings branch was dead (see above).
 * 2. Our router leads with VP9 deliberately (`codecs.rs:74`) *because* the client picks the first
 *    video codec. Pinning H264 would discard that on the only two paths that matter.
 *
 * So this returns `undefined` by default: no `codec` key, and mediasoup-client takes `codecs[0]`
 * (`lib/ortc.js:449-455`). A caller that genuinely needs H264 can ask, and gets the capture's
 * error - including its "throw if the router does not advertise it" behaviour - via
 * {@link findCodec}.
 */
export function findCodec(
  recvRtpCapabilities: RtpCapabilities,
  mimeType: string
): RtpCodecCapability {
  const wanted = mimeType.toLowerCase();
  const codec = (recvRtpCapabilities.codecs ?? []).find(
    (candidate) => candidate.mimeType.toLowerCase() === wanted
  );
  if (!codec) {
    // The capture has TWO distinct messages, one per forced codec, and which one you get depends
    // on which lookup failed:
    //   "desired H264 codec+configuration is not supported"  - the forceH264 arm
    //   "desired VP9 codec+configuration is not supported"   - the forceVP9 arm
    // Both are visible in one contiguous read of bytes 1103766-1104023. Throwing the H264 message
    // for a failed VP9 lookup would be a fabricated diagnostic - it names a codec the caller never
    // asked for - so the message follows the request.
    throw new Error(
      wanted === 'video/vp9'
        ? VP9_NOT_SUPPORTED
        : wanted === 'video/h264'
          ? H264_NOT_SUPPORTED
          : `desired ${mimeType} codec+configuration is not supported`
    );
  }
  return codec;
}

/** What the room needs to know about a consumer this session created. */
export type RemoteStream = {
  consumer: Consumer;
  producerId: string;
  peerId: string;
  userId: MediaUserId;
  displayName: string | null;
  kind: MediaKind;
  appData: unknown;
  /** A one-track `MediaStream`, ready for a `<video>`/`<audio>` `srcObject`. */
  stream: MediaStream;
};

export type MediaSessionOptions = {
  signalling: SignallingClient;
  /**
   * Whether this peer may create a send transport at all.
   *
   * The server refuses `produce` from a non-presenter with `forbidden` (`server.rs:1132-1134`,
   * `CommandError::NotAPresenter`), so asking for a send transport as a member wastes a transport
   * and earns a refusal at the first produce. The app derives the same predicate at
   * `src/routes/+page.svelte:313` (`role === 'staff' || role === 'admin'`).
   */
  canProduce: boolean;
  /**
   * ICE servers, applied verbatim to the RTCPeerConnection.
   *
   * The capture's list is one Google STUN entry plus one TURN entry with udp/tcp/tls URLs
   * (byte 1073300), credentials defaulting to `flash.protradingroom.com` / `ptrUser` / `ptr123`
   * (byte 976948) - the same hardcoded triple the app's connectivity-check modal already uses
   * (`src/lib/components/ModalHost.svelte:385-406`). Not defaulted here: which TURN server this
   * deployment should use is a deployment fact, and inventing one would be fabricating config.
   *
   * A function may be given instead of a list, and normally is. TURN credentials are ephemeral and
   * arrive with the admission grant, which is fetched when the socket opens - after this session is
   * constructed. Resolving at transport-creation time means a reconnect picks up the credentials
   * minted for the new grant rather than reusing the expired ones from the first attempt.
   */
  iceServers?: RTCIceServer[] | (() => RTCIceServer[]);
  /**
   * mediasoup-client handler override. The capture forces `'Safari12'` on iOS mobile and
   * otherwise auto-detects (byte 1078854). Left to the caller because `detectDevice()` in 3.21.0
   * knows handlers the bundled 3.7.x did not (`Firefox120`, `Chrome111`), so hard-coding the
   * capture's table would be a downgrade.
   *
   * Typed as `BuiltinHandlerName` directly. The conditional-inference spelling this replaced
   * (`ConstructorParameters<typeof Device>[0] extends { handlerName?: infer H } ? H : never`)
   * silently evaluated to `never`: `DeviceOptions` is an *optional* constructor parameter, so
   * `ConstructorParameters<typeof Device>[0]` is `DeviceOptions | undefined`, and a union containing
   * `undefined` does not extend `{ handlerName?: ... }`. The option compiled but could never be
   * given a value - the field was unusable rather than merely awkward.
   */
  handlerName?: BuiltinHandlerName;
};

/**
 * A peer's media session.
 *
 * Deliberately holds no UI state and touches no DOM: it hands back `MediaStream`s and lets the room
 * decide where they go. That is what keeps it independently testable, and it is why nothing here
 * knows about `msRemAudio-{userID}` (the capture's audio sink convention, byte 1092900, which the
 * app's master-volume handler already assumes — `lib/room/volume.svelte.ts`, rendered through
 * `lib/components/RemoteAudioSinks.svelte`).
 */
export class MediaSession {
  readonly #signalling: SignallingClient;
  readonly #options: MediaSessionOptions;
  #device: Device | null = null;
  #sendTransport: Transport | null = null;
  #recvTransport: Transport | null = null;
  readonly #producers = new Map<string, Producer>();
  readonly #consumers = new Map<string, RemoteStream>();
  #closed = false;

  constructor(options: MediaSessionOptions) {
    this.#signalling = options.signalling;
    this.#options = options;
  }

  get device(): Device | null {
    return this.#device;
  }

  get loaded(): boolean {
    return this.#device?.loaded ?? false;
  }

  /** Live consumers, keyed by the remote producer id they are consuming. */
  get remoteStreams(): ReadonlyMap<string, RemoteStream> {
    return this.#consumers;
  }

  /** Live local producers, keyed by producer id. */
  get producers(): ReadonlyMap<string, Producer> {
    return this.#producers;
  }

  /** The `screenName` of every screen this session is currently sharing, in producer order. */
  get screenNames(): string[] {
    return [...this.#producers.values()]
      .filter((producer) => producer.appData.share === true)
      .map((producer) => String(producer.appData.screenName ?? ''));
  }

  /*
   * There is still no `nextScreenName()` here, but the reason has changed - and the earlier reason
   * was wrong, so it is corrected rather than quietly rewritten.
   *
   * What the evidence establishes: one presenter can share several screens at once - the capture
   * holds them in a Map (`this.screenProducers=new Map`, byte 1072217) and stops them individually
   * by producer id (byte 1099342) - and the screens tab bar renders one tab per sharer labelled
   * `{name}-{screenName}`, which a real captured room shows resolving to `"TG-Screen 1"`
   * (`pro-room/retired/evidence-folder/proroom-ultra-admin-room.json` @10495827, a visible span
   * with rect 465,102,68,14).
   *
   * This comment used to claim the bundle "contains no generator". It does. `startScreenSharing(e)`
   * in `docs/source/main.d6d3c112b59b7d0d.js` prefills its naming prompt with
   * `Screen ${this.mediaSoupService.screenProducers.size + 1}` - a monotonic count of what this
   * session is already producing, not a lowest-free-index search. A live room showing `FUTURES` and
   * `MAIN / SPX` was the presenter typing over that default, which is what made the default look
   * like an invention.
   *
   * It stays out of this class anyway, because it belongs to the prompt rather than to the session:
   * the captured code computes it at the call site, the presenter can overwrite it before anything
   * is captured, and by the time `produceScreen` runs the name is simply an argument. What this
   * class does expose is {@link screenNames}, which is the `screenProducers.size` the default
   * counts from.
   */

  /**
   * Step 1 and 2: fetch the router's capabilities and load the Device.
   *
   * `preferLocalCodecsOrder` is left at its default `false`, matching the capture, which calls
   * `load({routerRtpCapabilities: e})` with nothing else (byte 1079089). For the recv capabilities
   * this build reads, 3.21.0 hardcodes `false` anyway (`lib/Device.js:247-248`).
   */
  async load(): Promise<void> {
    this.#assertOpen();
    if (this.#device?.loaded) return;

    const { routerRtpCapabilities } = await this.#signalling.request('getRouterRtpCapabilities');
    const device = new Device(
      this.#options.handlerName ? { handlerName: this.#options.handlerName } : {}
    );
    await device.load({ routerRtpCapabilities });
    this.#device = device;
  }

  /** The device's RECV capabilities - what codec selection and every `consume` request read. */
  get recvRtpCapabilities(): RtpCapabilities {
    return this.#requireDevice().recvRtpCapabilities;
  }

  /**
   * The video encodings this device would use, by the captured client's rule.
   *
   * Exposed so the choice is observable without producing anything - it is the one behaviour in
   * this file that has to match a reference, so it has to be testable on its own.
   */
  get videoEncodings(): RtpEncodingParameters[] {
    return selectVideoEncodings(this.recvRtpCapabilities);
  }

  async #createTransport(direction: 'send' | 'recv'): Promise<Transport> {
    const device = this.#requireDevice();
    const producing = direction === 'send';

    // The send request carries `producing:true, consuming:false` and vice versa - the capture
    // sends the same pair of booleans (bytes 1079460 and 1081012), though it also puts
    // `rtpCapabilities` and `appData` on the send one, which our server does not read
    // (`server.rs:1243-1248`, `CreateTransport` is `deny_unknown_fields` over exactly the two
    // booleans - so sending them would be a `badPayload` refusal, not a harmless extra).
    const parameters = await this.#signalling.request('createWebRtcTransport', {
      producing,
      consuming: !producing
    });

    // The server's reply is already mediasoup-client's `TransportOptions` shape - `session.rs`
    // re-serialises mediasoup's own types verbatim (`session.rs:382-387`) and omits
    // `sctpParameters` rather than sending null when SCTP is off (`session.rs:392-399`), which
    // matters precisely because it is spread wholesale here.
    const configured = this.#options.iceServers;
    const options: TransportOptions = {
      ...parameters,
      iceServers: typeof configured === 'function' ? configured() : configured
    };

    // `proprietaryConstraints: {optional:[{googDscp:true}]}` (the capture's `Jce`, byte 1071625,
    // passed at byte 1079946) is NOT carried across. It was already dead in the captured build:
    // the bundled library destructures `additionalSettings`, never `proprietaryConstraints`
    // (bytes 2699872 and 2700680), and 3.21.0 is the same (`lib/Transport.d.ts:18`). Passing it
    // would be cargo cult - it never reached an RTCPeerConnection in the capture either.
    const transport = producing
      ? device.createSendTransport(options)
      : device.createRecvTransport(options);

    // Lazy connect, exactly as the capture does it: the DTLS exchange is sent from the
    // transport's own `connect` event, which fires on the first produce or first consume
    // (bytes 1080066 send / 1081451 recv). The capture spells the payload keys differently on
    // the two sides for no reason; ours is one shape (`server.rs:1250-1255`).
    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
      this.#signalling
        .request('connectTransport', { transportId: transport.id, dtlsParameters })
        .then(() => callback())
        .catch((error: Error) => errback(error));
    });

    if (producing) {
      // The server answers `produce` with `{ id }` (`server.rs:1152`), not the capture's
      // snake_case `producer_id` (byte 1080293). Ours is the client, so ours is the spelling.
      transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
        this.#signalling
          .request('produce', {
            transportId: transport.id,
            kind,
            rtpParameters,
            appData
          })
          .then(({ id }) => callback({ id }))
          .catch((error: Error) => errback(error));
      });
    }

    return transport;
  }

  /** Creates the send transport. Refuses for a peer whose role may not produce. */
  async createSendTransport(): Promise<Transport> {
    this.#assertOpen();
    if (this.#sendTransport) return this.#sendTransport;
    if (!this.#options.canProduce) {
      // Fails here rather than at the first produce, where the server's `forbidden` refusal
      // (`server.rs:1132-1134`) would arrive after a whole transport had been built for it.
      throw new SignallingError('forbidden', 'this peer may not produce');
    }
    this.#sendTransport = await this.#createTransport('send');
    return this.#sendTransport;
  }

  async createRecvTransport(): Promise<Transport> {
    this.#assertOpen();
    if (this.#recvTransport) return this.#recvTransport;
    this.#recvTransport = await this.#createTransport('recv');
    return this.#recvTransport;
  }

  async #produce(
    track: MediaStreamTrack,
    encodings: RtpEncodingParameters[] | undefined,
    codecOptions: ProducerCodecOptions,
    appData: Record<string, unknown>,
    codec?: RtpCodecCapability
  ): Promise<Producer> {
    const transport = await this.createSendTransport();
    const producer = await transport.produce({
      track,
      encodings,
      codecOptions,
      codec,
      // `stopTracks:false` on every produce in the capture - bytes 1083612 (mic), 1088520
      // (cam), 1104332 (screen). The library's own default is true (`lib/Transport.d.ts:244`
      // destructures it; the bundle's signature at byte 2714540 shows `stopTracks=!0`), so
      // this is an override, and it is what lets the app keep muting by `track.enabled`
      // (`lib/room/local-capture.svelte.ts`) rather than re-acquiring the device.
      stopTracks: false,
      appData
    });
    this.#producers.set(producer.id, producer);
    producer.on('transportclose', () => this.#producers.delete(producer.id));
    return producer;
  }

  /**
   * Produces the microphone track.
   *
   * No `encodings` and no pinned codec, matching byte 1083612 - audio has neither simulcast nor a
   * codec choice to make here (our router advertises one audio codec, Opus, `codecs.rs:64`).
   */
  async produceMicrophone(
    track: MediaStreamTrack,
    appData: Record<string, unknown> = {}
  ): Promise<Producer> {
    this.#assertOpen();
    return this.#produce(track, undefined, MICROPHONE_CODEC_OPTIONS, appData);
  }

  /**
   * Produces the webcam track.
   *
   * `appData.share` is `false`, which is how a viewer tells a webcam from a screen share on the
   * same `video` kind - the capture tags it the same way (byte 1088520,
   * `appData:{share:!1,isReconnect:o,prevMuserID:s}`) and our server echoes `appData` back to the
   * room verbatim for exactly this purpose (`server.rs:337-340`).
   *
   * Note the capture never actually simulcasts the webcam: `let c,h` at byte 1088100 declares
   * `encodings` and never assigns it. Here the webcam gets the same
   * {@link selectVideoEncodings} treatment as the screen, which is the intent the dead
   * `useSharingSimulcast` branch expresses - stated as a divergence rather than left implicit.
   */
  async produceWebcam(
    track: MediaStreamTrack,
    appData: Record<string, unknown> = {}
  ): Promise<Producer> {
    this.#assertOpen();
    return this.#produce(
      track,
      this.videoEncodings,
      { videoGoogleStartBitrate: WEBCAM_START_BITRATE },
      { share: false, ...appData }
    );
  }

  /**
   * Produces the screen-share track.
   *
   * `appData` carries `share:true` and a `screenName`, matching byte 1104332
   * (`appData:{share:!0,screenName:i,isReconnect:!1}`).
   */
  async produceScreen(
    track: MediaStreamTrack,
    screenName: string,
    appData: Record<string, unknown> = {},
    options: { useSharingSimulcast?: boolean } = {}
  ): Promise<Producer> {
    this.#assertOpen();
    return this.#produce(
      track,
      // Defaults to NO encodings, which is what the deployed build does: `useSharingSimulcast` has
      // one assignment in the whole bundle, `this.useSharingSimulcast=!1` (byte 1072430), and `r`
      // is assigned only inside `if (e.useSharingSimulcast)`, so `encodings: undefined` reaches
      // `produce()` in production. Sending `encodings` unconditionally was a divergence, and a
      // costly one: `[{scalabilityMode:'S3T3'}]` asks Chrome's VP9 encoder for three spatial
      // layers, and on a source too small to carry them the encoder emits a short burst and
      // stalls - measured as 24 packets, 0 packets lost, framesReceived 0, and the consumer
      // asking for a keyframe 41 times.
      options.useSharingSimulcast ? this.videoEncodings : undefined,
      { videoGoogleStartBitrate: SCREEN_START_BITRATE },
      { share: true, screenName, ...appData }
    );
  }

  /**
   * Consumes one remote producer.
   *
   * The server creates every consumer **paused** (`server.rs:67-69`, mediasoup's own prescription
   * at `transport.rs:262-265`), so `resumeConsumer` is mandatory, not an optimisation. Unlike the
   * capture - which fires `resumeConsumer` and resolves its own promise *before* the ack arrives
   * (byte 1095040), so a failed resume is a silently dead stream - this awaits the resume and
   * closes the consumer if it fails, because a consumer that will never carry packets should not
   * be handed back as if it might.
   *
   * Returns `null` when the producer is already being consumed, which is the dedupe the server's
   * at-least-once `newProducer` requires (`server.rs:88-92`).
   */
  async consume(info: ProducerInfo): Promise<RemoteStream | null> {
    this.#assertOpen();
    if (this.#consumers.has(info.producerId)) return null;

    const transport = await this.createRecvTransport();
    const parameters = await this.#signalling.request('consume', {
      transportId: transport.id,
      producerId: info.producerId,
      rtpCapabilities: this.recvRtpCapabilities
    });

    // Only the four keys the library destructures (`lib/Transport.d.ts:248`). The capture also
    // passes `data` and `codecOptions` here (byte 1095040); both are silently ignored by the
    // library (bundle byte 2716940), so passing them would be noise.
    const consumer = await transport.consume({
      id: parameters.id,
      producerId: parameters.producerId,
      kind: parameters.kind,
      rtpParameters: parameters.rtpParameters
    });

    try {
      await this.#signalling.request('resumeConsumer', { consumerId: consumer.id });
    } catch (error) {
      consumer.close();
      throw error;
    }

    const remote: RemoteStream = {
      consumer,
      producerId: info.producerId,
      peerId: info.peerId,
      userId: info.userId,
      displayName: info.displayName,
      kind: parameters.kind,
      appData: info.appData,
      stream: new MediaStream([consumer.track])
    };
    this.#consumers.set(info.producerId, remote);
    consumer.on('transportclose', () => this.#consumers.delete(info.producerId));
    return remote;
  }

  /** Closes one consumer locally and tells the server. Safe to call for an unknown producer id. */
  async stopConsuming(producerId: string): Promise<void> {
    const remote = this.#consumers.get(producerId);
    if (!remote) return;
    this.#consumers.delete(producerId);
    remote.consumer.close();
    try {
      await this.#signalling.request('closeConsumer', { consumerId: remote.consumer.id });
    } catch {
      // The server may already have closed it - mediasoup propagates a producer close to its
      // consumers itself (`server.rs:183-184`). The local close above is what matters.
    }
  }

  /**
   * Restricts one remote screen to a lower layer.
   *
   * Called with the producer id, not the consumer id, because the room thinks in screens: the tab a
   * viewer is looking at is a producer, and which consumer carries it is this class's business.
   *
   * A no-op when the producer is not being consumed - a viewer switching tabs should not have to
   * care whether a stream has already been torn down.
   */
  async setPreferredLayers(
    producerId: string,
    spatialLayer: number,
    temporalLayer?: number
  ): Promise<void> {
    this.#assertOpen();
    const remote = this.#consumers.get(producerId);
    if (!remote) return;
    await this.#signalling.request('setPreferredLayers', {
      consumerId: remote.consumer.id,
      spatialLayer,
      ...(temporalLayer === undefined ? {} : { temporalLayer })
    });
  }

  /** Closes one local producer and tells the server, which announces `producerClosed` to the room. */
  async closeProducer(producerId: string): Promise<void> {
    const producer = this.#producers.get(producerId);
    if (!producer) return;
    this.#producers.delete(producerId);
    producer.close();
    try {
      await this.#signalling.request('closeProducer', { producerId });
    } catch {
      // Teardown is best-effort: a socket that has already gone took the whole session with it
      // (`server.rs:1024`).
    }
  }

  async pauseProducer(producerId: string): Promise<void> {
    await this.#signalling.request('pauseProducer', { producerId });
  }

  async resumeProducer(producerId: string): Promise<void> {
    await this.#signalling.request('resumeProducer', { producerId });
  }

  /**
   * Tears the whole session down locally.
   *
   * Closing the transports is enough - mediasoup-client fires `transportclose` on every producer
   * and consumer below them - but the maps are cleared explicitly so a caller holding this object
   * cannot read a stale roster back out. Tracks are not stopped: they belong to whoever called
   * `getUserMedia`, which in this repo is the room page
   * (`src/routes/+page.svelte:265-267, 2578-2583`), and `stopTracks:false` on every produce says
   * the same thing.
   */
  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#sendTransport?.close();
    this.#recvTransport?.close();
    this.#sendTransport = null;
    this.#recvTransport = null;
    this.#producers.clear();
    this.#consumers.clear();
    this.#device = null;
  }

  #assertOpen(): void {
    if (this.#closed) throw new SignallingError('sessionClosed', 'this media session is closed');
  }

  #requireDevice(): Device {
    if (!this.#device?.loaded) {
      throw new SignallingError('clientNotLoaded', 'load() must resolve before this is available');
    }
    return this.#device;
  }
}
