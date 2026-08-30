import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CaptionStaleness, SPEECH_RECO_STALE_MS } from './caption-staleness';

/**
 * `PA-01` — the checker, executed.
 *
 * ```js
 * startSpeechChecker() {
 *   this.speechRecoInterval || (this.speechRecoInterval = setInterval(() => {
 *     this.lastSpeechRecoEvent + 7e3 < Date.now()
 *       ? (this.currentSpeechReco = null, this.showSpeechRecognition = !1, this.stopSpeechChecker())
 *       : … }, 7e3))
 * }
 * ```                                                                        // byte 1,956,753
 *
 * Four properties, and every one of them has a way of being wrong that a source assertion cannot
 * see: the caption survives a short silence, it goes after a long one, a second line does not start
 * a second timer, and the checker stops itself so a quiet room holds none.
 */
describe('the caption staleness checker', () => {
  let now = 0;
  const advance = (ms: number) => {
    now += ms;
    vi.advanceTimersByTime(ms);
  };

  beforeEach(() => {
    now = 1_000_000;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const checker = () => {
    const stale: number[] = [];
    const subject = new CaptionStaleness({
      onStale: () => stale.push(now),
      now: () => now
    });
    return { subject, stale };
  };

  it('does not run until something has been said', () => {
    expect(checker().subject.running).toBe(false);
  });

  it('runs once a caption arrives', () => {
    const { subject } = checker();
    subject.seen();
    expect(subject.running).toBe(true);
  });

  it('leaves the caption alone while the room is still talking', () => {
    /*
      The window is re-armed by every line. A checker that fired on a fixed schedule regardless would
      clear a caption mid-sentence.
    */
    const { subject, stale } = checker();
    subject.seen();
    advance(SPEECH_RECO_STALE_MS - 1);
    subject.seen();
    advance(SPEECH_RECO_STALE_MS - 1);
    expect(stale).toEqual([]);
    expect(subject.running).toBe(true);
  });

  it('clears the caption once the room has been quiet for the window', () => {
    const { subject, stale } = checker();
    subject.seen();
    advance(SPEECH_RECO_STALE_MS * 2);
    expect(stale).toHaveLength(1);
  });

  it('stops itself, so a silent room holds no timer', () => {
    /*
      `stopSpeechChecker()` is called from INSIDE the stale branch. Without it the interval runs for
      the life of the page in every room, presenting or not.
    */
    const { subject } = checker();
    subject.seen();
    advance(SPEECH_RECO_STALE_MS * 2);
    expect(subject.running).toBe(false);
  });

  it('announces once, not once per tick', () => {
    const { subject, stale } = checker();
    subject.seen();
    advance(SPEECH_RECO_STALE_MS * 10);
    expect(stale).toHaveLength(1);
  });

  it('starts ONE timer however many captions arrive', () => {
    /*
      `this.speechRecoInterval || (…)` is what makes `startSpeechChecker` idempotent. Two intervals
      would each fire and the second would outlive the `stop()` the first performed.
    */
    const { subject, stale } = checker();
    subject.seen();
    subject.seen();
    subject.seen();
    expect(vi.getTimerCount()).toBe(1);
    advance(SPEECH_RECO_STALE_MS * 2);
    expect(stale).toHaveLength(1);
  });

  it('restarts after a silence, because the room can start talking again', () => {
    const { subject, stale } = checker();
    subject.seen();
    advance(SPEECH_RECO_STALE_MS * 2);
    expect(subject.running).toBe(false);

    subject.seen();
    expect(subject.running).toBe(true);
    advance(SPEECH_RECO_STALE_MS * 2);
    expect(stale).toHaveLength(2);
  });

  it('stops on request and announces nothing after — the overlay X', () => {
    // `PA-02`: dismissing the overlay stops the checker, or a timer wakes up to clear a hidden box.
    const { subject, stale } = checker();
    subject.seen();
    subject.stop();
    expect(subject.running).toBe(false);
    advance(SPEECH_RECO_STALE_MS * 4);
    expect(stale).toEqual([]);
  });

  it('is safe to stop twice', () => {
    const { subject } = checker();
    subject.seen();
    subject.stop();
    subject.stop();
    expect(subject.running).toBe(false);
  });
});
