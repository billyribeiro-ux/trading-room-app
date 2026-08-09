/**
 * The handoff seam, end to end, over real HTTP.
 *
 * `new-room-control` mints a token; this room is the only thing that accepts one. Everything here
 * is asserted against the running server's actual response — status codes, `Set-Cookie`, and the
 * rows the room writes — rather than against the verifier in isolation, which
 * `src/lib/handoff-token.test.ts` already covers branch by branch.
 *
 *   ROOM=http://localhost:5174 node scripts/handoff-e2e.mjs
 *
 * The signing here deliberately mirrors `new-room-control/src/lib/server/room-handoff.ts` rather
 * than importing it: the point is to prove two independently written implementations agree on the
 * wire, which is the only thing that matters when they run as separate deployments.
 */
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';

const ROOM = process.env.ROOM ?? 'http://localhost:5174';
const DB_PATH = '.data/proroom.sqlite';

/** Read from the room's own `.env`, so a mismatch between the two sides shows up as a failure. */
function secretFromEnvFile(path) {
  const line = readFileSync(path, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('ROOM_JWT_SECRET='));
  if (!line) throw new Error(`${path} has no ROOM_JWT_SECRET`);
  return line.slice('ROOM_JWT_SECRET='.length).trim();
}

const SECRET = secretFromEnvFile('.env');

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

function mint({
  type = 'site',
  name = 'Handoff Owner',
  email,
  id = '7',
  ttl = 60,
  secret = SECRET
} = {}) {
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const payload = b64({
    name,
    email,
    id,
    type,
    jti: randomUUID(),
    exp: Math.floor(Date.now() / 1000) + ttl
  });
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${payload}.${signature}`;
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

/** `redirect: 'manual'` — the redirect IS the result, so following it would hide it. */
const enter = (token, room = '3625') =>
  fetch(`${ROOM}/session?id=${room}&jwtSite=${token}`, { redirect: 'manual' });

const db = new Database(DB_PATH);
const PROBE_DOMAIN = '@handoff-e2e.test';
const cleanup = () => {
  db.pragma('foreign_keys = OFF');
  try {
    const ids = db
      .prepare('SELECT id FROM users WHERE email LIKE ?')
      .all(`%${PROBE_DOMAIN}`)
      .map((r) => r.id);
    for (const id of ids) db.prepare('DELETE FROM users WHERE id = ?').run(id);
    db.prepare('DELETE FROM spent_handoffs').run();
  } finally {
    db.pragma('foreign_keys = ON');
  }
};

console.log(`\nhandoff e2e -> ${ROOM}\n`);
cleanup();

try {
  // ── the happy path ────────────────────────────────────────────────────────────────────────
  console.log('1. a token the controller would mint');
  const ownerEmail = `owner${PROBE_DOMAIN}`;
  const token = mint({ email: ownerEmail });
  const first = await enter(token);
  check('is accepted with a redirect into the room', first.status, 303);
  check('and lands on the room it names', first.headers.get('location'), '/?room=3625');

  const cookie = first.headers.get('set-cookie') ?? '';
  check('issues the room session cookie', cookie.startsWith('ptr_connection='), true);
  check('httpOnly, so script cannot read it', /httponly/i.test(cookie), true);
  check(
    'SameSite=Lax, so the cross-site redirect still carries it',
    /samesite=lax/i.test(cookie),
    true
  );

  const session = cookie.split(';')[0];
  const room = await fetch(`${ROOM}/?room=3625`, {
    headers: { cookie: session },
    redirect: 'manual'
  });
  check('and that cookie actually opens the room', room.status, 200);

  const account = db
    .prepare('SELECT display_name, role, status, password_hash FROM users WHERE email = ?')
    .get(ownerEmail);
  check('creates the account from the token', account?.display_name, 'Handoff Owner');
  /*
    `member`, NOT `staff`, and this assertion is the fix rather than a relaxation.

    It read "as staff, because the token said site", which encoded a privilege escalation: a token
    type says how somebody arrived, and it was being used to decide what they are. These probe
    accounts have no membership in the controller, so the controller says nothing about them, so
    the room grants them nothing. `scripts/role-authority-e2e.mjs` drives the other side — a real
    participant stays a member, a real owner becomes one.
  */
  check('as a member, because no controller membership says otherwise', account?.role, 'member');
  check(
    'with no local password — this account cannot be logged into',
    account?.password_hash,
    null
  );

  // ── replay ────────────────────────────────────────────────────────────────────────────────
  console.log('\n2. the same token, a second time');
  const replay = await enter(token);
  check('is refused', replay.status, 403);
  check('and issues no cookie', replay.headers.get('set-cookie'), null);

  // ── forgery ───────────────────────────────────────────────────────────────────────────────
  console.log('\n3. tokens the controller did not mint');
  check('a tampered signature is refused', (await enter(`${token.slice(0, -1)}X`)).status, 403);
  check(
    'another secret is refused',
    (await enter(mint({ email: `forged${PROBE_DOMAIN}`, secret: 'not-the-secret' }))).status,
    403
  );
  check(
    'an expired token is refused',
    (await enter(mint({ email: `stale${PROBE_DOMAIN}`, ttl: -300 }))).status,
    403
  );
  check(
    'no token at all is refused',
    (await fetch(`${ROOM}/session`, { redirect: 'manual' })).status,
    403
  );

  const promoted = mint({ type: 'guest', email: `promoted${PROBE_DOMAIN}`, id: '1' });
  check('a guest claiming an account id is refused', (await enter(promoted)).status, 403);

  check(
    'none of those created an account',
    db.prepare('SELECT count(*) c FROM users WHERE email LIKE ?').get(`%${PROBE_DOMAIN}`).c,
    1
  );

  // ── the guest door ────────────────────────────────────────────────────────────────────────
  console.log('\n4. the guest door');
  const guestEmail = `guest${PROBE_DOMAIN}`;
  const guest = await enter(mint({ type: 'guest', name: 'Sam Guest', email: guestEmail, id: '' }));
  check('a guest is let in', guest.status, 303);
  const guestRow = db.prepare('SELECT role FROM users WHERE email = ?').get(guestEmail);
  // A guest has no membership by definition, so there is nothing that could make them a presenter.
  check('as a plain member', guestRow?.role, 'member');

  /*
    A section stood here asserting that a `site` token PROMOTES and a `guest` token never demotes.

    It has gone because the reasoning under it was wrong, not because it became inconvenient. It
    reasoned about the DOOR — which link you came through — when the question is about the
    MEMBERSHIP. With the controller as the authority, role follows the membership on every entry in
    both directions: a promotion there reaches the room, and so must a demotion. A one-way ratchet
    would mean somebody stripped to Participant in the controller stayed a presenter here forever.

    `scripts/role-authority-e2e.mjs` asserts the replacement, against real controller memberships.
  */

  // ── one channel per room ──────────────────────────────────────────────────────────────────
  console.log('\n5. the realtime channel belongs to one room');
  /*
    The channel key was the constant `ptr-room`, justified in the source by "this one has exactly
    one [room]". That stopped being true when the controller became the front door: it creates as
    many rooms as an owner wants. One shared channel meant every room's alerts, chat, roster and
    presenter commands reaching every other room's members.

    The server keys the subscription off the SESSION, so the path is a label and cannot be used to
    join a room you were not handed into.
  */
  const sessionCookie = (await enter(mint({ email: `channel${PROBE_DOMAIN}` }))).headers
    .get('set-cookie')
    ?.split(';')[0];

  const sse = (room) =>
    fetch(`${ROOM}/sess/${room}/events`, {
      headers: { cookie: sessionCookie ?? '' },
      signal: AbortSignal.timeout(2000)
    })
      .then((r) => r.status)
      .catch(() => 'timeout');

  // 200: fetch resolves as soon as the headers arrive, and an SSE stream sends them immediately.
  // The abort only ever fires while reading the body, which this never does.
  check('the session can subscribe to its own room', await sse('3625'), 200);
  check('but not to another one', await sse('9999'), 403);
  check('nor to the old shared constant', await sse('ptr-room'), 403);

  // ── the retired login ─────────────────────────────────────────────────────────────────────
  console.log('\n6. the room has no login of its own');
  const login = await fetch(`${ROOM}/login`, { redirect: 'manual' });
  check('/login is gone, and the guard answers first', login.status, 403);
} finally {
  cleanup();
  db.close();
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} passed\n`);
process.exit(passed === results.length ? 0 : 1);
