import { describe, expect, it } from 'vitest';
import {
  applyMtxStartStream,
  applyMtxStopStream,
  applySessionMediaState,
  emptyMtxState,
  isMtxStream,
  mtxPlaybackPath,
  mtxPlaylistUrl,
  selectMtxStreamTab,
  type MtxStream
} from './mtx-streams';

/**
 * Every case here is a rule transcribed from `MtxHandlerService` (byte 1137300) or from
 * `app-streaming-view.full.js:113-116`. Nothing is asserted that the reference does not do.
 */

const stream = (id: string, name = id, serverName = 'media.example.com'): MtxStream => ({
  _id: id,
  sessionID: '652882112ad80b3e7c5132d5',
  producerID: `producer-${id}`,
  mediaValue: { name, serverName }
});

describe('the initial state', () => {
  it('starts empty with nothing selected', () => {
    expect(emptyMtxState()).toEqual({ streams: [], selectedTabID: null });
  });
});

describe('getSessionMediaStateMTX — the full list', () => {
  /* `this.mtxStreams = this.globals.roomMediaStateMTX` — a replace, never a merge. */
  it('replaces the list rather than merging into it', () => {
    const before = applySessionMediaState([stream('a'), stream('b')]);
    const after = applySessionMediaState([stream('c')]);
    expect(after.streams.map((s) => s._id)).toEqual(['c']);
    expect(before.streams.map((s) => s._id)).toEqual(['a', 'b']);
  });

  /* `this.mtxStreams.length > 0 && emit("selectStreamTabOfId", this.mtxStreams[0])`. */
  it('selects the first stream when the list is non-empty', () => {
    expect(applySessionMediaState([stream('a'), stream('b')]).selectedTabID).toBe('a');
  });

  it('selects nothing when the list is empty', () => {
    expect(applySessionMediaState([]).selectedTabID).toBeNull();
  });

  /* A copy, so a later push cannot mutate the caller's array. */
  it('does not alias the incoming array', () => {
    const incoming = [stream('a')];
    const state = applySessionMediaState(incoming);
    incoming.push(stream('b'));
    expect(state.streams).toHaveLength(1);
  });
});

describe('mtxStartStream — append and maybe select', () => {
  it('appends to the end', () => {
    let state = applySessionMediaState([stream('a')]);
    state = applyMtxStartStream(state, stream('b'));
    expect(state.streams.map((s) => s._id)).toEqual(['a', 'b']);
  });

  /*
    `(!this.selectedTabID || 1 === this.mtxStreams.length)`, evaluated AFTER the push — so the
    second term means "this is now the only stream".
  */
  it('selects the first stream to arrive', () => {
    const state = applyMtxStartStream(emptyMtxState(), stream('a'));
    expect(state.selectedTabID).toBe('a');
  });

  /*
    THE behaviour that matters to a viewer: a second presenter going live must not yank the tab away
    from the stream they are watching.
  */
  it('leaves an existing selection alone when a second stream starts', () => {
    let state = applyMtxStartStream(emptyMtxState(), stream('a'));
    state = applyMtxStartStream(state, stream('b'));
    expect(state.selectedTabID).toBe('a');
  });

  /* The other half of the OR: nothing selected, so the arrival takes the selection. */
  it('takes the selection when nothing is selected, even if it is not the first', () => {
    const state = applyMtxStartStream({ streams: [stream('a')], selectedTabID: null }, stream('b'));
    expect(state.selectedTabID).toBe('b');
  });
});

describe('mtxStopStream — remove by identity', () => {
  it('removes the matching stream and leaves the rest in order', () => {
    const state = applyMtxStopStream(
      { streams: [stream('a'), stream('b'), stream('c')], selectedTabID: 'a' },
      stream('b')
    );
    expect(state.streams.map((s) => s._id)).toEqual(['a', 'c']);
  });

  /* The loop simply never matches. Not an error, and nothing changes. */
  it('does nothing for an id that is not present', () => {
    const before = { streams: [stream('a')], selectedTabID: 'a' };
    expect(applyMtxStopStream(before, stream('zzz'))).toEqual(before);
  });

  /* `selectedTabID === s._id && length > 0 ? select(streams[0])`. */
  it('falls back to the first remaining stream when the selected one stops', () => {
    const state = applyMtxStopStream(
      { streams: [stream('a'), stream('b')], selectedTabID: 'a' },
      stream('a')
    );
    expect(state.selectedTabID).toBe('b');
  });

  /* `: selectedTabID === s._id && (this.selectedTabID = null)`. */
  it('clears the selection when the last stream stops', () => {
    const state = applyMtxStopStream({ streams: [stream('a')], selectedTabID: 'a' }, stream('a'));
    expect(state.streams).toEqual([]);
    expect(state.selectedTabID).toBeNull();
  });

  /* The selection only moves when the STOPPED stream was the selected one. */
  it('leaves the selection alone when another stream stops', () => {
    const state = applyMtxStopStream(
      { streams: [stream('a'), stream('b')], selectedTabID: 'b' },
      stream('a')
    );
    expect(state.selectedTabID).toBe('b');
  });

  /* `break` after the first match — exactly one entry goes, even on a duplicated id. */
  it('removes exactly one entry when an id repeats', () => {
    const state = applyMtxStopStream(
      { streams: [stream('a'), stream('a'), stream('b')], selectedTabID: 'b' },
      stream('a')
    );
    expect(state.streams.map((s) => s._id)).toEqual(['a', 'b']);
  });
});

describe('selectStreamTabOfId', () => {
  it('changes only the selection', () => {
    const before = { streams: [stream('a'), stream('b')], selectedTabID: 'a' };
    const after = selectMtxStreamTab(before, 'b');
    expect(after.selectedTabID).toBe('b');
    expect(after.streams).toBe(before.streams);
  });
});

describe('the playback path and playlist URL', () => {
  const HOST = 'media.example.com';

  /* `room__${muser.sessionID}__${muser.producerID}` — producerID, NOT the presenter's name. */
  it('is keyed by producerID, unlike an ingest path', () => {
    expect(mtxPlaybackPath(stream('a'), HOST)).toBe('room__652882112ad80b3e7c5132d5__producer-a');
  });

  /* `muser.mediaValue.serverName !== globals.streamServerMTX && (e += "__reb")`. */
  it('adds __reb only when the stream is on a different host', () => {
    expect(mtxPlaybackPath(stream('a', 'a', HOST), HOST)).not.toContain('__reb');
    expect(mtxPlaybackPath(stream('a', 'a', 'other.example.com'), HOST)).toMatch(/__reb$/);
  });

  /*
    A missing `serverName` is `!== HOST`, so it gets the suffix. That is the reference's behaviour
    and is reproduced rather than "corrected" — an absent host genuinely is not this one.
  */
  it('treats a missing serverName as a different host', () => {
    const noServer: MtxStream = { ...stream('a'), mediaValue: { name: 'a' } };
    expect(mtxPlaybackPath(noServer, HOST)).toMatch(/__reb$/);
  });

  /* `https://${streamServerMTX}/${path}/index.m3u8?jwt=${mtxToken}` — https, and NO port. */
  it('builds the playlist URL exactly as the reference does', () => {
    expect(mtxPlaylistUrl(stream('a'), HOST, 'TOKEN')).toBe(
      'https://media.example.com/room__652882112ad80b3e7c5132d5__producer-a/index.m3u8?jwt=TOKEN'
    );
  });

  /* Ingest names 8889; playback does not. Getting this wrong produces a URL that never connects. */
  it('carries no port, unlike the WHIP ingest URL', () => {
    expect(mtxPlaylistUrl(stream('a'), HOST, 'TOKEN')).not.toContain(':8889');
    expect(mtxPlaylistUrl(stream('a'), HOST, 'TOKEN')).toMatch(/^https:\/\//);
  });
});

describe('isMtxStream — the wire boundary', () => {
  /*
    A deliberate divergence: upstream pushes `i.muser` into the list unchecked. Two of these fields
    are interpolated into a playback URL, so the shape is validated once, here, before it can reach
    `mtxPlaylistUrl`.
  */
  it('accepts a real stream, with and without serverName', () => {
    expect(isMtxStream(stream('a'))).toBe(true);
    expect(isMtxStream({ ...stream('a'), mediaValue: { name: 'Dana Vero' } })).toBe(true);
  });

  it('accepts the two id shapes the reference actually carries', () => {
    // A 24-character hex ObjectId, and a dashed UUID.
    const real = {
      _id: '652882112ad80b3e7c5132d5',
      sessionID: '652882112ad80b3e7c5132d5',
      producerID: '9f2c1a4e-6b0d-4f8a-9c3e-1d5b7a0e2f46',
      mediaValue: { name: 'Dana Vero' }
    };
    expect(isMtxStream(real)).toBe(true);
  });

  it('allows a space in the LABEL, which never enters a URL', () => {
    expect(isMtxStream({ ...stream('a'), mediaValue: { name: 'Dana Vero' } })).toBe(true);
  });

  it.each([
    ['a slash, which climbs out of the segment', 'room__x/../../etc'],
    ['a dot-dot segment', '..'],
    ['an encoded slash', 'x%2f..'],
    ['a query start, which would detach the jwt', 'x?jwt=stolen'],
    ['a fragment start, which truncates the URL', 'x#frag'],
    ['whitespace', 'x y'],
    ['empty', '']
  ])('refuses a producerID with %s', (_why, producerID) => {
    expect(isMtxStream({ ...stream('a'), producerID })).toBe(false);
  });

  it('refuses the same characters in _id and sessionID', () => {
    expect(isMtxStream({ ...stream('a'), _id: 'a/b' })).toBe(false);
    expect(isMtxStream({ ...stream('a'), sessionID: '?x' })).toBe(false);
  });

  it.each([
    ['null', null],
    ['a string', 'nope'],
    ['a number', 7],
    ['an array', []],
    ['no mediaValue', { _id: 'a', sessionID: 'b', producerID: 'c' }],
    ['a null mediaValue', { _id: 'a', sessionID: 'b', producerID: 'c', mediaValue: null }],
    ['a non-string name', { _id: 'a', sessionID: 'b', producerID: 'c', mediaValue: { name: 1 } }]
  ])('refuses %s', (_why, value) => {
    expect(isMtxStream(value)).toBe(false);
  });

  it('refuses a non-string serverName rather than ignoring it', () => {
    expect(isMtxStream({ ...stream('a'), mediaValue: { name: 'a', serverName: 5 } })).toBe(false);
  });
});
