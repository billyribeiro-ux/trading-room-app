import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { execSync } from 'node:child_process';
import ts from 'typescript';
import { parse } from 'svelte/compiler';
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

  ## WIDENED 2026-08-18, because it had been reading one directory and one declaration shape

  As written above, the corpus was `readdirSync('src/lib/room')` and the two declaration forms were
  a class field and a `this.#x = $state(…)` in a constructor. That is every state CLASS in the room
  and nothing else — so all 46 `.svelte` components and every plain `let x = $state(…)` were outside
  it. A conformance sweep on 2026-08-18 found five replace-only objects sitting in exactly that
  blind spot:

  * `captionHistory` in `+page.svelte` — 500 entries, replaced wholesale up to twice a second.
  * `globalChatStyle` in `+page.svelte` — read by `messageChrome`, i.e. on every rendered message.
  * `advancedSearchResults` in `ModalHost.svelte`; `audioDevices` / `videoDevices` in `AvDevicePane`.

  This is the same failure shape `source-size-contract.test.ts` and `unbound-method-contract.test.ts`
  each record paying for once: a guard whose corpus is narrower than the rule it enforces reads as
  coverage. The corpus is now every tracked `.ts` module and every `.svelte` script block.

  ## AND THE `bind:` HALF, WITHOUT WHICH THE WIDENING WOULD HAVE BEEN WORSE THAN USELESS

  The first draft of that sweep reported EIGHT findings. Three were wrong: `userPermissions`,
  `followChatStyle` and `chatStyle` in `ModalHost` are each mutated by
  `bind:checked={userPermissions.hasMic}` and friends, and a two-way binding to a MEMBER is a
  property write. The sweep had walked only the `<script>` AST, so every one of those writes was
  invisible to it — and converting them would have silently broken six settings toggles and a colour
  picker with the suite fully green, because a mutation of raw state does not throw.

  So for a component, mutation is decided from BOTH halves: the script AST *and* the template's
  `BindDirective` nodes. That is the most important line in this file, and the negative controls at
  the bottom pin it in both directions.
*/

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
const objectStateFields = (path: string, text: string, boundRoots: ReadonlySet<string>): Field[] => {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.ESNext, true);
  const found = new Map<string, { raw: boolean; mutated: boolean }>();

  const runeOf = (node: ts.Node | undefined) => {
    if (!node || !ts.isCallExpression(node)) return null;
    const callee = node.expression.getText(source);
    if (callee !== '$state' && callee !== '$state.raw') return null;
    const argument = node.arguments[0];
    const typeArgument = node.typeArguments?.[0]?.getText(source) ?? '';
    const isObject =
      (argument !== undefined && (ts.isObjectLiteralExpression(argument) || ts.isArrayLiteralExpression(argument))) ||
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
    /*
      `let x = $state(…)` — the component shape, added with the 2026-08-18 widening. Every finding
      that had been hiding from this file was one of these; the two branches above only ever see a
      class.
    */
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const rune = runeOf(node.initializer);
      if (rune) found.set(node.name.text, { raw: rune.raw, mutated: false });
    }
    ts.forEachChild(node, declare);
  };
  declare(source);

  const markMutations = (node: ts.Node): void => {
    // `this.#x.y = …` or `this.#x[i] = …`
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const left = node.left;
      if (ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left)) {
        markBase(left.expression.getText(source));
      }
    }
    // `this.#x.push(…)` / `list.push(…)`
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      MUTATORS.has(node.expression.name.getText(source))
    ) {
      markBase(node.expression.expression.getText(source));
    }
    ts.forEachChild(node, markMutations);
  };

  /*
    A field is `this.#x` inside a class and a bare `x` in a component script, so both spellings
    count. Matching only `this.${name}` is what the pre-widening version did, and it was correct for
    the corpus it had.
  */
  function markBase(base: string): void {
    for (const name of found.keys()) {
      if (base === name || base === `this.${name}`) found.get(name)!.mutated = true;
    }
  }

  markMutations(source);

  /* The template's two-way bindings, which no amount of script-walking can see. */
  for (const name of found.keys()) {
    if (boundRoots.has(name)) found.get(name)!.mutated = true;
  }

  return [...found].map(([name, state]) => ({ file: path, name, ...state }));
};

/**
 * The roots of every `bind:` whose target is a MEMBER expression.
 *
 * `bind:checked={userPermissions.hasMic}` writes a property of `userPermissions` every time the box
 * is ticked, so the object is mutated. `bind:value={name}` REPLACES a variable, which raw state
 * permits, so a plain identifier target is deliberately not counted.
 */
const boundMemberRoots = (source: string, path: string): Set<string> => {
  const roots = new Set<string>();
  /** `bind:prop={local}` on a CHILD COMPONENT: [component name, prop name, local name]. */
  const handedOver: [string, string, string][] = [];

  const visit = (node: unknown, owner: string | null): void => {
    if (!node || typeof node !== 'object') return;
    const candidate = node as {
      type?: string;
      name?: string;
      expression?: Record<string, unknown>;
    };

    if (candidate.type === 'BindDirective' && candidate.expression) {
      let cursor = candidate.expression;
      let sawMember = false;
      while (cursor.type === 'MemberExpression') {
        sawMember = true;
        cursor = cursor.object as Record<string, unknown>;
      }
      if (sawMember && cursor.type === 'Identifier') roots.add(cursor.name as string);
      else if (owner && cursor.type === 'Identifier' && candidate.name) {
        handedOver.push([owner, candidate.name, cursor.name as string]);
      }
    }

    const next = candidate.type === 'Component' ? (candidate.name ?? null) : owner;
    for (const value of Object.values(node as Record<string, unknown>)) {
      if (Array.isArray(value)) value.forEach((entry) => visit(entry, next));
      else if (value && typeof value === 'object') visit(value, next);
    }
  };

  visit(parse(source, { modern: true }).fragment, null);
  for (const [component, prop, local] of handedOver) {
    if (childMutatesProp(path, source, component, prop)) roots.add(local);
  }
  return roots;
};

/**
 * ONE HOP INTO A CHILD — does `<Child bind:prop={local}>` write `local`'s members?
 *
 * ## The blind spot this closes, which this file had already been bitten by once
 *
 * The docblock at the top records it: the first sweep called `followChatStyle` replace-only because
 * it read only the `<script>` AST, and converting it would have "silently broken ... a colour
 * picker with the suite fully green, because a mutation of raw state does not throw". Reading the
 * template's `BindDirective` nodes fixed that.
 *
 * **On 2026-08-29 the identical false positive came back through a new door.** `FollowChatStylePane`
 * was extracted from `ModalHost`, and every `bind:value={followChatStyle.color}` went with it. What
 * is left in the parent is `bind:style={followChatStyle}` — a bind to a plain IDENTIFIER, which this
 * file deliberately does not count, because replacing a variable is something raw state permits.
 *
 * It is not a replacement. The child declares that prop `$bindable()` and binds its MEMBERS, so the
 * writes still happen; they happen in another file. Extraction moved the mutation out of sight of
 * the scanner without changing anything about the mutation.
 *
 * ## Why one hop, and why FOLLOWED rather than assumed
 *
 * Assuming a component bind means mutation would exempt every one of them, including the many that
 * genuinely only reassign — the gate would keep passing and stop measuring. Following it answers the
 * question actually being asked, and one hop is enough: a prop that a child passes on again is
 * itself a component bind IN THAT CHILD, so the recursion happens naturally when that file is
 * scanned as a subject.
 *
 * The import is resolved from the parent's own specifiers rather than by searching for a filename,
 * so an alias or a re-export cannot silently point this at the wrong component. A component this
 * cannot resolve returns `false` — the conservative direction here, because a false NEGATIVE only
 * costs an entry in the report that a human then reads.
 */
const childMutatesProp = (path: string, source: string, component: string, prop: string): boolean => {
  const specifier = new RegExp(`import\\s+${component}\\s+from\\s+['"]([^'"]+)['"]`).exec(source);
  if (!specifier) return false;

  /*
    `#lib/x` is this app's own subpath import and resolves to `src/lib/x`; anything else relative is
    resolved against the importing file. A specifier that is neither — a package — cannot be a
    component of ours, and falls through to the `existsSync` guard below.
  */
  const target = specifier[1].startsWith('.')
    ? resolvePath(dirname(path), specifier[1])
    : resolvePath('src', specifier[1].replace(/^#/, ''));
  if (!existsSync(target)) return false;

  const child = readFileSync(target, 'utf8');
  return boundMemberRoots(child, target).has(prop) || scriptMutates(child, prop);
};

/** Whether a `<script>` block writes members of `name`, reusing the same rules as a class field. */
const scriptMutates = (source: string, name: string): boolean => {
  const script = /<script[^>]*>([\s\S]*?)<\/script>/.exec(source)?.[1] ?? '';
  return new RegExp(`\\b${name}\\.[\\w.]+\\s*=[^=]`).test(script);
};

const tracked = execSync("git ls-files 'src/**'", { encoding: 'utf8' }).trim().split('\n');

const allFields: Field[] = [
  ...tracked
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts'))
    .flatMap((file) => objectStateFields(file, readFileSync(file, 'utf8'), new Set())),
  ...tracked
    .filter((file) => file.endsWith('.svelte'))
    .flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      const ast = parse(text, { modern: true });
      const bound = boundMemberRoots(text, file);
      /*
        `content` is typed as an ESTree `Program`, which does not DECLARE the `start` / `end`
        offsets Svelte attaches to every node at runtime. Widened at the read rather than cast away
        with `as never`, so the two properties being relied on are named — the same reason the
        tracking helper in `create-room.svelte.test.ts` took a generic instead of a cast.
      */
      return [ast.instance, ast.module]
        .filter((block) => block !== null && block !== undefined)
        .flatMap((block) => {
          const { start, end } = block.content as unknown as { start: number; end: number };
          return objectStateFields(file, text.slice(start, end), bound);
        });
    })
];

describe('replace-only objects use $state.raw', () => {
  it('found the fields it is meant to police', () => {
    // At zero every assertion below is vacuous — the same guard the reader catalog carries.
    /*
      The room's copy asserts `> 5` against its far larger corpus. FOUR is what this app has — the
      object-or-array `$state` fields this scanner tracks, three of them raw and one deliberately not
      — and a floor at four is what says the scanner still reaches every declaration rather than
      silently collapsing to none.
    */
    expect(allFields.length).toBeGreaterThanOrEqual(4);
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
      slice was worth doing. In THIS app the three are the ones the 2026-09-01 audit converted:
      `monthly` is a logins-per-month series iterated in the template and indexed for an export
      filename, `selected` is a member-id array read by `.includes` per row, and `active` is read once
      per toolbar button on every render of the editor.
    */
    const byName = (file: string, name: string) =>
      allFields.find((field) => field.file.endsWith(file) && field.name === name);

    expect(byName('RichTextEditor.svelte', 'active')?.raw, 'active must stay raw').toBe(true);
    expect(byName('[[tab]]/+page.svelte', 'selected')?.raw, 'selected must stay raw').toBe(true);
    expect(byName('[[tab]]/+page.svelte', 'monthly')?.raw, 'monthly must stay raw').toBe(true);
  });

  it('all three replace-only fields this app has are raw, and nothing else claims to be', () => {
    /*
      The room's copy pins the EIGHT its 2026-08-18 widening converted. This app has **three**, all
      converted on 2026-09-01 and all pinned by name above, so the honest version of that case is the
      total: three raw out of the four object-or-array fields this scanner tracks. A fourth appearing
      raw without a line here means somebody converted something without recording why.

      `toast.svelte.ts`'s array is deliberately NOT raw and is the useful counter-example — its own
      comment says why: *"`$state` on the array itself, not `$state.raw`, because entries are pushed
      and spliced"*. That is the distinction this whole file turns on, and it is right there in the
      same app.
    */
    const raws = allFields.filter((field) => field.raw);
    expect(raws.length, 'three raws on 2026-09-01: active, selected, monthly').toBe(3);
  });

  it('catalogues every CALL-INITIALISED `$state`, which the scanner above cannot classify', () => {
    /*
      THE BLIND SPOT, closed 2026-09-01 — and it had a live defect in it.

      `runeOf` decides an initialiser is an object by seeing an ARRAY OR OBJECT LITERAL, or a
      `[]`/`Record<`/`Map<`/`Set<` type argument. `$state(walk.series(N))` is a CALL with neither, so
      the scanner never saw it and the count above was three-of-four while a fifth and sixth field
      sat outside the corpus entirely.

      Both were in `TapeSection.svelte`, both arrays replaced wholesale on a 130ms and a 420ms
      interval and read whole per tick by d3 — the exact shape CLAUDE.md names. They are `$state.raw`
      now.

      **Why a catalogue and not type inference.** Deciding what `walk.series(N)` returns needs the
      type checker, and this file parses with `ts.createSourceFile`, which has no program and no
      types. The alternative to inference is deny-by-default: every call-initialised site is listed
      HERE with what its call returns, and an uncatalogued one fails. Measured across this app on
      2026-09-01 there are exactly two, so the list is a fact a reader can check rather than a
      pattern nobody can. The profile authority slice adds two more calls: both use `untrack` to
      seed editable form buffers once, and both return primitives for which `$state.raw` has no
      semantic or performance benefit.

      The ROOM has twelve of these and none is a defect, measured the same day: eleven are scalars
      seeded through `untrack(...)`, and the twelfth — `ModalHost.svelte`'s
      `advancedSearch = $state(emptySearch())` — is an object that IS mutated in place
      (`advancedSearch.traders = …`), so its deep proxy is load-bearing and it is the counter-example.
    */
    /*
      Each entry carries `raw`, and asserting it is the whole point — the first draft of this case
      did not, and TWO OF ITS FOUR NEGATIVE CONTROLS CAME BACK GREEN. The site pattern matches
      `$state(` and `$state.raw(` alike, so reverting `points` to a deep proxy left the catalogued
      SET identical and the gate said nothing. A catalogue that records which sites exist but not
      what they are is an inventory, not a guard.
    */
    const CALL_INITIALISED: Record<string, { raw: boolean; why: string }> = {
      'src/lib/components/home/TapeSection.svelte:points': {
        raw: true,
        why:
          'a 220-element array from `walk.series(N)`, replaced wholesale every 130ms and read whole ' +
          'per tick by d3 min/max/line/area.'
      },
      'src/lib/components/home/TapeSection.svelte:sparks': {
        raw: true,
        why:
          'four 60-element arrays from `sparkWalks.map(...)`, replaced wholesale every 420ms and ' +
          'read whole per tick.'
      },
      'src/routes/(app)/account/+page.svelte:profileDisplayName': {
        raw: false,
        why:
          '`untrack` returns the initial display-name string; the form binding reassigns that ' +
          'primitive and never mutates an object graph.'
      },
      'src/routes/(app)/account/+page.svelte:profileChatTextSize': {
        raw: false,
        why:
          '`untrack` returns the initial integer chat size; the range binding reassigns that ' +
          'primitive and never mutates an object graph.'
      }
    };

    const found: string[] = [];
    const rawAt = new Map<string, boolean>();
    for (const file of tracked) {
      if (!file.endsWith('.svelte') && !file.endsWith('.ts')) continue;
      if (file.endsWith('.test.ts') || file.endsWith('.d.ts')) continue;
      /*
        `existsSync` because `git ls-files` lists the INDEX, not the filesystem: a file deleted but
        not yet committed is tracked and absent, and `readFileSync` on it throws ENOENT and takes the
        whole gate down. That happened twice in the room on 2026-09-01, in two different sweeps.
      */
      if (!existsSync(file)) continue;
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(
        /(?:let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*\$state(\.raw)?\(\s*[A-Za-z_$][\w$.]*\s*\(/g
      )) {
        const site = `${file}:${match[1]}`;
        found.push(site);
        rawAt.set(site, match[2] === '.raw');
      }
    }

    expect(
      found.sort(),
      'A `$state(someCall())` appeared that this file does not catalogue. The scanner above cannot ' +
        'tell whether the call returns an object, so it cannot tell whether `$state.raw` applies — ' +
        'decide it by reading the call, and add it here with what it returns.'
    ).toEqual(Object.keys(CALL_INITIALISED).sort());

    /*
      AND EACH ONE IS THE DISPOSITION THE CATALOGUE CLAIMS. This is the assertion the first draft
      was missing; without it the two entries below could both revert to a deep proxy silently.
    */
    for (const [site, entry] of Object.entries(CALL_INITIALISED)) {
      expect(entry.why.length, `${site} needs a real reason`).toBeGreaterThan(60);
      expect(
        rawAt.get(site),
        `${site} is catalogued as ${entry.raw ? '`$state.raw`' : '`$state`'} and is not. ${entry.why}`
      ).toBe(entry.raw);
    }
  });

  it('and the toast list is deliberately NOT raw, which is the distinction this file turns on', () => {
    /*
      The room's copy pins three `ModalHost` fields that `bind:` writes through. This app's
      counter-example is `toast.svelte.ts`, whose own comment states the rule: entries are pushed and
      spliced, so a deep proxy is what makes those mutations observable. A sweep that only ever said
      "make it raw" would be wrong here, and asserting the negative is what keeps that visible.
    */
    const toasts = allFields.filter((field) => field.file.endsWith('toast.svelte.ts'));
    expect(toasts.length, 'toast.svelte.ts must still declare state for this to mean anything').toBeGreaterThan(0);
    expect(
      toasts.every((field) => !field.raw),
      'a pushed-and-spliced list must stay a proxy'
    ).toBe(true);
  });
});

describe('the detector itself, in both directions', () => {
  /*
    The `bind:` half is the part that was wrong once, and a guard nobody has watched fail is not a
    guard. These run the discriminator directly rather than by editing a real file.
  */
  it('counts a bind: to a MEMBER as a mutation', () => {
    const source = '<script lang="ts">let box = $state({ on: false });</script><input bind:checked={box.on} />';
    expect(boundMemberRoots(source, 'probe.svelte'), 'bind:checked={box.on} writes a property of box').toEqual(
      new Set(['box'])
    );
  });

  it('does NOT count a bind: to a plain variable, which is a reassignment raw allows', () => {
    const source = '<script lang="ts">let name = $state("");</script><input bind:value={name} />';
    expect(boundMemberRoots(source, 'probe.svelte')).toEqual(new Set());
  });

  it('sees a mutating method and a property write on a plain let, not just on this.#field', () => {
    const fields = objectStateFields(
      'probe.ts',
      'let list = $state([]); let map = $state({}); list.push(1); map.key = 2;',
      new Set()
    );
    expect(fields.find((f) => f.name === 'list')?.mutated, 'list.push(1)').toBe(true);
    expect(fields.find((f) => f.name === 'map')?.mutated, 'map.key = 2').toBe(true);
  });

  it('does NOT treat a whole reassignment as a mutation, which is the entire point', () => {
    const fields = objectStateFields('probe.ts', 'let list = $state([]); list = [1, 2];', new Set());
    expect(fields[0]?.name).toBe('list');
    expect(fields[0]?.mutated, 'replacing the array is exactly what $state.raw is for').toBe(false);
  });
});
