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

      Broadcast controls - recording, SoundCloud, microphone, screen sharing, webcam and
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
/**
 * The media facade, hoisted out of `props()` so a test can vary ONE member of it.
 *
 * Spreading it — `{ ...MEDIA, roomRecording: true }` — is what lets the two room-setting cases below
 * change recording state without restating twenty fields, and restating them is how a stub drifts
 * from the component it stands in for.
 */
const MEDIA: Stub = {
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

function props(overrides: Stub = {}): Stub {
  const noop = () => {};
  const media: Stub = { ...MEDIA };
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
    /* The three Benzinga settings travel as one value — see `gates.benzinga`. */
    benzinga: { visible: false, url: null, logoUrl: null },
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
    hideWebcamForRoom: false,
    blinkingRec: false,
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
    /*
      The eight that arrived with the 2026-08-30 navbar rows. Defaults chosen so the BASE render is
      the plainest room there is: no tip, no MediaMTX tab, no local screens, the count visible, the
      sidebar setting off. Every test that wants one says so in its own override.
    */
    tip: { visible: false, label: '', url: '' },
    alwaysShowRoster: false,
    rosterCountVisible: true,
    streamingTabAvailable: false,
    localScreens: [],
    onmutetalkinguser: noop,
    onopenstreamingtab: noop,
    onreopenpreview: noop,
    onstoplocalscreen: noop,
    ...overrides
  };
}

const html = (overrides: Stub = {}) =>
  render(RoomNavbar as never, { props: props(overrides) as never }).body;

/**
 * TWO ROOM SETTINGS THE NAVBAR DRAWS, and each is one term of a gate it already had.
 *
 * `hideWebcamForRoom` is the fifth term of the webcam control's condition (byte 2,489,228) and the
 * only one this room could not evaluate for itself — the other four are facts it already holds about
 * the viewer and their devices. `blinkingRec` gates `breathing-rec` (byte 2,477,678), a class with a
 * real `50% { opacity: 0 }` keyframe in `captured-runtime-components.css`, unlike
 * `smallImagePreview`'s class which styles nothing anywhere and is answered as NOT A GAP.
 *
 * BOTH DIRECTIONS on each, because a gate that refuses everybody is as wrong as one that refuses
 * nobody — and for a room-wide OFF switch the first is the likelier mistake.
 */
describe('the two room settings the navbar reads', () => {
  it('draws the webcam control when the room has not hidden it', () => {
    expect(html({ isPresenter: true })).toContain('startStopWebCam');
  });

  it('removes it for the whole room when the owner says to', () => {
    expect(html({ isPresenter: true, hideWebcamForRoom: true })).not.toContain('startStopWebCam');
  });

  /*
    DIVERGENCE, and this is the test that records it.

    The reference's condition is `hideWebcamForRoom || !(isPresenter || user.hasCam ||
    isLimitedPresenter) || isNonPresenterAdmin || camLaunching`, so upstream a MEMBER WITH A CAMERA
    sees the control. This navbar puts the whole broadcast block behind `{#if isPresenter}` — the
    rule its own header states and the rest of this file asserts — so a member never sees it here,
    camera or not.

    That divergence predates this setting and is not changed by it. What is asserted is that the two
    gates are INDEPENDENT: the room setting removes the control from a presenter, who is the only
    viewer this room ever showed it to. Asserting the member case as the reference has it would be
    asserting a room this repository does not build.
  */
  it('is a separate gate from the presenter block, which is this room’s own rule', () => {
    expect(html({ isPresenter: false })).not.toContain('startStopWebCam');
    expect(html({ isPresenter: true })).toContain('startStopWebCam');
  });

  it('NAV-08 — breathes the PRESENTER s recording icon, and never the room-wide badge', () => {
    /*
      RE-POINTED 2026-08-31. These three lines pinned `breathing-rec` to the `[ REC ]` badge, which
      is where this room had put it and where the reference does not.

      `UPe` (byte 2,474,097) renders that badge's `li` from const 93
      `[1,"nav-item","recIndicator","animated","fadeIn"]` and binds exactly ONE thing on it,
      `ngbTooltip` — no class map. `iPe = (t, n) => ({ 'breathing-rec': t, recIndicatorStart: n })`
      (byte 2,465,900) is bound once in the whole bundle, at byte 2,477,678, onto the
      `<i class="far fa-2x fa-dot-circle">` inside the PRESENTER's Start/Stop Recording dropdown.

      So the pulse is a presenter's cue on their own button, and this bar was showing it to every
      member. `.breathing-rec` is a 5s scale pulse plus `color: red !important`, so it was visible
      on every screen rather than theoretical.

      The assertion is now the FULL rule, both terms and both audiences, because a test that only
      checked the presenter's icon would go green again if the badge's copy came back.
    */
    const recording = { ...MEDIA, roomRecording: true, roomRecordingPaused: false };

    /* The presenter, with the switch on: the icon breathes. */
    expect(html({ media: recording, isPresenter: true, blinkingRec: true })).toContain(
      'breathing-rec'
    );
    /* The presenter, with the switch off: it does not. */
    expect(html({ media: recording, isPresenter: true, blinkingRec: false })).not.toContain(
      'breathing-rec'
    );
    /* A MEMBER never sees it, switch or no switch — which is the divergence this row removed. */
    expect(html({ media: recording, isPresenter: false, blinkingRec: true })).not.toContain(
      'breathing-rec'
    );

    /* And the badge itself renders for everyone either way, so none of the above is "nothing". */
    expect(html({ media: recording, isPresenter: false, blinkingRec: true })).toContain('[ REC ]');
    expect(html({ media: recording, isPresenter: true, blinkingRec: false })).toContain('[ REC ]');
  });
});

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
