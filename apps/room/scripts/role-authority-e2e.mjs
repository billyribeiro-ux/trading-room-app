/**
 * Who the room thinks you are, and who the controller says you are.
 *
 * The room had two notions of "presenter" and the gates read the wrong one.
 *
 *   `isPresenter` — every gate, and every presenter-only server action — is
 *                   `data.user.role === 'staff' || 'admin'`, and that role came from the HANDOFF
 *                   TOKEN TYPE: `/session` mapped `type: 'site'` to `staff`.
 *   `isP`         — the controller's per-room membership: role 0 Owner, or role 1 without the
 *                   admin discriminator.
 *
 * A token type says how you arrived. A membership says what you are. `requireOwnedRoom` lets any
 * user in the ACCOUNT reach `/launch/[id]`, and `inviteRoomUser` puts an invited participant in
 * that same account — so a role 2 Participant could launch, arrive as `staff`, and be a presenter
 * in a room the controller says they are a participant in.
 *
 * This asserts the membership wins. It is written to fail against the version that mapped role
 * from the token type.
 *
 *   CONTROL=http://localhost:5180 ROOM=http://localhost:5174 node scripts/role-authority-e2e.mjs
 */
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';

const CONTROL = process.env.CONTROL ?? 'http://localhost:5180';
const ROOM = process.env.ROOM ?? 'http://localhost:5174';
const CONTROL_DB = `${process.env.HOME}/Desktop/new-room-control/.data/control.sqlite`;

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

const secret = readFileSync('.env', 'utf8')
  .split('\n')
  .find((line) => line.startsWith('ROOM_JWT_SECRET='))
  .slice('ROOM_JWT_SECRET='.length)
  .trim();

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Exactly what `/launch/[id]` mints — a `site` token, for anybody in the account. */
function siteToken(name, email) {
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const payload = b64({
    name,
    email,
    id: '1',
    type: 'site',
    jti: randomUUID(),
    exp: Math.floor(Date.now() / 1000) + 60
  });
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${payload}.${signature}`;
}

/** The controller's own view, signed the way the room signs it. */
async function controllerMember(shortCode, email) {
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

const room = new Database('.data/proroom.sqlite');

const STAMP = String(process.hrtime.bigint()).slice(-8);
const OWNER = { email: `owner-${STAMP}@role-authority.test`, password: 'role-authority-e2e' };
const PARTICIPANT = `participant-${STAMP}@role-authority.test`;
const GUEST = `guest-${STAMP}@role-authority.test`;

/**
 * Everything in the controller goes through its own HTTP actions.
 *
 * An earlier version of this probe inserted the membership straight into `control.sqlite`. The row
 * was correct and the running controller could not see it: `getDb()` is a module-level singleton
 * and a long-lived `better-sqlite3` connection does not reliably observe another process's
 * commits. The comment claiming otherwise was an assumption, and it made the probe report the
 * controller as having no such member.
 */
let controlCookie = '';
async function action(path, name, fields) {
  /*
    A NAMED action is `?/name`; the default one is the bare path.

    `?/default` is reserved and SvelteKit throws on it, which surfaced as a 500 that looked like
    the register action failing. It had not run at all.
  */
  const url = name ? `${CONTROL}${path}?/${name}` : `${CONTROL}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      // SvelteKit rejects a cross-origin form POST; without this the action 500s before it runs.
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

function cleanupRoom() {
  room.pragma('foreign_keys = OFF');
  try {
    for (const { id } of room
      .prepare("SELECT id FROM users WHERE email LIKE '%@role-authority.test'")
      .all()) {
      room.prepare('DELETE FROM users WHERE id = ?').run(id);
    }
    room.prepare('DELETE FROM spent_handoffs').run();
  } finally {
    room.pragma('foreign_keys = ON');
  }
}

console.log(`\nrole authority:  ${CONTROL}  ->  ${ROOM}\n`);
cleanupRoom();

try {
  // ── a room, and a participant in it, both made by the controller ──────────────────────────
  check(
    'registered an owner',
    (
      await action('/register', null, {
        name: 'Role Probe Owner',
        email: OWNER.email,
        password: OWNER.password,
        confirm: OWNER.password,
        agreeTOS: 'on'
      })
    ).status,
    // A form POST is answered with 200 and a JSON envelope describing the redirect, not a bare 303.
    200
  );

  await action('/account', 'createRoom', { name: `Role Probe Room ${STAMP}` });

  const account = await (
    await fetch(`${CONTROL}/account`, { headers: { cookie: controlCookie } })
  ).text();
  const launchId = account.match(/\/launch\/(\d+)/)?.[1];
  check('the room exists', launchId !== undefined, true);

  const managePath = `/account/rooms/${launchId}`;
  /*
    The short code from the launch redirect, not scraped off the page.

    A regex for four digits matches the first one it finds, which on the account page is not
    necessarily the room. Following `/launch/{id}` gives the code the controller itself puts in the
    handoff URL, which is by definition the right one.
  */
  const launch = await fetch(`${CONTROL}/launch/${launchId}`, {
    headers: { cookie: controlCookie },
    redirect: 'manual'
  });
  const shortCode = new URL(launch.headers.get('location') ?? 'http://x/').searchParams.get('id');
  check('and has a short code', /^\d{4}$/.test(shortCode ?? ''), true);

  /*
    Open it. `createRoom` makes a room `closed`, and a member is now refused entry to one —
    which is what the last section of this probe asserts. Everything between here and there is
    about ROLE, so the room has to be open for any of it to be reachable.
  */
  await action(managePath, 'setState', { state: 'open' });

  check(
    'the controller invites a participant',
    (await action(managePath, 'inviteUser', { name: 'Role Probe Participant', email: PARTICIPANT }))
      .status,
    200
  );

  const member = await controllerMember(shortCode, PARTICIPANT);
  check('who it calls a participant', member?.role, 2);
  check('and not a presenter', member?.isP, false);

  // ── they are in the owner's ACCOUNT, so they can reach /launch/[id] ────────────────────────
  /*
    `requireOwnedRoom` compares `room.accountId` against the user's, and `inviteRoomUser` puts an
    invited member in that same account. So this token is exactly what the controller would mint
    for them.
  */
  const response = await fetch(
    `${ROOM}/session?id=${shortCode}&jwtSite=${siteToken('Role Probe Participant', PARTICIPANT)}`,
    { redirect: 'manual' }
  );
  check('the room lets them in', response.status, 303);

  const localRole = room.prepare('SELECT role FROM users WHERE email = ?').get(PARTICIPANT)?.role;
  console.log(`       the room recorded their role as: ${localRole}`);
  /*
    The whole point. `isPresenter` is `role === 'staff' || 'admin'`, and it gates Archives, Get
    Random User, the user-info modal's administrative body, posting alerts, running polls and every
    presenter command. A participant must not arrive holding any of that.
  */
  check('the room does NOT make them staff', localRole === 'staff' || localRole === 'admin', false);

  const cookie = response.headers.get('set-cookie')?.split(';')[0] ?? '';
  const payload = await (await fetch(`${ROOM}/`, { headers: { cookie } })).text();
  check('nor does the page payload', /a\.role\s*=\s*"(staff|admin)"/.test(payload), false);
  check('and it agrees with the controller about isP', /a\.isP\s*=\s*false/.test(payload), true);

  // ── the owner of the same room IS a presenter ─────────────────────────────────────────────
  const ownerEntry = await fetch(
    `${ROOM}/session?id=${shortCode}&jwtSite=${siteToken('Role Probe Owner', OWNER.email)}`,
    { redirect: 'manual' }
  );
  check('the owner is let in too', ownerEntry.status, 303);
  const ownerRole = room.prepare('SELECT role FROM users WHERE email = ?').get(OWNER.email)?.role;
  // Role 0 in the controller. The room only distinguishes presenter from not, and an owner is one.
  check('and IS a presenter, so the fix is not simply "nobody is"', ownerRole, 'admin');
  // ── a role change has to reach a LIVE session ─────────────────────────────────────────────
  console.log('');
  /*
    `/session` writes the role once, at entry, and seventeen server actions authorise against it.
    A session can stay open for hours, so without reconciliation an owner demoting somebody in the
    controller changes nothing until that person happens to re-enter — they keep Archives, Get
    Random User, posting alerts, running polls and every presenter command in the meantime.

    Tested in the direction that matters: losing powers.
  */
  const participantRow = await (async () => {
    const manage = await (
      await fetch(`${CONTROL}${managePath}`, { headers: { cookie: controlCookie } })
    ).text();
    return (
      manage.match(/aria-label="Select Role Probe Participant"[^>]*value="(\d+)"/)?.[1] ?? null
    );
  })();
  check('the participant is selectable in the user list', participantRow !== null, true);

  if (participantRow) {
    // Opcode 1 is Presenter.
    await action(managePath, 'updateUser', { op: '1', roomUserId: participantRow });
    const promoted = await fetch(
      `${ROOM}/session?id=${shortCode}&jwtSite=${siteToken('Role Probe Participant', PARTICIPANT)}`,
      { redirect: 'manual' }
    );
    const liveCookie = promoted.headers.get('set-cookie')?.split(';')[0] ?? '';
    check(
      'promoted in the controller, they enter as a presenter',
      room.prepare('SELECT role FROM users WHERE email = ?').get(PARTICIPANT)?.role,
      'staff'
    );

    // Opcode 2 is Participant. The session stays open throughout.
    await action(managePath, 'updateUser', { op: '2', roomUserId: participantRow });
    await fetch(`${ROOM}/`, { headers: { cookie: liveCookie } });
    check(
      'demoted mid-session, the next load takes it away',
      room.prepare('SELECT role FROM users WHERE email = ?').get(PARTICIPANT)?.role,
      'member'
    );

    // ── banned is refused at the door ───────────────────────────────────────────────────────
    console.log('');
    // Opcode 4 is BANNED: `applyUserOpcode` writes role 4 and the `banned` column together.
    await action(managePath, 'updateUser', { op: '4', roomUserId: participantRow });
    check(
      'the controller marks them banned',
      (await controllerMember(shortCode, PARTICIPANT))?.banned,
      true
    );

    const refused = await fetch(
      `${ROOM}/session?id=${shortCode}&jwtSite=${siteToken('Role Probe Participant', PARTICIPANT)}`,
      { redirect: 'manual' }
    );
    // Without this the room admitted them as an ordinary member and never looked at the flag.
    check('and the room refuses them at the door', refused.status, 403);
    check('issuing no session', refused.headers.get('set-cookie'), null);
  }
  // ── a closed room turns a member away, and lets a presenter in ────────────────────────────
  console.log('');
  /*
    The controller's own guest login refuses a closed room ("This room is closed."), and nothing in
    the room's shipped bundle knows about room state at all — so that login is the whole of what
    the capture establishes, and the room had been ignoring the `state` its config read returns.

    A presenter is let through. That half is a decision, recorded as one in
    `$lib/server/room-role`: they are who opens the room, a room on `autoOpenTime` has to be
    prepared before it opens, and the account page offers Launch whatever the state.
  */
  const reopen = async (state) => {
    await action(managePath, 'setState', { state });
    return (await controllerMember(shortCode, OWNER.email)) !== null;
  };

  // Re-invite: the participant was banned by the section above.
  await action(managePath, 'inviteUser', { name: 'Role Probe Guest', email: GUEST });
  await reopen('closed');

  const memberIntoClosed = await fetch(
    `${ROOM}/session?id=${shortCode}&jwtSite=${siteToken('Role Probe Guest', GUEST)}`,
    { redirect: 'manual' }
  );
  check('a member is refused entry to a closed room', memberIntoClosed.status, 403);
  check('with no session issued', memberIntoClosed.headers.get('set-cookie'), null);

  const ownerIntoClosed = await fetch(
    `${ROOM}/session?id=${shortCode}&jwtSite=${siteToken('Role Probe Owner', OWNER.email)}`,
    { redirect: 'manual' }
  );
  check('the presenter who has to open it still gets in', ownerIntoClosed.status, 303);

  // ── and a room closing UNDER somebody ends their session ──────────────────────────────────
  await reopen('open');
  const live = await fetch(
    `${ROOM}/session?id=${shortCode}&jwtSite=${siteToken('Role Probe Guest', GUEST)}`,
    { redirect: 'manual' }
  );
  const liveCookie = live.headers.get('set-cookie')?.split(';')[0] ?? '';
  check(
    'they get in while it is open',
    (await fetch(`${ROOM}/`, { headers: { cookie: liveCookie } })).status,
    200
  );

  await reopen('closed');
  const afterClose = await fetch(`${ROOM}/`, {
    headers: { cookie: liveCookie },
    redirect: 'manual'
  });
  // `hooks.server.ts` cannot see the room's state; the next load can, and it ends the session.
  check('and are put out when it closes under them', afterClose.status, 303);
} finally {
  cleanupRoom();
  room.close();
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} passed\n`);
process.exit(passed === results.length ? 0 : 1);
