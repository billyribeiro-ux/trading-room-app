import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const modalHostSource = readFileSync(
  new URL('./components/ModalHost.svelte', import.meta.url),
  'utf8'
);
const roomSource = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

/*
  `.mainAppNav` became `RoomNavbar.svelte` on 2026-08-15 — the third of the five template regions.
  Reference-bundle assertions are untouched; ours follow the markup into the component.
*/
const NAVBAR = readFileSync(new URL('./components/RoomNavbar.svelte', import.meta.url), 'utf8');
/*
  The microphone and camera paths moved to `RoomLocalCapture` on 2026-08-26 — see that module's
  header for the seam. This constant follows the SUBJECT rather than the old filename: pointed at
  the transport it would still read a real file, find neither `toggleMicrophone` nor `toggleWebcam`,
  and the `not.toContain` assertions below would all pass against a file that no longer decides
  anything. That is the vacuity failure `source-size-contract` polices, arriving through a rename.
*/
const TRANSPORT = readFileSync(new URL('./room/local-capture.svelte.ts', import.meta.url), 'utf8');

function sourceBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe('media capture activation contract', () => {
  it('does not request microphone or camera capture while the room and modal host mount', () => {
    const modalMount = sourceBetween(modalHostSource, 'onMount(() => {', '\n\n  $effect(');
    const roomMount = sourceBetween(
      roomSource,
      'onMount(() => {',
      '\n\n  function captureMainElement'
    );

    expect(modalMount).not.toContain('getUserMedia');
    expect(modalMount).not.toContain('loadDevices()');
    expect(modalMount).not.toContain('loadMicDevices()');
    expect(roomMount).not.toContain('getUserMedia');
  });

  it('keeps microphone and webcam capture behind their explicit navbar click handlers', () => {
    /*
      THREE files now, and the chain between them is what this test is about.

      The BUTTONS moved to `RoomNavbar.svelte` on 2026-08-15. The capture itself moved to
      `RoomMediaTransport` in Phase 5 slice 4 — acquiring a track and producing it into the SFU is
      one act, so `getUserMedia` went where the session is. The page keeps the wiring in the middle.

      A click handler is not an activation, which is the split this whole file exists to hold, and
      it now has to hold across two boundaries instead of one: the navbar names a prop, the page
      binds that prop to a transport method, and the transport is the only place `getUserMedia`
      appears. Asserting each link separately is what stops a broken chain passing — a page binding
      a method the class does not define would satisfy any one of these on its own.
    */
    expect(NAVBAR).toContain('onclick={ontogglemicrophone}');
    expect(NAVBAR).toContain('onclick={ontogglewebcam}');
    expect(roomSource).toContain(
      'ontogglemicrophone={() => void mediaTransport.toggleMicrophone()}'
    );
    expect(roomSource).toContain('ontogglewebcam={() => void mediaTransport.toggleWebcam()}');
    expect(TRANSPORT).toMatch(
      /async toggleMicrophone\(\)[\s\S]*?await this\.#enableMicrophone\(\)/
    );
    // The point of this assertion is WHERE the capture happens - behind the click handler, never on
    // mount - not which constraints it carries. It used to pin the literal `{ video: true }`, which
    // turned a deliberate fix into a red test: both camera paths now pass
    // `deviceId: {ideal: selectedVideoDeviceId}`, because the AV settings modal was saving
    // `videoDeviceID` and nothing ever read it back.
    expect(TRANSPORT).toMatch(
      /async toggleWebcam\(\)[\s\S]*?navigator\.mediaDevices\.getUserMedia\(/
    );
    expect(TRANSPORT).toMatch(
      // `selectedVideoDeviceId` was the injected `#videoDeviceId()` thunk from the 2026-08-26 split
      // until 2026-08-30, when the four AUDIO settings needed the same journey and one
      // `CaptureSettings` replaced two parallel channels. The CONSTRAINT it feeds is what this
      // asserts and that is unchanged — `ideal` for the camera, and `#lib/capture-settings.ts`
      // records why the microphone beside it uses `exact`.
      /async toggleWebcam\(\)[\s\S]*?deviceId: \{ ideal: this\.#capture\(\)\.videoDeviceId \|\| undefined \}/
    );
  });
});
