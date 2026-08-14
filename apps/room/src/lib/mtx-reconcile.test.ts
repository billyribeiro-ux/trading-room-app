import { describe, expect, it } from 'vitest';
import {
  MTX_PAGE_SIZE,
  mtxStreamDeltas,
  mtxStreamFromPath,
  mtxStreamsFromPathList,
  parseMtxPath
} from './mtx-reconcile';
import { applyMtxStartStream, applySessionMediaState, isMtxStream } from './mtx-streams';

/*
  The MediaMTX side of the stream list.

  Field names are quoted from the project's own OpenAPI document (`api/openapi.yaml` in
  `bluenviron/mediamtx`), which is the reason `available` appears here and `ready` does not: the spec
  marks `ready` and `readyTime` deprecated, alongside `bytesReceived` and `bytesSent`, and the live
  pair is `available`/`availableTime`. That is the same rename that turned `runOnReady` into
  `runOnAvailable`, so reading the old field would work today and silently stop working.
*/

const ROOM = '3625';
const path = (name: string, available = true) => ({ name, available });

describe('parsing a MediaMTX path', () => {
  it('splits room__{roomKey}__{producerID}', () => {
    expect(parseMtxPath('room__3625__Dana_Vero')).toEqual({
      roomKey: '3625',
      producerID: 'Dana_Vero'
    });
  });

  it('keeps a producer id that itself contains the separator', () => {
    /* `slice(2).join('__')` rather than `segments[2]`, which would silently truncate the name. */
    expect(parseMtxPath('room__3625__a__b')).toEqual({ roomKey: '3625', producerID: 'a__b' });
  });

  it.each([
    ['no room prefix', 'other__3625__x'],
    ['too few segments', 'room__3625'],
    ['an empty room key', 'room____x'],
    ['an empty producer id', 'room__3625__'],
    ['nothing at all', '']
  ])('refuses %s', (_why, value) => {
    expect(parseMtxPath(value)).toBeNull();
  });
});

describe('one path becomes one stream', () => {
  it('is scoped to this room by EQUALITY, not by prefix', () => {
    /*
      THE assertion this room-scoping rule exists for. `startsWith` would let room `3625` collect
      room `36250`'s streams — one tenant watching another tenant's video, which is the failure this
      whole codebase is shaped to prevent.
    */
    expect(mtxStreamFromPath('room__36250__x', ROOM)).toBeNull();
    expect(mtxStreamFromPath('room__3625__x', ROOM)).not.toBeNull();
  });

  it('maps the two segments onto sessionID and producerID', () => {
    expect(mtxStreamFromPath('room__3625__Dana_Vero', ROOM)).toEqual({
      _id: 'room__3625__Dana_Vero',
      sessionID: '3625',
      producerID: 'Dana_Vero',
      mediaValue: { name: 'Dana_Vero' }
    });
  });

  it('produces something the wire guard would also accept', () => {
    /*
      The two entry points — a server command and a reconcile — must produce the same shape, or a
      stream would render from one path and be refused on the other.
    */
    expect(isMtxStream(mtxStreamFromPath('room__3625__Dana_Vero', ROOM))).toBe(true);
  });

  it('does NOT turn underscores back into spaces', () => {
    /*
      The sanitiser replaced every character outside [a-zA-Z0-9_-] with `_`, so the original is not
      recoverable. Guessing would rename anybody who genuinely uses an underscore, which is inventing
      data to make a tab look tidy.
    */
    expect(mtxStreamFromPath('room__3625__Dana_Vero', ROOM)?.mediaValue.name).toBe('Dana_Vero');
  });
});

describe('the path list', () => {
  it('keeps only paths that are AVAILABLE', () => {
    const streams = mtxStreamsFromPathList(
      { items: [path('room__3625__live'), path('room__3625__idle', false)] },
      ROOM
    );
    expect(streams.map((s) => s.producerID)).toEqual(['live']);
  });

  it('treats a missing or non-boolean `available` as not available', () => {
    // Fails closed: a configured-but-unpublished path must not put a tab in the room.
    const streams = mtxStreamsFromPathList(
      { items: [{ name: 'room__3625__a' }, { name: 'room__3625__b', available: 'yes' }] },
      ROOM
    );
    expect(streams).toEqual([]);
  });

  it('never reads the DEPRECATED ready field', () => {
    // `ready: true` with no `available` is exactly what a stale implementation would rely on.
    expect(
      mtxStreamsFromPathList({ items: [{ name: 'room__3625__a', ready: true }] }, ROOM)
    ).toEqual([]);
  });

  it('drops other rooms and malformed entries without throwing', () => {
    const streams = mtxStreamsFromPathList(
      {
        items: [
          path('room__9999__theirs'),
          path('room__3625__ours'),
          null,
          'nonsense',
          { available: true },
          path('not-a-room-path')
        ]
      },
      ROOM
    );
    expect(streams.map((s) => s.producerID)).toEqual(['ours']);
  });

  it('survives a payload with no items at all', () => {
    expect(mtxStreamsFromPathList({}, ROOM)).toEqual([]);
    expect(mtxStreamsFromPathList({ items: null }, ROOM)).toEqual([]);
  });

  it('names the page size, so pagination is a decision rather than an oversight', () => {
    // Upstream's `itemsPerPage` default is 100; a room past it would be cut off with no error.
    expect(MTX_PAGE_SIZE).toBe(100);
  });
});

describe('the deltas', () => {
  const a = mtxStreamFromPath('room__3625__a', ROOM)!;
  const b = mtxStreamFromPath('room__3625__b', ROOM)!;

  it('reports nothing when nothing changed', () => {
    expect(mtxStreamDeltas([a, b], [a, b])).toEqual({ started: [], stopped: [] });
  });

  it('reports an arrival and a departure', () => {
    expect(mtxStreamDeltas([a], [a, b]).started.map((s) => s._id)).toEqual([b._id]);
    expect(mtxStreamDeltas([a, b], [a]).stopped.map((s) => s._id)).toEqual([b._id]);
  });

  it('reports a full turnover in both directions at once', () => {
    const delta = mtxStreamDeltas([a], [b]);
    expect(delta.started.map((s) => s._id)).toEqual([b._id]);
    expect(delta.stopped.map((s) => s._id)).toEqual([a._id]);
  });

  it('is silent about a stream that never went away', () => {
    /*
      `_id` is the path, so a publisher that dropped and reconnected between two polls is the same
      stream. Emitting stop-then-start would interrupt playback to report something the viewer never
      experienced.
    */
    expect(mtxStreamDeltas([a], [{ ...a }])).toEqual({ started: [], stopped: [] });
  });
});

describe('WHY the reconcile emits deltas and not the full list', () => {
  /*
    The trap this module exists to avoid, asserted rather than described.

    `applySessionMediaState` sets the selection to `list[0]._id` every time it runs. That is correct
    for the reference, which sends the full list exactly twice — at init and after a soft reset. On a
    TIMER it would drag every viewer back to the first tab on every tick, and it would look like the
    room fighting the user rather than like a polling mistake.
  */
  const a = mtxStreamFromPath('room__3625__a', ROOM)!;
  const b = mtxStreamFromPath('room__3625__b', ROOM)!;

  it('a repeated full-list apply YANKS the selection — which is why it is not used', () => {
    let state = applySessionMediaState([a, b]);
    state = { ...state, selectedTabID: b._id }; // the viewer picked the second stream
    state = applySessionMediaState([a, b]); // a naive reconcile re-sends the same list
    expect(state.selectedTabID, 'dragged back to the first stream').toBe(a._id);
  });

  it('the delta path leaves the viewer where they were', () => {
    let state = applySessionMediaState([a]);
    state = { ...state, selectedTabID: a._id };
    // What a reconcile actually does when it sees `b` arrive.
    for (const started of mtxStreamDeltas([a], [a, b]).started) {
      state = applyMtxStartStream(state, started);
    }
    expect(state.streams.map((s) => s._id)).toEqual([a._id, b._id]);
    expect(state.selectedTabID, 'still watching what they chose').toBe(a._id);
  });
});
