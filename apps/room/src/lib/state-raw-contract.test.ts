import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/*
  AN OBJECT THAT IS ONLY EVER REPLACED USES `$state.raw`.

  ## The rule, and where it comes from

  Svelte's best-practices page: *"Objects and arrays (`$state({...})` or `$state([...])`) are made
  deeply reactive, meaning mutation will trigger updates. This has a trade-off: in exchange for
  fine-grained reactivity, the objects must be proxied, which has performance overhead. In cases
  where you're dealing with large objects that are only ever reassigned (rather than mutated), use
  `$state.raw` instead."*

  Note what the trade-off actually is. If the code never mutates, the fine-grained half is never
  used — so the proxy is not a trade at all, it is pure cost. "Large" is the docs' motivating case,
  not the condition.

  ## What the audit found on 2026-08-17

  Ten fields across the room modules and components held an object or array that no code path
  mutates in place — every write was a whole-value replacement. Two were on hot paths and are worth
  naming, because they are the reason this is not cosmetic:

  * `RoomFeeds.#evidence` — every one of the six pipeline passes calls `#isHidden` and
    `#withEvidence` PER ROW, and both read `this.#evidence[key]`. A proxied record meant a proxy hop
    per row per pass, on the path that renders the log.
  * `RoomToasts.#notices` — read on every render of the toast host, replaced on every add and every
    expiry.

  The other eight are small — poll choices, upload previews, GIF results — and were converted for
  consistency rather than for measurable gain, which is stated so nobody reads a number into it.

  ## What this file does

  Re-runs the audit as a gate, using TypeScript's AST rather than a pattern, because the question is
  how a field is WRITTEN across a whole file and no regex can answer that. A new `$state` object
  that is never mutated fails here with the file and field named.

  It deliberately does NOT flag `$state` on primitives — `.raw` means nothing for a string or a
  boolean, and the docs' rule is explicitly about objects and arrays.
*/

const MODULE_DIR = 'src/lib/room';

/** Mutating array/Map/Set methods. A call to one of these is proof the value is not replace-only. */
const MUTATORS = new Set([
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'copyWithin',
  'set',
  'add',
  'delete',
  'clear'
]);

interface Field {
  readonly file: string;
  readonly name: string;
  readonly raw: boolean;
  readonly mutated: boolean;
}

/**
 * Every `$state(...)` / `$state.raw(...)` field holding an object or array, and whether anything
 * mutates it in place.
 *
 * Both declaration shapes the docs permit are read: a class field initialiser, and the first
 * assignment to a property inside the constructor. The first draft of this scanner read only the
 * former and missed `RoomFeeds.#evidence`, which is one of the two that mattered.
 */
const objectStateFields = (path: string): Field[] => {
  const text = readFileSync(path, 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.ESNext, true);
  const found = new Map<string, { raw: boolean; mutated: boolean }>();

  const runeOf = (node: ts.Node | undefined) => {
    if (!node || !ts.isCallExpression(node)) return null;
    const callee = node.expression.getText(source);
    if (callee !== '$state' && callee !== '$state.raw') return null;
    const argument = node.arguments[0];
    const typeArgument = node.typeArguments?.[0]?.getText(source) ?? '';
    const isObject =
      (argument !== undefined &&
        (ts.isObjectLiteralExpression(argument) || ts.isArrayLiteralExpression(argument))) ||
      /\[\]|Record<|Map<|Set</.test(typeArgument);
    return isObject ? { raw: callee === '$state.raw' } : null;
  };

  const declare = (node: ts.Node): void => {
    // `#x = $state(…)` as a class field
    if (ts.isPropertyDeclaration(node)) {
      const rune = runeOf(node.initializer);
      if (rune) found.set(node.name.getText(source), { raw: rune.raw, mutated: false });
    }
    // `this.#x = $state(…)` as the first constructor assignment
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      node.left.expression.kind === ts.SyntaxKind.ThisKeyword
    ) {
      const rune = runeOf(node.right);
      if (rune) found.set(node.left.name.getText(source), { raw: rune.raw, mutated: false });
    }
    ts.forEachChild(node, declare);
  };
  declare(source);

  const markMutations = (node: ts.Node): void => {
    // `this.#x.y = …` or `this.#x[i] = …`
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const left = node.left;
      if (ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left)) {
        const base = left.expression.getText(source);
        for (const name of found.keys()) {
          if (base === `this.${name}`) found.get(name)!.mutated = true;
        }
      }
    }
    // `this.#x.push(…)`
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      MUTATORS.has(node.expression.name.getText(source))
    ) {
      const base = node.expression.expression.getText(source);
      for (const name of found.keys()) {
        if (base === `this.${name}`) found.get(name)!.mutated = true;
      }
    }
    ts.forEachChild(node, markMutations);
  };
  markMutations(source);

  return [...found].map(([name, state]) => ({ file: path, name, ...state }));
};

const allFields = readdirSync(MODULE_DIR)
  .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
  .flatMap((name) => objectStateFields(`${MODULE_DIR}/${name}`));

describe('replace-only objects use $state.raw', () => {
  it('found the fields it is meant to police', () => {
    // At zero every assertion below is vacuous — the same guard the reader catalog carries.
    expect(allFields.length).toBeGreaterThan(5);
  });

  it('no deeply-reactive $state holds an object nothing mutates', () => {
    const wasteful = allFields
      .filter((field) => !field.raw && !field.mutated)
      .map((field) => `${field.file} — ${field.name}`);

    expect(
      wasteful,
      `these hold an object or array that is only ever REPLACED, so the deep proxy is pure overhead:\n  ${wasteful.join('\n  ')}\n\nSvelte's best practices: "In cases where you're dealing with large objects that are only ever reassigned (rather than mutated), use \`$state.raw\` instead." If the field really is mutated in place somewhere this scanner cannot see, say so in a comment beside it and mutate it through a method this can find.`
    ).toEqual([]);
  });

  it('and no $state.raw is mutated in place, which would silently do nothing', () => {
    /*
      The other direction, and the more dangerous one. `$state.raw` state "cannot be mutated; it can
      only be reassigned" — so a `.push` onto a raw array updates the array and notifies NOTHING.
      The screen keeps the old value and there is no error. That is the failure this half exists for.
    */
    const broken = allFields
      .filter((field) => field.raw && field.mutated)
      .map((field) => `${field.file} — ${field.name}`);

    expect(
      broken,
      `these are \`$state.raw\` but something mutates them in place:\n  ${broken.join('\n  ')}\n\nRaw state can only be REASSIGNED. A mutation updates the value and notifies nothing, so the UI silently keeps the old one — no error, no warning. Replace the whole value instead.`
    ).toEqual([]);
  });

  it('the two hot-path fields are raw, named so a revert is loud', () => {
    /*
      Asserted by name rather than left to the sweep above, because these two are the reason the
      slice was worth doing: `#evidence` is read per row per pass by six chained pipeline passes,
      and `#notices` is read on every render of the toast host.
    */
    const byName = (file: string, name: string) =>
      allFields.find((field) => field.file.endsWith(file) && field.name === name);

    expect(byName('feeds.svelte.ts', '#evidence')?.raw, '#evidence must stay raw').toBe(true);
    expect(byName('toasts.svelte.ts', '#notices')?.raw, '#notices must stay raw').toBe(true);
  });
});
