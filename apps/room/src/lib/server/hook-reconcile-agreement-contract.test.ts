import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * ── THE HOOK AND THE RECONCILE MUST NOT ANNOUNCE THE SAME EVENT TWICE ─────────────────────────
 *
 * ## Measured on a live media plane, not reasoned about
 *
 * On 2026-08-31 the media chain was run end to end for the first time — Chromium publishing over
 * WHIP to a real MediaMTX **v1.20.1**, the media server spawning `runOnAvailable`, that reaching the
 * room's `/internal/media-hook`, and a subscribed presenter's SSE connection read on the wire:
 *
 * ```
 * 04:33:52.676  mtxStartStream    the hook   (media server logged runOnAvailable at 04:33:52)
 * 04:33:55.427  mtxStartStream    the poll,  2.75s later
 * 04:34:11.286  mtxStopStream     the hook   (runOnUnavailable at 04:34:11)
 * 04:34:15.429  mtxStopStream     the poll,  4.14s later, on the same 5-second grid
 * ```
 *
 * Every single event was delivered twice. `applyMtxStartStream` is `[...state.streams, stream]` — an
 * unconditional append, faithfully transcribed — so a presenter going live put **two identical tabs
 * in every viewer's room**, and the paired duplicate stop happened to cancel them at the end. Wrong
 * for exactly as long as the stream was up, correct again afterwards: the failure shape that
 * survives casual testing the longest.
 *
 * ## Why neither existing test file could have caught it
 *
 * `mtx-reconciler.test.ts` proves a poll publishes what changed. The media-hook route's tests prove
 * the hook publishes what it was told. **Both are correct.** The defect existed only in the pair,
 * between two modules that each behaved exactly as specified, and one line — telling the reconciler
 * what the hook had already said — was missing rather than wrong.
 *
 * That is the argument for this file being separate from both: it is a contract ACROSS the seam, and
 * the seam is where nothing was looking.
 *
 * ## What is asserted, and what is deliberately not
 *
 * Asserted: after a hook publishes, a poll seeing the same world publishes NOTHING; and a poll whose
 * request was in flight when a hook landed publishes nothing either, because its answer describes a
 * moment that has been overtaken.
 *
 * Not asserted: that the hook is fast or that the poll is slow. The ordering is a property of the
 * network on the day; the contract is that whichever arrives first, the other stays quiet.
 */

const API = 'http://127.0.0.1:9997';

vi.mock('$app/env/private', () => ({
  get MEDIA_API_URL() {
    return API;
  }
}));

const published: Array<{ cmd: string; id?: string }> = [];
let subscribers = 1;

vi.mock('./room-events', () => ({
  publishToRoom: (_room: string, event: { data: { cmd: string; muser?: { _id: string } } }) => {
    published.push({ cmd: event.data.cmd, id: event.data.muser?._id });
  },
  roomSubscriberCount: () => subscribers
}));

const { noteHookPublished, reconcileRoomOnce, startMtxReconcile, stopMtxReconcileIfEmpty } =
  await import('./mtx-reconciler');

const ROOM = '7301';
const PATH = 'room__7301__Dana_Vero';

/** The stream the hook builds, which is `mtxStreamFromPath(PATH, '7301')` — the live wire value. */
const STREAM = {
  _id: PATH,
  sessionID: '7301',
  producerID: 'Dana_Vero',
  mediaValue: { name: 'Dana_Vero' }
};

/**
 * A `/v3/paths/list` page, in the envelope MediaMTX v1.20.1 actually returned.
 *
 * Not a minimal stub: the deprecated `ready`/`readyTime` pair is present and agreeing, exactly as the
 * live server sends it, so a future edit that starts reading `ready` passes here and is caught by
 * `mtx-reconcile.ts`'s own assertions rather than being quietly accommodated by a fixture that
 * omitted the field.
 */
const page = (live: boolean) => ({
  itemCount: 1,
  pageCount: 1,
  items: [
    {
      name: PATH,
      confName: PATH,
      ready: live,
      readyTime: live ? '2026-08-31T04:33:52.401486199Z' : null,
      available: live,
      availableTime: live ? '2026-08-31T04:33:52.401486199Z' : null,
      online: live,
      source: live ? { type: 'webRTCSession', id: '9d84c87e' } : null,
      tracks: live ? ['Opus', 'VP8'] : []
    }
  ]
});

const respond = (body: unknown) =>
  vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response));

/**
 * Start the room AND let its immediate first pass finish before anything is asserted.
 *
 * `startMtxReconcile` ends with `void reconcileRoomOnce(room)`, so a member joining a room that
 * already has a stream sees it now rather than up to an interval later. That pass is deliberately
 * not awaited by the caller, and it holds `polling` while it runs — so a test that polls straight
 * afterwards gets an early return from the overlap guard and measures nothing at all.
 *
 * Found by this file's own first run: two assertions read `[]` and it looked like the fix had
 * silenced the reconcile, which is the failure mode the vacuity floor below exists to catch. The
 * drain is the harness being honest about a real ordering, not a sleep to make a flake go away.
 */
async function startAndDrain(room: string): Promise<void> {
  startMtxReconcile(room);
  for (let tick = 0; tick < 8; tick += 1) await Promise.resolve();
  published.length = 0;
}

beforeEach(() => {
  published.length = 0;
  subscribers = 1;
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  subscribers = 0;
  stopMtxReconcileIfEmpty(ROOM);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('a hook and the next poll do not both announce the same stream', () => {
  it('publishes the start once when the hook got there first', async () => {
    /*
      The measured sequence, in order: nothing live, the hook announces a start, then the poll runs
      and sees the very stream the hook just announced. Before 2026-08-31 this produced a second
      `mtxStartStream` here — the 04:33:55.427 frame.
    */
    vi.stubGlobal('fetch', respond(page(false)));
    await startAndDrain(ROOM);
    await reconcileRoomOnce(ROOM);
    expect(published, 'nothing is live yet').toEqual([]);

    // What `/internal/media-hook` does: publish, then tell the reconciler what it published.
    published.push({ cmd: 'mtxStartStream', id: PATH });
    noteHookPublished(ROOM, STREAM, 'available');

    vi.stubGlobal('fetch', respond(page(true)));
    await reconcileRoomOnce(ROOM);

    expect(
      published,
      'the poll re-announced a start the hook had already delivered — two identical tabs per viewer'
    ).toEqual([{ cmd: 'mtxStartStream', id: PATH }]);
  });

  it('publishes the stop once when the hook got there first', async () => {
    vi.stubGlobal('fetch', respond(page(true)));
    startMtxReconcile(ROOM);
    // The immediate pass is what announces this stream; drained WITHOUT clearing, then asserted.
    for (let tick = 0; tick < 8; tick += 1) await Promise.resolve();
    expect(published, 'the join-time pass announces a stream that is already up').toEqual([
      { cmd: 'mtxStartStream', id: PATH }
    ]);
    published.length = 0;

    published.push({ cmd: 'mtxStopStream', id: PATH });
    noteHookPublished(ROOM, STREAM, 'unavailable');

    vi.stubGlobal('fetch', respond(page(false)));
    await reconcileRoomOnce(ROOM);

    expect(published, 'the poll re-announced the stop — the 04:34:15.429 frame').toEqual([
      { cmd: 'mtxStopStream', id: PATH }
    ]);
  });

  it('still announces a stream the hook never told it about', async () => {
    /*
      THE VACUITY FLOOR, and the one that matters most: a fix that made the reconcile quiet would
      pass both assertions above and delete the feature. `mtx-reconciler.ts`'s whole reason for
      existing is the hook that never arrives — a `curl` with no retry, landing on one instance of
      several. Reconciliation is what makes the room correct anyway.
    */
    vi.stubGlobal('fetch', respond(page(false)));
    await startAndDrain(ROOM);

    vi.stubGlobal('fetch', respond(page(true)));
    await reconcileRoomOnce(ROOM);

    expect(published, 'a lost hook must still be repaired by the next poll').toEqual([
      { cmd: 'mtxStartStream', id: PATH }
    ]);
  });

  it('drops a poll whose answer was overtaken by a hook mid-request', async () => {
    /*
      The race, and the reason `epoch` exists rather than just the baseline update.

      A poll's answer describes the instant MediaMTX served it. If a hook lands while that request is
      in flight, the answer is stale in a way nothing about it reveals — and acting on it publishes
      the OPPOSITE of what the hook just said. Here: the server answers "not live" for a request
      issued before the stream came up, while the hook has already announced the start.

      Without the guard the poll compares an up-to-date baseline against a stale world and emits
      `mtxStopStream` for a stream that is playing — strictly worse than the duplicate it replaced,
      which is why the guard shipped with the fix rather than after it.
    */
    vi.stubGlobal('fetch', respond(page(false)));
    await startAndDrain(ROOM);

    let release!: (value: unknown) => void;
    const inFlight = new Promise((resolve) => {
      release = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        await inFlight;
        return { ok: true, json: () => Promise.resolve(page(false)) } as Response;
      })
    );

    const poll = reconcileRoomOnce(ROOM);
    // The hook lands while the request above is still open.
    noteHookPublished(ROOM, STREAM, 'available');
    release(null);
    await poll;

    expect(
      published,
      'a poll served before the hook must not publish; its answer describes a world that has moved'
    ).toEqual([]);
  });

  it('does nothing when no reconcile is running, rather than growing state for it', async () => {
    /*
      A deployment with no `MEDIA_API_URL`, or a room with no subscribers, has no baseline to keep in
      step. `noteHookPublished` must be a no-op there and must not create an entry — a Map that grows
      one key per room that ever had a stream is a leak in a long-lived process, and it would also
      make `isReconciling` start answering true for rooms nobody is watching.
    */
    expect(() => noteHookPublished('9999', STREAM, 'available')).not.toThrow();

    const fetcher = respond(page(true));
    vi.stubGlobal('fetch', fetcher);
    await reconcileRoomOnce('9999');

    expect(fetcher, 'a room with no reconcile must not be polled').not.toHaveBeenCalled();
    expect(published).toEqual([]);
  });
});
