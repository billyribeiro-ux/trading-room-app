/*
  HOW THIS BROWSER CAPTURES AUDIO — the four settings the A/V pane writes, and the constraint they
  build. One module because the two ends could not see each other, and that is what went wrong.

  ## The defect, measured 2026-08-30

  `ModalHost`'s A/V pane has four audio controls. All four persist. **Nothing read any of them.**

  | control | written at | read by |
  | --- | --- | --- |
  | microphone select | `ModalHost.svelte`, `onPreferenceChange('audioDeviceID', …)` | nothing |
  | Echo cancellation | `onPreferenceChange('echoCancellation', …)` | nothing |
  | Noise suppression | `onPreferenceChange('noiseSuppression', …)` | nothing |
  | Auto gain control | `onPreferenceChange('autoGainControl', …)` | nothing |

  `RoomLocalCapture.#enableMicrophone` asked for `{ audio: true }`, so a presenter who picked a
  headset microphone and switched noise suppression on was recorded on whatever the browser
  considered default, unprocessed, for every session. Four controls whose only effect was changing
  their own labels — and the three checkboxes did not even do that across a reload, because
  `ModalHost` seeded them `$state(false)` rather than from the saved value.

  This is the exact twin of a defect already fixed on 2026-08-26 for the OTHER half:
  `media-capture-contract.test.ts` records *"the AV settings modal was saving `videoDeviceID` and
  nothing ever read it back"*. The camera was wired that day; the microphone was not, and nothing
  noticed because both halves still compiled and both still captured something.

  ## The reference, at bundle byte 1,082,931

  ```js
  c = i.globals.audioDeviceID && 0 == r
    ? { audio: { deviceId: { exact: i.globals.audioDeviceID },
                 autoGainControl:  i.globals.preferences.autoGainControl,
                 noiseSuppression: i.globals.preferences.noiseSuppression,
                 echoCancellation: i.globals.preferences.echoCancellation } }
    : { audio: { autoGainControl:  i.globals.preferences.autoGainControl,
                 noiseSuppression: i.globals.preferences.noiseSuppression,
                 echoCancellation: i.globals.preferences.echoCancellation } }
  ```

  Two things are decided there and both are transcribed rather than improved on:

  **`exact`, not `ideal`.** The camera uses `ideal` here, and that difference is the reference's, not
  an inconsistency introduced now. `ideal` silently substitutes another device; for a microphone the
  reference would rather fail and retry, because being recorded through the wrong microphone is not
  a degraded success.

  **`0 == r` — the device constraint applies on the FIRST attempt only.** `r` is `enableMic`'s retry
  count, so a retry drops `deviceId` and keeps the three processing flags. That is what makes `exact`
  safe: the saved microphone being unplugged costs one failed attempt, not a presenter who cannot
  open their microphone at all. Both halves are needed; either alone is a defect.
*/

/**
 * WHAT THIS BROWSER IS CONFIGURED TO CAPTURE WITH — five saved values, as one thing.
 *
 * `videoDeviceID` rides along rather than being threaded separately, and the first draft of this
 * change is why. It sent the four audio values down a SECOND channel beside the existing
 * `videoDeviceId` thunk, which meant every hop between the composition root and the capture — the
 * transport, the local capture, the overlay, the modal — carried two parameters that are one idea:
 * the devices and processing the A/V pane configures. Five files grew for it. One value passes
 * through the same hops in one parameter, and `create-room` got shorter rather than longer.
 */
export interface CaptureSettings {
  /** `globals.audioDeviceID`. Empty string for "never chosen", which is what the select starts at. */
  readonly audioDeviceId: string;
  readonly echoCancellation: boolean;
  readonly noiseSuppression: boolean;
  readonly autoGainControl: boolean;
  /** `globals.videoDeviceID`. Read by the webcam paths since 2026-08-26; see `local-capture`. */
  readonly videoDeviceId: string;
}

/**
 * The four, read out of the saved settings blob with their types checked.
 *
 * `LoadedSettings` is `Record<string, unknown>` — it is whatever JSON was in the row — so every read
 * is guarded and every guard falls back to the browser's own default rather than to an invented
 * value. `false` for a flag never set is the reference's default too: `globals.preferences` starts
 * undefined for each, and `undefined` in a `MediaTrackConstraints` is the same as absent.
 */
export function captureSettingsFrom(loaded: Record<string, unknown>): CaptureSettings {
  const flag = (key: string) => loaded[key] === true;
  const text = (key: string) => (typeof loaded[key] === 'string' ? loaded[key] : '');
  return {
    audioDeviceId: text('audioDeviceID'),
    echoCancellation: flag('echoCancellation'),
    noiseSuppression: flag('noiseSuppression'),
    autoGainControl: flag('autoGainControl'),
    videoDeviceId: text('videoDeviceID')
  };
}

/**
 * What to pass `getUserMedia` for this attempt — byte 1,082,931, transcribed.
 *
 * `retryCount` is `#enableMicrophone`'s own parameter, which already existed and already counted the
 * right thing; this is the first reader of it. Anything above zero drops the device constraint, per
 * `0 == r`.
 *
 * An empty `audioDeviceId` also drops it — that is `i.globals.audioDeviceID &&`, and it is the state a
 * presenter who has never opened the A/V pane is in, which is most of them.
 */
export function audioCaptureConstraints(
  settings: CaptureSettings,
  retryCount: number
): MediaTrackConstraints {
  const processing = {
    autoGainControl: settings.autoGainControl,
    noiseSuppression: settings.noiseSuppression,
    echoCancellation: settings.echoCancellation
  };
  return settings.audioDeviceId && retryCount === 0
    ? { deviceId: { exact: settings.audioDeviceId }, ...processing }
    : processing;
}
