import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import PresentationArea from './components/PresentationArea.svelte';

/*
  THE MAIN TAB STRIP — and the distinction between a tab that is ABSENT and a tab that is HIDDEN.

  ## The gap this closes, measured rather than assumed

  Every trade-alert PANE re-applies its own entitlement, and `swing-alerts-contract.test.ts` /
  `day-trade-alerts-contract.test.ts` render them to prove a false entitlement produces nothing.
  `PresentationArea` even records why that duplication exists: *"The pane re-applies the gate itself,
  which is not redundancy for its own sake: it is what lets the contract test prove the component
  renders nothing on a false entitlement without standing up this whole page."*

  So the PANE half is covered by design. The TAB half was covered by nothing — a search across every
  test file for `swingAlerts-tab`, `dayTradeAlerts-tab`, `videoplayer-tab` or the gate expressions
  returned zero hits. Delete `{#if swingAlerts.enabled}` from the `<li>` and leave it on the pane,
  and a room that never bought Swing Alerts shows a tab that opens an empty panel. Nothing in the
  suite would have said so.

  ## Why the two mechanisms are not interchangeable, which is the real subject

  The capture uses BOTH, deliberately, and the component transcribes both:

  * `{#if}` for ENTITLEMENTS — `O(26, o.hasSwingTradeAlerts ? 26 : -1)`, where `-1` is
    `ɵɵconditional`'s "instantiate nothing". The component's own note: *"An entitlement that ships
    hidden markup has already told the member the feature exists, and this one is what a room pays
    for."*
  * `hidden` for MODES and ROOM SETTINGS — `z('hidden', o.hideStreams)` on the streams `li`,
    `z('hidden', o.hideFiles)` on the files `li`, and `z('hidden', viewerOnlyMode)` on the whole
    `ul#mainTabs`. These are not entitlements; the feature exists and this viewer is simply not
    being shown it right now.

  A source-text assertion cannot tell those apart — both are a conditional next to an id. Only a
  render can, because one produces no element and the other produces an element carrying `hidden`.
  Swapping them is silent in every other instrument in this repository and is a real leak of what a
  room has paid for.

  ## SSR, not a mount

  The question is pure markup, and `{@attach}` never runs during SSR — which is what makes this
  affordable: no ResizeObserver, no media attachment, no jsdom. The nine other render tests in this
  repository use the same instrument for the same reason.
*/

type Stub = Record<string, unknown>;

/** The twelve facades, stubbed down to the members the tab strip and its panes actually read. */
const tradeAlerts = (enabled: boolean): Stub => ({
  enabled,
  log: [],
  months: 3,
  payload: () => ({}),
  submit: async () => undefined,
  changeMonths: () => undefined,
  requestImagePaste: async () => null,
  requestImageUpload: async () => null
});

const renderStrip = (over: {
  isPresenter?: boolean;
  viewerOnlyMode?: boolean;
  hideStreams?: boolean;
  filesHidden?: boolean;
  swingEnabled?: boolean;
  dayTradeEnabled?: boolean;
  hideVideoPlayer?: boolean;
}) => {
  const isPresenter = over.isPresenter ?? false;
  return render(PresentationArea, {
    props: {
      /*
        Grown one field at a time from what the render actually demanded, not from the type: the
        first draft omitted `files`, and `FilesPane` failed on `data.files.length`. A fixture
        assembled by guessing at a shape is how a render test ends up asserting against a component
        that never drew.
      */
      data: {
        notes: [],
        files: [],
        messages: [],
        alerts: [],
        sessionHandle: '3625',
        canEditNotes: false,
        notesEnabled: false,
        user: { id: 1, userXrefID: '1', email: 'a@b.test', displayName: 'A', emailHash: 'h' },
        sessData: { overlayUserIdOnScreenshare: false }
      },
      split: { presentationAreaStyle: '' },
      media: { soundCloudUrl: null, soundCloudPlaying: false, talking: [] },
      menus: { notes: false, files: false, toggle: () => undefined, set: () => undefined },
      mtx: { streams: [], selectedTabID: null, selectByUser: () => undefined },
      isPresenter,
      viewerOnlyMode: over.viewerOnlyMode ?? false,
      doNotDisturbOn: false,
      mainTab: 'screens',
      subtitles: false,
      currentCaption: null,
      captionHistory: [],
      speechRecoHistoryMode: false,
      archivesAvailable: false,
      openTranscriptPage: () => undefined,
      previewWindowsVisible: false,
      webcams: {
        card: () => () => undefined,
        attachLocal: () => undefined,
        attachRemote: () => () => undefined,
        closePreview: () => undefined
      },
      videoDisabled: false,
      screens: {
        selectedTab: null,
        forcedId: null,
        lockedId: null,
        detachedScreenId: null,
        pans: new Map(),
        zoomLevel: 2,
        showZoomCtrl: false,
        isFullScreenshare: false,
        selectTab: () => undefined,
        detach: () => undefined,
        toggleLock: () => undefined,
        bringEveryoneTo: () => undefined,
        stop: () => undefined,
        toggleZoomControls: () => undefined,
        zoomIn: () => undefined,
        zoomOut: () => undefined,
        resetZoom: () => undefined
      },
      mediaTransport: {
        screens: [],
        screenStreams: new Map(),
        webcamPresenters: [],
        saveData: false,
        applyScreenLayers: async () => undefined
      },
      volume: 50,
      screenVolume: undefined,
      hideStreams: over.hideStreams ?? false,
      streamServerMTX: '',
      mtxToken: '',
      selectStreamTabByUser: () => undefined,
      bringEveryoneToStream: () => undefined,
      toggleLockStreamMtx: () => undefined,
      noteGates: { surfaceVisible: false, editorMounted: false },
      giphyApiKey: '',
      notes: {
        newNoteOpen: false,
        mountNewNoteLink: () => undefined,
        mountUploadFileLink: () => undefined,
        submitMutation: async () => undefined,
        loadVersions: async () => []
      },
      uploadAlertFiles: async () => [],
      swingAlerts: tradeAlerts(over.swingEnabled ?? false),
      dayTradeAlerts: tradeAlerts(over.dayTradeEnabled ?? false),
      broadcasts: {
        hideVideoPlayer: over.hideVideoPlayer ?? false,
        videoPlayerUrl: '',
        scheduledVideoForAll: { videoURL: '', videoPlayTime: null },
        playVideoForAll: async () => undefined,
        scheduleVideoForAll: () => undefined,
        stopVideoForAll: async () => undefined,
        playMp3ForAll: async () => undefined,
        stopMp3ForAll: async () => undefined,
        youtubeForAllUrl: '',
        stopYoutubeForAll: async () => undefined,
        closeYoutubeFrame: () => undefined,
        mp3Playing: false,
        mp3Url: null
      },
      files: {
        filesHidden: over.filesHidden ?? false,
        fileTab: 'all',
        searchedFiles: () => [],
        matchesFileTab: () => true,
        countFiles: () => 0,
        fileSortTitle: () => '',
        search: () => undefined
      },
      openModal: () => undefined,
      setAutoplayAttribute: () => undefined
    } as never
  }).body;
};

/** The `<li>` wrapping a tab, so `hidden` can be read off the element the capture puts it on. */
const tabElement = (html: string, id: string): string | null => {
  const anchor = html.indexOf(`id="${id}"`);
  if (anchor === -1) return null;
  const open = html.lastIndexOf('<li', anchor);
  const close = html.indexOf('</li>', anchor);
  return open === -1 || close === -1 ? null : html.slice(open, close);
};

describe('an ENTITLEMENT that a room has not bought produces NO element', () => {
  it('renders the strip at all, so every absence assertion has something to be absent from', () => {
    // Asserted first. Every check below is `toBeNull`, and an empty render passes all of them.
    const html = renderStrip({ isPresenter: true, swingEnabled: true, dayTradeEnabled: true });
    expect(html, 'the tab strip must render').toContain('id="mainTabs"');
    expect(tabElement(html, 'screens-tab'), 'the always-present tab').not.toBeNull();
  });

  it('omits the Swing Alerts tab entirely — not hidden, ABSENT', () => {
    const off = renderStrip({ isPresenter: true, swingEnabled: false });
    expect(off, 'no swingAlerts tab id may appear').not.toContain('swingAlerts-tab');
    expect(off, 'and no pane either').not.toContain('id="swingAlerts"');

    // The positive control: with the entitlement, both exist.
    const on = renderStrip({ isPresenter: true, swingEnabled: true });
    expect(
      tabElement(on, 'swingAlerts-tab'),
      'the tab must exist when the room has it'
    ).not.toBeNull();
    expect(
      tabElement(on, 'swingAlerts-tab'),
      'and it must NOT be rendered-then-hidden, which would tell a member the feature exists'
    ).not.toContain('hidden');
  });

  it('omits the Day Trades tab entirely — not hidden, ABSENT', () => {
    const off = renderStrip({ isPresenter: true, dayTradeEnabled: false });
    expect(off).not.toContain('dayTradeAlerts-tab');
    expect(off).not.toContain('id="dayTradeAlerts"');

    const on = renderStrip({ isPresenter: true, dayTradeEnabled: true });
    expect(tabElement(on, 'dayTradeAlerts-tab')).not.toBeNull();
    expect(tabElement(on, 'dayTradeAlerts-tab')).not.toContain('hidden');
  });

  it('shows a member the VideoPlayer tab only while something is playing', () => {
    /*
      `O(25, o.hideVideoPlayer && !o.isP || o.isP ? 25 : -1)` — a presenter always has it, a member
      only while a video is playing for the room. Both halves, because the gate has been wrong in
      two different directions historically: once with no gate at all, once reduced to `isPresenter`.
    */
    expect(
      renderStrip({ isPresenter: false, hideVideoPlayer: false }),
      'an idle room gives a member no tab'
    ).not.toContain('videoplayer-tab');

    expect(
      tabElement(renderStrip({ isPresenter: false, hideVideoPlayer: true }), 'videoplayer-tab'),
      'a member gets it once a video is playing'
    ).not.toBeNull();

    expect(
      tabElement(renderStrip({ isPresenter: true, hideVideoPlayer: false }), 'videoplayer-tab'),
      'a presenter always has it'
    ).not.toBeNull();
  });
});

describe('a MODE or ROOM SETTING renders the element and marks it hidden', () => {
  /*
    The other half of the distinction, and the reason this file renders rather than reads source.
    Swapping either mechanism for the other is invisible to a substring assertion.
  */
  it('`hideStreams` HIDES the streams tab rather than removing it', () => {
    const html = renderStrip({ isPresenter: true, hideStreams: true });
    const tab = tabElement(html, 'streams-tab');

    expect(
      tab,
      'the element must still be in the document — the capture uses `hidden` here'
    ).not.toBeNull();
    expect(tab, 'carrying the hidden attribute').toContain('hidden');
  });

  it('and shows it without the attribute when the room has MediaMTX', () => {
    const tab = tabElement(renderStrip({ isPresenter: true, hideStreams: false }), 'streams-tab');
    expect(tab).not.toBeNull();
    expect(tab, 'no hidden attribute when the feature is on').not.toContain('hidden');
  });

  it('`filesHidden` HIDES the files tab rather than removing it', () => {
    /*
      Located by its pane target rather than by an id, because the files `<a>` carries no id in the
      captured markup. Recorded rather than worked around: inventing an id on the anchor to suit the
      instrument would be editing the capture to make a test easier.
    */
    const html = renderStrip({ isPresenter: true, filesHidden: true });
    const anchor = html.indexOf('data-bs-target="#files"');
    expect(anchor, 'the files tab must be rendered').toBeGreaterThan(-1);

    const li = html.slice(html.lastIndexOf('<li', anchor), anchor);
    expect(li, "and hidden by attribute, per z('hidden', o.hideFiles)").toContain('hidden');

    // And without the setting it carries no such attribute.
    const shown = renderStrip({ isPresenter: true, filesHidden: false });
    const shownAt = shown.indexOf('data-bs-target="#files"');
    expect(shownAt, 'the files tab must exist for this half to test anything').toBeGreaterThan(-1);
    expect(shown.slice(shown.lastIndexOf('<li', shownAt), shownAt)).not.toContain('hidden');
  });

  it('`viewerOnlyMode` hides the WHOLE strip by attribute, not by removing it', () => {
    const html = renderStrip({ isPresenter: false, viewerOnlyMode: true });
    /*
      Both bounds asserted found before the slice. `slice-anchor-contract.test.ts` caught the
      sibling of this line above — an unasserted `indexOf` returns -1, `slice(-1)` yields ONE
      CHARACTER, and every assertion after it runs against that character and passes.
    */
    const from = html.indexOf('<ul');
    const to = html.indexOf('</ul>');
    expect(from, 'the strip must open').toBeGreaterThan(-1);
    expect(to, 'and close').toBeGreaterThan(from);
    const strip = html.slice(from, to);

    expect(html, 'the ul is still rendered').toContain('id="mainTabs"');
    expect(strip, "and carries hidden — `z('hidden', viewerOnlyMode)`").toContain('hidden');
  });
});
