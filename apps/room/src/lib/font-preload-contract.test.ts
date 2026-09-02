import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { codeOf } from '#lib/source-comments.js';

/*
  ── THE ROOM PRELOADS FOUR WEBFONTS, FROM ONE PLACE, BY A NAME THAT SURVIVES A BUILD ────────────

  Three separate things are held here, and they are one subject because breaking any of them
  produces the SAME invisible symptom: the icon faces arrive after first paint, the navbar and both
  tab strips reflow in front of the member, and nothing in this repository notices. A missing
  preload type-checks, lints, passes `svelte-check`, and renders identically in a screenshot taken
  a second later.

  ## 1. The allow-list names files that exist

  `hooks.server.ts` matches fonts by `filename` — the SOURCE path, project-relative — because the
  `path` is the hashed output and changes on every build. The cost of naming a source is that a
  rename anywhere upstream turns an entry into a string that matches nothing, silently. So every
  entry is resolved against the disk here.

  ## 2. It is an allow-list, not an extension test

  `type === 'font' && path.endsWith('.woff2')` was the previous form and preloaded whatever the
  root layout's CSS graph happened to contain. Preload is a claim on the critical path; a set that
  grows without a decision is the open rule `CLAUDE.md` forbids. The negative control for this is
  the interesting one — put the extension test back and the case below goes red.

  ## 3. There is exactly ONE mechanism

  `+layout.svelte` used to hand-write `<link rel="preload" as="font">` for three of these four, so
  each was preloaded twice per page and the two lists had drifted (three against four). Both halves
  are asserted, because deleting the layout tags WITHOUT the filter in place is the change that
  silently removes font preloading altogether.

  ## Why the installed types are read rather than quoted

  `filename` arrived in SvelteKit 3.0.0-next.24 and is announced in the September 2026 Svelte blog;
  the PUBLISHED `kit/hooks` doc still shows the older `{ type, path }` signature with no union. So
  the authority for what this app compiles against is the installed declaration, and it is read
  below at its bytes rather than transcribed — a transcription is a claim, and this file exists
  because claims about fonts are the ones nothing else checks.
*/

const ROOM = fileURLToPath(new URL('../..', import.meta.url));
const HOOKS = readFileSync(`${ROOM}src/hooks.server.ts`, 'utf8');
const LAYOUT = readFileSync(`${ROOM}src/routes/+layout.svelte`, 'utf8');

/**
 * The entries as the filter will see them, parsed out of the `Set` literal rather than restated.
 *
 * A hardcoded copy is the version of this that cannot fail usefully: add a fifth font and the copy
 * still describes four, so the existence check goes on passing over a name it never looked at.
 */
const allowListed = (): string[] => {
  const source = codeOf('src/hooks.server.ts', HOOKS);
  const start = source.indexOf('const PRELOADED_FONT_SOURCES');
  expect(start, 'the allow-list is gone from hooks.server.ts').toBeGreaterThan(-1);
  const end = source.indexOf(']);', start);
  expect(end, 'the allow-list literal is unterminated').toBeGreaterThan(start);
  return [...source.slice(start, end).matchAll(/'([^']+)'/g)].map((match) => match[1]);
};

describe('every preloaded webfont source names a file that is really there', () => {
  it('resolves all four, and finds no fewer than four', () => {
    const entries = allowListed();
    /*
      A floor, not an equality. The list may legitimately grow — a new icon face in the root
      layout's CSS is a real reason — and this case is about each entry being real, not about the
      count. The count is held one case down, where the argument for it can be made.
    */
    expect(entries.length, 'the allow-list parsed empty').toBeGreaterThanOrEqual(4);
    for (const entry of entries) {
      expect(
        existsSync(`${ROOM}${entry}`),
        `${entry} is preloaded by name and no such file exists — the face now arrives late`
      ).toBe(true);
    }
  });

  it('covers the woff2 of both faces the root layout draws with', () => {
    const entries = allowListed();
    for (const face of ['fa-brands-400', 'fa-regular-400', 'fa-solid-900', 'summernote']) {
      expect(
        entries.some((entry) => entry.includes(face) && entry.endsWith('.woff2')),
        `${face} lost its preload`
      ).toBe(true);
    }
    /*
      And nothing but woff2. Each `@font-face` offers several sources and a browser takes exactly
      one; the eight non-woff2 siblings in the build are 573,164 bytes that would be fetched and
      never used. Measured 2026-09-02 against `.svelte-kit/output/client/_app/immutable/assets`.
    */
    for (const entry of entries) {
      expect(
        entry.endsWith('.woff2'),
        `${entry} is not a woff2 — it would be downloaded unused`
      ).toBe(true);
    }
  });
});

describe('the filter matches on the source name, not the hashed output', () => {
  it('reads `filename` and not `path`', () => {
    const code = codeOf('src/hooks.server.ts', HOOKS);
    expect(code).toContain("input.type === 'font' && PRELOADED_FONT_SOURCES.has(input.filename)");
    /*
      The specific regression: `path` is the built asset's hashed name, so an allow-list of source
      names tested against it matches NOTHING and every font quietly stops being preloaded.
    */
    expect(code, 'the filter is back to testing the hashed output path').not.toContain(
      "path.endsWith('.woff2')"
    );
  });

  it('is the shape the installed SvelteKit declares, read from the installed types', () => {
    /*
      Not a transcription. If a future kit drops `filename` from the font branch, or renames it,
      this reads the new text and fails — which is the only warning this app would get, since the
      filter would still type-check against `path` alone.
    */
    const types = readFileSync(`${ROOM}node_modules/@sveltejs/kit/types/index.d.ts`, 'utf8');
    expect(types).toContain("| { type: 'font'; path: string; filename: string }");
  });
});

describe('font preloading has exactly one mechanism', () => {
  it('is not also hand-written in the root layout', () => {
    const markup = codeOf('src/routes/+layout.svelte', LAYOUT);
    expect(
      markup,
      'the layout is preloading fonts again — that is two lists to keep in step'
    ).not.toContain('rel="preload"');
    expect(markup, 'the `?url` font imports are back').not.toContain('.woff2?url');
  });

  it('and the layout still says where preloading went', () => {
    /*
      An empty layout with no explanation is how the filter gets deleted next: somebody removes the
      `font` branch from `hooks.server.ts` seeing nothing that depends on it. The pointer is the
      thing that has to survive, so it is asserted rather than trusted.
    */
    expect(LAYOUT).toContain('hooks.server.ts');
    expect(LAYOUT).toContain('font-preload-contract.test.ts');
  });
});
