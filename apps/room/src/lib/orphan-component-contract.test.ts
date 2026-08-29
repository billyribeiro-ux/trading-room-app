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
 * The source with every comment removed.
 *
 * This repository has been bitten five times by an assertion that read a component's PROSE as its
 * code, and the docblocks here name almost every component in the tree. A file that merely
 * discusses `<ToggleRow>` must not thereby render it.
 */
const codeOf = (source: string) =>
  source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

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
 * needs edges the lookup deliberately drops. What they must NOT do is diverge on the question they
 * do share — whether a mention inside a comment counts — which is why both strip comments first and
 * why this sentence exists rather than a shared helper nobody would notice going stale.
 */
const rendersOf = (path: string): string[] => {
  const code = codeOf(sources.get(path)!);
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
      .filter(([, source]) => /<svelte:component\b/.test(codeOf(source)))
      .map(([path]) => path);
    const mounted = globSync('**/*.ts', { cwd: ROOT })
      .filter((relative) => !relative.includes('.test.'))
      .filter((relative) => /\bmount\(/.test(codeOf(readFileSync(`${ROOT}/${relative}`, 'utf8'))));

    expect(
      [...dynamic, ...mounted],
      'a component put on screen without a `<Name` tag is invisible to this walk — extend rendersOf() to follow it before adding one'
    ).toEqual([]);
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
