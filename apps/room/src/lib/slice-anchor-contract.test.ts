import { readdirSync, readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/*
  A SLICE TAKEN FROM AN UNCHECKED `indexOf` IS A TEST THAT PASSES AGAINST NOTHING.

  ## The failure, which this repository has now hit at least four times

  ```js
  const at = PAGE.indexOf('<div class="room-sound-options">');   // -1 when the markup moved
  const rows = PAGE.slice(at);                                   // slice(-1) -> one character
  expect(rows).not.toContain('idPrefix');                        // passes. against one character.
  ```

  That exact code sat green in `screen-volume-contract.test.ts` from 2026-08-15 to 2026-08-17,
  through three later commits to the same file, while the thing it guarded had moved to
  `RoomNavbar.svelte`. It was found by a person reading the file, not by anything automated. The
  sibling slice ten lines above it HAD been re-pointed in the very commit that broke this one, so it
  was a single missed line — which is the argument for a gate rather than for more care.

  The same shape produced the `day-separator` failure and the `toContain('readingHistory')` failure
  that matched `readingHistory: false`. Four instances, one shape.

  ## Why the fix is an ANCHOR ASSERTION and not "be careful"

  `String.prototype.slice(-1)` is not an error. It is a documented, well-defined operation returning
  the last character, and `indexOf` returning `-1` is the ordinary way it reports "not found". So
  every layer below behaves exactly as specified and the test still tells you nothing. Nothing in
  TypeScript, eslint, `svelte-check` or vitest can see it, because nothing is wrong — the test is
  simply asking a question about the empty string.

  The cure is one line, and it is already the convention in the files that learned it:

  ```js
  const at = SOURCE.indexOf(marker);
  expect(at, 'the marker must exist for this guard to test anything').toBeGreaterThan(-1);
  const region = SOURCE.slice(at);
  ```

  ## What this checks

  Every `*.test.ts` under `src/lib`, via the TypeScript AST rather than a pattern, because the
  question is whether a VALUE flows from an `indexOf` into a `slice` bound — which no regex can
  answer. For each local bound to an `indexOf`/`lastIndexOf` result and later used as a `slice`
  argument, there must be an `expect(<that local>…).toBeGreaterThan(-1)` (or `>= 0`) somewhere in
  the same file.

  Same file rather than same block, deliberately: the anchor is often asserted once and the slice
  used two or three times below it, and demanding lexical adjacency would fail correct code. The
  narrowing is stated rather than implied — a check that flags correct code gets suppressed, which
  is the note `orphaned-comment-contract` makes for its own narrowing.

  ## The honest gap

  An inline `SOURCE.slice(SOURCE.indexOf(x))` with no intermediate variable is not caught: there is
  no local to assert on, so there is nothing this could name in a failure message. Those are counted
  and reported by the second test rather than left silent, so the number cannot drift upward
  unnoticed.
*/

const TEST_FILES = readdirSync('src/lib')
  .filter((name) => name.endsWith('.test.ts'))
  .map((name) => `src/lib/${name}`);

interface Anchor {
  readonly name: string;
  readonly line: number;
  checked: boolean;
  sliced: boolean;
}

/** `x.slice(...)` / `x.substring(...)` — a call whose callee property is a slicing method. */
const SLICERS = new Set(['slice', 'substring', 'substr']);

/** `x.indexOf(...)` / `x.lastIndexOf(...)` — a call producing a position or `-1`. */
const FINDERS = new Set(['indexOf', 'lastIndexOf', 'search']);

const isCallTo = (node: ts.Node, names: ReadonlySet<string>, source: ts.SourceFile): boolean =>
  ts.isCallExpression(node) &&
  ts.isPropertyAccessExpression(node.expression) &&
  names.has(node.expression.name.getText(source));

interface Scan {
  readonly anchors: Anchor[];
  /** `s.slice(s.indexOf(x))` with no local in between — nothing to name, so nothing to assert. */
  readonly inlined: number;
}

const scan = (path: string): Scan => {
  const text = readFileSync(path, 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.ESNext, true);
  const found = new Map<string, Anchor>();
  let inlined = 0;

  const collect = (node: ts.Node): void => {
    // `const at = SOURCE.indexOf(marker);`
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      isCallTo(node.initializer, FINDERS, source) &&
      ts.isIdentifier(node.name)
    ) {
      found.set(node.name.text, {
        name: node.name.text,
        line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        checked: false,
        sliced: false
      });
    }
    ts.forEachChild(node, collect);
  };
  collect(source);

  const inspect = (node: ts.Node): void => {
    if (isCallTo(node, SLICERS, source)) {
      const call = node as ts.CallExpression;
      for (const argument of call.arguments) {
        // An `indexOf` call written directly into the bound: no local exists to assert on.
        if (isCallTo(argument, FINDERS, source)) inlined += 1;
        const argumentText = argument.getText(source);
        for (const anchor of found.values()) {
          if (new RegExp(`\\b${anchor.name}\\b`).test(argumentText)) anchor.sliced = true;
        }
      }
    }
    // `expect(at, '…').toBeGreaterThan(-1)` / `.toBeGreaterThanOrEqual(0)`
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.getText(source);
      if (method === 'toBeGreaterThan' || method === 'toBeGreaterThanOrEqual') {
        const subject = node.expression.expression.getText(source);
        for (const anchor of found.values()) {
          if (new RegExp(`expect\\(\\s*${anchor.name}\\b`).test(subject)) anchor.checked = true;
        }
      }
    }
    /*
      THE OTHER GUARD, and it is equally valid: a plain comparison against -1.

      `alerts-background-contract.test.ts` writes `return open === -1 || close === -1 ? null : …`,
      which handles the miss correctly and never reaches the slice. The first draft of this file
      flagged it, and flagging correct code is how a gate gets suppressed — so the comparison form is
      recognised rather than legislated against. `expect` is the convention for a test that should
      FAIL on a miss; a conditional is right for a helper that should return nothing.
    */
    if (ts.isBinaryExpression(node)) {
      const operator = node.operatorToken.kind;
      const isMissCheck =
        operator === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        operator === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
        operator === ts.SyntaxKind.LessThanToken ||
        operator === ts.SyntaxKind.GreaterThanToken ||
        operator === ts.SyntaxKind.GreaterThanEqualsToken;
      if (isMissCheck) {
        const left = node.left.getText(source);
        const right = node.right.getText(source);
        const againstMiss = /^-\s*1$|^0$/.test(right) || /^-\s*1$|^0$/.test(left);
        if (againstMiss) {
          for (const anchor of found.values()) {
            const named = new RegExp(`\\b${anchor.name}\\b`);
            if (named.test(left) || named.test(right)) anchor.checked = true;
          }
        }
      }
    }
    ts.forEachChild(node, inspect);
  };
  inspect(source);

  return { anchors: [...found.values()].filter((a) => a.sliced), inlined };
};

const scans = TEST_FILES.map((file) => ({ file, ...scan(file) }));

describe('a slice bound by indexOf asserts that indexOf found something', () => {
  it('finds the pattern it is meant to police', () => {
    /*
      The vacuity guard on the guard. The first draft of this scanner reported ZERO unguarded slices
      across every test file — not because the codebase was clean, but because it detected `.slice(`
      by reading `node.expression.getText()`, which for `code.slice(at)` yields `code.slice` and
      contains no parenthesis. It matched nothing, and "0 problems" read exactly like success.

      So the floor is asserted: this pattern is used widely here, and a scanner that stops seeing it
      is broken rather than vindicated.
    */
    const total = scans.reduce((sum, s) => sum + s.anchors.length, 0);
    expect(
      total,
      'the scanner found no indexOf-bound slices at all, which means it is broken, not that the tests are clean'
    ).toBeGreaterThan(10);
    expect(TEST_FILES.length).toBeGreaterThan(50);
  });

  it('every indexOf used as a slice bound is asserted to have found something', () => {
    const unguarded = scans.flatMap(({ file, anchors }) =>
      anchors.filter((a) => !a.checked).map((a) => `${file}:${a.line} — ${a.name}`)
    );

    expect(
      unguarded,
      `these locals hold an \`indexOf\` result that is used as a slice bound, and nothing asserts the marker was FOUND:\n  ${unguarded.join('\n  ')}\n\nWhen the marker moves, \`indexOf\` returns -1, \`slice(-1)\` yields one character, and every assertion below runs against that character and PASSES. Add one line before the slice:\n\n  expect(at, 'the marker must exist for this guard to test anything').toBeGreaterThan(-1);`
    ).toEqual([]);
  });

  it('records how many slices inline their indexOf, since those cannot be checked here', () => {
    /*
      Reported rather than forbidden. `s.slice(s.indexOf(x))` has no local to name in a failure
      message, so this file has nothing useful to say about it — but the count is pinned so the
      number cannot climb quietly into the gap. If it rises, the fix is to bind a local and assert
      it, which is what every guarded site above already does.
    */
    const inlined = scans.reduce((sum, s) => sum + s.inlined, 0);
    /*
      142 measured on 2026-08-17. Not a target and not a debt to pay down in one go — a ceiling, in
      the same spirit as `source-size-contract`'s. It may only go DOWN.
    */
    expect(
      inlined,
      'a slice inlining its own indexOf cannot be guarded by this file; bind the position to a local and assert it instead'
    ).toBeLessThanOrEqual(142);
  });
});
