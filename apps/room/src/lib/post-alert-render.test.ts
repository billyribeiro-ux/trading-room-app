import { readFileSync } from 'node:fs';
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
      onconfirm: () => {},
      onpost: async () => true,
      onpastepost: async () => true
    }
  });
  return elements(parseFragment(body) as unknown as HtmlNode);
}

describe('PAM-12 — `aria-selected` is DERIVED here, and the capture hardcodes TWO of them true', () => {
  /*
    ── A DIVERGENCE THAT WAS CORRECT AND UNRECORDED, WRITTEN DOWN 2026-09-01 ──────────────────────

    The case below has always asserted one selected tab and two unselected, which is right — but it
    asserted it as if it were the capture, and it is not. `app-post-alert-modal`'s consts:

    ```js
     8  ["id","nav-tab-text",…,"aria-selected","true",1,"nav-item","nav-link","active",3,"click"]
     9  ["id","nav-tab-url", …,"aria-selected","true",1,"nav-item","nav-link",3,"click"]
    10  ["id","nav-tab-img", …,"aria-selected","false",1,"nav-item","nav-link",3,"click"]
    ```

    TWO anchors are hardcoded `"true"`, and the update block never writes the attribute — the only
    per-anchor binding is the `click`. So the reference announces two simultaneously selected tabs and
    stops announcing either when the third is showing.

    This is `MTS-06` again, one component over: `main-tab-strip-gates.svelte.test.ts` records the same
    defect across EIGHT anchors in `app-presentationarea`, five of them true at once. Finding it twice
    is what makes it worth a shared name — a hardcoded `aria-selected` beside an `ngClass`-driven
    `active` is a pattern in this codebase's reference, not an accident in one component.

    Reproducing it would reproduce a defect that reaches exactly the users who cannot see which tab is
    active, so it is refused. Recorded here rather than left implicit, because a correct divergence
    with no note is the one a later "match the dump" pass silently undoes.
  */
  const BUNDLE = readFileSync(
    new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url),
    'utf8'
  );

  it('reads the two hardcoded `true` anchors, and the one `false`', () => {
    expect(BUNDLE).toContain(
      '["id","nav-tab-text","data-bs-toggle","tab","href","#nav-text","role","tab",' +
        '"aria-controls","nav-text","aria-selected","true",1,"nav-item","nav-link","active",3,"click"]'
    );
    expect(BUNDLE).toContain(
      '["id","nav-tab-url","data-bs-toggle","tab","href","#nav-url","role","tab",' +
        '"aria-controls","nav-url","aria-selected","true",1,"nav-item","nav-link",3,"click"]'
    );
    expect(BUNDLE).toContain(
      '["id","nav-tab-img","data-bs-toggle","tab","href","#nav-img","role","tab",' +
        '"aria-controls","nav-img","aria-selected","false",1,"nav-item","nav-link",3,"click"]'
    );
  });

  it('and exactly one is true here, on every tab, which is the divergence', () => {
    /*
      All three tabs driven, not just the default — the capture's defect is that the attribute never
      MOVES, so asserting only the initial render would pass against a hardcoded set too.
    */
    for (const [selected, expected] of [
      ['text', 'nav-tab-text'],
      ['url', 'nav-tab-url'],
      ['media', 'nav-tab-img']
    ] as const) {
      const nodes = renderModal(selected);
      const tabs = ['nav-tab-text', 'nav-tab-url', 'nav-tab-img'].map((id) =>
        attributes(byId(nodes, id) ?? {})
      );
      const chosen = tabs.filter((tab) => tab['aria-selected'] === 'true');
      expect(chosen, `exactly one tab may be selected with ${selected} showing`).toHaveLength(1);
      expect(attributes(byId(nodes, expected) ?? {})['aria-selected']).toBe('true');
    }
  });
});

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
