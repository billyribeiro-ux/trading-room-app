import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { tipButtonFor } from './tip-button.js';

/**
 * The "tip me" button — one feature, three settings, and a URL that is checked rather than trusted.
 *
 * `isTipEnabled = sessData.tipMeBtnEnabled && sessData.tipMeBtnUrl && sessData.tipMeBtnTxt`
 * (bundle byte 2,509,187), drawn at two sites in the sidebar and opened by
 * `doTipToUser() { tipMeBtnUrl && window.open(tipMeBtnUrl, "_blank") }` (2,531,907).
 */
describe('the three-way gate', () => {
  const full = { tipMeBtnEnabled: true, tipMeBtnUrl: 'https://tip.test/me', tipMeBtnTxt: 'Tip me' };

  it('draws when all three are set', () => {
    expect(tipButtonFor(full)).toEqual({
      visible: true,
      label: 'Tip me',
      url: 'https://tip.test/me'
    });
  });

  /*
    EACH TERM REMOVED IN TURN, because a conjunction tested only in full is a conjunction that can
    lose a term without anything noticing. Two of the three failures are visible ones: a button with
    no label, and a button that opens nothing.
  */
  it('draws nothing when the switch is off', () => {
    expect(tipButtonFor({ ...full, tipMeBtnEnabled: false }).visible).toBe(false);
  });

  it('draws nothing without a label, which would be a nameless button', () => {
    expect(tipButtonFor({ ...full, tipMeBtnTxt: '' }).visible).toBe(false);
    // …and whitespace is not a label.
    expect(tipButtonFor({ ...full, tipMeBtnTxt: '   ' }).visible).toBe(false);
  });

  it('draws nothing without a destination, which would be an inert button', () => {
    expect(tipButtonFor({ ...full, tipMeBtnUrl: '' }).visible).toBe(false);
  });

  it('draws nothing for an unconfigured room', () => {
    for (const settings of [null, undefined, {}]) {
      expect(tipButtonFor(settings).visible).toBe(false);
    }
  });

  /*
    THE SWITCH IS STRICT. It arrives as JSON over an internal HTTP hop, and a truthy `"false"`
    turning on a button that opens an external link is the wrong direction to be loose in.
  */
  it.each(['false', 'true', 1, {}])('refuses %o as the switch', (value) => {
    const settings = { ...full, tipMeBtnEnabled: value } as typeof full;
    expect(tipButtonFor(settings).visible).toBe(false);
  });
});

/*
  THE URL CHECK, which is this room's own decision and not a transcription.

  The reference opens whatever is stored. A `javascript:` URL there executes in every member's page
  with the room's origin, and an owner-facing settings form is not where that guarantee should come
  from. Parsed with `new URL` rather than pattern-matched, because a regex over a user-supplied URL
  is the check that misses the encoded and whitespace-split forms.
*/
describe('the destination is checked, not trusted', () => {
  const withUrl = (tipMeBtnUrl: string) =>
    tipButtonFor({ tipMeBtnEnabled: true, tipMeBtnTxt: 'Tip me', tipMeBtnUrl });

  it.each(['https://tip.test/me', 'http://tip.test/me', 'https://tip.test/me?a=1#b'])(
    'opens %s',
    (url) => {
      expect(withUrl(url).visible).toBe(true);
    }
  );

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    '  javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'not a url at all',
    '//tip.test/me'
  ])('refuses %s and draws no button', (url) => {
    const tip = withUrl(url);
    expect(tip.visible).toBe(false);
    // …and hands back no url, so a call site cannot open something this function rejected.
    expect(tip.url).toBe('');
  });
});

describe('both render sites', () => {
  const sidebar = readFileSync(new URL('./components/RoomSidebar.svelte', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

  /*
    TWO SITES, ONE ANSWER. The reference draws this button twice — slot 13 in the app-info block and
    slot 14 beside Benzinga — and both read the single `isTipEnabled` field. Asserting the count is
    what stops a later edit from adding a third site that re-evaluates the three settings itself.
  */
  it('both read the resolved answer and never the settings', () => {
    expect(sidebar.split('{#if tip.visible}')).toHaveLength(3);
    const code = sidebar.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const setting of ['tipMeBtnEnabled', 'tipMeBtnUrl', 'tipMeBtnTxt']) {
      expect(code, `the sidebar must not re-read ${setting}`).not.toContain(setting);
    }
  });

  it('carries the captured classes at both sites', () => {
    // Consts 34/35/36 and 139/140.
    expect(sidebar).toContain('class="btn btn-primary btn-sm"');
    expect(sidebar).toContain('class="d-flex align-items-center btn btn-primary btn-sm"');
    expect(sidebar.split('<i class="fas fa-dollar-sign"></i>')).toHaveLength(3);
    expect(sidebar.split('<span class="ms-1">{tip.label}</span>')).toHaveLength(3);
  });

  it('binds the label to the title attribute as well as the text', () => {
    // `xn("title", tipMeBtnTxt)` at both sites — upstream's own doubling.
    expect(sidebar.split('title={tip.label}')).toHaveLength(3);
  });

  it('is resolved on the page and handed down', () => {
    expect(page).toContain('tip={tipButtonFor(data.sessData)}');
    expect(sidebar).toContain('tip: TipButton;');
  });

  /*
    THE SECOND SITE IS A LINK, NOT A CLICKABLE `<li>`, and that divergence is asserted so it cannot
    be "corrected" back. Upstream binds the click to the `li` (const 139 carries `3,"click"`), which
    is neither focusable nor reachable by keyboard. The classes and the nesting are unchanged.
  */
  it('makes the second site keyboard-reachable', () => {
    expect(sidebar).toContain('rel="noopener noreferrer"');
    expect(sidebar).not.toContain('<li class="nav-item" onclick=');
  });
});
