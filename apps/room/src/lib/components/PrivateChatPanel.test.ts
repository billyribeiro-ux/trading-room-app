// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import { formatCompactTime } from '#lib/compact-message-time.js';

import PrivateChatPanel, {
  type PrivateChatRow,
  type PrivateChatTab
} from './PrivateChatPanel.svelte';

/*
  THE FIRST MOUNT TEST IN THIS SUITE, and that is the point of Phase 2 rather than a side effect.

  Every contract test in this repository up to now asserts on SOURCE TEXT, because the thing being
  asserted about lived inside a 13,000-line page that could not be rendered in isolation. Reading
  text proves a class name is present in a file. It cannot prove that a member with two conversations
  sees two rows, that the unread badge is hidden at zero, or that Load More disappears while a search
  is running — those are properties of what renders, and until this component existed there was
  nowhere to ask.

  So the assertions below are deliberately about the DOM, not about the file. Where a source-text
  assertion already covers the captured class names — `privchat-toolbar-contract.test.ts` does — it
  is not repeated here.
*/

const tab = (over: Partial<PrivateChatTab> & { uid: number }): PrivateChatTab => ({
  name: `user${over.uid}`,
  avt: `avt${over.uid}`,
  pic: `https://example.test/${over.uid}.png`,
  unread: 0,
  isA: false,
  online: false,
  ...over
});

const row = (over: Partial<PrivateChatRow> & { _id: string }): PrivateChatRow => ({
  n: 'Allison',
  t: 0,
  txt: 'hello',
  ...over
});

/** A full page as the server used to send it. Nothing derives a page number from it now. */
const fullPage = () => Array.from({ length: 50 }, (_, index) => row({ _id: `m${index}` }));

let target: HTMLElement | undefined;
let component: Record<string, unknown> | undefined;

afterEach(() => {
  if (component) unmount(component);
  target?.remove();
  component = undefined;
  target = undefined;
});

/** The calls a test wants to observe, collected rather than asserted one at a time. */
interface Calls {
  closepeer: number;
  deletethis: number;
  close: number;
  search: string[];
  donotdisturb: number;
  download: number;
  switchuser: number[];
  loadmore: number;
  send: number;
  /** The composer button column's three, G1, and the focus that stops the title flash. */
  composerfocus: number;
  imageupload: number;
  selectgif: string[];
  emoji: string[];
}

const render = (props: Partial<Record<string, unknown>> = {}) => {
  const calls: Calls = {
    closepeer: 0,
    deletethis: 0,
    close: 0,
    search: [],
    donotdisturb: 0,
    download: 0,
    switchuser: [],
    loadmore: 0,
    send: 0,
    composerfocus: 0,
    imageupload: 0,
    selectgif: [],
    emoji: []
  };

  target = document.createElement('div');
  document.body.append(target);

  component = mount(PrivateChatPanel, {
    target,
    props: {
      open: true,
      pmLogsOnRight: false,
      canPostImages: true,
      webinarMode: false,
      giphyApiKey: 'giphy-test-key',
      oncomposerfocus: () => (calls.composerfocus += 1),
      onimageupload: () => (calls.imageupload += 1),
      onselectgif: (_title: string, url: string) => calls.selectgif.push(url),
      onemoji: (glyph: string) => calls.emoji.push(glyph),
      doNotDisturb: false,
      isPresenter: false,
      peer: null,
      tabs: [],
      currentUserId: null,
      log: [],
      searching: false,
      searchTerm: '',
      draft: '',
      hasMore: false,
      loadingMore: false,
      onclosepeer: () => (calls.closepeer += 1),
      ondeletethis: () => (calls.deletethis += 1),
      onclose: () => (calls.close += 1),
      onsearch: (term: string) => calls.search.push(term),
      ondonotdisturb: () => (calls.donotdisturb += 1),
      ondownload: () => (calls.download += 1),
      onswitchuser: (uid: number) => calls.switchuser.push(uid),
      onloadmore: () => (calls.loadmore += 1),
      onsend: () => (calls.send += 1),
      ...props
    }
  }) as Record<string, unknown>;

  flushSync();
  return { calls, root: target as HTMLElement };
};

describe('what a member with no conversations sees', () => {
  it('renders "No active chat" rather than an empty thread', () => {
    const { root } = render();
    expect(root.textContent).toContain('No active chat');
    expect(root.querySelector('.pc-list'), 'and no tab strip at all').toBeNull();
  });

  it('and the panel is hidden when closed, not unmounted', () => {
    /*
      `display: block` when open. The capture keeps the panel MOUNTED and hides it, which is why the
      draggable/resizable setup runs once rather than on every open — and why the composer keeps
      what you typed while it is shut.
    */
    const { root } = render({ open: false });
    const panel = root.querySelector('#privaChatCompHolder');
    expect(panel, 'still in the DOM').not.toBeNull();
    expect(panel?.getAttribute('style')).toBeNull();

    const open = render({ open: true });
    expect(open.root.querySelector('#privaChatCompHolder')?.getAttribute('style')).toBe(
      'display: block;'
    );
  });
});

describe('the tab strip', () => {
  it('renders one row per conversation and marks the open one', () => {
    const { root } = render({
      tabs: [tab({ uid: 1 }), tab({ uid: 2 })],
      currentUserId: 2
    });

    const rows = root.querySelectorAll('.pc-list button');
    expect(rows).toHaveLength(2);
    /* Reversed for display — see the newest-first test below. `uid: 2` is now the FIRST row. */
    expect(rows[0]?.classList.contains('pc-active'), 'the open conversation').toBe(true);
    expect(rows[1]?.classList.contains('pc-active')).toBe(false);
    expect(rows[0]?.getAttribute('aria-current'), 'and says so to a screen reader').toBe('true');
  });

  it('puts the NEWEST conversation first, which the model does not', () => {
    /*
      `pt(e.chatTabs.slice().reverse())` at byte 2,196,816.

      The model is ascending by last activity, because `newMessage` splices a tab out and PUSHES it
      so the most recent sits last — this is the reference's own ordering and every other reader of
      the getter expects it. The reversal is for DISPLAY only, which is why it lives in the component
      and not in the sort.
    */
    const { root } = render({
      tabs: [tab({ uid: 1, name: 'oldest' }), tab({ uid: 2, name: 'newest' })]
    });
    const names = [...root.querySelectorAll('.pc-username')].map((node) => node.textContent);
    expect(names).toEqual(['newest', 'oldest']);
  });

  it('falls back to a gravatar when a member has no picture', () => {
    /*
      `e.pic || "https://secure.gravatar.com/avatar/" + e.avt + "?d=mm&s=32"` — byte 2,196,585, and
      `?d=mm&s=25` for the header tab at 2,195,104. Both sites bound `src` to `pic` alone, so a
      member with no picture rendered `<img src="">`, which resolves to the page itself.

      `avt` is the gravatar KEY — `md5` of the lowercased address, which is what `hashEmail` produces
      and what the server now sends. It sent the raw address until 2026-08-30, so building this
      fallback against the value as it stood would have forwarded every member's email to
      gravatar.com; `private-chat-delivery.test.ts` carries that finding.
    */
    const { root } = render({
      tabs: [tab({ uid: 1, pic: '', avt: 'abc123' }), tab({ uid: 2, pic: '/uploads/me.png' })]
    });
    const sources = [...root.querySelectorAll('.pc-list img')].map((node) =>
      node.getAttribute('src')
    );
    /* Reversed, so the one WITH a picture is first and its own `pic` is untouched. */
    expect(sources).toEqual([
      '/uploads/me.png',
      'https://secure.gravatar.com/avatar/abc123?d=mm&s=32'
    ]);
  });

  it('shows an unread badge only when there is something unread', () => {
    // A zero badge is a notification for nothing, which is worse than none.
    const { root } = render({ tabs: [tab({ uid: 1, unread: 0 }), tab({ uid: 2, unread: 3 })] });
    const badges = root.querySelectorAll('.privchatUnread');
    expect(badges).toHaveLength(1);
    expect(badges[0]?.textContent).toBe('3');
  });

  it('marks who is online with the status dot', () => {
    /* Reversed for display, so `uid: 2` — the one that is NOT online — comes first. */
    const { root } = render({ tabs: [tab({ uid: 1, online: true }), tab({ uid: 2 })] });
    const dots = root.querySelectorAll('.user-status-type');
    expect(dots[1]?.classList.contains('bg-success')).toBe(true);
    expect(dots[0]?.classList.contains('bg-success')).toBe(false);
  });

  it('and clicking a row asks the page to switch, rather than switching itself', () => {
    const { root, calls } = render({ tabs: [tab({ uid: 7 })] });
    root.querySelector<HTMLButtonElement>('.pc-list button')?.click();
    flushSync();
    expect(calls.switchuser).toEqual([7]);
  });
});

describe('the conversation', () => {
  it('renders each row through the shared compact row', () => {
    const { root } = render({
      tabs: [tab({ uid: 1 })],
      currentUserId: 1,
      log: [row({ _id: 'a', txt: 'first' }), row({ _id: 'b', txt: 'second' })]
    });

    /*
      Read off the ROW's own element rather than a stand-in snippet.

      This used to inject a `createRawSnippet` marked `data-body`, because the linkifying rule was a
      prop the page supplied. It is `CompactMessageRow`'s now — one row, one definition, rendered by
      both this panel and the all-user modal — so the assertion reads the real markup, which is
      strictly more than the stand-in proved.
    */
    const bodies = [...root.querySelectorAll('.msg-left')].map((node) => node.textContent?.trim());
    expect(bodies).toEqual(['first', 'second']);
  });

  it('styles a presenter’s name differently from a member’s', () => {
    const { root } = render({
      tabs: [tab({ uid: 1 })],
      currentUserId: 1,
      log: [row({ _id: 'a', isA: true }), row({ _id: 'b' })]
    });

    const names = root.querySelectorAll('.username');
    expect(names[0]?.classList.contains('presUser')).toBe(true);
    expect(names[1]?.classList.contains('presUser')).toBe(false);
  });

  /*
    THE SHARED FORMATTER, and the assertion is now against the real one.

    This used to inject `formatTime: (at) => \`t${at}\`` as a prop and check the panel spent it. The
    formatter is `#lib/compact-message-time.ts` now, because two surfaces need it and neither should
    have to hold a `RoomPrivateChat` to print a clock. So the test compares against that function
    rather than against a literal: hard-coding "12:00 AM" would fail on any machine outside UTC and
    would be asserting the runner's timezone rather than this component's behaviour.
  */
  it('prints the timestamp through the shared compact formatter', () => {
    const { root } = render({
      tabs: [tab({ uid: 1 })],
      currentUserId: 1,
      log: [row({ _id: 'a', t: 42 })]
    });
    expect(root.querySelector('.msg-time')?.textContent).toBe(formatCompactTime(42));
  });

  it('with a tab strip but nothing selected, still says "No active chat"', () => {
    const { root } = render({ tabs: [tab({ uid: 1 })], currentUserId: null });
    expect(root.textContent).toContain('No active chat');
    expect(root.querySelector('.pc-messages'), 'and renders no thread').toBeNull();
  });
});

/*
  REWRITTEN 2026-08-30, and the tests that stood here are worth naming because they PINNED the defect.

  The panel used to decide for itself whether there was more history — `log.length >= 50` — and which
  page to ask for — `Math.floor(log.length / 50)` — against a `PAGE_SIZE` it declared. Three tests
  asserted exactly that arithmetic, including one titled *"asks for the page AFTER the one it is
  showing"* whose comment spelled out `floor(length / 50)`. They passed, and the behaviour they
  protected was: a page that came back short named a page already fetched, so the same private
  messages were requested and prepended twice, and the badge never disappeared.

  `#lib/chat-paging.ts` carries the reference's own four-field state machine and what this cost. The
  panel now RENDERS a decision rather than making one, so these assert what it draws and what it
  reports — never how many rows it happens to be holding.
*/
describe('Load More, and the rule that a filtered log is not a paged one', () => {
  it('appears while the server still has history, whatever the log length', () => {
    /* Two rows and more to come is a real state: the previous version could not express it. */
    const { root } = render({
      tabs: [tab({ uid: 1 })],
      currentUserId: 1,
      log: fullPage().slice(0, 2),
      hasMore: true
    });
    expect(root.querySelector('.badge-warning')?.textContent?.trim()).toBe('Load More');
  });

  it('disappears once a page comes back empty, however full the log is', () => {
    /* A full page held and nothing older left — the state that used to leave the badge forever. */
    const { root } = render({
      tabs: [tab({ uid: 1 })],
      currentUserId: 1,
      log: fullPage(),
      hasMore: false
    });
    expect(root.querySelector('.badge-warning')).toBeNull();
  });

  it('and is hidden while a search is running', () => {
    /*
      Upstream refuses to page while a term is set. Asking for page 2 of a filter the server knows
      nothing about would interleave unfiltered history into a filtered view.
    */
    const { root } = render({
      tabs: [tab({ uid: 1 })],
      currentUserId: 1,
      log: fullPage(),
      hasMore: true,
      searching: true
    });
    expect(root.querySelector('.badge-warning')).toBeNull();
  });

  it('asks, and names no page — the counter belongs to whoever makes the requests', () => {
    const { root, calls } = render({
      tabs: [tab({ uid: 9 })],
      currentUserId: 9,
      log: fullPage(),
      hasMore: true
    });
    root.querySelector<HTMLElement>('.badge-warning')?.click();
    flushSync();
    expect(calls.loadmore).toBe(1);
  });

  it('becomes a spinner while the request is in flight, and cannot be clicked again', () => {
    // `O(2, hasMoreData && !searchTerm ? 2 : -1)` then `O(3, isLoadingMore ? 3 : -1)` — exclusive.
    const { root } = render({
      tabs: [tab({ uid: 1 })],
      currentUserId: 1,
      log: fullPage(),
      hasMore: false,
      loadingMore: true
    });
    expect(root.querySelector('.badge-warning')?.textContent?.trim()).toBe('');
    expect(root.querySelector('.fa-spinner'), 'the spinner branch').not.toBeNull();
  });
});

describe('the header, and who may see what', () => {
  it('hides the DND badge unless do-not-disturb is on', () => {
    expect(render({ doNotDisturb: false }).root.textContent).not.toContain('DND');
    expect(render({ doNotDisturb: true }).root.textContent).toContain('DND');
  });

  it('shows the peer tab only when a peer is selected', () => {
    expect(render().root.querySelector('.close-tab')).toBeNull();
    const withPeer = render({ peer: { pic: 'p.png', nick: 'Allison' } });
    expect(withPeer.root.querySelector('.avatarImg-active')).not.toBeNull();
    expect(withPeer.root.textContent).toContain('Allison');
  });

  it('offers "This" to a PRESENTER with a peer open, and to nobody else', () => {
    /*
      Deleting one conversation is a moderation action. Both terms matter: a member never sees it,
      and a presenter with no conversation open has nothing to delete.
    */
    const peer = { pic: 'p.png', nick: 'Allison' };
    expect(render({ peer, isPresenter: false }).root.textContent).not.toContain('This');
    expect(render({ peer: null, isPresenter: true }).root.textContent).not.toContain('This');
    expect(render({ peer, isPresenter: true }).root.textContent).toContain('This');
  });

  it('closing the peer tab does not close the panel', () => {
    // Two different controls, two different callbacks — one clears the conversation, one hides
    // everything. A single handler here would make the × on a tab dismiss the whole panel.
    const { root, calls } = render({ peer: { pic: 'p.png', nick: 'Allison' } });
    root.querySelector<HTMLElement>('.close-tab')?.click();
    flushSync();
    expect(calls.closepeer).toBe(1);
    expect(calls.close, 'the panel stays open').toBe(0);
  });
});

describe('the gear toolbar, which is this component’s own state', () => {
  it('is closed until the gear is clicked', () => {
    const { root } = render();
    expect(root.querySelector('.pmToolbar')).toBeNull();

    root.querySelector<HTMLElement>('.chat-header-gear')?.click();
    flushSync();
    expect(root.querySelector('.pmToolbar')).not.toBeNull();
  });

  it('and closes again on a second click', () => {
    const { root } = render();
    const gear = () => root.querySelector<HTMLElement>('.chat-header-gear');
    gear()?.click();
    flushSync();
    gear()?.click();
    flushSync();
    expect(root.querySelector('.pmToolbar')).toBeNull();
  });

  it('the clear button searches for the empty string rather than closing the toolbar', () => {
    const { root, calls } = render();
    root.querySelector<HTMLElement>('.chat-header-gear')?.click();
    flushSync();
    root.querySelector<HTMLElement>('#addon-chat-clear')?.click();
    flushSync();

    expect(calls.search).toEqual(['']);
    expect(root.querySelector('.pmToolbar'), 'the strip stays up').not.toBeNull();
  });

  it('and both buttons report to the page', () => {
    const { root, calls } = render();
    root.querySelector<HTMLElement>('.chat-header-gear')?.click();
    flushSync();

    const buttons = [...root.querySelectorAll<HTMLElement>('.pmToolbar a')];
    buttons.find((node) => node.textContent?.includes("Don't Disturb"))?.click();
    buttons.find((node) => node.textContent?.includes('Download Log'))?.click();
    flushSync();

    expect([calls.donotdisturb, calls.download]).toEqual([1, 1]);
  });
});

describe('the composer', () => {
  const composer = (root: HTMLElement) => root.querySelector<HTMLTextAreaElement>('#textAreaTxtPM');

  const key = (init: KeyboardEventInit) =>
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });

  it('Enter sends', () => {
    const { root, calls } = render({ tabs: [tab({ uid: 1 })], currentUserId: 1 });
    const event = key({ key: 'Enter' });
    composer(root)?.dispatchEvent(event);
    flushSync();

    expect(calls.send).toBe(1);
    expect(event.defaultPrevented, 'or the newline lands as well as the send').toBe(true);
  });

  it('Shift+Enter and Alt+Enter insert a newline instead', () => {
    /*
      `onKey(e)` in the capture calls `preventDefault()` on 13 EITHER WAY, which is why the newline
      is inserted by hand rather than left to the browser.
    */
    for (const modifier of [{ shiftKey: true }, { altKey: true }]) {
      const { root, calls } = render({ tabs: [tab({ uid: 1 })], currentUserId: 1 });
      composer(root)?.dispatchEvent(key({ key: 'Enter', ...modifier }));
      flushSync();
      expect(calls.send, JSON.stringify(modifier)).toBe(0);
      if (component) unmount(component);
      component = undefined;
    }
  });

  it('and any other key does nothing at all', () => {
    const { root, calls } = render({ tabs: [tab({ uid: 1 })], currentUserId: 1 });
    const event = key({ key: 'a' });
    composer(root)?.dispatchEvent(event);
    flushSync();
    expect(calls.send).toBe(0);
    expect(event.defaultPrevented, 'typing must not be swallowed').toBe(false);
  });
});
