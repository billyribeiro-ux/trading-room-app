import { parseFragment } from 'parse5';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import PostAlertModal from './components/PostAlertModal.svelte';

interface HtmlNode {
  nodeName?: string;
  tagName?: string;
  value?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: HtmlNode[];
}

function attributes(node: HtmlNode) {
  return Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
}

function walk(node: HtmlNode, visit: (candidate: HtmlNode) => void) {
  visit(node);
  for (const child of node.childNodes ?? []) walk(child, visit);
}

function elements(node: HtmlNode) {
  const result: HtmlNode[] = [];
  walk(node, (candidate) => {
    if (candidate.tagName) result.push(candidate);
  });
  return result;
}

function byId(nodes: HtmlNode[], id: string) {
  return nodes.find((node) => attributes(node).id === id);
}

function textContent(node: HtmlNode) {
  let value = '';
  walk(node, (candidate) => {
    if (candidate.nodeName === '#text') value += candidate.value;
  });
  return value.replace(/\s+/g, ' ').trim();
}

function renderModal(tab: 'text' | 'url' | 'media') {
  const { body } = render(PostAlertModal, {
    props: {
      open: true,
      tab,
      onclose: () => {},
      ontab: () => {},
      onalert: () => {},
      onpost: async () => true,
      onpastepost: async () => true
    }
  });
  return elements(parseFragment(body) as unknown as HtmlNode);
}

describe('Post Alert rendered evidence contract', () => {
  it('renders the captured open modal, exact default tab, controls, and labels', () => {
    const nodes = renderModal('text');
    const root = byId(nodes, 'alert-modal');

    expect(attributes(root ?? {})).toMatchObject({
      id: 'alert-modal',
      tabindex: '-1',
      role: 'dialog',
      'aria-labelledby': 'post-alert',
      'aria-modal': 'true',
      class: 'modal fade show',
      style: 'display: block;'
    });
    expect(textContent(byId(nodes, 'post-alert') ?? {})).toBe('Post Alert');

    expect(attributes(byId(nodes, 'nav-tab-text') ?? {})).toMatchObject({
      class: 'nav-item nav-link active',
      'aria-selected': 'true'
    });
    expect(attributes(byId(nodes, 'nav-tab-url') ?? {})).toMatchObject({
      class: 'nav-item nav-link',
      'aria-selected': 'false'
    });
    expect(attributes(byId(nodes, 'nav-tab-img') ?? {})).toMatchObject({
      class: 'nav-item nav-link',
      'aria-selected': 'false'
    });
    expect(attributes(byId(nodes, 'nav-text') ?? {}).class).toBe('tab-pane fade show active');

    expect(textContent(byId(nodes, 'nav-tab-text') ?? {})).toBe('Text Alert');
    expect(textContent(byId(nodes, 'nav-tab-url') ?? {})).toBe('Text Url');
    expect(textContent(byId(nodes, 'nav-tab-img') ?? {})).toBe('Image / GIF / Video');
    expect(textContent(byId(nodes, 'filedragAlert') ?? {})).toBe('or drop an image here');

    expect(
      [
        'keepOpenChk',
        'postOnXChk',
        'alert-push-label',
        'alert-non-trade-label',
        'alert-legal-disclosure-label'
      ].map((id) => attributes(byId(nodes, id) ?? {}).type)
    ).toEqual(['checkbox', 'checkbox', 'checkbox', 'checkbox', 'checkbox']);
    expect(byId(nodes, 'alert-legal-disclosure-text')).toBeUndefined();

    const postButton = nodes.find(
      (node) =>
        node.tagName === 'button' &&
        attributes(node).class === 'btn btn-success' &&
        textContent(node) === 'Post Alert'
    );
    expect(attributes(postButton ?? {})).toEqual({ class: 'btn btn-success' });
  });

  it('moves active styling and ARIA state together for the media tab', () => {
    const nodes = renderModal('media');

    expect(attributes(byId(nodes, 'nav-tab-text') ?? {})['aria-selected']).toBe('false');
    expect(attributes(byId(nodes, 'nav-tab-img') ?? {})).toMatchObject({
      class: 'nav-item nav-link active',
      'aria-selected': 'true'
    });
    expect(attributes(byId(nodes, 'nav-img') ?? {}).class).toBe('tab-pane fade active show');
  });
});
