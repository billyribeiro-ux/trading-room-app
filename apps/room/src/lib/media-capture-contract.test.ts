import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const modalHostSource = readFileSync(
  new URL('./components/ModalHost.svelte', import.meta.url),
  'utf8'
);
const roomSource = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

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
    expect(roomSource).toContain('onclick={toggleMicrophone}');
    expect(roomSource).toContain('onclick={toggleWebcam}');
    expect(roomSource).toMatch(
      /async function toggleMicrophone\(\)[\s\S]*?await enableMicrophone\(\)/
    );
    // The point of this assertion is WHERE the capture happens - inside the click handler - not
    // which constraints it carries. It used to pin the literal `{ video: true }`, which turned a
    // deliberate fix into a red test: both camera paths now pass
    // `deviceId: {ideal: selectedVideoDeviceId}`, because the AV settings modal was saving
    // `videoDeviceID` and nothing ever read it back.
    expect(roomSource).toMatch(
      /async function toggleWebcam\(\)[\s\S]*?navigator\.mediaDevices\.getUserMedia\(/
    );
    expect(roomSource).toMatch(
      /async function toggleWebcam\(\)[\s\S]*?deviceId: \{ ideal: selectedVideoDeviceId \}/
    );
  });
});
