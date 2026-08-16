import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  EVERY `#lib/…` SPECIFIER RESOLVES TO A FILE THAT EXISTS.

  ## Why this file exists

  SvelteKit 3 replaced the `$lib` alias with Node subpath imports. The `imports` field in
  `package.json` maps `#lib/*` to `./src/lib/*` LITERALLY — there is no extension resolution and no
  index lookup, which is the whole reason Node and TypeScript accept it without a resolver. So
  `#lib/foo` is not a shorter way of writing `#lib/foo.js`; it is a path to a file that does not
  exist.

  The migration was performed by the official `sv migrate sveltekit-3 --tasks lib-alias` codemod on
  2026-08-16, across 480 specifiers. It got the imports right and it also rewrote `$lib` inside
  STRING LITERALS in four contract tests — where the text is an assertion about source, not an
  import — and there it wrote `#lib/chat-mode` with no extension, because there was no import
  statement for it to resolve. Those four failed loudly and were fixed.

  That is the near miss worth recording: they failed only because something happened to assert on
  them. A `#lib/…` string in prose, in a comment, or in a test that reads a file by path would have
  been silently wrong. This test closes that by checking the specifiers themselves rather than
  trusting that a build would have noticed.

  ## What it checks

  Every `#lib/…` specifier reached through `from '…'` — which is every real import AND every
  contract-test string that QUOTES an import, the exact pair that went wrong above. `.js` maps to the
  `.ts` on disk, which is the TypeScript ESM convention Kit's own codemod emits and which
  `moduleResolution: "bundler"` resolves; `.svelte` and `.json` are literal.

  A bare `#lib/foo` with no extension is a failure, because the `imports` field cannot resolve it and
  the only reason to write one is not knowing that.

  ## The narrowing, stated rather than implied

  PROSE is not checked. The codemod also rewrote `$lib/mention` to `#lib/mention` inside comments —
  four of them, all sentences like "See `#lib/mention` for the reference's own three terms" — and
  those are pointers to a module for a human, not specifiers. Demanding `.js` there would be
  demanding that documentation be written in import syntax. The first draft of this file did exactly
  that and reported all four, plus six matches inside its own explanation of the rule.

  What that costs: a `#lib/…` written in prose can name a module that no longer exists and this will
  not say so. That is a documentation-rot problem, not a resolution one, and it is the same class the
  orphaned-comment gate handles.
*/

const ROOT = new URL('../../', import.meta.url).pathname;
const LIB = `${ROOT}src/lib`;

/** Every source file under `src`, excluding nothing — a string in a test counts. */
const sourceFiles = (dir: string): string[] => {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) found.push(...sourceFiles(path));
    else if (/\.(ts|js|svelte)$/.test(entry.name)) found.push(path);
  }
  return found;
};

/**
 * The file a specifier names, or `null` when nothing is there.
 *
 * `.js` -> `.ts` is the one rewrite, and it is the convention rather than a guess: Kit's generated
 * base sets `moduleResolution: "bundler"`, under which TypeScript resolves a `.js` specifier to the
 * `.ts` beside it. The codemod emitted `.js` for all 440 of its non-Svelte rewrites.
 */
const resolveSpecifier = (specifier: string): string | null => {
  const relative = specifier.slice('#lib/'.length);
  const candidates = relative.endsWith('.js')
    ? [`${relative.slice(0, -3)}.ts`, relative]
    : [relative];
  for (const candidate of candidates) {
    const path = `${LIB}/${candidate}`;
    if (existsSync(path) && statSync(path).isFile()) return path;
  }
  return null;
};

/**
 * `from '#lib/…'` only — see the narrowing note in the header.
 *
 * The quote class is `['"]` because the four assertion strings that failed live INSIDE a
 * double-quoted string and therefore quote their import with single quotes.
 */
const SPECIFIER = /from\s+['"](#lib\/[\w./-]*)['"]/g;

const everySpecifier = () => {
  const found: { file: string; specifier: string }[] = [];
  for (const file of sourceFiles(`${ROOT}src`)) {
    for (const match of readFileSync(file, 'utf8').matchAll(SPECIFIER)) {
      found.push({ file: file.slice(ROOT.length), specifier: match[1] });
    }
  }
  return found;
};

describe('the #lib subpath imports all point at real files', () => {
  const specifiers = everySpecifier();

  it('found the specifiers it is meant to check', () => {
    // At zero every assertion below is vacuous — the same guard the reader catalog carries.
    expect(specifiers.length).toBeGreaterThan(400);
  });

  it('package.json declares the mapping they resolve through', () => {
    /*
      Without this field every `#lib/…` is an unresolved bare specifier. It is asserted here rather
      than assumed because it is the single point of failure for all 480 of them, and deleting it
      would produce a build error far from its cause.
    */
    const manifest = JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8'));
    expect(manifest.imports).toEqual({
      '#lib': './src/lib/index.js',
      '#lib/*': './src/lib/*'
    });
  });

  it('every specifier resolves, and none is missing its extension', () => {
    const broken = specifiers
      .filter(({ specifier }) => resolveSpecifier(specifier) === null)
      .map(({ file, specifier }) => `${file} -> ${specifier}`);

    expect(
      broken,
      `these \`#lib/…\` specifiers do not name a file under src/lib:\n  ${broken.join('\n  ')}\n\nSubpath imports are resolved LITERALLY — \`#lib/*\` maps to \`./src/lib/*\` with no extension search and no index lookup. Write the extension: \`#lib/foo.js\` for a .ts module, \`#lib/Foo.svelte\` for a component, \`#lib/foo/index.js\` for a directory.`
    ).toEqual([]);
  });

  it('the deprecated $lib alias is gone from source, not merely unused', () => {
    /*
      The alias in `vite.config.ts` was removed with this migration, so a surviving `$lib` specifier
      would not resolve at all. Checked against imports rather than prose: several comments name the
      old specifier while explaining the move away from it, and forbidding the string outright would
      forbid documenting it.
    */
    const withAlias = sourceFiles(`${ROOT}src`)
      .filter((file) => /from '\$lib\//.test(readFileSync(file, 'utf8')))
      .map((file) => file.slice(ROOT.length));
    expect(withAlias, `${withAlias.join(', ')} still import from the removed $lib alias`).toEqual(
      []
    );
  });
});
