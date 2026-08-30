<script lang="ts">
  import { untrack } from 'svelte';

  import type { CaptureSettings } from '#lib/capture-settings.js';

  /*
    THE A/V DEVICE PANE — which microphone and camera this browser captures with, and how.

    ## Extracted from `ModalHost.svelte` on 2026-08-30, and it is a real slice

    Six controls, one `loadDevices`, and about two hundred lines that nothing else in that file
    touched. It came out because the fix below needed lines in a file already on its ceiling, and the
    ratchet's instruction is to extract rather than raise — but it passes the test that file's own
    header demands of an extraction, which is that it is a slice somebody would have drawn anyway.
    `ChatArchivePane`, `UserNotesPane` and `ScheduledAlerts` are the same shape.

    ## The defect it was extracted to fix

    All six controls persisted a preference. **Nothing read any of them**, and three of them did not
    even restore their own saved value:

    | control | was | now |
    | --- | --- | --- |
    | microphone select | seeded to an INVENTED device id | seeded from `capture.audioDeviceId` |
    | camera select | seeded to an INVENTED device id | seeded from `capture.videoDeviceId` |
    | Echo cancellation | `$state(false)` every open | seeded from the saved value |
    | Noise suppression | `$state(false)` every open | seeded from the saved value |
    | Auto gain | `$state(false)` every open | seeded from the saved value |

    The two invented ids were `Studio Display Microphone (05ac:1118)` and
    `Studio Display Camera (15bc:0000)`, with 64-character device ids that appear nowhere in the
    reference bundle and nowhere else in this repository. Somebody's real hardware, hardcoded, shown
    to every viewer as their own and pre-selected in both dropdowns.

    `#lib/capture-settings.ts` carries the other half — the constraint the microphone capture now
    builds from these values, and the reference bytes for it.

    ## The lists start EMPTY, and that is a divergence taken deliberately

    The reference enumerates in `ngAfterViewInit` (byte 2,159,387), which prompts a presenter for
    their camera and microphone because they opened a settings pane. `loadDevices` here calls
    `getUserMedia` for the same reason the reference does — an unpermitted `enumerateDevices`
    returns devices with empty labels — and `media-capture-contract.test.ts` deliberately keeps
    every capture behind an explicit click. So the pane opens saying it has not looked yet, and
    Refresh Devices is what looks.
  */

  interface Props {
    /** Every device and processing flag this pane saves, as saved. See `#lib/capture-settings.ts`. */
    capture: CaptureSettings;
    onPreferenceChange: (key: string, value: unknown) => void;
  }

  const { capture, onPreferenceChange }: Props = $props();

  /*
    SEEDED FROM THE SAVED SETTINGS, which is the whole point of the prop above. `untrack` because
    these are seeds and then locally owned: the user must be able to change a control without the
    preference having round-tripped, which is the same decision `streamingProtocol` records.
  */
  let echoCancellation = $state(untrack(() => capture.echoCancellation));
  let noiseSuppression = $state(untrack(() => capture.noiseSuppression));
  let autoGainControl = $state(untrack(() => capture.autoGainControl));
  let currentAudioDevice = $state(untrack(() => capture.audioDeviceId));
  let currentVideoDevice = $state(untrack(() => capture.videoDeviceId));
  /* Empty until Refresh Devices is pressed — see the note above on why this is not enumerated here. */
  let audioDevices = $state.raw<{ deviceId: string; label: string }[]>([]);
  let videoDevices = $state.raw<{ deviceId: string; label: string }[]>([]);
  let devicesLoading = $state(false);
  let devicesLoadError = $state('');

  /**
   * What the "Selected:" line says, in the three states it can actually be in.
   *
   * It used to say `Unknown Device` whenever the id was not in the list, which — now that the lists
   * start empty — would be every open before Refresh, about a device that is very likely connected
   * and working. Saying "not listed yet" is the true statement; saying "Unknown Device" about
   * something the browser has simply not been asked about is the confident-but-false shape this
   * repository refuses, and it is what the fabricated seed was hiding.
   */
  const selectedLabel = (devices: { deviceId: string; label: string }[], current: string) =>
    devices.find((device) => device.deviceId === current)?.label ??
    (devices.length > 0
      ? 'Unknown Device'
      : current
        ? 'Saved — press Refresh Devices to confirm it is still connected'
        : 'None chosen — press Refresh Devices to list them');

  async function loadDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      devicesLoadError =
        'Your browser does not support device enumeration. Please use a modern browser.';
      return;
    }

    devicesLoading = true;
    devicesLoadError = '';
    const streams: MediaStream[] = [];
    try {
      try {
        streams.push(await navigator.mediaDevices.getUserMedia({ audio: true }));
      } catch {
        // The compiled client continues and enumerates devices without labels.
      }
      try {
        streams.push(await navigator.mediaDevices.getUserMedia({ video: true }));
      } catch {
        // The compiled client continues and enumerates devices without labels.
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const isDuplicateDefault = (device: MediaDeviceInfo) => {
        const label = device.label;
        if (device.deviceId === 'default' || device.deviceId === 'communications') return true;
        if (!label.toLowerCase().startsWith('default - ')) return false;
        const physicalLabel = label.slice(10);
        return devices.some(
          (candidate) =>
            candidate.kind === device.kind &&
            candidate.label === physicalLabel &&
            candidate.deviceId !== device.deviceId
        );
      };
      const toOption = (device: MediaDeviceInfo) => ({
        deviceId: device.deviceId,
        label:
          device.label ||
          `${device.kind} (${device.deviceId ? `${device.deviceId.slice(0, 8)}...` : 'unknown'})`
      });

      const nextAudio = devices
        .filter((device) => device.kind === 'audioinput' && !isDuplicateDefault(device))
        .map(toOption);
      const nextVideo = devices
        .filter((device) => device.kind === 'videoinput' && !isDuplicateDefault(device))
        .map(toOption);
      if (nextAudio.length) {
        audioDevices = nextAudio;
        if (!nextAudio.some((device) => device.deviceId === currentAudioDevice)) {
          currentAudioDevice = nextAudio[0].deviceId;
        }
      }
      if (nextVideo.length) {
        videoDevices = nextVideo;
        if (!nextVideo.some((device) => device.deviceId === currentVideoDevice)) {
          currentVideoDevice = nextVideo[0].deviceId;
        }
      }
      if (!nextAudio.length && !nextVideo.length) {
        devicesLoadError =
          'No audio or video devices detected. Please ensure devices are connected and permissions are granted.';
      }
    } catch (error) {
      const deviceError = error as DOMException;
      devicesLoadError =
        deviceError.name === 'NotFoundError'
          ? 'No audio or video devices found. Please connect a microphone and/or camera.'
          : deviceError.name === 'NotAllowedError'
            ? 'Permission denied. Please allow access to your microphone and camera in your browser settings.'
            : deviceError.name === 'SecurityError'
              ? 'Security error. Please ensure the page is loaded over HTTPS.'
              : `Error loading devices: ${deviceError.message || 'Unknown error'}`;
    } finally {
      for (const stream of streams) {
        for (const track of stream.getTracks()) track.stop();
      }
      devicesLoading = false;
    }
  }
</script>

<div class="d-flex justify-content-end align-items-center mt-2 mb-3">
  <!--
    SC-15 — `z("disabled", e.devicesLoading)` and
    `z("ngClass", e.devicesLoading ? "fa-spinner fa-spin" : "fa-sync-alt")` at byte 2,154,613.

    The button was always live and its icon never moved, so pressing Refresh twice fired a second
    `getUserMedia` while the first was still resolving — and the pane looked identical throughout,
    which is why anybody would press it twice.
  -->
  <button
    type="button"
    title="Refresh device list"
    class="btn btn-sm btn-outline-primary"
    disabled={devicesLoading}
    onclick={() => void loadDevices()}
  >
    <i class={['fas', devicesLoading ? 'fa-spinner fa-spin' : 'fa-sync-alt']}></i> Refresh Devices
  </button>
</div>
<!--
  SC-16 — const 49 is `[1,"alert","alert-info"]` and this read `text-center my-3`.

  Not cosmetic: `alert-info` is a bordered, coloured block and the pair below it — the error, const
  50 `alert alert-danger` — already was one. A loading state that renders as bare centred text next
  to an error that renders as a panel reads as two different KINDS of message, when they are the two
  outcomes of the same button.
-->
{#if devicesLoading}
  <div class="alert alert-info">
    <i class="fas fa-spinner fa-spin"></i>{' Loading devices... '}
  </div>
{/if}
<!--
  ── SC-09 — THE ERROR HAD NO WAY OUT ──────────────────────────────────────────────────────────

  ```js
  function uDe(t,n){ … d(0,"div",50), T(1,"i",92), v(2), d(3,"button",93),
      x("click", () => loadDevices()), T(4,"i",94), v(5," Retry ") … Ne(" ", e.devicesLoadError, " ") }
  50 [1,"alert","alert-danger"]   92 [1,"fas","fa-exclamation-triangle"]
  93 ["type","button",1,"btn","btn-sm","btn-outline-secondary","ml-2",3,"click"]   94 [1,"fas","fa-redo"]
  ```
  (byte 2,141,127.)

  Every one of the five errors this pane can raise is TRANSIENT — a denied permission the member can
  grant, a device they can plug in, a page they can reload over HTTPS. The Refresh button above is
  the way out and it is at the top of the pane, above a red block that ends the reading; a member who
  fixes the problem the message describes has nothing beside the message to press. The reference puts
  Retry inside the alert, which is where somebody who has just read it is looking.

  The surrounding spaces on the message are `Ne(" ", e.devicesLoadError, " ")`.
-->
{#if devicesLoadError}
  <div class="alert alert-danger">
    <i class="fas fa-exclamation-triangle"></i>{` ${devicesLoadError} `}
    <button
      type="button"
      class="btn btn-sm btn-outline-secondary ml-2"
      onclick={() => void loadDevices()}
    >
      <i class="fas fa-redo"></i>{' Retry '}
    </button>
  </div>
{/if}
<!--
  ── SC-10 — AN EMPTY SELECT IS NOT A MESSAGE ──────────────────────────────────────────────────

  ```js
  O(99,  audioDevicesList?.length > 0 ? 99  : devicesLoading || devicesLoadError ? -1 : 100)
  O(101, videoDevicesList?.length > 0 ? 101 : devicesLoading || devicesLoadError ? -1 : 102)
  function mDe(t,n){ d(0,"div",100), T(1,"i",101), v(2," Please connect audio devices. ") }
  function vDe(t,n){ d(0,"div",100), T(1,"i",104), v(2," Please connect video devices. ") }
  100 [1,"form-group","text-white"]  101 [1,"fas","fa-microphone-slash"]  104 [1,"fas","fa-video-slash"]
  ```
  (byte 2,142,196.)

  The gate replaces the WHOLE group — label, select and the "Selected:" line — rather than adding a
  message beside it. That matters here more than upstream: this pane deliberately starts with both
  lists empty (see the header), so an empty select was the FIRST thing a member saw every time they
  opened it, with a dropdown that opens onto nothing and no statement of why.

  The three-way gate is the reference's own and each arm is a different sentence: devices, or the
  loading/error block above has already said something, or connect one.
-->
<div class="mt-2">
  {#if audioDevices.length > 0}
    <div class="form-group">
      <label for="audio-deviceList">Audio device (input):</label>
      <select
        id="audio-deviceList"
        aria-label="Audio device (input)"
        class="form-select"
        bind:value={currentAudioDevice}
        onchange={() => onPreferenceChange('audioDeviceID', currentAudioDevice)}
      >
        {#each audioDevices as device (device.deviceId)}
          <option value={device.deviceId}>{device.label}</option>
        {/each}
      </select>
      <small class="text-white mt-1 d-block">
        <i class="fas fa-check-circle text-success"></i>
        Selected: {selectedLabel(audioDevices, currentAudioDevice)}
      </small>
    </div>
  {:else if !devicesLoading && !devicesLoadError}
    <div class="form-group text-white">
      <i class="fas fa-microphone-slash"></i>{' Please connect audio devices. '}
    </div>
  {/if}
  {#if videoDevices.length > 0}
    <div class="form-group">
      <label for="video-deviceList">Video device (input):</label>
      <select
        id="video-deviceList"
        aria-label="Video device (input)"
        class="form-select"
        bind:value={currentVideoDevice}
        onchange={() => onPreferenceChange('videoDeviceID', currentVideoDevice)}
      >
        {#each videoDevices as device (device.deviceId)}
          <option value={device.deviceId}>{device.label}</option>
        {/each}
      </select>
      <small class="text-white mt-1 d-block">
        <i class="fas fa-check-circle text-success"></i>
        Selected: {selectedLabel(videoDevices, currentVideoDevice)}
      </small>
    </div>
  {:else if !devicesLoading && !devicesLoadError}
    <div class="form-group text-white">
      <i class="fas fa-video-slash"></i>{' Please connect video devices. '}
    </div>
  {/if}
</div>
<div class="mt-4">
  <div class="ml-4">
    <input
      type="checkbox"
      name="echo-cancellation"
      value="Echo Cancellation"
      id="echo-cancellation"
      class="form-check-input"
      bind:checked={echoCancellation}
      onchange={() => onPreferenceChange('echoCancellation', echoCancellation)}
    />
    <label for="echo-cancellation" class="form-check-label"> Echo Cancellation </label>
  </div>
  <div class="ml-4">
    <input
      type="checkbox"
      name="noise-suppression"
      value="Noise Suppression"
      id="noise-suppression"
      class="form-check-input"
      bind:checked={noiseSuppression}
      onchange={() => onPreferenceChange('noiseSuppression', noiseSuppression)}
    />
    <label for="noise-suppression" class="form-check-label"> Noise Suppression </label>
  </div>
  <div class="ml-4">
    <input
      type="checkbox"
      name="auto-gain-control"
      value="Auto Gain Control"
      id="auto-gain-control"
      class="form-check-input"
      bind:checked={autoGainControl}
      onchange={() => onPreferenceChange('autoGainControl', autoGainControl)}
    />
    <label for="auto-gain-control" class="form-check-label"> Auto Gain </label>
  </div>
</div>
