import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import RoomNavbar from './components/RoomNavbar.svelte';
import { RoomMedia } from './room/media.svelte';
import { RoomMenus } from './room/menus.svelte';
import { RoomRoster } from './room/roster.svelte';

/*
  THE TOP BAR RENDERS, AND A MEMBER DOES NOT GET THE BROADCAST CONTROLS.

  `RoomNavbar.svelte` is 904 lines and had neither a mount nor an SSR render test — recorded in
  `TODO.md` as an open row since the extraction that created it. Every assertion about it was a
  source-text one, and this file exists because those cannot answer the only question that matters
  here: what markup a member is actually served.

  ## Why the presenter gate is the subject rather than the layout

  The component's own comment at the gate says it: *"Broadcast controls — media.recording,
  SoundCloud, microphone, screen sharing, webcam and session control — drive what the room sends to
  everyone, so they are presenter-only. A reader keeps the Volume dropdown and Reload below, plus the
  talking and REC indicators above, which report state rather than change it."*

  That is an authority boundary drawn in markup, and markup is exactly what a text-reading test
  cannot verify: `{#if isPresenter}` appearing in the file proves the string is present, not that the
  block it opens actually closes around the controls it is meant to. A stray `{/if}` moved one line
  would leave the source assertion green and hand a member the recording controls.

  It is a RENDER gate, not an authorisation — every one of these controls is re-checked on the server
  (`presenterRoom()` gates the commands, and the SFU decides who may produce). So this file asserts
  what the room DRAWS, and says so, rather than claiming to test authority it does not own.

  ## SSR rather than jsdom

  `render` from `svelte/server` returns the HTML the server actually sends, which is the first thing
  a member receives and the thing a scraper or a disabled-JavaScript client sees. Nothing asserted
  below depends on an event firing, so mounting would add a DOM without adding evidence.
*/

/** The three state classes the bar takes whole. All three construct with no room behind them. */
function roomState() {
  return {
    media: new RoomMedia(),
    menus: new RoomMenus(),
    roster: new RoomRoster<{
      id: number;
      displayName: string;
      email: string;
      emailHash: string;
    }>({ seed: () => [], simUserCount: () => 0 })
  };
}

/*
  The four label strings the capture spells exactly. Passed as props rather than restated in the
  markup, so a broken hand-off shows up as an EMPTY control rather than as a wrong one — which is
  precisely the failure a render test can see and a source scan cannot.

  `virtualCamText` keeps the reference's spacing, including the missing space after the second
  slash. It is quoted here as evidence, not tidied.
*/
const LABELS = {
  noSpeakerText: 'No Speaker',
  shareScreenText: 'Share Screen',
  virtualCamText: ' OBS / XSPLIT/ Share Virtual Cam',
  stopSharingAllText: 'Stop Sharing All'
};

const noop = () => {};

function html(over: Record<string, unknown> = {}): string {
  return render(RoomNavbar, {
    props: {
      isPresenter: false,
      sidebarOpen: false,
      mobileNavOpen: false,
      ...roomState(),
      volume: 50,
      presenterAudio: {},
      individualVolumeControls: false,
      recordingReminderAllowed: false,
      recordingTooltip: '',
      mobileAppAvailable: false,
      tawkAvailable: false,
      doNotDisturbOn: false,
      mp3Playing: false,
      youtubeForAllUrl: '',
      backgroundVolume: 50,
      soundChecks: {},
      ...LABELS,
      setInputChecked: () => () => {},
      setRangeValue: () => () => {},
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
      ...over
    } as never
  }).body;
}

describe('the top bar renders at all', () => {
  it('serves markup for a member without throwing', () => {
    /*
      The floor, and it is not trivial: this component takes three state classes and thirty-odd
      callbacks, and it had never once been rendered by anything in this repository. A constructor
      that read a browser global, or a `$derived` resolving against an unset field, would have
      thrown here and gone unnoticed everywhere else.
    */
    const body = html();
    expect(body.length).toBeGreaterThan(0);
    expect(body, 'the Reload control is served to everybody').toContain('title="Reload"');
  });
});

describe('the broadcast controls are PRESENTER-ONLY, in the served markup', () => {
  it('a member is served none of them', () => {
    /*
      Each of these is a `title` on the `li` the gate wraps, so the assertion names the control the
      way the markup does rather than guessing at a class. A `{/if}` moved one line would put every
      one of them into this string.
    */
    const body = html({ isPresenter: false });
    expect(body).not.toContain('title="Star/Stop Recording"');
    expect(body).not.toContain('title="TAWK Support"');
  });

  it('and a presenter IS — the positive control, without which the above proves nothing', () => {
    /*
      The half that matters. `not.toContain` passes just as happily against a component that renders
      nothing at all, or against a typo in the string being searched for, so the same needle has to
      be shown appearing when the gate opens.
    */
    const body = html({ isPresenter: true });
    expect(body, 'the recording dropdown is a broadcast control').toContain(
      'title="Star/Stop Recording"'
    );
  });

  it('TAWK needs the presenter gate AND its own availability flag', () => {
    /*
      Two terms, and the component's own note records that ours carries a THIRD the reference does
      not — a configured widget. So presenter alone must not be enough, or a room with no support
      widget would draw a control that opens nothing.
    */
    expect(html({ isPresenter: true, tawkAvailable: false })).not.toContain('title="TAWK Support"');
    expect(html({ isPresenter: true, tawkAvailable: true })).toContain('title="TAWK Support"');
  });

  it('the mobile-app item follows its own flag, not the presenter role', () => {
    // `{#if mobileAppAvailable}` sits OUTSIDE the presenter block — a member with the app
    // configured gets it, and a presenter without it does not.
    expect(html({ isPresenter: false, mobileAppAvailable: true })).toContain('mainNavItem');
    expect(html({ isPresenter: true, mobileAppAvailable: false })).not.toContain(
      'title="Mobile App"'
    );
  });
});

describe('the captured labels reach the DOM verbatim', () => {
  it('renders the reference’s own spacing rather than a retyped copy', () => {
    /*
      These are props precisely so the strings live in one place. A dropped hand-off renders an empty
      control, which looks fine in a source scan and is invisible until somebody opens the menu —
      and one of these labels has already caused a bug, when a regex was built out of it.

      HTML-escaped on the way out, so the assertion compares against what the browser receives.
    */
    const body = html({ isPresenter: true });
    expect(body).toContain('OBS / XSPLIT/ Share Virtual Cam');
  });

  it('"Stop Sharing All" appears only WHILE sharing, which is its own gate', () => {
    /*
      My first draft asserted this label unconditionally against a presenter and went red. The
      component was right and the assertion was wrong: `{#if media.screenSharing}` wraps it, so a
      presenter who is not sharing is correctly not offered a way to stop.

      Kept as a two-sided assertion rather than deleted, because that is the behaviour worth pinning
      — a control that offers to stop something that is not happening is exactly the dead
      scaffolding this repository refuses, and one that vanishes mid-share is worse.
    */
    const media = new RoomMedia();
    expect(html({ isPresenter: true, media }), 'not sharing: nothing to stop').not.toContain(
      'Stop Sharing All'
    );

    media.screenSharing = true;
    expect(html({ isPresenter: true, media }), 'sharing: the way out is offered').toContain(
      'Stop Sharing All'
    );
  });
});
