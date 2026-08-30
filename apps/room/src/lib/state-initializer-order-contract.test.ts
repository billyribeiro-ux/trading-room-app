import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * A `$state(…)` INITIALIZER MAY NOT READ A BINDING DECLARED LATER IN THE SAME SCRIPT.
 *
 * ## The failure this exists for, and why nothing else could see it
 *
 * `ModalHost.svelte` had:
 *
 * ```js
 * let activeConnectivityTab = $state<'network' | 'mic' | 'mobile'>(
 *   untrack(() => (isPresenter ? 'network' : 'mobile'))
 * );
 * ```
 *
 * with `const isPresenter = $derived(…)` two hundred lines BELOW it. A `$state(…)` initializer is
 * evaluated eagerly at component init, so that read happened while `isPresenter` was still in its
 * temporal dead zone: `ReferenceError: Cannot access 'isPresenter' before initialization`. Thrown
 * during SSR, it took the whole page down — the room answered **500**, not a broken modal.
 *
 * `untrack` is not a defence and reading it as one is the trap. It stops a read being registered as
 * a dependency; it does not delay the read. The arrow is invoked synchronously by `untrack` itself.
 *
 * **`svelte-check`, eslint and 4,300+ unit tests were all GREEN on it.** They have to be: TypeScript
 * models a Svelte `<script>` as a module body where hoisting rules make this legal to *reference*,
 * eslint's `no-use-before-define` is not enabled here, and a unit test mounts a component whose
 * initialisation has already succeeded — the temporal dead zone exists only during the run that
 * throws. Only a browser saw it, and only because someone ran one.
 *
 * ## This is the second instance, which is why it becomes a gate rather than a fix
 *
 * `CHANGELOG.md` records the `createRoom` instance from 2026-08-28: the same class, 500 for eleven
 * days. Two occurrences of one shape is the definition of a rule this repository writes down.
 *
 * ## What it checks, and the two things it deliberately does not
 *
 * For every `.svelte` file: find each `$state(`, `$state.raw(`, `$state.snapshot(` call in the
 * script block, take its argument text, collect the identifiers in it, and fail if any of them is
 * declared by a `const`/`let`/`function`/`class` at the top level of that same script AFTER the
 * `$state` call.
 *
 * **It does not check `$derived`.** A `$derived` body is lazy — it runs on first read, by which time
 * the whole script has initialised — so a forward reference there is legal and common. That is
 * exactly why `isPresenter` itself could sit at the bottom for months without complaint.
 *
 * **It does not build a full scope tree.** It does three specific exclusions instead — object keys,
 * bindings the initializer introduces itself, and declarations that are not at the script's top
 * level — each added because the first draft reported it wrongly. The three cases and the three
 * lessons are written out at the code. A scope-accurate version would need the compiler's AST and a
 * walker; this catches the shape that has now shipped twice, statically, in milliseconds, and its
 * own negative control below proves it still catches it.
 *
 * ## Negative control
 *
 * Run against `ModalHost.svelte` with the `isPresenter` declaration moved back below
 * `activeConnectivityTab`, this test fails and names both. That control was run.
 */
const SRC = fileURLToPath(new URL('..', import.meta.url));

/** Every `.svelte` file under `src/`, found rather than listed — the next component is covered too. */
function svelteFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = `${dir}/${entry}`;
    if (statSync(path).isDirectory()) svelteFiles(path, found);
    else if (entry.endsWith('.svelte')) found.push(path);
  }
  return found;
}

/**
 * The `<script>` block's text, or `''`.
 *
 * `<script module>` is excluded deliberately: it runs once per module, before any instance, so a
 * forward reference from it into the instance script is a different (and already impossible) thing.
 */
function instanceScript(source: string): string {
  const match = /<script\b(?![^>]*\bmodule\b)[^>]*>([\s\S]*?)<\/script>/.exec(source);
  return match ? match[1] : '';
}

/** The argument text of a call whose `(` is at `open`, by walking to its matching `)`. */
function argumentText(script: string, open: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < script.length; i += 1) {
    const char = script[i];
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    else if (char === ')') {
      depth -= 1;
      if (depth === 0) return script.slice(open + 1, i);
    }
  }
  return '';
}

interface Offence {
  file: string;
  state: string;
  name: string;
}

function offencesIn(file: string, script: string): Offence[] {
  const offences: Offence[] = [];
  /*
    `$state`, `$state.raw` and `$state.snapshot`. A generic-annotated call — `$state<'a'|'b'>(…)` —
    puts the type arguments between the rune and the paren, which is why the paren is found by
    scanning forward rather than matched in the pattern. Missing that is how a check like this
    silently covers nothing: the file that shipped the defect uses exactly that form.
  */
  for (const call of script.matchAll(/\$state(?:\.\w+)?\s*/g)) {
    const after = call.index + call[0].length;
    const rest = script.slice(after);
    const parenOffset = /^(?:<[^;{}]*?>)?\s*\(/.exec(rest);
    if (!parenOffset) continue;
    const open = after + parenOffset[0].length - 1;
    const argument = argumentText(script, open);
    if (argument.trim() === '') continue;

    /* The variable this initializes, for the failure message — `let x = $state(…)`. */
    const before = script.slice(0, call.index);
    const declaration = /(?:const|let)\s+([A-Za-z_$][\w$]*)[^=]*=\s*$/.exec(before);
    const stateName = declaration ? declaration[1] : '(anonymous)';

    /*
      ── THE THREE FALSE POSITIVES THE FIRST DRAFT PRODUCED, and what each one taught ────────────

      The first version of this scanner reported three offences and all three were wrong. They are
      worth recording because each is a different way a text scanner can be confidently incorrect,
      and because a check that cries wolf three times is a check somebody deletes.

      1. `PollPanel.svelte`: `$state.raw({ width: 0, height: 0 })` "reads" `width` and `height`.
         They are OBJECT KEYS. Excluded by {@link isPropertyKey} — a name whose previous
         non-whitespace character is `{` or `,` and which is followed by `:`. Shorthand (`{ width }`)
         has no colon and is still counted, correctly: that IS a read.

      2. `notes/CarouselDialog.svelte`: `initialSlides.map((slide) => …)` "reads" `slide`. It is the
         arrow's own PARAMETER, shadowing an unrelated `const slide` inside a function further down.
         Excluded by collecting every binding the initializer itself introduces.

      3. The same file again: the `const slide` it collided with is declared INSIDE a function body,
         indented four spaces. A local in another function is not in this script's scope at all.
         The "declared below" pattern is anchored to exactly two spaces of indent — top level of a
         Svelte `<script>` after prettier, which this repository's `format:check` enforces — so only
         real script-scope declarations count.

      Point 3 is the one to be careful about, so it is stated plainly: this is a FORMATTING-anchored
      check. It works because `pnpm run format:check` is a gate here and every `.svelte` script in
      this repository is prettier-formatted. It would have caught the defect it was written for —
      `  const isPresenter = $derived(…)` sits at exactly that indent.
    */
    const bound = new Set<string>([
      ...[...argument.matchAll(/\(([^()]*)\)\s*=>/g)].flatMap((match) =>
        match[1].split(',').map((part) =>
          part
            .trim()
            .replace(/[:=].*$/, '')
            .trim()
        )
      ),
      ...[...argument.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)].map((match) => match[1])
    ]);

    const isPropertyKey = (at: number, name: string) => {
      const after = argument.slice(at + name.length);
      if (!/^\s*:/.test(after)) return false;
      const before = argument.slice(0, at).trimEnd();
      return before.endsWith('{') || before.endsWith(',');
    };

    const identifiers = new Set<string>();
    for (const match of argument.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)/g)) {
      const name = match[1];
      if (bound.has(name)) continue;
      if (isPropertyKey(match.index, name)) continue;
      identifiers.add(name);
    }

    for (const name of identifiers) {
      /*
        Declared LATER at the SCRIPT'S TOP LEVEL. The search starts after this `$state` call, so a
        declaration above it — the legal case — is simply not found.
      */
      const laterDeclaration = new RegExp(`\\n  (?:const|let|function|class)\\s+${name}\\b`).exec(
        script.slice(open)
      );
      if (laterDeclaration) offences.push({ file, state: stateName, name });
    }
  }
  return offences;
}

describe('no $state initializer reads a binding declared below it', () => {
  const files = svelteFiles(SRC);

  it('found the components to check', () => {
    /* Sixty-odd components today; the assertion is that discovery WORKED, not how many there are. */
    expect(files.length).toBeGreaterThan(40);
    expect(files.some((file) => file.endsWith('ModalHost.svelte'))).toBe(true);
  });

  it('finds no forward reference in any component', () => {
    const offences = files.flatMap((file) =>
      offencesIn(file.slice(SRC.length), instanceScript(readFileSync(file, 'utf8')))
    );
    expect(
      offences.map(
        (o) => `${o.file}: $state for '${o.state}' reads '${o.name}', declared below it`
      ),
      'a $state initializer runs EAGERLY; a binding declared below it is in its temporal dead zone'
    ).toEqual([]);
  });

  it('would catch the defect it was written for — the checker itself is exercised', () => {
    /*
      THE CHECKER'S OWN NEGATIVE CONTROL, inline, because a scanner that silently matches nothing is
      the failure mode of every test like this one. This is `ModalHost.svelte`'s exact shape,
      including the generic annotation and the `untrack` wrapper that made it look safe.

      Built line by line rather than as a template literal, and that is not fussiness: the first
      version indented the fixture six spaces to sit prettily inside this function, the top-level
      pattern is anchored at TWO, and the control came back green against a checker that was working
      correctly. A fixture that does not look like the file it stands for proves nothing about it.
    */
    const broken = [
      "  let activeConnectivityTab = $state<'network' | 'mic' | 'mobile'>(",
      "    untrack(() => (isPresenter ? 'network' : 'mobile'))",
      '  );',
      "  const isPresenter = $derived(currentUser.role === 'staff');"
    ].join('\n');
    const found = offencesIn('Broken.svelte', broken);
    expect(found).toContainEqual({
      file: 'Broken.svelte',
      state: 'activeConnectivityTab',
      name: 'isPresenter'
    });

    /* And the legal ordering must NOT be reported, or the check would be unusable. */
    const fine = [
      "  const isPresenter = $derived(currentUser.role === 'staff');",
      "  let activeConnectivityTab = $state<'network' | 'mic' | 'mobile'>(",
      "    untrack(() => (isPresenter ? 'network' : 'mobile'))",
      '  );'
    ].join('\n');
    expect(offencesIn('Fine.svelte', fine)).toEqual([]);
  });
});
