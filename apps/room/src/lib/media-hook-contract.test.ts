import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
  `/internal/media-hook` — the one route besides `/session` that a request reaches without a cookie.

  That is why it has a contract test and why the test is mostly about refusal. `hooks.server.ts` is
  the room's single authentication choke point; adding a path to `PUBLIC_PATHS` MOVES the decision
  into the route rather than removing it, so if the checks below stop working the route becomes an
  open endpoint that can inject a stream tab into any room.

  The mocks are the two things the route touches: the secret, and the fan-out.
*/

const SECRET = 'a-media-hook-secret-value';
let configuredSecret: string | undefined = SECRET;

vi.mock('$app/env/private', () => ({
  get MEDIA_HOOK_SECRET() {
    return configuredSecret;
  }
}));

const published: Array<{ room: string; event: unknown }> = [];
vi.mock('#lib/server/room-events.js', () => ({
  publishToRoom: (room: string, event: unknown) => {
    published.push({ room, event });
  }
}));

/**
 * The reconciler, mocked so this file can see the ONE call that stops the room announcing twice.
 *
 * Not a convenience: on 2026-08-31 the live chain was measured delivering every event twice, because
 * the hook published without telling the reconciler and the next poll re-derived the same delta.
 * `hook-reconcile-agreement-contract.test.ts` proves the reconciler side of that fix. Nothing proved
 * the ROUTE still makes the call — delete the line from `+server.ts` and every other assertion in
 * both files stays green while the defect returns in full. This closes that.
 */
const noted: Array<{ room: string; id: string; event: string }> = [];
vi.mock('#lib/server/mtx-reconciler.js', () => ({
  noteHookPublished: (room: string, stream: { _id: string }, event: string) => {
    noted.push({ room, id: stream._id, event });
  }
}));

const { POST } = await import('../routes/internal/media-hook/+server');

type HookBody = { event?: unknown; path?: unknown };

function call(body: HookBody | string, bearer: string | null = SECRET) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (bearer !== null) headers.set('authorization', `Bearer ${bearer}`);
  const request = new Request('http://room.test/internal/media-hook', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
  return (POST as unknown as (event: { request: Request }) => Promise<Response>)({ request });
}

beforeEach(() => {
  published.length = 0;
  noted.length = 0;
  configuredSecret = SECRET;
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('the cookie-less surface of the whole room', () => {
  it('is exactly two paths, and adding a third is a deliberate act', () => {
    /*
      `PUBLIC_PATHS` is every route reachable without a session — the complete list of places an
      anonymous request can touch this application. Nothing pinned it until now, so a third entry
      could have been added in any diff and nobody would have been asked why.

      Both current entries authenticate by their own means: `/session` refuses anything but a signed,
      unexpired, unspent handoff token, and `/internal/media-hook` refuses anything but a
      constant-time bearer match. A path added here WITHOUT its own check is an open door, which is
      the failure this assertion exists to make loud.
    */
    const source = readFileSync(new URL('../hooks.server.ts', import.meta.url), 'utf8');
    const declaration = source.slice(
      source.indexOf('const PUBLIC_PATHS'),
      source.indexOf(';', source.indexOf('const PUBLIC_PATHS'))
    );
    const paths = [...declaration.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    expect(paths.sort()).toEqual(['/internal/media-hook', '/session']);
  });
});

describe('it refuses before it does anything', () => {
  it('refuses everything when no secret is configured', async () => {
    /*
      The closed state, and the important one. Without a secret there is no way to tell MediaMTX
      apart from anyone who found the URL. The reconcile keeps the stream list correct regardless,
      so refusing costs latency and nothing else.
    */
    configuredSecret = undefined;
    const response = await call({ event: 'available', path: 'room__3625__dana' });
    expect(response.status).toBe(401);
    expect(published, 'nothing may be published').toEqual([]);
  });

  it('refuses a wrong bearer', async () => {
    const response = await call({ event: 'available', path: 'room__3625__dana' }, 'not-the-secret');
    expect(response.status).toBe(401);
    expect(published).toEqual([]);
  });

  it('refuses a bearer that is a PREFIX of the real one', async () => {
    // The length-equality branch of the constant-time compare, which must not accept a short guess.
    const response = await call(
      { event: 'available', path: 'room__3625__dana' },
      SECRET.slice(0, 5)
    );
    expect(response.status).toBe(401);
    expect(published).toEqual([]);
  });

  it('refuses a wrong bearer of the SAME LENGTH as the real one', async () => {
    /*
      THE case that actually exercises the comparison, and it was missing.

      `secretMatches` returns early when the lengths differ, so every other refusal above is decided
      by a length check and never reaches `timingSafeEqual`. A negative control proved it: patching
      the comparison to `return true` left all twelve tests GREEN, because not one of them presented
      a bearer the right length. The suite was asserting that the route rejects strings of the wrong
      size — which is not the property anybody cares about.

      This differs from the secret in the first byte only, and is the same length.
    */
    const sameLength = `b${SECRET.slice(1)}`;
    expect(sameLength).toHaveLength(SECRET.length);
    expect(sameLength).not.toBe(SECRET);

    const response = await call({ event: 'available', path: 'room__3625__dana' }, sameLength);
    expect(response.status).toBe(401);
    expect(published).toEqual([]);
  });

  it('refuses a missing authorization header', async () => {
    const response = await call({ event: 'available', path: 'room__3625__dana' }, null);
    expect(response.status).toBe(401);
    expect(published).toEqual([]);
  });
});

describe('it validates the body', () => {
  it('refuses a body that is not JSON', async () => {
    expect((await call('not json at all')).status).toBe(400);
    expect(published).toEqual([]);
  });

  it('refuses a missing path', async () => {
    expect((await call({ event: 'available' })).status).toBe(400);
    expect(published).toEqual([]);
  });

  it('refuses an event it does not model', async () => {
    /*
      Deny by default. Adding a third hook to `mediamtx.yml` — there are thirteen — must not quietly
      start publishing something the room does not understand.
    */
    expect((await call({ event: 'runOnRead', path: 'room__3625__dana' })).status).toBe(400);
    expect(published).toEqual([]);
  });

  it('refuses a path that is not a room path', async () => {
    expect((await call({ event: 'available', path: '/etc/passwd' })).status).toBe(400);
    expect((await call({ event: 'available', path: 'room__3625' })).status).toBe(400);
    expect(published).toEqual([]);
  });
});

describe('it publishes the delta the room already knows how to apply', () => {
  it('turns `available` into mtxStartStream, keyed under `muser`', async () => {
    const response = await call({ event: 'available', path: 'room__3625__Dana_Vero' });
    expect(response.status).toBe(200);
    expect(published).toHaveLength(1);
    expect(published[0].event).toEqual({
      channel: 'cmds',
      data: {
        cmd: 'mtxStartStream',
        // `muser` is the reference's own payload key (bundle byte 1010826).
        muser: {
          _id: 'room__3625__Dana_Vero',
          sessionID: '3625',
          producerID: 'Dana_Vero',
          mediaValue: { name: 'Dana_Vero' }
        }
      }
    });
  });

  it('turns `unavailable` into mtxStopStream', async () => {
    await call({ event: 'unavailable', path: 'room__3625__Dana_Vero' });
    expect((published[0].event as { data: { cmd: string } }).data.cmd).toBe('mtxStopStream');
  });

  it('takes the room FROM THE PATH, so a hook cannot choose a room', async () => {
    /*
      There is no room field in the request and there must never be one. MediaMTX only reports a path
      it actually served, and the path was built by the controller — so the room is derived, not
      asserted. A caller who could name the room could put a stream tab in any room it liked.
    */
    await call({ event: 'available', path: 'room__9999__someone' });
    expect(published[0].room).toBe('9999');
    expect(published[0].room).not.toBe('3625');
  });

  it('tells the reconciler what it just published, in both directions', async () => {
    /*
      The line that stops the duplicate. Measured on a live MediaMTX v1.20.1 on 2026-08-31: without
      it, the hook's `mtxStartStream` at 04:33:52.676 was followed by an identical one from the poll
      at 04:33:55.427 — and `applyMtxStartStream` appends without checking `_id`, so every viewer got
      two tabs for one stream.

      Asserted per event, because a fix that only handled `available` would leave the stop half
      duplicating and that half is the one that reads as "the tab flickered".
    */
    await call({ event: 'available', path: 'room__3625__Dana_Vero' });
    expect(noted).toEqual([{ room: '3625', id: 'room__3625__Dana_Vero', event: 'available' }]);

    noted.length = 0;
    await call({ event: 'unavailable', path: 'room__3625__Dana_Vero' });
    expect(noted).toEqual([{ room: '3625', id: 'room__3625__Dana_Vero', event: 'unavailable' }]);
  });

  it('does not tell the reconciler about a call it refused', async () => {
    /*
      Deny-by-default, applied to the baseline as well as to the publish. A bad bearer, an unknown
      event or an unparseable path must leave the reconciler's memory alone — otherwise an
      unauthenticated caller who could not publish a frame could still make the room MISS the next
      real one, by moving the baseline the poll diffs against.
    */
    await call({ event: 'available', path: 'room__3625__Dana_Vero' }, 'wrong-secret');
    await call({ event: 'sideways', path: 'room__3625__Dana_Vero' });
    await call({ event: 'available', path: 'not-a-room-path' });

    expect(published, 'nothing was published, which is the existing contract').toEqual([]);
    expect(noted, 'and nothing moved the reconciler baseline either').toEqual([]);
  });

  it('answers 200 even when nobody is listening', async () => {
    /*
      A room with no connected members is not an error. MediaMTX runs this as a shell command and
      logs a non-zero exit as a failure, so reporting "no subscribers" would fill a media server's
      log with noise about rooms working correctly.
    */
    const response = await call({ event: 'available', path: 'room__0000__nobody' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
