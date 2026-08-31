import { describe, expect, it } from 'vitest';

import {
  deviceEnumerationMessage,
  partitionInputDevices,
  resolveSelectedDevice,
  selectedDeviceLabel,
  type EnumeratedDevice
} from './device-enumeration.js';

/**
 * AVD-01 to AVD-04 — the A/V pane's device rules, executed for the first time.
 *
 * `av-device-pane-contract.test.ts` says in its own prose why these had no test: *"every path to
 * `devicesLoadError` goes through `navigator.mediaDevices`, which jsdom does not implement —
 * stubbing it would test the stub."* That is true of the component and it is why the rules left it.
 * Nothing here mounts anything or touches a browser API.
 */

const device = (kind: string, deviceId: string, label: string): EnumeratedDevice => ({
  kind,
  deviceId,
  label
});

describe('partitionInputDevices — which rows become options', () => {
  it('keeps audio inputs and video inputs, in the order the browser gave them', () => {
    const options = partitionInputDevices([
      device('audioinput', 'mic-1', 'Headset'),
      device('videoinput', 'cam-1', 'FaceTime HD'),
      device('audioinput', 'mic-2', 'Built-in')
    ]);
    expect(options.audio.map((option) => option.deviceId)).toEqual(['mic-1', 'mic-2']);
    expect(options.video.map((option) => option.deviceId)).toEqual(['cam-1']);
  });

  it('drops audiooutput, which the reference has no arm for', () => {
    /*
      `"audioinput" != s.kind || c ? ("videoinput" == s.kind && !c && …push) : …push` at byte
      2,162,800 — two arms and no third, so a speaker is silently not a microphone.
    */
    const options = partitionInputDevices([device('audiooutput', 'spk-1', 'Speakers')]);
    expect(options.audio).toEqual([]);
    expect(options.video).toEqual([]);
  });

  it('drops the synthetic `default` and `communications` ids', () => {
    /* `const a = "default" === s.deviceId || "communications" === s.deviceId`. */
    const options = partitionInputDevices([
      device('audioinput', 'default', 'Default'),
      device('audioinput', 'communications', 'Communications'),
      device('audioinput', 'mic-1', 'Headset')
    ]);
    expect(options.audio.map((option) => option.deviceId)).toEqual(['mic-1']);
  });

  it('drops a `Default - X` row only when the plain X is also present', () => {
    /*
      THE `some` IS THE RULE, not the prefix. Both directions asserted, because a prefix-only test
      passes the first of these and fails the second — and the second is a real machine: one
      microphone, reported once, labelled `Default - Headset`.
    */
    const aliased = partitionInputDevices([
      device('audioinput', 'mic-0', 'Default - Headset'),
      device('audioinput', 'mic-1', 'Headset')
    ]);
    expect(aliased.audio.map((option) => option.deviceId)).toEqual(['mic-1']);

    const alone = partitionInputDevices([device('audioinput', 'mic-0', 'Default - Headset')]);
    expect(alone.audio.map((option) => option.deviceId)).toEqual(['mic-0']);
  });

  it('matches the alias across the SAME kind only', () => {
    /* `f.kind === s.kind` — a camera called `Headset` must not hide the microphone called that. */
    const options = partitionInputDevices([
      device('audioinput', 'mic-0', 'Default - Headset'),
      device('videoinput', 'cam-1', 'Headset')
    ]);
    expect(options.audio.map((option) => option.deviceId)).toEqual(['mic-0']);
  });

  it('AVD-04 — synthesises a label the reference builds and then throws away', () => {
    /*
      `r = \`${s.kind} (${s.deviceId.substring(0,8)}...)\`` is computed at byte 2,162,800 and never
      reaches the dropdown: the list is pushed the raw `s` and the option renders `e.label`, so an
      unlabelled device is a BLANK row upstream. This room renders the synthesised one — a deliberate
      divergence, because a dropdown of blank rows cannot be operated.
    */
    const options = partitionInputDevices([device('audioinput', 'abcdefghijklmnop', '')]);
    expect(options.audio[0].label).toBe('audioinput (abcdefgh...)');
  });

  it('and says `unknown` rather than `...` when there is no id to slice either', () => {
    const options = partitionInputDevices([device('videoinput', '', '')]);
    expect(options.video[0].label).toBe('videoinput (unknown)');
  });
});

describe('selectedDeviceLabel — the three things the "Selected:" line can say', () => {
  const listed = [{ deviceId: 'mic-1', label: 'Headset' }];

  it('names the device when it is in the list', () => {
    expect(selectedDeviceLabel(listed, 'mic-1')).toBe('Headset');
  });

  it('says `Unknown Device` when the list is populated and the id is not in it', () => {
    /* `return s ? s.label : "Unknown Device"` — byte 2,161,900, and this arm is the reference's. */
    expect(selectedDeviceLabel(listed, 'mic-9')).toBe('Unknown Device');
  });

  it('does NOT say `Unknown Device` about a list nothing has looked at yet', () => {
    /*
      The divergence, and the reason for it: this pane opens without enumerating, so an empty list is
      the normal state and `Unknown Device` would be said about a microphone that is very likely
      plugged in. The two empty-list sentences differ on whether anything was ever chosen.
    */
    expect(selectedDeviceLabel([], 'mic-1')).toContain('Saved');
    expect(selectedDeviceLabel([], '')).toContain('None chosen');
    expect(selectedDeviceLabel([], 'mic-1')).not.toContain('Unknown Device');
    expect(selectedDeviceLabel([], '')).not.toContain('Unknown Device');
  });
});

describe('resolveSelectedDevice — AVD-02, and whether the pane just made a choice', () => {
  const devices = [
    { deviceId: 'mic-1', label: 'Headset' },
    { deviceId: 'mic-2', label: 'Built-in' }
  ];

  it('keeps the saved device, and reports that nothing was chosen', () => {
    expect(resolveSelectedDevice(devices, 'mic-2')).toEqual({ deviceId: 'mic-2', fellBack: false });
  });

  it('falls back to the FIRST device and says so', () => {
    /*
      `e.currentAudioDevice = s ? globals.audioDeviceID : e.audioDevicesList[0].deviceId` — byte
      2,163,287. `fellBack` is the `s ||` on the next line, and it is what the caller writes on.
    */
    expect(resolveSelectedDevice(devices, 'gone')).toEqual({ deviceId: 'mic-1', fellBack: true });
  });

  it('treats "never chosen" as a fallback, because it is one', () => {
    expect(resolveSelectedDevice(devices, '')).toEqual({ deviceId: 'mic-1', fellBack: true });
  });

  it('refuses an empty list rather than inventing a selection', () => {
    /* The reference guards with `if (…length > 0)` around the whole block; this fails loud instead. */
    expect(() => resolveSelectedDevice([], 'mic-1')).toThrow(/no devices/);
  });
});

describe('deviceEnumerationMessage — AVD-03, all five arms', () => {
  const named = (name: string, message = 'boom') => {
    const error = new Error(message);
    error.name = name;
    return error;
  };

  it('NotFoundError', () => {
    expect(deviceEnumerationMessage(named('NotFoundError'))).toBe(
      'No audio or video devices found. Please connect a microphone and/or camera.'
    );
  });

  it('NotAllowedError', () => {
    expect(deviceEnumerationMessage(named('NotAllowedError'))).toBe(
      'Permission denied. Please allow access to your microphone and camera in your browser settings.'
    );
  });

  it('NotSupportedError — the arm this pane did not have', () => {
    /*
      The one worth naming. Without it a `NotSupportedError` fell through to
      `Error loading devices: <whatever the browser said>` — a sentence with no next step in it,
      where all four of its siblings name one.
    */
    expect(deviceEnumerationMessage(named('NotSupportedError'))).toBe(
      'Your browser does not support device enumeration. Please use a modern browser.'
    );
  });

  it('SecurityError', () => {
    expect(deviceEnumerationMessage(named('SecurityError'))).toBe(
      'Security error. Please ensure the page is loaded over HTTPS.'
    );
  });

  it('anything else carries the browser s own sentence', () => {
    expect(deviceEnumerationMessage(named('WeirdError', 'the camera is on fire'))).toBe(
      'Error loading devices: the camera is on fire'
    );
  });

  it('and a message-less or non-Error throw still says something', () => {
    /* `i.message || "Unknown error"` is the reference's own, not a defensive addition. */
    expect(deviceEnumerationMessage(named('WeirdError', ''))).toBe(
      'Error loading devices: Unknown error'
    );
    expect(deviceEnumerationMessage('a string')).toBe('Error loading devices: Unknown error');
  });
});
