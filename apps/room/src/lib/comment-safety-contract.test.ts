import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

/*
  No HTML comment in a Svelte template may contain a comment marker.

  This exists because it went wrong three times in one session, and the third time shipped.

  These templates document themselves by quoting the captured Angular markup, and that markup is
  full of `<!---->` - the anchors Angular leaves where a collapsed `*ngIf` used to be. Quoting one
  inside an HTML comment ENDS THE COMMENT: `<!---->` contains `-->`. Everything after it stops
  being a comment and becomes page content.

  The failure is not subtle in the browser and is nearly invisible in the diff. The live symptom
  was paragraphs of explanatory prose rendering inside `<ul id="mainTabs">`, splitting the tab bar
  across two lines with a stray `-->` on screen. `svelte-check` passed; the tests passed; the page
  was broken.

  Write "an empty Angular comment anchor" instead, or put the marker in a `//` comment in the
  script block where it is inert.
*/

/*
  BOTH APPS, from one place — widened 2026-08-31, and the argument is `browser-dialog-contract`'s.

  This globbed every template under `src` against `process.cwd()`, so it scanned whichever app vitest
  was running in: the room. (The glob pattern is deliberately not quoted here — a `*` followed by a
  `/` ends this block comment, which is this rule's own failure one layer up, and it happened while
  writing this paragraph.) The controller has the same templates, quoting the same captured Angular
  markup full of `<!---->` anchors, and nothing checked it.

  Measured before the change rather than after: the controller is clean on both rules today — zero
  nested markers, zero orphan closers. That is exactly the condition worth closing, in the words
  `browser-dialog-contract` already uses for the same decision: *"clean by discipline is one careless
  import away from not being clean, and the standard asks for clean by construction."*

  `CLAUDE.md` is the ROOT standard and binds both apps. Two half-gates would let this land in
  whichever app the author was not thinking about — and the failure this rule exists for SHIPPED
  once, rendering paragraphs of prose and a stray `-->` inside `<ul id="mainTabs">` while
  `svelte-check` and the whole suite stayed green.

  The cost is that a controller edit can turn the room suite red. That is the correct outcome for a
  repository-wide rule, and the offender paths below name the app.
*/
const REPOSITORY_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

const templates = (['room', 'controller'] as const).flatMap((app) => {
  const root = `${REPOSITORY_ROOT}apps/${app}/src/`;
  return globSync('**/*.svelte', { cwd: root }).map((file) => `${root}${file}`);
});

describe('svelte template comments', () => {
  it('finds template files to check', () => {
    // A glob that silently matches nothing would make every assertion below vacuous.
    expect(templates.length).toBeGreaterThan(5);

    /*
      And BOTH roots, separately. One glob answering for the pair would let a wrong path in either
      one pass on the other's files — which is the failure a two-app guard has and a one-app guard
      cannot.
    */
    for (const app of ['room', 'controller']) {
      expect(
        templates.filter((path) => path.includes(`apps/${app}/src/`)).length,
        `no templates were found for apps/${app}`
      ).toBeGreaterThan(5);
    }
  });

  it('never nests a comment marker inside an HTML comment', () => {
    const offenders: string[] = [];

    for (const file of templates) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/<!--([\s\S]*?)-->/g)) {
        const body = match[1];
        if (!body.includes('<!--') && !body.includes('-->')) continue;
        const line = source.slice(0, match.index).split('\n').length;
        offenders.push(`${file}:${line}`);
      }
    }

    expect(
      offenders,
      `An HTML comment contains a comment marker, so it terminates early and the rest leaks into ` +
        `the rendered page:\n  ${offenders.join('\n  ')}`
    ).toEqual([]);
  });

  /*
    AND THE OTHER DIRECTION — a comment with NO OPENER, added 2026-08-20 after one shipped.

    `RoomOverlays.svelte:471` began `One hidden sink per remote microphone.` with no `<!--` before it
    and a `-->` three lines later. Three lines of developer prose plus a literal `-->` rendered as
    the first visible node of the overlay layer, which `+page.svelte` mounts at page top level.
    `git log -L` attributes it to the commit that created the file: the opener never existed.

    The check above could not see it, and could not have. Its pattern is `/<!--([\s\S]*?)-->/g`,
    which REQUIRES a well-formed opener to match at all — an orphan closer is not a malformed comment
    to it, it is simply not a comment. A second rule was needed, not a better regex.

    Asked of the COMPILER rather than of a pattern: parse the template and look for a text node that
    reached the fragment carrying comment prose. A real comment is a `Comment` node and never appears
    as `Text`, so this cannot false-positive on a legitimate one.

    ## Why a regex screens the files the compiler then judges

    Parsing all seventy-four templates costs 2,718ms, measured; the walk over the resulting ASTs
    costs 63ms. So this rule was 97% parser, and it spent that on a 5,000ms default budget: on
    2026-08-30 it timed out for real at 5,219ms while other work loaded the box, and reported itself
    as a FAILING CONTRACT rather than as a slow one. A gate that goes red for being busy is a gate
    people learn to re-run, which is the opposite of what a contract is for.

    The screen below is sound rather than merely fast, and the reason is worth stating because the
    cheap version of this idea is the bug the whole rule exists to catch. A `Text` node's data is
    always a substring of the source that lies OUTSIDE a comment. `stripComments` removes every
    well-formed comment with the same non-greedy pairing the parser itself uses — `<!--` to the next
    `-->` — so any `-->` still standing afterwards is one the parser could not have consumed either.
    A file with none cannot produce a `Text` node containing `-->`, and skipping it loses nothing.

    The screen only DECIDES WHAT TO PARSE. It never decides who offends: a residual `-->` inside a
    `<script>` block, an attribute value or an expression tag survives stripping and is not a
    template text node, and the compiler is what says so. That is why the parse stays — the check is
    still asked of the compiler, on the handful of files that could possibly answer yes.

    Cost after: 74 parses become 0 in a clean tree, and the rule runs in ~15ms.
  */
  const stripComments = (source: string): string => source.replace(/<!--[\s\S]*?-->/g, '');

  it('never leaks a comment CLOSER into the rendered page', () => {
    const offenders: string[] = [];

    for (const file of templates) {
      const source = readFileSync(file, 'utf8');
      /* See the docblock: no residual closer means no Text node can carry one. */
      if (!stripComments(source).includes('-->')) continue;

      let ast;
      try {
        ast = parse(source, { modern: true });
      } catch {
        // A file that does not parse is the compiler's problem to report, not this rule's.
        continue;
      }

      const visit = (node: unknown): void => {
        if (!node || typeof node !== 'object') return;
        const candidate = node as { type?: string; data?: string; start?: number };
        if (candidate.type === 'Text' && typeof candidate.data === 'string') {
          if (candidate.data.includes('-->')) {
            const line = source.slice(0, candidate.start ?? 0).split('\n').length;
            offenders.push(`${file}:${line} — ${candidate.data.trim().slice(0, 60)}`);
          }
        }
        for (const value of Object.values(node as Record<string, unknown>)) {
          if (Array.isArray(value)) value.forEach(visit);
          else if (value && typeof value === 'object') visit(value);
        }
      };
      visit(ast.fragment);
    }

    expect(
      offenders,
      `A '-->' reached the rendered page as TEXT, which means a comment above it is missing its ` +
        `'<!--' opener and its prose is on screen:\n  ${offenders.join('\n  ')}`
    ).toEqual([]);
  });
});

describe('no shipped module in either app closes a `<script>` element', () => {
  /*
    THE THIRD PARSER, AND IT WAS FOUND BY THE OFFICIAL SVELTE CLI REFUSING TO READ THIS REPOSITORY.

    `CLAUDE.md` states this rule twice already, for two different parsers, each earned by a shipped
    defect:

      - no Svelte block inside a comment — *"prose to a human and an unclosed block to any parser
        reading the file"*;
      - no HTML comment marker inside an HTML comment — the rule the block above enforces, which
        shipped paragraphs of prose into `<ul id="mainTabs">`.

    This is the same rule for the third one. An HTML tokenizer reading script-element content has NO
    notion of comments, strings or template literals: the first script-closing tag it meets ends the
    element, wherever it sits. A `.ts` file is not itself wrapped in a script tag, so `tsc`,
    `esbuild`, `svelte-check` and `vite build` are all silent — which is why this sat unnoticed in
    FOUR comments across both apps.

    ## What actually broke, 2026-09-02

    `sv migrate sveltekit-3 --tasks imports` (sv 1.0.0-next.6) died on
    `src/routes/uploads/[name]/+server.ts`:

        Task 'imports' failed: Unable to process 'src/routes/uploads/[name]/+server.ts'.
        Reason: Unterminated comment — https://svelte.dev/e/js_parse_error

    The file has no unterminated comment. Its five block comments open and close in order, and a
    lexer tracking strings, template literals and both comment forms walks it to EOF in state
    `code` with zero unclosed blocks. What it has is a security note quoting an attack payload,
    with a literal script-closing tag in it. Removing THAT one sequence — nothing else — let the
    task and the two after it run to completion.

    ## Comments are not the rule; they were only where it was found

    Probed in that same file, one run each, because "it was in a comment" is a hypothesis and not a
    measurement:

      | the tag placed in | what the tool reported |
      | --- | --- |
      | a `//` line comment | `Expected token }` |
      | a single-quoted string | `Unterminated string constant` |

    Two different errors, both fatal, neither naming the real cause. So the rule is about the
    SEQUENCE and not about where it sits, and this gate is written that way.

    ## Why `.test.ts` is exempt, and why that is a measurement rather than a preference

    Twelve occurrences remain, every one in a `*.test.ts`, and every one an XSS fixture whose
    subject IS the payload — `sanitizeHtml('<' + 'script>alert(1)</' + 'script>')` reads worse than
    what it replaces. They are exempt because the full migration ran clean across the app with
    those twelve in place: the task does not read test files. That is a property of one tool's file
    selection today, not of the rule, so if a future `sv` reads tests this exemption is the first
    thing to revisit — split the literal across a `+`, which is what the four repairs above did in
    prose instead.
  */
  const shipped = (['room', 'controller'] as const).flatMap((app) => {
    const root = `${REPOSITORY_ROOT}apps/${app}/src/`;
    return globSync('**/*.{ts,svelte}', { cwd: root })
      .filter((file) => !file.endsWith('.test.ts') && !file.endsWith('.test.svelte'))
      .map((file) => `${root}${file}`);
  });

  it('finds shipped modules in both apps to check', () => {
    /* A glob matching nothing would make the assertion below vacuous, and both roots separately. */
    for (const app of ['room', 'controller']) {
      expect(
        shipped.filter((path) => path.includes(`apps/${app}/src/`)).length,
        `no shipped modules were found for apps/${app}`
      ).toBeGreaterThan(50);
    }
  });

  it("carries the sequence nowhere but a component's own closing tag", () => {
    const offenders: string[] = [];
    const CLOSER = '</' + 'script>';

    for (const file of shipped) {
      /*
        `codeOf` is deliberately NOT used: it removes comments, and the probe above proved a string
        breaks the tool exactly as a comment does. The raw bytes are the subject.
      */
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          /* A `.svelte` file's own closing tag, alone on its line, is the legitimate one. */
          if (line.trim() === CLOSER) return;
          if (line.includes(CLOSER)) offenders.push(`${file}:${index + 1}`);
        });
    }

    expect(
      offenders,
      `A script-closing tag sits where an HTML tokenizer will act on it, which is how ` +
        `\`sv migrate\` was made to report an unterminated comment in a file that has none. Name ` +
        `the element in prose, or split the literal across a \`+\`:\n  ${offenders.join('\n  ')}`
    ).toEqual([]);
  });
});
