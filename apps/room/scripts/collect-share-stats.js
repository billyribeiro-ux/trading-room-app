/*
  collect-share-stats.js — what the encoder actually spends on a real screen share.

  ## Why this exists

  `docs/streaming-choices.md` rows 2, 6 and 8 are all hypotheses, and they are all settled by the
  same measurement: what the SENDING side reports while a member is watching. Until that exists,
  changing any of them is guessing with a confident tone.

  The doc's own 525 kbps figure is not the real number and says so: headless `getDisplayMedia`
  returns Chrome's synthetic test pattern, a smooth gradient that is nearly free to compress. On
  realistic content the same settings spent 3841 kbps. **The content is the variable that matters.**

  ## What you need — and it is all one person

  Two SEPARATE browser sessions, because the room counts them as two participants:

    1. PRESENTER — a normal window. Log in, enter the room, and share a REAL screen: a chart, a
       terminal, a trading platform. Not a blank page and not a solid colour.
    2. MEMBER    — an incognito window, a different browser, or a second device. Enter the SAME
       room and leave it open so it is receiving the share.

  Two tabs in one window is NOT enough. The encoder only spends bits when something is consuming
  them, so a share with nobody watching measures nothing.

  ## How to run it

  1. In the PRESENTER window, open DevTools -> Console and paste this WHOLE file. Press Enter.
     **Paste it BEFORE you start sharing** — it hooks `RTCPeerConnection` at construction, and a
     connection created before the hook is invisible to it.
  2. Start the screen share.
  3. Have the MEMBER window join and confirm the share is visible there.
  4. Leave both alone for ~30 seconds while it samples.
  5. It downloads `share-stats-<timestamp>.json` on its own.

  It reads statistics and nothing else: no clicks, no settings changed, no network requests of its
  own, nothing sent anywhere. The file lands in your Downloads folder for you to hand back.
*/

(async () => {
  'use strict';

  const SAMPLE_EVERY_MS = 1000;
  const SAMPLES = 30;

  const out = {
    tool: 'collect-share-stats',
    version: 1,
    capturedAt: new Date().toISOString(),
    href: location.href,
    userAgent: navigator.userAgent,
    /** Filled from the outbound video track once one exists. */
    track: null,
    samples: [],
    notes: []
  };

  const note = (message) => {
    out.notes.push(message);
    console.warn('[note]', message);
  };

  /*
    Hook the constructor rather than hunting for the app's own reference.

    The room holds its peer connections inside `MediaSession`, which is a module-scoped closure —
    not reachable from the console. Recording every connection at construction is both simpler and
    more honest: it cannot miss one, and it needs to know nothing about the app's internals.
  */
  const connections = new Set();
  const Native = window.RTCPeerConnection;
  if (!Native) {
    console.error('This browser has no RTCPeerConnection; nothing to measure.');
    return;
  }

  function Patched(...args) {
    const pc = new Native(...args);
    connections.add(pc);
    return pc;
  }
  Patched.prototype = Native.prototype;
  Object.setPrototypeOf(Patched, Native);
  window.RTCPeerConnection = Patched;

  console.log(
    '%cReady. Now START THE SCREEN SHARE, and make sure the member window is watching it.',
    'font-weight:bold'
  );
  console.log(`Sampling every ${SAMPLE_EVERY_MS}ms for ${SAMPLES} samples once video is outbound.`);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** The outbound VIDEO stats from whichever connection is currently sending some. */
  async function readOutboundVideo() {
    for (const pc of connections) {
      let report;
      try {
        report = await pc.getStats();
      } catch {
        continue;
      }

      for (const entry of report.values()) {
        if (entry.type !== 'outbound-rtp' || entry.kind !== 'video') continue;
        if (!entry.bytesSent) continue;

        // The codec and the limitation durations live in sibling entries.
        let codec = null;
        let limitation = null;
        for (const other of report.values()) {
          if (other.type === 'codec' && other.id === entry.codecId) codec = other.mimeType;
          if (other.type === 'outbound-rtp' && other.id === entry.id) {
            limitation = other.qualityLimitationDurations ?? null;
          }
        }
        return { entry, codec, limitation };
      }
    }
    return null;
  }

  // Wait for a share to start, rather than assuming one already has.
  let first = null;
  for (let waited = 0; waited < 180; waited++) {
    first = await readOutboundVideo();
    if (first) break;
    if (waited === 10) console.log('Still waiting for an outbound video track — start the share.');
    await sleep(1000);
  }

  if (!first) {
    note('No outbound video after 3 minutes. Was the screen share started in THIS window?');
    console.error('Nothing to measure. Re-run, then start the share.');
    return;
  }

  out.track = {
    codec: first.codec,
    frameWidth: first.entry.frameWidth ?? null,
    frameHeight: first.entry.frameHeight ?? null,
    scalabilityMode: first.entry.scalabilityMode ?? null,
    encoderImplementation: first.entry.encoderImplementation ?? null,
    contentHint: (() => {
      // The thing rows 2 and 8 are about. Read from the live track, not assumed.
      for (const pc of connections) {
        for (const sender of pc.getSenders?.() ?? []) {
          if (sender.track && sender.track.kind === 'video') return sender.track.contentHint ?? '';
        }
      }
      return null;
    })()
  };
  console.log('Outbound video found:', out.track);

  let previous = null;
  for (let i = 0; i < SAMPLES; i++) {
    const now = await readOutboundVideo();
    if (!now) {
      note(`Sample ${i}: the outbound track disappeared — did the share stop?`);
      break;
    }

    const e = now.entry;
    const sample = {
      at: new Date().toISOString(),
      bytesSent: e.bytesSent,
      packetsSent: e.packetsSent,
      framesPerSecond: e.framesPerSecond ?? null,
      frameWidth: e.frameWidth ?? null,
      frameHeight: e.frameHeight ?? null,
      framesEncoded: e.framesEncoded ?? null,
      totalEncodeTime: e.totalEncodeTime ?? null,
      qualityLimitationReason: e.qualityLimitationReason ?? null,
      qualityLimitationDurations: now.limitation,
      /** The number this whole exercise is for. */
      kbpsSinceLastSample: previous
        ? Math.round(((e.bytesSent - previous.bytesSent) * 8) / 1000 / (SAMPLE_EVERY_MS / 1000))
        : null
    };
    out.samples.push(sample);
    if (sample.kbpsSinceLastSample !== null) {
      console.log(
        `  ${i}: ${sample.kbpsSinceLastSample} kbps  ${sample.frameWidth}x${sample.frameHeight}@${sample.framesPerSecond}  limited=${sample.qualityLimitationReason}`
      );
    }
    previous = e;
    await sleep(SAMPLE_EVERY_MS);
  }

  const rates = out.samples.map((s) => s.kbpsSinceLastSample).filter((n) => typeof n === 'number');
  out.summary = rates.length
    ? {
        samples: rates.length,
        medianKbps: rates.slice().sort((a, b) => a - b)[Math.floor(rates.length / 2)],
        meanKbps: Math.round(rates.reduce((a, b) => a + b, 0) / rates.length),
        maxKbps: Math.max(...rates),
        minKbps: Math.min(...rates),
        /*
          If this is `none` throughout, nothing is throttling — which is the finding that reframes
          rows 2, 6 and 8: the encoder has room and is choosing not to use it, so the lever is
          telling it what the content IS, not lifting a limit.
        */
        limitationReasons: [...new Set(out.samples.map((s) => s.qualityLimitationReason))]
      }
    : null;

  if (out.summary) console.table(out.summary);
  if (!rates.length) note('No rate samples were produced; the share may have stopped immediately.');

  // Put the constructor back, so the page is exactly as it was.
  window.RTCPeerConnection = Native;

  const json = JSON.stringify(out, null, 2);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = `share-stats-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  console.log(`%cDONE — share-stats-${stamp}.json downloaded.`, 'font-weight:bold');
})();
