/**
 * Proves the navbar talking indicator tracks the MICROPHONE, not the sound.
 *
 *   node scripts/talking-indicator-e2e.mjs           # needs the app running
 *
 * Two bugs it guards, and they pull in opposite directions:
 *
 * 1. `presenterTalking` was only reachable through a `window` event nothing dispatched, so
 *    `{#if presenterTalking && talkingUsers.length > 0}` could never be true and
 *    " ( No one is speaking )" stayed on screen with the microphone open.
 *
 * 2. The fix must NOT be voice-activity detection. "Talking" in this app means unmuted - the
 *    capture sends `startTalking` from `presUnmuted` and `stopTalking` from `presMuted` - so
 *    pausing between sentences must leave the indicator alone. A level-driven implementation
 *    passes a naive test and is still wrong, which is why section C holds silence and asserts the
 *    indicator STAYS.
 *
 * getUserMedia is replaced with a WebAudio oscillator so the harness can go completely silent
 * while the track stays live; Chrome's fake device emits a tone that cannot be turned off.
 */
import { handoffUrl, roomJwtSecret } from './lib/enter-room.mjs';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.env.BASE ?? 'http://localhost:5179';

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
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id === undefined) return;
    const x = pending.get(m.id);
    pending.delete(m.id);
    m.error ? x.reject(new Error(JSON.stringify(m.error))) : x.resolve(m.result);
  });
  const send = (method, params = {}, s) => {
    const i = ++id;
    return new Promise((res, rej) => {
      pending.set(i, { resolve: res, reject: rej });
      ws.send(JSON.stringify({ id: i, method, params, ...(s ? { sessionId: s } : {}) }));
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
    // A microphone whose level this harness controls. window.__setLevel(0..1).
    (() => {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const dest = ctx.createMediaStreamDestination();
      osc.frequency.value = 220; gain.gain.value = 0;
      osc.connect(gain); gain.connect(dest); osc.start();
      window.__setLevel = (v) => { gain.gain.value = v; };
      navigator.mediaDevices.getUserMedia = async () => dest.stream;
    })();
  `
    },
    sessionId
  );
  const ev = async (expr) =>
    (
      await send(
        'Runtime.evaluate',
        { expression: expr, returnByValue: true, awaitPromise: true },
        sessionId
      )
    ).result.value;
  return {
    ev,
    send,
    sessionId,
    kill: () => {
      ws.close();
      process.kill(-proc.pid, 'SIGKILL');
      rmSync(profile, { recursive: true, force: true });
    }
  };
}

const b = await browser(9580, '/tmp/e2e-talk');
// The controller is the front door; the room accepts a signed handoff and nothing else.
await b.send(
  'Page.navigate',
  { url: handoffUrl({ base: BASE, email: 'probe@handoff.test', secret: roomJwtSecret() }) },
  b.sessionId
);
await sleep(7000);

const indicator = () =>
  b.ev(`(()=>{
  const li=document.querySelector('.talkingIndicator');
  return JSON.stringify({
    present: !!li,
    text: li ? li.textContent.replace(/\\s+/g,' ').trim() : null,
    talkingAnchor: !!document.querySelector('.talkingIndicator > a.talking'),
    waveform: !!document.getElementById('talkingLevelsImg')
  });})()`);

const results = [];
const check = (label, actual, expected) => {
  const ok = actual === expected;
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${actual}`);
};

console.log('\nA before the microphone is on');
let s = JSON.parse(await indicator());
console.log('   ', JSON.stringify(s));
check('indicator present', s.present, true);
check('shows the idle message', /No one is speaking/.test(s.text ?? ''), true);
check('no talking anchor', s.talkingAnchor, false);

console.log('\nB microphone on, and actually making sound');
const clicked = await b.ev(`(()=>{const a=document.getElementById('unmuteMuteMicrophone');
  if(!a) return 'NO MIC CONTROL'; a.click(); return 'clicked #unmuteMuteMicrophone';})()`);
console.log('   ', clicked);
// getUserMedia has to resolve and the detector has to spin up before the level means anything.
await sleep(3000);
await b.ev(`window.__setLevel(0.6)`);
await sleep(1500);
s = JSON.parse(await indicator());
console.log('   ', JSON.stringify(s));
check('talking anchor appears', s.talkingAnchor, true);
check('idle message is GONE', /No one is speaking/.test(s.text ?? ''), false);
check('speaker name is shown', /Billy/.test(s.text ?? ''), true);
check('waveform image appears', s.waveform, true);

console.log('\nC silence with the microphone still open - the indicator must HOLD');
await b.ev(`window.__setLevel(0)`);
await sleep(3000);
s = JSON.parse(await indicator());
console.log('   ', JSON.stringify(s));
check('indicator still showing', s.talkingAnchor, true);
check('idle message still gone', /No one is speaking/.test(s.text ?? ''), false);
check('name still shown', /Billy/.test(s.text ?? ''), true);

console.log('\nD microphone muted - only now does the idle message return');
await b.ev(`document.getElementById('unmuteMuteMicrophone').click()`);
await sleep(1500);
s = JSON.parse(await indicator());
console.log('   ', JSON.stringify(s));
check('back to the idle message', /No one is speaking/.test(s.text ?? ''), true);
check('talking anchor gone', s.talkingAnchor, false);
check('waveform gone', s.waveform, false);

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
b.kill();
process.exit(failed === 0 ? 0 : 1);
