import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { activateOnKey } from './screen-share-menu';
import { codeOf } from './source-comments';

/**
 * SSM-1, SSM-2, SSM-3 — the navbar's Start/Stop Screen Sharing dropdown, read 2026-08-31.
 *
 * ## What was found, and why four attributes are OURS
 *
 * The whole control had no keyboard path. Upstream every row is
 * `<li title=… (click)=…><a aria-hidden="true">label</a></li>` — `app-room`'s consts 185/186/187
 * carry the click, const 158 is a bare `["aria-hidden","true"]` — and the trigger is const 182, an
 * `<a>` with `data-bs-toggle="dropdown"` and no `href`. Transcribed faithfully that is a control in
 * which nothing is focusable and nothing has a name: an `<a>` without `href` is out of the tab
 * order, an `<li>` is never in it, and the only text-bearing node per row is explicitly hidden from
 * assistive technology. `#lib/screen-share-menu.js` carries the argument; this file is the gate.
 *
 * Upstream survives it because Bootstrap's dropdown plugin adopts the trigger and gives it keyboard
 * behaviour. `bootstrap-dropdown-contract.test.ts` measures that **no app in this repository
 * depends on `bootstrap`**, so `data-bs-toggle` is inert here and the control was mouse-only — for
 * a presenter, on the button that starts and stops their broadcast.
 *
 * ## Why the assertions read the SNIPPET rather than each row
 *
 * The six rows are one `{#snippet entry(...)}` now. That is the point of the change as much as the
 * attributes are: four attributes and a key handler repeated six times are four attributes and a
 * key handler that will be missing from the seventh. So the assertions below check that the snippet
 * carries all of them AND that every row goes through it — a row written out longhand beside the
 * snippet would satisfy the first alone.
 *
 * ## Two details of the snippet itself, both measured
 *
 * `label` carries the capture's own leading and trailing spaces and is passed through untouched —
 * `" Stop Sharing All Screens"`, `"Share Screen "`, `" OBS / XSPLIT/ Share Virtual Cam"` — while
 * `aria-label` trims them, because a name is a name and the padding is evidence about the rendered
 * string rather than about the control.
 *
 * The badge is `{@render badge?.()}` and not `{#if badge}{@render badge()}{/if}`. Measured on a
 * throwaway component through `svelte/server`: the optional render emits ONE `<!---->` anchor where
 * the conditional block emits a `<!--[-->` / `<!--]-->` pair. An anchor left where a collapsed
 * conditional was is exactly what the Angular reference leaves throughout, so the closer shape is
 * also the smaller one. `NoteTabContent` went the other way for the same measurement and says why
 * at its own snippet: its icon sits INSIDE the label text, where `notes-pane-render.test.ts`
 * asserts `<i class="fas fa-edit"></i> Edit Note` contiguously, and one anchor there would break it.
 *
 * ## The byte offsets in that component's docblock were wrong, and are checked here
 *
 * All four template offsets it cited were 47 to 100 too high, and every one landed INSIDE the
 * function it named rather than outside it — which is why they survived six passes: opening the
 * offset shows plausible code from the right template. The four `indexOf` results are asserted
 * below so the corrected numbers cannot drift back.
 *
 * ## Negative controls, run before this file was committed
 *
 * * `tabindex="0"` deleted from the snippet → "gives every row a name and a way in" goes RED.
 * * `onkeydown` deleted from the trigger → "the trigger itself is reachable" goes RED.
 * * one `{@render entry(...)}` replaced by a longhand `<li>` → "every row goes through it" goes RED
 *   on the count, which is why the count is asserted rather than a `toContain`.
 * * `activateOnKey`'s `event.key !== ' '` term dropped → the Space case goes RED.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MENU_RAW = readFileSync(`${ROOT}lib/components/ScreenShareMenu.svelte`, 'utf8');
/**
 * The markup with its comments stripped, because this file's own docblock QUOTES `<li>` twice and
 * a raw count answered 4 where the markup holds 2. `source-comments.ts` exists for exactly that.
 */
const MENU = codeOf('lib/components/ScreenShareMenu.svelte', MENU_RAW);

const BUNDLE = readFileSync(
  fileURLToPath(
    new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url)
  ),
  'utf8'
);

/**
 * The `{#snippet entry(...)}` block, bound at both ends before it is sliced.
 *
 * `indexOf` answers -1 on failure and -1 is a legal `slice` argument, which turns a missing anchor
 * into a silently different string rather than into a failure — the shape
 * `slice-anchor-contract.test.ts` ratchets down.
 */
const entrySnippet = () => {
  const start = MENU.indexOf('{#snippet entry(');
  expect(start, 'the entry snippet was renamed or removed').toBeGreaterThan(-1);
  const end = MENU.indexOf('{/snippet}', start);
  expect(end, 'the entry snippet is unterminated').toBeGreaterThan(start);
  return MENU.slice(start, end);
};

describe('SSM-1 — the menu can be opened and driven from the keyboard', () => {
  it('the trigger itself is reachable, named and operable', () => {
    const start = MENU.indexOf('id="dropdownScreenSharing"');
    expect(start, 'the trigger anchor moved').toBeGreaterThan(-1);
    const end = MENU.indexOf('</a>', start);
    expect(end, 'the trigger anchor is unterminated').toBeGreaterThan(start);
    const trigger = MENU.slice(start, end);
    expect(trigger).toContain('role="button"');
    expect(trigger).toContain('tabindex="0"');
    expect(trigger).toContain('onkeydown={(event) => activateOnKey(event, ontoggle)}');
    /* The captured attributes are still all there — this is an addition, not a replacement. */
    expect(trigger).toContain('data-bs-toggle="dropdown"');
    expect(trigger).toContain('aria-haspopup="true"');
    expect(trigger).toContain('aria-expanded={menuOpen}');
    expect(trigger).toContain('Start/Stop Screen Sharing');
  });

  it('gives every row a name and a way in, once, in the snippet', () => {
    const snippet = entrySnippet();
    expect(snippet).toContain('role="menuitem"');
    expect(snippet).toContain('tabindex="0"');
    expect(snippet).toContain('aria-label={label.trim()}');
    expect(snippet).toContain('onkeydown={(event) => activateOnKey(event, run)}');
    /*
      And `aria-hidden` STAYS on the anchor. It is captured, and with the name now on the `<li>` it
      stops the label being announced twice rather than hiding it. Removing it would be a divergence
      nobody argued for.
    */
    expect(snippet).toContain('<a aria-hidden="true">');
  });

  it('routes every row through that one snippet', () => {
    /*
      A count, not a `toContain`. The failure this guards is a SEVENTH row written longhand beside
      the snippet, which every attribute assertion above would still pass.
    */
    expect([...MENU.matchAll(/\{@render entry\(/g)]).toHaveLength(6);
    /* Six rows and no other `<li>` in the menu body — the outer nav item is the only one left. */
    expect([...MENU.matchAll(/<li\b/g)]).toHaveLength(2);
  });

  it('marks the list as the menu those items belong to', () => {
    const start = MENU.indexOf('aria-labelledby="dropdownScreenSharing"');
    expect(start, 'the menu list moved').toBeGreaterThan(-1);
    expect(MENU.slice(start - 200, start)).toContain('role="menu"');
  });

  it('activates on Enter and Space, and on nothing else', () => {
    const pressed: string[] = [];
    const press = (key: string) => {
      let prevented = false;
      /*
        A hand-built event, cast through `unknown` because it carries the two members the handler
        reads and none of the other 37. That is the point of a unit here rather than a rendered
        component: this asserts the RULE, and the markup assertions above assert it is wired.
      */
      activateOnKey(
        { key, preventDefault: () => (prevented = true) } as unknown as KeyboardEvent,
        () => pressed.push(key)
      );
      return prevented;
    };
    expect(press('Enter')).toBe(true);
    expect(press(' ')).toBe(true);
    expect(press('a')).toBe(false);
    expect(press('Escape')).toBe(false);
    expect(pressed).toEqual(['Enter', ' ']);
  });
});

describe('SSM-2 — all six clicks sit on the list item, where the capture splits them', () => {
  it('reads both halves of the split out of the bundle', () => {
    /* The first three: the click is on the `<li>`, consts 185/186/187. */
    expect(BUNDLE).toContain('["title","(Regular Bandwidth) ** RECOMMENDED",3,"click"]');
    expect(BUNDLE).toContain('["title","OBS",3,"click"]');
    expect(BUNDLE).toContain('["title","OBS / RTMP / Stream / Restream",3,"click"]');
    /* The last three: a bare `<li>` and the click on the anchor, const 163. */
    expect(BUNDLE).toContain('["aria-hidden","true",3,"click"]');
    expect(BUNDLE).toContain('d(2,"li")(3,"a",163)');
  });

  it('puts the handler on the list item here, for all six', () => {
    const snippet = entrySnippet();
    expect(snippet).toContain('onclick={run}');
    /* And never on the anchor, which is the node `aria-hidden` is on. */
    expect(snippet).not.toContain('<a aria-hidden="true" onclick');
  });
});

describe('SSM-3 — the four corrected byte offsets, and none of the six is inert upstream', () => {
  it('places the four templates where the component now says they are', () => {
    expect(BUNDLE.indexOf('function a4e(')).toBe(2479414);
    expect(BUNDLE.indexOf('function l4e(')).toBe(2479632);
    expect(BUNDLE.indexOf('function c4e(')).toBe(2479832);
    expect(BUNDLE.indexOf('function d4e(')).toBe(2480013);
  });

  it('quotes those four numbers in the component, and none of the old ones', () => {
    for (const corrected of ['2,479,414', '2,479,632', '2,479,832', '2,480,013']) {
      expect(MENU_RAW, `${corrected} is missing from the entry table`).toContain(corrected);
    }
    /*
      The four wrong numbers are still NAMED in that docblock, deliberately — a correction nobody
      can see is a correction that gets re-made. What must not come back is a wrong number in the
      TABLE, so each is asserted to appear exactly once, in the sentence that says it was wrong.
    */
    for (const wrong of ['2,479,514', '2,479,700', '2,479,924', '2,480,060']) {
      expect([...MENU_RAW.matchAll(new RegExp(wrong, 'g'))]).toHaveLength(1);
    }
  });

  it('finds a real body behind every one of the six upstream handlers', () => {
    /*
      The `StreamTabs` pass found four controls in the stream tab that are inert UPSTREAM. This is
      the same check for these six, and all six pass it: each name below occurs more than once in
      the bundle, so each has a definition as well as a call.
    */
    for (const handler of [
      'startScreenSharing',
      'stopSharingAll',
      'stopSharingProducer',
      'openStreamingTab',
      'reopenPreviewWindow'
    ]) {
      const hits = [...BUNDLE.matchAll(new RegExp(handler, 'g'))];
      expect(
        hits.length,
        `${handler} occurs ${hits.length} times — a call with no body`
      ).toBeGreaterThan(1);
    }
    /* And no `console.error("TODO` body anywhere near this menu, which is what the stream tab had. */
    expect(BUNDLE.slice(2479000, 2481000)).not.toContain('TODO');
  });
});
