import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import RoomNavbar from './components/RoomNavbar.svelte';

/*
  THE NAVBAR'S PRESENTER GATE — the one component in this repository with no render cover at all.

  ## Why it was the last one

  `TODO.md` row AE tracked component-render coverage and, after three corrections, ended at a single
  outstanding name: *"`RoomNavbar` ALONE has neither form."* Nineteen test files render a component;
  none rendered this one. A scan by FILENAME misses that three of its neighbours are covered inside
  contract tests named after the behaviour rather than the component, which is why the count moved
  twice before it settled.

  ## What is asserted, and why THIS invariant

  The navbar's own comment states the rule it implements:

      Broadcast controls - media.recording, SoundCloud, microphone, screen sharing, webcam and
      session control - drive what the room sends to everyone, so they are presenter-only.
      A reader keeps the Volume dropdown and Reload below, plus the talking and REC indicators
      above, which report state rather than change it.

  That is a single `{#if isPresenter}` around six controls. Deleting it, or widening it to a
  truthiness test on something a member also has, puts a recording button and a "Session Control"
  entry in every member's navbar. The server refuses each of those commands — `presenterRoom()` is
  the gate that matters — so this is not the last line of defence, and it is not being asserted as
  one. **It is the standard this repository sets above the refusal:** a control whose only outcome is
  a 403 is a control that lied about what the member may do.

  Nothing in the suite said anything about it. `grep` for `dropdownRecording` or
  `onopensessioncontrol` across every test file returned the component itself and nothing else.

  ## SSR, not a mount

  The question is pure markup — is this element in the document — and `{@attach}` never runs during
  SSR, which is what makes it affordable: no jsdom, no ResizeObserver, no media attachment. Same
  instrument and same reasoning as `main-tab-strip-contract.test.ts`, whose docblock explains why an
  ABSENT element and a HIDDEN one are different facts and only a render can tell them apart.
*/

type Stub = Record<string, unknown>;

/**
 * The navbar's props, stubbed down to what it actually reads.
 *
 * Every facade member below was found by reading the component rather than by guessing: `media.*`,
 * `menus.*` and `roster.*` are enumerated from its own markup. A stub that is missing one throws
 * during render rather than passing quietly, which is what makes this list self-checking.
 */
function props(overrides: Stub = {}): Stub {
  const noop = () => {};
  const media: Stub = {
    anyoneTalking: false,
    camLaunching: false,
    camMuted: true,
    micLaunching: false,
    micMuted: true,
    recPreviewOpen: false,
    recordedHasAudio: false,
    recordedUrl: null,
    recording: false,
    recordingPaused: false,
    recordingReminder: false,
    roomRecording: false,
    roomRecordingPaused: false,
    roomRecordingStarting: false,
    screenSharing: false,
    soundCloudPlaying: false,
    talking: []
  };
  const menus: Stub = {
    recording: false,
    screen: false,
    soundcloud: false,
    volume: false,
    set: noop,
    toggle: noop
  };

  return {
    isPresenter: false,
    sidebarOpen: false,
    mobileNavOpen: false,
    media,
    menus,
    roster: { connectedCount: 1 },
    volume: 100,
    presenterAudio: {},
    individualVolumeControls: false,
    recordingReminderAllowed: false,
    recordingTooltip: '',
    mobileAppAvailable: false,
    tawkAvailable: false,
    doNotDisturbOn: false,
    mp3Playing: false,
    youtubeForAllUrl: '',
    backgroundVolume: 100,
    soundChecks: {},
    noSpeakerText: '',
    shareScreenText: 'Share Screen',
    virtualCamText: 'Virtual Camera',
    stopSharingAllText: 'Stop Sharing All',
    setInputChecked: () => noop,
    setRangeValue: () => noop,
    ontoggletopmenu: noop,
    onstartrecording: noop,
    onstoprecording: noop,
    onpauserecording: noop,
    onresumerecording: noop,
    ondownloadrecording: noop,
    onpromptforsoundcloud: noop,
    onstopsoundcloud: noop,
    onstopsoundcloudforme: noop,
    ontogglemicrophone: noop,
    ontogglewebcam: noop,
    onpromptforscreenname: noop,
    onstopscreensharing: noop,
    onopensessioncontrol: noop,
    onsetmastervolume: noop,
    onsetbackgroundvolume: noop,
    ontogglemute: noop,
    onadjustpresentervolume: noop,
    ontoggletalkingpresenteraudio: noop,
    onupdatesoundcheck: noop,
    ontoggletawksupport: noop,
    ongetmypinanddoinfo: noop,
    onrequestreload: noop,
    onshowrecpreview: noop,
    onhiderecpreview: noop,
    ...overrides
  };
}

const html = (overrides: Stub = {}) =>
  render(RoomNavbar as never, { props: props(overrides) as never }).body;

describe("the navbar's broadcast controls are presenter-only", () => {
  it('renders at all for a member — the positive control', () => {
    /*
      First, because every "is absent" assertion below passes just as happily against a render that
      threw, produced nothing, or was handed a broken stub. If the navbar is not on screen, none of
      the others means anything.
    */
    const body = html();
    expect(body.length).toBeGreaterThan(500);
    expect(body, 'the reader keeps the volume dropdown').toContain('dropdownVolume');
  });

  it.each([
    ['dropdownRecording', 'the recording menu'],
    ['dropdownScreenSharing', 'the screen-sharing menu']
  ])('%s is ABSENT for a member (%s)', (marker) => {
    expect(html()).not.toContain(marker);
  });

  it.each([
    ['dropdownRecording', 'the recording menu'],
    ['dropdownScreenSharing', 'the screen-sharing menu']
  ])('%s is PRESENT for a presenter (%s)', (marker) => {
    /*
      The other half, and it is what stops the assertions above passing for the wrong reason. A
      marker that never renders for anybody — renamed, deleted, moved behind a second gate — would
      satisfy every `not.toContain` in this file while the control was simply gone.
    */
    expect(html({ isPresenter: true })).toContain(marker);
  });

  it('the whole presenter block is one gate, so a member gains none of it', () => {
    /*
      Asserted as a DIFFERENCE rather than as a list of markers, because the block holds six controls
      and naming each would go stale the moment a seventh is added. What must never change is that a
      member's navbar is strictly smaller than a presenter's by exactly that block.
    */
    expect(html({ isPresenter: true }).length).toBeGreaterThan(html().length);
  });

  it('Tawk support is gated separately, and a member does not get it either', () => {
    /*
      A THIRD term this room adds and the reference does not: upstream gates on
      `isPresenter && sessData.tawkPresenterSupport`, ours also requires a configured property id, so
      a room with none shows no control rather than one that opens somebody else's support inbox.
      Asserted here because `tawkAvailable` arriving true must not be enough on its own.
    */
    expect(html({ tawkAvailable: false })).not.toContain('TAWK Support');
    expect(html({ tawkAvailable: true })).toContain('TAWK Support');
  });
});
