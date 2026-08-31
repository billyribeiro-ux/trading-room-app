import { describe, expect, it } from 'vitest';

import {
  readVideoList,
  videoListEntry,
  videoListStorageKey,
  writeVideoList
} from './video-list.js';

/**
 * VID-06 — the four captured refusal sentences, the normalisation, and where the list is kept.
 *
 * These lived inside `VideoPlayer.svelte`'s `sendVideoToRoom`, which meant the only way to reach them
 * was to mount the component and drive an input — so the four strings, every one of them a
 * transcription, had never been executed once.
 */

describe('videoListEntry — the ladder, in the reference s own order', () => {
  it('refuses an empty field before it complains about the scheme', () => {
    /*
      ORDER IS BEHAVIOUR. `if(e) if(this.validURL(e)) … else <scheme> ; else <empty>` at byte
      1,979,646 reads inside out because it is minified, and the outer test is emptiness — so a blank
      field is told it is blank, not told it is missing `https://`.
    */
    expect(videoListEntry('', [])).toEqual({ ok: false, alert: 'Error. URL is empty.' });
    expect(videoListEntry('   ', [])).toEqual({ ok: false, alert: 'Error. URL is empty.' });
  });

  it('refuses a url with neither scheme in it, in the capture s own words', () => {
    expect(videoListEntry('example.com/a.mp4', [])).toEqual({
      ok: false,
      alert: 'The link seems to be missing "https://" or "http://"'
    });
  });

  it('accepts a plain mp4 url, trimmed', () => {
    expect(videoListEntry('  https://cdn.example.com/a.mp4  ', [])).toEqual({
      ok: true,
      url: 'https://cdn.example.com/a.mp4'
    });
  });

  it('accepts `http://` too, and `includes` is what the reference tests with', () => {
    /*
      `validURL` is `toLowerCase().includes("http://") || …("https://")` at byte 1,979,590 — not a
      parse. Asserted rather than tightened: this is what decides whether a presenter's SAVED list
      still loads after an upgrade.
    */
    expect(videoListEntry('http://cdn.example.com/a.mp4', [])).toEqual({
      ok: true,
      url: 'http://cdn.example.com/a.mp4'
    });
    expect(videoListEntry('HTTPS://CDN.EXAMPLE.COM/A.MP4', [])).toMatchObject({ ok: true });
  });

  it('normalises a YouTube watch url to the embed url with autoplay', () => {
    expect(videoListEntry('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123', [])).toEqual({
      ok: true,
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1'
    });
  });

  it('and only when the string actually contains `youtube`', () => {
    /* `if(e.includes("youtube"))` — a vimeo link is passed through untouched. */
    expect(videoListEntry('https://vimeo.com/watch?v=abc', [])).toEqual({
      ok: true,
      url: 'https://vimeo.com/watch?v=abc'
    });
  });

  it('refuses a YouTube link that has a video id and no `list=`', () => {
    /*
      `if(!o||!r) return void bootbox.alert("The youtube link seems wrong.")` — the guard demands
      BOTH. This is the arm most people would expect to succeed, and upstream refuses it.
    */
    expect(videoListEntry('https://www.youtube.com/watch?v=dQw4w9WgXcQ', [])).toEqual({
      ok: false,
      alert: 'The youtube link seems wrong.'
    });
  });

  it('and refuses a pure playlist link — the reference s playlist arm is UNREACHABLE', () => {
    /*
      THE ASSERTION IS THAT THE ARM CANNOT RUN, not what it would return. The reference builds
      `…/embed/videoseries?list=…` two characters after a guard that has already refused every input
      that could reach it. Pinning the refusal is what makes the day somebody relaxes the guard a
      decision somebody took, rather than a behaviour that appeared.
    */
    const result = videoListEntry('https://www.youtube.com/playlist?list=PL123', []);
    expect(result).toEqual({ ok: false, alert: 'The youtube link seems wrong.' });
    expect(JSON.stringify(result)).not.toContain('videoseries');
  });

  it('tests for a duplicate AFTER normalising, so two spellings of one video are one entry', () => {
    /*
      The YouTube block runs before the `includes` test at byte 1,980,297, so `watch?v=X&list=Y` and
      an already-normalised embed url collide — which is the only reading under which the list cannot
      grow two rows that play the same thing.
    */
    const existing = ['https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1'];
    expect(
      videoListEntry('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1', existing)
    ).toEqual({ ok: false, alert: 'Video already exists.' });
  });

  it('refuses a plain duplicate', () => {
    expect(videoListEntry('https://a/b.mp4', ['https://a/b.mp4'])).toEqual({
      ok: false,
      alert: 'Video already exists.'
    });
  });

  it('never returns the success SENTENCE — that is the caller s', () => {
    /* `bootbox.alert("Video added.")` fires at the call site, after the push. */
    expect(JSON.stringify(videoListEntry('https://a/b.mp4', []))).not.toContain('Video added');
  });
});

/** A `Storage` with nothing behind it — enough for the two functions, and no jsdom. */
const stubStorage = (initial: Record<string, string> = {}): Storage => {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => map.delete(key) as unknown as void,
    setItem: (key: string, value: string) => void map.set(key, value)
  };
};

describe('where the list is kept', () => {
  it('keys the list by SESSION, which is the reference s own key', () => {
    /* `videos-${globals.sessionID}`, bytes 1,967,675 and 1,980,404. Two rooms, two lists. */
    expect(videoListStorageKey('abc123')).toBe('videos-abc123');
  });

  it('round-trips a list', () => {
    const storage = stubStorage();
    writeVideoList(storage, 'videos-x', ['https://a/1.mp4', 'https://a/2.mp4']);
    expect(readVideoList(storage, 'videos-x')).toEqual(['https://a/1.mp4', 'https://a/2.mp4']);
  });

  it('answers an empty list for a key that has never been written', () => {
    expect(readVideoList(stubStorage(), 'videos-x')).toEqual([]);
  });

  it('discards a corrupted value WHOLE rather than half of it', () => {
    /*
      The reference is `e && (this.videoList = JSON.parse(e))` and trusts whatever is under the key.
      Not-JSON, a number, an object and an array with one non-string in it all reach the `{#each}`
      upstream; the last is the interesting one, because filtering would leave a presenter a list
      they do not recognise while claiming it is theirs.
    */
    expect(readVideoList(stubStorage({ k: 'not json' }), 'k')).toEqual([]);
    expect(readVideoList(stubStorage({ k: '7' }), 'k')).toEqual([]);
    expect(readVideoList(stubStorage({ k: '{"a":1}' }), 'k')).toEqual([]);
    expect(readVideoList(stubStorage({ k: '["https://a/1.mp4",{"b":2}]' }), 'k')).toEqual([]);
  });
});
