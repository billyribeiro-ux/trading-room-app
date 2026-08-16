// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoomDialogs } from './dialogs.svelte';
import { RoomBroadcasts } from './broadcasts.svelte';

/*
  The three "for all" broadcasts, executed rather than read as text.

  `for-all-broadcast-contract.test.ts` reads the bundle, the remote module and both halves of this
  class as source, which is the right instrument for "does our sender post the command the reference
  posts". What it cannot do is RUN the receivers, and the invariant this class was reshaped around —
  that stopping a video also cancels an armed play — only exists at runtime.
*/

const make = () => {
  const sent: { channel: string; payload: unknown }[] = [];
  const dialogs = new RoomDialogs();
  const broadcasts = new RoomBroadcasts({
    dialogs,
    commands: {
      video: (payload) => (sent.push({ channel: 'video', payload }), Promise.resolve()),
      youtube: (payload) => (sent.push({ channel: 'youtube', payload }), Promise.resolve()),
      fileMedia: (payload) => (sent.push({ channel: 'fileMedia', payload }), Promise.resolve())
    }
  });
  return { broadcasts, dialogs, sent };
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('the senders post what the reference posts', () => {
  it('play and stop go out on their own channels', async () => {
    const { broadcasts, sent } = make();
    await broadcasts.playVideoForAll('https://example.test/a.mp4');
    await broadcasts.stopVideoForAll();
    await broadcasts.playYoutubeForAll('https://youtu.be/x');
    await broadcasts.stopYoutubeForAll();
    await broadcasts.playMp3ForAll('https://example.test/a.mp3');
    await broadcasts.stopMp3ForAll();

    expect(sent.map((s) => (s.payload as { cmd: string }).cmd)).toEqual([
      'playVideoForAll',
      'stopVideoForAll',
      'playYTForAll',
      'stopYTForAll',
      'playMP3ForAll',
      'stopMp3ForAll'
    ]);
  });

  it('surfaces a refusal as a dialog rather than dropping it', async () => {
    const dialogs = new RoomDialogs();
    const broadcasts = new RoomBroadcasts({
      dialogs,
      commands: {
        video: () => Promise.reject(new Error('nope')),
        youtube: () => Promise.resolve(),
        fileMedia: () => Promise.resolve()
      }
    });
    await broadcasts.playVideoForAll('https://example.test/a.mp4');
    expect(dialogs.alert, 'a refused broadcast must be visible').toBe('Command failed.');
  });
});

describe('the × is NOT Stop For All, and that distinction is the whole point', () => {
  it('closeYoutubeFrame dismisses only this browser and sends nothing', () => {
    /*
      The reference draws it by which bus it emits on: `stopYTForAll()` reaches the SERVER,
      `closeYTFrame()` emits on the local gui bus. That is why "Stop For All" is presenter-gated in
      the markup and "×" is not — a member must be able to dismiss an overlay over their own room
      without taking it away from the room.
    */
    const { broadcasts, sent } = make();
    broadcasts.youtubeStarted('https://youtu.be/x');
    broadcasts.closeYoutubeFrame();

    expect(broadcasts.youtubeForAllUrl).toBe('');
    expect(sent, 'the × must not reach the server').toEqual([]);
  });
});

describe('the receivers keep the invariants a setter would let a caller break', () => {
  it('videoStopped clears the picture, the schedule AND the armed timer', () => {
    const { broadcasts, sent } = make();
    broadcasts.scheduleVideoForAll(
      'https://example.test/a.mp4',
      new Date(Date.now() + 60_000).toISOString()
    );
    expect(broadcasts.scheduledVideoForAll.videoURL).not.toBe('');

    broadcasts.videoStopped();

    expect(broadcasts.videoPlayerUrl).toBe('');
    expect(broadcasts.hideVideoPlayer).toBe(false);
    expect(broadcasts.scheduledVideoForAll).toEqual({ videoURL: '', videoPlayTime: null });

    // The point of the whole reshape: a stop from ANOTHER presenter must cancel this browser's
    // pending play, or the video arrives minutes after the room was told it was removed.
    vi.advanceTimersByTime(120_000);
    expect(sent, 'an armed play fired after the room was told to stop').toEqual([]);
  });

  it('an armed play DOES fire when nothing stops it', () => {
    // The negative half: without this the test above would pass against a scheduler that never works.
    const { broadcasts, sent } = make();
    broadcasts.scheduleVideoForAll(
      'https://example.test/a.mp4',
      new Date(Date.now() + 60_000).toISOString()
    );
    vi.advanceTimersByTime(60_001);
    expect(sent.map((s) => (s.payload as { cmd: string }).cmd)).toEqual(['playVideoForAll']);
  });

  it('a time already past plays immediately rather than never', () => {
    const { broadcasts, sent } = make();
    broadcasts.scheduleVideoForAll(
      'https://example.test/a.mp4',
      new Date(Date.now() - 1_000).toISOString()
    );
    expect(sent.map((s) => (s.payload as { cmd: string }).cmd)).toEqual(['playVideoForAll']);
  });

  it('an unparseable time arms nothing and plays nothing, loudly', () => {
    const { broadcasts, sent } = make();
    broadcasts.scheduleVideoForAll('https://example.test/a.mp4', 'not a date');
    vi.advanceTimersByTime(120_000);
    expect(sent).toEqual([]);
    expect(broadcasts.scheduledVideoForAll.videoURL, 'nothing pending should be shown').toBe('');
  });

  it('mp3Started keeps the flag and the url in step, both directions', () => {
    // `mp3Playing` is a separate flag rather than `mp3Url !== null` because the reference gates
    // different things on each: the element binds the url, "Stop For All" reads the flag.
    const { broadcasts } = make();
    broadcasts.mp3Started('https://example.test/a.mp3');
    expect(broadcasts.mp3Url).toBe('https://example.test/a.mp3');
    expect(broadcasts.mp3Playing).toBe(true);

    broadcasts.mp3Stopped();
    expect(broadcasts.mp3Url).toBeNull();
    expect(broadcasts.mp3Playing).toBe(false);
  });
});

describe('it is actually reactive — one assertion per exposed getter group', () => {
  it('re-runs a reader when a video starts and stops', () => {
    const { broadcasts } = make();
    const seen: string[] = [];
    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(broadcasts.videoPlayerUrl);
      });
      flushSync();
      broadcasts.videoStarted('https://example.test/a.mp4');
      flushSync();
      broadcasts.videoStopped();
      flushSync();
    });
    stop();
    expect(seen, 'videoPlayerUrl is not reactive').toEqual(['', 'https://example.test/a.mp4', '']);
  });

  it('re-runs a reader of the YouTube url, which is a separate field', () => {
    const { broadcasts } = make();
    const seen: string[] = [];
    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(broadcasts.youtubeForAllUrl);
      });
      flushSync();
      broadcasts.youtubeStarted('https://youtu.be/x');
      flushSync();
    });
    stop();
    expect(seen.at(-1), 'youtubeForAllUrl is not reactive').toBe('https://youtu.be/x');
  });

  it('re-runs a reader of the mp3 flag', () => {
    const { broadcasts } = make();
    const seen: boolean[] = [];
    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(broadcasts.mp3Playing);
      });
      flushSync();
      broadcasts.mp3Started('https://example.test/a.mp3');
      flushSync();
    });
    stop();
    expect(seen, 'mp3Playing is not reactive').toEqual([false, true]);
  });
});
