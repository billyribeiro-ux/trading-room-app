import { beforeEach, describe, expect, it } from 'vitest';

import { db, ensureDatabase } from '#lib/server/db/index.js';
import { roomState } from '#lib/server/db/schema.js';
import {
  claimDueVideos,
  clearVideoForAll,
  clearYoutubeForAll,
  recordVideoForAll,
  recordYoutubeForAll,
  roomMediaState,
  sweepDueVideos
} from '#lib/server/room-media-state.js';

/**
 * THE ROUND TRIP, DRIVEN — where `for-all-broadcast-contract.test.ts` reads the source.
 *
 * That file pins the shape: which columns exist, what order the write and the broadcast go in, that
 * the live wire still carries no `startTime`. None of it proves the row survives a write and comes
 * back, and none of it can catch the two failures this feature actually has:
 *
 *   * a `set` clause that clears the OTHER medium, so starting a video takes the room's YouTube
 *     overlay away from everyone who was watching it;
 *   * a stop that leaves the timestamp behind, so the row says a video is armed for a url that no
 *     longer exists.
 *
 * Both are silent. The room keeps working and the replay quietly does the wrong thing, which is the
 * shape this repository writes behavioural tests for.
 */

const ROOM = 'media-state-room';
const OTHER = 'media-state-other-room';

beforeEach(() => {
  ensureDatabase();
  db.delete(roomState).run();
});

describe('a room that has played nothing', () => {
  it('answers empty rather than throwing, because no row is the common case', () => {
    expect(roomMediaState(ROOM)).toEqual({
      videoUrl: null,
      videoPlayTime: null,
      ytUrl: null,
      ytStartTime: null
    });
  });

  it('and so does a caller with no short code at all', () => {
    /*
      The guest door reaches media state from a branch where the code is `string | undefined`. An
      assertion at the call site would be asserting something true today and unchecked tomorrow;
      answering honestly costs one line, and no short code means no row to read.
    */
    expect(roomMediaState(undefined).videoUrl).toBeNull();
  });
});

describe('the video round trip', () => {
  it('stores what the room is watching and reads it back', () => {
    recordVideoForAll(ROOM, 'https://cdn.example.com/clip.mp4', null);
    const state = roomMediaState(ROOM);
    expect(state.videoUrl).toBe('https://cdn.example.com/clip.mp4');
    /* NULL is "playing now" — the reference's own "Play now" value, and what the replay gate reads. */
    expect(state.videoPlayTime).toBeNull();
  });

  it('keeps a SCHEDULED play distinguishable from a live one', () => {
    /*
      The replay gate is `videoURL && !videoPlayTime` (byte 1,967,330). If a schedule were stored as
      a bare url the arriving member would be dropped onto an empty VideoPlayer tab minutes before
      the video exists — so the two cases must be different rows, not different readings of one.
    */
    const when = new Date('2026-09-01T18:00:00.000Z');
    recordVideoForAll(ROOM, 'https://cdn.example.com/later.mp4', when);
    expect(roomMediaState(ROOM).videoPlayTime).toBe(when.getTime());
  });

  it('replaces rather than appending a second opinion about what is playing', () => {
    recordVideoForAll(ROOM, 'https://cdn.example.com/first.mp4', null);
    recordVideoForAll(ROOM, 'https://cdn.example.com/second.mp4', null);
    expect(roomMediaState(ROOM).videoUrl).toBe('https://cdn.example.com/second.mp4');
    expect(db.select().from(roomState).all()).toHaveLength(1);
  });

  it('clears the SCHEDULE as well as the url on stop', () => {
    /*
      `subscribe("stopVideoForAll", () => { videoPlayerUrl = ""; scheduledVideo.videoURL = "";
      scheduledVideo.videoPlayTime = null; … })` — byte 1,966,882, read back to the server. A stop
      that left the timestamp behind leaves a row saying a video is armed for a url that is gone.
    */
    recordVideoForAll(ROOM, 'https://cdn.example.com/clip.mp4', new Date('2026-09-01T18:00:00Z'));
    clearVideoForAll(ROOM);
    expect(roomMediaState(ROOM)).toMatchObject({ videoUrl: null, videoPlayTime: null });
  });

  it('stopping a room that never played anything writes no row', () => {
    /* An upsert here would create a row whose every media column is null — storage saying nothing. */
    clearVideoForAll(ROOM);
    expect(db.select().from(roomState).all()).toHaveLength(0);
  });
});

describe('the YouTube round trip', () => {
  it('stores the MOMENT, not an offset', () => {
    /*
      `ytStartTime` is when the room started playing. The elapsed seconds are the subscriber's, for
      every member separately, because the answer depends on when each of them arrives — which is
      exactly why nothing on this side computes one.
    */
    const started = new Date('2026-09-01T12:00:00.000Z');
    recordYoutubeForAll(ROOM, 'https://youtu.be/abc123', started);
    const state = roomMediaState(ROOM);
    expect(state.ytUrl).toBe('https://youtu.be/abc123');
    expect(state.ytStartTime).toBe(started.getTime());
  });

  it('re-stamps the moment on a second play, so the offset is about THIS video', () => {
    const first = new Date('2026-09-01T12:00:00.000Z');
    const second = new Date('2026-09-01T12:30:00.000Z');
    recordYoutubeForAll(ROOM, 'https://youtu.be/first', first);
    recordYoutubeForAll(ROOM, 'https://youtu.be/second', second);
    const state = roomMediaState(ROOM);
    expect(state.ytUrl).toBe('https://youtu.be/second');
    /* Not `first`: a late joiner would otherwise be seeked thirty minutes into a video just started. */
    expect(state.ytStartTime).toBe(second.getTime());
  });

  it('clears the moment with the url', () => {
    recordYoutubeForAll(ROOM, 'https://youtu.be/abc123');
    clearYoutubeForAll(ROOM);
    expect(roomMediaState(ROOM)).toMatchObject({ ytUrl: null, ytStartTime: null });
  });
});

describe('the two media are independent, as they are upstream', () => {
  it('starting a video leaves the room s YouTube overlay alone', () => {
    /*
      THE SILENT ONE. Both replay, and both are separate branches in the reference's constructor. An
      over-wide `set` clause here takes the overlay away from everybody who was watching it, and the
      room keeps working: nothing errors, the video plays, and the next person to join sees no
      YouTube. Asserted in both directions because the mistake is equally easy either way.
    */
    recordYoutubeForAll(ROOM, 'https://youtu.be/abc123', new Date('2026-09-01T12:00:00.000Z'));
    recordVideoForAll(ROOM, 'https://cdn.example.com/clip.mp4', null);
    const state = roomMediaState(ROOM);
    expect(state.ytUrl).toBe('https://youtu.be/abc123');
    expect(state.videoUrl).toBe('https://cdn.example.com/clip.mp4');
  });

  it('and stopping one leaves the other playing', () => {
    recordYoutubeForAll(ROOM, 'https://youtu.be/abc123');
    recordVideoForAll(ROOM, 'https://cdn.example.com/clip.mp4', null);
    clearVideoForAll(ROOM);
    expect(roomMediaState(ROOM).ytUrl).toBe('https://youtu.be/abc123');
    clearYoutubeForAll(ROOM);
    expect(roomMediaState(ROOM).ytUrl).toBeNull();
  });

  it('and neither write disturbs the chat mode or the close message sharing the row', () => {
    /*
      `room_state` is one row per room and it already held two unrelated facts. A `set` naming too
      much would reset a room's chat mode because somebody pressed Play, which is the kind of defect
      that gets attributed to anything but the video.
    */
    db.insert(roomState)
      .values({
        roomShortCode: ROOM,
        chatMode: 'p',
        closedMessage: 'Back at nine.',
        updatedAt: new Date()
      })
      .run();
    recordVideoForAll(ROOM, 'https://cdn.example.com/clip.mp4', null);
    recordYoutubeForAll(ROOM, 'https://youtu.be/abc123');
    clearVideoForAll(ROOM);
    const row = db.select().from(roomState).get();
    expect(row?.chatMode).toBe('p');
    expect(row?.closedMessage).toBe('Back at nine.');
  });
});

describe('the room short code scopes it, as it scopes every other channel here', () => {
  it('one room s video is invisible to another', () => {
    /*
      The tenancy question, asked of new storage on the day it is added. Every realtime channel in
      this application is namespaced by the room, and a media state that was not would show one
      room's video to another room's members.
    */
    recordVideoForAll(ROOM, 'https://cdn.example.com/clip.mp4', null);
    expect(roomMediaState(OTHER).videoUrl).toBeNull();
    recordYoutubeForAll(OTHER, 'https://youtu.be/other');
    expect(roomMediaState(ROOM).ytUrl).toBeNull();
    expect(roomMediaState(OTHER).ytUrl).toBe('https://youtu.be/other');
  });
});

describe('the server-side scheduler for a play armed later', () => {
  /*
    `TODO.md`'s consequence 2. Until 2026-09-01 an armed play was a `window.setTimeout` in the
    presenter's browser, so closing the tab cancelled it. The schedule is a row now and the sweep
    fires it — which is what the capture does, and the dispatch is what proves it: it forwards `url`
    alone (byte 1,024,587), so if the browser were the scheduler there would be nothing for the
    server to hold and the payload would not carry a time.

    Driven rather than read, because the two things that can go wrong here are invisible to a source
    assertion: firing early or late by a unit error, and firing TWICE when two sweeps race.
  */
  const AT = new Date('2026-09-01T18:00:00.000Z');

  it('does not fire before the moment', () => {
    recordVideoForAll(ROOM, 'https://cdn.example.com/later.mp4', AT);
    expect(claimDueVideos(new Date(AT.getTime() - 1))).toEqual([]);
    /* And the row is untouched, so the next sweep still has something to find. */
    expect(roomMediaState(ROOM).videoPlayTime).toBe(AT.getTime());
  });

  it('fires AT the moment, not a tick after it', () => {
    /*
      `lte`, not `lt`. A boundary written the other way leaves a play armed for exactly 18:00:00.000
      waiting for the next sweep — up to fifteen seconds late, which is the kind of off-by-one that
      never reproduces on a machine whose clock is not on the boundary.
    */
    recordVideoForAll(ROOM, 'https://cdn.example.com/later.mp4', AT);
    expect(claimDueVideos(AT)).toEqual([
      { roomShortCode: ROOM, url: 'https://cdn.example.com/later.mp4' }
    ]);
  });

  it('marks it LIVE in the same statement that claims it', () => {
    /*
      The schedule and the claim are one column: `SET video_play_time = NULL` both fires the row and
      makes the replay gate (`videoUrl && !videoPlayTime`) start answering with it. A member joining
      one second after the sweep gets the video, which is the whole point of the two features being
      built against the same column.
    */
    recordVideoForAll(ROOM, 'https://cdn.example.com/later.mp4', AT);
    claimDueVideos(AT);
    const state = roomMediaState(ROOM);
    expect(state.videoPlayTime).toBeNull();
    expect(state.videoUrl).toBe('https://cdn.example.com/later.mp4');
  });

  it('fires EXACTLY ONCE, which is what the conditional UPDATE buys', () => {
    /*
      THE RACE. A SELECT-then-UPDATE is a TOCTOU — `CLAUDE.md` names it — and two sweeps that both
      read a due row would both broadcast it, so the room would see the video start twice. The second
      claim here stands in for the losing sweep: it must come back empty.
    */
    recordVideoForAll(ROOM, 'https://cdn.example.com/later.mp4', AT);
    expect(claimDueVideos(AT)).toHaveLength(1);
    expect(claimDueVideos(AT), 'a second sweep must find nothing').toEqual([]);
  });

  it('claims every due room, because one room s play must not wait on another s', () => {
    recordVideoForAll(ROOM, 'https://cdn.example.com/a.mp4', AT);
    recordVideoForAll(OTHER, 'https://cdn.example.com/b.mp4', AT);
    expect(claimDueVideos(AT)).toHaveLength(2);
  });

  it('leaves a row whose url was cleared UNTOUCHED, rather than claiming and dropping it', () => {
    /*
      ── THE FIRST VERSION OF THIS CASE COULD NOT FAIL, AND ITS CONTROL SAID SO ──────────────────

      It asserted only `claimDueVideos(AT)` comes back empty, and deleting the `isNotNull(videoUrl)`
      predicate left it GREEN — because the `flatMap` that narrows the return type already drops a
      row with no url. The case was testing the type narrowing, not the guard.

      What the guard actually buys is the SIDE EFFECT: without it the row is claimed, its
      `video_play_time` is nulled, and then it is thrown away — a schedule silently discarded by a
      sweep that had nothing to do with it. So the row is read back, which is where the difference
      lives.

      It cannot arise through this module's own writers, since `clearVideoForAll` nulls both. That is
      exactly why it is worth asserting: the guard's whole value is against a path that does not
      exist yet, and a guard nobody can see working is a guard somebody deletes.
    */
    recordVideoForAll(ROOM, 'https://cdn.example.com/later.mp4', AT);
    db.update(roomState).set({ videoUrl: null }).run();
    expect(claimDueVideos(AT)).toEqual([]);
    expect(
      roomMediaState(ROOM).videoPlayTime,
      'the sweep must not consume a schedule it cannot act on'
    ).toBe(AT.getTime());
  });

  it('a STOP cancels an armed play, for everyone, including a closed browser', () => {
    /*
      The second thing moving the schedule fixed. While the timer was local a stop could only cancel
      it in browsers that were still open; now `clearVideoForAll` nulls the time, so the sweep never
      finds it.
    */
    recordVideoForAll(ROOM, 'https://cdn.example.com/later.mp4', AT);
    clearVideoForAll(ROOM);
    expect(claimDueVideos(AT)).toEqual([]);
  });

  it('the sweep publishes what it claimed, once per room', () => {
    const published: { room: string; url: string }[] = [];
    recordVideoForAll(ROOM, 'https://cdn.example.com/a.mp4', AT);
    recordVideoForAll(OTHER, 'https://cdn.example.com/b.mp4', AT);
    expect(sweepDueVideos((room, url) => published.push({ room, url }), AT)).toBe(2);
    expect(published).toEqual([
      { room: ROOM, url: 'https://cdn.example.com/a.mp4' },
      { room: OTHER, url: 'https://cdn.example.com/b.mp4' }
    ]);
    /* Nothing left to fire, so a second sweep is silent. */
    expect(sweepDueVideos(() => {}, AT)).toBe(0);
  });

  it('one room failing to publish does not take the rest of the batch with it', () => {
    /*
      And it is NOT retried, deliberately: the row is already live, so a retry would have to re-arm a
      schedule the presenter did not ask for. It is reported instead — the loud failure `CLAUDE.md`
      asks for rather than a silent loop.
    */
    recordVideoForAll(ROOM, 'https://cdn.example.com/a.mp4', AT);
    recordVideoForAll(OTHER, 'https://cdn.example.com/b.mp4', AT);
    const reached: string[] = [];
    const count = sweepDueVideos((room) => {
      if (room === ROOM) throw new Error('hub is down');
      reached.push(room);
    }, AT);
    expect(count).toBe(2);
    expect(reached, 'the second room still got its video').toEqual([OTHER]);
  });
});
