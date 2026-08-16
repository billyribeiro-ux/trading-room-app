import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  THE DETACH RECEIVER, both ends of it.

  Written because a negative control went GREEN and should not have: removing
  `this.#setChatAlertsDetached(true)` from `detach()` — so the alerts column is moved into a new
  window and the page's layout is never told — broke nothing in 2,289 assertions. That is a missing
  TEST rather than a missing behaviour, and it is the same shape as the gap slice 8 found: a
  receiver whose two ends were each plausible on their own.

  `chatAlertsDetached` is written on BOTH sides of the class boundary, which is why it did not
  travel: the pane writes it, the page lays out from it. A shared field is exactly the thing a
  source-text contract loses sight of, because each half reads correctly in isolation — the class
  calling a receiver nobody wired, or the page holding a flag nobody sets, both look fine.
*/

const PANE = readFileSync(new URL('./alerts-pane.ts', import.meta.url), 'utf8');
const PAGE = readFileSync(new URL('../../routes/+page.svelte', import.meta.url), 'utf8');

const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const pane = strip(PANE);
const page = strip(PAGE);

/** The body of a `name(` … `\n  }` member, matched on the class indent so a call is never mistaken
 *  for the declaration. */
const bodyOf = (name: string) => {
  const at = pane.search(new RegExp(`\\n {2}(?:async )?${name}\\(`));
  expect(at, `${name} must exist in the pane actions`).toBeGreaterThan(-1);
  const end = pane.indexOf('\n  }', at);
  return pane.slice(at, end);
};

describe('detaching tells the page, and reattaching tells it back', () => {
  it('detach raises the flag', () => {
    // Without this the column opens in its own window and the room still lays out around it.
    expect(bodyOf('detach')).toContain('this.#setChatAlertsDetached(true);');
  });

  it('reopen lowers it', () => {
    // And without THIS the column comes back to a layout that is still making room for nothing.
    expect(bodyOf('reopen')).toContain('this.#setChatAlertsDetached(false);');
  });

  it('the detached window closing lowers it too', () => {
    /*
      The third writer, and the one most easily forgotten: a viewer who closes the detached window
      with its own X never goes through `reopen`. `detach` registers the handler that covers it, so
      the assertion is scoped to that body rather than to the file.
    */
    const detach = bodyOf('detach');
    expect(detach).toContain('this.#setChatAlertsDetached(false);');
  });

  it('the page supplies the receiver the class calls', () => {
    /*
      THE HAND-OFF, asserted rather than assumed. Every expectation above is satisfied by a class
      calling a receiver nobody passes, which would raise no error and change no pixel — the exact
      failure that made the control above green.
    */
    expect(page, 'the page no longer wires the detach receiver').toContain(
      'setChatAlertsDetached: (next) => (chatAlertsDetached = next)'
    );
    expect(page, 'the page no longer owns the flag it lays out from').toContain(
      'let chatAlertsDetached = $state(false);'
    );
  });

  it('the flag did not travel, because it is written on both sides', () => {
    // If it ever moves into the class, this file is where the reason to reconsider is recorded.
    expect(pane).not.toContain('#chatAlertsDetached = $state');
  });
});
