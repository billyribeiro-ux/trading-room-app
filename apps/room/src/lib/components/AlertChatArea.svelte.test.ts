// @vitest-environment jsdom
import { flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import AlertChatArea from './AlertChatArea.svelte';

/*
  THE TWO SCROLL-FOLLOW EFFECTS, EXECUTED — which was recorded as untestable and is not.

  ## Correcting the record, because the note was wrong and would have stopped the next person

  `AlertChatArea`'s follow behaviour was written down as blocked on an instrument limit: jsdom
  reports `scrollHeight` and `offsetHeight` as `0`, so anything reading a scroller's geometry was
  said to need a real browser.

  That is true of ONE function and it is not this one. `isRoomScrollerReadingHistory` reads geometry,
  and `feed-scroll-wiring-contract.test.ts` already covers it by defining those properties on a real
  element — so even that half was never actually blocked. These effects read no geometry at all:
  their decision is `alertsFollow.follows({ count, newestSenderId, viewerId, readingHistory })`, a
  pure function of counts, ids and a flag. Geometry appears only at the far end, inside
  `forceAlertsToBottom`, which is the collaborator being asserted rather than exercised.

  So the whole thing mounts and runs in jsdom. The "needs Playwright" note was pessimism, and
  removing it is worth more than the tests: a false instrument limit is how coverage stays missing
  for years, because nobody re-checks a gap that has been declared impossible.

  ## What is actually being pinned

  Four properties, each of which has been wrong in this room before:

  1. A message arriving while the reader is at the bottom pulls the feed down.
  2. A message arriving while the reader is UP THE LOG does not — that is the whole point of
     `readingHistory`, and dragging somebody off history they are reading is the defect
     `scroll-follow.ts` exists to prevent.
  3. The two columns are INDEPENDENT. One effect per feed, so an alert must not scroll the chat.
  4. The bottom-scroll is handed the scroller it decided about, via `tick()`, and only if that
     element is still the one on screen.
*/

const noop = () => undefined;

interface Call {
  readonly kind: string;
  readonly argument: unknown;
}

/** A `RoomFeedScroll` stand-in that records rather than scrolls. */
const recordingFeedScroll = (readingHistory: { alerts?: boolean; chat?: boolean } = {}) => {
  const calls: Call[] = [];
  return {
    calls,
    alertsReadingHistory: readingHistory.alerts ?? false,
    chatReadingHistory: readingHistory.chat ?? false,
    extraChatReadingHistory: false,
    stopReadingHistory: (feed: string) =>
      calls.push({ kind: `stopReadingHistory`, argument: feed }),
    forceAlertsToBottom: (node: unknown) =>
      calls.push({ kind: 'forceAlertsToBottom', argument: node }),
    forceChatToBottom: (node: unknown) => calls.push({ kind: 'forceChatToBottom', argument: node }),
    trackAlertsScroll: noop,
    trackChatScroll: noop
  };
};

const message = (id: number, senderId: number) => ({
  id,
  senderId,
  senderName: 'Someone',
  senderEmailHash: 'hash',
  body: `message ${id}`,
  createdAt: new Date(0)
});

const mounted: (() => void)[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()?.();
});

const render = (over: {
  feedScroll: ReturnType<typeof recordingFeedScroll>;
  alertsFollows?: boolean;
  chatFollows?: boolean;
  visibleAlerts?: unknown[];
  visibleChatMessages?: unknown[];
}) => {
  const props = $state({
    split: { alertChatAreaStyle: '', chatAreaStyle: '', alertsAreaStyle: '' },
    alerts: { search: '', filterSelected: false, toolbarOpen: false, searchOnly: false },
    // The overlay this pane renders from. `null` is the ordinary case — no image pinned —
    // and the dismiss receiver is never reached by these assertions.
    broadcasts: { salesImageUrl: null, salesImageDismissed: noop },
    chat: {
      tab: 'main',
      composer: '',
      focused: noop,
      search: { isOpen: () => false, term: () => '', setTerm: noop, toggle: noop, clear: noop }
    },
    polls: { minimized: false, active: null },
    menus: { messageId: null, openMessageMenu: noop, emoji: false, giphy: false, set: noop },
    isPresenter: false,
    doNotDisturbOn: false,
    pollIsActive: false,
    alertFilterConfigured: false,
    alertFilterActive: false,
    chatOnlyMode: false,
    webinarMode: false,
    chatEnabled: true,
    selfMutedUntil: null,
    canPostImages: false,
    canUseRTE: false,
    giphyApiKey: '',
    showMessageOptions: false,
    visibleAlerts: over.visibleAlerts ?? [],
    visibleChatMessages: over.visibleChatMessages ?? [],
    alertLabels: { alerts: 'Alerts', chat: 'Chat' },
    messageChrome: {
      currentUserId: 1,
      currentUserEmailHash: 'h',
      currentUserName: 'A',
      viewerIsPresenter: false,
      theme: 'dark',
      chatStyle: {},
      chatGif: true,
      chatBadges: true,
      enableBadges: false,
      showBadgesToPresentersOnly: false,
      disableStarYears: false,
      presenterMessagesOnTheRight: false,
      usersPublicReply: false,
      enableReactions: false,
      enableEditMessage: false,
      enableEditAlerts: false
    },
    followedUsers: {},
    captureAlertChatElement: noop,
    captureAlertsScroller: noop,
    captureComposerElement: noop,
    observeComposerWidth: noop,
    feedScroll: over.feedScroll,
    alertsFollow: { follows: () => over.alertsFollows ?? false },
    chatFollow: { follows: () => over.chatFollows ?? false },
    viewerId: 1,
    onopenmodal: noop,
    onopenpoll: noop,
    ontogglealertstoolbar: noop,
    ontogglealertssearch: noop,
    ondetachalerts: noop,
    onsavealerts: noop,
    onarchivealerts: noop,
    onmessageaction: noop,
    onprivatechat: noop,
    onchatsearch: noop,
    onexpandcomposer: noop,
    /* The typing indicator. Empty typists reads the same as nobody typing, which is the default. */
    ontyped: noop,
    onstoppedtyping: noop,
    typists: [],
    onsend: noop,
    onimageupload: noop,
    onrte: noop,
    onselectgif: noop,
    /*
        `chatTabs` was omitted here until 2026-08-30 and nothing noticed, because the only thing that
        read it was `<ChatTabStrip tabs={chatTabs}>` and `{#each undefined}` renders nothing. `acA-11`
        put `chatTabs.length` in the brand, which is not so forgiving — so this harness had been
        rendering a component in a state its own types forbid, and the gate is what said so.
      */
    /*
      FULL TABS since 2026-09-02, not names. The strip takes `{name, displayName, type}` — the shape
      the reference itself pushes — because `altGenChannelName` / `altOffTopicChannelName` let an
      owner rename the two built-ins, so a label stopped being derivable from a name.

      This harness caught the change loudly rather than silently, which is the note two lines above
      earning its place a second time: the keyed `{#each}` reported `duplicate key undefined` for
      two string entries, instead of rendering an empty strip nobody would have looked at.
    */
    chatTabs: [
      { name: 'main', displayName: 'Main Chat', type: 'r' as const },
      { name: 'off-topic', displayName: 'Off Topic', type: 'r' as const }
    ],
    onbeginsplit: noop
  });

  const target = document.createElement('div');
  document.body.append(target);
  const component = mount(AlertChatArea, { target, props: props as never });
  flushSync();
  mounted.push(() => {
    unmount(component);
    target.remove();
  });
  return { target, props: props as Record<string, unknown> };
};

/** The follow path finishes inside a `tick().then(...)`, so both queues have to drain. */
const settle = async () => {
  flushSync();
  await tick();
  await Promise.resolve();
};

describe('a feed follows its own newest message', () => {
  it('pulls the ALERTS log to the bottom when the reader is not in history', async () => {
    const feedScroll = recordingFeedScroll();
    const { props } = render({ feedScroll, alertsFollows: true });

    /*
      CLEARED AFTER MOUNT, and that is not tidiness. The effect also runs on the initial render, so
      without this the assertion below would pass on the mount and prove nothing about an arriving
      message — a green that says "this component rendered once" while the reactive path is dead.
    */
    await settle();
    feedScroll.calls.length = 0;

    props.visibleAlerts = [message(1, 9)];
    await settle();

    const scrolled = feedScroll.calls.find((call) => call.kind === 'forceAlertsToBottom');
    expect(scrolled, 'an arriving alert must pull the log down').toBeDefined();
    expect(
      scrolled?.argument,
      'and it is handed the SCROLLER element, not a selector or an id'
    ).toBeInstanceOf(HTMLElement);
    expect(
      feedScroll.calls.some((call) => call.argument === 'alerts'),
      'reading-history is cleared BECAUSE we are about to scroll — one act, not two'
    ).toBe(true);
  });

  it('does NOT pull it when the reader is up the log', async () => {
    /*
      The property `scroll-follow.ts` exists for: *"you are not dragged away from history you are
      reading"*. Driven through `follows()` returning false, which is what `readingHistory` makes it
      do — the decision is asserted in `scroll-follow`'s own tests; what is asserted here is that
      this component OBEYS it.
    */
    const reading = recordingFeedScroll({ alerts: true });
    const held = render({ feedScroll: reading, alertsFollows: false });
    await settle();
    reading.calls.length = 0;
    held.props.visibleAlerts = [message(1, 9)];
    await settle();

    /*
      Asserted as a DIFFERENCE against the identical run with `follows()` true, because a bare
      `toEqual([])` cannot tell "correctly declined to scroll" from "the effect never ran". The
      second mount is the proof that this fixture does produce a scroll when it should.
    */
    const following = recordingFeedScroll();
    const pulled = render({ feedScroll: following, alertsFollows: true });
    await settle();
    following.calls.length = 0;
    pulled.props.visibleAlerts = [message(1, 9)];
    await settle();

    expect(
      following.calls.filter((call) => call.kind === 'forceAlertsToBottom').length,
      'the control arm must scroll, or the assertion below is vacuous'
    ).toBe(1);
    expect(
      reading.calls.filter((call) => call.kind === 'forceAlertsToBottom'),
      'a reader in history is left where they are'
    ).toEqual([]);
  });

  it('pulls the CHAT column to the bottom, independently', async () => {
    const feedScroll = recordingFeedScroll();
    const { props } = render({ feedScroll, chatFollows: true });

    props.visibleChatMessages = [message(1, 9)];
    await settle();

    expect(feedScroll.calls.some((call) => call.kind === 'forceChatToBottom')).toBe(true);
  });
});

describe('the two columns do not scroll each other', () => {
  it('an ALERT arriving leaves the chat column alone', async () => {
    /*
      One effect per feed, which is the reason given in the component: *"one effect reading both
      would re-run each feed's scroll logic whenever the other changed — 'a message arrived
      anywhere' instead of 'a message arrived here'."* Both `follows()` return TRUE here, so the
      only thing that can keep the chat still is the effects being genuinely separate.
    */
    const feedScroll = recordingFeedScroll();
    const { props } = render({ feedScroll, alertsFollows: true, chatFollows: true });
    await settle();
    feedScroll.calls.length = 0;

    props.visibleAlerts = [message(1, 9)];
    await settle();

    expect(
      feedScroll.calls.map((call) => call.kind).filter((kind) => kind.startsWith('force')),
      'only the alerts log may move'
    ).toEqual(['forceAlertsToBottom']);
  });

  it('a CHAT message arriving leaves the alerts log alone', async () => {
    const feedScroll = recordingFeedScroll();
    const { props } = render({ feedScroll, alertsFollows: true, chatFollows: true });
    await settle();
    feedScroll.calls.length = 0;

    props.visibleChatMessages = [message(2, 9)];
    await settle();

    expect(
      feedScroll.calls.map((call) => call.kind).filter((kind) => kind.startsWith('force')),
      'only the chat column may move'
    ).toEqual(['forceChatToBottom']);
  });
});
