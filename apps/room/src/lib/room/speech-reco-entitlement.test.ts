import { afterEach, describe, expect, it, vi } from 'vitest';

import { RoomRecording } from './recording.js';

/**
 * THE ROOM HALF OF THE CAPTIONS GATE, which was quoted and not implemented.
 *
 * ## What was wrong
 *
 * `beginSpeechRecognition` reproduces the capture's refusal, and its docblock has quoted the
 * capture's own message since the method was written:
 *
 *     "Speech recognition not started: disabled by preferences or session settings"
 *
 * **Two sources, and this room gated on one.** Upstream, byte 1,110,427:
 *
 * ```js
 * if (!this.globals.preferences.doSpeechReco || !this.globals.hasSpeechRecognition) return …
 * ```
 *
 * where `hasSpeechRecognition` is `!sessData.hasSpeechRecognitionDisabled` (byte 1,147,900).
 * `hasSpeechRecognitionDisabled` was not on `ROOM_VISIBLE_SETTINGS`, so the room could not ask — and
 * an owner who turned captions off got them anyway, from every presenter, for everybody in the room.
 *
 * ## Why this is a behavioural test and not a source-text one
 *
 * `RoomGates.speechRecognitionAvailable` has its own test, and it proves the PREDICATE. What it
 * cannot prove is that anybody asks it — and a predicate nobody asks is exactly the failure being
 * fixed here. So this constructs the real `RoomRecording` and observes the difference.
 *
 * The observable is `console.warn`. With every other gate open, `beginSpeechRecognition` calls
 * `startSpeechRecognition`, which finds no Web Speech API in this environment and reports
 * `onfatal` — which the method logs. So the warning firing means the method got PAST its gates, and
 * its absence means it did not. That is a real signal rather than a proxy: no stub stands between
 * the gate and the observation.
 */

const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

afterEach(() => warn.mockClear());

/** Every collaborator stubbed down to the members this one method reads. */
function recordingWith(speechRecognitionAvailable: boolean) {
  return new RoomRecording({
    dialogs: {} as never,
    media: {} as never,
    menus: {} as never,
    prefs: { doSpeechReco: true } as never,
    mediaTransport: {
      session: {},
      microphoneStream: { getAudioTracks: () => [{ readyState: 'live' }] },
      signalling: null
    } as never,
    isPresenter: () => true,
    speechRecognitionAvailable: () => speechRecognitionAvailable
  });
}

describe('beginSpeechRecognition asks the room, not only the viewer', () => {
  /*
    THE POSITIVE CONTROL FIRST, and it is not a formality here.

    Every assertion below is "nothing happened". Without this one, a change that made
    `beginSpeechRecognition` return early for any other reason — a stub that stopped satisfying a
    gate, a renamed field — would leave the refusal tests passing over a method that never runs at
    all. That is the vacuous-test failure this repository has met four times.
  */
  it('starts when the room allows it and every other gate is open', () => {
    recordingWith(true).beginSpeechRecognition();
    expect(warn, 'the method never reached startSpeechRecognition').toHaveBeenCalledWith(
      '[captions] recognition stopped:',
      expect.stringContaining('not supported')
    );
  });

  it('refuses when the ROOM has disabled speech recognition', () => {
    recordingWith(false).beginSpeechRecognition();
    expect(warn).not.toHaveBeenCalled();
  });

  /*
    The preferences half still refuses on its own — the two gates are independent, and collapsing
    them would let a room setting override a viewer's own switch or the reverse.
  */
  it('still refuses on the viewer preference alone', () => {
    const recording = new RoomRecording({
      dialogs: {} as never,
      media: {} as never,
      menus: {} as never,
      prefs: { doSpeechReco: false } as never,
      mediaTransport: {
        session: {},
        microphoneStream: { getAudioTracks: () => [{ readyState: 'live' }] },
        signalling: null
      } as never,
      isPresenter: () => true,
      speechRecognitionAvailable: () => true
    });
    recording.beginSpeechRecognition();
    expect(warn).not.toHaveBeenCalled();
  });

  /*
    A MEMBER never captions, room setting or not — the server refuses `sendSpeechReco` from one, so
    starting recognition for them would spend a microphone and a CPU on lines nobody receives.
  */
  it('still refuses a member', () => {
    const recording = new RoomRecording({
      dialogs: {} as never,
      media: {} as never,
      menus: {} as never,
      prefs: { doSpeechReco: true } as never,
      mediaTransport: {
        session: {},
        microphoneStream: { getAudioTracks: () => [{ readyState: 'live' }] },
        signalling: null
      } as never,
      isPresenter: () => false,
      speechRecognitionAvailable: () => true
    });
    recording.beginSpeechRecognition();
    expect(warn).not.toHaveBeenCalled();
  });
});
