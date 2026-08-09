import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Every dropdown wrapper must be reachable by the outside-click closer, or its menu is dead.
 *
 * The row Actions button did nothing. Not "looked wrong" — nothing. Clicking it called
 * `toggleRowMenu`, which set `openRowMenu`, and then the SAME click bubbled to the
 * `<svelte:window onclick>` handler, which closes every menu when the click did not land inside
 * one. Its selector was `.dropdown, [data-menu-control], [data-menu-panel]`; the row's wrapper is
 * `class="btn-group mb-sm mr"`, matching none of them. `closest()` returned null, the handler
 * nulled `openRowMenu`, and the menu opened and shut inside a single event.
 *
 * The toolbar's User List Actions menu was fine throughout, because its wrapper is
 * `class="dropdown"`. That difference is the control: same handler, same state pattern, one class
 * apart, one works.
 *
 * The fix marks the wrapper with `data-menu-control`, which the handler already looks for. NOT the
 * reference's own `dropdown="dropdown"` (`must-match/match:53`, `file1:445,659`): that is
 * angular-bootstrap's directive, it renders nothing, it is in the same category as `ng-click` and
 * `ng-repeat` which this page does not reproduce, and TypeScript rejects it on a div outright.
 *
 * This is asserted on the source because the bug is a source-level relationship between a selector
 * and the markup it has to match. A render cannot show it: the SSR string is identical either way,
 * and the failure only exists once a click bubbles.
 */

const PAGE = new URL('../routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte', import.meta.url);
const source = readFileSync(PAGE, 'utf8');
const markup = source.replace(/<!--[\s\S]*?-->/g, '');

/** The selector the window handler uses to decide a click was "inside a menu". */
function closerSelector(): string {
  const m = /closest\('([^']+)'\)/.exec(markup);
  expect(m, 'the window click handler must still use closest()').not.toBeNull();
  return m![1];
}

describe('dropdown menus survive their own opening click', () => {
  it('the closer recognises the data attribute the wrapper carries', () => {
    expect(closerSelector()).toContain('[data-menu-control]');
  });

  it('still recognises the class the toolbar menu uses', () => {
    // the working control. If this ever drops out, User List Actions dies the same way.
    expect(closerSelector()).toContain('.dropdown');
  });

  it('the row Actions wrapper carries something the closer matches', () => {
    const at = markup.indexOf("'btn-group mb-sm mr'");
    expect(at, 'the row Actions wrapper must still exist').toBeGreaterThan(-1);

    // the wrapper's own opening tag, which is the element `closest()` would have to hit first
    const tagStart = markup.lastIndexOf('<div', at);
    const tag = markup.slice(tagStart, markup.indexOf('>', at) + 1);

    const selector = closerSelector();
    const recognised =
      (selector.includes('[data-menu-control]') && /data-menu-control/.test(tag)) ||
      (selector.includes('.dropdown') && /class=[^>]*\bdropdown\b/.test(tag));

    expect(recognised, `the wrapper is invisible to the closer:\n${tag}`).toBe(true);
  });

  it('keeps the reference\'s class list on that wrapper', () => {
    // the fix must not have been "add .dropdown to the class", which diverges from the capture
    expect(markup).toContain("'btn-group mb-sm mr'");
  });
});
