import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { codeOf } from '#lib/source-comments.js';

/**
 * EVERY `fa-` CLASS THIS ROOM RENDERS DRAWS SOMETHING, OR SAYS WHY IT DOES NOT.
 *
 * ## What this was written for
 *
 * On 2026-09-01 `ReactionPrefsPane.svelte` was found rendering `<i class="fas fa-face-smile">` on
 * two invented section headers. `fa-face-smile` is a Font Awesome **6** name. This project ships
 * `@fortawesome/fontawesome-free@5.8.1` (`apps/room/package.json:30`), where the smile is `fa-smile` and
 * `grep -c fa-face-smile css/all.min.css` returns **0** — so both icons drew nothing at all, and
 * had since the pane was written.
 *
 * Nothing could see it. A missing glyph type-checks, lints, passes `svelte-check`, and renders as
 * an empty inline box that a screenshot of a busy modal does not make obvious.
 *
 * ## Why the whole class of defect, rather than that one string
 *
 * The sweep this file performs found **four more on its first run**, and every one is a version
 * mismatch of the same shape: `fa-waveform` and `fa-disk` are Font Awesome 6, `fa-floppy-o` and
 * `fa-pause-circle-o` are Font Awesome **4**. That is the argument for a sweep — one wrong icon
 * name is a typo; five is a hazard the codebase has no defence against.
 *
 * ## The four that STAY, and the evidence for each
 *
 * All four are in the pinned bundle, and **the reference loads the same Font Awesome 5.8.1** —
 * `docs/source-v4-2026-08-15/deployed-index.html` links
 * `fontawesome.com/releases/v5.8.1/css/all.css`, and none of the four is defined in
 * `styles.ee2a710065b60389.css` either. So these are upstream's own broken icons, transcribed, in
 * the same spirit as the `btn-ligth` typo this repository keeps by name:
 *
 * | class | const, read from the bundle | what actually draws |
 * | --- | --- | --- |
 * | `fa-disk` | `[1,"icon","fa","fa-disk"]` | REPAIRED here — `app.css:13` gives it `content:'\\f0c7'` |
 * | `fa-floppy-o` | Font Awesome 4's save icon | REPAIRED by the same rule |
 * | `fa-waveform` | `[1,"fas","fa-waveform","fa-microphone-alt"]` @ 2,455,310 | the SIBLING draws — `fa-microphone-alt` is FA5 |
 * | `fa-pause-circle-o` | `[1,"far","fa-pause-circle-o"]` @ 2,542,971 | NOTHING, upstream included |
 *
 * The last row is the interesting one: the const immediately BEFORE it in the same table is
 * `[1,"far","fa-pause-circle"]`, the correct FA5 name. Upstream holds both and put the broken one
 * on the RESUME Recording button. The button still reads " RESUME Recording ", so the control is
 * usable without it and reproducing the slip costs nothing; inventing a glyph the reference does
 * not draw would be inventing a design.
 *
 * ## What fails here
 *
 * A SIXTH. Any `fa-` class that the shipped stylesheet does not define, that `app.css` does not
 * repair, and that is not one of the four above.
 */
const ROOT = fileURLToPath(new URL('..', import.meta.url));
/*
  Resolved from the app root rather than by a relative walk: pnpm puts the package under
  `apps/room/node_modules` as a symlink into the store, and a `../../../` from `src/lib` lands in
  `apps/` where there is none. `app.css:2` imports it by the same specifier this resolves.
*/
const FONT_AWESOME = fileURLToPath(
  new URL('../../node_modules/@fortawesome/fontawesome-free/css/all.min.css', import.meta.url)
);

/**
 * Upstream's own undefined icons, transcribed. Each entry is a class the REFERENCE also fails to
 * draw; see the table in the docblock for the const and the byte each was read at.
 *
 * This list may SHRINK — the day the reference is recaptured against a Font Awesome that defines
 * one of them, it becomes a real icon and leaves. It may not grow without the same evidence: a
 * const in the pinned bundle, and the absence of a rule in `styles.ee2a710065b60389.css`.
 */
const UPSTREAM_UNDEFINED: readonly string[] = ['fa-waveform', 'fa-pause-circle-o'];

const definedByFontAwesome = (): ReadonlySet<string> => {
  const css = readFileSync(FONT_AWESOME, 'utf8');
  return new Set([...css.matchAll(/\.(fa[\w-]*)(?=[:,{ .])/g)].map((match) => match[1]));
};

/** Classes `app.css` gives a `content` of its own, which is a repair rather than a definition. */
const repairedLocally = (): ReadonlySet<string> => {
  const css = readFileSync(`${ROOT}app.css`, 'utf8');
  const repaired = new Set<string>();
  for (const rule of css.matchAll(/([^{}]+)\{[^{}]*content\s*:/g)) {
    for (const match of rule[1].matchAll(/\.(fa-[\w-]+)/g)) repaired.add(match[1]);
  }
  return repaired;
};

/** Every `fa-` token in the room's markup, comment-stripped, with the files that carry it. */
const usedInMarkup = (): Map<string, string[]> => {
  const used = new Map<string, string[]>();
  for (const file of globSync('**/*.svelte', { cwd: ROOT })) {
    const source = codeOf(file, readFileSync(`${ROOT}${file}`, 'utf8'));
    /*
      No `fa-brands-400` / `fa-solid-900` exclusion any more, and its removal is the point.
      It existed because `+layout.svelte` imported those woff2 FILENAMES with `?url` to hand-write
      three preload links, and a filename is not a class. Those imports are gone — the preload set
      lives in `hooks.server.ts` now (`font-preload-contract.test.ts`) — so the exclusion had no
      remaining subject, and an exclusion nothing reaches is a hole that only widens.
    */
    for (const match of source.matchAll(/\bfa-[a-z0-9-]+/g)) {
      used.set(match[0], [...new Set([...(used.get(match[0]) ?? []), file])]);
    }
  }
  return used;
};

describe('every Font Awesome class this room renders exists', () => {
  const defined = definedByFontAwesome();
  const repaired = repairedLocally();
  const used = usedInMarkup();

  it('read the stylesheet and the markup it says it read', () => {
    /*
      The vacuity guard, three ways: a regex that stops matching leaves an empty set and a green
      sweep. 5.8.1 defines about fourteen hundred; this room uses about a hundred and twenty.
    */
    expect(defined.size).toBeGreaterThan(1000);
    expect(defined.has('fa-smile'), 'the FA5 name for the icon that started this').toBe(true);
    expect(defined.has('fa-face-smile'), 'the FA6 name, which is what was rendered').toBe(false);
    expect(used.size).toBeGreaterThan(80);
  });

  it('and app.css repairs the two save icons rather than leaving them blank', () => {
    /* `.fa-disk::before, .fa-floppy-o::before { content: '\\f0c7' }` — FA5's `fa-save` glyph. */
    expect(repaired.has('fa-disk')).toBe(true);
    expect(repaired.has('fa-floppy-o')).toBe(true);
  });

  it('draws every icon it renders, or names it as one the reference cannot draw either', () => {
    const undefinedHere = [...used]
      .filter(([name]) => !defined.has(name) && !repaired.has(name))
      .map(([name, files]) => `${name} <- ${files.join(', ')}`);

    expect(
      undefinedHere.map((entry) => entry.split(' <- ')[0]).sort(),
      'a Font Awesome class this project cannot draw. Check the VERSION first — this ships 5.8.1, ' +
        'and 6 renamed most icons (`fa-smile` -> `fa-face-smile`) while 4 suffixed outline ones ' +
        '(`fa-pause-circle-o`). If the reference renders it too, add it to UPSTREAM_UNDEFINED with ' +
        'its const and byte; if it does not, the class is invented and belongs nowhere.\n' +
        undefinedHere.join('\n')
    ).toEqual([...UPSTREAM_UNDEFINED].sort());
  });

  it('renders no Font Awesome 6 name at all, which is the version this room is NOT on', () => {
    /*
      Belt and braces on the specific failure: FA6 renamed the whole `fa-face-*` family, and a
      `fa-face-` prefix is therefore a reliable marker of an icon copied from FA6 documentation.
    */
    expect([...used.keys()].filter((name) => name.startsWith('fa-face-'))).toEqual([]);
  });
});
