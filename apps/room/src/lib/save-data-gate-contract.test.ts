import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  `mediaService.saveData` — the AV settings modal's "Disable Video (saves bandwidth)" switch.

  WHAT IT ACTUALLY DOES, which is the whole reason this needed a test rather than a class binding.

  It is not a visibility toggle. Upstream, `callScreenOfUserWEBRTC` opens with

      e && null != e ? this.saveData ? P("callScreenOfUserWEBRTC saveData on.. nop...") : (…)

  so while it is set the consumer is never created and **no screen stream is requested at all**.
  The `Video Disabled` h3 and the hidden `<video>` are what the viewer sees; the saving is that
  nothing is fetched. A port that only hid the video would look identical on screen and save no
  bandwidth whatsoever — which is exactly the failure this file exists to prevent.

  WHY IT WAS BLOCKED FOR A DAY, AND WHY THAT WAS WRONG.

  `TODO.md` row W said the writer was "uncaptured". That was true of the decoded COMPONENTS and
  false as stated, for a structural reason worth keeping: a service is not a component, and
  `extract-component-source.mjs` takes an Angular selector. No amount of component decoding could
  ever have contained it. The bundle was in this repository the whole time.

  DISTINCT FROM `preferences.disableVideo`, which the same day's work also built. That one is the
  USER settings modal's per-viewer PANE preference and swaps the screens and streams panes for a
  message; this one is the media-layer switch on the AV SETTINGS modal. Both exist upstream, each
  with its own control. The original row conflated them, and `disable-video-gate-contract.test.ts`
  guards the other one.

  Source-level, for the reason `badge-row-reveal.test.ts` gives: every assertion here is about
  client state that SSR renders in one fixed position, so a rendered check would pass whether the
  wire exists or has been cut.
*/

const BUNDLE = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);
const AV_MODAL = readFileSync(
  new URL('../../docs/source/components/app-av-settings-modal.full.js', import.meta.url),
  'utf8'
);
const SHARE = readFileSync(
  new URL('../../docs/source/components/app-screenshare-view.render-helpers.js', import.meta.url),
  'utf8'
);
const MODAL = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
const PANE = readFileSync(new URL('./components/ScreenPane.svelte', import.meta.url), 'utf8');
const STATUS = readFileSync(
  new URL('./components/ScreenPaneStatus.svelte', import.meta.url),
  'utf8'
);

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const transportCode = stripComments(
  readFileSync(new URL('./room/media-transport.svelte.ts', import.meta.url), 'utf8')
);
const overlaysCode = stripComments(
  readFileSync(new URL('./components/RoomOverlays.svelte', import.meta.url), 'utf8')
);
const modalCode = stripComments(MODAL);
const paneCode = stripComments(PANE);

describe('the reference: what saveData is and does', () => {
  it('the writer exists, on the media service, and is not a preference', () => {
    /*
      The claim row W got wrong. Asserted from the bundle so that "uncaptured" can never be written
      about this symbol again without a test going red.
    */
    expect(BUNDLE).toContain('toggleDisableVideo(){this.saveData=!this.saveData}');
    // A media-service field, declared beside its siblings rather than in `preferences`.
    expect(BUNDLE).toContain(
      'this.isScreenSharing=!1,this.iscreenshareLaunching=!1,this.saveData=!1'
    );
  });

  it('it refuses the consumer outright — the bandwidth saving, not a class', () => {
    expect(BUNDLE).toContain('callScreenOfUserWEBRTC saveData on.. nop...');
  });

  it('its only control is the AV settings modal nav link', () => {
    expect(AV_MODAL).toContain('return o.mediaService.toggleDisableVideo();');
    // `O(20, saveData ? 21 : 20)` — slot 21 when set, so the label offers to turn video back ON.
    expect(AV_MODAL.replace(/\s+/g, '')).toContain('O(20,o.mediaService.saveData?21:20)');
  });

  it('the message is "Video Disabled", with the class order that component uses', () => {
    /*
      `G0e` renders `h3` with const 1 of `app-screenshare-view`, which is `[1,"mt-4","text-center"]`
      — the OPPOSITE order to the presentation area's const 23 (`text-center mt-4`). Two h3s, two
      orders, and reproducing the wrong one would be a silent mismatch.
    */
    expect(SHARE.replace(/\s+/g, '')).toContain("d(0,'h3',1),v(1,'VideoDisabled')");
  });
});

describe('ours: the switch reaches the media layer', () => {
  it('the modal no longer owns the flag', () => {
    // It was `let avVideoDisabled = $state(false)` read only by its own label — a dead control.
    expect(modalCode).not.toContain('avVideoDisabled');
    expect(modalCode).toContain('onclick={() => onSaveDataChange(!saveData)}');
  });

  it('the page owns it, unpersisted, matching a writer that calls no setPreference', () => {
    expect(transportCode).toContain('this.#saveData = $state(false);');
    expect(transportCode).not.toMatch(/saveData\s*=\s*\$state\([^)]*loadedSettings/);
    // The modal host moved into `RoomOverlays.svelte` in Phase 5 slice 17; the room state it renders
    // from is handed to that component whole, so the prop is assembled there now.
    expect(overlaysCode).toContain(
      'onSaveDataChange={(enabled) => mediaTransport.setSaveData(enabled)}'
    );
  });

  it('THE POINT: the producer is not consumed while it is on', () => {
    /*
      If this line goes, every other assertion in this file still passes and the feature silently
      becomes a class toggle that saves nothing. It is the one that matters.
    */
    expect(transportCode).toContain('if (this.#saveData) {');
    expect(transportCode).toContain('this.#deferredScreens.set(info.producerId, info);');
  });

  it('the gate sits AFTER the tab is added, so the pane still exists to show the message', () => {
    /*
      Scoped to `addRemoteScreen`'s body before measuring, and that is the point of the test rather
      than a detail of it. The first version searched the whole file and failed, because
      `session.consume(info)` also appears in `setSaveData` — which is defined ABOVE
      `addRemoteScreen`, so `indexOf` found the re-consume loop instead of the arrival path. The
      check was wrong, not the code. A positional assertion has to own its region.
    */
    const from = transportCode.indexOf('async addRemoteScreen(');
    expect(from, 'addRemoteScreen must exist').toBeGreaterThan(-1);
    const body = transportCode.slice(from, transportCode.indexOf('\n  }', from));

    const tab = body.indexOf('this.selectScreenTabOfId(info.producerId);');
    const gate = body.indexOf('if (this.#saveData) {');
    const consume = body.indexOf('const remote = await session.consume(info);');

    expect(tab, 'the tab is added inside addRemoteScreen').toBeGreaterThan(-1);
    expect(gate, 'the gate is inside addRemoteScreen').toBeGreaterThan(tab);
    expect(consume, 'the consume is after the gate, so it is skippable').toBeGreaterThan(gate);
  });

  it('re-enabling fetches what was skipped', () => {
    /*
      The reference re-consumes by another route — selecting a tab calls `startWatchingScreenOf` —
      which this room does not have, because it consumes on producer arrival. Without retaining the
      `ProducerInfo`, turning video back on would show nothing until the presenter restarted their
      share. Item V in `TODO.md` records the same retention problem for per-presenter mute.
    */
    expect(transportCode).toContain('async setSaveData(enabled: boolean)');
    expect(transportCode).toContain('this.#deferredScreens.delete(producerId);');
    expect(transportCode).toContain('this.#screenStreams.set(producerId, remote.stream);');
  });

  it('the pane hides the video and shows the reference message', () => {
    expect(paneCode).toContain('const pictureHidden = $derived(!connected || saveData);');
    expect(paneCode).toContain('{ hidden: pictureHidden,');
    expect(paneCode).toContain('<ScreenPaneStatus');
    expect(stripComments(STATUS)).toContain('<h3 class="mt-4 text-center">Video Disabled</h3>');
  });
});
