import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The client must treat ids as opaque keys.

  This is the single assumption the room-to-API cutover rests on
  (`docs/CUTOVER-ROOM-TO-API.md` §1). SQLite gives the client numeric ids; the Rust API gives it
  uuids. Replacing one with the other is a server-side change ONLY as long as no client code
  does arithmetic on an id, orders by one numerically, or compares one to a number.

  If that stops being true, the cutover silently needs a bridge - a per-user mapping from uuid
  back to a numeric id, carried for the length of the migration - and the failure would not show
  up as a type error. `poll.id + 1` is valid TypeScript against `number` and quietly produces
  "abc1" against a uuid string.

  So the claim is asserted here rather than written in a document, because a document does not
  fail a build. `docs/REPOSITORY-STATE-2026-07-30.md` was materially wrong for three days and
  nothing noticed.
*/

const CLIENT_ROOT = new URL('../', import.meta.url);

/**
 * Strips comments before scanning.
 *
 * This rule is about what the CODE does with an id. A comment that names the forbidden pattern in
 * order to warn against it - "keying by a stringified id would mean Number(uid) here" - is the rule
 * being obeyed, and counting it reports a violation for the fix. That happened; this is the fix.
 *
 * Block comments, line comments and HTML comments, because these files are `.svelte`.
 */
function withoutComments(source: string) {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function clientSources(): { path: string; source: string }[] {
  const files: { path: string; source: string }[] = [];

  const componentDir = new URL('lib/components/', CLIENT_ROOT);
  for (const name of readdirSync(componentDir)) {
    if (!name.endsWith('.svelte')) continue;
    files.push({
      path: `src/lib/components/${name}`,
      source: withoutComments(readFileSync(new URL(name, componentDir), 'utf8'))
    });
  }

  for (const name of ['routes/+page.svelte', 'routes/+layout.svelte']) {
    try {
      files.push({
        path: `src/${name}`,
        source: withoutComments(readFileSync(new URL(name, CLIENT_ROOT), 'utf8'))
      });
    } catch {
      // +layout.svelte is optional; a missing file is not a violation.
    }
  }

  return files;
}

/*
  Each pattern is something that only works if an id is a number.

  `Number(...)`/`parseInt(...)` around an id is the obvious one. The arithmetic and comparison
  forms matter more, because they are the ones that produce a wrong answer instead of NaN:
  sorting uuids with `a.id - b.id` yields NaN for every pair, which `Array.sort` treats as
  "equal" - so the list silently stops being ordered rather than throwing.
*/
const NUMERIC_ID_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'Number() around an id', pattern: /\bNumber\(\s*[\w.]*[Ii]d\b/g },
  { name: 'parseInt() around an id', pattern: /\bparseInt\(\s*[\w.]*[Ii]d\b/g },
  { name: 'arithmetic on an id', pattern: /\.[Ii]d\s*[-+*/]\s*(?![-+=])/g },
  { name: 'Math.max/min over ids', pattern: /Math\.(?:max|min)\([^)]*\.[Ii]d\b/g },
  { name: 'id compared to a number literal', pattern: /\.[Ii]d\s*[=!]==?\s*-?\d/g }
];

/*
  The one known site, pinned rather than excluded by a blanket ignore.

  `+page.svelte` converts `user._id` to a number and hands it straight back through
  `String(user.id)` thirteen lines later, so the value never reaches anything that treats it
  arithmetically. It is allowed because it round-trips - not because it is old.
*/
const ALLOWED = new Map<string, number>([['src/routes/+page.svelte::Number() around an id', 1]]);

describe('client id opacity', () => {
  it('reads every client source it claims to check', () => {
    const files = clientSources();
    expect(files.length).toBeGreaterThan(5);
    expect(files.map((file) => file.path)).toContain('src/routes/+page.svelte');
  });

  it('never treats an id as a number, beyond the one pinned round-trip', () => {
    const violations: string[] = [];

    for (const { path, source } of clientSources()) {
      for (const { name, pattern } of NUMERIC_ID_PATTERNS) {
        const hits = source.match(pattern) ?? [];
        const allowed = ALLOWED.get(`${path}::${name}`) ?? 0;

        if (hits.length > allowed) {
          violations.push(
            `${path}: ${name} — found ${hits.length}, allowed ${allowed}: ${hits.join(', ')}`
          );
        }
      }
    }

    expect(
      violations,
      'A client that does arithmetic on an id breaks the room-to-API cutover: uuids are ' +
        'strings, and this is the assumption that lets the identity type change stay ' +
        'server-side. See docs/CUTOVER-ROOM-TO-API.md §1. If the new code is genuinely a ' +
        'round-trip like the pinned one, add it to ALLOWED with a reason.'
    ).toEqual([]);
  });
});
