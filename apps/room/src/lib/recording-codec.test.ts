/**
 * What the recorder encodes with.
 *
 * Every branch here decides someone's recording quality, and none of them should rest on a manual
 * check in one browser — which is why `chooseRecordingOptions` takes `isSupported` as an argument.
 */
import { describe, expect, it } from 'vitest';
import {
  chooseRecordingOptions,
  extensionFor,
  RECORDING_AUDIO_BITS_PER_SECOND,
  RECORDING_PREFERENCES,
  RECORDING_VIDEO_BITS_PER_SECOND
} from './recording-codec';

/** A browser that supports exactly the listed types and nothing else. */
const supporting =
  (...types: string[]) =>
  (mimeType: string) =>
    types.includes(mimeType);

describe('chooseRecordingOptions', () => {
  /*
    THE test.

    `docs/streaming-choices.md` row 4 measured, on realistic chart content, that VP9 is the only
    codec that keeps scaling with the cap — 3841 kbps at an 8 Mbps cap and 6414 at 16, where H.264
    saturates at ~2033 and ignores anything higher. So VP9 must win whenever it is available, or
    every presenter silently loses about 1.8 Mbps of detail.
  */
  it('prefers VP9 whenever the browser supports it', () => {
    const choice = chooseRecordingOptions(
      supporting('video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/mp4')
    );
    expect(choice.mimeType).toBe('video/webm;codecs=vp9,opus');
    expect(choice.extension).toBe('webm');
    expect(choice.usedFallback).toBe(false);
  });

  it('falls to AV1, then VP8, before ever reaching mp4', () => {
    expect(
      chooseRecordingOptions(supporting('video/webm;codecs=av01,opus', 'video/mp4')).mimeType
    ).toBe('video/webm;codecs=av01,opus');
    expect(
      chooseRecordingOptions(supporting('video/webm;codecs=vp8,opus', 'video/mp4')).mimeType
    ).toBe('video/webm;codecs=vp8,opus');
  });

  /*
    Safari supports no webm profile and produces `video/mp4` natively, so it reaches the bottom of
    the list immediately — and gets the MP4 the owner asked for without anything special. That it
    saturates near 2 Mbps is a property of the encoder, measured in row 4, not of this choice.
  */
  it('gives Safari an mp4, with the right extension', () => {
    const choice = chooseRecordingOptions(
      supporting('video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4')
    );
    expect(choice.mimeType).toBe('video/mp4;codecs=avc1,mp4a.40.2');
    expect(choice.extension).toBe('mp4');
  });

  /*
    `new MediaRecorder(stream, { mimeType })` THROWS on an unsupported type. A recording that fails
    to start is worse than one at the browser's default, so nothing-supported must yield
    `undefined` rather than a hopeful string.
  */
  it('returns undefined rather than forcing a type no browser supports', () => {
    const choice = chooseRecordingOptions(() => false);
    expect(choice.mimeType).toBeUndefined();
    expect(choice.usedFallback).toBe(true);
    // The bitrate still applies — those options are independent of the container.
    expect(choice.videoBitsPerSecond).toBe(RECORDING_VIDEO_BITS_PER_SECOND);
  });

  it('always asks for a bitrate, which is the whole point', () => {
    // The recorder was `new MediaRecorder(stream)` with no options, so the browser chose ~2.5 Mbps
    // and the measured 3841 kbps of available detail was never spent.
    for (const isSupported of [supporting(RECORDING_PREFERENCES[0]), () => false]) {
      const choice = chooseRecordingOptions(isSupported);
      expect(choice.videoBitsPerSecond).toBe(8_000_000);
      expect(choice.audioBitsPerSecond).toBe(RECORDING_AUDIO_BITS_PER_SECOND);
    }
  });

  /*
    8 Mbps is the BOTTOM of row 4's "VP9 @ 8-12 Mbps", and deliberately so: a second 1080p encode
    competes with the live encoder, and on a loaded machine that drops frames on the share members
    are watching. The recording is for the presenter; the stream is for everyone.
  */
  it('caps the bitrate where the presenter CPU warning says to', () => {
    expect(RECORDING_VIDEO_BITS_PER_SECOND).toBe(8_000_000);
    expect(RECORDING_VIDEO_BITS_PER_SECOND).toBeLessThan(12_000_000);
  });
});

describe('extensionFor', () => {
  it('names an mp4 an mp4', () => {
    // Naming an mp4 `.webm` produces a file the OS refuses to open.
    expect(extensionFor('video/mp4')).toBe('mp4');
    expect(extensionFor('video/mp4;codecs=avc1,mp4a.40.2')).toBe('mp4');
    expect(extensionFor('VIDEO/MP4')).toBe('mp4');
  });

  it('names everything else webm', () => {
    expect(extensionFor('video/webm;codecs=vp9,opus')).toBe('webm');
    expect(extensionFor('video/webm')).toBe('webm');
  });
});

describe('the preference list itself', () => {
  it('is ordered by the measured bitrate ceiling, best first', () => {
    const vp9 = RECORDING_PREFERENCES.findIndex((t) => t.includes('vp9'));
    const av1 = RECORDING_PREFERENCES.findIndex((t) => t.includes('av01'));
    const vp8 = RECORDING_PREFERENCES.findIndex((t) => t.includes('vp8'));
    const mp4 = RECORDING_PREFERENCES.findIndex((t) => t.includes('mp4'));

    // 6414 > 3802 > (vp8) > 2033 kbps at a 16 Mbps cap, from row 4's table.
    expect(vp9).toBeLessThan(av1);
    expect(av1).toBeLessThan(vp8);
    expect(vp8).toBeLessThan(mp4);
  });

  it('names codecs explicitly, never a bare container', () => {
    // A bare `video/webm` lets the browser choose the codec inside it, which is exactly the
    // situation this module exists to end. `video/mp4` is the one exception: it is the last-resort
    // fallback, and Safari accepts nothing more specific.
    const bare = RECORDING_PREFERENCES.filter((t) => !t.includes('codecs='));
    expect(bare).toEqual(['video/mp4']);
  });
});
