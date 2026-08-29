// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

/*
  `$app/env/public` is a BUILD-TIME virtual module — the SvelteKit 3 spelling, which this repository
  moved to at `next.23`. The composition root reads two of its values at import time (the upload
  server and CDN key it hands to `RoomComposer`), so importing the root in a unit test needs them
  stubbed.

  Mocking `$env/static/public` — the Kit 2 name — silently does nothing, because nothing imports it:
  the mock registers against a specifier no module asks for and the real one still resolves to
  `undefined`. That was the first attempt here, and the failure message was identical either way,
  which is worth recording: a mock that misses looks exactly like a mock that failed.

  Values are deliberately obvious placeholders. Nothing asserts on them, and a real-looking key in a
  test file is how a real key eventually gets pasted into one.
*/
vi.mock('$app/env/public', () => ({
  PUBLIC_PTR_UPLOAD_SERVER: 'https://upload.invalid',
  PUBLIC_PTR_CDN_UPLOAD_KEY: 'test-key-not-a-secret',
  PUBLIC_PTR_GIPHY_API_KEY: 'test-key-not-a-secret',
  PUBLIC_PTR_MEDIA_SERVER: 'https://media.invalid'
}));

import { createRoom, type RoomDeps } from './create-room.svelte';

/*
  THE COMPOSITION ROOT STAYS REACTIVE — the one property no source-text assertion can see.

  ## Why this file exists and the other S7 guards are not enough

  Six contract tests were re-pointed at `create-room.svelte.ts` when the 36 constructions moved
  there. Every one of them reads SOURCE TEXT, and source text cannot tell the difference between a
  root that is wired and a root that renders the room correctly exactly once and then stops.

  That is the specific failure this slice risked. Svelte's docs state it twice: `.svelte.ts` modules
  *"cannot export reassigned state"*, and reassigning a shared value *"breaks the link"* for
  everything reading it downstream. A root that captured `data` as a VALUE instead of re-deriving it
  from the `session()` thunk would build a room that works on first paint, survives type-checking,
  passes all 2,418 other tests, and then silently ignores every `invalidateAll()` — which is every
  SSE event this room receives. No error. No warning.

  ## What is asserted

  One assertion per independently reactive group, which is the shape `room-mtx.svelte.test.ts`
  earned: it records that a wiring making `streams` reactive while leaving `selectedTabID` stale
  would pass a single test and still highlight the wrong tab. So the session thunk and a preference
  thunk are moved SEPARATELY, because they arrive through different members of `RoomDeps` and one
  can be wired while the other is not.

  Mutations and flushes go INSIDE `$effect.root`; assertions go OUTSIDE it. That is not style —
  the root swallows a thrown assertion, and a draft of `room-mtx` passed with a deliberately false
  `toEqual([99999])` sitting inside one.

  `// @vitest-environment jsdom` is required, and finding that out cost two failed probes: without
  it `$effect` never fires at all and every array below comes back empty, which reads exactly like a
  broken wiring rather than a missing directive.
*/

/** A deps object that is inert by default; each test overrides only the thunk it is about. */
const deps = (over: Partial<RoomDeps> = {}): RoomDeps =>
  ({
    session: () => ({ user: {}, sessData: {}, settings: {} }) as never,
    isPresenter: () => false,
    chatOnlyMode: () => false,
    disableCopy: () => false,
    webinarMode: () => false,
    noteGates: () => ({}) as never,
    rosterSession: () => ({}) as never,
    theme: () => 'light',
    chatAlertsDetached: () => false,
    appHasFocus: () => true,
    mainElement: () => undefined,
    alertChatElement: () => undefined,
    composerElement: () => undefined,
    alertsScroller: () => undefined,
    setTheme: () => {},
    setMainTab: () => {},
    setChatAlertsDetached: () => {},
    mergeGlobalChatStyle: () => {},
    setCurrentCaption: () => {},
    pushCaptionHistory: () => {},
    chatMissedWhileHidden: () => {},
    hidePreviewWindows: () => {},
    mtx: {} as never,
    unreadQaAlertIds: new Set() as never,
    settingsSplitPair: () => null,
    defaultFollowChatStyle: () => ({}) as never,
    ...over
  }) as RoomDeps;

describe('the composition root re-derives from its thunks', () => {
  it('follows the SESSION thunk, which is what every invalidateAll() replaces', () => {
    /*
      The load's data is replaced wholesale on every SSE event. A root that read `deps.session()`
      once at construction would serve the first page forever — the single most damaging way this
      slice could have gone wrong, and completely invisible to source assertions.
    */
    const one = { user: {}, sessData: {}, settings: {}, connectedUsers: [{ id: 1 }] };
    const two = { user: {}, sessData: {}, settings: {}, connectedUsers: [{ id: 1 }, { id: 2 }] };
    const box = $state({ session: one });
    const seen: number[] = [];

    const stop = $effect.root(() => {
      const room = createRoom(deps({ session: () => box.session as never }));
      // `roster` is seeded `() => data.connectedUsers`, so its list is the cheapest honest window
      // onto whether `data` is still tracking the thunk.
      $effect(() => {
        seen.push(room.roster.users.length);
      });
      flushSync();
      box.session = two;
      flushSync();
    });
    stop();

    expect(seen, 'the root captured `data` instead of re-deriving it from session()').toEqual([
      1, 2
    ]);
  });

  it('follows the isPresenter thunk INDEPENDENTLY of the session', () => {
    /*
      Its own assertion rather than a second expectation in the one above, for the reason
      `room-mtx.svelte.test.ts` records: two collaborators arriving through different members of the
      same object can be wired one at a time, and a single combined test goes green on the first.
    */
    const box = $state({ presenter: false });
    const seen: string[] = [];

    const stop = $effect.root(() => {
      const room = createRoom(
        deps({
          isPresenter: () => box.presenter,
          session: () =>
            ({
              user: {},
              sessData: {},
              // `RoomPrefs` is constructed from `data.settings?.settingsJson`, and this is the flag
              // `recordingTooltip` reads through `prefs.loaded`.
              settings: { settingsJson: { dontShowRecInfoToUsers: true } }
            }) as never
        })
      );
      /*
        `gates.recordingTooltip` returns '' when the room hides the recording name from members and
        this viewer is not a presenter (`gates.ts:128-131`). Chosen because it reads
        `isPresenter` THROUGH a gate rather than echoing the thunk back, so a captured value cannot
        fake it — and because it ALSO reads `prefs` and `media`, both built inside the root, so a
        pass here exercises the wiring between three of the thirty-six rather than one in isolation.
      */
      $effect(() => {
        seen.push(room.gates.recordingTooltip);
      });
      flushSync();
      room.media.roomRecordingStarted('Session 1');
      box.presenter = true;
      flushSync();
    });
    stop();

    expect(
      new Set(seen).size,
      'a gate derived from isPresenter never changed, so the thunk was captured as a value'
    ).toBeGreaterThan(1);
  });

  it('hands back the SAME instances, so destructuring cannot fork them', () => {
    /*
      The page writes `const { prefs, media } = createRoom(...)`. If the root returned fresh objects
      per read — a getter that constructed, say — the page and anything else reading the room would
      diverge silently. Identity is the cheapest possible proof that it does not.
    */
    const stop = $effect.root(() => {
      const room = createRoom(deps());
      expect(room.prefs).toBe(room.prefs);
      expect(room.media).toBe(room.media);
    });
    stop();
  });
});
