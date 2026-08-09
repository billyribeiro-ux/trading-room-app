/* =============================================================================================
 * PTR MEMBER DUMP — paste into the DevTools console. It downloads by itself.
 *
 * Built for a MEMBER account. Everything needed is read off the CONSUMER side, because a member
 * never produces:
 *
 *   router codec ORDER        every peer calls getRouterRtpCapabilities, member included
 *   producer encodings        the consumer's rtpParameters carry the producer's scalabilityMode,
 *                             so watching a screen reveals whether the sender used S3T3 SVC,
 *                             2-layer simulcast, or no encodings at all
 *   consumers paused?         the member creates them
 *   every ack payload shape   the member issues the same commands
 *   which codec carried media the member's recv SDP
 *   screenName, muser schema  arrive in consume / server-push payloads
 *
 * WORKS WITH ZERO INTERACTION. If you do nothing it still captures the DOM, the socket frames and
 * the router capabilities. If you click a screen tab to watch someone, it also captures the
 * consumer evidence, which is the richer half.
 *
 * PASTE. WAIT. IT DOWNLOADS.
 *   change the window:  __PTR.finishIn(180)
 *   grab it early:      __PTR.save()
 * ============================================================================================= */

(() => {
  if (globalThis.__PTR) {
    console.warn('[PTR] already armed — __PTR.save() to download now');
    return;
  }

  const SECONDS = 75;
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

  const d = {
    meta: {
      armedAt: new Date().toISOString(),
      href: location.href,
      title: document.title,
      userAgent: navigator.userAgent,
      viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio }
    },
    requests: [],
    incoming: [],
    rawFrames: [],
    routerCapabilities: [],
    produces: [],
    consumes: [],
    senderParameters: [],
    sdp: [],
    nodes: [],
    extracted: {},
    stylesheets: [],
    consoleErrors: [],
    errors: []
  };

  const t = () => Number(performance.now().toFixed(1));
  const safe = (v, max = 20000) => {
    try {
      const s = JSON.stringify(v, (_k, x) =>
        x instanceof MediaStreamTrack ? `[track ${x.kind} ${x.label}]` : x
      );
      return s === undefined
        ? null
        : JSON.parse(s.length > max ? s.slice(0, max) + '"__TRUNCATED__"' : s);
    } catch (e) {
      return { __unserialisable: String(e) };
    }
  };

  /* ------------------------------------------------------- socket.io, both directions -------- */
  let live = null;
  const parse = (raw) => {
    if (typeof raw !== 'string') return null;
    const m = /^(4)(\d)?(\d*)(\[[\s\S]*)$/.exec(raw);
    if (!m) return null;
    try {
      return { so: m[2], ack: m[3] === '' ? null : Number(m[3]), payload: JSON.parse(m[4]) };
    } catch {
      return null;
    }
  };
  const rec = (raw, dir) => {
    if (typeof raw !== 'string' || raw.length > 500000) return;
    d.rawFrames.push({ dir, t: t(), raw: raw.length > 3000 ? raw.slice(0, 3000) + '…' : raw });
    const f = parse(raw);
    if (!f) return;
    if (dir === 'out' && f.so === '2') {
      const [event, ...args] = f.payload;
      d.requests.push({ t: t(), ack: f.ack, event, cmd: args?.[0]?.cmd ?? null, args: safe(args) });
    } else if (dir === 'in') {
      if (f.so === '3') d.incoming.push({ t: t(), kind: 'ack', ack: f.ack, data: safe(f.payload) });
      else if (f.so === '2') {
        const [event, ...args] = f.payload;
        d.incoming.push({ t: t(), kind: 'push', event, data: safe(args) });
      }
    }
  };

  const nativeSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data) {
    if (!live) live = this;
    try {
      rec(data, 'out');
    } catch (e) {
      d.errors.push('send:' + e);
    }
    return nativeSend.apply(this, arguments);
  };
  const NativeWS = globalThis.WebSocket;
  function PatchedWS(...a) {
    const ws = new NativeWS(...a);
    live = ws;
    ws.addEventListener('message', (ev) => {
      try {
        rec(ev.data, 'in');
      } catch (e) {
        d.errors.push('recv:' + e);
      }
    });
    return ws;
  }
  PatchedWS.prototype = NativeWS.prototype;
  Object.assign(PatchedWS, NativeWS);
  globalThis.WebSocket = PatchedWS;

  /* --------------------------------------------------------------- mediasoup-client ---------- */
  const hookTransport = (tr) => {
    if (!tr || tr.__ptr) return tr;
    tr.__ptr = true;
    if (typeof tr.consume === 'function') {
      const consume = tr.consume.bind(tr);
      tr.consume = async (o = {}) => {
        const e = { t: t(), request: safe(o) };
        d.consumes.push(e);
        const c = await consume(o);
        e.consumerId = c?.id ?? null;
        e.kind = c?.kind ?? null;
        e.pausedOnArrival = c?.paused ?? null;
        // THE producer-side answer, visible from the receiving end:
        e.rtpParameters = safe(c?.rtpParameters ?? null);
        e.encodingsFromProducer = safe(c?.rtpParameters?.encodings ?? null);
        e.appDataFromProducer = safe(o?.appData ?? null);
        return c;
      };
    }
    if (typeof tr.produce === 'function') {
      const produce = tr.produce.bind(tr);
      tr.produce = async (o = {}) => {
        d.produces.push({
          t: t(),
          encodings: safe(o.encodings ?? null),
          codecOptions: safe(o.codecOptions ?? null),
          appData: safe(o.appData ?? null),
          trackKind: o.track?.kind ?? null
        });
        return produce(o);
      };
    }
    return tr;
  };
  const hookDevice = (dev) => {
    if (!dev || dev.__ptr) return dev;
    dev.__ptr = true;
    const load = dev.load?.bind(dev);
    if (load)
      dev.load = async (o = {}) => {
        d.routerCapabilities.push({
          t: t(),
          routerRtpCapabilities: safe(o.routerRtpCapabilities ?? o)
        });
        const r = await load(o);
        try {
          d.routerCapabilities.push({
            t: t(),
            deviceRecvRtpCapabilities: safe(dev.rtpCapabilities)
          });
        } catch {}
        return r;
      };
    for (const m of ['createSendTransport', 'createRecvTransport']) {
      const orig = dev[m]?.bind(dev);
      if (orig)
        dev[m] = (...a) => {
          d.incoming.push({ t: t(), kind: 'transportOptions', method: m, data: safe(a[0]) });
          return hookTransport(orig(...a));
        };
    }
    return dev;
  };
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

  /* --------------------------------------------------------------- WebRTC ground truth ------- */
  if (globalThis.RTCPeerConnection) {
    for (const m of ['setLocalDescription', 'setRemoteDescription']) {
      const orig = RTCPeerConnection.prototype[m];
      RTCPeerConnection.prototype[m] = function (desc, ...rest) {
        try {
          if (desc?.sdp) d.sdp.push({ t: t(), method: m, type: desc.type, sdp: desc.sdp });
        } catch {}
        return orig.apply(this, [desc, ...rest]);
      };
    }
  }
  const nativeErr = console.error;
  console.error = function (...a) {
    try {
      d.consoleErrors.push({ t: t(), args: a.map(String).slice(0, 6) });
    } catch {}
    return nativeErr.apply(this, a);
  };

  /* --------------------------------------------------------------------------- DOM + CSS ---- */
  function snapshot() {
    d.nodes = [];
    for (const el of document.querySelectorAll('*')) {
      let rect = null;
      const style = {};
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
      } catch {}
      const attrs = {};
      for (const a of el.attributes || []) attrs[a.name] = a.value;
      const text = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.nodeValue.trim())
        .filter(Boolean)
        .join(' ');
      d.nodes.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        class: typeof el.className === 'string' && el.className ? el.className : undefined,
        text: text || undefined,
        rect,
        attrs,
        style
      });
    }

    // FULL rule text, not just custom properties — this is what the repo's decoders consume.
    d.stylesheets = [];
    for (const sheet of document.styleSheets) {
      try {
        const rules = [];
        for (const rule of sheet.cssRules || [])
          rules.push({ type: rule.type, cssText: rule.cssText });
        d.stylesheets.push({ href: sheet.href, ruleCount: rules.length, rules });
      } catch (e) {
        d.stylesheets.push({ href: sheet.href, crossOrigin: true, error: String(e) });
      }
    }

    const all = (sel, fn) => [...document.querySelectorAll(sel)].map(fn);
    d.extracted = {
      screenTabs: all('#screenTabs li.nav-item', (li) => ({
        outerHTML: li.outerHTML,
        label: li.querySelector('span.mx-1')?.textContent ?? null,
        anchorId: li.querySelector('a.nav-link')?.id ?? null,
        ariaControls: li.querySelector('a.nav-link')?.getAttribute('aria-controls') ?? null,
        ariaSelected: li.querySelector('a.nav-link')?.getAttribute('aria-selected') ?? null,
        tabindex: li.querySelector('a.nav-link')?.getAttribute('tabindex') ?? null,
        classes: li.querySelector('a.nav-link')?.className ?? null,
        hasEyeBadge: !!li.querySelector('i.fa-eye'),
        eyeTooltip: li.querySelector('[tooltip]')?.getAttribute('tooltip') ?? null,
        avatar: li.querySelector('img.presenter-img')?.getAttribute('src') ?? null,
        menuItems: [...li.querySelectorAll('.dropdown-item')].map((a) => a.textContent.trim()),
        menuOpen: !!li.querySelector('.dropdown-menu.show')
      })),
      alertQaButtons: all('button.alert-qa', (b) => ({
        class: b.className,
        text: b.textContent.trim(),
        inlineStyle: b.getAttribute('style'),
        isFlashing: b.classList.contains('btn-danger') && b.classList.contains('flash')
      })),
      videos: all('video', (v) => ({
        id: v.id,
        class: v.className,
        hasSrcObject: !!v.srcObject,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        paused: v.paused
      })),
      audios: all('audio', (a) => ({ id: a.id, hasSrcObject: !!a.srcObject })),
      navbar: all('#navbarsRoom li.nav-item', (li) => ({
        title: li.getAttribute('title'),
        text: li.textContent.trim().slice(0, 60)
      })),
      roster: all('.room-roster li, .active-room-users li', (li) =>
        li.textContent.trim().slice(0, 140)
      ),
      openModals: all('.modal.show', (m) => ({
        id: m.id,
        class: m.className,
        outerHTML: m.outerHTML.slice(0, 20000)
      }))
    };
    d.meta.capabilities = {
      postAlert: !!document.querySelector('a i.fa-plus-circle, [title*="Post Alert" i]'),
      screenShare: !!document.querySelector('[title*="Screen Sharing" i]'),
      recording: !!document.querySelector('[title*="Recording" i]'),
      microphone: !!document.querySelector('[title*="Microphone" i]'),
      webcam: !!document.querySelector('[title*="WebCam" i]'),
      sessionControl: !!document.querySelector('[title*="Session Control" i]')
    };
    d.meta.roleGuess =
      d.meta.capabilities.postAlert || d.meta.capabilities.screenShare
        ? 'presenter-or-admin'
        : 'member';
  }

  function save() {
    snapshot();
    d.meta.savedAt = new Date().toISOString();
    const name = `ptr-dump-${d.meta.roleGuess}-${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(d)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    console.log(
      `%c[PTR] ${name} — ${(blob.size / 1048576).toFixed(1)} MB`,
      'color:#0a0;font-weight:bold'
    );
    console.log(
      `  frames ${d.rawFrames.length} · routerCaps ${d.routerCapabilities.length} · consumes ${d.consumes.length} · sdp ${d.sdp.length} · sheets ${d.stylesheets.length}`
    );
    return name;
  }

  let timer = null;
  const finishIn = (s) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, s * 1000);
    console.log(`[PTR] downloads automatically in ${s}s`);
  };

  globalThis.__PTR = { d, save, finishIn };

  console.log(
    '%c[PTR] armed. Click a screen tab to watch someone — that is what captures the media evidence.',
    'color:#0a0;font-weight:bold'
  );
  // Re-hook the socket so incoming acks are visible. socket.io reconnects after an unclean close.
  setTimeout(() => {
    try {
      if (live?.readyState === 1) {
        live.close(4000, 'ptr-rehook');
        console.log('[PTR] re-hooking socket…');
      }
    } catch (e) {
      d.errors.push('rehook:' + e);
    }
  }, 1200);
  finishIn(SECONDS);
})();
