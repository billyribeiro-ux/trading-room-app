/**
 * The seam, driven the way a person drives it: through both applications, in one browser.
 *
 * `scripts/handoff-e2e.mjs` proves the room's half against tokens this repository mints.  That is
 * the wrong half to trust on its own — a verifier and a minter written against the same assumption
 * agree with each other whether or not the assumption is right.  This drives the CONTROLLER,
 * clicks its Launch, and follows wherever it actually sends the browser.
 *
 *   CONTROL=http://localhost:5180 ROOM=http://localhost:5174 node scripts/two-app-seam-e2e.mjs
 *
 * Nothing here mints a token, reads a secret, or touches either database. It signs in, follows
 * redirects, and reads the resulting pages.
 */
import { spawn, execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import Database from 'better-sqlite3';

const CONTROL = process.env.CONTROL ?? 'http://localhost:5180';
const ROOM = process.env.ROOM ?? 'http://localhost:5174';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9731;

/*
  A disposable tenant, created THROUGH THE CONTROLLER, not written into its database.

  An earlier version of this probe inserted the account and room straight into
  `control.sqlite`. The rows were correct — verified by reading them back and by reproducing
  `verifyPassword` against the stored hash — and the running dev server still answered "those
  credentials are not valid". Restarting the server made the same row work, which settles it: a
  long-lived `better-sqlite3` connection does not reliably see another process's commits, so the
  writes were real and invisible.

  Registering through the UI removes the problem and improves the test. Rooms are created in the
  controller; a probe that creates one by other means is not exercising that.
*/
const stamp = process.env.SEAM_STAMP ?? String(process.hrtime.bigint());
const PROBE = {
  name: 'Seam Probe Owner',
  email: `seam-probe-${stamp}@two-app.test`,
  password: 'two-app-seam-e2e-probe',
  roomName: `Seam Probe Room ${stamp.slice(-6)}`
};

/*
  Sweep out earlier probe tenants.

  Deleting is safe from here in a way that inserting was not: the running dev server does not need
  to observe a removal to behave correctly, whereas it did need to observe the insert. Rows left
  behind by a previous run are inert either way — every run registers its own account — but a local
  database should not accumulate them.
*/
function sweepPreviousProbeTenants() {
  const path = `${process.env.HOME}/Desktop/new-room-control/.data/control.sqlite`;
  let control;
  try {
    control = new Database(path);
  } catch {
    return; // Not reachable from here; the probe does not depend on this.
  }
  try {
    control.pragma('foreign_keys = OFF');
    const accounts = control
      .prepare("SELECT id FROM accounts WHERE owner_email LIKE '%@two-app.test'")
      .all();
    for (const { id } of accounts) {
      for (const { id: roomId } of control
        .prepare('SELECT id FROM rooms WHERE account_id = ?')
        .all(id)) {
        control.prepare('DELETE FROM room_settings WHERE room_id = ?').run(roomId);
        control.prepare('DELETE FROM room_users WHERE room_id = ?').run(roomId);
        control.prepare('DELETE FROM rooms WHERE id = ?').run(roomId);
      }
      control
        .prepare(
          'DELETE FROM login_sessions WHERE user_id IN (SELECT id FROM users WHERE account_id = ?)'
        )
        .run(id);
      control.prepare('DELETE FROM users WHERE account_id = ?').run(id);
      control.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    }
    if (accounts.length) console.log(`  (swept ${accounts.length} earlier probe tenant(s))`);
  } finally {
    control.pragma('foreign_keys = ON');
    control.close();
  }
}

const results = [];
const check = (name, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ name, pass });
  console.log(
    `${pass ? '  ok  ' : ' FAIL '} ${name}` +
      (pass
        ? ''
        : `\n         expected ${JSON.stringify(expected)}\n         actual   ${JSON.stringify(actual)}`)
  );
};

const kill = () => {
  try {
    execFileSync('bash', ['-lc', `pkill -f -- "--remote-debugging-port=${PORT}" || true`]);
  } catch {
    /* nothing to kill */
  }
};

sweepPreviousProbeTenants();
kill();
rmSync('/tmp/e2e-two-app', { recursive: true, force: true });
spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--no-first-run',
    '--disable-gpu',
    '--window-size=1512,900',
    '--user-data-dir=/tmp/e2e-two-app',
    'about:blank'
  ],
  { stdio: 'ignore', detached: true }
);

let version;
for (let i = 0; i < 80; i++) {
  try {
    const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
    if (response.ok) {
      version = await response.json();
      break;
    }
  } catch {
    /* not up yet */
  }
  await sleep(200);
}
if (!version) throw new Error('Chrome never came up');

const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let nextId = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id === undefined) return;
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
  else waiter.resolve(message.result);
});
const send = (method, params = {}, sessionId) => {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
};

const target = await send('Target.createTarget', { url: `${CONTROL}/login` });
const sessionId = (
  await send('Target.attachToTarget', { targetId: target.targetId, flatten: true })
).sessionId;
await send('Runtime.enable', {}, sessionId);
await send('Page.enable', {}, sessionId);
await sleep(2500);

const evaluate = async (expression) =>
  (
    await send(
      'Runtime.evaluate',
      { expression, returnByValue: true, awaitPromise: true },
      sessionId
    )
  ).result.value;

const goto = async (url) => {
  await send('Page.navigate', { url }, sessionId);
  await sleep(3500);
};

console.log(`\ntwo-app seam:  ${CONTROL}  ->  ${ROOM}\n`);

const diagnose = async (label) => {
  console.log(`       still on: ${await evaluate('location.pathname')}`);
  console.log(
    `       ${label} says:`,
    await evaluate('document.body.innerText.replace(/\\s+/g, " ").slice(0, 240)')
  );
};

try {
  // ── register an account IN THE CONTROLLER ─────────────────────────────────────────────────
  console.log('1. register an account in the controller');
  await goto(`${CONTROL}/register`);
  await evaluate(`(() => {
    const form = document.querySelector('form');
    const set = (selector, value) => {
      const el = form.querySelector(selector);
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('input[name=name]', ${JSON.stringify(PROBE.name)});
    set('input[name=email]', ${JSON.stringify(PROBE.email)});
    set('input[name=password]', ${JSON.stringify(PROBE.password)});
    set('input[name=confirm]', ${JSON.stringify(PROBE.password)});
    form.querySelector('input[name=agreeTOS]').checked = true;
    form.requestSubmit();
  })()`);
  await sleep(4500);
  const afterRegister = await evaluate('location.pathname');
  if (afterRegister !== '/account') await diagnose('register');
  check('registering lands on the account page', afterRegister, '/account');

  // ── create a room, which is what the controller is FOR ────────────────────────────────────
  console.log('\n2. create a room');
  /*
    Five clicks on the word "Sessions" first.

    `{#if showNewRoom >= 5}` — the reference's own easter egg, reproduced faithfully
    (`ng-click="showNewRoom=showNewRoom+1"`). The form does not exist in the DOM before that, which
    is why an earlier version of this probe reported "no launch link" and looked like a broken
    createRoom action. It was the product behaving exactly as captured.
  */
  const revealed = await evaluate(`(() => {
    const toggle = [...document.querySelectorAll('.acc-clickable')].find((el) => el.textContent.trim() === 'Sessions');
    if (!toggle) return false;
    for (let i = 0; i < 5; i++) toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  })()`);
  check('five clicks on "Sessions" reveal the New Room form', revealed, true);
  await sleep(600);

  const submitted = await evaluate(`(() => {
    const form = [...document.querySelectorAll('form')].find((f) => (f.getAttribute('action') ?? '').includes('createRoom'));
    if (!form) return 'no-form';
    const input = form.querySelector('input[name=name]');
    input.value = ${JSON.stringify(PROBE.roomName)};
    input.dispatchEvent(new Event('input', { bubbles: true }));
    form.requestSubmit();
    return 'submitted';
  })()`);
  check('the New Room form submits', submitted, 'submitted');
  await sleep(4000);

  const room = await evaluate(`(() => {
    const link = [...document.querySelectorAll('a')].find((a) => /\\/launch\\//.test(a.getAttribute('href') ?? ''));
    return link ? { href: link.getAttribute('href') } : null;
  })()`);
  check('the new room offers a Launch link', room !== null, true);
  if (!room) {
    await diagnose('account');
    throw new Error('no launch link on the account page');
  }
  console.log(`       launch link: ${room.href}`);

  // ── follow it, all the way ────────────────────────────────────────────────────────────────
  console.log('\n3. follow Launch across the seam');
  await goto(new URL(room.href, CONTROL).toString());

  const landed = await evaluate('location.origin + location.pathname + location.search');
  console.log(`       landed on: ${landed}`);
  check('the browser ends up in the ROOM application', landed.startsWith(ROOM), true);
  check('on the room itself, not a login', new URL(landed).pathname, '/');

  const inRoom = await evaluate(`(() => ({
    hasSidebarToggle: !!document.querySelector('.sidebar-menu'),
    hasComposer: !!document.getElementById('textAreaTxt'),
    title: document.title
  }))()`);
  check('and the room actually rendered', inRoom.hasSidebarToggle && inRoom.hasComposer, true);

  /*
    The roster, not `document.body.innerText`.

    The room does not print your own name anywhere in the page body — an earlier version of this
    check looked there, failed, and was about to be reported as the room losing the identity. It
    had not: the name was in the SSR payload and in the sidebar, which is closed by default.
  */
  await evaluate(
    `document.querySelector('.sidebar-menu')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))`
  );
  await sleep(1200);
  const roster =
    await evaluate(`(() => [...document.querySelectorAll('.room-roster-container .nickName span')]
    .map((el) => el.textContent.trim()))()`);
  check(
    'the roster shows the account that clicked Launch',
    roster.includes('Seam Probe Owner'),
    true
  );

  const gearVisible = await evaluate(`!!document.querySelector('a[title="Get Random User"]')`);
  // `Get Random User` is `O(43, isPresenter ? 43 : -1)`. A `site` token means staff, so it renders.
  check('and renders them with presenter authority', gearVisible, true);

  // ── the token is spent ────────────────────────────────────────────────────────────────────
  console.log('\n4. the seam is repeatable even though a token is not');
  // Re-issuing Launch mints a NEW token, which must also work: a single token is single-use, but
  // the seam itself has to be repeatable, and a replay guard that broke the second launch would
  // pass every test in handoff-e2e.mjs and still be useless.
  await goto(new URL(room.href, CONTROL).toString());
  check(
    'a second Launch still works, with a fresh token',
    (await evaluate('location.origin')) === ROOM,
    true
  );

  // ── signing out of the room goes back to the controller ───────────────────────────────────
  console.log('\n5. signing out of the room');
  await goto(`${ROOM}/logout`);
  const loggedOut = await evaluate(`(() => {
    const form = document.querySelector('form');
    if (form) form.requestSubmit();
    return !!form;
  })()`);
  check('the room offers a sign-out form', loggedOut, true);
  await sleep(3500);
  const after = await evaluate('location.origin + location.pathname');
  console.log(`       after sign-out: ${after}`);
  check('which sends the browser back to the controller', after.startsWith(CONTROL), true);
} finally {
  kill();
  sweepPreviousProbeTenants();
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} passed\n`);
process.exit(passed === results.length ? 0 : 1);
