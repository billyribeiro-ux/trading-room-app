// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import type { MessageActionItem, ModalTargetUser } from '#lib/types.js';

import { RoomChat } from './chat.svelte';
import { RoomComposer } from './composer.svelte';
import { RoomDialogs } from './dialogs.svelte';
import type { EvidencePatch } from './feeds.svelte';
import { RoomMessageActions } from './message-actions.svelte';
import { RoomToasts } from './toasts.svelte';

/*
  What a click on a MESSAGE does, executed.

  `chat-rte-gate-contract.test.ts` and `message-gates` read this class as source and pin which
  editor opens and which control is drawn. What neither can do is run an operation, and the property
  that only exists at runtime is the one that made this a class at all:

  **every optimistic write has exactly one undo, and a refusal must trigger it.**

  Four actions apply a local change before the server answers — delete hides, markAnswered ticks,
  edit rewrites the body, reaction toggles the pill. Each is paired with a put-back. A pair that
  drifts leaves a row hidden in one browser and visible everywhere else, which is the one-sided
  disappearance this shape exists to prevent.
*/

const item = (over: Partial<MessageActionItem> = {}): MessageActionItem =>
  ({
    id: 3,
    senderId: 2,
    senderName: 'Ada',
    senderEmailHash: 'hash-ada',
    senderAvatarUrl: '/a.png',
    senderStatus: 'online',
    body: 'hello',
    evidenceKey: 'k3',
    ...over
  }) as MessageActionItem;

const make = (options: { refuse?: boolean; canUseRTE?: boolean } = {}) => {
  const dialogs = new RoomDialogs();
  const toasts = new RoomToasts();
  const chat = new RoomChat({ extraColumnEnabled: () => true });
  const sent: unknown[] = [];
  /*
    The Q&A thread's two commands land here rather than in `sent`, and keeping them apart is the
    assertion: `messageAction` must NEVER be called for a thread entry. A question id sent to that
    endpoint would be read as an alert or a chat id and act on the wrong table.
  */
  const questionSends: Record<string, unknown>[] = [];
  const patches: [string, EvidencePatch][] = [];
  const opened: string[] = [];
  const selected: (ModalTargetUser | null)[] = [];
  const privateChats: number[] = [];
  let invalidated = 0;

  const composer = new RoomComposer({
    dialogs,
    chat,
    commands: {
      send: () => Promise.resolve(null),
      uploadImage: () => Promise.resolve(''),
      postAlert: () => Promise.resolve(null)
    },
    session: () => ({ sessData: { enableRTE: true }, sessionHandle: 'r' }),
    prefs: { enableRTE: true },
    isPresenter: () => options.canUseRTE ?? true,
    openModal: (name) => opened.push(name),
    closeModal: () => {},
    closeMenu: () => {},
    editMessage: () => Promise.resolve(true),
    onSent: () => Promise.resolve(),
    uploadServer: '',
    uploadKey: ''
  });

  const actions = new RoomMessageActions({
    dialogs,
    toasts,
    chat,
    composer,
    session: () => ({ user: { id: 9, role: 'staff', emailHash: 'hash-me' } }),
    sendOperation: (payload) =>
      options.refuse
        ? Promise.reject(new Error('refused'))
        : (sent.push(payload), Promise.resolve(null)),
    askQuestion: () => Promise.resolve(),
    reactToQuestion: (payload) =>
      options.refuse
        ? Promise.reject(new Error('refused'))
        : (questionSends.push({ command: 'reactToQuestion', ...payload }), Promise.resolve()),
    deleteQuestion: (payload) =>
      options.refuse
        ? Promise.reject(new Error('refused'))
        : (questionSends.push({ command: 'deleteQuestion', ...payload }), Promise.resolve()),
    editQuestion: (payload) =>
      options.refuse
        ? Promise.reject(new Error('refused'))
        : (questionSends.push({ command: 'editQuestion', ...payload }), Promise.resolve()),
    replyMessage: () => Promise.resolve(),
    openModal: (name) => opened.push(name),
    closeMessageMenu: () => {},
    selectUser: (user) => selected.push(user),
    patchEvidence: (target, patch) => patches.push([target.evidenceKey ?? '', patch]),
    openPrivateChat: (peerId) => privateChats.push(peerId),
    openImage: () => {},
    clearUnreadQa: () => {},
    focusComposer: () => {},
    onChanged: () => ((invalidated += 1), Promise.resolve())
  });

  return {
    actions,
    chat,
    dialogs,
    toasts,
    composer,
    sent,
    questionSends,
    patches,
    opened,
    selected,
    privateChats,
    invalidated: () => invalidated
  };
};

describe('every optimistic write has exactly one undo', () => {
  it('hides a deleted row, and puts it BACK when the server refuses', async () => {
    /*
      Captured items used to stop at the local hide — so a presenter deleting an alert watched it
      vanish while every member kept being served it from the fixture. The local hide is the
      optimistic half; the server call is what makes it stick, and a refusal has to undo it or the
      row is hidden for this viewer alone.
    */
    const { actions, dialogs, patches } = make({ refuse: true });
    actions.handle('chat', 'delete', item(), new MouseEvent('click', { shiftKey: true }));
    expect(patches[0]).toEqual(['k3', { hidden: true }]);
    await vi.waitFor(() => expect(patches).toHaveLength(2));
    expect(patches[1], 'a refused delete must put the row back').toEqual(['k3', { hidden: false }]);
    void dialogs;
  });

  it('ticks an answered row, and unticks it on refusal', async () => {
    const { actions, patches } = make({ refuse: true });
    actions.handle('alert', 'answered', item());
    expect(patches[0]).toEqual(['k3', { answered: true }]);
    await vi.waitFor(() => expect(patches[1]).toEqual(['k3', { answered: false }]));
  });

  it('leaves the optimistic change standing when the server accepts', async () => {
    const { actions, patches, sent, invalidated } = make();
    actions.handle('alert', 'answered', item());
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(patches, 'an accepted change has nothing to undo').toHaveLength(1);
    expect(invalidated()).toBe(1);
  });

  it('does nothing optimistic for a LIVE row, which has no overlay', () => {
    const { actions, patches } = make();
    actions.handle('chat', 'delete', item({ evidenceKey: undefined }), {
      shiftKey: true
    } as MouseEvent);
    expect(patches).toEqual([]);
  });
});

describe('the confirmations, and what happens without them', () => {
  it('asks before deleting unless SHIFT is held', () => {
    /*
      The reference's shift-to-skip. Without it the prompt names the sender and quotes the text for
      a presenter, and says "your message" for anyone else.
    */
    const { actions, dialogs, sent } = make();
    actions.handle('chat', 'delete', item());
    expect(dialogs.confirmation?.message).toContain('by Ada');
    expect(sent, 'nothing goes out before the answer').toEqual([]);

    dialogs.confirmation?.onconfirm();
    expect(dialogs.confirmation).toBeNull();
  });

  it('refuses to mute a sender with no usable id', () => {
    const { actions, dialogs } = make();
    actions.handle('chat', 'mute', item({ senderId: 0 }));
    expect(dialogs.alert).toBe('Could not retrieve user info.');
    expect(dialogs.confirmation, 'and asks nothing').toBeNull();
  });

  it('sends mute24 with the USER and no row coordinate at all', async () => {
    /*
      `z.discriminatedUnion` refuses `targetUserId` on the other operations. It used to be taken on
      every one and read on one, so a delete carried a field nothing looked at.

      AND THE REVERSE, since 2026-08-28: `mute24` no longer carries `kind` or `id` either. It acts on
      a USER; the row that was clicked is only how the viewer named them. The Q&A thread is what made
      that matter — a question is neither an alert nor a chat message, so muting its author through
      the shared shape meant labelling a question id as one of the two.
    */
    const { actions, dialogs, sent } = make();
    actions.handle('chat', 'mute', item());
    dialogs.confirmation?.onconfirm();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ operation: 'mute24', targetUserId: 2 });

    actions.handle('chat', 'show-all', item());
    await vi.waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[1]).toEqual({ kind: 'chat', id: 3, operation: 'showMsgToAll' });
  });
});

describe('the private chat refusal is the capture’s', () => {
  it('refuses a private chat with YOURSELF, and opens no panel', () => {
    /*
      Picking "Private Chat" on your own message shows an alert and stops. The server refuses it
      too, but by then the panel has already opened on an empty conversation with yourself.
    */
    const { actions, dialogs, privateChats } = make();
    actions.handle('chat', 'private', item({ senderId: 9 }));
    expect(dialogs.alert).toBe('Chatting with yourself again?');
    expect(privateChats).toEqual([]);
  });

  it('opens straight onto the thread for anybody else', () => {
    const { actions, privateChats } = make();
    actions.handle('chat', 'private', item({ senderId: 2 }));
    expect(privateChats, 'one receiver — show AND focus').toEqual([2]);
  });
});

describe('which editor opens', () => {
  it('opens the RICH editor for a chat message that has stored html', () => {
    /*
      Upstream sniffs the stored text with `containsHtml`. This room records it: `bodyHtml` is a
      nullable column set only by the sanitiser, so somebody who TYPED a less-than in the plain
      composer gets the plain prompt and sees the characters they typed.
    */
    const { actions, composer, dialogs } = make();
    actions.handle('chat', 'edit', item({ bodyHtml: '<b>hi</b>' }));
    expect(composer.rteIsEditing).toBe(true);
    expect(composer.rteDraft).toBe('<b>hi</b>');
    expect(dialogs.prompt, 'the plain prompt must not also open').toBeNull();
  });

  it('falls back to the plain prompt when there is no stored html', () => {
    const { actions, composer, dialogs } = make();
    actions.handle('chat', 'edit', item({ bodyHtml: undefined }));
    expect(composer.rteIsEditing).toBe(false);
    expect(dialogs.prompt?.title).toBe('Edit chat message:');
    expect(dialogs.prompt?.value).toBe('hello');
  });

  it('gives a viewer who cannot use RTE the plain prompt, html or not', () => {
    /*
      THE NARROWING, and a negative control is what found this test missing. Upstream's edit branch
      omits the presenter term, so a member who owns a rich message gets the editor opened, types,
      presses Save - and `retriveRTEContent()` refuses, because THAT check does require presenter.
      Their edit is lost and they are told the message is empty. Reproducing a control that can
      never complete is not reproducing a feature.
    */
    const { actions, composer, dialogs } = make({ canUseRTE: false });
    expect(composer.canUseRTE).toBe(false);
    actions.handle('chat', 'edit', item({ bodyHtml: '<b>hi</b>' }));
    expect(composer.rteIsEditing, 'the editor must not open for somebody who cannot save').toBe(
      false
    );
    expect(dialogs.prompt?.title).toBe('Edit chat message:');
  });

  it('and an ALERT always takes the plain prompt, named for its sender', () => {
    const { actions, dialogs } = make();
    actions.handle('alert', 'edit', item({ bodyHtml: '<b>hi</b>' }));
    expect(dialogs.prompt?.title).toBe('Edit alert by Ada:');
  });
});

describe('the selection, and everything that reads it', () => {
  it('records the clicked message and its sender', () => {
    const { actions, selected } = make();
    actions.handle('chat', 'user', item());
    expect(actions.selected?.id).toBe(3);
    expect(selected[0]?.nick).toBe('Ada');
  });

  it('clears on request, which is what the private-chat panel does when it closes', () => {
    const { actions } = make();
    actions.handle('chat', 'user', item());
    actions.clearSelected();
    expect(actions.selected).toBeNull();
  });

  it('is reactive, so the modals follow the click', () => {
    /*
      Mutations and flushes INSIDE `$effect.root`, assertions OUTSIDE it — the root swallows a
      thrown assertion, as `room-mtx.svelte.test.ts` records.
    */
    const { actions } = make();
    const seen: (number | undefined)[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(actions.selected?.id));
      flushSync();
      actions.handle('chat', 'report', item({ id: 11 }));
      flushSync();
    });
    stop();
    expect(seen, 'the selected getter is not reactive').toEqual([undefined, 11]);
  });
});

describe('the small ones', () => {
  it('copies plain text to the clipboard and says so with a TOAST', async () => {
    const written: string[] = [];
    vi.stubGlobal('navigator', {
      clipboard: { writeText: (text: string) => (written.push(text), Promise.resolve()) }
    });
    const { actions, toasts } = make();
    actions.handle('chat', 'copy', item({ body: '<b>bold</b> text' }));
    await vi.waitFor(() => expect(toasts.notices).toHaveLength(1));
    expect(written, 'the markup is stripped, because a clipboard holds text').toEqual([
      'bold text'
    ]);
    vi.unstubAllGlobals();
  });

  it('opens the modal each action names', () => {
    const { actions, opened } = make();
    actions.handle('chat', 'user', item());
    actions.handle('chat', 'reply', item());
    actions.handle('chat', 'report', item());
    actions.handle('alert', 'question', item());
    expect(opened).toEqual(['user', 'reply', 'report', 'qa']);
  });
});

describe('RM-20 — the user modal s @Mention remembers which column opened it', () => {
  /*
    `doUserInfo` emits a SECOND event beside `doUserInfo` (byte 1,352,030) whose only subscriber is
    the user modal (byte 2,074,524), which stores it so its own `doMention` (byte 2,077,087) can
    route the three-term way. `grep -rn doUserInfoExtra src` returned zero here, so the modal's
    @Mention always wrote to the main composer no matter which column the card came from.

    Asserted through the two COMPOSER buffers rather than through the private field, because the
    field is an implementation detail and the buffer is the thing a member sees.
  */
  const openCardFrom = (fromExtraColumn: boolean) => {
    const harness = make();
    harness.actions.handle('chat', 'user', item(), undefined, fromExtraColumn);
    return harness;
  };

  it('sends the mention to the EXTRA composer when the card came from that column', () => {
    const { actions, chat } = openCardFrom(true);
    actions.mentionFromUserModal('Ada');
    expect(chat.extraComposer).toBe('@Ada ');
    expect(chat.composer).toBe('');
  });

  it('sends it to the MAIN composer when the card came from the main log', () => {
    /* The control, and the one that fails if the flag is never cleared. */
    const { actions, chat } = openCardFrom(false);
    actions.mentionFromUserModal('Ada');
    expect(chat.composer).toBe('@Ada ');
    expect(chat.extraComposer).toBe('');
  });

  it('does NOT go stale, which is the one place we diverge from the reference', () => {
    /*
      Upstream emits ONLY when `extraChatColumn && (extraChatMsg || focus === 'textAreaTxtExtra')`,
      so opening a card from the main log with main focus emits nothing and the modal keeps the last
      extra-column answer. Ours records it on every open. Same answer in every case but this one.
    */
    const harness = make();
    harness.actions.handle('chat', 'user', item(), undefined, true);
    harness.actions.handle('chat', 'user', item(), undefined, false);
    harness.actions.mentionFromUserModal('Ada');
    expect(harness.chat.composer).toBe('@Ada ');
    expect(harness.chat.extraComposer).toBe('');
  });

  it('still honours the FOCUS half, which mentionTargetIsExtra owns', () => {
    /*
      Two ways to reach the extra column and this method supplies only one of them. Typing in the
      extra composer and then opening a card from the main log must still mention there — that is
      the `focus === 'textAreaTxtExtra'` term, and it is not duplicated in the new method.
    */
    const { actions, chat } = openCardFrom(false);
    chat.focused('textAreaTxtExtra');
    actions.mentionFromUserModal('Ada');
    expect(chat.extraComposer).toBe('@Ada ');
    expect(chat.composer).toBe('');
  });
});
