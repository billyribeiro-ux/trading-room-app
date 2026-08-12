/**
 * A setting changed in the controller changes the room.
 *
 * This is the whole point of the config seam, and it cannot be proven in either application alone.
 * The room used to carry a hardcoded `sessData` literal — one constant standing in for the
 * settings of a room, in a product where you create as many rooms as you like and set each one's
 * options yourself. Every gate that read it was reading a value nobody chose.
 *
 * So: register in the controller, create a room, flip a setting on its Manage page, launch, and
 * assert the ROOM's rendered DOM changed. Then flip it back and assert it changed back.
 *
 *   CONTROL=http://localhost:5180 ROOM=http://localhost:5174 node scripts/room-config-seam-e2e.mjs
 *
 * Nothing here writes to either database. Every mutation goes through the controller's own form
 * actions over HTTP, which is also the only way the running dev server reliably observes them.
 */
import { spawn, execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { readFileSync, rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CONTROL = process.env.CONTROL ?? 'http://localhost:5180';
const ROOM = process.env.ROOM ?? 'http://localhost:5174';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9741;

const stamp = String(process.hrtime.bigint());
const PROBE = {
  name: 'Config Seam Owner',
  email: `config-seam-${stamp}@two-app.test`,
  password: 'room-config-seam-e2e',
  roomName: `Config Seam Room ${stamp.slice(-6)}`
};

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

kill();
rmSync('/tmp/e2e-config-seam', { recursive: true, force: true });
spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--no-first-run',
    '--disable-gpu',
    '--window-size=1512,900',
    '--user-data-dir=/tmp/e2e-config-seam',
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

const target = await send('Target.createTarget', { url: 'about:blank' });
const sessionId = (
  await send('Target.attachToTarget', { targetId: target.targetId, flatten: true })
).sessionId;
await send('Runtime.enable', {}, sessionId);
await send('Page.enable', {}, sessionId);

const evaluate = async (expression) =>
  (
    await send(
      'Runtime.evaluate',
      { expression, returnByValue: true, awaitPromise: true },
      sessionId
    )
  ).result.value;

const goto = async (url, settle = 3500) => {
  await send('Page.navigate', { url }, sessionId);
  await sleep(settle);
};

/**
 * Flips one setting through the controller's own `?/saveField` action.
 *
 * Deliberately a real request from the signed-in page rather than a database write: the running
 * dev server holds a long-lived SQLite connection that does not reliably observe another process's
 * commits, and going through the action is what the Manage page itself does.
 */
/** POSTs one of the controller's own form actions from the signed-in page. */
const postAction = (path, action, fields) =>
  evaluate(
    `(async () => {
      const response = await fetch(${JSON.stringify(path)} + '?/' + ${JSON.stringify(action)}, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-sveltekit-action': 'true' },
        body: new URLSearchParams(${JSON.stringify(fields)})
      });
      return response.status;
    })()`
  );

const setSetting = async (roomPath, name, value) => ({
  status: await postAction(roomPath, 'saveField', { name, value: String(value) })
});

/**
 * Asks the controller what it knows about a member of this room.
 *
 * From node rather than the browser: this is the exact request the room's own
 * `room-config-client` makes, signed the same way, so what it answers is what the room will read.
 */
async function controllerMemberView(shortCode, email) {
  const secret = readFileSync('.env', 'utf8')
    .split('\n')
    .find((line) => line.startsWith('ROOM_JWT_SECRET='))
    .slice('ROOM_JWT_SECRET='.length)
    .trim();
  const issuedAt = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', secret)
    .update(`config-read:${shortCode}.${issuedAt}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const response = await fetch(
    `${CONTROL}/internal/room-config/${shortCode}?email=${encodeURIComponent(email)}`,
    { headers: { authorization: `Bearer ${issuedAt}.${signature}` } }
  );
  if (!response.ok) throw new Error(`config read failed: ${response.status}`);
  return (await response.json()).member;
}

console.log(`\nroom-config seam:  ${CONTROL}  ->  ${ROOM}\n`);

try {
  // ── a room of our own ─────────────────────────────────────────────────────────────────────
  console.log('1. a fresh room in the controller');
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
  check('registered', await evaluate('location.pathname'), '/account');

  // Five clicks on "Sessions" — the reference's own gate on the New Room form.
  await evaluate(`(() => {
    const toggle = [...document.querySelectorAll('.acc-clickable')].find((el) => el.textContent.trim() === 'Sessions');
    for (let i = 0; i < 5; i++) toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  })()`);
  await sleep(600);
  await evaluate(`(() => {
    const form = [...document.querySelectorAll('form')].find((f) => (f.getAttribute('action') ?? '').includes('createRoom'));
    const input = form.querySelector('input[name=name]');
    input.value = ${JSON.stringify(PROBE.roomName)};
    input.dispatchEvent(new Event('input', { bubbles: true }));
    form.requestSubmit();
  })()`);
  await sleep(4000);

  const launchHref = await evaluate(`(() => {
    const link = [...document.querySelectorAll('a')].find((a) => /\\/launch\\//.test(a.getAttribute('href') ?? ''));
    return link ? link.getAttribute('href') : null;
  })()`);
  check('the room exists and can be launched', launchHref !== null, true);
  if (!launchHref) throw new Error('no launch link');
  const manageePath = `/account/rooms/${launchHref.split('/').pop()}`;

  /** Launch, then read the room's rendered state. */
  const readRoom = async () => {
    await goto(new URL(launchHref, CONTROL).toString(), 4500);
    await evaluate(
      `document.querySelector('.sidebar-menu')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))`
    );
    await sleep(900);
    return evaluate(
      `(() => {
      const text = (selector) => document.querySelector(selector)?.textContent?.trim() ?? null;
      return {
        origin: location.origin,
        // The navbar headcount: rosterCount plus simUserCount.
        headcount: text('.users .ml-1'),
        // O(12, hideAppInfo ? -1 : 12) - the Powered by / version block.
        appInfo: document.body.innerText.includes('Powered by:'),
        /*
          The two COLUMNS of the main split, each gated by one flag:
            O(1, e.hideChatAlerts ? -1 : 1)   app-room.render-helpers.js:1650
            O(3, e.hidePresentation ? -1 : 3) app-room.render-helpers.js:1662
          Neither gate has an ` ||
        isPresenter` branch on our side, so the owner who clicks Launch
          sees the same thing a member does - which is what makes them readable from this probe at
          all (see the note below on the presenter-biased gates that broke an earlier version).
        */
        chatAlerts: document.querySelector('.alert-chat-box') !== null,
        presentation: document.querySelector('.presentation-box') !== null
      };
    })()`
    );
  };

  /*
    Which settings this probe uses, and why not the obvious ones.

    An earlier version asserted on the roster-count badge and the Archives menu, and failed: both
    gates are `… || isPresenter`, and the account that clicks Launch owns the room. The room was
    right; the assertions were reading a presenter-biased gate as though it were a plain one.

    `simUserCount`, `hideAppInfo` and `hasBenzingaNews` have no presenter branch at all
    (`Ne(" ", rosterCount + simUserCount, " ")`, `O(12, hideAppInfo ? -1 : 12)`,
    `O(31, hasBenzingaNews ? 31 : -1)`), so what they show is the setting and nothing else.
  */

  // ── a brand new room has nothing set ──────────────────────────────────────────────────────
  console.log('\n2. a brand new room, with nothing set');
  const fresh = await readRoom();
  check('lands in the room', fresh.origin, ROOM);
  // The four-digit code the controller allocated, read off where the launch actually landed.
  const roomCode = new URL(await evaluate('location.href')).searchParams.get('room');
  // `createRoom` writes no settings row at all: every key unset, and unset means off. That is the
  // honest starting point the room now reflects instead of my defaults.
  check('the app-info line is shown (hideAppInfo unset)', fresh.appInfo, true);
  /*
    `hideAppInfo` and `hasBenzingaNews` are deliberately NOT asserted here.

    This probe flipped `hideAppInfo` and nothing changed, which is how it was discovered that the
    room has no consumer for either: `O(12)` gates the Mobile App Info button, which the room
    renders as an empty paragraph, and there is no Benzinga item at all. Both were removed from the
    controller's `ROOM_VISIBLE_SETTINGS` rather than left crossing the boundary for nothing, so
    there is nothing here to observe until their consumers exist.
  */
  const baseCount = Number(fresh.headcount);
  console.log(`       headcount with simUserCount unset: ${baseCount}`);

  // ── simUserCount: a number, so the change is unambiguous ──────────────────────────────────
  console.log('\n3. set simUserCount to 40 in the controller');
  await goto(`${CONTROL}${manageePath}`);
  const saved = await setSetting(manageePath, 'simUserCount', '40');
  check('the controller accepted the change', saved.status, 200);

  const padded = await readRoom();
  check('the room adds it to the headcount', Number(padded.headcount), baseCount + 40);

  console.log('\n4. set it back to 0');
  await goto(`${CONTROL}${manageePath}`);
  await setSetting(manageePath, 'simUserCount', '0');
  check('the headcount returns to the real one', Number((await readRoom()).headcount), baseCount);

  // ── a setting with no consumer must not reach the room at all ─────────────────────────────
  console.log('\n5. a setting the room cannot use does not cross');
  await goto(`${CONTROL}${manageePath}`);
  await setSetting(manageePath, 'webinarPW', 'hunter2-should-never-cross');
  /*
    `hasTypingIndicator`, not `hideAppInfo`.

    This used `hideAppInfo` when nothing in the room read it. It reads it now — that is this
    session's work — so asserting its absence would fail for the right reason and look like a leak.
    `hasTypingIndicator` is one of the 246 the room still has no consumer for.
  */
  await setSetting(manageePath, 'hasTypingIndicator', 'true');
  const inRoom = await readRoom();
  const payload = await evaluate(
    `[...document.querySelectorAll('script')].map((s) => s.textContent).join('')`
  );
  // The room password is set on this room and must not appear anywhere in what the room renders.
  check(
    'the room password never reaches the room',
    payload.includes('hunter2-should-never-cross'),
    false
  );
  check('nor does a setting with no consumer', /"?hasTypingIndicator"?\s*:/.test(payload), false);
  check(
    'while the settings it does consume are present',
    /"?rosterVisibleToViewers"?\s*:|simUserCount/.test(payload),
    true
  );
  check('and the room still renders', inRoom.origin, ROOM);

  await goto(`${CONTROL}${manageePath}`);
  await setSetting(manageePath, 'webinarPW', '');
  await setSetting(manageePath, 'hasTypingIndicator', '');

  // ── per-room membership, the other half of the seam ───────────────────────────────────────
  console.log('\n6. flags that belong to a MEMBERSHIP, not to an account');
  /*
    `isFT`, `hasAdminChat` and `denyArchivesAccess` were columns on the room's own `users` table.
    All three are per-room in the controller — somebody is a trial in one room and not another, and
    admin chat is granted for a room — so a column on an account could only ever answer the same
    way everywhere, which is the wrong answer in every room but one.

    Proven through the controller's own actions: invite a member, then apply opcode 6, which sets
    `isFreeTrial` and is deliberately not a role.
  */
  const memberEmail = `member-${stamp}@two-app.test`;
  await goto(`${CONTROL}${manageePath}`);
  check(
    'the controller invites a member',
    await postAction(manageePath, 'inviteUser', { name: 'Seam Member', email: memberEmail }),
    200
  );

  const before = await controllerMemberView(roomCode, memberEmail);
  check('who starts as a participant, not a trial', [before?.role, before?.isFT], [2, false]);
  check('and without admin chat', before?.permissions.hasAdminChat, false);

  await goto(`${CONTROL}${manageePath}`, 4000);
  const roomUserId = await evaluate(`(() => {
    const input = [...document.querySelectorAll('input[type=checkbox][aria-label]')]
      .find((el) => el.getAttribute('aria-label') === 'Select Seam Member');
    return input ? Number(input.value) : null;
  })()`);
  check('the user list shows them', roomUserId !== null, true);

  if (roomUserId !== null) {
    check(
      'opcode 6 marks them a free trial',
      await postAction(manageePath, 'updateUser', { op: '6', roomUserId: String(roomUserId) }),
      200
    );
    const after = await controllerMemberView(roomCode, memberEmail);
    check('the controller now reports isFT for this room', after?.isFT, true);
    // Still a participant: Trial is a flag behind the TRIAL badge, not a role of its own.
    check('while their role is unchanged', after?.role, 2);
  }

  // ── Mobile App Info, built this session ───────────────────────────────────────────────────
  console.log('\n7. Mobile App Info');
  /*
    `O(12, hideAppInfo ? -1 : 12)` around a paragraph, and inside it
    `O(1, !ptrMobileAppEnabled && !customMobileAppEnabled || isFT && !freeTrialsGetApp ? -1 : 1)`.
    The room rendered an empty `<p>` here until now, so the whole feature is new and every branch
    below is worth walking.
  */
  const mobileState = async () =>
    evaluate(`(() => {
      /*
        The .show class, not merely the element.

        Modal.svelte renders every modal into the DOM and toggles show plus a display style, so
        selecting the id alone is truthy before anything is clicked. An earlier version of this
        probe read the closed modal and reported its contents as though the feature had opened
        itself. No backticks in this comment: it lives inside a template literal.
      */
      const modal = document.querySelector('#mobileAppInfoModal.show');
      return {
        sidebarButton: [...document.querySelectorAll('.sidebar-wrapper button')]
          .some((b) => b.textContent.trim() === 'Mobile App Info'),
        navbarIcon: !!document.querySelector('.mobile-info-app-btn'),
        modalOpen: !!modal,
        title: modal?.querySelector('.modal-title')?.textContent?.trim() ?? null,
        credentials: !!modal && modal.textContent.includes('To login to the app use'),
        email: modal?.querySelector('div.mt-2 span')?.textContent?.trim() ?? null,
        pin: [...(modal?.querySelectorAll('div.mt-2 span') ?? [])].at(-1)?.textContent?.trim() ?? null,
        links: [...(modal?.querySelectorAll('a[target="_blank"]') ?? [])].map((a) => a.getAttribute('href'))
      };
    })()`);

  await readRoom();
  check('with no app configured, neither entry point renders', await mobileState(), {
    sidebarButton: false,
    navbarIcon: false,
    modalOpen: false,
    title: null,
    credentials: false,
    email: null,
    pin: null,
    links: []
  });

  await goto(`${CONTROL}${manageePath}`);
  await setSetting(manageePath, 'ptrMobileAppEnabled', 'true');
  await readRoom();
  let mobile = await mobileState();
  check('turning the app on shows the sidebar button', mobile.sidebarButton, true);
  check('and the navbar icon', mobile.navbarIcon, true);

  await evaluate(
    `[...document.querySelectorAll('.sidebar-wrapper button')].find((b) => b.textContent.trim() === 'Mobile App Info')?.click()`
  );
  await sleep(2500);
  mobile = await mobileState();
  check('clicking it opens the captured modal', mobile.title, 'Download our mobile apps');
  check('showing the credentials block', mobile.credentials, true);
  check('with the signed-in address', mobile.email, PROBE.email);
  check('and a real six-digit pin from the controller', /^\d{6}$/.test(mobile.pin ?? ''), true);
  check('both links point at TradingRoom v1', mobile.links, [
    'https://www.tradingroom.app',
    'https://www.tradingroom.app'
  ]);

  await goto(`${CONTROL}${manageePath}`);
  await setSetting(manageePath, 'hideMobileCredentials', 'true');
  await readRoom();
  await evaluate(
    `[...document.querySelectorAll('.sidebar-wrapper button')].find((b) => b.textContent.trim() === 'Mobile App Info')?.click()`
  );
  await sleep(2000);
  check('hideMobileCredentials drops the email and pin', (await mobileState()).credentials, false);

  await goto(`${CONTROL}${manageePath}`);
  await setSetting(manageePath, 'hideMobileCredentials', '');
  await setSetting(manageePath, 'customMobileAppEnabled', 'true');
  await setSetting(manageePath, 'customMobileAppAndroidUrl', 'https://example.com/android');
  await setSetting(manageePath, 'customMobileAppIOSUrl', 'https://example.com/ios');
  await readRoom();
  await evaluate(
    `[...document.querySelectorAll('.sidebar-wrapper button')].find((b) => b.textContent.trim() === 'Mobile App Info')?.click()`
  );
  await sleep(2000);
  check('a custom app replaces both store links', (await mobileState()).links, [
    'https://example.com/android',
    'https://example.com/ios'
  ]);

  await goto(`${CONTROL}${manageePath}`);
  await setSetting(manageePath, 'hideAppInfo', 'true');
  await readRoom();
  check('hideAppInfo hides the sidebar button', (await mobileState()).sidebarButton, false);
  // The navbar icon has its own gate and is NOT covered by hideAppInfo — O(6) never reads it.
  check(
    'but not the navbar icon, which O(6) gates separately',
    (await mobileState()).navbarIcon,
    true
  );

  await goto(`${CONTROL}${manageePath}`);
  for (const key of [
    'hideAppInfo',
    'ptrMobileAppEnabled',
    'customMobileAppEnabled',
    'customMobileAppAndroidUrl',
    'customMobileAppIOSUrl'
  ]) {
    await setSetting(manageePath, key, '');
  }

  // ── Benzinga ──────────────────────────────────────────────────────────────────────────────
  console.log('\n8. Benzinga');
  const benzinga = async () =>
    evaluate(`(() => {
      const link = document.querySelector('.sidebar-wrapper a[title="Benzinga News"]');
      return {
        present: !!link,
        href: link?.getAttribute('href') ?? null,
        logo: link?.querySelector('img.benzinga-logo-alt')?.getAttribute('src') ?? null,
        icon: !!link?.querySelector('i.fa-newspaper')
      };
    })()`);

  await goto(`${CONTROL}${manageePath}`);
  await setSetting(manageePath, 'hasBenzingaNews', 'true');
  await readRoom();
  /*
    On alone it stays hidden, and that is the honest outcome: the captured default URL is built
    from `sessionID`, `sessData.uuid` and `sesionToken`, and this room has none of the three. A
    link built from three blanks is a broken link wearing a logo.
  */
  check(
    'on its own it does not render, because there is no destination',
    (await benzinga()).present,
    false
  );

  await goto(`${CONTROL}${manageePath}`);
  await setSetting(manageePath, 'altBenzingaLinkURL', 'https://example.com/bz');
  await readRoom();
  let bz = await benzinga();
  check('with a link it renders', bz.present, true);
  check('pointing where the room was told', bz.href, 'https://example.com/bz');
  check('as the captured icon form by default', bz.icon, true);

  await goto(`${CONTROL}${manageePath}`);
  await setSetting(manageePath, 'altBenzingaLogoURL', 'https://example.com/bz.png');
  await readRoom();
  bz = await benzinga();
  check('a custom logo replaces the icon', bz.logo, 'https://example.com/bz.png');
  check('and the icon is gone', bz.icon, false);

  await goto(`${CONTROL}${manageePath}`);
  for (const key of ['hasBenzingaNews', 'altBenzingaLinkURL', 'altBenzingaLogoURL']) {
    await setSetting(manageePath, key, '');
  }

  // ── the two column gates ──────────────────────────────────────────────────────────────────
  console.log('\n9. hideChatAlerts and isChatOnlyRoom remove whole columns');
  /*
    The acceptance criterion for both in the shape it can actually be proven: flip the setting in
    the controller, and watch a COLUMN leave the room's DOM.

    Both are readable from this probe for the same reason `simUserCount` is and the roster badge is
    not - neither gate carries an `|| isPresenter` branch here, so the owner account that clicked
    Launch observes exactly what a member would.
  */
  const bothColumns = await readRoom();
  check(
    'a room with neither set renders both columns',
    [bothColumns.chatAlerts, bothColumns.presentation],
    [true, true]
  );

  await goto(`${CONTROL}${manageePath}`);
  await setSetting(manageePath, 'hideChatAlerts', 'true');
  const noChat = await readRoom();
  check('hideChatAlerts removes the chat/alerts column', noChat.chatAlerts, false);
  check('and leaves the presentation area alone', noChat.presentation, true);

  await goto(`${CONTROL}${manageePath}`);
  await setSetting(manageePath, 'hideChatAlerts', '');
  check('clearing it brings the column back', (await readRoom()).chatAlerts, true);

  await goto(`${CONTROL}${manageePath}`);
  await setSetting(manageePath, 'isChatOnlyRoom', 'true');
  const noPresentation = await readRoom();
  check('isChatOnlyRoom removes the presentation column', noPresentation.presentation, false);
  check('and leaves the chat/alerts column alone', noPresentation.chatAlerts, true);

  await goto(`${CONTROL}${manageePath}`);
  await setSetting(manageePath, 'isChatOnlyRoom', '');
  check('clearing it brings the presentation back', (await readRoom()).presentation, true);

  // ── the room does not invent values ───────────────────────────────────────────────────────
  console.log('\n10. the room never falls back');
  /*
    Asserted as source rather than by killing the controller mid-run: `readRoomConfig` has no
    catch around it in `load`, so an unreachable controller throws and the reader sees an error.
    A probe that stopped the controller would prove the same thing at the cost of a flaky run and
    a half-configured machine if it died in between.
  */
  const client = readFileSync('src/lib/server/room-config-client.ts', 'utf8');
  check(
    'room-config-client has no default settings object',
    /return\s*\{\s*settings:\s*\{/.test(client),
    false
  );
  check(
    'and it throws rather than degrading',
    client.includes('throw new RoomConfigUnavailable'),
    true
  );
  const pageServer = readFileSync('src/routes/+page.server.ts', 'utf8');
  check(
    'the page load does not swallow it',
    /catch[^]{0,200}readRoomConfig|readRoomConfig[^]{0,200}\bcatch\b/.test(pageServer),
    false
  );
} finally {
  kill();
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} passed\n`);
process.exit(passed === results.length ? 0 : 1);
