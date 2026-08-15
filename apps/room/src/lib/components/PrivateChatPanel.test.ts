// @vitest-environment jsdom
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

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

/** Fifty rows is the page size, which is what makes Load More appear. */
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
  loadmore: [number, number][];
  send: number;
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
    loadmore: [],
    send: 0
  };

  target = document.createElement('div');
  document.body.append(target);

  component = mount(PrivateChatPanel, {
    target,
    props: {
      open: true,
      doNotDisturb: false,
      isPresenter: false,
      peer: null,
      tabs: [],
      currentUserId: null,
      log: [],
      searching: false,
      searchTerm: '',
      draft: '',
      /*
        A stand-in for the page's `bodySegmentsPrivate` snippet. The linkifying rule belongs to the
        page, which owns the same rule for the chat log; what this component owes is that the body
        is RENDERED, which the assertion below checks by its text.
      */
      body: createRawSnippet((text: () => string) => ({
        render: () => `<span data-body>${text()}</span>`
      })),
      formatTime: (at: number) => `t${at}`,
      onclosepeer: () => (calls.closepeer += 1),
      ondeletethis: () => (calls.deletethis += 1),
      onclose: () => (calls.close += 1),
      onsearch: (term: string) => calls.search.push(term),
      ondonotdisturb: () => (calls.donotdisturb += 1),
      ondownload: () => (calls.download += 1),
      onswitchuser: (uid: number) => calls.switchuser.push(uid),
      onloadmore: (uid: number, page: number) => calls.loadmore.push([uid, page]),
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
    expect(rows[1]?.classList.contains('pc-active'), 'the open conversation').toBe(true);
    expect(rows[0]?.classList.contains('pc-active')).toBe(false);
    expect(rows[1]?.getAttribute('aria-current'), 'and says so to a screen reader').toBe('true');
  });

  it('shows an unread badge only when there is something unread', () => {
    // A zero badge is a notification for nothing, which is worse than none.
    const { root } = render({ tabs: [tab({ uid: 1, unread: 0 }), tab({ uid: 2, unread: 3 })] });
    const badges = root.querySelectorAll('.privchatUnread');
    expect(badges).toHaveLength(1);
    expect(badges[0]?.textContent).toBe('3');
  });

  it('marks who is online with the status dot', () => {
    const { root } = render({ tabs: [tab({ uid: 1, online: true }), tab({ uid: 2 })] });
    const dots = root.querySelectorAll('.user-status-type');
    expect(dots[0]?.classList.contains('bg-success')).toBe(true);
    expect(dots[1]?.classList.contains('bg-success')).toBe(false);
  });

  it('and clicking a row asks the page to switch, rather than switching itself', () => {
    const { root, calls } = render({ tabs: [tab({ uid: 7 })] });
    root.querySelector<HTMLButtonElement>('.pc-list button')?.click();
    flushSync();
    expect(calls.switchuser).toEqual([7]);
  });
});

describe('the conversation', () => {
  it('renders each row through the body snippet', () => {
    const { root } = render({
      tabs: [tab({ uid: 1 })],
      currentUserId: 1,
      log: [row({ _id: 'a', txt: 'first' }), row({ _id: 'b', txt: 'second' })]
    });

    const bodies = [...root.querySelectorAll('[data-body]')].map((node) => node.textContent);
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

  it('formats the timestamp through the page’s formatter', () => {
    const { root } = render({
      tabs: [tab({ uid: 1 })],
      currentUserId: 1,
      log: [row({ _id: 'a', t: 42 })]
    });
    expect(root.querySelector('.msg-time')?.textContent).toBe('t42');
  });

  it('with a tab strip but nothing selected, still says "No active chat"', () => {
    const { root } = render({ tabs: [tab({ uid: 1 })], currentUserId: null });
    expect(root.textContent).toContain('No active chat');
    expect(root.querySelector('.pc-messages'), 'and renders no thread').toBeNull();
  });
});

describe('Load More, and the rule that a filtered log is not a paged one', () => {
  it('appears once the log reaches a full page', () => {
    const { root } = render({ tabs: [tab({ uid: 1 })], currentUserId: 1, log: fullPage() });
    expect(root.querySelector('.badge-warning')?.textContent?.trim()).toBe('Load More');
  });

  it('does NOT appear below a full page, because there is nothing older to ask for', () => {
    const { root } = render({
      tabs: [tab({ uid: 1 })],
      currentUserId: 1,
      log: fullPage().slice(0, 49)
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
      searching: true
    });
    expect(root.querySelector('.badge-warning')).toBeNull();
  });

  it('asks for the page AFTER the one it is showing', () => {
    // 50 rows held is page 0; the next request is page 1. `floor(length / 50)`.
    const { root, calls } = render({ tabs: [tab({ uid: 9 })], currentUserId: 9, log: fullPage() });
    root.querySelector<HTMLElement>('.badge-warning')?.click();
    flushSync();
    expect(calls.loadmore).toEqual([[9, 1]]);
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
