/**
 * mtx-collect.js — capture how the LIVE room handles MediaMTX streams, from the client's side.
 *
 * Paste into the Chrome console on the live protradingroom room. It arms itself, watches, and
 * downloads one JSON file on its own. No terminal, no second paste, no stop().
 *
 * ## What it is for
 *
 * `apps/room/docs/OBS-XSPLIT-INGEST.md` has the whole client contract read out of the bundle. What
 * the bundle CANNOT show is what their server actually puts on the wire:
 *
 *   - the real `muser` object in `mtxStartStream` / `mtxStopStream` — field names AND real values
 *   - the real `getSessionMTXMediaState` list
 *   - what `getRTMPToken` actually returns (is `rtmpToken` a JWT? what claims? what lifetime?)
 *   - the real HLS playlist URL, and whether the playlist request is authorised
 *
 * Every one of those is a value we would otherwise have to invent. This fetches them instead.
 *
 * ## Safety — read this before running it
 *
 *   - It NEVER clicks anything on the denylist, and **"New Link" is on it**. That button calls
 *     `getRTMPToken`, which ROTATES the stream key: pressing it would cut off a presenter who is
 *     live. This script observes; you act.
 *   - It never posts, sends, saves, submits, deletes, uploads, plays or stops anything.
 *   - It REDACTS every credential it sees. Stream keys, Bearer tokens and `?jwt=` values are
 *     replaced with a shape description (`<jwt: 3 parts, alg=HS256, 214 chars>`) so the capture is
 *     useful for format questions without carrying a live publish credential in a file you email.
 *   - It reads. It does not attach to media, does not open a producer, and does not join anything.
 *
 * ## Getting the interesting part
 *
 * `mtxStartStream` only appears when a stream actually starts. So:
 *
 *   1. Paste this in the room's console FIRST. It says "armed" and waits.
 *   2. THEN start an OBS/XSplit stream into the room (or have a presenter do it).
 *   3. It downloads by itself when the window closes.
 *
 * If nothing streams during the window, it still downloads — and says plainly in `gaps` that no
 * stream event was seen. An empty result that says so is worth more than a full one that guessed.
 */
(async () => {
  const WINDOW_MS = 180000; // 3 minutes. Long enough to start OBS after pasting.
  const HTML_CAP = 60000;

  const log = {
    meta: {},
    role: {},
    steps: [],
    /** The three server commands, as they actually arrive. This is the prize. */
    /*
      `framesSeen` counts EVERY frame the hooks observed; `frames` keeps only the MTX-related ones.

      Both are needed to read the result honestly. With only `frames`, an empty array has two
      completely different meanings — a quiet room with the hooks working, or hooks that never
      attached to the transport actually in use — and they call for opposite next steps. This was a
      real defect in the first version of this collector: it reported `frames: 0` for a run whose
      socket was never wrapped, and that read as evidence about the app.
    */
    wire: { frames: [], framesSeen: 0, attachedVia: null, socketsSeen: 0 },
    globals: {},
    /** Every `.m3u8` / `.ts` / whip / rtmp URL the page actually requested. */
    network: [],
    /** Rendered DOM + computed styles for the stream tabs, the player, and the OBS panel. */
    states: {},
    gaps: []
  };

  const started = new Date().toISOString();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const trim = (s, cap = 20000) =>
    typeof s === 'string' && s.length > cap ? s.slice(0, cap) + `…[+${s.length - cap}]` : s;
  const gap = (what, why) => log.gaps.push({ what, why });
  const note = (step, detail) => {
    log.steps.push({ at: new Date().toISOString(), step, detail });
    console.log(`[mtx] ${step}${detail ? ' — ' + detail : ''}`);
  };

  /* ─────────────────────────────────────────────────────────────────────────────
     REDACTION. Runs over every string that leaves this page.

     A stream key is a live publish credential and an HLS `?jwt=` is a live read credential. The
     questions we actually have are about SHAPE — is it a JWT, what claims, how long does it live —
     and shape survives redaction. The secret does not need to.
     ───────────────────────────────────────────────────────────────────────────── */
  const describeJwt = (value) => {
    const parts = value.split('.');
    if (parts.length !== 3) return `<opaque token: ${value.length} chars>`;
    let header = '?';
    let claims = '?';
    try {
      header = JSON.stringify(JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'))));
    } catch {
      /* not base64 JSON — say so rather than guess */
    }
    try {
      const body = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      // Claim NAMES and non-secret values only. `sub` can be a path, which is safe and useful.
      claims = JSON.stringify(
        Object.fromEntries(
          Object.entries(body).map(([k, v]) => [
            k,
            typeof v === 'number' || typeof v === 'boolean' ? v : String(v).slice(0, 64)
          ])
        )
      );
    } catch {
      /* opaque body */
    }
    return `<jwt: header=${header} claims=${claims} len=${value.length}>`;
  };

  const TOKENISH = /([?&](?:jwt|token|key|secret)=)([^&\s"']+)/gi;
  const redact = (input) => {
    if (typeof input !== 'string') return input;
    let out = input.replace(TOKENISH, (_, prefix, value) => prefix + describeJwt(value));
    // Bare JWTs sitting in a field on their own.
    out = out.replace(/\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, (m) =>
      describeJwt(m)
    );
    return out;
  };
  const redactDeep = (value, depth = 0) => {
    if (depth > 6) return '<max depth>';
    if (typeof value === 'string') return redact(value);
    if (Array.isArray(value)) return value.map((v) => redactDeep(v, depth + 1));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = /token|key|secret|jwt|password|pw$/i.test(k)
          ? typeof v === 'string'
            ? describeJwt(v)
            : '<redacted>'
          : redactDeep(v, depth + 1);
      }
      return out;
    }
    return value;
  };

  /* ── the guard. Checked before every single click. ───────────────────────── */
  const FORBIDDEN =
    /new link|delete|upload|remove|\bplay\b|\bstop\b|send|save|submit|post|kick|ban|mute|reset|start|enable|disable|clear/i;
  const clickSafe = (el, why) => {
    if (!el) return false;
    const fingerprint = [
      el.getAttribute?.('title') ?? '',
      el.className ?? '',
      el.id ?? '',
      (el.textContent ?? '').slice(0, 60)
    ].join(' ');
    if (FORBIDDEN.test(fingerprint)) {
      note('REFUSED to click', `${why} — denylist: "${fingerprint.trim().slice(0, 70)}"`);
      return false;
    }
    if (el.type === 'submit' || el.tagName === 'FORM') {
      note('REFUSED to click', `${why} — is a submit`);
      return false;
    }
    const r = el.getBoundingClientRect();
    const [cx, cy] = [r.left + r.width / 2, r.top + r.height / 2];
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      el.dispatchEvent(
        new MouseEvent(type, { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window })
      );
    }
    return true;
  };

  const byText = (sel, re) =>
    [...document.querySelectorAll(sel)].find((e) => re.test(e.textContent || ''));

  const STYLE_PROPS = [
    'display',
    'position',
    'backgroundColor',
    'color',
    'width',
    'height',
    'objectFit',
    'borderRadius',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'padding',
    'margin',
    'overflowY'
  ];

  /** Markup + computed styles + the stylesheet rules that actually matched. */
  const snap = (el) => {
    if (!el) return null;
    const computed = getComputedStyle(el);
    const styles = Object.fromEntries(STYLE_PROPS.map((p) => [p, computed[p]]));
    let matched = [];
    try {
      // Proves "this class has no rule" rather than leaving it assumed.
      for (const sheet of document.styleSheets) {
        let rules;
        try {
          rules = sheet.cssRules;
        } catch {
          continue; // cross-origin sheet
        }
        for (const rule of rules ?? []) {
          if (rule.selectorText && el.matches(rule.selectorText)) {
            matched.push(rule.cssText.slice(0, 300));
          }
        }
      }
    } catch {
      /* ignore */
    }
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      className: el.className || null,
      attrs: Object.fromEntries([...el.attributes].map((a) => [a.name, redact(a.value)])),
      text: trim(redact((el.textContent || '').trim()), 2000),
      html: trim(redact(el.outerHTML), HTML_CAP),
      styles,
      matchedRules: matched.slice(0, 40)
    };
  };

  /* ─────────────────────────────────────────────────────────────────────────────
     1. WIRE CAPTURE — the whole point.

     `handleServerCmd` dispatches `mtxStartStream`, `mtxStopStream` and `getSessionMTXMediaState`
     off the socket. We wrap the socket to see the frames that carry them.

     A socket is ALREADY OPEN by the time this is pasted, and a console script cannot retroactively
     wrap listeners that are already registered. So three approaches are tried and whichever worked
     is recorded in `wire.attachedVia` — if none did, that is an honest gap, not a silent empty list.
     ───────────────────────────────────────────────────────────────────────────── */
  const INTERESTING = /mtxStartStream|mtxStopStream|getSessionMTXMediaState|roomMediaStateMTX|rtmpToken|streamServerMTX|mtxToken/;

  const recordFrame = (direction, raw, via) => {
    let text = typeof raw === 'string' ? raw : null;
    if (!text) return;
    // Counted BEFORE the filter, and that order is the whole point: this is what separates
    // "nothing MTX happened" from "these hooks saw nothing at all".
    log.wire.framesSeen += 1;
    if (!INTERESTING.test(text)) return; // keep the file about MTX, not the whole chat
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // socket.io frames are prefixed with a numeric packet type — strip it and retry.
      const brace = text.indexOf('[');
      if (brace > -1) {
        try {
          parsed = JSON.parse(text.slice(brace));
        } catch {
          /* leave null */
        }
      }
    }
    log.wire.frames.push({
      at: new Date().toISOString(),
      direction,
      via,
      parsed: parsed ? redactDeep(parsed) : null,
      raw: parsed ? null : trim(redact(text), 4000)
    });
    note('captured frame', `${direction} via ${via}`);
  };

  // (a) any socket opened from now on — covers the app's own reconnects.
  try {
    const NativeWebSocket = window.WebSocket;
    const Wrapped = function (...args) {
      const socket = new NativeWebSocket(...args);
      log.wire.socketsSeen += 1;
      log.wire.attachedVia = log.wire.attachedVia || 'constructor-wrap';
      socket.addEventListener('message', (event) => recordFrame('in', event.data, 'constructor'));
      const nativeSend = socket.send.bind(socket);
      socket.send = (data) => {
        recordFrame('out', typeof data === 'string' ? data : null, 'constructor');
        return nativeSend(data);
      };
      return socket;
    };
    Wrapped.prototype = NativeWebSocket.prototype;
    // Copied one at a time, not with Object.assign: CONNECTING/OPEN/CLOSING/CLOSED are
    // non-writable on the native constructor, and a bulk assign throws in strict mode — which
    // would take the whole capture down before it started.
    for (const key of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) {
      try {
        Object.defineProperty(Wrapped, key, { value: NativeWebSocket[key], enumerable: true });
      } catch {
        /* a missing constant is not worth failing the capture over */
      }
    }
    window.WebSocket = Wrapped;
    note('armed', 'WebSocket constructor wrapped (captures reconnects)');
  } catch (error) {
    gap('WebSocket constructor wrap', String(error));
  }

  // (b) outbound on the ALREADY-OPEN socket — prototype patch works retroactively for send.
  try {
    const protoSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function (data) {
      recordFrame('out', typeof data === 'string' ? data : null, 'prototype');
      log.wire.attachedVia = log.wire.attachedVia || 'prototype-send';
      return protoSend.call(this, data);
    };
    note('armed', 'WebSocket.prototype.send patched (captures the live socket outbound)');
  } catch (error) {
    gap('WebSocket.prototype.send patch', String(error));
  }

  /*
    (c) INBOUND on the socket that is ALREADY OPEN — the one that actually matters.

    `mtxStartStream` arrives inbound, and by the time this is pasted the app's socket is long since
    open with its listeners already registered. Wrapping `addEventListener` now is useless: it only
    affects listeners added afterwards.

    So instead of intercepting the socket, intercept the ENVELOPE. Every inbound frame is delivered
    as a `MessageEvent`, and the app must read `event.data` to do anything with it. `data` is an
    accessor on `MessageEvent.prototype`, so replacing that accessor with one that records and then
    delegates catches every frame on every socket, including ones opened before this ran.

    It is a read-through, not a replacement: the original getter's value is returned untouched, so
    the app behaves exactly as before.
  */
  try {
    const descriptor = Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'data');
    if (descriptor && typeof descriptor.get === 'function') {
      const nativeGet = descriptor.get;
      Object.defineProperty(MessageEvent.prototype, 'data', {
        configurable: true,
        enumerable: descriptor.enumerable,
        get() {
          const value = nativeGet.call(this);
          try {
            if (typeof value === 'string') recordFrame('in', value, 'MessageEvent.data');
          } catch {
            /* never let the capture break the page */
          }
          return value;
        }
      });
      log.wire.attachedVia = log.wire.attachedVia || 'MessageEvent.data';
      note('armed', 'MessageEvent.data wrapped — captures the already-open socket inbound');
    } else {
      gap(
        'inbound frames',
        'MessageEvent.prototype.data is not a configurable accessor in this browser, so inbound ' +
          'frames can only be caught if the socket reconnects during the window.'
      );
    }
  } catch (error) {
    gap('MessageEvent.data wrap', String(error));
  }

  /* ── 2. meta + role ──────────────────────────────────────────────────────── */
  log.meta = {
    started,
    href: redact(location.href),
    userAgent: navigator.userAgent,
    windowMs: WINDOW_MS
  };

  const canSeeSessionControl = !!byText('a,button', /Session Control/i);
  const canUpload = !!document.querySelector('#fupload, input[type=file]');
  log.role = { canSeeSessionControl, canUpload };
  const role = canSeeSessionControl || canUpload ? 'presenter' : 'member';
  note('role detected', role);

  /* ── 3. globals the room keeps, redacted ─────────────────────────────────── */
  try {
    const g = window.appService?.globals ?? window.globals ?? null;
    if (g) {
      log.globals = redactDeep({
        sessionID: g.sessionID,
        streamServerMTX: g.streamServerMTX,
        streamServer: g.streamServer,
        mtxToken: g.mtxToken,
        roomMediaStateMTX: g.roomMediaStateMTX,
        useMediaMTX: g.sessData?.useMediaMTX,
        obsStreamKey: g.sessData?.obsStreamKey
      });
      note('globals captured', 'from appService.globals');
    } else {
      gap(
        'globals',
        'appService.globals is not on `window`. The `muser` shape can still be recovered from ' +
          'wire.frames and from the rendered stream tabs below.'
      );
    }
  } catch (error) {
    gap('globals', String(error));
  }

  /* ── 4. what the page actually fetched — the playback path, proven ───────── */
  const collectNetwork = () => {
    try {
      for (const entry of performance.getEntriesByType('resource')) {
        if (!/\.m3u8|\.ts(\?|$)|whip|\/index\.m3u8|rtmp/i.test(entry.name)) continue;
        const already = log.network.some((n) => n.url === redact(entry.name));
        if (already) continue;
        log.network.push({
          url: redact(entry.name),
          initiatorType: entry.initiatorType,
          startTime: Math.round(entry.startTime),
          duration: Math.round(entry.duration),
          transferSize: entry.transferSize ?? null
        });
      }
    } catch (error) {
      gap('resource timing', String(error));
    }
  };
  collectNetwork();

  /* ── 5. the rendered stream area, if anything is streaming ───────────────── */
  const captureStreamArea = () => {
    log.states.streamTabs = [...document.querySelectorAll('[id$="-tab"]')]
      .filter((el) => /stream/i.test(el.id) || el.closest('#presAreaTabs-streams'))
      .map(snap)
      .slice(0, 20);
    log.states.streamingViews = [...document.querySelectorAll('app-streaming-view')]
      .map(snap)
      .slice(0, 8);
    log.states.videos = [...document.querySelectorAll('video')].slice(0, 8).map((v) => ({
      ...snap(v),
      currentSrc: redact(v.currentSrc || ''),
      readyState: v.readyState,
      paused: v.paused,
      videoWidth: v.videoWidth,
      videoHeight: v.videoHeight
    }));
    log.states.noOneStreaming = !!byText('h3', /No one is streaming right now/i);
  };
  captureStreamArea();

  /* ── 6. the OBS panel, WITHOUT touching New Link ─────────────────────────── */
  if (role === 'presenter') {
    const sessionControl = byText('a,button', /Session Control/i);
    if (clickSafe(sessionControl, 'open Session Control')) {
      await wait(700);
      const streamingTab = byText('a', /Streaming|Stream RTMP/i);
      if (clickSafe(streamingTab, 'open the streaming tab')) {
        await wait(500);
        const obsTab = document.querySelector('#obs-streaming-tab');
        clickSafe(obsTab, 'open the OBS pane');
        await wait(500);
        log.states.obsPanel = {
          pane: snap(document.querySelector('#obs-streaming')),
          streamingLinkRtmp: snap(document.querySelector('#streaming-link-rtmp')),
          streamingLink: snap(document.querySelector('#streaming-link')),
          bearer: snap(document.querySelector('#stream-whip-key')),
          radios: [...document.querySelectorAll('#streaming-rtmp, #streaming-whip')].map(snap)
        };
        note('OBS panel captured', 'values redacted; New Link deliberately NOT pressed');
      } else {
        gap('OBS panel', 'the streaming tab was not found or was refused by the denylist');
      }
    } else {
      gap('OBS panel', 'Session Control was not reachable for this role');
    }
  } else {
    gap('OBS panel', `role detected as ${role}; the OBS panel is presenter-only`);
  }

  /* ── 7. watch ────────────────────────────────────────────────────────────── */
  note('watching', `${WINDOW_MS / 1000}s — START THE OBS STREAM NOW to capture mtxStartStream`);
  const poll = setInterval(() => {
    collectNetwork();
    captureStreamArea();
  }, 5000);
  await wait(WINDOW_MS);
  clearInterval(poll);
  collectNetwork();
  captureStreamArea();

  /* ── 8. honest absences, then download ───────────────────────────────────── */
  if (log.wire.frames.length === 0) {
    gap(
      'mtxStartStream / mtxStopStream / getSessionMTXMediaState',
      log.wire.framesSeen === 0
        ? 'the hooks saw ZERO frames of any kind, so this run is evidence about the COLLECTOR, not ' +
          'about MTX. The listener never attached to the socket actually in use. Reload the page, ' +
          're-paste this script IMMEDIATELY, then start the stream.'
        : `the hooks saw ${log.wire.framesSeen} frames and none of them were MTX-related, so the ` +
          'socket was wrapped correctly and no stream started during the window. Start a stream ' +
          'while this is running.'
    );
  }
  if (log.network.length === 0) {
    gap('HLS playback', 'no .m3u8 or .ts request was observed — nothing was playing during the window');
  }
  if (!log.states.streamingViews?.length) {
    gap('app-streaming-view', 'the element never rendered, so no player DOM or styles were captured');
  }

  log.meta.finished = new Date().toISOString();

  const name = `mtx-${role}-${started.slice(0, 19).replace(/[:T]/g, '-')}.json`;
  const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();

  console.log(
    [
      '',
      `[mtx] downloaded ${name}`,
      `  role         : ${role}`,
      `  wire frames  : ${log.wire.frames.length} MTX of ${log.wire.framesSeen} seen (attached via ${log.wire.attachedVia ?? 'nothing'})`,
      log.wire.framesSeen === 0
        ? '  ^^ ZERO frames of ANY kind: the hooks saw no traffic, so this run says nothing about MTX.'
        : '',
      `  network      : ${log.network.length} playlist/segment requests`,
      `  gaps         : ${log.gaps.length}`,
      '',
      'Credentials are redacted to shape only. Send me the file.'
    ].join('\n')
  );
})();
