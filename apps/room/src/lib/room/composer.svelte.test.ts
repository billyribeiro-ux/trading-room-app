// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MessageActionItem } from '$lib/types';

import { RoomChat } from './chat.svelte';
import { RoomComposer } from './composer.svelte';
import { RoomDialogs } from './dialogs.svelte';

/*
  Everything that leaves this browser as content, EXECUTED.

  `chat-rte-gate-contract.test.ts` and `extra-chat-column-contract.test.ts` read this class as
  source and pin the gate expression and the channel routing against the capture. What neither can
  do is run a send, and the properties that only exist at runtime are the ones a refusal exposes:

  - `sendBody` is the ONE refusal path, and it returns false rather than throwing, because every
    caller decides whether to clear the composer on that answer;
  - a refused send must NOT clear what was typed;
  - the image upload falls back to the remote command when the CDN is not configured.
*/

const ITEM = { id: 7, body: 'hi', bodyHtml: '<b>hi</b>' } as unknown as MessageActionItem;

const make = (
  options: {
    sendFails?: boolean;
    uploadServer?: string;
    enableRTE?: boolean;
    isPresenter?: boolean;
  } = {}
) => {
  const dialogs = new RoomDialogs();
  const chat = new RoomChat({ extraColumnEnabled: () => true });
  const sent: unknown[] = [];
  const uploaded: unknown[] = [];
  const alerts: unknown[] = [];
  const opened: string[] = [];
  const menus: [string, boolean][] = [];
  let modalClosed = 0;
  let invalidated = 0;

  const composer = new RoomComposer({
    dialogs,
    chat,
    commands: {
      send: (payload) =>
        options.sendFails
          ? Promise.reject(new Error('refused'))
          : (sent.push(payload), Promise.resolve(null)),
      uploadImage: (payload) => (uploaded.push(payload), Promise.resolve('https://cdn.test/u.png')),
      postAlert: (payload) => (alerts.push(payload), Promise.resolve(null))
    },
    session: () => ({
      sessData: { enableRTE: options.enableRTE ?? true },
      sessionHandle: 'room-1'
    }),
    prefs: { enableRTE: true },
    isPresenter: () => options.isPresenter ?? true,
    openModal: (name) => opened.push(name),
    closeModal: () => (modalClosed += 1),
    closeMenu: (name, open) => menus.push([name, open]),
    editMessage: () => Promise.resolve(true),
    onSent: () => ((invalidated += 1), Promise.resolve()),
    uploadServer: options.uploadServer ?? '',
    uploadKey: options.uploadServer ? 'key' : ''
  });

  return {
    composer,
    chat,
    dialogs,
    sent,
    uploaded,
    alerts,
    opened,
    menus,
    modalClosed: () => modalClosed,
    invalidated: () => invalidated
  };
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('one refusal path, and every sender goes through it', () => {
  it('sends nothing for an empty or whitespace body', async () => {
    const { composer, sent } = make();
    expect(await composer.sendBody('   ')).toBe(false);
    expect(sent).toEqual([]);
  });

  it('returns false and shows the server’s wording when a send is refused', async () => {
    const { composer, dialogs } = make({ sendFails: true });
    expect(await composer.sendBody('hello')).toBe(false);
    expect(dialogs.alert).toBe('Message not sent.');
  });

  it('does NOT clear the composer when the send was refused', async () => {
    /*
      The bug this shape exists to prevent: an optimistic clear that ran on a refused send, so the
      typed message vanished with no error. `send()` clears only on `true`.
    */
    const { composer, chat } = make({ sendFails: true });
    chat.composer = 'a message worth keeping';
    await composer.send();
    expect(chat.composer, 'a refused send must not eat what was typed').toBe(
      'a message worth keeping'
    );
  });

  it('clears the composer when the send succeeded', async () => {
    const { composer, chat, sent, invalidated } = make();
    chat.composer = 'hello';
    await composer.send();
    expect(sent).toHaveLength(1);
    expect(chat.composer).toBe('');
    expect(invalidated()).toBe(1);
  });

  it('sends the extra column into ITS channel, not the main one', async () => {
    /*
      `sendBody` took the main tab from module scope until the extra column arrived. Left that way,
      a message typed in the off-topic column would have landed in main.
    */
    const { composer, chat, sent } = make();
    chat.extraComposer = 'off topic';
    await composer.sendExtra();
    expect((sent[0] as { room: string }).room).toBe(chat.extraTab);
  });
});

describe('the rich-text gate', () => {
  it('needs all three terms, and the room’s flag is one of them', () => {
    expect(make({ enableRTE: true, isPresenter: true }).composer.canUseRTE).toBe(true);
    expect(make({ enableRTE: false, isPresenter: true }).composer.canUseRTE).toBe(false);
    expect(make({ enableRTE: true, isPresenter: false }).composer.canUseRTE).toBe(false);
  });

  it('takes the composer’s text and leaves it EMPTY, in one call', () => {
    const { composer, chat, opened } = make();
    chat.composer = 'draft & <text>';
    composer.openRTE();
    expect(chat.composer, 'the draft must not exist in the modal and behind it at once').toBe('');
    // Escaped, because a textarea holds text and not markup.
    expect(composer.rteDraft).toBe('draft &amp; &lt;text&gt;');
    expect(opened).toEqual(['rich-text']);
  });

  it('refuses an empty rich-text message on the SERVER emptiness rule', async () => {
    /*
      `stripHtmlToText` is what decides, so formatting-only markup cannot pass as a message and then
      be refused by the server with nothing shown.
    */
    const { composer, dialogs, sent } = make();
    composer.rteDraft = '<p><br></p>';
    await composer.sendRTE();
    expect(dialogs.alert).toBe('Empty message. Please type a message...');
    expect(sent).toEqual([]);
  });

  it('editInRTE sets the draft, the flag and the target together', () => {
    /*
      A receiver rather than three setters: a draft with no target is a new message, a target with
      no draft is an editor showing nothing, and `sendRTE` branches on the target.
    */
    const { composer, opened } = make();
    composer.editInRTE(ITEM, '<b>hi</b>');
    expect(composer.rteIsEditing).toBe(true);
    expect(composer.rteDraft).toBe('<b>hi</b>');
    expect(opened).toEqual(['rich-text']);
  });

  it('clears all three after a successful send', async () => {
    const { composer, modalClosed } = make();
    composer.rteDraft = '<b>hello</b>';
    await composer.sendRTE();
    expect(composer.rteDraft).toBe('');
    expect(composer.rteIsEditing).toBe(false);
    expect(modalClosed()).toBe(1);
  });
});

describe('the image upload has two backends', () => {
  it('falls back to the remote command when the CDN is not configured', async () => {
    const { composer, uploaded, sent } = make({ uploadServer: '' });
    await composer.uploadImages([new File(['x'], 'a.png', { type: 'image/png' })], 'caption');
    expect(uploaded, 'the remote command is the fallback, not an error').toHaveLength(1);
    expect((sent[0] as { body: string }).body).toBe('https://cdn.test/u.png caption');
  });

  it('posts to the CDN when it IS configured, and never touches the remote command', async () => {
    const fetched: string[] = [];
    vi.stubGlobal('fetch', (url: string) => {
      fetched.push(String(url));
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { link: 'https://cdn.test/direct.png' } })
      } as unknown as Response);
    });
    const { composer, uploaded, sent } = make({ uploadServer: 'https://up.test' });
    await composer.uploadImages([new File(['x'], 'a.png', { type: 'image/png' })], '');
    expect(fetched[0]).toBe('https://up.test/image/room-1');
    expect(uploaded, 'the remote command must not also run').toEqual([]);
    expect((sent[0] as { body: string }).body).toBe('https://cdn.test/direct.png');
  });

  it('says Upload Failed rather than posting a message with an image that never uploaded', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({ ok: false, status: 500 } as unknown as Response)
    );
    const { composer, dialogs, sent } = make({ uploadServer: 'https://up.test' });
    await composer.uploadImages([new File(['x'], 'a.png', { type: 'image/png' })], '');
    expect(dialogs.alert).toBe('Upload Failed...');
    expect(sent, 'a failed upload must not still post').toEqual([]);
  });
});

describe('posting an alert', () => {
  it('sends the composed body and the first upload as the target url', async () => {
    const { composer, alerts } = make();
    const posted = await composer.postAlert({
      composition: { status: 'upload', kind: 'media', bodyBeforeUploads: 'look' },
      files: [new File(['x'], 'a.png', { type: 'image/png' })],
      keepOpen: false,
      postOnX: false,
      nonTradeAlert: false,
      dontPush: false,
      legalDisclosure: false,
      legalDisclosureText: ''
    });
    expect(posted).toBe(true);
    expect((alerts[0] as { targetUrl: string }).targetUrl).toBe('https://cdn.test/u.png');
  });

  it('posts poll results as a plain text alert with no target url', async () => {
    const { composer, alerts } = make();
    await composer.postPollResults('the results');
    expect(alerts).toEqual([
      { kind: 'text', body: 'the results', targetUrl: null, nonTradeAlert: false }
    ]);
  });
});

describe('the GIF picker', () => {
  it('holds the url until it is confirmed, and sends nothing on cancel', async () => {
    const { composer, sent, menus } = make();
    composer.selectGif('', 'https://giphy.test/a.gif');
    expect(composer.sendingGif).toBe(true);
    expect(composer.pendingGifUrl).toBe('https://giphy.test/a.gif');
    expect(menus, 'picking one closes the picker').toContainEqual(['giphy', false]);

    composer.cancelGif();
    expect(composer.pendingGifUrl).toBeNull();
    expect(composer.sendingGif).toBe(false);
    expect(sent).toEqual([]);
  });

  it('sends the url on confirm, and refuses a second pick while one is in flight', async () => {
    const { composer, sent } = make();
    composer.selectGif('', 'https://giphy.test/a.gif');
    composer.selectGif('', 'https://giphy.test/b.gif');
    expect(composer.pendingGifUrl, 'a second pick must not replace the first').toBe(
      'https://giphy.test/a.gif'
    );
    await composer.confirmGif();
    expect((sent[0] as { body: string }).body).toBe('https://giphy.test/a.gif');
    expect(composer.sendingGif).toBe(false);
  });
});

describe('every public getter is reactive', () => {
  /*
    Mutations and flushes INSIDE `$effect.root`, assertions OUTSIDE it — the root swallows a thrown
    assertion, as `room-mtx.svelte.test.ts` records.
  */
  it('re-runs a reader when a GIF is picked', () => {
    const { composer } = make();
    const seen: boolean[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(composer.sendingGif));
      flushSync();
      composer.selectGif('', 'https://giphy.test/a.gif');
      flushSync();
    });
    stop();
    expect(seen, 'the sendingGif getter is not reactive').toEqual([false, true]);
  });

  it('re-runs a reader when the rich-text draft is written', () => {
    const { composer } = make();
    const seen: string[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(composer.rteDraft));
      flushSync();
      composer.rteDraft = '<b>x</b>';
      flushSync();
    });
    stop();
    expect(seen, 'the rteDraft getter is not reactive').toEqual(['', '<b>x</b>']);
  });

  it('re-runs a reader when the editor opens on a message', () => {
    const { composer } = make();
    const seen: boolean[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(composer.rteIsEditing));
      flushSync();
      composer.editInRTE(ITEM, '<b>hi</b>');
      flushSync();
    });
    stop();
    expect(seen, 'the rteIsEditing getter is not reactive').toEqual([false, true]);
  });
});
