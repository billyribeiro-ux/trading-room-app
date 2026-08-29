// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { RoomGates } from './gates';

/*
  `viewerOnlyMode` reads `page.url` from `$app/state`, which is a SvelteKit-owned rune with no
  navigation behind it in a unit test. Mocked to a fixed URL, which is the honest thing to say about
  it: the reactivity this file proves is the CONSTRUCTOR THUNKS', and the query parameter is not one
  of them — it changes only on navigation, and `page` is already reactive on SvelteKit's side.
*/
vi.mock('$app/state', () => ({ page: { url: new URL('https://room.test/room/1') } }));
vi.mock('$app/env/public', () => ({ PUBLIC_PTR_TAWK_PROPERTY_ID: 'test-property' }));

/*
  SIXTEEN GETTERS, AND WHAT MAKES THEM REACTIVE IS NOT IN THEM.

  Every gate in this class reads a thunk the constructor was handed, so the whole module is exactly
  as reactive as those thunks and not one bit more. That is the failure this file exists to catch,
  and it is invisible to every other gate here: a caller who passes `session: () => data` gets a
  live room, and a caller who passes the VALUE — which type-checks the moment somebody "simplifies"
  the signature — gets a room rendered once against the first load and frozen there. No error, no
  warning, no failing assertion anywhere in 2,300 of them.

  It is also the reason the sixteen are getters rather than `$derived` class fields, which is stated
  in the module and executed here: a derived field initialises in DECLARATION ORDER, before the
  constructor assigns the thunks it reads, so it would evaluate against `undefined` once and cache
  that. `RoomFiles.filesHidden` is where that was first paid for.

  `room-mtx.svelte.test.ts`'s shape, for the reason that file records: mutations and `flushSync`
  INSIDE `$effect.root`, the expectation OUTSIDE it, because an assertion thrown inside the root is
  swallowed and reports as a pass. That file's draft 2 passed with a deliberately false
  `toEqual([99999])` in it.

  ONE assertion per independently reactive source, because they are independent: the loaded session,
  the presenter decision, the roster shapes, the detach flag and the recording name arrive from five
  different owners, and a wiring that made one live while leaving another stale would pass a single
  test and still draw the wrong room.
*/

/** Read inside an effect root, mutate inside it, assert on the result outside. */
const observe = <T>(read: () => T, mutate: () => void): T[] => {
  const seen: T[] = [];
  const stop = $effect.root(() => {
    $effect(() => {
      seen.push(read());
    });
    flushSync();
    mutate();
    flushSync();
  });
  stop();
  return seen;
};

const ROSTER_VIEWER = {
  isPresenter: false,
  email: 'member@room.test',
  userXrefID: 'x1',
  hasAdminChat: false,
  isLimitedPresenter: false,
  denyArchivesAccess: false
};

/**
 * The five mutable sources the page feeds this class, as a class because a rune cannot be a property
 * of an object literal — `$state.raw(…)` is only legal as a variable initialiser or a class field.
 *
 * `$state.raw` on the two payloads because that is how the page holds them: `data` is REPLACED
 * wholesale by every `invalidateAll()` and never mutated in place, so a deep proxy would cost a
 * proxy per key of a 268-field payload for no benefit. It also keeps the test honest — with a deep
 * `$state` a mutation the real page never performs would be enough to pass.
 */
class Sources {
  session = $state.raw({
    sessData: { presenterMsgsOnTheRight: false, recordingReminder: false },
    user: { isFT: false },
    streamRead: null
  } as never);
  isPresenter = $state(false);
  rosterSession = $state.raw({ rosterVisibleToViewers: false } as never);
  detached = $state(false);
  recordingName = $state('');
}

/** The class under test, wired to those five the way `+page.svelte` wires it. */
const gatesOver = (state: Sources) =>
  new RoomGates({
    media: {
      get roomRecordingName() {
        return state.recordingName;
      }
    } as never,
    session: () => state.session,
    isPresenter: () => state.isPresenter,
    rosterViewer: () => ROSTER_VIEWER,
    rosterSession: () => state.rosterSession,
    chatAlertsDetached: () => state.detached
  });

const make = () => {
  const state = new Sources();
  return { gates: gatesOver(state), state };
};

describe('every gate is live against the source it was handed', () => {
  it('re-reads the session when the load replaces it', () => {
    const { gates, state } = make();
    const seen = observe(
      () => gates.presenterMessagesOnTheRight,
      () => {
        state.session = {
          sessData: { presenterMsgsOnTheRight: true },
          user: { isFT: false },
          streamRead: null
        } as never;
      }
    );
    expect(seen).toEqual([false, true]);
  });

  it('re-reads the presenter decision, which is the server’s and arrives separately', () => {
    /*
      `showPmButton` is the subject because it is a gate on a CONTROL rather than on chrome: with a
      stale `false` the private-chat button never appears for somebody the server made a presenter
      mid-session. The authority is still the page's — this asks the thunk, it does not decide.
    */
    const { gates, state } = make();
    const seen = observe(
      () => gates.showPmButton,
      () => {
        state.isPresenter = true;
      }
    );
    expect(seen).toEqual([false, true]);
  });

  it('re-reads the roster shapes, which the page assembles per render', () => {
    const { gates, state } = make();
    const seen = observe(
      () => gates.rosterVisible,
      () => {
        state.rosterSession = { rosterVisibleToViewers: true } as never;
      }
    );
    expect(seen).toEqual([false, true]);
  });

  it('re-reads the detach flag, which is the third writer of hideChatAlerts', () => {
    const { gates, state } = make();
    const seen = observe(
      () => gates.hideChatAlerts,
      () => {
        state.detached = true;
      }
    );
    expect(seen).toEqual([false, true]);
  });

  it('re-reads the recording name, which lives on RoomMedia and not here', () => {
    /*
      The one gate that reads a COLLABORATOR's rune rather than a thunk, and it is the same question
      asked of a different shape: `recordingTooltip` is a getter over `media.roomRecordingName`, so
      the tooltip follows the room's recording only if that read stays a signal read.
    */
    const { gates, state } = make();
    const seen = observe(
      () => gates.recordingTooltip,
      () => {
        state.recordingName = 'session-42';
      }
    );
    expect(seen).toEqual(['', 'Recording to: session-42']);
  });
});

describe('the gates themselves answer what the reference says they answer', () => {
  it('hideChatAlerts is one flag with three modelled writers, not three branches', () => {
    const { gates, state } = make();
    expect(gates.hideChatAlerts).toBe(false);
    // The ROOM SETTING alone — the writer that had nowhere to be read before this module existed.
    state.session = {
      sessData: { hideChatAlerts: true },
      user: { isFT: false },
      streamRead: null
    } as never;
    expect(gates.hideChatAlerts).toBe(true);
  });

  it('benzingaVisible needs BOTH the room flag and a URL, so a blank link cannot render', () => {
    const { gates, state } = make();
    state.session = {
      sessData: { hasBenzingaNews: true },
      user: { isFT: false },
      streamRead: null
    } as never;
    // The room says it has the feed; without `altBenzingaLinkURL` there is no link to point at.
    expect(gates.benzingaUrl).toBe(null);
    expect(gates.benzingaVisible).toBe(false);

    state.session = {
      sessData: { hasBenzingaNews: true, altBenzingaLinkURL: '  https://bz.test/x  ' },
      user: { isFT: false },
      streamRead: null
    } as never;
    expect(gates.benzingaUrl).toBe('https://bz.test/x');
    expect(gates.benzingaVisible).toBe(true);
  });

  it('mobileAppAvailable refuses a free trial unless the room lets trials have the app', () => {
    const { gates, state } = make();
    const sessData = { ptrMobileAppEnabled: true };
    state.session = { sessData, user: { isFT: false }, streamRead: null } as never;
    expect(gates.mobileAppAvailable).toBe(true);
    state.session = { sessData, user: { isFT: true }, streamRead: null } as never;
    expect(gates.mobileAppAvailable).toBe(false);
    state.session = {
      sessData: { ...sessData, freeTrialsGetApp: true },
      user: { isFT: true },
      streamRead: null
    } as never;
    expect(gates.mobileAppAvailable).toBe(true);
  });

  /*
    THE SETTING IS READ OFF `sessData`, and that is the whole point of this test since 2026-08-28.

    ## The post-mortem, kept here because this is the test that could not have caught it

    `dontShowRecInfoToUsers` is a ROOM setting — `(sessData.dontShowRecInfoToUsers && !isPresenter)
    || !roomState.recName` blanks the tooltip, bundle byte 2,474,213, and `RoomNavbar.svelte:305`
    has carried that transcription in a comment since it was written. `RoomGates.recordingTooltip`
    implemented exactly that shape against `prefs.loaded.dontShowRecInfoToUsers`: a per-VIEWER
    preference key that nothing in this room has ever written.

    So the value was `undefined` in every room, the owner switch did nothing, and every member saw
    the recording FILE NAME — the one thing the setting exists to hide.

    **Every gate in this repository passed over it.** It compiled. `svelte-check` was clean. The
    docblock beside it explained, wrongly, that the setting *"is not captured in our session data"*.
    And THIS TEST passed, because the helper handed the flag in through `prefs.loaded` — the same
    wrong source the code read. A test that supplies the code's own mistake is not a test of the
    rule; it is a mirror. That is the failure mode to watch for here, and it is why the helper no
    longer takes the flag at all: the only way to set it now is on the session, where it lives.

    It was found by `gate/audit-setting-coverage.mjs`, which asks the pinned bundle which settings
    the reference reads that this room does not. Nothing else could have: a room setting implemented
    against a preference looks identical to a working one from every direction except that one.
  */
  it('recordingTooltip is suppressed for a member when the ROOM says to hide it', () => {
    const { gates, state } = make();
    state.session = {
      sessData: { dontShowRecInfoToUsers: true },
      user: { isFT: false },
      streamRead: null
    } as never;
    state.recordingName = 'session-42';
    expect(gates.recordingTooltip).toBe('');
    state.isPresenter = true;
    expect(gates.recordingTooltip).toBe('Recording to: session-42');
  });

  /* The negative control's positive twin: with the room setting OFF, a member sees the name. */
  it('leaves the tooltip alone for a member when the room does not hide it', () => {
    const { gates, state } = make();
    state.recordingName = 'session-42';
    expect(gates.recordingTooltip).toBe('Recording to: session-42');
  });

  /*
    THE CAPTIONS ENTITLEMENT, and the negation that decides the default.

    `globals.hasSpeechRecognition = !sessData.hasSpeechRecognitionDisabled && !0` (byte 1,147,900).
    Absent means NOT disabled, so a room that has never configured captions has them — and the
    `!== true` below is what makes that true for the `undefined` an omitted setting produces.

    The consumer is `RoomRecording.beginSpeechRecognition`, whose docblock quoted the capture's
    "disabled by preferences or session settings" while gating on preferences alone. An owner who
    turned captions off got them anyway, from every presenter, for everybody.
  */
  it('speechRecognitionAvailable is ON unless the room disabled it', () => {
    const { gates, state } = make();
    expect(gates.speechRecognitionAvailable, 'an unset setting must leave captions on').toBe(true);

    state.session = {
      sessData: { hasSpeechRecognitionDisabled: true },
      user: { isFT: false },
      streamRead: null
    } as never;
    expect(gates.speechRecognitionAvailable).toBe(false);
  });

  it('treats a truthy-but-not-true setting as NOT disabling captions', () => {
    // `=== true` everywhere else on this class, and the negation makes it `!== true` here. A string
    // off the wire must not switch a feature off any more than it may switch one on.
    const { gates, state } = make();
    state.session = {
      sessData: { hasSpeechRecognitionDisabled: 'yes' },
      user: { isFT: false },
      streamRead: null
    } as never;
    expect(gates.speechRecognitionAvailable).toBe(true);
  });

  it('tawkAvailable needs the presenter, the room setting AND a configured property id', () => {
    const { gates, state } = make();
    state.session = {
      sessData: { tawkPresenterSupport: true },
      user: { isFT: false },
      streamRead: null
    } as never;
    expect(gates.tawkAvailable).toBe(false);
    state.isPresenter = true;
    expect(gates.tawkAvailable).toBe(true);
  });
});
