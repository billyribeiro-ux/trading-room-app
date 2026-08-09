/* =============================================================================================
 * PTR live media probe — paste into the DevTools console on the real room.
 *
 * Everything this captures is a fact off the wire. It replaces the following, which the decompiled
 * bundle CANNOT answer and which I have so far been inferring:
 *
 *   1. The router's real rtpCapabilities and, critically, its CODEC ORDER.
 *   2. Whether `useSharingSimulcast` actually fires in the deployed build — i.e. what `encodings`
 *      a real screen producer is created with (S3T3 SVC, 2-layer simulcast, or nothing at all).
 *   3. Where `screenName` comes from and what a real value looks like.
 *   4. Every ack payload shape (createWebRtcTransport, connectTransport, produce, consume …).
 *   5. Whether consumers arrive paused.
 *   6. Whether the server pushes anything other than `cmd`.
 *   7. The real `muser` record schema.
 *   8. The negotiated SDP — the ground truth for which codec actually carried the media.
 *
 * ---------------------------------------------------------------------------------------------
 * HOW TO RUN
 *
 *   1. Open the real room, log in, open DevTools → Console.
 *   2. Paste this whole file, press Enter. It prints "probe armed".
 *   3. Force a socket reconnect so the INCOMING frames get hooked too:
 *        DevTools → Network tab → throttling dropdown → "Offline", wait 3s → back to "No throttling"
 *      (Outgoing frames and all WebRTC calls are hooked immediately without this; only the
 *       incoming socket.io direction needs a fresh socket.)
 *   4. Now DO THE THINGS:
 *        • start a screen share, and NAME it something recognisable
 *        • start a SECOND screen share with a different name
 *        • have another presenter share too, if you can
 *        • turn a webcam on, unmute a mic
 *        • watch someone else's screen
 *   5. Run:  __PTR.report()      → prints the answers to the 8 questions above
 *   6. Run:  __PTR.save()        → downloads ptr-media-probe.json with everything raw
 *
 * Nothing is sent anywhere. It only records into a global and writes a file you download.
 * ============================================================================================= */

(() => {
  if (globalThis.__PTR) {
    console.warn('[PTR] probe already installed — skipping re-install');
    return;
  }

  const log = {
    installedAt: new Date().toISOString(),
    href: location.href,
    userAgent: navigator.userAgent,
    /** Outgoing socket.io frames we parsed as `cmd` requests. */
    requests: [],
    /** Incoming socket.io frames: acks and server pushes. */
    incoming: [],
    /** Raw engine.io frames, in case the parse below misses a shape. */
    rawFrames: [],
    /** device.load({ routerRtpCapabilities }) — the codec list AND its order. */
    routerCapabilities: [],
    /** Every transport.produce(...) argument set. */
    produces: [],
    /** Every transport.consume(...) argument set and what came back. */
    consumes: [],
    /** RTCRtpSender.setParameters — the encodings the browser actually applied. */
    senderParameters: [],
    /** Negotiated SDP, the ground truth for codec selection. */
    sdp: [],
    errors: []
  };

  const clip = (value, max = 24000) => {
    try {
      const text = JSON.stringify(value, (_k, v) =>
        v instanceof MediaStreamTrack ? `[MediaStreamTrack ${v.kind} ${v.label}]` : v
      );
      return text && text.length > max
        ? JSON.parse(text.slice(0, max) + '"__TRUNCATED__"')
        : JSON.parse(text);
    } catch (error) {
      return { __unserialisable: String(error) };
    }
  };
  const stamp = () => Number(performance.now().toFixed(1));

  /* ---------------------------------------------------------------------------------------
   * socket.io / engine.io frames.
   *
   * engine.io packet 4 = MESSAGE; socket.io type 2 = EVENT, 3 = ACK. So a request with an ack
   * callback looks like `42<ackId>["cmd",{...}]` and its reply like `43<ackId>[{...}]`.
   * ------------------------------------------------------------------------------------- */
  function parseFrame(raw, direction) {
    if (typeof raw !== 'string') return null;
    const m = /^(\d)(\d)?(\d*)(\[[\s\S]*)$/.exec(raw);
    if (!m || m[1] !== '4') return null;
    const soType = m[2];
    const ackId = m[3] === '' ? null : Number(m[3]);
    let payload;
    try {
      payload = JSON.parse(m[4]);
    } catch {
      return null;
    }
    return { direction, soType, ackId, payload, t: stamp() };
  }

  function recordFrame(raw, direction) {
    if (typeof raw !== 'string' || raw.length > 400000) return;
    log.rawFrames.push({
      direction,
      t: stamp(),
      raw: raw.length > 4000 ? raw.slice(0, 4000) + '…' : raw
    });
    const frame = parseFrame(raw, direction);
    if (!frame) return;

    if (direction === 'out' && frame.soType === '2') {
      const [event, ...args] = frame.payload;
      log.requests.push({
        t: frame.t,
        ackId: frame.ackId,
        event,
        cmd: args?.[0]?.cmd ?? null,
        args: clip(args)
      });
    } else if (direction === 'in') {
      if (frame.soType === '3') {
        log.incoming.push({
          t: frame.t,
          kind: 'ack',
          ackId: frame.ackId,
          data: clip(frame.payload)
        });
      } else if (frame.soType === '2') {
        const [event, ...args] = frame.payload;
        log.incoming.push({ t: frame.t, kind: 'push', event, data: clip(args) });
      }
    }
  }

  // Prototype patch: catches the socket that is ALREADY open, for the outgoing direction.
  const nativeSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data) {
    try {
      recordFrame(data, 'out');
    } catch (error) {
      log.errors.push('send hook: ' + String(error));
    }
    return nativeSend.apply(this, arguments);
  };

  // Constructor patch: catches the NEXT socket, which is the only way to see incoming frames.
  const NativeWebSocket = globalThis.WebSocket;
  function PatchedWebSocket(...args) {
    const socket = new NativeWebSocket(...args);
    socket.addEventListener('message', (event) => {
      try {
        recordFrame(event.data, 'in');
      } catch (error) {
        log.errors.push('message hook: ' + String(error));
      }
    });
    return socket;
  }
  PatchedWebSocket.prototype = NativeWebSocket.prototype;
  Object.assign(PatchedWebSocket, NativeWebSocket);
  globalThis.WebSocket = PatchedWebSocket;

  /* ---------------------------------------------------------------------------------------
   * mediasoup-client. These are prototype-level, so they hook the transports that already exist.
   * mediasoup-client is bundled, so we cannot import its classes — instead we patch the objects
   * the moment the app calls a method on them, by trapping the two RTCPeerConnection entry points
   * and the Device via its `load`.
   * ------------------------------------------------------------------------------------- */
  function hookTransport(transport) {
    if (!transport || transport.__ptrHooked) return transport;
    transport.__ptrHooked = true;

    if (typeof transport.produce === 'function') {
      const produce = transport.produce.bind(transport);
      transport.produce = async (options = {}) => {
        const entry = {
          t: stamp(),
          direction: transport.direction,
          // THE question: is `encodings` present, and is it S3T3 or 2-layer simulcast?
          encodings: clip(options.encodings ?? null),
          codecOptions: clip(options.codecOptions ?? null),
          codec: clip(options.codec ?? null),
          appData: clip(options.appData ?? null), // ← screenName lives here
          trackKind: options.track?.kind ?? null,
          trackLabel: options.track?.label ?? null,
          trackSettings: clip(options.track?.getSettings?.() ?? null)
        };
        log.produces.push(entry);
        const producer = await produce(options);
        entry.producerId = producer?.id ?? null;
        entry.producerKind = producer?.kind ?? null;
        try {
          entry.appliedEncodings = clip(producer?.rtpSender?.getParameters?.()?.encodings ?? null);
        } catch {
          /* getParameters can throw before negotiation */
        }
        return producer;
      };
    }

    if (typeof transport.consume === 'function') {
      const consume = transport.consume.bind(transport);
      transport.consume = async (options = {}) => {
        const entry = { t: stamp(), request: clip(options) };
        log.consumes.push(entry);
        const consumer = await consume(options);
        entry.consumerId = consumer?.id ?? null;
        entry.kind = consumer?.kind ?? null;
        entry.pausedOnArrival = consumer?.paused ?? null; // ← do consumers arrive paused?
        entry.rtpParameters = clip(consumer?.rtpParameters ?? null);
        return consumer;
      };
    }
    return transport;
  }

  function hookDevice(device) {
    if (!device || device.__ptrHooked) return device;
    device.__ptrHooked = true;

    const load = device.load?.bind(device);
    if (load) {
      device.load = async (options = {}) => {
        // THE codec order question, straight from the server.
        log.routerCapabilities.push({
          t: stamp(),
          routerRtpCapabilities: clip(options.routerRtpCapabilities ?? options)
        });
        const result = await load(options);
        try {
          log.routerCapabilities.push({
            t: stamp(),
            deviceRecvRtpCapabilities: clip(device.rtpCapabilities)
          });
        } catch {
          /* older builds */
        }
        return result;
      };
    }
    for (const name of ['createSendTransport', 'createRecvTransport']) {
      const original = device[name]?.bind(device);
      if (!original) continue;
      device[name] = (...args) => {
        log.incoming.push({
          t: stamp(),
          kind: 'transportOptions',
          method: name,
          data: clip(args[0])
        });
        return hookTransport(original(...args));
      };
    }
    return device;
  }

  // The app constructs its Device inside a service we cannot reach by name, so trap it generically:
  // any object that gains a `load` + `createSendTransport` pair is a mediasoup Device.
  const seen = new WeakSet();
  globalThis.__PTR_hook = (candidate) => hookDevice(candidate);
  const objectDefine = Object.defineProperty;
  Object.defineProperty = function (target, prop, descriptor) {
    const result = objectDefine.apply(this, arguments);
    try {
      if (
        target &&
        !seen.has(target) &&
        typeof target === 'object' &&
        typeof target.load === 'function' &&
        typeof target.createSendTransport === 'function'
      ) {
        seen.add(target);
        hookDevice(target);
      }
    } catch {
      /* never break the app */
    }
    return result;
  };

  /* ---------------------------------------------------------------------------------------
   * WebRTC ground truth: the SDP actually negotiated, and the encodings actually applied.
   * ------------------------------------------------------------------------------------- */
  const NativePC = globalThis.RTCPeerConnection;
  if (NativePC) {
    for (const method of ['setLocalDescription', 'setRemoteDescription']) {
      const original = NativePC.prototype[method];
      NativePC.prototype[method] = function (description, ...rest) {
        try {
          const sdp =
            description?.sdp ??
            this[method === 'setLocalDescription' ? 'localDescription' : 'remoteDescription']?.sdp;
          if (sdp) log.sdp.push({ t: stamp(), method, type: description?.type ?? null, sdp });
        } catch (error) {
          log.errors.push(method + ': ' + String(error));
        }
        return original.apply(this, [description, ...rest]);
      };
    }
  }
  if (globalThis.RTCRtpSender) {
    const setParameters = RTCRtpSender.prototype.setParameters;
    RTCRtpSender.prototype.setParameters = function (parameters) {
      try {
        log.senderParameters.push({
          t: stamp(),
          kind: this.track?.kind ?? null,
          encodings: clip(parameters?.encodings ?? null)
        });
      } catch {
        /* ignore */
      }
      return setParameters.apply(this, arguments);
    };
  }

  /* ------------------------------------------------------------------------------------- */
  globalThis.__PTR = {
    log,
    report() {
      const caps = log.routerCapabilities.find(
        (c) => c.routerRtpCapabilities
      )?.routerRtpCapabilities;
      const codecs = caps?.codecs ?? [];
      const video = codecs.filter((c) => (c.kind ?? c.mimeType?.split('/')[0]) === 'video');
      const screens = log.produces.filter((p) => p.appData?.share === true);

      console.group('%c[PTR] live evidence', 'font-weight:bold');
      console.log('1. ROUTER CODEC ORDER (video, as the server sent it):');
      console.table(
        video.map((c, i) => ({
          '#': i,
          mimeType: c.mimeType,
          preferredPayloadType: c.preferredPayloadType
        }))
      );
      console.log(
        '   first video codec =',
        video[0]?.mimeType ?? '(none captured — did device.load run?)'
      );

      console.log('2. SCREEN PRODUCERS — did useSharingSimulcast fire?');
      console.table(
        screens.map((p) => ({
          screenName: p.appData?.screenName,
          encodings: p.encodings ? JSON.stringify(p.encodings) : 'undefined  ← flag was OFF',
          applied: p.appliedEncodings ? JSON.stringify(p.appliedEncodings) : '',
          codecOptions: JSON.stringify(p.codecOptions)
        }))
      );

      console.log(
        '3. screenName values seen:',
        screens.map((p) => p.appData?.screenName)
      );
      console.log('4. ACK SHAPES (cmd → reply keys):');
      const byAck = new Map(
        log.requests.filter((r) => r.ackId != null).map((r) => [r.ackId, r.cmd])
      );
      console.table(
        log.incoming
          .filter((i) => i.kind === 'ack')
          .map((i) => ({
            cmd: byAck.get(i.ackId) ?? '?',
            keys: Object.keys(i.data?.[0] ?? {}).join(', ')
          }))
      );

      console.log(
        '5. CONSUMERS paused on arrival:',
        log.consumes.map((c) => c.pausedOnArrival)
      );
      console.log('6. SERVER PUSH EVENTS (anything other than "cmd"?):', [
        ...new Set(log.incoming.filter((i) => i.kind === 'push').map((i) => i.event))
      ]);
      console.log(
        '7. muser records seen in pushes:',
        clip(log.incoming.filter((i) => i.kind === 'push').slice(0, 3))
      );
      console.log(
        '8. SDP m=video lines (what actually carried the media):',
        log.sdp
          .flatMap((s) =>
            s.sdp.split('\n').filter((l) => /^m=video|^a=rtpmap.*(VP9|VP8|H264)/i.test(l))
          )
          .slice(0, 20)
      );
      console.groupEnd();
      console.log('%crun __PTR.save() to download the full raw capture', 'color:#0a0');
    },
    save(filename = 'ptr-media-probe.json') {
      const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      console.log('[PTR] saved', filename, '—', JSON.stringify(log).length, 'bytes');
    }
  };

  console.log('%c[PTR] probe armed.', 'color:#0a0;font-weight:bold');
  console.log(
    'Now: DevTools → Network → Offline for 3s → back online (hooks the incoming socket).'
  );
  console.log('Then share TWO screens with distinct names, turn on a webcam, and watch someone.');
  console.log('Finally: __PTR.report()  then  __PTR.save()');
})();
