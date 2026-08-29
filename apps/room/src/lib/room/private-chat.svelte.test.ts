// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoomDialogs } from './dialogs.svelte';
import {
  type PrivateChatMessage,
  type PrivateChatSession,
  RoomPrivateChat
} from './private-chat.svelte';

/*
  The private-chat panel, EXECUTED.

  `private-chat-remote-contract.test.ts` reads both halves as source and proves the server publishes
  twice while the client inserts nothing locally. What it cannot do is run the ingest, and the rules
  that only exist at runtime are the ones the capture is specific about:

  - bucket by PEER id, never by direction, so both halves of a conversation land in one array;
  - the re-entrancy guard, because the sender gets an echo AND may already hold the row;
  - unread bumps only for somebody else's message, and only when their tab is not the open one.

  Each is a test below with a negative control that was watched go red.
*/

type User = { id: number; isP: boolean; hasAdminChat: boolean };

const message = (over: Partial<PrivateChatMessage> = {}): PrivateChatMessage => ({
  _id: 'm1',
  t: 1_000,
  n: 'Ada',
  txt: 'hello',
  uid: 2,
  recvdID: 1,
  avt: '',
  pic: '',
  isA: false,
  ...over
});

const make = (
  options: {
    session?: Partial<PrivateChatSession>;
    viewerOnly?: boolean;
    isPresenter?: boolean;
    sendFails?: boolean;
  } = {}
) => {
  const dialogs = new RoomDialogs();
  const sounds: string[] = [];
  const cleared: number[] = [];
  const loaded: unknown[] = [];
  const sent: unknown[] = [];
  const deleted: unknown[] = [];
  const selected: User[] = [];
  let menuClosed = 0;
  let invalidated = 0;
  let incoming: PrivateChatMessage[] = [];

  const chat = new RoomPrivateChat<User>({
    dialogs,
    prefs: { doNotDisturbOn: false, chatSoundOn: true },
    commands: {
      loadLog: (payload) => (loaded.push(payload), Promise.resolve(incoming)),
      loadPeerHistory: () => Promise.resolve({ nick: '', messages: [], truncated: false }),
      send: (payload) =>
        options.sendFails
          ? Promise.reject(new Error('refused'))
          : (sent.push(payload), Promise.resolve(null)),
      deleteLog: (payload) => (deleted.push(payload), Promise.resolve(null))
    },
    session: () => ({ user: { id: 1 }, sessData: {}, privateChats: [], ...options.session }),
    isPresenter: () => options.isPresenter ?? false,
    viewerOnlyMode: () => options.viewerOnly ?? false,
    playSound: (name) => sounds.push(name),
    closeUserMenu: () => (menuClosed += 1),
    selectRosterUser: (user) => selected.push(user),
    onCleared: () => cleared.push(1),
    onThreadDeleted: () => ((invalidated += 1), Promise.resolve())
  });

  return {
    chat,
    dialogs,
    sounds,
    cleared,
    loaded,
    sent,
    deleted,
    selected,
    setIncoming: (rows: PrivateChatMessage[]) => (incoming = rows),
    menuClosed: () => menuClosed,
    invalidated: () => invalidated
  };
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('one frame off the private channel', () => {
  it('buckets by PEER id whichever direction it travelled', () => {
    /*
      `isMine = te.uid == myUserID; peer = isMine ? te.recvdID : te.uid`. Our own outgoing echo and
      their reply both belong to the SAME thread, and getting this wrong splits a conversation in
      two without any error.
    */
    const { chat } = make();
    chat.ingest(message({ _id: 'a', uid: 2, recvdID: 1 })); // theirs
    chat.ingest(message({ _id: 'b', uid: 1, recvdID: 2 })); // our echo
    void chat.switchToUser(2);
    expect(chat.log.map((m) => m._id)).toEqual(['a', 'b']);
  });

  it('refuses a duplicate, because the sender gets an echo AND may hold the row already', () => {
    const { chat } = make();
    chat.ingest(message({ _id: 'a' }));
    chat.ingest(message({ _id: 'a' }));
    void chat.switchToUser(2);
    expect(chat.log, 'two copies of one message is worse than none').toHaveLength(1);
  });

  it('bumps unread only for THEIR message, and only when their tab is not open', () => {
    const { chat } = make();
    chat.ingest(message({ _id: 'a', uid: 2, recvdID: 1 }));
    expect(chat.tabs.find((tab) => tab.uid === 2)?.unread).toBe(1);

    // Our own echo must not make our own conversation look unread.
    chat.ingest(message({ _id: 'b', uid: 1, recvdID: 2 }));
    expect(chat.tabs.find((tab) => tab.uid === 2)?.unread).toBe(1);
  });

  it('rings once for their message and never for ours', () => {
    const { chat, sounds } = make();
    chat.ingest(message({ _id: 'a', uid: 2, recvdID: 1 }));
    chat.ingest(message({ _id: 'b', uid: 1, recvdID: 2 }));
    expect(sounds).toEqual(['pling']);
  });
});

describe('the tab strip', () => {
  it('merges the load with conversations started since, most recent LAST', () => {
    /*
      `newMessage()` splices a tab out and pushes it, so the most recently active sits at the end.
      The strip is a pure function of the load plus local deltas — deliberately not a writable
      `$derived`, because overriding one survives only until `data` changes and every
      `invalidateAll()` silently reset every unread count to zero.
    */
    const { chat } = make({
      session: {
        privateChats: [
          { name: 'Ada', uid: 2, avt: '', pic: '', unread: 0, isA: false, online: false },
          { name: 'Bo', uid: 3, avt: '', pic: '', unread: 0, isA: false, online: false }
        ]
      }
    });
    chat.ingest(message({ _id: 'a', uid: 3, recvdID: 1, t: 10 }));
    chat.ingest(message({ _id: 'b', uid: 2, recvdID: 1, t: 20 }));
    expect(chat.tabs.map((tab) => tab.uid)).toEqual([3, 2]);
  });

  it('draws a tab for a peer the load never mentioned', () => {
    const { chat } = make();
    chat.ingest(message({ _id: 'a', uid: 7, recvdID: 1, n: 'Cy' }));
    expect(chat.tabs.map((tab) => tab.name)).toEqual(['Cy']);
  });
});

describe('every public getter is reactive', () => {
  /*
    Mutations and flushes INSIDE `$effect.root`, assertions OUTSIDE it — the root swallows a thrown
    assertion, as `room-mtx.svelte.test.ts` records.
  */
  it('re-runs a reader when the panel opens', () => {
    const { chat } = make();
    const seen: boolean[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(chat.open));
      flushSync();
      chat.show();
      flushSync();
    });
    stop();
    expect(seen, 'the open getter is not reactive').toEqual([false, true]);
  });

  it('re-runs a reader when the thread changes', () => {
    const { chat } = make();
    const seen: (number | null)[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(chat.peerId));
      flushSync();
      void chat.switchToUser(4);
      flushSync();
    });
    stop();
    expect(seen, 'the peerId getter is not reactive').toEqual([null, 4]);
  });

  it('re-runs a reader when a message arrives', () => {
    const { chat } = make();
    const seen: number[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(chat.tabs.length));
      flushSync();
      chat.ingest(message({ _id: 'a', uid: 5, recvdID: 1 }));
      flushSync();
    });
    stop();
    expect(seen, 'the tabs getter is not reactive').toEqual([0, 1]);
  });

  it('re-runs a reader when the draft is written', () => {
    const { chat } = make();
    const seen: string[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(chat.draft));
      flushSync();
      chat.draft = 'hi';
      flushSync();
    });
    stop();
    expect(seen, 'the draft getter is not reactive').toEqual(['', 'hi']);
  });
});

describe('the refusals, which are the reference’s and not ours', () => {
  it('does NOT open the panel in viewer-only mode, and says nothing', () => {
    /*
      A leading `a || b || (…)` at `app-room.compiled.js:855-861`. Four call sites each set the flag
      on their own, so the guard has to live in one place or it is four places to forget it.
    */
    const { chat, dialogs } = make({ viewerOnly: true });
    chat.show();
    expect(chat.open).toBe(false);
    expect(dialogs.alert, 'the refusal is silent in the capture').toBeNull();
  });

  it('refuses a private chat with yourself, from the roster', () => {
    const { chat, dialogs, selected } = make();
    chat.openFromRoster({ id: 1, isP: false, hasAdminChat: false });
    expect(dialogs.alert).toContain('yourself');
    expect(chat.open, 'the panel must not open on an empty thread with yourself').toBe(false);
    expect(selected, 'and nobody is selected on the roster either').toEqual([]);
  });

  it('opens the panel and selects the row for anybody else', () => {
    const { chat, selected, menuClosed } = make();
    chat.openFromRoster({ id: 9, isP: false, hasAdminChat: false });
    expect(chat.open).toBe(true);
    expect(selected.map((user) => user.id)).toEqual([9]);
    expect(menuClosed(), 'the roster menu closes behind it').toBe(1);
  });

  it('asks `canShowRosterPrivateChat` rather than deciding for itself', () => {
    const off = make({ session: { sessData: { userPM: false } } });
    expect(off.chat.canOpenFor({ id: 9, isP: false, hasAdminChat: false })).toBe(false);
    const on = make({ session: { sessData: { userPM: true } } });
    expect(on.chat.canOpenFor({ id: 9, isP: false, hasAdminChat: false })).toBe(true);
  });
});

describe('sending, searching and closing', () => {
  it('sends nothing for an empty draft and nothing without a thread', async () => {
    const { chat, sent } = make();
    await chat.send();
    void chat.switchToUser(2);
    chat.draft = '   ';
    await chat.send();
    expect(sent).toEqual([]);
  });

  it('clears the draft on success and inserts nothing locally', async () => {
    /*
      The echo on `/privChat` is what appends it. Inserting here as well is how a sent message
      appears twice, which is the defect the re-entrancy guard above exists to catch.
    */
    const { chat, sent } = make();
    void chat.switchToUser(2);
    chat.draft = 'hello';
    await chat.send();
    expect(sent).toEqual([{ peerId: 2, body: 'hello' }]);
    expect(chat.draft).toBe('');
    expect(chat.log, 'the send must not append locally').toEqual([]);
  });

  it('keeps the draft when the server refuses, and shows why', async () => {
    const { chat, dialogs } = make({ sendFails: true });
    void chat.switchToUser(2);
    chat.draft = 'hello';
    await chat.send();
    expect(dialogs.alert).toBe('Message not sent.');
    expect(chat.draft, 'a refused send must not eat what was typed').toBe('hello');
  });

  it('clears unread when a thread is opened, and asks for page 0', async () => {
    const { chat, loaded } = make();
    chat.ingest(message({ _id: 'a', uid: 2, recvdID: 1 }));
    expect(chat.tabs.find((tab) => tab.uid === 2)?.unread).toBe(1);
    await chat.switchToUser(2);
    expect(chat.tabs.find((tab) => tab.uid === 2)?.unread).toBe(0);
    expect(loaded).toEqual([{ peerId: 2, page: 0, searchTerm: '' }]);
  });

  it('marks itself searching only while a term is in force', async () => {
    const { chat } = make();
    await chat.switchToUser(2);
    await chat.search('needle');
    expect(chat.searching).toBe(true);
    await chat.search('   ');
    expect(chat.searching, 'a blank term restores the thread rather than filtering it').toBe(false);
  });

  it('closing DESELECTS the thread rather than just hiding the panel', async () => {
    /*
      `closePanel()` sets `this.user = null; this.recvdUser = null; this.currUser = ''`. Hiding
      alone — which is all the X used to do — means reopening lands straight back in the last
      conversation, where the capture returns to "No active chat".
    */
    const { chat, cleared } = make();
    chat.show();
    await chat.switchToUser(2);
    chat.draft = 'half typed';
    chat.close();

    expect(chat.open).toBe(false);
    expect(chat.peerId, 'reopening must land on "No active chat"').toBeNull();
    expect(chat.draft).toBe('');
    expect(chat.searchTerm).toBe('');
    expect(cleared, 'the message-action path is told too').toEqual([1]);
  });

  it('deleting a thread asks first, then drops the tab', async () => {
    const { chat, dialogs, deleted, invalidated } = make();
    chat.ingest(message({ _id: 'a', uid: 2, recvdID: 1 }));
    await chat.switchToUser(2);
    chat.deleteThread();
    expect(dialogs.confirmation?.message).toContain('delete all messages');
    expect(deleted, 'nothing is deleted before anyone confirms').toEqual([]);

    await dialogs.confirmation?.onconfirm();
    expect(deleted).toEqual([{ peerId: 2 }]);
    expect(chat.peerId).toBeNull();
    expect(chat.tabs).toEqual([]);
    expect(invalidated()).toBe(1);
  });
});

describe('paging', () => {
  it('replaces on page 0 and prepends older history otherwise', async () => {
    const { chat, setIncoming } = make();
    setIncoming([message({ _id: 'new', t: 20 })]);
    await chat.switchToUser(2);
    expect(chat.log.map((m) => m._id)).toEqual(['new']);

    setIncoming([message({ _id: 'old', t: 10 })]);
    await chat.loadLog(2, 1);
    expect(
      chat.log.map((m) => m._id),
      'a later page is OLDER and belongs in front'
    ).toEqual(['old', 'new']);
  });

  it('leaves the held log alone when a load fails, rather than blanking the pane', async () => {
    const dialogs = new RoomDialogs();
    const chat = new RoomPrivateChat<User>({
      dialogs,
      prefs: { doNotDisturbOn: false, chatSoundOn: false },
      commands: {
        loadLog: () => Promise.reject(new Error('down')),
        loadPeerHistory: () => Promise.resolve({ nick: '', messages: [], truncated: false }),
        send: () => Promise.resolve(null),
        deleteLog: () => Promise.resolve(null)
      },
      session: () => ({ user: { id: 1 }, sessData: {}, privateChats: [] }),
      isPresenter: () => false,
      viewerOnlyMode: () => false,
      playSound: () => {},
      closeUserMenu: () => {},
      selectRosterUser: () => {},
      onCleared: () => {},
      onThreadDeleted: () => Promise.resolve()
    });
    chat.ingest(message({ _id: 'held', uid: 2, recvdID: 1 }));
    await chat.switchToUser(2);
    expect(
      chat.log.map((m) => m._id),
      'a failed load must not blank the thread'
    ).toEqual(['held']);
  });
});
