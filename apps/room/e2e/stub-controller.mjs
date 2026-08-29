import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

/**
 * The control plane, as far as a browser test needs one.
 *
 * ## Why a stub and not the real controller
 *
 * The room fails CLOSED without its configuration — `room-config-client.ts` says so in as many
 * words, because serving default settings under the impression they are the owner's is worse than
 * an error. So the room cannot render a single page without something answering
 * `/internal/room-config/<shortCode>`.
 *
 * The real controller would bring PostgreSQL, migrations, an account, a room row and a launch flow
 * into a job whose subject is **whether the room renders**. `apps/controller` already has its own
 * end-to-end job against a real cluster, and that is where the controller's own behaviour belongs.
 * Two services in one job would mean every room-render failure had two possible causes.
 *
 * ## IT VERIFIES THE BEARER, and that is the half that makes it a test rather than scaffolding
 *
 * A stub that answered every request would prove only that the room can parse JSON. This one
 * recomputes the `config-read:<shortCode>.<issuedAt>` HMAC the room is supposed to have minted and
 * refuses anything else with 401 — so the capability seam is exercised by every page load in the
 * suite, and a room that stopped signing correctly would fail here rather than in production.
 *
 * It also refuses a `config-write:` token on this read route, which is the boundary
 * `config-write-capability-contract.test.ts` asserts in source and this asserts in traffic.
 *
 * ## What it deliberately does NOT do
 *
 * No database, no state, no room registry. Any short code is a room, and the settings it returns
 * come from `ROOM_SETTINGS_JSON` in the environment, so a spec can ask for a room with the compact
 * renderer on and the next spec can ask for one with it off without this file knowing either
 * feature exists.
 *
 * ## The two routes, and why the second one was a surprise worth recording
 *
 * `/internal/room-config/<code>` is the one every page load needs. `/internal/room-entry/<code>` is
 * the LOGIN decision, and it was discovered by building this stub without it and watching the room
 * refuse to let anyone in — correctly, with a 503, because `decideRoomEntryRemotely` fails closed and
 * "cannot reach the controller" is not "yes". That is the room's own design working, and it is the
 * first time anything in this repository has exercised that path end to end.
 *
 * `ROOM_ENTRY_REFUSE` makes the stub answer `{ok:false}` instead, so a spec can assert that a refused
 * entry keeps somebody out — a branch no unit test can reach, because it lives across two processes.
 */

const PORT = Number(process.env.STUB_CONTROL_PORT ?? 5199);
const SECRET = process.env.ROOM_JWT_SECRET ?? '';

/** The room's own `domainToken`, recomputed rather than trusted. */
const expectedToken = (domain, shortCode, issuedAt) =>
  createHmac('sha256', SECRET)
    .update(`${domain}:${shortCode}.${issuedAt}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/**
 * Whether the presented bearer is a `config-read` capability for this room.
 *
 * Constant-time, matching the room's own verifier — not because a timing attack on a test stub
 * matters, but because a harness that models the seam loosely teaches the wrong shape to whoever
 * copies it next.
 */
const authorised = (header, shortCode) => {
  if (!SECRET) return false;
  const bearer = /^Bearer (.+)$/.exec(header ?? '')?.[1];
  if (!bearer) return false;
  const [issuedAt, signature] = bearer.split('.');
  if (!issuedAt || !signature) return false;

  const expected = expectedToken('config-read', shortCode, issuedAt);
  const presented = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  return presented.length === wanted.length && timingSafeEqual(presented, wanted);
};

/**
 * Settings, per room code, with a default.
 *
 * `ROOM_SETTINGS_JSON` is the settings every room gets. `ROOM_SETTINGS_BY_CODE_JSON` overrides them
 * for named short codes — `{"hidden": {"hideChatAlerts": true}}` — and the override REPLACES rather
 * than merges, because a partial merge would make a spec's settings depend on what the default
 * happened to contain that week.
 *
 * ## Why per code rather than per run
 *
 * A setting that gates a whole column has to be observed BOTH ways to mean anything: a spec that
 * only ever sees it on cannot tell "the column is hidden" from "the column was never built". Two
 * Playwright projects with two environments would do it, at the cost of a second full server boot
 * and a suite where the two halves of one assertion live in different runs.
 *
 * Keying on the short code costs nothing and is what a real controller does — `any short code is a
 * room` was already true here. One page load asks for `hidden`, the next asks for a default room,
 * and the two answers come back in the same run with no shared mutable state between them. It is
 * also race-free by construction rather than by the `workers: 1` this suite happens to set.
 */
const defaultSettings = JSON.parse(process.env.ROOM_SETTINGS_JSON ?? '{}');
const settingsByCode = JSON.parse(process.env.ROOM_SETTINGS_BY_CODE_JSON ?? '{}');
const settingsFor = (shortCode) =>
  Object.prototype.hasOwnProperty.call(settingsByCode, shortCode)
    ? settingsByCode[shortCode]
    : defaultSettings;

/** The `RoomConfig` shape `readRoomConfig` validates, with a presenter as the connected member. */
const configFor = (shortCode, email) => ({
  room: {
    shortCode,
    name: `E2E Room ${shortCode}`,
    state: 'open',
    logoUrl: null,
    publicId: null,
    maxUsers: 0
  },
  settings: settingsFor(shortCode),
  locked: [],
  member: {
    displayName: 'E2E Presenter',
    email: email ?? '',
    role: 2,
    nonPresenter: false,
    isP: true,
    isNonPresenterAdmin: false,
    isFT: false,
    denyArchivesAccess: false,
    restrictPmUser: false,
    muted: false,
    banned: false,
    permissions: {
      hasMic: true,
      hasScreen: true,
      hasCam: true,
      hasAdminChat: true,
      canEditNotes: true
    }
  }
});

const json = (response, status, body) => {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${PORT}`);
  const config = /^\/internal\/room-config\/([^/]+)$/.exec(url.pathname);
  const entry = /^\/internal\/room-entry\/([^/]+)$/.exec(url.pathname);
  const match = config ?? entry;

  if (!match) {
    response.writeHead(404).end();
    return;
  }

  const shortCode = decodeURIComponent(match[1]);
  if (!authorised(request.headers.authorization, shortCode)) {
    // The same answer the real controller gives, so a mis-signed room fails the same way here.
    json(response, 401, { error: 'unauthorised' });
    return;
  }

  if (entry) {
    /*
      The body is read and discarded. What the room SENDS is asserted by its own unit tests; what
      matters here is that the exchange happens at all and that its answer decides entry — which is
      why the refusal below is switchable and the acceptance is not conditional on anything typed.
    */
    request.resume();
    request.on('end', () => {
      if (process.env.ROOM_ENTRY_REFUSE === '1') {
        json(response, 200, {
          ok: false,
          reason: 'stub-refusal',
          message: 'The room refused this entry.',
          redirectTo: null
        });
        return;
      }
      json(response, 200, { ok: true, asFreeTrial: false });
    });
    return;
  }

  json(response, 200, configFor(shortCode, url.searchParams.get('email') ?? undefined));
});

server.listen(PORT, '127.0.0.1', () => {
  // Playwright's `webServer` waits on this port; the line is for a human reading a failing log.
  console.log(`stub controller listening on http://127.0.0.1:${PORT}`);
});
