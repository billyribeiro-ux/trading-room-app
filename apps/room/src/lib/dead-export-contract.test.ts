import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * NOTHING IS EXPORTED THAT NOTHING READS.
 *
 * `CLAUDE.md`: *"Nothing exists without a consumer. No config nothing reads."* An export is a
 * promise that somebody, somewhere, needs this — and an export nobody imports is a promise to
 * nobody. It widens the surface a refactor has to preserve, and it is invisible: `eslint` sees a
 * used symbol (it is exported), `svelte-check` types it, and the suite is green.
 *
 * ## Measured 2026-08-29 across 213 non-test modules
 *
 * Every exported binding was checked against every other `.ts` and `.svelte` file in `src/`,
 * **including the test files** — a symbol only a test reads is still read, and excluding tests would
 * have condemned every constant a contract test pins.
 *
 * | | count |
 * | --- | --- |
 * | referenced by NOTHING, anywhere | **15** — 6 values and 9 derived types |
 * | exported but read only inside their own module | 38 |
 * | modules imported by nothing, or only by tests | **1**, and it is a probe whose whole purpose is to be measured |
 *
 * **Only the first row is gated**, and the reason is a judgement rather than an omission. An
 * exported constant with one internal reader is usually a deliberate pairing — `SWING_ALERT_PRICE_MAX_LENGTH`
 * exists so a schema bound and the input that must respect it are one value, and the day a second
 * reader arrives is the day the export pays for itself. Condemning those would push 38 real
 * decisions into a catalog to be argued one by one, for no defect. An export with NO reader is a
 * different thing: there is nothing to pair with.
 *
 * ## The fifteen, and why each is still here
 *
 * None is an oversight. The six VALUES are each the residue of a subsystem that was removed,
 * replaced or not yet built — which is exactly why they need recording rather than deleting in
 * silence: a reader who finds `hashPassword` unused might reasonably conclude passwords are broken,
 * when the truth is that this room never creates one. The nine TYPES are one line each, cost nothing
 * at runtime, and are declared as complete sets beside siblings that are read.
 *
 * The nine were invisible until the collector was fixed on 2026-08-29 — see `exportsOf`.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Exports nothing reads, each with why it survives. */
const UNREAD: Record<string, { module: string; why: string }> = {
  spentHandoffs: {
    module: 'lib/server/db/schema.ts',
    why:
      'the single-use handoff guard. `handoff-token.ts` records why it went: *"There is no `jti` any ' +
      'more. The reference has none, and the room\'s single-use guard depended on it."* The table and ' +
      'its `CREATE TABLE IF NOT EXISTS` in `db/index.ts` outlived the feature. KEPT rather than ' +
      'deleted because the guard is a security property this room lost to match the reference, and ' +
      'the schema is where it would come back — deleting the table would make restoring it a ' +
      'migration instead of a query.'
  },
  hashPassword: {
    module: 'lib/server/password.ts',
    why:
      'this room can VERIFY a password and never creates one. Accounts arrive through the ' +
      "controller's signed handoff (`authSource: 'handoff'`), so `verifyPassword` beside it has real " +
      'callers and this has none. Kept because a hasher whose verifier ships without it is a ' +
      'half-pair that invites somebody to write a second, different one.'
  },
  isAdminRole: {
    module: 'lib/server/auth.ts',
    why:
      '`isPresenterRole` beside it decides every authority question this room asks, because the room ' +
      "draws no line between staff and admin — that line is the controller's. Kept as the named " +
      'answer to "is this person an admin", so the next feature that needs it does not inline ' +
      "`role === 'admin'` and start a second convention."
  },
  applyCookies: {
    module: 'lib/server/tradingroom-api.ts',
    why:
      'part of the v5 API client, which is blocked on an account cleared for v5 by the vendor ' +
      '(`NEW-TODO.md` Part 3). The module is written and unreachable, not abandoned.'
  },
  SEARCH_ON_KEY: {
    module: 'lib/alerts-advanced-search.ts',
    why:
      "the captured `'Enter'` for the advanced search field. Its siblings in that module are read; " +
      'this one is not, because the field uses the key name inline. A captured constant, so it is ' +
      'evidence as much as code.'
  },
  /*
    ── DERIVED TYPES, exported beside siblings that ARE read ─────────────────────────────────────

    All nine are one line each and carry no runtime cost: six are `$inferSelect` row types declared
    in a block with `User`, `Message` and the rest that DO have readers, and three are
    `ReturnType<typeof …>` aliases for a factory's shape.

    Kept as a SET rather than pruned to the ones currently imported. A schema that names a type for
    six of its tables and not the other six is a schema whose next reader adds
    `typeof chatMutes.$inferSelect` inline — which is the duplication the block exists to prevent.
    The same argument holds for the three aliases: `RoomContext` is the shape the whole page is built
    from, and it being currently inferable at every call site is not a reason to leave it unnamed.

    These were INVISIBLE until 2026-08-29. The collector's `else if` chain attached its type branch
    to an inner `if`, so exported types were never gathered at all; fixing that surfaced all nine at
    once. A catalog is only as honest as the walk that fills it.
  */
  AlertQuestion: {
    module: 'lib/server/db/schema.ts',
    why: 'a `$inferSelect` row type, declared with its siblings.'
  },
  ChatMute: {
    module: 'lib/server/db/schema.ts',
    why: 'a `$inferSelect` row type, declared with its siblings.'
  },
  PollAnswer: {
    module: 'lib/server/db/schema.ts',
    why: 'a `$inferSelect` row type, declared with its siblings.'
  },
  PrivateMessage: {
    module: 'lib/server/db/schema.ts',
    why: 'a `$inferSelect` row type, declared with its siblings.'
  },
  SharedFile: {
    module: 'lib/server/db/schema.ts',
    why: 'a `$inferSelect` row type, declared with its siblings.'
  },
  UserSettings: {
    module: 'lib/server/db/schema.ts',
    why: 'a `$inferSelect` row type, declared with its siblings.'
  },
  BuiltInChatTab: {
    module: 'lib/chat-tabs.ts',
    why: 'the union of `BUILT_IN_CHAT_TABS`, named so a caller narrowing to those four does not re-derive it.'
  },
  RoomContext: {
    module: 'lib/room/create-room.svelte.ts',
    why: 'the shape the whole page is built from. Inferable at every call site today, which is not a reason to leave the room own type unnamed.'
  },
  RoomRefresh: {
    module: 'lib/room/refresh.svelte.ts',
    why: 'the factory shape, named for the same reason as `RoomContext`.'
  },

  isDeadPreferenceKey: {
    module: 'lib/dead-preference-keys.ts',
    why:
      'the predicate over the dead-key set. The SET is read — `settings-preference-wiring-contract` ' +
      'and the room both consult it — and the predicate is the shape a caller would want if one ' +
      'ever guards a write rather than enumerating.'
  }
};

/** Every exported binding name in a non-test module, with the module it comes from. */
function exportsOf(file: string, source: string): string[] {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true);
  const names: string[] = [];

  const visit = (node: ts.Node): void => {
    const modifiers = ts.canHaveModifiers(node) ? (ts.getModifiers(node) ?? []) : [];
    if (modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      /*
        THREE INDEPENDENT QUESTIONS, each braced, and both halves of that were earned.

        The first draft wrote them as an unbraced `else if` chain. It type-checked under `vitest`
        (which strips types) and failed `svelte-check`, which CI runs with `--fail-on-warnings`:
        narrowing `node` past an unbraced `for` reduced the next branch's intersection to `never`.

        Reformatting then exposed a REAL BUG underneath the type error — `prettier` re-indented the
        final `else if` onto the inner `if (ts.isIdentifier(...))`, which is where JavaScript had
        been attaching it all along. Exported types, interfaces and enums were therefore collected
        only when a variable declaration's name was NOT an identifier, which is to say never. The
        type error and the logic error had the same cause, and only the braces fix both.
      */
      if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
        if (node.name) names.push(node.name.text);
      }
      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text);
        }
      }
      if (
        ts.isTypeAliasDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isEnumDeclaration(node)
      ) {
        names.push(node.name.text);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(parsed);
  return names;
}

const MODULES = globSync('**/*.ts', { cwd: ROOT }).filter(
  (file) => !file.endsWith('.test.ts') && !file.endsWith('.d.ts')
);

/**
 * Every file that could reference an export — tests included, because a test IS a reader.
 *
 * THIS FILE IS EXCLUDED, and that exclusion is load-bearing rather than tidy. The catalog above
 * names all six symbols, so counting this file as a reader made every one of them look read and the
 * gate reported a clean sweep over an empty list. It is the same false-positive the orphan-style
 * gate hit through comments: a matcher that answers "yes" for the wrong reason measures nothing.
 *
 * One file, named exactly, rather than "all test files" — a symbol only a test reads is genuinely
 * read, and excluding the whole suite would condemn every constant a contract test pins.
 */
const SELF = 'lib/dead-export-contract.test.ts';
const CORPUS = [...globSync('**/*.ts', { cwd: ROOT }), ...globSync('**/*.svelte', { cwd: ROOT })]
  .filter((file) => file !== SELF)
  .map((file) => [file, readFileSync(`${ROOT}${file}`, 'utf8')] as const);

function readersOf(name: string, ownModule: string): number {
  const pattern = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`);
  return CORPUS.filter(([file, text]) => file !== ownModule && pattern.test(text)).length;
}

/**
 * How many times a module mentions its own export, beyond the declaration itself.
 *
 * This is what separates the two rows of the table above. An export used inside its own module is a
 * deliberate pairing more often than a mistake — a schema bound and the input that respects it,
 * declared once — and gating those would push 38 real decisions into a catalog for no defect. An
 * export with NO reader anywhere, internal or external, has nothing to pair with.
 */
function internalUses(name: string, source: string): number {
  const pattern = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`, 'g');
  return (source.match(pattern) ?? []).length - 1;
}

describe('every export has a reader, or says why it has none', () => {
  const unread = MODULES.flatMap((file) => {
    const source = readFileSync(`${ROOT}${file}`, 'utf8');
    return exportsOf(file, source)
      .filter((name) => readersOf(name, file) === 0 && internalUses(name, source) === 0)
      .map((name) => ({ file, name }));
  });

  it('scans enough modules for the answer to mean anything', () => {
    /*
      The vacuity floor. Every assertion below is "expect no offenders", the shape that reports
      success when the walk finds nothing at all — which this repository has now been bitten by
      twice.
    */
    expect(MODULES.length).toBeGreaterThan(180);
    expect(CORPUS.length).toBeGreaterThan(400);

    /* And that the reader count works at all: a symbol known to be widely read must read as read. */
    expect(readersOf('presenterRoom', 'lib/server/auth.ts')).toBeGreaterThan(3);
  });

  it('has no unread export that is not catalogued', () => {
    const uncatalogued = unread
      .filter(({ name }) => !UNREAD[name])
      .map(({ file, name }) => `${file} -> ${name}`)
      .sort();

    expect(
      uncatalogued,
      'this export has no reader anywhere in src/, tests included. Either delete it, or add it to ' +
        'UNREAD saying why it survives — an export nobody imports is a promise to nobody, and it is ' +
        'invisible to eslint because an exported symbol always looks used.'
    ).toEqual([]);
  });

  it('carries no stale entry — an export that gained a reader must leave the list', () => {
    /*
      The other direction, which is what stops the catalog becoming a place to hide. When the v5
      client is unblocked and `applyCookies` gets a caller, this fails until its entry is deleted —
      the same declaration `INERT_ACTIONS` and `orphan-style-contract` both use.
    */
    const names = new Set(unread.map(({ name }) => name));
    const revived = Object.keys(UNREAD)
      .filter((name) => !names.has(name))
      .sort();

    expect(
      revived,
      'these exports now have readers, so they are no longer unread — delete their UNREAD entries'
    ).toEqual([]);
  });

  it('names the module each catalogued export actually lives in', () => {
    /*
      Not decoration. An entry whose `module` has drifted is an entry a reader cannot check, and the
      whole value of this catalog is that each reason can be verified against the code it describes.
    */
    for (const [name, entry] of Object.entries(UNREAD)) {
      const source = readFileSync(`${ROOT}${entry.module}`, 'utf8');
      expect(source, `${name} is not declared in ${entry.module}`).toMatch(
        new RegExp(`export (async )?(function|const|class|type|interface) ${name}\\b`)
      );
    }
  });

  it('has no module that nothing imports', () => {
    /*
      The stronger sibling: a dead EXPORT widens a surface, a dead MODULE is a file the next reader
      has to understand for no reason. Measured 2026-08-29 across 213 modules: exactly one is
      imported only by tests, and it is `derived-return-probe.svelte.ts`, whose entire purpose is to
      exhibit a compiler warning for a test to measure. A probe read only by its probe is correct.
    */
    const importedOnlyByTests: string[] = [];
    const importedByNothing: string[] = [];

    for (const module of MODULES) {
      /*
        Route modules and hooks are ENTRY POINTS: SvelteKit imports them by convention, not our code,
        so "nothing imports this" is true of every one of them and means nothing.

        Matched on the file NAME rather than on a suffix list, which is the correction: the first
        version tested for `+page.ts` and missed `+page.server.ts`, then reported three route files
        as orphaned modules. Anything under `routes/` whose basename starts with `+`, plus the
        `.remote.ts` modules, is an entry point.
      */
      const basename = module.replace(/^.*\//, '');
      if (/^routes\//.test(module) && (basename.startsWith('+') || basename.endsWith('.remote.ts')))
        continue;
      if (/^hooks\.(server|client)\.ts$/.test(module) || /^params\//.test(module)) continue;

      const base = module.replace(/^.*\//, '').replace(/\.ts$/, '');
      const pattern = new RegExp(`[/'"\`]${base.replace(/[.$]/g, '\\$&')}(\\.js|\\.ts|['"\`])`);
      const readers = CORPUS.filter(([file, text]) => file !== module && pattern.test(text));
      if (readers.length === 0) importedByNothing.push(module);
      else if (readers.every(([file]) => file.endsWith('.test.ts')))
        importedOnlyByTests.push(module);
    }

    expect(importedByNothing, 'nothing imports these modules at all').toEqual([]);
    expect(
      importedOnlyByTests,
      'only tests import these. A probe is legitimate; a module whose only reader is the test ' +
        'written to justify it is not'
    ).toEqual(['lib/room/derived-return-probe.svelte.ts']);
  });
});
