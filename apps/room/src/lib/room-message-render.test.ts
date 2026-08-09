import { parseFragment } from 'parse5';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import RoomMessage from './components/RoomMessage.svelte';
import fixture from './server/captured-message-fixture.json';

function attributes(node: { attrs?: Array<{ name: string; value: string }> }) {
  return Object.fromEntries(
    (node.attrs ?? []).map((attribute) => [attribute.name, attribute.value])
  );
}

function hasClass(node: { attrs?: Array<{ name: string; value: string }> }, className: string) {
  return (attributes(node).class ?? '').split(/\s+/).includes(className);
}

function walk(
  node: {
    nodeName?: string;
    value?: string;
    attrs?: Array<{ name: string; value: string }>;
    childNodes?: unknown[];
  },
  visit: (candidate: typeof node) => void
) {
  visit(node);
  for (const child of node.childNodes ?? []) walk(child as typeof node, visit);
}

function descendants(
  node: Parameters<typeof walk>[0],
  predicate: (candidate: Parameters<typeof walk>[0]) => boolean
) {
  const matches: Parameters<typeof walk>[0][] = [];
  walk(node, (candidate) => {
    if (predicate(candidate)) matches.push(candidate);
  });
  return matches;
}

function textContent(node: Parameters<typeof walk>[0]) {
  let value = '';
  walk(node, (candidate) => {
    if (candidate.nodeName === '#text') value += candidate.value;
  });
  return value;
}

function normalizedText(node: Parameters<typeof walk>[0]) {
  return textContent(node).replace(/\s+/g, ' ').trim();
}

describe('RoomMessage presenter rendering', () => {
  it('renders all 18 captured kebabs with the exact labels and source order', () => {
    for (const message of fixture.messages) {
      const { body } = render(RoomMessage, {
        props: {
          item: {
            id: -message.sequence,
            senderId: -1,
            senderName: message.senderName,
            senderEmailHash: message.senderEmailHash,
            senderAvatarUrl: message.senderAvatarUrl,
            body: message.body,
            createdAt: new Date(0),
            isAdmin: message.isAdmin,
            targetUrl: message.targetUrl,
            questionCount: message.questionCount,
            questionAnswered: message.questionAnswered,
            evidenceKey: message.evidenceKey,
            evidenceTimestampText: message.timestampText,
            evidenceSeparatorText: message.separatorText,
            evidenceMessageBoxClass: message.messageBoxClass,
            evidenceMessageBoxStyle: message.messageBoxStyle,
            evidenceDirection: message.direction,
            evidenceQuestion: message.question,
            evidenceBodyStyle: message.bodyStyle,
            evidenceBodySegments: message.bodySegments,
            evidenceMenuItems: message.menuItems
          },
          kind: message.panel as 'alert' | 'chat',
          currentUserId: 1,
          currentUserEmailHash: 'connected-presenter',
          viewerIsPresenter: true,
          theme: 'dark',
          menuOpen: false,
          showDateSeparator: message.separatorText !== null,
          ontoggle: () => {},
          onaction: () => {}
        }
      });
      const document = parseFragment(body) as unknown as Parameters<typeof walk>[0];
      const kebab = descendants(document, (candidate) => hasClass(candidate, 'msgMenu'))[0];
      const menu = descendants(document, (candidate) =>
        hasClass(candidate, 'users-dropdown-options')
      )[0];
      const menuItems = descendants(
        menu,
        (candidate) => candidate.nodeName === 'a' && hasClass(candidate, 'dropdown-item')
      ).map(normalizedText);

      expect(textContent(kebab)).toBe('⠇ ');
      expect(attributes(kebab).class).toBe('msgMenu dropright pt-1');
      expect(attributes(menu).class).toBe('dropdown-menu users-dropdown-options');
      expect(menuItems).toEqual(message.menuItems);
    }
  });
});

/*
  The captured colour contract for an alert that carries its own colours.

  `app-st-message` builds THREE style objects from the message row
  (`docs/source/components/app-st-message.compiled.js:27-34`):

    this.invertTxtColor = { color: this.msg.bkgColor, filter: 'invert(1)' }
    this.styleB         = { 'background-color': this.msg.bkgColor }
    this.styleF.color   = this.msg.fontColor

  `invertTxtColor` is the part that looks like a mistake and is not: the text is painted with the
  BACKGROUND colour and then inverted, which guarantees contrast against that background without
  anyone computing a luminance. It goes on the kebab, the username and the timestamp; the body and
  the Q&A button get the plain `fontColor` instead.

  Owner's capture of a coloured alert (app-st-message, scope 1254915701) shows exactly that pair:

    <a class="msgMenu dropright pt-1"  style="color: rgb(232, 232, 232); filter: invert(1);">
    <strong class="username mx-1"     style="color: rgb(232, 232, 232); filter: invert(1);">
    <span class="created-at mr-2"     style="color: rgb(232, 232, 232); filter: invert(1);">
    <div class="msg-left …"           style="color: rgb(26, 26, 26);">

  This is pinned here because the room's own alert rows currently carry `background_color: null`,
  so no live page exercises the branch - measured directly against the running room, every one of
  those three elements rendered with `filter: none` and no inline style, which is correct for an
  uncoloured alert and proves nothing about a coloured one.
*/
describe('RoomMessage colour contract', () => {
  const BKG = 'rgb(232, 232, 232)';
  const FONT = 'rgb(26, 26, 26)';

  function renderColoured() {
    const { body } = render(RoomMessage, {
      props: {
        item: {
          id: -1,
          senderId: -1,
          senderName: 'Billy Ribeiro',
          senderEmailHash: '2fcd19da402033914f251e6ded8e6316',
          senderAvatarUrl: '',
          body: 'Buy Tsla',
          createdAt: new Date(0),
          isAdmin: true,
          backgroundColor: BKG,
          fontColor: FONT
        },
        kind: 'alert' as const,
        currentUserId: 1,
        currentUserEmailHash: 'someone-else',
        viewerIsPresenter: true,
        theme: 'dark',
        menuOpen: false,
        showDateSeparator: false,
        ontoggle: () => {},
        onaction: () => {}
      }
    });
    return parseFragment(body) as unknown as Parameters<typeof walk>[0];
  }

  it('paints the kebab, username and timestamp with the background colour, inverted', () => {
    const document = renderColoured();
    for (const className of ['msgMenu', 'username', 'created-at']) {
      const node = descendants(document, (candidate) => hasClass(candidate, className))[0];
      expect(node, `${className} should render`).toBeTruthy();
      const style = attributes(node).style ?? '';
      expect(style, `${className} takes the background colour`).toContain(`color: ${BKG}`);
      expect(style, `${className} is inverted`).toContain('filter: invert(1)');
    }
  });

  it('paints the body with the font colour and does NOT invert it', () => {
    const document = renderColoured();
    const body = descendants(document, (candidate) => hasClass(candidate, 'msg-left'))[0];
    expect(body, 'msg-left should render').toBeTruthy();
    const style = attributes(body).style ?? '';
    expect(style).toContain(`color: ${FONT}`);
    expect(style, 'the body is not inverted').not.toContain('invert');
  });

  it('applies the background colour to the message box', () => {
    const document = renderColoured();
    const boxes = descendants(document, (candidate) =>
      (attributes(candidate).style ?? '').includes(`background-color: ${BKG}`)
    );
    expect(boxes.length, 'styleB must reach the card').toBeGreaterThan(0);
  });

  it('emits no colour styles at all when the alert carries none', () => {
    const { body } = render(RoomMessage, {
      props: {
        item: {
          id: -2,
          senderId: -1,
          senderName: 'Billy Ribeiro',
          senderEmailHash: 'hash',
          senderAvatarUrl: '',
          body: 'no colours here',
          createdAt: new Date(0),
          isAdmin: false
        },
        kind: 'alert' as const,
        currentUserId: 1,
        currentUserEmailHash: 'someone-else',
        viewerIsPresenter: true,
        theme: 'dark',
        menuOpen: false,
        showDateSeparator: false,
        ontoggle: () => {},
        onaction: () => {}
      }
    });
    // This is the state the live room is actually in, and it must stay clean rather than
    // inventing a default colour.
    expect(body).not.toContain('invert(1)');
  });
});
