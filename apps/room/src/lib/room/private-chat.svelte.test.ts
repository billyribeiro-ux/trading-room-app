// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoomDialogs } from './dialogs.svelte';
import { TITLE_FLASH_MS } from './private-chat-title-flash';
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
    /** Who the roster says is connected — `checkUserOnlineStatus`'s input. */
    onlineIds?: readonly number[];
    /** `preferences.chatPopup` — whether an incoming message raises a toast. */
    chatPopup?: boolean;
    /** `canPost` — the room's answer to whether this member may post at all (G13). */
    canPost?: boolean;
    /** Whether the private composer has focus — G27's other gate. */
    composerHasFocus?: boolean;
    /** What the injected uploader hands back, so `completeImageUpload` can be executed. */
    uploadUrls?: readonly string[];
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
  const onlineIds = new Set<number>(options.onlineIds ?? []);
  const notified: { title: string; body: string; icon: string; emailHash: string }[] = [];
  const uploaded: File[] = [];
  const uploadUrls = options.uploadUrls ?? ['/uploads/one.png'];

  const chat = new RoomPrivateChat<User>({
    dialogs,
    prefs: {
      doNotDisturbOn: false,
      chatSoundOn: true,
      chatPopup: options.chatPopup ?? false,
      pmLogsOnRight: false
    },
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
    /* Nobody on the roster unless a test says otherwise — see the online-status case. */
    onlineUserIds: () => onlineIds,
    notify: (title, body, icon, emailHash) => notified.push({ title, body, icon, emailHash }),
    canPost: () => options.canPost ?? true,
    roomName: () => 'Test Room',
    composerHasFocus: () => options.composerHasFocus ?? false,
    uploadImages: (files) => (uploaded.push(...files), Promise.resolve(uploadUrls)),
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
    notified,
    uploaded,
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
      prefs: { doNotDisturbOn: false, chatSoundOn: false, chatPopup: false, pmLogsOnRight: false },
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
      onlineUserIds: () => new Set<number>(),
      notify: () => {},
      canPost: () => true,
      roomName: () => 'Test Room',
      composerHasFocus: () => false,
      uploadImages: () => Promise.resolve([]),
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

/**
 * Six rows of the `PrivateChatPanel` surface audit, executed against the class rather than read.
 *
 * G5 and G7 are not here: G5 is a class on a `<div>` and belongs to the panel's own contract, and
 * G7 is a REFUSAL — `getAllPCLogsLoading` is not modelled, because this room resolves the
 * conversation list at page load and both of the reference's loading branches would be branches that
 * can never render. The paragraph in `private-chat.svelte.ts` is that row's answer.
 */
describe('the six that behave', () => {
  it('G12 — raises a toast for a message arriving on ANOTHER conversation', () => {
    /*
      `alertService.info(e.txt, "Message from " + e.n)` plus `new Notification(...)` at byte
      2,205,900. Only the sound fired here, so a member with the panel closed had no way to learn a
      private message had arrived — the one thing a private message needs to do.
    */
    const harness = make({ chatPopup: true });
    harness.chat.ingest(message({ _id: 'm1', uid: 9, n: 'Bea', txt: 'ping' }));
    expect(harness.notified).toEqual([
      { title: 'Message from Bea', body: 'ping', icon: '', emailHash: '' }
    ]);
  });

  it('G12 — stays silent for the conversation on screen, and for my own echo', () => {
    /*
      Upstream raises it in the branch where the message is NOT for the open thread. Telling somebody
      about a message they are looking at is noise, and telling them about their own is worse.
    */
    const harness = make({ chatPopup: true });
    void harness.chat.switchToUser(9);
    harness.chat.ingest(message({ _id: 'm2', uid: 9, n: 'Bea' }));
    harness.chat.ingest(message({ _id: 'm3', uid: 1, recvdID: 4, n: 'Me' }));
    expect(harness.notified).toEqual([]);
  });

  it('G12 — obeys Do Not Disturb and the chatPopup preference', () => {
    const off = make({ chatPopup: false });
    off.chat.ingest(message({ _id: 'm4', uid: 9 }));
    expect(off.notified, 'chatPopup off').toEqual([]);
  });

  it('G8 — closing the TAB clears the conversation and leaves the panel open', () => {
    /*
      `closeTab(e) { this.user = null, this.recvdUser = null, this.currUser = "" }` at byte
      2,205,022. The room cleared only the selected user, so the header tab vanished and the thread
      and composer stayed — a conversation with nobody's name on it.
    */
    const harness = make();
    harness.chat.show();
    void harness.chat.switchToUser(9);
    harness.chat.draft = 'half typed';

    harness.chat.closeTab();

    expect(harness.chat.peerId, 'the conversation closes').toBeNull();
    expect(harness.chat.open, 'the panel does NOT').toBe(true);
    expect(harness.chat.draft, "and the other peer's draft does not follow").toBe('');
    expect(harness.cleared.length, 'the selected user goes with it').toBeGreaterThan(0);
  });

  it('G25 — clearing a search restores the thread WITHOUT a request', async () => {
    /*
      `privChatSearchResults = []` then `msgs = privChatLog[currUser]` at byte 2,209,001. A search
      used to overwrite the thread, so clearing one cost a round trip AND discarded every older page
      the reader had loaded.
    */
    const harness = make();
    harness.setIncoming([message({ _id: 'a', txt: 'first' })]);
    await harness.chat.switchToUser(9);

    harness.setIncoming([message({ _id: 'b', txt: 'a hit' })]);
    await harness.chat.search('hit');
    expect(
      harness.chat.log.map((row) => row._id),
      'the results are shown'
    ).toEqual(['b']);

    const requestsBefore = harness.loaded.length;
    await harness.chat.search('');
    expect(
      harness.chat.log.map((row) => row._id),
      'the thread comes back'
    ).toEqual(['a']);
    expect(harness.loaded.length, 'and nothing was fetched to do it').toBe(requestsBefore);
  });

  it('G25 — a search never overwrites the thread it searched', async () => {
    const harness = make();
    harness.setIncoming([message({ _id: 'a' }), message({ _id: 'b' })]);
    await harness.chat.switchToUser(9);
    harness.setIncoming([message({ _id: 'b' })]);
    await harness.chat.search('b');
    await harness.chat.search('');
    expect(harness.chat.log.map((row) => row._id)).toEqual(['a', 'b']);
  });

  it('G16 — the online dot answers the roster, and can go back to false', () => {
    /*
      `checkUserOnlineStatus` only ever writes `!0`, so upstream leaves a member who left lit up
      until something rebuilds the strip. A derived answer is the deliberate divergence.
    */
    const present = make({ onlineIds: [9], session: { privateChats: [] } });
    present.chat.ingest(message({ _id: 'p', uid: 9 }));
    expect(present.chat.tabs.find((tab) => tab.uid === 9)?.online).toBe(true);

    const absent = make({ onlineIds: [], session: { privateChats: [] } });
    absent.chat.ingest(message({ _id: 'q', uid: 9 }));
    expect(absent.chat.tabs.find((tab) => tab.uid === 9)?.online).toBe(false);
  });
});

describe('the composer s two behaviours that live in the class', () => {
  it('G13 — refuses to send when the room says this member may not post', () => {
    /*
      `if (!this.canPost) return void bootbox.alert("Sorry, you can't post to this channel")` at byte
      2,208,062. There was no gate: the message went to the server, which refused it, so the refusal
      arrived as a generic failure rather than as the reason.
    */
    const harness = make({ canPost: false });
    void harness.chat.switchToUser(9);
    harness.chat.draft = 'hello';
    void harness.chat.send();

    expect(harness.dialogs.alert).toBe("Sorry, you can't post to this channel");
    expect(harness.sent, 'and nothing left the room').toEqual([]);
    expect(harness.chat.draft, 'the draft is kept, so nothing is lost').toBe('hello');
  });

  it('G1 — an uploaded image is SENT rather than left in the box', () => {
    /*
      `sendPrivChat` is what the reference does with the URL. An image in a private conversation is a
      message, and leaving it in the draft would make somebody press Enter on a URL they did not type.
    */
    const harness = make({ uploadUrls: ['/uploads/cat.png'] });
    return harness.chat.switchToUser(9).then(async () => {
      harness.chat.beginImageUpload();
      expect(harness.chat.imageUpload, 'the dialog opens').toBe(true);

      await harness.chat.completeImageUpload([new File(['x'], 'cat.png', { type: 'image/png' })]);

      expect(harness.chat.imageUpload, 'and closes').toBe(false);
      expect(harness.uploaded).toHaveLength(1);
      expect(harness.sent).toEqual([{ peerId: 9, body: '/uploads/cat.png' }]);
    });
  });

  it('G1 — takes ONE file, as the reference s own dialog does', () => {
    /*
      `ImageUploadDialog` is shared with the chat composer, which allows several; the reference's
      private dialog sets `multiple='false'`. The extras are dropped here rather than by forking it —
      the same call `RoomTradeAlerts` makes.
    */
    const harness = make({ uploadUrls: ['/uploads/first.png'] });
    return harness.chat.switchToUser(9).then(async () => {
      await harness.chat.completeImageUpload([
        new File(['a'], 'a.png', { type: 'image/png' }),
        new File(['b'], 'b.png', { type: 'image/png' })
      ]);
      expect(harness.uploaded).toHaveLength(1);
    });
  });

  it('G1 — says so when the upload fails, and sends nothing', () => {
    const harness = make({ uploadUrls: [] });
    return harness.chat.switchToUser(9).then(async () => {
      await harness.chat.completeImageUpload([new File(['x'], 'a.png', { type: 'image/png' })]);
      expect(harness.dialogs.alert).toBe('Upload Failed...');
      expect(harness.sent).toEqual([]);
    });
  });
});

describe('the tab-title flash — G27', () => {
  /*
    `moderator-message-contract.test.ts` named this as one of two consumers deliberately unbuilt,
    with an assertion designed to fire when either appeared: *"this assertion exists so that adding
    either without updating that document fails here."* It fired.

    A private message arriving while the tab is in the background produced a `pling` and nothing
    else — and a muted tab, headphones on the presenter's audio, or a browser suppressing sound
    before any click all make that no signal at all. The title is what a background tab can show.
  */
  const flashOff = () => {
    document.title = 'Test Room';
  };

  it('flashes the sender s name, alternating with the room s', () => {
    flashOff();
    const harness = make();
    harness.chat.ingest(message({ _id: 't1', uid: 9, n: 'Bea' }));

    vi.advanceTimersByTime(TITLE_FLASH_MS);
    expect(document.title).toBe('Bea messaged you - Test Room');
    vi.advanceTimersByTime(TITLE_FLASH_MS);
    expect(document.title, 'and back').toBe('Test Room');

    harness.chat.close();
  });

  it('does NOT flash for my own message, or while the composer has focus', () => {
    /*
      `(!$("#textAreaTxtPM").is(":focus") || !window.onfocus) && !e.isMine`. Somebody typing into the
      box is already looking at it, and flashing the title at them is noise.

      ## ONE interval, and the first draft of this test advanced by TWO

      Advancing by `TITLE_FLASH_MS * 2` flips the title twice — flash, then back to the room name —
      so it reads `'Test Room'` whether or not a flash was running, and the assertion passed against
      both answers. Its negative controls caught it: deleting `!isMine` and deleting the focus check
      both left this green. **A test that cannot fail is worse than no test**, and the shape here is
      the one the whole ratchet of negative controls exists to find.

      One interval, so the flash — if it happened — is on the sender's half.
    */
    flashOff();
    const mine = make();
    mine.chat.ingest(message({ _id: 't2', uid: 1, recvdID: 9 }));
    vi.advanceTimersByTime(TITLE_FLASH_MS);
    expect(document.title, 'my own echo').toBe('Test Room');
    mine.chat.close();

    flashOff();
    const focused = make({ composerHasFocus: true });
    focused.chat.ingest(message({ _id: 't3', uid: 9, n: 'Bea' }));
    vi.advanceTimersByTime(TITLE_FLASH_MS);
    expect(document.title, 'the composer has focus').toBe('Test Room');
    focused.chat.close();
  });

  it('names the LATEST sender when a second message arrives', () => {
    /* `this.notificationInterval && clearInterval(this.notificationInterval)` — upstream's first line. */
    flashOff();
    const harness = make();
    harness.chat.ingest(message({ _id: 't4', uid: 9, n: 'Bea' }));
    harness.chat.ingest(message({ _id: 't5', uid: 8, n: 'Cass' }));

    vi.advanceTimersByTime(TITLE_FLASH_MS);
    expect(document.title).toBe('Cass messaged you - Test Room');
    harness.chat.close();
  });

  it('stops and restores the title when the composer takes focus', () => {
    flashOff();
    const harness = make();
    harness.chat.ingest(message({ _id: 't6', uid: 9, n: 'Bea' }));
    vi.advanceTimersByTime(TITLE_FLASH_MS);
    expect(document.title).toBe('Bea messaged you - Test Room');

    harness.chat.composerFocused();
    expect(document.title, 'restored immediately').toBe('Test Room');
    /* One interval, not two — see the note above on why an even advance proves nothing here. */
    vi.advanceTimersByTime(TITLE_FLASH_MS);
    expect(document.title, 'and it stays restored').toBe('Test Room');
  });

  it('stops when the panel or the tab closes', () => {
    flashOff();
    const closing = make();
    closing.chat.ingest(message({ _id: 't7', uid: 9, n: 'Bea' }));
    closing.chat.close();
    vi.advanceTimersByTime(TITLE_FLASH_MS);
    expect(document.title).toBe('Test Room');

    flashOff();
    const tab = make();
    tab.chat.ingest(message({ _id: 't8', uid: 9, n: 'Bea' }));
    tab.chat.closeTab();
    vi.advanceTimersByTime(TITLE_FLASH_MS);
    expect(document.title).toBe('Test Room');
  });

  it('leaves the title alone when nothing was flashing', () => {
    /*
      The clear is conditional and the restore is not — a component unmounting with no flash running
      must not overwrite a title something else had set.
    */
    document.title = 'Something Else';
    make().chat.close();
    expect(document.title).toBe('Something Else');
  });
});
