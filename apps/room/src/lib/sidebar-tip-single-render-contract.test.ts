import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from '#lib/source-comments.js';

/**
 * ── THE TIP BUTTON RENDERS ONCE PER FILE, AND THE THIRD COPY IS THE ONE TO CATCH ───────────────
 *
 * SIDE-01, and this file is the guard its own prose promised. It is written because the defect it
 * refuses has already happened, in the most ordinary way there is.
 *
 * ## What went wrong
 *
 * RS-09 read the reference's navbar, found a tip control this room did not have, and built it. That
 * was right. In measuring it, the same row also established — and wrote down, in as many words —
 * that the SIDEBAR's `<li>` tip had no counterpart upstream at all: `TPe`, read end to end from
 * bundle byte 2,470,562 to 2,472,257, has no tip `<li>` at any slot, and node 14 there is
 * `T(14,"hr")`. The `H(14, APe, 5, 2, "li", 139)` the sidebar's comment cited is `U4e`, the NAVBAR,
 * at 2,485,267.
 *
 * So one row measured two facts — a control missing over there, a control wrong over here — and
 * only the first was acted on. The room went from rendering the tip twice to rendering it three
 * times, as the direct result of a change that made it more faithful.
 *
 * **That asymmetry is the thing worth naming.** An ADDED control is visible: it appears on screen,
 * somebody sees it, a test is written for it. A control that should have been REMOVED is a deletion
 * nobody is looking for, and nothing in a rendered page says "this element should not be here".
 *
 * ## Why this is a separate file from `tip-button-contract`
 *
 * That file asserts the two sites and their captured classes. It was green throughout the period
 * the room rendered three, because it counted both sites within `RoomSidebar.svelte` — and two in
 * the wrong places satisfies a count of two. Corrected there on the same day; this file pins the
 * invariant from the other direction so that a copy landing in EITHER file fails something.
 *
 * The reference renders it exactly twice in the room, once per file:
 *
 *   `aPe`, byte 2,466,601, `O(13, isTipEnabled ? 13 : -1)`  — the sidebar's `<p><button>`
 *   `U4e` node 14, consts 139/140, byte 2,485,267           — the navbar's `<li><a>`
 */
const read = (file: string) =>
  readFileSync(new URL(`./components/${file}`, import.meta.url), 'utf8');

const FILES = ['RoomSidebar.svelte', 'RoomNavbar.svelte'] as const;

describe('the tip button renders once per file, and never twice in either', () => {
  it('reads both components at all', () => {
    /* The vacuity floor: every count below is a search over these two strings. */
    for (const file of FILES) {
      expect(read(file).length, `${file} is empty or moved`).toBeGreaterThan(5_000);
    }
  });

  it.each(FILES)('%s gates the tip exactly once', (file) => {
    /*
      Counted over CODE, not the raw file. `RoomSidebar.svelte` carries SIDE-01's own explanation,
      which quotes the `<li class="nav-item" title={tip.label}>` that was removed — so a raw count
      would find the prose describing the deletion and report it as the deletion not having
      happened. `codeOf` is the repository's answer to that everywhere else and is the answer here.
    */
    const code = codeOf(file, read(file));
    expect(
      code.split('{#if tip.visible}').length - 1,
      `${file} draws the tip button more than once. The reference draws it ONCE here and once in ` +
        `the other file; a third render is how this went wrong before — see the docblock above.`
    ).toBe(1);
  });

  it('the sidebar has no tip `li`, which is the specific thing that was there', () => {
    /*
      Narrower than the count above and deliberately so. The count would also pass if somebody
      replaced the `<p><button>` with an `<li>` rather than adding one, and that is a different
      wrong answer: `aPe` is a `<p><button>` and the `<li>` form belongs to the navbar's template.
    */
    const code = codeOf('RoomSidebar.svelte', read('RoomSidebar.svelte'));
    const at = code.indexOf('{#if tip.visible}');
    expect(at, 'the sidebar no longer draws the tip at all').toBeGreaterThan(-1);
    const block = code.slice(at, at + 400);
    expect(block, 'the sidebar’s tip is `aPe`’s <p><button>').toContain('<button');
    expect(block, 'and never the navbar’s <li> form').not.toContain('<li');
  });
});
