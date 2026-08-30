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
  THE THREE THAT REMAINED — four until 2026-08-16, three until 2026-08-30, and NONE now.

  I asserted "zero `fetch('?/…')` call sites" once before and it was FALSE. My sweep — and the grep
  I checked it with — matched `fetch('?/`, a single-quoted literal. They built the endpoint from a
  template literal, `fetch(\`?/${action}\`)`, so neither saw them. That was the same mistake as the
  `presenterCommand` miss one commit earlier: searching for the shape I expected and concluding from
  what came back. The sweep below matches all three quote characters for that reason, and the claim
  is made again only because the pattern that missed it has been fixed.

  They were the WORST form of the defect, not a lesser one. A literal `'?/savePoll'` is at least a
  string a human can grep. An interpolated name is assembled at runtime from a union type, so
  nothing — not the compiler, not a search, not the build — connects it to the action it reaches.

  ## What closed it

  All seventeen actions became remote functions on 2026-08-30, in five modules split on the gate:
  `polls.remote.ts`, `session-notes.remote.ts`, `swing-alerts.remote.ts`,
  `day-trade-alerts.remote.ts`. Each dispatcher now dispatches over IMPORTED SYMBOLS — a switch in
  `RoomNotes`, a switch per feed descriptor in `RoomTradeAlerts`, five named methods in `RoomModals`
  — so deleting a command is a build error at the call site rather than a 404 nobody sees.

  ## What this file asserts NOW, and why it is not simply deleted

  The failure mode is closed, not impossible. `fetch('?/…')` is still valid JavaScript against an
  action that still exists, and the next feature added under time pressure is exactly where one
  reappears. So the ratchet stays and its floor is zero: the list may shrink, and it has nowhere
  left to shrink to.

  The `it.each` that walked each dispatcher's union is gone with the unions. An `it.each([])` is a
  suite that runs no assertions and reports green, which is the "test that cannot fail" this
  repository treats as worse than no test.
*/
/**
 * A dispatcher, plus WHERE its reachable set is written when that is not the signature.
 *
 * The type is kept although the list is empty: it is the shape a re-introduction has to be recorded
 * in, and deleting it would mean the next person adding one has nowhere to write it down.
 */
type Dispatcher = {
  readonly file: string;
  readonly fn: string;
  readonly declaration?: string;
  readonly actions: readonly string[];
};

const DISPATCHERS: readonly Dispatcher[] = [];

/** One row per DISPATCHER, not per union — two rows once shared a `fetch`. */
const DISPATCHER_COUNT = new Set(DISPATCHERS.map((entry) => entry.file + entry.fn)).size;

describe('the form actions still reached from JavaScript', () => {
  const SERVER = FILES.find((file) => file.path === 'routes/+page.server.ts')!;

  it('is none, and the list only ever shrinks', () => {
    /*
      Counted from the CODE rather than trusted from the table above, so re-introducing one and
      forgetting to record it fails instead of passing quietly — and so does the reverse, a row
      recorded for a dispatcher that no longer exists.

      Four until 2026-08-16, three until 2026-08-30, zero since. A shrink is allowed and a growth is
      not, which is why this reads the code and compares against a count DERIVED from the table
      rather than against a literal.
    */
    const found = FILES.flatMap((file) =>
      [...file.code.matchAll(/fetch\(\s*[`'"]\?\//g)].map(() => file.path)
    );
    expect(
      found,
      `a form action is being posted to by hand again. Every mutation in this app is a remote ` +
        `function; an endpoint built from a string is the \`presenterCommand\` defect, which cost ` +
        `three commits of a presenter's mic control doing nothing:\n  ${found.join('\n  ')}`
    ).toHaveLength(DISPATCHER_COUNT);
    expect(new Set(found)).toEqual(new Set(DISPATCHERS.map((entry) => entry.file)));
  });

  it('and the page exports no form actions at all, so there is nothing left to reach', () => {
    /*
      THE OTHER HALF, and the one the sweep above cannot do.

      Zero `fetch('?/…')` sites proves nothing on its own: an action nothing posts to is equally
      consistent with "converted" and with "left behind". This reads the actions `+page.server.ts`
      still exports and pins the set, so the next one added has to be argued for here.

      Eighteen until 2026-08-30 — the seventeen converted, plus `logout`. **NONE now**, and the
      empty set is a stronger statement than any list this could pin.

      `logout` was the survivor for about an hour, on the argument that a progressive-enhancement
      form POST is not a JS dispatcher and converting one into a command that needs JavaScript would
      be a regression. That argument was sound and did not apply, because the conversion also found
      that NOTHING POSTS TO IT: `src/routes/logout/+page.svelte` submits `<form method="POST">` with
      no `action` attribute, so it reaches its OWN route, and `routes/logout/+page.server.ts` carries
      a `default` action whose body was byte-identical. Two implementations of signing a member out,
      one of them impossible to invoke.

      It was deleted rather than kept, and the progressive-enhancement property is untouched: the
      form that a browser without JavaScript submits still posts to a real form action, just the one
      it was always reaching. `notes-account-action-contract.test.ts` was re-pointed at that action
      rather than dropped, so the behaviour it proves — the session row deleted server-side, `locals`
      cleared because `handle()` will not run again before the redirect's load, and the 303 — is now
      asserted against the path a browser actually takes.

      The `?/logout` sweep below stays and is no longer about a stale TODO row: it is what catches
      somebody re-adding the action by pointing a form at it.
    */
    const exported = [...SERVER.code.matchAll(/^ {2}(\w+): async \(/gm)].map((match) => match[1]);
    expect(
      exported,
      '`+page.server.ts` exports a form action again — every mutation on this page is a remote ' +
        'command, and a command refuses with `error(…)` rather than a value a caller may ignore'
    ).toEqual([]);

    expect(
      SERVER.code,
      'the `actions` export is back; the load is all this file should carry'
    ).not.toContain('export const actions');

    const posted = FILES.filter((file) => /['"`]\?\/logout['"`]/.test(file.code)).map(
      (file) => file.path
    );
    expect(
      posted,
      'something posts to `?/logout`, which no longer exists — that form reaches nothing'
    ).toEqual([]);
  });

  it('and a dispatcher, if one comes back, cannot reach an action it does not declare', () => {
    /*
      The inverse, and it is kept although there is nothing left for it to walk.

      `fetch(\`?/${action}\`)` can only ever produce a name from its own union, so the union IS the
      reachable set — but only while the interpolation is the whole path. A concatenation or a
      computed segment would break that, and this is what says so. Today it iterates an empty set of
      matches, and it becomes load-bearing again the moment the ratchet above goes red.
    */
    // Every file, not just the page: the last three dispatchers lived in `lib/room/`, and a check
    // scoped to `+page.svelte` would not have seen any of them.
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
          /*
            `importers` was filtered on `includes(specifier)`, so this cannot miss — and it is
            asserted anyway, because `slice(-401, -1)` would silently search the WRONG 400 characters
            and answer "not wired" for a module that is. `slice-anchor-contract.test.ts` exists for
            exactly this shape and names the failure: an `indexOf` used as a slice bound with nothing
            proving it found anything.
          */
          expect(at, `${file.path} was selected for containing ${specifier}`).toBeGreaterThan(-1);
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
