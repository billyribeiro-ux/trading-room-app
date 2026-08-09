/**
 * Two-browser proof that a shared screen actually reaches a viewer.
 *
 *   node scripts/media-screenshare-e2e.mjs
 *
 * Needs the app on :5190 and services/media on :4443 with a matching grant keypair.
 *
 * A presenter clicks the room's own screen-share control; a member must end up with a <video>
 * carrying real dimensions and an advancing currentTime. Nothing is stubbed on the app side - the
 * click drives startScreenSharing, which drives produceScreen, the SFU, newProducer, consume and
 * srcObject.
 *
 * getUserMedia/getDisplayMedia ARE replaced, and deliberately: Chrome's fake device reports a live
 * 640x480@20 track in headless while delivering zero frames to the encoder (media-source frames: 0,
 * outbound-rtp bytes: 0). A canvas genuinely produces frames, so the harness supplies pixels and
 * everything downstream is the real implementation.
 */
// Two browsers. One produces a synthetic screen track, the other must end up with a <video>
// carrying real frame data - videoWidth/Height non-zero and currentTime advancing.
import { handoffUrl, roomJwtSecret } from './lib/enter-room.mjs';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
// Override with BASE=... to point at a dev server or another instance.
const BASE = process.env.BASE ?? 'http://localhost:5190';
async function browser(port, profile) {
  rmSync(profile, { recursive: true, force: true });
  const proc = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      `--remote-debugging-port=${port}`,
      '--headless=new',
      '--no-first-run',
      '--disable-gpu',
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--auto-select-desktop-capture-source=Entire screen',
      '--window-size=1512,900',
      `--user-data-dir=${profile}`,
      'about:blank'
    ],
    { stdio: 'ignore', detached: true }
  );
  let ver;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) {
        ver = await r.json();
        break;
      }
    } catch {}
    await sleep(200);
  }
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.addEventListener('open', r, { once: true });
    ws.addEventListener('error', j, { once: true });
  });
  let id = 0;
  const p = new Map();
  const logs = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type))
      logs.push(
        m.params.type +
          ': ' +
          m.params.args
            .map((a) => a.value ?? a.description ?? '')
            .join(' ')
            .slice(0, 200)
      );
    if (m.method === 'Runtime.exceptionThrown')
      logs.push(
        'EXC: ' +
          String(
            m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text
          ).slice(0, 220)
      );
    if (m.id === undefined) return;
    const x = p.get(m.id);
    p.delete(m.id);
    m.error ? x.reject(new Error(JSON.stringify(m.error))) : x.resolve(m.result);
  });
  const send = (me, pa = {}, s) => {
    const i = ++id;
    return new Promise((res, rej) => {
      p.set(i, { resolve: res, reject: rej });
      ws.send(JSON.stringify({ id: i, method: me, params: pa, ...(s ? { sessionId: s } : {}) }));
    });
  };
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send(
    'Page.addScriptToEvaluateOnNewDocument',
    {
      source: `
    // Chrome's fake device reports a live 640x480@20 track but delivers ZERO frames to the encoder
    // in headless (media-source frames: 0). A canvas genuinely produces frames, so the app's own
    // getUserMedia path is exercised with a source that exists.
    (() => {
      // 2560x1440, not 640x360. A small canvas fits any pane and would let the clipping bug pass
      // unnoticed; a real screen share is the sharer's full desktop resolution, which is the whole
      // reason the video needs bounding.
      const c = Object.assign(document.createElement('canvas'), {width:2560, height:1440});
      const ctx = c.getContext('2d'); let f = 0;
      setInterval(() => { f++;
        ctx.fillStyle = f % 2 ? '#0a6db1' : '#45a2ff'; ctx.fillRect(0,0,2560,1440);
        ctx.fillStyle = '#fff'; ctx.font = '160px sans-serif'; ctx.fillText('FRAME ' + f, 120, 700);
      }, 66);
      const stream = c.captureStream(15);
      navigator.mediaDevices.getUserMedia = async () => stream.clone();
      navigator.mediaDevices.getDisplayMedia = async () => stream.clone();
    })();
    window.__pcs=[];const N=window.RTCPeerConnection;
    window.RTCPeerConnection=function(...a){const pc=new N(...a);window.__pcs.push(pc);return pc;};
    window.RTCPeerConnection.prototype=N.prototype;Object.assign(window.RTCPeerConnection,N);
  `
    },
    sessionId
  );
  await send(
    'Emulation.setDeviceMetricsOverride',
    { width: 1512, height: 900, deviceScaleFactor: 1, mobile: false },
    sessionId
  );
  const ev = async (e) => {
    const { result } = await send(
      'Runtime.evaluate',
      { expression: e, returnByValue: true, awaitPromise: true },
      sessionId
    );
    return result.value;
  };
  return {
    ev,
    send,
    sessionId,
    logs,
    kill: () => {
      ws.close();
      process.kill(-proc.pid, 'SIGKILL');
      rmSync(profile, { recursive: true, force: true });
    }
  };
}
/*
  Entry is a handoff from the controller now; the room's own login is gone.

  `type` matters here in a way it did not with passwords: the presenter needs `site`, which the
  room maps to staff, and the member needs `guest`. Giving both the same token would make this
  probe's two browsers indistinguishable, which is the one thing it is testing.
*/
const SECRET = roomJwtSecret();
async function login(b, email, type = 'site') {
  await b.send(
    'Page.navigate',
    { url: handoffUrl({ base: BASE, email, type, secret: SECRET }) },
    b.sessionId
  );
  await sleep(7000);
}
/*
  The two accounts, from the environment.

  They were two real addresses in the source — personal data that followed every clone. A probe
  that drives a live room needs accounts that exist in THAT room, so a hardcoded default would be
  wrong everywhere except one machine. Fails loud rather than substituting one.
*/
const need = (name) => {
  const value = process.env[name];
  if (!value) {
    console.error(
      `${name} is not set.\n\n` +
        '  PTR_PRESENTER_EMAIL=… PTR_MEMBER_EMAIL=… node scripts/media-screenshare-e2e.mjs'
    );
    process.exit(1);
  }
  return value;
};

const pres = await browser(9570, '/tmp/e2e-p');
const memb = await browser(9571, '/tmp/e2e-m');
await login(pres, need('PTR_PRESENTER_EMAIL'));
await login(memb, need('PTR_MEMBER_EMAIL'), 'guest');
console.log('both logged in');
console.log(
  'member tabs before:',
  await memb.ev(`document.querySelectorAll('#screenTabs li.nav-item').length`)
);

// Presenter produces a synthetic screen track through its own MediaSession.
const produced = await pres.ev(`(() => {
  const toggle = document.getElementById('dropdownScreenSharing');
  if (!toggle) return 'no screen-share control (not a presenter?)';
  toggle.click();
  const item = [...document.querySelectorAll('li[title]')]
    .find(li => (li.getAttribute('title')||'') === 'OBS');
  if (!item) return 'menu did not open';
  item.click();
  return 'clicked OBS (naming prompt -> produce)';
})()`);
console.log('presenter:', produced);

// The capture asks "Name for this screen ?" BEFORE anything is captured, prefilled with
// `Screen ${size+1}`. Confirming is the "Press OK for default" path its own title describes.
await sleep(800);
const named = await pres.ev(`(() => {
  const input = document.querySelector('.bootbox input[type="text"], .bootbox-input, .bootbox input');
  if (!input) return 'NO PROMPT - the naming step did not appear';
  const prefill = input.value;
  const ok = [...document.querySelectorAll('.bootbox button')]
    .find(b => /ok|confirm/i.test(b.textContent || ''));
  if (!ok) return 'prompt has no confirm button';
  ok.click();
  return 'accepted the default name: ' + JSON.stringify(prefill);
})()`);
console.log('presenter:', named);
for (const t of [4, 8, 12]) {
  await sleep(4000);
  console.log(
    `  +${t}s member:`,
    await memb.ev(`(()=>{
    const tabs=[...document.querySelectorAll('#screenTabs span.mx-1')].map(s=>s.textContent);
    const v=document.querySelector('#screensTabsContent video');
    return JSON.stringify({tabs, video: v?{id:v.id, w:v.videoWidth, h:v.videoHeight,
      t:+v.currentTime.toFixed(2), paused:v.paused, hasSrc:!!v.srcObject}:null});})()`)
  );
}
// A SECOND screen from the same presenter, which is what the naming prompt advertises ("You can
// share multiple screens from the same room and name each one here").
//
// The regression this guards is silent by construction: starting a second share used to stop the
// first screen's track while leaving its producer open, so viewers kept a tab whose <video> was
// unpaused and whose track still read readyState "live" - with no frame ever arriving again.
// Nothing throws, nothing logs. The only way to catch it is to watch currentTime on BOTH.
console.log('\n--- second screen from the same presenter ---');
await sleep(4000);
await pres.ev(`(() => {
  document.getElementById('dropdownScreenSharing')?.click();
  [...document.querySelectorAll('li[title]')]
    .find(li => (li.getAttribute('title')||'') === 'OBS')?.click();
})()`);
await sleep(800);
console.log(
  'presenter:',
  await pres.ev(`(() => {
  const input = document.querySelector('.bootbox input[type="text"], .bootbox-input, .bootbox input');
  if (!input) return 'NO PROMPT on the second share';
  const prefill = input.value;
  [...document.querySelectorAll('.bootbox button')]
    .find(b => /ok|confirm/i.test(b.textContent || ''))?.click();
  return 'second screen named: ' + JSON.stringify(prefill) + ' (expected "Screen 2")';
})()`)
);
await sleep(7000);

// videoWidth and currentTime stay perfectly valid inside a pane that is display:none, so they
// prove the media is flowing and NOTHING about whether anyone can see it. That gap let a bug ship
// where every screen rendered into a hidden tab. Geometry is the assertion that matters.
const sampleVideos = () =>
  memb.ev(`JSON.stringify(
  [...document.querySelectorAll('#screensTabsContent video')].map(v => {
    const r = v.getBoundingClientRect();
    return {
      id: v.id.slice(-8), t: +v.currentTime.toFixed(2),
      live: v.srcObject ? v.srcObject.getVideoTracks().map(t=>t.readyState).join(',') : 'none',
      w: Math.round(r.width), h: Math.round(r.height),
      onscreen: r.width > 0 && r.height > 0 && v.offsetParent !== null
    };
  }))`);
const before = JSON.parse(await sampleVideos());
await sleep(3000);
const after = JSON.parse(await sampleVideos());

console.log(
  'member tabs:',
  await memb.ev(`JSON.stringify(
  [...document.querySelectorAll('#screenTabs span.mx-1')].map(s=>s.textContent))`)
);

// The presentation area must actually be showing Screens. This is what "nothing renders" was:
// the screens, their tabs and their video all existed inside a pane hidden behind the Notes tab.
const area = JSON.parse(
  await memb.ev(`(()=>{
  const pane = document.getElementById('screens');
  const tabsVisible = [...document.querySelectorAll('#screenTabs li.nav-item')]
    .filter(li => li.getBoundingClientRect().width > 0).length;
  const r = pane ? pane.getBoundingClientRect() : null;
  return JSON.stringify({
    activeMainTab: document.querySelector('#mainTabs .nav-link.active')?.textContent.trim(),
    screensPaneVisible: !!pane && r.width > 0 && r.height > 0 && pane.offsetParent !== null,
    visibleScreenTabs: tabsVisible
  });})()`)
);
console.log('presentation area:', JSON.stringify(area));

// The clipping bug: with no width rule, a full-resolution capture laid itself out at its intrinsic
// width inside a much narrower pane and the overflow was cut off.
const fit = JSON.parse(
  await memb.ev(`(()=>{
  const v=[...document.querySelectorAll('#screensTabsContent video')].find(v=>v.offsetParent!==null);
  if(!v) return JSON.stringify({found:false});
  const vr=v.getBoundingClientRect(), cr=v.parentElement.getBoundingClientRect();
  return JSON.stringify({found:true, videoW:Math.round(vr.width), containerW:Math.round(cr.width),
    intrinsicW:v.videoWidth, overflows: vr.width > cr.width + 1});})()`)
);
console.log('screen fit:', JSON.stringify(fit));
console.log(
  fit.found && !fit.overflows
    ? 'PASS  the screen fits its container instead of being cut off'
    : `FAIL  video ${fit.videoW}px in a ${fit.containerW}px container - overflowing`
);
const onscreen = after.filter((v) => v.onscreen).length;
console.log(
  // One on-screen video, not two: these are tab panes, so only the SELECTED screen is shown.
  area.screensPaneVisible && area.visibleScreenTabs === 2 && onscreen === 1
    ? 'PASS  the presentation area shows both named tabs with the selected screen visible'
    : `FAIL  paneVisible=${area.screensPaneVisible} visibleTabs=${area.visibleScreenTabs} onscreenVideos=${onscreen} - expected true/2/1`
);
let frozen = 0;
for (const first of before) {
  const later = after.find((v) => v.id === first.id);
  const advancing = later && later.t > first.t;
  if (!advancing) frozen += 1;
  console.log(
    `  ${first.id}: ${first.t} -> ${later?.t}  ${advancing ? 'ADVANCING' : 'FROZEN'}  track=${later?.live}`
  );
}
console.log(
  before.length === 2 && frozen === 0
    ? 'PASS  both screens are live'
    : `FAIL  ${before.length} screen(s), ${frozen} frozen - expected 2 and 0`
);

// The presenter must see their OWN screens too. The capture adds a local stream for the sharer
// (`addLocalStream(r)`) and selects that tab 500ms later - it never consumes its own producer,
// which the server refuses anyway. Before this, a presenter sharing two screens saw no tabs at all.
const ownTabs = JSON.parse(
  await pres.ev(`JSON.stringify(
  [...document.querySelectorAll('#screenTabs span.mx-1')].map(s=>s.textContent))`)
);
const ownVideo = JSON.parse(
  await pres.ev(`JSON.stringify(
  [...document.querySelectorAll('#screensTabsContent video')].map(v => ({
    t: +v.currentTime.toFixed(2), w: v.videoWidth, hasSrc: !!v.srcObject })))`)
);
console.log('presenter own tabs:', JSON.stringify(ownTabs));
console.log('presenter own video:', JSON.stringify(ownVideo));
const ownPlaying = ownVideo.filter((v) => v.hasSrc && v.w > 0).length;
console.log(
  ownTabs.length === 2 && ownPlaying > 0
    ? 'PASS  presenter sees their own screens'
    : `FAIL  presenter has ${ownTabs.length} tab(s), ${ownPlaying} playing - expected 2 and >0`
);

// Pan and zoom on the shared screen, against the captured configuration:
//   zoomLevels: 20, initialZoomLevel: 2, scalePerZoomLevel: 1.1,
//   noDragFromElementClass: 'screencast-pan'  (drag is BLOCKED until zoom mode is on)
console.log('\n--- pan / zoom ---');
const readPan = () =>
  memb.ev(`(()=>{
  const c=[...document.querySelectorAll('[id^="video-screen-container-"]')].find(e=>e.offsetParent!==null);
  if(!c) return JSON.stringify({found:false});
  const el=c.querySelector('.pan-element');
  return JSON.stringify({found:true, transform: el?.style.transform ?? null,
    noDrag: c.classList.contains('screencast-pan'),
    grabbing: c.classList.contains('screencast-pan-grabbing'),
    zoomButtons: c.querySelectorAll('.zoom-controls-container button').length});})()`);

const beforeZoom = JSON.parse(await readPan());
console.log('idle:   ', JSON.stringify(beforeZoom));

// Turn zoom mode on via the captured fa-search toggle.
await memb.ev(`(()=>{const c=[...document.querySelectorAll('[id^="video-screen-container-"]')]
  .find(e=>e.offsetParent!==null);
  c.querySelector('.zoom-controls-container button')?.click();})()`);
await sleep(400);
const zoomOn = JSON.parse(await readPan());
console.log('zoom on:', JSON.stringify(zoomOn));

// Zoom in twice, then drag.
await memb.ev(`(()=>{const c=[...document.querySelectorAll('[id^="video-screen-container-"]')]
  .find(e=>e.offsetParent!==null);
  const b=[...c.querySelectorAll('.zoom-controls-container button')];
  b[1].click(); b[1].click();})()`);
await sleep(300);
const zoomed = JSON.parse(await readPan());
console.log('zoomed: ', JSON.stringify(zoomed));

await memb.ev(`(()=>{const c=[...document.querySelectorAll('[id^="video-screen-container-"]')]
  .find(e=>e.offsetParent!==null);
  const r=c.getBoundingClientRect();
  const opts={bubbles:true, pointerId:1, button:0, isPrimary:true};
  c.setPointerCapture=()=>{}; c.hasPointerCapture=()=>false; c.releasePointerCapture=()=>{};
  c.dispatchEvent(new PointerEvent('pointerdown',{...opts,clientX:r.x+100,clientY:r.y+100}));
  c.dispatchEvent(new PointerEvent('pointermove',{...opts,clientX:r.x+180,clientY:r.y+160}));
  c.dispatchEvent(new PointerEvent('pointerup',  {...opts,clientX:r.x+180,clientY:r.y+160}));})()`);
await sleep(300);
const panned = JSON.parse(await readPan());
console.log('panned: ', JSON.stringify(panned));

// Reset.
await memb.ev(`(()=>{const c=[...document.querySelectorAll('[id^="video-screen-container-"]')]
  .find(e=>e.offsetParent!==null);
  const b=[...c.querySelectorAll('.zoom-controls-container button')]; b[3].click();})()`);
await sleep(300);
const reset = JSON.parse(await readPan());
console.log('reset:  ', JSON.stringify(reset));

const scaleOf = (t) => {
  const m = /scale\(([0-9.]+)\)/.exec(t ?? '');
  return m ? +m[1] : null;
};
const translateOf = (t) => {
  const m = /translate\((-?[0-9.]+)px, (-?[0-9.]+)px\)/.exec(t ?? '');
  return m ? [+m[1], +m[2]] : null;
};
const checks = [
  ['drag blocked until zoom is on', beforeZoom.noDrag === true && beforeZoom.grabbing === false],
  ['only the toggle shows when idle', beforeZoom.zoomButtons === 1],
  ['zoom mode reveals all four controls', zoomOn.zoomButtons === 4 && zoomOn.grabbing === true],
  ['neutral scale is 1', Math.abs((scaleOf(beforeZoom.transform) ?? 0) - 1) < 0.001],
  ['two zoom-ins give 1.1^2 = 1.21', Math.abs((scaleOf(zoomed.transform) ?? 0) - 1.21) < 0.001],
  ['dragging pans by the pointer delta', String(translateOf(panned.transform)) === '80,60'],
  [
    'reset restores scale 1 at the origin',
    Math.abs((scaleOf(reset.transform) ?? 0) - 1) < 0.001 &&
      String(translateOf(reset.transform)) === '0,0'
  ]
];
for (const [label, ok] of checks) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`);

console.log(
  '\nPRESENTER track:',
  await pres.ev(`(async () => {
  const s = await navigator.mediaDevices.getUserMedia({video:true});
  const t = s.getVideoTracks()[0];
  const settings = t.getSettings();
  await new Promise(r=>setTimeout(r,1500));
  return JSON.stringify({readyState:t.readyState, muted:t.muted, enabled:t.enabled,
    label:t.label, w:settings.width, h:settings.height, fps:settings.frameRate});
})()`)
);
console.log(
  '\nPRESENTER outbound:',
  await pres.ev(`(async () => {
  const out=[];
  for (const pc of (window.__pcs||[])) {
    const rows=[];
    try { (await pc.getStats()).forEach(r => {
      if (r.type==='outbound-rtp' && r.kind==='video')
        rows.push({bytes:r.bytesSent, packets:r.packetsSent, frames:r.framesEncoded,
                   framesSent:r.framesSent, keyframes:r.keyFramesEncoded, w:r.frameWidth, h:r.frameHeight,
                   limit:r.qualityLimitationReason, encoder:r.encoderImplementation});
      if (r.type==='media-source' && r.kind==='video')
        rows.push({src:'track', w:r.width, h:r.height, fps:r.framesPerSecond, frames:r.frames});
      if (r.type==='transport') rows.push({dtls:r.dtlsState, ice:r.iceState});
    }); } catch(e){ rows.push({err:String(e)}); }
    if (rows.length) out.push({conn:pc.connectionState, rows});
  }
  return JSON.stringify(out);
})()`)
);
console.log(
  '\nMEMBER WebRTC state:',
  await memb.ev(`(async () => {
  const pcs = window.__pcs || [];
  const out = [];
  for (const pc of pcs) {
    const stats = [];
    try { (await pc.getStats()).forEach(r => {
      if (r.type === 'inbound-rtp' && r.kind === 'video')
        stats.push({bytes:r.bytesReceived, packets:r.packetsReceived, frames:r.framesDecoded,
          keyframes:r.keyFramesDecoded, framesReceived:r.framesReceived, framesDropped:r.framesDropped,
          pli:r.pliCount, nack:r.nackCount, mime:r.mimeType, codecId:r.codecId,
          pktLost:r.packetsLost, decoder:r.decoderImplementation});
      if (r.type === 'codec') stats.push({codec:r.mimeType, pt:r.payloadType, fmtp:r.sdpFmtpLine});
      if (r.type === 'transport') stats.push({dtls:r.dtlsState, ice:r.iceState, sel:!!r.selectedCandidatePairId});
      if (r.type === 'candidate-pair' && r.state==='succeeded') stats.push({pair:'ok', rtt:r.currentRoundTripTime});
    }); } catch(e) { stats.push({err:String(e)}); }
    out.push({ice:pc.iceConnectionState, conn:pc.connectionState, stats});
  }
  return JSON.stringify(out);
})()`)
);
console.log('\nMEMBER console:');
memb.logs.slice(0, 10).forEach((l) => console.log('   ' + l));
console.log('PRESENTER console:');
pres.logs.slice(0, 10).forEach((l) => console.log('   ' + l));
pres.kill();
memb.kill();
process.exit(0);
