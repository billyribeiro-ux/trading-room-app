/**
 * The quoted names declared in a `const NAME = [ … ]` array inside a build script, read as SOURCE.
 *
 * ## Why this exists
 *
 * Three tests parse the two build scripts this way — `room-config-boundary.test.ts` reads
 * `ROOM_CONSUMED`, and `sso-boundary.test.ts` reads both `WIRED_SETTINGS` and the verifier's
 * `EXPECTED_WIRED_SETTINGS`. Those scripts cannot import this module (the generator has to run
 * before the file it generates exists), so the lists are duplicated on purpose and the tests are
 * what keep the copies honest.
 *
 * All three did the same thing: `[...block.matchAll(/'([^']+)'/g)]` over the raw array body. Every
 * entry in those arrays carries a long explanatory comment, so **the pattern was reading prose as
 * well as code** — and it happened to work only because no comment in either script had ever
 * contained an apostrophe. That is a convention nobody stated and nothing checked.
 *
 * On 2026-08-30 an entry was added whose comment said "the reference's own validator" and "this
 * VIEWER's settings row". Two apostrophes, so the pattern matched the span BETWEEN them as a name
 * and lost the real entry, and all three tests went red on a change that was correct. A test that
 * fails on prose is a test that will one day pass on prose.
 *
 * Comments are stripped first now, so the arrays may be commented like every other list in this
 * repository. `apps/room/src/lib/source-comments.ts` states the same rule for the room's gates; the
 * two cannot be shared across apps, so this docblock names its sibling rather than pretending to be
 * the only one.
 */
export function scriptListNames(script: string, name: string): string[] | null {
  const block = new RegExp(`const ${name} = \\[([^\\]]*)\\]`).exec(script);
  if (!block) return null;
  const code = block[1]
    /* Block comments first: a `//` inside one (a URL, say) must not end the strip early. */
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  return [...code.matchAll(/'([^']+)'/g)].map((match) => match[1]).sort();
}
