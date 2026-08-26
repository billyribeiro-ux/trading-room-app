import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  EVERY `#lib/…` SPECIFIER RESOLVES TO A FILE THAT EXISTS.

  The controller's copy of the room's gate, added in the same change that migrated both apps off the
  `$lib` alias on 2026-08-16. Duplicated rather than shared, and that is deliberate: the two apps
  have separate `package.json` files with separate `imports` fields, and this asserts THIS app's.
  A shared helper would have to be told which app it was checking, which is the same information in
  a less obvious place.

  ## Why it exists

  SvelteKit 3 replaced the alias with Node subpath imports, mapped LITERALLY — `#lib/*` to
  `./src/lib/*`, with no extension search and no index lookup. So `#lib/foo` is not a shorter way of
  writing `#lib/foo.js`; it is a path to a file that does not exist.

  In the room, the official codemod rewrote `$lib` inside STRING LITERALS in four contract tests and
  produced exactly that — extensionless specifiers, which failed only because something happened to
  assert on them. Nothing in this app happened to, so the check comes with it.

  ## The narrowing, stated rather than implied

  `from '…'` only, which is every real import AND every test string that quotes one. PROSE is not
  checked: a comment saying "see `#lib/foo`" is a pointer for a human, not a specifier, and
  demanding an extension there would be demanding that documentation be written in import syntax.
*/

const ROOT = new URL('../../', import.meta.url).pathname;
const LIB = `${ROOT}src/lib`;

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
 * `.ts` beside it. The codemod emitted `.js` for all 174 of its non-Svelte rewrites here.
 */
const resolveSpecifier = (specifier: string): string | null => {
  const relative = specifier.slice('#lib/'.length);
  const candidates = relative.endsWith('.js') ? [`${relative.slice(0, -3)}.ts`, relative] : [relative];
  for (const candidate of candidates) {
    const path = `${LIB}/${candidate}`;
    if (existsSync(path) && statSync(path).isFile()) return path;
  }
  return null;
};

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
    // At zero every assertion below is vacuous.
    expect(specifiers.length).toBeGreaterThan(150);
  });

  it('package.json declares the mapping they resolve through', () => {
    /*
      The single point of failure for all 204 of them: without this field every `#lib/…` is an
      unresolved bare specifier, and the build error lands far from its cause.
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
      `these \`#lib/…\` specifiers do not name a file under src/lib:\n  ${broken.join('\n  ')}\n\nSubpath imports are resolved LITERALLY. Write the extension: \`#lib/foo.js\` for a .ts module, \`#lib/Foo.svelte\` for a component, \`#lib/foo/index.js\` for a directory.`
    ).toEqual([]);
  });

  it('the deprecated $lib alias is gone from source, not merely unused', () => {
    /*
      Checked against IMPORTS rather than prose, because several comments name the old specifier
      while explaining the move away from it, and forbidding the string outright would forbid
      documenting the change.
    */
    const withAlias = sourceFiles(`${ROOT}src`)
      .filter((file) => /from '\$lib\//.test(readFileSync(file, 'utf8')))
      .map((file) => file.slice(ROOT.length));
    expect(withAlias, `${withAlias.join(', ')} still import from the removed $lib alias`).toEqual([]);
  });
});
