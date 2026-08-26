/**
 * The browser half of the SFU's signalling wire.
 *
 * The server side is `services/media/src/server.rs`. That module's docs state the envelope, and
 * this file is written against them rather than against any recollection of how mediasoup
 * deployments usually talk:
 *
 * ```json
 * { "id": 7, "cmd": "produce", "data": { ... } }          // client -> server (`server.rs:28-29`)
 * { "id": 7, "ok": true,  "data": { ... } }               // server -> client (`server.rs:32`)
 * { "id": 7, "ok": false, "error": { "code": "...", "message": "..." } }   // (`server.rs:33`)
 * { "notify": "newProducer", "data": { ... } }            // server -> client (`server.rs:36`)
 * ```
 *
 * Three properties of that envelope shape this client:
 *
 * * **`id` is chosen by the client and echoed verbatim; the server never invents one**
 *   (`server.rs:39`). So correlation is ours to get right, and the counter here is the only source
 *   of ids.
 * * **A notification never carries an `id`** (`server.rs:35`), so a reply and a push can be told
 *   apart structurally. This client dispatches on `'notify' in frame` for exactly that reason and
 *   never on the absence of `ok`.
 * * **A frame the server could not parse at all is answered with `{"id": null, ...}`**
 *   (`server.rs:36-42`). That reply cannot be correlated to a request by definition, so it is
 *   surfaced through {@link SignallingEvents.protocolerror} rather than silently dropped. The
 *   server's own comment says why it bothers to send one: the captured client hangs forever on a
 *   malformed ack (bundle byte 1094980, whose only rejection path compares the whole ack to the
 *   literal string `"error"`). We do not reproduce that bug - see {@link requestTimeoutMs}.
 *
 * # Why not socket.io
 *
 * The captured deployment speaks socket.io with a single `"cmd"` event and an ack callback
 * (`docs/source/main.d6d3c112b59b7d0d.js` byte 1074148 for the connect, 20 `socket.emit("cmd", ...)`
 * sites between bytes 1075869 and 1108608). We write both ends of this one, and the transport
 * produces no user-visible artefact, so it is a plain WebSocket carrying JSON. What *is* kept from
 * the capture is the request/ack shape, because mediasoup-client forces it: `transport.on('connect',
 * (params, callback) => ...)` cannot proceed until the server answers (`server.rs:17-20`).
 *
 * # Reconnect
 *
 * A dropped socket is not a recoverable hiccup at the media layer: the server's `serve_peer` tears
 * the peer's `Session` down when its socket ends (`server.rs:1024`), so every transport, producer
 * and consumer id this client was holding is dead on the far side. Reconnecting therefore means
 * *re-handshaking*, not resuming - which is also what the captured client does, tearing down both
 * transports and nulling the device on disconnect (bundle byte 1074851) and replaying the whole
 * sequence on reconnect (byte 1076330).
 *
 * So this class deliberately does **not** replay queued requests across a reconnect. Every pending
 * request is rejected the moment the socket closes, and the owner is told via
 * {@link SignallingEvents.disconnected} / {@link SignallingEvents.connected} so it can rebuild.
 * Silently resending a `produce` against a transport id the server has already forgotten would earn
 * an `unknownTransport` refusal at best, and at worst a second producer.
 */

// Type-only, so nothing from mediasoup-client is pulled into this module at runtime - it stays a
// pure wire client that a Node test can import without a browser. The names are read from the
// installed package (`node_modules/mediasoup-client/lib/Transport.d.ts`,
// `lib/RtpParameters.d.ts`, `lib/SctpParameters.d.ts`, version 3.21.0), not from memory.
import type {
  DtlsParameters,
  IceCandidate,
  IceParameters,
  MediaKind,
  RtpCapabilities,
  RtpParameters,
  SctpParameters
} from 'mediasoup-client/types';

/** A stable machine-readable refusal tag. The client branches on this, never on the message. */
export type SignallingErrorCode =
  /* `server.rs:1312-1343`, `CommandError::code()` */
  | 'unknownCommand'
  | 'badPayload'
  | 'forbidden'
  | 'roomGone'
  | 'internal'
  | 'sessionClosed'
  | 'tooManyTransports'
  | 'tooManyProducers'
  | 'tooManyConsumers'
  /**
   * `rtpParameters` the server will not hand to mediasoup, because mediasoup panics on them rather
   * than rejecting them: an RTX codec whose `apt` names another RTX codec, or more encodings than
   * the consumer-side scalability mode can describe (`session.rs`,
   * `validate_produce_parameters`). Distinct from `badPayload`, which is a JSON-shape complaint.
   */
  | 'badRtpParameters'
  | 'unknownTransport'
  | 'wrongDirection'
  | 'unknownProducer'
  | 'unknownConsumer'
  | 'transportFailed'
  | 'produceFailed'
  | 'cannotConsume'
  | 'consumeFailed'
  | 'requestFailed'
  /* `server.rs:1067` (unparseable JSON) and `:1004` (a non-text frame). */
  | 'badEnvelope';

/** The error object inside a refusal frame (`server.rs:1350-1356`). */
export type SignallingErrorPayload = {
  code: SignallingErrorCode | (string & {});
  message: string;
};

/**
 * A refusal from the server, or a locally generated failure with the same shape.
 *
 * `code` is the branch point. The locally generated codes are namespaced with a `client` prefix so
 * they can never collide with a server tag.
 */
export class SignallingError extends Error {
  readonly code: SignallingErrorPayload['code'];
  /** The `cmd` that was refused, when the failure is attributable to one. */
  readonly command?: string;

  constructor(code: SignallingErrorPayload['code'], message: string, command?: string) {
    super(message);
    this.name = 'SignallingError';
    this.code = code;
    this.command = command;
  }
}

/**
 * Frames the server may push unsolicited (`server.rs:71-81`).
 *
 * `newProducer` is **at-least-once and must be deduped by `producerId`** - the server's own docs
 * say so (`server.rs:88-92`): a peer joins the room's fan-out list before it joins the room, so a
 * producer that appears during the handshake is queued rather than lost, at the cost of possibly
 * also appearing in the `getProducers` snapshot. Losing one is a permanently blank tile; duplicating
 * one is a set insert.
 */
export type Notifications = {
  /** Sent once, before any command can be issued (`server.rs:929-938`). */
  connected: {
    peerId: string;
    room: string;
    /** Null in anonymous development mode, which carries no verified identity. */
    userId: MediaUserId;
    displayName: string | null;
    role: 'presenter' | 'member' | null;
  };
  /** Another peer in the room produced (`server.rs:1149`, payload is `ProducerInfo`, `:332-341`). */
  newProducer: ProducerInfo;
  /** A caption line from whoever is speaking. Attribution comes from their grant, not their claim. */
  speechReco: {
    text: string;
    isFinal: boolean;
    timestamp: number;
    lang: string;
    peerId: string;
    userId: MediaUserId;
    sender: string | null;
  };
  /**
   * Another peer paused one producer (`server.rs:1203-1210`) - its tile stays, but it has stopped
   * sending. In the capture this fact arrives on a second socket entirely (`stopTalking`, bundle
   * bytes 1013700-1014900) and is what drives the talking indicator; we have one socket, so it
   * arrives here.
   */
  producerPaused: { producerId: string; peerId: string };
  /** Another peer resumed one producer (`server.rs:1217-1224`). */
  producerResumed: { producerId: string; peerId: string };
  /** Another peer closed one producer (`server.rs:1183-1190`). */
  producerClosed: { producerId: string; peerId: string };
  /** Another peer's socket went away (`server.rs:658-663`). */
  peerClosed: { peerId: string; userId: MediaUserId; producerIds: string[] };
};

/**
 * A user id **as it arrives on the wire**.
 *
 * MEASURED, not read: a live `connected` notification off this deployment's socket carries
 *
 *   {"data":{"displayName":"[OWNER_NAME]","peerId":"…","room":"ptr-room","userId":610},…}
 *
 * (the display name is redacted; the shape of `userId` is the whole point of the quote)
 *
 * The quote is left exactly as measured. Its `"room":"ptr-room"` is now historical — that constant
 * is gone and the id is derived per room as `tra-<shortCode>` (`media-grant.ts`) — but rewriting a
 * recorded measurement to match today's code would turn evidence into decoration.
 *
 * i.e. a JSON **number**. `services/media/src/grant.rs` documents the opposite - "Always a string
 * on the wire, for both variants", serialising `MediaUserId::Legacy(uid)` as `legacy:{uid}`
 * (`grant.rs:348`) with a test asserting `"legacy:4242"` (`grant.rs:1165`) - and that reading was
 * taken as fact here and typed as `string`. It is wrong for what this build actually sends, and
 * the cost was immediate: a string-only decoder returned null for every peer, which silently
 * disabled `startTalking` and the roster avatar lookup and looked exactly like a total regression.
 *
 * So the type admits both, and {@link legacyUserId} decodes both. Whichever form a given build
 * emits, nothing downstream has to care.
 */
export type MediaUserId = number | string | null;

/**
 * The numeric `users.id` behind a wire user id, or null if it is not a legacy id.
 *
 * This room mints `uid: user.id` into the grant (`src/lib/server/media-grant.ts:282`), a SQLite
 * rowid, so every id it sees comes back as `legacy:<rowid>`. A v2 `uuid` id has no numeric form
 * and correctly yields null rather than a coerced 0.
 */
export function legacyUserId(userId: MediaUserId): number | null {
  // A plain number is accepted as well as `legacy:<n>`.
  //
  // The Rust says the wire form is always a string, and reading that was NOT enough: if any build
  // or path hands back a bare number instead, a string-only decoder returns null, and null silently
  // disables everything downstream - no `startTalking`, no roster avatar - which looks exactly like
  // the bug it was meant to fix. Accepting both costs one line and cannot regress either way.
  if (typeof userId === 'number') return Number.isFinite(userId) ? userId : null;
  if (typeof userId !== 'string') return null;
  const match = /^legacy:(\d+)$/.exec(userId);
  if (match) return Number(match[1]);
  // A bare numeric string is still a number.
  return /^\d+$/.test(userId) ? Number(userId) : null;
}

/** One producer as the rest of the room sees it (`server.rs:332-341`, serialised camelCase). */
export type ProducerInfo = {
  producerId: string;
  peerId: string;
  userId: MediaUserId;
  displayName: string | null;
  kind: 'audio' | 'video';
  /**
   * The producing client's own tag, echoed back so a viewer can tell a screen share from a webcam
   * on the same `video` kind (`server.rs:338-339`). The capture puts `{share, screenName}` here
   * (bundle byte 1104332).
   */
  appData: unknown;
};

/** The notification names this build knows. An unrecognised one is reported, never swallowed. */
const KNOWN_NOTIFICATIONS = new Set<string>([
  'connected',
  'newProducer',
  'speechReco',
  'producerPaused',
  'producerResumed',
  'producerClosed',
  'peerClosed'
]);

/** Events this client emits to its owner, beyond the server's own notifications. */
export type SignallingEvents = Notifications & {
  /**
   * The socket is open and usable. Distinct from the server's `connected` notification, which is a
   * frame carrying peer identity - this one is the transport coming up.
   *
   * The captured room turns exactly this into a toast:
   * `appEventBus.subscribe("mediaServerConnected", e => { this.isMediaConnected = !0,
   * this.alertService.success("Connected to Media Server") })`, with the disconnect counterpart
   * calling `alertService.error("Disconnected from Media Server... reconnecting...")`.
   *
   * `reconnected` distinguishes a first connect from a redial: the captured error message ends
   * "reconnecting..." precisely because a redial is expected to follow it.
   */
  socketopen: { reconnected: boolean };
  /** The socket closed. Every in-flight request has already been rejected. */
  disconnected: { code: number; reason: string; willReconnect: boolean };
  /**
   * A frame that could not be correlated to any request: the server's `{"id": null, ...}` refusal
   * of an unparseable envelope (`server.rs:36-42`), a reply whose id we never issued, or a frame
   * that is not JSON at all. Never silently swallowed.
   */
  protocolerror: { message: string; frame: unknown };
};

type Listener<T> = (payload: T) => void;

/** The subset of the DOM `WebSocket` this client uses, so a test can supply a fake. */
export interface SignallingSocket {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number; reason: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

export type SignallingOptions = {
  /**
   * The SFU's WebSocket URL, without the grant. The grant is appended as `?grant=` because the
   * browser cannot set request headers on a WebSocket, so `Authorization:` was never available
   * (`server.rs:112-118`). Every character of the grant's alphabet - base64url plus `.` - is
   * URL-safe, so it survives the query string unescaped and round-trips byte for byte
   * (`server.rs:120-122`).
   */
  url: string;
  /**
   * Fetches a **fresh** admission grant. Called before every connection attempt, including every
   * reconnect, and deliberately not cached: a grant's lifetime is capped at five minutes
   * (`grant.rs:204`, `MAX_GRANT_TTL_SECONDS`), so a reconnect after a long outage must mint a new
   * one rather than replay an expired token and be refused with an opaque 401.
   */
  grant: () => Promise<string>;
  /** Injectable for tests. Defaults to the DOM `WebSocket`. */
  socketFactory?: (url: string) => SignallingSocket;
  /**
   * How long a request may go unanswered before it rejects, in milliseconds.
   *
   * This exists because of a specific bug in the captured client: a malformed `consume` ack leaves
   * its promise permanently unsettled, so the tile never appears and nothing ever reports why
   * (bundle byte 1094980; the server module cites the same thing at `server.rs:39-42`). A timeout
   * turns that class of failure into a rejection the caller can surface. Set to 0 to disable.
   */
  requestTimeoutMs?: number;
  /** Whether a socket that closes should be redialled. */
  reconnect?: boolean;
  /** First reconnect delay in milliseconds; doubles up to {@link maxReconnectDelayMs}. */
  initialReconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  /** Injectable clock for tests. Defaults to `setTimeout`/`clearTimeout`. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** Injectable jitter source in [0, 1). Defaults to `Math.random`. */
  random?: () => number;
};

/** Requests this client may issue, and what each answers with (`server.rs:47-61`). */
export type Commands = {
  /**
   * Named after the mediasoup-client option it feeds - `device.load({ routerRtpCapabilities })` -
   * rather than after the captured ack's `capabilities` key (`server.rs:63-65`).
   */
  getRouterRtpCapabilities: {
    request: void;
    response: { routerRtpCapabilities: RtpCapabilities };
  };
  /**
   * Both flags false is a `badPayload` refusal, not a defaulted direction (`server.rs:2382-2387`),
   * and an unknown extra field is refused too - every request struct on this wire is
   * `deny_unknown_fields` (`server.rs:1245`, `:1252`, `:1259`, `:1271`, `:1279`, `:1285`).
   */
  createWebRtcTransport: {
    request: { producing: boolean; consuming: boolean };
    /** `sctpParameters` is omitted rather than null when SCTP is off (`session.rs:392-399`). */
    response: {
      id: string;
      iceParameters: IceParameters;
      iceCandidates: IceCandidate[];
      dtlsParameters: DtlsParameters;
      sctpParameters?: SctpParameters;
    };
  };
  connectTransport: {
    request: { transportId: string; dtlsParameters: DtlsParameters };
    response: Record<string, never>;
  };
  produce: {
    request: {
      transportId: string;
      kind: MediaKind;
      rtpParameters: RtpParameters;
      /** Optional: a client that omits it gets `null` rather than a refusal (`server.rs:1263-1266`). */
      appData?: Record<string, unknown>;
    };
    response: { id: string };
  };
  /** The reply is `session::ConsumerParameters` (`session.rs:405-415`). Consumers arrive **paused**. */
  consume: {
    request: { transportId: string; producerId: string; rtpCapabilities: RtpCapabilities };
    response: {
      id: string;
      producerId: string;
      kind: MediaKind;
      rtpParameters: RtpParameters;
      type: string;
      producerPaused: boolean;
    };
  };
  resumeConsumer: { request: { consumerId: string }; response: Record<string, never> };
  closeConsumer: { request: { consumerId: string }; response: Record<string, never> };
  closeProducer: { request: { producerId: string }; response: Record<string, never> };
  pauseProducer: { request: { producerId: string }; response: Record<string, never> };
  resumeProducer: { request: { producerId: string }; response: Record<string, never> };
  getProducers: { request: void; response: { producers: ProducerInfo[] } };
  /**
   * One closed-caption result, relayed to the room (`server.rs`, `sendSpeechReco`).
   *
   * `sender` is deliberately NOT in the request: the server fills attribution in from the verified
   * grant, because a peer that could name itself could caption words as anybody in the room.
   */
  sendSpeechReco: {
    request: { text: string; isFinal: boolean; timestamp: number; lang: string };
    response: Record<string, never>;
  };
  /**
   * Restricts a consumer to a spatial/temporal layer of its producer (`server.rs`,
   * `setPreferredLayers`). Beyond the capture, which never calls it: with several screens shared at
   * once every consumer is otherwise forwarded the producer's top layer, so a viewer pays full
   * resolution and decode for screens sitting in background tabs.
   *
   * `temporalLayer` is optional - absent means the producer's maximum, not zero. A layer above what
   * the producer offers is clamped by mediasoup rather than refused, so a caller need not know how
   * the producer encoded.
   */
  setPreferredLayers: {
    request: { consumerId: string; spatialLayer: number; temporalLayer?: number };
    response: Record<string, never>;
  };
  close: { request: void; response: Record<string, never> };
};

export type CommandName = keyof Commands;

type Pending = {
  command: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer?: unknown;
};

/** RFC 6455 §7.4.1 "normal closure" - what this client sends when its owner asks it to stop. */
const CLOSE_NORMAL = 1000;

/**
 * The largest frame the server will accept, from `MAX_MESSAGE_BYTES` (`server.rs:248`).
 *
 * Checked here so an oversized request fails with a legible local error naming the command, rather
 * than as a socket the server closes underneath us mid-handshake. The only payload that gets near
 * it is a `consume` carrying a browser's full `rtpCapabilities`, which is a few kilobytes.
 */
export const MAX_MESSAGE_BYTES = 256 * 1024;

export class SignallingClient {
  #options: Required<
    Pick<
      SignallingOptions,
      | 'requestTimeoutMs'
      | 'reconnect'
      | 'initialReconnectDelayMs'
      | 'maxReconnectDelayMs'
      | 'socketFactory'
      | 'setTimer'
      | 'clearTimer'
      | 'random'
    >
  > &
    SignallingOptions;

  #socket: SignallingSocket | null = null;
  #pending = new Map<number, Pending>();
  #listeners = new Map<string, Set<Listener<never>>>();
  #nextId = 1;
  #attempt = 0;
  #reconnectTimer: unknown = null;
  /** Set by `close()`. A deliberate stop must never be undone by a reconnect timer already armed. */
  #stopped = false;
  #connecting = false;

  constructor(options: SignallingOptions) {
    this.#options = {
      requestTimeoutMs: 15_000,
      reconnect: true,
      initialReconnectDelayMs: 500,
      maxReconnectDelayMs: 30_000,
      socketFactory: (url) => new WebSocket(url) as unknown as SignallingSocket,
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
      random: Math.random,
      ...options
    };
  }

  /** Whether a socket is open right now. */
  get connected(): boolean {
    return this.#socket !== null && this.#socket.readyState === 1;
  }

  /** How many requests are awaiting a reply. Exposed for tests and diagnostics. */
  get pendingCount(): number {
    return this.#pending.size;
  }

  on<K extends keyof SignallingEvents>(
    event: K,
    listener: Listener<SignallingEvents[K]>
  ): () => void {
    let set = this.#listeners.get(event as string);
    if (!set) {
      set = new Set();
      this.#listeners.set(event as string, set);
    }
    set.add(listener as Listener<never>);
    return () => {
      set.delete(listener as Listener<never>);
    };
  }

  #emit<K extends keyof SignallingEvents>(event: K, payload: SignallingEvents[K]): void {
    const set = this.#listeners.get(event as string);
    if (!set) return;
    // Copied before iterating so a listener that unsubscribes itself - which the room UI will,
    // on teardown - cannot mutate the set mid-dispatch.
    for (const listener of [...set]) {
      (listener as Listener<SignallingEvents[K]>)(payload);
    }
  }

  /**
   * Opens the socket. Resolves when it is open, rejects if the first attempt fails.
   *
   * Reconnects after a successful first connection are automatic and do not surface here - the
   * owner learns about them through {@link SignallingEvents.disconnected} and `connected`.
   */
  async connect(): Promise<void> {
    this.#stopped = false;
    if (this.connected || this.#connecting) return;
    await this.#dial();
  }

  async #dial(): Promise<void> {
    this.#connecting = true;
    try {
      // Minted per attempt, never cached: see `SignallingOptions.grant`.
      const grant = await this.#options.grant();
      const url = `${this.#options.url}${this.#options.url.includes('?') ? '&' : '?'}grant=${grant}`;
      const socket = this.#options.socketFactory(url);
      this.#socket = socket;

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        socket.onopen = () => {
          settled = true;
          // `#attempt` is the redial counter, so it is the only thing that still knows whether this
          // open followed a failure. Read it before it is cleared.
          const reconnected = this.#attempt > 0;
          this.#attempt = 0;
          this.#emit('socketopen', { reconnected });
          resolve();
        };
        socket.onerror = (event) => {
          if (settled) return;
          settled = true;
          reject(new SignallingError('clientSocketError', 'the signalling socket failed to open'));
          void event;
        };
        socket.onclose = (event) => {
          // A close before open is a failed dial - most often the server's 401 refusing the
          // grant, which is deliberately opaque on the wire (`server.rs:124-127`).
          if (!settled) {
            settled = true;
            reject(
              new SignallingError(
                'clientRefused',
                `the signalling socket closed before opening (code ${event.code})`
              )
            );
          }
          this.#onClose(event.code, event.reason);
        };
        socket.onmessage = (event) => this.#onMessage(event.data);
      });
    } finally {
      this.#connecting = false;
    }
  }

  #onClose(code: number, reason: string): void {
    this.#socket = null;

    // Every id this client holds is dead on the far side: the server closes the peer's whole
    // `Session` when its socket ends (`server.rs:1024`). Rejecting rather than replaying is the
    // documented choice in this module's header.
    const inFlight = [...this.#pending.values()];
    this.#pending.clear();
    for (const request of inFlight) {
      if (request.timer !== undefined) this.#options.clearTimer(request.timer);
      request.reject(
        new SignallingError(
          'clientDisconnected',
          `the signalling socket closed (code ${code}) before ${request.command} was answered`,
          request.command
        )
      );
    }

    const willReconnect = this.#options.reconnect && !this.#stopped;
    this.#emit('disconnected', { code, reason, willReconnect });
    if (willReconnect) this.#scheduleReconnect();
  }

  /**
   * Exponential backoff with full jitter: delay = random() * min(cap, initial * 2^attempt).
   *
   * Full jitter rather than a fixed doubling because every peer in a room loses its socket at the
   * same instant when the SFU restarts - `serve` broadcasts shutdown to every peer task at once
   * (`server.rs:155-161`) - and an unjittered backoff would have all of them redial in lockstep,
   * repeatedly, against a process that is still starting.
   */
  #scheduleReconnect(): void {
    // Idempotent, and that is load-bearing. A dial that fails *after* the socket exists rejects
    // `#dial` **and** runs `#onClose`, and both paths arm a reconnect - so without this guard one
    // failed attempt would leave two timers armed, the next failure four, and a media host that
    // stays down for a minute would be met by an exponentially growing redial storm rather than a
    // backed-off one. `reconnect_failures_arm_exactly_one_timer` pins it.
    if (this.#reconnectTimer !== null) return;

    const { initialReconnectDelayMs, maxReconnectDelayMs, random, setTimer } = this.#options;
    const ceiling = Math.min(maxReconnectDelayMs, initialReconnectDelayMs * 2 ** this.#attempt);
    this.#attempt += 1;
    const delay = Math.round(random() * ceiling);

    this.#reconnectTimer = setTimer(() => {
      this.#reconnectTimer = null;
      if (this.#stopped) return;
      void this.#dial().catch(() => {
        // A failed redial closes nothing (there is no socket), so `#onClose` will not run and
        // cannot arm the next attempt. Arm it here instead, or one refused grant would end
        // reconnection permanently.
        if (!this.#stopped && this.#options.reconnect) this.#scheduleReconnect();
      });
    }, delay);
  }

  /** The delay ceiling the next reconnect would draw its jitter from. Exposed for tests. */
  reconnectCeilingMs(attempt: number): number {
    return Math.min(
      this.#options.maxReconnectDelayMs,
      this.#options.initialReconnectDelayMs * 2 ** attempt
    );
  }

  #onMessage(raw: unknown): void {
    if (typeof raw !== 'string') {
      // The server sends `Message::Text` only, and refuses binary from us in kind
      // (`server.rs:1002-1006`). Anything else is a proxy or a bug, and is reported, not ignored.
      this.#emit('protocolerror', { message: 'a non-text signalling frame arrived', frame: raw });
      return;
    }

    let frame: unknown;
    try {
      frame = JSON.parse(raw);
    } catch (error) {
      this.#emit('protocolerror', {
        message: `a signalling frame was not JSON: ${(error as Error).message}`,
        frame: raw
      });
      return;
    }

    if (typeof frame !== 'object' || frame === null) {
      this.#emit('protocolerror', { message: 'a signalling frame was not an object', frame });
      return;
    }

    // Dispatch on the presence of `notify`, which is the discriminator the server documents
    // (`server.rs:24-25`) and which a reply can never carry (`server.rs:35`).
    if ('notify' in frame) {
      const { notify, data } = frame as { notify: unknown; data: unknown };
      if (typeof notify !== 'string') {
        this.#emit('protocolerror', { message: 'a notification had no name', frame });
        return;
      }
      if (!KNOWN_NOTIFICATIONS.has(notify)) {
        // A notification this build does not understand is a server/client version skew. It is
        // reported rather than dropped, because dropping it is how a client ends up quietly
        // missing a stream it was told about.
        this.#emit('protocolerror', {
          message: `unknown notification ${JSON.stringify(notify)}`,
          frame
        });
        return;
      }
      this.#emit(notify as keyof SignallingEvents, data as never);
      return;
    }

    const reply = frame as { id?: unknown; ok?: unknown; data?: unknown; error?: unknown };

    // `{"id": null, ...}`: the server could not parse our frame at all, so this cannot be
    // correlated. Surfaced rather than dropped - the whole reason the server bothers to send it.
    if (reply.id === null || reply.id === undefined) {
      const error = reply.error as SignallingErrorPayload | undefined;
      this.#emit('protocolerror', {
        message: error?.message ?? 'the server refused an uncorrelatable frame',
        frame
      });
      return;
    }

    if (typeof reply.id !== 'number') {
      this.#emit('protocolerror', { message: 'a reply id was not a number', frame });
      return;
    }

    const pending = this.#pending.get(reply.id);
    if (!pending) {
      // A reply to a request that already timed out, or an id we never issued.
      this.#emit('protocolerror', {
        message: `a reply arrived for unknown request id ${reply.id}`,
        frame
      });
      return;
    }

    this.#pending.delete(reply.id);
    if (pending.timer !== undefined) this.#options.clearTimer(pending.timer);

    if (reply.ok === true) {
      pending.resolve(reply.data);
      return;
    }

    const error = (reply.error ?? {}) as Partial<SignallingErrorPayload>;
    pending.reject(
      new SignallingError(
        error.code ?? 'internal',
        error.message ?? `${pending.command} was refused`,
        pending.command
      )
    );
  }

  /**
   * Issues one request and resolves with its `data`.
   *
   * @throws {SignallingError} on a server refusal, a closed socket, or a timeout.
   */
  request<K extends CommandName>(
    command: K,
    ...[data]: Commands[K]['request'] extends void ? [] : [Commands[K]['request']]
  ): Promise<Commands[K]['response']> {
    const socket = this.#socket;
    if (!socket || socket.readyState !== 1) {
      return Promise.reject(
        new SignallingError('clientDisconnected', `${command} needs an open socket`, command)
      );
    }

    const id = this.#nextId++;
    // `data` is omitted rather than sent as null when a command takes none: the server's
    // `Request.data` is `#[serde(default)]` over a `serde_json::Value` (`server.rs:1050-1051`).
    const frame = data === undefined ? { id, cmd: command } : { id, cmd: command, data };
    const json = JSON.stringify(frame);

    // Encoded length, not `json.length`. The server's limit is on the frame's **bytes**
    // (`MAX_MESSAGE_BYTES`, `server.rs:248`) and a WebSocket text frame is UTF-8, so a string
    // length - which counts UTF-16 code units - under-counts every non-ASCII character. A display
    // name in Cyrillic or an emoji in `appData` is exactly where that gap opens up.
    const bytes = new TextEncoder().encode(json).length;
    if (bytes > MAX_MESSAGE_BYTES) {
      return Promise.reject(
        new SignallingError(
          'clientFrameTooLarge',
          `the ${command} frame is ${bytes} bytes, over the server's ${MAX_MESSAGE_BYTES} byte limit`,
          command
        )
      );
    }

    return new Promise<Commands[K]['response']>((resolve, reject) => {
      const pending: Pending = {
        command,
        resolve: resolve as (value: unknown) => void,
        reject
      };

      const { requestTimeoutMs, setTimer } = this.#options;
      if (requestTimeoutMs > 0) {
        pending.timer = setTimer(() => {
          this.#pending.delete(id);
          reject(
            new SignallingError(
              'clientTimeout',
              `${command} went unanswered for ${requestTimeoutMs}ms`,
              command
            )
          );
        }, requestTimeoutMs);
      }

      this.#pending.set(id, pending);

      try {
        socket.send(json);
      } catch (error) {
        this.#pending.delete(id);
        if (pending.timer !== undefined) this.#options.clearTimer(pending.timer);
        reject(
          new SignallingError(
            'clientSendFailed',
            `${command} could not be sent: ${(error as Error).message}`,
            command
          )
        );
      }
    });
  }

  /**
   * Stops for good: cancels any armed reconnect, tells the server, and closes the socket.
   *
   * The `close` command is best-effort. The server answers it and then closes the socket itself
   * (`server.rs:1075-1078`), which is tidier than a bare TCP close, but a socket that is already
   * gone is not an error worth propagating out of a teardown path.
   */
  async close(): Promise<void> {
    this.#stopped = true;
    if (this.#reconnectTimer !== null) {
      this.#options.clearTimer(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }

    const socket = this.#socket;
    if (!socket) return;

    if (socket.readyState === 1) {
      try {
        await this.request('close');
      } catch {
        // Already gone, or the server closed the socket before its own reply drained. Either
        // way the intent - stop - is achieved by the close() below.
      }
    }

    try {
      socket.close(CLOSE_NORMAL, 'client closed');
    } catch {
      // Closing an already-closed socket is not a failure.
    }
    this.#socket = null;
  }
}
