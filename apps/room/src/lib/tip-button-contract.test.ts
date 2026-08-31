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
  /*
    The navbar's copy moved to `NavbarTipButton.svelte` on 2026-08-31 — one of three regions
    extracted to pay for four `NAV-` rows while `RoomNavbar` sat at its ceiling. This reads the file
    that OWNS the markup rather than the file that hosts the component, which is what these
    assertions have always been about: a render site, wherever it lives.
  */
  const navbar = readFileSync(
    new URL('./components/NavbarTipButton.svelte', import.meta.url),
    'utf8'
  );
  const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

  /*
    TWO SITES, ONE ANSWER, AND THEY ARE IN TWO DIFFERENT FILES — corrected 2026-08-31.

    ## What this asserted before, and why it was wrong

    Both sites were asserted against `RoomSidebar.svelte`, on the reading that the reference draws
    the button twice in the sidebar: slot 13 in the app-info block and slot 14 beside Benzinga.

    SIDE-01 measured that and it does not hold. Node 14 and consts 139/140 belong to `U4e`, the
    `app-room` NAVBAR, at bundle byte 2,485,267. The sidebar is `TPe`, read end to end from 2,470,562
    to 2,472,257, and its own node 14 is `T(14,"hr")` — there is no tip `<li>` in it at any slot. The
    one tip the sidebar has is `aPe` at byte 2,466,601, the `<p><button>` gated
    `O(13, isTipEnabled ? 13 : -1)`.

    So the reference renders it twice in the ROOM, once per file — and this repository was rendering
    it THREE times, because RS-09 added the navbar's missing copy on 2026-08-30 without removing the
    stray sidebar `<li>` it had measured in the same breath. This file's assertions were green
    throughout, because counting both sites in one file is satisfied by two in the wrong places.

    ## Why the count is per file now

    A site count within one file cannot express "one here and one there", which is the property that
    actually matters: a third render appears by a copy landing in EITHER file, and the old shape
    could only see one of them. `sidebar-tip-single-render-contract.test.ts` pins the same invariant
    from the other direction, so a copy added to either file fails something.
  */
  it('both read the resolved answer and never the settings', () => {
    expect(sidebar.split('{#if tip.visible}'), 'the sidebar draws it exactly once').toHaveLength(2);
    expect(navbar.split('{#if tip.visible}'), 'and so does the navbar').toHaveLength(2);
    const code = sidebar.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const setting of ['tipMeBtnEnabled', 'tipMeBtnUrl', 'tipMeBtnTxt']) {
      expect(code, `the sidebar must not re-read ${setting}`).not.toContain(setting);
    }
    const navbarCode = navbar.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const setting of ['tipMeBtnEnabled', 'tipMeBtnUrl', 'tipMeBtnTxt']) {
      expect(navbarCode, `the navbar must not re-read ${setting}`).not.toContain(setting);
    }
  });

  it('carries the captured classes, each at the site the capture puts it', () => {
    /* `aPe` consts 34/35/36 in the sidebar; `U4e` consts 139/140 in the navbar. */
    expect(sidebar).toContain('class="btn btn-primary btn-sm"');
    expect(sidebar, 'the navbar’s anchor form does not belong here').not.toContain(
      'class="d-flex align-items-center btn btn-primary btn-sm"'
    );
    expect(navbar).toContain('class="d-flex align-items-center btn btn-primary btn-sm"');

    for (const [name, source] of [
      ['sidebar', sidebar],
      ['navbar', navbar]
    ] as const) {
      expect(source.split('<i class="fas fa-dollar-sign"></i>'), `${name} icon`).toHaveLength(2);
      expect(source.split('<span class="ms-1">{tip.label}</span>'), `${name} label`).toHaveLength(
        2
      );
    }
  });

  it('binds the label to the title attribute as well as the text', () => {
    /*
      `xn("title", tipMeBtnTxt)` at both sites — upstream's own doubling.

      Read from CODE rather than from the raw file: the sidebar carries a second `title={tip.label}`
      inside the SIDE-01 comment, quoting the markup that was removed. Counting the raw text would
      make that comment vote.
    */
    const code = (source: string) =>
      source.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code(sidebar).split('title={tip.label}')).toHaveLength(2);
    expect(code(navbar).split('title={tip.label}')).toHaveLength(2);
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
