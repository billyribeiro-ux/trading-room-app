import { beforeEach, describe, expect, it } from 'vitest';

import { db, ensureDatabase } from '#lib/server/db/index.js';
import { roomState } from '#lib/server/db/schema.js';
import {
  clearVideoForAll,
  clearYoutubeForAll,
  recordVideoForAll,
  recordYoutubeForAll,
  roomMediaState
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
