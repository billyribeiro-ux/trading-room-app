/* =============================================================================================
 * PTR AUTO-DUMP — paste once into the DevTools console on the real room. That is the whole job.
 *
 * It arms itself, forces the socket to reconnect so it can see BOTH directions, records everything
 * while you use the room, and then downloads the file on its own. No Network-tab fiddling, no
 * remembering to call anything, and it does not care whether you are a member, a presenter or an
 * admin — it captures whatever that role can actually see.
 *
 * WHAT COMES OUT (ptr-dump-<role>-<time>.json):
 *   • socket.io frames, BOTH directions, parsed into requests / acks / server pushes
 *   • router rtpCapabilities exactly as the server sent them, codec ORDER preserved
 *   • every produce(): its encodings, codecOptions and appData (so: screenName, and whether
 *     useSharingSimulcast actually fired in production)
 *   • every consume(): the request, the reply, and whether the consumer arrived paused
 *   • the negotiated SDP — ground truth for which codec really carried the media
 *   • two full DOM snapshots (armed, and again at the end) with rects + computed styles
 *   • the screen tabs, alert Q&A buttons and roster, extracted and labelled
 *
 * USAGE:  paste. Use the room normally for ~90s — share a screen or two, name them, open the
 *         gear menu, watch someone. The file downloads by itself when the timer ends.
 *
 * Change the window:  __PTR.finishIn(180)   ← seconds
 * Grab it early:      __PTR.save()
 * ============================================================================================= */

(() => {
  if (globalThis.__PTR) {
    console.warn('[PTR] already armed — call __PTR.save() to download now');
    return;
  }

  const CAPTURE_SECONDS = 90;

  /** Computed properties worth keeping. The full set would be ~300 per node and gigabytes overall. */
  const STYLE_PROPS = [
    'display',
    'visibility',
    'opacity',
    'position',
    'z-index',
    'overflow',
    'overflow-y',
    'width',
    'height',
    'min-height',
    'max-height',
    'flex',
    'flex-direction',
    'align-items',
    'justify-content',
    'gap',
    'margin',
    'padding',
    'border',
    'border-radius',
    'border-color',
    'color',
    'background-color',
    'background-image',
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'text-align',
    'white-space',
    'animation',
    'transform',
    'box-shadow',
    'filter'
  ];

  const dump = {
    meta: {
      armedAt: new Date().toISOString(),
      href: location.href,
      userAgent: navigator.userAgent,
      viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
      role: 'unknown'
    },
    requests: [],
    incoming: [],
    rawFrames: [],
    routerCapabilities: [],
    produces: [],
    consumes: [],
    senderParameters: [],
    sdp: [],
    domSnapshots: [],
    extracted: {},
    consoleErrors: [],
    errors: []
  };

  const t = () => Number(performance.now().toFixed(1));
  const safe = (value, max = 20000) => {
    try {
      const s = JSON.stringify(value, (_k, v) =>
        v instanceof MediaStreamTrack ? `[track ${v.kind} ${v.label}]` : v
      );
      return s === undefined
        ? null
        : JSON.parse(s.length > max ? s.slice(0, max) + '"__TRUNCATED__"' : s);
    } catch (e) {
      return { __unserialisable: String(e) };
    }
  };

  /* ---------------------------------------------------------------- role, without guessing ---- */
  function detectRole() {
    const hasPostAlert = !!document.querySelector('a i.fa-plus-circle, [title*="Post Alert" i]');
    const hasScreenShare = !!document.querySelector('[title*="Screen Sharing" i]');
    const hasRecording = !!document.querySelector('[title*="Recording" i]');
    // Reported as observed capabilities rather than a label, so it cannot be wrong.
    return {
      hasPostAlert,
      hasScreenShare,
      hasRecording,
      guess: hasPostAlert || hasScreenShare ? 'presenter-or-admin' : 'member'
    };
  }

  /* ---------------------------------------------------------------- socket.io frame capture ---- */
  let liveSocket = null;

  function parseFrame(raw) {
    if (typeof raw !== 'string') return null;
    const m = /^(4)(\d)?(\d*)(\[[\s\S]*)$/.exec(raw);
    if (!m) return null;
    try {
      return { soType: m[2], ackId: m[3] === '' ? null : Number(m[3]), payload: JSON.parse(m[4]) };
    } catch {
      return null;
    }
  }

  function record(raw, direction) {
    if (typeof raw !== 'string' || raw.length > 500000) return;
    dump.rawFrames.push({
      direction,
      t: t(),
      raw: raw.length > 3000 ? raw.slice(0, 3000) + '…' : raw
    });
    const f = parseFrame(raw);
    if (!f) return;
    if (direction === 'out' && f.soType === '2') {
      const [event, ...args] = f.payload;
      dump.requests.push({
        t: t(),
        ackId: f.ackId,
        event,
        cmd: args?.[0]?.cmd ?? null,
        args: safe(args)
      });
    } else if (direction === 'in') {
      if (f.soType === '3')
        dump.incoming.push({ t: t(), kind: 'ack', ackId: f.ackId, data: safe(f.payload) });
      else if (f.soType === '2') {
        const [event, ...args] = f.payload;
        dump.incoming.push({ t: t(), kind: 'push', event, data: safe(args) });
      }
    }
  }

  // Prototype patch — hooks the socket that is ALREADY open, and hands us a reference to it so we
  // can close it and let socket.io rebuild one through the patched constructor below.
  const nativeSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data) {
    if (!liveSocket) liveSocket = this;
    try {
      record(data, 'out');
    } catch (e) {
      dump.errors.push('send: ' + e);
    }
    return nativeSend.apply(this, arguments);
  };

  const NativeWS = globalThis.WebSocket;
  function PatchedWS(...args) {
    const ws = new NativeWS(...args);
    liveSocket = ws;
    ws.addEventListener('message', (ev) => {
      try {
        record(ev.data, 'in');
      } catch (e) {
        dump.errors.push('recv: ' + e);
      }
    });
    return ws;
  }
  PatchedWS.prototype = NativeWS.prototype;
  Object.assign(PatchedWS, NativeWS);
  globalThis.WebSocket = PatchedWS;

  /**
   * Force the reconnect automatically.
   *
   * Incoming frames can only be hooked on a socket we construct, and the app's socket is already
   * open by the time this runs. socket.io reconnects on its own after an unclean close, so closing
   * it with 4000 (an application code, not 1000) makes it rebuild through PatchedWS within a second
   * or two. Nothing in the room is lost: the app treats it as an ordinary blip.
   */
  function forceReconnect() {
    const target = liveSocket;
    if (!target || target.readyState !== 1) return false;
    try {
      target.close(4000, 'ptr-probe-rehook');
      console.log('[PTR] closed the live socket to re-hook it; socket.io will reconnect');
      return true;
    } catch (e) {
      dump.errors.push('forceReconnect: ' + e);
      return false;
    }
  }

  /* -------------------------------------------------------------------- mediasoup-client -------- */
  function hookTransport(tr) {
    if (!tr || tr.__ptr) return tr;
    tr.__ptr = true;
    if (typeof tr.produce === 'function') {
      const produce = tr.produce.bind(tr);
      tr.produce = async (o = {}) => {
        const e = {
          t: t(),
          direction: tr.direction,
          encodings: safe(o.encodings ?? null), // undefined here ⇒ useSharingSimulcast was OFF
          codecOptions: safe(o.codecOptions ?? null),
          codec: safe(o.codec ?? null),
          appData: safe(o.appData ?? null), // screenName lives here
          trackKind: o.track?.kind ?? null,
          trackSettings: safe(o.track?.getSettings?.() ?? null)
        };
        dump.produces.push(e);
        const p = await produce(o);
        e.producerId = p?.id ?? null;
        try {
          e.appliedEncodings = safe(p?.rtpSender?.getParameters?.()?.encodings ?? null);
        } catch {}
        return p;
      };
    }
    if (typeof tr.consume === 'function') {
      const consume = tr.consume.bind(tr);
      tr.consume = async (o = {}) => {
        const e = { t: t(), request: safe(o) };
        dump.consumes.push(e);
        const c = await consume(o);
        e.consumerId = c?.id ?? null;
        e.kind = c?.kind ?? null;
        e.pausedOnArrival = c?.paused ?? null;
        e.rtpParameters = safe(c?.rtpParameters ?? null);
        return c;
      };
    }
    return tr;
  }

  function hookDevice(d) {
    if (!d || d.__ptr) return d;
    d.__ptr = true;
    const load = d.load?.bind(d);
    if (load)
      d.load = async (o = {}) => {
        dump.routerCapabilities.push({
          t: t(),
          routerRtpCapabilities: safe(o.routerRtpCapabilities ?? o)
        });
        const r = await load(o);
        try {
          dump.routerCapabilities.push({
            t: t(),
            deviceRecvRtpCapabilities: safe(d.rtpCapabilities)
          });
        } catch {}
        return r;
      };
    for (const m of ['createSendTransport', 'createRecvTransport']) {
      const orig = d[m]?.bind(d);
      if (orig)
        d[m] = (...a) => {
          dump.incoming.push({ t: t(), kind: 'transportOptions', method: m, data: safe(a[0]) });
          return hookTransport(orig(...a));
        };
    }
    return d;
  }

  // The Device is built inside a service we cannot name, so trap it structurally.
  const seen = new WeakSet();
  const nativeDefine = Object.defineProperty;
  Object.defineProperty = function (target, prop, desc) {
    const out = nativeDefine.apply(this, arguments);
    try {
      if (
        target &&
        typeof target === 'object' &&
        !seen.has(target) &&
        typeof target.load === 'function' &&
        typeof target.createSendTransport === 'function'
      ) {
        seen.add(target);
        hookDevice(target);
      }
    } catch {}
    return out;
  };

  /* -------------------------------------------------------------------- WebRTC ground truth ---- */
  if (globalThis.RTCPeerConnection) {
    for (const m of ['setLocalDescription', 'setRemoteDescription']) {
      const orig = RTCPeerConnection.prototype[m];
      RTCPeerConnection.prototype[m] = function (d, ...rest) {
        try {
          if (d?.sdp) dump.sdp.push({ t: t(), method: m, type: d.type, sdp: d.sdp });
        } catch {}
        return orig.apply(this, [d, ...rest]);
      };
    }
  }
  if (globalThis.RTCRtpSender) {
    const sp = RTCRtpSender.prototype.setParameters;
    RTCRtpSender.prototype.setParameters = function (p) {
      try {
        dump.senderParameters.push({
          t: t(),
          kind: this.track?.kind ?? null,
          encodings: safe(p?.encodings ?? null)
        });
      } catch {}
      return sp.apply(this, arguments);
    };
  }

  const nativeError = console.error;
  console.error = function (...a) {
    try {
      dump.consoleErrors.push({ t: t(), args: a.map((x) => String(x)).slice(0, 6) });
    } catch {}
    return nativeError.apply(this, a);
  };

  /* ---------------------------------------------------------------------------- DOM capture ---- */
  function snapshotDom(label) {
    const nodes = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      let rect,
        style = {};
      try {
        const r = el.getBoundingClientRect();
        rect = {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height)
        };
        const cs = getComputedStyle(el);
        for (const p of STYLE_PROPS) style[p] = cs.getPropertyValue(p);
      } catch {
        rect = null;
      }
      const attrs = {};
      for (const a of el.attributes || []) attrs[a.name] = a.value;
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.nodeValue.trim())
        .filter(Boolean)
        .join(' ');
      nodes.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        class: el.className && typeof el.className === 'string' ? el.className : undefined,
        text: own || undefined,
        rect,
        attrs,
        style
      });
    }
    dump.domSnapshots.push({ label, at: new Date().toISOString(), count: nodes.length, nodes });
    return nodes.length;
  }

  function extractSurfaces() {
    const grab = (sel, fn) => [...document.querySelectorAll(sel)].map(fn);
    dump.extracted = {
      screenTabs: grab('#screenTabs li.nav-item', (li) => ({
        html: li.outerHTML.slice(0, 4000),
        label: li.querySelector('span.mx-1')?.textContent ?? null,
        anchorId: li.querySelector('a.nav-link')?.id ?? null,
        active: !!li.querySelector('a.nav-link.active'),
        ariaSelected: li.querySelector('a.nav-link')?.getAttribute('aria-selected') ?? null,
        tabIndex: li.querySelector('a.nav-link')?.getAttribute('tabindex') ?? null,
        menuItems: [...li.querySelectorAll('.dropdown-item')].map((a) => a.textContent.trim())
      })),
      alertQaButtons: grab('button.alert-qa', (b) => ({
        class: b.className,
        text: b.textContent.trim(),
        style: b.getAttribute('style')
      })),
      rosterEntries: grab('.room-roster li, .active-room-users li', (li) =>
        li.textContent.trim().slice(0, 120)
      ),
      videos: grab('video', (v) => ({
        id: v.id,
        class: v.className,
        hasSrcObject: !!v.srcObject,
        w: v.videoWidth,
        h: v.videoHeight
      })),
      navbarControls: grab(
        '#navbarsRoom li.nav-item',
        (li) => li.getAttribute('title') || li.textContent.trim().slice(0, 40)
      )
    };
  }

  /* -------------------------------------------------------------------------------- output ---- */
  function save() {
    try {
      extractSurfaces();
    } catch (e) {
      dump.errors.push('extract: ' + e);
    }
    dump.meta.role = detectRole();
    dump.meta.savedAt = new Date().toISOString();
    const name = `ptr-dump-${dump.meta.role.guess}-${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(dump)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    console.log(
      `%c[PTR] downloaded ${name} — ${(blob.size / 1048576).toFixed(1)} MB`,
      'color:#0a0;font-weight:bold'
    );
    console.log(
      `   frames ${dump.rawFrames.length} · produces ${dump.produces.length} · consumes ${dump.consumes.length} · sdp ${dump.sdp.length} · dom ${dump.domSnapshots.length}`
    );
    return name;
  }

  let timer = null;
  function finishIn(seconds) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      snapshotDom('final');
      save();
    }, seconds * 1000);
    console.log(`[PTR] will download automatically in ${seconds}s — use the room now.`);
  }

  globalThis.__PTR = { dump, save, finishIn, forceReconnect, snapshotDom };

  /* --------------------------------------------------------------------------------- arm it ---- */
  console.log('%c[PTR] armed — capturing. Just use the room.', 'color:#0a0;font-weight:bold');
  snapshotDom('armed');
  // Give the send-hook a moment to catch a frame so we hold a socket reference, then re-hook.
  setTimeout(() => {
    if (!forceReconnect()) {
      console.log('[PTR] no live socket seen yet; incoming frames hook on the next reconnect.');
    }
  }, 1500);
  finishIn(CAPTURE_SECONDS);
})();
