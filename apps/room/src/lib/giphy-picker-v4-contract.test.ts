import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import GiphyPicker from './components/GiphyPicker.svelte';
import { giphySearchUrl, imageBox } from './giphy-search.js';

/**
 * `GiphyPicker.svelte` against the PINNED v4 bundle — the four hosts that share it, decoded by
 * value rather than generalised from the one whose offset happened to be in the comment.
 *
 * Rendered with `render` from `svelte/server`: this component's whole job is markup and geometry,
 * and its `{@attach}` portal is a browser concern that does not run during SSR anyway.
 */
const BUNDLE = readFileSync(
  new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url),
  'utf8'
);

const PICKER = readFileSync(new URL('./components/GiphyPicker.svelte', import.meta.url), 'utf8');
const CAPTURED_CSS = readFileSync(
  new URL('./styles/captured-runtime-components.css', import.meta.url),
  'utf8'
);

describe('the four hosts, and the two ways they differ', () => {
  /**
   * GIF-01 — one of the five `.giphy-search` rules is not 700px, and it is the private chat's.
   *
   * Counted rather than spot-checked, because "there is a 400px one somewhere" is satisfied by any
   * stray and the claim is about the DISTRIBUTION.
   */
  const RULE = /\.giphy-search\[_ngcontent-%COMP%\]\{[^}]*\}/g;

  it('finds six .giphy-search rules, five of them 700px and one 400px', () => {
    const rules = BUNDLE.match(RULE) ?? [];
    expect(rules).toHaveLength(6);
    expect(rules.filter((rule) => rule.includes('height:700px'))).toHaveLength(5);
    expect(rules.filter((rule) => rule.includes('height:400px'))).toHaveLength(1);
  });

  it('names the 400px one as app-privchat', () => {
    expect(BUNDLE).toContain(
      '.giphy-search[_ngcontent-%COMP%]{width:400px;height:400px;border:2px solid var(--modal-content-bg-color);background-color:#fff;overflow:hidden}'
    );
    /* The offset is app-privchat's styles blob, which begins after its own selectors block. */
    const host = BUNDLE.indexOf('selectors:[["app-privchat"]]');
    expect(host).toBeGreaterThan(-1);
    const rule = BUNDLE.indexOf('height:400px', host);
    expect(rule).toBeGreaterThan(host);
  });

  /**
   * GIF-01, the other half — the captured rule that carries 400px is scoped to `app-privchat`, and
   * this popover is portaled to `<body>`, so it cannot reach it.
   */
  it('shows every captured .giphy-search rule is host-scoped, and the picker portals out of them', () => {
    const scoped = CAPTURED_CSS.split('\n').filter((line) =>
      line.includes('.giphy-search:not(:root) {')
    );
    expect(scoped.length).toBeGreaterThan(0);
    expect(scoped.filter((line) => line.trimStart().startsWith('.giphy-search'))).toHaveLength(0);
    expect(CAPTURED_CSS).toContain('app-privchat .giphy-search:not(:root) {');
    expect(readFileSync(new URL('./giphy-popover-portal.ts', import.meta.url), 'utf8')).toContain(
      'document.body.append(node)'
    );
  });

  /**
   * GIF-02 — three of the four Giphy templates build ONE `input-group-text` span, the clear one.
   */
  it.each([
    [
      'app-privchat popover: clear only',
      'd(13,"span",73),x("click",function(){return D(e),E(g(4).clearSearchGiphy())}),T(14,"i",74)'
    ],
    [
      'app-chat popover: clear only',
      'd(13,"span",84),x("click",function(){return D(e),E(g(4).clearSearchGiphy())}),T(14,"i",85)'
    ],
    [
      'app-extra-chat popover: clear only',
      'd(13,"span",81),x("click",function(){return D(e),E(g(4).clearSearchGiphy())}),T(14,"i",82)'
    ],
    [
      'app-note MODAL: search AND clear',
      'd(12,"span",88),x("click",function(){return D(e),E(g().searchGiphy())}),T(13,"i",89),u(),d(14,"span",88),x("click",function(){return D(e),E(g().clearSearchGiphy())}),T(15,"i",90)'
    ]
  ])('%s', (_name, fragment) => {
    expect(BUNDLE).toContain(fragment);
  });

  /**
   * GIF-03 — `text-white` and `fa-2x` are the popover hosts' OWN values, not a divergence from the
   * capture. The claim they were is what this asserts against, in both directions.
   */
  it.each([
    [
      'app-privchat 73/74',
      '[1,"input-group-text","text-white",3,"click"]',
      '[1,"fa","fa-2x","fa-times"]'
    ],
    [
      'app-chat 84/85',
      '[1,"input-group-text","text-white",3,"click"]',
      '[1,"fa","fa-2x","fa-times"]'
    ],
    [
      'app-note 88/90 — the odd one out',
      '[1,"input-group-text","text-dark",3,"click"]',
      '[1,"fa","fa-times"]'
    ]
  ])('%s', (_name, span, icon) => {
    expect(BUNDLE).toContain(span);
    expect(BUNDLE).toContain(icon);
  });

  it('finds the popover span three times and the modal span once', () => {
    expect(BUNDLE.split('[1,"input-group-text","text-white",3,"click"]').length - 1).toBe(3);
    expect(BUNDLE.split('[1,"input-group-text","text-dark",3,"click"]').length - 1).toBe(1);
  });

  it('pins the input, whose `border` splits the same way', () => {
    expect(BUNDLE).toContain(
      '["type","text","placeholder","Search for a GIF","name","giphy","aria-label","Sizing example input","aria-describedby","inputGroup-sizing-sm",1,"form-control","border",3,"ngModelChange","ngModel"]'
    );
    expect(BUNDLE).toContain(
      '["type","text","placeholder","Search for a GIF","name","giphy","aria-label","Sizing example input","aria-describedby","inputGroup-sizing-sm",1,"form-control",3,"ngModelChange","ngModel"]'
    );
  });

  /** GIF-06 — the reference's trackBy, which is deliberately not transcribed. */
  it('pins the trackBy this component refuses to copy', () => {
    expect(BUNDLE).toContain('KDe=(t,n)=>n.title');
    expect(PICKER).toContain('(result.id)');
  });
});

describe('what the picker renders', () => {
  const props = { apiKey: 'k', popoverId: 'p', onclose: () => {}, onselect: () => {} };

  it('defaults to the majority height and keeps the search button for the modal consumer', () => {
    const body = render(GiphyPicker, { props }).body;
    expect(body).toContain('height: 700px');
    expect(body).toContain('fa-2x fa-search');
  });

  it('takes the private chat s 400px and drops the search span when asked', () => {
    const body = render(GiphyPicker, {
      props: { ...props, panelHeight: '400px', searchButton: false }
    }).body;
    expect(body).toContain('height: 400px');
    expect(body).not.toContain('fa-search');
    /* The CLEAR span survives — the pair the capture actually ships is one span, not zero. */
    expect(body).toContain('fa fa-2x fa-times');
  });

  it('keeps the majority hint and lets the note surface pass its own', () => {
    expect(render(GiphyPicker, { props }).body).toContain('*Double click an image to select it');
    expect(
      render(GiphyPicker, { props: { ...props, hint: '*Double click an image to insert it' } }).body
    ).toContain('insert it');
  });
});

describe('what comes back from Giphy is external, and is treated that way', () => {
  it('builds the search URL with searchParams, so an & in the term stays in the term', () => {
    const url = giphySearchUrl('KEY', 'cats & dogs');
    expect(url.searchParams.get('q')).toBe('cats & dogs');
    expect(url.searchParams.get('rating')).toBe('pg');
    expect(url.origin).toBe('https://api.giphy.com');
  });

  /**
   * GIF-05 — the result image reserves its row.
   *
   * Asserted off the source, because the grid only exists after a fetch and a server render has no
   * network. `imageBox` is unit-tested above; this is what says the component actually asks it.
   */
  it('gives the result image the box the payload states', () => {
    expect(PICKER).toContain('width={box?.width}');
    expect(PICKER).toContain('height={box?.height}');
    expect(PICKER).toContain('imageBox(result.images.downsized_large)');
    /* The reference's own const for that image, which carries neither. */
    expect(BUNDLE).toContain('[3,"dblclick","src"]');
  });

  it.each([
    ['integers', { url: 'u', width: '480', height: '270' }, { width: 480, height: 270 }],
    ['a missing height', { url: 'u', width: '480' }, null],
    ['junk', { url: 'u', width: 'wide', height: '270' }, null],
    ['zero', { url: 'u', width: '0', height: '270' }, null],
    ['a negative', { url: 'u', width: '-1', height: '270' }, null],
    ['a fraction', { url: 'u', width: '480.5', height: '270' }, null]
  ])('reads %s', (_name, image, expected) => {
    expect(imageBox(image)).toEqual(expected);
  });
});
