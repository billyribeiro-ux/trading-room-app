/*
  WHAT `enumerateDevices()` HANDED BACK, TURNED INTO TWO DROPDOWNS — and the five sentences a
  failure gets.

  ## Why this is a module and not the middle of `AvDevicePane.svelte`

  Extracted 2026-08-31 while auditing that pane against the v4 bundle. The pane's own contract test
  says why, in as many words: *"every path to `devicesLoadError` goes through `navigator.mediaDevices`,
  which jsdom does not implement — stubbing it would test the stub."* So the five error sentences and
  the duplicate-device rules — the two pieces of this pane most likely to be quietly reworded or
  simplified — were the two pieces NOTHING could execute.

  They are pure functions of their arguments. Pulled out, they are ordinary unit tests with no
  browser in them, and `device-enumeration-contract.test.ts` runs every branch of both. That is the
  whole reason for the slice; the lines it takes off a file sitting one under its ceiling are the
  smaller half.

  Everything below is transcribed from `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`,
  read at the offsets each block names.
*/

/**
 * One row of `enumerateDevices()`, structurally.
 *
 * `MediaDeviceInfo` itself would drag the DOM lib into every caller and, worse, into every test —
 * and a test that has to construct a `MediaDeviceInfo` is a test that constructs a stub. This is the
 * subset the reference reads (`s.kind`, `s.deviceId`, `s.label`, byte 2,162,800) and a real
 * `MediaDeviceInfo` satisfies it without a cast.
 */
export interface EnumeratedDevice {
  readonly kind: string;
  readonly deviceId: string;
  readonly label: string;
}

/**
 * What a `<select>` option needs: the value it submits and the text it shows.
 *
 * **`AvDevicePane` does not use this name on its two `$state.raw` declarations, and that is
 * deliberate rather than an oversight.** `capture-settings-contract.test.ts:217` pins those two
 * lines as STRINGS — `let audioDevices = $state.raw<{ deviceId: string; label: string }[]>([])` —
 * so writing the alias there fails a contract whose actual claim is the `([])`: that the lists start
 * empty, because enumerating means asking a presenter for their camera. `DeviceOption` is
 * structurally that literal, so the pane loses nothing by spelling it out.
 *
 * Recorded here rather than fixed there because the assertion is what should move: pinning a whole
 * declaration makes a contract fail on a rename that cannot change what it claims, and the repair a
 * reader reaches for is to paste the new spelling in — which turns a contract into a transcript.
 * That file is outside the scope this change was given; the row is named in the report instead.
 */
export interface DeviceOption {
  readonly deviceId: string;
  readonly label: string;
}

/**
 * The label to show — and the ONE place this room deliberately does better than the capture.
 *
 * The reference computes exactly this string, byte 2,162,800:
 *
 * ```js
 * let r = s.label;
 * (null == r || "" === r) && (r = `${s.kind} (${s.deviceId.substring(0, 8)}...)`);
 * ```
 *
 * and then **never uses it in the dropdown**. Read the rest of that `forEach`: `r` feeds the
 * `"default - "` duplicate test and a `console.log`, and the value pushed onto `audioDevicesList` is
 * the raw `s`. The option template renders `e.label` (`Ne(" ", e.label, " ")`, byte 2,141,984), so a
 * device the browser has not labelled — which is every device before permission is granted — shows
 * as a BLANK ENTRY upstream. The synthesised label is built and dropped.
 *
 * This room uses it, and that is a deliberate divergence rather than an oversight: a dropdown of
 * blank rows is a control that cannot be operated, and the reference already wrote the sentence that
 * fixes it. `AVD-04` in `docs/decoded/room-surface-audit-2026-08-30.md` records the measurement.
 *
 * The `deviceId` guard is ours too: `substring` on an empty id yields `"..."`, which names nothing.
 */
const labelFor = (device: EnumeratedDevice): string =>
  device.label ||
  `${device.kind} (${device.deviceId ? `${device.deviceId.slice(0, 8)}...` : 'unknown'})`;

/**
 * Whether this row is the SAME microphone the list already holds under an alias.
 *
 * Byte 2,162,800, verbatim in structure:
 *
 * ```js
 * const a = "default" === s.deviceId || "communications" === s.deviceId;
 * let l = !1;
 * if (r.toLowerCase().startsWith("default - ")) {
 *   const h = r.substring(10);
 *   l = o.some(f => f.kind === s.kind && f.label === h && f.deviceId !== s.deviceId)
 * }
 * ```
 *
 * Two rules, and they are not the same rule twice. Chrome reports the synthetic ids `default` and
 * `communications` as real entries; it ALSO reports the chosen default a second time with the label
 * `"Default - Headset"`. The second is only a duplicate if the plain `"Headset"` is present as well
 * — which is what the `some` checks, and why it cannot be reduced to a prefix test. A machine with a
 * single microphone labelled `"Default - Headset"` and nothing else keeps it.
 *
 * `10` is `"default - ".length`, and it is the reference's own literal.
 */
const isAliasOfAnother = (device: EnumeratedDevice, all: readonly EnumeratedDevice[]): boolean => {
  if (device.deviceId === 'default' || device.deviceId === 'communications') return true;
  const label = labelFor(device);
  if (!label.toLowerCase().startsWith('default - ')) return false;
  const physicalLabel = label.slice(10);
  return all.some(
    (candidate) =>
      candidate.kind === device.kind &&
      candidate.label === physicalLabel &&
      candidate.deviceId !== device.deviceId
  );
};

/**
 * The two dropdowns, from one `enumerateDevices()` answer.
 *
 * Outputs are new arrays every call, which is what lets the pane hold them in `$state.raw`: they are
 * replaced wholesale and never edited in place, so a deep proxy over them would be cost with no
 * reader.
 *
 * `audiooutput` rows are dropped without a mention because the reference drops them the same way —
 * its `forEach` tests `"audioinput" != s.kind` and `"videoinput" == s.kind` and has no third arm.
 */
export function partitionInputDevices(devices: readonly EnumeratedDevice[]): {
  audio: DeviceOption[];
  video: DeviceOption[];
} {
  const keep = (kind: string) =>
    devices
      .filter((device) => device.kind === kind && !isAliasOfAnother(device, devices))
      .map((device) => ({ deviceId: device.deviceId, label: labelFor(device) }));
  return { audio: keep('audioinput'), video: keep('videoinput') };
}

/**
 * What the pane's "Selected:" line says, in the three states it can actually be in.
 *
 * The reference has two, byte 2,161,900:
 *
 * ```js
 * getDeviceLabel(e, i) {
 *   const s = ("audioinput" === i ? this.audioDevicesList : this.videoDevicesList)
 *     .find(r => r.deviceId === e);
 *   return s ? s.label : "Unknown Device"
 * }
 * ```
 *
 * `Unknown Device` for anything not in the list is right upstream, where the list is populated in
 * `ngAfterViewInit` and is therefore never empty by the time anybody reads this. It is wrong here:
 * this pane deliberately opens without enumerating (the header of `AvDevicePane.svelte` argues that,
 * and `media-capture-contract.test.ts` is what requires it), so an empty list is the NORMAL state and
 * `Unknown Device` would be said about a microphone that is very likely plugged in and working.
 *
 * Saying "the browser has not been asked yet" is the true statement. Saying `Unknown Device` about
 * something nothing has looked for is the confident-but-false shape this repository refuses — and it
 * is what the two fabricated seed devices SC-02 removed were hiding.
 */
export function selectedDeviceLabel(devices: readonly DeviceOption[], current: string): string {
  const found = devices.find((device) => device.deviceId === current);
  if (found) return found.label;
  if (devices.length > 0) return 'Unknown Device';
  return current
    ? 'Saved — press Refresh Devices to confirm it is still connected'
    : 'None chosen — press Refresh Devices to list them';
}

/**
 * ── AVD-02 — WHICH DEVICE IS SELECTED AFTER AN ENUMERATION, AND WHETHER THAT WAS A CHOICE ───────
 *
 * Byte 2,163,287, and the `s ||` on the third line is the whole row:
 *
 * ```js
 * const s = e.audioDevicesList.some(r => r.deviceId === e.appService.globals.audioDeviceID);
 * e.currentAudioDevice = s ? e.appService.globals.audioDeviceID : e.audioDevicesList[0].deviceId;
 * s || (e.appService.globals.audioDeviceID = e.currentAudioDevice,
 *       e.appService.localstorage.set("audioDeviceID", e.currentAudioDevice))
 * ```
 *
 * The saved id being absent from the list is exactly the case where the pane picks FOR the member,
 * and it was the one case this pane picked without recording. The select's `onchange` was the only
 * writer of the preference, and a fallback is not a change event — so the "Selected:" line named one
 * microphone while `capture.audioDeviceId`, which is what `audioCaptureConstraints` builds
 * `deviceId: { exact: … }` from, still named the one that had gone. The pane looked like it had
 * resolved the problem and the capture kept failing on it.
 *
 * `fellBack` is returned rather than the caller re-deriving it, because the caller's write is a
 * SERVER write: re-saving a value that was already saved is one request per Refresh press that
 * changes nothing, and the reference's `s ||` is precisely the guard against that.
 *
 * Callers must not pass an empty list — there is no device to fall back TO, and answering `''` would
 * be inventing a selection. The reference guards the same way, with `if (…length > 0)` around the
 * whole block.
 */
export function resolveSelectedDevice(
  devices: readonly DeviceOption[],
  saved: string
): { deviceId: string; fellBack: boolean } {
  if (devices.length === 0) throw new Error('resolveSelectedDevice: no devices to choose from');
  return devices.some((device) => device.deviceId === saved)
    ? { deviceId: saved, fellBack: false }
    : { deviceId: devices[0].deviceId, fellBack: true };
}

/**
 * What to tell the member when the enumeration threw — five sentences, byte 2,164,760.
 *
 * ```js
 * e.devicesLoadError = "NotFoundError" === i.name
 *   ? "No audio or video devices found. Please connect a microphone and/or camera."
 *   : "NotAllowedError" === i.name
 *     ? "Permission denied. Please allow access to your microphone and camera in your browser settings."
 *     : "NotSupportedError" === i.name
 *       ? "Your browser does not support device enumeration. Please use a modern browser."
 *       : "SecurityError" === i.name
 *         ? "Security error. Please ensure the page is loaded over HTTPS."
 *         : `Error loading devices: ${i.message || "Unknown error"}`
 * ```
 *
 * **`NotSupportedError` was the missing one** and it is the one nobody would notice missing: it is
 * the name `getUserMedia` throws where the API exists but the requested capture does not, so the
 * member fell through to `Error loading devices: <whatever the browser said>` — a sentence with no
 * next step in it, where four of its five siblings name one. `AVD-03` records it.
 *
 * Every one of the five is TRANSIENT, which is the argument SC-09 already makes at the Retry button:
 * a permission that can be granted, a device that can be plugged in, a page that can be reloaded
 * over HTTPS, a browser that can be swapped. That is why the wording is worth pinning — each of them
 * is telling somebody what to go and do.
 *
 * A non-`Error` throw reaches the last arm with `'Unknown error'`, which is the reference's own
 * `i.message || "Unknown error"` and not a defensive addition.
 */
export function deviceEnumerationMessage(cause: unknown): string {
  const name = cause instanceof Error ? cause.name : '';
  if (name === 'NotFoundError') {
    return 'No audio or video devices found. Please connect a microphone and/or camera.';
  }
  if (name === 'NotAllowedError') {
    return 'Permission denied. Please allow access to your microphone and camera in your browser settings.';
  }
  if (name === 'NotSupportedError') {
    return 'Your browser does not support device enumeration. Please use a modern browser.';
  }
  if (name === 'SecurityError') {
    return 'Security error. Please ensure the page is loaded over HTTPS.';
  }
  const message = cause instanceof Error ? cause.message : '';
  return `Error loading devices: ${message || 'Unknown error'}`;
}
