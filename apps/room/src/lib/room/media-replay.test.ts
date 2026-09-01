import { describe, expect, it } from 'vitest';

import { mediaReplay } from './media-replay.js';
import type { RoomMediaState } from '#lib/server/room-media-state.js';

/**
 * The three rules of the late-join replay, each driven rather than read.
 *
 * They were nine lines in `onMount` until 2026-09-01 and had no test that did not involve mounting
 * a page and stubbing the clock. Every one of them is a decision taken from the capture, and two of
 * them are the kind a reasonable design gets backwards — so each gets a case that fails if it is.
 */

const NOTHING_PLAYING: RoomMediaState = {
  videoUrl: null,
  videoPlayTime: null,
  ytUrl: null,
  ytStartTime: null
};

/** A fixed moment, so every assertion below is about the derivation and not about when it ran. */
const NOW = Date.parse('2026-09-01T12:10:00.000Z');
const MEMBER = { isPresenter: false, now: NOW };
const PRESENTER = { isPresenter: true, now: NOW };

describe('an empty room replays nothing', () => {
  it('for a member and for a presenter alike', () => {
    expect(mediaReplay(NOTHING_PLAYING, MEMBER)).toEqual({
      videoUrl: null,
      showVideoTab: false,
      ytUrl: null,
      ytStartSeconds: 0
    });
    expect(mediaReplay(NOTHING_PLAYING, PRESENTER).showVideoTab).toBe(false);
  });
});

describe('RULE 1 — a video is replayed only while it is PLAYING', () => {
  it('replays a live play', () => {
    const replay = mediaReplay(
      { ...NOTHING_PLAYING, videoUrl: 'https://cdn.example.com/clip.mp4', videoPlayTime: null },
      MEMBER
    );
    expect(replay.videoUrl).toBe('https://cdn.example.com/clip.mp4');
  });

  it('refuses a play that is merely SCHEDULED, which is the term a design drops', () => {
    /*
      `roomState.videoURL && !roomState.videoPlayTime` — byte 1,967,330. An armed play has a url in
      the row and nothing on screen; replaying it drops an arriving member onto an empty VideoPlayer
      tab minutes before the video exists, which is worse than the gap this feature closes.
    */
    const replay = mediaReplay(
      {
        ...NOTHING_PLAYING,
        videoUrl: 'https://cdn.example.com/later.mp4',
        videoPlayTime: Date.parse('2026-09-01T18:00:00.000Z')
      },
      MEMBER
    );
    expect(replay.videoUrl).toBeNull();
    expect(replay.showVideoTab, 'and it certainly does not move the tab').toBe(false);
  });
});

describe('RULE 2 — the tab moves for a MEMBER and not for a presenter', () => {
  const playing: RoomMediaState = {
    ...NOTHING_PLAYING,
    videoUrl: 'https://cdn.example.com/clip.mp4',
    videoPlayTime: null
  };

  it('moves a member, whose VideoPlayer tab exists only while something is playing', () => {
    expect(mediaReplay(playing, MEMBER).showVideoTab).toBe(true);
  });

  it('leaves a presenter where they are, but still gives them the VIDEO', () => {
    /*
      `this.isP || this.onMainTabChange(...)` on the live path, byte 1,966,711. Both halves matter:
      withholding the video from a presenter as well would be reading the gate as being about the
      video rather than about the navigation.
    */
    const replay = mediaReplay(playing, PRESENTER);
    expect(replay.showVideoTab).toBe(false);
    expect(replay.videoUrl).toBe('https://cdn.example.com/clip.mp4');
  });
});

describe('RULE 3 — the YouTube offset is seconds since the stored moment', () => {
  const watching = (startTime: number | null): RoomMediaState => ({
    ...NOTHING_PLAYING,
    ytUrl: 'https://youtu.be/abc123',
    ytStartTime: startTime
  });

  it('derives elapsed seconds, rounded, exactly as the subscriber does', () => {
    /* `i = Math.round((s - o) / 1e3)`, byte 1,964,799. Ten minutes before `NOW`. */
    expect(
      mediaReplay(watching(Date.parse('2026-09-01T12:00:00.000Z')), MEMBER).ytStartSeconds
    ).toBe(600);
  });

  it('rounds rather than truncates, which is the reference s own choice', () => {
    /* 600.6s → 601, not 600. `Math.round`, not `Math.floor`; a truncation would pass a floor test. */
    expect(mediaReplay(watching(NOW - 600_600), MEMBER).ytStartSeconds).toBe(601);
  });

  it('is zero when the room stored no moment, which is the reference s `else`', () => {
    expect(mediaReplay(watching(null), MEMBER).ytStartSeconds).toBe(0);
    /* And the url still replays — a missing moment means "from the beginning", not "not at all". */
    expect(mediaReplay(watching(null), MEMBER).ytUrl).toBe('https://youtu.be/abc123');
  });

  it('CLAMPS at zero, which is ours and not the capture s', () => {
    /*
      A row written by a clock ahead of this one yields a negative, and `start=` with a negative is
      answered unpredictably rather than refused. The honest floor is the beginning.
    */
    expect(mediaReplay(watching(NOW + 30_000), MEMBER).ytStartSeconds).toBe(0);
  });

  it('replays a video and a YouTube overlay TOGETHER, because upstream has two branches', () => {
    /*
      Independent: the reference's constructor tests `videoURL` and `ytURL` separately and a room can
      be doing both. A design that treated media as one slot would silently drop one of them.
    */
    const replay = mediaReplay(
      {
        videoUrl: 'https://cdn.example.com/clip.mp4',
        videoPlayTime: null,
        ytUrl: 'https://youtu.be/abc123',
        ytStartTime: Date.parse('2026-09-01T12:09:00.000Z')
      },
      MEMBER
    );
    expect(replay.videoUrl).toBe('https://cdn.example.com/clip.mp4');
    expect(replay.ytUrl).toBe('https://youtu.be/abc123');
    expect(replay.ytStartSeconds).toBe(60);
    expect(replay.showVideoTab).toBe(true);
  });
});
