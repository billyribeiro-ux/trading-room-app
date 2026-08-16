import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  Written because a call site rotted for three commits and every gate stayed green.

  `presenterCommand`'s form action was removed on 2026-08-15 when it became a remote function.
  `ModalHost.svelte` went on posting `fetch('?/presenterCommand')` to an action that no longer
  existed, so a presenter revoking a member's mic, camera or screens did nothing at all. It logged a
  status nobody reads.

  Nothing caught it. `svelte-check` cannot: the string `'?/presenterCommand'` is a valid string.
  `eslint` cannot. The build cannot. 1,649 tests could not, because every assertion about a
  converted call site was a `not.toContain` scoped to `+page.svelte` — and this one was in
  `ModalHost.svelte`. Six separate contract files each proved their own feature had left ONE file,
  and between them they proved nothing about the application.

  The lesson is not "click through in a browser". A browser would have found it, but so does a
  fifteen-line walk of `src/`, and the walk runs in two seconds on every commit. When a defect is
  decidable from the source, deciding it from the source is the cheaper and more reliable half — the
  browser is for what source cannot answer, not for what nobody bothered to ask.

  So this file asks the whole-application questions the per-feature files cannot:

    1. Every form action still reached from JavaScript still EXISTS.
    2. Every remote function that is exported has a consumer.
    3. Every remote function a consumer imports still exists.

  (1) and (3) are the two halves of what would have caught `presenterCommand`: a call site naming
  something the server does not have. (3) is mostly the compiler's job once a thing is an import;
  (1) is the half the compiler can never do, because those call sites build the name at runtime.
*/

const SRC = new URL('../', import.meta.url);

/** Every source file under `src/`, excluding tests and this file. */
function sourceFiles(dir: URL = SRC): { path: string; source: string }[] {
  const out: { path: string; source: string }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    if (entry.isDirectory()) {
      out.push(...sourceFiles(child));
      continue;
    }
    if (!/\.(svelte|ts)$/.test(entry.name)) continue;
    if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.d.ts')) continue;
    out.push({
      path: child.pathname.slice(SRC.pathname.length),
      source: readFileSync(child, 'utf8')
    });
  }
  return out;
}

/*
  Comments stripped before anything is decided.

  Several modules EXPLAIN the conversion by quoting the call they replaced — `presenter-commands`
  and `+page.server.ts` both contain the words `fetch('?/presenterCommand')` in prose. A check that
  cannot tell a call from a sentence about a call would fail on the very comments written to record
  the defect, which is the "assertion that fails on working code" this repository treats as a defect
  in the assertion.
*/
const stripComments = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const FILES = sourceFiles().map((file) => ({ ...file, code: stripComments(file.source) }));

describe('the call-site sweep can see the application', () => {
  it('found the source tree it is meant to police', () => {
    // If this collapses, every assertion below passes over an empty list.
    expect(FILES.length).toBeGreaterThan(100);
    expect(FILES.map((file) => file.path)).toContain('routes/+page.svelte');
    expect(FILES.map((file) => file.path)).toContain('lib/components/ModalHost.svelte');
  });

  it('and it strips prose, so a comment ABOUT a call is not read as one', () => {
    /*
      The negative control for the check itself. `+page.server.ts` records the defect in a comment
      that quotes the dead call verbatim; if the stripper stopped working, the next assertion would
      go red for a reason that has nothing to do with the code.
    */
    const server = FILES.find((file) => file.path === 'routes/+page.server.ts');
    expect(server, 'the server file must be in the sweep').toBeDefined();
    expect(server!.source).toContain("fetch('?/presenterCommand')");
    expect(server!.code).not.toContain("fetch('?/presenterCommand')");
  });
});

/*
  THE THREE THAT REMAIN — four until 2026-08-16 — and why the first version of this file claimed
  there were none.

  I asserted "zero `fetch('?/…')` call sites" and it was FALSE. My sweep — and the grep I checked it
  with — matched `fetch('?/`, a single-quoted literal. They build the endpoint from a template
  literal, `fetch(\`?/${action}\`)`, so neither saw them. That is the same mistake as the
  `presenterCommand` miss one commit earlier: searching for the shape I expected and concluding from
  what came back.

  They are the WORST form of the defect, not a lesser one. A literal `'?/savePoll'` is at least a
  string a human can grep. An interpolated name is assembled at runtime from a union type, so
  nothing — not the compiler, not a search, not the build — connects it to the action it reaches.
  Delete `savePoll` from `+page.server.ts` and this call site keeps compiling and starts doing
  nothing, exactly as `presenterCommand` did.

  Converting all seventeen actions behind them is a real piece of work and is NOT done here. What is
  done is closing the failure mode: every name each union can produce is checked against the actions
  that actually exist. The list of dispatchers is a ratchet — it may shrink, never grow.
*/
/** A dispatcher, plus WHERE its reachable set is written when that is not the signature. */
type Dispatcher = {
  readonly file: string;
  readonly fn: string;
  readonly declaration?: string;
  readonly actions: readonly string[];
};

const DISPATCHERS: readonly Dispatcher[] = [
  {
    file: 'lib/room/modals.svelte.ts',
    fn: '  async submitPollAction(',
    actions: ['savePoll', 'deleteSavedPoll', 'sendPoll', 'sendPollAnswer', 'pollDone']
  },
  {
    file: 'routes/+page.svelte',
    fn: 'async function submitNoteMutation<',
    actions: [
      'deleteSessionNoteTab',
      'newSessionNoteTab',
      'renameSessionNoteTab',
      'restoreNoteVersion',
      'saveSessionNote',
      'setWelcomeMatNoteTab'
    ]
  },
  /*
    THE TWO TRADE ALERT DISPATCHERS BECAME ONE, and the union moved with it.

    Phase 5 slice 15 replaced `submitSwingCommand` and `submitDayTradeCommand` — two functions
    with byte-identical bodies — with one generic `RoomTradeAlerts.submit(action: Action, …)`
    instantiated twice. So the reachable set is no longer written in the signature; it is written in
    two exported type aliases, and `declaration` is where each entry now looks for it.

    Two entries against ONE dispatcher is the honest shape: there is one `fetch`, and there are two
    unions that can reach it, because there are two instances. The count assertion below counts
    dispatchers rather than table rows for exactly that reason.

    The list shrank from four to three, which is the direction the ratchet allows.
  */
  {
    file: 'lib/room/trade-alerts.svelte.ts',
    fn: 'async submit(',
    declaration: 'export type SwingAlertAction =',
    actions: ['swingAlertMsg', 'editSwingAlertMsg', 'deleteSwingAlertMsg']
  },
  {
    file: 'lib/room/trade-alerts.svelte.ts',
    fn: 'async submit(',
    declaration: 'export type DayTradeAlertAction =',
    actions: ['dayTradeAlertMsg', 'editDayTradeAlertMsg', 'deleteDayTradeAlertMsg']
  }
];

/** One row per DISPATCHER, not per union — two of the rows above share a `fetch`. */
const DISPATCHER_COUNT = new Set(DISPATCHERS.map((entry) => entry.file + entry.fn)).size;

describe('the form actions still reached from JavaScript', () => {
  const SERVER = FILES.find((file) => file.path === 'routes/+page.server.ts')!;

  it('is exactly the three dispatchers listed, and the list only ever shrinks', () => {
    /*
      Counted from the CODE rather than trusted from the table above, so converting one and
      forgetting to delete its row here fails instead of passing quietly.

      Four until 2026-08-16, three since: merging the two trade alert dispatchers into one generic
      method removed one. A shrink is allowed and a growth is not, which is why this reads the code
      and compares against a count DERIVED from the table rather than against a literal.
    */
    const found = FILES.flatMap((file) =>
      [...file.code.matchAll(/fetch\(\s*[`'"]\?\//g)].map(() => file.path)
    );
    expect(found).toHaveLength(DISPATCHER_COUNT);
    expect(new Set(found)).toEqual(new Set(DISPATCHERS.map((entry) => entry.file)));
  });

  it.each(DISPATCHERS)(
    '$fn still reaches actions that exist ($declaration)',
    ({ file, fn, actions, declaration }) => {
      /*
      THE GUARD THAT WOULD HAVE CAUGHT `presenterCommand`, for the case where the compiler cannot.

      Each name in the union is checked against `+page.server.ts`. Convert one of these to a remote
      function without rewriting the dispatcher and this goes red, where today it would compile,
      type-check, lint, build, and silently do nothing.

      `declaration` names WHERE the union is written, because that stopped always being the
      signature: a generic `submit(action: Action, …)` declares its reachable set in an exported
      type alias instead. The dispatcher itself is still asserted to exist — a union with no
      `fetch` behind it proves nothing.
    */
      const source = FILES.find((entry) => entry.path === file);
      expect(source, `${file} must be in the sweep`).toBeDefined();
      const at = source!.code.indexOf(fn);
      expect(at, `${fn} must exist in ${file}`).toBeGreaterThan(-1);

      const from = declaration ? source!.code.indexOf(declaration) : at;
      expect(from, `${declaration ?? fn} must exist in ${file}`).toBeGreaterThan(-1);
      // Where the names live: the signature, or the type alias up to its terminating semicolon.
      const signature = declaration
        ? source!.code.slice(from, source!.code.indexOf(';', from))
        : source!.code.slice(from, source!.code.indexOf('{', source!.code.indexOf(')', from)));
      for (const action of actions) {
        expect(signature, `${fn} must still name ${action}`).toContain(`'${action}'`);
        expect(
          SERVER.code,
          `${file} posts to '?/${action}', which no longer exists as an action — convert the dispatcher or restore it`
        ).toContain(`${action}: async`);
      }
    }
  );

  it('and no dispatcher can reach an action it does not declare', () => {
    /*
      The inverse. `fetch(\`?/${action}\`)` can only ever produce a name from its own union, so the
      union IS the reachable set — but only while the interpolation is the whole path. A concatenation
      or a computed segment would break that, and this is what says so.
    */
    // Every file, not just the page: one of the three dispatchers lives in `lib/room/` since
    // slice 15, and a check scoped to `+page.svelte` would have stopped seeing it.
    for (const file of FILES) {
      for (const match of file.code.matchAll(/fetch\(\s*`\?\/([^`]*)`/g)) {
        expect(
          match[1],
          `a dispatcher must interpolate exactly its \`action\` parameter and nothing else (${file.path})`
        ).toBe('${action}');
      }
    }
  });
});

/** `export const NAME = command(` / `query(` / `form(` / `prerender(`, per remote module. */
function remoteExports(code: string): string[] {
  return [...code.matchAll(/export const (\w+) = (?:command|query|form|prerender)[(.]/g)].map(
    (match) => match[1]
  );
}

const REMOTE_MODULES = FILES.filter((file) => file.path.endsWith('.remote.ts')).map((file) => ({
  ...file,
  exports: remoteExports(file.code)
}));

describe('every remote function is wired at both ends', () => {
  it('found the remote modules', () => {
    // Sixteen at the time of writing; asserted as a floor so adding one does not churn this file.
    expect(REMOTE_MODULES.length).toBeGreaterThanOrEqual(12);
    expect(REMOTE_MODULES.every((module) => module.exports.length > 0)).toBe(true);
  });

  it('and every exported one is imported by somebody', () => {
    /*
      The orphan direction. A remote function nothing imports is an HTTP endpoint with no caller —
      still generated, still routable, still a surface — and "nothing exists without a consumer" is
      this repository's rule.

      Matched on the module specifier AND the name, so a same-named export from a different module
      cannot vouch for this one.
    */
    const orphans: string[] = [];
    for (const module of REMOTE_MODULES) {
      const specifier = module.path.replace(/^routes\//, '').replace(/\.ts$/, '');
      const importers = FILES.filter(
        (file) => file.path !== module.path && file.code.includes(specifier)
      );
      for (const name of module.exports) {
        const wired = importers.some((file) => {
          const at = file.code.indexOf(specifier);
          const statement = file.code.slice(Math.max(0, at - 400), at);
          return new RegExp(`\\b${name}\\b`).test(statement);
        });
        if (!wired) orphans.push(`${module.path}#${name}`);
      }
    }
    expect(orphans, 'a remote function nothing imports is an endpoint with no caller').toEqual([]);
  });

  it('and every name a consumer imports still exists on the server', () => {
    /*
      THE ONE THAT WOULD HAVE CAUGHT IT, in its general form.

      `presenterCommand` failed because a call site named a server thing that was not there. As an
      action the name was a string. As an import it is a symbol, so TypeScript already refuses it —
      which is most of the fix. This asserts the property directly anyway, because `svelte-check`
      passing is a claim about a moment and this is a claim about the file.
    */
    const dangling: string[] = [];
    for (const file of FILES) {
      for (const match of file.code.matchAll(
        /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*\.remote)['"]/g
      )) {
        const module = REMOTE_MODULES.find((candidate) =>
          candidate.path.endsWith(`${match[2].replace(/^.*\//, '')}.ts`)
        );
        expect(
          module,
          `${file.path} imports ${match[2]}, which must be a remote module`
        ).toBeDefined();
        for (const clause of match[1].split(',')) {
          const name = clause
            .trim()
            .split(/\s+as\s+/)[0]
            .trim();
          if (!name || name === 'type') continue;
          if (!module!.exports.includes(name)) dangling.push(`${file.path} -> ${match[2]}#${name}`);
        }
      }
    }
    expect(dangling, 'a call site naming something the server does not export').toEqual([]);
  });
});
