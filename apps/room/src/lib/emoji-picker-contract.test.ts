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
  /*
    Every entry beyond the ones the reference commits, which is what the deferred pass adds.

    TWO of the dump's categories, not three, and `EMOJI2-01` is why: upstream's `this.categories`
    carries the synthetic Search category at index 0 (`unshift(this.SEARCH_CATEGORY)`, byte
    747,681), so `slice(0, 3)` spends one of the three on it and commits Recent plus the first
    sixty of Smileys & People. `EMOJI_DUMP_DATA.categories` has no Search entry, so counting it
    directly committed one category too many — 556 cells against the reference's 69.
  */
  const beyondStaged = EMOJI_DUMP_DATA.categories
    .slice(2)
    .reduce((sum, category) => sum + category.entries.length, 0);

  it('reports what it actually commits, measured', () => {
    /*
      A number, printed, so `EMOJI2-01`'s figures are re-measurable rather than recalled. `cellsNow`
      counts every `.emoji-mart-emoji` in the document, and the picker draws two outside the grid —
      the preview sprite and the `No Emoji Found` sprite — so the grid total is this less two.
    */
    const one = open();
    const committed = cellsNow();
    one.close();
    expect(committed, `first-frame cells (grid + 2 non-grid): ${committed}`).toBe(71);
  });

  it('commits Recent and one capped category, which is what three slots buy', () => {
    /*
      `const s = Math.min(this.categories.length, 3); … this.categories[s-1].emojis = r.slice(0, 60)`
      — byte 747,768. 1,821 spans built synchronously inside a click handler is the stutter this
      removes, and committing the whole 487-cell Smileys & People category on top of that was most
      of the stutter coming back.
    */
    const one = open();
    const staged = cellsNow();

    /*
      Asserted against the DUMP's own numbers rather than against a figure derived from `staged`
      itself. `staged === (staged - 60) + 60` was the first form of this and it is a tautology: it
      survived the negative control that set `SEARCH_CATEGORY_SLOT` to 0, which is the whole defect
      `EMOJI2-01` records. What the row actually claims is that Smileys & People is CAPPED, so the
      claim is that the first frame is smaller than that one category — 69 against 487, not 556.
    */
    expect(staged, 'the whole 487-cell category is being committed again').toBeLessThan(
      dumpCategory(1)
    );
    expect(staged, 'the last committed category is not capped at 60').toBeGreaterThanOrEqual(60);
    expect(staged, 'nothing beyond the first two is committed').toBeLessThan(
      dumpCategory(0) + dumpCategory(1) + beyondStaged
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
    const stagedLast = cellsIn(sections()[1]);
    const staged = cellsNow();

    expect(stagedSections, 'two dump categories are committed').toBe(2);
    expect(stagedLast, 'the last committed one is capped at sixty').toBe(60);

    vi.runAllTimers();
    flushSync();

    expect(sections().length, 'the rest never arrived').toBe(EMOJI_DUMP_DATA.categories.length);
    expect(cellsIn(sections()[1]), 'the cap was never lifted').toBeGreaterThan(60);
    expect(cellsNow(), 'the deferred pass never ran').toBeGreaterThan(staged);
    expect(cellsNow() - staged, 'the tail is what arrived').toBeGreaterThanOrEqual(beyondStaged);
    one.close();
  });

  it('caps by INDEX, not by the literal 1', () => {
    // `s-1`: a picker with fewer categories than slots caps whichever one is last.
    expect(picker).toContain('categoryIndex === stagedCount - 1');
    expect(picker).toContain(
      'Math.min(EMOJI_DUMP_DATA.categories.length + SEARCH_CATEGORY_SLOT, STAGED_CATEGORIES) -'
    );
    expect(picker).toContain('const SEARCH_CATEGORY_SLOT = 1;');
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

describe('EMOJI2-02 — the skin swatches are the idle preview s, and go while an emoji is hovered', () => {
  const swatchRow = () => document.querySelector('.emoji-mart-preview-skins');
  /*
    A cell from a real category, NOT the first `.emoji-mart-emoji` in the scroller. That one is the
    `No Emoji Found` sprite inside the always-present Search Results section, which carries the same
    class and no hover handlers — dispatching at it made this assertion green for the wrong reason
    on its first run.
  */
  const firstCell = () => {
    const section = [...document.querySelectorAll('section.emoji-mart-category')].find(
      (candidate) =>
        candidate.querySelector('.emoji-mart-category-label')?.getAttribute('data-name') !==
        'Search'
    );
    return section?.querySelector('.emoji-mart-emoji') ?? null;
  };

  it('draws them when nothing is hovered', () => {
    const one = open();
    const row = swatchRow();
    expect(row, 'the swatch row is gone entirely').not.toBeNull();
    expect((row as HTMLElement).hidden, 'hidden with no emoji hovered').toBe(false);
    expect(document.querySelectorAll('.emoji-mart-skin-swatch')).toHaveLength(6);
    one.close();
  });

  it('takes them away on hover and gives them back a frame after the pointer leaves', () => {
    /*
      Upstream's mechanism is `[hidden]="o.emoji"` on the whole IDLE `div.emoji-mart-preview`, the
      block that CONTAINS the skins — the hovered block (`jee`) has no skins div at all. The element
      is kept and hidden rather than removed, exactly as upstream keeps it, so `skinsOpened`
      survives the hover.

      The return is deferred by one animation frame because `EMOJI-12` defers the preview clear, so
      this drives rAF rather than asserting synchronously — asserting straight after `mouseleave`
      would test the timing this room deliberately does NOT have.
    */
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});

    const one = open();
    const cell = firstCell();
    expect(cell, 'no emoji cells rendered — the assertion below would be vacuous').not.toBeNull();

    cell!.dispatchEvent(new MouseEvent('mouseenter'));
    flushSync();
    expect((swatchRow() as HTMLElement).hidden, 'still shown while hovering a cell').toBe(true);

    cell!.dispatchEvent(new MouseEvent('mouseleave'));
    flushSync();
    expect((swatchRow() as HTMLElement).hidden, 'came back before the frame elapsed').toBe(true);

    for (const frame of frames.splice(0)) frame(0);
    flushSync();
    expect((swatchRow() as HTMLElement).hidden, 'never came back').toBe(false);
    one.close();
  });
});

describe('EMOJI2-03 — the captured whitespace pads survive Prettier and HTML folding', () => {
  it('pads the search label, the shortnames and the emoticons as the reference does', () => {
    /*
      Read off the RENDERED text, not the source, because the whole risk is that the markup keeps a
      space the DOM then folds away. `textContent` is what a capture diff compares.
    */
    const one = open();
    const label = document.querySelector('label.emoji-mart-sr-only');
    expect(label?.textContent, 'Ne(" ",o.i18n.search," ") — byte 738,704').toBe(' Search ');
    one.close();
  });

  it('keeps them in the source in the form that survives formatting', () => {
    /*
      The idiom `apps/room/AGENTS.md` records as one of the two declined autofixer suggestions:
      plain text loses a leading space to Prettier, a mustache does not.
    */
    expect(picker).toContain("{' Search '}");
    expect(picker).toContain("{' :'}{shortName}{': '}");
    expect(picker).toContain("{' '}{emoticon}{' '}");
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
