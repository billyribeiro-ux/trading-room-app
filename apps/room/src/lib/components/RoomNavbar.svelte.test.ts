// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import { RoomMedia } from '#lib/room/media.svelte.js';
import { RoomMenus } from '#lib/room/menus.svelte.js';
import { RoomRoster } from '#lib/room/roster.svelte.js';

import RoomNavbar from './RoomNavbar.svelte';

/**
 * THE FIRST **MOUNT** TEST THIS COMPONENT HAS HAD — and the correction that produced it.
 *
 * ## A stale claim, repeated without checking, and corrected here
 *
 * This file was written under the belief that `RoomNavbar.svelte` was the ONE component in the
 * repository with no test at all. **That was false, and it was false in the repository's own
 * trackers before it was false here**: `room-navbar-render.test.ts` (SSR) and
 * `room-navbar-contract.test.ts` (source) have both existed for some time, and `TODO.md:679` says so
 * in as many words. `todo-next.md` still carries the old line, and it was read, believed and
 * repeated — into two CHANGELOG entries and a ceiling comment — rather than checked with an `ls`
 * that would have taken a second.
 *
 * Recorded here, at the code, because that is where the next person meets it. The rule this breaks
 * is the repository's own and it is the first line of `~/CLAUDE.md`: evidence is READ, never
 * recalled.
 *
 * ## What IS new, stated accurately
 *
 * Both existing files use `render` from `svelte/server`. **SSR emits the first frame and nothing
 * after it** — no event handler runs, no `{@attach}` fires, and no `$bindable` write can happen. So
 * everything below is genuinely uncovered by them, because everything below is a WRITE or a
 * transition: the hamburger assigning to `sidebarOpen`, the mobile toggle assigning to
 * `mobileNavOpen`, and the recording indicator changing as `RoomMedia` moves through its states.
 *
 * ## The defect this file exists to keep from coming back
 *
 * `sidebarOpen` and `mobileNavOpen` are `$bindable()`, and the component's own docblock records that
 * the extraction nearly shipped them as plain props: the hamburger would have animated while the
 * sidebar it controls — a SIBLING component reading the page's value — never moved. `svelte-check`
 * is silent on that, and so was the suite; what caught it was a source assertion looking for a
 * handler in the wrong file, which is to say luck.
 *
 * A bound write is exactly what a mount can see and nothing else here can, so it is the first thing
 * asserted below.
 */
type Member = { id: number; displayName: string; email: string; isP: boolean; isFT: boolean };

const mounted: (() => void)[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()?.();
});

/**
 * Every prop, with the callbacks collected rather than asserted one at a time.
 *
 * The bar takes just over fifty, which is itself the reason it has no test: a fixture this size is
 * work, and work that is skipped is how a 922-line component ships uncovered. It is written once
 * here and every test overrides the two or three it cares about.
 */
const render = (over: Record<string, unknown> = {}) => {
  const media = new RoomMedia();
  const roster = new RoomRoster<Member>({ seed: () => [], simUserCount: () => 0 });
  const calls: Record<string, number> = {};
  const count = (name: string) => () => (calls[name] = (calls[name] ?? 0) + 1);

  const state = $state({ sidebarOpen: false, mobileNavOpen: false });

  const target = document.createElement('div');
  document.body.append(target);
  const component = mount(RoomNavbar, {
    target,
    props: {
      isPresenter: true,
      get sidebarOpen() {
        return state.sidebarOpen;
      },
      set sidebarOpen(next: boolean) {
        state.sidebarOpen = next;
      },
      get mobileNavOpen() {
        return state.mobileNavOpen;
      },
      set mobileNavOpen(next: boolean) {
        state.mobileNavOpen = next;
      },
      media,
      menus: new RoomMenus(),
      roster,
      volume: 100,
      presenterAudio: { audioMutedFor: {}, audioVolumeFor: {} },
      individualVolumeControls: false,
      recordingReminderAllowed: false,
      benzinga: { visible: false, url: null, logoUrl: null },
      recordingTooltip: '',
      mobileAppAvailable: false,
      tawkAvailable: false,
      doNotDisturbOn: false,
      mp3Playing: false,
      youtubeForAllUrl: '',
      backgroundVolume: 70,
      soundChecks: {},
      noSpeakerText: 'No Speaker',
      shareScreenText: 'Share Screen',
      virtualCamText: ' OBS / XSPLIT/ Share Virtual Cam',
      stopSharingAllText: 'Stop Sharing All',
      setInputChecked: () => () => {},
      setRangeValue: () => () => {},
      ontoggletopmenu: count('toggletopmenu'),
      onstartrecording: count('startrecording'),
      onstoprecording: count('stoprecording'),
      onpauserecording: count('pauserecording'),
      onresumerecording: count('resumerecording'),
      ondownloadrecording: count('downloadrecording'),
      onpromptforsoundcloud: count('promptforsoundcloud'),
      onstopsoundcloud: count('stopsoundcloud'),
      onstopsoundcloudforme: count('stopsoundcloudforme'),
      ontogglemicrophone: count('togglemicrophone'),
      ontogglewebcam: count('togglewebcam'),
      hideWebcamForRoom: false,
      blinkingRec: false,
      onpromptforscreenname: count('promptforscreenname'),
      onstopscreensharing: count('stopscreensharing'),
      onopensessioncontrol: count('opensessioncontrol'),
      onsetmastervolume: count('setmastervolume'),
      onsetbackgroundvolume: count('setbackgroundvolume'),
      ontogglemute: count('togglemute'),
      onadjustpresentervolume: count('adjustpresentervolume'),
      ontoggletalkingpresenteraudio: count('toggletalkingpresenteraudio'),
      onupdatesoundcheck: count('updatesoundcheck'),
      ontoggletawksupport: count('toggletawksupport'),
      ongetmypinanddoinfo: count('getmypinanddoinfo'),
      onrequestreload: count('requestreload'),
      onshowrecpreview: count('showrecpreview'),
      onhiderecpreview: count('hiderecpreview'),
      /*
        The seven that arrived with G04-G07 and G12/G13. Defaults chosen so the BASE render is the
        plainest room there is — no MediaMTX tab, no local screens, the count visible, the sidebar
        setting off — and every test that wants one of them says so in its own `over`.
      */
      alwaysShowRoster: false,
      rosterCountVisible: true,
      streamingTabAvailable: false,
      localScreens: [],
      onmutetalkinguser: count('mutetalkinguser'),
      onopenstreamingtab: count('openstreamingtab'),
      onreopenpreview: count('reopenpreview'),
      onstoplocalscreen: count('stoplocalscreen'),
      ...over
    }
  }) as Record<string, unknown>;

  flushSync();
  mounted.push(() => {
    unmount(component);
    target.remove();
  });
  return { root: target, state, media, calls };
};

describe('the two toggles write back through their binding', () => {
  /*
    THE DEFECT THE COMPONENT'S OWN DOCBLOCK RECORDS. A plain prop assignment would update the
    component's private copy and leave `state` alone — the button would animate and the sidebar would
    not move. The assertion is on `state`, deliberately, and NOT on the icon: a test that only
    checked the arrow flipped would pass under exactly the bug being guarded against.
  */
  it('the hamburger moves the PAGE value, not just its own icon', () => {
    const { root, state } = render();
    const hamburger = root.querySelector<HTMLElement>('span.sidebar-menu');
    expect(hamburger, 'the sidebar toggle is missing').not.toBeNull();

    hamburger?.click();
    flushSync();
    expect(state.sidebarOpen, 'the write did not cross the binding').toBe(true);

    // …and it toggles rather than latching.
    hamburger?.click();
    flushSync();
    expect(state.sidebarOpen).toBe(false);
  });

  it('and the icon follows the value it wrote', () => {
    const { root, state } = render();
    expect(root.querySelector('span.sidebar-menu i')?.className).toBe('fas fa-bars');
    expect(root.querySelector('span.sidebar-menu')?.getAttribute('title')).toBe('Open Sidebar');

    root.querySelector<HTMLElement>('span.sidebar-menu')?.click();
    flushSync();
    expect(state.sidebarOpen).toBe(true);
    expect(root.querySelector('span.sidebar-menu i')?.className).toBe('fas fa-arrow-left');
    expect(root.querySelector('span.sidebar-menu')?.getAttribute('title')).toBe('Close Sidebar');
  });

  it('the mobile toggle does the same, and says so to a screen reader', () => {
    const { root, state } = render();
    const toggler = root.querySelector<HTMLButtonElement>('button.navbar-toggler');
    expect(toggler?.getAttribute('aria-expanded')).toBe('false');

    toggler?.click();
    flushSync();
    expect(state.mobileNavOpen).toBe(true);
    expect(toggler?.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('#navbarsRoom')?.className).toContain('show');
  });
});

describe('the recording indicator', () => {
  /*
    Three mutually exclusive states, and the ORDER of the branches is the thing worth pinning:
    `paused && recording` is tested BEFORE `recording`, so a paused recording reads "[ REC PAUSED]"
    rather than falling through to the live badge. Swapping them is invisible to a source assertion.
  */
  it('draws nothing while the room is not recording', () => {
    const { root } = render();
    expect(root.querySelector('.recIndicator')).toBeNull();
  });

  it('draws the live badge while recording', () => {
    const { root, media } = render();
    media.roomRecordingStarted('rec.mp4');
    flushSync();
    expect(root.querySelector('.recIndicator a')?.textContent).toBe('[ REC ]');
  });

  it('draws the PAUSED badge when paused, rather than falling through to the live one', () => {
    const { root, media } = render();
    media.roomRecordingStarted('rec.mp4');
    media.roomRecordingPauseChanged(true);
    flushSync();
    expect(root.querySelector('.recIndicator a')?.textContent).toBe('[ REC PAUSED]');
  });

  /*
    "Blinking REC?" — and the DIVERGENCE the prop's docblock records is what is asserted. Upstream
    binds `breathing-rec` through a class map on the recording `ul`; this bar renders one `li` per
    state, so the class lands on the `[ REC ]` item. Same element breathing, one level down.
  */
  it('breathes only when the room asked it to', () => {
    const off = render();
    off.media.roomRecordingStarted('rec.mp4');
    flushSync();
    expect(off.root.querySelector('.recIndicator')?.className).not.toContain('breathing-rec');

    const on = render({ blinkingRec: true });
    on.media.roomRecordingStarted('rec.mp4');
    flushSync();
    expect(on.root.querySelector('.recIndicator')?.className).toContain('breathing-rec');
  });

  /*
    THE TOOLTIP IS RENDERED VERBATIM AND NOT COMPOSED HERE. `dontShowRecInfoToUsers` is resolved by
    `RoomGates.recordingTooltip`, because a member may not be shown the recording file name — and
    that gate was reading a viewer preference nothing writes until 2026-08-28, so every member in
    every room saw a name the owner had hidden. This bar must not acquire its own opinion about it.
  */
  it('shows exactly the tooltip it was handed, including an empty one', () => {
    const withName = render({ recordingTooltip: 'session-2026-08-28.mp4' });
    withName.media.roomRecordingStarted('rec.mp4');
    flushSync();
    expect(withName.root.querySelector('.recIndicator a')?.getAttribute('title')).toBe(
      'session-2026-08-28.mp4'
    );

    const hidden = render({ recordingTooltip: '' });
    hidden.media.roomRecordingStarted('rec.mp4');
    flushSync();
    expect(hidden.root.querySelector('.recIndicator a')?.getAttribute('title')).toBe('');
  });
});

describe('the gates the page resolves for it', () => {
  it('offers the mobile-app launcher only when the room has an app', () => {
    expect(render().root.querySelector('[title="Launch in Mobile App"]')).toBeNull();
    expect(
      render({ mobileAppAvailable: true }).root.querySelector('[title="Launch in Mobile App"]')
    ).not.toBeNull();
  });

  /*
    "Hide webcam for room?" — the fifth term of the webcam control's gate and the only one this room
    could not evaluate before 2026-08-28. An owner who turned webcams off got the button anyway.
  */
  it('hides the webcam control when the room turned webcams off', () => {
    const shown = render();
    const hidden = render({ hideWebcamForRoom: true });
    /*
      By the captured title, exactly. The first draft filtered `a,span,button` by a lower-cased
      substring and found nothing — the control is an `<li>`, and a selector that guesses the element
      is a selector that reports "hidden" for a control that is right there.
    */
    const webcam = '[title="Start / Stop WebCam"]';
    expect(shown.root.querySelector(webcam), 'positive control').not.toBeNull();
    expect(hidden.root.querySelector(webcam)).toBeNull();
  });
});

/**
 * ── G04, G05, G06, G07, G12, G13 — the six rows of 2026-08-30 ────────────────────────────────────
 *
 * MOUNTED rather than SSR-rendered, and for these six that is not a preference. Five of them are
 * CLICKS and one is a gate whose two states are only distinguishable by rendering both, so an SSR
 * first frame would show the markup and prove nothing about what pressing it does.
 */
describe('G12 — the users counter is a control with two gestures', () => {
  /*
    `d(3,"span",79), x("click", … toggleSideBarUsersCount())("dblclick", … hideCount = !hideCount)`
    at byte 2,484,941; const 79 carries `3,"click","dblclick"`. The enumeration mislabelled which is
    which — CLICK opens the sidebar, DBLCLICK hides the number.
  */
  const counter = (root: HTMLElement) => root.querySelector<HTMLElement>('span.users');

  it('opens the sidebar on CLICK when alwaysShowRoster is on', () => {
    const { root, state } = render({ alwaysShowRoster: true });
    counter(root)?.click();
    flushSync();
    expect(state.sidebarOpen).toBe(true);
  });

  it('does NOTHING on click without it, because the setting gates the whole statement', () => {
    /*
      `this.alwaysShowRoster && (this.showSidebar = !this.showSidebar, …)` — the control is inert in
      a room that did not ask for it, which is upstream's own behaviour and not a bug being copied:
      the hamburger next to it does the same job unconditionally.
    */
    const { root, state } = render({ alwaysShowRoster: false });
    counter(root)?.click();
    flushSync();
    expect(state.sidebarOpen).toBe(false);
  });

  it('hides the NUMBER on double-click, and puts it back on a second', () => {
    const { root } = render();
    expect(counter(root)?.textContent).toContain('0');

    counter(root)?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    flushSync();
    expect(counter(root)?.textContent).not.toContain('0');
    /* The icon stays: `hideCount` hides the count, not the control. */
    expect(counter(root)?.querySelector('i.fa-user')).not.toBeNull();

    counter(root)?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    flushSync();
    expect(counter(root)?.textContent).toContain('0');
  });
});

describe('G13 — the roster count honours the owner setting here too', () => {
  it('renders no number when the room hides the count from viewers', () => {
    /*
      `O(5, hideCount || !rosterCountVisibleToViewers && !isPresenter ? -1 : 5)` at byte 2,487,511.
      This room already honoured the same setting for the SIDEBAR badge (`roster-gates.ts`, used at
      `RoomSidebar.svelte:545`) and rendered the number unconditionally one element away — a gate
      applied in one of two places is not a gate.
    */
    const { root } = render({ rosterCountVisible: false });
    const counter = root.querySelector<HTMLElement>('span.users');
    expect(counter, 'the counter itself stays').not.toBeNull();
    expect(counter?.textContent).not.toContain('0');
    expect(counter?.querySelector('span.ml-1')).toBeNull();
  });

  it('renders it when the setting allows, which is the control', () => {
    const { root } = render({ rosterCountVisible: true });
    expect(root.querySelector('span.users span.ml-1')?.textContent).toContain('0');
  });
});

describe('G04 — each talking name is a control', () => {
  const talking = [{ userID: 7, mediaValue: { name: 'Ada' } }];

  it('reports the speaker that was clicked', () => {
    /*
      `d(0,"span",147)` at byte 2,473,449, const 147 `[3,"click"]`, bound to
      `muteTalkingUserDialog(o)`. Ours was a bare span, so a presenter watching one member hold the
      floor had no way to take it back short of opening the roster — and `muteAllNonAdmins`, which
      is built, is all-or-nothing.
    */
    const { root, media, calls } = render();
    media.startTalking(talking[0]);
    flushSync();

    const name = root.querySelector<HTMLElement>('span.talking-string span[role="button"]');
    expect(name, 'the speaker name is not a control').not.toBeNull();
    expect(name?.textContent).toContain('Ada');

    name?.click();
    flushSync();
    expect(calls.mutetalkinguser).toBe(1);
  });

  it('is reachable from the keyboard, which the reference span is not', () => {
    /* Ours: the capture binds a click to a bare span, and a span is neither focusable nor typed. */
    const { root, media, calls } = render();
    media.startTalking(talking[0]);
    flushSync();

    const name = root.querySelector<HTMLElement>('span.talking-string span[role="button"]');
    expect(name?.getAttribute('tabindex')).toBe('0');
    name?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    flushSync();
    expect(calls.mutetalkinguser).toBe(1);
  });
});

describe('G05, G06 and G07 — the three new screenshare entries', () => {
  const items = (root: HTMLElement) =>
    [...root.querySelectorAll('.screen-options-start-screen li')].map((li) =>
      (li.textContent ?? '').trim()
    );

  it('offers OBS / RTMP only when the room has MediaMTX', () => {
    /* `O(13, sessData.useMediaMTX ? 13 : -1)`, byte 2,480,950. */
    expect(items(render({ streamingTabAvailable: true }).root).join(' | ')).toContain(
      'OBS / RTMP / Stream / Restream'
    );
    expect(items(render({ streamingTabAvailable: false }).root).join(' ')).not.toContain(
      'OBS / RTMP'
    );
  });

  it('carries the `New` badge the reference gives it', () => {
    const { root } = render({ streamingTabAvailable: true });
    expect(
      root.querySelector('.screen-options-start-screen .badge.text-bg-danger')?.textContent
    ).toBe('New');
  });

  it('opens the streaming tab when pressed', () => {
    const { root, calls } = render({ streamingTabAvailable: true });
    root
      .querySelector<HTMLElement>(
        '.screen-options-start-screen li[title="OBS / RTMP / Stream / Restream"]'
      )
      ?.click();
    flushSync();
    expect(calls.openstreamingtab).toBe(1);
  });

  it('offers Reopen Screenshare Preview only while sharing, and it is the way back', () => {
    /*
      `hidePreviewWindows()` set `previewWindowsVisible = false` and NOTHING set it true again, so a
      presenter who hid the preview cards could not get them back without reloading the room.
    */
    const { root, media, calls } = render();
    expect(items(root).join(' ')).not.toContain('Reopen Screenshare Preview');

    media.screenSharing = true;
    flushSync();
    const entry = [...root.querySelectorAll<HTMLElement>('.screen-options-start-screen li')].find(
      (li) => (li.textContent ?? '').includes('Reopen Screenshare Preview')
    );
    expect(entry, 'the entry is missing while sharing').not.toBeUndefined();
    entry?.click();
    flushSync();
    expect(calls.reopenpreview).toBe(1);
  });

  it('offers one Stop Sharing entry per LOCAL screen, naming each', () => {
    /* `ht(16, d4e, 3, 1, "li", null, WB)` over `screenProducers` — this browser's own shares. */
    const { root } = render({
      localScreens: [
        { id: 'p1', screenName: 'FUTURES' },
        { id: 'p2', screenName: 'Screen 2' }
      ]
    });
    expect(items(root)).toContain('Stop Sharing FUTURES');
    expect(items(root)).toContain('Stop Sharing Screen 2');
  });

  it('stops the screen that was named, not the first one', () => {
    /*
      The failure this guards is the one a repeater invites: closing over the wrong entry stops a
      different screen, and a presenter watching the WRONG pane vanish has no way to tell what
      happened. Asserted by id rather than by call count.
    */
    const stopped: string[] = [];
    const { root } = render({
      localScreens: [
        { id: 'p1', screenName: 'FUTURES' },
        { id: 'p2', screenName: 'Screen 2' }
      ],
      onstoplocalscreen: (id: string) => stopped.push(id)
    });
    [...root.querySelectorAll<HTMLElement>('.screen-options-start-screen li')]
      .find((li) => (li.textContent ?? '').includes('Screen 2'))
      ?.click();
    flushSync();
    expect(stopped).toEqual(['p2']);
  });
});
