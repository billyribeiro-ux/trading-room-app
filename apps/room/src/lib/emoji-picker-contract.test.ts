// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import EmojiPicker from './components/EmojiPicker.svelte';
import { EMOJI_DUMP_DATA } from './emoji-data';
import { codeOf } from './source-comments';

/**
 * `EMOJI-06` through `EMOJI-12` — the picker's six wiring and rendering rows.
 *
 * Three of them are only observable in a mounted DOM — the per-instance id, the staged first render
 * and Enter-selects-first — so this file mounts the component rather than reading it. That is the
 * point: `EMOJI-07` is a DUPLICATE ID, and the only way to prove two instances no longer collide is
 * to have two instances.
 *
 * ## IF A CASE HERE EVER TIMES OUT AT 5,000 ms, IT IS THE INSTRUMENT — MEASURED 2026-08-31
 *
 * `EMOJI-07`'s two-picker case did, once, on a machine at load average 12. It runs in **2.3 s**
 * unloaded, and the two obvious suspects were measured before anything was changed:
 *
 *   the per-instance dataset rebuild   **0.66 ms** over 1,818 entries
 *   one full `mount` + `flushSync`     **0 ms**, committing 558 cells and 1,779 nodes
 *
 * So neither the component's data shape nor its render is the cost. What is left is jsdom TEARDOWN
 * of a ~1,800-node tree, twice per case here and once everywhere else — an instrument cost that no
 * change to the picker can reduce, and that does not exist in a browser.
 *
 * This paragraph is here so the next person who sees a red 5,000 ms does not spend an hour
 * re-deriving it. Raise nothing and optimise nothing on the strength of that failure alone: re-run
 * it on a quiet machine first, and if it is genuinely slower than the numbers above, something
 * changed in the component and THAT is the finding.
 */

const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');
const picker = codeOf('components/EmojiPicker.svelte', read('./components/EmojiPicker.svelte'));
const extra = codeOf('components/ExtraChatPane.svelte', read('./components/ExtraChatPane.svelte'));

/**
 * A mounted picker, and the popover it moves to `document.body`.
 *
 * `portalPopover` appends the node to the body on mount, so the component's own target is empty and
 * every query below runs against the document.
 */
function open(props: Record<string, unknown> = {}) {
  const target = document.createElement('div');
  document.body.append(target);
  const component = mount(EmojiPicker, {
    target,
    props: { onselect: () => {}, ...props }
  });
  /* Effects are scheduled, not synchronous — the staged-render timer is armed by one of them. */
  flushSync();
  return {
    close: () => {
      void unmount(component);
      target.remove();
    }
  };
}

/**
 * The two browser APIs jsdom does not implement, stubbed HERE rather than in `vitest.setup.ts`.
 *
 * `ResizeObserver` is what `portalPopover` observes the trigger with. Its absence is an INSTRUMENT
 * limit and nothing else — every browser this room supports has had it since 2020 — so a stub is the
 * honest fix, and keeping it local says which test needs it instead of quietly widening the
 * environment for every file in the suite.
 *
 * `matchMedia` is deliberately NOT stubbed. `EMOJI-08` is precisely about what happens where it is
 * absent, and the component now carries upstream's own `typeof matchMedia === 'function'` guard for
 * that case. Stubbing it here would hide the very thing these mounts proved.
 */
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('ResizeObserver', NoopResizeObserver);
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('EMOJI-07 — the search field is unique per instance', () => {
  it('gives two pickers two ids, and each label its own field', () => {
    /*
      Both are mountable at once — the main composer's and the extra column's, or two message
      reaction pickers, since `reactionPickerOpen` is per `RoomMessage`. The literal
      `emoji-mart-search-2` made the second picker's label operate the first picker's input.
    */
    const first = open();
    const second = open();

    const inputs = [...document.querySelectorAll('input[type="search"]')];
    expect(inputs).toHaveLength(2);
    const ids = inputs.map((input) => input.id);
    expect(new Set(ids).size, `two pickers, two ids — got ${ids.join(', ')}`).toBe(2);

    const labels = [...document.querySelectorAll('label.emoji-mart-sr-only')];
    expect(labels.map((label) => label.getAttribute('for'))).toEqual(ids);

    second.close();
    first.close();
  });

  it('keeps the reference’s id SHAPE, so a stylesheet or capture diff still matches', () => {
    const one = open();
    const input = document.querySelector('input[type="search"]');
    expect(input?.id).toMatch(/^emoji-mart-search-/);
    one.close();
  });
});

describe('EMOJI-09 — the first render is staged', () => {
  const cellsNow = () => document.querySelectorAll('.emoji-mart-emoji').length;

  it('has enough data for the staging to matter — the vacuity floor', () => {
    const total = EMOJI_DUMP_DATA.categories.reduce(
      (sum, category) => sum + category.entries.length,
      0
    );
    expect(total).toBeGreaterThan(1_500);
    expect(EMOJI_DUMP_DATA.categories.length).toBeGreaterThan(3);
  });

  /*
    What the two passes should hold, computed from the data rather than guessed.

    Category 0 is Recent and is rendered from `frequentEntries`, not from the dump — so both counts
    are `frequent + <the dump's other categories>`, and the difference between them is the whole of
    the staging.
  */
  const dumpCategory = (index: number) => EMOJI_DUMP_DATA.categories[index].entries.length;
  /* Every entry beyond the three the reference commits, which is what the deferred pass adds. */
  const beyondStaged = EMOJI_DUMP_DATA.categories
    .slice(3)
    .reduce((sum, category) => sum + category.entries.length, 0);

  it('commits three categories, the last capped at sixty cells', () => {
    /*
      `const s = Math.min(this.categories.length, 3); … this.categories[s-1].emojis = r.slice(0, 60)`
      — byte 747,768. 1,821 spans built synchronously inside a click handler is the stutter this
      removes; the SECOND category is the reference's own 487-cell one and is committed whole, which
      is why the saving is measured against the tail rather than against a round number.
    */
    const one = open();
    const staged = cellsNow();
    const frequent = staged - dumpCategory(1) - 60;

    expect(
      frequent,
      'the arithmetic below only holds if category 2 is capped'
    ).toBeGreaterThanOrEqual(0);
    expect(staged, 'the third category is not capped at 60').toBe(frequent + dumpCategory(1) + 60);
    expect(staged, 'nothing beyond the first three is committed').toBeLessThan(
      frequent + dumpCategory(1) + dumpCategory(2) + beyondStaged
    );
    one.close();
  });

  it('expands to everything on the next macrotask', () => {
    /*
      Counted as SECTIONS and cells rather than by arithmetic over the data: a handful of dump
      entries are falsy and the markup's `{#if entry}` skips them, so `entries.length` and rendered
      cells differ by a few. The claim is about what is committed and when, and sections say that
      exactly.
    */
    /*
      The SEARCH-results section carries the same `emoji-mart-category` class, its own `aria-label`,
      AND a `.emoji-mart-category-label` — measured, after each of those was tried as the
      discriminator. What separates it is that its label's `data-name` is `Search` rather than a
      category's own name, so that is what this excludes.
    */
    const sections = () =>
      [...document.querySelectorAll('section.emoji-mart-category')].filter(
        (section) =>
          section.querySelector('.emoji-mart-category-label')?.getAttribute('data-name') !==
          'Search'
      );
    const cellsIn = (section: Element) => section.querySelectorAll('.emoji-mart-emoji').length;

    const one = open();
    const stagedSections = sections().length;
    const stagedThird = cellsIn(sections()[2]);
    const staged = cellsNow();

    expect(stagedSections, 'three categories are committed').toBe(3);
    expect(stagedThird, 'the third is capped at sixty').toBe(60);

    vi.runAllTimers();
    flushSync();

    expect(sections().length, 'the rest never arrived').toBe(EMOJI_DUMP_DATA.categories.length);
    expect(cellsIn(sections()[2]), 'the cap was never lifted').toBeGreaterThan(60);
    expect(cellsNow(), 'the deferred pass never ran').toBeGreaterThan(staged);
    expect(cellsNow() - staged, 'the tail is what arrived').toBeGreaterThanOrEqual(beyondStaged);
    one.close();
  });

  it('caps by INDEX, not by the literal 2', () => {
    // `s-1`: a picker with fewer than three categories caps whichever one is last.
    expect(picker).toContain('categoryIndex === stagedCount - 1');
    expect(picker).toContain('Math.min(EMOJI_DUMP_DATA.categories.length, STAGED_CATEGORIES)');
  });

  it('clears its timer, so closing inside the first frame writes to nothing', () => {
    expect(picker).toContain('return () => clearTimeout(timer);');
  });
});

describe('EMOJI-06 — Enter picks the first result', () => {
  it('selects it, on keyUP', () => {
    /*
      `keyup` is upstream's own event (`setupKeyupListener`, byte 737,093) and the right one for the
      reason `poll-08` gives: holding Enter repeats `keydown`, and a repeat inserts the emoji once
      per repeat into whatever composer the picker feeds.
    */
    const chosen: string[] = [];
    const one = open({ onselect: (glyph: string) => chosen.push(glyph) });

    const input = document.querySelector<HTMLInputElement>('input[type="search"]');
    expect(input, 'the search field is gone').not.toBeNull();
    input!.value = 'smile';
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    input!.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

    expect(chosen, 'Enter selected nothing').toHaveLength(1);
    one.close();
  });

  it('does nothing when the box is empty', () => {
    /*
      Upstream guards this with `!this.query ||` and this component does not — a negative control
      deleting that guard stayed green, and the reason is recorded at `handleSearchKeyup`:
      `runSearch` returns null for an empty AND a whitespace-only query, so the result check already
      covers every case the guard did. This test is what makes that a checked claim rather than an
      argument.
    */
    const chosen: string[] = [];
    const one = open({ onselect: (glyph: string) => chosen.push(glyph) });
    const input = document.querySelector<HTMLInputElement>('input[type="search"]');
    input!.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    expect(chosen).toEqual([]);
    one.close();
  });

  it('does nothing for a whitespace-only query — the case that made the guard redundant', () => {
    const chosen: string[] = [];
    const one = open({ onselect: (glyph: string) => chosen.push(glyph) });
    const input = document.querySelector<HTMLInputElement>('input[type="search"]');
    input!.value = '   ';
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    input!.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    expect(chosen).toEqual([]);
    one.close();
  });

  it('does nothing when the query matches nothing', () => {
    const chosen: string[] = [];
    const one = open({ onselect: (glyph: string) => chosen.push(glyph) });
    const input = document.querySelector<HTMLInputElement>('input[type="search"]');
    input!.value = 'zzzzzzzznotanemoji';
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    input!.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    expect(chosen).toEqual([]);
    one.close();
  });
});

describe('EMOJI-08 — the dark class is computed, not hardcoded', () => {
  it('reads prefers-color-scheme through the documented reactive primitive', () => {
    /*
      `darkMode = !("function" != typeof matchMedia || !matchMedia("(prefers-color-scheme: dark)")
      .matches)` — byte 744,873, left at that default by the application, so a light-scheme machine
      gets the light palette upstream and always got the dark one here.
    */
    expect(picker).toContain("new MediaQuery('prefers-color-scheme: dark')");
    expect(picker).toContain("{ 'emoji-mart-dark': prefersDark?.current === true }");
    expect(picker).not.toContain('"emoji-mart emoji-mart-dark"');
  });

  it('is built behind upstream’s own matchMedia guard, or it throws where upstream degrades', () => {
    /*
      `MediaQuery`'s constructor calls `window.matchMedia` immediately, so constructing one where the
      API is absent THROWS — while upstream's `"function" != typeof matchMedia ||` yields `false` and
      renders the light palette. jsdom is such an environment, and the mounts in this file are how
      that was found: without the guard every one of them fails with
      `TypeError: window.matchMedia is not a function`.
    */
    expect(picker).toContain("typeof matchMedia === 'function'");
    expect(picker).toContain('prefersDark?.current === true');
  });
});

describe('EMOJI-12 — the preview clears a frame late, and the next cell cancels it', () => {
  it('defers the clear and cancels on the way in', () => {
    /*
      The pair is the feature: sliding across a row fires `mouseleave` then `mouseenter`, so a
      synchronous clear flashes the idle preview between every pair of cells.
    */
    expect(picker).toContain('previewClearFrame = requestAnimationFrame(');
    expect(picker).toContain('cancelAnimationFrame(previewClearFrame);');
  });

  it('has no synchronous clear left at either hover site', () => {
    expect(picker).not.toContain('onmouseleave={() => (hovered = null)}');
    expect(picker.split('onmouseleave={hoverLeave}').length - 1).toBe(2);
    expect(picker.split('onmouseenter={() => hoverEnter(entry)}').length - 1).toBe(2);
  });
});

describe('EMOJI-10 — every picker is told the id its trigger advertises', () => {
  it('the extra column passes one, which it did not', () => {
    /*
      Its trigger sets `aria-describedby="ngb-popover-extra"`; the picker took the default
      `ngb-popover-3`, so `portalPopover`'s `querySelector` found nothing — leaving the popover at
      its hardcoded inline transform — or the MAIN column's trigger, and positioned it over the wrong
      composer.
    */
    expect(extra).toContain("aria-describedby={emojiOpen ? 'ngb-popover-extra' : undefined}");
    expect(extra).toContain('<EmojiPicker popoverId="ngb-popover-extra"');
  });
});
