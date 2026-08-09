/**
 * Runtime proof for the sidebar roster's gates and controls.
 *
 * Drives two real Chrome profiles - the admin and the member - against the dev server at the same
 * time, so the roster actually has two people in it. Everything asserted here is read back out of
 * the rendered DOM; nothing is inferred from the source.
 *
 * Account flags are written straight into SQLite between phases, because that is what they are:
 * columns on `users`. Each phase restores what it changed.
 *
 *   BASE=http://localhost:5174 node scripts/roster-gates-e2e.mjs
 */
import { handoffUrl, roomJwtSecret } from './lib/enter-room.mjs';
import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import Database from 'better-sqlite3';

const BASE = process.env.BASE ?? 'http://localhost:5174';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DB_PATH = '.data/proroom.sqlite';

const db = new Database(DB_PATH);
/*
  A disposable TENANT in the controller, not two rows in this database.

  The probe used to insert its presenter and member straight into the room's `users` table with
  the roles it wanted. That stopped working, and correctly: the room no longer decides what
  somebody is. `/session` reads the controller's membership on every entry and writes the role from
  it, so a room-local row claiming `admin` is overwritten with `member` the moment its owner walks
  in — which is exactly the escalation that change was made to close.

  So the probe asks the controller for what it needs: register an owner, create a room, invite a
  participant. Everything over the controller's own HTTP actions, because a long-lived
  `better-sqlite3` connection does not observe another process's commits.
*/
const CONTROL = process.env.CONTROL ?? 'http://localhost:5180';
const STAMP = String(process.hrtime.bigint()).slice(-8);

let controlCookie = '';
async function controlAction(path, name, fields) {
  // `?/default` is reserved; the default action is the bare path.
  const response = await fetch(name ? `${CONTROL}${path}?/${name}` : `${CONTROL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin: CONTROL,
      ...(controlCookie ? { cookie: controlCookie } : {})
    },
    body: new URLSearchParams(fields),
    redirect: 'manual'
  });
  const set = response.headers.get('set-cookie');
  if (set) controlCookie = set.split(';')[0];
  return response;
}

/** Registers an owner, creates a room, invites a participant. Returns both and the short code. */
async function createProbeTenant() {
  const ownerEmail = `roster-owner-${STAMP}@roster-gates.test`;
  const memberEmail = `roster-member-${STAMP}@roster-gates.test`;
  const password = 'roster-gates-e2e';

  await controlAction('/register', null, {
    name: 'Probe Presenter',
    email: ownerEmail,
    password,
    confirm: password,
    agreeTOS: 'on'
  });
  await controlAction('/account', 'createRoom', { name: `Roster Probe Room ${STAMP}` });

  const account = await (
    await fetch(`${CONTROL}/account`, { headers: { cookie: controlCookie } })
  ).text();
  const launchId = account.match(/\/launch\/(\d+)/)?.[1];
  if (!launchId) throw new Error('the controller created no room');

  const launch = await fetch(`${CONTROL}/launch/${launchId}`, {
    headers: { cookie: controlCookie },
    redirect: 'manual'
  });
  const shortCode = new URL(launch.headers.get('location') ?? 'http://x/').searchParams.get('id');
  if (!shortCode) throw new Error('the controller issued no short code');

  await controlAction(`/account/rooms/${launchId}`, 'inviteUser', {
    name: 'Probe Member',
    email: memberEmail
  });

  /*
    Open the roster to viewers.

    `O(44)` is `onlyPresentersVisibleToViewers || rosterVisibleToViewers || isPresenter ||
    hasAdminChat`, and a room the controller has just created has NO settings row, so all of those
    are false for a participant. The member's roster was empty and that was right — they only ever
    saw it before because the probe's "member" was silently arriving as staff.

    A probe about roster gates has to say which room it is testing, so it says so.
  */
  await controlAction(`/account/rooms/${launchId}`, 'saveField', {
    name: 'rosterVisibleToViewers',
    value: 'true'
  });

  /*
    Open it. `createRoom` makes a room `closed`, and a member is refused entry to a closed room —
    so without this the Probe Member never gets in and every roster assertion below sees one
    person. That refusal is the room behaving correctly; a probe about rosters has to put its
    people in a room they can enter.
  */
  await controlAction(`/account/rooms/${launchId}`, 'setState', { state: 'open' });

  return {
    shortCode,
    managePath: `/account/rooms/${launchId}`,
    admin: { email: ownerEmail, displayName: 'Probe Presenter', role: 'admin' },
    member: { email: memberEmail, displayName: 'Probe Member', role: 'member' }
  };
}

/** Removes the tenant this run created, in both databases. */
function removeProbeTenant() {
  const control = new Database(`${process.env.HOME}/Desktop/new-room-control/.data/control.sqlite`);
  control.pragma('foreign_keys = OFF');
  try {
    for (const { id } of control
      .prepare("SELECT id FROM accounts WHERE owner_email LIKE '%@roster-gates.test'")
      .all()) {
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
  } finally {
    control.pragma('foreign_keys = ON');
    control.close();
  }

  db.pragma('foreign_keys = OFF');
  try {
    for (const { id } of db
      .prepare("SELECT id FROM users WHERE email LIKE '%@roster-gates.test'")
      .all()) {
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
    }
    db.prepare('DELETE FROM spent_handoffs').run();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

/*
  Assertions are DELTAS, not absolutes.

  This runs against the live dev server, and the owner's own browser windows are real members of
  the room while it does. An earlier version of this suite asserted an exact roster and spent
  several runs chasing a "ghost user" that was the owner sitting in the room. What the probe
  controls is its own two accounts; what it asserts is what happens to those.
*/
const PROBE_NAMES = ['Probe Presenter', 'Probe Member'];
const onlyProbes = (names) => names.filter((name) => PROBE_NAMES.includes(name)).sort();

const results = [];
const check = (name, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ name, pass, actual, expected });
  console.log(
    `${pass ? '  ok  ' : ' FAIL '} ${name}` +
      (pass
        ? ''
        : `\n         expected ${JSON.stringify(expected)}\n         actual   ${JSON.stringify(actual)}`)
  );
};

/** One browser: its own profile, its own debugging port, its own login. */
async function openBrowser(label, port, account) {
  const profile = `/tmp/e2e-roster-${label}`;
  rmSync(profile, { recursive: true, force: true });
  spawn(
    CHROME,
    [
      `--remote-debugging-port=${port}`,
      '--headless=new',
      '--no-first-run',
      '--disable-gpu',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--window-size=1512,900',
      `--user-data-dir=${profile}`,
      'about:blank'
    ],
    { stdio: 'ignore', detached: true }
  );

  let version;
  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        version = await response.json();
        break;
      }
    } catch {
      /* not up yet */
    }
    await sleep(200);
  }
  if (!version) throw new Error(`${label}: Chrome never came up on ${port}`);

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

  const target = await send('Target.createTarget', {
    url: handoffUrl({
      base: BASE,
      email: account.email,
      name: account.displayName,
      room: ROOM_CODE,
      /*
        Both arrive on a `site` token, and that is the point: the token no longer decides anything.
        The controller's membership does - the owner is role 0 and becomes a presenter, the invited
        participant is role 2 and does not - so sending them the same door proves the room is
        reading the membership rather than the link.
      */
      type: 'site',
      secret: roomJwtSecret()
    })
  });
  const sessionId = (
    await send('Target.attachToTarget', { targetId: target.targetId, flatten: true })
  ).sessionId;
  await send('Runtime.enable', {}, sessionId);
  await sleep(2500);

  const evaluate = async (expression) =>
    (
      await send(
        'Runtime.evaluate',
        { expression, returnByValue: true, awaitPromise: true },
        sessionId
      )
    ).result.value;

  // Entry happened on the navigation above; the handoff needs no form.
  await sleep(4000);

  /*
    `.sidebar-wrapper` is always in the DOM - the sidebar slides in via `.push-wrapper` on the outer
    wrapper, and only the roster LIST is behind `{#if sidebarOpen}`. Testing for the wrapper
    therefore always found it and never clicked anything.
  */
  const openSidebar = async () => {
    await evaluate(`(() => {
      if (document.querySelector('.wrapper.push-wrapper')) return;
      document.querySelector('.sidebar-menu')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    })()`);
    await sleep(900);
  };

  const reload = async () => {
    await send('Page.enable', {}, sessionId);
    await evaluate('location.reload()');
    await sleep(7000);
  };

  return { label, port, evaluate, openSidebar, reload };
}

const killBrowser = (port) => {
  try {
    // By debugging port, not by name: a probe Chrome left running reconnects its EventSource and
    // silently rejoins the roster, which has produced phantom people in this suite before.
    execFileSync('bash', ['-lc', `pkill -f -- "--remote-debugging-port=${port}" || true`]);
  } catch {
    /* nothing to kill */
  }
};

/** Reads the sidebar back: item labels, roster rows, badge, and the control states. */
const READ_SIDEBAR = `(() => {
  const wrapper = document.querySelector('.sidebar-wrapper');
  if (!wrapper || !document.querySelector('.wrapper.push-wrapper')) return { open: false };
  const text = (el) => (el?.textContent ?? '').replace(/\\s+/g, ' ').trim();
  const rows = [...wrapper.querySelectorAll('.room-roster-container')].map((row) => {
    const inner = row.firstElementChild;
    return {
      name: text(row.querySelector('.nickName span')),
      classes: inner ? inner.className : '',
      // \`regUser\` is literally \`!isP\` in the captured class map, so its absence IS the flag.
      isP: inner ? !inner.classList.contains('regUser') : false,
      actions: [...row.querySelectorAll('.users-dropdown-options .dropdown-item')].map(text)
    };
  });
  const sortButton = wrapper.querySelector('button[title="Sort Users"]');
  const search = wrapper.querySelector('#userSearchTermInput');
  return {
    open: true,
    items: [...wrapper.querySelectorAll('a.nav-link.sidebar-item span.pl-2')].map(text),
    archives: [...wrapper.querySelectorAll('#archivesDropdown ~ .dropdown-menu .dropdown-item')].map(text),
    badge: text(wrapper.querySelector('.badge.badge-primary')) || null,
    badgePresent: Boolean(wrapper.querySelector('.badge.badge-primary')),
    rows,
    rowNames: rows.map((row) => row.name),
    sortActive: sortButton ? sortButton.classList.contains('btn-dark') : null,
    trialsTick: Boolean(wrapper.querySelector('.user-options .dropdown-item .fa-check-circle')),
    searchPresent: Boolean(search),
    searchAttrs: search
      ? {
          type: search.type,
          placeholder: search.placeholder,
          ariaLabel: search.getAttribute('aria-label'),
          describedBy: search.getAttribute('aria-describedby'),
          focused: document.activeElement === search
        }
      : null
  };
})()`;

const clickIn = (selector, text) => `(() => {
  const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})];
  const hit = ${text === undefined ? 'nodes[0]' : `nodes.find((n) => (n.textContent ?? '').includes(${JSON.stringify(text)}))`};
  if (!hit) return false;
  hit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return true;
})()`;

console.log(`\nroster gates e2e -> ${BASE}\n`);

removeProbeTenant();
const TENANT = await createProbeTenant();
const { admin: ADMIN, member: MEMBER, shortCode: ROOM_CODE } = TENANT;

killBrowser(9701);
killBrowser(9702);

const admin = await openBrowser('admin', 9701, ADMIN);
const member = await openBrowser('member', 9702, MEMBER);

try {
  // --------------------------------------------------------------------------------------------
  console.log('\n1. the roster shows real people, not just yourself');
  await admin.openSidebar();
  await member.openSidebar();
  await sleep(2500);

  let view = await admin.evaluate(READ_SIDEBAR);
  check('admin sidebar is open', view.open, true);
  check('admin sees BOTH probe accounts, not just itself', onlyProbes(view.rowNames), [
    'Probe Member',
    'Probe Presenter'
  ]);
  check('badge agrees with the rendered list', view.badge, String(view.rowNames.length));

  const memberView = await member.evaluate(READ_SIDEBAR);
  check('the member sees them too', onlyProbes(memberView.rowNames), [
    'Probe Member',
    'Probe Presenter'
  ]);

  // --------------------------------------------------------------------------------------------
  console.log('\n2. row classes come from isP, not from a role string');
  const classesByName = Object.fromEntries(view.rows.map((row) => [row.name, row.classes]));
  check('the admin row is presUser', classesByName['Probe Presenter'], 'presUser');
  // role is 'member' in this database, so `role === "user" ? regUser : presUser` gave this row
  // presUser - a member rendered with the presenter's styling.
  check('the member row is regUser', classesByName['Probe Member'], 'regUser');

  // --------------------------------------------------------------------------------------------
  console.log('\n3. presenter-only items');
  check('admin has Get Random User', view.items.includes('Get Random User'), true);
  check('member does NOT', memberView.items.includes('Get Random User'), false);
  check('admin has Archives', view.archives.length > 0, true);
  check('member has no Archives', memberView.archives.length, 0);

  // --------------------------------------------------------------------------------------------
  console.log('\n4. the four roster-header controls actually do something');
  const beforeSort = (await admin.evaluate(READ_SIDEBAR)).rows.map((row) => ({
    n: row.name,
    isP: row.isP
  }));
  await admin.evaluate(clickIn('button[title="Sort Users"]'));
  await sleep(400);
  view = await admin.evaluate(READ_SIDEBAR);
  check('Sort Users turns the button dark', view.sortActive, true);
  /*
    The expectation is computed with the CAPTURE'S OWN comparator - the one that hands `sort` an
    object whenever either side is a presenter - run over the order actually on screen a moment ago.

    Asserting "the non-presenters come out alphabetical" would be wrong, and did fail here: with a
    presenter sitting between two members, the pair is never compared, so they keep their order.
    That is the captured behaviour, not a defect, and only the captured comparator can predict it.
  */
  const capturedSort = [...beforeSort].sort((left, right) =>
    left.isP ? left : right.isP ? right : left.n.toLowerCase() > right.n.toLowerCase() ? 1 : -1
  );
  check(
    'and reorders exactly as the captured comparator does',
    view.rowNames,
    capturedSort.map((r) => r.n)
  );
  await admin.evaluate(clickIn('button[title="Sort Users"]'));
  await sleep(400);
  check('and toggles back off', (await admin.evaluate(READ_SIDEBAR)).sortActive, false);

  await admin.evaluate(clickIn('button[title="Search Users"]'));
  await sleep(600);
  view = await admin.evaluate(READ_SIDEBAR);
  check('Search Users reveals the input', view.searchPresent, true);
  check('with the captured attributes', view.searchAttrs, {
    type: 'search',
    placeholder: 'Search by nick or email,enter to search',
    ariaLabel: 'Search',
    describedBy: 'addon-search',
    focused: true
  });

  await admin.evaluate(`(() => {
    const input = document.getElementById('userSearchTermInput');
    input.value = 'probe mem';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
  })()`);
  await sleep(500);
  check('Enter filters the list', (await admin.evaluate(READ_SIDEBAR)).rowNames, ['Probe Member']);

  await admin.evaluate(`(() => {
    const input = document.getElementById('userSearchTermInput');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
  })()`);
  await sleep(500);
  check(
    'an empty term restores everyone',
    onlyProbes((await admin.evaluate(READ_SIDEBAR)).rowNames),
    ['Probe Member', 'Probe Presenter']
  );
  await admin.evaluate(clickIn('button[title="Search Users"]'));
  await sleep(300);

  // --------------------------------------------------------------------------------------------
  console.log('\n5. Sort by Trials filters, and shows its tick');
  await admin.evaluate(clickIn('#user-options-btn'));
  await sleep(300);
  await admin.evaluate(clickIn('.user-options .dropdown-item', 'Sort by Trials'));
  await sleep(500);
  view = await admin.evaluate(READ_SIDEBAR);
  check('the tick appears', view.trialsTick, true);
  check(
    'no probe account is a trial yet, so neither survives the filter',
    onlyProbes(view.rowNames),
    []
  );

  /*
    Flagging one and watching them survive the filter used to happen here, with
    `setFlag(MEMBER.id, 'is_free_trial', true)` against a column on this room's `users` table.

    That column is gone. `isFT` is per-room and belongs to the controller's membership row —
    somebody is a trial in one room and not another — so this probe, which only talks to the room,
    can no longer produce one. `scripts/room-config-seam-e2e.mjs` does it end to end: invite a
    member in the controller, apply opcode 6, and read `isFT` back.
  */
  await admin.evaluate(clickIn('.user-options .dropdown-item', 'Sort by Trials'));
  await sleep(400);
  view = await admin.evaluate(READ_SIDEBAR);
  check('toggling off restores everyone', onlyProbes(view.rowNames), [
    'Probe Member',
    'Probe Presenter'
  ]);
  check('and clears the tick', view.trialsTick, false);

  // --------------------------------------------------------------------------------------------
  console.log('\n6. Get Random User needs two candidates');
  const randomUserState = async () =>
    admin.evaluate(`(() => {
      const dialog = document.querySelector('.bootbox.random-user-modal');
      if (!dialog) return { open: false };
      return {
        open: true,
        title: (dialog.querySelector('.modal-title')?.textContent ?? '').trim(),
        hasGiphy: Boolean(dialog.querySelector('.bootbox-body img')),
        revealed: Boolean(dialog.querySelector('.bootbox-body h2')),
        name: (dialog.querySelector('.bootbox-body h2')?.textContent ?? '').trim(),
        buttons: [...dialog.querySelectorAll('.modal-footer button')].map((b) => b.textContent.trim())
      };
    })()`);

  /*
    The `< 2` branch is covered exhaustively in `roster-gates.test.ts`; what needs a real browser is
    the two-phase dialog, because the three-second reveal is a timer and a DOM swap.
  */
  await admin.evaluate(clickIn('a[title="Get Random User"]'));
  await sleep(600);
  check(
    'it asks about trials first',
    await admin.evaluate(
      `(() => { const b = document.querySelector('.bootbox-confirm .bootbox-body');
                return b ? b.textContent.trim() : null })()`
    ),
    'Only select from Trials?'
  );

  /*
    Which branch to assert is decided by the LIVE roster, not by an assumption about who is here.

    `randomUser` opens nothing below two candidates - `if (o >= 2)` with no else - so the outcome
    depends on how many non-presenters happen to be in the room. An earlier version of this assumed
    two and failed six checks when the owner's own browser was not open, which is the room behaving
    exactly as captured. The boundary itself is covered exhaustively in `roster-gates.test.ts`;
    what needs a browser is whichever branch is actually reachable right now.
  */
  const candidates = (await admin.evaluate(READ_SIDEBAR)).rows.filter((row) => !row.isP).length;
  console.log(`       non-presenters in the room: ${candidates}`);

  // "No" - the draw still runs, over every non-presenter.
  await admin.evaluate(clickIn('.bootbox-confirm .bootbox-cancel'));
  await sleep(900);
  let draw = await randomUserState();

  if (candidates < 2) {
    check('fewer than two candidates opens no dialog at all', draw.open, false);
  } else {
    check('the dialog opens', draw.open, true);
    check('titled Random User', draw.title, 'Random User');
    check('showing the spinner, name hidden', [draw.hasGiphy, draw.revealed], [true, false]);
    check('with Close only', draw.buttons, ['Close']);

    await sleep(3200);
    draw = await randomUserState();
    check('after three seconds the name is revealed', draw.revealed, true);
    check('and it is a real non-presenter from the roster', draw.name !== 'Probe Presenter', true);
    check('and User Info appears alongside Close', draw.buttons, ['User Info', 'Close']);
    await admin.evaluate(clickIn('.random-user-modal .btn-danger'));
    await sleep(400);
    check('Close dismisses it', (await randomUserState()).open, false);
  }

  // --------------------------------------------------------------------------------------------
  console.log('\n7. isLimitedPresenter narrows the user-info modal');
  /*
    Two controls, both `isPresenter && !isLimitedPresenter` in the capture and both bare
    `isPresenter` here until now:

      O(9)   the pencil beside the nickname. A full presenter renames somebody else
             (`editUsername`); a limited one falls through to `canEditUsername`, which is a
             DIFFERENT action - `editUsernameByUser`, the member renaming themselves.
      O(14)  the whole administrative body: System, Actions and Admin Notes, the IP, the stream
             server, the permission checkboxes.

    Only the FULL-presenter side is asserted here. Flipping `isLimitedPresenter` needs the
    `giveMicScreen` command, and the control that sends it has not been located in the decoded
    template - the receiving half is built and dispatched, the sender is `TODO.md` gap 24. Both
    predicates are driven through every combination in `src/lib/roster-gates.test.ts`.
  */
  const userInfoState = async () =>
    admin.evaluate(`(() => {
      const modal = document.querySelector('#userInfoModal.show, .modal.show');
      if (!modal) return { open: false };
      return {
        open: true,
        pencil: !!modal.querySelector('.edit-username'),
        adminBody: !!modal.querySelector('#nav-tab')
      };
    })()`);

  /*
    The avatar, not the name.

    A single click on `.nickName span` is `mentionRosterUser`; `openRosterUserInfo` is the avatar's
    click and the name's DOUBLE click. An earlier version clicked the name and reported the modal
    as not opening, which was the roster behaving exactly as built.
  */
  const openUserInfo = async () => {
    await admin.evaluate(clickIn('.room-roster-container img.rosterImg'));
    await sleep(1500);
  };
  await openUserInfo();
  const full = await userInfoState();
  check('a full presenter sees the rename pencil', full.pencil, true);
  check('and the administrative body', full.adminBody, true);
  await admin.evaluate(clickIn('.modal.show .btn-secondary'));
  await sleep(500);

  /*
    Two sections stood here and have been removed rather than left asserting on dead columns.

      7. `hasAdminChat` revealing the roster in a closed room
      8. a LIMITED presenter losing Archives

    Both drove `users.has_admin_chat` and `users.is_limited_presenter`, which no longer exist.
    `hasAdminChat` is one of the controller's five per-room `permissions_json` keys, and
    `isLimitedPresenter` is not stored anywhere at all — `giveMicScreen` assigns it at runtime, so
    it is what a member becomes when a presenter hands them mic and screen.

    The gates themselves are covered exhaustively in `src/lib/roster-gates.test.ts`, which drives
    `rosterRowVisible` and `archivesAvailableTo` through every combination. What a browser adds is
    that the gate is wired to the rendered DOM, and for these two that wiring now runs through the
    controller: `scripts/room-config-seam-e2e.mjs` is where it belongs.
  */

  // --------------------------------------------------------------------------------------------
  console.log('\n8. Transcript History is no longer a dead link');
  await admin.evaluate(clickIn('#archivesDropdown'));
  await sleep(300);
  await admin.evaluate(clickIn('.dropdown-item.small', 'Transcript History'));
  await sleep(600);
  const transcript = await admin.evaluate(
    `(() => { const b = document.querySelector('.bootbox.bootbox-alert .bootbox-body');
              return b ? b.textContent.trim().slice(0, 40) : null })()`
  );
  check(
    'it reports the honest gap instead of doing nothing',
    transcript?.startsWith('The transcript page is not available'),
    true
  );
} finally {
  killBrowser(9701);
  killBrowser(9702);
  removeProbeTenant();
  db.close();
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} passed\n`);
process.exit(passed === results.length ? 0 : 1);
