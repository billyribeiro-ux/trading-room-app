import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parse } from 'svelte/compiler';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/*
  ── AN `$effect` THAT ONLY ASSIGNS IS A `$derived` THAT HAS NOT BEEN WRITTEN YET ───────────────────

  ## The rule, quoted rather than paraphrased

  The official `$effect` page is unusually direct about this, and both halves matter:

    > `$effect` is best considered something of an escape hatch — useful for things like analytics
    > and direct DOM manipulation — rather than a tool you should use frequently. **In particular,
    > avoid using it to synchronise state.**
    >
    > — https://svelte.dev/docs/svelte/$effect, "When not to use `$effect`"

  and its own example of what not to write:

    > ```js
    > $effect(() => {
    >   doubled = count * 2;
    > });
    > ```
    > […] use `$derived` instead: `let doubled = $derived(count * 2);`

  `CLAUDE.md` records the same trap in the room's own words — *"`$effect` that assigns a value
  derived from other state → that is `$derived`. An effect reading a typed-into field re-runs per
  keystroke."* That sentence has governed by good intentions since it was written. This file makes it
  fail a build.

  ## Why this app has a copy, and what running the room's rule against it found

  The room's `effect-not-derived-contract.test.ts` has policed 63 effects across 23 files since
  2026-08-28. This app had no such gate. Run against it on 2026-09-01 the rule passed on its first
  invocation — **no effect here exists only to synchronise state** — but the corpus is a different
  shape and worth stating: this app contains exactly **ONE** `$effect` in 48 components. It leans on
  `$derived` almost everywhere, which is what the guidance below asks for, and that makes the gate
  cheap to keep and easy to violate the first time somebody reaches for an effect out of habit.

  The file is a deliberate SECOND COPY, for the reason `declaration-tag-contract.test.ts` gives in its
  own header: a vitest project cannot import across app boundaries here, and *"a rule enforced in one
  app and merely believed in the other is a rule that holds in one app."* The detector is byte-identical
  on purpose; only the corpus floor and this section differ.

  ## Why it is worth a gate rather than a habit

  The cost is not stylistic. An effect that synchronises state:

  * **runs a frame late.** `$derived` is computed when read; an effect is scheduled, so anything
    reading the assigned value in the same tick sees the previous value. That is a class of bug that
    reproduces once in twenty and never in a test.
  * **re-runs on every dependency change**, including the ones the assignment does not use, because
    the dependency set is whatever the body happened to read.
  * **is invisible to every other gate here.** `svelte-check` types it fine. `eslint` has no opinion.
    The suite passes, because the value does eventually arrive.

  That combination — silent, late, and correct-most-of-the-time — is the same shape as the seven test
  files that were being dropped from CI, and it is why this is an AST test and not a code review note.

  ## What it flags, and the deliberate narrowness of that

  ONE shape: an `$effect` whose body is nothing but assignment statements. No calls, no `if`, no
  `return`, no `await`, no `untrack`. That is the docs' own example and it has no legitimate use —
  every assignment in it could be a `$derived`.

  Everything else is left alone ON PURPOSE, because the legitimate uses look superficially similar
  and a gate with false positives gets suppressed rather than obeyed. Four real examples from this
  repository, none of which this flags and all of which a looser detector would:

  * `PostAlertModal.svelte` — `if (open && !wasOpen) beginOpenState(); wasOpen = open;`. Tracks a
    TRANSITION. `$derived` cannot express "became true", because it has no previous value.
  * `ModalHost.svelte` ×4 — `if (name !== 'settings') return; chatStyle = { ...initialChatStyle };`.
    Seeds an editable form when a modal opens. A `$derived` would recompute and CLOBBER what the user
    typed, which is the exact bug the rule is meant to prevent, arrived at from the other side.
  * `PresentationArea.svelte` — `void screens.selectedTab; … void mediaTransport.applyScreenLayers();`.
    Declares dependencies, then calls an imperative API. A command, not a value.
  * `Modal.svelte` — blurs a focused element. Direct DOM manipulation, which the docs name as the
    thing effects ARE for.

  So this is a floor, not a ceiling: passing it does not mean every effect here is justified. It means
  none of them is the one shape that is never justified.
*/

/** One `$effect` found in the corpus, and whether its body is assignments and nothing else. */
interface EffectBody {
  readonly file: string;
  readonly line: number;
  readonly assignsOnly: boolean;
  readonly targets: readonly string[];
}

/**
 * Every `$effect(…)` / `$effect.pre(…)` in a script, classified.
 *
 * TypeScript's AST rather than a pattern, for the reason `state-raw-contract.test.ts` gives for its
 * own scanner: the question is about the SHAPE of a whole function body, and no regex can answer it
 * without lying in one direction or the other.
 */
const effectBodies = (path: string, text: string): EffectBody[] => {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.ESNext, true);
  const found: EffectBody[] = [];

  const classify = (body: ts.ConciseBody): { assignsOnly: boolean; targets: string[] } => {
    /*
      A CONCISE ARROW BODY — `$effect(() => (x = y))` — is a single expression and is exactly the
      shape being caught, so it is handled rather than skipped. Missing it would leave the tersest
      spelling of the anti-pattern as the one way through.
    */
    const statements = ts.isBlock(body)
      ? body.statements
      : ([ts.factory.createExpressionStatement(body)] as unknown as ts.NodeArray<ts.Statement>);

    const targets: string[] = [];
    for (const statement of statements) {
      if (!ts.isExpressionStatement(statement)) return { assignsOnly: false, targets: [] };
      const expression = ts.isParenthesizedExpression(statement.expression)
        ? statement.expression.expression
        : statement.expression;
      if (!ts.isBinaryExpression(expression) || expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
        return { assignsOnly: false, targets: [] };
      }
      /*
        The RIGHT-HAND SIDE must be call-free. `x = compute()` is an assignment whose value may come
        from somewhere with side effects or a non-reactive source, and telling the author to make it
        a `$derived` could be wrong. `$derived` handles the pure case; that is the case this flags.
      */
      let hasCall = false;
      const walk = (node: ts.Node): void => {
        if (ts.isCallExpression(node) || ts.isAwaitExpression(node) || ts.isNewExpression(node)) {
          hasCall = true;
        }
        ts.forEachChild(node, walk);
      };
      walk(expression.right);
      if (hasCall) return { assignsOnly: false, targets: [] };
      targets.push(expression.left.getText(source));
    }
    return { assignsOnly: statements.length > 0, targets };
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(source);
      if (callee === '$effect' || callee === '$effect.pre') {
        const argument = node.arguments[0];
        if (argument && (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument))) {
          const { assignsOnly, targets } = classify(argument.body);
          found.push({
            file: path,
            line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
            assignsOnly,
            targets
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return found;
};

/**
 * Every tracked source file, `.svelte` script blocks included.
 *
 * `git ls-files` rather than a directory walk, matching `state-raw-contract.test.ts`: an untracked
 * scratch file is not the codebase, and a corpus that disagrees with the one the other rune gate
 * uses would be a second answer to the same question.
 */
const tracked = execSync("git ls-files 'src/**'", { encoding: 'utf8' }).trim().split('\n');

const allEffects: EffectBody[] = [
  ...tracked
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts'))
    .flatMap((file) => effectBodies(file, readFileSync(file, 'utf8'))),
  ...tracked
    .filter((file) => file.endsWith('.svelte'))
    .flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      const ast = parse(text, { modern: true });
      return [ast.instance, ast.module]
        .filter((block) => block !== null && block !== undefined)
        .flatMap((block) => {
          // See `state-raw-contract.test.ts` on why the offsets are widened at the read rather than
          // cast away: the two properties being relied on are named.
          const { start, end } = block.content as unknown as { start: number; end: number };
          return effectBodies(file, text.slice(start, end));
        });
    })
];

describe('no $effect exists only to synchronise state', () => {
  it('found the effects it is meant to police', () => {
    /*
      A floor, because every assertion below is vacuous at zero — and here the floor is ONE, which is
      the honest number: this app contained exactly one `$effect` on 2026-09-01, in
      `RichTextEditor.svelte`. The room's copy asserts `> 20` against its 63.

      A floor of one is weak as a tripwire and it is still worth having: it fails if the scanner or
      the `git ls-files` corpus collapses, which is the failure it exists for. The strong guard here
      is the case below, and the two `describe` blocks after it, which prove the detector still fires
      on the shape it is meant to catch and still leaves the legitimate shapes alone — those do not
      depend on the corpus at all.
    */
    expect(allEffects.length).toBeGreaterThanOrEqual(1);
  });

  it('reads .svelte script blocks and not only .ts modules', () => {
    // Every effect in this app is in a component. A scanner that silently covered only the `.ts`
    // modules would clear the floor above at zero and would be measuring nothing.
    expect(allEffects.some((effect) => effect.file.endsWith('.svelte'))).toBe(true);
  });

  it('has no effect whose body is assignments and nothing else', () => {
    const offenders = allEffects.filter((effect) => effect.assignsOnly);
    expect(
      offenders.map((effect) => `${effect.file}:${effect.line} assigns ${effect.targets.join(', ')}`),
      'An $effect whose body is only assignments is a $derived that has not been written yet. The official guidance is "avoid using it to synchronise state" (svelte.dev/docs/svelte/$effect). It also runs a frame late, so anything reading the assigned value in the same tick sees the previous one. Replace each with $derived, or $derived.by for a multi-statement computation.'
    ).toEqual([]);
  });
});

describe('the detector fires on the shape it is meant to catch', () => {
  const classifyOne = (body: string) => effectBodies('probe.ts', `$effect(() => {${body}});`)[0];

  it("flags the documentation's own counter-example", () => {
    // `$effect(() => { doubled = count * 2; })` — the exact snippet the docs tell you not to write.
    expect(classifyOne('doubled = count * 2;').assignsOnly).toBe(true);
  });

  it('flags several assignments as readily as one', () => {
    const found = classifyOne('a = x + 1;\nb = y - 1;');
    expect(found.assignsOnly).toBe(true);
    expect(found.targets).toEqual(['a', 'b']);
  });

  it('flags the concise arrow spelling', () => {
    /*
      `$effect(() => (x = y))` has no block, and an earlier draft of this scanner skipped it — which
      would have left the tersest way to write the anti-pattern as the one way through the gate.
    */
    expect(effectBodies('probe.ts', '$effect(() => (x = y));')[0].assignsOnly).toBe(true);
  });

  it('covers $effect.pre too', () => {
    expect(effectBodies('probe.ts', '$effect.pre(() => { a = b; });')[0].assignsOnly).toBe(true);
  });
});

describe('the detector leaves the legitimate shapes alone', () => {
  const classifyOne = (body: string) => effectBodies('probe.ts', `$effect(() => {${body}});`)[0];

  it('does not flag a body that calls anything', () => {
    // Direct DOM manipulation and analytics — the two uses the docs name as what effects are FOR.
    expect(classifyOne('element.focus();').assignsOnly).toBe(false);
    expect(classifyOne('track(page);').assignsOnly).toBe(false);
  });

  it('does not flag a transition tracker', () => {
    // `PostAlertModal.svelte`. `$derived` has no previous value, so it cannot express "became true".
    expect(classifyOne('if (open && !wasOpen) beginOpenState();\nwasOpen = open;').assignsOnly).toBe(false);
  });

  it('does not flag a guarded reset that seeds an editable form', () => {
    /*
      `ModalHost.svelte`, four times over. Making these `$derived` would recompute on every
      dependency change and CLOBBER what the user typed — the same bug the rule prevents, reached
      from the other side. The early `return` is what distinguishes them and is why the detector
      requires EVERY statement to be an assignment.
    */
    expect(classifyOne("if (name !== 'settings') return;\nchatStyle = { ...initialChatStyle };").assignsOnly).toBe(
      false
    );
  });

  it('does not flag an assignment whose value comes from a call', () => {
    // `x = compute()` may draw from somewhere non-reactive or with side effects; telling the author
    // to make it a `$derived` could be wrong, and a gate that is sometimes wrong gets suppressed.
    expect(classifyOne('rows = load();').assignsOnly).toBe(false);
    expect(classifyOne('rows = await load();').assignsOnly).toBe(false);
  });

  it('does not flag an effect that returns a teardown', () => {
    // The documented cleanup shape. A `return` is not an assignment, so it falls out naturally —
    // asserted anyway, because "naturally" is how a detector quietly changes meaning later.
    expect(classifyOne('a = b;\nreturn () => stop();').assignsOnly).toBe(false);
  });
});
