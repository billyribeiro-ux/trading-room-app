import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { pollNavAnchorClasses, WEBINAR_MODE_TRAILING_ICON_BUILT } from './alert-chat-nav.js';
import { codeOf } from './source-comments';

/**
 * `ACA-03` and `ACA-04` — two nodes of the alerts column's navbar, decoded from the template rather
 * than from the const a row named.
 *
 * `ACA-03` is a class map bound to the wrong element; `ACA-04` is an element the reference has and
 * this room deliberately does not. Both were found by walking `app-alerts`' template at byte
 * 2,055,851 against its consts table at 2,052,335, and both rest on Ivy's `advance` arithmetic, so
 * the arithmetic itself is asserted from the bundle here rather than argued in prose.
 */

const BUNDLE = new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url);

const PANE = codeOf(
  'components/AlertChatArea.svelte',
  readFileSync(new URL('./components/AlertChatArea.svelte', import.meta.url), 'utf8')
);

describe('ACA-03 — the poll indicator classes belong to the anchor', () => {
  it('reads P2e off the pinned bundle: one `m()` before the class props', () => {
    const bundle = readFileSync(BUNDLE, 'utf8');
    /*
      The template. Node 0 is the `<li>` (const 11), node 1 is the `<a>` (const 23) — and the update
      block advances exactly once before writing the two classes, so they land on node 1.
    */
    expect(bundle).toContain('d(0,"li",11)(1,"a",23)');
    expect(bundle).toContain(
      'm(),Tt("poll-active-blink",e.pollIsActive&&!e.pollIsMinimized)("poll-active-indicator",e.pollIsMinimized)'
    );
    /*
      The second, independent half: const 11 has NO binding section, so the `<li>` cannot change
      class at runtime whatever the update block selects. `3,"click"` or similar would appear here.
    */
    expect(bundle).toContain('[1,"nav-item","mx-2"]');
    expect(bundle).not.toContain('[1,"nav-item","mx-2",3,');
  });

  it('confirms the advance convention on a second, unrelated template', () => {
    /*
      `Bge` writes its first pair with NO `m()` (node 0) and its next after `m(4)` (node 4, the
      kebab `a`). If `m()` were selecting node 0 rather than node 1, that template would be binding
      `ngStyle` to a `<div>` that has no such const. One convention, two readings.
    */
    const bundle = readFileSync(BUNDLE, 'utf8');
    expect(bundle).toContain(
      'z("ngClass",ct(30,o6,e.msg.isA))("ngStyle",e.styleB),m(4),z("ngStyle"'
    );
  });

  it('computes the map the reference computes', () => {
    expect(pollNavAnchorClasses(true, false)).toEqual({
      'poll-active-blink': true,
      'poll-active-indicator': false
    });
  });

  it('never blinks while the poll is MINIMIZED, which is the `&& !pollIsMinimized` term', () => {
    expect(pollNavAnchorClasses(true, true)).toEqual({
      'poll-active-blink': false,
      'poll-active-indicator': true
    });
  });

  it('is empty with no poll — the control', () => {
    expect(pollNavAnchorClasses(false, false)).toEqual({
      'poll-active-blink': false,
      'poll-active-indicator': false
    });
  });

  it('hangs the map on the anchor and leaves the li a plain nav-item', () => {
    expect(PANE).toContain('class={pollNavAnchorClasses(pollIsActive, polls.minimized)}');
    expect(PANE).toContain('<li class="nav-item mx-2">');
    /*
      And the `<li>` no longer carries either class. This is the assertion that fails if somebody
      "restores" the old shape, and it is scoped to the pane rather than to a slice because neither
      string may appear on an `<li>` anywhere in this file.
    */
    expect(PANE).not.toContain("'nav-item mx-2',");
  });

  it('leaves the NON-presenter entry where the reference already had it', () => {
    /*
      Const 27 is `[1,"poll-active-blink",2,"cursor","pointer",3,"click"]` — a STATIC class on that
      anchor. It was already right, and asserting it is what makes the change above a correction of
      one control rather than a preference about where classes go.
    */
    expect(PANE).toContain('<a class="poll-active-blink" style="cursor: pointer;"');
  });
});

describe('ACA-04 — the webinar block s fourth node is refused, with the measurement', () => {
  it('reads the bare element off the pinned bundle, in BOTH copies', () => {
    const bundle = readFileSync(BUNDLE, 'utf8');
    /*
      `e0e` (app-chat, 1,424,607) and `Z3e` (app-extra-chat, 2,371,066). `T(4,"i")` with no const
      index: no class, no attribute, no text. Counted, so a capture that gives it one turns this red
      and the refusal has to be argued again.
    */
    const bare =
      bundle.match(
        /d\(0,"div",24\),v\(1," Webinar Mode "\),d\(2,"span",5[36]\),T\(3,"i",5[47]\),u\(\),T\(4,"i"\),u\(\)/g
      ) ?? [];
    expect(bare).toHaveLength(2);
  });

  it('has no rule to be styled by, in this repository or in the reference s own stylesheet', () => {
    const captured = readFileSync(
      new URL('./styles/captured-runtime-components.css', import.meta.url),
      'utf8'
    );
    const app = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
    const reference = readFileSync(
      new URL('../../docs/source-v4-2026-08-15/styles.ee2a710065b60389.css', import.meta.url),
      'utf8'
    );
    /*
      A bare `i` type selector — `i {`, `i,` or ` i ` as a whole selector. The search is proved
      against a class we KNOW is styled in the same sheets, so a regex that finds nothing because it
      matches nothing cannot pass this quietly.
    */
    const bareTypeSelector = /(^|[},;])\s*i\s*\{/;
    for (const [name, sheet] of [
      ['captured-runtime-components.css', captured],
      ['app.css', app],
      ['the reference stylesheet', reference]
    ] as const) {
      expect(bareTypeSelector.test(sheet), `${name} has a bare i rule`).toBe(false);
    }
    /* The proof that the sheets were actually read: a selector each of them does carry. */
    expect(captured).toContain('.webinarMode');
    expect(app).toContain('.textAreaBtns');
    expect(reference.length).toBeGreaterThan(400_000);
  });

  it('emits it, as the last thing in the block and carrying nothing', () => {
    /*
      BUILT 2026-09-02, and this assertion is the inverse of the one it replaces.

      It was refused because no stylesheet here or in the reference selects a bare `<i>`, so the
      element is invisible. True, and true UPSTREAM for the same reason — which makes it an
      upstream defect reproduced rather than an escape. An element the reference emits is
      reference-facing output whether or not anything paints it.

      Asserted on the rendered SHAPE, as the refusal was: the tail of the block after its last
      `</span>` must carry an `<i>` and that `<i>` must be BARE. The second half is what stops the
      obvious wrong fix — somebody giving it a class to make it "do something" would satisfy a
      naive `toContain('<i')` and diverge from the const-less element in the capture.
    */
    const at = PANE.indexOf('<div class="px-1 webinarMode">');
    expect(at, 'the webinar block must exist for this to test anything').toBeGreaterThan(-1);
    const block = PANE.slice(at, PANE.indexOf('</div>', at) + 6);
    expect(block).toContain('fa-question-circle');
    const tail = block.slice(block.lastIndexOf('</span>'));
    expect(tail, 'the trailing bare <i> is missing').toContain('<i></i>');
    expect(tail, 'the trailing <i> gained an attribute the capture does not have').not.toMatch(
      /<i\s+[^>]/
    );
    expect(WEBINAR_MODE_TRAILING_ICON_BUILT).toContain('1,424,607');
    expect(WEBINAR_MODE_TRAILING_ICON_BUILT).toContain('2,371,066');
  });
});
