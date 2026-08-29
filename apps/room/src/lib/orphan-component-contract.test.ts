import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * EVERY COMPONENT IS REACHED BY SOMETHING THE PRODUCT RENDERS.
 *
 * ## The question `unfed-props-contract.test.ts` names and declines
 *
 * That file sweeps every component's props for one nobody supplies, and at line 214 it steps around
 * a case it can see but does not own:
 *
 *     // A component nothing renders is a different problem, and not this file's.
 *     if (sites.length === 0) return [];
 *
 * It was right to step around it — a props gate is not a reachability gate — but nothing else picked
 * the problem up, so a component with no call sites was skipped by the one sweep that visited it.
 * **This file is that different problem.**
 *
 * Asked for the first time on 2026-08-29, it found two:
 *
 * * `SettingOption.svelte` (70 lines) — the size ratchet described it as *"one labelled setting row
 *   in the session-control modal"*. It is in no modal. `ModalHost.svelte` hand-rolls those rows.
 * * `ToggleRow.svelte` (93 lines) — described as *"one labelled switch, used across the settings
 *   surfaces"*. It is on no surface.
 *
 * Both were rendered by nothing, matched nothing in the reference — `setting-option` and
 * `toggle-row` each appear **0 times** in 2,891,205 bytes of `main.d1d09071be31f1ba.js` and 444,793
 * bytes of `styles.ee2a710065b60389.css`, against a control of 54 hits for `form-check-input` — and
 * were deleted. What made them survive is the interesting part and the reason this gate exists: two
 * test catalogs NAMED them. The size ratchet capped their length and the props contract explained
 * their unsupplied props, so every automated reading of this repository reported them as covered
 * code with an argued design. **Being mentioned by a test is not being used by the product.**
 *
 * ## Reachability, not "does anybody import it"
 *
 * A one-hop check — every component has at least one call site — passes happily on an orphaned
 * CLUSTER: two dead components that render each other vouch for one another forever. So the graph is
 * walked from the entry points instead, and anything the walk does not reach is orphaned however
 * many call sites it has.
 *
 * The entry points are the route files. SvelteKit renders `+page.svelte`, `+layout.svelte` and
 * `+error.svelte` by ROUTING — no component imports them, and requiring one would be asking the tree
 * to have a root above its root.
 *
 * ## Why the graph is sound, asserted rather than assumed
 *
 * Walking `<Name` tags finds every render only while every render IS a `<Name` tag. Two constructs
 * would put a component on screen without one — `mount()` from a `.ts`, and `<svelte:component
 * this={…}>` — and either would let a genuinely-live component read as orphaned, which is the
 * failure mode that gets a gate deleted rather than fixed.
 *
 * Neither exists in this application today, and the assertion below PINS that. If one is introduced
 * the pin fails first, naming the construct, so whoever adds it extends this walk deliberately
 * instead of discovering a false orphan report later.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Fixtures — components that exist so a test can compile something, and are correctly unreachable.
 *
 * A catalog with a reason rather than a filename pattern. `*Probe.svelte` would be a rule nobody
 * agreed to, and it would silently absolve the next dead component that happened to be named one.
 */
const PROVEN_FIXTURES: Record<string, string> = {
  'lib/class-clsx-equivalence.svelte':
    'the subject of `class-clsx-equivalence.test.ts`, which compiles `class:` and clsx-style ' +
    '`class` side by side to measure which order the compiler emits.',
  'lib/components/BindThisProbe.svelte':
    'the subject of `dom-reference-contract.test.ts`, which proves on the real compiler when ' +
    '`bind:this` is cleared, rather than trusting a reading of the docs.',
  'lib/components/AttachDepsProbe.svelte':
    'the subject of `attachment-dependency-contract.svelte.test.ts`, which proves which closure of ' +
    'an attachment collects reactive dependencies.'
};

const paths = globSync('**/*.svelte', { cwd: ROOT })
  .map((relative) => relative.replaceAll('\\', '/'))
  .filter((relative) => !relative.includes('.test.'));

const sources = new Map(paths.map((path) => [path, readFileSync(`${ROOT}/${path}`, 'utf8')]));

/**
 * A `.ts` module with its comments removed.
 *
 * This repository has been bitten five times by an assertion that read a module's PROSE as its code,
 * and the docblocks here name almost every component in the tree. A file that merely discusses
 * `<ToggleRow>` must not thereby render it.
 */
const tsCodeOf = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/**
 * A `.svelte` file with its comments removed — and NOT by running the `.ts` stripper over it.
 *
 * ## The bug this shape exists to avoid, measured on this repository
 *
 * The obvious implementation runs `/\*[\s\S]*?\*\//` over the whole file. In a Svelte file that is
 * wrong, because the TEMPLATE is not JavaScript and `/*` there is usually not a comment at all:
 *
 *     <input accept="image/*" ... />          NoteEditor.svelte:1278
 *
 * That `/` and `*` open a "comment" the regex then closes at the next real `*&#47;` — **7,002
 * characters later** — and everything between is deleted, including
 * `<BootboxDialog mode="alert" … />` on line 1430. The naive stripper removed **10,374 of this
 * file's 54,609 characters**, and a walk over the result would have reported a live component as
 * rendered by nobody.
 *
 * It did not, only because `BootboxDialog` is rendered from seven other files as well. That is luck,
 * not correctness. **Four of the 58 `.svelte` files here carry a `/*` glued to a preceding
 * character** — `NoteEditor`, `ImageUploadDialog`, `PostAlertModal` and `RoomOverlays` — so the next
 * component that happens to be rendered only inside one of those windows would be reported orphaned,
 * and whoever met that report would delete working code.
 *
 * ## The rule, which is about where the syntax is in force
 *
 * `/* … *&#47;` and `//` are JavaScript and CSS comment syntax. In a Svelte file that syntax exists
 * only inside `<script>` and `<style>`; the template's comments are `<!-- -->` and nothing else. So
 * markup comments are removed everywhere, and JS-style comments are removed **only within those two
 * blocks**. An `accept="image/*"` in the template is then what it actually is: an attribute value.
 */
const svelteCodeOf = (source: string) =>
  source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2>)/g, (_match, open, _tag, body, close) =>
      open + tsCodeOf(body) + close
    );

const isRoute = (path: string) => /(^|\/)\+(page|layout|error)\.svelte$/.test(path);

/** Component name → the file(s) that define it. A list, because two directories may share a name. */
const byName = new Map<string, string[]>();
for (const path of paths) {
  const name = path.split('/').pop()!.replace('.svelte', '');
  byName.set(name, [...(byName.get(name) ?? []), path]);
}

/**
 * The components `path` renders, by their `<Name` tag.
 *
 * ## Its near-twin, named so nobody merges them by mistake
 *
 * `unfed-props-contract.test.ts`'s `callSites()` runs almost the same regex, and the two are
 * DELIBERATELY separate — a duplication audit on 2026-08-29 classified them adjacent-but-distinct
 * and this note is the outcome:
 *
 *   `callSites(component)`  asks WHO renders one component, and returns the call sites so their
 *                           attributes can be read. It is a lookup, answered per component.
 *   `rendersOf(path)`       asks WHAT one file renders, and returns targets to walk. It is an edge
 *                           list, answered per file — the transpose.
 *
 * Merging them would mean one function serving a lookup and a graph traversal, and the traversal
 * needs edges the lookup deliberately drops.
 *
 * **They already diverge on the question they do share, and the earlier version of this paragraph
 * got it backwards.** It said *"which is why both strip comments first"*. `callSites` does not: it
 * tests `file.source`, the raw text, and `unfed-props-contract.test.ts` defines no comment stripper
 * at all — so its own docblock, *"`<Name` — the tag, so a mention in prose does not count as a call
 * site"*, is false there too. A claim about a neighbouring file is exactly the kind that needs
 * reading rather than assuming, and this one was written from the shape of the code instead of from
 * the code. Corrected 2026-08-29, the same hour it was introduced.
 */
const rendersOf = (path: string): string[] => {
  const code = svelteCodeOf(sources.get(path)!);
  const rendered = new Set<string>();
  for (const [name, defined] of byName) {
    if (defined.includes(path)) continue;
    if (new RegExp(`<${name}\\b`).test(code)) for (const target of defined) rendered.add(target);
  }
  return [...rendered];
};

const reachable = new Set<string>(paths.filter(isRoute));
const queue = [...reachable];
while (queue.length > 0) {
  for (const child of rendersOf(queue.shift()!)) {
    if (reachable.has(child)) continue;
    reachable.add(child);
    queue.push(child);
  }
}

describe('the render graph is walkable at all', () => {
  it('found the routes it walks from', () => {
    // At zero entry points everything is orphaned and the sweep below is noise, not a finding.
    expect(paths.filter(isRoute).length).toBeGreaterThan(0);
  });

  it('found the components it is meant to police', () => {
    expect(paths.length).toBeGreaterThan(40);
  });

  it('renders nothing imperatively, which is what makes the walk complete', () => {
    const dynamic = [...sources]
      .filter(([, source]) => /<svelte:component\b/.test(svelteCodeOf(source)))
      .map(([path]) => path);
    const mounted = globSync('**/*.ts', { cwd: ROOT })
      .filter((relative) => !relative.includes('.test.'))
      .filter((relative) => /\bmount\(/.test(tsCodeOf(readFileSync(`${ROOT}/${relative}`, 'utf8'))));

    expect(
      [...dynamic, ...mounted],
      'a component put on screen without a `<Name` tag is invisible to this walk — extend rendersOf() to follow it before adding one'
    ).toEqual([]);
  });
});

/*
  ── THE TRIPWIRE FOR EVERY OTHER TEST THAT STRIPS COMMENTS ────────────────────────────────────────

  ## Why this lives here rather than in fifty-five files

  Fifty-five test files in this repository strip block comments and read `.svelte` sources, and every
  one of them uses the naive whole-file regex that `svelteCodeOf` above exists to replace. Rewriting
  all fifty-five would be a large, risky sweep for a hazard that, measured, bites exactly one file
  today:

    NoteEditor.svelte        LOSES `<BootboxDialog>` — `accept="image/*"` at :1278 opens a window
                             the regex closes 7,000 characters later, over the real render at :1430
    PostAlertModal.svelte    has `accept="image/*"`, and NO `*&#47;` follows it anywhere in the file
    ImageUploadDialog.svelte the same
    RoomOverlays.svelte      its glued `/*` is inside a comment that DISCUSSES `/*`. Harmless.

  So the honest scope is ONE file, and it is this gate's own subject — now fixed. The other three
  were checked and are not hazards, which is worth stating precisely because the first draft of this
  paragraph called two of them "latent" and that was wrong: a non-greedy `/\*[\s\S]*?\*&#47;` with no
  closing `*&#47;` anywhere after it matches NOTHING, so those two files lose not one character. The
  control written for them did not fire, and chasing why is what produced this measurement.

  What would make them hazards is a `*&#47;` appearing later in either file — a new docblock, a CSS
  comment — at which point everything between the `accept` attribute and it disappears. That is a
  plausible edit with no local warning, which is the whole reason for the assertion below.

  ## What this asserts

  That the naive strip and the correct one agree on which components a file renders. They agree today
  for every file but `NoteEditor`, which this gate reads correctly and the naive one does not — so
  `NoteEditor` is the one recorded exception, by name, with its measurement.

  A new hazardous file fails here, naming itself, and whoever meets it can then decide whether the
  test that reads it needs `svelteCodeOf`. That is a tripwire rather than a fix, and it is called
  one: it cannot repair the other fifty-five, only stop a sixth file from joining them unnoticed.
*/
describe('no NEW file becomes hazardous to a naive comment strip', () => {
  /** The whole-file regex the rest of the corpus uses, reproduced here as the thing under test. */
  const naiveCodeOf = (source: string) =>
    source
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  /** Capitalised tags — Svelte components, as distinct from `<div>` and friends. */
  const componentTags = (source: string) =>
    new Set([...source.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)].map((match) => match[1]));

  /**
   * Measured 2026-08-29 and left in place deliberately: `accept="image/*"` at :1278 opens a window
   * the naive regex closes 7,002 characters later, swallowing `<BootboxDialog>` at :1430. The
   * attribute is correct markup and the render is correct markup; it is the STRIPPER that is wrong,
   * which is why this is an exception here and not a change to that component.
   */
  const KNOWN = new Map([['lib/components/notes/NoteEditor.svelte', ['BootboxDialog']]]);

  it('loses no component tag that the correct stripper keeps', () => {
    const hazards: string[] = [];
    for (const [path, source] of sources) {
      const correct = componentTags(svelteCodeOf(source));
      const naive = componentTags(naiveCodeOf(source));
      const lost = [...correct].filter((tag) => !naive.has(tag)).sort();
      if (lost.length === 0) continue;
      const expected = KNOWN.get(path);
      if (expected && JSON.stringify(lost) === JSON.stringify([...expected].sort())) continue;
      hazards.push(`${path} hides ${lost.join(', ')} from a naive comment strip`);
    }
    expect(
      hazards,
      `${hazards.join('; ')} — a \`/*\` in this file's TEMPLATE (usually \`accept="image/*"\`) opens a comment the whole-file regex closes much later, deleting real markup. Fifty-five test files strip comments that way. Either move the render out of that window, or give the test that reads it a Svelte-aware stripper like svelteCodeOf above.`
    ).toEqual([]);
  });

  it('carries no stale exception', () => {
    // An exception for a file that has been fixed is a place for the next hazard to hide.
    const stale = [...KNOWN.keys()].filter((path) => {
      const source = sources.get(path);
      if (!source) return true;
      const correct = componentTags(svelteCodeOf(source));
      const naive = componentTags(naiveCodeOf(source));
      return [...correct].every((tag) => naive.has(tag));
    });
    expect(stale, `${stale.join(', ')} — no longer hazardous; remove the exception`).toEqual([]);
  });
});

describe('no component is orphaned', () => {
  const orphans = paths.filter((path) => !reachable.has(path) && !PROVEN_FIXTURES[path]);

  it('reaches every component from a route, or explains why not here', () => {
    expect(
      orphans,
      `${orphans.join(', ')} — nothing in this application renders these. A component only a TEST names is dead code that reads as covered: that is exactly how SettingOption.svelte and ToggleRow.svelte survived, each with a size-ratchet entry describing a surface it was not on. Delete it, render it, or add it to PROVEN_FIXTURES with the test that needs it.`
    ).toEqual([]);
  });

  it('carries no stale fixture exemption', () => {
    /*
      The other direction, and the one that rots quietly. A fixture that becomes reachable — or is
      deleted — leaves an entry here vouching for something that no longer needs vouching for, which
      is how an exemption list turns into a place to hide a real orphan.
    */
    const stale = Object.keys(PROVEN_FIXTURES).filter(
      (path) => !paths.includes(path) || reachable.has(path)
    );
    expect(stale, stale.join(', ')).toEqual([]);
  });
});
