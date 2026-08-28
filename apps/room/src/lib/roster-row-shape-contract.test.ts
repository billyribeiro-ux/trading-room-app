import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { rosterRowIsFull } from './roster-gates.js';

/**
 * "Show only usernames?" — the predicate, its strictness, and the chain that feeds it.
 *
 * ## Why this is a separate file from `roster-gates.test.ts`
 *
 * That file is EVIDENCE-BOUND: it reads a capture root, so `gate/evidence-bound-tests.mjs` excludes
 * it on every checkout but one. Tests written there run for their author and silently do not run for
 * anybody else — including CI. That has already happened once in this repository, to the `hasQaOnAlerts`
 * assertions, and it is why these live in a file that reads no capture.
 *
 * ## What the two negative controls found
 *
 * The sidebar render (`RoomSidebar.svelte.test.ts`) covers the SHAPE and goes red on the inverted
 * reading. Two mutations it could not see:
 *
 * * loosening `showOnlyUsernames !== true` to `!showOnlyUsernames` — nothing asserted the strict form;
 * * replacing the page's `rowIsFull={…}` with `() => true` — the render supplies its own predicate,
 *   so cutting the wire at the page was invisible. That is the unfed-prop failure class again.
 */
describe('rosterRowIsFull', () => {
  const member = { isP: false };
  const presenter = { isP: true };

  it('draws every row in full when the room has not set it', () => {
    for (const session of [{}, { showOnlyUsernames: false }]) {
      expect(rosterRowIsFull(member, session)).toBe(true);
      expect(rosterRowIsFull(presenter, session)).toBe(true);
    }
  });

  it('reduces the MEMBER row and never the presenter row', () => {
    const session = { showOnlyUsernames: true };
    expect(rosterRowIsFull(member, session)).toBe(false);
    expect(rosterRowIsFull(presenter, session)).toBe(true);
  });

  /*
    FAIL-CLOSED, and in the direction that costs least. `showOnlyUsernames` arrives as JSON over an
    internal HTTP hop; a string `"false"` reducing every member in the room to a bare name is a
    visible, room-wide regression from a value that means the opposite.
  */
  it.each(['false', 'true', 0, 1, '', {}, []])('refuses %o and leaves the row full', (value) => {
    const session = { showOnlyUsernames: value } as { showOnlyUsernames?: boolean };
    expect(rosterRowIsFull(member, session)).toBe(true);
  });

  /*
    The ROW term is strict too, in the opposite direction: `isP` must be a real `true` to keep a row
    full, or a truthy string would hand a member the full row the room asked to reduce.
  */
  it.each(['true', 1, {}])('does not treat %o as a presenter row', (value) => {
    const entry = { isP: value } as { isP?: boolean };
    expect(rosterRowIsFull(entry, { showOnlyUsernames: true })).toBe(false);
  });

  /** It takes no viewer, and that is the setting. A signature with one would be the inverse reading. */
  it('has no viewer parameter at all', () => {
    expect(rosterRowIsFull).toHaveLength(2);
  });
});

describe('the setting reaches the predicate', () => {
  const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
  const sidebar = readFileSync(new URL('./components/RoomSidebar.svelte', import.meta.url), 'utf8');
  /*
    COMMENTS STRIPPED before the refusal below, and this file needed it immediately — the THIRD time
    today an assertion has matched its own explanation, after `publishToUsers` and `PTR Session`. The
    sidebar's markup carries the byte citation, which names the setting; the refusal is about the
    CODE reading it, not about the prose saying which setting is being drawn.
  */
  const sidebarCode = sidebar.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

  it('is resolved on the page, from the session the roster gates already read', () => {
    /*
      `rosterSession`, the same object `rowVisible` and the other roster gates take — not a fresh
      `data.sessData?.x === true` beside them. One source for the roster's settings is what stops
      two gates disagreeing about the same room.
    */
    expect(page).toContain('rowIsFull={(entry) => rosterRowIsFull(entry, rosterSession)}');
    expect(page).not.toContain('rowIsFull={() => true}');
  });

  it('is a prop the sidebar renders rather than a decision it makes', () => {
    expect(sidebar).toContain('rowIsFull: (entry: Entry) => boolean;');
    expect(sidebar).toContain('{#if !rowIsFull(user)}');
    // The sidebar must never read the setting itself — that would be a second copy of the rule.
    expect(sidebarCode).not.toContain('showOnlyUsernames');
  });
});
