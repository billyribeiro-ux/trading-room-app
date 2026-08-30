// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { audioCaptureConstraints, captureSettingsFrom } from './capture-settings';

/*
  THE A/V PANE'S SIX CONTROLS ALL PERSISTED, AND NOTHING READ ANY OF THEM.

  Measured 2026-08-30 by grepping every writer and looking for a reader:

  | preference | written by | read by, before this |
  | --- | --- | --- |
  | `audioDeviceID` | the microphone select | nothing |
  | `echoCancellation` | its checkbox | nothing |
  | `noiseSuppression` | its checkbox | nothing |
  | `autoGainControl` | its checkbox | nothing |
  | `videoDeviceID` | the camera select | `RoomLocalCapture`, since 2026-08-26 |

  `RoomLocalCapture.#enableMicrophone` asked for `{ audio: true }`. So a presenter who chose a
  headset microphone and switched noise suppression on was captured through whatever the browser
  considered default, unprocessed, in every session — four controls whose only effect was changing
  their own labels, which is the shape this repository names and refuses.

  It is the exact twin of a defect fixed here five days earlier. `media-capture-contract.test.ts`
  records it in those words: *"the AV settings modal was saving `videoDeviceID` and nothing ever read
  it back"*. The camera was wired that day and the microphone was not, and nothing noticed because
  both halves still compiled and both still captured something. A contract over the audio half is
  what stops the third occurrence.
*/

const NONE = captureSettingsFrom({});
const CHOSEN = captureSettingsFrom({
  audioDeviceID: 'mic-7',
  videoDeviceID: 'cam-3',
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: false
});

describe('reading the saved settings', () => {
  it('falls back to the browser default rather than to an invented value', () => {
    /*
      `LoadedSettings` is `Record<string, unknown>` — whatever JSON was in the row — so every read is
      guarded. Empty string for a device means "never chosen", which drops the constraint entirely;
      it does NOT mean a device called "".
    */
    expect(NONE).toEqual({
      audioDeviceId: '',
      videoDeviceId: '',
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    });
  });

  it('refuses a value of the wrong type instead of passing it through', () => {
    const wrong = captureSettingsFrom({
      audioDeviceID: 42,
      videoDeviceID: null,
      echoCancellation: 'yes',
      noiseSuppression: 1
    });
    /* A number reaching `deviceId: { exact: … }` is a `TypeError` at the capture, not here. */
    expect(wrong.audioDeviceId).toBe('');
    expect(wrong.videoDeviceId).toBe('');
    expect(wrong.echoCancellation, "'yes' is not true").toBe(false);
    expect(wrong.noiseSuppression, '1 is not true').toBe(false);
  });

  it('reads the five it is asked for', () => {
    expect(CHOSEN).toEqual({
      audioDeviceId: 'mic-7',
      videoDeviceId: 'cam-3',
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false
    });
  });
});

describe('the constraint, transcribed from bundle byte 1,082,931', () => {
  it('names the chosen device EXACTLY on the first attempt', () => {
    /*
      `deviceId: { exact: … }`, not `ideal`. The camera beside it uses `ideal`, and the difference is
      the reference's rather than an inconsistency introduced here: `ideal` silently substitutes
      another device, and being recorded through the wrong microphone is not a degraded success.
    */
    expect(audioCaptureConstraints(CHOSEN, 0)).toEqual({
      deviceId: { exact: 'mic-7' },
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false
    });
  });

  it('drops the device on a retry, and keeps the processing flags', () => {
    /*
      `0 == r` in the reference. This is what makes `exact` safe: the saved microphone being
      unplugged costs one failed attempt rather than a presenter who cannot open their microphone at
      all. Both halves are needed — `exact` without the retry is a lockout, the retry without `exact`
      is the silent substitution `exact` exists to prevent.
    */
    expect(audioCaptureConstraints(CHOSEN, 1)).toEqual({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false
    });
    expect(audioCaptureConstraints(CHOSEN, 2)).not.toHaveProperty('deviceId');
  });

  it('drops the device when none was ever chosen, which is most presenters', () => {
    // `i.globals.audioDeviceID &&` — the other half of the same condition.
    expect(audioCaptureConstraints(NONE, 0)).toEqual({
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    });
  });

  it('always sends the three processing flags, on both branches', () => {
    /*
      The reference sets them in BOTH arms of its ternary. Sending them only with a chosen device
      would make echo cancellation depend on whether a microphone had been picked, which is two
      settings wearing one checkbox.
    */
    for (const retry of [0, 1]) {
      for (const settings of [NONE, CHOSEN]) {
        const built = audioCaptureConstraints(settings, retry);
        expect(built).toHaveProperty('echoCancellation');
        expect(built).toHaveProperty('noiseSuppression');
        expect(built).toHaveProperty('autoGainControl');
      }
    }
  });
});

describe('the capture actually asks for it', () => {
  /*
    Source assertions, because the alternative is a browser. What went wrong was not the constraint
    being wrong — it did not exist — so what has to be pinned is that the capture calls this at all,
    and that nothing has quietly gone back to `{ audio: true }`.
  */
  const capture = readFileSync(
    fileURLToPath(new URL('./room/local-capture.svelte.ts', import.meta.url)),
    'utf8'
  );

  it('builds the microphone constraint from the saved settings, with the retry count', () => {
    expect(capture).toContain('audioCaptureConstraints(this.#capture(), retryCount)');
  });

  it('no longer asks for a bare `{ audio: true }`', () => {
    expect(
      capture,
      'this is what four controls wrote a preference into for months and never reached'
    ).not.toContain('getUserMedia({ audio: true })');
  });

  it('passes the retry count rather than a constant', () => {
    /* `audioCaptureConstraints(this.#capture(), 0)` would pin the device on every retry forever. */
    expect(capture).not.toMatch(/audioCaptureConstraints\([^)]*,\s*\d+\s*\)/);
  });
});

describe('the pane shows what is in force, not what was invented', () => {
  const paneSource = readFileSync(
    fileURLToPath(new URL('./components/AvDevicePane.svelte', import.meta.url)),
    'utf8'
  );
  /*
    COMMENTS STRIPPED, and the first draft of this file is why. The two assertions below forbid the
    invented device literals — and the component's own docblock QUOTES them, because it records what
    was removed and why. So the test failed on its own explanation. That is the comment-versus-code
    trap the root standard names, met again; `profile-picture-contract.test.ts` carries the same
    helper for the same reason.
  */
  const pane = paneSource
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('seeds every one of the five controls from the saved settings', () => {
    for (const field of [
      'echoCancellation',
      'noiseSuppression',
      'autoGainControl',
      'audioDeviceId',
      'videoDeviceId'
    ]) {
      expect(pane, `${field} must be seeded, not defaulted`).toContain(
        `untrack(() => capture.${field})`
      );
    }
  });

  it('carries no invented device', () => {
    /*
      The two seeds it replaced were `Studio Display Microphone (05ac:1118)` and
      `Studio Display Camera (15bc:0000)` with 64-character device ids — somebody's real hardware,
      hardcoded, shown to every viewer as their own and pre-selected in both dropdowns. Neither id
      appears anywhere in the reference bundle.
    */
    expect(pane).not.toMatch(/Studio Display/);
    expect(pane, 'a 64-character hex literal here is a device id somebody pasted').not.toMatch(
      /[0-9a-f]{64}/
    );
  });

  it('starts with no devices listed, because enumerating means asking for permission', () => {
    /*
      A divergence taken deliberately. The reference enumerates in `ngAfterViewInit` (byte
      2,159,387), which prompts a presenter for their camera because they opened a settings pane;
      `media-capture-contract.test.ts` keeps every capture behind an explicit click here.
    */
    expect(pane).toContain(
      'let audioDevices = $state.raw<{ deviceId: string; label: string }[]>([])'
    );
    expect(pane).toContain(
      'let videoDevices = $state.raw<{ deviceId: string; label: string }[]>([])'
    );
  });
});
