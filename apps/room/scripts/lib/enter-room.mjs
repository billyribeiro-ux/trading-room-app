/**
 * Getting a probe into the room, now that the room has no login of its own.
 *
 * The controller is the front door: `new-room-control` mints a short-lived, single-use HS256
 * token and redirects to `/session?id=…&jwtSite=…`. Every probe in `scripts/` used to POST to
 * `/login` with an email and password; that route is gone, so they all come through here instead.
 *
 * One helper rather than six copies of the same signing code — six copies is how the probes and
 * the application drift apart without anyone noticing.
 */
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * The shared secret, read from the room's own `.env`.
 *
 * Deliberately not a constant in this file: if the two applications are configured with different
 * secrets, a probe should fail the same way a real handoff would, rather than passing against a
 * value only the probes agree on.
 */
export function roomJwtSecret(envPath = '.env') {
  const line = readFileSync(envPath, 'utf8')
    .split('\n')
    .find((entry) => entry.startsWith('ROOM_JWT_SECRET='));
  if (!line) throw new Error(`${envPath} has no ROOM_JWT_SECRET; the room cannot accept a handoff`);
  const secret = line.slice('ROOM_JWT_SECRET='.length).trim();
  if (!secret) throw new Error(`${envPath} has an empty ROOM_JWT_SECRET`);
  return secret;
}

const base64Url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

/**
 * Mints what the controller would mint.
 *
 * Mirrors `new-room-control/src/lib/server/room-handoff.ts` rather than importing it: the two
 * applications deploy separately, so what matters is that two independent implementations agree
 * on the wire. `scripts/two-app-seam-e2e.mjs` drives the real controller and proves that they do.
 */
export function mintHandoff({
  secret,
  email,
  name = 'Probe User',
  /** `site` for an account launching its own room, `guest` for someone who passed the room login. */
  type = 'site',
  id = type === 'guest' ? '' : '1',
  ttlSeconds = 60
}) {
  const header = base64Url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64Url({
    name,
    email,
    id,
    type,
    // Fresh every time. The room records spent ids, so a probe that reused one would be refused —
    // correctly, and confusingly, if the helper handed out a constant.
    jti: randomUUID(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  });
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${payload}.${signature}`;
}

/** The URL that enters the room as `email`. */
export function handoffUrl({ base, email, room = '3625', ...options }) {
  const token = mintHandoff({ email, ...options });
  return `${base}/session?id=${encodeURIComponent(room)}&jwtSite=${token}`;
}

/**
 * Enters the room over `fetch` and returns the session cookie, for probes that do not drive a
 * browser. Throws rather than returning a falsy cookie, so a broken handoff surfaces here instead
 * of as a confusing 403 three steps later.
 */
export async function enterRoomWithFetch({ base, email, name, type, room = '3625', secret }) {
  const response = await fetch(handoffUrl({ base, email, name, type, room, secret }), {
    redirect: 'manual'
  });
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  if (!cookie) {
    throw new Error(
      `handoff refused for ${email}: HTTP ${response.status} ${await response.text()}`
    );
  }
  return cookie;
}

/**
 * Enters the room in a CDP-driven browser.
 *
 * `navigate` is the probe's own navigation function — the probes differ in how they wrap CDP, so
 * the helper takes the one call it needs rather than assuming a shape.
 */
export async function enterRoomInBrowser({
  navigate,
  base,
  email,
  name,
  type,
  room = '3625',
  secret
}) {
  await navigate(handoffUrl({ base, email, name, type, room, secret }));
}
