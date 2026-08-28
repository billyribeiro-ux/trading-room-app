import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { customPlayerUrl } from './custom-player.js';

/**
 * "Custom player URL" — an owner's own iframe INSTEAD of the room's whole screens pane.
 *
 * `O(38, sessData.customPlayerURL ? 38 : 39)` at byte 2,017,248, the two children of `div#screens`.
 * Slot 38 is `eSe` (1,918,589); slot 39 is everything else in that pane, INCLUDING the
 * `preferences.disableVideo` switch. `custom-player.ts` carries the full argument.
 */
describe('customPlayerUrl', () => {
  it.each(['https://player.example/embed', 'http://player.example/embed?a=1#b'])(
    'accepts %s',
    (url) => {
      expect(customPlayerUrl(url)).toBe(new URL(url).href);
    }
  );

  /*
    THE REFERENCE EXPLICITLY DOES NOT CHECK THIS. Its binding runs through Angular's
    `bypassSecurityTrustResourceUrl`, so the value reaches `iframe.src` unexamined. Svelte has no
    such guard to opt out of, which means the check is written rather than inherited — and it
    matters more here than for the tip button, because this iframe LOADS on arrival for every member
    rather than waiting for a click.
  */
  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    '  javascript:alert(1)',
    'data:text/html,<h1>x</h1>',
    'file:///etc/passwd',
    'not a url',
    '//player.example/embed',
    '',
    '   '
  ])('refuses %o, and the room keeps its own screens pane', (url) => {
    expect(customPlayerUrl(url)).toBeNull();
  });

  it.each([undefined, null])('treats %o as a room that configured none', (value) => {
    expect(customPlayerUrl(value)).toBeNull();
  });
});

/*
  THE PANE, rendered. `PresentationArea` is large and takes many props, so this asserts on the ONE
  region the setting governs — but it asserts on MARKUP rather than source text, because the whole
  feature is which of two subtrees comes out.
*/
const area = readFileSync(new URL('./components/PresentationArea.svelte', import.meta.url), 'utf8');
const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

/**
 * Comments out — BOTH kinds, and this file needed both.
 *
 * The first draft stripped only `<!-- -->` and the refusal below matched the prop's own JSDoc, which
 * necessarily names the setting. That is the fifth time in this repository an assertion has matched
 * its own explanation, and the first where the two comment syntaxes inside one `.svelte` file were
 * the reason. A `.svelte` file has both; strip both or strip neither.
 */
const codeOf = (source: string) =>
  source.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('the screens pane', () => {
  it('replaces the WHOLE pane, save-data message included', () => {
    /*
      The gate must sit ABOVE the `videoDisabled` branch, not inside it. Upstream's slot 39 IS the
      save-data switch, so a custom player nested under it would leave a member who turned video off
      looking at "Video off to preserve data…" while the owner's player was configured — the one
      case where the two settings meet, and the one a source-order check can see.
    */
    const code = codeOf(area);
    const custom = code.indexOf('{#if customPlayerSrc}');
    const saveData = code.indexOf('{:else if videoDisabled}');
    expect(custom, 'the custom-player gate is missing').toBeGreaterThan(-1);
    expect(saveData, 'the save-data branch must be its ELSE, not its parent').toBeGreaterThan(
      custom
    );
  });

  it('carries the captured iframe attributes', () => {
    // Const 68: width 100%, height 95%, scrolling no, frameborder no, allow autoplay, allowfullscreen.
    for (const attribute of [
      'width="100%"',
      'height="95%"',
      'scrolling="no"',
      'frameborder="no"',
      'allow="autoplay"',
      'allowfullscreen'
    ]) {
      expect(area, `const 68 carries ${attribute}`).toContain(attribute);
    }
    // Const 21, the wrapper.
    expect(area).toContain('class="d-flex align-items-start justify-content-center w-100 h-100"');
  });

  it('is checked on the page rather than passed raw', () => {
    expect(page).toContain('customPlayerSrc={customPlayerUrl(data.sessData?.customPlayerURL)}');
    // The raw setting must never reach the component.
    expect(codeOf(area)).not.toContain('customPlayerURL');
  });
});

/**
 * `openLoginLink` — NOT A GAP, and the reason is worth a test rather than only a triage row.
 *
 * ```js
 * sessData.openLoginLink &&
 *   window.open(sessData.openLoginLink, "_blank",
 *               "resizable=yes,top=0,left=0,width=800,height=400")
 * ```
 *
 * Bytes 1,437,913 (main chat) and 2,384,175 (extra chat) — the SAME statement in both, at the end of
 * the chat component's init beside `chatEnabled` and `webinarMode`.
 *
 * **Two things make it a defect rather than a feature.** It runs during component initialisation
 * rather than from a click, and the options string it passes is precisely the popup shape browsers
 * block without a user gesture — the reference does not check the `null` return, so a blocked open
 * is silent. And because the statement exists in BOTH chat components, a member with the extra chat
 * column enabled gets it twice.
 *
 * The room does not reproduce it. This assertion is what stops somebody adding it later on the
 * strength of the triage list alone.
 */
describe('openLoginLink stays unbuilt', () => {
  it('opens no window on load, anywhere in the room', () => {
    for (const file of [page, area]) {
      expect(codeOf(file)).not.toContain('openLoginLink');
    }
  });

  it('and the setting does not cross the boundary', () => {
    const boundary = readFileSync(
      new URL('../../../controller/src/lib/room-config.ts', import.meta.url),
      'utf8'
    );
    expect(boundary.replace(/\/\*[\s\S]*?\*\//g, '')).not.toContain('openLoginLink');
  });
});

/*
  A positive control for the pair above: `PresentationArea` really does render, so a `not.toContain`
  on it is a statement about a file that exists and has content rather than an empty read.
*/
describe('the instrument', () => {
  it('is reading files with content in them', () => {
    expect(area.length).toBeGreaterThan(10000);
    expect(page.length).toBeGreaterThan(10000);
    expect(area).toContain('{#if customPlayerSrc}');
  });
});
