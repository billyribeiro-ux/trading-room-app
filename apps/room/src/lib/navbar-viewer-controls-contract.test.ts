import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import RoomNavbar from './components/RoomNavbar.svelte';

/**
 * TWO NAVBAR ITEMS THAT DEPEND ON *NOT* BEING A PRESENTER, and one that depends on a room setting.
 *
 * `room-navbar-contract.test.ts` and `room-navbar-render.test.ts` both assert the presenter block —
 * what a member is refused. This file asserts the other direction, which nothing did: what a member
 * is OWED, and what a room's own configuration removes from everybody.
 *
 * ## NAV-01 — a room that always shows the roster has no hamburger
 *
 * ```js
 * O(1, e.showSidebar && !e.alwaysShowRoster ? 1 : -1)   // DPe, "Close Sidebar", const 133
 * O(2, e.showSidebar || e.alwaysShowRoster ? -1 : 2)    // EPe, "Open Sidebar",  const 135
 * ```
 *
 * Byte 2,487,413. Read the two gates together and `alwaysShowRoster` removes BOTH, at any value of
 * `showSidebar` — there is no third template, so in such a room upstream draws no toggle at all.
 *
 * It is an interlock rather than a tidy-up. G12 already built the reference's
 * `toggleSideBarUsersCount` onto the connected-count beside it, and that method is
 * `alwaysShowRoster && (showSidebar = !showSidebar, …)` — gated on the same setting from the other
 * side. Upstream hands the toggle to exactly one element: the counter owns it when the roster is
 * pinned open, the hamburger owns it when it is not. This room had both live, so an owner who
 * configured the roster to be permanently visible shipped a button whose only effect is to hide it.
 *
 * ## NAV-02 — a member could not turn the presenter's music off
 *
 * ```js
 * O(22, isPresenter || isNonPresenterAdmin ? 22 : -1)                   // i4e, the dropdown
 * O(23, isPresenter || isNonPresenterAdmin || !e.scPlaying ? -1 : 23)   // o4e, byte 2,488,684
 * ```
 *
 * Slot 23's gate is slot 22's negated with `scPlaying` on top: the one SoundCloud control upstream
 * renders for a viewer. Its handler, `doSoundCloudUserStop`, is the same one the presenter's "Stop
 * Playing For Me" entry calls — and that entry lives inside a dropdown this room puts behind
 * `{#if isPresenter}`, so the only control that stops room-wide music for a single listener was one
 * a listener never saw. Their alternative was the master volume slider, which also silences the
 * presenter.
 *
 * ## SSR, not a mount
 *
 * Every question here is "is this element in the document", which is what `render` from
 * `svelte/server` answers, and `{@attach}` never runs during SSR — so no jsdom, no ResizeObserver,
 * no media attachment. Same instrument and same reasoning as `room-navbar-contract.test.ts`, whose
 * docblock explains why an ABSENT element and a HIDDEN one are different facts.
 */

type Stub = Record<string, unknown>;

/**
 * The media facade, hoisted so a case can vary one member of it.
 *
 * Deliberately a plain object rather than a `RoomMedia`: this file asks only what markup a set of
 * booleans produces, and a real instance would tie these cases to that class's own transitions.
 * `room-navbar-render.test.ts` is the file that feeds it the real classes.
 */
const MEDIA: Stub = {
  anyoneTalking: false,
  camLaunching: false,
  camMuted: true,
  limitedPresenter: false,
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
  return {
    isPresenter: false,
    hasMic: false,
    sidebarOpen: false,
    mobileNavOpen: false,
    media: { ...MEDIA },
    menus: {
      recording: false,
      screen: false,
      soundcloud: false,
      volume: false,
      set: noop,
      toggle: noop
    },
    roster: { connectedCount: 1 },
    volume: 100,
    presenterAudio: {},
    individualVolumeControls: false,
    recordingReminderAllowed: false,
    recordingTooltip: '',
    mobileAppAvailable: false,
    tawkAvailable: false,
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

/** The hamburger and its close twin are one span with two ternaries; both titles are named. */
const SIDEBAR_TOGGLE = /title="(Open|Close) Sidebar"/;

describe('NAV-01 — the sidebar toggle is a room setting, not a constant', () => {
  it('renders it in an ordinary room, in both of its states', () => {
    /*
      The positive control comes first and it is two-sided on `sidebarOpen`, because this room draws
      ONE span with two ternaries where upstream has two templates. A gate applied to the wrong
      branch would remove only half the control, and a one-sided assertion would not see it.
    */
    expect(html({ sidebarOpen: false })).toContain('title="Open Sidebar"');
    expect(html({ sidebarOpen: true })).toContain('title="Close Sidebar"');
  });

  it('removes it entirely when the room always shows the roster', () => {
    expect(html({ alwaysShowRoster: true, sidebarOpen: false })).not.toMatch(SIDEBAR_TOGGLE);
    expect(html({ alwaysShowRoster: true, sidebarOpen: true })).not.toMatch(SIDEBAR_TOGGLE);
  });

  it('and the rest of the bar is still served — the refusal is one control, not the component', () => {
    /*
      Without this, a render that threw or produced nothing would satisfy the assertion above. The
      counter is the right needle because it is the element that TAKES OVER the toggle in this room.
    */
    const body = html({ alwaysShowRoster: true });
    expect(body).toContain('title="Users Connected"');
    expect(body, 'the Reload control is served to everybody').toContain('title="Reload"');
  });
});

describe('NAV-02 — the viewer’s way out of the room’s music', () => {
  const VIEWER_STOP = 'title="Music is playing from SoundCloud for all"';

  it('is served to a member while the room is playing', () => {
    expect(html({ media: { ...MEDIA, soundCloudPlaying: true } })).toContain(VIEWER_STOP);
  });

  it('is absent when nothing is playing — it stops something, so it needs something to stop', () => {
    expect(html({ media: { ...MEDIA, soundCloudPlaying: false } })).not.toContain(VIEWER_STOP);
  });

  it('is absent for a PRESENTER, whose dropdown already carries the same handler', () => {
    /*
      The gate is the exact negation of the dropdown's, so this is not a nicety: rendering both would
      put two elements carrying `id="soundcloudDropdown"` into one document, which is the duplicate
      the reference avoids by construction rather than by luck.
    */
    const presenter = html({ isPresenter: true, media: { ...MEDIA, soundCloudPlaying: true } });
    expect(presenter).not.toContain(VIEWER_STOP);
    expect(presenter, 'the presenter keeps the dropdown').toContain(
      'title="Play music from SoundCloud for all"'
    );
  });

  it('never puts two #soundcloudDropdown ids in one document', () => {
    /*
      Stated as the invariant rather than as a third case, because the two gates could both be
      widened later and each would still pass its own test.
    */
    for (const isPresenter of [true, false]) {
      const body = html({ isPresenter, media: { ...MEDIA, soundCloudPlaying: true } });
      expect(body.split('id="soundcloudDropdown"').length - 1, `isPresenter=${isPresenter}`).toBe(
        1
      );
    }
  });

  it('offers the member a keyboard route and a name, which the capture does not', () => {
    /*
      OURS, and asserted so it cannot be quietly dropped as "not in the reference": const 176 is a
      click on an anchor with no href, no text and no label. The label is the wording the presenter's
      own entry for the same handler uses.
    */
    const body = html({ media: { ...MEDIA, soundCloudPlaying: true } });
    expect(body).toContain('aria-label="Stop Playing For Me"');
    expect(body).toContain('tabindex="0"');
  });
});
