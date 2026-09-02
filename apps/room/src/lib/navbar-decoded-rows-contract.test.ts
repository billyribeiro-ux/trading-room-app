import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import RoomNavbar from './components/RoomNavbar.svelte';

/**
 * The four navbar rows a WHOLE-REGION decode produced on 2026-08-31, and the one it refused.
 *
 * `NAV-02` (the listener's SoundCloud control), `NAV-03` (the hamburger's `alwaysShowRoster` gate),
 * `NAV-04` (`breathing-rec` on the presenter's recording icon), `NAV-05` (the second half of that
 * class map, refused) and `NAV-07` (`nav-link` on the two launching spinners). Every one of them
 * came out of reading `U4e` end to end and decoding its consts BY VALUE — none is visible to a
 * reader who looks up the slot number a previous row cited.
 *
 * ## NAV-02 — SoundCloud in the top bar is TWO items, and this room built one of them.
 *
 * ## The measurement
 *
 * `app-room`'s navbar template is `U4e` at bundle byte 2,484,831. Its consts were decoded by
 * bracket-walking the array from `consts:[[` at byte 2,533,197 and reading the entries by VALUE, not
 * by looking a slot number up — a const index is per component and the same numbers mean different
 * things three tables away.
 *
 * ```js
 * H(22,i4e,18,4,"li",96)(23,o4e,4,3,"li",97)
 *
 * 96  ["title","Play music from SoundCloud for all",1,"nav-item","dropdown"]
 * 97  ["title","Music is playing from SoundCloud for all",1,"nav-item"]
 * 176 ["id","cssSoundCloudIcon","id","soundcloudDropdown","aria-haspopup","true",
 *      "aria-expanded","false",1,"nav-link","d-flex","align-items-center",3,"click","ngClass"]
 * 166 [1,"fab","fa-2x","fa-soundcloud"]
 * 169 ["src","/assets/images/playing.gif",2,"max-height","25px"]
 *
 * O(22, isPresenter || isNonPresenterAdmin ? 22 : -1)                     // byte 2,488,593
 * O(23, isPresenter || isNonPresenterAdmin || !scPlaying ? -1 : 23)       // byte 2,488,684
 *
 * function o4e(t,n){ … d(0,"li",97)(1,"a",176),
 *                      x("click", () => doSoundCloudUserStop()),
 *                      T(2,"i",166)(3,"img",169) … }                      // byte 2,478,748
 * ```
 *
 * Slot 23 is a LISTENER's control: one anchor, one command, rendered only while a track is playing
 * and only to somebody who is not running the room.
 *
 * ## What its absence cost
 *
 * `onstopsoundcloudforme` reached `broadcasts.stopSoundCloudForMe()` and was reachable from exactly
 * one element — the third entry of the presenter's dropdown, which is inside `{#if isPresenter}`. A
 * member hearing the room's music could not stop it in their own browser. The master volume is not a
 * substitute: it silences the presenter with it.
 *
 * ## SSR, not a mount
 *
 * The question is "is this element in the document", and `{@attach}` never runs during SSR — the
 * same instrument and the same reasoning as `room-navbar-contract.test.ts`, whose stub this file
 * reuses in shape.
 */
type Stub = Record<string, unknown>;

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
  talking: [],
  limitedPresenter: false
};

function props(overrides: Stub = {}): Stub {
  const noop = () => {};
  /*
    `media` is MERGED rather than replaced, and the rest of the overrides are spread last.

    Spreading `overrides` whole put a four-key object where `RoomMedia` should be, and
    `PresenterMuteRows` threw on `talkingUsers.length` — which is the stub self-checking, exactly as
    `room-navbar-contract.test.ts` records. Pulling `media` out of the trailing spread is what keeps
    a one-flag case from restating twenty fields.
  */
  const { media: mediaOverride, ...rest } = overrides;
  return {
    isPresenter: false,
    hasMic: false,
    sidebarOpen: false,
    mobileNavOpen: false,
    media: { ...MEDIA, ...((mediaOverride as Stub) ?? {}) },
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
    benzinga: { visible: false, url: null, logoUrl: null },
    mobileAppAvailable: false,
    tawkAvailable: false,
    doNotDisturbOn: false,
    mp3Playing: false,
    youtubeForAllUrl: '',
    backgroundVolume: 100,
    soundChecks: {},
    noSpeakerText: ' ( No one is speaking )',
    shareScreenText: 'Share Screen ',
    virtualCamText: ' OBS / XSPLIT/ Share Virtual Cam',
    stopSharingAllText: ' Stop Sharing All Screens',
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
    ...rest
  };
}

const html = (overrides: Stub = {}) =>
  render(RoomNavbar as never, { props: props(overrides) as never }).body;

/** The listener item's own id — const 176's FIRST `id`, which is the one a browser keeps. */
/*
  ── TWO CORRECTIONS, IN ORDER, BOTH FROM THE BYTES ──────────────────────────────────────────

  ## And it is a FALSE GAP rather than a divergence, re-measured 2026-09-01

  `reference-const-coverage-contract.test.ts` lists `cssSoundCloudIcon` as a residual — a value the
  reference's const table carries and this room's source does not. That is true of the SOURCE and
  false of the PAGE: because the second `id` wins, the reference's rendered DOM carries
  `id="soundcloudDropdown"`, and so does ours, character for character. The value exists only in a
  const table, which this room has no equivalent of. Same family as the fourteen runtime-composed
  `data-bs-target`s that sweep also lists.

  It is unwritable in any case, and the Svelte compiler is the evidence rather than an assumption —
  the exact refusal, run against this element's markup with both `id`s present:

      ERROR "Attributes need to be unique"
      https://svelte.dev/e/attribute_duplicate

  `id` twice on one element is ONE attribute to Svelte and two slots to Angular. The same limit, for
  the same reason, as the four `value` + `bind:value` colour inputs in `FollowChatStylePane.svelte`.

  This was `cssSoundCloudIcon`. Const 176 declares `id` twice and Angular's `setUpAttributes` (`H0`,
  bundle byte 16,054) calls `setAttribute` once per string pair with no de-duplication, so the
  SECOND wins and the first never reaches the document — "a browser keeps the first" is the HTML
  PARSER's rule for markup, and a const array is not parsed. The element's id is
  `soundcloudDropdown`.

  Which then made `soundcloudDropdown` the wrong NEEDLE, because the presenter's dropdown carries
  it too and the case below asserts the listener arm is ABSENT for a presenter — it was answered by
  the very element it was meant to distinguish from. The needle is const 97's own title, which
  belongs to the listener `li` alone; const 96's presenter title is "Play music from SoundCloud for
  all", one word apart and not a substring of it.
*/
const LISTENER = 'title="Music is playing from SoundCloud for all"';

describe('NAV-02 — the listener gets a SoundCloud control while a track is playing', () => {
  it('renders the navbar at all — the positive control', () => {
    /*
      First, because every "is absent" assertion below passes just as happily against a render that
      threw or was handed a broken stub. This is the same guard `room-navbar-contract.test.ts` opens
      with, and it is not ceremony: the stub has fifty members and one missing one throws.
    */
    const body = html();
    expect(body.length).toBeGreaterThan(500);
    expect(body, 'the reader keeps the volume dropdown').toContain('dropdownVolume');
  });

  it('is there for a member when the room is playing', () => {
    expect(html({ media: { soundCloudPlaying: true } })).toContain(LISTENER);
  });

  it('is NOT there when nothing is playing', () => {
    /* `|| !scPlaying` is the third term of slot 23's refusal, and it is the whole point of it. */
    expect(html()).not.toContain(LISTENER);
  });

  it('is NOT there for a presenter, who has the dropdown instead', () => {
    /*
      The two slots are complementary, not duplicates: a presenter playing a track gets the dropdown
      whose third entry is the same command. Rendering both would put two SoundCloud icons in one
      bar, which is what a boolean prop named `isPresenter` on the component would have invited.
    */
    const presenter = html({ isPresenter: true, media: { soundCloudPlaying: true } });
    expect(presenter).not.toContain(LISTENER);
    expect(presenter, 'the presenter still has their own dropdown').toContain('soundcloudDropdown');
  });

  it('carries the captured title and the captured icon', () => {
    const body = html({ media: { soundCloudPlaying: true } });
    // Const 97's title, and const 166's three classes.
    expect(body).toContain('Music is playing from SoundCloud for all');
    expect(body).toContain('fab fa-2x fa-soundcloud');
  });

  it('does NOT wear the dropdown attributes const 176 carries', () => {
    /*
      `aria-haspopup="true"` and `aria-expanded="false"` are in const 176 and are refused here: this
      element opens nothing. Asserted against the LISTENER's own markup rather than the whole bar,
      because the presenter's dropdown legitimately carries both and a document-wide
      `not.toContain` would be answered by whichever render happened to omit it.
    */
    const body = html({ media: { soundCloudPlaying: true } });
    const at = body.indexOf(LISTENER);
    expect(at, 'the listener item is not rendered at all').toBeGreaterThan(-1);
    const end = body.indexOf('</li>', at);
    expect(end, 'the listener item is unterminated').toBeGreaterThan(at);
    expect(body.slice(at, end)).not.toContain('aria-haspopup');
  });
});

describe('NAV-02 — the command behind it is the one the reference sends', () => {
  const NAVBAR = readFileSync(new URL('./components/RoomNavbar.svelte', import.meta.url), 'utf8');
  const SOUNDCLOUD = readFileSync(
    new URL('./components/NavbarSoundCloud.svelte', import.meta.url),
    'utf8'
  );

  it('hands the listener arm the SAME callback the dropdown third entry uses', () => {
    /*
      `o4e`'s click is `doSoundCloudUserStop()` and the dropdown's third entry is the same call
      (`i4e`, byte 2,478,080). One prop, passed to both arms, is what makes that true here — and it
      is why the two arms are one component rather than two.
    */
    expect(SOUNDCLOUD.split('onstopsoundcloudforme').length - 1).toBeGreaterThan(2);
  });

  it('gates the listener arm at the CALL SITE, outside the presenter block', () => {
    /*
      Slot 23's gate is not the negation of slot 22's — `!scPlaying` appears in one and not the
      other — so the component cannot own it without taking two booleans and deciding between them,
      which is the shape that puts an entitlement decision inside a presentation component.
    */
    expect(NAVBAR).toContain('{#if !isPresenter && media.soundCloudPlaying}');
    expect(NAVBAR).toContain('variant="listener"');
    expect(NAVBAR).toContain('variant="presenter"');
  });
});

/**
 * NAV-03 — the hamburger, and the setting that removes it.
 *
 * ```js
 * H(1,DPe,2,0,"span",77)(2,EPe,2,0,"span",78)                     // U4e, byte 2,484,831
 * 77 ["title","Close Sidebar",1,"sidebar-menu","active-icon"]
 * 78 ["title","Open Sidebar",1,"sidebar-menu"]
 *
 * O(1, showSidebar && !alwaysShowRoster ? 1 : -1)                 // byte 2,487,413
 * O(2, showSidebar || alwaysShowRoster ? -1 : 2)
 * ```
 *
 * `alwaysShowRoster` is in BOTH conditions, on the refusing side of each, so with the setting on
 * NEITHER slot renders. The reference's only remaining sidebar toggle in that room is the users
 * counter, whose handler is `alwaysShowRoster && (showSidebar = !showSidebar, …)` and therefore
 * works in exactly that room and nowhere else — this bar already implements that half, and
 * `RoomNavbar.svelte.test.ts` asserts it in both directions.
 *
 * So the two are complementary halves of one decision and this room had one of them: in an
 * `alwaysShowRoster` room we rendered a control the reference removes, and it could close a sidebar
 * the setting says is always shown.
 */
describe('NAV-03 — the hamburger is removed by alwaysShowRoster, not merely stuck open', () => {
  const hamburger = (body: string) => body.includes('class="sidebar-menu"');

  it('is there in an ordinary room — the positive control', () => {
    /* Without this the refusal below is satisfied by a navbar that failed to render at all. */
    expect(hamburger(html())).toBe(true);
  });

  it('is gone when the room always shows the roster', () => {
    expect(hamburger(html({ alwaysShowRoster: true }))).toBe(false);
  });

  it('takes the OPEN form away too, not just the closed one', () => {
    /*
      Slot 1 and slot 2 are separate elements upstream and each carries the setting separately. A
      gate written on only one of them would leave `Close Sidebar` rendering in exactly the room the
      setting is for, which is the state that room starts in — `sidebarOpen` is seeded from the same
      setting on the page.
    */
    const open = html({ alwaysShowRoster: true, sidebarOpen: true });
    expect(open).not.toContain('sidebar-menu active-icon');
    expect(open, 'the rest of the bar is still there').toContain('dropdownVolume');
  });

  it('leaves the users counter as the room’s remaining toggle', () => {
    /* The half this room already had, asserted here so the pair is visible in one place. */
    expect(html({ alwaysShowRoster: true })).toContain('Users Connected');
  });
});

/**
 * NAV-04 and NAV-05 — `iPe`, the one class map, and the element it is actually bound to.
 *
 * ```js
 * iPe = (t, n) => ({ "breathing-rec": t, recIndicatorStart: n })          // byte 2,465,900
 *
 * function t4e(t,n){ … d(0,"li",95)(1,"a",152), T(2,"i",153) … }          // byte 2,477,354
 * m(), z("ngClass", ct(4, KB, !isScreenSharing)),                         // index 1 = a[152]
 * m(), z("ngClass", Kn(6, iPe, roomState.isRecording && sessData.blinkingRec,
 *                             isRecordingStarting)),                      // index 2 = i[153]
 * 153 [1,"far","fa-2x","fa-dot-circle",3,"ngClass"]
 * ```
 *
 * One binding, at byte 2,477,678, on the `<i>` inside the PRESENTER's Start/Stop Recording anchor.
 * `RoomNavbar.svelte`'s own docblock said it was "a class MAP on the recording `ul`" and that was
 * wrong about the element; the room-wide `[ REC ]` badge (const 93) carries no class map at all.
 *
 * **NAV-05 was a refusal until 2026-09-02, and its own last sentence is what overturned it.**
 *
 * `recIndicatorStart`'s only rule anywhere is `app-room .recIndicatorStart a` —
 * `captured-runtime-components.css:988`, a descendant selector — and an `<i>` with no children has
 * no descendant `a`, so the class paints nothing there. The refusal read that as "a class with no
 * CSS, which this repository refuses by name", and recorded in the same breath: *"It is inert in
 * the reference for the same reason."*
 *
 * That second sentence is not a supporting detail, it is the answer. A class that is dead upstream
 * and dead here is an upstream defect reproduced, which is matching rather than an escape from it —
 * and the rendered `class` attribute is reference-facing output, so it differed. Worn now.
 *
 * The assertion below flipped with it, and it keeps the half that was always worth having: const 94
 * puts the same name on the STARTING badge's `li`, which does have the `a` the rule needs, so both
 * elements must carry it and the badge is not quietly traded for the icon.
 */
describe('NAV-04 — the presenter’s recording icon breathes where the reference breathes it', () => {
  const recording = { roomRecording: true };
  /**
   * The recording ANCHOR's own markup, from its id through its icon tag — and nothing else.
   *
   * The obvious slice, "everything before `fa-dot-circle`", was wrong and the suite said so on its
   * first run: the room-wide `[ REC ]` badge and the starting badge both render EARLIER in the bar
   * and both carry the very names these assertions look for, so `breathing-rec` and
   * `recIndicatorStart` were answered by a different element every time. That is the substring
   * failure this repository keeps re-learning, caught here by a control rather than by a reader.
   */
  const iconClass = (body: string) => {
    const from = body.indexOf('id="dropdownRecording"');
    expect(from, 'the recording dropdown is not rendered at all').toBeGreaterThan(-1);
    const icon = body.indexOf('fa-dot-circle', from);
    expect(icon, 'the recording icon is not rendered at all').toBeGreaterThan(from);
    /*
      Through the END of the icon tag, not up to its base class: Svelte's `clsx` attribute appends
      the conditional names AFTER the literal ones, so a slice that stopped at `fa-dot-circle` could
      never see `breathing-rec` and the positive assertion failed on its second run.
    */
    const to = body.indexOf('</i>', icon);
    expect(to, 'the recording icon tag is unterminated').toBeGreaterThan(icon);
    return body.slice(from, to);
  };

  it('renders the recording control at all for a presenter — the positive control', () => {
    expect(html({ isPresenter: true })).toContain('far fa-2x fa-dot-circle');
  });

  it('breathes the icon while the room records and the owner asked for it', () => {
    expect(iconClass(html({ isPresenter: true, blinkingRec: true, media: recording }))).toContain(
      'breathing-rec'
    );
  });

  it('does not breathe it when the owner did not', () => {
    expect(
      iconClass(html({ isPresenter: true, blinkingRec: false, media: recording }))
    ).not.toContain('breathing-rec');
  });

  it('does not breathe it when the room is not recording, which is the term ours was missing', () => {
    /*
      `roomState.isRecording && sessData.blinkingRec` — the setting alone is not the gate. A room
      with the setting on and no recording running would otherwise have a red pulsing button that
      means nothing.
    */
    expect(iconClass(html({ isPresenter: true, blinkingRec: true }))).not.toContain(
      'breathing-rec'
    );
  });

  it('NAV-05 — puts recIndicatorStart on the icon while the recording is STARTING', () => {
    const body = html({ isPresenter: true, media: { roomRecordingStarting: true } });
    expect(iconClass(body)).toContain('recIndicatorStart');
    /* …and the badge that CAN paint it still does, so the icon is not traded for the badge. */
    expect(body).toContain('nav-item recIndicatorStart');
  });

  it('and takes it off again once the recording is no longer starting', () => {
    /*
      The second half of the binding, which the old absence assertion could never distinguish from a
      class that is simply never written. `Kn(6, iPe, …, isRecordingStarting)` is a BINDING: dropping
      the term entirely would satisfy the assertion above's negative twin and diverge from the
      capture in the other direction.
    */
    const body = html({ isPresenter: true, media: { roomRecordingStarting: false } });
    expect(iconClass(body)).not.toContain('recIndicatorStart');
  });
});

/**
 * NAV-07 — `class="nav-link"` on the two launching spinners.
 *
 * `r4e` at byte 2,479,346 and `p4e` at byte 2,481,414 are byte-identical bodies:
 * `d(0,"li",19)(1,"a",150), T(2,"i",181)`, where const 19 is `[1,"nav-item"]`, const 150 is
 * `[1,"nav-link"]` and const 181 is `[1,"fas","fa-2x","fa-spinner","fa-spin"]`. Both `<a>`s here
 * were bare, so the spinner rendered without the padding and line-height every other item in the bar
 * takes from `.nav-link`, and the row shifted the moment the device finished opening.
 */
/**
 * NAV-11 — `audioVolSlider`, the first entry of const 200 at byte 2,545,086:
 *
 * ```js
 * ["audioVolSlider","","type","range","min","0","max","100","title","Background Volume",
 *  1,"px-0","py-2",3,"ngModelChange","input","ngModel"]
 * ```
 *
 * An attribute with an EMPTY value, and nothing anywhere reads it — no CSS selector, no script, in
 * either codebase. It was a refusal on exactly that ground until 2026-09-02, and it is inert
 * upstream for the same reason, which makes it a defect reproduced rather than an escape.
 *
 * Rendered rather than read from source, because the thing that differed is the DOM: HTML attribute
 * names are case-insensitive and Svelte lowercases them, so both sides carry `audiovolslider`.
 */
describe('NAV-11 — the background-music slider carries the capture’s inert attribute', () => {
  const sliderTag = (body: string) => {
    const at = body.indexOf('id="background-volume"');
    expect(at, 'the background-music slider is not rendered at all').toBeGreaterThan(-1);
    /*
      BOTH bounds bound to locals and asserted, which `slice-anchor-contract.test.ts` requires and
      is not ceremony here: an inlined `lastIndexOf` that finds nothing returns -1, and
      `slice(-1, …)` silently yields a one-character window that every `toContain` below would fail
      on for the wrong reason.
    */
    const opens = body.lastIndexOf('<input', at);
    const closes = body.indexOf('>', at);
    expect(opens, 'the slider tag has no opening').toBeGreaterThan(-1);
    expect(closes, 'the slider tag is unterminated').toBeGreaterThan(at);
    return body.slice(opens, closes + 1);
  };

  it('emits audiovolslider, and emits it EMPTY', () => {
    const tag = sliderTag(html({ isPresenter: true, media: { soundCloudPlaying: true } }));
    expect(tag).toContain('audiovolslider=""');
  });

  it('and still carries the three captured values it always had', () => {
    /*
      The positive control. An assertion that only checks the new attribute passes just as well on a
      slider that has lost `title`, `class` or its range bounds — the rest of const 200.
    */
    const tag = sliderTag(html({ isPresenter: true, media: { soundCloudPlaying: true } }));
    expect(tag).toContain('title="Background Volume"');
    expect(tag).toContain('class="px-0 py-2"');
    expect(tag).toContain('type="range"');
  });
});

describe('NAV-07 — the launching spinners are nav-links', () => {
  const spinner = 'class="nav-link"><i class="fas fa-2x fa-spinner fa-spin">';

  it('the microphone spinner', () => {
    expect(html({ isPresenter: true, media: { micLaunching: true } })).toContain(spinner);
  });

  it('the webcam spinner', () => {
    expect(html({ isPresenter: true, media: { camLaunching: true } })).toContain(spinner);
  });

  it('and neither is rendered when nothing is launching — the control', () => {
    /*
      Both markers are the same string, so a render that showed one when it should show none would
      satisfy the two assertions above. This is what says the gates are still the gates.
    */
    expect(html({ isPresenter: true })).not.toContain(spinner);
  });
});
