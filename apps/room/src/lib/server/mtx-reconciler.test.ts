import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
  The reconcile loop: ask MediaMTX, diff, publish what changed.

  Two of the assertions here are about failure rather than success, and they are the reason this
  file exists. A media server that blips must not clear every viewer's tabs, and a deployment that
  grows past one page of paths must not silently lose the rest.
*/

const API = 'http://127.0.0.1:9997';
let configuredApi: string | undefined = API;

vi.mock('$app/env/private', () => ({
  get MEDIA_API_URL() {
    return configuredApi;
  }
}));

const published: Array<{
  room: string;
  event: { data: { cmd: string; muser?: { _id: string } } };
}> = [];
let subscribers = 1;

vi.mock('./room-events', () => ({
  publishToRoom: (room: string, event: unknown) => {
    published.push({ room, event } as (typeof published)[number]);
  },
  roomSubscriberCount: () => subscribers
}));

const { isReconciling, reconcileRoomOnce, startMtxReconcile, stopMtxReconcileIfEmpty } =
  await import('./mtx-reconciler');

const ROOM = '3625';

/** One `/v3/paths/list` page. `available` and NOT the deprecated `ready` — see `mtx-reconcile.ts`. */
const page = (names: string[], pageCount = 1) => ({
  itemCount: names.length,
  pageCount,
  items: names.map((name) => ({ name, available: true }))
});

const cmds = () => published.map((entry) => entry.event.data.cmd);
const ids = () => published.map((entry) => entry.event.data.muser?._id);

beforeEach(() => {
  published.length = 0;
  subscribers = 1;
  configuredApi = API;
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  subscribers = 0;
  stopMtxReconcileIfEmpty(ROOM);
  vi.unstubAllGlobals();
});

describe('the lifecycle', () => {
  it('does nothing at all when no MediaMTX is configured', () => {
    configuredApi = undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('must not be called');
      })
    );
    startMtxReconcile(ROOM);
    expect(isReconciling(ROOM), 'no timer for a deployment without MediaMTX').toBe(false);
  });

  it('starts once per room, however many clients subscribe', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(page([]))))
    );
    startMtxReconcile(ROOM);
    expect(isReconciling(ROOM)).toBe(true);
    // The SSE route calls this on EVERY subscribe and must not stack timers.
    startMtxReconcile(ROOM);
    startMtxReconcile(ROOM);
    expect(isReconciling(ROOM)).toBe(true);
  });

  it('stops only when the last subscriber has gone', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(page([]))))
    );
    startMtxReconcile(ROOM);

    subscribers = 1;
    stopMtxReconcileIfEmpty(ROOM);
    expect(isReconciling(ROOM), 'someone is still watching').toBe(true);

    subscribers = 0;
    stopMtxReconcileIfEmpty(ROOM);
    expect(isReconciling(ROOM), 'the room emptied').toBe(false);
  });
});

describe('one pass', () => {
  it('runs one pass IMMEDIATELY, so a joiner sees a stream already running', async () => {
    /*
      Without the immediate pass, somebody entering a room where a presenter is already live would
      see "No one is streaming right now..." for up to a full interval — the exact case a viewer is
      most likely to hit, since streams usually start before the audience arrives.

      Waited for rather than asserted synchronously: `startMtxReconcile` kicks the first pass off
      without awaiting it, so checking straight after the call would be a race, and a test that
      races is a test that will be deleted by whoever it wakes at 3am.
    */
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(page(['room__3625__dana']))))
    );
    startMtxReconcile(ROOM);

    await vi.waitFor(() => expect(cmds()).toEqual(['mtxStartStream']));
    expect(ids()).toEqual(['room__3625__dana']);
  });

  it('publishes start, then stop, as the world changes', async () => {
    let current = page(['room__3625__dana']);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(current)))
    );

    startMtxReconcile(ROOM);
    await vi.waitFor(() => expect(cmds()).toEqual(['mtxStartStream']));
    expect(ids()).toEqual(['room__3625__dana']);

    published.length = 0;
    current = page(['room__3625__dana', 'room__3625__kit']);
    await reconcileRoomOnce(ROOM);
    expect(cmds()).toEqual(['mtxStartStream']);
    expect(ids()).toEqual(['room__3625__kit']);

    published.length = 0;
    current = page(['room__3625__kit']);
    await reconcileRoomOnce(ROOM);
    expect(cmds()).toEqual(['mtxStopStream']);
    expect(ids()).toEqual(['room__3625__dana']);
  });

  it('says nothing when nothing changed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(page(['room__3625__dana']))))
    );
    startMtxReconcile(ROOM);
    await vi.waitFor(() => expect(published).toHaveLength(1));

    published.length = 0;
    await reconcileRoomOnce(ROOM);
    await reconcileRoomOnce(ROOM);
    expect(published, 'a quiet room is silent').toEqual([]);
  });

  it('only ever reports streams belonging to THIS room', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify(page(['room__9999__theirs', 'room__36250__nearly'])))
      )
    );
    startMtxReconcile(ROOM);
    await reconcileRoomOnce(ROOM);
    expect(published, 'another tenant’s streams are not this room’s').toEqual([]);
  });
});

describe('when MediaMTX cannot be asked', () => {
  /*
    THE assertion this file is for.

    `null` from the fetch means "could not ask", which is not "nothing is live". Treating the two
    the same would publish a stop for every stream the moment the control API blipped, clearing
    every viewer's tabs and interrupting playback — a self-inflicted outage triggered by a dropped
    packet.
  */
  it('publishes NO stops when the request fails', async () => {
    let current: unknown = page(['room__3625__dana']);
    let failing = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        if (failing) throw new Error('ECONNREFUSED');
        return new Response(JSON.stringify(current));
      })
    );

    startMtxReconcile(ROOM);
    await vi.waitFor(() => expect(cmds()).toEqual(['mtxStartStream']));

    published.length = 0;
    failing = true;
    await reconcileRoomOnce(ROOM);
    expect(published, 'a blip must not look like everybody stopping').toEqual([]);

    // ...and it recovers without re-announcing the stream that never went away.
    failing = false;
    current = page(['room__3625__dana']);
    await reconcileRoomOnce(ROOM);
    expect(published).toEqual([]);
  });

  it('publishes no stops on a non-200 either', async () => {
    let current: unknown = page(['room__3625__dana']);
    let status = 200;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(current), { status }))
    );

    startMtxReconcile(ROOM);
    await vi.waitFor(() => expect(cmds()).toEqual(['mtxStartStream']));

    published.length = 0;
    status = 500;
    current = page([]);
    await reconcileRoomOnce(ROOM);
    expect(published).toEqual([]);
  });
});

describe('pagination', () => {
  it('follows pageCount instead of silently keeping the first 100', async () => {
    /*
      `itemsPerPage` defaults to 100. A deployment past that would lose every stream after the first
      page, with no error anywhere — the kind of cap that reads as "covered everything" right up
      until it does not.
    */
    const fetchMock = vi.fn(async (url: string) => {
      const requested = Number(new URL(url).searchParams.get('page'));
      return new Response(
        JSON.stringify(
          requested === 0 ? page(['room__3625__a'], 3) : page([`room__3625__p${requested}`], 3)
        )
      );
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    startMtxReconcile(ROOM);
    await vi.waitFor(() => expect(published.length).toBeGreaterThan(0));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(ids().sort()).toEqual(['room__3625__a', 'room__3625__p1', 'room__3625__p2']);
  });

  it('asks for the documented page size', async () => {
    // The parameter is declared so the recorded call is TYPED — a zero-arg `vi.fn` gives
    // `calls[0]` the type `[]`, and reading `[0]` off it is an error rather than a string.
    const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify(page([]))));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    startMtxReconcile(ROOM);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const requested = fetchMock.mock.calls[0][0];
    expect(requested).toContain('itemsPerPage=100');
    expect(requested).toContain('/v3/paths/list');
  });
});
