import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  Two controls act on the camera, and they are NOT the same control.

    the card's X  -> `closeMe()`   -> drops the PREVIEW. The camera keeps running.
    the toolbar   -> `toggleCam()` -> `stopCam()`, which STOPS every track and releases the device.

  Confusing them is the defect this pins. This room previously flipped `track.enabled` in both
  places and cached the stream with `webcamStream ??= …`, so the track stayed `readyState: "live"`
  forever and NOTHING in the UI ever released the camera - `stopStream` was wired only into page
  teardown. Measured at the time: after pressing the toolbar control the track was still live and
  the browser still reported the camera in use.

  Asserted against the shipped bundle, which is served whole to every visitor regardless of role.
*/

const bundle = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);
const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
/*
  The presentation area moved to `PresentationArea.svelte` on 2026-08-15. The assertions below
  point at whichever file owns each subject: markup here, the handlers and gates behind it on the
  page.
*/
const paneCode = stripComments(
  readFileSync(new URL('./components/PresentationArea.svelte', import.meta.url), 'utf8')
);
const code = stripComments(page);

/** The body of a top-level `function name(` … `\n  }` in the page's script. */
function bodyOf(name: string) {
  const at = code.indexOf(`function ${name}(`);
  expect(at, `${name} should exist`).toBeGreaterThan(-1);
  const end = code.indexOf('\n  }', at);
  return code.slice(at, end);
}

describe('webcam: the capture separates preview from device', () => {
  it('proves stopCam is what releases the camera', () => {
    // `stopCam(){ … this.localWebcamStream.getTracks().forEach(e=>{ … e.stop() }) … }`
    expect(bundle).toContain('stopCam()');
    expect(bundle).toContain('this.localWebcamStream.getTracks().forEach');
  });

  it('proves closeMe does NOT release the camera', () => {
    const closeMe = bundle.slice(bundle.indexOf('closeMe(){'));
    const body = closeMe.slice(0, closeMe.indexOf('}') + 1);
    expect(body).toContain('removeWebcamPresenter');
    // The whole point: no stopCam, no track.stop() anywhere in closeMe.
    expect(body).not.toContain('stopCam');
    expect(body).not.toContain('.stop()');
  });

  it('proves the toolbar re-acquires rather than re-enabling', () => {
    // `enableCam` -> "enableWebcam() | calling getUserMedia()"
    expect(bundle).toContain('calling getUserMedia()');
    // and toggleCam picks between the two.
    expect(bundle).toContain('this.camProducer?this.stopCam():this.enableCam(!1)');
  });
});

describe('webcam: this room reproduces that split', () => {
  it('the toolbar stops the tracks and drops the stream', () => {
    const toggle = bodyOf('toggleWebcam');
    expect(toggle).toContain('stopStream(webcamStream)');
    expect(toggle).toContain('webcamStream = null');
    // A fresh acquire on the way back in - a stopped track cannot be revived, so the old
    // `webcamStream ??= …` cache would have handed back a dead stream.
    expect(toggle).toContain('await navigator.mediaDevices.getUserMedia');
    expect(toggle, 'the cached-stream bug must not come back').not.toContain('webcamStream ??=');
    // `track.enabled` is not how the capture ends a camera.
    expect(toggle, 'enabled-toggling never releases the device').not.toContain(
      'setStreamEnabled(webcamStream'
    );
  });

  it('the X removes the card and leaves the camera alone', () => {
    const close = bodyOf('closeWebcamPreview');
    expect(close).toContain('removeWebcamPresenter');
    expect(close, 'the X must not stop the device').not.toContain('stopStream');
    expect(close, 'the X must not disable the track').not.toContain('setStreamEnabled');
  });

  it('keeps the capture NOP guard when a presenter is already listed', () => {
    // `if (this.webcamsIdxs.includes(e._id)) return void P("...already have entry...NOP")`
    const add = bodyOf('addWebcamPresenter');
    expect(add).toMatch(/some\(.*=>.*\.id === presenter\.id\)/);
    expect(add).toContain('return');
  });

  it('destroys the card rather than blanking it', () => {
    // `removePresenterWebcam` calls `container.remove(idx)`; here the {#each} drops the node.
    const remove = bodyOf('removeWebcamPresenter');
    expect(remove).toContain('splice');
    expect(paneCode).toContain('{#each webcamPresenters as presenter, index (presenter.id)}');
  });
});

/*
  The card header is the capture's own design, and this room had been suppressing it.

  `app-presenter-cams`' stylesheet gives the name a translucent black band across the top of the
  card, and pins the close icon 5px from the right. Three rules in `src/app.css` were cancelling
  that - `height: 0` on both `.overlay` and `.pNameLabel`, and `float: right` on `.closeIcon`,
  none of which is captured. Measured with them in place, the h5 computed 318x0 while carrying
  "Billy Ribeiro" at font-size 20px / line-height 24px, so the name floated over the video with
  nothing behind it.
*/
const appCssRaw = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
const appCss = appCssRaw.replace(/\/\*[\s\S]*?\*\//g, '');
const capturedComponents = readFileSync(
  new URL('../lib/styles/captured-runtime-components.css', import.meta.url),
  'utf8'
);

describe('webcam: the captured card header', () => {
  it('keeps the captured band, and nothing zeroes it', () => {
    expect(capturedComponents).toContain('app-presenter-cams .pNameLabel:not(:root)');
    expect(capturedComponents).toContain('background-color: rgba(0, 0, 0, 0.5)');

    // The suppressions that hid it must not come back.
    expect(appCss, '.pNameLabel must not be height-zeroed').not.toMatch(
      /\.webcamsHolder \.pNameLabel\s*\{[^}]*height:\s*0/
    );
    expect(appCss, '.overlay must not be height-zeroed').not.toMatch(
      /\.webcamsHolder > \.overlay\s*\{[^}]*height:\s*0/
    );
    expect(appCss, 'the close icon is positioned, not floated').not.toMatch(
      /\.webcamsHolder \.closeIcon\s*\{[^}]*float/
    );
  });

  it('records the green border as an owner override, not a transcription', () => {
    // The capture really does carry `border: 1px solid yellowgreen`; the owner asked for it gone.
    expect(capturedComponents).toContain('border: 1px solid yellowgreen');
    expect(appCss).toMatch(/app-presenter-cams \.card\.webcamsHolder\s*\{[^}]*border:\s*0/);
  });
});
